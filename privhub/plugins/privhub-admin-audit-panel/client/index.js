/**
 * privhub-admin-audit-panel · client — 审计日志可视化（挂 audit slot，模态形态）
 *
 * 管理员流程：图标栏「审计」→ 时间线列表（倒序）+ 四维筛选
 * （时间范围 / 操作类型 / 用户 / 项目）+ CSV 导出 + 实时刷新。
 *
 * 数据来源（F13 提供，adminOnly）：
 *   GET /privhub/api/audit?user=&action=&project=&from=&to=&limit=
 *   GET /privhub/api/audit/export（下载 CSV）
 *   GET /privhub/api/audit/recent（近 50 条环形缓冲，10s 轮询实现实时刷新）
 *
 * 实时刷新闭环：写操作（files/trash/admin/auth）→ ctx.audit.log + emit
 * 'audit:logged'（步骤1 埋点）→ F13 监听维护环形缓冲 → 本面板轮询 recent。
 *
 * @module privhub-admin-audit-panel/client
 */

const { api, AUTH } = window.PrivHub

/* 操作类型 → 中文标签 */
const ACTION_LABELS = {
  login: '登录', logout: '退出登录', register: '注册',
  upload: '上传', mkdir: '新建文件夹', delete: '删除', rename: '重命名', move: '移动',
  restore: '恢复', purge: '彻底删除', clean: '清理回收站',
  'project-create': '新建项目', 'project-delete': '删除项目',
  'user-update': '修改用户', 'user-delete': '删除用户', 'user-reset-password': '重置密码',
}
const ACTIONS = Object.keys(ACTION_LABELS)

