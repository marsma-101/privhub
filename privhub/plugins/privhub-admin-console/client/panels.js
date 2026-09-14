/**
 * panels — 由管理控制台【自己渲染】的管理页。
 *
 * 为什么要有这几个页面：侧栏里「项目权限 / 发布链接 / 自动备份 / 水印配置」
 * 在骨架里原本没有管理入口（发布链接只藏在文件详情面板的弹窗里）。
 * 需求禁止改后端，因此这里只用【已有接口】组装，不新增任何 API。
 * 接口不可用 / 权限不足时显示局部错误或空状态，不影响其它管理页。
 *
 * 依赖的既有接口（全部已存在，本文件不新增、不修改后端）：
 *   GET    /privhub/api/admin/users           用户与项目清单
 *   GET    /privhub/api/projects              项目列表
 *   GET    /privhub/api/acl/rules             ACL 规则
 *   GET    /privhub/api/audit                 审计日志
 *   GET    /privhub/api/trash-list            回收站
 *   GET    /privhub/api/publish/list          发布链接
 *   DELETE /privhub/api/publish?code=         撤销发布
 *   GET    /privhub/api/gitbackup/status      备份可用性
 *   POST   /privhub/api/gitbackup/commit      立即备份
 *   GET    /privhub/api/watermark             水印当前状态
 *
 * @module privhub-admin-console/client/panels
 */

import { api } from './deps.js'
import { adminState } from './store.js'
import { adminToast } from './toast.js'
import { confirmAction } from './confirm.js'
import { openAdminRoute } from './panelbus.js'
import {
  AdminSkeleton, AdminErrorState, AdminEmptyState, AdminDataTable,
  AdminListDetail, AdminBulkBar,
} from './ui.js'

/** 统一取数：失败不抛，返回 { ok, data, error }，页面据此渲染局部错误。 */
async function get(path) {
  try {
    const r = await api(path)
    if (r && r.ok) return { ok: true, data: r }
    return { ok: false, error: (r && r.error) || '接口返回失败' }
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) }
  }
}

async function send(path, opts) {
  try {
    const r = await api(path, opts)
    if (r && r.ok) return { ok: true, data: r }
    return { ok: false, error: (r && r.error) || '操作失败' }
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) }
  }
}

/** 简易时间显示（列表里的「最近更新」）。 */
function relTime(ts) {
  const n = Number(ts)
  if (!n) return '—'
  const d = new Date(n)
  const p = (x) => String(x).padStart(2, '0')
  const diff = Date.now() - n
  if (diff >= 0 && diff < 24 * 3600 * 1000) {
    const m = Math.floor(diff / 60000)
    if (m < 1) return '刚刚'
    if (m < 60) return m + ' 分钟前'
    return Math.floor(m / 60) + ' 小时前'
  }
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
}

/** 取数组长度；接口失败返回 null（显示「—」而不是假装 0）。 */
function countOf(res, pick) {
  if (!res.ok) return null
  const v = pick(res.data)
  return Array.isArray(v) ? v.length : null
}

/* ==================== 概览 ==================== */
const OverviewPanel = {
  name: 'admin-overview',
  components: { AdminSkeleton, AdminErrorState },
  data() {
    return { loading: true, error: '', cards: [] }
  },
  methods: {
    open(key) { openAdminRoute(key) },
    async load() {
      this.loading = true
      this.error = ''
      const [users, projects, rules, audit, trash] = await Promise.all([
        get('/privhub/api/admin/users'),
        get('/privhub/api/projects'),
        get('/privhub/api/acl/rules'),
        get('/privhub/api/audit'),
        get('/privhub/api/trash-list'),
      ])
      this.cards = [
        { key: 'access/users', icon: '👥', label: '用户', value: countOf(users, (d) => d.users), hint: '含管理员与普通用户' },
        { key: 'access/projects', icon: '📁', label: '项目', value: countOf(projects, (d) => d.projects), hint: '当前可访问的项目' },
        { key: 'access/acl', icon: '🔒', label: 'ACL 规则', value: countOf(rules, (d) => d.rules), hint: '文件 / 目录级访问规则' },
        { key: 'ops/audit', icon: '🧾', label: '审计记录', value: countOf(audit, (d) => d.entries || d.logs || d.audit), hint: '可追溯的操作记录' },
        { key: 'content/trash', icon: '🗑️', label: '回收站', value: countOf(trash, (d) => d.trash), hint: '待恢复或清理的条目' },
      ]
      const allFail = [users, projects, rules, audit, trash].every((r) => !r.ok)
      this.error = allFail ? '管理数据读取失败：可能未登录、权限不足或接口不可用' : ''
      this.loading = false
    },
  },
  mounted() { void this.load() },
  template: `
    <div class="ad-panel">
      <AdminSkeleton v-if="loading" variant="grid" :rows="5"></AdminSkeleton>
      <AdminErrorState v-else-if="error" :message="error" @retry="load"></AdminErrorState>
      <template v-else>
        <div class="ad-cards">
          <div v-for="c in cards" :key="c.key" class="ad-card ad-card-clickable" :title="'前往：' + c.label" @click="open(c.key)">
            <div class="ad-card-top"><span class="ad-card-icon">{{ c.icon }}</span><span class="ad-card-label">{{ c.label }}</span></div>
            <div class="ad-card-value">{{ c.value === null ? '—' : c.value }}</div>
            <div class="ad-card-hint">{{ c.hint }}</div>
          </div>
        </div>
        <div class="ad-hint-block">
          左侧导航按<strong>管理员职责</strong>分区：用户与权限、内容治理、系统运维。
          点击卡片可直接跳转到对应管理页。本阶段各页内部仍沿用既有界面，后续再逐页优化。
        </div>
      </template>
    </div>
  `,
}

