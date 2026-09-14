/**
 * shell — 管理控制台外壳（admin-console slot 的根组件）。
 *
 * 结构：
 *   ┌ AdminTopbar：面包屑 / 全局搜索 / 刷新 / 返回文件 ─────────────┐
 *   ├ AdminSidebar（240px，可折叠 64px）┬ AdminContent ─────────────┤
 *   └───────────────────────────────────┴──────────────────────────┘
 *
 * 职责：
 *   - 渲染顶部栏与左侧管理导航；
 *   - 把 [[routes]] 里的每个条目解析成「要挂哪个 slot 的组件」，并渲染成内容区；
 *   - 挂载统一 toast / confirm 容器，并把 ui.js 的复用件注册进来，
 *     供本插件各页面模板直接使用（PascalCase 与 kebab-case 两种写法均可）；
 *   - 与骨架分工：**只改 hash 与状态**，视图切换交给骨架的 nav（openAdmin 等入口不变）。
 *
 * 渲染出的结构（对应 CSS 类）：.admin-root > .ad-topbar + .ad-body(.ad-side + .ad-content) + 弹窗
 *
 * @module privhub-admin-console/client/shell
 */

import { nav } from './deps.js'
import { adminState } from './store.js'
import { ROUTE_MAP, SECTIONS } from './routes.js'
import { enterOnce, bindPanelBus, leaveConsole, navigate } from './action.js'
import { AdminTopbar } from './topbar.js'
import { AdminSidebar } from './sidebar.js'
import { AdminSectionHeader } from './sectionheader.js'
import {
  AdminConfirmDialog, AdminToast, AdminListDetail, AdminDataTable,
  AdminBulkBar, AdminEmptyState, AdminSkeleton, AdminErrorState,
} from './ui.js'
import { OverviewPanel, ProjectsPanel, PublishPanel, BackupPanel, WatermarkPanel } from './panels.js'

/** 由本插件自渲染的面板（builtin 名 → 组件）。 */
const BUILTINS = {
  overview: OverviewPanel,
  projects: ProjectsPanel,
  publish: PublishPanel,
  backup: BackupPanel,
  watermark: WatermarkPanel,
}

const AdminShell = {
  name: 'admin-shell',
  components: {
    AdminTopbar, AdminSidebar, AdminSectionHeader, AdminConfirmDialog, AdminToast,
    AdminListDetail, AdminDataTable, AdminBulkBar, AdminEmptyState, AdminSkeleton, AdminErrorState,
  },
  props: {
    /** 骨架按 slot 注入的全部插件组件：{ slot: [component, ...] } */
    slotComps: { type: Object, default: () => ({}) },
  },
  data() {
    return { st: adminState, nav, reloadSeq: 0 }
  },
  computed: {
    route() { return ROUTE_MAP[this.st.activeSubView] || null },
    section() { return SECTIONS.find((s) => s.id === this.st.activeSection) || null },
    /** 当前条目要挂的组件列表（同 slot 多组件按数组渲染）。 */
    viewComps() {
      const r = this.route
      if (!r || !r.slot) return []
      const arr = this.slotComps[r.slot]
      return Array.isArray(arr) ? arr : []
    },
    hasView() { return this.viewComps.length > 0 },
    builtinComp() {
      const r = this.route
      if (!r || !r.builtin) return null
      return BUILTINS[r.builtin] || null
    },
    /** 「未安装」只发生在插件未装载时（条目仍在侧栏，点进来给可见原因）。 */
    missing() {
      const r = this.route
      if (!r) return true
      if (r.builtin) return !this.builtinComp
      return !this.hasView
    },
    breadcrumb() {
      const arr = [{ label: '管理控制台', key: 'overview' }]
      if (this.section) arr.push({ label: this.section.title, key: this.route ? this.route.key : 'overview' })
      if (this.route) arr.push({ label: this.route.label })
      return arr
    },
    /** 内容区重挂 key：换页或点刷新都会重挂，从而真正重新拉数据。 */
    viewKey() {
      return (this.st.activeSubView || 'none') + '#' + this.reloadSeq
    },
    isMobileDetail() { return this.st.mobileDetail },
  },
  watch: {
    'nav.activeView'(v) {
      // 回到文件视图：清掉管理路由地址（下次进来回到上次位置，靠 localStorage 记忆）
      if (v !== 'admin') leaveConsole()
    },
  },
  mounted() {
    this._offPanel = bindPanelBus()
    enterOnce()
  },
  beforeUnmount() {
    if (this._offPanel) this._offPanel()
  },
  methods: {
    reload() { this.reloadSeq++ },
    backToFiles() { nav.setActiveView('files') },
    onCrumb(item) {
      if (item && item.key) navigate(item.key)
    },
    toggleMobileDetail() { this.st.mobileDetail = !this.st.mobileDetail },
    closeDrawer() { this.st.drawerOpen = false },
  },
  template: `
    <div class="admin-root" :class="{ 'side-collapsed': st.sidebarCollapsed, 'side-drawer-open': st.drawerOpen }">
      <AdminTopbar
        :breadcrumb="breadcrumb"
        @crumb="onCrumb"
        @back="backToFiles"
        @refresh="reload"
      ></AdminTopbar>

      <div class="ad-body">
        <AdminSidebar></AdminSidebar>
        <div class="ad-drawer-mask" v-if="st.drawerOpen" @click="closeDrawer"></div>

        <main class="ad-content">
          <div class="ad-content-inner">
            <AdminSectionHeader
              v-if="route"
              :title="route.label"
              :meta="missing ? '所属插件未装载' : ''"
              @refresh="reload"
            >
              <template #actions>
                <button
                  v-if="st.mobileDetail"
                  class="ad-btn ad-btn-sm ad-detail-toggle"
                  title="返回列表"
                  @click="toggleMobileDetail"
                >← 列表</button>
                <button
                  v-else-if="!st.mobileDetail && hasView"
                  class="ad-btn ad-btn-sm ad-detail-toggle"
                  title="查看详情"
                  @click="toggleMobileDetail"
                >详情 →</button>
              </template>
            </AdminSectionHeader>

            <div class="ad-view">
              <AdminErrorState
                v-if="missing"
                :message="'「' + (route ? route.label : '该页面') + '」暂不可用'"
                detail="承载该页面的插件当前没有装载（或未声明对应的 admin-view slot）。侧栏位置会保留，插件恢复后即可使用。"
                retry-text="重新检测"
                @retry="reload"
              ></AdminErrorState>

              <component
                v-else-if="builtinComp"
                :is="builtinComp"
                :key="viewKey"
              ></component>

              <component
                v-for="c in viewComps"
                v-else
                :is="c"
                :key="viewKey + ':' + c.name"
              ></component>
            </div>
          </div>
        </main>
      </div>

      <AdminConfirmDialog></AdminConfirmDialog>
      <AdminToast></AdminToast>
    </div>
  `,
}

export { AdminShell, BUILTINS }
