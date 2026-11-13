/**
 * 老库迁移管理端点（privhub-admin 的子模块）
 *
 * 「两遍迁移」的管理侧入口。用户拍板的方案（v6 §3.3）：
 *   第一遍 `legacy-scan`   —— **只读扫描**老库，把「有哪些文件」登记进主索引，不搬一个字节；
 *   第二遍 `legacy-migrate` —— 后台**慢速**逐条把字节搬进扁平池，搬完才改索引。
 *
 * ## 四条硬约束（改之前先读）
 *
 * 1. **绝不删除老库源文件。** `fileindex.migrateEntry` 只做「读源 → 写池 → 改索引」，
 *    从不 `unlink` 源。本文件也**不许**出现任何针对老库的删除/移动。
 *    理由：老库是唯一一份原始数据，迁移做错了还能靠它重来；删了就没了。
 * 2. **可中断可续传。** 每条走 `tmp + rename` 原子落位，索引在 rename 之后才改。
 *    断电后重跑只会重搬未完成项，池里的 `.part` 由 fileindex 启动时清理。
 * 3. **待命槽不跑。** 蓝绿两个进程共享一个数据根，待命槽跑后台写 = 双写。
 *    所以：路由在 `ctx.privhub.standby` 时直接拒绝；真正的后台循环还要再等
 *    `ctx.privhub.onActivate()` 的闸门打开。
 * 4. **单飞。** 一个进程同时只允许一个扫描或迁移（`busy` 标志）。
 *    这条不是为了性能，是为了正确性：两次迁移并发跑同一条目会各自 rename 一次，
 *    多出一个索引里不存在的孤儿物理文件。
 *
 * ## 为什么后台而不是同步等待
 *
 * 迁移的默认目标是「72GB 老库」，同步路由会在几分钟后超时，用户看到的是失败，
 * 而服务端其实还在搬。所以：POST 立即 202 返回、后台慢跑，客户端轮询
 * `GET /legacy-status` 看进度、用 `POST /legacy-cancel` 刹车。
 *
 * @module privhub-admin/migrate
 */

import type { Context } from '@deepseek-ai/cordis'
import { join, resolve, isAbsolute } from 'node:path'
import { stat, readdir } from 'node:fs/promises'
import { json, readJsonBody } from '../../privhub-core/src/index'
import type { FileIndexService } from '../../privhub-svc-fileindex/src/index'
import type { FileEntry } from '../../privhub-svc-fileindex/src/core'

/** 进度状态落盘位置（系统数据根下；走 ctx.storage 加密，与其它系统 JSON 同口径）。 */
const dataRootDir = process.env.PRIVHUB_DATA_ROOT?.trim() || process.env.PRIVHUB_ROOT?.trim() || process.cwd()
const STATE_FILE = join(dataRootDir, 'data', 'storage-legacy-migrate.json')

/** 失败明细在内存里最多留这么多条（够诊断，不会吃内存）。 */
const MAX_FAILED_KEPT = 200

/** 默认并发：1。老库多在机械盘/网络盘上，并发只会让它更慢并拖垮别人的 IO。 */
const DEFAULT_CONCURRENCY = 1
/** 并发硬上限：允许调高，但**不**允许调到「占满磁盘」的程度。 */
const MAX_CONCURRENCY = 4
/** 每条之间的停顿（毫秒）：让磁盘有机会服务其它请求。0 可用于测试。 */
const DEFAULT_GAP_MS = 40

const msgOf = (e: unknown): string => (e instanceof Error ? e.message : String(e))
const sleep = (ms: number): Promise<void> => new Promise((r) => { const t = setTimeout(r, ms); if (typeof t.unref === 'function') t.unref() })

