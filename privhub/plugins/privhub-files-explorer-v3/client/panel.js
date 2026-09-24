/**
 * panel — 中栏内容区（panel slot）：标签行、内容渲染、文件表、各类弹窗。
 *
 * 这是本插件最大的界面单元（约 590 行）。若日后还要再拆，
 * 优先把「文件表 + 批量工具栏」抽成子组件。
 *
 * @module privhub-files-explorer-v3/client/panel
 */

import { api, nav, bus, AUTH, fileIcon } from './deps.js'
import { isEditableText, relPath, tabKey, EXT, extOf } from './utils.js'
import { store } from './store.js'
import { persistTabs, restoreTabs, openTab, activateTab, closeTab, closeOthers } from './tabs.js'
import { refreshTree } from './treecache.js'
import { openMenuFor, closeMenu, openDetail, openPerm, doRename, cancelRename, submitRename, doCopyHere, doMoveOpen, doMoveSubmit, doDelete, doFavorite, doDownload, convertDocToDocx, doEdit, doMkdirHere, doMkdirHereSubmit, submitMkdirV3 } from './ops.js'
import { loadContent, esc, renderMarkdown } from './content.js'
import { createViewerSession, HOST_SELECTOR } from './viewers.js'
import { TreeNodeV3 } from './tree.js'

/* ================= 内容区布局状态：谁上场谁给（第二步 b） =================
 *
 * 旧写法是宿主硬编码一份插件能力清单：`ext === '.docx' || ext === '.xlsx'`
 * ⇒ office 布局。那是**残留耦合**——宿主凭什么知道 .docx 会被谁整块接走？
 *
 * 现在改成听 viewer 会话的返回值：**有 viewer 真上场，内容区就整块让给它**；
 * 没人在场（fallback / unmount / mount-error）就是普通布局，宿主自己的渲染分支照跑。
 * 这样「谁能上场」只由注册表决定，宿主不再自带任何插件能力清单。
 *
 * 布局规则本身写在宿主自己的样式里（styles.js 的 `.v3-content--viewer`）——
 * 是宿主对自己的容器下规矩，不是插件按类名声称拥有内容区（硬约束 5）。
 * ⚠ 这个状态由 `syncViewer()` 写进响应式字段（而不是在 computed 里现问注册表），
 *   原因是「插件挂载晚于面板首次渲染」是常态（标签从 sessionStorage 恢复时就会撞上），
 *   必须有一个响应式来源把重渲染顶出来。
 *
 * 会返回这些 action 的只有 viewers.js 的会话（契约模块，本批一字未改）：
 *   mount / update / reuse ← viewer 在场上；
 *   fallback / unmount / no-host / mount-error ← 没有 viewer 在场上。
 */
const VIEWER_ON_STAGE_ACTIONS = { mount: 1, update: 1, reuse: 1 }
function layoutForAction(action) {
  return VIEWER_ON_STAGE_ACTIONS[action] ? 'viewer' : ''
}

/* ================= 铺满形态（本轮新增）：图片 / PDF 一律铺满内容区 =================
 *
 * 用户原话：「除了直接在中间栏阅读的文件，其他格式的能打开的文件的背景和背景大小别做限制，
 * 给 100%……现在分好几层，大小还有的格式有限制。」
 *
 * 迁前的两层限制（都在宿主自己的样式里，但一处写错、一处写死）：
 *   · 中间层：.v3-content 的 padding:16px 22px ⇒ 图片/PDF 四周一圈留白；
 *   · 元素层：.v3-pdf 的 height:calc(100vh - 260px) 是「视口高度减一个常数」——
 *     与实际 chrome 高度无关（标签行/顶栏一变就对不上，必然错位）；
 *     外加 1px 边框 + 8px 圆角 = 给 PDF 套相框、给图片加圆角。
 *
 * 改法与 viewer 让位布局（第二步 b）**同一范式**，不新开任何机制：
 *   状态写进**宿主自己的响应式 data**（`fillLayout`）→ 由**宿主自己**派生 →
 *   规则写在**宿主自己的 styles.js**（`.v3-content--fill`）。
 *   插件不参与、不新增 DOM 认领、`viewers.js` 契约形状一字未动。
 * 为什么不复用 `--viewer`：`--viewer` 的语义是「插件 viewer 上场、宿主让位」；
 * 这两个是**宿主亲儿子**（img / iframe 由宿主模板直接渲染），语义不同 —— 混用会让
 * 「宿主自己的能力」和「插件的声明」在同一个状态位里打架。
 *
 * 判据全部取自宿主自己的状态，一次不查 DOM：
 *   ① 内容区在场且承载的正是当前标签（与模板 v-if、contentLiveKey 同一口径）；
 *   ② 内容是 ready **且已经拿到原始字节 URL**（loading / error 都不铺）——
 *      这一条就是「整块媒体形态」的定义：url 只在图片 / PDF 两条取数路径上被赋值
 *      （content.js 的 kind==='image'/'pdf' 与 r.type==='image'/'pdf' 共四处），
 *      拿到 url 就意味着内容区正被一个 img 或 iframe 整块占着；
 *   ③ 当前没有 viewer 在场上（万一将来有插件认领 .pdf，以插件为准，宿主不抢）。
 * ⚠ 这里**刻意不按扩展名 / kind 判**：判据是「有没有拿到 url」这条**事实**，不是「扩展名清单猜的 kind」。
 *   迁前的实测反例（`docs/reviews/_matrix-format.txt`，样本 `hand-n.ico` 那一行）：`.ico` 被后端
 *   认成 image，而前端 `kindOf` 的图片清单里没有 `ico` ⇒ 它的 `kind` 是 text、模板走的是 iframe 分支。
 *   若按 `kind` 判铺满，这个「是图片却走 iframe」的形态就会漏掉不铺（用户看到的仍是带留白的一层）。
 *   （那个 `ico` 清单不一致**本批已收敛**：前后端图片清单现在是同一份取值 —— 见 `utils.js` 的
 *   `EXT.IMAGE_EXTS` 与 `privhub-core/src/file-exts.ts` 的 `IMAGE_EXTS`。此处仍保留「按 url 判」
 *   的写法：判据取自事实而不是清单，将来任何新的整块媒体形态都不必再改这一处。）
 * 与「允许的例外」有关的一条：`.v3-md` 的 max-width:900px 是**有意**为阅读舒适设的，
 * 本轮明确不动 —— 用户说的是「除了直接阅读的文件」，正文排版不在治理范围内。
 */
function fillStateFor(tab, content, viewerLayout) {
  const live = !!(tab && content && content.key === tab.key && content.state === 'ready' && content.url)
  const wanted = live && viewerLayout !== 'viewer'
  return wanted ? 'fill' : ''
}

/* ================= 编辑舱位：内嵌编辑器的挂载点（第二步 c） =================
 *
 * 与 `.v3-viewer-host` 是两件事，不能混：
 *   · `.v3-viewer-host` 是「按扩展名上场的 viewer」的地界（谁认领 .docx 谁上场）；
 *   · `.v3-editor-host` 是「**编辑态**」的地界（同一个 .md 文件，只读预览与编辑态是两种形态，
 *     编辑态不是某个 viewer 的能力）。所以另开一个舱位，**同样由宿主创建与销毁**。
 *
 * 迁前的写法是反向的：edit-md 自己 `document.querySelector` 找宿主的容器、再 teleport 进去，
 * 于是「别人的 DOM 非空」被当成「可以内嵌」——内容区正显示 A 时给 B 开编辑器也会被判成可内嵌，
 * 编辑器就贴到了别人的画面上。现在改成**宿主作答**：
 *
 *   插件 → 宿主   `v3:editor-host-ask`  { project, path }
 *   宿主 → 插件   `v3:editor-host`      { available, key, selector, reason }
 *   插件 → 宿主   `v3:editor-state`     { open, project, path, reason }   ← 编辑态开/关，驱动下方布局类
 *   插件 → 宿主   `md:editor-lifecycle` { kind, project, path, reason }   ← 顺序取证，记进 viewers 的流水
 *
 * 「能不能内嵌」的判据全部取自**宿主自己的状态**（`contentLiveKey()`：内容区在、且承载的正是这个文件），
 * 一次都不查 DOM。舱位一旦消失（内容区被销毁 / 切视图 / 面板卸载），宿主推
 * `v3:editor-host { available:false }` 请插件退场 —— 少了这一步，插件手里的 teleport 会攥着
 * 一个已被销毁的目标（`.md-inline-root` 的老毛病就是这么来的）。
 *
 * 布局同样归宿主：编辑态开启时内容区走 `.v3-content--editor`（styles.js 里宿主自己的规则），
 * 状态写进**响应式 data**（`editorLayout`）而不是按插件类名 `:has()` 反查自己的后代。
 */
