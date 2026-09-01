/**
 * privhub-files-dataview — 数据表页面模板（HTML + xlsx 双向）
 *
 *   POST /api/dataview/new { project, dir? }   生成「数据看板」页面 + 配套空数据表 xlsx
 *
 * 生成的 HTML 页面引用本插件静态资源 ph-table.js（<ph-table project src> 组件）：
 *   页面打开 → 组件读 xlsx 渲染可编辑表格 → 修改后点「保存数据表」写回（双向）。
 *
 * @module privhub-files-dataview
 */

import type { Context } from '@deepseek-ai/cordis'
import { json, readBody } from '../../privhub-core/src/index'

export const name = 'privhub-files-dataview'
export const inject = ['storage', 'privhub', 'office']

function pageTemplate(project: string, xlsxPath: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>数据看板</title>
<style>
body{font-family:system-ui,sans-serif;max-width:960px;margin:0 auto;padding:28px 20px;color:#333}
h1{font-size:20px;border-bottom:1px solid #eee;padding-bottom:10px}
.hint{font-size:12.5px;color:#888;margin-bottom:14px}
</style>
</head>
<body>
<h1>📊 数据看板</h1>
<div class="hint">下方表格直接编辑单元格，点「保存数据表」写回数据源（${xlsxPath}）；数据表在其他页面也引用同一份数据。</div>
<ph-table project="${project}" src="${xlsxPath}"></ph-table>
<script src="/privhub-plugins/privhub-files-dataview/ph-table.js"></script>
</body>
</html>
`
}

export function apply(ctx: Context): void {
  const svc = ctx.privhub as unknown as {
    route: (path: string, handler: (req: unknown, res: unknown) => Promise<void> | void, name?: string) => void
    requireUser: (req: unknown, res: unknown) => { username: string; role: string } | null
    canAccess: (u: { username: string; role: string }, project: string) => boolean
    isValidProjectName: (n: string) => boolean
  }
  const office = ctx.office as unknown as {
    write: (project: string, relPath: string, content: unknown) => Promise<{ ok: boolean; error?: string }>
  }

  svc.route('/privhub/api/dataview/new', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    let body: { project?: string; dir?: string }
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = String(body.project ?? '')
    const dir = String(body.dir ?? '').replace(/^\/+|\/+$/g, '')
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    if (!svc.isValidProjectName(project)) return json(res, 400, { ok: false, error: '项目名无效' })
    const ts = Date.now().toString(36).slice(-5)
    const base = (dir ? dir + '/' : '') + '数据看板-' + ts
    const xlsxPath = base + '.xlsx'
    const htmlPath = base + '.html'
    // 空数据表（两行示例）
    const w = await office.write(project, xlsxPath, [['项目', '数值'], ['示例', 1]])
    if (!w.ok) return json(res, 500, { ok: false, error: w.error || '创建数据表失败' })
    const html = pageTemplate(project, xlsxPath)
    const target = await svc.resolveReal(project, htmlPath)
    if (target === null) return json(res, 400, { ok: false, error: '路径无效' })
    await ctx.storage.writeText(target, html)
    json(res, 200, { ok: true, path: htmlPath, xlsx: xlsxPath })
  }, 'dataview-new')
}