/* ==================== 项目权限（用户 × 项目矩阵） ==================== */
const ProjectsPanel = {
  name: 'admin-projects-panel',
  components: { AdminSkeleton, AdminErrorState, AdminEmptyState, AdminDataTable },
  data() {
    return { loading: true, error: '', users: [], projects: [], q: '', onlyAdmins: false }
  },
  computed: {
    columns() {
      return [
        { key: 'username', label: '用户名', width: '160px', nowrap: true },
        { key: 'displayName', label: '显示名', width: '150px', nowrap: true },
        { key: 'role', label: '角色', width: '110px', nowrap: true, render: (r) => (r.role === 'admin' ? '管理员' : '普通用户') },
        { key: 'projects', label: '可访问项目', render: (r) => (r.projects || []).join('、') || '（无）' },
      ]
    },
    rows() {
      const kw = this.q.trim().toLowerCase()
      let list = this.users
      if (this.onlyAdmins) list = list.filter((u) => u.role === 'admin')
      if (kw) {
        list = list.filter((u) =>
          String(u.username || '').toLowerCase().includes(kw) ||
          String(u.displayName || '').toLowerCase().includes(kw) ||
          (u.projects || []).some((p) => String(p).toLowerCase().includes(kw)))
      }
      return list.map((u) => ({ ...u, id: u.username }))
    },
  },
  methods: {
    relTime,
    async load() {
      this.loading = true
      this.error = ''
      const [u, p] = await Promise.all([get('/privhub/api/admin/users'), get('/privhub/api/projects')])
      if (!u.ok) {
        this.error = u.error === '仅管理员' ? '仅管理员可查看项目权限（当前账号不是管理员）' : (u.error || '用户列表读取失败')
        this.loading = false
        return
      }
      this.users = u.data.users || []
      this.projects = p.ok ? (p.data.projects || []) : []
      this.loading = false
    },
    grantHint() {
      // 修改归属仍需走「用户管理」既有界面 —— 本阶段不新增后端接口，也不复制一份编辑逻辑
      adminToast('分配项目权限请在「用户管理」中编辑该用户', 'info', 3200)
      openAdminRoute('access/users')
    },
  },
  mounted() { void this.load() },
  template: `
    <div class="ad-panel">
      <div class="ad-filterbar">
        <input class="ad-input" v-model="q" type="search" placeholder="搜索用户名 / 显示名 / 项目" aria-label="搜索" />
        <label class="ad-check"><input type="checkbox" v-model="onlyAdmins" /> 只看管理员</label>
        <span class="ad-dim">共 {{ rows.length }} / {{ users.length }} 个用户 · {{ projects.length }} 个项目</span>
      </div>
      <AdminSkeleton v-if="loading" variant="rows" :rows="8"></AdminSkeleton>
      <AdminErrorState v-else-if="error" :message="error" @retry="load"></AdminErrorState>
      <AdminEmptyState
        v-else-if="!rows.length"
        icon="📁"
        title="没有匹配的用户"
        desc="调整搜索条件，或在「用户管理」中新增用户并分配项目。"
        action-text="前往用户管理"
        @action="openAdminRoute('access/users')"
      ></AdminEmptyState>
      <template v-else>
        <AdminDataTable :columns="columns" :rows="rows" row-key="id" clickable @row-click="grantHint"></AdminDataTable>
        <div class="ad-hint-block">
          这是<strong>只读视图</strong>：矩阵数据来自现有「用户管理」接口，用于一眼看清谁能访问哪些项目。
          修改归属请点任意一行跳到「用户管理」编辑（本阶段不新增后端接口）。
        </div>
      </template>
    </div>
  `,
}

