/**
 * layer-nav.mjs — 新层级导航（L1 总览 / L2 项目层四 tab / 个人层 / L3 管理层）回归
 *
 * ## 为什么需要这一套
 * 新 IA 把「十几个图标平铺」改成「层级 + 固定四 tab + 更多抽屉」。
 * 这类改动最容易悄悄坏掉的**不是语法**，而是运行期的归属判定：
 *   · 某个功能既不在主 tab、也没进「更多」→ 装了但永远找不到（等于删功能）；
 *   · 同族视图（搜索/收藏/回收站）里主 tab 高亮掉了 → 用户以为离开了文件区；
 *   · 未装载的 tab 仍渲染成死入口 → 点了没反应；
 *   · 非管理员看到管理入口 → 撞既有安全契约。
 * frontend-templates 只编译模板（语法对就绿）、integrity 只看文件契约，两者都发现不了这些。
 *
 * 做法：给最小 window 桩，直接 import 真实客户端模块，把 computed 变成 getter、
 * methods 绑上去，喂**故意打乱顺序 + 故意缺项**的合成 barItems，对返回值做断言。
 *
 *   node tests/layer-nav.mjs
 *
 * @module tests/layer-nav
 */

const SHELL_URL = new URL('../plugins/privhub-shell/client/index.js', import.meta.url).href
const IA_URL = new URL('../plugins/privhub-shell/client/ia.js', import.meta.url).href

let pass = 0, fail = 0
const failures = []
const ok = (cond, msg) => {
  if (cond) pass++
  else { fail++; failures.push(msg) }
  console.log((cond ? '  ✅ ' : '  ❌ ') + msg)
}

/* 合成条目：顺序刻意打乱（日历在看板前、图谱在知识库前），
 * 这样一旦排序失效退回输入顺序，断言就会红。group 与真实 manifest 一致。 */
const RAIL = [
  { icon: '🗑', title: '回收站', slot: 'trash-view', view: 'trash', group: 'files' },
  { icon: '⭐', title: '收藏', slot: 'fav-view', view: 'favorites', group: 'files' },
  { icon: '🔍', title: '搜索', slot: 'search-view', view: 'search', group: 'files', desc: '按名字与内容找文件' },
  { icon: '📁', title: '文件', slot: 'panel', view: 'files', group: 'files' },
  { icon: '🔗', title: '引用检查', slot: 'refcheck', view: 'refcheck', group: 'knowledge', desc: '孤儿附件与断链' },
  { icon: '🏷', title: '标签', slot: 'tags', view: 'tags', group: 'knowledge' },
  { icon: '🕸', title: '知识图谱', slot: 'kg', view: 'kg', group: 'knowledge', desc: '双链关系图' },
  { icon: '📚', title: '知识库', slot: 'wiki', view: 'wiki', group: 'knowledge', desc: '结构化知识页' },
  { icon: '📄', title: '新建文档', slot: 'template', view: 'template', group: 'knowledge' },
  { icon: '📅', title: '任务日历', slot: 'calendar', view: 'calendar', group: 'collab' },
  { icon: '📋', title: '任务看板', slot: 'taskboard', view: 'taskboard', group: 'collab' },
  { icon: '📊', title: '项目看板', slot: 'dashboard', view: 'dashboard', group: 'collab' },
  { icon: '🤖', title: 'AI 工具', slot: 'rag-view', view: 'rag', group: 'ai', desc: '语料 / 问答 / 模型' },
  { icon: '🔌', title: '智能体接入', slot: 'agent-view', view: 'agent', group: 'global' },
  { icon: '🏠', title: '我的', slot: 'me-view', view: 'me', group: 'global' },
  { icon: '📊', title: '工作台', slot: 'home', view: 'home', group: 'global' },
  { icon: '🔧', title: '设置', slot: 'settings', view: 'settings', group: 'system' },
  { icon: '⚙', title: '管理控制台', slot: 'admin-console', view: 'admin', group: 'system' },
  { icon: '👤', title: '用户管理', slot: 'admin-nav', view: 'admin-users', group: 'system' },
  /* 未登记 group：宁可多显不可静默吞掉 */
  { icon: '🧪', title: '野功能', slot: 'wild', view: 'wild', group: 'brand-new-group', desc: '新插件刚接进来' },
]

