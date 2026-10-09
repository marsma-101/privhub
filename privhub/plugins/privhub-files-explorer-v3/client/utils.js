/**
 * utils — 纯工具函数（无状态、无副作用）。
 *
 * ## 【扩展名一处定义】前端这一侧的出处
 *
 * 后端有一处权威定义：`plugins/privhub-core/src/file-exts.ts`
 * （`TEXT_EXTS` / `IMAGE_EXTS` / `MARKDOWN_EXTS` / `OFFICE_EXTS`，各用途从它显式派生）。
 *
 * **浏览器侧拿不到它**，这是硬约束逼出来的、不是偷懒：
 *   · 静态服务映射是 `/privhub-plugins/<插件名>/<文件>` → `plugins/<插件名>/client/<文件>`，
 *     `plugins/privhub-core/src/` 根本不可达（`src/` 不在映射范围内）；
 *   · 且 `tests/integrity.mjs` 有一条**既有硬断言**：插件 client 模块只许引用同目录文件。
 * ⇒ 于是前端侧的做法是：**本文件就是前端唯一那一处定义**，`kindOf` 与 `isEditableText`
 *   全部从这里的 `EXT` 显式派生，本文件外**不得**再出现扩展名字面量数组。
 *
 * 与后端取值的**一致性由断言钉住**（`tests/file-exts.mjs`：把本文件装进 vm 取 `EXT`，
 * 与 `file-exts.ts` 逐条比对；任何一侧漂了立刻变红）。
 * 本批同时修掉的两处前后端不一致（`docs/reviews/11-格式支持矩阵与铺满修复.md` §2.5 / §1.2）：
 *   · `ico` —— 后端图片清单有、这里的图片清单**没有** ⇒ 图片走了 iframe 分支、失去点击放大。本批补上；
 *   · 图片清单的取值与 `file-exts.ts` 的 `IMAGE_EXTS` 现为**逐项同值**。
 *
 * @module privhub-files-explorer-v3/client/utils
 */

import { api } from './deps.js'

/* ══════════════════════════════════════════════════════════════════════════
 * 前端唯一那一处扩展名定义（基础集合 + 前端自己需要的派生）
 * ══════════════════════════════════════════════════════════════════════════ */

/** 基础集合：图片。取值必须与 `file-exts.ts` 的 `IMAGE_EXTS` 逐项同值（断言守着）。 */
const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico']
/** 基础集合：音频 / 视频。取值必须与 `file-exts.ts` 的 `AUDIO_EXTS` / `VIDEO_EXTS` 逐项同值。
 *  两者**互斥**（后端同一口径）：`ogg` 归音频、`ogv` 归视频 —— 前端只按扩展名分流，
 *  不重叠才不会有"这个扩展名到底用哪个标签"的模糊态。 */
const AUDIO_EXTS = ['mp3', 'wav', 'ogg', 'oga', 'opus', 'aac', 'm4a', 'flac']
const VIDEO_EXTS = ['mp4', 'm4v', 'webm', 'ogv', 'mov', 'qt', '3gp', '3g2', 'avi', 'mkv']
/** 派生：音视频总集。取值必须与后端 `MEDIA_EXTS`（= AUDIO ∪ VIDEO）同值。 */
const MEDIA_EXTS = [...AUDIO_EXTS, ...VIDEO_EXTS]

/**
 * 派生：**浏览器原生能播**的那一批（nowen-note 的 `NATIVE_*_EXTS`，2026-10-09 照抄其口径）。
 *
 * 为什么这份白名单在前端而不在后端：「浏览器能不能解码」是**浏览器事实**，
 * 不是扩展名分类事实 —— 放后端会随前端升级而失真（见 `file-exts.ts` 的 `AUDIO_EXTS` 注释）。
 *
 * 为什么保守：nowen-note 的原话是*宁可降级到"下载提示"也不要黑屏*。
 * `mov/qt/avi/mkv/3gp/3g2` 不在里面 ⇒ 界面画**兜底说明 + 下载入口**（同一份实现的另一条支路），
 * **不是**黑屏，也不是一句含糊的"不支持在线查看"。
 * ⚠ 这里列的是**容器**层面"多数环境认"的集合，具体编解码器（如 mkv 里的 H.264）不一概而论；
 * 真实可播性**未经浏览器实测**（见 `docs/reviews/17-音视频预览.md` §5）。
 */
const NATIVE_VIDEO_EXTS = ['mp4', 'm4v', 'webm', 'ogv']
const NATIVE_AUDIO_EXTS = ['mp3', 'wav', 'ogg', 'oga', 'opus', 'aac', 'm4a', 'flac']
/** 基础集合：Markdown 家族。取值必须与 `file-exts.ts` 的 `MARKDOWN_EXTS` 同值。 */
const MARKDOWN_EXTS = ['md', 'markdown']
/** 基础集合：Office 读取链（含 PDF）。取值必须与 `file-exts.ts` 的 `OFFICE_EXTS` 同值。
 *  **不含 `xls`/`ppt`**：它们是 Office 文件但不在读取链里（`.ppt` 全仓无人能读、`.xls` 只在
 *  `files-office` 的提取链上）—— 口径与理由见 `file-exts.ts` 文件头「Office 那一族的口径」。
 *  界面「✏️ 编辑」分支取的就是这一份，所以它必须与后端读取链**同源**：多一项＝点了没反应。 */
