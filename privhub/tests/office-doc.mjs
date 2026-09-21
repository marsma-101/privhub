/**
 * `.doc`「解析失败却报成功」的回归断言 + Office 扩展名族收敛的防漂移断言
 *
 * ## 这个文件治的是什么病
 *
 * 两件事，都是上一批查出来、留给本批的：
 *
 * **① 「解析失败却报成功」（`docs/reviews/11-格式支持矩阵与铺满修复.md` §2.5 ②）**
 *   迁前 `privhub-svc-office/src/office-lib.mjs` 的 `readDoc` 是三级链
 *   （word-extractor → Python 兜底 `scripts/doc2md.py` → **兜底文案**）：
 *   三级全失败时它回 `{ text: '[无法提取 DOC 文本]（请用 Word/WPS 打开后另存为 docx 再上传）' }`
 *   ⇒ `svc-office.read()` 回 `ok:true` ⇒ `/api/office/read` 回 200 + `ok:true`
 *   ⇒ **界面把这句提示当正文渲染**。用户看到的就是"这份文档里只有一行字"。
 *   本批起：拿不到正文一律 `ok:false` + **可区分的原因码**，界面照实报错。
 *
 * **② Office 扩展名族有 4 处同族副本、且已经不一致**
 *   后端 `svc-office` 是 5 项（不含 `xls`/`ppt`），前端两份是 6/7 项（含它们）。
 *   本批收敛成「一处定义（`privhub-core/src/file-exts.ts`）+ 各处显式派生」，
 *   并把「读取链」与「家族」拆成两个集合（口径见该文件头「Office 那一族的口径」）。
 *
 * ## 六组断言（前三组在进程内、④⑤组起隔离实例，⑥组把前端真身装进 vm）
 *
 *   ① **口径**：共享集合的取值与关系（读取链 5 项、家族 = 读取链 ∪ {xls,ppt}）；
 *   ② **`readDoc` 的三态**：假 `.doc`（RTF 伪装 / 空 OLE2 / 纯文本伪装）**一律失败**且**带原因**，
 *      绝不返回 `text`；反面守一条：**不出现**迁前那句兜底文案（源码 + 行为双查）；
 *   ③ **`svc-office.read()` 的契约**：`.doc` 失败 ⇒ `ok:false` + `reason`；
 *      别的 kind 仍 `ok:true`（**不许因为本批改动把正常路径弄丢**）；
 *   ④ **端到端（隔离实例 3198，真上传真接口）**：假 `.doc` ⇒ HTTP 400 / `ok:false` / 有原因；
 *      真 `.docx`/`.xlsx`/`.pdf` ⇒ HTTP 200 / `ok:true` / 正文照回（**回归保护**）；
 *   ⑤ **前端不把提示句当正文**：把 `content.js` **真身**装进 vm，喂一个「迁前那种」回包
 *      （`ok:true` + 兜底文案）与一个「现在这种」回包（`ok:false` + 原因），
 *      验两条都不产出"提示句正文"、错误态给的是后端的 `error`；
 *   ⑥ **防漂移**：4 处副本收敛后的样子（谁再写一份手写清单，这里 + `file-exts.mjs` ④ 组会红）。
 *
 * ## 阴性对照（真实输出贴在本批报告 `docs/reviews/13-…md` 里）
 *   · 把 `readDoc` 改回"失败兜底成那句文案 + ok:true" ⇒ ②③④⑥ 变红；
 *   · 在 `files-office/src/index.ts` 里再塞一份手写 Office 清单 ⇒ ⑥ 与 `file-exts.mjs` ④ 组变红。 *
 *   node tests/office-doc.mjs          （需要 tsx：它 import 那份 .ts；run-all 已按脚本名放行）
 *
 * @module tests/office-doc
 */

import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync, mkdirSync, rmSync, readFileSync, readdirSync, writeFileSync, lstatSync, unlinkSync, symlinkSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
/** 端口不与既有套件冲突：3190(run-all) / 3193(matrix) / 3195(rag) / 3196(preview-limits) / 3197(file-exts) */
const PORT = Number(process.env.PRIVHUB_DOCTEST_PORT || 3198)
const BASE = `http://127.0.0.1:${PORT}`
const TESTROOT = join(HERE, '.testroot-office-doc')
const PROJECT = '公共'

let pass = 0
let fail = 0
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✅ ' + msg) } else { fail++; console.log('  ❌ ' + msg) }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const fmt = (a) => a.join(',')

/* ══════════════════════════════════════════════════════════════════════════
 * 样本：**自己造的**假 .doc（不碰 data-files/ 里那 42 个真件，也不需要 Word）
 * ══════════════════════════════════════════════════════════════════════════ */

/** OLE2 复合文档头（旧版 Office 的容器标志）+ 零填充：**有头没有内容**，
 *  正是上一批矩阵里 `hand-s.doc` 那一种（`docs/reviews/11-…md` §2.5 ②）。 */
const OLE2_EMPTY = Buffer.concat([Buffer.from('d0cf11e0a1b11ae1', 'hex'), Buffer.alloc(504)])
/** RTF 内容但扩展名是 .doc —— 用户真实数据里就有这种文件（`data-files` 里的「RTF伪装.doc」）。 */
const RTF_DISGUISED = Buffer.from('{\\rtf1\\ansi\\deff0 这是 RTF 正文，扩展名却是 .doc}', 'utf8')
/** 纯文本伪装成 .doc。 */
const TEXT_DISGUISED = Buffer.from('这其实是一个纯文本文件，只是扩展名写成了 .doc\n', 'utf8')
/** HTML 伪装成 .doc。 */
const HTML_DISGUISED = Buffer.from('<!doctype html><html><body><h1>HTML 伪装</h1></body></html>', 'utf8')

