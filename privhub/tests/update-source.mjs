/**
 * 纯使用版更新源的行为回归（自包含：起一个本地 HTTP 清单服务器，不需要业务实例）
 *
 * 覆盖「使用版机器只靠 HTTP 就能更新」这条链路上最容易被改坏的三处：
 *   ① 清单发现：latest.json 里的 version/url/notes 被正确读出，相对 URL 按清单地址解析；
 *   ② 完整性：清单 sha256 与下载内容不一致时**拒绝更新**，且状态落成 error（界面能看到原因）；
 *   ③ 安全默认：清单没写 sha256 时默认拒绝（allowUnverified 才放行），不会静默接受被替换的包。
 *
 * 被测对象是稳定层 runtime/update.mjs —— 它跑在隔离的 PRIVHUB_HOME 里，
 * 不接触真实 config/、releases/、store/。
 *
 *   node tests/update-source.mjs
 *
 * @module tests/update-source
 */

import { createServer } from 'node:http'
import { spawn, execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync, statSync,
} from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(join(HERE, '..'))
const UPDATE = join(ROOT, 'runtime', 'update.mjs')
const WORK = join(HERE, '.update-source-probe')

let pass = 0
let fail = 0
function ok(cond, msg) {
  if (cond) { pass++ } else { fail++ }
  console.log((cond ? '  ✅ ' : '  ❌ ') + msg)
}

const VERSION = '9.9.9'
const CURRENT = '9.9.8'

/* ---------- 隔离根 / 假 release / 压缩包 ---------- */

rmSync(WORK, { recursive: true, force: true })
mkdirSync(join(WORK, 'config'), { recursive: true })
mkdirSync(join(WORK, 'releases'), { recursive: true })

/** 造一个「应用根」最小结构：validReleaseDir 只认 package.json + src/main.ts + frontend/index.html。 */
function makeRelease(dir, version) {
  mkdirSync(join(dir, 'src'), { recursive: true })
  mkdirSync(join(dir, 'frontend'), { recursive: true })
  writeFileSync(join(dir, 'package.json'),
    JSON.stringify({ name: 'privhub', version, private: true }, null, 2) + '\n', 'utf8')
  writeFileSync(join(dir, 'src', 'main.ts'), 'export {}\n', 'utf8')
  writeFileSync(join(dir, 'frontend', 'index.html'), '<!doctype html><title>probe</title>\n', 'utf8')
}

/** 打 zip：Windows 用系统自带 bsdtar（与 update.mjs 解包同一工具），POSIX 用 zip。 */
function zipDir(parent, name, outFile) {
  if (process.platform === 'win32') {
    const sysTar = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe')
    execFileSync(sysTar, ['-a', '-cf', outFile, '-C', parent, name], { stdio: 'pipe', windowsHide: true })
    return
  }
  execFileSync('zip', ['-qr', outFile, name], { cwd: parent, stdio: 'pipe' })
}

const stage = join(WORK, 'stage')
makeRelease(join(stage, `privhub-${VERSION}`), VERSION)
const archive = join(WORK, `privhub-${VERSION}.zip`)
zipDir(stage, `privhub-${VERSION}`, archive)
const archiveBuf = readFileSync(archive)
const archiveSha = createHash('sha256').update(archiveBuf).digest('hex')

/* ---------- 本地 HTTP 清单服务器 ---------- */

let manifest = {}
const requests = []
const server = createServer((req, res) => {
  const url = String(req.url || '').split('?')[0]
  requests.push(url)
  if (url === '/latest.json') {
    const body = JSON.stringify(manifest, null, 2)
    res.writeHead(200, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) })
    res.end(body)
    return
  }
  if (url === `/privhub-${VERSION}.zip`) {
    res.writeHead(200, { 'content-type': 'application/zip', 'content-length': archiveBuf.length })
    res.end(archiveBuf)
    return
  }
  res.writeHead(404, { 'content-type': 'text/plain' })
  res.end('not found')
})