const OFFICE_EXTS = ['doc', 'docx', 'xlsx', 'pptx', 'pdf']
/** 派生：kind 为 `office` 的那一批 = Office 读取链减去 `pdf`（pdf 在界面上走自己的 iframe 分支）。 */
const OFFICE_KIND_EXTS = OFFICE_EXTS.filter((e) => e !== 'pdf')

/**
 * 派生：**可内嵌编辑**的文本扩展名。取值与 `edit-md/client/index.js` 的 `EDITABLE_TEXT_EXTS`
 * **逐项同值**（断言守着），本批**一字未扩一字未减**。
 *
 * 为什么 `md` 在里面：编辑入口 `edit-md` 的 `openEditor()` 第一句就是 `isEditableText(e.name)` 闸，
 * 界面上多处 `entry:open`（右键「编辑」、详情面板按钮）**不带** `md` 的额外放行条件 ⇒
 * 把 `md` 拿掉会让「右键 .md 选编辑」变成点了没反应。它是既有行为的一部分，**不动**。
 * 为什么 `html`/`htm` 不在里面：预览出的是源码而非渲染结果，给编辑入口会误导（既有选择，保留）。
 * 本批新增的预览类（`tsx/ps1/conf/vue/go/rs/env/jsonl/tsv/ipynb`）**不进**编辑集 —— 本批只补预览。
 */
const TEXT_EDIT_EXTS = ['md', 'txt', 'json', 'csv', 'log', 'yaml', 'yml', 'ini', 'py', 'sh', 'bat', 'sql', 'xml', 'js', 'ts', 'css']

/**
 * 派生：**可预览为文本**的扩展名（= 可编辑 ∪ md 家族 ∪ 本批补的纯文本类）。
 * 语义与后端 `readFileForPreview` 的文本分支一致 —— 判定「这个文件到底怎么打开」的始终是
 * **接口回带的 type**，这份清单只用于界面分类与断言比对，不替代接口结论。
 */
const PREVIEW_TEXT_EXTS = [
  ...TEXT_EDIT_EXTS, ...MARKDOWN_EXTS,
  'html', 'htm', 'toml', 'java', 'c', 'cpp', 'tsx', 'ps1', 'conf', 'vue', 'go', 'rs',
  'env', 'jsonl', 'tsv', 'ipynb',
]

/**
 * 派生：只读预览里按【表格】渲染的扩展名（结构化文本）。
 *
 * 语义**只是「怎么画」**，不表示「能不能打开」—— 后者仍由后端 `readFileForPreview`
 * 回带的 `type` 说了算（这两个扩展名本来就在 `PREVIEW_TEXT_EXTS` 里，能打开）。
 * 与 `OFFICE_KIND_EXTS` 同类：前端自己的显示口径，后端没有对应概念、也不需要。
 */
const TABLE_TEXT_EXTS = ['csv', 'tsv']

/**
 * 派生：只读预览里按【美化 JSON】渲染的扩展名。
 *
 * 同上：只影响画法。解析失败或体量过大时回落到纯文本（`content.js` 的 `structuredView`），
 * 绝不因为"美化不了"而让文件打不开。
 */
const JSON_TEXT_EXTS = ['json']

/** 供断言与同插件其它模块取用的**冻结视图**（本文件是前端这一侧的唯一出处）。 */
const EXT = Object.freeze({
  IMAGE_EXTS: Object.freeze(IMAGE_EXTS),
  MARKDOWN_EXTS: Object.freeze(MARKDOWN_EXTS),
  OFFICE_EXTS: Object.freeze(OFFICE_EXTS),
  OFFICE_KIND_EXTS: Object.freeze(OFFICE_KIND_EXTS),
  TEXT_EDIT_EXTS: Object.freeze(TEXT_EDIT_EXTS),
  PREVIEW_TEXT_EXTS: Object.freeze(PREVIEW_TEXT_EXTS),
  TABLE_TEXT_EXTS: Object.freeze(TABLE_TEXT_EXTS),
  JSON_TEXT_EXTS: Object.freeze(JSON_TEXT_EXTS),
  MEDIA_EXTS: Object.freeze(MEDIA_EXTS),
  AUDIO_EXTS: Object.freeze(AUDIO_EXTS),
  VIDEO_EXTS: Object.freeze(VIDEO_EXTS),
  NATIVE_VIDEO_EXTS: Object.freeze(NATIVE_VIDEO_EXTS),
  NATIVE_AUDIO_EXTS: Object.freeze(NATIVE_AUDIO_EXTS),
})

