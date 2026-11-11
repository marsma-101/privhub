#!/usr/bin/env node
/**
 * PrivHub release 构建器（稳定脚本，无第三方依赖）
 *
 * 把当前源码（或 --from 指定的检出目录）组装成一个**自包含**的 release 目录：
 *   releases/<version>/
 *     src/ frontend/ plugins/ mcp/
 *     package.json package-lock.json tsconfig.json
 *     node_modules/           ← 默认真实复制（回滚时旧 release 必须能独立启动）
 *
 * 只复制白名单内容，绝不可能把 data/、data-files/、logs/、config/、store/ 带进 release。
 *
 * 用法（在 privhub/ 下）：
 *   node scripts/build-release.mjs
 *   node scripts/build-release.mjs --version 3.4.0
 *   node scripts/build-release.mjs --out D:\privhub-releases
 *   node scripts/build-release.mjs --link-modules      # 本地测试用 junction/symlink，秒级
 *   node scripts/build-release.mjs --from <dir>        # 打包另一个检出目录
 *   node scripts/build-release.mjs --with-tests        # 测试套件也进 release
 *
 * 已存在同版本目录时默认拒绝覆盖（避免把正在服务的 release 换掉）；确认空闲后
 * 才用 --force。active.json 指向的 release 永远拒绝覆盖。
 */

import {
  existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, renameSync,
  rmSync, cpSync, statSync, symlinkSync, createReadStream,
} from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const APP_HOME = resolve(dirname(HERE))

const argv = process.argv.slice(2)
function flag(name) { return argv.includes('--' + name) }
function opt(name, fallback = '') {
  const i = argv.indexOf('--' + name)
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback
}

const FROM = resolve(opt('from', APP_HOME))
const OUT = resolve(opt('out', join(APP_HOME, 'releases')))
const FORCE = flag('force')
const LINK_MODULES = flag('link-modules')
const WITH_TESTS = flag('with-tests')
const DRY = flag('dry')
/* 发布产物（供 runtime/update.mjs 的 http 源拉取） */
const PACKAGE = flag('package')
const WITH_MODULES = flag('with-modules')
const PUBLIC_BASE = opt('public-base', '').trim()
const NOTES = opt('notes', '').trim()
const NOTES_FILE = opt('notes-file', '').trim()
const PACKAGE_OUT = resolve(opt('package-out', join(APP_HOME, 'dist')))

const VERSION_RE = /^[0-9A-Za-z][0-9A-Za-z._+-]*$/

function fail(msg) {
  console.error('[build-release] 失败：' + msg)
  process.exit(1)
}

/**
 * Windows 上刚复制完的大目录常被杀毒/搜索索引短暂占用，直接 rename 会 EPERM。
 * 这类占用只在毫秒~秒级，重试即可；非锁类错误立即抛出。
 */
const RENAME_RETRY_CODES = new Set(['EPERM', 'EACCES', 'EBUSY', 'ENOTEMPTY'])
function sleepSync(ms) {
  try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms) } catch { /* 不支持时直接重试 */ }
}
function renameWithRetry(src, dst, attempts = 20) {
  let last = null
  for (let i = 0; i < attempts; i++) {
    try { renameSync(src, dst); return } catch (e) {
      last = e
      if (!e || !RENAME_RETRY_CODES.has(e.code)) throw e
      sleepSync(250)
    }
  }
  throw last
}

/**
 * 把构建好的暂存目录落到目标位置。
 * 先用 rename（原子、最快）；Windows 上若目录树被外部进程长期占用（杀毒/索引/资源管理器），
 * rename 会持续 EPERM —— 退化为「复制 + 删除暂存」，结果一致，代价是多一次磁盘拷贝。
 */
function moveDirInto(src, dst) {
  try { renameWithRetry(src, dst); return } catch (e) {
    if (!e || !RENAME_RETRY_CODES.has(e.code)) throw e
    console.log('[build-release] 目录被占用，改用复制落盘（结果相同，稍慢）')
    cpSync(src, dst, { recursive: true, force: true, dereference: false, verbatimSymlinks: true })
    try { rmSync(src, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }) } catch { /* 暂存残留不影响 release */ }
  }
}

function readPkg(dir) {
  try { return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) } catch { return null }
}

const srcPkg = readPkg(FROM)
if (!srcPkg) fail(`不是应用根（缺少 package.json）：${FROM}`)
const explicitVersion = opt('version', '').trim()
if (explicitVersion && !VERSION_RE.test(explicitVersion)) fail(`--version 非法：${explicitVersion}`)
const version = explicitVersion || String(srcPkg.version || '').trim()
if (!VERSION_RE.test(version)) fail('package.json 缺少合法 version，或请用 --version 指定')

if (!existsSync(join(FROM, 'src', 'main.ts'))) fail(`缺少 src/main.ts：${FROM}`)
if (!existsSync(join(FROM, 'frontend', 'index.html'))) fail(`缺少 frontend/index.html：${FROM}`)

