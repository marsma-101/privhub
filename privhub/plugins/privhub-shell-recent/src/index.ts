/**
 * 私域枢纽最近打开插件（privhub-shell-recent，F03）
 *
 * 最近打开文件列表：GET /privhub/api/recent（当前用户）、
 * POST /privhub/api/recent（记录一条，上限 20 条）。
 * 数据存 data/recent.json（按用户名分组）。
 * 前端挂 user-area slot：顶栏「最近」下拉，点击直接定位。
 *
 * @module privhub-shell-recent
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { existsSync } from 'node:fs'
import type { Context } from '@deepseek-ai/cordis'
import { json, readBody } from '../../privhub-core/src/index'

export const name = 'privhub-shell-recent'
export const inject = ['privhub', 'storage']

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()

export interface RecentEntry {
  project: string
  path: string
  name: string
  isDir: boolean
  at: number
}

interface RecentData {
  [username: string]: RecentEntry[]
}

const MAX_RECENT = 20

async function loadAll(storage: { readText: (f: string) => Promise<string> }): Promise<RecentData> {
  const file = join(rootDir, 'data', 'recent.json')
  if (!existsSync(file)) return {}
  try { return JSON.parse(await storage.readText(file)) as RecentData } catch { return {} }
}

async function saveAll(storage: { writeText: (f: string, d: string) => Promise<void> }, data: RecentData): Promise<void> {
  const file = join(rootDir, 'data', 'recent.json')
  await mkdir(dirname(file), { recursive: true })
  await storage.writeText(file, JSON.stringify(data, null, 2))
}

export function apply(ctx: Context): void {
  const svc = ctx.privhub

  /* 最近列表（当前用户） */
  svc.route('/privhub/api/recent', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (req.method === 'GET') {
      const all = await loadAll(ctx.storage)
      // 可见过滤：权限收回后的项目残留不展示（与 favorites 同规则）
      const visible = await svc.visibleProjects(u)
      const recent = (all[u.username] ?? []).filter((e) => visible.includes(e.project))
      json(res, 200, { ok: true, recent })
      return
    }
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = String(body.project ?? '')
    const path = String(body.path ?? '')
    const name = String(body.name ?? '')
    const isDir = body.isDir === true
    if (project === '' || name === '') return json(res, 400, { ok: false, error: '参数不完整' })
    // 权限校验：只能记录自己有权限的项目
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限访问该项目' })
    const all = await loadAll(ctx.storage)
    const list = all[u.username] ?? []
    // 去重（同项目同路径）：移出旧条目，头部插入新条目
    const rest = list.filter((e) => !(e.project === project && e.path === path))
    const next = [{ project, path, name, isDir, at: Date.now() }, ...rest].slice(0, MAX_RECENT)
    all[u.username] = next
    // 尽力而为：多实例共享数据目录时 rename 偶发竞争，重试一次；仍失败不阻塞（最近列表非关键数据）
    try {
      await saveAll(ctx.storage, all)
    } catch {
      await new Promise((r) => setTimeout(r, 80))
      await saveAll(ctx.storage, all).catch(() => { /* 忽略 */ })
    }
    json(res, 200, { ok: true, recent: next })
  }, 'recent')
}
