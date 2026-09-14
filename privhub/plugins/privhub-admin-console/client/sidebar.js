/**
 * sidebar — 管理导航侧栏（240px，可折叠 64px）。
 *
 * 分组按【管理员职责】：概览 / 用户与权限 / 内容治理 / 系统运维。
 * 条目数据来自 routes.js（每个条目的视图由哪个插件提供，在那边判定）。
 *
 * 折叠态：只显示图标，用 title 提供 tooltip（不大量使用纯图标按钮，折叠是例外）。
 *
 * @module privhub-admin-console/client/sidebar
 */

import { adminState, setCollapsed } from './store.js'
import { navModel } from './routes.js'
import { openAdminRoute } from './panelbus.js'

const AdminSidebar = {
  name: 'admin-sidebar',
  data() { return { st: adminState } },
  computed: {
    groups() { return navModel() },
  },
  methods: {
    setCollapsed,
    open(key) { openAdminRoute(key) },
    isActive(key) { return this.st.activeSubView === key },
    closeDrawer() { this.st.drawerOpen = false },
    /** 折叠态下鼠标悬停的提示（含「暂未接入」说明） */
    tip(it) {
      if (it.pending) return it.label + '（所属插件未装载）'
      return it.label + (it.provider ? ' · ' + it.provider : '')
    },
  },
  template: `
    <aside class="ad-side" :class="{ collapsed: st.sidebarCollapsed, open: st.drawerOpen }">
      <div class="ad-side-head">
        <span class="ad-side-logo">🛠️</span>
        <span class="ad-side-title">管理控制台</span>
        <button class="ad-iconbtn ad-side-close" title="关闭" @click="closeDrawer">✕</button>
      </div>
      <nav class="ad-side-body">
        <div v-for="g in groups" :key="g.id" class="ad-group">
          <div class="ad-group-title" :title="g.title">{{ g.icon }}<span class="ad-group-text">{{ g.title }}</span></div>
          <div
            v-for="it in g.items" :key="it.key"
            class="ad-nav-item"
            :class="{ on: isActive(it.key), pending: it.pending }"
            :title="tip(it)"
            :aria-current="isActive(it.key) ? 'page' : null"
            @click="open(it.key)"
          >
            <span class="ad-nav-icon">{{ it.icon }}</span>
            <span class="ad-nav-text">{{ it.label }}</span>
            <span v-if="it.pending" class="ad-nav-pending">待接入</span>
          </div>
        </div>
      </nav>
      <div class="ad-side-foot">
        <span class="ad-side-foot-text">共 {{ groups.length }} 个分区</span>
      </div>
    </aside>
  `,
}

export { AdminSidebar }
