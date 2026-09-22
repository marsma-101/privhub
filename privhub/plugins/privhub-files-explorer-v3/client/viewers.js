/**
 * viewers — 内容区 viewer 契约（**宿主侧**实现）。
 *
 * 设计依据：`docs/reviews/10-内容区所有权与docx残留-方案.md` §6「等价设计：所有权 + 契约」。
 * 一句话：**宿主当老板，插件递名片** —— 插件只声明「我能开哪类文件」，
 * 由宿主决定「现在该谁上场」，并由宿主负责挂载、卸载、清场。
 *
 * ── 三条铁律（方案 §6.1） ──────────────────────────────────────────────
 *   1. 只有宿主（privhub-files-explorer-v3）可以增删 `.v3-content` 的子节点。
 *   2. 其它插件只能通过宿主发给它的**挂载点** `.v3-viewer-host` 工作；
 *      插件的任何节点不得成为 `.v3-content` 的直接子节点。
 *   3. 插件的 CSS 不得声称拥有 `.v3-content`（`.v3-content:has(…)` 一律视为越权）。
 *
 * ── 为什么走宿主注册表，而不是给 manifest 加 `viewers` 字段 ────────────
 *   `manifest.json` 由 `privhub-shell/server/index.ts:55` 扫描，只认 `id` 与 `slots`，
 *   其余字段被忽略；而 `frontend/index.html:832/894` 会把 `window.PrivHub.manifests`
 *   **整体替换**，插件侧拿到的可能是旧引用。让能力清单依赖一个会被整体替换的引用，
 *   等于给未来埋雷。注册表则是插件在自己目录里自包含地声明，卸载 = 删目录 + 删声明。
 *
 * ── 插件侧要写的全部代码（契约形状） ────────────────────────────────────
 *
 *   const stop = window.PrivHub.viewers.register({
 *     id: 'privhub-files-office2',   // 必填；全局唯一，惯例用插件 id
 *     exts: ['.docx', '.xlsx'],      // 必填；扩展名数组，小写带点
 *     priority: 200,                 // 可选；默认 100；数字大的先试，同分【先注册先试】
 *     mount(hostEl, ctx) {           // 必填；只能往 hostEl 里建自己的节点
 *       const frame = document.createElement('iframe')
 *       hostEl.appendChild(frame)
 *       return () => { frame.remove() }        // 返回值 = 卸载时调用的清理函数
 *     },
 *     update(hostEl, ctx) { … },     // 可选；同一个 viewer 换文件时【复用】它（不卸不建）
 *     cleanup(hostEl, ctx) { … },    // 可选；mount 没返回清理函数时用这个兜底
 *   })
 *   // 组件 beforeUnmount 里必须 stop()：插件被卸载 → 声明消失 → 零残留
 *
 *   ctx = { project, path, name, key, ext }
 *
 * ── 总线事件总表（内容区这一片的**唯一出处**；改事件名先看这张表） ──────
 *
 * 本模块是「内容区归谁、退场按什么顺序」的契约落点，所以这张表放在这里。
 * 以前这些事实**散在三处**（本文件头、`panel.js:86-136`、`content.js:54-59`），
 * 谁想查「`md:interrupt` 到底谁发谁收」得把三个文件翻一遍 —— 现在集中到这一张。
 *
 * 口径：**只列 `bus` 上的事件**（骨架 `window.PrivHub.bus`）。同一片地里还有两条
 * **不是事件**的线（锚点选择器 `.v3-viewer-host` / `.v3-editor-host`，由宿主模板创建、
 * 插件自己往里建节点）与一份**句柄而不是事件**的注册表（`window.PrivHub.viewers`）——
 * 它们不走事件路由，别按事件名去找。**当前没有 `v3:viewer-host` 这个事件**（0 处 emit / 0 处 on），
 * viewer 的挂载点由宿主**写出**（`panel.js:782` 的 `<div class="v3-viewer-host" data-viewer="none"></div>`），
 * 不是发出来的；本表的信息项那一行就是这条事实本身，机器断言会守着它（见下）。
 *
 * **第三类：`scope=out`** —— 内容区是这些事件的一端，**另一端在那一片地之外**
 * （详情面板 / 目录树 / ops / dataview / favorites / upload / invite / trash / db 那几家）。
 * 它们也要登记：不登记就等于「有个名字从内容区进进出出、但没人说得清它算什么」，
 * 正是本表要消灭的那种散落。本批**只管登记、不动这些线路**（不改任何一家的行为）。
 *
 * | 事件 | 方向 | 载荷 | 语义 | 地界 | scope |
 * |---|---|---|---|---|---|
 * | `v3:editor-host-ask` | 插件 → 宿主 | `{ project, path }` | 「现在能不能内嵌？」（同步问） | 发起：`edit-md`；答：`panel.js` 的 `editorHostInfo()` | bus |
 * | `v3:editor-host` | 宿主 → 插件 | `{ available, key, selector, reason }` | 答「能/不能」。`reason:'ask'` 是**回答**；其余（`activeKey` / `content` / `host-gone` / `panel-teardown`）=「舱位没了，请你先捕获、先保存、再退场」 | 发：`panel.js` 的 `syncEditorHost()` / `beforeUnmount()`；收：`edit-md` | bus |
 * | `v3:editor-state` | 插件 → 宿主 | `{ open, project, path, reason }` | 编辑态开/关 → 宿主写响应式 `editorLayout` → 内容区类 `.v3-content--editor`（布局归宿主） | 发：`edit-md`；收：`panel.js` 的 `setEditorLayout()` | bus |
 * | `md:editor-lifecycle` | 插件 → 宿主 | `{ kind, project, path, reason, bytes? }` | 顺序取证：`save-capture` / `editor-close` → 宿主 relay 进 `viewers.lifecycle`（与 viewer 挂载/卸载**同一份流水**） | 发：`edit-md` 的 `noteLife()`；收：`panel.js` 的 `noteEditorLifecycle()` | bus |
 * | `v3:md-root` | 宿主 → 插件 | `{ el, project, key, reason }` | 渲染根交接：`el` = md 预览根的**节点引用**，可为 `null`（此刻没有渲染根）。在 `$nextTick` 里发（渲染**之后**） | 发：`panel.js` 的 `noticeMdRoot()`；收：`privhub-files-comments` | bus |
 * | `md:interrupt` | 宿主 → 插件 | `{}` | 「编辑器要没了，静默保存」（**没有回包**，同步派发）。发点必须排在改 `store.activeKey` **之前** | 发：`tabs.js:53/69/84`、`panel.js:228`（切目录）；收：`edit-md`（→ `leaveInline`）＋ `viewers.js`（保存意图取证点） | bus |
 * | `md:changed` | 插件 → 宿主 | `{ project, path }` | 「这个文件的正文变了，去重载」（保存 / 回滚成功后） | 发：`edit-md`、`privhub-files-versions`；收：`panel.js:668` | out |
 * | `md:opened` | 插件 → 宿主 | `{ project, path }` | 「编辑器开了这个文件」。**当前无监听方**（有发无听，`08-连线契约.md` §4.1 已备案） | 发：`edit-md` 的 `openEditor()` | bus |
 * | `file:saved` | 插件 → 宿主 | `{ project, path, name }`（**无 `doc`**） | 「已落盘」→ Git 即时备份钩子。⚠ 后端有个**同名**事件要 `{project,path,doc}`，只是名字撞了，不是同一条契约 | 发：`edit-md` 的 `save()`；前端当前无监听方 | bus |
 * | `entry:open` | 多方 → 插件 | `{ entry, project, path }` | 「开这个文件」→ 编辑器开（浮层/内嵌由舱位决定） | 发：`detail.js` / `ops.js` / `panel.js`；收：`edit-md` | out |
 * | `md:auto-edit` | 宿主 → 插件 | `{ entry, project, path }` | 「内容区打开了一个可编辑文本 → 自动进编辑态」（体积超限时宿主**不发**，改只读呈现） | 发：`content.js:82`；收：`edit-md` | bus |
 * | `md:dirty` | 插件 → 宿主 | `{ project, path, dirty }` | 脏标记 → 标签标题那个 ● | 发：`edit-md`；收：`panel.js:683` | out |
 * | `v3:tab-opened` | 宿主内部 | `{ project, path, name }` | 打开标签的旁路通知。处理函数是**空函数**（占位） | `tabs.js:64` 发、`panel.js:688` 收 | out |
 * | `office:edit` | 内容区 → office-ui | `{ entry, project, path }` | 「用 Office 浮层编辑这个文件」 | 发：`detail.js:134`、`ops.js:270`、`panel.js:433`；收：`privhub-files-office-ui` | out |
 * | `file:comments` | 内容区 → comments | `{ entry, project, path }` | 「打开这个文件的批注面板」 | 发：`detail.js:147`；收：`privhub-files-comments` | out |
 * | `file:versions` | 内容区 → versions | `{ entry, project, path }` | 「看这个文件的版本历史」 | 发：`detail.js:150`；收：`privhub-files-versions` | out |
 * | `md:genpage` | 内容区 → mdpage | `{ entry, project, path }` | 「把这份 md 生成为页面」 | 发：`detail.js:148`；收：`privhub-files-mdpage` | out |
 * | `html:publish` | 内容区 → publish | `{ entry, project, path }` | 「发布这份 html」 | 发：`detail.js:149`；收：`privhub-files-publish` | out |
 * | `fav:add` | 内容区 → favorites | `{ entry, project, path }` | 「把这一项加进收藏」 | 发：`detail.js:104`、`ops.js:201`；收：`privhub-shell-favorites` | out |
 * | `trash:changed` | 内容区 → trash-ui | `{ id, project, path }` | 「回收站变了，刷新」 | 发：`ops.js:180`、`panel.js:645/679`；收：`privhub-trash-ui` 等 | out |
 * | `files:refresh` | 内容区 → 目录树 | `{ project, path }` | 「文件列表变了，刷目录树缓存」 | 发：`ops.js:253`（另有 `privhub-files-template`）；收：`panel.js:681` → `refreshTree()` | out |
 * | `upload:request-dir` | 内容区 → upload | `{ project, path }` | 「往这个目录传文件」 | 发：`panel.js:532`、`tree.js:103`；收：`privhub-files-upload` | out |
 * | `invite:open` | 内容区 → invite | `{ project }` | 「打开邀请面板」 | 发：`panel.js:539`；收：`privhub-files-invite` | out |
 * | `dataview:new` | 目录树 → dataview | `{ project, path }` | 「在这里新建数据视图」 | 发：`tree.js:101`；收：`privhub-files-dataview` | out |
 * | `file:trash` | 内容区 → （无监听） | `{ id, project, path }` | 「删了这些文件」。**有发无听**（`08-连线契约.md` §4.1 已备案；骨架那一发 payload 形状与这里不一致） | 发：`ops.js:181`；收：**无** | out |
 * | `v3:viewer-host` | —— | —— | **不存在这个事件**（0 处 emit / 0 处 on）。viewer 的挂载点是**选择器** `.v3-viewer-host`（`HOST_SELECTOR`），由宿主模板写出、插件只往里建节点 | —— | info |
 * | ~~`v3:md-rendered`~~ | —— | —— | **已作废**（emit/on 各 0 处；发在 Vue 渲染**之前**，锚点根那时还不存在）。取代它的是 `v3:md-root` | 来历：`content.js:54-59`、`panel.js:130-132` | retired |
 *
 * **这张表不是只写在注释里**：`tests/personal-ui.mjs` 段 M 的断言会
 * ① 从本文件头部（`── 总线事件总表` … 本段结束）**解析出表格里的名字与 `scope`**，
 * ② 扫描范围由表自己给出（不是测试里另写一份名单）：
 *    · `scope=bus` 与 `scope=out` 两个名单**合起来**必须**恰好**覆盖
 *      `explorer-v3/client/**` 与 `edit-md/client/**` 里所有字面量形式的 `bus.*('事件名')`；
 *    · 表里同一行同时标了 `bus` 与 `out`（写法 `` `a`／`out: b ``）表示**同一个范畴**的短名与带前缀名；
 *    · `scope=info` 只做记录（当前只有一条：「`v3:viewer-host` 这个事件**不存在**」），
 *      `scope=retired` 记已作废的名字，两者都不进覆盖比对。
 * ⇒ 多列一个（表里写了、代码里没有）或漏列一个（代码里有、表里没登记）都会变红。
 * ⇒ **新加一条内容区总线线，必须同时进来登记**（哪怕它只是在同一范畴内又开了一个名字）。
 *
 * ── 宿主怎么用（panel.js） ─────────────────────────────────────────────
 *   内容区模板里有一个稳定锚点 `<div class="v3-viewer-host" data-viewer="none"></div>`，
 *   由宿主创建与销毁；`store.activeKey` / `store.content` 变化时调
 *   `session.sync({ host, tab, content })`：
 *     · 解析出 viewer 且与上一个不同 → **先卸旧的、再挂新的**；
 *     · 同类文件之间切换 → **复用**（挂载点不重建、viewer 身份不变、中间不留空窗）；
 *     · 无任何声明 → **回退老路**（宿主自己的 md / text / image / pdf 分支照跑，一字未改）。
 *
 * ── 两条顺序不变式（丢了就是丢未保存内容，比「闪一下」严重得多） ────────
 *
 * **共同前提 —— 为什么顺序是安全的**：切标签时 `tabs.js:53/69/84` 会**先同步** emit
 * `md:interrupt`（编辑器借此静默保存），再改 `store.activeKey`。宿主由 watcher 驱动卸载，
 * 用的是 Vue 默认（pre）flush —— 它排在那个同步块【之后】的微任务里。
 * 两件事合起来 ⇒ **卸载 viewer 必然晚于保存意图**。
 *
 * **不变式 1 · 倒挂**（`checkOrder()` / `violations()`，**语义一个字没改**）：
 *   一次内容切换式卸载（switch / swap / no-viewer）之后、下一次 mount 之前，
 *   不得再出现同一个 key 的 save-intent。倒挂当场 `console.error`。
 *
 * **不变式 2 · 「该发而没发」≠「有意例外」**（`checkSaveIntentCoverage()`，
 * `lifecycle.missingSaveIntents()`；本批**新增**，与不变式 1 并列、互不替代）：
 *   不变式 1 查的是「**发晚了**」，它**故意不查「有没有发过」** —— 因为
 *   `menuCloseAll`（清空全部标签）这类既有路径**本来就不发** `md:interrupt`：
 *   它清的是 tabs/activeKey/content 三件东西，兜底链走的是「宿主发现舱位 key 变了 ⇒
 *   推 `v3:editor-host { available:false }` ⇒ 插件 `leaveInline('host-gone')` ⇒ 先捕获、先发保存」。
 *   那条路**同样不丢字**，所以「没发 `md:interrupt`」本身**不是缺陷**，不许一律报警。
 *
 *   但「**该发保存意图的路径压根没发**」是缺陷，必须单独查出来。两类分开的办法是**给意图带来源标记**：
 *     · 源头：`GET_SAVE_INTENT_SOURCE`（那个函数）由 **tabs.js 在 emit 之前**设为
 *       `tabs.openTab` / `tabs.activateTab` / `tabs.closeTab`（`edit-md` 的应答里复位）；
 *       `budgetSaveIntentSource` 按 `panel.js:228`（切目录）那条路径设 `panel.dirChange`。
 *     · 出处：下面 `SAVE_INTENT_SOURCES` 这张声明表 —— **哪条路径必须发、为什么可能没发、它的代码在哪**。
 *       声明表与实际代码**钉在一起**：`checkSaveIntentCoverage()` 要求每一行的 `before`
 *       都能在 `tabs.js` 里原样找到，且出现在该文件第一处 `store.activeKey =` **之前**。
 *     · 例外：**不登记就是例外**（`menuCloseAll` 不在表里 ⇒ 它那条路不发也不报警）。
 *       要改一个既有路径的口径，就得动这张表 —— 动了表就要回答「为什么」。
 *   ⚠ 本批只**新增**这条不变式与取证点，**不动既有保存时序**、不改 `checkOrder()` 的语义。
 *
 * 两条不变式都不是只写在注释里：`tests/personal-ui.mjs` 段 K2-8/K2-9 跑 `tabs.js` 真身 +
 * `panel.js` 真身方法 + 真 `edit-md` + 真注册表，验「应发类零违规 / 正常时序零违规」，
 * 并各配**阴性对照**（把 `md:interrupt` 删掉、或把兜底链断开 ⇒ 当场变红）。
 *
 * @module privhub-files-explorer-v3/client/viewers
 */

