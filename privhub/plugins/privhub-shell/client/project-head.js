/**
 * project-head — L2 项目层头部（issue #3 原型：返回总览 + 项目名 + 负责人 + 截止）
 *
 * ## 它是什么
 * 原型要求「项目内头部常驻：返回总览 + 项目名 + 负责人 + 截止日期」。
 * 本组件就是那条头部，挂在 project-nav 之上、内容区顶部。
 *
 * ## 数据口径（不编造）
 * · 项目名：nav.project（骨架状态）。
 * · 当前节点 / 最近截止：来自 /privhub/api/dashboard/overview 的**本项目**那条
 *   （node / dueAt），与 L1 卡片同一真源，不另算一份。
 * · 负责人：本仓项目数据模型**没有 owner 字段**（/projects 只回名字），
 *   因此不显示一个编造的负责人 —— 用「当前节点」代替原型里的负责人位，
 *   并在 title 里说明。等后端补了项目元数据再接真值。
 *
 * @module privhub-shell/client/project-head
 */

import './proto-styles.js'

const { api, nav } = window.PrivHub

const DAY = 86400000
function dayText(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return (d.getMonth() + 1) + '月' + d.getDate() + '日'
}

const ProjectHead = {
  name: 'shell-project-head',
  data() { return { nav, node: '', dueAt: null, loaded: false } },
  computed: {
    project() { return this.nav.project },
    dueText() {
      if (!this.dueAt) return ''
      const days = Math.ceil((this.dueAt - Date.now()) / DAY)
      if (days < 0) return '逾期 ' + (-days) + ' 天'
      if (days === 0) return '今天'
      return dayText(this.dueAt) + '（' + days + ' 天后）'
    },
    late() { return !!(this.dueAt && this.dueAt < Date.now()) },
  },
  watch: {
    project: { immediate: true, handler(v) { if (v) this.load(); else { this.node = ''; this.dueAt = null; this.loaded = false } } },
  },
  methods: {
    async load() {
      const p = this.project
      if (!p) return
      try {
        const r = await api('/privhub/api/dashboard/overview')
        if (this.project !== p) return   // 已切到别的项目，丢弃过期回包
        if (r && r.ok) {
          const hit = (r.projects || []).find((x) => x.project === p)
          this.node = hit ? (hit.node || '') : ''
          this.dueAt = hit ? (hit.dueAt || null) : null
        }
      } catch { /* 头部是辅助信息，取不到不阻塞主界面 */ }
      finally { if (this.project === p) this.loaded = true }
    },
    goHome() {
      if (nav.hasBarView('home')) nav.setActiveView('home', { noToggle: true })
      else nav.backToWelcome()
    },
  },
  template: `
    <!-- T2 位置链右端的元信息（当前节点 / 最近截止）。
         改造前它自己占一条 44px 的横带，还带一个「← 总览」按钮 —— 与层级条重复。
         现在项目名与返回已在位置链里，这里只留「这个项目现在卡在哪、什么时候到期」。 -->
    <span class="ph-projmeta" v-if="project && (node || dueText)">
      <span class="ph-pm" v-if="node" :title="'当前节点（取自项目看板计划）'">
        <span class="k">节点</span>{{ node }}
      </span>
      <span class="ph-pm" :class="{ late: late }" v-if="dueText" :title="'最近截止（未完成卡片里最早的截止日期）'">
        <span class="k">截止</span>{{ dueText }}
      </span>
    </span>
  `,
}

export default ProjectHead