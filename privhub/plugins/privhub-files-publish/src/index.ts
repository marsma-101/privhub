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
import { randomBytes } from 'node:crypto'
import { join, dirname, extname } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { json, readBody, readJsonStore } from '../../privhub-core/src/index'

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

/* D10：发布码是免登录读取凭据，必须加密落盘（此前为明文）。 */
type StorageLike = { readText: (f: string) => Promise<string>; writeText: (f: string, d: string) => Promise<void> }

async function load(storage: StorageLike): Promise<Pub[]> {
  /* D4：发布码库损坏 → 隔离存证 + 抛错。静默当空会让下一次发布把已有发布链接全部清空。 */
  return readJsonStore<Pub[]>(storage, FILE, [])
}
async function save(storage: StorageLike, list: Pub[]): Promise<void> {
  await storage.writeText(FILE, JSON.stringify(list, null, 2))
}
/**
 * S7 安全修复：发布码等同于「免登录读取凭据」，必须用密码学随机源。
 * 原实现用 Math.random()（非 CSPRNG），12 位 ≈ 60 bit（原 8 位 ≈ 39.6 bit）。
 */
function genCode(len = 12): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
  let s = ''
  while (s.length < len) {
    for (const b of randomBytes(len * 2)) {
      if (b >= 256 - (256 % chars.length)) continue // 拒绝采样，保证均匀
      s += chars[b % chars.length]
      if (s.length >= len) break
    }
  }
  return s
}

export function apply(ctx: Context): void {
  /* 单一来源：直接使用 ctx.privhub 的权威类型（删掉本地 unknown 影子类型）。 */
  const svc = ctx.privhub

  /* 发布（可读权限即可发布）/ 撤销（创建者/admin） */
  svc.route('/privhub/api/publish', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (req.method === 'DELETE') {
      const url = new URL(String((req as { url?: string }).url ?? '/'), 'http://x')
      const code = url.searchParams.get('code') ?? ''
      /* D6：发布列表是读-改-写，且「发布」与「撤销」共用一份文件 —— 同锁互斥。 */
      await svc.withFileLock(FILE, async () => {
        const list = await load(ctx.storage)
        const hit = list.find(p => p.code === code)
        if (!hit) return json(res, 404, { ok: false, error: '发布不存在' })
        if (hit.createdBy !== u.username && u.role !== 'admin') return json(res, 403, { ok: false, error: '仅创建者或管理员可撤销' })
        await save(ctx.storage, list.filter(p => p.code !== code))
        json(res, 200, { ok: true })
      })
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
    const expiresHours = Number(body.expiresHours ?? '0')
    /* D6：并发的两次「发布」会各自读到旧列表再写回，后写的把先发的链接丢掉 ——
     * 那条链接已经散出去了，但库里查不到，只能整条重发。整段置锁。 */
    const created = await svc.withFileLock(FILE, async () => {
      const list = await load(ctx.storage)
      // 同一文件重复发布 → 复用旧链接
      const existing = list.find(p => p.project === project && p.path === path)
      if (existing) return { code: existing.code, reused: true }
      const code = genCode()
      list.push({
        code,
        project,
        path,
        createdBy: u.username,
        createdAt: Date.now(),
        expiresAt: expiresHours > 0 ? Date.now() + expiresHours * 3600 * 1000 : null,
      })
      await save(ctx.storage, list)
      return { code, reused: false }
    })
    json(res, 200, { ok: true, code: created.code, url: '/pub?code=' + created.code, reused: created.reused })
  }, 'publish')

  /* 发布列表（我的；admin 全部） */
  svc.route('/privhub/api/publish/list', async (_req, res) => {
    const u = svc.requireUser(_req, res)
    if (!u) return
    const list = await load(ctx.storage)
    const mine = u.role === 'admin' ? list : list.filter(p => p.createdBy === u.username)
    json(res, 200, { ok: true, publishes: mine.map(p => ({ ...p, url: '/pub?code=' + p.code })) })
  }, 'publish-list')

  /* 撤销（创建者/admin）——已并入上方 /api/publish 的 method 分发 */


  /* 免登录只读访问 */
  svc.route('/pub', async (req, res) => {
    const url = new URL(String((req as { url?: string }).url ?? '/'), 'http://x')
    const code = url.searchParams.get('code') ?? ''
    const list = await load(ctx.storage)
    const pub = list.find(p => p.code === code)
    if (!pub) return json(res, 404, { ok: false, error: '链接不存在或已撤销' })
    if (pub.expiresAt !== null && Date.now() > pub.expiresAt) return json(res, 410, { ok: false, error: '链接已过期' })
    const target = await svc.resolveReal(pub.project, pub.path)
    if (target === null || !existsSync(target)) return json(res, 404, { ok: false, error: '文件不存在' })
    const html = await ctx.storage.readText(target).catch(() => '')
    const name = pub.path.split('/').pop() || 'page'
    const body = Buffer.from(html, 'utf8')
    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      // S2 安全修复：发布页是【免登录 + 同源】页面，若不沙箱化，页面内脚本可读取
      // 同源 localStorage 中的会话 token（privhub_token）→ 任意访客可接管管理员账号。
      // 因此禁用脚本、禁止同源访问，仅放行图片与内联样式（md→HTML 页面所需）。
      'content-security-policy': "default-src 'none'; img-src 'self' data: blob:; style-src 'unsafe-inline' 'self'; font-src 'self' data:; sandbox",
      'content-length': body.length,
      'x-pub-name': encodeURIComponent(name),
    })
    res.end(body)
  }, 'pub-view')
}
