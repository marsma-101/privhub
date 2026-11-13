/**
 * PrivHub 基线：/privhub/api/list 目录列表耗时（1000 / 5000 个文件）
 *
 * 只读用途 —— 不修改 privhub/ 下任何源码 / 配置 / 测试。
 * 自带隔离实例：
 *   root = docs/baseline/.timingroot（本脚本创建、跑完自己删）
 *   端口 = 3201（run-all 用 3190，生产 3180/3181 一律不碰）
 * 用 junction 把 privhub/ 的 src/plugins/frontend/node_modules 链进隔离根，
 * 与 tests/run-all.mjs --spawn 同一套做法。
 *
 * 用法（在 privhub/ 下运行）：
 *   node ../docs/baseline/list-timing.mjs
 *
 * 输出：
 *   stdout  —— 摘要
 *   docs/baseline/list-timing-samples.json —— 全部原始样本（每次请求的 ms）
 */

import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, existsSync, symlinkSync, rmSync, openSync, closeSync, writeSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { request as httpRequest } from 'node:http'

const HERE = dirname(fileURLToPath(import.meta.url))
const APP = 'G:\\program\\dsh-SQL\\privhub-1\\privhub'
const ROOT = join(HERE, '.timingroot')
const PORT = 3201
const BASE = `http://127.0.0.1:${PORT}`
const PROJECT = '公共'
const SAMPLES = 50   // 每轮 50 次
const ROUNDS = 3     // 3 轮
const WARMUP = 10

/* ---------- HTTP ---------- */
function req(method, path, { token, timeoutMs = 120000 } = {}) {
  const url = new URL(path, BASE)
  const headers = {}
  if (token) headers.authorization = 'Bearer ' + token
  return new Promise((resolve, reject) => {
    const r = httpRequest(
      { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers, timeout: timeoutMs },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          let json = null
          try { json = JSON.parse(text) } catch { /* 非 JSON */ }
          resolve({ status: res.statusCode, text, json })
        })
        res.on('error', reject)
      },
    )
    r.on('error', reject)
    r.on('timeout', () => r.destroy(new Error('timeout')))
    r.end()
  })
}

async function waitForServer(timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try { const r = await req('GET', '/', { timeoutMs: 3000 }); if (r.status === 200) return true } catch { /* 未就绪 */ }
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

async function login() {
  const body = JSON.stringify({ username: 'admin', password: 'admin123' })
  return new Promise((resolve, reject) => {
    const r = httpRequest(
      {
        hostname: '127.0.0.1', port: PORT, path: '/privhub/api/login', method: 'POST',
        headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) },
      },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          let j = null
          try { j = JSON.parse(text) } catch { /* ignore */ }
          if (!j || !j.token) return reject(new Error('login failed: ' + res.statusCode + ' ' + text.slice(0, 200)))
          resolve(j.token)
        })
      },
    )
    r.on('error', reject)
    r.write(body)
    r.end()
  })
}

/* ---------- 造目录 ---------- */
/** 造「密文形状」的文件：真实库里的用户文件都是 PHENC1（20 字节头 + 正文 + 16 字节 tag）。
 *  listFiles 对每个条目都会 isEncrypted() 读头 8 字节并做体积换算，所以样本用同一个头，
 *  让 I/O 形态与真实库一致。 */
const MAGIC = Buffer.from([0x50, 0x48, 0x45, 0x4e, 0x43, 0x31, 0x00, 0x01])
const HEAD = Buffer.concat([MAGIC, Buffer.alloc(12), Buffer.alloc(16)])

function makeFiles(dir, n) {
  mkdirSync(dir, { recursive: true })
  for (let i = 0; i < n; i++) {
    const fd = openSync(join(dir, `bench_${String(i).padStart(5, '0')}.md`), 'w')
    try { writeSync(fd, HEAD) } finally { closeSync(fd) }
  }
}

/* ---------- 统计 ---------- */
function percentile(sorted, p) {
  if (sorted.length === 0) return NaN
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[idx]
}

function summarize(samples) {
  const s = [...samples].sort((a, b) => a - b)
  const sum = s.reduce((a, b) => a + b, 0)
  return {
    n: s.length,
    min: +s[0].toFixed(2),
    p50: +percentile(s, 50).toFixed(2),
    p95: +percentile(s, 95).toFixed(2),
    max: +s[s.length - 1].toFixed(2),
    mean: +(sum / s.length).toFixed(2),
  }
}

/* ---------- 主流程 ---------- */
let child = null

