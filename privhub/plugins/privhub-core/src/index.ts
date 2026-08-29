/**
 * 私域枢纽核心插件（privhub-core）
 *
 * 唯一持有共享状态的插件：封装账号/会话/回收站持久化、data-files 文件根
 * 与权限判定，以 cordis Service 形式挂到 `ctx.privhub` 供各 privhub-* 业务
 * 插件（auth/files/trash/admin）消费。本插件自身不暴露任何 HTTP 接口——
 * 接口按域归属各业务插件，路由注册通过 svc.route() 复用底座 webServer。
 *
 * 数据模型：
 *   - users.json       账号列表（密码 scrypt 盐哈希、角色、负责的项目）
 *   - data-files/      文件存储根，顶层文件夹即「项目」
 *   - sessions.json    持久会话（token -> username）
 *   - trash.json + data-files/.trash/  回收站记录与实体文件
 *
 * @module privhub-core
 */

import { readFile, writeFile, mkdir, readdir, stat, rename, unlink, rmdir, realpath } from 'node:fs/promises'
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

export function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((ok, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => ok(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
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

export function tokenOf(req: IncomingMessage): string | undefined {
  const h = req.headers.authorization
  if (!h) return undefined
  const m = /^Bearer\s+(.+)$/i.exec(h)
  return m?.[1]
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
  private readonly dataDir: string
  private readonly sessionsFile: string
  private readonly trashFile: string
  readonly trashDir: string
  /** 会话 TTL 毫秒（auth 登录写入、me 滑动续期共用） */
  readonly sessionTtlMs: number

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
    const parsed = JSON.parse(raw) as { users: UserRecord[] }
    this.users = new Map()
    for (const u of parsed.users) {
      this.users.set(u.username, { ...u, projects: u.projects ?? [] })
    }
  }

  async saveUsers(): Promise<void> {
    await this.atomicWrite(this.usersFile, JSON.stringify({ users: [...this.users.values()] }, null, 2))
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
    return { username: u.username, displayName: u.displayName, role: u.role, projects: [...u.projects] }
  }

  async allProjects(): Promise<string[]> {
    if (!existsSync(this.dataRoot)) return []
    const ents = await readdir(this.dataRoot, { withFileTypes: true })
    return ents.filter((e) => e.isDirectory() && !e.name.startsWith('.')).map((e) => e.name).sort()
  }

  async visibleProjects(user: UserRecord): Promise<string[]> {
    if (user.role === 'admin') return this.allProjects()
    return user.projects.filter((p) => this.isValidProjectName(p))
  }

  isValidProjectName(name: string): boolean {
    return name !== '' && !name.includes('/') && !name.includes('\\') && !name.includes('..') && name !== '.'
  }

  canAccess(user: UserRecord, project: string): boolean {
    if (user.role === 'admin') return this.isValidProjectName(project)
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
   *  字符串校验通过后仍可能经 junction 指向数据根之外（如 data/），必须二次校验。 */
  async resolveReal(project: string, relPath: string): Promise<string | null> {
    const target = this.resolveInProject(project, relPath)
    if (target === null) return null
    try {
      const base = resolve(this.dataRoot, project)
      const [rb, rt] = await Promise.all([realpath(base), realpath(target)])
      if (rt !== rb && !rt.startsWith(rb + sep)) return null
      return target
    } catch { return null }
  }

  /** A14/A22：并行 stat（Promise.all，千级目录不串行卡顿）；mtime 返回完整 ISO 时间戳。 */
  async listFiles(project: string, subPath = ''): Promise<{ name: string; isDir: boolean; size: number; sizeText: string; mtime: string; type: string }[]> {
    const dir = this.resolveInProject(project, subPath)
    if (dir === null || !existsSync(dir)) return []
    const ents = await readdir(dir, { withFileTypes: true })
    const stats = await Promise.all(ents.map(async (e) => {
      if (e.name.startsWith('.')) return null
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
      return { data: await this.ctx.storage.readText(target), type: 'text' }
    }
    const imgExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico']
    if (imgExts.includes(ext)) return { data: '', type: 'image' }
    if (ext === 'pdf') return { data: '', type: 'pdf' }
    return { data: '', type: 'unknown' }
  }

  async createProject(project: string): Promise<boolean> {
    if (!this.isValidProjectName(project)) return false
    const dir = resolve(this.dataRoot, project)
    if (existsSync(dir)) return false
    await mkdir(dir, { recursive: true })
    return true
  }
  /** 项目软删除：整个项目文件夹移入回收站（可恢复）。 */
  async moveProjectToTrash(project: string, operator: string): Promise<boolean> {
    if (!this.isValidProjectName(project)) return false
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

  /** 软删除：把项目内条目移入 .trash，并记一条回收站记录。 */
  async moveToTrash(project: string, relPath: string, operator: string): Promise<boolean> {
    const base = resolve(this.dataRoot, project)
    const target = resolve(base, relPath)
    if (target === base || !target.startsWith(base + sep) || !existsSync(target)) return false
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
  }

  /** 恢复：从回收站移回原位置。 */
  async restoreTrash(id: string): Promise<boolean> {
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
  }

  /** 彻底删除回收站中的一条（物理删除）。 */
  async purgeTrash(id: string): Promise<boolean> {
    const list = await this.loadTrash()
    const rec = list.find((r) => r.id === id)
    if (!rec) return false
    const src = join(this.trashDir, id + '_' + rec.name)
    if (existsSync(src)) {
      const s = await stat(src)
      if (s.isDirectory()) await rmdir(src, { recursive: true })
      else await unlink(src)
    }
    await this.saveTrash(list.filter((r) => r.id !== id))
    return true
  }

  /** 清理超过 30 天的回收站条目（物理删除）。 */
  async purgeExpiredTrash(ttlMs: number): Promise<number> {
    const list = await this.loadTrash()
    const now = Date.now()
    const expired = list.filter((r) => now - r.deletedAt > ttlMs)
    for (const rec of expired) {
      const src = join(this.trashDir, rec.id + '_' + rec.name)
      if (existsSync(src)) {
        try {
          const s = await stat(src)
          if (s.isDirectory()) await rmdir(src, { recursive: true })
          else await unlink(src)
        } catch { /* 忽略单条失败 */ }
      }
    }
    if (expired.length > 0) {
      await this.saveTrash(list.filter((r) => now - r.deletedAt <= ttlMs))
    }
    return expired.length
  }
}

/* ============ 插件挂载 ============ */

export function apply(ctx: Context, config: Config): void {
  const store = new PrivHubStore(ctx, config)
  void (async () => {
    await store.loadUsers()
    await store.loadSessions()
  })().catch((e) => ctx.logger?.warn('privhub-core 初始化失败: ' + String(e)))
}
