/**
 * admin-console.mjs — 管理控制台外壳（privhub-admin-console）回归套件
 *
 * 为什么需要这一套：
 *   管理控制台是纯前端插件，模板与模块在 Node 里不会被任何静态检查真正“跑”起来。
 *   骨架回归（frontend-templates）只编译模板、integrity 只看文件契约，
 *   两者都不会发现「组件挂载时炸了」「hash 里带 /admin/access/acl 却找不到路由」
 *   「点侧栏把界面 toggle 回文件页」这类**运行期**问题。
 *
 * 做法：用最小 DOM 适配器（只实现 Vue runtime-dom 实际会调用的那些成员）在 Node 中
 *   真实加载 Vue + 本插件全部模块，挂载 AdminShell 并断言渲染结果与导航行为。
 *
 *   node tests/admin-console.mjs
 *
 * @module tests/admin-console
 */

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import vm from 'node:vm'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const CLIENT = join(ROOT, 'plugins', 'privhub-admin-console', 'client')

let pass = 0
let fail = 0
const failures = []

function ok(cond, msg) {
  if (cond) { pass++ } else { fail++; failures.push(msg) }
  console.log((cond ? '  ✅ ' : '  ❌ ') + msg)
}

/* ══════════ 1. 最小 DOM 适配器（只实现 runtime-dom 会调用的成员） ══════════
 * 注意 innerHTML 必须“真的解析”出子元素并带上属性：Vue 的 HTML 实体解码走的是
 * `div.innerHTML = '<div foo="...">'` → `children[0].getAttribute('foo')`，
 * 桩若不解析，含 &nbsp; 之类的模板会在编译期报 getAttribute of undefined。 */
const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', copy: '\u00a9',
  reg: '\u00ae', hellip: '\u2026', mdash: '\u2014', ndash: '\u2013', times: '\u00d7',
  middot: '\u00b7', deg: '\u00b0', bull: '\u2022', euro: '\u20ac', pound: '\u00a3',
  yen: '\u00a5', sect: '\u00a7', laquo: '\u00ab', raquo: '\u00bb',
}
function decodeEntities(s) {
  return String(s)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (m, n) => (NAMED_ENTITIES[n] !== undefined ? NAMED_ENTITIES[n] : m))
}

function makeEl(tag) {
  const el = {
    nodeType: 1,
    tagName: String(tag || 'div').toUpperCase(),
    children: [],
    parentNode: null,
    _attrs: {},
    _text: '',
    _html: '',
    _listeners: {},
    /* 表单元素的 value 必须是元素自身的属性：Vue 的 vModelText 在 input 回调里
     * 读的是 el.value（不是 event.target.value）。缺了它 v-model 静默失效。 */
    value: '',
    /* Vue 对静态/动态 class 走 el.className 或 classList.add，不一定走 setAttribute */
    className: '',
    style: { setProperty() {}, removeProperty() {} },
    classList: {
      add(...names) { this._owner.className = (this._owner.className + ' ' + names.join(' ')).trim() },
      remove(...names) {
        const drop = new Set(names)
        this._owner.className = String(this._owner.className).split(/\s+/).filter((c) => c && !drop.has(c)).join(' ')
      },
      _owner: null,
    },
    get textContent() { return this._text },
    set textContent(v) { this._text = String(v == null ? '' : v) },
    /* Vue 解码实体用 innerHTML 当解析器：这里必须真的解析出子元素与属性 */
    get innerHTML() { return this._html },
    set innerHTML(v) {
      const html = String(v)
      this._html = html
      this._text = decodeEntities(html.replace(/<[^>]*>/g, ''))
      this.children = []
      const tagRe = /<([a-zA-Z][\w-]*)((?:\s+[\w:.-]+\s*=\s*"[^"]*")*)\s*\/?>/g
      let m
      while ((m = tagRe.exec(html)) !== null) {
        const child = makeEl(m[1])
        const attrRe = /([\w:.-]+)\s*=\s*"([^"]*)"/g
        let a
        while ((a = attrRe.exec(m[2] || '')) !== null) child._attrs[a[1]] = decodeEntities(a[2])
        this.children.push(child)
      }
    },
    get firstChild() { return this.children[0] || null },
    /* Vue 的 patch 会在插入/移动节点时读 nextSibling/previousSibling 定位锚点，
     * 必须按父节点的子列表真实计算，否则插入直接抛 TypeError。 */
    get nextSibling() {
      const p = this.parentNode
      if (!p || !p.children) return null
      const i = p.children.indexOf(this)
      return i >= 0 ? (p.children[i + 1] || null) : null
    },
    get previousSibling() {
      const p = this.parentNode
      if (!p || !p.children) return null
      const i = p.children.indexOf(this)
      return i > 0 ? (p.children[i - 1] || null) : null
    },
    setAttribute(k, v) { this._attrs[k] = String(v) },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._attrs, k) ? this._attrs[k] : null },
    removeAttribute(k) { delete this._attrs[k] },
    appendChild(c) { c.parentNode = this; this.children.push(c); return c },
    insertBefore(c, ref) {
      c.parentNode = this
      const i = ref ? this.children.indexOf(ref) : -1
      if (i >= 0) this.children.splice(i, 0, c)
      else this.children.push(c)
      return c
    },
    removeChild(c) {
      const i = this.children.indexOf(c)
      if (i >= 0) this.children.splice(i, 1)
      return c
    },
    remove() { if (this.parentNode) this.parentNode.removeChild(this) },
    addEventListener(t, fn) { (this._listeners[t] = this._listeners[t] || []).push(fn) },
    removeEventListener(t, fn) {
      const a = this._listeners[t]
      if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1) }
    },
    /** 触发事件（合成一个最小事件对象；preventDefault/stopPropagation 为空实现）。
     *  input 事件模拟真实浏览器：先把 target.value 写到元素自身（v-model 读 el.value）。 */
    dispatch(type, ev) {
      const e = Object.assign({ type, target: this, preventDefault() {}, stopPropagation() {} }, ev || {})
      if (type === 'input' && e.target && typeof e.target.value === 'string' && e.target !== this) this.value = e.target.value
      for (const fn of (this._listeners[type] || []).slice()) fn(e)
      return e
    },
    querySelector() { return null },
    querySelectorAll() { return [] },
    cloneNode() { return makeEl(tag) },
    contains() { return false },
    /* Vue 的 v-model beforeUpdate 会调 el.getRootNode() 判断是否要同步 activeElement。
     * 假 DOM 必须提供它，否则每次 v-model 重渲染都抛 TypeError（被 Vue 吞掉但真实存在）。 */
    getRootNode() { return documentStub },
  }
  el.classList._owner = el
  return el
}

