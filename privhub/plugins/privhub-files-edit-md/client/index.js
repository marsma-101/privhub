/**
 * privhub-files-edit-md · client — Markdown 在线编辑器（挂 md-editor slot，浮层形态）
 *
 * 打开方式：双击任意 .md 文件（骨架 openEntry emit 'entry:open'）→ 本组件
 * 监听 bus，判定为 .md 后打开全屏编辑浮层：左侧编辑（textarea，无构建链）、
 * 右侧实时预览（自带轻量 markdown 渲染器，离线可用）。
 *
 * 能力：
 *   - frontmatter（--- title/tags/created ---）解析显示，保存后自动补齐 created
 *   - 双链 [[文件名]] 渲染为可点击链接，点击定位当前目录同名文件
 *   - 保存：PUT /api/doc（带 baseMtime 冲突检测，409 时确认覆盖后重试）
 *   - 版本历史：GET /api/doc/versions + POST /api/doc/restore（回滚）
 *   - 未保存修改关闭前提示；保存/回滚后 emit bus 'md:changed'（供列表刷新）
 *
 * ── 两种形态（第二步 c 起：位置由宿主说了算） ─────────────────────────────
 *   inline —— 挂进宿主的**编辑舱位**（`.v3-editor-host`，由宿主创建与销毁）。
 *             能不能内嵌由**宿主经 bus 作答**，本插件不再去查宿主的内容区长什么样。
 *   float  —— 全屏浮层（旧形态）：宿主给不出舱位时的兜底（md 专用；
 *             txt 等纯文本没有浮层，此时静默不动）。
 *
 * ── 退场顺序（丢内容不可接受 —— 本文件的第一优先） ───────────────────────
 *   凡是「编辑器要没了」的入口（切标签/切目录/关标签的 `md:interrupt`、宿主收走舱位、
 *   组件被整体卸载）都走同一条路：**同步捕获正文 → 同步发出保存 → 才拆编辑器**。
 *   反过来（先拆后存）就是丢未保存内容。捕获与退场都记进宿主的顺序流水，
 *   `window.PrivHub.viewers.lifecycle.log()` 里能看见「捕获早于退场」。
 *
 * @module privhub-files-edit-md/client
 */

const { api, bus, nav, AUTH } = window.PrivHub

/* ============ 宿主契约：编辑舱位 + 「能不能内嵌」（第二步 c） ============
 * 编辑器的落点是宿主的**编辑舱位** `.v3-editor-host`（与按扩展名上场的 viewer 用的
 * `.v3-viewer-host` 不是一回事：编辑态不是某个 viewer 的能力）。舱位由宿主创建/销毁；
 * 本插件在模板里用这个字面量当 teleport 目标（模板表达式只能读组件实例属性，
 * 读不到模块常量，所以这里只能是字面量 —— 与宿主 panel.js 的 EDITOR_SELECTOR 对齐，
 * 测试里有「两边字面量一致」的断言守着）。
 *
 * 三条线（事件名与宿主共用，改一处必须两边一起改）： */
const EVENT_ASK = 'v3:editor-host-ask'   // 插件问：现在能不能内嵌？
const EVENT_SAY = 'v3:editor-host'       // 宿主答：{ available, key, selector }；舱位没了也走这条（available:false）
const EVENT_STATE = 'v3:editor-state'    // 插件报：编辑态开/关（宿主据此切内容区布局类）
const EVENT_LIFE = 'md:editor-lifecycle' // 插件报：数据捕获 / 编辑态退场（宿主写进顺序流水）

/** 正文的字节数（判「有没有真的捕获到东西」用；中文一个字 3 字节，所以按字节不按字符）。 */
function utf8Bytes(s) {
  const t = typeof s === 'string' ? s : ''
  return typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(t).length : t.length
}

/**
 * 顺序取证：把「数据已捕获」「编辑态已退场」按发生顺序报给宿主，
 * 由宿主写进 `window.PrivHub.viewers.lifecycle`（与 viewer 的挂载/卸载同一份流水）。
 * 宿主不在（没装 explorer-v3 / 面板没挂载）时这条 emit 无人接收，不影响任何行为。
 */
function noteLife(kind, p) {
  bus.emit(EVENT_LIFE, { kind, id: 'privhub-files-edit-md', project: p && p.project, path: p && p.path, reason: (p && p.reason) || '' })
}

/**
 * 同步问宿主：现在能不能内嵌（舱位在、且内容区正承载这个文件）？
 * 做法是「发问 → 宿主同步答 → 收回监听」：总线是同步派发，所以拿到的是**当下**的答案，
 * 不需要缓存、也不会用到过期的状态。宿主不在 = 不能内嵌（回退浮层）。
 */
function askEditorDock(project, path) {
  let ans = null
  const off = bus.on(EVENT_SAY, (p) => { ans = p })
  bus.emit(EVENT_ASK, { project, path })
  if (typeof off === 'function') off()
  return ans && ans.available ? ans : null
}


/* ============ 轻量 markdown 渲染（离线、无依赖） ============ */
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** 行内渲染：代码 / 加粗 / 斜体 / 行内链接 / 双链 */
function inline(s) {
  let out = esc(s)
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  // 双链 [[文件名]]
  out = out.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (m, name, alias) => {
    const label = esc(alias || name)
    return '<a href="javascript:void 0" class="md-wikilink" data-name="' + esc(name) + '">🔗 ' + label + '</a>'
  })
  // 普通链接 [text](url)
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
  return out
}

