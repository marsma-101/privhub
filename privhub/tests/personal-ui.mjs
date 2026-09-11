/**
 * 个人空间界面回归（个人空间 v1）
 *
 * 【产品决定】不引入「个人空间」这个概念：人名文件夹在界面上就按【普通文件夹】
 * 显示（用真实姓名当名字），也不加「👤 个人空间」之类的标签或专属文案——
 * 用户明确反馈那种形式"太难看"，并要求"不加个人空间这个概念"。
 * 本测试把这个决定固化为回归断言，防止以后又被改回带标签的形式。
 *
 * 【为什么用真实渲染而不只是静态检查】
 *   本项目模板是字符串（无构建链），模板表达式只能解析【组件实例属性】。
 *   模块级常量写进模板不会报错，只会渲染成空白——正是本项目已知的显示 bug
 *   类型（模板编辑面板 {{date}} 被当插值 → 渲染空白）。因此这里用 Vue 真实
 *   编译器渲染模板并断言渲染出的【文本】，模板引用不存在的名字会直接抛错。
 *
 *   node tests/personal-ui.mjs
 *
 * @module tests/personal-ui
 */

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import vm from 'node:vm'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')

let pass = 0
let fail = 0
const ok = (cond, msg) => {
  if (cond) { pass++; console.log('  ✅ ' + msg) } else { fail++; console.log('  ❌ ' + msg) }
}

/* ================= 1. 在 vm 里加载 Vue ================= */

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', times: '\u00d7', middot: '\u00b7', hellip: '\u2026', mdash: '\u2014' }

function decodeEntities(s) {
  return String(s)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (m, n) => (NAMED[n] !== undefined ? NAMED[n] : m))
}

function makeEl(tag) {
  const el = {
    tagName: String(tag || 'div').toUpperCase(), _html: '', textContent: '', nodeValue: '', style: {},
    children: [], childNodes: [], attrs: {},
    set innerHTML(v) {
      const html = String(v)
      this._html = html
      this.textContent = decodeEntities(html.replace(/<[^>]*>/g, ''))
      this.children = []
      this.childNodes = []
      const tagRe = /<([a-zA-Z][\w-]*)((?:\s+[\w:.-]+\s*=\s*"[^"]*")*)\s*\/?>/g
      let m
      while ((m = tagRe.exec(html)) !== null) {
        const child = makeEl(m[1])
        const attrRe = /([\w:.-]+)\s*=\s*"([^"]*)"/g
        let a
        while ((a = attrRe.exec(m[2] || '')) !== null) child.attrs[a[1]] = decodeEntities(a[2])
        this.children.push(child)
        this.childNodes.push(child)
      }
    },
    get innerHTML() { return this._html },
    setAttribute(k, v) { this.attrs[k] = v },
    getAttribute(k) { return this.attrs[k] ?? null },
    removeAttribute(k) { delete this.attrs[k] },
    appendChild(c) { this.children.push(c); return c },
    removeChild(c) { return c },
    insertBefore(c) { this.children.push(c); return c },
    addEventListener() {}, removeEventListener() {},
    querySelector() { return null }, querySelectorAll() { return [] },
    cloneNode() { return makeEl(tag) }, contains() { return false },
  }
  return el
}

const ctx = {
  console, setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask,
  Promise, Date, Math, JSON, Object, Array, String, Number, Boolean, Error,
  Map, Set, WeakMap, WeakSet, Symbol, RegExp, Function, Buffer,
  document: {
    createElement: makeEl, createTextNode: (t) => ({ textContent: t, nodeValue: t }),
    createComment: () => makeEl(), getElementById: () => null, querySelector: () => null,
    querySelectorAll: () => [], head: makeEl(), body: makeEl(), documentElement: makeEl(),
    addEventListener() {}, removeEventListener() {},
  },
  navigator: { userAgent: 'node' }, location: { href: 'http://localhost/' },
  addEventListener() {}, removeEventListener() {},
}
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx

const vuePath = join(ROOT, 'frontend', 'vue.global.prod.js')
if (!existsSync(vuePath)) { console.error('未找到 ' + vuePath); process.exit(1) }
vm.createContext(ctx)
vm.runInContext(readFileSync(vuePath, 'utf8'), ctx, { filename: 'vue.global.prod.js' })
const Vue = ctx.Vue
globalThis.Vue = Vue
globalThis.document = ctx.document

console.log(`\n── 渲染环境 ──`)
ok(Vue && typeof Vue.compile === 'function', 'Vue 编译器可用（' + (Vue && Vue.version) + '）')

/* ================= 2. 模板抽取与真实渲染 ================= */

