/**
 * privhub-files-office — Office 文档读取插件（G1）
 * 提取逻辑在 src/extract.mjs（纯 ESM 动态加载）。
 *
 * ⚠ `package.json` 必须保留 `"type": "module"`：本文件要从 `privhub-core/src/file-exts.ts`
 *   导入共享扩展名集合（不带扩展名的相对导入）。缺了它，本目录下的 `.ts` 会被 tsx 当 CJS
 *   处理，那句 `import` 被转成 `require('../../privhub-core/src/file-exts')` ⇒ 解析不到 `.ts`
 *   ⇒ 整个插件加载失败（`[assembly] 插件加载失败`，且只在服务端日志里，界面上看不出来）。
 *   同族插件 office-ui / office-ai 未声明 type，因此它们刻意不 import 任何 TS 模块。
 */
import type { Context } from '@deepseek-ai/cordis'
import { extname } from 'node:path'
/* 【扩展名一处定义】本插件**提取链**认得的类型 = 共享的 Office 读取链集合 ∪ 它自己多认的 `.xls`
 * （SheetJS 能读 `xls`，`extract.mjs` 一直在这么做）。迁前这里是手写的一串，
 * 是全仓 4 处同族副本之一；口径与 `.ppt` 为什么谁都不读见 `file-exts.ts` 文件头
 * 「Office 那一族的口径」。 */
import { OFFICE_EXTS, OFFICE_EXTRACT_ONLY_EXTS, union } from '../../privhub-core/src/file-exts'

export const name = 'privhub-files-office'
export const inject = ['privhub', 'storage']

/** 本插件提取链认得的扩展名（**派生**，不手写）。 */
const EXTRACT_EXTS: readonly string[] = Object.freeze(union(OFFICE_EXTS, OFFICE_EXTRACT_ONLY_EXTS))

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
    if (!EXTRACT_EXTS.includes(ext)) return { ok: false, error: '不支持的 Office 类型: .' + ext }
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
