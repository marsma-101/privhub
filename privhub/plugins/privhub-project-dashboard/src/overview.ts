/**
 * privhub-project-dashboard · overview —— 「项目总览」的跨项目聚合（纯逻辑）
 *
 * 为什么要这一层：
 *   领导要的第一屏是「整个盘子怎么样」，而不是逐个点开 N 个项目看板再心算。
 *   但**进度只能有一个真相源** —— 任务看板。所以这里不另存一份进度，
 *   而是把每个项目的 `TaskSummary`（summarizeBoard 的输出）投影成卡片，再汇总。
 *   同一份数据算两次必然漂移，这是本项目已经踩过的坑。
 *
 * 三条硬约束（改之前先读）：
 *   1. **只聚合传进来的项目。** 可见性由调用方（路由层 canAccess）决定，本文件不做权限判断，
 *      也绝不自己去枚举全部项目 —— 否则个人空间/无权项目会从聚合数字里泄露出去。
 *   2. **不编造进度。** 没有任务卡就是 `hasBoard=false`、进度显示为「—」，不拿 0% 冒充「没进展」。
 *   3. **卡点必须说清口径。** 本项目没有独立的「阻塞」列，卡点由三个可观测信号构成
 *      （逾期未完成 / WIP 超限 / 计划里标 blocked）。前端必须把口径写出来，不能只给一个数字。
 *
 * @module privhub-project-dashboard/overview
 */

import type { TaskSummary } from '../../privhub-task-board/src/core'
import type { DashboardDoc, Facts, PlanItem } from './core'

/** 一次总览最多聚合多少个项目（防超大部署把首屏拖死；超出置 truncated）。 */
export const OVERVIEW_MAX_PROJECTS = 60

/** 管线桶：把各项目**自定义列**归一到四个固定语义桶，才能跨项目堆叠比较。 */
export type Bucket = 'todo' | 'doing' | 'review' | 'done'

export const BUCKET_LABELS: Record<Bucket, string> = {
  todo: '待办', doing: '进行中', review: '待审核', done: '已完成',
}

/**
 * 列 → 桶。
 *
 * **完成与否只认 doneColumnId，绝不靠标题猜。** 这是本函数唯一的硬规则：
 * 任务看板的 `donePercent` / `doneCount` 都以 doneColumnId 为准，若这里再用
 * `/完成/` 之类的关键字认「完成列」，同一块面板上就会出现两个不同的「已完成」
 * 数字（管线段一个、合计行另一个），而且必然对不上。
 * 顺带修掉一个真错：`/完成/` 会把「**未**完成」「待完成」判成已完成，
 * 英文 `not done` / `undone` 同理 —— 关键字匹配对否定词是无能的。
 *
 * 其余三桶允许按标题归位（自建列如「测试中」「等验收」也要能进管线），
 * 认不出来的一律进 doing：「已开工未完成」是最保守的归类，
 * 不会把在途工作误报成待办（那会让领导以为还没人动）。
 */
export function bucketOfColumn(col: { id: string; title: string }, doneColumnId: string): Bucket {
  if (col.id === doneColumnId) return 'done'
  const id = String(col.id || '')
  const title = String(col.title || '')
  if (id === 'col_todo') return 'todo'
  if (id === 'col_doing') return 'doing'
  /* 标题也要认英文：自建列常被命名为 REVIEW / Review，只认中文会把它们误归成在途，
   * 于是「待审核」这一段在总览里凭空少掉一截（本轮实测出来的缺口）。 */
  if (/待审核|审核|review/i.test(id) || /待审核|审核|review/i.test(title)) return 'review'
  if (/待办|未开始|todo|backlog/i.test(title)) return 'todo'
  return 'doing'
}

export interface BlockerReason {
  /**
   * partial 不是卡点，而是**数据完整性告知**（明细被截断，上面的数字只覆盖一部分）。
   * 它不计数。此前把它塞进 kind='overdue' 是错的标签：界面若按 kind 分类展示，
   * 会把「统计不全」误报成「有任务逾期」。
   */
  kind: 'overdue' | 'wip' | 'plan' | 'partial'
  text: string
}

export interface OverviewProject {
  project: string
  /** 有任务看板数据（false = 这个项目还没建过任务，进度显示「—」而不是 0%）。 */
  hasBoard: boolean
  total: number
  doneCount: number
  /** 0–100；hasBoard=false 时为 null（渲染成「—」）。 */
  percent: number | null
  buckets: Record<Bucket, number>
  blockers: number
  reasons: BlockerReason[]
  /** 当前节点：计划里第一个 doing 项；没有 doing 就取第一个未完成项。 */
  node: string
  /** null = 未取（成员数来自廉价的用户表扫描，通常有值）。 */
  members: number | null
  /** null = 本次没做文件统计（递归扫描很贵，按需开启）。前端不得把 null 显示成 0。 */
  files: number | null
  bytesText: string
  /** 计划里最近的一个未完成截止（无则 null）。 */
  dueAt: number | null
  /** 健康度：有卡点=warn，有任务且全完成=good，其余=normal。 */
  health: 'good' | 'warn' | 'normal'
  updatedAt: number | null
}

