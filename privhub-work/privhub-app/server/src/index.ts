/**
 * 私域枢纽后端接口插件（privhub-server）
 *
 * 复用底座（开源引擎）的 `webServer` 服务，注册文件管理系统的全部 HTTP 接口。
 *
 * 数据模型：
 *   - users.json       账号列表（密码 scrypt 盐哈希、角色、负责的项目）
 *   - data-files/      文件存储根，顶层文件夹即「项目」
 *   - sessions.json    持久会话（token -> username）
 *
 * 权限规则（最终呈现基准）：
 *   - 管理员：所有项目 增删改查 全权限 + 能新建项目 + 用户管理。
 *   - 普通用户：只能看到/操作「自己有权限的项目(projects 列表)」内的文件。
 *
 * @module privhub-server
 */

import { readFile, writeFile, mkdir, readdir, stat, rename, unlink, rmdir } from 'node:fs/promises'
import { join, resolve, extname, sep, dirname, basename } from 'node:path'
import { existsSync } from 'node:fs'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { IncomingMessage, ServerResponse } from 'node:http'

export const name = 'privhub-server'
export const inject = ['webServer']

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
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024

export interface Config {
  usersFile: string
  dataRoot: string
}

export const Config: z<Config> = z.object({
  usersFile: z.string().default(''),
  dataRoot: z.string().default(''),
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

function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((ok, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => ok(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/** 读取原始字节请求体（文件上传用），超限则拒绝并断开。 */
function readBodyRaw(req: IncomingMessage, max: number): Promise<Buffer> {
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

/* ============ 密码：scrypt 盐哈希（Node 内置，自包含） ============ */

function hashPassword(raw: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(raw, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(raw: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const target = Buffer.from(hash, 'hex')
  const attempt = scryptSync(raw, salt, 64)
  return target.length === attempt.length && timingSafeEqual(target, attempt)
}

/* ============ 服务主体 ============ */

export class PrivHubService {
  readonly usersFile: string
  readonly dataRoot: string
  users: Map<string, UserRecord> = new Map()
  sessions: Map<string, string> = new Map() // token -> username
  loginFails: Map<string, { count: number; until: number }> = new Map()
  private readonly dataDir: string
  private readonly sessionsFile: string
  private readonly trashFile: string
  readonly trashDir: string

  constructor(config: Config) {
    this.usersFile = resolvePath(config.usersFile, join('privhub-app', 'data', 'users.json'))
    this.dataRoot = resolvePath(config.dataRoot, 'data-files')
    this.dataDir = join(rootDir, 'privhub-app', 'data')
    this.sessionsFile = join(this.dataDir, 'sessions.json')
    this.trashFile = join(this.dataDir, 'trash.json')
    this.trashDir = join(this.dataRoot, '.trash')
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
      await writeFile(this.usersFile, JSON.stringify(initial, null, 2), 'utf8')
    }
    const raw = await readFile(this.usersFile, 'utf8')
    const parsed = JSON.parse(raw) as { users: UserRecord[] }
    this.users = new Map()
    for (const u of parsed.users) {
      this.users.set(u.username, { ...u, projects: u.projects ?? [] })
    }
  }

  async saveUsers(): Promise<void> {
    await writeFile(this.usersFile, JSON.stringify({ users: [...this.users.values()] }, null, 2), 'utf8')
  }

  async loadSessions(): Promise<void> {
    if (existsSync(this.sessionsFile)) {
      try {
        const raw = await readFile(this.sessionsFile, 'utf8')
        this.sessions = new Map(Object.entries(JSON.parse(raw) as Record<string, string>))
      } catch { /* 损坏则忽略 */ }
    }
  }
  async saveSessions(): Promise<void> {
    await writeFile(this.sessionsFile, JSON.stringify(Object.fromEntries(this.sessions), null, 2), 'utf8')
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

  me(token: string | undefined): UserRecord | null {
    if (!token) return null
    const username = this.sessions.get(token)
    if (!username) return null
    return this.users.get(username) ?? null
  }

  /* ---------- 业务方法 ---------- */

  /** 安全解析项目内相对路径为绝对路径；越界返回 null。 */
  resolveInProject(project: string, relPath: string): string | null {
    const base = resolve(this.dataRoot, project)
    const target = relPath === '' || relPath === '.' ? base : resolve(base, relPath)
    if (target !== base && !target.startsWith(base + sep)) return null
    return target
  }

  async listFiles(project: string, subPath = ''): Promise<{ name: string; isDir: boolean; size: number; sizeText: string; mtime: string; type: string }[]> {
    const dir = this.resolveInProject(project, subPath)
    if (dir === null || !existsSync(dir)) return []
    const ents = await readdir(dir, { withFileTypes: true })
    const out: { name: string; isDir: boolean; size: number; sizeText: string; mtime: string; type: string }[] = []
    for (const e of ents) {
      if (e.name.startsWith('.')) continue
      const full = join(dir, e.name)
      let size = 0
      let mtime = ''
      try { const s = await stat(full); size = s.isDirectory() ? 0 : s.size; mtime = s.mtime.toISOString().slice(0, 10) } catch { /* 忽略 */ }
      out.push({
        name: e.name,
        isDir: e.isDirectory(),
        size,
        sizeText: e.isDirectory() ? '—' : fmtSize(size),
        mtime,
        type: e.isDirectory() ? '文件夹' : (extname(e.name).slice(1).toUpperCase() || '文件'),
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
    if (textExts.includes(ext) && s.size <= maxTextBytes) {
      return { data: await readFile(target, 'utf8'), type: 'text' }
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
  async deleteProject(project: string): Promise<boolean> {
    const dir = resolve(this.dataRoot, project)
    if (!existsSync(dir)) return false
    await rmdir(dir, { recursive: true })
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
  /* ---------- 回收站 ---------- */

  /** 载入回收站记录列表。 */
  async loadTrash(): Promise<TrashRecord[]> {
    if (!existsSync(this.trashFile)) return []
    try {
      const raw = await readFile(this.trashFile, 'utf8')
      return JSON.parse(raw) as TrashRecord[]
    } catch { return [] }
  }
  async saveTrash(list: TrashRecord[]): Promise<void> {
    await writeFile(this.trashFile, JSON.stringify(list, null, 2), 'utf8')
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
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

function tokenOf(req: IncomingMessage): string | undefined {
  const h = req.headers.authorization
  if (!h) return undefined
  const m = /^Bearer\s+(.+)$/i.exec(h)
  return m?.[1]
}

/* ============ 插件挂载 ============ */

function route(ctx: Context, path: string, handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>, label: string): void {
  ctx.effect(() => ctx.webServer.register({ kind: 'exact', path, handler }), label)
}

export function apply(ctx: Context, config: Config): void {
  const svc = new PrivHubService(config)
  void (async () => {
    await svc.loadUsers()
    await svc.loadSessions()
  })().catch((e) => ctx.logger?.warn('privhub-server 初始化失败: ' + String(e)))

  const requireUser = (req: IncomingMessage, res: ServerResponse): UserRecord | null => {
    const u = svc.me(tokenOf(req))
    if (!u) { json(res, 401, { ok: false, error: '未登录' }); return null }
    return u
  }

  /* 登录 */
  route(ctx, '/privhub/api/login', async (req, res) => {
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const username = String(body.username ?? '')
    const password = String(body.password ?? '')
    const now = Date.now()
    const fail = svc.loginFails.get(username)
    if (fail && fail.until > now) return json(res, 429, { ok: false, error: '尝试过于频繁，请稍后再试' })
    const rec = svc.users.get(username)
    if (!rec || !verifyPassword(password, rec.password)) {
      const f = svc.loginFails.get(username)
      const count = (f?.count ?? 0) + 1
      svc.loginFails.set(username, { count, until: now + (count >= 5 ? 60000 : 0) })
      return json(res, 401, { ok: false, error: '用户名或密码错误' })
    }
    svc.loginFails.delete(username)
    const token = randomBytes(24).toString('hex')
    svc.sessions.set(token, username)
    await svc.saveSessions()
    json(res, 200, { ok: true, token, user: svc.userView(rec) })
  }, 'login')

  /* 注册 → 直接建为普通用户 */
  route(ctx, '/privhub/api/register', async (req, res) => {
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const username = String(body.username ?? '').trim()
    const password = String(body.password ?? '')
    const displayName = String(body.displayName ?? '').trim() || username
    if (username === '' || password.length < 6) return json(res, 400, { ok: false, error: '用户名不能为空，密码至少6位' })
    if (!/^[\w.-]{2,32}$/.test(username)) return json(res, 400, { ok: false, error: '用户名需 2~32 位字母数字下划线' })
    if (svc.users.has(username)) return json(res, 409, { ok: false, error: '用户名已存在' })
    svc.users.set(username, { username, password: hashPassword(password), displayName, role: 'user', projects: ['公共'] })
    await svc.saveUsers()
    json(res, 200, { ok: true })
  }, 'register')

  /* 当前用户 */
  route(ctx, '/privhub/api/me', async (req, res) => {
    const u = requireUser(req, res)
    if (!u) return
    const projects = await svc.visibleProjects(u)
    json(res, 200, { ok: true, user: { username: u.username, displayName: u.displayName, role: u.role, projects } })
  }, 'me')

  /* 项目列表（当前用户可见） */
  route(ctx, '/privhub/api/projects', async (req, res) => {
    const u = requireUser(req, res)
    if (!u) return
    json(res, 200, { ok: true, projects: await svc.visibleProjects(u) })
  }, 'projects')

  /* 列某项目内文件（支持子路径 path） */
  route(ctx, '/privhub/api/list', async (req, res) => {
    const u = requireUser(req, res)
    if (!u) return
    try {
      const url = new URL(req.url ?? '/', 'http://x')
      const project = url.searchParams.get('project') ?? ''
      const subPath = url.searchParams.get('path') ?? ''
      if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限访问该项目' })
      json(res, 200, { ok: true, entries: await svc.listFiles(project, subPath) })
    } catch (e) { json(res, 400, { ok: false, error: e instanceof Error ? e.message : '读取失败' }) }
  }, 'list')

  /* 预览 */
  route(ctx, '/privhub/api/preview', async (req, res) => {
    const u = requireUser(req, res)
    if (!u) return
    const url = new URL(req.url ?? '/', 'http://x')
    const project = url.searchParams.get('project') ?? ''
    const path = url.searchParams.get('path') ?? ''
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    const r = await svc.readFileForPreview(project, path)
    if (!r) return json(res, 404, { ok: false, error: '无法预览' })
    json(res, 200, { ok: true, type: r.type, data: r.data })
  }, 'preview')

  /* 预览原始字节流（供 img/iframe 直接加载图片与 PDF） */
  route(ctx, '/privhub/api/preview-raw', async (req, res) => {
    const u = requireUser(req, res)
    if (!u) return
    const url = new URL(req.url ?? '/', 'http://x')
    const project = url.searchParams.get('project') ?? ''
    const path = url.searchParams.get('path') ?? ''
    if (!svc.canAccess(u, project)) { res.writeHead(403); res.end('forbidden'); return }
    const base = resolve(svc.dataRoot, project)
    const target = resolve(base, path)
    if (target === base || !target.startsWith(base + sep) || !existsSync(target)) { res.writeHead(404); res.end('not found'); return }
    const s = await stat(target)
    if (s.isDirectory()) { res.writeHead(404); res.end('not found'); return }
    const ext = extname(target).slice(1).toLowerCase()
    const mime: Record<string, string> = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
      svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon', pdf: 'application/pdf',
    }
    const body = await readFile(target)
    res.writeHead(200, { 'content-type': mime[ext] ?? 'application/octet-stream', 'content-length': body.length })
    res.end(body)
  }, 'preview-raw')

  /* 上传文件（raw body：project/path/name 走查询参数，文件内容作为请求体） */
  route(ctx, '/privhub/api/upload', async (req, res) => {
    const u = requireUser(req, res)
    if (!u) return
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    try {
      const url = new URL(req.url ?? '/', 'http://x')
      const project = url.searchParams.get('project') ?? ''
      const subPath = url.searchParams.get('path') ?? ''
      const name = url.searchParams.get('name') ?? ''
      if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限上传到该项目' })
      if (!svc.isValidName(name)) return json(res, 400, { ok: false, error: '文件名无效' })
      const dir = svc.resolveInProject(project, subPath)
      if (dir === null || !existsSync(dir)) return json(res, 400, { ok: false, error: '目标目录不存在' })
      const body = await readBodyRaw(req, MAX_UPLOAD_BYTES)
      await writeFile(join(dir, name), body)
      json(res, 200, { ok: true, size: body.length })
    } catch (e) { json(res, 400, { ok: false, error: e instanceof Error ? e.message : '上传失败' }) }
  }, 'upload')

  /* 新建项目（管理员） */
  route(ctx, '/privhub/api/project-create', async (req, res) => {
    const u = requireUser(req, res)
    if (!u) return
    if (u.role !== 'admin') return json(res, 403, { ok: false, error: '仅管理员可新建项目' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const ok = await svc.createProject(String(body.name ?? '').trim())
    json(res, ok ? 200 : 400, ok ? { ok: true } : { ok: false, error: '项目名无效或已存在' })
  }, 'project-create')

  /* 删除项目（管理员）——软删除，整个项目进回收站，可恢复 */
  route(ctx, '/privhub/api/project-delete', async (req, res) => {
    const u = requireUser(req, res)
    if (!u) return
    if (u.role !== 'admin') return json(res, 403, { ok: false, error: '仅管理员可删除项目' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const ok = await svc.moveProjectToTrash(String(body.name ?? ''), u.username)
    json(res, ok ? 200 : 400, ok ? { ok: true } : { ok: false, error: '移入回收站失败' })
  }, 'project-delete')

  /* 新建文件夹（支持在子路径 path 下创建） */
  route(ctx, '/privhub/api/mkdir', async (req, res) => {
    const u = requireUser(req, res)
    if (!u) return
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = String(body.project ?? '')
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    const subPath = String(body.path ?? '')
    const ok = await svc.createFolder(project, subPath, String(body.name ?? ''))
    json(res, ok ? 200 : 400, ok ? { ok: true } : { ok: false, error: '新建失败' })
  }, 'mkdir')

  /* 删除文件/文件夹（软删除，进回收站） */
  route(ctx, '/privhub/api/delete', async (req, res) => {
    const u = requireUser(req, res)
    if (!u) return
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = String(body.project ?? '')
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    const ok = await svc.moveToTrash(project, String(body.path ?? ''), u.username)
    json(res, ok ? 200 : 400, ok ? { ok: true } : { ok: false, error: '删除失败' })
  }, 'delete')

  /* 回收站列表 */
  route(ctx, '/privhub/api/trash-list', async (req, res) => {
    const u = requireUser(req, res)
    if (!u) return
    const list = await svc.loadTrash()
    // 普通用户只看自己删除的；管理员看全部
    const filtered = u.role === 'admin' ? list : list.filter((r) => r.deletedBy === u.username)
    json(res, 200, { ok: true, trash: filtered })
  }, 'trash-list')

  /* 恢复回收站条目 */
  route(ctx, '/privhub/api/trash-restore', async (req, res) => {
    const u = requireUser(req, res)
    if (!u) return
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const id = String(body.id ?? '')
    const ok = await svc.restoreTrash(id)
    json(res, ok ? 200 : 400, ok ? { ok: true } : { ok: false, error: '恢复失败（可能原位置已有同名文件）' })
  }, 'trash-restore')

  /* 彻底删除回收站条目 */
  route(ctx, '/privhub/api/trash-purge', async (req, res) => {
    const u = requireUser(req, res)
    if (!u) return
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const id = String(body.id ?? '')
    const ok = await svc.purgeTrash(id)
    json(res, ok ? 200 : 400, ok ? { ok: true } : { ok: false, error: '彻底删除失败' })
  }, 'trash-purge')

  /* 清空 30 天前的回收站（管理员手动触发；也会在启动时自动执行） */
  route(ctx, '/privhub/api/trash-clean', async (req, res) => {
    const u = requireUser(req, res)
    if (!u) return
    if (u.role !== 'admin') return json(res, 403, { ok: false, error: '仅管理员' })
    const n = await svc.purgeExpiredTrash(30 * 24 * 3600 * 1000)
    json(res, 200, { ok: true, purged: n })
  }, 'trash-clean')

  /* 重命名 */
  route(ctx, '/privhub/api/rename', async (req, res) => {
    const u = requireUser(req, res)
    if (!u) return
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = String(body.project ?? '')
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    const ok = await svc.renameEntry(project, String(body.path ?? ''), String(body.newName ?? ''))
    json(res, ok ? 200 : 400, ok ? { ok: true } : { ok: false, error: '重命名失败' })
  }, 'rename')

  /* 用户管理：列出所有用户（管理员） */
  route(ctx, '/privhub/api/admin/users', async (req, res) => {
    const u = requireUser(req, res)
    if (!u) return
    if (u.role !== 'admin') return json(res, 403, { ok: false, error: '仅管理员' })
    const users = [...svc.users.values()].map((x) => ({ username: x.username, displayName: x.displayName, role: x.role, projects: x.projects }))
    json(res, 200, { ok: true, users, allProjects: await svc.allProjects() })
  }, 'admin-users')

  /* 用户管理：更新角色/项目权限（管理员） */
  route(ctx, '/privhub/api/admin/user-update', async (req, res) => {
    const u = requireUser(req, res)
    if (!u) return
    if (u.role !== 'admin') return json(res, 403, { ok: false, error: '仅管理员' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const username = String(body.username ?? '')
    const rec = svc.users.get(username)
    if (!rec) return json(res, 404, { ok: false, error: '用户不存在' })
    if (body.role === 'admin' || body.role === 'user') rec.role = body.role
    if (Array.isArray(body.projects)) rec.projects = body.projects.filter((p: unknown) => typeof p === 'string')
    if (typeof body.displayName === 'string' && body.displayName.trim() !== '') rec.displayName = body.displayName.trim()
    await svc.saveUsers()
    json(res, 200, { ok: true })
  }, 'admin-user-update')

  /* 用户管理：删除用户（管理员） */
  route(ctx, '/privhub/api/admin/user-delete', async (req, res) => {
    const u = requireUser(req, res)
    if (!u) return
    if (u.role !== 'admin') return json(res, 403, { ok: false, error: '仅管理员' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const username = String(body.username ?? '')
    if (username === 'admin') return json(res, 400, { ok: false, error: '不能删除主管理员' })
    if (!svc.users.has(username)) return json(res, 404, { ok: false, error: '用户不存在' })
    svc.users.delete(username)
    await svc.saveUsers()
    json(res, 200, { ok: true })
  }, 'admin-user-delete')

  /* 用户管理：重置密码（管理员，防止用户忘记密码） */
  route(ctx, '/privhub/api/admin/user-reset-password', async (req, res) => {
    const u = requireUser(req, res)
    if (!u) return
    if (u.role !== 'admin') return json(res, 403, { ok: false, error: '仅管理员' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const username = String(body.username ?? '')
    const newPassword = String(body.newPassword ?? '')
    if (newPassword.length < 6) return json(res, 400, { ok: false, error: '新密码至少6位' })
    const rec = svc.users.get(username)
    if (!rec) return json(res, 404, { ok: false, error: '用户不存在' })
    rec.password = hashPassword(newPassword)
    // 重置后强制该用户所有会话失效（安全）
    for (const [token, uname] of svc.sessions) {
      if (uname === username) svc.sessions.delete(token)
    }
    await svc.saveUsers()
    await svc.saveSessions()
    json(res, 200, { ok: true })
  }, 'admin-user-reset-password')

  /* 退出登录 */
  route(ctx, '/privhub/api/logout', async (req, res) => {
    const t = tokenOf(req)
    if (t) { svc.sessions.delete(t); await svc.saveSessions() }
    json(res, 200, { ok: true })
  }, 'logout')
}
