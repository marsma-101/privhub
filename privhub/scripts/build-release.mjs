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
  rmSync, cpSync, statSync, symlinkSync,
} from 'node:fs'
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

const VERSION_RE = /^[0-9A-Za-z][0-9A-Za-z._+-]*$/

function fail(msg) {
  console.error('[build-release] 失败：' + msg)
  process.exit(1)
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

function main() {
  if (DRY) {
    console.log(JSON.stringify({
      ok: true, dry: true, from: FROM, out: OUT, version, target,
      linkModules: LINK_MODULES, withTests: WITH_TESTS,
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
    renameSync(staging, target)

    const size = dirSize(target)
    console.log(`[build-release] 完成：${target}`)
    console.log(`[build-release] 版本 ${version}，顶层条目 ${copied + (WITH_TESTS ? 1 : 0)} 个，体积 ${mb(size)}`)
    console.log('[build-release] 启动/切换：node runtime\\control.mjs serve  |  node runtime\\control.mjs switch --version ' + version)
  } catch (e) {
    try { rmSync(staging, { recursive: true, force: true }) } catch { /* 清理失败不掩盖原始错误 */ }
    fail(e instanceof Error ? e.message : String(e))
  }
}

main()
