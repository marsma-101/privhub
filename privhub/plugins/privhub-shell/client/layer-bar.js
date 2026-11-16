/**
 * layer-bar — T2 位置层的位置链：把「你在哪一层」显式画出来
 *
 * ## 为什么需要它
 * 旧界面里，用户从工作台点进项目、再点进某个功能后，很难回答「我现在在哪、
 * 怎么回上一层」。图标栏的高亮只说明「哪个功能亮着」，不说明层级关系。
 *
 * ## 2026-11-14 改造（第 14 轮意见：横带太多、样式不统一、没有分层级感）
 * 它原来是一条独立的 34px 横带（chip 风格），与项目条（胶囊）、二级页签（方块 tab）、
 * 文件标签条并排，四条各说各话。现在它**不再是独立横带**，而是 T2 层左半边的
 * 位置链：`总览 › 项目或族 › 当前屏`，与右侧场景页签同处一条带、共用下划线语言。
 *
 * 位置链严格按层展开，第二层是**项目**或**族**，第三层才是当前屏：
 *   项目内：📊 总览 › 📂 PrivHub      › 🗄️ 文件
 *   管理层：📊 总览 › 🛡 管理控制台  › 📊 概览
 *   个人层：📊 总览 › 🗂 我的         › 🗂 文件
 *   全局：  📊 总览 › 🔌 智能体接入  › 📖 接口文档
 * 族层用琥珀色（.fam）与项目层区分 —— 之前把族这一层吃掉了（显示成「总览 › 概览」），
 * 正是「没有分层级感」的根因。
 *
 * ## 两条约束（不改）
 * · 层级由 `nav` 派生，不另存一份「当前层」状态 —— 另存必然与 activeView 漂移。
 * · 管理入口只在**真的装得上**时出现（barItems 已按 adminOnly/cap 过滤）：
 *   非管理员看不到它，这是既有安全契约，不改成「禁用可见」。
 *
 * @module privhub-shell/client/layer-bar
 */

import './nav-styles.js'
import { tabOfView } from './ia.js'

const { nav, barItems, AUTH } = window.PrivHub

/** 视图 → 中文名（只用于位置链的末级标签；找不到就退回视图键本身）。 */
const VIEW_LABELS = {
  home: '项目总览', me: '我的', admin: '管理控制台', settings: '设置',
  files: '文件', search: '搜索', favorites: '我的收藏', trash: '回收站',
  dashboard: '项目看板', taskboard: '任务看板', calendar: '任务日历',
  wiki: '知识库', kg: '知识图谱', tags: '标签', template: '新建文档',
  refcheck: '引用检查', rag: 'AI 工具', agent: '智能体接入',
  mindmap: '思维导图', 'mindmap-global': '全局思维导图',
  acl: 'ACL 规则', audit: '审计日志',
}

/**
 * 族（第二层）：非项目、非总览的入口按族归并。
 * 顺序即优先级；hit 判定当前视图属于哪个族。
 */
const FAMILIES = [
  { id: 'admin', label: '管理控制台', icon: '🛡', go: 'admin',
    hit: (v) => v === 'admin' || v === 'acl' || v === 'audit' },
  { id: 'me', label: '我的', icon: '🗂', go: 'me', hit: (v) => v === 'me' },
  { id: 'rag', label: 'AI 工具', icon: '🤖', go: 'rag', hit: (v) => v === 'rag' },
  { id: 'agent', label: '智能体接入', icon: '🔌', go: 'agent', hit: (v) => v === 'agent' },
  { id: 'tool', label: '全局工具', icon: '⚙', go: 'settings',
    hit: (v) => v === 'settings' || v === 'mindmap-global' },
  { id: 'know', label: '更多功能', icon: '🧰', go: null,
    hit: (v) => ['wiki', 'kg', 'tags', 'template', 'refcheck', 'mindmap'].includes(v) },
]

