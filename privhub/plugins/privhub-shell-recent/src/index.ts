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
import { json, readBody, readJsonStore } from '../../privhub-core/src/index'

export const name = 'privhub-shell-recent'
export const inject = ['privhub', 'storage', 'eventBus']

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

/* 最近列表同样是**所有用户共用一份**（按 username 分键）。 */
const RECENT_FILE = join(rootDir, 'data', 'recent.json')

async function loadAll(storage: { readText: (f: string) => Promise<string> }): Promise<RecentData> {
  /* D4：最近列表损坏 → 隔离存证 + 抛错（此前静默当空，一次「打开」就把所有人的最近记录清掉）。 */
  return readJsonStore<RecentData>(storage, RECENT_FILE, {})
}

async function saveAll(storage: { writeText: (f: string, d: string) => Promise<void> }, data: RecentData): Promise<void> {
  await mkdir(dirname(RECENT_FILE), { recursive: true })
  await storage.writeText(RECENT_FILE, JSON.stringify(data, null, 2))
}

export function apply(ctx: Context): void {
  const svc = ctx.privhub

  ctx.eventBus.declareListen('personal:renamed', 'privhub-shell-recent', '个人空间改名 → 同步最近列表里的项目名')

  /* 个人空间改名 → 把最近列表里指向旧目录名的条目的 project 改写成新名。
   * 不改写也不会报错（读取时会按 visibleProjects 过滤掉），但用户的「最近」
   * 记录会静默丢失一条，属于数据腐坏，顺手修掉。 */
  ctx.effect(() => {
    const off = ctx.on('personal:renamed', (p: { oldName?: string; newName?: string }) => {
      const oldName = String(p?.oldName ?? '')
      const newName = String(p?.newName ?? '')
      if (oldName === '' || newName === '' || oldName === newName) return
      void (async () => {
        try {
          /* D6：改写整份文件，必须与「写最近一条」互斥 —— 否则这次全量写回会和
           * 用户此刻正在记录的「最近一条」互相覆盖。 */
          await svc.withFileLock(RECENT_FILE, async () => {
            const all = await loadAll(ctx.storage)
            let touched = false
            for (const key of Object.keys(all)) {
              for (const e of all[key] ?? []) {
                if (e.project === oldName) { e.project = newName; touched = true }
              }
            }
            if (touched) await saveAll(ctx.storage, all)
          })
        } catch { /* 最近列表非关键数据，失败不影响改名本身 */ }
      })()
    })
    return () => off()
  })

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
    /* D6：读-改-写整体串行 —— 打开一个文件就会走到这里，是**最密集**的写入点，
     * 两个人同时浏览就足以互相覆盖（列表是共用的，丢的是别人的记录）。 */
    const next = await svc.withFileLock(RECENT_FILE, async () => {
      const all = await loadAll(ctx.storage)
      const list = all[u.username] ?? []
      // 去重（同项目同路径）：移出旧条目，头部插入新条目
      const rest = list.filter((e) => !(e.project === project && e.path === path))
      const updated = [{ project, path, name, isDir, at: Date.now() }, ...rest].slice(0, MAX_RECENT)
      all[u.username] = updated
      // 尽力而为：多实例共享数据目录时 rename 偶发竞争，重试一次；仍失败不阻塞（最近列表非关键数据）
      try {
        await saveAll(ctx.storage, all)
      } catch {
        await new Promise((r) => setTimeout(r, 80))
        await saveAll(ctx.storage, all).catch(() => { /* 忽略 */ })
      }
      return updated
    })
    json(res, 200, { ok: true, recent: next })
  }, 'recent')
}