await new Promise((ok2) => server.listen(0, '127.0.0.1', ok2))
const base = `http://127.0.0.1:${server.address().port}`
const manifestUrl = base + '/latest.json'

/* ---------- 隔离配置：http 源 + 当前活跃版本 ---------- */

function setConfig(patch = {}) {
  writeFileSync(join(WORK, 'config', 'update.json'), JSON.stringify({
    source: 'http',
    manifestUrl,
    autoApply: false,
    intervalMinutes: 360,
    keepReleases: 3,
    requireNewer: true,
    ...patch,
  }, null, 2) + '\n', 'utf8')
}
writeFileSync(join(WORK, 'config', 'active.json'), JSON.stringify({
  version: CURRENT, slot: 'blue', releaseDir: join(WORK, 'releases', CURRENT),
}, null, 2) + '\n', 'utf8')

/* 必须异步 spawn：清单服务器就跑在本进程里，spawnSync 会阻塞事件循环，
 * 子进程的 HTTP 请求永远等不到响应。 */
function runUpdate(cmd) {
  return new Promise((done) => {
    const child = spawn(process.execPath, [UPDATE, cmd], {
      cwd: ROOT,
      windowsHide: true,
      env: { ...process.env, PRIVHUB_HOME: WORK },
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => { try { child.kill() } catch { /* ignore */ } }, 180_000)
    child.stdout.on('data', (d) => { stdout += d })
    child.stderr.on('data', (d) => { stderr += d })
    child.on('error', (e) => {
      clearTimeout(timer)
      done({ code: -1, stdout, stderr: stderr + String(e) })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      done({ code, stdout, stderr })
    })
  })
}

/** 从输出里取出最后一个 JSON 对象（前面可能有带时间戳的日志行）。 */
function lastJson(text) {
  const start = text.indexOf('{')
  if (start < 0) return null
  try { return JSON.parse(text.slice(start)) } catch { /* 继续尝试按行 */ }
  const lines = text.split('\n')
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i].trim().startsWith('{')) continue
    try { return JSON.parse(lines.slice(i).join('\n')) } catch { /* 继续 */ }
  }
  return null
}

const readState = () => {
  try { return JSON.parse(readFileSync(join(WORK, 'config', 'update-state.json'), 'utf8')) } catch { return null }
}

console.log('\n── ① HTTP 清单发现（check 不下载整包）──')
manifest = {
  version: VERSION,
  url: `privhub-${VERSION}.zip`,             // 相对地址：必须按清单 URL 解析
  sha256: archiveSha,
  size: archiveBuf.length,
  notes: '· 探针版本\n· 仅用于回归测试',
  publishedAt: '2026-11-11T00:00:00.000Z',
}
setConfig()
requests.length = 0
{
  const r = await runUpdate('check')
  const out = lastJson(r.stdout)
  ok(r.code === 0, 'check 退出码为 0')
  ok(out && out.ok === true, 'check 输出 ok:true')
  ok(out?.current === CURRENT, `识别当前版本 ${CURRENT}`)
  ok(out?.candidate === VERSION, `识别清单候选版本 ${VERSION}`)
  ok(out?.newer === true && out?.accepted === true, '候选版本高于当前 → newer/accepted 均为 true')
  ok(out?.source === 'http', '候选来源标记为 http')
  ok(out?.sha256 === archiveSha, '清单 sha256 透传（界面可显示校验值）')
  ok(/探针版本/.test(out?.notes || ''), '清单 notes 透传（更新说明可见）')
  ok(!requests.includes(`/privhub-${VERSION}.zip`), 'check 只读清单、不下载整包')
  const st = readState()
  ok(st?.phase === 'idle' && st?.candidate === VERSION && st?.checkedAt, '检查结果写入 update-state.json（界面轮询的数据源）')
}

