/**
 * store — 管理控制台的共享状态（reactive）。全插件唯一实例。
 *
 * 状态形状（与需求文档一致）：
 *   adminState = { activeSection, activeSubView, selectedId, filters, selection,
 *                  loading, error, sidebarCollapsed }
 *
 * 注意：这里只放【状态 + 纯状态运算】。会打接口、会动 DOM 的副作用放在
 * action.js / panels.js，避免出现「import 本文件就产生副作用」。
 *
 * @module privhub-admin-console/client/store
 */

import { reactive } from './deps.js'
import { ROUTE_MAP, DEFAULT_KEY, isAvailable, isValidKey } from './routes.js'

const adminState = reactive({
  /** 当前分组 id（概览 / access / content / ops） */
  activeSection: 'overview',
  /** 当前路由键（= hash 路径，如 'access/acl'）；null = 还没进入任何管理页 */
  activeSubView: null,
  /** 当前详情对象标识（列表-详情布局用；各页面自定义含义） */
  selectedId: null,
  /** 各页面的筛选条件（按路由键分桶，切页不互相污染） */
  filters: {},
  /** 批量选择（当前列表页的选中 id 数组） */
  selection: [],
  /** 当前页面是否正在加载 */
  loading: false,
  /** 当前页面的局部错误（{ message, retry } | null），只影响内容区，不白屏 */
  error: null,
  /** 侧栏是否折叠为图标（桌面端；<1024px 时用 drawerOpen 控制抽屉） */
  sidebarCollapsed: false,
  /** <1024px 时侧栏抽屉是否打开 */
  drawerOpen: false,
  /** 详情列宽度（列表-详情布局，可拖拽；px） */
  detailWidth: 320,
  /** <768px 时是否正在看详情（false = 看列表） */
  mobileDetail: false,
})

/** 读写某个路由的筛选条件（各页面独立）。 */
function filtersOf(key) {
  const k = key || adminState.activeSubView || DEFAULT_KEY
  if (!adminState.filters[k]) adminState.filters[k] = {}
  return adminState.filters[k]
}

/** 设置局部错误（传 null 清除）。 */
function setError(message, retry) {
  adminState.error = message ? { message: String(message), retry: retry || null } : null
}

/**
 * 把路由键规范化为一个「确实可用」的键。
 * 未知键 → 默认页；视图未装载 → 默认页（避免点进空白）。
 */
function resolveKey(key) {
  const k = String(key || '')
  if (!isValidKey(k)) return DEFAULT_KEY
  if (!isAvailable(ROUTE_MAP[k])) return DEFAULT_KEY
  return k
}

/**
 * 应用一个路由键到状态（不改 hash、不切骨架视图 —— 那是 action.js 的事）。
 *
 * @param {string} key
 * @returns {string} 实际生效的路由键
 */
function applyKey(key) {
  const k = resolveKey(key)
  const r = ROUTE_MAP[k]
  adminState.activeSubView = k
  adminState.activeSection = r ? r.section : 'overview'
  adminState.selectedId = null
  adminState.selection = []
  adminState.error = null
  adminState.mobileDetail = false
  adminState.drawerOpen = false
  return k
}

/** 侧栏折叠持久化（管理后台的折叠状态跨会话保留）。 */
const COLLAPSE_KEY = 'privhub_admin_sidebar_collapsed'
try { adminState.sidebarCollapsed = localStorage.getItem(COLLAPSE_KEY) === '1' } catch { /* 隐私模式 */ }

function setCollapsed(v) {
  adminState.sidebarCollapsed = v === true
  try { localStorage.setItem(COLLAPSE_KEY, adminState.sidebarCollapsed ? '1' : '0') } catch { /* 忽略 */ }
}

/** 上次停留的管理路由（「返回文件」后再进管理控制台时回到这里）。 */
const LAST_KEY = 'privhub_admin_last_route'

function rememberRoute(key) {
  try { localStorage.setItem(LAST_KEY, String(key || '')) } catch { /* 忽略 */ }
}

function lastRoute() {
  let v = ''
  try { v = localStorage.getItem(LAST_KEY) || '' } catch { /* 忽略 */ }
  return resolveKey(v || DEFAULT_KEY)
}

export {
  adminState, filtersOf, setError, resolveKey, applyKey,
  setCollapsed, rememberRoute, lastRoute,
}
