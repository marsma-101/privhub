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

async function collectManifests(): Promise<ShellManifest[]> {
  const pluginsDir = join(rootDir, 'plugins')
  const out: ShellManifest[] = []
  if (!existsSync(pluginsDir)) return out
  const entries = await readdir(pluginsDir, { withFileTypes: true })
  for (const ent of entries) {
    if (!ent.isDirectory()) continue
    const mf = join(pluginsDir, ent.name, 'client', 'manifest.json')
    if (!existsSync(mf)) continue
    try {
      const raw = JSON.parse(await readFile(mf, 'utf8')) as Partial<ShellManifest>
      if (!raw.id || !Array.isArray(raw.slots)) continue
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
