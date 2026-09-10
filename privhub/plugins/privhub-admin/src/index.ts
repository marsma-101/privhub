/**
 * 私域枢纽管理插件（privhub-admin）
 *
 * 管理员域接口：项目新建/删除（软删除进回收站）+ 用户管理
 * （列表 / 改角色与项目权限 / 删除用户 / 重置密码）。
 *
 * @module privhub-admin
 */

import type { Context } from '@deepseek-ai/cordis'
import { json, readBody, hashPassword } from '../../privhub-core/src/index'

export const name = 'privhub-admin'
export const inject = ['privhub', 'audit', 'eventBus']

export function apply(ctx: Context): void {
  /* E1 事件声明 */
  ctx.eventBus.declareEmit('audit:logged', 'privhub-admin', '写操作成功审计广播（S1 闭环）')
  const svc = ctx.privhub

  /* 审计埋点（F13 契约）：成功后写审计并广播 audit:logged；失败静默，不影响主流程 */
  const audit = async (u: { username: string }, action: string, target: string, detail?: string): Promise<void> => {
    const rec = await ctx.audit.log({ user: u.username, action, target, detail }).catch(() => null)
    if (rec) ctx.emit('audit:logged', rec)
  }

  /* 新建项目（管理员） */
  svc.route('/privhub/api/project-create', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (u.role !== 'admin') return json(res, 403, { ok: false, error: '仅管理员可新建项目' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const ok = await svc.createProject(String(body.name ?? '').trim())
    json(res, ok ? 200 : 400, ok ? { ok: true } : { ok: false, error: '项目名无效或已存在' })
    if (ok) void audit(u, 'project-create', String(body.name ?? '').trim())
  }, 'project-create')

  /* 删除项目（管理员）——软删除，整个项目进回收站，可恢复 */
  svc.route('/privhub/api/project-delete', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (u.role !== 'admin') return json(res, 403, { ok: false, error: '仅管理员可删除项目' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const ok = await svc.moveProjectToTrash(String(body.name ?? ''), u.username)
    json(res, ok ? 200 : 400, ok ? { ok: true } : { ok: false, error: '移入回收站失败' })
    if (ok) void audit(u, 'project-delete', String(body.name ?? ''))
  }, 'project-delete')

  /* 用户管理：列出所有用户（管理员） */
  svc.route('/privhub/api/admin/users', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (u.role !== 'admin') return json(res, 403, { ok: false, error: '仅管理员' })
    const users = [...svc.users.values()].map((x) => ({ username: x.username, displayName: x.displayName, role: x.role, projects: x.projects }))
    json(res, 200, { ok: true, users, allProjects: await svc.allProjects() })
  }, 'admin-users')

  /* 用户管理：更新角色/项目权限（管理员） */
  svc.route('/privhub/api/admin/user-update', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (u.role !== 'admin') return json(res, 403, { ok: false, error: '仅管理员' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const username = String(body.username ?? '')
    const rec = svc.users.get(username)
    if (!rec) return json(res, 404, { ok: false, error: '用户不存在' })
    if (body.role === 'admin' || body.role === 'user') rec.role = body.role
    if (Array.isArray(body.projects)) rec.projects = [...new Set(body.projects.filter((p: unknown) => typeof p === 'string'))]
    if (typeof body.displayName === 'string' && body.displayName.trim() !== '') rec.displayName = body.displayName.trim()
    await svc.saveUsers()
    json(res, 200, { ok: true })
    void audit(u, 'user-update', username, 'role=' + rec.role + ' projects=[' + rec.projects.join(',') + ']')
  }, 'admin-user-update')

  /* 用户管理：删除用户（管理员） */
  svc.route('/privhub/api/admin/user-delete', async (req, res) => {
    const u = svc.requireUser(req, res)
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
    void audit(u, 'user-delete', username)
  }, 'admin-user-delete')

  /* 用户管理：重置密码（管理员，防止用户忘记密码） */
  svc.route('/privhub/api/admin/user-reset-password', async (req, res) => {
    const u = svc.requireUser(req, res)
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
    for (const [token, entry] of svc.sessions) {
      if (entry.username === username) svc.sessions.delete(token)
    }
    await svc.saveUsers()
    await svc.saveSessions()
    json(res, 200, { ok: true })
    void audit(u, 'user-reset-password', username)
  }, 'admin-user-reset-password')
}
