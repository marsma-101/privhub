/**
 * privhub-files-mdpage — Markdown 一键生成 HTML 展示页
 *
 *   POST /api/mdpage/generate { project, path }  （.md）
 *     → 读 md → 服务端渲染完整 HTML → 写同目录同名 .html → 返回 { ok, path }
 *
 * @module privhub-files-mdpage
 */

import { existsSync } from 'node:fs'
import { extname } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { json, readBody } from '../../privhub-core/src/index'

export const name = 'privhub-files-mdpage'
export const inject = ['storage', 'privhub']

/* ---------- 服务端轻量 markdown 渲染（与 F21 导出同语义，离线零依赖） ---------- */
function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function inline(s: string): string {
  let out = esc(s)
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
  return out
}
function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const html: string[] = []
  let i = 0
  let inCode = false
  let codeBuf: string[] = []
  let listBuf: string[] = []
  let listType = ''
  const flushList = () => {
    if (!listBuf.length) return
    html.push('<' + (listType === 'ol' ? 'ol' : 'ul') + '>' + listBuf.map((x) => '<li>' + x + '</li>').join('') + '</' + (listType === 'ol' ? 'ol' : 'ul') + '>')
    listBuf = []
  }
  while (i < lines.length) {
    const line = lines[i]
    const t = line.trim()
    if (inCode) {
      if (t.startsWith('```')) { inCode = false; html.push('<pre><code>' + esc(codeBuf.join('\n')) + '</code></pre>'); codeBuf = [] }
      else codeBuf.push(line)
      i++
      continue
    }
    if (t.startsWith('```')) { flushList(); inCode = true; i++; continue }
    if (t === '') { flushList(); html.push(''); i++; continue }
    const h = /^(#{1,6})\s+(.*)$/.exec(t)
    if (h) { flushList(); html.push('<h' + h[1].length + '>' + inline(h[2]) + '</h' + h[1].length + '>'); i++; continue }
    if (t === '---' || t === '***') { flushList(); html.push('<hr />'); i++; continue }
    if (t.startsWith('>')) { flushList(); html.push('<blockquote>' + inline(t.replace(/^>\s?/, '')) + '</blockquote>'); i++; continue }
    if (/^[-*+]\s+/.test(t)) { if (listType !== 'ul') { flushList(); listType = 'ul' } listBuf.push(inline(t.replace(/^[-*+]\s+/, ''))); i++; continue }
    if (/^\d+\.\s+/.test(t)) { if (listType !== 'ol') { flushList(); listType = 'ol' } listBuf.push(inline(t.replace(/^\d+\.\s+/, ''))); i++; continue }
    flushList(); listType = ''
    if (/^\|/.test(t) && i + 1 < lines.length && /^\|[\s:|-]+\|$/.test(lines[i + 1].trim())) {
      const head = t.split('|').slice(1, -1).map((c) => inline(c.trim()))
      i += 2
      const rows: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(lines[i].split('|').slice(1, -1).map((c) => inline(c.trim())).join('')); i++ }
      html.push('<table><tr>' + head.map((c) => '<th>' + c + '</th>').join('') + '</tr>' + rows.map((r) => '<tr>' + r + '</tr>').join('') + '</table>')
      continue
    }
    html.push('<p>' + inline(t) + '</p>')
    i++
  }
  flushList()
  return html.join('')
}
function wrapHtml(title: string, body: string): string {
  return '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>' + esc(title) + '</title>\n<style>\nbody{font-family:system-ui,sans-serif;max-width:860px;margin:0 auto;padding:32px 20px;color:#333;line-height:1.75}\nh1,h2,h3{margin:1.4em 0 .5em}\npre{background:#f6f8fa;border:1px solid #e0e0e0;border-radius:8px;padding:14px;overflow:auto}\ncode{background:#f6f8fa;padding:1px 5px;border-radius:4px}\npre code{background:none;padding:0}\ntable{border-collapse:collapse;margin:10px 0}\nth,td{border:1px solid #ddd;padding:6px 12px}\nth{background:#f6f8fa}\nblockquote{border-left:3px solid #888;margin:10px 0;padding:2px 14px;color:#666}\na{color:#2b6cb0}\n</style>\n</head>\n<body>\n' + body + '\n</body>\n</html>\n'
}

export function apply(ctx: Context): void {
  const svc = ctx.privhub as unknown as {
    route: (path: string, handler: (req: unknown, res: unknown) => Promise<void> | void, name?: string) => void
    requireUser: (req: unknown, res: unknown) => { username: string; role: string } | null
    canAccess: (u: { username: string; role: string }, project: string) => boolean
    resolveReal: (project: string, relPath: string) => Promise<string | null>
  }

  svc.route('/privhub/api/mdpage/generate', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    let body: { project?: string; path?: string }
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = String(body.project ?? '')
    const path = String(body.path ?? '')
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    if (extname(path).toLowerCase() !== '.md') return json(res, 400, { ok: false, error: '仅支持 .md 文档生成页面' })
    const target = await svc.resolveReal(project, path)
    if (target === null || !existsSync(target)) return json(res, 404, { ok: false, error: '文档不存在' })
    const md = await ctx.storage.readText(target)
    const bodyMd = md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
    const title = path.split('/').pop()!.replace(/\.md$/i, '')
    const html = wrapHtml(title, renderMarkdown(bodyMd))
    const outPath = path.replace(/\.md$/i, '.html')
    const outReal = await svc.resolveReal(project, outPath)
    if (outReal === null) return json(res, 400, { ok: false, error: '目标路径无效' })
    await ctx.storage.writeText(outReal, html)
    json(res, 200, { ok: true, path: outPath })
  }, 'mdpage-generate')
}
