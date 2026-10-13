/**
 * privhub-admin-cap —— 功能权限开关的 HTTP 面（服务端）
 *
 * 只是 `privhub-svc-cap`（ctx.cap，L2 服务）的路由外壳：真正的判定与存储都在 Service 里，
 * 本插件不持有状态。四条路由：
 *
 *   GET  /privhub/api/cap/me      任意登录用户 —— 返回「我」对所有功能的有效级别，
 *                                 供前端决定某个功能入口/按钮显不显示。**不设管理门槛**
 *                                 （否则普通用户拿不到自己的级别，界面就没法隐藏）。
 *   GET  /privhub/api/cap/list    管理 —— 功能清单 + 普通用户当前级别 + 是否已改 + 配置是否损坏
 *   POST /privhub/api/cap/save    管理 —— 写入（`{ feature, level }` 或 `{ table }`）
 *   POST /privhub/api/cap/reset   管理 —— 全部恢复默认
 *
 * 「管理」门槛 = `ctx.cap.can(u, 'admin.console', 'write')`：管理员恒通过；普通用户默认不通过
 * （`admin.console` 的 userDefault 是 `none`）。将来若要让人代管功能开关，把该功能的
 * 用户级别调成 write 即可 —— 与它管的那张表是同一套机制（自洽）。
 *
 * @module privhub-admin-cap
 */

import { json, readBody } from '../../privhub-core/src/index'
import type { Context } from '@deepseek-ai/cordis'

export const name = 'privhub-admin-cap'
export const inject = ['privhub', 'cap', 'audit']
export function apply(ctx: Context): void {
  const svc = ctx.privhub

  /* 管理门槛：读的是同一张表里的 `admin.console`（管理员恒通过）。 */
  const manager = (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => {
    const u = svc.requireUser(req, res)
    if (!u) return null
    if (!ctx.cap.can(u, 'admin.console', 'write')) {
      json(res, 403, { ok: false, error: '仅管理员可管理功能开关' })
      return null
    }
    return u
  }

  const audit = (username: string, action: string, target: string, detail: string) =>
    void ctx.audit.log({ user: username, action, target, detail }).catch(() => null)

  /* 我自己的级别（任意登录用户）——前端据此隐藏/禁用入口。 */
  svc.route('/privhub/api/cap/me', (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    const levels: Record<string, string> = {}
    for (const f of ctx.cap.snapshot()) levels[f.id] = ctx.cap.level(u, f.id)
    json(res, 200, { ok: true, role: u.role, levels })
  }, 'cap-me')

  /* 功能清单 + 当前配置（管理）。 */
  svc.route('/privhub/api/cap/list', (req, res) => {
    if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'method not allowed' })
    const u = manager(req, res)
    if (!u) return
    json(res, 200, {
      ok: true,
      adminLevel: 'write',
      levels: ['none', 'read', 'write'],
      features: ctx.cap.snapshot(),
      corrupt: ctx.cap.isCorrupt(),
    })
  }, 'cap-list')

  /* 写入（管理）。 */
  svc.route('/privhub/api/cap/save', async (req, res) => {
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    const u = manager(req, res)
    if (!u) return
    let body: { feature?: unknown; level?: unknown; table?: unknown }
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: '请求体不是合法 JSON' }) }

    let before: Record<string, string>
    try {
      before = ctx.cap.userTable()
      if (body.table !== undefined) await ctx.cap.setMany(body.table)
      else if (typeof body.feature === 'string') await ctx.cap.set(body.feature, body.level as never)
      else return json(res, 400, { ok: false, error: '需要 table 或 feature+level' })
    } catch (e) {
      return json(res, 400, { ok: false, error: (e as Error).message || '保存失败' })
    }
    const after = ctx.cap.userTable()
    const changed = Object.keys(after).filter((k) => after[k] !== before[k])
    audit(u.username, 'cap-update', 'capabilities.json', changed.map((k) => `${k}=${after[k]}`).join(' ') || '(无变化)')
    json(res, 200, { ok: true, features: ctx.cap.snapshot(), changed })
  }, 'cap-save')

  /* 恢复默认（管理）。 */
  svc.route('/privhub/api/cap/reset', async (req, res) => {
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    const u = manager(req, res)
    if (!u) return
    try { await ctx.cap.reset() } catch (e) { return json(res, 400, { ok: false, error: (e as Error).message || '重置失败' }) }
    audit(u.username, 'cap-reset', 'capabilities.json', '全部恢复默认')
    json(res, 200, { ok: true, features: ctx.cap.snapshot() })
  }, 'cap-reset')
}
