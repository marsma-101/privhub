#!/usr/bin/env node
/**
 * PrivHub 蓝绿运行时控制层（稳定层，不随业务 release 更新）
 *
 * 职责：
 *   - 维护两个 release 槽（blue/green）的 Node 进程：启动、健康检查、优雅停止；
 *   - 维护 config/active.json（当前版本 / 槽 / 端口 / release 目录）；
 *   - 从 nginx.conf.template 生成实时 nginx 配置，`nginx -t` 通过后重载；
 *   - 切换前冻结旧槽写入（调用 Node 的 /privhub/api/runtime/freeze），
 *     等旧槽把在途写请求排空后再让新槽接管，避免两进程同时写共享 data/；
 *   - 向浏览器广播版本（SSE），供前端弹「请刷新」提示；
 *   - 提供回滚。
 *
 * 设计约束：
 *   - 本文件只用 Node 内置模块，绝不能 import release 里的任何东西 —— 否则
 *     「稳定层」会跟着业务代码一起坏掉，回滚能力也随之消失。
 *   - 控制接口只监听回环地址，并要求 x-privhub-control-token；
 *     `/privhub/_version*` 是唯一对 LAN 暴露的端点（经 nginx 反代）。
 *
 * 用法（详见 runtime/README.md）：
 *   node runtime/control.mjs serve [--release <dir>] [--slot blue]
 *   node runtime/control.mjs status
 *   node runtime/control.mjs switch --release <dir> | --version <ver>
 *   node runtime/control.mjs rollback
 *   node runtime/control.mjs render-config
 *   node runtime/control.mjs stop
 */

import { createServer, request as httpRequest } from 'node:http'
import { spawn, execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createConnection } from 'node:net'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import {
  existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync,
  openSync, closeSync, rmSync, renameSync, appendFileSync, statSync,
} from 'node:fs'
import { dirname, join, resolve, isAbsolute, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)
const WIN = process.platform === 'win32'
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const TEMPLATE_FILE = join(SCRIPT_DIR, 'nginx.conf.template')

/* ============ 路径与默认配置 ============ */

const HOME_DIR = resolve(process.env.PRIVHUB_HOME?.trim() || dirname(SCRIPT_DIR))
const RUNTIME_DIR = SCRIPT_DIR
const CONFIG_DIR = resolve(process.env.PRIVHUB_CONFIG_DIR?.trim() || join(HOME_DIR, 'config'))
const LOGS_DIR = resolve(process.env.PRIVHUB_LOGS_DIR?.trim() || join(HOME_DIR, 'logs'))
const RELEASES_DIR = resolve(process.env.PRIVHUB_RELEASES_DIR?.trim() || join(HOME_DIR, 'releases'))
const NGINX_DIR = resolve(process.env.PRIVHUB_NGINX_DIR?.trim() || join(RUNTIME_DIR, 'nginx'))
const NGINX_EXE = join(NGINX_DIR, WIN ? 'nginx.exe' : 'nginx')
const RUNTIME_CONF = join(CONFIG_DIR, 'runtime.json')
const ACTIVE_FILE = join(CONFIG_DIR, 'active.json')
const TOKEN_FILE = join(CONFIG_DIR, 'control.token')
const NGINX_CONF = join(CONFIG_DIR, 'nginx.conf')
const NGINX_CONF_NEXT = join(CONFIG_DIR, 'nginx.conf.next')
const SSE_CLIENTS = new Set()

/** 配置文件绝对路径（相对路径按配置目录解析）。 */
function resolveInConfigDir(p) {
  return isAbsolute(p) ? resolve(p) : resolve(CONFIG_DIR, p)
}

/* ---- 稳定层存储配置（GitHub issue #2 / REQ-1、REQ-3）----
 *
 * `config/store.json` 位于代码树之外：`git pull` / 构建 release 都不会碰它。
 * 三个根可以分别指向不同磁盘：
 *   dataRoot   系统数据根（其下 data/ 存 users / audit / secret.key）
 *   dataFiles  文件库根（项目 / 个人空间）
 *   secretKey  密钥文件路径（可选；默认 <dataRoot>/data/secret.key）
 *
 * 坏 JSON 必须直接拒绝启动：静默回落默认值会把服务指向空库。
 */
const STORE_CONF_FILE = resolve(process.env.PRIVHUB_STORE_CONFIG?.trim() || join(CONFIG_DIR, 'store.json'))
let storeConf = {}
let storeConfLoaded = false
if (existsSync(STORE_CONF_FILE)) {
  try {
    // 记事本 / PowerShell 5.1 写出的 UTF-8 常带 BOM；先剥掉再解析。
    const parsed = JSON.parse(readFileSync(STORE_CONF_FILE, 'utf8').replace(/^\uFEFF/, ''))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('顶层必须是 JSON 对象')
    storeConf = parsed
    storeConfLoaded = true
  } catch (e) {
    console.error('[control] 存储配置解析失败：' + STORE_CONF_FILE + ' —— '
      + (e instanceof Error ? e.message : String(e)) + '\n'
      + '为避免用错数据根，拒绝启动。请修复该文件，或删除它改用环境变量。')
    process.exit(1)
  }
}

const CONF_DATA_ROOT = typeof storeConf.dataRoot === 'string' && storeConf.dataRoot.trim()
  ? resolveInConfigDir(storeConf.dataRoot.trim()) : ''
const CONF_DATA_FILES = typeof storeConf.dataFiles === 'string' && storeConf.dataFiles.trim()
  ? resolveInConfigDir(storeConf.dataFiles.trim()) : ''

/**
 * 数据根（系统数据 / 文件库的默认父目录）。
 *
 * 保守探测顺序：显式配置 → 已有 `<home>/store` → 旧单进程布局的 `<home>`。
 * 三者都不存在时才视为「全新安装」并创建 `<home>/store`，且必须把这件事吼出来
 * —— 不能静默造一个空 store 把老库「藏起来」（REQ-3）。
 */
function detectStoreDir() {
  const explicit = process.env.PRIVHUB_STORE_DIR?.trim()
    || process.env.PRIVHUB_DATA_ROOT?.trim()
    || CONF_DATA_ROOT
  if (explicit) return resolve(explicit)
  if (existsSync(join(HOME_DIR, 'store'))) return join(HOME_DIR, 'store')
  if (existsSync(join(HOME_DIR, 'data')) || existsSync(join(HOME_DIR, 'data-files'))) return HOME_DIR
  console.warn('[control] 未发现 store/、data/、data-files/，也未配置数据根：'
    + '按首次运行创建 ' + join(HOME_DIR, 'store') + '。'
    + '若你已有旧库，请先写 ' + STORE_CONF_FILE + '（dataRoot / dataFiles）再启动，'
    + '否则看到的是一个空库。')
  return join(HOME_DIR, 'store')
}
const STORE_DIR = detectStoreDir()

/**
 * 浅探测「能不能从旧单进程布局沿用根」（GitHub issue #2 / REQ-6 第二条）。
 *
 * 只探测、**不写盘**：模块加载期落盘会在 `--dry-run` 下也改文件，也会让
 * 「只想看一眼 status」的调用产生副作用。真正的写入由 `adoptLegacyLayout()`
 * 在显式命令或首次 serve 时执行。
 *
 * @returns {{feasible: boolean, dataRoot?: string, dataFiles?: string, publicPort?: number, notes: string[]}}
 */
function probeLegacyLayout() {
  const notes = []
  if (storeConfLoaded) return { feasible: false, notes: ['已有 config/store.json，不改动'] }
  if (process.env.PRIVHUB_DATA_ROOT?.trim() || process.env.PRIVHUB_DATA_FILES?.trim()
    || process.env.PRIVHUB_STORE_DIR?.trim()) {
    return { feasible: false, notes: ['已由环境变量指定根，不改动'] }
  }
  if (existsSync(join(HOME_DIR, 'store'))) return { feasible: false, notes: ['已是 store/ 布局，不改动'] }

  const hasData = existsSync(join(HOME_DIR, 'data'))
  const hasLibrary = existsSync(join(HOME_DIR, 'data-files'))
  if (!hasData && !hasLibrary) return { feasible: false, notes: ['未发现旧单进程布局，按全新安装处理'] }

  if (!hasLibrary) {
    notes.push('检测到旧布局的 data/ 但 <home>/data-files 不存在：'
      + '你的文件库可能在别的目录。请在 ' + STORE_CONF_FILE
      + ' 里写 dataFiles，或设 PRIVHUB_DATA_FILES 后再启动 —— 这里不会替你猜一个库根。')
    return { feasible: false, notes, needsLibraryHint: true, dataRoot: HOME_DIR }
  }

  /* 端口：沿用旧实例的对外端口。旧实例端口只能从环境变量见到，
   * 控制层自己不知道，因此这里只做「有线索就用」的保守采纳。 */
  const legacyPort = Number(process.env.PRIVHUB_LEGACY_PORT || process.env.PRIVHUB_PORT || 0)
  const publicPort = Number.isFinite(legacyPort) && legacyPort > 0 ? legacyPort : null
  return { feasible: true, dataRoot: HOME_DIR, dataFiles: join(HOME_DIR, 'data-files'), publicPort, notes }
}

/**
 * 执行沿用：把探测结果写进 `config/store.json`。
 * @param {{dryRun?: boolean}} [opts]
 */
function adoptLegacyLayout(opts = {}) {
  const probe = probeLegacyLayout()
  if (!probe.feasible) return { used: false, notes: probe.notes, ...probe }
  if (opts.dryRun) {
    return { ...probe, used: true, dryRun: true, notes: probe.notes.concat(['--dry-run：未写入 ' + STORE_CONF_FILE]) }
  }
  try {
    writeJsonAtomic(STORE_CONF_FILE, { dataRoot: probe.dataRoot, dataFiles: probe.dataFiles })
    probe.notes.push('已把沿用的根写入 ' + STORE_CONF_FILE)
  } catch (e) {
    probe.notes.push('写入 ' + STORE_CONF_FILE + ' 失败（仍按探测结果运行）：'
      + (e instanceof Error ? e.message : String(e)))
  }
  return { ...probe, used: true }
}

/* 首次 serve（且完全没配置过）时自动沿用 —— 让主人少手工抄一遍三根。
 * 已经配置过的一律不碰（probeLegacyLayout 里已判）。
 *
 * 注意：这里**不落盘、不改 storeConf**。模块加载发生在任何命令之前，
 * 若在这里写文件，`status` / `help` 这类只读命令也会产生副作用。
 * 真正的执行在 main() 里按命令分流（见 activateLegacyAdoption）。 */
let LEGACY_ADOPT = { used: false, feasible: false, notes: [] }

