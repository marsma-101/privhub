/**
 * 交付完整性检查
 *
 * 分两类，**默认只跑功能类**：
 *
 *  A. 功能与实现检查（默认执行，必须全绿）
 *     - D10 系统数据是否加密落盘
 *     - D14 启动是否还有 rmdir 弃用告警
 *     - P1  静态资源是否真的带 ETag
 *     - S1  请求体上限守卫是否到位
 *
 *  B. 发布闸门（仅 `--release` 时执行；默认只报告不判失败）
 *     - O1 部署包是否与开发源码一致
 *
 *  为什么 O1 要单独分开：按环境操作纪律（docs/PrivHub-插件实现规则.md §6.1），
 *  **同步生产必须经用户明确授权**。因此"开发已改、生产未同步"是授权前的正常状态，
 *  不应让功能回归变红。它只在【准备发布】时才是硬性门槛。
 *
 *   node tests/integrity.mjs            # 功能检查
 *   node tests/integrity.mjs --release  # 功能检查 + 发布闸门
 *
 * @module tests/integrity
 */

import { readFileSync, existsSync, readdirSync, statSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const REPO = join(ROOT, '..')
const DEPLOY = join(REPO, 'deploy', 'privhub-deploy')

/** 发布闸门开关：仅在准备发布（用户已授权同步生产）时开启 */
const RELEASE_GATE = process.argv.includes('--release')

let pass = 0
let fail = 0
let drift = 0   // O1 的漂移计数（非发布模式下只报告）
function ok(cond, msg) {
  if (cond) { pass++ } else { fail++ }
  console.log((cond ? '  ✅ ' : '  ❌ ') + msg)
}

/* ══════════ O1：部署包与开发源码一致性（P0） ══════════ */
console.log('\n── O1 部署包一致性 ──')

if (!existsSync(DEPLOY)) {
  ok(false, '部署包目录不存在：' + DEPLOY)
} else {
  const countPlugins = (dir) => {
    const p = join(dir, 'plugins')
    if (!existsSync(p)) return 0
    return readdirSync(p, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('_')).length
  }
  const devPlugins = countPlugins(ROOT)
  const depPlugins = countPlugins(DEPLOY)
  /* 口径与下面的「关键文件漂移」保持一致：
   * 非发布模式下开发领先部署是正常状态（同步生产需显式授权），只报告不判失败；
   * --release（发布闸门）下必须完全一致。
   * 若这里硬失败，则每新增一个插件都会让回归套件变红，
   * 反而逼着人在未获授权时去动 deploy/ —— 那是更危险的默认行为。 */
  if (RELEASE_GATE) {
    ok(depPlugins === devPlugins, `[发布闸门] 插件数一致（开发 ${devPlugins} / 部署 ${depPlugins}）`)
  } else if (depPlugins === devPlugins) {
    console.log(`  ✅ 插件数一致（开发 ${devPlugins} / 部署 ${depPlugins}）`)
    pass++
  } else {
    console.log(`  ℹ️  部署插件数落后（开发 ${devPlugins} / 部署 ${depPlugins}）—— 授权同步前属预期`)
    pass++
  }
  ok(existsSync(join(DEPLOY, 'plugins', 'privhub-svc-rag', 'src', 'index.ts')), '部署包含 svc-rag 插件')

  // 关键源码逐字节比对：不一致即意味着线上跑的不是这套代码
  const critical = [
    'src/main.ts',
    'src/web-server.ts',
    'frontend/index.html',
    'plugins/privhub-core/src/index.ts',
    'plugins/privhub-svc-audit/src/index.ts',
    'plugins/privhub-svc-storage/src/index.ts',
    'plugins/privhub-files-publish/src/index.ts',
    'plugins/privhub-admin-acl/src/index.ts',
  ]
  let mismatch = 0
  const drifted = []
  for (const rel of critical) {
    const a = join(ROOT, rel)
    const b = join(DEPLOY, rel)
    if (!existsSync(a) || !existsSync(b)) { mismatch++; drifted.push(rel + '(缺)'); continue }
    if (!readFileSync(a).equals(readFileSync(b))) { mismatch++; drifted.push(rel) }
  }
  drift = mismatch

  if (RELEASE_GATE) {
    // 发布闸门：准备同步生产时必须完全一致
    ok(mismatch === 0,
      `[发布闸门] 关键源码与部署包逐字节一致（比对 ${critical.length} 个文件）${mismatch ? '，落后 ' + mismatch + ' 个：' + drifted.join(', ') : ''}`)
  } else {
    // 默认模式：只报告，不判失败 —— 授权同步前"生产落后"是正常状态
    console.log(mismatch === 0
      ? `  ✅ 部署包与开发源码一致（${critical.length} 个关键文件）`
      : `  ℹ️  部署包落后于开发源码 ${mismatch} 个文件（授权同步前属预期；发布时用 --release 强制校验）`)
    for (const d of drifted) console.log('       · ' + d)
  }

  // 部署包数据必须存在且密钥未被覆盖（覆盖 = 旧数据永久无法解密）
  const depKey = join(DEPLOY, 'data', 'secret.key')
  if (existsSync(depKey)) {
    ok(statSync(depKey).size === 32, '部署包 secret.key 完好（32 字节）')
  }
}

/* ══════════ D10：系统数据加密覆盖率 ══════════ */
console.log('\n── D10 加密覆盖率 ──')

const PHENC1 = 'PHENC1'
const PHAUD1 = 'PHAUD1'
const dataDir = join(ROOT, 'data')

if (!existsSync(dataDir)) {
  ok(true, '（开发主数据目录不存在，跳过加密检查）')
} else {
  // 关键区分：D10 修复是【写入路径】改走 ctx.storage。历史文件在其被再次写入
  // 之前仍是明文，这属预期（加密是"下次写入时生效"），不能算失败。
  // 因此这里改为做【行为】验证：直接调用 svc-storage 的写入路径，
  // 确认新写入的内容确实是密文。这比检查历史文件更贴近修复语义。
  // 行为验证在运行中的服务上做（hardening.mjs「D10 写入即加密」用例），
  // 那里有真实 cordis 上下文与可观测量；此处只做静态的路径一致性检查，
  // 确认这 4 个插件确实不再直接使用裸 fs 读写（否则加密会被绕过）。
  const staticallyWired = [
    ['plugins/privhub-shell-settings/src/index.ts', 'settings.json'],
    ['plugins/privhub-files-comments/src/index.ts', 'comments.json'],
    ['plugins/privhub-files-invite/src/index.ts', 'invites.json'],
    ['plugins/privhub-files-publish/src/index.ts', 'publish.json'],
  ]
  let rawFs = 0
  for (const [rel, file] of staticallyWired) {
    const src = readFileSync(join(ROOT, rel), 'utf8')
    // 该文件若仍出现裸 readFile/writeFile 调用（排除注释），说明加密被绕过
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\r\n]*/g, '')
    if (/\b(readFile|writeFile)\s*\(/.test(code)) {
      rawFs++
      ok(false, `${file} 的插件仍使用裸 fs 读写（应走 ctx.storage）`)
    }
  }
  ok(rawFs === 0, `4 类系统数据均已改走 ctx.storage（${staticallyWired.length} 个插件）`)

  // 已有审计文件若存在，应当是加密块格式
  const audit = join(dataDir, 'audit.jsonl')
  if (existsSync(audit) && statSync(audit).size > 0) {
    const head = readFileSync(audit).subarray(0, PHAUD1.length).toString('latin1')
    ok(head === PHAUD1, '审计文件为加密块格式（PHAUD1）')
  }
}

