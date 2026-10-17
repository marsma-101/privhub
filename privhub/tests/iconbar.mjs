/**
 * iconbar.mjs — 左栏「项目（一级） / 项目内功能（二级·手风琴）」导航回归套件
 *
 * 为什么需要这一套：
 *   左栏重排后，真正容易悄悄坏掉的是**运行期的分组结果**——
 *   「没选项目时二级还整段露着」「段内顺序退回 manifest 的字母序」「手风琴一次开俩」
 *   这类问题，integrity 只看文件契约、frontend-templates 只编译模板（语法对就绿），
 *   两个都发现不了。而这三条恰恰是用户明确要的交互（2026-10-14 需求）。
 *
 * 做法：给模块一个最小 window 桩（模块顶层只用到 window.PrivHub），
 *   直接 import 真实的 plugins/privhub-shell/client/index.js，
 *   取出 AppIconbar，把 computed 变成 getter、methods 绑上去，
 *   喂一份**故意打乱顺序**的合成 barItems，对 sections / globalItems / bottomItems
 *   与 toggleSection / syncOpen 的**返回值**做断言。不连服务、不起 DOM，纯静态套件。
 *
 *   node tests/iconbar.mjs
 *
 * @module tests/iconbar
 */

const MODULE_URL = new URL('../plugins/privhub-shell/client/index.js', import.meta.url).href

let pass = 0
let fail = 0
const failures = []

function ok(cond, msg) {
  if (cond) pass++
  else { fail++; failures.push(msg) }
  console.log((cond ? '  ✅ ' : '  ❌ ') + msg)
}

/* ══════════ 1. 装载真实客户端模块（最小 window 桩） ══════════ */

/* 合成条目：顺序**刻意打乱**（搜索在文件前、日历在看板前、设置在管理前），
 * 这样 byOrder 一旦失效、退回输入顺序，断言就会红 —— 否则绿的没有意义。
 * group 与真实 manifest 一致；另掺一条 slot=admin-nav 的条目（应被摘掉）。 */
const RAIL = [
  { icon: '🔍', title: '搜索', slot: 'search-view', view: 'search', group: 'files' },
  { icon: '📁', title: '文件', slot: 'panel', view: 'files', group: 'files' },
  { icon: '⭐', title: '收藏', slot: 'fav-view', view: 'favorites', group: 'files' },
  { icon: '🗑', title: '回收站', slot: 'trash-view', view: 'trash', group: 'files' },

  { icon: '🕸', title: '知识图谱', slot: 'kg', view: 'kg', group: 'knowledge' },
  { icon: '📚', title: '知识库', slot: 'wiki', view: 'wiki', group: 'knowledge' },
  { icon: '🔗', title: '引用检查', slot: 'refcheck', view: 'refcheck', group: 'knowledge' },
  { icon: '📄', title: '新建文档', slot: 'template', view: 'template', group: 'knowledge' },
  { icon: '🏷', title: '标签', slot: 'tags', view: 'tags', group: 'knowledge' },

  { icon: '📅', title: '任务日历', slot: 'calendar', view: 'calendar', group: 'collab' },
  { icon: '📊', title: '项目看板', slot: 'dashboard', view: 'dashboard', group: 'collab' },
  { icon: '📋', title: '任务看板', slot: 'taskboard', view: 'taskboard', group: 'collab' },

  { icon: '🤖', title: 'AI 工具', slot: 'rag-view', view: 'rag', group: 'ai' },

  { icon: '🔌', title: '智能体接入', slot: 'agent-view', view: 'agent', group: 'global' },
  { icon: '🏠', title: '工作台', slot: 'home', view: 'home', group: 'global' },

  { icon: '🔧', title: '设置', slot: 'settings', view: 'settings', group: 'system' },
  { icon: '⚙', title: '管理控制台', slot: 'admin-console', view: 'admin', group: 'system' },

  // 控制台侧栏专用条目：不该出现在图标栏里
  { icon: '👤', title: '用户管理', slot: 'admin-nav', view: 'admin-users', group: 'system' },
]

