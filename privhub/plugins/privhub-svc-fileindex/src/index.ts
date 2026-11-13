/**
 * 私域枢纽能力 Service：文件主索引（privhub-svc-fileindex）—— v6 §3.2
 *
 * 以 cordis Service 形式暴露 `ctx.fileindex`。这是整个改造的**地基**：
 * 「用户看到什么」从此由索引决定，磁盘只负责存字节。
 *
 * ## 为什么需要它（一句话）
 *
 * 改造前 `/api/list` 每次 `readdir` + 逐条 `stat` + 逐文件读 8 字节判密文
 * （实测 5000 文件 P50≈287ms，外推 10 万文件≈5.8s），而且「这文件是谁」的
 * 身份是 `project + 路径`，改名即断——十来个插件的侧车状态各写一套搬迁逻辑。
 *
 * 现在：**查表出列表**，**身份是稳定 ID**，**磁盘是扁平池**。
 *
 * ## 与 ctx.storage 的关系（D9 教训）
 *
 * 索引落盘走 `ctx.storage`（**加密**）。为什么不能用 SQLite：`svc-rag/src/vec.ts:16-26`
 * 记着一次事故——明文 SQLite 被宿主机直接打开，就能读出全部文件名与目录结构。
 * 索引里恰好全是 `name` / `virtualPath` 这类可读信息，走明文库等于重犯。
 *
 * ## 三条硬约定（改之前先读）
 *
 * 1. **派生数据。** 丢了能全量重建（`rebuild()` 扫磁盘）。因此：宽容读取、
 *    损坏条目丢弃、**绝不因索引出问题挡住任何文件操作**。
 * 2. **蓝绿：待命槽不写盘。** 周期对账必须包 `onActivate`；`reload()` 已接进
 *    `main.ts` 的重读清单，待命槽切流前会被刷新。
 * 3. **物理池只由本服务定位。** 别的插件不要自己拼 `.pool/` 路径 —— 一律
 *    `ctx.fileindex.resolvePhysical(entry)`，否则「扁平池布局变了」要改十几处。
 *
 * @module privhub-svc-fileindex
 */

import { join, resolve, dirname, extname, basename } from 'node:path'
import { existsSync } from 'node:fs'
import { mkdir, readdir, stat, rename, unlink, copyFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { Service } from '@deepseek-ai/cordis'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import {
  readJsonStoreLenient, assertStoreWritable, msgOf,
} from '../../privhub-core/src/json-store'
import {
  STORE_FILE, STORE_VERSION, MAX_ENTRIES, MAX_ALIASES,
  normalizePath, nameOf, dirOf, extOf, joinVirtual, isDirectChild,
  newFileId, newPhysicalId, PHYSICAL_ID_RE,
  normalizeStore, toListItem, compareListItems,
  findSameName, suggestName, pushAlias,
  type FileEntry, type FileIndexStore, type ListItem,
} from './core'
import { registerFileRoutes } from './auth'
import { checkMimeCoverage } from './mime'
import { createTieringRunner } from './tiering'

export interface Config {
  /** 索引文件路径；空 = `<dataRoot>/data/fileindex.json` */
  file: string
  /** 扁平池目录；空 = `<dataFiles>/.pool` */
  poolDir: string
}

export const name = 'privhub-svc-fileindex'
/* privhub：读路径端点（auth.ts）要判登录/项目权限/个人空间。
 * storage：降级分支（密文 / 老库未迁移）要用 createReadStream 解密流式发送、
 *          用 isEncrypted 判定该不该交给 nginx 直发。
 * acl：读路径必须显式调 ctx.acl.can 做文件级 ACL 判定，
 *      不靠 privhub-admin-acl 的 GUARD_PATHS 机制（那条只覆盖 /api/* 路由，见 auth.ts 头注释）。
 * inject 里列出来，cordis 才保证 apply 执行时这些服务已就绪。 */
export const inject = ['privhub', 'storage', 'acl']

export const Config: z<Config> = z.object({
  file: z.string().default(''),
  poolDir: z.string().default(''),
})

/** 扁平池的子目录名（库根下）。扫描/对账必须排除它和 `.trash`。 */
export const POOL_DIRNAME = '.pool'
/** 回收站目录名（core 也用它，这里只用于扫描排除）。 */
export const TRASH_DIRNAME = '.trash'

/**
 * 一次批量操作的结果。所有「可能部分失败」的方法都返回它，而不是抛错——
 * 迁移/对账场景里，一个文件失败不该让整批停下。
 */
export interface BatchResult {
  ok: number
  failed: Array<{ path: string; error: string }>
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    fileindex: FileIndexService
  }
}

const dataRootDir = process.env.PRIVHUB_DATA_ROOT?.trim() || process.env.PRIVHUB_ROOT?.trim() || process.cwd()
const dataFilesDir = process.env.PRIVHUB_DATA_FILES?.trim() || join(dataRootDir, 'data-files')

export class FileIndexService extends Service {
  /** 落盘文件（绝对路径）。 */
  readonly file: string
  /** 扁平池目录（绝对路径）。 */
  readonly poolDir: string
  /** 文件库根（项目顶层目录所在）。 */
  readonly dataFiles: string

  private store: FileIndexStore = { version: STORE_VERSION, entries: [] }
  /** id → 条目（读路径主索引，O(1)）。 */
  private byId = new Map<string, FileEntry>()
  /** `project\0virtualPath` → id（列目录与重名判定）。 */
  private byPath = new Map<string, string>()
  /** `project\0dirOf(virtualPath)` → 子项 id 列表（列一页）。 */
  private byParent = new Map<string, string[]>()
  /** `project\0物理ID` → 引用它的条目 id 列表（查重合并后 >1）。 */
  private byPhysical = new Map<string, string[]>()
  /** `project\0sha256` → 条目 id 列表（内容查重）。 */
  private bySha = new Map<string, string[]>()

  /** 落盘节流：短时间内多次变更合并成一次写。 */
  private dirty = false
  private flushTimer: NodeJS.Timeout | null = null
  /** 索引此前被判定损坏 → 拒绝写回（避免覆盖可能还能救回的文件）。 */
  private corrupt = false

  /** D4：初始化完成信号（main.ts / 消费方在 listen 前 await）。 */
  ready: Promise<void> = Promise.resolve()

  constructor(ctx: Context, private readonly config: Config) {
    super(ctx, 'fileindex')
    const f = (config?.file ?? '').trim()
    this.file = f === '' ? join(dataRootDir, 'data', STORE_FILE) : resolve(f)
    const p = (config?.poolDir ?? '').trim()
    this.poolDir = p === '' ? join(dataFilesDir, POOL_DIRNAME) : resolve(p)
    this.dataFiles = dataFilesDir
    this.ready = this.load().catch(() => { /* 已在 load 内记录；索引不是启动阻塞项 */ })
  }