const headChildren = []
const documentStub = {
  head: makeEl('head'),
  body: makeEl('body'),
  documentElement: makeEl('html'),
  /* v-model beforeUpdate 会读写 getRootNode().activeElement；给个可写桩。 */
  activeElement: null,
  createElement: (t) => makeEl(t),
  /* 文本节点也要能参与“定位锚点”计算（Vue 用空文本节点当 Fragment 锚点，
   * 之后会读它的 nextSibling / parentNode） */
  createTextNode: (t) => ({
    nodeType: 3,
    children: null,
    parentNode: null,
    textContent: String(t == null ? '' : t),
    get nextSibling() {
      const p = this.parentNode
      if (!p || !p.children) return null
      const i = p.children.indexOf(this)
      return i >= 0 ? (p.children[i + 1] || null) : null
    },
    remove() { if (this.parentNode) this.parentNode.removeChild(this) },
    cloneNode() { return documentStub.createTextNode(this.textContent) },
  }),
  createComment: () => makeEl('#comment'),
  querySelector: (sel) => {
    const m = /^style\[([\w-]+)\]$/.exec(String(sel))
    if (!m) return null
    return headChildren.find((e) => Object.prototype.hasOwnProperty.call(e._attrs, m[1])) || null
  },
  querySelectorAll: () => [],
  getElementById: () => null,
  addEventListener() {},
  removeEventListener() {},
}
documentStub.head.appendChild = (c) => { headChildren.push(c); return c }
documentStub.body.appendChild = (c) => c

/* 事件注册表：用于断言 hashchange 等全局监听 */
const winListeners = {}
const storage = new Map()

const windowStub = {
  document: documentStub,
  navigator: { userAgent: 'node-test', clipboard: null },
  /* 赋 location.hash 要像浏览器一样触发 hashchange（本插件完全依赖该行为做路由） */
  location: (() => {
    let hash = ''
    return {
      pathname: '/', search: '',
      get hash() { return hash },
      set hash(v) {
        const next = String(v == null ? '' : v)
        const norm = next && !next.startsWith('#') ? '#' + next : next
        if (norm === hash) return
        hash = norm
        windowStub.dispatch('hashchange')
      },
    }
  })(),
  history: {
    replaceState(_s, _t, url) {
      const i = String(url || '').indexOf('#')
      const next = i >= 0 ? String(url).slice(i) : ''
      windowStub.location.hash = next
    },
  },
  localStorage: {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
  },
  addEventListener: (t, fn) => { (winListeners[t] = winListeners[t] || []).push(fn) },
  removeEventListener: (t, fn) => {
    const a = winListeners[t]
    if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1) }
  },
  /** 触发全局事件 */
  dispatch(t, ev) { for (const fn of (winListeners[t] || []).slice()) fn(Object.assign({ type: t }, ev || {})) },
  setTimeout: () => 0,
  clearTimeout: () => {},
  requestAnimationFrame: (fn) => { fn(0); return 0 },
  cancelAnimationFrame: () => {},
  getComputedStyle: () => ({ getPropertyValue: () => '1' }),
}
windowStub.window = windowStub
windowStub.self = windowStub

/** 设置全局：某些名字（如 Node 24 的 navigator）是只读 getter，需要 defineProperty 兜底。 */
function setGlobal(name, value) {
  try { globalThis[name] = value } catch { /* 只读 getter，走下面的 defineProperty */ }
  if (globalThis[name] === value) return
  try {
    Object.defineProperty(globalThis, name, { value, writable: true, configurable: true, enumerable: false })
  } catch (e) {
    console.warn('[admin-console 测试] 无法覆盖全局 ' + name + '：' + e.message)
  }
}

setGlobal('window', windowStub)
setGlobal('document', documentStub)
setGlobal('navigator', windowStub.navigator)
setGlobal('location', windowStub.location)
setGlobal('history', windowStub.history)
setGlobal('localStorage', windowStub.localStorage)
setGlobal('addEventListener', windowStub.addEventListener)
setGlobal('removeEventListener', windowStub.removeEventListener)
setGlobal('requestAnimationFrame', windowStub.requestAnimationFrame)
setGlobal('cancelAnimationFrame', windowStub.cancelAnimationFrame)
/* Vue 的 createApp().mount 会做 `instanceof SVGElement` 判断，缺了会直接抛错。
 * 这些名字既要挂到 Node 全局（runtime-dom 在真实全局里求值），也要放进 vm 上下文。 */
class ElementStub {}
class SVGElementStub extends ElementStub {}
class MathMLElementStub extends ElementStub {}
class ShadowRootStub {}
class DocumentStub {}
const DOM_GLOBALS = {
  Element: ElementStub,
  SVGElement: SVGElementStub,
  MathMLElement: MathMLElementStub,
  ShadowRoot: ShadowRootStub,
  Document: DocumentStub,
  ResizeObserver: class { observe() {} disconnect() {} },
}
for (const [k, v] of Object.entries(DOM_GLOBALS)) setGlobal(k, v)

/* ══════════ 2. 加载 Vue（骨架自带的 global 构建，与浏览器里同一份） ══════════ */
const vuePath = join(ROOT, 'frontend', 'vue.global.prod.js')
ok(existsSync(vuePath), '找到骨架自带的 Vue（' + vuePath.replace(ROOT, '') + '）')

const vueCtx = {
  console, setTimeout: windowStub.setTimeout, clearTimeout: windowStub.clearTimeout,
  setInterval: () => 0, clearInterval: () => {},
  queueMicrotask, Promise, Date, Math, JSON, Object, Array, String, Number, Boolean, Error,
  Map, Set, WeakMap, WeakSet, Symbol, RegExp, Function, Buffer, Reflect, Proxy, Intl,
  document: documentStub,
  navigator: windowStub.navigator,
  location: windowStub.location,
  addEventListener() {}, removeEventListener() {},
  requestAnimationFrame: windowStub.requestAnimationFrame,
  ...DOM_GLOBALS,
}
ok(typeof SVGElement === 'function', 'DOM 全局桩就位（Vue mount 需要 SVGElement/MathMLElement）')
vueCtx.window = vueCtx
vueCtx.self = vueCtx
vueCtx.globalThis = vueCtx
vm.createContext(vueCtx)
vm.runInContext(readFileSync(vuePath, 'utf8'), vueCtx, { filename: 'vue.global.prod.js' })
const vueGlobal = vueCtx.Vue
ok(!!vueGlobal && typeof vueGlobal.reactive === 'function',
  'Vue 已加载（' + (vueGlobal && vueGlobal.version) + '，含 reactive/编译能力）')
windowStub.Vue = vueGlobal
setGlobal('Vue', vueGlobal)

const apiCalls = []
const busListeners = {}
const toastCalls = []

/* 假接口：概览面板并发拉多个既有接口。这里给出结构正确的样例数据，
 * 用来验证「有数据时渲染职责卡片」这条真实路径（不访问真实后端）。
 *
 * 2026-11-17 取数重构后的关键 fixture 语义：
 *   - users?limit=1 只回 1 条，但 total=2（真实总数）——概览必须读 total；
 *   - audit 列表只有 3 条，而 audit/stats.entries=3712——**故意做成不等**，
 *     谁要是再拿列表 .length 当总数，断言立刻红（这正是修掉的那个 bug）；
 *   - volumes/list 给 2 个卷共 7 个文件——运维卡的指标来源。 */
