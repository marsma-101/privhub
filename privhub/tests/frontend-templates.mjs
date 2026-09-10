/**
 * 前端模板编译回归（显示 bug 防线）
 *
 * 用项目自带的 Vue 3.5 真实编译器，编译骨架与全部插件 client 的 `template:`，
 * 捕获编译错误/警告，并静态检查「模板里引用了未定义的插值变量」。
 *
 * 为什么需要：本项目模板是字符串（无构建链），写错不会在启动时报错，
 * 只在用户打开某个界面时表现为空白或文字缺失。
 * 已知实例：模板编辑面板提示 `{{date}}` 被当插值 → 渲染成空白
 * （files-template/client/index.js，已用 v-pre 修复）。
 *
 *   node tests/frontend-templates.mjs
 *
 * @module tests/frontend-templates
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import vm from 'node:vm'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')

let pass = 0
let fail = 0
const failures = []

function ok(cond, msg) {
  if (cond) { pass++ } else { fail++; failures.push(msg) }
  console.log((cond ? '  ✅ ' : '  ❌ ') + msg)
}

/* ---- 1. 在真实 vm 上下文中加载 Vue（提供完整全局，避免桩不完整导致的假错误） ---- */
const vuePath = join(ROOT, 'frontend', 'vue.global.prod.js')
if (!existsSync(vuePath)) {
  console.error('未找到 ' + vuePath)
  process.exit(1)
}

/**
 * 最小 HTML 实体解码（Vue 编译期用它还原 &nbsp; / &amp; / &#39; 等）。
 * Vue 的 decodeHtmlBrowser 会：建一个 div → 设 innerHTML → 读 textContent /
 * getAttribute('value')。因此桩里 innerHTML 必须是会"解析"的 setter。
 */
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', copy: '\u00a9', reg: '\u00ae', hellip: '\u2026', mdash: '\u2014', ndash: '\u2013', times: '\u00d7', laquo: '\u00ab', raquo: '\u00bb', middot: '\u00b7', deg: '\u00b0', plusmn: '\u00b1', sect: '\u00a7', para: '\u00b6', bull: '\u2022', dagger: '\u2020', prime: '\u2032', Prime: '\u2033', euro: '\u20ac', pound: '\u00a3', yen: '\u00a5', cent: '\u00a2', szlig: '\u00df', agrave: '\u00e0', eacute: '\u00e9', uuml: '\u00fc', ouml: '\u00f6', auml: '\u00e4' }

function decodeEntities(s) {
  return String(s)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (m, n) => (NAMED[n] !== undefined ? NAMED[n] : m))
}

