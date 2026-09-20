/**
 * ops — 操作层：⋯/右键菜单、详情与权限、重命名/复制/移动/删除/下载/编辑/新建。
 *
 * 全局 Esc 监听也在这里：它取消的是本模块的状态（重命名、菜单），
 * 放在 store 会造成 store ↔ ops 双向依赖（原单文件就是这样缠在一起的）。
 *
 * @module privhub-files-explorer-v3/client/ops
 */

import { api, nav, bus, AUTH } from './deps.js'
import { tabKey, isEditableText, relPath, uiZoom, EXT } from './utils.js'
import { store } from './store.js'
import { persistTabs, openTab, activateTab } from './tabs.js'
import { loadContent } from './content.js'
import { loadTree, refreshTree } from './treecache.js'

/* 全局 Esc：取消行内重命名（焦点不在输入框时兜底） */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (store.renameState) { cancelRename(); e.stopPropagation() }
    if (store.newMenu) store.newMenu = false
    if (store.menu) store.menu = false
  }
})

/* ================= 菜单操作（⋯ / 右键 / 长按共用） ================= */

function openMenuFor(entry, dirPath, x, y) {
  const z = uiZoom()
  store.ctxMenu = {
    x: Math.min(x / z, window.innerWidth / z - 180),
    y: Math.min(y / z, Math.max(0, window.innerHeight / z - 340)),
    entry, dirPath,
    project: nav.project,
  }
}
function closeMenu() { store.ctxMenu = null }
function ctxRelPath() {
  const m = store.ctxMenu
  return m ? relPath(m.project, m.dirPath, m.entry.name) : ''
}
/* ⋯ 菜单「详情」：取消弹窗，改为在右侧详情面板显示 */
function openDetail() {
  const m = store.ctxMenu
  closeMenu()
  if (!m) return
  nav.selected = { ...m.entry }
  nav.rightOpen = true
}
/* 权限弹窗（按参数，菜单/右侧详情面板共用） */
async function openPermFor(entry, project, dirPath) {
  if (!entry) return
  const rel = relPath(project, dirPath, entry.name)
  store.permTarget = { entry, project, path: rel, loading: true, rules: null, error: '' }
  const isAdmin = AUTH.user && AUTH.user.role === 'admin'
  if (!isAdmin) { store.permTarget.loading = false; return }
  try {
    const r = await api('/privhub/api/acl/rules')
    if (r.ok) {
      const visible = (r.rules || []).filter(x =>
        x.project === project &&
        (x.path === '' || rel === x.path || rel.startsWith(x.path + '/'))
      )
      store.permTarget.rules = visible
    } else store.permTarget.error = r.error || '无法读取权限规则'
  } catch { store.permTarget.error = '无法读取权限规则' }
  store.permTarget.loading = false
}
async function openPerm() {
  const m = store.ctxMenu
  closeMenu()
  if (m) await openPermFor(m.entry, m.project, m.dirPath)
}