const API_FIXTURES = {
  '/privhub/api/admin/users': { ok: true, users: [{ username: 'admin', displayName: '测试管理员' }, { username: 'u1', displayName: '用户一' }], total: 2, allProjects: ['公共'] },
  '/privhub/api/admin/users?limit=1': { ok: true, users: [{ username: 'admin', displayName: '测试管理员' }], total: 2, allProjects: ['公共'] },
  '/privhub/api/projects': { ok: true, projects: ['公共', 'A项目'] },
  '/privhub/api/acl/rules': { ok: true, rules: [{ id: 'r1' }] },
  '/privhub/api/audit': { ok: true, entries: [{ id: 'a1', user: 'admin', action: 'login', target: '', at: Date.now() - 60000 }, { id: 'a2', user: 'u1', action: 'upload', target: '公共/a.txt', at: Date.now() - 120000 }, { id: 'a3', user: 'admin', action: 'delete', target: '公共/b.txt', at: Date.now() - 180000 }] },
  '/privhub/api/audit?limit=5': { ok: true, entries: [{ id: 'a1', user: 'admin', action: 'login', target: '', at: Date.now() - 60000 }, { id: 'a2', user: 'u1', action: 'upload', target: '公共/a.txt', at: Date.now() - 120000 }, { id: 'a3', user: 'admin', action: 'delete', target: '公共/b.txt', at: Date.now() - 180000 }] },
  '/privhub/api/audit/stats': { ok: true, entries: 3712, badBlocks: 0, healthy: true },
  '/privhub/api/trash-list': { ok: true, trash: [] },
  '/privhub/api/volumes/list': { ok: true, volumes: [{ id: 'v1', label: '主库', root: 'G:\\data-files', files: 5, bytes: 100, isSystemRoot: true }, { id: 'v2', label: '2号库', root: 'G:\\new-lib', files: 2, bytes: 50, isSystemRoot: false }], defaultVolumeId: 'v1' },
  '/privhub/api/storage/relocate-status': { ok: true, running: false, target: 0, done: 0, moved: 0, skipped: 0, failed: 0, poolPending: 7, poolTotal: 7, targetVolumeId: null, mode: null, finishedAt: null, lastError: null, defaultVolumeId: 'v1', dataFiles: 'G:\\data-files', mirrored: 7, dangling: 0, mirrorRoot: 'G:\\new-lib\\.library-view' },
  '/privhub/api/publish/list': {
    ok: true,
    publishes: [
      { code: 'c1', project: '公共', path: 'a.html', createdBy: 'admin', expiresAt: 0 },
      { code: 'c2', project: 'A项目', path: 'b.html', createdBy: 'admin', expiresAt: Date.now() + 86400000 },
    ],
  },
}
/** 测试注入的接口失败集合（验证"部分失败只影响对应卡片"）。 */
const apiFailures = new Set()

const navStub = vueGlobal.reactive({
  project: null,
  activeView: 'files',
  trashList: [],
  trashView: false,
  projectsList: ['公共', 'A项目'],
  viewCalls: [],
  setActiveView(v, opts) {
    const noToggle = !!(opts && opts.noToggle)
    if (!noToggle && this.activeView === v) v = 'files'
    this.viewCalls.push({ v, noToggle })
    this.activeView = v
  },
  backToFiles() { this.activeView = 'files' },
})

const barItemsStub = vueGlobal.reactive([
  { icon: '🛠️', title: '管理控制台', slot: 'admin-console', view: 'admin', adminOnly: true },
  { icon: '👥', title: '用户管理', slot: 'admin-nav', view: 'admin', adminOnly: true },
  { icon: '🔒', title: '权限管理', slot: 'admin-nav', view: 'acl', adminOnly: true },
  { icon: '🔌', title: '智能体密钥', slot: 'admin-nav', view: 'agent', adminOnly: true },
  { icon: '🔌', title: '智能体接入', slot: 'app-iconbar', view: 'agent' },
  { icon: '🏷️', title: '标签管理', slot: 'admin-nav', view: 'tags' },
  { icon: '📝', title: '模板管理', slot: 'admin-nav', view: 'template' },
  { icon: '🗑️', title: '回收站', slot: 'admin-nav', view: 'trash' },
  { icon: '📋', title: '审计', slot: 'admin-nav', view: 'audit', adminOnly: true },
  { icon: '⚙', title: '系统设置', slot: 'admin-nav', view: 'settings', adminOnly: true },
])

windowStub.PrivHub = {
  api: async (path) => {
    apiCalls.push(path)
    /* 支持查询串：精确命中优先，否则退回裸路径 fixture（limit 等参数不改变桩数据形状）。 */
    const bare = String(path).split('?')[0]
    if (apiFailures.has(path) || apiFailures.has(bare)) return { ok: false, error: '测试桩：注入的失败' }
    return API_FIXTURES[path] || API_FIXTURES[bare] || { ok: false, error: '测试桩：未提供该接口数据 ' + path }
  },
  nav: navStub,
  bus: {
    on(ev, fn) { (busListeners[ev] = busListeners[ev] || []).push(fn); return () => {} },
    off() {}, emit() {},
  },
  AUTH: { token: 't', user: { username: 'admin', displayName: '测试管理员', role: 'admin' } },
  toast: (m, t) => { toastCalls.push({ m, t }) },
  manifests: [{ id: 'privhub-admin', title: '管理', barItems: [{ slot: 'admin-nav', view: 'admin' }] }],
  barItems: barItemsStub,
}

/* ══════════ 3. 加载插件模块（真实 import；styles.js 会往 document.head 插样式） ══════════ */
const mod = {}
for (const f of ['routes', 'store', 'panelbus', 'confirm', 'toast', 'ui', 'action', 'sidebar', 'topbar', 'breadcrumb', 'sectionheader', 'guide', 'panels', 'shell', 'index']) {
  mod[f] = await import('file:///' + join(CLIENT, f + '.js').replace(/\\/g, '/'))
}
ok(!!mod.index.default, '插件入口可加载（export default 存在）')
ok(!!mod.shell.AdminShell, 'AdminShell 已导出')
ok(headChildren.some((e) => e._attrs['data-privhub-admin-console'] !== undefined),
  'styles.js import 即注入样式（只插一次）')

/* ══════════ 4. 路由与可用性 ══════════ */
console.log('\n── 路由与视图可用性 ──')
const routes = mod.routes
ok(routes.SECTIONS.length === 4, `侧栏分为 4 组（实际 ${routes.SECTIONS.length}）`)
/* 名册计数：每新增一条管理路由就要 +1。
 *
 * 这条断言的价值不在于数字本身，而在于「路由表被改动时有人会看一眼」
 * —— 仍然精确相等，少一条、多一条都会红。
 *
 * 本轮新增 ops/storage「存储卷」（builtin 面板，由本插件自渲染）；
 * 上一轮新增 ops/doctor「系统自检」、再上一轮 ops/migrate「存储迁移」、
 * 再上一轮 ops/update；
 * 本轮再增 ops/storeops「存储运维（超管）」（slot=admin-storeops，
 * 由 privhub-store-ops 承载，v2 存储重构阶段 3）。 */
ok(routes.ROUTES.length === 20, `管理路由 20 条（实际 ${routes.ROUTES.length}）`)
/* 关键路由必须在册 —— 比数字更能说明「功能真的接上了」。
 * 少一条 = 侧栏里没有入口，功能等于没装。 */
for (const key of ['ops/storage', 'ops/doctor', 'ops/migrate', 'ops/backup', 'ops/settings', 'ops/storeops']) {
  ok(routes.ROUTES.some((r) => r.key === key), `路由表含 ${key}`)
}
ok(routes.ROUTES.find((r) => r.key === 'ops/storage')?.builtin === 'storage',
  '存储卷路由声明 builtin=storage（由本插件自渲染）')
ok(routes.ROUTES.find((r) => r.key === 'ops/doctor')?.builtin === 'doctor',
  '系统自检路由声明 builtin=doctor（由本插件自渲染）')
