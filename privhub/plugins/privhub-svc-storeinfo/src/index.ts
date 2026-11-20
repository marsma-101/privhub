/**
 * 存储信息收集服务（privhub-svc-storeinfo）—— 存储搬迁重构 §二（v2 修订）
 *
 * 职责一句话：**只读索引 + 登记进 fileindex，不搬任何字节** —— 与执行块
 * （privhub-storeops，阶段 2）解耦。
 *
 * ## 它解决什么
 *
 * `scanLegacyRoot` 语义绑定老库迁移（「老库根」）；这里需要一个通用入口：
 * 对**任意已注册卷**（或默认库根）递归扫描所有实际存在的文件（v2：**含个人空间**，
 * 不分归属），按「项目名=卷根下第一层目录名」登记进 fileindex —— 与
 * scanLegacyRoot 完全相同的路径→project/virtualPath 语义（现在两者都走
 * FileIndexService.scanRoot，一份实现，不会漂移）。
 *
 * ## v2 修订要点（主人 2026-11-20 三条反馈）
 *
 * 1. 每条登记写 `physicalPath` 快照（绝对路径）；volumeId+池 ID 仍是权威判定。
 * 2. 全量扫描含个人空间 → 本功能定位为**超级管理员专属**的全库备份/加解密工具，
 *    所有路由 `roleAtLeast(u.role,'system_admin')`，普通管理员也 403。
 * 3. `access` 初始值自动填充（owner/visibility），`personal` 标记个人空间条目。
 *    这两个字段本轮**只存/显示，不做任何控制逻辑**；用户侧 files/查重/图谱
 *    链路照旧排除个人空间 —— 隐私边界不变（设计稿 §六）。
 *
 * ## 蓝绿
 *
 * 待命槽不跑后台扫描（`ctx.privhub.standby` 闸门，与 migrate.ts 同口径）：
 * 待命槽里跑后台写 = 与在线槽并发写同一数据根。
 *
 * @module privhub-svc-storeinfo
 */

import { Service, type Context } from '@deepseek-ai/cordis'
import { stat } from 'node:fs/promises'
import { resolve as resolvePath } from 'node:path'
import { json, readBody, roleAtLeast } from '../../privhub-core/src/index'
import { msgOf } from '../../privhub-core/src/json-store'
import type { FileEntry, FileIndexService, BatchResult } from '../../privhub-svc-fileindex/src/index'

export const name = 'privhub-svc-storeinfo'
/* privhub：路由注册（svc.route）与 requireUser / standby 闸门。
 * storage：密文明文长度换算（plainSizeOf）与 status 的抽样 isEncrypted。
 *
 * fileindex / volumes **不进 inject**，运行期 reflect 探测（见 fileindexOf 注释）：
 * 老部署没装 fileindex 时扫描端点降级 503，不影响插件挂载。 */
export const inject = ['privhub', 'audit', 'storage']

declare module '@deepseek-ai/cordis' {
  interface Context {
    storeinfo: StoreInfoService
  }
}

/* 与 migrate.ts 的 fileindexOf 同一套模式（照抄）：cordis 的 Context 是 Proxy，
 * 访问未 inject 的服务名会抛，而不是返回 undefined；reflect.get(name, false)
 * 是框架给的非严格查找 —— 正是这里要的语义。 */
function fileindexOf(ctx: Context): FileIndexService | null {
  try {
    const fi = (ctx as unknown as { reflect?: { get: (n: string, strict?: boolean) => unknown } })
      .reflect?.get('fileindex', false) as FileIndexService | undefined
    return fi && typeof fi.get === 'function' ? fi : null
  } catch {
    return null
  }
}

/** 卷服务形状（只要本插件用到的那几个方法；运行期探测，可能不存在）。 */
interface VolumesLike {
  list?: () => Array<{ id: string; root: string; label: string; role: string }>
  defaultRoot?: string
  resolveDir?: (id: string | null | undefined) => { dir: string; online: boolean; volumeId: string | null }
}

function volumesOf(ctx: Context): VolumesLike | null {
  try {
    const v = (ctx as unknown as { reflect?: { get: (n: string, strict?: boolean) => unknown } })
      .reflect?.get('volumes', false) as VolumesLike | undefined
    return v ?? null
  } catch {
    return null
  }
}

/** 扫描要跳过的系统目录名（`.pool`/`.trash` 与一切 `.` 开头项在 scanRoot 里本来就跳）。 */
const SKIP_DIRS = ['.library-view']

