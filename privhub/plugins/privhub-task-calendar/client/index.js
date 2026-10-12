/**
 * privhub-task-calendar · client — 任务日历（月 / 周 / 日 三视图，挂 calendar-view slot）
 *
 * 数据来源就是既有的任务看板：GET /privhub/api/taskboard?project=
 * —— 本插件**不改数据结构**，只按卡片的 dueDate（日粒度）把它铺到日历上。
 * 于是「看板」与「日历」永远是同一批任务的两种看法，不会各存一份、各改一份。
 *
 * 能做的写操作只有两种（都走既有接口）：
 *   · 拖动卡片到另一天 → PATCH /privhub/api/taskboard/cards { dueDate }
 *   · 在当天新建任务   → POST  /privhub/api/taskboard/cards { dueDate }
 * 列/卡片本身的增删改仍归任务看板，本插件不重复实现编辑器。
 *
 * @module privhub-task-calendar/client
 */

import './styles.js'

const { api, nav, toast } = window.PrivHub

const PRIORITY = {
  low: { label: '低', color: '#7a8699' },
  normal: { label: '中', color: '#4a7bd6' },
  high: { label: '高', color: '#c07a2b' },
  urgent: { label: '紧急', color: '#d05a5a' },
}

/** 「已完成」列的判定：id 形如 col_done，或列名里带「完成 / done」。 */
const DONE_RE = /(^|[_\s-])(col_)?done($|[_\s-])|完成/i

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

/* ---------- 日期工具（全部按本地时区、日粒度） ---------- */

function startOfDay(ms) {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function addDays(ms, n) {
  const d = new Date(ms)
  d.setDate(d.getDate() + n)
  return startOfDay(d.getTime())
}

/** 周一为一周之首（中文日历习惯）。 */
function startOfWeek(ms) {
  const d = new Date(startOfDay(ms))
  const back = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - back)
  return d.getTime()
}

function startOfMonth(ms) {
  const d = new Date(ms)
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
}