/**
 * （已弃用）独立加载 svc-storage 做加密验证。
 *
 * 保留原因：StorageService 继承 cordis 的 Service 基类，构造时要求真实的
 * Context（`ctx.reflect.provide`），无法用桩对象实例化 —— 实测抛
 * "Cannot read properties of undefined (reading 'provide')"。
 * 加密的【行为】验证因此移到 hardening.mjs（在运行中的服务上写文件后读盘校验），
 * 本文件只保留静态一致性检查。
 */
// eslint-disable-next-line no-unused-vars
async function probeEncryption() {
  const tmpDir = join(ROOT, 'tests', '.enc-probe')
  // svc-storage 是 TypeScript，需经 tsx 加载；本脚本由 run-all 以纯 node 启动，
  // 因此用子进程跑 tsx 装载。这样既不依赖调用方传 --import，也避免污染本进程。
  // 用 file:// URL 导入，避免相对路径解析歧义
  const modUrl = pathToFileURL(join(ROOT, 'plugins', 'privhub-svc-storage', 'src', 'index.ts')).href
  const probeScript = `
    import { StorageService } from ${JSON.stringify(modUrl)}
    import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
    const dir = process.env.PRIVHUB_PROBE_DIR
    mkdirSync(dir, { recursive: true })
    const ctx = { logger: { warn(){}, error(){} }, effect(){}, on(){} }
    const svc = new StorageService(ctx, { enabled: true, keyFile: dir + '/secret.key', auditMagic: 'PHAUD1\\0' })
    const enc = dir + '/enc.json'
    await svc.writeText(enc, JSON.stringify({ probe: 'value' }))
    const head = readFileSync(enc).subarray(0, 6).toString('latin1')
    const back = await svc.readText(enc)
    const plain = dir + '/plain.json'
    writeFileSync(plain, JSON.stringify({ legacy: true }), 'utf8')
    const plainBack = await svc.readText(plain)
    console.log(JSON.stringify({
      encrypted: head === 'PHENC1', head,
      roundTrip: back === JSON.stringify({ probe: 'value' }),
      plainCompat: JSON.parse(plainBack).legacy === true,
    }))
  `

  try {
    const r = spawnSync(process.execPath,
      ['--import', 'tsx/esm', '--input-type=module', '-e', probeScript],
      {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 90000,
        env: { ...process.env, PRIVHUB_PROBE_DIR: tmpDir, PRIVHUB_ROOT: tmpDir },
      })
    const line = (r.stdout || '').trim().split('\n').filter(Boolean).pop()
    if (!line) return null
    return JSON.parse(line)
  } catch {
    return null
  } finally {
    try { rmSync(tmpDir, { recursive: true, force: true }) } catch { /* 忽略 */ }
  }
}

/* ══════════ D14：启动不应有 rmdir 弃用告警 ══════════ */
console.log('\n── D14 弃用 API ──')

function walkTs(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('_') || e.name === 'data' || e.name === 'tests') continue
    const full = join(dir, e.name)
    if (e.isDirectory()) walkTs(full, out)
    else if (e.name.endsWith('.ts') || e.name.endsWith('.mjs')) out.push(full)
  }
  return out
}

const srcFiles = [
  ...walkTs(join(ROOT, 'src')),
  ...walkTs(join(ROOT, 'plugins')),
]
const rmdirHits = []
for (const f of srcFiles) {
  const raw = readFileSync(f, 'utf8')
  // 去掉块注释与行注释后再找调用，避免把说明性文字（如「D14：fs.rmdir 已弃用」）误判为调用。
  // 注意：本仓文件是 CRLF，而 JS 正则里的 `.` 【不匹配 \r】（\r 属行终止符），
  // 因此 `/\/\/.*$/` 在 CRLF 行上匹配失败、注释不会被剥掉 —— 必须显式用 [^\r\n]。
  const stripped = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\r\n]*/g, '')
  if (/\brmdir\s*\(/.test(stripped)) {
    rmdirHits.push(f.replace(REPO + '\\', ''))
  }
}
ok(rmdirHits.length === 0, `无 fs.rmdir 调用（DEP0147 应不再出现）${rmdirHits.length ? '：' + rmdirHits.join(' | ') : ''}`)

/* ══════════ P1：静态资源缓存策略已实现 ══════════ */
console.log('\n── P1 静态资源缓存 ──')

const ws = readFileSync(join(ROOT, 'src', 'web-server.ts'), 'utf8')
ok(/etag/i.test(ws), 'web-server 实现 ETag')
ok(/if-none-match/i.test(ws), 'web-server 支持 If-None-Match 协商缓存')
ok(/304/.test(ws), 'web-server 返回 304 而非重传正文')

/* ══════════ S1：请求体上限守卫 ══════════ */
console.log('\n── S1 请求体上限 ──')

const coreSrc = readFileSync(join(ROOT, 'plugins', 'privhub-core', 'src', 'index.ts'), 'utf8')
ok(/MAX_BODY_BYTES/.test(coreSrc) && /class BodyTooLargeError/.test(coreSrc),
  'core.readBody 带默认上限并抛出可识别的 413 错误')

const uiSrc = readFileSync(join(ROOT, 'plugins', 'privhub-files-office-ui', 'src', 'index.ts'), 'utf8')
const aiSrc = readFileSync(join(ROOT, 'plugins', 'privhub-files-office-ai', 'src', 'index.ts'), 'utf8')
ok(/max: number = MAX_BODY/.test(uiSrc), 'office-ui 的内联 readBody 带上限（chunked 兜底）')
ok(/max: number = MAX_BODY/.test(aiSrc), 'office-ai 的内联 readBody 带上限（chunked 兜底）')