export interface ScanOpts {
  onProgress?: (done: number, total: number, current: string) => void
  signal?: { aborted: boolean }
}

export interface ScanResult {
  scanned: number
  created: number
  updated: number
  failed: BatchResult['failed']
}

export interface StatusResult {
  volumeId: string | null
  /** 该卷条目数（文件，非目录）。 */
  entries: number
  /** physicalPath 快照与当前 resolvePhysical 不一致的条目数（快照漂移）。 */
  pathDrift: number
  /** 抽样密文数（≤200 条 isEncrypted，采样口径：设计稿 §三「不逐条入库」）。 */
  sampledEncrypted: number
  sampled: number
}

export class StoreInfoService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'storeinfo')
  }

  /** 文件库根（core 的 dataRoot，即 data-files；volumeId=null 时的扫描根）。 */
  private defaultRootOf(): string {
    const vols = volumesOf(this.ctx)
    if (vols && typeof vols.defaultRoot === 'string' && vols.defaultRoot !== '') return vols.defaultRoot
    return resolvePath(this.ctx.privhub.dataRoot)
  }

  /** 解析卷根：null → 默认库根；有 id → volumes 服务 list() 里找；找不到 → null。 */
  private async rootOf(volumeId: string | null): Promise<string | null> {
    if (volumeId === null || volumeId === '') return this.defaultRootOf()
    const vols = volumesOf(this.ctx)
    const v = vols?.list?.().find((x) => x.id === volumeId)
    return v ? resolvePath(v.root) : null
  }

  /** 个人空间目录名 → 归属者**显示名**。找不到对应用户的目录（退休名）owner 记空串。 */
  private personalOwnerMap(): Map<string, string> {
    const ph = this.ctx.privhub
    const map = new Map<string, string>()
    for (const u of ph.users.values()) {
      const d = String(u.personalDir ?? '').trim()
      if (d !== '') map.set(d, u.displayName || u.username)
    }
    return map
  }

  /**
   * 全量扫描一个卷根（含个人空间，不分归属），登记/更新进 fileindex。
   *
   * 单飞由路由层负责（busy 闸门）；本方法可重入、幂等：同一虚拟路径已登记
   * 则只刷新元数据。已有 pool 条目绝不被翻回（scanRoot 内既有语义）。
   */
  async scanVolume(volumeId: string | null, opts: ScanOpts = {}): Promise<ScanResult> {
    const root = await this.rootOf(volumeId)
    if (!root) throw new Error('卷不存在：' + volumeId)
    const fi = fileindexOf(this.ctx)
    if (!fi) throw new Error('主索引服务未就绪（ctx.fileindex 不可用）')
    const owners = this.personalOwnerMap()
    const volId = volumeId || null
    const res = await fi.scanRoot({
      root,
      source: 'scan',
      skipDirs: SKIP_DIRS,
      signal: opts.signal,
      onProgress: opts.onProgress,
      /* 密文自动换算明文长度（plainSizeOf 口径，与 scanLegacyRoot 同一套）。 */
      plainSizeOf: async (absPath: string, diskSize: number): Promise<number> => {
        const st = await stat(absPath).catch(() => null)
        if (!st) return diskSize
        try {
          return await this.ctx.storage.plainSize(absPath)
        } catch {
          return diskSize
        }
      },
      /* 每条登记/更新后补 v2 新列。 */
      onEntry: (absPath: string, entry: FileEntry): void => {
        /* physicalPath 快照：绝对路径，本功能/后续搬移展示「实际位置」用。 */
        entry.physicalPath = absPath
        const owner = owners.get(entry.project)
        if (owner !== undefined) {
          /* 个人空间条目：owner=该目录归属用户的显示名 + personal 标记。 */
          entry.personal = true
          entry.access = { owner, visibility: 'personal' }
        } else {
          entry.personal = undefined
          entry.access = { visibility: 'project' }
        }
        /* 显式落卷 id（null 时不写字段，与 createFile 的「默认卷留空」口径一致）。 */
        if (volId) entry.volumeId = volId
        else entry.volumeId = undefined
      },
    })
    return res
  }

  /** 该卷的状态统计：条目数 / 快照漂移数 / 抽样密文数。 */
  async status(volumeId: string | null): Promise<StatusResult> {
    const fi = fileindexOf(this.ctx)
    if (!fi) throw new Error('主索引服务未就绪（ctx.fileindex 不可用）')
    const volId = volumeId || null
    const files = fi.all().filter((e) => !e.isDir && !e.trashed && (e.volumeId ?? null) === volId)
    let pathDrift = 0
    for (const e of files) {
      const cur = fi.resolvePhysical(e)
      if (e.physicalPath && cur && resolvePath(e.physicalPath) !== resolvePath(cur)) pathDrift++
    }
    /* 抽样 ≤200 条判密文：设计稿 §三 —— 落盘形态按需抽样，不逐条入库。 */
    const sample = files.slice(0, 200)
    let sampledEncrypted = 0
    for (const e of sample) {
      const p = fi.resolvePhysical(e)
      if (!p) continue
      try { if (await this.ctx.storage.isEncrypted(p)) sampledEncrypted++ } catch { /* 读不了就算明文 */ }
    }
    return {
      volumeId: volId,
      entries: files.length,
      pathDrift,
      sampledEncrypted,
      sampled: sample.length,
    }
  }
}

