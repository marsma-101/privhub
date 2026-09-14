/**
 * routes — 管理控制台的路由表与「视图可用性」判定。
 *
 * 设计要点：
 *   - 分组按【管理员职责】划分（概览 / 用户与权限 / 内容治理 / 系统运维），
 *     不按插件划分；插件换名或拆分不影响侧栏结构。
 *   - 每个条目声明自己要用的视图（view）与承载它的 slot。视图由其它插件提供
 *     （各自 manifest 的 admin-view slot + admin-nav barItem），因此
 *     **插件被卸载后该条目自动变为「未安装」**，而不是点进去空白。
 *   - 本文件不认识任何具体插件 id，只认 view/slot 名 —— 保持单向依赖。
 *
 * @module privhub-admin-console/client/routes
 */

import { barItems, manifests } from './deps.js'

/** 侧栏分组（顺序即渲染顺序）。 */
const SECTIONS = [
  { id: 'overview', title: '概览', icon: '📊' },
  { id: 'access', title: '用户与权限', icon: '👥' },
  { id: 'content', title: '内容治理', icon: '🗂️' },
  { id: 'ops', title: '系统运维', icon: '⚙️' },
]

/**
 * 路由条目。
 *
 * key      路由键，等于 hash 里的路径（#/admin/<key>）
 * short    面包屑上的短名
 * section  所属分组
 * icon     侧栏图标
 * view     切到骨架的哪个 activeView（'' = 本插件自渲染，不切换视图）
 * slot     承载该视图的 slot 名（view === '' 时忽略）
 * builtin  由本插件自渲染的面板（'overview' 等；view === '' 时忽略）
 * entryOf  对应的 admin-nav barItem 的 view（用于反查插件标题/图标/可用性）
 */
const ROUTES = [
  { key: 'overview', label: '管理概览', short: '管理概览', section: 'overview', icon: '📊', view: '', builtin: 'overview' },

  { key: 'access/users', label: '用户管理', short: '用户管理', section: 'access', icon: '👥', view: 'admin', slot: 'admin', entryOf: 'admin', implemented: true },
  { key: 'access/projects', label: '项目权限', short: '项目权限', section: 'access', icon: '📁', view: '', builtin: 'projects', adminOnly: true },
  { key: 'access/acl', label: 'ACL 规则', short: 'ACL 规则', section: 'access', icon: '🔒', view: 'acl', slot: 'acl', entryOf: 'acl', implemented: true },
  { key: 'access/agents', label: '智能体密钥', short: '智能体密钥', section: 'access', icon: '🔌', view: 'agent', slot: 'agent-view', entryOf: 'agent', implemented: true },

  { key: 'content/tags', label: '标签管理', short: '标签管理', section: 'content', icon: '🏷️', view: 'tags', slot: 'admin-tags', entryOf: 'tags', implemented: true },
  { key: 'content/templates', label: '模板管理', short: '模板管理', section: 'content', icon: '📄', view: 'template', slot: 'admin-template', entryOf: 'template', implemented: true },
  { key: 'content/publish', label: '发布链接', short: '发布链接', section: 'content', icon: '🔗', view: '', builtin: 'publish', adminOnly: true },
  { key: 'content/trash', label: '回收站', short: '回收站', section: 'content', icon: '🗑️', view: 'trash', slot: 'admin-trash', entryOf: 'trash', implemented: true },

  { key: 'ops/audit', label: '审计日志', short: '审计日志', section: 'ops', icon: '🧾', view: 'audit', slot: 'audit', entryOf: 'audit', implemented: true },
  { key: 'ops/settings', label: '系统设置', short: '系统设置', section: 'ops', icon: '⚙️', view: 'settings', slot: 'settings', entryOf: 'settings', implemented: true },
  { key: 'ops/backup', label: '自动备份', short: '自动备份', section: 'ops', icon: '💾', view: '', builtin: 'backup', adminOnly: true },
  { key: 'ops/watermark', label: '水印配置', short: '水印配置', section: 'ops', icon: '💧', view: '', builtin: 'watermark', adminOnly: true },
]

/** key → 条目。 */
const ROUTE_MAP = {}
for (const r of ROUTES) ROUTE_MAP[r.key] = r

/** 默认（空 hash / 未知路径）落到哪一条。 */
const DEFAULT_KEY = 'overview'

/**
 * 可用的管理系统视图集合。
 *
 * 真正的依据是骨架的图标栏条目表（由各插件 manifest 的 barItems 汇总，
 * 已按 adminOnly 过滤过登录用户），所以：
 *   - 管理员：看到全部；普通用户：看不到 adminOnly 的入口。
 *   - 只有声明了 view 的条目才需要判可用性；本插件自渲染的面板恒可用。
 */
function viewSet() {
  const s = new Set()
  for (const bi of barItems || []) {
    const v = bi.view || bi.slot
    if (v) s.add(v)
  }
  return s
}

/** 某条路由当前是否可用（视图已装载 / 面板自渲染，且未被 adminOnly 挡下）。 */
function isAvailable(route) {
  if (!route) return false
  if (route.view === '') return true            // 本插件自渲染，恒可用
  if (!route.entryOf) return true
  return viewSet().has(route.entryOf)
}

/** 视图对应插件的标题（用于面包屑与侧栏提示；取不到时回退入口标题）。 */
function providerOf(route) {
  if (!route || !route.entryOf) return ''
  for (const m of manifests || []) {
    for (const bi of m.barItems || []) {
      if ((bi.view || bi.slot) === route.entryOf) return m.title || m.id || ''
    }
  }
  return ''
}

/** 该条目是否「暂未接入」（有侧栏位置，但承载视图的插件没有装载）。 */
function isPending(route) {
  return route.view !== '' && !isAvailable(route)
}

/* ================= hash 路由（#/admin/...） ================= */

/** 路由键 → hash 片段。 */
function keyToHash(key) { return '#/admin/' + String(key || '').replace(/^\/+/, '') }

/**
 * 解析 hash 为路由键。
 * `#/admin`、`#/admin/`、`#/admin/access/acl?x=1` 都归一为规范键。
 *
 * @param {string} hash
 * @returns {string} 路由键；不是管理路由时返回 ''
 */
function hashToKey(hash) {
  const raw = String(hash || '').replace(/^#/, '')
  if (raw !== '/admin' && !raw.startsWith('/admin/')) return ''
  const rest = raw.slice('/admin'.length).replace(/^\/+/, '').split('?')[0].split('&')[0]
  return rest.replace(/\/+$/, '')
}

/** 该 key 是否是合法路由。 */
function isValidKey(key) { return !!ROUTE_MAP[key] }

/** 分组 + 组内条目（含可用性标记），侧栏直接用。 */
function navModel() {
  return SECTIONS.map((s) => ({
    ...s,
    items: ROUTES.filter((r) => r.section === s.id).map((r) => ({
      ...r,
      available: isAvailable(r),
      pending: isPending(r),
      provider: providerOf(r),
    })),
  }))
}

export {
  SECTIONS, ROUTES, ROUTE_MAP, DEFAULT_KEY,
  isAvailable, isPending, providerOf, navModel,
  keyToHash, hashToKey, isValidKey,
}