  /* ================= 载入 / 落盘 ================= */

  /**
   * 丢弃内存态并从盘上重读（蓝绿待命槽在切流前调用）。
   * 待命期间无写入，丢弃是安全的 —— 与 `svc-links.reload()` 同口径。
   */
  async reload(): Promise<void> {
    this.store.entries = []
    this.byId.clear()
    this.byPath.clear()
    this.byParent.clear()
    this.byPhysical.clear()
    this.bySha.clear()
    this.dirty = false
    this.corrupt = false
    if (this.flushTimer) { clearTimeout(this.flushTimer); this.flushTimer = null }
    await this.load()
  }

  private async load(): Promise<void> {
    /* 宽容读取：索引是**派生**数据，损坏时退回空表并置 corrupt 标志拦住后续写回。
     * 不用严格版的原因：严格版会抛错，而构造函数里那一抛会连带把「文件还在不在」
     * 这个最基本的能力也挡掉 —— 索引坏了不该让人打不开文件。 */
    try {
      const raw = await readJsonStoreLenient<unknown>(this.ctx.storage, this.file, null)
      if (raw === null) return
      for (const e of normalizeStore(raw).entries) this.adopt(e)
    } catch (e) {
      this.corrupt = true
      console.error('[fileindex] 主索引读取失败（写入已拒绝，避免覆盖）：' + msgOf(e))
    }
  }

  /** 把一条记录挂进内存索引（载入与新增共用；不触发落盘）。 */
  private adopt(e: FileEntry): void {
    this.store.entries.push(e)
    this.byId.set(e.id, e)
    this.byPath.set(kPath(e.project, e.virtualPath), e.id)
    this.indexAdd(this.byParent, kParent(e.project, dirOf(e.virtualPath)), e.id)
    if (e.physicalId) this.indexAdd(this.byPhysical, kPhys(e.project, e.physicalId), e.id)
    if (e.sha256) this.indexAdd(this.bySha, kSha(e.project, e.sha256), e.id)
  }

  /** 从内存索引里摘掉一条（删除/替换时用；不触发落盘）。 */
  private unadopt(e: FileEntry): void {
    this.byId.delete(e.id)
    this.byPath.delete(kPath(e.project, e.virtualPath))
    this.indexRemove(this.byParent, kParent(e.project, dirOf(e.virtualPath)), e.id)
    if (e.physicalId) this.indexRemove(this.byPhysical, kPhys(e.project, e.physicalId), e.id)
    if (e.sha256) this.indexRemove(this.bySha, kSha(e.project, e.sha256), e.id)
    const arr = this.store.entries
    const i = arr.indexOf(e)
    if (i >= 0) arr.splice(i, 1)
  }

  private indexAdd(map: Map<string, string[]>, key: string, id: string): void {
    const arr = map.get(key)
    if (arr) { if (!arr.includes(id)) arr.push(id) } else map.set(key, [id])
  }

  private indexRemove(map: Map<string, string[]>, key: string, id: string): void {
    const arr = map.get(key)
    if (!arr) return
    const i = arr.indexOf(id)
    if (i >= 0) arr.splice(i, 1)
    if (arr.length === 0) map.delete(key)
  }

  /**
   * 修改一条记录的**索引相关字段**，并保证全部派生索引同步。
   *
   * 为什么要有这个入口：`virtualPath` / `physicalId` / `sha256` 一变，
   * 至少要同步 `byPath`、`byParent`、`byPhysical`、`bySha` 四张表里的若干张。
   * 改造过程中手写这些同步点出过多次错 —— 典型是改了 `physicalId` 只
   * `indexAdd` 新键、忘了 `indexRemove` 旧键，于是 `byPhysical` 里留着一条
   * 指向旧 ID 的幽灵记录；它不报错，只在"删除时算还有几个引用"那一刻
   * 让字节该删的删不掉、或不该删的被删掉。
   *
   * 手写同步点无法被编译器检查，所以改成"先按旧值整条摘下、改完再按新值整条挂上"：
   * `unadopt` / `adopt` 本身就是成对且覆盖全部四张表的，走这一条路径就不可能漏。
   *
   * **注意**：`unadopt` 会把条目从 `store.entries` 里 splice 掉，`adopt` 再 push
   * 回来 —— 因此调用方**不得**在遍历 `store.entries` 的循环体里直接用它
   * （会漏项）。需要批量改时先 `slice()` 快照。
   */
  private reindex(e: FileEntry, mutate: () => void): void {
    this.unadopt(e)
    try {
      mutate()
    } finally {
      /* 即使 mutate 抛错也要把条目挂回去 —— 否则它就从索引里凭空消失了，
       * 那比索引键不同步严重得多。 */
      this.adopt(e)
    }
    this.markDirty()
  }

