#!/usr/bin/env node
/**
 * PrivHub 自动更新器（稳定层，随控制层一起不随 release 更新）
 *
 * 职责：发现新版本 → 组装/校验 release → 调用控制层 /control/switch 完成蓝绿切换。
 * **从不直接停止或启动槽进程**，所有切换动作都归 control.mjs，保证失败可回滚。
 *
 * 支持两种来源（config/update.json）：
 *   - git：从远端浅克隆指定分支，取 subdir 下的应用根（本项目仓库 app root 是 privhub/）
 *   - dir：从本地/共享目录读取已构建好的 release（管理员直接投放 releases/<ver>/）
 *
 * 规则：
 *   - 只用 Node 内置模块 + 外部 git 命令；绝不 import release 里的任何东西；
 *   - requireNewer（默认）只接受严格更高的版本；
 *   - 依赖复用安全：借用现有 node_modules 前比较 package.json 依赖清单与
 *     package-lock.json 哈希；不一致则拒绝自动切换（先 npm ci，再更新）；
 *   - 暂存目录 <home>/tmp/update/<ver>-<pid>，原子改名进 releases/；失败清理，活跃版本不变；
 *   - 单实例锁 <home>/tmp/update.lock，防止定时任务与人工操作并发。
 *
 * 用法（在 privhub/ 下）：
 *   node runtime/update.mjs check
 *   node runtime/update.mjs apply
 *   node runtime/update.mjs daemon
 *   node runtime/update.mjs status
 */

import {
  existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync,
  renameSync, cpSync, appendFileSync, openSync, closeSync, unlinkSync, symlinkSync,
  createWriteStream, statSync,
} from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const HOME = resolve(process.env.PRIVHUB_HOME?.trim() || dirname(HERE))
const CONFIG_DIR = resolve(process.env.PRIVHUB_CONFIG_DIR?.trim() || join(HOME, 'config'))
const LOGS_DIR = resolve(process.env.PRIVHUB_LOGS_DIR?.trim() || join(HOME, 'logs'))
const RELEASES_DIR = resolve(process.env.PRIVHUB_RELEASES_DIR?.trim() || join(HOME, 'releases'))
const TMP_DIR = resolve(process.env.PRIVHUB_TMP_DIR?.trim() || join(HOME, 'tmp'))
const UPDATE_CONF = join(CONFIG_DIR, 'update.json')
const UPDATE_STATE = join(CONFIG_DIR, 'update-state.json')
const ACTIVE_FILE = join(CONFIG_DIR, 'active.json')
const RUNTIME_CONF = join(CONFIG_DIR, 'runtime.json')
const TOKEN_FILE = join(CONFIG_DIR, 'control.token')
const LOCK_FILE = join(TMP_DIR, 'update.lock')
const VERSION_RE = /^[0-9A-Za-z][0-9A-Za-z._+-]*$/
const DEFAULT_INTERVAL_MIN = 360