const ENTRIES = [
  'src', 'frontend', 'plugins', 'mcp',
  'package.json', 'package-lock.json', 'tsconfig.json', '部署说明.md',
]
const OPTIONAL_ENTRIES = ['tests', 'start.bat']

/* 正在服务的 release 一律不覆盖：Windows 上替换运行中目录会被锁，且会让回滚失效。 */
function activeReleaseDirs() {
  const activeFile = join(APP_HOME, 'config', 'active.json')
  if (!existsSync(activeFile)) return []
  try {
    const a = JSON.parse(readFileSync(activeFile, 'utf8'))
    const out = []
    if (a && typeof a.releaseDir === 'string') out.push(resolve(a.releaseDir))
    if (a?.previous && typeof a.previous.releaseDir === 'string') out.push(resolve(a.previous.releaseDir))
    return out
  } catch { return [] }
}

const target = join(OUT, version)
const staging = join(OUT, '.build-' + version + '-' + process.pid)
const activeDirs = activeReleaseDirs()

if (existsSync(target)) {
  if (activeDirs.includes(target)) fail(`目标 ${target} 正在被 active.json 使用，拒绝覆盖`)
  if (!FORCE) fail(`目标已存在：${target}（确认空闲后用 --force 覆盖）`)
}

function dirSize(p) {
  let n = 0
  const walk = (d) => {
    for (const ent of readdirSync(d, { withFileTypes: true })) {
      const q = join(d, ent.name)
      try {
        if (ent.isDirectory()) walk(q)
        else if (ent.isFile()) n += statSync(q).size
      } catch { /* 锁文件/权限跳过 */ }
    }
  }
  walk(p)
  return n
}

function mb(n) { return (n / 1024 / 1024).toFixed(1) + ' MB' }

function copyModuleDir(src, dst) {
  if (LINK_MODULES) {
    mkdirSync(dirname(dst), { recursive: true })
    if (process.platform === 'win32') symlinkSync(src, dst, 'junction')
    else symlinkSync(src, dst, 'dir')
    return
  }
  cpSync(src, dst, { recursive: true, force: true, dereference: false, verbatimSymlinks: true })
}

/* ============ 发布产物（http 更新源） ============ */

function sha256File(file) {
  return new Promise((ok, fail) => {
    const hash = createHash('sha256')
    const stream = createReadStream(file)
    stream.on('data', (c) => hash.update(c))
    stream.on('error', fail)
    stream.on('end', () => ok(hash.digest('hex')))
  })
}

function archiveDir(dir, outFile, excludeModules) {
  mkdirSync(dirname(outFile), { recursive: true })
  rmSync(outFile, { force: true })
  const timeout = 30 * 60 * 1000
  if (process.platform === 'win32') {
    /* Windows 10 1803+ 自带 bsdtar，支持 zip 且比 Compress-Archive 快得多。 */
    const sysTar = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe')
    if (!existsSync(sysTar)) throw new Error('找不到 Windows 自带 tar.exe（需要 Win10 1803 及以上）')
    const args = ['-a', '-cf', outFile]
    if (excludeModules) args.push('--exclude=node_modules', '--exclude=./node_modules')
    args.push('-C', dir, '.')
    execFileSync(sysTar, args, { stdio: 'pipe', timeout, windowsHide: true })
    return
  }
  const args = ['-qr', outFile, '.']
  if (excludeModules) args.push('-x', 'node_modules/*')
  execFileSync('zip', args, { cwd: dir, stdio: 'pipe', timeout })
}

