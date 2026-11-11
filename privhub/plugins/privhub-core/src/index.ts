/**
 * 私域枢纽核心插件（privhub-core）
 *
 * 唯一持有共享状态的插件：封装账号/会话/回收站持久化、data-files 文件根
 * 与权限判定，以 cordis Service 形式挂到 `ctx.privhub` 供各 privhub-* 业务
 * 插件（auth/files/trash/admin）消费。本插件自身不暴露任何 HTTP 接口——
 * 接口按域归属各业务插件，路由注册通过 svc.route() 复用底座 webServer。
 *
 * 数据模型：
 *   - users.json       账号列表（密码 scrypt 盐哈希、角色、负责的项目、个人空间目录）
 *   - data-files/      文件存储根，顶层文件夹即「项目」
 *                      另有一类特殊顶层文件夹＝用户「个人空间」，在 users[].personalDir 登记，
 *                      不属于项目：仅归属者本人可见可访问（管理员亦不可见，只能看到审计记录）、
 *                      不参与查重/向量化/全文索引、且系统永不自动删除。
 *   - sessions.json    持久会话（token -> username）
 *   - trash.json + data-files/.trash/  回收站记录与实体文件
 *
 * @module privhub-core
 */

import { readFile, writeFile, mkdir, readdir, stat, rename, unlink, rm, realpath } from 'node:fs/promises'
import { join, resolve, extname, sep, dirname, basename } from 'node:path'
import { existsSync } from 'node:fs'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { Context, Service } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { IncomingMessage, ServerResponse } from 'node:http'
/* 【扩展名一处定义】全仓的扩展名分类都取自本模块（详见该文件头：一处定义 + 各处显式派生）。 */
import { isImageExt, isMediaExt, isPreviewTextExt } from './file-exts'
import { readJsonStore } from './json-store'

export const name = 'privhub-core'
export const inject = ['webServer', 'storage']

export type Role = 'admin' | 'user'

/* D4：系统 JSON 数据文件的统一读取入口（损坏 → 隔离 + 抛错，绝不静默当空数据）。
 * 从这里转出，方便各插件沿用「一处 import core」的既有写法。 */
export { readJsonStore, readJsonStoreLenient, assertStoreWritable, CorruptDataError, UserVisibleError } from './json-store'

export interface UserRecord {
  username: string
  password: string   // scrypt 盐哈希格式 salt:hash
  displayName: string
  role: Role
  projects: string[] // 有权限的项目文件夹名（管理员忽略此字段，默认全部）
  /**
   * 个人空间目录名（data-files 下的顶层文件夹，与 displayName 同步）。
   * 未开通个人空间的历史账号为 undefined。
   */
  personalDir?: string
}

/** 回收站一条记录。 */
export interface TrashRecord {
  id: string
  project: string
  relPath: string
  name: string
  isDir: boolean
  /** 是否为「整个项目」被删除（relPath 为 ''） */
  isProject?: boolean
  deletedBy: string
  deletedAt: number
}

/**
 * 上传上限的**保守回落值**（2GB）。
 *
 * 正常上限不再写死在这里：它来自 `data/settings.json` 的 `maxUploadMB`
 * （0 = 不限），由 `PrivHubStore.uploadLimitBytes()` 在每次上传时读取 ——
 * 否则管理员在设置面板把上限调到 4GB/8GB 也不会生效（旧实现的实际缺陷）。
 * 这个常量只在「settings.json 存在但读/解析失败」时兜底，避免损坏的配置
 * 把原本设过的小上限静默放开成无限。
 */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024

/** 文本在线预览的体积上限（10 MB）。
 *
 *  来历：原为 512 KB，用户要求「抬到 10 MB」（覆盖 `AI小说研究/参考文/` 下的 5 本书，
 *  实测最大 2.4 MB）。上限的作用是**不让整份文件被读进内存并塞进 JSON 响应**，
 *  不是「能不能看」——超限仍如实回带 size 与 limit，由界面说清「多大、超了多少」。
 *  注意：这是**本服务（预览）自己的**阈值，与 files-export / files-fulltext /
 *  svc-search / files-kg 等插件各自的阈值无关，那些一律不动。 */
export const MAX_TEXT_PREVIEW_BYTES = 10 * 1024 * 1024

export interface Config {
  usersFile: string
  dataRoot: string
  /** 会话有效天数（A8：会话 TTL + 滑动续期），默认 7 */
  sessionTtlDays: number
}

/** 装配后存储自检结果（GitHub issue #2 / REQ-4）。 */
export interface StoreCheckResult {
  ok: boolean
  /** 硬失败原因（库不可读 / 抽样解密失败）；ok=false 时必有值 */
  error?: string
  codeRoot: string
  dataRoot: string
  library: {
    dataFiles: string
    exists: boolean
    /** 顶层可见条目（项目 + 个人空间） */
    entries: number
    projects: number
    personalSpaces: number
  }
  key: { source: string; file: string; env: boolean }
  sample: {
    ok: boolean
    label: string
    file?: string
    error?: string
    /** 若抽样的是库内文件，这里是相对库根的路径 */
    libraryFile?: string
  }
  /** 回收站根与配置库根的一致性（issue #2 / REQ-5） */
  trash?: { dataFiles: string; trashDir: string; ok: boolean; reason: string }
  warnings: string[]
  strict: boolean
  at: string
}

export const Config: z<Config> = z.object({
  usersFile: z.string().default(''),
  dataRoot: z.string().default(''),
  sessionTtlDays: z.number().default(7),
})

/** 项目根：由启动脚本注入 PRIVHUB_ROOT；缺省回退 cwd，兼容旧启动方式。 */
const codeRootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()
/** 系统数据根：其下 data/ 存 users/sessions/audit/trash；未设置时回落应用根。 */
const dataRootDir = process.env.PRIVHUB_DATA_ROOT?.trim() || codeRootDir
/** 文件库根（项目 / 个人空间）：可独立于系统数据根（GitHub issue #2 / REQ-1、REQ-3）。 */
const defaultDataFilesDir = process.env.PRIVHUB_DATA_FILES?.trim() || join(dataRootDir, 'data-files')

function resolvePath(value: string, fallback: string): string {
  const t = value.trim()
  return t === '' ? fallback : resolve(t)
}

/* ============ 蓝绿热更新（写入冻结） ============ */

/** 视为「写操作」的方法。冻结期间只有这些请求会被拒绝；读请求照常服务。 */
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * 运行时控制端点：它们自身要能在冻结状态下工作（否则无法解冻 / 查询状态），
 * 因此不参与冻结拦截与在途写计数。
 */
const CONTROL_ROUTES = new Set([
  '/privhub/api/runtime/state',
  '/privhub/api/runtime/freeze',
  '/privhub/api/runtime/unfreeze',
  '/privhub/api/runtime/shutdown',
  '/privhub/api/runtime/reload',
  '/privhub/api/runtime/activate',
  '/privhub/api/runtime/store-check',
])

/** 应用版本：health 与 runtime 状态共用；异步读取，请求到来时通常已就绪。 */
let appVersion = 'unknown'

function isLoopbackAddress(addr: string | undefined): boolean {
  return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1'
}

interface UserView {
  username: string
  displayName: string
  role: Role
  projects: string[]
  /** 本人个人空间目录名；未开通为 undefined。前端据此在项目列表里标记「我的空间」。 */
  personalDir?: string
}

/* ============ HTTP 共享工具（供各业务插件 import） ============ */

export function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    // A13：安全响应头基线
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'no-referrer',
  })
  res.end(payload)
}

/** S1：JSON/表单请求体默认上限 16MB（chunked 无 content-length 时由本函数兜底）。 */
export const MAX_BODY_BYTES = 16 * 1024 * 1024

/** 请求体超限错误（调用方据此回 413 而非 400）。 */
export class BodyTooLargeError extends Error {
  readonly statusCode = 413
  constructor(limit: number) {
    super(`请求体过大（上限 ${Math.floor(limit / 1024 / 1024)}MB）`)
    this.name = 'BodyTooLargeError'
  }
}

/** 判断错误是否为请求体超限。 */
export function isBodyTooLarge(e: unknown): boolean {
  return e instanceof BodyTooLargeError || (typeof e === 'object' && e !== null && (e as { statusCode?: number }).statusCode === 413)
}

/**
 * 读取文本请求体（有上限）。
 * S1：默认 16MB，超限即以 413 语义 reject 并断开，避免无界累积打爆进程内存。
 * 需要更大体积的路由显式传入 max。
 */