import { bus } from './deps.js'
import { store } from './store.js'

/** 宿主挂载点选择器：插件只认这个（不再认 `.v3-content`）。 */
const HOST_SELECTOR = '.v3-viewer-host'
/** 没有 viewer 上场时锚点上留的值（给 CSS/调试一个明确的初态）。 */
const VIEWER_NONE = 'none'
/** 未声明 priority 时的默认值。 */
const DEFAULT_PRIORITY = 100
/** 顺序流水最多留多少条（只用于取证与自检，不参与渲染）。 */
const LOG_MAX = 200

/* =====================================================================
 * 保存意图的**出处表** + 两个「标一下」的小工具（不变式 2 的机器可查部分）
 *
 * 为什么要出处：`md:interrupt` 是「编辑器要没了，请静默保存」的唯一入口，
 * 但**不是所有退场都走它**（`menuCloseAll` 走舱位兜底链，见文件头）。两者都对的，
 * 分不清就会把「有意例外」当成 bug 报，或者把「该发而没发」漏过去。
 *
 * 规矩两条：
 *   ① `SAVE_INTENT_SOURCES` 里登记的，就是「**该发**」的那几条路；
 *      **不登记 = 有意例外**（目前唯一一条是 `panel.js` 的 `menuCloseAll`）。
 *   ② 表里的 `before` **必须是目标文件里的原文片段**，且出现在**目标文件内**第一处
 *      `store.activeKey =` **之前** —— 这一条由 `tests/personal-ui.mjs` 段 M3 的断言查
 *      （浏览器里拿不到 fs，所以它归测试查，不归运行期查；运行期只查「有没有真发」）。
 *      改动目标文件时，要么让 `before` 仍然命中，要么一起改表（改表就要回答「为什么」）。
 *      ⚠ 范围只说 `tabs.js`：`panel.js` 的 `nav.path` 那条路径是**先改 `activeKey`、再补发
 *      `md:interrupt`**（`panel.js:228`，上面 `syncViewer` 的注释里留了档），它**不在本表内**——
 *      本批不扩范围去改它，这条差异如实记在 `docs/reviews/14-内容区契约收尾.md` 里。
 *
 * `source` 是**瞬时**的：发点用 `reg.via('tabs.openTab', () => bus.emit('md:interrupt', {}))`
 * 把「标记 + 发出」合成一步，两者之间不可能插进别的 `md:interrupt`；发完立刻复位。
 * ===================================================================== */

