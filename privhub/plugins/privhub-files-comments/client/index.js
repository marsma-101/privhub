/**
 * privhub-files-comments · client — md 选区批注 + 评论线程
 *
 * 能力：
 *   - 在内容区 md 预览中选中文字 → 浮出「💬 评论」→ 提交（锚点 = 相对正文的字符偏移）
 *   - 锚点高亮渲染（mark.v3-cmt），点击高亮 → 打开评论面板并定位
 *   - 评论面板（office-editor slot）：列表/回复/状态流转/删除
 *
 * ── 锚点根从哪来（第二步 d：最后一次跨插件 DOM 认领的迁移） ────────────────
 * 迁前本插件做两件越权的事（`08-连线契约.md` §5.3 记的就是这两条）：
 *   ① 自己去整个 document 里按“宿主容器 + 渲染根”两个类名串起来查渲染根；
 *   ② 在那个节点上挂 `MutationObserver`（childList + subtree + characterData）——
 *      靠"盯着别人的 DOM 变了"来重建锚点。
 * 两条都已删除。现在改成**宿主在渲染完成后把渲染根的节点引用直接交给本插件**：
 *
 *   bus.on('v3:md-root', ({ el, project, key, reason }) => …)
 *     el = 宿主内容区里那个 md 渲染根（没有渲染根时是 null）
 *     key = 这一刻内容区承载的文件 key（宿主自己的口径）
 *
 * 于是本插件的全部 DOM 动作只发生在**宿主交过来的那个节点内部**：
 *   · 挂锚点（`mark.v3-cmt`）—— 只往 el 里面插，不碰 el 之外的任何东西；
 *   · 清锚点 —— 换文件 / 没有渲染根时（el 为 null）由调用方把旧节点连同锚点一起丢掉，
 *     本插件同时**放弃旧引用**（只认最新一次交接的节点，不攥着已销毁的目标）。
 *
 * ⚠ 因此本文件里不得再出现对 `.v3-content` / `.v3-md` 的 `querySelector`，也不得再出现
 *   `MutationObserver`（`tests/personal-ui.mjs` 的 M 段有源码级断言，含剥注释）。
 *
 * ⚠ 也不得复用两个「舱位」的类名：`.v3-viewer-host`（viewer 的地界）与
 *   `.v3-editor-host`（编辑态的地界）都不是本插件的落点 —— 需要新形态要请宿主再开舱位。
 *
 * @module privhub-files-comments/client
 */

const { api, bus } = window.PrivHub

/* ============ 样式 ============ */
const styleEl = document.createElement('style')
styleEl.textContent = `
mark.v3-cmt { background: rgba(230,180,60,.35); border-bottom: 2px solid #e6b43c; border-radius: 3px; padding: 0 1px; cursor: pointer; }
mark.v3-cmt:hover { background: rgba(230,180,60,.55); }
mark.v3-cmt.resolved { opacity: .4; }
.v3-cmt-btn { position: fixed; z-index: 1200; background: var(--accent); color: #fff; border: none; border-radius: 16px; padding: 6px 14px; font-size: 12.5px; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,.25); }
.v3-cmt-btn:hover { filter: brightness(1.1); }
`
document.head.appendChild(styleEl)

/* ============ 锚点工具 ============ */
function textNodes(root) {
  const out = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let n
  while ((n = walker.nextNode())) out.push(n)
  return out
}
/* 把 root 的文本按全局偏移切分为 [ {node,start,end} ] 区间（基于 textContent 累计） */
function buildSegments(root) {
  const segs = []
  let acc = 0
  for (const node of textNodes(root)) {
    const len = node.textContent ? node.textContent.length : 0
    segs.push({ node, start: acc, end: acc + len })
    acc += len
  }
  return { segs, total: acc }
}
/* 渲染锚点：**先清后画** —— 清除旧 mark → 按评论偏移插入。
 * 空评论数组是合法输入：那就是"清空锚点"（调用方 `_render()` 靠它把上一个文件留下的锚点清掉）。 */