function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.map((a) => (a instanceof Error ? a.stack || a.message : String(a))).join(' ')}`
  console.log(line)
  try {
    ensureDir(LOGS_DIR)
    appendFileSync(join(LOGS_DIR, 'update.log'), line + '\n', 'utf8')
  } catch { /* 日志失败不影响更新 */ }
}

function ensureDir(p) { mkdirSync(p, { recursive: true }) }
function readJson(file) {
  try { return JSON.parse(readFileSync(file, 'utf8')) } catch { return null }
}
function sha256File(file) {
  try { return createHash('sha256').update(readFileSync(file)).digest('hex') } catch { return '' }
}

function fail(code, msg) {
  const e = new Error(msg)
  e.code = code
  throw e
}

function loadConfig() {
  const cfg = {
    source: 'git',
    remote: '',
    branch: 'main',
    subdir: '',
    path: '',
    /* http 源：指向一个 latest.json（可与 GitHub Release / 任意静态服务器配合）。 */
    manifestUrl: '',
    /* 守护是否自动切换；false 时只检查并写状态，由管理界面一键更新。 */
    autoApply: true,
    /* 清单没有 sha256 时是否仍允许更新（默认拒绝，避免下载到被替换的包）。 */
    allowUnverified: false,
    downloadTimeoutMs: 10 * 60 * 1000,
    intervalMinutes: DEFAULT_INTERVAL_MIN,
    requireNewer: true,
    linkModules: false,
    allowDepsDrift: false,
    /* 保留最近 N 个 release（始终额外保留当前活跃与上一版本）。 */
    keepReleases: 3,
  }
  const hasConf = existsSync(UPDATE_CONF)
  const loaded = hasConf ? readJson(UPDATE_CONF) : null
  /* 配置文件存在但解析失败时必须报错：否则用户以为「已配置」，守护却按默认值
   * 跑（最常见的原因是 JSON 里写了 // 注释）。 */
  if (hasConf && (!loaded || typeof loaded !== 'object' || Array.isArray(loaded))) {
    fail('PRIVHUB_BAD_UPDATE_CONFIG', `update.json 不是合法的 JSON 对象：${UPDATE_CONF}`)
  }
  if (loaded) Object.assign(cfg, loaded)
  cfg.source = String(process.env.PRIVHUB_UPDATE_SOURCE || cfg.source || 'git')
  if (cfg.source !== 'git' && cfg.source !== 'dir' && cfg.source !== 'http') {
    fail('PRIVHUB_BAD_UPDATE_CONFIG', `update.json 的 source 只支持 git / dir / http，实际：${cfg.source}`)
  }
  cfg.intervalMinutes = Math.max(5, Number(cfg.intervalMinutes) || DEFAULT_INTERVAL_MIN)
  cfg.downloadTimeoutMs = Math.max(30_000, Number(cfg.downloadTimeoutMs) || 10 * 60 * 1000)
  return cfg
}

/** 来源配置只在真正取候选时才校验：status 必须能在「尚未配置更新源」时工作。 */
function assertSourceConfig(cfg) {
  if (cfg.source === 'git' && !cfg.remote) fail('PRIVHUB_BAD_UPDATE_CONFIG', 'git 源缺少 remote')
  if (cfg.source === 'dir' && !cfg.path) fail('PRIVHUB_BAD_UPDATE_CONFIG', 'dir 源缺少 path')
  if (cfg.source === 'http' && !cfg.manifestUrl) fail('PRIVHUB_BAD_UPDATE_CONFIG', 'http 源缺少 manifestUrl')
}

function loadActive() {
  const a = readJson(ACTIVE_FILE)
  if (!a || typeof a.version !== 'string' || typeof a.releaseDir !== 'string') return null
  return a
}

function activeVersion() {
  return loadActive()?.version || ''
}

function readReleaseVersion(dir) {
  const pkg = readJson(join(dir, 'package.json'))
  const v = pkg && typeof pkg.version === 'string' ? pkg.version.trim() : ''
  return VERSION_RE.test(v) ? v : ''
}

function validReleaseDir(dir) {
  return dir && VERSION_RE.test(readReleaseVersion(dir))
    && existsSync(join(dir, 'src', 'main.ts'))
    && existsSync(join(dir, 'frontend', 'index.html'))
}

function splitVersion(v) {
  return v.replace(/^v/i, '').split(/([._-])/).flatMap((p) => {
    if (p === '.' || p === '_' || p === '-') return p
    return /^\d+$/.test(p) ? Number(p) : p
  })
}
function compareVersion(a, b) {
  const aa = splitVersion(a), bb = splitVersion(b)
  const n = Math.max(aa.length, bb.length)
  for (let i = 0; i < n; i++) {
    const x = aa[i], y = bb[i]
    if (x === y) continue
    if (typeof x === 'number' && typeof y === 'number') return x - y
    return String(x).localeCompare(String(y))
  }
  return 0
}

/* ============ 更新状态（供管理界面轮询） ============ */

/**
 * 每次 check/apply 都把当前阶段写入 config/update-state.json。
 * 控制层与管理界面只读这个文件 —— 更新器即使被切换过程重启，状态也不会丢。
 */
function writeState(patch) {
  ensureDir(CONFIG_DIR)
  const prev = readJson(UPDATE_STATE) || {}
  const next = { ...prev, ...patch, at: new Date().toISOString() }
  try { writeFileSync(UPDATE_STATE, JSON.stringify(next, null, 2) + '\n', 'utf8') } catch { /* 状态失败不影响更新 */ }
  return next
}

/* ============ HTTP 发布源 ============ */

/**
 * 清单格式（latest.json）：
 *   { "version": "3.6.0", "url": "privhub-3.6.0.zip", "sha256": "…",
 *     "notes": "…", "publishedAt": "…" }
 * 也接受 { "releases": [ … ] } / { "latest": { … } }，取版本号最高的一项。
 * `url` 可相对清单地址（例如与 latest.json 放在同一静态目录）。
 */
function fetchTo(url, handler, timeoutMs, redirects = 5) {
  return new Promise((done, reject) => {
    let u
    try { u = new URL(url) } catch { reject(new Error('更新地址不是合法 URL：' + url)); return }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      reject(new Error('更新地址只支持 http/https：' + url)); return
    }
    const mod = u.protocol === 'https:' ? httpsRequest : httpRequest
    const req = mod(u, {
      method: 'GET',
      timeout: timeoutMs,
      headers: { 'user-agent': 'privhub-updater', accept: '*/*' },
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
        res.resume()
        const next = new URL(res.headers.location, u).toString()
        fetchTo(next, handler, timeoutMs, redirects - 1).then(done, reject)
        return
      }
      if (res.statusCode !== 200) {
        res.resume()
        reject(new Error(`HTTP ${res.statusCode}：${url}`))
        return
      }
      try { handler(res, done, reject) } catch (e) { reject(e) }
    })
    req.on('timeout', () => { req.destroy(new Error('更新请求超时：' + url)) })
    req.on('error', reject)
    req.end()
  })
}

function fetchText(url, timeoutMs) {
  return fetchTo(url, (res, done, reject) => {
    const chunks = []
    let size = 0
    res.on('data', (c) => {
      size += c.length
      if (size > 4 * 1024 * 1024) { reqAbort(res, reject, new Error('更新清单过大（>4MB）')); return }
      chunks.push(c)
    })
    res.on('end', () => done(Buffer.concat(chunks).toString('utf8')))
    res.on('error', reject)
  }, timeoutMs)
}

function reqAbort(res, reject, err) {
  try { res.destroy() } catch { /* ignore */ }
  reject(err)
}

function fetchFile(url, dest, timeoutMs, onProgress) {
  ensureDir(dirname(dest))
  return fetchTo(url, (res, done, reject) => {
    const total = Number(res.headers['content-length']) || 0
    const hash = createHash('sha256')
    let received = 0
    res.on('data', (c) => {
      received += c.length
      hash.update(c)
      if (onProgress) onProgress(received, total)
    })
    const out = createWriteStream(dest)
    out.on('error', reject)
    out.on('finish', () => {
      let size = received
      try { size = statSync(dest).size } catch { /* ignore */ }
      done({ size, sha256: hash.digest('hex') })
    })
    res.on('error', reject)
    res.pipe(out)
  }, timeoutMs)
}

async function fetchHttpCandidate(cfg) {
  const manifestUrl = String(cfg.manifestUrl)
  const text = await fetchText(manifestUrl, Math.min(cfg.downloadTimeoutMs, 60_000))
  let raw
  try { raw = JSON.parse(text) } catch {
    fail('PRIVHUB_BAD_MANIFEST', `更新清单不是合法 JSON：${manifestUrl}`)
  }
  let list = []
  if (Array.isArray(raw?.releases)) list = raw.releases
  else if (raw?.latest && typeof raw.latest === 'object') list = [raw.latest]
  else if (raw?.release && typeof raw.release === 'object') list = [raw.release]
  else list = [raw]

  const candidates = []
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const version = String(item.version ?? '').replace(/^v/i, '').trim()
    if (!VERSION_RE.test(version)) continue
    const rawUrl = String(item.url ?? item.archive ?? item.downloadUrl ?? '').trim()
    if (!rawUrl) continue
    let archiveUrl
    try { archiveUrl = new URL(rawUrl, manifestUrl).toString() } catch { continue }
    candidates.push({
      version,
      archiveUrl,
      sha256: String(item.sha256 ?? item.sha ?? '').trim().toLowerCase(),
      notes: typeof item.notes === 'string' ? item.notes : '',
      publishedAt: typeof item.publishedAt === 'string' ? item.publishedAt : '',
      source: 'http',
      appRoot: '',
      cleanup: null,
    })
  }
  if (candidates.length === 0) {
    fail('PRIVHUB_BAD_MANIFEST', `更新清单里没有可用条目（需要 version + url）：${manifestUrl}`)
  }
  candidates.sort((a, b) => compareVersion(b.version, a.version))
  const chosen = candidates[0]
  if (!chosen.sha256 && !cfg.allowUnverified) {
    fail('PRIVHUB_UNVERIFIED_RELEASE',
      `更新清单缺少 sha256，拒绝下载（在清单里补上 sha256，或设置 allowUnverified=true 自行承担风险）`)
  }
  return chosen
}

function archiveExt(archiveUrl) {
  try {
    const name = new URL(archiveUrl).pathname
    const m = name.match(/\.(zip|tar\.gz|tgz|tar)$/i)
    return m ? m[0].toLowerCase() : '.zip'
  } catch { return '.zip' }
}

/**
 * 解包：Windows 优先用系统自带 bsdtar（System32\tar.exe，支持 zip/tar.gz），
 * 没有则回落到 PowerShell Expand-Archive；POSIX 用 unzip / tar。
 * 不引入任何第三方解压库 —— 稳定层只依赖 Node 内置模块。
 */
function extractArchive(archive, dest) {
  ensureDir(dest)
  const run = (cmd, args) => execFileSync(cmd, args, {
    stdio: 'pipe', timeout: 15 * 60 * 1000, windowsHide: true,
  })
  const isZip = /\.zip$/i.test(archive)
  if (process.platform === 'win32') {
    const sysTar = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe')
    if (existsSync(sysTar)) { run(sysTar, ['-xf', archive, '-C', dest]); return }
    if (!isZip) fail('PRIVHUB_EXTRACT_FAILED', 'Windows 上找不到 bsdtar，无法解压：' + archive)
    const q = (s) => "'" + String(s).replace(/'/g, "''") + "'"
    run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      `Expand-Archive -LiteralPath ${q(archive)} -DestinationPath ${q(dest)} -Force`])
    return
  }
  if (isZip) { run('unzip', ['-q', archive, '-d', dest]); return }
  run('tar', ['-xf', archive, '-C', dest])
}

/** 归档根可能是「应用根本身」或「唯一顶层目录」，两种都接受。 */
function detectAppRoot(dir) {
  if (validReleaseDir(dir)) return dir
  let entries = []
  try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return '' }
  const dirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.'))
  if (dirs.length === 1) {
    const q = join(dir, dirs[0].name)
    if (validReleaseDir(q)) return q
  }
  for (const e of dirs) {
    const q = join(dir, e.name)
    if (validReleaseDir(q)) return q
  }
  return ''
}

async function materializeHttpCandidate(cfg, cand) {
  ensureDir(TMP_DIR)
  const work = join(TMP_DIR, 'update', `http-${cand.version}-${process.pid}`)
  rmSync(work, { recursive: true, force: true })
  ensureDir(work)
  const archive = join(work, 'release' + archiveExt(cand.archiveUrl))
  try {
    writeState({ phase: 'downloading', candidate: cand.version, progress: 0, error: null })
    let lastPct = -1
    const got = await fetchFile(cand.archiveUrl, archive, cfg.downloadTimeoutMs, (received, total) => {
      const pct = total > 0 ? Math.min(100, Math.floor((received / total) * 100)) : 0
      if (pct >= lastPct + 5 || (total > 0 && pct === 100 && lastPct !== 100)) {
        lastPct = pct
        writeState({
          phase: 'downloading', candidate: cand.version, progress: pct,
          receivedBytes: received, totalBytes: total || null,
        })
      }
    })
    if (cand.sha256 && got.sha256.toLowerCase() !== cand.sha256) {
      fail('PRIVHUB_CHECKSUM_MISMATCH',
        `更新包校验失败：清单 ${cand.sha256}，实际 ${got.sha256}（文件可能损坏或被替换）`)
    }
    writeState({ phase: 'extracting', candidate: cand.version, progress: 100, downloadedBytes: got.size })
    const xdir = join(work, 'x')
    extractArchive(archive, xdir)
    const appRoot = detectAppRoot(xdir)
    if (!appRoot) fail('PRIVHUB_BAD_RELEASE', `更新包解压后找不到应用根（需要 package.json + src/main.ts + frontend/index.html）`)
    const version = readReleaseVersion(appRoot)
    if (version !== cand.version) {
      fail('PRIVHUB_BAD_RELEASE', `更新包版本 ${version || '（缺失）'} 与清单 ${cand.version} 不一致`)
    }
    return { ...cand, appRoot, cleanup: () => rmSync(work, { recursive: true, force: true }) }
  } catch (e) {
    try { rmSync(work, { recursive: true, force: true }) } catch { /* ignore */ }
    throw e
  }
}

/* ============ 候选发现 ============ */

function scanDirSource(dir) {
  const base = resolve(dir)
  if (!existsSync(base)) fail('PRIVHUB_NO_SOURCE', `更新目录不存在：${base}`)
  if (validReleaseDir(base)) return { version: readReleaseVersion(base), appRoot: base, cleanup: null }
  const found = []
  for (const ent of readdirSync(base, { withFileTypes: true })) {
    if (!ent.isDirectory() || ent.name.startsWith('.')) continue
    const q = join(base, ent.name)
    if (validReleaseDir(q)) found.push({ version: readReleaseVersion(q), appRoot: q })
  }
  if (found.length === 0) fail('PRIVHUB_NO_SOURCE', `更新目录里没有可用 release：${base}`)
  found.sort((x, y) => compareVersion(y.version, x.version))
  return { ...found[0], cleanup: null }
}

function cloneGitSource(cfg) {
  ensureDir(TMP_DIR)
  const dir = join(TMP_DIR, 'update', 'git-' + process.pid)
  rmSync(dir, { recursive: true, force: true })
  ensureDir(dirname(dir))
  try {
    execFileSync('git', ['clone', '--depth', '1', '--no-tags', '--branch', String(cfg.branch || 'main'), cfg.remote, dir], {
      stdio: 'pipe', timeout: 15 * 60 * 1000, windowsHide: true,
    })
  } catch (e) {
    rmSync(dir, { recursive: true, force: true })
    const stderr = String(e?.stderr || e?.message || '').trim()
    fail('PRIVHUB_GIT_FAILED', `git clone 失败（需要已安装 git 且能访问 ${cfg.remote}）：${stderr}`)
  }
  const appRoot = cfg.subdir ? resolve(dir, String(cfg.subdir)) : dir
  if (!validReleaseDir(appRoot)) {
    rmSync(dir, { recursive: true, force: true })
    fail('PRIVHUB_BAD_RELEASE', `git 检出里找不到应用根（subdir=${JSON.stringify(cfg.subdir)}）：${appRoot}`)
  }
  return { version: readReleaseVersion(appRoot), appRoot, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

async function discoverCandidate(cfg) {
  assertSourceConfig(cfg)
  if (cfg.source === 'http') return await fetchHttpCandidate(cfg)
  return cfg.source === 'git' ? cloneGitSource(cfg) : scanDirSource(cfg.path)
}

/** http 源在版本比较之后才下载完整包；git/dir 源的候选已经带 appRoot。 */
async function materializeCandidate(cfg, cand) {
  if (cfg.source !== 'http' || cand.appRoot) return cand
  return await materializeHttpCandidate(cfg, cand)
}

async function pickCandidate(cfg, current) {
  const cand = await discoverCandidate(cfg)
  const newer = !current || compareVersion(cand.version, current) > 0
  return { ...cand, newer, accepted: cfg.requireNewer === false || newer }
}

/* ============ 依赖复用 ============ */

function depsFingerprint(appRoot) {
  const pkg = readJson(join(appRoot, 'package.json'))
  if (!pkg) return ''
  const deps = JSON.stringify({
    dependencies: pkg.dependencies || {},
    optionalDependencies: pkg.optionalDependencies || {},
    devDependencies: pkg.devDependencies || {},
  })
  const lock = sha256File(join(appRoot, 'package-lock.json'))
  return createHash('sha256').update(deps + '|' + lock).digest('hex')
}

function modulesSource(active, candidateRoot) {
  /* 候选自带完整 node_modules（dir 源常见）→ 直接用，不存在复用风险。 */
  const own = join(candidateRoot, 'node_modules')
  if (existsSync(join(own, 'tsx', 'package.json'))) return { dir: own, own: true }
  const activeModules = active?.releaseDir ? join(resolve(active.releaseDir), 'node_modules') : ''
  if (activeModules && existsSync(join(activeModules, 'tsx', 'package.json'))) return { dir: activeModules, own: false }
  const homeModules = join(HOME, 'node_modules')
  if (existsSync(join(homeModules, 'tsx', 'package.json'))) return { dir: homeModules, own: false }
  fail('PRIVHUB_NO_NODE_MODULES', '找不到可用 node_modules（候选 release 未自带，活跃 release/应用根也没有）；请先 npm ci')
}

function checkDeps(cfg, candidateRoot, source, active) {
  if (source.own) return
  const want = depsFingerprint(candidateRoot)
  const from = active?.releaseDir ? depsFingerprint(resolve(active.releaseDir)) : depsFingerprint(HOME)
  if (want && from && want !== from && !cfg.allowDepsDrift) {
    fail('PRIVHUB_DEPS_CHANGED',
      '新 release 的依赖清单与现有 node_modules 不一致，拒绝复用旧依赖。'
      + ' 请在候选 release 目录执行 npm ci 后重试（或设置 allowDepsDrift=true 承担风险）。')
  }
}

/* ============ 组装 release ============ */

/**
 * Windows 上「刚复制完的大目录」常被杀毒/索引进程短暂占用，直接 rename 会 EPERM。
 * 目录内在没有其它写者的情况下，重试即可；非锁类错误立即抛出。
 */
const RENAME_RETRY_CODES = new Set(['EPERM', 'EACCES', 'EBUSY', 'ENOTEMPTY'])
function sleepSync(ms) {
  try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms) } catch { /* 不支持时忙等 */ }
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
 * 把暂存 release 落到 releases/<version>。
 * rename 原子且最快；Windows 上目录树被外部进程长期占用时会持续 EPERM，
 * 此时退化为「复制 + 删除暂存」，结果一致（多一次磁盘拷贝）。
 */
function moveDirInto(src, dst) {
  try { renameWithRetry(src, dst); return } catch (e) {
    if (!e || !RENAME_RETRY_CODES.has(e.code)) throw e
    log(`放置 release 时目录被占用，改用复制：${e.code}`)
    cpSync(src, dst, { recursive: true, force: true, dereference: false, verbatimSymlinks: true })
    try { rmSync(src, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }) } catch { /* 暂存残留不影响 release */ }
  }
}

const ENTRIES = ['src', 'frontend', 'plugins', 'mcp', 'package.json', 'package-lock.json', 'tsconfig.json', '部署说明.md']

function copyModules(src, dst, link) {
  if (link) {
    /* 仅本地测试：链接到现有 node_modules，秒级完成。共享目标目录一旦被删除，
     * 该 release 立即不可启动——生产/回滚用 release 必须走真实复制。 */
    mkdirSync(dirname(dst), { recursive: true })
    rmSync(dst, { recursive: true, force: true })
    symlinkSync(src, dst, process.platform === 'win32' ? 'junction' : 'dir')
    return
  }
  cpSync(src, dst, { recursive: true, force: true, dereference: false, verbatimSymlinks: true })
}

function stageRelease(cfg, cand, active, version) {
  const modules = modulesSource(active, cand.appRoot)
  checkDeps(cfg, cand.appRoot, modules, active)

  ensureDir(RELEASES_DIR)
  ensureDir(TMP_DIR)
  const staging = join(TMP_DIR, 'update', version + '-' + process.pid)
  rmSync(staging, { recursive: true, force: true })
  ensureDir(staging)
  try {
    let copied = 0
    for (const ent of ENTRIES) {
      const src = join(cand.appRoot, ent)
      if (!existsSync(src)) {
        if (ent === 'package-lock.json' || ent === '部署说明.md') continue
        fail('PRIVHUB_BAD_RELEASE', `候选 release 缺少 ${ent}`)
      }
      cpSync(src, join(staging, ent), { recursive: true, force: true, dereference: false, verbatimSymlinks: true })
      copied++
    }
    /* 候选版本号必须与目录名一致（git 检出后如果有人改过 package.json 也能兜住）。 */
    const pkg = readJson(join(staging, 'package.json'))
    if (!pkg || pkg.version !== version) fail('PRIVHUB_BAD_RELEASE', '暂存 release 的 package.json 版本不一致')

    log(`组装 release：${modules.own ? '使用候选自带' : '复用现有'} node_modules（${modules.dir}）${cfg.linkModules ? '（链接，仅本地测试）' : ''}`)
    copyModules(modules.dir, join(staging, 'node_modules'), cfg.linkModules === true)

    for (const rel of [join('src', 'main.ts'), join('frontend', 'index.html'), join('node_modules', 'tsx', 'package.json')]) {
      if (!existsSync(join(staging, rel))) fail('PRIVHUB_BAD_RELEASE', `release 自检失败，缺少 ${rel}`)
    }

    const target = join(RELEASES_DIR, version)
    if (existsSync(target)) {
      if (active?.releaseDir && resolve(active.releaseDir) === target) {
        fail('PRIVHUB_RELEASE_ACTIVE', `目标 release 正在服务，拒绝覆盖：${target}`)
      }
      log(`已存在同版本 release，复用：${target}`)
      rmSync(staging, { recursive: true, force: true })
      return target
    }
    moveDirInto(staging, target)
    log(`release 已放置：${target}（${copied} 个顶层条目）`)
    return target
  } catch (e) {
    try { rmSync(staging, { recursive: true, force: true }) } catch { /* ignore */ }
    throw e
  }
}

/* ============ 控制层调用 ============ */

function controlEndpoint() {
  const rt = existsSync(RUNTIME_CONF) ? readJson(RUNTIME_CONF) : null
  const port = Number(process.env.PRIVHUB_CONTROL_PORT || rt?.controlPort || 3300)
  const token = process.env.PRIVHUB_CONTROL_TOKEN?.trim()
    || (existsSync(TOKEN_FILE) ? readFileSync(TOKEN_FILE, 'utf8').trim() : '')
  if (!token) fail('PRIVHUB_CONTROL_UNAVAILABLE', '缺少控制令牌（config/control.token），控制层未启动？')
  return { port, token }
}

function controlRequest(path, body, timeoutMs) {
  const { port, token } = controlEndpoint()
  const payload = body === undefined ? '' : JSON.stringify(body)
  return new Promise((done, reject) => {
    const headers = { 'x-privhub-control-token': token }
    if (body !== undefined) {
      headers['content-type'] = 'application/json; charset=utf-8'
      headers['content-length'] = String(Buffer.byteLength(payload))
    }
    const req = httpRequest({ host: '127.0.0.1', port, path, method: body === undefined ? 'GET' : 'POST', headers, timeout: timeoutMs }, (res) => {
      let data = ''
      res.setEncoding('utf8')
      res.on('data', (c) => { data += c })
      res.on('end', () => {
        let parsed = null
        try { parsed = JSON.parse(data) } catch { /* fallthrough */ }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const e = new Error(parsed?.error || `控制层 HTTP ${res.statusCode}`)
          e.code = parsed?.code || 'PRIVHUB_CONTROL_HTTP'
          reject(e)
        } else {
          done(parsed || {})
        }
      })
    })
    req.on('timeout', () => { req.destroy(); reject(new Error('控制接口超时')) })
    req.on('error', reject)
    req.end(payload)
  })
}

async function switchTo(releaseDir, version) {
  const r = await controlRequest('/control/switch', { releaseDir }, 240_000)
  if (r?.version !== version) {
    fail('PRIVHUB_SWITCH_MISMATCH', `控制层返回版本 ${r?.version || '?'}，期望 ${version}`)
  }
  return r
}

/* ============ 旧 release 清理 ============ */

/* Windows 路径大小写不敏感：active.json 里的盘符/目录大小写可能与 readdir 不同，
 * 直接用 resolve 比较会把「正在服务的 release」误判成可删。 */
function pathKey(p) {
  const r = resolve(p)
  return process.platform === 'win32' ? r.toLowerCase() : r
}

function releaseDirs() {
  try {
    return readdirSync(RELEASES_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory() && VERSION_RE.test(e.name))
      .map((e) => ({ name: e.name, dir: join(RELEASES_DIR, e.name) }))
      .filter((e) => validReleaseDir(e.dir))
      .sort((a, b) => compareVersion(b.name, a.name))
  } catch { return [] }
}

/**
 * 清理旧 release：只保留最近 N 个，并且**永不删除** active.json 正在使用的
 * 当前版本与上一版本（回滚要用）。只在新版本切换成功后调用 —— 切换失败时
 * 旧 release 还在服务，任何删除都可能让回滚目标消失。
 */
function pruneReleases(cfg) {
  const keepN = Math.max(1, Number(cfg.keepReleases) || 3)
  const dirs = releaseDirs()
  if (dirs.length <= keepN) return []
  const activeNow = loadActive()
  const protectedDirs = new Set()
  for (const a of [activeNow, activeNow?.previous]) {
    if (a?.releaseDir) protectedDirs.add(pathKey(a.releaseDir))
  }
  const keep = new Set(dirs.slice(0, keepN).map((r) => r.dir))
  const removed = []
  for (const r of dirs) {
    if (keep.has(r.dir)) continue
    if (protectedDirs.has(pathKey(r.dir))) continue
    try {
      rmSync(r.dir, { recursive: true, force: true })
      removed.push(r.name)
    } catch (e) {
      log(`清理旧 release 失败：${r.dir} ${e.message}`)
    }
  }
  if (removed.length) log(`清理旧 release：${removed.join(', ')}（保留最近 ${keepN} 个 + 当前/上一版本）`)
  return removed
}

/* ============ 单实例锁 ============ */

function acquireLock() {
  ensureDir(TMP_DIR)
  try {
    const fd = openSync(LOCK_FILE, 'wx')
    writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, at: Date.now() }) + '\n', 'utf8')
    closeSync(fd)
    return () => { try { unlinkSync(LOCK_FILE) } catch { /* ignore */ } }
  } catch (e) {
    if (e.code !== 'EEXIST') throw e
    const cur = readJson(LOCK_FILE)
    const pid = Number(cur?.pid)
    const age = Date.now() - Number(cur?.at || 0)
    let alive = false
    if (pid) { try { process.kill(pid, 0); alive = true } catch { alive = false } }
    if (alive && age < 2 * 60 * 60 * 1000) {
      fail('PRIVHUB_UPDATE_BUSY', `另一个更新进程正在运行（pid=${pid}）`)
    }
    log(`清理陈旧更新锁（pid=${pid || '?'}，age=${Math.round(age / 1000)}s）`)
    try { unlinkSync(LOCK_FILE) } catch { /* ignore */ }
    return acquireLock()
  }
}

/* ============ 命令 ============ */

function summary(cand, current) {
  return {
    ok: true,
    current: current || null,
    candidate: cand.version,
    newer: cand.newer,
    accepted: cand.accepted,
    source: cand.source || (cand.cleanup ? 'git' : 'dir'),
    notes: cand.notes || '',
    publishedAt: cand.publishedAt || '',
    sha256: cand.sha256 || '',
  }
}

async function cmdCheck() {
  const cfg = loadConfig()
  const current = activeVersion()
  writeState({ phase: 'checking', current: current || null, error: null })
  let cand = null
  try {
    cand = await pickCandidate(cfg, current)
    writeState({
      phase: 'idle', current: current || null, candidate: cand.version,
      newer: cand.newer, accepted: cand.accepted, source: cand.source || cfg.source,
      notes: cand.notes || '', checkedAt: new Date().toISOString(), error: null,
    })
    console.log(JSON.stringify(summary(cand, current), null, 2))
    return 0
  } catch (e) {
    writeState({
      phase: 'error', current: current || null,
      error: e.message, errorCode: e.code || null,
    })
    throw e
  } finally {
    if (cand?.cleanup) cand.cleanup()
  }
}

async function cmdApply() {
  const cfg = loadConfig()
  const current = activeVersion()
  const active = loadActive()
  const releaseLock = acquireLock()
  let cand = null
  try {
    cand = await discoverCandidate(cfg)
    const newer = !current || compareVersion(cand.version, current) > 0
    if (cfg.requireNewer !== false && !newer) {
      writeState({
        phase: 'idle', current: current || null, candidate: cand.version,
        newer: false, accepted: false, checkedAt: new Date().toISOString(), error: null,
      })
      log(`没有更新的版本（当前 ${current || '无'}，候选 ${cand.version}）`)
      console.log(JSON.stringify({ ok: true, updated: false, current, candidate: cand.version }, null, 2))
      return 0
    }
    if (!current) {
      fail('PRIVHUB_NO_ACTIVE', '控制层尚未建立 active 版本；请先用 node runtime/control.mjs serve 初始化')
    }
    writeState({ phase: 'preparing', current, candidate: cand.version, newer: true, error: null })
    cand = await materializeCandidate(cfg, cand)
    log(`发现新版本 ${cand.version}（当前 ${current}），开始组装`)
    writeState({ phase: 'staging', current, candidate: cand.version })
    const releaseDir = stageRelease(cfg, cand, active, cand.version)
    writeState({ phase: 'switching', current, candidate: cand.version })
    log(`调用控制层切换：${releaseDir}`)
    const r = await switchTo(releaseDir, cand.version)
    log(`切换完成：版本 ${r.version}，槽 ${r.slot}，端口 ${r.port}`)
    /* 清理失败不影响本次更新：磁盘清理是「顺带做」，不能把已成功的切换报成失败。 */
    let pruned = []
    try { pruned = pruneReleases(cfg) } catch (e) { log(`清理旧 release 出错：${e.message}`) }
    writeState({
      phase: 'done', current: r.version || cand.version, candidate: cand.version,
      previous: current, updatedAt: new Date().toISOString(), error: null, pruned,
    })
    console.log(JSON.stringify({ ok: true, updated: true, ...r, pruned }, null, 2))
    return 0
  } catch (e) {
    writeState({
      phase: 'error', current: current || null, candidate: cand?.version || null,
      error: e.message, errorCode: e.code || null,
    })
    log(`更新失败：${e.code || ''} ${e.message}`)
    console.error(JSON.stringify({ ok: false, code: e.code || null, error: e.message, active: current || null }, null, 2))
    return 1
  } finally {
    if (cand?.cleanup) cand.cleanup()
    releaseLock()
  }
}

async function cmdDaemon() {
  const cfg = loadConfig()
  log(`更新守护启动：source=${cfg.source}，每 ${cfg.intervalMinutes} 分钟检查一次`)
  const tick = async () => {
    try {
      /* autoApply=false：只发现并写状态，由管理界面一键更新（使用版默认更稳妥）。 */
      if (cfg.autoApply === false) await cmdCheck()
      else await cmdApply()
    } catch (e) { log(`守护检查异常：${e.message}`) }
    /* 定时器必须保持 ref：unref 的话事件循环里没有任何 handle，守护会立刻
     * 以 code=0 退出（控制层日志里表现为「启动后 0ms 就退出」），自动检查形同虚设。 */
    timer = setTimeout(tick, cfg.intervalMinutes * 60 * 1000)
  }
  let timer = setTimeout(tick, 60_000) // 启动后先等 1 分钟，避开控制层初始化
  const stop = () => { clearTimeout(timer); log('更新守护收到停止信号'); process.exit(0) }
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
}

async function cmdStatus() {
  const cfg = loadConfig()
  const active = loadActive()
  let releases = []
  try {
    releases = readdirSync(RELEASES_DIR)
      .filter((n) => VERSION_RE.test(n))
      .sort((a, b) => compareVersion(b, a))
  } catch { /* 目录不存在 */ }
  console.log(JSON.stringify({
    ok: true,
    source: cfg.source,
    autoApply: cfg.autoApply !== false,
    manifestUrl: cfg.manifestUrl || '',
    intervalMinutes: cfg.intervalMinutes,
    keepReleases: cfg.keepReleases,
    state: readJson(UPDATE_STATE),
    active: active ? { version: active.version, slot: active.slot, releaseDir: active.releaseDir } : null,
    releases,
  }, null, 2))
  return 0
}

/**
 * 回滚到上一版本。
 *
 * 为什么由独立进程执行而不是在槽里同步调用控制层：回滚会冻结并最终停掉
 * **当前活跃槽**，而发起回滚的 HTTP 请求正跑在那个槽里。同步等待会把自己
 * 计入「在途写」，永远排不空（PRIVHUB_DRAIN_TIMEOUT），即便勉强通过，响应
 * 也出自即将被停掉的进程。与控制层 update/apply 一样，槽只负责发起，执行交给
 * 稳定层的这个进程。
 */
async function cmdRollback() {
  const active = loadActive()
  const current = activeVersion()
  const previous = active?.previous?.version || null
  const releaseLock = acquireLock()
  try {
    writeState({ phase: 'switching', current: current || null, candidate: previous, newer: false, error: null })
    log(`请求回滚：${current || '?'} → ${previous || '上一版本'}`)
    const r = await controlRequest('/control/rollback', {}, 240_000)
    writeState({
      phase: 'done', current: r.version || previous, candidate: previous,
      previous: current, rolledBack: true, updatedAt: new Date().toISOString(), error: null,
    })
    console.log(JSON.stringify({ ok: true, rolledBack: true, ...r }, null, 2))
    return 0
  } catch (e) {
    writeState({
      phase: 'error', current: current || null, candidate: previous,
      error: e.message, errorCode: e.code || null,
    })
    log(`回滚失败：${e.code || ''} ${e.message}`)
    console.error(JSON.stringify({ ok: false, code: e.code || null, error: e.message }, null, 2))
    return 1
  } finally {
    releaseLock()
  }
}

/** 人工清理旧 release（与更新成功后的自动清理共用同一保护规则）。 */
async function cmdPrune() {
  const cfg = loadConfig()
  const releaseLock = acquireLock()
  try {
    const pruned = pruneReleases(cfg)
    console.log(JSON.stringify({ ok: true, pruned, keepReleases: cfg.keepReleases }, null, 2))
    return 0
  } catch (e) {
    log(`清理失败：${e.message}`)
    return 1
  } finally {
    releaseLock()
  }
}

function usage() {
  console.log([
    '用法：node runtime/update.mjs <command>',
    '  check    检查是否有新版本（不修改任何东西）',
    '  apply    发现新版本则下载/组装 release 并调用控制层切换',
    '  rollback 回滚到上一版本（由控制层切换，调用方进程不会随旧槽退出）',
    '  daemon   按 update.json 的 intervalMinutes 自动检查（autoApply=false 时只检查）',
    '  status   当前活跃版本与本地 release 列表',
    '  prune    清理旧 release（保留 keepReleases 个 + 当前/上一版本）',
  ].join('\n'))
}

const cmd = process.argv[2] || ''
const run = {
  check: cmdCheck, apply: cmdApply, rollback: cmdRollback, daemon: cmdDaemon, status: cmdStatus, prune: cmdPrune,
}[cmd]
if (!run) { usage(); process.exit(cmd ? 1 : 0) }
run().then((code) => {
  /* daemon 是常驻进程：它的函数只是装好定时器就返回，不能跟着 process.exit ——
   * 否则控制层拉起的守护会在启动后 0ms 退出（日志里一条「退出 code=0」），
   * 自动检查永远不会发生。退出由 SIGINT/SIGTERM 处理。 */
  if (cmd === 'daemon') return
  process.exit(Number(code) || 0)
}, (e) => {
  if (e && e.code) {
    console.error(JSON.stringify({ ok: false, code: e.code, error: e.message }, null, 2))
    process.exit(1)
  }
  log(`未捕获异常：${e?.stack || e}`)
  process.exit(1)
})