/** 迁前那句"兜底文案"的**特征片段**（断言只认它，不认整句 —— 文案将来可以改字，
 *  但"把提示句塞进正文字段"这件事一出现就必须红）。 */
const LEGACY_FALLBACK_MARK = '无法提取 DOC 文本'

const DOC_SAMPLES = [
  ['OD假样本-rtf伪装.doc', RTF_DISGUISED, 'RTF 内容 + .doc 扩展名（用户数据里真实存在的那一类）'],
  ['OD假样本-空OLE2.doc', OLE2_EMPTY, 'OLE2 头但无内容（上一批矩阵 hand-s.doc 那一种）'],
  ['OD假样本-纯文本.doc', TEXT_DISGUISED, '纯文本伪装'],
  ['OD假样本-html伪装.doc', HTML_DISGUISED, 'HTML 伪装'],
]

/* ══════════════════════════════════════════════════════════════════════════
 * ① 口径：共享集合的取值与关系
 * ══════════════════════════════════════════════════════════════════════════ */

console.log('══ ① Office 口径（一处定义：`privhub-core/src/file-exts.ts`）══')

const EXTS_FILE = join(ROOT, 'plugins', 'privhub-core', 'src', 'file-exts.ts')
const exts = await import(pathToFileURL(EXTS_FILE).href)
const { OFFICE_EXTS, OFFICE_FAMILY_EXTS, OFFICE_EXTRACT_ONLY_EXTS, isOfficeReadExt, isOfficeFamilyExt, officeKindOf, union } = exts

console.log('     [派生式] OFFICE_EXTS            = ' + fmt(OFFICE_EXTS))
console.log('     [派生式] OFFICE_FAMILY_EXTS     = ' + fmt(OFFICE_FAMILY_EXTS))
console.log('     [派生式] OFFICE_EXTRACT_ONLY_EXTS = ' + fmt(OFFICE_EXTRACT_ONLY_EXTS))

ok(fmt(OFFICE_EXTS) === 'doc,docx,xlsx,pptx,pdf',
  '读取链集合逐项同值（5 项：' + fmt(OFFICE_EXTS) + '）—— 与迁前 `svc-office` 的取值一致，本批**没有**顺手扩权')
ok(fmt(OFFICE_FAMILY_EXTS) === 'doc,docx,xlsx,pptx,pdf,xls,ppt',
  '家族集合 = 读取链 ∪ {xls,ppt}（7 项：' + fmt(OFFICE_FAMILY_EXTS) + '）—— 这是"用户会当成 Office"的那一批')
ok(OFFICE_FAMILY_EXTS.filter((e) => !OFFICE_EXTS.includes(e)).join(',') === 'xls,ppt',
  '家族与读取链的**差集恰好是 xls,ppt**（把"多出来的两项是谁"钉死：多一项或漏一项都红）')
ok(!OFFICE_EXTS.includes('xls') && !OFFICE_EXTS.includes('ppt') && !OFFICE_EXTS.includes('xlsx2'),
  '`xls`/`ppt` **不在**读取链集合里（`.ppt` 全仓无人能读；`.xls` 只在 `files-office` 的提取链上）')
ok(isOfficeReadExt('.DOC') && isOfficeReadExt('pdf') && !isOfficeReadExt('xls') && !isOfficeReadExt('ppt'),
  '判定入口 `isOfficeReadExt`：大小写与前导点稳健，`xls`/`ppt` 明确为 false')
ok(isOfficeFamilyExt('xls') && isOfficeFamilyExt('.PPT') && !isOfficeFamilyExt('docx2'),
  '判定入口 `isOfficeFamilyExt`：家族判定含 xls/ppt，且不误判相近名字')
ok(officeKindOf('DOCX') === 'docx' && officeKindOf('.xls') === 'unknown' && officeKindOf('txt') === 'unknown',
  '判定入口 `officeKindOf`：读取链成员回自身、其余回 unknown（`svc-office.kindOf` 用的就是它）')
ok(union(OFFICE_EXTS, OFFICE_EXTRACT_ONLY_EXTS).join(',') === 'doc,docx,xlsx,pptx,pdf,xls',
  '`files-office` 提取链的清单 = 读取链 ∪ {xls}（`.ppt` 谁都不读，故不在其中）')

/* ══════════════════════════════════════════════════════════════════════════
 * ② `readDoc` 的三态：失败必须**明说失败**，且**带原因**
 * ══════════════════════════════════════════════════════════════════════════ */

console.log('\n══ ② `.doc` 解析失败：不再有"兜底文案冒充正文"（进程内直调真身）══')

const LIB_FILE = join(ROOT, 'plugins', 'privhub-svc-office', 'src', 'office-lib.mjs')
const lib = await import(pathToFileURL(LIB_FILE).href)
const LIB_SRC = readFileSync(LIB_FILE, 'utf8')

ok(typeof lib.readDoc === 'function', '`readDoc` 仍导出（本批只改它的返回约定，没有换函数名）')

/* 源码层：那句兜底文案**代码里不能再出现**（它在迁前就是这个 bug 的载体）。
 * 注意：**注释里可以提它** —— 说明"原来是怎么错的"需要一个可指认的原话，
 * 所以这里只扫**去掉注释后的代码**（否则注释也会被算成"还留着"，那种断言会逼人不敢写注释）。 */
const LIB_CODE = LIB_SRC.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n')
ok(!LIB_CODE.includes(LEGACY_FALLBACK_MARK),
  '`office-lib.mjs` 的**代码里**不再出现「' + LEGACY_FALLBACK_MARK + '」这句兜底文案（注释里讲来历不算；贴回代码必红）')
ok(/ok:\s*false/.test(LIB_SRC) && /reason/.test(LIB_SRC),
  '`readDoc` 的失败分支回 `ok:false` + `reason`（可区分的原因码）')