  /** 标记有变更，节流落盘（800ms 合并窗口；进程退出前由 flushNow 兜底）。 */
  private markDirty(): void {
    this.dirty = true
    if (this.flushTimer) return
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null
      void this.flush().catch((e) => console.error('[fileindex] 落盘失败：' + msgOf(e)))
    }, 800)
    /* 定时器不该让进程无法退出。 */
    if (typeof this.flushTimer.unref === 'function') this.flushTimer.unref()
  }

  /** 立即落盘（迁移结束、切流前、测试断言前用）。 */
  async flushNow(): Promise<void> {
    if (this.flushTimer) { clearTimeout(this.flushTimer); this.flushTimer = null }
    await this.flush()
  }

  private async flush(): Promise<void> {
    if (!this.dirty) return
    if (this.corrupt) {
      /* 损坏标志在：宁可本次不落盘（丢的是这次增量，可重建），也不覆盖可能还能救的文件。 */
      console.warn('[fileindex] 索引此前被判定损坏，跳过本次写回（可用 rebuild() 重建）')
      this.dirty = false
      return
    }
    assertStoreWritable(!this.corrupt, this.file)
    /* 条目上限：按 at 淘汰最旧的。索引是派生数据，淘汰只影响「这次没列出」。 */
    if (this.store.entries.length > MAX_ENTRIES) {
      const sorted = [...this.store.entries].sort((a, b) => a.at - b.at)
      const drop = sorted.slice(0, this.store.entries.length - MAX_ENTRIES)
      for (const e of drop) this.unadopt(e)
    }
    await mkdir(dirname(this.file), { recursive: true })
    await this.ctx.storage.writeText(this.file, JSON.stringify({ version: STORE_VERSION, entries: this.store.entries }))
    this.dirty = false
  }

  /* ================= 查询（读路径，全部 O(1)/O(k)） ================= */

  /** 按 ID 取条目。 */
  get(id: string): FileEntry | null {
    return this.byId.get(id) ?? null
  }

  /** 按项目 + 虚拟路径取条目。 */
  getByPath(project: string, virtualPath: string): FileEntry | null {
    const id = this.byPath.get(kPath(project, normalizePath(virtualPath)))
    return id ? (this.byId.get(id) ?? null) : null
  }

  /**
   * 列出某虚拟目录下的**直接子项**（不含已进回收站的）。
   *
   * 这是 `/api/list` 的新实现：一次哈希查表 + 若干 byId 取值，**零磁盘 I/O**。
   * 改造前同一件事要对每个条目做 `stat` + 读 8 字节文件头。
   *
   * @param subPath 虚拟目录路径；'' = 项目根
   */
  listDir(project: string, subPath = ''): FileEntry[] {
    const ids = this.byParent.get(kParent(project, normalizePath(subPath))) ?? []
    const out: FileEntry[] = []
    for (const id of ids) {
      const e = this.byId.get(id)
      if (!e || e.trashed) continue
      out.push(e)
    }
    return out.sort(compareListItems)
  }

  /** 列出某虚拟目录的直接子项并投影成前端形状（`/api/list` 直接返回它）。 */
  listDirItems(project: string, subPath = ''): ListItem[] {
    return this.listDir(project, subPath).map(toListItem)
  }

  /**
   * 递归列出某目录下的所有文件条目（不含目录条目本身、不含回收站）。
   * 全文索引 / 查重 / RAG 重建时用。
   */
  listAllFiles(project: string, subPath = ''): FileEntry[] {
    const base = normalizePath(subPath)
    const out: FileEntry[] = []
    for (const e of this.store.entries) {
      if (e.project !== project || e.isDir || e.trashed) continue
      if (base === '' || e.virtualPath === base || e.virtualPath.startsWith(base + '/')) out.push(e)
    }
    return out
  }

  /** 某项目下所有条目（含目录、含回收站）。对账/迁移用。 */
  listProject(project: string): FileEntry[] {
    return this.store.entries.filter((e) => e.project === project)
  }

  /** 全部条目（对账/统计用；**不要**在请求热路径里调它）。 */
  all(): readonly FileEntry[] {
    return this.store.entries
  }

  /**
   * 把某条目的字节归属改到另一个卷（**只改索引，不碰文件**）。
   *
   * 这是分层搬移的第 ④ 步。调用方必须已经确保目标卷上有一份完整字节，
   * 且**必须在本调用成功之后**才删源 —— 顺序反了就有「索引指向已删文件」的窗口。
   *
   * @returns 是否真的改了（条目不存在 / 是目录 / 已经是目标卷 → false）
   */
  setVolume(id: string, volumeId: string | null): boolean {
    const e = this.byId.get(id)
    if (!e || e.isDir) return false
    if ((e.volumeId ?? null) === (volumeId ?? null)) return false
    if (volumeId === null) delete e.volumeId
    else e.volumeId = volumeId
    e.at = Date.now()
    this.markDirty()
    return true
  }

  /**
   * 立刻落盘（搬移用）。
   *
   * 搬移改完索引后**必须**落盘才能删源：如果只改内存就删源，
   * 进程崩在落盘之前，索引会指回一个已经删掉的源文件 —— 数据就真丢了。
   */
  async commit(): Promise<void> {
    await this.flushNow()
  }

  /** 回收站里的条目（前端回收站视图用）。 */
  listTrash(project?: string): FileEntry[] {
    return this.store.entries
      .filter((e) => e.trashed === true && (project === undefined || e.project === project))
      .sort((a, b) => (b.trashedAt ?? 0) - (a.trashedAt ?? 0))
  }

  /** 条目总数（诊断/管理台用）。 */
  get size(): number { return this.store.entries.length }

  /* ================= 物理路径解析（唯一事实来源） ================= */

  /**
   * 把一条索引条目解析成**磁盘上的绝对路径**。
   *
   * 三条分支：
   *   - 目录：返回 null（目录是纯虚拟的，磁盘上没有对应目录）；
   *   - `source='legacy'`：老库还没搬完，指向老库里的相对路径；
   *   - `source='pool'`：扁平池 `<poolDir>/<physicalId><ext>`。
   *
   * 调用方（读路由 / nginx 授权端点）**必须**用它，不要自己拼路径。
   */
  resolvePhysical(e: FileEntry): string | null {
    if (e.isDir) return null
    if (e.source === 'legacy') {
      if (!e.legacyPath) return null
      /* 老库可能不在当前 dataFiles 下（典型场景：老库 E 盘、新库 F 盘）。
       * 有 legacyRoot 就按它拼，没有才回退到当前库根 —— 后者兼容早期扫描的记录。 */
      const root = e.legacyRoot && e.legacyRoot !== '' ? resolve(e.legacyRoot) : this.dataFiles
      return resolve(root, e.project, e.legacyPath)
    }
    if (!e.physicalId || !PHYSICAL_ID_RE.test(e.physicalId)) return null
    /* 扩展名来自索引里的 name，不是从物理 ID 推 —— 物理文件名就是 ID + 原扩展名，
     * 这样直读时 nginx 能按扩展名给对的 MIME。 */
    const ext = e.ext ? '.' + e.ext : ''
    /* 多卷：字节落在哪块盘由 `volumeId` 决定。null/缺省 = 默认卷（单卷时代的位置），
     * 所以老库升级后所有既有条目仍然解析到原处，不需要数据迁移。 */
    return join(this.poolDirOf(e.volumeId), e.physicalId + ext)
  }

  /**
   * 取某卷的池目录。卷服务不可用（单卷部署）时回退 `this.poolDir`。
   *
   * 为什么走 reflect 而不是 inject：fileindex 是读路径核心，**绝不能**因为
   * 卷服务出问题就整个不可用。拿不到卷服务 → 按单卷处理，这是正确的降级方向。
   */
  private poolDirOf(volumeId: string | null | undefined): string {
    if (!volumeId) return this.poolDir
    const vols = this.volumesOrNull()
    if (!vols || typeof vols.poolDirOf !== 'function') return this.poolDir
    try {
      return vols.poolDirOf(volumeId)
    } catch {
      return this.poolDir
    }
  }

  /** 卷服务（可能不存在）。 */
  private volumesOrNull(): {
    poolDirOf?: (id: string | null) => string
    resolveDir?: (id: string | null) => { dir: string; online: boolean; volumeId: string | null }
    pickForWrite?: (needBytes?: number) => Promise<{ volume: unknown; dir: string } | null>
    runTiering?: unknown
    list?: () => Array<{ id: string; role: string; root: string }>
    tieringEnabled?: boolean
    get?: (id: string) => unknown
  } | null {
    const c = this.ctx as unknown as { reflect?: { get?: (k: string, d?: unknown) => unknown } }
    const v = c.reflect?.get?.('volumes', false)
    return (v ?? null) as never
  }

  /**
   * 该条目所在卷当前是否可访问。
   *
   * 卷离线（NAS 掉线 / 盘符未挂载）时，读路径必须报「暂时不可用」而**不是 404**：
   * 404 会让用户以为文件被删了，进而去回收站里找、或者重新上传一份。
   */
  volumeOnline(e: FileEntry): boolean {
    if (e.source !== 'pool' || !e.volumeId) return true
    const vols = this.volumesOrNull()
    if (!vols || typeof vols.resolveDir !== 'function') return true
    try {
      return vols.resolveDir(e.volumeId).online
    } catch {
      return true
    }
  }

  /** 该条目对应的物理字节是否已在新扁平池（迁移完成度判断用）。 */
  isMigrated(e: FileEntry): boolean {
    return !e.isDir && e.source === 'pool'
  }

  /* ================= 变更（写路径） ================= */

  /**
   * 新建一个**文件**条目（上传 / 老库扫描 / 迁移落位共用）。
   *
   * @param opts.physicalId 物理 ID；省略则自动生成
   * @param opts.source 物理字节在哪（默认 'pool'）
   * @param opts.legacyPath 老库相对路径（source='legacy' 时必填）
   * @returns 新建的条目
   */
  /**
   * 确保扁平池目录存在，并返回它的绝对路径（上传落盘前调用）。
   *
   * 为什么单独一个方法而不是让调用方自己 mkdir：池路径由配置决定
   * （`poolDir` 或 `<dataFiles>/.pool`），上传侧不该重复推导这套规则 ——
   * 一旦两处算法分叉，就会出现「文件写进 A 目录、索引指向 B 目录」的幽灵文件。
   */
  async ensurePoolDir(): Promise<string> {
    await mkdir(this.poolDir, { recursive: true })
    return this.poolDir
  }

  createFile(opts: {
    project: string
    virtualPath: string
    physicalId?: string | null
    size?: number
    mtime?: number
    sha256?: string
    source?: 'pool' | 'legacy'
    legacyPath?: string
    aliases?: string[]
    /** 物理字节落在哪个卷（多卷部署）。省略/null = 默认卷。 */
    volumeId?: string | null
  }): FileEntry {
    const vp = normalizePath(opts.virtualPath)
    const nm = nameOf(vp)
    const now = Date.now()
    const source = opts.source ?? 'pool'
    const e: FileEntry = {
      id: newFileId(),
      project: opts.project,
      virtualPath: vp,
      name: nm,
      ext: extOf(nm),
      isDir: false,
      size: opts.size ?? 0,
      mtime: opts.mtime ?? now,
      physicalId: opts.physicalId === undefined ? (source === 'pool' ? newPhysicalId() : null) : opts.physicalId,
      source,
      /* 只有真的落在某个卷上才写这个字段。默认卷留空 —— 这样单卷部署的索引
       * 与改造前**字节级一致**，不会因为升级多出一堆 `volumeId: null`。 */
      ...(opts.volumeId ? { volumeId: opts.volumeId } : {}),
      ...(opts.legacyPath ? { legacyPath: opts.legacyPath } : {}),
      aliases: (opts.aliases ?? []).slice(0, MAX_ALIASES),
      createdAt: now,
      at: now,
      ...(opts.sha256 ? { sha256: opts.sha256 } : {}),
    }
    this.adopt(e)
    this.markDirty()
    return e
  }

  /**
   * 新建一个**虚拟目录**条目（`mkdir` 用）。
   *
   * 磁盘上**不会**创建任何目录 —— 这正是「扁平物理 + 分层虚拟」的关键：
   * 用户看到树，磁盘只有一个池。
   */
  createDir(project: string, virtualPath: string): FileEntry {
    const vp = normalizePath(virtualPath)
    const nm = nameOf(vp)
    const now = Date.now()
    const e: FileEntry = {
      id: newFileId(),
      project,
      virtualPath: vp,
      name: nm,
      ext: '',
      isDir: true,
      size: 0,
      mtime: now,
      physicalId: null,
      source: 'pool',
      aliases: [],
      createdAt: now,
      at: now,
    }
    this.adopt(e)
    this.markDirty()
    return e
  }

  /**
   * 改名：**只改索引里的 name（与 virtualPath 的最后一段），物理 ID 不动。**
   *
   * 这是整个方案最省事的一处：改造前改名要 `rename()` 物理文件，还要给
   * links/dup 各写一套「搬迁 + 留别名」；现在物理不动、ID 不动，
   * **所有按 ID 关联的侧车状态天然不受影响**，只需留一个别名给旧名引用。
   *
   * @returns 更新后的条目；目标已存在或条目不存在时返回 null
   */
  renameEntry(id: string, newName: string): FileEntry | null {
    const e = this.byId.get(id)
    if (!e) return null
    const trimmed = String(newName ?? '').trim()
    if (trimmed === '' || /[\\/]/.test(trimmed)) return null
    const newPath = joinVirtual(dirOf(e.virtualPath), trimmed)
    /* 同目录重名检查（排除自己）。 */
    const clashId = this.byPath.get(kPath(e.project, newPath))
    if (clashId && clashId !== e.id) return null

    /* 改名要同时动 virtualPath（byPath + byParent 两张表）与 ext，
     * 走 reindex 一次性摘挂，避免手写同步点漏表。 */
    this.reindex(e, () => {
      if (e.name !== trimmed) e.aliases = pushAlias(e.aliases, e.name)
      e.name = trimmed
      e.virtualPath = newPath
      e.ext = e.isDir ? '' : extOf(trimmed)
      e.at = Date.now()
      e.mtime = e.at
    })
    return e
  }

  /**
   * 移动：改 `virtualPath` 的目录部分，物理不动。
   *
   * 目录移动会连带**递归**搬它下面所有条目的 virtualPath —— 因为它们是虚拟的，
   * 只需要改字符串。这比改造前「物理 `rename` 一个目录」还快。
   *
   * @returns 成功搬动的条目数；目标目录不存在/重名时返回 -1
   */
  moveEntry(id: string, toDir: string): number {
    const e = this.byId.get(id)
    if (!e) return -1
    const destDir = normalizePath(toDir)
    if (destDir !== '') {
      const dirEntry = this.getByPath(e.project, destDir)
      if (!dirEntry || !dirEntry.isDir) return -1
    }
    if (dirOf(e.virtualPath) === destDir) return 0
    const newPath = joinVirtual(destDir, e.name)
    const clashId = this.byPath.get(kPath(e.project, newPath))
    if (clashId && clashId !== e.id) return -1

    if (e.isDir) {
      /* 目录移动：把自己和所有后代的 virtualPath 前缀一起换掉。
       * `filter` 已产生新数组，遍历它是安全的（reindex 会 splice store.entries）。 */
      const oldPrefix = e.virtualPath + '/'
      const newPrefix = newPath + '/'
      const affected = this.store.entries.filter(
        (x) => x.project === e.project && x.virtualPath.startsWith(oldPrefix),
      )
      for (const x of affected) {
        this.reindex(x, () => {
          x.virtualPath = newPrefix + x.virtualPath.slice(oldPrefix.length)
          x.at = Date.now()
        })
      }
      /* 目录自身。 */
      this.reindex(e, () => {
        e.virtualPath = newPath
        e.at = Date.now()
      })
      return affected.length + 1
    }

    this.reindex(e, () => {
      e.virtualPath = newPath
      e.at = Date.now()
    })
    return 1
  }

  /**
   * 标记进回收站（**虚拟删除**：物理字节不动）。
   *
   * 与改造前的差别：`core.moveToTrash` 是把文件 `rename` 进 `.trash/`，
   * 恢复再 `rename` 回来。现在只改一个标志位 —— 少两次磁盘搬迁，
   * 而且「新旧对比」天然可做（`trashedFrom` 记着原路径）。
   *
   * 目录删除会连带标记其下所有条目。
   *
   * @returns 受影响的条目数；条目不存在返回 0
   */
  trashEntry(id: string, operator: string): number {
    const e = this.byId.get(id)
    if (!e) return 0
    const now = Date.now()
    const mark = (x: FileEntry): void => {
      x.trashed = true
      x.trashedAt = now
      x.trashedFrom = x.virtualPath
      x.trashedBy = operator
      x.at = now
    }
    mark(e)
    let n = 1
    if (e.isDir) {
      const prefix = e.virtualPath + '/'
      for (const x of this.store.entries) {
        if (x.project !== e.project || x.trashed) continue
        if (x.id === e.id || !x.virtualPath.startsWith(prefix)) continue
        mark(x)
        n++
      }
    }
    this.markDirty()
    return n
  }

  /**
   * 从回收站恢复。
   *
   * 原位置若已被别的文件占用，就恢复到「原目录 + 自动改名」——而不是拒绝。
   * 理由：用户点「恢复」的意图是"把东西拿回来"，因为一个后来创建的
   * 同名文件就整条失败，比恢复成 `报告 (2).md` 更糟。
   *
   * @returns 恢复的条目数；条目不在回收站返回 0
   */
  restoreEntry(id: string): number {
    const e = this.byId.get(id)
    if (!e || !e.trashed) return 0
    const now = Date.now()
    const restore = (x: FileEntry): void => {
      const from = normalizePath(x.trashedFrom ?? x.virtualPath)
      let target = from
      const clash = this.byPath.get(kPath(x.project, target))
      if (clash && clash !== x.id) {
        target = joinVirtual(dirOf(from), suggestName(this.listDir(x.project, dirOf(from)), x.project, from))
      }
      this.reindex(x, () => {
        x.virtualPath = target
        x.name = nameOf(target)
        x.ext = x.isDir ? '' : extOf(x.name)
        delete x.trashed
        delete x.trashedAt
        delete x.trashedFrom
        delete x.trashedBy
        x.at = now
      })
    }
    restore(e)
    let n = 1
    if (e.isDir) {
      const prefix = normalizePath(e.trashedFrom ?? e.virtualPath) + '/'
      /* **必须先快照**：reindex 会 splice `store.entries`，边遍历边改会漏项。 */
      const kids = this.store.entries.filter(
        (x) => x.project === e.project && x.trashed && x.id !== e.id
          && normalizePath(x.trashedFrom ?? '').startsWith(prefix),
      )
      for (const x of kids) {
        restore(x)
        n++
      }
    }
    this.markDirty()
    return n
  }

  /**
   * 顶层容器改名（项目 / 个人空间）。
   *
   * 为什么必须有：扁平池下「项目」只是条目上的一个 `project` 字段，磁盘上
   * 没有任何目录可供 `rename()`。个人空间改名若只动磁盘，索引里所有条目仍
   * 挂着旧名 ⇒ 改名后「文件夹还在、文件全没了」（实测）。
   *
   * 只改 `project` 字段，虚拟路径、id、物理 ID 一律不动 —— 所以不产生任何
   * 字节拷贝，改名是 O(条目数) 的纯内存操作。
   *
   * @returns 受影响的条目数（0 表示索引里本来就没有这个容器）
   */
  renameProject(from: string, to: string): number {
    const a = String(from ?? '').trim()
    const b = String(to ?? '').trim()
    if (a === '' || b === '' || a === b) return 0
    /* 必须**先快照**再改：`unadopt` 会 splice、`adopt` 会 push，直接遍历
     * `store.entries` 会被这两个操作把迭代器搅乱（只处理到一部分条目）。 */
    const targets = this.store.entries.filter((e) => e.project === a)
    let n = 0
    for (const e of targets) {
      this.reindex(e, () => { e.project = b })
      n++
    }
    return n
  }

  /**
   * 彻底移除索引条目。**不删物理字节** —— 那是 `purgePhysical` 的事。
   *
   * 拆开的原因：物理字节可能有多个条目共用（查重合并），要按引用计数决定
   * 什么时候才真删；而索引条目是各自的，删掉立刻生效。
   */
  removeEntry(id: string): boolean {
    const e = this.byId.get(id)
    if (!e) return false
    const collected: FileEntry[] = [e]
    if (e.isDir) {
      const prefix = e.virtualPath + '/'
      for (const x of this.store.entries) {
        if (x.id === e.id) continue
        if (x.project === e.project && x.virtualPath.startsWith(prefix)) collected.push(x)
      }
    }
    for (const x of collected) this.unadopt(x)
    this.markDirty()
    return true
  }

  /**
   * 物理字节的引用计数减一；归零则删掉 `.pool/` 里的文件。
   *
   * 只在「彻底删除」（不是进回收站）与「回收站到期清理」时调。
   * 老库条目（source='legacy'）**不删老库的文件** —— 源库只读是硬约定。
   *
   * @returns 是否真的删了磁盘文件
   */
  /**
   * 一个物理字节当前被多少条索引行引用。
   *
   * **派生量，不落盘。** 曾经存成 `entry.refs` 字段，靠写入方手动 +1 维护，
   * 结果同一个物理文件在不同条目上记着互相矛盾的数（A 说 1、B 说 2），
   * 而真正决定"能不能删字节"的 `releasePhysical` 又是自己扫条目数的。
   * 一个从不被读取、却会被写错的字段，只会误导运维。
   *
   * 现在只保留这一个真实来源：数条目。
   */
  refCountOf(physicalId: string): number {
    if (!PHYSICAL_ID_RE.test(physicalId)) return 0
    let n = 0
    for (const e of this.store.entries) {
      if (e.physicalId === physicalId && e.source === 'pool') n++
    }
    return n
  }

  async releasePhysical(physicalId: string, ext: string): Promise<boolean> {
    if (!PHYSICAL_ID_RE.test(physicalId)) return false
    /* 还有任何条目引用它，就不能删字节。引用数只数条目 —— 见 refCountOf()。 */
    if (this.refCountOf(physicalId) > 0) return false
    const target = join(this.poolDir, physicalId + (ext ? '.' + ext : ''))
    try { await unlink(target); return true } catch { return false }
  }

  /* ================= 查重 ================= */

  /**
   * 在同一项目里找**内容相同**的条目（不同于同名）。
   *
   * 与改造前 `svc-dup` 的口径一致：**只在同项目内查**，不跨项目 ——
   * 跨项目命中等于是告诉用户「B 项目里有一模一样的文件」，那是信息泄漏。
   */
  findByContent(project: string, sha256: string): FileEntry[] {
    const ids = this.bySha.get(kSha(project, sha256)) ?? []
    const out: FileEntry[] = []
    for (const id of ids) {
      const e = this.byId.get(id)
      if (e && !e.trashed) out.push(e)
    }
    return out
  }

  /**
   * 让一条索引行**共用**已存在的物理字节（查重合并）。
   *
   * 调用方需自己保证：这两个文件的 sha256 确实相同。合并后引用计数 +1，
   * 将来删除其中一个只减引用，不删字节。
   */
  sharePhysical(id: string, physicalId: string): boolean {
    const e = this.byId.get(id)
    if (!e || e.isDir) return false
    if (!PHYSICAL_ID_RE.test(physicalId)) return false
    if (e.physicalId === physicalId) return true
    /* 换 physicalId 要同步 byPhysical 的**旧键**（摘）与**新键**（挂）。
     * 手写时最容易漏掉摘旧键 —— 那样 byPhysical 里会留下一条指向旧 ID 的
     * 幽灵记录，releasePhysical 数引用时把旧字节"保住"，永远删不掉。 */
    this.reindex(e, () => {
      e.physicalId = physicalId
      e.source = 'pool'
      delete e.legacyPath
    })
    return true
  }

  /* ================= 重名 ================= */

  /** 在目标虚拟目录里找同名条目（上传前拦截）。 */
  findSameName(project: string, virtualPath: string): FileEntry | null {
    return findSameName(this.store.entries, project, virtualPath)
  }

  /** 给冲突文件名找一个不冲突的备选（自动改名保留两份）。 */
  suggestName(project: string, virtualPath: string): string {
    return suggestName(this.store.entries, project, virtualPath)
  }

  /* ================= 迁移 / 重建 ================= */

  /**
   * 把老库里的文件**只读扫描**进索引（迁移第一遍，不搬字节）。
   *
   * 设计要点（用户拍板的方案）：
   *   - **不读文件内容**（除可选算 sha256），因此很快；
   *   - **不改、不删老库任何东西**；
   *   - 幂等：同一虚拟路径已登记则更新元数据，不重复建行。
   *
   * @param opts.oldRoot 老库根（绝对路径）
   * @param opts.computeSha 是否顺带算 sha256（更慢，但查重/迁移校验要用）
   * @param opts.plainSizeOf 把磁盘上的实际大小换成**明文**大小的回调。
   *   老库是 PHENC1 密文时必须传（`storage.plainSize`），否则登记进索引的
   *   `size` 会含 36 字节头，前端显示偏大、迁移时大小校验也永远对不上。
   *   传了就按返回值登记；抛错/返回非数则退回 `stat` 的大小。
   * @param opts.onProgress 进度回调（管理台展示）
   */
  async scanLegacyRoot(opts: {
    oldRoot: string
    computeSha?: boolean
    projects?: string[]
    plainSizeOf?: (absPath: string, diskSize: number) => Promise<number>
    onProgress?: (done: number, total: number, current: string) => void
    signal?: { aborted: boolean }
  }): Promise<{ scanned: number; created: number; updated: number; failed: BatchResult['failed'] }> {
    const root = resolve(opts.oldRoot)
    const failed: BatchResult['failed'] = []
    let scanned = 0
    let created = 0
    let updated = 0

    /** 递归走目录；跳过隐藏系统目录与扁平池/回收站。 */
    const walk = async (dir: string, relDir: string): Promise<void> => {
      if (opts.signal?.aborted) return
      let names: string[]
      try {
        const ents = await readdir(dir, { withFileTypes: true })
        names = ents
          .filter((d) => !d.name.startsWith('.'))
          .map((d) => d.name)
      } catch (e) { failed.push({ path: dir, error: msgOf(e) }); return }
      for (const nm of names) {
        if (opts.signal?.aborted) return
        const abs = join(dir, nm)
        const rel = relDir === '' ? nm : relDir + '/' + nm
        const project = relDir === '' ? nm : relDir.split('/')[0]!
        if (opts.projects && !opts.projects.includes(project)) continue
        let st
        try { st = await stat(abs) } catch (e) { failed.push({ path: abs, error: msgOf(e) }); continue }
        if (st.isSymbolicLink()) continue
        if (st.isDirectory()) {
          /* 顶层目录是「项目」本身，不建索引行；其下的子目录要建。 */
          if (relDir === '') { await walk(abs, nm); continue }
          const vp = rel.slice(project.length + 1) // 项目内相对路径
          if (vp !== '') {
            const existing = this.getByPath(project, vp)
            if (!existing || !existing.isDir) {
              if (existing) this.unadopt(existing)
              this.createDir(project, vp)
              created++
            } else { existing.at = Date.now(); updated++ }
          }
          await walk(abs, rel)
          continue
        }
        if (!st.isFile()) continue
        const vp = rel.slice(project.length + 1)
        if (vp === '') continue
        scanned++
        /* 索引里的 `size` 一律是**明文**大小。老库是密文时 `stat` 拿到的是
         * 含 36 字节头的长度，必须换算，否则前端显示偏大、迁移校验必失败。 */
        let plainSize = st.size
        if (opts.plainSizeOf) {
          try {
            const n = await opts.plainSizeOf(abs, st.size)
            if (typeof n === 'number' && Number.isFinite(n) && n >= 0) plainSize = n
          } catch { /* 换算失败就用磁盘大小，不阻断扫描 */ }
        }
        let sha: string | undefined
        if (opts.computeSha) {
          try { sha = await hashFile(abs) } catch { /* 算不出就算了，不影响登记 */ }
        }
        const existing = this.getByPath(project, vp)
        if (existing && !existing.isDir) {
          /* 重新扫描时**绝不能**把已经搬进池的条目翻回 legacy。
           *
           * 曾经的写法是无条件 `existing.source = 'legacy'`，后果很贵：
           * 用户迁完一次再点一次「扫描」，全部条目被翻回老库，下一轮搬运
           * 就把每个字节**再复制一遍**（72GB 级库是小时级 IO），而且 migrateEntry
           * 每次分配新 physicalId，池里旧副本全成孤儿、引用计数也对不上。
           *
           * 正确语义：扫描只负责「登记老库里有什么」，不负责「决定字节在哪」。
           * 只有还没有池字节的条目才该被标成 legacy；已迁移的保持 pool 不变，
           * 但元数据（大小/mtime/指纹）仍然刷新 —— 老库若被改动，这里能反映出来。
           */
          existing.size = plainSize
          existing.mtime = st.mtimeMs
          existing.at = Date.now()
          if (existing.source !== 'pool' || !existing.physicalId) {
            existing.source = 'legacy'
            existing.legacyPath = vp
            /* 记住这份老库来自哪个根：新库与老库可能在不同盘（E→F 的典型场景），
             * 只存相对路径不足以定位物理字节。 */
            existing.legacyRoot = root
          }
          if (sha) existing.sha256 = sha
          this.markDirty()
          updated++
        } else {
          if (existing) this.unadopt(existing)
          this.createFile({
            project,
            virtualPath: vp,
            physicalId: null,
            size: plainSize,
            mtime: st.mtimeMs,
            source: 'legacy',
            legacyPath: vp,
            ...(sha ? { sha256: sha } : {}),
          })
          /* createFile 不接受 legacyRoot（它是「物理字节在哪」的临时线索，
           * 不是文件身份的一部分），这里补上。 */
          const fresh = this.getByPath(project, vp)
          if (fresh) { fresh.legacyRoot = root; this.markDirty() }
          created++
        }
        opts.onProgress?.(scanned, 0, abs)
      }
    }
    await walk(root, '')
    await this.flushNow()
    return { scanned, created, updated, failed }
  }

  /**
   * 把一条老库条目**搬运**到扁平池（迁移第二遍）。
   *
   * 幂等 + 可中断：写完先 `tmp + rename` 原子替换，再改索引。
   * 断电后重跑只会重搬未完成项，半截临时文件（`.part`）在下次启动时被清理。
   *
   * @param decrypt 解密回调（老库是 PHENC1 密文时需要；明文库传 undefined）
   * @param expectSize **明文**字节数（解密后应有的长度）。密文条目必须传，
   *   否则大小校验必然失败：`e.size` 是扫描时 `stat` 到的**密文**长度，
   *   而解密后写进池的是明文，两者差 36 字节（20 头 + 16 tag）。
   *   这是「加密库 → 明文库」迁移唯一容易踩空的地方。
   *   不传则退回按 `e.size` 校验（适用于本来就是明文的条目）。
   * @returns 是否搬成功
   */
  async migrateEntry(
    id: string,
    decrypt?: (absPath: string) => Promise<Buffer | NodeJS.ReadableStream>,
    expectSize?: number,
  ): Promise<boolean> {
    const e = this.byId.get(id)
    if (!e || e.isDir || e.source === 'pool') return false
    const src = this.resolvePhysical(e)
    if (!src || !existsSync(src)) return false
    const physicalId = newPhysicalId()
    const ext = e.ext ? '.' + e.ext : ''
    const dest = join(this.poolDir, physicalId + ext)
    const tmp = dest + '.' + process.pid + '.part'
    await mkdir(this.poolDir, { recursive: true })
    try {
      if (decrypt) {
        const data = await decrypt(src)
        if (Buffer.isBuffer(data)) {
          const { writeFile } = await import('node:fs/promises')
          await writeFile(tmp, data)
        } else {
          const { pipeline } = await import('node:stream/promises')
          const { createWriteStream } = await import('node:fs')
          await pipeline(data, createWriteStream(tmp))
        }
      } else {
        await copyFile(src, tmp)
      }
      /* 大小校验：搬完必须与**明文**长度一致，否则宁可失败也不改索引。
       *
       * 期望值优先用调用方给的 `expectSize`（密文条目必须给，见方法注释）；
       * 没给时才用 `e.size` —— 那适用于"扫描时就是明文"的条目。 */
      const want = typeof expectSize === 'number' && expectSize >= 0 ? expectSize : e.size
      const st = await stat(tmp)
      if (want > 0 && st.size !== want) {
        await unlink(tmp).catch(() => {})
        console.error('[fileindex] 迁移大小校验失败 ' + e.virtualPath
          + '：写入 ' + st.size + ' 字节，期望 ' + want
          + (typeof expectSize === 'number' ? '（明文）' : '（索引登记）'))
        return false
      }
      await rename(tmp, dest)
      /* 落位成功后一次性改索引字段并同步全部派生表。
       *
       * 这里曾经是手写的 `e.physicalId = ...` + 一句 `indexAdd(byPhysical, 新键)`，
       * 漏了摘旧键 —— 而老库条目本来 `physicalId` 是 null，看起来"没旧键要摘"，
       * 所以问题被掩盖到「迁移失败后重试」时才暴露：第一次已经把 physicalId
       * 写成新值但后续步骤失败，第二次再搬又是一个新 ID，byPhysical 里就留下
       * 两条幽灵记录。走 reindex 后这类"改一半"的中间态不再能产生。
       *
       * size 一律改成**明文**大小：它是用户看到的文件大小，也是 Range/下载头
       * 里 `/total` 的依据。密文条目的 `e.size` 含 36 字节头，不换算就会偏大。 */
      this.reindex(e, () => {
        if (want > 0) e.size = want
        e.physicalId = physicalId
        e.source = 'pool'
        delete e.legacyPath
        /* 搬完就不再需要知道它从哪个老库来了 —— 字节已经在池里。 */
        delete e.legacyRoot
        e.at = Date.now()
      })
      return true
    } catch (err) {
      await unlink(tmp).catch(() => { /* 清理失败不掩盖原因 */ })
      console.error('[fileindex] 迁移失败 ' + e.virtualPath + '：' + msgOf(err))
      return false
    }
  }

  /**
   * 全量重建：扫磁盘重建索引（索引丢了/严重不同步时的救命通道）。
   *
   * **只在新布局（扁平池）下有意义**；老库布局请用 `scanLegacyRoot`。
   * 重建会丢弃现有条目 —— 调用方应先确认。
   */
  async rebuild(opts: { projects?: string[]; onProgress?: (done: number, total: number) => void } = {}): Promise<{ scanned: number; failed: BatchResult['failed'] }> {
    const failed: BatchResult['failed'] = []
    let scanned = 0
    /* 保留「物理字节还在老库」的条目 —— 重建只处理新布局，不能把它们一起丢了。 */
    const legacyKept = this.store.entries.filter((e) => e.source === 'legacy')
    this.store.entries = []
    this.byId.clear()
    this.byPath.clear()
    this.byParent.clear()
    this.byPhysical.clear()
    this.bySha.clear()
    for (const e of legacyKept) this.adopt(e)

    let projects: string[] = []
    try {
      const ents = await readdir(this.dataFiles, { withFileTypes: true })
      projects = ents
        .filter((d) => d.isDirectory() && !d.name.startsWith('.') && d.name !== POOL_DIRNAME && d.name !== TRASH_DIRNAME)
        .map((d) => d.name)
    } catch (e) { failed.push({ path: this.dataFiles, error: msgOf(e) }); return { scanned, failed } }
    if (opts.projects) projects = projects.filter((p) => opts.projects!.includes(p))

    let poolFiles: string[] = []
    try {
      const ents = await readdir(this.poolDir, { withFileTypes: true })
      poolFiles = ents.filter((d) => d.isFile() && !d.name.endsWith('.part')).map((d) => d.name)
    } catch { /* 池还不存在 */ }

    for (const f of poolFiles) {
      const dot = f.indexOf('.')
      const physicalId = dot < 0 ? f : f.slice(0, dot)
      if (!PHYSICAL_ID_RE.test(physicalId)) continue
      const ext = dot < 0 ? '' : f.slice(dot + 1).toLowerCase()
      let st
      try { st = await stat(join(this.poolDir, f)) } catch (e) { failed.push({ path: f, error: msgOf(e) }); continue }
      /* 池里每个物理文件都建一条索引行，暂挂到「未归类」项目下由后续对账修正。
       * 真实场景里重建后应立刻跑一次 scanLegacyRoot 或从备份恢复索引。 */
      const e = this.createFile({
        project: projects[0] ?? '(未归类)',
        virtualPath: physicalId + (ext ? '.' + ext : ''),
        physicalId,
        size: st.size,
        mtime: st.mtimeMs,
      })
      e.at = st.mtimeMs
      scanned++
      opts.onProgress?.(scanned, poolFiles.length)
    }
    await this.flushNow()
    return { scanned, failed }
  }

  /** 清理池里的半截临时文件（启动时调；迁移被打断后会留下）。 */
  async cleanPartialFiles(): Promise<number> {
    let n = 0
    try {
      const ents = await readdir(this.poolDir, { withFileTypes: true })
      for (const d of ents) {
        if (!d.isFile() || !d.name.endsWith('.part')) continue
        await unlink(join(this.poolDir, d.name)).catch(() => { /* 删不掉就下次再试 */ })
        n++
      }
    } catch { /* 池不存在 */ }
    return n
  }
}

