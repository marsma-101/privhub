/**
 * 系统 JSON 数据「损坏不得静默当空数据覆写」回归（privhub-core/json-store，D4）
 *
 * 为什么单独有这个文件：本仓十几个插件过去都把落盘 JSON 读成
 *
 *   if (!existsSync(FILE)) return {}
 *   try { return JSON.parse(await storage.readText(FILE)) } catch { return {} }
 *
 * 这行 `catch { return {} }` 把「文件坏了」和「还没有数据」抹成同一种结果：
 *   ① 界面上显示「空列表」，用户以为数据本来就没有 —— 没人会去修；
 *   ② 紧接着那次 `save()`（读-改-写）就把**可能还能人工恢复**的原文永久盖掉。
 *      `data/agent-keys.json`、`data/invites.json` 这类凭据文件尤其致命：
 *      一次「新建」就把已有凭据全部清空。
 *
 * 修完的形状（本文件钉住的契约）：
 *   · 文件不存在 / 内容为空 → 返回 fallback（这是合法的「还没有数据」）；
 *   · 读不出来 / 不是合法 JSON / 形状与预期不符 → **逐字节隔离存证，然后抛错**；
 *   · 抛出的错误带 `userVisible === true`，`src/web-server.ts` 的兜底 catch 据此
 *     把中文原因回给客户端（500 + `{ok:false,error}`），而不是一句 `internal server error`。
 *
 * 断言原则：指向**可观察的行为**，不指向实现。
 *   ✅ 「坏文件当场报错，且错误能被前端看到具体原因」
 *   ✅ 「坏文件的原始字节原地不动，且另有一份逐字节存证」
 *   ✅ 「同一份损坏只隔离一次（重复读不堆垃圾）」
 *   ✅ 「写路径被拒绝（HTTP 层真的拒了），盘上内容分毫未动」
 *   ✅ 「人工修好之后功能恢复」
 *   ❌ 不断言具体中文句子（文案会变）、不断言隔离文件名的哈希算法（改法会变）
 *   ⚠ 包含一小组**阴性对照**：断言「合法文件不会被误判」（形状正确时照常读出），
 *      否则「什么都拒绝」也能把本文件骗绿。
 *
 * 两部分：
 *   ① 进程内单测 `json-store` 的语义（假 storage + 真临时目录，不连服务）；
 *   ② 起一个隔离实例（端口 3198 / 根 tests/.testroot-corrupt），端到端验证
 *      「HTTP 层看得见 + 写路径真的被拒 + 盘上内容没动 + 修好能恢复」。
 *
 *   node --import tsx/esm tests/json-corruption.mjs
 *
 * @module tests/json-corruption
 */

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join, basename } from 'node:path'
import { existsSync, mkdirSync, lstatSync, unlinkSync, rmSync, symlinkSync, writeFileSync, readFileSync, readdirSync } from 'node:fs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')

const UNIT = join(HERE, '.testroot-json-unit')
const E2E_ROOT = join(HERE, '.testroot-corrupt')
const PORT = Number(process.env.PRIVHUB_CORRUPTTEST_PORT || 3198)
const BASE = `http://127.0.0.1:${PORT}`
const PROJECT = '公共'