/** 在 serve / adopt-legacy 命令里真正执行沿用（会写 config/store.json）。 */
function activateLegacyAdoption(opts = {}) {
  const result = adoptLegacyLayout(opts)
  LEGACY_ADOPT = result
  if (result.used && !result.dryRun) {
    storeConf = { dataRoot: result.dataRoot, dataFiles: result.dataFiles }
    storeConfLoaded = true
    console.log('[control] 首次以蓝绿启动，已沿用现有单进程实例的根：\n'
      + '  系统数据根 : ' + result.dataRoot + '\n'
      + '  文件库根   : ' + result.dataFiles + '\n'
      + '  （写入了 ' + STORE_CONF_FILE + '；如需改动请直接编辑该文件）')
  }
  return result
}


/**
 * 文件库根：可独立于系统数据根。显式配置（env / store.json）优先；
 * 否则沿用「store 内 data-files」或旧布局的 `<home>/data-files`。
 *
 * 这里是**函数而非常量**：沿用旧实例（REQ-6）会在启动流程中补上 store.json
 * 的等价配置，常量会让那次改动对后续代码不可见（库根还停在旧值 → 空库）。
 */
function computeDataFiles() {
  const envFiles = process.env.PRIVHUB_DATA_FILES?.trim()
  if (envFiles) return { explicit: true, dir: resolve(envFiles) }
  if (CONF_DATA_FILES) return { explicit: true, dir: CONF_DATA_FILES }
  if (existsSync(join(STORE_DIR, 'data-files'))) return { explicit: false, dir: join(STORE_DIR, 'data-files') }
  if (existsSync(join(HOME_DIR, 'data-files'))) return { explicit: false, dir: join(HOME_DIR, 'data-files') }
  return { explicit: false, dir: join(STORE_DIR, 'data-files') }
}

/** 显式配置的库根必须真实存在：拼错时宁可不启动，也不要给用户一个空库假象。 */
function validateStoreRoots() {
  const { explicit, dir } = computeDataFiles()
  if (!explicit) return
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    const hint = existsSync(join(dir, 'data-files'))
      ? '\n提示：你配置的像是父目录，真正的库在其下 data-files/（' + join(dir, 'data-files') + '）'
      : ''
    throw httpError(500,
      '配置文件库根不存在或不是目录：' + dir + '\n'
      + '请检查 ' + STORE_CONF_FILE + ' 的 dataFiles 或环境变量 PRIVHUB_DATA_FILES。'
      + hint,
      'PRIVHUB_DATA_FILES_MISSING')
  }
}

function defaultRuntimeConfig() {
  return {
    publicHost: '0.0.0.0',
    publicPort: 3181,
    controlHost: '127.0.0.1',
    controlPort: 3300,
    slots: [
      { id: 'blue', port: 3301 },
      { id: 'green', port: 3302 },
    ],
    /* 冷启动实测 12–100 s（discoverL3 的串行 ESM/tsx 导入占大头）；预热路径下
     * 这段等待发生在旧槽仍服务的时候，因此宁可给足，不要让「首次安装/冷缓存」
     * 在 90 s 时误判失败。 */
    healthTimeoutMs: 180_000,
    drainTimeoutMs: 15_000,
    stopTimeoutMs: 20_000,
  }
}

function ensureDir(p) {
  mkdirSync(p, { recursive: true })
}

function ensureBaseDirs() {
  ensureDir(CONFIG_DIR)
  ensureDir(LOGS_DIR)
  ensureDir(join(HOME_DIR, 'tmp', 'nginx', 'client-body'))
  ensureDir(join(HOME_DIR, 'tmp', 'nginx', 'proxy'))
  ensureDir(join(HOME_DIR, 'tmp', 'nginx', 'fastcgi'))
  ensureDir(join(HOME_DIR, 'tmp', 'nginx', 'uwsgi'))
  ensureDir(join(HOME_DIR, 'tmp', 'nginx', 'scgi'))
}

