/**
 * 私域枢纽文件编辑锁 HTTP 接口（privhub-files-lock，Y 批）
 *
 * 把 privhub-svc-lock 的 `ctx.lock` 暴露成前端可调用的路由，供 md/txt 编辑器
 * 与 office2 共用同一把锁（office2 原有私有锁表已并入本服务）。
 *
 *   GET    /privhub/api/lock?project=&path=        查询锁状态（读权限）
 *   POST   /privhub/api/lock { project, path, ttlMs? }   申请独占编辑锁（写权限；被占 → 409 + 占用人）
 *   POST   /privhub/api/lock/renew { project, path }     心跳续期（仅持有人）
 *   DELETE /privhub/api/lock?project=&path=&force=1      释放锁（持有人；admin 可 force 强解）
 *   GET    /privhub/api/lock/stats                 锁表统计（仅 admin）
 *
 * 权限：申请/续期/释放要求该文件「可编辑」（ctx.acl 的 edit 动作；未命中规则即放行）。
 * 为什么不用 admin-acl 的 GUARD_PATHS 守卫：本组路由的 DELETE 走 query 传参，
 * 且释放语义需要区分「持有人」与「admin 强解」，这两点 guard 都不表达，故在此显式校验。
 *
 * @module privhub-files-lock
 */

import type { Context } from '@deepseek-ai/cordis'
import { json, readBody } from '../../privhub-core/src/index'

export const name = 'privhub-files-lock'
export const inject = ['privhub', 'acl', 'lock', 'cap']

/** 冲突文案：对应用户诉求「有人正在修改，请稍后重试」。 */
function busyMessage(holder: string): string {
  return '文件正被 ' + holder + ' 修改，请稍后重试'
}

export function apply(ctx: Context): void {
  const svc = ctx.privhub

  /** 该用户能否编辑目标路径：项目可访问 + 文件级 ACL 未拒绝 edit。 */
  const canEdit = (u: { username: string; role: string }, project: string, path: string): boolean => {
    if (!svc.canAccess(u, project)) return false
    const d = ctx.acl.can(u, 'edit', project, path)
    return !d || d.allow
  }

  const parseQuery = (req: { url?: string }): { project: string; path: string; force: boolean } => {
    const url = new URL(String(req.url ?? '/'), 'http://x')
    return {
      project: url.searchParams.get('project') ?? '',
      path: url.searchParams.get('path') ?? '',
      force: url.searchParams.get('force') === '1',
    }
  }

  svc.route('/privhub/api/lock', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (req.method === 'GET' || req.method === 'DELETE') {
      const { project, path, force } = parseQuery(req)
      if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
      if (req.method === 'GET') {
        json(res, 200, { ok: true, ...ctx.lock.status(project, path) })
        return
      }
      // DELETE：释放（持有人，或 admin force 强解）
      const canForce = ctx.cap.can(u, 'admin.lock', 'write')
      if (force && !canForce) return json(res, 403, { ok: false, error: '仅管理员可强制解锁' })
      const released = ctx.lock.release(u.username, project, path, { force: force && canForce })
      json(res, 200, { ok: true, released })
      return
    }
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    let body: { project?: string; path?: string; ttlMs?: number }
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = String(body.project ?? '')
    const path = String(body.path ?? '')
    if (!canEdit(u, project, path)) return json(res, 403, { ok: false, error: '无写权限（只读），无法申请编辑锁' })
    const r = ctx.lock.acquire(u.username, project, path, body.ttlMs)
    if (!r.ok) {
      const holder = ctx.lock.status(project, path)
      return json(res, 409, {
        ok: false,
        locked: true,
        error: busyMessage(r.holder ?? '他人'),
        holder: { user: r.holder ?? null, expiresAt: holder.expiresAt, kind: holder.kind },
      })
    }
    json(res, 200, { ok: true, acquired: true, renew: !!r.renew, expiresAt: r.expiresAt })
  }, 'lock')

  svc.route('/privhub/api/lock/renew', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    let body: { project?: string; path?: string; ttlMs?: number }
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = String(body.project ?? '')
    const path = String(body.path ?? '')
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    const ok = ctx.lock.renew(u.username, project, path, body.ttlMs)
    // 续期失败 = 锁已过期或被他人拿走 → 让前端按「已失锁」处理
    json(res, ok ? 200 : 409, ok ? { ok: true } : { ok: false, error: '锁已失效，请重新申请' })
  }, 'lock-renew')

  /* 锁表统计（仅 admin）：调试/监控用，无敏感数据 */
  svc.route('/privhub/api/lock/stats', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (!ctx.cap.can(u, 'admin.lock', 'read')) return json(res, 403, { ok: false, error: '无权限' })
    json(res, 200, { ok: true, ...ctx.lock.stats() })
  }, 'lock-stats')
}