/* 本批要害的一句话（**阴性对照 NC1 直接打这条**）：
 * 迁前失败时返回的是 `{ text: '<兜底提示句>' }`，`svc-office.read()` 见它没有 `ok:false`
 * 就当成成功 ⇒ HTTP 200 + ok:true + 界面把提示句当正文。这条断言把那个形状本身钉死。 */
ok(!/return\s*\{\s*text:\s*'[^']*无法提取/.test(LIB_CODE) && !/return\s*\{\s*text:\s*"[^"]*无法提取/.test(LIB_CODE),
  '失败分支**不允许**返回「只有 text、且 text 是兜底提示句」这种形状（＝"解析失败却报成功"的病根）')

/* 能力探测：本机是"没有可用转换能力"还是"有但坏了"，两种情况都要能落到 reason 上 */
const conv = await lib.docConverterStatus()
console.log('     [实测] docConverterStatus = ' + JSON.stringify(conv))
ok(conv.ok === true || conv.reason === 'capability-missing' || conv.reason === 'capability-broken',
  '能力探测给出明确结论（' + (conv.ok ? '有可用的 ' + conv.cmd : conv.reason) + '）—— 本机实测**没有**真 Python，故是 capability-*')

const seenReasons = []
for (const [name, buf, note] of DOC_SAMPLES) {
  const t0 = Date.now()
  const r = await lib.readDoc(buf)
  const ms = Date.now() - t0
  const noText = !(r && typeof r.text === 'string')
  const hasReason = !!(r && r.ok === false && typeof r.reason === 'string' && r.reason)
  const noFallback = !(r && typeof r.text === 'string' && r.text.includes(LEGACY_FALLBACK_MARK))
  if (hasReason) seenReasons.push(r.reason)
  console.log('     [实测] ' + name.padEnd(24) + ' ' + String(buf.length).padStart(5) + 'B → ' +
    JSON.stringify({ ok: r.ok, reason: r.reason, hasText: typeof r.text === 'string' }) + ' (' + ms + 'ms)')
  ok(noText && hasReason && noFallback,
    `假 .doc「${name}」（${note}）⇒ **没有正文、回带原因、且不含兜底文案**（实测 reason=${r.reason}）`)
}
ok(seenReasons.length > 0 && new Set(seenReasons).size === 1 && seenReasons[0] !== 'empty',
  '四条假样本的原因码一致且不是 `empty`（本机同一个原因：Word 二进制解析器不认 + Python 兜底不可用 ⇒ 实测 ' + seenReasons[0] + '）')
ok(seenReasons.every((x) => ['capability-missing', 'capability-broken', 'parse-failed', 'python-failed'].includes(x)),
  '原因码落在约定的取值集合里（capability-missing / capability-broken / parse-failed / python-failed）')

/* 本机事实：没有真 Python ⇒ 原因必须是"缺能力"这一类，而不是含糊的"解析失败" */
const firstReason = seenReasons[0] || '(没有原因码)'
ok(conv.ok === false ? firstReason.startsWith('capability-') : true,
  '本机没有可用转换能力时，假 .doc 的原因落在 `capability-*`（让用户知道"不是这个文件的问题，是这台机器缺能力"）')
ok(!seenReasons.includes('empty'), '四条假样本都不是"空文档"（`empty` 只留给真能解析、但确实没正文的文件）')

/* ══════════════════════════════════════════════════════════════════════════
 * ③ `svc-office.read()` 的契约：失败 ⇒ ok:false + reason；正常 kind 不受影响
 * ══════════════════════════════════════════════════════════════════════════ */

console.log('\n══ ③ `svc-office.read()` 契约（失败与成功必须真的分开）══')

/* 驱动**真身的方法**（不是复制一份逻辑）：`OfficeService` 继承 cordis 的 `Service`，
 * 构造函数要一个真 `ctx`（注册服务用），但 `read()` 本身只用到
 * `this.ctx.privhub.resolveReal` 与 `this.ctx.storage.readBuffer` 两个注入点。
 * ⇒ 这里用 `Object.create(prototype)` 造一个**未注册的实例**、手工挂 `ctx`，
 *   于是断言打的是产品代码里那个 `read()`，而不是测试里另写一遍的分支逻辑。 */
import { OfficeService } from '../plugins/privhub-svc-office/src/index.ts'

let storedBuf = RTF_DISGUISED
function makeSvc(over = {}) {
  const s = Object.create(OfficeService.prototype)
  s.ctx = {
    privhub: { resolveReal: async () => '/fake/path' },
    storage: { readBuffer: async () => storedBuf },
    ...over,
  }
  return s
}
const svc = makeSvc()

/* sanit 自证：真的走通了产品代码（不是"方法没挂上、断言假绿"） */
ok(typeof svc.kindOf === 'function' && svc.kindOf('a.doc') === 'doc',
  '未注册实例上的 `read()/kindOf()` 确实来自 `OfficeService.prototype`（否则下面几条是假绿）')

for (const [name, buf] of [['OD假样本-rtf伪装.doc', RTF_DISGUISED], ['OD假样本-空OLE2.doc', OLE2_EMPTY]]) {
  storedBuf = buf
  const r = await svc.read(PROJECT, name)
  console.log('     [实测] read(' + name + ') = ' + JSON.stringify({ ok: r.ok, kind: r.kind, reason: r.reason, error: (r.error || '').slice(0, 60) + '…' }))
  ok(r.ok === false && r.kind === 'doc' && typeof r.reason === 'string' && r.reason && typeof r.error === 'string' && r.error,
    `\`read('${name}')\` ⇒ ok:false + kind:'doc' + reason + 中文 error（**不再**是 ok:true + 兜底文案）`)
  ok(!('content' in r) && !(r.error || '').includes(LEGACY_FALLBACK_MARK),
    `失败回包里既没有 content、也没有那句兜底文案（实测 error=${JSON.stringify((r.error || '').slice(0, 40))}…）`)
}