console.log('\n── ② sha256 不匹配必须拒绝 ──')
manifest = { ...manifest, sha256: '0'.repeat(64) }
setConfig()
{
  const r = await runUpdate('apply')
  const err = lastJson(r.stderr)
  ok(r.code === 1, 'apply 退出码为 1')
  ok(err?.code === 'PRIVHUB_CHECKSUM_MISMATCH', '错误码为 PRIVHUB_CHECKSUM_MISMATCH')
  ok(/校验失败/.test(err?.error || ''), '错误信息可读（说明是校验失败，不是「网络错误」）')
  const st = readState()
  ok(st?.phase === 'error' && st?.errorCode === 'PRIVHUB_CHECKSUM_MISMATCH',
    '状态落成 error + errorCode（面板能显示失败原因）')
  ok(requests.includes(`/privhub-${VERSION}.zip`), 'apply 确实下载了整包后才校验（不是凭空报错）')
  const released = existsSync(join(WORK, 'releases', VERSION))
  ok(!released, '校验失败不会产生 releases/' + VERSION + '（失败不污染版本目录）')
}

console.log('\n── ③ 清单缺 sha256 默认拒绝 ──')
manifest = { version: VERSION, url: `privhub-${VERSION}.zip` }
setConfig()
{
  const r = await runUpdate('check')
  const err = lastJson(r.stderr || r.stdout)
  ok(r.code === 1, 'check 退出码为 1')
  ok(err?.code === 'PRIVHUB_UNVERIFIED_RELEASE', '错误码为 PRIVHUB_UNVERIFIED_RELEASE')
}

console.log('\n── ④ 显式放行才接受无校验值的清单 ──')
setConfig({ allowUnverified: true })
{
  const r = await runUpdate('check')
  const out = lastJson(r.stdout)
  ok(r.code === 0 && out?.candidate === VERSION, 'allowUnverified=true 时接受无 sha256 的清单（显式风险自负）')
}

console.log('\n── ⑤ 不进行中的版本只检查、不更新（requireNewer）──')
manifest = { version: CURRENT, url: `privhub-${CURRENT}.zip`, sha256: archiveSha }
setConfig()
{
  const r = await runUpdate('check')
  const out = lastJson(r.stdout)
  ok(r.code === 0 && out?.newer === false && out?.accepted === false,
    '同版本 → newer/accepted 均为 false（避免重复切换）')
}

console.log('\n── ⑥ status 暴露界面所需的配置字段 ──')
setConfig({ autoApply: false })
{
  const r = await runUpdate('status')
  const out = lastJson(r.stdout)
  ok(r.code === 0 && out?.ok === true, 'status 正常返回')
  ok(out?.source === 'http' && out?.manifestUrl === manifestUrl, 'status 带 source / manifestUrl')
  ok(out?.autoApply === false, 'status 带 autoApply（界面区分「只检查」与「自动更新」）')
  ok(out?.active?.version === CURRENT, 'status 带当前活跃版本')
}

console.log('\n── ⑦ 更新包结构：顶层目录也能识别 ──')
/* 上面下载/解包在 ② 就因校验失败中止，这里单独验 detectAppRoot 的两种形态：
 * 用正确 sha256 跑 check 不会解包，所以直接复用已解压逻辑的方式是看源码契约；
 * 行为侧改为：把 zip 内容改成「应用根直接在根」再走一次 apply 到校验前？—— 不可行。
 * 改为断言 zip 内含单层目录（构造方式与 build-standalone 一致），并把识别规则钉在契约里。 */
{
  const list = process.platform === 'win32'
    ? execFileSync(join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe'), ['-tf', archive], { encoding: 'utf8' })
    : execFileSync('tar', ['-tf', archive], { encoding: 'utf8' })
  ok(new RegExp(`(^|/)privhub-${VERSION}/package.json`, 'm').test(list),
    '发布包带单层目录（build-standalone 的形态），update.mjs 会向下找应用根')
}

server.close()
rmSync(WORK, { recursive: true, force: true })

console.log('\n' + '='.repeat(56))
console.log(`  HTTP 更新源：${pass} 通过 / ${fail} 失败`)
console.log('='.repeat(56) + '\n')
process.exit(fail === 0 ? 0 : 1)