ok(routes.hashToKey('#/admin/access/acl') === 'access/acl', '#/admin/access/acl 解析为 access/acl')
ok(routes.hashToKey('#/admin/overview') === 'overview', '#/admin/overview 解析为 overview')
ok(routes.hashToKey('#/admin') === '', '#/admin 归一为空键（落到上次位置/概览）')
ok(routes.hashToKey('#/files') === '', '非管理 hash 不被当成管理路由')
ok(routes.hashToKey('#/admin/access/acl?x=1') === 'access/acl', '带查询串的 hash 也能正确解析')

const model = routes.navModel()
/* 2026-11-16：侧栏分组新增「折叠」——每组分 items（常用，默认显示）与
 * more（低频，收起后可展开）。查条目要同时覆盖两处，否则会漏掉低频项。 */
const itemOf = (k) => model.flatMap((g) => [...(g.items || []), ...(g.more || [])]).find((i) => i.key === k)
ok(itemOf('access/users').available === true, '声明了 admin 视图 → 用户管理条目可用')
ok(itemOf('access/acl').available === true, '声明了 acl 视图 → ACL 条目可用')
ok(itemOf('ops/audit').available === true, '声明了 audit 视图 → 审计条目可用')
ok(itemOf('overview').available === true, '概览由外壳自渲染 → 恒可用')
ok(itemOf('ops/watermark').available === true && itemOf('ops/watermark').pending === false,
  '水印配置由外壳自渲染（只读面板）→ 可用')

/* 卸载插件后的行为：智能体接入插件消失（视图 'agent' 不再有任何声明），条目应变为「待接入」 */
const removed = barItemsStub.filter((b) => b.view === 'agent')
for (let i = barItemsStub.length - 1; i >= 0; i--) if (barItemsStub[i].view === 'agent') barItemsStub.splice(i, 1)
const afterUnload = routes.navModel().flatMap((g) => [...(g.items || []), ...(g.more || [])]).find((i) => i.key === 'access/agents')
ok(afterUnload.available === false && afterUnload.pending === true,
  '视图消失（插件卸载）后条目自动标记「待接入」而不是点进空白')
for (const b of removed) barItemsStub.push(b)

/* ══════════ 5. 挂载 AdminShell（真实渲染模板） ══════════ */
console.log('\n── AdminShell 渲染 ──')
const stubView = { name: 'stub-view', template: '<div class="stub-view">STUB</div>' }

/** 用真编译器把 template 编译成 render：子组件也走真实模板，不是空壳。 */
function compileComponent(c) {
  if (!c || typeof c !== 'object') return c
  const out = Object.assign({}, c)
  if (typeof out.template === 'string') {
    const fn = vueGlobal.compile(out.template)
    if (fn) { out.render = fn; delete out.template }
  }
  return out
}
function compileRegistry(reg) {
  const out = {}
  for (const k of Object.keys(reg || {})) out[k] = compileComponent(reg[k])
  return out
}

const slotComps = vueGlobal.reactive({
  admin: [stubView], acl: [stubView], audit: [stubView], agent: [stubView],
  'admin-tags': [stubView], 'admin-template': [stubView], 'admin-trash': [stubView],
  settings: [stubView],
})

const mountHost = makeEl('div')
const Shell = Object.assign({}, compileComponent(mod.shell.AdminShell), {
  components: compileRegistry(mod.shell.AdminShell.components),
})

const app = vueGlobal.createApp(Shell, { slotComps })
app.mount(mountHost)
/* 概览面板的取数是异步的（Promise.all 后才出卡片），多等几个微任务再断言 */
await vueGlobal.nextTick()
await Promise.resolve()
await vueGlobal.nextTick()
await Promise.resolve()
await vueGlobal.nextTick()

/** 把真实 DOM 树渲染成可断言的摘要（标签名 + class + 文本）。 */
function summary(el) {
  const out = []
  const walk = (e) => {
    if (!e || !e.children) return
    for (const c of e.children) {
      if (c.nodeType === 3) { out.push('#' + String(c.textContent || '').trim()); continue }
      const cls = String((c._attrs && c._attrs.class) || c.className || '').trim()
      out.push(String(c.tagName || '').toLowerCase() + (cls ? '.' + cls.replace(/\s+/g, '.') : ''))
      walk(c)
    }
  }
  walk(el)
  return out.join(' ')
}
/** 取第一个带指定 class 的元素（用于「结构里真的渲染出了某块」这类断言）。 */
function findByClass(root, cls) {
  let hit = null
  const walk = (e) => {
    if (hit || !e || !e.children) return
    for (const c of e.children) {
      if (c.nodeType !== 1) continue
      const names = String((c._attrs && c._attrs.class) || c.className || '').split(/\s+/)
      if (names.includes(cls)) { hit = c; return }
      walk(c)
    }
  }
  walk(root)
  return hit
}

const tree = summary(mountHost)
if (!tree.includes('ad-topbar')) console.log('       实际渲染树：' + tree.slice(0, 800))
ok(tree.length > 0, '挂载产生真实 DOM 节点（' + mountHost.children.length + ' 个根节点）')
ok(tree.includes('ad-topbar'), '渲染出顶部栏（.ad-topbar）')
ok(tree.includes('ad-side'), '渲染出左侧管理导航（.ad-side）')
ok(tree.includes('ad-content-inner'), '渲染出内容区（.ad-content-inner）')
/* 侧栏默认只渲染各组 primary 项（2026-11-16 起低频项收进「更多 N 项」，
 * 因为 19 项平铺太难扫）。所以这里断言的是**主项**数量，并额外确认
 * 折叠按钮存在、且「更多」里的项默认不渲染。 */
const navCount = (tree.match(/ad-nav-item(?![\w-])/g) || []).length
ok(navCount >= 8, '侧栏渲染出各组常用项（' + navCount + ' 项）')
ok(navCount < 15, '默认折叠后项数明显少于全部 19 项（实际 ' + navCount + '）')
ok(tree.includes('ad-nav-more'), '侧栏有「更多 N 项」折叠按钮')
ok(tree.includes('ad-group-title'), '侧栏渲染出分组标题')
ok(tree.includes('ad-crumb'), '顶部栏渲染出面包屑')
ok(tree.includes('ad-view'), '内容区渲染出视图容器（.ad-view）')

/* ── 减层（2026-11-17 主人反馈：横带太多、双侧栏、可点的太多、没引导）──
 * 管理视图里只保留：全局顶栏 + 管理顶栏（唯一横带）+ 一个管理侧栏。
 * 下面这些「重复/冗余」元素必须不再渲染。 */
ok(!tree.includes('ad-sh-title'), '内容区不再有独立的页标题横带（标题并入面包屑末级）')
ok(!tree.includes('ad-side-head'), '侧栏不再有「管理控制台」标题头（与面包屑重复）')
ok(!tree.includes('ad-side-foot'), '侧栏不再有「共 N 个分区」脚注（无信息量）')
ok(!tree.includes('ad-role-badge') && !tree.includes('ad-avatar'), '管理顶栏不再重复全局顶栏的角色徽标/头像')
ok(tree.includes('ad-help-btn'), '顶栏有「?」帮助按钮（新手引导的常驻入口）')
/* 面包屑末级 = 当前页标题（加粗），替代被删的页标题横带。 */
const crumbOn = findByClass(mountHost, 'ad-crumb-item on') || (() => {
  const c = findByClass(mountHost, 'ad-crumb')
  if (!c) return null
  return c.children.find((x) => String(x.className || '').split(/\s+/).includes('on')) || null
})()
ok(!!crumbOn, '面包屑有末级当前项（页标题）')