const EDITOR_SELECTOR = '.v3-editor-host'

/* ================= 渲染根交接：批注锚点不再靠"自己查 + 盯别人 DOM"（第二步 d） =================
 *
 * `privhub-files-comments` 要在宿主渲染出的 md 预览根里插锚点高亮。迁前它做两件越权的事：
 *   ① `document.querySelector('.v3-content .v3-md')` —— 自己去别人的容器里找渲染根；
 *   ② 在那个节点上挂 `MutationObserver`（childList+subtree+characterData）—— 靠"盯着别人的
 *      DOM 变了"来重建锚点。
 *
 * 现在两件事都归宿主：**渲染完成时由宿主把渲染根的节点引用直接交出去**。
 *   · 节点从哪来：内容区里那个 `ref="mdRoot"` 的 div —— 宿主自己模板里的节点，宿主管
 *     （不是按类名去查别人的，也不是新建一个；`.v3-md` 只是它的样式类）。
 *   · 什么时候发：`noticeMdRoot()` 在 Vue 渲染**之后**（`$nextTick`）把当前引用发出去 ——
 *     这正是 `v-html` 换过内容、或 `.v3-md` 节点被重建的那个时刻（Vue 自己知道，
 *     不需要有人在外围盯 DOM）。
 *   · 什么时候收回：没有 md 渲染根时（loading / error / text / 图片 / PDF / 内容区整体消失）
 *     发 `el: null`，并**带上 file 身份**——插件据此把锚点清掉并放弃旧引用，
 *     换文件时旧锚点因此不可能残留。
 *   · 空引用也发一次（`el:null`）不是噪音：那是"现在没有渲染根"这个事实本身。
 *
 * 事件名 `v3:md-root` 是**新增**的，`v3:md-rendered` 已随之作废（原来那两发在
 * content.js，发在 Vue 渲染【之前】，锚点根那时根本还不存在）。两处都清掉了，
 * 全仓不再有该事件名 —— 免得留一条"发了但没人听/听了但没发"的假线。
 *
 * ⚠ 这条与两个锚点（`.v3-viewer-host` / `.v3-editor-host`）无关：那是"给插件的地"，
 *   这是"把宿主自己的渲染根借给插件当锚点容器"，两者不共用、不互相挤。
 */
function mdRootOf(refs) {
  return (refs && refs.mdRoot) || null
}

