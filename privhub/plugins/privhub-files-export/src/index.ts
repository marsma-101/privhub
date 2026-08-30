/**
 * 私域枢纽页面导出插件（privhub-files-export，F21）
 *
 * .md 文档导出：
 *   GET /privhub/api/export?project=&path=&format=html|doc|pdf
 *   - html：服务端 markdown → 完整 HTML 文档（自带样式，中文 UTF-8）
 *   - doc ：Word 兼容 .doc（HTML 内容 + application/msword，Word 可直接打开）
 *   - pdf ：探测本机 Edge/Chrome → headless --print-to-pdf（系统字体渲染中文）；
 *           浏览器不可用时返回 503 明确错误（HTML/DOC 不受影响）
 * 权限：读权限即可导出（canAccess）；仅 .md；文件 ≤512KB；
 * 文件名走 RFC 5987（与 download 同款编码）。
 *
 * @module privhub-files-export
 */

import { readFile, stat, writeFile, mkdir, unlink } from 'node:fs/promises'
import { join, extname, dirname } from 'node:path'
import { existsSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { Context } from '@deepseek-ai/cordis'
import { json } from '../../privhub-core/src/index'

const execFileP = promisify(execFile)

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()
const TMP_DIR = join(rootDir, 'data', 'export-tmp')
const MAX_BYTES = 512 * 1024

/** 候选无头浏览器（Windows 常见路径）。 */
const BROWSER_CANDIDATES = [
  process.env.ProgramFiles + '\\Microsoft\\Edge\\Application\\msedge.exe',
  process.env['ProgramFiles(x86)'] + '\\Microsoft\\Edge\\Application\\msedge.exe',
  process.env.ProgramFiles + '\\Google\\Chrome\\Application\\chrome.exe',
  process.env['ProgramFiles(x86)'] + '\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA + '\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean)

/* ---------- 服务端轻量 markdown 渲染（与 F16 前端渲染器同语义，离线零依赖） ---------- */

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function inline(s: string): string {
  let out = esc(s)
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  out = out.replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, (m, name) => '<span class="wl">' + esc(name) + '</span>')
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
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
      if (t.startsWith('```')) { inCode = false; html.push('<pre>' + esc(codeBuf.join('\n')) + '</pre>'); codeBuf = [] }
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
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].split('|').slice(1, -1).map((c) => inline(c.trim())))
        i++
      }
      html.push('<table><thead><tr>' + head.map((c) => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>' + rows.map((r) => '<tr>' + r.map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table>')
      continue
    }
    html.push('<p>' + inline(t) + '</p>')
    i++
  }
  if (inCode) html.push('<pre>' + esc(codeBuf.join('\n')) + '</pre>')
  flushList()
  return html.join('\n')
}

function wrapHtml(title: string, bodyHtml: string): string {
  return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>' + esc(title) + '</title>' +
    '<style>body{font-family:"Microsoft YaHei",system-ui,sans-serif;line-height:1.7;max-width:820px;margin:0 auto;padding:32px 24px;color:#2e3440}' +
    'h1,h2,h3{line-height:1.4}h1{border-bottom:2px solid #d8dee6;padding-bottom:6px}table{border-collapse:collapse}th,td{border:1px solid #d8dee6;padding:6px 10px}' +
    'pre{background:#1e1e2e;color:#e4e4e7;padding:12px 14px;border-radius:8px;overflow:auto}code{background:#f0f2f5;padding:1px 5px;border-radius:4px}' +
    'blockquote{border-left:3px solid #6e40c9;margin:8px 0;padding:2px 12px;color:#57606a;background:#f6f8fa}</style></head><body>' + bodyHtml + '</body></html>'
}

export const name = 'privhub-files-export'
export const inject = ['privhub', 'storage']

export function apply(ctx: Context): void {
  const svc = ctx.privhub

  /** 探测可用的无头浏览器路径。 */
  async function findBrowser(): Promise<string | null> {
    for (const c of BROWSER_CANDIDATES) {
      if (existsSync(c)) return c
    }
    return null
  }

  svc.route('/privhub/api/export', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    try {
      const url = new URL(req.url ?? '/', 'http://x')
      const project = url.searchParams.get('project') ?? ''
      const path = url.searchParams.get('path') ?? ''
      const format = (url.searchParams.get('format') ?? 'html').toLowerCase()
      if (!['html', 'doc', 'pdf'].includes(format)) return json(res, 400, { ok: false, error: 'format 必须为 html/doc/pdf' })
      if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
      if (extname(path).toLowerCase() !== '.md') return json(res, 400, { ok: false, error: '仅支持 .md 文档导出' })
      const target = await svc.resolveReal(project, path)
      if (target === null || !existsSync(target)) return json(res, 404, { ok: false, error: '文档不存在' })
      const s = await stat(target)
      if (s.isDirectory() || s.size > MAX_BYTES) return json(res, 400, { ok: false, error: '文档过大或为文件夹（≤512KB）' })
      const md = await ctx.storage.readText(target)
      // 去掉 frontmatter（导出正文）
      const bodyMd = md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
      const title = path.split('/').pop()!.replace(/\.md$/i, '')
      const html = wrapHtml(title, renderMarkdown(bodyMd))

      const name = title + '.' + (format === 'doc' ? 'doc' : format)
      const encoded = encodeURIComponent(name).replace(/['()*]/g, (c) => '%' + c.charCodeAt(0).toString(16))
      const setDisposition = (): string => "attachment; filename*=UTF-8''" + encoded + '; filename="export.' + (format === 'doc' ? 'doc' : format) + '"'

      if (format === 'html') {
        const body = Buffer.from(html, 'utf8')
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-disposition': setDisposition(), 'content-length': body.length, 'x-content-type-options': 'nosniff' })
        res.end(body)
        return
      }
      if (format === 'doc') {
        // Word 兼容 .doc：HTML 内容 + UTF-8 BOM（Word 按 HTML 打开，中文不乱码）
        const body = Buffer.from('\uFEFF' + html, 'utf8')
        res.writeHead(200, { 'content-type': 'application/msword', 'content-disposition': setDisposition(), 'content-length': body.length, 'x-content-type-options': 'nosniff' })
        res.end(body)
        return
      }
      // PDF：无头浏览器打印（系统字体渲染中文；不可用时 503）
      const browser = await findBrowser()
      if (!browser) return json(res, 503, { ok: false, error: '服务器未安装 Edge/Chrome，无法导出 PDF（可导出 HTML/DOC）' })
      await mkdir(TMP_DIR, { recursive: true })
      const tmpHtml = join(TMP_DIR, 'export-' + Date.now() + '.html')
      const tmpPdf = tmpHtml.replace(/\.html$/, '.pdf')
      try {
        await writeFile(tmpHtml, html, 'utf8')
        await execFileP(browser, ['--headless', '--disable-gpu', '--no-first-run', '--print-to-pdf=' + tmpPdf, 'file:///' + tmpHtml.replace(/\\/g, '/')], { timeout: 30000 })
        const body = await readFile(tmpPdf)
        res.writeHead(200, { 'content-type': 'application/pdf', 'content-disposition': setDisposition(), 'content-length': body.length, 'x-content-type-options': 'nosniff' })
        res.end(body)
      } finally {
        await unlink(tmpHtml).catch(() => {})
        await unlink(tmpPdf).catch(() => {})
      }
    } catch (e) {
      json(res, 500, { ok: false, error: e instanceof Error ? e.message : '导出失败' })
    }
  }, 'export')
}
