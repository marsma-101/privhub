/**
 * content — 内容加载与渲染：文件预览取数、Markdown 轻量渲染、Office → Markdown。
 * @module privhub-files-explorer-v3/client/content
 */

import { api, bus } from './deps.js'
import { rawUrl } from './utils.js'
import { store } from './store.js'

/* ---- 内容加载 ---- */
async function loadContent(key) {
  const tab = store.tabs.find(t => t.key === key)
  if (!tab) return
  store.content = { key, state: 'loading' }
  try {
    if (tab.kind === 'office') {
      const r = await api('/privhub/api/office/read?project=' + encodeURIComponent(tab.project) + '&path=' + encodeURIComponent(tab.path))
      if (r.ok) store.content = { key, state: 'ready', office: { kind: r.kind, markdown: officeToMd(r.kind, r.content) } }
      else store.content = { key, state: 'error', error: r.error || '无法读取 Office 文档' }
      // 广播渲染完成（office2 等插件替换为原生预览）
      bus.emit('v3:md-rendered', { project: tab.project, path: tab.path, key })
      return
    }
    if (tab.kind === 'image') { store.content = { key, state: 'ready', url: rawUrl(tab.project, tab.path) }; return }
    if (tab.kind === 'pdf') { store.content = { key, state: 'ready', url: rawUrl(tab.project, tab.path) }; return }
    const r = await api('/privhub/api/preview?project=' + encodeURIComponent(tab.project) + '&path=' + encodeURIComponent(tab.path))
    if (r.ok) {
      if (r.type === 'text') {
        if (tab.kind === 'md') {
          store.content = { key, state: 'ready', markdown: r.data || '' }
        } else {
          store.content = { key, state: 'ready', text: r.data || '' }
        }
        // md / txt 等文本文件：打开即进入内嵌编辑（edit-md 监听，VS Code/Trae 式）
        bus.emit('md:auto-edit', { entry: { name: tab.name, isDir: false }, project: tab.project, path: tab.path.includes('/') ? tab.path.slice(0, tab.path.lastIndexOf('/')) : '' })
      } else if (r.type === 'image') store.content = { key, state: 'ready', url: rawUrl(tab.project, tab.path) }
      else if (r.type === 'pdf') store.content = { key, state: 'ready', url: rawUrl(tab.project, tab.path) }
      else store.content = { key, state: 'error', error: '该文件类型不支持在线查看' }
    } else {
      store.content = { key, state: 'error', error: r.error || '读取失败' }
    }
  } catch { store.content = { key, state: 'error', error: '读取失败（网络错误）' } }
  // 广播渲染完成（批注评论插件监听，重建锚点高亮）
  if (store.content && store.content.state === 'ready') bus.emit('v3:md-rendered', { project: tab.project, path: tab.path, key })
}

/* ================= Markdown 轻量渲染（离线） ================= */
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function inline(s) {
  let out = esc(s)
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
  return out
}
function renderMarkdown(md) {
  const lines = String(md || '').replace(/\r\n/g, '\n').split('\n')
  const html = []
  let i = 0, inCode = false, codeBuf = [], listBuf = [], listType = ''
  const flushList = () => {
    if (!listBuf.length) return
    html.push('<' + (listType === 'ol' ? 'ol' : 'ul') + '>' + listBuf.map(x => '<li>' + x + '</li>').join('') + '</' + (listType === 'ol' ? 'ol' : 'ul') + '>')
    listBuf = []
  }
  while (i < lines.length) {
    const line = lines[i]
    if (inCode) {
      if (line.trim().startsWith('```')) { inCode = false; html.push('<pre><code>' + esc(codeBuf.join('\n')) + '</code></pre>'); codeBuf = [] }
      else codeBuf.push(line)
      i++; continue
    }
    if (line.trim().startsWith('```')) { flushList(); inCode = true; i++; continue }
    const t = line.trim()
    if (t === '') { flushList(); html.push(''); i++; continue }
    const h = /^(#{1,6})\s+(.*)$/.exec(t)
    if (h) { flushList(); html.push('<h' + h[1].length + '>' + inline(h[2]) + '</h' + h[1].length + '>'); i++; continue }
    if (t === '---' || t === '***') { flushList(); html.push('<hr />'); i++; continue }
    if (t.startsWith('>')) { flushList(); html.push('<blockquote>' + inline(t.replace(/^>\s?/, '')) + '</blockquote>'); i++; continue }
    if (/^[-*+]\s+/.test(t)) { if (listType !== 'ul') { flushList(); listType = 'ul' } listBuf.push(inline(t.replace(/^[-*+]\s+/, ''))); i++; continue }
    if (/^\d+\.\s+/.test(t)) { if (listType !== 'ol') { flushList(); listType = 'ol' } listBuf.push(inline(t.replace(/^\d+\.\s+/, ''))); i++; continue }
    flushList(); listType = ''
    if (/^\|/.test(t) && i + 1 < lines.length && /^\|[\s:|-]+\|$/.test(lines[i + 1].trim())) {
      const head = t.split('|').slice(1, -1).map(c => inline(c.trim()))
      i += 2
      const rows = []
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(lines[i].split('|').slice(1, -1).map(c => inline(c.trim()))); i++ }
      html.push('<table><tr>' + head.map(c => '<th>' + c + '</th>').join('') + '</tr>' + rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</table>')
      continue
    }
    html.push('<p>' + inline(t) + '</p>')
    i++
  }
  flushList()
  return html.join('')
}

/* ================= Office 内容 → Markdown ================= */
function officeToMd(kind, content) {
  if (!content) return ''
  if (kind === 'doc' || kind === 'docx') return content.text || ''
  if (kind === 'pdf') return content.text || ''
  if (kind === 'pptx') {
    return (content.slides || []).map((s, i) => '## Slide ' + (i + 1) + '\n\n**' + (s.title || '') + '**\n' + (s.bullets || []).map(b => '- ' + b).join('\n')).join('\n\n')
  }
  if (kind === 'xlsx') {
    const out = []
    for (const s of content.sheets || []) {
      out.push('### ' + s.name)
      const rows = s.rows || []
      for (let i = 0; i < rows.length; i++) {
        out.push('| ' + (rows[i] || []).map(c => (c === null || c === undefined ? '' : String(c)).replace(/\|/g, '\\|')).join(' | ') + ' |')
        if (i === 0) out.push('| ' + (rows[i] || []).map(() => '---').join(' | ') + ' |')
      }
      out.push('')
    }
    return out.join('\n')
  }
  return ''
}

export { loadContent, esc, inline, renderMarkdown, officeToMd }
