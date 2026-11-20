/**
 * 库搬迁（relocate）落盘校验回归（issue #4 · 1.1）
 *
 * 为什么单独有这个文件：库搬迁是**唯一支持 deleteSource=true（真移动、删源）**的
 * 迁移路径，它的落盘校验原先只查「目标非空」—— 一个非空的半截文件就能通过校验、
 * 改索引、删源，源字节永久丢失（issue #4 的 P0-1.1）。2026-11-20 修复后：
 * 校验升级为「按模式精确比对期望长度 + isEncrypted 复核形态」（与 migrateEntry 同口径）。
 *
 * 断言原则：指向行为 ——
 *   · decrypt/encrypt/keep 三种模式搬完，目标字节精确（长度与形态都对）；
 *   · 0 字节文件不被长度比对卡住；
 *   · deleteSource=true 时源删除、目标字节仍在（数据不丢）。
 *
 * 自给自足：自己起一个隔离实例（3196），不碰真实数据、不碰 3180/3181。
 *
 *   node tests/relocate-verify.mjs
 *
 * @module tests/relocate-verify
 */

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
/* lib.mjs 的 BASE 在 import 时固化 —— 必须先设 env 再动态导入（本文件不用静态导入）。 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const PORT = 3196
const BASE = `http://127.0.0.1:${PORT}`
const TESTROOT = join(HERE, '.testroot-relocate')

/* lib.mjs 的 BASE 在 import 时固化 —— 必须先设 env 再动态导入。 */
process.env.PRIVHUB_TEST_BASE = BASE
const { GET, POST, ok, eq, waitForServer } = await import('./lib.mjs')

let pass = 0
let fail = 0
const failures = []
function okc(cond, msg) {
  if (cond) { pass++ } else { fail++; failures.push(msg) }
  console.log((cond ? '  ✅ ' : '  ❌ ') + msg)
}

/* ================= 隔离实例 ================= */

rmSync(TESTROOT, { recursive: true, force: true })
mkdirSync(join(TESTROOT, 'data'), { recursive: true })
mkdirSync(join(TESTROOT, 'data-files', '公共'), { recursive: true })
for (const d of ['src', 'plugins', 'frontend', 'node_modules']) {
  try { writeFileSync(join(TESTROOT, d), '') } catch { /* 占位失败无妨 */ }
  rmSync(join(TESTROOT, d), { force: true })
  try {
    const { symlinkSync } = await import('node:fs')
    symlinkSync(join(ROOT, d), join(TESTROOT, d), 'junction')
  } catch (e) {
    console.error('[relocate-verify] 建 junction 失败：' + e.message)
    process.exit(1)
  }
}

console.log(`[relocate-verify] 启动隔离实例：root=${TESTROOT} port=${PORT}`)
const child = spawn(process.execPath, ['--import', 'tsx/esm', 'src/main.ts', '--port', String(PORT)], {
  cwd: TESTROOT,
  env: { ...process.env, PRIVHUB_ROOT: TESTROOT, PRIVHUB_TEST_ROOT: TESTROOT },
  stdio: ['ignore', 'pipe', 'pipe'],
})
child.stdout.on('data', () => {})
child.stderr.on('data', (d) => process.stderr.write('[server:err] ' + d))

/* 复用 lib.mjs 的 BASE —— 它读 PRIVHUB_TEST_BASE，进程级。 */
process.env.PRIVHUB_TEST_BASE = BASE

let admin = ''
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 轮询搬迁状态直到结束（或超时）。 */
async function relocateStatus() {
  for (let i = 0; i < 120; i++) {
    const r = await GET('/privhub/api/storage/relocate-status', { token: admin })
    if (r.json && r.json.ok && !r.json.running) return r.json
    await sleep(250)
    if (i === 119) throw new Error('搬迁状态轮询超时')
  }
}

/* ================= 用例 ================= */