/* 失败的可区分性：不支持的扩展名 / 读取失败 / 解析失败 三类原因**互不相同** */
storedBuf = Buffer.from('x')
const rUnsup = await svc.read(PROJECT, 'a.xls')
ok(rUnsup.ok === false && rUnsup.reason === 'unsupported-type' && rUnsup.error.includes('.xls'),
  '不支持的扩展名（`.xls`）⇒ reason=unsupported-type（与"解析失败"分开）')
const rNone = await makeSvc({ storage: { readBuffer: async () => null } }).read(PROJECT, 'b.doc')
ok(rNone.ok === false && rNone.reason === 'read-failed',
  '读不出字节 ⇒ reason=read-failed（与"解析失败"分开）')

/* 反面：**不许**把正常路径一起改坏 —— docx/xlsx/pptx/pdf 仍必须 ok:true 且有 content */
storedBuf = Buffer.from('not really a docx')
const rDocx = await svc.read(PROJECT, 'c.docx')
ok(rDocx.ok === false && rDocx.kind === 'docx' && rDocx.reason === 'parse-failed',
  '真·解析异常（坏的 docx）仍回 ok:false + reason=parse-failed（异常没被吞掉）')
const rPdf = await svc.read(PROJECT, 'd.pdf')
ok(rPdf.ok === false && rPdf.kind === 'pdf',
  '坏的 pdf 同样如实失败（这四个 kind 的 ok 语义与 .doc 一致：拿不到正文就不许说成功）')
ok(svc.kindOf('/x/y/report.doc') === 'doc' && svc.kindOf('a.XLSX') === 'xlsx' && svc.kindOf('a.xls') === 'unknown',
  '`kindOf` 用共享判定入口：读取链 5 项认得、`.xls` 不认（大小写稳健）')

/* ══════════════════════════════════════════════════════════════════════════
 * ④ 端到端（隔离实例 3198）：真上传、真接口
 * ══════════════════════════════════════════════════════════════════════════ */

console.log('\n══ ④ 端到端：假 .doc 如实报错 / 真 Office 文件照常能读（隔离实例，不碰真实数据）══')

function cleanRoot() {
  if (!existsSync(TESTROOT)) return
  for (const d of ['src', 'plugins', 'frontend', 'node_modules']) {
    const link = join(TESTROOT, d)
    try { if (existsSync(link) && lstatSync(link).isSymbolicLink()) unlinkSync(link) } catch { /* 忽略 */ }
  }
  try { rmSync(TESTROOT, { recursive: true, force: true }) } catch { /* 忽略 */ }
}

function prepareRoot() {
  cleanRoot()
  mkdirSync(join(TESTROOT, 'data-files', PROJECT), { recursive: true })
  for (const d of ['src', 'plugins', 'frontend', 'node_modules']) {
    const link = join(TESTROOT, d)
    try { if (!existsSync(link)) symlinkSync(join(ROOT, d), link, 'junction') } catch { /* 已存在或权限不足 */ }
  }
}