function makeEl(tag) {
  const el = {
    tagName: String(tag || 'div').toUpperCase(),
    _html: '',
    textContent: '', nodeValue: '', style: {},
    children: [], childNodes: [], attrs: {},
    set innerHTML(v) {
      const html = String(v)
      this._html = html
      this.textContent = decodeEntities(html.replace(/<[^>]*>/g, ''))
      // Vue 解码【属性】时用的是：
      //   decoder.innerHTML = `<div foo="${raw}">`; return decoder.children[0].getAttribute("foo")
      // 因此必须真的解析出一个子元素并带上属性，否则 children[0] 为 undefined。
      this.children = []
      this.childNodes = []
      const tagRe = /<([a-zA-Z][\w-]*)((?:\s+[\w:.-]+\s*=\s*"[^"]*")*)\s*\/?>/g
      let m
      while ((m = tagRe.exec(html)) !== null) {
        const child = makeEl(m[1])
        const attrRe = /([\w:.-]+)\s*=\s*"([^"]*)"/g
        let a
        while ((a = attrRe.exec(m[2] || '')) !== null) {
          child.attrs[a[1]] = decodeEntities(a[2])
        }
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
    cloneNode() { return makeEl(tag) },
    contains() { return false },
  }
  return el
}

const ctx = {
  console,
  setTimeout, clearTimeout, setInterval, clearInterval,
  queueMicrotask, Promise, Date, Math, JSON, Object, Array, String, Number, Boolean, Error,
  Map, Set, WeakMap, WeakSet, Symbol, RegExp, Function, Buffer,
  document: {
    createElement: makeEl,
    createTextNode: (t) => ({ textContent: t, nodeValue: t }),
    createComment: () => makeEl(),
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    head: makeEl(),
    body: makeEl(),
    documentElement: makeEl(),
    addEventListener() {}, removeEventListener() {},
  },
  navigator: { userAgent: 'node' },
  location: { href: 'http://localhost/' },
  addEventListener() {}, removeEventListener() {},
}
ctx.window = ctx
ctx.self = ctx
ctx.globalThis = ctx

let Vue = null
try {
  vm.createContext(ctx)
  vm.runInContext(readFileSync(vuePath, 'utf8'), ctx, { filename: 'vue.global.prod.js' })
  Vue = ctx.Vue
  // 关键：Vue.compile 内部用 new Function 生成渲染函数，代码在 Node 的【真实全局】
  // 作用域求值，看不到 vm 上下文里的 Vue / document。必须一并暴露到真实 globalThis，
  // 否则连 <div>hi</div> 都会报 "Vue is not defined"（假错误），
  // 含 HTML 实体（&nbsp; 等）的模板则会报 "reading 'getAttribute'"（解码器需要 document）。
  globalThis.Vue = Vue
  globalThis.document = ctx.document
} catch (e) {
  console.error('加载 Vue 失败：' + e.message)
  process.exit(1)
}
ok(Vue && typeof Vue.compile === 'function', 'Vue 编译器可用（' + (Vue && Vue.version) + '）')

/* ---- 2. 收集模板 ---- */
function collectFiles() {
  const out = []
  const skeleton = join(ROOT, 'frontend', 'index.html')
  if (existsSync(skeleton)) out.push({ name: 'frontend/index.html', file: skeleton })
  const pluginsDir = join(ROOT, 'plugins')
  for (const d of readdirSync(pluginsDir, { withFileTypes: true })) {
    if (!d.isDirectory() || d.name.startsWith('_')) continue
    const clientDir = join(pluginsDir, d.name, 'client')
    if (!existsSync(clientDir)) continue
    for (const f of readdirSync(clientDir, { withFileTypes: true })) {
      if (!f.isFile() || !f.name.endsWith('.js')) continue
      out.push({ name: 'plugins/' + d.name + '/client/' + f.name, file: join(clientDir, f.name) })
    }
  }
  return out
}

/** 取出 `template: \`...\`` 字符串（含模板起始行号）。 */
function extractTemplates(src) {
  const out = []
  let i = 0
  while (true) {
    const at = src.indexOf('template:', i)
    if (at < 0) break
    let j = at + 'template:'.length
    while (j < src.length && /\s/.test(src[j])) j++
    const quote = src[j]
    const line = src.slice(0, at).split('\n').length
    if (quote === '`') {
      let k = j + 1, depth = 0, end = -1
      while (k < src.length) {
        const ch = src[k]
        if (ch === '\\') { k += 2; continue }
        if (ch === '$' && src[k + 1] === '{') { depth++; k += 2; continue }
        if (depth > 0 && ch === '}') { depth--; k++; continue }
        if (depth === 0 && ch === '`') { end = k; break }
        k++
      }
      if (end > 0) { out.push({ html: src.slice(j + 1, end), line }); i = end + 1; continue }
    } else if (quote === "'" || quote === '"') {
      let k = j + 1
      while (k < src.length && src[k] !== quote) { if (src[k] === '\\') k++; k++ }
      out.push({ html: src.slice(j + 1, k), line })
      i = k + 1
      continue
    }
    i = at + 9
  }
  return out
}

/** 把 ${...} 替换为占位符（本测试只关心 HTML 部分）。 */
function normalize(html) {
  let out = '', i = 0
  while (i < html.length) {
    if (html[i] === '$' && html[i + 1] === '{') {
      let depth = 1, k = i + 2
      while (k < html.length && depth > 0) {
        if (html[k] === '{') depth++
        else if (html[k] === '}') depth--
        k++
      }
      out += 'EXPR'; i = k; continue
    }
    out += html[i]; i++
  }
  return out
}

function compileTemplate(html) {
  const errors = [], warnings = []
  try {
    Vue.compile(normalize(html), {
      onError: (e) => errors.push(e.message || String(e)),
      onWarn: (w) => warnings.push(w.message || String(w)),
    })
  } catch (e) { errors.push(e.message || String(e)) }
  return { errors, warnings }
}

console.log('\n── 模板编译检查 ──')
const files = collectFiles()
let totalTemplates = 0
const withErrors = [], withWarnings = []

for (const f of files) {
  const src = readFileSync(f.file, 'utf8')
  for (const t of extractTemplates(src)) {
    totalTemplates++
    const { errors, warnings } = compileTemplate(t.html)
    for (const e of errors) withErrors.push(`${f.name}:${t.line}  ${e}`)
    for (const w of warnings) withWarnings.push(`${f.name}:${t.line}  ${w}`)
  }
}

ok(totalTemplates > 0, `扫描到 ${totalTemplates} 个模板（${files.length} 个前端文件）`)
ok(withErrors.length === 0, `模板编译零错误${withErrors.length ? '（' + withErrors.length + ' 个）' : ''}`)
for (const e of withErrors.slice(0, 15)) console.log('       ' + e)
ok(withWarnings.length === 0, `模板编译零警告${withWarnings.length ? '（' + withWarnings.length + ' 个）' : ''}`)
for (const w of withWarnings.slice(0, 15)) console.log('       ' + w)

/* ---- 3. 插值变量检查（正确处理 v-for 作用域与 v-pre） ---- */
console.log('\n── 模板插值变量检查 ──')

const GLOBALS = new Set(['fileIcon', 'previewImageUrl', 'previewPdfUrl', 'applyTheme', 'Math', 'Date', 'JSON', 'String', 'Number'])

/** 收集模板内所有 v-for 引入的局部变量名（含 (item, index) 形式与解构）。 */
function collectLoopVars(html) {
  const vars = new Set()
  const re = /v-for\s*=\s*"([^"]*)"/g
  let m
  while ((m = re.exec(html)) !== null) {
    const expr = m[1]
    const inPart = expr.split(/\s+(?:in|of)\s+/)[0].trim()
    // (a, b) 或 a 或 {x, y}
    const names = inPart.replace(/[(){}[\]]/g, ' ').split(/[\s,]+/).filter(Boolean)
    for (const n of names) if (/^[A-Za-z_$][\w$]*$/.test(n)) vars.add(n)
  }
  // v-slot / #default="{ x }"
  const slotRe = /(?:v-slot|#[\w-]*)\s*=\s*"\{([^}]*)\}"/g
  while ((m = slotRe.exec(html)) !== null) {
    for (const n of m[1].split(',').map(s => s.trim().split(':')[0]).filter(Boolean)) {
      if (/^[A-Za-z_$][\w$]*$/.test(n)) vars.add(n)
    }
  }
  return vars
}

