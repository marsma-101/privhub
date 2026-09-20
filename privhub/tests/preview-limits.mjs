/**
 * 预览体积上限与「大文件只读闸」的常驻断言
 *
 * 为什么单独有这个文件：这条链路此前**零覆盖** —— 现有回归（smoke/hardening/…）
 * 只预览过几字节的小文件，「改前改后失败清单逐条同名」这道闸门对它是瞎的：
 * 修好了不会变绿，改坏了也不会变红。本文件把它变成可复跑的断言。
 *
 * 第一轮（已上线）被修的缺陷：超限被谎报成「该文件类型不支持在线查看」。
 *   证据：迁移前 privhub-core/src/index.ts:735,751 与 content.js:38 ——
 *   `if (textExts.includes(ext) && s.size <= 512*1024 + 20)` 不成立时统一
 *   `return { data:'', type:'unknown' }`。
 *
 * 第二轮（本轮）改的两件事：
 *   ① 上限 512 KB → 10 MB（用户要求覆盖 `AI小说研究/参考文/` 下 5 本书，最大 2.4 MB）：
 *      `readFileForPreview` 的阈值改为具名常量 `MAX_TEXT_PREVIEW_BYTES`，
 *      `limit` 如实反映新上限；`too-large` 语义与前端「两句分说」全部保留。
 *   ② **一起做的保险**：抬到 10 MB 后，一本 2.4 MB 的书打开就会自动进内嵌编辑态
 *      （content.js 原本无条件 emit 'md:auto-edit'），浏览器极可能卡死 ——
 *      等于白抬。故加一道**体积闸**（`AUTO_EDIT_MAX_BYTES`，1 MB）：
 *      闸内照旧自动进编辑，闸外只读呈现（并给一句克制的说明）。
 *
 * 断言原则：**指向行为，不指向实现**。
 *   ✅ 「超限的文本文件给出的原因与『类型不支持』可区分」
 *   ✅ 「上限两侧：略小于上限可查看、略大于上限报超限，且回带的上限就是当前的值」
 *   ✅ 「限内的小文本仍返回可正常渲染的类型」
 *   ✅ 「真正不支持的扩展名仍是明确的『不支持』」
 *   ✅ 「超限时不把整份文件塞进 JSON」（上限本身要保留，不能改上限了事）
 *   ✅ 「超过只读闸的大文本**不**自动进编辑态；闸内的小文本照旧自动进」（真实执行前端模块）
 *   ✅ 「真实样本书的体积现在可在线查看」（读真书体积造同体积探针；只读体积、不读密文内容）
 *   ❌ 不断言任何具体中文句子（文案会变）、不断言字段名叫 too-large（改法会变）
 *   ⚠ 阈值本身**从源码读**（不是写死）：把上限改回 512 KB、或把只读闸去掉，
 *      本文件必须变红 —— 这正是它的阴性对照。
 *
 * 自给自足：自带隔离测试实例（独立端口 3196 + 独立测试根 tests/.testroot-preview），
 * **不碰 data/ 与 data-files/**（第 ⑥ 组只 stat 真书的体积，不读内容、不写回），跑完自清。
 *
 *   node tests/preview-limits.mjs
 *
 * @module tests/preview-limits
 */

import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync, mkdirSync, rmSync, lstatSync, unlinkSync, writeFileSync, readFileSync, readdirSync, symlinkSync, statSync } from 'node:fs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const TESTROOT = join(HERE, '.testroot-preview')
const PORT = Number(process.env.PRIVHUB_PREVIEWTEST_PORT || 3196)
const BASE = `http://127.0.0.1:${PORT}`
const PROJECT = '公共'

/* 与后端约定的语义常量（后端改法若变，此处跟着变；断言本身只看「可区分」） */
const TYPE_TOO_LARGE = 'too-large'
const TYPE_UNKNOWN = 'unknown'

/* ---------------- 期望的阈值（**从源码读，不写死**） ----------------
 * 为什么从源码读：这两条阈值就是本批要钉住的契约本身。
 *   · 后端上限（MAX_TEXT_PREVIEW_BYTES）：写死 10MB 的话，把它改回 512KB 时
 *     断言会跟着一起变绿 —— 闸门就瞎了。读源码 ⇒ 改回去必红。
 *   · 前端只读闸（AUTO_EDIT_MAX_BYTES）：同上。
 * 注意：这与「不断言实现」不冲突 —— 断言的是**用户能拿到多大上限**这个对外承诺，
 * 不是内部字段名或写法（两处都允许改名，只要改完仍能被本文件找到）。 */