let pass = 0
let fail = 0
const failures = []
function ok(cond, msg) {
  if (cond) { pass++ } else { fail++; failures.push(msg) }
  console.log((cond ? '  ✅ ' : '  ❌ ') + msg)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ================================================================================
 * 第一部分：json-store 的进程内语义
 * ================================================================================ */

const J = await import('../plugins/privhub-core/src/json-store.ts')
const { readJsonStore, readJsonStoreLenient, assertStoreWritable, CorruptDataError, UserVisibleError, msgOf } = J

rmSync(UNIT, { recursive: true, force: true })
mkdirSync(UNIT, { recursive: true })

/** 明文直读的假 storage —— 本组考的是 json-store 的逻辑，不是加解密。 */
const plainRead = { readText: async (f) => readFileSync(f, 'utf8') }

/** 下探探针文件（真实落盘，因为隔离逻辑走的是真 fs）。 */
function probe(name, content) {
  const f = join(UNIT, name)
  writeFileSync(f, content, 'utf8')
  return f
}
const countBak = (name) => readdirSync(UNIT).filter((n) => new RegExp('^' + name.replace(/\./g, '\\.') + '\\.corrupt-[0-9a-f]{8}\\.bak$').test(n)).length

/** 收住 console.error：损坏必须**进日志**，否则运维根本不知道磁盘上有东西坏了。 */
const errLines = []
const realConsoleError = console.error
console.error = (...args) => { errLines.push(args.map((a) => (a instanceof Error ? a.message : String(a))).join(' ')) }

console.log('\n── 1. 「还没有数据」与「数据坏了」必须分开 ──')

const MISSING = join(UNIT, 'absent.json')
const miss = await readJsonStore(plainRead, MISSING, { empty: true })
ok(JSON.stringify(miss) === '{"empty":true}', '文件不存在 → 返回 fallback（合法的「还没有数据」）')
ok(!existsSync(MISSING + '.corrupt-' + '0'.repeat(8) + '.bak') && countBak('absent.json') === 0,
  '文件不存在时不会去隔离什么（没有误报）')

const EMPTY = probe('empty.json', '')
const WS = probe('ws.json', '  \n\t \n')
ok(JSON.stringify(await readJsonStore(plainRead, EMPTY, [])) === '[]', '空文件 → 返回 fallback（历史实现用空串表示空数据，保持兼容）')
ok(JSON.stringify(await readJsonStore(plainRead, WS, [])) === '[]', '只有空白字符的文件同样视作「没有数据」')
ok(countBak('empty.json') === 0 && countBak('ws.json') === 0, '空文件不被当作损坏（阴性对照：不能什么都拒绝）')

const GOOD = probe('good.json', '{"x":[1,2],"中文":"值"}')
const good = await readJsonStore(plainRead, GOOD, null)
ok(good && good.中文 === '值' && Array.isArray(good.x), '合法 JSON → 原样读出（含中文）')

console.log('\n── 2. 损坏：报错 + 逐字节隔离存证 ──')

const BROKEN_TEXT = '{ "a": 1, "b": '
const BROKEN = probe('broken.json', BROKEN_TEXT)
const beforeBytes = readFileSync(BROKEN)
let err = null
try { await readJsonStore(plainRead, BROKEN, {}) } catch (e) { err = e }
ok(err instanceof CorruptDataError, '损坏的 JSON → 抛错，而不是回退成空对象')
ok(err instanceof UserVisibleError && err.userVisible === true,
  '错误带 `userVisible` 标记（兜底 catch 据此把原因回给客户端，而不是 `internal server error`）')
ok(err && /损坏/.test(err.message), `错误文案说清了是「损坏」（实测「${err && err.message.slice(0, 40)}…」）`)
ok(err && err.message.includes('broken.json'), '错误文案点名了是哪个文件（运维要能直接找到它）')
ok(err && !err.message.includes(UNIT),
  '错误文案不含完整磁盘路径（回给客户端的东西不泄露宿主目录结构）')
ok(err && typeof err.quarantine === 'string' && existsSync(err.quarantine), '隔离文件真的落在磁盘上')
ok(err && Buffer.compare(readFileSync(err.quarantine), beforeBytes) === 0,
  '隔离文件与损坏原文**逐字节一致**（存的是证据，不是转述）')
ok(err && /^broken\.json\.corrupt-[0-9a-f]{8}\.bak$/.test(basename(err.quarantine)),
  `隔离文件按内容哈希命名（实测 ${err && basename(err.quarantine)}）`)
ok(Buffer.compare(readFileSync(BROKEN), beforeBytes) === 0, '原文件原地不动（只读不写，交给人来处置）')
ok(errLines.some((l) => l.includes('[json-store]') && l.includes('broken.json') && l.includes('损坏')),
  '损坏同时进了日志（console.error）—— 不静默')

console.log('\n── 3. 重复读不堆垃圾 ──')

let err2 = null
try { await readJsonStore(plainRead, BROKEN, {}) } catch (e) { err2 = e }
ok(err2 && err2.quarantine === err.quarantine, '第二次读同一份损坏 → 指向同一份存证')
ok(countBak('broken.json') === 1, `同一份损坏内容只隔离一次（实测 ${countBak('broken.json')} 个 .bak）`)

/* 两份不同内容写进同名文件：应当各留一份证据（否则「修了一下又坏」会丢历史） */
writeFileSync(BROKEN, '{ "a": 2', 'utf8')
let err3 = null
try { await readJsonStore(plainRead, BROKEN, {}) } catch (e) { err3 = e }
ok(err3 && err3.quarantine !== err.quarantine && countBak('broken.json') === 2,
  '内容变了 → 另存一份（不会把新证据覆盖到旧存证上）')

console.log('\n── 4. 形状校验：读得出来但「不是这个存储该有的样子」也算坏 ──')

const NULLF = probe('nullish.json', 'null')
let errN = null
try { await readJsonStore(plainRead, NULLF, {}) } catch (e) { errN = e }
ok(errN instanceof CorruptDataError && /null/.test(errN.message),
  '顶层 null 视为损坏（本模块服务的都是对象/数组形状的存储）')

const SHAPE = probe('shape.json', '{"hello":"world"}')
let errS = null
try { await readJsonStore(plainRead, SHAPE, [], (v) => Array.isArray(v)) } catch (e) { errS = e }
ok(errS instanceof CorruptDataError && /形状/.test(errS.message),
  'check() 判形状不符 → 同样隔离 + 抛错（不静默把对象当数组用）')

/* 阴性对照：check 显式放行 null —— model.json「尚未配置」的合法状态就是文件内容 null */
const OKNULL = probe('ok-null.json', 'null')
const okNull = await readJsonStore(plainRead, OKNULL, 'NOT-REACHED', (v) => v === null || typeof v === 'object')
ok(okNull === null, 'check 显式接受 null 时正常返回 null（阴性对照：不能把合法状态误判为损坏）')
ok(countBak('ok-null.json') === 0, '被 check 放行的 null 不会被隔离')

console.log('\n── 5. 解密/IO 失败：拿不到文本也要留证据 ──')

const DEC = probe('decrypt.json', '{"secret":"sk-xxx"}')
const decBytes = readFileSync(DEC)
const failRead = { readText: async () => { throw new Error('Unsupported state or unable to authenticate data') } }
let errD = null
try { await readJsonStore(failRead, DEC, {}) } catch (e) { errD = e }
ok(errD instanceof CorruptDataError, '读/解密失败 → 抛错（而不是回退成空对象）')
ok(errD && /读取或解密失败/.test(errD.message), '错误文案说明是「读不出来/解不开」这一类（与「JSON 语法错」可区分）')
ok(errD && errD.quarantine && Buffer.compare(readFileSync(errD.quarantine), decBytes) === 0,
  '此时隔离的是**磁盘原始字节**（密文解不开也一样留证，不放过）')

/* existsSync 之后文件被删：这不是损坏，是竞态，按「没有数据」处理 */
const RACE = probe('race.json', '{}')
const enoentRead = { readText: async () => { const e = new Error('ENOENT'); e.code = 'ENOENT'; throw e } }
let raced = null
try { raced = await readJsonStore(enoentRead, RACE, { raced: true }) } catch (e) { raced = e }
ok(raced && raced.raced === true, 'existsSync 之后文件消失（ENOENT 竞态）→ 按「没有数据」处理，不误报损坏')
ok(countBak('race.json') === 0, '竞态不产生隔离文件')

console.log('\n── 6. 宽容版只给「可重建的派生数据」用 ──')

const LEN = probe('lenient.json', '{oops')
const len = await readJsonStoreLenient(plainRead, LEN, { fallback: true })
ok(len && len.fallback === true, '宽容版损坏时不抛错，返回 fallback（派生数据可重建，不值得中断功能）')
ok(countBak('lenient.json') === 1, '但**一样落存证**（宽容 ≠ 放过）')
ok(errLines.some((l) => l.includes('lenient.json') && l.includes('损坏')),
  '并且一样进日志（宽容只影响「要不要中断」，不影响「要不要留痕」）')

console.log('\n── 7. 「内存里缓存了一份」的服务：写回前必须自查 ──')

let threw = false
try { assertStoreWritable(true, join(UNIT, 'acl.json')) } catch { threw = true }
ok(!threw, '自知健康时放行（阴性对照：不能把正常写入也拒了）')
let errW = null
try { assertStoreWritable(false, join(UNIT, 'acl.json')) } catch (e) { errW = e }
ok(errW instanceof UserVisibleError && errW.userVisible === true,
  '自知此前读坏 → 抛带 userVisible 的错（HTTP 层会把原因回给客户端）')
ok(errW && errW.message.includes('acl.json') && /写入已拒绝/.test(errW.message),
  `拒绝文案点名文件并说明「写入已被拒」（实测「${errW && errW.message.slice(0, 30)}…」）`)
ok(errW && /重启/.test(errW.message), '并且告诉运维修好之后要重启服务（否则他会在原地反复试）')
ok(msgOf(errW) === errW.message && msgOf('x') === 'x', 'msgOf 把 Error / 非 Error 都取成可读文本')

/* 恢复真实 console.error，免得后面被自己的拦截器干扰 */
console.error = realConsoleError
rmSync(UNIT, { recursive: true, force: true })

/* ================================================================================
 * 第二部分：端到端 —— 损坏在 HTTP 层真的「看得见、写不进、丢不掉」
 * ================================================================================ */

/** 清掉测试根（junction 先卸，绝不触碰真实源码与真实数据）。 */
function cleanRoot() {
  if (!existsSync(E2E_ROOT)) return
  for (const d of ['src', 'plugins', 'frontend', 'node_modules']) {
    const link = join(E2E_ROOT, d)
    try { if (existsSync(link) && lstatSync(link).isSymbolicLink()) unlinkSync(link) } catch { /* 忽略 */ }
  }
  try { rmSync(E2E_ROOT, { recursive: true, force: true }) } catch { /* 忽略 */ }
}

/* 启动前就损坏的几份文件：验证「启动时读进内存、之后才写回」的服务也会拒绝写回。
 * 内容取最现实的损坏形态：写到一半的 JSON（断电/磁盘满的典型产物）。 */
const ACL_FILE = join(E2E_ROOT, 'data', 'acl.json')
const MODEL_FILE = join(E2E_ROOT, 'data', 'model.json')
const BOARD_FILE = join(E2E_ROOT, 'data', 'taskboards', PROJECT + '.json')
const INVITE_FILE = join(E2E_ROOT, 'data', 'invites.json')

const ACL_BROKEN = '{\n  "rules": [ { "id": "r1", "proje'
const MODEL_BROKEN = '{"llm": { "baseURL": "http://127.0.0.1:11434", "'
const BOARD_BROKEN = '{"hello":"world"}'

function prepareRoot() {
  cleanRoot()
  mkdirSync(join(E2E_ROOT, 'data', 'taskboards'), { recursive: true })
  for (const d of ['src', 'plugins', 'frontend', 'node_modules']) {
    const link = join(E2E_ROOT, d)
    try { if (!existsSync(link)) symlinkSync(join(ROOT, d), link, 'junction') } catch { /* 已存在或权限不足 */ }
  }
  writeFileSync(ACL_FILE, ACL_BROKEN, 'utf8')
  writeFileSync(MODEL_FILE, MODEL_BROKEN, 'utf8')
  writeFileSync(BOARD_FILE, BOARD_BROKEN, 'utf8')
}

/** 服务端 stderr 累计。装配层「插件静默挂不上」只会出现在这里 —— 抓它。 */
let serverStderr = ''

function startServer() {
  const c = spawn(process.execPath, ['--import', 'tsx/esm', 'src/main.ts', '--port', String(PORT)], {
    cwd: E2E_ROOT,
    env: { ...process.env, PRIVHUB_ROOT: E2E_ROOT, PRIVHUB_TEST_ROOT: E2E_ROOT },
    stdio: ['ignore', 'ignore', 'pipe'],
  })
  c.stderr.on('data', (d) => { serverStderr += String(d) })
  return c
}

async function stopServer(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return
  const done = new Promise((r) => child.once('exit', r))
  child.kill()
  const t = await Promise.race([done.then(() => false), new Promise((r) => setTimeout(r, 2000))])
  if (t) { child.kill('SIGKILL'); await Promise.race([done, new Promise((r) => setTimeout(r, 1500))]) }
}

async function waitReady(ms = 60000) {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    try {
      const r = await fetch(BASE + '/privhub/api/health', { signal: AbortSignal.timeout(2000) })
      if (r.status === 200) return true
    } catch { /* 未就绪 */ }
    await sleep(300)
  }
  return false
}

