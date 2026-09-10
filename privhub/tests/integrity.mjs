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
  ok(depPlugins === devPlugins, `插件数一致（开发 ${devPlugins} / 部署 ${depPlugins}）`)
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

console.log(`\n${'='.repeat(56)}`)
console.log(`  交付完整性：${pass} 通过 / ${fail} 失败${RELEASE_GATE ? '（含发布闸门）' : ''}`)
if (!RELEASE_GATE && drift > 0) {
  console.log(`  提示：部署包落后 ${drift} 个文件 —— 发布时用 --release 强制校验`)
}
console.log('='.repeat(56))
process.exit(fail === 0 ? 0 : 1)