const rail = RAIL.slice()
const nav = {
  project: null, activeView: 'files',
  trashView: false, searchView: false, favView: false, rightOpen: false,
  compactRail: false, projectsList: [],
  opened: [],
  backToWelcome() { this.project = null; this.activeView = 'files' },
  openProject(p, opts) { this.project = p; this.activeView = (opts && opts.view) || 'dashboard'; this.opened.push(['project', p, this.activeView]) },
  openDir(p, path) { this.project = p; this.path = path; this.activeView = 'files'; this.opened.push(['dir', p, path]) },
  setActiveView(v) { this.activeView = v; this.opened.push(['view', v]) },
  hasBarView(v) { return rail.some((b) => (b.view || b.slot) === v) },
  setCompactRail(on) { this.compactRail = !!on },
}
const AUTH = { user: { username: 'u1', displayName: '马泉斌', role: 'user' } }
let dispatched = []

globalThis.window = {
  PrivHub: {
    api: async () => ({ ok: true, totals: { visible: 0, projects: 0, blockers: 0, blockedProjects: 0, withTasks: 0, tasks: 0, done: 0, avgPercent: null, buckets: { todo: 0, doing: 0, review: 0, done: 0 } }, projects: [], mine: { total: 0, open: 0, project: null, tasks: [], partial: false }, personal: null, tasksDisabled: false }),
    AUTH, nav, barItems: rail, badges: { trash: 3 },
    THEME: { theme: 'light' }, applyTheme() {}, toast() {},
    openBarItem(bi) { dispatched.push(bi.view || bi.slot); nav.activeView = bi.view || bi.slot },
  },
}

let ProjectNav, LayerBar, MeView, IA
try {
  const mod = await import(SHELL_URL)
  ProjectNav = mod.default.slots['project-nav']
  LayerBar = mod.default.slots['layer-bar']
  MeView = mod.default.slots['me-view']
  IA = await import(IA_URL)
  if (!ProjectNav || !LayerBar || !MeView) throw new Error('新层级 slot（project-nav / layer-bar / me-view）缺失')
} catch (e) {
  console.log('  ❌ 加载 shell 客户端模块失败：' + (e && e.message))
  process.exit(1)
}

/**
 * 组装一个「够像 Vue 实例」的对象：computed → getter，methods → 绑定方法。
 *
 * `lifecycle=true` 时**真的调用 mounted()**：Vue 挂载时会跑它，
 * 而「当前视图藏在更多里就自动展开」这条行为正是写在 mounted 里的。
 * 不调用等于 mock 与组件脱节 —— 断言会红在一个并不存在的缺陷上。
 */
function mount(C, lifecycle = false) {
  const o = C.data()
  for (const [k, fn] of Object.entries(C.computed || {})) Object.defineProperty(o, k, { get: fn.bind(o), configurable: true })
  for (const [k, fn] of Object.entries(C.methods || {})) o[k] = fn.bind(o)
  if (lifecycle && typeof C.mounted === 'function') C.mounted.call(o)
  return o
}
const views = (items) => items.map((b) => b.view || b.slot)

/* ══════════ 1. 单一真源：两处导航读同一份归组数据 ══════════ */
console.log('\n── 单一真源 ──')
{
  ok(IA.SECTION_DEFS.map((d) => d.id).join(',') === 'files,knowledge,collab,ai',
    '四个类别与既有竖栏一致（新旧导航同源，不会归属漂移）')
  ok(IA.PROJECT_TABS.map((t) => t.id).join(',') === 'board,tasks,schedule,files',
    '项目层恰好四个主 tab，顺序为 看板/任务/日程/文件')
  ok(IA.PROJECT_TABS.map((t) => t.label).join(',') === '看板,任务,日程,文件', '四个 tab 的中文名正确')
  ok(IA.tabOfView('search').id === 'files', '搜索归「文件」tab（同族视图不掉高亮）')
  ok(IA.tabOfView('trash').id === 'files', '回收站归「文件」tab')
  ok(IA.tabOfView('favorites').id === 'files', '收藏归「文件」tab')
  ok(IA.tabOfView('calendar').id === 'schedule', '任务日历归「日程」tab')
  ok(IA.tabOfView('admin') === null, '管理视图不属任何项目 tab')
  ok(IA.GLOBAL_ORDER.join(',') === 'home,mindmap-global,agent', '全局组顺序未变（不挤走既有入口）')
}

