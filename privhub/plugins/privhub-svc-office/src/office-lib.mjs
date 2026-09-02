/**
 * Office 读写库（纯 ESM，供 privhub-svc-office 动态 import）
 *
 * 读：
 *   - readDocx：mammoth → { text, html }
 *   - readXlsx：exceljs → { sheets: [{ name, rows }] }（行列上限保护）
 *   - readPptx：jszip 解 slide XML → { slides: [{ title, bullets }] }
 *   - readPdf：pdf-parse → { text, pages }
 * 写：
 *   - writeXlsx：exceljs 从 rows 二维数组重建（保留首行表头加粗）
 *   - writeDocx：docx 库从纯文本/轻量 markdown 生成
 */
import mammoth from 'mammoth'
import ExcelJS from 'exceljs'
import JSZip from 'jszip'
// pdf-parse 的 index.js 在模块顶层就读取 test 文件（已知 bug），改用 lib/pdf-parse.js 入口
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
// word-extractor：解析旧版 Word .doc（OLE2 二进制）
import WordExtractor from 'word-extractor'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'

const MAX_ROWS = 1000
const MAX_COLS = 60

/* ---------- 读 ---------- */

/** doc（旧版 Word 二进制）→ { text }
 *  1) word-extractor 解析 OLE2（真 .doc）
 *  2) 失败兜底：调用 Python scripts/doc2md.py（RTF/HTML 伪装 + OLE2 FIB 解析）
 */
export async function readDoc(buf) {
  // 先试 word-extractor（内存 buffer）
  try {
    const extractor = new WordExtractor()
    const doc = await extractor.extract(buf)
    const text = (doc.getBody() || '').trim()
    if (text) return { text }
  } catch { /* 落到 Python 兜底 */ }
  // Python 兜底：写临时文件 → scripts/doc2md.py
  try {
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const { writeFile, readFile, rm } = await import('node:fs/promises')
    const { execFile } = await import('node:child_process')
    const { promisify } = await import('node:util')
    const execFileAsync = promisify(execFile)
    const root = process.env.PRIVHUB_ROOT?.trim() || process.cwd()
    const script = join(root, 'scripts', 'doc2md.py')
    const tmp = join(tmpdir(), 'privhub-doc-' + Date.now() + '.doc')
    const out = tmp.replace(/\.doc$/, '.md')
    try {
      await writeFile(tmp, buf)
      try {
        await execFileAsync('python', [script, tmp, out], { timeout: 15000, windowsHide: true })
      } catch {
        await execFileAsync('python3', [script, tmp, out], { timeout: 15000, windowsHide: true })
      }
      const md = await readFile(out, 'utf8')
      if (md.trim()) return { text: md.trim() }
    } finally {
      await rm(tmp, { force: true }).catch(() => {})
      await rm(out, { force: true }).catch(() => {})
    }
  } catch { /* 兜底提示 */ }
  return { text: '[无法提取 DOC 文本]（请用 Word/WPS 打开后另存为 docx 再上传）' }
}

/** docx → { text, html } */
export async function readDocx(buf) {
  const r = await mammoth.convertToMarkdown({ buffer: buf })
  const text = r.value || ''
  return { text, html: r.messages.length ? '' : undefined }
}

/** xlsx → { sheets: [{ name, rows }] } */
export async function readXlsx(buf) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buf)
  const sheets = []
  for (const ws of wb.worksheets) {
    const rows = []
    let rowCount = 0
    ws.eachRow({ includeEmpty: true }, (row) => {
      if (rowCount >= MAX_ROWS) return
      rowCount++
      const cells = []
      for (let c = 1; c <= Math.min(MAX_COLS, (row.cellCount || 0) || 1); c++) {
        const cell = row.getCell(c)
        let v = cell.value
        if (v && typeof v === 'object') {
          if (v.richText) v = v.richText.map((t) => t.text).join('')
          else if (v.result !== undefined) v = v.result
          else if (v.text !== undefined) v = v.text
          else v = ''
        }
        cells.push(v === null || v === undefined ? null : v)
      }
      rows.push(cells)
    })
    sheets.push({ name: ws.name, rows })
  }
  return { sheets }
}