function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.map((a) => (a instanceof Error ? a.stack || a.message : String(a))).join(' ')}`
  console.log(line)
  try {
    ensureDir(LOGS_DIR)
    appendFileSync(join(LOGS_DIR, 'control.log'), line + '\n', 'utf8')
  } catch { /* 日志失败不影响控制面 */ }
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

function writeJsonAtomic(file, value) {
  ensureDir(dirname(file))
  const tmp = file + '.tmp-' + process.pid
  writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n', 'utf8')
  try { rmSync(file, { force: true }) } catch { /* ignore */ }
  renameSync(tmp, file)
}

function loadRuntimeConfig() {
  const defaults = defaultRuntimeConfig()
  const loaded = existsSync(RUNTIME_CONF) ? readJson(RUNTIME_CONF) : null
  const cfg = { ...defaults, ...(loaded && typeof loaded === 'object' ? loaded : {}) }
  cfg.publicPort = Number(process.env.PRIVHUB_PUBLIC_PORT || cfg.publicPort)
  cfg.controlPort = Number(process.env.PRIVHUB_CONTROL_PORT || cfg.controlPort)
  /* REQ-6：首次从旧单进程布局接管时，沿用旧实例的对外端口（LAN 用户不用改地址）。
   * 只在「没有 runtime.json 也没设 PRIVHUB_PUBLIC_PORT」时生效，绝不覆盖显式配置。 */
  if (!loaded && !process.env.PRIVHUB_PUBLIC_PORT?.trim() && LEGACY_ADOPT.used && LEGACY_ADOPT.publicPort) {
    cfg.publicPort = LEGACY_ADOPT.publicPort
    console.log('[control] 对外端口沿用旧实例：' + cfg.publicPort)
  }
  if (!Array.isArray(cfg.slots) || cfg.slots.length !== 2) cfg.slots = defaults.slots
  cfg.slots = cfg.slots.map((s, i) => ({
    id: String(s?.id || defaults.slots[i].id),
    port: Number(s?.port || defaults.slots[i].port),
  }))
  return cfg
}

const CONFIG = loadRuntimeConfig()

function loadControlToken() {
  const envToken = process.env.PRIVHUB_CONTROL_TOKEN?.trim()
  if (envToken) return envToken
  const existing = existsSync(TOKEN_FILE) ? readFileSync(TOKEN_FILE, 'utf8').trim() : ''
  if (existing.length >= 16) return existing
  ensureDir(CONFIG_DIR)
  const token = randomBytes(32).toString('hex')
  writeFileSync(TOKEN_FILE, token + '\n', { encoding: 'utf8', mode: 0o600 })
  return token
}
const CONTROL_TOKEN = loadControlToken()

/* ============ active.json / 槽状态 ============ */

let active = null
let busy = false
let shuttingDown = false
let controlServer = null
let updaterChild = null

const SLOTS = new Map(CONFIG.slots.map((s) => [s.id, {
  id: s.id,
  port: s.port,
  pid: null,
  version: null,
  releaseDir: null,
  exit: null,
}]))

function loadActive() {
  const a = readJson(ACTIVE_FILE)
  if (!a || typeof a !== 'object') return null
  if (typeof a.version !== 'string' || typeof a.slot !== 'string') return null
  if (!SLOTS.has(a.slot)) return null
  if (!a.releaseDir || !isAbsolute(String(a.releaseDir))) return null
  return a
}

function saveActive(a) {
  writeJsonAtomic(ACTIVE_FILE, a)
}

function slotById(id) {
  const s = SLOTS.get(id)
  if (!s) throw httpError(400, `未知槽位：${id}`, 'PRIVHUB_BAD_SLOT')
  return s
}

function otherSlot(activeSlotId) {
  return CONFIG.slots.map((s) => SLOTS.get(s.id)).find((s) => s.id !== activeSlotId) ?? SLOTS.get(CONFIG.slots[0].id)
}

function snapshotActive(a) {
  return {
    version: a.version,
    slot: a.slot,
    port: a.port,
    releaseDir: a.releaseDir,
    dataRoot: a.dataRoot,
    switchedAt: a.switchedAt,
  }
}

function buildActive(slot, info, previous) {
  return {
    version: info.version,
    slot: slot.id,
    port: slot.port,
    releaseDir: info.dir,
    dataRoot: STORE_DIR,
    dataFiles: computeDataFiles().dir,
    switchedAt: new Date().toISOString(),
    previous: previous ? snapshotActive(previous) : null,
  }
}

/* ============ release 校验 ============ */

const VERSION_RE = /^[0-9A-Za-z][0-9A-Za-z._+-]*$/
const PLUGIN_NAME_RE = /^[A-Za-z0-9._-]+$/

function readReleaseVersion(dir) {
  const pkg = readJson(join(dir, 'package.json'))
  const v = pkg && typeof pkg.version === 'string' ? pkg.version.trim() : ''
  return VERSION_RE.test(v) ? v : ''
}

/** release 声明的蓝绿运行时能力（package.json 的 privhub.runtimeCapabilities）。
 *  旧 release 没有该字段 → 空数组 → 控制层回落到「先冻结、再启动」的旧路径。 */
function releaseCapabilities(dir) {
  const pkg = readJson(join(dir, 'package.json'))
  const caps = pkg?.privhub?.runtimeCapabilities
  return Array.isArray(caps) ? caps.filter((c) => typeof c === 'string') : []
}

function validateRelease(releaseDir, expectedVersion) {
  const dir = resolve(releaseDir)
  if (!existsSync(join(dir, 'src', 'main.ts'))) {
    throw httpError(400, `release 目录缺少 src/main.ts：${dir}`, 'PRIVHUB_BAD_RELEASE')
  }
  if (!existsSync(join(dir, 'frontend', 'index.html'))) {
    throw httpError(400, `release 目录缺少 frontend/index.html：${dir}`, 'PRIVHUB_BAD_RELEASE')
  }
  if (!existsSync(join(dir, 'node_modules', 'tsx', 'package.json'))) {
    throw httpError(400, `release 目录缺少 node_modules/tsx（无法启动 TS 源码）：${dir}`, 'PRIVHUB_BAD_RELEASE')
  }
  const version = readReleaseVersion(dir)
  if (!version) {
    throw httpError(400, `release 目录的 package.json 缺少合法 version：${dir}`, 'PRIVHUB_BAD_RELEASE')
  }
  if (expectedVersion && version !== expectedVersion) {
    throw httpError(409, `release 版本不符：期望 ${expectedVersion}，实际 ${version}`, 'PRIVHUB_VERSION_MISMATCH')
  }
  return { dir, version }
}

function splitVersion(v) {
  return v.replace(/^v/i, '').split(/([._-])/).flatMap((p) => {
    if (p === '.' || p === '_' || p === '-') return p
    return /^\d+$/.test(p) ? Number(p) : p
  })
}

function compareVersion(a, b) {
  const aa = splitVersion(a)
  const bb = splitVersion(b)
  const n = Math.max(aa.length, bb.length)
  for (let i = 0; i < n; i++) {
    const x = aa[i]
    const y = bb[i]
    if (x === y) continue
    if (typeof x === 'number' && typeof y === 'number') return x - y
    return String(x).localeCompare(String(y))
  }
  return 0
}

function listReleases() {
  if (!existsSync(RELEASES_DIR)) return []
  const out = []
  for (const ent of readdirSync(RELEASES_DIR, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue
    const dir = join(RELEASES_DIR, ent.name)
    const version = readReleaseVersion(dir)
    if (!version) continue
    if (!existsSync(join(dir, 'src', 'main.ts'))) continue
    out.push({ dir, version })
  }
  return out.sort((x, y) => compareVersion(y.version, x.version))
}

function resolveReleaseArg(input) {
  if (input) {
    const direct = resolve(input)
    if (existsSync(direct)) return validateRelease(direct)
    const inReleases = join(RELEASES_DIR, input)
    if (existsSync(inReleases)) return validateRelease(inReleases)
    throw httpError(404, `找不到 release：${input}`, 'PRIVHUB_NO_RELEASE')
  }
  const envRelease = process.env.PRIVHUB_INITIAL_RELEASE?.trim()
  if (envRelease) return resolveReleaseArg(envRelease)
  const found = listReleases()
  if (found.length > 0) return validateRelease(found[0].dir)
  /* 开发/单目录布局：应用根本身就是唯一 release。 */
  if (existsSync(join(HOME_DIR, 'package.json')) && existsSync(join(HOME_DIR, 'src', 'main.ts'))) {
    return validateRelease(HOME_DIR)
  }
  throw httpError(404, `releases 目录为空，且应用根不是可运行的 release：${RELEASES_DIR}`, 'PRIVHUB_NO_RELEASE')
}

function findReleaseByVersion(version) {
  if (!VERSION_RE.test(String(version || ''))) {
    throw httpError(400, 'version 非法', 'PRIVHUB_VERSION_MISMATCH')
  }
  const hit = listReleases().find((r) => r.version === version)
  if (!hit) throw httpError(404, `找不到版本 ${version} 的 release`, 'PRIVHUB_NO_RELEASE')
  return validateRelease(hit.dir, version)
}

/* ============ HTTP 小工具 ============ */

function httpError(status, message, code = 'PRIVHUB_RUNTIME_ERROR') {
  const e = new Error(message)
  e.status = status
  e.code = code
  return e
}

function sleep(ms) {
  return new Promise((ok) => setTimeout(ok, ms))
}

function jsonReply(res, status, body, extraHeaders = {}) {
  const payload = Buffer.from(JSON.stringify(body), 'utf8')
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(payload.length),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...extraHeaders,
  })
  res.end(payload)
}

function probePort(port, timeoutMs = 600) {
  return new Promise((done) => {
    let settled = false
    const finish = (v) => { if (!settled) { settled = true; done(v) } }
    const sock = createConnection({ host: '127.0.0.1', port })
    sock.setTimeout(timeoutMs)
    sock.once('connect', () => { sock.destroy(); finish(true) })
    sock.once('timeout', () => { sock.destroy(); finish(false) })
    sock.once('error', () => finish(false))
  })
}

function healthCheck(port, timeoutMs = 1500) {
  return new Promise((done) => {
    let settled = false
    const finish = (v) => { if (!settled) { settled = true; done(v) } }
    const req = httpRequest({
      host: '127.0.0.1', port, path: '/privhub/api/health', method: 'GET', timeout: timeoutMs,
    }, (res) => {
      let data = ''
      res.setEncoding('utf8')
      res.on('data', (c) => { data += c })
      res.on('end', () => {
        if (res.statusCode !== 200) return finish({ ok: false, status: res.statusCode })
        try {
          const j = JSON.parse(data)
          finish({ ok: j && j.ok === true, version: j?.version, pid: j?.pid, body: j })
        } catch { finish({ ok: false, error: 'health 响应不是 JSON' }) }
      })
    })
    req.on('timeout', () => { req.destroy(); finish({ ok: false, error: 'timeout' }) })
    req.on('error', (e) => finish({ ok: false, error: e.message }))
    req.end()
  })
}

function runtimeRequest(port, path, { method = 'GET', body, timeoutMs = 10_000 } = {}) {
  return new Promise((done, fail) => {
    let settled = false
    const finish = (err, value) => {
      if (settled) return
      settled = true
      if (err) fail(err); else done(value)
    }
    const payload = body === undefined ? '' : JSON.stringify(body)
    const headers = { 'x-privhub-control-token': CONTROL_TOKEN }
    if (body !== undefined) {
      headers['content-type'] = 'application/json; charset=utf-8'
      headers['content-length'] = String(Buffer.byteLength(payload))
    }
    const req = httpRequest({
      host: '127.0.0.1', port, path, method, headers, timeout: timeoutMs,
    }, (res) => {
      let data = ''
      res.setEncoding('utf8')
      res.on('data', (c) => { data += c })
      res.on('end', () => {
        let parsed = null
        try { parsed = JSON.parse(data) } catch { /* 非 JSON 由下面统一报错 */ }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const msg = parsed?.error || `HTTP ${res.statusCode}（${path}）`
          const e = httpError(res.statusCode, msg, parsed?.code || 'PRIVHUB_RUNTIME_HTTP')
          finish(e)
          return
        }
        finish(null, parsed ?? { ok: true })
      })
    })
    req.on('timeout', () => { req.destroy(); finish(new Error(`控制请求超时：${path}`)) })
    req.on('error', (e) => finish(e))
    req.end(payload)
  })
}

function processAlive(pid) {
  if (!pid) return false
  try { process.kill(pid, 0); return true } catch (e) { return e.code === 'EPERM' }
}

function readTail(file, maxLines = 25) {
  try {
    const raw = readFileSync(file, 'utf8')
    const lines = raw.split(/\r?\n/).filter(Boolean)
    return lines.slice(-maxLines).join('\n')
  } catch {
    return ''
  }
}

/* ============ 槽进程 ============ */

function nodeBinary() {
  const explicit = process.env.PRIVHUB_NODE_BIN?.trim()
  if (explicit) return explicit
  const bundled = join(RUNTIME_DIR, 'node', WIN ? 'node.exe' : 'node')
  if (existsSync(bundled)) return bundled
  return process.execPath
}

function slotLog(name) {
  return join(LOGS_DIR, `slot-${name}.log`)
}

function attachExit(slot, child) {
  child.on('exit', (code, signal) => {
    slot.exit = { code, signal, at: Date.now() }
    slot.pid = null
    slot.child = null
    slot.version = null
    slot.releaseDir = null
    log(`槽 ${slot.id} 进程退出 code=${code} signal=${signal ?? ''}`)
  })
}

function spawnSlot(slot, dir, { standby = false } = {}) {
  const out = openSync(slotLog(slot.id), 'a')
  const err = openSync(slotLog(slot.id), 'a')
  /** 只有显式配置时才下发 PRIVHUB_DATA_FILES：否则 store-paths 会把「默认路径」
   *  当成显式配置，首次安装时因目录尚不存在而拒绝启动。 */
  const env = {
    ...process.env,
    PRIVHUB_ROOT: dir,
    PRIVHUB_DATA_ROOT: STORE_DIR,
    PRIVHUB_CONFIG_DIR: CONFIG_DIR,
    PRIVHUB_STORE_CONFIG: STORE_CONF_FILE,
    PRIVHUB_HOST: '127.0.0.1',
    PRIVHUB_CONTROL_TOKEN: CONTROL_TOKEN,
    /* 管理界面（release 内的 privhub-update 插件）据此找到稳定层与控制接口。 */
    PRIVHUB_HOME: HOME_DIR,
    PRIVHUB_CONTROL_PORT: String(CONFIG.controlPort),
    PRIVHUB_SLOT: slot.id,
    /* 待命槽在旧槽仍服务时预热：不跑后台写任务，等控制层 reload + activate。
     * 显式写 '0' 防止控制层自身环境里的同名变量被继承。 */
    PRIVHUB_STANDBY: standby ? '1' : '0',
  }
  const df = computeDataFiles()
  if (df.explicit) env.PRIVHUB_DATA_FILES = df.dir
  if (typeof storeConf.strict === 'boolean') env.PRIVHUB_STORE_STRICT = storeConf.strict ? '1' : '0'
  const child = spawn(nodeBinary(), ['--import', 'tsx/esm', 'src/main.ts', '--port', String(slot.port)], {
    cwd: dir,
    env,
    stdio: ['ignore', out, err],
    detached: true,
    windowsHide: true,
  })
  slot.pid = child.pid ?? null
  slot.child = child
  slot.exit = null
  try { closeSync(out) } catch { /* ignore */ }
  try { closeSync(err) } catch { /* ignore */ }
  child.unref()
  attachExit(slot, child)
  log(`槽 ${slot.id} 已启动 pid=${child.pid} port=${slot.port} release=${dir}`)
}

/** 等某个槽的 /privhub/api/health 就绪且版本匹配。 */
async function waitSlotHealth(slot, expectedVersion) {
  const deadline = Date.now() + CONFIG.healthTimeoutMs
  let last = null
  while (Date.now() < deadline) {
    if (slot.exit) {
      throw httpError(502,
        `槽 ${slot.id} 启动后退出了（code=${slot.exit.code}）。日志尾部：\n${readTail(slotLog(slot.id))}`,
        'PRIVHUB_SLOT_CRASHED')
    }
    const h = await healthCheck(slot.port, 1200)
    last = h
    if (h.ok && h.version === expectedVersion) {
      slot.version = expectedVersion
      return h
    }
    if (h.ok && h.version && h.version !== 'unknown' && h.version !== expectedVersion) {
      throw httpError(409,
        `端口 ${slot.port} 上的服务版本是 ${h.version}，但目标是 ${expectedVersion}`,
        'PRIVHUB_VERSION_MISMATCH')
    }
    await sleep(300)
  }
  throw httpError(504,
    `槽 ${slot.id} 在 ${CONFIG.healthTimeoutMs}ms 内未就绪（最后一次：${last?.error || last?.version || '无响应'}）。日志尾部：\n${readTail(slotLog(slot.id))}`,
    'PRIVHUB_SLOT_TIMEOUT')
}

/** 确保槽上运行的就是指定 release（同版本且待命态相符则复用/收养）。 */
async function ensureSlot(slot, releaseDir, version, { standby = false } = {}) {
  const h = await healthCheck(slot.port, 1200)
  /* 复用条件里必须核对 standby 态：
   *   - 要预热（standby=true）时，只有本来就在待命的进程可复用；
   *   - 要正式服务（standby=false）时，绝不能收养一个待命进程（它的后台任务
   *     还没启动，会带着「不清理、不重建」的状态接过流量）。 */
  if (h.ok && h.version === version && h.pid && (h.body?.standby === true) === standby) {
    slot.pid = h.pid
    slot.version = version
    slot.releaseDir = releaseDir
    log(`槽 ${slot.id} 已在运行（${standby ? '待命' : '服务'}）且版本匹配，复用 pid=${h.pid}`)
    return
  }
  if (h.ok || await probePort(slot.port)) {
    /* 端口被占且版本/状态不符：先让旧进程优雅退出，再启动目标 release。 */
    log(`槽 ${slot.id} 端口 ${slot.port} 被占用且版本或待命态不符，先停止旧进程`)
    await stopSlot(slot)
    if (await probePort(slot.port)) {
      throw httpError(409, `槽 ${slot.id} 端口 ${slot.port} 仍被占用（无法确认是否为 PrivHub）`, 'PRIVHUB_PORT_BUSY')
    }
  }
  spawnSlot(slot, releaseDir, { standby })
  try {
    const h2 = await waitSlotHealth(slot, version)
    if (standby && h2?.body?.standby !== true) {
      throw httpError(500,
        `release ${version} 未按待命模式启动（缺少 PRIVHUB_STANDBY 支持），拒绝在旧槽服务时预热`,
        'PRIVHUB_NO_STANDBY')
    }
  } catch (e) {
    /* 启动超时/崩溃：这个进程是我们自己拉起来的，必须就地收掉。
     * 否则它会继续在后台启动，之后变成「端口被占用但版本不符」的幽灵进程。 */
    log(`槽 ${slot.id} 启动未就绪，清理该进程：${e.message.split('\n')[0]}`)
    await stopSlot(slot).catch((stopErr) => log(`警告：清理槽 ${slot.id} 失败：${stopErr.message}`))
    throw e
  }
  slot.version = version
  slot.releaseDir = releaseDir
}

/** 优雅停止槽：优先走 /runtime/shutdown，超时后强杀。 */
async function stopSlot(slot) {
  let pid = slot.pid
  if (!pid) {
    const h = await healthCheck(slot.port, 1000)
    if (h.ok && h.pid) pid = h.pid
  }
  if (!pid && !(await probePort(slot.port))) {
    slot.pid = null
    slot.exit = null
    return
  }
  if (!pid) {
    throw httpError(409, `槽 ${slot.id} 端口被占用但无法获取 pid`, 'PRIVHUB_PORT_BUSY')
  }
  log(`停止槽 ${slot.id}（pid=${pid}）`)
  try {
    await runtimeRequest(slot.port, '/privhub/api/runtime/shutdown', { method: 'POST', timeoutMs: 5000 })
  } catch (e) {
    log(`槽 ${slot.id} shutdown 端点不可用（${e.message}），回退到信号终止`)
  }
  const deadline = Date.now() + CONFIG.stopTimeoutMs
  while (processAlive(pid) && Date.now() < deadline) await sleep(250)
  if (processAlive(pid)) {
    log(`槽 ${slot.id} 未在 ${CONFIG.stopTimeoutMs}ms 内退出，发送 SIGTERM`)
    try {
      if (slot.child && slot.child.exitCode === null) slot.child.kill('SIGTERM')
      else process.kill(pid, 'SIGTERM')
    } catch (e) { log(`槽 ${slot.id} SIGTERM 失败：${e.message}`) }
    await sleep(1500)
  }
  if (processAlive(pid)) {
    log(`槽 ${slot.id} 仍在运行，强制结束 pid=${pid}`)
    if (WIN) {
      try { await execFileAsync('taskkill', ['/PID', String(pid), '/T', '/F'], { timeout: 8000 }) }
      catch (e) { log(`警告：taskkill ${pid} 失败：${String(e.stderr || e.message).trim()}`) }
    } else {
      try { process.kill(pid, 'SIGKILL') } catch (e) { log(`警告：kill -9 ${pid} 失败：${e.message}`) }
    }
    /* 强杀后确认真的没了：否则调用方会误以为端口已释放。 */
    const killDeadline = Date.now() + 5000
    while (processAlive(pid) && Date.now() < killDeadline) await sleep(250)
    if (processAlive(pid)) {
      throw httpError(500, `槽 ${slot.id}（pid=${pid}）无法结束`, 'PRIVHUB_SLOT_STUCK')
    }
  }
  slot.pid = null
  slot.child = null
  slot.exit = null
}

async function freezeSlot(a, timeoutMs) {
  return runtimeRequest(a.port, '/privhub/api/runtime/freeze', {
    method: 'POST', body: { timeoutMs }, timeoutMs: timeoutMs + 10_000,
  })
}

async function unfreezeSlot(a) {
  return runtimeRequest(a.port, '/privhub/api/runtime/unfreeze', {
    method: 'POST', timeoutMs: 8000,
  })
}

/* ============ nginx ============ */

function nginxAvailable() {
  return existsSync(NGINX_EXE)
}

function nginxPid() {
  const pidFile = join(LOGS_DIR, 'nginx.pid')
  try {
    const raw = readFileSync(pidFile, 'utf8').trim()
    const pid = Number(raw)
    return Number.isInteger(pid) && pid > 0 ? pid : null
  } catch {
    return null
  }
}

function nginxRunning() {
  const pid = nginxPid()
  return !!pid && processAlive(pid)
}

function configPathValue(p) {
  const s = resolve(p).replace(/\\/g, '/')
  if (/["`\r\n\0]/.test(s)) throw httpError(500, `路径含非法字符，拒绝写入 nginx 配置：${s}`, 'PRIVHUB_CONFIG_ESCAPE')
  return s
}

