/**
 * privhub-shell · client / ia —— 信息架构的**单一真源**
 *
 * 新前端按「层级」组织界面，而不是按「功能清单」堆图标：
 *
 *   L0 入口层   登录 / 会话（骨架负责，不在这里）
 *   L1 总览层   工作台 = 整个盘子怎么样（跨项目 KPI / 管线 / 项目卡片）
 *   L2 项目层   选中一个项目后，固定 4 个主 tab：文件 · 看板 · 任务 · 日程
 *               其余项目内功能（知识 / AI / 治理）收进「更多」——低频只下沉，不删除
 *   L2 个人层   我的：任务 / 日程 / 文件 / 偏好
 *   L3 管理层   管理控制台（自带分区路由，非 admin 不可见）
 *
 * ## 为什么单独一个文件
 * 图标栏与新的层级导航**必须读同一份归组数据**，否则两处会各自演化：
 * 同一个功能在竖栏里属「知识」、在 tab 里属「更多」，用户就找不到它了。
 * 本文件只描述「谁属于哪一段、段内什么顺序」，不含任何渲染逻辑，
 * 也不读权限 —— 权限过滤后的 barItems 由骨架传进来（capFeature 已在骨架过滤）。
 *
 * ## 一条硬约束
 * **低频只是下沉，不是消失**：`order` 里列出的每一项都必须在界面上可达。
 * 主 tab 之外的功能进「更多」抽屉，抽屉里每项照样可点、照样有说明气泡。
 * 既有回归（tests/iconbar.mjs）逐条钉住 order，本文件不得删项、不得改序。
 *
 * @module privhub-shell/client/ia
 */

/** 项目内功能的四个类别（与既有竖栏分段完全一致，顺序即频率）。 */
export const SECTION_DEFS = [
  { id: 'files',     label: '文件', icon: '🗄️', order: ['files', 'search', 'favorites', 'trash'],
    desc: '对当前项目里文件的操作：浏览 / 上传 / 搜索 / 收藏 / 回收站。', doc: '01-文件与目录.md' },
  { id: 'knowledge', label: '知识', icon: '🧠', order: ['wiki', 'kg', 'tags', 'template', 'refcheck'],
    desc: '把文件变成能找、能连、能读的知识：知识库 / 图谱 / 标签 / 新建文档 / 引用检查。', doc: '02-知识组织.md' },
  { id: 'collab',    label: '协作', icon: '🤝', order: ['taskboard', 'dashboard', 'calendar'],
    desc: '记任务、展示进度、指派到人：任务看板 / 项目看板 / 任务日历。', doc: '03-协作与看板.md' },
  { id: 'ai',        label: 'AI',   icon: '✨', order: ['rag'],
    desc: '站内 AI 工具：语料仓库 / 向量化 / 问答 / 模型与 Key 管理。', doc: '04-AI与智能体接入.md' },
]

/** 全局组的一级图标（跨项目 / 实例级，未选项目时也常驻）。 */
export const GLOBAL_ORDER = ['home', 'mindmap-global', 'agent']
/** 系统组（竖栏底部固定）。 */
export const SYSTEM_ORDER = ['admin', 'settings']
export const KNOWN_GROUPS = new Set([...SECTION_DEFS.map((d) => d.id), 'global', 'system'])

/** 竖栏每段直显的常用条目数，其余进段内「更多」（频率决定位置）。 */
export const PRIMARY_COUNT = 2

/**
 * 项目层的固定主 tab —— 顺序即版面，**只有这四类**占据首层。
 *
 * 每个 tab 指向「一族视图」：`views` 的第一个是该 tab 的落地页，
 * 其余是同族视图（点进搜索/收藏/回收站时，主 tab 仍停在「文件」，
 * 因为那确实是文件这一族的事，不该让 tab 高亮凭空消失）。
 *
 * 为什么「文件」排在最前：选项目进来最该先看「这个项目里有什么文件」，
 * 与骨架的 PROJECT_LANDING（文件 → 看板 → 任务）同一口径（2026-11-13 用户要求）。
 */
export const PROJECT_TABS = [
  { id: 'files', label: '文件', icon: '🗄️', views: ['files', 'search', 'favorites', 'trash'], desc: '项目文件：浏览 / 上传 / 搜索 / 收藏 / 回收站。' },
  { id: 'board', label: '看板', icon: '📊', views: ['dashboard'], desc: '这个项目的进度与计划：分区看板，AI 可维护。' },
  { id: 'tasks', label: '任务', icon: '📋', views: ['taskboard'], desc: '任务卡：待办 / 进行中 / 待审核 / 已完成，指派到人。' },
  { id: 'schedule', label: '日程', icon: '📅', views: ['calendar'], desc: '按日期看任务：月 / 周 / 日三视图，数据同任务看板。' },
]

/**
 * 项目层「更多」抽屉里的分组（低频功能的新家）。
 * 只收**不在主 tab 里**的项目内功能：知识族、AI 族。
 * 文件族的搜索/收藏/回收站已在「文件」tab 内部作为子入口，不重复出现在这里。
 */
export const MORE_GROUPS = [
  { id: 'knowledge', label: '知识', icon: '🧠' },
  { id: 'ai', label: 'AI', icon: '✨' },
]

/** 按给定的 view 顺序排；未列入的排在末尾（保持稳定）。 */
export function byOrder(order) {
  return (items) => items.slice().sort((a, b) => {
    const ia = order.indexOf(a.view || a.slot)
    const ib = order.indexOf(b.view || b.slot)
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib)
  })
}

/** 条目对应的视图键（view 优先，退回 slot）。 */
export const viewKey = (bi) => bi.view || bi.slot

/** 主 tab 覆盖的全部视图（用于「其余功能进更多」的判定，单一真源）。 */
export const TAB_VIEWS = new Set(PROJECT_TABS.flatMap((t) => t.views))

/** 当前视图属于哪个主 tab（没有归属返回 null，例如管理/工作台等实例级视图）。 */
export function tabOfView(v) {
  return PROJECT_TABS.find((t) => t.views.includes(v)) || null
}