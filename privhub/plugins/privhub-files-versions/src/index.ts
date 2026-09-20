/**
 * privhub-files-versions — 通用文件版本历史（文本类文件快照）
 *
 *   GET    /api/versions?project=&path=            版本列表（at/by/len，最新在前）
 *   POST   /api/versions/snapshot { project, path } 手动创建快照（读当前内容）
 *   POST   /api/versions/restore { project, path, at } 恢复到指定版本（写回）
 *
 * 每文件保留最近 20 个版本；快照存 data/versions.json（S7 加密，兼容旧明文）。
 * 恢复时写回使用 storage.writeText（S7 加密存储）。
 *
 * @module privhub-files-versions
 */

import { mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { json, readBody } from '../../privhub-core/src/index'
/* 【扩展名一处定义】本插件不再自己写文本扩展名清单，改为从 `privhub-core/src/file-exts` **显式派生**：
 * 派生式 = `VERSION_TEXT_EXTS`（= 可预览的纯文本 − 配置族 `.env`）。
 * 「要不要存版本快照」与「能不能预览」不是同一个问题，故是**派生**而不是共用同一个集合；
 * 取值范围与 `privhub-files-fulltext` 一致（索引与快照要覆盖的东西本来就该一样）。
 * 迁前这里是一份手写数组，比 core 预览清单**少了** `.toml/.htm/.java/.c/.cpp`
 * （实测不一致，见 `docs/reviews/11-格式支持矩阵与铺满修复.md` §3.3）。 */
import { VERSION_TEXT_EXTS } from '../../privhub-core/src/file-exts'

export const name = 'privhub-files-versions'
export const inject = ['storage', 'privhub']

interface Version {
  at: number
  by: string
  content: string
}

type Store = Record<string, Version[]>

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()
const FILE = join(rootDir, 'data', 'versions.json')
const MAX_PER_FILE = 20

/** 允许创建版本快照的文本扩展名（**派生**，不手写）。 */
const TEXT_EXTS = new Set(VERSION_TEXT_EXTS)

/** S7：快照库随 storage 加密（密文/明文自动识别，旧明文文件无缝兼容） */
async function load(ctx: Context): Promise<Store> {
  if (!existsSync(FILE)) return {}
  try { return JSON.parse(await ctx.storage.readText(FILE)) as Store } catch { return {} }
}
async function save(ctx: Context, store: Store): Promise<void> {
  await mkdir(dirname(FILE), { recursive: true })
  await ctx.storage.writeText(FILE, JSON.stringify(store, null, 2))
}

export function apply(ctx: Context): void {
  const svc = ctx.privhub as unknown as {
    route: (path: string, handler: (req: unknown, res: unknown) => Promise<void> | void, name?: string) => void
    requireUser: (req: unknown, res: unknown) => { username: string; role: string } | null
    canAccess: (u: { username: string; role: string }, project: string) => boolean
    resolveReal: (project: string, relPath: string) => Promise<string | null>
  }

  const isTextFile = (rel: string): boolean => TEXT_EXTS.has(extname(rel).slice(1).toLowerCase())

  svc.route('/privhub/api/versions', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    const url = new URL(String((req as { url?: string }).url ?? '/'), 'http://x')
    const project = url.searchParams.get('project') ?? ''
    const path = url.searchParams.get('path') ?? ''
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    const store = await load(ctx)
    const raw = store[project + '|' + path] || []
    const withContent = url.searchParams.get('preview') === '1'
    const list = raw.map(v => withContent ? { at: v.at, by: v.by, len: v.content.length, content: v.content } : { at: v.at, by: v.by, len: v.content.length })
    list.sort((a, b) => b.at - a.at)
    json(res, 200, { ok: true, versions: list })
  }, 'versions-list')

  svc.route('/privhub/api/versions/snapshot', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    let body: { project?: string; path?: string }
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = String(body.project ?? '')
    const path = String(body.path ?? '')
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    if (!isTextFile(path)) return json(res, 400, { ok: false, error: '仅支持文本类文件创建版本快照' })
    const target = await svc.resolveReal(project, path)
    if (target === null || !existsSync(target)) return json(res, 404, { ok: false, error: '文件不存在' })
    const content = await ctx.storage.readText(target).catch(() => '')
    const store = await load(ctx)
    const key = project + '|' + path
    const arr = store[key] || []
    arr.push({ at: Date.now(), by: u.username, content })
    while (arr.length > MAX_PER_FILE) arr.shift()
    store[key] = arr
    await save(ctx, store)
    json(res, 200, { ok: true, at: arr[arr.length - 1].at, total: arr.length })
  }, 'versions-snapshot')

  svc.route('/privhub/api/versions/restore', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    let body: { project?: string; path?: string; at?: number }
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = String(body.project ?? '')
    const path = String(body.path ?? '')
    const at = Number(body.at)
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    const store = await load(ctx)
    const arr = store[project + '|' + path] || []
    const ver = arr.find(v => v.at === at)
    if (!ver) return json(res, 404, { ok: false, error: '版本不存在' })
    const target = await svc.resolveReal(project, path)
    if (target === null) return json(res, 404, { ok: false, error: '文件不存在' })
    await ctx.storage.writeText(target, ver.content)
    // 恢复后生成新版本（便于反悔）
    arr.push({ at: Date.now(), by: u.username, content: ver.content })
    while (arr.length > MAX_PER_FILE) arr.shift()
    store[project + '|' + path] = arr
    await save(ctx, store)
    json(res, 200, { ok: true })
  }, 'versions-restore')
}