function authPluginDirs(releaseDir) {
  const base = join(releaseDir, 'plugins')
  if (!existsSync(base)) return []
  const names = []
  for (const ent of readdirSync(base, { withFileTypes: true })) {
    if (!ent.isDirectory() || ent.name.startsWith('_')) continue
    if (!PLUGIN_NAME_RE.test(ent.name)) continue
    const mf = join(base, ent.name, 'client', 'manifest.json')
    if (!existsSync(mf)) continue
    try {
      const raw = JSON.parse(readFileSync(mf, 'utf8'))
      if (Array.isArray(raw?.slots) && raw.slots.includes('auth')) names.push(ent.name)
    } catch { /* 坏 manifest：不予匿名放行（fail-closed） */ }
  }
  return names.sort()
}

function proxyBlock(indent) {
  const pad = ' '.repeat(indent)
  return [
    `${pad}proxy_pass http://privhub_active;`,
    `${pad}proxy_http_version 1.1;`,
    `${pad}proxy_set_header Host $host;`,
    `${pad}proxy_set_header Connection "";`,
    `${pad}proxy_set_header X-Real-IP $remote_addr;`,
    `${pad}proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`,
    `${pad}proxy_set_header X-Forwarded-Proto $scheme;`,
    `${pad}# 大文件上传直通：不在 nginx 侧落临时文件，Node 按自己的契约校验体积。`,
    `${pad}proxy_request_buffering off;`,
    `${pad}proxy_read_timeout 300s;`,
    `${pad}proxy_send_timeout 300s;`,
  ].join('\n')
}

function authPluginLocations(a) {
  const dirs = authPluginDirs(a.releaseDir)
  if (dirs.length === 0) {
    return '        # （当前 release 未声明 auth slot 插件；登录框若缺失请检查插件目录）'
  }
  const names = dirs.map((d) => d.replace(/[.]/g, '\\.')).join('|')
  return [
    `        location ~ ^/privhub-plugins/(${names})/(.+)$ {`,
    `            alias "${configPathValue(a.releaseDir)}/plugins/$1/client/$2";`,
    '            add_header Cache-Control "no-cache" always;',
    '            add_header X-Content-Type-Options "nosniff" always;',
    `            add_header X-PrivHub-Version "${a.version}" always;`,
    '        }',
  ].join('\n')
}

function renderNginxConfig(a) {
  if (!existsSync(TEMPLATE_FILE)) {
    throw httpError(500, `缺少 nginx 配置模板：${TEMPLATE_FILE}`, 'PRIVHUB_NO_TEMPLATE')
  }
  if (!VERSION_RE.test(String(a.version || ''))) {
    throw httpError(500, `active.json 的 version 非法：${a.version}`, 'PRIVHUB_CONFIG_ESCAPE')
  }
  const host = String(CONFIG.publicHost || '0.0.0.0')
  if (!/^[0-9A-Za-z._:-]+$/.test(host)) throw httpError(500, `publicHost 非法：${host}`, 'PRIVHUB_CONFIG_ESCAPE')
  for (const [name, value] of [
    ['publicPort', CONFIG.publicPort], ['controlPort', CONFIG.controlPort], ['activePort', a.port],
  ]) {
    const n = Number(value)
    if (!Number.isInteger(n) || n <= 0 || n > 65535) throw httpError(500, `${name} 非法：${value}`, 'PRIVHUB_CONFIG_ESCAPE')
  }

  let text = readFileSync(TEMPLATE_FILE, 'utf8')
  /* 块级占位符先替换（替换内容自身不含 {{ }}）。 */
  text = text.split('{{AUTH_PLUGIN_LOCATIONS}}').join(authPluginLocations(a))
  text = text.split('{{API_PROXY_NO_GATE}}').join(proxyBlock(12))
  text = text.split('{{API_PROXY}}').join(proxyBlock(12))

  const map = {
    HOME_DIR: configPathValue(HOME_DIR),
    NGINX_DIR: configPathValue(NGINX_DIR),
    ACTIVE_RELEASE_DIR: configPathValue(a.releaseDir),
    PUBLIC_HOST: host,
    PUBLIC_PORT: String(CONFIG.publicPort),
    CONTROL_PORT: String(CONFIG.controlPort),
    ACTIVE_PORT: String(a.port),
    ACTIVE_VERSION: a.version,
  }
  for (const [key, val] of Object.entries(map)) text = text.split(`{{${key}}}`).join(val)
  if (/\{\{[^}]*\}\}/.test(text)) throw httpError(500, 'nginx 配置模板仍有未替换的占位符', 'PRIVHUB_CONFIG_TEMPLATE')
  return text
}