/* ================= 文件面板（panel slot）：标签栏 + 主区 ================= */
const PanelV3 = {
  name: 'files-panel-v3',
  data() { return { nav, store, AUTH, pressTimer: null, batchBusy: false, viewerLayout: '', editorLayout: '', fillLayout: '', previewFont: parseFloat(localStorage.getItem('privhub_preview_font') || '13.5') || 13.5 } },
  computed: {
    /* 中间栏只显示文件（文件夹在左侧目录树管理） */
    entries() {
      const arr = [...nav.entries].filter(e => !e.isDir)
      const key = nav.sortKey
      const asc = nav.sortAsc ? 1 : -1
      arr.sort((a, b) => {
        let va, vb
        if (key === 'name') { va = a.name; vb = b.name }
        else if (key === 'size') { va = a.size; vb = b.size }
        else if (key === 'mtime') { va = a.mtime; vb = b.mtime }
        else { va = a.name; vb = b.name }
        if (va < vb) return -1 * asc
        if (va > vb) return 1 * asc
        return 0
      })
      return arr
    },
    crumbs() {
      const parts = this.nav.path ? this.nav.path.split('/').filter(Boolean) : []
      const arr = [{ label: this.nav.project, path: '' }]
      let acc = ''
      for (const p of parts) { acc = acc ? acc + '/' + p : p; arr.push({ label: p, path: acc }) }
      return arr
    },
    activeTab() { return store.tabs.find(t => t.key === store.activeKey) || null },
    content() { return store.content },
    showTabs() { return store.tabs.length > 0 },
    /* 是否是「走 Office 内容链」的文件：扩展名取自**前端唯一那一处定义**
     * （`utils.js` 的 `EXT.OFFICE_KIND_EXTS` = Office 读取链集合减去 pdf），不在这里写字面量。
     * 迁前这里是手写的一串 Office 扩展名（其中含 `xls`/`ppt`），而 `xls`/`ppt` **不在**读取链集合里
     * （`privhub-svc-office` 的 `OFFICE_EXTS` 没有它们、后端 `/office/read` 对它们报错），
     * 靠 `t.kind === 'office'` 这道前置判断才没出问题 —— 现在清单与 kind 的取值同源，这类错配不会再出现。
     * `.xls`/`.ppt` 最终口径（为什么它们是"Office 家族但不在读取链"）见
     * `privhub-core/src/file-exts.ts` 文件头「Office 那一族的口径」。 */
    isOfficeFile() {
      const t = this.activeTab
      return t ? EXT.OFFICE_KIND_EXTS.includes(t.kind === 'office' ? extOf(t.name) : '') : false
    },
    isMdFile() { const t = this.activeTab; return t ? t.kind === 'md' : false },
    /* 纯文本（txt/json/…）：edit-md 内嵌编辑，kind 为 text 且扩展名在可编辑清单 */
    isTextEditFile() {
      const t = this.activeTab
      return t ? t.kind === 'text' && isEditableText(t.name) : false
    },
    isEditFile() { return this.isOfficeFile || this.isMdFile || this.isTextEditFile },
    /* 详情开关状态：右侧面板打开且正显示当前激活文件 */
    detailOpen() {
      return !!(nav.rightOpen && nav.selected && !nav.selected.isDir && this.activeTab && nav.selected.name === this.activeTab.name)
    },
    isAdmin() { return AUTH.user && AUTH.user.role === 'admin' },
    /* 内容区布局状态类：**由「谁上场」给出**（第二步 b，见文件头 layoutForAction）。
     * 迁移前的写法硬编码 ['docx','xlsx']（宿主自带插件能力清单）；现在 `viewerLayout`
     * 由 `syncViewer()` 按 viewer 会话的返回值写，宿主不再知道是谁的能力。
     * 判定口径与 `:has(iframe.office2-frame)` 时代的等价性：
     *   只有「会整块铺满内容区的 viewer 上场时」才是让位布局——.doc / .ppt / .pptx
     *   这些只出 md 提取文本、没有 viewer 的类型，照旧普通布局。
     * 布局规则本身在 styles.js 的 .v3-content--viewer（宿主自己的地宿主管）。 */
    contentClass() {
      const cls = ['v3-content']
      if (this.viewerLayout === 'viewer') cls.push('v3-content--viewer')
      /* 铺满形态（本轮）：图片 / PDF 这两个宿主亲儿子分支，见文件头「铺满形态」。
       * 与 viewer 让位**互斥**：真有 viewer 上场时以 viewer 为准（else if 是刻意的，
       * 不让「宿主亲儿子」和「插件声明」同时给同一个容器下两套尺寸规矩）。 */
      else if (this.fillLayout === 'fill') cls.push('v3-content--fill')
      /* 编辑态让位（第二步 c）：与 viewer 一样，只由「谁在场」决定，宿主自己给自己的容器下规矩。
       * 状态来自响应式 data（`editorLayout`），由插件经 bus 报来的编辑态开/关写入 ——
       * 不写成 computed 现问，是因为「插件晚一点才报」是常态，必须有个响应式来源顶出重渲染。 */
      if (this.editorLayout === 'editor') cls.push('v3-content--editor')
      return cls.join(' ')
    },
    isRootMenu() {
      const m = store.ctxMenu
      return m ? m.entry.isDir && m.dirPath === '' && m.entry.name === m.project : false
    },
  },
  watch: {
    // 切项目（旧项目非空）→ 清空标签；刷新恢复场景（null → 项目）不清
    'nav.project'(n, o) {
      if (o !== null && n !== o) { store.tabs = []; store.activeKey = ''; store.content = null; persistTabs() }
    },
    // 同项目内导航目录 → 回到目录浏览（标签保留，VS Code 语义：点标签再回内容）
    'nav.path'() {
      if (nav.project !== null) { store.activeKey = ''; store.content = null; bus.emit('md:interrupt', {}) }
    },
    /* 内容区交接清场：切标签 / 换文件的那一刻，先摘掉非本模板注入进来的残留节点。
     *
     * 为什么必须有：内容区是 Vue 模板渲染的，Vue 只认识自己 vnode 列表里的子节点。
     * 别的插件 prepend 进来的节点不在列表里 ⇒ Vue 既不认识、也不会删它 ⇒ 它一直挂在
     * 内容区里，切到任何文件都先被看见（旧 docx 铺满再被新内容挤走＝用户说的“闪一下”）。
     * 这里的清理不是“认出某个插件的类名”，而是认【归属标记 data-v3-injected】——
     * 谁注入谁打标记，宿主只清带标记的节点，edit-md 的 .md-inline-root 与 comments 的
     * mark 节点都不带标记，因此一个都不碰。
     * [第二步 b 之后] office2 已迁到 viewer 契约（节点在锚点内部，由它自己的 cleanup 收），
     * 于是**当前没有任何插件会往内容区里注入带标记的节点**——这一步已成安全网：
     * 留着它，是为了「将来又有人绕开契约往内容区塞东西」时不至于再攒一次残留。
     *
     * 清场必须发生在 Vue 重渲染【之前】：靠的是 watcher 的**默认（pre）flush** ——
     * 它排在「触发变更的那个同步块」【之后】的微任务里、组件重渲染之前。若改成 $nextTick，
     * 旧节点会和新内容同帧共存一瞬——这一瞬正是用户看到的闪光。
     * ⚠ 也不要改成 flush:'sync'：见下面 syncViewer 的顺序准绳（sync 会让 nav.path 那条路径倒挂）。 */
    'store.activeKey'(n) { this.clearInjected(); this.syncViewer('activeKey'); this.syncEditorHost('activeKey'); this.noticeMdRoot('activeKey', n) },
    'store.content'(n, o) { if (!n || !o || n.key !== o.key) this.clearInjected(); this.syncViewer('content'); this.syncEditorHost('content'); this.noticeMdRoot('content', n && n.key) },
  },
  created() {
    /* viewer 会话（第二步 a）：宿主侧「解析 → 挂载 → 卸载」的唯一执行者。
     * 放在 created 而不是 mounted：watcher 在 created 之后就会触发，会话必须先存在。
     * refresh 回调给注册表用——插件热装卸（register/unregister）时重新解析一次，
     * 不留半截状态。 */
    this._viewerSession = createViewerSession({ refresh: () => { this.syncViewer('viewers-changed') } }).start()
  },
  methods: {
    /* ---- 标签栏 ---- */
    openFile(e) { openTab(e, nav.project, nav.path) },
    activate(k) { activateTab(k) },
    close(k) { closeTab(k) },
    closeOthers(k) { closeOthers(k) },
    onAuxclick(k, ev) { if (ev.button === 1) { ev.preventDefault(); closeTab(k) } },
    /**
     * 交接清理：把「不是本模板渲染的、且带归属标记的」节点从内容区摘掉。
     *
     * 认人方式：只认 [data-v3-injected]（归属标记），不认类名、不认标签名——
     * 这是与插件之间的显式契约，宿主因此不需要知道任何插件的实现细节。
     * 只清带标记的节点：edit-md 的 .md-inline-root、comments 的 mark 锚点
     * 都没有标记，它们各自的清理逻辑不受影响（硬约束 5：不用类名动别人的界面）。
     * [第二步 b] 迁到契约上的插件（office2）节点在锚点内部，见下面那句 closest 跳过；
     * 因此现在这一步清不到任何东西，它是给「将来有人绕开契约」留的安全网。
     */
    clearInjected() {
      const content = this.$el && this.$el.querySelector ? this.$el.querySelector('.v3-content') : null
      if (!content) return
      const injected = content.querySelectorAll('[data-v3-injected]')
      for (const n of injected) {
        /* 挂载点内部是 viewer 自己的地界（第二步 a：插件只往宿主给的锚点里建节点）。
         * 一旦某家迁到契约上，它的节点就在锚点里 —— 那是它的私有财产，由它的 cleanup 负责收，
         * 宿主不能顺手删掉正在上班的 viewer。锚点之外的标记节点（还没迁移的老路）照旧清。 */
        if (n.closest && n.closest(HOST_SELECTOR)) continue
        n.remove()
      }
      // 同帧把上一次 office 预览留下的内联隐藏一起还原（那些内联样式写在
      // 宿主自己的 .v3-md/.v3-text 上：清场不还原的话，旧的隐藏会跟着节点一起
      // 被 Vue 复用下去，预览就再也显示不出来）。
      for (const n of content.querySelectorAll('.v3-md, .v3-text')) {
        if (n.style && n.style.display === 'none') n.style.display = ''
      }
    },
    /* ---- viewer 生命周期（第二步 a）：解析 → 挂/卸 ---- */
    /**
     * 按当前激活标签解析 viewer，并交给会话去挂/卸。
     *
     * 【顺序准绳 —— 本批最重要的一条，丢了就是丢未保存内容】
     *   `tabs.js:53/69/84` 在改 `store.activeKey` **之前**同步 emit `md:interrupt`，
     *   编辑器借此静默保存未保存的修改。本方法由 `store.activeKey` / `store.content`
     *   的 watcher 驱动，用的是 Vue 的**默认（pre）flush** —— 它排在那个同步块【之后】的
     *   微任务里。两个事实合起来 ⇒ **卸载 viewer 必然晚于保存意图**。
     *
     *   这条顺序不是只写在注释里：
     *     ① 每次 save-intent / unmount 都按发生顺序记进 `window.PrivHub.viewers.lifecycle`
     *        的流水，`checkOrder()` 能扫出「先卸后存」的倒挂，倒挂当场 console.error；
     *     ② `tests/personal-ui.mjs` 里另有一条**跑 tabs.js 真身、用同步观察者看顺序**的断言。
     *   ⚠ 本批只立钩子点，**不改既有保存时序**（改它属于 c 批 edit-md）。
     *   ⚠ 因此这里**不要**给 watcher 加 `flush:'sync'`：那会让 `nav.path` 那条路径
     *     （panel.js 里 `store.activeKey = ''` 写在 emit 之前）当场倒挂。
     */
    syncViewer(trigger) {
      if (!this._viewerSession) {
        this._viewerSession = createViewerSession({ refresh: () => { this.syncViewer('viewers-changed') } }).start()
      }
      // 挂载点由本模板创建/销毁：这里只查它，绝不新建（宿主之外的节点才需要契约）
      const host = this.$el && this.$el.querySelector ? this.$el.querySelector(HOST_SELECTOR) : null
      const res = this._viewerSession.sync({ host, tab: this.activeTab, content: store.content })
      this._viewerAction = { trigger, ...res }
      /* 布局状态跟着「谁上场」走（第二步 b）：有 viewer 在锚点里 → 内容区整块让给它；
       * 没人在场（fallback / unmount / mount-error）→ 普通布局，宿主自己的分支照跑。
       * 写进响应式字段，保证「插件后注册」也能把布局顶出来（见文件头 layoutForAction）。 */
      this.viewerLayout = layoutForAction(res.action)
      /* 铺满形态跟在 viewer 之后派生（顺序有意义）：它的判据④是「没有 viewer 在场上」，
       * 必须读刚写好的 viewerLayout。放在这里而不是 watcher 里，是为了让
       * 注册表 refresh（插件热装卸）那条路径也一并把铺满状态刷新掉。 */
      this.syncFillLayout()
      return res
    },
    /* ---- 铺满形态（本轮）：把「该不该铺满」写进响应式 data ----
     *
     * 判据与派生规则见文件头「铺满形态」一节（fillStateFor 纯函数，宿主自己的状态，
     * 不查 DOM、不问插件）。写成方法而不是 computed：插件后注册 / 恢复标签这些路径
     * 需要一个响应式来源把重渲染顶出来（与 viewerLayout / editorLayout 同一条理由）。 */
    syncFillLayout() {
      this.fillLayout = fillStateFor(this.activeTab, store.content, this.viewerLayout)
      return this.fillLayout
    },
    /* ---- 编辑舱位（第二步 c）：宿主作答 + 舱位生命周期 ---- */
    /**
     * 「内容区此刻在不在、承载的是哪个文件」——判据与内容区模板的 `v-if` 同一口径
     * （`activeTab && content && content.key === activeTab.key`），**不查 DOM**。
     * 返回该文件的 key（没有内容区时返回空串）。
     */
    contentLiveKey() {
      const t = this.activeTab
      const c = store.content
      return (t && c && c.key === t.key) ? c.key : ''
    },
    /**
     * 回答插件的「现在能不能内嵌？」（`v3:editor-host-ask`，同步问、同步答）。
     *
     * 两个条件缺一不可：
     *   ① 舱位元素确实在（它就是本模板里那个 div，随内容区创建/销毁）；
     *   ② 内容区承载的正是**这个文件**（key 由宿主用 tabKey 现算，插件不必知道 key 怎么拼）。
     * ②是本次迁移的要害：迁前插件拿「别人的容器里有没有东西」当判据，
     * 「内容区显示 A、却要编辑 B」也会被判成可内嵌。
     */
    editorHostInfo(p) {
      const dock = this.$el && this.$el.querySelector ? this.$el.querySelector(EDITOR_SELECTOR) : null
      const want = p && p.project !== undefined && p.path !== undefined ? tabKey(p.project, p.path) : ''
      const key = this.contentLiveKey()
      return {
        available: !!dock && !!want && want === key,
        key,
        selector: EDITOR_SELECTOR,
        reason: (p && p.reason) || 'ask',
      }
    },
    /**
     * 舱位可用性变化时推给插件（只在**真的变了**的时候推，避免刷屏）。
     * `available:false` 的语义是「舱位没了，请你退场」——插件收到后必须先捕获数据、
     * 先发出保存、再拆编辑器（与 `md:interrupt` 同一条准绳）。
     */
    syncEditorHost(trigger) {
      const key = this.contentLiveKey()
      if (key === this._editorHostKey) return
      this._editorHostKey = key
      bus.emit('v3:editor-host', { available: !!key, key, selector: EDITOR_SELECTOR, reason: trigger || '' })
      if (!key) this.setEditorLayout(null)   // 舱位没了 → 编辑态让位布局当场作废（不留半截状态）
    },
    /** 插件报来的编辑态开/关（`v3:editor-state`）→ 写进响应式 data，驱动 `.v3-content--editor`。 */
    setEditorLayout(p) {
      const key = this.contentLiveKey()
      this.editorLayout = (p && p.open && key && tabKey(p.project, p.path) === key) ? 'editor' : ''
    },
    /**
     * 顺序取证（第二步 c）：把插件侧的**关键动作**记进宿主的顺序流水
     * （`window.PrivHub.viewers.lifecycle`），与 viewer 的挂载/卸载同一份流水 ——
     * 这样「数据捕获 / 发出保存 / 编辑态退场」三件事的先后可以像 viewer 那样被扫出来。
     * 只记不判：判定在插件侧（它才知道自己有没有真的捕获到数据）。
     */
    noteEditorLifecycle(p) {
      if (!p || !p.kind) return
      const reg = window.PrivHub && window.PrivHub.viewers
      if (!reg || typeof reg._note !== 'function') return
      const key = (p.project !== undefined && p.path !== undefined) ? tabKey(p.project, p.path) : (p.key || '')
      reg._note(p.kind, { key, id: p.id || 'privhub-files-edit-md', reason: p.reason || '' })
    },
    /* ---- 渲染根交接（第二步 d）：把 md 预览根的节点引用交给插件 ---- */
    /**
     * 「此刻内容区在渲染哪个文件」——与内容区模板同口径地取 store.content 的 key。
     * 不用 activeTab：本方法由 `store.content` 的 watcher 驱动，要的是**这份内容**的身份。
     */
    contentKeyOf(c) {
      return (c && c.key) || ''
    },
    /**
     * 渲染完成后，把 md 预览根的**节点引用**交给插件（`v3:md-root`）。
     *
     * 为什么在 `$nextTick` 里：watcher 用的是 Vue 默认（pre）flush，排在组件重渲染**之前** ——
     * 那一刻 `$refs.mdRoot` 指向的还是上一次渲染的节点。渲染完成后（`$nextTick`）才是
     * 「`v-html` 已经换过内容 / 节点已经被重建」的最终事实。这不是"等一等再猜"，
     * 而是 Vue 自己给出的"DOM 已是最新"的确切时点。
     *
     * 没有渲染根时照样发一次（`el:null`）：插件据此清掉锚点、放弃旧引用。
     * 换文件时那条路径因此不会留下上一个文件的锚点。
     */
    noticeMdRoot(reason, key) {
      const atKey = key || ''
      this.$nextTick(() => {
        const cur = this.contentKeyOf(store.content)
        if (atKey && cur && atKey !== cur) return   // 期间又换了文件：那一次的渲染会再发一次
        bus.emit('v3:md-root', { el: mdRootOf(this.$refs), project: (this.activeTab && this.activeTab.project) || '', key: cur, reason: reason || '' })
      })
    },
    /* ---- 编辑/下载（内容区操作按钮） ---- */
    editActive() {
      const t = this.activeTab
      if (!t) return
      if (t.kind === 'office') {
        if (/\.doc$/i.test(t.name)) {
          void convertDocToDocx({ entry: { name: t.name, isDir: false }, project: t.project, path: t.path })
          return
        }
        bus.emit('office:edit', { entry: { name: t.name, isDir: false }, project: t.project, path: t.path })
      }
      else if (t.kind === 'md' || isEditableText(t.name)) bus.emit('entry:open', { entry: { name: t.name, isDir: false }, project: t.project, path: t.path.includes('/') ? t.path.slice(0, t.path.lastIndexOf('/')) : '' })
    },
    async downloadActive() {
      const t = this.activeTab
      if (!t) return
      try {
        const r = await fetch('/privhub/api/download?project=' + encodeURIComponent(t.project) + '&path=' + encodeURIComponent(t.path), {
          headers: { authorization: 'Bearer ' + AUTH.token },
        })
        if (!r.ok) { window.PrivHub.toast('下载失败（HTTP ' + r.status + '）', 'error'); return }
        const blob = await r.blob()
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = t.name
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(a.href), 5000)
      } catch { window.PrivHub.toast('下载失败', 'error') }
    },
    detailActive() {
      const t = this.activeTab
      if (!t) return
      // 内容区「ℹ️ 详情」：右侧详情面板显示该文件
      nav.selected = { name: t.name, isDir: false, sizeText: t.sizeText, type: t.type }
      nav.rightOpen = true
    },
    /* 内容区头部详情开关：开/关右侧详细信息面板 */
    detailToggle() {
      const t = this.activeTab
      if (!t) return
      if (this.detailOpen) { nav.rightOpen = false; return }
      nav.selected = { name: t.name, isDir: false, sizeText: t.sizeText, type: t.type }
      nav.rightOpen = true
    },
    /* ---- 预览字体大小（独立于页面字体） ---- */
    applyPreviewFont() {
      document.documentElement.style.setProperty('--v3-preview-font', this.previewFont + 'px')
      try { localStorage.setItem('privhub_preview_font', String(this.previewFont)) } catch { /* 忽略 */ }
    },
    previewFontInc() { this.previewFont = Math.min(24, Math.round((this.previewFont + 1) * 10) / 10); this.applyPreviewFont() },
    previewFontDec() { this.previewFont = Math.max(10, Math.round((this.previewFont - 1) * 10) / 10); this.applyPreviewFont() },
    previewFontReset() { this.previewFont = 13.5; this.applyPreviewFont() },
    /* ---- 内容区 ⋯ 菜单（把原先散在标题行上的功能收进一个按钮） ---- */
    toggleMenu() { store.menu = !store.menu },
    menuCloseCurrent() { store.menu = false; close(store.activeKey) },
    menuCloseOthers() { store.menu = false; closeOthers(store.activeKey) },
    menuCloseAll() {
      store.menu = false
      store.tabs = []
      store.activeKey = ''
      store.content = null
      persistTabs()
    },
    async menuCopyPath() {
      store.menu = false
      const t = this.activeTab
      if (!t) return
      const abs = t.project + '/' + t.path
      try { await navigator.clipboard.writeText(abs); window.PrivHub.toast('已复制：' + abs) } catch { window.PrivHub.toast('复制失败：' + abs, 'warn') }
    },
    reloadActive() { const t = this.activeTab; if (t) void loadContent(t.key) },
    /* ---- 目录浏览 ---- */
    onEntryClick(e) {
      if (e.isDir) { nav.openDir(nav.project, nav.relPathOf(e.name)); return }
      openTab(e, nav.project, nav.path)
    },
    onEntryDbl(e) { this.onEntryClick(e) },
    startPress(e, el) {
      this.pressTimer = setTimeout(() => {
        const rect = el.getBoundingClientRect()
        openMenuFor(e, nav.path, Math.min(rect.left + 20, window.innerWidth - 180), Math.min(rect.top + 20, window.innerHeight - 160))
      }, 1500)
    },
    cancelPress() { if (this.pressTimer) { clearTimeout(this.pressTimer); this.pressTimer = null } },
    openCtxMenu(e, ev) { this.cancelPress(); openMenuFor(e, nav.path, ev.clientX, ev.clientY) },
    onDots(e, ev) { ev.stopPropagation(); openMenuFor(e, nav.path, ev.clientX, ev.clientY + 6) },
    closeMenu() { closeMenu() },
    openDetail() { openDetail() },
    doRename() { doRename() },
    submitRename() { void submitRename() },
    cancelRename() { cancelRename() },
    doDelete() { doDelete() },
    doFavorite() { doFavorite() },
    doDownload() { void doDownload() },
    doCopyHere() { void doCopyHere() },
    doMoveOpen() { void doMoveOpen() },
    doMoveSubmit() { void doMoveSubmit() },
    doEdit() { doEdit() },
    doMkdirHere() { doMkdirHere() },
    /* 文件夹 ⋯ 菜单：本次上传的目标目录（相对项目根）。
     * 根节点 → 项目根 ''；非文件夹节点 → null（不该出现上传项）。
     * ⚠ 必须在 closeMenu() 之前取值：closeMenu 会清空 store.ctxMenu。 */
    uploadTargetRel() {
      const m = store.ctxMenu
      if (!m || !m.entry.isDir) return null
      const isRoot = m.dirPath === '' && m.entry.name === m.project
      return isRoot ? '' : relPath(m.project, m.dirPath, m.entry.name)
    },
    /* 文件夹 ⋯ 菜单：上传【文件】到该文件夹（指定目标目录）
     * 与「上传文件夹」分列两项：浏览器同一个 file input 无法同时选文件与文件夹
     * （webkitdirectory 只认目录），故一次点击只能承担一种。 */
    doUploadFilesHere() {
      const rel = this.uploadTargetRel()
      closeMenu()
      if (rel === null) return
      bus.emit('upload:request', { path: rel })
    },
    /* 文件夹 ⋯ 菜单：上传【整个文件夹】到该文件夹（指定目标目录） */
    doUploadFolderHere() {
      const rel = this.uploadTargetRel()
      closeMenu()
      if (rel === null) return
      bus.emit('upload:request-dir', { path: rel })
    },
    /* 树根 ⋯ 菜单：邀请成员（admin，privhub-files-invite 插件弹窗） */
    doInvite() {
      const m = store.ctxMenu
      closeMenu()
      if (!m) return
      bus.emit('invite:open', { project: m.project })
    },
    async openPerm() { await openPerm() },
    /* ---- 内联输入模态（批量移动 / 新建子文件夹） ---- */
    batchMove() {
      const names = Object.keys(nav.checked).filter(n => nav.checked[n])
      if (!names.length) return
      store.promptState = { mode: 'move', title: '移动到哪个目录？（相对当前项目根，留空 = 项目根）', value: '' }
    },
    async doBatchMove(dir) {
      const names = Object.keys(nav.checked).filter(n => nav.checked[n])
      store.promptState = null
      this.batchBusy = true
      let okCount = 0
      try {
        for (const n of names) {
          const rel = nav.relPathOf(n)
          try {
            const r = await api('/privhub/api/move', { method: 'POST', body: JSON.stringify({ project: nav.project, from: rel, toDir: dir }) })
            if (r.ok) okCount++
            else { window.PrivHub.toast('移动「' + n + '」失败：' + (r.error || '未知错误'), 'error'); break }
          } catch { window.PrivHub.toast('移动「' + n + '」失败', 'error'); break }
        }
      } finally { this.batchBusy = false }
      nav.checked = {}
      if (okCount > 0) {
        window.PrivHub.toast('已移动 ' + okCount + '/' + names.length + ' 项')
        await nav.openDir(nav.project, nav.path)
        await refreshTree()
      }
    },
    submitPrompt() {
      const st = store.promptState
      if (!st) return
      const value = st.value.trim()
      if (!value) return
      if (st.mode === 'move') void this.doBatchMove(value)
      else if (st.mode === 'mkdir') void doMkdirHereSubmit(value)
    },
    cancelPrompt() { store.promptState = null },
    /* ---- 批量选择 ---- */
    isChecked(name) { return nav.checked[name] === true },
    toggleCheck(e, ev) {
      ev.stopPropagation()
      if (nav.checked[e.name]) delete nav.checked[e.name]
      else nav.checked[e.name] = true
    },
    checkedCount() { return Object.keys(nav.checked).filter(n => nav.checked[n]).length },
    checkedSizeText() {
      const names = Object.keys(nav.checked).filter(n => nav.checked[n])
      let total = 0
      for (const n of names) {
        const e = nav.entries.find(x => x.name === n)
        if (e && !e.isDir && typeof e.size === 'number') total += e.size
      }
      if (total === 0) return ''
      if (total < 1024) return total + ' B'
      if (total < 1024 * 1024) return (total / 1024).toFixed(1) + ' KB'
      return (total / 1024 / 1024).toFixed(1) + ' MB'
    },
    selectAll() {
      const all = this.entries.every(e => nav.checked[e.name])
      if (all) nav.checked = {}
      else { nav.checked = {}; for (const e of this.entries) nav.checked[e.name] = true }
    },
    clearChecked() { nav.checked = {} },
    async batchDownload() {
      const names = Object.keys(nav.checked).filter(n => nav.checked[n])
      const files = names.map(n => nav.entries.find(e => e.name === n)).filter(e => e && !e.isDir)
      if (!files.length) { window.PrivHub.toast('所选项目中无文件可下载', 'warn'); return }
      this.batchBusy = true
      try {
        for (const e of files) {
          try {
            const r = await fetch('/privhub/api/download?project=' + encodeURIComponent(nav.project) + '&path=' + encodeURIComponent(nav.relPathOf(e.name)), {
              headers: { authorization: 'Bearer ' + AUTH.token },
            })
            if (!r.ok) continue
            const blob = await r.blob()
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = e.name
            document.body.appendChild(a)
            a.click()
            a.remove()
            setTimeout(() => URL.revokeObjectURL(a.href), 5000)
          } catch { /* 单条失败继续 */ }
        }
        window.PrivHub.toast('已开始下载 ' + files.length + ' 个文件')
      } finally { this.batchBusy = false }
    },
    async batchDelete() {
      const names = Object.keys(nav.checked).filter(n => nav.checked[n])
      if (!names.length) return
      if (!confirm('将选中的 ' + names.length + ' 项移入回收站（30 天后自动清除，可在回收站恢复）？')) return
      this.batchBusy = true
      let okCount = 0
      try {
        for (const n of names) {
          const rel = nav.relPathOf(n)
          try { const r = await api('/privhub/api/delete', { method: 'POST', body: JSON.stringify({ project: nav.project, path: rel }) }); if (r.ok) okCount++ } catch { /* 单条失败继续 */ }
        }
      } finally { this.batchBusy = false }
      nav.checked = {}
      await nav.openDir(nav.project, nav.path)
      await refreshTree()
      bus.emit('trash:changed', {})
      window.PrivHub.toast('已将 ' + okCount + '/' + names.length + ' 项移入回收站')
    },
    /* ---- 其他 ---- */
    doSubmitMkdir() { submitMkdirV3() },
    doAddFile() { nav.addFile() },
    /* 合并查重入口：跳转 AI 工具 → 查重页签（RagView 消费 ragIntent 后自动选中 nav.project） */
    openDup() {
      if (window.PrivHub.openRagDup) window.PrivHub.openRagDup()
      else window.PrivHub.toast('查重页面未就绪（AI 工具未加载）', 'error')
    },
    renderMd() { return this.content && this.content.markdown !== undefined ? renderMarkdown(this.content.markdown) : '' },
    /* E3：长按功能发现性——首次进入面板提示一次 */
    maybeHint() {
      if (localStorage.getItem('privhub_longpress_hint')) return
      localStorage.setItem('privhub_longpress_hint', '1')
      window.PrivHub.toast('提示：长按文件或文件夹可呼出操作菜单', 'warn')
    },
  },
  mounted() {
    restoreTabs()
    this.applyPreviewFont()
    this.maybeHint()
    this._offMd = bus.on('md:changed', () => {
      const t = store.tabs.find(x => x.key === store.activeKey)
      if (t && (t.kind === 'md' || (t.kind === 'text' && isEditableText(t.name)))) void loadContent(t.key)
      if (nav.project !== null) { void nav.openDir(nav.project, nav.path); void refreshTree() }
      // openDir 会清零选中/右侧详情；标签仍激活 → 重新选中当前文件，详情面板保持打开
      const tab = store.tabs.find(x => x.key === store.activeKey)
      if (tab && nav.project === tab.project) {
        nav.selected = { name: tab.name, isDir: false, sizeText: tab.sizeText, type: tab.type }
        nav.rightOpen = true
      }
    })
    this._offTrash = bus.on('trash:changed', () => { if (nav.project !== null) { void nav.openDir(nav.project, nav.path); void refreshTree() } })
    // 跨插件刷新（新建文档向导等创建文件后通知，刷新目录树缓存；列表由调用方 openDir 刷新）
    this._offRef = bus.on('files:refresh', () => { if (nav.project !== null) void refreshTree() })
    // 脏标记：md 编辑器未保存 → 标签标题 ●
    this._offDirty = bus.on('md:dirty', (p) => {
      if (!p || !p.project || !p.path) return
      const t = store.tabs.find(x => x.project === p.project && x.path === p.path)
      if (t && !!t.dirty !== !!p.dirty) { t.dirty = !!p.dirty; persistTabs() }
    })
    this._offTabOpened = bus.on('v3:tab-opened', () => {}) // 占位：未来跨组件联动
    /* 编辑舱位（第二步 c）：三条线——① 同步回答「能不能内嵌」；② 接收编辑态开/关（驱动布局类）；
     * ③ 接收插件的顺序取证事件（写进宿主的顺序流水）。 */
    this._offEditorAsk = bus.on('v3:editor-host-ask', (p) => { bus.emit('v3:editor-host', this.editorHostInfo(p)) })
    this._offEditorState = bus.on('v3:editor-state', (p) => { this.setEditorLayout(p) })
    this._offEditorLog = bus.on('md:editor-lifecycle', (p) => { this.noteEditorLifecycle(p) })
    // 进面板时先算一次（从 sessionStorage 恢复标签的场景：内容区一渲染就可能有胶囊/编辑态）
    this.syncEditorHost('mount')
  },
  beforeUnmount() {
    /* 内容区随本组件一起消失（例如切到管理控制台）→ 存量 viewer 必须收干净，
     * 这正是第一步那个「残留」bug 的另一个入口。 */
    if (this._viewerSession) this._viewerSession.dispose('teardown')
    /* 编辑舱位同样随本组件一起消失：先请插件退场（它会自己捕获数据并发出保存），
     * 再把监听器摘掉 —— 顺序不能倒，否则插件不知道该退场，手里会攥着已销毁的目标。 */
    this._editorHostKey = null
    bus.emit('v3:editor-host', { available: false, key: '', selector: EDITOR_SELECTOR, reason: 'panel-teardown' })
    this.editorLayout = ''
    if (this._offEditorAsk) this._offEditorAsk()
    if (this._offEditorState) this._offEditorState()
    if (this._offEditorLog) this._offEditorLog()
    if (this._offMd) this._offMd()
    if (this._offTrash) this._offTrash()
    if (this._offRef) this._offRef()
    if (this._offDirty) this._offDirty()
    if (this._offTabOpened) this._offTabOpened()
  },
  template: `
    <div style="display:contents">
      <!-- 标签行：左＝标签栏（文件名唯一出处），右＝操作区（详情 / ⋯），同一行不叠层 -->
      <div v-if="showTabs" class="v3-tabrow">
        <div class="v3-tabs">
          <div
            v-for="t in store.tabs" :key="t.key"
            class="v3-tab" :class="{ on: t.key === store.activeKey }"
            @click="activate(t.key)" @auxclick="onAuxclick(t.key, $event)"
            :title="t.project + ' / ' + t.path"
          >
            <span>{{ fileIcon(t.type) }}</span>
            <span class="v3-tab-name">{{ t.dirty ? '● ' : '' }}{{ t.name }}</span>
            <span class="v3-tab-x" title="关闭" @click.stop="close(t.key)">✕</span>
          </div>
          <div style="flex:1"></div>
        </div>
        <div v-if="activeTab" class="v3-tabops">
          <button class="v3-op-btn" :title="detailOpen ? '关闭右侧详细信息' : '打开右侧详细信息'" @click="detailToggle">{{ detailOpen ? '✖ 详情' : 'ℹ️ 详情' }}</button>
          <button class="v3-op-btn" title="更多（字号 / 关闭标签 / 文件位置）" @click.stop="toggleMenu">⋯</button>
          <div v-if="store.menu" class="ctx-mask" @click="store.menu = false"></div>
          <div v-if="store.menu" class="v3-menu" @click.stop>
            <div class="v3-menu-row" title="内容/编辑字号">
              <span>字号</span>
              <span class="v3-fs" @click="previewFontDec">A−</span>
              <span class="v3-fs" @click="previewFontReset">{{ previewFont }}px</span>
              <span class="v3-fs" @click="previewFontInc">A+</span>
            </div>
            <div class="v3-menu-sep"></div>
            <div class="v3-menu-item" @click="menuCloseCurrent">✕ 关闭当前标签</div>
            <div v-if="store.tabs.length > 1" class="v3-menu-item" @click="menuCloseOthers">✕ 关闭其他标签</div>
            <div v-if="store.tabs.length > 1" class="v3-menu-item" @click="menuCloseAll">✕ 关闭全部标签</div>
            <div class="v3-menu-sep"></div>
            <div class="v3-menu-item" :title="activeTab.project + ' / ' + activeTab.path" @click="menuCopyPath">📋 复制文件位置<span class="v3-menu-k">{{ activeTab.project }}</span></div>
          </div>
        </div>
      </div>

      <!-- 主区：有激活标签 → 内容区；否则 → 目录浏览 -->
      <template v-if="activeTab && content && content.key === activeTab.key">
        <div :class="contentClass">
          <!-- 内容区不再有任何顶栏/悬浮条：文件名在标签行，操作也在标签行 -->
          <!-- 大文件只读说明（content.js 判定后给出；不弹窗、不加按钮、不改布局，
               只是内容区顶部一行克制的话，滚走即不可见） -->
          <div v-if="content.readonlyHint" class="v3-readonly-hint">{{ content.readonlyHint }}</div>
          <div v-if="content.state === 'loading'" class="v3-loading">正在加载…</div>
          <div v-else-if="content.state === 'error'" class="v3-loading">{{ content.error }}</div>
          <!-- ref="mdRoot"：这个节点就是「md 渲染根」，宿主在渲染完成后经 bus v3:md-root
               把它的引用交给 comments（批注锚点插在它里面）。它是宿主自己模板里的节点，
               插件不再按 .v3-content/.v3-md 去查、也不再在它上面挂 MutationObserver。 -->
          <template v-else-if="content.office">
            <div v-html="renderMd()" class="v3-md" ref="mdRoot"></div>
          </template>
          <template v-else-if="content.markdown !== undefined">
            <div v-html="renderMd()" class="v3-md" ref="mdRoot"></div>
          </template>
          <template v-else-if="content.text !== undefined">
            <pre class="v3-text">{{ content.text }}</pre>
          </template>
          <template v-else-if="content.url">
            <div v-if="activeTab.kind === 'image'" class="v3-img-wrap"><img class="v3-img" style="cursor:zoom-in" :src="content.url" :alt="activeTab.name" @click="store.lightbox = content.url" /></div>
            <iframe v-else class="v3-pdf" :src="content.url"></iframe>
          </template>
          <!-- 挂载锚点（第二步 a）：**由宿主创建与销毁**，位置永远在这一处。
               插件只拿到这个 div，不再认 .v3-content；没有 viewer 上场时它保持为空，
               空 div 不占位、不加样式 ⇒ 现有布局一字未变（老路照跑）。
               data-viewer 由 viewer 会话写：'none' = 没人在场；否则是 viewer 的 id。 -->
          <div class="v3-viewer-host" data-viewer="none"></div>
          <!-- 编辑舱位（第二步 c）：**由宿主创建与销毁**，位置固定在这一处。
               内嵌编辑器（edit-md）只拿到这个 div，不再认宿主的内容区容器；
               空 div 不占位、不加样式 ⇒ 没有编辑态时布局一字未变。
               能不能用它由宿主经 bus 作答（见文件头「编辑舱位」一节）。 -->
          <div class="v3-editor-host"></div>
        </div>
      </template>

      <template v-else>
        <div class="main-head">
          <span class="breadcrumb">
            <span v-for="(c, i) in crumbs" :key="i">
              <a v-if="i < crumbs.length - 1" @click="nav.gotoCrumb(c.path)" style="cursor:pointer">{{ i === 0 ? '📁 ' : '' }}{{ c.label }}</a>
              <span v-else style="color:var(--text)">{{ i === 0 ? '📁 ' : '' }}{{ c.label }}</span>
              <span v-if="i < crumbs.length - 1" class="crumb"> / </span>
            </span>
          </span>
          <span class="crumb" style="margin-left:8px">共 {{ entries.length }} 个文件</span>
          <span v-if="checkedCount() > 0" class="crumb" style="margin-left:8px;color:var(--accent)">已选 {{ checkedCount() }} 项{{ checkedSizeText() ? ' · ' + checkedSizeText() : '' }}</span>
          <span class="spacer"></span>
          <button v-if="nav.project" class="icon-btn" style="margin-left:4px" title="查重整个项目：同名同大小 + 内容一字不差（合并查重）" @click="openDup">🔁 查重</button>
          <template v-if="checkedCount() > 0">
            <button class="icon-btn" @click="selectAll">☑ 全选/取消</button>
            <button class="icon-btn" @click="clearChecked">取消选择</button>
            <button class="icon-btn" :disabled="batchBusy" @click="batchDownload">{{ batchBusy ? '处理中…' : '⬇ 下载所选' }}</button>
            <button class="icon-btn" :disabled="batchBusy" @click="batchMove">{{ batchBusy ? '处理中…' : '📦 移动所选' }}</button>
            <button class="icon-btn" style="color:var(--danger)" :disabled="batchBusy" @click="batchDelete">{{ batchBusy ? '处理中…' : '🗑 删除所选 (' + checkedCount() + ')' }}</button>
          </template>
          <span v-if="nav.uploading" class="crumb">上传中 {{ nav.uploadDone }}/{{ nav.uploadTotal }}…</span>
        </div>
        <div class="main-body">
          <div v-if="nav.listLoading" class="empty">加载中…</div>
          <div v-else-if="entries.length === 0" class="empty">
            <div style="font-size:32px;margin-bottom:10px">📂</div>
            <div style="font-size:13.5px;color:var(--text)">此文件夹下没有文件</div>
            <div style="font-size:12px;color:var(--muted);margin:6px 0 14px">上传文件，或从左侧目录树管理文件夹</div>
            <button class="btn btn-primary" style="width:auto" @click="doAddFile">⬆ 上传文件</button>
            <button class="icon-btn" style="margin-left:8px" @click="doSubmitMkdir">📁 新建文件夹</button>
          </div>
          <div v-else class="file-table-wrap">
            <div class="file-table-head" style="grid-template-columns:28px 1fr 90px 120px 110px 26px">
              <span><input type="checkbox" @click="selectAll" /></span>
              <span class="col-name" style="cursor:pointer" @click="nav.toggleSort('name')" title="按名称排序">名称{{ nav.sortKey==='name' ? (nav.sortAsc?' ↑':' ↓') : '' }}</span>
              <span class="col-size" style="cursor:pointer" @click="nav.toggleSort('size')" title="按大小排序">大小{{ nav.sortKey==='size' ? (nav.sortAsc?' ↑':' ↓') : '' }}</span>
              <span class="col-type">类型</span>
              <span class="col-time" style="cursor:pointer" @click="nav.toggleSort('mtime')" title="按修改时间排序">修改时间{{ nav.sortKey==='mtime' ? (nav.sortAsc?' ↑':' ↓') : '' }}</span>
              <span></span>
            </div>
            <div
              v-for="e in entries" :key="e.name"
              class="file-table-row" :class="{ sel: nav.selected && nav.selected.name === e.name }"
              style="grid-template-columns:28px 1fr 90px 120px 110px 26px"
              @click="onEntryClick(e)"
              @dblclick="onEntryDbl(e)"
              @mousedown="startPress(e, $event.currentTarget)"
              @mouseup="cancelPress"
              @mouseleave="cancelPress"
              @contextmenu.prevent="openCtxMenu(e, $event)"
            >
              <span><input type="checkbox" :checked="isChecked(e.name)" @click="toggleCheck(e, $event)" style="cursor:pointer" /></span>
              <span class="col-name">
                <template v-if="store.renameState && store.renameState.entry.name === e.name && !e.isDir">
                  <input
                    v-model="store.renameState.value"
                    @keyup.enter="submitRename"
                    @keyup.esc="cancelRename"
                    @click.stop
                    @dblclick.stop
                    @mousedown.stop
                    style="width:100%;padding:3px 6px;border-radius:4px;border:1px solid var(--accent);background:var(--bg);color:var(--text);font-size:12.5px;outline:none"
                  />
                </template>
                <template v-else><span class="tico">{{ fileIcon(e.type) }}</span>{{ e.name }}</template>
              </span>
              <span class="col-size">{{ e.sizeText }}</span>
              <span class="col-type">{{ e.type }}</span>
              <span class="col-time">{{ e.mtime ? e.mtime.replace('T', ' ').slice(0, 16) : '—' }}</span>
              <span class="v3-row-dots" title="操作" @click="onDots(e, $event)">⋯</span>
            </div>
          </div>
        </div>
      </template>

      <!-- ⋯ / 右键 / 长按 共用菜单 -->
      <div v-if="store.ctxMenu" class="ctx-mask" @click="closeMenu"></div>
      <div v-if="store.ctxMenu" class="ctx-menu" :style="{ left: store.ctxMenu.x + 'px', top: store.ctxMenu.y + 'px' }" @click.stop>
        <div class="ctx-item" @click="openDetail">ℹ️ 详情</div>
        <div class="ctx-item" @click="openPerm">🔐 权限</div>
        <div class="ctx-item" @click="doFavorite">⭐ 收藏</div>
        <div v-if="!store.ctxMenu.entry.isDir" class="ctx-item" @click="doDownload">⬇ 下载</div>
        <div v-if="!store.ctxMenu.entry.isDir" class="ctx-item" @click="doCopyHere">📄 复制副本</div>
        <div class="ctx-item" @click="doMoveOpen">📦 移动</div>
        <div v-if="!store.ctxMenu.entry.isDir && (isOfficeMenu || isMdMenu || isTextMenu)" class="ctx-item" @click="doEdit">✏️ 编辑</div>
        <div class="ctx-item" @click="doRename">✏️ 重命名</div>
        <div v-if="store.ctxMenu.entry.isDir" class="ctx-item" @click="doMkdirHere">＋ 新建子文件夹</div>
        <div v-if="store.ctxMenu.entry.isDir" class="ctx-item" @click="doUploadFilesHere">⬆ 上传文件到该文件夹</div>
        <div v-if="store.ctxMenu.entry.isDir" class="ctx-item" @click="doUploadFolderHere">📁⬆ 上传文件夹到该文件夹</div>
        <div v-if="isRootMenu && isAdmin" class="ctx-item" @click="doInvite">📨 邀请成员</div>
        <div class="ctx-item danger" @click="doDelete">🗑 删除</div>
      </div>

      <!-- 图片放大预览（lightbox） -->
      <div v-if="store.lightbox" class="modal-mask" style="background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center" @click.self="store.lightbox = null">
        <span style="position:fixed;top:16px;right:24px;font-size:24px;color:#fff;cursor:pointer;z-index:1101" @click="store.lightbox = null">✕</span>
        <img :src="store.lightbox" style="max-width:92vw;max-height:88vh;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,.5)" />
      </div>

      <!-- 权限弹窗 -->
      <div v-if="store.permTarget" class="modal-mask" @click.self="store.permTarget = null">
        <div class="modal" style="width:420px">
          <h2>🔐 权限 · {{ store.permTarget.entry.name }}</h2>
          <div class="modal-body">
            <div v-if="store.permTarget.loading" style="color:var(--muted);font-size:12.5px;padding:10px 0">加载中…</div>
            <template v-else>
              <div class="kv"><span class="k">当前用户</span><span>{{ AUTH.user.username }}（{{ AUTH.user.role === 'admin' ? '管理员' : '普通用户' }}）</span></div>
              <div class="kv"><span class="k">项目可见</span><span>{{ (nav.projectsList || []).includes(store.permTarget.project) ? '✅ 可访问' : '⛔ 不可访问' }}</span></div>
              <div style="margin-top:12px;font-size:12.5px;color:var(--muted)">
                <template v-if="AUTH.user.role === 'admin'">
                  以下为该项目/路径生效的 ACL 规则：
                  <div v-if="store.permTarget.rules && store.permTarget.rules.length" style="margin-top:8px">
                    <div v-for="(r, i) in store.permTarget.rules" :key="i" class="kv">
                      <span class="k">{{ r.path === '' ? '（项目根）' : r.path }}</span>
                      <span>{{ r.role }} · {{ r.action || '全部' }} · {{ r.allow ? '✅ 允许' : '⛔ 拒绝' }}</span>
                    </div>
                  </div>
                  <div v-else style="margin-top:8px">（无 ACL 规则，默认按项目可见性放行）</div>
                </template>
                <template v-else>
                  文件级权限规则由管理员在「权限管理」中配置。若你对该文件的操作被拒绝，请联系管理员调整 ACL。
                </template>
              </div>
              <div v-if="store.permTarget.error" style="margin-top:10px;color:var(--danger);font-size:12.5px">{{ store.permTarget.error }}</div>
            </template>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" @click="store.permTarget = null">关 闭</button>
          </div>
        </div>
      </div>

      <!-- 移动选择器（⋯ 菜单「移动」→ 树形目录选择） -->
      <div v-if="store.moveState" class="modal-mask" @click.self="store.moveState = null">
        <div class="modal" style="width:430px">
          <h2>📦 移动「{{ store.moveState.entry.name }}」到…</h2>
          <div class="modal-body">
            <div v-if="store.moveState.loading" style="color:var(--muted);font-size:12.5px;padding:12px 0">加载目录…</div>
            <template v-else>
              <div style="font-size:12.5px;max-height:320px;overflow:auto">
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:6px 8px;border-radius:6px" :style="{ background: store.moveState.target === '' ? 'rgba(90,130,200,.12)' : '' }">
                  <input type="radio" v-model="store.moveState.target" value="" /> 🏠 项目根目录
                </label>
                <label v-for="n in store.moveState.tree" :key="n.path" style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:6px 8px;border-radius:6px" :style="{ paddingLeft: (8 + n.depth * 18) + 'px', background: store.moveState.target === n.path ? 'rgba(90,130,200,.12)' : '' }">
                  <input type="radio" v-model="store.moveState.target" :value="n.path" /> 📁 {{ n.name }}
                </label>
              </div>
              <div style="color:var(--muted);font-size:12px;margin-top:6px">不能移动到自身或其子目录</div>
            </template>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" @click="store.moveState = null">取 消</button>
            <button class="btn btn-primary" style="width:auto" :disabled="store.moveState.busy" @click="doMoveSubmit">确 定</button>
          </div>
        </div>
      </div>

      <!-- 内联输入模态（批量移动 / 新建子文件夹） -->
      <div v-if="store.promptState" class="modal-mask" @click.self="cancelPrompt">
        <div class="modal" style="width:380px">
          <h2>{{ store.promptState.mode === 'move' ? '📦 批量移动' : '＋ 新建子文件夹' }}</h2>
          <div class="modal-body">
            <div class="field">
              <label>{{ store.promptState.title }}</label>
              <input v-model="store.promptState.value" @keyup.enter="submitPrompt" placeholder="输入后回车确认" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text)" />
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" @click="cancelPrompt">取 消</button>
            <button class="btn btn-primary" style="width:auto" @click="submitPrompt">确 定</button>
          </div>
        </div>
      </div>
    </div>
  `,
}

/* 菜单项动态显示（office/md/文本 才显示编辑）——用计算属性替代模板内函数 */
PanelV3.computed.isOfficeMenu = function () {
  const m = store.ctxMenu
  if (!m || m.entry.isDir) return false
  return /\.(doc|docx|xls|xlsx|ppt|pptx|pdf)$/i.test(m.entry.name)
}
PanelV3.computed.isMdMenu = function () {
  const m = store.ctxMenu
  if (!m || m.entry.isDir) return false
  return /\.md$/i.test(m.entry.name)
}
PanelV3.computed.isTextMenu = function () {
  const m = store.ctxMenu
  if (!m || m.entry.isDir) return false
  return isEditableText(m.entry.name)
}

PanelV3.components = { 'v3-tree-node': TreeNodeV3 }

export { PanelV3, layoutForAction }
