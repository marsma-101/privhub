/**
 * 音视频预览 + HTTP Range 断言（2026-10-09 批）
 *
 * ## 这个文件是干什么的
 *
 * 迁前音视频**根本没有预览**：`preview-raw` 只认图片与 PDF，`kindOfExt` 对 `.mp3` 回 `unknown`
 * ⇒ 用户拿到的是一句"该文件类型不支持在线查看"。本批按 nowen-note 的做法补上：
 *   ① 后端认媒体扩展名、给 mime、对媒体单独开一条 **Range** 分支（图片/PDF 原路不动）；
 *   ② 前端用原生 `<video controls preload="metadata">` / `<audio …>`，对**多半播不了**的
 *      容器（mkv/avi/mov…）画"兜底说明 + 下载入口"，**不黑屏**、也不是一句含糊的"不支持"。
 *
 * 预览这条路最容易被做错的三件事，正是本文件要钉的：
 *   · **能 seek**：不带 `206` + `Content-Range`，浏览器就只能整段下载完才允许拖进度条；
 *   · **`total` 是明文长度**：盘上是 `PHENC1` 密文（多 20 字节头 + 16 字节 tag），
 *     拿 `stat().size` 当 total 会让**浏览器算出的偏移整体错位**——
 *     一个字节都不报错，只是**从头就播花**（这种 bug 不看断言看不出来）；
 *   · **不解密就读区间**：密文的 GCM 认证块在文件末尾，取区间必须解密后跳过前面那些字节
 *     （`storage.readRange`），不然吐出去的是密文。
 *
 * ## 组
 *
 *   ⓪ `parseSingleRange` 纯函数（进程内 import 真身 `privhub-core/src/http-range.ts`）
 *   ① 端到端：**密文**文件（走上传通道 ⇒ 真加密）的整段 / 前缀 / 中段 / 后缀 / 开尾 / 越界
 *   ② 端到端：**明文**文件（直接落盘 ⇒ 走透明直通分支）同样一套 —— 两条分支都实测
 *   ③ 不误伤：图片 / PDF 带 `Range` 仍是 200 整段（**本批不改变它们一个字节**）
 *   ④ 鉴权与边界：未登录 401、不存在 404、空文件、超长区间
 *
 * ## 为什么这样写才叫"会红的"
 *
 *   · 每个区间都**逐字节**比对内容（不是只看 `Content-Range` 头）：偏移错位、吐密文、
 *     少读一字节都会红；
 *   · `total` 与 `Content-Length` 都对着**明文长度**断言（密文文件盘上体积比它大 36 字节）；
 *   · 图片/PDF 那组是**阴性对照**：谁把 Range 分支做成"所有类型都走"，这里立刻红；
 *   · ⓪ 组是纯函数：三种失败原因（`malformed`/`multiple`/`unsatisfiable`）分开断言，
 *     区分"我们没实现多区间"与"客户端发错了"。
 *
 * 阴性对照（实测贴在本批报告 `docs/reviews/17-音视频预览.md`）：把 media 分支里的
 * `plainSize` 换回 `stat().size` ⇒ ① 组密文文件的偏移断言变红；把 `parseSingleRange` 的
 * 逗号判断去掉 ⇒ ⓪ 组 `multiple` 与 ① 组 416 一起变红。
 *
 *   node --import tsx/esm tests/media-preview.mjs
 *
 * @module tests/media-preview
 */

import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync, lstatSync, unlinkSync, symlinkSync, statSync } from 'node:fs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
/** 端口不与既有套件冲突：3190(run-all) / 3192(audit) / 3193(matrix) / 3194(first-run)
 *  / 3195(rag) / 3196(preview-limits) / 3197(file-exts,model-parsing) / 3198(office-doc,json-corruption)
 *  / 3199(write-serialization)。3191 空着。 */
const PORT = Number(process.env.PRIVHUB_MEDIATEST_PORT || 3191)
const BASE = `http://127.0.0.1:${PORT}`
const TESTROOT = join(HERE, '.testroot-media')
const PROJECT = '公共'

