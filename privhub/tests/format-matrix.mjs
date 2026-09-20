/**
 * 格式支持矩阵 · 真文件实测探针（本轮新增，对应 docs/reviews/11-格式支持矩阵与铺满修复.md）
 *
 *   node tests/format-matrix.mjs
 *
 * 做什么：
 *   ① 现场生成真样本（docx / xlsx / pptx / pdf / zip —— 用项目自带依赖，不下载任何东西）；
 *   ② 补一批手工造的小样本（几十字节到几 KB）：文本类、图片类、旧版 Office、压缩包、
 *      音视频、邮件、电子书、富文本、无扩展名 ……；另拷 3 个**真身样本**
 *      （mammoth 的 docx、pdf-parse 的 pdf、jpeg-exif 的 tiff）；
 *   ③ 全部经 /privhub/api/upload 打进**隔离实例**（自己的根目录 + 端口 3193）；
 *   ④ 逐条驱动真实接口：/api/list、/api/preview、/api/preview-raw、/api/office/read、
 *      /api/office-preview、/api/office2/raw；
 *   ⑤ **前端会显示什么**不靠猜：把前端真身（utils.js 的 kindOf + content.js 的 loadContent）
 *      装进 vm 沙箱，用真 HTTP 当它的 api 桩，跑出真实的 store.content 状态。
 *
 * 安全约束（与 run-all.mjs 同一条）：**硬拒 3180/3181**（那是真实数据）。
 * 本探针只碰自己的隔离根（tests/.matrixroot），**不读不写**真实 data/ 与 data-files/。
 *
 * 不在 tests/run-all.mjs 的清单里：它是一次性实测探针（跑一次几十秒），
 * 不参与常规回归，免得给每次回归加负担。
 *
 * @module tests/format-matrix
 */

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, symlinkSync, readFileSync, writeFileSync, createWriteStream, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import vm from 'node:vm'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const PORT = Number(process.env.PRIVHUB_MATRIX_PORT || 3193)
const TEST_ROOT = process.env.PRIVHUB_TEST_ROOT || join(HERE, '.matrixroot')
const PROJECT = '公共'
const SUB = '矩阵样本'
const OUT_FILE = process.env.PRIVHUB_MATRIX_OUT || join(ROOT, '..', 'docs', 'reviews', '_matrix-format.txt')

if (PORT === 3180 || PORT === 3181) {
  console.error('[matrix] 拒绝执行：' + PORT + ' 是真实数据端口')
  process.exit(2)
}

const log = (...a) => console.log('[matrix]', ...a)
const lines = []
const out = (s) => { lines.push(s); console.log(s) }

/* ================= 1. 造样本 ================= */

/** 极小的合法图片字节（1x1），手写十六进制即可，不依赖任何库 */
const IMG = {
  png: Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082', 'hex'),
  gif: Buffer.from('47494638396101000100800000ffffff00000021f90401000000002c00000000010001000002024401003b', 'hex'),
  jpg: Buffer.from('ffd8ffe000104a46494600010100000100010000ffdb004300ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc00011080001000103012200021101031101ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffda0008010100003f00fbfeffd9', 'hex'),
  bmp: (() => {
    const b = Buffer.alloc(58)              // 1x1、24 位、无调色板的 BMP
    b.write('BM', 0, 'latin1')
    b.writeUInt32LE(58, 2); b.writeUInt32LE(54, 10); b.writeUInt32LE(40, 14)
    b.writeInt32LE(1, 18); b.writeInt32LE(1, 22); b.writeUInt16LE(1, 26); b.writeUInt16LE(24, 28)
    return b
  })(),
  ico: Buffer.concat([Buffer.from('0000010001000101000001001800000000001600000000000000', 'hex'), Buffer.alloc(22)]),
  webp: Buffer.concat([Buffer.from('52494646', 'hex'), Buffer.from('20000000', 'hex'), Buffer.from('5745425056503820', 'hex'), Buffer.alloc(20)]),
  tiff: Buffer.concat([Buffer.from('49492a0008000000', 'hex'), Buffer.alloc(64)]),          // II*\0 小端
  heic: Buffer.concat([Buffer.from('00000018667479706865696300000000', 'hex'), Buffer.alloc(64)]),
  avif: Buffer.concat([Buffer.from('0000001c667479706176696600000000617669666d696631', 'hex'), Buffer.alloc(64)]),
  svg: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="60" height="30"><rect width="60" height="30" fill="#4a7"/><text x="4" y="20" font-size="12">svg</text></svg>', 'utf8'),
}
/** OLE2 复合文档头（旧版 Office 的容器格式标志；本探针**没有**真正的 WordDocument 流，
 *  所以这条只验「路径走通没有」，真实 .doc 的解析结果标【推断】） */