/** 落盘的进度快照（只存跨进程有意义的部分；运行态是内存）。 */
interface PersistedProgress {
  version: 1
  /** 最近一次扫描看到的文件数。 */
  total: number
  /** 累计成功搬迁的条目数。 */
  migrated: number
  /** 累计失败数（含已不在内存里的）。 */
  failedCount: number
  /**
   * 最近一次扫描用的老库根（绝对路径）。
   *
   * 为什么要记：跨盘迁移（E→F）时，重启后管理员问的第一个问题就是
   * 「我这个实例绑的是哪个老库」。索引里每个条目都有 `legacyRoot`，但那是
   * 内部账、不对外下发；这个字段是给 status 回显用的**单一**值。
   */
  oldRoot?: string
  scannedAt?: number
  migratedAt?: number
}

interface FailedRecord {
  id: string
  project: string
  path: string
  error: string
  at: number
}

/** 内存运行态。 */
interface RunState {
  running: boolean
  kind: 'scan' | 'migrate' | null
  startedAt: number
  finishedAt: number
  /** 本轮目标条数（limit 生效后的值）。 */
  target: number
  /** 本轮已完成条数。 */
  done: number
  cancelRequested: boolean
  lastPath: string
  lastError: string
}

function emptyRun(): RunState {
  return {
    running: false, kind: null, startedAt: 0, finishedAt: 0,
    target: 0, done: 0, cancelRequested: false, lastPath: '', lastError: '',
  }
}

/** 取 ctx.fileindex，但**不**把它写进 inject（见下方 `fileindexOf` 注释）。 */
function fileindexOf(ctx: Context): FileIndexService | null {
  /* 为什么不把 'fileindex' 加进 privhub-admin 的 inject：
   * cordis 的 inject 是「挂载前该服务必须已存在」的硬依赖，而 svc-fileindex 是
   * L2 服务、由 main.ts 挂载。写进 inject 后，只要装配顺序抖一下（或某个部署
   * 还没更新 main.ts），整个 privhub-admin 就挂不上 —— 连带用户管理、项目管理
   * 一起消失。为一个可选能力付这个代价不值得，所以这里做**运行期**探测：
   * 服务不在时老库迁移端点回 503，其它管理功能照常。
   *
   * 为什么不能直接 `ctx.fileindex`：cordis 的 Context 是 Proxy，**访问未 inject
   * 的服务名会抛** `cannot get property "fileindex" without inject`，而不是返回
   * undefined（实测：直接把 `ctx.fileindex` 写进来，四条迁移路由全部 500）。
   * `ctx.reflect.get(name, false)` 是框架给的**非严格**查找：不要求 inject、
   * 服务不在时返回 undefined —— 正是这里要的语义。try/catch 兜住服务名根本
   * 未注册的情况（此时 reflect.props 里没有它）。 */
  try {
    const fi = (ctx as unknown as { reflect?: { get: (n: string, strict?: boolean) => unknown } })
      .reflect?.get('fileindex', false) as FileIndexService | undefined
    return fi && typeof fi.get === 'function' ? fi : null
  } catch {
    return null
  }
}

/** 只算「还需要搬字节」的条目：文件、且物理字节仍在老库。 */
function pendingOf(fi: FileIndexService): FileEntry[] {
  return fi.all().filter((e) => !e.isDir && e.source === 'legacy')
}

export interface MigrateHooks {
  /** 审计埋点（由 privhub-admin 注入；失败静默不影响主流程）。 */
  audit: (u: { username: string }, action: string, target: string, detail?: string) => Promise<void>
}