let pass = 0
let fail = 0
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✅ ' + msg) } else { fail++; console.log('  ❌ ' + msg) }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ══════════════════════════════════════════════════════════════════════════
 * ⓪ parseSingleRange 纯函数：三种失败原因分得开
 * ══════════════════════════════════════════════════════════════════════════ */

console.log('══ ⓪ parseSingleRange 纯函数（进程内 import 真身）══')
const HR_SRC = join(ROOT, 'plugins', 'privhub-core', 'src', 'http-range.ts')
let parseSingleRange = null
let hrErr = ''
try {
  const mod = await import(pathToFileURL(HR_SRC).href)
  parseSingleRange = mod.parseSingleRange
} catch (e) { hrErr = String(e && e.message ? e.message : e) }
ok(typeof parseSingleRange === 'function', `能装载 http-range.ts 的真身${parseSingleRange ? '' : '：' + hrErr}`)

if (typeof parseSingleRange === 'function') {
  const TOTAL = 1000
  const cases = [
    // [头, 期望]
    [null, null], [undefined, null], ['', null],
    ['bytes=0-99', { ok: true, start: 0, end: 99, length: 100 }],
    ['bytes=100-', { ok: true, start: 100, end: 999, length: 900 }],
    ['bytes=-200', { ok: true, start: 800, end: 999, length: 200 }],
    ['bytes=-5000', { ok: true, start: 0, end: 999, length: 1000 }],  // 后缀比文件大 ⇒ 整段
    ['bytes=0-99999', { ok: true, start: 0, end: 999, length: 1000 }], // end 超尾 ⇒ 收敛
    ['bytes=999-999', { ok: true, start: 999, end: 999, length: 1 }],
    ['  bytes=0-1  ', { ok: true, start: 0, end: 1, length: 2 }],      // 前后空白按 RFC 宽容
    ['BYTES=0-1', { ok: true, start: 0, end: 1, length: 2 }],         // 单位名大小写不敏感
    ['bytes=1000-', { ok: false, reason: 'unsatisfiable' }],          // start 落在文件外
    ['bytes=1000-2000', { ok: false, reason: 'unsatisfiable' }],
    ['bytes=-0', { ok: false, reason: 'unsatisfiable' }],
    ['bytes=5-2', { ok: false, reason: 'unsatisfiable' }],            // end < start
    ['bytes=', { ok: false, reason: 'malformed' }],
    ['bytes=-', { ok: false, reason: 'malformed' }],
    ['bytes=abc', { ok: false, reason: 'malformed' }],
    ['bytes=0-1-2', { ok: false, reason: 'malformed' }],
    ['items=0-1', { ok: false, reason: 'malformed' }],
    ['bytes=0-1,3-4', { ok: false, reason: 'multiple' }],
    ['bytes=0-1, 3-4', { ok: false, reason: 'multiple' }],
  ]
  let bad = 0
  for (const [h, want] of cases) {
    let got
    try { got = parseSingleRange(h, TOTAL) } catch (e) { got = 'THREW: ' + (e && e.message) }
    const same = JSON.stringify(got) === JSON.stringify(want)
    if (!same) { bad++; console.log(`     [不符] ${JSON.stringify(h)} ⇒ ${JSON.stringify(got)}（期望 ${JSON.stringify(want)}）`) }
  }
  ok(bad === 0, `${cases.length} 条区间用例全部符合（含三种失败原因分开）`)
  /* 空文件：任何区间都不满足，但"没带 Range"仍是 null（两条路径必须分开） */
  ok(parseSingleRange('bytes=0-0', 0) && parseSingleRange('bytes=0-0', 0).reason === 'unsatisfiable',
    '空文件（total=0）带任何区间 ⇒ unsatisfiable')
  ok(parseSingleRange(null, 0) === null, '空文件不带 Range ⇒ null（走整段分支 ⇒ 200 空体，不是 416）')
  /* 总长非法（NaN/负/小数）⇒ 不抛，判 unsatisfiable */
  ok(parseSingleRange('bytes=0-1', -1) && parseSingleRange('bytes=0-1', -1).reason === 'unsatisfiable' &&
     parseSingleRange('bytes=0-1', 1.5) && parseSingleRange('bytes=0-1', 1.5).reason === 'unsatisfiable' &&
     parseSingleRange('bytes=0-1', NaN) && parseSingleRange('bytes=0-1', NaN).reason === 'unsatisfiable',
    '总长非法（负数 / 小数 / NaN）判 unsatisfiable，不抛异常（调用方不用包 try）')
}

