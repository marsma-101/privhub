/**
 * 私域枢纽细粒度 ACL 插件（privhub-admin-acl，F14）
 *
 * 把 S2 `ctx.acl` 的规则叠到权限判定链路上，**不修改任何已落地基座源码**：
 *
 * 1. **全路由守卫**：本插件在 main.ts 中挂载于 privhub-core 之后、auth/files 等
 *    路由插件之前。apply 内包装 `svc.route`（PrivHubStore 实例方法，effect 可逆），
 *    使之后注册的【全部文件相关路由】经过 ACL 守卫（2026-09-05 扩展至 L3 写路由）：
 *       view   → list/preview/preview-raw/download/doc(GET)/doc/versions/comments(GET)/
 *                 office/read/office-preview/office2/lock/office2/raw/export/
 *                 fulltext/search/search/kg/meta/tags(GET)/meta/tagged/publish/list/versions(GET)
 *       upload → upload/mkdir
 *       delete → delete/trash-purge
 *       edit   → rename/move/doc(PUT)/doc/restore/text/save/versions/snapshot/versions/restore/
 *                 trash-restore/office/write/office/convert-doc/office2/save/
 *                 mdpage/generate/dataview/new/publish/meta/tags(POST)
 *    per-method 裁决：同路径 GET/PUT 可配置不同动作（如 /api/doc）。
 *    body 类路由（mkdir/delete/rename/move/...）由守卫先行读取 JSON body 判定，
 *    放行后用 PassThrough 重放给原 handler（原 handler 的 readBody 不受影响）。
 *    resolver：无法直接取 project/path 的（如 trash-restore 按 id 定位记录）用 resolve 回调。
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
export const inject = ['privhub', 'acl', 'webServer', 'cap']

/** 单个 method 的守卫裁决配置。 */
interface MethodGuard {
  action: string
  /** body 类：project/path 在 JSON body 中 */
  fromBody?: boolean
  /** body 中路径字段名（默认 'path'） */
  bodyField?: string
  /** 无法直接取 project/path 时（如 trash 按 id 定位），用 resolve 回调；返回 null 则透传原 handler */
  resolve?: (svc: any, body: any) => Promise<{ project: string; path: string } | null>
}