/* 概览页：5 张**职责入口卡**（2026-11-16 按原型 S23.1 重设计，11-17 取数重构）。
 *
 * 断言强度：恰好 5 张；数值必须来自**总数接口**（total / stats.entries），
 * 而不是分页列表的 .length —— fixture 故意把 audit 列表(3条)与 stats(3712)做成不等，
 * 谁再犯"页大小当总数"的错，这里立刻红。 */
const cardsBox = findByClass(mountHost, 'ad-ov-grid')
const cardCount = cardsBox ? cardsBox.children.filter((c) => String(c.className || '').split(/\s+/).includes('ad-ov-card')).length : 0
ok(cardCount === 5, `概览页渲染出 5 张职责入口卡（实际 ${cardCount}）`)
/* 搜索统一收进顶栏：概览页内**不再有**第二个搜索框（全管理台唯一）。 */
ok(findByClass(mountHost, 'ad-ov-search') === null, '概览页内没有重复搜索框（搜索只在顶栏）')
ok(findByClass(mountHost, 'ad-search-input') !== null, '顶栏有全局搜索输入框')
/* Vue 对「只含文本的元素」走 hostSetElementText -> el.textContent = ...，
 * 这里必须真的存下来，否则断言拿不到渲染出来的文字。 */
function nodeText(n) { return String((n && (n.nodeValue != null ? n.nodeValue : n.textContent)) || '') }
function textOf(el) {
  if (!el) return ''
  if (el.nodeType === 3) return nodeText(el)
  const own = String(el._text || '')
  const kids = (el.children || []).map((c) => textOf(c)).filter(Boolean)
  return [own, ...kids].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}
/** 取子树里全部文本（拼接），用于断言「渲染出的字面内容」。 */
function textDeep(el) { return textOf(el) }
const cardText = cardsBox ? cardsBox.children.map((c) => textOf(c)).join(' | ') : ''
ok(cardText.includes('用户与角色') && cardText.includes('2 个账号'),
  '用户卡读 total（fixture total=2，列表只有 1 条也不能错）：' + cardText.slice(0, 100))
ok(cardText.includes('审计日志') && cardText.includes('3712'),
  '审计卡读 stats.entries=3712（不是列表长度 3）：' + cardText.slice(0, 100))
ok(cardText.includes('系统运维') && cardText.includes('2 个存储卷') && cardText.includes('7 个文件'),
  '运维卡有真实指标（2 卷 · 7 文件，来自 volumes/list）：' + cardText.slice(0, 100))
ok(!cardText.includes('—'), '5 张卡全部有数字（无「—」占位）')
/* 取数路径：必须打总数接口，而不是拉全量列表来数长度。 */
ok(apiCalls.includes('/privhub/api/audit/stats'), '概览取数打了 /audit/stats（总数接口）')
ok(apiCalls.includes('/privhub/api/admin/users?limit=1'), '概览取数打了 users?limit=1（最小载荷）')
ok(apiCalls.includes('/privhub/api/volumes/list'), '概览取数打了 volumes/list（运维指标）')
/* 键盘可达：整卡 role=link + tabindex=0（Enter/Space 在模板里绑定）。 */
const firstCard = cardsBox ? cardsBox.children.find((c) => String(c.className || '').split(/\s+/).includes('ad-ov-card')) : null
ok(firstCard && firstCard._attrs['tabindex'] === '0' && firstCard._attrs['role'] === 'link',
  '概览卡片键盘可达（role=link + tabindex=0）')
/* 最近活动：来自 /audit?limit=5，渲染出动作与目标。 */
const recentBox = findByClass(mountHost, 'ad-ov-recent')
ok(!!recentBox, '概览渲染出「最近活动」区块')
ok(recentBox && textOf(recentBox).includes('上传') && textOf(recentBox).includes('公共/a.txt'),
  '最近活动显示真实条目（动作中文化 + 目标路径）')

/* 点侧栏条目 → 内容区换成对应插件组件（真实渲染，走 slotComps 查找） */
mod.panelbus.openAdminRoute('access/users')
await vueGlobal.nextTick()
const viewBox = findByClass(mountHost, 'ad-view')
ok(viewBox && textOf(viewBox).includes('STUB'), '点「用户管理」→ 内容区渲染 admin slot 的插件组件（不是空白）')

/* 视图缺失（插件卸载）时给可见原因 + 重试，而不是空白 */
barItemsStub.push({ icon: '🔒', title: '权限管理', slot: 'admin-nav', view: 'acl', adminOnly: true })
mod.panelbus.openAdminRoute('access/acl')
await vueGlobal.nextTick()
const savedAcl = slotComps.acl
slotComps.acl = []
await vueGlobal.nextTick()
const errBox = findByClass(mountHost, 'ad-error')
ok(!!errBox && textOf(errBox).includes('暂不可用'), '视图未装载时显示「暂不可用」错误卡片（含重试）')
slotComps.acl = savedAcl
await vueGlobal.nextTick()

/* 侧栏折叠 / 抽屉状态反映到根节点 class（响应式断点样式挂在 .admin-root 上） */
mod.store.setCollapsed(true)
await vueGlobal.nextTick()
ok(String(mountHost.children[0].className).includes('side-collapsed'), '折叠侧栏 → 根节点带 side-collapsed（1024-1279px 图标态样式生效）')
mod.store.setCollapsed(false)
await vueGlobal.nextTick()
ok(!String(mountHost.children[0].className).includes('side-collapsed'), '展开侧栏 → 去掉 collapsed 标记')

const navItems = (() => {
  const side = findByClass(mountHost, 'ad-side')
  const out = []
  const walk = (e) => {
    for (const c of (e.children || [])) {
      if (String(c.className || '').split(/\s+/).includes('ad-nav-item')) out.push(c)
      walk(c)
    }
  }
  if (side) walk(side)
  return out
})()
const activeItems = navItems.filter((c) => String(c.className).split(/\s+/).includes('on'))
ok(activeItems.length === 1, '侧栏同一时刻只有 1 个高亮项（当前导航项唯一）：' + activeItems.length)
ok(activeItems.length === 1 && textOf(activeItems[0]).includes('ACL'), '高亮项就是当前页（ACL 规则）')

/* ── 列表-详情主从布局（需求 §4）：发布链接页是参考实现 ── */
mod.panelbus.openAdminRoute('content/publish')
await vueGlobal.nextTick()
await Promise.resolve()
await vueGlobal.nextTick()
const ld = findByClass(mountHost, 'ad-ld')
ok(!!ld, '发布链接页使用列表-详情主从布局（.ad-ld）')
const listPane = findByClass(mountHost, 'ad-listpane')
const detailBody = findByClass(mountHost, 'ad-detail-body')
const listItems = (() => {
  const out = []
  const walk = (e) => {
    for (const c of (e.children || [])) {
      if (String(c.className || '').split(/\s+/).includes('ad-li')) out.push(c)
      walk(c)
    }
  }
  if (listPane) walk(listPane)
  return out
})()
ok(listItems.length === 2, '列表渲染出全部记录（2 条）：' + listItems.length)
ok(!!detailBody, '详情区同时渲染（列表与详情并排可见）')
ok(textOf(detailBody).includes('a.html'), '默认选中第一条并在详情区展示其信息')
ok(listItems[0] && String(listItems[0].className).includes('on'), '第一条为选中态（浅主色 + 左侧主色条）')
ok(!!findByClass(mountHost, 'ad-danger-zone'), '危险操作独立放在详情底部区域')

