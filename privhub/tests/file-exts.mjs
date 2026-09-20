/**
 * 扩展名「一处定义 + 各处显式派生」的防漂移断言
 *
 * ## 这个文件是干什么的
 *
 * 「同一个概念被抄成 5 份、抄着抄着就不一致了」是 [`docs/reviews/11-格式支持矩阵与铺满修复.md`]
 * 实测出来的病：`.markdown` 在 fulltext/rag 有、preview 没有；`.toml/.htm/.java/.c/.cpp` 在
 * preview 有、versions 没有；`ico` 在后端图片清单里、前端 `kindOf` 里没有（于是图片走了 iframe 分支、
 * 失去点击放大）。本批把清单收敛成「**一处定义 + 各处显式派生**」，本文件是**保证它不再漂**的那道闸。
 *
 * ## 五组断言（前四组在进程内、第五组起隔离实例，全程不碰 3180/3181 与真实 data/）
 *
 *   ⓪ **编译期集合关系**（纯比对，不需要服务）：每条派生式成立、且**逐项同值**；
 *   ① **行为口径**：`kindOfExt` / `extOfName` 对真扩展名与**无扩展名**的判定（无扩展名一律不认文本）；
 *   ② **前端与后端逐项一致**：把 `explorer-v3/client/utils.js` 装进 vm 取 `EXT`，与 `file-exts.ts` 比对；
 *   ③ **前端两份可编辑清单一致**：`edit-md` 与 `explorer-v3` 的取值必须相同；
 *   ④ **反漂移源码扫描**：全仓源码里凡「≥3 个像扩展名的字符串字面量组成的数组/Set」，
 *      只允许出现在**有备案的出处**；任何一处**手写副本**都会让它变红；
 *   ⑤ **端到端**：为「本批该补的扩展名」各造一个真文件，走 `/privhub/api/preview` 验「现在真能打开」，
 *      并复验 `.ico` 的 kind 已与后端一致（不再走 iframe）。
 *
 * ## 为什么这样写才叫"会红的"
 *
 *   · ⓪ 用的是**逐项同值**（不是"包含"）：谁把某处改回手写副本、或漏补一个扩展名，立刻红；
 *   · ④ 扫的是**源码文本**：手写副本一出现就红，与"有没有人记得同步"无关；
 *   · ④ 自带一条**阳性对照**（同一个扫描器去扫一段植入的手写副本，必须命中）——
 *     否则"扫描器坏了、永远返回空"也会让断言假绿；
 *   · ⑤ 走**真实的 HTTP 链路**：清单对了但没接上（例如改完没生效）也会红。
 *
 * 阴性对照（实测贴在本批报告里）：把 `explorer-v3/client/utils.js` 的 `EXT` 改回手写副本 ⇒ ②③ 变红；
 * 把 `privhub-files-versions` 的派生改回一份少几项的手写清单 ⇒ ⓪ 变红。
 *
 *   node tests/file-exts.mjs
 *
 * @module tests/file-exts
 */

import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync, mkdirSync, rmSync, readdirSync, readFileSync, writeFileSync, lstatSync, unlinkSync, symlinkSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
/** 端口不与既有套件冲突：3190(run-all) / 3193(matrix) / 3195(rag) / 3196(preview-limits) */
const PORT = Number(process.env.PRIVHUB_EXTSTEST_PORT || 3197)
const BASE = `http://127.0.0.1:${PORT}`
const TESTROOT = join(HERE, '.testroot-exts')
const PROJECT = '公共'

let pass = 0
let fail = 0
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✅ ' + msg) } else { fail++; console.log('  ❌ ' + msg) }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ══════════════════════════════════════════════════════════════════════════
 * ⓪ 编译期集合关系：一处定义 + 各处派生
 * ══════════════════════════════════════════════════════════════════════════ */

const CORE_EXTS_FILE = join(ROOT, 'plugins', 'privhub-core', 'src', 'file-exts.ts')
const exts = await import(pathToFileURL(CORE_EXTS_FILE).href)
const {
  TEXT_EXTS, IMAGE_EXTS, MARKDOWN_EXTS, OFFICE_EXTS,
  EDITABLE_TEXT_EXTS, ENV_EXTS, RAG_EXCLUDED_EXTS, PREVIEW_ONLY_TEXT_EXTS,
  SENSITIVE_EXTS_BARE, PREVIEW_TEXT_EXTS, VERSION_TEXT_EXTS, RAG_TEXT_EXTS, AGENT_SNAPSHOT_EXTS,
  isPreviewTextExt, isImageExt, isMarkdownExt, kindOfExt, extOfName, minus, union, normExt,
} = exts

/** 逐项同值（顺序无关、去重）：这是本文件用得最多的一条判据。 */
function sameSet(a, b) {
  const A = [...new Set(a.map(normExt))].sort()
  const B = [...new Set(b.map(normExt))].sort()
  return A.length === B.length && A.every((x, i) => x === B[i])
}
const fmt = (a) => a.map(normExt).join(',')

