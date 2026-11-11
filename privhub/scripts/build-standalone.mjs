#!/usr/bin/env node
/**
 * PrivHub「纯使用版」打包器（稳定脚本，无第三方依赖）
 *
 * 把「蓝绿运行时 + 一个自包含 release + 启动器」打成一个可分发的 zip：
 *
 *   privhub-<version>-standalone.zip
 *     privhub/
 *       runtime/               稳定层（control / update / nginx 模板；有 nginx 二进制则一并带上）
 *       releases/<version>/    业务 release（自带 node_modules）
 *       config/update.json     可选：--manifest-url 时预置更新源
 *       start-runtime.bat      双击启动（优先使用 runtime/node/node.exe）
 *       使用说明.md
 *
 * 使用方解压即可运行；更新由「管理控制台 → 系统运维 → 系统更新」完成，
 * 不需要源码、不需要 npm、不需要智能体介入。
 *
 * 用法（在 privhub/ 下）：
 *   node scripts/build-standalone.mjs --release releases/3.5.0
 *   node scripts/build-standalone.mjs --manifest-url https://host/privhub/latest.json
 *   node scripts/build-standalone.mjs --with-node          # 把当前 node.exe 一起打包
 *   node scripts/build-standalone.mjs --out D:\dist --force
 */

import {
  existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync, cpSync, statSync,
} from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const APP_HOME = resolve(dirname(HERE))
const argv = process.argv.slice(2)
const flag = (n) => argv.includes('--' + n)
const opt = (n, d = '') => {
  const i = argv.indexOf('--' + n)
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d
}

const OUT = resolve(opt('out', join(APP_HOME, 'dist')))
const FORCE = flag('force')
const WITH_NODE = flag('with-node')
const NO_NGINX = flag('no-nginx')
const MANIFEST_URL = opt('manifest-url', '').trim()
const VERSION_RE = /^[0-9A-Za-z][0-9A-Za-z._+-]*$/

function fail(msg) {
  console.error('[build-standalone] 失败：' + msg)
  process.exit(1)
}

function readJson(file) {
  try { return JSON.parse(readFileSync(file, 'utf8')) } catch { return null }
}

const explicitVersion = opt('version', '').trim()
const explicitRelease = opt('release', '').trim()

let releaseDir = explicitRelease ? resolve(explicitRelease) : ''
if (!releaseDir) {
  /* 默认取 releases/ 下版本号最高的一个。 */
  const relRoot = join(APP_HOME, 'releases')
  let names = []
  try { names = readdirSync(relRoot).filter((n) => VERSION_RE.test(n)) } catch { /* 没有 releases/ */ }
  names.sort(compareVersionDesc)
  if (names.length > 0) releaseDir = join(relRoot, names[0])
}
function compareVersionDesc(a, b) {
  const pa = a.replace(/^v/i, '').split(/[._-]/).map((x) => (/^\d+$/.test(x) ? Number(x) : x))
  const pb = b.replace(/^v/i, '').split(/[._-]/).map((x) => (/^\d+$/.test(x) ? Number(x) : x))
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i], y = pb[i]
    if (x === y) continue
    if (typeof x === 'number' && typeof y === 'number') return y - x
    return String(y).localeCompare(String(x))
  }
  return 0
}

if (!releaseDir || !existsSync(join(releaseDir, 'package.json'))) {
  fail('找不到可用的 release。请先运行 node scripts/build-release.mjs，或用 --release <dir> 指定')
}
const version = explicitVersion || String(readJson(join(releaseDir, 'package.json'))?.version || '').trim()
if (!VERSION_RE.test(version)) fail('release 的 package.json 缺少合法 version')

for (const rel of ['src/main.ts', 'frontend/index.html', 'node_modules/tsx/package.json']) {
  if (!existsSync(join(releaseDir, rel))) fail(`release 不完整，缺少 ${rel}：${releaseDir}`)
}

const bundleName = `privhub-${version}-standalone`
const archive = join(OUT, bundleName + '.zip')
if (existsSync(archive) && !FORCE) fail(`目标已存在：${archive}（确认后用 --force 覆盖）`)

const work = join(OUT, '.standalone-' + version + '-' + process.pid)
const stage = join(work, 'privhub')
rmSync(work, { recursive: true, force: true })
mkdirSync(stage, { recursive: true })

function mb(n) { return (n / 1024 / 1024).toFixed(1) + ' MB' }

function copyRuntime() {
  const src = join(APP_HOME, 'runtime')
  if (!existsSync(src)) fail('缺少 runtime/ 稳定层')
  cpSync(src, join(stage, 'runtime'), {
    recursive: true, force: true, dereference: false, verbatimSymlinks: true,
    filter: (p) => {
      const rel = p.slice(src.length).replace(/\\/g, '/')
      /* 不带运行期的临时/日志目录；nginx 的 conf/html/exe 必须保留。 */
      if (rel === '/tmp' || rel === '/logs') return false
      if (rel.startsWith('/nginx/logs') || rel.startsWith('/nginx/temp')) return false
      return true
    },
  })
  if (NO_NGINX) rmSync(join(stage, 'runtime', 'nginx'), { recursive: true, force: true })
  if (!NO_NGINX && !existsSync(join(stage, 'runtime', 'nginx', 'nginx.exe'))) {
    console.warn('[build-standalone] 警告：runtime/nginx 里没有 nginx.exe，使用方需先运行 scripts/fetch-nginx.ps1')
  }
}

