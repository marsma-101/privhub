/**
 * layer-bar — 层级条：把「你在哪一层」显式画出来
 *
 * ## 为什么需要它
 * 旧界面里，用户从工作台点进项目、再点进某个功能后，很难回答「我现在在哪、
 * 怎么回上一层」。图标栏的高亮只说明「哪个功能亮着」，不说明层级关系。
 *
 * 这条 34px 的窄条把层级路径写出来：
 *   总览 › 项目名 › 当前功能        （项目层）
 *   总览 › 我的 › 我的任务          （个人层）
 *   总览 › 管理控制台               （管理层，暖色带区分）
 * 每一级都是**可点的回退出口**，当前级不可点（它不是去处，是位置）。
 *
 * ## 两条约束
 * · 层级由 `nav` 派生，不另存一份「当前层」状态 —— 另存必然与 activeView 漂移。
 * · 管理入口只在**真的装得上**时出现（barItems 已按 adminOnly/cap 过滤）：
 *   非管理员看不到它，这是既有安全契约，不改成「禁用可见」。
 *
 * @module privhub-shell/client/layer-bar
 */

import './nav-styles.js'
import { tabOfView } from './ia.js'

const { nav, barItems, AUTH } = window.PrivHub

/** 视图 → 中文名（只用于层级条的末级标签；找不到就退回视图键本身）。 */
const VIEW_LABELS = {
  home: '项目总览', me: '我的', admin: '管理控制台', settings: '设置',
  files: '文件', search: '搜索', favorites: '我的收藏', trash: '回收站',
  dashboard: '项目看板', taskboard: '任务看板', calendar: '任务日历',
  wiki: '知识库', kg: '知识图谱', tags: '标签', template: '新建文档',
  refcheck: '引用检查', rag: 'AI 工具', agent: '智能体接入',
  mindmap: '思维导图', 'mindmap-global': '全局思维导图',
  acl: 'ACL 规则', audit: '审计日志',
}

const LayerBar = {
  name: 'shell-layer-bar',
  data() { return { nav, barItems } },
  computed: {
    isAdmin() { return !!(AUTH.user && AUTH.user.role === 'admin') },
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
      if (this.layer === 'project') return '项目层：看板 / 任务 / 日程 / 文件'
      return '总览层：先看整个盘子，再点进项目'
    },
  },
  methods: {
    goHome() { if (this.hasHome) this.nav.setActiveView('home', { noToggle: true }) },
    goMe() { this.nav.setActiveView('me', { noToggle: true }) },
    goAdmin() { if (this.hasAdmin) this.nav.setActiveView('admin', { noToggle: true }) },
    /** 回项目层：点项目名回到该项目的落地页（不是回欢迎页）。 */
    goProject() { if (this.project !== null) this.nav.openProject(this.project) },
    goWelcome() { this.nav.backToWelcome() },
  },
  template: `
    <div class="lbar" :class="{ admin: isAdminLayer }" role="navigation" aria-label="层级位置">
      <button
        v-if="hasHome"
        class="lbar-step" :class="{ on: layer === 'home' }" type="button"
        :disabled="layer === 'home'"
        :title="layer === 'home' ? '你在这里：项目总览' : '回到项目总览（整个盘子怎么样）'"
        aria-label="项目总览"
        @click="goHome"
      ><span>📊</span><span>总览</span></button>

      <template v-if="layer === 'project'">
        <span class="lbar-sep">›</span>
        <button class="lbar-step" type="button" :title="'回到「' + project + '」的落地页'" :aria-label="'项目 ' + project" @click="goProject">
          <span>📂</span><span class="lbar-cur">{{ project }}</span>
        </button>
        <template v-if="leafLabel">
          <span class="lbar-sep">›</span>
          <span class="lbar-step on" :title="'你在这里：' + leafLabel">{{ leafLabel }}</span>
        </template>
      </template>

      <template v-else-if="layer === 'me'">
        <span class="lbar-sep">›</span>
        <span class="lbar-step on" title="你在这里：我的"><span>🏠</span><span class="lbar-cur">我的</span></span>
      </template>

      <template v-else-if="layer === 'admin'">
        <span class="lbar-sep">›</span>
        <span class="lbar-step on" title="你在这里：管理控制台"><span>🛠️</span><span class="lbar-cur">管理控制台</span></span>
      </template>

      <span class="lbar-right">
        <span class="lbar-hint">{{ hint }}</span>
        <button
          v-if="hasMe && layer !== 'me'"
          class="lbar-step" type="button"
          title="我的：任务 / 日程 / 文件 / 偏好" aria-label="我的"
          @click="goMe"
        ><span>🏠</span><span>我的</span></button>
        <button
          v-if="hasAdmin && layer !== 'admin'"
          class="lbar-step" type="button"
          title="管理控制台：用户 / 权限 / 内容治理 / 系统运维" aria-label="管理控制台"
          @click="goAdmin"
        ><span>🛠️</span><span>管理</span></button>
        <button
          v-if="project !== null"
          class="lbar-step" type="button"
          title="回到项目列表" aria-label="项目列表"
          @click="goWelcome"
        ><span>🗂️</span><span>项目列表</span></button>
      </span>
    </div>
  `,
}

export default LayerBar