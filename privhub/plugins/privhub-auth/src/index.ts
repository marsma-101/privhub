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
import { json, readBody, tokenOf, hashPassword, verifyPassword, sessionSetCookie, sessionClearCookie } from '../../privhub-core/src/index'

const rootDirForSettings = process.env.PRIVHUB_ROOT?.trim() || process.cwd()

/**
 * S11：读取「是否允许自助注册」开关。
 *
 * 必须经 ctx.storage 读取（透明解密 + 兼容明文）——settings.json 由
 * shell-settings 加密落盘（PHENC1），裸 readFile 会解析失败。
 *
 * 【重要】语义是「显式关闭才关闭」：字段缺失或文件不存在一律视为【允许】。
 * 回归事故（a8148d8 → 本修复）：最初写成 `=== true`，于是本就没有该字段的
 * settings.json 会把注册判为关闭，等于把「原本可用」的自助注册悄悄废掉，
 * 且设置界面没有开关、管理员无处可开——典型的功能静默失效。
 * 恢复能力时不要再改回 `=== true`：缺省值必须等于"原来的行为"。
 */
async function selfRegisterAllowed(ctx: Context): Promise<boolean> {
  const file = join(rootDirForSettings, 'data', 'settings.json')
  if (!existsSync(file)) return true
  try {
    const raw = await ctx.storage.readText(file)
    const parsed = JSON.parse(raw) as { allowSelfRegister?: boolean }
    return parsed.allowSelfRegister !== false
  } catch (e) {
    // 读取失败按【允许】处理：注册是既有能力，不能因配置读取异常而消失
    ctx.logger?.warn?.('[auth] 读取 settings.json 失败，自助注册按允许处理：' + (e instanceof Error ? e.message : String(e)))
    return true
  }
}

export const name = 'privhub-auth'
export const inject = ['privhub', 'audit', 'eventBus', 'storage']

export function apply(ctx: Context): void {
  /* E1 事件声明 */
  ctx.eventBus.declareEmit('audit:logged', 'privhub-auth', '写操作成功审计广播（S1 闭环）')
  ctx.eventBus.declareEmit('personal:renamed', 'privhub-auth', '个人空间目录改名（显示名联动）→ 各存储同步引用')
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
    // 同步下发会话 Cookie：静态资源（插件 JS）经 import() 加载，无法带 Bearer 头，
    // 只能靠 Cookie 证明已登录，否则登录后插件仍会被静态资源鉴权拦下。
    res.setHeader('set-cookie', sessionSetCookie(token, svc.sessionTtlMs / 1000))
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
    // 实名注册：姓名必填且全局唯一——它同时是个人空间文件夹名（见 core.personalDir）
    const displayName = String(body.displayName ?? body.realName ?? '').trim()
    if (username === '' || password.length < 6) return json(res, 400, { ok: false, error: '用户名不能为空，密码至少6位' })
    if (!/^[\w.-]{2,32}$/.test(username)) return json(res, 400, { ok: false, error: '用户名需 2~32 位字母数字下划线' })
    if (displayName === '') return json(res, 400, { ok: false, error: '请填写真实姓名：系统会以你的姓名建一个文件夹' })
    if (svc.users.has(username)) return json(res, 409, { ok: false, error: '用户名已存在' })
    const nameCheck = await svc.checkNameAvailable(displayName)
    if (!nameCheck.ok) {
      return json(res, 409, {
        ok: false,
        error: `${nameCheck.reason}。建议在姓名后加上部门以区分，例如「${displayName}-技术部」。`,
      })
    }
    svc.users.set(username, { username, password: hashPassword(password), displayName, role: 'user', projects: ['公共'] })
    // 开通个人空间 data-files/<姓名>/：外置于项目，仅本人可见可访问
    if (!await svc.bindPersonalDir(username, displayName)) {
      svc.users.delete(username)
      return json(res, 500, { ok: false, error: '文件夹创建失败，注册已取消，请重试或联系管理员' })
    }
    await svc.saveUsers()
    json(res, 200, { ok: true, personalDir: displayName })
    void audit(username, 'register', username, 'personalDir=' + displayName)
  }, 'register')

  /* 当前用户 */
  svc.route('/privhub/api/me', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    const projects = await svc.visibleProjects(u)
    // 凭 Bearer 校验通过时顺便续下发 Cookie。
    // 这是「老会话自助补票」路径：升级前登录的用户 localStorage 里已有 token、
    // 但浏览器还没有本 Cookie，骨架启动时会先打本接口，从而拿到 Cookie 再加载插件。
    const tok = tokenOf(req)
    if (tok) res.setHeader('set-cookie', sessionSetCookie(tok, svc.sessionTtlMs / 1000))
    json(res, 200, {
      ok: true,
      user: { username: u.username, displayName: u.displayName, role: u.role, projects, personalDir: u.personalDir ?? null },
    })
  }, 'me')

  /* 修改本人真实姓名（= 个人空间目录名，二者联动改名） */
  svc.route('/privhub/api/me/display-name', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const next = String(body.displayName ?? '').trim()
    if (next === '') return json(res, 400, { ok: false, error: '姓名不能为空' })
    const r = await svc.changeDisplayName(u.username, next)
    if (!r.ok) return json(res, 409, { ok: false, error: r.reason })
    // 目录真的改了才广播：各插件据此同步自己存储里的旧目录名引用
    if (r.renamedDir) {
      ctx.emit('personal:renamed', { username: u.username, oldName: r.oldName, newName: r.newName })
    }
    json(res, 200, {
      ok: true,
      displayName: r.newName,
      personalDir: svc.users.get(u.username)?.personalDir ?? null,
      renamedDir: r.renamedDir,
    })
    void audit(u.username, 'display-name-change', u.username,
      r.oldName + ' -> ' + r.newName + (r.renamedDir ? '（文件夹已同步改名）' : ''))
  }, 'me-display-name')

  /* 退出登录 */
  svc.route('/privhub/api/logout', async (req, res) => {
    const t = tokenOf(req)
    const entry = t ? svc.sessions.get(t) : undefined
    if (t) { svc.sessions.delete(t); await svc.saveSessions() }
    res.setHeader('set-cookie', sessionClearCookie())
    json(res, 200, { ok: true })
    if (entry) void audit(entry.username, 'logout', '')
  }, 'logout')
}