function startServer() {
  return spawn(process.execPath, ['--import', 'tsx/esm', 'src/main.ts', '--port', String(PORT)], {
    cwd: TESTROOT,
    env: { ...process.env, PRIVHUB_ROOT: TESTROOT, PRIVHUB_TEST_ROOT: TESTROOT },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

async function stopServer(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return
  const done = new Promise((r) => child.once('exit', r))
  child.kill()
  const t = await Promise.race([done.then(() => false), new Promise((r) => setTimeout(r, 2000))])
  if (t) { child.kill('SIGKILL'); await Promise.race([done, new Promise((r) => setTimeout(r, 1500))]) }
}

async function waitReady(ms = 60000) {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    try {
      const r = await fetch(BASE + '/privhub/api/health', { signal: AbortSignal.timeout(2000) })
      if (r.status === 200) return true
    } catch { /* 未就绪 */ }
    await sleep(300)
  }
  return false
}

async function api(method, path, { token, raw, body } = {}) {
  const headers = {}
  let payload
  if (raw !== undefined) { payload = raw; headers['content-type'] = 'application/octet-stream' }
  else if (body !== undefined) { payload = Buffer.from(JSON.stringify(body), 'utf8'); headers['content-type'] = 'application/json' }
  if (token) headers.authorization = 'Bearer ' + token
  const res = await fetch(BASE + path, { method, headers, body: payload, signal: AbortSignal.timeout(60000) })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* 非 JSON */ }
  return { status: res.status, text, json }
}
const upload = (token, name, buf) => api('POST', '/privhub/api/upload?' + new URLSearchParams({ project: PROJECT, name }).toString(), { token, raw: buf })
const officeRead = (token, name) => api('GET', '/privhub/api/office/read?' + new URLSearchParams({ project: PROJECT, path: name }).toString(), { token })

/** 现场造一个真 docx / xlsx（用项目自带依赖，不下载任何东西）。 */
async function realDocx() {
  const { Document, Packer, Paragraph, TextRun } = await import('docx')
  const d = new Document({ sections: [{ children: [new Paragraph({ children: [new TextRun('OD 真样本 docx 正文')] })] }] })
  return await Packer.toBuffer(d)
}
async function realXlsx() {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('表1')
  ws.addRow(['名称', '数量']); ws.addRow(['苹果', 3])
  return Buffer.from(await wb.xlsx.writeBuffer())
}
/** 真 PDF 用 `pdf-parse` 自带的测试件（上一批矩阵已实测它能解析出正文）。
 *  ⚠ **不用 pdfkit 现场生成**：上一批实测 pdfkit 0.15 的产物被 pdf-parse 判 `bad XRef entry`
 *  （`docs/reviews/11-…md` §2.5 ③），那是**既有**的解析器兼容问题、与本批无关；
 *  用它做"正常路径回归"会把一个既有问题算成本批的失败。 */
async function realPdf() {
  const p = join(ROOT, 'node_modules', 'pdf-parse', 'test', 'data', '04-valid.pdf')
  return existsSync(p) ? readFileSync(p) : null
}

let ready = false
let serverErr = ''
prepareRoot()
const child = startServer()
child.stderr.on('data', (d) => { serverErr += d.toString() })
try {
  ready = await waitReady()
  ok(ready, `隔离实例就绪（端口 ${PORT}；不碰 3180/3181 与真实 data/、data-files/）`)
  if (ready) {
    const login = await api('POST', '/privhub/api/login', { body: { username: 'admin', password: 'admin123' } })
    ok(!!(login.json && login.json.ok && login.json.token), '管理员登录成功（取会话令牌）')
    const token = login.json && login.json.token
    if (token) {
      /* 假 .doc：上传（上传本身当然成功——文件是"合法文件"，只是不是合法 .doc）→ 读必须失败 */
      for (const [name, buf] of DOC_SAMPLES) {
        const up = await upload(token, name, buf)
        ok(up.json && up.json.ok, `假 .doc 样本上传成功（${name}）`)
        const r = await officeRead(token, name)
        const j = r.json || {}
        console.log('     [实测] /office/read ' + name.padEnd(24) + ' → HTTP ' + r.status + ' ' +
          JSON.stringify({ ok: j.ok, kind: j.kind, reason: j.reason }) + ' error=' + JSON.stringify(String(j.error || '').slice(0, 46)) + '…')
        ok(r.status === 400 && j.ok === false && j.kind === 'doc' && typeof j.reason === 'string' && !!j.reason,
          `\`${name}\` ⇒ HTTP 400 + ok:false + reason（**迁前这里回的是 HTTP 200 + ok:true + 一句兜底文案**）`)
        ok(!j.content && !String(j.error || '').includes(LEGACY_FALLBACK_MARK),
          `\`${name}\` 的回包里没有 content、也没有兜底句（界面因此不可能把它当正文）`)
      }

      /* 真 Office 文件：**回归保护** —— 本批的改动不许把正常路径弄丢 */
      const pdfBuf = await realPdf()
      ok(pdfBuf !== null && pdfBuf.length > 0, '真 PDF 样本可取（`pdf-parse` 自带测试件；取不到则下面那条会红而不是静默跳过）')
      const realSamples = [
        ['OD真样本.docx', await realDocx(), 'docx', (j) => typeof j.content.text === 'string' && j.content.text.includes('OD 真样本 docx 正文')],
        ['OD真样本.xlsx', await realXlsx(), 'xlsx', (j) => Array.isArray(j.content.sheets) && j.content.sheets.length > 0],
        ['OD真样本.pdf', pdfBuf, 'pdf', (j) => typeof j.content.text === 'string' && j.content.text.length > 100],
      ]
      for (const [name, buf, kind, check] of realSamples) {
        if (!buf) continue
        const up = await upload(token, name, buf)
        ok(up.json && up.json.ok, `真样本上传成功（${name}）`)
        const r = await officeRead(token, name)
        const j = r.json || {}
        console.log('     [实测] /office/read ' + name.padEnd(24) + ' → HTTP ' + r.status + ' ' +
          JSON.stringify({ ok: j.ok, kind: j.kind, reason: j.reason }) +
          (j.ok ? ' 正文=' + JSON.stringify(JSON.stringify(j.content).slice(0, 60)) + '…' : ' error=' + JSON.stringify(String(j.error || '').slice(0, 50))))
        ok(r.status === 200 && j.ok === true && j.kind === kind && check(j),
          `\`${name}\` 仍能读出正文（HTTP 200 + ok:true + kind:${kind} + 正文）—— 本批没有误伤正常路径`)
      }

      /* 读取链之外的 Office 家族成员：`.xls` 走文本分支（**不改**它的既有行为），
       * 这里只验「`/office/read` 对它仍是明确的不支持、且原因与解析失败可区分」。 */
      const xlsUp = await upload(token, 'OD探针.xls', Buffer.from('not an xls at all'))
      ok(xlsUp.json && xlsUp.json.ok, '`.xls` 探针上传成功')
      const xlsRead = await officeRead(token, 'OD探针.xls')
      ok(xlsRead.status === 400 && xlsRead.json && xlsRead.json.ok === false && xlsRead.json.reason === 'unsupported-type',
        '`.xls` 在读取链外 ⇒ reason=unsupported-type（与"解析失败"分开；这是本批拍的口径，见 `file-exts.ts` 文件头）')

      /* 清理：删掉本次造的样本（测试自己的产物自己收） */
      for (const name of [...DOC_SAMPLES.map((s) => s[0]), 'OD真样本.docx', 'OD真样本.xlsx', 'OD真样本.pdf', 'OD探针.xls']) {
        await api('POST', '/privhub/api/delete', { token, body: { project: PROJECT, path: name } }).catch(() => null)
      }
    }
  }
} finally {
  await stopServer(child)
}
cleanRoot()

/* ══════════════════════════════════════════════════════════════════════════
 * ⑤ 前端不把提示句当正文（把 content.js 真身装进 vm）
 * ══════════════════════════════════════════════════════════════════════════ */

console.log('\n══ ⑤ 界面侧：错误就是错误，正文里不会混进提示句（前端真身进 vm）══')

const CONTENT_FILE = join(ROOT, 'plugins', 'privhub-files-explorer-v3', 'client', 'content.js')

/**
 * 把 `content.js` 的**真身**装进 vm 跑（不是正则猜源码）。
 * 只桩掉它 import 的三个同目录模块（`deps.js` 的 api/bus、`utils.js` 的 rawUrl、`store.js` 的 store）——
 * 桩的**形状**与真身一致（`store.tabs`/`store.content` 是真字段名，见 `store.js:12-25`）。
 *
 * ⚠ 两条踩过的坑（都实测过，别再踩）：
 *   ① **不要**往 sandbox 里塞 `globalThis: sandbox` 这种自引用（会让 `createContext` 的桩静默失效，
 *      表现为"接口被调用但抛 TypeError"，极易被误读成产品代码的 bug）；context 自带 `globalThis`。
 *   ② **不要**把一个 `Promise` 当桩传进 sandbox：跨 context 化之后 `await` 它会在**主线程**抛错
 *      （catch 到的是 `TypeError`，被 content.js 记成"网络错误"）。桩必须是**函数**，
 *      函数体里再 `Promise.resolve(...)` —— 这一条是实测出来的，见本批报告的阴性对照说明。
 */
async function loadContentModule(reply) {
  let src = readFileSync(CONTENT_FILE, 'utf8')
  src = src.replace(/^import\s+\{[^}]*\}\s+from\s+'\.\/deps\.js'\s*$/m, "const api = __api; const bus = { on: () => () => {}, emit: () => {} };")
  src = src.replace(/^import\s+\{[^}]*\}\s+from\s+'\.\/utils\.js'\s*$/m, "const rawUrl = (p, x) => '/raw?' + p + '|' + x;")
  src = src.replace(/^import\s+\{[^}]*\}\s+from\s+'\.\/store\.js'\s*$/m, 'const store = __store__;')
  src = src.replace(/^export\s*\{[^}]*\}\s*$/m, '')
  const store = { tabs: [], content: null, activeKey: '' }
  /* 桩是**函数**（每条用例自己的调用记录留在 calls 里，便于证明"接口真被调到了"） */
  const calls = []
  const stubApi = (url, opts) => { calls.push([url, opts === undefined ? null : opts]); return Promise.resolve(reply) }
  const sandbox = { console, __api: stubApi, __store__: store }
  const ctx = createContext(sandbox)
  runInContext(src + '\n;globalThis.__loadContent__ = loadContent; globalThis.__officeToMd__ = officeToMd;', ctx, { filename: CONTENT_FILE })
  return { loadContent: sandbox.__loadContent__, officeToMd: sandbox.__officeToMd__, store, calls }
}

