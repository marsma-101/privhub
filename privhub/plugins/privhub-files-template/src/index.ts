/**
 * 私域枢纽模板插件（privhub-files-template，F20）
 *
 * 页面模板库（消费 S5 `ctx.meta` 模板 CRUD，数据 data/templates.json）：
 *   GET    /privhub/api/templates              模板列表（登录即可）
 *   POST   /privhub/api/templates              新建模板（admin）
 *   PUT    /privhub/api/templates              更新模板（admin）
 *   DELETE /privhub/api/templates              删除模板（admin）
 *
 * client：图标栏「📝 新建文档」→ 向导：选模板 → 输入文件名 → 在项目当前目录
 * 创建（{{date}} 占位替换 + title 注入）→ 调用 F16 /api/doc 新建 → 定位打开。
 * admin 另有「管理模板」区（新增/编辑/删除）。
 *
 * @module privhub-files-template
 */

import type { Context } from '@deepseek-ai/cordis'
import { json, readBody } from '../../privhub-core/src/index'

export const name = 'privhub-files-template'
export const inject = ['privhub', 'meta']

export function apply(ctx: Context): void {
  const svc = ctx.privhub
  const meta = ctx.meta

  svc.route('/privhub/api/templates', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    try {
      if (req.method === 'GET') {
        json(res, 200, { ok: true, templates: await meta.listTemplates() })
        return
      }
      if (u.role !== 'admin') return json(res, 403, { ok: false, error: '仅管理员可管理模板' })
      let body: any
      try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
      if (req.method === 'POST') {
        const name = String(body.name ?? '').trim()
        const content = String(body.content ?? '')
        if (name === '' || content === '') return json(res, 400, { ok: false, error: '名称与内容必填' })
        const t = await meta.createTemplate({ name, description: String(body.description ?? ''), content })
        json(res, 200, { ok: true, template: t })
        return
      }
      if (req.method === 'PUT') {
        const id = String(body.id ?? '')
        const t = await meta.updateTemplate(id, {
          name: body.name !== undefined ? String(body.name) : undefined,
          description: body.description !== undefined ? String(body.description) : undefined,
          content: body.content !== undefined ? String(body.content) : undefined,
        })
        if (!t) return json(res, 404, { ok: false, error: '模板不存在' })
        json(res, 200, { ok: true, template: t })
        return
      }
      if (req.method === 'DELETE') {
        const ok = await meta.deleteTemplate(String(body.id ?? ''))
        json(res, ok ? 200 : 404, ok ? { ok: true } : { ok: false, error: '模板不存在' })
        return
      }
      return json(res, 405, { ok: false, error: 'method not allowed' })
    } catch (e) {
      json(res, 400, { ok: false, error: e instanceof Error ? e.message : '操作失败' })
    }
  }, 'templates')
}
