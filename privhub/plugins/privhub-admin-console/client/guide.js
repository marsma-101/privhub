/**
 * guide — 管理控制台「30 秒上手」引导（2026-11-17）。
 *
 * ## 为什么需要它
 * 主人反馈：「能够进入和点击的东西一次性给的太多，又没有使用方式的介绍，
 * 刚开始使用的人很容易乱的」。减层解决了"太多"，这个引导解决"不知道怎么用"。
 *
 * ## 设计取舍
 *   · 首次进入自动弹一次（localStorage 记 seen），之后不再打扰；顶栏 ? 随时重看。
 *   · 3 步，每步只讲一件事，配一个**真的能点**的动作（不是纯文字说明）：
 *       ① 这是哪 / 怎么回去      → 「返回文件」真的能点
 *       ② 怎么找到要管的东西    → 「试试搜索『存储』」真的把搜索词填好并聚焦
 *       ③ 五个职责区各管什么    → 「从用户管理开始」真的跳过去
 *   · 可跳过（跳过也记 seen，不再自动弹）、可上一步/下一步、Esc 关闭。
 *   · 不新增常驻 UI —— 它是一个按需出现的弹层，平时完全不存在。
 *
 * @module privhub-admin-console/client/guide
 */

import { openAdminRoute } from './panelbus.js'

const AdminGuide = {
  name: 'admin-guide',
  props: {
    open: { type: Boolean, default: false },
  },
  emits: ['close', 'try-search'],
  data() { return { step: 0 } },
  computed: {
    steps() {
      return [
        {
          icon: '🧭',
          title: '这里是管理控制台',
          body: '管整个系统的地方：用户、权限、内容、存储、审计。它和文件浏览是两个地方——随时可以回去，不影响你刚才看的文件。',
          tip: '顶部「← 返回文件」随时回到文件浏览；下次进来会回到你离开时的位置。',
          action: null,
        },
        {
          icon: '🔍',
          title: '不用记菜单，直接搜',
          body: '顶部搜索框输入页名（如「存储」「审计」「回收站」）、用户名或项目名，回车直达。支持拼音首字母，比如 hsz = 回收站。',
          tip: '左侧菜单按职责分了 4 组，常用的直接显示，其余收在「更多 N 项」里。',
          action: { label: '试试搜索「存储」', kind: 'search' },
        },
        {
          icon: '🗂️',
          title: '五个职责区，各管一件事',
          body: '概览页的五张卡片就是入口：用户与角色、项目与权限、内容治理、系统运维、审计日志。每张卡告诉你它管什么、现在有多少，点卡片或卡内小按钮直达。',
          tip: '不知道从哪开始？大多数管理动作从「用户管理」起步。',
          action: { label: '从用户管理开始 →', kind: 'goto', key: 'access/users' },
        },
      ]
    },
    cur() { return this.steps[this.step] },
    isLast() { return this.step === this.steps.length - 1 },
  },
  watch: {
    open(v) { if (v) this.step = 0 },
  },
  methods: {
    next() { if (!this.isLast) this.step++ },
    prev() { if (this.step > 0) this.step-- },
    close() { this.$emit('close') },
    onAction() {
      const a = this.cur.action
      if (!a) return
      if (a.kind === 'search') {
        /* 真的把搜索词填好并聚焦，让新手立刻看到搜索是怎么用的。 */
        this.$emit('try-search', '存储')
        this.close()
      } else if (a.kind === 'goto') {
        openAdminRoute(a.key)
        this.close()
      }
    },
    onKeydown(e) {
      if (e.key === 'Escape') this.close()
      else if (e.key === 'ArrowRight') this.next()
      else if (e.key === 'ArrowLeft') this.prev()
    },
  },
  template: `
    <div v-if="open" class="ad-guide-mask" role="dialog" aria-modal="true" aria-label="管理控制台使用引导" @keydown="onKeydown">
      <div class="ad-guide" @click.stop>
        <div class="ad-guide-head">
          <span class="ad-guide-badge">30 秒上手</span>
          <button class="ad-iconbtn ad-guide-x" title="关闭（之后不再自动弹出）" aria-label="关闭引导" @click="close">✕</button>
        </div>

        <div class="ad-guide-body">
          <div class="ad-guide-icon">{{ cur.icon }}</div>
          <h3 class="ad-guide-title">{{ cur.title }}</h3>
          <p class="ad-guide-text">{{ cur.body }}</p>
          <p class="ad-guide-tip">💡 {{ cur.tip }}</p>
          <button v-if="cur.action" class="ad-btn ad-btn-primary ad-guide-action" @click="onAction">{{ cur.action.label }}</button>
        </div>

        <div class="ad-guide-foot">
          <div class="ad-guide-dots" role="tablist" aria-label="引导步骤">
            <span
              v-for="(s, i) in steps" :key="i"
              class="ad-guide-dot" :class="{ on: i === step }"
              role="tab" :aria-selected="i === step ? 'true' : 'false'"
              :title="'第 ' + (i + 1) + ' 步：' + s.title"
              @click="step = i"
            ></span>
          </div>
          <div class="ad-guide-nav">
            <button class="ad-btn ad-btn-sm ad-guide-skip" @click="close">跳过</button>
            <button v-if="step > 0" class="ad-btn ad-btn-sm" @click="prev">上一步</button>
            <button v-if="!isLast" class="ad-btn ad-btn-sm ad-btn-primary" @click="next">下一步</button>
            <button v-else class="ad-btn ad-btn-sm ad-btn-primary" @click="close">开始使用</button>
          </div>
        </div>
      </div>
    </div>
  `,
}

export { AdminGuide }
