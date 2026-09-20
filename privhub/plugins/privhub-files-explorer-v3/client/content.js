/**
 * content — 内容加载与渲染：文件预览取数、Markdown 轻量渲染、Office → Markdown。
 * @module privhub-files-explorer-v3/client/content
 */

import { api, bus } from './deps.js'
import { rawUrl } from './utils.js'
import { store } from './store.js'

/* 自动进内嵌编辑态的体积闸（1 MB）。
 *
 * 来历：内容区打开文本文件后会 emit 'md:auto-edit'，edit-md 随即把**整份内容**灌进
 * 内嵌编辑器（textarea / CodeMirror）。超过这个体积自动编辑会拖垮浏览器（大文件
 * 渲染 + 实时预览是同步的），而「在线查看上限」已被抬到 10 MB —— 若不加这道闸，
 * 一本 2.4 MB 的书一打开就会把页面卡死，等于白抬。
 * 所以：小于此值照旧自动进编辑（保持既有体验）；大于此值时只读呈现。
 * 取 1 MB 的理由：此前 512 KB 上限下能打开的文件（一般文档/代码/小 md）全部落在
 * 1 MB 以内，既有体验不受影响；而生成体积的「长文档/书稿」一律走只读。
 * 与后端 MAX_TEXT_PREVIEW_BYTES（10 MB）是两件事：那个管「能不能读进来」，这个管
 * 「读进来后要不要自动进编辑器」。以后要调就只改这一处。
 *
 * 注：判体积一律用**字节数**，不用字符数——中文一个字 3 字节，按字符数判会漏。
 * 字节数的来源按优先级取：① 接口回带的 size（超限时后端必带）；
 * ② 拿不到就本地按 UTF-8 重算（正文已经在手，包成 Uint8Array 不复制字符串本身，
 *   代价远低于把同样一段内容灌进编辑器）。 */
const AUTO_EDIT_MAX_BYTES = 1024 * 1024
const utf8Bytes = (s) => (typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(s).length : s.length)

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
      /* 【第二步 d】这里原来会 emit 'v3:md-rendered'（连同函数末尾那一发）。
       * 它发在 `store.content` 赋值之后、**Vue 还没渲染 DOM 之前** —— 那一刻新节点根本不存在，
       * 监听方（office2 迁前 / comments 迁前）只能看到上一次渲染的旧节点，这正是"锚点认错根"的由来。
       * 现在这件事归宿主：panel.js 在渲染完成后（$nextTick）经 `v3:md-root` 把**渲染根的节点引用**
       * 交出去；`v3:md-rendered` 这个事件名**已作废**（emit/on 各 0 处，剩下的命中都是讲来历的注释）。
       * 这里安静下来，不是漏了通知。 */
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
        /* md / txt 等文本文件：打开即进入内嵌编辑（edit-md 监听，VS Code/Trae 式）。
         * 体积闸：超过 AUTO_EDIT_MAX_BYTES 的文件【不】自动进编辑态 —— 自动编辑会
         * 把整份内容灌进编辑器并同步渲染，大文件会把浏览器卡死。此时改为只读呈现，
         * 并在内容区上方给一句克制的说明（不弹窗、不加按钮、不改布局）。 */
        const bytes = typeof r.size === 'number' ? r.size : utf8Bytes(r.data || '')
        // 只读说明文本：两种情形共用一句，避免文案两处维护
        const readonlyHint = bytes > AUTO_EDIT_MAX_BYTES
          ? '文件较大（' + fmtSize(bytes) + '），已以只读方式打开；需要编辑请先在文件列表里右键该文件，选「⬇ 下载」后用本地编辑器打开'
          : ''
        if (!readonlyHint) {
          bus.emit('md:auto-edit', { entry: { name: tab.name, isDir: false }, project: tab.project, path: tab.path.includes('/') ? tab.path.slice(0, tab.path.lastIndexOf('/')) : '' })
        }
        /* 把实际字节数与「是否已自动进编辑」带进 state：
         * 面板据此显示只读说明；后续若要在别处（详情面板等）复用，也读同一处事实。 */
        store.content.size = bytes
        store.content.autoEdit = !readonlyHint
        store.content.readonlyHint = readonlyHint
      } else if (r.type === 'image') store.content = { key, state: 'ready', url: rawUrl(tab.project, tab.path) }
      else if (r.type === 'pdf') store.content = { key, state: 'ready', url: rawUrl(tab.project, tab.path) }
      /* 超限与不支持是两件事，分两句说：
       * 超限 = 类型本来能看，只是体积超过在线查看上限 → 带上实际大小与上限，并指出出路；
       * 不支持 = 这个扩展名本就没有在线查看方式 → 保持原来的说法。 */
      else if (r.type === 'too-large') {
        const over = r.size ? '（' + fmtSize(r.size) + '）' : ''
        const cap = r.limit ? fmtSize(r.limit) : '10 MB'
        store.content = { key, state: 'error', error: '文件过大' + over + '，超出在线查看上限 ' + cap + '；请在文件列表里右键该文件，选「⬇ 下载」后用本地编辑器查看' }
      }
      else store.content = { key, state: 'error', error: '该文件类型不支持在线查看' }
    } else {
      store.content = { key, state: 'error', error: r.error || '读取失败' }
    }
  } catch { store.content = { key, state: 'error', error: '读取失败（网络错误）' } }
  /* 【第二步 d】末尾那一发 'v3:md-rendered' 已删除 —— 它同样发在 Vue 渲染之前。
   * 「渲染完成」这件事现在由宿主在渲染后发出（panel.js 的 noticeMdRoot → `v3:md-root`，
   * 带渲染根的节点引用）。这里不再替宿主广播。 */
}

/* ================= Markdown 轻量渲染（离线） ================= */
/* 人读得懂的大小（MB / KB），避免把一串字节数丢给用户 */
function fmtSize(n) {
  const x = Number(n) || 0
  if (x >= 1024 * 1024) return (x / (1024 * 1024)).toFixed(1) + ' MB'
  if (x >= 1024) return Math.round(x / 1024) + ' KB'
  return x + ' B'
}
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

export { loadContent, fmtSize, esc, inline, renderMarkdown, officeToMd }
