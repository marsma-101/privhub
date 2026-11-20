/**
 * 库搬迁引导 + 系统数据明文清单回归（issue #4 · 2.2 + 2.3）
 *
 * 2.2：老布局库点库搬迁空转无引导 → 空队列时检测 legacy 条目，返回 legacyPending + 引导文案。
 * 2.3：系统数据明文迁移只有 API 没有 UI → storage-panel 加密形态页加清单 + 一键迁移。
 *
 * A. 静态契约（前端，不需要服务）
 * B. 运行时（自起 3196 隔离实例）：
 *    · 干净库（无 legacy）搬迁启动 started=true，无 legacyPending 字段；
 *    · 造 legacy 条目较重（需要 scanLegacyRoot 驱动），改走 API 层验证：
 *      POST /storage/relocate 在纯 legacy 库上回 legacyPending>0 + 引导文案。
 *      造 legacy 的最短路径：直接往 data-files 放目录+文件（服务端 fileindex 不会自动扫），
 *      因此改为调用 legacy-scan API 扫 TESTROOT 内的老库目录（authentic 路径）。
 *    · 2.3 运行时：GET /storage/plaintext 返回 ok；POST /storage/migrate 幂等（0 或已加密）。
 *
 *   node tests/relocate-guide-verify.mjs
 *
 * @module tests/relocate-guide-verify
 */

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const PORT = 3196
const BASE = `http://127.0.0.1:${PORT}`
const TESTROOT = join(HERE, '.testroot-relocate-guide')

/* lib.mjs 的 BASE 在 import 时固化 —— 必须先设 env 再动态导入。 */
process.env.PRIVHUB_TEST_BASE = BASE
const { GET, POST, waitForServer } = await import('./lib.mjs')

let pass = 0
let fail = 0
const failures = []
function okc(cond, msg) {
  if (cond) { pass++ } else { fail++; failures.push(msg) }
  console.log((cond ? '  ✅ ' : '  ❌ ') + msg)
}

/* ================= A. 静态契约 ================= */

console.log('── A. 静态契约（前端文件存在即验）──')
const fsMod = await import('node:fs')
const panelSrc = fsMod.readFileSync(join(HERE, '../plugins/privhub-admin-console/client/relocate-panel.js'), 'utf8')
const storageSrc = fsMod.readFileSync(join(HERE, '../plugins/privhub-admin-console/client/storage-panel.js'), 'utf8')

okc(panelSrc.includes('legacyPending'), '2.2 · relocate-panel 消费 legacyPending 字段')
okc(panelSrc.includes('老库迁移') && panelSrc.includes('扫描 → 搬运'), '2.2 · 引导文案点明「老库迁移 扫描→搬运」路径')
okc(panelSrc.includes('v-if="status && status.legacyPending"'), '2.2 · 空状态区有 legacyPending 醒目提示块')
okc(storageSrc.includes('storage/plaintext'), '2.3 · storage-panel 调用 GET /storage/plaintext')
okc(storageSrc.includes('storage/migrate'), '2.3 · storage-panel 调用 POST /storage/migrate')
okc(storageSrc.includes('系统数据明文清单'), '2.3 · 加密形态页有明文清单卡片')
okc(storageSrc.includes('migratePlain') && storageSrc.includes('loadPlain'), '2.3 · 一键迁移与刷新方法存在')
okc(!storageSrc.includes('始终加密'), '2.3 · 「始终加密」静态文案已移除（换动态口径）')

/* ================= B. 运行时 ================= */

rmSync(TESTROOT, { recursive: true, force: true })
mkdirSync(join(TESTROOT, 'data'), { recursive: true })
mkdirSync(join(TESTROOT, 'data-files', '公共'), { recursive: true })
/* 造一个「老布局」目录：data-files 同级的老库根，内含一个项目目录 + 一个文件 */
const OLD_ROOT = join(TESTROOT, 'old-lib')
mkdirSync(join(OLD_ROOT, '老项目'), { recursive: true })
writeFileSync(join(OLD_ROOT, '老项目', 'doc.md'), '# 老库文档\n内容一行\n', 'utf8')