/* 键盘：↓ 切换选中 → Enter 打开详情 */
listPane.dispatch('keydown', { key: 'ArrowDown' })
await vueGlobal.nextTick()
const afterKey = (() => {
  const out = []
  const walk = (e) => {
    for (const c of (e.children || [])) {
      if (String(c.className || '').split(/\s+/).includes('ad-li')) out.push(c)
      walk(c)
    }
  }
  walk(listPane)
  return out
})()
ok(afterKey[1] && String(afterKey[1].className).includes('on'), '列表内按 ↓ → 选中项下移一条')
ok(!String(afterKey[0].className).includes('on'), '原选中项取消高亮（选中态唯一）')
listPane.dispatch('keydown', { key: 'Enter' })
await vueGlobal.nextTick()
ok(mod.store.adminState.mobileDetail === true, 'Enter → 打开详情（<768px 时显示详情页）')
mod.store.adminState.mobileDetail = false
await vueGlobal.nextTick()

/* 空数据 → 统一空状态（图标 + 标题 + 说明），不是空白 */
const savedPublish = API_FIXTURES['/privhub/api/publish/list']
API_FIXTURES['/privhub/api/publish/list'] = { ok: true, publishes: [] }
mod.panelbus.openAdminRoute('overview')
await vueGlobal.nextTick()
mod.panelbus.openAdminRoute('content/publish')
await vueGlobal.nextTick()
await Promise.resolve()
await vueGlobal.nextTick()
const emptyBox = findByClass(mountHost, 'ad-empty')
ok(!!emptyBox && textOf(emptyBox).includes('暂无选中项'), '无数据时显示统一空状态（含图标/标题/说明）')
API_FIXTURES['/privhub/api/publish/list'] = savedPublish

/* ══════════ 6. 导航行为（验收重点） ══════════ */
console.log('\n── 导航行为 ──')
const store = mod.store
ok(store.adminState.activeSubView === store.lastRoute(), '挂载后落到上次停留的管理路由（默认概览）')

const beforeCalls = navStub.viewCalls.length
mod.panelbus.openAdminRoute('access/acl')
await vueGlobal.nextTick()
ok(store.adminState.activeSubView === 'access/acl', '侧栏点击 → activeSubView 变为 access/acl')
ok(store.adminState.activeSection === 'access', '侧栏点击 → activeSection 同步为 access')
ok(windowStub.location.hash === '#/admin/access/acl', '侧栏点击 → hash 写成 #/admin/access/acl（刷新后保持位置）')
ok(navStub.viewCalls.length === beforeCalls, '已在管理视图内点侧栏 → 不重复调用 setActiveView（不会 toggle 回文件页）')
ok(navStub.activeView === 'admin', '管理视图内点击侧栏后仍停留在 admin 视图')

/* 关键回归：重复打开当前项不得回到 files */
mod.panelbus.openAdminRoute('access/acl')
await vueGlobal.nextTick()
ok(navStub.activeView === 'admin', '再次打开同一管理页仍停留在 admin（管理视图内无 toggle 行为）')

/* 刷新恢复：直接把 hash 设成某个管理路由，模拟刷新后 hashchange */
windowStub.location.hash = '#/admin/ops/audit'
windowStub.dispatch('hashchange')
await vueGlobal.nextTick()
ok(store.adminState.activeSubView === 'ops/audit', 'hashchange → 切到 ops/audit（刷新/前进后退都能保持位置）')
ok(store.adminState.activeSection === 'ops', 'hashchange → 分组同步为 ops')

/* 非法路由兜底 */
windowStub.location.hash = '#/admin/does/not/exist'
windowStub.dispatch('hashchange')
await vueGlobal.nextTick()
ok(store.adminState.activeSubView === routes.DEFAULT_KEY, '未知管理路由 → 回退到概览（不空白）')

/* 回到文件视图：清掉管理地址 */
windowStub.location.hash = '#/admin/access/acl'
windowStub.dispatch('hashchange')
await vueGlobal.nextTick()
navStub.activeView = 'files'
await vueGlobal.nextTick()
ok(windowStub.location.hash === '', '离开管理视图 → 管理 hash 被清理（文件页地址干净）')

/* 再次进入：回到上次位置 */
navStub.setActiveView('admin', { noToggle: true })
await vueGlobal.nextTick()
ok(store.adminState.activeSubView === 'access/acl', '再次进入管理控制台 → 回到上次停留的管理页')

/* ══════════ 7. 统一状态能力 ══════════ */
console.log('\n── 统一状态能力 ──')
const { confirmAction, confirmState } = mod.confirm
const pending = confirmAction({ title: '删除用户', message: '不可恢复', require: 'admin' })
ok(confirmState.open === true, 'confirmAction 打开确认弹窗')
ok(confirmState.require === 'admin', '危险操作要求输入关键词')
mod.confirm.settleConfirm(false)
ok((await pending) === false, '取消返回 false（Promise 不悬挂）')

const okP = confirmAction({ title: 'x' })
mod.confirm.settleConfirm(true)
ok((await okP) === true, '确认返回 true')

const { adminToast, toasts } = mod.toast
adminToast('已保存')
ok(toasts.length === 1 && toasts[0].type === 'success', 'adminToast 入队（默认 success）')
adminToast('失败', 'error')
ok(toasts.length === 2 && toasts[1].type === 'error', 'adminToast 支持 error 类型')

ok(typeof mod.ui.AdminEmptyState === 'object' && typeof mod.ui.AdminSkeleton === 'object' &&
   typeof mod.ui.AdminErrorState === 'object' && typeof mod.ui.AdminListDetail === 'object' &&
   typeof mod.ui.AdminDataTable === 'object' && typeof mod.ui.AdminBulkBar === 'object',
  '统一空/骨架/错误/列表-详情/数据表/批量栏组件齐备')

/* ══════════ 7.5 顶栏搜索（2026-11-17 做成真的）与概览取数纪律 ══════════ */
console.log('\n── 顶栏搜索与取数纪律 ──')

/* 页面直达：本地过滤，覆盖全部非 hidden 路由 + 别名（拼音首字母/常见叫法）。 */
const sr = routes.searchRoutes
ok(sr('用户管理').some((h) => h.key === 'access/users'), '搜索「用户管理」命中用户管理页')
ok(sr('存储').some((h) => h.key === 'ops/storage'), '搜索「存储」命中存储页')
ok(sr('hsz').some((h) => h.key === 'content/trash'), '拼音首字母 hsz 命中回收站')
ok(sr('迁移').some((h) => h.key === 'ops/migrate'), 'hidden 别名也能搜到（迁移 → 存储页别名）')
ok(sr('').length === 0, '空查询返回空（不弹全量）')
ok(sr('zzz-无此页').length === 0, '无命中返回空')
/* 可跳转的管理页数量（非 hidden 且当前可用）——验收要求 ≥10。 */
const jumpable = routes.ROUTES.filter((r) => r.hidden !== true && routes.isAvailable(r))
ok(jumpable.length >= 10, '搜索可直达的管理页 ≥10 个（实际 ' + jumpable.length + '）')
for (const r of jumpable) {
  ok(sr(r.label).some((h) => h.key === r.key), '按页名可搜到：' + r.label)
}

