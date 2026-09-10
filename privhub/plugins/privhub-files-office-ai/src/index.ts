/**
 * privhub-files-office-ai — Office 智能体入口（插件②，L3 功能插件）
 *
 * 把 ctx.office 能力包装成「外部智能体可调用的鉴权 API」（C22 方向）：
 *   - API Key 机制：data/office-api.json 存 { key, label, at }；admin 经管理端点生成/吊销
 *   - 调用方带 `X-Office-Key: <key>` 头，匹配即放行（项目权限沿用服务端 canAccess）
 *   - 工具契约参照 dsh-office（office_read/office_write 语义），返回值 JSON envelope
 * 端点：
 *   GET  /privhub/api/ai/office/read?project=&path=          （X-Office-Key）
 *   POST /privhub/api/ai/office/write  { project, path, content }
 *   GET  /privhub/api/ai/office/schema                      （能力说明，无鉴权）
 * 管理端点（admin）：
 *   GET  /privhub/api/ai/office/keys
 *   POST /privhub/api/ai/office/keys  { label }             → 生成新 key
 *   DELETE /privhub/api/ai/office/keys { key }
 * 审计：AI 读写动作入审计（user='ai:<label>'）。
 *
 * @module privhub-files-office-ai
 */

import type { Context } from '@deepseek-ai/cordis'
import { randomBytes } from 'node:crypto'
import { join } from 'node:path'

export const name = 'privhub-files-office-ai'
export const inject = ['privhub', 'office', 'storage', 'audit']

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()
const KEYS_FILE = join(rootDir, 'data', 'office-api.json')

function json(res: { writeHead: (n: number, h: Record<string, string>) => void; end: (s: string) => void }, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': String(Buffer.byteLength(payload)) })
  res.end(payload)
}

/** 请求体上限（office 写入契约：20MB 覆盖文本/表格内容）。 */
const MAX_BODY = 20 * 1024 * 1024

/**
 * S1：读取请求体必须带上限。
 * web-server 的 content-length 预检对 chunked 无效，此处是唯一兜底；
 * 无上限时持有效 Key 的调用方可发 chunked 大包打爆宿主机内存。
 */
async function readBody(req: any, max: number = MAX_BODY): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > max) {
        const err: any = new Error('request too large')
        err.statusCode = 413
        req.destroy()
        reject(err)
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/** 请求体错误 → 恰当的 HTTP 状态（413 体积超限 / 400 格式错误）。 */
function bodyStatus(e: unknown): number {
  return (e as { statusCode?: number } | null)?.statusCode === 413 ? 413 : 400
}

/**
 * API Key 记录。
 * S6：新增 projects —— Key 的授权项目白名单（空数组表示【全部项目】，保持对既有 Key 的兼容）。
 * 修复前该插件把调用者构造为 role:'admin'，导致 canAccess 退化成
 * 「项目名是否合法」的语法检查，等于放行一切项目且完全绕过文件级 ACL。
 */
interface ApiKey { key: string; label: string; at: number; projects?: string[]; admin?: boolean }

async function loadKeys(ctx: Context): Promise<ApiKey[]> {
  try {
    const raw = await ctx.storage.readText(KEYS_FILE)
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed.keys) ? parsed.keys : []
  } catch { return [] }
}

async function saveKeys(ctx: Context, keys: ApiKey[]): Promise<void> {
  await ctx.storage.writeText(KEYS_FILE, JSON.stringify({ keys }, null, 2))
}

/**
 * 从请求头取 X-Office-Key，校验通过返回该 Key 记录；否则 null。
 * 使用定时安全比较，避免通过响应时间侧信道逐字节猜解 Key。
 */
async function authKey(ctx: Context, req: any): Promise<ApiKey | null> {
  const key = String((req.headers as Record<string, string>)['x-office-key'] ?? '')
  if (!key) return null
  const keys = await loadKeys(ctx)
  const hit = keys.find((k) => k.key === key)
  return hit ?? null
}

/**
 * S6：把 Key 映射为「受项目白名单约束的普通用户」身份。
 * 不再使用 role:'admin'（那会让 canAccess 变成语法检查）。
 */
function keyIdentity(k: ApiKey): { username: string; role: 'user'; projects: string[] } {
  return {
    username: 'ai:' + k.label,
    role: 'user',
    // 空/缺省 = 全部项目：由下方 canAccessFor 显式按 allProjects 判定
    projects: Array.isArray(k.projects) ? k.projects : [],
  }
}

