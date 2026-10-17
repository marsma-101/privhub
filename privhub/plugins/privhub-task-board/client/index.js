/**
 * privhub-task-board · client — 任务看板主视图（挂 taskboard-view slot）
 *
 * 每个项目一个看板：列（可增/删/改名/重排/WIP 上限）+ 卡片（建/改/删/拖拽）。
 * 数据全走 window.PrivHub.api（禁裸 fetch）；监听 entry:open 支持「用当前文件建卡」。
 * 卸载时解绑事件与定时器，零残留（红线 §7）。
 *
 * @module privhub-task-board/client
 */

import './styles.js'

const { api, nav, bus, toast, AUTH } = window.PrivHub

const PRIORITY = {
  low: { label: '低', color: '#7a8699' },
  normal: { label: '中', color: '#4a7bd6' },
  high: { label: '高', color: '#c07a2b' },
  urgent: { label: '紧急', color: '#d05a5a' },
}

function fmtDay(ms) {
  if (!ms) return ''
  const d = new Date(ms)
  const p = (n) => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

function dayToMs(s) {
  if (!s) return null
  const t = Date.parse(s + 'T00:00:00')
  return Number.isFinite(t) ? t : null
}

/** 到期状态：逾期 / 今日 / 临近（3 天内）/ 正常。 */
function dueState(ms) {
  if (!ms) return ''
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const days = Math.round((ms - today.getTime()) / 86400000)
  if (days < 0) return 'overdue'
  if (days === 0) return 'today'
  if (days <= 3) return 'soon'
  return ''
}

const TaskBoardView = {
  name: 'taskboard-view',
  data() {
    return {
      projects: [],
      project: '',
      board: null,
      loading: false,
      error: '',
      editing: null,      // 正在编辑的卡片副本（_isNew = 新建）
      saving: false,
      newColTitle: '',
      showNewCol: false,
      lastFile: null,     // { project, path, name } 视频视图最近打开的文件
      dragId: '',
      dragOverCol: '',
      agents: [],         // 智能体名册（填「负责人」时给候选，见 agentOptions）
    }
  },
  computed: {
    me() { return (AUTH && AUTH.user) || null },
    columns() {
      return this.board ? [...this.board.columns].sort((a, b) => a.order - b.order) : []
    },
    priorities() { return PRIORITY },
    canCreateFromFile() { return !!(this.lastFile && this.lastFile.project === this.project) },
    /**
     * 「负责人」的智能体候选：只列**服务本项目**的条目（服务范围自述在名册里），
     * 退役的一律不列。人类用户名仍可自由输入 —— 这是 datalist（建议），不是下拉（限定）。
     */
    agentOptions() {
      const p = this.project
      return (this.agents || []).filter((a) =>
        a.status !== 'retired' && (!p || a.scope === 'all' || (a.projects || []).includes(p)))
    },
    /** 内置「待审核」列 id（服务端保证存在）。找不到时不渲染审核按钮，不硬编码假列。 */
    reviewColId() {
      const c = this.columns.find((x) => x.id === 'col_review')
      return c ? c.id : ''
    },
  },
  methods: {
    pri(p) { return PRIORITY[p] || PRIORITY.normal },
    fmtDay,
    dayToMs,
    dueState,
    dueText(ms) {
      const st = dueState(ms)
      const tag = st === 'overdue' ? '（逾期）' : st === 'today' ? '（今日）' : st === 'soon' ? '（临近）' : ''
      return fmtDay(ms) + tag
    },
    dueColor(ms) {
      const st = dueState(ms)
      return st === 'overdue' ? 'var(--danger)' : st === 'today' ? 'var(--warn)' : 'var(--muted)'
    },
    cardsOf(colId) {
      if (!this.board) return []
      return this.board.cards.filter((c) => c.columnId === colId).sort((a, b) => a.order - b.order)
    },
    async loadProjects() {
      const r = await api('/privhub/api/projects')
      if (r.ok) this.projects = r.projects || []
    },
    /** 拉智能体名册（填「负责人」时给候选）。读失败静默 —— 只是没有建议，不影响建卡。 */
    async loadRoster() {
      const r = await api('/privhub/api/roster').catch(() => null)
      if (r && r.ok && Array.isArray(r.entries)) this.agents = r.entries
    },
    async load() {
      if (!this.project) { this.board = null; return }
      this.loading = true
      this.error = ''
      try {
        const r = await api('/privhub/api/taskboard?project=' + encodeURIComponent(this.project))
        if (r.ok && r.board) this.board = r.board
        else { this.board = null; this.error = r.error || '看板加载失败' }
      } catch (e) {
        this.board = null
        this.error = (e && e.message) || '看板加载失败'
      } finally { this.loading = false }
    },
    /* 切项目：同时同步骨架的 nav.project —— 否则顶栏项目名与「文件」图标会留着上一个项目 */
    switchProject(p) { this.project = p; nav.project = p; this.load() },
    /* ---------- 卡片 ---------- */
    addCardTo(colId) {
      this.editing = {
        _isNew: true, title: '', desc: '', assignee: '', priority: 'normal',
        dueDate: null, columnId: colId, labels: [], relatedFiles: [],
      }
    },
    /* 用当前文件建卡：预填标题与 relatedFiles */
    addCardFromFile() {
      if (!this.canCreateFromFile) return
      const f = this.lastFile
      const col = this.columns[0]
      if (!col) return toast('看板没有可用列，请先新建一列', 'error')
      this.editing = {
        _isNew: true,
        title: f.name,
        desc: '',
        assignee: '',
        priority: 'normal',
        dueDate: null,
        columnId: col.id,
        labels: [],
        relatedFiles: [{ project: f.project, path: f.path }],
      }
    },
    startEdit(card) {
      this.editing = {
        _isNew: false, id: card.id, title: card.title, desc: card.desc,
        assignee: card.assignee, priority: card.priority, dueDate: card.dueDate,
        columnId: card.columnId, labels: [...card.labels],
        relatedFiles: card.relatedFiles.map((f) => ({ ...f })),
        _labelsText: card.labels.join(', '),
        createdBy: card.createdBy || '',   // 只读展示（创建人不可改）
      }
    },
    async saveCard() {
      const e = this.editing
      if (!e) return
      const labels = String(e._labelsText || '').split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean)
      this.saving = true
      try {
        if (e._isNew) {
          const r = await api('/privhub/api/taskboard/cards', {
            method: 'POST',
            body: JSON.stringify({
              project: this.project, title: e.title, desc: e.desc, assignee: e.assignee,
              priority: e.priority, dueDate: e.dueDate, columnId: e.columnId,
              labels, relatedFiles: e.relatedFiles,
            }),
          })
          if (!r.ok) { toast(r.error || '建卡失败', 'error'); return }
          await this.load()
          toast('已创建')
        } else {
          const r = await api('/privhub/api/taskboard/cards', {
            method: 'PATCH',
            body: JSON.stringify({
              project: this.project, id: e.id, title: e.title, desc: e.desc, assignee: e.assignee,
              priority: e.priority, dueDate: e.dueDate, labels, relatedFiles: e.relatedFiles,
            }),
          })
          if (!r.ok) { toast(r.error || '保存失败', 'error'); return }
          await this.load()
          toast('已保存')
        }
        this.editing = null
      } finally { this.saving = false }
    },
    async deleteCard(card) {
      if (!confirm('删除卡片「' + card.title + '」？此操作不可撤销。')) return
      const r = await api('/privhub/api/taskboard/cards?project=' + encodeURIComponent(this.project) + '&id=' + encodeURIComponent(card.id), { method: 'DELETE' })
      if (!r.ok) return toast(r.error || '删除失败', 'error')
      await this.load()
      toast('已删除')
    },
    removeRelated(i) { this.editing.relatedFiles.splice(i, 1) },
    /* ---------- 审核流 ---------- */
    async review(card, action) {
      const r = await api('/privhub/api/taskboard/cards/review', {
        method: 'POST',
        body: JSON.stringify({ project: this.project, id: card.id, action }),
      }).catch(() => ({ ok: false, error: '网络错误' }))
      if (!r.ok) return toast(r.error || '操作失败', 'error')
      await this.load()
      toast(action === 'approve' ? '已通过 ✅' : action === 'reject' ? '已退回待办 ↩' : '已提交审核')
    },
    reviewHint(action) {
      return action === 'approve' ? '通过：移到「已完成」' : action === 'reject' ? '退回重做：移回「待办」并打标签' : '提交审核：移到「待审核」'
    },
    /* ---------- 拖拽 ---------- */
    onDragStart(card, ev) {
      this.dragId = card.id
      if (ev && ev.dataTransfer) { ev.dataTransfer.effectAllowed = 'move'; try { ev.dataTransfer.setData('text/plain', card.id) } catch { /* 老浏览器 */ } }
    },
    onDragEnd() { this.dragId = ''; this.dragOverCol = '' },
    async onDrop(toColumnId, beforeCard) {
      const id = this.dragId
      this.dragId = ''
      this.dragOverCol = ''
      if (!id || !this.board) return
      const card = this.board.cards.find((c) => c.id === id)
      if (!card) return
      const snapshot = JSON.parse(JSON.stringify(this.board.cards))
      const target = this.cardsOf(toColumnId).filter((c) => c.id !== id)
      let idx = target.length
      if (beforeCard) {
        const i = target.findIndex((c) => c.id === beforeCard.id)
        if (i >= 0) idx = i
      }
      if (card.columnId === toColumnId && beforeCard && target[idx] === undefined) return
      // 乐观更新
      card.columnId = toColumnId
      target.splice(idx, 0, card)
      target.forEach((c, i) => { c.order = i })
      const r = await api('/privhub/api/taskboard/cards/move', {
        method: 'POST',
        body: JSON.stringify({ project: this.project, id, toColumnId, order: idx }),
      }).catch(() => ({ ok: false, error: '网络错误' }))
      if (!r.ok) {
        this.board.cards = snapshot
        toast(r.error || '移动失败，已还原', 'error')
        return
      }
      await this.load()
      toast('已移动')
    },
    /* ---------- 列 ---------- */
    renameColumn(col) {
      nav.askInput('重命名列：', col.title, async (title) => {
        if (!title || title === col.title) return
        const r = await api('/privhub/api/taskboard/columns', {
          method: 'PATCH',
          body: JSON.stringify({ project: this.project, id: col.id, title }),
        })
        if (!r.ok) return toast(r.error || '重命名失败', 'error')
        await this.load()
      })
    },
    setWip(col) {
      const cur = col.wipLimit === null ? '' : String(col.wipLimit)
      nav.askInput('WIP 上限（留空=不限，1–999）：', cur, async (v) => {
        const wipLimit = String(v || '').trim() === '' ? null : Number(v)
        if (wipLimit !== null && (!Number.isInteger(wipLimit) || wipLimit < 1 || wipLimit > 999)) return toast('WIP 上限需为 1–999 的整数', 'error')
        const r = await api('/privhub/api/taskboard/columns', {
          method: 'PATCH',
          body: JSON.stringify({ project: this.project, id: col.id, wipLimit }),
        })
        if (!r.ok) return toast(r.error || '设置失败', 'error')
        await this.load()
      })
    },
    async deleteColumn(col) {
      const n = this.cardsOf(col.id).length
      if (!confirm('删除列「' + col.title + '」？' + (n ? '其中 ' + n + ' 张卡片将迁移到第一列。' : ''))) return
      const r = await api('/privhub/api/taskboard/columns?project=' + encodeURIComponent(this.project) + '&id=' + encodeURIComponent(col.id), { method: 'DELETE' })
      if (!r.ok) return toast(r.error || '删列失败', 'error')
      await this.load()
      toast('已删除列')
    },
    async addColumn() {
      const title = String(this.newColTitle || '').trim()
      if (!title) return
      const r = await api('/privhub/api/taskboard/columns', {
        method: 'POST',
        body: JSON.stringify({ project: this.project, title }),
      })
      if (!r.ok) return toast(r.error || '新建列失败', 'error')
      this.newColTitle = ''
      this.showNewCol = false
      await this.load()
      // 新列排在最后一列之后（最右）。顺势把视口推到最右，否则「加了列却看不见」。
      this.$nextTick(() => this.scrollBoardToEnd())
    },
    /** 把看板视口横向推到最右（新建列后自动调用）。 */
    scrollBoardToEnd() {
      const el = this.$refs.board
      if (el) el.scrollLeft = el.scrollWidth
    },
    /* ---------- 关联文件 ---------- */
    async openFile(f) {
      const name = f.path.split('/').pop()
      const dir = f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : ''
      await nav.openDir(f.project, dir)
      const e = nav.entries.find((x) => x.name === name)
      if (e) { await nav.openEntry(e); toast('已打开：' + name) }
      else toast('文件不存在或已被移动：' + name, 'error')
    },
  },
  async mounted() {
    this._onFile = (p) => {
      if (p && p.entry && !p.entry.isDir) {
        this.lastFile = { project: p.project, path: (p.path ? p.path + '/' : '') + p.entry.name, name: p.entry.name }
      }
    }
    bus.on('entry:open', this._onFile)
    await this.loadProjects()
    await this.loadRoster()
    this.project = nav.project || (this.projects[0] || '')
    if (this.project) await this.load()
  },
  beforeUnmount() {
    if (this._onFile) bus.off('entry:open', this._onFile)
  },
  template: `
    <div class="tb-wrap">
        <h2 class="tb-h2">📋 任务看板<ph-help title="任务看板" doc="03-协作与看板.md"
          desc="每个项目一块看板：列（可增 / 删 / 改名 / 排序 / 设 WIP 上限）+ 卡片（建 / 改 / 删 / 拖拽）。数据存服务端，项目成员共享。"
          :steps="['① 左上选项目 —— 看板自动加载该项目', '② 「＋ 添加卡片」建卡，或拖拽卡片在列间移动', '③ 点卡片编辑标题 / 负责人 / 优先级 / 截止日期 / 标签 / 关联文件', '④ 卡片可在「待审核」列通过或退回重做（见右侧「审核流」说明）']"
          tips="拖拽是即时保存的：松手即写服务端，失败会自动还原并提示。" /></h2>
          <div class="tb-bar">
            <select :value="project" @change="switchProject($event.target.value)"
              style="padding:7px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text)">
              <option value="" disabled>选择项目…</option>
              <option v-for="p in projects" :key="p" :value="p">{{ p }}</option>
            </select>
            <button class="small-btn" :disabled="!canCreateFromFile" @click="addCardFromFile"
              :title="canCreateFromFile ? '用文件视图最近打开的文件建卡' : '先在文件视图打开一个文件'">＋ 用当前文件建卡</button><ph-help
              title="用当前文件建卡" doc="03-协作与看板.md"
              desc="把【文件】视图里最近打开的那个文件直接变成一张卡片，自动预填标题与「关联文件」。"
              tips="需先在文件视图打开一个文件；按钮是灰的，就说明还没打开文件。" />
            <button class="small-btn" @click="showNewCol = !showNewCol">＋ 新建列</button><ph-help
              title="新建列" doc="03-协作与看板.md"
              desc="给看板加一个自定义列（如「测试中」）。列可双击改名、设 WIP 上限、删除。"
              :steps="['① 点「＋ 新建列」→ 输入列名，回车创建', '② 拖动卡片在该列进出']"
              tips="列头那个「W」是 WIP 上限：这一列同时最多放几张卡片（在制品限制），留空 = 不限，不设也能用。" />
            <button class="small-btn" @click="load">🔄 刷新</button>
            <span style="font-size:12px;color:var(--muted)">拖拽卡片可在列间移动 · 点击卡片编辑</span><ph-help
              title="审核流（待审核列）" doc="03-协作与看板.md"
              desc="看板内置一个「待审核」列，在「做完」和「验收」之间加一道确认。"
              :steps="['① 卡片做完 → 点「提交审核 →」移入待审核列', '② 审核者点「✅ 通过」→ 移到已完成', '③ 不合格点「↩ 退回重做」→ 移回待办并打上标签']"
              tips="「待审核」列是内置的，不可删除——保证流程闭环。" />
          </div>

          <div v-if="showNewCol" class="tb-bar">
            <input v-model="newColTitle" @keyup.enter="addColumn" placeholder="新列名称，回车确认"
              style="padding:7px 10px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text);font-size:13px" />
            <button class="small-btn" @click="addColumn">创建</button>
          </div>

          <div v-if="!project" class="empty tb-empty">
            请先在左侧选择一个项目，或在上方下拉框选择项目。
          </div>
          <div v-else-if="loading" class="empty tb-empty">看板加载中…</div>
          <div v-else-if="error" class="empty tb-empty">
            ⚠️ {{ error }}<br /><br />
            <button class="small-btn" @click="load">重试</button>
          </div>
          <!-- 看板视口：自己吃满剩余高度并同时管住两根滚动条（列宽超出即横向滚，
               列变高即纵向滚）。因为视口高度有界，横向条永远贴在可见区域底边 ——
               新建列后立刻看得见，不必先把页面滚到最下面。 -->
          <div v-else-if="board" class="tb-scroll ph-scroll tb-cols" ref="board">
            <div v-for="col in columns" :key="col.id"
              @dragover.prevent="dragOverCol = col.id" @dragleave="dragOverCol = (dragOverCol === col.id ? '' : dragOverCol)"
              @drop.prevent="onDrop(col.id, null)"
              :style="{ flex:'0 0 260px', background:'var(--panel2)', border:'1px solid ' + (dragOverCol === col.id ? 'var(--accent)' : 'var(--line)'), borderRadius:'10px', padding:'10px' }">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
                <span style="font-size:13px;font-weight:600;color:var(--text);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
                  :title="col.title + '（双击改名）'" @dblclick="renameColumn(col)">{{ col.title }}</span>
                <span style="font-size:11px;color:var(--muted)"
                  :title="col.wipLimit ? 'WIP 上限 ' + col.wipLimit : '未设 WIP 上限'">{{ cardsOf(col.id).length }}<template v-if="col.wipLimit">/{{ col.wipLimit }}</template></span>
                <button class="small-btn" title="WIP 上限" @click="setWip(col)">W</button>
                <button class="small-btn" title="重命名列" @click="renameColumn(col)">✎</button>
                <button v-if="col.id !== 'col_review'" class="small-btn" title="删除列" @click="deleteColumn(col)">🗑</button>
                <span v-else style="font-size:10.5px;color:var(--muted)" title="内置审核列，不可删除">内置</span>
              </div>

              <div v-if="cardsOf(col.id).length === 0" class="empty" style="padding:14px 0;font-size:12px">暂无卡片</div>

              <div v-for="card in cardsOf(col.id)" :key="card.id" draggable="true"
                @dragstart="onDragStart(card, $event)" @dragend="onDragEnd"
                @dragover.prevent @drop.prevent.stop="onDrop(col.id, card)"
                @click="startEdit(card)"
                :style="{ background:'var(--panel)', border:'1px solid var(--line)', borderLeft:'3px solid ' + pri(card.priority).color, borderRadius:'8px', padding:'8px 10px', marginBottom:'8px', cursor:'grab', opacity: dragId === card.id ? 0.5 : 1 }">
                <div style="font-size:13px;color:var(--text);word-break:break-word">{{ card.title }}</div>

                <!-- 卡片最要紧的「两个人」：谁创建 / 目标（写给谁）。目标可填
                     自己（纯记录，下一步该干什么）/ 同事用户名 / 名册里的智能体。 -->
                <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:5px;font-size:11px;color:var(--muted)">
                  <span :title="'创建人：' + (card.createdBy || '未知')">✍️ {{ card.createdBy || '未知' }}</span>
                  <span :title="card.assignee ? '目标（写给谁）：' + card.assignee : '未指派目标'">🎯 {{ card.assignee || '未指派' }}</span>
                </div>

                <!-- 其余要点：优先级 / 截止日期 / 标签 -->
                <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:5px;font-size:11px;color:var(--muted)">
                  <span :style="{ color: pri(card.priority).color, fontWeight: 600 }" :title="'优先级：' + pri(card.priority).label">● {{ pri(card.priority).label }}</span>
                  <span v-if="card.dueDate" :style="{ color: dueColor(card.dueDate) }">📅 {{ dueText(card.dueDate) }}</span>
                  <span v-for="l in card.labels" :key="l" style="font-size:10.5px;padding:1px 6px;border-radius:10px;background:var(--accent-soft, rgba(90,130,200,.15));color:var(--accent)">{{ l }}</span>
                </div>

                <!-- 备注：卡片上给可读预览（最多 6 行，超出 ….）；点卡片进编辑看全文 -->
                <div v-if="card.desc" :title="card.desc"
                  style="margin-top:6px;font-size:11.5px;color:var(--muted);line-height:1.5;white-space:pre-wrap;word-break:break-word;display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical;overflow:hidden">{{ card.desc }}</div>

                <div v-if="card.relatedFiles && card.relatedFiles.length" style="display:flex;gap:4px;flex-wrap:wrap;margin-top:5px">
                  <a v-for="f in card.relatedFiles" :key="f.project + '|' + f.path" href="#" @click.prevent.stop="openFile(f)"
                    style="font-size:11px;color:var(--accent);text-decoration:none;background:var(--accent-soft, rgba(90,130,200,.1));border-radius:6px;padding:1px 6px">{{ f.path.split('/').pop() }}</a>
                </div>
                <!-- 审核流：待审核列里给「通过 / 退回重做」；其余未完成的列给「提交审核」 -->
                <div v-if="reviewColId && card.columnId === reviewColId" style="display:flex;gap:6px;margin-top:7px">
                  <button class="small-btn" style="flex:1;border-color:var(--accent);color:var(--accent)"
                    :title="reviewHint('approve')" @click.stop="review(card, 'approve')">✅ 通过</button>
                  <button class="small-btn" style="flex:1;border-color:var(--warn);color:var(--warn)"
                    :title="reviewHint('reject')" @click.stop="review(card, 'reject')">↩ 退回重做</button>
                </div>
                <button v-else-if="reviewColId && card.columnId !== 'col_done'" class="small-btn"
                  style="width:100%;margin-top:7px" :title="reviewHint('submit')" @click.stop="review(card, 'submit')">提交审核 →</button>
              </div>

              <button class="small-btn" style="width:100%;margin-top:2px" @click="addCardTo(col.id)">＋ 添加卡片</button>
            </div>

            <div style="flex:0 0 200px;color:var(--muted);font-size:12px;padding:10px">
              共 {{ board.cards.length }} 张卡片 · {{ columns.length }} 列
            </div>
          </div>
        <div class="tb-foot">
          <button class="btn btn-ghost" @click="$emit('close')">关 闭</button>
        </div>

      <!-- 卡片编辑/新建 -->
      <div v-if="editing" class="modal-mask" @click.self="editing = null">
        <div class="modal" style="width:640px;max-width:94vw">
          <h2>{{ editing._isNew ? '＋ 新建卡片' : '✎ 编辑卡片' }}<span v-if="editing.createdBy" style="font-size:12px;font-weight:400;color:var(--muted);margin-left:8px">✍️ 创建人：{{ editing.createdBy }}</span></h2>
          <div class="modal-body">
            <div class="field">
              <label>标题</label>
              <input v-model="editing.title" maxlength="200" @keyup.enter="saveCard" />
            </div>
            <div style="display:flex;gap:10px">
              <div class="field" style="flex:1">
                <label>指派给（目标）</label>
                <input v-model="editing.assignee" list="tb-agent-list"
                  placeholder="自己 / 同事用户名 / 名册里的智能体名；留空=未指派" maxlength="64" />
                <div style="font-size:11px;color:var(--muted);margin-top:4px">写给谁：可填你自己（当作「下一步做什么」的记录），后期也可派给名册里的智能体。</div>
                <!-- 候选 = 我自己 + 智能体名册；人类用户名照旧可直接输入（datalist 只是建议，不限定） -->
                <datalist id="tb-agent-list">
                  <option v-if="me" :value="me.username">我自己（{{ me.displayName || me.username }}）</option>
                  <option v-for="a in agentOptions" :key="a.id" :value="a.name">{{ a.kind }}<template v-if="a.skills && a.skills.length"> · {{ a.skills.join('、') }}</template></option>
                </datalist>
              </div>
              <div class="field" style="flex:1">
                <label>优先级</label>
                <select v-model="editing.priority" style="width:100%;padding:9px 12px;background:var(--bg);border:1px solid var(--line);border-radius:6px;color:var(--text)">
                  <option v-for="(v, k) in priorities" :key="k" :value="k">{{ v.label }}</option>
                </select>
              </div>
            </div>
            <div style="display:flex;gap:10px">
              <div class="field" style="flex:1">
                <label>截止日期</label>
                <input type="date" :value="editing.dueDate ? fmtDay(editing.dueDate) : ''"
                  @change="editing.dueDate = dayToMs($event.target.value)"
                  style="width:100%;padding:9px 12px;background:var(--bg);border:1px solid var(--line);border-radius:6px;color:var(--text)" />
              </div>
              <div class="field" style="flex:1">
                <label>标签（逗号分隔）</label>
                <input v-model="editing._labelsText" placeholder="如：合同, 设计稿" />
              </div>
            </div>
            <div class="field" v-if="editing._isNew">
              <label>所在列</label>
              <select v-model="editing.columnId" style="width:100%;padding:9px 12px;background:var(--bg);border:1px solid var(--line);border-radius:6px;color:var(--text)">
                <option v-for="col in columns" :key="col.id" :value="col.id">{{ col.title }}</option>
              </select>
            </div>
            <div class="field">
              <label>关联文件</label>
              <div v-if="editing.relatedFiles.length" style="display:flex;flex-direction:column;gap:6px">
                <div v-for="(f, i) in editing.relatedFiles" :key="i" style="display:flex;align-items:center;gap:8px;font-size:12px">
                  <span style="flex:1;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ f.project }} / {{ f.path }}</span>
                  <button class="small-btn" @click="removeRelated(i)">移除</button>
                </div>
              </div>
              <div v-else style="font-size:12px;color:var(--muted)">暂无。可在文件视图选中文件后，用「＋ 用当前文件建卡」预填。</div>
            </div>
            <!-- 备注放最后、给足高度：长文本一次性看全，不必在窄框里来回滚（用户反馈的「行数一多就看不全」） -->
            <div class="field">
              <label>备注</label>
              <textarea v-model="editing.desc" rows="14"
                style="width:100%;min-height:300px;padding:10px 12px;background:var(--bg);border:1px solid var(--line);border-radius:6px;color:var(--text);font-size:13px;line-height:1.6;resize:vertical"></textarea>
            </div>
          </div>
          <div class="modal-foot">
            <button v-if="!editing._isNew" class="btn btn-ghost" style="color:var(--danger);border-color:var(--danger)"
              @click="deleteCard(editing); editing = null">删除</button>
            <button class="btn btn-ghost" @click="editing = null">取消</button>
            <button class="btn btn-primary" style="width:auto" :disabled="saving || !editing.title.trim()" @click="saveCard">
              {{ saving ? '保存中…' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
}

export default {
  id: 'privhub-task-board',
  slots: {
    'taskboard-view': TaskBoardView,
  },
}