/* 顶栏交互：输入 → 候选渲染；Enter → 真的跳页（不是 toast 假功能）。 */
navStub.setActiveView('admin', { noToggle: true })
mod.panelbus.openAdminRoute('overview')
await vueGlobal.nextTick()
const searchInput = findByClass(mountHost, 'ad-search-input')
ok(!!searchInput, '顶栏搜索输入框已渲染')
searchInput.dispatch('input', { target: { value: '审计' } })
await vueGlobal.nextTick()
let pop = findByClass(mountHost, 'ad-search-pop')
ok(!!pop && textOf(pop).includes('审计日志'), '输入「审计」→ 下拉渲染出页面候选')
const searchForm = findByClass(mountHost, 'ad-search')
searchForm.dispatch('submit')
await vueGlobal.nextTick()
ok(store.adminState.activeSubView === 'ops/audit', '回车 → 真的跳到审计页（搜索是真功能）')

/* 实体搜索：用户名命中 → 候选里出现该用户（fixture 有 u1/用户一）。 */
mod.panelbus.openAdminRoute('overview')
await vueGlobal.nextTick()
searchInput.dispatch('input', { target: { value: '用户一' } })
await vueGlobal.nextTick()
await Promise.resolve(); await Promise.resolve()
await vueGlobal.nextTick()
pop = findByClass(mountHost, 'ad-search-pop')
ok(!!pop && textOf(pop).includes('用户一'), '输入用户名 → 实体候选出现（users 接口本地过滤）')
searchInput.dispatch('keydown', { key: 'Escape' })
await vueGlobal.nextTick()
ok(findByClass(mountHost, 'ad-search-pop') === null, 'Esc → 关闭搜索下拉')

/* 键盘 ↑↓：高亮项随按键移动（候选唯一高亮）。 */
searchInput.dispatch('input', { target: { value: '管理' } })
await vueGlobal.nextTick()
searchInput.dispatch('keydown', { key: 'ArrowDown' })
await vueGlobal.nextTick()
pop = findByClass(mountHost, 'ad-search-pop')
const hiItems = pop ? pop.children.flatMap((g) => g.children || []).filter((c) => String(c.className || '').split(/\s+/).includes('ad-search-item') && String(c.className || '').split(/\s+/).includes('on')) : []
ok(hiItems.length === 1, '↓ 之后有且仅有 1 个高亮候选')
searchInput.dispatch('keydown', { key: 'Escape' })
await vueGlobal.nextTick()

/* 概览取数纪律：部分接口失败 → 只影响对应卡（显示 —），不整页报错。 */
mod.panelbus.openAdminRoute('overview')
await vueGlobal.nextTick()
await Promise.resolve(); await vueGlobal.nextTick()
apiFailures.add('/privhub/api/audit/stats')
/* 通过外壳「刷新」强制重拉（reloadSeq+1 → 重挂 → 绕过 30s 缓存）。
 * 刷新现在是顶栏图标按钮（aria-label=刷新当前页），按 aria-label 定位。 */
const topbarRefresh = (() => {
  const tb = findByClass(mountHost, 'ad-topbar')
  let hit = null
  const walk = (e) => { for (const c of (e.children || [])) { if (String(c.tagName) === 'BUTTON' && (c._attrs['aria-label'] === '刷新当前页' || textOf(c).includes('刷新'))) { hit = c; return } walk(c) } }
  if (tb) walk(tb)
  return hit
})()
ok(!!topbarRefresh, '顶栏有「刷新」按钮')
topbarRefresh.dispatch('click')
await vueGlobal.nextTick()
await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
await vueGlobal.nextTick()
const cardsBox2 = findByClass(mountHost, 'ad-ov-grid')
const cardText2 = cardsBox2 ? cardsBox2.children.map((c) => textOf(c)).join(' | ') : ''
ok(cardText2.includes('审计日志') && cardText2.includes('—'), 'stats 失败 → 审计卡显示「—」（不假装 0）')
ok(cardText2.includes('2 个账号'), '其余卡片不受影响（用户卡仍是 2）')
ok(findByClass(mountHost, 'ad-error') === null, '部分失败不触发整页错误')
apiFailures.delete('/privhub/api/audit/stats')

/* 30 秒缓存：切走再切回（不点刷新）→ 不重复打接口。 */
const callsBefore = apiCalls.length
mod.panelbus.openAdminRoute('access/users')
await vueGlobal.nextTick()
mod.panelbus.openAdminRoute('overview')
await vueGlobal.nextTick()
await Promise.resolve(); await vueGlobal.nextTick()
ok(apiCalls.length === callsBefore, '30 秒内切回概览走缓存（0 次新请求）')

/* ══════════ 7.6 新手引导（2026-11-17：解决「没有使用方式介绍」） ══════════ */
console.log('\n── 新手引导 ──')
/* 首次进入自动弹（测试环境 localStorage 无 seen 标记） */
ok(!!findByClass(mountHost, 'ad-guide'), '首次进入管理台自动弹出上手引导')
ok(textOf(findByClass(mountHost, 'ad-guide')).includes('30 秒上手'), '引导标明「30 秒上手」')
/* 三步内容齐全 */
const guideText0 = textOf(findByClass(mountHost, 'ad-guide'))
ok(guideText0.includes('管理控制台') && guideText0.includes('返回文件'), '第 1 步讲清这是哪 / 怎么回去')
/* 下一步 → 第 2 步（搜索） */
const guideNext = (() => {
  const g = findByClass(mountHost, 'ad-guide')
  let hit = null
  const walk = (e) => { for (const c of (e.children || [])) { if (String(c.tagName) === 'BUTTON' && textOf(c).includes('下一步')) { hit = c; return } walk(c) } }
  if (g) walk(g)
  return hit
})()
ok(!!guideNext, '引导有「下一步」')
guideNext.dispatch('click')
await vueGlobal.nextTick()
ok(textOf(findByClass(mountHost, 'ad-guide')).includes('直接搜'), '第 2 步教搜索')
/* 「试试搜索」真的驱动顶栏搜索（不是纯文字） */
const trySearch = (() => {
  const g = findByClass(mountHost, 'ad-guide')
  let hit = null
  const walk = (e) => { for (const c of (e.children || [])) { if (String(c.tagName) === 'BUTTON' && textOf(c).includes('试试搜索')) { hit = c; return } walk(c) } }
  if (g) walk(g)
  return hit
})()
ok(!!trySearch, '第 2 步有可点的「试试搜索」动作')
trySearch.dispatch('click')
await vueGlobal.nextTick()
await Promise.resolve(); await vueGlobal.nextTick()
ok(findByClass(mountHost, 'ad-guide') === null, '点「试试搜索」后引导关闭')
const searchInputNow = findByClass(mountHost, 'ad-search-input')
ok(searchInputNow && searchInputNow.value === '存储', '「试试搜索」真的把搜索词填进顶栏（存储）')
ok(!!findByClass(mountHost, 'ad-search-pop'), '搜索候选随之展开（新手立刻看到搜索怎么用）')
/* 关闭引导后记 seen，不再自动弹 */
ok(windowStub.localStorage.getItem('privhub_admin_guide_seen') === '1', '看过引导后记 seen（不再自动打扰）')
/* 顶栏 ? 可随时重看 */
const helpBtn = (() => {
  const tb = findByClass(mountHost, 'ad-topbar')
  let hit = null
  const walk = (e) => { for (const c of (e.children || [])) { if (String(c.tagName) === 'BUTTON' && c._attrs['aria-label'] === '使用帮助') { hit = c; return } walk(c) } }
  if (tb) walk(tb)
  return hit
})()
ok(!!helpBtn, '顶栏 ? 帮助按钮存在')
helpBtn.dispatch('click')
await vueGlobal.nextTick()
ok(!!findByClass(mountHost, 'ad-guide'), '点 ? 可重新打开引导')
/* 概览「新手第一步」提示条：可执行建议 + 可关闭 */
mod.panelbus.openAdminRoute('overview')
await vueGlobal.nextTick()
await Promise.resolve(); await vueGlobal.nextTick()
const startBox = findByClass(mountHost, 'ad-ov-start')
ok(!!startBox && textOf(startBox).includes('用户管理'), '概览有「新手第一步」建议（指向用户管理）')