/** 受文件级 ACL 管辖的路由 → per-method 动作（缺省的 method 直接透传）。 */
const GUARD_PATHS: Record<string, Partial<Record<string, MethodGuard>>> = {
  /* L1 files 核心（9 路由） */
  '/privhub/api/list': { GET: { action: 'view' } },
  '/privhub/api/preview': { GET: { action: 'view' } },
  '/privhub/api/preview-raw': { GET: { action: 'view' } },
  '/privhub/api/download': { GET: { action: 'view' } },
  '/privhub/api/upload': { POST: { action: 'upload' } },
  /* B6 分片上传：init/chunk 只暂存分片，complete 才落最终文件；三段都按 upload 动作
   * 走同一套目录级 ACL（abort 只删自己的会话，不碰项目目录，故不纳入）。
   * chunk 的 project/path 在查询串里（与 /upload 一致），init/complete 在 JSON body 里。 */
  '/privhub/api/upload/init': { POST: { action: 'upload', fromBody: true } },
  '/privhub/api/upload/chunk': { POST: { action: 'upload' } },
  '/privhub/api/upload/complete': { POST: { action: 'upload', fromBody: true } },
  '/privhub/api/mkdir': { POST: { action: 'upload', fromBody: true } },
  '/privhub/api/delete': { POST: { action: 'delete', fromBody: true } },
  '/privhub/api/rename': { POST: { action: 'edit', fromBody: true } },
  '/privhub/api/move': { POST: { action: 'edit', fromBody: true, bodyField: 'from' } },

  /* edit-md：文档读写（GET=view / PUT=edit 同路径） */
  '/privhub/api/doc': { GET: { action: 'view' }, PUT: { action: 'edit', fromBody: true } },
  '/privhub/api/doc/versions': { GET: { action: 'view' } },
  '/privhub/api/doc/restore': { POST: { action: 'edit', fromBody: true } },
  '/privhub/api/text/save': { POST: { action: 'edit', fromBody: true } },

  /* files-versions：通用版本快照 */
  '/privhub/api/versions': { GET: { action: 'view' } },
  '/privhub/api/versions/snapshot': { POST: { action: 'view', fromBody: true } },
  '/privhub/api/versions/restore': { POST: { action: 'edit', fromBody: true } },

  /* trash：恢复=写回项目（edit），彻底删除=delete；按 trash 记录 id 定位原路径
   *
   * v6：回收站条目可能只在**主索引**里（虚拟回收站 —— 物理字节留在池里，
   * 只有索引标记 trashed）。所以先查物理 trash.json，查不到再查索引，
   * 两处都没有才交回原 handler。只查物理会让虚拟条目全部落到「无法解析」分支。 */
  '/privhub/api/trash-list': { GET: { action: 'view' } },
  '/privhub/api/trash-restore': {
    POST: { action: 'edit', fromBody: true, bodyField: 'id', resolve: async (svc, body) => {
      const id = String(body?.id ?? '')
      const rec = (await svc.loadTrash()).find((r: { id: string }) => r.id === id)
      if (rec) return { project: rec.project, path: rec.relPath ?? '' }
      return resolveIndexTrash(svc, id)
    } },
  },
  '/privhub/api/trash-purge': {
    POST: { action: 'delete', fromBody: true, bodyField: 'id', resolve: async (svc, body) => {
      const id = String(body?.id ?? '')
      const rec = (await svc.loadTrash()).find((r: { id: string }) => r.id === id)
      if (rec) return { project: rec.project, path: rec.relPath ?? '' }
      return resolveIndexTrash(svc, id)
    } },
  },
  // trash-clean：adminOnly（清空回收站）——不纳入文件级 ACL

  /* comments：列表/批注读取（view）；写类经 id 定位（本轮暂不纳入，记录后续治理） */
  '/privhub/api/comments': { GET: { action: 'view' } },

  /* Office 域 */
  '/privhub/api/office/read': { GET: { action: 'view' } },
  '/privhub/api/office/write': { POST: { action: 'edit', fromBody: true } },
  '/privhub/api/office/convert-doc': { POST: { action: 'edit', fromBody: true } },
  '/privhub/api/office-preview': { GET: { action: 'view' } },
  '/privhub/api/office2/lock': { GET: { action: 'view' } },
  '/privhub/api/office2/raw': { GET: { action: 'view' } },
  '/privhub/api/office2/save': { POST: { action: 'edit', fromBody: true } },

  /* 知识域 */
  '/privhub/api/export': { GET: { action: 'view' } },
  '/privhub/api/fulltext/search': { GET: { action: 'view' } },
  '/privhub/api/search': { GET: { action: 'view' } },
  '/privhub/api/kg': { GET: { action: 'view' } },
  /* 反向链接（W-C / §2.4）：返回的是**其他文件**的正文片段，逐条 ACL 过滤在
   * kg 插件内部做；这里管住被查询的那个文件本身（project/path 走 query）。 */
  '/privhub/api/kg/backlinks': { GET: { action: 'view' } },
  '/privhub/api/meta/tags': { GET: { action: 'view' }, POST: { action: 'edit', fromBody: true } },
  '/privhub/api/meta/tagged': { GET: { action: 'view' } },
  '/privhub/api/mdpage/generate': { POST: { action: 'edit', fromBody: true } },
  '/privhub/api/dataview/new': { POST: { action: 'edit', fromBody: true } },
  '/privhub/api/publish': { POST: { action: 'edit', fromBody: true } },
  '/privhub/api/publish/list': { GET: { action: 'view' } },
}

