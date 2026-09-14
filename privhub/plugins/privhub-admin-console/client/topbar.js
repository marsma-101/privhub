/**
 * topbar — 管理控制台顶部栏（固定 56px）。
 *
 * 左：抽屉按钮（<1024px）+ 侧栏折叠 + 面包屑
 * 中：全局搜索框（第一阶段只做 UI，提交时明确告知搜索范围）
 * 右：刷新 / 返回文件 / 管理员头像
 *
 * @module privhub-admin-console/client/topbar
 */

import { AUTH } from './deps.js'
import { AdminBreadcrumb } from './breadcrumb.js'
import { adminState, setCollapsed } from './store.js'

const AdminTopbar = {
  name: 'admin-topbar',
  components: { AdminBreadcrumb },
  props: {
    /** 面包屑条目：[{ label, key }]（由 AdminShell 计算后传入） */
    breadcrumb: { type: Array, default: () => [] },
  },
  emits: ['crumb', 'back', 'refresh'],
  data() { return { auth: AUTH, st: adminState, q: '' } },
  computed: {
    user() { return this.auth.user || {} },
    displayName() { return this.user.displayName || this.user.username || '管理员' },
    initial() { return this.displayName ? this.displayName.slice(0, 1) : '管' },
    isAdmin() { return this.user.role === 'admin' },
  },
  methods: {
    setCollapsed,
    toggleDrawer() { this.st.drawerOpen = !this.st.drawerOpen },
    onSearch() {
      // 第一阶段：搜索只做 UI。明确告知范围，而不是给一个点了没反应的输入框。
      window.PrivHub.toast(
        this.q.trim()
          ? '全局搜索将在后续阶段接入（范围：用户、项目、规则、日志）'
          : '输入关键词后回车（范围：用户、项目、规则、日志）',
        'warn'
      )
    },
    backToFiles() { this.$emit('back') },
    refresh() { this.$emit('refresh') },
  },
  template: `
    <div class="ad-topbar">
      <button class="ad-iconbtn ad-drawer-btn" title="打开管理导航" @click="toggleDrawer">☰</button>
      <button
        class="ad-iconbtn ad-collapse-btn"
        :title="st.sidebarCollapsed ? '展开侧栏' : '折叠侧栏'"
        @click="setCollapsed(!st.sidebarCollapsed)"
      >{{ st.sidebarCollapsed ? '»' : '«' }}</button>

      <AdminBreadcrumb :items="breadcrumb" @pick="$emit('crumb', $event)"></AdminBreadcrumb>

      <form class="ad-search" @submit.prevent="onSearch">
        <span class="ad-search-icon">🔍</span>
        <input
          class="ad-search-input"
          v-model="q"
          type="search"
          placeholder="搜索用户、项目、规则、日志"
          title="全局搜索（后续阶段接入）"
          aria-label="全局搜索"
        />
      </form>

      <div class="ad-topbar-right">
        <span class="ad-role-badge" :class="{ admin: isAdmin }">{{ isAdmin ? '👑 管理员' : '👤 普通用户' }}</span>
        <button class="ad-btn ad-btn-sm" title="重新加载当前管理页数据" @click="refresh">↻ 刷新</button>
        <button class="ad-btn ad-btn-sm" title="返回文件浏览（下次进入管理控制台会回到当前位置）" @click="backToFiles">← 返回文件</button>
        <div class="ad-me" :title="displayName">
          <div class="ad-avatar">{{ initial }}</div>
          <span class="ad-me-name">{{ displayName }}</span>
        </div>
      </div>
    </div>
  `,
}

export { AdminTopbar }
