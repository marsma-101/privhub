/**
 * privhub-svc-office — Office 能力库 Service（插件①，L2 能力层）
 *
 * 纯能力层：读写编辑 Office 文档（docx/xlsx/pptx/pdf），零界面零路由。
 * 以 cordis Service 形式暴露 ctx.office：
 *   - read(project, relPath)    → { ok, kind, content, error }（按类型返回结构化内容）
 *   - write(project, relPath, content) → { ok, error }（写回；xlsx/docx 可写）
 *   - info(project, relPath)    → { ok, kind, sizeText, error }
 * 依赖库：mammoth(docx读)/docx(docx写)/exceljs(xlsx读写)/jszip(pptx读)/
 *         pdf-parse(pdf读)/pptxgenjs(pptx写)/pdfkit(pdf写)/pdf-lib(pdf合并拆分)
 * 供插件③（人工编辑）与插件②（智能体工具）消费。
 *
 * @module privhub-svc-office
 */

import { Service } from '@deepseek-ai/cordis'
import type { Context } from '@deepseek-ai/cordis'
import { extname } from 'node:path'

/** 支持的类型。 */
export type OfficeKind = 'docx' | 'xlsx' | 'pptx' | 'pdf' | 'unknown'
export const OFFICE_EXTS = ['docx', 'xlsx', 'pptx', 'pdf'] as const

/** 读取结果：不同 kind 返回不同 content 结构。 */
export interface OfficeReadResult {
  ok: boolean
  kind: OfficeKind
  content?: unknown
  error?: string
}

/** 写入结果。 */
export interface OfficeWriteResult {
  ok: boolean
  error?: string
}

/** xlsx 表格内容（单元格坐标 a1 风格 → 值）。 */
export interface XlsxSheetData {
  name: string
  /** rows: 二维数组（行→列→值） */
  rows: (string | number | boolean | null)[][]
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    office: OfficeService
  }
}

export class OfficeService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'office')
  }

  /** 文件类型判定（按扩展名）。 */
  kindOf(relPath: string): OfficeKind {
    const ext = extname(relPath).slice(1).toLowerCase()
    if ((OFFICE_EXTS as readonly string[]).includes(ext)) return ext as OfficeKind
    return 'unknown'
  }

  /** 读取 Office 文档（权限由调用方校验）。 */
  async read(project: string, relPath: string): Promise<OfficeReadResult> {
    const kind = this.kindOf(relPath)
    if (kind === 'unknown') return { ok: false, kind, error: '不支持的 Office 类型: .' + extname(relPath).slice(1) }
    const target = await this.ctx.privhub.resolveReal(project, relPath)
    if (target === null) return { ok: false, kind, error: '读取失败' }
    const buf = await this.ctx.storage.readBuffer(target).catch(() => null)
    if (!buf) return { ok: false, kind, error: '读取失败' }
    if (buf.length > 32 * 1024 * 1024) return { ok: false, kind, error: '文件过大（>32MB）' }
    try {
      const lib = await import('./office-lib.mjs')
      if (kind === 'docx') return { ok: true, kind, content: await lib.readDocx(buf) }
      if (kind === 'xlsx') return { ok: true, kind, content: await lib.readXlsx(buf) }
      if (kind === 'pptx') return { ok: true, kind, content: await lib.readPptx(buf) }
      return { ok: true, kind, content: await lib.readPdf(buf) }
    } catch (e) {
      return { ok: false, kind, error: '解析失败: ' + (e instanceof Error ? e.message : String(e)) }
    }
  }

  /** 写入 Office 文档（xlsx：rows 二维数组；docx：markdown 文本）。权限由调用方校验。 */
  async write(project: string, relPath: string, content: unknown): Promise<OfficeWriteResult> {
    const kind = this.kindOf(relPath)
    if (kind !== 'xlsx' && kind !== 'docx') return { ok: false, error: kind + ' 暂不支持写回（只读）' }
    const target = await this.ctx.privhub.resolveReal(project, relPath)
    if (target === null) return { ok: false, error: '路径无效' }
    try {
      const lib = await import('./office-lib.mjs')
      let buf: Buffer
      if (kind === 'xlsx') {
        if (!Array.isArray(content) || content.length === 0) return { ok: false, error: 'xlsx 写入需要 rows 二维数组' }
        buf = await lib.writeXlsx(content as (string | number | boolean | null)[][])
      } else {
        if (typeof content !== 'string') return { ok: false, error: 'docx 写入需要文本内容' }
        buf = await lib.writeDocx(content)
      }
      await this.ctx.storage.writeBuffer(target, buf)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: '写入失败: ' + (e instanceof Error ? e.message : String(e)) }
    }
  }
}

export const name = 'privhub-svc-office'
export const inject = ['privhub', 'storage']
export function apply(ctx: Context): void {
  new OfficeService(ctx)
}