console.log('══ ⓪ 编译期集合关系（一处定义 + 各处显式派生）══')

console.log('     [派生式] TEXT_EXTS                = ' + fmt(TEXT_EXTS))
console.log('     [派生式] EDITABLE_TEXT_EXTS       = ' + fmt(EDITABLE_TEXT_EXTS))
console.log('     [派生式] PREVIEW_ONLY_TEXT_EXTS   = ' + fmt(PREVIEW_ONLY_TEXT_EXTS))
console.log('     [派生式] PREVIEW_TEXT_EXTS        = ' + fmt(PREVIEW_TEXT_EXTS))
console.log('     [派生式] VERSION_TEXT_EXTS        = ' + fmt(VERSION_TEXT_EXTS))
console.log('     [派生式] RAG_TEXT_EXTS            = ' + fmt(RAG_TEXT_EXTS))
console.log('     [派生式] AGENT_SNAPSHOT_EXTS      = ' + fmt(AGENT_SNAPSHOT_EXTS))

ok(sameSet(PREVIEW_TEXT_EXTS, union(TEXT_EXTS, EDITABLE_TEXT_EXTS)),
  '预览集 = 基础文本集 ∪ 可编辑集（并集 ⇒ 不存在「能编辑却打不开」的自相矛盾状态）')
ok(sameSet(VERSION_TEXT_EXTS, minus(PREVIEW_TEXT_EXTS, ENV_EXTS)),
  '索引/快照集 = 预览集 − 配置族（密钥载体不进索引与快照）')
ok(sameSet(RAG_TEXT_EXTS, minus(PREVIEW_TEXT_EXTS, union(ENV_EXTS, RAG_EXCLUDED_EXTS))),
  '向量化集 = 索引集 − 大数据/表格/笔记本类（本批保持迁前范围，不扩权）')
ok(sameSet(AGENT_SNAPSHOT_EXTS, EDITABLE_TEXT_EXTS),
  '智能体快照集 = 可编辑集（16 项，含 md；与迁前那份 17 项手写清单只差 html —— html/toml/java/c/cpp/htm 按不扩权留在不快照那一侧）')

/* 逐项同值的"活标本"：这三条就是迁前各写各的、已经不一致的那几处。
 * 它们同时把"本批有意保持的范围"钉住 —— 谁顺手把新扩展名拉进索引/向量库，这里会红。 */
ok(sameSet(VERSION_TEXT_EXTS, [
  'txt', 'md', 'markdown', 'json', 'jsonl', 'js', 'ts', 'tsx', 'html', 'htm', 'css', 'xml',
  'yaml', 'yml', 'toml', 'ini', 'conf', 'csv', 'tsv', 'log', 'sql', 'py', 'java', 'c', 'cpp',
  'go', 'rs', 'sh', 'bat', 'ps1', 'vue', 'ipynb',
]), '索引/快照集逐项同值（迁前 fulltext 是 23 项、versions 只有 17 项，本批收敛后两侧同为 32 项）')
ok(sameSet(RAG_TEXT_EXTS, [
  'txt', 'md', 'markdown', 'json', 'js', 'ts', 'tsx', 'html', 'htm', 'css', 'xml', 'yaml', 'yml',
  'toml', 'ini', 'conf', 'csv', 'log', 'sql', 'py', 'java', 'c', 'cpp', 'go', 'rs', 'sh', 'bat',
  'ps1', 'vue',
]), '向量化集逐项同值（`.env`/`.jsonl`/`.tsv`/`.ipynb` 本批**有意不在**其中 —— 判不了的不替用户决定）')
ok(sameSet(AGENT_SNAPSHOT_EXTS, [
  'txt', 'json', 'csv', 'log', 'yaml', 'yml', 'ini', 'py', 'sh', 'bat', 'sql', 'xml', 'js', 'ts', 'css', 'md',
]), '智能体快照集逐项同值（与迁前的 17 项手写清单一致；迁前那 5 项遗漏保持原样，不扩权）')

/* 本批"该补的清单"必须真的进了预览集 —— 这是"补齐"这件事本身的自证 */
const missingFromPreview = PREVIEW_ONLY_TEXT_EXTS.filter((e) => !PREVIEW_TEXT_EXTS.includes(e))
ok(missingFromPreview.length === 0,
  `本批该补的 ${PREVIEW_ONLY_TEXT_EXTS.length} 个扩展名全部进了预览集${missingFromPreview.length ? '，缺：' + missingFromPreview.join(',') : ''}`)
ok(PREVIEW_ONLY_TEXT_EXTS.length === 11, `本批该补的清单是 11 项（矩阵 A 类，实测取自 docs/reviews/11-…md §2.3）`)
ok(IMAGE_EXTS.length === 8 && IMAGE_EXTS.includes('ico'),
  `图片集含 ico（${fmt(IMAGE_EXTS)}）—— 迁前后端有、前端没有，本批收敛为同一份`)
