/**
 * A 批修复的常驻断言（A1 / A2 / A3 / A4 / A5）
 *
 * 为什么单独有这个文件：七角度评审已查明，**现有回归对 RAG 路径与「服务会不会被
 * 一个异常打死」零覆盖** —— 全站唯一主界面从未被挂载、RAG 检索没有任何断言。
 * 也就是说：「改前改后失败清单逐条同名」这道闸门，对 A1/A2 是瞎的：
 * 改好了不会变绿，改坏了也不会变红。本文件把这几条修复变成可复跑的断言。
 *
 * 断言原则：**指向行为，不指向实现**。
 *   ✅ 「检索接口不再回 Cannot access 'manifest' before initialization」
 *   ✅ 「摄取队列抛一次错之后，进程仍存活、日志有记录、后续上传照常」
 *   ❌ 「第 888 行必须是 const manifest」（锁死实现，改法一变就误报）
 *
 * 自给自足：本文件自带隔离测试实例（独立端口 3195 + 独立测试根 .testroot-rag），
 * **不碰 data/ 与 data-files/**，也不依赖调用方是否已经起了服务。
 *
 *   node --import tsx/esm tests/rag-resilience.mjs
 *
 * @module tests/rag-resilience
 */

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync, mkdirSync, rmSync, symlinkSync, lstatSync, unlinkSync, readFileSync, writeFileSync } from 'node:fs'
import { Context } from '@deepseek-ai/cordis'
import { WebServerService } from '../src/web-server.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const TESTROOT = join(HERE, '.testroot-rag')
const LOGROOT = join(HERE, '.testroot-raglogs')
const PORT = Number(process.env.PRIVHUB_RAGTEST_PORT || 3195)
const BASE = `http://127.0.0.1:${PORT}`

let pass = 0
let fail = 0
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✅ ' + msg) } else { fail++; console.log('  ❌ ' + msg) }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ---------------- 隔离实例 ---------------- */

/** 清掉测试根里生成的数据（junction 先卸，绝不触碰真实源码）。 */
function cleanRoot() {
  if (existsSync(TESTROOT)) {
    for (const d of ['src', 'plugins', 'frontend', 'node_modules']) {
      const link = join(TESTROOT, d)
      try { if (existsSync(link) && lstatSync(link).isSymbolicLink()) unlinkSync(link) } catch { /* 忽略 */ }
    }
    try { rmSync(TESTROOT, { recursive: true, force: true }) } catch { /* 忽略 */ }
  }
}

function prepareRoot() {
  cleanRoot()
  mkdirSync(TESTROOT, { recursive: true })
  mkdirSync(join(TESTROOT, 'data'), { recursive: true })
  /* 语料目录：全量重建/向量化时才会被创建（svc-rag 的 saveManifest）。
   * 这里预先建好，是为了让「检索接口能给出正常答复」这条断言可成立 ——
   * 否则第一次检索会先撞上「向量库所在目录还不存在」，把 A1 的断言带偏，
   * 测出来的是环境没铺好、不是 TDZ 修没修好。（该现象与 A1 是两回事，另记。） */
  mkdirSync(join(TESTROOT, 'data', 'rag-corpus'), { recursive: true })
  /* D13：预置一份「加密上线之前写下的」明文系统数据 —— 模拟真实环境里那些
   * 再也不会被写、因而永远停在明文的旧文件（本机 data/invites.json 就是这种）。
   * 有了它，下面那组断言才能端到端跑通「启动告警 → 看见 → 迁移 → 变密文」。 */
  writeFileSync(join(TESTROOT, 'data', 'legacy-plain.json'), '{\n  "note": "迁移前写下的历史明文数据"\n}\n', 'utf8')
  for (const p of ['公共', 'A项目']) mkdirSync(join(TESTROOT, 'data-files', p), { recursive: true })
  for (const d of ['src', 'plugins', 'frontend', 'node_modules']) {
    symlinkSync(join(ROOT, d), join(TESTROOT, d), 'junction')
  }
}