/** 每一条都是「改 `store.activeKey` **之前**必须发 `md:interrupt`」的路径。 */
const SAVE_INTENT_SOURCES = [
  { source: 'tabs.openTab', file: 'tabs.js', emit: true, note: '打开另一个文件：切换前静默保存', before: "if (store.activeKey && store.activeKey !== key) emitSaveIntent('tabs.openTab')" },
  { source: 'tabs.activateTab', file: 'tabs.js', emit: true, note: '切换到已打开的标签：切换前静默保存', before: "if (store.activeKey && store.activeKey !== key) emitSaveIntent('tabs.activateTab')" },
  { source: 'tabs.closeTab', file: 'tabs.js', emit: true, note: '关闭当前激活标签：关掉前静默保存（这是最后一班车）', before: "if (wasActive) emitSaveIntent('tabs.closeTab')" },
]

/**
 * 当前正在走哪条「会发保存意图」的路径。
 *
 * **只由本模块的 `registry.via()` / `registry.begin()` 设置**（`tabs.js` 只调这两个 API，
 * 不直接碰这个变量）；**唯一的读取方是 `noteSaveIntent()`（取证监听那一端），读即复位**。
 * 读即复位是硬要求：来源只归**这一发** `md:interrupt` 用 —— 若留着不复位，
 * 下一次没人标记的 `md:interrupt`（例如 `menuCloseAll` 那条兜底链）会把上一次的来源捡走，
 * 于是「有意例外」被记成「应发路径」（本批实测到过这个串味：V1b 拿到的来源是别的分支留下的）。
 * 空串 = 来源不明 = **不报**（宁可漏报也不误伤 `menuCloseAll` 这类有意例外）。
 */