/** 去掉带 v-pre 的元素整段（其内容不参与编译）。 */
function stripVPre(html) {
  return html.replace(/<[^>]*\bv-pre\b[^>]*>[\s\S]*?<\/[a-zA-Z][\w-]*>/g, '')
}

function findUndefined(file, src) {
  const problems = []
  for (const t of extractTemplates(src)) {
    const html = stripVPre(t.html)
    const loopVars = collectLoopVars(html)
    const re = /\{\{\s*([A-Za-z_$][\w$]*)\s*\}\}/g
    let m
    const seen = new Set()
    while ((m = re.exec(html)) !== null) {
      const name = m[1]
      if (GLOBALS.has(name) || loopVars.has(name) || seen.has(name)) continue
      seen.add(name)
      const defined =
        new RegExp('\\b' + name + '\\s*[:(]').test(src) ||
        new RegExp('\\b(?:const|let|var)\\s+' + name + '\\b').test(src) ||
        new RegExp('\\{[^}]*\\b' + name + '\\b[^}]*\\}\\s*=').test(src) ||
        new RegExp('\\b' + name + '\\s*=').test(src) ||
        new RegExp('\\.' + name + '\\s*=').test(src)
      if (!defined) problems.push(`${file}:${t.line}  {{${name}}} 顶部属性在该文件内找不到定义`)
    }
  }
  return problems
}

const undef = []
for (const f of files) undef.push(...findUndefined(f.name, readFileSync(f.file, 'utf8')))
ok(undef.length === 0, `模板插值变量均有定义${undef.length ? '（' + undef.length + ' 处）' : ''}`)
for (const p of undef.slice(0, 15)) console.log('       ' + p)

/* ---- 4. 已知显示 bug 的回归断言 ---- */
console.log('\n── 已知显示 bug 回归 ──')
const tplSrc = readFileSync(join(ROOT, 'plugins', 'privhub-files-template', 'client', 'index.js'), 'utf8')
ok(/<label v-pre>\s*内容（\{\{date\}\} 会被替换为当天日期）/.test(tplSrc),
  '模板编辑面板 {{date}} 用 v-pre 字面展示（否则渲染成空白）')

const skeletonSrc = readFileSync(join(ROOT, 'frontend', 'index.html'), 'utf8')
const wm = /\.watermark-overlay\s*\{[^}]*z-index:\s*(\d+)/.exec(skeletonSrc)
const qz = /📥 上传队列[\s\S]{0,400}?z-index:\s*(\d+)/.exec(skeletonSrc)
ok(wm && Number(wm[1]) > 1200,
  `水印 z-index (${wm ? wm[1] : '?'}) 高于上传队列抽屉 (1200) —— 防截屏水印不被遮挡`)

ok(/failedPlugins/.test(skeletonSrc) && /界面组件加载失败/.test(skeletonSrc),
  '插件加载失败时界面给出可见原因与重试入口（不再永久停在「加载中…」）')

console.log(`\n${'='.repeat(56)}`)
console.log(`  前端模板回归：${pass} 通过 / ${fail} 失败`)
console.log('='.repeat(56))
process.exit(fail === 0 ? 0 : 1)
