/**
 * overview — L1「项目总览」驾驶舱（首页首屏）。
 *
 * ## 它回答三个问题，按这个顺序自上而下
 *   1. 整个盘子怎么样？   → KPI 行（可见项目 / 卡点 / 平均进度 / 我的待办）
 *   2. 活儿都堆在哪一段？ → 管线聚合（四态堆叠条 + 图例 + 合计，**不放明细列表**）
 *   3. 我该点进哪个项目？ → 项目卡片（健康度 / 进度 / 当前节点 / 卡点 / 成员），整卡可点
 *   最后给一张「我的」入口卡（我的文件 / 我的任务），把个人视图摆在**派生位置**。
 *
 * ## 三条不可越界的事实
 *   · **只读聚合，不做任何编辑**。写操作一律在项目里做（L2），首页不承担写风险。
 *   · **数据全部来自服务端** `/privhub/api/dashboard/overview`：范围是服务端按
 *     `indexableProjects + canAccess` 算出来的，前端不再自己拼项目清单 —— 否则
 *     「我看得见的」和「统计进去的」会悄悄分叉，别人的私有目录会漏进 KPI。
 *   · **不编造数字**。没建过任务的项目进度是 `null` → 显示「—」，不是 0%；
 *     成员数/文件数拿不到时同样是「—」。卡点必须把口径写在界面上（见 BLOCKER_HINT）。
 *
 * 样式在 ./overview-styles.js（import 即注入）；本文件只管组件与数据流。
 *
 * @module privhub-shell-home/client/overview
 */

import './overview-styles.js'

const { api, nav, AUTH } = window.PrivHub

/** 四个管线桶的展示顺序与中文名（与服务端 BUCKET_LABELS 同一口径）。 */
const BUCKETS = [
  { id: 'todo', label: '待办' },
  { id: 'doing', label: '进行中' },
  { id: 'review', label: '待审核' },
  { id: 'done', label: '已完成' },
]

/** 卡点口径：界面上必须明说，否则「3 个卡点」是个没人能复核的数字。 */
const BLOCKER_HINT = '卡点 = 逾期未完成的任务 + 超出 WIP 上限的在制品 + 计划里标记为受阻的条目'

/** 项目卡片排序口径（下拉里逐项写明，控件必须反映当前选中态）。 */
const SORTS = [
  { id: 'blockers', label: '卡点优先' },
  { id: 'progress', label: '进度低→高' },
  { id: 'name', label: '名称' },
  { id: 'updated', label: '最近更新' },
]

const DAY = 86400000

function dayText(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return (d.getMonth() + 1) + '月' + d.getDate() + '日'
}

/** 相对时间：领导看「多久没动了」比看时间戳有用。 */
function sinceText(ts) {
  if (!ts) return ''
  const d = Date.now() - ts
  if (d < 60000) return '刚刚更新'
  if (d < 3600000) return Math.floor(d / 60000) + ' 分钟前更新'
  if (d < DAY) return Math.floor(d / 3600000) + ' 小时前更新'
  const days = Math.floor(d / DAY)
  if (days < 30) return days + ' 天前更新'
  return dayText(ts) + ' 更新'
}

