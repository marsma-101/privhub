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
/* 【扩展名一处定义】Office 读取链认得的类型取自 `privhub-core/src/file-exts.ts` 的 `OFFICE_EXTS`
 * （迁前本文件自带一份 `['doc','docx','xlsx','pptx','pdf']`，是全仓 4 处同族副本之一；
 *  本批收敛，口径与 `.xls`/`.ppt` 为什么不在里面见该文件头「Office 那一族的口径」）。 */
import { OFFICE_EXTS, officeKindOf } from '../../privhub-core/src/file-exts'

/** 支持的类型。 */
export type OfficeKind = 'doc' | 'docx' | 'xlsx' | 'pptx' | 'pdf' | 'unknown'
/** 读取链认得的 kind（`unknown` 除外）—— 供"解析不了"时如实回带 kind 而不撒谎。 */
export type OfficeKnownKind = Exclude<OfficeKind, 'unknown'>

/**
 * 读取失败（**可区分的原因**）。
 *
 * 为什么要有这个类型：迁前 `.doc` 解析不出正文时 `read()` 回的是
 * `{ ok: true, kind:'doc', content:{ text:'[无法提取 DOC 文本]（…）' } }` —— 界面把**兜底句当正文**渲染，
 * 用户以为文档里就那一行字（`docs/reviews/11-格式支持矩阵与铺满修复.md` §2.5 ②）。
 * 现在失败一律 `ok:false`，并带上机器可辨的 `reason` 与给用户看的中文 `error`。
 */
export interface OfficeReadFailure {
  ok: false
  kind: OfficeKind
  error: string
  reason: OfficeReadReason
}
/** 失败原因（稳定标识，供断言与将来做界面分流；文案可改，**这两个字段的语义不改**）。 */
export type OfficeReadReason =
  /** 扩展名不在读取链里（`.xls`/`.ppt`/别的） */
  | 'unsupported-type'
  /** 路径无效 / 读不出字节 / 体积超限 */
  | 'read-failed'
  /** **这台机器**缺转换能力（本机：Python 兜底不可用）—— 与下面的 `parse-failed` 是两件事 */
  | 'capability-missing'
  /** 有转换器但它本身跑不起来 */
  | 'capability-broken'
  /** **这个文件**解析不了（内容坏了 / 不是它自称的那种格式） */
  | 'parse-failed'
  /** 解析通了但没有正文（空文档） */
  | 'empty-content'

/** 环境类原因 → 用户可读的一句话（**用户要能分清"换个文件"还是"换个环境"**）。 */
function capabilityError(kind: OfficeKind, detail: string): string {
  const why = detail.includes('占位别名') ? '本机没有真正的 Python（只有应用商店的占位程序）' : (detail || '未探测到可用的转换器')
  return kind === 'doc'
    ? '无法提取这份 .doc 的正文：' + why + '。请用 Word/WPS 打开后另存为 docx 再上传'
    : '无法提取这份 .' + kind + ' 的正文：' + why
}

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

  /** 文件类型判定（按扩展名）。取值来自共享的 `OFFICE_EXTS`（见文件头「扩展名一处定义」）。 */
  kindOf(relPath: string): OfficeKind {
    return officeKindOf(extname(relPath).slice(1)) as OfficeKind
  }

  /** 读取 Office 文档（权限由调用方校验）。
   *
   *  **契约（本批收紧）**：拿不到正文就是 `ok:false`，绝不用一句兜底文案冒充正文。
   *  失败时回带 `reason`（稳定标识）+ `error`（中文原因），见 `OfficeReadFailure`。 */
  async read(project: string, relPath: string): Promise<{ ok: true; kind: OfficeKnownKind; content: unknown } | OfficeReadFailure> {
    const ext = extname(relPath).slice(1)
    const kind = this.kindOf(relPath)
    if (kind === 'unknown') {
      return { ok: false, kind, reason: 'unsupported-type', error: '不支持的 Office 类型: .' + ext }
    }
    const target = await this.ctx.privhub.resolveReal(project, relPath)
    if (target === null) return { ok: false, kind, reason: 'read-failed', error: '读取失败' }
    const buf = await this.ctx.storage.readBuffer(target).catch(() => null)
    if (!buf) return { ok: false, kind, reason: 'read-failed', error: '读取失败' }
    if (buf.length > 32 * 1024 * 1024) return { ok: false, kind, reason: 'read-failed', error: '文件过大（>32MB）' }
    try {
      const lib = await import('./office-lib.mjs')
      if (kind === 'doc') {
        const r = await lib.readDoc(buf)
        /* `.doc` 那条链**自己**判定成败（三态返回，见 `office-lib.mjs` 文件头）。
         * 这是本批修的那处「解析失败却报成功」的落点：失败 ⇒ ok:false + 可区分的原因。 */
        if (r && r.ok === false) {
          const envIssue = r.reason === 'capability-missing' || r.reason === 'capability-broken'
          return {
            ok: false,
            kind,
            reason: r.reason === 'empty' ? 'empty-content'
              : r.reason === 'capability-broken' ? 'capability-broken'
                : r.reason === 'capability-missing' ? 'capability-missing'
                  : 'parse-failed',
            error: envIssue ? capabilityError(kind, r.detail || '') : (r.detail || '解析失败'),
          }
        }
        return { ok: true, kind, content: { text: String(r && r.text || '') } }
      }
      if (kind === 'docx') return { ok: true, kind, content: await lib.readDocx(buf) }
      if (kind === 'xlsx') return { ok: true, kind, content: await lib.readXlsx(buf) }
      if (kind === 'pptx') return { ok: true, kind, content: await lib.readPptx(buf) }
      return { ok: true, kind, content: await lib.readPdf(buf) }
    } catch (e) {
      return { ok: false, kind, reason: 'parse-failed', error: '解析失败: ' + (e instanceof Error ? e.message : String(e)) }
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
