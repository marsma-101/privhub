#!/usr/bin/env node
/**
 * 存储根配置 / 密钥安全回归（GitHub issue #2）
 *
 * 覆盖使用端提出的三条 P0：
 *   REQ-1 文件库根可独立配置，服务启动后能看到外部库里的项目；
 *   REQ-2 已有密文但缺 secret.key 时，拒绝启动、绝不自动生成新密钥；
 *   REQ-3 显式配置的库根不存在时拒绝启动（不再给一个空库假象）。
 *
 * 另外验证 scripts/verify-store.mjs 的只读体检结论，以及源码里没有盘符硬编码。
 *
 *   node tests/store-config.mjs
 *
 * 自包含：在 tests/.storecfg 下起一个隔离实例（端口 3193），不触碰 3180/3181，
 * 也不触碰仓库里的真实 data/、data-files/。
 *
 * @module tests/store-config
 */

import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'
import {
  mkdirSync, rmSync, existsSync, readFileSync, writeFileSync, symlinkSync, unlinkSync, renameSync, lstatSync,
} from 'node:fs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const TESTROOT = join(HERE, '.storecfg')
const SYSTEM_ROOT = join(TESTROOT, 'system')
const LIBRARY_ROOT = join(TESTROOT, 'library', 'data-files')
const CONFIG_DIR = join(TESTROOT, 'config')
const PORT = 3193
const BASE = `http://127.0.0.1:${PORT}`
const CONTROL_TOKEN = 'storecfg-test-token-0123456789abcdef'

let pass = 0
let fail = 0
function ok(cond, msg, detail) {
  if (cond) { pass++ } else { fail++ }
  console.log((cond ? '  ✅ ' : '  ❌ ') + msg + (!cond && detail ? '\n     ' + detail : ''))
}

/** 先拆 junction 再删目录：绝不能顺着链接删到真实源码。 */
function cleanRoot() {
  if (!existsSync(TESTROOT)) return
  for (const d of ['src', 'plugins', 'frontend', 'node_modules']) {
    const p = join(TESTROOT, d)
    try {
      if (lstatSync(p).isSymbolicLink()) unlinkSync(p)
    } catch { /* 不存在 */ }
  }
  rmSync(TESTROOT, { recursive: true, force: true })
}

function prepareRoot() {
  cleanRoot()
  mkdirSync(TESTROOT, { recursive: true })
  for (const d of ['src', 'plugins', 'frontend', 'node_modules']) {
    symlinkSync(join(ROOT, d), join(TESTROOT, d), 'junction')
  }
  mkdirSync(SYSTEM_ROOT, { recursive: true })
  mkdirSync(LIBRARY_ROOT, { recursive: true })
  mkdirSync(CONFIG_DIR, { recursive: true })
  /* 外部库里的项目：服务端必须能把它当成顶层项目列出来。 */
  mkdirSync(join(LIBRARY_ROOT, '外部项目A'), { recursive: true })
  writeFileSync(join(LIBRARY_ROOT, '外部项目A', '说明.txt'), 'hello from external library\n', 'utf8')
}

function serverEnv(extra = {}) {
  return {
    ...process.env,
    PRIVHUB_ROOT: TESTROOT,
    PRIVHUB_DATA_ROOT: SYSTEM_ROOT,
    PRIVHUB_DATA_FILES: LIBRARY_ROOT,
    PRIVHUB_CONFIG_DIR: CONFIG_DIR,
    PRIVHUB_CONTROL_TOKEN: CONTROL_TOKEN,
    ...extra,
  }
}

