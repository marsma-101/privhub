/**
 * 存储信息收集回归（privhub-svc-storeinfo，存储搬迁重构阶段 1 · v2 修订）
 *
 * 自包含：起 3197 端口隔离实例，进程内另挂一次 fileindex 验证旧索引兼容。
 *
 *   node --import tsx/esm tests/storeinfo-verify.mjs
 *
 * 覆盖：
 *   · admin 扫描：普通项目/老布局/个人空间登记、physicalPath 绝对路径、
 *     personal/visibility 标记、.pool 跳过、幂等
 *   · 非 system_admin 403
 *   · 旧格式索引（无新列）读入 + 扫描写入新列、旧条目不丢
 *   · 用户侧隐私不变：普通用户/管理员 GET /api/list 个人空间仍 403
 *
 * @module tests/storeinfo-verify
 */

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join, isAbsolute } from 'node:path'
import {
  existsSync, mkdirSync, rmSync, writeFileSync, readFileSync,
} from 'node:fs'
import { Context } from '@deepseek-ai/cordis'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const PORT = 3197
const BASE = `http://127.0.0.1:${PORT}`
const TESTROOT = join(HERE, '.testroot-storeinfo')

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
mkdirSync(join(DATA_FILES, '普通项目', '子目录'), { recursive: true })
writeFileSync(join(DATA_FILES, '普通项目', 'readme.md'), '# 项目说明\n', 'utf8')
writeFileSync(join(DATA_FILES, '普通项目', '子目录', 'data.csv'), 'a,b\n1,2\n', 'utf8')
/* .pool 系统目录：放个假文件，必须被跳过 */
mkdirSync(join(DATA_FILES, '.pool'), { recursive: true })
writeFileSync(join(DATA_FILES, '.pool', 'deadbeefdeadbeefdeadbeefdeadbeef.md'), 'pool secret\n', 'utf8')

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

/* 临时开启自助注册建号（学 personal-space.mjs）。 */
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