function copyNode() {
  if (!WITH_NODE) return
  const exe = process.execPath
  const dir = join(stage, 'runtime', 'node')
  mkdirSync(dir, { recursive: true })
  const dest = join(dir, process.platform === 'win32' ? 'node.exe' : 'node')
  cpSync(exe, dest, { force: true })
  console.log(`[build-standalone] 已内置 Node：${exe}`)
}

function writeLauncher() {
  const src = join(APP_HOME, 'start-runtime.bat')
  if (existsSync(src)) cpSync(src, join(stage, 'start-runtime.bat'), { force: true })
  else fail('缺少 start-runtime.bat')
}

/** 存储体检脚本放在包的 <home>/scripts/ 下；它自己会从 active.json 找到当前 release。 */
function copyVerifyScript() {
  const src = join(APP_HOME, 'scripts', 'verify-store.mjs')
  if (!existsSync(src)) return
  mkdirSync(join(stage, 'scripts'), { recursive: true })
  cpSync(src, join(stage, 'scripts', 'verify-store.mjs'), { force: true })
}

function writeUpdateConfig() {
  if (!MANIFEST_URL) return
  try {
    const u = new URL(MANIFEST_URL)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('protocol')
  } catch { fail('--manifest-url 必须是 http(s) 地址') }
  mkdirSync(join(stage, 'config'), { recursive: true })
  const conf = {
    enabled: true,
    source: 'http',
    manifestUrl: MANIFEST_URL,
    autoApply: false,
    intervalMinutes: 360,
    keepReleases: 3,
    requireNewer: true,
  }
  writeFileSync(join(stage, 'config', 'update.json'), JSON.stringify(conf, null, 2) + '\n', 'utf8')
}

function writeReadme() {
  const manifestLine = MANIFEST_URL
    ? `已预置更新源：\`${MANIFEST_URL}\``
    : '尚未配置更新源：登录后进入 **管理控制台 → 系统运维 → 系统更新**，填写清单地址并保存。'
  const text = `# PrivHub ${version} · 纯使用版

这是可直接分发的使用版，**不需要源码、不需要 npm、不需要智能体**。

## 启动

1. 解压到任意目录（建议 \`D:\\privhub\`，不要放在 Program Files —— nginx 写日志可能被权限拦）。
2.（仅当未内置 Node 时）安装 Node.js 20+；若本包带 \`runtime/node/node.exe\`，可跳过。
3. 双击 \`start-runtime.bat\`。
4. 浏览器打开 \`http://<本机IP>:3181\`。
   默认管理员 \`admin / admin123\`，首次登录请立即修改密码。

## 更新

${manifestLine}

- 后台守护会按间隔检查（默认 6 小时）；默认**只检查、不自动更新**。
- 主人在「系统更新」页看到新版本后，点「立即更新到 x.y.z」即可：
  新版本在待命槽预热 → 旧槽冻结排空 → 切 nginx → 页面提示刷新。旧版本继续服务到切换完成。
- 切换后自动保留最近 3 个版本；异常时可在同一页面「回滚到上一版」。

## 数据与备份

- 数据全部在 \`store/\`（\`data/\` + \`data-files/\`），AES-256-GCM 加密。
- **必须备份 \`store/data/secret.key\`**：丢失密钥 = 数据无法恢复。
- 停服务：关闭控制层窗口，或在该目录执行 \`node runtime\\control.mjs stop\`。
`
  writeFileSync(join(stage, '使用说明.md'), text, 'utf8')
}

function archiveBundle() {
  mkdirSync(OUT, { recursive: true })
  rmSync(archive, { force: true })
  const timeout = 60 * 60 * 1000
  if (process.platform === 'win32') {
    const sysTar = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe')
    if (!existsSync(sysTar)) fail('找不到 Windows 自带 tar.exe（需要 Win10 1803 及以上）')
    execFileSync(sysTar, ['-a', '-cf', archive, '-C', work, 'privhub'], {
      stdio: 'pipe', timeout, windowsHide: true,
    })
    return
  }
  execFileSync('zip', ['-qr', archive, 'privhub'], { cwd: work, stdio: 'pipe', timeout })
}

try {
  copyRuntime()
  cpSync(releaseDir, join(stage, 'releases', version), {
    recursive: true, force: true, dereference: false, verbatimSymlinks: true,
  })
  copyNode()
  writeLauncher()
  copyVerifyScript()
  writeUpdateConfig()
  writeReadme()
  archiveBundle()
  const size = statSync(archive).size
  console.log(`[build-standalone] 完成：${archive}`)
  console.log(`[build-standalone] 版本 ${version}，内置 Node：${WITH_NODE ? '是' : '否'}，体积 ${mb(size)}`)
} catch (e) {
  fail(e instanceof Error ? e.message : String(e))
} finally {
  rmSync(work, { recursive: true, force: true })
}
