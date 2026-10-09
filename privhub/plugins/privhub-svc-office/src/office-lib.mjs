/**
 * Office 读写库（纯 ESM，供 privhub-svc-office 动态 import）
 *
 * 读：
 *   - readDocx：mammoth → { text, html }
 *   - readDoc：word-extractor（主路）→ piece 表直读（跳过上游会误抹正文的修订标记处理）
 *              → Python 兜底 → 如实报错；**失败一律 `ok:false` + 原因码**，不用文案冒充正文
 *   - readXlsx：exceljs → { sheets: [{ name, rows, totalRows, totalCols, truncatedRows, truncatedCols }] }
 *              （行列上限保护；**超上限回带真实总数**，界面据此明说，不再静默截断）
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
/* word-extractor 的正文清理（映射 Word 的标记字符、拆域代码、剥控制符）。
 * 单独引它的内部模块只有一个原因：本文件自己解 piece 表时要产出**与主路逐字一致**的正文
 * （见 `parseWordPieceText`）。它对上游的依赖点就这两个纯函数，不是"顺手用一下"。 */
import wxFilters from 'word-extractor/lib/filters.js'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'

/* 表格行列上限（读**和**写共用同一组常量：读得回多少，就写得回多少）。
 *
 * `MAX_ROWS` 1000 → 10000（2026-10-09 修）：
 * 现场来历 —— 用户实测 `data-files/A项目/_内联_…/2026年9月28日-9月30日排播表.xlsx`
 * 的「排播」表**确有 3320 行**（`ws.rowCount`，实测），而旧上限一到 `eachRow` 回调就 `return`，
 * **既不报错也不提示** ⇒ 界面看起来"表格只有 1000 行"。这就是那句
 * 「表格只能显示1000行，更多的没有显示」的来历。
 * 现在：抬到 10000（覆盖实测数据 3 倍余量），并且**超过就明说** ——
 * `readXlsx` 回带 `totalRows/totalCols/truncatedRows/truncatedCols`，
 * 由前端 `officeToMd` 附一句「仅显示前 N 行（本表共 M 行）」。**静默截断才是病**，上限本身不是。
 * 为什么不是"无上限"：xlsx 走的是 markdown 表格渲染（无分页、无虚拟滚动），
 * 一万行 × 60 列已经是这套渲染的实际上限。要更大就得先有分页/网格渲染器。
 * 注：`.xls` 不在读取链里（见 privhub-core/src/file-exts.ts 文件头）；这里的上限只管 xlsx。 */
const MAX_ROWS = 10000
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

/* ══════════════════════════════════════════════════════════════════════════
 * `.doc` 正文直读（**跳过"修订标记"处理**）—— 2026-10-09 新增
 *
 * ## 为什么自己要再解一遍 piece 表
 *
 * `word-extractor@1.0.4`（已是最后一版，无升级可修）在 `writeCharacterProperties` 里
 * 只判 `sprm & 0x1f === 0` 就把该段文字当成**"已删除的修订内容"**，整段抹成 `\x00`；
 * 随后 `clean()` 把 `\x00` 剥掉 ⇒ `getBody()` 空。**它没有校验 sgc**（真正的
 * sprmCFRMarkDel 是 sgc=frcChp），所以某些文档的**整篇正文**会被误判成"删除"。
 *
 * 本机实测（2026-10-09，用户数据 `data-files/AI小说研究/参考文/2.男频小说投稿信誉网站.doc`，
 * Word 97 二进制 59904 字节，nFib=193、fComplex 置位）：
 *   ① piece 表解出的正文 **5041 字完全正确**（首句「2.男频小说（买断/分成）投稿信誉网站」）；
 *   ② 同一段经 `writeCharacterProperties` 之后变成 5041 个 `\x00`；
 *   ③ 剥掉后只剩 `"\n\n"` ⇒ `getBody()` 空 ⇒ 界面无预览（用户报的「.doc 文件没有预览」）。
 *
 * 所以这里自己按 [MS-DOC] 解 FIB + Clx（**只取 piece 表**，不跑任何"按修订/域标记改写正文"
 * 的步骤）。容器仍交给 word-extractor 的 OLE 读取器 —— 容器读取与 piece 表解析这两件事
 * 上游都是对的，被跳过的是那几步"改写正文"。
 *
 * ## 代价（**明说**，不藏）
 *
 * 被标记为"删除"的修订文字**会显示出来**。预览场景下这比"整篇什么都没有"好，
 * 但它**不是"接受修订后的定稿"**——要定稿请在 Word/WPS 里另存为 docx 后上传。
 * 本函数**只在**主路（①）拿不到正文时才被调用，所以对能正常读的 .doc 一个字节都不影响。
 *
 * 完整取证（含阴性对照与真件端到端原始输出）见 `docs/reviews/16-表格行上限与doc正文直读.md`。
 * ══════════════════════════════════════════════════════════════════════════ */

