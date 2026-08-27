/**
 * 私域枢纽认证插件（privhub-auth）
 *
 * 登录 / 注册 / 退出 / 当前用户。共享状态（users/sessions/防爆破表）
 * 全部来自 privhub-core 服务（ctx.privhub），本插件只做协议编排。
 *
 * @module privhub-auth
 */

import { randomBytes } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import { json, readBody, tokenOf, hashPassword, verifyPassword } from '../../privhub-core/src/index'

export const name = 'privhub-auth'
export const inject = ['privhub']

export function apply(ctx: Context): void {
  const svc = ctx.privhub

  /* 登录 */
  svc.route('/privhub/api/login', async (req, res) => {
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
  svc.route('/privhub/api/register', async (req, res) => {
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
  svc.route('/privhub/api/me', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    const projects = await svc.visibleProjects(u)
    json(res, 200, { ok: true, user: { username: u.username, displayName: u.displayName, role: u.role, projects } })
  }, 'me')

  /* 退出登录 */
  svc.route('/privhub/api/logout', async (req, res) => {
    const t = tokenOf(req)
    if (t) { svc.sessions.delete(t); await svc.saveSessions() }
    json(res, 200, { ok: true })
  }, 'logout')
}
