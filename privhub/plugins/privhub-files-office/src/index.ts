/**
 * privhub-files-office — Office 文档读取插件（G1）
 * 提取逻辑在 src/extract.mjs（纯 ESM 动态加载）；本文件不 import 任何 TS 模块（规避 tsx CJS 混编）。
 */
import type { Context } from '@deepseek-ai/cordis'
import { extname } from 'node:path'

export const name = 'privhub-files-office'
export const inject = ['privhub', 'storage']

const OFFICE_EXTS = ['docx', 'xls', 'xlsx', 'pptx']

/** 提取函数供路由与（未来）全文索引复用。 */
export type ExtractFn = (project: string, relPath: string) => Promise<{ ok: boolean; type?: string; markdown?: string; error?: string }>

function json(res: { writeHead: (n: number, h: Record<string, string>) => void; end: (s: string) => void }, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': String(Buffer.byteLength(payload)) })
  res.end(payload)
}

export function apply(ctx: Context): void {
  const svc = ctx.privhub

  const readBuf = async (project: string, relPath: string): Promise<Buffer | null> => {
    const target = await svc.resolveReal(project, relPath)
    if (target === null) return null
    try { return await ctx.storage.readBuffer(target) } catch { return null }
  }

  const extract = async (project: string, relPath: string): Promise<{ ok: boolean; type?: string; markdown?: string; error?: string }> => {
    const ext = extname(relPath).slice(1).toLowerCase()
    if (!OFFICE_EXTS.includes(ext)) return { ok: false, error: '不支持的 Office 类型: .' + ext }
    const buf = await readBuf(project, relPath)
    if (!buf) return { ok: false, error: '读取失败' }
    if (buf.length > 32 * 1024 * 1024) return { ok: false, error: '文件过大（>32MB），请下载后查看' }
    try {
      const mod = await import('./extract.mjs')
      const markdown = await mod.extractOffice(ext, buf)
      return { ok: true, type: ext, markdown }
    } catch (e) {
      return { ok: false, error: '解析失败: ' + (e instanceof Error ? e.message : String(e)) }
    }
  }

  svc.route('/privhub/api/office-preview', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    const url = new URL(req.url ?? '/', 'http://x')
    const project = url.searchParams.get('project') ?? ''
    const path = url.searchParams.get('path') ?? ''
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    const r = await extract(project, path)
    json(res, r.ok ? 200 : 400, r.ok ? { ok: true, type: r.type, markdown: r.markdown } : { ok: false, error: r.error })
  }, 'office-preview')
}