const nav = {
  project: null,
  activeView: 'files',
  trashView: false, searchView: false, favView: false, rightOpen: false,
  projectsList: [],
  lastHelpDoc: null,
  backToWelcome() { this.project = null },
  openHelp(doc) { this.lastHelpDoc = doc },
}

globalThis.window = {
  PrivHub: {
    api: async () => ({ ok: false, error: '（静态套件不连服务）' }),
    AUTH: { user: null },
    nav,
    barItems: RAIL,
    badges: { trash: 0 },
    openBarItem() {},
    loadBarItems: () => RAIL,
  },
}

let AppIconbar
try {
  const mod = await import(MODULE_URL)
  AppIconbar = mod.default.slots['app-iconbar']
  if (!AppIconbar) throw new Error("slots['app-iconbar'] 缺失")
} catch (e) {
  console.log('  ❌ 加载 shell 客户端模块失败：' + (e && e.message))
  process.exit(1)
}

/** 组装一个"够像 Vue 实例"的对象：computed → getter，methods → 绑定方法。 */
function mount() {
  const o = AppIconbar.data()
  for (const [k, fn] of Object.entries(AppIconbar.computed)) {
    Object.defineProperty(o, k, { get: fn.bind(o), configurable: true })
  }
  for (const [k, fn] of Object.entries(AppIconbar.methods)) o[k] = fn.bind(o)
  return o
}

const views = (items) => items.map((bi) => bi.view || bi.slot)

/* ══════════ 2. 未选项目：一级没选，二级（项目内功能）整段不该出现 ══════════ */

console.log('\n── 未选项目：二级整段隐藏，全局/系统仍在 ──')
{
  nav.project = null
  const o = mount()

  ok(o.sections.length === 0, '未选项目 → sections 为空（二级功能一个都不露）')
  ok(o.globalItems.length > 0, '未选项目 → 全局组（工作台 / 智能体）照常显示')
  ok(o.bottomItems.length > 0, '未选项目 → 系统组（管理 / 设置）照常显示')
  ok(o.isActive({ view: 'files' }) === false, '未选项目 → 「文件」不高亮（files 需 project≠null）')
}

/* ══════════ 3. 选了项目：四段、顺序、段内排序 ══════════ */

console.log('\n── 选了项目：二级按类别分四段，段内按既定顺序 ──')
{
  nav.project = 'AI小说研究'
  const o = mount()

  ok(o.sections.map((s) => s.id).join(',') === 'files,knowledge,collab,ai',
    '二级恰好四段且顺序为 文件 / 知识 / 协作 / AI')
  ok(o.sections.map((s) => s.label).join(',') === '文件,知识,协作,AI',
    '四段中文标签正确')
  ok(o.sections.every((s) => typeof s.icon === 'string' && s.icon.length > 0),
    '四段各自带一个类别图标（图标栏只显示图标，类别靠图标区分）')
  ok(new Set(o.sections.map((s) => s.icon)).size === o.sections.length,
    '四个类别图标互不相同（只看图标也不会混）')
  ok(o.sections.every((s) => s.items.length > 0), '每一段都非空（空段被剔除）')

  const byId = Object.fromEntries(o.sections.map((s) => [s.id, views(s.items)]))
  ok(byId.files.join(',') === 'files,search,favorites,trash', '文件段顺序：文件/搜索/收藏/回收站')
  ok(byId.knowledge.join(',') === 'wiki,kg,tags,template,refcheck', '知识段顺序：知识库/知识图谱/标签/新建文档/引用检查')
  ok(byId.collab.join(',') === 'taskboard,dashboard,calendar', '协作段顺序：任务看板/项目看板/任务日历')
  ok(byId.ai.join(',') === 'rag', 'AI 段只含 AI 工具')

  ok(views(o.globalItems).join(',') === 'home,agent', '全局组顺序：工作台/智能体接入')
  ok(views(o.bottomItems).join(',') === 'admin,settings', '系统组顺序：管理控制台/设置')
}

