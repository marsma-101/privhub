/**
 * 存储搬移执行回归（privhub-storeops，存储搬迁重构阶段 2）
 *
 * 自包含：起 3198 端口隔离实例。
 *
 *   node --import tsx/esm tests/storeops-verify.mjs
 *
 * 覆盖：
 *   · 扫描登记（转调 storeinfo 路由）→ move（decrypt, includePersonal=true）→
 *     全部条目物理字节在池里、physicalPath 快照更新、access/personal 不变、
 *     普通文件下载逐字节一致、personal 条目也搬了
 *   · 不带 includePersonal 的 move：personal 条目不动（数量断言）
 *   · encrypt 模式 + 0 字节文件（issue #4 · 1.1 回归点）：isEncrypted 且长度=36
 *   · 非 system_admin 403
 *   · 密钥预检 probeKeyMismatch 单元断言（明文样本→null；假密文头损坏 tag→mismatch）
 *   · 旧路由不受影响：POST /privhub/api/storage/relocate 仍可用（202）
 *
 * @module tests/storeops-verify
 */

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join, isAbsolute } from 'node:path'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const PORT = 3198
const BASE = `http://127.0.0.1:${PORT}`
const TESTROOT = join(HERE, '.testroot-storeops')

/* lib.mjs 的 BASE 在 import 时固化 —— 必须先设 env 再动态导入。 */
process.env.PRIVHUB_TEST_BASE = BASE
const { GET, POST, waitForServer, loginOk } = await import('./lib.mjs')

let pass = 0
let fail = 0
const failures = []
function okc(cond, msg) {
  if (cond) { pass++ } else { fail++; failures.push(msg) }
  console.log((cond ? '  ✅ ' : '  ❌ ') + msg)
}

/* ================= 造数据根 ================= */

rmSync(TESTROOT, { recursive: true, force: true })
const DATA_FILES = join(TESTROOT, 'data-files')
mkdirSync(join(DATA_FILES, '搬移项目'), { recursive: true })
writeFileSync(join(DATA_FILES, '搬移项目', 'readme.md'), '# 搬移样本\n', 'utf8')
writeFileSync(join(DATA_FILES, '搬移项目', 'zero.bin'), '', 'utf8') // 0 字节文件

for (const d of ['src', 'plugins', 'frontend', 'node_modules']) {
  rmSync(join(TESTROOT, d), { force: true })
  const { symlinkSync } = await import('node:fs')
  symlinkSync(join(ROOT, d), join(TESTROOT, d), 'junction')
}

console.log(`── 运行时（隔离实例 ${PORT}）──`)
const child = spawn(process.execPath, ['--import', 'tsx/esm', 'src/main.ts', '--port', String(PORT)], {
  cwd: TESTROOT,
  env: { ...process.env, PRIVHUB_ROOT: TESTROOT, PRIVHUB_TEST_ROOT: TESTROOT },
  stdio: ['ignore', 'pipe', 'pipe'],
})
child.stdout.on('data', () => {})
child.stderr.on('data', (d) => process.stderr.write('[server:err] ' + d))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function registerUser(admin, username, displayName) {
  const before = await GET('/privhub/api/settings', { token: admin })
  const orig = before.json?.settings?.allowSelfRegister
  try {
    await POST('/privhub/api/settings', { token: admin, body: { allowSelfRegister: true } })
    return await POST('/privhub/api/register', {
      body: { username, password: 'test123456', displayName },
    })
  } finally {
    await POST('/privhub/api/settings', {
      token: admin,
      body: { allowSelfRegister: typeof orig === 'boolean' ? orig : false },
    }).catch(() => null)
  }
}

