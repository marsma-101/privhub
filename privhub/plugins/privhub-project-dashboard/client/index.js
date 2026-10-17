/**
 * privhub-project-dashboard · client — 项目看板（纵向分区页，挂 dashboard-view slot）
 *
 * 版式：自上而下的分区（section）；width=full 全宽 / half 半宽（两个相邻 half 并排）。
 * **布局与内容由 AI 智能体维护**（重写布局文档即可调整分区大小/顺序/内容），
 * 本界面只读展示，不提供拖拽编辑器 —— 这是「把看板控制权交给智能体」的直接体现。
 *
 * 数据：GET /privhub/api/dashboard?project=  →  { dashboard, facts, canEdit }
 *   facts = 服务端实时统计（文件数/成员/近 7 天变更…），stats 组件按 ref 引用它。
 * 渲染安全：Markdown 走「先整体转义、再套白名单标签」，**禁 HTML 直出**（智能体写的
 *   内容也是给人看的，必须防注入）；其余一律 Vue 文本插值。
 *
 * @module privhub-project-dashboard/client
 */

import './styles.js'

const { api, nav } = window.PrivHub

/* ============ 受限 Markdown → 安全 HTML ============ */

/** 先整体转义：此后只有我们主动拼出的标签是标签。 */
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 行内标记：`code` / **粗** / *斜* / [文字](链接)。输入须已转义。 */
function inlineMd(s) {
  return s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, url) => {
      const u = url.trim()
      // 只放行 http(s):// 与站内绝对路径；javascript:/data: 一律降级为纯文字
      if (!/^(https?:\/\/|\/)/i.test(u)) return text
      return '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + text + '</a>'
    })
}

/** 块级：# 标题 / > 引用 / - 列表 / 段落。 */
function mdToHtml(src) {
  const lines = String(src == null ? '' : src).replace(/\r\n/g, '\n').split('\n')
  let html = ''
  let inList = false
  const closeList = () => { if (inList) { html += '</ul>'; inList = false } }
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '')
    const mH = /^(#{1,3})\s+(.*)$/.exec(line)
    if (mH) {
      closeList()
      const n = mH[1].length + 2 // # → h3，避免与面板 h1/h2 抢层级
      html += '<h' + n + '>' + inlineMd(escapeHtml(mH[2])) + '</h' + n + '>'
      continue
    }
    const mQ = /^&gt;\s?(.*)$/.exec(escapeHtml(line))
    if (mQ) { closeList(); html += '<blockquote>' + inlineMd(mQ[1]) + '</blockquote>'; continue }
    const mL = /^[-*]\s+(.*)$/.exec(line)
    if (mL) { if (!inList) { html += '<ul>'; inList = true } html += '<li>' + inlineMd(escapeHtml(mL[1])) + '</li>'; continue }
    if (line.trim() === '') { closeList(); continue }
    closeList()
    html += '<p>' + inlineMd(escapeHtml(line)) + '</p>'
  }
  closeList()
  return html
}

/* ============ 组件 ============ */

