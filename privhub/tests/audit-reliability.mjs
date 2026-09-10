/**
 * 审计可靠性回归（D1 / D2 / D3）—— 2026-09-05「446MB 损坏事故」防复发测试
 *
 * 这是本项目最重要的数据安全测试，必须验证四件事：
 *   1. D1 迁移不再有并发竞态：多个并发首写只会迁移一次，不会把二进制密文再加密一遍；
 *   2. D1 内容特征守卫生效：非法格式文件会被拒绝迁移，而不是被"加密放大"；
 *   3. D2 保留策略真正生效：超期条目会被清理（原实现用墙钟取模，从不触发）；
 *   4. D3 全量重写是原子的：完成后文件完整、可正常解密读取。
 *
 * 做法：在独立测试根目录里预置一份【明文 JSONL】（含 5 条超期 + 5 条新鲜），
 * 启动全新服务进程（强制触发惰性迁移），再并发发起写操作，最后核对结果。
 *
 *   node tests/audit-reliability.mjs
 *
 * @module tests/audit-reliability
 */

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, statSync, symlinkSync } from 'node:fs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const TESTROOT = join(HERE, '.audittest')
const PORT = Number(process.env.PRIVHUB_AUDIT_TEST_PORT || 3192)
const BASE = `http://127.0.0.1:${PORT}`
const PRUNE_EVERY = 5

const DAY = 24 * 3600 * 1000
let pass = 0
let fail = 0

function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✅ ' + msg) }
  else { fail++; console.log('  ❌ ' + msg) }
}

async function req(method, path, { token, body, raw } = {}) {
  const headers = {}
  let payload = null
  if (raw !== undefined) payload = Buffer.isBuffer(raw) ? raw : Buffer.from(String(raw), 'utf8')
  else if (body !== undefined) { payload = Buffer.from(JSON.stringify(body), 'utf8'); headers['content-type'] = 'application/json' }
  if (token) headers.authorization = 'Bearer ' + token
  if (payload) headers['content-length'] = String(payload.length)

  const res = await fetch(BASE + path, { method, headers, body: payload })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* 非 JSON */ }
  return { status: res.status, text, json }
}

/**
 * 轮询审计条目直到数量稳定（写入链排空）。
 * 返回稳定后的条目数组；查询失败返回 null。
 */
async function settleAudit(token, { stableRounds = 3, intervalMs = 400, maxMs = 20000 } = {}) {
  const deadline = Date.now() + maxMs
  let prev = -1
  let stable = 0
  let last = null
  while (Date.now() < deadline) {
    const r = await req('GET', '/privhub/api/audit?limit=100000', { token })
    if (!r.json || !r.json.ok) return null
    const n = (r.json.entries || []).length
    last = r.json.entries || []
    if (n === prev) { stable++; if (stable >= stableRounds) return last }
    else { stable = 0; prev = n }
    await new Promise((res) => setTimeout(res, intervalMs))
  }
  return last
}

async function waitReady(ms = 60000) {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    try {
      // 任何 HTTP 响应都说明服务已在监听；测试根没有 frontend/，'/' 会是 404
      const r = await fetch(BASE + '/', { signal: AbortSignal.timeout(3000) })
      if (r.status > 0) return true
    } catch { /* 未就绪 */ }
    await new Promise((r) => setTimeout(r, 400))
  }
  return false
}