async function main() {
  /* 1. 隔离根 + junction（与 tests/run-all.mjs --spawn 同构） */
  mkdirSync(join(ROOT, 'data'), { recursive: true })
  mkdirSync(join(ROOT, 'data-files', PROJECT), { recursive: true })
  for (const d of ['src', 'plugins', 'frontend', 'node_modules']) {
    const link = join(ROOT, d)
    if (!existsSync(link)) {
      try { symlinkSync(join(APP, d), link, 'junction') } catch (e) {
        throw new Error(`junction 创建失败 ${link}: ${e.message}`)
      }
    }
  }

  /* 2. 起隔离实例 */
  console.log(`[timing] spawn isolated instance on ${PORT}, root=${ROOT}`)
  child = spawn(process.execPath, ['--import', 'tsx/esm', 'src/main.ts', '--port', String(PORT)], {
    cwd: ROOT,
    env: { ...process.env, PRIVHUB_ROOT: ROOT },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.on('data', () => {})
  child.stderr.on('data', (d) => process.stderr.write('[server:err] ' + String(d)))
  if (!await waitForServer()) throw new Error('隔离实例未就绪')

  /* 3. 登录 */
  const token = await login()
  console.log('[timing] login ok')

  /* 4. 两档规模 */
  const plan = [1000, 5000]
  const out = {
    collectedAt: new Date().toISOString(),
    port: PORT,
    project: PROJECT,
    fileShape: 'PHENC1 header (8B magic + 12B iv) + 16B tag, 36B total, .md',
    samplesPerRound: SAMPLES,
    rounds: ROUNDS,
    warmup: WARMUP,
    results: {},
  }

  for (const n of plan) {
    const sub = `_timing_${n}`
    const dir = join(ROOT, 'data-files', PROJECT, sub)
    if (!existsSync(dir)) makeFiles(dir, n)
    const path = `/privhub/api/list?project=${encodeURIComponent(PROJECT)}&path=${encodeURIComponent(sub)}`

    for (let i = 0; i < WARMUP; i++) await req('GET', path, { token })
    const probe = await req('GET', path, { token })
    if (!probe.json || !probe.json.ok) throw new Error(`list failed ${probe.status}: ${probe.text.slice(0, 300)}`)
    const entries = probe.json.entries.length

    const perRound = []
    const all = []
    for (let r = 0; r < ROUNDS; r++) {
      const round = []
      for (let i = 0; i < SAMPLES; i++) {
        const t0 = process.hrtime.bigint()
        const res = await req('GET', path, { token })
        const t1 = process.hrtime.bigint()
        if (!res.json || !res.json.ok) throw new Error('list failed ' + res.status)
        const ms = Number(t1 - t0) / 1e6
        round.push(+ms.toFixed(3))
        all.push(ms)
      }
      perRound.push({ ...summarize(round), samples: round })
    }
    out.results[n] = { dir, entries, rounds: perRound, overall: summarize(all), allSamples: all.map((x) => +x.toFixed(3)) }
    console.log(`[timing] ${n} files (entries=${entries}) → p50=${summarize(all).p50}ms p95=${summarize(all).p95}ms max=${summarize(all).max}ms`)
  }

  writeFileSync(join(HERE, 'list-timing-samples.json'), JSON.stringify(out, null, 2), 'utf8')
  console.log('\n[timing] 摘要：')
  console.log(JSON.stringify({
    files1000: out.results[1000].overall,
    files5000: out.results[5000].overall,
    entries1000: out.results[1000].entries,
    entries5000: out.results[5000].entries,
    perRound1000: out.results[1000].rounds.map(({ samples, ...r }) => r),
    perRound5000: out.results[5000].rounds.map(({ samples, ...r }) => r),
  }, null, 2))
}

async function shutdown() {
  if (!child || child.exitCode !== null) return
  const done = new Promise((r) => child.once('exit', r))
  child.kill()
  const timedOut = await Promise.race([done.then(() => false), new Promise((r) => setTimeout(() => r(true), 2000))])
  if (timedOut) {
    child.kill('SIGKILL')
    await Promise.race([done, new Promise((r) => setTimeout(r, 2000))])
  }
}

main()
  .catch((e) => { console.error('[timing] 失败：', e && e.message); process.exitCode = 1 })
  .finally(async () => {
    await shutdown()
    try { if (existsSync(ROOT)) rmSync(ROOT, { recursive: true, force: true }) } catch (e) { console.error('[timing] 清理失败：', e.message) }
  })