async function main() {
  const alive = await waitForServer(60000)
  okc(alive, '隔离实例起得来')
  if (!alive) return

  const admin = await loginOk('admin', 'admin123')
  okc(!!admin, 'admin 登录')

  /* 个人空间：实名注册自动创建目录（core 的注册路径真实造）。 */
  const reg = await registerUser(admin, 'storeinfo_u1', '张信息')
  okc(reg.json && reg.json.ok, '实名注册建个人空间（' + String(reg.json?.personalDir ?? reg.text.slice(0, 80)) + '）')
  writeFileSync(join(DATA_FILES, '张信息', '私人笔记.txt'), '私密内容\n', 'utf8')

  /* 建一个普通用户（非超管），验证 403。 */
  const reg2 = await registerUser(admin, 'storeinfo_u2', '李普通')
  okc(reg2.json && reg2.json.ok, '普通用户注册')
  const userTok = await loginOk('storeinfo_u2', 'test123456')

  /* ---------- 1. admin 扫描 ---------- */
  const scan = await POST('/privhub/api/storeinfo/scan', { token: admin, body: { volumeId: null } })
  okc(scan.status === 202 && scan.json?.started === true, `scan 受理为后台任务（202，实测 ${scan.status}）`)

  let st = null
  for (let i = 0; i < 100; i++) {
    const s = await GET('/privhub/api/storeinfo/status?volumeId=', { token: admin })
    if (s.json?.ok && !s.json?.run?.running && s.json?.run?.lastResult) { st = s.json; break }
    if (s.json?.run?.lastError) { st = s.json; break }
    await sleep(100)
  }
  okc(st && !st.run.running && !st.run.lastError, `扫描完成无错误${st?.run?.lastError ? '（' + st.run.lastError + '）' : ''}`)

  const created = st?.run?.lastResult?.created ?? -1
  /* 4 = 3 个文件（readme/data.csv/私人笔记）+ 1 个「子目录」虚拟目录行。
   * 目录行也走 createDir 计 created（scanLegacyRoot 既有语义）。 */
  okc(created === 4, `登记计数正确：3 文件 + 1 目录行 = 4（实测 created=${created}，failed=${JSON.stringify(st?.run?.lastResult?.failed ?? [])}）`)

  /* fileindex 落盘内容断言（TESTROOT 已传）。索引经 ctx.storage 加密落盘，
   * 直接 JSON.parse 磁盘字节会读到 PHENC1 头 —— 这里按解密口径剥离（同 main.ts 的做法：
   * 头 8 字节 magic + 12 iv，尾 16 tag，AES-256-GCM，密钥 = sha256(PRIVHUB_SECRET) 或 secret.key）。 */
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
  const entries = await readIndexEntries()
  const byPath = new Map(entries.map((e) => [e.project + '|' + e.virtualPath, e]))

  const readme = byPath.get('普通项目|readme.md')
  okc(!!readme, 'readme.md 已登记')
  okc(readme && isAbsolute(readme.physicalPath || '') && existsSync(readme.physicalPath),
    'physicalPath 是绝对路径且真实存在（' + String(readme?.physicalPath ?? '') + '）')
  okc(readme && readme.access && readme.access.visibility === 'project' && readme.personal !== true,
    '项目条目 access.visibility=project 且 personal 未标')
  okc(readme && readme.size === Buffer.byteLength('# 项目说明\n', 'utf8'),
    `明文长度口径正确（实测 ${readme?.size}）`)

  const sub = byPath.get('普通项目|子目录/data.csv')
  okc(!!sub && !!sub.physicalPath, '老布局子目录文件已登记（子目录/data.csv）')

  const note = byPath.get('张信息|私人笔记.txt')
  okc(!!note, '个人空间文件已登记（全量扫描含个人空间）')
  okc(note && note.personal === true && note.access?.visibility === 'personal',
    '个人空间条目 personal=true + visibility=personal')
  okc(note && note.access?.owner === '张信息',
    'access.owner=个人空间用户的显示名（实测 ' + String(note?.access?.owner ?? '') + '）')

  okc(!entries.some((e) => String(e.physicalPath || '').includes('.pool')),
    '.pool 里的假文件未被登记')

  /* ---------- 2. 幂等 ---------- */
  const scan2 = await POST('/privhub/api/storeinfo/scan', { token: admin, body: { volumeId: null } })
  okc(scan2.status === 202, '重复扫描受理')
  let st2 = null
  for (let i = 0; i < 100; i++) {
    const s = await GET('/privhub/api/storeinfo/status?volumeId=', { token: admin })
    if (s.json?.ok && !s.json?.run?.running && s.json?.run?.lastResult) { st2 = s.json; break }
    await sleep(100)
  }
  okc(st2?.run?.lastResult?.created === 0 && (st2?.run?.lastResult?.updated ?? 0) > 0,
    `重复扫描幂等：created=0、updated>0（实测 created=${st2?.run?.lastResult?.created}，updated=${st2?.run?.lastResult?.updated}）`)

  /* ---------- 3. 单飞 + cancel ---------- */
  const busyScan = await POST('/privhub/api/storeinfo/scan', { token: admin, body: { volumeId: null } })
  const busyOrOk = busyScan.status === 202 || busyScan.status === 409
  okc(busyOrOk, `并发 scan 回 202 或 409（实测 ${busyScan.status}）`)

  const cancel = await POST('/privhub/api/storeinfo/cancel', { token: admin, body: {} })
  okc(cancel.json?.ok === true, 'cancel 端点可用')

  /* ---------- 4. 非 system_admin 403 ---------- */
  const forbidden = await POST('/privhub/api/storeinfo/scan', { token: userTok, body: { volumeId: null } })
  okc(forbidden.status === 403, `普通用户 scan 应 403（实际 ${forbidden.status}）`)
  const forbidden2 = await GET('/privhub/api/storeinfo/status?volumeId=', { token: userTok })
  okc(forbidden2.status === 403, `普通用户 status 应 403（实际 ${forbidden2.status}）`)

  /* ---------- 4b. 条目清单路由（收尾任务 1） ---------- */
  const forbidden3 = await GET('/privhub/api/storeinfo/entries?volumeId=', { token: userTok })
  okc(forbidden3.status === 403, `普通用户 entries 应 403（实际 ${forbidden3.status}）`)
  const list = await GET('/privhub/api/storeinfo/entries?volumeId=&limit=500&offset=0', { token: admin })
  okc(list.status === 200 && list.json?.ok === true, `超管 GET entries 返回 ok（实际 ${list.status}）`)
  okc(Array.isArray(list.json?.entries), 'entries 是数组')
  okc(typeof list.json?.total === 'number', 'total 是数字（实测 ' + list.json?.total + '）')
  const listEntries = list.json?.entries ?? []
  const personalEntry = listEntries.find((e) => e.personal === true)
  okc(!!personalEntry && !!personalEntry.access?.owner, '清单含 personal 条目且带 access.owner（实测 ' + String(personalEntry?.access?.owner ?? '') + '）')
  okc(listEntries.every((e) => e.personal !== true || e.access?.visibility === 'personal'), 'personal 条目 visibility=personal')
  okc(listEntries.every((e) => !e.trashed && !e.isDir), '清单不含 trashed/目录条目')
  /* 排序：project+virtualPath 升序 */
  const sorted = [...listEntries].sort((a, b) =>
    a.project === b.project ? (a.virtualPath < b.virtualPath ? -1 : 1) : (a.project < b.project ? -1 : 1))
  okc(JSON.stringify(listEntries.map((e) => e.project + '|' + e.virtualPath))
    === JSON.stringify(sorted.map((e) => e.project + '|' + e.virtualPath)), '清单按 project+virtualPath 排序')
  /* 分页：limit=1 时 entries 长度 ≤1 且 offset=1 取到第二条 */
  if (listEntries.length >= 2) {
    const p1 = await GET('/privhub/api/storeinfo/entries?volumeId=&limit=1&offset=0', { token: admin })
    const p2 = await GET('/privhub/api/storeinfo/entries?volumeId=&limit=1&offset=1', { token: admin })
    okc((p1.json?.entries ?? []).length === 1 && (p2.json?.entries ?? []).length === 1
      && p1.json.entries[0].id === listEntries[0].id && p2.json.entries[0].id === listEntries[1].id,
      '分页 offset/limit 正确取窗口')
  } else {
    okc(false, '条目不足两条，分页断言未跑通（数据问题）')
  }
  /* encrypted 列逐条给出布尔判定 */
  okc(listEntries.length > 0 && listEntries.every((e) => typeof e.encrypted === 'boolean'),
    'limit 内条目逐条给出 encrypted 布尔判定')

  /* ---------- 5. 用户侧隐私不变 ---------- */
  const p1 = await GET('/privhub/api/list?' + new URLSearchParams({ project: '张信息' }), { token: userTok })
  okc(p1.status === 403 || p1.status === 404, `普通用户列他人个人空间仍 403/404（实际 ${p1.status}）`)
  const p2 = await GET('/privhub/api/list?' + new URLSearchParams({ project: '张信息' }), { token: admin })
  okc(p2.status === 403 || p2.status === 404, `管理员列他人个人空间仍 403/404（实际 ${p2.status}）`)

  /* ---------- 6. 旧格式索引兼容（进程内挂 fileindex） ---------- */
  console.log('\n── 旧索引兼容（进程内挂载）──')
  rmSync(join(TESTROOT, '.testroot-fi'), { recursive: true, force: true })
  const FI_ROOT = join(TESTROOT, '.testroot-fi')
  const FI_FILES = join(FI_ROOT, 'data-files')
  const FI_DATA = join(FI_ROOT, 'data')
  mkdirSync(join(FI_FILES, '兼容项目'), { recursive: true })
  mkdirSync(FI_DATA, { recursive: true })
  writeFileSync(join(FI_FILES, '兼容项目', 'old.txt'), '旧条目内容\n', 'utf8')
  writeFileSync(join(FI_FILES, '兼容项目', 'new.txt'), '新登记\n', 'utf8')
  /* 写一份**没有新列**的旧格式索引 JSON：一条已登记条目 + version=2。 */
  const legacyIndex = {
    version: 2,
    entries: [{
      id: 'Flegacytest0001',
      project: '兼容项目',
      virtualPath: 'old.txt',
      name: 'old.txt',
      ext: 'txt',
      isDir: false,
      size: Buffer.byteLength('旧条目内容\n', 'utf8'),
      mtime: Date.now(),
      physicalId: null,
      source: 'legacy',
      legacyPath: 'old.txt',
      aliases: [],
      createdAt: Date.now(),
      at: Date.now(),
    }],
  }
  /* 索引走 ctx.storage 加密落盘 —— 进程内挂 storage 后用 writeText 写，保证读得回来。 */
  process.env.PRIVHUB_ROOT = FI_ROOT
  process.env.PRIVHUB_DATA_ROOT = FI_ROOT
  process.env.PRIVHUB_DATA_FILES = FI_FILES
  const svcStoreMod = await import('../plugins/privhub-svc-storage/src/index.ts')
  const fiMod = await import('../plugins/privhub-svc-fileindex/src/index.ts')
  const ctx2 = new Context()
  await ctx2.plugin({ name: svcStoreMod.name, apply: svcStoreMod.apply, Config: svcStoreMod.Config },
    { enabled: true, keyFile: '', auditMagic: 'PHAUD1\0' })
  /* core 并不在本进程内：fileindex 的 apply 会取 ctx.privhub 注册路由 ——
   * 先垫一个最小 stub（route=no-op），这与 storage-migration.mjs 的进程内挂载同思路。 */
  ctx2.privhub = { route: () => {}, requireUser: () => null, standby: false, dataRoot: FI_FILES, users: new Map() }
  await ctx2.plugin({ name: fiMod.name, apply: fiMod.apply, Config: fiMod.Config }, { file: '', poolDir: '' })
  await ctx2.fileindex.ready
  await ctx2.storage.writeText(join(FI_DATA, 'fileindex.json'), JSON.stringify(legacyIndex, null, 2))
  await ctx2.fileindex.reload()

  okc(!!ctx2.fileindex.get('Flegacytest0001'), '旧格式索引读入：旧条目还在（无新列不丢条目）')
  const before = ctx2.fileindex.get('Flegacytest0001')
  okc(before && before.physicalPath === undefined && before.access === undefined && before.personal === undefined,
    '旧条目新列缺省 undefined（未强刷迁移）')

  /* 用 StoreInfoService 直接扫描（进程内，不打 HTTP）。 */
  const siMod = await import('../plugins/privhub-svc-storeinfo/src/index.ts')
  await ctx2.plugin({ name: siMod.name, apply: siMod.apply }, {})
  const res = await ctx2.storeinfo.scanVolume(null)
  okc(res.created === 1, `扫描登记新文件 old.txt 之外的 new.txt（实测 created=${res.created}）`)
  const fresh = ctx2.fileindex.getByPath('兼容项目', 'new.txt')
  okc(!!fresh && isAbsolute(fresh.physicalPath || ''), '扫描写入新列 physicalPath')
  const old2 = ctx2.fileindex.get('Flegacytest0001')
  okc(!!old2, '扫描后旧条目不丢')
  okc(old2 && isAbsolute(old2.physicalPath || ''), '扫描刷新旧条目的新列（physicalPath 补上）')
  okc(old2 && old2.access?.visibility === 'project', '旧条目 access 初始值=project')

  try { await ctx2.stop?.() } catch { /* ignore */ }
}

main().catch((e) => { console.error(e); fail++ }).finally(async () => {
  try { child.kill(); await new Promise((r) => child.once('exit', r)) } catch { /* ignore */ }
  rmSync(TESTROOT, { recursive: true, force: true })
  console.log(`\n${'='.repeat(56)}`)
  console.log(`  存储信息收集回归（storeinfo）：${pass} 通过 / ${fail} 失败`)
  for (const f of failures) console.log('   ❌ ' + f)
  console.log('='.repeat(56))
  process.exit(fail === 0 ? 0 : 1)
})
