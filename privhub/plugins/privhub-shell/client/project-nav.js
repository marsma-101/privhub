/**
 * project-nav — L2 项目层主导航（固定 4 tab + 「更多」抽屉）
 *
 * ## 它解决什么
 * 旧界面把项目内的十几个功能平铺成图标栏，用户得记住「每个图标是什么、在哪一段」。
 * 新结构改成**层级**：选中项目后，首层只有四类每天要看的事 ——
 * 文件 · 看板 · 任务 · 日程；其余（知识 / AI）收进「更多」，一层可达，一条不删。
 *
 * ## 三条设计约束
 * 1. **单一状态源**：当前 tab 由 `nav.activeView` 反查（tabOfView），不另存一份 tab 状态。
 *    另存必然漂移：从别处切了视图，tab 还亮着旧的那个。
 * 2. **同族视图不掉高亮**：搜索 / 收藏 / 回收站都属「文件」这一族，
 *    在它们里面时「文件」tab 仍然亮着 —— 否则用户会以为自己离开了文件区。
 * 3. **只渲染真装得上的 tab**：功能被开关关掉或插件未装载时不渲染死入口，
 *    但**不静默丢弃** —— 收进「更多」里如实标为不可用，并说明原因。
 *
 * 样式在 ./nav-styles.js（import 即注入）。
 *
 * @module privhub-shell/client/project-nav
 */

import './nav-styles.js'
import { PROJECT_TABS, MORE_GROUPS, SECTION_DEFS, TAB_VIEWS, tabOfView, viewKey, byOrder } from './ia.js'

const { nav, barItems, AUTH, badges } = window.PrivHub