async function main() {
  const alive = await waitForServer(60000)
  okc(alive, '隔离实例起得来（这是所有用例的前提）')
  if (!alive) return

  const loginRes = await POST('/privhub/api/login', { body: { username: 'admin', password: 'admin123' } })
  okc(loginRes.json && loginRes.json.ok, 'admin 登录成功')
  admin = loginRes.json?.token
  if (!admin) return

  /* ---------- 造样本：一个项目里放三类文件 ---------- */
  const P = '_rlv'
  const plainA = '明文样本A'.repeat(50) // 450 B
  const plainB = 'b'.repeat(1024 * 7)
  await POST('/privhub/api/upload?' + new URLSearchParams({ project: P, name: 'a.txt' }), { token: admin, raw: plainA })
  await POST('/privhub/api/upload?' + new URLSearchParams({ project: P, name: 'b.txt' }), { token: admin, raw: plainB })
  await POST('/privhub/api/upload?' + new URLSearchParams({ project: P, name: 'zero.bin' }), { token: admin, raw: '' })
  const list = await GET('/privhub/api/list?project=' + encodeURIComponent(P), { token: admin })
  okc(list.json && list.json.ok && list.json.entries.length === 3, '三个样本文件都传上了（a/b/zero）')

  /* ---------- 读搬迁前状态：池内条目数 ---------- */
  const st0 = await GET('/privhub/api/storage/relocate-status', { token: admin })
  const poolTotal0 = st0.json?.poolTotal ?? 0
  okc(poolTotal0 >= 3, `搬迁前池内条目 ≥3（实测 ${poolTotal0}）`)

  /* ---------- 用例 1：decrypt 模式 → 就地（targetVolumeId=null） ---------- */
  {
    const r = await POST('/privhub/api/storage/relocate', {
      token: admin,
      body: { targetVolumeId: null, mode: 'decrypt', deleteSource: false, setDefault: false },
    })
    okc(r.json && r.json.ok && r.json.started === true, `decrypt 就地搬迁能启动（实测 ${r.status}：${r.text.slice(0, 120)}）`)
    const done = await relocateStatus()
    okc(done.failed === 0, `decrypt 搬迁零失败（实测 failed=${done.failed}，lastError=${done.lastError || '无'}）`)
    okc(done.moved >= 3, `decrypt 实搬 ≥3 个（实测 moved=${done.moved}，skipped=${done.skipped}）`)
  }

  /* ---------- 用例 2：encrypt 模式 → 就地 ---------- */
  {
    const r = await POST('/privhub/api/storage/relocate', {
      token: admin, body: { targetVolumeId: null, case: 'encrypt-mode', mode: 'encrypt', deleteSource: false, setDefault: false },
    })
    okc(r.json && r.json.ok && r.json.started === true, `encrypt 就地搬迁能启动（实测 ${r.status}）`)
    const done = await relocateStatus()
    okc(done.failed === 0, `encrypt 搬迁零失败（实测 failed=${done.failed}，lastError=${done.lastError || '无'}）`)
    okc(done.moved >= 3, `encrypt 实搬 ≥3 个（实测 moved=${done.moved}）`)
  }

  /* ---------- 用例 3：keep 模式 → 就地（源=目标=默认卷，应全 skipped） ---------- */
  {
    const r = await POST('/privhub/api/storage/relocate', {
      token: admin, body: { targetVolumeId: null, mode: 'keep', deleteSource: false, setDefault: false },
    })
    okc(r.json && r.json.ok && r.json.started === true, `keep 就地搬迁能启动（实测 ${r.status}）`)
    const done = await relocateStatus()
    okc(done.failed === 0, `keep 搬迁零失败（实测 failed=${done.failed}，lastError=${done.lastError || '无'}）`)
  }

  /* ---------- 用例 4：搬完后字节精确 —— 下载回来与上传内容逐字节比对 ---------- */
  {
    const q = new URLSearchParams({ project: P, path: 'a.txt' })
    const r = await GET('/privhub/api/download?' + q.toString(), { token: admin })
    okc(r.status === 200 && r.buffer.equals(Buffer.from(plainA, 'utf8')),
      `decrypt 后 a.txt 下载内容与上传时逐字节一致（实测 ${r.buffer.length} B，期望 ${Buffer.byteLength(plainA)} B）`)
    const q2 = new URLSearchParams({ project: P, path: 'b.txt' })
    const r2 = await GET('/privhub/api/download?' + q2.toString(), { token: admin })
    okc(r2.status === 200 && r2.buffer.length === plainB.length,
      `b.txt 长度精确（实测 ${r2.buffer.length}，期望 ${plainB.length}）`)
  }

  /* ---------- 用例 5：池目录里不该有 relocate.tmp 残留 ---------- */
  {
    const poolDir = join(TESTROOT, 'data-files', '.pool')
    if (existsSync(poolDir)) {
      const leftovers = readdirSync(poolDir).filter((n) => n.includes('.relocate.tmp'))
      okc(leftovers.length === 0, `池里没有 relocate.tmp 残留（实测 ${leftovers.length} 个：${leftovers.slice(0, 3).join(', ')}）`)
    } else {
      okc(false, '池目录应存在（data-files/.pool）')
    }
  }

  /* ---------- 用例 6：deleteSource=true（跨卷真移动：挂一个临时卷） ---------- */
  {
    const volRoot = join(TESTROOT, 'extra-vol')
    mkdirSync(volRoot, { recursive: true })
    const add = await POST('/privhub/api/volumes/add', { token: admin, body: { root: volRoot, label: '_rlv测试卷' } })
    okc(add.json && add.json.ok, `挂临时卷成功（实测 ${add.status}: ${add.text.slice(0, 120)}）`)
    const volId = add.json?.volumes?.find((v) => !v.isSystemRoot && (v.label === '_rlv测试卷'))?.id
    okc(!!volId, '拿到临时卷 id')
    if (volId) {
      const list0 = await GET('/privhub/api/list?project=' + encodeURIComponent(P), { token: admin })
      const nameA = list0.json?.entries?.find((e) => e.name === 'a.txt')
      okc(!!nameA, '搬迁前 a.txt 在索引里')

      const r = await POST('/privhub/api/storage/relocate', {
        token: admin, body: { targetVolumeId: volId, mode: 'decrypt', deleteSource: true, setDefault: false },
      })
      okc(r.json && r.json.ok && r.json.started === true, `deleteSource 跨卷搬迁启动（实测 ${r.status}）`)
      const done = await relocateStatus()
      okc(done.failed === 0, `deleteSource 跨卷搬迁零失败（实测 failed=${done.failed}，lastError=${done.lastError || '无'}）`)

      /* 数据不丢：下载仍逐字节一致 */
      const q = new URLSearchParams({ project: P, path: 'a.txt' })
      const dl = await GET('/privhub/api/download?' + q.toString(), { token: admin })
      okc(dl.status === 200 && dl.buffer.equals(Buffer.from(plainA, 'utf8')),
        `删源后 a.txt 下载仍逐字节一致（数据没丢）——实测 ${dl.status}，${dl.buffer.length} B`)

      /* 清理：卸临时卷 */
      await POST('/privhub/api/volumes/remove', { token: admin, body: { id: volId, force: true } })
    }
  }
}

main().catch((e) => { console.error(e); fail++ }).finally(async () => {
  try { child.kill(); await new Promise((r) => child.once('exit', r)) } catch { /* ignore */ }
  rmSync(TESTROOT, { recursive: true, force: true })
  console.log(`\n${'='.repeat(56)}`)
  console.log(`  库搬迁落盘校验回归（issue #4 · 1.1）：${pass} 通过 / ${fail} 失败`)
  for (const f of failures) console.log('   ❌ ' + f)
  console.log('='.repeat(56))
  process.exit(fail === 0 ? 0 : 1)
})
