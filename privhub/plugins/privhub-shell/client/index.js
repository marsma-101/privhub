/**
 * privhub-shell · client — 页面骨架插件（组件集）
 *
 * 骨架自身的 UI 组件，按 slot 挂载：
 *   - project-tabs：顶栏项目横排（欢迎 + 项目 + ➕ 添加项目）
 *   - user-area：顶栏右侧用户区（徽章/头像/用户名/侧栏开关/退出）
 *   - app-iconbar：图标栏（只显示图标，名称走悬停提示；一级=功能类别·手风琴；底部全局系统组）
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
      <div class="ptab" :class="{ on: nav.activeView === 'files' && nav.project === null }" @click="nav.backToWelcome"><span class="ptab-ico">🏠</span>欢迎</div>
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

/* ============ 图标栏：功能类别（一级·手风琴）+ 项目内功能（二级） ============ */
/*
 * 信息架构（2026-10-14 重排，依据「本项目按开发项目分，不是个人网盘」）：
 *   项目选择【不在】栏内 —— 顶栏已有「欢迎」按钮与项目下拉，在那里选即可；
 *   本栏只按所选项目展示「项目内的功能」。
 *   一级 = 功能类别（文件 / 知识 / 协作 / AI）：平时折叠成一个图标，点开才露出其下条目；
 *          一次只开一个（手风琴）。未选项目时整段不出现 —— 项目内功能无从谈起。
 *   二级 = 类别下的具体功能，全是「对当前项目内文件」的操作，只在选了项目后出现。
 *   全局 = 跨项目 / 系统：工作台、智能体接入（跨项目）、设置、管理控制台 —— 常驻不折叠。
 *
 * 栏内【只显示图标】（窄栏、更简洁）：名称走悬停提示 + 无障碍名（aria-label）。
 *   悬停提示分两种：条目/分类声明了 `desc` 时弹**自定义气泡**（标题 + 一句话简介 +
 *   「查看完整说明」，导读站内《使用说明》文档）；没有 desc 时退回原生 title。
 *   气泡用 teleport 挂到 body（appbar 是 overflow:hidden，气泡在栏内会被裁掉）。
 * 归组是【数据】：每个条目属于哪一段由各插件 manifest 的 barItem.group 决定；
 * 这里只定「类别的先后 / 图标 / 中文名」「组内条目的先后」，改这里不碰任何插件。
 * 契约由 tests/integrity.mjs 兜底（非 admin-nav 条目必须声明合法 group）。
 */
const SECTION_DEFS = [
  { id: 'files',     label: '文件', icon: '🗄️', order: ['files', 'search', 'favorites', 'trash'],
    desc: '对当前项目里文件的操作：浏览 / 上传 / 搜索 / 收藏 / 回收站。', doc: '01-文件与目录.md' },
  { id: 'knowledge', label: '知识', icon: '🧠', order: ['wiki', 'kg', 'tags', 'template', 'refcheck'],
    desc: '把文件变成能找、能连、能读的知识：知识库 / 图谱 / 标签 / 新建文档 / 引用检查。', doc: '02-知识组织.md' },
  { id: 'collab',    label: '协作', icon: '🤝', order: ['taskboard', 'dashboard', 'calendar'],
    desc: '记任务、展示进度、指派到人：任务看板 / 项目看板 / 任务日历。', doc: '03-协作与看板.md' },
  { id: 'ai',        label: 'AI',   icon: '✨', order: ['rag'],
    desc: '站内 AI 工具：语料仓库 / 向量化 / 问答 / 模型与 Key 管理。', doc: '04-AI与智能体接入.md' },
]
/* 全局组的一级图标（竖栏最上面那一段，未选项目时也常驻）。
 * 顺序即版面：🌳 全局思维导图（privhub-mindmap，P3，仅管理员）插在
 * 「📊 工作台」与「🔌 智能体接入」之间 —— 主人 2026-10-17 指定的位置。 */
