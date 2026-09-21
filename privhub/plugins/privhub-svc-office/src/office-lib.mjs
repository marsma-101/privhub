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

/* ══════════════════════════════════════════════════════════════════════════
 * `.doc`（旧版 Word 二进制）：**读不出来就如实说读不出来**
 *
 * ## 迁前的病（`docs/reviews/11-格式支持矩阵与铺满修复.md` §2.5 ②）
 *
 * `readDoc` 是三级链：word-extractor → Python 兜底 `scripts/doc2md.py` → **兜底文案**。
 * 三级全部失败时它 `return { text: '[无法提取 DOC 文本]（请用 Word/WPS 打开后另存为 docx 再上传）' }`
 * —— 于是 `svc-office.read()` 拿到一个「有正文」的结果 ⇒ `ok:true` ⇒
 * `/privhub/api/office/read` 返回 200 + `ok:true` ⇒ **界面把这句提示当正文渲染**。
 * 实测那批假 `.doc`（RTF 伪装 / 空 OLE2）全部落到这条路上，用户看到的就是"文档里只有一行字"。
 *
 * ## 现在的约定（本批）
 *
 * `readDoc` **只回两种形状**，不再有第三种：
 *   · `{ text }`                —— 真提取到正文（可以是空串：空文档就是空文档，那是**事实**）；
 *   · `{ ok: false, reason, detail }` —— **提取不出正文**，并给出**可区分的原因码**：
 *       `capability-missing`  本机**没有** Python 兜底能力，而主解析器又打不开这个文件的容器
 *                             （本机实测就是这条：Store 占位别名）—— **换到有 Python 的环境才有救**
 *       `capability-broken`   探测到 Python 存在但**跑不起来**（与上者分开：该修安装而不是换环境）
 *       `parse-failed`        主解析器报了别的错（文件坏了 / 内容异常），与"缺能力"无关
 *       `python-failed`       有 Python，但脚本对它没产出内容
 *       `empty`               解析通了但确实没有正文
 * 由 `svc-office.read()` 把它翻成 `ok:false` + 中文原因（见 `src/index.ts`）。
 *
 * ## 为什么第三级（Python）保留
 *
 * 本机（Windows，【实证】`python`/`python3` 只是 Microsoft Store 占位别名，执行即 "Python was not found"）
 * 上它永远不会生效，但**别的部署环境可能有真 Python** ⇒ 删掉它等于砍掉一条真能力。
 * 本批只做两件事：**先探测再调用**（避免每次白等一次 execFile 超时），
 * 以及**把"能力不在"与"文件不对"分成两种原因**。
 * ══════════════════════════════════════════════════════════════════════════ */

/** Python 能力探测的结论（同一进程只探一次）。 */
let pythonProbeCache = null

/**
 * Windows 上 Microsoft Store 的**占位别名**目录。
 *
 * 为什么必须专门认它：这类 `python.exe` **执行起来会挂住十几秒**才报错（本机实测
 * `python -c pass` 8 秒未回 + `where` 显示它就在这个目录里），而 `.doc` 读取链是**请求路径上的同步步骤** ——
 * 为了判断"有没有 Python"让用户等十几秒，比读不出正文更坏。
 * 判据是**路径**（`where` 解析出来的真实路径）而不是"跑一下试试"，所以不受挂住影响。
 */
const WINDOWS_ALIAS_DIR = '\\windowsapps\\'

/** 用 `where`（跨平台回退 `which`）解析出候选命令的**真实路径**；解析不到 ⇒ 空数组。
 *  解析很快（本机实测 54ms），失败也只是退出码 1。 */