function prepareRoot() {
  rmSync(TESTROOT, { recursive: true, force: true })
  mkdirSync(join(TESTROOT, 'data'), { recursive: true })
  mkdirSync(join(TESTROOT, 'data-files', '公共'), { recursive: true })
  // 插件目录以 junction 链接（只读复用源码，数据仍落在测试根内）
  for (const d of ['plugins', 'frontend']) {
    symlinkSync(join(ROOT, d), join(TESTROOT, d), 'junction')
  }
  // 用户名与密码哈希沿用首次启动自动播种，无需预置
  const now = Date.now()
  const lines = []
  // 5 条超期（100 天前，超过默认 60 天保留期）——应被 D2 清理
  for (let i = 0; i < 5; i++) {
    lines.push(JSON.stringify({ id: 'old_' + i, at: now - 100 * DAY, user: 'admin', action: 'legacy-old', target: '公共/old' }))
  }
  // 5 条新鲜——必须完整保留
  for (let i = 0; i < 5; i++) {
    lines.push(JSON.stringify({ id: 'fresh_' + i, at: now - 1000, user: 'admin', action: 'legacy-fresh', target: '公共/fresh' }))
  }
  writeFileSync(join(TESTROOT, 'data', 'audit.jsonl'), lines.join('\n') + '\n', 'utf8')
  return { legacyTotal: 10, legacyOld: 5, legacyFresh: 5 }
}

