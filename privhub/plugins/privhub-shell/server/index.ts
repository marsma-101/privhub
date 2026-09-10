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
import { tokenOf } from '../../privhub-core/src/index'

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

  svc.route('/privhub/api/shell/manifest', async (req: IncomingMessage, res: ServerResponse) => {
    /* S16：插件清单含全部插件 id / 说明 / slot，不应向未登录者暴露完整清单。
     *
     * ⚠️ 但【不能】未登录一律 401 —— 骨架的登录框本身就是插件提供的
     * （privhub-auth 挂在 `auth` slot），而登录框挂载又依赖本接口返回 manifest。
     * 若直接拒绝，会形成死锁：拿不到 manifest → 渲染不出登录框 →
     * 永远停在「加载中…」→ 用户根本无从登录。
     * （该回归已在开发环境实测复现，详见 docs/PrivHub-修复计划-S16登录死锁.md）
     *
     * 因此按登录态【分级返回】：
     *   - 未登录：仅返回「渲染登录界面所需的最小集合」= 声明了 auth slot 的插件
     *     （实测 2 个：privhub-auth、privhub-shell；其余插件不暴露），并带 partial 标记；
     *   - 已登录：返回完整清单。
     * 骨架登录成功后会再拉一次（loadManifests），据此拿到全部插件。
     *
     * 实现要点：collectManifests() 的 5s TTL 缓存放的是【完整清单】，
     * 过滤发生在缓存之后，所以未登录/已登录共享同一份缓存且互不污染。
     */
    const u = svc.me(tokenOf(req))
    try {
      const manifests = await collectManifests()
      if (!u) {
        const minimal = manifests.filter((m) => (m.slots || []).includes('auth'))
        json(res, 200, { ok: true, manifests: minimal, partial: true })
        return
      }
      json(res, 200, { ok: true, manifests })
    } catch (e) {
      json(res, 500, { ok: false, error: 'manifest 聚合失败: ' + String(e) })
    }
  }, 'shell-manifest')
}