for (const d of ['src', 'plugins', 'frontend', 'node_modules']) {
  rmSync(join(TESTROOT, d), { force: true })
  const { symlinkSync } = await import('node:fs')
  symlinkSync(join(ROOT, d), join(TESTROOT, d), 'junction')
}

console.log(`\n── B. 运行时（隔离实例 ${PORT}）──`)
const child = spawn(process.execPath, ['--import', 'tsx/esm', 'src/main.ts', '--port', String(PORT)], {
  cwd: TESTROOT,
  env: { ...process.env, PRIVHUB_ROOT: TESTROOT, PRIVHUB_TEST_ROOT: TESTROOT },
  stdio: ['ignore', 'pipe', 'pipe'],
})
child.stdout.on('data', () => {})
child.stderr.on('data', (d) => process.stderr.write('[server:err] ' + d))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const alive = await waitForServer(60000)
  okc(alive, '隔离实例起得来')
  if (!alive) return

  const login = await POST('/privhub/api/login', { body: { username: 'admin', password: 'admin123' } })
  const admin = login.json?.token
  okc(!!admin, 'admin 登录')
  if (!admin) return

  /* 2.3 运行时：plaintext + migrate API（前端消费的就是这两个） */
  const pt = await GET('/privhub/api/storage/plaintext', { token: admin })
  okc(pt.json && pt.json.ok && typeof pt.json.total === 'number' && Array.isArray(pt.json.files),
    `GET /storage/plaintext 契约完整（total=${pt.json?.total}，files 数组）`)
  const mg = await POST('/privhub/api/storage/migrate', { token: admin })
  okc(mg.json && mg.json.ok && typeof mg.json.migrated === 'number',
    `POST /storage/migrate 可调用且幂等（migrated=${mg.json?.migrated}）`)
  const pt2 = await GET('/privhub/api/storage/plaintext', { token: admin })
  okc(pt2.json && pt2.json.total === 0, `迁移后明文清单归零（实测 ${pt2.json?.total}）`)

  /* 2.2 运行时：先造 legacy 条目（扫描老库根），再点库搬迁 → 应得引导而非空转。
   * 2026-11-20（issue #4 · 4.3）：legacy-scan 已后台化（回 202，不再同步带 scanned），
   * 断言改为轮询 GET /legacy-status 直到 pending ≥1（扫描把老库文件登记为 legacy）。 */
  const scan = await POST('/privhub/api/storage/legacy-scan', { token: admin, body: { oldRoot: OLD_ROOT } })
  okc(scan.json && scan.json.ok && scan.json.started === true,
    `legacy-scan 受理为后台任务（202：started=${scan.json?.started}）`)
  let legacyPending = 0
  for (let i = 0; i < 100; i++) {
    const st = await GET('/privhub/api/storage/legacy-status', { token: admin })
    if (st.json && st.json.ok && !st.json.running && (st.json.pending ?? 0) >= 1) { legacyPending = st.json.pending; break }
    if (st.json && !st.json.running && i > 3 && (st.json.lastError)) break // 扫描失败就别干等
    await sleep(100)
  }
  okc(legacyPending >= 1, `老库文件被登记为 legacy 条目（pending=${legacyPending}）`)

  const rl = await POST('/privhub/api/storage/relocate', { token: admin, body: { targetVolumeId: null, mode: 'decrypt' } })
  okc(rl.json && rl.json.started === false && rl.json.legacyPending > 0,
    `2.2 · 纯 legacy 库点搬迁 → started=false + legacyPending=${rl.json?.legacyPending}（status 侧实测 ${legacyPending}）`)
  okc(String(rl.json?.message || '').includes('老库迁移'), '2.2 · 引导文案点名「老库迁移」')
}

main().catch((e) => { console.error(e); fail++ }).finally(async () => {
  try { child.kill(); await new Promise((r) => child.once('exit', r)) } catch { /* ignore */ }
  rmSync(TESTROOT, { recursive: true, force: true })
  console.log(`\n${'='.repeat(56)}`)
  console.log(`  搬迁引导+明文清单回归（issue #4 · 2.2+2.3）：${pass} 通过 / ${fail} 失败`)
  for (const f of failures) console.log('   ❌ ' + f)
  console.log('='.repeat(56))
  process.exit(fail === 0 ? 0 : 1)
})