let saveIntentSource = ''

/**
 * 取一次保存意图的来源，**读即复位**（`noteSaveIntent()` 是唯一的读取方）。
 * @returns {string} 来源标识；空串 = 这一发不是表里登记的那几条路
 */
function takeSaveIntentSource() {
  const s = saveIntentSource
  saveIntentSource = ''
  return s
}

/**
 * 标着来源做一件同步的事（就是 emit 那一下），**无论成功失败都复位**。
 * `registry.via()` 用的就是它；`noteSaveIntent()` 那边还会再复位一次（双保险：
 * 监听方不在时，`via()` 的 finally 必须把残留值清掉，否则会串到下一次没人标记的 emit 上）。
 * @param {string} source 来源标识（须在 `SAVE_INTENT_SOURCES` 里登记）
 * @param {() => void} fn 同步动作（不接 async：保存意图必须是同步发出去的）
 */
function withSaveIntentSource(source, fn) {
  saveIntentSource = source
  try { fn() } finally { saveIntentSource = '' }
}

/** 扩展名归一化：'DOCX' / 'docx' / '.DOCX' 一律变成 '.docx'；非法返回空串。 */
function normExt(raw) {
  if (typeof raw !== 'string') return ''
  let s = raw.trim().toLowerCase()
  if (!s) return ''
  if (s[0] !== '.') s = '.' + s
  return s
}

/** 从一个文件名取归一化扩展名（'a.DOCX' → '.docx'；无扩展名 → ''）。 */
function extOfName(name) {
  const m = /\.([^.\\/]+)$/.exec(String(name || ''))
  return m ? '.' + m[1].toLowerCase() : ''
}

/* =====================================================================
 * 注册表：插件声明的唯一去处；解析「这个扩展名谁能开」
 * ===================================================================== */

/**
 * 造一个新的注册表。生产环境只会有一个（挂在 `window.PrivHub.viewers`）；
 * 之所以做成工厂，是为了让测试能反复造干净的实例。
 */
