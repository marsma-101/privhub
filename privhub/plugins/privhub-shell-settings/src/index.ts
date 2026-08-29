/**
 * 私域枢纽 shell 设置插件（privhub-shell-settings，F04）
 *
 * 系统设置面板（D25）：主题 / 默认视图 / 上传限制。
 * 设置存 data/settings.json（读写走 /privhub/api/settings，
 * 写操作仅管理员）。
 *
 * @module privhub-shell-settings
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { existsSync } from 'node:fs'
import type { Context } from '@deepseek-ai/cordis'
import { json, readBody } from '../../privhub-core/src/index'

export const name = 'privhub-shell-settings'
export const inject = ['privhub']

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()

export interface Settings {
  theme: 'light' | 'dark'
  defaultView: 'grid' | 'list'
  maxUploadMB: number
}

const DEFAULT_SETTINGS: Settings = { theme: 'light', defaultView: 'grid', maxUploadMB: 2048 }

async function loadSettings(): Promise<Settings> {
  const file = join(rootDir, 'data', 'settings.json')
  if (!existsSync(file)) return { ...DEFAULT_SETTINGS }
  try {
    const raw = await readFile(file, 'utf8')
    const parsed = JSON.parse(raw) as Partial<Settings>
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch { return { ...DEFAULT_SETTINGS } }
}

async function saveSettings(s: Settings): Promise<void> {
  const file = join(rootDir, 'data', 'settings.json')
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, JSON.stringify(s, null, 2), 'utf8')
}

export function apply(ctx: Context): void {
  const svc = ctx.privhub

  /* 读设置（登录即可读） / 写设置（仅管理员），同一路径按 method 区分 */
  svc.route('/privhub/api/settings', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (req.method === 'GET') {
      json(res, 200, { ok: true, settings: await loadSettings() })
      return
    }
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    if (u.role !== 'admin') return json(res, 403, { ok: false, error: '仅管理员可修改设置' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const cur = await loadSettings()
    const next: Settings = { ...cur }
    if (body.theme === 'light' || body.theme === 'dark') next.theme = body.theme
    if (body.defaultView === 'grid' || body.defaultView === 'list') next.defaultView = body.defaultView
    if (typeof body.maxUploadMB === 'number' && body.maxUploadMB >= 1 && body.maxUploadMB <= 8192) next.maxUploadMB = Math.floor(body.maxUploadMB)
    await saveSettings(next)
    json(res, 200, { ok: true, settings: next })
  }, 'settings')
}