/* ══════════ 7.7 存储页重设计 + 库搬迁面板 ══════════
 * 2026-11-17：存储页从「6 张平铺卡片」重设计为「摘要 + 三段标签页」，
 * 库搬迁在「搬迁与整理」标签下。测试要先验证结构，再切标签验证功能。 */
console.log('\n── 存储页结构与库搬迁 ──')
mod.panelbus.openAdminRoute('ops/storage')
await vueGlobal.nextTick()
/* 存储页 load（volumes→settings 两段 await）+ 子面板各自 load，多 flush 几轮。 */
for (let i = 0; i < 8; i++) { await Promise.resolve(); await vueGlobal.nextTick() }

/* 新结构契约：顶部摘要 + 三段标签 + 镜像面板（解决「文件名被改」）。 */
ok(!!findByClass(mountHost, 'st-hero'), '存储页顶部有现状摘要（先给结论）')
const stTabs = [...(findByClass(mountHost, 'st-tabs')?.children || [])].filter((c) => String(c.className || '').split(/\s+/).includes('st-tab'))
ok(stTabs.length === 3, '存储页分三段标签（实际 ' + stTabs.length + '）')
ok(stTabs.some((t) => textOf(t).includes('总览')) && stTabs.some((t) => textOf(t).includes('搬迁')),
  '标签含总览与搬迁')
ok(findByClass(mountHost, 'mp-path') !== null, '总览标签下有「按原文件名查看」镜像路径')

/* 切到「搬迁与整理」标签，验证库搬迁面板 */
const tabRelocate = stTabs.find((t) => textOf(t).includes('搬迁'))
ok(!!tabRelocate, '找到「搬迁与整理」标签')
tabRelocate.dispatch('click')
await vueGlobal.nextTick()
for (let i = 0; i < 6; i++) { await Promise.resolve(); await vueGlobal.nextTick() }

const rlCard = (() => {
  const cards = []
  const walk = (e) => { for (const c of (e.children || [])) { if (String(c.className || '').split(/\s+/).includes('ad-section-card') && textOf(c).includes('库搬迁')) cards.push(c); walk(c) } }
  walk(mountHost)
  return cards[0] || null
})()
ok(!!rlCard, '「搬迁与整理」下渲染出「库搬迁」卡片')
ok(rlCard && textOf(rlCard).includes('解密成明文') && textOf(rlCard).includes('加密成密文') && textOf(rlCard).includes('保持不变'),
  '库搬迁提供三种形态选项')
ok(rlCard && textOf(rlCard).includes('程序与库分离'), '库搬迁讲清用途（程序与库分离）')
/* 目标卷下拉只列非系统卷（系统库根在程序目录里，搬过去等于没分离） */
const rlSelect = rlCard ? rlCard.children.flatMap((c) => c.children || []).find((c) => String(c.tagName) === 'SELECT') : null
const rlOpts = rlSelect ? (rlSelect.children || []).filter((c) => String(c.tagName) === 'OPTION') : []
ok(rlOpts.some((o) => textOf(o).includes('2号库')) && !rlOpts.some((o) => textOf(o).includes('主库')),
  '目标卷下拉只列可分离的非系统卷（含2号库，排除系统主库）')
/* 诚实反馈契约：legacy 迁移不再无条件假报「已启动」（源码层面钉住 started 分支） */
const panelsSrc = readFileSync(join(CLIENT, 'panels.js'), 'utf8')
ok(/r\.data\.started === false/.test(panelsSrc), '老库迁移按 started 分支反馈（修掉假「已启动」toast）')
const relocateSrc = readFileSync(join(CLIENT, 'relocate-panel.js'), 'utf8')
ok(/r\.data\.started === false/.test(relocateSrc), '库搬迁同样按 started 诚实反馈')
/* 镜像面板契约：「原文件名」这条主线不能被以后的重构悄悄删掉。 */
const mirrorSrc = readFileSync(join(CLIENT, 'mirror-panel.js'), 'utf8')
ok(/原文件名/.test(mirrorSrc) && /mirror-rebuild/.test(mirrorSrc),
  '镜像面板保留「按原文件名查看 + 重建」能力')

/* ══════════ 8. 交付契约：骨架接线 ══════════ */
console.log('\n── 骨架接线契约 ──')
const skeleton = readFileSync(join(ROOT, 'frontend', 'index.html'), 'utf8')
ok(/slotComps\['admin-console'\]/.test(skeleton), '骨架模板挂载 admin-console slot（否则外壳渲染不出来）')
ok(/:slot-comps="slotComps"/.test(skeleton), '骨架把全部 slot 组件传给外壳（外壳据此渲染各管理页）')
ok(/setActiveView\(v, opts\)/.test(skeleton) && /noToggle/.test(skeleton),
  '骨架 setActiveView 支持 noToggle（管理视图内不 toggle 回文件页）')
ok(/nav\.activeView !== 'admin'/.test(skeleton), 'Esc 回文件视图对管理控制台不生效（弹窗 Esc 不会把人弹出去）')
/* 减层契约：管理视图里框架 T2 位置链不渲染（否则顶部又叠一条重复的头）。 */
ok(/class="ph-t2" v-if="nav\.activeView !== 'admin'"/.test(skeleton),
  '骨架 T2 在管理视图不渲染（管理外壳自带位置，不重复占高）')
ok(/window\.PrivHub\.openAdmin = /.test(skeleton), '保留 openAdmin 入口')
for (const name of ['openAcl', 'openAudit', 'openSettings', 'openTags', 'openTemplate']) {
  ok(new RegExp('window\\.PrivHub\\.' + name + ' = ').test(skeleton), `保留 ${name} 入口`)
}

const manifest = JSON.parse(readFileSync(join(CLIENT, 'manifest.json'), 'utf8'))
ok((manifest.slots || []).includes('admin-console'), '插件 manifest 声明 admin-console slot')
ok((manifest.barItems || []).some((b) => b.view === 'admin' && b.adminOnly),
  '管理控制台图标栏条目为 adminOnly（普通用户看不到管理入口）')

console.log(`\n${'='.repeat(56)}`)
console.log(`  管理控制台回归：${pass} 通过 / ${fail} 失败`)
console.log('='.repeat(56))
process.exit(fail === 0 ? 0 : 1)
