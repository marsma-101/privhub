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

/* ==================== 存储迁移（v6 改造：老库 → 新扁平池） ==================== */

/**
 * 老库迁移面板。
 *
 * ## 为什么做成「两遍」而不是「一次性搬家」
 *
 * 用户的真实场景是：老库在 E 盘，新装 PrivHub 把数据位置设到 F 盘。如果
 * 「一次性搬」，中途断电就会留下半新半旧、两边都不完整的库 —— 而用户手里
 * 只有这一份数据。所以拆成两遍：
 *
 *   ① 只读扫描：把老库的层级/文件名/大小登记进索引（不碰字节，很快）；
 *   ② 空闲慢搬：逐条复制到新扁平池，完成一条改一条索引。
 *
 * 任何时刻打断，老库都还是完整的原样；重跑只会重搬没搬完的。
 *
 * ## 安全约定
 *
 * - **绝不删除老库源文件**（搬完由管理员手动处理）；
 * - 默认低并发，避免占满磁盘 IO；
 * - 逐条记录失败，不因单个文件失败而中断整批。
 */
const MigratePanel = {
  name: 'admin-migrate-panel',
  components: { AdminSkeleton, AdminErrorState, AdminEmptyState },
  data() {
    return {
      loading: true,
      error: '',
      oldRoot: '',
      computeSha: false,
      status: null,
      busy: '',
      lastResult: '',
      /* 轮询句柄：迁移是后台慢任务，页面靠轮询看进度。 */
      pollTimer: null,
    }
  },
  computed: {
    pct() {
      const s = this.status
      if (!s || !s.total) return 0
      return Math.min(100, Math.round((s.migrated / s.total) * 100))
    },
    pending() {
      const s = this.status
      if (!s) return 0
      return Math.max(0, (s.total || 0) - (s.migrated || 0))
    },
    totalsText() {
      const s = this.status
      if (!s) return '—'
      return '共 ' + (s.total || 0) + ' 条 · 已搬 ' + (s.migrated || 0) + ' · 待搬 ' + this.pending
        + (s.failed ? ' · 失败 ' + s.failed : '')
    },
  },
  methods: {
    async load() {
      this.loading = true
      this.error = ''
      const r = await get('/privhub/api/storage/legacy-status')
      if (!r.ok) {
        this.error = r.error || '迁移状态读取失败'
        this.status = null
      } else {
        this.status = r.data
      }
      this.loading = false
      /* 有在跑的任务就继续轮询，跑完自动停。 */
      if (this.status && this.status.running) this.startPoll()
      else this.stopPoll()
    },
    startPoll() {
      this.stopPoll()
      this.pollTimer = setInterval(() => {
        void get('/privhub/api/storage/legacy-status').then((r) => {
          if (!r.ok) return
          this.status = r.data
          if (!r.data.running) this.stopPoll()
        })
      }, 2000)
    },
    stopPoll() {
      if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null }
    },
    /** 第一遍：只读扫描老库，建立索引。不搬任何字节。 */
    async scan() {
      const root = String(this.oldRoot || '').trim()
      if (!root) { adminToast('请先填写老库位置', 'error'); return }
      const ok = await confirmAction({
        title: '扫描老库',
        message: '将只读遍历「' + root + '」，把它现有的目录层级与文件名登记进新库索引。\n\n'
          + '这一遍不会移动、不会删除、也不会修改老库里的任何文件，可以随时中断或重复执行。',
        confirmText: '开始扫描',
      })
      if (!ok) return
      this.busy = 'scan'
      const r = await send('/privhub/api/storage/legacy-scan', {
        method: 'POST',
        body: JSON.stringify({ oldRoot: root, computeSha: !!this.computeSha }),
      })
      this.busy = ''
      if (!r.ok) { adminToast(r.error || '扫描失败', 'error'); return }
      this.lastResult = '扫描完成：登记 ' + (r.data.created || 0) + ' 条，更新 ' + (r.data.updated || 0)
        + ' 条' + (r.data.failed && r.data.failed.length ? '，失败 ' + r.data.failed.length : '')
      adminToast(this.lastResult)
      await this.load()
    },
    /** 第二遍：空闲把老库字节慢慢复制到新扁平池。 */
    async migrate() {
      const ok = await confirmAction({
        title: '开始搬运',
        message: '将把尚未迁移的文件逐条复制到新的扁平存储池。\n\n'
          + '· 加密文件会在搬运时自动解密，新库里存的是明文；\n'
          + '· 默认低并发，不影响正常读写；\n'
          + '· 随时可以暂停，断电也不会丢数据（已完成的不会重搬）；\n'
          + '· 老库源文件不会被删除，搬完后由你手动处理。',
        confirmText: '开始搬运',
      })
      if (!ok) return
      this.busy = 'migrate'
      const r = await send('/privhub/api/storage/legacy-migrate', { method: 'POST', body: '{}' })
      this.busy = ''
      if (!r.ok) { adminToast(r.error || '启动搬运失败', 'error'); return }
      adminToast('搬运已启动，可在本页查看进度')
      await this.load()
    },
    async cancel() {
      const r = await send('/privhub/api/storage/legacy-cancel', { method: 'POST', body: '{}' })
      if (!r.ok) { adminToast(r.error || '取消失败', 'error'); return }
      adminToast('已请求停止，当前文件搬完后会停下')
      await this.load()
    },
  },
  mounted() { void this.load() },
  beforeUnmount() { this.stopPoll() },
  template: `
    <div class="ad-panel">
      <AdminSkeleton v-if="loading" variant="card" :rows="3"></AdminSkeleton>
      <AdminErrorState v-else-if="error" :message="error" @retry="load"></AdminErrorState>
      <template v-else>
        <div class="ad-section-card">
          <div class="ad-section-card-head">
            <span class="ad-section-card-title">📦 老库迁移 / 转明文</span>
            <span class="ad-chip" :class="status && status.running ? 'on' : 'off'">
              {{ status && status.running ? '搬运中' : '空闲' }}
            </span>
          </div>
          <div class="ad-field">
            <label class="ad-label">
              老库位置
              <span class="ad-help" title="旧版 PrivHub 的 data-files 目录，例如 E:\\privhub\\data-files。系统只读它，不会修改或删除其中任何文件。">ⓘ</span>
            </label>
            <input class="ad-input" v-model="oldRoot" placeholder="例如 E:\\privhub\\data-files" />
          </div>
          <label class="ad-check">
            <input type="checkbox" v-model="computeSha" />
            扫描时顺带计算内容指纹（更慢，但可以顺带查出重复文件）
          </label>
          <div class="ad-actions">
            <button class="ad-btn ad-btn-primary ad-btn-sm" :disabled="busy === 'scan'" @click="scan">
              {{ busy === 'scan' ? '扫描中…' : '① 扫描老库（只读）' }}
            </button>
            <button class="ad-btn ad-btn-sm" :disabled="busy === 'migrate' || (status && status.running)" @click="migrate">
              ② 开始搬运
            </button>
            <button class="ad-btn ad-btn-sm" v-if="status && status.running" @click="cancel">停止</button>
          </div>
          <div v-if="lastResult" class="ad-dim" style="margin-top:8px">{{ lastResult }}</div>
        </div>

        <div class="ad-section-card" v-if="status">
          <div class="ad-section-card-head"><span class="ad-section-card-title">📊 进度</span></div>
          <div class="ad-kv"><span class="ad-kv-k">概况</span><span class="ad-kv-v">{{ totalsText }}</span></div>
          <div class="ad-kv"><span class="ad-kv-k">完成度</span><span class="ad-kv-v">{{ pct }}%</span></div>
          <div class="ad-progress"><div class="ad-progress-bar" :style="{ width: pct + '%' }"></div></div>
          <div v-if="status.failed" class="ad-warn-block" style="margin-top:8px">
            有 {{ status.failed }} 个文件搬运失败。失败项不会中断整批，可稍后重试；老库源文件仍然完好。
          </div>
        </div>

        <div class="ad-hint-block">
          迁移分两步：<strong>扫描</strong>只登记目录与文件名（不搬字节，很快）；
          <strong>搬运</strong>在后台低并发地把文件复制到新的扁平存储池。
          任何时刻中断都不会丢数据，重跑只补没完成的部分。
          <br />
          <strong>加密会自动转成明文</strong>：老库里 PHENC1 加密的文件，搬运时先解密再写入新库，
          落到新地址的就是可直接读的明文（nginx 才能直读）。系统 JSON 与审计记录仍然加密。
          <br />
          <strong>老库源文件全程不会被删除</strong>，确认新库无误后由你手动处理。
        </div>
      </template>
    </div>
  `,
}