/** 取归一化扩展名：去前导点、转小写；**无扩展名返回空串**（不兜底成任何类型）。 */
function extOf(name) {
  const s = String(name == null ? '' : name)
  const i = s.lastIndexOf('.')
  // 前导点在首位（`.gitignore` 这类）或结尾无扩展名 ⇒ 空串
  if (i <= 0 || i === s.length - 1) return ''
  return s.slice(i + 1).toLowerCase()
}

const tabKey = (project, path) => project + '|' + path

/* 界面分类（模板按 kind 选渲染分支）。取值一律来自上面的 EXT，不在这里写字面量。
 * 注意：`kindOf` **不是**「能不能打开」的判据 —— 后端 `readFileForPreview` 的 `type` 才是。
 * 它只回答「这个文件该用 img / iframe / office / 文本 / 媒体哪个分支画」。
 * ⚠ `'media'` 只表示"走媒体分支"，不表示"能播" —— 能不能播由 `mediaTagOf` 再判一次。 */
function kindOf(name) {
  const ext = extOf(name)
  if (IMAGE_EXTS.includes(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  if (MEDIA_EXTS.includes(ext)) return 'media'
  if (ext === 'md') return 'md'
  if (OFFICE_KIND_EXTS.includes(ext)) return 'office'
  return 'text'
}

/**
 * 媒体该用哪个标签画：`'video'`（含"播不了"的兜底支路，见下）/ `'audio'` / `''`（不是媒体）。
 *
 * 只按扩展名分流（与后端同一口径，不做 mime 嗅探）：
 *   · 在 `AUDIO_EXTS` 里 ⇒ `'audio'`（用 `<audio>`）；
 *   · 其余在 `VIDEO_EXTS` 里 ⇒ `'video'`（用 `<video>`；浏览器播不了时同一支路画兜底说明）。
 * `'video'` 这个返回值**不代表一定能播** —— 能播与否由 `NATIVE_VIDEO_EXTS` 在组件里另判，
 * 这样"是媒体"与"能播"两件事在代码里也分开（与后端的分层一致）。
 */
function mediaTagOf(name) {
  const ext = extOf(name)
  if (AUDIO_EXTS.includes(ext)) return 'audio'
  if (VIDEO_EXTS.includes(ext)) return 'video'
  return ''
}

/** 这个媒体名**能不能被浏览器原生播放**（白名单见 `NATIVE_*_EXTS` 的注释）。 */
function isNativeMedia(name) {
  const ext = extOf(name)
  return NATIVE_AUDIO_EXTS.includes(ext) || NATIVE_VIDEO_EXTS.includes(ext)
}

function isEditableText(name) {
  return TEXT_EDIT_EXTS.includes(extOf(name))
}

/**
 * 只读预览的「结构化渲染模式」：`'table'`（csv/tsv）| `'json'`（json）| `''`（按纯文本）。
 *
 * 这是 nowen-note 的 `detectRenderMode` 在本仓的对应物：同一条文本预览分支里，
 * 按内容形态再分一次「怎么画」。与 `kindOf` 分工一样 —— `kindOf` 决定走哪条大分支
 * （img / iframe / office / 文本），本函数只在**文本分支内部**决定用表格 / 美化 / 原文。
 * 空串 = 既有行为（`<pre>` 纯文本），所以不认识的名字不会被改变。
 */
function textModeOf(name) {
  const ext = extOf(name)
  if (TABLE_TEXT_EXTS.includes(ext)) return 'table'
  if (JSON_TEXT_EXTS.includes(ext)) return 'json'
  return ''
}

function rawUrl(project, path) {
  return '/privhub/api/preview-raw?project=' + encodeURIComponent(project) + '&path=' + encodeURIComponent(path)
}

/** 下载直链（`<a href>` 用）。与 `rawUrl` 成对：预览走 `preview-raw`、留存走 `download`。
 *  媒体兜底支路（浏览器播不了那种格式）给的就是这条 —— 「换个地方打开」是本仓一贯的出路写法。 */
function downloadUrl(project, path) {
  return '/privhub/api/download?project=' + encodeURIComponent(project) + '&path=' + encodeURIComponent(path)
}
function relPath(project, dir, name) { return dir ? dir + '/' + name : name }

/* 整体缩放（页面字体 A±）：fixed 弹层会随 html zoom 一起缩放，事件坐标（clientX / rect）同为
 * 缩放后的视觉坐标 → 落位前除以 zoom 转回 css 布局坐标；钳制边界同样按 zoom 折算 */
function uiZoom() {
  return parseFloat(getComputedStyle(document.documentElement).zoom) || 1
}

export { tabKey, kindOf, mediaTagOf, isNativeMedia, textModeOf, EXT, extOf, TEXT_EDIT_EXTS, isEditableText, rawUrl, downloadUrl, relPath, uiZoom }
