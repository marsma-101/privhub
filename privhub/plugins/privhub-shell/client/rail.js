/**
 * rail — L0 全局框架的左侧导航（issue #3 交互原型本体）
 *
 * ## 它是什么
 * 原型把界面分成「顶栏 + 左 rail + 内容区」三段常驻框架。本组件就是那条左 rail：
 * 按**使用场景**分组（驾驶舱 / 管理），不按技术模块分组；导航项 ≤ 7；
 * 当前所在项有高亮；底部一句设计哲学帮助建立心智模型。
 *
 * ## 与既有导航的关系（一条不删）
 * rail 只承载**跨层入口**（项目总览 / 我的 / 管理控制台 / 智能体接入 / 全局思维导图 / 设置），
 * 项目内的十几个功能仍由 project-nav 的四 tab + 更多抽屉承载（选中项目后出现在内容区顶部）。
 * 两者读同一份 barItems（已按 cap/adminOnly 过滤），所以 rail 不会造出第二个功能名单。
 *
 * ## 两条安全/产品契约（与原型刻意不同，用词可改但行为不改）
 * · 管理控制台对非 admin **不渲染**（不是原型的「禁用可见」）—— admin-console.mjs 钉死。
 * · 个人入口叫「我的」，不出现「个人空间」字样 —— personal-ui.mjs D2 钉死。
 *
 * @module privhub-shell/client/rail
 */

import './proto-styles.js'
import { GLOBAL_ORDER, SYSTEM_ORDER, byOrder, viewKey } from './ia.js'

const { nav, barItems, AUTH } = window.PrivHub

/** rail 里「驾驶舱」组的固定两项（场景入口，不来自 barItems 的分组）。 */
const COCKPIT = [
  { view: 'home', icon: '📊', label: '项目总览' },
  { view: 'me', icon: '🗂', label: '我的' },
]