/** 整文渲染：代码块 / 标题 / 列表 / 表格 / 引用 / 分隔线 / 段落 */
function renderMarkdown(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const html = []
  let i = 0
  let inCode = false
  let codeBuf = []
  let listBuf = []
  let listType = ''
  const flushList = () => {
    if (!listBuf.length) return
    html.push('<' + (listType === 'ol' ? 'ol' : 'ul') + '>' + listBuf.map((x) => '<li>' + x + '</li>').join('') + '</' + (listType === 'ol' ? 'ol' : 'ul') + '>')
    listBuf = []
  }
  while (i < lines.length) {
    const line = lines[i]
    if (inCode) {
      if (line.trim().startsWith('```')) { inCode = false; html.push('<pre><code>' + esc(codeBuf.join('\n')) + '</code></pre>'); codeBuf = [] }
      else codeBuf.push(line)
      i++
      continue
    }
    if (line.trim().startsWith('```')) { flushList(); inCode = true; i++; continue }
    const t = line.trim()
    if (t === '') { flushList(); html.push(''); i++; continue }
    const h = /^(#{1,6})\s+(.*)$/.exec(t)
    if (h) { flushList(); html.push('<h' + h[1].length + '>' + inline(h[2]) + '</h' + h[1].length + '>'); i++; continue }
    if (t === '---' || t === '***') { flushList(); html.push('<hr />'); i++; continue }
    if (/^&gt;\s?/.test(t) || t.startsWith('>')) { flushList(); html.push('<blockquote>' + inline(t.replace(/^>\s?/, '')) + '</blockquote>'); i++; continue }
    if (/^[-*+]\s+/.test(t)) { if (listType !== 'ul') { flushList(); listType = 'ul' } listBuf.push(inline(t.replace(/^[-*+]\s+/, ''))); i++; continue }
    if (/^\d+\.\s+/.test(t)) { if (listType !== 'ol') { flushList(); listType = 'ol' } listBuf.push(inline(t.replace(/^\d+\.\s+/, ''))); i++; continue }
    flushList(); listType = ''
    // 表格
    if (/^\|/.test(t) && i + 1 < lines.length && /^\|[\s:|-]+\|$/.test(lines[i + 1].trim())) {
      const head = t.split('|').slice(1, -1).map((c) => inline(c.trim()))
      i += 2
      const rows = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].split('|').slice(1, -1).map((c) => inline(c.trim())))
        i++
      }
      html.push('<table><thead><tr>' + head.map((c) => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>' + rows.map((r) => '<tr>' + r.map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table>')
      continue
    }
    html.push('<p>' + inline(t) + '</p>')
    i++
  }
  if (inCode) html.push('<pre><code>' + esc(codeBuf.join('\n')) + '</code></pre>')
  flushList()
  return html.join('\n')
}

