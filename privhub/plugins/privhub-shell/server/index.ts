/**
 * privhub-shell — 页面骨架插件（前后端一体）
 * server 侧：聚合各业务插件 client manifest，供骨架页按 slot 加载。
 * @module privhub-shell
 */

import { Context } from '@deepseek-ai/cordis'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'

export const name = 'privhub-shell'
export const inject = ['webServer', 'privhub']

export interface ShellManifest {
  id: string
  title: string
  icon: string
  description?: string
  slots: string[]
  entry: string
  barItems?: { icon: string; title: string; slot: string; adminOnly?: boolean }[]
}

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()

function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

/** A15：manifest 聚合缓存（目录扫描较重，5s TTL + 按需失效）。 */
let manifestCache: { at: number; value: ShellManifest[] } | null = null
const CACHE_TTL = 5000

async function collectManifests(): Promise<ShellManifest[]> {
  if (manifestCache && Date.now() - manifestCache.at < CACHE_TTL) return manifestCache.value
  const pluginsDir = join(rootDir, 'plugins')
  const out: ShellManifest[] = []
  const seenViews = new Map<string, string>() // view -> 插件 id（A19：barItems 冲突检测；同 slot 多组件是设计特性，不视为冲突）
  if (!existsSync(pluginsDir)) return out
  const entries = await readdir(pluginsDir, { withFileTypes: true })
  for (const ent of entries) {
    if (!ent.isDirectory()) continue
    const mf = join(pluginsDir, ent.name, 'client', 'manifest.json')
    if (!existsSync(mf)) continue
    try {
      const raw = JSON.parse(await readFile(mf, 'utf8')) as Partial<ShellManifest>
      if (!raw.id || !Array.isArray(raw.slots)) continue
      // A19：barItems view 冲突检测（view 决定图标栏点击分发，重复会被后者覆盖）
      for (const bi of raw.barItems ?? []) {
        const view = (bi as { view?: string }).view ?? bi.slot
        const prev = seenViews.get(view)
        if (prev && prev !== raw.id) console.warn(`[shell] barItems 冲突：view "${view}" 由 ${prev} 与 ${raw.id} 同时声明，后者将覆盖前者`)
        else seenViews.set(view, raw.id)
      }
      out.push({
        id: raw.id,
        title: raw.title ?? ent.name,
        icon: raw.icon ?? '📦',
        description: raw.description,
        slots: raw.slots,
        entry: `/privhub-plugins/${ent.name}/index.js`,
        barItems: raw.barItems,
      })
    } catch { /* skip broken manifest */ }
  }
  manifestCache = { at: Date.now(), value: out }
  return out
}

export function apply(ctx: Context): void {
  const svc = ctx.privhub

  svc.route('/privhub/api/shell/manifest', async (_req: IncomingMessage, res: ServerResponse) => {
    try {
      const manifests = await collectManifests()
      json(res, 200, { ok: true, manifests })
    } catch (e) {
      json(res, 500, { ok: false, error: 'manifest 聚合失败: ' + String(e) })
    }
  }, 'shell-manifest')
}