const AuditPanel = {
  name: 'audit-panel',
  data() {
    return {
      // 筛选
      fUser: '',
      fAction: '',
      fProject: '',
      fFrom: '',
      fTo: '',
      // 列表
      entries: [],
      total: 0,
      page: 1,
      pageSize: 50,
      loading: false,
      lastRefresh: null,
      refreshMsg: '',
      // 项目下拉
      projects: [],
    }
  },
  computed: {
    isAdmin() { const u = AUTH.user; return u && u.role === 'admin' },
    pages() { return Math.max(1, Math.ceil(this.total / this.pageSize)) },
  },
  methods: {
    actionLabel(a) { return ACTION_LABELS[a] || a },
    fmtTime(at) {
      const d = new Date(at)
      const p = (n) => String(n).padStart(2, '0')
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
    },
    filterParams(extra) {
      const q = new URLSearchParams()
      if (this.fUser.trim()) q.set('user', this.fUser.trim())
      if (this.fAction) q.set('action', this.fAction)
      if (this.fProject.trim()) q.set('project', this.fProject.trim())
      if (this.fFrom) q.set('from', String(new Date(this.fFrom + 'T00:00:00').getTime()))
      if (this.fTo) q.set('to', String(new Date(this.fTo + 'T23:59:59').getTime()))
      return q
    },
    async load() {
      this.loading = true
      try {
        const q = this.filterParams()
        q.set('limit', String(this.pageSize * this.pages))
        const r = await api('/privhub/api/audit?' + q.toString())
        if (r.ok) {
          this.entries = r.entries
          this.total = r.entries.length
          this.lastRefresh = Date.now()
        } else {
          this.refreshMsg = r.error || '加载失败'
        }
      } finally { this.loading = false }
    },
    async applyFilter() {
      this.page = 1
      await this.load()
    },
    async refresh() {
      // 实时刷新：拉取环形缓冲，把新条目合并到列表头部（不重置筛选/分页）
      const r = await api('/privhub/api/audit/recent')
      if (r.ok && r.entries.length) {
        const known = new Set(this.entries.map((e) => e.id))
        const fresh = r.entries.filter((e) => !known.has(e.id))
        if (fresh.length) {
          this.entries = [...fresh, ...this.entries].slice(0, this.pageSize * this.pages)
          this.total += fresh.length
          this.refreshMsg = '🔄 新增 ' + fresh.length + ' 条'
        } else {
          this.refreshMsg = '✅ 已是最新'
        }
        this.lastRefresh = Date.now()
      }
    },
    async exportCsv() {
      const q = this.filterParams()
      // 复用 api 的鉴权头；blob 触发下载（RFC 5987 文件名由服务端下发）
      const token = window.PrivHub.AUTH.token || ''
      const r = await fetch('/privhub/api/audit/export?' + q.toString(), { headers: { authorization: 'Bearer ' + token } })
      if (!r.ok) { window.PrivHub.toast('导出失败', 'error'); return }
      const blob = await r.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'audit-' + new Date().toISOString().slice(0, 10) + '.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(a.href), 5000)
    },
  },
  async mounted() {
    await this.load()
    const pr = await api('/privhub/api/projects')
    if (pr.ok) this.projects = pr.projects
    // 10s 轮询实时刷新（组件卸载时清除，零残留）
    this._timer = setInterval(() => { void this.refresh() }, 10000)
  },
  beforeUnmount() { if (this._timer) clearInterval(this._timer) },
  template: `
    <div class="drawer-mask" @click.self="$emit('close')">
      <div class="drawer">
        <h2>📋 审计日志</h2>
        <div class="modal-body">
          <!-- 筛选条：时间 / 操作 / 用户 / 项目 -->
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px">
            <input v-model="fFrom" type="date" style="padding:7px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text)" />
            <span style="color:var(--muted)">~</span>
            <input v-model="fTo" type="date" style="padding:7px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text)" />
            <select v-model="fAction" style="padding:7px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text)">
              <option value="">全部操作</option>
              <option v-for="a in ['login','logout','register','upload','mkdir','delete','rename','move','restore','purge','clean','project-create','project-delete','user-update','user-delete','user-reset-password']" :key="a" :value="a">{{ actionLabel(a) }}</option>
            </select>
            <input v-model="fUser" placeholder="操作者用户名" style="padding:7px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text);width:130px" />
            <select v-model="fProject" style="padding:7px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text)">
              <option value="">全部项目</option>
              <option v-for="p in projects" :key="p" :value="p">{{ p }}</option>
            </select>
            <button class="btn btn-primary" style="width:auto" @click="applyFilter">筛 选</button>
            <button class="small-btn" @click="exportCsv">⬇ 导出 CSV</button>
            <span style="font-size:12px;color:var(--muted)">{{ refreshMsg }}</span>
          </div>

          <!-- 列表 -->
          <div class="file-table-wrap" style="max-height:420px;overflow:auto">
            <div class="file-table-head" style="grid-template-columns:150px 110px 110px 1fr 200px">
              <span>时间</span><span>用户</span><span>操作</span><span>目标</span><span>详情</span>
            </div>
            <div v-if="entries.length === 0" class="empty" style="padding:24px">暂无审计记录</div>
            <div v-for="e in entries" :key="e.id" class="file-table-row" style="grid-template-columns:150px 110px 110px 1fr 200px;cursor:default">
              <span class="col-time">{{ fmtTime(e.at) }}</span>
              <span class="col-type">{{ e.user }}</span>
              <span class="col-type"><span :class="e.action === 'login' || e.action === 'logout' || e.action === 'register' ? '' : ''">{{ actionLabel(e.action) }}</span></span>
              <span class="col-name" :title="e.target">{{ e.target || '—' }}</span>
              <span class="col-time" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" :title="e.detail">{{ e.detail || '' }}</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;margin-top:8px;font-size:13px;color:var(--muted)">
            <span>共 {{ total }} 条（最近 {{ pageSize * pages }} 条窗口，60 天保留）</span>
            <span style="flex:1"></span>
            <button class="small-btn" :disabled="loading" @click="load">🔄 手动刷新</button>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="$emit('close')">关 闭</button>
        </div>
      </div>
    </div>
  `,
}

export default {
  id: 'privhub-admin-audit-panel',
  drawerWidth: 640,
  slots: {
    audit: AuditPanel,
  },
}