/** 取 src 中 marker 之后第一个 `template:` 的模板字符串。 */
function templateAfter(src, marker) {
  const m = src.indexOf(marker)
  if (m < 0) throw new Error('找不到组件标记：' + marker)
  const at = src.indexOf('template:', m)
  if (at < 0) throw new Error(marker + ' 之后找不到 template:')
  let j = at + 'template:'.length
  while (/\s/.test(src[j])) j++
  if (src[j] !== '`') throw new Error(marker + ' 的模板不是模板字符串')
  let k = j + 1, end = -1
  while (k < src.length) {
    if (src[k] === '\\') { k += 2; continue }
    if (src[k] === '`') { end = k; break }
    k++
  }
  if (end < 0) throw new Error(marker + ' 的模板字符串未闭合')
  return src.slice(j + 1, end)
}

/** 渲染模板，返回渲染出的文本与节点。 */
function renderTemplate(src, marker, instance) {
  const tpl = templateAfter(src, marker)
  const errors = []
  const compiled = Vue.compile(tpl, { onError: (e) => errors.push(e.message || String(e)) })
  if (errors.length) throw new Error('模板编译失败：' + errors.join('; '))
  const render = typeof compiled === 'function' ? compiled : compiled.render
  if (typeof render !== 'function') throw new Error('编译未产出渲染函数')
  const out = { text: [], nodes: [] }
  walk(render(instance, []), out)
  return { text: out.text.join(''), nodes: out.nodes }
}

function walk(v, out) {
  if (v == null || v === false || v === true) return
  if (typeof v === 'string' || typeof v === 'number') { out.text.push(String(v)); return }
  if (Array.isArray(v)) { for (const c of v) walk(c, out); return }
  if (typeof v !== 'object') return
  if (v.props) out.nodes.push({ type: v.type, props: v.props })
  const ch = v.children
  if (typeof ch === 'string') out.text.push(ch)
  else if (Array.isArray(ch)) for (const c of ch) walk(c, out)
  else if (ch && typeof ch === 'object') {
    for (const k of Object.keys(ch)) {
      const f = ch[k]
      if (typeof f === 'function') { try { walk(f(), out) } catch { /* 需要真实实例的插槽 */ } }
    }
  }
}

const squash = (s) => String(s).replace(/\s+/g, '')

/* ================= 3. 被测源码 ================= */

const SHELL = readFileSync(join(ROOT, 'plugins', 'privhub-shell', 'client', 'index.js'), 'utf8')
const TREE = readFileSync(join(ROOT, 'plugins', 'privhub-files-explorer-v3', 'client', 'index.js'), 'utf8')
const SKELETON = readFileSync(join(ROOT, 'frontend', 'index.html'), 'utf8')

/**
 * 构造实例上下文；mock 声明的每个名字必须在【真实组件源码】里存在，
 * 否则立即失败——防止 mock 与组件脱节后测试变成假保险。
 */
function instance(src, marker, { data = {}, computed = {}, methods = {} }) {
  const at = src.indexOf(marker)
  if (at < 0) throw new Error('找不到组件：' + marker)
  const rest = src.slice(at)
  const block = (/[\s\S]*?(?=\nconst [A-Z]|\nexport default)/.exec(rest) || [rest])[0]
  const bad = []
  for (const k of [...Object.keys(data), ...Object.keys(computed), ...Object.keys(methods)]) {
    if (!new RegExp('\\b' + k + '\\b').test(block)) bad.push(k)
  }
  if (bad.length) throw new Error(`${marker} 的 mock 声明了源码中不存在的成员：${bad.join(', ')}——mock 已与组件脱节`)
  return { ...data, ...computed, ...methods }
}

const NOOP = () => {}
const NAME = '马泉斌' // 个人空间目录名 = 真实姓名

/** 个人空间在项目列表里与项目混排（可见列表 = 个人空间 + 项目）。 */
const navOf = () => ({ projectsList: [NAME, '公共', 'A项目'], project: NAME, path: '', openProject: NOOP, newProject: NOOP, gotoCrumb: NOOP })
const userOf = (role = 'user') => ({ username: 'maquanbin', displayName: NAME, role, personalDir: NAME })

function welcomeInstance(role = 'user') {
  const nav = navOf()
  return instance(SHELL, 'const WelcomeView', {
    data: { nav, auth: { user: userOf(role) } },
    computed: { isAdmin: role === 'admin', projects: nav.projectsList },
    methods: { openProject: NOOP, newProject: NOOP },
  })
}

function tabsInstance(role = 'user') {
  const nav = navOf()
  return instance(SHELL, 'const ProjectTabs', {
    data: { nav },
    computed: { isAdmin: role === 'admin' },
    methods: { onSelect: NOOP },
  })
}

function treeInstance(role = 'user') {
  const nav = navOf()
  return instance(TREE, 'const TreeV3', {
    data: { nav, store: { newMenu: false } },
    computed: { isAdmin: role === 'admin', rootChildren: [], rootExpanded: false },
    methods: {
      onRootToggle: NOOP, onRootOpen: NOOP, onDelProject: NOOP,
      onCollapseSide: NOOP, onRootDots: NOOP,
    },
  })
}

