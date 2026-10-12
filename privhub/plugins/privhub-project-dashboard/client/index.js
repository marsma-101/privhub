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
      canEditBoard: false,
      loading: false,
      error: '',
      collapsed: {}, // sectionId → bool（本地折叠，不落盘）
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
      this.error = ''
      this.collapsed = {}
      if (!this.project) { this.loading = false; return }
      this.loading = true
      const r = await api('/privhub/api/dashboard?project=' + encodeURIComponent(this.project))
      this.loading = false
      if (!r || !r.ok) { this.error = (r && r.error) || '加载失败'; return }
      this.doc = r.dashboard
      this.facts = r.facts
      this.canEditBoard = !!r.canEdit
    },
    async refresh() { await this.load(this.project) },
    async pick(p) {
      if (!p || p === this.project) return
      nav.openProject(p) // 同步顶栏项目选择：看板跟着当前项目走
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

      <div v-else class="db-body">
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

              <div v-else class="db-md" v-html="renderMd(w.text)"></div>
            </div>
            <div v-if="!sec.widgets.length" class="db-muted">（该分区暂无内容）</div>
          </div>
        </section>

        <footer class="db-foot">
          <span v-if="facts && facts.truncated">统计为部分结果（项目较大，已达扫描上限）</span>
          <span v-if="canEditBoard" class="db-foot-edit">你有编辑权限：可通过接口重写此看板（本界面只读展示，布局由 AI 智能体维护）。</span>
        </footer>
      </div>
    </div>
  `,
}

export default {
  id: 'privhub-project-dashboard',
  slots: { 'dashboard-view': DashboardView },
}