const GLOBAL_ORDER = ['home', 'mindmap-global', 'agent']
const SYSTEM_ORDER = ['admin', 'settings']
const KNOWN_GROUPS = new Set([...SECTION_DEFS.map((d) => d.id), 'global', 'system'])

/** 按给定的 view 顺序排；未列入的排在末尾（保持稳定）。 */
function byOrder(order) {
  return (items) => items.slice().sort((a, b) => {
    const ia = order.indexOf(a.view || a.slot)
    const ib = order.indexOf(b.view || b.slot)
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib)
  })
}

/* 悬停气泡的收起定时器（模块级：图标栏全局只有一份，且不参与响应式）。
 * 留 ~160ms 宽限：鼠标从图标滑到气泡上时不至于闪没。 */
let helpHideTimer = null
function helpHideNow() { if (helpHideTimer) { clearTimeout(helpHideTimer); helpHideTimer = null } }

const AppIconbar = {
  name: 'shell-app-iconbar',
  data() { return { barItems, badges, nav, open: null, help: null, helpPos: { top: 0, left: 0 } } },
  computed: {
    /* 可上栏的条目：capFeature 已在骨架按开关过滤掉；这里再去掉管理控制台侧栏条目
     * （admin-nav 只在控制台里导航用，不在图标栏占位）。 */
    rail() { return this.barItems.filter((bi) => bi.slot !== 'admin-nav') },
    /* 二级：项目内功能 —— 未选项目时整段为空（一级没选，二级无从谈起）。 */
    sections() {
      if (nav.project === null) return []
      return SECTION_DEFS
        .map((d) => ({
          id: d.id, label: d.label, icon: d.icon, desc: d.desc, doc: d.doc,
          items: byOrder(d.order)(this.rail.filter((bi) => bi.group === d.id)),
        }))
        .filter((s) => s.items.length)
    },
    /* 全局：常驻、不折叠。group 不认识的条目并进来 —— 宁可多显，不可静默吞掉。 */
    globalItems() {
      const extra = this.rail.filter((bi) => !KNOWN_GROUPS.has(bi.group))
      return byOrder(GLOBAL_ORDER)(this.rail.filter((bi) => bi.group === 'global')).concat(extra)
    },
    /* 系统：底部固定（管理控制台 / 设置）。 */
    bottomItems() { return byOrder(SYSTEM_ORDER)(this.rail.filter((bi) => bi.group === 'system')) },
    // 图标高亮：视图型看 nav flag，功能面板看 nav.activeView（⑤ 单一状态源）
    isActive() {
      return (bi) => {
        const v = bi.view || bi.slot
        if (v === 'files') return nav.activeView === 'files' && nav.project !== null && !nav.trashView
        if (v === 'trash') return nav.trashView
        if (v === 'search') return nav.searchView
        if (v === 'favorites') return nav.favView
        return nav.activeView === v
      }
    },
  },
  watch: {
    /* 切换视图/项目时，自动展开「当前视图所在的那一段」，保证高亮项可见；
     * 切到无归属视图（如管理控制台）时不动，保留用户手动的展开状态。 */
    'nav.activeView'() { this.syncOpen() },
    'nav.project'() { this.syncOpen() },
  },
  mounted() { this.syncOpen() },
  beforeUnmount() { helpHideNow() },
  methods: {
    openBar(bi) { helpHideNow(); this.help = null; window.PrivHub.openBarItem(bi) },
    /* 手风琴：开一个就关掉其它；再点当前这个则收起。 */
    toggleSection(id) { this.open = this.open === id ? null : id },
    syncOpen() {
      const v = nav.activeView
      const sec = this.sections.find((s) => s.items.some((bi) => (bi.view || bi.slot) === v))
      if (sec) this.open = sec.id
    },
    /* ---- 悬停说明气泡 ----
     * 只有声明了 desc 的条目才弹（否则保留原生 title，行为与迁前一致）。
     * 位置由被悬停元素的 boundingRect 推出来，气泡用 position:fixed 贴在它右侧。 */
    showHelp(bi, ev) {
      helpHideNow()
      if (!bi || !bi.desc) return
      const el = ev && ev.currentTarget
      if (el && typeof el.getBoundingClientRect === 'function') {
        const r = el.getBoundingClientRect()
        this.helpPos = { top: Math.max(8, Math.round(r.top)), left: Math.round(r.right + 10) }
      }
      this.help = bi
    },
    /* 鼠标离开图标/分类：延迟收起，给一个滑到气泡上的宽限 */
    hideHelp() { helpHideNow(); helpHideTimer = setTimeout(() => { this.help = null; helpHideTimer = null }, 160) },
    keepHelp() { helpHideNow() },
    /* 「查看完整说明」：交给骨架的 nav.openHelp（弹站内《使用说明》文档） */
    openHelpDoc(bi) {
      helpHideNow()
      this.help = null
      const n = window.PrivHub && window.PrivHub.nav
      if (n && typeof n.openHelp === 'function') n.openHelp((bi && bi.doc) || '00-总览.md')
    },
  },
  template: `
    <div class="appbar">
      <div class="abar-scroll ph-scroll">
        <!-- 一级：功能类别（图标）。点开才露出该类别的条目，一次只开一个。
             未选项目时整段为空 —— 项目内功能无从谈起。 -->
        <div v-for="s in sections" :key="s.id" class="abar-sec">
          <div
            class="abar-head" :class="{ on: open === s.id }"
            role="button" tabindex="0" :aria-expanded="open === s.id ? 'true' : 'false'"
            :title="s.desc ? null : (s.label + '（点击展开 / 收起）')" :aria-label="s.label"
            @click="toggleSection(s.id)" @keydown.enter="toggleSection(s.id)"
            @mouseenter="showHelp({ icon: s.icon, title: s.label, desc: s.desc, doc: s.doc }, $event)"
            @mouseleave="hideHelp" @focus="showHelp({ icon: s.icon, title: s.label, desc: s.desc, doc: s.doc }, $event)" @blur="hideHelp"
          >
            <span class="abar-ico">{{ s.icon }}</span>
          </div>
          <div class="abar-sub" :class="{ open: open === s.id }">
            <!-- 抽屉：同一组共用一块凹陷底板，按钮嵌在里面（视觉上「从把手下面拉出来」） -->
            <div class="abar-drawer">
              <div
                v-for="bi in s.items" :key="bi.title"
                class="abar-item" :class="{ on: isActive(bi) }"
                role="button" tabindex="0" :title="bi.desc ? null : bi.title" :aria-label="bi.title"
                @click="openBar(bi)" @keydown.enter="openBar(bi)"
                @mouseenter="showHelp(bi, $event)" @mouseleave="hideHelp" @focus="showHelp(bi, $event)" @blur="hideHelp"
              >
                <span class="abar-ico">{{ bi.icon }}</span>
                <span v-if="(bi.view || bi.slot) === 'trash' && badges.trash > 0" class="abar-badge">{{ badges.trash }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 全局（跨项目 / 系统无关项），常驻不折叠 -->
        <div
          v-for="bi in globalItems" :key="bi.title"
          class="abar-item" :class="{ on: isActive(bi) }"
          role="button" tabindex="0" :title="bi.desc ? null : bi.title" :aria-label="bi.title"
          @click="openBar(bi)" @keydown.enter="openBar(bi)"
          @mouseenter="showHelp(bi, $event)" @mouseleave="hideHelp" @focus="showHelp(bi, $event)" @blur="hideHelp"
        >
          <span class="abar-ico">{{ bi.icon }}</span>
        </div>
      </div>

      <div class="abar-sep"></div>
      <!-- 系统：底部固定（管理控制台 / 设置） -->
      <div
        v-for="bi in bottomItems" :key="bi.title"
        class="abar-item abar-bottom" :class="{ on: isActive(bi) }"
        role="button" tabindex="0" :title="bi.desc ? null : bi.title" :aria-label="bi.title"
        @click="openBar(bi)" @keydown.enter="openBar(bi)"
        @mouseenter="showHelp(bi, $event)" @mouseleave="hideHelp" @focus="showHelp(bi, $event)" @blur="hideHelp"
      >
        <span class="abar-ico">{{ bi.icon }}</span>
      </div>

      <!-- 悬停说明气泡：teleport 到 body（appbar overflow:hidden 会把气泡裁掉）。
           鼠标可移到气泡上（keepHelp 取消收起），点「查看完整说明」打开站内说明文档。 -->
      <teleport to="body">
        <div
          v-if="help" class="ph-help" role="tooltip"
          :style="{ top: helpPos.top + 'px', left: helpPos.left + 'px' }"
          @mouseenter="keepHelp" @mouseleave="hideHelp"
        >
          <div class="ph-help-head">
            <span class="ph-help-ico">{{ help.icon }}</span>
            <span class="ph-help-title">{{ help.title }}</span>
          </div>
          <div class="ph-help-desc">{{ help.desc }}</div>
          <div class="ph-help-foot">
            <a v-if="help.doc" class="ph-help-more" tabindex="0"
               @click="openHelpDoc(help)" @keydown.enter="openHelpDoc(help)">📖 查看完整说明</a>
            <span v-else class="ph-help-hint">暂无详细说明</span>
          </div>
        </div>
      </teleport>
    </div>
  `,
}

