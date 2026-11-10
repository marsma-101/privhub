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
  openSync, closeSync, rmSync, renameSync, appendFileSync,
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

/**
 * 数据根：默认落在 <home>/store；但旧布局（仓库里 data/ 与 data-files/ 直接在
 * 应用根）也自动识别，避免在开发机上凭空建一个空 store 把老数据「藏起来」。
 */
function detectStoreDir() {
  const explicit = process.env.PRIVHUB_STORE_DIR?.trim() || process.env.PRIVHUB_DATA_ROOT?.trim()
  if (explicit) return resolve(explicit)
  if (existsSync(join(HOME_DIR, 'store'))) return join(HOME_DIR, 'store')
  if (existsSync(join(HOME_DIR, 'data')) || existsSync(join(HOME_DIR, 'data-files'))) return HOME_DIR
  return join(HOME_DIR, 'store')
}
const STORE_DIR = detectStoreDir()

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
  const child = spawn(nodeBinary(), ['--import', 'tsx/esm', 'src/main.ts', '--port', String(slot.port)], {
    cwd: dir,
    env: {
      ...process.env,
      PRIVHUB_ROOT: dir,
      PRIVHUB_DATA_ROOT: STORE_DIR,
      PRIVHUB_HOST: '127.0.0.1',
      PRIVHUB_CONTROL_TOKEN: CONTROL_TOKEN,
      PRIVHUB_SLOT: slot.id,
      /* 待命槽在旧槽仍服务时预热：不跑后台写任务，等控制层 reload + activate。
       * 显式写 '0' 防止控制层自身环境里的同名变量被继承。 */
      PRIVHUB_STANDBY: standby ? '1' : '0',
    },
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

async function performSwitch({ releaseArg, version, slotId, reason }) {
  if (busy) throw httpError(409, '已有切换操作进行中，请稍后重试', 'PRIVHUB_BUSY')
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
  log(`运行时就绪：版本 ${active.version}，槽 ${active.slot}（127.0.0.1:${active.port}），数据根 ${STORE_DIR}`)
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
    ].join('\n'))
    return 0
  }

  if (cmd === 'serve') {
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
