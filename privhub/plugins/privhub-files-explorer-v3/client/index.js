/**
 * privhub-files-explorer-v3 · client — V3 布局（tree + panel slot）
 *
 * V3 布局（VS Code 范式）：
 *   1. 侧边栏树同时显示文件夹与文件，每个节点右侧有 ⋯ 操作按钮
 *      （详情 / 权限 / 收藏 / 下载 / 编辑 / 重命名 / 新建子文件夹 / 删除）
 *   2. 单击文件 → 在中央主区打开为标签页（tabs），标签不关闭就一直在，
 *      内容渲染在中间（不再使用右侧 340px 预览条）
 *   3. 编辑能力复用既有插件：md → bus 'entry:open'（edit-md 浮层），
 *      office → bus 'office:edit'（office-ui 浮层）；仅从「✏️ 编辑」触发
 *
 * 与 V2 差异：本插件自带树缓存（含文件）与文件标签栏，不依赖
 * privhub-files-explorer / privhub-files-preview / privhub-shell-tabs。
 *
 * @module privhub-files-explorer-v3/client
 */

const { api, nav, bus, AUTH, fileIcon, previewImageUrl, previewPdfUrl } = window.PrivHub
const { reactive } = window.Vue

/* ================= 共享 store（树缓存 + 文件标签 + 弹窗） ================= */
const store = reactive({
  tree: {},          // key(project + '/' + path) -> { expanded, children: [{name,path,isDir,type,sizeText,mtime}] }
  tabs: [],          // [{ key, project, path, name, kind, sizeText, type }]
  activeKey: '',     // 激活 tab key
  content: null,     // { key, state: 'loading'|'ready'|'error', text, markdown, url, office, error }
  ctxMenu: null,     // { x, y, entry, kind }  ⋯/右键/长按共用
  detailTarget: null,
  permTarget: null,
  promptState: null, // { mode:'move'|'mkdir', title, value, target }
})

/* ================= 样式注入（V3 专属，不依赖骨架 CSS） ================= */
const styleEl = document.createElement('style')
styleEl.textContent = `
.v3-tn { display:flex; align-items:center; gap:6px; padding:5px 6px; border-radius:6px; font-size:13px; cursor:pointer; position:relative; }
.v3-tn:hover { background:var(--panel2); }
.v3-tn.active { background:rgba(90,130,200,.15); color:var(--accent); }
.v3-tn .v3-name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.v3-tn .v3-dots { visibility:hidden; width:22px; height:22px; border-radius:5px; text-align:center; line-height:20px; font-size:13px; color:var(--muted); flex-shrink:0; }
.v3-tn:hover .v3-dots { visibility:visible; }
.v3-tn .v3-dots:hover { background:var(--panel); color:var(--text); }
.v3-tabs { display:flex; align-items:center; gap:2px; padding:5px 10px 0; border-bottom:1px solid var(--line); background:var(--panel); overflow-x:auto; scrollbar-width:none; }
.v3-tab { flex-shrink:0; display:flex; align-items:center; gap:6px; padding:5px 10px; border-radius:7px 7px 0 0; font-size:12.5px; cursor:pointer; color:var(--muted); border:1px solid transparent; border-bottom:none; white-space:nowrap; max-width:200px; }
.v3-tab:hover { background:var(--panel2); color:var(--text); }
.v3-tab.on { background:var(--panel2); color:var(--accent); border-color:var(--line); font-weight:600; }
.v3-tab .v3-tab-name { overflow:hidden; text-overflow:ellipsis; }
.v3-tab .v3-tab-x { width:16px; height:16px; border-radius:50%; text-align:center; line-height:15px; font-size:11px; flex-shrink:0; }
.v3-tab .v3-tab-x:hover { background:var(--line); color:var(--danger); }
.v3-content { flex:1; overflow:auto; padding:16px 22px; background:var(--bg); }
.v3-content-head { display:flex; align-items:center; gap:10px; margin-bottom:12px; padding-bottom:10px; border-bottom:1px solid var(--line); }
.v3-content-title { font-size:14px; font-weight:600; display:flex; align-items:center; gap:8px; }
.v3-content-title .v3-path { font-weight:400; font-size:11.5px; color:var(--muted); }
.v3-op-btn { font-size:12px; padding:4px 10px; border-radius:6px; background:transparent; border:1px solid var(--line); color:var(--muted); cursor:pointer; }
.v3-op-btn:hover { color:var(--accent); border-color:var(--accent); }
.v3-md { font-size:13.5px; line-height:1.75; color:var(--text); max-width:900px; }
.v3-md h1,.v3-md h2,.v3-md h3 { margin:16px 0 8px; }
.v3-md pre { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:12px; overflow:auto; font-size:12.5px; }
.v3-md code { background:var(--panel); padding:1px 5px; border-radius:4px; font-size:12.5px; }
.v3-md pre code { background:transparent; padding:0; }
.v3-md table { border-collapse:collapse; margin:8px 0; font-size:12.5px; }
.v3-md th,.v3-md td { border:1px solid var(--line); padding:5px 10px; }
.v3-md th { background:var(--panel); }
.v3-md blockquote { border-left:3px solid var(--accent); margin:8px 0; padding:2px 12px; color:var(--muted); }
.v3-md a { color:var(--accent); }
.v3-text { font-size:13px; white-space:pre-wrap; word-break:break-all; color:var(--text); font-family:Consolas,Menlo,monospace; }
.v3-img { max-width:100%; border-radius:8px; }
.v3-pdf { width:100%; height:calc(100vh - 260px); border:1px solid var(--line); border-radius:8px; }
.v3-loading { color:var(--muted); font-size:13px; padding:60px 0; text-align:center; }
.file-table-row .v3-row-dots { visibility:hidden; margin-left:auto; width:22px; height:22px; border-radius:5px; text-align:center; line-height:20px; font-size:13px; color:var(--muted); cursor:pointer; flex-shrink:0; }
.file-table-row:hover .v3-row-dots { visibility:visible; }
.file-table-row .v3-row-dots:hover { background:var(--panel); color:var(--accent); }
`
document.head.appendChild(styleEl)

