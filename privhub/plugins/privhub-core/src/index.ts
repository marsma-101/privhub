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
import { Context, Service } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { IncomingMessage, ServerResponse } from 'node:http'

export const name = 'privhub-core'
export const inject = ['webServer', 'storage']

export type Role = 'admin' | 'user'

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

/** 单文件上传大小上限（2GB，受 Node Buffer 上限约束）。 */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024

export interface Config {
  usersFile: string
  dataRoot: string
  /** 会话有效天数（A8：会话 TTL + 滑动续期），默认 7 */
  sessionTtlDays: number
}

export const Config: z<Config> = z.object({
  usersFile: z.string().default(''),
  dataRoot: z.string().default(''),
  sessionTtlDays: z.number().default(7),
})

/** 项目根：由启动脚本注入 PRIVHUB_ROOT；缺省回退 cwd，兼容旧启动方式。 */
const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()

function resolvePath(value: string, fallback: string): string {
  const t = value.trim()
  return t === '' ? join(rootDir, fallback) : resolve(t)
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

function fmtSize(bytes: number): string {
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
  private readonly sessionsFile: string
  private readonly trashFile: string
  readonly trashDir: string
  /** 会话 TTL 毫秒（auth 登录写入、me 滑动续期共用） */
  readonly sessionTtlMs: number
  /** D4：初始化完成信号——由 apply 赋值，main.ts 在 listen 前 await，避免「空用户表」竞态。 */
  ready: Promise<void> = Promise.resolve()

  constructor(ctx: Context, private config: Config) {
    super(ctx, 'privhub')
    this.usersFile = resolvePath(config.usersFile, join('data', 'users.json'))
    this.dataRoot = resolvePath(config.dataRoot, 'data-files')
    this.dataDir = join(rootDir, 'data')
    this.sessionsFile = join(this.dataDir, 'sessions.json')
    this.trashFile = join(this.dataDir, 'trash.json')
    this.trashDir = join(this.dataRoot, '.trash')
    this.sessionTtlMs = (config.sessionTtlDays > 0 ? config.sessionTtlDays : 7) * 24 * 3600 * 1000
  }

  /** 注册一条 exact 路由（业务插件共用入口，可随插件停用回收）。 */
  route(path: string, handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>, label: string): void {
    this.ctx.effect(() => this.ctx.webServer.register({ kind: 'exact', path, handler }), label)
  }

  /** 鉴权辅助：从请求解析登录用户；未登录时直接回 401 并返回 null。 */
  requireUser(req: IncomingMessage, res: ServerResponse): UserRecord | null {
    const u = this.me(tokenOf(req))
    if (!u) { json(res, 401, { ok: false, error: '未登录' }); return null }
    return u
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

  /** 读取文件内容用于预览（仅允许数据根内部） */
  async readFileForPreview(project: string, relPath: string): Promise<{ data: string; type: string } | null> {
    const target = this.resolveInProject(project, relPath)
    if (target === null || !existsSync(target)) return null
    const s = await stat(target)
    if (s.isDirectory()) return null
    const ext = extname(target).slice(1).toLowerCase()
    const textExts = ['txt', 'md', 'json', 'js', 'ts', 'html', 'htm', 'css', 'xml', 'yaml', 'yml', 'csv', 'log', 'py', 'java', 'c', 'cpp', 'sh', 'bat', 'ini', 'toml', 'sql']
    const maxTextBytes = 512 * 1024
    if (textExts.includes(ext) && s.size <= maxTextBytes + 20) {
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
    const imgExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico']
    if (imgExts.includes(ext)) return { data: '', type: 'image' }
    if (ext === 'pdf') return { data: '', type: 'pdf' }
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
  /** 较宽松的文件/文件夹名校验（允许中文与常见符号，禁止路径分隔符） */
  isValidName(name: string): boolean {
    return name !== '' && name !== '.' && name !== '..'
      && !name.includes('/') && !name.includes('\\') && !name.includes(':') && !name.includes('*')
      && !name.includes('?') && !name.includes('"') && !name.includes('<') && !name.includes('>') && !name.includes('|')
  }

  /* ---------- 回收站 ---------- */

  /** 载入回收站记录列表。 */
  async loadTrash(): Promise<TrashRecord[]> {
    if (!existsSync(this.trashFile)) return []
    try {
      const raw = await this.ctx.storage.readText(this.trashFile)
      return JSON.parse(raw) as TrashRecord[]
    } catch { return [] }
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
      await mkdir(this.trashDir, { recursive: true })
      await rename(target, dest)
      const list = await this.loadTrash()
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

  /** 彻底删除回收站中的一条（物理删除）。D6：整段读改写持锁。 */
  async purgeTrash(id: string): Promise<boolean> {
    return this.withFileLock(this.trashFile, async () => {
      const list = await this.loadTrash()
      const rec = list.find((r) => r.id === id)
      if (!rec) return false
      const src = join(this.trashDir, id + '_' + rec.name)
      if (existsSync(src)) {
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
    return this.withFileLock(this.trashFile, async () => {
      const list = await this.loadTrash()
      const now = Date.now()
      const expired = list.filter((r) => now - r.deletedAt > ttlMs)
      for (const rec of expired) {
        const src = join(this.trashDir, rec.id + '_' + rec.name)
        if (existsSync(src)) {
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
  let version = 'unknown'
  void (async () => {
    try {
      const raw = await readFile(join(rootDir, 'package.json'), 'utf8')
      version = (JSON.parse(raw) as { version?: string }).version ?? 'unknown'
    } catch { /* 取不到就用 unknown */ }
  })()
  store.route('/privhub/api/health', async (_req, res) => {
    json(res, 200, {
      ok: true,
      service: 'privhub',
      version,
      uptimeSeconds: Math.floor((Date.now() - started) / 1000),
    })
  }, 'health')

  /* D8：定时清理过期会话。原实现仅在「同一 token 再次被使用」时才删除，
   * 实测会话表累积到 3121 条、其中 93% 已过期（且每次续期都全量重写该文件）。 */
  const sessionSweep = setInterval(() => {
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