/* ══════════════════════════════════════════════════════════════════════════
 * 隔离实例
 * ══════════════════════════════════════════════════════════════════════════ */

/** 确定性探针内容：第 i 字节 = 33 + (i % 90)（可打印 ASCII，且**按索引可复现**）。 */
function probeBytes(n, seed) {
  const b = Buffer.alloc(n)
  for (let i = 0; i < n; i++) b[i] = 33 + ((i + (seed || 0)) % 90)
  return b
}
const BODY_LEN = 4096
/** 密文探针（走上传通道 ⇒ storage 加密落盘） */
const ENC_BODY = probeBytes(BODY_LEN, 7)
/** 明文探针（直接落盘 ⇒ 走"无 magic 头直接透传"那条分支） */
const PLAIN_BODY = probeBytes(BODY_LEN, 41)
const ENC_NAME = 'MP密文探针.mp4'
const PLAIN_NAME = 'MP明文探针.mp3'
const EMPTY_NAME = 'MP空文件.mp4'
/** 探针文件名前缀：本套件自建的产物一律带它，便于识别与清理。 */
const PREFIX = 'MP'

function cleanRoot() {
  if (!existsSync(TESTROOT)) return
  for (const d of ['src', 'plugins', 'frontend', 'node_modules']) {
    const link = join(TESTROOT, d)
    try { if (existsSync(link) && lstatSync(link).isSymbolicLink()) unlinkSync(link) } catch { /* 忽略 */ }
  }
  try { rmSync(TESTROOT, { recursive: true, force: true }) } catch { /* 忽略 */ }
}

function prepareRoot() {
  cleanRoot()
  mkdirSync(join(TESTROOT, 'data-files', PROJECT), { recursive: true })
  for (const d of ['src', 'plugins', 'frontend', 'node_modules']) {
    const link = join(TESTROOT, d)
    try { if (!existsSync(link)) symlinkSync(join(ROOT, d), link, 'junction') } catch { /* 已存在或权限不足 */ }
  }
  /* 明文探针：**直接落盘**，不带 PHENC1 头 ⇒ 服务端按"未迁移的旧数据"透明直通读取。
   * 为什么必须造这一份：媒体分支的读区间对"密文/明文"是两条不同的代码路径，
   * 只测密文那条等于漏掉一半（反过来也一样）。 */
  writeFileSync(join(TESTROOT, 'data-files', PROJECT, PLAIN_NAME), PLAIN_BODY)
  writeFileSync(join(TESTROOT, 'data-files', PROJECT, EMPTY_NAME), Buffer.alloc(0))
  /* 不误伤组的样本：图片与 PDF（走原来的整段分支，**本批一个字节都没改**） */
  writeFileSync(join(TESTROOT, 'data-files', PROJECT, 'MP图片.png'),
    Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), probeBytes(600, 3)]))
  writeFileSync(join(TESTROOT, 'data-files', PROJECT, 'MP文档.pdf'),
    Buffer.concat([Buffer.from('%PDF-1.4\n'), probeBytes(600, 5)]))
}

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

async function api(method, path, { token, body, contentType } = {}) {
  const headers = {}
  if (token) headers.authorization = 'Bearer ' + token
  if (contentType) headers['content-type'] = contentType
  const res = await fetch(BASE + path, {
    method, headers,
    body: body === undefined ? undefined : Buffer.from(JSON.stringify(body), 'utf8'),
    signal: AbortSignal.timeout(30000),
  })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* 非 JSON */ }
  return { status: res.status, text, json }
}