/* ---- 行内重命名（⋯ 菜单 → 行内输入框，回车保存 / Esc 取消） ---- */
function doRename() {
  const m = store.ctxMenu
  closeMenu()
  if (!m) return
  store.renameState = { project: m.project, dirPath: m.dirPath, entry: m.entry, rel: relPath(m.project, m.dirPath, m.entry.name), value: m.entry.name }
}
function cancelRename() { store.renameState = null }
async function submitRename() {
  const st = store.renameState
  if (!st) return
  const newName = (st.value || '').trim()
  store.renameState = null
  if (!newName || newName === st.entry.name) return
  const rel = relPath(st.project, st.dirPath, st.entry.name)
  const r = await api('/privhub/api/rename', { method: 'POST', body: JSON.stringify({ project: st.project, path: rel, newName }) })
  if (r.ok) {
    window.PrivHub.toast('已重命名为「' + newName + '」')
    await refreshAfterChange(st.project, st.dirPath)
    // 更新打开的标签（重命名文件本身）
    const oldKey = tabKey(st.project, rel)
    const idx = store.tabs.findIndex(t => t.key === oldKey)
    if (idx >= 0) {
      const t = store.tabs[idx]
      const newPath = relPath(st.project, st.dirPath, newName)
      store.tabs[idx] = { ...t, key: tabKey(st.project, newPath), path: newPath, name: newName }
      if (store.activeKey === oldKey) { store.activeKey = store.tabs[idx].key; store.content = null; void loadContent(store.activeKey) }
      persistTabs()
    }
  } else window.PrivHub.toast(r.error || '重命名失败', 'error')
}
/* ---- 复制副本（同目录「原名（副本）.ext」） ---- */
async function doCopyHere() {
  const m = store.ctxMenu
  closeMenu()
  if (!m || m.entry.isDir) return
  const rel = relPath(m.project, m.dirPath, m.entry.name)
  const dot = m.entry.name.lastIndexOf('.')
  const base = dot > 0 ? m.entry.name.slice(0, dot) : m.entry.name
  const ext = dot > 0 ? m.entry.name.slice(dot) : ''
  const copyName = base + '（副本）' + ext
  try {
    const r = await fetch('/privhub/api/download?project=' + encodeURIComponent(m.project) + '&path=' + encodeURIComponent(rel), {
      headers: { authorization: 'Bearer ' + AUTH.token },
    })
    if (!r.ok) { window.PrivHub.toast('复制失败（HTTP ' + r.status + '）', 'error'); return }
    const blob = await r.blob()
    const up = await fetch('/privhub/api/upload?project=' + encodeURIComponent(m.project) + '&path=' + encodeURIComponent(m.dirPath || '') + '&name=' + encodeURIComponent(copyName), {
      method: 'POST', headers: { authorization: 'Bearer ' + AUTH.token, 'content-type': 'application/octet-stream' }, body: blob,
    })
    const j = await up.json().catch(() => ({}))
    if (j.ok) {
      window.PrivHub.toast('已复制为「' + copyName + '」')
      await refreshAfterChange(m.project, m.dirPath)
    } else window.PrivHub.toast(j.error || '复制失败', 'error')
  } catch { window.PrivHub.toast('复制失败', 'error') }
}
/* ---- 移动：目录树形选择器 ---- */
async function doMoveOpen() {
  const m = store.ctxMenu
  closeMenu()
  if (!m) return
  store.moveState = { project: m.project, from: relPath(m.project, m.dirPath, m.entry.name), entry: m.entry, tree: [], loading: true, target: null, busy: false }
  try {
    const nodes = []
    const walk = async (prefix, depth) => {
      const q = prefix ? '&path=' + encodeURIComponent(prefix) : ''
      const r = await api('/privhub/api/list?project=' + encodeURIComponent(m.project) + q)
      if (!r.ok) return
      for (const e of r.entries) {
        if (!e.isDir) continue
        const p = prefix ? prefix + '/' + e.name : e.name
        nodes.push({ path: p, name: e.name, depth })
        await walk(p, depth + 1)
      }
    }
    await walk('', 0)
    store.moveState.tree = nodes
  } catch { /* 树加载失败 */ }
  store.moveState.loading = false
}
async function doMoveSubmit() {
  const st = store.moveState
  if (!st || st.busy) return
  if (st.target === null || st.target === undefined) { window.PrivHub.toast('请选择目标目录', 'warn'); return }
  if (st.target === st.from || st.from.startsWith(st.target + '/')) { window.PrivHub.toast('不能移动到自身或其子目录', 'warn'); return }
  st.busy = true
  const r = await api('/privhub/api/move', { method: 'POST', body: JSON.stringify({ project: st.project, from: st.from, toDir: st.target }) })
  st.busy = false
  if (r.ok) {
    window.PrivHub.toast('已移动到「' + (st.target || '项目根') + '」')
    store.moveState = null
    await refreshAfterChange(st.project, st.target)
    await nav.openDir(st.project, st.target)
  } else window.PrivHub.toast(r.error || '移动失败', 'error')
}
async function doDelete() {
  const m = store.ctxMenu
  closeMenu()
  if (!m) return
  if (!confirm('《' + m.entry.name + '》将移入回收站，30 天后自动清除，可在回收站恢复。确定删除？')) return
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
/* .doc（旧二进制 Word）→ 转换 .docx 并回收原 .doc，然后打开新文件（office2 原生预览/编辑） */
async function convertDocToDocx(m) {
  const project = m.project
  const rel = m.path !== undefined && m.path !== null
    ? m.path
    : relPath(m.project, m.dirPath || '', m.entry ? m.entry.name : '')
  if (!rel) return
  const dir = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : ''
  const oldName = rel.split('/').pop()
  if (!/\.doc$/i.test(oldName)) return
  if (!confirm('「' + oldName + '」是老版 Word 格式，无法直接在线编辑。\n将自动转换为同名 .docx（保留文字内容）并删除原 .doc，继续？')) return
  const r = await api('/privhub/api/office/convert-doc', { method: 'POST', body: JSON.stringify({ project, path: rel }) })
  if (!r.ok) { window.PrivHub.toast(r.error || '转换失败', 'error'); return }
  const newRel = r.newPath || rel.replace(/\.doc$/i, '.docx')
  const newName = newRel.split('/').pop()
  const dl = await api('/privhub/api/delete', { method: 'POST', body: JSON.stringify({ project, path: rel }) })
  if (!dl.ok) window.PrivHub.toast('已生成 .docx，但原 .doc 删除失败（可稍后在回收站外手动删除）', 'warn')
  // 关闭旧 .doc 标签（若已打开）
  const oldKey = tabKey(project, rel)
  const oi = store.tabs.findIndex((t) => t.key === oldKey)
  if (oi >= 0) {
    const wasActive = store.activeKey === oldKey
    store.tabs.splice(oi, 1)
    if (wasActive) { store.content = null; store.activeKey = '' }
    persistTabs()
  }
  // 打开新 .docx（office2 原生预览 / 单人编辑）
  openTab({ name: newName, isDir: false, type: 'DOCX', sizeText: '' }, project, dir)
  // 刷新目录列表与侧栏树
  if (nav.project === project) void nav.openDir(project, dir)
  setTimeout(() => bus.emit('files:refresh'), 400)
  window.PrivHub.toast('✅ 已转为 .docx（原 .doc 已删除）')
}
function doEdit() {
  const m = store.ctxMenu
  closeMenu()
  if (!m || m.entry.isDir) return
  const rel = relPath(m.project, m.dirPath, m.entry.name)
  const ext = (m.entry.name.split('.').pop() || '').toLowerCase()
  /* 【扩展名一处定义】这里原本手写一串 Office 扩展名 —— 现取自
   * `utils.js` 的 `EXT.OFFICE_EXTS`（= `file-exts.ts` 的 Office 基础集合，**含 pdf**）。
   * 迁前那份手写清单比后端多出 `xls`/`ppt`（后端 `/office/read` 对它们报"不支持的 Office 类型"），
   * 属于同类漂移；现与后端同源。 */
  if (EXT.OFFICE_EXTS.includes(ext)) {
    if (ext === 'doc') { void convertDocToDocx({ entry: m.entry, project: m.project, dirPath: m.dirPath || '' }); return }
    bus.emit('office:edit', { entry: m.entry, project: m.project, path: rel })
    return
  }
  if (ext !== 'md' && !isEditableText(m.entry.name)) return
  // 文本类（md/txt 等）：先作为标签打开进入内容区（edit-md 随后自动进入内嵌编辑）。
  // 显式 entry:open（force）清除「✕ 只读」标记：无标签时由后续 auto-edit 接管，有标签时立即进入
  const tab = store.tabs.find(x => x.project === m.project && x.path === rel)
  if (tab) activateTab(tab.key)
  else openTab(m.entry, m.project, m.dirPath || '')
  bus.emit('entry:open', { entry: m.entry, project: m.project, path: m.dirPath || '' })
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

/* 新建数据表（空 xlsx，走 office 能力库写回） */
async function newSheetFile() {
  if (!nav.project) return
  const name = '未命名数据表-' + Date.now().toString(36).slice(-4) + '.xlsx'
  const rel = nav.path ? nav.path + '/' + name : name
  const r = await api('/privhub/api/office/write', { method: 'POST', body: JSON.stringify({ project: nav.project, path: rel, content: [['']] }) })
  if (r.ok) {
    window.PrivHub.toast('已创建「' + name + '」')
    await nav.openDir(nav.project, nav.path)
    await refreshTree()
  } else window.PrivHub.toast(r.error || '创建失败', 'error')
}

/* 新建页面（空 HTML 模板） */
async function newPageFile() {
  if (!nav.project) return
  const name = '未命名页面-' + Date.now().toString(36).slice(-4) + '.html'
  const html = '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n<title>未命名页面</title>\n</head>\n<body style="font-family:system-ui,sans-serif;padding:24px;color:#333">\n  <h1>未命名页面</h1>\n  <p>在此编写你的页面内容……</p>\n</body>\n</html>\n'
  const rel = nav.path ? nav.path + '/' + name : name
  try {
    const r = await fetch('/privhub/api/upload?project=' + encodeURIComponent(nav.project) + '&path=' + encodeURIComponent(nav.path || '') + '&name=' + encodeURIComponent(name), {
      method: 'POST', headers: { authorization: 'Bearer ' + AUTH.token, 'content-type': 'application/octet-stream' }, body: new TextEncoder().encode(html),
    })
    const j = await r.json().catch(() => ({}))
    if (j.ok) {
      window.PrivHub.toast('已创建「' + name + '」')
      await nav.openDir(nav.project, nav.path)
      await refreshTree()
    } else window.PrivHub.toast(j.error || '创建失败', 'error')
  } catch { window.PrivHub.toast('创建失败（网络错误）', 'error') }
  void rel
}

export { openMenuFor, closeMenu, ctxRelPath, openDetail, openPermFor, openPerm, doRename, cancelRename, submitRename, doCopyHere, doMoveOpen, doMoveSubmit, doDelete, doFavorite, doDownload, convertDocToDocx, doEdit, doMkdirHere, doMkdirHereSubmit, refreshAfterChange, submitMkdirV3, newSheetFile, newPageFile }