const LayerBar = {
  name: 'shell-layer-bar',
  data() { return { nav, barItems } },
  computed: {
    isAdmin() { return !!(window.PrivHub && window.PrivHub.isManager && window.PrivHub.isManager()) },
    view() { return this.nav.activeView },
    project() { return this.nav.project },
    /** 当前在第几层：L1 总览 / L2 项目或个人 / L3 管理。 */
    layer() {
      if (this.view === 'admin') return 'admin'
      if (this.view === 'home') return 'home'
      if (this.view === 'me') return 'me'
      return this.project !== null ? 'project' : 'home'
    },
    isAdminLayer() { return this.layer === 'admin' },
    /** 管理入口是否真的可用（非管理员 / 开关关掉时为 false，不渲染死入口）。 */
    hasAdmin() { return this.barItems.some((b) => (b.view || b.slot) === 'admin') },
    hasHome() { return this.barItems.some((b) => (b.view || b.slot) === 'home') },
    hasMe() { return !!AUTH.user },
    /** 末级标签：项目层用「主 tab 名 · 具体功能」，其余用视图名。 */
    leafLabel() {
      const v = this.view
      if (v === 'me') return '我的'
      if (v === 'admin') return '管理控制台'
      if (v === 'home') return ''
      const t = tabOfView(v)
      const name = VIEW_LABELS[v] || v
      /* 落在 tab 的落地页上时不重复写两遍（「看板 · 项目看板」是啰嗦）。 */
      if (t && t.views[0] === v) return t.label
      return t ? t.label + ' · ' + name : name
    },
    hint() {
      if (this.layer === 'admin') return '管理层的改动会影响所有人'
      if (this.layer === 'me') return '个人层只读汇总，编辑仍在项目里做'
      if (this.layer === 'project') return '项目层：文件 / 看板 / 任务 / 日程'
      return '总览层：先看整个盘子，再点进项目'
    },
    /** 当前所属族（第二层）。项目内 / 总览时为 null。 */
    family() {
      if (this.layer === 'project' || this.layer === 'home') return null
      return FAMILIES.find((f) => f.hit(this.view)) || null
    },
    /** 位置链末级文字：项目层已由主 tab 表现，这里给具体功能名。 */
    leafName() {
      const v = this.view
      if (v === 'home' || v === 'me' || v === 'admin') return ''
      const t = tabOfView(v)
      const name = VIEW_LABELS[v] || v
      /* 族内视图（如「我的」的子屏、AI 子屏）直接显示自己 */
      if (!t) return name
      if (t.views[0] === v) return t.label
      return name
    },
  },
  methods: {
    goHome() { if (this.hasHome) this.nav.setActiveView('home', { noToggle: true }) },
    goMe() { this.nav.setActiveView('me', { noToggle: true }) },
    goAdmin() { if (this.hasAdmin) this.nav.setActiveView('admin', { noToggle: true }) },
    /** 回项目层：点项目名回到该项目的落地页（不是回欢迎页）。 */
    goProject() { if (this.project !== null) this.nav.openProject(this.project) },
    goWelcome() { this.nav.backToWelcome() },
    /** 点族名回该族落地页（族是位置，不是开关）。 */
    goFamily() {
      const f = this.family
      if (!f || !f.go) return
      this.nav.setActiveView(f.go, { noToggle: true })
    },
  },
  template: `
    <nav class="ph-trail" aria-label="当前位置">
      <button
        v-if="hasHome"
        class="ph-tnode" :class="{ root: layer !== 'home', here: layer === 'home' }" type="button"
        :disabled="layer === 'home'"
        :title="layer === 'home' ? '你在这里：项目总览' : '回到项目总览（整个盘子怎么样）'"
        aria-label="项目总览"
        @click="goHome"
      ><span class="ti">📊</span><span class="ell">总览</span></button>

      <!-- 第二层：项目 或 族 -->
      <template v-if="layer === 'project'">
        <span class="ph-tarrow">›</span>
        <button class="ph-tnode proj" type="button" :title="'回到「' + project + '」的落地页'" :aria-label="'项目 ' + project" @click="goProject">
          <span class="ti">📂</span><span class="ell">{{ project }}</span>
        </button>
      </template>
      <template v-else-if="family">
        <span class="ph-tarrow">›</span>
        <button class="ph-tnode fam" type="button" :title="'回到' + family.label" :aria-label="family.label" @click="goFamily">
          <span class="ti">{{ family.icon }}</span><span class="ell">{{ family.label }}</span>
        </button>
      </template>

      <!-- 第三层：当前屏。项目层由右侧场景页签表现，这里不重复 -->
      <template v-if="leafName && layer !== 'project'">
        <span class="ph-tarrow">›</span>
        <span class="ph-tnode here" :title="'你在这里：' + leafName"><span class="ell">{{ leafName }}</span></span>
      </template>
    </nav>
  `,
}

export default LayerBar
