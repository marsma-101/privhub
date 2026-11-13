/**
 * overview-aggregate.mjs — L1「项目总览」跨项目聚合的**纯函数**回归
 *
 * 为什么单独一套：
 *   总览把 N 个项目的任务看板压成一屏 KPI。这里最容易悄悄坏掉的不是界面，
 *   而是**口径**——桶归类、卡点计数、平均进度的分母、以及「没数据」与「0」的区别。
 *   这些错了界面照样绿、数字照样显示，只是领导照着错数字做决定。
 *
 * 三条最要命的不变量（本套件的主体）：
 *   ① 没建过任务 → percent=null（显示「—」），**不是 0%**；文件数未统计 → null，不是 0。
 *   ② 平均进度只在「有任务的项目」上取均值，空板不拉低分母。
 *   ③ 聚合只算**传进来的**项目：函数体内不得出现任何自行枚举项目/读文件的能力，
 *      否则无权项目与别人的私有目录会从 KPI 里泄露出去。
 *
 *   node --import tsx/esm tests/overview-aggregate.mjs
 *
 * @module tests/overview-aggregate
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const SRC_PATH = join(ROOT, 'plugins', 'privhub-project-dashboard', 'src', 'overview.ts')

let pass = 0, fail = 0
const failures = []
const ok = (cond, msg) => {
  if (cond) { pass++; console.log('  ✅ ' + msg) } else { fail++; failures.push(msg); console.log('  ❌ ' + msg) }
}
const eq = (a, b, msg) => ok(a === b, `${msg}（期望 ${JSON.stringify(b)}，实际 ${JSON.stringify(a)}）`)

/* Windows 上 import() 不吃盘符绝对路径（ERR_UNSUPPORTED_ESM_URL_SCHEME），
 * 必须先转 file:// URL —— 本仓主战场是 Windows，这一句不能省。 */
const mod = await import(pathToFileURL(SRC_PATH).href)
const { bucketOfColumn, projectOverview, aggregateOverview, OVERVIEW_MAX_PROJECTS, BUCKET_LABELS } = mod

const DONE = 'col_done'
const DAY = 86400000
/** 今天 0 点：与服务端 blockerSignals 的口径一致（按自然日判逾期，不按 24 小时）。 */
const t0 = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() })()

/** 造一份 TaskSummary（只填聚合真正读的字段）。 */
function summary({ cols, cards = [], truncated = false }) {
  const byColumn = cols.map((c, i) => ({
    id: c.id, title: c.title, order: i,
    count: cards.filter((k) => k.columnId === c.id).length,
    wipLimit: c.wipLimit ?? null,
  }))
  const total = cards.length
  const doneCount = (byColumn.find((c) => c.id === DONE) || { count: 0 }).count
  return {
    total, byColumn, doneColumnId: DONE, doneCount,
    donePercent: total > 0 ? Math.round((doneCount / total) * 100) : 0,
    cards, cardsTruncated: truncated, updatedAt: 1700000000000,
  }
}
const card = (id, columnId, extra = {}) => ({
  id, title: '卡 ' + id, columnId, order: 0, priority: 'normal',
  assignee: '', dueDate: null, labels: [], updatedAt: 1700000000000, ...extra,
})
const COLS = [
  { id: 'col_todo', title: '待办' },
  { id: 'col_doing', title: '进行中' },
  { id: 'col_review', title: '待审核' },
  { id: DONE, title: '已完成' },
]
/** 造一份看板文档（只用 plan 组件，聚合只读它）。 */
const doc = (items) => ({
  project: 'P', title: 'P', subtitle: '', revision: 1, updatedAt: 0, updatedBy: '', source: 'human',
  sections: [{ id: 's', title: '计划', width: 'full', collapsed: false, widgets: [{ type: 'plan', title: '', text: '', items }] }],
})

