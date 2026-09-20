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
/** 基础集合：Markdown 家族。取值必须与 `file-exts.ts` 的 `MARKDOWN_EXTS` 同值。 */
const MARKDOWN_EXTS = ['md', 'markdown']
/** 基础集合：Office（含 PDF）。取值必须与 `file-exts.ts` 的 `OFFICE_EXTS` 同值。 */
const OFFICE_EXTS = ['doc', 'docx', 'xlsx', 'pptx', 'pdf']
/** 派生：kind 为 `office` 的那一批 = Office 减去 `pdf`（pdf 在界面上走自己的 iframe 分支）。 */
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

/** 供断言与同插件其它模块取用的**冻结视图**（本文件是前端这一侧的唯一出处）。 */
const EXT = Object.freeze({
  IMAGE_EXTS: Object.freeze(IMAGE_EXTS),
  MARKDOWN_EXTS: Object.freeze(MARKDOWN_EXTS),
  OFFICE_EXTS: Object.freeze(OFFICE_EXTS),
  OFFICE_KIND_EXTS: Object.freeze(OFFICE_KIND_EXTS),
  TEXT_EDIT_EXTS: Object.freeze(TEXT_EDIT_EXTS),
  PREVIEW_TEXT_EXTS: Object.freeze(PREVIEW_TEXT_EXTS),
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
 * 它只回答「这个文件该用 img / iframe / office / 文本哪个分支画」。 */
function kindOf(name) {
  const ext = extOf(name)
  if (IMAGE_EXTS.includes(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  if (ext === 'md') return 'md'
  if (OFFICE_KIND_EXTS.includes(ext)) return 'office'
  return 'text'
}

function isEditableText(name) {
  return TEXT_EDIT_EXTS.includes(extOf(name))
}

function rawUrl(project, path) {
  return '/privhub/api/preview-raw?project=' + encodeURIComponent(project) + '&path=' + encodeURIComponent(path)
}
function relPath(project, dir, name) { return dir ? dir + '/' + name : name }

/* 整体缩放（页面字体 A±）：fixed 弹层会随 html zoom 一起缩放，事件坐标（clientX / rect）同为
 * 缩放后的视觉坐标 → 落位前除以 zoom 转回 css 布局坐标；钳制边界同样按 zoom 折算 */
function uiZoom() {
  return parseFloat(getComputedStyle(document.documentElement).zoom) || 1
}

export { tabKey, kindOf, EXT, extOf, TEXT_EDIT_EXTS, isEditableText, rawUrl, relPath, uiZoom }