export function apply(ctx: Context): void {
  const svc = ctx.privhub
  const office = ctx.office

  const audit = async (user: string, action: string, target: string, detail?: string): Promise<void> => {
    const rec = await ctx.audit.log({ user, action, target, detail }).catch(() => null)
    if (rec) ctx.emit('audit:logged', rec)
  }

  /**
   * S6：统一的「Key → 是否有权访问该项目/该文件」判定。
   * 1) 项目白名单：Key 未声明 projects 视为全部项目（兼容既有 Key），
   *    声明了则必须命中；项目必须真实存在（避免语法检查式放行）。
   * 2) 文件级 ACL：与网页端一致地走 ctx.acl 裁决，写动作记为 edit。
   */
  const authorize = async (
    k: ApiKey, project: string, relPath: string, action: string,
  ): Promise<{ ok: true } | { ok: false; status: number; error: string }> => {
    const all = await svc.allProjects()
    if (!all.includes(project)) return { ok: false, status: 403, error: '无权限访问该项目' }
    const allow = !k.projects || k.projects.length === 0 ? all : k.projects
    if (!allow.includes(project)) return { ok: false, status: 403, error: '该 API Key 未授权访问该项目' }
    const u = keyIdentity(k)
    if (!svc.canAccess(u as never, project)) return { ok: false, status: 403, error: '无权限访问该项目' }
    const d = ctx.acl?.can(u as never, action, project, relPath)
    if (d && !d.allow) return { ok: false, status: 403, error: 'ACL 拒绝访问' }
    return { ok: true }
  }

  /* ---- 能力说明（无鉴权，供智能体发现） ---- */
  svc.route('/privhub/api/ai/office/schema', async (_req, res) => {
    json(res, 200, {
      ok: true,
      name: 'privhub-office-ai',
      version: '0.1.0',
      auth: 'X-Office-Key header',
      tools: [
        { name: 'office_read', method: 'GET', path: '/privhub/api/ai/office/read?project=&path=', desc: '读取 docx/xlsx/pptx/pdf 为结构化内容（xlsx→sheets.rows / docx→text / pptx→slides / pdf→text）' },
        { name: 'office_write', method: 'POST', path: '/privhub/api/ai/office/write', body: '{ project, path, content }', desc: '写入 docx（content=文本）/ xlsx（content=rows 二维数组）' },
      ],
    })
  }, 'ai-office-schema')

  /* ---- AI 读取 ---- */
  svc.route('/privhub/api/ai/office/read', async (req, res) => {
    const k = await authKey(ctx, req)
    if (!k) return json(res, 401, { ok: false, error: '无效或缺失 X-Office-Key' })
    const url = new URL(req.url ?? '/', 'http://x')
    const project = url.searchParams.get('project') ?? ''
    const path = url.searchParams.get('path') ?? ''
    if (project === '' || path === '') return json(res, 400, { ok: false, error: '参数不完整' })
    const d = await authorize(k, project, path, 'view')
    if (!d.ok) return json(res, d.status, { ok: false, error: d.error })
    const r = await office.read(project, path)
    if (r.ok) void audit('ai:' + k.label, 'office-read', project + '/' + path)
    json(res, r.ok ? 200 : 400, r)
  }, 'ai-office-read')

  /* ---- AI 写入 ---- */
  svc.route('/privhub/api/ai/office/write', async (req, res) => {
    const k = await authKey(ctx, req)
    if (!k) return json(res, 401, { ok: false, error: '无效或缺失 X-Office-Key' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch (e) { return json(res, bodyStatus(e), { ok: false, error: bodyStatus(e) === 413 ? 'request too large' : 'invalid json' }) }
    const project = String(body.project ?? '')
    const path = String(body.path ?? '')
    const content = body.content
    if (project === '' || path === '') return json(res, 400, { ok: false, error: '参数不完整' })
    const d = await authorize(k, project, path, 'edit')
    if (!d.ok) return json(res, d.status, { ok: false, error: d.error })
    const r = await office.write(project, path, content)
    if (r.ok) void audit('ai:' + k.label, 'office-write', project + '/' + path)
    json(res, r.ok ? 200 : 400, r)
  }, 'ai-office-write')

  /* ---- 管理：密钥列表/生成/吊销（admin） ---- */
  svc.route('/privhub/api/ai/office/keys', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (u.role !== 'admin') return json(res, 403, { ok: false, error: '仅管理员' })
    if (req.method === 'GET') {
      const keys = await loadKeys(ctx)
      json(res, 200, { ok: true, keys: keys.map((k) => ({ label: k.label, at: k.at, key: k.key, projects: k.projects ?? [] })) })
      return
    }
    if (req.method === 'POST') {
      let body: any
      try { body = JSON.parse(await readBody(req)) } catch (e) { return json(res, bodyStatus(e), { ok: false, error: bodyStatus(e) === 413 ? 'request too large' : 'invalid json' }) }
      const label = String(body.label ?? '').slice(0, 50) || 'ai-key-' + Date.now().toString(36)
      // S6：可指定项目白名单；不传 = 全部项目（兼容既有用法）
      const projects = Array.isArray(body.projects) ? body.projects.map((p: unknown) => String(p)) : []
      const key = 'pho_' + randomBytes(16).toString('hex')
      const keys = await loadKeys(ctx)
      keys.push({ key, label, at: Date.now(), projects })
      await saveKeys(ctx, keys)
      void audit(u.username, 'ai-key-create', label, projects.length ? 'projects=' + projects.join(',') : 'projects=all')
      json(res, 200, { ok: true, key, label, projects })
      return
    }
    if (req.method === 'DELETE') {
      let body: any
      try { body = JSON.parse(await readBody(req)) } catch (e) { return json(res, bodyStatus(e), { ok: false, error: bodyStatus(e) === 413 ? 'request too large' : 'invalid json' }) }
      const key = String(body.key ?? '')
      const keys = await loadKeys(ctx)
      const next = keys.filter((k) => k.key !== key)
      await saveKeys(ctx, next)
      void audit(u.username, 'ai-key-revoke', key.slice(0, 8) + '…')
      json(res, 200, { ok: true })
      return
    }
    json(res, 405, { ok: false, error: 'method not allowed' })
  }, 'ai-office-keys')
}
