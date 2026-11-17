/**
 * shell — 管理控制台外壳（admin-console slot 的根组件）。
 *
 * 2026-11-17 减层后的结构（主人反馈：横带太多、双侧栏、可点的太多、没引导）：
 *   ┌ AdminTopbar：位置（面包屑=页标题）/ 搜索 / 帮助 / 返回 ── 唯一横带 ┐
 *   ├ AdminSidebar（240px，可折叠 64px）┬ 内容区（直接是页面本体）──────┤
 *   └───────────────────────────────────┴──────────────────────────────┘
 *   + AdminGuide（首次进入自动弹一次；顶栏 ? 可随时重看）
 *
 * 减掉的：
 *   · 框架 T2 位置链（在管理视图不渲染，见 index.html）——不再重复一条头；
 *   · 内容区顶部的「页标题 + 刷新」条（AdminSectionHeader 不再渲染）——
 *     页标题由面包屑末级承担（加粗），刷新收进顶栏，少一条横带；
 *   · 顶栏的角色徽标/头像（与全局顶栏重复）。
 *   sectionheader.js 文件保留（integrity 契约要求存在），只是不再挂进渲染。
 *
 * 职责：渲染顶栏与左导航；把 routes 条目解析成「挂哪个 slot 的组件」；
 *       只改 hash 与状态，视图切换交给骨架 nav。
 *
 * @module privhub-admin-console/client/shell
 */

import { nav } from './deps.js'
import { adminState } from './store.js'
import { ROUTE_MAP, SECTIONS } from './routes.js'
import { enterOnce, bindPanelBus, leaveConsole, navigate } from './action.js'
import { focusSearch } from './panelbus.js'
import { AdminTopbar } from './topbar.js'
import { AdminSidebar } from './sidebar.js'
import { AdminGuide } from './guide.js'
import {
  AdminConfirmDialog, AdminToast, AdminListDetail, AdminDataTable,
  AdminBulkBar, AdminEmptyState, AdminSkeleton, AdminErrorState,
} from './ui.js'
import { OverviewPanel, ProjectsPanel, PublishPanel, BackupPanel, WatermarkPanel, MigratePanel, DoctorPanel } from './panels.js'
import { StoragePanel, STORAGE_PANEL_CSS } from './storage-panel.js'

/** 由本插件自渲染的面板（builtin 名 → 组件）。 */
const BUILTINS = {
  overview: OverviewPanel,
  projects: ProjectsPanel,
  publish: PublishPanel,
  backup: BackupPanel,
  migrate: MigratePanel,
  doctor: DoctorPanel,
  watermark: WatermarkPanel,
  /* 存储（2026-11-16 合并）：卷管理 + 数据形态 + 老库迁移同页。
   * 「存储卷」与「存储迁移」两个入口都指向它（后者作为别名保留旧链接）。 */
  storage: StoragePanel,
}

const AdminShell = {
  name: 'admin-shell',
  components: {
    AdminTopbar, AdminSidebar, AdminGuide, AdminConfirmDialog, AdminToast,
    AdminListDetail, AdminDataTable, AdminBulkBar, AdminEmptyState, AdminSkeleton, AdminErrorState,
  },
  props: {
    /** 骨架按 slot 注入的全部插件组件：{ slot: [component, ...] } */
    slotComps: { type: Object, default: () => ({}) },
  },
  data() {
    return { st: adminState, nav, reloadSeq: 0, guideOpen: false }
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
    /** 面包屑 = 位置 + 页标题（末级加粗）。不再另设页标题横带。 */
    breadcrumb() {
      const arr = [{ label: '管理控制台', key: 'overview' }]
      if (this.section && this.route && this.route.key !== 'overview') {
        arr.push({ label: this.section.title, key: this.route.key })
      }
      if (this.route && this.route.key !== 'overview') arr.push({ label: this.route.label })
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
    /* 首次进入自动给一次上手引导（看过一次就不再自动弹；顶栏 ? 可重看）。 */
    try {
      if (localStorage.getItem('privhub_admin_guide_seen') !== '1') this.guideOpen = true
    } catch { /* 隐私模式：不自动弹，仍可用 ? 手动打开 */ }
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
    openGuide() { this.guideOpen = true },
    closeGuide() {
      this.guideOpen = false
      try { localStorage.setItem('privhub_admin_guide_seen', '1') } catch { /* 忽略 */ }
    },
    onTrySearch(q) { focusSearch(q) },
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
        @help="openGuide"
      ></AdminTopbar>

      <div class="ad-body">
        <AdminSidebar></AdminSidebar>
        <div class="ad-drawer-mask" v-if="st.drawerOpen" @click="closeDrawer"></div>

        <main class="ad-content ph-scroll">
          <div class="ad-content-inner">
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
                :reload-token="reloadSeq"
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

      <AdminGuide :open="guideOpen" @close="closeGuide" @try-search="onTrySearch"></AdminGuide>
      <AdminConfirmDialog></AdminConfirmDialog>
      <AdminToast></AdminToast>
    </div>
  `,
}

export { AdminShell, BUILTINS }