function createRegistry() {
  const decls = []              // 注册顺序即同优先级下的定序（先注册先试）
  const byId = new Map()
  const subscribers = new Set()
  const log = []                // 顺序流水（save-intent / mount / update / unmount / reuse …）
  let regSeq = 0
  let logSeq = 0
  let lastMountedKey = ''       // 当前 viewer 正在显示哪个文件（卸载时用来认「这一轮是哪个文件」）
  const reported = new Set()    // 已经喊过的倒挂签名，避免同一个错刷屏
  const reportedMissing = new Set()  // 同上，不变式 2
  const declaredMissing = new Set()  // 「该发而没发」的**声明级**违规（与单次调用无关，只算一次）
  const intentSources = []      // 每一次「进入某条应发保存意图的路径」都记一笔（含是否真的发了）
  let curExpect = null          // 当前正处在哪一条应发路径里

  function note(kind, payload) {
    const e = {
      seq: ++logSeq,
      kind,
      key: (payload && payload.key) || '',
      id: (payload && payload.id) || '',
      reason: (payload && payload.reason) || '',
      source: (payload && payload.source) || '',
      at: Date.now(),
    }
    log.push(e)
    if (log.length > LOG_MAX) log.splice(0, log.length - LOG_MAX)
    reportNewViolations()
    return e
  }

  /**
   * 顺序不变式（只查**倒挂**，不查「有没有发过保存」——后者会误伤
   * `menuCloseAll` 这类本来就不发 `md:interrupt` 的既有路径）：
   *
   *   一次**内容切换式**卸载之后、下一次挂载之前，不得再出现同一个文件 key 的 save-intent。
   *   出现了就说明有人「先把 viewer 卸了、才想起来让编辑器保存」——
   *   那正是丢未保存内容的顺序。
   *
   *   只查内容切换式卸载（switch / swap / no-viewer）：面板整体卸载（teardown）、
   *   内容区被销毁（host-gone）、声明被注销（unregistered）都不是「切文件」，
   *   不在这条准绳的管辖范围内。
   */
  const ORDER_SCOPED = { switch: 1, swap: 1, 'no-viewer': 1 }
  function checkOrder() {
    const bad = []
    for (let i = 0; i < log.length; i++) {
      const u = log[i]
      if (u.kind !== 'unmount' || !ORDER_SCOPED[u.reason]) continue
      for (let j = i + 1; j < log.length; j++) {
        const e = log[j]
        if (e.kind === 'mount') break
        if (e.kind === 'save-intent' && e.key && u.key && e.key === u.key) {
          bad.push({ key: u.key, reason: u.reason, unmountSeq: u.seq, saveSeq: e.seq })
          break
        }
      }
    }
    return bad
  }

  function reportNewViolations() {
    for (const v of checkOrder()) {
      const sig = v.key + '#' + v.unmountSeq + '>' + v.saveSeq
      if (reported.has(sig)) continue
      reported.add(sig)
      console.error(
        '[viewers] 顺序契约被破坏：文件 ' + v.key + ' 的 viewer 卸载（#' + v.unmountSeq +
        '）发生在静默保存意图（#' + v.saveSeq + '）之前 —— 这正是会丢未保存内容的顺序。' +
        '请检查：① tabs.js 是否仍在改 store.activeKey 之前 emit md:interrupt；' +
        '② 宿主的内容切换 watcher 是否被人改成了 flush:\'sync\'。')
    }
  }

  /**
   * 把 `SAVE_INTENT_SOURCES` 与实际发生的事对上。
   *
   * **运行期**查的是「有没有真发」：每一条进过的应发路径都要真的发出过 `md:interrupt`
   * （`via()` 记的账），没发 ⇒ `missing` 非空 + 当场 `console.error`。
   * ⇒ 这条**只有在有人真的去调用了**才有效：它防的是「路径还在跑、但那一发被改成漏了」，
   *   防不住「整段调用被删掉」——**后者由 `tests/personal-ui.mjs` 段 M3 的源码断言兜**
   *   （它按 `before` 原文在 `tabs.js` 里定位，并验位置在改 `activeKey` 之前）。
   *   两层的分工写在这里，是为了别把「运行期没报」误读成「源码里那行还在」。
   *
   * ⚠ 浏览器里拿不到 fs ⇒ **不在这里读源码**（本模块不再有任何读文件/注入源码的钩子）。
   */
  function checkSaveIntentCoverage() {
    /* 「没发」既可能已经由收尾函数喊过，也可能还挂在那儿（测试注入了失败路径、忘了收尾）——
     * 判定统一在**这里**汇总，谁先谁后不影响结果。 */
    const missing = []
    for (const rec of intentSources) {
      if (!rec.expected || rec.emitted) continue
      if (!missing.some((m) => m.source === rec.source && m.file === rec.file)) {
        missing.push({ source: rec.source, file: rec.file, note: rec.note })
      }
    }
    for (const m of declaredMissing) {
      if (!missing.some((x) => x.source === m.source && x.file === m.file)) missing.push(m)
    }
    const checks = SAVE_INTENT_SOURCES.map((d) => {
      const record = intentSources.filter((s) => s.source === d.source).pop() || null
      return { source: d.source, file: d.file, emit: !!d.emit, note: d.note || '', before: d.before, seen: !!record, emitted: !!(record && record.emitted) }
    })
    return {
      /* `ok` 与 `violations()` 同一口径：**「有没有真出问题」**，不是「表里每一条都跑过了」。
       * 「哪些声明这一次会话还没被走到」看 `checks[].seen`（那是覆盖情况，不是违规）。 */
      ok: missing.length === 0,
      noneMissed: missing.length === 0,
      checks,
      missing,
      sources: intentSources.map((s) => ({ ...s })),
    }
  }

  function reportMissingSaveIntent(v) {
    const sig = v.source + '@' + v.file
    if (reportedMissing.has(sig)) return
    reportedMissing.add(sig)
    console.error(
      '[viewers] 「该发而没发」：' + v.file + ' 的 ' + v.source + '（' + v.note + '）在本地这次调用里' +
      '**没有**发出保存意图。请检查：① 那一处 emit 是否还在、是否仍排在改 store.activeKey 之前；' +
      '② 它的分支条件是不是被改成了「有时不发」——若那条路径**本来就不该发**，' +
      '把它从 SAVE_INTENT_SOURCES 里删掉，并在注释里写清它靠哪条兜底链不丢字')
  }

  function notify(ev) {
    for (const fn of [...subscribers]) {
      try { fn(ev) } catch (err) { console.error('[viewers] 订阅者回调抛错（不影响其它订阅者）：', err) }
    }
  }

  const registry = {
    /** 标记：这个对象确实是 viewer 注册表（测试与插件都可以据此判断）。 */
    __isViewerRegistry: true,
    /** 宿主挂载点选择器，插件可读（不要硬编码字符串）。 */
    hostSelector: HOST_SELECTOR,

    /**
     * 注册一个 viewer 声明。**校验不过一律抛错**——本项目的老病是「连错了不吭声」，
     * 所以这里宁可当场炸掉（错误信息里写明怎么改），也不静默降级。
     * @returns {() => boolean} 注销函数（务必在组件 beforeUnmount 里调用）
     */
    register(decl) {
      if (!decl || typeof decl !== 'object') {
        throw new TypeError('[viewers] register 需要一个声明对象：{ id, exts, priority?, mount, update?, cleanup? }')
      }
      const id = typeof decl.id === 'string' ? decl.id.trim() : ''
      if (!id) throw new TypeError('[viewers] 声明缺少 id（必填、全局唯一，惯例直接用插件 id）')
      const exts = Array.isArray(decl.exts) ? decl.exts.map(normExt).filter(Boolean) : []
      if (!exts.length) {
        throw new TypeError('[viewers] 声明 ' + id + ' 缺少 exts（必填；扩展名数组，如 [".docx", ".xlsx"]）')
      }
      if (typeof decl.mount !== 'function') {
        throw new TypeError('[viewers] 声明 ' + id + ' 缺少 mount(hostEl, ctx)（必填；只能往宿主给的挂载点里建节点）')
      }
      if (decl.update !== undefined && typeof decl.update !== 'function') {
        throw new TypeError('[viewers] 声明 ' + id + ' 的 update 必须是函数（它可选，写了就要能用）')
      }
      if (decl.cleanup !== undefined && typeof decl.cleanup !== 'function') {
        throw new TypeError('[viewers] 声明 ' + id + ' 的 cleanup 必须是函数（它可选，写了就要能用）')
      }
      const priority = decl.priority === undefined ? DEFAULT_PRIORITY : decl.priority
      if (typeof priority !== 'number' || !Number.isFinite(priority)) {
        throw new TypeError('[viewers] 声明 ' + id + ' 的 priority 必须是有限数字（可省略，默认 ' + DEFAULT_PRIORITY + '）')
      }
      if (byId.has(id)) {
        throw new Error('[viewers] id 重复注册：' + id +
          '（一个 id 只能有一个声明；重复通常意味着上一次 register 的返回值没有在 beforeUnmount 里调用）')
      }
      const entry = { id, exts, priority, order: ++regSeq, decl }
      byId.set(id, entry)
      decls.push(entry)
      notify({ type: 'register', id })
      return function stop() { return registry.unregister(id) }
    },

    /** 注销：返回是否真的注销掉了（false = 本来就没有这个 id，不抛错，便于幂等调用）。 */
    unregister(id) {
      const key = typeof id === 'string' ? id.trim() : ''
      const entry = byId.get(key)
      if (!entry) return false
      byId.delete(key)
      const i = decls.indexOf(entry)
      if (i >= 0) decls.splice(i, 1)
      notify({ type: 'unregister', id: key })
      return true
    },

    /**
     * 问「这个扩展名谁能开」。
     * 规则：priority 大的先赢；同分时**先注册的先赢**（显式定序，不给文件系统顺序留后门）。
     * @returns 注册时交进来的那个声明对象 | null
     */
    resolve(ext) {
      const e = normExt(ext)
      if (!e) return null
      let best = null
      for (const d of decls) {
        if (!d.exts.includes(e)) continue
        if (!best || d.priority > best.priority) best = d
        // 同分不动：decls 按注册顺序排列，先注册的先赢
      }
      return best ? best.decl : null
    },

    /** 只读快照，给调试与占位面板用（不返回 mount，免得被乱调）。 */
    list() {
      return decls.map((d) => ({ id: d.id, exts: d.exts.slice(), priority: d.priority }))
    },

    /** 宿主内部：注册表变了（注册/注销）时通知在跑的会话，让它重新解析一次。 */
    subscribe(fn) {
      subscribers.add(fn)
      return function off() { subscribers.delete(fn) }
    },

    /**
     * 宿主内部：记一条「保存意图」。key 取当前激活标签；被清空时退回当前 viewer 显示的文件。
     * `source` 由发点用 `withSaveIntentSource()` 标（`tabs.js` / `panel.js`）；
     * 来源不明的照样记账，但**不参与**「该发而没发」的判定（宁可漏报，不误伤例外路径）。
     */
    noteSaveIntent() {
      /* 先记下「这一条应发路径确实发了」——判定的依据是**真的发过**，不是「代码里还有那行」。 */
      if (curExpect) curExpect.emitted = true
      const src = takeSaveIntentSource()   // 读一次就复位：来源只归**这一发**用
      return note('save-intent', { key: (store && store.activeKey) || lastMountedKey, source: src })
    },

    /**
     * 宿主内部：标记「正走进 `source` 这条应发保存意图的路径」（见 `SAVE_INTENT_SOURCES`）。
     * **不要单独用**——用 `begin(source)` / `via(source, fn)`，它们成对记账。
     */
    noteSaveIntentSource(source) {
      const s = typeof source === 'string' ? source.trim() : ''
      if (!s) return
      saveIntentSource = s
    },

    /**
     * 宿主内部：进入一条应发保存意图的路径。**返回收尾函数，必须调用**（`done()` 或 `miss()`）。
     *
     * 收尾时按这一次的记录判：没发过 ⇒ 记一笔**声明级**违规（当场 `console.error`）
     * 并让 `checkSaveIntentCoverage().missing` 非空。
     * @returns {() => boolean} 收尾函数；返回「这一次是否真的发了」
     */
    begin(source) {
      const s = typeof source === 'string' ? source.trim() : ''
      if (!s) throw new TypeError('[viewers] begin(source) 需要一个非空来源标识（见 SAVE_INTENT_SOURCES）')
      const decl = SAVE_INTENT_SOURCES.find((d) => d.source === s)
      const rec = {
        seq: intentSources.length + 1,
        source: s,
        file: decl ? decl.file : '',
        note: decl ? (decl.note || '') : '（不在 SAVE_INTENT_SOURCES 里）',
        emitted: false,
        expected: true,
        settled: false,
        at: Date.now(),
      }
      intentSources.push(rec)
      if (intentSources.length > LOG_MAX) intentSources.splice(0, intentSources.length - LOG_MAX)
      curExpect = rec
      return function endSaveIntentExpectation() {
        if (curExpect === rec) curExpect = null
        rec.settled = true
        if (!rec.emitted) {
          declaredMissing.add({ source: rec.source, file: rec.file, note: rec.note })
          reportMissingSaveIntent(rec)
        }
        return rec.emitted
      }
    },

    /** 宿主内部：这一次「进了应发路径但**有意/意外**没发」——收尾且立刻判定（缺的那一笔会进 `missing`）。 */
    miss(source) {
      const done = registry.begin(source)
      return done()
    },

    /**
     * 宿主内部：把「标记来源」与「同步发出」合成一步，两者之间插不进任何东西。
     * @param {string} source 须在 `SAVE_INTENT_SOURCES` 里登记
     * @param {() => void} fn 同步动作（保存意图必须同步发出去，别传 async）
     * @returns {boolean} 这一次是否真的发了保存意图
     */
    via(source, fn) {
      const done = registry.begin(source)
      withSaveIntentSource(source, fn)
      return done()
    },

    /** 宿主内部：读一次当前保存意图的来源（**读即复位**）。给「以后需要在应答里认来源」的监听方留的口子。 */
    takeSaveIntentSource,

    /** 宿主内部：不改判定，只看「此刻有没有一条应发路径正挂着」——测试注入失败路径时用。 */
    _currentExpectation() { return curExpect ? curExpect.source : '' },

    /** 宿主内部：会话写顺序流水用。 */
    _note: note,
    /** 宿主内部：会话登记「当前 viewer 正在显示哪个文件」。 */
    _setMountedKey(k) { lastMountedKey = k || '' },

    /** 顺序取证（人可读、也可被测试直接调）。 */
    lifecycle: {
      log() { return log.map((e) => ({ ...e })) },
      clear() { log.length = 0; reported.clear() },
      checkOrder,
      violations() { return checkOrder() },
      /** 不变式 2：声明表 ↔ 实际调用 ↔ 源码位置（见 `checkSaveIntentCoverage()`）。 */
      checkSaveIntentCoverage,
      /** 不变式 2 的简写结果：只回「该发而没发」那几笔。 */
      missingSaveIntents() { return checkSaveIntentCoverage().missing },
      /** 这次会话里进过哪些应发路径、各发没发（人可读）。 */
      saveIntentSources() { return intentSources.map((s) => ({ ...s })) },
    },
  }
  return registry
}

