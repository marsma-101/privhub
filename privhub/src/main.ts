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
import * as svcWatermark from '../plugins/privhub-svc-watermark/src/index.ts'
import * as svcSearch from '../plugins/privhub-svc-search/src/index.ts'
import * as svcMeta from '../plugins/privhub-svc-meta/src/index.ts'
import * as svcCollab from '../plugins/privhub-svc-collab/src/index.ts'
import * as svcOffice from '../plugins/privhub-svc-office/src/index.ts'
import * as svcModel from '../plugins/privhub-svc-model/src/index.ts'
/* F14 ACL 守卫：必须早于 auth/files/trash/admin 注册路由（核心装配，手动挂载） */
import * as adminAcl from '../plugins/privhub-admin-acl/src/index.ts'

/* ---- L3 功能插件：自动发现装配（装卸 = 增删 plugins/ 目录） ----
 * 核心清单（L1/L2/adminAcl/shell）手动挂载；其余带 src/index.ts 的插件
 * 在【进程根目录】（PRIVHUB_ROOT 或 cwd）的 plugins/ 下扫描发现，动态加载。
 * 生产环境跑在 deploy/privhub-deploy 时即扫描该目录，与开发环境零耦合。 */
const CORE_PLUGINS = new Set([
  'privhub-svc-storage', 'privhub-svc-events', 'privhub-svc-audit', 'privhub-svc-acl', 'privhub-svc-watermark',
  'privhub-svc-search', 'privhub-svc-meta', 'privhub-svc-collab', 'privhub-svc-office', 'privhub-svc-model',
  'privhub-core', 'privhub-admin-acl', 'privhub-auth', 'privhub-files', 'privhub-trash',
  'privhub-admin', 'privhub-shell',
])

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()

async function discoverL3(): Promise<Array<{ name: string; inject?: string[]; apply: (ctx: Context, config?: unknown) => unknown }>> {
  const pluginsDir = join(rootDir, 'plugins')
  const out: Array<{ name: string; inject?: string[]; apply: (ctx: Context, config?: unknown) => unknown }> = []
  if (!existsSync(pluginsDir)) return out
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

async function main(): Promise<void> {
  const port = argPort()
  installFileLogger(rootDir)
  const ctx = new Context()

  /* 插件形态适配：export const name/inject/apply -> cordis 对象插件 */
  const mount = (mod: { name: string; inject?: string[]; apply: (ctx: Context, config?: unknown) => unknown }, config?: unknown): Promise<unknown> =>
    ctx.plugin({ name: mod.name, inject: mod.inject, apply: mod.apply }, config)

  /* 1. 自研 webServer（core 的 svc.route 依赖 ctx.webServer） */
  await ctx.plugin(WebServerService, {
    port,
    frontendDir: join(rootDir, 'frontend'),
    pluginsDir: join(rootDir, 'plugins'),
  })

  /* 2. L2 能力 Service（先于 L1/L3 挂载：依赖先于消费方注册）。
   *    S7 storage 必须最先（core/files/audit/meta 等全部 inject 它） */
  await mount(svcStorage, { enabled: true, keyFile: '', auditMagic: 'PHAUD1\0' })
  /* E1 事件注册表（早于各业务插件挂载，供声明） */
  await mount(svcEvents)
  await mount(svcAudit, { file: '', retentionDays: 60 })
  await mount(svcAcl, { file: '' })
  await mount(svcWatermark, { enabled: true, text: '', opacity: 0.18 })
  await mount(svcSearch, { maxHits: 200, skipHidden: true })
  await mount(svcMeta, { file: '' })
  await mount(svcCollab, { maxSessions: 500, maxPatches: 100 })
  await mount(svcOffice)
  /* M0 模型接入层（配置经 RAG 界面/API 动态写入 data/model.json，无需改代码） */
  await mount(svcModel)

  /* 3. L1 六枢纽 */
  await mount(core, { usersFile: '', dataRoot: '', sessionTtlDays: 7 })
  /* F14 ACL 守卫必须在 auth/files/trash/admin 注册路由之前挂载（它包装 svc.route） */
  await mount(adminAcl)
  await mount(auth)
  await mount(files)
  await mount(trash, { ttlDays: 30, intervalHours: 6 })
  await mount(admin)
  await mount(shell)

  /* 4. L3 功能插件：自动发现装配（装卸 = 增删 plugins/ 目录；无需改本文件） */
  const l3 = await discoverL3()
  for (const p of l3) {
    try {
      await mount(p)
    } catch (e) {
      console.error('[assembly] 插件挂载失败: ' + p.name + ' → ' + (e instanceof Error ? e.message : String(e)))
    }
  }

  /* 5. D4：等待核心数据（账号 / 会话）载入完成后再开始监听。
   *    否则存在竞态：服务已接受请求但用户表尚为空，表现为启动后首次登录
   *    偶发「用户名或密码错误」；账号文件损坏时也应在此明确失败而非带病启动。 */
  await ctx.privhub.ready

  /* 5.5 静态资源鉴权接线：插件前端代码即 API 全貌，未登录不得枚举。
   *     校验器在此注入而非在 web-server 内 inject privhub —— privhub-core 已
   *     inject webServer，反向注入会成环。会话优先取 Bearer，回退会话 Cookie
   *     （浏览器 import() 子资源无法附加自定义请求头）。 */
  ctx.webServer.setSessionValidator((req) => ctx.privhub.me(core.tokenOf(req)) !== null)

  /* 6. 启动 HTTP 服务 */
  await ctx.webServer.listen(port)

  console.log('============================================')
  console.log('  PrivHub starting [port ' + port + ']')
  console.log('  Local:    http://127.0.0.1:' + port)
  console.log('  LAN:      http://<this-host-IP>:' + port)
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
