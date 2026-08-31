/**
 * privhub-files-explorer-v3 · server — 项目内查重接口
 *
 * GET /privhub/api/duplicates?project=xxx
 *   - 权限：读权限即可（canAccess）
 *   - 递归扫描当前项目全部文件（跳过隐藏项），按「文件名 + 字节大小」分组，
 *     组内数量 > 1 即重复组
 *   - 返回：{ ok, groups: [{ name, size, sizeText, count, files: [{ path, mtime }] }] }
 *     groups 按大小降序（大文件优先展示），组内 files 按路径排序
 *
 * 删除动作复用既有 /api/delete（移入回收站，可恢复）。
 *
 * @module privhub-files-explorer-v3/server
 */

import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { json } from '../../privhub-core/src/index'

export const name = 'privhub-files-explorer-v3'
export const inject = ['storage', 'privhub']

interface DupFile {
  name: string
  path: string
  size: number
  mtime: string
}

export function apply(ctx: Context): void {
  const svc = ctx.privhub as unknown as {
    route: (path: string, handler: (req: unknown, res: unknown) => Promise<void> | void, name?: string) => void
    requireUser: (req: unknown, res: unknown) => { username: string; role: string; projects?: string[] } | null
    canAccess: (u: { username: string; role: string }, project: string) => boolean
    resolveReal: (project: string, relPath: string) => Promise<string | null>
  }

  /* 递归收集项目内所有文件（含子目录，跳过隐藏项） */
  async function walkFiles(project: string): Promise<DupFile[]> {
    const root = await svc.resolveReal(project, '')
    if (root === null) return []
    const out: DupFile[] = []
    const stack: Array<{ dir: string; rel: string }> = [{ dir: root, rel: '' }]
    while (stack.length) {
      const cur = stack.pop()!
      let ents
      try { ents = await readdir(cur.dir, { withFileTypes: true }) } catch { continue }
      for (const e of ents) {
        if (e.name.startsWith('.')) continue
        const full = join(cur.dir, e.name)
        const childRel = cur.rel ? cur.rel + '/' + e.name : e.name
        if (e.isDirectory()) {
          stack.push({ dir: full, rel: childRel })
          continue
        }
        try {
          const st = await stat(full)
          out.push({ name: e.name, path: childRel, size: st.size, mtime: st.mtime.toISOString() })
        } catch { /* 坏文件跳过 */ }
      }
    }
    return out
  }

  function sizeText(n: number): string {
    if (n < 1024) return n + ' B'
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
    return (n / 1024 / 1024).toFixed(1) + ' MB'
  }

  svc.route('/privhub/api/duplicates', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    const url = new URL(String((req as { url?: string }).url ?? '/'), 'http://x')
    const project = url.searchParams.get('project') ?? ''
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    try {
      const files = await walkFiles(project)
      const groups = new Map<string, DupFile[]>()
      for (const f of files) {
        const key = f.name + '\u0000' + f.size
        const arr = groups.get(key)
        if (arr) arr.push(f)
        else groups.set(key, [f])
      }
      const out = []
      for (const [key, arr] of groups) {
        if (arr.length < 2) continue
        const name = key.slice(0, key.indexOf('\u0000'))
        arr.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
        out.push({
          name,
          size: arr[0].size,
          sizeText: sizeText(arr[0].size),
          count: arr.length,
          files: arr.map((f) => ({ path: f.path, mtime: f.mtime.replace('T', ' ').slice(0, 16) })),
        })
      }
      out.sort((a, b) => (b.size - a.size) || (a.name < b.name ? -1 : 1))
      json(res, 200, { ok: true, project, groups: out })
    } catch (e) {
      json(res, 500, { ok: false, error: e instanceof Error ? e.message : '查重失败' })
    }
  }, 'duplicates')
}