async function api(method, path, { token, body } = {}) {
  const headers = {}
  let payload
  if (body !== undefined) { payload = Buffer.from(JSON.stringify(body), 'utf8'); headers['content-type'] = 'application/json' }
  if (token) headers.authorization = 'Bearer ' + token
  const res = await fetch(BASE + path, { method, headers, body: payload, signal: AbortSignal.timeout(30000) })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* 非 JSON */ }
  return { status: res.status, text, json }
}

/** 服务器今天的日志文件内容（含启动期告警）。 */
function serverLog() {
  const dir = join(E2E_ROOT, 'data', 'logs')
  try {
    return readdirSync(dir).filter((n) => n.startsWith('privhub-') && n.endsWith('.log'))
      .map((n) => readFileSync(join(dir, n), 'utf8')).join('\n')
  } catch { return '' }
}
const countBakIn = (dir, name) => {
  try { return readdirSync(dir).filter((n) => new RegExp('^' + name.replace(/\./g, '\\.') + '\\.corrupt-[0-9a-f]{8}\\.bak$').test(n)).length } catch { return 0 }
}

prepareRoot()
console.log('\n── 8. 端到端：启动前就损坏的文件（内存缓存型服务）──')
const servers = [startServer()]
const child = servers[0]
let logs = ''
try {
  const ready = await waitReady()
  ok(ready, `隔离实例在 ${PORT} 上就绪（数据文件损坏也不该阻止服务启动 —— 否则运维连修都没法修）`)
  if (!ready) throw new Error('服务器未就绪')

  /* 装配层静默失效的哨兵：插件挂不上时路由是 404、而日志只写一行 stderr。
   * 本仓修过这类「改动后插件悄悄没了」的事故，故把它变成常驻断言。 */
  ok(!/插件加载失败/.test(serverStderr) && !/Cannot find module/.test(serverStderr),
    `启动期没有任何插件加载失败（实测 stderr ${serverStderr.includes('插件加载失败') ? '含失败' : '干净'}）`)

  const login = await api('POST', '/privhub/api/login', { body: { username: 'admin', password: 'admin123' } })
  const token = login.json && login.json.token
  ok(!!token, '管理员登录拿到 token')

  /* 阴性对照：损坏的是 acl/model/board，读路径本身没坏 */
  const lang = await api('GET', '/privhub/api/invite/list', { token })
  ok(lang.status === 200 && lang.json && lang.json.ok === true,
    '阴性对照：未被破坏的 invites.json 照常读出 200（证明下面那几条不是「什么都拒」）')

  console.log('\n  · ACL 规则文件（启动读进内存，之后按需写回）')
  const noTok = await api('GET', '/privhub/api/invite/list')
  ok(noTok.status === 401, `未登录访问管理接口被拒（实际 ${noTok.status}）`)

  const aclDeny = await api('POST', '/privhub/api/acl/policy', {
    token, body: { project: PROJECT, path: '', target: 'dir', role: 'user', mode: 'deny' },
  })
  ok(aclDeny.status === 500 && aclDeny.json && aclDeny.json.ok === false,
    `ACL 写回被拒（实际 ${aclDeny.status}，信封 ok:false）`)
  const aclMsg = (aclDeny.json && aclDeny.json.error) || ''
  ok(/acl\.json/.test(aclMsg) && /写入已拒绝/.test(aclMsg),
    `拒绝原因点名 acl.json 且说明是「写入已拒绝」（实测「${aclMsg.slice(0, 34)}…」）`)
  ok(aclMsg !== 'internal server error', '不是笼统的 internal server error —— 运维/用户看得到真实原因')
  ok(readFileSync(ACL_FILE, 'utf8') === ACL_BROKEN,
    '损坏的 acl.json 盘上内容**分毫未动**（这才是这条修复的全部意义）')

  console.log('\n  · 模型配置（含接口密钥）')
  const getCfg = await api('GET', '/privhub/api/model/config', { token })
  ok(getCfg.status === 200 && getCfg.json && getCfg.json.configured === false,
    '读路径照常工作：损坏的配置显示为「未配置」（读不崩，写才拒）')
  const setCfg = await api('POST', '/privhub/api/model/config', {
    token, body: { llm: { baseURL: 'mock', model: 'm' }, embedding: { baseURL: 'mock', model: 'e' }, maxRetries: 1 },
  })
  ok(setCfg.status === 400 && setCfg.json && setCfg.json.ok === false, `模型配置写回被拒（实际 ${setCfg.status}）`)
  const setMsg = (setCfg.json && setCfg.json.error) || ''
  ok(/model\.json/.test(setMsg) && /写入已拒绝/.test(setMsg),
    `拒绝原因点名 model.json 且说明是「写入已拒绝」（实测「${setMsg.slice(0, 34)}…」）`)
  ok(readFileSync(MODEL_FILE, 'utf8') === MODEL_BROKEN,
    '本来要连带密钥一起被覆盖的 model.json **一字未改**')

  console.log('\n  · 任务看板（形状不符也算损坏）')
  const board = await api('GET', '/privhub/api/taskboard?' + new URLSearchParams({ project: PROJECT }), { token })
  ok(board.status === 500 && board.json && board.json.ok === false, `看板读取报错而非静默回默认空板（实际 ${board.status}）`)
  const boardMsg = (board.json && board.json.error) || ''
  ok(boardMsg.includes(PROJECT + '.json') && /形状/.test(boardMsg),
    `原因点名是哪个项目文件、并说清是「形状不符」（实测「${boardMsg.slice(0, 40)}…」）`)
  ok(readFileSync(BOARD_FILE, 'utf8') === BOARD_BROKEN, '形状不符的看板文件原地不动')
  ok(countBakIn(join(E2E_ROOT, 'data', 'taskboards'), PROJECT + '.json') === 1,
    '并且留了一份逐字节存证（形状不符也是损坏，不是「空看板」）')

  console.log('\n  · 启动期损坏已经进了运维能看的日志')
  logs = serverLog()
  ok(/acl\.json/.test(logs) && /读取失败/.test(logs), '日志里有 acl.json 读取失败的记录（启动自检不静默）')
  ok(/model\.json/.test(logs) && /读取失败/.test(logs), '日志里有 model.json 读取失败的记录')

  console.log('\n── 9. 端到端：运行中被写坏的文件（读-改-写型调用点）──')

  /* 先造一份**好**数据 —— 它代表用户真实的工作成果 */
  const made = await api('POST', '/privhub/api/invite/create?' + new URLSearchParams({ project: PROJECT }), { token })
  ok(made.status === 200 && made.json && made.json.ok === true && typeof made.json.code === 'string',
    '阴性对照：正常路径能生成邀请码')
  const goodCode = made.json && made.json.code
  const listed = await api('GET', '/privhub/api/invite/list', { token })
  const goodInvites = JSON.stringify((listed.json && listed.json.invites) || [])
  ok(goodCode && goodInvites.includes(goodCode), '列表里能看到刚生成的邀请码')

  /* 现在把文件写坏（模拟断电/磁盘满/外部误改） */
  const INV_BROKEN = '[\n  { "code": "abc'
  writeFileSync(INVITE_FILE, INV_BROKEN, 'utf8')

  const listBad = await api('GET', '/privhub/api/invite/list', { token })
  ok(listBad.status === 500 && listBad.json && listBad.json.ok === false, `损坏后列表报错而非显示空列表（实际 ${listBad.status}）`)
  const invMsg = (listBad.json && listBad.json.error) || ''
  ok(/invites\.json/.test(invMsg) && /损坏/.test(invMsg),
    `原因点名 invites.json 并说清是「损坏」（实测「${invMsg.slice(0, 40)}…」）`)
  ok(invMsg !== 'internal server error' && invMsg.length > 20, '回给客户端的是可读中文原因，不是一句笼统错误')

  /* 关键：读-改-写型调用点（生成邀请 = 先读后写）必须整笔被拒，而不是「读到空 → 写回只剩新码」 */
  const createBad = await api('POST', '/privhub/api/invite/create?' + new URLSearchParams({ project: PROJECT }), { token })
  ok(createBad.status === 500 && createBad.json && createBad.json.ok === false,
    `「生成邀请」在损坏时整笔被拒（实际 ${createBad.status}）`)
  ok(readFileSync(INVITE_FILE, 'utf8') === INV_BROKEN,
    '★ 坏文件没有被那次写回覆盖 —— 直接挡住了一次真实的数据丢失')
  const invBaks = readdirSync(join(E2E_ROOT, 'data')).filter((n) => n.startsWith('invites.json.corrupt-'))
  ok(invBaks.length === 1, `并且留下了逐字节存证（实测 ${invBaks.length} 个）`)
  ok(invBaks.length === 1 && readFileSync(join(E2E_ROOT, 'data', invBaks[0]), 'utf8') === INV_BROKEN,
    '存证内容与损坏原文逐字节一致（可恢复的最后依托）')

  logs = serverLog()
  ok(/invites\.json/.test(logs) && /\[json-store\]/.test(logs) && /已隔离/.test(logs),
    '运行期损坏同样进了日志（含隔离文件路径）—— 没人盯着控制台也查得到')

  console.log('\n── 10. 人工修好之后功能恢复 ──')

  /* 运维按提示处理：确认存证已留、把原文换成有效内容（这里用刚刚的真实数据） */
  writeFileSync(INVITE_FILE, goodInvites, 'utf8')
  const listFixed = await api('GET', '/privhub/api/invite/list', { token })
  ok(listFixed.status === 200 && listFixed.json && listFixed.json.ok === true, '修好之后列表恢复 200')
  const fixedCodes = ((listFixed.json && listFixed.json.invites) || []).map((i) => i.code)
  ok(fixedCodes.includes(goodCode), '★ 原有邀请码**一个没丢**（这正是「不静默覆写」要保住的东西）')

  const createFixed = await api('POST', '/privhub/api/invite/create?' + new URLSearchParams({ project: '契约项目' }), { token })
  ok(createFixed.status === 200 && createFixed.json && createFixed.json.ok === true, '修好之后又能正常生成新邀请码')

  console.log('\n  · 内存缓存型服务的拒绝会持续到重启（消息里也是这么说的）')
  /* acl 的损坏标志在内存里，删掉文件也不会解除 —— 这是有意的：
   * 规则文件已不可信，重读之前不该再写。提示语明确让人「重启服务」。 */
  unlinkSync(ACL_FILE)
  const aclAfter = await api('POST', '/privhub/api/acl/policy', {
    token, body: { project: PROJECT, path: '', target: 'dir', role: 'user', mode: 'allow' },
  })
  ok(aclAfter.status === 500, `删掉损坏文件但未重启时仍拒绝写入（实际 ${aclAfter.status}）`)
  ok(!existsSync(ACL_FILE), '拒绝写入时不会凭空创建一份新的 acl.json（不会把「未知」写成「空规则」）')

  console.log('\n── 11. 按提示「修好 + 重启」之后：读得到、写得进 ──')

  /* 把 model.json 换成**有效配置**（这一步是运维按提示做的），然后重启。
   * 重启要验两件事：① 盘上的配置真能在启动时读进来（读路径不能静默失效）；
   * ② 重启后写路径解锁（提示语里那句「再重启服务」确实有效）。 */
  writeFileSync(MODEL_FILE, JSON.stringify({
    llm: { baseURL: 'mock', model: 'm', timeoutMs: 60000 },
    embedding: { baseURL: 'mock', model: 'e', timeoutMs: 60000 },
    maxRetries: 1,
  }, null, 2), 'utf8')

  await stopServer(child)
  const child2 = startServer()
  servers.push(child2)
  const ready2 = await waitReady()
  ok(ready2, '重启后实例再次就绪')
  if (!ready2) throw new Error('重启后服务器未就绪')

  ok(!/插件加载失败/.test(serverStderr) && !/Cannot find module/.test(serverStderr),
    '重启后同样没有任何插件加载失败（stderr 哨兵覆盖两次启动）')
  ok(countBakIn(join(E2E_ROOT, 'data'), 'model.json') === 1,
    '修好并重启后，损坏存证**依然留着**（修数据不改历史，追查得下去）')

  const login2 = await api('POST', '/privhub/api/login', { body: { username: 'admin', password: 'admin123' } })
  const token2 = login2.json && login2.json.token
  ok(!!token2, '重启后能重新登录')

  /* ★ 读路径：盘上的配置必须被真正载入。启动时若因缺 inject 之类的原因读失败，
   * 这里会显示「未配置」—— 这正是那个长期静默的缺陷的形态。 */
  const cfgRead = await api('GET', '/privhub/api/model/config', { token: token2 })
  const cfgNow = cfgRead.json && cfgRead.json.config
  ok(cfgRead.status === 200 && cfgRead.json && cfgRead.json.configured === true,
    '★ 重启后盘上的模型配置被真正读回来了（configured=true）—— 不是「界面又显示未配置」')
  ok(cfgNow && cfgNow.llm && cfgNow.llm.baseURL === 'mock',
    `读回来的就是磁盘上那份配置（实测 llm.baseURL=${cfgNow && cfgNow.llm && cfgNow.llm.baseURL}）`)

  /* ★ 写路径：重启后解锁 */
  const cfgWrite2 = await api('POST', '/privhub/api/model/config', {
    token: token2, body: { llm: { baseURL: 'mock', model: 'm2' }, embedding: { baseURL: 'mock', model: 'e2' }, maxRetries: 1 },
  })
  ok(cfgWrite2.status === 200 && cfgWrite2.json && cfgWrite2.json.ok === true,
    '★ 重启后模型配置可写（提示语里那句「再重启服务」确实管用）')

  const aclAfter2 = await api('POST', '/privhub/api/acl/policy', {
    token: token2, body: { project: PROJECT, path: '', target: 'dir', role: 'user', mode: 'allow' },
  })
  ok(aclAfter2.status === 200 && aclAfter2.json && aclAfter2.json.ok === true,
    '★ 重启后 ACL 可写（同一套「修好 + 重启」流程对它也成立）')

  const boardAfter2 = await api('GET', '/privhub/api/taskboard?' + new URLSearchParams({ project: PROJECT }), { token: token2 })
  ok(boardAfter2.status === 500, '看板文件没人修，所以本该仍然报错（不是「重启万能」——坏数据还在就还得报）')
} catch (e) {
  ok(false, '端到端过程中抛出异常：' + (e && e.message))
} finally {
  for (const s of servers) await stopServer(s)
  cleanRoot()
}

console.log(`\n${'='.repeat(56)}`)
console.log(`  JSON 损坏防护回归：${pass} 通过 / ${fail} 失败`)
for (const f of failures) console.log('   ❌ ' + f)
console.log('='.repeat(56))
process.exit(fail === 0 ? 0 : 1)