const OLE2 = Buffer.concat([Buffer.from('d0cf11e0a1b11ae1', 'hex'), Buffer.alloc(504)])

const T = (s) => Buffer.from(s, 'utf8')

const SAMPLES = []
const add = (name, buf, note) => SAMPLES.push({ name, buf, note: note || '' })

async function buildGenerated() {
  /* docx */
  {
    const { Document, Packer, Paragraph, TextRun } = await import('docx')
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ children: [new TextRun({ text: 'PrivHub 样本 · 中文标题', bold: true })] }),
          new Paragraph({ children: [new TextRun('这是用于格式支持矩阵实测的 docx 正文。')] }),
        ],
      }],
    })
    add('gen-docx.docx', await Packer.toBuffer(doc), 'docx 库现场生成')
  }
  /* xlsx */
  {
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('工作表1')
    ws.addRow(['名称', '数量'])
    ws.addRow(['苹果', 3])
    add('gen-xlsx.xlsx', Buffer.from(await wb.xlsx.writeBuffer()), 'exceljs 现场生成')
  }
  /* pptx */
  {
    const PptxGenJS = (await import('pptxgenjs')).default
    const p = new PptxGenJS()
    const s = p.addSlide()
    s.addText('PrivHub PPTX 样本', { x: 1, y: 1, w: 8, h: 1 })
    const buf = await p.write({ outputType: 'nodebuffer' })
    add('gen-pptx.pptx', Buffer.from(buf), 'pptxgenjs 现场生成')
  }
  /* pdf */
  {
    const PDFDocument = (await import('pdfkit')).default
    const tmp = join(tmpdir(), 'privhub-matrix-pdf-' + Date.now() + '.pdf')
    const d = new PDFDocument({ size: 'A4' })
    const ws = createWriteStream(tmp)
    d.pipe(ws)
    d.fontSize(22).text('PrivHub PDF sample', 72, 100)
    d.fontSize(12).text('Generated by pdfkit for the format support matrix.', 72, 140)
    d.end()
    await new Promise((res, rej) => { ws.on('finish', res); ws.on('error', rej) })
    add('gen-pdf.pdf', readFileSync(tmp), 'pdfkit 现场生成（纯 ASCII：pdfkit 未嵌中文字体）')
  }
  /* zip */
  {
    const JSZip = (await import('jszip')).default
    const z = new JSZip()
    z.file('readme.txt', '这是一个压缩包样本。')
    z.file('sub/data.json', '{"a":1}')
    add('gen-zip.zip', await z.generateAsync({ type: 'nodebuffer' }), 'jszip 现场生成')
    /* odt / ods / epub：zip 容器 + 相关内容文件（近似样本，未过 LibreOffice / 阅读器校验） */
    const odt = new JSZip()
    odt.file('mimetype', 'application/vnd.oasis.opendocument.text')
    odt.file('content.xml', '<?xml version="1.0"?><office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"><office:body><office:text><text:p xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">ODT 正文</text:p></office:text></office:body></office:document-content>')
    add('hand-odt.odt', await odt.generateAsync({ type: 'nodebuffer' }), 'zip 容器近似样本（未过 LibreOffice 校验）')
    const ods = new JSZip()
    ods.file('mimetype', 'application/vnd.oasis.opendocument.spreadsheet')
    ods.file('content.xml', '<?xml version="1.0"?><office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"/>')
    add('hand-ods.ods', await ods.generateAsync({ type: 'nodebuffer' }), 'zip 容器近似样本')
    const epub = new JSZip()
    epub.file('mimetype', 'application/epub+zip')
    epub.file('META-INF/container.xml', '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')
    epub.file('content.opf', '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>样本</dc:title></metadata></package>')
    add('hand-book.epub', await epub.generateAsync({ type: 'nodebuffer' }), 'zip 容器近似样本（未过阅读器校验）')
  }
}

