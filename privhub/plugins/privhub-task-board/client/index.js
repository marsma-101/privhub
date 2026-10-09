/**
 * privhub-task-board · client — 任务看板主视图（挂 taskboard-view slot）
 *
 * 每个项目一个看板：列（可增/删/改名/重排/WIP 上限）+ 卡片（建/改/删/拖拽）。
 * 数据全走 window.PrivHub.api（禁裸 fetch）；监听 entry:open 支持「用当前文件建卡」。
 * 卸载时解绑事件与定时器，零残留（红线 §7）。
 *
 * @module privhub-task-board/client
 */

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
    }
  },
  computed: {
    me() { return (AUTH && AUTH.user) || null },
    columns() {
      return this.board ? [...this.board.columns].sort((a, b) => a.order - b.order) : []
    },
    priorities() { return PRIORITY },
    canCreateFromFile() { return !!(this.lastFile && this.lastFile.project === this.project) },
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
    switchProject(p) { this.project = p; this.load() },
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
    this.project = nav.project || (this.projects[0] || '')
    if (this.project) await this.load()
  },
  beforeUnmount() {
    if (this._onFile) bus.off('entry:open', this._onFile)
  },
  template: `
    <div class="view-page">
      <div class="view-inner">
        <h2>📋 任务看板</h2>
        <div class="modal-body">
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap">
            <select :value="project" @change="switchProject($event.target.value)"
              style="padding:7px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text)">
              <option value="" disabled>选择项目…</option>
              <option v-for="p in projects" :key="p" :value="p">{{ p }}</option>
            </select>
            <button class="small-btn" :disabled="!canCreateFromFile" @click="addCardFromFile"
              :title="canCreateFromFile ? '用文件视图最近打开的文件建卡' : '先在文件视图打开一个文件'">＋ 用当前文件建卡</button>
            <button class="small-btn" @click="showNewCol = !showNewCol">＋ 新建列</button>
            <button class="small-btn" @click="load">🔄 刷新</button>
            <span style="font-size:12px;color:var(--muted)">拖拽卡片可在列间移动 · 点击卡片编辑</span>
          </div>

          <div v-if="showNewCol" style="display:flex;gap:8px;margin-bottom:12px">
            <input v-model="newColTitle" @keyup.enter="addColumn" placeholder="新列名称，回车确认"
              style="padding:7px 10px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text);font-size:13px" />
            <button class="small-btn" @click="addColumn">创建</button>
          </div>

          <div v-if="!project" class="empty" style="padding:60px">
            请先在左侧选择一个项目，或在上方下拉框选择项目。
          </div>
          <div v-else-if="loading" class="empty" style="padding:60px">看板加载中…</div>
          <div v-else-if="error" class="empty" style="padding:60px">
            ⚠️ {{ error }}<br /><br />
            <button class="small-btn" @click="load">重试</button>
          </div>
          <div v-else-if="board" style="display:flex;gap:12px;align-items:flex-start;overflow-x:auto;padding-bottom:8px;min-height:320px">
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
                <button class="small-btn" title="删除列" @click="deleteColumn(col)">🗑</button>
              </div>

              <div v-if="cardsOf(col.id).length === 0" class="empty" style="padding:14px 0;font-size:12px">暂无卡片</div>

              <div v-for="card in cardsOf(col.id)" :key="card.id" draggable="true"
                @dragstart="onDragStart(card, $event)" @dragend="onDragEnd"
                @dragover.prevent @drop.prevent.stop="onDrop(col.id, card)"
                @click="startEdit(card)"
                :style="{ background:'var(--panel)', border:'1px solid var(--line)', borderLeft:'3px solid ' + pri(card.priority).color, borderRadius:'8px', padding:'8px 10px', marginBottom:'8px', cursor:'grab', opacity: dragId === card.id ? 0.5 : 1 }">
                <div style="font-size:13px;color:var(--text);word-break:break-word">{{ card.title }}</div>
                <div v-if="card.labels.length" style="display:flex;gap:4px;flex-wrap:wrap;margin-top:5px">
                  <span v-for="l in card.labels" :key="l" style="font-size:10.5px;padding:1px 6px;border-radius:10px;background:var(--accent-soft, rgba(90,130,200,.15));color:var(--accent)">{{ l }}</span>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;font-size:11px;color:var(--muted)">
                  <span v-if="card.assignee">👤 {{ card.assignee }}</span>
                  <span v-if="card.dueDate" :style="{ color: dueColor(card.dueDate) }">📅 {{ dueText(card.dueDate) }}</span>
                  <span v-if="card.relatedFiles && card.relatedFiles.length">📎 {{ card.relatedFiles.length }}</span>
                </div>
                <div v-if="card.relatedFiles && card.relatedFiles.length" style="display:flex;gap:4px;flex-wrap:wrap;margin-top:5px">
                  <a v-for="f in card.relatedFiles" :key="f.project + '|' + f.path" href="#" @click.prevent.stop="openFile(f)"
                    style="font-size:11px;color:var(--accent);text-decoration:none;background:var(--accent-soft, rgba(90,130,200,.1));border-radius:6px;padding:1px 6px">{{ f.path.split('/').pop() }}</a>
                </div>
              </div>

              <button class="small-btn" style="width:100%;margin-top:2px" @click="addCardTo(col.id)">＋ 添加卡片</button>
            </div>

            <div style="flex:0 0 200px;color:var(--muted);font-size:12px;padding:10px">
              共 {{ board.cards.length }} 张卡片 · {{ columns.length }} 列
            </div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="$emit('close')">关 闭</button>
        </div>
      </div>

      <!-- 卡片编辑/新建 -->
      <div v-if="editing" class="modal-mask" @click.self="editing = null">
        <div class="modal" style="width:520px;max-width:92vw">
          <h2>{{ editing._isNew ? '＋ 新建卡片' : '✎ 编辑卡片' }}</h2>
          <div class="modal-body">
            <div class="field">
              <label>标题</label>
              <input v-model="editing.title" maxlength="200" @keyup.enter="saveCard" />
            </div>
            <div class="field">
              <label>备注（Markdown 文本）</label>
              <textarea v-model="editing.desc" rows="5" style="width:100%;padding:9px 12px;background:var(--bg);border:1px solid var(--line);border-radius:6px;color:var(--text);font-size:13px;resize:vertical"></textarea>
            </div>
            <div style="display:flex;gap:10px">
              <div class="field" style="flex:1">
                <label>负责人</label>
                <input v-model="editing.assignee" placeholder="username，留空=未指派" maxlength="64" />
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