/* ==================== 发布链接（管理全部免登录分享链接） ====================
 * 本页用【列表-详情主从布局】（需求 §4）：左列表 320px（可拖拽 280–480）、右详情自适应；
 * 列表支持 ↑/↓ 切换选中、Enter 打开详情；宽度 <768px 时二选一，详情页有「返回列表」。
 * 这里同时是 AdminListDetail / AdminBulkBar 的参考用法。
 */
const PublishPanel = {
  name: 'admin-publish-panel',
  components: {
    AdminSkeleton, AdminErrorState, AdminEmptyState,
    AdminListDetail: AdminListDetail, AdminBulkBar: AdminBulkBar,
  },
  data() {
    return { st: adminState, loading: true, error: '', list: [], q: '', busy: false }
  },
  computed: {
    rows() {
      const kw = this.q.trim().toLowerCase()
      const list = kw ? this.list.filter((p) => JSON.stringify(p).toLowerCase().includes(kw)) : this.list
      return list.map((p) => ({ ...p, id: p.code }))
    },
    selected() {
      return this.rows.find((r) => r.code === this.st.selectedId) || null
    },
  },
  watch: {
    /* 列表-详情布局的联动：选中项决定 <768px 时显示列表还是详情 */
    'st.selectedId'(v) { this.st.mobileDetail = !!v },
    rows(list) {
      if (!list.length) return
      if (!list.some((r) => r.code === this.st.selectedId)) this.st.selectedId = list[0].code
    },
  },
  methods: {
    relTime,
    async load() {
      this.loading = true
      this.error = ''
      const r = await get('/privhub/api/publish/list')
      if (!r.ok) {
        this.error = r.error || '发布链接读取失败'
        this.loading = false
        return
      }
      this.list = r.data.publishes || r.data.list || []
      this.loading = false
      if (this.list.length && !this.list.some((p) => p.code === this.st.selectedId)) {
        this.st.selectedId = this.list[0].code
      }
    },
    /** ↑ / ↓ 切换选中项（列表容器上加 tabindex=0 才收得到键盘事件）。 */
    onListKey(e) {
      const list = this.rows
      if (!list.length) return
      const i = list.findIndex((r) => r.code === this.st.selectedId)
      if (e.key === 'ArrowDown') { e.preventDefault(); this.st.selectedId = list[Math.min(list.length - 1, i + 1)].code }
      else if (e.key === 'ArrowUp') { e.preventDefault(); this.st.selectedId = list[Math.max(0, i - 1)].code }
      else if (e.key === 'Enter' && this.selected) { e.preventDefault(); this.st.mobileDetail = true }
    },
    pick(row) { this.st.selectedId = row.code },
    urlOf(code) { return location.origin + '/pub?code=' + encodeURIComponent(code) },
    fullPath(row) { return (row.project ? row.project + ' / ' : '') + (row.path || row.name || '—') },
    async copy(row) {
      const url = this.urlOf(row.code)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(url)
          adminToast('链接已复制')
          return
        } catch { /* 落到下面的手工提示 */ }
      }
      adminToast('请手动复制：' + url, 'warn', 5000)
    },
    async revoke(row) {
      if (this.busy) return
      const ok = await confirmAction({
        title: '撤销发布链接',
        message: '撤销后该链接立即失效，任何持有链接的人都无法再访问。',
        detail: this.fullPath(row),
        confirmText: '撤 销',
        danger: true,
      })
      if (!ok) return
      this.busy = true
      const r = await send('/privhub/api/publish?code=' + encodeURIComponent(row.code), { method: 'DELETE' })
      this.busy = false
      if (r.ok) { adminToast('已撤销发布'); await this.load() }
      else adminToast(r.error || '撤销失败', 'error')
    },
  },
  mounted() { this.st.selectedId = null; void this.load() },
  template: `
    <div class="ad-panel">
      <div class="ad-filterbar">
        <input class="ad-input" v-model="q" type="search" placeholder="搜索文件 / 发布人 / 链接码" aria-label="搜索发布链接" />
        <span class="ad-dim">共 {{ rows.length }} 条发布链接</span>
        <span class="ad-dim">列表内 ↑ ↓ 切换 · Enter 打开详情</span>
      </div>

      <AdminSkeleton v-if="loading" variant="rows" :rows="6"></AdminSkeleton>
      <AdminErrorState v-else-if="error" :message="error" @retry="load"></AdminErrorState>

      <AdminListDetail v-else :has-detail="!!selected">
        <template #list>
          <div class="ad-listpane" tabindex="0" @keydown="onListKey">
            <div v-if="!rows.length" class="ad-ld-hint">没有匹配的发布链接</div>
            <div
              v-for="r in rows" :key="r.code"
              class="ad-li"
              :class="{ on: r.code === st.selectedId }"
              :title="fullPath(r)"
              @click="pick(r)"
            >
              <div class="ad-li-top">
                <span class="ad-li-title">{{ r.path || r.name || '（未命名）' }}</span>
              </div>
              <div class="ad-li-sub">{{ r.project || '（无项目）' }} · {{ r.createdBy || '—' }}</div>
              <div class="ad-li-foot">
                <span class="ad-li-badge">{{ r.expiresAt ? '限时' : '永久' }}</span>
                <span>{{ r.expiresAt ? relTime(r.expiresAt) + ' 到期' : '不过期' }}</span>
              </div>
            </div>
          </div>
        </template>

        <template #detail>
          <AdminEmptyState
            v-if="!selected"
            icon="🔗"
            title="暂无选中项"
            desc="左侧没有可管理的发布链接。在文件详情面板点「发布」即可生成免登录只读链接。"
            hint="发布链接用于内网分享：任何拿到链接的人都能查看该页面，无需登录。"
          ></AdminEmptyState>
          <div v-else class="ad-detail-body">
            <div class="ad-detail-title">{{ selected.path || selected.name || '（未命名）' }}</div>
            <div class="ad-detail-sub">{{ fullPath(selected) }}</div>
            <div class="ad-kv"><span class="ad-kv-k">发布人</span><span class="ad-kv-v">{{ selected.createdBy || '—' }}</span></div>
            <div class="ad-kv"><span class="ad-kv-k">有效期</span><span class="ad-kv-v">{{ selected.expiresAt ? relTime(selected.expiresAt) : '永久有效' }}</span></div>
            <div class="ad-kv"><span class="ad-kv-k">链接码</span><span class="ad-kv-v"><code>{{ selected.code }}</code></span></div>
            <div class="ad-kv"><span class="ad-kv-k">访问地址</span><span class="ad-kv-v"><code>{{ urlOf(selected.code) }}</code></span></div>

            <div class="ad-detail-actions">
              <button class="ad-btn ad-btn-primary" @click="copy(selected)">复制链接</button>
              <a class="ad-btn" :href="urlOf(selected.code)" target="_blank" rel="noopener">新窗口打开</a>
            </div>

            <AdminBulkBar :count="0" @clear="st.selection = []"></AdminBulkBar>

            <div class="ad-danger-zone">
              <div class="ad-danger-title">危险操作</div>
              <div class="ad-danger-desc">撤销后链接立即失效，且无法恢复；需要重新发布才能生成新链接。</div>
              <button class="ad-btn ad-btn-danger" :disabled="busy" @click="revoke(selected)">{{ busy ? '撤销中…' : '撤销此链接' }}</button>
            </div>
          </div>
        </template>
      </AdminListDetail>
    </div>
  `,

}

