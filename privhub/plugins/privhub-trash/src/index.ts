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
export const inject = ['privhub', 'audit', 'acl']

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

  /* 回收站列表（P2-2：支持 ?project= 后端过滤，与前端项目上下文一致） */
  svc.route('/privhub/api/trash-list', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    const url = new URL(req.url ?? '/', 'http://x')
    const projectParam = url.searchParams.get('project') ?? ''
    const list = await svc.loadTrash()
    // 普通用户只看自己删除的；管理员看全部
    let filtered = u.role === 'admin' ? list : list.filter((r) => r.deletedBy === u.username)
    // P2-2：指定项目时按项目过滤（整个项目删除的条目 relPath==='' 视为该项目；空参数 = 全量）
    if (projectParam !== '') {
      const visible = await svc.visibleProjects(u)
      if (!visible.includes(projectParam)) return json(res, 403, { ok: false, error: '无权限访问该项目' })
      filtered = filtered.filter((r) => r.project === projectParam || r.relPath === '')
    }
    json(res, 200, { ok: true, trash: filtered })
  }, 'trash-list')

  /* 恢复回收站条目（P1-1：校验条目归属 + 项目权限，防越权恢复） */
  svc.route('/privhub/api/trash-restore', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const id = String(body.id ?? '')
    const rec = (await svc.loadTrash()).find((r) => r.id === id)
    if (!rec) return json(res, 404, { ok: false, error: '条目不存在' })
    // P1-1：条目归属校验（管理员可操作全部，普通用户仅自己删除的）
    if (u.role !== 'admin' && rec.deletedBy !== u.username) return json(res, 403, { ok: false, error: '无权限操作该条目' })
    // P1-1：恢复 = 写入项目，须有项目权限（权限已收回的项目不可恢复）
    if (!svc.canAccess(u, rec.project)) return json(res, 403, { ok: false, error: '无权限访问该项目' })
    // P2-1：恢复 = 写回原路径，纳入文件级 ACL（edit 动作）裁决
    const aclD = ctx.acl.can(u, 'edit', rec.project, rec.relPath ?? '')
    if (aclD && !aclD.allow) return json(res, 403, { ok: false, error: 'ACL 拒绝访问' })
    const ok = await svc.restoreTrash(id)
    json(res, ok ? 200 : 400, ok ? { ok: true } : { ok: false, error: '恢复失败（可能原位置已有同名文件）' })
    if (ok) void audit(u, 'restore', rec.project + (rec.relPath ? '/' + rec.relPath : '') + (rec.name ? '/' + rec.name : ''))
  }, 'trash-restore')

  /* 彻底删除回收站条目（P1-1：校验条目归属，防越权物理删除） */
  svc.route('/privhub/api/trash-purge', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const id = String(body.id ?? '')
    const rec = (await svc.loadTrash()).find((r) => r.id === id)
    if (!rec) return json(res, 404, { ok: false, error: '条目不存在' })
    // P1-1：条目归属校验（管理员可操作全部，普通用户仅自己删除的）
    if (u.role !== 'admin' && rec.deletedBy !== u.username) return json(res, 403, { ok: false, error: '无权限操作该条目' })
    const ok = await svc.purgeTrash(id)
    json(res, ok ? 200 : 400, ok ? { ok: true } : { ok: false, error: '彻底删除失败' })
    if (ok) void audit(u, 'purge', rec.project + (rec.relPath ? '/' + rec.relPath : '') + (rec.name ? '/' + rec.name : ''))
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