/**
 * 建立/取回宿主注册表。**幂等**：只此一份。
 * `bus` 上的 `md:interrupt` 监听在这里挂一次——它是「保存意图」的取证点。
 *
 * 用 `PH.viewers` 是否已存在来判断，**不用模块级标志**：测试（`tests/personal-ui.mjs` 段 K）
 * 会把 `viewers.js` 的真身装进一个独立沙箱、并在那里换掉 `window.PrivHub`，
 * 模块级标志会让第二份注册表建不出来（测试就直接换环境重来）。
 * 监听器**幂等**：绑定前先记下 `md:interrupt` 的监听数，重复 `install` 不再挂第二条。
 */
function installViewerRegistry() {
  const PH = typeof window !== 'undefined' ? window.PrivHub : null
  if (!PH) return null
  if (!PH.viewers || !PH.viewers.__isViewerRegistry) PH.viewers = createRegistry()
  /* 取证监听的接线**与建注册表分开写**（幂等条件各自独立）：
   * 「注册表已存在、但这条 bus 上还没接过取证监听」是真实存在的状态 —— 测试会换掉
   * `window.PrivHub` 而不换 bus，这时若把它跟建表写进同一个 if，就会**一声不响地少一条线**
   * （保存意图不再被记账，`checkSaveIntentCoverage()` 于是永远看着干净）。
   * 幂等按 bus 记账：同一根 bus 上只挂这一条。 */
  const b = (typeof bus !== 'undefined' && bus) ? bus : null
  if (b && !b.__privhubSaveIntentWired && typeof b.on === 'function') {
    b.on('md:interrupt', () => { PH.viewers.noteSaveIntent() })
    b.__privhubSaveIntentWired = true
  }
  return PH.viewers
}