async function resolveCommandPaths(cmd) {
  const { execFile } = await import('node:child_process')
  const { promisify } = await import('node:util')
  const execFileAsync = promisify(execFile)
  for (const resolver of (process.platform === 'win32' ? ['where'] : ['which'])) {
    try {
      const r = await execFileAsync(resolver, [cmd], { timeout: 4000, windowsHide: true })
      const list = String(r.stdout || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
      if (list.length) return list
    } catch { /* 解析不到：下一个 */ }
  }
  return []
}

/**
 * 探测本机有没有**真能跑**的 python（两个候选命令取第一个成功的）。
 *
 * 三步，**顺序有意义**：
 *   ① `where python` / `where python3` 解析真实路径；解析不到 ⇒ 这个命令不存在；
 *   ② 路径落在 Microsoft Store 占位别名目录 ⇒ **直接判不可用，不执行**（执行会挂十几秒，见上）；
 *   ③ 只有真正存在、且不是占位别名的候选才跑一条 `-c pass` 确认（退出码 0 且无 stderr）。
 * 判据必须是「**退出码 0 且有产物**」而不是"有没有抛异常"：本机那对别名以 9009 退出、
 * 把 "Python was not found" 写进 stderr（不是 spawn ENOENT）。
 *
 * 结论缓存到进程结束（`.doc` 读不读得出来不该每次重新探测一遍环境）。
 */
async function probePython() {
  if (pythonProbeCache) return pythonProbeCache
  const { execFile } = await import('node:child_process')
  const { promisify } = await import('node:util')
  const execFileAsync = promisify(execFile)
  const notes = []
  let sawRealCandidate = false
  for (const cmd of ['python', 'python3']) {
    const paths = await resolveCommandPaths(cmd)
    if (paths.length === 0) { notes.push(cmd + ': 命令不存在'); continue }
    const alias = paths.find((p) => p.toLowerCase().includes(WINDOWS_ALIAS_DIR))
    if (alias && paths.every((p) => p.toLowerCase().includes(WINDOWS_ALIAS_DIR))) {
      notes.push(cmd + ': 只有 Microsoft Store 占位别名（' + alias + '），未执行')
      continue
    }
    sawRealCandidate = true
    try {
      const r = await execFileAsync(cmd, ['-c', 'pass'], { timeout: 8000, windowsHide: true })
      const out = String(r.stdout || '').trim()
      if (out === '' && String(r.stderr || '').trim() === '') {
        pythonProbeCache = { ok: true, cmd, path: paths[0] }
        return pythonProbeCache
      }
      notes.push(cmd + ': 退出码 0 但没有可用产物')
    } catch (e) {
      const code = e && (e.code !== undefined ? e.code : e.status)
      notes.push(cmd + ': ' + (code === undefined ? '执行失败' : '退出码 ' + code))
    }
  }
  /* `broken` 的区分有意义：**"机器上压根没有 Python"** 与 **"有 Python 但它跑不起来"**
   * 是两种不同的处置（前者换环境、后者修安装）。两者都 ⇒ 没有可用的转换能力。 */
  pythonProbeCache = { ok: false, broken: sawRealCandidate, detail: notes.join('；') || 'python / python3 都不可用' }
  return pythonProbeCache
}

/** 供 `readDoc` 之外（例如诊断/断言）读同一份探测结论。 */
export async function docConverterStatus() {
  const p = await probePython()
  return p.ok
    ? { ok: true, cmd: p.cmd, path: p.path }
    : { ok: false, reason: 'capability-missing', detail: p.detail }
}

/* 启动即预热（fire-and-forget）：把探测的代价挪到进程空闲时，
 * 这样第一次打开 .doc 不会被"探测环境"这件事拖住（探测本身有缓存，只做一次）。
 * 失败无所谓 —— readDoc 里的 await 会拿到同一份结果。 */
void probePython().catch(() => {})

/**
 * 旧版 Word `.doc` → `{ text }`（成功）或 `{ ok:false, reason, detail }`（**失败，如实报**）。
 *
 * 三级：① word-extractor（纯 JS，真 .doc 走这条）② Python `scripts/doc2md.py`（本机不可用）
 * ③ 不再有第三级文案 —— 失败就是失败。
 */
export async function readDoc(buf) {
  // ① word-extractor（内存 buffer）
  let extractorError = ''
  try {
    const extractor = new WordExtractor()
    const doc = await extractor.extract(buf)
    const text = (doc.getBody() || '').trim()
    if (text) return { text }
    extractorError = '解析通了但没有正文'
  } catch (e) {
    extractorError = (e && e.message) ? String(e.message) : String(e)
  }

  // ② Python 兜底：先探能力，再写临时文件 → scripts/doc2md.py
  const py = await probePython()
  if (py.ok) {
    let pyDetail = ''
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
        // 哪个命令可用就用哪个（探测已经告诉过我们了；失败再退另一个）
        const cands = py.cmd === 'python' ? ['python', 'python3'] : ['python3', 'python']
        let lastErr = null
        for (const cmd of cands) {
          try {
            await execFileAsync(cmd, [script, tmp, out], { timeout: 15000, windowsHide: true })
            lastErr = null
            break
          } catch (e) { lastErr = e }
        }
        if (lastErr) throw lastErr
        const md = await readFile(out, 'utf8')
        if (md.trim()) return { text: md.trim() }
        pyDetail = '脚本没有产出内容'
      } finally {
        await rm(tmp, { force: true }).catch(() => {})
        await rm(out, { force: true }).catch(() => {})
      }
    } catch (e) {
      pyDetail = (e && e.message) ? String(e.message) : String(e)
    }
    return {
      ok: false,
      reason: 'python-failed',
      detail: 'Python 转换失败：' + (pyDetail || '未产出内容'),
    }
  }

  // ③ **不再兜底成文案**：文件不对就明说文件不对，能力不在也明说能力不在。
  if (extractorError === '解析通了但没有正文') {
    return { ok: false, reason: 'empty', detail: '该 .doc 能解析但没有正文内容' }
  }
  /* 两类原因，**可区分**、处置不同：
   *   parse-failed        ⇒ **是这个文件**：word-extractor 打不开它（不是有效 .doc）。
   *   capability-missing  ⇒ **是这台机器**：连主解析器都只给出「读不了这种文件」，
   *                         而唯一的补救（Python 兜底）在这台机器上不存在 —— 换到有 Python 的环境才可能读出。
   * 判据：word-extractor 说的就是"Unable to read this type of file"（本机实测，RTF 伪装件的原文），
   * 它表明这个文件的容器**根本不是它能认的 Word 二进制**；这种件本来就是 Python 兜底要救的那一类。
   * 迁前这两类被同一句兜底文案糊在一起，还挂在 ok:true 上 —— 这才是本次要修的病。 */
  const notWordBinary = /unable to read this type of file|Invalid|not a/i.test(extractorError)
  return {
    ok: false,
    reason: notWordBinary ? (py.broken ? 'capability-broken' : 'capability-missing') : 'parse-failed',
    detail: notWordBinary
      ? '该文件不是有效的旧版 Word 二进制（word-extractor：' + extractorError + '）；'
        + '本机又没有可用的 Python 转换能力来兜底（' + (py.detail || '未探测到') + '）'
      : '解析失败（' + extractorError + '）',
  }
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