const DashboardView = {
  name: 'dashboard-view',
  data() {
    return {
      projects: [],
      project: '',
      doc: null,
      facts: null,
      tasks: null,        // 任务进度（实时投影自任务看板）：null / {ok:true,…} / {ok:false,reason}
      agents: null,       // 智能体名册（实时投影自名册）：null / {ok:true,entries} / {ok:false,reason}
      canEditBoard: false,
      canEditRoster: false,
      loading: false,
      error: '',
      collapsed: {}, // sectionId → bool（本地折叠，不落盘）
      /* 名册条目编辑（人工补录 / 修改）—— null = 未在编辑 */
      agtForm: null,
      agtErr: '',
      agtSaving: false,
    }
  },
  computed: {
    hasBoard() { return !!(this.doc && Array.isArray(this.doc.sections) && this.doc.sections.length) },
  },
  mounted() { this.ensureLoaded() },
  methods: {
    async ensureLoaded() {
      let p = nav.project || ''
      if (!p) {
        await this.loadProjects()
        p = this.projects[0] || ''
      }
      await this.load(p)
    },
    async loadProjects() {
      const r = await api('/privhub/api/projects')
      if (r && r.ok) this.projects = r.projects || []
    },
    async load(project) {
      this.project = project || ''
      this.doc = null
      this.facts = null
      this.tasks = null
      this.agents = null
      this.agtForm = null
      this.agtErr = ''
      this.error = ''
      this.collapsed = {}
      if (!this.project) { this.loading = false; return }
      this.loading = true
      const r = await api('/privhub/api/dashboard?project=' + encodeURIComponent(this.project))
      this.loading = false
      if (!r || !r.ok) { this.error = (r && r.error) || '加载失败'; return }
      this.doc = r.dashboard
      this.facts = r.facts
      this.tasks = r.tasks || null
      this.agents = r.agents || null
      this.canEditBoard = !!r.canEdit
      this.canEditRoster = !!r.canEditRoster
    },
    async refresh() { await this.load(this.project) },
    async pick(p) {
      if (!p || p === this.project) return
      nav.openProject(p, { view: 'dashboard' }) // 同步顶栏项目选择：看板跟着当前项目走（原地不跳）
      await this.load(p)
    },
    isCollapsed(sec) {
      const k = sec.id || sec.title
      return this.collapsed[k] === undefined ? !!sec.collapsed : !!this.collapsed[k]
    },
    toggle(sec) {
      const k = sec.id || sec.title
      this.collapsed[k] = !this.isCollapsed(sec)
    },
    statValue(it) {
      const f = this.facts
      if (it.ref && f) {
        switch (it.ref) {
          case 'files': return String(f.files) + (f.truncated ? '+' : '')
          case 'dirs': return String(f.dirs)
          case 'bytesText': return f.bytesText
          case 'members': return String(f.members)
          case 'recent7d': return String(f.recent7d)
          case 'lastUpdated': return this.fmtTime(f.lastUpdated)
        }
      }
      return it.value != null && it.value !== '' ? String(it.value) : '—'
    },
    fmtTime(ms) {
      if (!ms) return '—'
      const d = new Date(ms)
      if (isNaN(d.getTime())) return '—'
      const p = (n) => String(n).padStart(2, '0')
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
    },
    stateIcon(st) {
      return ({ done: '✅', doing: '🔄', todo: '⏳', blocked: '⛔' })[st] || '⏳'
    },
    renderMd(src) { return mdToHtml(src) },

    /* ---------- tasks 组件（任务看板实时投影，只读） ---------- */

    /** 该组件要显示哪些列（w.columns 为空 = 全部列）；按列序返回。 */
    taskCols(w) {
      const t = this.tasks
      if (!t || !t.ok) return []
      const sel = Array.isArray(w.columns) ? w.columns : []
      if (!sel.length) return t.byColumn
      return t.byColumn.filter((c) => sel.includes(c.id) || sel.includes(c.title))
    },
    /** 卡片明细：按所选列过滤，排成看板顺序（列序→列内序），再按 w.limit 截断（缺省 30）。 */
    taskCards(w) {
      const t = this.tasks
      if (!t || !t.ok) return []
      const cols = this.taskCols(w)
      const idx = new Map(cols.map((c, i) => [c.id, i]))
      const lim = Number.isFinite(w.limit) && w.limit > 0 ? w.limit : 30
      return t.cards
        .filter((k) => idx.has(k.columnId))
        .sort((a, b) => (idx.get(a.columnId) - idx.get(b.columnId)) || ((a.order || 0) - (b.order || 0)))
        .slice(0, lim)
    },
    colTitle(id) {
      const t = this.tasks
      if (!t || !t.ok) return id
      const c = t.byColumn.find((x) => x.id === id)
      return c ? c.title : id
    },
    priorityLabel(p) {
      return ({ low: '低', normal: '普通', high: '高', urgent: '紧急' })[p] || '普通'
    },
    /** 跳到任务看板（保持当前项目 —— 两块板看的是同一个项目）。 */
    openTaskboard() {
      if (this.project) nav.openProject(this.project, { view: 'taskboard' })
      else nav.setActiveView('taskboard')
    },

    /* ---------- 智能体名册组件（读为主；有 roster.write 时可登记/编辑） ---------- */

    agtStatusLabel(st) {
      return ({ active: '在册', paused: '暂停', retired: '退役' })[st] || '在册'
    },
    /** 系统实证一句话（该项目里的战绩）。 */
    agtEvidence(e) {
      const v = e.evidence
      if (!v) return '（该项目实证暂不可读）'
      if (v.total === 0) return '本项目暂无战绩'
      return '本项目：已完成 ' + v.done + ' / 共 ' + v.total + ' 张' + (v.open ? '（在办 ' + v.open + '）' : '')
    },
    agtScopeText(e) {
      return e.scope === 'all' ? '服务全部项目' : ('仅服务：' + (e.projects.join('、') || '（未指定）'))
    },
    startNewAgent() {
      this.agtErr = ''
      this.agtForm = {
        id: '', name: '', kind: '', _skills: '', bio: '',
        scope: 'all', _projects: '', status: 'active', contact: '',
      }
    },
    startEditAgent(e) {
      this.agtErr = ''
      this.agtForm = {
        id: e.id, name: e.name, kind: e.kind, _skills: (e.skills || []).join('、'), bio: e.bio,
        scope: e.scope, _projects: (e.projects || []).join('、'), status: e.status, contact: e.contact,
      }
    },
    cancelAgent() { this.agtForm = null; this.agtErr = '' },
    /** 顿号/逗号/空白都当分隔符 —— 中文输入法下打「、」比逗号顺手。 */
    _splitList(s) {
      return String(s || '').split(/[,，、\s]+/).map((x) => x.trim()).filter(Boolean)
    },
    async saveAgent() {
      const f = this.agtForm
      if (!f || !f.name.trim()) { this.agtErr = '名称不能为空'; return }
      this.agtSaving = true
      this.agtErr = ''
      try {
        const body = {
          id: f.id || undefined,
          name: f.name.trim(),
          kind: f.kind,
          skills: this._splitList(f._skills),
          bio: f.bio,
          scope: f.scope,
          projects: f.scope === 'projects' ? this._splitList(f._projects) : [],
          status: f.status,
          contact: f.contact,
        }
        const r = await api('/privhub/api/roster', { method: 'POST', body: JSON.stringify(body) })
        if (!r || !r.ok) { this.agtErr = (r && r.error) || '保存失败'; return }
        this.agtForm = null
        await this.refresh()
      } finally { this.agtSaving = false }
    },
    async deleteAgent(e) {
      if (!confirm('从名册中删除智能体「' + e.name + '」？')) return
      const r = await api('/privhub/api/roster?id=' + encodeURIComponent(e.id), { method: 'DELETE' })
      if (!r || !r.ok) { this.agtErr = (r && r.error) || '删除失败'; return }
      await this.refresh()
    },
    fmtDate(ms) {
      if (!ms) return ''
      const d = new Date(ms)
      if (isNaN(d.getTime())) return ''
      const p = (n) => String(n).padStart(2, '0')
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
    },
  },
  template: `
    <div class="db-wrap">
      <div class="db-bar">
        <div class="db-title">
          <span class="db-ico">📈</span><span>项目看板</span>
          <select v-if="projects.length" class="db-sel" :value="project" @change="pick($event.target.value)" title="切换项目">
            <option v-for="p in projects" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
        <div class="db-actions">
          <span v-if="doc && doc.updatedAt" class="db-meta">
            更新 {{ fmtTime(doc.updatedAt) }}<template v-if="doc.updatedBy"> · {{ doc.updatedBy }}</template>
          </span>
          <button class="db-btn" @click="refresh" :disabled="loading">{{ loading ? '刷新中…' : '刷新' }}</button>
        </div>
      </div>

      <div v-if="!project" class="db-empty">请先在顶部选择一个项目 —— 每个项目都有一块看板。</div>
      <div v-else-if="error" class="db-err">加载失败：{{ error }}</div>
      <div v-else-if="loading && !hasBoard" class="db-empty">加载中…</div>
      <div v-else-if="!hasBoard" class="db-empty">该项目还没有看板内容。</div>

      <div v-else class="db-body ph-scroll">
        <header class="db-head">
          <h2 class="db-h2">{{ doc.title }}</h2>
          <p v-if="doc.subtitle" class="db-sub">{{ doc.subtitle }}</p>
        </header>

        <section v-for="sec in doc.sections" :key="sec.id" class="db-sec" :class="'w-' + sec.width">
          <div class="db-sec-head" @click="toggle(sec)">
            <span class="db-caret">{{ isCollapsed(sec) ? '▸' : '▾' }}</span>
            <span class="db-sec-title">{{ sec.title || '未命名分区' }}</span>
            <span class="db-sec-n">{{ sec.widgets.length }} 个组件</span>
          </div>
          <div v-show="!isCollapsed(sec)" class="db-sec-body">
            <div v-for="(w, wi) in sec.widgets" :key="wi" class="db-widget" :class="'wt-' + w.type">
              <div v-if="w.title" class="db-wtitle">{{ w.title }}</div>

              <div v-if="w.type === 'stats'" class="db-stats">
                <div v-for="(it, ii) in w.items" :key="ii" class="db-stat">
                  <div class="db-stat-v">{{ statValue(it) }}</div>
                  <div class="db-stat-l">{{ it.label }}<span v-if="it.hint" class="db-stat-h">{{ it.hint }}</span></div>
                </div>
                <div v-if="!w.items.length" class="db-muted">（无指标）</div>
              </div>

              <div v-else-if="w.type === 'plan'" class="db-plan">
                <div v-for="(it, ii) in w.items" :key="ii" class="db-plan-i" :class="'st-' + it.state">
                  <span class="db-plan-ico">{{ stateIcon(it.state) }}</span>
                  <span class="db-plan-t">{{ it.text }}<span v-if="it.note" class="db-plan-n">{{ it.note }}</span></span>
                </div>
                <div v-if="!w.items.length" class="db-muted">（计划待智能体填写）</div>
              </div>

              <div v-else-if="w.type === 'tasks'" class="db-tasks">
                <template v-if="tasks && tasks.ok">
                  <div class="db-tprog">
                    <div class="db-tprog-top">
                      <span class="db-tprog-n">{{ tasks.doneCount }} / {{ tasks.total }} 已完成</span>
                      <span class="db-tprog-p">{{ tasks.donePercent }}%</span>
                    </div>
                    <div class="db-tprog-bar"><i :style="{ width: tasks.donePercent + '%' }"></i></div>
                  </div>
                  <div class="db-tcols">
                    <span v-for="c in taskCols(w)" :key="c.id" class="db-tcol">
                      {{ c.title }} <b>{{ c.count }}</b>
                    </span>
                  </div>
                  <div v-if="w.showCards !== false" class="db-tcards">
                    <div v-for="k in taskCards(w)" :key="k.id" class="db-tcard" @click="openTaskboard" :title="k.title">
                      <span class="db-tcard-dot" :class="'p-' + k.priority"></span>
                      <span class="db-tcard-t">{{ k.title }}</span>
                      <span class="db-tcard-meta">
                        <span class="db-tcard-col">{{ colTitle(k.columnId) }}</span>
                        <span v-if="k.assignee">· {{ k.assignee }}</span>
                        <span v-if="k.dueDate">· {{ fmtDate(k.dueDate) }}</span>
                      </span>
                    </div>
                    <div v-if="!taskCards(w).length" class="db-muted">（这些列暂无任务）</div>
                    <div v-if="tasks.cardsTruncated" class="db-muted">仅显示前 {{ tasks.cards.length }} 张卡片</div>
                  </div>
                </template>
                <div v-else class="db-muted">{{ (tasks && tasks.reason) || '任务看板暂不可用' }}</div>
                <div class="db-tfoot">
                  <span class="db-muted">实时取自「任务看板」</span>
                  <button class="db-btn db-btn-sm" @click="openTaskboard">在任务看板中打开</button>
                </div>
              </div>

              <div v-else-if="w.type === 'agents'" class="db-agents">
                <!-- 编辑 / 新建条目（需 roster.write） -->
                <div v-if="agtForm" class="db-agt-form">
                  <div class="db-agt-row">
                    <div><label>名称（任务卡指派人用这个名字）</label>
                      <input v-model="agtForm.name" maxlength="60" placeholder="如：小析" /></div>
                    <div><label>类型 / 厂商</label>
                      <input v-model="agtForm.kind" maxlength="40" placeholder="如：Claude Code" /></div>
                  </div>
                  <div><label>擅长（顿号或逗号分隔）</label>
                    <input v-model="agtForm._skills" placeholder="如：文档整理、数据分析" /></div>
                  <div><label>自述：以前干过什么</label>
                    <textarea v-model="agtForm.bio" rows="3" placeholder="自由描述。系统会另附「它在本项目实际完成过的任务」作为实证。"></textarea></div>
                  <div class="db-agt-row">
                    <div><label>服务范围</label>
                      <select v-model="agtForm.scope">
                        <option value="all">全部项目</option>
                        <option value="projects">仅指定项目</option>
                      </select></div>
                    <div><label>状态</label>
                      <select v-model="agtForm.status">
                        <option value="active">在册</option>
                        <option value="paused">暂停（暂不派活）</option>
                        <option value="retired">退役（不再出现在候选）</option>
                      </select></div>
                  </div>
                  <div v-if="agtForm.scope === 'projects'"><label>服务的项目（顿号或逗号分隔，须是你看得见的项目）</label>
                    <input v-model="agtForm._projects" :placeholder="project" /></div>
                  <div><label>联系方式（可选）</label>
                    <input v-model="agtForm.contact" maxlength="120" /></div>
                  <div v-if="agtErr" class="db-agt-err">{{ agtErr }}</div>
                  <div class="db-agt-acts">
                    <button class="db-btn db-btn-sm" @click="saveAgent" :disabled="agtSaving || !agtForm.name.trim()">{{ agtSaving ? '保存中…' : '保存' }}</button>
                    <button class="db-btn db-btn-sm" @click="cancelAgent">取消</button>
                  </div>
                </div>

                <template v-if="agents && agents.ok">
                  <div v-for="a in agents.entries" :key="a.id" class="db-agt">
                    <div class="db-agt-head">
                      <span class="db-agt-name">🤖 {{ a.name }}</span>
                      <span v-if="a.kind" class="db-agt-kind">{{ a.kind }}</span>
                      <span class="db-agt-status" :class="'st-' + a.status">{{ agtStatusLabel(a.status) }}</span>
                    </div>
                    <div v-if="a.skills && a.skills.length" class="db-agt-skills">
                      <span v-for="(s, si) in a.skills" :key="si" class="db-agt-skill">{{ s }}</span>
                    </div>
                    <div v-if="a.bio" class="db-agt-bio">{{ a.bio }}</div>
                    <div class="db-agt-line">📊 {{ agtEvidence(a) }}</div>
                    <div class="db-agt-line">🎯 {{ agtScopeText(a) }}<template v-if="a.source === 'agent'"> · 自主登记</template></div>
                    <div v-if="canEditRoster" class="db-agt-acts">
                      <button class="db-btn db-btn-sm" @click="startEditAgent(a)">编辑</button>
                      <button class="db-btn db-btn-sm" @click="deleteAgent(a)">删除</button>
                    </div>
                  </div>
                  <div v-if="!agents.entries.length" class="db-muted">还没有智能体登记到本项目。智能体可调 POST /privhub/api/agent/v1/roster 自助登记（写明擅长与经历）。</div>
                </template>
                <div v-else class="db-muted">{{ (agents && agents.reason) || '智能体名册暂不可用' }}</div>
                <div class="db-tfoot">
                  <span class="db-muted">登记 / 自述 + 系统实证（实时算自任务看板）</span>
                  <button v-if="canEditRoster && !agtForm" class="db-btn db-btn-sm" @click="startNewAgent">＋ 登记智能体</button>
                </div>
              </div>

              <div v-else class="db-md" v-html="renderMd(w.text)"></div>
            </div>
            <div v-if="!sec.widgets.length" class="db-muted">（该分区暂无内容）</div>
          </div>
        </section>
      </div>

      <!-- 页脚钉在滚动视口之外（在 .db-wrap 底部），内容再长也不随滚动消失 -->
      <footer v-if="project && !error && hasBoard" class="db-foot">
        <span v-if="facts && facts.truncated">统计为部分结果（项目较大，已达扫描上限）</span>
        <span v-if="canEditBoard" class="db-foot-edit">你有编辑权限：可通过接口重写此看板（本界面只读展示，布局由 AI 智能体维护）。</span>
      </footer>
    </div>
  `,
}

export default {
  id: 'privhub-project-dashboard',
  slots: { 'dashboard-view': DashboardView },
}
