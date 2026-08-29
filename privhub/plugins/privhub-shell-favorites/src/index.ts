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
export const inject = ['privhub']

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

async function loadAll(): Promise<FavData> {
  const file = join(rootDir, 'data', 'favorites.json')
  if (!existsSync(file)) return {}
  try { return JSON.parse(await readFile(file, 'utf8')) as FavData } catch { return {} }
}

async function saveAll(data: FavData): Promise<void> {
  const file = join(rootDir, 'data', 'favorites.json')
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, JSON.stringify(data, null, 2), 'utf8')
}

export function apply(ctx: Context): void {
  const svc = ctx.privhub

  svc.route('/privhub/api/favorites', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    const all = await loadAll()
    const list = all[u.username] ?? []

    if (req.method === 'GET') {
      json(res, 200, { ok: true, favorites: list })
      return
    }
    if (req.method === 'DELETE') {
      let body: any
      try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
      const project = String(body.project ?? '')
      const path = String(body.path ?? '')
      const next = list.filter((e) => !(e.project === project && e.path === path))
      all[u.username] = next
      await saveAll(all)
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
    const dup = list.some((e) => e.project === project && e.path === path)
    if (dup) return json(res, 200, { ok: true, favorites: list, already: true })
    const next = [{ project, path, name, isDir: body.isDir === true, at: Date.now() }, ...list]
    all[u.username] = next
    await saveAll(all)
    json(res, 200, { ok: true, favorites: next })
  }, 'favorites')
}