/* ══════════ 2. 项目层：只渲染装得上的 tab ══════════ */
console.log('\n── 项目层四 tab ──')
{
  nav.project = 'AI小说研究'
  nav.activeView = 'dashboard'
  const o = mount(ProjectNav)
  ok(o.tabs.map((t) => t.id).join(',') === 'board,tasks,schedule,files', '四个 tab 都装得上时全部渲染')
  ok(o.tabs[0].landing === 'dashboard', '「看板」落到项目看板')
  ok(o.isTabOn(o.tabs[0]) === true, '当前视图 = 项目看板 → 看板 tab 高亮')
  ok(o.currentTab === 'board', 'currentTab 由 activeView 反查（不另存 tab 状态）')

  /* 同族视图：高亮不能掉 */
  for (const [v, flag] of [['search', 'searchView'], ['favorites', 'favView'], ['trash', 'trashView']]) {
    nav.activeView = v; nav[flag] = true
    const x = mount(ProjectNav)
    ok(x.currentTab === 'files', `在「${v}」里时主 tab 仍停在「文件」（同族不掉高亮）`)
    ok(x.tabs.find((t) => t.id === 'files').subs.some((s) => (s.view || s.slot) === v),
      `「${v}」作为文件族的子入口出现（不占别处版面）`)
    nav[flag] = false
  }

  /* 点当前 tab 不该把人弹回文件页 —— 主导航是位置不是开关 */
  nav.activeView = 'dashboard'
  const y = mount(ProjectNav)
  dispatched = []
  y.openTab(y.tabs[0])
  ok(dispatched.length === 1 && dispatched[0] === 'dashboard',
    '点当前 tab 停在它的落地页（不 toggle 回文件视图）')
}

/* ══════════ 3. 一条不删：主 tab 之外的功能全部进「更多」 ══════════ */
console.log('\n── 一条不删：更多抽屉覆盖全部剩余功能 ──')
{
  nav.project = 'P'; nav.activeView = 'files'
  const o = mount(ProjectNav)
  const inTabs = new Set(o.tabs.flatMap((t) => [t.landing, ...views(t.subs)]))
  const inMore = new Set(o.moreGroups.flatMap((g) => views(g.items)))
  /* 项目内可用条目（排除全局/系统/控制台侧栏）必须**全部**有归属 */
  const projectItems = rail.filter((b) => !['global', 'system'].includes(b.group) && b.slot !== 'admin-nav')
  const homeless = projectItems.filter((b) => !inTabs.has(b.view || b.slot) && !inMore.has(b.view || b.slot))
  ok(homeless.length === 0,
    `项目内功能全部有归属，无家可归 ${homeless.length} 个${homeless.length ? '：' + views(homeless).join(', ') : ''}`)
  ok(inMore.has('wiki') && inMore.has('kg') && inMore.has('tags') && inMore.has('template') && inMore.has('refcheck'),
    '知识族五项都在「更多」里（低频下沉，不是删除）')
  ok(inMore.has('rag'), 'AI 工具在「更多」里')
  ok(inMore.has('wild'), '未登记 group 的新功能也进「更多」（宁可多显，不静默吞掉）')
  ok(!inMore.has('admin-users'), '控制台侧栏专用条目不混进项目导航')

  const knowledge = o.moreGroups.find((g) => g.id === 'knowledge')
  ok(views(knowledge.items).join(',') === 'wiki,kg,tags,template,refcheck',
    '「更多」里知识族按既定频率排序（不是输入顺序）')

  /* 抽屉开合 + 当前视图藏在里面时自动展开 */
  ok(o.moreOpen === false, '「更多」默认收起（首层只留四 tab）')
  o.toggleMore()
  ok(o.moreOpen === true, '点「更多」展开')
  dispatched = []
  o.openItem(knowledge.items[0])
  ok(dispatched[0] === 'wiki', '「更多」里的条目点击后交给骨架分发器（真的能打开）')
  ok(o.moreOpen === false, '打开后收起抽屉，让内容区完整可见')

  nav.activeView = 'kg'
  const z = mount(ProjectNav, true)   // 真跑 mounted：自动展开这条行为就写在里面
  ok(z.moreHasActive === true, '当前视图藏在「更多」里时能被认出（据此点提示点）')
  ok(z.moreOpen === true, 'mount 时自动展开，保证高亮项可见')
  /* 切项目要收起上一个项目的展开态（上下文不串味）。
   * project 是 computed（只读 getter），改的是它的真源 nav.project。 */
  nav.project = '另一个项目'
  const w = mount(ProjectNav, true)
  ok(w.moreOpen === true, '切项目后当前视图仍在更多里 → 依旧展开（高亮项始终可见）')
  nav.activeView = 'files'
  const w2 = mount(ProjectNav, true)
  ok(w2.moreOpen === false, '切到主 tab 的视图后不再强制展开更多')
}

