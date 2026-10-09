/**
 * content — 内容加载与渲染：文件预览取数、Markdown 轻量渲染、Office → Markdown。
 * @module privhub-files-explorer-v3/client/content
 */

import { api, bus } from './deps.js'
import { rawUrl, downloadUrl, textModeOf, extOf, mediaTagOf, isNativeMedia } from './utils.js'
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

/* ================= 只读预览的「结构化文本」子模式 =================
 *
 * 这是 nowen-note 的 `detectRenderMode` 在本仓的对应物：同一条文本预览分支、
 * 同一份接口响应，按内容形态再选一次「怎么画」——
 *   mode: ''（不认识的名字）→ 既有行为（`<pre>` 纯文本），一个字节都不变；
 *   'table'（csv/tsv）    → 表格；
 *   'json'                → 缩进美化。
 *
 * 三条设计约束（都来自本仓纪律，不是通用最佳实践）：
 *   ① **只决定画法，不决定能不能打开**。能不能打开是后端 `readFileForPreview` 的 `type`；
 *      这里的任何"解析不出来"都必须回落纯文本，不能让一个原本能看的文件变成打不开。
 *   ② **不新增依赖、不新增请求**。正文已经从 `/api/preview` 到手，这里是纯字符串处理；
 *      美化/表格失败一律回 `null`（调用方走原来的 `<pre>`），不存在"半截内容"。
 *   ③ **有上限、且超限就整体回落**。宁可显示原文，也不显示一张被截断的表 ——
 *      半张表比没有表更容易被当成"文件就这些内容"。 */

/** 表格最多渲染这么多行 —— 超过就整体回落纯文本（不截断）。 */
const MAX_TABLE_ROWS = 1000
/** 表格最多渲染这么多列 —— 同上，超宽也整体回落（不静默丢列）。 */
const MAX_TABLE_COLS = 60
/** 超过这个体积就不做 JSON 美化（美化会再产出一份同样大的字符串）。 */
const MAX_PRETTY_JSON_BYTES = 2 * 1024 * 1024

/**
 * 分隔符文本 → 二维数组；**返回 `null` 表示"不按表格渲染"**（行列不成立 / 超上限）。
 *
 * 支持的是 RFC4180 的常用子集：引号包裹、引号内换行、双写引号转义、CRLF / LF 混用。
 * 不做的是：不认 `;`/`|` 等其它分隔符（列数判定全靠调用方给的这一个字符）。
 *
 * 超上限时**提前收工返回 `null`**，不把整份文件扫完 —— 一个几十 MB 的 csv 不该为了
 * "看一眼"而全量解析。
 */
function parseDelimited(text, delim) {
  const s = String(text == null ? '' : text)
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') { cell += '"'; i++ } else inQuotes = false
      } else cell += ch
      continue
    }
    if (ch === '"') { inQuotes = true; continue }
    if (ch === delim) { row.push(cell); cell = ''; continue }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++
      row.push(cell); cell = ''
      rows.push(row); row = []
      if (rows.length > MAX_TABLE_ROWS) return null
      continue
    }
    cell += ch
  }
  /* 收尾：最后一行没有换行符时补上（`cell === '' && row.length === 0` 说明正好以换行结尾，
   * 此时不补 —— 免得凭空多出一行空行）。 */
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  if (rows.length > MAX_TABLE_ROWS) return null
  let cols = 0
  for (const r of rows) if (r.length > cols) cols = r.length
  /* 少于两行或只有一列 ⇒ 它不是一张表（一列的文件和普通 txt 没有区别），回落纯文本。 */
  if (rows.length < 2 || cols < 2) return null
  if (cols > MAX_TABLE_COLS) return null
  /* 行列补齐：短行补空串，保证 `<td>` 网格是矩形（否则表格会缺格、错位）。 */
  for (const r of rows) while (r.length < cols) r.push('')
  return { rows, cols }
}

/** JSON 美化：解析失败 / 体量过大都返回 `null`（回落纯文本，绝不吞掉原文）。 */
function prettyJson(text) {
  const s = String(text == null ? '' : text)
  if (utf8Bytes(s) > MAX_PRETTY_JSON_BYTES) return null
  try { return JSON.stringify(JSON.parse(s), null, 2) } catch { return null }
}

/** 按扩展名选子模式并解析；任何一步不成立都回 `null`（= 既有纯文本行为）。 */
function structuredView(name, text) {
  const mode = textModeOf(name)
  if (mode === 'table') {
    const t = parseDelimited(text, extOf(name) === 'tsv' ? '\t' : ',')
    return t === null ? null : { mode: 'table', rows: t.rows, cols: t.cols }
  }
  if (mode === 'json') {
    const pretty = prettyJson(text)
    return pretty === null ? null : { mode: 'json', text: pretty }
  }
  return null
}