function buildCopiedReal() {
  const real = [
    [join(ROOT, 'node_modules', 'mammoth', 'test', 'test-data', 'single-paragraph.docx'), 'real-mammoth.docx', '真身样本（mammoth 测试件）'],
    [join(ROOT, 'node_modules', 'pdf-parse', 'test', 'data', '04-valid.pdf'), 'real-pdfparse.pdf', '真身样本（pdf-parse 测试件）'],
    [join(ROOT, 'node_modules', 'jpeg-exif', 'test', 'Arbitro.tiff'), 'real-jpegexif.tiff', '真身样本（jpeg-exif 测试件）：真正的 TIFF 位图'],
  ]
  for (const [p, name, note] of real) {
    if (existsSync(p)) add(name, readFileSync(p), note)
    else out('[warn] 真身样本缺失，跳过：' + p)
  }
}

function buildHandmade() {
  add('hand-a.txt', T('纯文本样本 hello\n第二行中文\n'), '')
  add('hand-b.md', T('# 标题\n\n正文**加粗**\n\n- 列表\n'), '')
  add('hand-c.csv', T('名称,数量\n苹果,3\n梨,5\n'), '')
  add('hand-d.tsv', T('名称\t数量\n苹果\t3\n'), '')
  add('hand-e.json', T('{"名称":"苹果","数量":3}\n'), '')
  add('hand-f.xml', T('<?xml version="1.0" encoding="UTF-8"?><根><项>值</项></根>\n'), '')
  add('hand-g.html', T('<!doctype html><html><body><h1>HTML 样本</h1><script>alert(1)</script></body></html>'), 'HTML：前端按**源码**显示（不渲染）')
  add('hand-h.svg', IMG.svg, 'SVG：可渲染，但响应头带 CSP sandbox（禁脚本）')
  add('hand-i.png', IMG.png, '')
  add('hand-j.jpg', IMG.jpg, '')
  add('hand-k.gif', IMG.gif, '')
  add('hand-l.bmp', IMG.bmp, '')
  add('hand-m.webp', IMG.webp, 'webp 头合法但像素数据为空（浏览器可能画不出来）')
  add('hand-n.ico', IMG.ico, '')
  add('hand-o.tiff', IMG.tiff, '只有 TIFF 头、无 IFD 的伪样本（真样本见 real-jpegexif.tiff）')
  add('hand-p.heic', IMG.heic, '')
  add('hand-q.avif', IMG.avif, '')
  add('hand-r.rtf', T('{\\rtf1\\ansi\\deff0 {\\fonttbl{\\f0 Arial;}}\\f0\\fs24 RTF 样本 hello}'), '')
  add('hand-rtf伪装.doc', T('{\\rtf1\\ansi RTF 内容但扩展名是 .doc}'), '**用户真实数据里就有这种文件**（data-files 里名为「RTF伪装.doc」）')
  add('hand-s.doc', OLE2, 'OLE2 头 + 无有效 WordDocument 流')
  add('hand-t.xls', OLE2, 'OLE2 头 + 无有效工作簿流')
  add('hand-u.ppt', OLE2, 'OLE2 头 + 无有效演示文稿流')
  add('hand-v.mp3', Buffer.concat([T('ID3'), Buffer.from([3, 0, 0, 0, 0, 0, 0]), Buffer.alloc(32)]), '')
  add('hand-w.mp4', Buffer.concat([Buffer.from('0000001c6674797069736f6d', 'hex'), Buffer.alloc(64)]), '')
  add('hand-x.wav', Buffer.concat([T('RIFF'), Buffer.from([36, 0, 0, 0]), T('WAVEfmt '), Buffer.alloc(32)]), '')
  add('hand-y.eml', T('From: a@example.com\r\nTo: b@example.com\r\nSubject: 邮件样本\r\n\r\n正文\r\n'), '')
  add('hand-z.msg', OLE2, 'OLE2 头（Outlook .msg 同族容器）')
  add('hand-aa.ipynb', T('{"cells":[],"metadata":{},"nbformat":4,"nbformat_minor":5}\n'), '其实是 JSON')
  add('hand-ab.log', T('[2026-09-20 10:00:00] 日志一行\n'), '')
  add('hand-ac.yaml', T('名称: 样本\n数量: 3\n'), '')
  add('hand-ad.yml', T('key: value\n'), '')
  add('hand-ae.toml', T('[表]\n键 = "值"\n'), '')
  add('hand-af.ini', T('[段]\n键=值\n'), '')
  add('hand-ag.sql', T('SELECT 1;\n'), '')
  add('hand-ah.py', T('print("hello")\n'), '')
  add('hand-ai.ts', T('const a: number = 1\nexport default a\n'), '')
  add('hand-aj.tsx', T('export const A = () => null\n'), '**不在**前端的可读文本清单里')
  add('hand-ak.js', T('export const a = 1\n'), '')
  add('hand-al.ps1', T('Write-Output "hi"\n'), '**不在**前端的可读文本清单里')
  add('hand-am.sh', T('echo hi\n'), '')
  add('hand-an.bat', T('@echo off\r\necho hi\r\n'), '')
  add('hand-ao.conf', T('server = on\n'), '**不在**前端的可读文本清单里')
  add('hand-ap.vue', T('<template><div/></template>\n'), '**不在**前端的可读文本清单里')
  add('hand-aq.go', T('package main\n'), '**不在**前端的可读文本清单里')
  add('hand-ar.rs', T('fn main() {}\n'), '**不在**前端的可读文本清单里')
  add('hand-as.env', T('KEY=value\n'), '**不在**前端的可读文本清单里')
  add('hand-at.7z', Buffer.concat([Buffer.from('377abcaf271c', 'hex'), Buffer.alloc(32)]), '')
  add('hand-au.rar', Buffer.concat([Buffer.from('526172211a0700', 'hex'), Buffer.alloc(32)]), '')
  add('hand-av.jsonl', T('{"a":1}\n{"a":2}\n'), '')
  add('hand-aw.markdown', T('# 另一个 markdown 扩展名\n'), '')
  add('hand-ax', T('没有扩展名的纯文本\n'), '')
  add('hand-ay.txt', T('带 空格 与中文 的文件名\n'), '')
}