/* ══════════ 4. 缺席不装死入口 ══════════ */
console.log('\n── 功能缺席：不渲染死入口，也不静默丢弃 ──')
{
  const saved = rail.slice()
  /* 把协作族全摘掉（模拟功能开关关闭）：看板/任务/日程三个 tab 应消失，文件仍在 */
  rail.splice(0, rail.length, ...saved.filter((b) => b.group !== 'collab'))
  nav.project = 'P'; nav.activeView = 'files'
  const o = mount(ProjectNav)
  ok(o.tabs.map((t) => t.id).join(',') === 'files', '协作功能关闭后只剩文件 tab（不留点了没反应的死入口）')
  rail.splice(0, rail.length, ...saved)

  /* 只摘掉 dashboard：看板 tab 应整块消失（它的族只有这一个视图） */
  rail.splice(0, rail.length, ...saved.filter((b) => (b.view || b.slot) !== 'dashboard'))
  const o2 = mount(ProjectNav)
  ok(!o2.tabs.some((t) => t.id === 'board'), '项目看板缺席 → 看板 tab 不渲染')
  ok(o2.tabs.some((t) => t.id === 'tasks'), '任务 tab 不受影响')
  rail.splice(0, rail.length, ...saved)

  /* 摘掉 files 但留着 search：文件 tab 应退到搜索作为落地页，而不是整块消失 */
  rail.splice(0, rail.length, ...saved.filter((b) => (b.view || b.slot) !== 'files'))
  const o3 = mount(ProjectNav)
  const ft = o3.tabs.find((t) => t.id === 'files')
  ok(!!ft && ft.landing === 'search', '默认落地页缺席时退到同族第一个可用视图（族不整块消失）')
  rail.splice(0, rail.length, ...saved)
}

/* ══════════ 5. 层级条：你在哪一层 + 回上一层 ══════════ */
console.log('\n── 层级条 ──')
{
  nav.project = null; nav.activeView = 'home'
  const o = mount(LayerBar)
  ok(o.layer === 'home', '未选项目 + 工作台视图 → 总览层')
  ok(o.leafLabel === '', '总览层不重复写末级标签')

  nav.project = 'A项目'; nav.activeView = 'dashboard'
  const p = mount(LayerBar)
  ok(p.layer === 'project', '选了项目 → 项目层')
  ok(p.leafLabel === '看板', '落在 tab 落地页时只显示 tab 名（不写「看板 · 项目看板」）')
  nav.activeView = 'search'
  ok(mount(LayerBar).leafLabel === '文件 · 搜索', '同族子视图显示「tab · 功能」，路径清楚')

  nav.project = null; nav.activeView = 'me'
  ok(mount(LayerBar).layer === 'me', '个人视图 → 个人层')
  nav.activeView = 'admin'
  const a = mount(LayerBar)
  ok(a.layer === 'admin' && a.isAdminLayer === true, '管理视图 → 管理层（暖色带区分）')

  /* 安全契约：非管理员看不到管理入口（不是禁用可见） */
  const savedRail = rail.slice()
  rail.splice(0, rail.length, ...savedRail.filter((b) => (b.view || b.slot) !== 'admin'))
  const noAdmin = mount(LayerBar)
  ok(noAdmin.hasAdmin === false, '管理条目被开关/角色过滤掉后，层级条不渲染管理入口')
  dispatched = []
  noAdmin.goAdmin()
  ok(dispatched.length === 0, '没有管理入口时 goAdmin 不做任何跳转（不靠兜底硬跳）')
  rail.splice(0, rail.length, ...savedRail)

  /* 回退出口真的走骨架导航 */
  nav.project = 'A项目'; nav.activeView = 'kg'; nav.opened = []
  const back = mount(LayerBar)
  back.goProject()
  ok(nav.opened.some((x) => x[0] === 'project' && x[1] === 'A项目'), '点项目名回到该项目落地页')
  nav.opened = []
  back.goHome()
  ok(nav.opened.some((x) => x[0] === 'view' && x[1] === 'home'), '点「总览」回到项目总览')
  nav.opened = []
  back.goMe()
  ok(nav.opened.some((x) => x[0] === 'view' && x[1] === 'me'), '点「我的」进个人层')
}

