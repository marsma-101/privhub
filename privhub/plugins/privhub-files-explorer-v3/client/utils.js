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
 *
 * `mindmap`（思维导图，2026-10-17）与后端 `file-exts.ts` 的 `TEXT_EXTS` 末尾那一项同源：
 * 它是一份纯文本缩进大纲，必须能预览才有正文可渲染（`tests/file-exts.mjs` 逐项同值守着）。
 */
const PREVIEW_TEXT_EXTS = [
  ...TEXT_EDIT_EXTS, ...MARKDOWN_EXTS,
  'html', 'htm', 'toml', 'java', 'c', 'cpp', 'tsx', 'ps1', 'conf', 'vue', 'go', 'rs',
  'env', 'jsonl', 'tsv', 'ipynb', 'mindmap',
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

/* ══════════════════════════════════════════════════════════════════════════
 * 文件内容 URL 工厂（前端**唯一**一处定义）
 *
 * 读路径有两条，都从本文件出发，别处不许再拼字符串：
 *   ① 直读（新）：`/f/<fileId>` —— nginx 按主索引给的不透明 ID 直接吐字节。
 *      URL 里只有 ID：不带项目名、不带虚拟路径 ⇒ 改名/移动不换 URL，也没有中文/空格/
 *      `#`/`?` 的编码面（`fileId` 是 `[A-Za-z0-9]` 串，天然无需 `encodeURIComponent`）。
 *   ② 回退（老路）：`/privhub/api/preview-raw?project=&path=` —— **必须保留**。
 *      条目没有 `id` 的场合一个都不能当成异常：老数据、索引还没就绪（主索引首次扫描中）、
 *      索引服务没挂、条目来自会话恢复的旧标签。任一处"没 ID 就报错/白屏"，
 *      用户看到的都是"存量文件突然打不开了"。
 *
 * 谁来决定走哪条：**只有 `contentUrlFor` 一处**（`fileContentUrl` 拿不到合法 ID 就返回空串）。
 * 调用方一律写成 `contentUrlFor(...)`，不要自己写 `id ? … : …` —— 那样回退逻辑就会分裂成 N 份，
 * 将来改一半就会出现"列表能开、标签开不了"这种最难查的分裂行为。
 *
 * ⚠ 骨架（`frontend/index.html`）与 office2 的 iframe 页面（`view.html`）**无法 import 本文件**
 *   （no-build + `tests/integrity.mjs`「插件 client 模块只引用同目录文件」），
 *   它们各有一处**逐字同口径**的镜像，注释里互相点名。改口径时三处一起改。
 * ══════════════════════════════════════════════════════════════════════════ */

/** 直读路由前缀（与 `runtime/nginx.conf.template` 的 `location ~ ^/f/…` 对应）。 */
const FILE_CONTENT_PREFIX = '/f/'

/** ID 的合法形状：只允许 URL 安全字符（不是"认识的 ID 才算"，是"不认识的一律不信"）。 */
const FILE_ID_RE = /^[A-Za-z0-9_-]+$/

/**
 * 从文件名里取扩展名（小写、不含点；无扩展名返回空串）。
 * 与后端 `fileindex/core.ts` 的 `extOf` 同口径 —— 两处必须一致，否则
 * 「索引说 ext=x、URL 拼出来是 y」会让 nginx 按错的扩展名给 MIME。
 */
function extOfName(name) {
  const n = typeof name === 'string' ? name : ''
  const i = n.lastIndexOf('.')
  if (i <= 0 || i === n.length - 1) return ''
  return n.slice(i + 1).toLowerCase()
}

/**
 * 文件内容的直读 URL：`/f/<fileId>.<ext>`。
 *
 * ## 为什么必须带扩展名（这不是美观问题，是功能问题）
 *
 * nginx 在处理 `X-Accel-Redirect` 后，**按 URL 的扩展名重算 `Content-Type`，
 * 上游的 `Content-Type` 会被忽略**（实测：让 Node 发 `application/json` 去传
 * `.mp4`，最终响应仍是 `video/mp4`）。
 *
 * 所以裸 `/f/<id>`（无扩展名）会让 nginx 落到 `default_type` =
 * `application/octet-stream` —— 图片不显示、视频不播放、SVG 的严格 CSP 也挂不上。
 * 这个差异**只在明文提速开启后出现**（默认走 Node 降级时 MIME 由 Node 正确给出），
 * 所以本地不开明文测不出来，最容易漏。
 *
 * 扩展名只取最后一次点之后（`报告.tar.gz` → `gz`），与后端的 `extOf` 一致；
 * 后端 `resolvePhysical` 也是用 `ext` 拼物理文件名，两边同一个口径。
 *
 * @param {string} fileId 主索引的稳定 ID
 * @param {string} [name] 文件名（含扩展名）；不传则拼裸 ID（能读，但 MIME 会退化）
 * @returns {string} 合法 ID → 直读地址；没有/形状不对 → **空串**（调用方据此回退老路）
 */
function fileContentUrl(fileId, name) {
  const id = typeof fileId === 'string' ? fileId.trim() : ''
  if (id === '' || !FILE_ID_RE.test(id)) return ''
  const ext = extOfName(name)
  return FILE_CONTENT_PREFIX + id + (ext ? '.' + ext : '')
}

/**
 * **唯一决策点**：这个文件的内容该从哪读。
 * 有稳定 ID ⇒ `/f/<id>.<ext>`；没有 ⇒ 原来的 `preview-raw`（存量数据必须照开）。
 *
 * `name` 是必须传的：它决定 URL 扩展名，而扩展名决定 nginx 给的 MIME。
 */
function contentUrlFor(project, path, fileId, name) {
  /* name 缺省时从 path 的最后一段兜底 —— 调用方大多手上只有 path。 */
  const fileName = typeof name === 'string' && name !== '' ? name : String(path ?? '').split('/').pop() ?? ''
  return fileContentUrl(fileId, fileName) || rawUrl(project, path)
}

/**
 * 内容记录用的 `{ url, fallbackUrl? }`：`url` 是**首选**，`fallbackUrl` 只在两者不同时出现。
 *
 * 为什么还要带一把回退：`/f/<id>` 是 nginx 侧的路由，蓝绿部署里才有。当前这条路由
 * 由另一个改动落地（`runtime/nginx.conf.template` + `/api/file-auth`）；在它上线之前、
 * 或某个部署里 nginx 没配这条 location，直读会 404、池里还是密文时浏览器会解码失败。
 * 那种场合**浏览器才知道**（图片/音视频的 `error` 事件），所以把老地址一起交给模板，
 * 由视图在失败时切回去 —— 而不是在 JS 里猜"路由在不在"。
 *
 * ⚠ 回退**不覆盖** PDF：`<iframe>` 的失败不可靠（404 也能"成功"渲染一个错误页），
 * 这一条如实写在 panel.js 的模板注释里，不假装能兜住。
 */
function contentUrls(project, path, fileId, name) {
  const primary = contentUrlFor(project, path, fileId, name)
  const legacy = rawUrl(project, path)
  return primary === legacy ? { url: primary } : { url: primary, fallbackUrl: legacy }
}

function rawUrl(project, path) {
  return '/privhub/api/preview-raw?project=' + encodeURIComponent(project) + '&path=' + encodeURIComponent(path)
}

/** 下载直链（`<a href>` 用）。与 `rawUrl` 成对：预览走 `preview-raw`、留存走 `download`。
 *  媒体兜底支路（浏览器播不了那种格式）给的就是这条 —— 「换个地方打开」是本仓一贯的出路写法。
 *
 *  ⚠ 下载**不**改走 `/f/<id>`：下载要文件名（`Content-Disposition`）、要服务端解密，
 *  这两件事都在 `/api/download` 里；`/f/` 只负责"把内容显示出来"。 */
function downloadUrl(project, path) {
  return '/privhub/api/download?project=' + encodeURIComponent(project) + '&path=' + encodeURIComponent(path)
}

/**
 * 把工厂挂到跨插件桥（`window.PrivHub`）上，其它插件一律从这里取。
 * 为什么能这么做：`window.PrivHub` 本就是唯一的跨插件通道（`viewers` 注册表也是这么挂的），
 * 而 utility 模块又不许跨插件 import —— 桥是唯一合法出口。
 * `typeof window` 守卫是硬要求：`tests/file-exts.mjs` 把本文件装进 vm 取 `EXT`，那里没有 window。
 */
function publishFileUrlFactory() {
  /* 两道守卫都是必需的，不是防御性冗余：
   *   · `typeof window === 'undefined'` —— `tests/file-exts.mjs` 把本文件装进 vm 取 `EXT`，那里没有 window；
   *   · `window` 存在但为 `null` —— `tests/personal-ui.mjs` 的沙箱显式给了 `window: null`
   *     （只测纯函数，不测桥）。少了这一道，`window.PrivHub` 会当场 TypeError，把整个沙箱跑成红的。 */
  const w = typeof window === 'undefined' ? null : window
  if (!w) return
  const P = w.PrivHub
  if (!P) return
  // 不覆盖既有实现：先到者为准（骨架/其它模块若已提供同口径函数，保留它）
  if (typeof P.fileContentUrl !== 'function') P.fileContentUrl = fileContentUrl
  if (typeof P.contentUrlFor !== 'function') P.contentUrlFor = contentUrlFor
  if (typeof P.contentUrls !== 'function') P.contentUrls = contentUrls
}
publishFileUrlFactory()
function relPath(project, dir, name) { return dir ? dir + '/' + name : name }

/* 整体缩放（页面字体 A±）：fixed 弹层会随 html zoom 一起缩放，事件坐标（clientX / rect）同为
 * 缩放后的视觉坐标 → 落位前除以 zoom 转回 css 布局坐标；钳制边界同样按 zoom 折算 */
function uiZoom() {
  return parseFloat(getComputedStyle(document.documentElement).zoom) || 1
}

export {
  tabKey, kindOf, mediaTagOf, isNativeMedia, textModeOf, EXT, extOf, TEXT_EDIT_EXTS, isEditableText,
  rawUrl, downloadUrl, relPath, uiZoom,
  /* 文件内容 URL 工厂（本文件是前端唯一出处；`contentUrlFor` / `contentUrls` 是唯一决策点） */
  fileContentUrl, contentUrlFor, contentUrls, FILE_CONTENT_PREFIX, FILE_ID_RE,
}
