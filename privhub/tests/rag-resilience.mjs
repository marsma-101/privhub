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
