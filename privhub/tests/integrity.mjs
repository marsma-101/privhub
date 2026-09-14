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
    need: ['deps', 'utils', 'styles', 'store', 'treecache', 'content', 'tabs', 'ops', 'tree', 'panel', 'detail', 'fontzoom'],
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

console.log(`\n${'='.repeat(56)}`)
console.log(`  交付完整性：${pass} 通过 / ${fail} 失败${RELEASE_GATE ? '（含发布闸门）' : ''}`)
if (!RELEASE_GATE && drift > 0) {
  console.log(`  提示：部署包落后 ${drift} 个文件 —— 发布时用 --release 强制校验`)
}
console.log('='.repeat(56))
process.exit(fail === 0 ? 0 : 1)