/* ══════════ 1. 列 → 桶：自定义列也要归位 ══════════ */
console.log('\n── 管线桶归类（跨项目可比的前提）──')
{
  eq(bucketOfColumn({ id: DONE, title: '随便叫' }, DONE), 'done', 'doneColumnId 优先于标题（完成列改名也认得）')
  eq(bucketOfColumn({ id: 'col_todo', title: '待办' }, DONE), 'todo', '内置待办列 → todo')
  eq(bucketOfColumn({ id: 'col_doing', title: '进行中' }, DONE), 'doing', '内置进行中列 → doing')
  eq(bucketOfColumn({ id: 'col_review', title: '待审核' }, DONE), 'review', '内置待审核列 → review')
  eq(bucketOfColumn({ id: 'x1', title: '等验收' }, DONE), 'doing', '认不出的自定义列 → doing（保守：算在途，不误报待办）')
  eq(bucketOfColumn({ id: 'x2', title: '阻塞中' }, DONE), 'doing', '「阻塞」列仍属在途（卡点另有信号，不靠列名猜）')
  eq(bucketOfColumn({ id: 'x3', title: 'REVIEW' }, DONE), 'review', '英文 review 大小写不敏感')
  eq(bucketOfColumn({ id: 'x4', title: 'Backlog' }, DONE), 'todo', 'Backlog → 待办')
  ok(Object.keys(BUCKET_LABELS).join(',') === 'todo,doing,review,done', '四个桶的中文名齐备且顺序固定')
}

/* ══════════ 2. 「没数据」不等于 0 ══════════ */
console.log('\n── 空板与未统计：null 而不是 0 ──')
{
  const p = projectOverview({ project: '空板项目', tasks: null, dashboard: null, facts: null })
  eq(p.hasBoard, false, '没有任务数据 → hasBoard=false')
  eq(p.percent, null, '没有任务数据 → 进度 null（界面显示「—」，不拿 0% 冒充没进展）')
  eq(p.files, null, '未做文件统计 → files=null（不是 0 个文件）')
  eq(p.members, null, '未给成员数 → members=null')
  eq(p.blockers, 0, '没数据就没有卡点（不凭空造风险）')
  eq(p.health, 'normal', '没数据 → 健康度 normal（不是「已全部完成」）')

  const zero = projectOverview({ project: '有板无卡', tasks: summary({ cols: COLS, cards: [] }), dashboard: null, facts: null })
  eq(zero.hasBoard, false, '有看板但一张卡都没有 → 仍算未建任务')
  eq(zero.percent, null, '零卡 → 进度 null（0/0 不该显示成 0%）')

  const withMembers = projectOverview({ project: 'P', tasks: null, dashboard: null, facts: null, members: 5 })
  eq(withMembers.members, 5, '成员数走廉价来源（用户表），不必递归扫全树')
}

/* ══════════ 3. 卡点三信号 ══════════ */
console.log('\n── 卡点口径：逾期 / WIP 超限 / 计划受阻 ──')
{
  const cards = [
    card('a', 'col_doing', { dueDate: t0 - DAY }),      // 逾期 1 天
    card('b', 'col_todo', { dueDate: t0 - 5 * DAY }),   // 逾期 5 天
    card('c', DONE, { dueDate: t0 - 9 * DAY }),         // 已完成：再旧也不算逾期
    card('d', 'col_doing', { dueDate: t0 }),            // 今天到期：还没逾期
    card('e', 'col_doing', { dueDate: t0 + DAY }),      // 明天
  ]
  const p = projectOverview({ project: 'P', tasks: summary({ cols: COLS, cards }), dashboard: null, facts: null })
  eq(p.blockers, 2, '只数「未完成且早于今天 0 点」的两张（完成的与今天到期的都不算）')
  ok(p.reasons.some((r) => r.kind === 'overdue'), '卡点带逾期原因（可复核，不是一个孤零零的数字）')
  eq(p.health, 'warn', '有卡点 → 健康度 warn')
  /* 最早的是 b（逾期 5 天）：逾期项也算「待处理的截止」，且最该先处理。
   * 已完成的 c（逾期 9 天）必须被排除 —— 否则首页会一直催一件已经做完的事。 */
  eq(p.dueAt, t0 - 5 * DAY, '最近截止取未完成卡片里最早的 dueDate（已完成的不再催）')

  const wipCols = [{ id: 'col_doing', title: '进行中', wipLimit: 1 }, { id: DONE, title: '已完成' }]
  const wip = projectOverview({
    project: 'P',
    tasks: summary({ cols: wipCols, cards: [card('a', 'col_doing'), card('b', 'col_doing'), card('c', 'col_doing')] }),
    dashboard: null, facts: null,
  })
  eq(wip.blockers, 2, 'WIP 上限 1、在制 3 → 超出 2 个计入卡点')
  ok(wip.reasons.some((r) => r.kind === 'wip' && /3\/1/.test(r.text)), 'WIP 原因写出实际/上限，便于核对')

  const plan = projectOverview({
    project: 'P', tasks: null,
    dashboard: doc([{ text: '等甲方确认', state: 'blocked', note: '已催三次' }, { text: '写文档', state: 'todo' }]),
    facts: null,
  })
  eq(plan.blockers, 1, '计划里标 blocked 的条目计入卡点')
  eq(plan.node, '等甲方确认', '当前节点：没有 doing 项时取第一个未完成项（blocked 也算未完成）')
  const planDoing = projectOverview({
    project: 'P', tasks: null,
    dashboard: doc([{ text: '等甲方确认', state: 'blocked' }, { text: '写文档', state: 'doing' }]),
    facts: null,
  })
  eq(planDoing.node, '写文档', '有 doing 项时优先它（正在做的事才是当前节点，不是最卡的那件）')
  ok(plan.reasons[0].text.includes('已催三次'), '计划卡点带上备注（人写的原话最有信息量）')

  const mixed = projectOverview({
    project: 'P',
    tasks: summary({ cols: COLS, cards: [card('a', 'col_doing', { dueDate: t0 - DAY })] }),
    dashboard: doc([{ text: '卡住了', state: 'blocked' }]), facts: null,
  })
  eq(mixed.blockers, 2, '三种信号相加（逾期 1 + 计划 1）')

  const trunc = projectOverview({
    project: 'P',
    tasks: summary({ cols: COLS, cards: [card('a', 'col_doing')], truncated: true }),
    dashboard: null, facts: null,
  })
  ok(trunc.reasons.some((r) => /截断/.test(r.text)), '卡片明细被截断时明说「逾期数只是部分统计」，不假装是全量')
}