const q = (path) => '/privhub/api/preview?' + new URLSearchParams({ project: PROJECT, path }).toString()
const qRaw = (path) => '/privhub/api/preview-raw?' + new URLSearchParams({ project: PROJECT, path }).toString()

/** 取原始字节（`preview-raw`），可带 `Range`。返回头 + 原始 Buffer，供逐字节比对。
 *
 * 为什么连**取响应体**都包 try：服务端若把 `content-length` 写错（例如拿密文的盘上长度
 * 当明文的长度），Node 会在实际少发若干字节后**直接掐掉连接** —— 那时 `fetch` 抛的是
 * `UND_ERR_SOCKET` 而不是返回一个畸形响应。本套件的职责是把这种情形**记成一条红的断言**，
 * 而不是让整个回归进程崩在这里（崩了就没有 ❌ 行、也没有"通过/失败"计数，反而看不出红在哪）。
 * 返回 `status: 0` 表示"连接层就废了"，下面所有断言自然全红。 */
async function rawFetch(path, { token, range } = {}) {
  const headers = {}
  if (token) headers.authorization = 'Bearer ' + token
  if (range) headers.range = range
  try {
    const res = await fetch(BASE + qRaw(path), { headers, signal: AbortSignal.timeout(30000) })
    const buf = Buffer.from(await res.arrayBuffer())
    return { status: res.status, headers: res.headers, buf, err: '' }
  } catch (e) {
    const msg = String(e && e.message ? e.message : e)
    console.log(`     [连接层失败] ${path} ${range || '(无 Range)'} → ${msg}`)
    return { status: 0, headers: new Headers(), buf: Buffer.alloc(0), err: msg }
  }
}

const hdr = (h, k) => h.get(k)