/* ================= 路由 ================= */

export interface StoreInfoHooks {
  /** 审计埋点（照 privhub-admin 的 audit 注入写法；失败静默不影响主流程）。 */
  audit: (u: { username: string }, action: string, target: string, detail?: string) => Promise<void>
}

export function registerRoutes(ctx: Context, svc: StoreInfoService, hooks: StoreInfoHooks): void {
  const ph = ctx.privhub

  /** 守卫：登录 + **system_admin**（v2：本功能是超管专属，普通管理员也 403）+ 方法检查。 */
  const guard = (
    req: Parameters<typeof ph.requireUser>[0],
    res: Parameters<typeof json>[0],
    method: 'GET' | 'POST',
  ): { username: string } | null => {
    const u = ph.requireUser(req, res)
    if (!u) return null
    if (!roleAtLeast(u.role, 'system_admin')) {
      json(res, 403, { ok: false, error: '仅系统管理员可使用存储信息功能' })
      return null
    }
    if ((req.method ?? 'GET').toUpperCase() !== method) {
      json(res, 405, { ok: false, error: 'method not allowed' })
      return null
    }
    return { username: u.username }
  }

  /* ---------------- 运行态（202 后台 + 单飞 + cancel，沿用 migrate.ts 口径） ---------------- */

  let running = false
  let busy: Promise<void> | null = null
  let cancelRequested = false
  let lastError = ''
  let lastResult: ScanResult | null = null
  let lastVolumeId: string | null = null

  const runState = () => ({
    running,
    cancelRequested,
    lastError,
    lastResult,
    lastVolumeId,
  })

  ph.route('/privhub/api/storeinfo/scan', async (req, res) => {
    const u = guard(req, res, 'POST')
    if (!u) return
    if (ph.standby) {
      json(res, 503, { ok: false, error: '当前进程处于蓝绿待命槽，后台扫描不可用；请在在线槽执行' })
      return
    }
    let body: { volumeId?: unknown } = {}
    try { body = JSON.parse(await readBody(req)) } catch { /* 空 body = 默认卷 */ }
    const raw = body.volumeId
    const volumeId = raw === undefined || raw === null || raw === '' ? null : String(raw)
    if (running) {
      json(res, 409, { ok: false, error: '已有扫描在进行中（单飞），请等待完成或先取消' })
      return
    }
    const fi = fileindexOf(ctx)
    if (!fi) {
      json(res, 503, { ok: false, error: '主索引服务未就绪（ctx.fileindex 不可用），扫描暂不可用' })
      return
    }
    /* 卷存在性在受理前先验一次（后台跑完才报「卷不存在」会让人白等）。 */
    try {
      await svc.scanVolume(volumeId, { signal: { aborted: true } })
    } catch (e) {
      json(res, 400, { ok: false, error: e instanceof Error ? e.message : String(e) })
      return
    }
    /* 受理 + 后台执行（202）。单飞：busy 非空即拒绝。 */
    cancelRequested = false
    lastError = ''
    lastResult = null
    lastVolumeId = volumeId
    running = true
    busy = (async () => {
      try {
        lastResult = await svc.scanVolume(volumeId, {
          signal: { get aborted() { return cancelRequested } },
        })
        await hooks.audit(u, 'storeinfo-scan', volumeId ?? '默认库根',
          `scanned=${lastResult.scanned} created=${lastResult.created} updated=${lastResult.updated} failed=${lastResult.failed.length}`)
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e)
      } finally {
        running = false
        busy = null
      }
    })()
    json(res, 202, { ok: true, started: true, ...runState() })
  }, 'storeinfo-scan')

  ph.route('/privhub/api/storeinfo/status', async (req, res) => {
    const u = guard(req, res, 'GET')
    if (!u) return
    const url = new URL(req.url ?? '/', 'http://x')
    const raw = url.searchParams.get('volumeId')
    const volumeId = raw === null || raw === '' ? null : raw
    try {
      const st = await svc.status(volumeId)
      json(res, 200, { ok: true, ...st, run: runState() })
    } catch (e) {
      json(res, 500, { ok: false, error: msgOf(e) })
    }
  }, 'storeinfo-status')

  /* ---------------- 条目清单（只读分页；收尾任务 1） ----------------
   * GET /privhub/api/storeinfo/entries?volumeId=&project=&limit=&offset=
   * 返回该卷（volumeId 省略 = 全部卷，按 (e.volumeId ?? null) === null 匹配默认卷）
   * 的文件条目分页清单。口径（设计稿 §三）：排除 trashed 与目录行；
   * 排序按 project + virtualPath；encrypted 只对 limit 内的条目逐条
   * isEncrypted 判定（清单页本来就要展示，量可控，默认 limit=100、最大 500）。 */
  ph.route('/privhub/api/storeinfo/entries', async (req, res) => {
    const u = guard(req, res, 'GET')
    if (!u) return
    const url = new URL(req.url ?? '/', 'http://x')
    const rawVol = url.searchParams.get('volumeId')
    const volumeId = rawVol === null || rawVol === '' ? null : rawVol
    const project = url.searchParams.get('project') ?? ''
    let limit = Number.parseInt(url.searchParams.get('limit') ?? '', 10)
    if (!Number.isFinite(limit) || limit <= 0) limit = 100
    if (limit > 500) limit = 500
    let offset = Number.parseInt(url.searchParams.get('offset') ?? '', 10)
    if (!Number.isFinite(offset) || offset < 0) offset = 0
    const fi = fileindexOf(ctx)
    if (!fi) {
      json(res, 503, { ok: false, error: '主索引服务未就绪（ctx.fileindex 不可用），清单暂不可用' })
      return
    }
    const all = fi.all().filter((e) =>
      !e.isDir && !e.trashed
      && (e.volumeId ?? null) === volumeId
      && (project === '' || e.project === project))
    all.sort((a, b) => {
      if (a.project !== b.project) return a.project < b.project ? -1 : 1
      if (a.virtualPath !== b.virtualPath) return a.virtualPath < b.virtualPath ? -1 : 1
      return a.id < b.id ? -1 : 1
    })
    const page = all.slice(offset, offset + limit)
    const entries: Array<Record<string, unknown>> = []
    for (const e of page) {
      const phys = e.physicalPath || fi.resolvePhysical(e) || ''
      let encrypted: boolean | undefined
      if (phys) {
        try { encrypted = await ctx.storage.isEncrypted(phys) } catch { encrypted = undefined }
      }
      entries.push({
        id: e.id,
        project: e.project,
        virtualPath: e.virtualPath,
        ext: e.ext,
        size: e.size,
        physicalPath: phys,
        volumeId: e.volumeId ?? null,
        personal: e.personal === true,
        access: e.access ?? { visibility: 'project' },
        encrypted,
      })
    }
    json(res, 200, { ok: true, total: all.length, offset, limit, entries })
  }, 'storeinfo-entries')

  ph.route('/privhub/api/storeinfo/cancel', async (req, res) => {
    const u = guard(req, res, 'POST')
    if (!u) return
    if (!running) {
      json(res, 200, { ok: true, cancelled: false, error: '当前没有扫描在跑' })
      return
    }
    cancelRequested = true
    await busy.catch(() => null)
    json(res, 200, { ok: true, cancelled: true, ...runState() })
  }, 'storeinfo-cancel')
}

export function apply(ctx: Context): void {
  const svc = new StoreInfoService(ctx)
  ;(ctx as unknown as Record<string, unknown>).storeinfo = svc

  /* 审计埋点（照 privhub-admin 的写法）：成功后写审计并广播；失败静默不影响主流程。 */
  const audit = async (u: { username: string }, action: string, target: string, detail?: string): Promise<void> => {
    const rec = await ctx.audit.log({ user: u.username, action, target, detail }).catch(() => null)
    if (rec) ctx.emit('audit:logged', rec)
  }

  /* 路由要 ctx.privhub / ctx.audit（core·L1 在本插件挂载时已就绪：inject 含 privhub）。
   * audit 来自 svc-audit（L2，更早）。 */
  registerRoutes(ctx, svc, { audit })
  console.log('[storeinfo] 存储信息收集服务就绪（system_admin 专属）')
}