/* ---------------- 键构造（与 core.ts 的索引口径必须一致） ---------------- */

function kPath(project: string, virtualPath: string): string {
  return project + '\u0000' + virtualPath
}
function kParent(project: string, dir: string): string {
  return project + '\u0000' + dir
}
function kPhys(project: string, physicalId: string): string {
  return project + '\u0000' + physicalId
}
function kSha(project: string, sha: string): string {
  return project + '\u0000' + sha
}

/** 流式算 sha256（大文件不进内存）。 */
async function hashFile(abs: string): Promise<string> {
  const { createReadStream } = await import('node:fs')
  const h = createHash('sha256')
  await new Promise<void>((ok, fail) => {
    const s = createReadStream(abs)
    s.on('data', (c) => h.update(c))
    s.on('end', () => ok())
    s.on('error', fail)
  })
  return h.digest('hex')
}

/** 插件挂载：注册 FileIndexService 到 ctx.fileindex。 */
export function apply(ctx: Context, config: Config): void {
  const svc = new FileIndexService(ctx, config)
  /* 读路径端点（auth.ts）：判权链在 nginx 发字节之前跑完，
   * 明文直发 / 密文降级由端点每次自适应（见该文件头）。
   * 一行接入 —— 端点逻辑全部在 auth.ts，不动本文件已有的导出签名。 */
  registerFileRoutes(ctx, svc)
  /* 降级分支的 MIME 映射与 core 扩展名集合自检（只告警，不影响直读路径）。 */
  checkMimeCoverage()
  /* 注意用 console 而非 ctx.logger：本仓没有 logger exporter，
   * ctx.logger.warn 实测输出到虚空（见 svc-storage 同处注释）。 */
  void svc.ready.then(async () => {
    /* 启动清理：迁移被打断留下的 .part 文件。 */
    try {
      const n = await svc.cleanPartialFiles()
      if (n > 0) console.warn('[fileindex] 已清理 ' + n + ' 个迁移残留半截文件（.part）')
    } catch (e) {
      /* 清理失败不该阻断启动，但**必须留痕**：残留的 .part 会一直堆在池目录里，
       * 占用空间且让「池里有几万个文件」的统计越来越失真。
       * 静默吞掉的话，管理员只会在某天发现磁盘莫名少了几百 MB。 */
      console.error('[fileindex] 启动清理 .part 失败（不阻断启动）：'
        + (e instanceof Error ? e.message : String(e)))
    }
    console.log('[fileindex] 主索引就绪：' + svc.size + ' 条；扁平池 ' + svc.poolDir)
  }).catch(() => { /* ready 内部已记录 */ })

  /* ---- 分层搬移（hot → cold） ----
   *
   * 两个服务都通过 reflect 惰性取：volumes 挂载在 fileindex **之前**，
   * 但这里是在 apply 期注册、调用期取值，所以两边都拿得到。
   * 单卷部署（没有 volumes 服务 / 没有卷配置）时 runner 什么都不做 —— 这是正确降级。 */
  const runner = createTieringRunner(
    () => svc as unknown as never,
    () => (ctx as unknown as { reflect?: { get?: (k: string, d?: unknown) => unknown } })
      .reflect?.get?.('volumes', false) as never,
  )
  /* 暴露给管理台的「立即搬移」按钮。
   *
   * 为什么轮询而不是 ready.then 一次：core（L1）在本插件（L2）之后挂载，
   * `svc.ready` 完成时 `reflect.get('privhub')` 往往还是 null ——
   * 一次性的 then 会让按钮永远 501，而且看不出原因。
   * 上限 60 秒后明确报错，不留静默死路。 */
  const exposeTiering = (tries = 600): void => {
    const ph = (ctx as unknown as { reflect?: { get?: (k: string, d?: unknown) => unknown } })
      .reflect?.get?.('privhub', false) as { runTieringNow?: () => Promise<unknown> } | null
    if (ph && typeof ph === 'object') {
      ph.runTieringNow = () => runner.runOnce()
      return
    }
    if (tries <= 0) {
      console.error('[fileindex] 等待 privhub 超时，「立即搬移」按钮不可用（装配顺序异常）')
      return
    }
    setTimeout(() => { exposeTiering(tries - 1) }, 100).unref?.()
  }
  void svc.ready.then(() => { exposeTiering() }).catch(() => { /* ready 内部已记录 */ })

  /* 定时搬移：等索引与卷都就绪后再起，避免和启动 IO 抢带宽。 */
  void Promise.all([svc.ready]).then(() => {
    runner.start(5 * 60 * 1000)
  }).catch(() => { /* ready 内部已记录 */ })
}
