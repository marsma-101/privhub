/**
 * topbar — 管理控制台顶部栏（固定 56px，管理视图里**唯一**的横带）。
 *
 * 2026-11-17 减层重构（主人反馈：横向标题栏分了太多层、两个侧栏、可点的太多）：
 *   · 框架的 T2 位置链在管理视图里不再渲染（见 index.html），本顶栏是唯一的头；
 *   · 删掉与全局顶栏重复的角色徽标 / 头像 / 用户名 —— 同屏出现两次身份，
 *     既占地方又让人疑惑「这两个是不是不同的东西」；
 *   · 只留五件事：开导航（窄屏）· 折叠侧栏 · 我在哪（面包屑）· 找什么（搜索）·
 *     怎么用（帮助）· 回文件。一屏的可点目标从 ~12 个降到 6 个。
 *
 * 搜索是全管理台唯一搜索框：页面直达（本地 0 请求）+ 用户/项目实体（防抖），
 * ↑↓ 选择、Enter 打开、Esc 关闭。
 *
 * @module privhub-admin-console/client/topbar
 */

import { AUTH, api } from './deps.js'
import { AdminBreadcrumb } from './breadcrumb.js'
import { adminState, setCollapsed } from './store.js'
import { searchRoutes } from './routes.js'
import { openAdminRoute, on as busOn } from './panelbus.js'