/* ================= 4. 断言 ================= */

console.log('\n── A 侧栏：个人空间按普通文件夹显示（用真实姓名） ──')
try {
  const t = squash(renderTemplate(SHELL, 'const WelcomeView', welcomeInstance()).text)
  ok(t.includes('📂' + NAME), '个人空间以「📂 真实姓名」形式出现在项目列表里')
  ok(!t.includes('个人空间'), '不出现「个人空间」字样（用户已明确不要这种形式）')
  ok(t.includes('📂公共') && t.includes('📂A项目'), '普通项目照常列出')
  ok(t.includes(NAME), '显示的是真实姓名「' + NAME + '」')
} catch (e) {
  ok(false, 'A 场景渲染失败：' + e.message)
}

console.log('\n── B 顶栏下拉：真实姓名，value 也是真实文件夹名 ──')
try {
  const r = renderTemplate(SHELL, 'const ProjectTabs', tabsInstance())
  const t = squash(r.text)
  ok(t.includes(NAME), '下拉项显示真实姓名')
  ok(!t.includes('个人空间'), '下拉项不出现「个人空间」字样')
  const vals = r.nodes.filter((n) => n.type === 'option').map((o) => String(o.props && o.props.value))
  ok(vals.includes(NAME), '下拉项 value 是真实文件夹名「' + NAME + '」（否则打不开目录）')
  ok(vals.includes('公共'), '普通项目 value 正常')
} catch (e) {
  ok(false, 'B 场景渲染失败：' + e.message)
}

console.log('\n── C 目录树根节点：真实姓名 + 🏠 ──')
try {
  const t = squash(renderTemplate(TREE, 'const TreeV3', treeInstance()).text)
  ok(t.includes('🏠' + NAME), '树根显示「🏠 真实姓名」')
  ok(!t.includes('个人空间'), '树根不出现「个人空间」字样')
} catch (e) {
  ok(false, 'C 场景渲染失败：' + e.message)
}

console.log('\n── D 防回退：界面不得引入个人空间专属标签 ──')
{
  const BANNED = ['PERSONAL_LABEL', 'personalLabel', 'personal-block', 'personal-item', 'personal-hint', 'side-divider', 'isPersonalDir', 'rootIcon']
  for (const [label, src] of [['shell', SHELL], ['explorer-v3', TREE], ['骨架 index.html', SKELETON]]) {
    const found = BANNED.filter((m) => src.includes(m))
    ok(found.length === 0, `${label} 无个人空间专属界面标签残留${found.length ? '（发现：' + found.join(', ') + '）' : ''}`)
  }
}

console.log('\n── D2 防回退：用户可见的界面文案不得出现「个人空间」 ──')
{
  /* 【产品决定】不引入「个人空间」这个概念——人名的文件夹就按普通文件夹/项目对待。
   * 用户明确反馈那种形式"太难看"，并要求"不加个人空间这个概念"。
   * 术语的统一表述留待以后专门处理，但界面文案先清干净。
   * 注意：服务端源码里的注释/内部标识（personalDir 等）属于实现细节，不在本约束内。 */
  const clientFiles = [
    ['auth', join(ROOT, 'plugins', 'privhub-auth', 'client', 'index.js')],
    ['admin', join(ROOT, 'plugins', 'privhub-admin', 'client', 'index.js')],
    ['shell-settings', join(ROOT, 'plugins', 'privhub-shell-settings', 'client', 'index.js')],
    ['shell', join(ROOT, 'plugins', 'privhub-shell', 'client', 'index.js')],
    ['explorer-v3', join(ROOT, 'plugins', 'privhub-files-explorer-v3', 'client', 'index.js')],
    ['骨架 index.html', join(ROOT, 'frontend', 'index.html')],
  ]
  let dirty = []
  for (const [label, file] of clientFiles) {
    const src = readFileSync(file, 'utf8')
    if (src.includes('个人空间')) dirty.push(label)
  }
  ok(dirty.length === 0, `界面文案无「个人空间」字样${dirty.length ? '（仍出现在：' + dirty.join(', ') + '）' : ''}`)
}

console.log('\n── E 通行契约：项目下拉的 value 必须是真实文件夹名 ──')
{
  const blk = templateAfter(SHELL, 'const ProjectTabs')
  ok(/:value="p"/.test(blk), '下拉项 value 绑定真实名 p（不得改成展示用标签）')
  ok(/\{\{\s*p\s*\}\}/.test(blk), '下拉项文本直接渲染 p（真实名）')
}

console.log(`\n${'='.repeat(56)}`)
console.log(`  个人空间界面回归：${pass} 通过 / ${fail} 失败`)
console.log('='.repeat(56))
process.exit(fail === 0 ? 0 : 1)