/* ══════════ 6. 个人层：派生只读，不另存数据 ══════════ */
console.log('\n── 个人层「我的」──')
{
  nav.activeView = 'me'
  const o = mount(MeView)
  ok(o.tabs.map((t) => t.id).join(',') === 'tasks,schedule,files,prefs',
    '个人层四个 tab：任务/日程/文件/偏好')

  const t0 = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() })()
  const DAY = 86400000
  o.ov = {
    tasksDisabled: false,
    mine: {
      total: 4, open: 3, project: 'A项目', partial: true,
      tasks: [
        { project: 'A项目', id: '1', title: '逾期活', columnId: 'col_doing', columnTitle: '进行中', done: false, dueDate: t0 - 2 * DAY, priority: 'high', labels: [] },
        { project: 'B项目', id: '2', title: '今天的活', columnId: 'col_todo', columnTitle: '待办', done: false, dueDate: t0, priority: 'normal', labels: [] },
        { project: 'A项目', id: '3', title: '以后的活', columnId: 'col_todo', columnTitle: '待办', done: false, dueDate: t0 + 5 * DAY, priority: 'normal', labels: [] },
        { project: 'A项目', id: '4', title: '做完的活', columnId: 'col_done', columnTitle: '已完成', done: true, dueDate: t0 - 9 * DAY, priority: 'normal', labels: [] },
      ],
    },
    personal: { dir: '马泉斌', entries: null },
  }
  ok(o.openTasks.length === 3, '未完成任务 3 项（已完成的不催）')
  ok(o.doneTasks.length === 1, '已完成单列，不混进待办')
  const groups = o.schedule
  ok(groups.map((g) => g.id).join(',') === 'late,today,upcoming',
    '日程按 逾期/今天/接下来 分组（无日期的这组为空被剔除）')
  ok(groups[0].items[0].title === '逾期活', '逾期组排在最前（最该先处理）')
  ok(!groups.some((g) => g.items.some((t) => t.done)), '已完成的任务不进日程（做完的不该继续催）')
  ok(o.dueLabel(o.openTasks[0]) === '逾期 2 天', '逾期天数按自然日算，与总览同一口径')
  ok(o.dueClass(o.openTasks[1]) === 'today', '今天到期有独立样式（不只靠颜色，文案也写「今天到期」）')
  ok(o.numText(o.fileCount) === '—', '目录条目数未取到显示「—」，不显示 0')

  /* 点任务 → 进它所属项目的任务看板，不是随便挑一个项目 */
  nav.opened = []
  o.openTask(o.openTasks[0])
  ok(nav.opened.some((x) => x[0] === 'project' && x[1] === 'A项目' && x[2] === 'taskboard'),
    '点任务进「它所属项目」的任务看板（数字与跳转目标一致）')

  /* 导航形态开关真的写进骨架 */
  o.toggleRail()
  ok(nav.compactRail === true, '偏好里切到紧凑竖栏 → 写进骨架状态（不是只改本地变量）')
  o.toggleRail()
  ok(nav.compactRail === false, '再切回层级导航')

  /* 任务功能关闭：说清原因，不编造数字 */
  o.ov.tasksDisabled = true
  ok(o.tasksDisabled === true, '任务功能关闭时给出说明态（不是显示 0 项）')
}

/* ══════════ 7. 骨架接线：新槽真的挂进了渲染链 ══════════ */
console.log('\n── 骨架接线 ──')
{
  const { readFileSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  const { dirname, join } = await import('node:path')
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
  const skel = readFileSync(join(ROOT, 'frontend', 'index.html'), 'utf8')
  ok(/slotComps\['layer-bar'\]/.test(skel), '骨架挂载 layer-bar（层级条）')
  ok(/slotComps\['project-nav'\]/.test(skel), '骨架挂载 project-nav（项目层主导航）')
  ok(/nav\.project !== null/.test(skel) && /project-nav/.test(skel), '项目层导航只在选中项目后出现')
  ok(/slotComps\['me-view'\]/.test(skel) && /activeView === 'me'/.test(skel), '骨架挂载 me-view 且认得 view=me')
  ok(/view === 'me'/.test(skel), '分发白名单认得 me（不认得就点了没反应）')
  ok(/compactRail/.test(skel) && /setCompactRail/.test(skel), '两套导航形态可切换，状态与持久化都在骨架')
  /* 旧竖栏必须仍然可达（一条不删） */
  ok(/slotComps\['app-iconbar'\]/.test(skel), '旧图标竖栏仍在渲染链里（紧凑模式可切回，不是删除）')
  const mf = JSON.parse(readFileSync(join(ROOT, 'plugins', 'privhub-shell', 'client', 'manifest.json'), 'utf8'))
  for (const s of ['layer-bar', 'project-nav', 'me-view']) {
    ok((mf.slots || []).includes(s), `manifest 声明了新槽 ${s}（不声明骨架拿不到组件）`)
  }
  ok((mf.barItems || []).some((b) => b.view === 'me' && b.group === 'global'),
    '「我的」有 barItem 入口（进 cap 过滤链，可被管理员统一关掉）')
}

console.log('\n========================================================')
console.log(`  新层级导航回归：${pass} 通过 / ${fail} 失败`)
if (fail) { console.log('  失败项：'); for (const f of failures) console.log('    - ' + f) }
console.log('========================================================')
process.exit(fail ? 1 : 0)