/* ================= 工具 ================= */
const tabKey = (project, path) => project + '|' + path
function kindOf(name) {
  const ext = (name.split('.').pop() || '').toLowerCase()
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  if (ext === 'md') return 'md'
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return 'office'
  return 'text'
}
function rawUrl(project, path) {
  return '/privhub/api/preview-raw?project=' + encodeURIComponent(project) + '&path=' + encodeURIComponent(path)
}
function relPath(project, dir, name) { return dir ? dir + '/' + name : name }

/* ---- 标签持久化（按用户隔离，sessionStorage） ---- */
const TABS_KEY = 'privhub_v3_tabs_'
function tabStoreKey() { return TABS_KEY + (AUTH.user ? AUTH.user.username : 'anon') }
function persistTabs() {
  try { sessionStorage.setItem(tabStoreKey(), JSON.stringify(store.tabs.map(t => ({ project: t.project, path: t.path, name: t.name })))) } catch { /* 忽略 */ }
}
function restoreTabs() {
  store.tabs = []
  store.activeKey = ''
  store.content = null
  try {
    const raw = sessionStorage.getItem(tabStoreKey())
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) {
        const visible = (nav.projectsList || []).map(p => p.name !== undefined ? p.name : p)
        for (const t of arr) {
          if (!t || t.project === undefined || t.path === undefined) continue
          if (visible.length && !visible.includes(t.project)) continue // 权限过滤：无权项目标签不恢复
          if (nav.project !== null && t.project !== nav.project) continue // 重挂载时只恢复当前项目标签
          store.tabs.push({ key: tabKey(t.project, t.path), project: t.project, path: t.path, name: t.name || t.path.split('/').pop(), kind: kindOf(t.name || t.path.split('/').pop()) })
        }
      }
    }
  } catch { store.tabs = [] }
  persistTabs() // 无条件写当前用户 key（含空数组），登出换用户后 key 隔离可见
  if (store.tabs.length) { store.activeKey = store.tabs[store.tabs.length - 1].key; void loadContent(store.activeKey) }
}

/* ---- 树缓存（含文件；V2 的 nav.toggleTree 只存目录，不复用） ---- */
async function loadTree(project, path) {
  const key = (project || '') + '/' + (path || '')
  const q = path ? '&path=' + encodeURIComponent(path) : ''
  const r = await api('/privhub/api/list?project=' + encodeURIComponent(project) + q)
  if (r.ok) {
    store.tree[key] = {
      expanded: true,
      children: (r.entries || []).map(e => ({
        name: e.name, path: path ? path + '/' + e.name : e.name, isDir: !!e.isDir,
        type: e.type, sizeText: e.sizeText, mtime: e.mtime,
      })),
    }
  }
}
function treeOf(project, path) {
  const key = (project || '') + '/' + (path || '')
  return store.tree[key] || null
}
async function toggleTree(project, path) {
  const key = (project || '') + '/' + (path || '')
  const node = store.tree[key]
  if (!node) { await loadTree(project, path) }
  else { node.expanded = !node.expanded }
}
async function refreshTree() {
  // 当前目录及其父级缓存失效，重新拉取
  const cur = (nav.project || '') + '/' + (nav.path || '')
  delete store.tree[cur]
  if (nav.path) {
    const parent = nav.path.includes('/') ? nav.path.slice(0, nav.path.lastIndexOf('/')) : ''
    delete store.tree[(nav.project || '') + '/' + parent]
  }
  if (nav.project !== null) await loadTree(nav.project, nav.path)
}

/* ---- 标签页：打开 / 激活 / 关闭 ---- */
function openTab(entry, project, dirPath) {
  if (!entry || entry.isDir) return
  const path = relPath(project, dirPath, entry.name)
  const key = tabKey(project, path)
  const tab = {
    key, project, path, name: entry.name, kind: kindOf(entry.name),
    sizeText: entry.sizeText || '', type: entry.type || '',
  }
  const idx = store.tabs.findIndex(t => t.key === key)
  if (idx >= 0) store.tabs.splice(idx, 1)
  store.tabs.push(tab)
  if (store.tabs.length > 30) store.tabs.splice(0, store.tabs.length - 30)
  store.activeKey = key
  persistTabs()
  // 兼容 tags 等插件对「当前选中文件」的依赖（不调 selectEntry：不开右侧预览）
  nav.selected = { ...entry }
  nav.rightOpen = false
  void loadContent(key)
  bus.emit('v3:tab-opened', { project, path, name: entry.name })
}
function activateTab(key) {
  if (store.activeKey === key) return
  store.activeKey = key
  const tab = store.tabs.find(t => t.key === key)
  if (tab) {
    nav.selected = { name: tab.name, isDir: false, sizeText: tab.sizeText, type: tab.type }
    nav.rightOpen = false
  }
  if (!store.content || store.content.key !== key) void loadContent(key)
}
function closeTab(key) {
  const idx = store.tabs.findIndex(t => t.key === key)
  if (idx < 0) return
  const wasActive = store.activeKey === key
  store.tabs.splice(idx, 1)
  persistTabs()
  if (wasActive) {
    store.content = null
    if (store.tabs.length) {
      const next = store.tabs[Math.min(idx, store.tabs.length - 1)]
      store.activeKey = next.key
      void loadContent(next.key)
    } else {
      store.activeKey = ''
    }
  }
}
function closeOthers(key) {
  store.tabs = store.tabs.filter(t => t.key === key)
  persistTabs()
  store.activeKey = key
  if (!store.content || store.content.key !== key) void loadContent(key)
}

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
      return
    }
    if (tab.kind === 'image') { store.content = { key, state: 'ready', url: rawUrl(tab.project, tab.path) }; return }
    if (tab.kind === 'pdf') { store.content = { key, state: 'ready', url: rawUrl(tab.project, tab.path) }; return }
    const r = await api('/privhub/api/preview?project=' + encodeURIComponent(tab.project) + '&path=' + encodeURIComponent(tab.path))
    if (r.ok) {
      if (r.type === 'text') {
        if (tab.kind === 'md') store.content = { key, state: 'ready', markdown: r.data || '' }
        else store.content = { key, state: 'ready', text: r.data || '' }
      } else if (r.type === 'image') store.content = { key, state: 'ready', url: rawUrl(tab.project, tab.path) }
      else if (r.type === 'pdf') store.content = { key, state: 'ready', url: rawUrl(tab.project, tab.path) }
      else store.content = { key, state: 'error', error: '该文件类型不支持在线查看' }
    } else {
      store.content = { key, state: 'error', error: r.error || '读取失败' }
    }
  } catch { store.content = { key, state: 'error', error: '读取失败（网络错误）' } }
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