export interface OverviewTotals {
  /** 已聚合的项目数（受 OVERVIEW_MAX_PROJECTS 限制）。 */
  projects: number
  /**
   * 用户**实际可见的项目总数**（不受聚合上限影响）。
   * 为什么要单独一个字段：`projects` 是被截断后的条数，拿它当「可见项目」KPI
   * 会把「你有 500 个项目」显示成「你有 60 个」—— 数字失真比不显示更糟。
   * 由调用方传入；未传时回落到 projects（纯函数单测场景）。
   */
  visible: number
  /** 有任务数据的项目数（平均进度只在这些项目上算，空板不拉低均值）。 */
  withTasks: number
  tasks: number
  done: number
  blockers: number
  /**
   * **有卡点的项目数**（不是卡点处数）。
   * 必须由这里算：前端若用筛选后的卡片列表去数，就会出现
   * 「卡点合计 50 处 / 0 个项目需要处理」这种自相矛盾的显示。
   */
  blockedProjects: number
  avgPercent: number | null
  buckets: Record<Bucket, number>
}

export interface OverviewResult {
  projects: OverviewProject[]
  totals: OverviewTotals
  /** 项目数超过 OVERVIEW_MAX_PROJECTS 时为 true（前端须明说「已截断」）。 */
  truncated: boolean
  scannedAt: number
}

/** 一个项目的原始输入（由路由层收集，全部来自既有加载器）。 */
export interface OverviewInput {
  project: string
  /**
   * null = 任务看板功能对该用户关闭（此时不显示进度，也不算进均值）。
   * 注意 `tasks.cardsTruncated`：上游一次最多带 200 张卡，超出时
   * 逾期数 / 最近截止 / 「我的待办」都只覆盖已取回的部分 —— 必须标成部分统计。
   */
  tasks: TaskSummary | null
  dashboard: DashboardDoc | null
  facts: Facts | null
  /**
   * 成员数的廉价来源（用户表里挂了该项目的人数）。
   * 为什么不直接用 facts.members：facts 要**递归扫全树**，一个 72GB 的库扫一遍就是几十秒，
   * 总览要聚合几十个项目，绝不能走那条路。总览默认 facts=null，成员数走这里。
   */
  members?: number
}

const emptyBuckets = (): Record<Bucket, number> => ({ todo: 0, doing: 0, review: 0, done: 0 })

/** 计划项里属于「当前节点」的那一条。 */
function currentNode(dashboard: DashboardDoc | null): string {
  if (!dashboard) return ''
  const plans: PlanItem[] = []
  for (const sec of dashboard.sections || []) {
    for (const w of sec.widgets || []) {
      if (w.type !== 'plan') continue
      for (const it of w.items || []) plans.push(it as PlanItem)
    }
  }
  const doing = plans.find((p) => p.state === 'doing')
  if (doing) return doing.text
  const pending = plans.find((p) => p.state === 'todo' || p.state === 'blocked')
  return pending ? pending.text : ''
}

/** 计划里标 blocked 的条目（这是「人明确说卡住了」，比推断出来的信号更可信）。 */
function planBlockers(dashboard: DashboardDoc | null): BlockerReason[] {
  if (!dashboard) return []
  const out: BlockerReason[] = []
  for (const sec of dashboard.sections || []) {
    for (const w of sec.widgets || []) {
      if (w.type !== 'plan') continue
      for (const it of (w.items || []) as PlanItem[]) {
        if (it.state === 'blocked') out.push({ kind: 'plan', text: it.text + (it.note ? '（' + it.note + '）' : '') })
      }
    }
  }
  return out
}

/**
 * 卡点信号（口径固定，前端照此说明）：
 *   · overdue —— 未完成且已过期（dueDate < 今天 0 点）的卡片数；
 *   · wip     —— 超出列 WIP 上限的卡片数（在制品堆积＝流动受阻）；
 *   · plan    —— 计划里被人标成 blocked 的条目。
 * 三者相加即卡点数。**口径是「问题数」而不是「受影响卡片数」**：
 * 同一张卡若既逾期、又正处在超 WIP 的列里，会同时计入两类 —— 那确实是两个
 * 不同的问题（该做完没做完 + 该限流没限流），各自都要处理。
 * 每个信号内部不重复计（一张逾期卡只算一次逾期）。
 * 界面上的口径说明与此一致，别把它当「有 N 张卡有问题」来读。
 */
