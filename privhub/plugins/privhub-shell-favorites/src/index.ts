/**
 * 私域枢纽收藏插件（privhub-shell-favorites，F02）
 *
 * 文件/文件夹收藏（星标）：
 *   GET    /privhub/api/favorites     当前用户收藏列表
 *   POST   /privhub/api/favorites     添加 { project, path, name, isDir }
 *   DELETE /privhub/api/favorites     移除（body { project, path }）
 * 数据存 data/favorites.json（按用户名分组）。
 * 前端：图标栏星标入口 → 收藏视图（点击跳转）；文件面板右键「收藏」。
 *
 * @module privhub-shell-favorites
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { existsSync } from 'node:fs'
import type { Context } from '@deepseek-ai/cordis'
import { json, readBody } from '../../privhub-core/src/index'

export const name = 'privhub-shell-favorites'
export const inject = ['privhub', 'storage']

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()

export interface FavoriteEntry {
  project: string
  path: string
  name: string
  isDir: boolean
  at: number
}

interface FavData {
  [username: string]: FavoriteEntry[]
}

async function loadAll(storage: { readText: (f: string) => Promise<string> }): Promise<FavData> {
  const file = join(rootDir, 'data', 'favorites.json')
  if (!existsSync(file)) return {}
  try { return JSON.parse(await storage.readText(file)) as FavData } catch { return {} }
}

async function saveAll(storage: { writeText: (f: string, d: string) => Promise<void> }, data: FavData): Promise<void> {
  await storage.writeText(join(rootDir, 'data', 'favorites.json'), JSON.stringify(data, null, 2))
}

export function apply(ctx: Context): void {
  const svc = ctx.privhub

  svc.route('/privhub/api/favorites', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    const all = await loadAll(ctx.storage)
    const list = all[u.username] ?? []

    if (req.method === 'GET') {
      // 项目上下文安全：只返回当前用户仍可见项目内的收藏（权限收回后残留不展示）
      const visible = await svc.visibleProjects(u)
      json(res, 200, { ok: true, favorites: list.filter((f) => visible.includes(f.project)) })
      return
    }
    if (req.method === 'DELETE') {
      let body: any
      try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
      const project = String(body.project ?? '')
      const path = String(body.path ?? '')
      const next = list.filter((e) => !(e.project === project && e.path === path))
      all[u.username] = next
      await saveAll(ctx.storage, all)
      json(res, 200, { ok: true, favorites: next })
      return
    }
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = String(body.project ?? '')
    const path = String(body.path ?? '')
    const name = String(body.name ?? '')
    if (project === '' || name === '') return json(res, 400, { ok: false, error: '参数不完整' })
    // 项目上下文安全：只能收藏自己有权限的项目
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限访问该项目' })
    const dup = list.some((e) => e.project === project && e.path === path)
    if (dup) return json(res, 200, { ok: true, favorites: list, already: true })
    const next = [{ project, path, name, isDir: body.isDir === true, at: Date.now() }, ...list]
    all[u.username] = next
    await saveAll(ctx.storage, all)
    json(res, 200, { ok: true, favorites: next })
  }, 'favorites')
}