/* ==================== 自动备份 ==================== */
const BackupPanel = {
  name: 'admin-backup-panel',
  components: { AdminSkeleton, AdminErrorState, AdminEmptyState },
  data() {
    return { loading: true, error: '', status: null, busy: false, lastResult: '' }
  },
  computed: {
    rows() {
      const s = this.status
      if (!s) return []
      return [
        { k: 'git 可用', v: s.gitAvailable ? '是' : '否' },
        { k: '自动备份', v: s.autoBackup ? '运行中（每 60 秒检测变更）' : '未运行' },
        { k: '备份范围（文件）', v: s.scope && s.scope.files ? s.scope.files : 'data-files/' },
        { k: '备份范围（系统数据）', v: s.scope && Array.isArray(s.scope.system) ? s.scope.system.join('、') : '—' },
      ]
    },
  },
  methods: {
    async load() {
      this.loading = true
      this.error = ''
      const r = await get('/privhub/api/gitbackup/status')
      if (!r.ok) {
        this.error = r.error || '备份状态读取失败'
        this.status = null
      } else {
        this.status = r.data
      }
      this.loading = false
    },
    async commitNow() {
      if (this.busy) return
      const ok = await confirmAction({
        title: '立即备份',
        message: '把 data-files 与系统数据镜像到备份仓库并提交一次 git 提交。文件较多时需要一点时间。',
        confirmText: '开始备份',
      })
      if (!ok) return
      this.busy = true
      const r = await send('/privhub/api/gitbackup/commit', { method: 'POST', body: JSON.stringify({ message: 'manual: 管理控制台' }) })
      this.busy = false
      if (!r.ok) { adminToast(r.error || '备份失败', 'error'); return }
      this.lastResult = r.data.changed
        ? '已提交：' + String(r.data.commit || '').slice(0, 8)
        : '没有检测到变更，无需提交'
      adminToast(this.lastResult)
      await this.load()
    },
  },
  mounted() { void this.load() },
  template: `
    <div class="ad-panel">
      <AdminSkeleton v-if="loading" variant="card" :rows="3"></AdminSkeleton>
      <AdminErrorState v-else-if="error" :message="error" @retry="load"></AdminErrorState>
      <template v-else>
        <div class="ad-section-card">
          <div class="ad-section-card-head">
            <span class="ad-section-card-title">💾 备份状态</span>
            <button class="ad-btn ad-btn-primary ad-btn-sm" :disabled="busy || !status || !status.gitAvailable" @click="commitNow">
              {{ busy ? '备份中…' : '立即备份' }}
            </button>
          </div>
          <div class="ad-kv" v-for="r in rows" :key="r.k">
            <span class="ad-kv-k">{{ r.k }}</span><span class="ad-kv-v">{{ r.v }}</span>
          </div>
          <div v-if="lastResult" class="ad-dim" style="margin-top:8px">{{ lastResult }}</div>
          <div v-if="status && !status.gitAvailable" class="ad-warn-block">
            未检测到 git，自动备份已停用。请在服务器安装 git 并确保它在 PATH 中，然后重启服务。
          </div>
        </div>
        <div class="ad-hint-block">
          备份仓库位于服务器 <code>data/git-backup</code>（镜像为加密文件，不落明文）。
          自动备份每 60 秒检测一次文件变更；此处可随时手动触发一次提交。
        </div>
      </template>
    </div>
  `,
}