function renderMarks(root, comments) {
  root.querySelectorAll('mark.v3-cmt').forEach((m) => {
    const t = document.createTextNode(m.textContent)
    m.replaceWith(t)
  })
  root.normalize()
  if (!comments || !comments.length) return
  const { segs } = buildSegments(root)
  const textLen = segs.length ? segs[segs.length - 1].end : 0
  for (const c of comments) {
    if (c.start < 0 || c.end > textLen || c.end <= c.start) continue
    try {
      const range = document.createRange()
      const s = segs.find((x) => c.start >= x.start && c.start <= x.end)
      const e = segs.find((x) => c.end >= x.start && c.end <= x.end)
      if (!s || !e) continue
      range.setStart(s.node, Math.min(c.start - s.start, s.node.textContent.length))
      range.setEnd(e.node, Math.min(c.end - e.start, e.node.textContent.length))
      const mark = document.createElement('mark')
      mark.className = 'v3-cmt' + (c.status === '已解决' ? ' resolved' : '')
      mark.dataset.id = c.id
      mark.title = c.author + '：' + c.text + (c.status === '已解决' ? '（已解决）' : '')
      const frag = range.extractContents()
      mark.appendChild(frag)
      range.insertNode(mark)
    } catch { /* 跨块锚点跳过（保留列表评论） */ }
  }
}
/* 选区 → 偏移（相对 root textContent） */
function selectionOffsets(root, sel) {
  const { segs } = buildSegments(root)
  const offOf = (node, offset) => {
    const seg = segs.find((x) => x.node === node)
    if (!seg) {
      // 容器节点：取其前序文本末尾
      let acc = 0
      for (const s of segs) {
        if (root.contains(s.node) && s.node.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_PRECEDING) acc = s.end
        else break
      }
      return acc
    }
    return seg.start + Math.min(offset, seg.node.textContent.length)
  }
  return { start: offOf(sel.anchorNode, sel.anchorOffset), end: offOf(sel.focusNode, sel.focusOffset) }
}