export function registerLegacyMigration(ctx: Context, hooks: MigrateHooks): void {
  const svc = ctx.privhub

  /* ---------------- 运行态 ---------------- */

  let run: RunState = emptyRun()
  /** 单飞：非 null 表示有扫描或迁移在跑。 */
  let busy: Promise<unknown> | null = null
  let progress: PersistedProgress = { version: 1, total: 0, migrated: 0, failedCount: 0 }
  const failed = new Map<string, FailedRecord>()

  /* 激活闸门：待命槽里 `onActivate` 只登记不执行，切流后才放行。
   * 非待命进程立即执行（等价于正常启动路径），见 core.onActivate 的实现。
   * 释放注册走 ctx.effect —— 与本仓其它定时/后台任务同一写法（改一处不漏）。 */
  let activated = false
  let openGate!: () => void
  const gate = new Promise<void>((r) => { openGate = r })
  const offActivate = ctx.privhub.onActivate(() => {
    activated = true
    openGate()
  })
  ctx.effect(() => () => offActivate())

  /* ---------------- 进度落盘 / 读回 ---------------- */

  let loaded: Promise<void> | null = null
  const loadProgress = (): Promise<void> => {
    if (loaded) return loaded
    loaded = (async () => {
      try {
        const raw = await ctx.storage.readJsonEnc<PersistedProgress | null>(STATE_FILE, null)
        if (raw && typeof raw === 'object' && (raw as PersistedProgress).version === 1) {
          /* 【只在本进程还没干过活时回填】—— 这一条是实测踩出来的。
           *
           * 原先这里无条件 `progress = {...raw}`，配合「status 路由里懒加载」，
           * 会制造一个很难看的时序 bug：迁移刚启动时会把 `migrated:0` 落盘；
           * 客户端随后轮询 status → 懒加载读到那个文件 → **把内存里已经累加的
           * 计数覆盖成 0**。于是「搬了 3 个」显示成「搬了 1 个」，而且数字随
           * 轮询时机跳动。计数器只能单调递增，绝不能因为读一次盘就倒退。
           *
           * 现在：回填只在「本轮从未开始过」时发生（`run.startedAt === 0`），
           * 且进一步调用方保证它在本进程开始干活之前就完成了（见下方 eager 调用）。 */
          if (run.startedAt === 0) {
            progress = {
              version: 1,
              total: Number(raw.total) || 0,
              migrated: Number(raw.migrated) || 0,
              failedCount: Number(raw.failedCount) || 0,
              ...(typeof raw.oldRoot === 'string' && raw.oldRoot !== '' ? { oldRoot: raw.oldRoot } : {}),
              ...(raw.scannedAt ? { scannedAt: raw.scannedAt } : {}),
              ...(raw.migratedAt ? { migratedAt: raw.migratedAt } : {}),
            }
          }
        }
      } catch (e) {
        /* 进度文件坏了/密钥不匹配都不该挡住迁移入口：计数从本轮重新开始即可，
         * 真正的权威状态在主索引里（pending 永远是实时算的）。 */
        console.warn('[admin] 老库迁移进度读回失败（继续，计数从本轮开始）：' + msgOf(e))
      }
    })()
    return loaded
  }
  /* 进程启动即回填（不等第一个请求）：保证「读回来的旧计数」一定发生在
   * 「本轮开始计数」之前，两个来源不会在时间上交叉。失败已被 loadProgress 内部吞掉。 */
  void loadProgress()

  let saving = false
  const saveProgress = async (extra?: Partial<PersistedProgress>): Promise<void> => {
    if (extra) Object.assign(progress, extra)
    if (saving) return
    saving = true
    try {
      await ctx.storage.writeJsonEnc(STATE_FILE, progress)
    } catch (e) {
      console.warn('[admin] 老库迁移进度落盘失败（不影响迁移本身）：' + msgOf(e))
    } finally {
      saving = false
    }
  }

  const recordFailure = (e: FileEntry, error: string): void => {
    progress.failedCount++
    if (failed.size >= MAX_FAILED_KEPT) {
      /* 只淘汰最早的一条：保留「最近失败」比保留「开头的失败」更有诊断价值。 */
      const oldest = failed.keys().next()
      if (!oldest.done) failed.delete(oldest.value)
    }
    failed.set(e.id, { id: e.id, project: e.project, path: e.virtualPath, error, at: Date.now() })
    run.lastError = e.virtualPath + '：' + error
  }

  /* ---------------- 权限守卫 ---------------- */

  /** 管理员 + 方法检查。返回用户对象；已代为响应时返回 null。 */
  const guard = (req: any, res: any, method: 'GET' | 'POST'): { username: string } | null => {
    const u = svc.requireUser(req, res)
    if (!u) return null
    if (!ctx.cap.can(u, 'admin.storage', 'write')) {
      json(res, 403, { ok: false, error: '仅管理员' })
      return null
    }
    if ((req.method ?? 'GET').toUpperCase() !== method) {
      json(res, 405, { ok: false, error: 'method not allowed' })
      return null
    }
    return { username: u.username }
  }

  /**
   * 迁移/扫描的公共前置检查。
   *
   * 注意这里刻意**不**用 ACL 的 GUARD_PATHS：那条机制是给「客户端传 project+path
   * 去动用户文件」的路由用的，而本文件的两条写路径都不接受客户端给的路径 ——
   * `oldRoot` 必须等于配置的库根（见 `resolveOldRoot`），搬哪些条目由索引决定。
   * 权限上它已经是管理员 + admin.storage/write 的双重闸门。
   */
  const preflight = (res: any): FileIndexService | null => {
    if (svc.standby || !activated) {
      /* 待命槽里跑后台写 = 与在线槽并发写同一数据根。宁可让管理员重试，
       * 也不能在这里"帮"他跑起来。 */
      json(res, 503, { ok: false, error: '当前进程处于蓝绿待命槽，后台迁移不可用；请在在线槽执行' })
      return null
    }
    const fi = fileindexOf(ctx)
    if (!fi) {
      json(res, 503, { ok: false, error: '主索引服务未就绪（ctx.fileindex 不可用），老库迁移暂不可用' })
      return null
    }
    return fi
  }

  /**
   * 校验/归一 oldRoot —— **接受任意绝对路径**（跨盘迁移，E→F 是用户的真实场景）。
   *
   * 历史：这里曾经强制 `oldRoot === 文件库根`。那时 `fileindex.resolvePhysical`
   * 只会按 `<dataFiles>/<project>/<legacyPath>` 拼路径，传别的根会让索引记错位置
   * （扫描"成功"、迁移却读不到文件，或更糟：读到同名但不相干的文件）。
   *
   * 现在 fileindex 给条目加了 `legacyRoot`（「这份老库来自哪个根」），
   * `resolvePhysical` 优先按它拼、`migrateEntry` 搬完清掉 —— 于是老库与
   * 新库可以在不同磁盘上，本路由只需要做**基本的可用性校验**：
   *   ① 必须是绝对路径（相对路径会被按进程 cwd 解析，那个答案是不可预期的）；
   *   ② 必须存在、必须是目录、必须可读（否则扫描只会得到一堆 EACCES 失败项，
   *      不如在入口就说清「这个目录读不了」）；
   *   ③ 空目录/**没有项目结构**只 warn 不拒绝 —— 「老库还没铺好」和「指错了目录」
   *      从目录内容上分不开，让管理员看到 warn 后自己判断，比替他决定要好。
   *
   * 不传 oldRoot 时默认当前文件库根（保留「就地迁移」的旧用法）。
   */
  const resolveOldRoot = async (
    raw: unknown,
  ): Promise<{ ok: true; root: string; warning?: string } | { ok: false; error: string }> => {
    const given = String(raw ?? '').trim()
    /* 不传 = 就地迁移（老库就是当前库根）。这是改造前的唯一用法，保留。 */
    if (given === '') return { ok: true, root: resolve(svc.dataRoot) }

    if (!isAbsolute(given)) {
      return {
        ok: false,
        error: 'oldRoot 必须是绝对路径（收到：' + given + '）。相对路径会按服务进程的当前目录解析，'
          + '结果不可预期；请传完整路径，例如 E:\\老库\\data-files',
      }
    }
    const abs = resolve(given)

    let st
    try {
      st = await stat(abs)
    } catch (e) {
      const code = (e as { code?: string }).code
      return {
        ok: false,
        error: code === 'ENOENT'
          ? 'oldRoot 不存在：' + abs
          : 'oldRoot 无法访问：' + abs + '（' + msgOf(e) + '）',
      }
    }
    if (!st.isDirectory()) return { ok: false, error: 'oldRoot 不是目录：' + abs }

    /* 可读性实测：`readdir` 是扫描第一步，这里先替它试一次。
     * 只测 access() 不够 —— Windows 上 ACL 允许 stat 但拒绝列目录的情况存在。 */
    let entries: string[]
    try {
      entries = await readdir(abs)
    } catch (e) {
      return { ok: false, error: 'oldRoot 目录无法读取（权限不足或设备未就绪）：' + abs + '（' + msgOf(e) + '）' }
    }

    /* 结构探测：顶层应当有子目录（每个顶层目录 = 一个项目）。只有文件也算可疑。
     * **只 warn 不拒绝**：真有人把老库结构铺平了、或者库本来就是空的，
     * 扫描仍应能跑（空目录是合法场景）。 */
    const visible = entries.filter((n) => !n.startsWith('.'))
    let dirCount = 0
    for (const nm of visible.slice(0, 50)) {
      try {
        if ((await stat(join(abs, nm))).isDirectory()) dirCount++
      } catch { /* 单个条目读不了不影响结构判断 */ }
    }
    if (dirCount === 0) {
      console.warn('[admin] 老库结构探测：' + abs + ' 顶层没有任何子目录'
        + '（预期每个顶层目录是一个项目）。扫描会照常进行，但如果这不是你要的老库，请核对路径。')
      return {
        ok: true,
        root: abs,
        warning: '该目录顶层没有任何子目录（老库通常每个顶层目录是一个项目）。'
          + '扫描会照常进行；若这不是你要的老库，请核对路径。',
      }
    }
    return { ok: true, root: abs }
  }

  /* ---------------- 路由：第一遍扫描 ---------------- */

  ctx.privhub.route('/privhub/api/storage/legacy-scan', async (req, res) => {
    const u = guard(req, res, 'POST')
    if (!u) return
    const fi = preflight(res)
    if (!fi) return
    if (busy) return json(res, 409, { ok: false, error: '已有扫描或迁移在进行中，请稍后重试' })

    const body = await readJsonBody<{ oldRoot?: string; computeSha?: boolean; projects?: string[]; force?: boolean }>(req, res)
    if (body === null) return
    const root = await resolveOldRoot(body.oldRoot)
    if (!root.ok) return json(res, 400, { ok: false, error: root.error })

    /* 重复扫描的**提示**（不再是拦截）。
     *
     * 历史：这里原先有一段「已有 pool 条目就回 409」的护栏。起因是实测发现
     * `scanLegacyRoot` 对已存在条目无条件 `existing.source = 'legacy'` ——
     * 它只看得见老库里的那个文件，不知道这个条目已经把字节搬进池了。于是
     * 「先迁移完 → 再点一次扫描」会把全部已迁条目翻回 legacy，下一轮迁移
     * 把每一字节**再搬一遍**（72GB 级代价），且 `migrateEntry` 每次分配新的
     * physicalId，池里旧副本从此无人引用，只是占盘。
     *
     * **根因已在 fileindex 侧修掉**（`scanLegacyRoot` 现在的语义是
     * 「扫描只登记老库里有什么，不决定字节在哪」：已有池字节的条目保持
     * `source='pool'`，只刷新元数据）。因此重复扫描是无害的、可重入的，
     * 这个护栏就该退场 —— 拦着一个无害操作只会让「扫一下看有没有新文件」
     * 变成一件需要管理员先理解内部实现才敢点的事。
     *
     * 保留下来的只有提示：让前端能 toast 一句，避免管理员看到「扫描了 N 个」
     * 却以为 N 个要重搬。`force` 参数保留解析（向后兼容旧调用方），已无作用。 */
    const alreadyInPool = fi.all().filter((e) => !e.isDir && e.source === 'pool').length

    const startAt = Date.now()
    run = { ...emptyRun(), running: true, kind: 'scan', startedAt: startAt }

    /** 扫描的取消标志：`scanLegacyRoot` 在每层循环里读它（协作式取消）。 */
    const signal = { get aborted(): boolean { return run.cancelRequested } }

    type ScanResult = { scanned: number; created: number; updated: number; failed: Array<{ path: string; error: string }> }
    let result: ScanResult = { scanned: 0, created: 0, updated: 0, failed: [] }
    try {
      result = await fi.scanLegacyRoot({
        oldRoot: root.root,
        computeSha: body.computeSha === true,
        ...(Array.isArray(body.projects) && body.projects.length
          ? { projects: body.projects.filter((p): p is string => typeof p === 'string') }
          : {}),
        signal,
        /* 老库多半是 PHENC1 密文：登记时就把 `size` 换成明文长度，
         * 否则索引里记的是含 36 字节头的长度 —— 前端显示偏大，
         * 且迁移时的大小校验永远对不上（那会让迁移一条都成功不了）。 */
        plainSizeOf: (abs, diskSize) => ctx.storage.plainSize(abs).catch(() => diskSize),
        onProgress: (done, _total, current) => {
          run.done = done
          run.lastPath = current
        },
      })
      progress = { ...progress, total: result.scanned, scannedAt: Date.now(), oldRoot: root.root }
    } catch (e) {
      run.lastError = '扫描失败：' + msgOf(e)
    } finally {
      run = { ...run, running: false, finishedAt: Date.now() }
    }

    await saveProgress({ total: result.scanned, scannedAt: Date.now(), oldRoot: root.root })
    void hooks.audit(u, 'storage-legacy-scan', 'legacy',
      'scanned=' + result.scanned + ' created=' + result.created + ' updated=' + result.updated
      + ' failed=' + result.failed.length + (run.cancelRequested ? '（已取消，结果为部分）' : ''))
    /* 失败明细原样回，但**截断**：一个坏目录能产生上万条，
     * 全塞进 HTTP 响应只会让管理端卡死。完整条数在 failed.length。 */
    json(res, 200, {
      ok: result.failed.length === 0 && !run.lastError,
      /* 回显「本次扫的是哪个根」—— 直接来自调用方传入的 oldRoot（已归一为绝对路径），
       * **不是**从条目上读（`legacyRoot` 属于索引内部账，指向前端会多泄露一个盘符）；
       * 跨盘迁移时这一行是管理员核对「我扫对盘了吗」的唯一依据。 */
      oldRoot: root.root,
      scanned: result.scanned,
      created: result.created,
      updated: result.updated,
      failed: result.failed.length,
      errors: result.failed.slice(0, MAX_FAILED_KEPT),
      cancelled: run.cancelRequested,
      /* 提示（不是错误）：已有池字节的条目本次只刷新元数据，不会重搬。
       * 单独一个字段而不是塞进 error，是因为它不该让调用方把整次扫描当失败。 */
      ...(alreadyInPool > 0
        ? { notice: '已有 ' + alreadyInPool + ' 个文件在池中，本次扫描只刷新元数据，不会重复搬运' }
        : {}),
      ...(root.warning ? { warning: root.warning } : {}),
      ...(run.lastError ? { error: run.lastError } : {}),
    })
    busy = null
  }, 'storage-legacy-scan')

  /* ---------------- 路由：第二遍搬迁（后台） ---------------- */

  ctx.privhub.route('/privhub/api/storage/legacy-migrate', async (req, res) => {
    const u = guard(req, res, 'POST')
    if (!u) return
    const fi = preflight(res)
    if (!fi) return
    if (busy) return json(res, 409, { ok: false, error: '已有扫描或迁移在进行中，请稍后重试' })

    const body = await readJsonBody<{ limit?: number; concurrency?: number; gapMs?: number }>(req, res)
    if (body === null) return

    const pending = pendingOf(fi)
    if (pending.length === 0) {
      return json(res, 200, { ok: true, started: false, pending: 0, message: '没有待迁移的老库条目（可能未扫描，或已全部搬完）' })
    }

    const concurrency = clampInt(body.concurrency, 1, MAX_CONCURRENCY, DEFAULT_CONCURRENCY)
    const gapMs = clampInt(body.gapMs, 0, 1000, DEFAULT_GAP_MS)
    const limit = Number.isFinite(Number(body.limit)) && Number(body.limit) > 0
      ? Math.floor(Number(body.limit))
      : 0
    const queue = limit > 0 ? pending.slice(0, limit) : pending

    run = { ...emptyRun(), running: true, kind: 'migrate', startedAt: Date.now(), target: queue.length }
    busy = (async () => { await runMigration(fi, queue, { concurrency, gapMs }) })()
      .catch((e) => { run.lastError = '迁移异常中止：' + msgOf(e) })
      .finally(() => {
        busy = null
        run = { ...run, running: false, finishedAt: Date.now() }
        void saveProgress({ migrated: progress.migrated, failedCount: progress.failedCount, migratedAt: Date.now() })
        void hooks.audit(u, 'storage-legacy-migrate', 'legacy',
          'done=' + run.done + '/' + queue.length + ' failed=' + progress.failedCount + (run.cancelRequested ? '（已取消）' : ''))
      })

    await saveProgress({ migrated: progress.migrated, failedCount: progress.failedCount })
    /* 202：任务已受理，进度看 GET /legacy-status。
     * 同步等待会让「72GB 老库」这个目标在几分钟后超时，用户以为失败了。 */
    json(res, 202, {
      ok: true, started: true, queued: queue.length, pending: pending.length,
      concurrency, gapMs, limit: limit || null,
    })
  }, 'storage-legacy-migrate')

  /* ---------------- 路由：进度 ---------------- */

  ctx.privhub.route('/privhub/api/storage/legacy-status', async (req, res) => {
    const u = guard(req, res, 'GET')
    if (!u) return
    await loadProgress()
    const fi = fileindexOf(ctx)
    const pending = fi ? pendingOf(fi).length : null
    json(res, 200, {
      ok: true,
      indexReady: fi !== null,
      /* total 是最近一次扫描见到的条目数；pending 是索引**实时**算的，
       * 两者相减就是「这一程搬掉了多少」。不用 migrated 反推 pending：
       * 索引才是权威，计数只是给人看的。 */
      total: Math.max(progress.total, (pending ?? 0) + progress.migrated),
      migrated: progress.migrated,
      pending,
      failed: progress.failedCount,
      running: run.running,
      kind: run.kind,
      target: run.target,
      done: run.done,
      cancelRequested: run.cancelRequested,
      lastPath: run.lastPath,
      lastError: run.lastError || null,
      startedAt: run.startedAt || null,
      finishedAt: run.finishedAt || null,
      scannedAt: progress.scannedAt ?? null,
      migratedAt: progress.migratedAt ?? null,
      /* 最近一次扫描绑定的老库根（跨盘迁移时管理员核对"我扫的是哪个盘"）。
       * 来自进度文件里记的**调用方传入值**，不是从条目读 legacyRoot ——
       * 后者是索引内部账，不下发。 */
      oldRoot: progress.oldRoot ?? null,
      /** 当前配置的新库根（对照着看，一眼判断是"同盘就地"还是"跨盘"）。 */
      dataFiles: resolve(svc.dataRoot),
      /* 明文库开关：池里落的是明文，nginx 才读得懂。管理员一进来就该知道
       * 这个进程到底有没有开明文库，而不是靠"文件看起来正常"来猜。 */
      fileLibPlain: ctx.storage.fileLibPlain === true,
      encryptionEnabled: ctx.storage.active,
      standby: ctx.privhub.standby,
      failedRecent: [...failed.values()].slice(-20),
    })
  }, 'storage-legacy-status')

  /* ---------------- 路由：取消 ---------------- */

  ctx.privhub.route('/privhub/api/storage/legacy-cancel', async (req, res) => {
    const u = guard(req, res, 'POST')
    if (!u) return
    const wasRunning = run.running
    /* 取消是**协作式**的：只置标志，不中断正在写的那一条。
     * 理由：一条正在 rename 的搬迁被打断会留下 .part，虽然启动时会清掉，
     * 但「让当前这条写完再停」是最省的 —— 也已经保证了不会半截。
     * 扫描会立刻看到标志并提前返回（scanLegacyRoot 在每层循环检查）。 */
    run.cancelRequested = true
    void hooks.audit(u, 'storage-legacy-cancel', 'legacy', wasRunning ? '已请求取消' : '当前无运行任务（标志已置）')
    json(res, 200, { ok: true, wasRunning, cancelRequested: true })
  }, 'storage-legacy-cancel')

  /* ---------------- 后台搬迁实现 ---------------- */

  /**
   * 把队列搬进扁平池。
   *
   * 关键点：
   *  - **每条独立 try/catch**：一个坏文件不该让整批停下（用户的老库里
   *    有 0 字节文件、有正被 Excel 占用的文件，都是常态）；
   *  - **绝不删源**：`migrateEntry` 只读源，本函数也只读；
   *  - 每搬一条 `await sleep(gapMs)`，让磁盘有机会服务前台请求；
   *  - `decrypt` 给的是 `ctx.storage.createReadStream`：它**自动识别**明文/PHENC1，
   *    所以同一次迁移既吃「未加密的老文件」也吃「已加密的老文件」，不用分两条路。
   *    用流而不是 `readBuffer`：老库里可能有单个 GB 级的视频，整读进内存会 OOM。
   */
  async function runMigration(
    fi: FileIndexService,
    queue: FileEntry[],
    opts: { concurrency: number; gapMs: number },
  ): Promise<void> {
    /* 闸门：理论上 preflight 已经挡住了待命槽，这里再等一次是因为
     * 「闸门」是硬约定 —— 任何后台写任务都必须包在 onActivate 里，
     * 而 onActivate 的语义就是"这个 Promise 解开之前不许干活"。 */
    await gate

    let cursor = 0
    const worker = async (): Promise<void> => {
      for (;;) {
        if (run.cancelRequested) return
        const i = cursor++
        if (i >= queue.length) return
        const e = queue[i]!
        run.lastPath = e.virtualPath
        try {
          /* `createReadStream` 是**透明**的：盘上是 PHENC1 密文就自动解密，
           * 已是明文就直通。所以这一句同时覆盖「加密老库 → 明文新库」和
           * 「明文老库 → 扁平池」两种情形，不需要分支。
           *
           * 第三个参数是**明文**长度：`e.size` 是扫描时 stat 到的密文长度，
           * 解密后必然少 36 字节（20 头 + 16 tag）。不给这个值，大小校验
           * 会把每一条密文文件都判成失败 —— 也就是"迁移跑完一条都没成功"。 */
          const abs = fi.resolvePhysical(e)
          let plainLen: number | undefined
          if (abs !== null) {
            try { plainLen = await ctx.storage.plainSize(abs) } catch { plainLen = undefined }
          }
          const ok = await fi.migrateEntry(e.id, (p) => ctx.storage.createReadStream(p), plainLen)
          if (ok) {
            progress.migrated++
            /* 成功即消掉历史失败记录：同一文件重试成功后，还留一条"失败"
             * 会让管理端误判为仍需人工处理。 */
            failed.delete(e.id)
          } else {
            recordFailure(e, 'migrateEntry 返回 false（源缺失/大小校验不一致/写池失败，详见服务日志）')
          }
        } catch (err) {
          recordFailure(e, msgOf(err))
        }
        run.done++
        /* 周期性落盘：不是每条都写（那是每条一次加密写盘，纯浪费 IO），
         * 每 50 条落一次，掉电最多丢 50 条的**计数**（索引本身是准的）。 */
        if (run.done % 50 === 0) {
          await saveProgress({ migrated: progress.migrated, failedCount: progress.failedCount })
        }
        if (opts.gapMs > 0) await sleep(opts.gapMs)
      }
    }

    const n = Math.max(1, Math.min(opts.concurrency, queue.length))
    await Promise.all(Array.from({ length: n }, () => worker()))
    /* 索引可能还攒着节流窗口里的脏数据：迁移收尾必须落盘，
     * 否则重启后这些条目会被当成「还没搬」再搬一遍（源还在，不会丢数据，
     * 但会在池里留下一个没人引用的孤儿物理文件）。 */
    try { await fi.flushNow() } catch (e) { run.lastError = '索引落盘失败：' + msgOf(e) }
  }
}

/** 取整并夹到 [min, max]；非法值退回 fallback。 */
function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.floor(n)))
}
