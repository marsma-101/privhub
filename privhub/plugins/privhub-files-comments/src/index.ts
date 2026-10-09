/**
 * privhub-files-comments — Markdown 文档位置锚定批注 + 评论线程
 *
 *   GET  /api/comments?project=&path=                   评论列表
 *   POST /api/comments { project, path, start, end, text }  新建（start/end = md 原文字符偏移）
 *   POST /api/comments/reply { project, path, id, text }    回复
 *   POST /api/comments/status { project, path, id, status } 状态流转（待处理/处理中/已解决）
 *   DELETE /api/comments?project=&path=&id=                 删除（作者/admin）
 *
 * 数据：data/comments.json（key = project|path）
 *
 * @module privhub-files-comments
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { json, readBody, readJsonStore } from '../../privhub-core/src/index'

export const name = 'privhub-files-comments'
export const inject = ['storage', 'privhub']

interface Reply { author: string; at: number; text: string }
interface Comment {
  id: string
  author: string
  at: number
  start: number
  end: number
  text: string
  status: string // 待处理 | 处理中 | 已解决
  replies: Reply[]
}

type Store = Record<string, Comment[]>

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()
const FILE = join(rootDir, 'data', 'comments.json')

/* D10：批注内容属业务数据，必须加密落盘（此前为明文）。 */
type StorageLike = { readText: (f: string) => Promise<string>; writeText: (f: string, d: string) => Promise<void> }

async function load(storage: StorageLike): Promise<Store> {
  /* D4：损坏 → 隔离存证 + 抛错（不再静默当空，否则紧接着一次 save 就把批注永久覆盖）。 */
  return readJsonStore<Store>(storage, FILE, {})
}
async function save(storage: StorageLike, store: Store): Promise<void> {
  await storage.writeText(FILE, JSON.stringify(store, null, 2))
}

export function apply(ctx: Context): void {
  /* 单一来源：直接使用 ctx.privhub 的权威类型（删掉本地 unknown 影子类型）。 */
  const svc = ctx.privhub

  const parseQuery = (req: unknown): URL => new URL(String((req as { url?: string }).url ?? '/'), 'http://x')

  svc.route('/privhub/api/comments', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    const url = parseQuery(req)
    if (req.method === 'GET') {
      const project = url.searchParams.get('project') ?? ''
      const path = url.searchParams.get('path') ?? ''
      if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
      const store = await load(ctx.storage)
      json(res, 200, { ok: true, comments: (store[project + '|' + path] || []).sort((a, b) => a.start - b.start) })
      return
    }
    if (req.method === 'DELETE') {
      const project = url.searchParams.get('project') ?? ''
      const path = url.searchParams.get('path') ?? ''
      if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
      const id = url.searchParams.get('id') ?? ''
      const key = project + '|' + path
      /* D6：读-改-写整体串行。批注是**多人协作**数据，两个人同时批注/回复
       * 就会各自读到旧 store 再写回，后写的把前一条批注整个抹掉。 */
      await svc.withFileLock(FILE, async () => {
        const store = await load(ctx.storage)
        const arr = store[key] || []
        const hit = arr.find(c => c.id === id)
        if (!hit) return json(res, 404, { ok: false, error: '评论不存在' })
        if (hit.author !== u.username && u.role !== 'admin') return json(res, 403, { ok: false, error: '仅作者或管理员可删除' })
        store[key] = arr.filter(c => c.id !== id)
        await save(ctx.storage, store)
        json(res, 200, { ok: true })
      })
      return
    }
    if (req.method === 'POST') {
      let body: { project?: string; path?: string; start?: number; end?: number; text?: string }
      try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
      const p2 = String(body.project ?? '')
      const pth2 = String(body.path ?? '')
      if (!svc.canAccess(u, p2)) return json(res, 403, { ok: false, error: '无权限' })
      const text = String(body.text ?? '').trim()
      if (!text) return json(res, 400, { ok: false, error: '评论内容不能为空' })
      const start = Number(body.start ?? 0)
      const end = Number(body.end ?? start + 1)
      const key = p2 + '|' + pth2
      /* D6：同 DELETE —— 「读到旧 store → 追加 → 写回」必须整体在锁内。 */
      await svc.withFileLock(FILE, async () => {
        const store = await load(ctx.storage)
        const arr = store[key] || []
        const c: Comment = {
          id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          author: u.username,
          at: Date.now(),
          start,
          end: Math.max(end, start + 1),
          text,
          status: '待处理',
          replies: [],
        }
        arr.push(c)
        store[key] = arr
        await save(ctx.storage, store)
        json(res, 200, { ok: true, comment: c })
      })
      return
    }
    json(res, 405, { ok: false, error: 'method not allowed' })
  }, 'comments')

  svc.route('/privhub/api/comments/reply', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    let body: { project?: string; path?: string; id?: string; text?: string }
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = String(body.project ?? '')
    const path = String(body.path ?? '')
    const text = String(body.text ?? '').trim()
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    if (!text) return json(res, 400, { ok: false, error: '回复内容不能为空' })
    /* D6：追加回复同样是读-改-写（连回复都是并发追加的），整段进锁。 */
    await svc.withFileLock(FILE, async () => {
      const store = await load(ctx.storage)
      const arr = store[project + '|' + path] || []
      const c = arr.find(x => x.id === String(body.id ?? ''))
      if (!c) return json(res, 404, { ok: false, error: '评论不存在' })
      c.replies.push({ author: u.username, at: Date.now(), text })
      await save(ctx.storage, store)
      json(res, 200, { ok: true })
    })
  }, 'comments-reply')

  svc.route('/privhub/api/comments/status', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    let body: { project?: string; path?: string; id?: string; status?: string }
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = String(body.project ?? '')
    const path = String(body.path ?? '')
    const status = String(body.status ?? '')
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    if (!['待处理', '处理中', '已解决'].includes(status)) return json(res, 400, { ok: false, error: 'status 无效' })
    /* D6：改状态也是整份文件读-改-写，与「新增批注/回复」共用一把锁。 */
    await svc.withFileLock(FILE, async () => {
      const store = await load(ctx.storage)
      const arr = store[project + '|' + path] || []
      const c = arr.find(x => x.id === String(body.id ?? ''))
      if (!c) return json(res, 404, { ok: false, error: '评论不存在' })
      c.status = status
      await save(ctx.storage, store)
      json(res, 200, { ok: true })
    })
  }, 'comments-status')
}
