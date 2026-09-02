/**
 * privhub-files-invite — 邀请链接（团队成员自助加入项目）
 *
 * 能力：
 *   POST   /api/invite/create?project=&expiresHours=   （admin）生成邀请码
 *   GET    /api/invite/list                            （admin）邀请列表
 *   DELETE /api/invite?code=                           （admin）撤销邀请
 *   GET    /api/invite/info?code=                      （任何人）查询邀请有效性（公开信息）
 *   POST   /api/invite/join { code }                   （登录用户）用码加入项目
 *
 * 数据：data/invites.json
 *
 * @module privhub-files-invite
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { json, readBody } from '../../privhub-core/src/index'

export const name = 'privhub-files-invite'
export const inject = ['storage', 'privhub']

interface Invite {
  code: string
  project: string
  createdBy: string
  createdAt: number
  expiresAt: number | null // null = 永久
}

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()
const FILE = join(rootDir, 'data', 'invites.json')

async function loadInvites(): Promise<Invite[]> {
  if (!existsSync(FILE)) return []
  try { return JSON.parse(await readFile(FILE, 'utf8')) as Invite[] } catch { return [] }
}
async function saveInvites(list: Invite[]): Promise<void> {
  await mkdir(dirname(FILE), { recursive: true })
  await writeFile(FILE, JSON.stringify(list, null, 2), 'utf8')
}
function genCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export function apply(ctx: Context): void {
  const svc = ctx.privhub as unknown as {
    route: (path: string, handler: (req: unknown, res: unknown) => Promise<void> | void, name?: string) => void
    requireUser: (req: unknown, res: unknown) => { username: string; role: string; projects?: string[] } | null
    isValidProjectName: (n: string) => boolean
    users: Map<string, { username: string; displayName: string; role: string; projects: string[] }>
    saveUsers: () => Promise<void>
  }

  const adminOnly = (req: unknown, res: unknown): { username: string } | null => {
    const u = svc.requireUser(req, res)
    if (!u) return null
    if (u.role !== 'admin') { json(res, 403, { ok: false, error: '仅管理员' }); return null }
    return u
  }

  /* 创建邀请（admin） */
  svc.route('/privhub/api/invite/create', async (req, res) => {
    const u = adminOnly(req, res)
    if (!u) return
    const url = new URL(String((req as { url?: string }).url ?? '/'), 'http://x')
    const project = url.searchParams.get('project') ?? ''
    const expiresHours = Number(url.searchParams.get('expiresHours') ?? '0')
    if (!svc.isValidProjectName(project)) return json(res, 400, { ok: false, error: '项目名无效' })
    const list = await loadInvites()
    // 同项目已有永久邀请则复用
    const existing = list.find(i => i.project === project && i.expiresAt === null)
    if (existing) return json(res, 200, { ok: true, code: existing.code, reused: true })
    const code = genCode()
    list.push({
      code,
      project,
      createdBy: u.username,
      createdAt: Date.now(),
      expiresAt: expiresHours > 0 ? Date.now() + expiresHours * 3600 * 1000 : null,
    })
    await saveInvites(list)
    json(res, 200, { ok: true, code, reused: false })
  }, 'invite-create')

  /* 邀请列表（admin） */
  svc.route('/privhub/api/invite/list', async (_req, res) => {
    const u = adminOnly(_req, res)
    if (!u) return
    json(res, 200, { ok: true, invites: await loadInvites() })
  }, 'invite-list')

  /* 撤销（admin） */
  svc.route('/privhub/api/invite', async (req, res) => {
    const u = adminOnly(req, res)
    if (!u) return
    if (req.method !== 'DELETE') return json(res, 405, { ok: false, error: 'method not allowed' })
    const url = new URL(String((req as { url?: string }).url ?? '/'), 'http://x')
    const code = url.searchParams.get('code') ?? ''
    const list = await loadInvites()
    const next = list.filter(i => i.code !== code)
    if (next.length === list.length) return json(res, 404, { ok: false, error: '邀请不存在' })
    await saveInvites(next)
    json(res, 200, { ok: true })
  }, 'invite-delete')

  /* 查询邀请有效性（公开；仅返回是否可用，不泄露项目外信息） */
  svc.route('/privhub/api/invite/info', async (req, res) => {
    const url = new URL(String((req as { url?: string }).url ?? '/'), 'http://x')
    const code = url.searchParams.get('code') ?? ''
    const list = await loadInvites()
    const inv = list.find(i => i.code === code)
    if (!inv) return json(res, 200, { ok: true, valid: false, reason: 'not-found' })
    if (inv.expiresAt !== null && Date.now() > inv.expiresAt) return json(res, 200, { ok: true, valid: false, reason: 'expired' })
    json(res, 200, { ok: true, valid: true, project: inv.project })
  }, 'invite-info')

  /* 用码加入项目（登录用户） */
  svc.route('/privhub/api/invite/join', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    let body: { code?: string }
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const list = await loadInvites()
    const inv = list.find(i => i.code === String(body.code ?? ''))
    if (!inv) return json(res, 400, { ok: false, error: '邀请码无效' })
    if (inv.expiresAt !== null && Date.now() > inv.expiresAt) return json(res, 400, { ok: false, error: '邀请已过期，请联系管理员重新邀请' })
    const rec = svc.users.get(u.username)
    if (!rec) return json(res, 404, { ok: false, error: '用户不存在' })
    if (!rec.projects.includes(inv.project)) {
      rec.projects.push(inv.project)
      await svc.saveUsers()
    }
    json(res, 200, { ok: true, project: inv.project })
  }, 'invite-join')
}