/**
 * 系统自检。
 *
 * 扁平存储把「文件在哪」从磁盘目录结构搬进了主索引，于是出现一类新的失败姿态：
 * **索引和磁盘不一致，但两边单独看都正常**。比如池里的字节被删了、索引还留着
 * 条目 —— 服务照常启动、列表照常显示，只有用户点到那个文件才 404。
 *
 * 这一页的价值就是把这类问题**主动**摆出来，并且对能修的给一键修复。
 * 检查本身是只读的，随时可以跑；修复必须显式点击。
 */
const DoctorPanel = {
  name: 'admin-doctor-panel',
  components: { AdminSkeleton, AdminErrorState, AdminEmptyState },
  data() {
    return {
      loading: true,
      error: '',
      report: null,
      busy: '',
      lastAction: '',
    }
  },
  computed: {
    /* 有问题的项排前面，让管理员一眼看到重点。 */
    sortedChecks() {
      const r = this.report
      if (!r || !Array.isArray(r.checks)) return []
      const rank = { error: 0, warn: 1, skipped: 2, ok: 3 }
      return [...r.checks].sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9))
    },
    summaryText() {
      const r = this.report
      if (!r) return '—'
      if (r.problems === 0) return '全部通过（' + r.checks.length + ' 项检查）'
      return r.problems + ' 项需要关注'
        + (r.fixableCount > 0 ? '，其中 ' + r.fixableCount + ' 项可一键修复' : '')
    },
    summaryClass() {
      const r = this.report
      if (!r) return 'off'
      return r.problems === 0 ? 'on' : 'warn'
    },
  },
  methods: {
    iconOf(s) {
      if (s === 'ok') return '✅'
      if (s === 'warn') return '⚠️'
      if (s === 'error') return '❌'
      return '⏭️'
    },
    async run() {
      this.busy = 'check'
      this.error = ''
      const r = await get('/privhub/api/doctor/check')
      if (!r.ok) {
        this.error = r.error || '自检失败'
        this.report = null
      } else {
        this.report = r.data
      }
      this.busy = ''
      this.loading = false
    },
    async repair(id) {
      this.busy = id
      const r = await send('/privhub/api/doctor/repair', { method: 'POST', body: JSON.stringify({ id }) })
      if (!r.ok) {
        adminToast(r.error || '修复失败', 'error')
      } else {
        this.lastAction = r.data && r.data.action ? r.data.action : '已修复'
        adminToast(this.lastAction)
        /* 修完立刻重扫：让管理员看到"修好了"而不是只看到一条提示。 */
        await this.run()
      }
      this.busy = ''
    },
  },
  mounted() { void this.run() },
  template: `
    <div class="ad-panel">
      <AdminSkeleton v-if="loading" variant="card" :rows="4"></AdminSkeleton>
      <AdminErrorState v-else-if="error" :message="error" @retry="run"></AdminErrorState>
      <template v-else>
        <div class="ad-section-card">
          <div class="ad-section-card-head">
            <span class="ad-section-card-title">🩺 系统自检</span>
            <span class="ad-chip" :class="summaryClass">{{ summaryText }}</span>
          </div>
          <div class="ad-actions">
            <button class="ad-btn ad-btn-primary ad-btn-sm" :disabled="busy === 'check'" @click="run">
              {{ busy === 'check' ? '检查中…' : '重新检查' }}
            </button>
          </div>
          <div v-if="lastAction" class="ad-dim" style="margin-top:8px">上次修复：{{ lastAction }}</div>
        </div>

        <div class="ad-section-card">
          <div class="ad-section-card-head"><span class="ad-section-card-title">📋 检查项</span></div>
          <div v-for="c in sortedChecks" :key="c.id" style="padding:10px 0;border-bottom:1px solid var(--ad-line)">
            <div style="display:flex;align-items:baseline;gap:8px">
              <span>{{ iconOf(c.status) }}</span>
              <strong style="flex:1">{{ c.title }}</strong>
              <button
                v-if="c.fixable && (c.status === 'warn' || c.status === 'error')"
                class="ad-btn ad-btn-sm"
                :disabled="busy === c.id"
                @click="repair(c.id)"
              >{{ busy === c.id ? '修复中…' : '一键修复' }}</button>
            </div>
            <div class="ad-dim" style="margin-top:4px;padding-left:24px">{{ c.detail }}</div>
            <div v-if="c.samples && c.samples.length" class="ad-dim"
                 style="margin-top:4px;padding-left:24px;font-family:monospace;font-size:12px">
              <div v-for="(s, i) in c.samples" :key="i">· {{ s }}</div>
            </div>
            <div v-if="c.advice" class="ad-dim" style="margin-top:4px;padding-left:24px">
              处置建议：{{ c.advice }}
            </div>
          </div>
          <AdminEmptyState v-if="!sortedChecks.length" message="没有检查项"></AdminEmptyState>
        </div>

        <div class="ad-hint-block">
          <strong>自检是只读的</strong>，随时可以跑，不会改动任何文件。
          「一键修复」只在能确定安全时出现，每项都会告诉你它做了什么、影响多少条。
          <br />
          这里查的是<strong>索引与磁盘的不一致</strong> —— 扁平存储下这类问题不会让服务起不来，
          只会让某个具体文件打不开，所以必须主动扫出来。
          <br />
          ⚠️ 自检是兜底，不是保险：真正的可靠性来自写入路径本身的严谨（原子落盘、索引与磁盘同步变更）。
        </div>
      </template>
    </div>
  `,
}

export { OverviewPanel, ProjectsPanel, PublishPanel, BackupPanel, WatermarkPanel, MigratePanel, DoctorPanel, relTime, get }