/** 迁前那种回包：后端把兜底句当正文 + ok:true（**前端拿到它时不该把它显示成正文**）。 */
const LEGACY_REPLY = {
  ok: true, kind: 'doc',
  content: { text: '[无法提取 DOC 文本]（请用 Word/WPS 打开后另存为 docx 再上传）' },
}
/** 现在这种回包：后端如实说失败 + 可读原因。 */
const NOW_REPLY = {
  ok: false, kind: 'doc', reason: 'capability-missing',
  error: '无法提取这份 .doc 的正文：本机没有真正的 Python（只有应用商店的占位程序）。请用 Word/WPS 打开后另存为 docx 再上传',
}

const tab = { key: 'P|a.doc', project: 'P', path: 'a.doc', name: 'a.doc', kind: 'office' }

{
  const m = await loadContentModule(LEGACY_REPLY)
  m.store.tabs = [tab]
  await m.loadContent(tab.key)
  const c = m.store.content
  console.log('     [实测] 喂"迁前那种回包" → state=' + c.state + ' 接口调用=' + m.calls.length + ' 次 正文含兜底句=' + JSON.stringify(c).includes(LEGACY_FALLBACK_MARK))
  /* ⚠ 这一条**故意写成"记录事实"而不是"保证"**：前端只有后端回包这一个信息源，
   *   它**没有能力**分辨"后端给的是真正文"还是"后端把提示句当正文给了"
   *   （任何按文案分辨的写法都会误伤真正文里正好有这句话的文档）。
   *   ⇒ 「兜底句不上屏」这件事**只能由后端保证**（② 组源码断言 + ③ 组契约断言 + ④ 组端到端），
   *     本组的价值是把这条事实钉在案上：界面的正确性**完全取决于后端是否如实**。 */
  ok(c.state === 'ready' && (c.office.markdown || '').includes(LEGACY_FALLBACK_MARK),
    '【事实记录，非保证】若后端又回"ok:true + 兜底文案"，界面会照单显示 ⇒ 后端那三条断言（②③④）才是防线')
}

{
  const m = await loadContentModule(NOW_REPLY)
  m.store.tabs = [tab]
  await m.loadContent(tab.key)
  const c = m.store.content
  console.log('     [实测] 喂"现在这种回包"（后端如实报错）→ state=' + c.state + ' 接口调用=' + m.calls.length + ' 次 reason=' + c.officeReason +
    ' error=' + JSON.stringify(String(c.error).slice(0, 40)) + '…')
  ok(m.calls.length === 1 && m.calls[0][0].startsWith('/privhub/api/office/read'),
    '（自证）真的走了 Office 取数那条路（实测调用 ' + JSON.stringify(m.calls[0] ? m.calls[0][0] : null) + '）—— 否则下面两条是假绿')
  ok(c.state === 'error' && c.error === NOW_REPLY.error,
    '【本批修的界面行为】后端失败 ⇒ 界面进错误态，显示的是**后端给的原因原文**（不是"读取失败"这种含糊话）')
  ok(!c.office && c.officeReason === 'capability-missing',
    '错误态下**没有** office 正文对象，原因码 `capability-missing` 原样挂在 state 上（供排查，不参与布局）')
  ok(!JSON.stringify(c).includes(LEGACY_FALLBACK_MARK),
    '这条路径下界面状态里**没有任何"兜底提示句"**（错就是错，正文位是空的）')
}