/* ══════════ 4. 当前节点与健康度 ══════════ */
console.log('\n── 当前节点 / 健康度 ──')
{
  const p = projectOverview({
    project: 'P', tasks: summary({ cols: COLS, cards: [card('a', 'col_doing')] }),
    dashboard: doc([{ text: '第一步', state: 'done' }, { text: '第二步', state: 'doing' }, { text: '第三步', state: 'todo' }]),
    facts: null,
  })
  eq(p.node, '第二步', '当前节点优先取 doing 项（不是第一条，也不是最后一条）')
  eq(p.health, 'normal', '在推进且无卡点 → normal')

  const allDone = projectOverview({
    project: 'P', tasks: summary({ cols: COLS, cards: [card('a', DONE), card('b', DONE)] }),
    dashboard: null, facts: null,
  })
  eq(allDone.percent, 100, '全部完成 → 100%')
  eq(allDone.health, 'good', '全部完成且无卡点 → good（卡点清零即转健康的落地方式）')
  eq(allDone.dueAt, null, '已完成的卡片不再产生「最近截止」')
}

/* ══════════ 5. 跨项目汇总 ══════════ */
console.log('\n── 跨项目汇总：分母、桶合计、截断 ──')
{
  const a = { project: 'A', tasks: summary({ cols: COLS, cards: [card('1', DONE), card('2', 'col_doing')] }), dashboard: null, facts: null }
  const b = { project: 'B', tasks: summary({ cols: COLS, cards: [card('3', DONE), card('4', DONE)] }), dashboard: null, facts: null }
  const c = { project: 'C', tasks: null, dashboard: null, facts: null }
  const r = aggregateOverview([a, b, c])
  eq(r.totals.projects, 3, '项目数 = 传入的项目数')
  eq(r.totals.withTasks, 2, '有任务的项目数 = 2（空板不进分母）')
  eq(r.totals.avgPercent, 75, '平均进度 =（50 + 100）/ 2 = 75，空板不把它拉成 50')
  eq(r.totals.tasks, 4, '任务合计 = 各项目之和')
  eq(r.totals.done, 3, '完成合计 = 各项目之和')
  eq(r.totals.buckets.done, 3, '桶合计：完成 3')
  eq(r.totals.buckets.doing, 1, '桶合计：进行中 1')
  eq(r.totals.buckets.todo, 0, '桶合计：待办 0（没有就是 0，不是 null）')
  eq(r.truncated, false, '未超上限 → 不标截断')

  const none = aggregateOverview([c])
  eq(none.totals.avgPercent, null, '一个有任务的项目都没有 → 平均进度 null（界面「—」）')

  const many = Array.from({ length: OVERVIEW_MAX_PROJECTS + 5 }, (_, i) => ({
    project: 'P' + i, tasks: null, dashboard: null, facts: null,
  }))
  const cut = aggregateOverview(many)
  eq(cut.truncated, true, '超过上限 → truncated=true（前端必须明说只显示了前 N 个）')
  eq(cut.totals.projects, OVERVIEW_MAX_PROJECTS, `聚合条数被夹到上限 ${OVERVIEW_MAX_PROJECTS}`)
  eq(aggregateOverview([]).totals.projects, 0, '空输入不抛错，返回 0 项目')
}