/* ================= 2. 隔离实例 ================= */

function prepareRoot() {
  mkdirSync(join(TEST_ROOT, 'data'), { recursive: true })
  mkdirSync(join(TEST_ROOT, 'data-files', PROJECT), { recursive: true })
  /* 上一轮的样本要先清掉：/api/upload 对同名文件返回 409（不覆盖），
   * 不清就会「这一轮全没传上去、表里全是上一轮的结果」——这种假绿最危险。 */
  rmSync(join(TEST_ROOT, 'data-files', PROJECT, SUB), { recursive: true, force: true })
  /* /api/upload 不自动建子目录（「目标目录不存在」）——探针要测子路径，故先把目录建出来 */
  mkdirSync(join(TEST_ROOT, 'data-files', PROJECT, SUB), { recursive: true })
  /* scripts 也要链进来：.doc 的兜底链是 word-extractor → scripts/doc2md.py（Python）。
   * 不链它的话，探针测到的失败原因是「脚本不存在」，而不是真实部署里的原因。
   * ⚠ 本批实测发现本机的 python.exe 只是 Microsoft Store 的占位别名（没有真 Python），
   *   所以这条兜底在真机上同样跑不起来 —— 这正是矩阵里要继续如实记录的一环。 */
  for (const d of ['scripts']) {
    const link = join(TEST_ROOT, d)
    if (!existsSync(link)) {
      try { symlinkSync(join(ROOT, d), link, 'junction') } catch { /* 已存在 */ }
    }
  }
  for (const d of ['src', 'plugins', 'frontend', 'node_modules']) {
    const link = join(TEST_ROOT, d)
    if (!existsSync(link)) {
      try { symlinkSync(join(ROOT, d), link, 'junction') } catch { /* 已存在 */ }
    }
  }
}