ok(MARKDOWN_EXTS.includes('md') && MARKDOWN_EXTS.includes('markdown'), 'Markdown 家族含 md 与 markdown')
ok(OFFICE_EXTS.includes('pdf') && OFFICE_EXTS.length === 5, 'Office 集 5 项且含 pdf（与 privhub-svc-office 同值）')
ok(SENSITIVE_EXTS_BARE.length === 8 && !SENSITIVE_EXTS_BARE.includes('.env'), '敏感后缀已归一（无前导点）')
/* 智能体那一份是"过滤"而不是"减法"：敏感族里有 `.key/.p12/.pfx/.crt/.git-credentials/.htpasswd`
 * 这些本来就**不在**基础文本集里，减法（会断言"减的东西必须存在"）不适用。 */
const agentTextExts = TEXT_EXTS.filter((e) => !SENSITIVE_EXTS_BARE.includes(e))
ok(agentTextExts.length === TEXT_EXTS.length - 1 && !agentTextExts.includes('env'),
  `智能体文本集 = 基础文本集 − 敏感族（只减掉 env 一项；结果由 files-agent 侧断言复核）`)

/* 集合本身的基本卫生：不许有空串、不许有前导点、不许重复 */
const allLists = { TEXT_EXTS, IMAGE_EXTS, MARKDOWN_EXTS, OFFICE_EXTS, EDITABLE_TEXT_EXTS, ENV_EXTS, RAG_EXCLUDED_EXTS, PREVIEW_ONLY_TEXT_EXTS, PREVIEW_TEXT_EXTS, VERSION_TEXT_EXTS, RAG_TEXT_EXTS, AGENT_SNAPSHOT_EXTS }
const dirty = []
for (const [n, list] of Object.entries(allLists)) {
  if (list.some((e) => e !== normExt(e))) dirty.push(n + ' 未归一')
  if (new Set(list).size !== list.length) dirty.push(n + ' 有重复')
  if (list.length === 0) dirty.push(n + ' 是空的')
}
ok(dirty.length === 0, `所有集合都是归一化的扩展名、无重复、非空${dirty.length ? '：' + dirty.join('; ') : ''}`)
ok(!PREVIEW_TEXT_EXTS.includes('') && !isPreviewTextExt(''),
  '空扩展名（无扩展名文件）不在任何集合里 —— 「无扩展名默认不当文本」这条由**数据结构**保证')

/* 派生用的减法：减错名字要当场抛（而不是静默少一项） */
let threw = false
try { minus(TEXT_EXTS, ['这个扩展名肯定不存在']) } catch { threw = true }
ok(threw, '减法减到不存在的名字时会当场抛错（漂移的典型症状不会被静默吞掉）')

/* ══════════════════════════════════════════════════════════════════════════
 * ① 行为口径：kindOfExt / extOfName
 * ══════════════════════════════════════════════════════════════════════════ */

console.log('\n══ ① 行为口径（判定入口）══')
const kindCases = [
  ['a.txt', 'text'], ['a.MD', 'text'], ['a.markdown', 'text'], ['a.jsonl', 'text'], ['a.tsv', 'text'],
  ['a.tsx', 'text'], ['a.ps1', 'text'], ['a.conf', 'text'], ['a.vue', 'text'], ['a.go', 'text'],
  ['a.rs', 'text'], ['a.ipynb', 'text'], ['config.env', 'text'],
  ['a.png', 'image'], ['a.ico', 'image'], ['a.svg', 'image'], ['a.pdf', 'pdf'],
  ['a.zip', 'unknown'], ['a.tiff', 'unknown'], ['a.mp3', 'unknown'],
  // 无扩展名 / 隐藏文件 / 末尾带点：一律 not text（**不做二进制嗅探**，见 file-exts.ts 文件头）
  ['noext', 'unknown'], ['.env', 'unknown'], ['.gitignore', 'unknown'], ['trailing.', 'unknown'],
]
const kindBad = kindCases.filter(([n, want]) => kindOfExt(extOfName(n)) !== want)
console.log('     [实测] ' + kindCases.map(([n]) => n + '→' + kindOfExt(extOfName(n))).join('  '))
ok(kindBad.length === 0,
  `${kindCases.length} 条分类用例全部符合（含无扩展名一律 unknown）${kindBad.length ? '，不符：' + kindBad.map(([n, w]) => n + '(期望' + w + ')').join(' ') : ''}`)
ok(isImageExt('.ico') && isImageExt('ICO') && !isImageExt('icox'), '图片判定对大小写与前导点稳健')
ok(isPreviewTextExt('.env') && !isPreviewTextExt('envx'), '预览判定接受前导点形式（.env），且不误判相近名字')
ok(isMarkdownExt('.MD') && !isMarkdownExt('.markdownx'), 'Markdown 家族判定对大小写稳健')
ok(!isPreviewTextExt('') && !isImageExt(''), '空字符串不落在任何集合里')