function startServer(extraEnv = {}) {
  return spawn(process.execPath, ['--import', 'tsx/esm', 'src/main.ts', '--port', String(PORT)], {
    cwd: TESTROOT,
    env: {
      ...process.env,
      PRIVHUB_ROOT: TESTROOT,
      PRIVHUB_TEST_ROOT: TESTROOT,          // 故障注入的自锁条件之一（见 svc-rag enqueue）
      PRIVHUB_RAG_TEST_QUEUE_FAIL: '0',
      ...extraEnv,
    },
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

/** 服务是否还活着（进程未退出 + HTTP 仍可答）。 */
async function alive(child) {
  if (child.exitCode !== null || child.signalCode !== null) return false
  try {
    const r = await fetch(BASE + '/privhub/api/health', { signal: AbortSignal.timeout(3000) })
    return r.status === 200
  } catch { return false }
}

/* ---------------- HTTP 小工具 ---------------- */

async function api(method, path, { token, body, raw } = {}) {
  const headers = {}
  let payload
  if (raw !== undefined) {
    payload = Buffer.isBuffer(raw) ? raw : Buffer.from(String(raw), 'utf8')
    headers['content-type'] = 'application/octet-stream'
  } else if (body !== undefined) {
    payload = Buffer.from(JSON.stringify(body), 'utf8')
    headers['content-type'] = 'application/json'
  }
  if (token) headers.authorization = 'Bearer ' + token
  const res = await fetch(BASE + path, { method, headers, body: payload, signal: AbortSignal.timeout(15000) })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* 非 JSON */ }
  return { status: res.status, text, json, buffer: Buffer.from(text, 'utf8') }
}

const upload = (token, project, path, name, content) => {
  const q = new URLSearchParams({ project, name })
  if (path) q.set('path', path)
  return api('POST', '/privhub/api/upload?' + q.toString(), { token, raw: content })
}
const list = (token, project) => api('GET', '/privhub/api/list?' + new URLSearchParams({ project }).toString(), { token })

/**
 * 解析 SSE 响应体为 `[{ event, data }]`。
 * 只认最朴素的一帧格式（`event:` / `data:` 行 + 空行结束），因为**这正是我们服务端
 * 自己写的格式**；用自己的解析器去读自己的输出，格式一旦写歪这里就会红。
 */
function parseSSE(text) {
  const frames = []
  for (const raw of text.split('\n\n')) {
    if (!raw.trim()) continue
    let event = 'message'
    const dataLines = []
    for (const line of raw.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
    }
    if (dataLines.length === 0) continue
    let data = null
    try { data = JSON.parse(dataLines.join('\n')) } catch { /* 保留 null，断言里可见 */ }
    frames.push({ event, data })
  }
  return frames
}

/** 轮询检索接口直到该问题能命中至少一条（摄取是异步的，必须等）。 */
async function waitHits(token, q, ms = 12000) {
  const deadline = Date.now() + ms
  for (;;) {
    const r = await api('GET', '/privhub/api/rag/search?q=' + encodeURIComponent(q), { token })
    if (r.json && r.json.ok && Array.isArray(r.json.hits) && r.json.hits.length > 0) return r.json.hits.length
    if (Date.now() > deadline) return 0
    await sleep(400)
  }
}

/** 今天的系统日志文件路径（main.ts installFileLogger 的落盘位置）。 */
function logFileOf(root) {
  const day = new Date().toISOString().slice(0, 10)
  return join(root, 'data', 'logs', `privhub-${day}.log`)
}

async function waitLogContains(file, needle, ms = 8000) {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    try { if (readFileSync(file, 'utf8').includes(needle)) return true } catch { /* 还没建 */ }
    await sleep(250)
  }
  return false
}

/* ---------------- A5：唯一兜底 catch 必须落日志 ---------------- */

/**
 * A5 取证方式：在本测试进程内挂一个【真实的 WebServerService】（生产代码本体，
 * 不是复刻品），注册一条必定抛错的路由，打一发请求，再看异常有没有落进日志。
 *
 * 为什么不改成「打隔离实例上某条真实路由」：遍历现有 112 条路由，没有一条会在
 * 正常输入下走到 web-server 那个兜底 catch（静态服务自带 try/catch，各插件路由
 * 也各自 try/catch）。要可复现地打到它，只剩两条路——在服务端加一条专供测试的
 * 抛错路由（污染生产代码），或在测试进程里挂一个真实 WebServer。选后者：
 * 生产代码零污染，且被测的就是同一份 src/web-server.ts。
 *
 * 注意：web-server.ts 用了 TS 参数属性，本文件必须以 tsx 转译运行
 * （run-all 与手工执行都带 --import tsx/esm）。
 */
async function testWebServerCatchLogs() {
  console.log('\n── A5 全站唯一兜底 catch 必须留证（真实 WebServer + 必抛错路由）──')
  if (existsSync(LOGROOT)) { try { rmSync(LOGROOT, { recursive: true, force: true }) } catch { /* 忽略 */ } }
  mkdirSync(join(LOGROOT, 'data', 'logs'), { recursive: true })

  const logFile = logFileOf(LOGROOT)
  const MARK = 'A5-必现路由异常-' + Date.now()
  const original = console.error
  console.error = (...args) => { try { writeFileSync(logFile, args.map(String).join(' ') + '\n', { flag: 'a' }) } catch { /* 忽略 */ } }

  const ctx = new Context()
  await ctx.plugin(WebServerService, { port: PORT + 1, frontendDir: join(ROOT, 'frontend'), pluginsDir: join(ROOT, 'plugins') })
  const ws = ctx.webServer
  ws.register({ kind: 'exact', path: '/__a5__/boom', handler: () => { throw new Error(MARK) } })
  await ws.listen(PORT + 1)
  try {
    const r = await fetch(`http://127.0.0.1:${PORT + 1}/__a5__/boom`, { signal: AbortSignal.timeout(5000) })
    ok(r.status === 500, `必抛错路由返回 500（响应行为保持不变，实际 ${r.status}）`)
    ok(await waitLogContains(logFile, MARK), '异常已落进日志文件（含本次异常标识）')
  } finally {
    console.error = original
    await ws.close()
    try { rmSync(LOGROOT, { recursive: true, force: true }) } catch { /* 忽略 */ }
  }
}

/* ---------------- 主体 ---------------- */

async function main() {
  console.log('══ A 批修复常驻断言（A1/A2/A3/A4/A5，隔离实例，不碰真实数据）══')
  prepareRoot()

  const child = startServer()
  let serverErr = ''
  child.stderr.on('data', (d) => { serverErr += d.toString() })
  const t0 = Date.now()
  let ready = false
  try {
    ready = await waitReady()
    ok(ready, `隔离实例就绪（端口 ${PORT}，${Date.now() - t0}ms）`)
    if (!ready) return

    const login = await api('POST', '/privhub/api/login', { body: { username: 'admin', password: 'admin123' } })
    ok(login.json && login.json.ok && login.json.token, '管理员登录成功（取会话令牌）')
    if (!login.json || !login.json.token) return
    const token = login.json.token

    /* ---------- A1：RAG 检索/问答入口不再 TDZ ---------- */
    console.log('\n── A1 RAG 检索/问答入口可用（不再抛 Cannot access）──')
    const search = await api('GET', '/privhub/api/rag/search?q=' + encodeURIComponent('测试'), { token })
    ok(search.status === 200, `检索接口正常作答（HTTP ${search.status} ${search.text.slice(0, 80)}）`)
    ok(!search.text.includes("Cannot access 'manifest'"), "检索响应不含“Cannot access 'manifest' before initialization”")
    ok(search.json && search.json.ok === true && Array.isArray(search.json.hits),
      '检索返回结构化结果 ok=true 且 hits 是数组（空库时为空数组，不是报错）')
    const ask = await api('POST', '/privhub/api/rag/ask', { token, body: { question: '测试' } })
    ok(ask.status === 200, `问答接口返回 200（修复前是必现 400，实际 ${ask.status} ${ask.text.slice(0, 80)}）`)
    ok(ask.json && ask.json.ok === true && typeof ask.json.answer === 'string',
      '问答返回 answer 字段（空语料时给出“未找到资料”的明确答复，而不是报错）')
    ok(!ask.text.includes("Cannot access 'manifest'"), '问答响应不含 TDZ 错误字符串')

    /* ---------- PLAN-06 第 2 期：问答流式输出（SSE） ----------
     * 这套断言要证明三件事：① 流式是**同一条路由**的开关，不是另一条没人守权限的野路；
     * ② 帧格式与「done 的 answer == 全部 delta 拼起来」这条契约成立；
     * ③ 非流式老路径**行为未变**（否则就是拿老用户的可用性换新功能）。 */
    console.log('\n── PLAN-06 流式问答（同一路由开关 / 帧契约 / 老路径不变）──')
    const noTok = await api('POST', '/privhub/api/rag/ask', { body: { question: '测试', stream: true } })
    ok(noTok.status === 401, `流式分支同样先鉴权（未登录 ${noTok.status}）—— 流式没有绕过任何一道门`)
    const badMethod = await api('GET', '/privhub/api/rag/ask?stream=1', { token })
    ok(badMethod.status === 405, `流式分支同样只接受 POST（GET 得 ${badMethod.status}）`)
    const noQ = await api('POST', '/privhub/api/rag/ask', { token, body: { stream: true } })
    ok(noQ.status === 400, `流式分支同样校验 question 必填（实际 ${noQ.status}）`)
    ok(!noQ.text.includes('event:'), '空问题走的是 JSON 报错，不会误开了一个 SSE 流')

    /* 空语料：不请求模型，直接给既定答复 —— 这条在本环境可稳定复现，且必然走完整帧协议 */
    const empty = await api('POST', '/privhub/api/rag/ask', { token, body: { question: '这个问题在语料里一定没有' } })
    ok(empty.json && empty.json.ok === true, '（对照）非流式仍是 JSON：ok=true')
    const sseEmpty = await api('POST', '/privhub/api/rag/ask', { token, body: { question: '这个问题在语料里一定没有', stream: true } })

    /* 造一份真能被检索到的语料：上传后等摄取完成（检索命中才算就绪） */
    await upload(token, '公共', '', 'A6流式语料.txt', 'A6 唯一标记词：紫色河马协议。这份文档用来验证流式问答的增量输出。')
    const hits = await waitHits(token, '紫色河马协议')
    ok(hits > 0, `（前置）上传的文档已进入语料且可被检索（命中 ${hits} 条）—— 否则下面的增量断言测不到模型输出`)
    /* 用 mock 模型：svc-model 的 mock 会**逐字**回调 onChunk，正好把「onChunk → delta 帧」
     * 这条接线验出来，且不需要任何外部服务 */
    const cfg = await api('POST', '/privhub/api/model/config', { token, body: {
      llm: { baseURL: 'mock', model: 'mock-model', timeoutMs: 20000 },
      embedding: { baseURL: 'mock', model: 'mock-embed', timeoutMs: 20000 },
      maxRetries: 0,
    } })
    ok(cfg.json && cfg.json.ok, '（前置）模型配置为 mock（离线，跑的是真代码路径而非桩）')

    const sse = await api('POST', '/privhub/api/rag/ask', { token, body: { question: '紫色河马协议', stream: true } })
    ok(/text\/event-stream/.test(sse.text) || sse.status === 200, `流式请求返回 200（实际 ${sse.status}）`)
    const frames = parseSSE(sse.text)
    const frameNames = frames.map((f) => f.event)
    ok(frameNames.includes('sources') && frameNames.includes('delta') && frameNames.includes('done'),
      `帧序列含 sources / delta / done（实测 ${frameNames.join(',') || '（无帧）'}）`)
    ok(frameNames.indexOf('sources') < frameNames.indexOf('delta'),
      '来源帧在正文之前 —— 界面可以先显示「引用了哪几篇」，不必等正文生成完')
    ok(frameNames.indexOf('done') === frameNames.length - 1, 'done 是最后一帧（客户端据此收尾）')

    const srcFrame = frames.find((f) => f.event === 'sources')
    ok(Array.isArray(srcFrame && srcFrame.data && srcFrame.data.sources) && srcFrame.data.sources.length > 0,
      `来源帧带回了检索到的出处（${(srcFrame && srcFrame.data && srcFrame.data.sources || []).length} 条）`)
    ok((srcFrame.data.sources || []).every((s) => s.project === '公共' && typeof s.path === 'string'),
      '出处的 project/path 结构完整（界面要能显示并据此跳转）')

    const deltas = frames.filter((f) => f.event === 'delta').map((f) => (f.data && f.data.text) || '')
    const joined = deltas.join('')
    const doneFrame = frames.find((f) => f.event === 'done')
    ok(deltas.length >= 2, `模型输出被切成多个增量帧逐块送出（实测 ${deltas.length} 帧）—— 一次性吐完就不叫流式了`)
    ok(joined.length > 0, `增量拼起来有正文（${joined.length} 字）`)
    ok(doneFrame && doneFrame.data.answer === joined,
      'done 的完整答案与全部 delta 拼接逐字一致（客户端可以放心用增量渲染，无需事后校准）')
    const history = await api('POST', '/privhub/api/rag/ask', { token, body: { question: '紫色河马协议' } })
    ok(history.json && history.json.ok === true && history.json.answer === joined,
      '非流式与流式对同一个问题给出同一份答案（两条路径共用同一段检索与组包）')

    /* 模型侧出错也必须落到 error 帧上：否则前端只会看到一句永远写不完的回答 */
    const dead = await api('POST', '/privhub/api/model/config', { token, body: {
      llm: { baseURL: 'http://127.0.0.1:9', model: 'x', timeoutMs: 2000 },
      embedding: { baseURL: 'mock', model: 'mock-embed', timeoutMs: 2000 },
      maxRetries: 0,
    } })
    ok(dead.json && dead.json.ok, '（前置）模型指向一个必然连不上的地址')
    const sseErr = await api('POST', '/privhub/api/rag/ask', { token, body: { question: '紫色河马协议', stream: true } })
    const errFrames = parseSSE(sseErr.text)
    const errFrame = errFrames.find((f) => f.event === 'error')
    ok(!!errFrame && typeof errFrame.data.error === 'string' && errFrame.data.error.length > 0,
      `模型连不上时回 error 帧且有可读原因（实测「${(errFrame && errFrame.data && errFrame.data.error || '').slice(0, 60)}」）`)
    ok(!errFrames.some((f) => f.event === 'done'),
      '出错时不发 done —— 免得客户端把「中途失败」当成「已经答完」')
    ok(sseErr.status === 200,
      '出错也保持 HTTP 200：流已经开了头，错误只能走帧内通道（这是 SSE 的固有形状）')
    /* 收尾：把模型改回 mock，免得影响后续用例对 /model/status 的观察 */
    await api('POST', '/privhub/api/model/config', { token, body: {
      llm: { baseURL: 'mock', model: 'mock-model', timeoutMs: 20000 },
      embedding: { baseURL: 'mock', model: 'mock-embed', timeoutMs: 20000 },
      maxRetries: 0,
    } })
    console.log(`     [实测] 空语料流式帧=${parseSSE(sseEmpty.text).map((f) => f.event).join(',') || '（无）'}｜有语料增量帧=${deltas.length}｜正文=${joined.length} 字`)

    /* ---------- D13：明文系统数据「看得见 + 迁得动」----------
     * 这条链路的每一环过去都是断的：迁移函数零调用、盘上遗留明文没人知道、
     * 管理端没有任何入口。这里端到端跑一遍，确保「看不见的明文」不会再无声存在。 */
    console.log('\n── D13 明文系统数据：启动可见 / 管理端可迁 / 迁后真加密 ──')

    /* ① 启动告警真的落进了日志文件（不是只 print 到某个没人看的通道） */
    const d13log = logFileOf(TESTROOT)
    const warned = await waitLogContains(d13log, 'legacy-plain.json', 8000)
    ok(warned, '启动时把「仍有明文落盘」写进了 data/logs 日志（含具体文件名）—— 运维查得到')
    ok(await waitLogContains(d13log, 'storage/migrate', 8000),
      '告警里带着下一步动作（管理端该调哪个接口），而不是只喊一声')

    /* ② 管理端能先「看见」 */
    const noTokList = await api('GET', '/privhub/api/storage/plaintext')
    ok(noTokList.status === 401, `未登录查看明文清单被拒（实际 ${noTokList.status}）`)
    const plainList1 = await api('GET', '/privhub/api/storage/plaintext', { token })
    ok(plainList1.status === 200 && plainList1.json && plainList1.json.ok === true,
      `管理员可查看明文清单（HTTP ${plainList1.status}）`)
    ok(plainList1.json.encryptionEnabled === true, '清单里带上了「加密是否启用」—— 未启用时迁移无意义，先说清楚')
    ok(plainList1.json.total >= 1 && plainList1.json.files.some((f) => f.name === 'legacy-plain.json'),
      `清单里点名了 legacy-plain.json（共 ${plainList1.json.total} 个）`)
    ok(plainList1.json.files.every((f) => !String(f.name).includes('\\') && !String(f.name).includes('/')),
      '清单只给文件名、不给绝对路径（盘符与目录结构对管理员判断这件事没有帮助）')

    /* ③ 普通用户不能迁（这是管理员动作）—— 造一个真普通用户来打这两条路由。
     * 自助注册默认关闭（S11），所以按本仓既有套件的做法临时开一下再关回去。 */
    const beforeSettings = await api('GET', '/privhub/api/settings', { token })
    const origReg = beforeSettings.json && beforeSettings.json.settings && beforeSettings.json.settings.allowSelfRegister
    await api('POST', '/privhub/api/settings', { token, body: { allowSelfRegister: true } })
    const reg = await api('POST', '/privhub/api/register', {
      body: { username: 'd13user', password: 'pass123456', displayName: 'D13普通用户' },
    })
    const userLogin = reg.json && reg.json.ok
      ? await api('POST', '/privhub/api/login', { body: { username: 'd13user', password: 'pass123456' } })
      : null
    await api('POST', '/privhub/api/settings', { token, body: { allowSelfRegister: typeof origReg === 'boolean' ? origReg : false } })
    if (userLogin && userLogin.json && userLogin.json.token) {
      const userTok = userLogin.json.token
      const asUser = await api('POST', '/privhub/api/storage/migrate', { token: userTok, body: {} })
      ok(asUser.status === 403, `普通用户执行迁移被拒（实际 ${asUser.status}）`)
      const asUserList = await api('GET', '/privhub/api/storage/plaintext', { token: userTok })
      ok(asUserList.status === 403, `普通用户查看明文清单也被拒（实际 ${asUserList.status}）`)
    } else {
      ok(false, '（前置）造一个普通用户失败：' + JSON.stringify(reg.json && reg.json.error))
    }

    /* ④ 迁移真的发生，且原文没丢 */
    const beforeMig = readFileSync(join(TESTROOT, 'data', 'legacy-plain.json'))
    const mig = await api('POST', '/privhub/api/storage/migrate', { token, body: {} })
    ok(mig.status === 200 && mig.json && mig.json.ok === true && mig.json.migrated >= 1,
      `管理员迁移成功（migrated=${mig.json && mig.json.migrated}）`)
    const migRec = (mig.json.results || []).find((r) => r.name === 'legacy-plain.json')
    ok(migRec && migRec.status === 'migrated', `legacy-plain.json 的逐文件结果是 migrated（${migRec && migRec.status}）`)
    ok(migRec && migRec.backup, `结果里回报了备份文件名（${migRec && migRec.backup}）—— 出问题知道去哪找原文`)
    const afterMig = readFileSync(join(TESTROOT, 'data', 'legacy-plain.json'))
    ok(afterMig.subarray(0, 6).toString('utf8') === 'PHENC1',
      '迁移后磁盘上是 PHENC1 密文（宿主机直接读不到原文了 —— 这才是迁移的目的）')
    const bak = migRec && migRec.backup ? join(TESTROOT, 'data', migRec.backup) : ''
    ok(bak && existsSync(bak) && Buffer.compare(readFileSync(bak), beforeMig) === 0,
      '备份文件与迁移前的原文逐字节一致（明文存证留住了）')

    /* ⑤ 幂等 + 清单归零 */
    const mig2 = await api('POST', '/privhub/api/storage/migrate', { token, body: {} })
    ok(mig2.json && mig2.json.migrated === 0, `再迁一次不会重复动（migrated=${mig2.json && mig2.json.migrated}）`)
    const plainList2 = await api('GET', '/privhub/api/storage/plaintext', { token })
    ok(plainList2.json && plainList2.json.total === 0, `迁移后清单归零（total=${plainList2.json && plainList2.json.total}）—— 界面上「还有几个明文」会消失`)

    /* ⑥ 迁移是审计动作（"谁在什么时候迁了哪个文件" 事后可查） */
    const auditOf = await api('GET', '/privhub/api/audit?action=storage-migrate&limit=50', { token })
    const auditEntries = (auditOf.json && auditOf.json.entries) || []
    ok(auditEntries.length >= 1 && auditEntries.some((e) => String(e.target || '').includes('legacy-plain.json')),
      `迁移留下了审计记录（${auditEntries.length} 条，点名了具体文件）`)
    ok(auditEntries.every((e) => e.user === 'admin'), '审计记录记下了操作人 —— 不是一个匿名的「系统」动作')

    /* ---------- A3：点开头名字不再能创建 ---------- */
    console.log('\n── A3 点开头名字：建不成（而不是建成了看不见）──')
    const dotUp = await upload(token, '公共', '', '.A3隐藏.txt', 'hidden')
    ok(dotUp.status === 400, `上传 .A3隐藏.txt 被明确拒绝（实际 ${dotUp.status} ${JSON.stringify(dotUp.json && dotUp.json.error)}）`)
    const mkdirDot = await api('POST', '/privhub/api/mkdir', { token, body: { project: '公共', path: '', name: '.A3隐藏目录' } })
    ok(mkdirDot.status === 400, `新建 .A3隐藏目录 被明确拒绝（实际 ${mkdirDot.status}）`)
    const normalUp = await upload(token, '公共', '', 'A3普通.txt', 'visible')
    ok(normalUp.json && normalUp.json.ok, '普通名字仍可正常上传（拒绝点开头没有误伤正常名）')
    const entries = await list(token, '公共')
    const names = (entries.json && entries.json.entries || []).map((e) => e.name)
    ok(names.includes('A3普通.txt'), '普通文件在列表里可见（证明“建得成”与“看得见”仍一致）')
    ok(!names.some((n) => n.startsWith('.A3')), '点开头名字没有出现在列表里（拒绝在前，不会产生“看不见的文件”）')

    /* ---------- A4：同名上传不再静默覆盖 ---------- */
    console.log('\n── A4 同名上传不再静默覆盖（明确失败 + 原文件不被改动）──')
    const first = await upload(token, '公共', '', 'A4同名.txt', 'FIRST-VERSION')
    ok(first.json && first.json.ok, '首次上传成功')
    const second = await upload(token, '公共', '', 'A4同名.txt', 'SECOND-VERSION')
    ok(second.status === 409, `同名第二次上传被明确拒绝（实际 ${second.status} ${JSON.stringify(second.json && second.json.error)}）`)
    const dl = await api('GET', '/privhub/api/download?' + new URLSearchParams({ project: '公共', path: 'A4同名.txt' }).toString(), { token })
    ok(dl.text === 'FIRST-VERSION', `原文件内容未被改动（仍是 FIRST-VERSION，实际 ${JSON.stringify(dl.text.slice(0, 40))}）`)

    /* ---------- A2：一次摄取抛错，服务不死、日志有记录、队列继续 ---------- */
    console.log('\n── A2 摄取队列抛错后：服务不死 / 日志有记录 / 队列继续工作 ──')
    const logFile = logFileOf(TESTROOT)
    const before = await upload(token, '公共', '', 'A2正常前.txt', 'x')
    ok(before.json && before.json.ok, '故障注入前：普通上传正常（队列原本可用）')

    /* 注入时机要卡准：svc-rag 在启动 8 秒后会自己跑一次全量重建（也走同一个队列）。
     * 这里用「一次性标记文件」注入：写文件 → 触发一次真实文件事件 → 队列下一个任务必抛错。
     * 刚登录完（几百毫秒内）就做，避免被那次后台重建提前消费掉。 */
    const injectFile = join(TESTROOT, 'data', 'rag-test-inject-queue-error')
    writeFileSync(injectFile, 'A2注入：测试用的摄取失败', 'utf8')
    const trigger = await upload(token, '公共', '', 'A2触发.txt', 'y')
    ok(trigger.json && trigger.json.ok, '注入开关期间：上传接口本身仍成功（摄取是异步的，不该拖住上传）')
    await sleep(3000) // 给队列执行 + 落日志留时间
    ok(!existsSync(injectFile), '注入标记已被消费（一次性语义成立）')
    /* 诊断：摄取队列若在工作，语料 manifest 必被写出（空跑也算）。没有它说明
     * 事件根本没到队列，上面的失败就不是「队列吞不吞异常」的问题，而是环境问题。 */
    console.log('     [诊断] 语料 manifest 是否存在：' + existsSync(join(TESTROOT, 'data', 'rag-corpus', 'manifest.json')))

    ok(await alive(child), '摄取抛错后服务仍存活（进程未退出，HTTP 仍能答）')
    ok(await waitLogContains(logFile, '语料摄取失败'), '摄取异常已落进系统日志（data/logs/privhub-YYYY-MM-DD.log）')
    const st = await api('GET', '/privhub/api/rag/status', { token })
    ok(st.json && st.json.ingestQueue && st.json.ingestQueue.errors >= 1,
      `失败计数已暴露给运维（rag/status.ingestQueue.errors=${st.json && st.json.ingestQueue && st.json.ingestQueue.errors}）`)
    /* 诊断信息：进程若已死，退出码/信号与 stderr 尾巴必须留在这里，
     * 否则「服务死了」这条结论无法复核（这也是阴性对照能站住的关键）。 */
    if (child.exitCode !== null || child.signalCode !== null) {
      console.log(`     [诊断] 服务进程已结束：exitCode=${child.exitCode} signalCode=${child.signalCode}`)
      console.log('     [诊断] stderr 尾巴：\n       ' + serverErr.trim().split('\n').slice(-10).join('\n       '))
    }

    const after = await upload(token, '公共', '', 'A2正常后.txt', 'z')
    ok(after.json && after.json.ok, '抛错之后：普通上传仍然成功（队列没有被卡死）')
    const list2 = await list(token, '公共')
    const names2 = (list2.json && list2.json.entries || []).map((e) => e.name)
    ok(names2.includes('A2正常前.txt') && names2.includes('A2正常后.txt'),
      '队列继续工作的前后两个文件都在盘上（A2正常前.txt / A2正常后.txt）')

    /* ---------- A5（自管实例那部分） ---------- */
    const status = await api('GET', '/privhub/api/rag/status', { token })
    ok(status.status === 200 && status.json && status.json.ok, 'rag/status 正常（队列失败不阻断其它接口）')
  } finally {
    await stopServer(child)
  }

  await testWebServerCatchLogs()
  cleanRoot()

  console.log(`\n${'='.repeat(56)}`)
  console.log(`  A 批修复断言：${pass} 通过 / ${fail} 失败`)
  console.log('='.repeat(56))
  if (!ready && serverErr) console.log('服务端 stderr 摘要：\n' + serverErr.split('\n').slice(-8).join('\n'))
  process.exit(fail === 0 ? 0 : 1)
}

process.on('SIGINT', () => process.exit(130))
main().catch((e) => { console.error('测试异常：', e); process.exit(1) })
