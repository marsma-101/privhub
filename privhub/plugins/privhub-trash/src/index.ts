/**
 * 私域枢纽回收站插件（privhub-trash）
 *
 * 回收站列表 / 恢复 / 彻底删除 / 清理过期 + 定时自动清理（30 天，可配）。
 * 记录与实体文件的存储归 privhub-core（ctx.privhub），本插件只做查询编排、
 * 权限过滤与定时任务（Cordis effect 可逆：卸载时清理定时器）。
 *
 * @module privhub-trash
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { json, readBody } from '../../privhub-core/src/index'

export const name = 'privhub-trash'
export const inject = ['privhub', 'audit']

export interface Config {
  /** 回收站保留天数（到期自动物理清除），默认 30 */
  ttlDays: number
  /** 自动清理检查间隔（小时），默认 6 */
  intervalHours: number
}

export const Config: z<Config> = z.object({
  ttlDays: z.number().default(30),
  intervalHours: z.number().default(6),
})

export function apply(ctx: Context, config: Config): void {
  const svc = ctx.privhub
  const ttlDays = config.ttlDays > 0 ? config.ttlDays : 30
  const intervalMs = (config.intervalHours > 0 ? config.intervalHours : 6) * 3600 * 1000

  /* 审计埋点（F13 契约）：成功后写审计并广播 audit:logged；失败静默，不影响主流程 */
  const audit = async (u: { username: string }, action: string, target: string, detail?: string): Promise<void> => {
    const rec = await ctx.audit.log({ user: u.username, action, target, detail }).catch(() => null)
    if (rec) ctx.emit('audit:logged', rec)
  }

  /* 回收站列表 */
  svc.route('/privhub/api/trash-list', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    const list = await svc.loadTrash()
    // 普通用户只看自己删除的；管理员看全部
    const filtered = u.role === 'admin' ? list : list.filter((r) => r.deletedBy === u.username)
    json(res, 200, { ok: true, trash: filtered })
  }, 'trash-list')

  /* 恢复回收站条目 */
  svc.route('/privhub/api/trash-restore', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const id = String(body.id ?? '')
    const rec = (await svc.loadTrash()).find((r) => r.id === id)
    const ok = await svc.restoreTrash(id)
    json(res, ok ? 200 : 400, ok ? { ok: true } : { ok: false, error: '恢复失败（可能原位置已有同名文件）' })
    if (ok) void audit(u, 'restore', rec ? rec.project + (rec.relPath ? '/' + rec.relPath : '') + (rec.name ? '/' + rec.name : '') : id)
  }, 'trash-restore')

  /* 彻底删除回收站条目 */
  svc.route('/privhub/api/trash-purge', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const id = String(body.id ?? '')
    const rec = (await svc.loadTrash()).find((r) => r.id === id)
    const ok = await svc.purgeTrash(id)
    json(res, ok ? 200 : 400, ok ? { ok: true } : { ok: false, error: '彻底删除失败' })
    if (ok) void audit(u, 'purge', rec ? rec.project + (rec.relPath ? '/' + rec.relPath : '') + (rec.name ? '/' + rec.name : '') : id)
  }, 'trash-purge')

  /* 清空 N 天前的回收站（管理员手动触发，N 取配置 ttlDays） */
  svc.route('/privhub/api/trash-clean', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (u.role !== 'admin') return json(res, 403, { ok: false, error: '仅管理员' })
    const n = await svc.purgeExpiredTrash(ttlDays * 24 * 3600 * 1000)
    json(res, 200, { ok: true, purged: n })
    void audit(u, 'clean', '', 'purged=' + n)
  }, 'trash-clean')

  /* 定时自动清理（Cordis effect 可逆：插件卸载时清除定时器，零残留） */
  ctx.effect(() => {
    const run = (): void => { void svc.purgeExpiredTrash(ttlDays * 24 * 3600 * 1000).catch(() => { /* 单次清理失败不影响主流程 */ }) }
    // 启动 5 秒后先清一次（避开启动高峰），此后按 intervalHours 周期执行
    const first = setTimeout(run, 5000)
    const timer = setInterval(run, intervalMs)
    if (typeof timer.unref === 'function') timer.unref()
    return () => { clearTimeout(first); clearInterval(timer) }
  })
}
