/**
 * privhub-files-agent — Agent API 智能体接口网关（M1 网关核心 + M2 可靠治理）
 *
 * 企业级智能体接入（C22）：局域网内智能体经受控 API 读取用户权限内项目（只读），
 * 并在用户沙箱（= 该用户的个人空间 data-files/<真实姓名>/，按 key scope 分区）
 * 读写删改生成物；项目对智能体始终只读。
 *
 * M1 网关核心：
 *   - Key 治理：sha256 哈希存储、状态机（active/suspended/revoked/expired 惰性）、
 *     自然月周期（X-Key-Expires 预警）、IPv4 CIDR 白名单、mask 展示、明文仅一次
 *   - scope 矩阵：project / directory / all；项目只读 403 硬隔离；ACL view 逐请求
 *   - 沙箱（个人空间）分区 + resolveReal 防穿越 + 敏感扩展名豁免
 * M2 可靠与治理（逻辑在 m2.ts）：
 *   - 幂等写（X-Idempotency-Key 必填，重放/冲突）、If-Match/ETag 乐观并发
 *   - 写并发排队（8/100/30s）、per-path 锁、配额账本（1GB）、持久化限流、版本快照
 * 端点：schema/me/projects/list/read/versions/restore(versions)/write/fork/rename/delete
 *       + keys(admin)/my-keys(自助)/trash(回收站管理)
 *
 * @module privhub-files-agent
 */

import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { join, extname } from 'node:path'
import { stat, mkdir, rename, unlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { WriteGate, Idempotency, QuotaLedger, RateLimiter, PathLocks, versionSnapshot, startFlusher, restoreRateBuckets, fileEtag, sha256 as sha256m, M2Config, M2_DEFAULTS } from './m2'

export const name = 'privhub-files-agent'
export const inject = ['privhub', 'storage', 'audit', 'acl', 'eventBus']

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()
const KEYS_FILE = join(rootDir, 'data', 'agent-keys.json')

/* ============ 常量与限额 ============ */

const KEY_PREFIX = 'pha_'
const KEY_BYTES = 16
const SENSITIVE_EXTS = ['.key', '.pem', '.p12', '.pfx', '.crt', '.env', '.git-credentials', '.htpasswd']
const TEXT_EXT = new Set(['txt', 'md', 'json', 'js', 'ts', 'html', 'htm', 'css', 'xml', 'yaml', 'yml', 'csv', 'log', 'py', 'java', 'c', 'cpp', 'sh', 'bat', 'ini', 'toml', 'sql'])
const LIMITS = {
  readTextDefault: 1024 * 1024,
  readTextMax: 4 * 1024 * 1024,
  readBase64Max: 20 * 1024 * 1024,
  writeTextMax: 4 * 1024 * 1024,
  writeBinaryMax: 200 * 1024 * 1024,
  forkMax: 200 * 1024 * 1024,
  listLimit: 500,
  listDefault: 200,
}

/* ============ HTTP 工具 ============ */

interface Env { rid: string; req: IncomingMessage; res: ServerResponse }

function json(res: ServerResponse, status: number, body: unknown, extra?: Record<string, string>): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(Buffer.byteLength(payload)),
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'no-referrer',
    ...(extra ?? {}),
  })
  res.end(payload)
}