/* ============ 组件 ============ */
const CommentsCtrl = {
  name: 'comments-ctrl',
  data() {
    return {
      project: '',
      path: '',
      name: '',
      comments: [],
      panelOpen: false,
      inputOpen: false,
      inputText: '',
      replyFor: '', // 正在回复的评论 id
      replyText: '',
      busy: false,
      btnPos: null,
      activeId: '',
      /* md 渲染根：**只由宿主经 bus `v3:md-root` 交进来**（null = 此刻没有渲染根）。
       * 迁前这里是「computed 里现查宿主内容区里那个渲染根节点」—— 自己去别人的容器里找节点。
       * 现在节点所有权清楚：宿主给的，宿主收回。 */
      mdRoot: null,
    }
  },
  computed: {
    openCount() { return this.comments.filter((c) => c.status !== '已解决').length },
    /* 锚点根的读写入口就是宿主交来的那个引用（保留 mdEl 这个名字，下面各处用法一字未改）。 */
    mdEl() { return this.mdRoot },
  },
  watch: {
    /* 锚点根换了（宿主交来新节点，或收回成 null）→ 重建锚点高亮。
     * 迁前这里是「watch 一个现查 DOM 的 computed + 在新节点上挂 MutationObserver」。
     * 现在：换根这个动作本身由宿主在渲染后通知，**不再有人盯别人的 DOM**。
     * `el` 为 null（内容区没有 md 渲染根 / 换文件 / 内容区消失）时不渲染 —— 旧节点连同
     * 旧锚点一起作废，锚点不可能残留。 */
    mdRoot(el) { if (el) this._render() },
  },
  methods: {
    /* ---- 数据 ---- */
    async load() {
      if (!this.project || !this.path) return
      try {
        const r = await api('/privhub/api/comments?project=' + encodeURIComponent(this.project) + '&path=' + encodeURIComponent(this.path))
        if (r.ok) { this.comments = r.comments || []; this._render() }
      } catch { /* 忽略 */ }
    },
    /**
     * 在当前锚点根里重建锚点高亮。**先清后画**，且**必须连空评论也清**：
     *   · 根被换成一个新节点时，那个节点里可能有别人（或上一次渲染）留下的同款锚点 ——
     *     `renderMarks` 开头会把 `mark.v3-cmt` 全部还原成纯文本；
     *   · 更要紧的是"切换到的文件没有评论"这条路径：迁前这里是 `if (el && this.comments.length)`，
     *     评论为空时**什么都不做** ⇒ 新节点里若已有锚点就留下去了。
     *     这不是假设：宿主交接根、插件取数（异步）之间，面板里可能还挂着上一个文件的数据，
     *     那一次渲染就会把上一个文件的锚点画进新根里，而随后"评论为空"又不会去清 ——
     *     **旧锚点残留**就是这么来的。所以这里改成"有根就清、有评论就画"。
     */
    _render() {
      const el = this.mdEl
      if (!el) return
      renderMarks(el, this.comments)
    },
    /**
     * 宿主交来渲染根（`v3:md-root`）。**本插件唯一的 DOM 入口**。
     *
     * 两件事，顺序不能倒：
     *   ① 先认根（`mdRoot = el`）—— `null` 表示"此刻没有 md 渲染根"（换文件 / 只读文本 /
     *      图片 PDF / 内容区消失），旧节点作废，旧锚点随之不可能残留；
     *   ② 根在就重载评论（面板开着也用新文件的数据），加载完成后由 `mdRoot` 的 watcher 重建锚点。
     *
     * 为什么根在才 load：没有渲染根时加载评论毫无用处（没处挂锚点），只会白打一次接口。
     */
    onMdRoot(p) {
      const el = (p && p.el) || null
      this.mdRoot = el
      if (!el) return
      if (this.project && this.path) void this.load()
    },
    /* ---- 选区浮动按钮 ---- */
    onSelectionChange() {
      const sel = document.getSelection()
      const el = this.mdEl
      if (!sel || sel.isCollapsed || !el || !el.contains(sel.anchorNode) || !el.contains(sel.focusNode)) {
        this.btnPos = null
        return
      }
      const range = sel.getRangeAt(0)
      if (range.collapsed) { this.btnPos = null; return }
      const rect = range.getBoundingClientRect()
      if (!rect || rect.width === 0) { this.btnPos = null; return }
      // 整体缩放（html zoom）下 fixed 弹层会随缩放：视觉坐标需转回 css 布局坐标
      const z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1
      this.btnPos = { left: (rect.left + rect.width / 2 - 45) / z, top: Math.max(8, rect.top - 42) / z }
    },
    openCommentInput() {
      const el = this.mdEl
      const sel = document.getSelection()
      if (!el || !sel) return
      const { start, end } = selectionOffsets(el, sel)
      this._pendingRange = { start, end }
      this.inputOpen = true
      this.inputText = ''
      this.btnPos = null
    },
    async submitComment() {
      const text = this.inputText.trim()
      const rng = this._pendingRange
      if (!text || !rng) return
      this.busy = true
      try {
        const r = await api('/privhub/api/comments', { method: 'POST', body: JSON.stringify({ project: this.project, path: this.path, start: rng.start, end: rng.end, text }) })
        if (r.ok) { this.inputOpen = false; this.inputText = ''; await this.load(); window.PrivHub.toast('已添加评论 💬') }
        else window.PrivHub.toast(r.error || '评论失败', 'error')
      } catch { window.PrivHub.toast('评论失败（网络错误）', 'error') }
      this.busy = false
    },
    /* ---- 面板 ---- */
    openPanel(payload) {
      if (!payload) return
      this.project = payload.project
      this.path = payload.path
      this.name = payload.name || payload.path.split('/').pop()
      this.panelOpen = true
      this.replyFor = ''
      this.replyText = ''
      void this.load()
    },
    closePanel() { this.panelOpen = false },
    focusComment(id) {
      this.activeId = id
      const mark = this.mdEl && this.mdEl.querySelector('mark.v3-cmt[data-id="' + id + '"]')
      if (mark) mark.scrollIntoView({ behavior: 'smooth', block: 'center' })
    },
    onMarkClick(ev) {
      const mark = ev.target.closest('mark.v3-cmt')
      if (!mark) return
      this.panelOpen = true
      if (!this.project) return
      this.activeId = mark.dataset.id
      const c = this.comments.find((x) => x.id === mark.dataset.id)
      if (c) {
        this.project = c.project || this.project
        this.path = c.path || this.path
      }
      void this.load()
      this.focusComment(mark.dataset.id)
    },
    async reply(id) {
      const text = this.replyText.trim()
      if (!text) return
      const r = await api('/privhub/api/comments/reply', { method: 'POST', body: JSON.stringify({ project: this.project, path: this.path, id, text }) })
      if (r.ok) { this.replyText = ''; this.replyFor = ''; await this.load() }
      else window.PrivHub.toast(r.error || '回复失败', 'error')
    },
    async setStatus(id, status) {
      const r = await api('/privhub/api/comments/status', { method: 'POST', body: JSON.stringify({ project: this.project, path: this.path, id, status }) })
      if (r.ok) await this.load()
      else window.PrivHub.toast(r.error || '状态更新失败', 'error')
    },
    async remove(id) {
      if (!confirm('删除这条评论及其全部回复？')) return
      const r = await api('/privhub/api/comments?project=' + encodeURIComponent(this.project) + '&path=' + encodeURIComponent(this.path) + '&id=' + encodeURIComponent(id), { method: 'DELETE' })
      if (r.ok) { await this.load(); window.PrivHub.toast('评论已删除') }
      else window.PrivHub.toast(r.error || '删除失败', 'error')
    },
  },
  mounted() {
    this._offPanel = bus.on('file:comments', (payload) => { this.openPanel(payload) })
    /* 渲染根交接（第二步 d）：宿主在渲染完成后把 md 预览根的节点引用交出来（`el`），
     * 没有渲染根时交 null。本插件不再自己查 `.v3-content .v3-md`、也不再挂 MutationObserver。
     * 拿到根（或根换了一个）就重载评论并重建锚点；换文件时宿主交 null ⇒ 锚点随旧节点作废。 */
    this._offRoot = bus.on('v3:md-root', (p) => { this.onMdRoot(p) })
    this._onSel = () => this.onSelectionChange()
    document.addEventListener('selectionchange', this._onSel)
    this._onClick = (ev) => { if (ev.target.closest && ev.target.closest('mark.v3-cmt')) this.onMarkClick(ev) }
    document.addEventListener('click', this._onClick)
  },
  beforeUnmount() {
    if (this._offPanel) this._offPanel()
    if (this._offRoot) this._offRoot()
    document.removeEventListener('selectionchange', this._onSel)
    document.removeEventListener('click', this._onClick)
    this.mdRoot = null
  },
  template: `
    <div style="display:contents">
      <!-- 选区浮动评论按钮 -->
      <button v-if="btnPos && project" class="v3-cmt-btn" :style="{ left: btnPos.left + 'px', top: btnPos.top + 'px' }" @click="openCommentInput">💬 评论</button>

      <!-- 新评论输入 -->
      <div v-if="inputOpen" class="modal-mask" @click.self="inputOpen = false">
        <div class="modal" style="width:400px">
          <h2>💬 添加评论</h2>
          <div class="modal-body">
            <textarea v-model="inputText" rows="4" placeholder="输入评论内容…" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text);font-size:13px;resize:vertical"></textarea>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" @click="inputOpen = false">取 消</button>
            <button class="btn btn-primary" style="width:auto" :disabled="busy || !inputText.trim()" @click="submitComment">提交</button>
          </div>
        </div>
      </div>

      <!-- 评论面板 -->
      <div v-if="panelOpen" class="modal-mask" style="justify-content:flex-end" @click.self="closePanel">
        <div style="width:360px;height:100%;background:var(--panel);border-left:1px solid var(--line);display:flex;flex-direction:column">
          <div style="padding:12px 14px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600">
            💬 评论 · {{ name }} <span style="color:var(--muted);font-weight:400">{{ comments.length }} 条{{ openCount ? '（待处理 ' + openCount + '）' : '' }}</span>
            <span style="margin-left:auto;cursor:pointer;color:var(--muted)" @click="closePanel">✕</span>
          </div>
          <div style="flex:1;overflow:auto;padding:10px 12px">
            <div v-if="comments.length === 0" style="color:var(--muted);font-size:12.5px;text-align:center;padding:30px 0">在正文中选中文字即可添加评论</div>
            <div v-for="c in comments" :key="c.id" style="border:1px solid var(--line);border-radius:8px;margin-bottom:10px;overflow:hidden" :style="{ borderColor: activeId === c.id ? 'var(--accent)' : '' }">
              <div style="padding:8px 10px;background:var(--panel2);display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer" @click="focusComment(c.id)">
                <span style="font-weight:600">{{ c.author }}</span>
                <span style="color:var(--muted)">{{ new Date(c.at).toLocaleString() }}</span>
                <select :value="c.status" style="margin-left:auto;font-size:11.5px;background:var(--bg);color:var(--text);border:1px solid var(--line);border-radius:5px;padding:1px 4px" @change="setStatus(c.id, $event.target.value)">
                  <option>待处理</option><option>处理中</option><option>已解决</option>
                </select>
                <span style="color:var(--danger);cursor:pointer" title="删除" @click="remove(c.id)">✕</span>
              </div>
              <div style="padding:8px 10px;font-size:12.5px;line-height:1.6">{{ c.text }}</div>
              <div v-for="(rp, i) in c.replies" :key="i" style="padding:6px 10px;border-top:1px dashed var(--line);font-size:12px;color:var(--muted)">
                <b style="color:var(--text)">{{ rp.author }}</b>：{{ rp.text }}
              </div>
              <div style="padding:8px 10px;border-top:1px solid var(--line)">
                <template v-if="replyFor === c.id">
                  <input v-model="replyText" placeholder="回复…" style="width:100%;padding:5px 8px;border-radius:5px;border:1px solid var(--line);background:var(--bg);color:var(--text);font-size:12px" @keyup.enter="reply(c.id)" />
                  <span style="font-size:11.5px;color:var(--muted);cursor:pointer;margin-top:4px;display:inline-block" @click="replyFor = ''; replyText = ''">取消</span>
                </template>
                <span v-else style="font-size:11.5px;color:var(--accent);cursor:pointer" @click="replyFor = c.id">↩ 回复</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
}

export default {
  id: 'privhub-files-comments',
  slots: {
    'office-editor': CommentsCtrl,
  },
}
