/**
 * tabs — 文件标签页：按用户隔离的持久化、打开/激活/关闭。
 * @module privhub-files-explorer-v3/client/tabs
 */

import { nav, bus, AUTH } from './deps.js'
import { tabKey, kindOf, relPath } from './utils.js'
import { store } from './store.js'
import { loadContent } from './content.js'
import { currentRegistry } from './viewers.js'

/**
 * 发一次「静默保存」意图，并**按来源记账**（见 `viewers.js` 的 `SAVE_INTENT_SOURCES`）。
 *
 * 为什么三处切标签都要走这里：`md:interrupt` 是「编辑器要没了，请先保存」的唯一入口，
 * 而它**必须排在改 `store.activeKey` 之前**（宿主由 watcher 卸载 viewer，watcher 排在
 * 之后 ⇒ 卸载必然晚于保存意图）。走 `reg.via()` 而不是裸 `bus.emit()` 的收益有两条：
 *   ① 「进过这条应发路径却没有真发」会被 `viewers.lifecycle.missingSaveIntent...` 抓出来
 *      （本项目最怕的正是「连错了不吭声」）；
 *   ② 取证点（`viewers.js` 的 `md:interrupt` 监听）能记下**是哪条路**发的。
 * 注册表不在（没装 explorer-v3 的宿主侧）时退化成裸 emit：**行为一字不变**，
 * 只是没人记账 —— 这条退路保证「宿主不在也不影响别的插件」。
 *
 * ⚠ 别把这里的 `reg.via(...)` 改成 `setTimeout` / `$nextTick`：保存意图必须同步发出。
 * ⚠ 也别把 `return` 提到 `bus.emit` 之前：那样「没发」就成了静默行为，正是要防的那类毛病。
 */
function emitSaveIntent(source) {
  /* `typeof` 判断不是糊涂账：J4-b 那个沙箱只装 `utils.js` + `tabs.js`（不装 viewers.js），
   * 那里退化成裸 emit 正是要的语义 —— 但**绝不吞掉"注册表坏了"**：注册表存在时，
   * 它的记账结果是 `viewers.lifecycle.checkSaveIntentCoverage()`，那才是判定的地方。 */
  const reg = typeof currentRegistry === 'function' ? currentRegistry() : null
  if (reg && typeof reg.via === 'function') { reg.via(source, () => bus.emit('md:interrupt', {})); return }
  bus.emit('md:interrupt', {})
}

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
  if (store.activeKey && store.activeKey !== key) emitSaveIntent('tabs.openTab')
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
  if (store.activeKey && store.activeKey !== key) emitSaveIntent('tabs.activateTab')
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
  if (wasActive) emitSaveIntent('tabs.closeTab') // 关闭激活标签前静默保存
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