/** pptx → { slides: [{ title, bullets }] } */
export async function readPptx(buf) {
  const zip = await JSZip.loadAsync(buf)
  const slideNames = Object.keys(zip.files)
    .filter((n) => n.startsWith('ppt/slides/slide') && n.endsWith('.xml'))
    .sort((a, b) => (parseInt(a.replace('ppt/slides/slide', '').replace('.xml', ''), 10) || 0) - (parseInt(b.replace('ppt/slides/slide', '').replace('.xml', ''), 10) || 0))
  const slides = []
  for (const name of slideNames) {
    const xml = await zip.files[name].async('string')
    const paragraphs = []
    for (const paraPart of xml.split('<a:p')) {
      let t = ''
      for (const tp of paraPart.split('<a:t')) {
        const close = tp.indexOf('</a:t>')
        if (close < 0) continue
        const gt = tp.indexOf('>')
        if (gt < 0 || gt > close) continue
        t += tp.slice(gt + 1, close).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
      }
      const trimmed = t.trim()
      if (trimmed) paragraphs.push(trimmed)
    }
    if (paragraphs.length) slides.push({ title: paragraphs[0], bullets: paragraphs.slice(1) })
  }
  return { slides }
}

/** pdf → { text, pages } */
export async function readPdf(buf) {
  const data = await pdfParse(buf)
  return { text: data.text || '', pages: data.numpages || 0 }
}

/* ---------- 写 ---------- */

/** xlsx：从 rows 二维数组重建工作簿（sheet1，首行加粗）。 */
export async function writeXlsx(rows) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Sheet1')
  rows.slice(0, MAX_ROWS).forEach((row, ri) => {
    const r = ws.getRow(ri + 1)
    row.slice(0, MAX_COLS).forEach((v, ci) => {
      const cell = r.getCell(ci + 1)
      if (typeof v === 'number') cell.value = v
      else if (typeof v === 'boolean') cell.value = v
      else if (v === null || v === undefined) cell.value = null
      else cell.value = String(v)
    })
    if (ri === 0) r.font = { bold: true }
  })
  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}

/** docx：从纯文本生成（换行 → 段落；## / # / - 简单标记识别）。 */
export async function writeDocx(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n')
  const children = []
  for (const line of lines) {
    const t = line.trim()
    if (!t) { children.push(new Paragraph({ text: '' })); continue }
    const h = /^(#{1,4})\s+(.*)$/.exec(t)
    if (h) {
      children.push(new Paragraph({
        heading: h[1].length === 1 ? HeadingLevel.HEADING_1 : h[1].length === 2 ? HeadingLevel.HEADING_2 : h[1].length === 3 ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_4,
        children: [new TextRun({ text: h[2], bold: true })],
      }))
      continue
    }
    if (t.startsWith('- ')) {
      children.push(new Paragraph({ text: t.slice(2), bullet: { level: 0 } }))
      continue
    }
    // 行内 **加粗** / `代码`
    const runs = []
    const re = /(\*\*[^*]+\*\*|`[^`]+`)/g
    let last = 0
    let m
    while ((m = re.exec(line)) !== null) {
      if (m.index > last) runs.push(new TextRun({ text: line.slice(last, m.index) }))
      if (m[1].startsWith('**')) runs.push(new TextRun({ text: m[1].slice(2, -2), bold: true }))
      else runs.push(new TextRun({ text: m[1].slice(1, -1), font: 'Consolas' }))
      last = m.index + m[1].length
    }
    if (last < line.length) runs.push(new TextRun({ text: line.slice(last) }))
    children.push(new Paragraph({ children: runs.length ? runs : [new TextRun({ text: line })] }))
  }
  const doc = new Document({ sections: [{ children }] })
  return await Packer.toBuffer(doc)
}