function blockerSignals(tasks: TaskSummary | null, dashboard: DashboardDoc | null): { count: number; reasons: BlockerReason[] } {
  const reasons: BlockerReason[] = []
  let count = 0
  if (tasks) {
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0)
    const t0 = startOfToday.getTime()
    const overdue = tasks.cards.filter((c) => c.columnId !== tasks.doneColumnId && c.dueDate !== null && c.dueDate < t0)
    if (overdue.length) {
      count += overdue.length
      reasons.push({ kind: 'overdue', text: overdue.length + ' 个任务已逾期未完成' })
    }
    for (const col of tasks.byColumn) {
      if (col.wipLimit !== null && col.count > col.wipLimit) {
        const over = col.count - col.wipLimit
        count += over
        reasons.push({ kind: 'wip', text: '「' + col.title + '」超出 WIP 上限 ' + over + ' 个（' + col.count + '/' + col.wipLimit + '）' })
      }
    }
    /* 明细被截断时不能声称「这就是全部卡点」——把不确定性说出来。
     * 用 kind='partial'（数据完整性告知，不计数），不冒用 'overdue'：
     * 否则按 kind 分类的界面会把「统计不全」显示成「有任务逾期」。 */
    if (tasks.cardsTruncated) reasons.push({ kind: 'partial', text: '卡片明细已截断，逾期数与截止按已取回的部分统计' })
  }
  const pb = planBlockers(dashboard)
  count += pb.length
  reasons.push(...pb)
  return { count, reasons }
}

/** 单项目投影（纯函数，便于单测）。 */
export function projectOverview(input: OverviewInput): OverviewProject {
  const { project, tasks, dashboard, facts } = input
  const buckets = emptyBuckets()
  let total = 0, doneCount = 0
  if (tasks) {
    total = tasks.total
    doneCount = tasks.doneCount
    for (const col of tasks.byColumn) buckets[bucketOfColumn(col, tasks.doneColumnId)] += col.count
  }
  const { count, reasons } = blockerSignals(tasks, dashboard)
  const hasBoard = !!tasks && total > 0
  const percent = hasBoard ? tasks!.donePercent : null
  const health: OverviewProject['health'] = count > 0 ? 'warn' : (hasBoard && doneCount === total ? 'good' : 'normal')
  /* 截止取「未完成卡片里最早的 dueDate」——已完成的不该再催。 */
  let dueAt: number | null = null
  if (tasks) {
    for (const c of tasks.cards) {
      if (c.columnId === tasks.doneColumnId || c.dueDate === null) continue
      if (dueAt === null || c.dueDate < dueAt) dueAt = c.dueDate
    }
  }
  return {
    project,
    hasBoard,
    total,
    doneCount,
    percent,
    buckets,
    blockers: count,
    reasons,
    node: currentNode(dashboard),
    members: facts ? facts.members : (typeof input.members === 'number' ? input.members : null),
    files: facts ? facts.files : null,
    bytesText: facts ? facts.bytesText : '',
    dueAt,
    health,
    updatedAt: tasks ? tasks.updatedAt : (facts ? facts.lastUpdated : null),
  }
}

/**
 * 跨项目汇总。
 * 平均进度只在「有任务的项目」上取算术平均（空板不该把均值拉低）；
 * 一个都没有时返回 null，前端显示「—」而不是 0%。
 */
export function aggregateOverview(inputs: OverviewInput[], opts: { visibleTotal?: number } = {}): OverviewResult {
  const truncated = inputs.length > OVERVIEW_MAX_PROJECTS
  const used = truncated ? inputs.slice(0, OVERVIEW_MAX_PROJECTS) : inputs
  const projects = used.map(projectOverview)
  const buckets = emptyBuckets()
  let tasks = 0, done = 0, blockers = 0, withTasks = 0, pctSum = 0, blockedProjects = 0
  for (const p of projects) {
    tasks += p.total
    done += p.doneCount
    blockers += p.blockers
    if (p.blockers > 0) blockedProjects++
    for (const k of Object.keys(buckets) as Bucket[]) buckets[k] += p.buckets[k]
    if (p.percent !== null) { withTasks++; pctSum += p.percent }
  }
  return {
    projects,
    totals: {
      projects: projects.length,
      visible: typeof opts.visibleTotal === 'number' ? opts.visibleTotal : projects.length,
      withTasks,
      tasks,
      done,
      blockers,
      blockedProjects,
      avgPercent: withTasks > 0 ? Math.round(pctSum / withTasks) : null,
      buckets,
    },
    truncated,
    scannedAt: Date.now(),
  }
}