/** frontmatter：解析 --- 块；返回 { meta: {key:val}, body, hasMeta } */
function parseFrontmatter(doc) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(doc)
  if (!m) return { meta: {}, body: doc, hasMeta: false }
  const meta = {}
  for (const line of m[1].split('\n')) {
    const kv = /^([\w-]+):\s*(.*)$/.exec(line.trim())
    if (kv) meta[kv[1]] = kv[2].replace(/^["']|["']$/g, '')
  }
  return { meta, body: doc.slice(m[1].length + 9), hasMeta: true }
}

function buildFrontmatter(meta) {
  return '---\n' + Object.entries(meta).map(([k, v]) => k + ': ' + v).join('\n') + '\n---\n\n'
}

/* 可内嵌编辑的文本扩展名（md 走 doc 接口 + 版本；其余走 text-save 接口）。
 *
 * 【扩展名一处定义】这份取值必须与 `explorer-v3/client/utils.js` 的 `TEXT_EDIT_EXTS`
 * **逐项同值**（断言 `tests/file-exts.mjs` 守着，任一侧漂了立刻变红）。
 * 为什么这里仍有一份字面量而不是 import：浏览器侧跨插件 import 不成立 ——
 * 静态服务只映射 `plugins/<插件名>/client/`，且 `tests/integrity.mjs` 要求 client 模块只引用同目录文件；
 * 而"让 explorer-v3 反过来 import edit-md"会把依赖方向弄反（edit-md 一旦卸载就崩）。
 * ⇒ 所以前端侧是「**每侧一份单点定义 + 一致性由断言钉住**」，详见
 *   `plugins/privhub-core/src/file-exts.ts` 的「前端怎么办」一节。
 * 本批**有意不扩**：`html`/`htm` 预览出源码，新增的预览类
 * （`tsx/ps1/conf/vue/go/rs/env/jsonl/tsv/ipynb`）不进编辑集 —— 本批只补预览。
 * `md` **必须留着**：本文件 `openEditor()` 第一句就是 `isEditableText(e.name)` 闸，
 * 界面上多处 `entry:open`（右键「编辑」、详情面板按钮）**不带** md 的额外放行条件。 */
const EDITABLE_TEXT_EXTS = ['md', 'txt', 'json', 'csv', 'log', 'yaml', 'yml', 'ini', 'py', 'sh', 'bat', 'sql', 'xml', 'js', 'ts', 'css']
function isEditableText(name) {
  const ext = (name.split('.').pop() || '').toLowerCase()
  return EDITABLE_TEXT_EXTS.includes(ext)
}
function isMdName(name) { return /\.md$/i.test(name) }

/* 人读得懂的大小（MB / KB）——与 explorer-v3 的 fmtSize 同一口径，
 * 用于把接口回带的字节数说成「1.6 MB」而不是「1636165」。 */
function fmtBytes(n) {
  const x = Number(n) || 0
  if (x >= 1024 * 1024) return (x / (1024 * 1024)).toFixed(1) + ' MB'
  if (x >= 1024) return Math.round(x / 1024) + ' KB'
  return x + ' B'
}

/* ============ 编辑器组件 ============ */
const MdEditor = {
  name: 'md-editor',
  data() {
    return {
      open: false,
      mode: 'float',   // 'float' 全屏浮层（旧）| 'inline' 内容区内嵌（VS Code/Trae 式）
      isMd: false,     // 是否 Markdown（md 走 doc 接口/版本/导出；其余文本走 text-save）
      project: '',
      path: '',      // 项目内相对路径（含文件名）
      name: '',
      doc: '',
      baseMtime: 0,
      savedMtime: 0,
      dirty: false,
      saving: false,
      status: '',
      showVersions: false,
      versions: [],
      restoring: false,
      meta: {},
      previewOpen: true, // inline 预览分栏开关
    }
  },
  computed: {
    canEdit() {
      return this.canEditProject(this.project)
    },
    previewHtml() {
      return renderMarkdown(this.bodyText)
    },
    bodyText() {
      return this.doc
    },
    wordCount() { return this.doc.trim() ? this.doc.trim().split(/\s+/).length : 0 },
  },
  watch: {
    /* 脏标记联动：V3 标签标题 ●（bus md:dirty） */
    dirty(v) {
      if (this.project && this.path) bus.emit('md:dirty', { project: this.project, path: this.path, dirty: v })
    },
  },
  methods: {
    /* G2：创建/销毁 EasyMDE 实例（无构建链，单文件 UMD） */
    initMde() {
      if (this.mde) return
      const self = this
      this.mde = new EasyMDE({
        element: document.getElementById('privhub-md-editor'),
        initialValue: this.doc,
        spellChecker: false,
        autofocus: true,
        status: ['lines', 'words'],
        toolbar: [
          'bold', 'italic', 'heading', '|', 'quote', 'unordered-list', 'ordered-list', '|',
          'link', 'image', 'code', 'table', '|', 'preview', 'side-by-side', 'fullscreen', '|', 'guide',
        ],
        // 输入即标记 dirty（对应原 textarea @input）
        inputStyle: 'textarea',
        // 禁用自带 preview（使用右侧分栏预览 + 双链定位）
        previewRender() { return '' },
      })
      // 输入事件 → dirty + 同步 doc（供右侧预览）
      this.mde.codemirror.on('change', () => {
        self.doc = self.mde.value()
        self.dirty = true
        self.status = '未保存修改…'
      })
    },
    destroyMde() {
      if (this.mde) { this.mde.toTextArea(); this.mde = null }
    },
    /* payload 兼容：{ entry, project, path }（path = 所在目录）；裸 entry 时回退 nav 上下文 */
    async openEditor(payload, force = false) {
      const e = payload && payload.entry ? payload.entry : payload
      if (!e || e.isDir || !isEditableText(e.name)) return
      const dir = (payload && payload.path !== undefined && payload.path !== null) ? payload.path : nav.path
      const rel = dir ? dir + '/' + e.name : e.name
      // 显式编辑（force）清除手动只读标记
      if (force) this._manualReadonly = false
      // 同一文件已在编辑中（有未保存修改）→ 不打扰（防 V3 md:changed 重载覆盖输入）
      if (this.open && this.path === rel && this.dirty) return
      // 同一文件已打开且无未保存 → 静默刷新内容（保存后重载场景；md 走 doc 接口，文本无需刷新）
      if (this.open && this.path === rel && this.mode === 'inline') {
        if (this.isMd) {
          const rr = await api('/privhub/api/doc?project=' + encodeURIComponent(this.project) + '&path=' + encodeURIComponent(rel))
          if (rr.ok) {
            this.doc = rr.doc; this.baseMtime = rr.mtime; this.savedMtime = rr.mtime
            // 自己保存引发的重载不覆盖「✅ 已保存」提示
            if (!/^✅/.test(this.status)) this.status = '已刷新（Ctrl+S 保存）'
          }
        }
        return
      }
      /* 兜底（第二步 c 加）：真要开**另一个文件**、而当前这一轮编辑还有没保存的正文 ——
       * 先把这一轮捕获掉、把保存发出去，再开新的。
       * 可到的路径（切标签 / 切目录 / 关标签 / 舱位消失 / 组件卸载）都已经在
       * `md:interrupt` 与 `v3:editor-host` 里走过同一条路；这一句是给「有人绕开它们」留的防线 ——
       * 少了它，下面几行会把 this.doc / this.path 直接改写，那就是一处静默丢字。
       * ⚠ 必须放在改写 this.path 之前（否则 this.path !== rel 永远为假，防线等于没有）。 */
      if (this.open && this.mode === 'inline' && this.dirty && this.path !== rel) this.leaveInline('superseded')
      this.project = (payload && payload.project) || nav.project || ''
      this.dir = dir || ''
      this.path = rel
      this.name = e.name
      this.isMd = isMdName(e.name)
      this.showVersions = false
      this.previewOpen = this.isMd // txt 等纯文本默认单栏编辑（无 md 预览）
      /* 新一轮编辑开始：会话号 +1。
       * 上一轮（可能是切标签时**已发出、还没回包**的那次静默保存）的写回动作靠它拦住 ——
       * 否则 A 的保存回包会把 A 的正文写进正在编辑 B 的编辑器：下一次保存就把 A 的内容
       * 落进 B 的文件里（静默丢字，比"没保存"更坏）。 */
      this._session = (this._session || 0) + 1
      /* 内嵌 or 浮层：**由宿主作答**（第二步 c）。
       * 迁前这里是「在整个 document 上查宿主的内容区容器在不在」——拿别人的容器当判据，
       * 于是「内容区正显示 A、却要给 B 开编辑器」也会被当成可以内嵌，编辑器就贴到别人的画面上。
       * 现在问的是宿主：舱位在不在、且内容区承载的正是这个文件。 */
      const dock = askEditorDock(this.project, rel)
      this.mode = dock ? 'inline' : (this.isMd ? 'float' : 'skip')
      const r = await api(this.isMd
        ? '/privhub/api/doc?project=' + encodeURIComponent(this.project) + '&path=' + encodeURIComponent(rel)
        : '/privhub/api/preview?project=' + encodeURIComponent(this.project) + '&path=' + encodeURIComponent(rel))
      if (!r.ok) { this.status = r.error || '读取失败'; return }
      /* 尊重接口给出的类型/体积：`/api/preview` 对文本有两类**正常但不可编辑**的作答 ——
       *   · `too-large`：类型支持，但体积超过在线查看上限（后端如实回带 size / limit）；
       *   · 其余非 `text`（image / pdf / unknown）：本就不是可编辑文本。
       * 旧代码不看 `type`，直接把 r.data（此时恒为空串）当成正文 ⇒ 开出一个**空白编辑区**，
       * 用户以为文件是空的、且一保存就会把空内容写回磁盘（静默型毛病：连错了不吭声）。
       * 现在：拿不到可编辑文本就**不开编辑器**，并明确说明原因与出路。 */
      if (!this.isMd) {
        if (r.type === 'too-large') {
          const size = typeof r.size === 'number' ? '（' + fmtBytes(r.size) + '）' : ''
          const cap = typeof r.limit === 'number' ? '上限 ' + fmtBytes(r.limit) : '超出在线查看上限'
          this.status = '文件过大' + size + '，' + cap + '：不在线编辑；请先在文件列表里右键该文件，选「⬇ 下载」后用本地编辑器修改'
          // 自动进入（md:auto-edit）时编辑器本就没打开过 → 用一次性提示补上原因，避免「点了没反应」
          if (!force && !this.open) window.PrivHub.toast(this.status, 'warn')
          return
        }
        if (r.type !== 'text') {
          this.status = '该文件类型不支持在线编辑'
          if (!force && !this.open) window.PrivHub.toast(this.status, 'warn')
          return
        }
      }
      const rawDoc = this.isMd ? (typeof r.doc === 'string' ? r.doc : '') : r.data
      /* 拿到正文之前先确认它确实是字符串：上面已经拦掉「正常但不可编辑」的作答，
       * 这里只兜住异常形状 —— 宁可说清原因，也不开出一个空白编辑区。
       * 注意：正文**为空串是合法的**（空 md 文件照样可编辑），所以不能按长度拦。 */
      if (typeof rawDoc !== 'string') {
        this.status = '该文件当前没有可编辑的文本内容'
        return
      }
      const fm = parseFrontmatter(rawDoc)
      this.meta = fm.meta
      this.doc = rawDoc
      this.baseMtime = this.isMd ? r.mtime : 0
      this.savedMtime = this.baseMtime
      this.dirty = false
      this.status = this.mode === 'inline' ? '' : '已打开 · ' + this.fmtTime(Date.now())
      this.open = true
      if (this.mode === 'inline') {
        /* 只读预览的隐藏交给**宿主的编辑态布局**（styles.js 的 `.v3-content--editor`）：
         * 本插件不再去别家的节点上写内联 display（写进去还得自己负责还原，正是老毛病的来源）。 */
        this.$nextTick(() => {
          const ta = this.$el && this.$el.querySelector ? this.$el.querySelector('textarea.md-src') : null
          if (ta) { ta.focus(); this.syncScroll() }
        })
        // 报「编辑态已开」：宿主据此给内容区加上 `.v3-content--editor`（布局归宿主）
        this.emitEditorState(true, 'open')
      } else if (this.mode === 'float') {
        // G2：DOM 渲染后初始化 EasyMDE（textarea 已挂载）
        // ⚠ 只在浮层形态初始化：mode='skip' 时浮层模板没渲染，getElementById 拿到 null
        this.$nextTick(() => { this.initMde() })
      }
      bus.emit('md:opened', { project: this.project, path: this.path })
    },
    /* ---- inline 模式（VS Code/Trae 式） ---- */
    onSrcInput() {
      this.dirty = true
      this.status = '未保存修改…'
    },
    onSrcKeydown(ev) {
      if ((ev.ctrlKey || ev.metaKey) && ev.key === 's') { ev.preventDefault(); void this.save() }
    },
    togglePreview() { this.previewOpen = !this.previewOpen },
    /* 编辑区滚动同步到预览区 */
    syncScroll() {
      const src = this.$el && this.$el.querySelector ? this.$el.querySelector('textarea.md-src') : null
      const pre = this.$el && this.$el.querySelector ? this.$el.querySelector('.md-inline-preview') : null
      if (!src || !pre) return
      const ratio = src.scrollTop / Math.max(1, src.scrollHeight - src.clientHeight)
      pre.scrollTop = ratio * (pre.scrollHeight - pre.clientHeight)
    },
    /* 退出内嵌编辑（「✕ 只读」按钮触发，是**唯一**带 confirm 的退场入口）：
     * 回到只读预览。宿主的内容区布局由 bus 告知后自行收掉，
     * 本插件不再去别人容器里摘自己的节点（Vue 拆 teleport 时就收干净了）。 */
    async exitInline() {
      if (this.dirty && !confirm('有未保存的修改，退出编辑将丢失。确定？')) return
      this._manualReadonly = true
      this.emitEditorState(false, 'exit')
      noteLife('editor-close', { project: this.project, path: this.path, reason: 'exit' })
      this.open = false
      this.mode = 'float'
      // 通知 V3 刷新内容区为最新内容
      bus.emit('md:changed', { project: this.project, path: this.path })
    },
    /* ---- 编辑舱位契约：报状态 / 退场 ---- */
    /** 报「编辑态开/关」给宿主（宿主据此切 `.v3-content--editor`）。 */
    emitEditorState(open, reason) {
      bus.emit(EVENT_STATE, { open: !!open, project: this.project, path: this.path, reason: reason || '' })
    },
    /**
     * 捕获一份「可保存的快照」：正文 + 它属于哪个文件 + 基线 mtime + 会话号。
     *
     * **必须同步调用**（在拆编辑器之前）：捕获之后的所有网络动作只用这份快照，
     * 不再回头读 `this.doc` / `this.path` —— 它们在等待回包期间可能已经被
     * 「下一轮编辑」改写（切到 B 之后 A 的保存回包若写回 this.doc，
     * 编辑器里就会是 A 的正文而路径是 B：下一次保存把 A 的内容写进 B，静默丢字）。
     */
    captureForSave(reason) {
      const session = this._session || 0
      return {
        session,
        project: this.project,
        path: this.path,
        name: this.name,
        dir: this.dir,
        isMd: this.isMd,
        baseMtime: this.baseMtime,
        // 浮层形态（EasyMDE）的正文在 CodeMirror 里，必须当场取出来
        doc: this.mde ? this.mde.value() : this.doc,
        reason: reason || '',
      }
    },
    /**
     * 离开内嵌编辑态。**顺序是硬要求（丢内容不可接受）**：
     *
     *   ① 捕获（同步）　② 记流水 save-capture（同步）　③ 发出保存（同步：async 函数体在
     *   第一个 await 之前是同步执行的，所以 PUT 在本次中断的同一个 tick 里就上了网络）
     *   ④ 报编辑态已关　⑤ `open=false`（Vue 下一帧拆掉编辑器）　⑥ 记流水 editor-close
     *
     * 为什么**不**等保存回包再拆：数据已经捕获、请求已经发出，等回包只会让编辑器多挂一帧，
     * 而这一帧里内容区已经换成了别的文件 —— 等于把 A 的编辑器贴到 B 的画面上。
     * 回包对组件状态的写回另有**会话闸**（`_session`）拦着，不会污染新一轮编辑。
     * ⚠ 也**不许**把这段挪进 `$nextTick` / `setTimeout`：那就成了先拆后存。
     */
    leaveInline(reason) {
      if (!this.open || this.mode !== 'inline') return false
      const why = reason || 'interrupt'
      if (this.dirty && this.canEditProject(this.project)) {
        const snap = this.captureForSave(why)
        noteLife('save-capture', { project: snap.project, path: snap.path, reason: why, bytes: utf8Bytes(snap.doc) })
        void this.save(false, snap)
      }
      this.emitEditorState(false, why)
      this.open = false      // ← 到这一步才拆编辑器（Vue 下一帧撤掉 teleport 里的节点）
      this.mode = 'float'
      noteLife('editor-close', { project: this.project, path: this.path, reason: why })
      return true
    },
    /** 写权限判定（拿项目名判，供快照保存复用：快照里的项目可能与当前 this.project 不同）。 */
    canEditProject(project) {
      const u = AUTH.user
      return !!(u && (u.role === 'admin' || (u.projects || []).includes(project)))
    },
    /* 手动 Git 备份（privhub-git-backup 插件） */
    async gitBackup() {
      const r = await api('/privhub/api/gitbackup/commit', { method: 'POST', body: JSON.stringify({ message: 'manual: ' + this.name }) })
      if (r.ok) window.PrivHub.toast(r.commit ? '✅ 已备份（' + r.commit.slice(0, 8) + '）' : '无变化（已是最新备份）')
      else window.PrivHub.toast(r.error || '备份失败', 'error')
    },
    fmtTime(at) {
      const d = new Date(at)
      const p = (n) => String(n).padStart(2, '0')
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
    },
    onInput() { this.dirty = true; this.status = '未保存修改…' },
    /**
     * 保存。`save(force)` = 手工保存（按钮 / Ctrl+S）；`save(force, snap)` = 用**快照**保存
     * （静默路径专用，见 `captureForSave` / `leaveInline`）。
     *
     * 两条纪律：
     *   ① **正文与身份一律取自快照**（没有快照就当场捕获一份）：等待回包期间
     *      `this.doc` / `this.path` 可能已被下一轮编辑改写，读它们就会把 A 的内容写进 B。
     *   ② **回包只写给「发起它的那一轮编辑」**（会话号相同）：否则 A 的保存结果会覆盖
     *      正在编辑 B 的正文/基线/脏标记 —— 那正是「静默丢字」的那条路。
     */
    async save(force = false, snap = null) {
      const s = snap || this.captureForSave('manual')
      const mine = () => s.session === (this._session || 0)
      if (!this.canEditProject(s.project)) { if (!snap) this.status = '无写权限'; return false }
      if (mine()) this.saving = true
      try {
        // 非 md 文本：走 text-save 接口（无 frontmatter/版本）
        if (!s.isMd) {
          const tr = await api('/privhub/api/text/save', { method: 'POST', body: JSON.stringify({ project: s.project, path: s.path, text: s.doc }) })
          if (tr.ok) {
            if (mine()) { this.dirty = false; this.status = '✅ 已保存 ' + this.fmtTime(Date.now()) }
            bus.emit('md:changed', { project: s.project, path: s.path })
            bus.emit('file:saved', { project: s.project, path: s.path, name: s.name })
          } else {
            if (mine()) this.status = tr.error || '保存失败'
            else this.reportSilentFailure(s, tr.error || '保存失败')
          }
          return !!tr.ok
        }
        // 保存前补齐 frontmatter created（4.4）
        let doc = s.doc
        const fm = parseFrontmatter(doc)
        if (!fm.hasMeta) {
          const meta = { title: s.name.replace(/\.md$/i, ''), created: new Date().toISOString().slice(0, 10) }
          doc = buildFrontmatter(meta) + doc
        } else if (!fm.meta.created) {
          const meta = { ...fm.meta, created: new Date().toISOString().slice(0, 10) }
          doc = buildFrontmatter(meta) + fm.body
        }
        const r = await api('/privhub/api/doc', { method: 'PUT', body: JSON.stringify({ project: s.project, path: s.path, doc, baseMtime: s.baseMtime }) })
        if (r.conflict && !force) {
          if (confirm('该文档已被他人修改（' + this.fmtTime(r.mtime) + '）。\n覆盖保存将丢失他人的修改，是否继续？')) return this.save(true, s)
          if (mine()) this.status = '已取消（保留他人修改，请重新打开查看）'
          else this.reportSilentFailure(s, '该文档已被他人修改，为避免覆盖他人修改，本次未写入')
          return false
        }
        if (r.ok) {
          if (mine()) {
            this.doc = doc
            this.baseMtime = r.mtime
            this.savedMtime = r.mtime
            this.dirty = false
            this.status = '✅ 已保存 ' + this.fmtTime(r.mtime)
          }
          bus.emit('md:changed', { project: s.project, path: s.path })
          // Git 即时备份钩子（privhub-git-backup 自动捕获保存）
          bus.emit('file:saved', { project: s.project, path: s.path, name: s.name })
        } else {
          if (mine()) this.status = r.error || '保存失败'
          else this.reportSilentFailure(s, r.error || '保存失败')
        }
        return !!r.ok
      } finally { if (mine()) this.saving = false }
    },
    /**
     * 静默保存失败必须说出来。
     * 静默路径（切标签/切目录/关标签）里编辑器随即就关了，`status` 那行字没人看得见 ——
     * 不说就等于「用户以为存了、其实没存」（本项目最怕的静默型毛病）。
     */
    reportSilentFailure(s, why) {
      const to = window.PrivHub && window.PrivHub.toast
      if (typeof to === 'function') to('⚠ 未保存：' + (s.path || '') + ' —— ' + why + '（请重新打开该文件后再保存）', 'error')
    },
    async loadVersions() {
      this.showVersions = true
      const r = await api('/privhub/api/doc/versions?project=' + encodeURIComponent(this.project) + '&path=' + encodeURIComponent(this.path))
      this.versions = r.ok ? r.versions : []
    },
    async restore(v) {
      if (!confirm('回滚到 ' + this.fmtTime(v.at) + ' 的版本？\n当前内容将先自动存档，回滚后仍可恢复。')) return
      this.restoring = true
      try {
        const r = await api('/privhub/api/doc/restore', { method: 'POST', body: JSON.stringify({ project: this.project, path: this.path, version: v.at }) })
        if (r.ok) {
          this.status = '✅ 已回滚到 ' + this.fmtTime(v.at)
          await this.loadVersions()
          const re = await api('/privhub/api/doc?project=' + encodeURIComponent(this.project) + '&path=' + encodeURIComponent(this.path))
          if (re.ok) { this.doc = re.doc; this.baseMtime = re.mtime; this.savedMtime = re.mtime; this.dirty = false; if (this.mde) this.mde.value(this.doc) }
          bus.emit('md:changed', { project: this.project, path: this.path })
        } else this.status = r.error || '回滚失败'
      } finally { this.restoring = false }
    },
    tryClose() {
      if (this.dirty && !confirm('有未保存的修改，确定关闭？')) return
      this.open = false
      this.destroyMde()
    },
    /* F21：导出当前文档（HTML / PDF / Word，读权限即可） */
    async exportDoc(fmt) {
      const token = window.PrivHub.AUTH.token || ''
      try {
        const r = await fetch('/privhub/api/export?project=' + encodeURIComponent(this.project) + '&path=' + encodeURIComponent(this.path) + '&format=' + fmt, { headers: { authorization: 'Bearer ' + token } })
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          window.PrivHub.toast(j.error || '导出失败', 'error')
          return
        }
        const blob = await r.blob()
        const ext = fmt === 'doc' ? 'doc' : fmt
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = this.name.replace(/\.md$/i, '') + '.' + ext
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(a.href), 5000)
        window.PrivHub.toast('已导出 ' + ext.toUpperCase())
      } catch {
        window.PrivHub.toast('导出失败（网络错误）', 'error')
      }
    },
    async onPreviewClick(ev) {
      const a = ev.target.closest('.md-wikilink')
      if (!a) return
      const name = a.getAttribute('data-name')
      const r = await api('/privhub/api/list?project=' + encodeURIComponent(this.project) + '&path=' + encodeURIComponent(this.dir || nav.path || ''))
      const hit = r.ok ? r.entries.find((e) => e.name === name) : null
      if (hit) { nav.selectEntry(hit); this.status = '🔗 已定位：' + name }
      else this.status = '当前目录未找到「' + name + '」（双链仅定位同目录文件）'
    },
  },
  mounted() {
    // payload = { entry, project, path }（骨架 openEntry emit；显式编辑入口）
    this._off = bus.on('entry:open', (payload) => {
      this._manualReadonly = false
      void this.openEditor(payload, true)
    })
    // V3 内容区打开 md → 自动进入内嵌编辑（VS Code/Trae 式）
    this._offAuto = bus.on('md:auto-edit', (payload) => {
      // 用户手动退出编辑（只读预览）且仍是同一文件 → 不自动重进
      const e = payload && payload.entry ? payload.entry : null
      const dir = (payload && payload.path !== undefined && payload.path !== null) ? payload.path : nav.path
      const rel = e && dir !== undefined ? (dir ? dir + '/' + e.name : e.name) : ''
      if (this._manualReadonly && this.path === rel) return
      this._manualReadonly = false
      void this.openEditor(payload)
    })
    /* V3 切换标签/目录/关闭前 → 静默保存未保存修改。
     * 顺序全在 leaveInline 里（捕获 → 发出保存 → 才拆编辑器），
     * ⚠ 不许把这段挪进 $nextTick / setTimeout —— 那就成了「先卸后存」＝丢未保存内容。
     * ⚠ 也不许在静默路径里加 confirm（阻塞交互）：本项目唯一带 confirm 的退场入口是
     *   「✕ 只读」按钮触发的 exitInline()。 */
    this._offInt = bus.on('md:interrupt', () => { this.leaveInline('interrupt') })
    /* 宿主收走编辑舱位（内容区被销毁 / 换视图 / 面板卸载）→ 同样是「编辑器要没了」：
     * 走同一条退场路（先捕获、先发保存）。少了这一条，插件的 teleport 会攥着一个
     * 已销毁的目标，用户再打开同一个文件时会看到「编辑器打不开、正文还在里面」。 */
    this._offDock = bus.on(EVENT_SAY, (p) => {
      if (!p || p.available !== false) return
      // 这条是「回答问题」而不是「收走舱位」：不动正在编辑的东西（换文件由 md:interrupt 负责）
      if (p.reason === 'ask') return
      this.leaveInline(p.reason === 'panel-teardown' ? 'panel-teardown' : 'host-gone')
    })
  },
  beforeUnmount() {
    /* 组件被整体卸载（登出 / 骨架换视图）同样等于「编辑器要没了」：
     * 先捕获数据、先发出保存，再摘监听。这是本文件里最后一道丢内容防线。 */
    this.leaveInline('unmount')
    if (this._off) this._off()
    if (this._offAuto) this._offAuto()
    if (this._offInt) this._offInt()
    if (this._offDock) this._offDock()
  },
  template: `
    <!-- ===== 内嵌编辑模式：挂进**宿主给的编辑舱位**（第二步 c） =====
         to 指向宿主创建/销毁的 .v3-editor-host（按扩展名上场的 viewer 另有 .v3-viewer-host，
         两者不是一回事：编辑态不是某个 viewer 的能力）。能不能内嵌由宿主经 bus 作答。 -->
    <teleport v-if="open && mode === 'inline'" to=".v3-editor-host">
      <div class="md-inline-root" style="flex:1;display:flex;flex-direction:column;min-height:0;background:var(--bg)">
        <!-- 编辑器工具条：状态 + 操作（文件名/路径在外层头部，路径见右侧详情） -->
        <div style="display:flex;align-items:center;gap:8px;padding:5px 14px;border-bottom:1px solid var(--line);background:var(--panel);flex-shrink:0;font-size:12.5px">
          <span :style="{ color: dirty ? 'var(--warn)' : 'var(--accent)', fontSize: '12px' }">{{ dirty ? '● 未保存修改' : (saving ? '保存中…' : '') }}</span>
          <span :style="{ color: /失败|错误|取消/.test(status) ? 'var(--danger)' : 'var(--muted)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '45%' }">{{ status }}</span>
          <span style="flex:1"></span>
          <button class="icon-btn" :disabled="saving" @click="save()">{{ saving ? '…' : '💾 保存' }}</button>
          <button class="icon-btn" @click="togglePreview()" :title="previewOpen ? '隐藏预览' : '显示预览'">{{ previewOpen ? '👁 预览开' : '👁 预览关' }}</button>
          <button v-if="isMd" class="icon-btn" @click="loadVersions()">🕘 版本</button>
          <button class="icon-btn" title="Git 备份（立即提交当前版本）" @click="gitBackup()">⏺ 备份</button>
          <template v-if="isMd">
            <button class="icon-btn" @click="exportDoc('html')">⬇ HTML</button>
            <button class="icon-btn" @click="exportDoc('pdf')">⬇ PDF</button>
            <button class="icon-btn" @click="exportDoc('doc')">⬇ Word</button>
          </template>
          <button class="icon-btn" title="退出编辑（只读预览）" @click="exitInline()">✕ 只读</button>
        </div>
        <!-- 版本抽屉 -->
        <div v-if="showVersions" style="padding:6px 14px;border-bottom:1px solid var(--line);max-height:160px;overflow:auto;background:var(--bg);flex-shrink:0">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="font-weight:600;font-size:12.5px">版本历史（最多 20 版）</span>
            <span style="flex:1"></span>
            <button class="small-btn" @click="showVersions = false">收起</button>
          </div>
          <div v-if="versions.length === 0" style="color:var(--muted);font-size:12px">暂无历史版本（保存后自动生成）</div>
          <div v-for="v in versions" :key="v.at" style="display:flex;align-items:center;gap:10px;padding:2px 0;font-size:12.5px">
            <span style="color:var(--muted)">{{ fmtTime(v.at) }}</span>
            <span style="flex:1"></span>
            <button class="small-btn" :disabled="restoring" @click="restore(v)">↩ 回滚到此版本</button>
          </div>
        </div>
        <!-- 编辑 + 实时预览 分栏 -->
        <div style="flex:1;display:flex;min-height:0">
          <div style="flex:1;display:flex;flex-direction:column;min-width:0">
            <div style="padding:4px 14px;font-size:11.5px;color:var(--muted);background:var(--panel2);flex-shrink:0;display:flex;align-items:center;gap:8px">
              <span>{{ isMd ? 'Markdown 源码' : '文本源码' }}</span><span style="color:var(--warn)" v-if="dirty">●</span>
              <span style="flex:1"></span><span>Ctrl+S 保存</span>
            </div>
            <textarea
              class="md-src"
              v-model="doc"
              @input="onSrcInput"
              @keydown="onSrcKeydown"
              @scroll="syncScroll"
              spellcheck="false"
              style="flex:1;resize:none;border:none;outline:none;padding:12px 16px;background:var(--bg);color:var(--text);font-family:Consolas,'Courier New',monospace;font-size:13.5px;line-height:1.65"
            ></textarea>
          </div>
          <div v-if="previewOpen" style="flex:1;display:flex;flex-direction:column;min-width:0;border-left:1px solid var(--line)">
            <div style="padding:4px 14px;font-size:11.5px;color:var(--muted);background:var(--panel2);flex-shrink:0">实时预览（双链 [[文件名]] 可点击）</div>
            <div class="md-inline-preview md-preview" v-html="previewHtml" @click="onPreviewClick" style="flex:1;overflow:auto;padding:14px 18px;background:var(--panel2);color:var(--text);font-size:14px;line-height:1.7"></div>
          </div>
        </div>
        <!-- 底部状态条 -->
        <div style="display:flex;gap:14px;padding:4px 14px;border-top:1px solid var(--line);font-size:11.5px;color:var(--muted);background:var(--panel);flex-shrink:0">
          <span>{{ status }}</span>
          <span style="flex:1"></span>
          <span>{{ wordCount }} 词</span>
          <span v-if="!canEdit" style="color:var(--danger)">无写权限（只读）</span>
        </div>
      </div>
    </teleport>

    <!-- ===== 全屏浮层模式（无内容区时兜底，保留旧交互） ===== -->
    <div v-if="open && mode === 'float'" class="md-editor-mask" style="position:fixed;inset:0;z-index:200;background:rgba(10,14,20,.55);display:flex;align-items:center;justify-content:center">
      <div style="width:92vw;max-width:1200px;height:88vh;background:var(--panel);border-radius:12px;display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--line)">
        <!-- 头部 -->
        <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--line);background:var(--panel2)">
          <span style="font-size:16px">📝</span>
          <strong>{{ name }}</strong>
          <span style="color:var(--muted);font-size:12px">{{ project }}/{{ path }}</span>
          <span style="flex:1"></span>
          <button class="icon-btn" :disabled="saving" @click="save()">{{ saving ? '保存中…' : '💾 保存' }}</button>
          <button class="icon-btn" @click="loadVersions()">🕘 版本</button>
          <button class="icon-btn" @click="exportDoc('html')">⬇ HTML</button>
          <button class="icon-btn" @click="exportDoc('pdf')">⬇ PDF</button>
          <button class="icon-btn" @click="exportDoc('doc')">⬇ Word</button>
          <button class="icon-btn" @click="tryClose()">✖ 关闭</button>
        </div>
        <!-- 版本抽屉 -->
        <div v-if="showVersions" style="padding:8px 16px;border-bottom:1px solid var(--line);max-height:180px;overflow:auto;background:var(--bg)">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-weight:600">版本历史（最多 20 版）</span>
            <span style="flex:1"></span>
            <button class="small-btn" @click="showVersions = false">收起</button>
          </div>
          <div v-if="versions.length === 0" style="color:var(--muted);font-size:13px">暂无历史版本（保存后自动生成）</div>
          <div v-for="v in versions" :key="v.at" style="display:flex;align-items:center;gap:10px;padding:3px 0;font-size:13px">
            <span style="color:var(--muted)">{{ fmtTime(v.at) }}</span>
            <span style="flex:1"></span>
            <button class="small-btn" :disabled="restoring" @click="restore(v)">↩ 回滚到此版本</button>
          </div>
        </div>
        <!-- 编辑 + 预览 -->
        <div style="flex:1;display:flex;min-height:0">
          <div style="flex:1;display:flex;flex-direction:column;border-right:1px solid var(--line)">
            <div style="padding:6px 14px;font-size:12px;color:var(--muted);background:var(--bg)">编辑区（Markdown · 工具栏排版 · frontmatter 自动补齐 created）</div>
            <textarea id="privhub-md-editor" spellcheck="false" style="display:none"></textarea>
          </div>
          <div style="flex:1;display:flex;flex-direction:column">
            <div style="padding:6px 14px;font-size:12px;color:var(--muted);background:var(--bg)">预览（双链 [[文件名]] 可点击定位）</div>
            <div class="md-preview" v-html="previewHtml" @click="onPreviewClick" style="flex:1;overflow:auto;padding:14px 18px;background:var(--panel2);color:var(--text);font-size:14px;line-height:1.7"></div>
          </div>
        </div>
        <!-- 底部状态 -->
        <div style="display:flex;gap:14px;padding:6px 16px;border-top:1px solid var(--line);font-size:12px;color:var(--muted);background:var(--panel2)">
          <span>{{ status }}</span>
          <span style="flex:1"></span>
          <span>{{ wordCount }} 词</span>
          <span v-if="!canEdit" style="color:var(--danger)">当前账号无该项目写权限</span>
        </div>
      </div>
    </div>
  `,
}

export default {
  id: 'privhub-files-edit-md',
  slots: {
    'md-editor': MdEditor,
  },
}
