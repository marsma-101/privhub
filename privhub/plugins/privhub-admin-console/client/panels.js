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

/* 取数纪律（2026-11-17）：总数一律来自"总数接口"（total / stats.entries），
 * 不再用分页列表的 .length —— 旧版 countOf 正是把页大小当总数的错误来源，已删。 */

/* ==================== 概览 ==================== */

/**
 * 管理控制台概览（2026-11-17 按《管理控制台改进计划》重构）。
 *
 * ## 信息架构（每层只回答一个问题）
 *   顶栏 = 我要找什么（搜索，全管理台唯一搜索框）
 *   侧栏 = 我在哪（位置）
 *   概览 = 我该去哪（本页：5 张职责入口卡 + 最近活动）
 *   功能页 = 怎么做
 *
 * ## 卡片四段式（每张卡必须齐全）
 *   标题（职责名）→ 描述（≤22 字）→ 指标（1 个真实数字，取不到 = —）→ 直达按钮。
 *
 * ## 取数纪律（实测教训，两条都是真 bug 修出来的）
 *   1. **总数必须来自"总数接口"，不能用分页列表的 .length**。
 *      旧版拿 /audit 默认 200 条的页大小当"审计总数"，实际有 3712 条，少报 3512。
 *      现在审计走 /audit/stats.entries（O(1) 读块数）；用户走 /admin/users?limit=1 的 total。
 *   2. **为显示一个数字，不拉整个列表**。旧版一次进概览拉 28.4 KB（94% 是审计全量），
 *      现在 ≤3 KB。
 *   3. 部分接口失败只影响对应卡片（显示 —），不拖垮整页；全部失败才整页报错。
 *   4. 30 秒内存缓存：切走再切回不重拉；顶栏「刷新」传 force 强刷。
 */

/** 概览取数缓存（模块级；只在内存，不落盘 —— 页面刷新即失效，符合预期）。 */
let ovCache = null
/** 上次概览挂载时消费掉的刷新令牌。
 *  只有令牌**比上次新**才强制重拉 —— 否则用户点过一次刷新后，
 *  每次切回概览都会绕过缓存（令牌一直 >0），30 秒缓存形同虚设。 */
let ovLastToken = -1

/** 审计动作的中文短名（与 privhub-admin-audit-panel 的 ACTION_LABELS 同源语义；
 *  这里只需要展示最近活动，未知动作原样显示，不瞎翻译）。 */
const OV_ACTION_LABELS = {
  login: '登录', logout: '退出', register: '注册',
  upload: '上传', mkdir: '新建文件夹', delete: '删除', rename: '重命名', move: '移动',
  restore: '恢复', purge: '彻底删除', clean: '清理回收站',
  'project-create': '新建项目', 'project-delete': '删除项目',
  'user-update': '修改用户', 'user-delete': '删除用户', 'user-reset-password': '重置密码',
}