async function nginxTest(confPath) {
  try {
    await execFileAsync(NGINX_EXE, ['-t', '-p', NGINX_DIR, '-c', confPath], { timeout: 20_000 })
  } catch (e) {
    const detail = String(e.stderr || e.stdout || e.message || '').trim()
    throw httpError(500, `nginx -t 未通过：${detail}`, 'PRIVHUB_NGINX_TEST_FAILED')
  }
}

async function nginxReload() {
  try {
    await execFileAsync(NGINX_EXE, ['-s', 'reload', '-p', NGINX_DIR, '-c', NGINX_CONF], { timeout: 15_000 })
  } catch (e) {
    const detail = String(e.stderr || e.stdout || e.message || '').trim()
    throw httpError(500, `nginx 重载失败：${detail}`, 'PRIVHUB_NGINX_RELOAD_FAILED')
  }
}

function spawnNginx() {
  const child = spawn(NGINX_EXE, ['-p', NGINX_DIR, '-c', NGINX_CONF], {
    stdio: 'ignore',
    detached: true,
    windowsHide: true,
  })
  child.unref()
}

async function ensureNginx() {
  if (!nginxAvailable()) {
    log('未找到 nginx 可执行文件，控制层以「无 nginx」模式运行（仅用于开发/自检）；生产请先运行 scripts/fetch-nginx.ps1')
    return false
  }
  ensureBaseDirs()
  if (nginxRunning()) return true
  if (await probePort(CONFIG.publicPort)) {
    throw httpError(409,
      `公网端口 ${CONFIG.publicPort} 已被其它进程占用，无法启动 nginx`,
      'PRIVHUB_PORT_BUSY')
  }
  if (!existsSync(NGINX_CONF)) {
    throw httpError(500, `nginx 配置尚未生成：${NGINX_CONF}`, 'PRIVHUB_NO_NGINX_CONFIG')
  }
  spawnNginx()
  const deadline = Date.now() + 8000
  while (Date.now() < deadline) {
    if (nginxRunning()) return true
    await sleep(250)
  }
  throw httpError(502,
    `nginx 未能启动。错误日志尾部：\n${readTail(join(LOGS_DIR, 'nginx-error.log'))}`,
    'PRIVHUB_NGINX_START_FAILED')
}

/** 测试并安装新配置（先写 .next，-t 通过后才替换 live 文件）。 */
async function prepareNginxConfig(a) {
  if (!nginxAvailable()) {
    const text = renderNginxConfig(a)
    writeFileSync(NGINX_CONF, text, 'utf8')
    return { confPath: NGINX_CONF, tested: false }
  }
  const text = renderNginxConfig(a)
  writeFileSync(NGINX_CONF_NEXT, text, 'utf8')
  await nginxTest(NGINX_CONF_NEXT)
  rmSync(NGINX_CONF, { force: true })
  renameSync(NGINX_CONF_NEXT, NGINX_CONF)
  return { confPath: NGINX_CONF, tested: true }
}

/** 生成配置并让 nginx 生效（未运行时启动）。 */
async function applyNginxConfig(a) {
  if (!nginxAvailable()) {
    const text = renderNginxConfig(a)
    writeFileSync(NGINX_CONF, text, 'utf8')
    return { enabled: false }
  }
  await prepareNginxConfig(a)
  await ensureNginx()
  await nginxReload()
  return { enabled: true }
}

async function stopNginx() {
  if (!nginxAvailable() || !nginxRunning()) return
  const pid = nginxPid()
  log(`停止 nginx（pid=${pid}）`)
  try {
    await execFileAsync(NGINX_EXE, ['-s', 'quit', '-p', NGINX_DIR, '-c', NGINX_CONF], { timeout: 15_000 })
  } catch (e) {
    log(`nginx quit 失败：${e.message}`)
  }
  const deadline = Date.now() + 10_000
  while (pid && processAlive(pid) && Date.now() < deadline) await sleep(250)
  if (pid && processAlive(pid)) {
    if (WIN) {
      try { await execFileAsync('taskkill', ['/PID', String(pid), '/T', '/F'], { timeout: 8000 }) } catch { /* ignore */ }
    } else {
      try { process.kill(pid, 'SIGKILL') } catch { /* ignore */ }
    }
  }
}

/* ============ 切换 / 回滚 ============ */

/**
 * 切流量前的「库可见 + 可解密」自检（GitHub issue #2 / REQ-4）。
 *
 * 在旧槽仍在服务时对新槽执行；不通过就抛错，由 performSwitch 的清理逻辑
 * 停掉新槽、解冻旧槽，旧版本继续服务。旧 release 没有该端点/能力时只告警跳过
 * （与 freeze 能力协商同理，不能让首次升级卡死）。
 */
async function storeCheckSlot(slot) {
  const h = await healthCheck(slot.port, 3000)
  const caps = Array.isArray(h.body?.capabilities) ? h.body.capabilities : []
  if (!caps.includes('store-check')) {
    log(`警告：目标槽 ${slot.id} 不支持 store-check（旧 release），跳过切流前存储自检`)
    return { skipped: true }
  }
  let r
  try {
    r = await runtimeRequest(slot.port, '/privhub/api/runtime/store-check', { method: 'GET', timeoutMs: 120_000 })
  } catch (e) {
    throw httpError(409,
      '新槽存储自检请求失败，已取消切换（旧槽继续服务）：' + e.message,
      'PRIVHUB_STORE_CHECK_FAILED')
  }
  const check = r?.check
  if (!r?.ok || check?.ok !== true) {
    const detail = check?.error || (Array.isArray(check?.warnings) ? check.warnings.join('；') : '') || '未知原因'
    throw httpError(409,
      '新槽存储自检未通过，已取消切换（旧槽继续服务）：' + detail,
      'PRIVHUB_STORE_CHECK_FAILED')
  }
  const library = check.library || {}
  log(`新槽 ${slot.id} 存储自检通过：项目 ${library.projects ?? '?'} 个、`
    + `个人空间 ${library.personalSpaces ?? '?'} 个，抽样解密通过`)
  return check
}

async function performSwitch({ releaseArg, version, slotId, reason }) {
  if (busy) throw httpError(409, '已有切换操作进行中，请稍后重试', 'PRIVHUB_BUSY')
  validateStoreRoots()
  busy = true
  try {
    const info = version ? findReleaseByVersion(version) : resolveReleaseArg(releaseArg)
    const prev = active
    const target = slotId ? slotById(slotId) : otherSlot(prev?.slot)
    if (prev && target.id === prev.slot) {
      throw httpError(400, `目标槽 ${target.id} 就是当前活跃槽`, 'PRIVHUB_BAD_SLOT')
    }

    /* 目标 release 是否支持「待命预热」：旧 release 没有该能力，回落到
     * 「先冻结旧槽、再启动新槽」——那条路径下新槽冷启动的几十秒里写入会 503。
     * 新 release 则把冷启动完全挪到旧槽仍在服务的时段。 */
    const caps = releaseCapabilities(info.dir)
    const canPrewarm = ['standby', 'reload-state', 'activate'].every((c) => caps.includes(c))

    let newStarted = false
    let oldFrozen = false
    try {
      /* 1) 预热：旧槽继续服务，新槽在待命态完成冷启动（不跑后台写任务）。 */
      if (canPrewarm) {
        await ensureSlot(target, info.dir, info.version, { standby: true })
        newStarted = true
        log(`新槽 ${target.id} 已待命预热（${info.version}）`)
        /* 切流前体检：此时旧槽仍完整服务，失败只需停掉新槽。 */
        await storeCheckSlot(target)
      }

      /* 2) 冻结旧槽并等在途写排空。
       *    旧 release 可能根本不认识 freeze 端点（首次升级到本架构）：此时只告警
       *    并继续，而不是让整个更新失败。过渡期后所有 release 都带该能力。 */
      if (prev) {
        let freezeSupported = false
        try {
          const ph = await healthCheck(prev.port, 3000)
          const pcaps = Array.isArray(ph.body?.capabilities) ? ph.body.capabilities : []
          freezeSupported = pcaps.includes('freeze')
        } catch { /* 旧槽进程已不在：无需冻结 */ }
        if (freezeSupported) {
          const frozen = await freezeSlot(prev, CONFIG.drainTimeoutMs)
          if (!frozen || frozen.drained !== true) {
            const pending = frozen?.writesInFlight
            await unfreezeSlot(prev).catch(() => { /* ignore */ })
            throw httpError(409,
              `旧槽仍有 ${pending ?? '未知数量'} 个写请求未完成（超过 ${CONFIG.drainTimeoutMs}ms），已取消切换；请等这些操作结束后重试`,
              'PRIVHUB_DRAIN_TIMEOUT')
          }
          oldFrozen = true
          log(`旧槽 ${prev.slot} 已冻结，在途写已排空`)
        } else {
          log(`警告：旧槽 ${prev.slot} 不支持 freeze（首次升级到蓝绿架构），跳过排空直接切换`)
        }
      }

      /* 3) 旧 release：冻结后才启动新槽（原路径）。 */
      if (!canPrewarm) {
        await ensureSlot(target, info.dir, info.version, { standby: false })
        newStarted = true
        /* 旧槽已冻结（能力协商的保守路径），但尚未切流量；体检失败会走统一回滚：
         * 解冻旧槽、停掉新槽。 */
        await storeCheckSlot(target)
      } else {
        /* 4) 排空后先把新槽内存态刷新到盘上最新版本，再解除待命；
         *    之后才让 nginx 切流量。顺序反了会让新槽带着旧用户/会话/ACL 先服务。 */
        await runtimeRequest(target.port, '/privhub/api/runtime/reload', { method: 'POST', timeoutMs: 60_000 })
        await runtimeRequest(target.port, '/privhub/api/runtime/activate', { method: 'POST', timeoutMs: 15_000 })
        log(`新槽 ${target.id} 已刷新状态并激活`)
      }

      const nextActive = buildActive(target, info, prev)
      /* 先落盘「切换意图」：控制层若在 nginx 生效前崩溃，重启后会按新 active 完成切换；
       * 反过来若 nginx 生效后才落盘，崩溃窗口里 nginx 与 active.json 会长期不一致。 */
      active = nextActive
      saveActive(nextActive)

      if (nginxAvailable()) {
        await prepareNginxConfig(nextActive)
        await ensureNginx()
        await nginxReload()
      } else {
        writeFileSync(NGINX_CONF, renderNginxConfig(nextActive), 'utf8')
      }

      broadcastVersion(nextActive)
      log(`切换完成：${prev ? prev.version + '（' + prev.slot + '）→ ' : ''}${info.version}（${target.id}），原因：${reason}`)

      if (prev) {
        const oldSlot = slotById(prev.slot)
        /* 等旧槽真正停下再返回：否则下一次切换可能与后台停止过程竞争同一端口/进程。 */
        await stopSlot(oldSlot).catch((e) => log(`警告：旧槽 ${prev.slot} 停止失败（已冻结，不影响新槽）：${e.message}`))
      }
      return {
        ok: true,
        version: info.version,
        slot: target.id,
        port: target.port,
        previous: prev ? { version: prev.version, slot: prev.slot, port: prev.port } : null,
        nginx: nginxAvailable(),
      }
    } catch (e) {
      /* 任一步失败：把 active.json / nginx 配置 / 冻结状态恢复到切换前。 */
      if (active !== prev) {
        active = prev
        if (prev) {
          try { saveActive(prev) } catch { /* ignore */ }
          if (nginxAvailable()) {
            try {
              await prepareNginxConfig(prev)
              await nginxReload()
            } catch (rollbackErr) {
              log(`警告：恢复旧 nginx 配置失败：${rollbackErr.message}`)
            }
          } else {
            try { writeFileSync(NGINX_CONF, renderNginxConfig(prev), 'utf8') } catch { /* ignore */ }
          }
        } else {
          try { rmSync(ACTIVE_FILE, { force: true }) } catch { /* ignore */ }
        }
      }
      if (newStarted) await stopSlot(target).catch((stopErr) => log(`警告：切换失败后清理新槽 ${target.id} 失败：${stopErr.message}`))
      if (oldFrozen && prev) await unfreezeSlot(prev).catch((unfreezeErr) => log(`警告：解冻旧槽失败：${unfreezeErr.message}`))
      throw e
    }
  } finally {
    busy = false
  }
}