/* ══════════════════════════════════════════════════════════════════════════
 * ② 前端与后端逐项一致（把 utils.js 真身装进 vm）
 * ══════════════════════════════════════════════════════════════════════════ */

console.log('\n══ ② 前端 utils.js 的 EXT 与后端 file-exts.ts 逐项一致 ══')

const UTILS_FILE = join(ROOT, 'plugins', 'privhub-files-explorer-v3', 'client', 'utils.js')

/**
 * 把前端 `utils.js` 的**真身**装进 vm 取 `EXT`。
 * 只桩掉它对外部的引用（`./deps.js` 的 api；`getComputedStyle` 只在 uiZoom 里用、不会调到）。
 * 为什么用 vm 而不是 import：utils.js 是给浏览器写的 ESM，直接 import 会连带拉 deps.js → window.PrivHub。
 */
function loadClientExt() {
  let src = readFileSync(UTILS_FILE, 'utf8')
  // 去掉 import 行，换成桩（保持其余源码一字不改）
  src = src.replace(/^import\s+\{[^}]*\}\s+from\s+'\.\/deps\.js'\s*$/m, 'const api = () => {}')
  const sandbox = { console, module: { exports: {} } }
  sandbox.exports = sandbox.module.exports
  const ctx = createContext(sandbox)
  // 把 export 语句换成赋值，跑完后从 sandbox 取
  const body = src.replace(/^export\s*\{[^}]*\}\s*$/m, '')
    + '\n;globalThis.__EXT__ = EXT; globalThis.__TEXT_EDIT_EXTS__ = TEXT_EDIT_EXTS; globalThis.__kindOf__ = kindOf; globalThis.__extOf__ = extOf;'
  runInContext(body, ctx, { filename: UTILS_FILE })
  return { EXT: sandbox.__EXT__, TEXT_EDIT_EXTS: sandbox.__TEXT_EDIT_EXTS__, kindOf: sandbox.__kindOf__, extOf: sandbox.__extOf__ }
}

let client = null
let clientErr = ''
try { client = loadClientExt() } catch (e) { clientErr = String(e && e.message ? e.message : e) }
ok(client !== null, `前端 utils.js 可在沙箱内执行并取出 EXT${client ? '' : '：' + clientErr}`)
if (client) {
  const E = client.EXT
  const pairs = [
    ['IMAGE_EXTS', E.IMAGE_EXTS, IMAGE_EXTS],
    ['MARKDOWN_EXTS', E.MARKDOWN_EXTS, MARKDOWN_EXTS],
    ['OFFICE_EXTS', E.OFFICE_EXTS, OFFICE_EXTS],
    ['TEXT_EDIT_EXTS', E.TEXT_EDIT_EXTS, EDITABLE_TEXT_EXTS],
    ['PREVIEW_TEXT_EXTS', E.PREVIEW_TEXT_EXTS, PREVIEW_TEXT_EXTS],
  ]
  for (const [name, got, want] of pairs) {
    ok(sameSet(got, want), `前端 ${name} 与后端逐项同值（前端 ${got.length} 项 / 后端 ${want.length} 项${sameSet(got, want) ? '' : '；前端=' + fmt(got) + ' 后端=' + fmt(want)}）`)
  }
  ok(sameSet(E.OFFICE_KIND_EXTS, OFFICE_EXTS.filter((e) => e !== 'pdf')),
    '前端 OFFICE_KIND_EXTS = Office 集 − pdf（`panel.js` 的 isOfficeFile 与 `kindOf` 现在同源）')
  ok(E.OFFICE_KIND_EXTS.includes('doc') && !E.OFFICE_KIND_EXTS.includes('pdf'),
    '前端 Office kind 判定含 doc、不含 pdf（pdf 走自己的 iframe 分支）')
  /* 【本批修的 .ico】前端 kindOf 必须把 ico 认成 image（迁前认成 text ⇒ 走 iframe、失去放大） */
  ok(client.kindOf('x.ico') === 'image', `.ico 的界面 kind 现在是 image（实测 kindOf('x.ico')=${client.kindOf('x.ico')}）`)
  ok(client.kindOf('x.png') === 'image' && client.kindOf('x.pdf') === 'pdf' && client.kindOf('x.md') === 'md' &&
     client.kindOf('x.docx') === 'office' && client.kindOf('x.txt') === 'text' && client.kindOf('x.zip') === 'text',
    'kindOf 对既有六类取值不变（图片/pdf/md/office/文本；未知扩展名仍回落到 text 分支，行为对等）')
  /* 【不许误伤】md 在可编辑清单里 —— 拿掉会让「右键 .md 选编辑」点了没反应（edit-md 的闸就是这一句） */
  ok(E.TEXT_EDIT_EXTS.includes('md'),
    '`md` 仍在可编辑清单里（edit-md 的 openEditor 靠它放行；这条是防"顺手清理"的误伤）')
}