/**
 * v6 虚拟回收站：按记录 id 在**主索引**里定位被删条目。
 *
 * 索引里的条目 id 就是 fileId（`F...`），`trashedFrom` 是删除前所在目录。
 * 用 `ctx.reflect.get('fileindex', false)` 而不是注入：索引是可选能力，
 * 老部署没有它也必须能跑（此时返回 null，走物理分支）。
 *
 * 模块级 holder 是因为 GUARD_PATHS 是模块常量，拿不到 apply 里的 ctx。
 */
let aclCtxRef: Context | null = null

async function resolveIndexTrash(
  _svc: unknown,
  id: string,
): Promise<{ project: string; path: string } | null> {
  if (id === '') return null
  try {
    const fi = (aclCtxRef as unknown as {
      reflect?: { get?: (n: string, s?: boolean) => unknown }
    } | null)?.reflect?.get?.('fileindex', false) as
      { get?: (x: string) => unknown } | undefined
    const e = fi?.get?.(id) as
      { project?: unknown; trashed?: unknown; trashedFrom?: unknown; virtualPath?: unknown } | undefined
    if (!e || e.trashed !== true) return null
    const project = typeof e.project === 'string' ? e.project : ''
    if (project === '') return null
    const dir = typeof e.trashedFrom === 'string' ? e.trashedFrom : ''
    const vp = typeof e.virtualPath === 'string' ? e.virtualPath : ''
    /* ACL 要判定的是「原本所在目录」：恢复动作等价于往那个目录写。 */
    return { project, path: dir !== '' ? dir : vp }
  } catch { return null }
}

export function apply(ctx: Context): void {
  aclCtxRef = ctx
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
    const methods = GUARD_PATHS[path]
    if (!methods) return handler
    return async (req, res) => {
      const spec: MethodGuard | undefined = methods[String(req.method).toUpperCase()]
      if (!spec) return handler(req, res) // 未配置的 method：透传
      const u = svc.me(tokenOf(req))
      if (!u) return handler(req, res) // 未登录：交给原 handler 返回 401
      let project = ''
      let relPath = ''
      if (spec.fromBody) {
        const raw = await readBody(req).catch(() => '')
        let body: any = null
        try { body = JSON.parse(raw) } catch { /* 非 JSON：交回原 handler 报 400 */ }
        /* 重放 body：原 handler 的 readBody 在 PassThrough 上正常工作。
         * 必须**无条件**重放 —— req 已经被上面 readBody 读空，任何「交回原 handler」
         * 的分支若不重放，原 handler 的 readBody 就永远等不到数据，请求会挂死到超时
         * （不是 400，是没有任何响应）。v6 虚拟回收站条目不在物理 trash.json 里，
         * resolve 返回 null 正好走这条路径，实测就是挂死。 */
        const replay = (): void => {
          const stream = new PassThrough()
          stream.write(raw, 'utf8')
          stream.end()
          ;(stream as unknown as { url?: string }).url = req.url
          ;(stream as unknown as { method?: string }).method = req.method
          ;(stream as unknown as { headers?: unknown }).headers = req.headers
          void handler(stream, res)
        }
        if (spec.resolve && body) {
          const r = await spec.resolve(svc, body).catch(() => null)
          if (!r) { replay(); return } // 无法解析（条目不存在等）：交回原 handler（404/403）
          project = r.project
          relPath = r.path
        } else {
          project = String(body?.project ?? '')
          relPath = String(body?.[spec.bodyField ?? 'path'] ?? '')
        }
        const d = acl.can(u, spec.action, project, relPath)
        if (d && !d.allow) return json(res, 403, { ok: false, error: 'ACL 拒绝访问' })
        replay()
        return
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
    // 读规则要 read，改规则要 write（同一功能两个级别）
    const need = req.method === 'GET' ? 'read' : 'write'
    if (!ctx.cap.can(u, 'admin.acl', need)) { json(res, 403, { ok: false, error: '仅管理员' }); return false }
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