async function performRollback() {
  const prev = active?.previous
  if (!prev) throw httpError(404, '没有可回滚的上一版本', 'PRIVHUB_NO_ROLLBACK')
  return performSwitch({
    releaseArg: prev.releaseDir,
    version: prev.version,
    slotId: prev.slot,
    reason: 'rollback',
  })
}

/* ============ 初始化 / 状态 ============ */

async function initialise({ releaseArg, slotId } = {}) {
  active = loadActive()
  if (active) return active
  const info = resolveReleaseArg(releaseArg)
  const slot = slotId ? slotById(slotId) : SLOTS.get(CONFIG.slots[0].id)
  const a = buildActive(slot, info, null)
  active = a
  saveActive(a)
  return a
}

async function ensureActiveRunning() {
  if (!active) {
    throw httpError(500, '尚未初始化 active.json；请先运行 control.mjs serve --release <dir>', 'PRIVHUB_NOT_INITIALISED')
  }
  const slot = slotById(active.slot)
  const info = validateRelease(active.releaseDir, active.version)
  await ensureSlot(slot, info.dir, info.version)
}

async function statusSnapshot() {
  const slotHealth = await Promise.all(CONFIG.slots.map(async (s) => {
    const slot = SLOTS.get(s.id)
    const h = slot.pid ? await healthCheck(s.port, 1200) : { ok: false }
    return {
      id: s.id,
      port: s.port,
      pid: slot.pid ?? h.pid ?? null,
      version: slot.version ?? h.version ?? null,
      releaseDir: slot.releaseDir ?? null,
      healthy: h.ok === true,
      frozen: h.body?.frozen ?? null,
      writesInFlight: h.body?.writesInFlight ?? null,
    }
  }))
  return {
    ok: true,
    version: active?.version ?? null,
    switchedAt: active?.switchedAt ?? null,
    active: active ? snapshotActive(active) : null,
    busy,
    dataRoot: STORE_DIR,
    dataFiles: computeDataFiles().dir,
    storeConfig: { file: STORE_CONF_FILE, loaded: storeConfLoaded, dataFilesExplicit: computeDataFiles().explicit },
    nginx: {
      available: nginxAvailable(),
      running: nginxRunning(),
      pid: nginxPid(),
      config: NGINX_CONF,
    },
    slots: slotHealth,
  }
}

/* ============ 版本广播（SSE） ============ */

function ssePayload(a) {
  return {
    version: a?.version ?? null,
    switchedAt: a?.switchedAt ?? null,
    ready: !!a,
    /* 前端据此区分「经 nginx + 常驻控制层的蓝绿部署」与「直接 npm run dev」。
     * 后者由 Node 自己应答版本查询（managed:false），不需要也收不到 SSE。 */
    managed: true,
  }
}

function broadcastVersion(a) {
  const data = JSON.stringify(ssePayload(a))
  for (const res of SSE_CLIENTS) {
    try { res.write(`event: version\ndata: ${data}\n\n`) } catch { SSE_CLIENTS.delete(res) }
  }
}

function handleVersionStream(req, res) {
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-store',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  })
  res.write(`event: hello\ndata: ${JSON.stringify(ssePayload(active))}\n\n`)
  SSE_CLIENTS.add(res)
  req.on('close', () => SSE_CLIENTS.delete(res))
}

/* ============ 控制 HTTP 服务 ============ */

function readJsonBody(req, max = 1024 * 1024) {
  return new Promise((ok, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > max) { reject(httpError(413, '请求体过大', 'PRIVHUB_BODY_TOO_LARGE')); req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (raw.trim() === '') return ok({})
      try { ok(JSON.parse(raw)) } catch { reject(httpError(400, 'invalid json', 'PRIVHUB_BAD_JSON')) }
    })
    req.on('error', reject)
  })
}

function controlAuthorized(req) {
  if (req.socket.remoteAddress !== '127.0.0.1' && req.socket.remoteAddress !== '::1'
    && req.socket.remoteAddress !== '::ffff:127.0.0.1') return false
  const raw = req.headers['x-privhub-control-token']
  const given = Array.isArray(raw) ? raw[0] : raw
  return typeof given === 'string' && given.length === CONTROL_TOKEN.length
    && timingSafeEqual(Buffer.from(given), Buffer.from(CONTROL_TOKEN))
}

async function handleControlRequest(req, res) {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1')
  const path = url.pathname

  /* 公开端点（经 nginx 暴露给浏览器）：只含版本号，不含 release 路径等内部信息。 */
  if (path === '/privhub/_version/stream') {
    if (req.method !== 'GET') return jsonReply(res, 405, { ok: false, error: 'method not allowed' })
    return handleVersionStream(req, res)
  }
  if (path === '/privhub/_version') {
    if (req.method !== 'GET') return jsonReply(res, 405, { ok: false, error: 'method not allowed' })
    return jsonReply(res, 200, ssePayload(active))
  }

  if (!path.startsWith('/control/') && path !== '/health') {
    return jsonReply(res, 404, { ok: false, error: 'not found' })
  }
  if (!controlAuthorized(req)) {
    return jsonReply(res, 403, { ok: false, error: '控制接口仅允许本机且需控制令牌', code: 'PRIVHUB_CONTROL_DENIED' })
  }

  try {
    if (path === '/health' || path === '/control/status') {
      if (req.method !== 'GET') return jsonReply(res, 405, { ok: false, error: 'method not allowed' })
      return jsonReply(res, 200, await statusSnapshot())
    }
    if (path === '/control/switch') {
      if (req.method !== 'POST') return jsonReply(res, 405, { ok: false, error: 'method not allowed' })
      const body = await readJsonBody(req)
      return jsonReply(res, 200, await performSwitch({
        releaseArg: body.releaseDir,
        version: body.version,
        slotId: body.slot,
        reason: 'api',
      }))
    }
    if (path === '/control/rollback') {
      if (req.method !== 'POST') return jsonReply(res, 405, { ok: false, error: 'method not allowed' })
      await readJsonBody(req)
      return jsonReply(res, 200, await performRollback())
    }
    if (path === '/control/freeze') {
      if (req.method !== 'POST') return jsonReply(res, 405, { ok: false, error: 'method not allowed' })
      const body = await readJsonBody(req)
      const target = body.slot ? slotById(body.slot) : active ? slotById(active.slot) : null
      if (!target) throw httpError(409, '没有活跃槽可冻结', 'PRIVHUB_NO_ACTIVE')
      const timeoutMs = Number.isFinite(Number(body.timeoutMs)) ? Number(body.timeoutMs) : CONFIG.drainTimeoutMs
      return jsonReply(res, 200, await freezeSlot({ port: target.port, slot: target.id }, timeoutMs))
    }
    if (path === '/control/unfreeze') {
      if (req.method !== 'POST') return jsonReply(res, 405, { ok: false, error: 'method not allowed' })
      const body = await readJsonBody(req)
      const target = body.slot ? slotById(body.slot) : active ? slotById(active.slot) : null
      if (!target) throw httpError(409, '没有活跃槽可解冻', 'PRIVHUB_NO_ACTIVE')
      return jsonReply(res, 200, await unfreezeSlot({ port: target.port, slot: target.id }))
    }
    if (path === '/control/stop-slot') {
      if (req.method !== 'POST') return jsonReply(res, 405, { ok: false, error: 'method not allowed' })
      const body = await readJsonBody(req)
      const target = slotById(String(body.slot || ''))
      await stopSlot(target)
      return jsonReply(res, 200, { ok: true, slot: target.id })
    }
    if (path === '/control/quit') {
      if (req.method !== 'POST') return jsonReply(res, 405, { ok: false, error: 'method not allowed' })
      jsonReply(res, 200, { ok: true, quitting: true })
      setTimeout(() => { void shutdownAll().then(() => process.exit(0)) }, 50)
      return
    }
    /* ---- 更新管理（管理界面经槽内插件代理到本机控制接口） ---- */
    if (path === '/control/update/status') {
      if (req.method !== 'GET') return jsonReply(res, 405, { ok: false, error: 'method not allowed' })
      return jsonReply(res, 200, updateStatusSnapshot())
    }
    if (path === '/control/update/check') {
      if (req.method !== 'POST') return jsonReply(res, 405, { ok: false, error: 'method not allowed' })
      await readJsonBody(req)
      if (updateCheckRunning) return jsonReply(res, 409, { ok: false, error: '已有检查任务正在运行', code: 'PRIVHUB_UPDATE_BUSY' })
      updateCheckRunning = true
      try {
        const r = await runUpdaterCommand('check', 15 * 60 * 1000)
        const parsed = parseJsonOutput(r.stdout) || parseJsonOutput(r.stderr)
        if (r.code !== 0) {
          return jsonReply(res, 200, parsed && parsed.ok === false
            ? parsed
            : { ok: false, error: (r.stderr || r.stdout || `更新检查失败（退出码 ${r.code}）`).trim().slice(-2000) })
        }
        return jsonReply(res, 200, parsed || { ok: true })
      } finally { updateCheckRunning = false }
    }
    if (path === '/control/update/apply') {
      if (req.method !== 'POST') return jsonReply(res, 405, { ok: false, error: 'method not allowed' })
      await readJsonBody(req)
      return jsonReply(res, 200, { ok: true, ...startUpdateApply() })
    }
    if (path === '/control/update/config') {
      if (req.method !== 'POST') return jsonReply(res, 405, { ok: false, error: 'method not allowed' })
      const body = await readJsonBody(req)
      return jsonReply(res, 200, { ok: true, config: saveUpdateConfig(body) })
    }
    if (path === '/control/update/rollback') {
      if (req.method !== 'POST') return jsonReply(res, 405, { ok: false, error: 'method not allowed' })
      await readJsonBody(req)
      return jsonReply(res, 200, { ok: true, ...startUpdateRollback() })
    }
    return jsonReply(res, 404, { ok: false, error: 'not found' })
  } catch (e) {
    const status = Number(e?.status) || 500
    const msg = e instanceof Error ? e.message : String(e)
    log(`控制接口失败 ${req.method} ${path}: ${msg}`)
    return jsonReply(res, status, { ok: false, error: msg, code: e?.code || 'PRIVHUB_RUNTIME_ERROR' })
  }
}

