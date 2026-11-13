/**
 * 私域枢纽回收站插件（privhub-trash）
 *
 * 回收站列表 / 恢复 / 彻底删除 / 清理过期 + 定时自动清理（30 天，可配）。
 * 记录与实体文件的存储归 privhub-core（ctx.privhub），本插件只做查询编排、
 * 权限过滤与定时任务（Cordis effect 可逆：卸载时清理定时器）。
 *
 * @module privhub-trash
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { json, readBody } from '../../privhub-core/src/index'
import { lookupFileId } from '../../privhub-core/src/events'

export const name = 'privhub-trash'
export const inject = ['privhub', 'audit', 'acl', 'eventBus', 'cap']

export interface Config {
  /** 回收站保留天数（到期自动物理清除），默认 30 */
  ttlDays: number
  /** 自动清理检查间隔（小时），默认 6 */
  intervalHours: number
}

export const Config: z<Config> = z.object({
  ttlDays: z.number().default(30),
  intervalHours: z.number().default(6),
})

/* ---------------- v6 虚拟回收站用到的结构类型 ---------------- */

/**
 * 主索引服务在回收站侧需要的**最小**结构契约。
 *
 * 为什么不 import `FileIndexService`：那是 L2 的实现，L1 引它就把「派生索引」
 * 写成编译期依赖；而这里只需要几个可选读能力。字段一律 `unknown`，读侧当
 * **不可信来源**逐项裁决（与 svc-links/svc-dup 的宽容读取同口径）。
 */
interface IndexEntry {
  id?: unknown
  project?: unknown
  virtualPath?: unknown
  name?: unknown
  isDir?: unknown
  trashed?: unknown
  trashedAt?: unknown
  trashedFrom?: unknown
  trashedBy?: unknown
}
interface FileIndexLike {
  listTrash(project?: string): ReadonlyArray<IndexEntry>
  trashEntry(id: string, operator: string): number
  restoreEntry(id: string): number
  removeEntry(id: string): boolean
  releasePhysical(physicalId: string, ext: string): Promise<boolean>
  getByPath(project: string, virtualPath: string): IndexEntry | null
  get(id: string): IndexEntry | null
}

/**
 * 前端消费的回收站记录形状。
 *
 * ⚠ `id` = **回收站记录 id**（前端拿它调 restore/purge）；
 *   `fileId` = 主索引的文件 ID（拼 `/f/<id>` 直读用）。
 * 两者格式与语义完全不同（记录 id 形如 `<时间戳>_<hex>`，fileId 形如 `F...`），
 * **绝不可混用**。
 */
interface TrashRecordLike {
  id: string
  fileId: string
  project: string
  relPath: string
  name: string
  isDir: boolean
  deletedBy: string
  deletedAt: number
}