{
  /* `officeToMd` 是正文的唯一生产者：它**只**从 content 取值，不认得任何"提示句" */
  const m = await loadContentModule({ ok: true, kind: 'doc', content: { text: '' } })
  ok(m.officeToMd('doc', { text: '真正文' }) === '真正文' && m.officeToMd('doc', null) === '' && m.officeToMd('doc', {}) === '',
    '`officeToMd` 只搬 content 里的正文：给了就给、没给就空 —— **它自己不生产任何提示句**')
}

/* ══════════════════════════════════════════════════════════════════════════
 * ⑥ 防漂移：4 处同族副本收敛后的样子
 * ══════════════════════════════════════════════════════════════════════════ */

console.log('\n══ ⑥ Office 族收敛：谁再写一份手写清单，这里与 file-exts.mjs ④ 组都会红 ══')

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
/** 只扫**代码**（去注释）：口径说明里为了讲清"原来错在哪"会引用迁前的原话，
 *  注释里的引用不该被算成"又写了一份清单"（`file-exts.mjs` ④ 组的同款教训：误报会逼人删注释）。 */
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n')

/* ① `svc-office`：不再有手写清单，改为从共享处取 */
const svcSrc = read('plugins/privhub-svc-office/src/index.ts')
ok(/from\s+'\.\.\/\.\.\/privhub-core\/src\/file-exts'/.test(svcSrc) && /officeKindOf/.test(svcSrc),
  '`svc-office/src/index.ts` 从共享定义取（导入 `officeKindOf`），不再自带手写 Office 清单')
