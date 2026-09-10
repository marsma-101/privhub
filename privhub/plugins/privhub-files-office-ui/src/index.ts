/**
 * privhub-files-office-ui — Office 人工编辑入口（插件③，L3 功能插件）
 *
 * 服务端：把 ctx.office 能力包成带权限的路由，供网页端编辑 Office 文档：
 *   GET  /privhub/api/office/read?project=&path=   → { ok, kind, content }（canAccess + ACL view）
 *   POST /privhub/api/office/write                 → { ok }（canAccess + ACL edit + 审计）
 *   POST /privhub/api/office/convert-doc           → .doc（旧二进制 Word）转 .docx（提取文字重建，原文件由客户端回收）
 * 前端：files-explorer 右键「✏️ 编辑」→ bus 'office:edit' → 编辑浮层。
 * 注：json/readBody 内联（规避 tsx 对含动态 import 插件的 CJS 混编）。
 *
 * @module privhub-files-office-ui
 */

import type { Context } from '@deepseek-ai/cordis'

export const name = 'privhub-files-office-ui'
export const inject = ['privhub', 'office', 'acl', 'audit', 'eventBus']

function json(res: { writeHead: (n: number, h: Record<string, string>) => void; end: (s: string) => void }, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': String(Buffer.byteLength(payload)) })
  res.end(payload)
}

/** 请求体上限（与 office 写入契约一致：20MB 足够覆盖文本/表格内容）。 */
const MAX_BODY = 20 * 1024 * 1024

/**
 * 读取请求体（内联：规避 tsx CJS 混编无法解析 core 相对导入）。
 *
 * S1：必须带上限。web-server 的 content-length 预检对 chunked 请求无效
 * （拿不到长度），此处是唯一兜底；无上限时已认证用户可发 chunked 大包打爆内存。
 */
async function readBody(req: any, max: number = MAX_BODY): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > max) {
        const err: any = new Error('请求体过大（上限 ' + Math.floor(max / 1024 / 1024) + 'MB）')
        err.statusCode = 413
        req.destroy()
        reject(err)
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/** 请求体错误 → 恰当的 HTTP 状态（413 体积超限 / 400 格式错误）。 */
function bodyStatus(e: unknown): number {
  return (e as { statusCode?: number } | null)?.statusCode === 413 ? 413 : 400
}

export function apply(ctx: Context): void {
  const svc = ctx.privhub
  const office = ctx.office

  /* E1 事件声明 */
  ctx.eventBus.declareEmit('audit:logged', 'privhub-files-office-ui', '写操作成功审计广播（S1 闭环）')
  ctx.eventBus.declareEmit('file:saved', 'privhub-files-office-ui', '文档保存广播（带 doc 内容）')
  ctx.eventBus.declareEmit('file:changed', 'privhub-files-office-ui', 'Office 编辑保存/转换 → fulltext 索引维护')

  /* 审计埋点（与 F13 契约一致） */
  const audit = async (u: { username: string }, action: string, target: string, detail?: string): Promise<void> => {
    const rec = await ctx.audit.log({ user: u.username, action, target, detail }).catch(() => null)
    if (rec) ctx.emit('audit:logged', rec)
  }

  /* 读取（view 权限：canAccess + ACL） */
  svc.route('/privhub/api/office/read', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    const url = new URL(req.url ?? '/', 'http://x')
    const project = url.searchParams.get('project') ?? ''
    const path = url.searchParams.get('path') ?? ''
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    const aclD = ctx.acl.can(u, 'view', project, path)
    if (aclD && !aclD.allow) return json(res, 403, { ok: false, error: 'ACL 拒绝访问' })
    const r = await office.read(project, path)
    json(res, r.ok ? 200 : 400, r)
  }, 'office-read')

  /* 写入（edit 权限：canAccess + ACL + 审计） */
  svc.route('/privhub/api/office/write', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch (e) { return json(res, bodyStatus(e), { ok: false, error: bodyStatus(e) === 413 ? 'request too large' : 'invalid json' }) }
    const project = String(body.project ?? '')
    const path = String(body.path ?? '')
    const content = body.content
    if (project === '' || path === '') return json(res, 400, { ok: false, error: '参数不完整' })
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    const aclD = ctx.acl.can(u, 'edit', project, path)
    if (aclD && !aclD.allow) return json(res, 403, { ok: false, error: 'ACL 拒绝访问' })
    const r = await office.write(project, path, content)
    if (r.ok) void audit(u, 'office-edit', project + '/' + path)
    if (r.ok) ctx.emit('file:changed', { project, path, action: 'saved' })
    json(res, r.ok ? 200 : 400, r)
  }, 'office-write')

  /* .doc → .docx 转换（旧二进制 Word 无法原位编辑：提取文字重建 docx 副本，
   * 原 .doc 由客户端走既有回收站删除流程，保证权限/审计/回收语义一致） */
  svc.route('/privhub/api/office/convert-doc', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch (e) { return json(res, bodyStatus(e), { ok: false, error: bodyStatus(e) === 413 ? 'request too large' : 'invalid json' }) }
    const project = String(body.project ?? '')
    const path = String(body.path ?? '')
    if (project === '' || path === '') return json(res, 400, { ok: false, error: '参数不完整' })
    if (!/\.doc$/i.test(path)) return json(res, 400, { ok: false, error: '仅支持 .doc 文件转换' })
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    const aclD = ctx.acl.can(u, 'edit', project, path)
    if (aclD && !aclD.allow) return json(res, 403, { ok: false, error: 'ACL 拒绝访问' })
    try {
      const rd = await office.read(project, path)
      if (!rd.ok) return json(res, 400, { ok: false, error: rd.error || '读取 .doc 失败' })
      const text = (rd.content && (rd.content as any).text) || (typeof rd.content === 'string' ? rd.content : '')
      if (!String(text).trim()) return json(res, 400, { ok: false, error: '.doc 中未提取到文字内容' })
      const newPath = path.replace(/\.doc$/i, '.docx')
      if (newPath === path) return json(res, 400, { ok: false, error: '转换目标路径无效' })
      const wr = await office.write(project, newPath, String(text))
      if (!wr.ok) return json(res, 400, { ok: false, error: wr.error || '生成 .docx 失败' })
      void audit(u, 'doc-convert', project + '/' + path, '-> ' + newPath)
      ctx.emit('file:saved', { project, path: newPath, doc: String(text) })
      ctx.emit('file:changed', { project, path: newPath, action: 'created' })
      json(res, 200, { ok: true, newPath })
      return
    } catch (e) {
      json(res, 400, { ok: false, error: e instanceof Error ? e.message : '转换失败' })
    }
  }, 'office-convert-doc')
}