function startControlServer() {
  return new Promise((ok, fail) => {
    controlServer = createServer((req, res) => {
      void handleControlRequest(req, res).catch((e) => {
        log(`控制服务未捕获异常：${e?.stack || e}`)
        try { jsonReply(res, 500, { ok: false, error: 'internal error' }) } catch { /* ignore */ }
      })
    })
    controlServer.once('error', fail)
    controlServer.listen(CONFIG.controlPort, CONFIG.controlHost, () => {
      controlServer.off('error', fail)
      log(`控制服务监听 http://${CONFIG.controlHost}:${CONFIG.controlPort}`)
      ok()
    })
  })
}

const heartbeat = setInterval(() => {
  for (const res of SSE_CLIENTS) {
    try { res.write(': ping\n\n') } catch { SSE_CLIENTS.delete(res) }
  }
}, 25_000)
if (typeof heartbeat.unref === 'function') heartbeat.unref()

/* ============ 更新守护（可选） ============ */

/**
 * config/update.json 存在且 enabled !== false 时，随控制层一起拉起 update.mjs daemon。
 * 更新器自己不会停槽：它只调用 /control/switch，与人工切换共用同一把 busy 锁。
 * 守护退出后不自动重启——配置错误/持续失败应该留下可见日志，而不是无限重启刷屏。
 */
function startUpdater() {
  const confFile = join(CONFIG_DIR, 'update.json')
  if (!existsSync(confFile)) return
  const conf = readJson(confFile)
  if (!conf) {
    log('update.json 无法解析，更新守护未启动（必须是严格 JSON，不能写 // 注释）')
    return
  }
  if (conf.enabled === false) return
  const out = openSync(join(LOGS_DIR, 'update.log'), 'a')
  try {
    updaterChild = spawn(nodeBinary(), [join(RUNTIME_DIR, 'update.mjs'), 'daemon'], {
      cwd: HOME_DIR,
      env: {
        ...process.env,
        PRIVHUB_HOME: HOME_DIR,
        PRIVHUB_CONFIG_DIR: CONFIG_DIR,
        PRIVHUB_LOGS_DIR: LOGS_DIR,
        PRIVHUB_RELEASES_DIR: RELEASES_DIR,
        PRIVHUB_TMP_DIR: join(HOME_DIR, 'tmp'),
      },
      stdio: ['ignore', out, out],
      detached: false,
      windowsHide: true,
    })
    updaterChild.on('error', (e) => {
      updaterChild = null
      log(`更新守护启动失败：${e?.message || e}`)
    })
    updaterChild.on('exit', (code, signal) => {
      updaterChild = null
      log(`更新守护退出 code=${code} signal=${signal ?? ''}（如需恢复请检查 logs/update.log）`)
    })
    log(`更新守护已启动 pid=${updaterChild.pid}（每 ${Number(conf.intervalMinutes) || 360} 分钟检查）`)
  } catch (e) {
    log(`更新守护启动失败：${e.message}`)
  } finally {
    try { closeSync(out) } catch { /* ignore */ }
  }
}

function stopUpdater() {
  if (!updaterChild) return
  try { updaterChild.kill() } catch { /* Windows 上子进程已退出 */ }
  updaterChild = null
}

/* ============ 更新管理（供 release 内的管理界面调用） ============ */

const UPDATE_CONF = join(CONFIG_DIR, 'update.json')
const UPDATE_STATE = join(CONFIG_DIR, 'update-state.json')
let updateApplyChild = null
let updateApplyStartedAt = 0
let updateCheckRunning = false

function tailFile(file, n) {
  try {
    const text = readFileSync(file, 'utf8').trimEnd()
    if (!text) return ''
    return text.split(/\r?\n/).slice(-n).join('\n')
  } catch { return '' }
}

/**
 * 远程地址可能带凭据，回给浏览器前遮蔽用户名/密码。
 * **查询串必须原样保留**：清单地址常带 `?token=…`，管理界面会把 status 里的 config
 * 回填到表单，遮掉查询串后再保存就会把真实地址写坏。
 */
function maskUrl(v) {
  if (!v) return ''
  try {
    const u = new URL(String(v))
    if (u.username || u.password) { u.username = '***'; u.password = '***' }
    return u.toString()
  } catch { return String(v) }
}

function updaterEnv() {
  return {
    ...process.env,
    PRIVHUB_HOME: HOME_DIR,
    PRIVHUB_CONFIG_DIR: CONFIG_DIR,
    PRIVHUB_LOGS_DIR: LOGS_DIR,
    PRIVHUB_RELEASES_DIR: RELEASES_DIR,
    PRIVHUB_TMP_DIR: join(HOME_DIR, 'tmp'),
  }
}

function updateConfigSummary() {
  const conf = readJson(UPDATE_CONF) || {}
  return {
    exists: existsSync(UPDATE_CONF),
    enabled: conf.enabled !== false,
    source: conf.source || 'git',
    manifestUrl: maskUrl(conf.manifestUrl),
    remote: maskUrl(conf.remote),
    branch: conf.branch || 'main',
    subdir: conf.subdir || '',
    path: conf.path || '',
    autoApply: conf.autoApply !== false,
    intervalMinutes: Number(conf.intervalMinutes) || 360,
    keepReleases: Number(conf.keepReleases) || 3,
    requireNewer: conf.requireNewer !== false,
  }
}

function updateStatusSnapshot() {
  return {
    ok: true,
    managed: true,
    current: active?.version ?? null,
    switchedAt: active?.switchedAt ?? null,
    config: updateConfigSummary(),
    state: readJson(UPDATE_STATE),
    daemon: { running: !!updaterChild, pid: updaterChild?.pid ?? null },
    applying: !!updateApplyChild,
    applyStartedAt: updateApplyStartedAt || null,
    logTail: tailFile(join(LOGS_DIR, 'update.log'), 40),
  }
}