/* =====================================================================
 * 会话：宿主侧「解析 → 挂载 → 卸载」的唯一执行者
 * ===================================================================== */

/** 取当前注册表（不存在就顺手建立；拿不到就返回 null ⇒ 一切走老路）。 */
function currentRegistry() {
  const PH = typeof window !== 'undefined' ? window.PrivHub : null
  if (!PH) return null
  if (!PH.viewers || !PH.viewers.__isViewerRegistry) return installViewerRegistry()
  return PH.viewers
}

/**
 * 造一个 viewer 会话。一个宿主组件实例一个。
 * @param {{ refresh?: () => void }} [opts] refresh：注册表变化时怎么重新解析（默认什么都不做）
 */
function createViewerSession(opts) {
  const refresh = (opts && typeof opts.refresh === 'function') ? opts.refresh : null
  let cur = null      // { id, decl, key, host, ext, cleanup }
  let offSub = null

  function callCleanup(entry) {
    if (!entry || typeof entry.cleanup !== 'function') return
    try { entry.cleanup() } catch (e) { console.error('[viewers] ' + entry.id + ' 的 cleanup 抛错（已吞，不影响宿主）：', e) }
  }

  /** 清空挂载点的子节点并把标签归位。**只动锚点内部，绝不碰 `.v3-content` 本身或别人的节点。** */
  function clearHost(host) {
    if (!host) return
    try { host.replaceChildren() } catch {
      while (host.firstChild) host.removeChild(host.firstChild)
    }
    try { if (host.dataset) host.dataset.viewer = VIEWER_NONE } catch { /* 无所谓 */ }
  }

  /**
   * 卸载当前 viewer。
   * @param {'switch'|'swap'|'no-viewer'|'host-gone'|'teardown'|'unregistered'} reason
   */
  function unmount(reason) {
    if (!cur) return null
    const prev = cur
    cur = null
    const reg = currentRegistry()
    /* 注意：这里**不**把 lastMountedKey 清空。它是「保存意图该算在哪个文件头上」的兜底：
     * panel.js 的 nav.path 那条路径会先把 activeKey 置空、再 emit md:interrupt，
     * 那时只能靠「上一个上过场的文件」把顺序认回来（否则倒挂会查不出来）。 */
    if (reg) reg._note('unmount', { key: prev.key, id: prev.id, reason })
    callCleanup(prev)
    // 挂载点已经随内容区一起被 Vue 销毁时，它的 DOM 不用我们管
    if (reason !== 'host-gone') clearHost(prev.host)
    return prev
  }

  function mountInto(decl, host, ctx) {
    try { if (host.dataset) host.dataset.viewer = decl.id } catch { /* 无所谓 */ }
    const entry = { id: decl.id, decl, key: ctx.key, host, ext: ctx.ext, cleanup: null }
    cur = entry
    let ret = null
    try {
      ret = decl.mount(host, ctx)
    } catch (e) {
      console.error('[viewers] ' + decl.id + '.mount 抛错，本文件退化为无 viewer（宿主自己的渲染分支不受影响）：', e)
      cur = null
      const reg = currentRegistry()
      if (reg) reg._note('mount-error', { key: ctx.key, id: decl.id })
      clearHost(host)
      return { action: 'mount-error' }
    }
    if (typeof ret === 'function') entry.cleanup = ret
    else if (typeof decl.cleanup === 'function') entry.cleanup = function () { decl.cleanup(host, ctx) }
    else entry.cleanup = null
    const reg = currentRegistry()
    if (reg) { reg._note('mount', { key: ctx.key, id: decl.id }); reg._setMountedKey(ctx.key) }
    return { action: 'mount' }
  }

  const session = {
    /**
     * 解析并同步当前该谁上场。**幂等**：同文件 + 同 viewer + 同挂载点 → 完全不动。
     * @param {{ host: Element|null, tab: object|null, content: object|null }} input
     */
    sync(input) {
      const host = (input && input.host) || null
      const tab = (input && input.tab) || null
      const content = (input && input.content) || null
      const reg = currentRegistry()

      // 只有「内容就绪」才轮到 viewer；loading / error 时一律不上场（老路照跑）
      let ext = ''
      let decl = null
      if (tab && content && content.state === 'ready') {
        ext = extOfName(tab.name)
        decl = reg ? reg.resolve(ext) : null
      }

      /* ── 无声明 → 回退老路 ───────────────────────────────────────────
       * 宿主自己的 md / text / image / pdf 渲染分支一字未改，锚点留空即等于「没有这一步」。
       * 这一段就是「本批没有插件注册时也要完全照跑」的落点。 */
      if (!decl) {
        if (cur) { unmount('no-viewer'); return { action: 'unmount' } }
        if (host) clearHost(host)
        return { action: 'fallback' }
      }

      if (!host) {
        // 内容区整体没了（切到别的视图 / 标签全关）→ 存量 viewer 必须收干净
        if (cur) { unmount('host-gone'); return { action: 'unmount' } }
        return { action: 'no-host' }
      }

      const key = tab.key || ''
      const sameHost = !!(cur && cur.host === host)
      const sameViewer = !!(cur && cur.id === decl.id)

      // ① 同文件（或无关重渲染）→ 复用，一个 DOM 动作都不做（这才是真正的「不白闪」）
      if (sameHost && sameViewer && cur.key === key) {
        if (reg) reg._note('reuse', { key, id: decl.id })
        return { action: 'reuse' }
      }

      // ② 同类文件之间切换 → 复用：挂载点不重建、viewer 身份不变
      if (sameHost && sameViewer) {
        const ctx = { project: tab.project, path: tab.path, name: tab.name, key, ext }
        if (typeof decl.update === 'function') {
          try {
            decl.update(host, ctx)
            cur.key = key
            cur.ext = ext
            if (reg) { reg._note('update', { key, id: decl.id }); reg._setMountedKey(key) }
            return { action: 'update' }
          } catch (e) {
            console.error('[viewers] ' + decl.id + '.update 抛错，退回重建一次：', e)
          }
        }
        // 没声明 update（或 update 抛错）：同一个锚点里「先收后建」，同一批次完成 → 中间不给浏览器绘制机会
        unmount('swap')
        return mountInto(decl, host, { project: tab.project, path: tab.path, name: tab.name, key, ext })
      }

      // ③ 异类（或挂载点被 Vue 重建过）→ **先卸旧的、再挂新的**
      if (cur) unmount('switch')
      return mountInto(decl, host, { project: tab.project, path: tab.path, name: tab.name, key, ext })
    },

    /** 宿主组件 beforeUnmount / 内容区销毁时调用：把当前的 viewer 收干净。 */
    dispose(reason) {
      if (offSub) { offSub(); offSub = null }
      return unmount(reason || 'teardown')
    },

    /** 当前在场上的是谁（调试/测试用）。 */
    current() {
      return cur ? { id: cur.id, key: cur.key, ext: cur.ext, host: cur.host } : null
    },

    /** 会话开始：注册表一变就重新解析一次（插件热装卸时不会留半截状态）。 */
    start() {
      if (offSub) return session
      const reg = currentRegistry()
      if (reg && refresh) offSub = reg.subscribe(() => { refresh() })
      return session
    },
  }
  return session
}

/* 模块加载即建立注册表：所有插件模块的 import 都发生在任何组件挂载之前，
 * 因此插件在 mounted() 里 register 时，注册表必然已经在那儿了。 */
installViewerRegistry()

export {
  HOST_SELECTOR,
  VIEWER_NONE,
  DEFAULT_PRIORITY,
  SAVE_INTENT_SOURCES,
  normExt,
  extOfName,
  takeSaveIntentSource,
  withSaveIntentSource,
  createRegistry,
  currentRegistry,
  installViewerRegistry,
  createViewerSession,
}