/* ============ 项目选择栏（welcome slot：未选项目时左侧栏显示，选中后变目录树） ============ */
const WelcomeView = {
  name: 'shell-welcome',
  data() { return { nav, auth: AUTH } },
  computed: {
    isAdmin() { return this.auth.user && this.auth.user.role === 'admin' },
    projects() { return this.nav.projectsList || [] },
    /* 工作台是另一个插件提供的：它没装载（或管理员用开关对普通用户关了）时就不显示入口，
     * 点了也是空壳。读 cap 过滤后的 barItems，而不是原始 manifest。 */
    hasHome() { return barItems.some((b) => (b.view || b.slot) === 'home') },
  },
  methods: {
    openProject(name) { this.nav.openProject(name) },
    newProject() { this.nav.newProject() },
    openHome() { this.nav.setActiveView('home') },
  },
  template: `
    <div class="sidebar project-sidebar">
      <div class="side-head"><span class="side-title">📁 选择项目</span></div>
      <!-- 工作台入口与项目列表同列（同 gap、同 hover）：未选项目时最该看的
           其实是「我上次在干什么」，所以工作台排在项目之前。 -->
      <div v-if="hasHome || projects.length" class="project-list">
        <div
          v-if="hasHome"
          class="tree-item project-item"
          role="button" tabindex="0"
          title="打开工作台：最近打开 / 我的收藏 / AI 连接状态"
          @click="openHome"
          @keydown.enter="openHome"
        >
          <span>📊</span><span class="name">工作台</span><span class="pc-go">→</span>
        </div>
        <div
          v-for="p in projects" :key="p"
          class="tree-item project-item"
          @click="openProject(p)"
          :title="'打开项目：' + p"
        >
          <span>📂</span><span class="name">{{ p }}</span><span class="pc-go">→</span>
        </div>
      </div>
      <div v-else class="project-empty">
        {{ isAdmin ? '暂无项目，点击下方新建' : '暂无可用项目，请联系管理员开通权限' }}
      </div>
      <div v-if="isAdmin" class="side-foot">
        <button class="btn btn-primary" style="width:100%;padding:8px;font-size:13px" @click="newProject">＋ 新建项目</button>
      </div>
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