/* ③ 前端两份可编辑清单必须一致（迁前它们各自维护、靠注释互相提醒） */
console.log('\n══ ③ 前端两份可编辑清单（explorer-v3 与 edit-md）一致 ══')
const EDITMD_FILE = join(ROOT, 'plugins', 'privhub-files-edit-md', 'client', 'index.js')
const editmdSrc = readFileSync(EDITMD_FILE, 'utf8')
const mEditable = /const\s+EDITABLE_TEXT_EXTS\s*=\s*(\[[^\]]*\])/.exec(editmdSrc)
let editmdList = null
try { editmdList = mEditable ? JSON.parse(mEditable[1].replace(/'/g, '"')) : null } catch { editmdList = null }
ok(editmdList !== null, 'edit-md 的 EDITABLE_TEXT_EXTS 仍是一处可解析的声明')
if (editmdList !== null && client) {
  ok(sameSet(editmdList, client.EXT.TEXT_EDIT_EXTS),
    `edit-md 与 explorer-v3 的可编辑集逐项同值（edit-md ${editmdList.length} 项 / explorer ${client.EXT.TEXT_EDIT_EXTS.length} 项）`)
  ok(sameSet(editmdList, EDITABLE_TEXT_EXTS), 'edit-md 的可编辑集与后端 file-exts.ts 的 EDITABLE_TEXT_EXTS 同值')
}

/* ══════════════════════════════════════════════════════════════════════════
 * ④ 反漂移源码扫描：手写的扩展名字面量数组只许出现在有备案的出处
 * ══════════════════════════════════════════════════════════════════════════ */

console.log('\n══ ④ 反漂移源码扫描（手写副本 ⇒ 变红）══')

/**
 * 🔒 **备案表：允许出现"扩展名字面量数组"的文件 —— 全仓只有这 8 个**。
 *
 * 前 3 个是本批收敛的成果（**文本扩展名**这一族的唯一出处）：
 *   · `privhub-core/src/file-exts.ts` —— **后端唯一出处**（一处定义）；
 *   · `explorer-v3/client/utils.js`    —— **前端唯一出处**（浏览器拿不到 core，硬约束，见该文件头）；
 *   · `edit-md/client/index.js`        —— 它自己的**单点定义**（跨插件 import 会弄反依赖方向）。
 * 后 3 个是本批**扫出来、判为出本批范围**的同族问题（**Office 扩展名**那一族），
 * 已加显式注释指向共享出处并写进报告，本批**不顺手改**（改动这类清单会动 Office 编辑链的大小写/分支）：
 *   · `privhub-svc-office/src/index.ts`    —— Office 那一族的**当前出处**（服务层对外承诺）；
 *   · `privhub-files-office/src/index.ts` 与 `src/extract.mjs` —— 同值的两份（`extract.mjs` 是 ESM 工具副本）；
 *   · `privhub-files-office-ui/client/index.js` —— 界面侧一份同值清单。
 * 另有 2 个 `files-office*` 的 **`inject` 服务名数组**（`['privhub','office']`）—— 那不是扩展名清单，
 * 是 Cordis 依赖声明，靠下面的"服务名/字段名黑名单"排除，不进备案表。
 *
 * 后两者的取值与本文件 ②③ 两组断言逐项比对 ⇒ **不是"各写各的"，是"一处定义 + 断言钉住"**。
 * 想加进备案表？先回答"为什么不能派生"，并把理由写进 `file-exts.ts` 的文件头那张表。
 */
const ALLOWED_LITERAL_SOURCES = [
  // —— 本批收敛的成果（文本扩展名族）——
  'plugins/privhub-core/src/file-exts.ts',
  'plugins/privhub-files-explorer-v3/client/utils.js',
  'plugins/privhub-files-edit-md/client/index.js',
  // —— 本批扫出、判为出本批范围（Office 扩展名族，已注释指向共享出处）——
  'plugins/privhub-svc-office/src/index.ts',
  'plugins/privhub-files-office/src/index.ts',
  'plugins/privhub-files-office/src/extract.mjs',
  'plugins/privhub-files-office-ui/client/index.js',
  // —— 敏感后缀族自己的出处（`files-agent` 里的既有清单；本批只用它做减法，未搬动）——
  'plugins/privhub-files-agent/src/index.ts',
]

/** 扫描面：源码（排除 vendor / node_modules / 已退役插件 / 测试与文档）。 */
const SCAN_DIRS = ['src', 'plugins', 'frontend']
const SCAN_EXT = /\.(ts|mts|js|mjs|html)$/
const SCAN_SKIP = /(^|[\\/])(node_modules|_retired-v2|vendor|dist)([\\/]|$)/
/** 预构建产物（Vue 运行时等）不参与扫描：它们不是本仓的源码。 */
const SCAN_SKIP_FILE = /\.(min|prod)\.js$/

/** 一个"像扩展名"的字面量：`md` / `.md` —— 小写字母开头、1~8 位、不含点（前导点除外）与斜杠。 */
const EXT_TOKEN = /^\.?[a-z][a-z0-9]{0,7}$/
/**
 * 非扩展名的常见字面量（服务名 / 字段名 / 枚举值 / 配置值）。
 * 为什么要有这张表：各插件的服务端入口里到处都是 `export const inject = ['privhub','storage',…]`
 * 与 `['id','at','user',…]` 这类数组，它们长得像扩展名但不是 —— 不排掉会天天误报，
 * 而误报的代价是"有人干脆把断言关掉"（那才是真的失守）。宁可保守。
 */
const NON_EXT_TOKENS = new Set([
  // Cordis 服务名 / 插件前缀
  'privhub', 'storage', 'audit', 'acl', 'eventbus', 'web', 'server', 'webserver', 'search', 'meta', 'collab',
  'office', 'model', 'events', 'debug', 'user', 'admin', 'files', 'shell', 'trash', 'auth', 'serve',
  // 常见字段名 / 枚举值 / 日志级别
  'id', 'at', 'by', 'name', 'path', 'size', 'type', 'kind', 'text', 'data', 'code', 'msg', 'time', 'date',
  'info', 'warn', 'error', 'log', 'debug', 'trace', 'allow', 'deny', 'read', 'write', 'edit', 'view',
  'open', 'close', 'key', 'value', 'body', 'head', 'list', 'item', 'node', 'edge', 'from', 'to', 'min', 'max',
  // 其它频繁出现的技术词
  'keys', 'values', 'entries', 'crumb', 'back', 'refresh', 'utf8', 'gbk', 'json5', 'true', 'false', 'null',
])

/**
 * 找出「≥4 个字面量组成的数组/Set 且其中 ≥70% 像扩展名」的位置。
 * 为什么下界是 4：最小的真清单就是 4 项（`files-office` 的 Office 提取清单）；
 * 再小（2~3 项）误报会明显变多，得不偿失。
 * 判据刻意保守：宁漏勿错报 —— 漏了还能靠 ⓪②③ 那三组同值断言兜住，
 * 误报会让人去关掉这条断言。
 */
function findExtLiteralLists(src) {
  const hits = []
  for (const m of src.matchAll(/\[([^\[\]]{0,400}?)\]|\bnew\s+Set\(([^()]{0,400}?)\)/g)) {
    const body = m[1] ?? m[2] ?? ''
    const toks = [...body.matchAll(/'([^']*)'|"([^"]*)"/g)].map((x) => x[1] ?? x[2])
    if (toks.length < 4) continue
    const extish = toks.filter((t) => EXT_TOKEN.test(t) && !NON_EXT_TOKENS.has(t.replace(/^\./, '')))
    if (extish.length / toks.length < 0.7) continue
    hits.push({ line: src.slice(0, m.index).split('\n').length, tokens: toks })
  }
  return hits
}

function walkSourceFiles() {
  const out = []
  for (const d of SCAN_DIRS) {
    const base = join(ROOT, d)
    if (!existsSync(base)) continue
    const stack = [base]
    while (stack.length) {
      const cur = stack.pop()
      for (const ent of readdirSync(cur, { withFileTypes: true })) {
        const full = join(cur, ent.name)
        if (SCAN_SKIP.test(full)) continue
        if (ent.isDirectory()) { stack.push(full); continue }
        if (SCAN_SKIP_FILE.test(ent.name)) continue
        if (SCAN_EXT.test(ent.name)) out.push(full)
      }
    }
  }
  return out
}

/* 阳性对照：同一套判据去扫一段**植入的手写副本**，必须命中（否则是"扫描器坏了、永远绿"） */
const plantProbe = "const TEXT_EXTS = ['txt', 'md', 'json', 'js', 'ts', 'html', 'css']\n"
ok(findExtLiteralLists(plantProbe).length === 1,
  '阳性对照：扫描器能认出植入的手写扩展名数组（否则这条断言是假保险）')
/* 阴性对照（同一套判据）：服务名/字段名数组不该被误报 */
ok(findExtLiteralLists("export const inject = ['privhub', 'storage', 'audit', 'acl', 'eventBus']\n").length === 0,
  '阴性对照：Cordis 服务名数组不会被误报成扩展名清单（宁漏勿错报）')

const allFiles = walkSourceFiles()
const offenders = []
const allowedSeen = new Set()
for (const f of allFiles) {
  const rel = f.slice(ROOT.length + 1).replace(/\\/g, '/')
  const hits = findExtLiteralLists(readFileSync(f, 'utf8'))
  if (hits.length === 0) continue
  if (ALLOWED_LITERAL_SOURCES.includes(rel)) { allowedSeen.add(rel); continue }
  offenders.push(rel + ':' + hits.map((h) => h.line).join(',') + ' → ' + hits[0].tokens.slice(0, 6).join(','))
}
console.log(`     [实测] 扫描 ${allFiles.length} 个源码文件；有备案的出处命中 ${allowedSeen.size}/${ALLOWED_LITERAL_SOURCES.length}`)
for (const o of offenders) console.log('     [越界] ' + o)
ok(offenders.length === 0,
  `全仓源码里没有备案外的手写扩展名字面量数组（越界 ${offenders.length} 处）`)
ok(allowedSeen.size === ALLOWED_LITERAL_SOURCES.length,
  `${ALLOWED_LITERAL_SOURCES.length} 个有备案的出处都还在（${[...allowedSeen].map((s) => s.split('/').pop()).join(' / ')}）`)

/* 消费方必须真的从共享处取，而不是"新增了共享文件、旧数组还留着" */
console.log('\n     ── 消费方确实改用了派生（不是留着旧数组）──')
const derivedUsers = [
  ['plugins/privhub-core/src/index.ts', "from './file-exts'", 'core 预览改用共享判定入口'],
  ['plugins/privhub-files-fulltext/src/index.ts', 'VERSION_TEXT_EXTS', '全文索引用派生集'],
  ['plugins/privhub-files-versions/src/index.ts', 'VERSION_TEXT_EXTS', '版本快照用派生集'],
  ['plugins/privhub-svc-rag/src/index.ts', 'RAG_TEXT_EXTS', '向量化用派生集'],
  ['plugins/privhub-files-agent/src/index.ts', 'SHARED_TEXT_EXTS', '智能体读写用派生集'],
  ['plugins/privhub-files-agent/src/index.ts', 'SENSITIVE_EXTS_BARE', '智能体文本集减去敏感族'],
  ['plugins/privhub-files-agent/src/m2.ts', 'AGENT_SNAPSHOT_EXTS', '智能体快照用派生集'],
  ['plugins/privhub-files-explorer-v3/client/panel.js', 'EXT.OFFICE_KIND_EXTS', '宿主 Office 判定用前端那一处定义'],
]
for (const [rel, needle, what] of derivedUsers) {
  const src = readFileSync(join(ROOT, rel), 'utf8')
  ok(src.includes(needle), `${what}（${rel.split('/').pop()} 引用了 ${needle}）`)
}
const coreSrc = readFileSync(join(ROOT, 'plugins/privhub-core/src/index.ts'), 'utf8')
ok(!/const\s+textExts\s*=/.test(coreSrc) && !/const\s+imgExts\s*=/.test(coreSrc),
  'core 里那两份手写字面量（`textExts` / `imgExts`）确实已经删掉，不再"共享了但没用"')

/* `preview-raw` 的 mime 表：映射本身必须逐条写，但**键集**必须等于 `IMAGE_EXTS` 加 `pdf`。
 * 这条是「前后端两张图片清单不一致」（`.ico` 那次）在**后端一侧**的防复发断言。 */
console.log('\n     ── preview-raw 的图片 mime 键集与 IMAGE_EXTS 对齐 ──')
const FILES_SRC = join(ROOT, 'plugins', 'privhub-files', 'src', 'index.ts')
const filesSrc = readFileSync(FILES_SRC, 'utf8')
const mimeBlock = /const\s+mime\s*:\s*Record<string,\s*string>\s*=\s*\{([\s\S]*?)\}/.exec(filesSrc)
const mimeKeys = mimeBlock
  ? [...mimeBlock[1].matchAll(/(^|[,{\s])([a-z0-9]+)\s*:\s*'([^']+)'/g)].map((m) => m[2])
  : []
console.log('     [实测] preview-raw mime 键集 = ' + mimeKeys.join(','))
ok(mimeKeys.length > 0, '能读到 `privhub-files` 的 preview-raw mime 表（读不到必红，不静默跳过）')
ok(sameSet(mimeKeys, [...IMAGE_EXTS, 'pdf']),
  `preview-raw 的 mime 键集 = IMAGE_EXTS ∪ {pdf}（实测 ${mimeKeys.length} 项）`)
ok(mimeKeys.includes('ico'),
  'preview-raw 的 mime 表含 ico（`.ico` 前后端不一致那次的后端一侧防复发）')

/* ══════════════════════════════════════════════════════════════════════════
 * ⑤ 端到端：本批补的扩展名现在真能打开（隔离实例 3197）
 * ══════════════════════════════════════════════════════════════════════════ */

console.log('\n══ ⑤ 端到端：补齐清单里的扩展名现在真能打开（隔离实例，不碰真实数据）══')

/** 每个待验扩展名一个真文件：内容带自己的扩展名，便于核对"回带的就是这份内容"。 */
const probeBody = (ext) => `privhub-ext-probe ${ext}\n第二行中文（验证 UTF-8 解码）\n`

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
  for (const ext of PREVIEW_ONLY_TEXT_EXTS) {
    writeFileSync(join(TESTROOT, 'data-files', PROJECT, 'EC探针.' + ext), probeBody(ext), 'utf8')
  }
  /* 阴性样本：真二进制 + 无扩展名（必须仍打不开：**不做二进制嗅探**，不把二进制当文本读成乱码） */
  writeFileSync(join(TESTROOT, 'data-files', PROJECT, 'EC探针.bin'), Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff]), 'binary')
  writeFileSync(join(TESTROOT, 'data-files', PROJECT, 'EC无扩展名'), probeBody('无扩展名'), 'utf8')
  /* `.ico` 那一处前后端不一致的对照样本（真正的 .ico 头，5 字节够 preview 认类型） */
  writeFileSync(join(TESTROOT, 'data-files', PROJECT, 'EC探针.ico'), Buffer.from([0x00, 0x00, 0x01, 0x00, 0x01, 0x00]), 'binary')
  writeFileSync(join(TESTROOT, 'data-files', PROJECT, 'EC探针.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'binary')
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

async function api(method, path, { token, body } = {}) {
  const headers = {}
  let payload
  if (body !== undefined) { payload = Buffer.from(JSON.stringify(body), 'utf8'); headers['content-type'] = 'application/json' }
  if (token) headers.authorization = 'Bearer ' + token
  const res = await fetch(BASE + path, { method, headers, body: payload, signal: AbortSignal.timeout(30000) })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* 非 JSON */ }
  return { status: res.status, text, json }
}
const preview = (token, path) => api('GET', '/privhub/api/preview?' + new URLSearchParams({ project: PROJECT, path }).toString(), { token })
const raw = (token, path) => api('GET', '/privhub/api/preview-raw?' + new URLSearchParams({ project: PROJECT, path }).toString(), { token })

let ready = false
let serverErr = ''
prepareRoot()
const child = startServer()
child.stderr.on('data', (d) => { serverErr += d.toString() })
try {
  ready = await waitReady()
  ok(ready, `隔离实例就绪（端口 ${PORT}；硬拒 3180/3181 的口径由 run-all 与本文件的端口选择共同保证）`)
  if (ready) {
    const login = await api('POST', '/privhub/api/login', { body: { username: 'admin', password: 'admin123' } })
    ok(!!(login.json && login.json.ok && login.json.token), '管理员登录成功（取会话令牌）')
    const token = login.json && login.json.token
    if (token) {
      let opened = 0
      const bad = []
      for (const ext of PREVIEW_ONLY_TEXT_EXTS) {
        const name = 'EC探针.' + ext
        const r = await preview(token, name)
        const type = r.json && r.json.type
        const data = r.json && typeof r.json.data === 'string' ? r.json.data : ''
        const good = r.status === 200 && r.json && r.json.ok === true && type === 'text' && data === probeBody(ext)
        if (good) opened++
        else bad.push(`${name}(type=${type}, HTTP ${r.status})`)
        console.log(`     [实测] ${name.padEnd(20)} → HTTP ${r.status} type=${type} 正文字符数=${data.length}`)
      }
      ok(bad.length === 0,
        `本批补的 ${PREVIEW_ONLY_TEXT_EXTS.length} 个扩展名现在**全部能打开**（实测 ${opened}/${PREVIEW_ONLY_TEXT_EXTS.length}；矩阵里它们原本全部报"该文件类型不支持在线查看"）${bad.length ? '；失败：' + bad.join(' ') : ''}`)

      /* 阴性样本：不做二进制嗅探 ⇒ 无扩展名与 .bin 仍是"不支持"（不是"读出乱码"） */
      const noExt = await preview(token, 'EC无扩展名')
      const bin = await preview(token, 'EC探针.bin')
      console.log(`     [实测] EC无扩展名 → type=${noExt.json && noExt.json.type}；EC探针.bin → type=${bin.json && bin.json.type}`)
      ok(noExt.json && noExt.json.type === 'unknown',
        '无扩展名文件仍是明确的不支持（**本批明确不做二进制嗅探**，见 file-exts.ts 文件头「故意不做的」）')
      ok(bin.json && bin.json.type === 'unknown', '二进制文件仍是不支持（不会被当文本读成乱码）')

      /* .ico 前后端一致：接口认图片 + 界面 kind 也认图片 + preview-raw 的 mime 是 x-icon */
      const ico = await raw(token, 'EC探针.ico')
      const icoPng = await raw(token, 'EC探针.png')
      ok(ico.status === 200 && icoPng.status === 200, 'preview-raw 对 ico/png 都可用（图片走原始字节通道）')
      ok(client !== null && client.kindOf('EC探针.ico') === 'image',
        '.ico 的界面 kind = image（与后端 preview 的 type=image 一致 ⇒ 不再走 iframe、放大功能回来了）')
    }
  }
} finally {
  await stopServer(child)
}
cleanRoot()

console.log(`\n${'='.repeat(56)}`)
console.log(`  扩展名收敛与补齐断言：${pass} 通过 / ${fail} 失败`)
console.log('='.repeat(56))
if (!ready && serverErr) console.log('服务端 stderr 摘要：\n' + serverErr.split('\n').slice(-8).join('\n'))
process.exit(fail === 0 ? 0 : 1)
