/**
 * privhub-files-office2 — Office 原生观感预览 + 单人独占编辑（新插件，可整体替换回退）
 *
 * 能力：
 *   GET  /api/office2/raw?project=&path=             解密原始字节（docx/xlsx，供前端保真渲染）
 *   GET  /api/office2/lock?project=&path=            查询锁状态
 *   POST /api/office2/lock { project, path }         获取独占编辑锁（被占 → 409 + 占用者）
 *   DELETE /api/office2/lock?project=&path=          释放锁（持有者/admin；10 分钟无操作自动过期）
 *   POST /api/office2/save { project, path, kind, content }
 *        kind=xlsx: content=rows 二维数组（写回 xlsx）
 *        kind=docx: content=html 字符串（html-to-docx 转 docx 写回）
 *
 * 前端：/privhub-plugins/privhub-files-office2/view.html（iframe 渲染页，自带编辑与锁 UI）
 * 替换机制：client 监听 bus 'v3:md-rendered'，把 docx/xlsx/pptx 的 md 预览替换为 iframe；
 *           卸载本插件（删目录）即恢复原预览，零影响。
 *
 * @module privhub-files-office2
 */

import { join, extname } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { json, readBody } from '../../privhub-core/src/index'
import HTMLtoDOCX from 'html-to-docx'

export const name = 'privhub-files-office2'
export const inject = ['storage', 'privhub', 'office']

const LOCK_TTL_MS = 10 * 60 * 1000 // 10 分钟无操作自动释放
const EDITABLE = new Set(['.docx', '.xlsx'])

interface LockEntry { user: string; at: number }

export function apply(ctx: Context): void {
  const svc = ctx.privhub as unknown as {
    route: (path: string, handler: (req: unknown, res: unknown) => Promise<void> | void, name?: string) => void
    requireUser: (req: unknown, res: unknown) => { username: string; role: string } | null
    canAccess: (u: { username: string; role: string }, project: string) => boolean
    resolveReal: (project: string, relPath: string) => Promise<string | null>
  }
  const storage = ctx.storage as unknown as {
    readBuffer: (file: string) => Promise<Buffer>
    writeBuffer: (file: string, data: Buffer) => Promise<void>
  }
  const office = ctx.office as unknown as {
    write: (project: string, relPath: string, content: unknown) => Promise<{ ok: boolean; error?: string }>
  }

  /* ---------- 独占编辑锁（内存 + TTL） ---------- */
  const locks = new Map<string, LockEntry>() // key = project|path
  const lockKey = (project: string, path: string): string => project + '|' + path

  const prune = (): void => {
    const now = Date.now()
    for (const [k, v] of locks) {
      if (now - v.at > LOCK_TTL_MS) locks.delete(k)
    }
  }

  svc.route('/privhub/api/office2/lock', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    const url = new URL(String((req as { url?: string }).url ?? '/'), 'http://x')
    prune()
    if (req.method === 'GET' || req.method === 'DELETE') {
      const project = url.searchParams.get('project') ?? ''
      const path = url.searchParams.get('path') ?? ''
      if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
      const key = lockKey(project, path)
      if (req.method === 'GET') {
        const hit = locks.get(key)
        json(res, 200, {
          ok: true,
          locked: !!hit,
          lockedBy: hit ? hit.user : null,
          expiresAt: hit ? hit.at + LOCK_TTL_MS : null,
        })
        return
      }
      const hit = locks.get(key)
      if (!hit) return json(res, 200, { ok: true, released: false })
      if (hit.user !== u.username && u.role !== 'admin') return json(res, 403, { ok: false, error: '仅锁持有者或管理员可释放' })
      locks.delete(key)
      json(res, 200, { ok: true, released: true })
      return
    }
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    let body: { project?: string; path?: string }
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = String(body.project ?? '')
    const path = String(body.path ?? '')
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    const key = lockKey(project, path)
    const hit = locks.get(key)
    if (hit) {
      // 自己重复取锁 → 续期
      if (hit.user === u.username) {
        hit.at = Date.now()
        return json(res, 200, { ok: true, acquired: true, renew: true })
      }
      return json(res, 409, { ok: false, error: '文件正被 ' + hit.user + ' 编辑（约 ' + new Date(hit.at + LOCK_TTL_MS).toLocaleTimeString() + ' 前释放）' })
    }
    locks.set(key, { user: u.username, at: Date.now() })
    json(res, 200, { ok: true, acquired: true, renew: false })
  }, 'office2-lock')

  /* ---------- 原始字节（保真渲染用，解密后下发） ---------- */
  svc.route('/privhub/api/office2/raw', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    const url = new URL(String((req as { url?: string }).url ?? '/'), 'http://x')
    const project = url.searchParams.get('project') ?? ''
    const path = url.searchParams.get('path') ?? ''
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    const ext = extname(path).toLowerCase()
    if (!['.docx', '.xlsx'].includes(ext)) return json(res, 400, { ok: false, error: '仅支持 docx/xlsx 原始字节' })
    const target = await svc.resolveReal(project, path)
    if (target === null) return json(res, 404, { ok: false, error: '文件不存在' })
    try {
      const buf = await storage.readBuffer(target)
      const name = path.split('/').pop() || 'file'
      res.writeHead(200, {
        'content-type': ext === '.docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'content-length': buf.length,
        'x-content-type-options': 'nosniff',
        'content-disposition': "attachment; filename*=UTF-8''" + encodeURIComponent(name),
        'cache-control': 'no-store',
      })
      res.end(buf)
    } catch (e) {
      json(res, 500, { ok: false, error: e instanceof Error ? e.message : '读取失败' })
    }
  }, 'office2-raw')

  /* ---------- 保存（xlsx rows / docx html → docx） ---------- */
  svc.route('/privhub/api/office2/save', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    let body: { project?: string; path?: string; kind?: string; content?: unknown }
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = String(body.project ?? '')
    const path = String(body.path ?? '')
    const kind = String(body.kind ?? '')
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    if (!EDITABLE.has('.' + kind)) return json(res, 400, { ok: false, error: 'kind 仅支持 docx/xlsx' })
    const key = lockKey(project, path)
    prune()
    const lock = locks.get(key)
    if (!lock || lock.user !== u.username) return json(res, 409, { ok: false, error: '需要先获取编辑锁（文件可能正被他人编辑）' })
    const target = await svc.resolveReal(project, path)
    if (target === null) return json(res, 404, { ok: false, error: '文件不存在' })
    try {
      if (kind === 'xlsx') {
        const rows = body.content as (string | number | boolean | null)[][]
        if (!Array.isArray(rows)) return json(res, 400, { ok: false, error: 'xlsx 需要 rows 二维数组' })
        const w = await office.write(project, path, rows)
        if (!w.ok) return json(res, 500, { ok: false, error: w.error || '写入失败' })
      } else {
        const html = String(body.content ?? '')
        const buf = await HTMLtoDOCX(html, null, {
          table: { row: { cantSplit: true }, cell: { margins: { top: 80, bottom: 80, left: 100, right: 100 } } },
          font: 'Microsoft YaHei',
          footer: true,
          pageNumber: false,
        }) as Buffer
        await storage.writeBuffer(target, Buffer.isBuffer(buf) ? buf : Buffer.from(buf))
      }
      lock.at = Date.now() // 保存续期
      json(res, 200, { ok: true })
    } catch (e) {
      json(res, 500, { ok: false, error: e instanceof Error ? e.message : '保存失败' })
    }
  }, 'office2-save')

  /* ---------- 静态资源（view 渲染页 + vendor 库）由 webServer 按插件目录服务 ---------- */
  void join
}