/* ---- 内容加载 ---- */
async function loadContent(key) {
  const tab = store.tabs.find(t => t.key === key)
  if (!tab) return
  store.content = { key, state: 'loading' }
  try {
    if (tab.kind === 'office') {
      const r = await api('/privhub/api/office/read?project=' + encodeURIComponent(tab.project) + '&path=' + encodeURIComponent(tab.path))
      /* Office 那条链只有两态：**要么给正文，要么明说读不出来**。
       *
       * 迁前后端在 `.doc` 解析失败时会回 `ok:true` + 一句兜底文案（'[无法提取 DOC 文本]（…）'），
       * 这里照单收下 ⇒ 界面把**提示句当正文**渲染，用户以为文档里就那一行字
       * （`docs/reviews/11-格式支持矩阵与铺满修复.md` §2.5 ②，本批修掉）。
       * 现在：后端失败即 `ok:false` + `error`；这里只认这两个字段，
       * 且**不**把任何"提示句"混进正文（`officeToMd` 只产出真内容，见下）。
       * `reason` 是后端给的稳定原因码（unsupported-type / capability-missing / parse-failed / …），
       * 本层**不解析它**、也不据此分流布局 —— 只把它挂进 state 供排查，
       * 用户看到的一句话来自后端（那里才知道"是这台机器缺能力"还是"这个文件不对"）。 */
      if (r.ok) {
        store.content = { key, state: 'ready', office: { kind: r.kind, markdown: officeToMd(r.kind, r.content) } }
        store.content.officeReason = ''
      } else {
        store.content = { key, state: 'error', error: r.error || '无法读取 Office 文档' }
        store.content.officeReason = r.reason || ''
      }
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
    /* 音视频（2026-10-09）：与图片/PDF 同一形状 —— 只给 `preview-raw` 的**直链**，
     * 让浏览器自己按 Range 分段取。**绝不**在这里把它 fetch 成 Blob/ObjectURL：
     * 那样几十 MB 的视频会整段进内存、且丢掉 Range/206（nowen-note 在 Android 上踩过，明写在
     * `useAttachmentVideoRenderSource.ts`）。`mediaTag`/`native` 是给模板分流用的两个事实：
     * 用 `<video>` 还是 `<audio>`、以及"能不能原生播"（不能 ⇒ 同一支路画兜底说明+下载）。 */
    if (tab.kind === 'media') {
      store.content = {
        key, state: 'ready', url: rawUrl(tab.project, tab.path),
        mediaTag: mediaTagOf(tab.name), native: isNativeMedia(tab.name),
        downloadUrl: downloadUrl(tab.project, tab.path),
      }
      return
    }
    const r = await api('/privhub/api/preview?project=' + encodeURIComponent(tab.project) + '&path=' + encodeURIComponent(tab.path))
    if (r.ok) {
      if (r.type === 'text') {
        const raw = r.data || ''
        if (tab.kind === 'md') {
          store.content = { key, state: 'ready', markdown: raw }
        } else {
          /* 结构化子模式（表格 / 美化 JSON）：只影响这一分支【怎么画】。
           * `structuredView` 解析不出来就回 null ⇒ 渲染走原来的 `<pre>`，与改动前逐字一致；
           * `content.text` 仍是**原文**（不改写），子模式结果另放 `structured`，互不污染。 */
          store.content = { key, state: 'ready', text: raw, structured: structuredView(tab.name, raw) }
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
      /* 后端说这是媒体，但标签的 kind 没落在 'media' 上（例如从旧会话/别处带进来的 name）——
       * 按同一形状补上，避免"后端认、界面不认"的分裂（`.ico` 那次就是这种分裂）。 */
      else if (r.type === 'media') {
        store.content = {
          key, state: 'ready', url: rawUrl(tab.project, tab.path),
          mediaTag: mediaTagOf(tab.name), native: isNativeMedia(tab.name),
          downloadUrl: downloadUrl(tab.project, tab.path),
        }
      }
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
      /* 被上限截断时**明说**一句：后端把"本表实际有多少行/列"随内容回带
       *（`totalRows`/`totalCols`/`truncatedRows`/`truncatedCols`），这里只负责把数字说成话。
       * 为什么非要这句：旧的上限是**静默**的 —— 一张 3320 行的表只给 1000 行、什么也不说，
       * 用户只会以为"这张表就这么多"。半张表比没有表更容易被当成全部内容。
       * 没被截断时不加（否则每张表底下都挂一句噪音）。 */
      const notes = []
      if (s.truncatedRows) notes.push('仅显示前 ' + rows.length + ' 行（本表共 ' + s.totalRows + ' 行）')
      if (s.truncatedCols) notes.push('仅显示前 ' + ((rows[0] || []).length) + ' 列（本表共 ' + s.totalCols + ' 列）')
      if (notes.length) out.push('*（' + notes.join('；') + '）*')
      out.push('')
    }
    return out.join('\n')
  }
  return ''
}

export { loadContent, fmtSize, esc, inline, renderMarkdown, officeToMd }
