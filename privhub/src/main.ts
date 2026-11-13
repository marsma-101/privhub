/**
 * 私域枢纽 PrivHub — 纯 Cordis 装配入口
 *
 * 不再依赖 DSH 底座：只有 @deepseek-ai/cordis（框架）+ 自研 webServer。
 * 插件源码沿用「export const name / inject / apply」形态，
 * 装配时组装为 cordis 标准对象插件（{ name, inject, apply }）。
 *
 * 启动：node --import tsx/esm src/main.ts --port 3180
 *
 * @module src/main
 */

/* 【必须先于所有插件 import】统一解析三类存储根，并把结果写回 process.env。
 * 很多插件在模块加载期直接读 PRIVHUB_DATA_ROOT / PRIVHUB_DATA_FILES，若本模块
 * 晚于它们求值，配置文件的设置就不会生效（GitHub issue #2 / REQ-1、REQ-3）。 */
import { storePaths, describeStorePaths } from './store-paths.mjs'
import { Context } from '@deepseek-ai/cordis'
import { join } from 'node:path'
import { readdir } from 'node:fs/promises'
import { existsSync, mkdirSync, appendFileSync, readdirSync, statSync, unlinkSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { WebServerService } from './web-server.js'

/* ---- L1 六枢纽 ---- */
import * as core from '../plugins/privhub-core/src/index.ts'
import * as auth from '../plugins/privhub-auth/src/index.ts'
import * as files from '../plugins/privhub-files/src/index.ts'
import * as trash from '../plugins/privhub-trash/src/index.ts'
import * as admin from '../plugins/privhub-admin/src/index.ts'
import * as shell from '../plugins/privhub-shell/server/index.ts'

/* ---- L2 能力 Service ---- */
import * as svcStorage from '../plugins/privhub-svc-storage/src/index.ts'
import * as svcEvents from '../plugins/privhub-svc-events/src/index.ts'
import * as svcAudit from '../plugins/privhub-svc-audit/src/index.ts'
import * as svcAcl from '../plugins/privhub-svc-acl/src/index.ts'
import * as svcCap from '../plugins/privhub-svc-cap/src/index.ts'
import * as svcWatermark from '../plugins/privhub-svc-watermark/src/index.ts'
import * as svcSearch from '../plugins/privhub-svc-search/src/index.ts'
import * as svcMeta from '../plugins/privhub-svc-meta/src/index.ts'
import * as svcCollab from '../plugins/privhub-svc-collab/src/index.ts'
import * as svcLock from '../plugins/privhub-svc-lock/src/index.ts'
import * as svcOffice from '../plugins/privhub-svc-office/src/index.ts'
import * as svcModel from '../plugins/privhub-svc-model/src/index.ts'
import * as svcLinks from '../plugins/privhub-svc-links/src/index.ts'
import * as svcDup from '../plugins/privhub-svc-dup/src/index.ts'
import * as svcFileindex from '../plugins/privhub-svc-fileindex/src/index.ts'
/* 存储卷管理（多盘 / 分层存储）：决定「物理字节落在哪块盘」。
 * 挂载早于 fileindex —— 索引条目要记 volumeId，写入路由也要先问它选卷。 */
import * as svcVolumes from '../plugins/privhub-svc-volumes/src/index.ts'
/* F14 ACL 守卫：必须早于 auth/files/trash/admin 注册路由（核心装配，手动挂载） */
import * as adminAcl from '../plugins/privhub-admin-acl/src/index.ts'

/* ---- L3 功能插件：自动发现装配（装卸 = 增删 plugins/ 目录） ----
 * 核心清单（L1/L2/adminAcl/shell）手动挂载；其余带 src/index.ts 的插件
 * 在【进程根目录】（PRIVHUB_ROOT 或 cwd）的 plugins/ 下扫描发现，动态加载。
 * 生产环境跑在 deploy/privhub-deploy 时即扫描该目录，与开发环境零耦合。 */
const CORE_PLUGINS = new Set([
  'privhub-svc-storage', 'privhub-svc-events', 'privhub-svc-audit', 'privhub-svc-acl', 'privhub-svc-watermark',
  'privhub-svc-search', 'privhub-svc-meta', 'privhub-svc-collab', 'privhub-svc-lock', 'privhub-svc-office', 'privhub-svc-model',
  /* 双链登记表（Q4 / §2.6）：文件 → 稳定 ID + 退役名，改名不断链。供 kg / refcheck 消费。 */
  'privhub-svc-links',
  /* 上传查重索引（Q6 / §3.3）：上传时按指纹提示"与 X 内容相同"（只提示、不落盘）。供 files 上传路由消费。 */
  'privhub-svc-dup',
  /* 文件主索引（v6 §3.2，ctx.fileindex）：虚拟路径 ↔ 物理 ID 的权威映射。
   * 挂载早于 core —— core.listFiles 走 reflect 读它（不进 inject，索引故障不得挡住文件操作）。 */
  'privhub-svc-fileindex',
  /* 存储卷管理：多盘挂载 / 容量水位 / 分层搬移（hot→cold）。
   * 单卷部署时它什么都不做（`volumes.length === 0` → 落默认库根，行为与改造前完全一致）。 */
  'privhub-svc-volumes',
  /* 功能权限开关（功能 × 普通用户级别的集中表；管理员恒为 write）。挂载早于所有消费方。 */
  'privhub-svc-cap',
  'privhub-core', 'privhub-admin-acl', 'privhub-auth', 'privhub-files', 'privhub-trash',
  'privhub-admin', 'privhub-shell',
])

const rootDir = storePaths.codeRoot
/** 系统数据根：其下 data/ 存放 users/sessions/audit/trash/secret.key（见 store-paths.mjs）。 */
const dataRootDir = storePaths.dataRoot
/** 监听地址：蓝绿槽由控制层指定回环地址（nginx 对外）；未设置时监听全部网卡（旧行为）。 */
const listenHost = process.env.PRIVHUB_HOST?.trim() || ''

async function discoverL3(): Promise<Array<{ name: string; inject?: string[]; apply: (ctx: Context, config?: unknown) => unknown }>> {
  const pluginsDir = join(rootDir, 'plugins')
  const out: Array<{ name: string; inject?: string[]; apply: (ctx: Context, config?: unknown) => unknown }> = []
  /* GC-01：扫描根不对时旧行为是「一个 L3 都不装、且零日志零报错」—— 装配静默失败最难查
   * （界面只剩骨架，服务端一条线索都没有）。这里把「根不存在」直接吼出来，并回显实际用的根，
   * 好让 PRIVHUB_ROOT 设错一眼可见。 */
  if (!existsSync(pluginsDir)) {
    const via = process.env.PRIVHUB_ROOT?.trim()
      ? 'PRIVHUB_ROOT=' + process.env.PRIVHUB_ROOT.trim()
      : 'PRIVHUB_ROOT 未设置 → 回落到 cwd=' + process.cwd()
    console.error('[assembly] 未找到插件目录：' + pluginsDir + '（' + via + '）'
      + ' —— L3 功能插件将全部不装配（只剩骨架）。请检查 PRIVHUB_ROOT 是否指向应用根。')
    return out
  }
  const entries = await readdir(pluginsDir, { withFileTypes: true })
  entries.sort((a, b) => a.name.localeCompare(b.name))
  for (const ent of entries) {
    if (!ent.isDirectory()) continue
    if (ent.name.startsWith('_')) continue // _retired-v2 等归档目录不参与装配
    if (CORE_PLUGINS.has(ent.name)) continue
    const src = join(pluginsDir, ent.name, 'src', 'index.ts')
    if (!existsSync(src)) continue
    try {
      const mod = await import(pathToFileURL(src).href) as {
        name?: string
        inject?: string[]
        apply?: (ctx: Context, config?: unknown) => unknown
      }
      if (typeof mod.name === 'string' && typeof mod.apply === 'function') {
        out.push({ name: mod.name, inject: mod.inject, apply: mod.apply })
        console.log('[assembly] 发现 L3 插件: ' + ent.name)
      } else {
        console.warn('[assembly] 跳过（非标准插件形态）: ' + ent.name)
      }
    } catch (e) {
      console.error('[assembly] 插件加载失败: ' + ent.name + ' → ' + (e instanceof Error ? e.message : String(e)))
    }
  }
  /* GC-01（后半）：根在、但一个也没装上（目录空 / 全被 CORE_PLUGINS 排除 / 都没有 src/index.ts）
   * 同样要留痕 —— 否则「装成功但零功能」和「装配正常」在日志里长得一样。 */
  if (out.length === 0) {
    console.warn('[assembly] 未发现任何可装配的 L3 插件（扫描根：' + pluginsDir + '）'
      + ' —— 请确认该目录下存在 <插件名>/src/index.ts。')
  }
  return out
}

function argPort(): number {
  const idx = process.argv.indexOf('--port')
  if (idx >= 0 && process.argv[idx + 1]) {
    const n = Number(process.argv[idx + 1])
    if (Number.isInteger(n) && n > 0) return n
  }
  return 3180
}

/**
 * O3：生产诊断日志。
 *
 * 此前所有输出都是裸 console，只能靠外部重定向留存，窗口一关就没了，
 * 出现「昨天下午谁的操作导致报错」时无从回溯。
 * 这里按天追加写入 <root>/data/logs/privhub-YYYY-MM-DD.log，
 * 并保留最近 N 天（默认 14）；写入失败绝不阻断主流程。
 *
 * 注意：业务操作审计仍走 audit.jsonl（不可替代），这里补的是【系统错误与启动信息】。
 */
function installFileLogger(root: string): void {
  try {
    const logsDir = join(root, 'data', 'logs')
    mkdirSync(logsDir, { recursive: true })
    const day = new Date().toISOString().slice(0, 10)
    const file = join(logsDir, `privhub-${day}.log`)
    const write = (level: string, args: unknown[]): void => {
      const line = `[${new Date().toISOString()}] [${level}] `
        + args.map((a) => (a instanceof Error ? (a.stack || a.message) : typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
        + '\n'
      try { appendFileSync(file, line, 'utf8') } catch { /* 磁盘满/权限问题：不影响运行 */ }
    }
    for (const level of ['log', 'info', 'warn', 'error'] as const) {
      const orig = console[level].bind(console)
      console[level] = (...args: unknown[]) => { orig(...args); write(level.toUpperCase(), args) }
    }
    // 清理过期日志
    try {
      const keepMs = 14 * 24 * 3600 * 1000
      const now = Date.now()
      for (const f of readdirSync(logsDir)) {
        if (!f.startsWith('privhub-') || !f.endsWith('.log')) continue
        const full = join(logsDir, f)
        try { if (now - statSync(full).mtimeMs > keepMs) unlinkSync(full) } catch { /* 单个失败忽略 */ }
      }
    } catch { /* 清理失败不影响运行 */ }
  } catch { /* 无法建日志目录（如只读磁盘）：退化为纯控制台输出 */ }
}

/**
 * O3 补齐：进程级兜底处理器（unhandledRejection / uncaughtException）。
 *
 * 为什么必须有：全仓此前【零命中】这两个处理器，而 Node 24 的默认策略是
 * 「未处理的 rejection 直接当致命异常抛出」⇒ 任何一处忘接的 Promise
 * 都会让整个 PrivHub 静默死掉，且崩溃现场不进日志（logger 只挂了 console）。
 * 这里把它们变成「有记录、只记一次」，让「服务为什么没了」有据可查。
 *
 * 注意：本函数【不做退出决策】，仅记录；重复故障不重复刷盘（故障风暴时保护日志）。
 */
function installProcessGuards(): void {
  let crashing = false
  process.on('unhandledRejection', (reason: unknown) => {
    if (crashing) return
    crashing = true
    console.error('[guard] 未处理的 Promise 拒绝（unhandledRejection），服务继续运行:', reason)
    setTimeout(() => { crashing = false }, 1000)
  })
  process.on('uncaughtException', (err: unknown) => {
    if (crashing) return
    crashing = true
    console.error('[guard] 未捕获异常（uncaughtException），服务继续运行:', err)
    setTimeout(() => { crashing = false }, 1000)
  })
}

async function main(): Promise<void> {
  const port = argPort()
  const bootT0 = Date.now()
  /* 进程级兜底（O3 补齐）：紧随日志安装之后立即生效，此后任何异步故障都有日志可查。
   * 背景：Node 24 默认 --unhandled-rejections=throw，一个没人接手的 Promise 会被
   * 升级成 uncaughtException ⇒ 进程直接死；而 installFileLogger 只把 console 接到
   * 日志文件，崩溃现场（含堆栈）不会自己进去 ⇒ 事后查不出「服务为什么没了」。
   * 这里只做两件事：① 把现场完整写进 data/logs 日志；② 同一次故障只记一次不刷屏。
   * 不在此处 process.exit：退出策略留给运维（进程守护 / 重启），擅自退出会掩盖真实原因。 */
  installFileLogger(dataRootDir)
  installProcessGuards()
  /* 先把三类根打出来：配置错时，日志里第一屏就能看出它到底用了哪个库。 */
  console.log(describeStorePaths())
  const ctx = new Context()

  /* 插件形态适配：export const name/inject/apply -> cordis 对象插件 */
  /* 返回 PromiseLike：cordis 的 ctx.plugin 返回 Fiber & PromiseLike<Fiber>，
   * 可 await 但不是原生 Promise；调用方一律 await，语义不变。
   * 这里统一计时：启动慢往往不是代码解析，而是某个 Service 的构造/加载在等 I/O。 */
  const mount = async (mod: { name: string; inject?: string[]; apply: (ctx: Context, config?: unknown) => unknown }, config?: unknown): Promise<unknown> => {
    const t = Date.now()
    const r = await ctx.plugin({ name: mod.name, inject: mod.inject, apply: mod.apply }, config)
    const ms = Date.now() - t
    if (ms > 1000) console.warn('[assembly] 慢挂载 ' + mod.name + '：' + ms + 'ms')
    return r
  }

  /* 1. 自研 webServer（core 的 svc.route 依赖 ctx.webServer） */
  await ctx.plugin(WebServerService, {
    port,
    frontendDir: join(rootDir, 'frontend'),
    pluginsDir: join(rootDir, 'plugins'),
  })
  console.log('[startup] webServer 就绪 +' + (Date.now() - bootT0) + 'ms')

  /* 2. L2 能力 Service（先于 L1/L3 挂载：依赖先于消费方注册）。
   *    S7 storage 必须最先（core/files/audit/meta 等全部 inject 它）
   *
   *    plainFileLib（v6 §4）：文件库（PRIVHUB_DATA_FILES）下的用户文件**明文落盘**，
   *    系统数据（users/sessions/audit/secret.key 等）继续加密。**默认开**——本次改造
   *    的目标就是文件库明文 + nginx 按 ID 直读；密文时每个字节都要过 Node 解密转发，
   *    读写分离就没有意义。`PRIVHUB_PLAIN_FILELIB=0` 可显式退回全加密。
   *    ⚠ 读取侧不受影响：decrypt/readBuffer 一直自动识别密文与明文，老密文仍可读。 */
  await mount(svcStorage, {
    enabled: true,
    keyFile: storePaths.secretKey,
    auditMagic: 'PHAUD1\0',
    plainFileLib: (process.env.PRIVHUB_PLAIN_FILELIB ?? '1') !== '0',
  })
  /* E1 事件注册表（早于各业务插件挂载，供声明） */
  await mount(svcEvents)
  await mount(svcAudit, { file: '', retentionDays: 60 })
  await mount(svcAcl, { file: '' })
  /* 功能权限开关（ctx.cap）：功能 × 普通用户级别。管理员恒为 write；默认值 = 上线前行为。
   * 必须在 L1/L3 之前挂载 —— 大量插件的路由要 inject 它来判权。 */
  await mount(svcCap, { file: '' })
  await mount(svcWatermark, { enabled: true, text: '', opacity: 0.18 })
  await mount(svcSearch, { maxHits: 200, skipHidden: true })
  await mount(svcMeta, { file: '' })
  await mount(svcCollab, { maxSessions: 500, maxPatches: 100 })
  /* Y 批：文件排他编辑锁（content 长锁 + name 瞬时锁），纯内存，供 L1/L3 编辑写路径 inject */
  await mount(svcLock, { ttlMs: 10 * 60 * 1000, maxLocks: 5000 })
  await mount(svcOffice)
  /* M0 模型接入层（配置经 RAG 界面/API 动态写入 data/model.json，无需改代码） */
  await mount(svcModel)
  /* Q4 双链登记表（ctx.links）：文件 → 稳定 ID + 退役名，跟随 file:changed 维护。
   * 必须早于消费方（kg / refcheck 是 L3，自动发现挂载一定在它之后）。 */
  await mount(svcLinks, { file: '' })
  /* Q6 上传查重索引（ctx.dup）：上传时按指纹提示"与 X 内容相同"。
   * 必须早于 L1 的 files（上传路由要 inject 它）。 */
  await mount(svcDup, { file: '' })
  /* 存储卷管理（多盘挂载 / 容量水位 / 分层搬移）。挂载在 fileindex **之前**：
   * 索引条目要带 volumeId，写入路由要先问它选卷。
   * 单卷部署（volumes 列表为空）时它不改变任何行为 —— 落默认库根，与改造前一致。 */
  await mount(svcVolumes, { file: '', tiering: true })
  /* v6 §3.2 文件主索引（ctx.fileindex）：可写内存态，故必须接进 /runtime/reload 清单。
   * 挂载位置在 L2、但它的 inject 含 privhub（L1）—— cordis 会把它挂在「待激活」状态，
   * 等 core 提供 ctx.privhub 后自动激活；这不影响装配顺序，也不成环（core 不 inject 它）。 */
  await mount(svcFileindex, { file: '', poolDir: '' })
  console.log('[startup] L2 服务装配完成 +' + (Date.now() - bootT0) + 'ms')

  /* 3. L1 六枢纽 */
  await mount(core, { usersFile: '', dataRoot: storePaths.dataFiles, sessionTtlDays: 7 })
  /* F14 ACL 守卫必须在 auth/files/trash/admin 注册路由之前挂载（它包装 svc.route） */
  await mount(adminAcl)
  await mount(auth)
  await mount(files)
  await mount(trash, { ttlDays: 30, intervalHours: 6 })
  await mount(admin)
  await mount(shell)
  console.log('[startup] L1 枢纽装配完成 +' + (Date.now() - bootT0) + 'ms')

  /* 4. L3 功能插件：自动发现装配（装卸 = 增删 plugins/ 目录；无需改本文件） */
  const l3 = await discoverL3()
  const l3T0 = Date.now()
  for (const p of l3) {
    const t = Date.now()
    try {
      await mount(p)
      const ms = Date.now() - t
      /* 只报慢挂载：启动耗时诊断用，正常插件通常 <100ms，不刷屏。 */
      if (ms > 500) console.warn('[assembly] 慢挂载 ' + p.name + '：' + ms + 'ms')
    } catch (e) {
      console.error('[assembly] 插件挂载失败: ' + p.name + ' → ' + (e instanceof Error ? e.message : String(e)))
    }
  }
  console.log('[startup] L3 装配完成 +' + (Date.now() - bootT0) + 'ms（' + l3.length + ' 个插件，本段 ' + (Date.now() - l3T0) + 'ms）')

  /* 5. D4：等待核心数据（账号 / 会话）载入完成后再开始监听。
   *    否则存在竞态：服务已接受请求但用户表尚为空，表现为启动后首次登录
   *    偶发「用户名或密码错误」；账号文件损坏时也应在此明确失败而非带病启动。 */
  await ctx.privhub.ready
  console.log('[startup] 核心数据就绪 +' + (Date.now() - bootT0) + 'ms')

  /* 5.05 装配后存储自检（GitHub issue #2 / REQ-4）
   *
   * 「服务起来了、端口通了、库却是空的 / 密文解不开」是最贵的故障：用户先发现，
   * 运维最后知道。这里在开始监听之前就把结果打出来：
   *   - 文件库根是否存在、顶层项目数；
   *   - 系统账号文件（密文）能否解密 —— 解不开即密钥错配。
   * 默认只告警（新装空库是合法状态）；PRIVHUB_STORE_STRICT=1 / store.json
   * `"strict": true` 时升级为拒绝启动。蓝绿控制层在切流量前还会再对新槽跑一次
   * /runtime/store-check，不通过就不切换。
   */
  try {
    const check = await ctx.privhub.storeCheck()
    console.log('[store-check] 文件库 ' + check.library.dataFiles
      + ' → 顶层项目 ' + check.library.projects + ' 个，个人空间 ' + check.library.personalSpaces + ' 个'
      + '，抽样解密 ' + (check.sample.ok ? '通过' : '失败'))
    for (const w of check.warnings) console.warn('[store-check] 警告：' + w)
    /* 「新端口看不到老库」的现场提示：默认根 + 空库是最常见组合。 */
    if (!storePaths.dataFilesExplicit && check.library.exists && check.library.entries === 0) {
      console.warn('[store-check] 提示：当前使用默认文件库根（' + storePaths.dataFiles + '）且为空。'
        + '若已有旧库，请设置 PRIVHUB_DATA_FILES，或在 ' + storePaths.configFile
        + ' 写入 {"dataFiles":"<旧库路径>"} 后重启。')
    }
    if (!check.ok) {
      console.error('[store-check] 未通过：' + (check.error || '未知原因'))
    }
    if (storePaths.strict && (!check.ok || !check.library.exists || check.library.entries === 0)) {
      console.error('[store-check] 严格模式已开启：库不可见或为空，拒绝启动。'
        + '请检查 PRIVHUB_DATA_FILES / config/store.json；如确为新库，关闭严格模式或先建一个项目。')
      process.exit(1)
    }
  } catch (e) {
    /* 自检本身失败不阻断非严格模式（例如权限导致的 stat 失败仍可只读服务），
     * 但必须留下完整现场。严格模式下按未通过处理。 */
    console.error('[store-check] 自检执行失败：' + (e instanceof Error ? e.message : String(e)))
    if (storePaths.strict) process.exit(1)
  }

  /* 5.1 蓝绿切流前的状态接力（仅控制层可调）。
   *
   * 待命槽（PRIVHUB_STANDBY=1）在旧槽仍在服务时完成预热，期间不跑后台写任务；
   * 旧槽冻结并排空后，控制层先调 /runtime/reload 把各服务的内存态刷新到
   * 盘上的最新版本，再调 /runtime/activate 解除待命、启动延后的后台任务，
   * 最后才让 nginx 把流量切过来。顺序不能颠倒：先切流量会短暂用旧内存态
   * 服务新请求（例如刚登录的用户查不到会话、刚改的 ACL 不生效）。 */
  ctx.privhub.route('/privhub/api/runtime/reload', async (req, res) => {
    if (!ctx.privhub.controlAllowed(req, res)) return
    if (req.method !== 'POST') { core.json(res, 405, { ok: false, error: 'method not allowed' }); return }
    if (!ctx.privhub.standby) {
      core.json(res, 409, { ok: false, code: 'PRIVHUB_NOT_STANDBY', error: '仅待命槽可刷新状态（避免覆盖正在服务的进程内存态）' })
      return
    }
    const reloaded: string[] = []
    const failed: Array<{ name: string; error: string }> = []
    const run = async (name: string, fn: () => Promise<unknown> | unknown): Promise<void> => {
      try { await fn(); reloaded.push(name) } catch (e) {
        failed.push({ name, error: e instanceof Error ? e.message : String(e) })
        console.error('[runtime] 状态刷新失败 ' + name + '：' + (e instanceof Error ? e.message : String(e)))
      }
    }
    await run('users', () => ctx.privhub.loadUsers())
    await run('sessions', () => ctx.privhub.loadSessions())
    await run('acl', () => ctx.acl.load())
    await run('cap', () => ctx.cap.load())
    await run('meta', () => ctx.meta.load())
    await run('templates', () => ctx.meta.loadTemplates())
    await run('links', () => ctx.links.reload())
    await run('dup', () => ctx.dup.reload())
    /* 主索引是可写内存态：待命槽预热期间可能已有别的进程写过盘，切流前必须重读，
     * 否则新槽会用陈旧索引供应列表（v6 §3.2 硬约定②）。 */
    await run('fileindex', () => ctx.fileindex.reload())
    await run('model', () => ctx.model.loadConfig(ctx))
    core.json(res, failed.length === 0 ? 200 : 500, {
      ok: failed.length === 0,
      reloaded,
      failed,
      at: new Date().toISOString(),
    })
  }, 'runtime-reload')

  ctx.privhub.route('/privhub/api/runtime/activate', async (req, res) => {
    if (!ctx.privhub.controlAllowed(req, res)) return
    if (req.method !== 'POST') { core.json(res, 405, { ok: false, error: 'method not allowed' }); return }
    const r = await ctx.privhub.activate()
    core.json(res, 200, { ok: true, ...r, at: new Date().toISOString() })
  }, 'runtime-activate')

  /* 5.5 静态资源鉴权接线：插件前端代码即 API 全貌，未登录不得枚举。
   *     校验器在此注入而非在 web-server 内 inject privhub —— privhub-core 已
   *     inject webServer，反向注入会成环。会话优先取 Bearer，回退会话 Cookie
   *     （浏览器 import() 子资源无法附加自定义请求头）。 */
  ctx.webServer.setSessionValidator((req) => ctx.privhub.me(core.tokenOf(req)) !== null)

  /* 6. 启动 HTTP 服务 */
  await ctx.webServer.listen(port, listenHost || undefined)
  console.log('[startup] 监听就绪 +' + (Date.now() - bootT0) + 'ms')

  console.log('============================================')
  console.log('  PrivHub starting [port ' + port + ']')
  console.log('  Local:    http://127.0.0.1:' + port)
  if (listenHost) console.log('  Bound:    ' + listenHost + '（蓝绿槽，仅本机；由 nginx 对外）')
  else console.log('  LAN:      http://<this-host-IP>:' + port)
  console.log('============================================')

  const shutdown = (): void => {
    void ctx.webServer.close().then(() => process.exit(0))
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

void main().catch((e) => {
  console.error('PrivHub 启动失败:', e)
  process.exit(1)
})
