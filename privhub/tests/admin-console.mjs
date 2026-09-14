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
    /** 触发事件（合成一个最小事件对象；preventDefault/stopPropagation 为空实现） */
    dispatch(type, ev) {
      const e = Object.assign({ type, target: this, preventDefault() {}, stopPropagation() {} }, ev || {})
      for (const fn of (this._listeners[type] || []).slice()) fn(e)
      return e
    },
    querySelector() { return null },
    querySelectorAll() { return [] },
    cloneNode() { return makeEl(tag) },
    contains() { return false },
  }
  el.classList._owner = el
  return el
}

const headChildren = []
const documentStub = {
  head: makeEl('head'),
  body: makeEl('body'),
  documentElement: makeEl('html'),
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

/* 假接口：概览面板会并发拉 5 个既有接口。这里给出结构正确的样例数据，
 * 用来验证「有数据时渲染统计卡片」这条真实路径（不访问真实后端）。 */
const API_FIXTURES = {
  '/privhub/api/admin/users': { ok: true, users: [{ username: 'admin' }, { username: 'u1' }], allProjects: ['公共'] },
  '/privhub/api/projects': { ok: true, projects: ['公共', 'A项目'] },
  '/privhub/api/acl/rules': { ok: true, rules: [{ id: 'r1' }] },
  '/privhub/api/audit': { ok: true, entries: [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }] },
  '/privhub/api/trash-list': { ok: true, trash: [] },
  '/privhub/api/publish/list': {
    ok: true,
    publishes: [
      { code: 'c1', project: '公共', path: 'a.html', createdBy: 'admin', expiresAt: 0 },
      { code: 'c2', project: 'A项目', path: 'b.html', createdBy: 'admin', expiresAt: Date.now() + 86400000 },
    ],
  },
}

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
    return API_FIXTURES[path] || { ok: false, error: '测试桩：未提供该接口数据 ' + path }
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
for (const f of ['routes', 'store', 'panelbus', 'confirm', 'toast', 'ui', 'action', 'sidebar', 'topbar', 'breadcrumb', 'sectionheader', 'panels', 'shell', 'index']) {
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
ok(routes.ROUTES.length === 13, `管理路由 13 条（实际 ${routes.ROUTES.length}）`)
ok(routes.hashToKey('#/admin/access/acl') === 'access/acl', '#/admin/access/acl 解析为 access/acl')
ok(routes.hashToKey('#/admin/overview') === 'overview', '#/admin/overview 解析为 overview')
ok(routes.hashToKey('#/admin') === '', '#/admin 归一为空键（落到上次位置/概览）')
ok(routes.hashToKey('#/files') === '', '非管理 hash 不被当成管理路由')
ok(routes.hashToKey('#/admin/access/acl?x=1') === 'access/acl', '带查询串的 hash 也能正确解析')

const model = routes.navModel()
const itemOf = (k) => model.flatMap((g) => g.items).find((i) => i.key === k)
ok(itemOf('access/users').available === true, '声明了 admin 视图 → 用户管理条目可用')
ok(itemOf('access/acl').available === true, '声明了 acl 视图 → ACL 条目可用')
ok(itemOf('ops/audit').available === true, '声明了 audit 视图 → 审计条目可用')
ok(itemOf('overview').available === true, '概览由外壳自渲染 → 恒可用')
ok(itemOf('ops/watermark').available === true && itemOf('ops/watermark').pending === false,
  '水印配置由外壳自渲染（只读面板）→ 可用')

/* 卸载插件后的行为：智能体接入插件消失（视图 'agent' 不再有任何声明），条目应变为「待接入」 */
const removed = barItemsStub.filter((b) => b.view === 'agent')
for (let i = barItemsStub.length - 1; i >= 0; i--) if (barItemsStub[i].view === 'agent') barItemsStub.splice(i, 1)
const afterUnload = routes.navModel().flatMap((g) => g.items).find((i) => i.key === 'access/agents')
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
ok((tree.match(/ad-nav-item(?![\w-])/g) || []).length >= 10, '侧栏渲染出全部管理导航项（' + (tree.match(/ad-nav-item(?![\w-])/g) || []).length + ' 项）')
ok(tree.includes('ad-group-title'), '侧栏渲染出分组标题')
ok(tree.includes('ad-crumb'), '顶部栏渲染出面包屑')
ok(tree.includes('ad-view'), '内容区渲染出视图容器（.ad-view）')

/* 概览页：5 个统计卡片（按接口数据渲染，不是写死的） */
const cardsBox = findByClass(mountHost, 'ad-cards')
const cardCount = cardsBox ? cardsBox.children.filter((c) => String(c.className || '').split(/\s+/).includes('ad-card')).length : 0
ok(cardCount === 5, `概览页渲染出 5 个统计卡片（实际 ${cardCount}）`)
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
ok(cardText.includes('用户 2') && cardText.includes('审计记录 3'),
  '卡片数值来自接口数据（用户 2 / 审计记录 3）')

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

/* ══════════ 8. 交付契约：骨架接线 ══════════ */
console.log('\n── 骨架接线契约 ──')
const skeleton = readFileSync(join(ROOT, 'frontend', 'index.html'), 'utf8')
ok(/slotComps\['admin-console'\]/.test(skeleton), '骨架模板挂载 admin-console slot（否则外壳渲染不出来）')
ok(/:slot-comps="slotComps"/.test(skeleton), '骨架把全部 slot 组件传给外壳（外壳据此渲染各管理页）')
ok(/setActiveView\(v, opts\)/.test(skeleton) && /noToggle/.test(skeleton),
  '骨架 setActiveView 支持 noToggle（管理视图内不 toggle 回文件页）')
ok(/nav\.activeView !== 'admin'/.test(skeleton), 'Esc 回文件视图对管理控制台不生效（弹窗 Esc 不会把人弹出去）')
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
