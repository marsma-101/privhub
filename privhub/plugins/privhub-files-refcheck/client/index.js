/**
 * privhub-files-refcheck · 客户端 —— 「引用检查」整页视图（refcheck-view）
 *
 * 只读页：把服务端扫出的两类问题铺成两张表，并给出 CSV 导出。
 * **界面上没有任何删除入口**（用户已拍板：只报告；删除永远另走人工确认），
 * 页脚也把这句话明说给用户，避免「看到清单以为是清理按钮」。
 *
 * 不自动扫描：生产项目动辄几万文件，进页面就狂读磁盘是不礼貌的
 * （服务端有缓存，但首次扫描的代价仍然真实存在）—— 由用户点「开始扫描」触发。
 *
 * 表格渲染上限 300 行（服务端最多回 5000 条）：几千行的 DOM 会卡浏览器，
 * 超出的部分提示走 CSV —— 导出走的是服务端**全量**清单，不是这 300 行。
 *
 * @module privhub-files-refcheck/client
 */

import './styles.js'

const { api, nav, toast, AUTH } = window.PrivHub

/** 表格最多渲染多少行（超出提示用 CSV） */
const ROW_CAP = 300

const RefCheckView = {
  name: 'refcheck-view',
  template: `
    <div class="rc-wrap">
      <div class="rc-bar">
        <span class="rc-title">🔗 引用检查</span>
        <span class="rc-label">范围</span>
        <select class="rc-sel" v-model="project" :disabled="all || loading">
          <option v-for="p in projects" :key="p" :value="p">{{ p }}</option>
        </select>
        <label class="rc-check">
          <input type="checkbox" v-model="all" :disabled="loading" />
          <span>全部项目</span>
        </label>
        <button class="rc-btn rc-primary" :disabled="loading || (!all && !project)" @click="scan(true)">
          {{ loading ? '扫描中…' : '开始扫描' }}
        </button>
        <span class="rc-right">
          <button class="rc-btn" :disabled="!report || loading" @click="exportCsv('orphans')">导出孤儿 CSV</button>
          <button class="rc-btn" :disabled="!report || loading" @click="exportCsv('dangling')">导出断链 CSV</button>
        </span>
      </div>

      <div v-if="error" class="rc-err">{{ error }}</div>

      <div v-else-if="!report" class="rc-hint">
        <p>点「开始扫描」，一次列出两类问题：</p>
        <ul>
          <li><b>孤儿附件</b> —— 文件躺在项目里，但没有任何文档或任务卡引用它（多半是旧版本残留、传错目录、改名后遗留）。</li>
          <li><b>断链引用</b> —— 文档或任务卡里写着引用，但目标已经不存在（被删、被改名，或路径写错）。</li>
        </ul>
        <p class="rc-muted">大项目首次扫描需要把项目里全部 Markdown 读一遍，可能要几十秒；结果会缓存 5 分钟，期间重复打开是秒回的。</p>
        <p class="rc-muted">只统计 Markdown 文档（<code>.md</code>）里写的引用，以及任务卡的文件关联；带 <code>http:</code> 的外链不参与统计。</p>
      </div>

      <div v-else class="rc-body ph-scroll">
        <div class="rc-stats">
          <span class="rc-chip">文件 <b>{{ report.totals.files }}</b></span>
          <span class="rc-chip">目录 <b>{{ report.totals.dirs }}</b></span>
          <span class="rc-chip">文档 <b>{{ report.totals.docs }}</b></span>
          <span class="rc-chip">引用 <b>{{ report.totals.refs }}</b></span>
          <span class="rc-chip rc-chip-bad">孤儿 <b>{{ report.orphanTotal }}</b></span>
          <span class="rc-chip rc-chip-bad">断链 <b>{{ report.danglingTotal }}</b></span>
          <span v-if="report.suppressed" class="rc-chip" title="因文件级权限不可见而被抑制的断链（不显示名字）">抑制 <b>{{ report.suppressed }}</b></span>
          <span v-if="report.totals.skippedLarge" class="rc-chip" title="超过单文件解析上限，未解析">超大未解析 <b>{{ report.totals.skippedLarge }}</b></span>
          <span class="rc-chip rc-chip-dim">{{ scopeText }}</span>
          <span class="rc-chip rc-chip-dim">耗时 {{ report.durationMs }} ms</span>
          <span class="rc-chip rc-chip-dim">扫描于 {{ fmtTime(report.scannedAt) }}</span>
        </div>

        <div v-if="report.truncated" class="rc-warn">⚠ {{ report.truncatedReason }}</div>
        <div v-if="report.totals.hiddenFiles" class="rc-muted rc-suppress">
          有 {{ report.totals.hiddenFiles }} 个文件因文件级权限对你不可见，已整体排除（既不算孤儿，也不会作为断链目标出现）。
        </div>

        <div class="rc-tabs">
          <button class="rc-tab" :class="{ on: tab === 'orphans' }" @click="tab = 'orphans'">孤儿附件 ({{ report.orphanTotal }})</button>
          <button class="rc-tab" :class="{ on: tab === 'dangling' }" @click="tab = 'dangling'">断链引用 ({{ report.danglingTotal }})</button>
          <input class="rc-filter" v-model="q" placeholder="过滤路径 / 文件名…" />
        </div>

        <div v-if="tab === 'orphans'" class="rc-tablewrap">
          <table class="rc-table">
            <thead>
              <tr>
                <th>路径</th>
                <th class="rc-num-col">体积</th>
                <th class="rc-num-col">修改时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="o in shownOrphans" :key="o.project + '/' + o.path">
                <td class="rc-path" :title="o.path" @click="openPath(o.project, o.path)">
                  <span v-if="all" class="rc-proj">{{ o.project }}</span>{{ o.path }}
                </td>
                <td class="rc-num-col">{{ o.sizeText }}</td>
                <td class="rc-num-col rc-dim">{{ fmtIso(o.mtime) }}</td>
              </tr>
              <tr v-if="shownOrphans.length === 0">
                <td colspan="3" class="rc-empty">{{ q ? '没有匹配的行' : '没有孤儿附件 🎉' }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="moreOrphans" class="rc-more">还有 {{ moreOrphans }} 行未显示（表格最多渲染 {{ rowCap }} 行）——请用「导出孤儿 CSV」拿全量清单。</div>
        </div>

        <div v-else class="rc-tablewrap">
          <table class="rc-table">
            <thead>
              <tr>
                <th>来源</th>
                <th>引用目标</th>
                <th class="rc-num-col">位置</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in shownDangling" :key="d.project + '|' + d.source + '|' + d.target + '|' + d.line">
                <td class="rc-path" :title="d.source" @click="openDangling(d)">
                  <span v-if="all" class="rc-proj">{{ d.project }}</span>{{ d.source }}
                </td>
                <td class="rc-target" :title="d.target">{{ d.target }}</td>
                <td class="rc-num-col rc-dim">{{ d.line > 0 ? '第 ' + d.line + ' 行' : '任务卡' }}</td>
              </tr>
              <tr v-if="shownDangling.length === 0">
                <td colspan="3" class="rc-empty">{{ q ? '没有匹配的行' : '没有断链引用 🎉' }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="moreDangling" class="rc-more">还有 {{ moreDangling }} 行未显示 —— 请用「导出断链 CSV」拿全量清单。</div>
        </div>
      </div>

      <!-- 页脚钉在滚动视口之外（.rc-wrap 底部），结果表再长也不随滚动消失 -->
      <div v-if="report && !error" class="rc-foot">本页只报告，不会删除或改动任何文件。删除请在文件视图中人工确认后执行。</div>
    </div>
  `,

  data() {
    return {
      projects: [],
      project: '',
      all: false,
      loading: false,
      error: '',
      report: null,
      tab: 'orphans',
      q: '',
      rowCap: ROW_CAP,
    }
  },

  computed: {
    scopeText() {
      if (!this.report) return ''
      return this.report.scope === 'all' ? '全部项目（' + this.report.projects.length + ' 个）' : this.project
    },
    filteredOrphans() {
      const list = this.report ? this.report.orphans : []
      const q = this.q.trim().toLowerCase()
      if (!q) return list
      return list.filter((o) => (o.path + ' ' + o.project).toLowerCase().includes(q))
    },
    filteredDangling() {
      const list = this.report ? this.report.dangling : []
      const q = this.q.trim().toLowerCase()
      if (!q) return list
      return list.filter((d) => (d.source + ' ' + d.target).toLowerCase().includes(q))
    },
    shownOrphans() { return this.filteredOrphans.slice(0, ROW_CAP) },
    shownDangling() { return this.filteredDangling.slice(0, ROW_CAP) },
    moreOrphans() { return Math.max(0, this.filteredOrphans.length - ROW_CAP) },
    moreDangling() { return Math.max(0, this.filteredDangling.length - ROW_CAP) },
  },

  methods: {
    /** 首次进入：拉项目列表，默认选中当前正在浏览的项目（少点一次下拉）。 */
    async ensureLoaded() {
      if (this.projects.length > 0) return
      const r = await api('/privhub/api/projects')
      if (r && r.ok) {
        this.projects = r.projects || []
        const cur = nav.project
        this.project = this.projects.includes(cur) ? cur : (this.projects[0] || '')
      }
    },

    async scan(force) {
      if (this.loading) return
      if (!this.all && !this.project) { this.error = '请先选择一个项目'; return }
      this.loading = true
      this.error = ''
      try {
        let url = '/privhub/api/refcheck?'
        url += this.all ? 'all=1' : 'project=' + encodeURIComponent(this.project)
        if (force) url += '&refresh=1'
        const r = await api(url)
        if (r && r.ok) {
          this.report = r.report
          this.tab = (r.report.orphanTotal > 0 || r.report.danglingTotal === 0) ? 'orphans' : 'dangling'
        } else {
          this.error = (r && r.error) || '扫描失败'
        }
      } catch (e) {
        this.error = '扫描失败：' + (e && e.message ? e.message : e)
      } finally {
        this.loading = false
      }
    },

    async exportCsv(kind) {
      let url = '/privhub/api/refcheck/export?kind=' + kind
      url += this.all ? '&all=1' : '&project=' + encodeURIComponent(this.project)
      try {
        const r = await fetch(url, { headers: { authorization: 'Bearer ' + (AUTH && AUTH.token ? AUTH.token : '') } })
        if (!r.ok) { toast('导出失败', 'error'); return }
        const blob = await r.blob()
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = 'refcheck-' + kind + '-' + new Date().toISOString().slice(0, 10) + '.csv'
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(a.href), 5000)
      } catch (e) {
        toast('导出失败', 'error')
      }
    },

    /** 定位到一个文件：跳到文件视图的所在目录并选中它（选中即出右侧预览）。 */
    async openPath(project, path) {
      if (!project || !path) return
      const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
      const name = path.includes('/') ? path.slice(path.lastIndexOf('/') + 1) : path
      nav.setActiveView('files')
      await nav.openDir(project, dir)
      const e = (nav.entries || []).find((x) => x.name === name)
      if (e) await nav.selectEntry(e)
      else toast('已定位到目录：' + (dir === '' ? project : dir), 'info')
    },

    openDangling(d) {
      if (d.kind === 'task') {
        toast('来源是任务卡，请到「任务看板」里搜索：' + d.source, 'info')
        return
      }
      void this.openPath(d.project, d.source)
    },

    fmtTime(ms) {
      if (!ms) return '—'
      const d = new Date(ms)
      const p = (n) => (n < 10 ? '0' + n : String(n))
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
    },

    fmtIso(iso) { return this.fmtTime(Date.parse(iso)) },
  },

  async mounted() { await this.ensureLoaded() },
}

export default {
  id: 'privhub-files-refcheck',
  slots: { 'refcheck-view': RefCheckView },
}