const OverviewPanel = {
  name: 'admin-overview',
  components: { AdminSkeleton, AdminErrorState },
  props: {
    /** 顶栏/页头「刷新」的令牌：外壳每次刷新 +1 并重挂本组件。
     *  收到 >0 的令牌说明这次挂载是"用户要求刷新"，必须绕过 30 秒缓存。 */
    reloadToken: { type: Number, default: 0 },
  },
  data() {
    return { loading: true, error: '', cards: [], recent: [], showStart: false }
  },
  methods: {
    open(key) { openAdminRoute(key) },
    actionLabel(a) { return OV_ACTION_LABELS[a] || a },
    relTime(ts) { return relTime(ts) },
    startUsers() { this.dismissStart(); openAdminRoute('access/users') },
    dismissStart() {
      this.showStart = false
      try { localStorage.setItem('privhub_admin_start_dismissed', '1') } catch { /* 忽略 */ }
    },
    /** 从缓存恢复渲染（切页 30 秒内回来不重拉）。 */
    renderCached() {
      this.cards = ovCache.cards
      this.recent = ovCache.recent
      this.loading = false
      this.error = ''
    },
    async load(force = false) {
      if (!force && ovCache && Date.now() - ovCache.at < 30000) { this.renderCached(); return }
      this.loading = true
      this.error = ''
      /* 六个请求并发；每个只取自己需要的最小载荷：
       *   users?limit=1 → total（总数接口，不是列表长度）
       *   audit/stats   → entries 块数（O(1)，不拉日志本体）
       *   audit?limit=5 → 最近活动（每条约 120B）
       *   volumes/list  → 运维卡的卷数 / 文件数
       * projects / acl / trash 本身就小（<300B），原样取。 */
      const [users, projects, rules, auditStats, trash, volumes, recent] = await Promise.all([
        get('/privhub/api/admin/users?limit=1'),
        get('/privhub/api/projects'),
        get('/privhub/api/acl/rules'),
        get('/privhub/api/audit/stats'),
        get('/privhub/api/trash-list'),
        get('/privhub/api/volumes/list'),
        get('/privhub/api/audit?limit=5'),
      ])
      const num = (r, pick) => {
        if (!r.ok) return null
        const v = pick(r.data)
        return typeof v === 'number' && Number.isFinite(v) ? v : null
      }
      const userTotal = num(users, (d) => (typeof d.total === 'number' ? d.total : (Array.isArray(d.users) ? d.users.length : null)))
      const auditTotal = num(auditStats, (d) => d.entries)
      const volList = volumes.ok && Array.isArray(volumes.data.volumes) ? volumes.data.volumes : null
      const volFiles = volList ? volList.reduce((s, v) => s + (Number(v.files) || 0), 0) : null

      /* 每张卡 = 一个职责域：target 是最常用落地页，also 是同域其余子页（1 步直达）。 */
      this.cards = [
        {
          key: 'users', target: 'access/users', icon: '👥', label: '用户与角色',
          count: userTotal, unit: '个账号',
          desc: '账号 · 三层角色 · 项目分配',
          also: [['access/users', '用户管理'], ['access/projects', '项目权限']],
        },
        {
          key: 'projects', target: 'access/projects', icon: '📁', label: '项目与权限',
          count: num(projects, (d) => (Array.isArray(d.projects) ? d.projects.length : null)), unit: '个项目',
          desc: '项目访问 · 文件目录级 ACL',
          aclCount: num(rules, (d) => (Array.isArray(d.rules) ? d.rules.length : null)),
          also: [['access/projects', '项目权限'], ['access/acl', 'ACL 规则']],
        },
        {
          key: 'content', target: 'content/trash', icon: '🗂️', label: '内容治理',
          count: num(trash, (d) => (Array.isArray(d.trash) ? d.trash.length : null)), unit: '条待处理',
          desc: '标签 · 模板 · 发布 · 回收站',
          also: [['content/tags', '标签'], ['content/templates', '模板'], ['content/publish', '发布链接'], ['content/trash', '回收站']],
        },
        {
          key: 'ops', target: 'ops/storage', icon: '⚙️', label: '系统运维',
          count: volList ? volList.length : null, unit: '个存储卷',
          desc: '存储 · 迁移 · 更新 · 自检',
          volFiles,
          also: [['ops/storage', '存储'], ['ops/doctor', '系统自检'], ['ops/watermark', '水印']],
        },
        {
          key: 'audit', target: 'ops/audit', icon: '🧾', label: '审计日志',
          count: auditTotal, unit: '条记录',
          desc: '只追加可追溯的操作记录',
          also: [['ops/audit', '审计日志'], ['ops/webhook', 'Webhook']],
        },
      ]
      this.recent = recent.ok && Array.isArray(recent.data.entries) ? recent.data.entries.slice(0, 5) : []
      const allFail = [users, projects, rules, auditStats, trash, volumes].every((r) => !r.ok)
      this.error = allFail ? '管理数据读取失败：可能未登录、权限不足或接口不可用' : ''
      this.loading = false
      if (!allFail) ovCache = { at: Date.now(), cards: this.cards, recent: this.recent }
    },
  },
  mounted() {
    /* 令牌比上次消费的新 = 用户点了刷新（外壳 reloadSeq+1 并重挂本组件）→ 绕过缓存。
     * 普通切页重挂时令牌不变 → 命中 30 秒缓存。 */
    const force = this.reloadToken > ovLastToken
    ovLastToken = this.reloadToken
    void this.load(force)
    /* 「新手第一步」提示：没被手动关过就显示（与引导弹层独立，互不替代）。 */
    try { this.showStart = localStorage.getItem('privhub_admin_start_dismissed') !== '1' } catch { this.showStart = false }
  },
  template: `
    <div class="ad-panel">
      <AdminSkeleton v-if="loading" variant="grid" :rows="5"></AdminSkeleton>
      <AdminErrorState v-else-if="error" :message="error" @retry="load(true)"></AdminErrorState>
      <template v-else>
        <!-- 入口卡片：一张卡 = 一个职责域（去哪儿 + 能干什么 + 真实计数）。
             键盘可达：整卡 role=link + tabindex，Enter/Space 进入；卡内小按钮原生可聚焦。 -->
        <div class="ad-ov-grid">
          <div
            v-for="c in cards" :key="c.key" class="ad-ov-card"
            role="link" tabindex="0" :aria-label="'前往' + c.label"
            @click="open(c.target)" @keydown.enter.prevent="open(c.target)" @keydown.space.prevent="open(c.target)"
          >
            <div class="ad-ov-head">
              <span class="ad-ov-icon">{{ c.icon }}</span>
              <span class="ad-ov-title">{{ c.label }}</span>
              <span class="ad-ov-go">→</span>
            </div>
            <div class="ad-ov-desc">{{ c.desc }}</div>
            <div class="ad-ov-nums">
              <span v-if="c.count !== null" class="ad-ov-num">{{ c.count }} <em>{{ c.unit }}</em></span>
              <span v-else class="ad-ov-num ad-ov-na">—</span>
              <span v-if="c.aclCount !== null && c.aclCount !== undefined" class="ad-ov-sub">{{ c.aclCount }} 条 ACL</span>
              <span v-if="c.volFiles !== null && c.volFiles !== undefined" class="ad-ov-sub">{{ c.volFiles }} 个文件</span>
            </div>
            <div class="ad-ov-also" @click.stop>
              <button v-for="a in (c.also || [])" :key="a[0]" class="ad-ov-link" @click="open(a[0])">{{ a[1] }}</button>
            </div>
          </div>
        </div>

        <!-- 最近活动：管理员进来第一个问题往往是"刚才发生了什么"。
             数据来自 /audit?limit=5（约 0.6KB），点任意一条进审计页看全量。 -->
        <div class="ad-ov-recent" v-if="recent.length > 0">
          <div class="ad-ov-recent-head">
            <span class="ad-ov-recent-title">🕘 最近活动</span>
            <button class="ad-ov-link" @click="open('ops/audit')">查看全部 →</button>
          </div>
          <div v-for="e in recent" :key="e.id" class="ad-ov-recent-row" @click="open('ops/audit')">
            <span class="ad-ov-recent-time">{{ relTime(e.at) }}</span>
            <span class="ad-ov-recent-user">{{ e.user }}</span>
            <span class="ad-ov-recent-act">{{ actionLabel(e.action) }}</span>
            <span class="ad-ov-recent-target" :title="e.target">{{ e.target || '—' }}</span>
          </div>
        </div>

        <!-- 新手第一步：一句可执行的建议，而不是重复解释卡片（卡片自己会说话）。
             看过引导/点过之后不再显示，避免常驻占地方（2026-11-17 减层）。 -->
        <div v-if="showStart" class="ad-ov-start">
          <span class="ad-ov-start-ic">👋</span>
          <span class="ad-ov-start-tx">第一次来？建议从<b>用户管理</b>开始——账号和权限是大多数管理动作的起点。</span>
          <button class="ad-btn ad-btn-sm ad-btn-primary" @click="startUsers">去用户管理 →</button>
          <button class="ad-ov-start-x" title="知道了，不再显示" aria-label="关闭提示" @click="dismissStart">✕</button>
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
        { key: 'role', label: '角色', width: '110px', nowrap: true, render: (r) => (window.PrivHub && window.PrivHub.roleLabel ? window.PrivHub.roleLabel(r.role) : r.role) },
        { key: 'projects', label: '可访问项目', render: (r) => (r.projects || []).join('、') || '（无）' },
      ]
    },
    rows() {
      const kw = this.q.trim().toLowerCase()
      let list = this.users
      if (this.onlyAdmins) list = list.filter((u) => u.role === 'admin' || u.role === 'system_admin')
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
      /** 扫描返回的提示（就地迁移等）；空串表示没有提示。 */
      lastWarning: '',
      /** 搬运目标卷 id（'' = 默认库根）。 */
      targetVolumeId: '',
      /** 可选的目标卷列表（从 /volumes/list 取）。 */
      volumes: [],
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
    /** 除了系统库根之外，有没有别的卷可选（没有就提示"先挂卷"）。 */
    targetVolMissing() {
      const sys = new Set([''])
      return !this.volumes.some((v) => v && !v.isSystemRoot && sys.has(v.id) === false)
    },
    /** 当前选中的目标卷（用于提示"将搬到 X"）。 */
    targetVol() {
      if (!this.targetVolumeId) return null
      return this.volumes.find((v) => v.id === this.targetVolumeId) || null
    },
    totalsText() {
      const s = this.status
      if (!s) return '—'
      return '共 ' + (s.total || 0) + ' 条 · 已搬 ' + (s.migrated || 0) + ' · 待搬 ' + this.pending
        + (s.failed ? ' · 失败 ' + s.failed : '')
    },
    /**
     * 「上次搬完是什么时候」——2026-11-16 补。
     *
     * 为什么需要：搬运完成后 `待搬` 恒为 0，用户再点一次「开始搬运」时
     * 界面数字**一点变化都没有**，看起来就像「点了没反应/没搬」。
     * 实测就发生过这种误判（其实 11/13 就搬完了，老库密文仍保留在盘上）。
     * 把「上次完成时间」显出来，用户才能分清「已完成」与「没执行」。
     */
    finishedText() {
      const s = this.status
      if (!s) return ''
      const t = s.migratedAt || s.finishedAt
      if (!t) return ''
      const d = new Date(t)
      if (Number.isNaN(d.getTime())) return ''
      const p = (n) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
    },
    /**
     * 已完成时给一句明确结论，而不是让用户自己从数字里猜。
     * 同时点明「老库源文件仍在」—— 这是本功能的既定行为（绝不删源），
     * 但不说清会让人以为「没搬干净」。
     */
    doneHint() {
      const s = this.status
      if (!s) return ''
      if (s.running) return ''
      if (!s.total) return ''
      if (this.pending > 0) return ''
      return '全部已搬运完成' + (this.finishedText ? '（' + this.finishedText + '）' : '')
        + '。老库里的原始文件**仍然保留在磁盘上**（本功能从不删除源文件），'
        + '确认新库无误后可由你手动清理老库目录。'
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
      /* 可选目标卷：与「存储卷」段同一份数据，不另造名单。
       * 拿不到就留空数组（下拉只有"默认库根"），不编造。 */
      try {
        const v = await get('/privhub/api/volumes/list')
        this.volumes = (v.ok && v.data && Array.isArray(v.data.volumes)) ? v.data.volumes : []
      } catch { this.volumes = [] }
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
      /* issue #4 · 4.3：扫描已后台化 —— 后端回 202 { started:true }（不再同步回
       * scanned/created/updated）。复用本面板既有的轮询机制（load()/startPoll
       * 轮询 GET /legacy-status），扫完 running=false 自动停。 */
      if (r.data && r.data.started === false) {
        this.lastResult = r.data.message || '没有可扫描的内容'
        adminToast(this.lastResult, 'warn')
        await this.load()
        return
      }
      this.lastResult = '扫描已在后台执行' + (r.data.warning ? '（' + r.data.warning + '）' : '')
        + (r.data.notice ? '。' + r.data.notice : '')
      this.lastWarning = typeof r.data.warning === 'string' ? r.data.warning : ''
      adminToast('扫描已启动，可在本页查看进度')
      await this.load()
    },
    /** 第二遍：空闲把老库字节慢慢复制到新扁平池。 */
    async migrate() {
      const ok = await confirmAction({
        title: '开始搬运',
        message: '将把尚未迁移的文件逐条复制到 ' + (this.targetVol ? ('卷「' + this.targetVol.label + '」') : '默认库根') + '。\n\n'
          + '· 加密文件会在搬运时自动解密，落到目标盘的是明文；\n'
          + '· 默认低并发，不影响正常读写；\n'
          + '· 随时可以暂停，断电也不会丢数据（已完成的不会重搬）；\n'
          + '· 源文件（老库）不会被删除，搬完后由你手动处理。',
        confirmText: '开始搬运',
      })
      if (!ok) return
      this.busy = 'migrate'
      const r = await send('/privhub/api/storage/legacy-migrate', {
        method: 'POST',
        body: JSON.stringify({ targetVolumeId: this.targetVolumeId || null }),
      })
      this.busy = ''
      if (!r.ok) { adminToast(r.error || '启动搬运失败', 'error'); return }
      /* 诚实反馈（2026-11-17 修）：后端在「没有待搬条目」时回 started:false + 说明，
       * 以前这里无条件弹「搬运已启动」，把真相吞掉 —— 用户看到弹框却没有任何动作。
       * 现在按 started 分支：没启动就如实讲原因，并提示「已在库里的文件请用库搬迁」。 */
      if (r.data.started === false) {
        this.lastResult = r.data.message || '没有待迁移的老库条目'
        this.lastWarning = '这些文件可能早已搬进主库。要把库里的文件换盘 / 转明文，请用上方「🚚 库搬迁」，而不是老库迁移。'
        adminToast(this.lastResult, 'warn')
        await this.load()
        return
      }
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
              老库位置（源）
              <span class="ad-help" title="「老库」= 库根/默认地址，由程序固定解析（env PRIVHUB_DATA_FILES → config/store.json → 默认）。留空即用当前库根。也可以填外部老库的绝对路径（如 E:\\old\\data-files）。">ⓘ</span>
            </label>
            <input class="ad-input" v-model="oldRoot" :placeholder="status && status.dataFiles ? status.dataFiles : '留空 = 当前库根（默认地址）'" />
            <div class="ad-dim" style="margin-top:4px">留空即用当前库根；要搬外部老库才需要填。</div>
          </div>

          <!-- 目标卷（2026-11-16 新增）：把源上的文件搬到哪块盘。
               以前没有这个选择，字节只能落回默认池 —— 用户在新加的卷里
               永远看不到文件，而界面照样报"搬移完成"。 -->
          <div class="ad-field">
            <label class="ad-label">
              目标卷（搬到哪）
              <span class="ad-help" title="选择要把文件搬到哪块存储卷。不选=默认库根。搬过去时若源是密文会自动解密。">ⓘ</span>
            </label>
            <select class="ad-input" v-model="targetVolumeId">
              <option :value="''">默认库根（不换盘）</option>
              <option v-for="v in volumes" :key="v.id" :value="v.id" :disabled="v.enabled === false">
                {{ v.label }} — {{ v.root }}{{ v.enabled === false ? '（已停用）' : '' }}
              </option>
            </select>
            <div v-if="targetVolMissing" class="ad-dim" style="margin-top:4px;color:var(--ad-warn)">
              还没挂载其他卷。先在下面「存储卷」段挂一块新卷，才能跨盘搬运。
            </div>
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
          <!-- 就地迁移等提示：必须显出来，否则用户无从判断"为什么点了没变化" -->
          <div v-if="lastWarning" class="ad-warn-block" style="margin-top:8px;line-height:1.7">{{ lastWarning }}</div>
        </div>

        <div class="ad-section-card" v-if="status">
          <div class="ad-section-card-head"><span class="ad-section-card-title">📊 进度</span></div>
          <div class="ad-kv"><span class="ad-kv-k">概况</span><span class="ad-kv-v">{{ totalsText }}</span></div>
          <div class="ad-kv"><span class="ad-kv-k">完成度</span><span class="ad-kv-v">{{ pct }}%</span></div>
          <div class="ad-progress"><div class="ad-progress-bar" :style="{ width: pct + '%' }"></div></div>
          <!-- 已全部搬完时给明确结论：否则再点「开始搬运」数字毫无变化，会被误判成"没搬" -->
          <div v-if="doneHint" class="ad-dim" style="margin-top:8px;line-height:1.7">{{ doneHint }}</div>
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
