/**
 * Office 文档提取（纯 ESM 模块，避免 tsx 的 CJS 混编问题）
 *
 * 以 .mjs 独立成文件：插件 TS 通过动态 import() 加载（ESM 解析器，
 * 不触发 tsx 对含 CJS npm 依赖文件的 CJS 转译）。
 *
 * 【扩展名一处定义】本文件**不再自带** Office 扩展名清单：
 * 迁前它有一份 `export const OFFICE_EXTS = ['docx','xls','xlsx','pptx']`，
 * 与同目录 `index.ts` 里那份是**同一份取值的两个副本**（全仓 4 处同族副本中的两处）。
 * 现在入口闸在 `index.ts` 的 `EXTRACT_EXTS`（从 `privhub-core/src/file-exts.ts` 派生），
 * 本文件只负责"按扩展名分发到对应的提取器"，**不认清单**。
 */
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'

/** 简易 XML 实体解码。 */
function decodeXmlEntities(s) {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)))
}

/** docx → Markdown（mammoth）。 */
async function extractDocx(buf) {
  const r = await mammoth.convertToMarkdown({ buffer: buf })
  const text = r.value.trim()
  return text || '[无法提取 DOCX 文本]'
}

/** xlsx/xls → Markdown 表格（SheetJS）。 */
function extractSpreadsheet(buf) {
  const wb = XLSX.read(buf, { type: 'buffer' })
  const out = []
  const MAX_ROWS = 500
  const MAX_COLS = 40
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    if (!ws) continue
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
    out.push('### ' + sheetName + '\n')
    const maxRows = Math.min(rows.length, MAX_ROWS)
    if (maxRows === 0) { out.push('（空工作表）\n'); continue }
    let maxCols = 0
    for (let i = 0; i < maxRows; i++) maxCols = Math.min(Math.max(maxCols, (rows[i] || []).length), MAX_COLS)
    if (maxCols === 0) maxCols = 1
    const esc = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
    for (let i = 0; i < maxRows; i++) {
      const cells = rows[i] || []
      const line = Array.from({ length: maxCols }, (_x, c) => esc(cells[c])).join(' | ')
      out.push('| ' + line + ' |')
      if (i === 0) out.push('| ' + Array.from({ length: maxCols }, () => '---').join(' | ') + ' |')
    }
    if (rows.length > MAX_ROWS) out.push('\n*（仅显示前 ' + MAX_ROWS + ' 行，共 ' + rows.length + ' 行）*\n')
    out.push('')
  }
  const text = out.join('\n').trim()
  return text || '[无法提取表格文本]'
}

/** pptx → Markdown（zip 解 slideN.xml，<a:p> 分组提取 <a:t>）。 */
async function extractPptx(buf) {
  const zip = await JSZip.loadAsync(buf)
  const slideNames = Object.keys(zip.files)
    .filter((n) => n.startsWith('ppt/slides/slide') && n.endsWith('.xml'))
    .sort((a, b) => {
      const na = parseInt(a.replace('ppt/slides/slide', '').replace('.xml', ''), 10) || 0
      const nb = parseInt(b.replace('ppt/slides/slide', '').replace('.xml', ''), 10) || 0
      return na - nb
    })
  const out = []
  for (let idx = 0; idx < slideNames.length; idx++) {
    const xml = await zip.files[slideNames[idx]].async('string')
    const paragraphs = []
    for (const paraPart of xml.split('<a:p')) {
      let paraText = ''
      for (const tPart of paraPart.split('<a:t')) {
        const closePos = tPart.indexOf('</a:t>')
        if (closePos < 0) continue
        const gtPos = tPart.indexOf('>')
        if (gtPos < 0 || gtPos > closePos) continue
        paraText += decodeXmlEntities(tPart.slice(gtPos + 1, closePos))
      }
      const trimmed = paraText.trim()
      if (trimmed) paragraphs.push(trimmed)
    }
    if (paragraphs.length === 0) continue
    out.push('## Slide ' + (idx + 1) + '\n')
    out.push('**' + paragraphs[0] + '**\n')
    for (const para of paragraphs.slice(1)) out.push('- ' + para)
    out.push('')
  }
  const text = out.join('\n').trim()
  return text || '[无法提取 PPTX 文本]'
}

/** 入口：按扩展名提取（**清单不在这里** —— 分发本身在 `index.ts` 的入口闸之后才会被调到）。 */
export async function extractOffice(ext, buf) {
  if (ext === 'docx') return await extractDocx(buf)
  if (ext === 'xlsx' || ext === 'xls') return extractSpreadsheet(buf)
  if (ext === 'pptx') return await extractPptx(buf)
  throw new Error('不支持的 Office 类型: .' + ext)
}