function dayKey(ms) {
  const d = new Date(ms)
  const p = (n) => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

function fmtDayLabel(ms) {
  const d = new Date(ms)
  const p = (n) => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

const TaskCalendarView = {
  name: 'calendar-view',
  data() {
    return {
      projects: [],
      project: '',
      board: null,
      loading: false,
      error: '',
      mode: 'month',                    // month | week | day
      cursor: startOfDay(Date.now()),   // 当前锚点日期（视图跟着它走）
      dragId: '',                       // 正在拖的卡片 id
      dragOver: '',                     // 悬停落点 key（日期 key 或 'undated'）
      selected: null,                   // 选中的卡片（详情面板）
      busy: false,
    }
  },
  computed: {
    columns() {
      return this.board ? [...this.board.columns].sort((a, b) => a.order - b.order) : []
    },
    /** 视为「已完成」的列 id 集合 */
    doneIds() {
      const s = {}
      for (const c of this.columns) if (DONE_RE.test(c.title) || DONE_RE.test(c.id)) s[c.id] = true
      return s
    },
    cards() { return this.board ? this.board.cards : [] },
    /** 某天的任务表：{ 'YYYY-MM-DD': Card[] } */
    byDay() {
      const m = {}
      for (const c of this.cards) {
        if (!c.dueDate) continue
        const k = dayKey(c.dueDate)
        ;(m[k] || (m[k] = [])).push(c)
      }
      for (const k in m) m[k].sort((a, b) => (a.order || 0) - (b.order || 0))
      return m
    },
    /** 未排期（没有截止日期）的任务 */
    undated() { return this.cards.filter((c) => !c.dueDate) },
    todayKey() { return dayKey(Date.now()) },
    title() {
      const d = new Date(this.cursor)
      if (this.mode === 'month') return d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月'
      if (this.mode === 'day') return fmtDayLabel(this.cursor) + ' 周' + WEEKDAYS[(d.getDay() + 6) % 7]
      const s = startOfWeek(this.cursor), e = addDays(s, 6)
      return fmtDayLabel(s) + ' ~ ' + fmtDayLabel(e)
    },
    /** 月视图：6 周 × 7 天的格子 */
    monthCells() {
      const cur = new Date(this.cursor).getMonth()
      const start = startOfWeek(startOfMonth(this.cursor))
      const out = []
      for (let i = 0; i < 42; i++) {
        const ms = addDays(start, i)
        const d = new Date(ms)
        const key = dayKey(ms)
        out.push({
          ms, key, day: d.getDate(), inMonth: d.getMonth() === cur,
          today: key === this.todayKey, tasks: this.byDay[key] || [],
        })
      }
      return out
    },
    /** 周视图：锚点所在周的 7 天 */
    weekCells() {
      const start = startOfWeek(this.cursor)
      const out = []
      for (let i = 0; i < 7; i++) {
        const ms = addDays(start, i)
        const key = dayKey(ms)
        out.push({ ms, key, day: new Date(ms).getDate(), today: key === this.todayKey, tasks: this.byDay[key] || [] })
      }
      return out
    },
    /** 日视图：锚点当天的任务 */
    dayTasks() { return this.byDay[dayKey(this.cursor)] || [] },
    /** 锚点日期的 key（日视图的拖放落点） */
    cursorKey() { return dayKey(this.cursor) },
    weekdays() { return WEEKDAYS },
  },
  mounted() { this.ensureLoaded() },
  methods: {
    pri(p) { return PRIORITY[p] || PRIORITY.normal },
    fmtDayLabel,
    isDone(c) { return !!this.doneIds[c.columnId] },
    colTitle(id) { const c = this.columns.find((x) => x.id === id); return c ? c.title : '' },

    async ensureLoaded() {
      let p = nav.project || ''
      await this.loadProjects()
      if (!p) p = this.projects[0] || ''
      await this.load(p)
    },
    async loadProjects() {
      const r = await api('/privhub/api/projects')
      if (r && r.ok) this.projects = r.projects || []
    },
    async load(project) {
      this.project = project || ''
      this.board = null
      this.error = ''
      this.selected = null
      if (!this.project) return
      this.loading = true
      try {
        const r = await api('/privhub/api/taskboard?project=' + encodeURIComponent(this.project))
        if (r && r.ok && r.board) this.board = r.board
        else this.error = (r && r.error) || '加载失败'
      } catch (e) {
        this.error = (e && e.message) || '加载失败'
      } finally { this.loading = false }
    },
    async pick(p) {
      if (!p || p === this.project) return
      nav.openProject(p)
      await this.load(p)
    },
    async refresh() { await this.load(this.project) },

    /* ---------- 视图切换与翻页 ---------- */
    setMode(m) { this.mode = m },
    go(dir) {
      if (this.mode === 'month') {
        const d = new Date(this.cursor)
        this.cursor = startOfDay(new Date(d.getFullYear(), d.getMonth() + dir, 1).getTime())
      } else if (this.mode === 'week') {
        this.cursor = addDays(this.cursor, 7 * dir)
      } else {
        this.cursor = addDays(this.cursor, dir)
      }
    },
    goToday() { this.cursor = startOfDay(Date.now()) },
    openDay(ms) { this.cursor = startOfDay(ms); this.mode = 'day' },

    /* ---------- 拖动改期 ---------- */
    onDragStart(card, ev) {
      this.dragId = card.id
      if (ev && ev.dataTransfer) {
        ev.dataTransfer.effectAllowed = 'move'
        try { ev.dataTransfer.setData('text/plain', card.id) } catch { /* 某些浏览器限制 */ }
      }
    },
    onDragEnd() { this.dragId = ''; this.dragOver = '' },
    onDragOver(key) { if (this.dragId) this.dragOver = key },
    async dropOn(key) {
      const id = this.dragId
      this.dragId = ''
      this.dragOver = ''
      if (!id) return
      const ms = key === 'undated' ? null : dayKeyToMs(key)
      const card = this.cards.find((c) => c.id === id)
      if (!card) return
      const cur = card.dueDate ? startOfDay(card.dueDate) : null
      if (cur === ms) return
      await this.patchDate(card, ms)
    },
    async patchDate(card, ms) {
      this.busy = true
      try {
        const r = await api('/privhub/api/taskboard/cards', {
          method: 'PATCH',
          body: JSON.stringify({ project: this.project, id: card.id, dueDate: ms }),
        })
        if (!r || !r.ok) { toast((r && r.error) || '改期失败', 'error'); return }
        await this.load(this.project)
        toast(ms ? '已改到 ' + fmtDayLabel(ms) : '已移出排期')
      } finally { this.busy = false }
    },
    async clearDate(card) { await this.patchDate(card, null) },

    /* ---------- 新建 / 选中 ---------- */
    newTask(dayMs) {
      if (!this.project) return
      const when = dayMs ? fmtDayLabel(startOfDay(dayMs)) : '未排期'
      nav.askInput('新建任务（' + when + '）：', '', async (title) => {
        const t = String(title || '').trim()
        if (!t) return
        const r = await api('/privhub/api/taskboard/cards', {
          method: 'POST',
          body: JSON.stringify({ project: this.project, title: t, dueDate: dayMs ? startOfDay(dayMs) : null }),
        })
        if (!r || !r.ok) { toast((r && r.error) || '新建失败', 'error'); return }
        await this.load(this.project)
        toast('已新建任务')
      })
    },
    select(card) { this.selected = this.selected && this.selected.id === card.id ? null : card },
    openBoard() { nav.setActiveView('taskboard') },
  },
  template: `
    <div class="cal-wrap">
      <div class="cal-bar">
        <div class="cal-nav">
          <button class="cal-btn" title="上一页" @click="go(-1)">‹</button>
          <button class="cal-btn" @click="goToday">今天</button>
          <button class="cal-btn" title="下一页" @click="go(1)">›</button>
          <span class="cal-title">{{ title }}</span>
        </div>
        <div class="cal-modes">
          <button class="cal-mbtn" :class="{ on: mode === 'month' }" @click="setMode('month')">月</button>
          <button class="cal-mbtn" :class="{ on: mode === 'week' }" @click="setMode('week')">周</button>
          <button class="cal-mbtn" :class="{ on: mode === 'day' }" @click="setMode('day')">日</button>
        </div>
        <div class="cal-right">
          <select v-if="projects.length" class="cal-sel" :value="project" @change="pick($event.target.value)" title="切换项目">
            <option v-for="p in projects" :key="p" :value="p">{{ p }}</option>
          </select>
          <button class="cal-btn" @click="refresh" :disabled="loading">{{ loading ? '刷新中…' : '刷新' }}</button>
        </div>
      </div>

      <div v-if="!project" class="cal-empty">请先在顶部选择一个项目 —— 任务日历按项目显示。</div>
      <div v-else-if="error" class="cal-err">加载失败：{{ error }}</div>
      <div v-else-if="loading && !board" class="cal-empty">加载中…</div>

      <div v-else class="cal-body">
        <!-- ===== 月视图 ===== -->
        <div v-if="mode === 'month'" class="cal-month">
          <div class="cal-wd" v-for="w in weekdays" :key="w">{{ w }}</div>
          <div v-for="cell in monthCells" :key="cell.key" class="cal-cell"
               :class="{ out: !cell.inMonth, today: cell.today, over: dragOver === cell.key }"
               @dragover.prevent="onDragOver(cell.key)" @dragleave="dragOver = ''" @drop.prevent="dropOn(cell.key)">
            <div class="cal-cell-head">
              <span class="cal-daynum" @click="openDay(cell.ms)">{{ cell.day }}</span>
              <button class="cal-add" title="当天新建任务" @click.stop="newTask(cell.ms)">＋</button>
            </div>
            <div class="cal-chips">
              <div v-for="c in cell.tasks.slice(0, 3)" :key="c.id" class="cal-chip"
                   :class="{ done: isDone(c), sel: selected && selected.id === c.id }"
                   :style="{ borderLeftColor: pri(c.priority).color }"
                   draggable="true" @dragstart="onDragStart(c, $event)" @dragend="onDragEnd" @click="select(c)">
                <span class="cal-chip-t">{{ c.title }}</span>
              </div>
              <div v-if="cell.tasks.length > 3" class="cal-more" @click="openDay(cell.ms)">还有 {{ cell.tasks.length - 3 }} 项</div>
            </div>
          </div>
        </div>

        <!-- ===== 周视图 ===== -->
        <div v-else-if="mode === 'week'" class="cal-week">
          <div v-for="cell in weekCells" :key="cell.key" class="cal-wcol"
               :class="{ today: cell.today, over: dragOver === cell.key }"
               @dragover.prevent="onDragOver(cell.key)" @dragleave="dragOver = ''" @drop.prevent="dropOn(cell.key)">
            <div class="cal-wcol-head">
              <span class="cal-daynum" @click="openDay(cell.ms)">{{ cell.day }}</span>
              <button class="cal-add" title="当天新建任务" @click.stop="newTask(cell.ms)">＋</button>
            </div>
            <div class="cal-chips">
              <div v-for="c in cell.tasks" :key="c.id" class="cal-chip"
                   :class="{ done: isDone(c), sel: selected && selected.id === c.id }"
                   :style="{ borderLeftColor: pri(c.priority).color }"
                   draggable="true" @dragstart="onDragStart(c, $event)" @dragend="onDragEnd" @click="select(c)">
                <span class="cal-chip-t">{{ c.title }}</span>
                <span class="cal-chip-a" v-if="c.assignee">{{ c.assignee }}</span>
              </div>
              <div v-if="!cell.tasks.length" class="cal-none">—</div>
            </div>
          </div>
        </div>

        <!-- ===== 日视图 ===== -->
        <div v-else class="cal-day">
          <div class="cal-daylist" @dragover.prevent="onDragOver(cursorKey)" @dragleave="dragOver = ''" @drop.prevent="dropOn(cursorKey)">
            <div v-if="!dayTasks.length" class="cal-none">这一天没有任务。按右上「＋ 新任务」加一个。</div>
            <div v-for="c in dayTasks" :key="c.id" class="cal-row"
                 :class="{ done: isDone(c), sel: selected && selected.id === c.id }"
                 draggable="true" @dragstart="onDragStart(c, $event)" @dragend="onDragEnd" @click="select(c)">
              <span class="cal-dot" :style="{ background: pri(c.priority).color }"></span>
              <span class="cal-row-t">{{ c.title }}</span>
              <span class="cal-badge">{{ colTitle(c.columnId) }}</span>
              <span class="cal-row-a" v-if="c.assignee">{{ c.assignee }}</span>
              <span class="cal-row-p">{{ pri(c.priority).label }}</span>
            </div>
          </div>
        </div>

        <!-- ===== 未排期 ===== -->
        <div class="cal-undated" :class="{ over: dragOver === 'undated' }"
             @dragover.prevent="onDragOver('undated')" @dragleave="dragOver = ''" @drop.prevent="dropOn('undated')">
          <span class="cal-undated-h">未排期（拖动到此可清除截止日期）</span>
          <div class="cal-chips">
            <div v-for="c in undated" :key="c.id" class="cal-chip"
                 :class="{ done: isDone(c), sel: selected && selected.id === c.id }"
                 :style="{ borderLeftColor: pri(c.priority).color }"
                 draggable="true" @dragstart="onDragStart(c, $event)" @dragend="onDragEnd" @click="select(c)">
              <span class="cal-chip-t">{{ c.title }}</span>
            </div>
            <div v-if="!undated.length" class="cal-none">（都已排期）</div>
          </div>
        </div>

        <!-- ===== 详情 ===== -->
        <div v-if="selected" class="cal-detail">
          <div class="cal-detail-h">
            <span class="cal-dot" :style="{ background: pri(selected.priority).color }"></span>
            <strong>{{ selected.title }}</strong>
            <button class="cal-btn" @click="selected = null">关闭</button>
          </div>
          <div class="cal-meta">
            <span>状态：{{ colTitle(selected.columnId) || '—' }}</span>
            <span>优先级：{{ pri(selected.priority).label }}</span>
            <span>截止：{{ selected.dueDate ? fmtDayLabel(selected.dueDate) : '未排期' }}</span>
            <span v-if="selected.assignee">负责人：{{ selected.assignee }}</span>
          </div>
          <div v-if="selected.desc" class="cal-desc">{{ selected.desc }}</div>
          <div class="cal-detail-actions">
            <button class="cal-btn" v-if="selected.dueDate" @click="clearDate(selected)">移出排期</button>
            <button class="cal-btn" @click="openBoard">在任务看板中打开</button>
          </div>
        </div>

        <div class="cal-foot">
          任务是同一个看板的另一种看法：这里改期即刻反映到「任务看板」，反之亦然。
        </div>
      </div>
    </div>
  `,
}

/** 'YYYY-MM-DD' → 当天 0 点毫秒。 */
function dayKeyToMs(key) {
  const t = Date.parse(key + 'T00:00:00')
  return Number.isFinite(t) ? t : null
}

export default {
  id: 'privhub-task-calendar',
  slots: { 'calendar-view': TaskCalendarView },
}