ok(!/const\s+OFFICE_EXTS\s*=\s*\[/.test(svcSrc) && !/export const OFFICE_EXTS\s*=\s*\[/.test(svcSrc),
  '`svc-office` 里那份 `OFFICE_EXTS = [...]` 字面量已删（不是"留着不用"）')

/* ② `files-office` 的 TS 与 mjs：TS 派生、mjs 连清单都不认 */
const foSrc = read('plugins/privhub-files-office/src/index.ts')
ok(/from\s+'\.\.\/\.\.\/privhub-core\/src\/file-exts'/.test(foSrc) && /OFFICE_EXTRACT_ONLY_EXTS/.test(foSrc) && /union\(/.test(foSrc),
  '`files-office/src/index.ts` 的清单改为**显式派生**（`union(OFFICE_EXTS, OFFICE_EXTRACT_ONLY_EXTS)`）')
ok(!/const\s+OFFICE_EXTS\s*=\s*\[/.test(foSrc),
  '`files-office/src/index.ts` 里那份手写清单已删（迁前它和 `extract.mjs` 是同值两份）')
const fmSrc = read('plugins/privhub-files-office/src/extract.mjs')
/* 按**行**判「是不是真在写一份副本」，且认三种写法：`export const` / `const` / `new Set(`。
 * 为什么不只查字符串：注释里为了说明"原来错在哪"会引用原话（`export const OFFICE_EXTS = [...]`），
 * 那种引用不该被算成"还留着" —— 否则断言会逼人不敢写注释。 */
const fmCopyLines = (() => {
  const code = stripComments(fmSrc)   // 注释里的引用不算（见 `stripComments` 的说明）
  return code.split('\n')
    .map((l, i) => [i + 1, l])
    .filter(([, l]) => /(?:export\s+)?const\s+OFFICE_EXTS\s*=\s*(?:new\s+Set\()?\s*\[/.test(l))
})()
ok(fmCopyLines.length === 0,
  '`files-office/src/extract.mjs` 里那份同值副本（`export const OFFICE_EXTS = [...]`）已删 —— **4 处里的 2 处在这里**' +
  (fmCopyLines.length ? '（实测仍在 :' + fmCopyLines.map((x) => x[0]).join(',') + '）' : ''))

/* ③ 前端两份：各自单点定义（浏览器取不到 core，硬约束逼出来的），取值由断言钉住 */
const uiSrc = read('plugins/privhub-files-office-ui/client/index.js')
const uiCode = stripComments(uiSrc)
const mUi = /const\s+OFFICE_EXTS\s*=\s*(\[[^\]]*\])/.exec(uiCode)
const uiList = mUi ? mUi[1].replace(/'/g, '"') : null
let uiArr = null
try { uiArr = uiList ? JSON.parse(uiList) : null } catch { uiArr = null }
ok(uiArr !== null, '`office-ui/client/index.js` 的清单仍是**一处可解析的声明**（不是散在各处的字面量）')
ok(uiArr !== null && uiArr.join(',') === OFFICE_EXTS.join(','),
  '`office-ui` 的清单与共享 `OFFICE_EXTS` **逐项同值**（实测 ' + (uiArr || []).join(',') + ' vs ' + fmt(OFFICE_EXTS) + '）')
const uiInlineCount = (uiCode.match(/\[\s*'doc'\s*,\s*'docx'/g) || []).length
ok(/if\s*\(!OFFICE_EXTS\.includes\(ext\)\)\s*return/.test(uiCode) && uiInlineCount === 1,
  '`office-ui` 的入口闸用的是那个常量，**代码里那份内联数组只有它自己那一处声明**（实测出现 ' + uiInlineCount + ' 次）')
ok(uiInlineCount > 0 && /const\s+OFFICE_EXTS\s*=/.test(uiCode),
  '（自证）那份声明确实被这条判据看得见 —— 否则"只有一处"会因为候选里没有而假绿')

const utilsSrc = read('plugins/privhub-files-explorer-v3/client/utils.js')
const utilsCode = stripComments(utilsSrc)
const mUtils = /const\s+OFFICE_EXTS\s*=\s*(\[[^\]]*\])/.exec(utilsCode)
let utilsArr = null
try { utilsArr = mUtils ? JSON.parse(mUtils[1].replace(/'/g, '"')) : null } catch { utilsArr = null }
ok(utilsArr !== null && utilsArr.join(',') === OFFICE_EXTS.join(','),
  '`explorer-v3/client/utils.js`（前端唯一那一处定义）与共享 `OFFICE_EXTS` 逐项同值（实测 ' + (utilsArr || []).join(',') + '）')
ok(/const\s+OFFICE_KIND_EXTS\s*=\s*OFFICE_EXTS\.filter\(\(e\)\s*=>\s*e\s*!==\s*'pdf'\)/.test(utilsCode),
  '前端 `OFFICE_KIND_EXTS` 仍是**派生**（= 读取链 − pdf），不是又手写一份')

/* `.xls`/`.ppt` 的最终口径：**两处界面清单都不含它们**（含了就是"点了没反应"那个悬空入口） */
for (const [rel, arr, what] of [
  ['plugins/privhub-files-explorer-v3/client/utils.js', utilsArr, '前端 `EXT.OFFICE_EXTS`'],
  ['plugins/privhub-files-office-ui/client/index.js', uiArr, '浮层的入口闸'],
]) {
  ok(arr !== null && !arr.includes('xls') && !arr.includes('ppt'),
    `${what} 不含 \`xls\`/\`ppt\`（与后端读取链同源；它们是"Office 家族但不在读取链"，见 file-exts.ts 文件头）`)
}

/* 逃逸检查：全仓源码里是否还有人自己写 Office 清单（排除有备案的那几处单点定义）。
 *
 * 判据刻意收紧到「**声明式数组/Set**」：`const X = [...]` / `new Set([...])` / `X = ['doc', …]`。
 * 为什么不去匹配「文件里出现过 'docx','xlsx' 这种串」：注释与文档里为了说明口径会引用取值，
 * 那种误报会逼人删注释（`file-exts.mjs` ④ 组的同款教训：**误报的代价是有人干脆关掉断言**）。 */
const SCAN_DIRS = ['src', 'plugins', 'frontend']
const SCAN_SKIP = /(^|[\\/])(node_modules|_retired-v2|vendor|dist)([\\/]|$)/
/** `const/let/var NAME = [ … ]` 或 `= new Set([ … ])`，且首个元素像是 Office 扩展名。 */
const OFFICE_LITERAL_DECL = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:Object\.freeze\(\s*)?(?:new\s+Set\(\s*)?\[\s*'(doc|docx|xls|xlsx|ppt|pptx|pdf)'/g
function walk(dir) {
  const out = []
  if (!existsSync(dir)) return out
  const stack = [dir]
  while (stack.length) {
    const cur = stack.pop()
    for (const ent of readdirSync(cur, { withFileTypes: true })) {
      const full = join(cur, ent.name)
      if (SCAN_SKIP.test(full)) continue
      if (ent.isDirectory()) { stack.push(full); continue }
      if (/\.(ts|mts|js|mjs)$/.test(ent.name)) out.push(full)
    }
  }
  return out
}
const ALLOWED_OFFICE_SINGLE_POINTS = [
  'plugins/privhub-core/src/file-exts.ts',                    // 后端唯一出处（OFFICE_EXTS 唯一一处定义 + 家族派生）
  'plugins/privhub-files-explorer-v3/client/utils.js',         // 前端唯一出处（浏览器取不到 core，硬约束）
  'plugins/privhub-files-office-ui/client/index.js',           // 该插件自己的单点定义（client 只许引用同目录文件）
]
const officeOffenders = []
for (const f of SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)))) {
  const rel = f.slice(ROOT.length + 1).replace(/\\/g, '/')
  if (ALLOWED_OFFICE_SINGLE_POINTS.includes(rel)) continue
  const hits = [...stripComments(readFileSync(f, 'utf8')).matchAll(OFFICE_LITERAL_DECL)]
  if (hits.length) officeOffenders.push(rel + ':' + hits.map((h) => h[1]).join(','))
}
for (const o of officeOffenders) console.log('     [越界] ' + o)
ok(officeOffenders.length === 0,
  `备案外没有第 4 处 Office 手写清单（越界 ${officeOffenders.length} 处；备案的只有 3 处：core 一处定义 + 两份前端单点定义）`)
/* 阳性对照：同一套判据必须能认出**植入的**手写副本（否则是"扫描器坏了、永远绿"） */
const officeProbe = "const OFFICE_EXTS = ['doc', 'docx', 'xlsx', 'pptx', 'pdf']\n"
ok([...officeProbe.matchAll(OFFICE_LITERAL_DECL)].length === 1,
  '阳性对照：扫描器能认出植入的 Office 手写清单（这条不过就说明扫描器坏了）')
/* 阴性对照（同一套判据）：注释里引用取值、服务名数组都不该被误报 */
ok([...('/* 全仓的 OFFICE_EXTS = doc docx xlsx pptx pdf，见 file-exts.ts */\n'.matchAll(OFFICE_LITERAL_DECL))].length === 0 &&
   [...("export const inject = ['privhub', 'office']\n".matchAll(OFFICE_LITERAL_DECL))].length === 0,
  '阴性对照：注释里引用取值、Cordis 服务名数组都不会被误报（宁漏勿错报）')
for (const rel of ALLOWED_OFFICE_SINGLE_POINTS) {
  ok(existsSync(join(ROOT, rel)), `备案的单点定义还在：${rel}`)
}

console.log(`\n${'='.repeat(56)}`)
console.log(`  .doc 如实报错 + Office 族收敛断言：${pass} 通过 / ${fail} 失败`)
console.log('='.repeat(56))
if (!ready && serverErr) console.log('服务端 stderr 摘要：\n' + serverErr.split('\n').slice(-8).join('\n'))
process.exit(fail === 0 ? 0 : 1)
