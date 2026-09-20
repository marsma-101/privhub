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

import { readFileSync, existsSync, readdirSync } from 'node:fs'
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
const SKELETON = readFileSync(join(ROOT, 'frontend', 'index.html'), 'utf8')

/**
 * explorer-v3 已按职责拆分为多个模块文件（index.js 只做装配）。
 * 断言要跟着拆分走：组件模板去各自模块找，跨文件的整体性检查用合并文本。
 */
const EXPLORER_DIR = join(ROOT, 'plugins', 'privhub-files-explorer-v3', 'client')
const explorerFiles = readdirSync(EXPLORER_DIR).filter((f) => f.endsWith('.js')).sort()
const readExplorer = (name) => readFileSync(join(EXPLORER_DIR, name), 'utf8')
const TREE_TREE = readExplorer('tree.js')      // 目录树组件
const TREE_PANEL = readExplorer('panel.js')    // 中栏面板组件
const TREE_STYLES = readExplorer('styles.js')  // 样式
const TREE_ALL = explorerFiles.map(readExplorer).join('\n')  // 合并文本（整体性检查用）
/* office2 入口源码：F 段与 G 段都要读（原本只在 F 段内声明，G 段要复用故提到这里） */
const o2Src = readFileSync(join(ROOT, 'plugins', 'privhub-files-office2', 'client', 'index.js'), 'utf8')
/* 剥掉注释后的 office2 源码：断言「源码里不再出现某个东西」时必须先剥注释，
 * 否则注释里为说明历史提到它，断言就变成假保险（把代码删了还是绿的）。
 * 注意：行注释的正则要避开字符串里的 "://" 与模板串，否则会把后半份文件当注释吃掉。 */
const stripJsComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').split('\n').map((l) => l.replace(/(^|[^:'"`])\/\/.*$/, '$1')).join('\n')
const o2Bare = stripJsComments(o2Src)

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
  return instance(TREE_TREE, 'const TreeV3', {
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
  const t = squash(renderTemplate(TREE_TREE, 'const TreeV3', treeInstance()).text)
  ok(t.includes('🏠' + NAME), '树根显示「🏠 真实姓名」')
  ok(!t.includes('个人空间'), '树根不出现「个人空间」字样')
} catch (e) {
  ok(false, 'C 场景渲染失败：' + e.message)
}

console.log('\n── D 防回退：界面不得引入个人空间专属标签 ──')
{
  const BANNED = ['PERSONAL_LABEL', 'personalLabel', 'personal-block', 'personal-item', 'personal-hint', 'side-divider', 'isPersonalDir', 'rootIcon']
  for (const [label, src] of [['shell', SHELL], ['explorer-v3', TREE_ALL], ['骨架 index.html', SKELETON]]) {
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

console.log('\n── F 顶栏层数与重叠（用户反馈：三层顶栏、文件名重复、按钮压到 office 工具条）──')
{
  const tpl = templateAfter(TREE_PANEL, 'const PanelV3')
  const o2View = readFileSync(join(ROOT, 'plugins', 'privhub-files-office2', 'client', 'view.html'), 'utf8')
  const o2Js = readFileSync(join(ROOT, 'plugins', 'privhub-files-office2', 'client', 'view.js'), 'utf8')

  // ① 内容区彻底没有顶栏/悬浮条 —— 这是不重叠的根本保证
  ok(!/v3-content-head/.test(tpl), '内容区模板中已无任何工具条元素（不占位即不可能与 office 工具条重叠）')
  ok(!/v3-content-head/.test(TREE_ALL), '样式里也无 .v3-content-head 残留')
  // 只查真实代码用法（选择器/样式规则），注释里提到该名字是为了说明历史，不算引用
  ok(!/querySelector\(['"]\.v3-content-head/.test(o2Src) && !/\.v3-content-head\s*\{/.test(o2Src),
    'office2 不再以 .v3-content-head 为锚点或样式目标（旧锚点，已改 prepend）')

  // ② 操作区与标签同一行，不新增层
  ok(/class="v3-tabrow"/.test(tpl), '存在「标签行」容器（标签栏 + 操作区同一行）')
  ok(/class="v3-tabs"/.test(tpl), '标签栏存在（文件名以此处为唯一出处）')
  ok(/class="v3-tabops"/.test(tpl), '操作区在标签行内（与标签同行，不叠层）')
  /* 标签行切片的边界：到【内容区开头】为止。
   * 旧写法用 indexOf('v3-content') 当边界，而内容区的类现在是宿主状态绑定
   * （:class="contentClass"），模板里不再有那个字面量 —— 边界一旦取不到，
   * 切片会一路吃到内容区，把内容区里的 activeTab.name（图片 alt）误判成
   * “标签行里重复渲染文件名”。这里改用“内容区起始注释”作边界。 */
  const CONTENT_ANCHOR = '<!-- 主区：'
  const rowTpl = tpl.slice(tpl.indexOf('v3-tabrow'), tpl.indexOf(CONTENT_ANCHOR))
  ok(rowTpl.length > 0 && rowTpl.length < tpl.length, '标签行切片边界有效（切不出内容区）')
  ok(!/activeTab\.name/.test(rowTpl), '标签行内不重复渲染文件名（标签本身已显示）')

  // ③ ⋯ 菜单必须承接原先散落的全部功能
  ok(/toggleMenu/.test(tpl) && /class="v3-menu"/.test(tpl), '提供单个 ⋯ 菜单')
  for (const fn of ['previewFontDec', 'previewFontReset', 'previewFontInc', 'menuCloseCurrent', 'menuCloseOthers', 'menuCloseAll', 'menuCopyPath']) {
    ok(tpl.includes(fn), `⋯ 菜单承接了 ${fn}`)
  }
  ok(/detailToggle/.test(tpl), '右侧详情面板仍有一键开关（保留两侧）')
  ok(!/✕ 其他/.test(tpl), '原「✕ 其他」文字按钮已并入 ⋯ 菜单')

  // ④ 菜单不得放进 overflow 容器，否则会被裁掉
  ok(/\.v3-tabops\s*\{[^}]*position:\s*relative/.test(TREE_STYLES), '操作区为定位上下文（菜单锚点）')
  ok(!/\.v3-tabs\s*\{[^}]*position:\s*relative/.test(TREE_STYLES),
    '菜单不挂在 .v3-tabs 上（它 overflow-x:auto，会裁掉下拉）')

  // ⑤ 【第二步 b 改写】office2 已迁到宿主契约（声明式 viewer）。
  //    旧断言锁的是**注入写法**（content.prepend(fresh) / fresh.dataset.v3Injected /
  //    clearOwnFrame）——迁移后必然变红（父级已同意改写）。
  //    用户真正在乎的行为是（浏览器里可肉眼复核，见 docs/reviews/10-…方案.md §9.1 步骤 2/3/6）：
  //      打开 docx → 内容区出现该 viewer；切到非 docx → 内容区不再有该 viewer、锚点为净。
  //    行为验证在下面 H 段（跑 office2 真身）与 J 段（真声明 + 真注册表 + 真会话）；
  //    这里只钉住源码级的**要害**：office2 里不得再出现 document.querySelector('.v3-content')
  //    —— 少一次跨插件 DOM 认领，这才是硬约束 5 的正解。
  ok(/viewers\.register\(/.test(o2Src) && /id:\s*VIEWER_ID/.test(o2Src) && /VIEWER_ID\s*=\s*'privhub-files-office2'/.test(o2Src),
    'office2 向宿主契约登记自己（window.PrivHub.viewers.register，id = privhub-files-office2）')
  ok(/exts:\s*REPLACE_EXTS/.test(o2Src) && /\['\.docx',\s*'\.xlsx'\]/.test(o2Src) && /priority:\s*VIEWER_PRIORITY/.test(o2Src),
    '声明里只报自己的能力（exts = .docx/.xlsx、priority 高于契约默认值），不报「我知道内容区长什么样」')
  ok(!/querySelector\(\s*['"]\.v3-content/.test(o2Bare) && !/\.v3-content/.test(o2Bare),
    '【要害】office2 源码里不再出现 .v3-content：既不查它、也不认领它（迁前那次 document.querySelector 已删除）')
  // 同上，但**连注释也不放过**：本批要求原文就是「office2 里不得再出现 document.querySelector('.v3-content')」，
  // 所以拿原始源码 grep 也必须 0 命中（注释里为讲历史写这一串同样算，换成文字描述即可）。
  ok(!/querySelector\(\s*['"]\.v3-content/.test(o2Src),
    '【要害·加严】office2 整个文件（含注释）grep 不到 querySelector(".v3-content") —— 0 命中')
  ok(!/\bupdate\s*[:(]/.test(o2Bare),
    'office2 声明里不写 update：同类 docx→docx 换文件时由宿主「先收后建」，绝不复用旧 frame 只改 src（旧画面就是这么露出来的）')
  ok(/beforeUnmount\s*\(\)\s*\{[\s\S]{0,200}_stop\(\)/.test(o2Src),
    '组件 beforeUnmount 里 stop()：插件被卸载 → 声明消失 → 零残留')

  // ⑥ office 预览页：iframe 内不重复显示文件名
  ok(/#bar\s+\.fname\s*\{\s*display:\s*none/.test(o2View), 'office 预览页默认隐藏文件名（避免重复）')
  ok(/standalone/.test(o2View) && /standalone/.test(o2Js), '单独打开 office 预览页时仍显示文件名（standalone 兜底）')
}

console.log('\n── G 内容区所有权契约（docx 残留防治，方案 §9.2 A1~A4）──')
{
  const CLIENT = join(ROOT, 'plugins')
  const PANEL = readExplorer('panel.js')                      // 宿主内容区组件
  const TREE_STYLES = readExplorer('styles.js')               // 宿主样式
  /* 遍历所有插件前端源码。断言是“行为向”的：拦的是会伤到用户的行为，
   * 不是“必须调用某个 API”。 */
  function walkJs(dir, out = []) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '_retired-v2') continue
      const p = join(dir, e.name)
      if (e.isDirectory()) walkJs(p, out)
      else if (e.name.endsWith('.js')) out.push(p)
    }
    return out
  }
  const files = walkJs(CLIENT).map((p) => {
    const src = readFileSync(p, 'utf8')
    return { path: p, rel: p.slice(ROOT.length + 1).replace(/\\/g, '/'), src, bare: stripJsComments(src) }
  })
  const rel = (f) => f.rel
  const hasMarker = (src) => /data-v3-injected/.test(src)

  /* A1/A2 合并成一条行为契约：**任何往内容区里注入节点的插件，都必须给节点打归属标记**。
   * 宿主清场只认标记（硬约束 5 的落点）；漏打的插件会重新制造“清了或没清全靠运气”的残留。
   * 两道判据并用，避免单靠正则漏判：
   *   ① 点出别人容器的注入者 —— 认 .v3-content（拿它当插入目标/布局目标）
   *   ② 插入类调用点附近出现 .v3-content —— 只看容器字面量会漏掉变量持有容器的情况
   * [第二步 b 之后的实测] 判据扫出来是**空集**：office2 迁到契约后，全仓再没有一家插件
   * 用「直接写 .v3-content」的写法注入节点。所以这一段的 marker 明细断言当下是空转，
   * 它的价值在于**守卫**：将来谁再用那种写法（或谁把 office2 改回旧路），判据当场把他
   * 扫出来，且必须带归属标记、必须进白名单。上面那条「office2 已不在名单里」是本次改动的正面证据。
   */
  const INJECTOR_TARGETS = [/content\.prepend\(/, /\.v3-content[^\n]*appendChild/, /querySelector\(['"]\.v3-content[^\n]*prepend/]
  /* 已知会动内容区的插件：**空**（第二步 d 之后，跨插件 DOM 认领归零）。
   *   · 第二步 b 之前这里的 office2（唯一「只进不出」的注入者，b 批迁走）；
   *   · 第二步 c 之后 edit-md 也迁走了（改挂宿主给的**编辑舱位** `.v3-editor-host`）；
   *   · 第二步 d 之后最后一家 comments 也迁走了（改由宿主交**渲染根节点引用**，
   *     连同那个盯着别人 DOM 的 MutationObserver 一起删掉）。
   * 名单收敛到空 = 本轮的验收口径本身，下面两条守它的断言（「没有冒出来的新注入者」/
   * 「除已知注入者外没有别家往内容区插节点」）就是「归零」的守门人：
   * 将来谁再按 `.v3-content` 认领别人的容器，判据①/② 当场把他扫出来并让这两条变红。 */
  const KNOWN_INJECTORS = []
  const injectors = new Set()
  // “往别人容器里插东西”的三种写法：a.prepend(x)、a.appendChild(x)、insertAdjacent*。
  const INSERTS = /\.prepend\s*\(|\.appendChild\s*\(|insertAdjacent(HTML|Element|Text)\s*\(/
  for (const f of files) {
    /* 只看**代码**（先剥注释）：注释里为说明历史提到 `.v3-content` 不算认领别人的容器，
     * 否则「在注释里写清为什么不该碰它」反而会把断言弄红（本批踩到过这个坑）。 */
    const src = f.bare
    // 只看“近邻”：命中项附近 400 字符内必须还有插入动作，避免把同文件里无关的
    // createElement / head 上的样式注入误判成对内容区的注入。
    const adjacent = (needle, test) => {
      let at = src.indexOf(needle)
      while (at >= 0) {
        if (test.test(src.slice(Math.max(0, at - 400), at + 400))) return true
        at = src.indexOf(needle, at + 1)
      }
      return false
    }
    /* 判据：① 明确把节点插进 .v3-content 的写法；② 认领/写入别家的容器。
     * 【第二步 b 删掉的一条】旧判据里还有 `/office2-frame/.test(src)` 这条兜底
     * （当时 office2 认领 .v3-content 后自己插 iframe.office2-frame）。office2 迁到
     * 契约后只往宿主给的挂载点里放节点，`office2-frame` 这个类名不再说明任何事——
     * 留着它会把「已经合规的插件」误报成注入者。判据① `/content\.prepend\(/`
     * 本来就覆盖了 office2 迁前的写法（`content.prepend(fresh)`），没有削弱。 */
    if (INJECTOR_TARGETS.some((re) => re.test(src)) ||
        adjacent('.v3-content', INSERTS) ||
        adjacent('.v3-content', /closest\s*\(|replaceChildren/)) {
      if (!/^plugins\/privhub-files-explorer-v3\//.test(f.rel)) injectors.add(f.rel)
    }
  }
  // 明细：注入点必须能看到标记；同时用白名单核对“没有漏掉别家注入者”
  for (const r of injectors) {
    const src = (files.find((f) => f.rel === r) || {}).src || ''
    ok(hasMarker(src), `往内容区注入的插件必须打归属标记：${r}`)
  }
  const unknown = [...injectors].filter((r) => !KNOWN_INJECTORS.includes(r))
  ok(unknown.length === 0, `没有冒出来的新注入者（白名单已收敛为空数组）${unknown.length ? '，多出：' + unknown.join(', ') : ''}`)
  ok(!injectors.has('plugins/privhub-files-office2/client/index.js'),
    '【第二步 b】office2 已不在「往别人容器里注入」的名单里（它只往宿主给的挂载点里放节点）')
  ok(!injectors.has('plugins/privhub-files-edit-md/client/index.js'),
    '【第二步 c】edit-md 已不在「往别人容器里注入」的名单里（它只往宿主给的编辑舱位里放节点）')
  ok(!injectors.has('plugins/privhub-files-comments/client/index.js'),
    '【第二步 d】comments 已不在「往别人容器里注入」的名单里（它只往宿主交来的渲染根里放锚点）')
  /* 「归零」这件事本身：判据扫出来必须是**空集**，白名单也必须是空数组 ——
   * 两条合起来才叫「跨插件 DOM 认领归零」，只看白名单长度会在判据失效时假绿。 */
  ok(injectors.size === 0 && KNOWN_INJECTORS.length === 0,
    `【验收口径·归零】注入者集合与白名单同时为空（实测 injectors=${injectors.size} 家、白名单 ${KNOWN_INJECTORS.length} 条）`
    + (injectors.size ? '｜仍在集合里：' + [...injectors].join(', ') : ''))
  // 反向：不注入的插件不得去写内容区
  const WRITERS = [/\.v3-content[^\n]*appendChild/, /content\.prepend\(/]
  const strays = files
    .filter((f) => !/^plugins\/privhub-files-explorer-v3\//.test(f.rel))
    .filter((f) => !injectors.has(f.rel))
    .filter((f) => WRITERS.some((re) => re.test(f.src)))
    .map(rel)
  ok(strays.length === 0, `除已知注入者（白名单已收敛为空数组）外，没有别家往内容区插节点${strays.length ? '（发现：' + strays.join(', ') + '）' : ''}`)

  /* A4 宿主必须存在交接清理，且**每个内容切换入口**都要走到它 */
  const c = (fn) => new RegExp(fn + '\\s*\\(\\s*\\)').test(PANEL)
  ok(c('clearInjected'), '宿主存在交接清理方法 clearInjected()')
  ok(/['"]store\.activeKey['"]\s*\(\s*\w*\s*\)\s*\{\s*this\.clearInjected\(\)/ .test(PANEL),
    '切标签（store.activeKey 变化）时执行交接清理')
  ok(/['"]store\.content['"]\s*\(\s*n\s*,\s*o\s*\)\s*\{\s*if\s*\(\s*!n\s*\|\|\s*!o\s*\|\|\s*n\.key\s*!==\s*o\.key\s*\)\s*this\.clearInjected\(\)/.test(PANEL),
    '换文件（store.content.key 变化）时执行交接清理')
  ok(/clearInjected\(\)[\s\S]{0,400}data-v3-injected/.test(PANEL) || /data-v3-injected[\s\S]{0,400}clearInjected\(\)/.test(PANEL),
    '清理按归属标记认人（data-v3-injected），不按类名认人')

  /* 不误伤：清理只删带标记的节点，edit-md / comments 的节点必须都没有标记 */
  const editMd = files.find((f) => f.rel === 'plugins/privhub-files-edit-md/client/index.js')
  const comments = files.find((f) => f.rel === 'plugins/privhub-files-comments/client/index.js')
  ok(editMd && !hasMarker(editMd.src), 'edit-md 的节点（.md-inline-root）不带归属标记 → 宿主的清理不会碰它')
  ok(comments && !hasMarker(comments.src), 'comments 的节点（mark 锚点）不带归属标记 → 宿主的清理不会碰它')

  /* A3 插件 CSS 不得用“按别人的后代反查布局”的写法（:has(…)）声称拥有内容区。
   * 这是本次 bug 的放大器：只要外来节点还在，整块布局就一直被劫持。
   * 判据只看**非所有者**的插件文件，且先剥掉注释——注释里为说明历史提到该写法不算引用。 */
  /* 注意：剥行注释要避开 URL 里的 "//"（office2 的 frameUrl 里有 '/privhub-plugins/...'），
   * 否则会把后半份文件当成注释吃掉，断言就变成假通过。 */
  const stripComments = (src) =>
    src.replace(/\/\*[\s\S]*?\*\//g, ' ').split('\n').map((l) => l.replace(/(^|[^:'"`])\/\/.*$/, '$1')).join('\n')
  const hasRe = /\.v3-content\s*:\s*has\s*\(/
  const usingHas = files
    .filter((f) => !/^plugins\/privhub-files-explorer-v3\//.test(f.rel))
    .filter((f) => hasRe.test(stripComments(f.src)))
    .map(rel)
  ok(usingHas.length === 0, `没有任何插件用“反查他人后代”的写法（.v3-content :has）绑架布局${usingHas.length ? '（发现：' + usingHas.join(', ') + '）' : ''}`)
  /* 【第二步 c 改写】所有者自己那 4 处 `:has(.md-inline-root)`（编辑态布局）已收敛：
   * 迁前它是拿**别人的后代**（edit-md 的 .md-inline-root）反查自己的布局，同样属于
   * 「按类名声称拥有内容区」的一半（只是方向相反）。现在编辑态由宿主自己的响应式状态驱动
   * （panel.js 的 editorLayout → `.v3-content--editor`），`:has(` 在宿主样式里归零。 */
  ok(!hasRe.test(stripComments(TREE_STYLES)),
    '【第二步 c】宿主样式里也不再按别人的后代反查布局（:has(.md-inline-root) 归零）')
  ok(/\.v3-content--editor/.test(TREE_STYLES),
    '【第二步 c】编辑态布局改成宿主自己的状态类 .v3-content--editor（宿主的地宿主管）')

  /* A3b 布局开关改由「谁上场」给出（第二步 b）：宿主不再自带插件能力清单。
   * 迁前是宿主硬编码 `ext === '.docx' || ext === '.xlsx'` ⇒ office 布局，
   * 而规则本体写在 office2 注入的 CSS 里（`.v3-content--office`）——
   * 宿主不知道插件能力、插件声称拥有内容区，两头都错。 */
  ok(/v3-content--viewer/.test(PANEL), '宿主提供 viewer 让位布局状态类 .v3-content--viewer')
  ok(/:class="contentClass"/.test(PANEL), '内容区布局类由宿主状态驱动（:class="contentClass"）')
  ok(/v3-content--viewer/.test(TREE_STYLES), '让位布局规则写在宿主自己的样式里（宿主的地宿主管）')
  /* 注意：一律先剥注释——注释里为说明历史写着「迁前是 .v3-content--office」，
   * 那不是代码引用；拿原始源码断会把「写清来历」反而判成没改干净。 */
  ok(!/v3-content--office/.test(stripJsComments(PANEL)) && !/v3-content--office/.test(stripJsComments(TREE_STYLES)) && !/v3-content--office/.test(o2Bare),
    'office 专属的硬编码布局分支已彻底消失（宿主不再知道 .docx/.xlsx 是谁的能力）')
  ok(!/ext\s*===\s*'\.docx'/.test(stripJsComments(PANEL)) && !/ext\s*===\s*'\.xlsx'/.test(stripJsComments(PANEL)),
    '宿主源码里不再硬编码扩展名能力清单（.docx/.xlsx 只出现在插件自己的声明里）')
  ok(/this\.viewerLayout\s*=\s*layoutForAction\(res\.action\)/.test(PANEL),
    '布局状态由 viewer 会话的返回值派生（谁上场谁给：mount/update/reuse 才让位）')
  ok(/contentClass\s*\(\)\s*\{[^}]*viewerLayout/.test(PANEL),
    'contentClass 直接读 viewerLayout（布局状态与「谁上场」是同一条链，不是两套并存的判断）')
}

/* ================= 8. 真实 DOM 级行为检查（不开浏览器，但跑真身代码） =================
 *
 * 判据（方案 §9.1 第 6 步）是“非 docx 时 .v3-content 里的 office2 viewer 数量必须是 0”。
 * 浏览器开不了，但这一条可以在 Node 里用最小 DOM 桩把 office2 的**真身**跑起来观察。
 *
 * 第二步 b 之后 office2 不再自己找容器、不再自己插节点：它只**声明**，由宿主的 viewer
 * 会话负责挂卸。所以分两处验：
 *   H（本段）—— 跑 office2 真身：注册的声明对不对、mount 只往宿主给的挂载点里放、
 *               卸载自己收干净，而且**全程没有碰过 .v3-content**（桩里对选择器留痕）。
 *   J6（下面）—— 把这份真声明喂进**真注册表 + 真会话**，看打开 / 切换 / 关闭时的行为。
 *
 * 断的是**行为**（谁被调用了、锚点里还剩什么节点、有没有查过别人的容器），
 * 不是它内部调用了哪个 API。
 */

/** 把 office2 真身装进最小 DOM 沙箱跑起来（真跑，不是正则猜想）。只跑一次，H 与 J6 共用。 */
let __o2boot = null
function bootOffice2() {
  if (__o2boot) return __o2boot
  const o2Path = join(ROOT, 'plugins', 'privhub-files-office2', 'client', 'index.js')
  const o2Code = readFileSync(o2Path, 'utf8').replace(/export\s+default\s*\{/, 'globalThis.__o2 = {')
  /* --- 最小 DOM 桩：只实现 office2 与宿主会话真正用到的那几件事 --- */
  let idSeq = 0
  const mkNode = (tag, attrs = {}) => {
    const n = {
      tagName: String(tag).toUpperCase(), attrs: { ...attrs }, children: [], parent: null, style: {}, _id: ++idSeq,
      get className() { return this.attrs.class || '' },
      set className(v) { this.attrs.class = v },
      get dataset() {
        const self = this
        return new Proxy({}, {
          set(_t, k, v) { self.attrs['data-' + String(k).replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())] = v; return true },
          get(_t, k) { return self.attrs['data-' + String(k).replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())] },
        })
      },
      setAttribute(k, v) { this.attrs[k] = v },
      getAttribute(k) { return this.attrs[k] === undefined ? null : this.attrs[k] },
      set src(v) { this.attrs.src = v }, get src() { return this.attrs.src },
      set textContent(v) { this.attrs.text = v }, get textContent() { return this.attrs.text || '' },
      set cssText(v) { this.attrs.cssText = v }, get cssText() { return this.attrs.cssText || '' },
      remove() { const i = this.parent ? this.parent.children.indexOf(this) : -1; if (i >= 0) this.parent.children.splice(i, 1); this.parent = null },
      prepend(c) { c.parent = this; this.children.unshift(c) },
      appendChild(c) { c.parent = this; this.children.push(c); return c },
      removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c },
      replaceChildren() { this.children.length = 0 },
      querySelector() { return null },
      querySelectorAll() { return [] },
    }
    return n
  }
  /* 选择器留痕：office2 一旦按别人的容器查过任何东西，这里会记下来（本次改动的要害）。
   * 为了让「查了别人的容器」这件事**跑得下去**（能看见它把节点塞到了哪里），
   * 桩里给 document.querySelector 准备了一个内容区节点；正确的实现根本不会去查它。 */
  const selectors = []
  const contentDecoy = mkNode('div', { class: 'v3-content v3-content--viewer' })
  const stubDoc = {
    createElement: (tag) => mkNode(tag),
    head: mkNode('head'),
    querySelector: (sel) => { selectors.push(String(sel)); return contentDecoy },
    querySelectorAll: (sel) => { selectors.push(String(sel)); return [] },
  }
  /* 假注册表：把 office2 递上来的名片收下来；契约标记与真注册表一致，
   * 这样「插件当场喊错」那条防呆分支不会误触发。 */
  let decl = null
  let stopCalls = 0
  const fakeRegistry = {
    __isViewerRegistry: true,
    register(d) { decl = d; return () => { stopCalls++; decl = null } },
  }
  const errs = []
  const box = {
    console: { log: NOOP, warn: NOOP, error: (...a) => errs.push(a.map(String).join(' ')) },
    encodeURIComponent, Proxy, Object, Array, String, Number, RegExp, Error, TypeError, Date, Math, JSON, Map, Set,
    document: stubDoc,
    window: { PrivHub: { viewers: fakeRegistry } },
  }
  box.globalThis = box; box.self = box
  vm.createContext(box)
  vm.runInContext(o2Code, box, { filename: 'office2/client/index.js' })
  const mod = box.globalThis.__o2
  const component = mod.slots['office-editor']
  const inst = {}
  component.mounted.call(inst)           // ← 真跑 mounted()：插件在这里递名片
  __o2boot = {
    mod, component, inst, mkNode, selectors, errs, decoy: contentDecoy,
    decl: () => decl,
    stopCalls: () => stopCalls,
    initialDecl: decl,
  }
  return __o2boot
}

console.log('\n── H 契约接入：office2 只声明、只往挂载点里放、卸载自己收（跑真身，最小 DOM 桩）──')
try {
  const o2 = bootOffice2()
  const decl = o2.decl()
  ok(o2.errs.length === 0, 'office2 mounted() 里没有任何报错（契约在，插件不喊冤）' + (o2.errs.length ? '：' + o2.errs.join(' | ') : ''))
  ok(decl && typeof decl === 'object', 'office2 真身在沙箱里跑了起来，并向契约递交了声明（不是正则猜想，是真跑）')

  // ① 声明的形状：报的是「我能开哪类文件」，不是「我知道内容区长什么样」
  ok(decl && decl.id === 'privhub-files-office2', '声明 id = privhub-files-office2（全局唯一，惯例用插件 id）')
  ok(decl && decl.exts.join(',') === '.docx,.xlsx', '声明 exts = [.docx, .xlsx]（只报自己认领的扩展名）')
  ok(decl && decl.priority === 200, '声明 priority = 200（高于契约默认 100）')
  ok(decl && typeof decl.mount === 'function' && typeof decl.update === 'undefined',
    '声明里没有 update：同类 docx→docx 换文件交给宿主「先收后建」，绝不复用旧 frame 只改 src')

  // ② mount 只往宿主给的挂载点里放（绝不碰 .v3-content）
  const hostEl = o2.mkNode('div', { class: 'v3-viewer-host', 'data-viewer': 'none' })
  const before = o2.selectors.length
  const cleanup = decl.mount(hostEl, { project: 'P', path: 'a b.docx', name: 'a b.docx', key: 'P|a b.docx', ext: '.docx' })
  ok(hostEl.children.length === 1 && hostEl.children[0].tagName === 'IFRAME',
    `mount 只往宿主给的挂载点里放了 1 个 iframe（实测挂载点子节点 ${hostEl.children.length} 个）`)
  const frame = hostEl.children[0] || null
  ok(!!frame && frame.parent === hostEl && frame.className === 'office2-frame',
    '这个 iframe 的父节点就是挂载点本身（不是 .v3-content，也不是别人的节点）')
  ok(!!frame && /^\/privhub-plugins\/privhub-files-office2\/view\.html\?project=P&path=a%20b\.docx&name=a%20b\.docx$/.test(frame.src),
    'iframe 指向本插件的预览页，且 project / path / name 都正确编码（实测：' + (frame ? frame.src : '(挂载点里没有 iframe)') + '）')
  ok(typeof cleanup === 'function', 'mount 返回了清理函数（卸载时由宿主调它，插件自己收）')
  ok(o2.selectors.slice(before).every((sel) => !/v3-content/.test(sel)),
    '【要害】mount 全程没有按 .v3-content 查过任何东西（本插件不再认领别人的容器）'
    + (o2.selectors.slice(before).length ? '｜实测查过：' + o2.selectors.slice(before).join(' , ') : '｜实测查询次数 0'))
  ok(o2.decoy.children.length === 0,
    '那个「别人的容器」（.v3-content）一个节点都没多（本插件没有往里面塞任何东西）')
  // ③ 卸载：自己收干净，节点不留、锚点归位由宿主负责
  cleanup()
  ok(hostEl.children.length === 0, `卸载后挂载点里一个节点都不剩（实测 ${hostEl.children.length}）`)
  ok(!!frame && frame.parent === null, '被摘掉的 iframe 已经和 DOM 断开（不是「隐藏起来假装卸载」）')

  // ④ 每次 mount 都现造新节点（不复用旧 frame ⇒ 没有上一个文件的画面可露）
  const h2 = o2.mkNode('div', { class: 'v3-viewer-host', 'data-viewer': 'none' })
  const f1 = decl.mount(h2, { project: 'P', path: 'a.docx', name: 'a.docx', key: 'k1', ext: '.docx' })
  const node1 = h2.children[0]
  f1()
  const f2 = decl.mount(h2, { project: 'P', path: 'b.docx', name: 'b.docx', key: 'k2', ext: '.docx' })
  const node2 = h2.children[0]
  ok(node1 !== node2 && node1.src !== node2.src && node1.parent === null,
    '同类换文件时换的是**新节点**（旧节点已脱离 DOM：只改 src 才会在导航期继续显示上一个文件的画面）')
  f2()

  // ⑤ 插件被卸载 → 声明消失 → 零残留
  o2.component.beforeUnmount.call(o2.inst)
  ok(o2.stopCalls() === 1 && o2.decl() === null,
    '组件 beforeUnmount 里 stop()：声明从注册表消失（卸载 = 删目录 → 不再注册 → 零残留）')
} catch (e) {
  ok(false, 'H 场景执行失败：' + e.message + '\n' + (e.stack || ''))
}

/* ================= 9. 宿主的交接清理（跑真身 clearInjected，最小 DOM 桩） =================
 *
 * H 证的是“插件自己会收”；这一段证的是**宿主换内容时会清场**——两者是不同的防线，
 * 都要有。判据就是方案 §9.1 第 6 步：非 docx 时 `.v3-content > iframe.office2-frame`
 * 数量必须是 0；顺带证“只清带标记的节点”，edit-md / comments 的节点一个不动。
 */
console.log('\n── I DOM 级行为：宿主交接清场只清带归属标记的节点（跑真身 clearInjected）──')
try {
  const panelSrc = readFileSync(join(ROOT, 'plugins', 'privhub-files-explorer-v3', 'client', 'panel.js'), 'utf8')
  const at = panelSrc.indexOf('clearInjected() {')
  const bodyStart = panelSrc.indexOf('{', at + 'clearInjected()'.length)
  let depth = 0, end = -1
  for (let i = bodyStart; i < panelSrc.length; i++) {
    if (panelSrc[i] === '{') depth++
    else if (panelSrc[i] === '}') { depth--; if (depth === 0) { end = i; break } }
  }
  ok(at > 0 && end > at, '在宿主源码里定位到 clearInjected() 真身')
  const fn = vm.runInNewContext('(function ' + panelSrc.slice(at + 'clearInjected'.length, end + 1) + ')',
    { console, Object, Array, String, Number, RegExp, Error, HOST_SELECTOR: '.v3-viewer-host' })
  ok(typeof fn === 'function', '宿主 clearInjected() 真身已取出（真跑，不是正则猜想）')

  /* --- 同一套最小 DOM 桩（与上一段同构） --- */
  const nodes = []
  let idSeq = 0
  const mk = (tag, attrs = {}) => {
    const n = {
      tagName: String(tag).toUpperCase(), attrs: { ...attrs }, children: [], parent: null, style: {}, _id: ++idSeq,
      get className() { return this.attrs.class || '' }, set className(v) { this.attrs.class = v },
      get dataset() {
        const self = this
        return new Proxy({}, {
          set(_t, k, v) { self.attrs['data-' + String(k).replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())] = v; return true },
          get(_t, k) { return self.attrs['data-' + String(k).replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())] },
        })
      },
      remove() { const i = this.parent ? this.parent.children.indexOf(this) : -1; if (i >= 0) this.parent.children.splice(i, 1); this.parent = null },
      appendChild(c) { c.parent = this; this.children.push(c); return c },
      /* 真身用 n.closest('.v3-viewer-host') 判断「这个节点是不是 viewer 的私有财产」。
       * 桩按类名往上找祖先——只覆盖这一种选择器，不为通用性实现整个选择器引擎。 */
      closest(sel) {
        const want = String(sel).replace(/^\./, '')
        let p = this.parent
        while (p) { if (String(p.attrs.class || '').split(/\s+/).includes(want)) return p; p = p.parent }
        return null
      },
      // 站在“节点视角”的查询：在本节点子树里找（真身用的是 content.querySelectorAll）
      querySelectorAll(sel) {
        const hit = []
        const walk = (n) => { for (const c of n.children) { if (reMatch(c, sel)) hit.push(c); walk(c) } }
        walk(this)
        return hit
      },
      querySelector(sel) { return this.querySelectorAll(sel)[0] || null },
    }
    nodes.push(n)
    return n
  }
  const all = () => nodes
  const reMatch = (node, sel) => {
    sel = sel.trim()
    if (sel === '[data-v3-injected]') return !!node.attrs['data-v3-injected']
    return sel.split(',').map((s) => s.trim()).some((s) => {
      if (/^\.v3-md$/.test(s)) return String(node.attrs.class || '').split(/\s+/).includes('v3-md')
      if (/^\.v3-text$/.test(s)) return String(node.attrs.class || '').split(/\s+/).includes('v3-text')
      return false
    })
  }
  const doc = {
    querySelectorAll: (sel) => all().filter((n) => reMatch(n, sel)),
    querySelector: (sel) => all().find((n) => reMatch(n, sel)) || null,
  }
  // 真身通过 this.$el.querySelector('.v3-content') 定位内容区
  const content = mk('div', { class: 'v3-content v3-content--viewer' })
  const el = { querySelector: (sel) => (sel === '.v3-content' ? content : null) }
  // 内容区里的住户：① office2 的**老路**残留（带标记、直接挂在内容区上）
  //               ② 宿主自己的 md / pdf ③ 别家的节点 ④ 迁到契约后的 viewer（在锚点内部）
  const markedOne = mk('iframe', { class: 'office2-frame', 'data-v3-injected': 'privhub-files-office2' })
  const markedTwo = mk('iframe', { class: 'office2-frame', 'data-v3-injected': 'privhub-files-office2' })
  const unmarkedFrame = mk('iframe', { class: 'v3-pdf' })                       // 宿主自己的 PDF 预览
  const mdNode = mk('div', { class: 'v3-md' })
  mdNode.style.display = 'none'                                                  // 上一次 office 预览留下的隐藏
  const foreign = mk('div', { class: 'md-inline-root' })                         // edit-md 的编辑器
  const markNode = mk('mark', { class: 'v3-cmt' })                               // comments 的批注锚点
  // ④ 挂载锚点 + 里面正在上班的 viewer（第二步 b 起 office2 就住在这里）
  const hostAnchor = mk('div', { class: 'v3-viewer-host', 'data-viewer': 'privhub-files-office2' })
  const liveFrame = mk('iframe', { class: 'office2-frame', 'data-v3-injected': 'privhub-files-office2' })
  hostAnchor.appendChild(liveFrame)
  for (const c of [markedOne, markedTwo, unmarkedFrame, mdNode, foreign, markNode, hostAnchor]) content.appendChild(c)

  fn.call({ $el: el })

  const frames = content.children.filter((c) => c.tagName === 'IFRAME' && String(c.attrs.class || '').includes('office2-frame'))
  ok(frames.length === 0, `清场后 .v3-content > iframe.office2-frame 数量为 0（实际 ${frames.length}，判据①要求 0）`)
  ok(content.children.filter((c) => c.attrs['data-v3-injected']).length === 0,
    '清场后内容区再无任何带归属标记的残留节点')
  ok(content.children.includes(foreign), 'edit-md 的 .md-inline-root 被保留（清理没误伤别家节点）')
  ok(content.children.includes(markNode), 'comments 的 mark 锚点被保留（清理没误伤别家节点）')
  ok(content.children.includes(unmarkedFrame), '宿主自己的 .v3-pdf iframe 被保留（不带标记就不会被清）')
  ok(mdNode.style.display === '', '上一次 office 预览留下的内联隐藏被还原（否则 md 预览再也显示不出来）')
  /* 【第二步 b 新增】锚点内部的节点是 viewer 的私有财产：宿主不能顺手删掉正在上班的 viewer。
   * 迁后 office2 的 iframe 就住在锚点里、且自带归属标记 —— 少了这条跳过，
   * 宿主每次换内容都会把在岗的 viewer 删掉（画面当场空白）。 */
  ok(content.children.includes(hostAnchor) && hostAnchor.children.includes(liveFrame) && liveFrame.parent === hostAnchor,
    '锚点内部带归属标记的 viewer 被保留（宿主清场跳过挂载点内部，不误杀在岗的 viewer）')

  /* 空内容区 / 没有内容区时不得抛错（插件先卸载、内容区后消失这类时序） */
  let threw = ''
  try { fn.call({ $el: null }); fn.call({}) } catch (e) { threw = e.message }
  ok(threw === '', '没有内容区时 clearInjected() 安全退出（不抛错）' + (threw ? '：' + threw : ''))
} catch (e) {
  ok(false, 'I 场景执行失败：' + e.message)
}

/* ================= 10. 内容区 viewer 契约（第二步 a：注册表 + 挂载锚点 + 挂/卸生命周期） =====
 *
 * 本批立的规矩（方案 §6）：**宿主当老板，插件递名片**。
 * 插件只声明「我能开哪类文件」，由宿主决定「现在该谁上场」，并负责挂载、卸载、清场。
 *
 * 为什么全部在 Node 里验：仓库里没有任何浏览器测试（方案 §9 自陈）。
 * 但契约是纯逻辑，可以用最小 DOM 桩把 **viewers.js 与 tabs.js 的真身**跑起来观察行为，
 * 而不是拿正则猜代码。断的是行为（谁被调用了、什么顺序、锚点里还剩什么），不是写法。
 *
 * ⚠ 浏览器里才能验的那件事（「同类切换不白闪」的**肉眼观感**）本测试证明不了，
 *   见方案 §9.2 末段；本段只证「不该重建的没重建、不该留的没留」。
 */
console.log('\n── J 内容区 viewer 契约（注册表 / 锚点 / 挂卸生命周期，跑真身）──')
try {
  /* --- 把 viewers.js 真身装进最小 VM：剥掉 import/export，注入 bus / store / window --- */
  const vwSrc = readExplorer('viewers.js')
  const stripMod = (s) => s
    .replace(/^import[\s\S]*?from\s*'[^']*'\r?\n/gm, '')
    .replace(/^export\s*\{[\s\S]*?\}\s*$/m, '')
  const vwLogs = []
  const vwConsole = { log: NOOP, warn: NOOP, error: (...a) => { vwLogs.push(a.map(String).join(' ')) } }
  const vwBox = {
    console: vwConsole, Date, Math, JSON, Object, Array, String, Number, Boolean, Error, TypeError,
    Map, Set, WeakMap, RegExp, Promise,
    bus: { on: () => () => {} },
    store: { activeKey: '' },
    window: { PrivHub: {} },
  }
  vwBox.globalThis = vwBox
  vm.createContext(vwBox)
  vm.runInContext(
    stripMod(vwSrc) + '\nglobalThis.__vw = { createRegistry, installViewerRegistry, createViewerSession, HOST_SELECTOR, VIEWER_NONE, normExt, extOfName }',
    vwBox, { filename: 'explorer-v3/client/viewers.js' })
  const V = vwBox.__vw
  const PANEL2 = readExplorer('panel.js')
  ok(V && typeof V.createRegistry === 'function' && typeof V.createViewerSession === 'function' && typeof V.createViewerSession === 'function',
    'viewers.js 真身已在沙箱中取出（真跑，不是正则猜想）')

  /* --- 最小挂载点桩：只会 appendChild / replaceChildren / dataset.viewer --- */
  const mkHost = () => {
    const h = {
      tagName: 'DIV', children: [], attrs: { 'data-viewer': 'none' }, parent: null,
      get firstChild() { return this.children[0] || null },
      appendChild(c) { c.parent = this; this.children.push(c); return c },
      removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parent = null; return c },
      replaceChildren() { for (const c of this.children) c.parent = null; this.children.length = 0 },
      get dataset() {
        const self = this
        return new Proxy({}, {
          set(_t, k, v) { self.attrs['data-' + String(k).replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())] = v; return true },
          get(_t, k) { return self.attrs['data-' + String(k).replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())] },
        })
      },
    }
    return h
  }
  const tabOf = (name, project = 'P', dir = '') => ({
    key: project + '|' + (dir ? dir + '/' + name : name),
    project, path: dir ? dir + '/' + name : name, name, kind: 'office',
  })
  const readyOf = (t) => ({ key: t.key, state: 'ready' })
  const useRegistry = (reg) => { vwBox.window.PrivHub.viewers = reg; return reg }

  /* ---- J1 契约存在且形状正确：能注册 / 能解析 / 能注销 ---- */
  ok(vwBox.window.PrivHub.viewers && vwBox.window.PrivHub.viewers.__isViewerRegistry === true && vwBox.window.PrivHub.viewers === V.installViewerRegistry(),
    '模块加载即建立注册表，且只此一份（window.PrivHub.viewers，重复安装返回同一实例）')
  {
    const reg = V.createRegistry()
    const stop = reg.register({ id: 'probe-a', exts: ['.DOCX', ' xlsx '], priority: 10, mount() { return null } })
    ok(typeof stop === 'function', 'register 返回注销函数（插件在 beforeUnmount 里调它）')
    ok(reg.resolve('docx') && reg.resolve('.DOCX') && reg.resolve('a.docx') === null,
      'resolve 按扩展名解析且大小写/前缀都归一（resolve("docx") 命中；resolve("a.docx") 不命中——它不是文件名解析器）')
    ok(reg.resolve('xlsx') && reg.resolve('xlsx').id === 'probe-a', '声明里的扩展名同样归一（" xlsx " → .xlsx）')
    const l = reg.list()
    ok(l.length === 1 && l[0].id === 'probe-a' && l[0].exts.join() === '.docx,.xlsx' && typeof l[0].mount === 'undefined',
      'list() 给出只读快照（含 id/exts/priority，不含 mount）')

    const thrown = (fn) => { try { fn(); return '' } catch (e) { return String(e.message || e) } }
    ok(/id/.test(thrown(() => reg.register({ exts: ['.a'], mount() {} }))), '缺 id 当场抛错（不静默降级）')
    ok(/exts/.test(thrown(() => reg.register({ id: 'probe-b', mount() {} }))), '缺 exts 当场抛错')
    ok(/mount/.test(thrown(() => reg.register({ id: 'probe-b', exts: ['.a'] }))), '缺 mount 当场抛错')
    ok(/priority/.test(thrown(() => reg.register({ id: 'probe-b', exts: ['.a'], priority: 'high', mount() {} }))), 'priority 不是数字当场抛错')
    ok(/重复注册/.test(thrown(() => reg.register({ id: 'probe-a', exts: ['.a'], mount() {} }))),
      '同一个 id 重复注册当场抛错（多半意味着上一次 register 的返回值没在 beforeUnmount 里调用）')
    ok(reg.unregister('probe-a') === true && reg.resolve('.docx') === null && reg.list().length === 0,
      'unregister 之后解析不到（注销契约：声明消失 = 能力消失）')
    ok(reg.unregister('probe-a') === false, '重复 unregister 幂等返回 false（不抛错，便于清理代码无脑调用）')
  }
  {
    const r = V.createRegistry()
    r.register({ id: 'low', exts: ['.docx'], priority: 100, mount() {} })
    r.register({ id: 'high', exts: ['.docx'], priority: 200, mount() {} })
    ok(r.resolve('.docx').id === 'high', '同一扩展名多家声明时 priority 大的先赢')
    const r2 = V.createRegistry()
    r2.register({ id: 'first', exts: ['.docx'], mount() {} })
    r2.register({ id: 'second', exts: ['.docx'], mount() {} })
    ok(r2.resolve('.docx').id === 'first', '同优先级时【先注册的先赢】（显式定序，不给文件系统顺序留后门）')
  }

  /* ---- J2 无声明时回退老路（本批一个插件都没注册，这就是常态路径） ---- */
  {
    const reg = useRegistry(V.createRegistry())
    const ses = V.createViewerSession()
    const host = mkHost()
    const t = tabOf('a.md')
    const input = () => ({ host, tab: t, content: readyOf(t) })
    ok(ses.sync(input()).action === 'fallback', '没有任何声明时 viewer 不上场（回退老路）')
    ok(host.children.length === 0 && host.attrs['data-viewer'] === 'none',
      '无声明时挂载点保持空、标签为 none（宿主自己的 md/text/image/pdf 分支照跑，锚点等于不存在）')

    const made = []
    const stop = reg.register({
      id: 'probe-md', exts: ['.md'], mount(h) { const n = { tag: 'FAKE' }; made.push('mount'); h.appendChild(n); return () => { made.push('cleanup'); h.removeChild(n) } },
    })
    ok(ses.sync(input()).action === 'mount' && host.children.length === 1 && host.attrs['data-viewer'] === 'probe-md',
      '有声明时该 viewer 上场（挂进宿主给的锚点，锚点打上 viewer id）')
    stop()
    ok(ses.sync(input()).action === 'unmount' && host.children.length === 0 && host.attrs['data-viewer'] === 'none',
      '【回退老路】注册后再注销 → viewer 被卸掉、锚点清空、标签归位（假 viewer 注销后老路必须恢复）')
    ok(made.join(',') === 'mount,cleanup', '收回老路时走的是 viewer 自己的 cleanup（不是宿主硬删节点）' + '｜实测：' + made.join(','))
  }

  /* ---- J3 同类切换复用、异类切换换 viewer（先卸后挂） ---- */
  {
    const reg = useRegistry(V.createRegistry())
    const calls = []
    const A = {
      id: 'viewer-A', exts: ['.docx'],
      mount(h, ctx) { calls.push('A.mount:' + ctx.key); const n = { tag: 'A' }; h.appendChild(n); return () => { calls.push('A.cleanup'); h.removeChild(n) } },
      update(h, ctx) { calls.push('A.update:' + ctx.key) },
    }
    const B = {
      id: 'viewer-B', exts: ['.md'],
      mount(h, ctx) { calls.push('B.mount:' + ctx.key); const n = { tag: 'B' }; h.appendChild(n); return () => { calls.push('B.cleanup'); h.removeChild(n) } },
    }
    reg.register(A); reg.register(B)
    const ses = V.createViewerSession()
    const host = mkHost()
    const syn = (t) => ses.sync({ host, tab: t, content: readyOf(t) })

    const a1 = tabOf('a.docx'); const a2 = tabOf('b.docx'); const m1 = tabOf('c.md')
    ok(syn(a1).action === 'mount' && calls.join(',') === 'A.mount:P|a.docx', '异类从零上场：mount 一次')
    syn(a2)
    ok(calls.filter((c) => c.startsWith('A.update')).length === 1 && calls.filter((c) => c === 'A.mount:P|b.docx').length === 0 && calls.filter((c) => c === 'A.cleanup').length === 0,
      '【同类切换 = 复用】docx→docx 走 update()：不卸载、不重建、没有第二次 mount' + '｜实测：' + calls.join(' , '))
    const before = calls.length
    ok(syn(a2).action === 'reuse' && calls.length === before,
      '【同文件重复同步 = 完全不动】reactivity 多触发几次也不会白闪（没有任何 DOM 动作）')
    const n1 = calls.length
    ok(syn(m1).action === 'mount' && host.children.length === 1 && host.attrs['data-viewer'] === 'viewer-B',
      '【异类切换 = 换 viewer】锚点里只剩新 viewer 一个（同一时刻只有一个 viewer 活着）')
    ok(calls.slice(n1).join(',') === 'A.cleanup,B.mount:P|c.md',
      '【先卸旧的、再挂新的】顺序可复核' + '｜实测：' + calls.slice(n1).join(' , '))
    ok(ses.current() && ses.current().host === host && ses.current().id === 'viewer-B',
      '挂载点元素本身从头到尾是同一个（宿主不重建锚点 = 中间没有空窗）')
    const n2 = calls.length
    syn(a1)
    ok(calls.slice(n2).join(',') === 'B.cleanup,A.mount:P|a.docx', '再切回去同样先卸后挂' + '｜实测：' + calls.slice(n2).join(' , '))
    ses.dispose()
    ok(host.children.length === 0 && host.attrs['data-viewer'] === 'none' && calls[calls.length - 1] === 'A.cleanup',
      'dispose（面板卸载/内容区销毁）时存量 viewer 被收干净 —— 第一步那个残留 bug 的另一个入口也堵上')
  }

  /* ---- J4 顺序准绳：卸载 viewer 必须晚于「切标签前的静默保存」 ---- */
  {
    /* J4-a 源码级：tabs.js 三个切换入口都在改 activeKey 之前 emit md:interrupt */
    const tabsSrc = readExplorer('tabs.js')
    const bodyOf = (name) => {
      const at = tabsSrc.indexOf('function ' + name + '(')
      const end = tabsSrc.indexOf('\n}', at)
      return at >= 0 && end > at ? tabsSrc.slice(at, end) : ''
    }
    const orderOk = []
    for (const fn of ['openTab', 'activateTab', 'closeTab']) {
      const b = bodyOf(fn)
      const e = b.indexOf("bus.emit('md:interrupt'")
      // 只认【赋值】：`store.activeKey === key` 这种比较不算变更（closeTab 里先有一处比较）
      const a = b.search(/store\.activeKey\s*=(?!=)/)
      orderOk.push(e >= 0 && a >= 0 && e < a)
    }
    ok(orderOk.every(Boolean), 'tabs.js：openTab / activateTab / closeTab 都在改 store.activeKey【之前】emit md:interrupt（保存意图先于挂载点变更）')

    /* J4-b 行为级（更强）：真跑 tabs.js，用【同步观察者】看两件事的先后。
     * 同步观察者 = 最坏情形（等价于宿主把 watcher 改成 flush:'sync'）：
     * 只要这个顺序成立，卸载（由 activeKey 变更驱动）就必然晚于保存意图。 */
    const utilsSrc = readExplorer('utils.js')
    const events = []
    const storeStub = new Proxy({ tabs: [
      { key: 'P|a.docx', project: 'P', path: 'a.docx', name: 'a.docx', kind: 'office' },
      { key: 'P|b.md', project: 'P', path: 'b.md', name: 'b.md', kind: 'md' },
    ], activeKey: 'P|a.docx', content: { key: 'P|a.docx', state: 'ready' } }, {
      set(t, k, v) { if (k === 'activeKey') events.push('activeKey变更'); t[k] = v; return true },
    })
    const tBox = {
      console, Date, Math, JSON, Object, Array, String, Number, Boolean, Error, RegExp, Map, Set, Promise,
      nav: {}, AUTH: { user: null },
      bus: { emit: (ev) => events.push(ev) },
      store: storeStub,
      loadContent: NOOP,
    }
    tBox.globalThis = tBox
    vm.createContext(tBox)
    vm.runInContext(
      stripMod(utilsSrc) + '\n' + stripMod(tabsSrc) + '\nglobalThis.__tabs = { openTab, activateTab, closeTab }',
      tBox, { filename: 'explorer-v3/client/tabs.js' })
    const T = tBox.__tabs
    ok(T && typeof T.activateTab === 'function', 'tabs.js 真身已在沙箱中取出（真跑，不是正则猜想）')

    /* 判据统一：以「同步观察者眼里两件事的先后」为准（末尾的 v3:tab-opened 之类不算数） */
    const saveBeforeKey = () => {
      const i = events.indexOf('md:interrupt')
      const j = events.indexOf('activeKey变更')
      return i >= 0 && j >= 0 && i < j
    }
    events.length = 0
    T.activateTab('P|b.md')
    ok(saveBeforeKey(),
      '【顺序准绳·行为】真跑 activateTab：md:interrupt（静默保存）排在 activeKey 变更【之前】' + '｜实测顺序：' + events.join(' → '))
    events.length = 0
    T.openTab({ name: 'c.md', isDir: false }, 'P', '')
    ok(saveBeforeKey(),
      '【顺序准绳·行为】真跑 openTab：同样是保存意图先、挂载点变更后' + '｜实测顺序：' + events.join(' → '))
    events.length = 0
    T.closeTab(storeStub.activeKey)
    ok(saveBeforeKey(), '【顺序准绳·行为】真跑 closeTab：关闭激活标签前同样先发保存意图' + '｜实测顺序：' + events.join(' → '))

    /* J4-c 宿主侧：watcher 不得改成 flush:'sync'（那会让 panel.js 的 nav.path 那条路径当场倒挂） */
    const stripCmt = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').split('\n').map((l) => l.replace(/(^|[^:'"`])\/\/.*$/, '$1')).join('\n')
    ok(!/flush\s*:\s*'sync'/.test(stripCmt(PANEL2)),
      "宿主的内容切换 watcher 不得用 flush:'sync'（panel.js:nav.path 里 activeKey 置空写在 emit 之前，sync 会当场倒挂）")
    ok(/['"]store\.activeKey['"]\(\w*\)\s*\{\s*this\.clearInjected\(\);\s*this\.syncViewer\('activeKey'\)/.test(PANEL2),
      'activeKey 变化 → 触发 viewer 生命周期（钩子点 H2 就挂在 watcher 上）')
    ok(/['"]store\.content['"]\(n, o\)\s*\{[^\n]*this\.syncViewer\('content'\)/.test(PANEL2),
      'content 变化 → 触发 viewer 生命周期')
    ok(/this\._viewerSession\.dispose\('teardown'\)/.test(PANEL2),
      '面板 beforeUnmount 时把存量 viewer 收干净（内容区整体消失也是卸载入口）')

    /* J4-d 运行时自检：倒挂必须被抓出来（这条同时是「检查器本身是活的」的阴性对照） */
    const probeViewer = (id) => ({
      id, exts: ['.docx'],
      mount(h, ctx) { h.appendChild({ tag: id }); return () => { h.children.length = 0 } },
    })
    const reg = useRegistry(V.createRegistry())
    reg.register(probeViewer('probe-order'))
    const ses = V.createViewerSession()
    const host = mkHost()
    const a = tabOf('a.docx'); const m = tabOf('b.md')
    vwBox.store.activeKey = a.key
    ses.sync({ host, tab: a, content: readyOf(a) })
    const sceneOk = !!ses.current()
    reg.noteSaveIntent()                                        // ← 保存意图（tabs.js 时序：改 activeKey 之前发）
    vwBox.store.activeKey = m.key
    ses.sync({ host, tab: m, content: readyOf(m) })
    const okLog = reg.lifecycle.log()
    ok(sceneOk && !ses.current() && okLog.some((e) => e.kind === 'mount') && okLog.some((e) => e.kind === 'unmount'),
      '顺序正确的场景真的跑起来了（有 viewer 上场、也被卸掉 —— 断言不是空转）')
    ok(reg.lifecycle.checkOrder().length === 0 && vwLogs.length === 0,
      '顺序正确时 checkOrder() 零违规、控制台零报错')

    const regBad = useRegistry(V.createRegistry())
    regBad.register(probeViewer('probe-order-bad'))
    const sesBad = V.createViewerSession()
    const hostBad = mkHost()
    vwBox.store.activeKey = a.key
    sesBad.sync({ host: hostBad, tab: a, content: readyOf(a) })
    const badMounted = !!sesBad.current()
    const vwBefore = vwLogs.length
    vwBox.store.activeKey = ''                                   // ← 先动手：挂载点已变更（模拟 flush:'sync' + panel.js:nav.path 的写法）
    sesBad.sync({ host: hostBad, tab: null, content: null })      // ← 卸载跑到了保存意图之前
    regBad.noteSaveIntent()                                      // ← 保存意图来晚了
    const bad = regBad.lifecycle.checkOrder()
    ok(badMounted && bad.length === 1 && bad[0].key === a.key,
      '【阴性对照·内建】把顺序倒过来（先卸后存）→ checkOrder() 必须报出 1 条违规' + '｜实测：' + JSON.stringify(bad))
    ok(vwLogs.length > vwBefore && /顺序契约被破坏/.test(vwLogs[vwLogs.length - 1]),
      '倒挂会当场 console.error 大喊（本项目的老病正是「连错了不吭声」）')

    /* J4-e 顺序不变式不得误伤既有路径：不发 md:interrupt 的收起（如「关闭全部标签」）不算违规 */
    const reg2 = useRegistry(V.createRegistry())
    const ses2 = V.createViewerSession()
    const host2 = mkHost()
    vwBox.store.activeKey = a.key
    ses2.sync({ host: host2, tab: a, content: readyOf(a) })
    vwBox.store.activeKey = ''
    ses2.sync({ host: host2, tab: null, content: null })          // 没有任何 save-intent
    ok(reg2.lifecycle.checkOrder().length === 0,
      '没有任何保存意图的收起路径（menuCloseAll / 切视图）不报违规（不变式只查「倒挂」，不查「有没有发过保存」）')
  }

  /* ---- J5 锚点与老路：宿主模板一字未动自己的渲染分支 ---- */
  {
    ok(/class="v3-viewer-host"\s+data-viewer="none"/.test(PANEL2),
      '内容区里有宿主创建的挂载锚点 .v3-viewer-host（插件只拿这个 div，不再认 .v3-content）')
    ok(/querySelector\(HOST_SELECTOR\)/.test(PANEL2) && !/createElement\([^)]*\)[\s\S]{0,60}v3-viewer-host/.test(PANEL2),
      '宿主只【查】锚点、不动态造锚点（锚点由模板创建与销毁）')
    ok(/closest\(HOST_SELECTOR\)/.test(PANEL2),
      'clearInjected 跳过挂载点内部（那是 viewer 的私有财产，由它自己的 cleanup 收；宿主不能顺手删掉在岗的 viewer）')
    ok(/content\.markdown !== undefined/.test(PANEL2) && /content\.text !== undefined/.test(PANEL2) &&
       /class="v3-pdf"/.test(PANEL2) && /class="v3-img"/.test(PANEL2),
      '宿主自己的 md / text / image / pdf 渲染分支照旧（回退老路 = 这些分支一条都没动）')
    ok(!/viewers/.test(SKELETON),
      '契约不在骨架里：frontend/index.html 一字未动（不新增插槽、不改布局、不改图标栏）')
    ok(/viewers\.js/.test(readExplorer('index.js')),
      '契约模块登记在插件装配入口的模块清单里（改哪块只碰哪个文件）')
  }

  /* ---- J6 真身接入（第二步 b）：office2 的真声明 + 真注册表 + 真会话 ----
   * 这是本批最要紧的一段：不再是假 viewer，而是把 H 段跑出来的**office2 真声明**
   * 注册进**真注册表**、喂给**真会话**，看「打开 docx / 同类切换 / 切到 md / 切到 png /
   * 插件注销」五种情形下锚点里到底剩什么。
   * 它对应方案 §9.1 的判据：打开 docx 出现 viewer、切到非 docx 后 viewer 数量为 0。 */
  {
    const o2 = bootOffice2()
    const declO2 = o2.initialDecl
    ok(declO2 && declO2.id === 'privhub-files-office2', '拿到 office2 的真声明（H 段跑出来的同一份，不是测试自己捏的）')

    const reg = useRegistry(V.createRegistry())
    const stopO2 = reg.register(declO2)
    ok(reg.resolve('.docx') === declO2 && reg.resolve('.XLSX') === declO2 && reg.resolve('.docx').id === 'privhub-files-office2',
      '真注册表按扩展名解析到 office2 的声明（大小写与前缀都归一：.docx / .XLSX 都命中）')

    const ses = V.createViewerSession()
    const host = mkHost()
    const framesIn = () => host.children.filter((c) => c.tagName === 'IFRAME')
    const docxA = tabOf('a.docx'); const docxB = tabOf('b.docx')
    const mdTab = tabOf('c.md'); const pngTab = tabOf('d.png')

    ok(ses.sync({ host, tab: docxA, content: readyOf(docxA) }).action === 'mount' && framesIn().length === 1,
      '【判据】打开 docx → viewer 上场：宿主给的锚点里出现 1 个 iframe（实测 ' + framesIn().length + ' 个）')
    const f1 = framesIn()[0]
    ok(f1 && host.attrs['data-viewer'] === 'privhub-files-office2' && f1.attrs['data-v3-injected'] === 'privhub-files-office2',
      '锚点打上了 viewer 身份（data-viewer）且这个 iframe 自报归属（插件不再需要宿主按类名认人）')
    ok(f1 && f1.parent === host, 'iframe 的父节点是宿主的挂载点（不是内容区本身）')

    /* 同类切换：office2 **没有**声明 update ⇒ 宿主走「先收后建」 */
    const r2 = ses.sync({ host, tab: docxB, content: readyOf(docxB) })
    const f2 = framesIn()[0]
    ok(r2.action === 'mount' && framesIn().length === 1 && f2 && f2 !== f1 && f1.parent === null,
      '【同类切换不露旧画面】docx→docx：不声明 update ⇒ 宿主在同一锚点里「先收后建」，换的是**新节点**'
      + '（实测 action=' + r2.action + '，锚点内 ' + framesIn().length + ' 个 iframe，新旧节点 ' + (f1 === f2 ? '同一个' : '不同') + '）')
    ok(o2.stopCalls() === 1, '这一段里 office2 的 stop() 只在 H 段被调过一次（J6 用的是同一份真声明，没有再注册一遍）')

    ok(ses.sync({ host, tab: mdTab, content: readyOf(mdTab) }).action === 'unmount' && framesIn().length === 0 && host.attrs['data-viewer'] === 'none',
      '【判据】切到 md → viewer 被卸掉、锚点为净（实测 iframe ' + framesIn().length + ' 个，data-viewer=' + host.attrs['data-viewer'] + '）')
    ok(host.children.length === 0, '切走后锚点里一个节点都不剩（残留无从谈起）')

    ok(ses.sync({ host, tab: pngTab, content: readyOf(pngTab) }).action === 'fallback' && host.children.length === 0,
      '切到 png（无任何声明的类型）→ 回退老路，锚点仍为空（图片走宿主自己的 img 分支）')

    /* 插件注销 = 删插件目录：老路必须完整恢复 */
    stopO2()
    ok(ses.sync({ host, tab: docxA, content: readyOf(docxA) }).action === 'fallback' && host.children.length === 0,
      'office2 注销（卸载插件）→ .docx 回退老路（内容区显示宿主的 Markdown 提取预览），零残留')
    ses.dispose()
  }

  /* ---- J7 布局状态「谁上场谁给」（第二步 b）：跑 panel.js 的 layoutForAction 真身 ----
   * 宿主不再硬编码 ['docx','xlsx'] 能力清单，而是按 viewer 会话的返回值决定是否让位。
   * 这里把那两个真身（常量 + 函数）从 panel.js 里取出来跑，断的是**映射行为**。 */
  {
    const stageSrc = /const VIEWER_ON_STAGE_ACTIONS = \{[^}]*\}/.exec(PANEL2)
    const lfaSrc = /function layoutForAction\(action\)\s*\{[\s\S]*?\n\}/.exec(PANEL2)
    ok(stageSrc && lfaSrc, '在宿主源码里定位到布局派生的真身（VIEWER_ON_STAGE_ACTIONS + layoutForAction）')
    const layoutForAction = vm.runInNewContext(
      '(function(){' + stageSrc[0] + '\n' + lfaSrc[0] + '\nreturn layoutForAction})()',
      { Object, Array, String, Number, RegExp, Error })
    ok(typeof layoutForAction === 'function', 'layoutForAction 真身已取出（真跑，不是正则猜想）')
    const onStage = ['mount', 'update', 'reuse']
    ok(onStage.every((a) => layoutForAction(a) === 'viewer'),
      'viewer 在场上（mount / update / reuse）→ 内容区整块让给它｜实测：' + onStage.map((a) => a + '=' + (layoutForAction(a) || '(空)')).join(' '))
    const offStage = ['fallback', 'unmount', 'no-host', 'mount-error']
    ok(offStage.every((a) => layoutForAction(a) === ''),
      '没有 viewer 在场（fallback / unmount / no-host / mount-error）→ 普通布局，宿主自己的分支照跑｜实测：'
      + offStage.map((a) => a + '=' + (layoutForAction(a) || '(空)')).join(' '))
    /* 与真实会话对齐：上面 J6 里实测到的 action 恰好落在这两组里 */
    ok(layoutForAction('mount') === 'viewer' && layoutForAction('fallback') === '',
      'J6 实测到的两种 action（打开 docx = mount、切到 png = fallback）分别落在「让位 / 不让位」两侧')
  }
} catch (e) {
  ok(false, 'J 场景执行失败：' + e.message + '\n' + (e.stack || ''))
}

/* ================= 11. 编辑舱位与静默保存（第二步 c） =================
 *
 * 本批治的是「插件伸手进宿主的内容区」：edit-md 的四处越权（查别人的容器 / 隐藏别人的节点 /
 * 清理别人的节点 / teleport 进别人的容器）全部改成走宿主给的**编辑舱位**。
 * 判据分两层：
 *   ① 源码级：edit-md 里不得再出现宿主的内容区容器（连注释也不许有）；
 *   ② 行为级：把 **edit-md 真身 + panel.js 的真身方法 + 真的 viewers 顺序流水** 放进同一个
 *      沙箱，跑一次「编辑中 → 切标签」，看「数据捕获 / 发出保存 / 编辑态退场」三件事的先后。
 *   ③ 顺带补一条**所有前端模块都必须能解析**的体检（第二步 b 在这里漏过一次，见 L 段）。
 */
console.log('\n── K 编辑舱位：插件不再伸手进宿主的内容区（第二步 c）──')
let kDone = null
{
  const MD_PATH = join(ROOT, 'plugins', 'privhub-files-edit-md', 'client', 'index.js')
  const MD_SRC = readFileSync(MD_PATH, 'utf8')
  const MD_BARE = stripJsComments(MD_SRC)
  const PANEL_K = readExplorer('panel.js')
  const STYLES_K = readExplorer('styles.js')

  /* ---- K1 源码级：要害（含注释也不许有）+ 「能不能内嵌」由宿主作答 + 布局状态归宿主 ---- */
  const DOCK = '.v3-editor-host'
  const dockDecl = /const EDITOR_SELECTOR = '([^']+)'/.exec(PANEL_K)
  ok(!!dockDecl && dockDecl[1] === DOCK,
    '宿主声明编辑舱位选择器 EDITOR_SELECTOR = ' + DOCK + '（实测：' + (dockDecl ? dockDecl[1] : '(没找到)') + '）')
  ok(new RegExp('<div class="' + DOCK.slice(1) + '"></div>').test(PANEL_K),
    '舱位由宿主模板创建/销毁（内容区里那个 ' + DOCK + ' div），插件只往它里面放节点')
  ok(/<teleport[^>]*\sto="\.v3-editor-host"/.test(MD_SRC),
    '【要害】edit-md 的 teleport 目标是宿主给的编辑舱位 ' + DOCK + '（不再挂到别人的容器上）')
  ok(!/\.v3-content(?![\w-])/.test(MD_BARE),
    '【要害】edit-md 的代码里不再认领宿主的内容区容器（剥注释后 0 命中）')
  ok(!/querySelector\(\s*['"]\.v3-content/.test(MD_SRC),
    '【要害·加严】edit-md 整个文件（含注释）grep 不到 querySelector(".v3-content") —— 0 命中')
  ok(!/to\s*=\s*["']\.v3-content["']/.test(MD_SRC),
    '【要害·加严】edit-md 整个文件（含注释）grep 不到 teleport to=".v3-content" —— 0 命中')
  ok(!/document\.querySelector\(/.test(MD_BARE),
    'edit-md 不再从整个文档里查任何东西（自己的节点一律 this.$el，别家的一律不问）')
  ok(!/\.v3-md|\.v3-text/.test(MD_BARE),
    'edit-md 不再按类名去隐藏/还原宿主的只读预览节点（.v3-md / .v3-text）——改由宿主的编辑态布局负责')
  ok(/bus\.emit\(EVENT_ASK/.test(MD_BARE) && /bus\.on\(EVENT_SAY/.test(MD_BARE),
    '「现在能不能内嵌」由插件经 bus **问宿主**（不再用「别人的 DOM 非空」当判据）')
  ok(/bus\.on\('v3:editor-host-ask',\s*\(p\)\s*=>\s*\{\s*bus\.emit\('v3:editor-host',\s*this\.editorHostInfo\(p\)\)/.test(PANEL_K),
    '宿主同步作答：收到 v3:editor-host-ask 就回 v3:editor-host { available, key, selector }')
  ok(/contentLiveKey\(\)\s*\{[\s\S]{0,220}c\.key\s*===\s*t\.key/.test(PANEL_K),
    '宿主的可用性判据取自**自己的状态**（内容区承载的就是这个文件），不查别人的 DOM')
  ok(/this\.\$el\.querySelector\(EDITOR_SELECTOR\)/.test(PANEL_K),
    '宿主自己查自己的舱位（this.$el + EDITOR_SELECTOR），不是插件去查')
  ok(/bus\.on\('v3:editor-state'[\s\S]{0,80}setEditorLayout\(p\)/.test(PANEL_K),
    '插件报「编辑态开/关」→ 宿主写布局状态')
  ok(/editorLayout: ''/.test(PANEL_K), '编辑态布局状态写进**响应式 data**（editorLayout），不在 computed 里现问')
  ok(/if\s*\(this\.editorLayout === 'editor'\)\s*cls\.push\('v3-content--editor'\)/.test(PANEL_K),
    'contentClass 由 editorLayout 派生（宿主给自己的容器下规矩）')
  ok(/\.v3-content--editor/.test(STYLES_K) && !/:\s*has\s*\(/.test(stripJsComments(STYLES_K)),
    '宿主样式里编辑态挂在**自己的状态类** .v3-content--editor 上，`:has(别人的后代)` 已归零')
  ok(/bus\.on\('md:editor-lifecycle'[\s\S]{0,90}noteEditorLifecycle\(p\)/.test(PANEL_K),
    '宿主把插件报来的「数据捕获 / 编辑态退场」记进顺序流水（noteEditorLifecycle）')
  ok(/reg\._note\(p\.kind, \{ key, id/.test(PANEL_K),
    '顺序流水用的是 viewers.lifecycle 那一份（与 viewer 的挂载/卸载同一条链）')
  /* 契约模块一个字节都没动（本批不扩契约） */
  ok(/EDITOR_SELECTOR/.test(PANEL_K) && !/EDITOR_SELECTOR/.test(readExplorer('viewers.js')),
    '编辑舱位不进 viewers.js 契约（它是宿主的第二个锚点，不是 viewer 契约的扩展）')

  /* ---- K2 行为级：同一个沙箱里跑真身 ---- */
  const stripModK = (s) => s
    .replace(/^import[\s\S]*?from\s*'[^']*'\r?\n/gm, '')
    .replace(/^export\s*\{[\s\S]*?\}\s*$/m, '')
  /** 从 panel.js（已剥注释）里取一个方法的真身源码，供 vm 里真跑。 */
  const methodSrc = (src, name) => {
    const start = src.indexOf('\n    ' + name + '(')
    if (start < 0) throw new Error('panel.js 里找不到方法 ' + name)
    const at = src.indexOf(name + '(', start)
    const brace = src.indexOf('{', at)
    let depth = 0, end = -1
    for (let i = brace; i < src.length; i++) {
      if (src[i] === '{') depth++
      else if (src[i] === '}') { depth--; if (depth === 0) { end = i; break } }
    }
    if (end < 0) throw new Error('方法 ' + name + ' 的括号没配平')
    return src.slice(at, end + 1)
  }

  const events = []       // 综合顺序流水（本测试自己记，逐条同步）
  const apiCalls = []
  const toasts = []
  const errs = []
  const sandboxErrors = []
  const pending = []      // 被挂住的 PUT（用于「回包晚于下一轮编辑」场景）
  let holdPuts = false
  let docReply = { ok: true, doc: '# A\n\n旧正文', mtime: 111 }
  let putReply = { ok: true, mtime: 222 }
  let previewReply = { ok: true, type: 'text', data: 'plain text' }
  let textReply = { ok: true }

  const apiStub = (url, opts) => {
    const u = String(url)
    const method = (opts && opts.method) || 'GET'
    const body = opts && opts.body ? JSON.parse(opts.body) : null
    events.push('api:' + method)
    apiCalls.push({ url: u, method, body })
    if (method === 'PUT' && holdPuts) {
      return new Promise((res) => { pending.push({ res, body, url: u }) })
    }
    if (method === 'PUT') return Promise.resolve(putReply)
    if (u.includes('/api/text/save')) return Promise.resolve(textReply)
    if (u.includes('/api/doc')) return Promise.resolve(docReply)
    if (u.includes('/api/preview')) return Promise.resolve(previewReply)
    return Promise.resolve({ ok: true })
  }

  const kbus = (() => {
    const l = {}
    return {
      on(ev, fn) { (l[ev] = l[ev] || []).push(fn); return () => kbus.off(ev, fn) },
      off(ev, fn) { const a = l[ev]; const i = a ? a.indexOf(fn) : -1; if (i >= 0) a.splice(i, 1) },
      emit(ev, ...args) {
        for (const fn of (l[ev] || []).slice()) {
          try { fn(...args) } catch (e) { sandboxErrors.push(ev + '：' + (e && e.message)) }
        }
      },
      _listeners(ev) { return (l[ev] || []).length },
    }
  })()

  /* key 口径取宿主自己的实现（utils.js 的 tabKey 真身），测试不另造一套 */
  const tabKeySrc = /const tabKey = \(project, path\) => [^\n]*/.exec(readExplorer('utils.js'))
  const tabKey = tabKeySrc ? vm.runInNewContext('(function(){' + tabKeySrc[0] + '; return tabKey})()', {}) : null
  if (!tabKey) throw new Error('utils.js 里找不到 tabKey 真身')
  ok(tabKey('P', 'a/b.md') === 'P|a/b.md', 'key 口径取宿主真身（utils.js 的 tabKey）：' + tabKey('P', 'a/b.md'))

  const K = {
    console: { log: NOOP, warn: NOOP, error: (...a) => { errs.push(a.map(String).join(' ')) } },
    document: {
      getElementById: () => null, createElement: () => ({}),
      querySelector: () => null, querySelectorAll: () => [],
      head: { appendChild: () => {} }, body: { appendChild: () => {} },
    },
    TextEncoder, Date, Math, JSON, Object, Array, String, Number, Boolean, Error, TypeError,
    RegExp, Promise, Map, Set, Symbol, Proxy, queueMicrotask,
    confirm: () => { events.push('confirm'); return false },
    setTimeout: () => 0,
    bus: kbus,
    tabKey,
    EDITOR_SELECTOR: dockDecl ? dockDecl[1] : '',
    store: { activeKey: '', content: null },
    window: null,
  }
  K.globalThis = K
  K.self = K
  K.window = { PrivHub: { api: apiStub, bus: kbus, nav: { project: 'P', path: '' }, AUTH: { user: { username: 'u', role: 'admin', projects: ['P'] }, token: 't' }, toast: (m, k) => { toasts.push({ m, k }) } } }
  vm.createContext(K)
  vm.runInContext(stripModK(readExplorer('viewers.js')) + '\nglobalThis.__vwK = { createRegistry, createViewerSession }', K, { filename: 'viewers.js' })
  ok(!!K.__vwK, 'viewers.js 真身装进 K 沙箱（顺序流水用真注册表，不是测试自己捏的）')

  /* panel.js 五个真身方法 + contentClass（computed）取出来，跑在同一个沙箱里 */
  const PANEL_BARE = stripJsComments(PANEL_K)
  const fns = {}
  for (const name of ['contentLiveKey', 'editorHostInfo', 'syncEditorHost', 'setEditorLayout', 'noteEditorLifecycle', 'contentClass']) {
    fns[name] = vm.runInContext('(' + 'function ' + methodSrc(PANEL_BARE, name) + ')', K)
  }
  ok(Object.values(fns).every((f) => typeof f === 'function'),
    '宿主真身方法全部取出（contentLiveKey / editorHostInfo / syncEditorHost / setEditorLayout / noteEditorLifecycle / contentClass）')

  const dock = { className: 'v3-editor-host' }
  let dockPresent = true
  const host = {
    activeTab: null, _editorHostKey: undefined, editorLayout: '',
    $el: { querySelector: (sel) => (sel === K.EDITOR_SELECTOR && dockPresent ? dock : null) },
    viewerLayout: '',
  }
  for (const [k, f] of Object.entries(fns)) host[k] = f
  /* 宿主面板 mounted() 里那三行接线（与源码逐字对应，行为上真接上） */
  kbus.on('v3:editor-host-ask', (p) => { kbus.emit('v3:editor-host', host.editorHostInfo(p)) })
  kbus.on('v3:editor-state', (p) => { host.setEditorLayout(p) })
  kbus.on('md:editor-lifecycle', (p) => { host.noteEditorLifecycle(p) })

  const showFile = (project, path) => {
    const key = tabKey(project, path)
    K.store.activeKey = key
    K.store.content = { key, state: 'ready' }
    host.activeTab = { key, project, path, name: path.split('/').pop(), kind: 'md' }
  }
  const hideContent = () => {
    K.store.activeKey = ''
    K.store.content = null
    host.activeTab = null
  }

  /* edit-md 真身进沙箱：剥掉 default export，暴露组件 */
  vm.runInContext(
    MD_SRC.replace(/export\s+default\s*\{/, 'globalThis.__mdExport = {') + '\n;globalThis.__md = { MdEditor };\n',
    K, { filename: 'edit-md/client/index.js' })
  const md = K.__md
  ok(md && md.MdEditor && md.MdEditor.methods && md.MdEditor.data,
    'edit-md 真身在 K 沙箱里跑了起来（真跑组件代码，不是正则猜想）')

  /* 造一个组件实例：方法直接挂在实例上（this === inst），data() 给初值，$nextTick/$el 用桩 */
  const ticks = []
  const inst = Object.assign({}, md.MdEditor.methods, md.MdEditor.data())
  inst.$nextTick = (fn) => { ticks.push(fn) }
  inst.$el = { querySelector: () => null }
  Object.defineProperty(inst, 'canEdit', { configurable: true, get() { return inst.canEditProject(inst.project) } })
  let openVal = false
  Object.defineProperty(inst, 'open', {
    configurable: true,
    get() { return openVal },
    set(v) { openVal = v; events.push('open=' + v) },
  })
  const intBefore = kbus._listeners('md:interrupt')   // viewers.js 自己那条「保存意图」监听已在此
  const sayBefore = kbus._listeners('v3:editor-host')
  md.MdEditor.mounted.call(inst)
  ok(kbus._listeners('md:interrupt') === intBefore + 1 && kbus._listeners('v3:editor-host') === sayBefore + 1,
    '组件 mounted() 接上了两条线：md:interrupt（退场）与 v3:editor-host（舱位没了）')

  const reg = K.window.PrivHub.viewers
  const logOf = (kind) => reg.lifecycle.log().filter((e) => e.kind === kind)
  const orderIn = (list, a, b) => {
    const i = list.findIndex((x) => x === a)
    const j = list.findIndex((x) => x === b)
    return i >= 0 && j >= 0 && i < j
  }

  kDone = (async () => {
    /* ---- K2-1 内嵌编辑可用：宿主作答 → 挂进舱位 → 报编辑态 ---- */
    showFile('P', 'a.md')
    host.syncEditorHost('mount')
    docReply = { ok: true, doc: '# A\n\n旧正文', mtime: 111 }
    await inst.openEditor({ entry: { name: 'a.md', isDir: false }, project: 'P', path: '' }, true)
    ok(inst.mode === 'inline' && inst.open === true && inst.doc === '# A\n\n旧正文',
      '打开 md → 进内嵌编辑态（宿主说舱位可用 ⇒ mode=inline，正文已载入）')
    ok(!!inst._session && inst._session === 1, '编辑会话号已建立（_session=' + inst._session + '，用于拦住上一轮的回包）')
    ok(host.editorLayout === 'editor' && /v3-content--editor/.test(host.contentClass()),
      '编辑态已开 → 宿主布局状态变成 editor，内容区类含 v3-content--editor（实测：' + host.contentClass() + '）')

    /* ---- K2-2 切标签：数据捕获 / 发出保存 / 编辑态退场 的先后 ---- */
    inst.doc = '# A\n\n改了三个字'
    inst.onSrcInput()
    ok(inst.dirty === true, '输入后进入未保存状态（这一步是后面所有断言的场景前提）')

    reg.lifecycle.clear()
    events.length = 0
    kbus.emit('md:interrupt', {})          // 真身 tabs.js 的时序：改 activeKey 之前先发
    showFile('P', 'b.md')                  // ……emit 之后才换激活标签
    host.syncEditorHost('activeKey')
    ok(orderIn(events, 'api:PUT', 'open=false'),
      '【第一优先·丢内容】发出保存排在编辑态退场【之前】（实测顺序：' + events.join(' → ') + '）')
    const life = reg.lifecycle.log()
    const seq = (k) => (life.find((e) => e.kind === k) || {}).seq
    ok(orderIn(life.map((e) => e.kind), 'save-intent', 'save-capture') &&
       orderIn(life.map((e) => e.kind), 'save-capture', 'editor-close'),
      '【顺序流水可复核】保存意图 → 数据捕获 → 编辑态退场（实测 kind 顺序：' + life.map((e) => e.kind).join(' → ') + '）')
    ok(seq('save-intent') < seq('save-capture') && seq('save-capture') < seq('editor-close') && seq('editor-close') > 0,
      '流水号递增确认「捕获早于卸载」：intent seq=' + seq('save-intent') + '、capture seq=' + seq('save-capture') + '、close seq=' + seq('editor-close'))
    ok(reg.lifecycle.checkOrder().length === 0, 'viewers 的顺序不变式（先卸后存）零违规')
    const capEntry = life.find((e) => e.kind === 'save-capture')
    ok(capEntry && capEntry.key === 'P|a.md' && capEntry.id === 'privhub-files-edit-md',
      '捕获那一笔按宿主自己的口径记了 key（实测：' + (capEntry ? capEntry.key + ' / ' + capEntry.id : '(没有)') + '）')
    const putA = apiCalls.filter((c) => c.method === 'PUT').pop()
    ok(putA && putA.body.path === 'a.md' && /改了三个字/.test(putA.body.doc),
      '【捕获的就是要写盘的那份】PUT 的 path 与正文都取自快照（实测 path=' + (putA ? putA.body.path : '(无)') + '）')
    ok(inst.open === false && inst.mode === 'float', '退场后编辑态关闭（open=false / mode=float）')
    ok(host.editorLayout === '', '退场后宿主布局状态归位（不留半截编辑态布局）')
    ok(sandboxErrors.length === 0 && errs.length === 0, '整个场景没有异常与 console.error' + (sandboxErrors.length || errs.length ? '：' + sandboxErrors.concat(errs).join(' | ') : ''))

    /* ---- K2-3 回包落在「下一轮编辑」之后：不得污染新一轮（静默丢字的那条路） ---- */
    holdPuts = true
    showFile('P', 'a.md')
    host.syncEditorHost('content')
    docReply = { ok: true, doc: '# A v2', mtime: 333 }
    await inst.openEditor({ entry: { name: 'a.md', isDir: false }, project: 'P', path: '' }, true)
    inst.doc = '# A v2 又改了'
    inst.onSrcInput()
    kbus.emit('md:interrupt', {})              // a 的保存发出，但被挂住（网络慢）
    showFile('P', 'b.md'); host.syncEditorHost('activeKey')
    const aPut = pending[pending.length - 1]
    docReply = { ok: true, doc: '# B 的正文', mtime: 555 }
    await inst.openEditor({ entry: { name: 'b.md', isDir: false }, project: 'P', path: '' }, true)
    inst.doc = '# B 用户刚输入'
    inst.onSrcInput()
    const bDirty = inst.dirty
    aPut.res({ ok: true, mtime: 999 })          // ← a 的回包姗姗来迟
    await new Promise((r) => setImmediate(r))
    await new Promise((r) => setImmediate(r))
    ok(inst.path === 'b.md' && inst.doc === '# B 用户刚输入' && inst.baseMtime === 555,
      '【静默丢字·修掉的那条路】上一轮的回包不写回新一轮：编辑器仍是 B 的正文（实测 doc=' + JSON.stringify(inst.doc) + '、baseMtime=' + inst.baseMtime + '）')
    ok(inst.dirty === bDirty && inst.dirty === true,
      '新一轮的「未保存」标记不被上一轮的成功回包清掉（实测 dirty=' + inst.dirty + '）')
    ok(aPut.body.path === 'a.md' && /A v2 又改了/.test(aPut.body.doc),
      'a 的正文按 a 的路径写（实测 path=' + aPut.body.path + '）')
    holdPuts = false

    /* ---- K2-4 宿主收走舱位 = 编辑器必须退场，且退场前先捕获保存 ---- */
    showFile('P', 'c.md')
    host.syncEditorHost('content')
    docReply = { ok: true, doc: '# C', mtime: 777 }
    await inst.openEditor({ entry: { name: 'c.md', isDir: false }, project: 'P', path: '' }, true)
    inst.doc = '# C 未保存的改动'
    inst.onSrcInput()
    const beforeClose = apiCalls.filter((c) => c.method === 'PUT').length
    kbus.emit('v3:editor-host', { available: false, key: '', selector: DOCK, reason: 'activeKey' })
    ok(inst.open === false, '宿主收走舱位 → 编辑器当场退场（不然 teleport 会攥着已销毁的目标）')
    ok(apiCalls.filter((c) => c.method === 'PUT').length === beforeClose + 1,
      '退场之前先把保存发出去了（实测新增 PUT ' + (apiCalls.filter((c) => c.method === 'PUT').length - beforeClose) + ' 次）')
    ok(/未保存的改动/.test(apiCalls.filter((c) => c.method === 'PUT').pop().body.doc),
      '发出去的正是那份未保存的正文')
    /* 「回答问题」不是「收走舱位」：问一次不能把正在编辑的东西关掉 */
    showFile('P', 'd.md'); host.syncEditorHost('content')
    docReply = { ok: true, doc: '# D', mtime: 888 }
    await inst.openEditor({ entry: { name: 'd.md', isDir: false }, project: 'P', path: '' }, true)
    kbus.emit('v3:editor-host', { available: false, key: '', selector: DOCK, reason: 'ask' })
    ok(inst.open === true, '宿主对「能不能内嵌」的否定回答（reason=ask）不会关掉正在编辑的东西')
    kbus.emit('md:interrupt', {})

    /* ---- K2-5 静默保存失败必须说出来（不能静默） ---- */
    toasts.length = 0
    holdPuts = true
    docReply = { ok: true, doc: '# E', mtime: 901 }
    showFile('P', 'e.md'); host.syncEditorHost('content')
    await inst.openEditor({ entry: { name: 'e.md', isDir: false }, project: 'P', path: '' }, true)
    inst.doc = '# E 未保存'
    inst.onSrcInput()
    kbus.emit('md:interrupt', {})
    const ePut = pending[pending.length - 1]
    docReply = { ok: true, doc: '# F', mtime: 950 }
    showFile('P', 'f.md'); host.syncEditorHost('activeKey')    // 新一轮编辑：失败回包落在别的会话上
    await inst.openEditor({ entry: { name: 'f.md', isDir: false }, project: 'P', path: '' }, true)
    ePut.res({ ok: false, error: '磁盘满了' })
    await new Promise((r) => setImmediate(r))
    await new Promise((r) => setImmediate(r))
    ok(toasts.some((t) => /未保存/.test(t.m)),
      '静默保存失败会明确告警（实测 toast：' + JSON.stringify(toasts.map((t) => t.m)) + '）')
    holdPuts = false

    /* ---- K2-6 宿主真身：可用性判据 / 布局派生 / 流水记账 ---- */
    showFile('P', 'a.md')
    dockPresent = true
    ok(host.editorHostInfo({ project: 'P', path: 'a.md' }).available === true,
      '内容区正承载 a.md → 宿主答 available=true')
    showFile('P', 'zzz.md')
    ok(host.editorHostInfo({ project: 'P', path: 'a.md' }).available === false,
      '【要害】舱位在、但内容区显示的是**别的文件** → 宿主答 available=false（旧判据「别人的 DOM 非空」在这里会给 true，编辑器就贴错画面）')
    hideContent()
    ok(host.editorHostInfo({ project: 'P', path: 'zzz.md' }).available === false, '内容区被销毁 → 答 available=false')
    dockPresent = false
    showFile('P', 'a.md')
    ok(host.editorHostInfo({ project: 'P', path: 'a.md' }).available === false, '舱位不在（内容区没渲染）→ 答 available=false')
    dockPresent = true
    /* 舱位消失时必须推 available:false 并让编辑态布局作废 */
    host.editorLayout = 'editor'
    hideContent()
    host.syncEditorHost('activeKey')
    ok(host.editorLayout === '', '舱位消失 → 编辑态布局当场作废（不留半截状态）')
    /* 布局类派生：viewer 与 editor 两套状态互不干扰 */
    const clsOf = (v, e) => { host.viewerLayout = v; host.editorLayout = e; return host.contentClass() }
    ok(clsOf('', 'editor') === 'v3-content v3-content--editor', '只有编辑态时：' + clsOf('', 'editor'))
    ok(clsOf('viewer', '') === 'v3-content v3-content--viewer', '只有 viewer 时：' + clsOf('viewer', ''))
    ok(clsOf('', '') === 'v3-content', '两者都不在场时：' + clsOf('', ''))
    /* 流水记账：宿主把插件的报账写进 viewers 的那一份流水，并按自己的口径折 key */
    reg.lifecycle.clear()
    host.noteEditorLifecycle({ kind: 'save-capture', project: 'P', path: 'a b.md', reason: 'interrupt', bytes: 12 })
    const relayed = reg.lifecycle.log()
    ok(relayed.length === 1 && relayed[0].kind === 'save-capture' && relayed[0].key === 'P|a b.md',
      '宿主 relay 真身把插件报账写进 viewers 流水（实测：' + JSON.stringify(relayed.map((e) => e.kind + '@' + e.key)) + '）')

    /* ---- K2-7 绕开 md:interrupt 直接开另一个文件：当前这一轮必须先被捕获保存 ---- */
    showFile('P', 'g.md'); host.syncEditorHost('content')
    docReply = { ok: true, doc: '# G', mtime: 1001 }
    await inst.openEditor({ entry: { name: 'g.md', isDir: false }, project: 'P', path: '' }, true)
    inst.doc = '# G 没保存就切走了'
    inst.onSrcInput()
    const putBefore = apiCalls.filter((c) => c.method === 'PUT').length
    docReply = { ok: true, doc: '# H', mtime: 1002 }
    await inst.openEditor({ entry: { name: 'h.md', isDir: false }, project: 'P', path: '' }, true)   // ← 没有 md:interrupt
    const putAfter = apiCalls.filter((c) => c.method === 'PUT')
    ok(putAfter.length === putBefore + 1 && putAfter[putAfter.length - 1].body.path === 'g.md' && /没保存就切走了/.test(putAfter[putAfter.length - 1].body.doc),
      '【兜底】绕开中断入口直接开另一个文件时，上一轮的未保存正文先被捕获并发出保存（实测 path=' + (putAfter[putAfter.length - 1] || {}).body?.path + '）')
    ok(inst.path === 'h.md' && inst.doc === '# H', '然后才切到新文件（实测 path=' + inst.path + '）')

    md.MdEditor.beforeUnmount.call(inst)
    ok(kbus._listeners('md:interrupt') === intBefore && kbus._listeners('v3:editor-host') === sayBefore,
      '组件 beforeUnmount 摘掉两条线（插件卸载 → 零残留；viewers.js 自己那条保存意图监听不受影响）')
    ok(sandboxErrors.length === 0 && errs.length === 0,
      '全程零异常、零 console.error' + (sandboxErrors.length || errs.length ? '：' + sandboxErrors.concat(errs).join(' | ') : ''))
  })().catch((e) => { ok(false, 'K 场景执行失败：' + e.message + '\n' + (e.stack || '')) })
}
/* K 是异步场景（要等保存回包），必须等它跑完再进下一段，否则断言会漏记在总结之后 */
await kDone

/* ================= 12b. 铺满形态（本轮修复）：图片 / PDF 铺满内容区 =================
 *
 * 用户抱怨：「除了直接在中间栏阅读的文件，其他格式的能打开的文件的背景和背景大小别做限制，
 * 给 100%……现在分好几层，大小还有的格式有限制。」
 * 病因两处，都在宿主自己这一侧（迁前原文）：
 *   ① `.v3-content { padding:16px 22px }` ⇒ 图片 / PDF 四周一圈留白（「分好几层」的那一层）；
 *   ② `.v3-pdf { height:calc(100vh - 260px); border:1px solid; border-radius:8px }`
 *      —— 写死「视口高度减常数」，与实际 chrome 高度无关，必然对不上；边框圆角还等于
 *      给浏览器内置 PDF 阅读器套了个相框。图片那侧是 `.v3-img { max-width:100% }` 只限宽不给高。
 *
 * 本段断言分两层，缺任何一层都不算数：
 *   · 派生层【行为】：跑 panel.js 的**真身** fillStateFor 纯函数 + 真身 contentClass，
 *     看「什么形态该铺满、什么形态不该」。—— **阴性对照打的就是这一层**：
 *     把 contentClass 里那半行（push v3-content--fill）删掉，本段当场变红。
 *   · 样式层【源码】：铺满规则确实写在**宿主自己的** styles.js 上；写死高度与装饰边框真的
 *     消失；而**文本阅读排版一行未动**（.v3-md 的 max-width:900px 是有意为阅读舒适设的）。
 *   只改派生不给样式（或反过来）都会漏，所以两层都钉。
 */
{
  /* 真身抽取：与段 12 同一手法（按大括号配平切片，不靠正则猜边界） */
  const sliceFn = (s, head) => {
    const at = s.indexOf(head)
    if (at < 0) return ''
    const brace = s.indexOf('{', at)
    let depth = 0
    for (let i = brace; i < s.length; i++) {
      if (s[i] === '{') depth++
      else if (s[i] === '}') { depth--; if (depth === 0) return s.slice(at, i + 1) }
    }
    return ''
  }
  const fnSrc = sliceFn(TREE_PANEL, 'function fillStateFor(tab, content, viewerLayout)')
  ok(/^function fillStateFor/.test(fnSrc),
    'panel.js 里找得到铺满判据的纯函数 fillStateFor（判据全取自宿主自己的状态，不查 DOM、不问插件）')

  const clsSrc = sliceFn(stripJsComments(TREE_PANEL), 'contentClass()')
  ok(/^contentClass\(\)/.test(clsSrc), 'panel.js 里找得到 contentClass 真身（布局状态类由宿主自己派生）')

  const SB = {}
  vm.createContext(SB)
  vm.runInContext('globalThis.__fill = ' + fnSrc, SB)
  vm.runInContext('globalThis.__cls = function ' + clsSrc, SB)
  const fillStateFor = SB.__fill
  const contentClass = SB.__cls
  ok(typeof fillStateFor === 'function' && typeof contentClass === 'function',
    '两个真身都在 vm 里跑了起来（不是正则猜想，是真跑组件代码）')

  const tab = (key, kind, name) => ({ key, project: 'P', path: name || 'a.x', name: name || 'a.x', kind })
  const ready = (key, extra) => Object.assign({ key, state: 'ready' }, extra || {})
  /* 一条链：判据 → 状态位 → 类名。断言打在这条链上，删掉任一端都会红。 */
  const clsOf = (t, c, viewerLayout) => contentClass.call({
    viewerLayout: viewerLayout || '', editorLayout: '', fillLayout: fillStateFor(t, c, viewerLayout || ''),
  })

  const imgTab = tab('P|a.png', 'image', 'a.png')
  const pdfTab = tab('P|b.pdf', 'pdf', 'b.pdf')
  const mdTab = tab('P|c.md', 'md', 'c.md')
  ok(fillStateFor(imgTab, ready('P|a.png', { url: '/raw' }), '') === 'fill' &&
     /v3-content--fill/.test(clsOf(imgTab, ready('P|a.png', { url: '/raw' }))),
    '【判据】图片（ready + url）→ 铺满形态：内容区类含 v3-content--fill')
  ok(/v3-content--fill/.test(clsOf(pdfTab, ready('P|b.pdf', { url: '/raw' }))),
    '【判据】PDF（ready + url）→ 铺满形态：内容区类含 v3-content--fill')
  /* 这一条是实测抓来的形态，不是想象：.ico 被后端 preview 认成 image（imgExts 有 ico），
   * 而前端 kindOf 的图片清单里没有 ico ⇒ kind 是 text、模板走 iframe 分支。
   * 若把铺满判据写成「kind 是 image 或 pdf」，这个形态会漏掉不铺 —— 所以判据是「有没有 url」。 */
  ok(/v3-content--fill/.test(clsOf(tab('P|f.ico', 'text', 'f.ico'), ready('P|f.ico', { url: '/raw' }))),
    '【实测形态】是图片却走 iframe 分支的文件（.ico）照样铺满（判据不挂在 kind 上）')
  ok(!/v3-content--fill/.test(clsOf(mdTab, ready('P|c.md', { markdown: '# t' }))),
    '【不许误伤】Markdown 正文**不**进铺满形态（用户说的是「除了直接阅读的文件」；.v3-md 的 max-width:900px 是有意留的阅读宽度）')
  ok(!/v3-content--fill/.test(clsOf(tab('P|d.txt', 'text', 'd.txt'), ready('P|d.txt', { text: 'x' }))),
    '【不许误伤】纯文本正文同样不进铺满形态（只读排版照旧）')
  ok(!/v3-content--fill/.test(clsOf(tab('P|e.docx', 'office', 'e.docx'), ready('P|e.docx', { office: { kind: 'docx', markdown: '# t' } }), 'viewer')),
    'office 文件照旧走 viewer 契约让位（铺满形态不抢它的活）')
  ok(fillStateFor(imgTab, { key: 'P|a.png', state: 'loading' }, '') === '',
    '还在 loading（没有 url）时不铺满：先按普通布局显示「正在加载…」，拿到内容再铺')
  ok(fillStateFor(imgTab, ready('P|other.png', { url: '/raw' }), '') === '',
    '内容区承载的**不是**当前标签时（切文件的一瞬）不铺满 —— 判据与模板 v-if 同一口径')
  ok(fillStateFor(pdfTab, ready('P|b.pdf', { url: '/raw' }), 'viewer') === '',
    '真有 viewer 上场时铺满让位（两者互斥，不留两套尺寸规矩同时下给一个容器）')
  ok(contentClass.call({ viewerLayout: 'viewer', editorLayout: '', fillLayout: 'fill' }) === 'v3-content v3-content--viewer',
    '【互斥】viewer 与 fill 同时为真时以 viewer 为准（实测类名：' + contentClass.call({ viewerLayout: 'viewer', editorLayout: '', fillLayout: 'fill' }) + '）')
  ok(contentClass.call({ viewerLayout: '', editorLayout: '', fillLayout: '' }) === 'v3-content',
    '三种形态都不在场时仍是裸 v3-content（既有布局一字未变）')

  /* ---- 样式层：规则归宿主、写死高度与装饰边框真的消失、阅读排版未动 ---- */
  const fillCss = (TREE_STYLES.match(/\.v3-content--fill\s*\{[^}]*\}/) || [''])[0]
  ok(/padding\s*:\s*0/.test(fillCss),
    '【样式】铺满规则写在宿主自己的 styles.js（.v3-content--fill），且去掉了内容区那一圈内边距（实测：' + fillCss + '）')
  ok(!/calc\(100vh/.test(stripJsComments(TREE_STYLES)),
    '【样式】迁前那句 height:calc(100vh - 260px) 写死高度已消失（PDF 高度改由容器给）')
  /* 媒体元素自己的【基础规则】（锚到行首，避开 .v3-content--fill 里那两条覆盖规则） */
  const imgBase = (TREE_STYLES.match(/(?:^|\n)\.v3-img\s*\{[^}]*\}/m) || [''])[0]
  const pdfBase = (TREE_STYLES.match(/(?:^|\n)\.v3-pdf\s*\{[^}]*\}/m) || [''])[0]
  ok(/border\s*:\s*0/.test(pdfBase) && !/border-radius/.test(pdfBase) && !/calc\(100vh/.test(pdfBase),
    '【样式】PDF 的 1px 相框、8px 圆角与写死高度三件装饰/限制都从基础规则里去掉了（实测：' + pdfBase + '）')
  ok(/max-width\s*:\s*100%/.test(imgBase) && /max-height\s*:\s*100%/.test(imgBase) && !/border-radius/.test(imgBase),
    '【样式】图片基础规则只留「不超出容器」（宽高都限），装饰性圆角去掉（实测：' + imgBase + '）')
  ok(/\.v3-md\s*\{[^}]*max-width\s*:\s*900px/.test(TREE_STYLES),
    '【不许误伤】文本阅读排版一字未动（.v3-md 的 max-width:900px 仍在）')
  ok(/class="v3-img-wrap"/.test(TREE_PANEL) && /class="v3-img"/.test(TREE_PANEL) &&
     /store\.lightbox\s*=\s*content\.url/.test(TREE_PANEL),
    '图片外层改成宿主自己的类（不再靠内联 text-align:center），图片仍可点开放大（lightbox 未被弄坏）')
  ok(/fillLayout\s*:\s*''/.test(TREE_PANEL) && /this\.syncFillLayout\(\)/.test(TREE_PANEL),
    '铺满状态由宿主自己的响应式 data（fillLayout）承载，并在 viewer 派生之后同步（顺序有意义：判据之一是「没有 viewer 在场」）')
}

/* ================= 13. 批注锚点与渲染根交接（第二步 d，最后一家） =================
 * 本批治的是**全仓最后一处跨插件 DOM 认领**：`privhub-files-comments` 自己去别人的容器里
 * 找渲染根（`document.querySelector('.v3-content .v3-md')`），并在那个节点上挂
 * `MutationObserver`（childList+subtree+characterData）—— 靠「盯着别人的 DOM 变了」重建锚点。
 *
 * 改成：**宿主在渲染完成后把渲染根的节点引用直接交出去**（`v3:md-root`，`el` 可为 null），
 * 插件只往交来的那个节点里面插锚点。
 *
 * 判据分三层：
 *   ① 源码级：comments 里 0 处跨插件 DOM 查询 / 0 处 MutationObserver（**含剥注释**）；
 *      宿主模板里那个渲染根是 `ref="mdRoot"`（宿主自己的节点），且宿主是**渲染后**才交引用；
 *   ② 行为级：跑 comments **真身**（最小 DOM 桩里的真树 + 真树遍历/真 Range 语义），
 *      看「宿主发根 → 锚点出现；宿主收根（换文件）→ 旧锚点不残留」；
 *   ③ 收尾核查：6 个「只读引用者」逐个核过、图片/PDF 是宿主亲儿子、两个舱位与两个状态类没被复用。
 */
console.log('\n── M 批注锚点 ← 宿主交来的渲染根（第二步 d：跨插件 DOM 认领归零）──')
{
  const CMT_PATH = join(ROOT, 'plugins', 'privhub-files-comments', 'client', 'index.js')
  const CMT_SRC = readFileSync(CMT_PATH, 'utf8')
  const CMT_BARE = stripJsComments(CMT_SRC)
  const PANEL_M = readExplorer('panel.js')
  const PANEL_M_BARE = stripJsComments(PANEL_M)

  /* ---- M1 源码级：零跨插件 DOM 查询（含剥注释）＋ 契约在两侧都真的接上 ---- */
  /* 判据与 office2（b 批）/ edit-md（c 批）同口径：**先剥注释**看代码，再拿原始源码加严。
   * 注意这里只拦「按类名去查别人的容器」这一类写法；`root.querySelectorAll('mark.v3-cmt')`
   * （在自己拿到的根里清自己的锚点）不在拦范围内——那是插件自己的节点。 */
  ok(!/querySelector\(\s*['"]\.v3-content/.test(CMT_BARE) && !/\.v3-content/.test(CMT_BARE),
    '【要害】comments 的代码里不再出现宿主的内容区容器 .v3-content（剥注释后 0 命中）')
  ok(!/querySelector\(\s*['"]\.v3-md/.test(CMT_BARE) && !/querySelector\(\s*['"]\.v3-text/.test(CMT_BARE),
    '【要害】comments 的代码里不再按类名去查宿主的渲染根 .v3-md / .v3-text（剥注释后 0 命中）')
  ok(!/querySelector\(\s*['"]\.v3-content/.test(CMT_SRC),
    '【要害·加严】comments 整个文件（含注释）grep 不到 querySelector(".v3-content") —— 0 命中')
  ok(!/document\.querySelector\s*\(/.test(CMT_BARE),
    'comments 不再从整个 document 查任何东西（自己的锚点在自己拿到的根里查，别家的一律不问）')
  ok(!/MutationObserver/.test(CMT_BARE),
    '【要害·本批的第二个要害】MutationObserver 已删除：不再"盯着别人的 DOM 变了"重建锚点'
    + (CMT_BARE.includes('MutationObserver') ? '（剥注释后仍有命中）' : '（剥注释后 0 命中）'))
  ok(/mdRoot: null/.test(CMT_BARE) && /mdEl\(\)\s*\{\s*return this\.mdRoot\s*\}/.test(CMT_BARE),
    '锚点根改成**宿主交进来的引用**（data.mdRoot，mdEl 只读它）——不是 computed 里现查 DOM')
  ok(/bus\.on\('v3:md-root',/.test(CMT_BARE) && /onMdRoot\(p\)/.test(CMT_BARE),
    'comments 听宿主的新交接事件 v3:md-root（宿主给根/收根都走这一条）')
  ok(!/v3:md-rendered/.test(CMT_BARE),
    '旧的 v3:md-rendered 监听已删除（它发在 Vue 渲染**之前**，那时新节点还不存在 —— 锚点认错根就是这么来的）')
  ok(/mdRoot\(el\)\s*\{\s*if\s*\(el\)\s*this\._render\(\)\s*\}/.test(CMT_BARE),
    '根被收回（el 为 null）时不渲染：旧节点连同旧锚点一起作废，锚点不可能残留')
  ok(/beforeUnmount\(\)\s*\{[\s\S]{0,400}this\.mdRoot = null/.test(CMT_BARE),
    '组件 beforeUnmount 里放弃根引用（插件被卸载 → 零残留）')

  /* 宿主侧：模板里的渲染根是**宿主自己的节点**（ref），且是**渲染后**才把引用交出去 */
  ok((PANEL_M.match(/<div v-html="renderMd\(\)" class="v3-md" ref="mdRoot"><\/div>/g) || []).length === 2,
    '宿主内容区里那两个 md 渲染分支（office 提取 / 普通 markdown）都挂了 ref="mdRoot"'
    + '（宿主自己的节点，不按类名去查、也不新建）｜实测 '
    + (PANEL_M.match(/<div v-html="renderMd\(\)" class="v3-md" ref="mdRoot"><\/div>/g) || []).length + ' 处')
  ok(/function mdRootOf\(refs\)\s*\{\s*return \(refs && refs\.mdRoot\) \|\| null\s*\}/.test(PANEL_M_BARE),
    '宿主有「取当前渲染根」的单一出口（mdRootOf(this.$refs)）')
  ok(/noticeMdRoot\(reason, key\)\s*\{[\s\S]{0,500}this\.\$nextTick\(/.test(PANEL_M_BARE),
    '宿主在 $nextTick（= Vue 渲染完成、v-html 已换过内容的那个时点）之后才发根 —— 不是"发完再等 DOM"')
  ok(/bus\.emit\('v3:md-root',\s*\{\s*el:\s*mdRootOf\(this\.\$refs\)/.test(PANEL_M_BARE),
    '宿主发出的 payload 就是渲染根的**节点引用**（el）+ 这一刻的文件 key')
  ok(/'store\.content'[\s\S]{0,140}noticeMdRoot\('content'/.test(PANEL_M_BARE) &&
     /'store\.activeKey'[\s\S]{0,140}noticeMdRoot\('activeKey'/.test(PANEL_M_BARE),
    '宿主两个内容切换入口（换文件 / 切标签）都走到交接：拿不到根就发 el:null（旧锚点随旧节点作废）')
  ok(!/bus\.emit\('v3:md-rendered'/.test(readExplorer('content.js')),
    'content.js 里那两发 v3:md-rendered 已删除（它发在 store.content 赋值之后、Vue 渲染之前 —— 监听方只能看到旧节点）')

  /* ---- M2 收尾核查：6 个「只读引用者」逐个核 + 图片/PDF 是宿主亲儿子 + 两个舱位没被复用 ---- */
  /* 这 6 家是契约里点名的「只读引用者」。判据：既不查别人的容器、也不往别人容器里写；
   * 这里对**每一家**单独出一条断言（不是一条汇总），这样将来谁变脏一眼看出是哪家。 */
  const READONLY = ['office-ui', 'dataview', 'mdpage', 'versions', 'publish', 'invite']
  for (const name of READONLY) {
    const dir = join(ROOT, 'plugins', 'privhub-files-' + name, 'client')
    const srcs = []
    if (existsSync(dir)) {
      const walk = (d) => {
        for (const e of readdirSync(d, { withFileTypes: true })) {
          if (e.name === 'node_modules' || e.name === 'vendor') continue
          const p = join(d, e.name)
          if (e.isDirectory()) walk(p)
          else if (e.name.endsWith('.js')) srcs.push(p)
        }
      }
      walk(dir)
    }
    const dirty = srcs.filter((p) => {
      const b = stripJsComments(readFileSync(p, 'utf8'))
      /* 只认「按宿主内容区的类名去做事」：查它、或者拿它当插入目标。 */
      return /querySelector\(\s*['"][^'"]*\.v3-content|querySelector\(\s*['"][^'"]*\.v3-md|querySelector\(\s*['"][^'"]*\.v3-text/.test(b) ||
        /\.v3-content[^\n]*appendChild|\.v3-content[^\n]*prepend/.test(b)
    }).map((p) => p.slice(ROOT.length + 1).replace(/\\/g, '/'))
    ok(srcs.length > 0 && dirty.length === 0,
      `只读引用者 ${name} 核过：干净（既不查宿主内容区、也不往里写）｜扫了 ${srcs.length} 个文件`
      + (dirty.length ? '｜脏：' + dirty.join(', ') : ''))
  }
  /* 图片 / PDF：宿主自己的 img / iframe.v3-pdf 分支是**宿主亲儿子**，不需要迁移 ——
   * 只需确认没有别的插件在管它们（谁去查 `.v3-pdf` / `.v3-img` 就是新的越权）。 */
  const walkClientJs = (dir, out = []) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '_retired-v2' || e.name === 'vendor') continue
      const p = join(dir, e.name)
      if (e.isDirectory()) walkClientJs(p, out)
      else if (e.name.endsWith('.js')) out.push(p)
    }
    return out
  }
  const imgPdfOwners = walkClientJs(join(ROOT, 'plugins'))
    .map((p) => ({ rel: p.slice(ROOT.length + 1).replace(/\\/g, '/'), bare: stripJsComments(readFileSync(p, 'utf8')) }))
    .filter((f) => !/^plugins\/privhub-files-explorer-v3\//.test(f.rel))
    .filter((f) => /querySelector\(\s*['"][^'"]*\.v3-(img|pdf)/.test(f.bare) ||
      /\.v3-(img|pdf)[^\n]*appendChild/.test(f.bare))
    .map((f) => f.rel)
  ok(imgPdfOwners.length === 0,
    `图片 / PDF 分支仍只有宿主在管（没有任何插件去查 .v3-img / .v3-pdf）`
    + (imgPdfOwners.length ? '｜发现：' + imgPdfOwners.join(', ') : '｜实测 0 家'))
  /* 两个舱位 + 两个状态类不得被复用：comments 既不认 viewer 的舱位、也不认编辑态的舱位，
   * 更不给自己加状态类（要新形态就请宿主再开舱位，不许挤进现有舱位）。 */
  ok(!/\.v3-viewer-host|\.v3-editor-host/.test(CMT_BARE),
    'comments 不认任何舱位类名（.v3-viewer-host / .v3-editor-host 都不是它的落点 —— 挤进现有舱位算越权）')
  ok(!/v3-content--(viewer|editor)/.test(CMT_BARE),
    'comments 不复用两个状态类（--viewer / --editor 各自会隐藏 .v3-md/.v3-text，那是宿主与 viewer/编辑器的事）')
  ok(/\.v3-viewer-host \{|\.v3-viewer-host\[data-viewer/.test(readFileSync(join(ROOT, 'plugins', 'privhub-files-office2', 'client', 'index.js'), 'utf8')) &&
     /to="\.v3-editor-host"/.test(readFileSync(join(ROOT, 'plugins', 'privhub-files-edit-md', 'client', 'index.js'), 'utf8')),
    '两个舱位各自仍只被它的正主使用（viewer 的地界归 office2、编辑态的地界归 edit-md）')

  /* ---- M3 行为级：跑 comments 真身（真树 + 真 Range 语义），看锚点出现/不残留 ---- */
  const CPROBE = (() => {
    /* 一个**够用就好**的 DOM 桩：真树 + 真子树遍历 + 真 Range 语义（extractContents/insertNode
     * 按 Range 规范动手，不是"假装插了一下"）。只为把 comments 的渲染路径真跑起来。 */
    const mkText = (data) => {
      const t = {
        nodeType: 3, parentNode: null, childNodes: [],
        get textContent() { return this._data }, set textContent(v) { this._data = String(v) },
        _data: String(data),
        cloneNode() { return mkText(this._data) },
        compareDocumentPosition(o) {
          const r = this.getRoot()
          const order = r ? r._order() : []
          const i = order.indexOf(this), j = order.indexOf(o)
          return (i >= 0 && j >= 0 && i < j) ? 4 : 2
        },
        getRoot() { let n = this; while (n.parentNode) n = n.parentNode; return n },
      }
      return t
    }
    const mkEl = (tag, attrs = {}) => {
      const e = {
        nodeType: 1, tagName: String(tag).toUpperCase(), attrs: { ...attrs }, parentNode: null, childNodes: [], style: {},
        get className() { return this.attrs.class || '' }, set className(v) { this.attrs.class = v },
        get dataset() {
          const self = this
          return new Proxy({}, {
            set(_t, k, v) { self.attrs['data-' + String(k).replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())] = v; return true },
            get(_t, k) { return self.attrs['data-' + String(k).replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())] },
          })
        },
        setAttribute(k, v) { this.attrs[k] = v },
        getAttribute(k) { return this.attrs[k] === undefined ? null : this.attrs[k] },
        get textContent() { return this.childNodes.map((c) => c.textContent || '').join('') },
        getRoot() { let n = this; while (n.parentNode) n = n.parentNode; return n },
        _order() {
          const out = []
          const walk = (n) => { for (const c of n.childNodes) { out.push(c); walk(c) } }
          walk(this)
          return out
        },
        contains(n) { let x = n; while (x) { if (x === this) return true; x = x.parentNode } return false },
        compareDocumentPosition(o) {
          const order = this.getRoot() ? this.getRoot()._order() : []
          const i = order.indexOf(this), j = order.indexOf(o)
          return (i >= 0 && j >= 0 && i < j) ? 4 : 2
        },
        appendChild(c) {
          /* 文档片段：按规范把**它的子节点**搬过来（片段本身不入树）。renderMarks 正是
           * `mark.appendChild(range.extractContents())` 这个写法，桩必须照规范来，
           * 否则测出来的树不是浏览器里的树。 */
          if (c.nodeType === 11) {
            for (const k of c.childNodes.slice()) { k.parentNode = this; this.childNodes.push(k) }
            c.childNodes.length = 0
            return c
          }
          c.parentNode = this; this.childNodes.push(c); return c
        },
        removeChild(c) { const i = this.childNodes.indexOf(c); if (i >= 0) this.childNodes.splice(i, 1); c.parentNode = null; return c },
        remove() { if (this.parentNode) this.parentNode.removeChild(this) },
        normalize() {
          const out = []
          for (const c of this.childNodes) {
            if (c.nodeType === 3 && out.length && out[out.length - 1].nodeType === 3) { out[out.length - 1]._data += c._data; continue }
            out.push(c)
          }
          this.childNodes = out
        },
        replaceWith(n) {
          const p = this.parentNode
          if (!p) return
          const i = p.childNodes.indexOf(this)
          if (i >= 0) { p.childNodes[i] = n; n.parentNode = p; this.parentNode = null }
        },
        cloneNode() { const c = mkEl(this.tagName.toLowerCase(), { ...this.attrs }); for (const k of this.childNodes) c.appendChild(k.cloneNode ? k.cloneNode() : k); return c },
        querySelectorAll(sel) {
          const want = String(sel).trim()
          return this._order().filter((n) => {
            if (n.nodeType !== 1) return false
            if (want === 'mark.v3-cmt') return n.tagName === 'MARK' && String(n.className).split(/\s+/).includes('v3-cmt')
            if (want.startsWith('mark.v3-cmt[')) { const id = /data-id="([^"]*)"/.exec(want); return n.tagName === 'MARK' && (!id || n.attrs['data-id'] === id[1]) }
            if (want.startsWith('.')) return String(n.className).split(/\s+/).includes(want.slice(1))
            return n.tagName === want.toUpperCase()
          })
        },
        querySelector(sel) { return this.querySelectorAll(sel)[0] || null },
      }
      return e
    }
    const docEvents = {}
    const stubDoc = {
      head: mkEl('head'), documentElement: mkEl('html'),
      createElement: (t) => mkEl(t), createTextNode: (d) => mkText(d),
      getSelection: () => null,
      addEventListener: (k, fn) => { (docEvents[k] = docEvents[k] || []).push(fn) },
      removeEventListener: (k, fn) => { const a = docEvents[k] || []; const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1) },
      createTreeWalker(root) {
        const list = root._order().filter((n) => n.nodeType === 3)
        let i = 0
        return { nextNode: () => (i < list.length ? list[i++] : null) }
      },
      createRange() {
        const R = { _s: null, _so: 0, _e: null, _eo: 0, _frag: null }
        R.setStart = (n, o) => { R._s = n; R._so = o }
        R.setEnd = (n, o) => { R._e = n; R._eo = o }
        R.extractContents = () => {
          const root = R._s.getRoot()
          const order = root._order()
          const nearestSel = (node) => {
            const c = node.nodeType === 1 ? node : node.parentNode
            for (const x of c.childNodes) { if (x === node) return c; if (x.nodeType === 1 && x.contains(node)) return x }
            return c
          }
          const sel = nearestSel(R._s)
          const frag = mkEl('fragment')
          frag.nodeType = 11
          const cd = sel.childNodes
          const idx = cd.indexOf(R._s)
          const [head, mid] = [mkText(R._s._data.slice(0, R._so)), mkText(R._s._data.slice(R._so, R._eo))]
          frag.appendChild(mid)
          for (let i = idx + 1; i < cd.length; i++) { frag.appendChild(cd[i]) }
          cd.length = 0
          if (head.textContent) { cd.push(head); head.parentNode = sel }
          cd.push(frag); frag.parentNode = sel
          /* 记下插入点：insertNode 要插在"文本切开处"，也就是 mid 的位置。
           * （mid 随后会被 mark.appendChild(片段) 搬进 mark 里，所以这里必须当场记下来。） */
          R._insParent = frag
          R._insRef = mid
          return frag
        }
        R.insertNode = (node) => {
          const parent = R._insParent
          const ref = R._insRef
          if (!parent || !ref) { R._s.childNodes.push(node); node.parentNode = R._s; return }
          const i = parent.childNodes.indexOf(ref)
          if (i < 0) { parent.childNodes.push(node); node.parentNode = parent; return }
          parent.childNodes.splice(i, 0, node)
          node.parentNode = parent
        }
        return R
      },
    }
    const apiCalls = []
    const byFile = {
      'a.md': [{ id: 'c1', start: 2, end: 5, text: '批注一', author: 'u', at: Date.now(), status: '待处理', project: 'P', path: 'a.md', replies: [] }],
      'b.md': [],
    }
    const box = {
      console: { log: NOOP, warn: NOOP, error: NOOP },
      document: stubDoc, NodeFilter: { SHOW_TEXT: 4 }, getComputedStyle: () => ({ zoom: '1' }),
      /* MutationObserver 桩：本批的**正解**里一次都不该出现它（源码级断言拦着）；
       * 桩在这儿是为了阴性对照——把 observer 改回去时，测试要能跑下去并**看见后果**，
       * 而不是当场 ReferenceError 直接崩（那样就测不出行为了）。 */
      MutationObserver: class { constructor(fn) { this._fn = fn } observe() { this._observing = true } disconnect() { this._observing = false } },
      encodeURIComponent, decodeURIComponent, Promise, Object, Array, String, Number, Boolean, Error, TypeError, RegExp, Date, Math, JSON, Map, Set, Proxy, Symbol, setTimeout, clearTimeout, queueMicrotask,
      confirm: () => true, alert: NOOP,
      __state: { curProject: '', curPath: '' },
    }
    const busListeners = {}
    const mkBus = () => ({
      on(ev, fn) { (busListeners[ev] = busListeners[ev] || []).push(fn); return () => { const a = busListeners[ev]; const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1) } },
      emit(ev, ...a) { for (const fn of (busListeners[ev] || []).slice()) fn(...a) },
    })
    const apiStub = (url) => {
      const u = String(url)
      apiCalls.push(u)
      const path = /[?&]path=([^&]*)/.exec(u)
      const p = decodeURIComponent(path ? path[1] : '')
      return Promise.resolve({ ok: true, comments: byFile[p] || [] })
    }
    const PrivHub = { api: apiStub, bus: mkBus(), toast: NOOP }
    box.window = { PrivHub }
    box.globalThis = box
    vm.createContext(box)
    vm.runInContext(CMT_SRC.replace(/export\s+default\s*\{/, 'globalThis.__cmtExport = {'), box, { filename: 'comments/client/index.js' })
    const ctrl = box.globalThis.__cmtExport.slots['office-editor']
    return { box, ctrl, mkEl, mkText, busListeners, apiCalls, byFile, PrivHub }
  })()

  ok(CPROBE.ctrl && CPROBE.ctrl.data && typeof CPROBE.ctrl.watch.mdRoot === 'function',
    'comments 真身在沙箱里跑了起来，且锚点根的 watcher 就是 data.mdRoot 上那一个（真跑，不是正则猜想）')

  /* 造实例：把 methods / data / watch 真接上（watch.mdRoot 的语义与 Vue 一致：值变才触发） */
  const inst = Object.assign({}, CPROBE.ctrl.methods, CPROBE.ctrl.data())
  Object.defineProperty(inst, 'mdEl', { configurable: true, get() { return this.mdRoot } })
  let renderCount = 0
  const rawRender = inst._render.bind(inst)
  inst._render = () => { renderCount++; return rawRender() }
  const setRoot = (el) => {
    const before = inst.mdRoot
    inst.mdRoot = el
    if (before !== el) CPROBE.ctrl.watch.mdRoot.call(inst, el)
  }
  CPROBE.ctrl.mounted.call(inst)
  const listenerCount = (ev) => (CPROBE.busListeners[ev] || []).length
  ok(listenerCount('v3:md-root') === 1 && listenerCount('file:comments') === 1,
    'mounted() 接上了两条线：file:comments（打开面板）与 v3:md-root（渲染根交接）')
  ok(listenerCount('md:interrupt') === 0 && listenerCount('v3:editor-host') === 0,
    'comments 不碰编辑舱位那两条线（舱位归 edit-md，不是本插件的地界）')

  /* 12 个嵌套块 = 段落 + 强调，用真实树遍历累计偏移，锚点落在"第 2 到第 5 个字符" */
  const makeTree = () => {
    const root = CPROBE.mkEl('div', { class: 'v3-md' })
    const p1 = CPROBE.mkEl('p'); p1.appendChild(CPROBE.mkText('abcdef')); root.appendChild(p1)
    const p2 = CPROBE.mkEl('p'); p2.appendChild(CPROBE.mkEl('strong')).appendChild(CPROBE.mkText('ghij')); root.appendChild(p2)
    return root
  }

  /* 打开 a.md：面板 + 渲染根交接（宿主先发根、插件再取数） */
  CPROBE.busListeners['file:comments'][0]({ project: 'P', path: 'a.md', name: 'a.md' })
  const rootA = makeTree()
  setRoot(rootA)
  await new Promise((r) => setTimeout(r, 0))
  await new Promise((r) => setTimeout(r, 0))
  const marksA = rootA.querySelectorAll('mark.v3-cmt')
  ok(marksA.length === 1,
    `【行为·渲染 → 通知 → 锚点出现】a.md 渲染完、宿主交出渲染根 → 根里出现 1 个批注锚点（实测 ${marksA.length} 个）`
    + '｜锚点 id=' + (marksA[0] ? marksA[0].attrs['data-id'] : '(无)'))
  ok(marksA[0] && marksA[0].attrs['data-id'] === 'c1' && marksA[0].textContent === 'cde',
    '锚点按「相对正文的字符偏移」落在正确位置（start=2/end=5 → "cde"，实测 "' + (marksA[0] ? marksA[0].textContent : '') + '"）')
  ok(CPROBE.apiCalls.some((u) => /path=a\.md/.test(u)), 'comments 的取数走的是自己的接口（实测调过：' + CPROBE.apiCalls.length + ' 次）')
  ok(renderCount >= 1 && inst.mdRoot === rootA, '锚点只渲染在**宿主交来的那个根**里（mdRoot === 根引用）')

  /* 换文件：宿主收回渲染根（el:null）→ 插件放弃旧引用，旧锚点不可能残留 */
  const rootB = makeTree()
  setRoot(rootB)
  const marksBeforeSwitch = rootA.querySelectorAll('mark.v3-cmt').length
  CPROBE.busListeners['v3:md-root'][0]({ el: null, project: 'P', key: 'P|b.md', reason: 'content' })
  ok(inst.mdRoot === null, '【行为·换文件】宿主收回渲染根（el:null）→ 插件当场放弃旧引用（不攥着已销毁的目标）')
  /* 旧节点里那几个锚点：旧节点自己连同锚点一起被 Vue 丢掉，插件不再主动动它。
   * 关键在于**插件不会再往旧节点里写**（下面那条"旧根不再被写"的断言证明它没有被补写）。 */
  ok(marksBeforeSwitch === 1, '换文件前旧根里确实有锚点（实测 ' + marksBeforeSwitch + ' 个）—— 断言不是空转')
  inst.project = 'P'; inst.path = 'b.md'
  CPROBE.busListeners['v3:md-root'][0]({ el: rootB, project: 'P', key: 'P|b.md', reason: 'content' })
  await new Promise((r) => setTimeout(r, 0))
  await new Promise((r) => setTimeout(r, 0))
  ok(rootB.querySelectorAll('mark.v3-cmt').length === 0,
    '【行为·新文件没有锚点】b.md 没有评论 → 新根里 0 个锚点（实测 ' + rootB.querySelectorAll('mark.v3-cmt').length + ' 个）')
  ok(rootA.querySelectorAll('mark.v3-cmt').length === marksBeforeSwitch,
    '旧根不再被写（换文件后插件一次都没碰旧节点：锚点数仍是 ' + marksBeforeSwitch + '，没有增/减）')

  /* 再切回 a.md：宿主要能给"同一个新节点"重新交出根，锚点必须能重建 */
  const rootA2 = makeTree()
  inst.project = 'P'; inst.path = 'a.md'
  CPROBE.busListeners['v3:md-root'][0]({ el: rootA2, project: 'P', key: 'P|a.md', reason: 'content' })
  await new Promise((r) => setTimeout(r, 0))
  await new Promise((r) => setTimeout(r, 0))
  ok(rootA2.querySelectorAll('mark.v3-cmt').length === 1,
    '切回 a.md（宿主再交一次根）→ 锚点在**新节点**里重建（实测 ' + rootA2.querySelectorAll('mark.v3-cmt').length + ' 个）')

  /* 插槽里的面板锚点根（.v3-md）永远来自 ref —— 宿主不得按类名去查它自己那个根 */
  ok(!/querySelector\(\s*['"][^'"]*\.v3-md/.test(PANEL_M_BARE),
    '宿主也不按 .v3-md 类名去查自己的渲染根（它有 ref="mdRoot"；宿主查自己的容器是它的权利，但这里连它也不用）')

  /* 卸载：两条线摘干净 → 插件被卸载后零残留 */
  CPROBE.ctrl.beforeUnmount.call(inst)
  ok(listenerCount('v3:md-root') === 0 && listenerCount('file:comments') === 0,
    'beforeUnmount 摘掉两条线（插件卸载 → 零残留）')
  ok(inst.mdRoot === null, 'beforeUnmount 后不再持有渲染根引用')
}


/* ================= 14. 前端模块语法体检 =================
 *
 * 为什么补这一条：**第二步 b 在 explorer-v3/client/styles.js 的 CSS 模板串里留了一对反引号**
 * （注释里写着 CSS 类名，带了反引号），模板串当场被结束 ⇒ 整个模块解析失败 ⇒
 * `import './styles.js'` 拉垮 explorer-v3 的整条前端装配（panel / tree / preview 三个插槽
 * 全在它身上）⇒ 主界面整块打不开。当时的 462 条断言**全绿**：没有任何一条会去解析这些文件。
 * 这里补上体检：剥掉 import/export 之后逐个解析（纯静态，不开浏览器也不需要真 DOM）。
 */
console.log('\n── L 前端模块语法体检（每个插件前端文件都必须能解析）──')
{
  const walkClient = (dir, out = []) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '_retired-v2') continue
      const p = join(dir, e.name)
      if (e.isDirectory()) walkClient(p, out)
      else if (e.name.endsWith('.js') && /[\\/]client[\\/]/.test(p)) out.push(p)
    }
    return out
  }
  /** 剥掉 ESM 语法（import / export）后剩下的应当是能解析的脚本代码。 */
  const toScript = (src) => src
    .replace(/^\s*export\s*\{[\s\S]*?\}\s*;?/gm, '')
    .replace(/^\s*import\s+[\s\S]*?from\s*['"][^'"]*['"]\s*;?\s*$/gm, '')
    .replace(/^\s*import\s*['"][^'"]*['"]\s*;?\s*$/gm, '')
    .replace(/^\s*export\s+default\s+/gm, 'globalThis.__defaultExport = ')
    .replace(/^\s*export\s+/gm, '')
    .replace(/\bimport\.meta\b/g, '({ url: "stub" })')
  const files = walkClient(join(ROOT, 'plugins'))
  const bad = []
  for (const p of files) {
    try { new vm.Script(toScript(readFileSync(p, 'utf8')), { filename: p }) }
    catch (e) { bad.push(p.slice(ROOT.length + 1).replace(/\\/g, '/') + '（' + String(e.message).split('\n')[0] + '）') }
  }
  ok(files.length >= 60, `扫到 ${files.length} 个插件前端文件（覆盖全部 client/*.js）`)
  ok(bad.length === 0,
    `每个前端模块都能解析（模板串里的反引号这类「整块打不开」的语法错在这里当场拦住）${bad.length ? '｜失败：' + bad.join('；') : ''}`)
}

console.log(`\n${'='.repeat(56)}`)
console.log(`  个人空间界面回归：${pass} 通过 / ${fail} 失败`)
console.log('='.repeat(56))
process.exit(fail === 0 ? 0 : 1)
