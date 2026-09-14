/**
 * action — 管理控制台的导航动作（对骨架 nav / location.hash 的唯一出口）。
 *
 * 规则（与骨架的分工）：
 *   - 进入管理控制台：hash 变化 → 骨架把 activeView 切成 admin → 本插件渲染外壳。
 *   - 侧栏点击：**只改 hash**，绝不回头去调 nav.setActiveView —— 骨架的
 *     setActiveView 对「同一个视图再点一次」会 toggle 回文件页，管理视图内必须避免。
 *   - 返回文件：由骨架负责（顶部栏只调 nav.backToFiles()）。
 *
 * @module privhub-admin-console/client/action
 */

import { nav, bus } from './deps.js'
import { adminState, applyKey, rememberRoute, lastRoute } from './store.js'
import { DEFAULT_KEY, hashToKey, keyToHash, isValidKey, isAvailable, ROUTE_MAP } from './routes.js'
import { on, openAdminRoute } from './panelbus.js'

/** hashchange 监听是否已挂（模块级单例，避免重复绑定）。 */
let hashBound = false

/** 读取当前 hash 对应的管理路由键（不是管理路由时返回 ''）。 */
function currentHashKey() { return hashToKey(location.hash) }

/** 把 hash 写成某个管理路由（replace 用于修正非法地址，避免污染历史）。 */
function writeHash(key, replace) {
  const want = keyToHash(key)
  if (location.hash === want) return
  const url = location.pathname + location.search + want
  try {
    if (replace) history.replaceState(null, '', url)
    else location.hash = want.slice(1)   // 赋值不带 '#'，浏览器自动补并触发 hashchange
  } catch {
    location.hash = want.slice(1)
  }
}

/** 清理管理路由，回到文件页地址（保留其它查询串）。 */
function clearHash() {
  if (!currentHashKey()) return
  try { history.replaceState(null, '', location.pathname + location.search) } catch { /* 忽略 */ }
}

/**
 * 打开某个管理页（侧栏 / 概览卡片 / 面包屑都走这里）。
 *
 * @param {string} key 路由键（如 'access/acl'）
 */
function navigate(key) {
  const k = applyKey(key)
  if (k !== key) {
    // 目标不可用（视图未装载）或键非法：地址也要跟着修正，避免刷新后状态与 hash 不一致
    writeHash(k, true)
  } else {
    writeHash(k, false)
  }
  rememberRoute(k)
  if (nav.activeView !== 'admin') nav.setActiveView('admin')
}

/**
 * 确保「已进入管理视图」这一事实与当前 hash 一致。
 * 由 AdminShell 在挂载时调用一次。
 */
function enterOnce() {
  if (!hashBound) {
    hashBound = true
    window.addEventListener('hashchange', onHashChange)
  }
  const fromHash = currentHashKey()
  if (fromHash) {
    navigate(fromHash)
  } else {
    navigate(lastRoute())
  }
}

/** 骨架把 activeView 切回非管理视图：同步清掉管理路由地址。 */
function leaveConsole() {
  clearHash()
  adminState.drawerOpen = false
}

/**
 * hashchange：用户手改地址、点前进/后退、点侧栏（本插件自己写的 hash）。
 * 用 applyKey 只更新状态，不再回写 hash —— 否则会形成写入循环。
 */
function onHashChange() {
  const k = currentHashKey()
  if (!k) return
  const resolved = applyKey(k)
  rememberRoute(resolved)
  if (nav.activeView !== 'admin') nav.setActiveView('admin')
}

/** 注册 panelbus 的打开请求（AdminShell 挂载时调用一次）。 */
function bindPanelBus() {
  return on('admin:open', (payload) => {
    if (!payload) return
    navigate(payload.key || DEFAULT_KEY)
  })
}

/** 是否有可用的管理页（普通用户也至少能看到概览与设置类页面）。 */
function anyAvailable() {
  for (const k of Object.keys(ROUTE_MAP)) if (isAvailable(ROUTE_MAP[k])) return true
  return false
}

export {
  navigate, enterOnce, leaveConsole, bindPanelBus, anyAvailable,
  openAdminRoute, bus,
}
