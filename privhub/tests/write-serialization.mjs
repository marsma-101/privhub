/**
 * 并发写串行化回归（D6）
 *
 * 目的：证明「读-改-写」类落盘点在**并发**下不丢记录。
 *
 * 背景：这些插件的数据文件都是「一份 JSON、全系统共用」，写入模式统一是
 *   `读全量 → 改一份 → 写全量`。单次写盘是原子的（svc-storage 走 tmp+rename），
 *   但这个**序列**不是：两个并发请求各自读到同一份旧数据、各自写回，后者覆盖前者。
 *   表现是「我刚发的邀请码库里没有」「我明明收藏了却不见了」「管理员刚签发的 Key 立刻 401」。
 *   收口方式是把整段序列包进 `ctx.privhub.withFileLock(<文件绝对路径>, …)`。
 *
 * 本套件不验实现（不数 `withFileLock` 出现几次），只验**行为**：
 *   N 个请求同时打同一个落盘点，请求全部成功后，N 条记录必须一条不少地读得回来。
 *   每条用例都带一个可解释的失败信号：数量对不上 = 并发下丢更新。
 *
 * 为什么能真正测到：请求是并发发出的，且每条落盘点内部都有 `await`（读盘/解密），
 *   未串行化时交错窗口是确定存在的。
 *
 * 自带实例：端口 3199（绝不指向 3180/3181 的真实数据），根目录 tests/.testroot-writelock。
 *   node tests/write-serialization.mjs
 *
 * @module tests/write-serialization
 */

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync, mkdirSync, symlinkSync, rmSync } from 'node:fs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const E2E_ROOT = join(HERE, '.testroot-writelock')
const PORT = Number(process.env.PRIVHUB_WRITELOCK_PORT || 3199)
const BASE = `http://127.0.0.1:${PORT}`
const ADMIN = { username: 'admin', password: 'admin123' }
const PROJECT = '公共'
/** 并发度：足够交错，又不至于把测试拖长。 */
const N = 12

/* ---------------- 断言（自带，不依赖 tests/lib 的全局 BASE） ---------------- */

