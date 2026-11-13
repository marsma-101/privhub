/**
 * me — L2 个人层「我的」（任务 / 日程 / 文件 / 偏好）
 *
 * ## 定位
 * 个人层是**项目层的派生镜像**，不是第二个数据中心：
 * 任务与日程的唯一来源仍是各项目的任务看板，这里只是把「指派给我的」横切出来。
 * 所以本组件**不写任何数据**，也不另存一份任务副本。
 *
 * ## 四个 tab（与 issue #3 的个人层一致，按本项目实际落地）
 *   我的任务  未完成优先 + 按截止排序，点一行直接进那个项目的任务看板
 *   我的日程  同一份任务按日期分组（逾期 / 今天 / 未来 / 无日期），不另建日历数据
 *   我的文件  本人目录（真实姓名，按普通文件夹对待）顶层条目，点开进文件视图
 *   我的偏好  主题等个人设置，即时生效、无保存按钮
 *
 * ## 两条口径
 * · 数据缺失显示「—」，不显示 0（没统计 ≠ 没有）。
 * · 明细被上游截断时明说「部分统计」，不拿部分冒充全部。
 *
 * @module privhub-shell/client/me
 */

import './nav-styles.js'

const { api, nav, AUTH, THEME, applyTheme, toast } = window.PrivHub

const DAY = 86400000
const TABS = [
  { id: 'tasks', label: '我的任务', icon: '📋' },
  { id: 'schedule', label: '我的日程', icon: '📅' },
  { id: 'files', label: '我的文件', icon: '🗂️' },
  { id: 'prefs', label: '我的偏好', icon: '🎛️' },
]

function dayText(ts) {
  const d = new Date(ts)
  return (d.getMonth() + 1) + '月' + d.getDate() + '日'
}

