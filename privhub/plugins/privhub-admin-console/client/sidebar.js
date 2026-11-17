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

/** 组内「更多」展开状态的持久化键（2026-11-17：展开过的组，下次进来还开着）。 */
const MORE_OPEN_KEY = 'privhub_admin_more_open'
function readMoreOpen() {
  try {
    const v = JSON.parse(localStorage.getItem(MORE_OPEN_KEY) || '{}')
    return v && typeof v === 'object' ? v : {}
  } catch { return {} }
}

const AdminSidebar = {
  name: 'admin-sidebar',
  data() { return { st: adminState, expanded: readMoreOpen() } },
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
    /**
     * 该组是否展开「更多」。
     *
     * 默认收起 —— 19 项平铺太难扫（主人 2026-11-16 反馈「有点儿乱」）。
     * 但当前所在项若被收在 more 里，必须让它可见：否则用户会以为自己的位置丢了。
     */
    isOpen(g) {
      if (this.expanded[g.id] === true) return true
      return (g.more || []).some((it) => this.isActive(it.key))
    },
    toggle(g) {
      this.expanded = { ...this.expanded, [g.id]: !this.isOpen(g) }
      try { localStorage.setItem(MORE_OPEN_KEY, JSON.stringify(this.expanded)) } catch { /* 隐私模式 */ }
    },
  },
  template: `
    <aside class="ad-side" :class="{ collapsed: st.sidebarCollapsed, open: st.drawerOpen }">
      <!-- 窄屏抽屉的关闭按钮（桌面不显示）。不再设「管理控制台」标题头——
           那与顶栏面包屑重复，是减层要去掉的冗余（2026-11-17）。 -->
      <button class="ad-iconbtn ad-side-close" title="关闭导航" aria-label="关闭导航" @click="closeDrawer">✕</button>
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
          <!-- 组内低频项：默认收起，点「更多 N 项」展开 -->
          <template v-if="(g.more || []).length > 0">
            <div
              v-for="it in (isOpen(g) ? g.more : [])" :key="it.key"
              class="ad-nav-item ad-nav-more-item"
              :class="{ on: isActive(it.key), pending: it.pending }"
              :title="tip(it)"
              :aria-current="isActive(it.key) ? 'page' : null"
              @click="open(it.key)"
            >
              <span class="ad-nav-icon">{{ it.icon }}</span>
              <span class="ad-nav-text">{{ it.label }}</span>
              <span v-if="it.pending" class="ad-nav-pending">待接入</span>
            </div>
            <button class="ad-nav-more" @click="toggle(g)">
              {{ isOpen(g) ? '− 收起' : '+ 更多 ' + g.more.length + ' 项' }}
            </button>
          </template>
        </div>
      </nav>
    </aside>
  `,
}

export { AdminSidebar }