function readBody(req: IncomingMessage, max = 32 * 1024 * 1024): Promise<string> {
  return new Promise((ok, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > max) { reject(new Error('请求体过大')); req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => ok(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function rid(): string { return 'ag_' + randomBytes(6).toString('hex') }

function maskKey(key: string): string {
  if (key.length <= 12) return key.slice(0, 4) + '…'
  return key.slice(0, 7) + '…' + key.slice(-4)
}

function sha256(s: string): string { return createHash('sha256').update(s).digest('hex') }

function constEq(a: string, b: string): boolean {
  const ba = Buffer.from(a), bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

/** 自然月最后一天 23:59:59.999（本地时区） */
function monthEnd(now = Date.now()): number {
  const d = new Date(now)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime()
}

/** IPv4 CIDR 匹配 */
function ipv4Of(ip: string | undefined): string | null {
  const m = /(\d{1,3}(?:\.\d{1,3}){3})$/.exec(ip ?? '')
  return m ? m[1] : null
}
function ipv4InCidr(ip: string | undefined, cidr: string): boolean {
  const a = ipv4Of(ip); if (!a) return false
  const [net, bitsStr] = cidr.split('/')
  const bits = bitsStr ? Number(bitsStr) : 32
  const toInt = (s: string): number => s.split('.').reduce((acc, v) => (acc << 8) | Number(v), 0) >>> 0
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
  return (toInt(a) & mask) === (toInt(net) & mask)
}

function sensitiveName(name: string): boolean {
  const lower = name.toLowerCase()
  return SENSITIVE_EXTS.some((e) => lower.endsWith(e))
}

/* ============ M2 运行实例 ============ */

let m2cfg: M2Config = M2_DEFAULTS
let gate: WriteGate
let idem: Idempotency
let quota: QuotaLedger
let rate: RateLimiter
let locks: PathLocks

/* ============ Key 存储（data/agent-keys.json，S7 加密，只存哈希） ============ */

export interface AgentKeyScope { kind: 'all' | 'project' | 'directory'; project: string; path: string }
export interface AgentKey {
  id: string
  name: string
  type: 'user' | 'admin'
  username: string
  scope: AgentKeyScope
  status: 'active' | 'suspended' | 'revoked' | 'expired'
  expiresAt: number
  ipWhitelist: string[]
  keyHash: string
  createdBy: string
  at: number
  lastUsedAt: number
  usageCount: number
}
interface KeysFile { version: number; keys: AgentKey[] }

async function loadKeys(ctx: Context): Promise<AgentKey[]> {
  try {
    const raw = await ctx.storage.readText(KEYS_FILE)
    const parsed = JSON.parse(raw) as KeysFile
    return Array.isArray(parsed.keys) ? parsed.keys : []
  } catch { return [] }
}
async function saveKeys(ctx: Context, keys: AgentKey[]): Promise<void> {
  await ctx.storage.writeText(KEYS_FILE, JSON.stringify({ version: 2, keys }, null, 2))
}

/* ============ 审计（S1 双写） ============ */

async function audit(ctx: Context, user: string, action: string, target: string, detail?: string): Promise<void> {
  const rec = await ctx.audit.log({ user, action, target, detail }).catch(() => null)
  if (rec) ctx.emit('audit:logged', rec)
}

/* ============ 公共包装 ============ */

function wrap(handler: (ctx: Context, env: Env, req: IncomingMessage, res: ServerResponse) => void | Promise<void>) {
  return (req: IncomingMessage, res: ServerResponse): void => {
    const env: Env = { rid: rid(), req, res }
    void (async () => {
      try {
        await handler(ctxRef, env, req, res)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        json(res, 500, { ok: false, code: 'AGENT-5001', error: '内部错误', hint: msg.slice(0, 200), requestId: env.rid }, { 'x-request-id': env.rid })
      }
    })()
  }
}
let ctxRef: Context

/* ============ Agent 鉴权 ============ */

interface AgentAuth { key: AgentKey; user: { username: string; displayName: string; role: string; projects: string[] } }

async function authAgent(ctx: Context, req: IncomingMessage, env: Env): Promise<AgentAuth | { errStatus: number; errCode: string; errHint: string }> {
  const raw = String((req.headers as Record<string, string>)['x-agent-key'] ?? '')
  if (!raw) return { errStatus: 401, errCode: 'AGENT-4010', errHint: '缺失 X-Agent-Key，请在请求头携带密钥' }
  if (!raw.startsWith(KEY_PREFIX)) return { errStatus: 401, errCode: 'AGENT-4010', errHint: '无效密钥格式（应为 ' + KEY_PREFIX + ' 开头）' }
  const keys = await loadKeys(ctx)
  const rec = keys.find((k) => constEq(k.keyHash.replace(/^sha256:/, ''), sha256(raw)))
  if (!rec) return { errStatus: 401, errCode: 'AGENT-4010', errHint: '无效密钥（未找到匹配记录）' }
  if (rec.expiresAt > 0 && Date.now() > rec.expiresAt) {
    if (rec.status === 'active') { rec.status = 'expired'; void saveKeys(ctx, keys) }
    return { errStatus: 401, errCode: 'AGENT-4011', errHint: '密钥已过期（自然月周期），请续期或联系管理员（到期前可一键续期）' }
  }
  if (rec.status === 'revoked') return { errStatus: 401, errCode: 'AGENT-4012', errHint: '密钥已吊销，请联系管理员' }
  if (rec.status === 'suspended') return { errStatus: 401, errCode: 'AGENT-4013', errHint: '密钥已挂起（可疑活动），请联系管理员查证恢复' }
  if (rec.status !== 'active') return { errStatus: 401, errCode: 'AGENT-4010', errHint: '密钥状态异常' }
  const ip = String(req.socket.remoteAddress ?? '')
  if (rec.ipWhitelist.length > 0 && !rec.ipWhitelist.some((c) => ipv4InCidr(ip, c))) {
    return { errStatus: 401, errCode: 'AGENT-4014', errHint: '来源 IP 不在密钥白名单内（来源：' + ip + '）' }
  }
  const user = ctx.privhub.users.get(rec.username)
  if (!user) return { errStatus: 403, errCode: 'AGENT-4034', errHint: '绑定用户不存在或已删除' }
  rec.lastUsedAt = Date.now()
  rec.usageCount = (rec.usageCount ?? 0) + 1
  return { key: rec, user }
}

function authError(env: Env, res: ServerResponse, a: { errStatus: number; errCode: string; errHint: string }): void {
  json(res, a.errStatus, { ok: false, code: a.errCode, error: a.errHint, hint: a.errHint, requestId: env.rid }, { 'x-request-id': env.rid })
}

/** Agent 端点包装：鉴权 + X-Key-Expires 预警头（到期前 7 天） */
function withAgent(handler: (ctx: Context, env: Env, a: AgentAuth, req: IncomingMessage, res: ServerResponse, extra: Record<string, string>) => void | Promise<void>) {
  return wrap(async (ctx, env, req, res) => {
    const a = await authAgent(ctx, req, env)
    if ('errStatus' in a) { authError(env, res, a); return }
    const extra: Record<string, string> = { 'x-request-id': env.rid }
    if (a.key.expiresAt > 0 && a.key.expiresAt - Date.now() < 7 * 864e5) {
      extra['x-key-expires'] = new Date(a.key.expiresAt).toISOString()
    }
    await handler(ctx, env, a, req, res, extra)
  })
}

/* ============ 管理鉴权 ============ */

function requireAdmin(ctx: Context, req: IncomingMessage, res: ServerResponse, env: Env): { username: string; role: string } | null {
  const u = ctx.privhub.requireUser(req, res)
  if (!u) return null
  if (u.role !== 'admin') {
    json(res, 403, { ok: false, code: 'AGENT-4035', error: '仅管理员可执行此操作', hint: '管理端点需要 admin 登录态', requestId: env.rid }, { 'x-request-id': env.rid })
    return null
  }
  return u
}

/* ============ scope 与智能体沙箱 ============ */
/*
 * 沙箱 = 绑定用户的「个人空间」目录（data-files/<真实姓名>/），不再是 .agents 隐藏目录。
 *
 * 为什么改用个人空间：个人空间本就是「仅本人可见可访问、管理员也读不到、
 * 系统永不自动删除、不参与查重/向量化/全文索引」的私有区，正是沙箱需要的语义；
 * 复用它还让用户能直接在界面里查看和整理 AI 产物，不必再维护第二套私有目录。
 *
 * 不变的部分：项目对智能体【始终只读】，任何写入项目目录的请求一律 403。 */

function scopeAllows(key: AgentKey, project: string, relPath: string): boolean {
  const s = key.scope
  if (s.kind === 'all') return project !== ''
  if (s.kind === 'project') return project === s.project
  const p = relPath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
  const sp = (s.path ?? '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
  if (project !== s.project) return false
  if (sp === '') return true
  return p === sp || p.startsWith(sp + '/')
}

function personalScopeRel(key: AgentKey): string {
  return key.scope.kind === 'all' ? '' : key.scope.project
}

/**
 * 沙箱目录名 = 绑定用户的个人空间目录名；账号未开通个人空间时为 null。
 * 个人空间由真实姓名创建并在 core 的 users[].personalDir 登记，
 * 这里必须走 core 的登记信息，不能自行拼路径——否则会绕过「仅本人可见」的判定。
 */
function sandboxDirOf(ctx: Context, key: AgentKey): string | null {
  const u = ctx.privhub.users.get(key.username) as { personalDir?: string } | undefined
  const d = String(u?.personalDir ?? '').trim()
  if (d === '' || !ctx.privhub.isValidProjectName(d)) return null
  return d
}

/** 沙箱不可用（账号未开通个人空间）时的统一拒绝。 */
function sandboxMissing(env: Env, res: ServerResponse, extra: Record<string, string>): void {
  json(res, 403, {
    ok: false,
    code: 'AGENT-4036',
    error: '智能体沙箱不可用',
    hint: '绑定账号尚未开通个人空间。沙箱即该账号的个人空间（由真实姓名创建），'
      + '请先为其设置真实姓名（注册实名 / 管理员改显示名）后重试。',
    requestId: env.rid,
  }, extra)
}

/** 沙箱内的相对路径（含 scope 分区前缀）：用于审计目标与版本键。 */
function sandboxRel(key: AgentKey, relPath: string): string {
  const s = personalScopeRel(key)
  return s === '' ? relPath : (relPath === '' ? s : s + '/' + relPath)
}

function sandboxBase(ctx: Context, dir: string, key: AgentKey): string {
  return join(ctx.privhub.dataRoot, dir, personalScopeRel(key))
}

async function ensureSandboxBase(ctx: Context, dir: string, key: AgentKey): Promise<string> {
  const base = sandboxBase(ctx, dir, key)
  await mkdir(base, { recursive: true })
  return base
}

/** 解析沙箱内路径（防穿越 + realpath 校验） */
async function resolvePersonal(ctx: Context, dir: string, key: AgentKey, relPath: string): Promise<string | null> {
  await ensureSandboxBase(ctx, dir, key)
  return ctx.privhub.resolveReal(dir, sandboxRel(key, relPath))
}

/** 沙箱写目标：逐段建目录 + realpath 校验 */
async function personalTarget(ctx: Context, dir: string, key: AgentKey, relPath: string): Promise<string | null> {
  const base = await ensureSandboxBase(ctx, dir, key)
  const segs = relPath.replace(/\\/g, '/').split('/').filter((s) => s !== '')
  let cur = base
  for (const seg of segs.slice(0, -1)) {
    if (!ctx.privhub.isValidName(seg)) return null
    cur = join(cur, seg)
    await mkdir(cur, { recursive: true })
  }
  return ctx.privhub.resolveReal(dir, sandboxRel(key, relPath))
}

function validRelPath(relPath: string): boolean {
  if (relPath === '') return true
  const parts = relPath.replace(/\\/g, '/').split('/').filter((s) => s !== '')
  return parts.every((s) => ctxRef.privhub.isValidName(s))
}

/* ============ 项目只读判定 ============ */

async function authProjectRead(ctx: Context, a: AgentAuth, project: string, relPath: string): Promise<{ ok: true } | { ok: false; status: number; code: string; hint: string }> {
  if (!scopeAllows(a.key, project, relPath)) return { ok: false, status: 403, code: 'AGENT-4031', hint: '目标超出密钥授权 scope' }
  if (!ctx.privhub.canAccess(a.user as never, project)) return { ok: false, status: 403, code: 'AGENT-4034', hint: '绑定用户无权访问该项目' }
  const d = ctx.acl.can(a.user as never, 'view', project, relPath)
  if (d && !d.allow) return { ok: false, status: 403, code: 'AGENT-4031', hint: '文件级 ACL 拒绝读取' }
  return { ok: true }
}

function relOf(p: string): string { return p.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '') }

/* ============ 端点实现 ============ */

export function apply(ctx: Context, config?: M2Config): void {
  ctxRef = ctx
  m2cfg = { ...M2_DEFAULTS, ...(config ?? {}) }
  gate = new WriteGate(m2cfg.writeConcurrency, m2cfg.queueCapacity, m2cfg.queueWaitMs)
  idem = new Idempotency(rootDir, m2cfg.idemTtlMs)
  quota = new QuotaLedger(rootDir, m2cfg.quotaPersonalMb * 1024 * 1024, ctx)
  rate = new RateLimiter({ key: m2cfg.rateKeyPerMin, user: m2cfg.rateUserPerMin, ip: m2cfg.rateIpPerMin })
  locks = new PathLocks()
  void quota.load(ctx).catch(() => {})
  restoreRateBuckets(ctx, rate)
  startFlusher(ctx, quota, rate, idem, m2cfg.flushSec)
  /* E1 事件声明 */
  ctx.eventBus.declareEmit('audit:logged', 'privhub-files-agent', '写操作成功审计广播（S1 闭环）')
  const svc = ctx.privhub
  const route = (path: string, handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>, label: string): void =>
    svc.route(path, wrap(handler), label)

  /* ---------- 发现与身份 ---------- */

  svc.route('/privhub/api/agent/v1/schema', wrap(async (ctx, env, req, res) => {
    json(res, 200, {
      ok: true,
      name: 'privhub-agent-api',
      version: '1.0.0',
      auth: { header: 'X-Agent-Key', prefix: KEY_PREFIX, keyCycle: 'monthly', expiresWarnDays: 7 },
      boundary: {
        projectReadOnly: true,
        writeScope: '沙箱 = 绑定用户的个人空间（data-files/<真实姓名>/，按 key scope 分区）；项目只读',
        sensitiveExts: SENSITIVE_EXTS,
        channel: '仅 X-Agent-Key 通道；禁止使用网页会话',
      },
      tools: [
        { name: 'me', method: 'GET', path: '/privhub/api/agent/v1/me', params: {}, desc: '查询绑定用户身份、可见项目、专属空间路径、密钥到期日' },
        { name: 'projects', method: 'GET', path: '/privhub/api/agent/v1/projects', params: {}, desc: '列出当前密钥 scope 内可见项目（项目=只读）' },
        { name: 'list', method: 'GET', path: '/privhub/api/agent/v1/list?project=&path=&cursor=&limit=', params: { project: '项目名；省略或 @me = 专属空间', path: '目录相对路径', cursor: '分页游标', limit: '默认200 最大500' }, desc: '列目录（项目或专属空间）' },
        { name: 'read', method: 'GET', path: '/privhub/api/agent/v1/read?project=&path=&encoding=text|base64&maxBytes=', params: { project: '项目名；省略或 @me = 专属空间', path: '文件相对路径', encoding: 'text(默认,编码自动检测) | base64(二进制)', maxBytes: 'text 截断上限(默认1MB,最大4MB)' }, desc: '读取文件内容，响应带 ETag' },
        { name: 'write', method: 'POST', path: '/privhub/api/agent/v1/write', body: '{ path, content, encoding?, dryRun? }', desc: '写入专属空间（项目只读，写项目 403）。必带 X-Idempotency-Key；同名覆盖+版本快照' },
        { name: 'fork', method: 'POST', path: '/privhub/api/agent/v1/fork', body: '{ project, path, toSubdir? }', desc: '把项目内文件复制到专属空间（源只读）。必带 X-Idempotency-Key' },
        { name: 'rename', method: 'POST', path: '/privhub/api/agent/v1/rename', body: '{ path, newName }', desc: '专属空间内重命名' },
        { name: 'delete', method: 'POST', path: '/privhub/api/agent/v1/delete', body: '{ path }', desc: '删除专属空间文件（进回收站，可经管理员恢复）' },
        { name: 'versions', method: 'GET', path: '/privhub/api/agent/v1/versions?path=', params: { path: '专属空间文件相对路径' }, desc: '专属空间版本历史（覆盖前快照，最多 20 版）' },
        { name: 'versions_restore', method: 'POST', path: '/privhub/api/agent/v1/versions/restore', body: '{ path, at }', desc: '恢复到指定版本（写回 + 生成新版本可反悔）' },
      ],
      errorCodes: [
        { code: 'AGENT-4001', desc: '参数缺失/非法/缺少幂等键' }, { code: 'AGENT-4010', desc: '无效/缺失密钥' }, { code: 'AGENT-4011', desc: '密钥过期' }, { code: 'AGENT-4012', desc: '密钥吊销' },
        { code: 'AGENT-4013', desc: '密钥挂起' }, { code: 'AGENT-4014', desc: 'IP 白名单拒绝' }, { code: 'AGENT-4031', desc: '超出 scope' },
        { code: 'AGENT-4032', desc: '项目只读，写入仅限专属空间' }, { code: 'AGENT-4033', desc: '敏感文件豁免' }, { code: 'AGENT-4034', desc: '绑定用户无权限' }, { code: 'AGENT-4035', desc: '仅管理员' },
        { code: 'AGENT-4041', desc: '文件/目录不存在' }, { code: 'AGENT-4091', desc: '并发版本冲突（ETag 不匹配）' }, { code: 'AGENT-4092', desc: '幂等键冲突/目标已存在' },
        { code: 'AGENT-4131', desc: '超出大小上限' }, { code: 'AGENT-4291', desc: '限流触发（附 Retry-After）' }, { code: 'AGENT-4292', desc: '配额超限（附用量/限额）' },
        { code: 'AGENT-4293', desc: '写队列已满' }, { code: 'AGENT-4294', desc: '排队超时（可携带相同幂等键重试）' }, { code: 'AGENT-5001', desc: '内部错误' },
      ],
      curl: [
        'curl -H "X-Agent-Key: pha_xxx" http://<host>:3181/privhub/api/agent/v1/me',
        'curl -X POST -H "X-Agent-Key: pha_xxx" -H "content-type: application/json" -H "X-Idempotency-Key: k-12345678" -d \'{"path":"note.md","content":"hi"}\' http://<host>:3181/privhub/api/agent/v1/write',
      ],
    }, { 'x-request-id': env.rid })
  }, 'agent-schema'))

  svc.route('/privhub/api/agent/v1/me', withAgent(async (ctx, env, a, req, res, extra) => {
    const u = a.user
    /* 只列出「真正的项目」：个人空间不算项目，它作为沙箱单独给出。
     * 用 indexableProjects（= visibleProjects 去掉个人空间）保证与查重/索引
     * 用的是同一份范围定义，避免两处口径漂移。 */
    const projects = await ctx.privhub.indexableProjects(u as never)
    const sandbox = sandboxDirOf(ctx, a.key)
    const scopeRel = personalScopeRel(a.key)
    json(res, 200, {
      ok: true,
      key: { name: a.key.name, expiresAt: a.key.expiresAt, scope: a.key.scope, ipWhitelist: a.key.ipWhitelist },
      user: { username: u.username, displayName: u.displayName, role: u.role },
      visibleProjects: projects,
      // 沙箱即该账号的个人空间；未开通时为 null（写入类操作会被 403 AGENT-4036 拒绝）
      sandbox: sandbox,
      sandboxPath: sandbox === null ? null : sandbox + '/' + (scopeRel ? scopeRel + '/' : ''),
      projectReadOnly: true,
    }, extra)
  }, 'agent-me'))

  svc.route('/privhub/api/agent/v1/projects', withAgent(async (ctx, env, a, req, res, extra) => {
    /* 只暴露「真正的项目」，并按密钥 scope 收窄。
     * 个人空间【不在此列出】——它是沙箱，不是项目；把别人的或自己的个人空间
     * 混进项目清单会让智能体以为可以像项目那样按名枚举，也会泄露目录名。
     * 同时这也修掉了原实现里 /me 不做 scope 过滤、把全部项目名发给智能体的疏漏。 */
    const projects = await ctx.privhub.indexableProjects(a.user as never)
    const filtered = a.key.scope.kind === 'all'
      ? projects
      : (projects.includes(a.key.scope.project) ? [a.key.scope.project] : [])
    const sandbox = sandboxDirOf(ctx, a.key)
    json(res, 200, {
      ok: true,
      projects: filtered,
      sandbox,
      sandboxPath: sandbox === null ? null : sandbox + '/',
      projectReadOnly: true,
    }, extra)
  }, 'agent-projects'))

  /* ---------- 读 ---------- */

  svc.route('/privhub/api/agent/v1/list', withAgent(async (ctx, env, a, req, res, extra) => {
    const url = new URL(req.url ?? '/', 'http://x')
    const rr = rate.check({ key: a.key.id, user: a.user.username, ip: String(req.socket.remoteAddress ?? '') })
    const rlExtra = { 'x-ratelimit-limit': String(rr.limit), 'x-ratelimit-remaining': String(rr.remaining), 'x-ratelimit-reset': String(Math.ceil(rr.resetAt / 1000)) }
    if (!rr.ok) return json(res, 429, { ok: false, code: 'AGENT-4291', error: '限流触发', hint: rr.dim + ' 超出每分钟限额，' + rr.retryAfter + ' 秒后重试', requestId: env.rid, limit: rr.limit, remaining: rr.remaining, resetAt: rr.resetAt }, { ...extra, ...rlExtra, 'retry-after': String(rr.retryAfter) })
    const project = url.searchParams.get('project') ?? ''
    const path = relOf(url.searchParams.get('path') ?? '')
    const cursorRaw = url.searchParams.get('cursor') ?? ''
    const limit = Math.min(Number(url.searchParams.get('limit') || LIMITS.listDefault) || LIMITS.listDefault, LIMITS.listLimit)
    const isPersonal = project === '' || project === '@me'
    let entries: Awaited<ReturnType<typeof svc.listFiles>> = []
    if (isPersonal) {
      if (!validRelPath(path)) return json(res, 400, { ok: false, code: 'AGENT-4001', error: '路径非法', hint: '路径包含不合法字符', requestId: env.rid }, extra)
      const sandbox = sandboxDirOf(ctx, a.key)
      if (sandbox === null) return sandboxMissing(env, res, extra)
      const withScope = sandboxRel(a.key, path)
      entries = await svc.listFiles(sandbox, withScope)
      void audit(ctx, 'ai:' + a.key.name, 'agent-list', sandbox + '/' + withScope, 'via=' + a.user.username)
    } else {
      const pr = await authProjectRead(ctx, a, project, path)
      if (!pr.ok) return json(res, pr.status, { ok: false, code: pr.code, error: pr.hint, hint: pr.hint, requestId: env.rid }, extra)
      const t = await svc.resolveReal(project, path)
      if (t === null || !existsSync(t)) return json(res, 404, { ok: false, code: 'AGENT-4041', error: '目录不存在', hint: '目录不存在或不可解析', requestId: env.rid }, extra)
      entries = await svc.listFiles(project, path)
      void audit(ctx, 'ai:' + a.key.name, 'agent-list', project + '/' + path, 'via=' + a.user.username)
    }
    const offset = cursorRaw ? (() => { try { return Number(Buffer.from(cursorRaw, 'base64').toString('utf8')) } catch { return 0 } })() : 0
    const slice = entries.slice(offset, offset + limit)
    const nextCursor = offset + limit < entries.length ? Buffer.from(String(offset + limit)).toString('base64') : null
    json(res, 200, { ok: true, entries: slice, total: entries.length, nextCursor }, extra)
  }, 'agent-list'))

  svc.route('/privhub/api/agent/v1/read', withAgent(async (ctx, env, a, req, res, extra) => {
    const url = new URL(req.url ?? '/', 'http://x')
    const rr = rate.check({ key: a.key.id, user: a.user.username, ip: String(req.socket.remoteAddress ?? '') })
    const rlExtra = { 'x-ratelimit-limit': String(rr.limit), 'x-ratelimit-remaining': String(rr.remaining), 'x-ratelimit-reset': String(Math.ceil(rr.resetAt / 1000)) }
    if (!rr.ok) return json(res, 429, { ok: false, code: 'AGENT-4291', error: '限流触发', hint: rr.dim + ' 超出每分钟限额，' + rr.retryAfter + ' 秒后重试', requestId: env.rid, limit: rr.limit, remaining: rr.remaining, resetAt: rr.resetAt }, { ...extra, ...rlExtra, 'retry-after': String(rr.retryAfter) })
    const project = url.searchParams.get('project') ?? ''
    const path = relOf(url.searchParams.get('path') ?? '')
    const encoding = String(url.searchParams.get('encoding') ?? 'text')
    if (!path) return json(res, 400, { ok: false, code: 'AGENT-4001', error: '参数缺失', hint: 'path 必填', requestId: env.rid }, extra)
    const isPersonal = project === '' || project === '@me'
    let target: string | null = null
    let auditTarget = ''
    if (isPersonal) {
      if (!validRelPath(path)) return json(res, 400, { ok: false, code: 'AGENT-4001', error: '路径非法', hint: '路径包含不合法字符', requestId: env.rid }, extra)
      const sandbox = sandboxDirOf(ctx, a.key)
      if (sandbox === null) return sandboxMissing(env, res, extra)
      target = await resolvePersonal(ctx, sandbox, a.key, path)
      auditTarget = sandbox + '/' + sandboxRel(a.key, path)
    } else {
      const pr = await authProjectRead(ctx, a, project, path)
      if (!pr.ok) return json(res, pr.status, { ok: false, code: pr.code, error: pr.hint, hint: pr.hint, requestId: env.rid }, extra)
      target = await svc.resolveReal(project, path)
      auditTarget = project + '/' + path
    }
    if (target === null || !existsSync(target)) return json(res, 404, { ok: false, code: 'AGENT-4041', error: '文件不存在', hint: '文件不存在或不可解析', requestId: env.rid }, extra)
    const s = await stat(target)
    if (s.isDirectory()) return json(res, 400, { ok: false, code: 'AGENT-4001', error: '目标是目录', hint: 'read 仅支持文件，目录请用 list', requestId: env.rid }, extra)
    if (sensitiveName(target.split(/[\\/]/).pop() ?? '')) return json(res, 403, { ok: false, code: 'AGENT-4033', error: '敏感文件豁免', hint: '该文件类型禁止经 Agent API 读取', requestId: env.rid }, extra)
    if (encoding === 'base64') {
      if (s.size - 36 > LIMITS.readBase64Max) return json(res, 413, { ok: false, code: 'AGENT-4131', error: '超出大小上限', hint: 'base64 读取上限 ' + LIMITS.readBase64Max + ' 字节', requestId: env.rid }, extra)
      const buf = await ctx.storage.readBuffer(target)
      void audit(ctx, 'ai:' + a.key.name, 'agent-read', auditTarget, 'via=' + a.user.username + ' enc=base64 size=' + buf.length)
      json(res, 200, { ok: true, type: 'base64', data: buf.toString('base64'), size: buf.length, etag: fileEtag(buf.length, buf.subarray(0, 65536).toString('base64')) }, extra)
      return
    }
    if (encoding !== 'text') return json(res, 400, { ok: false, code: 'AGENT-4001', error: 'encoding 非法', hint: 'encoding 仅支持 text | base64', requestId: env.rid }, extra)
    const maxBytes = Math.min(Number(url.searchParams.get('maxBytes') || LIMITS.readTextDefault) || LIMITS.readTextDefault, LIMITS.readTextMax)
    const buf = await ctx.storage.readBuffer(target)
    const truncated = buf.length > maxBytes
    const slice = truncated ? buf.subarray(0, maxBytes) : buf
    const utf8 = new TextDecoder('utf-8', { fatal: true })
    let data: string
    try { data = utf8.decode(slice) } catch { data = new TextDecoder('gbk').decode(slice) }
    void audit(ctx, 'ai:' + a.key.name, 'agent-read', auditTarget, 'via=' + a.user.username + ' enc=text size=' + buf.length + (truncated ? ' truncated' : ''))
    json(res, 200, { ok: true, type: 'text', data, size: buf.length, truncated, etag: fileEtag(buf.length, slice.subarray(0, 65536).toString('base64')) }, extra)
  }, 'agent-read'))

  /* ---------- 写（仅专属空间；项目写 = 403 硬隔离） ---------- */

  const fmtBytes = (n: number): string => (n < 1024 * 1024 ? (n / 1024).toFixed(0) + 'KB' : (n / 1024 / 1024).toFixed(1) + 'MB')

  /** M2 幂等：解析 X-Idempotency-Key（必填），命中重放/冲突即回响应并返回 null */
  const idemKeyOf = async (a: AgentAuth, req: IncomingMessage, res: ServerResponse, env: Env, extra: Record<string, string>, body: unknown): Promise<string | null> => {
    const ik = String((req.headers as Record<string, string>)['x-idempotency-key'] ?? '')
    if (!ik || ik.length < 8 || ik.length > 128) {
      json(res, 400, { ok: false, code: 'AGENT-4001', error: '缺少幂等键', hint: '写类请求必须携带 X-Idempotency-Key（8~128 字符）；重试携带相同键可防重复写入', requestId: env.rid }, extra)
      return null
    }
    const hit = await idem.check(ctxRef, a.key.id, ik, sha256m(JSON.stringify(body)))
    if (hit.conflict) {
      json(res, 409, { ok: false, code: 'AGENT-4092', error: '幂等键冲突', hint: '该幂等键已用于不同的请求体，请更换 X-Idempotency-Key', requestId: env.rid }, extra)
      return null
    }
    if (hit.hit) {
      json(res, 200, { ...(hit.response as object), replayed: true }, { ...extra, 'x-idempotency-replayed': 'true' })
      return null
    }
    return ik
  }

  /** M2 写闸门：并发上限 + 有界队列 + 超时 */
  const gateAcquire = async (env: Env, res: ServerResponse, extra: Record<string, string>): Promise<{ g: { release: () => void; position: number; waitMs: number } } | null> => {
    const g = await gate.acquire()
    if (g.ok) return { g }
    const full = g.error === 'full'
    json(res, 429, {
      ok: false,
      code: full ? 'AGENT-4293' : 'AGENT-4294',
      error: full ? '写队列已满' : '排队超时',
      hint: full ? '写负载过高、队列已满（上限 ' + m2cfg.queueCapacity + '），请稍后重试' : '排队超过 ' + m2cfg.queueWaitMs / 1000 + ' 秒未获执行；请求未落盘，可携带相同 X-Idempotency-Key 安全重试',
      queueLimit: m2cfg.queueCapacity,
      queueWaitMs: m2cfg.queueWaitMs,
      requestId: env.rid,
    }, { ...extra, 'x-queue-limit': String(m2cfg.queueCapacity), 'retry-after': '5' })
    return null
  }

  const scopeRelOf = (a: AgentAuth): string => {
    const s = personalScopeRel(a.key)
    return s === '' ? '' : s + '/'
  }

  /* 写入（幂等 + 闸门 + 锁 + 配额预检 + 版本快照 + upsert） */
  svc.route('/privhub/api/agent/v1/write', withAgent(async (ctx, env, a, req, res, extra) => {
    if (req.method !== 'POST') return json(res, 405, { ok: false, code: 'AGENT-4001', error: 'method not allowed', hint: '仅 POST', requestId: env.rid }, extra)
    let body: any
    try { body = JSON.parse(await readBody(req, LIMITS.writeBinaryMax + 1024 * 1024)) } catch { return json(res, 400, { ok: false, code: 'AGENT-4001', error: 'invalid json', hint: '请求体不是合法 JSON', requestId: env.rid }, extra) }
    const path = relOf(String(body.path ?? ''))
    if (!path) return json(res, 400, { ok: false, code: 'AGENT-4001', error: '参数缺失', hint: 'path 必填', requestId: env.rid }, extra)
    if (String(body.project ?? '') !== '' && body.project !== '@me') {
      return json(res, 403, { ok: false, code: 'AGENT-4032', error: '项目只读', hint: '智能体仅可读项目，写入限定沙箱（省略 project 或 @me 即写入沙箱 = 你的个人空间）', requestId: env.rid }, extra)
    }
    if (!validRelPath(path)) return json(res, 400, { ok: false, code: 'AGENT-4001', error: '路径非法', hint: '路径包含不合法字符', requestId: env.rid }, extra)
    if (sensitiveName(path.split('/').pop() ?? '')) return json(res, 403, { ok: false, code: 'AGENT-4033', error: '敏感文件豁免', hint: '该文件类型禁止经 Agent API 写入', requestId: env.rid }, extra)
    const encoding = String(body.encoding ?? 'text')
    const dryRun = body.dryRun === true
    let data: Buffer
    if (encoding === 'base64') {
      const b64 = String(body.content ?? '')
      data = Buffer.from(b64, 'base64')
      if (data.length > LIMITS.writeBinaryMax) return json(res, 413, { ok: false, code: 'AGENT-4131', error: '超出大小上限', hint: '二进制写入上限 ' + LIMITS.writeBinaryMax + ' 字节', requestId: env.rid }, extra)
    } else {
      data = Buffer.from(String(body.content ?? ''), 'utf8')
      if (data.length > LIMITS.writeTextMax) return json(res, 413, { ok: false, code: 'AGENT-4131', error: '超出大小上限', hint: '文本写入上限 ' + LIMITS.writeTextMax + ' 字节', requestId: env.rid }, extra)
    }
    let idemKey: string | null = null
    if (!dryRun) {
      idemKey = await idemKeyOf(a, req, res, env, extra, body)
      if (idemKey === null) return
    }
    const sandbox = sandboxDirOf(ctx, a.key)
    if (sandbox === null) return sandboxMissing(env, res, extra)
    const scopeRel = scopeRelOf(a)
    const savedAt = sandbox + '/' + scopeRel + path
    const lockKey = sandbox + '|' + scopeRel + path
    const target = await personalTarget(ctx, sandbox, a.key, path)
    if (target === null) return json(res, 400, { ok: false, code: 'AGENT-4001', error: '路径无效', hint: '目标路径越界或父目录不可解析', requestId: env.rid }, extra)
    if (dryRun) {
      const usage = await quota.usage(ctx, a.user.username)
      json(res, 200, { ok: true, dryRun: true, would: existsSync(target) ? 'overwrite' : 'create', size: data.length, savedAt, usage, quota: m2cfg.quotaPersonalMb * 1024 * 1024 }, extra)
      return
    }
    const g = await gateAcquire(env, res, extra)
    if (!g) return
    const qExtra: Record<string, string> = { 'x-queue-limit': String(m2cfg.queueCapacity) }
    if (g.g.position > 0) { qExtra['x-queue-position'] = String(g.g.position); qExtra['x-queue-wait-ms'] = String(g.g.waitMs) }
    try {
      const out: any = await locks.run(lockKey, async () => {
        const abs = await personalTarget(ctx, sandbox, a.key, path)
        if (abs === null) return { status: 400, code: 'AGENT-4001', hint: '目标路径越界或父目录不可解析' }
        const existed = existsSync(abs)
        let oldPlain = 0
        if (existed) {
          const s = await stat(abs)
          oldPlain = s.size - (await ctx.storage.isEncrypted(abs) ? 36 : 0)
        }
        const ifMatch = String((req.headers as Record<string, string>)['if-match'] ?? '')
        if (existed && ifMatch) {
          const old = await ctx.storage.readBuffer(abs)
          const et = fileEtag(old.length, old.subarray(0, 65536).toString('base64'))
          if (!constEq(et, ifMatch)) return { status: 409, code: 'AGENT-4091', hint: '并发版本冲突：目标已被其他写入修改，请重新 read 获取新 ETag 后再写' }
        }
        const pr = await quota.precheck(ctx, a.user.username, data.length, oldPlain)
        if (!pr.ok) return { status: 429, code: 'AGENT-4292', hint: '沙箱配额超限（' + fmtBytes(pr.usage) + ' / ' + fmtBytes(pr.quota) + '），清理空间后可再写', usage: pr.usage, quota: pr.quota }
        let snapshot = false
        let backupped = false
        if (existed) {
          await versionSnapshot(ctx, rootDir, 'ai:' + a.key.name, sandbox, scopeRel + path, abs, m2cfg.snapshotMax)
          if (TEXT_EXT.has(extname(abs).slice(1).toLowerCase())) {
            snapshot = true
          } else {
            const bak = abs + '.bak-' + Date.now()
            await rename(abs, bak).catch(() => {})
            backupped = true
          }
        }
        const tmp = abs + '.part-' + Date.now()
        await ctx.storage.writeBuffer(tmp, data)
        await rename(tmp, abs).catch(async (e) => { await unlink(tmp).catch(() => {}); throw e })
        await quota.add(ctx, a.user.username, data.length - oldPlain)
        return { ok: true, snapshot, backupped }
      })
      if (!out.ok) {
        return json(res, out.status as number, { ok: false, code: out.code, error: out.hint, hint: out.hint, requestId: env.rid, ...(out.usage !== undefined ? { usage: out.usage, quota: out.quota } : {}) }, { ...extra, ...qExtra })
      }
      const respBody = { ok: true, savedAt, size: data.length, snapshot: out.snapshot === true, backup: out.backupped === true }
      await idem.store(ctx, a.key.id, idemKey!, sha256m(JSON.stringify(body)), respBody).catch(() => {})
      void audit(ctx, 'ai:' + a.key.name, 'agent-write', savedAt, 'via=' + a.user.username + ' size=' + data.length + (out.snapshot ? ' snapshot' : '') + (out.backupped ? ' bak' : ''))
      json(res, 200, respBody, { ...extra, ...qExtra })
    } finally {
      g.g.release()
    }
  }, 'agent-write'))

  /* fork：项目（只读）→ 专属空间 */
  svc.route('/privhub/api/agent/v1/fork', withAgent(async (ctx, env, a, req, res, extra) => {
    if (req.method !== 'POST') return json(res, 405, { ok: false, code: 'AGENT-4001', error: 'method not allowed', hint: '仅 POST', requestId: env.rid }, extra)
    let body: any
    try { body = JSON.parse(await readBody(req, 1024 * 1024)) } catch { return json(res, 400, { ok: false, code: 'AGENT-4001', error: 'invalid json', hint: '请求体不是合法 JSON', requestId: env.rid }, extra) }
    const project = String(body.project ?? '')
    const path = relOf(String(body.path ?? ''))
    const toSubdir = relOf(String(body.toSubdir ?? ''))
    if (!project || !path) return json(res, 400, { ok: false, code: 'AGENT-4001', error: '参数缺失', hint: 'project 与 path 必填（源为项目文件，只读）', requestId: env.rid }, extra)
    const pr = await authProjectRead(ctx, a, project, path)
    if (!pr.ok) return json(res, pr.status, { ok: false, code: pr.code, error: pr.hint, hint: pr.hint, requestId: env.rid }, extra)
    const src = await svc.resolveReal(project, path)
    if (src === null || !existsSync(src)) return json(res, 404, { ok: false, code: 'AGENT-4041', error: '源文件不存在', hint: '源文件不存在或不可解析', requestId: env.rid }, extra)
    const s = await stat(src)
    if (s.isDirectory()) return json(res, 400, { ok: false, code: 'AGENT-4001', error: '源是目录', hint: 'fork 仅支持文件', requestId: env.rid }, extra)
    if (s.size - 36 > LIMITS.forkMax) return json(res, 413, { ok: false, code: 'AGENT-4131', error: '超出大小上限', hint: 'fork 上限 ' + LIMITS.forkMax + ' 字节', requestId: env.rid }, extra)
    if (!validRelPath(toSubdir)) return json(res, 400, { ok: false, code: 'AGENT-4001', error: '目标子目录非法', hint: 'toSubdir 路径非法', requestId: env.rid }, extra)
    const name = path.split('/').pop() ?? 'file'
    const destRel = toSubdir === '' ? name : toSubdir + '/' + name
    const idemKey = await idemKeyOf(a, req, res, env, extra, body)
    if (idemKey === null) return
    const sandbox = sandboxDirOf(ctx, a.key)
    if (sandbox === null) return sandboxMissing(env, res, extra)
    const scopeRel = scopeRelOf(a)
    const savedAt = sandbox + '/' + scopeRel + destRel
    const lockKey = sandbox + '|' + scopeRel + destRel
    const g = await gateAcquire(env, res, extra)
    if (!g) return
    const qExtra: Record<string, string> = { 'x-queue-limit': String(m2cfg.queueCapacity) }
    if (g.g.position > 0) { qExtra['x-queue-position'] = String(g.g.position); qExtra['x-queue-wait-ms'] = String(g.g.waitMs) }
    try {
      const out: any = await locks.run(lockKey, async () => {
        const abs = await personalTarget(ctx, sandbox, a.key, destRel)
        if (abs === null) return { status: 400, code: 'AGENT-4001', hint: '目标路径越界或父目录不可解析' }
        const existed = existsSync(abs)
        let oldPlain = 0
        if (existed) {
          const st = await stat(abs)
          oldPlain = st.size - (await ctx.storage.isEncrypted(abs) ? 36 : 0)
        }
        const prq = await quota.precheck(ctx, a.user.username, s.size - 36, oldPlain)
        if (!prq.ok) return { status: 429, code: 'AGENT-4292', hint: '沙箱配额超限（' + fmtBytes(prq.usage) + ' / ' + fmtBytes(prq.quota) + '）', usage: prq.usage, quota: prq.quota }
        let snapshot = false
        let backupped = false
        if (existed) {
          await versionSnapshot(ctx, rootDir, 'ai:' + a.key.name, sandbox, scopeRel + destRel, abs, m2cfg.snapshotMax)
          if (TEXT_EXT.has(extname(abs).slice(1).toLowerCase())) {
            snapshot = true
          } else {
            const bak = abs + '.bak-' + Date.now()
            await rename(abs, bak).catch(() => {})
            backupped = true
          }
        }
        const data = await ctx.storage.readBuffer(src)
        const tmp = abs + '.part-' + Date.now()
        await ctx.storage.writeBuffer(tmp, data)
        await rename(tmp, abs).catch(async (e) => { await unlink(tmp).catch(() => {}); throw e })
        await quota.add(ctx, a.user.username, data.length - oldPlain)
        return { ok: true, size: data.length, snapshot, backupped }
      })
      if (!out.ok) {
        return json(res, out.status as number, { ok: false, code: out.code, error: out.hint, hint: out.hint, requestId: env.rid, ...(out.usage !== undefined ? { usage: out.usage, quota: out.quota } : {}) }, { ...extra, ...qExtra })
      }
      const respBody = { ok: true, savedAt, size: out.size, snapshot: out.snapshot === true, backup: out.backupped === true }
      await idem.store(ctx, a.key.id, idemKey, sha256m(JSON.stringify(body)), respBody).catch(() => {})
      void audit(ctx, 'ai:' + a.key.name, 'agent-fork', project + '/' + path, '-> ' + savedAt + ' via=' + a.user.username + ' size=' + out.size)
      json(res, 200, respBody, { ...extra, ...qExtra })
    } finally {
      g.g.release()
    }
  }, 'agent-fork'))

  /* rename：沙箱内 */
  svc.route('/privhub/api/agent/v1/rename', withAgent(async (ctx, env, a, req, res, extra) => {
    if (req.method !== 'POST') return json(res, 405, { ok: false, code: 'AGENT-4001', error: 'method not allowed', hint: '仅 POST', requestId: env.rid }, extra)
    let body: any
    try { body = JSON.parse(await readBody(req, 1024 * 1024)) } catch { return json(res, 400, { ok: false, code: 'AGENT-4001', error: 'invalid json', hint: '请求体不是合法 JSON', requestId: env.rid }, extra) }
    const path = relOf(String(body.path ?? ''))
    const newName = String(body.newName ?? '')
    if (!path || !newName) return json(res, 400, { ok: false, code: 'AGENT-4001', error: '参数缺失', hint: 'path 与 newName 必填', requestId: env.rid }, extra)
    if (!svc.isValidName(newName)) return json(res, 400, { ok: false, code: 'AGENT-4001', error: '文件名非法', hint: 'newName 含非法字符', requestId: env.rid }, extra)
    if (sensitiveName(newName)) return json(res, 403, { ok: false, code: 'AGENT-4033', error: '敏感文件豁免', hint: '目标名为敏感类型', requestId: env.rid }, extra)
    const sandbox = sandboxDirOf(ctx, a.key)
    if (sandbox === null) return sandboxMissing(env, res, extra)
    const scopeRel = scopeRelOf(a)
    const lockKey = sandbox + '|' + scopeRel + path
    const g = await gateAcquire(env, res, extra)
    if (!g) return
    const qExtra: Record<string, string> = { 'x-queue-limit': String(m2cfg.queueCapacity) }
    if (g.g.position > 0) { qExtra['x-queue-position'] = String(g.g.position); qExtra['x-queue-wait-ms'] = String(g.g.waitMs) }
    try {
      const out: any = await locks.run(lockKey, async () => {
        const target = await resolvePersonal(ctx, sandbox, a.key, path)
        if (target === null || !existsSync(target)) return { status: 404, code: 'AGENT-4041', hint: '源文件不存在' }
        const dest = target.slice(0, Math.max(target.lastIndexOf('\\'), target.lastIndexOf('/')) + 1) + newName
        if (existsSync(dest)) return { status: 409, code: 'AGENT-4092', hint: '目标文件名已存在' }
        await rename(target, dest)
        return { ok: true }
      })
      if (!out.ok) return json(res, out.status as number, { ok: false, code: out.code, error: out.hint, hint: out.hint, requestId: env.rid }, { ...extra, ...qExtra })
      const rel = sandbox + '/' + scopeRel + path
      void audit(ctx, 'ai:' + a.key.name, 'agent-rename', rel, '-> ' + newName + ' via=' + a.user.username)
      json(res, 200, { ok: true, from: path, to: newName }, { ...extra, ...qExtra })
    } finally {
      g.g.release()
    }
  }, 'agent-rename'))

  /* delete：沙箱 → 回收站 */
  svc.route('/privhub/api/agent/v1/delete', withAgent(async (ctx, env, a, req, res, extra) => {
    if (req.method !== 'POST') return json(res, 405, { ok: false, code: 'AGENT-4001', error: 'method not allowed', hint: '仅 POST', requestId: env.rid }, extra)
    let body: any
    try { body = JSON.parse(await readBody(req, 1024 * 1024)) } catch { return json(res, 400, { ok: false, code: 'AGENT-4001', error: 'invalid json', hint: '请求体不是合法 JSON', requestId: env.rid }, extra) }
    const path = relOf(String(body.path ?? ''))
    if (!path) return json(res, 400, { ok: false, code: 'AGENT-4001', error: '参数缺失', hint: 'path 必填', requestId: env.rid }, extra)
    const sandbox = sandboxDirOf(ctx, a.key)
    if (sandbox === null) return sandboxMissing(env, res, extra)
    const scopeRel = scopeRelOf(a)
    const withScope = scopeRel + path
    const lockKey = sandbox + '|' + withScope
    const g = await gateAcquire(env, res, extra)
    if (!g) return
    const qExtra: Record<string, string> = { 'x-queue-limit': String(m2cfg.queueCapacity) }
    if (g.g.position > 0) { qExtra['x-queue-position'] = String(g.g.position); qExtra['x-queue-wait-ms'] = String(g.g.waitMs) }
    try {
      const out: any = await locks.run(lockKey, async () => {
        const abs = await resolvePersonal(ctx, sandbox, a.key, path)
        if (abs === null || !existsSync(abs)) return { status: 404, code: 'AGENT-4041', hint: '文件不存在或已在回收站' }
        const st = await stat(abs)
        const plain = Math.max(0, st.size - (await ctx.storage.isEncrypted(abs) ? 36 : 0))
        const ok = await svc.moveToTrash(sandbox, withScope, 'ai:' + a.key.name)
        if (!ok) return { status: 404, code: 'AGENT-4041', hint: '文件不存在或已在回收站' }
        await quota.add(ctx, a.user.username, -plain)
        return { ok: true }
      })
      if (!out.ok) return json(res, out.status as number, { ok: false, code: out.code, error: out.hint, hint: out.hint, requestId: env.rid }, { ...extra, ...qExtra })
      const rel = sandbox + '/' + withScope
      void audit(ctx, 'ai:' + a.key.name, 'agent-delete', rel, 'via=' + a.user.username)
      json(res, 200, { ok: true, note: '已移入回收站（可经管理员恢复）', path: rel }, { ...extra, ...qExtra })
    } finally {
      g.g.release()
    }
  }, 'agent-delete'))

  /* M2：沙箱版本历史（复用 versions.json 数据格式） */
  svc.route('/privhub/api/agent/v1/versions', withAgent(async (ctx, env, a, req, res, extra) => {
    const url = new URL(req.url ?? '/', 'http://x')
    const project = url.searchParams.get('project') ?? ''
    if (project !== '' && project !== '@me') return json(res, 400, { ok: false, code: 'AGENT-4001', error: '仅支持沙箱', hint: '版本接口仅针对沙箱（个人空间）；项目文件的版本历史请使用网页接口 /privhub/api/versions', requestId: env.rid }, extra)
    const path = relOf(url.searchParams.get('path') ?? '')
    if (!path) return json(res, 400, { ok: false, code: 'AGENT-4001', error: '参数缺失', hint: 'path 必填', requestId: env.rid }, extra)
    const sandbox = sandboxDirOf(ctx, a.key)
    if (sandbox === null) return sandboxMissing(env, res, extra)
    const key = sandbox + '|' + scopeRelOf(a) + path
    let arr: Array<{ at: number; by: string; content: string }> = []
    try {
      const f = join(rootDir, 'data', 'versions.json')
      if (existsSync(f)) { const store = JSON.parse(await ctx.storage.readText(f)) as Record<string, Array<{ at: number; by: string; content: string }>>; arr = store[key] || [] }
    } catch { /* 无历史 */ }
    const list = arr.map((v) => ({ at: v.at, by: v.by, len: String(v.content ?? '').length })).sort((x, y) => y.at - x.at)
    void audit(ctx, 'ai:' + a.key.name, 'agent-versions', sandbox + '/' + scopeRelOf(a) + path, 'via=' + a.user.username)
    json(res, 200, { ok: true, versions: list }, extra)
  }, 'agent-versions'))

  /* M2：沙箱版本恢复 */
  svc.route('/privhub/api/agent/v1/versions/restore', withAgent(async (ctx, env, a, req, res, extra) => {
    if (req.method !== 'POST') return json(res, 405, { ok: false, code: 'AGENT-4001', error: 'method not allowed', hint: '仅 POST', requestId: env.rid }, extra)
    let body: any
    try { body = JSON.parse(await readBody(req, 1024 * 1024)) } catch { return json(res, 400, { ok: false, code: 'AGENT-4001', error: 'invalid json', hint: '请求体不是合法 JSON', requestId: env.rid }, extra) }
    const path = relOf(String(body.path ?? ''))
    const at = Number(body.at)
    if (!path || !at) return json(res, 400, { ok: false, code: 'AGENT-4001', error: '参数缺失', hint: 'path 与 at 必填（at 来自版本列表）', requestId: env.rid }, extra)
    const sandbox = sandboxDirOf(ctx, a.key)
    if (sandbox === null) return sandboxMissing(env, res, extra)
    const scopeRel = scopeRelOf(a)
    const f = join(rootDir, 'data', 'versions.json')
    let store = {} as Record<string, Array<{ at: number; by: string; content: string }>>
    let ver: { at: number; by: string; content: string } | null = null
    try {
      if (existsSync(f)) store = JSON.parse(await ctx.storage.readText(f))
      const key = sandbox + '|' + scopeRel + path
      ver = (store[key] || []).find((v) => v.at === at) ?? null
    } catch { /* 版本不存在 */ }
    if (!ver) return json(res, 404, { ok: false, code: 'AGENT-4041', error: '版本不存在', hint: '该路径在此时间点无版本记录', requestId: env.rid }, extra)
    const content = String(ver.content ?? '')
    const lockKey = sandbox + '|' + scopeRel + path
    const g = await gateAcquire(env, res, extra)
    if (!g) return
    const qExtra: Record<string, string> = { 'x-queue-limit': String(m2cfg.queueCapacity) }
    if (g.g.position > 0) { qExtra['x-queue-position'] = String(g.g.position); qExtra['x-queue-wait-ms'] = String(g.g.waitMs) }
    try {
      const out: any = await locks.run(lockKey, async () => {
        const abs = await resolvePersonal(ctx, sandbox, a.key, path)
        if (abs === null) return { status: 400, code: 'AGENT-4001', hint: '目标路径越界或父目录不可解析' }
        const existed = existsSync(abs)
        let oldPlain = 0
        if (existed) { const s = await stat(abs); oldPlain = s.size - (await ctx.storage.isEncrypted(abs) ? 36 : 0) }
        const prq = await quota.precheck(ctx, a.user.username, Buffer.byteLength(content), oldPlain)
        if (!prq.ok) return { status: 429, code: 'AGENT-4292', hint: '沙箱配额超限（' + fmtBytes(prq.usage) + ' / ' + fmtBytes(prq.quota) + '）', usage: prq.usage, quota: prq.quota }
        const tmp = abs + '.part-' + Date.now()
        await ctx.storage.writeBuffer(tmp, Buffer.from(content, 'utf8'))
        await rename(tmp, abs).catch(async (e) => { await unlink(tmp).catch(() => {}); throw e })
        await quota.add(ctx, a.user.username, Buffer.byteLength(content) - oldPlain)
        const key = sandbox + '|' + scopeRel + path
        const arr = store[key] || []
        arr.push({ at: Date.now(), by: 'ai:' + a.key.name, content })
        while (arr.length > m2cfg.snapshotMax) arr.shift()
        store[key] = arr
        await mkdir(join(rootDir, 'data'), { recursive: true })
        await ctx.storage.writeText(join(rootDir, 'data', 'versions.json'), JSON.stringify(store, null, 2))
        return { ok: true, size: Buffer.byteLength(content) }
      })
      if (!out.ok) {
        return json(res, out.status as number, { ok: false, code: out.code, error: out.hint, hint: out.hint, requestId: env.rid, ...(out.usage !== undefined ? { usage: out.usage, quota: out.quota } : {}) }, { ...extra, ...qExtra })
      }
      const rel = sandbox + '/' + scopeRel + path
      void audit(ctx, 'ai:' + a.key.name, 'agent-version-restore', rel, 'from=' + at + ' via=' + a.user.username)
      json(res, 200, { ok: true, at: Date.now(), size: out.size }, { ...extra, ...qExtra })
    } finally {
      g.g.release()
    }
  }, 'agent-versions-restore'))

  /* ---------- 管理：key 生命周期（admin 登录态） ---------- */

  const adminOnly = (env: Env, req: IncomingMessage, res: ServerResponse): { username: string; role: string } | null => requireAdmin(ctxRef, req, res, env)

  function scopeOf(body: any): { kind: AgentKeyScope['kind']; project: string; path: string } | null {
    const kind = String(body?.scope?.kind ?? 'project')
    if (!['all', 'project', 'directory'].includes(kind)) return null
    const project = String(body?.scope?.project ?? '').trim()
    const path = relOf(String(body?.scope?.path ?? ''))
    if (kind === 'all') return { kind: 'all', project: '', path: '' }
    if (!ctxRef.privhub.isValidProjectName(project)) return null
    if (kind === 'directory' && path !== '' && !validRelPath(path)) return null
    return { kind, project, path }
  }

  async function createKey(ctx: Context, createdBy: string, type: 'user' | 'admin', body: any): Promise<{ ok: true; rec: AgentKey; plain: string } | { ok: false; status: number; code: string; hint: string }> {
    const name = String(body.name ?? '').slice(0, 64).trim() || 'agent-key-' + Date.now().toString(36)
    const username = String(body.username ?? '')
    const user = ctx.privhub.users.get(username)
    if (!user) return { ok: false, status: 400, code: 'AGENT-4001', hint: '绑定用户不存在' }
    const scope = scopeOf(body)
    if (!scope) return { ok: false, status: 400, code: 'AGENT-4001', hint: 'scope 非法（kind ∈ all|project|directory）' }
    if (scope.kind !== 'all') {
      if (!ctx.privhub.canAccess(user as never, scope.project)) return { ok: false, status: 400, code: 'AGENT-4034', hint: 'scope 项目超出绑定用户可见范围（' + username + ' 无权访问 ' + scope.project + '）' }
      if (scope.kind === 'directory') {
        const p = await ctx.privhub.resolveReal(scope.project, scope.path)
        if (p === null) return { ok: false, status: 400, code: 'AGENT-4001', hint: 'directory scope 路径不存在' }
      }
    }
    const ipWhitelist = Array.isArray(body.ipWhitelist) ? body.ipWhitelist.map((s: unknown) => String(s).trim()).filter(Boolean) : []
    const plain = KEY_PREFIX + randomBytes(KEY_BYTES).toString('hex')
    const rec: AgentKey = {
      id: 'k_' + randomBytes(8).toString('hex'),
      name, type, username,
      scope: scope.kind === 'all' ? { kind: 'all', project: '', path: '' } : { kind: scope.kind, project: scope.project, path: scope.kind === 'directory' ? scope.path : '' },
      status: 'active',
      expiresAt: monthEnd(),
      ipWhitelist,
      keyHash: 'sha256:' + sha256(plain),
      createdBy,
      at: Date.now(),
      lastUsedAt: 0,
      usageCount: 0,
    }
    const keys = await loadKeys(ctx)
    keys.push(rec)
    await saveKeys(ctx, keys)
    return { ok: true, rec, plain }
  }

  svc.route('/privhub/api/agent/v1/keys', wrap(async (ctx, env, req, res) => {
    const admin = adminOnly(env, req, res)
    if (!admin) return
    if (req.method === 'GET') {
      const keys = await loadKeys(ctx)
      json(res, 200, {
        ok: true,
        keys: keys.map((k) => ({ id: k.id, name: k.name, username: k.username, scope: k.scope, status: k.status, expiresAt: k.expiresAt, ipWhitelist: k.ipWhitelist, keyMask: maskKey(KEY_PREFIX + k.keyHash.slice(7)), type: k.type, createdBy: k.createdBy, at: k.at, lastUsedAt: k.lastUsedAt, usageCount: k.usageCount })),
      }, { 'x-request-id': env.rid })
      return
    }
    if (req.method === 'POST') {
      let body: any
      try { body = JSON.parse(await readBody(req, 1024 * 1024)) } catch { return json(res, 400, { ok: false, code: 'AGENT-4001', error: 'invalid json', hint: '请求体不是合法 JSON', requestId: env.rid }, { 'x-request-id': env.rid }) }
      const r = await createKey(ctx, admin.username, 'admin', body)
      if (!r.ok) return json(res, r.status, { ok: false, code: r.code, error: r.hint, hint: r.hint, requestId: env.rid }, { 'x-request-id': env.rid })
      void audit(ctx, admin.username, 'agent-key-create', 'key:' + r.rec.id, 'user=' + r.rec.username + ' scope=' + JSON.stringify(r.rec.scope) + ' name=' + r.rec.name)
      json(res, 200, { ok: true, key: r.plain, id: r.rec.id, name: r.rec.name, username: r.rec.username, scope: r.rec.scope, expiresAt: r.rec.expiresAt, note: '明文仅此一次返回，请妥善保存' }, { 'x-request-id': env.rid })
      return
    }
    json(res, 405, { ok: false, code: 'AGENT-4001', error: 'method not allowed', hint: '仅 GET/POST', requestId: env.rid }, { 'x-request-id': env.rid })
  }, 'agent-keys'))

  svc.route('/privhub/api/agent/v1/keys/revoke', wrap(async (ctx, env, req, res) => {
    const admin = adminOnly(env, req, res); if (!admin) return
    if (req.method !== 'POST') return json(res, 405, { ok: false, code: 'AGENT-4001', error: 'method not allowed', hint: '仅 POST', requestId: env.rid }, { 'x-request-id': env.rid })
    let body: any; try { body = JSON.parse(await readBody(req, 1024 * 1024)) } catch { return json(res, 400, { ok: false, code: 'AGENT-4001', error: 'invalid json', requestId: env.rid }, { 'x-request-id': env.rid }) }
    const keys = await loadKeys(ctx)
    const rec = keys.find((k) => k.id === body.id)
    if (!rec) return json(res, 404, { ok: false, code: 'AGENT-4041', error: 'key 不存在', requestId: env.rid }, { 'x-request-id': env.rid })
    rec.status = 'revoked'
    await saveKeys(ctx, keys)
    void audit(ctx, admin.username, 'agent-key-revoke', 'key:' + rec.id, 'user=' + rec.username)
    json(res, 200, { ok: true }, { 'x-request-id': env.rid })
  }, 'agent-keys-revoke'))

  for (const [action, status] of [['suspend', 'suspended'], ['resume', 'active']] as const) {
    svc.route('/privhub/api/agent/v1/keys/' + action, wrap(async (ctx, env, req, res) => {
      const admin = adminOnly(env, req, res); if (!admin) return
      if (req.method !== 'POST') return json(res, 405, { ok: false, code: 'AGENT-4001', error: 'method not allowed', requestId: env.rid }, { 'x-request-id': env.rid })
      let body: any; try { body = JSON.parse(await readBody(req, 1024 * 1024)) } catch { return json(res, 400, { ok: false, code: 'AGENT-4001', error: 'invalid json', requestId: env.rid }, { 'x-request-id': env.rid }) }
      const keys = await loadKeys(ctx)
      const rec = keys.find((k) => k.id === body.id)
      if (!rec) return json(res, 404, { ok: false, code: 'AGENT-4041', error: 'key 不存在', requestId: env.rid }, { 'x-request-id': env.rid })
      if (rec.status === 'revoked') return json(res, 400, { ok: false, code: 'AGENT-4001', error: '已吊销的 key 不可操作', requestId: env.rid }, { 'x-request-id': env.rid })
      rec.status = status
      await saveKeys(ctx, keys)
      void audit(ctx, admin.username, 'agent-key-' + action, 'key:' + rec.id, 'user=' + rec.username)
      json(res, 200, { ok: true, status }, { 'x-request-id': env.rid })
    }, 'agent-keys-' + action))
  }

  svc.route('/privhub/api/agent/v1/keys/rotate', wrap(async (ctx, env, req, res) => {
    const admin = adminOnly(env, req, res); if (!admin) return
    if (req.method !== 'POST') return json(res, 405, { ok: false, code: 'AGENT-4001', error: 'method not allowed', requestId: env.rid }, { 'x-request-id': env.rid })
    let body: any; try { body = JSON.parse(await readBody(req, 1024 * 1024)) } catch { return json(res, 400, { ok: false, code: 'AGENT-4001', error: 'invalid json', requestId: env.rid }, { 'x-request-id': env.rid }) }
    const keys = await loadKeys(ctx)
    const src = keys.find((k) => k.id === body.id)
    if (!src) return json(res, 404, { ok: false, code: 'AGENT-4041', error: 'key 不存在', requestId: env.rid }, { 'x-request-id': env.rid })
    if (src.status === 'revoked') return json(res, 400, { ok: false, code: 'AGENT-4001', error: '已吊销的 key 不可轮换', requestId: env.rid }, { 'x-request-id': env.rid })
    const r = await createKey(ctx, admin.username, src.type, { name: src.name, username: src.username, scope: src.scope, ipWhitelist: src.ipWhitelist })
    if (!r.ok) return json(res, r.status, { ok: false, code: r.code, error: r.hint, requestId: env.rid }, { 'x-request-id': env.rid })
    void audit(ctx, admin.username, 'agent-key-rotate', 'key:' + src.id, '-> key:' + r.rec.id + '（旧 key 到期自然失效）')
    json(res, 200, { ok: true, key: r.plain, id: r.rec.id, expiresAt: r.rec.expiresAt, note: '旧 key 保留至自然到期（平滑迁移）' }, { 'x-request-id': env.rid })
  }, 'agent-keys-rotate'))

  /* ---------- 用户自助 my-keys（登录态） ---------- */

  svc.route('/privhub/api/agent/v1/my-keys', wrap(async (ctx, env, req, res) => {
    const u = ctx.privhub.requireUser(req, res)
    if (!u) return json(res, 401, { ok: false, code: 'AGENT-4010', error: '未登录', hint: '请先登录（浏览器会话）', requestId: env.rid }, { 'x-request-id': env.rid })
    if (req.method === 'GET') {
      const keys = await loadKeys(ctx)
      json(res, 200, { ok: true, keys: keys.filter((k) => k.username === u.username && k.type === 'user').map((k) => ({ id: k.id, name: k.name, scope: k.scope, status: k.status, expiresAt: k.expiresAt, keyMask: maskKey(KEY_PREFIX + k.keyHash.slice(7)), at: k.at, lastUsedAt: k.lastUsedAt, usageCount: k.usageCount })) }, { 'x-request-id': env.rid })
      return
    }
    if (req.method === 'POST') {
      let body: any; try { body = JSON.parse(await readBody(req, 1024 * 1024)) } catch { return json(res, 400, { ok: false, code: 'AGENT-4001', error: 'invalid json', requestId: env.rid }, { 'x-request-id': env.rid }) }
      body.username = u.username
      const r = await createKey(ctx, u.username, 'user', body)
      if (!r.ok) return json(res, r.status, { ok: false, code: r.code, error: r.hint, hint: r.hint, requestId: env.rid }, { 'x-request-id': env.rid })
      void audit(ctx, u.username, 'agent-key-create', 'key:' + r.rec.id, '自助申请 scope=' + JSON.stringify(r.rec.scope))
      json(res, 200, { ok: true, key: r.plain, id: r.rec.id, name: r.rec.name, scope: r.rec.scope, expiresAt: r.rec.expiresAt, note: '明文仅此一次返回；密钥按自然月周期自动失效，到期前请续期' }, { 'x-request-id': env.rid })
      return
    }
    if (req.method === 'DELETE') {
      let body: any; try { body = JSON.parse(await readBody(req, 1024 * 1024)) } catch { return json(res, 400, { ok: false, code: 'AGENT-4001', error: 'invalid json', requestId: env.rid }, { 'x-request-id': env.rid }) }
      const keys = await loadKeys(ctx)
      const rec = keys.find((k) => k.id === body.id && k.username === u.username)
      if (!rec) return json(res, 404, { ok: false, code: 'AGENT-4041', error: 'key 不存在', hint: '仅可吊销自己的 key', requestId: env.rid }, { 'x-request-id': env.rid })
      rec.status = 'revoked'
      await saveKeys(ctx, keys)
      void audit(ctx, u.username, 'agent-key-revoke', 'key:' + rec.id, '自助吊销')
      json(res, 200, { ok: true }, { 'x-request-id': env.rid })
      return
    }
    json(res, 405, { ok: false, code: 'AGENT-4001', error: 'method not allowed', hint: '仅 GET/POST/DELETE', requestId: env.rid }, { 'x-request-id': env.rid })
  }, 'agent-my-keys'))

  /* ---------- 沙箱回收站（admin 登录态） ---------- */

  /**
   * 沙箱条目识别：回收站记录的 project 命中某个账号的个人空间目录名。
   *
   * 只认「由智能体删除」的记录（deletedBy 前缀 ai:）——沙箱现在就是用户的
   * 个人空间，用户自己在网页上删的文件也会落进同一张回收站表；若不加这层区分，
   * 管理员会在「智能体回收站」里看到用户自己的私人文书条目，属于越权可见。
   */
  const sandboxOwnerOf = (proj: string): string | null => {
    for (const uname of ctx.privhub.users.keys()) {
      const u = ctx.privhub.users.get(uname) as { personalDir?: string } | undefined
      if (String(u?.personalDir ?? '').trim() === proj) return uname
    }
    return null
  }

  svc.route('/privhub/api/agent/v1/trash', wrap(async (ctx, env, req, res) => {
    const admin = adminOnly(env, req, res); if (!admin) return
    const url = new URL(req.url ?? '/', 'http://x')
    const user = url.searchParams.get('user') ?? ''
    const list = await ctx.privhub.loadTrash()
    const mine = list.filter((t) => {
      if (!String(t.deletedBy ?? '').startsWith('ai:')) return false
      const owner = sandboxOwnerOf(t.project)
      if (owner === null) return false
      return !user || owner === user
    })
    json(res, 200, { ok: true, trash: mine }, { 'x-request-id': env.rid })
  }, 'agent-trash'))

  for (const [op, fn] of [['restore', 'restoreTrash'], ['purge', 'purgeTrash']] as const) {
    svc.route('/privhub/api/agent/v1/trash/' + op, wrap(async (ctx, env, req, res) => {
      const admin = adminOnly(env, req, res); if (!admin) return
      if (req.method !== 'POST') return json(res, 405, { ok: false, code: 'AGENT-4001', error: 'method not allowed', requestId: env.rid }, { 'x-request-id': env.rid })
      let body: any; try { body = JSON.parse(await readBody(req, 1024 * 1024)) } catch { return json(res, 400, { ok: false, code: 'AGENT-4001', error: 'invalid json', requestId: env.rid }, { 'x-request-id': env.rid }) }
      const tId = String(body.id ?? '')
      const rec = (await ctx.privhub.loadTrash()).find((t) => t.id === tId)
      const ok = await (ctx.privhub[fn] as (id: string) => Promise<boolean>)(tId)
      if (!ok) return json(res, 404, { ok: false, code: 'AGENT-4041', error: '记录不存在或操作失败', requestId: env.rid }, { 'x-request-id': env.rid })
      // 配额按【账号】记账（沙箱即该账号的个人空间），故用沙箱归属者重算
      const owner = rec ? sandboxOwnerOf(rec.project) : null
      if (owner !== null) await quota.recalc(ctx, owner)
      void audit(ctx, admin.username, 'agent-trash-' + op, 'trash:' + tId, rec ? rec.project + '/' + rec.relPath : '')
      json(res, 200, { ok: true }, { 'x-request-id': env.rid })
    }, 'agent-trash-' + op))
  }

  console.log('[assembly] privhub-files-agent 已挂载（M1+M2：' + KEY_PREFIX + ' 密钥 / 沙箱=个人空间 / 配额限流 / 版本快照）')
}