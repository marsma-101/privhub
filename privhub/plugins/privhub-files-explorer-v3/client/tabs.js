/**
 * tabs — 文件标签页：按用户隔离的持久化、打开/激活/关闭。
 * @module privhub-files-explorer-v3/client/tabs
 */

import { nav, bus, AUTH } from './deps.js'
import { tabKey, kindOf, relPath } from './utils.js'
import { store } from './store.js'
import { loadContent } from './content.js'

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

/* ---- 标签页：打开 / 激活 / 关闭 ---- */
function openTab(entry, project, dirPath) {
  if (!entry || entry.isDir) return
  const path = relPath(project, dirPath, entry.name)
  const key = tabKey(project, path)
  // 已打开过：直接切到该标签（不重新加载、不改变标签顺序），避免重复打开
  const existing = store.tabs.find(t => t.key === key)
  if (existing) { activateTab(key); return }
  const tab = {
    key, project, path, name: entry.name, kind: kindOf(entry.name),
    sizeText: entry.sizeText || '', type: entry.type || '',
  }
  // 切换打开其他文件前：通知编辑器静默保存未保存修改（md:interrupt → edit-md）
  if (store.activeKey && store.activeKey !== key) bus.emit('md:interrupt', {})
  const idx = store.tabs.findIndex(t => t.key === key)
  if (idx >= 0) store.tabs.splice(idx, 1)
  store.tabs.push(tab)
  if (store.tabs.length > 30) store.tabs.splice(0, store.tabs.length - 30)
  store.activeKey = key
  persistTabs()
  // 兼容 tags 等插件对「当前选中文件」的依赖；右侧详情面板随选中/打开显示
  nav.selected = { ...entry }
  nav.rightOpen = true
  void loadContent(key)
  bus.emit('v3:tab-opened', { project, path, name: entry.name })
}
function activateTab(key) {
  const tab = store.tabs.find(t => t.key === key)
  // 切换激活前：通知编辑器静默保存未保存修改（md:interrupt → edit-md）
  if (store.activeKey && store.activeKey !== key) bus.emit('md:interrupt', {})
  // 幂等：即使已是激活标签也恢复选中/右侧面板（Esc/切视图后 rightOpen 被骨架清零）
  if (tab) {
    nav.selected = { name: tab.name, isDir: false, sizeText: tab.sizeText, type: tab.type }
    nav.rightOpen = true
  }
  if (store.activeKey !== key) {
    store.activeKey = key
    if (!store.content || store.content.key !== key) void loadContent(key)
  }
}
function closeTab(key) {
  const idx = store.tabs.findIndex(t => t.key === key)
  if (idx < 0) return
  const wasActive = store.activeKey === key
  if (wasActive) bus.emit('md:interrupt', {}) // 关闭激活标签前静默保存
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

export { TABS_KEY, tabStoreKey, persistTabs, restoreTabs, openTab, activateTab, closeTab, closeOthers }
