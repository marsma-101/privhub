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
import { json, readBody, readJsonStore } from '../../privhub-core/src/index'

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

/* 收藏文件是**所有用户共用一份**（按 username 分键），所以两个人同时收藏就会撞同一个文件。 */
const FAV_FILE = join(rootDir, 'data', 'favorites.json')

async function loadAll(storage: { readText: (f: string) => Promise<string> }): Promise<FavData> {
  /* D4：收藏库损坏 → 隔离存证 + 抛错（此前静默当空，一次「收藏」就把所有人的收藏清掉）。 */
  return readJsonStore<FavData>(storage, FAV_FILE, {})
}

async function saveAll(storage: { writeText: (f: string, d: string) => Promise<void> }, data: FavData): Promise<void> {
  await storage.writeText(FAV_FILE, JSON.stringify(data, null, 2))
}

export function apply(ctx: Context): void {
  const svc = ctx.privhub

  svc.route('/privhub/api/favorites', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return

    if (req.method === 'GET') {
      // 项目上下文安全：只返回当前用户仍可见项目内的收藏（权限收回后残留不展示）
      const all = await loadAll(ctx.storage)
      const list = all[u.username] ?? []
      const visible = await svc.visibleProjects(u)
      json(res, 200, { ok: true, favorites: list.filter((f) => visible.includes(f.project)) })
      return
    }
    if (req.method === 'DELETE') {
      let body: any
      try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
      const project = String(body.project ?? '')
      const path = String(body.path ?? '')
      /* D6：读-改-写必须整体串行。否则两个请求各自「读到旧状态 → 改 → 写回」，
       * 后写的把先写的那条丢掉（丢的是**别人**的收藏，用户视角就是「我明明收藏了」）。 */
      const next = await svc.withFileLock(FAV_FILE, async () => {
        const all = await loadAll(ctx.storage)
        const list = all[u.username] ?? []
        const kept = list.filter((e) => !(e.project === project && e.path === path))
        all[u.username] = kept
        await saveAll(ctx.storage, all)
        return kept
      })
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
    // 项目上下文安全：只能收藏自己有权限的项目（放在锁外：不通过就根本不该排队）
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限访问该项目' })
    const { list: next, already } = await svc.withFileLock(FAV_FILE, async () => {
      const all = await loadAll(ctx.storage)
      const list = all[u.username] ?? []
      if (list.some((e) => e.project === project && e.path === path)) return { list, already: true }
      const updated = [{ project, path, name, isDir: body.isDir === true, at: Date.now() }, ...list]
      all[u.username] = updated
      await saveAll(ctx.storage, all)
      return { list: updated, already: false }
    })
    json(res, 200, already ? { ok: true, favorites: next, already: true } : { ok: true, favorites: next })
  }, 'favorites')
}
