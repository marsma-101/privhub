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
import { WebServerService } from './web-server.js'

/* ---- L1 六枢纽 ---- */
import * as core from '../plugins/privhub-core/src/index.ts'
import * as auth from '../plugins/privhub-auth/src/index.ts'
import * as files from '../plugins/privhub-files/src/index.ts'
import * as trash from '../plugins/privhub-trash/src/index.ts'
import * as admin from '../plugins/privhub-admin/src/index.ts'
import * as shell from '../plugins/privhub-shell/server/index.ts'

/* ---- L2 能力 Service ---- */
import * as svcAudit from '../plugins/privhub-svc-audit/src/index.ts'
import * as svcAcl from '../plugins/privhub-svc-acl/src/index.ts'
import * as svcWatermark from '../plugins/privhub-svc-watermark/src/index.ts'
import * as svcSearch from '../plugins/privhub-svc-search/src/index.ts'
import * as svcMeta from '../plugins/privhub-svc-meta/src/index.ts'
import * as svcCollab from '../plugins/privhub-svc-collab/src/index.ts'

/* ---- L3 功能插件（含后端） ---- */
import * as settings from '../plugins/privhub-shell-settings/src/index.ts'
import * as authWatermark from '../plugins/privhub-auth-watermark/src/index.ts'
import * as filesSearch from '../plugins/privhub-files-search/src/index.ts'
import * as favorites from '../plugins/privhub-shell-favorites/src/index.ts'
import * as recent from '../plugins/privhub-shell-recent/src/index.ts'
import * as adminAudit from '../plugins/privhub-admin-audit/src/index.ts'
import * as adminAcl from '../plugins/privhub-admin-acl/src/index.ts'
import * as filesEditMd from '../plugins/privhub-files-edit-md/src/index.ts'
import * as filesFulltext from '../plugins/privhub-files-fulltext/src/index.ts'
import * as filesTags from '../plugins/privhub-files-tags/src/index.ts'
import * as filesTemplate from '../plugins/privhub-files-template/src/index.ts'
import * as filesKg from '../plugins/privhub-files-kg/src/index.ts'

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()

function argPort(): number {
  const idx = process.argv.indexOf('--port')
  if (idx >= 0 && process.argv[idx + 1]) {
    const n = Number(process.argv[idx + 1])
    if (Number.isInteger(n) && n > 0) return n
  }
  return 3180
}

async function main(): Promise<void> {
  const port = argPort()
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

  /* 2. L2 能力 Service（先于 L1/L3 挂载：L1 的 files/trash/admin/auth 与 L3 的
   *    admin-audit 均 inject 'audit'，依赖先于消费方注册） */
  await mount(svcAudit, { file: '', retentionDays: 60 })
  await mount(svcAcl, { file: '' })
  await mount(svcWatermark, { enabled: true, text: '', opacity: 0.18 })
  await mount(svcSearch, { maxHits: 200, skipHidden: true })
  await mount(svcMeta, { file: '' })
  await mount(svcCollab, { maxSessions: 500, maxPatches: 100 })

  /* 3. L1 六枢纽 */
  await mount(core, { usersFile: '', dataRoot: '' })
  /* F14 ACL 守卫必须在 auth/files/trash/admin 注册路由之前挂载（它包装 svc.route） */
  await mount(adminAcl)
  await mount(auth)
  await mount(files)
  await mount(trash, { ttlDays: 30, intervalHours: 6 })
  await mount(admin)
  await mount(shell)

  /* 4. L3 功能插件（含后端） */
  await mount(settings)
  await mount(authWatermark)
  await mount(filesSearch)
  await mount(favorites)
  await mount(recent)
  await mount(adminAudit)
  await mount(filesEditMd)
  await mount(filesFulltext)
  await mount(filesTags)
  await mount(filesTemplate)
  await mount(filesKg)

  /* 5. 启动 HTTP 服务 */
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