const Rail = {
  name: 'shell-rail',
  data() { return { nav, barItems } },
  computed: {
    isAdmin() { return !!(window.PrivHub && window.PrivHub.isManager && window.PrivHub.isManager()) },
    view() { return this.nav.activeView },
    project() { return this.nav.project },
    /** 当前在第几层（与 layer-bar 同口径，由 activeView 派生，不另存）。 */
    layer() {
      if (this.view === 'admin') return 'admin'
      if (this.view === 'home') return 'home'
      if (this.view === 'me') return 'me'
      return this.project !== null ? 'project' : 'home'
    },
    available() { return new Set(this.barItems.map(viewKey)) },
    hasHome() { return this.available.has('home') },
    hasMe() { return !!AUTH.user },
    /** 管理入口只在真的装得上时渲染（非 admin / 开关关掉 → 不渲染，安全契约）。 */
    hasAdmin() { return this.available.has('admin') },
    /**
     * 驾驶舱组：项目总览 + 我的。
     * 项目总览缺席（home 插件被关）时不渲染死入口；「我的」恒在（登录即有）。
     */
    cockpit() {
      return COCKPIT.filter((c) => (c.view === 'home' ? this.hasHome : this.hasMe))
    },
    /**
     * 全局组里除 home/me 之外的跨项目入口（智能体接入 / 全局思维导图），
     * 按 GLOBAL_ORDER 排序，只渲染装得上的。me 已在驾驶舱组，这里不重复。
     */
    globalItems() {
      const skip = new Set(['home', 'me'])
      return byOrder(GLOBAL_ORDER)(
        this.barItems.filter((b) => b.group === 'global' && !skip.has(viewKey(b))),
      )
    },
    /** 系统组：设置（管理控制台单独放管理组）。 */
    systemItems() {
      return byOrder(SYSTEM_ORDER)(
        this.barItems.filter((b) => b.group === 'system' && viewKey(b) !== 'admin'),
      )
    },
    /**
     * 展示区（看）：进去读东西 —— 项目总览 / 我的 / 智能体接入 / 全局思维导图。
     * 与「控制区」分开是主人 2026-11-14 的意见：把「看」和「管」分成两块，
     * 中间留弹性空白把控制区推到最底，视觉上就分得清哪些是读、哪些是改。
     */
    showItems() {
      const out = this.cockpit.slice()
      out.push(...this.globalItems)
      out.push(...this.extraItems)
      return out
    },
    /**
     * 控制区（管）：进去改配置 —— 管理控制台 → 设置（设置钉在最底）。
     * 管理控制台在设置**上面**：它影响所有人，权重高于只影响自己的设置。
     */
    controlItems() {
      const out = []
      if (this.hasAdmin) out.push({ view: 'admin', icon: '🛡', label: '管理控制台', fixed: true })
      out.push(...this.systemItems)
      return out
    },
    /** 未归组的跨项目条目（宁可多显，不静默吞掉）。 */
    extraItems() {
      const known = new Set(['files', 'knowledge', 'collab', 'ai', 'global', 'system'])
      return this.barItems.filter((b) => !known.has(b.group) && b.slot !== 'admin-nav')
    },
  },
  methods: {
    isActive(view) {
      if (view === 'home') return this.layer === 'home'
      if (view === 'me') return this.layer === 'me'
      if (view === 'admin') return this.layer === 'admin'
      return this.view === view
    },
    go(view) {
      if (view === 'home') { if (this.hasHome) this.nav.setActiveView('home', { noToggle: true }); return }
      if (view === 'me') { this.nav.setActiveView('me', { noToggle: true }); return }
      if (view === 'admin') { if (this.hasAdmin) this.nav.setActiveView('admin', { noToggle: true }); return }
      const bi = this.barItems.find((b) => viewKey(b) === view)
      if (bi) window.PrivHub.openBarItem(bi)
    },
  },
  template: `
    <nav class="ph-rail" aria-label="全局导航">
      <!-- 展示区（看）：进去读东西 -->
      <div class="ph-zone show">
        <div class="ph-zone-h"><i class="dot cyan"></i>展示区 · 看</div>
        <template v-for="c in cockpit" :key="'c-'+c.view">
          <button
            class="ph-nav" :class="{ active: isActive(c.view) }" type="button"
            :aria-current="isActive(c.view) ? 'page' : undefined"
            :title="c.label" :aria-label="c.label"
            @click="go(c.view)"
          ><span class="ic">{{ c.icon }}</span><span class="lbl">{{ c.label }}</span></button>
        </template>
        <button
          v-for="bi in globalItems" :key="'g-'+bi.title"
          class="ph-nav" :class="{ active: isActive(bi.view || bi.slot) }" type="button"
          :title="bi.desc || bi.title" :aria-label="bi.title"
          @click="go(bi.view || bi.slot)"
        ><span class="ic">{{ bi.icon }}</span><span class="lbl">{{ bi.title }}</span></button>
        <button
          v-for="bi in extraItems" :key="'x-'+bi.title"
          class="ph-nav" :class="{ active: isActive(bi.view || bi.slot) }" type="button"
          :title="bi.desc || bi.title" :aria-label="bi.title"
          @click="go(bi.view || bi.slot)"
        ><span class="ic">{{ bi.icon }}</span><span class="lbl">{{ bi.title }}</span></button>
      </div>

      <!-- 控制区（管）：进来改配置。弹性空白把它推到底，设置钉在最底 -->
      <div class="ph-zone control">
        <div class="ph-zone-h"><i class="dot amber"></i>控制区 · 管</div>
        <template v-if="hasAdmin">
          <button
            class="ph-nav" :class="{ active: isActive('admin') }" type="button"
            :aria-current="isActive('admin') ? 'page' : undefined"
            title="管理控制台：用户 / 权限 / 内容治理 / 系统运维" aria-label="管理控制台"
            @click="go('admin')"
          ><span class="ic">🛡</span><span class="lbl">管理控制台</span><span class="lock">admin</span></button>
        </template>
        <button
          v-for="bi in systemItems" :key="'s-'+bi.title"
          class="ph-nav" :class="{ active: isActive(bi.view || bi.slot) }" type="button"
          :title="bi.desc || bi.title" :aria-label="bi.title"
          @click="go(bi.view || bi.slot)"
        ><span class="ic">{{ bi.icon }}</span><span class="lbl">{{ bi.title }}</span></button>
        <div class="ph-railnote">以<b>项目</b>为中心：进度 / 节点 / 卡点优先；个人任务与日程由项目自动同步。</div>
      </div>
    </nav>
  `,
}

export default Rail