const ProjectNav = {
  name: 'shell-project-nav',
  /* part：骨架同一个组件挂两次 —— 'scenes' 渲染进 T2 右端（场景页签），
     'subs' 渲染进 T3 子页签层。缺省（老调用/回归直挂）按 'scenes' 处理。 */
  props: { part: { type: String, default: 'scenes' } },
  data() {
    return {
      nav, barItems, badges,
      moreOpen: false,
      /* 当前打开的是哪个项目的导航：切项目即收起「更多」，
       * 不把上一个项目的展开态带到新项目（上下文不串味）。 */
      boundProject: nav.project,
    }
  },
  computed: {
    isAdmin() { return !!(window.PrivHub && window.PrivHub.isManager && window.PrivHub.isManager()) },
    project() { return this.nav.project },
    activeView() { return this.nav.activeView },
    /** 当前视图属于哪个主 tab（同族视图共用一个 tab，高亮不掉）。 */
    currentTab() { const t = tabOfView(this.activeView); return t ? t.id : null },
    /** 本项目可用的条目（barItems 已按 cap / adminOnly 过滤）。 */
    available() {
      const set = new Set(this.barItems.map(viewKey))
      return { set, byView: new Map(this.barItems.map((b) => [viewKey(b), b])) }
    },
    /**
     * 主 tab：只渲染**落地视图真的装得上**的。
     * 落地页缺席但同族有别的视图时，退到该族第一个装得上的视图，
     * 这样「文件」族即使默认落地页被关，也还能从搜索/收藏进入。
     */
    tabs() {
      const out = []
      for (const t of PROJECT_TABS) {
        const landing = t.views.find((v) => this.available.set.has(v))
        if (!landing) continue
        out.push({
          id: t.id, label: t.label, icon: t.icon, desc: t.desc,
          landing,
          // 该 tab 下可用的同族子视图（文件族：搜索/收藏/回收站）
          subs: t.views.filter((v) => v !== landing && this.available.set.has(v))
            .map((v) => this.available.byView.get(v)),
        })
      }
      return out
    },
    /**
     * 「更多」：主 tab 之外的项目内功能，按知识 / AI 分组。
     * 一条不删 —— 主 tab 没覆盖到的项目内条目全部出现在这里。
     */
    moreGroups() {
      const groups = []
      for (const g of MORE_GROUPS) {
        const def = SECTION_DEFS.find((d) => d.id === g.id)
        const items = byOrder(def ? def.order : [])(
          this.barItems.filter((b) => b.group === g.id && !TAB_VIEWS.has(viewKey(b))),
        )
        if (items.length) groups.push({ id: g.id, label: g.label, icon: g.icon, desc: def ? def.desc : '', items })
      }
      /* 未归组的项目内条目（group 认不出来、又不在主 tab 里）也要露出来，
       * 宁可多显不可静默吞掉 —— 新插件接进来时不至于「装了但找不到」。 */
      const known = new Set([...MORE_GROUPS.map((g) => g.id), 'global', 'system'])
      const rest = this.barItems.filter((b) =>
        !TAB_VIEWS.has(viewKey(b)) && !known.has(b.group) && b.slot !== 'admin-nav')
      if (rest.length) groups.push({ id: 'other', label: '其他', icon: '🧩', desc: '未归类的项目内功能。', items: rest })
      return groups
    },
    moreCount() { return this.moreGroups.reduce((n, g) => n + g.items.length, 0) },
    /** 当前视图是否藏在「更多」里（据此给把手点一个提示点）。 */
    moreHasActive() {
      return this.moreGroups.some((g) => g.items.some((b) => this.isActive(b)))
    },
    trashCount() { return this.badges.trash || 0 },
    /** 文件族的子入口列表（文件 / 搜索 / 收藏 / 回收站）。 */
    subList() {
      const f = this.tabs.find((t) => t.id === 'files')
      return f ? f.subs : []
    },
    /** 当前是否正处在某个子视图里（决定下拉按钮要不要高亮）。 */
    currentSubOn() {
      return this.subList.some((s) => this.isActive(s))
    },
  },
  watch: {
    project(v) { if (v !== this.boundProject) { this.boundProject = v; this.moreOpen = false } },
    /* 从别处切到「更多」里的功能时自动展开，保证高亮项可见（我在哪儿这条线索不能断）。 */
    activeView() { if (this.moreHasActive) this.moreOpen = true },
  },
  mounted() { if (this.moreHasActive) this.moreOpen = true },
  methods: {
    isActive(bi) {
      const v = viewKey(bi)
      if (v === 'files') return this.activeView === 'files' && this.project !== null && !this.nav.trashView
      if (v === 'trash') return !!this.nav.trashView
      if (v === 'search') return !!this.nav.searchView
      if (v === 'favorites') return !!this.nav.favView
      return this.activeView === v
    },
    isTabOn(t) { return this.currentTab === t.id },
    /**
     * 点 tab：已经在该 tab 上就回到它的落地页（而不是 toggle 回文件页）。
     * 主导航是「位置」不是「开关」—— 点当前 tab 不该把人弹走。
     */
    openTab(t) {
      this.moreOpen = false
      const bi = this.available.byView.get(t.landing)
      if (bi) window.PrivHub.openBarItem(bi)
      else this.nav.setActiveView(t.landing, { noToggle: true })
    },
    openItem(bi) {
      if (!bi) return
      /* 「更多」里的功能：打开后收起抽屉，让内容区完整可见；
       * 但若打开的就是当前视图，抽屉保持展开（人还在这一层里挑东西）。 */
      const same = this.isActive(bi)
      window.PrivHub.openBarItem(bi)
      if (!same) this.moreOpen = false
    },
    toggleMore() { this.moreOpen = !this.moreOpen },
    closeMore() { this.moreOpen = false },
    tabTitle(t) {
      const sub = t.subs.length ? '（含 ' + t.subs.map((s) => s.title).join(' / ') + '）' : ''
      return t.label + ' · ' + t.desc + sub
    },
  },
  template: `
    <!-- part="scenes"：渲染进 T2 右端的场景页签（唯一的主导航语言，下划线高亮）
         part="subs"  ：渲染进 T3 的子页签层（文件族子入口 / 更多抽屉）
         两处都读同一份 computed，状态一个没多存。 -->
    <nav v-if="part === 'scenes'" class="ph-scenes" aria-label="项目内导航">
      <button
        v-for="t in tabs" :key="t.id"
        class="ph-scene" :class="{ on: isTabOn(t) }" type="button"
        role="tab" :aria-selected="isTabOn(t) ? 'true' : 'false'"
        :title="tabTitle(t)" :aria-label="t.label"
        @click="openTab(t)"
      >
        <span class="ti">{{ t.icon }}</span>
        <span>{{ t.label }}</span>
        <span v-if="t.id === 'files' && trashCount > 0" class="badge">{{ trashCount }}</span>
      </button>

      <!-- 「⋯」= 唯一的低频入口。2026-11-16：把「文件族子入口」也并进来，
           原来它单独占一个下拉按钮，加上 4 个场景页签后右端挤成一条窄带。
           现在 T2 右端固定 = 4 个场景页签 + 1 个「⋯」，一眼清爽。 -->
      <button
        v-if="moreCount > 0 || subList.length > 0"
        class="ph-scene more" :class="{ on: moreOpen || moreHasActive || currentSubOn }" type="button"
        :aria-expanded="moreOpen ? 'true' : 'false'"
        :title="'更多功能：文件相关（' + subList.map(x => x.title).join(' / ') + '）+ 知识与 AI 共 ' + (subList.length + moreCount) + ' 项'"
        aria-label="更多功能"
        @click="toggleMore"
      >
        <span class="ti">⋯</span><span>更多</span>
        <span v-if="trashCount > 0" class="badge">{{ trashCount }}</span>
      </button>
    </nav>

    <!-- part="subs"：2026-11-16 起这里**只输出「更多」抽屉**（不再有独立横带，
         也不再有独立的子入口下拉按钮 —— 它们都并进了上面那个「⋯」）。
         文件族子入口在抽屉里单列一组，排在最前（它比知识与 AI 更常用）。 -->
    <div v-else-if="moreOpen" class="pnav-drawer" role="region" aria-label="更多功能">
      <!-- 组①：文件相关（文件 / 搜索 / 收藏 / 回收站） -->
      <div v-if="subList.length > 0" class="pnav-grp">
        <div class="pnav-grp-h" title="文件族的全部子入口">
          <span>🗄️</span><span>文件相关</span>
          <span class="pnav-grp-n">{{ subList.length }}</span>
        </div>
        <div class="pnav-grp-b">
          <button
            v-for="s in subList" :key="s.title"
            class="ph-sub-item" :class="{ on: isActive(s) }" type="button"
            :title="s.desc || s.title"
            @click="openItem(s); moreOpen = false"
          >
            <span class="ic">{{ s.icon }}</span>
            <span class="tx">{{ s.title }}</span>
            <span v-if="(s.view || s.slot) === 'trash' && trashCount > 0" class="badge">{{ trashCount }}</span>
          </button>
        </div>
      </div>
      <div v-for="g in moreGroups" :key="g.id" class="pnav-grp">
        <div class="pnav-grp-h" :title="g.desc">
          <span>{{ g.icon }}</span><span>{{ g.label }}</span>
          <span class="pnav-grp-n">{{ g.items.length }}</span>
        </div>
        <div class="pnav-grp-b">
          <button
            v-for="bi in g.items" :key="bi.title"
            class="pnav-item" :class="{ on: isActive(bi) }" type="button"
            :title="bi.desc || bi.title" :aria-label="bi.title"
            @click="openItem(bi)"
          >
            <span class="pnav-item-ico">{{ bi.icon }}</span>
            <span class="pnav-item-t">{{ bi.title }}</span>
            <span v-if="bi.desc" class="pnav-item-d">{{ bi.desc }}</span>
          </button>
        </div>
      </div>
      <div class="pnav-drawer-foot">
        <span>低频功能收在这里，一条没删。</span>
        <button class="pnav-link" type="button" @click="closeMore">收起</button>
      </div>
    </div>
  `,
}

export default ProjectNav