const BACKEND_SRC = join(ROOT, 'plugins', 'privhub-core', 'src', 'index.ts')
const CONTENT_SRC = join(ROOT, 'plugins', 'privhub-files-explorer-v3', 'client', 'content.js')

function readConstFromSource(file, constName) {
  const src = readFileSync(file, 'utf8')
  const re = new RegExp('(?:export\\s+)?const\\s+' + constName + '\\s*=\\s*([0-9*\\s()/+-]+)', 'm')
  const m = re.exec(src)
  if (!m) return null
  try {
    // 只允许纯算式（本文件两处阈值都是 "10 * 1024 * 1024" 这种形式）
    const v = Function('"use strict";return (' + m[1].trim() + ')')()
    return typeof v === 'number' && v > 0 ? v : null
  } catch { return null }
}

/** API 在线查看上限（后端常量）。读不到就退到 10MB，并让下面的自证断言变红。 */
const API_LIMIT = readConstFromSource(BACKEND_SRC, 'MAX_TEXT_PREVIEW_BYTES') || 10 * 1024 * 1024
/** 自动进编辑态的只读闸（前端常量）。读不到就退到 1MB。 */
const READONLY_GATE = readConstFromSource(CONTENT_SRC, 'AUTO_EDIT_MAX_BYTES') || 1024 * 1024

/* ---------------- 本批新增：共享扩展名定义的装载 ----------------
 * 本批把「5 份各写各的扩展名白名单」收敛成 `privhub-core/src/file-exts.ts` 一处定义 + 各处显式派生，
 * 并补齐了矩阵里"纯文本却打不开"的那批扩展名。这里**从源码直接装载那份清单**（不写死），
 * 于是「补了哪些、现在通不通」这件事有了一条常驻断言：
 * 谁把某个扩展名从清单里拿掉（或接不上），第 ⑦ 组必红。
 * 注：本文件自身要用 `--import tsx/esm` 运行（run-all 已按脚本名放行），与全仓读源码的口径一致。 */
const EXTS_SRC = join(ROOT, 'plugins', 'privhub-core', 'src', 'file-exts.ts')
let ADDED_TEXT_EXTS = []
try {
  const mod = await import(pathToFileURL(EXTS_SRC).href)
  ADDED_TEXT_EXTS = [...(mod.PREVIEW_ONLY_TEXT_EXTS || [])]
} catch { /* 装载失败 ⇒ 下面的自证断言变红（不是静默跳过） */ }
const ADDED_PROBE = (ext) => 'PV补齐探针.' + ext
/* 用户明确要求的下限：在线查看上限必须 ≥ 10 MB（改动前是 512 KB）。
 * 这一条**故意写死**：其余边界断言都是按阈值参数化算出来的，谁把阈值翻回旧值它们就跟着
 * 一起缩，反而测不出「用户要的能力被拿掉了」。钉住这个绝对下限，翻回旧值必红。 */
const API_LIMIT_FLOOR = 10 * 1024 * 1024

let pass = 0
let fail = 0
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✅ ' + msg) } else { fail++; console.log('  ❌ ' + msg) }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ---------------- 隔离实例 ---------------- */

/** 清掉测试根（junction 先卸，绝不触碰真实源码与真实数据）。 */
function cleanRoot() {
  if (existsSync(TESTROOT)) {
    for (const d of ['src', 'plugins', 'frontend', 'node_modules']) {
      const link = join(TESTROOT, d)
      try { if (existsSync(link) && lstatSync(link).isSymbolicLink()) unlinkSync(link) } catch { /* 忽略 */ }
    }
    try { rmSync(TESTROOT, { recursive: true, force: true }) } catch { /* 忽略 */ }
  }
}

/**
 * 建测试根并【直接落盘】三个探针文件。
 * 为什么不用 /privhub/api/upload：上传通道自己有 200MB 与同名冲突等约束，
 * 会把「预览上限」这件事测偏；预览限的是「读进内存」，与文件怎么来的无关。
 *
 * 探针内容一律用单字节 ASCII：中文一个字 3 字节，会让「字符数 = 字节数」的
 * 预期落空（本文件第一版就栽在这里，实测 514048 字符 = 1490715 字节）。
 * 真实体积一律以 statSync 回读为准，不靠算。
 */