/** 索引经 ctx.storage 加密落盘 —— 按解密口径剥离读回（学 storeinfo-verify）。 */
async function readIndexEntries() {
  const { createHash, createDecipheriv } = await import('node:crypto')
  const buf = readFileSync(join(TESTROOT, 'data', 'fileindex.json'))
  let json
  const MAGIC8 = Buffer.from([0x50, 0x48, 0x45, 0x4e, 0x43, 0x31, 0x00, 0x01])
  if (buf.length >= 36 && buf.subarray(0, 8).equals(MAGIC8)) {
    const key2 = process.env.PRIVHUB_SECRET && process.env.PRIVHUB_SECRET !== ''
      ? createHash('sha256').update(process.env.PRIVHUB_SECRET, 'utf8').digest()
      : readFileSync(join(TESTROOT, 'data', 'secret.key'))
    const iv = buf.subarray(8, 20)
    const body = buf.subarray(20, buf.length - 16)
    const tag = buf.subarray(buf.length - 16)
    const d = createDecipheriv('aes-256-gcm', key2, iv)
    d.setAuthTag(tag)
    json = Buffer.concat([d.update(body), d.final()]).toString('utf8')
  } else {
    json = buf.toString('utf8')
  }
  return (JSON.parse(json).entries ?? [])
}

/** 轮询搬移状态直到结束（或超时）。 */
async function moveStatus(admin) {
  for (let i = 0; i < 120; i++) {
    const r = await GET('/privhub/api/storeops/move-status', { token: admin })
    if (r.json && r.json.ok && !r.json.running) return r.json
    await sleep(250)
    if (i === 119) throw new Error('搬移状态轮询超时')
  }
}