/* ================= 菜单操作（⋯ / 右键 / 长按共用） ================= */
function openMenuFor(entry, dirPath, x, y) {
  store.ctxMenu = {
    x: Math.min(x, window.innerWidth - 180),
    y: Math.min(y, Math.max(0, window.innerHeight - 320)),
    entry, dirPath,
    project: nav.project,
  }
}
function closeMenu() { store.ctxMenu = null }
function ctxRelPath() {
  const m = store.ctxMenu
  return m ? relPath(m.project, m.dirPath, m.entry.name) : ''
}
function openDetail() {
  const m = store.ctxMenu
  if (m) store.detailTarget = { entry: m.entry, project: m.project, dirPath: m.dirPath }
  closeMenu()
}
async function openPerm() {
  const m = store.ctxMenu
  closeMenu()
  if (!m) return
  const rel = relPath(m.project, m.dirPath, m.entry.name)
  store.permTarget = { entry: m.entry, project: m.project, path: rel, loading: true, rules: null, error: '' }
  const isAdmin = AUTH.user && AUTH.user.role === 'admin'
  if (!isAdmin) { store.permTarget.loading = false; return }
  try {
    const r = await api('/privhub/api/acl/rules')
    if (r.ok) {
      const visible = (r.rules || []).filter(x =>
        x.project === m.project &&
        (x.path === '' || rel === x.path || rel.startsWith(x.path + '/'))
      )
      store.permTarget.rules = visible
    } else store.permTarget.error = r.error || '无法读取权限规则'
  } catch { store.permTarget.error = '无法读取权限规则' }
  store.permTarget.loading = false
}
function doRename() {
  const m = store.ctxMenu
  closeMenu()
  if (!m) return
  const rel = relPath(m.project, m.dirPath, m.entry.name)
  nav.askInput('请输入新名称：', m.entry.name, async (newName) => {
    if (!newName || newName === m.entry.name) return
    const r = await api('/privhub/api/rename', { method: 'POST', body: JSON.stringify({ project: m.project, path: rel, newName }) })
    if (r.ok) {
      window.PrivHub.toast('已重命名为「' + newName + '」')
      await refreshAfterChange(m.project, m.dirPath)
      // 更新打开的标签（重命名文件本身）
      const oldKey = tabKey(m.project, rel)
      const idx = store.tabs.findIndex(t => t.key === oldKey)
      if (idx >= 0) {
        const t = store.tabs[idx]
        const newPath = relPath(m.project, m.dirPath, newName)
        store.tabs[idx] = { ...t, key: tabKey(m.project, newPath), path: newPath, name: newName }
        if (store.activeKey === oldKey) { store.activeKey = store.tabs[idx].key; store.content = null; void loadContent(store.activeKey) }
        persistTabs()
      }
    } else window.PrivHub.toast(r.error || '重命名失败', 'error')
  })
}
async function doDelete() {
  const m = store.ctxMenu
  closeMenu()
  if (!m) return
  if (!confirm('将「' + m.entry.name + '」移入回收站？')) return
  const rel = relPath(m.project, m.dirPath, m.entry.name)
  const r = await api('/privhub/api/delete', { method: 'POST', body: JSON.stringify({ project: m.project, path: rel }) })
  if (r.ok) {
    window.PrivHub.toast('「' + m.entry.name + '」已移入回收站')
    bus.emit('trash:changed', {})
    bus.emit('file:trash', { id: m.entry.name, project: m.project, path: rel })
    await refreshAfterChange(m.project, m.dirPath)
    // 关闭该文件/目录下所有打开的标签
    const prefix = rel + (m.entry.isDir ? '/' : '')
    const before = store.tabs.length
    store.tabs = store.tabs.filter(t => !(t.project === m.project && (t.path === rel || t.path.startsWith(prefix))))
    if (store.tabs.length !== before) {
      if (!store.tabs.some(t => t.key === store.activeKey)) {
        store.content = null
        store.activeKey = store.tabs.length ? store.tabs[store.tabs.length - 1].key : ''
        if (store.activeKey) void loadContent(store.activeKey)
      }
      persistTabs()
    }
  } else window.PrivHub.toast(r.error || '删除失败', 'error')
}
function doFavorite() {
  const m = store.ctxMenu
  closeMenu()
  if (!m) return
  bus.emit('fav:add', { project: m.project, path: relPath(m.project, m.dirPath, m.entry.name), name: m.entry.name, isDir: m.entry.isDir })
  window.PrivHub.toast('已加入收藏 ⭐')
}
async function doDownload() {
  const m = store.ctxMenu
  closeMenu()
  if (!m || m.entry.isDir) return
  try {
    const r = await fetch('/privhub/api/download?project=' + encodeURIComponent(m.project) + '&path=' + encodeURIComponent(relPath(m.project, m.dirPath, m.entry.name)), {
      headers: { authorization: 'Bearer ' + AUTH.token },
    })
    if (!r.ok) { window.PrivHub.toast('下载失败（HTTP ' + r.status + '）', 'error'); return }
    const blob = await r.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = m.entry.name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 5000)
  } catch { window.PrivHub.toast('下载失败', 'error') }
}
function doEdit() {
  const m = store.ctxMenu
  closeMenu()
  if (!m || m.entry.isDir) return
  const rel = relPath(m.project, m.dirPath, m.entry.name)
  const ext = (m.entry.name.split('.').pop() || '').toLowerCase()
  if (['doc', 'docx', 'xlsx', 'pptx', 'pdf'].includes(ext)) {
    bus.emit('office:edit', { entry: m.entry, project: m.project, path: rel })
  } else if (ext === 'md') {
    bus.emit('entry:open', { entry: m.entry, project: m.project, path: m.dirPath || '' })
  }
}
function doMkdirHere() {
  const m = store.ctxMenu
  closeMenu()
  if (!m || !m.entry.isDir) return
  store.promptState = { mode: 'mkdir', title: '在「' + m.entry.name + '」中新建文件夹的名称：', value: '', target: m }
}
async function doMkdirHereSubmit(name) {
  const m = store.promptState ? store.promptState.target : null
  store.promptState = null
  if (!m || !name) return
  const rel = relPath(m.project, m.dirPath, m.entry.name)
  const r = await api('/privhub/api/mkdir', { method: 'POST', body: JSON.stringify({ project: m.project, path: rel, name }) })
  if (r.ok) {
    window.PrivHub.toast('文件夹「' + name + '」已创建')
    await refreshAfterChange(m.project, rel)
    // 展开目标目录
    const key = m.project + '/' + (rel || '')
    const node = store.tree[key]
    if (node) { node.expanded = true; await loadTree(m.project, rel) }
    else await loadTree(m.project, rel)
  } else window.PrivHub.toast(r.error || '新建失败', 'error')
}
async function refreshAfterChange(project, dirPath) {
  if (project === nav.project && (dirPath || '') === (nav.path || '')) {
    await nav.openDir(project, nav.path)
  }
  await refreshTree()
}