async function main() {
  console.log('══ 审计可靠性回归（D1/D2/D3）══\n')
  const meta = prepareRoot()
  console.log(`[setup] 预置明文 JSONL：${meta.legacyTotal} 条（${meta.legacyOld} 超期 / ${meta.legacyFresh} 新鲜）`)
  console.log(`[setup] 测试根：${TESTROOT}   端口：${PORT}   prune 间隔：${PRUNE_EVERY}\n`)

  const child = spawn(process.execPath, ['--import', 'tsx/esm', 'src/main.ts', '--port', String(PORT)], {
    cwd: ROOT,
    env: { ...process.env, PRIVHUB_ROOT: TESTROOT, PRIVHUB_AUDIT_PRUNE_EVERY: String(PRUNE_EVERY) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let serverErr = ''
  let serverOut = ''
  let spawnError = null
  let exitInfo = null
  child.stderr.on('data', (d) => { serverErr += d.toString() })
  child.stdout.on('data', (d) => { serverOut += d.toString() })
  child.on('error', (e) => { spawnError = e })
  child.on('exit', (code, sig) => { exitInfo = { code, sig } })

  try {
    if (!await waitReady()) {
      console.log('  ❌ 测试服务未能启动')
      if (spawnError) console.log('     spawn 错误：' + spawnError.message)
      if (exitInfo) console.log(`     子进程已退出：code=${exitInfo.code} signal=${exitInfo.sig}`)
      console.log('     stdout：' + (serverOut.trim().slice(0, 500) || '（空）'))
      console.log('     stderr：' + (serverErr.trim().slice(0, 800) || '（空）'))
      fail++
      return
    }
    console.log('  ✅ 测试服务已启动（将触发明文→加密惰性迁移）')

    // 登录
    const login = await req('POST', '/privhub/api/login', { body: { username: 'admin', password: 'admin123' } })
    if (!login.json || !login.json.ok) { console.log('  ❌ 登录失败：' + login.text.slice(0, 160)); fail++; return }
    const token = login.json.token
    console.log('  ✅ 管理员登录成功')

    /* ---- D1：并发首写不应破坏迁移 ---- */
    // 立刻并发发起 12 个写操作（每个都会写审计），模拟"两个请求同时首写"的最坏情况
    const dirs = Array.from({ length: 12 }, (_, i) => '_ar_' + i)
    const mk = await Promise.all(dirs.map((name) =>
      req('POST', '/privhub/api/mkdir', { token, body: { project: '公共', name } })))
    ok(mk.every((r) => r.json && r.json.ok), `并发创建 12 个目录全部成功（失败 ${mk.filter((r) => !(r.json && r.json.ok)).length} 个）`)

    /* ---- D2：写入计数达到阈值后应清理超期条目 ---- */
    // 补足到超过 prune 阈值（12 次 mkdir 已写 12 条审计，阈值 5，已触发过清理）
    const extra = await Promise.all(Array.from({ length: 6 }, (_, i) =>
      req('POST', '/privhub/api/mkdir', { token, body: { project: '公共', name: '_ar_x' + i } })))
    ok(extra.every((r) => r.json && r.json.ok), '补充写入 6 个目录成功')

    // 审计写入相对 HTTP 响应是【异步】的（插件用 `void audit(...)` 不阻塞应答），
    // 因此必须等写入链排空后再断言——轮询到条数稳定为止。
    const entries = await settleAudit(token)
    if (entries === null) { console.log('  ❌ 审计查询失败'); fail++; return }
    const ids = new Set(entries.map((e) => e.id))
    const oldLeft = [...ids].filter((i) => String(i).startsWith('old_')).length
    const freshLeft = [...ids].filter((i) => String(i).startsWith('fresh_')).length
    const newOnes = entries.filter((e) => e.action === 'mkdir').length

    ok(entries.length > 0, `审计可正常解密读取，共 ${entries.length} 条`)
    ok(freshLeft === meta.legacyFresh, `新鲜的 ${meta.legacyFresh} 条历史记录全部保留（实际 ${freshLeft}）`)
    ok(oldLeft === 0, `D2 超期记录已被清理（残留 ${oldLeft} 条）`)
    ok(newOnes >= 18, `新写入的审计记录齐全（期望 ≥18，实际 ${newOnes}）`)
    ok(entries.every((e) => typeof e.at === 'number' && !Number.isNaN(e.at)), '所有记录时间戳合法（无二次编码损坏）')

    /* ---- D1 关键断言：文件必须是加密块格式，且体积合理 ---- */
    const auditPath = join(TESTROOT, 'data', 'audit.jsonl')
    ok(existsSync(auditPath), '审计文件存在')
    const head = readFileSync(auditPath).subarray(0, 8)
    ok(head.equals(Buffer.from('PHAUD1\u0000\u0000', 'latin1')), 'D1 文件头已是加密块魔数 PHAUD1（迁移成功）')

    const size = statSync(auditPath).size
    // 事故特征：875K 个块 / 426MB。正常应远小于 200KB
    ok(size < 200 * 1024, `D3 文件体积正常 ${size} 字节（阈值 200KB；事故时为 426MB）`)

    // 无残留临时文件
    const dataDir = readFileSync
    const leftovers = (await import('node:fs')).readdirSync(join(TESTROOT, 'data')).filter((f) => f.endsWith('.tmp'))
    ok(leftovers.length === 0, `无残留临时文件（发现 ${leftovers.length} 个）`)

    const warnLines = (serverOut + serverErr).split('\n').filter((l) => /audit|warn|error/i.test(l))
    console.log(`\n[info] 服务器告警：\n${warnLines.slice(0, 12).join('\n') || '（无）'}`)
  } finally {
    child.kill()
    await new Promise((r) => setTimeout(r, 600))
    if (!child.killed) child.kill('SIGKILL')
  }

  /* ══════════ 场景 2：内容非法时必须【拒绝迁移】，不得二次加密放大 ══════════
   * 这是 446MB 事故的直接防线：当时把二进制密文按 UTF-8 读入 → 按行切分 →
   * 每段再加密一遍 → 87 万块 / 426MB。守卫生效则文件体积必须保持不变。 */
  console.log('\n── 场景 2：损坏内容的防复发守卫 ──')
  const s2 = prepareRoot2()
  const child2 = spawn(process.execPath, ['--import', 'tsx/esm', 'src/main.ts', '--port', String(PORT)], {
    cwd: ROOT,
    env: { ...process.env, PRIVHUB_ROOT: TESTROOT, PRIVHUB_AUDIT_PRUNE_EVERY: String(PRUNE_EVERY) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let err2 = ''
  let out2 = ''
  child2.stderr.on('data', (d) => { err2 += d.toString() })
  child2.stdout.on('data', (d) => { out2 += d.toString() })
  try {
    if (await waitReady()) {
      const login2 = await req('POST', '/privhub/api/login', { body: { username: 'admin', password: 'admin123' } })
      const token2 = login2.json?.token
      await req('POST', '/privhub/api/mkdir', { token: token2, body: { project: '公共', name: '_guard_' } })
      await new Promise((r) => setTimeout(r, 2500))

      const after = statSync(s2.path).size
      ok(after === s2.size, `损坏文件未被二次加密放大（前 ${s2.size} → 后 ${after} 字节）`)
      ok(after < 200 * 1024, `体积仍在正常量级（${after} 字节，事故特征为 426MB）`)
      const logged = /\[audit\].*拒绝迁移/.test(out2 + err2)
      ok(logged, '服务端明确记录了「拒绝迁移」告警（失败可见，不再静默）')
      if (!logged) {
        console.log('     [debug] stdout 尾部：' + (out2.trim().split('\n').slice(-6).join(' | ') || '（空）'))
        console.log('     [debug] stderr 尾部：' + (err2.trim().split('\n').slice(-6).join(' | ') || '（空）'))
      }
    } else {
      ok(false, '场景 2 服务未能启动')
    }
  } finally {
    child2.kill()
    await new Promise((r) => setTimeout(r, 500))
    if (!child2.killed) child2.kill('SIGKILL')
  }

  /* ══════════ 场景 3：账号文件损坏必须「显著失败」，不得带病启动（D5） ══════════ */
  console.log('\n── 场景 3：账号库损坏的启动保护（D5） ──')
  const s3 = prepareRoot3()
  const child3 = spawn(process.execPath, ['--import', 'tsx/esm', 'src/main.ts', '--port', String(PORT)], {
    cwd: ROOT,
    env: { ...process.env, PRIVHUB_ROOT: TESTROOT },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  try {
    const early = await waitReady(6000)
    ok(!early, '账号文件损坏时服务拒绝启动（不再带病监听）')
    await new Promise((r) => setTimeout(r, 500))
    const stillBad = (() => { try { return statSync(s3.path).size === s3.size } catch { return false } })()
    ok(stillBad, '损坏的账号文件保持原样未被覆盖（可人工恢复）')
  } finally {
    child3.kill()
    await new Promise((r) => setTimeout(r, 500))
    if (!child3.killed) child3.kill('SIGKILL')
  }

  console.log(`\n${'='.repeat(56)}`)
  console.log(`  审计可靠性：${pass} 通过 / ${fail} 失败`)
  console.log('='.repeat(56))
  process.exit(fail === 0 ? 0 : 1)
}

/** 场景 3 的根目录：预置一个内容损坏的 users.json。 */
function prepareRoot3() {
  rmSync(TESTROOT, { recursive: true, force: true })
  mkdirSync(join(TESTROOT, 'data'), { recursive: true })
  mkdirSync(join(TESTROOT, 'data-files', '公共'), { recursive: true })
  for (const d of ['plugins', 'frontend']) {
    symlinkSync(join(ROOT, d), join(TESTROOT, d), 'junction')
  }
  const p = join(TESTROOT, 'data', 'users.json')
  const bad = Buffer.from('{ this is not valid json at all ', 'utf8')
  writeFileSync(p, bad)
  return { path: p, size: bad.length }
}

/** 场景 2 的根目录：预置一个「无魔数且非 JSONL」的损坏审计文件。 */
function prepareRoot2() {
  rmSync(TESTROOT, { recursive: true, force: true })
  mkdirSync(join(TESTROOT, 'data'), { recursive: true })
  mkdirSync(join(TESTROOT, 'data-files', '公共'), { recursive: true })
  for (const d of ['plugins', 'frontend']) {
    symlinkSync(join(ROOT, d), join(TESTROOT, d), 'junction')
  }
  // 首字节不是 PHAUD1 魔数，内容也不是 JSONL（含大量非 '{' 开头的二进制碎片）
  const blob = Buffer.concat([
    Buffer.from('XXXXXX\u0000\u0000', 'latin1'),
    Buffer.from('\u0001\u0002 junk line\n\u0010 more binary\n', 'latin1'),
    Buffer.alloc(300, 0xA5),
    Buffer.from('\nnot json here\n', 'latin1'),
  ])
  const p = join(TESTROOT, 'data', 'audit.jsonl')
  writeFileSync(p, blob)
  return { path: p, size: blob.length }
}

process.on('SIGINT', () => process.exit(130))
main().catch((e) => { console.error('测试异常：', e); process.exit(1) })