/** 把一个 OLE 流读成 Buffer（word-extractor 的流是 Readable，只给事件接口）。 */
function readOleStream(stream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    stream.on('data', (c) => chunks.push(c))
    stream.on('error', reject)
    stream.on('end', () => resolve(Buffer.concat(chunks)))
  })
}

/**
 * 从 FIB（`WordDocument` 流）与 table 流里按 **piece 表**取正文。
 *
 * **纯函数：两个 Buffer 进、字符串出**，不碰文件系统、不读环境 ——
 * 于是可以用合成样本直接断言它认不认得 [MS-DOC] 的结构（`tests/office-doc.mjs` ⑦ 组）。
 *
 * 认得的形状（[MS-DOC] 2.4.1 / 2.8.1 / 2.15.1）：
 *   · FIB 头 `0xa5ec`（wIdent）、`ccpText`(0x4C)、`fcClx`(0x1A2)、`lcbClx`(0x1A6)；
 *   · `Clx` = `Prc*`（flag=0x01：1 + 2 字节 cbGrpprl + cbGrpprl，跳过）+ `Pcdt`（flag=0x02 + 4 字节 lcb + PlcPcd）；
 *   · `PlcPcd` = (n+1) 个 CP + n 个 8 字节 PCD（2 字节 flag + 4 字节 fc + 2 字节 prm）；
 *   · `fc` 的 bit30：**置位 = 每字符 1 字节**（此时存的是真实字节偏移 ×2，需 CP1252 补表），
 *     清零 = UTF-16LE。
 * 任何一处对不上就回 `''`：**不猜、不抛** —— 调用方据此继续走后面的链（python 兜底 / 如实报错）。
 * 正文按 `ccpText` 截断：piece 表里正文之外还有脚注/页眉等段落，它们不是正文。
 */
export function parseWordPieceText(wordBuf, tableBuf) {
  if (!Buffer.isBuffer(wordBuf) || !Buffer.isBuffer(tableBuf)) return ''
  if (wordBuf.length < 0x01aa || wordBuf.readUInt16LE(0) !== 0xa5ec) return ''
  const ccpText = wordBuf.readUInt32LE(0x4c)
  const fcClx = wordBuf.readUInt32LE(0x01a2)
  const lcbClx = wordBuf.readUInt32LE(0x01a6)
  if (!ccpText || !lcbClx) return ''
  if (fcClx + lcbClx > tableBuf.length) return ''

  /* Clx：[Prc]* 然后 Pcdt —— 先跳过所有 Prc */
  const clxEnd = fcClx + lcbClx
  let pos = fcClx
  while (pos < clxEnd) {
    const flag = tableBuf.readUInt8(pos)
    if (flag === 0x01) {
      if (pos + 3 > clxEnd) return ''
      pos += 3 + tableBuf.readUInt16LE(pos + 1)
      continue
    }
    if (flag !== 0x02) return ''
    break
  }
  if (pos + 5 > clxEnd || tableBuf.readUInt8(pos) !== 0x02) return ''
  const lcb = tableBuf.readUInt32LE(pos + 1)
  const plcStart = pos + 5
  /* PlcPcd 的长度必须是 (n+1)*4 + n*8（n ≥ 1）—— 不满足就是别的东西，不猜 */
  if (lcb < 16 || (lcb - 4) % 12 !== 0 || plcStart + lcb > tableBuf.length) return ''
  const n = (lcb - 4) / 12
  const cpAt = (i) => tableBuf.readUInt32LE(plcStart + i * 4)
  const pcdFcAt = (i) => tableBuf.readUInt32LE(plcStart + (n + 1) * 4 + i * 8 + 2)

  const parts = []
  let total = 0
  for (let i = 0; i < n && total < ccpText; i++) {
    const chars = cpAt(i + 1) - cpAt(i)
    if (chars <= 0) continue
    const rawFc = pcdFcAt(i)
    const compressed = (rawFc & 0x40000000) !== 0
    const fc = compressed ? Math.floor((rawFc & 0x3fffffff) / 2) : (rawFc & 0x3fffffff)
    const bytes = chars * (compressed ? 1 : 2)
    if (fc + bytes > wordBuf.length) return ''
    const seg = wordBuf.subarray(fc, fc + bytes)
    parts.push(compressed ? wxFilters.binaryToUnicode(seg.toString('binary')) : seg.toString('ucs2'))
    total += chars
  }
  const text = parts.join('').slice(0, ccpText)
  /* 与主路逐字一致：`buildDocument` 用 clean()，`getBody()` 再叠一层 filter() */
  return wxFilters.filter(wxFilters.clean(text))
}