const MeView = {
  name: 'shell-me',
  data() {
    return {
      nav, theme: THEME,
      tab: 'tasks',
      loading: true,
      err: '',
      ov: null,
      files: [],
      filesErr: '',
      filesLoading: false,
      now: Date.now(),
    }
  },
  computed: {
    tabs() { return TABS },
    user() { return AUTH.user || {} },
    userName() { return this.user.displayName || this.user.username || '' },
    isDark() { return this.theme.theme === 'dark' },
    compactRail() { return !!this.nav.compactRail },
    tasksDisabled() { return !!(this.ov && this.ov.tasksDisabled) },
    mine() { return (this.ov && this.ov.mine) || { total: 0, open: 0, project: null, tasks: [], partial: false } },
    personal() { return (this.ov && this.ov.personal) || null },
    /** 未完成任务（明细来自服务端，已按权限过滤）。 */
    openTasks() { return (this.mine.tasks || []).filter((t) => !t.done) },
    doneTasks() { return (this.mine.tasks || []).filter((t) => t.done) },
    /** 今天的 0 点：逾期判定按自然日，不按 24 小时（与总览同一口径）。 */
    t0() { const d = new Date(this.now); d.setHours(0, 0, 0, 0); return d.getTime() },
    /** 日程分组：逾期 / 今天 / 未来 / 无日期。只看未完成 —— 做完的不该继续催。 */
    schedule() {
      const late = [], today = [], upcoming = [], undated = []
      for (const t of this.openTasks) {
        if (t.dueDate === null) { undated.push(t); continue }
        if (t.dueDate < this.t0) late.push(t)
        else if (t.dueDate < this.t0 + DAY) today.push(t)
        else upcoming.push(t)
      }
      const byDue = (a, b) => (a.dueDate || 0) - (b.dueDate || 0)
      late.sort(byDue); today.sort(byDue); upcoming.sort(byDue)
      return [
        { id: 'late', label: '已逾期', tone: 'late', items: late },
        { id: 'today', label: '今天', tone: 'today', items: today },
        { id: 'upcoming', label: '接下来', tone: '', items: upcoming },
        { id: 'undated', label: '没有日期', tone: '', items: undated },
      ].filter((g) => g.items.length)
    },
    noData() { return !this.loading && !this.err && !!this.ov },
    /** 个人目录没开通时给出原因，而不是显示一个空列表让人以为文件丢了。 */
    noPersonal() { return this.noData && !this.personal },
    fileCount() { return this.personal && this.personal.entries !== null ? this.personal.entries : null },
  },
  watch: {
    /* 切到「我的文件」才去列目录：首屏不必为一个可能不看的 tab 付一次 IO。 */
    tab(v) { if (v === 'files' && this.personal && !this.files.length && !this.filesLoading) this.loadFiles() },
  },
  async mounted() {
    await this.load()
    if (this.tab === 'files' && this.personal) await this.loadFiles()
    this._timer = setInterval(() => { this.now = Date.now() }, 60000)
  },
  beforeUnmount() { if (this._timer) clearInterval(this._timer) },
  methods: {
    dayText,
    async load() {
      this.loading = true
      this.err = ''
      try {
        const r = await api('/privhub/api/dashboard/overview')
        if (r && r.ok) this.ov = r
        else this.err = (r && r.error) || '个人数据读取失败'
      } catch (e) {
        this.err = (e && e.message) || '个人数据读取失败'
      } finally {
        this.loading = false
      }
    },
    async loadFiles() {
      if (!this.personal || !this.personal.dir) return
      this.filesLoading = true
      this.filesErr = ''
      try {
        const r = await api('/privhub/api/list?project=' + encodeURIComponent(this.personal.dir))
        if (r && r.ok) this.files = r.entries || []
        else this.filesErr = (r && r.error) || '目录读取失败'
      } catch (e) {
        this.filesErr = (e && e.message) || '目录读取失败'
      } finally {
        this.filesLoading = false
      }
    },
    setTab(id) { this.tab = id },
    /** 点任务 → 进它所属项目的任务看板（任务的编辑只在那里做，个人层只读）。 */
    openTask(t) {
      if (!t) return
      nav.openProject(t.project, { view: nav.hasBarView('taskboard') ? 'taskboard' : undefined })
    },
    openMyDir() { if (this.personal && this.personal.dir) nav.openDir(this.personal.dir, '') },
    openEntry(e) {
      if (!this.personal || !e) return
      const path = e.name
      if (e.isDir) nav.openDir(this.personal.dir, path)
      else nav.openDir(this.personal.dir, '')
    },
    openCalendar() {
      const p = this.mine.project
      if (p && nav.hasBarView('calendar')) nav.openProject(p, { view: 'calendar' })
      else if (p) nav.openProject(p, { view: nav.hasBarView('taskboard') ? 'taskboard' : undefined })
    },
    toggleTheme() {
      this.theme.theme = this.isDark ? 'light' : 'dark'
      if (typeof applyTheme === 'function') applyTheme()
      if (typeof toast === 'function') toast(this.isDark ? '已切换到深色主题' : '已切换到浅色主题')
    },
    openSettings() { if (nav.hasBarView('settings')) nav.setActiveView('settings', { noToggle: true }) },
    /**
     * 导航形态：层级导航 ↔ 紧凑竖栏。两套读同一份 barItems 与归组数据，
     * 所以切换不丢功能 —— 用惯竖栏的人不必被迫改习惯。
     * 权威写入是骨架的 nav.setCompactRail（它同时改状态与 localStorage）。
     */
    toggleRail() {
      const next = !this.compactRail
      if (typeof nav.setCompactRail === 'function') nav.setCompactRail(next)
      if (typeof toast === 'function') toast(next ? '已切到紧凑竖栏' : '已切到层级导航')
    },
    numText(v) { return v === null || v === undefined ? '—' : String(v) },
    dueLabel(t) {
      if (t.dueDate === null) return '无日期'
      const days = Math.ceil((t.dueDate - this.t0) / DAY)
      if (days < 0) return '逾期 ' + (-days) + ' 天'
      if (days === 0) return '今天到期'
      if (days === 1) return '明天到期'
      return dayText(t.dueDate) + '（' + days + ' 天后）'
    },
    dueClass(t) {
      if (t.dueDate === null) return ''
      if (t.dueDate < this.t0) return 'late'
      if (t.dueDate < this.t0 + DAY) return 'today'
      return ''
    },
    priorityText(t) {
      if (t.priority === 'high') return '高优先'
      if (t.priority === 'low') return '低优先'
      return ''
    },
  },
  template: `
    <div class="me-root ph-scroll">
      <div class="me-head">
        <span class="big">我的</span>
        <span class="sub" v-if="userName">{{ userName }} · 任务与日程来自各项目，这里只把指派给你的横切出来</span>
      </div>

      <div class="me-tabs" role="tablist">
        <button
          v-for="t in tabs" :key="t.id"
          class="me-tab" :class="{ on: tab === t.id }" type="button"
          role="tab" :aria-selected="tab === t.id ? 'true' : 'false'"
          :title="t.label" :aria-label="t.label"
          @click="setTab(t.id)"
        ><span>{{ t.icon }}</span><span>{{ t.label }}</span></button>
      </div>

      <div v-if="err" class="me-panel">
        <div class="me-state bad">{{ err }}<div><button class="btn btn-primary" @click="load">重试</button></div></div>
      </div>
      <div v-else-if="loading && !ov" class="me-panel"><div class="me-state">正在汇总你的任务…</div></div>

      <template v-else-if="ov">
        <!-- 我的任务 -->
        <div v-if="tab === 'tasks'" class="me-panel">
          <div class="me-panel-h">
            <span class="t">📋 我的任务</span>
            <span class="n" v-if="!tasksDisabled">{{ mine.open }} 项未完成 · 共指派 {{ mine.total }} 项</span>
            <span class="n" v-if="mine.partial">（卡片明细已截断，这里是部分统计）</span>
          </div>
          <div v-if="tasksDisabled" class="me-state">
            任务功能已被管理员关闭，暂时看不到指派信息。
            <div>需要的话请联系管理员开启「任务看板」功能。</div>
          </div>
          <div v-else-if="openTasks.length === 0" class="me-state">
            当前没有指派给你的未完成任务。
            <div>{{ doneTasks.length ? '已完成的 ' + doneTasks.length + ' 项不再催你。' : '进项目的任务看板可以给自己建卡。' }}</div>
          </div>
          <div v-else class="me-rows me-scroll ph-scroll">
            <button v-for="t in openTasks" :key="t.project + '/' + t.id" class="me-row" type="button" :title="'进「' + t.project + '」的任务看板处理这件事'" @click="openTask(t)">
              <span class="t">{{ priorityText(t) ? '· ' + priorityText(t) + ' · ' : '' }}{{ t.title }}</span>
              <span class="p">{{ t.project }} · {{ t.columnTitle }}</span>
              <span class="d" :class="dueClass(t)">{{ dueLabel(t) }}</span>
            </button>
          </div>
          <div class="me-note">任务只读：改状态、指派人、写备注都在项目的任务看板里做，避免两处编辑打架。</div>
        </div>

        <!-- 我的日程 -->
        <div v-else-if="tab === 'schedule'" class="me-panel">
          <div class="me-panel-h">
            <span class="t">📅 我的日程</span>
            <span class="n">按截止分组，只看未完成</span>
            <button v-if="mine.project" class="btn" style="width:auto;margin-left:auto" @click="openCalendar">在项目日历里看</button>
          </div>
          <div v-if="tasksDisabled" class="me-state">任务功能已关闭，没有日程可排。</div>
          <div v-else-if="schedule.length === 0" class="me-state">
            没有带日期的待办。
            <div>给任务设一个截止日期，它才会出现在日程里。</div>
          </div>
          <div v-else class="me-scroll ph-scroll">
            <div v-for="g in schedule" :key="g.id" style="margin-bottom:14px">
              <div class="me-panel-h" style="margin-bottom:6px">
                <span class="t" style="font-size:13px">{{ g.label }}</span>
                <span class="n">{{ g.items.length }} 项</span>
              </div>
              <div class="me-rows">
                <button v-for="t in g.items" :key="g.id + t.project + '/' + t.id" class="me-row" type="button" :title="'进「' + t.project + '」处理'" @click="openTask(t)">
                  <span class="t">{{ t.title }}</span>
                  <span class="p">{{ t.project }}</span>
                  <span class="d" :class="dueClass(t)">{{ dueLabel(t) }}</span>
                </button>
              </div>
            </div>
          </div>
          <div class="me-note">日程与任务看板同源：这里不另存日期，改日期请回到任务卡。</div>
        </div>

        <!-- 我的文件 -->
        <div v-else-if="tab === 'files'" class="me-panel">
          <div class="me-panel-h">
            <span class="t">🗂️ 我的文件</span>
            <span class="n" v-if="personal">{{ personal.dir }} · {{ numText(fileCount) }} 个顶层条目</span>
            <button v-if="personal" class="btn" style="width:auto;margin-left:auto" @click="openMyDir">打开目录</button>
          </div>
          <div v-if="noPersonal" class="me-state">
            你还没有个人目录。
            <div>个人目录在注册时按真实姓名创建；历史账号可由管理员补开。</div>
          </div>
          <div v-else-if="filesErr" class="me-state bad">{{ filesErr }}<div><button class="btn" @click="loadFiles">重试</button></div></div>
          <div v-else-if="filesLoading" class="me-state">正在读取目录…</div>
          <div v-else-if="files.length === 0" class="me-state">
            目录是空的。
            <div><button class="btn btn-primary" @click="openMyDir">去上传文件</button></div>
          </div>
          <div v-else class="me-grid">
            <button v-for="e in files" :key="e.name" class="me-card" type="button" :title="e.isDir ? '打开文件夹' : '在文件视图里打开'" @click="openEntry(e)">
              <span class="k">{{ e.isDir ? '文件夹' : '文件' }}</span>
              <span class="v">{{ e.isDir ? '📂' : '📄' }} {{ e.name }}</span>
              <span class="h">{{ e.isDir ? '点击进去浏览' : '点击在文件视图打开' }}</span>
            </button>
          </div>
          <div class="me-note">这是你自己的目录，别人（包括管理员）看不到。</div>
        </div>

        <!-- 我的偏好 -->
        <div v-else class="me-panel">
          <div class="me-panel-h"><span class="t">🎛️ 我的偏好</span><span class="n">只影响你自己，立即生效，不用保存</span></div>
          <div class="me-pref">
            <span class="k">界面主题</span>
            <button class="btn" style="width:auto" :title="isDark ? '当前深色，点击切浅色' : '当前浅色，点击切深色'" @click="toggleTheme">{{ isDark ? '☀️ 切到浅色' : '🌙 切到深色' }}</button>
            <span class="v">{{ isDark ? '深色' : '浅色' }} · 记在本机，下次进来保持不变</span>
          </div>
          <div class="me-pref">
            <span class="k">导航形态</span>
            <button class="btn" style="width:auto" :title="compactRail ? '当前紧凑竖栏，点击切回层级导航' : '当前层级导航，点击切到紧凑竖栏'" @click="toggleRail">{{ compactRail ? '🧭 切到层级导航' : '📐 切到紧凑竖栏' }}</button>
            <span class="v">{{ compactRail ? '紧凑竖栏（图标 + 分类抽屉）' : '层级导航（层级条 + 项目四 tab）' }} · 功能一样多，只是摆法不同</span>
          </div>
          <div class="me-pref">
            <span class="k">更多设置</span>
            <button v-if="nav.hasBarView('settings')" class="btn" style="width:auto" @click="openSettings">打开设置</button>
            <span class="v">账号、密码、通知等</span>
          </div>
          <div class="me-note">系统级配置（存储、权限、审计）在管理控制台，不在个人偏好里 —— 那些改动会影响所有人。</div>
        </div>
      </template>
    </div>
  `,
}

export default MeView