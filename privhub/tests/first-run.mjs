/**
 * 首次部署（首次运行）回归
 *
 * 覆盖「全新宿主机安装后第一次启动」这条最关键的交付路径。
 *
 * 背景：实测发现全新部署存在**偶发启动失败** —— 多个插件在启动时并发调用
 * storage.ensureKey()，两者都判定 secret.key 不存在，随后并发写同一文件，
 * 一方的 writeFile 截断了另一方正在写的内容，读到不足 32 字节而抛错。
 * 该缺陷在已有数据的环境上不会出现（密钥已存在），只在首次部署时暴露，
 * 因此必须用「空目录 + 并发压力」来守住。
 *
 * 本测试反复清空数据目录并重启服务，验证：
 *   1. 每次都能成功启动（不再偶发失败）；
 *   2. 自动生成 secret.key / data / data-files；
 *   3. 默认账号可登录、健康检查可用；
 *   4. 密钥内容稳定（同一目录重启不重新生成，否则旧数据将无法解密）。
 *
 *   node tests/first-run.mjs [轮数]
 *
 * @module tests/first-run
 */

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync, rmSync, existsSync, readFileSync, statSync, symlinkSync, unlinkSync, lstatSync } from 'node:fs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const TESTROOT = join(HERE, '.firstrun')
const PORT = Number(process.env.PRIVHUB_FIRSTRUN_PORT || 3194)
const BASE = `http://127.0.0.1:${PORT}`
const ROUNDS = Number(process.argv[2] || 5)

let pass = 0
let fail = 0
function ok(cond, msg) {
  if (cond) { pass++ } else { fail++ }
  console.log((cond ? '  ✅ ' : '  ❌ ') + msg)
}

/**
 * 清空测试根的数据目录。
 * 注意：树内含指向真实源码的 junction，必须先 unlink 链接再删目录，
 * 不能依赖 rmSync 对 reparse point 的隐含语义（一旦判断有误会删掉真实源码）。
 */
function cleanData() {
  for (const d of ['data', 'data-files']) {
    const p = join(TESTROOT, d)
    if (!existsSync(p)) continue
    // data/ 与 data-files/ 是普通目录（junction 只在 src/plugins/frontend/node_modules）
    rmSync(p, { recursive: true, force: true })
  }
}

function prepareRoot() {
  mkdirSync(TESTROOT, { recursive: true })
  for (const d of ['src', 'plugins', 'frontend', 'node_modules']) {
    const link = join(TESTROOT, d)
    if (!existsSync(link)) symlinkSync(join(ROOT, d), link, 'junction')
  }
  cleanData()
}

async function waitReady(ms = 45000) {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    try {
      const r = await fetch(BASE + '/privhub/api/health', { signal: AbortSignal.timeout(2000) })
      if (r.status === 200) return true
    } catch { /* 未就绪 */ }
    await new Promise((r) => setTimeout(r, 300))
  }
  return false
}