/* ==================== 水印配置（第一阶段只读） ==================== */
const WatermarkPanel = {
  name: 'admin-watermark-panel',
  components: { AdminSkeleton, AdminErrorState, AdminEmptyState },
  data() {
    return { loading: true, error: '', view: null }
  },
  computed: {
    enabled() { return !!(this.view && this.view.enabled) },
    styleText() {
      const s = (this.view && this.view.style) || {}
      const parts = []
      for (const k of Object.keys(s)) parts.push(k + ': ' + s[k])
      return parts.join('；') || '—'
    },
  },
  methods: {
    async load() {
      this.loading = true
      this.error = ''
      const r = await get('/privhub/api/watermark')
      if (!r.ok) { this.error = r.error || '水印状态读取失败'; this.view = null }
      else this.view = r.data.view || null
      this.loading = false
    },
  },
  mounted() { void this.load() },
  template: `
    <div class="ad-panel">
      <AdminSkeleton v-if="loading" variant="card" :rows="2"></AdminSkeleton>
      <AdminErrorState v-else-if="error" :message="error" @retry="load"></AdminErrorState>
      <template v-else>
        <div class="ad-section-card">
          <div class="ad-section-card-head"><span class="ad-section-card-title">💧 当前水印</span>
            <span class="ad-chip" :class="enabled ? 'on' : 'off'">{{ enabled ? '已启用' : '未启用' }}</span>
          </div>
          <div class="ad-kv"><span class="ad-kv-k">水印文案</span><span class="ad-kv-v">{{ enabled ? view.text : '—' }}</span></div>
          <div class="ad-kv"><span class="ad-kv-k">叠加样式</span><span class="ad-kv-v">{{ styleText }}</span></div>
        </div>
        <div class="ad-hint-block">
          水印由 <code>privhub-svc-watermark</code> 在后端生成，内容为「用户名 + 时间」，用于截图溯源。
          <strong>本阶段为只读</strong>：自定义文案 / 透明度 / 开关等配置项将在后续阶段接入（需要后端提供配置接口）。
        </div>
      </template>
    </div>
  `,
}

export { OverviewPanel, ProjectsPanel, PublishPanel, BackupPanel, WatermarkPanel, relTime, get }