/* ══════════ 6. 隐私边界：聚合不得自行枚举 ══════════ */
console.log('\n── 隐私边界：只算传进来的项目 ──')
{
  const src = readFileSync(SRC_PATH, 'utf8')
  const bare = src.replace(/\/\*[\s\S]*?\*\//g, ' ').split('\n').map((l) => l.replace(/(^|[^:'"`])\/\/.*$/, '$1')).join('\n')
  for (const forbidden of ['allProjects', 'visibleProjects', 'indexableProjects', 'listFiles', 'readdir', 'node:fs']) {
    ok(!bare.includes(forbidden), `聚合层不出现 ${forbidden}（范围由路由层按权限决定，聚合不自己找项目）`)
  }
  const r = aggregateOverview([{ project: '唯一可见', tasks: null, dashboard: null, facts: null }])
  eq(r.projects.length, 1, '传一个就只算一个（别人的目录不可能凭空出现在 KPI 里）')
  eq(r.projects[0].project, '唯一可见', '输出的项目名与输入一致')
}

/* ══════════ 7. 服务端路由的权限与降级契约（源码级） ══════════ */
console.log('\n── 总览路由：权限范围 / 降级 / 不做重扫描 ──')
{
  const routeSrc = readFileSync(join(ROOT, 'plugins', 'privhub-project-dashboard', 'src', 'index.ts'), 'utf8')
  const at = routeSrc.indexOf("'/privhub/api/dashboard/overview'")
  ok(at > 0, '服务端注册了 /privhub/api/dashboard/overview')
  const body = routeSrc.slice(at, routeSrc.indexOf("'/privhub/api/dashboard'", at + 10))
  ok(/requireUser\(req, res\)/.test(body), '总览要求登录（401 由 requireUser 写）')
  ok(/indexableProjects/.test(body), '范围取 indexableProjects —— 排除个人空间')
  ok(!/allProjects/.test(body), '绝不用 allProjects（那会把别人的私有目录算进领导 KPI）')
  ok(/canAccess/.test(body), '逐个再过 canAccess（可见性双保险）')
  ok(/computeFacts/.test(body) === false, '总览不做 facts 递归扫描（几十个项目 × 全树扫描会拖死首屏）')
  ok(/cap\.can\(u, 'task\.write', 'read'\)/.test(body), '任务功能开关参与判定')
  ok(/tasksDisabled/.test(body), '任务功能被关时回 tasksDisabled，让界面说清原因而不是显示 0')
  ok(/personalDirOf/.test(body), '个人入口只取**本人**目录（personalDirOf 只看当前用户）')
  /* 按名查找必须在截断之前：项目多于上限时，前端筛会让第 N+1 个项目永远搜不到
   * （本轮实测踩到过 —— 测试根里几百个历史项目把测试项目挤出了前 60）。 */
  ok(/searchParams\.get\('q'\)/.test(body), '总览支持 ?q= 按名查找')
  const qAt = body.indexOf("searchParams.get('q')")
  const sliceAt = body.indexOf('OVERVIEW_MAX_PROJECTS + 1')
  ok(qAt > 0 && sliceAt > 0, '同时存在 q 解析与截断上限（下面比顺序）')
  ok(/const hits = all\.filter/.test(body), '命中名单取自**全量可见项目** all，而不是已截断的 scoped')
  ok(/!inScope\.has\(p\)/.test(body), '首屏之外的命中会被补读进来（否则搜到了也拿不到数据）')
  ok(/search = \{ q, matched: hits\.length/.test(body), '回包给出 matched 总数（界面能说清「共几个匹配」）')
}

console.log('\n========================================================')
console.log(`  项目总览聚合回归：${pass} 通过 / ${fail} 失败`)
if (fail) { console.log('  失败项：'); for (const f of failures) console.log('    - ' + f) }
console.log('========================================================')
process.exit(fail ? 1 : 0)