/**
 * 私域枢纽细粒度 ACL 插件（privhub-admin-acl，F14）
 *
 * 把 S2 `ctx.acl` 的规则叠到权限判定链路上，**不修改任何已落地基座源码**：
 *
 * 1. **全路由守卫**：本插件在 main.ts 中挂载于 privhub-core 之后、auth/files 等
 *    路由插件之前。apply 内包装 `svc.route`（PrivHubStore 实例方法，effect 可逆），
 *    使之后注册的 9 个文件 API 路由全部经过 ACL 守卫：
 *       view   → /api/list /preview /preview-raw /download
 *       upload → /api/upload /api/mkdir
 *       delete → /api/delete
 *       edit   → /api/rename /api/move
 *    body 类路由（mkdir/delete/rename/move）由守卫先行读取 JSON body 判定，
 *    放行后用 PassThrough 重放给原 handler（原 handler 的 readBody 不受影响）。
 *
 * 2. **规则管理 API（adminOnly）**：
 *       GET    /privhub/api/acl/rules   列出全部规则
 *       POST   /privhub/api/acl/policy  设置策略（allow / deny / read 三档，批量写规则）
 *       DELETE /privhub/api/acl/rules   删除规则 { id }
 *
 * 3. **继承/覆盖**：规则按「路径最具体优先，同深度拒绝优先」解析（S2 的 can 实现），
 *    子路径默认继承父目录规则，可被更具体规则覆盖。
 *
 * 实现说明（记录偏差）：@deepseek-ai/cordis 4.0.1 的 `ctx.intercept(name, config)`
 * 仅把 config 合并进服务配置（Logger 专属），不会包装自定义服务方法（已实证）；
 * 故采用「实例方法包装 + ctx.effect 逆序恢复」实现同等「增强不污染、卸载可还原」
 * 语义——卸载插件时 svc.route 恢复原方法，已注册路由的 handler 一并还原。
 *
 * @module privhub-admin-acl
 */

import { PassThrough } from 'node:stream'
import type { Context } from '@deepseek-ai/cordis'
import { json, readBody, tokenOf } from '../../privhub-core/src/index'

export const name = 'privhub-admin-acl'
export const inject = ['privhub', 'acl', 'webServer']

/** 受文件级 ACL 管辖的路由 → 判定动作。fromBody：project/path 在 JSON body 中（bodyField 指定路径字段名）。 */
const GUARD_PATHS: Record<string, { action: string; fromBody?: boolean; bodyField?: string }> = {
  '/privhub/api/list': { action: 'view' },
  '/privhub/api/preview': { action: 'view' },
  '/privhub/api/preview-raw': { action: 'view' },
  '/privhub/api/download': { action: 'view' },
  '/privhub/api/upload': { action: 'upload' },
  '/privhub/api/mkdir': { action: 'upload', fromBody: true },
  '/privhub/api/delete': { action: 'delete', fromBody: true },
  '/privhub/api/rename': { action: 'edit', fromBody: true },
  '/privhub/api/move': { action: 'edit', fromBody: true, bodyField: 'from' },
}