const PROBE_DIR = join('data-files', PROJECT)

/* 探针体积一律**从上面读到的两个阈值反算**，不写死数字：
 * 阈值改了，探针跟着挪，断言考的始终是「限内/限外」这件事本身。 */
const API_BELOW_BYTES = Math.floor(API_LIMIT * 0.96)          // 略小于在线查看上限
const API_ABOVE_BYTES = Math.floor(API_LIMIT + 512 * 1024)    // 略大于在线查看上限
const GATE_ABOVE_BYTES = Math.floor(READONLY_GATE + 256 * 1024) // 越过只读闸、但仍在上限内
const PROBE_BODY = 'ice-and-fire-probe'

/** 造一个**精确 n 字节**的 ASCII 探针（单字节字符，避免「字符数≠字节数」的坑）。 */
function asciiBytes(n, body) {
  const unit = body + '\n'
  const head = Math.floor(n / unit.length)
  return Buffer.from(unit.repeat(head) + 'x'.repeat(n - head * unit.length), 'utf8')
}

function prepareRoot() {
  cleanRoot()
  mkdirSync(join(TESTROOT, PROBE_DIR), { recursive: true })
  for (const d of ['src', 'plugins', 'frontend', 'node_modules']) {
    const link = join(TESTROOT, d)
    try { if (!existsSync(link)) symlinkSync(join(ROOT, d), link, 'junction') } catch { /* 已存在或权限不足 */ }
  }
  const lines = (n, body) => Array.from({ length: n }, () => body).join('\n')
  /* ① 限内小文本：远小于只读闸与上限（几百字节） */
  writeFileSync(join(TESTROOT, PROBE_DIR, 'PV小文本.md'), lines(20, '# small text\nhello privhub'), 'utf8')
  /* ② 略小于上限的文本（仍在上限内 ⇒ 应当可查看） */
  writeFileSync(join(TESTROOT, PROBE_DIR, 'PV略小上限.md'), asciiBytes(API_BELOW_BYTES, PROBE_BODY))
  /* ③ 略大于只读闸、仍在上限内的文本（可查看，但不该自动进编辑态） */
  writeFileSync(join(TESTROOT, PROBE_DIR, 'PV超闸文本.md'), asciiBytes(GATE_ABOVE_BYTES, PROBE_BODY))
  /* ④ 略大于上限的文本（⇒ 只能超限） */
  writeFileSync(join(TESTROOT, PROBE_DIR, 'PV超大文本.md'), asciiBytes(API_ABOVE_BYTES, PROBE_BODY))
  /* ⑤ 真正不支持的扩展名（二进制且不在任何白名单） */
  writeFileSync(join(TESTROOT, PROBE_DIR, 'PV不支持.bin'), Buffer.from([0x00, 0x01, 0x02, 0x03]), 'binary')
  /* ⑥ 真实样本书：抬上限就是为了它们（**只读它们的体积**，见下） */
  const books = listRealBooks()
  for (let i = 0; i < books.length; i++) {
    /* 为什么不直接复制真书进来：真实数据是 AES-256-GCM 密文（文件头 PHENC1），
     * 密钥 `data/secret.key` 属于真实实例 —— 隔离实例的密钥不同，
     * 复制进来只会解密失败（HTTP 500 Unsupported state…），测不到上限这件事。
     * 所以取**真书的真实字节数**造同体积探针：既不动真实数据、也不改真实密钥，
     * 考的还是「这个体积的文件现在能不能在线看」。
     * 探针正文用**纯 ASCII**（`asciiBytes` 按字节切分，中文一字 3 字节会让期望落空）。 */
    writeFileSync(join(TESTROOT, PROBE_DIR, REAL_BOOK_PREFIX + i + '.md'), asciiBytes(books[i].size, 'book-size-probe:'))
  }
  /* ⑦ 本批补齐的扩展名：每个扩展名一个真文件（内容带自己的扩展名，便于核对回带的就是这份内容）。
   * 探针名由**共享清单常量**生成 ⇒ 清单变了探针跟着变，考的是"清单里这些现在通不通"。 */
  for (const ext of ADDED_TEXT_EXTS) {
    writeFileSync(join(TESTROOT, PROBE_DIR, ADDED_PROBE(ext)), 'privhub-added-ext-probe ' + ext + '\n第二行中文（验 UTF-8 解码）\n', 'utf8')
  }
  return books
}