/* ══════════ 4. 契约：admin-nav 不入栏；未知 group 不被吞 ══════════ */

console.log('\n── 契约：控制台侧栏条目不入栏；未知 group 归入全局而非丢弃 ──')
{
  nav.project = 'P'
  const o = mount()
  const all = [].concat(...o.sections.map((s) => s.items), o.globalItems, o.bottomItems)

  ok(all.every((bi) => bi.slot !== 'admin-nav'), 'admin-nav 条目被摘掉，不出现在图标栏任何位置')
  ok(!views(all).includes('admin-users'), '侧栏专用的「用户管理」没有混进来')

  // 空段：把协作三条摘掉，协作段应整段消失（而不是留个空壳）
  const saved = RAIL.splice(0, RAIL.length, ...RAIL.filter((x) => x.group !== 'collab'))
  const o2 = mount()
  ok(!o2.sections.map((s) => s.id).includes('collab'), '协作条目全关掉后，「协作」整段消失')
  RAIL.splice(0, RAIL.length, ...saved)

  // 未登记 group：宁可多显，不可静默吞掉
  RAIL.push({ icon: '❓', title: '野条目', slot: 'wild', view: 'wild', group: 'unknown-xyz' })
  const o3 = mount()
  ok(views(o3.globalItems).includes('wild'), '未知 group 的条目并入全局组（不被静默丢弃）')
  ok(!o3.sections.some((s) => s.items.some((bi) => bi.view === 'wild')), '未知 group 不混进任何二级段')
  RAIL.pop()
}

/* ══════════ 5. 手风琴：一次只开一个；再点当前项则收起 ══════════ */

console.log('\n── 手风琴交互 ──')
{
  nav.project = 'P'
  const o = mount()
  ok(o.open === null || typeof o.open === 'string', '初始 open 为 null 或某段 id')

  o.open = null
  o.toggleSection('files')
  ok(o.open === 'files', '点「文件」→ 展开文件段')
  o.toggleSection('knowledge')
  ok(o.open === 'knowledge', '再点「知识」→ 知识段展开，文件段自动收起（一次只开一个）')
  o.toggleSection('knowledge')
  ok(o.open === null, '再次点当前展开段 → 收起')

  // syncOpen：切视图/项目时自动展开「当前视图所在的那一段」，保证高亮项可见
  nav.activeView = 'rag'
  o.syncOpen()
  ok(o.open === 'ai', '切到 AI 工具 → 自动展开 AI 段')
  nav.activeView = 'files'
  o.syncOpen()
  ok(o.open === 'files', '切到文件 → 自动展开文件段')
  nav.activeView = 'kg'
  o.syncOpen()
  ok(o.open === 'knowledge', '切到知识图谱 → 自动展开知识段')

  // 切到无归属的视图（管理控制台）时不乱动，保留用户手动展开状态
  o.open = 'collab'
  nav.activeView = 'admin'
  o.syncOpen()
  ok(o.open === 'collab', '切到管理控制台（不属于任何段）→ 保留现有展开状态')

  // 未选项目时 syncOpen 不该炸，也开不出任何段（sections 为空 → 找不到所属段 → 保持原值）
  nav.project = null
  nav.activeView = 'files'
  o.open = null
  o.syncOpen()
  ok(o.open === null, '未选项目 → syncOpen 开不出任何段（无二级可开）')
}

/* ══════════ 6. 高亮：单选状态源 nav，不与项目态冲突 ══════════ */