/**
 * 打开 OLE 容器（用 word-extractor 的读取器）、取出两个流、交给 `parseWordPieceText`。
 * 任何一步失败都回 `''`（由调用方继续走后面的链），**不抛**。
 */
async function readDocPieceText(buf) {
  const [{ default: OleCompoundDoc }, { default: BufferReader }] = await Promise.all([
    import('word-extractor/lib/ole-compound-doc.js'),
    import('word-extractor/lib/buffer-reader.js'),
  ])
  const ole = await new OleCompoundDoc(new BufferReader(buf)).read()
  const wordBuf = await readOleStream(ole.stream('WordDocument'))
  if (wordBuf.length < 0x01aa || wordBuf.readUInt16LE(0) !== 0xa5ec) return ''
  /* 用哪个 table 流由 FIB 的 fWhichTblStm（0x0A 的 bit 0x0200）决定 */
  const tableBuf = await readOleStream(ole.stream((wordBuf.readUInt16LE(0x0a) & 0x0200) ? '1Table' : '0Table'))
  return parseWordPieceText(wordBuf, tableBuf)
}

/**
 * 旧版 Word `.doc` → `{ text }`（成功）或 `{ ok:false, reason, detail }`（**失败，如实报**）。
 *
 * 四级：① word-extractor（纯 JS，真 .doc 走这条）
 *      ①b piece 表直读（跳过上游会误抹正文的修订标记处理 —— 见本节上方那段来历）
 *      ② Python `scripts/doc2md.py`（本机不可用，预留真 Python 环境）
 *      ③ 不再有第三级文案 —— 失败就是失败。
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

  /* ①b piece 表直读：主路拿不到正文时再试一次。
   * 上游把"整篇都是修订删除内容"当真的那类文件，正文其实**好好地在 piece 表里**
   * （见本节上方的实测来历）。这一步只对真 Word 二进制有意义，所以
   * 非 OLE2 的假 .doc（RTF/纯文本/空容器）在这里**照样失败并继续往下走**，
   * 原因码不变（② 组断言的"四条假样本原因一致"因此不受影响）。 */
  let pieceError = ''
  try {
    const text = (await readDocPieceText(buf)).trim()
    if (text) return { text }
  } catch (e) {
    pieceError = (e && e.message) ? String(e.message) : String(e)
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
  /* 两级的原话都带上（排查用）：主路 + piece 表直读。用户看的是 reason 映射出来的那句话。 */
  const pieceNote = '；piece 表直读：' + (pieceError || '没有取到正文')
  return {
    ok: false,
    reason: notWordBinary ? (py.broken ? 'capability-broken' : 'capability-missing') : 'parse-failed',
    detail: notWordBinary
      ? '该文件不是有效的旧版 Word 二进制（word-extractor：' + extractorError + pieceNote + '）；'
        + '本机又没有可用的 Python 转换能力来兜底（' + (py.detail || '未探测到') + '）'
      : '解析失败（' + extractorError + pieceNote + '）',
  }
}

/** docx → { text, html } */
export async function readDocx(buf) {
  const r = await mammoth.convertToMarkdown({ buffer: buf })
  const text = r.value || ''
  return { text, html: r.messages.length ? '' : undefined }
}

/** xlsx → { sheets: [{ name, rows, totalRows, totalCols, truncatedRows, truncatedCols }] }
 *
 *  截断**不再静默**：超过上限时 `rows` 只留前 `MAX_ROWS` 行，同时回带
 *  `totalRows`（本表实际行数）与 `truncatedRows: true`（列同理），界面据此**明说**
 *  「仅显示前 N 行（本表共 M 行）」。旧行为是到 1000 行就 `return`、什么都不说 ——
 *  用户看到的就是"这张表只有 1000 行"（见上方 `MAX_ROWS` 常量的来历）。 */
export async function readXlsx(buf) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buf)
  const sheets = []
  for (const ws of wb.worksheets) {
    const rows = []
    /* 本表实际规模（`rowCount`/`columnCount` 是 exceljs 给的**原始**范围，
     *  不受下面截断影响 —— 正因为要如实报总数，才不能拿 `rows.length` 当总数）。 */
    const totalRows = ws.rowCount || 0
    const totalCols = ws.columnCount || 0
    let truncatedRows = false
    ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (rowNumber > MAX_ROWS) { truncatedRows = true; return }
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
    sheets.push({ name: ws.name, rows, totalRows, totalCols, truncatedRows, truncatedCols: totalCols > MAX_COLS })
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