export function readBody(req: IncomingMessage, max: number = MAX_BODY_BYTES): Promise<string> {
  return new Promise((ok, reject) => {
    const limit = max > 0 ? max : MAX_BODY_BYTES
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > limit) {
        req.destroy()
        reject(new BodyTooLargeError(limit))
        return
      }
      chunks.push(c)
    })
    req.on('end', () => ok(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/**
 * S1：读取并解析 JSON 请求体，失败时**已代为响应**（413 体积超限 / 400 JSON 非法）。
 * 返回 null 表示已响应，调用方直接 `return`。
 */
export async function readJsonBody<T = unknown>(
  req: IncomingMessage,
  res: ServerResponse,
  max?: number,
): Promise<T | null> {
  try {
    return JSON.parse(await readBody(req, max)) as T
  } catch (e) {
    if (isBodyTooLarge(e)) { json(res, 413, { ok: false, error: '请求体过大' }); return null }
    json(res, 400, { ok: false, error: 'invalid json' })
    return null
  }
}

/** 读取原始字节请求体（文件上传用），超限则拒绝并断开。 */
export function readBodyRaw(req: IncomingMessage, max: number): Promise<Buffer> {
  return new Promise((ok, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > max) {
        reject(new Error('文件过大（超过 2GB 上限）'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => ok(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

/**
 * 会话 Cookie 名。
 *
 * 为什么需要第二条通道：插件前端是经 `import('/privhub-plugins/...')` 加载的，
 * 浏览器对动态 import / `<script>` 这类子资源请求【无法附加自定义请求头】，
 * 因此 Authorization: Bearer 在静态资源这一层用不了，只能靠 Cookie 携带会话。
 * Cookie 只作为 Bearer 缺失时的回退，接口鉴权语义不变。
 */
export const SESSION_COOKIE = 'privhub_sid'

/** 从 Cookie 头解析会话 token。 */
export function cookieToken(req: IncomingMessage): string | undefined {
  const raw = req.headers.cookie
  if (!raw) return undefined
  for (const seg of raw.split(';')) {
    const i = seg.indexOf('=')
    if (i < 0) continue
    if (seg.slice(0, i).trim() !== SESSION_COOKIE) continue
    const v = seg.slice(i + 1).trim()
    if (v === '') return undefined
    try { return decodeURIComponent(v) } catch { return v }
  }
  return undefined
}

/**
 * 取请求携带的会话 token：优先 Authorization: Bearer，回退会话 Cookie。
 * （web-server 的静态资源鉴权也复用本函数，保证两条通道判定一致。）
 */
export function tokenOf(req: IncomingMessage): string | undefined {
  const h = req.headers.authorization
  if (h) {
    const m = /^Bearer\s+(.+)$/i.exec(h)
    if (m) return m[1]
  }
  return cookieToken(req)
}

/** 下发会话 Cookie：HttpOnly（脚本读不到）+ SameSite=Strict（跨站不携带）。 */
export function sessionSetCookie(token: string, maxAgeSec: number): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.max(0, Math.floor(maxAgeSec))}`
}

/** 清除会话 Cookie（Path/属性需与下发时一致，否则浏览器不会覆盖）。 */
export function sessionClearCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`
}

/* ============ 密码：scrypt 盐哈希（Node 内置，自包含） ============ */

export function hashPassword(raw: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(raw, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(raw: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const target = Buffer.from(hash, 'hex')
  const attempt = scryptSync(raw, salt, 64)
  return target.length === attempt.length && timingSafeEqual(target, attempt)
}

/** 体积人类可读化（B/KB/MB/GB）。供 listFiles 与外部扫描类插件（引用检查等）共用一处口径。 */
export function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

/* ============ 共享存储服务 ============ */

declare module '@deepseek-ai/cordis' {
  interface Context {
    privhub: PrivHubStore
  }
}

/** 会话条目（A8：TTL + 滑动续期）。 */
export interface SessionEntry {
  username: string
  /** epoch 毫秒过期时间 */
  expiresAt: number
}

export class PrivHubStore extends Service {
  readonly usersFile: string
  readonly dataRoot: string
  users: Map<string, UserRecord> = new Map()
  sessions: Map<string, SessionEntry> = new Map() // token -> { username, expiresAt }
  loginFails: Map<string, { count: number; until: number }> = new Map()
  /**
   * 「退休」的个人空间目录名：改过名之后，旧名字永久保留在此，映射到原归属者。
   *
   * 为什么必须保留而不能直接释放：个人空间的数据不止在文件夹里，还散落在
   * 一批【以目录名为键】的存储中（versions/comments/meta/fulltext/回收站/
   * 收藏/最近…）。这些存储只用 canAccess 把关，而 canAccess 对管理员
   * 是「任意合法名字都放行」。一旦旧名字被释放：
   *   ① 管理员可以按旧名直接读到私人文件的历史版本正文（越权）；
   *   ② 若之后有人注册成同名，新人会拿到旧名的可见性，直接读到前任的
   *      版本历史与批注内容。
   * 保留旧名字并维持其归属，canAccess / visibleProjects 就会继续把
   * 旧名字对所有人（含管理员）挡在外面，从根上关闭这一整类越权，
   * 也无需逐个存储去补清理钩子。
   */
  private retiredDirs: Map<string, string> = new Map()
  private readonly dataDir: string
  /** 分片上传会话目录（`data/.upload-sessions/`）。
   *  系统临时数据，不属于用户文件；由 privhub-files 读写，core 只负责给出
   *  与 `PRIVHUB_DATA_ROOT` 同源的路径（避免插件各自拼数据根）。 */
  readonly uploadSessionDir: string
  private readonly sessionsFile: string
  private readonly trashFile: string
  readonly trashDir: string
  /** 会话 TTL 毫秒（auth 登录写入、me 滑动续期共用） */
  readonly sessionTtlMs: number
  /** D4：初始化完成信号——由 apply 赋值，main.ts 在 listen 前 await，避免「空用户表」竞态。 */
  ready: Promise<void> = Promise.resolve()

  /* ---- 蓝绿热更新：写入冻结状态（进程级，仅控制层可改） ---- */
  /** 冻结后新到的写请求一律 503；读请求不受影响。 */
  frozen = false
  /** 已进入 handler 且尚未完成的写请求数（冻结时等它归零再切流量）。 */
  writesInFlight = 0
  /** 在途写归零时唤醒冻结等待者。 */
  private writeWaiters = new Set<() => void>()

  /* ---- 蓝绿热更新：待命（standby）状态 ----
   *
   * 新槽在旧槽仍在服务时先启动预热（冷启动可达数十秒）。预热期间它绝不能
   * 执行后台写任务（回收站清理 / RAG 重建 / 会话清理 / 备份…），否则两个
   * 进程会并发写同一个数据根。控制层以 PRIVHUB_STANDBY=1 启动目标槽，
   * 各定时任务检查这里的状态；切换流量前控制层调用 /runtime/reload 刷新
   * 文件态缓存，再调用 /runtime/activate 解除待命并启动延后的后台任务。 */
  standby = process.env.PRIVHUB_STANDBY === '1'
  private activateHooks: Array<() => void | Promise<void>> = []

  constructor(ctx: Context, private config: Config) {
    super(ctx, 'privhub')
    this.usersFile = resolvePath(config.usersFile, join(dataRootDir, 'data', 'users.json'))
    this.dataRoot = resolvePath(config.dataRoot, defaultDataFilesDir)
    this.dataDir = join(dataRootDir, 'data')
    this.uploadSessionDir = join(this.dataDir, '.upload-sessions')
    this.sessionsFile = join(this.dataDir, 'sessions.json')
    this.trashFile = join(this.dataDir, 'trash.json')
    this.trashDir = join(this.dataRoot, '.trash')
    this.sessionTtlMs = (config.sessionTtlDays > 0 ? config.sessionTtlDays : 7) * 24 * 3600 * 1000
  }

  /**
   * 单文件上传上限（字节）。**唯一事实来源 = `data/settings.json` 的 `maxUploadMB`**，
   * 返回 0 表示不限。
   *
   * 为什么放在 core：`privhub-shell-settings`（L3）负责写设置，`privhub-files`（L1）
   * 负责上传，两者不能互相 import；由 core 在请求时读同一份文件，避免「设置面板
   * 允许 8GB、上传路由却仍硬编码 2GB」的口径分裂（GitHub issue #1 P0#3）。
   *
   * 文件不存在（从未改过设置）=> 不限（与 settings 默认 0 一致）；
   * 文件存在但读/解析失败 => 保守回落 2GB，绝不因配置损坏而静默放开上限。
   */
  async uploadLimitBytes(): Promise<number> {
    const file = join(this.dataDir, 'settings.json')
    if (!existsSync(file)) return 0
    try {
      const raw = await this.ctx.storage.readText(file)
      const mb = Number((JSON.parse(raw) as { maxUploadMB?: unknown }).maxUploadMB)
      if (!Number.isFinite(mb) || mb <= 0) return 0
      return Math.floor(mb) * 1024 * 1024
    } catch {
      return MAX_UPLOAD_BYTES
    }
  }

  /** 注册一条 exact 路由（业务插件共用入口，可随插件停用回收）。
   *  label 可选：多数调用点只传 path+handler（历史各插件影子类型也把它标成可选），
   *  缺省取 path 本身作为副作用标签，便于自检与回收记录。
   *
   *  蓝绿热更新：所有业务路由在这里统一包装，因此「冻结写入」对全站一致生效 —
   *  不需要每个插件自己判断。冻结时写请求立即 503（并给 Retry-After），
   *  读请求与运行时控制端点照常；在途写请求会计数，供冻结端点等待排空。 */
  route(path: string, handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>, label: string = path): void {
    const self = this
    const wrapped = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
      const method = (req.method ?? 'GET').toUpperCase()
      const isWrite = WRITE_METHODS.has(method)
      const exempt = CONTROL_ROUTES.has(path)
      if (isWrite && !exempt) {
        if (self.frozen) { self.rejectFrozen(req, res); return }
        self.writesInFlight++
        try {
          await handler(req, res)
        } finally {
          self.writesInFlight--
          if (self.writesInFlight === 0) {
            for (const wake of self.writeWaiters) wake()
            self.writeWaiters.clear()
          }
        }
        return
      }
      await handler(req, res)
    }
    this.ctx.effect(() => this.ctx.webServer.register({ kind: 'exact', path, handler: wrapped }), label)
  }

  /** 冻结期间拒绝新的写请求。
   *
   *  与 413 的处理同理：先把 503 响应完全交给内核，再断开请求。
   *  大请求体（上传）此时可能仍在发送，立即 destroy 会触发 RST 把响应一起吞掉，
   *  客户端只会看到 ECONNRESET，误以为服务挂了。 */
  private rejectFrozen(req: IncomingMessage, res: ServerResponse): void {
    const payload = JSON.stringify({
      ok: false,
      code: 'PRIVHUB_RESTARTING',
      error: '服务正在更新，请刷新页面后重试',
    })
    try {
      res.writeHead(503, {
        'content-type': 'application/json; charset=utf-8',
        'content-length': Buffer.byteLength(payload),
        'retry-after': '2',
        connection: 'close',
      })
      res.end(payload, () => { req.destroy() })
    } catch {
      req.destroy()
    }
  }

  /** 等待在途写请求归零；超时返回 false（控制层据此决定是否继续/回滚）。 */
  waitForWrites(timeoutMs: number): Promise<boolean> {
    if (this.writesInFlight === 0) return Promise.resolve(true)
    return new Promise((done) => {
      let timer: ReturnType<typeof setTimeout> | null = null
      const wake = (): void => {
        if (timer) clearTimeout(timer)
        timer = null
        this.writeWaiters.delete(wake)
        done(this.writesInFlight === 0)
      }
      this.writeWaiters.add(wake)
      timer = setTimeout(() => {
        this.writeWaiters.delete(wake)
        done(this.writesInFlight === 0)
      }, Math.max(0, timeoutMs))
      if (typeof timer.unref === 'function') timer.unref()
    })
  }

  /**
   * 装配后存储自检（只读）。启动时打印、蓝绿切流前由控制层调用（REQ-4）。
   *
   * 检查三件事，任何一项硬失败都让 ok=false：
   *   1. 文件库根是否存在、顶层项目/个人空间数量；
   *   2. 系统账号文件（通常是密文）能否读并通过 GCM 认证 —— 解不开即密钥错配；
   *   3. 库内抽样一个密文文件整段解密（有界：最多看 300 个文件、≤8MB）。
   *
   * 「空库」不算硬失败（新装初始化是合法状态），只记警告；是否因此拒绝启动
   * 由 PRIVHUB_STORE_STRICT / store.json strict 决定。
   */
  async storeCheck(): Promise<StoreCheckResult> {
    const warnings: string[] = []
    let hardError: string | null = null
    const library: StoreCheckResult['library'] = {
      dataFiles: this.dataRoot, exists: false, entries: 0, projects: 0, personalSpaces: 0,
    }

    try {
      library.exists = existsSync(this.dataRoot)
      if (library.exists) {
        const ents = await readdir(this.dataRoot, { withFileTypes: true })
        const personal = this.personalDirSet()
        for (const ent of ents) {
          if (!ent.isDirectory() || ent.name.startsWith('.')) continue
          library.entries++
          if (personal.has(ent.name)) library.personalSpaces++
          else library.projects++
        }
      } else {
        warnings.push('文件库根不存在：' + this.dataRoot)
      }
      if (library.exists && library.entries === 0) {
        warnings.push('文件库根存在，但顶层没有任何项目或个人空间目录：' + this.dataRoot)
      }
      if (library.projects === 0 && library.personalSpaces > 0) {
        warnings.push('文件库只有个人空间，没有可见项目')
      }
    } catch (e) {
      hardError = '文件库根无法读取：' + (e instanceof Error ? e.message : String(e))
      warnings.push(hardError)
    }

    const key = this.ctx.storage.keyInfo
    const sample: StoreCheckResult['sample'] = { ok: true, label: '系统账号文件 users.json', file: this.usersFile }
    try {
      if (existsSync(this.usersFile)) {
        const raw = await this.ctx.storage.readText(this.usersFile)
        JSON.parse(raw)
      } else {
        warnings.push('系统账号文件不存在（新库首次启动尚未生成？）：' + this.usersFile)
      }
    } catch (e) {
      sample.ok = false
      sample.error = e instanceof Error ? e.message : String(e)
      hardError = hardError || ('抽样解密失败：' + sample.error)
    }

    /* 库内抽样：只在系统账号文件抽查通过后追加；找不到密文（明文旧库/新库）不算失败。 */
    if (sample.ok) {
      try {
        const found = await this.ctx.storage.findCiphertextFile(this.dataRoot, 300)
        if (found) {
          const st = await stat(found)
          if (st.size <= 8 * 1024 * 1024) {
            await this.ctx.storage.readBuffer(found)
            sample.libraryFile = found.startsWith(this.dataRoot)
              ? found.slice(this.dataRoot.length).replace(/^[\\/]+/, '')
              : found
          } else {
            warnings.push('库内抽样文件超过 8MB，跳过整段解密：' + found)
          }
        } else {
          warnings.push('库根内未抽样到密文文件（可能是明文旧库，或库为空）')
        }
      } catch (e) {
        sample.ok = false
        sample.error = e instanceof Error ? e.message : String(e)
        hardError = hardError || ('库内文件抽样解密失败：' + sample.error)
      }
    }

    /* 破坏性操作的根一致性（issue #2 / REQ-5）：回收站必须落在配置的库根下，
     * 否则「清空回收站 / 定时清理」会在错误的库上删文件。这是硬失败，
     * 因为它是「库根配错」在删除路径上的直接后果。 */
    const trash = this.trashRootStatus()
    if (!trash.ok) {
      hardError = hardError || trash.reason
      warnings.push(trash.reason)
    }

    const strictFlag = (process.env.PRIVHUB_STORE_STRICT || '').toLowerCase()
    return {
      ok: hardError === null,
      ...(hardError ? { error: hardError } : {}),
      codeRoot: codeRootDir,
      dataRoot: dataRootDir,
      library,
      key,
      sample,
      trash,
      warnings,
      strict: ['1', 'true', 'yes'].includes(strictFlag),
      at: new Date().toISOString(),
    }
  }

  /** 鉴权辅助：从请求解析登录用户；未登录时直接回 401 并返回 null。 */
  requireUser(req: IncomingMessage, res: ServerResponse): UserRecord | null {    const u = this.me(tokenOf(req))
    if (!u) { json(res, 401, { ok: false, error: '未登录' }); return null }
    return u
  }

  /**
   * 运行时控制接口的准入：仅本机回环 + 控制令牌。
   *
   * 这些端点能冻结全站写入、决定蓝绿切换，绝不能落到 LAN 客户端手里。
   * 未设置 `PRIVHUB_CONTROL_TOKEN`（例如开发者直接 `npm run dev`）时一律关闭，
   * 不让「本地调试」意外变成「任何人可冻结」。
   */
  controlAllowed(req: IncomingMessage, res: ServerResponse): boolean {
    if (!isLoopbackAddress(req.socket.remoteAddress)) {
      json(res, 403, { ok: false, error: '运行时控制接口仅允许本机访问' })
      return false
    }
    const expected = process.env.PRIVHUB_CONTROL_TOKEN?.trim() ?? ''
    if (expected === '') {
      json(res, 403, { ok: false, error: '运行时控制接口未启用（缺少 PRIVHUB_CONTROL_TOKEN）' })
      return false
    }
    const raw = req.headers['x-privhub-control-token']
    const given = Array.isArray(raw) ? raw[0] : raw
    if (typeof given !== 'string' || given.length !== expected.length
      || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
      json(res, 403, { ok: false, error: '控制令牌无效' })
      return false
    }
    return true
  }

  /** 注册「解除待命时执行」的回调。非待命进程立即执行（等价于正常启动路径）。
   *  返回解除注册函数，供 ctx.effect 清理（插件卸载后不再触发）。 */
  onActivate(fn: () => void | Promise<void>): () => void {
    if (!this.standby) { void fn(); return () => { /* 已执行，无需清理 */ } }
    this.activateHooks.push(fn)
    return () => {
      const i = this.activateHooks.indexOf(fn)
      if (i >= 0) this.activateHooks.splice(i, 1)
    }
  }

  /** 解除待命：先置 false（让回调看到已激活），再逐个执行延后的后台任务。 */
  async activate(): Promise<{ activated: boolean; hooks: number }> {
    if (!this.standby) return { activated: false, hooks: 0 }
    this.standby = false
    const hooks = this.activateHooks
    this.activateHooks = []
    for (const fn of hooks) {
      try { await fn() } catch (e) {
        console.error('[runtime] 激活钩子失败：' + (e instanceof Error ? e.message : String(e)))
      }
    }
    /* L2 服务（如 svc-audit）在 core 之前挂载，拿不到 ctx.privhub.standby，
     * 用事件解除待命。 */
    try { this.ctx.emit('runtime:activated', { at: Date.now(), pid: process.pid, hooks: hooks.length }) } catch { /* 无监听方不影响激活 */ }
    return { activated: true, hooks: hooks.length }
  }

  /** runtime 状态快照（控制层与运维脚本共用）。 */
  runtimeState(): Record<string, unknown> {
    return {
      ok: true,
      frozen: this.frozen,
      writesInFlight: this.writesInFlight,
      standby: this.standby,
      version: appVersion,
      pid: process.pid,
      slot: process.env.PRIVHUB_SLOT ?? null,
      uptimeSeconds: Math.floor(process.uptime()),
    }
  }

  /* ---------- 并发控制 ---------- */

  /**
   * D6：按 key（通常取文件路径）串行化的写队列。
   *
   * 背景：单次写盘是原子的（svc-storage 走 tmp+rename），但「读 → 改 → 写」
   * 这个【序列】不是。两个并发的删除操作会各自读到同一份旧列表、各自写回，
   * 后者覆盖前者 —— 实体文件已移入 .trash，记录却丢了，
   * 表现为「文件从界面上彻底消失，既恢复不了也清理不掉」。
   *
   * 用法：把整段读改写包进来，不要只锁最后一步的写。
   *   await svc.withFileLock(file, async () => { const l = await load(); l.push(x); await save(l) })
   */
  private readonly fileLocks = new Map<string, Promise<unknown>>()

  async withFileLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.fileLocks.get(key) ?? Promise.resolve()
    // 无论前一个成功或失败，都继续执行（错误不传染，但顺序不破坏）
    const run = prev.then(fn, fn)
    const tail = run.then(() => undefined, () => undefined)
    this.fileLocks.set(key, tail)
    void tail.finally(() => {
      // 仅当自己仍是队尾时清理，避免无界增长
      if (this.fileLocks.get(key) === tail) this.fileLocks.delete(key)
    })
    return run
  }

  /* ---------- 持久化 ---------- */
  async ensureDirs(): Promise<void> {
    await mkdir(this.dataRoot, { recursive: true })
    await mkdir(this.dataDir, { recursive: true })
  }

  async loadUsers(): Promise<void> {
    await this.ensureDirs()
    if (!existsSync(this.usersFile)) {
      const initial = {
        users: [
          { username: 'admin', password: hashPassword('admin123'), displayName: '系统管理员', role: 'admin', projects: [] },
          { username: 'user1', password: hashPassword('user123'), displayName: '普通员工', role: 'user', projects: ['公共', 'A项目'] },
        ],
      }
      await this.ctx.storage.writeText(this.usersFile, JSON.stringify(initial, null, 2))
    }
    const raw = await this.ctx.storage.readText(this.usersFile)
    let parsed: { users: UserRecord[] }
    try {
      parsed = JSON.parse(raw) as { users: UserRecord[] }
      if (!parsed || !Array.isArray(parsed.users)) throw new Error('users 字段缺失或非数组')
    } catch (e) {
      // D5：账号库损坏必须【显著失败】而非静默降级为空。
      // 若降级为空，所有人都登不上且看不出原因；若继续写入还会覆盖掉可恢复的数据。
      // 这里原样保留损坏文件，交由运维处理（备份/修复后重启）。
      throw new Error(
        `账号文件解析失败（${this.usersFile}）：${e instanceof Error ? e.message : String(e)}。` +
        '该文件已保持原样未改动，请先备份并人工修复后再启动。',
      )
    }
    this.users = new Map()
    for (const u of parsed.users) {
      if (u && typeof u.username === 'string') this.users.set(u.username, { ...u, projects: u.projects ?? [] })
    }
    // 旧文件没有 retiredPersonalDirs 字段：视为空（不影响既有账号）
    this.retiredDirs = new Map()
    const retired = (parsed as { retiredPersonalDirs?: Record<string, string> }).retiredPersonalDirs
    if (retired && typeof retired === 'object') {
      for (const [dir, owner] of Object.entries(retired)) {
        if (typeof dir === 'string' && dir !== '' && typeof owner === 'string' && owner !== '') {
          this.retiredDirs.set(dir, owner)
        }
      }
    }
  }

  async saveUsers(): Promise<void> {
    await this.atomicWrite(this.usersFile, JSON.stringify({
      users: [...this.users.values()],
      retiredPersonalDirs: Object.fromEntries(this.retiredDirs),
    }, null, 2))
  }

  async loadSessions(): Promise<void> {
    if (existsSync(this.sessionsFile)) {
      try {
        const raw = await this.ctx.storage.readText(this.sessionsFile)
        const parsed = JSON.parse(raw) as Record<string, string | SessionEntry>
        this.sessions = new Map()
        for (const [token, v] of Object.entries(parsed)) {
          // 兼容旧格式（纯 username 字符串 → 视为剩余 TTL 全量）
          if (typeof v === 'string') this.sessions.set(token, { username: v, expiresAt: Date.now() + this.sessionTtlMs })
          else if (v && typeof v === 'object' && typeof v.username === 'string') this.sessions.set(token, { username: v.username, expiresAt: Number(v.expiresAt) || Date.now() + this.sessionTtlMs })
        }
      } catch { /* 损坏则忽略 */ }
    }
  }
  async saveSessions(): Promise<void> {
    await this.atomicWrite(this.sessionsFile, JSON.stringify(Object.fromEntries(this.sessions), null, 2))
  }

  /** A12+S7：原子写 + 静态加密（经 ctx.storage 透明加解密，密文/明文自动识别）。 */
  private async atomicWrite(file: string, data: string): Promise<void> {
    await this.ctx.storage.writeText(file, data)
  }

  /* ---------- 权限辅助 ---------- */
  userView(u: UserRecord): UserView {
    return { username: u.username, displayName: u.displayName, role: u.role, projects: [...u.projects], personalDir: u.personalDir }
  }

  /* ---------- 个人空间 ---------- */
  /*
   * 个人空间与「项目」是两类东西：它同样是 data-files 下的顶层文件夹，但在
   * users[].personalDir 中登记，因此：
   *   ① 不计入 allProjects()（管理员的项目列表/项目下拉里看不到）；
   *   ② canAccess 只对归属者本人放行（管理员也不行）；
   *   ③ 不参与查重/向量化/全文索引（见 indexableProjects）；
   *   ④ 系统永不自动删除（项目软删、删除账号都不动它）。
   */

  /** 所有已登记的个人空间目录名。 */
  private personalDirSet(): Set<string> {
    // 含「退休」名：旧名仍然必须被当作个人空间对待，
    // 否则它会退回普通项目身份（管理员 canAccess 放行），泄露历史数据。
    const set = new Set<string>(this.retiredDirs.keys())
    for (const u of this.users.values()) {
      const d = (u.personalDir ?? '').trim()
      if (d !== '' && this.isValidProjectName(d)) set.add(d)
    }
    return set
  }

  /** 该顶层文件夹是否是某个用户的个人空间。 */
  isPersonalDir(name: string): boolean {
    return this.personalDirSet().has(name)
  }

  /** 个人空间的归属者用户名；不是个人空间返回 null。 */
  ownerOfPersonalDir(name: string): string | null {
    for (const u of this.users.values()) if ((u.personalDir ?? '').trim() === name) return u.username
    // 退休名仍归原主：canAccess 因此继续拒绝其他人（含管理员）
    return this.retiredDirs.get(name) ?? null
  }

  /** 本人个人空间目录名；未开通或目录不存在返回 null。 */
  personalDirOf(user: UserRecord): string | null {
    const d = (user.personalDir ?? '').trim()
    if (d === '' || !this.isValidProjectName(d)) return null
    return existsSync(resolve(this.dataRoot, d)) ? d : null
  }

  /**
   * 姓名查重（注册与改名共用）。冲突来源：
   *   ① 其他账号的显示名  ② 其他账号的个人空间目录名  ③ data-files 下已存在的同名顶层文件夹。
   * exceptUsername 用于「改自己的名字」时排除自己。
   */
  async checkNameAvailable(name: string, exceptUsername?: string): Promise<{ ok: true } | { ok: false; reason: string }> {
    const n = String(name ?? '').trim()
    if (n === '') return { ok: false, reason: '姓名不能为空' }
    if (n.length > 32) return { ok: false, reason: '姓名过长（上限 32 字）' }
    if (!this.isValidProjectName(n)) return { ok: false, reason: '姓名不能包含 / \\ .. 等字符' }
    for (const u of this.users.values()) {
      if (exceptUsername !== undefined && u.username === exceptUsername) continue
      if ((u.displayName ?? '').trim() === n) return { ok: false, reason: `姓名「${n}」已被账号 ${u.username} 使用` }
      if ((u.personalDir ?? '').trim() === n) return { ok: false, reason: `姓名「${n}」已被占用` }
    }
    // 退休名不可给他人：否则新人会继承旧名的可见性，
    // 从而读到前任留在版本历史/批注/全文索引里的私人内容
    const retiredOwner = this.retiredDirs.get(n)
    if (retiredOwner !== undefined && retiredOwner !== exceptUsername) {
      return { ok: false, reason: `姓名「${n}」曾被使用，为保护历史数据不可复用` }
    }
    if (existsSync(resolve(this.dataRoot, n))) return { ok: false, reason: `已存在同名文件夹「${n}」` }
    return { ok: true }
  }

  /**
   * 绑定个人空间：把 users[].personalDir 置为 dirName 并确保目录存在。
   * 只负责建目录与登记，不改 displayName——一致性由调用方（注册/改名）保证。
   */
  async bindPersonalDir(username: string, dirName: string): Promise<boolean> {
    const u = this.users.get(username)
    if (!u) return false
    const n = String(dirName ?? '').trim()
    if (n === '' || !this.isValidProjectName(n)) return false
    const owner = this.ownerOfPersonalDir(n)
    if (owner !== null && owner !== username) return false
    await mkdir(resolve(this.dataRoot, n), { recursive: true })
    u.personalDir = n
    return true
  }

  /**
   * 改显示名 —— 与个人空间目录名 live-bound（二者必须同名）。
   *
   * 为什么必须在一个方法里同时改：显示名与目录名是同一件事的两个副本，
   * 任何只改一半的结果都是「文件夹叫新名、账号记着旧名」——那样本人访问不到、
   * 而旧名又因为不再登记为个人空间而被当成普通项目名（管理员可见），是最坏状态。
   *
   * 顺序与回滚：
   *   ① 查重（其他账号姓名 / 其他账号个人空间名 / 退休名 / data-files 下已存在同名顶层目录）
   *   ② 改磁盘目录（先做，失败则整体放弃，registry 未动）
   *   ③ 改 registry + 旧名退休，一并落盘；落盘失败则把磁盘与退休表都【改回去】
   *
   * 旧名退休是关键（见 retiredDirs 说明）：改完名后旧名不能直接消失，
   * 否则它会退回普通项目身份，让管理员按旧名读到版本历史/批注等私人内容。
   *
   * 未开通个人空间的历史账号（personalDir 为空）只改显示名，不碰磁盘。
   *
   * @returns ok=false 时保证不产生任何改动。
   */
  async changeDisplayName(username: string, rawName: string): Promise<
    | { ok: true; oldName: string; newName: string; renamedDir: boolean }
    | { ok: false; reason: string }
  > {
    const u = this.users.get(username)
    if (!u) return { ok: false, reason: '用户不存在' }
    const newName = String(rawName ?? '').trim()
    if (newName === '') return { ok: false, reason: '姓名不能为空' }
    const oldName = String(u.displayName ?? '').trim()
    if (newName === oldName) return { ok: true, oldName, newName, renamedDir: false }

    const avail = await this.checkNameAvailable(newName, username)
    if (!avail.ok) return { ok: false, reason: avail.reason }

    const oldDir = String(u.personalDir ?? '').trim()
    const hasSpace = oldDir !== ''
    const willRename = hasSpace && oldDir !== newName
    const oldAbs = resolve(this.dataRoot, oldDir)
    const newAbs = resolve(this.dataRoot, newName)

    if (willRename && existsSync(newAbs)) {
      return { ok: false, reason: `已存在同名文件夹「${newName}」` }
    }

    let renamedDir = false
    if (willRename && existsSync(oldAbs)) {
      try {
        await rename(oldAbs, newAbs)
        renamedDir = true
      } catch (e) {
        return { ok: false, reason: '改名失败：' + (e instanceof Error ? e.message : String(e)) }
      }
    }
    // 幂等：改名成功后目录已在；旧目录缺失时补建，保证个人空间始终可用
    if (hasSpace) await mkdir(newAbs, { recursive: true })

    const prevDisplay = u.displayName
    const prevPersonal = u.personalDir
    const retiredSnapshot = new Map(this.retiredDirs)
    u.displayName = newName
    if (hasSpace) u.personalDir = newName
    if (renamedDir) {
      // 旧名退休 + 本人的旧名若被重新取回则取消退休
      this.retiredDirs.set(oldDir, username)
      this.retiredDirs.delete(newName)
    }
    try {
      await this.saveUsers()
    } catch (e) {
      u.displayName = prevDisplay
      u.personalDir = prevPersonal
      this.retiredDirs = retiredSnapshot
      if (renamedDir) await rename(newAbs, oldAbs).catch(() => { /* 回滚尽力而为 */ })
      return { ok: false, reason: '保存账号失败：' + (e instanceof Error ? e.message : String(e)) }
    }
    return { ok: true, oldName, newName, renamedDir }
  }

  /* ---------- 项目列表与权限 ---------- */

  /** 所有「真正的项目」——不含任何个人空间（管理员界面与索引类功能都以此为准）。 */
  async allProjects(): Promise<string[]> {
    if (!existsSync(this.dataRoot)) return []
    const ents = await readdir(this.dataRoot, { withFileTypes: true })
    const personal = this.personalDirSet()
    return ents
      .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !personal.has(e.name))
      .map((e) => e.name)
      .sort()
  }

  /**
   * 用户可见的顶层文件夹：本人的个人空间 + 有权限的项目。
   * 管理员拿到全部项目，但【不含】他人个人空间。
   */
  async visibleProjects(user: UserRecord): Promise<string[]> {
    const own = this.personalDirOf(user)
    const personal = this.personalDirSet()
    const base = user.role === 'admin'
      ? await this.allProjects()
      : user.projects.filter((p) => this.isValidProjectName(p) && !personal.has(p))
    return own === null ? base : [own, ...base.filter((p) => p !== own)]
  }

  /** 索引类功能（查重/向量化/全文索引）的目标范围：只针对项目，排除个人空间。 */
  async indexableProjects(user: UserRecord): Promise<string[]> {
    const personal = this.personalDirSet()
    return (await this.visibleProjects(user)).filter((p) => !personal.has(p))
  }

  isValidProjectName(name: string): boolean {
    return name !== '' && !name.includes('/') && !name.includes('\\') && !name.includes('..') && name !== '.'
  }

  /**
   * 文件访问判定。个人空间优先级最高：只有归属者本人可以访问，
   * 管理员同样不可访问（管理员对个人空间的可见性仅限审计记录，不含文件内容）。
   */
  canAccess(user: UserRecord, project: string): boolean {
    if (!this.isValidProjectName(project)) return false
    const owner = this.ownerOfPersonalDir(project)
    if (owner !== null) return user.username === owner
    if (user.role === 'admin') return true
    return user.projects.includes(project)
  }

  /** A8：会话 TTL + 滑动续期。过期删除；剩余不足一半时续期（内存更新 + 异步落盘）。 */
  me(token: string | undefined): UserRecord | null {
    if (!token) return null
    const entry = this.sessions.get(token)
    if (!entry) return null
    const now = Date.now()
    if (entry.expiresAt <= now) {
      this.sessions.delete(token)
      void this.saveSessions()
      return null
    }
    if (entry.expiresAt - now < this.sessionTtlMs / 2) {
      entry.expiresAt = now + this.sessionTtlMs
      void this.saveSessions()
    }
    return this.users.get(entry.username) ?? null
  }

  /* ---------- 文件与项目操作 ---------- */

  /** 安全解析项目内相对路径为绝对路径；越界返回 null。 */
  resolveInProject(project: string, relPath: string): string | null {
    const base = resolve(this.dataRoot, project)
    const target = relPath === '' || relPath === '.' ? base : resolve(base, relPath)
    if (target !== base && !target.startsWith(base + sep)) return null
    return target
  }

  /** 安全解析 + realpath 防 junction/symlink 穿越（读取/写入类接口调用）。
   *  字符串校验通过后仍可能经 junction 指向数据根之外（如 data/），必须二次校验。
   *  目标不存在时（新建场景）校验其父目录，父目录安全即放行。 */
  async resolveReal(project: string, relPath: string): Promise<string | null> {
    const target = this.resolveInProject(project, relPath)
    if (target === null) return null
    try {
      const base = resolve(this.dataRoot, project)
      const rb = await realpath(base)
      const check = (real: string): boolean => real === rb || real.startsWith(rb + sep)
      let rt: string
      try {
        rt = await realpath(target)
      } catch {
        // 目标不存在：父目录 realpath 校验（防 junction 目录下新建穿透）
        const parent = await realpath(dirname(target)).catch(() => null)
        if (parent === null || !check(parent)) return null
        return target
      }
      if (!check(rt)) return null
      return target
    } catch { return null }
  }

  /** A14/A22：并行 stat（Promise.all，千级目录不串行卡顿）；mtime 返回完整 ISO 时间戳。 */
  async listFiles(project: string, subPath = ''): Promise<{ name: string; isDir: boolean; size: number; sizeText: string; mtime: string; type: string }[]> {
    const dir = this.resolveInProject(project, subPath)
    if (dir === null || !existsSync(dir)) return []
    // 防 junction/symlink 目录穿越：不跟随符号链接条目（Windows junction 的 isSymbolicLink() 为 true）
    const ents = await readdir(dir, { withFileTypes: true })
    const stats = await Promise.all(ents.map(async (e) => {
      if (e.name.startsWith('.') || e.isSymbolicLink()) return null
      const full = join(dir, e.name)
      try {
        const s = await stat(full)
        // S7：密文文件大小减 36（20 字节头 + 16 字节 GCM tag），展示明文体积
        let size = s.isDirectory() ? 0 : s.size
        if (!s.isDirectory() && await this.ctx.storage.isEncrypted(full)) size = Math.max(0, size - 36)
        return { name: e.name, isDir: s.isDirectory(), size, mtime: s.mtime.toISOString() }
      } catch { return null }
    }))
    const out: { name: string; isDir: boolean; size: number; sizeText: string; mtime: string; type: string }[] = []
    for (const s of stats) {
      if (!s) continue
      out.push({
        name: s.name,
        isDir: s.isDir,
        size: s.size,
        sizeText: s.isDir ? '—' : fmtSize(s.size),
        mtime: s.mtime,
        type: s.isDir ? '文件夹' : (extname(s.name).slice(1).toUpperCase() || '文件'),
      })
    }
    return out.sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1))
  }

  /** 读取文件内容用于预览（仅允许数据根内部）
   *
   *  返回的 `type` 是【互斥的原因】，不是「能不能看」：
   *  `text` 文本可读 / `image` / `pdf` / `media`（音视频）走原始字节流 /
   *  `too-large` 类型支持但体积超上限 / `unknown` 确实不支持预览。
   *  前端据此分别给话，不再把「超限」说成「类型不支持」。
   *  ⚠ 音视频（`media`）只保证"这是音视频"，**不保证浏览器能播** ——
   *  能不能原生解码由前端那份白名单判（见 `file-exts.ts` 的 `AUDIO_EXTS` 注释）。 */
  async readFileForPreview(project: string, relPath: string): Promise<{ data: string; type: string; size?: number; limit?: number } | null> {
    const target = this.resolveInProject(project, relPath)
    if (target === null || !existsSync(target)) return null
    const s = await stat(target)
    if (s.isDirectory()) return null
    const ext = extname(target).slice(1).toLowerCase()
    /* 【扩展名一处定义】文本清单与图片清单都不再写在这里，统一取自 `./file-exts`：
     *   · `isPreviewTextExt` = 最宽的那份（纯文本即可预览，不要求可编辑）；
     *   · `isImageExt`       = 与前端 `kindOf` 的图片清单**同一份取值**（`.ico` 的分裂由此根除）。
     * 迁前这里是两份手写字面量数组，与 fulltext / rag / versions / agent / 前端各自一份，
     * 且已经不一致（见 `file-exts.ts` 文件头那张表）。 */
    const isTextExt = isPreviewTextExt(ext)
    const maxTextBytes = MAX_TEXT_PREVIEW_BYTES
    /* 文本格式超出体积上限：与「类型不支持」是两件事，必须能区分。
     * 这里【不返回文件内容】（上限本身就是挡「把几百 MB 文本读进内存」），
     * 但如实回带体积与上限，让界面能说清「多大、超了多少」。
     * 注意：判定要放在图片/PDF 分支之前——图片/PDF 本来就不读进 JSON，
     * 不受此上限约束，不能被这条抢走。 */
    if (isTextExt && s.size > maxTextBytes + 20) {
      return { data: '', type: 'too-large', size: s.size, limit: maxTextBytes }
    }
    if (isTextExt && s.size <= maxTextBytes + 20) {
      // S7：文本预览走解密读（密文/明文自动识别）
      const buf = await this.ctx.storage.readBuffer(target)
      // 智能编码检测：UTF-8 合法 → utf8；否则回退 GBK（中文 Windows 常见 txt）
      const utf8 = new TextDecoder('utf-8', { fatal: true })
      let data: string
      try {
        data = utf8.decode(buf)
      } catch {
        data = new TextDecoder('gbk').decode(buf)
      }
      return { data, type: 'text' }
    }
    if (isImageExt(ext)) return { data: '', type: 'image' }
    /* 音视频（2026-10-09）：与图片/PDF 同一种处理 —— **不把字节读进 JSON**，
     * 界面拿 `preview-raw` 的直链交给 `<video>`/`<audio>`，由浏览器自己按 Range 分段取。
     * 判定要放在文本分支之后（`isMediaExt` 与文本集无交集，顺序其实无碍，但
     * 与图片/PDF 排在一起才读得懂"这三类都是直链类"）。
     * ⚠ 这里**不判体积**：几十 MB 的视频要能播，而"读进内存"这条路根本没走（见上）。 */
    if (isMediaExt(ext)) return { data: '', type: 'media' }
    if (ext === 'pdf') return { data: '', type: 'pdf' }
    /* 语义收敛：走到这里只可能是【真的不支持在线预览的扩展名】。
     * 文本格式的「体积超限」已在上面的 too-large 分支返回，不再落到这里。 */
    return { data: '', type: 'unknown' }
  }

  async createProject(project: string): Promise<boolean> {
    if (!this.isValidProjectName(project)) return false
    // 不允许与任何个人空间同名：顶层目录撞名会让权限判定无法区分二者
    if (this.isPersonalDir(project)) return false
    const dir = resolve(this.dataRoot, project)
    if (existsSync(dir)) return false
    await mkdir(dir, { recursive: true })
    return true
  }
  /** 项目软删除：整个项目文件夹移入回收站（可恢复）。 */
  async moveProjectToTrash(project: string, operator: string): Promise<boolean> {
    if (!this.isValidProjectName(project)) return false
    // 个人空间永不删除：即使管理员直接调接口，这里也硬拦
    if (this.isPersonalDir(project)) return false
    const target = resolve(this.dataRoot, project)
    if (!existsSync(target)) return false
    const id = `${Date.now()}_${randomBytes(4).toString('hex')}`
    const dest = join(this.trashDir, id + '_' + project)
    await mkdir(this.trashDir, { recursive: true })
    await rename(target, dest)
    const list = await this.loadTrash()
    list.push({
      id, project, relPath: '', name: project, isDir: true, isProject: true,
      deletedBy: operator, deletedAt: Date.now(),
    })
    await this.saveTrash(list)
    return true
  }
  /** 在项目内某子目录下新建文件夹 */
  async createFolder(project: string, subPath: string, name: string): Promise<boolean> {
    if (!this.isValidName(name)) return false
    const parent = this.resolveInProject(project, subPath)
    if (parent === null || !existsSync(parent)) return false
    const dir = join(parent, name)
    if (existsSync(dir)) return false
    await mkdir(dir, { recursive: true })
    return true
  }
  async renameEntry(project: string, relPath: string, newName: string): Promise<boolean> {
    const base = resolve(this.dataRoot, project)
    const target = resolve(base, relPath)
    if (target === base || !target.startsWith(base + sep) || !this.isValidName(newName)) return false
    const dest = join(dirname(target), newName)
    if (existsSync(dest)) return false
    await rename(target, dest)
    return true
  }
  /** 较宽松的文件/文件夹名校验（允许中文与常见符号，禁止路径分隔符）
   *
   *  A3 修复：禁止【首字符为点】的名字。
   *  为什么二选一里选「拒绝创建」而不是「取消隐藏」：
   *  ① 点开头条目是被有意隐藏的——core.listFiles 过滤 `name.startsWith('.')`，
   *     目的是不把 回收站 `data-files/.trash/`（内部实现）与历史遗留的
   *     `data-files/.agents/` 旧个人空间暴露到文件列表里；
   *  ② 而全文搜索是递归调用 listFiles 的 ⇒ 点开头目录的【整棵子树】都是搜索盲区；
   *  ③ 于是「新建 .合同」表现为：上传成功、列表看不见、搜索搜不到 —— 用户以为数据丢了。
   *  取消隐藏（另一种改法）会把 ① 里的内部目录一并放出来，风险更大；故选择在入口拒绝。
   *  影响面：只拦【新建/上传/改名】；已存在的历史点开头条目（.trash/.agents 及其内容）
   *  保持原状、不受影响，仍按既有的隐藏语义处理（不动任何既有数据）。 */
  isValidName(name: string): boolean {
    return name !== '' && name !== '.' && name !== '..'
      && !name.startsWith('.')
      && !name.includes('/') && !name.includes('\\') && !name.includes(':') && !name.includes('*')
      && !name.includes('?') && !name.includes('"') && !name.includes('<') && !name.includes('>') && !name.includes('|')
  }

  /* ---------- 回收站 ---------- */

  /** 载入回收站记录列表（D4：损坏时隔离存证并抛错，不静默当空）。 */
  async loadTrash(): Promise<TrashRecord[]> {
    return readJsonStore<TrashRecord[]>(this.ctx.storage, this.trashFile, [])
  }
  async saveTrash(list: TrashRecord[]): Promise<void> {
    await this.atomicWrite(this.trashFile, JSON.stringify(list, null, 2))
  }

  /** 软删除：把项目内条目移入 .trash，并记一条回收站记录。
   *  D6：整段「读列表 → 追加 → 写回」持锁，否则并发删除会互相覆盖记录。 */
  async moveToTrash(project: string, relPath: string, operator: string): Promise<boolean> {
    const base = resolve(this.dataRoot, project)
    const target = resolve(base, relPath)
    if (target === base || !target.startsWith(base + sep) || !existsSync(target)) return false
    return this.withFileLock(this.trashFile, async () => {
      // 实体移动与记录写入必须同锁内完成，保证两者一致
      if (!existsSync(target)) return false
      const s = await stat(target)
      const isDir = s.isDirectory()
      const name = basename(target)
      const id = `${Date.now()}_${randomBytes(4).toString('hex')}`
      const dest = join(this.trashDir, id + '_' + name)
      /* D4：先读记录再动实体。loadTrash 现在会在 trash.json 损坏时抛错 ——
       * 若把 rename 放在它前面，抛错后会出现「文件已进 .trash、但回收站里查不到」
       * 的半截状态。先读后动，读失败就什么都没发生。 */
      const list = await this.loadTrash()
      await mkdir(this.trashDir, { recursive: true })
      await rename(target, dest)
      list.push({
        id, project, relPath, name, isDir,
        deletedBy: operator, deletedAt: Date.now(),
      })
      await this.saveTrash(list)
      return true
    })
  }

  /** 恢复：从回收站移回原位置。D6：整段读改写持锁。 */
  async restoreTrash(id: string): Promise<boolean> {
    return this.withFileLock(this.trashFile, async () => {
      const list = await this.loadTrash()
      const rec = list.find((r) => r.id === id)
      if (!rec) return false
      const src = join(this.trashDir, id + '_' + rec.name)
      if (!existsSync(src)) return false
      const dest = resolve(this.dataRoot, rec.project, rec.relPath)
      // 若原位置已有同名，恢复失败（避免覆盖）
      if (existsSync(dest)) return false
      if (rec.relPath !== '') {
        // 普通条目：确保项目目录与上级目录存在；整项目恢复时不能先建空目录（会挡住 rename）
        await mkdir(resolve(this.dataRoot, rec.project), { recursive: true })
        await mkdir(dirname(dest), { recursive: true })
      }
      await rename(src, dest)
      await this.saveTrash(list.filter((r) => r.id !== id))
      return true
    })
  }

  /**
   * 破坏性操作的目标守卫（GitHub issue #2 / REQ-5）：物理删除只允许发生在
   * `<库根>/.trash/` 之内。回收站记录来自磁盘 JSON，一旦库根被错配或记录被篡改，
   * 一个越界路径就会让「清空回收站」变成「删别人的文件」。
   */
  private isInsideTrash(p: string): boolean {
    const root = resolve(this.trashDir)
    const target = resolve(p)
    return target !== root && target.startsWith(root + sep)
  }

  /**
   * 权威库根一致性检查（GitHub issue #2 / REQ-5 第二条）。
   *
   * `isInsideTrash()` 只能证明「删的是回收站目录里的东西」，它证明不了
   * **这个回收站目录本身就在配置的库根下**。当 core 的 `dataRoot` 入参被传错
   * （自定义装配、插件复用、将来有人改 mount 参数），`this.trashDir` 会跟着
   * 变成另一个库的 `.trash` —— 此时包含判断依然成立，清理会毫无怨言地在
   * 错误的库上执行，这正是 issue #2 里「自动任务的删除是最危险的放大器」。
   *
   * 因此：以启动时解析出来的权威库根（`PRIVHUB_DATA_FILES`，由
   * `src/store-paths.mjs` 统一回写）为准，回收站目录必须落在它下面。
   * 未设置该变量时（旧启动方式 / 单测直连）退化为「相信 dataRoot 入参」，
   * 但这三种情况都会打日志，不静默。
   */
  private trashRootGuard(): { ok: boolean; reason: string } {
    const authoritative = (process.env.PRIVHUB_DATA_FILES || '').trim()
    if (!authoritative) return { ok: true, reason: '' } // 旧启动方式：没有权威根可比
    const root = resolve(authoritative)
    const trash = resolve(this.trashDir)
    if (trash === root || trash.startsWith(root + sep)) return { ok: true, reason: '' }
    return {
      ok: false,
      reason: '回收站目录不在配置的文件库根内，拒绝执行物理删除：'
        + trash + ' 不在 ' + root + ' 下。'
        + '（请检查 core 的 dataRoot 入参 / PRIVHUB_DATA_FILES 是否指对了库）',
    }
  }

  /** 回收站根与被配置的库根是否一致（供 /runtime/store-check 与运维自查）。 */
  trashRootStatus(): { dataFiles: string; trashDir: string; ok: boolean; reason: string } {
    const g = this.trashRootGuard()
    return { dataFiles: (process.env.PRIVHUB_DATA_FILES || '').trim(), trashDir: resolve(this.trashDir), ok: g.ok, reason: g.reason }
  }

  /** 彻底删除回收站中的一条（物理删除）。D6：整段读改写持锁。 */
  async purgeTrash(id: string): Promise<boolean> {
    const guard = this.trashRootGuard()
    if (!guard.ok) {
      console.error('[trash] ' + guard.reason)
      return false
    }
    return this.withFileLock(this.trashFile, async () => {
      const list = await this.loadTrash()
      const rec = list.find((r) => r.id === id)
      if (!rec) return false
      const src = join(this.trashDir, id + '_' + rec.name)
      if (existsSync(src)) {
        if (!this.isInsideTrash(src)) {
          console.error('[trash] 拒绝物理删除越界路径（不在回收站根内）：' + src)
          return false
        }
        const s = await stat(src)
        // D14：fs.rmdir(recursive) 已弃用（DEP0147），改用 fs.rm
        if (s.isDirectory()) await rm(src, { recursive: true, force: true })
        else await unlink(src)
      }
      await this.saveTrash(list.filter((r) => r.id !== id))
      return true
    })
  }

  /** 清理超过 30 天的回收站条目（物理删除）。D6：整段读改写持锁。 */
  async purgeExpiredTrash(ttlMs: number): Promise<number> {
    const guard = this.trashRootGuard()
    if (!guard.ok) {
      /* 定时清理最危险：没人盯着，根错配时会在错误的库上静默删文件。
       * 这里直接一条都不删（返回 0），并留下显式日志。 */
      console.error('[trash] 定时清理已中止：' + guard.reason)
      return 0
    }
    return this.withFileLock(this.trashFile, async () => {
      const list = await this.loadTrash()
      const now = Date.now()
      const expired = list.filter((r) => now - r.deletedAt > ttlMs)
      for (const rec of expired) {
        const src = join(this.trashDir, rec.id + '_' + rec.name)
        if (existsSync(src)) {
          if (!this.isInsideTrash(src)) {
            console.error('[trash] 跳过越界路径（不在回收站根内）：' + src)
            continue
          }
          try {
            const s = await stat(src)
            // D14：同上，弃用 fs.rmdir(recursive)
            if (s.isDirectory()) await rm(src, { recursive: true, force: true })
            else await unlink(src)
          } catch { /* 忽略单条失败 */ }
        }
      }
      if (expired.length > 0) {
        await this.saveTrash(list.filter((r) => now - r.deletedAt <= ttlMs))
      }
      return expired.length
    })
  }
}

/* ============ 插件挂载 ============ */

export function apply(ctx: Context, config: Config): void {
  const store = new PrivHubStore(ctx, config)

  /* O2：健康检查（免登录）。只暴露「是否可用」所需的最小信息，
   * 不泄露路径、账号数、插件清单等敏感内容。 */
  const started = Date.now()
  void (async () => {
    /* JT-09：版本号有两个来源。先看代码根（蓝绿部署下每个 release 自带 package.json），
     * 取不到再回退到【本模块所在的应用目录】—— 测试/自定义 PRIVHUB_ROOT 的场景下
     * 代码根通常没有 package.json，以前这里只剩 'unknown'，界面就没法报版本。 */
    const readVer = async (p: string): Promise<string | null> => {
      try {
        const raw = await readFile(p, 'utf8')
        return (JSON.parse(raw) as { version?: string }).version ?? null
      } catch { return null }
    }
    appVersion = (await readVer(join(codeRootDir, 'package.json')))
      ?? (await readVer(join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'package.json')))
      ?? 'unknown'
  })()
  store.route('/privhub/api/health', async (_req, res) => {
    json(res, 200, {
      ok: true,
      service: 'privhub',
      version: appVersion,
      /* 蓝绿控制层靠 pid 收养/优雅停止已有槽进程（Windows 上信号不可用）。 */
      pid: process.pid,
      slot: process.env.PRIVHUB_SLOT ?? null,
      frozen: store.frozen,
      writesInFlight: store.writesInFlight,
      standby: store.standby,
      /* 控制层据此判断该 release 是否支持「先预热、再冻结」的安全切换。
       * 旧 release 没有这些能力，控制层会自动回落到「先冻结、再启动」。 */
      capabilities: ['freeze', 'reload-state', 'standby', 'activate', 'session-check', 'store-check'],
      uptimeSeconds: Math.floor((Date.now() - started) / 1000),
      /* JT-19：健康检查是匿名可达、且外部集成方最先 curl 的端点——
       * 在这里给一行智能体接入指路，直接解决「拿到密钥却不知道请求头与前缀」的
       * 发现困境（前缀与头字段本就不是秘密，README 公开写着）。
       * 只加一个只读字符串字段，不暴露任何数据。 */
      agent: { header: 'X-Agent-Key', base: '/privhub/api/agent/v1/', selfCheck: '/privhub/api/agent/v1/me' },
    })
  }, 'health')

  /* ---- 版本查询（直连 Node 的开发模式） ----
   * 通过 nginx 部署时这个路径会被 nginx 的 /privhub/_version 反代到常驻控制层，
   * 永远到不了这里；只有 `npm run dev` 直连 3180 时由 Node 应答。
   * 返回 managed:false，前端据此不建立 SSE（没有控制层可听）。 */
  store.route('/privhub/_version', async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      json(res, 405, { ok: false, error: 'method not allowed' })
      return
    }
    json(res, 200, {
      ok: true,
      version: appVersion,
      switchedAt: null,
      ready: true,
      managed: false,
    })
  }, 'version')

  /* ---- 蓝绿热更新的运行时控制端点（仅回环 + PRIVHUB_CONTROL_TOKEN） ----
   *
   * 控制层（runtime/control.mjs）在切流量前调用 freeze，等旧槽在途写排空后再让
   * 新槽接管。端点本身不受冻结拦截（见 CONTROL_ROUTES），否则冻结后无法解冻。 */
  store.route('/privhub/api/runtime/state', async (req, res) => {
    if (!store.controlAllowed(req, res)) return
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      json(res, 405, { ok: false, error: 'method not allowed' })
      return
    }
    json(res, 200, store.runtimeState())
  }, 'runtime-state')

  /* 存储自检（仅控制层）：切流量前对新槽跑一遍，失败则不切换、旧槽继续服务。
   * 端点本身也在 CONTROL_ROUTES 中，冻结期间仍可调用。 */
  store.route('/privhub/api/runtime/store-check', async (req, res) => {
    if (!store.controlAllowed(req, res)) return
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      json(res, 405, { ok: false, error: 'method not allowed' })
      return
    }
    const check = await store.storeCheck()
    json(res, check.ok ? 200 : 500, { ok: check.ok, error: check.error, check })
  }, 'runtime-store-check')

  store.route('/privhub/api/runtime/freeze', async (req, res) => {
    if (!store.controlAllowed(req, res)) return
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    const body = await readJsonBody<{ timeoutMs?: unknown }>(req, res)
    if (body === null) return
    const raw = Number(body?.timeoutMs)
    const timeoutMs = Number.isFinite(raw) && raw >= 0 ? Math.min(raw, 60000) : 15000
    store.frozen = true
    const drained = await store.waitForWrites(timeoutMs)
    json(res, 200, {
      ...store.runtimeState(),
      drained,
      timeoutMs,
    })
  }, 'runtime-freeze')

  store.route('/privhub/api/runtime/unfreeze', async (req, res) => {
    if (!store.controlAllowed(req, res)) return
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    store.frozen = false
    json(res, 200, store.runtimeState())
  }, 'runtime-unfreeze')

  /* 优雅停机：控制层切完流量后让旧槽退出。
   *
   * Windows 上 `child.kill('SIGTERM')` 走 TerminateProcess，子进程里的 SIGTERM 处理器
   * 根本不会执行，在途读请求（大文件预览/下载）会被直接掐断。所以由控制层调这个
   * 端点，先关监听（Node 19+ 会自动断开空闲 keep-alive，等在途连接自然结束），
   * 再退出；控制层另有超时兜底强杀。 */
  store.route('/privhub/api/runtime/shutdown', async (req, res) => {
    if (!store.controlAllowed(req, res)) return
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    json(res, 200, { ok: true, shuttingDown: true, pid: process.pid })
    setTimeout(() => {
      const force = setTimeout(() => process.exit(0), 15000)
      if (typeof force.unref === 'function') force.unref()
      void ctx.webServer.close().then(() => process.exit(0), () => process.exit(0))
    }, 30)
  }, 'runtime-shutdown')

  /* ---- nginx 静态插件的鉴权子请求 ----
   *
   * 插件前端代码即 API 全貌：未登录者不应靠猜地址枚举走。nginx 现在负责
   * `/privhub-plugins/` 的静态服务，但 nginx 只能看到 Cookie 是否存在，无法判定
   * 会话是否有效；因此由它发 auth_request 到这里，用与业务接口完全相同的会话校验。
   * 路径不进入冻结逻辑（GET），也只需 204/401 两种结果。 */
  store.route('/privhub/api/session/check', async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      json(res, 405, { ok: false, error: 'method not allowed' })
      return
    }
    if (!store.me(tokenOf(req))) {
      json(res, 401, { ok: false, error: '未登录' })
      return
    }
    res.writeHead(204, {
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    })
    res.end()
  }, 'session-check')

  /* D8：定时清理过期会话。原实现仅在「同一 token 再次被使用」时才删除，
   * 实测会话表累积到 3121 条、其中 93% 已过期（且每次续期都全量重写该文件）。 */
  const sessionSweep = setInterval(() => {
    /* 待命槽不写盘：切流前控制层会 reload，旧槽的会话写入不会丢。 */
    if (store.standby) return
    const now = Date.now()
    let removed = 0
    for (const [token, entry] of store.sessions) {
      if (entry.expiresAt <= now) { store.sessions.delete(token); removed++ }
    }
    if (removed > 0) void store.saveSessions().catch(() => { /* 静默：不影响主流程 */ })
  }, 30 * 60 * 1000)
  if (typeof sessionSweep.unref === 'function') sessionSweep.unref()
  ctx.effect(() => () => clearInterval(sessionSweep))

  // D4：初始化必须可等待——main.ts 在 listen 之前 await ctx.privhub.ready。
  // 此前是 fire-and-forget，服务可能在账号/会话尚未载入时就开始接受请求，
  // 表现为「刚启动时登录偶发 用户名或密码错误」（实际是用户表还是空的）。
  store.ready = (async () => {
    await store.loadUsers()
    await store.loadSessions()
  })()
  // 避免 ready 在无人 await 时成为 unhandled rejection（main.ts 会 await 它）
  store.ready.catch(() => { /* 由 main.ts 统一处理 */ })
}