function startServer() {
  return spawn(process.execPath, ['--import', 'tsx/esm', 'src/main.ts', '--port', String(PORT)], {
    cwd: TESTROOT,
    env: { ...process.env, PRIVHUB_ROOT: TESTROOT },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

async function stopServer(child) {
  if (child.exitCode !== null || child.signalCode !== null) return
  const done = new Promise((r) => child.once('exit', r))
  child.kill()
  const t = await Promise.race([done.then(() => false), new Promise((r) => setTimeout(() => r(true), 2000))])
  if (t) { child.kill('SIGKILL'); await Promise.race([done, new Promise((r) => setTimeout(r, 1500))]) }
}

async function main() {
  console.log(`══ 首次部署回归（${ROUNDS} 轮，每轮清空数据后冷启动）══\n`)
  prepareRoot()

  let allStarted = true
  const failures = []

  for (let round = 1; round <= ROUNDS; round++) {
    cleanData()
    const child = startServer()
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => { stdout += d.toString() })
    child.stderr.on('data', (d) => { stderr += d.toString() })

    try {
      const ready = await waitReady(40000)
      if (!ready) {
        allStarted = false
        const keyErr = /密钥文件长度/.test(stdout + stderr)
        failures.push(`第 ${round} 轮启动失败${keyErr ? '（密钥长度错误 —— 并发写竞态复发）' : ''}`)
        console.log(`  ❌ 第 ${round} 轮：服务未能启动`)
        const tail = (stdout + stderr).trim().split('\n').slice(-4).join('\n     ')
        console.log('     ' + tail)
        continue
      }

      // 基础可用性
      const hc = await (await fetch(BASE + '/privhub/api/health')).json()
      const login = await (await fetch(BASE + '/privhub/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' }),
      })).json()

      const keyOk = existsSync(join(TESTROOT, 'data', 'secret.key')) && statSync(join(TESTROOT, 'data', 'secret.key')).size === 32
      const dirsOk = existsSync(join(TESTROOT, 'data')) && existsSync(join(TESTROOT, 'data-files'))

      const okRound = hc.ok === true && login.ok === true && keyOk && dirsOk
      if (!okRound) { allStarted = false; failures.push(`第 ${round} 轮初始化不完整`) }
      console.log(`  ${okRound ? '✅' : '❌'} 第 ${round} 轮：启动成功 / 密钥 32B=${keyOk} / 目录=${dirsOk} / 默认账号登录=${login.ok === true}`)
    } finally {
      await stopServer(child)
    }
  }

  ok(allStarted, `${ROUNDS} 轮全新部署全部成功启动（无偶发失败）`)
  for (const f of failures) console.log('       ' + f)

  /* ---- 密钥稳定性：同一数据目录重启不应重新生成密钥 ---- */
  console.log('\n── 密钥稳定性（重启不得换密钥，否则旧数据永久无法解密） ──')
  cleanData()
  const c1 = startServer()
  try {
    if (await waitReady(40000)) {
      const k1 = readFileSync(join(TESTROOT, 'data', 'secret.key'))
      await stopServer(c1)

      const c2 = startServer()
      try {
        if (await waitReady(40000)) {
          const k2 = readFileSync(join(TESTROOT, 'data', 'secret.key'))
          ok(k1.equals(k2), '重启后密钥保持不变（同一数据目录）')
        } else {
          ok(false, '第二次启动失败')
        }
      } finally { await stopServer(c2) }
    } else {
      ok(false, '首次启动失败')
    }
  } finally { await stopServer(c1) }

  /* ---- 加密生效：首次启动后系统数据应为密文 ---- */
  console.log('\n── 首次启动即加密 ──')
  const usersFile = join(TESTROOT, 'data', 'users.json')
  if (existsSync(usersFile)) {
    const head = readFileSync(usersFile).subarray(0, 6).toString('latin1')
    ok(head === 'PHENC1', `新建的 users.json 即为密文（实际开头 ${JSON.stringify(head)}）`)
  } else {
    ok(false, '首次启动未生成 users.json')
  }

  // 清理（先卸 junction，避免误删真实源码）
  for (const d of ['src', 'plugins', 'frontend', 'node_modules']) {
    const link = join(TESTROOT, d)
    try { if (existsSync(link) && lstatSync(link).isSymbolicLink()) unlinkSync(link) } catch { /* 忽略 */ }
  }
  try { rmSync(TESTROOT, { recursive: true, force: true }) } catch { /* 忽略 */ }

  console.log(`\n${'='.repeat(56)}`)
  console.log(`  首次部署回归：${pass} 通过 / ${fail} 失败`)
  console.log('='.repeat(56))
  process.exit(fail === 0 ? 0 : 1)
}

process.on('SIGINT', () => process.exit(130))
main().catch((e) => { console.error('测试异常：', e); process.exit(1) })
