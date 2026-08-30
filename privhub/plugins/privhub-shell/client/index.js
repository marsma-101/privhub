/**
 * privhub-shell · client — 页面骨架插件（组件集）
 *
 * 骨架自身的 UI 组件，按 slot 挂载：
 *   - project-tabs：顶栏项目横排（欢迎 + 项目 + ➕ 添加项目）
 *   - user-area：顶栏右侧用户区（徽章/头像/用户名/侧栏开关/退出）
 *   - app-iconbar：工作区图标栏容器（渲染各插件 manifest barItems）
 *   - welcome：欢迎页
 *
 * 通信：全部通过 window.PrivHub 桥（nav 导航状态机 / api / AUTH /
 * barItems 图标栏数据 / badges 角标）。
 *
 * @module privhub-shell/client
 */

const { api, AUTH, nav, barItems, badges } = window.PrivHub

/* ============ 顶栏：欢迎 + 项目下拉（项目多时避免溢出）+ 添加 ============ */
const ProjectTabs = {
  name: 'shell-project-tabs',
  data() { return { nav } },
  computed: {
    isAdmin() { return AUTH.user && AUTH.user.role === 'admin' },
  },
  methods: {
    onSelect(e) {
      const v = e.target.value
      if (v) nav.openProject(v)
      e.target.value = nav.project || '' // 还原为当前项目
    },
  },
  template: `
    <div class="project-tabs">
      <div class="ptab" :class="{ on: nav.project === null && !nav.trashView && !nav.searchView && !nav.favView }" @click="nav.backToWelcome">🏠 欢迎</div>
      <span class="project-select-wrap">
        <span class="project-select-label">选择项目：</span>
        <select class="project-select" :value="nav.project || ''" @change="onSelect" title="选择项目">
          <option value="" disabled>选择项目…</option>
          <option v-for="p in nav.projectsList" :key="p" :value="p">{{ p }}</option>
        </select>
      </span>
      <div v-if="isAdmin" class="plus-btn" title="添加项目" @click="nav.newProject">＋</div>
    </div>
  `,
}

/* ============ 顶栏：右侧用户区 ============ */
const TopbarUser = {
  name: 'shell-topbar-user',
  data() { return { auth: AUTH, nav } },
  computed: {
    isAdmin() { return this.auth.user && this.auth.user.role === 'admin' },
    displayName() {
      const u = this.auth.user
      return u ? (u.displayName || u.username) : ''
    },
    initial() { return this.displayName ? this.displayName[0] : '' },
  },
  template: `
    <span class="badge" :class="{ admin: isAdmin }">{{ isAdmin ? '👑 管理员' : '👤 普通用户' }}</span>
    <div class="avatar">{{ initial }}</div>
    <span class="uname">{{ displayName }}</span>
    <button class="icon-btn" :class="{ on: nav.rightOpen }" @click="nav.rightOpen = !nav.rightOpen">{{ nav.rightOpen ? '收起侧栏' : '打开侧栏' }}</button>
    <button class="icon-btn" @click="nav.doLogout">退出</button>
  `,
}

/* ============ 图标栏容器（渲染各插件 barItems；底部固定管理组） ============ */
const AppIconbar = {
  name: 'shell-app-iconbar',
  data() { return { barItems, badges, nav } },
  computed: {
    // 业务功能（上部）
    topItems() {
      const bottom = new Set(['settings', 'admin', 'acl', 'audit'])
      return this.barItems.filter((bi) => !bottom.has(bi.view || bi.slot))
    },
    // 底部管理组（渲染顺序=自上而下：审计 → 权限管理 → 用户管理 → 设置，即设置在最底部）
    bottomItems() {
      const order = ['audit', 'acl', 'admin', 'settings']
      return order.map((v) => this.barItems.find((bi) => (bi.view || bi.slot) === v)).filter(Boolean)
    },
  },
  methods: {
    openBar(bi) { window.PrivHub.openBarItem(bi) },
  },
  template: `
    <div class="appbar">
      <div
        v-for="bi in topItems" :key="bi.title"
        class="abar-item"
        :class="{ on: (bi.view || bi.slot) === 'files' ? (nav.project !== null && !nav.trashView) : (bi.view || bi.slot) === 'trash' ? nav.trashView : false }"
        :title="bi.title"
        @click="openBar(bi)"
      >
        {{ bi.icon }}<span v-if="(bi.view || bi.slot) === 'trash' && badges.trash > 0" class="abar-badge">{{ badges.trash }}</span>
      </div>
      <div class="abar-spacer"></div>
      <div
        v-for="bi in bottomItems" :key="bi.title"
        class="abar-item abar-bottom"
        :class="{ on: (bi.view || bi.slot) === 'settings' ? true : false }"
        :title="bi.title"
        @click="openBar(bi)"
      >
        {{ bi.icon }}
      </div>
    </div>
  `,
}

/* ============ 欢迎页 ============ */
const WelcomeView = {
  name: 'shell-welcome',
  template: `
    <div class="main-welcome">
      <div class="big">欢迎使用私域枢纽 · 公司文件管理系统</div>
      <div>请在顶栏点击项目开始浏览文件</div>
    </div>
  `,
}

export default {
  id: 'privhub-shell',
  slots: {
    'project-tabs': ProjectTabs,
    'user-area': TopbarUser,
    'app-iconbar': AppIconbar,
    welcome: WelcomeView,
  },
}