console.log('\n── 高亮判定 ──')
{
  nav.project = 'P'
  const o = mount()

  nav.activeView = 'files'; nav.trashView = false
  ok(o.isActive({ view: 'files' }) === true, '项目内、activeView=files → 文件高亮')
  ok(o.isActive({ view: 'trash' }) === false, '未切到回收站 → 回收站不高亮')

  nav.activeView = 'files'; nav.trashView = true
  ok(o.isActive({ view: 'trash' }) === true, 'trashView=true → 回收站高亮')
  ok(o.isActive({ view: 'files' }) === false, '回收站打开时文件不跟着亮')

  nav.trashView = false; nav.activeView = 'dashboard'
  ok(o.isActive({ view: 'dashboard' }) === true, '视图型条目按 activeView 高亮')
}

/* ══════════ 7. 悬停说明气泡：desc 驱动 + 跳说明文档 ══════════
 * 这段验证「鼠标停在图标上会弹说明、并能跳到说明文件」这条交互的**运行期逻辑**：
 *   - 只有声明 desc 的条目才弹（没 desc 的退回原生 title，行为与迁前一致）；
 *   - 分类把手也带 desc/doc（来自 SECTION_DEFS）；
 *   - 「查看完整说明」把 doc 交给骨架的 nav.openHelp。 */

console.log('\n── 悬停说明气泡 ──')
{
  nav.project = 'P'
  const o = mount()

  ok(o.sections.every((s) => typeof s.desc === 'string' && s.desc.length > 0),
    '四个分类把手都带 desc（悬停可见分类说明）')
  ok(o.sections.every((s) => /^\d{2}-.+\.md$/.test(s.doc || '')),
    '分类把手都指向一份说明文档（NN-名称.md）')

  // 合成条目没有 desc → 不弹气泡
  const noDesc = { icon: '🧪', title: '无说明', slot: 'x', view: 'x', group: 'files' }
  o.help = null
  o.showHelp(noDesc, { currentTarget: null })
  ok(o.help === null, '没有 desc 的条目：不弹自定义气泡（退回原生 title）')

  // 有 desc → 弹气泡，并按被悬停元素定位
  const withDesc = { icon: '🧪', title: '有说明', slot: 'y', view: 'y', group: 'files', desc: '一句话说明', doc: '03-协作与看板.md' }
  o.showHelp(withDesc, { currentTarget: { getBoundingClientRect: () => ({ top: 120, right: 62 }) } })
  ok(o.help === withDesc, '有 desc 的条目：弹出气泡并记录条目')
  ok(o.helpPos.top === 120 && o.helpPos.left === 72, '气泡定位取自被悬停元素的 boundingRect（右缘 +10px）')

  // 跳说明文档：doc 交给骨架 nav.openHelp
  nav.lastHelpDoc = null
  o.openHelpDoc(withDesc)
  ok(nav.lastHelpDoc === '03-协作与看板.md', '「查看完整说明」把该条目的 doc 交给 nav.openHelp')
  ok(o.help === null, '跳转后立即收起气泡')

  // 缺 doc 时回落到总览，不至于点了没反应
  nav.lastHelpDoc = null
  o.openHelpDoc({ icon: '🧪', title: '无doc', desc: 'x' })
  ok(nav.lastHelpDoc === '00-总览.md', '条目没写 doc 时回落到总览文档')

  // 鼠标离开：延迟收起（给滑到气泡上的宽限）
  o.showHelp(withDesc, { currentTarget: null })
  o.hideHelp()
  ok(o.help === withDesc, '刚离开时气泡仍在（留出滑到气泡上的宽限）')
  o.keepHelp()
  await new Promise((r) => setTimeout(r, 220))
  ok(o.help === withDesc, '滑到气泡上（keepHelp）→ 收起被取消，气泡留在原地')
  o.hideHelp()
  await new Promise((r) => setTimeout(r, 220))
  ok(o.help === null, '离开气泡后延迟收起生效')
}

console.log('\n========================================================')
console.log(`  左栏两级导航回归：${pass} 通过 / ${fail} 失败`)
if (fail) {
  console.log('  失败项：')
  for (const f of failures) console.log('    - ' + f)
}
console.log('========================================================')
process.exit(fail ? 1 : 0)