const wsSrc = readFileSync(join(ROOT, 'src', 'web-server.ts'), 'utf8')
ok(/agent\/v1\/write/.test(wsSrc), 'Agent 写入路由豁免全局预检（保住 200MB 契约）')
ok(/res\.end\(payload, \(\) =>/.test(wsSrc), '413 在响应写出后再断开（避免 RST 吞掉响应）')

/* ══════════ S16：首屏可登录（防死锁） ══════════ */
console.log('\n── S16 首屏可登录守卫 ──')

const shellSrc = readFileSync(join(ROOT, 'plugins', 'privhub-shell', 'server', 'index.ts'), 'utf8')
ok(!/svc\.requireUser\(req, res\)\s*\n\s*if \(!u\) return\s*\n\s*try \{\s*\n\s*const manifests = await collectManifests\(\)/.test(shellSrc),
  'manifest 路由不得未登录一律 401（否则登录框渲染不出 → 界面死锁）')
ok(/partial: true/.test(shellSrc) && /includes\('auth'\)/.test(shellSrc),
  'manifest 未登录时应返回含 auth slot 的最小集合（带 partial 标记）')

const feSrc = readFileSync(join(ROOT, 'frontend', 'index.html'), 'utf8')
ok(/^\s*await this\.loadManifests\(\)/m.test(feSrc),
  '骨架挂载时必须【无条件】拉取 manifest（不能以 AUTH.token 为前提）')
ok(/manifestsPartial/.test(feSrc), '骨架记录 manifest 是否为最小集合，登录后据此重拉')
ok(/bootTimedOut/.test(feSrc) && /登录界面加载失败/.test(feSrc),
  '首屏超时兜底：8 秒未渲染出界面时给出可见原因与重试（不再静默卡死）')

/* ══════════ 个人空间：隐私边界的静态契约 ══════════
 * 这些是「不能再被改回去」的安全性质。行为层面已由个人空间与智能体沙箱
 * 各套件覆盖，这里额外守一道：即使某个行为用例被误删，边界本身也不该被无声移除。
 */
console.log('\n── 个人空间隐私边界契约 ──')

const coreP = readFileSync(join(ROOT, 'plugins', 'privhub-core', 'src', 'index.ts'), 'utf8')
ok(/retiredDirs/.test(coreP),
  '旧名退休表存在（改过的个人空间目录名永不复用，防历史数据被他人读到）')
ok(/indexableProjects/.test(coreP),
  'core 提供 indexableProjects（索引范围=项目，排除个人空间）')

const ragP = readFileSync(join(ROOT, 'plugins', 'privhub-svc-rag', 'src', 'index.ts'), 'utf8')
ok(/isPersonalDir\(project\)\) return/.test(ragP),
  'RAG 摄取口拦截个人空间（防私人目录名出现在管理员可读的语料清单里）')
ok(/removeProjectDocs/.test(ragP) && /personal:renamed/.test(ragP),
  'RAG 保留改名清理逻辑（对升级存量数据的防御纵深）')

const ftP = readFileSync(join(ROOT, 'plugins', 'privhub-files-fulltext', 'src', 'index.ts'), 'utf8')
ok(/isPersonalDir/.test(ftP), '全文索引排除个人空间')
ok(/svc\.isPersonalDir/.test(ftP), '全文索引用 core 判定（规则单一来源，不自行拼路径）')

const agentP = readFileSync(join(ROOT, 'plugins', 'privhub-files-agent', 'src', 'index.ts'), 'utf8')
ok(/sandboxDirOf/.test(agentP) && /personalDir/.test(agentP),
  '智能体沙箱取自 core 登记的个人空间目录名（不自行拼路径，避免绕过「仅本人可见」）')
ok(/AGENT-4032/.test(agentP), '项目只读码 AGENT-4032 保留（智能体写项目必须被拒）')
ok(!/personalProject\(/.test(agentP), '已无 personalProject 遗留（沙箱不再指向 .agents 隐藏目录）')

const wsP = readFileSync(join(ROOT, 'src', 'web-server.ts'), 'utf8')
ok(/setSessionValidator/.test(wsP) && /authSlotDirs/.test(wsP),
  '静态资源鉴权存在：插件代码需会话，登录前仅放行 auth slot 插件')
ok(/sessionValidator !== null && this\.sessionValidator\(req\)/.test(wsP),
  '未注入校验器时按【拒绝】处理（fail-closed，缺省不放行）')

/* 接口清单 = 地址规则本身，不得对未授权方公开 */
const agentP2 = readFileSync(join(ROOT, 'plugins', 'privhub-files-agent', 'src', 'index.ts'), 'utf8')
ok(/agent\/v1\/schema[\s\S]{0,900}?ctx\.privhub\.me\(tokenOf\(req\)\)/.test(agentP2),
  '接口清单 /schema 需会话或有效密钥（地址规则不对未授权方公开）')
ok(/agent\/v1\/console/.test(agentP2),
  '开发者平台端点存在（网页会话通道，与 Agent 密钥通道分离）')
ok(/自助密钥不支持 all scope/.test(agentP2),
  '自助签发禁止 all scope（避免无人复核的广域授权）')

/* 平台界面必须挂进骨架：slot 组件 + barItem 视图分发缺一不可 */
const acManifest = readFileSync(join(ROOT, 'plugins', 'privhub-shell-agent-console', 'client', 'manifest.json'), 'utf8')
ok(/"agent-view"/.test(acManifest), '平台插件声明 agent-view slot')
ok(/"view":\s*"agent"/.test(acManifest), '平台插件声明 agent 视图 barItem')
ok(/slotComps\['agent-view'\]/.test(feSrc), '骨架模板挂载 agent-view（否则界面渲染不出来）')
ok(/view === 'agent'/.test(feSrc), '骨架 barItem 分发包含 agent 视图')

/* 任务看板（PLAN-01）同为「主视图」形态：壳层两行 [kanban] 挂载点缺一不可，
 * 升级 diff 一旦覆盖，看板点开就是空白。这里把它钉成契约。 */
const tbManifest = readFileSync(join(ROOT, 'plugins', 'privhub-task-board', 'client', 'manifest.json'), 'utf8')
ok(/"taskboard-view"/.test(tbManifest), '看板插件声明 taskboard-view slot')
ok(/"view":\s*"taskboard"/.test(tbManifest), '看板插件声明 taskboard 视图 barItem')
ok(/slotComps\['taskboard-view'\]/.test(feSrc), '骨架模板挂载 taskboard-view（// [kanban] 挂载点，勿丢）')
ok(/view === 'taskboard'/.test(feSrc), '骨架 barItem 分发包含 taskboard 视图')

/* 项目看板（privhub-project-dashboard）与任务日历（privhub-task-calendar，client-only）
 * 同属「主视图」形态：manifest 声明 + 骨架两处挂载点，缺一即点开空白且不报错。 */
const dbManifest = readFileSync(join(ROOT, 'plugins', 'privhub-project-dashboard', 'client', 'manifest.json'), 'utf8')
ok(/"dashboard-view"/.test(dbManifest), '项目看板插件声明 dashboard-view slot')
ok(/"view":\s*"dashboard"/.test(dbManifest), '项目看板插件声明 dashboard 视图 barItem')
ok(/slotComps\['dashboard-view'\]/.test(feSrc), '骨架模板挂载 dashboard-view（// [dashboard] 挂载点，勿丢）')
ok(/view === 'dashboard'/.test(feSrc), '骨架 barItem 分发包含 dashboard 视图')

const calManifest = readFileSync(join(ROOT, 'plugins', 'privhub-task-calendar', 'client', 'manifest.json'), 'utf8')
ok(/"calendar-view"/.test(calManifest), '任务日历插件声明 calendar-view slot')
ok(/"view":\s*"calendar"/.test(calManifest), '任务日历插件声明 calendar 视图 barItem')
ok(/slotComps\['calendar-view'\]/.test(feSrc), '骨架模板挂载 calendar-view（// [calendar] 挂载点，勿丢）')
ok(/view === 'calendar'/.test(feSrc), '骨架 barItem 分发包含 calendar 视图')

/* 引用检查（privhub-files-refcheck）：主视图形态 + 服务端插件必须被 L3 自动发现
 * （有 src/index.ts 才会被装配；漏了就是「界面点开一片空白、控制台无报错」）。 */
const rcManifest = readFileSync(join(ROOT, 'plugins', 'privhub-files-refcheck', 'client', 'manifest.json'), 'utf8')
ok(/"refcheck-view"/.test(rcManifest), '引用检查插件声明 refcheck-view slot')
ok(/"view":\s*"refcheck"/.test(rcManifest), '引用检查插件声明 refcheck 视图 barItem')
ok(/slotComps\['refcheck-view'\]/.test(feSrc), '骨架模板挂载 refcheck-view（// [refcheck] 挂载点，勿丢）')
ok(/view === 'refcheck'/.test(feSrc), '骨架 barItem 分发包含 refcheck 视图')
ok(existsSync(join(ROOT, 'plugins', 'privhub-files-refcheck', 'src', 'index.ts')), '引用检查服务端入口存在（L3 发现靠它）')

/* Webhook 订阅（privhub-webhook）：管理面板形态（slot + 控制台路由条目 + 服务端入口），
 * 外加一条**防漂移**契约 —— 它把「全仓实际 emit 的事件」与「本插件声明可订阅的目录」
 * 对齐。这两边分属不同插件，没有任何编译器能把它们连起来：漏一个事件的后果是
 * 「那个事件永远投不出去，而且没有任何报错」，只能靠这条静态比对兜住。 */
const whkManifest = readFileSync(join(ROOT, 'plugins', 'privhub-webhook', 'client', 'manifest.json'), 'utf8')
ok(/"slots":\s*\[[^\]]*"admin-webhook"/.test(whkManifest), 'Webhook 插件声明 admin-webhook slot')
ok(/"view":\s*"admin-webhook"/.test(whkManifest), 'Webhook 插件声明 admin-webhook 入口 barItem')
ok(/"adminOnly":\s*true/.test(whkManifest), 'Webhook 入口为 adminOnly（普通用户看不到入口）')
const acRoutesSrc = readFileSync(join(ROOT, 'plugins', 'privhub-admin-console', 'client', 'routes.js'), 'utf8')
ok(/entryOf:\s*'admin-webhook'/.test(acRoutesSrc), '管理控制台路由表含 Webhook 订阅条目')
ok(/slot:\s*'admin-webhook'/.test(acRoutesSrc), '管理控制台条目的 slot 指向 admin-webhook')
ok(existsSync(join(ROOT, 'plugins', 'privhub-webhook', 'src', 'index.ts')), 'Webhook 服务端入口存在（L3 发现靠它）')

const whkCoreSrc = readFileSync(join(ROOT, 'plugins', 'privhub-webhook', 'src', 'core.ts'), 'utf8')
const whkSrc = readFileSync(join(ROOT, 'plugins', 'privhub-webhook', 'src', 'index.ts'), 'utf8')
const emitNames = new Set()
for (const f of walkTs(join(ROOT, 'plugins'))) {
  for (const m of readFileSync(f, 'utf8').matchAll(/ctx\.emit\(\s*'([^']+)'/g)) emitNames.add(m[1])
}
const catalogNames = new Set()
for (const m of whkCoreSrc.matchAll(/\{\s*name:\s*'([^']+)',\s*desc:/g)) catalogNames.add(m[1])
const notCovered = [...emitNames].filter((n) => !catalogNames.has(n)).sort()
const ghostEvents = [...catalogNames].filter((n) => !emitNames.has(n)).sort()
ok(notCovered.length === 0, `Webhook 事件目录覆盖全部实际 emit 的事件${notCovered.length ? '，缺：' + notCovered.join(', ') : `（${emitNames.size} 个）`}`)
ok(ghostEvents.length === 0, `Webhook 事件目录不含没人发的事件${ghostEvents.length ? '，多：' + ghostEvents.join(', ') : ''}`)
const listenBlock = whkSrc.slice(whkSrc.indexOf('const LISTEN'), whkSrc.indexOf('] as const'))
const notListened = [...catalogNames].filter((n) => !listenBlock.includes(`'${n}'`)).sort()
ok(notListened.length === 0, `Webhook 对目录里每个事件都真的注册了监听${notListened.length ? '，漏：' + notListened.join(', ') : ''}`)

/* 工作台（privhub-shell-home）同样是「主视图」形态，且它还是 client-only 插件 ——
 * 少一行挂载点就是白屏且不报错，把这四处钉成契约。 */
const homeManifest = readFileSync(join(ROOT, 'plugins', 'privhub-shell-home', 'client', 'manifest.json'), 'utf8')
ok(/"slots":\s*\[[^\]]*"home"/.test(homeManifest), '工作台插件声明 home slot')
ok(/"view":\s*"home"/.test(homeManifest), '工作台插件声明 home 视图 barItem')
ok(/slotComps\.home/.test(feSrc), '骨架模板挂载 home（// [home] 挂载点，勿丢）')
ok(/view === 'home'/.test(feSrc), '骨架 barItem 分发包含 home 视图')
const homeSrc = readFileSync(join(ROOT, 'plugins', 'privhub-shell-home', 'client', 'index.js'), 'utf8')
const homeApis = [...homeSrc.matchAll(/api\('(\/privhub\/api\/[\w/]+)/g)].map((m) => m[1])
ok(homeApis.length > 0 &&
  homeApis.every((p) => ['/privhub/api/recent', '/privhub/api/favorites', '/privhub/api/model/config', '/privhub/api/model/status'].includes(p)),
  `工作台只复用既有接口，不自造路由（${[...new Set(homeApis)].join(', ')}）`)
ok(!existsSync(join(ROOT, 'plugins', 'privhub-shell-home', 'src', 'index.ts')),
  '工作台是 client-only 插件（无 src/index.ts，不参与服务端挂载）')

/* ══════════ 功能权限开关（privhub-svc-cap + privhub-admin-cap） ══════════
 * 开关表把「某个功能给不给普通用户」从散落的 `role !== 'admin'` 收成一张表。
 * 静态契约兜住三类只能靠人眼发现的漂移：
 *   · 调用了 ctx.cap 却没在 inject 里声明 'cap' —— 运行期直接报缺服务（启动即挂）；
 *   · manifest 写了 capFeature 但功能 id 拼错 —— 那个入口会永远被当成「不可用」；
 *   · 前端忘了接开关（capCan/loadBarItems）—— 开关对界面完全不生效。 */
console.log('\n── 功能权限开关 ──')

const capCoreSrc = readFileSync(join(ROOT, 'plugins', 'privhub-svc-cap', 'src', 'core.ts'), 'utf8')
ok(existsSync(join(ROOT, 'plugins', 'privhub-svc-cap', 'src', 'index.ts')), 'svc-cap 服务端入口存在（L3 发现靠它）')
ok(existsSync(join(ROOT, 'plugins', 'privhub-admin-cap', 'src', 'index.ts')), 'admin-cap 服务端入口存在（L3 发现靠它）')
const capFeatureIds = new Set([...capCoreSrc.matchAll(/id:\s*'([a-z][\w.]*)'/g)].map((m) => m[1]))
ok(capFeatureIds.size >= 19, `功能表登记了全部功能（${capFeatureIds.size} 项）`)
ok(/userDefault:\s*'(none|read|write)'/.test(capCoreSrc), '每一项都声明了 userDefault（保持现状的默认值）')

// 契约①：任何引用 ctx.cap. 的插件，其 src/index.ts 的 inject 必须含 'cap'
const capInjectOffenders = []
for (const dir of readdirSync(join(ROOT, 'plugins'))) {
  const pluginDir = join(ROOT, 'plugins', dir)
  if (!statSync(pluginDir).isDirectory() || dir.startsWith('_')) continue
  if (dir === 'privhub-svc-cap') continue   // 服务本体只在注释里提到 ctx.cap，不需要 inject 自己
  const entry = join(pluginDir, 'src', 'index.ts')
  if (!existsSync(entry)) continue
  const usesCap = walkTs(join(pluginDir, 'src')).some((f) => /ctx\.cap\./.test(readFileSync(f, 'utf8')))
  if (!usesCap) continue
  const entrySrc = readFileSync(entry, 'utf8')
  const injectMatch = entrySrc.match(/export const inject[^=]*=\s*\[([^\]]*)\]/)
  if (!injectMatch || !/'cap'/.test(injectMatch[1])) capInjectOffenders.push(dir)
}
ok(capInjectOffenders.length === 0,
  `引用 ctx.cap 的插件都在 inject 里声明了 'cap'${capInjectOffenders.length ? '，缺：' + capInjectOffenders.join(', ') : ''}`)

// 契约②：manifest 里的 capFeature 必须是功能表里登记过的 id
const badCapFeatures = []
for (const dir of readdirSync(join(ROOT, 'plugins'))) {
  const mf = join(ROOT, 'plugins', dir, 'client', 'manifest.json')
  if (!existsSync(mf)) continue
  for (const m of readFileSync(mf, 'utf8').matchAll(/"capFeature":\s*"([^"]+)"/g)) {
    if (!capFeatureIds.has(m[1])) badCapFeatures.push(dir + ' → ' + m[1])
  }
}
ok(badCapFeatures.length === 0,
  `manifest 的 capFeature 都是已登记功能${badCapFeatures.length ? '，非法：' + badCapFeatures.join(', ') : ''}`)

// 契约③：前端接了开关（capCan 判定 + loadBarItems 按 capFeature 过滤 + 登录后拉表）
const feSrcCap = readFileSync(join(ROOT, 'frontend', 'index.html'), 'utf8')
ok(/window\.PrivHub\.capCan\s*=/.test(feSrcCap), '骨架暴露 window.PrivHub.capCan（插件按开关显隐）')
ok(/bi\.capFeature/.test(feSrcCap), '图标栏按 capFeature 过滤（开关对入口生效）')
ok(/loadCap\s*=\s*async/.test(feSrcCap) && /refreshCaps/.test(feSrcCap), '登录后主动拉取开关表')

// 契约④：控制台路由表登记了「功能权限」页（slot 由 admin-cap 承载）
ok(/entryOf:\s*'admin-cap'/.test(acRoutesSrc), '管理控制台路由表含「功能权限」条目')
ok(/"slots":\s*\[[^\]]*"admin-cap"/.test(readFileSync(join(ROOT, 'plugins', 'privhub-admin-cap', 'client', 'manifest.json'), 'utf8')),
  'admin-cap 声明 admin-cap slot')

const mainSrcCap = readFileSync(join(ROOT, 'src', 'main.ts'), 'utf8')
ok(/privhub-svc-cap/.test(mainSrcCap), 'main.ts 装配 svc-cap（L2 服务需在 L1/L3 之前挂载）')

/* ══════════ 图标栏两级信息架构（左栏重排 2026-10-14） ══════════
 * 口径：本项目按【开发项目】分 —— 项目是一级；其余功能都是「选定项目后对项目内文件的操作」，
 * 是二级。所以左栏平时只显示一级（项目 + 类别标签），点类别才展开二级条目；未选项目时二级整段不出现。
 * 静态契约兜住三类只能靠人眼发现的漂移：
 *   · 新增插件忘了给 barItem 写 group —— 条目会被 AppIconbar 归入兜底组，位置莫名其妙；
 *   · group 写错（不在骨架认识的集合里）—— 同上去处不明；
 *   · 把「未选项目隐藏二级」这条去掉 —— 个人网盘味的平铺图标栏会悄悄回来。 */
console.log('\n── 图标栏两级（项目 / 项目内功能） ──')

const RAIL_GROUPS = new Set(['files', 'knowledge', 'collab', 'ai', 'global', 'system'])
const ixShellSrc = readFileSync(join(ROOT, 'plugins', 'privhub-shell', 'client', 'index.js'), 'utf8')
const ixSkelSrc = readFileSync(join(ROOT, 'frontend', 'index.html'), 'utf8')

// 契约①：每个「上栏」条目都声明了合法 group（admin-nav 条目只在控制台侧栏用，不进图标栏，豁免）
const badRailGroups = []
for (const dir of readdirSync(join(ROOT, 'plugins'))) {
  if (dir.startsWith('_')) continue
  const mf = join(ROOT, 'plugins', dir, 'client', 'manifest.json')
  if (!existsSync(mf)) continue
  let m
  try { m = JSON.parse(readFileSync(mf, 'utf8')) }
  catch { badRailGroups.push(dir + ' → manifest 不是合法 JSON'); continue }
  for (const bi of (m.barItems || [])) {
    if (bi.slot === 'admin-nav') continue
    if (!RAIL_GROUPS.has(bi.group)) badRailGroups.push(dir + ' → ' + (bi.view || bi.slot) + ' (group=' + bi.group + ')')
  }
}
ok(badRailGroups.length === 0,
  `图标栏条目都声明了合法 group${badRailGroups.length ? '，非法：' + badRailGroups.join(', ') : ''}`)

// 契约②：骨架认识这些 group（否则条目会被静默归入兜底组 / 消失）
for (const g of ['files', 'knowledge', 'collab', 'ai']) {
  ok(new RegExp("id:\\s*'" + g + "'").test(ixShellSrc), `骨架 AppIconbar 声明了类别 ${g}`)
}
ok(/bi\.group === 'global'/.test(ixShellSrc) && /bi\.group === 'system'/.test(ixShellSrc),
  '骨架把 global / system 两组独立于类别渲染')

// 契约③：二级只在选了项目后出现 —— 项目是一级，没选项目就不该有项目内功能
ok(/nav\.project === null\)\s*return \[\]/.test(ixShellSrc),
  '未选项目时二级分组整段隐藏（没有「个人网盘」味的平铺）')

// 契约④：类别按手风琴开合 + 折叠有动画 + 栏内只显示图标
ok(/this\.open = this\.open === id \? null : id/.test(ixShellSrc), '类别按手风琴开合（开一个关其它）')
ok(/\.abar-sub\s*\{[^}]*max-height:\s*0[^}]*transition:\s*max-height/.test(ixSkelSrc),
  '二级条目容器有折叠动画（max-height 过渡）')
/* 只显示图标（2026-10-14 三版）：一级（类别）/ 二级（条目）都只渲染一个图标位，
 * 名称不再占版面，改走原生悬停提示（title）+ 无障碍名（aria-label）——窄栏也更简洁。 */
ok(/class="abar-ico"/.test(ixShellSrc), '图标栏只显示图标：一级 / 二级都用图标位渲染')
ok(!/abar-item-label|abar-head-label/.test(ixShellSrc) && !/abar-item-label|abar-head-label/.test(ixSkelSrc),
  '图标栏不再渲染文字标签（含骨架上残留的旧样式）')
ok(!/abar-proj/.test(ixShellSrc) && !/abar-proj/.test(ixSkelSrc),
  '项目选择已移出图标栏（改由顶栏「欢迎 + 项目下拉」承担）')
{
  /* 逐个数：图标栏模板里每个 role="button" 的可点图标，必须各带恰好一条 title
   * 与一条 aria-label —— 否则「只看图标」时人家无从知道这是啥（弱断言放行过）。 */
  const tpl = (ixShellSrc.match(/name: 'shell-app-iconbar'[\s\S]*?\/\* =+ 项目选择栏/) || [''])[0]
  const btn = (tpl.match(/role="button"/g) || []).length
  const tip = (tpl.match(/:title="/g) || []).length
  const a11y = (tpl.match(/:aria-label="/g) || []).length
  ok(btn >= 3 && tip === btn && a11y === btn,
    `图标栏每个可点图标各带一条悬停提示与无障碍名（${btn} 个按钮 / ${tip} 条 title / ${a11y} 条 aria-label）`)
}

// 契约⑤：栏宽必须大于图标 —— 否则展开动画 / 选中发光 / 指示条会被裁切或互相遮挡
{
  const pick = (src, sel) => {
    const m = new RegExp('^\\s*\\' + sel + '\\s*\\{[^}]*?width:\\s*(\\d+)px', 'm').exec(src)
    return m ? Number(m[1]) : NaN
  }
  const barW = pick(ixSkelSrc, '.appbar')
  const icoW = pick(ixSkelSrc, '.abar-item')
  ok(barW > icoW && icoW > 0, `图标栏宽（${barW}px）大于图标（${icoW}px），展开动画 / 发光不被裁切`)
}

/* 契约⑥：抽屉式分组 —— 展开的那一组共用一块**凹陷**底板。用户痛点：展开后分不清
 * 哪些标签属于上面那个功能、哪些是下一组的。解法 = 同组共用一块比栏面暗的底板，
 * 且把手的开口上缘有内投影（真凹进去），把手与底板同宽拼成一口抽屉。 */
ok(/class="abar-drawer"/.test(ixShellSrc), '二级条目收进同一块抽屉底板（同组共用背景，不会与下一组串味）')
ok(/\.abar-drawer\s*\{[^}]*background:\s*var\(--abar-well-bg\)/.test(ixSkelSrc),
  '抽屉底板自带底色（同一组共用它的底）')
ok(/\.abar-head\.on\s*\{[^}]*box-shadow:\s*var\(--abar-well-lip\)/.test(ixSkelSrc),
  '展开的把手沿开口上缘陷入（内投影），与底板合成一口抽屉')
{
  const pick2 = (sel) => {
    const m = new RegExp('^\\s*\\' + sel + '\\s*\\{[^}]*?width:\\s*(\\d+)px', 'm').exec(ixSkelSrc)
    return m ? Number(m[1]) : NaN
  }
  const headW = pick2('.abar-head')
  const drawW = pick2('.abar-drawer')
  ok(headW > 0 && headW === drawW, `类别把手与抽屉同宽（${headW}px），拼成一口完整抽屉`)
}

/* 契约⑦：选中态用「投影」表达，不用外框发光线条（2026-10-14 五版，用户指定）——
 * 常态 = 突起的外部投影，按下 / 选中 = 陷入的 inset 投影；两者必须真的不同。 */
ok(/\.abar-item\s*\{[^}]*box-shadow:\s*var\(--abar-raise\)/.test(ixSkelSrc),
  '常态按钮是「突起」的浮雕投影')
/* 回收站角标是绝对定位：.abar-item 少了 position 就会飞到栏目右上角（本轮真踩过）。 */
ok(/\.abar-item\s*\{[^}]*position:\s*relative/.test(ixSkelSrc),
  '.abar-item 自身是定位锚（角标 absolute 以它为准，否则会飞到栏外）')
ok(/\.abar-item\.on\s*\{[^}]*box-shadow:\s*var\(--abar-press\)/.test(ixSkelSrc),
  '选中按钮是「按下」的浮雕投影（状态只靠投影区分）')
ok(!/--abar-glow/.test(ixSkelSrc) && !/\.abar-item::before/.test(ixSkelSrc),
  '不再有外框发光线条 / 左侧发光指示条（选中只改投影）')
{
  const rd = (k) => (ixSkelSrc.match(new RegExp('--' + k + ':\\s*([^;]+);')) || [])[1] || ''
  const raise = rd('abar-raise')
  const press = rd('abar-press')
  ok(raise && press && raise !== press && !/inset/.test(raise) && /inset/.test(press),
    '突起 = 外部投影、按下 = 内投影，两者不同（不可能混用同一个值）')
}

/* 契约⑧：按钮几何要「自然」—— 各级按钮近似方形，图标与盒子成比例（2026-10-14 六版，用户指定）。
 * 为什么值得锁：这是「改一个数就悄悄毁掉」的那类改动 —— 只把 width 调大、忘了 height，
 * 按钮就重新变成瘦长的椭圆（截图里一眼丑，但没有任何测试会红）。ratio 区间是宽口径的
 * [0.8, 1.25]：它不审美、只防「明显不成比例」。 */
{
  const box = (sel) => {
    const m = new RegExp('^\\s*\\' + sel + '\\s*\\{([^}]*)\\}', 'm').exec(ixSkelSrc)
    if (!m) return null
    const w = (m[1].match(/width:\s*(\d+)px/) || [])[1]
    const h = (m[1].match(/height:\s*(\d+)px/) || [])[1]
    const f = (m[1].match(/font-size:\s*(\d+)px/) || [])[1]
    return w && h ? { w: Number(w), h: Number(h), f: f ? Number(f) : NaN } : null
  }
  for (const sel of ['.abar-head', '.abar-item', '.abar-drawer .abar-item']) {
    const b = box(sel)
    const r = b ? b.w / b.h : NaN
    ok(b && r >= 0.8 && r <= 1.25,
      `${sel} 近似方形（${b ? b.w + '×' + b.h + '，宽高比 ' + r.toFixed(2) : '未解析到'}）`)
  }
  for (const sel of ['.abar-head', '.abar-item', '.abar-drawer .abar-item']) {
    const b = box(sel)
    const r = b && b.f ? b.f / b.h : NaN
    ok(r >= 0.40 && r <= 0.62,
      `${sel} 图标与容器成比例（${b && b.f ? b.f + 'px / ' + b.h + 'px = ' + Math.round(r * 100) + '%' : '未解析到'}）`)
  }
}

/* 契约⑨：顶栏「欢迎」按钮与图标栏是同一个按钮家族（用户：也做一下相同的改变）——
 * 状态同样只用投影表达（常态突起 / 选中按下），且图标有独立置位，不被正文压小。 */
ok(/class="ptab-ico"/.test(ixShellSrc), '欢迎按钮的图标有独立置位（不跟正文一起缩到 13px）')
ok(/\.ptab\s*\{[^}]*box-shadow:\s*var\(--abar-raise\)/.test(ixSkelSrc),
  '欢迎按钮常态 = 图标栏同款「突起」投影（两处按钮同一家族）')
ok(/\.ptab\.on\s*\{[^}]*box-shadow:\s*var\(--abar-press\)/.test(ixSkelSrc),
  '欢迎按钮选中 = 图标栏同款「按下」投影（不再用底色 + 描边）')
ok(!/\.ptab\.on\s*\{[^}]*background/.test(ixSkelSrc),
  '欢迎按钮选中态不再靠填充底色区分（与图标栏口径一致）')
{
  const ico = Number(((ixSkelSrc.match(/^\s*\.ptab-ico\s*\{([^}]*)\}/m) || [])[1] || '')
    .match(/font-size:\s*(\d+)px/)?.[1])
  ok(ico > 13, `欢迎按钮图标（${ico || '—'}px）大于正文（13px），emoji 不再被正文压小`)
}



/* ══════════ 前端模块化契约（插件内按职责拆分） ══════════
 * 用户要求：前端保持一个主界面（骨架只做容器与总线），每个插件的界面实现
 * 拆成若干职责单一的文件，且【全部留在该插件目录内】——卸载插件时它的前端
 * 一并消失；改哪块只碰哪个文件。
 *
 * v3.1.0 起该契约对【多个插件】同时生效（不再只盯 explorer-v3），
 * 新增插件照此声明自己的必需模块即可。 */
console.log('\n── 前端模块化契约 ──')

/** 契约适用清单：插件目录 + 最少模块数 + 关键职责文件（防日后被合并回单文件）。 */
const MODULAR_PLUGINS = [
  {
    dir: 'privhub-files-explorer-v3',
    min: 10,
    need: ['deps', 'utils', 'styles', 'store', 'treecache', 'content', 'tabs', 'viewers', 'ops', 'tree', 'panel', 'detail', 'fontzoom'],
  },
  {
    dir: 'privhub-admin-console',
    min: 10,
    need: ['deps', 'styles', 'store', 'routes', 'action', 'shell', 'sidebar', 'topbar', 'breadcrumb', 'sectionheader', 'ui', 'panels', 'confirm', 'toast', 'panelbus'],
  },
]

/** 抽出某个模块文件里的同目录依赖（`from './x.js'`）。 */
function sameDirDeps(src) {
  const deps = new Set()
  for (const m of src.matchAll(/from\s+'\.\/([\w.-]+)\.js'/g)) deps.add(m[1] + '.js')
  return deps
}

for (const spec of MODULAR_PLUGINS) {
  const dir = join(ROOT, 'plugins', spec.dir, 'client')
  const files = readdirSync(dir).filter((f) => f.endsWith('.js')).sort()
  const entrySrc = readFileSync(join(dir, 'index.js'), 'utf8')

  ok(files.length >= spec.min, `${spec.dir} client 已按职责拆分（${files.length} 个模块文件）`)
  ok(entrySrc.split('\n').length < 60, `${spec.dir} 入口只做装配（${entrySrc.split('\n').length} 行，不再堆实现）`)
  ok(!/template:\s*`/.test(entrySrc), `${spec.dir} 入口不含任何组件模板（界面实现都在各自模块里）`)

  // ① 拆分产物必须全部留在插件目录内（不得引用插件之外的相对路径）
  const escapeHits = []
  for (const f of files) {
    const t = readFileSync(join(dir, f), 'utf8')
    for (const m of t.matchAll(/from\s+'([^']+)'/g)) {
      const s = m[1]
      if (s.startsWith('./') || s.startsWith('node:')) continue
      escapeHits.push(f + ' → ' + s)
    }
  }
  ok(escapeHits.length === 0,
    `${spec.dir} 模块只引用同目录文件（拆出来的东西都留在插件内）${escapeHits.length ? '：' + escapeHits.slice(0, 3).join('; ') : ''}`)

  // ② 模块依赖必须单向无环（有环会让加载顺序变脆弱）
  const depGraph = new Map()
  for (const f of files) depGraph.set(f, sameDirDeps(readFileSync(join(dir, f), 'utf8')))
  const cyc = []
  const state = new Map()
  const dfs = (n, path) => {
    const st = state.get(n)
    if (st === 1) return
    if (st === 0) { cyc.push([...path, n].join(' → ')); return }
    state.set(n, 0)
    for (const d of depGraph.get(n) || []) if (depGraph.has(d)) dfs(d, [...path, n])
    state.set(n, 1)
  }
  for (const n of files) dfs(n, [])
  ok(cyc.length === 0, `${spec.dir} 模块依赖无环${cyc.length ? '：' + cyc.slice(0, 2).join(' | ') : ''}`)

  // ③ 模块划分要稳定：关键职责文件必须存在（防止日后被合并回单文件）
  const missingMods = spec.need.filter((m) => !files.includes(m + '.js'))
  ok(missingMods.length === 0,
    `${spec.dir} 职责模块齐全${missingMods.length ? '，缺：' + missingMods.join(', ') : '（' + spec.need.length + ' 个）'}`)
}

// ④ 骨架仍是唯一主界面：插件不得自带整页 HTML（只能经 slot 挂组件）
const pageHtml = []
for (const d of readdirSync(join(ROOT, 'plugins'), { withFileTypes: true })) {
  if (!d.isDirectory() || d.name.startsWith('_')) continue
  const cdir = join(ROOT, 'plugins', d.name, 'client')
  if (!existsSync(cdir)) continue
  for (const f of readdirSync(cdir)) {
    // office2 的 view.html 是 iframe 渲染页（编辑宿主），属已知例外
    if (f.endsWith('.html') && f !== 'view.html') pageHtml.push(d.name + '/' + f)
  }
}
ok(pageHtml.length === 0, `插件目录内无自建整页 HTML（骨架是唯一主界面）${pageHtml.length ? '：' + pageHtml.join(', ') : ''}`)

/* ══════════ Q4 双链 ID 化契约（§2.6） ══════════
 * `[[…]]` 的口径过去在 5 个文件里各写一份，只要有人改一处忘改另一处，
 * 就会「图谱里有这条边、引用检查里却报断链」。改造后服务端三处共用 svc-links，
 * 浏览器端两处（不能 import 服务端 .ts）保留字面量 —— 本段把「只有这一个字面量」
 * 变成机器可查的契约：任何新写的第二份 `\[\[` 正则都会让本段失败。 */
console.log('\n── Q4 双链 ID 化契约 ──')

/** 扫描同时含 .ts/.js/.mjs 的源码树（walkTs 只收 .ts/.mjs，漏掉 client/*.js）。 */
function walkSrcAll(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('_') || e.name === 'data') continue
    const full = join(dir, e.name)
    if (e.isDirectory()) walkSrcAll(full, out)
    else if (/\.(ts|js|mjs)$/.test(e.name)) out.push(full)
  }
  return out
}

const CANON = String.raw`/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g`
/** 唯一的字面量允许清单：权威定义 + 两个浏览器端渲染器。 */
const CANON_OWNERS = [
  'plugins/privhub-svc-links/src/linkparse.ts',
  'plugins/privhub-files-edit-md/client/index.js',
  'plugins/privhub-files-wiki/client/index.js',
].sort()
const WIKI_RE_DECL = /\\\[\\\[/

const declaredOwners = []
for (const f of [...walkSrcAll(join(ROOT, 'plugins')), ...walkSrcAll(join(ROOT, 'src'))]) {
  const t = readFileSync(f, 'utf8')
  if (WIKI_RE_DECL.test(t)) declaredOwners.push(f.slice(ROOT.length + 1).replace(/\\/g, '/'))
}
declaredOwners.sort()
ok(JSON.stringify(declaredOwners) === JSON.stringify(CANON_OWNERS),
  `全仓只有权威定义 + 两个前端渲染器声明 [[…]] 正则（实测：${declaredOwners.join(', ')}）`)

const mismatch = CANON_OWNERS.filter((p) => !readFileSync(join(ROOT, p), 'utf8').includes(CANON))
ok(mismatch.length === 0,
  `三处 [[…]] 字面量与权威定义一字不差${mismatch.length ? '，漂移：' + mismatch.join(', ') : ''}`)

// 服务端消费方必须 import 权威定义（而不是又抄一份 —— 抄的那份上面会被判漂移）
const svcLinksConsumers = ['privhub-files-kg', 'privhub-files-refcheck', 'privhub-files-export']
const notImporting = svcLinksConsumers.filter((d) => {
  const files = walkSrcAll(join(ROOT, 'plugins', d, 'src'))
  return !files.some((f) => /from\s+'\.\.\/\.\.\/privhub-svc-links\/src\/linkparse'/.test(readFileSync(f, 'utf8')))
})
ok(notImporting.length === 0,
  `图谱 / 引用检查 / 导出都从 svc-links 引入双链解析${notImporting.length ? '，未引入：' + notImporting.join(', ') : ''}`)

// main.ts 装配 svc-links，且登记进 CORE_PLUGINS（L2 服务必须早于消费方挂载）
ok(/'privhub-svc-links'/.test(mainSrcCap), 'main.ts 的 CORE_PLUGINS 登记了 privhub-svc-links')
ok(/await mount\(svcLinks/.test(mainSrcCap), 'main.ts 挂载 svcLinks（L2 服务，早于 kg/refcheck 消费方）')

// 引用 ctx.links 的插件都要在 inject 里声明 'links'（否则 cordis 装配期抛错）
// 先剥注释：文档里写「暴露 ctx.links」不算消费（否则提供方自己会被误判）
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
const linksInjectMissing = []
for (const d of readdirSync(join(ROOT, 'plugins'))) {
  const srcDir = join(ROOT, 'plugins', d, 'src')
  if (!existsSync(srcDir)) continue
  if (!walkSrcAll(srcDir).some((f) => /ctx\.links\b/.test(stripComments(readFileSync(f, 'utf8'))))) continue
  const idx = join(srcDir, 'index.ts')
  const idxSrc = existsSync(idx) ? readFileSync(idx, 'utf8') : ''
  const im = idxSrc.match(/export const inject\s*=\s*\[([^\]]*)\]/)
  if (!im || !/'links'/.test(im[1])) linksInjectMissing.push(d)
}
ok(linksInjectMissing.length === 0,
  `引用 ctx.links 的插件都在 inject 里声明了 'links'${linksInjectMissing.length ? '，缺：' + linksInjectMissing.join(', ') : ''}`)

// 登记表落盘文件名固定（改名不断链的持久层）
ok(/STORE_FILE = 'links\.json'/.test(readFileSync(join(ROOT, 'plugins', 'privhub-svc-links', 'src', 'core.ts'), 'utf8')),
  '侧车登记表落在 data/links.json（跨重启保留别名）')

/* ── Q6/Q7 上传查重契约 ──
 * 与 cap/links 同一类契约：引用了服务却漏在 inject 里声明 ⇒ 运行期直接报缺服务（启动即挂）。
 * 先剥注释，避免「提供方在文档里提到 ctx.dup」被自己误判。 */
const dupInjectMissing = []
for (const d of readdirSync(join(ROOT, 'plugins'))) {
  const srcDir = join(ROOT, 'plugins', d, 'src')
  if (!existsSync(srcDir)) continue
  if (d === 'privhub-svc-dup') continue // 服务本体不需要 inject 自己
  if (!walkSrcAll(srcDir).some((f) => /ctx\.dup\b/.test(stripComments(readFileSync(f, 'utf8'))))) continue
  const idxSrc = existsSync(join(srcDir, 'index.ts')) ? readFileSync(join(srcDir, 'index.ts'), 'utf8') : ''
  const im = idxSrc.match(/export const inject\s*=\s*\[([^\]]*)\]/)
  if (!im || !/'dup'/.test(im[1])) dupInjectMissing.push(d)
}
ok(dupInjectMissing.length === 0,
  `引用 ctx.dup 的插件都在 inject 里声明了 'dup'${dupInjectMissing.length ? '，缺：' + dupInjectMissing.join(', ') : ''}`)

// 上传查重索引落盘文件名固定（派生数据，可重建；损坏走隔离存证而非覆盖）
ok(/STORE_FILE = 'dup-index\.json'/.test(readFileSync(join(ROOT, 'plugins', 'privhub-svc-dup', 'src', 'core.ts'), 'utf8')),
  '上传查重索引落在 data/dup-index.json（派生数据，损坏即隔离存证）')

// main.ts 装配 svc-dup，且登记进 CORE_PLUGINS（L2 服务必须早于消费方 files 挂载）
ok(/'privhub-svc-dup'/.test(mainSrcCap), 'main.ts 的 CORE_PLUGINS 登记了 privhub-svc-dup')
ok(/await mount\(svcDup/.test(mainSrcCap), 'main.ts 挂载 svcDup（L2 服务，早于 files 上传路由消费）')

/* ── 宿主机智能体管家（①地基）契约 ──
 * 方案 docs/PrivHub-宿主机智能体管家-MCP-方案-2026-10-13.md §3。
 * 钉住三件事：开关在功能表里、车道的四关判定在网关里、MCP 与 /schema 两条腿指同一路径。 */
const butlerFeatureIds = [
  'agent.butler', 'agent.butler.files', 'agent.butler.users', 'agent.butler.projects',
  'agent.butler.switches', 'agent.butler.keys', 'agent.butler.audit', 'agent.butler.model', 'agent.butler.service',
]
const missingButlerFeatures = butlerFeatureIds.filter((id) => !capFeatureIds.has(id))
ok(missingButlerFeatures.length === 0,
  `管家车道开关全部登记在功能权限表${missingButlerFeatures.length ? '，缺：' + missingButlerFeatures.join(', ') : ''}`)
ok(/id: 'agent\.butler'[\s\S]{0,200}userDefault: 'write'/.test(capCoreSrc),
  '管家总开关默认 write（车道的真正闸门是钥匙本身，开关是给"关"用的）')

const agentButlerSrc = readFileSync(join(ROOT, 'plugins', 'privhub-files-agent', 'src', 'index.ts'), 'utf8')
ok(/BUTLER_LOCAL_CIDRS = \['127\.0\.0\.0\/8'\]/.test(agentButlerSrc),
  '管家钥匙 IP 白名单固定为本机回环 127.0.0.0/8（签发时强制）')
ok(/type === 'butler'/.test(agentButlerSrc), '管家车道按 type=butler 严格区分钥匙（普通钥匙 403 AGENT-4037）')
ok(/\/privhub\/api\/agent\/v1\/butler\/key/.test(agentButlerSrc), '注册了管家钥匙管理端点 /agent/v1/butler/key')
ok(/\/privhub\/api\/agent\/v1\/butler\/status/.test(agentButlerSrc), '注册了管家自检端点 /agent/v1/butler/status')
/* 实测（乙道 L3/L4）发现：非本机请求原本先被 authAgent 的通用白名单挡下回 401 AGENT-4014，
 * 使车道的 AGENT-4038 分支不可达。修法是在白名单分支里对 type=butler 分型回 403 AGENT-4038。
 * 钉住它，防止有人"顺手"把这段合回单返回。 */
ok(/rec\.type === 'butler'[\s\S]{0,160}errCode: 'AGENT-4038'/.test(agentButlerSrc),
  '管家钥匙来源不合白名单时回车道专属码 AGENT-4038（非通用 401 AGENT-4014）')

const mcpShimSrc = readFileSync(join(ROOT, 'mcp', 'privhub-mcp.mjs'), 'utf8')
ok(/\/privhub\/api\/agent\/v1\/butler\/status/.test(mcpShimSrc), 'MCP 转接器已接管家自检端点')
const mcpToolNames = [...mcpShimSrc.matchAll(/name:\s*'(privhub_[a-z_]+)'/g)].map((m) => m[1])
ok(mcpToolNames.length >= 3, `MCP 转接器暴露了工具清单（${mcpToolNames.length} 个）`)
ok(mcpToolNames.every((n) => n.startsWith('privhub_')), 'MCP 工具名统一 privhub_ 前缀（避免与客户端自带工具重名）')
ok(/privhub_butler_status/.test(mcpShimSrc) && /butler_status/.test(agentButlerSrc),
  'MCP 与 /schema 两条腿都登记了管家自检（防两处漂移）')

console.log(`\n${'='.repeat(56)}`)
console.log(`  交付完整性：${pass} 通过 / ${fail} 失败${RELEASE_GATE ? '（含发布闸门）' : ''}`)
if (!RELEASE_GATE && drift > 0) {
  console.log(`  提示：部署包落后 ${drift} 个文件 —— 发布时用 --release 强制校验`)
}
console.log('='.repeat(56))
process.exit(fail === 0 ? 0 : 1)