async function main() {
  const alive = await waitForServer(60000)
  okc(alive, '隔离实例起得来')
  if (!alive) return

  const admin = await loginOk('admin', 'admin123')
  okc(!!admin, 'admin 登录')

  /* 个人空间 + 普通用户（403 用）。 */
  const reg = await registerUser(admin, 'storeops_u1', '张搬运')
  okc(reg.json && reg.json.ok, '实名注册建个人空间（' + String(reg.json?.personalDir ?? '') + '）')
  writeFileSync(join(DATA_FILES, '张搬运', '私人文件.txt'), '私密内容ABC\n', 'utf8')
  const reg2 = await registerUser(admin, 'storeops_u2', '李普通')
  okc(reg2.json && reg2.json.ok, '普通用户注册')
  const userTok = await loginOk('storeops_u2', 'test123456')

  /* ---------- 0. 密钥预检单元断言（probeKeyMismatch 平移函数） ---------- */
  console.log('\n── 密钥预检（probeKeyMismatch 单元断言）──')
  {
    const soMod = await import('../plugins/privhub-storeops/src/index.ts')
    /* 明文样本 → null（预检不拦截）。 */
    const plainFile = join(DATA_FILES, '搬移项目', 'readme.md')
    const r1 = await soMod.probeKeyMismatch(
      { storage: { isEncrypted: async () => false, readBuffer: async () => Buffer.alloc(0) } },
      [{ resolve: () => plainFile }],
    )
    okc(r1 === null, 'probeKeyMismatch：明文样本不拦截（返回 null）')
    /* 造一个「假密文头 + 损坏 tag」文件 → mismatch。 */
    const fakeEnc = join(TESTROOT, 'fake-enc.bin')
    const head = Buffer.from([0x50, 0x48, 0x45, 0x4e, 0x43, 0x31, 0x00, 0x01])
    writeFileSync(fakeEnc, Buffer.concat([head, Buffer.alloc(12), Buffer.alloc(16, 0x7f)]))
    /* 用真实的 storage 语义模拟：isEncrypted=true（头对）+ readBuffer 抛 GCM 认证失败。 */
    const gcmErr = new Error('Unsupported state or unable to authenticate data')
    const r2 = await soMod.probeKeyMismatch(
      { storage: { isEncrypted: async () => true, readBuffer: async () => { throw gcmErr } } },
      [{ resolve: () => fakeEnc }],
    )
    okc(typeof r2 === 'string' && r2.includes('密钥校验预检失败'), 'probeKeyMismatch：损坏密文头样本判为 mismatch（' + String(r2).slice(0, 40) + '）')
    /* 无密文样本 → null（跳过预检）。 */
    const r3 = await soMod.probeKeyMismatch(
      { storage: { isEncrypted: async () => true, readBuffer: async () => { throw gcmErr } } },
      [{ resolve: () => null }],
    )
    okc(r3 === null, 'probeKeyMismatch：无样本不拦截')
    rmSync(fakeEnc, { force: true })
  }

  /* ---------- 1. 非 system_admin 403 ---------- */
  console.log('\n── 守卫 ──')
  okc((await POST('/privhub/api/storeops/move', { token: userTok, body: {} })).status === 403, '普通用户 move 403')
  okc((await GET('/privhub/api/storeops/move-status', { token: userTok })).status === 403, '普通用户 move-status 403')
  okc((await POST('/privhub/api/storeops/move-cancel', { token: userTok, body: {} })).status === 403, '普通用户 move-cancel 403')
  okc((await POST('/privhub/api/storeops/scan+build', { token: userTok, body: {} })).status === 403, '普通用户 scan+build 403')
  okc((await GET('/privhub/api/storeops/status?volumeId=', { token: userTok })).status === 403, '普通用户 status 403')

  /* ---------- 2. 扫描登记（转调 storeinfo 路由） ---------- */
  console.log('\n── 扫描登记 ──')
  const scan = await POST('/privhub/api/storeinfo/scan', { token: admin, body: { volumeId: null } })
  okc(scan.status === 202, `storeinfo scan 受理（202，实测 ${scan.status}）`)
  let scanDone = null
  for (let i = 0; i < 100; i++) {
    const s = await GET('/privhub/api/storeinfo/status?volumeId=', { token: admin })
    if (s.json?.ok && !s.json?.run?.running && s.json?.run?.lastResult) { scanDone = s.json; break }
    if (s.json?.run?.lastError) { scanDone = s.json; break }
    await sleep(100)
  }
  okc(scanDone && !scanDone.run.lastError, `扫描完成无错误${scanDone?.run?.lastError ? '（' + scanDone.run.lastError + '）' : ''}`)

  /* 搬移前快照：条目形状与 access/personal。 */
  const before = await readIndexEntries()
  const beforeMap = new Map(before.filter((e) => !e.isDir).map((e) => [e.project + '|' + e.virtualPath, e]))
  const readme0 = beforeMap.get('搬移项目|readme.md')
  const note0 = beforeMap.get('张搬运|私人文件.txt')
  const zero0 = beforeMap.get('搬移项目|zero.bin')
  okc(!!readme0 && !!note0 && !!zero0, '扫描登记：项目文件/个人空间文件/0字节文件都在索引')
  okc(readme0 && readme0.source === 'legacy' && !readme0.physicalId, '扫描登记条目是 legacy 形状（physicalId=null）')

  /* ---------- 3. move（decrypt, targetVolumeId=null, includePersonal=true） ---------- */
  console.log('\n── move decrypt（含个人空间）──')
  const mv = await POST('/privhub/api/storeops/move', {
    token: admin,
    body: { targetVolumeId: null, mode: 'decrypt', deleteSource: false, setDefault: false, includePersonal: true, gapMs: 0 },
  })
  okc(mv.status === 202 && mv.json?.started === true, `move 受理为后台任务（202，实测 ${mv.status}：${(mv.text || '').slice(0, 100)}）`)
  okc((mv.json?.personalIncluded ?? 0) >= 1, `202 响应带 personalIncluded 统计（实测 ${mv.json?.personalIncluded}）`)
  const done1 = await moveStatus(admin)
  okc(done1.failed === 0, `搬移零失败（实测 failed=${done1.failed}，lastError=${done1.lastError || '无'}）`)
  okc(done1.moved >= 3, `实搬 ≥3 个（实测 moved=${done1.moved}，skipped=${done1.skipped}）`)
  okc((done1.personalIncluded ?? 0) >= 1, `move-status 带 personalIncluded（实测 ${done1.personalIncluded}）`)

  /* 搬移后断言。 */
  const after = await readIndexEntries()
  const afterMap = new Map(after.filter((e) => !e.isDir).map((e) => [e.project + '|' + e.virtualPath, e]))
  const readme1 = afterMap.get('搬移项目|readme.md')
  const note1 = afterMap.get('张搬运|私人文件.txt')
  const zero1 = afterMap.get('搬移项目|zero.bin')

  okc(readme1 && readme1.source === 'pool' && /^[0-9a-f]{32}$/.test(readme1.physicalId || ''),
    'readme.md 转 pool 形状（physicalId 32hex）')
  okc(readme1 && isAbsolute(readme1.physicalPath || '') && (readme1.physicalPath || '').includes('.pool') && existsSync(readme1.physicalPath),
    'readme.md physicalPath 快照=池路径且真实存在（' + String(readme1?.physicalPath ?? '') + '）')
  okc(note1 && note1.source === 'pool' && isAbsolute(note1.physicalPath || '') && (note1.physicalPath || '').includes('.pool'),
    'personal 条目也搬进池了（' + String(note1?.physicalPath ?? '') + '）')

  /* access/personal 搬移前后不变。 */
  okc(readme1 && JSON.stringify(readme1.access) === JSON.stringify(readme0.access) && readme1.personal !== true,
    'readme.md access/personal 搬移前后不变')
  okc(note1 && note1.personal === true && JSON.stringify(note1.access) === JSON.stringify(note0.access)
      && note1.access?.owner === '张搬运',
    '私人文件 personal=true + access.owner 搬移前后不变')

  /* 物理字节全在池里。 */
  const poolDir = join(DATA_FILES, '.pool')
  const allInPool = after.filter((e) => !e.isDir && (e.project === '搬移项目' || e.personal === true))
    .every((e) => e.source === 'pool' && e.physicalId && existsSync(join(poolDir, e.physicalId + (e.ext ? '.' + e.ext : ''))))
  okc(allInPool, '全部条目物理字节都在默认池里（data-files/.pool）')

  /* decrypt 模式：盘上应该是明文。 */
  const poolFilesCipher = []
  for (const e of after) {
    if (e.isDir || e.source !== 'pool') continue
    const p = join(poolDir, e.physicalId + (e.ext ? '.' + e.ext : ''))
    const b = readFileSync(p)
    if (b.subarray(0, 8).toString('latin1') === 'PHENC1\u0000\u0001') poolFilesCipher.push(e.virtualPath)
  }
  okc(poolFilesCipher.length === 0, `decrypt 后池里全部是明文（密文残留 ${poolFilesCipher.length} 个）`)

  /* 下载逐字节一致（普通文件）。 */
  {
    const q = new URLSearchParams({ project: '搬移项目', path: 'readme.md' })
    const dl = await GET('/privhub/api/download?' + q.toString(), { token: admin })
    okc(dl.status === 200 && dl.buffer.equals(Buffer.from('# 搬移样本\n', 'utf8')),
      `readme.md 下载内容逐字节一致（实测 ${dl.buffer.length} B）`)
  }

  /* ---------- 4. encrypt 模式 + 0 字节文件（1.1 回归点） ---------- */
  console.log('\n── move encrypt + 0 字节 ──')
  const mv2 = await POST('/privhub/api/storeops/move', {
    token: admin,
    body: { targetVolumeId: null, mode: 'encrypt', deleteSource: false, setDefault: false, includePersonal: true, gapMs: 0 },
  })
  okc(mv2.status === 202, `encrypt move 受理（实测 ${mv2.status}）`)
  const done2 = await moveStatus(admin)
  okc(done2.failed === 0, `encrypt 搬移零失败（实测 failed=${done2.failed}，lastError=${done2.lastError || '无'}）`)
  const after2 = await readIndexEntries()
  const zero2 = after2.find((e) => !e.isDir && e.project === '搬移项目' && e.virtualPath === 'zero.bin')
  okc(!!zero2 && zero2.source === 'pool' && existsSync(zero2.physicalPath || ''),
    '0 字节文件搬移后仍在池里')
  if (zero2 && existsSync(zero2.physicalPath)) {
    const zb = readFileSync(zero2.physicalPath)
    okc(zb.length === 36 && zb.subarray(0, 8).toString('latin1') === 'PHENC1\u0000\u0001',
      `0 字节文件 encrypt 后 isEncrypted 且长度=36（实测 ${zb.length} B）`)
  }

  /* ---------- 5. 不带 includePersonal：personal 条目不动 ---------- */
  console.log('\n── move 不含个人空间 ──')
  /* 先 decrypt 回明文，方便断言「不动」。 */
  await POST('/privhub/api/storeops/move', { token: admin, body: { targetVolumeId: null, mode: 'decrypt', includePersonal: true, gapMs: 0 } })
  await moveStatus(admin)
  const midEntries = await readIndexEntries()
  const noteMid = midEntries.find((e) => !e.isDir && e.project === '张搬运' && e.virtualPath === '私人文件.txt')
  const notePhysicalBefore = noteMid?.physicalPath
  const noteIdBefore = noteMid?.physicalId

  const mv3 = await POST('/privhub/api/storeops/move', {
    token: admin,
    body: { targetVolumeId: null, mode: 'decrypt', deleteSource: false, setDefault: false, includePersonal: false, gapMs: 0 },
  })
  okc(mv3.status === 202, `不带 includePersonal 的 move 受理（实测 ${mv3.status}）`)
  const done3 = await moveStatus(admin)
  okc(done3.failed === 0 && (done3.personalIncluded ?? 0) === 0,
    `本轮不含 personal（personalIncluded=${done3.personalIncluded}，failed=${done3.failed}）`)
  const after3 = await readIndexEntries()
  const note3 = after3.find((e) => !e.isDir && e.project === '张搬运' && e.virtualPath === '私人文件.txt')
  okc(note3 && note3.physicalId === noteIdBefore && note3.physicalPath === notePhysicalBefore,
    '不带 includePersonal 时 personal 条目完全不动（physicalId/physicalPath 不变）')

  /* ---------- 6. status 转调 ---------- */
  console.log('\n── status 转调 ──')
  const st = await GET('/privhub/api/storeops/status?volumeId=', { token: admin })
  okc(st.status === 200 && st.json?.ok === true && typeof st.json?.entries === 'number',
    `GET /storeops/status 透传 storeinfo 统计（entries=${st.json?.entries}）`)

  /* ---------- 7. 旧路由不受影响 ---------- */
  console.log('\n── 旧路由 ──')
  const old = await POST('/privhub/api/storage/relocate', {
    token: admin,
    body: { targetVolumeId: null, mode: 'decrypt', deleteSource: false, setDefault: false },
  })
  okc(old.status === 202 && old.json?.started === true, `旧 relocate 路由仍可用（实测 ${old.status}）`)
  let oldDone = null
  for (let i = 0; i < 120; i++) {
    const r = await GET('/privhub/api/storage/relocate-status', { token: admin })
    if (r.json && r.json.ok && !r.json.running) { oldDone = r.json; break }
    await sleep(250)
  }
  okc(oldDone && oldDone.failed === 0, `旧 relocate 搬迁零失败（实测 failed=${oldDone?.failed}）`)
}

main().catch((e) => { console.error(e); fail++ }).finally(async () => {
  try { child.kill(); await new Promise((r) => child.once('exit', r)) } catch { /* ignore */ }
  rmSync(TESTROOT, { recursive: true, force: true })
  console.log(`\n${'='.repeat(56)}`)
  console.log(`  存储搬移执行回归（storeops）：${pass} 通过 / ${fail} 失败`)
  for (const f of failures) console.log('   ❌ ' + f)
  console.log('='.repeat(56))
  process.exit(fail === 0 ? 0 : 1)
})
