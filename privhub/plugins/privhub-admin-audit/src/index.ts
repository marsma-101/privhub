/**
 * 私域枢纽审计插件（privhub-admin-audit，F13 / B13）
 *
 * 审计闭环的「接线 + 查询」端（消费 S1 audit Service，不另起存储）：
 *   - 监听各写操作插件 emit 的 `audit:logged` 事件，维护内存环形缓冲（最近 50 条），
 *     供 F15 审计面板（批次② 步骤 3）实时刷新（/api/audit/recent 轮询）；
 *   - GET  /privhub/api/audit          按 user/action/时间范围筛选查询（adminOnly）
 *   - GET  /privhub/api/audit/export   导出 CSV（adminOnly，RFC 5987 中文文件名）
 *   - GET  /privhub/api/audit/recent   最近审计事件环形缓冲（adminOnly）
 *
 * 埋点本身在各写操作插件（files/trash/admin/auth）内直接调用 ctx.audit.log(...)
 * 并 emit 'audit:logged'——本插件不修改任何已落地基座代码，删除本目录即卸载审计面板
 * 接口，其余功能不受影响（可插拔）。
 *
 * @module privhub-admin-audit
 */

import type { Context } from '@deepseek-ai/cordis'
import { json } from '../../privhub-core/src/index'
import type { AuditEntry } from '../../privhub-svc-audit/src/index'

export const name = 'privhub-admin-audit'
export const inject = ['privhub', 'audit']

/** 环形缓冲上限（F15 实时刷新窗口）。 */
const RING_MAX = 50

export function apply(ctx: Context): void {
  const svc = ctx.privhub
  const audit = ctx.audit

  /* 事件监听（effect 可逆：插件卸载时自动移除监听，零残留） */
  const ring: AuditEntry[] = []
  ctx.effect(() => {
    const off = ctx.on('audit:logged', (entry: AuditEntry) => {
      ring.push(entry)
      if (ring.length > RING_MAX) ring.splice(0, ring.length - RING_MAX)
    })
    return () => off()
  })

  /* 管理员校验辅助 */
  const adminOnly = (req: any, res: any): boolean => {
    const u = svc.requireUser(req, res)
    if (!u) return false
    if (u.role !== 'admin') { json(res, 403, { ok: false, error: '仅管理员' }); return false }
    return true
  }

  /* 查询接口：GET /privhub/api/audit?user=&action=&from=&to=&limit= */
  svc.route('/privhub/api/audit', async (req, res) => {
    if (!adminOnly(req, res)) return
    try {
      const url = new URL(req.url ?? '/', 'http://x')
      const filter = {
        user: url.searchParams.get('user') || undefined,
        action: url.searchParams.get('action') || undefined,
        from: url.searchParams.get('from') ? Number(url.searchParams.get('from')) : undefined,
        to: url.searchParams.get('to') ? Number(url.searchParams.get('to')) : undefined,
        limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined,
      }
      json(res, 200, { ok: true, entries: await audit.query(filter) })
    } catch (e) {
      json(res, 400, { ok: false, error: e instanceof Error ? e.message : '查询失败' })
    }
  }, 'audit-query')

  /* 导出接口：GET /privhub/api/audit/export?user=&action=&from=&to= */
  svc.route('/privhub/api/audit/export', async (req, res) => {
    if (!adminOnly(req, res)) return
    try {
      const url = new URL(req.url ?? '/', 'http://x')
      const filter = {
        user: url.searchParams.get('user') || undefined,
        action: url.searchParams.get('action') || undefined,
        from: url.searchParams.get('from') ? Number(url.searchParams.get('from')) : undefined,
        to: url.searchParams.get('to') ? Number(url.searchParams.get('to')) : undefined,
      }
      const csv = await audit.exportCsv(filter)
      const name = 'audit-' + new Date().toISOString().slice(0, 10) + '.csv'
      const encoded = encodeURIComponent(name).replace(/['()*]/g, (c) => '%' + c.charCodeAt(0).toString(16))
      const body = Buffer.from(csv, 'utf8')
      res.writeHead(200, {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': "attachment; filename*=UTF-8''" + encoded + '; filename="audit.csv"',
        'content-length': body.length,
      })
      res.end(body)
    } catch (e) {
      json(res, 400, { ok: false, error: e instanceof Error ? e.message : '导出失败' })
    }
  }, 'audit-export')

  /* 实时窗口接口：GET /privhub/api/audit/recent（F15 面板轮询用） */
  svc.route('/privhub/api/audit/recent', async (req, res) => {
    if (!adminOnly(req, res)) return
    json(res, 200, { ok: true, entries: [...ring].reverse() })
  }, 'audit-recent')
}
