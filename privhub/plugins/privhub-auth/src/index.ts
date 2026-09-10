/**
 * 私域枢纽认证插件（privhub-auth）
 *
 * 登录 / 注册 / 退出 / 当前用户。共享状态（users/sessions/防爆破表）
 * 全部来自 privhub-core 服务（ctx.privhub），本插件只做协议编排。
 *
 * @module privhub-auth
 */

import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { json, readBody, tokenOf, hashPassword, verifyPassword } from '../../privhub-core/src/index'

const rootDirForSettings = process.env.PRIVHUB_ROOT?.trim() || process.cwd()

/**
 * S11：读取「是否允许自助注册」开关。
 *
 * 必须经 ctx.storage 读取（透明解密 + 兼容明文）——settings.json 由
 * shell-settings 加密落盘（PHENC1），裸 readFile 会解析失败。
 * 读取失败按【关闭】处理（fail-closed），并通过 logger 显式告警，
 * 避免「开关打不开」这种静默失败难以定位。
 */
async function selfRegisterAllowed(ctx: Context): Promise<boolean> {
  const file = join(rootDirForSettings, 'data', 'settings.json')
  if (!existsSync(file)) return false
  try {
    const raw = await ctx.storage.readText(file)
    const parsed = JSON.parse(raw) as { allowSelfRegister?: boolean }
    return parsed.allowSelfRegister === true
  } catch (e) {
    ctx.logger?.warn?.('[auth] 读取 settings.json 失败，自助注册按关闭处理：' + (e instanceof Error ? e.message : String(e)))
    return false
  }
}

export const name = 'privhub-auth'
export const inject = ['privhub', 'audit', 'eventBus', 'storage']

export function apply(ctx: Context): void {
  /* E1 事件声明 */
  ctx.eventBus.declareEmit('audit:logged', 'privhub-auth', '写操作成功审计广播（S1 闭环）')
  const svc = ctx.privhub

  /* 审计埋点（F13 契约）：成功后写审计并广播 audit:logged；失败静默，不影响主流程 */
  const audit = async (user: string, action: string, target: string, detail?: string): Promise<void> => {
    const rec = await ctx.audit.log({ user, action, target, detail }).catch(() => null)
    if (rec) ctx.emit('audit:logged', rec)
  }

  /* 登录（A10：限流按 用户名+IP 双维度，防换账号/重启绕过） */
  svc.route('/privhub/api/login', async (req, res) => {
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const username = String(body.username ?? '')
    const password = String(body.password ?? '')
    const ip = String(req.socket.remoteAddress ?? '')
    const failKey = username + '|' + ip
    const now = Date.now()
    const fail = svc.loginFails.get(failKey)
    if (fail && fail.until > now) return json(res, 429, { ok: false, error: '尝试过于频繁，请稍后再试' })
    const rec = svc.users.get(username)
    if (!rec || !verifyPassword(password, rec.password)) {
      const f = svc.loginFails.get(failKey)
      const count = (f?.count ?? 0) + 1
      svc.loginFails.set(failKey, { count, until: now + (count >= 5 ? 60000 : 0) })
      return json(res, 401, { ok: false, error: '用户名或密码错误' })
    }
    svc.loginFails.delete(failKey)
    const token = randomBytes(24).toString('hex')
    // A8：会话带过期时间（TTL 由 core config sessionTtlDays 控制，me() 滑动续期）
    svc.sessions.set(token, { username, expiresAt: now + svc.sessionTtlMs })
    await svc.saveSessions()
    json(res, 200, { ok: true, token, user: svc.userView(rec) })
    void audit(username, 'login', '')
  }, 'login')

  /* 注册 → 直接建为普通用户（S11：受 allowSelfRegister 开关控制，默认关闭） */
  svc.route('/privhub/api/register', async (req, res) => {
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    if (!await selfRegisterAllowed(ctx)) {
      return json(res, 403, { ok: false, error: '本系统已关闭自助注册，请联系管理员开通账号或使用邀请码加入项目' })
    }
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
    void audit(username, 'register', username)
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
    const entry = t ? svc.sessions.get(t) : undefined
    if (t) { svc.sessions.delete(t); await svc.saveSessions() }
    json(res, 200, { ok: true })
    if (entry) void audit(entry.username, 'logout', '')
  }, 'logout')
}
