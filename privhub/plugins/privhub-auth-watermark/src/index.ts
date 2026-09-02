/**
 * 私域枢纽水印插件（privhub-auth-watermark，F05）
 *
 * 预览数字水印：消费 S3 watermark Service 生成叠加内容，
 * 通过 GET /privhub/api/watermark 提供给前端叠加层。
 * 前端组件挂 preview 相关的全局叠加（watermark slot，骨架渲染）。
 *
 * @module privhub-auth-watermark
 */

import type { Context } from '@deepseek-ai/cordis'
import { json } from '../../privhub-core/src/index'

export const name = 'privhub-auth-watermark'
export const inject = ['privhub', 'watermark']

export function apply(ctx: Context): void {
  const svc = ctx.privhub
  const watermark = ctx.watermark

  svc.route('/privhub/api/watermark', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    json(res, 200, { ok: true, view: watermark.render(u) })
  }, 'watermark')
}
