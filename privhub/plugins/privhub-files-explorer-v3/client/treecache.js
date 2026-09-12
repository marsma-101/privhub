/**
 * treecache — 树缓存的数据操作（拉取 / 查询 / 展开收起 / 失效刷新）。
 *
 * 为什么与 tree.js 分开：这些函数【不是界面】，而是被 ops（改完文件要刷新树）
 * 和 tree（界面）同时使用的数据层。若把它们留在 tree.js，
 * 就会出现 tree → ops（菜单）与 ops → tree（刷新）的双向依赖。
 *
 * @module privhub-files-explorer-v3/client/treecache
 */

import { api, nav } from './deps.js'
import { store } from './store.js'

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

export { loadTree, treeOf, toggleTree, refreshTree }