let child = null
async function shutdown() {
  if (!child) return
  if (child.exitCode !== null || child.signalCode !== null) return
  const done = new Promise((r) => child.once('exit', r))
  child.kill()
  const to = await Promise.race([done.then(() => false), new Promise((r) => setTimeout(() => r(true), 1500))])
  if (to) { child.kill('SIGKILL'); await Promise.race([done, new Promise((r) => setTimeout(r, 1500))]) }
}

/* ================= 3. 主流程 ================= */

async function main() {
  await buildGenerated()
  buildCopiedReal()
  buildHandmade()
  log('样本数：' + SAMPLES.length)

  prepareRoot()
  process.env.PRIVHUB_TEST_BASE = 'http://127.0.0.1:' + PORT
  process.env.PRIVHUB_TEST_ROOT = TEST_ROOT

  child = spawn(process.execPath, ['--import', 'tsx/esm', 'src/main.ts', '--port', String(PORT)], {
    cwd: TEST_ROOT,
    env: { ...process.env, PRIVHUB_ROOT: TEST_ROOT, PRIVHUB_TEST_ROOT: TEST_ROOT },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.on('data', (d) => { if (process.env.PRIVHUB_TEST_VERBOSE) process.stdout.write('[server] ' + d) })
  child.stderr.on('data', (d) => { if (process.env.PRIVHUB_TEST_VERBOSE) process.stderr.write('[server:err] ' + d) })

  const lib = await import('./lib.mjs')
  if (!(await lib.waitForServer(60000))) { console.error('[matrix] 实例没起来'); await shutdown(); process.exit(1) }

  const token = await lib.loginOk('admin', 'admin123')
  log('已登录隔离实例 admin@' + PORT)

  /* 上传全部样本（真实接口，落盘加密） */
  for (const s of SAMPLES) {
    const r = await lib.uploadFile(token, PROJECT, SUB, s.name, s.buf)
    if (!r.json || !r.json.ok) out('[warn] 上传失败 ' + s.name + ' → ' + r.status + ' ' + String(r.text).slice(0, 120))
  }
  const listed = await lib.listDir(token, PROJECT, SUB)
  log('隔离实例里已列出 ' + listed.length + ' 个文件')

  /* 前端真身：utils.js 的 kindOf + content.js 的 loadContent 装进 vm，用真 HTTP 当 api 桩 */
  const stripMod = (src) => src
    .replace(/^import[\s\S]*?from\s+'[^']+'\s*$/gm, '')
    .replace(/^export\s*\{[\s\S]*?\}\s*$/m, '')
  const fe = (() => {
    const utils = stripMod(readFileSync(join(ROOT, 'plugins', 'privhub-files-explorer-v3', 'client', 'utils.js'), 'utf8'))
    const content = stripMod(readFileSync(join(ROOT, 'plugins', 'privhub-files-explorer-v3', 'client', 'content.js'), 'utf8'))
    const events = []
    const store = { tabs: [], activeKey: '', content: null }
    const bus = { on: () => () => {}, emit: (ev, p) => events.push({ ev, p }) }
    /* api 桩逐字对齐骨架 frontend/index.html:364-385（Bearer + res.json() + 非 JSON 归一） */
    const api = async (path) => {
      const r = await lib.GET(path, { token })
      try { return JSON.parse(r.text) } catch { return { ok: false, error: '服务器返回异常（HTTP ' + r.status + '）' } }
    }
    const K = { api, bus, store, TextEncoder, Date, Math, JSON, Object, Array, String, Number, Boolean, Error, Promise, RegExp, Map, Set, console }
    K.globalThis = K
    vm.createContext(K)
    vm.runInContext(utils + '\n' + content + '\nglobalThis.__fe = { kindOf, loadContent, rawUrl }', K, { filename: 'explorer-v3-fe.js' })
    return { ...K.__fe, store, events }
  })()

  // 真实接口逐个探
  const q = (extra) => '?project=' + encodeURIComponent(PROJECT) + '&path=' + encodeURIComponent(SUB + '/' + extra)
  const rows = []
  for (const s of SAMPLES) {
    const kind = fe.kindOf(s.name)
    const pv = await lib.GET('/privhub/api/preview' + q(s.name), { token })
    const off = await lib.GET('/privhub/api/office/read' + q(s.name), { token })
    const offp = await lib.GET('/privhub/api/office-preview' + q(s.name), { token })
    const raw = await lib.GET('/privhub/api/preview-raw' + q(s.name), { token })
    const o2 = await lib.GET('/privhub/api/office2/raw' + q(s.name), { token })

    /* 前端真身跑一遍：store.content 就是界面拿到的状态 */
    const key = PROJECT + '|' + SUB + '/' + s.name
    fe.store.tabs = [{ key, project: PROJECT, path: SUB + '/' + s.name, name: s.name, kind }]
    fe.store.content = null
    fe.events.length = 0
    await fe.loadContent(key)
    const c = fe.store.content || {}
    const branch = c.state === 'error' ? '错误提示行'
      : c.office ? 'office → v3-md 文本'
        : c.markdown !== undefined ? 'v3-md（Markdown 渲染）'
          : c.text !== undefined ? 'v3-text（纯文本只读）'
            : c.url ? (kind === 'image' ? 'img.v3-img（本轮起铺满）' : 'iframe.v3-pdf（本轮起铺满）')
              : '（无）'

    const ext = (s.name.split('.').pop() || '').toLowerCase()
    /* office 提取量：.doc 那条「解析失败却报 ok」的实锤就靠这一列（空白正文 = text 0 字） */
    const oc = off.json && off.json.ok ? off.json.content : null
    const extract = oc == null ? ''
      : typeof oc.text === 'string' ? 'text ' + oc.text.length + ' 字'
        : oc.slides ? 'slides ' + oc.slides.length
          : oc.sheets ? 'sheets ' + oc.sheets.length : ''
    /* 提取到的正文**开头**：.doc 那条「解析不了却报 ok」的实锤就靠这一列
     * （实测拿到的是 lib 的兜底提示文案，不是空字符串） */
    const extractHead = oc && typeof oc.text === 'string' ? oc.text.slice(0, 40).replace(/\s+/g, ' ') : ''
    const shown = typeof c.text === 'string' ? c.text.length + ' 字'
      : typeof c.markdown === 'string' ? c.markdown.length + ' 字' : ''
    let verdict = '✅能开'
    if (c.state === 'error') verdict = '❌打不开'
    else if (/^\[无法提取/.test(extractHead)) verdict = '⚠️降级（解析不出正文，界面显示兜底提示）'
    else if (kind === 'office' && ext !== 'docx' && ext !== 'xlsx') verdict = '⚠️降级（只出提取文本，无排版）'
    else if (ext === 'html' || ext === 'htm') verdict = '⚠️降级（出源码不渲染）'
    rows.push({
      name: s.name, ext, note: s.note, kind,
      preview: pv.json ? pv.json.type : ('HTTP ' + pv.status),
      office: off.json ? (off.json.ok ? 'ok kind=' + off.json.kind : 'fail: ' + off.json.error) : ('HTTP ' + off.status),
      extract, extractHead,
      officePreview: offp.json ? (offp.json.ok ? 'ok' : 'fail: ' + offp.json.error) : ('HTTP ' + offp.status),
      raw: raw.status + ' ' + (raw.headers['content-type'] || '') + ' ' + raw.buffer.length + 'B',
      office2raw: o2.json ? (o2.json.ok ? 'ok' : 'fail: ' + o2.json.error) : (o2.status + ' ' + o2.buffer.length + 'B'),
      state: c.state, branch, shown, msg: c.error || '', verdict,
      listedType: (listed.find((e) => e.name === s.name) || {}).type || '',
    })
  }

  /* ================= 4. 出表 ================= */
  out('')
  out('# 格式支持矩阵（真文件实测 · 隔离实例 127.0.0.1:' + PORT + ' · 根 ' + TEST_ROOT + '）')
  out('# 样本数 ' + SAMPLES.length + '；样本文件本身不落进仓库，由本脚本现场生成')
  out('# kindOf() 与前端状态两列跑的是前端**真身**（utils.js / content.js 装进 vm，api 桩打真 HTTP）')
  out('')
  out('| # | 文件 | 扩展名 | kindOf() | /preview type | /office/read | office 提取量 | 提取正文开头 | /office-preview | /preview-raw | /office2/raw | 前端状态 | 前端正文 | 前端渲染分支 | 判定 |')
  out('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
  rows.forEach((r, i) => {
    out('| ' + (i + 1) + ' | ' + r.name + ' | .' + r.ext + ' | ' + r.kind + ' | ' + r.preview + ' | ' + r.office + ' | ' + r.extract + ' | ' + r.extractHead + ' | ' + r.officePreview + ' | ' + r.raw + ' | ' + r.office2raw + ' | ' + r.state + (r.msg ? '（' + r.msg + '）' : '') + ' | ' + r.shown + ' | ' + r.branch + ' | ' + r.verdict + ' |')
  })

  /* 分组统计 */
  out('')
  out('## 判定分布')
  const byVerdict = {}
  for (const r of rows) (byVerdict[r.verdict] = byVerdict[r.verdict] || []).push('.' + r.ext)
  for (const k of Object.keys(byVerdict).sort()) out('- ' + k + '（' + byVerdict[k].length + '）：' + byVerdict[k].join(' '))

  out('')
  out('## 逐条备注（样本怎么造的 / 为什么这么判）')
  for (const r of rows) if (r.note) out('- ' + r.name + '：' + r.note)

  const jsonOut = OUT_FILE.replace(/\.txt$/, '.json')
  writeFileSync(jsonOut, JSON.stringify(rows, null, 2), 'utf8')

  await shutdown()

  /* 收尾：打印失败清单（供报告直接引用） */
  out('')
  out('## 打不开（❌）清单')
  for (const r of rows) if (r.verdict.startsWith('❌')) out('- .' + r.ext + ' — ' + r.msg)
  out('')
  out('## 降级（⚠️）清单')
  for (const r of rows) if (r.verdict.startsWith('⚠️')) out('- .' + r.ext + ' — ' + r.verdict)

  writeFileSync(OUT_FILE, lines.join('\n') + '\n', 'utf8')
  console.log('[matrix] 结果已写入 ' + OUT_FILE + ' 与 ' + jsonOut)
}

main().catch(async (e) => { console.error('[matrix] 异常：', e); await shutdown(); process.exit(1) })
process.on('SIGINT', async () => { await shutdown(); process.exit(130) })