function startServer(env = serverEnv()) {
  const child = spawn(process.execPath, ['--import', 'tsx/esm', 'src/main.ts', '--port', String(PORT)], {
    cwd: TESTROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let out = ''
  child.stdout.on('data', (d) => { out += d.toString() })
  child.stderr.on('data', (d) => { out += d.toString() })
  return { child, output: () => out }
}

async function waitReady(ms = 60000) {
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

async function stopServer(child) {
  if (child.exitCode !== null || child.signalCode !== null) return
  const done = new Promise((r) => child.once('exit', r))
  child.kill()
  const stuck = await Promise.race([done.then(() => false), new Promise((r) => setTimeout(() => r(true), 3000))])
  if (stuck) { child.kill('SIGKILL'); await Promise.race([done, new Promise((r) => setTimeout(r, 1500))]) }
}

async function waitExit(child, ms = 30000) {
  if (child.exitCode !== null || child.signalCode !== null) return true
  const done = new Promise((r) => child.once('exit', () => r(true)))
  return Promise.race([done, new Promise((r) => setTimeout(() => r(false), ms))])
}

function verifyStore(env = serverEnv()) {
  return spawnSync(process.execPath, ['scripts/verify-store.mjs', '--json'], {
    cwd: ROOT, env, encoding: 'utf8', timeout: 60000,
  })
}

async function main() {
  console.log('══ 存储根配置 / 密钥安全回归 ══\n')
  prepareRoot()

  /* ---- 1. 分裂三根启动：外部库可见 ---- */
  console.log('— 1. 显式配置系统数据根 + 独立文件库根 —')
  let srv = startServer()
  let ready = await waitReady()
  ok(ready, '服务在分裂三根配置下启动成功', srv.output().split('\n').slice(-8).join('\n'))
  if (ready) {
    let checkBody = null
    try {
      const r = await fetch(BASE + '/privhub/api/runtime/store-check', {
        headers: { 'x-privhub-control-token': CONTROL_TOKEN },
        signal: AbortSignal.timeout(20000),
      })
      checkBody = await r.json()
    } catch (e) { checkBody = { error: e.message } }
    ok(checkBody?.ok === true, '切流前存储自检通过', JSON.stringify(checkBody).slice(0, 400))
    ok(checkBody?.check?.library?.projects === 1, '文件库根被正确识别（1 个项目）',
      JSON.stringify(checkBody?.check?.library || null))
    ok(checkBody?.check?.library?.dataFiles === LIBRARY_ROOT, '自检回报的库根 = 显式配置的目录',
      String(checkBody?.check?.library?.dataFiles))
  }

  /* ---- 2. verify-store 体检 ---- */
  console.log('\n— 2. scripts/verify-store.mjs 只读体检 —')
  if (ready) {
    const v = verifyStore()
    ok(v.status === 0, '体检命令退出码 0', (v.stdout || '') + (v.stderr || ''))
    let parsed = null
    try {
      const text = v.stdout || ''
      parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
    } catch { /* 下面断言会失败 */ }
    ok(parsed?.ok === true && parsed?.library?.projects === 1, '体检结果：库可见且项目数=1',
      (v.stdout || '').slice(-500))
  }
  await stopServer(srv.child)

  /* ---- 2b. config/store.json：不设环境变量也能指向外部库 ---- */
  console.log('\n— 2b. config/store.json 配置（更新/回滚不会覆盖）—')
  const storeConfFile = join(CONFIG_DIR, 'store.json')
  writeFileSync(storeConfFile, JSON.stringify({
    dataRoot: SYSTEM_ROOT,
    dataFiles: LIBRARY_ROOT,
  }, null, 2) + '\n', 'utf8')
  const confEnv = serverEnv()
  delete confEnv.PRIVHUB_DATA_ROOT
  delete confEnv.PRIVHUB_DATA_FILES
  srv = startServer(confEnv)
  ready = await waitReady()
  ok(ready, '只靠 config/store.json 即可启动（不设 PRIVHUB_DATA_* 环境变量）',
    srv.output().split('\n').slice(-8).join('\n'))
  if (ready) {
    let body = null
    try {
      const r = await fetch(BASE + '/privhub/api/runtime/store-check', {
        headers: { 'x-privhub-control-token': CONTROL_TOKEN },
        signal: AbortSignal.timeout(20000),
      })
      body = await r.json()
    } catch (e) { body = { error: e.message } }
    ok(body?.check?.library?.dataFiles === LIBRARY_ROOT,
      '配置文件里的 dataFiles 生效（库根 = 外部目录）', String(body?.check?.library?.dataFiles))
    ok(body?.check?.library?.projects === 1, '配置文件模式下仍能看到外部项目（1 个）',
      JSON.stringify(body?.check?.library || null))
  }
  await stopServer(srv.child)
  rmSync(storeConfFile, { force: true })

  /* ---- 2c. 带 BOM 的 store.json：Windows 编辑器的默认写法 ---- */
  console.log('\n— 2c. store.json 带 UTF-8 BOM 也能启动 —')
  writeFileSync(storeConfFile, '\uFEFF' + JSON.stringify({
    dataRoot: SYSTEM_ROOT,
    dataFiles: LIBRARY_ROOT,
  }, null, 2) + '\n', 'utf8')
  srv = startServer(confEnv)
  ready = await waitReady()
  ok(ready, '带 BOM 的 store.json 不被当成坏配置（进程未退出）',
    srv.output().split('\n').slice(-8).join('\n'))
  if (ready) {
    let body2 = null
    try {
      const r = await fetch(BASE + '/privhub/api/runtime/store-check', {
        headers: { 'x-privhub-control-token': CONTROL_TOKEN },
        signal: AbortSignal.timeout(20000),
      })
      body2 = await r.json()
    } catch (e) { body2 = { error: e.message } }
    ok(body2?.check?.library?.projects === 1, 'BOM 配置下库根仍然正确（1 个项目）',
      JSON.stringify(body2?.check?.library || null))
  }
  await stopServer(srv.child)
  rmSync(storeConfFile, { force: true })

  /* ---- 3. 已有密文但缺密钥：拒绝启动 ---- */
  console.log('\n— 3. 已有密文 + 缺少 secret.key：拒绝生成新密钥 —')
  const keyFile = join(SYSTEM_ROOT, 'data', 'secret.key')
  ok(existsSync(keyFile), '首轮启动已生成系统数据根下的 secret.key', keyFile)
  const usersFile = join(SYSTEM_ROOT, 'data', 'users.json')
  const usersHead = existsSync(usersFile) ? readFileSync(usersFile).subarray(0, 6).toString('latin1') : ''
  ok(usersHead === 'PHENC1', '系统账号文件确为密文（PHENC1）', usersHead)

  if (existsSync(keyFile)) {
    renameSync(keyFile, keyFile + '.bak')
    const bad = startServer()
    const exited = await waitExit(bad.child, 60000)
    const out = bad.output()
    ok(exited, '缺少密钥时进程拒绝启动（退出）', out.split('\n').slice(-8).join('\n'))
    ok(/拒绝自动生成新密钥|检测到已有加密数据/.test(out), '日志明确拒绝自动生成新密钥', out.split('\n').slice(-12).join('\n'))
    ok(!existsSync(keyFile), '没有偷偷生成新的 secret.key', keyFile)
    if (!exited) await stopServer(bad.child)

    /* 体检命令也必须报告失败。 */
    const v2 = verifyStore()
    ok(v2.status === 1, 'verify-store 在缺密钥时报退出码 1', (v2.stdout || '') + (v2.stderr || ''))
    renameSync(keyFile + '.bak', keyFile)
  }

  /* ---- 4. 显式库根不存在：拒绝启动 ---- */
  console.log('\n— 4. 显式库根不存在：拒绝启动 —')
  const missing = startServer(serverEnv({ PRIVHUB_DATA_FILES: join(TESTROOT, 'not-exist', 'data-files') }))
  const exited2 = await waitExit(missing.child, 60000)
  const out2 = missing.output()
  ok(exited2, '库根不存在时进程退出', out2.split('\n').slice(-6).join('\n'))
  ok(/文件库根.*不存在|已显式配置文件库根/.test(out2), '错误信息明确指出库根不存在', out2.split('\n').slice(-10).join('\n'))
  if (!exited2) await stopServer(missing.child)

  /* ---- 4b. 严格模式 + 空库：拒绝启动 ---- */
  console.log('\n— 4b. 严格模式 + 空库：拒绝启动（不再给空库假象）—')
  const emptyLib = join(TESTROOT, 'empty-lib')
  mkdirSync(emptyLib, { recursive: true })
  const strictRun = startServer(serverEnv({ PRIVHUB_DATA_FILES: emptyLib, PRIVHUB_STORE_STRICT: '1' }))
  const exited3 = await waitExit(strictRun.child, 60000)
  const out3 = strictRun.output()
  ok(exited3, '严格模式下空库进程退出', out3.split('\n').slice(-6).join('\n'))
  ok(/严格模式/.test(out3), '错误信息说明是严格模式拒绝了空库', out3.split('\n').slice(-10).join('\n'))
  if (!exited3) await stopServer(strictRun.child)

  /* ---- 5. 源码不得再出现盘符绝对路径 ---- */
  console.log('\n— 5. 源码去盘符化 —')
  const mainSrc = readFileSync(join(ROOT, 'src', 'main.ts'), 'utf8')
  ok(!/[A-Za-z]:[\\/]{1,2}[^\s'"]*privhub-data/i.test(mainSrc), 'src/main.ts 不存在 E:\\privhub-data 之类的硬编码')
  ok(mainSrc.includes("from './store-paths.mjs'"), 'src/main.ts 使用统一的存储根解析模块')

  /* ---- 6. REQ-5：回收站根必须落在配置的库根下 ---- */
  console.log('\n— 6. 破坏性操作守卫：回收站根 == 配置库根 —')
  {
    /* 6a. 正常情况：回收站在库根下 → 自检通过且回报 trash 段。 */
    const srv6 = startServer()
    const ready6 = await waitReady()
    ok(ready6, '（REQ-5）服务启动成功', srv6.output().split('\n').slice(-6).join('\n'))
    if (ready6) {
      let body6 = null
      try {
        const r = await fetch(BASE + '/privhub/api/runtime/store-check', {
          headers: { 'x-privhub-control-token': CONTROL_TOKEN },
          signal: AbortSignal.timeout(20000),
        })
        body6 = await r.json()
      } catch (e) { body6 = { error: e.message } }
      const trash = body6?.check?.trash
      ok(Boolean(trash), '（REQ-5）自检回报 trash 一致性段', JSON.stringify(body6?.check || null).slice(0, 300))
      ok(trash?.ok === true, '（REQ-5）回收站落在配置库根内 → 守卫通过', JSON.stringify(trash || null))
      const expectTrash = join(LIBRARY_ROOT, '.trash')
      ok(trash?.trashDir === expectTrash, '（REQ-5）回收站目录 = <库根>/.trash', String(trash?.trashDir))
    }
    await stopServer(srv6.child)

    /* 6b. 关键反证：core 的 dataRoot 指向「别的库」，但环境里配置的库根是
     *     另一个目录 —— 回收站就会落在配置库根之外，守卫必须判失败。
     *     这正是「库根被错配时，定时清理会在错误的库上删文件」的场景。 */
    const decoyLibrary = join(TESTROOT, 'decoy-library')
    mkdirSync(decoyLibrary, { recursive: true })
    mkdirSync(join(decoyLibrary, '诱饵项目'), { recursive: true })
    const mismatched = startServer(serverEnv({
      PRIVHUB_DATA_FILES: decoyLibrary,
      /* 让 core 挂到另一个库：模拟装配参数被传错 / 插件复用错根 */
      PRIVHUB_CORE_DATA_ROOT: LIBRARY_ROOT,
    }))
    /* 这个变量 core 本身不认；真正制造错配要直接验证守卫函数。
     * 因此这里改为静态+行为双重验证：用一个直接 import core 的微测试。 */
    await stopServer(mismatched.child)

    const guardProbe = spawnSync(process.execPath, [
      '--import', 'tsx/esm',
      join(HERE, 'lib', 'trash-guard-probe.mjs'),
    ], { cwd: ROOT, env: serverEnv(), encoding: 'utf8', timeout: 60000 })
    const probeOut = (guardProbe.stdout || '') + (guardProbe.stderr || '')
    ok(guardProbe.status === 0, '（REQ-5）守卫探针执行成功', probeOut.slice(-600))
    let probeJson = null
    try { probeJson = JSON.parse(probeOut.slice(probeOut.indexOf('{'), probeOut.lastIndexOf('}') + 1)) } catch { /* 下面断言会报 */ }
    ok(probeJson?.sameRoot?.ok === true, '（REQ-5）根一致时守卫放行', JSON.stringify(probeJson?.sameRoot || null))
    ok(probeJson?.wrongRoot?.ok === false, '（REQ-5）根不一致时守卫拒绝', JSON.stringify(probeJson?.wrongRoot || null))
    ok(/不在.*下|回收站目录不在/.test(String(probeJson?.wrongRoot?.reason || '')), '（REQ-5）拒绝理由说明了根不一致',
      String(probeJson?.wrongRoot?.reason || ''))
  }

  /* ---- 7. REQ-6：蓝绿首启沿用旧单进程布局 ---- */
  console.log('\n— 7. 首次以蓝绿启动：沿用现有单进程实例的根 —')
  {
    const legacyHome = join(TESTROOT, 'legacy-home')
    mkdirSync(join(legacyHome, 'data'), { recursive: true })
    mkdirSync(join(legacyHome, 'data-files', '老项目'), { recursive: true })
    writeFileSync(join(legacyHome, 'data', 'users.json'), '{"users":[]}\n', 'utf8')
    mkdirSync(join(legacyHome, 'runtime'), { recursive: true })
    for (const f of ['control.mjs', 'nginx.conf.template']) {
      const src = join(ROOT, 'runtime', f)
      if (existsSync(src)) writeFileSync(join(legacyHome, 'runtime', f), readFileSync(src))
    }
    /** 注意：不传 PRIVHUB_DATA_ROOT / PRIVHUB_DATA_FILES，模拟「主人什么都没配」。 */
    const legacyEnv = { ...process.env, PRIVHUB_HOME: legacyHome }
    delete legacyEnv.PRIVHUB_DATA_ROOT
    delete legacyEnv.PRIVHUB_DATA_FILES
    delete legacyEnv.PRIVHUB_STORE_DIR
    delete legacyEnv.PRIVHUB_CONFIG_DIR
    delete legacyEnv.PRIVHUB_STORE_CONFIG

    const runAdopt = (extraArgs = []) => spawnSync(process.execPath, [
      join(legacyHome, 'runtime', 'control.mjs'), 'adopt-legacy', ...extraArgs,
    ], { cwd: legacyHome, env: legacyEnv, encoding: 'utf8', timeout: 60000 })

    /* 7a. dry-run 只报告、不落盘 */
    const dry = runAdopt(['--dry-run'])
    const dryOut = (dry.stdout || '') + (dry.stderr || '')
    const legacyStoreConf = join(legacyHome, 'config', 'store.json')
    ok(dry.status === 0, '（REQ-6）adopt-legacy --dry-run 执行成功', dryOut.slice(-600))
    ok(!existsSync(legacyStoreConf), '（REQ-6）--dry-run 不写 config/store.json', legacyStoreConf)

    /* 7b. 真执行：写入沿用结果 */
    const real = runAdopt()
    const realOut = (real.stdout || '') + (real.stderr || '')
    ok(real.status === 0, '（REQ-6）adopt-legacy 执行成功', realOut.slice(-600))
    ok(existsSync(legacyStoreConf), '（REQ-6）写入了 config/store.json', legacyStoreConf)
    let adopted = null
    try { adopted = JSON.parse(readFileSync(legacyStoreConf, 'utf8').replace(/^\uFEFF/, '')) } catch { /* 断言报 */ }
    ok(adopted?.dataRoot === legacyHome, '（REQ-6）系统数据根沿用 <home>', String(adopted?.dataRoot))
    ok(adopted?.dataFiles === join(legacyHome, 'data-files'), '（REQ-6）文件库根沿用 <home>/data-files',
      String(adopted?.dataFiles))

    /* 7c. 已配置过 → 一律不改动（自动化绝不能覆盖人的决定） */
    writeFileSync(legacyStoreConf, JSON.stringify({ dataRoot: legacyHome, dataFiles: join(legacyHome, 'data-files') }), 'utf8')
    const again = runAdopt()
    const againOut = (again.stdout || '') + (again.stderr || '')
    ok(/已有 config\/store\.json/.test(againOut), '（REQ-6）已有 store.json 时不再改动',
      againOut.slice(-400))

    /* 7d. 库在别处的旧布局：只给线索，不瞎猜库根 */
    const orphanHome = join(TESTROOT, 'orphan-home')
    mkdirSync(join(orphanHome, 'data'), { recursive: true })
    mkdirSync(join(orphanHome, 'runtime'), { recursive: true })
    for (const f of ['control.mjs', 'nginx.conf.template']) {
      const src = join(ROOT, 'runtime', f)
      if (existsSync(src)) writeFileSync(join(orphanHome, 'runtime', f), readFileSync(src))
    }
    const orphanEnv = { ...legacyEnv, PRIVHUB_HOME: orphanHome }
    const orphan = spawnSync(process.execPath, [
      join(orphanHome, 'runtime', 'control.mjs'), 'adopt-legacy',
    ], { cwd: orphanHome, env: orphanEnv, encoding: 'utf8', timeout: 60000 })
    const orphanOut = (orphan.stdout || '') + (orphan.stderr || '')
    ok(orphan.status === 0, '（REQ-6）库在别处时命令仍正常返回', orphanOut.slice(-400))
    ok(/不会替你猜/.test(orphanOut), '（REQ-6）库在别处时明确说明不会猜库根', orphanOut.slice(-600))
    ok(!existsSync(join(orphanHome, 'config', 'store.json')), '（REQ-6）库在别处时不写一个猜出来的 store.json',
      join(orphanHome, 'config', 'store.json'))
  }

  cleanRoot()
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
  return fail === 0 ? 0 : 1
}

main().then((code) => process.exit(code), (e) => {
  console.error(e)
  try { cleanRoot() } catch { /* ignore */ }
  process.exit(1)
})