const AdminTopbar = {
  name: 'admin-topbar',
  components: { AdminBreadcrumb },
  props: {
    /** 面包屑条目：[{ label, key }]（由 AdminShell 计算后传入） */
    breadcrumb: { type: Array, default: () => [] },
  },
  emits: ['crumb', 'back', 'refresh', 'help'],
  data() {
    return {
      auth: AUTH, st: adminState,
      q: '', open: false, hi: 0,
      users: null, projects: null, entLoading: false,
      _entTimer: null, _entSeq: 0,
    }
  },
  computed: {
    /** 页面候选（本地，0 请求；含 hidden 别名与未装载标记）。 */
    pageHits() { return searchRoutes(this.q).slice(0, 8) },
    /** 实体候选：用户 + 项目，各限 4 条，避免下拉过长。 */
    entityHits() {
      const s = String(this.q || '').trim().toLowerCase()
      if (s === '') return []
      const out = []
      for (const u of this.users || []) {
        const name = String(u.username || '')
        const disp = String(u.displayName || '')
        if (name.toLowerCase().includes(s) || disp.toLowerCase().includes(s)) {
          out.push({ kind: 'user', icon: '👤', label: disp || name, sub: '@' + name, key: 'access/users' })
        }
        if (out.length >= 4) break
      }
      let n = 0
      for (const p of this.projects || []) {
        const name = String(p || '')
        if (name.toLowerCase().includes(s)) {
          out.push({ kind: 'project', icon: '📁', label: name, sub: '项目', key: 'access/projects' })
          if (++n >= 4) break
        }
      }
      return out
    },
    /** 下拉分组（空组不渲染）。 */
    groups() {
      const g = []
      if (this.pageHits.length > 0) g.push({ id: 'pages', title: '管理页面', items: this.pageHits.map((p) => ({ kind: 'page', icon: p.icon, label: p.label, sub: p.pending ? '未装载' : '', key: p.key, pending: p.pending })) })
      if (this.entityHits.length > 0) g.push({ id: 'entities', title: '用户与项目', items: this.entityHits })
      return g
    },
    flat() { return this.groups.flatMap((g) => g.items) },
    hasQuery() { return String(this.q || '').trim() !== '' },
  },
  watch: {
    q(v) {
      this.hi = 0
      this.open = String(v || '').trim() !== ''
      this.scheduleEntities()
    },
    flat(list) { if (this.hi >= list.length) this.hi = Math.max(0, list.length - 1) },
  },
  methods: {
    setCollapsed,
    toggleDrawer() { this.st.drawerOpen = !this.st.drawerOpen },
    backToFiles() { this.$emit('back') },
    refresh() { this.$emit('refresh') },
    showHelp() { this.$emit('help') },

    /* ---- 搜索：实体取数（防抖 + 竞态保护 + 失败静默降级） ---- */
    scheduleEntities() {
      clearTimeout(this._entTimer)
      const s = String(this.q || '').trim()
      if (s === '') { this.entLoading = false; return }
      /* 已拉过全量小接口就直接本地过滤，不重复请求（名册/项目列表都很小）。 */
      if (this.users !== null && this.projects !== null) return
      this._entTimer = setTimeout(() => { void this.fetchEntities() }, 180)
    },
    async fetchEntities() {
      const seq = ++this._entSeq
      this.entLoading = true
      const [u, p] = await Promise.all([
        api('/privhub/api/admin/users').catch(() => null),
        api('/privhub/api/projects').catch(() => null),
      ])
      if (seq !== this._entSeq) return   // 已有更新的输入，丢弃本次结果
      this.entLoading = false
      if (u && u.ok && Array.isArray(u.users)) this.users = u.users
      if (p && p.ok && Array.isArray(p.projects)) this.projects = p.projects
    },

    /* ---- 键盘与选择 ---- */
    onKeydown(e) {
      const n = this.flat.length
      if (e.key === 'ArrowDown') { e.preventDefault(); if (n > 0) { this.open = true; this.hi = (this.hi + 1) % n } }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (n > 0) { this.open = true; this.hi = (this.hi - 1 + n) % n } }
      else if (e.key === 'Escape') { this.open = false }
    },
    onSearch() {
      /* Enter：打开高亮项；没有候选但有输入时，给明确提示而不是静默。 */
      const item = this.flat[this.hi] || this.flat[0]
      if (item) this.pick(item)
      else if (this.hasQuery) window.PrivHub.toast('没有匹配「' + this.q.trim() + '」的管理页面、用户或项目', 'warn')
    },
    pick(item) {
      if (!item) return
      this.open = false
      this.q = ''
      if (item.pending) { window.PrivHub.toast('「' + item.label + '」所属插件未装载，恢复后即可使用', 'warn'); return }
      openAdminRoute(item.key)
    },
    onBlur() {
      /* 延迟关闭：给候选项的 click 留出处理窗口（blur 先于 click 触发）。 */
      setTimeout(() => { this.open = false }, 150)
    },
    onFocus() { if (this.hasQuery) this.open = true },
    /** 某项在扁平列表里的序号（用于高亮与 aria）。 */
    indexOf(item) { return this.flat.indexOf(item) },
  },
  beforeUnmount() { clearTimeout(this._entTimer); if (this._offSearch) this._offSearch() },
  mounted() {
    /* 新手引导「试试搜索」：填词 + 聚焦 + 展开候选，让新手立刻看到搜索怎么用。 */
    this._offSearch = busOn('admin:search', ({ q }) => {
      this.q = q
      this.open = true
      this.$nextTick(() => {
        const el = this.$el && this.$el.querySelector('.ad-search-input')
        if (el) el.focus()
      })
    })
  },
  template: `
    <div class="ad-topbar">
      <button class="ad-iconbtn ad-drawer-btn" title="打开管理导航" aria-label="打开管理导航" @click="toggleDrawer">☰</button>
      <button
        class="ad-iconbtn ad-collapse-btn"
        :title="st.sidebarCollapsed ? '展开侧栏' : '折叠侧栏'"
        :aria-label="st.sidebarCollapsed ? '展开侧栏' : '折叠侧栏'"
        @click="setCollapsed(!st.sidebarCollapsed)"
      >{{ st.sidebarCollapsed ? '»' : '«' }}</button>

      <AdminBreadcrumb :items="breadcrumb" @pick="$emit('crumb', $event)"></AdminBreadcrumb>

      <form class="ad-search" role="search" @submit.prevent="onSearch">
        <span class="ad-search-icon">🔍</span>
        <input
          class="ad-search-input"
          v-model="q"
          type="search"
          placeholder="搜索管理页面、用户、项目…"
          title="输入页名 / 用户名 / 项目名，↑↓ 选择，回车打开"
          aria-label="管理台全局搜索"
          role="combobox" aria-autocomplete="list"
          :aria-expanded="open ? 'true' : 'false'"
          @keydown="onKeydown" @focus="onFocus" @blur="onBlur"
        />
        <div v-if="open && hasQuery" class="ad-search-pop" role="listbox">
          <template v-if="flat.length > 0">
            <div v-for="g in groups" :key="g.id" class="ad-search-group">
              <div class="ad-search-group-title">{{ g.title }}</div>
              <div
                v-for="it in g.items" :key="g.id + ':' + it.label"
                class="ad-search-item" :class="{ on: indexOf(it) === hi, pending: it.pending }"
                role="option" :aria-selected="indexOf(it) === hi ? 'true' : 'false'"
                @mousedown.prevent @click="pick(it)" @mouseenter="hi = indexOf(it)"
              >
                <span class="ad-search-item-icon">{{ it.icon }}</span>
                <span class="ad-search-item-label">{{ it.label }}</span>
                <span v-if="it.sub" class="ad-search-item-sub">{{ it.sub }}</span>
              </div>
            </div>
            <div class="ad-search-hint">↑↓ 选择 · 回车打开 · Esc 关闭</div>
          </template>
          <div v-else class="ad-search-empty">
            {{ entLoading ? '正在搜索用户与项目…' : '没有匹配「' + q.trim() + '」的页面、用户或项目' }}
          </div>
        </div>
      </form>

      <div class="ad-topbar-right">
        <button class="ad-iconbtn ad-help-btn" title="怎么用管理控制台（30 秒上手）" aria-label="使用帮助" @click="showHelp">?</button>
        <button class="ad-iconbtn" title="重新加载当前页数据" aria-label="刷新当前页" @click="refresh">↻</button>
        <button class="ad-btn ad-btn-sm ad-back-btn" title="返回文件浏览（下次进入会回到当前位置）" @click="backToFiles">← 返回文件</button>
      </div>
    </div>
  `,
}

export { AdminTopbar }
