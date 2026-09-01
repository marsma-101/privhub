/**
 * privhub-files-publish — HTML 内网发布 / 只读分享链接
 *
 *   POST   /api/publish { project, path, expiresHours? }  发布（仅 .html，可读权限）
 *   GET    /api/publish/list                               我的发布（admin 见全部）
 *   DELETE /api/publish?code=                              撤销（创建者/admin）
 *   GET    /pub?code=xxx                                   免登录只读渲染（公开信息）
 *
 * 数据：data/publish.json
 *
 * @module privhub-files-publish
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { json, readBody } from '../../privhub-core/src/index'

export const name = 'privhub-files-publish'
export const inject = ['storage', 'privhub']

interface Pub {
  code: string
  project: string
  path: string
  createdBy: string
  createdAt: number
  expiresAt: number | null
}

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()
const FILE = join(rootDir, 'data', 'publish.json')

async function load(): Promise<Pub[]> {
  if (!existsSync(FILE)) return []
  try { return JSON.parse(await readFile(FILE, 'utf8')) as Pub[] } catch { return [] }
}
async function save(list: Pub[]): Promise<void> {
  await mkdir(dirname(FILE), { recursive: true })
  await writeFile(FILE, JSON.stringify(list, null, 2), 'utf8')
}
function genCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export function apply(ctx: Context): void {
  const svc = ctx.privhub as unknown as {
    route: (path: string, handler: (req: unknown, res: unknown) => Promise<void> | void, name?: string) => void
    requireUser: (req: unknown, res: unknown) => { username: string; role: string } | null
    canAccess: (u: { username: string; role: string }, project: string) => boolean
    resolveReal: (project: string, relPath: string) => Promise<string | null>
  }

  /* 发布（可读权限即可发布）/ 撤销（创建者/admin） */
  svc.route('/privhub/api/publish', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (req.method === 'DELETE') {
      const url = new URL(String((req as { url?: string }).url ?? '/'), 'http://x')
      const code = url.searchParams.get('code') ?? ''
      const list = await load()
      const hit = list.find(p => p.code === code)
      if (!hit) return json(res, 404, { ok: false, error: '发布不存在' })
      if (hit.createdBy !== u.username && u.role !== 'admin') return json(res, 403, { ok: false, error: '仅创建者或管理员可撤销' })
      await save(list.filter(p => p.code !== code))
      json(res, 200, { ok: true })
      return
    }
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    let body: { project?: string; path?: string; expiresHours?: number }
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = String(body.project ?? '')
    const path = String(body.path ?? '')
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    if (extname(path).toLowerCase() !== '.html') return json(res, 400, { ok: false, error: '仅支持 .html 页面发布' })
    const target = await svc.resolveReal(project, path)
    if (target === null || !existsSync(target)) return json(res, 404, { ok: false, error: '文件不存在' })
    const list = await load()
    // 同一文件重复发布 → 复用旧链接
    const existing = list.find(p => p.project === project && p.path === path)
    if (existing) return json(res, 200, { ok: true, code: existing.code, url: '/pub?code=' + existing.code, reused: true })
    const code = genCode()
    const expiresHours = Number(body.expiresHours ?? '0')
    list.push({
      code,
      project,
      path,
      createdBy: u.username,
      createdAt: Date.now(),
      expiresAt: expiresHours > 0 ? Date.now() + expiresHours * 3600 * 1000 : null,
    })
    await save(list)
    json(res, 200, { ok: true, code, url: '/pub?code=' + code, reused: false })
  }, 'publish')

  /* 发布列表（我的；admin 全部） */
  svc.route('/privhub/api/publish/list', async (_req, res) => {
    const u = svc.requireUser(_req, res)
    if (!u) return
    const list = await load()
    const mine = u.role === 'admin' ? list : list.filter(p => p.createdBy === u.username)
    json(res, 200, { ok: true, publishes: mine.map(p => ({ ...p, url: '/pub?code=' + p.code })) })
  }, 'publish-list')

  /* 撤销（创建者/admin）——已并入上方 /api/publish 的 method 分发 */


  /* 免登录只读访问 */
  svc.route('/pub', async (req, res) => {
    const url = new URL(String((req as { url?: string }).url ?? '/'), 'http://x')
    const code = url.searchParams.get('code') ?? ''
    const list = await load()
    const pub = list.find(p => p.code === code)
    if (!pub) return json(res, 404, { ok: false, error: '链接不存在或已撤销' })
    if (pub.expiresAt !== null && Date.now() > pub.expiresAt) return json(res, 410, { ok: false, error: '链接已过期' })
    const target = await svc.resolveReal(pub.project, pub.path)
    if (target === null || !existsSync(target)) return json(res, 404, { ok: false, error: '文件不存在' })
    const html = await ctx.storage.readText(target).catch(() => '')
    const name = pub.path.split('/').pop() || 'page'
    const body = Buffer.from(html, 'utf8')
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'x-content-type-options': 'nosniff', 'content-length': body.length, 'x-pub-name': encodeURIComponent(name) })
    res.end(body)
  }, 'pub-view')
}