const Overview = {
  name: 'home-overview',
  data() {
    return {
      loading: true,
      err: '',
      ov: null,                 // 服务端总览结果
      q: '',                    // 项目筛选词（对象级搜索：只搜「项目」，不做全局 omnibox）
      sortKey: 'blockers',
      onlyBlocked: false,
      expanded: false,          // 项目卡片是否展开全部（默认只显示前 CARD_PREVIEW 张）
      now: Date.now(),
    }
  },
  computed: {
    isAdmin() { return !!(AUTH.user && AUTH.user.role === 'admin') },
    userName() { const u = AUTH.user || {}; return u.displayName || u.username || '' },
    sorts() { return SORTS },
    blockerHint() { return BLOCKER_HINT },
    totals() { return (this.ov && this.ov.totals) || null },
    mine() { return (this.ov && this.ov.mine) || { total: 0, open: 0 } },
    personal() { return (this.ov && this.ov.personal) || null },
    tasksDisabled() { return !!(this.ov && this.ov.tasksDisabled) },
    /** 平均进度：null → 「—」（一个有任务的项目都没有时，不拿 0% 冒充）。 */
    avgText() {
      const t = this.totals
      return t && t.avgPercent !== null ? String(t.avgPercent) : '—'
    },
    /** 堆叠条：只渲染 count>0 的桶，flex-grow 按数量分配（0 的桶不占位）。 */
    segments() {
      const t = this.totals
      if (!t) return []
      return BUCKETS
        .map((b) => ({ ...b, n: t.buckets[b.id] || 0 }))
        .filter((b) => b.n > 0)
        .map((b) => ({ ...b, pct: t.tasks > 0 ? Math.round((b.n / t.tasks) * 100) : 0 }))
    },
    legend() {
      const t = this.totals
      return BUCKETS.map((b) => ({ ...b, n: (t && t.buckets[b.id]) || 0 }))
    },
    pipelineEmpty() { const t = this.totals; return !t || t.tasks === 0 },
    /** 排序 + 筛选后的项目卡片。筛选态由控件自己反映（onlyBlocked / sortKey）。 */
    cards() {
      /* 名单已由服务端按 q 过滤（在截断之前），这里只做排序与「只看卡点」。
       * 为什么不在前端筛：项目多于 OVERVIEW_MAX_PROJECTS 时，首屏只拿到前 N 个，
       * 在前端筛等于「第 N+1 个项目永远搜不到」—— 实测踩到过这个坑。 */
      const list = ((this.ov && this.ov.projects) || []).slice()
      const filtered = this.onlyBlocked ? list.filter((p) => p.blockers > 0) : list
      const byName = (a, b) => a.project.localeCompare(b.project, 'zh-Hans-CN')
      filtered.sort((a, b) => {
        if (this.sortKey === 'blockers') return (b.blockers - a.blockers) || byName(a, b)
        if (this.sortKey === 'progress') {
          /* 没进度的排最后：它们不是「0% 最落后」，而是「还没开始记任务」。 */
          const pa = a.percent === null ? 101 : a.percent
          const pb = b.percent === null ? 101 : b.percent
          return (pa - pb) || byName(a, b)
        }
        if (this.sortKey === 'updated') return ((b.updatedAt || 0) - (a.updatedAt || 0)) || byName(a, b)
        return byName(a, b)
      })
      return filtered
    },
    visibleCards() { return this.expanded ? this.cards : this.cards.slice(0, 8) },
    hiddenCount() { return Math.max(0, this.cards.length - this.visibleCards.length) },
    blockedCount() { return ((this.ov && this.ov.projects) || []).filter((p) => p.blockers > 0).length },
    noProjects() { return !this.loading && !this.err && !!this.ov && this.ov.projects.length === 0 },
  },
  methods: {
    dayText,
    sinceText,

    async load() {
      this.loading = true
      this.err = ''
      /* 记下本次请求的筛选词：用户边打字边发请求时，先发的可能后到，
       * 不比对就会把旧结果盖在新输入上（界面显示的项目与输入框不一致）。 */
      const asked = this.q.trim()
      try {
        const url = '/privhub/api/dashboard/overview' + (asked ? '?q=' + encodeURIComponent(asked) : '')
        const r = await api(url)
        if (asked !== this.q.trim()) return   // 已被更新的输入取代，丢弃这次回包
        if (r && r.ok) this.ov = r
        else this.err = (r && r.error) || '项目总览读取失败'
      } catch (e) {
        if (asked !== this.q.trim()) return
        this.err = (e && e.message) || '项目总览读取失败'
      } finally {
        if (asked === this.q.trim()) this.loading = false
      }
    },

    /* 输入即筛（防抖 300ms）：走服务端，所以能搜到首屏之外的项目。 */
    onFind(v) {
      this.q = v
      if (this._findTimer) clearTimeout(this._findTimer)
      this._findTimer = setTimeout(() => { this.load() }, 300)
    },

    /** 整卡可点 → 进项目（落地页由骨架的 PROJECT_LANDING 决定：项目看板优先）。 */
    openProject(p) {
      if (!p) return
      nav.openProject(p.project)
    },

    /** 我的文件：直接进本人目录的**文件视图**（不是看板 —— 那里没有任务）。 */
    openMyFiles() {
      if (this.personal && this.personal.dir) nav.openDir(this.personal.dir, '')
    },

    /** 我的任务：任务数据源在项目，这里把人送到第一个有自己待办的项目的任务看板。 */
    openMyTasks() {
      const list = (this.ov && this.ov.projects) || []
      const hit = list.find((p) => p.hasBoard && p.buckets.todo + p.buckets.doing + p.buckets.review > 0) || list[0]
      if (!hit) return
      nav.openProject(hit.project, { view: nav.hasBarView('taskboard') ? 'taskboard' : undefined })
    },

    /* 清除筛选要**重新取数**：q 是服务端筛的，只把输入框清空会让名单停在上次结果。 */
    clearFilters() {
      this.q = ''
      this.onlyBlocked = false
      if (this._findTimer) clearTimeout(this._findTimer)
      this.load()
    },

    newProject() { nav.newProject() },
    openAllProjects() { nav.backToWelcome() },

    pctText(p) { return p.percent === null ? '—' : p.percent + '%' },
    fillWidth(p) { return (p.percent === null ? 0 : p.percent) + '%' },
    healthText(p) {
      if (p.blockers > 0) return p.blockers + ' 个卡点'
      if (p.health === 'good') return '已全部完成'
      return p.hasBoard ? '推进中' : '未建任务'
    },
    healthClass(p) { return p.blockers > 0 ? 'warn' : (p.health === 'good' ? 'good' : 'normal') },
    /** 成员/任务数为 null 时显示「—」，绝不显示 0（那是两回事）。 */
    numText(v) { return v === null || v === undefined ? '—' : String(v) },
    dueText(p) {
      if (!p.dueAt) return ''
      const days = Math.ceil((p.dueAt - this.now) / DAY)
      if (days < 0) return '最近截止已逾期 ' + (-days) + ' 天'
      if (days === 0) return '最近截止就在今天'
      return '最近截止 ' + dayText(p.dueAt) + '（' + days + ' 天后）'
    },
  },
  async mounted() {
    await this.load()
    /* 本组件随「切到总览视图」挂载、离开即卸载，所以每次进来都是一次新快照 ——
     * 不挂全局事件监听：客户端总线上并没有服务端的 task:changed（那是 eventBus 的域事件），
     * 订一个永远不来的事件只会留下看着像生效、其实不刷新的死代码。
     * 只留一个分钟级计时器让「N 天前更新 / 还有几天到期」自己走字，卸载即清。 */
    this._timer = setInterval(() => { this.now = Date.now() }, 60000)
  },
  beforeUnmount() {
    if (this._timer) clearInterval(this._timer)
    /* 防抖计时器也要清：离开视图后它还会发一次请求并写已卸载组件的状态。 */
    if (this._findTimer) clearTimeout(this._findTimer)
  },
  template: `
    <section class="ov-root">
      <div class="ov-head">
        <span class="big">项目总览</span>
        <span class="sub" v-if="userName">{{ userName }} · 只统计你有权访问的项目</span>
        <span class="acts">
          <button class="btn" style="width:auto" :disabled="loading" @click="load">{{ loading ? '刷新中…' : '刷新' }}</button>
        </span>
      </div>
      <p class="ov-philosophy">以项目为中心：进度与卡点都来自项目的任务看板，个人视图是它的派生镜像。</p>

      <!-- 错误态：给出原因与重试，不留白屏 -->
      <div v-if="err" class="ov-state bad">
        {{ err }}
        <div><button class="btn btn-primary" @click="load">重试</button></div>
      </div>

      <!-- 加载态 -->
      <div v-else-if="loading && !ov" class="ov-state">正在汇总项目进度…</div>

      <!-- 空态：给下一步，不只是「暂无数据」 -->
      <div v-else-if="noProjects" class="ov-state">
        还没有你可访问的项目。
        <div>{{ isAdmin ? '先建一个项目，任务与文件都挂在项目下。' : '请联系管理员为你开通项目权限。' }}</div>
        <div><button v-if="isAdmin" class="btn btn-primary" @click="newProject">＋ 新建项目</button></div>
      </div>

      <template v-else-if="ov">
        <!-- ① KPI 行 -->
        <div class="ov-kpis">
          <div class="ov-kpi">
            <span class="k">可见项目</span>
            <span class="v">{{ totals.projects }}<span class="u">个</span></span>
            <span class="hint">{{ totals.withTasks }} 个已建任务</span>
          </div>
          <div class="ov-kpi" :class="totals.blockers > 0 ? 'bad' : 'ok'">
            <span class="k">卡点合计</span>
            <span class="v">{{ totals.blockers }}<span class="u">处</span></span>
            <span class="hint">{{ blockedCount }} 个项目需要处理</span>
          </div>
          <div class="ov-kpi">
            <span class="k">平均进度</span>
            <span class="v">{{ avgText }}<span class="u" v-if="avgText !== '—'">%</span></span>
            <span class="hint">按已建任务的项目取平均</span>
          </div>
          <div class="ov-kpi" :class="mine.open > 0 ? 'warn' : ''">
            <span class="k">我的待办</span>
            <span class="v">{{ tasksDisabled ? '—' : mine.open }}<span class="u" v-if="!tasksDisabled">项</span></span>
            <span class="hint">{{ tasksDisabled ? '任务功能已关闭' : '共指派 ' + mine.total + ' 项' }}</span>
          </div>
        </div>

        <!-- ② 管线聚合（只放聚合，不放明细） -->
        <div class="ov-panel">
          <div class="ov-panel-h">
            <span>📊 全局任务分布</span>
            <span class="note">{{ blockerHint }}</span>
          </div>
          <div class="ov-bar">
            <div v-if="pipelineEmpty" class="ov-bar-empty">
              {{ tasksDisabled ? '任务看板功能已关闭，无进度可聚合' : '还没有任务卡：进项目 → 任务看板 → 新建任务' }}
            </div>
            <div
              v-for="s in segments" :key="s.id"
              class="ov-seg" :class="s.id" :style="{ flexGrow: s.n }"
              :title="s.label + ' ' + s.n + ' 项（' + s.pct + '%）'"
            >{{ s.pct >= 9 ? s.n : '' }}</div>
          </div>
          <div class="ov-legend">
            <span v-for="b in legend" :key="b.id" class="ov-lg">
              <span class="sw" :class="b.id"></span>{{ b.label }}<span class="n">{{ b.n }}</span>
            </span>
            <span class="ov-lg total">合计 {{ totals.tasks }} 项 · 已完成 {{ totals.done }}</span>
          </div>
          <div v-if="ov.truncated" class="ov-trunc">
            项目数超过上限，只聚合了前 {{ totals.projects }} 个。其余项目请从左侧项目列表进入。
          </div>
        </div>

        <!-- ③ 项目卡片 -->
        <div class="ov-panel">
          <div class="ov-panel-h">
            <span>🗂️ 项目</span>
            <span class="note">
              <input
                class="ov-find" type="search" :value="q"
                placeholder="筛选项目名…"
                aria-label="在可见项目名中筛选"
                title="在你有权访问的全部项目名里查找（含首屏未显示的），不搜文件与任务正文"
                @input="onFind($event.target.value)"
              >
              <label class="ov-sort">排序
                <select class="ov-sel" :value="sortKey" @change="sortKey = $event.target.value">
                  <option v-for="s in sorts" :key="s.id" :value="s.id">{{ s.label }}</option>
                </select>
              </label>
              <button
                class="ov-chip" :class="{ on: onlyBlocked }" type="button"
                :aria-pressed="onlyBlocked ? 'true' : 'false'"
                @click="onlyBlocked = !onlyBlocked"
              >只看有卡点{{ onlyBlocked ? ' ✓' : '' }}</button>
            </span>
          </div>

          <div v-if="cards.length === 0" class="ov-state">
            {{ q ? '没有名字含「' + q + '」的可见项目。' : '没有当前带卡点的项目 —— 这是好事。' }}
            <div><button class="btn" @click="clearFilters">清除筛选</button></div>
          </div>

          <div v-else class="ov-cards">
            <button
              v-for="p in visibleCards" :key="p.project"
              class="ov-card" :class="healthClass(p)" type="button"
              :title="'进入项目 ' + p.project"
              @click="openProject(p)"
            >
              <span class="ov-card-h">
                <span class="name">{{ p.project }}</span>
                <span class="ov-pill" :class="healthClass(p)">{{ healthText(p) }}</span>
                <span class="go">→</span>
              </span>
              <span class="ov-prog">
                <span class="ov-track"><span class="ov-fill" :style="{ width: fillWidth(p) }"></span></span>
                <span class="pct">{{ pctText(p) }}</span>
              </span>
              <span class="ov-node" v-if="p.node"><span class="lbl">当前节点</span>{{ p.node }}</span>
              <span class="ov-node" v-else-if="!p.hasBoard"><span class="lbl">当前节点</span>未建任务，进度暂无</span>
              <span class="ov-meta">
                <span>任务 {{ p.doneCount }}/{{ p.total }}</span>
                <span>成员 {{ numText(p.members) }}</span>
                <span v-if="dueText(p)">{{ dueText(p) }}</span>
                <span v-else-if="sinceText(p.updatedAt)">{{ sinceText(p.updatedAt) }}</span>
              </span>
              <span class="ov-reasons" v-if="p.reasons.length">
                <span v-for="(r, i) in p.reasons.slice(0, 3)" :key="i" class="ov-reason">⚠ {{ r.text }}</span>
              </span>
            </button>
          </div>

          <div v-if="hiddenCount > 0" class="ov-state" style="padding:12px 0 0">
            <button class="btn" @click="expanded = true">显示其余 {{ hiddenCount }} 个项目</button>
          </div>
          <div v-else-if="expanded && cards.length > 8" class="ov-state" style="padding:12px 0 0">
            <button class="btn" @click="expanded = false">收起</button>
          </div>
        </div>

        <!-- ④ 我的（派生入口，单卡片） -->
        <div class="ov-panel">
          <div class="ov-panel-h"><span>🏠 我的</span><span class="note">任务与日程的唯一来源仍是项目</span></div>
          <div class="ov-mine">
            <div class="ov-mine-cell" v-if="personal">
              <span class="k">我的文件 · {{ personal.dir }}</span>
              <span class="v">{{ personal.entries }}<span class="u">个顶层条目</span></span>
              <div style="margin-top:8px"><button class="btn" style="width:auto" @click="openMyFiles">打开我的文件</button></div>
            </div>
            <div class="ov-mine-cell">
              <span class="k">我的任务</span>
              <span class="v">{{ tasksDisabled ? '—' : mine.open }}<span class="u">项未完成</span></span>
              <div style="margin-top:8px">
                <button class="btn" style="width:auto" :disabled="tasksDisabled || totals.projects === 0" @click="openMyTasks">去任务看板</button>
              </div>
            </div>
            <div class="ov-mine-cell">
              <span class="k">全部项目</span>
              <span class="v">{{ totals.projects }}<span class="u">个可见</span></span>
              <div style="margin-top:8px"><button class="btn" style="width:auto" @click="openAllProjects">从列表选择</button></div>
            </div>
          </div>
        </div>
      </template>
    </section>
  `,
}

export default Overview
export { BUCKETS, SORTS, BLOCKER_HINT }