export function apply(ctx: Context): void {
  const svc = ctx.privhub
  const acl = ctx.acl
  const web = ctx.webServer as unknown as {
    routes?: Map<string, (req: unknown, res: unknown) => void | Promise<void>>
  }

  /* ---- 守卫 ---- */

  const guard = (
    path: string,
    handler: (req: any, res: any) => void | Promise<void>,
  ): ((req: any, res: any) => void | Promise<void>) => {
    const spec = GUARD_PATHS[path]
    if (!spec) return handler
    return async (req, res) => {
      const u = svc.me(tokenOf(req))
      if (!u) return handler(req, res) // 未登录：交给原 handler 返回 401
      let project = ''
      let relPath = ''
      if (spec.fromBody) {
        const raw = await readBody(req).catch(() => '')
        try {
          const b = JSON.parse(raw) as { project?: unknown; [k: string]: unknown }
          project = String(b.project ?? '')
          relPath = String(b[spec.bodyField ?? 'path'] ?? '')
        } catch { /* 非 JSON：交回原 handler 报 400 */ }
        const d = acl.can(u, spec.action, project, relPath)
        if (d && !d.allow) return json(res, 403, { ok: false, error: 'ACL 拒绝访问' })
        // 重放 body：原 handler 的 readBody 在 PassThrough 上正常工作
        const replay = new PassThrough()
        replay.write(raw, 'utf8')
        replay.end()
        ;(replay as unknown as { url?: string }).url = req.url
        ;(replay as unknown as { method?: string }).method = req.method
        ;(replay as unknown as { headers?: unknown }).headers = req.headers
        return handler(replay, res)
      }
      try {
        const url = new URL(req.url ?? '/', 'http://x')
        project = url.searchParams.get('project') ?? ''
        relPath = url.searchParams.get('path') ?? ''
      } catch { /* 交给原 handler */ }
      const d = acl.can(u, spec.action, project, relPath)
      if (d && !d.allow) return json(res, 403, { ok: false, error: 'ACL 拒绝访问' })
      return handler(req, res)
    }
  }

  /* ---- 包装 route 注册（effect 可逆：卸载恢复原方法并还原已注册 handler） ---- */

  const origRouteFn = svc.route
  const origRoute = origRouteFn.bind(svc)
  const wrappedPaths = new Map<string, ((req: any, res: any) => void | Promise<void>)>()
  const wrappedRoute: typeof svc.route = (path, handler, label) => {
    const g = guard(path, handler)
    wrappedPaths.set(path, handler)
    return origRoute(path, g, label)
  }

  ctx.effect(() => {
    svc.route = wrappedRoute
    return () => {
      svc.route = origRouteFn
      if (web.routes) {
        for (const [path, original] of wrappedPaths) {
          if (web.routes.get(path) !== original) web.routes.set(path, original)
        }
      }
      wrappedPaths.clear()
    }
  })

  /* ---- 管理 API（adminOnly） ---- */

  const adminOnly = (req: any, res: any): boolean => {
    const u = svc.requireUser(req, res)
    if (!u) return false
    if (u.role !== 'admin') { json(res, 403, { ok: false, error: '仅管理员' }); return false }
    return true
  }

  /* 规则列表 + 删除（同路径按 method 分发） */
  svc.route('/privhub/api/acl/rules', async (req, res) => {
    if (!adminOnly(req, res)) return
    if (req.method === 'DELETE') {
      let body: any
      try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
      const ok = await acl.removeRule(String(body.id ?? ''))
      return json(res, ok ? 200 : 404, ok ? { ok: true } : { ok: false, error: '规则不存在' })
    }
    if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'method not allowed' })
    json(res, 200, { ok: true, rules: await acl.listRules() })
  }, 'acl-rules')

  /* 设置策略（三档，批量写规则；同 project+path+role 旧规则先清空再写入） */
  svc.route('/privhub/api/acl/policy', async (req, res) => {
    if (!adminOnly(req, res)) return
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = String(body.project ?? '').trim()
    const path = String(body.path ?? '').trim().replace(/^\/+|\/+$/g, '')
    const target = body.target === 'file' ? 'file' : 'dir'
    const role = String(body.role ?? '').trim()
    const mode = String(body.mode ?? '')
    if (!svc.isValidProjectName(project)) return json(res, 400, { ok: false, error: '项目名无效' })
    if (path !== '') {
      const resolved = svc.resolveInProject(project, path)
      if (resolved === null) return json(res, 400, { ok: false, error: '路径无效或不存在' })
    }
    if (!['allow', 'deny', 'read'].includes(mode)) return json(res, 400, { ok: false, error: 'mode 必须是 allow/deny/read' })

    // 清空该目标上的旧规则（避免残留冲突）
    const existing = await acl.listRules()
    for (const r of existing) {
      if (r.project === project && r.path === path && r.role === role) await acl.removeRule(r.id)
    }
    // 三档 → 规则集
    const plans: { action: string; allow: boolean }[] =
      mode === 'deny' ? [{ action: '', allow: false }]
        : mode === 'allow' ? [{ action: '', allow: true }]
          // read：放行全部 + 拒绝三类写操作（upload/edit/delete）
          : [
            { action: '', allow: true },
            { action: 'upload', allow: false },
            { action: 'edit', allow: false },
            { action: 'delete', allow: false },
          ]
    for (const p of plans) {
      await acl.setRule({ project, path, target, role, action: p.action, allow: p.allow })
    }
    json(res, 200, { ok: true, rules: await acl.listRules() })
  }, 'acl-policy')
}