let ready = false
let serverErr = ''
prepareRoot()
const child = startServer()
child.stderr.on('data', (d) => { serverErr += d.toString() })
try {
  ready = await waitReady()
  ok(ready, `隔离实例就绪（端口 ${PORT}；不碰 3180/3181）`)
  if (ready) {
    const login = await api('POST', '/privhub/api/login', { body: { username: 'admin', password: 'admin123' } })
    ok(!!(login.json && login.json.ok && login.json.token), '管理员登录成功')
    const token = login.json && login.json.token

    /* ── 上传密文探针（走真上传通道 ⇒ storage 加密落盘）── */
    if (token) {
      const up = await fetch(BASE + '/privhub/api/upload?' + new URLSearchParams({ project: PROJECT, name: ENC_NAME }).toString(), {
        method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/octet-stream' },
        body: ENC_BODY, signal: AbortSignal.timeout(30000),
      })
      const upJson = await up.json().catch(() => null)
      ok(!!(upJson && upJson.ok), `密文探针上传成功（${ENC_NAME}，${ENC_BODY.length} 字节）`)

      /* 磁盘级证据：上传通道落的是**密文**（PHENC1 头），明文探针没有那个头。
       * 这是"两条读分支都被实测到"的前提 —— 只发 HTTP 看不出读的是哪条路。 */
      const encPath = join(TESTROOT, 'data-files', PROJECT, ENC_NAME)
      const plainPath = join(TESTROOT, 'data-files', PROJECT, PLAIN_NAME)
      const encDisk = existsSync(encPath) ? statSync(encPath).size : -1
      const head = existsSync(encPath) ? readFileSync(encPath).subarray(0, 6).toString('latin1') : ''
      console.log(`     [实测] 密文探针盘上体积=${encDisk} 字节 / 明文 ${ENC_BODY.length} 字节 / 头=${JSON.stringify(head)}`)
      ok(head === 'PHENC1' && encDisk === ENC_BODY.length + 36,
        `上传通道落盘确是密文（PHENC1 头 + ${ENC_BODY.length} + 20 头 + 16 tag = ${encDisk} 字节）`)
      ok(statSync(plainPath).size === PLAIN_BODY.length && readFileSync(plainPath).subarray(0, 6).toString('latin1') !== 'PHENC1',
        '直接落盘的探针是明文（无 PHENC1 头）——"透明直通"那条分支的对照样本')
      const empSize = statSync(join(TESTROOT, 'data-files', PROJECT, EMPTY_NAME)).size

      /* ── ① 分类：preview 接口对媒体回 type=media ── */
      console.log('\n══ ① preview 接口的媒体分类 ══')
      for (const [name, want] of [[ENC_NAME, 'media'], [PLAIN_NAME, 'media']]) {
        const r = await api('GET', q(name), { token })
        console.log(`     [实测] ${name} → HTTP ${r.status} type=${r.json && r.json.type}`)
        ok(r.status === 200 && r.json && r.json.type === want,
          `${name} 的预览类型是 ${want}（迁前是 unknown ⇒ 界面只会说"不支持在线查看"）`)
      }
      /* 不误伤：图片 / PDF 的分类没被媒体抢走 */
      ok((await api('GET', q('MP图片.png'), { token })).json?.type === 'image', '图片分类仍是 image')
      ok((await api('GET', q('MP文档.pdf'), { token })).json?.type === 'pdf', 'PDF 分类仍是 pdf')

      /* ── ② 密文文件：整段 + 五种区间，逐字节比对 ── */
      console.log('\n══ ② 密文文件（上传通道 ⇒ 走解密取区间）══')
      /* 整段：200 + 明文长度 + Accept-Ranges + 逐字节同值 */
      const full = await rawFetch(ENC_NAME, { token })
      ok(full.status === 200 && full.buf.length === ENC_BODY.length && full.buf.equals(ENC_BODY),
        `无 Range ⇒ 200 且整段**逐字节**等于原文（实测 ${full.buf.length} 字节）`)
      ok(hdr(full.headers, 'content-type') === 'video/mp4', `content-type = video/mp4（实测 ${hdr(full.headers, 'content-type')}）`)
      ok(hdr(full.headers, 'accept-ranges') === 'bytes', '整段响应带 accept-ranges: bytes（这是浏览器肯来要区间的前提）')
      ok(Number(hdr(full.headers, 'content-length')) === ENC_BODY.length,
        `整段的 content-length 是**明文**长度 ${ENC_BODY.length}（密文盘上比它大 36 字节 —— 拿盘上长度回，浏览器算出的偏移会整体错位）`)

      const ranges = [
        ['bytes=0-9', 0, 9],
        ['bytes=100-199', 100, 199],
        ['bytes=2048-2063', 2048, 2063],
        ['bytes=-16', BODY_LEN - 16, BODY_LEN - 1],
        ['bytes=' + (BODY_LEN - 100) + '-', BODY_LEN - 100, BODY_LEN - 1],
        ['bytes=0-' + (BODY_LEN * 5), 0, BODY_LEN - 1],   // end 超尾 ⇒ 收敛到文件尾
      ]
      let rangeBad = 0
      for (const [h, s, e] of ranges) {
        const r = await rawFetch(ENC_NAME, { token, range: h })
        const want = ENC_BODY.subarray(s, e + 1)
        const wantCR = `bytes ${s}-${e}/${BODY_LEN}`
        const good = r.status === 206 && r.buf.equals(want) &&
          hdr(r.headers, 'content-range') === wantCR &&
          Number(hdr(r.headers, 'content-length')) === want.length &&
          hdr(r.headers, 'accept-ranges') === 'bytes'
        if (!good) rangeBad++
        console.log(`     [实测] ${h.padEnd(20)} → ${r.status} ${hdr(r.headers, 'content-range')} 体积=${r.buf.length} 内容${r.buf.equals(want) ? '✓' : '✗'}`)
      }
      ok(rangeBad === 0, `密文文件 ${ranges.length} 种区间全部 206 + Content-Range + 内容逐字节一致（偏移错位 / 吐密文 / 少读一字节都会红）`)

      /* 416 三种原因 + 空文件 */
      console.log('\n     ── 416 与边界 ──')
      for (const [h, why] of [['bytes=999999-', '落在文件外'], ['bytes=0-1,3-4', '多区间（有意不做）'], ['bytes=abc', '语法坏']]) {
        const r = await rawFetch(ENC_NAME, { token, range: h })
        ok(r.status === 416 && hdr(r.headers, 'content-range') === `bytes */${BODY_LEN}` && r.buf.length === 0,
          `${why} ⇒ 416 + \`Content-Range: bytes */${BODY_LEN}\` 且响应体为空（实测 ${r.status} ${hdr(r.headers, 'content-range')}）`)
      }
      const empR = await rawFetch(EMPTY_NAME, { token, range: 'bytes=0-0' })
      ok(empR.status === 416 && hdr(empR.headers, 'content-range') === 'bytes */0', `空文件的任何区间 ⇒ 416 + bytes */0（实测 ${empR.status} ${hdr(empR.headers, 'content-range')}）`)
      const empFull = await rawFetch(EMPTY_NAME, { token })
      ok(empFull.status === 200 && empFull.buf.length === 0, `空文件不带 Range ⇒ 200 且空体（不是 416 —— 两条路径分开）`)

      /* ── ③ 明文文件：同一套（走透明直通分支）── */
      console.log('\n══ ③ 明文文件（直接落盘 ⇒ 走透明直通分支）══')
      const pFull = await rawFetch(PLAIN_NAME, { token })
      ok(pFull.status === 200 && pFull.buf.equals(PLAIN_BODY) && Number(hdr(pFull.headers, 'content-length')) === PLAIN_BODY.length,
        `明文文件整段读逐字节一致（${pFull.buf.length} 字节）`)
      ok(hdr(pFull.headers, 'content-type') === 'audio/mpeg', `content-type = audio/mpeg（实测 ${hdr(pFull.headers, 'content-type')}）`)
      let pBad = 0
      for (const [h, s, e] of ranges) {
        const r = await rawFetch(PLAIN_NAME, { token, range: h })
        const want = PLAIN_BODY.subarray(s, e + 1)
        const good = r.status === 206 && r.buf.equals(want) && hdr(r.headers, 'content-range') === `bytes ${s}-${e}/${BODY_LEN}`
        if (!good) pBad++
      }
      ok(pBad === 0, `明文文件 ${ranges.length} 种区间同样全部 206 + 内容一致（明文/密文两条读分支都实测过）`)
      const p416 = await rawFetch(PLAIN_NAME, { token, range: 'bytes=999999-' })
      ok(p416.status === 416 && hdr(p416.headers, 'content-range') === `bytes */${BODY_LEN}`, '明文文件的越界区间同样 416（两条分支口径一致）')

      /* ── ④ 不误伤：图片 / PDF 带 Range 仍是 200 整段 ── */
      console.log('\n══ ④ 不误伤：图片 / PDF 的既有行为一个字节没变 ══')
      for (const name of ['MP图片.png', 'MP文档.pdf']) {
        const r = await rawFetch(name, { token, range: 'bytes=0-9' })
        const plain = await rawFetch(name, { token })
        ok(r.status === 200 && r.buf.equals(plain.buf) && plain.status === 200,
          `${name} 带 Range 仍回 200 整段（**没有**走媒体那条分支；实测 ${r.status}，${r.buf.length} 字节）`)
        ok(hdr(r.headers, 'content-range') === null, `${name} 的响应里没有 content-range（不是 206）`)
      }

      /* ── ⑤ 鉴权与不存在 ── */
      console.log('\n══ ⑤ 鉴权与边界 ══')
      const anon = await rawFetch(ENC_NAME, {})
      ok(anon.status === 401, `未登录取媒体原始字节 ⇒ 401（实测 ${anon.status}）`)
      const missing = await rawFetch('MP不存在.mp4', { token })
      ok(missing.status === 404, `不存在的媒体 ⇒ 404（实测 ${missing.status}）`)
    }
  }
} finally {
  await stopServer(child)
}
cleanRoot()

console.log(`\n${'='.repeat(56)}`)
console.log(`  音视频预览 / Range 断言：${pass} 通过 / ${fail} 失败`)
console.log('='.repeat(56))
if (!ready && serverErr) console.log('服务端 stderr 摘要：\n' + serverErr.split('\n').slice(-8).join('\n'))
process.exit(fail === 0 ? 0 : 1)
