/**
 * 私域枢纽文件搜索插件（privhub-files-search，F09）
 *
 * 文件名搜索（B8）：GET /privhub/api/search?q=&project=
 * 消费 S4 search Service（递归文件名匹配），权限与路径安全复用 core。
 * C15 全文搜索（批次②）在同一入口上扩展。
 *
 * @module privhub-files-search
 */

import type { Context } from '@deepseek-ai/cordis'
import { json } from '../../privhub-core/src/index'

export const name = 'privhub-files-search'
export const inject = ['privhub', 'search']

export function apply(ctx: Context): void {
  const svc = ctx.privhub
  const search = ctx.search

  svc.route('/privhub/api/search', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    const url = new URL(req.url ?? '/', 'http://x')
    const q = url.searchParams.get('q') ?? ''
    const project = url.searchParams.get('project') ?? ''
    if (q.trim() === '') return json(res, 200, { ok: true, hits: [] })
    const visible = await svc.visibleProjects(u)
    const hits = await search.query(
      q,
      { project },
      visible,
      (p, sp) => svc.listFiles(p, sp ?? ''),
      (p, rel) => svc.resolveInProject(p, rel ?? ''),
    )
    json(res, 200, { ok: true, hits })
  }, 'search')
}