/* 新建文件夹（自实现：骨架 nav.submitMkdir 只刷新 V2 树缓存，V3 树需一并刷新） */
function submitMkdirV3() {
  const navSelf = nav
  nav.askInput('请输入文件夹名称：', '', async (name) => {
    if (!name) return
    const r = await api('/privhub/api/mkdir', { method: 'POST', body: JSON.stringify({ project: navSelf.project, path: navSelf.path, name }) })
    if (r.ok) {
      window.PrivHub.toast('文件夹「' + name + '」已创建')
      await navSelf.openDir(navSelf.project, navSelf.path)
      await refreshTree()
    } else window.PrivHub.toast(r.error || '新建失败', 'error')
  })
}

/* ================= 递归树节点 ================= */
const TreeNodeV3 = {
  name: 'v3-tree-node',
  props: {
    label: String, project: String, path: String, depth: Number, entry: Object,
  },
  computed: {
    node() { return treeOf(this.project, this.path) },
    expanded() { const n = this.node; return n ? n.expanded : false },
    children() { const n = this.node; return n ? n.children : [] },
    isActive() { return nav.project === this.project && nav.path === this.path },
  },
  methods: {
    onToggle() { void toggleTree(this.project, this.path) },
    onClick() {
      if (this.entry.isDir) nav.openDir(this.project, this.path)
      else openTab(this.entry, this.project, this.path.includes('/') ? this.path.slice(0, this.path.lastIndexOf('/')) : '')
    },
    onDots(ev) { ev.stopPropagation(); openMenuFor(this.entry, this.path.includes('/') ? this.path.slice(0, this.path.lastIndexOf('/')) : '', ev.clientX, ev.clientY + 6) },
    openFileInDir() {
      // 树里文件点击 = 打开标签（路径即文件完整相对路径）
      openTab(this.entry, this.project, this.path.includes('/') ? this.path.slice(0, this.path.lastIndexOf('/')) : '')
    },
  },
  template: `
    <div>
      <div class="v3-tn" :class="{ active: isActive }" :style="{ paddingLeft: (8 + depth * 15) + 'px' }">
        <span class="tree-arrow" @click.stop="onToggle" style="cursor:pointer;width:14px;display:inline-block;flex-shrink:0;text-align:center;font-size:10px;color:var(--muted)">
          {{ entry.isDir ? (expanded ? '▾' : '▸') : '·' }}
        </span>
        <span @click="entry.isDir ? onClick() : openFileInDir()" style="flex:1;display:flex;align-items:center;gap:6px;cursor:pointer;min-width:0">
          <span>{{ entry.isDir ? (expanded ? '📂' : '📁') : fileIcon(entry.type) }}</span>
          <span class="v3-name" :title="entry.name">{{ label }}</span>
        </span>
        <span class="v3-dots" title="操作" @click.stop="onDots($event)">⋯</span>
      </div>
      <div v-if="entry.isDir && expanded">
        <v3-tree-node
          v-for="c in children" :key="c.path"
          :label="c.name" :project="project" :path="c.path"
          :depth="depth + 1" :entry="c"
        ></v3-tree-node>
      </div>
    </div>
  `,
}

/* ================= 树视图（tree slot） ================= */
const TreeV3 = {
  name: 'files-tree-v3',
  data() { return { nav, store } },
  computed: {
    isAdmin() { return AUTH.user && AUTH.user.role === 'admin' },
    rootChildren() {
      const n = treeOf(nav.project, '')
      return n ? n.children : []
    },
    rootExpanded() {
      const n = treeOf(nav.project, '')
      return n ? n.expanded : false
    },
  },
  methods: {
    onRootToggle() { void toggleTree(nav.project, '') },
    onRootOpen() { nav.openDir(nav.project, '') },
    onNewFolder() { submitMkdirV3() },
    onAddFile() { nav.addFile() },
    onAddFolder() { bus.emit('upload:request-dir') },
    onDelProject() { nav.delProject(nav.project) },
    onRootDots(ev) {
      const entry = { name: nav.project, isDir: true, type: 'folder', sizeText: '', mtime: '' }
      openMenuFor(entry, '', ev.clientX, ev.clientY + 6)
    },
  },
  mounted() {
    if (nav.project !== null && !treeOf(nav.project, '')) void loadTree(nav.project, '')
  },
  template: `
    <div class="sidebar">
      <div class="side-head">
        <button class="icon-btn" style="padding:3px;font-size:14px" title="新建文件夹" @click="onNewFolder">📁＋</button>
        <button class="icon-btn" style="padding:3px;font-size:14px" title="添加文件" @click="onAddFile">＋📄</button>
        <button class="icon-btn" style="padding:3px;font-size:14px" title="上传文件夹到当前目录" @click="onAddFolder">📁⬆</button>
        <button v-if="isAdmin && nav.path === ''" class="icon-btn" style="padding:3px;font-size:14px;color:var(--danger)" :title="'删除项目：' + nav.project" @click="onDelProject">🗑</button>
      </div>
      <div class="v3-tn" :class="{ active: nav.path === '' }" :style="{ paddingLeft: '8px' }">
        <span class="tree-arrow" style="width:14px;display:inline-block;text-align:center;font-size:10px;color:var(--muted);cursor:pointer;flex-shrink:0" @click.stop="onRootToggle">{{ rootExpanded ? '▾' : '▸' }}</span>
        <span @click="onRootOpen" style="flex:1;display:flex;align-items:center;gap:6px;cursor:pointer;min-width:0">
          <span>🏠</span><span class="v3-name">{{ nav.project }}</span>
        </span>
        <span class="v3-dots" title="操作" @click.stop="onRootDots($event)">⋯</span>
      </div>
      <div v-if="rootExpanded">
        <v3-tree-node v-for="c in rootChildren" :key="c.path" :label="c.name" :project="nav.project" :path="c.path" :depth="0" :entry="c"></v3-tree-node>
      </div>
    </div>
  `,
}