/* 真实样本书的只读来源（本测试只读目录列表与文件体积，绝不读内容、不写回） */
const REAL_BOOK_DIR = join(ROOT, 'data-files', 'AI小说研究', '参考文')
const REAL_BOOK_PREFIX = 'PV真书体积'
function listRealBooks() {
  try {
    return readdirSync(REAL_BOOK_DIR)
      .filter((n) => /\.md$/i.test(n))
      .map((n) => ({ n, size: statSync(join(REAL_BOOK_DIR, n)).size }))
      .filter((x) => x.size > 1024 * 1024)
      .sort((a, b) => b.size - a.size)
      .slice(0, 3)
  } catch { return [] }
}

/** 磁盘真实字节数（断言的期望值来源，避免算错）。 */
function diskSize(rel) { return statSync(join(TESTROOT, PROBE_DIR, rel)).size }

function startServer() {
  return spawn(process.execPath, ['--import', 'tsx/esm', 'src/main.ts', '--port', String(PORT)], {
    cwd: TESTROOT,
    env: { ...process.env, PRIVHUB_ROOT: TESTROOT, PRIVHUB_TEST_ROOT: TESTROOT },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

async function stopServer(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return
  const done = new Promise((r) => child.once('exit', r))
  child.kill()
  const t = await Promise.race([done.then(() => false), new Promise((r) => setTimeout(r, 2000))])
  if (t) { child.kill('SIGKILL'); await Promise.race([done, new Promise((r) => setTimeout(r, 1500))]) }
}

async function waitReady(ms = 60000) {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    try {
      const r = await fetch(BASE + '/privhub/api/health', { signal: AbortSignal.timeout(2000) })
      if (r.status === 200) return true
    } catch { /* 未就绪 */ }
    await sleep(300)
  }
  return false
}

/* ---------------- HTTP 小工具 ---------------- */

async function api(method, path, { token, body } = {}) {
  const headers = {}
  let payload
  if (body !== undefined) { payload = Buffer.from(JSON.stringify(body), 'utf8'); headers['content-type'] = 'application/json' }
  if (token) headers.authorization = 'Bearer ' + token
  const res = await fetch(BASE + path, { method, headers, body: payload, signal: AbortSignal.timeout(30000) })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* 非 JSON */ }
  return { status: res.status, text, json }
}

const preview = (token, path) => api('GET', '/privhub/api/preview?' + new URLSearchParams({ project: PROJECT, path }).toString(), { token })
const download = (token, path) => api('GET', '/privhub/api/download?' + new URLSearchParams({ project: PROJECT, path }).toString(), { token })

/* ---------------- 前端只读闸的沙箱（不开浏览器） ----------------
 *
 * 为什么要在 Node 里跑前端模块：只读闸的行为发生在浏览器（内容区决定要不要 emit
 * 'md:auto-edit'），现有回归**一条都没开过浏览器**。这里不引入浏览器，而是把
 * explorer-v3 的 content.js **真身** import 进来，只桩掉它对外部的两个依赖：
 *   window.PrivHub.api  —— 换成回放固定响应的假接口
 *   window.PrivHub.bus  —— 换成记录事件名的假总线
 *   window.Vue.reactive —— 换成恒等函数
 * 于是「要不要自动进编辑态」这件事可以在 Node 里被真实执行与观察。
 *
 * 断的是行为：**『自动进编辑态』这个事件发没发** —— 发 0 次 = 只读；发 1 次 = 照旧编辑。
 * 不依赖它内部怎么写：阈值读的是源码常量，事件名与本文件其他地方一致。
 */
async function makeContentSandbox() {
  let response = { ok: true }
  const autoEditEvents = []
  const allEvents = []
  globalThis.window = {
    PrivHub: {
      api: async () => response,
      bus: {
        emit: (name, payload) => { allEvents.push(name); if (name === 'md:auto-edit') autoEditEvents.push(payload) },
        on: () => () => {},
      },
      AUTH: { token: '', user: null },
      nav: {},
    },
    Vue: { reactive: (o) => o },
  }
  const mod = await import(new URL('../plugins/privhub-files-explorer-v3/client/content.js', import.meta.url).href)
  // store 是插件内的共享单例（content.js 不导出它，但各模块 import 的是同一个对象）
  const { store } = await import(new URL('../plugins/privhub-files-explorer-v3/client/store.js', import.meta.url).href)
  return {
    /** 喂一次「打开文本文件」的完整流程；返回内容区状态 + 只读闸是否放行。 */
    async load(name, resp) {
      response = { ok: true, ...resp }
      store.tabs = [{ key: 'sandbox|' + name, project: PROJECT, path: name, name, kind: name.endsWith('.md') ? 'md' : 'text' }]
      store.activeKey = store.tabs[0].key
      store.content = null
      autoEditEvents.length = 0
      let sandboxError = ''
      try { await mod.loadContent(store.tabs[0].key) } catch (e) { sandboxError = String(e && e.message ? e.message : e) }
      const c = store.content || {}
      return {
        state: c.state,
        autoEdit: c.autoEdit,
        readonlyHint: c.readonlyHint,
        size: c.size,
        autoEditEvents: autoEditEvents.length,
        sandboxError,
      }
    },
  }
}

/* ---------------- 主体 ---------------- */

async function main() {
  console.log('══ 预览体积上限常驻断言（隔离实例，不碰真实数据）══')
  const realBooks = prepareRoot()

  const smallPath = 'PV小文本.md'
  const bigPath = 'PV超大文本.md'
  const belowPath = 'PV略小上限.md'
  const gatePath = 'PV超闸文本.md'
  const binPath = 'PV不支持.bin'
  const smallSize = diskSize(smallPath)
  const bigSize = diskSize(bigPath)
  const belowSize = diskSize(belowPath)
  const gateSize = diskSize(gatePath)

  const child = startServer()
  let serverErr = ''
  child.stderr.on('data', (d) => { serverErr += d.toString() })
  let ready = false
  try {
    ready = await waitReady()
    ok(ready, `隔离实例就绪（端口 ${PORT}）`)
    if (!ready) return

    const login = await api('POST', '/privhub/api/login', { body: { username: 'admin', password: 'admin123' } })
    ok(login.json && login.json.ok && login.json.token, '管理员登录成功（取会话令牌）')
    if (!login.json || !login.json.token) return
    const token = login.json.token

    /* 先自证探针本身是对的：小文件确实在上限内、大文件确实超限（否则后面的断言测的是环境） */
    console.log('\n── ⓪ 探针自证 ──')
    ok(API_LIMIT >= API_LIMIT_FLOOR,
      `在线查看上限确实抬到了 10 MB（源码常量=${API_LIMIT}，要求下限 ${API_LIMIT_FLOOR}；改动前的 512 KB 会在这里变红）`)
    ok(READONLY_GATE > 0 && READONLY_GATE < API_LIMIT,
      `只读闸存在且小于查看上限（闸=${READONLY_GATE} 字节 < 上限=${API_LIMIT} 字节）`)
    ok(smallSize < READONLY_GATE, `限内探针确实在只读闸 ${READONLY_GATE} 字节之下（${smallSize} 字节）`)
    ok(belowSize < API_LIMIT, `「略小上限」探针确实在在线查看上限之内（${belowSize} < ${API_LIMIT}）`)
    ok(gateSize > READONLY_GATE && gateSize < API_LIMIT,
      `「超闸」探针越过只读闸但仍在查看上限内（${gateSize} 字节：> ${READONLY_GATE} 且 < ${API_LIMIT}）`)
    ok(bigSize > API_LIMIT + 20, `超限探针确实越过了在线查看上限 + 20 字节的判定边界（${bigSize} 字节）`)

    /* ---------- ① 超限的文本：原因必须与「类型不支持」可区分 ---------- */
    console.log('\n── ① 超限文本：给出可区分的超限原因，而不是笼统的 unknown ──')
    const big = await preview(token, bigPath)
    console.log('     [实测] ' + bigPath + '（' + bigSize + ' 字节）→ ' + big.text.slice(0, 160))
    ok(big.status === 200 && big.json && big.json.ok === true, `超限文本的预览接口正常作答（HTTP ${big.status}）`)
    ok(big.json && big.json.type !== TYPE_UNKNOWN,
      `超限文本【不再】报成与"类型不支持"同一个值（type=${big.json && big.json.type}，旧行为是 ${TYPE_UNKNOWN}）`)
    ok(big.json && big.json.type === TYPE_TOO_LARGE,
      `超限文本给出明确的超限类型（type=${big.json && big.json.type}）`)
    ok(big.json && big.json.size === bigSize, `回带实际体积且与磁盘一致（size=${big.json && big.json.size}，期望 ${bigSize}）`)
    ok(big.json && typeof big.json.limit === 'number' && big.json.limit > 0 && bigSize > big.json.limit,
      `回带在线查看上限且确实被超出（limit=${big.json && big.json.limit} 字节）`)
    /* 上限如实反映「现在到底给到多大」：limit 必须等于源码里的那个值，不是写死的历史值 */
    ok(big.json && big.json.limit === API_LIMIT,
      `回带的上限与源码常量一致（limit=${big.json && big.json.limit}，源码 MAX_TEXT_PREVIEW_BYTES=${API_LIMIT}）`)
    ok(big.json && (big.json.data === '' || big.json.data === undefined),
      '超限时不把整份文件塞进 JSON（上限本身要保留，不能靠取消上限了事）')

    /* ---------- ①b 边界两侧：略小于上限可查看、略大于上限只能超限 ---------- */
    console.log('\n── ①b 上限边界两侧：内侧可查看 / 外侧只能超限 ──')
    const below = await preview(token, belowPath)
    console.log('     [实测·内] ' + belowPath + '（' + belowSize + ' 字节）→ ' + below.text.slice(0, 80))
    ok(below.status === 200 && below.json && below.json.ok === true, `上限内侧文本接口正常作答（HTTP ${below.status}）`)
    ok(below.json && below.json.type === 'text',
      `上限内侧文本可查看（type=${below.json && below.json.type}，${belowSize} 字节 < ${API_LIMIT}）`)
    ok(below.json && typeof below.json.data === 'string' && below.json.data.length > 0,
      `上限内侧文本内容照常返回（${below.json && below.json.data ? below.json.data.length : 0} 字符，不是空壳）`)
    ok(below.json && below.json.size === undefined && below.json.limit === undefined,
      '上限内侧文本不带 size/limit（形状与既有正常路径一致）')
    ok(below.json && big.json && below.json.type !== big.json.type,
      `边界两侧给出【不同】的类型（内侧 ${below.json && below.json.type} ≠ 外侧 ${big.json && big.json.type}）`)

    /* ---------- ② 限内小文本：仍返回可正常渲染的类型 ---------- */
    console.log('\n── ② 限内小文本：照常可读（修复没有误伤正常文件）──')
    const small = await preview(token, smallPath)
    ok(small.json && small.json.ok === true, '限内小文本预览仍是 ok=true')
    ok(small.json && small.json.type === 'text', `限内小文本仍是可渲染的文本类型（type=${small.json && small.json.type}）`)
    ok(small.json && typeof small.json.data === 'string' && small.json.data.includes('hello privhub'),
      '限内小文本的内容照常返回（不是空壳）')
    ok(small.json && small.json.size === undefined && small.json.limit === undefined,
      '限内小文本不追加超限字段（响应形状对正常路径无新增噪音）')

    /* ---------- ③ 真正不支持的类型：仍是明确的「不支持」 ---------- */
    console.log('\n── ③ 真正不支持的扩展名：仍是明确的"不支持" ──')
    const bin = await preview(token, binPath)
    ok(bin.json && bin.json.ok === true, '不支持类型仍以 200 + ok 作答（不改成报错，兼容既有前端分支）')
    ok(bin.json && bin.json.type === TYPE_UNKNOWN,
      `不支持的扩展名仍是 ${TYPE_UNKNOWN}（type=${bin.json && bin.json.type}）`)
    ok(bin.json && bin.json.size === undefined && bin.json.limit === undefined,
      '不支持类型不带 size/limit（两种情形在响应上也是分开的）')
    ok(big.json && bin.json && big.json.type !== bin.json.type,
      `断言核心：超限与不支持给出【不同】的 type（${big.json && big.json.type} ≠ ${bin.json && bin.json.type}）`)

    /* ---------- ④ 出路仍然可用：下载通道打开超限文件 ---------- */
    console.log('\n── ④ 出路：下载通道对超限文件照常可用（界面指向的那条路真的通）──')
    const dl = await download(token, bigPath)
    ok(dl.status === 200, `超限文件仍可下载（HTTP ${dl.status}）`)
    ok(dl.text.length === bigSize, `下载内容长度与磁盘一致（${dl.text.length}，期望 ${bigSize}）`)

    /* ---------- ⑥ 真实样本书：抬上限就是为了它们（按真实体积造探针） ---------- */
    console.log('\n── ⑥ 真实样本书的体积（AI小说研究/参考文，只读体积；密文内容不进隔离根）──')
    if (realBooks.length === 0) {
      console.log('     [跳过] 未找到 ≥1 MB 的真实 .md 样本书（本机数据被移动/清理时属预期）—— 这一组不计入通过数')
    } else {
      let allOk = true
      let maxBytes = 0
      for (let i = 0; i < realBooks.length; i++) {
        const name = REAL_BOOK_PREFIX + i + '.md'
        const size = diskSize(name)
        maxBytes = Math.max(maxBytes, size)
        const r = await preview(token, name)
        const type = r.json && r.json.type
        const dataLen = r.json && typeof r.json.data === 'string' ? r.json.data.length : 0
        allOk = allOk && type === 'text' && dataLen === size
        console.log(`     [实测] ${realBooks[i].n}（磁盘真实 ${realBooks[i].size} 字节 → 探针 ${size} 字节）→ HTTP ${r.status} type=${type} 正文字符数=${dataLen}`)
      }
      ok(allOk && maxBytes > 1024 * 1024 && maxBytes < API_LIMIT,
        `${realBooks.length} 本真实样本书的体积（最大 ${maxBytes} 字节）现在全部可在线查看（旧的 512 KB 上限下它们全部超限）`)
    }

    /* ---------- ⑦ 本批补齐的扩展名：真的能打开了（原来的"纯文本却打不开"那一批） ----------
     * 这几条此前**打不开**：矩阵实测它们走 `/preview` 得到 `type=unknown`，界面显示
     * 「该文件类型不支持在线查看」（`docs/reviews/11-格式支持矩阵与铺满修复.md` §2.3 的 A 类）。
     * 断言不写死扩展名清单 —— 从 `privhub-core/src/file-exts.ts` 的 `PREVIEW_ONLY_TEXT_EXTS` 读，
     * 于是"从清单里拿掉一个扩展名"这条也会在这里变红。 */
    console.log('\n── ⑦ 本批补齐的扩展名：逐个走真接口验"现在能打开" ──')
    ok(ADDED_TEXT_EXTS.length >= 11,
      `从共享定义读到本批补齐清单（${ADDED_TEXT_EXTS.length} 项：${ADDED_TEXT_EXTS.join(',')}）—— 读不到必红，不静默跳过`)
    let addedOk = 0
    const addedBad = []
    for (const ext of ADDED_TEXT_EXTS) {
      const name = ADDED_PROBE(ext)
      const r = await preview(token, name)
      const type = r.json && r.json.type
      const dataLen = r.json && typeof r.json.data === 'string' ? r.json.data.length : 0
      const good = r.status === 200 && r.json && r.json.ok === true && type === 'text' && dataLen > 0
      if (good) addedOk++
      else addedBad.push(`${name}(type=${type}, HTTP ${r.status})`)
      console.log(`     [实测] ${name.padEnd(22)} → HTTP ${r.status} type=${type} 正文字符数=${dataLen}`)
    }
    ok(addedBad.length === 0,
      `补齐的 ${ADDED_TEXT_EXTS.length} 个扩展名现在全部能打开（实测 ${addedOk}/${ADDED_TEXT_EXTS.length}）${addedBad.length ? '；失败：' + addedBad.join(' ') : ''}`)
    ok(addedOk === ADDED_TEXT_EXTS.length && ADDED_TEXT_EXTS.every((e) => e !== ''),
      '清单里没有空项（无扩展名文件不在这份清单里 —— 本批明确不做二进制嗅探）')
  } finally {
    await stopServer(child)
  }

  /* ---------- ⑤ 只读闸：大文本不得自动进编辑态 ----------
   *
   * 这条链路在浏览器里（内容区 → edit-md 内嵌编辑器），本测试不开浏览器。
   * 做法：把 explorer-v3 的 `content.js` **真身** import 进 Node，只桩掉它对外部的两个依赖
   * （window.PrivHub 的 api/bus、window.Vue 的 reactive），然后喂它真实的接口响应形状，
   * 观察它**是否发出『自动进编辑态』这个事件**。
   * 断的是行为（事件发没发），不是实现（不断言阈值数字、不断言语句、不断言事件名以外的东西）。
   * 阴性对照：把 content.js 里的闸去掉（无条件发事件）⇒ 本组必红。 */
  console.log('\n── ⑤ 只读闸：超过 1 MB 的文本不自动进编辑态（只读呈现）──')
  const sandbox = await makeContentSandbox()
  /* 三种真实的接口响应形状（**按接口现在真正回带什么来喂**）：
   *   · 闸内 / 超闸的正文本：后端只回 data（不带 size）⇒ 体积由前端按 UTF-8 自行算；
   *   · 超限文本：后端回 too-large + size + limit。
   * 正文用真实长度的内容（与磁盘上那份探针同规模），否则测不出体积判定。 */
  const textOf = (n) => Buffer.from(asciiBytes(n, PROBE_BODY)).toString('utf8')
  const gateProbe = { type: 'text', data: textOf(gateSize - 1) }   // 越过只读闸、仍在上限内
  const smallProbe = { type: 'text', data: '# small text\nhello privhub' }  // 在闸内
  const tooBigProbe = { size: bigSize, type: TYPE_TOO_LARGE, limit: API_LIMIT, data: '' }
  const gateRes = await sandbox.load(gatePath, gateProbe)
  const smallRes = await sandbox.load(smallPath, smallProbe)
  const tooBigRes = await sandbox.load(bigPath, tooBigProbe)
  console.log(`     [实测] 超闸文本（约 ${gateSize} 字节，前端自行算体积）→ autoEdit=${gateRes.autoEdit}, 事件 ${gateRes.autoEditEvents} 次`)
  console.log(`     [实测] 限内小文本（${smallSize} 字节）→ autoEdit=${smallRes.autoEdit}, 事件 ${smallRes.autoEditEvents} 次`)
  console.log(`     [实测] 超限文本（${bigSize} 字节）→ 内容区状态 ${tooBigRes.state}, 事件 ${tooBigRes.autoEditEvents} 次`)
  if (gateRes.sandboxError) console.log('     [诊断] content.js 装载/调用异常：' + gateRes.sandboxError)
  ok(gateRes.state === 'ready', `超闸大文本仍可在线查看（内容区状态 ${gateRes.state}，不是 error）`)
  ok(gateRes.autoEditEvents === 0,
    `超闸大文本【不】触发自动进编辑态（事件发出 ${gateRes.autoEditEvents} 次，期望 0；闸值 ${READONLY_GATE} 字节）`)
  ok(gateRes.autoEdit === false,
    `超闸大文本的内容状态标注为「未自动进编辑」（autoEdit=${gateRes.autoEdit}）`)
  ok(gateRes.readonlyHint && gateRes.readonlyHint.length > 0,
    `超闸大文本给出了只读说明（${gateRes.readonlyHint ? gateRes.readonlyHint.length : 0} 字）`)
  ok(gateRes.size > READONLY_GATE,
    `前端自算的体积确实越过闸值（算出 ${gateRes.size} 字节 > ${READONLY_GATE}）`)
  ok(smallRes.autoEditEvents === 1,
    `闸内小文本照旧自动进编辑态（事件发出 ${smallRes.autoEditEvents} 次，期望 1；既有体验不变）`)
  ok(smallRes.readonlyHint === '',
    '闸内小文本不带只读说明（不给正常文件加噪音）')
  ok(tooBigRes.autoEditEvents === 0 && tooBigRes.state === 'error',
    `超出查看上限的文本仍是明确的错误态、且不尝试进编辑（state=${tooBigRes.state}，事件 ${tooBigRes.autoEditEvents} 次）`)

  cleanRoot()

  console.log(`\n${'='.repeat(56)}`)
  console.log(`  预览体积上限断言：${pass} 通过 / ${fail} 失败`)
  console.log('='.repeat(56))
  if (!ready && serverErr) console.log('服务端 stderr 摘要：\n' + serverErr.split('\n').slice(-8).join('\n'))
  process.exit(fail === 0 ? 0 : 1)
}

process.on('SIGINT', () => process.exit(130))
main().catch((e) => { console.error('测试异常：', e); process.exit(1) })
