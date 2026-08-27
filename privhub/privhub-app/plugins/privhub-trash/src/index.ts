/**
 * 私域枢纽回收站插件（privhub-trash）
 *
 * 回收站列表 / 恢复 / 彻底删除 / 清理过期。记录与实体文件的存储
 * 归 privhub-core（ctx.privhub），本插件只做查询编排与权限过滤。
 *
 * @module privhub-trash
 */

import type { Context } from '@deepseek-ai/cordis'
import { json, readBody } from '../../privhub-core/src/index'

export const name = 'privhub-trash'
export const inject = ['privhub']

export function apply(ctx: Context): void {
  const svc = ctx.privhub

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
    const ok = await svc.restoreTrash(id)
    json(res, ok ? 200 : 400, ok ? { ok: true } : { ok: false, error: '恢复失败（可能原位置已有同名文件）' })
  }, 'trash-restore')

  /* 彻底删除回收站条目 */
  svc.route('/privhub/api/trash-purge', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const id = String(body.id ?? '')
    const ok = await svc.purgeTrash(id)
    json(res, ok ? 200 : 400, ok ? { ok: true } : { ok: false, error: '彻底删除失败' })
  }, 'trash-purge')

  /* 清空 30 天前的回收站（管理员手动触发） */
  svc.route('/privhub/api/trash-clean', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (u.role !== 'admin') return json(res, 403, { ok: false, error: '仅管理员' })
    const n = await svc.purgeExpiredTrash(30 * 24 * 3600 * 1000)
    json(res, 200, { ok: true, purged: n })
  }, 'trash-clean')
}