/* ================= 文件面板（panel slot）：标签栏 + 主区 ================= */
const PanelV3 = {
  name: 'files-panel-v3',
  data() { return { nav, store, AUTH, pressTimer: null, batchBusy: false } },
  computed: {
    /* 中间栏只显示文件（文件夹在左侧目录树管理） */
    entries() {
      const arr = [...nav.entries].filter(e => !e.isDir)
      const key = nav.sortKey
      const asc = nav.sortAsc ? 1 : -1
      arr.sort((a, b) => {
        let va, vb
        if (key === 'name') { va = a.name; vb = b.name }
        else if (key === 'size') { va = a.size; vb = b.size }
        else if (key === 'mtime') { va = a.mtime; vb = b.mtime }
        else { va = a.name; vb = b.name }
        if (va < vb) return -1 * asc
        if (va > vb) return 1 * asc
        return 0
      })
      return arr
    },
    crumbs() {
      const parts = this.nav.path ? this.nav.path.split('/').filter(Boolean) : []
      const arr = [{ label: this.nav.project, path: '' }]
      let acc = ''
      for (const p of parts) { acc = acc ? acc + '/' + p : p; arr.push({ label: p, path: acc }) }
      return arr
    },
    activeTab() { return store.tabs.find(t => t.key === store.activeKey) || null },
    content() { return store.content },
    showTabs() { return store.tabs.length > 0 },
    isOfficeFile() {
      const t = this.activeTab
      return t ? ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(t.kind === 'office' ? (t.name.split('.').pop() || '').toLowerCase() : '') : false
    },
    isMdFile() { const t = this.activeTab; return t ? t.kind === 'md' : false },
  },
  watch: {
    // 切项目（旧项目非空）→ 清空标签；刷新恢复场景（null → 项目）不清
    'nav.project'(n, o) {
      if (o !== null && n !== o) { store.tabs = []; store.activeKey = ''; store.content = null; persistTabs() }
    },
    // 同项目内导航目录 → 回到目录浏览（标签保留，VS Code 语义：点标签再回内容）
    'nav.path'() {
      if (nav.project !== null) { store.activeKey = ''; store.content = null }
    },
  },
  methods: {
    /* ---- 标签栏 ---- */
    openFile(e) { openTab(e, nav.project, nav.path) },
    activate(k) { activateTab(k) },
    close(k) { closeTab(k) },
    closeOthers(k) { closeOthers(k) },
    onAuxclick(k, ev) { if (ev.button === 1) { ev.preventDefault(); closeTab(k) } },
    /* ---- 编辑/下载（内容区操作按钮） ---- */
    editActive() {
      const t = this.activeTab
      if (!t) return
      if (t.kind === 'office') bus.emit('office:edit', { entry: { name: t.name, isDir: false }, project: t.project, path: t.path })
      else if (t.kind === 'md') bus.emit('entry:open', { entry: { name: t.name, isDir: false }, project: t.project, path: t.path.includes('/') ? t.path.slice(0, t.path.lastIndexOf('/')) : '' })
    },
    async downloadActive() {
      const t = this.activeTab
      if (!t) return
      try {
        const r = await fetch('/privhub/api/download?project=' + encodeURIComponent(t.project) + '&path=' + encodeURIComponent(t.path), {
          headers: { authorization: 'Bearer ' + AUTH.token },
        })
        if (!r.ok) { window.PrivHub.toast('下载失败（HTTP ' + r.status + '）', 'error'); return }
        const blob = await r.blob()
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = t.name
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(a.href), 5000)
      } catch { window.PrivHub.toast('下载失败', 'error') }
    },
    detailActive() {
      const t = this.activeTab
      if (!t) return
      store.detailTarget = { entry: { name: t.name, isDir: false, sizeText: t.sizeText, type: t.type, mtime: '' }, project: t.project, dirPath: t.path.includes('/') ? t.path.slice(0, t.path.lastIndexOf('/')) : '' }
    },
    reloadActive() { const t = this.activeTab; if (t) void loadContent(t.key) },
    /* ---- 目录浏览 ---- */
    onEntryClick(e) {
      if (e.isDir) { nav.openDir(nav.project, nav.relPathOf(e.name)); return }
      openTab(e, nav.project, nav.path)
    },
    onEntryDbl(e) { this.onEntryClick(e) },
    startPress(e, el) {
      this.pressTimer = setTimeout(() => {
        const rect = el.getBoundingClientRect()
        openMenuFor(e, nav.path, Math.min(rect.left + 20, window.innerWidth - 180), Math.min(rect.top + 20, window.innerHeight - 160))
      }, 1500)
    },
    cancelPress() { if (this.pressTimer) { clearTimeout(this.pressTimer); this.pressTimer = null } },
    openCtxMenu(e, ev) { this.cancelPress(); openMenuFor(e, nav.path, ev.clientX, ev.clientY) },
    onDots(e, ev) { ev.stopPropagation(); openMenuFor(e, nav.path, ev.clientX, ev.clientY + 6) },
    closeMenu() { closeMenu() },
    openDetail() { openDetail() },
    doRename() { doRename() },
    doDelete() { doDelete() },
    doFavorite() { doFavorite() },
    doDownload() { void doDownload() },
    doEdit() { doEdit() },
    doMkdirHere() { doMkdirHere() },
    /* 文件夹 ⋯ 菜单：上传整个文件夹到该文件夹（根节点 → 项目根） */
    doUploadHere() {
      const m = store.ctxMenu
      closeMenu()
      if (!m || !m.entry.isDir) return
      const isRoot = m.dirPath === '' && m.entry.name === m.project
      const rel = isRoot ? '' : relPath(m.project, m.dirPath, m.entry.name)
      bus.emit('upload:request-dir', { path: rel })
    },
    async openPerm() { await openPerm() },
    /* ---- 内联输入模态（批量移动 / 新建子文件夹） ---- */
    batchMove() {
      const names = Object.keys(nav.checked).filter(n => nav.checked[n])
      if (!names.length) return
      store.promptState = { mode: 'move', title: '移动到哪个目录？（相对当前项目根，留空 = 项目根）', value: '' }
    },
    async doBatchMove(dir) {
      const names = Object.keys(nav.checked).filter(n => nav.checked[n])
      store.promptState = null
      this.batchBusy = true
      let okCount = 0
      try {
        for (const n of names) {
          const rel = nav.relPathOf(n)
          try {
            const r = await api('/privhub/api/move', { method: 'POST', body: JSON.stringify({ project: nav.project, from: rel, toDir: dir }) })
            if (r.ok) okCount++
            else { window.PrivHub.toast('移动「' + n + '」失败：' + (r.error || '未知错误'), 'error'); break }
          } catch { window.PrivHub.toast('移动「' + n + '」失败', 'error'); break }
        }
      } finally { this.batchBusy = false }
      nav.checked = {}
      if (okCount > 0) {
        window.PrivHub.toast('已移动 ' + okCount + '/' + names.length + ' 项')
        await nav.openDir(nav.project, nav.path)
        await refreshTree()
      }
    },
    submitPrompt() {
      const st = store.promptState
      if (!st) return
      const value = st.value.trim()
      if (!value) return
      if (st.mode === 'move') void this.doBatchMove(value)
      else if (st.mode === 'mkdir') void doMkdirHereSubmit(value)
    },
    cancelPrompt() { store.promptState = null },
    /* ---- 批量选择 ---- */
    isChecked(name) { return nav.checked[name] === true },
    toggleCheck(e, ev) {
      ev.stopPropagation()
      if (nav.checked[e.name]) delete nav.checked[e.name]
      else nav.checked[e.name] = true
    },
    checkedCount() { return Object.keys(nav.checked).filter(n => nav.checked[n]).length },
    checkedSizeText() {
      const names = Object.keys(nav.checked).filter(n => nav.checked[n])
      let total = 0
      for (const n of names) {
        const e = nav.entries.find(x => x.name === n)
        if (e && !e.isDir && typeof e.size === 'number') total += e.size
      }
      if (total === 0) return ''
      if (total < 1024) return total + ' B'
      if (total < 1024 * 1024) return (total / 1024).toFixed(1) + ' KB'
      return (total / 1024 / 1024).toFixed(1) + ' MB'
    },
    selectAll() {
      const all = this.entries.every(e => nav.checked[e.name])
      if (all) nav.checked = {}
      else { nav.checked = {}; for (const e of this.entries) nav.checked[e.name] = true }
    },
    clearChecked() { nav.checked = {} },
    async batchDownload() {
      const names = Object.keys(nav.checked).filter(n => nav.checked[n])
      const files = names.map(n => nav.entries.find(e => e.name === n)).filter(e => e && !e.isDir)
      if (!files.length) { window.PrivHub.toast('所选项目中无文件可下载', 'warn'); return }
      this.batchBusy = true
      try {
        for (const e of files) {
          try {
            const r = await fetch('/privhub/api/download?project=' + encodeURIComponent(nav.project) + '&path=' + encodeURIComponent(nav.relPathOf(e.name)), {
              headers: { authorization: 'Bearer ' + AUTH.token },
            })
            if (!r.ok) continue
            const blob = await r.blob()
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = e.name
            document.body.appendChild(a)
            a.click()
            a.remove()
            setTimeout(() => URL.revokeObjectURL(a.href), 5000)
          } catch { /* 单条失败继续 */ }
        }
        window.PrivHub.toast('已开始下载 ' + files.length + ' 个文件')
      } finally { this.batchBusy = false }
    },
    async batchDelete() {
      const names = Object.keys(nav.checked).filter(n => nav.checked[n])
      if (!names.length) return
      if (!confirm('将选中的 ' + names.length + ' 项移入回收站？')) return
      this.batchBusy = true
      let okCount = 0
      try {
        for (const n of names) {
          const rel = nav.relPathOf(n)
          try { const r = await api('/privhub/api/delete', { method: 'POST', body: JSON.stringify({ project: nav.project, path: rel }) }); if (r.ok) okCount++ } catch { /* 单条失败继续 */ }
        }
      } finally { this.batchBusy = false }
      nav.checked = {}
      await nav.openDir(nav.project, nav.path)
      await refreshTree()
      bus.emit('trash:changed', {})
      window.PrivHub.toast('已将 ' + okCount + '/' + names.length + ' 项移入回收站')
    },
    /* ---- 其他 ---- */
    doSubmitMkdir() { submitMkdirV3() },
    doAddFile() { nav.addFile() },
    renderMd() { return this.content && this.content.markdown !== undefined ? renderMarkdown(this.content.markdown) : '' },
    /* E3：长按功能发现性——首次进入面板提示一次 */
    maybeHint() {
      if (localStorage.getItem('privhub_longpress_hint')) return
      localStorage.setItem('privhub_longpress_hint', '1')
      window.PrivHub.toast('提示：长按文件或文件夹可呼出操作菜单', 'warn')
    },
  },
  mounted() {
    restoreTabs()
    this.maybeHint()
    this._offMd = bus.on('md:changed', () => {
      const t = store.tabs.find(x => x.key === store.activeKey)
      if (t && t.kind === 'md') void loadContent(t.key)
      if (nav.project !== null) { void nav.openDir(nav.project, nav.path); void refreshTree() }
    })
    this._offTrash = bus.on('trash:changed', () => { if (nav.project !== null) { void nav.openDir(nav.project, nav.path); void refreshTree() } })
    this._offTabOpened = bus.on('v3:tab-opened', () => {}) // 占位：未来跨组件联动
  },
  beforeUnmount() {
    if (this._offMd) this._offMd()
    if (this._offTrash) this._offTrash()
    if (this._offTabOpened) this._offTabOpened()
  },
  template: `
    <div style="display:contents">
      <!-- 标签栏（文件级，VS Code 风格） -->
      <div v-if="showTabs" class="v3-tabs">
        <div
          v-for="t in store.tabs" :key="t.key"
          class="v3-tab" :class="{ on: t.key === store.activeKey }"
          @click="activate(t.key)" @auxclick="onAuxclick(t.key, $event)"
          :title="t.project + ' / ' + t.path"
        >
          <span>{{ fileIcon(t.type) }}</span>
          <span class="v3-tab-name">{{ t.name }}</span>
          <span class="v3-tab-x" title="关闭" @click.stop="close(t.key)">✕</span>
        </div>
        <div style="flex:1"></div>
        <span v-if="store.tabs.length > 1" style="font-size:11px;color:var(--muted);cursor:pointer;padding:2px 8px;flex-shrink:0" title="关闭其他标签" @click="closeOthers(store.activeKey)">✕ 其他</span>
      </div>

      <!-- 主区：有激活标签 → 内容区；否则 → 目录浏览 -->
      <template v-if="activeTab && content && content.key === activeTab.key">
        <div class="v3-content">
          <div class="v3-content-head">
            <span class="v3-content-title">
              <span>{{ fileIcon(activeTab.type) }}</span>{{ activeTab.name }}
              <span class="v3-path">{{ activeTab.project }} / {{ activeTab.path }}</span>
            </span>
            <span class="spacer"></span>
            <button v-if="isOfficeFile || isMdFile" class="v3-op-btn" @click="editActive">✏️ 编辑</button>
            <button class="v3-op-btn" @click="reloadActive">🔄 刷新</button>
            <button class="v3-op-btn" @click="downloadActive">⬇ 下载</button>
            <button class="v3-op-btn" @click="detailActive">ℹ️ 详情</button>
          </div>
          <div v-if="content.state === 'loading'" class="v3-loading">正在加载…</div>
          <div v-else-if="content.state === 'error'" class="v3-loading">{{ content.error }}</div>
          <template v-else-if="content.office">
            <div v-html="renderMd()" class="v3-md"></div>
          </template>
          <template v-else-if="content.markdown !== undefined">
            <div v-html="renderMd()" class="v3-md"></div>
          </template>
          <template v-else-if="content.text !== undefined">
            <pre class="v3-text">{{ content.text }}</pre>
          </template>
          <template v-else-if="content.url">
            <div v-if="activeTab.kind === 'image'" style="text-align:center"><img class="v3-img" :src="content.url" :alt="activeTab.name" /></div>
            <iframe v-else class="v3-pdf" :src="content.url"></iframe>
          </template>
        </div>
      </template>

      <template v-else>
        <div class="main-head">
          <span class="breadcrumb">
            <span v-for="(c, i) in crumbs" :key="i">
              <a v-if="i < crumbs.length - 1" @click="nav.gotoCrumb(c.path)" style="cursor:pointer">{{ i === 0 ? '📁 ' : '' }}{{ c.label }}</a>
              <span v-else style="color:var(--text)">{{ i === 0 ? '📁 ' : '' }}{{ c.label }}</span>
              <span v-if="i < crumbs.length - 1" class="crumb"> / </span>
            </span>
          </span>
          <span class="crumb" style="margin-left:8px">共 {{ entries.length }} 个文件</span>
          <span v-if="checkedCount() > 0" class="crumb" style="margin-left:8px;color:var(--accent)">已选 {{ checkedCount() }} 项{{ checkedSizeText() ? ' · ' + checkedSizeText() : '' }}</span>
          <span class="spacer"></span>
          <template v-if="checkedCount() > 0">
            <button class="icon-btn" @click="selectAll">☑ 全选/取消</button>
            <button class="icon-btn" @click="clearChecked">取消选择</button>
            <button class="icon-btn" :disabled="batchBusy" @click="batchDownload">{{ batchBusy ? '处理中…' : '⬇ 下载所选' }}</button>
            <button class="icon-btn" :disabled="batchBusy" @click="batchMove">{{ batchBusy ? '处理中…' : '📦 移动所选' }}</button>
            <button class="icon-btn" style="color:var(--danger)" :disabled="batchBusy" @click="batchDelete">{{ batchBusy ? '处理中…' : '🗑 删除所选 (' + checkedCount() + ')' }}</button>
          </template>
          <span v-if="nav.uploading" class="crumb">上传中 {{ nav.uploadDone }}/{{ nav.uploadTotal }}…</span>
        </div>
        <div class="main-body">
          <div v-if="nav.listLoading" class="empty">加载中…</div>
          <div v-else-if="entries.length === 0" class="empty">此文件夹下没有文件（文件夹请在左侧目录树中查看）</div>
          <div v-else class="file-table-wrap">
            <div class="file-table-head" style="grid-template-columns:28px 1fr 90px 120px 110px 26px">
              <span><input type="checkbox" @click="selectAll" /></span>
              <span class="col-name" style="cursor:pointer" @click="nav.toggleSort('name')" title="按名称排序">名称{{ nav.sortKey==='name' ? (nav.sortAsc?' ↑':' ↓') : '' }}</span>
              <span class="col-size" style="cursor:pointer" @click="nav.toggleSort('size')" title="按大小排序">大小{{ nav.sortKey==='size' ? (nav.sortAsc?' ↑':' ↓') : '' }}</span>
              <span class="col-type">类型</span>
              <span class="col-time" style="cursor:pointer" @click="nav.toggleSort('mtime')" title="按修改时间排序">修改时间{{ nav.sortKey==='mtime' ? (nav.sortAsc?' ↑':' ↓') : '' }}</span>
              <span></span>
            </div>
            <div
              v-for="e in entries" :key="e.name"
              class="file-table-row" :class="{ sel: nav.selected && nav.selected.name === e.name }"
              style="grid-template-columns:28px 1fr 90px 120px 110px 26px"
              @click="onEntryClick(e)"
              @dblclick="onEntryDbl(e)"
              @mousedown="startPress(e, $event.currentTarget)"
              @mouseup="cancelPress"
              @mouseleave="cancelPress"
              @contextmenu.prevent="openCtxMenu(e, $event)"
            >
              <span><input type="checkbox" :checked="isChecked(e.name)" @click="toggleCheck(e, $event)" style="cursor:pointer" /></span>
              <span class="col-name"><span class="tico">{{ fileIcon(e.type) }}</span>{{ e.name }}</span>
              <span class="col-size">{{ e.sizeText }}</span>
              <span class="col-type">{{ e.type }}</span>
              <span class="col-time">{{ e.mtime ? e.mtime.replace('T', ' ').slice(0, 16) : '—' }}</span>
              <span class="v3-row-dots" title="操作" @click="onDots(e, $event)">⋯</span>
            </div>
          </div>
        </div>
      </template>

      <!-- ⋯ / 右键 / 长按 共用菜单 -->
      <div v-if="store.ctxMenu" class="ctx-mask" @click="closeMenu"></div>
      <div v-if="store.ctxMenu" class="ctx-menu" :style="{ left: store.ctxMenu.x + 'px', top: store.ctxMenu.y + 'px' }" @click.stop>
        <div class="ctx-item" @click="openDetail">ℹ️ 详情</div>
        <div class="ctx-item" @click="openPerm">🔐 权限</div>
        <div class="ctx-item" @click="doFavorite">⭐ 收藏</div>
        <div v-if="!store.ctxMenu.entry.isDir" class="ctx-item" @click="doDownload">⬇ 下载</div>
        <div v-if="!store.ctxMenu.entry.isDir && (isOfficeMenu || isMdMenu)" class="ctx-item" @click="doEdit">✏️ 编辑</div>
        <div class="ctx-item" @click="doRename">✏️ 重命名</div>
        <div v-if="store.ctxMenu.entry.isDir" class="ctx-item" @click="doMkdirHere">＋ 新建子文件夹</div>
        <div v-if="store.ctxMenu.entry.isDir" class="ctx-item" @click="doUploadHere">📁 上传到该文件夹</div>
        <div class="ctx-item danger" @click="doDelete">🗑 删除</div>
      </div>

      <!-- 详情弹窗 -->
      <div v-if="store.detailTarget" class="modal-mask" @click.self="store.detailTarget = null">
        <div class="modal" style="width:380px">
          <h2>{{ store.detailTarget.entry.isDir ? '📁' : '📄' }} {{ store.detailTarget.entry.name }}</h2>
          <div class="modal-body">
            <div class="kv"><span class="k">名称</span><span>{{ store.detailTarget.entry.name }}</span></div>
            <div class="kv"><span class="k">类型</span><span>{{ store.detailTarget.entry.isDir ? '文件夹' : store.detailTarget.entry.type }}</span></div>
            <div class="kv"><span class="k">大小</span><span>{{ store.detailTarget.entry.sizeText || '—' }}</span></div>
            <div class="kv"><span class="k">修改时间</span><span>{{ store.detailTarget.entry.mtime || '—' }}</span></div>
            <div class="kv"><span class="k">所属项目</span><span>{{ store.detailTarget.project }}</span></div>
            <div class="kv"><span class="k">路径</span><span>{{ store.detailTarget.dirPath ? store.detailTarget.project + '/' + store.detailTarget.dirPath : store.detailTarget.project }}</span></div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" @click="store.detailTarget = null">关 闭</button>
          </div>
        </div>
      </div>

      <!-- 权限弹窗 -->
      <div v-if="store.permTarget" class="modal-mask" @click.self="store.permTarget = null">
        <div class="modal" style="width:420px">
          <h2>🔐 权限 · {{ store.permTarget.entry.name }}</h2>
          <div class="modal-body">
            <div v-if="store.permTarget.loading" style="color:var(--muted);font-size:12.5px;padding:10px 0">加载中…</div>
            <template v-else>
              <div class="kv"><span class="k">当前用户</span><span>{{ AUTH.user.username }}（{{ AUTH.user.role === 'admin' ? '管理员' : '普通用户' }}）</span></div>
              <div class="kv"><span class="k">项目可见</span><span>{{ (nav.projectsList || []).includes(store.permTarget.project) ? '✅ 可访问' : '⛔ 不可访问' }}</span></div>
              <div style="margin-top:12px;font-size:12.5px;color:var(--muted)">
                <template v-if="AUTH.user.role === 'admin'">
                  以下为该项目/路径生效的 ACL 规则：
                  <div v-if="store.permTarget.rules && store.permTarget.rules.length" style="margin-top:8px">
                    <div v-for="(r, i) in store.permTarget.rules" :key="i" class="kv">
                      <span class="k">{{ r.path === '' ? '（项目根）' : r.path }}</span>
                      <span>{{ r.role }} · {{ r.action || '全部' }} · {{ r.allow ? '✅ 允许' : '⛔ 拒绝' }}</span>
                    </div>
                  </div>
                  <div v-else style="margin-top:8px">（无 ACL 规则，默认按项目可见性放行）</div>
                </template>
                <template v-else>
                  文件级权限规则由管理员在「权限管理」中配置。若你对该文件的操作被拒绝，请联系管理员调整 ACL。
                </template>
              </div>
              <div v-if="store.permTarget.error" style="margin-top:10px;color:var(--danger);font-size:12.5px">{{ store.permTarget.error }}</div>
            </template>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" @click="store.permTarget = null">关 闭</button>
          </div>
        </div>
      </div>

      <!-- 内联输入模态（批量移动 / 新建子文件夹） -->
      <div v-if="store.promptState" class="modal-mask" @click.self="cancelPrompt">
        <div class="modal" style="width:380px">
          <h2>{{ store.promptState.mode === 'move' ? '📦 批量移动' : '＋ 新建子文件夹' }}</h2>
          <div class="modal-body">
            <div class="field">
              <label>{{ store.promptState.title }}</label>
              <input v-model="store.promptState.value" @keyup.enter="submitPrompt" placeholder="输入后回车确认" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text)" />
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" @click="cancelPrompt">取 消</button>
            <button class="btn btn-primary" style="width:auto" @click="submitPrompt">确 定</button>
          </div>
        </div>
      </div>
    </div>
  `,
}

/* 菜单项动态显示（office/md 才显示编辑）——用计算属性替代模板内函数 */
PanelV3.computed.isOfficeMenu = function () {
  const m = store.ctxMenu
  if (!m || m.entry.isDir) return false
  return /\.(doc|docx|xls|xlsx|ppt|pptx|pdf)$/i.test(m.entry.name)
}
PanelV3.computed.isMdMenu = function () {
  const m = store.ctxMenu
  if (!m || m.entry.isDir) return false
  return /\.md$/i.test(m.entry.name)
}

TreeV3.components = { 'v3-tree-node': TreeNodeV3 }
PanelV3.components = { 'v3-tree-node': TreeNodeV3 }

export default {
  id: 'privhub-files-explorer-v3',
  slots: {
    tree: TreeV3,
    panel: PanelV3,
  },
}
