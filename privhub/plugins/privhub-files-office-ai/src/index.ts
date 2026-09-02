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

async function readBody(req: any): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

interface ApiKey { key: string; label: string; at: number }

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

/** 从请求头取 X-Office-Key，校验通过返回 label；否则 null。 */
async function authKey(ctx: Context, req: any): Promise<string | null> {
  const key = String((req.headers as Record<string, string>)['x-office-key'] ?? '')
  if (!key) return null
  const keys = await loadKeys(ctx)
  const hit = keys.find((k) => k.key === key)
  return hit ? hit.label : null
}

export function apply(ctx: Context): void {
  const svc = ctx.privhub
  const office = ctx.office

  const audit = async (user: string, action: string, target: string, detail?: string): Promise<void> => {
    const rec = await ctx.audit.log({ user, action, target, detail }).catch(() => null)
    if (rec) ctx.emit('audit:logged', rec)
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
    const label = await authKey(ctx, req)
    if (!label) return json(res, 401, { ok: false, error: '无效或缺失 X-Office-Key' })
    const url = new URL(req.url ?? '/', 'http://x')
    const project = url.searchParams.get('project') ?? ''
    const path = url.searchParams.get('path') ?? ''
    if (project === '' || path === '') return json(res, 400, { ok: false, error: '参数不完整' })
    const u = { username: 'ai:' + label, role: 'admin', projects: [] as string[] }
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限访问该项目' })
    const r = await office.read(project, path)
    if (r.ok) void audit('ai:' + label, 'office-read', project + '/' + path)
    json(res, r.ok ? 200 : 400, r)
  }, 'ai-office-read')

  /* ---- AI 写入 ---- */
  svc.route('/privhub/api/ai/office/write', async (req, res) => {
    const label = await authKey(ctx, req)
    if (!label) return json(res, 401, { ok: false, error: '无效或缺失 X-Office-Key' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = String(body.project ?? '')
    const path = String(body.path ?? '')
    const content = body.content
    if (project === '' || path === '') return json(res, 400, { ok: false, error: '参数不完整' })
    const u = { username: 'ai:' + label, role: 'admin', projects: [] as string[] }
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限访问该项目' })
    const r = await office.write(project, path, content)
    if (r.ok) void audit('ai:' + label, 'office-write', project + '/' + path)
    json(res, r.ok ? 200 : 400, r)
  }, 'ai-office-write')

  /* ---- 管理：密钥列表/生成/吊销（admin） ---- */
  svc.route('/privhub/api/ai/office/keys', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (u.role !== 'admin') return json(res, 403, { ok: false, error: '仅管理员' })
    if (req.method === 'GET') {
      const keys = await loadKeys(ctx)
      json(res, 200, { ok: true, keys: keys.map((k) => ({ label: k.label, at: k.at, key: k.key })) })
      return
    }
    if (req.method === 'POST') {
      let body: any
      try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
      const label = String(body.label ?? '').slice(0, 50) || 'ai-key-' + Date.now().toString(36)
      const key = 'pho_' + randomBytes(16).toString('hex')
      const keys = await loadKeys(ctx)
      keys.push({ key, label, at: Date.now() })
      await saveKeys(ctx, keys)
      void audit(u.username, 'ai-key-create', label)
      json(res, 200, { ok: true, key, label })
      return
    }
    if (req.method === 'DELETE') {
      let body: any
      try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
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