/** 从 CHANGELOG 取当前版本的段落作为更新说明（找不到就留空，不阻塞打包）。 */
function changelogNotes(ver) {
  try {
    const file = join(APP_HOME, '..', 'CHANGELOG.md')
    if (!existsSync(file)) return ''
    const text = readFileSync(file, 'utf8')
    const start = text.indexOf(`## [${ver}]`)
    if (start < 0) return ''
    const rest = text.slice(start)
    const end = rest.indexOf('\n## [', 1)
    const body = (end > 0 ? rest.slice(0, end) : rest)
      .replace(/^## \[[^\]]+\][^\n]*\n/, '')
      .replace(/^>\s?/gm, '')
      .trim()
    return body.length > 4000 ? body.slice(0, 4000) + '\n…' : body
  } catch { return '' }
}

function readNotes(ver) {
  if (NOTES_FILE) {
    try { return readFileSync(resolve(NOTES_FILE), 'utf8').trim() } catch { return '' }
  }
  return NOTES || changelogNotes(ver)
}

async function packageRelease(releaseDir) {
  mkdirSync(PACKAGE_OUT, { recursive: true })
  const name = `privhub-${version}.zip`
  const archive = join(PACKAGE_OUT, name)
  console.log(`[build-release] 打包发布产物（${WITH_MODULES ? '含' : '不含'} node_modules）：${archive}`)
  archiveDir(releaseDir, archive, !WITH_MODULES)
  const sha256 = await sha256File(archive)
  const size = statSync(archive).size
  let url = name
  if (PUBLIC_BASE) {
    const base = PUBLIC_BASE.endsWith('/') ? PUBLIC_BASE : PUBLIC_BASE + '/'
    try { url = new URL(name, base).toString() } catch { fail(`--public-base 不是合法 URL：${PUBLIC_BASE}`) }
  }
  const manifest = {
    version,
    url,
    sha256,
    size,
    notes: readNotes(version),
    publishedAt: new Date().toISOString(),
  }
  const manifestFile = join(PACKAGE_OUT, 'latest.json')
  writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  console.log(`[build-release] 发布清单：${manifestFile}`)
  console.log(`[build-release] 包大小 ${mb(size)} · sha256 ${sha256}`)
  if (!WITH_MODULES) {
    console.log('[build-release] 提示：更新包不含 node_modules。依赖未变时更新器会复用现有模块；'
      + '若本次改了依赖，请加 --with-modules 重新打包。')
  }
}

async function main() {
  if (DRY) {
    console.log(JSON.stringify({
      ok: true, dry: true, from: FROM, out: OUT, version, target,
      linkModules: LINK_MODULES, withTests: WITH_TESTS,
      package: PACKAGE, withModules: WITH_MODULES, packageOut: PACKAGE_OUT, publicBase: PUBLIC_BASE,
    }, null, 2))
    return
  }

  mkdirSync(OUT, { recursive: true })
  if (existsSync(staging)) rmSync(staging, { recursive: true, force: true })
  mkdirSync(staging, { recursive: true })

  try {
    let copied = 0
    for (const ent of ENTRIES) {
      const src = join(FROM, ent)
      if (!existsSync(src)) {
        if (ent === 'package-lock.json' || ent === '部署说明.md') continue
        throw new Error(`缺少必需条目：${ent}`)
      }
      const dst = join(staging, ent)
      cpSync(src, dst, { recursive: true, force: true, dereference: false, verbatimSymlinks: true })
      copied++
    }
    for (const ent of OPTIONAL_ENTRIES) {
      if (ent === 'tests' && !WITH_TESTS) continue
      const src = join(FROM, ent)
      if (!existsSync(src)) continue
      cpSync(src, join(staging, ent), { recursive: true, force: true })
      copied++
    }
    /* 存储体检脚本随 release 发布（GitHub issue #2 / REQ-4）：
     * 使用端可在任意版本目录里跑 `node scripts/verify-store.mjs` 只读体检。
     * 只带上这一个脚本，不把构建脚本一起塞进 release。 */
    const verifySrc = join(FROM, 'scripts', 'verify-store.mjs')
    if (existsSync(verifySrc)) {
      mkdirSync(join(staging, 'scripts'), { recursive: true })
      cpSync(verifySrc, join(staging, 'scripts', 'verify-store.mjs'), { force: true })
    }

    /* 显式版本覆盖：只改 release 副本，不动开发目录的 package.json。 */
    if (explicitVersion && explicitVersion !== srcPkg.version) {
      const pkg = { ...srcPkg, version: explicitVersion }
      writeFileSync(join(staging, 'package.json'), JSON.stringify(pkg, null, 2) + '\n', 'utf8')
      console.log(`[build-release] package.json 版本 ${srcPkg.version} → ${explicitVersion}`)
    }

    const modulesSrc = join(FROM, 'node_modules')
    if (!existsSync(join(modulesSrc, 'tsx', 'package.json'))) {
      throw new Error(`缺少 node_modules/tsx（先在 ${FROM} 执行 npm install）`)
    }
    console.log(`[build-release] node_modules：${LINK_MODULES ? '链接（仅本地测试）' : '复制'}`)
    copyModuleDir(modulesSrc, join(staging, 'node_modules'))

    /* 自检：控制层 validateRelease() 依赖这三个文件。 */
    for (const rel of [join('src', 'main.ts'), join('frontend', 'index.html'), join('node_modules', 'tsx', 'package.json')]) {
      if (!existsSync(join(staging, rel))) throw new Error(`release 自检失败，缺少 ${rel}`)
    }
    const stagedPkg = readPkg(staging)
    if (!stagedPkg || stagedPkg.version !== version) throw new Error('release 自检失败：package.json 版本不一致')

    if (existsSync(target)) rmSync(target, { recursive: true, force: true })
    moveDirInto(staging, target)

    const size = dirSize(target)
    console.log(`[build-release] 完成：${target}`)
    console.log(`[build-release] 版本 ${version}，顶层条目 ${copied + (WITH_TESTS ? 1 : 0)} 个，体积 ${mb(size)}`)
    console.log('[build-release] 启动/切换：node runtime\\control.mjs serve  |  node runtime\\control.mjs switch --version ' + version)
    if (PACKAGE) await packageRelease(target)
  } catch (e) {
    try { rmSync(staging, { recursive: true, force: true }) } catch { /* 清理失败不掩盖原始错误 */ }
    fail(e instanceof Error ? e.message : String(e))
  }
}

await main()
