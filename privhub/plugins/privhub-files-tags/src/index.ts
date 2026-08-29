/**
 * 私域枢纽标签插件（privhub-files-tags，F19）
 *
 * 文件/文件夹标签（复用 S5 `ctx.meta`，数据 data/meta.json）：
 *   GET    /privhub/api/meta/tags?project=&path=   读取标签（读权限）
 *   POST   /privhub/api/meta/tags                  设置标签（写权限，整体替换）
 *   GET    /privhub/api/meta/tags/all?project=     项目标签云（tag + count）
 *   GET    /privhub/api/meta/tagged?project=&tag=  按标签列出文件（筛选）
 * 设置成功后 emit 'meta:changed'（F18 知识图谱监听刷新）。
 *
 * client：图标栏「🏷 标签」→ 模态：当前选中文件标签编辑（联想已有标签）
 * + 项目标签云筛选（点击标签 → 文件列表 → 定位）。
 *
 * @module privhub-files-tags
 */

import type { Context } from '@deepseek-ai/cordis'
import { json, readBody } from '../../privhub-core/src/index'

export const name = 'privhub-files-tags'
export const inject = ['privhub', 'meta']

export function apply(ctx: Context): void {
  const svc = ctx.privhub
  const meta = ctx.meta

  const parseProjectPath = (url: URL): { project: string; path: string } => ({
    project: url.searchParams.get('project') ?? '',
    path: url.searchParams.get('path') ?? '',
  })

  /* 读取标签 */
  svc.route('/privhub/api/meta/tags', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    try {
      const url = new URL(req.url ?? '/', 'http://x')
      if (req.method === 'GET') {
        const { project, path } = parseProjectPath(url)
        if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
        json(res, 200, { ok: true, tags: await meta.getTags(project, path) })
        return
      }
      if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
      let body: any
      try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
      const project = String(body.project ?? '')
      const path = String(body.path ?? '')
      if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
      if (path === '' || svc.resolveInProject(project, path) === null) return json(res, 400, { ok: false, error: '路径无效' })
      const tags = Array.isArray(body.tags) ? body.tags.map((t: unknown) => String(t)) : []
      await meta.setTags(project, path, tags)
      ctx.emit('meta:changed', { project, path, tags })
      json(res, 200, { ok: true, tags: await meta.getTags(project, path) })
    } catch (e) {
      json(res, 400, { ok: false, error: e instanceof Error ? e.message : '操作失败' })
    }
  }, 'meta-tags')

  /* 项目标签云 */
  svc.route('/privhub/api/meta/tags/all', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    try {
      const url = new URL(req.url ?? '/', 'http://x')
      const { project } = parseProjectPath(url)
      if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
      json(res, 200, { ok: true, tags: await meta.allTags(project) })
    } catch (e) {
      json(res, 400, { ok: false, error: e instanceof Error ? e.message : '读取失败' })
    }
  }, 'meta-tags-all')

  /* 按标签列出文件 */
  svc.route('/privhub/api/meta/tagged', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    try {
      const url = new URL(req.url ?? '/', 'http://x')
      const { project } = parseProjectPath(url)
      const tag = url.searchParams.get('tag') ?? ''
      if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
      json(res, 200, { ok: true, files: await meta.taggedFiles(project, tag) })
    } catch (e) {
      json(res, 400, { ok: false, error: e instanceof Error ? e.message : '读取失败' })
    }
  }, 'meta-tagged')
}