export function apply(ctx: Context, config: Config): void {
  const svc = ctx.privhub
  const ttlDays = config.ttlDays > 0 ? config.ttlDays : 30
  const intervalMs = (config.intervalHours > 0 ? config.intervalHours : 6) * 3600 * 1000

  /* E1 事件声明 */
  ctx.eventBus.declareEmit('audit:logged', 'privhub-trash', '写操作成功审计广播（S1 闭环）')
  ctx.eventBus.declareEmit('file:changed', 'privhub-trash', '回收站恢复/彻底删除/清空 → fulltext 索引维护')
  /* B 批：payload 带上主索引稳定 fileId + trashed 标志。
   * fileId 由 lookupFileId 容错取得（索引缺失/未就绪/查不到/抛异常 → 留空），
   * **绝不影响恢复/彻底删除的主流程**。 */
  const changed = (project: string, path: string, action: string, trashed?: boolean): void => {
    const fileId = lookupFileId(ctx, project, path)
    ctx.emit('file:changed', {
      project,
      path,
      action,
      ...(fileId ? { fileId } : {}),
      ...(trashed === undefined ? {} : { trashed }),
    })
  }

  /* 审计埋点（F13 契约）：成功后写审计并广播 audit:logged；失败静默，不影响主流程 */
  const audit = async (u: { username: string }, action: string, target: string, detail?: string): Promise<void> => {
    const rec = await ctx.audit.log({ user: u.username, action, target, detail }).catch(() => null)
    if (rec) ctx.emit('audit:logged', rec)
  }

  /* ---------------- v6 虚拟回收站：主索引优先 + 物理回退 ---------------- */

  /**
   * 取主索引服务。**不能写 `ctx.fileindex`** —— cordis 对未 inject 的服务
   * 是取值即抛（连可选链都拦不住）。core 同理用 `reflect.get(name, false)`。
   * 索引不可用时返回 null，所有调用方回退到改造前的物理实现。
   */
  const fileIndex = (): FileIndexLike | null => {
    const fi = (ctx as unknown as { reflect?: { get?: (n: string, strict?: boolean) => unknown } })
      .reflect?.get?.('fileindex', false) as FileIndexLike | undefined
    return fi && typeof fi.listTrash === 'function' ? fi : null
  }

  /**
   * 索引回收站条目 → 前端既有的回收站记录形状。
   *
   * **字段名必须区分**：`id` 保持「回收站记录 id」的口径（前端拿它调
   * restore/purge），而主索引的文件 ID 单独放 `fileId`。
   * 混用会让前端把 fileId 当记录 id 提交，或反过来拿记录 id 去拼 `/f/<id>`
   * —— 两种都表现为「找不到」，但排查方向完全不同。
   */
  const toTrashRecord = (e: IndexEntry): TrashRecordLike => {
    /* 逐字段裁决（索引是派生数据，来自磁盘的字符串一律当不可信来源）。 */
    const str = (v: unknown, d = ''): string => (typeof v === 'string' && v !== '' ? v : d)
    const id = str(e.id)
    const project = str(e.project)
    const name = str(e.name)
    const from = str(e.trashedFrom, str(e.virtualPath))
    const dir = from.includes('/') ? from.slice(0, from.lastIndexOf('/')) : ''
    return {
      id,
      fileId: id,
      project,
      relPath: dir,
      name,
      isDir: e.isDir === true,
      deletedBy: str(e.trashedBy),
      deletedAt: typeof e.trashedAt === 'number' && Number.isFinite(e.trashedAt) ? e.trashedAt : 0,
    }
  }

  /* 回收站列表（P2-2：支持 ?project= 后端过滤，与前端项目上下文一致） */
  svc.route('/privhub/api/trash-list', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    const url = new URL(req.url ?? '/', 'http://x')
    const projectParam = url.searchParams.get('project') ?? ''
    /* P2-2 的权限口径保持不变：指定项目时必须可见。 */
    if (projectParam !== '') {
      const visible = await svc.visibleProjects(u)
      if (!visible.includes(projectParam)) return json(res, 403, { ok: false, error: '无权限访问该项目' })
    }

    /* ① 主索引（虚拟回收站）：只取索引里 trashed 的条目。 */
    const fi = fileIndex()
    if (fi) {
      try {
        const idxTrash = fi.listTrash(projectParam === '' ? undefined : projectParam) as IndexEntry[]
        /* 权限口径与物理分支一致：普通用户只看自己删的，管理员看全部。
         * 但**个人空间再多一道**：别人的个人空间即使管理员也不可见
         * （这一层在 canAccess 之外，必须显式判）。 */
        const personal = (p: string): boolean => {
          const isP = (svc as unknown as { isPersonalDir?: (n: string) => boolean }).isPersonalDir
          const owner = (svc as unknown as { ownerOfPersonalDir?: (n: string) => string | null }).ownerOfPersonalDir
          if (typeof isP !== 'function' || typeof owner !== 'function') return false
          return isP.call(svc, p) && owner.call(svc, p) !== u.username
        }
        const filtered = idxTrash
          .filter((e) => (u.role === 'admin' ? true : (typeof e.trashedBy === 'string' ? e.trashedBy === u.username : false)))
          .filter((e) => !personal(typeof e.project === 'string' ? e.project : ''))
          .map((e) => toTrashRecord(e))
          /* 只保留形状完整的条目（没有 id / project 的行无法操作，直接丢）。 */
          .filter((r) => r.id !== '' && r.project !== '')
        /* 索引里有条目就以它为准；一条都没有时**继续往下走物理分支**，
         * 因为老数据可能还在 .trash/ 目录里没进索引（迁移未完成）。 */
        if (filtered.length > 0) {
          json(res, 200, { ok: true, trash: filtered, source: 'index' })
          return
        }
      } catch (e) {
        console.warn('[trash] 主索引回收站读取失败，回退物理实现：' + (e instanceof Error ? e.message : String(e)))
      }
    }

    /* ② 物理回退（改造前的实现，原样保留）。 */
    const list = await svc.loadTrash()
    // 普通用户只看自己删除的；管理员看全部
    let filtered = u.role === 'admin' ? list : list.filter((r) => r.deletedBy === u.username)
    // P2-2：指定项目时按项目过滤（整个项目删除的条目 relPath==='' 视为该项目；空参数 = 全量）
    if (projectParam !== '') {
      filtered = filtered.filter((r) => r.project === projectParam || r.relPath === '')
    }
    json(res, 200, { ok: true, trash: filtered, source: 'physical' })
  }, 'trash-list')

  /**
   * 在「索引回收站」里按记录 id 找条目。
   *
   * 索引回收站记录的 `id` 就是主索引的 fileId（见 toTrashRecord），
   * 而物理回收站的 `id` 是另一套格式 —— 所以这里找到就用索引，
   * 找不到就返回 null 让调用方走物理分支，两条路的 id 不会互相误命中。
   */
  const findInIndex = (id: string): IndexEntry | null => {
    const fi = fileIndex()
    if (!fi || id === '') return null
    try {
      const e = fi.get(id)
      /* 必须确实处于 trashed 状态：否则等于允许用 fileId 恢复/删除一个正常文件。 */
      return e && e.trashed === true ? e : null
    } catch { return null }
  }

  /* 恢复回收站条目（P1-1：校验条目归属 + 项目权限，防越权恢复） */
  svc.route('/privhub/api/trash-restore', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const id = String(body.id ?? '')

    /* ① 虚拟回收站：索引条目恢复 = 清 trashed 标记，字节不动。 */
    const ie = findInIndex(id)
    if (ie) {
      const project = typeof ie.project === 'string' ? ie.project : ''
      const from = typeof ie.trashedFrom === 'string' ? ie.trashedFrom : ''
      const dir = from.includes('/') ? from.slice(0, from.lastIndexOf('/')) : ''
      const who = typeof ie.trashedBy === 'string' ? ie.trashedBy : ''
      if (u.role !== 'admin' && who !== u.username) return json(res, 403, { ok: false, error: '无权限操作该条目' })
      if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限访问该项目' })
      const aclD = ctx.acl.can(u, 'edit', project, from)
      if (aclD && !aclD.allow) return json(res, 403, { ok: false, error: 'ACL 拒绝访问' })
      let n = 0
      try { n = fileIndex()?.restoreEntry(id) ?? 0 } catch { n = 0 }
      if (n > 0) {
        json(res, 200, { ok: true, restored: n })
        void audit(u, 'restore', project + '/' + from)
        changed(project, dir, 'restored', false)
      } else {
        json(res, 400, { ok: false, error: '恢复失败（索引中未找到该条目）' })
      }
      return
    }

    /* ② 物理回退（改造前实现，原样保留）。 */
    const rec = (await svc.loadTrash()).find((r) => r.id === id)
    if (!rec) return json(res, 404, { ok: false, error: '条目不存在' })
    // P1-1：条目归属校验（管理员可操作全部，普通用户仅自己删除的）
    if (u.role !== 'admin' && rec.deletedBy !== u.username) return json(res, 403, { ok: false, error: '无权限操作该条目' })
    // P1-1：恢复 = 写入项目，须有项目权限（权限已收回的项目不可恢复）
    if (!svc.canAccess(u, rec.project)) return json(res, 403, { ok: false, error: '无权限访问该项目' })
    // P2-1：恢复 = 写回原路径，纳入文件级 ACL（edit 动作）裁决
    const aclD = ctx.acl.can(u, 'edit', rec.project, rec.relPath ?? '')
    if (aclD && !aclD.allow) return json(res, 403, { ok: false, error: 'ACL 拒绝访问' })
    const ok = await svc.restoreTrash(id)
    json(res, ok ? 200 : 400, ok ? { ok: true } : { ok: false, error: '恢复失败（可能原位置已有同名文件）' })
    if (ok) void audit(u, 'restore', rec.project + (rec.relPath ? '/' + rec.relPath : '') + (rec.name ? '/' + rec.name : ''))
    if (ok) changed(rec.project, rec.relPath ?? '', 'restored', false)
  }, 'trash-restore')

  /* 彻底删除回收站条目（P1-1：校验条目归属，防越权物理删除） */
  svc.route('/privhub/api/trash-purge', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const id = String(body.id ?? '')

    /* ① 虚拟回收站：彻底删除 = 摘掉索引条目 + 引用计数归零才真删字节。
     * **顺序不能反**：先取 physicalId/ext，再 removeEntry（它会清掉这些字段），
     * 最后 releasePhysical。否则物理文件永远留在池里（泄漏）。 */
    const ie = findInIndex(id)
    if (ie) {
      const project = typeof ie.project === 'string' ? ie.project : ''
      const from = typeof ie.trashedFrom === 'string' ? ie.trashedFrom : ''
      const who = typeof ie.trashedBy === 'string' ? ie.trashedBy : ''
      if (u.role !== 'admin' && who !== u.username) return json(res, 403, { ok: false, error: '无权限操作该条目' })
      if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限访问该项目' })
      const aclD = ctx.acl.can(u, 'delete', project, from)
      if (aclD && !aclD.allow) return json(res, 403, { ok: false, error: 'ACL 拒绝访问' })
      const fi = fileIndex()
      let ok = false
      try {
        const raw = ie as { physicalId?: unknown; ext?: unknown }
        const physicalId = typeof raw.physicalId === 'string' ? raw.physicalId : ''
        const ext = typeof raw.ext === 'string' ? raw.ext : ''
        ok = fi?.removeEntry(id) ?? false
        /* 引用计数归零才真删；共享同一份字节的其它条目还在时，这里会保留文件。 */
        if (ok && physicalId !== '') await fi?.releasePhysical(physicalId, ext)
      } catch { ok = false }
      if (ok) {
        json(res, 200, { ok: true })
        void audit(u, 'purge', project + '/' + from)
        changed(project, from.includes('/') ? from.slice(0, from.lastIndexOf('/')) : '', 'purged', true)
      } else {
        json(res, 400, { ok: false, error: '彻底删除失败' })
      }
      return
    }

    /* ② 物理回退（改造前实现，原样保留）。 */
    const rec = (await svc.loadTrash()).find((r) => r.id === id)
    if (!rec) return json(res, 404, { ok: false, error: '条目不存在' })
    // P1-1：条目归属校验（管理员可操作全部，普通用户仅自己删除的）
    if (u.role !== 'admin' && rec.deletedBy !== u.username) return json(res, 403, { ok: false, error: '无权限操作该条目' })
    // S9 安全修复：彻底删除是【不可逆】的物理删除，必须与 restore 对称地
    // 校验项目权限与文件级 ACL。此前只校验了归属，导致「已被移出项目的用户
    // 仍能永久删除该项目回收站里的文件」。
    if (!svc.canAccess(u, rec.project)) return json(res, 403, { ok: false, error: '无权限访问该项目' })
    const aclD = ctx.acl.can(u, 'delete', rec.project, rec.relPath ?? '')
    if (aclD && !aclD.allow) return json(res, 403, { ok: false, error: 'ACL 拒绝访问' })
    const ok = await svc.purgeTrash(id)
    json(res, ok ? 200 : 400, ok ? { ok: true } : { ok: false, error: '彻底删除失败' })
    if (ok) void audit(u, 'purge', rec.project + (rec.relPath ? '/' + rec.relPath : '') + (rec.name ? '/' + rec.name : ''))
    if (ok) changed(rec.project, rec.relPath ?? '', 'purged', true)
  }, 'trash-purge')

  /* 清空 N 天前的回收站（管理员手动触发，N 取配置 ttlDays） */
  svc.route('/privhub/api/trash-clean', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (!ctx.cap.can(u, 'admin.trash.clean', 'write')) return json(res, 403, { ok: false, error: '仅管理员' })
    const n = await svc.purgeExpiredTrash(ttlDays * 24 * 3600 * 1000)
    json(res, 200, { ok: true, purged: n })
    void audit(u, 'clean', '', 'purged=' + n)
    if (n > 0) changed('', '', 'clean')
  }, 'trash-clean')

  /* 定时自动清理（Cordis effect 可逆：插件卸载时清除定时器，零残留） */
  ctx.effect(() => {
    const run = (): void => {
      /* 蓝绿待命槽不碰数据根：旧槽还在服务，不能让两个进程同时清理。 */
      if (svc.standby) return
      void svc.purgeExpiredTrash(ttlDays * 24 * 3600 * 1000).catch(() => { /* 单次清理失败不影响主流程 */ })
    }
    // 启动 5 秒后先清一次（避开启动高峰），此后按 intervalHours 周期执行
    const first = setTimeout(run, 5000)
    const timer = setInterval(run, intervalMs)
    if (typeof timer.unref === 'function') timer.unref()
    /* 待命槽在切流激活后再补一次启动清理（预热期间跳过了那次）。 */
    let afterActivate: ReturnType<typeof setTimeout> | null = null
    const offActivate = svc.onActivate(() => {
      afterActivate = setTimeout(() => { afterActivate = null; run() }, 5000)
      if (typeof afterActivate.unref === 'function') afterActivate.unref()
    })
    return () => {
      clearTimeout(first)
      clearInterval(timer)
      if (afterActivate) clearTimeout(afterActivate)
      offActivate()
    }
  })
}