let passed = 0
const failures = []
function ok(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ ${msg}`) }
  else { failures.push(msg); console.log(`  ❌ ${msg}`) }
}
function eq(actual, expected, msg) {
  ok(actual === expected, `${msg}（期望 ${expected}，实际 ${actual}）`)
}

/* ---------------- 隔离实例 ---------------- */

function prepareRoot() {
  mkdirSync(E2E_ROOT, { recursive: true })
  /* 只清「数据目录」，**不删代码 junction**：本套件断言的是精确条数，
   * 上一轮残留的数据会让计数虚高；而删 junction 有误穿源码目录的风险，没必要冒。 */
  for (const d of ['data', 'data-files']) {
    try { rmSync(join(E2E_ROOT, d), { recursive: true, force: true }) } catch { /* 忽略 */ }
  }
  mkdirSync(join(E2E_ROOT, 'data'), { recursive: true })
  for (const p of ['公共', 'A项目', 'B项目']) mkdirSync(join(E2E_ROOT, 'data-files', p), { recursive: true })
  for (const d of ['src', 'plugins', 'frontend', 'node_modules']) {
    const link = join(E2E_ROOT, d)
    try { if (!existsSync(link)) symlinkSync(join(ROOT, d), link, 'junction') } catch { /* 已存在或权限不足 */ }
  }
}

let serverStderr = ''
function startServer() {
  const c = spawn(process.execPath, ['--import', 'tsx/esm', 'src/main.ts', '--port', String(PORT)], {
    cwd: E2E_ROOT,
    env: { ...process.env, PRIVHUB_ROOT: E2E_ROOT, PRIVHUB_TEST_ROOT: E2E_ROOT },
    stdio: ['ignore', 'ignore', 'pipe'],
  })
  c.stderr.on('data', (d) => { serverStderr += String(d) })
  return c
}

async function stopServer(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return
  const done = new Promise((r) => child.once('exit', r))
  child.kill()
  const t = await Promise.race([done.then(() => false), new Promise((r) => setTimeout(r, 2000))])
  if (t) { child.kill('SIGKILL'); await Promise.race([done, new Promise((r) => setTimeout(r, 1500))]) }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

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

/** 并发打同一落盘点：全部发出后再 await，确保请求在时间上重叠。 */
function burst(fns) {
  return Promise.all(fns.map((f) => f()))
}

/* ---------------- 用例 ---------------- */

async function run() {
  prepareRoot()
  console.log(`\n── D6 并发写串行化（隔离实例 ${PORT}，root=${E2E_ROOT}）──`)
  const child = startServer()
  try {
    const ready = await waitReady()
    ok(ready, `隔离实例在 ${PORT} 上就绪`)
    if (!ready) throw new Error('服务器未就绪')

    const login = await api('POST', '/privhub/api/login', { body: ADMIN })
    const token = login.json?.token
    ok(!!token, `管理员登录成功（${login.status}）`)
    if (!token) throw new Error('登录失败：' + login.text.slice(0, 120))

    /* ---- 1. 设置：四个字段并发改，必须全部生效（合并写不得互相覆盖） ---- */
    {
      const want = { theme: 'dark', defaultView: 'list', maxUploadMB: 1234, allowSelfRegister: false }
      const rs = await burst([
        () => api('POST', '/privhub/api/settings', { token, body: { theme: 'dark' } }),
        () => api('POST', '/privhub/api/settings', { token, body: { defaultView: 'list' } }),
        () => api('POST', '/privhub/api/settings', { token, body: { maxUploadMB: 1234 } }),
        () => api('POST', '/privhub/api/settings', { token, body: { allowSelfRegister: false } }),
      ])
      ok(rs.every((r) => r.status === 200), '4 个并发设置写入均返回 200')
      const get = await api('GET', '/privhub/api/settings', { token })
      const s = get.json?.settings ?? {}
      eq(s.theme, want.theme, '并发改主题后 theme 保留')
      eq(s.defaultView, want.defaultView, '并发改视图后 defaultView 保留')
      eq(s.maxUploadMB, want.maxUploadMB, '并发改上传上限后 maxUploadMB 保留')
      eq(s.allowSelfRegister, want.allowSelfRegister, '并发改注册开关后 allowSelfRegister 保留')
      console.log('     （四个字段必须同时生效：任一丢失 = 读-改-写未串行化，后写覆盖先写）')
    }

    /* ---- 2. 收藏：N 条并发收藏，一条不少 ---- */
    {
      const rs = await burst(Array.from({ length: N }, (_, i) =>
        () => api('POST', '/privhub/api/favorites', { token, body: { project: PROJECT, path: `_lock/f${i}.txt`, name: `f${i}.txt` } })))
      ok(rs.every((r) => r.status === 200), `${N} 条并发收藏均返回 200`)
      const get = await api('GET', '/privhub/api/favorites', { token })
      ok(get.status === 200 && Array.isArray(get.json?.favorites), `收藏列表可读（GET ${get.status}）`)
      const list = get.json?.favorites ?? []
      eq(list.length, N, `收藏列表保留全部 ${N} 条`)
    }

    /* ---- 3. 最近打开：最密集的写入点，N 条并发不得互相覆盖 ---- */
    {
      const rs = await burst(Array.from({ length: N }, (_, i) =>
        () => api('POST', '/privhub/api/recent', { token, body: { project: PROJECT, path: `_lock/r${i}.txt`, name: `r${i}.txt` } })))
      ok(rs.every((r) => r.status === 200), `${N} 条并发「最近打开」均返回 200`)
      const get = await api('GET', '/privhub/api/recent', { token })
      eq((get.json?.recent ?? []).length, N, `最近列表保留全部 ${N} 条`)
    }

    /* ---- 4. 批注：同一文件 N 条并发批注 ---- */
    {
      const rs = await burst(Array.from({ length: N }, (_, i) =>
        () => api('POST', '/privhub/api/comments', { token, body: { project: PROJECT, path: '_lock/doc.md', text: `批注${i}`, start: i, end: i + 1 } })))
      ok(rs.every((r) => r.status === 200), `${N} 条并发批注均返回 200`)
      const get = await api('GET', `/privhub/api/comments?project=${encodeURIComponent(PROJECT)}&path=${encodeURIComponent('_lock/doc.md')}`, { token })
      eq((get.json?.comments ?? []).length, N, `批注列表保留全部 ${N} 条`)
    }

    /* ---- 5. 邀请码：凭据类，并发签发一条都不能丢 ---- */
    {
      const M = 8
      const projects = Array.from({ length: M }, (_, i) => `LockP${i}`)
      const rs = await burst(projects.map((p) =>
        () => api('POST', `/privhub/api/invite/create?project=${encodeURIComponent(p)}`, { token })))
      ok(rs.every((r) => r.status === 200 && r.json?.code), `${M} 个并发邀请码均签发成功`)
      const get = await api('GET', '/privhub/api/invite/list', { token })
      const codes = (get.json?.invites ?? []).map((i) => i.code)
      const got = new Set(codes)
      const missing = projects.filter((p, i) => !rs[i].json?.code || !got.has(rs[i].json.code))
      eq(missing.length, 0, `邀请列表保留全部 ${M} 个并发签发的邀请码`)
    }

    /* ---- 6. Agent 密钥：并发签发，全部可查（凭据丢失最不可接受） ---- */
    {
      const M = 8
      const rs = await burst(Array.from({ length: M }, (_, i) =>
        () => api('POST', '/privhub/api/agent/v1/keys', { token, body: { name: `lock-k${i}`, username: 'admin', scope: { kind: 'all' } } })))
      ok(rs.every((r) => r.status === 200 && r.json?.id), `${M} 个并发 Agent 密钥均签发成功`)
      const get = await api('GET', '/privhub/api/agent/v1/keys', { token })
      const ids = new Set((get.json?.keys ?? []).map((k) => k.id))
      const missing = rs.filter((r) => !r.json?.id || !ids.has(r.json.id))
      eq(missing.length, 0, `Agent 密钥列表保留全部 ${M} 个并发签发的密钥`)
    }

    /* ---- 7. 文档版本：N 次并发保存 = N 条版本记录（共享 index.json） ---- */
    {
      const docPath = '_lock_doc.md'
      const create = await api('PUT', '/privhub/api/doc', { token, body: { project: PROJECT, path: docPath, doc: 'v0' } })
      ok(create.status === 200, '建立文档基线成功')
      const rs = await burst(Array.from({ length: N }, (_, i) =>
        () => api('PUT', '/privhub/api/doc', { token, body: { project: PROJECT, path: docPath, doc: `v${i}` } })))
      ok(rs.every((r) => r.status === 200), `${N} 次并发保存均返回 200`)
      const get = await api('GET', `/privhub/api/doc/versions?project=${encodeURIComponent(PROJECT)}&path=${encodeURIComponent(docPath)}`, { token })
      eq((get.json?.versions ?? []).length, N, `版本历史保留全部 ${N} 条（共享 index.json 未丢记录）`)
    }

    /* ---- 8. 通用文件版本：N 条并发快照（共享 versions.json，另有第二个写入者） ---- */
    {
      const txtPath = '_lock.txt'
      const mk = await api('POST', '/privhub/api/text/save', { token, body: { project: PROJECT, path: txtPath, text: 'seed' } })
      ok(mk.status === 200, '建立文本基线成功')
      const rs = await burst(Array.from({ length: N }, (_, i) =>
        () => api('POST', '/privhub/api/versions/snapshot', { token, body: { project: PROJECT, path: txtPath } })))
      ok(rs.every((r) => r.status === 200), `${N} 次并发快照均返回 200`)
      const get = await api('GET', `/privhub/api/versions?project=${encodeURIComponent(PROJECT)}&path=${encodeURIComponent(txtPath)}`, { token })
      eq((get.json?.versions ?? []).length, N, `版本快照保留全部 ${N} 条（共享 versions.json 未丢记录）`)
    }

    /* ---- 9. 装配零告警：并发用例若把某个插件打挂，stderr 会说话 ---- */
    ok(!/插件加载失败|Cannot find module/.test(serverStderr), '服务端 stderr 无插件加载失败')
  } finally {
    await stopServer(child)
  }

  console.log(`\n${'='.repeat(56)}`)
  console.log(`  结果：${passed} 通过 / ${failures.length} 失败`)
  console.log('='.repeat(56))
  return failures.length === 0
}

run()
  .then((pass) => process.exit(pass ? 0 : 1))
  .catch((e) => { console.error('[write-serialization] 运行异常：', e); process.exit(1) })