/** 跑一次 update.mjs 子命令并收集输出（check 可能因 git clone 较慢）。 */
function runUpdaterCommand(command, timeoutMs) {
  return new Promise((done, reject) => {
    const child = spawn(nodeBinary(), [join(RUNTIME_DIR, 'update.mjs'), command], {
      cwd: HOME_DIR,
      env: updaterEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (c) => { stdout += c })
    child.stderr.on('data', (c) => { stderr += c })
    const timer = setTimeout(() => {
      try { child.kill() } catch { /* ignore */ }
      reject(httpError(504, `更新命令超时（${Math.round(timeoutMs / 1000)}s）：${command}`, 'PRIVHUB_UPDATE_TIMEOUT'))
    }, timeoutMs)
    child.on('error', (e) => {
      clearTimeout(timer)
      reject(e)
    })
    child.on('exit', (code) => {
      clearTimeout(timer)
      try { appendFileSync(join(LOGS_DIR, 'update.log'), stdout + stderr, 'utf8') } catch { /* ignore */ }
      done({ code, stdout, stderr })
    })
  })
}

function parseJsonOutput(text) {
  const s = String(text || '').trim()
  if (!s) return null
  try { return JSON.parse(s) } catch { /* 可能包含日志前缀 */ }
  const i = s.indexOf('{')
  const j = s.lastIndexOf('}')
  if (i >= 0 && j > i) { try { return JSON.parse(s.slice(i, j + 1)) } catch { /* ignore */ } }
  return null
}

/**
 * 后台启动一个 update.mjs 任务（apply / rollback），立刻返回。
 * 进度由 update-state.json + SSE 反映；`applying` 统一由 updateApplyChild 表示，
 * 因此更新与回滚互斥（同一时间只允许一个切换动作）。
 */
function startUpdaterTask(command, label) {
  if (updateApplyChild) {
    throw httpError(409, '已有更新任务正在运行，请等待完成', 'PRIVHUB_UPDATE_BUSY')
  }
  const out = openSync(join(LOGS_DIR, 'update.log'), 'a')
  try {
    const child = spawn(nodeBinary(), [join(RUNTIME_DIR, 'update.mjs'), command], {
      cwd: HOME_DIR,
      env: updaterEnv(),
      stdio: ['ignore', out, out],
      detached: false,
      windowsHide: true,
    })
    updateApplyChild = child
    updateApplyStartedAt = Date.now()
    /* spawn 失败（找不到 node / 权限）是异步 emitted 的 'error'；没有监听器会让
     * 常驻控制层直接崩溃 —— 更新失败可以重试，控制层挂掉就全站失联。 */
    child.on('error', (e) => {
      updateApplyChild = null
      updateApplyStartedAt = 0
      log(`${label}进程启动失败：${e?.message || e}`)
    })
    child.on('exit', (code, signal) => {
      updateApplyChild = null
      updateApplyStartedAt = 0
      log(`${label}进程退出 code=${code} signal=${signal ?? ''}`)
    })
    log(`${label}已启动 pid=${child.pid}`)
    return { started: true, pid: child.pid ?? null }
  } catch (e) {
    throw httpError(500, `${label}进程启动失败：` + e.message, 'PRIVHUB_UPDATE_SPAWN_FAILED')
  } finally {
    try { closeSync(out) } catch { /* ignore */ }
  }
}

/** 一键更新：后台启动 apply，立刻返回；进度由 update-state.json + SSE 反映。 */
function startUpdateApply() {
  const conf = readJson(UPDATE_CONF)
  if (!conf) {
    throw httpError(400, '尚未配置更新源（config/update.json）', 'PRIVHUB_NO_UPDATE_CONFIG')
  }
  return startUpdaterTask('apply', '一键更新')
}

/**
 * 回滚同样交给独立进程。**不能**在调用方的槽里同步等待 performRollback()：
 * 回滚会冻结、最终停掉当前活跃槽，而发起请求的 handler 就跑在那个槽里 ——
 * 它会把自己算作「在途写」，排空永远等不到，且响应出自即将被停掉的进程。
 */
function startUpdateRollback() {
  if (!active?.previous) {
    throw httpError(404, '没有可回滚的上一版本', 'PRIVHUB_NO_ROLLBACK')
  }
  return startUpdaterTask('rollback', '回滚')
}

const UPDATE_CONFIG_KEYS = new Set([
  'enabled', 'source', 'remote', 'branch', 'subdir', 'path', 'manifestUrl',
  'autoApply', 'intervalMinutes', 'keepReleases', 'requireNewer', 'allowUnverified',
])

function saveUpdateConfig(body) {
  const src = body && typeof body === 'object' && !Array.isArray(body) ? body : {}
  const conf = {}
  for (const key of UPDATE_CONFIG_KEYS) {
    if (Object.prototype.hasOwnProperty.call(src, key)) conf[key] = src[key]
  }
  if (conf.source !== undefined && !['git', 'dir', 'http'].includes(String(conf.source))) {
    throw httpError(400, 'source 只支持 git / dir / http', 'PRIVHUB_BAD_UPDATE_CONFIG')
  }
  if (conf.manifestUrl) {
    try {
      const u = new URL(String(conf.manifestUrl))
      if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('protocol')
    } catch {
      throw httpError(400, 'manifestUrl 必须是 http(s) 地址', 'PRIVHUB_BAD_UPDATE_CONFIG')
    }
  }
  for (const key of ['intervalMinutes', 'keepReleases']) {
    if (conf[key] !== undefined) {
      const n = Number(conf[key])
      if (!Number.isFinite(n) || n < 0) throw httpError(400, `${key} 必须是非负数字`, 'PRIVHUB_BAD_UPDATE_CONFIG')
      conf[key] = n
    }
  }
  ensureDir(CONFIG_DIR)
  const tmp = UPDATE_CONF + '.tmp'
  writeFileSync(tmp, JSON.stringify(conf, null, 2) + '\n', 'utf8')
  renameSync(tmp, UPDATE_CONF)
  /* 配置改变后重启守护：否则它仍按启动时的旧源检查。 */
  stopUpdater()
  setTimeout(() => { try { startUpdater() } catch (e) { log(`重启更新守护失败：${e.message}`) } }, 200)
  log(`更新源配置已写入：${UPDATE_CONF}（source=${conf.source || '未指定'}）`)
  return updateConfigSummary()
}

/* ============ 启停 ============ */

async function shutdownAll() {
  if (shuttingDown) return
  shuttingDown = true
  log('正在停止运行时（更新守护 + 槽进程 + nginx + 控制服务）')
  /* 先停更新守护：避免它在停机过程中发起一次切换。 */
  stopUpdater()
  for (const slot of SLOTS.values()) {
    try { await stopSlot(slot) } catch (e) { log(`停止槽 ${slot.id} 失败：${e.message}`) }
  }
  try { await stopNginx() } catch (e) { log(`停止 nginx 失败：${e.message}`) }
  if (controlServer) {
    await new Promise((ok) => controlServer.close(() => ok()))
  }
}

async function serve({ releaseArg, slotId }) {
  validateStoreRoots()
  ensureBaseDirs()
  await initialise({ releaseArg, slotId })
  await ensureActiveRunning()
  if (nginxAvailable()) {
    await prepareNginxConfig(active)
    await ensureNginx()
    await nginxReload()
  } else {
    writeFileSync(NGINX_CONF, renderNginxConfig(active), 'utf8')
  }
  await startControlServer()
  startUpdater()
  broadcastVersion(active)
  log(`运行时就绪：版本 ${active.version}，槽 ${active.slot}（127.0.0.1:${active.port}）`)
  {
    const df = computeDataFiles()
    log(`存储根：系统数据 ${STORE_DIR}；文件库 ${df.dir}`
      + `（${df.explicit ? '显式配置' : '默认'}）；配置文件 ${STORE_CONF_FILE}${storeConfLoaded ? '' : '（不存在）'}`)
  }
  if (nginxAvailable()) {
    log(`对外入口：http://${CONFIG.publicHost}:${CONFIG.publicPort}（nginx）`)
  } else {
    log('提示：nginx 缺失，当前未提供对外入口；安装见 runtime/README.md')
  }

  const onSignal = (sig) => {
    log(`收到 ${sig}，开始优雅停机`)
    void shutdownAll().then(() => process.exit(0), () => process.exit(1))
  }
  process.on('SIGINT', onSignal)
  process.on('SIGTERM', onSignal)
}

/* ============ CLI ============ */

function parseArgs(argv) {
  const flags = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) continue
    const key = a.slice(2)
    const next = argv[i + 1]
    if (next !== undefined && !next.startsWith('--')) { flags[key] = next; i++ }
    else flags[key] = true
  }
  return flags
}

async function cliStatus() {
  try {
    const r = await runtimeRequest(CONFIG.controlPort, '/control/status', { timeoutMs: 5000 })
    console.log(JSON.stringify(r, null, 2))
    return 0
  } catch (e) {
    const a = loadActive()
    console.log(JSON.stringify({
      ok: false,
      error: '控制服务未运行：' + e.message,
      active: a ? snapshotActive(a) : null,
      dataRoot: STORE_DIR,
      dataFiles: computeDataFiles().dir,
      nginx: { available: nginxAvailable(), running: nginxRunning() },
    }, null, 2))
    return 1
  }
}

async function cliControl(action, body) {
  try {
    const r = await runtimeRequest(CONFIG.controlPort, `/control/${action}`, {
      method: 'POST', body: body || {}, timeoutMs: 180_000,
    })
    console.log(JSON.stringify(r, null, 2))
    return 0
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: e.message, code: e.code || null }, null, 2))
    return 1
  }
}

async function main() {
  const argv = process.argv.slice(2)
  const cmd = argv.find((a) => !a.startsWith('--')) || 'serve'
  const flags = parseArgs(argv)
  /* adopt-legacy --dry-run 需要重跑一次探测（模块加载时没看见这个参数）。 */
  if (cmd === 'adopt-legacy' && flags['dry-run']) process.env.PRIVHUB_ADOPT_DRY_RUN = '1'

  if (cmd === 'help' || flags.help) {
    console.log([
      'PrivHub runtime control',
      '  serve [--release <dir>] [--slot blue|green]   启动槽进程、nginx 与控制服务',
      '  status                                        查看状态（经控制服务，未运行则读文件）',
      '  switch --release <dir> | --version <ver>      切换蓝绿槽',
      '  rollback                                      回到上一版本',
      '  freeze [--slot blue|green]                    冻结指定槽写入（调试用）',
      '  unfreeze [--slot blue|green]',
      '  stop-slot --slot blue|green',
      '  stop                                          停止整个运行时',
      '  render-config                                 重新生成并测试 nginx 配置',
      '  init --release <dir> [--slot blue|green]      只写 active.json（不启动进程）',
      '  adopt-legacy [--dry-run]                      从当前单进程实例沿用库根/端口，写入 config/store.json',
    ].join('\n'))
    return 0
  }

  if (cmd === 'serve') {
    /* REQ-6：首次以蓝绿启动、且完全没配置过根时，沿用现有单进程实例的根。
     * 放在 serve 之前（不是模块加载期），避免 status/help 这类只读命令产生副作用。 */
    activateLegacyAdoption()
    await serve({ releaseArg: flags.release, slotId: typeof flags.slot === 'string' ? flags.slot : undefined })
    return null // 常驻
  }

  if (cmd === 'init') {
    ensureBaseDirs()
    const a = await initialise({
      releaseArg: flags.release,
      slotId: typeof flags.slot === 'string' ? flags.slot : undefined,
    })
    if (!existsSync(RUNTIME_CONF)) writeJsonAtomic(RUNTIME_CONF, defaultRuntimeConfig())
    writeFileSync(NGINX_CONF, renderNginxConfig(a), 'utf8')
    console.log(JSON.stringify({ ok: true, active: snapshotActive(a), config: NGINX_CONF }, null, 2))
    return 0
  }

  if (cmd === 'render-config') {
    const a = loadActive()
    if (!a) throw httpError(409, 'active.json 不存在，无法生成配置', 'PRIVHUB_NOT_INITIALISED')
    await prepareNginxConfig(a)
    console.log(JSON.stringify({ ok: true, config: NGINX_CONF, tested: nginxAvailable() }, null, 2))
    return 0
  }

  if (cmd === 'adopt-legacy') {
    /* 显式体检式入口：主人可以随时跑一次，看「会不会沿用、沿用成什么」，
     * 而不必真的起服务。--dry-run 只报告不落盘。 */
    const dryRun = Boolean(flags['dry-run'])
    const result = activateLegacyAdoption({ dryRun })
    console.log(JSON.stringify({
      ok: true,
      home: HOME_DIR,
      storeConfig: STORE_CONF_FILE,
      adopted: Boolean(result.used && !result.dryRun),
      feasible: Boolean(result.feasible),
      dataRoot: result.dataRoot || null,
      dataFiles: result.dataFiles || null,
      publicPort: result.publicPort || null,
      notes: result.notes || [],
      dryRun,
    }, null, 2))
    return 0
  }

  if (cmd === 'status') return cliStatus()
  if (cmd === 'switch') {
    const body = flags.release || flags.version
      ? { releaseDir: flags.release, version: flags.version }
      : null
    if (!body) throw httpError(400, 'switch 需要 --release <dir> 或 --version <ver>', 'PRIVHUB_BAD_ARGS')
    return cliControl('switch', body)
  }
  if (cmd === 'rollback') return cliControl('rollback', {})
  if (cmd === 'freeze') return cliControl('freeze', { slot: flags.slot })
  if (cmd === 'unfreeze') return cliControl('unfreeze', { slot: flags.slot })
  if (cmd === 'stop-slot') {
    if (!flags.slot) throw httpError(400, 'stop-slot 需要 --slot', 'PRIVHUB_BAD_ARGS')
    return cliControl('stop-slot', { slot: flags.slot })
  }
  if (cmd === 'stop') return cliControl('quit', {})

  throw httpError(400, `未知命令：${cmd}`, 'PRIVHUB_BAD_ARGS')
}

main().then((code) => {
  if (typeof code === 'number') process.exit(code)
}).catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e?.message || String(e), code: e?.code || null }, null, 2))
  process.exit(1)
})
