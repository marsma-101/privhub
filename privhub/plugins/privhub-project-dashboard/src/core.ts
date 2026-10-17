/**
 * privhub-project-dashboard · core —— 项目看板的「数据契约 + 存储 + 真实统计」
 *
 * 被两处共用：
 *   ① `src/index.ts`（网页登录态的读写路由）；
 *   ② `privhub-files-agent`（X-Agent-Key 车道，让智能体改布局）。
 * 所以本文件只放**纯逻辑**（无 ctx.route 注册），谁调用谁负责鉴权。
 *
 * 看板形态（由用户选定的版式「纵向分区页」）：
 *   一个项目一份文档，文档 = 若干「分区」(section)，分区纵向堆叠；
 *   每个分区 width ∈ full|half（half 两栏并排），内含若干「组件」(widget)。
 *   智能体通过重写这份 JSON 来调整分区的大小/顺序/内容 —— 这里负责把它
 *   清洗成安全、有界、可渲染的形状（未知字段丢弃、长度/数量夹紧）。
 *
 * 数据：每项目一个文件 `data/dashboards/<project>.json`，经 `ctx.storage` 透明加密。
 *
 * @module privhub-project-dashboard/core
 */

import { join } from 'node:path'
import { readJsonStore, msgOf } from '../../privhub-core/src/json-store'
/* 「任务进度」组件的数据来自任务看板的同一个加载器 —— 项目看板不另存一份进度，
 * 因此两边永远不会漂移（这正是「任务看板为第一信息源」的落地方式）。 */
import { loadTaskSummary, type TaskSummary } from '../../privhub-task-board/src/core'
/* 「智能体名册」组件的数据来自名册的同一个加载器（名册条目 + 该项目里的系统实证）。 */
import { loadAgentsView, type AgentView } from '../../privhub-roster/src/core'

/* ============ 契约 ============ */

export type SectionWidth = 'full' | 'half'
export type PlanState = 'done' | 'doing' | 'todo' | 'blocked'
export type WidgetType = 'markdown' | 'stats' | 'plan' | 'tasks' | 'agents'

export interface StatItem { label: string; ref?: string; value?: string; hint?: string }
export interface PlanItem { text: string; state: PlanState; note?: string }
export interface Widget {
  type: WidgetType
  title: string
  text: string
  items: (StatItem | PlanItem)[]
  /** tasks 专用：只看这些列（列 id 或列标题；缺省=全部列）。 */
  columns?: string[]
  /** tasks 专用：卡片明细条数上限（1…LIMITS.taskCards，缺省 30）。 */
  limit?: number
  /** tasks 专用：false = 只显示计数与进度条，不列卡片。 */
  showCards?: boolean
  /* agents 组件没有旋钮：它的内容 = **服务本项目的智能体名册**（按服务范围过滤），
   * 每条带「擅长 / 自述 / 系统实证」。范围由名册自身声明，不在这里改。 */
}
export interface Section {
  id: string
  title: string
  width: SectionWidth
  collapsed: boolean
  widgets: Widget[]
}
export interface DashboardDoc {
  project: string
  title: string
  subtitle: string
  sections: Section[]
  revision: number
  updatedAt: number
  updatedBy: string
  source: 'human' | 'agent' | 'default'
}

/** facts 里可被 stats 组件按名字引用的实时指标（值由服务端算）。 */
export const STAT_REFS: Record<string, string> = {
  files: '文件总数',
  dirs: '文件夹数',
  bytesText: '占用空间',
  members: '项目成员',
  recent7d: '近 7 天变更',
  lastUpdated: '最后更新',
}

/* ============ 边界常量（清洗时夹紧） ============ */

export const LIMITS = {
  sections: 30,
  widgets: 12,
  statsItems: 12,
  planItems: 60,
  text: 4000,
  title: 80,
  label: 40,
  note: 200,
  taskColumns: 12,
  taskCards: 60,
} as const

const WIDGET_TYPES: Record<WidgetType, true> = { markdown: true, stats: true, plan: true, tasks: true, agents: true }
const PLAN_STATES: Record<PlanState, true> = { done: true, doing: true, todo: true, blocked: true }

/* ============ 路径与默认文档 ============ */

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()
export const DASHBOARDS_DIR = join(rootDir, 'data', 'dashboards')

export function dashFile(project: string): string {
  return join(DASHBOARDS_DIR, project + '.json')
}

/**
 * 默认看板（首次打开、或智能体 `reset` 时用）。
 * 刻意「不编造计划」：计划区留空由智能体/人填，说明区写清这块板怎么用，
 * 免得默认就端出一份看着像真的、其实是我猜的进度。
 */
export function defaultDashboard(project: string): DashboardDoc {
  return {
    project,
    title: project + ' · 项目看板',
    subtitle: '',
    sections: [
      {
        id: 'sec_overview', title: '概览', width: 'full', collapsed: false,
        widgets: [{
          type: 'stats', title: '', text: '',
          items: [
            { label: '文件总数', ref: 'files' },
            { label: '文件夹数', ref: 'dirs' },
            { label: '项目成员', ref: 'members' },
            { label: '近 7 天变更', ref: 'recent7d' },
          ],
        }],
      },
      {
        id: 'sec_tasks', title: '任务进度（实时取自任务看板）', width: 'full', collapsed: false,
        widgets: [{ type: 'tasks', title: '', text: '', items: [] }],
      },
      {
        id: 'sec_agents', title: '智能体名册（登记/自述 + 系统实证）', width: 'full', collapsed: false,
        widgets: [{
          type: 'agents', title: '', text: '', items: [],
        }],
      },
      {
        id: 'sec_note', title: '说明', width: 'full', collapsed: false,
        widgets: [{
          type: 'markdown', title: '', text:
            '这个看板由 **AI 智能体**按项目实际情况维护：分区的大小、顺序与内容都可以被重写。\n\n' +
            '- 顶部「概览」里的数字是**实时**从项目里算出来的，不是写死的。\n' +
            '- 「任务进度」直接投影**任务看板**（同一份数据）：在这里改不了任务，任务请在「任务看板」里维护。\n' +
            '- 其余分区（计划 / 里程碑、说明等）由智能体写入。\n' +
            '- 写入接口：`PUT /privhub/api/dashboard`（登录态）或 `POST /privhub/api/agent/v1/dashboard`（智能体密钥）。',
          items: [],
        }],
      },
    ],
    revision: 0,
    updatedAt: Date.now(),
    updatedBy: '',
    source: 'default',
  }
}

/* ============ 清洗（智能体给的 JSON 一律过这里） ============ */

function s(v: unknown, max: number): string {
  return String(v ?? '').slice(0, max)
}

function clipText(v: unknown): string {
  return String(v ?? '').slice(0, LIMITS.text)
}

/** 生成一个稳定前缀的 id（分区/组件没有 id 时补一个）。 */
function genId(prefix: string): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function cleanStatItem(v: unknown): StatItem | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const ref = typeof o.ref === 'string' && Object.prototype.hasOwnProperty.call(STAT_REFS, o.ref) ? o.ref : undefined
  const label = s(o.label, LIMITS.label).trim() || (ref ? STAT_REFS[ref] : '')
  const value = o.value === undefined || o.value === null ? '' : s(o.value, LIMITS.label)
  if (!label && !value && !ref) return null
  return { label: label || '—', ...(ref ? { ref } : {}), ...(value ? { value } : {}), ...(o.hint ? { hint: s(o.hint, LIMITS.note) } : {}) }
}

function cleanPlanItem(v: unknown): PlanItem | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const text = s(o.text, LIMITS.title).trim()
  if (!text) return null
  const st = String(o.state ?? 'todo') as PlanState
  return { text, state: PLAN_STATES[st] ? st : 'todo', ...(o.note ? { note: s(o.note, LIMITS.note) } : {}) }
}

function cleanTaskColumns(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  const out: string[] = []
  for (const x of v) {
    if (typeof x !== 'string') continue
    const t = x.trim().slice(0, LIMITS.label)
    if (t && !out.includes(t)) out.push(t)
    if (out.length >= LIMITS.taskColumns) break
  }
  return out
}

function cleanWidget(v: unknown): Widget | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const type = String(o.type ?? '') as WidgetType
  if (!WIDGET_TYPES[type]) return null
  const title = s(o.title, LIMITS.title).trim()
  const rawItems = Array.isArray(o.items) ? o.items : []
  let items: (StatItem | PlanItem)[] = []
  if (type === 'stats') {
    items = rawItems.slice(0, LIMITS.statsItems).map(cleanStatItem).filter((x): x is StatItem => !!x)
  } else if (type === 'plan') {
    items = rawItems.slice(0, LIMITS.planItems).map(cleanPlanItem).filter((x): x is PlanItem => !!x)
  }
  const w: Widget = { type, title, text: clipText(o.text), items }
  /* tasks 组件：内容由任务看板实时算出来，所以只接受两个「旋钮」，不接受任何写死的条目
   * —— 这正是它与 plan 的区别：plan 是手写的计划快照（会跟任务看板漂移），tasks 是实时视图。 */
  if (type === 'tasks') {
    const cols = cleanTaskColumns(o.columns)
    if (cols.length) w.columns = cols
    if (typeof o.limit === 'number' && Number.isFinite(o.limit)) {
      w.limit = Math.max(1, Math.min(LIMITS.taskCards, Math.trunc(o.limit)))
    }
    if (o.showCards === false) w.showCards = false
  }
  return w
}

/**
 * 把任意输入清洗成合法看板文档；形状完全不对时返回 null（调用方回 400）。
 * 宽松：能救则救（补 id、夹长度、丢未知组件），但不允许「静默产出空板」盖掉真数据。
 */
export function sanitizeDashboard(input: unknown, project: string, by: string, source: 'human' | 'agent'): DashboardDoc | null {
  if (!input || typeof input !== 'object') return null
  const o = input as Record<string, unknown>
  if (!Array.isArray(o.sections)) return null
  const sections: Section[] = []
  for (const rawSec of o.sections.slice(0, LIMITS.sections)) {
    if (!rawSec || typeof rawSec !== 'object') continue
    const so = rawSec as Record<string, unknown>
    const rawW = Array.isArray(so.widgets) ? so.widgets : []
    const widgets = rawW.slice(0, LIMITS.widgets).map(cleanWidget).filter((x): x is Widget => !!x)
    const width: SectionWidth = so.width === 'half' ? 'half' : 'full'
    sections.push({
      id: s(so.id, 64).trim() || genId('sec_'),
      title: s(so.title, LIMITS.title).trim(),
      width,
      collapsed: so.collapsed === true,
      widgets,
    })
  }
  return {
    project,
    title: s(o.title, LIMITS.title).trim() || (project + ' · 项目看板'),
    subtitle: s(o.subtitle, LIMITS.note),
    sections,
    revision: 0, // 由保存方 +1
    updatedAt: 0,
    updatedBy: by,
    source,
  }
}

/* ============ 读 / 写 ============ */

/** 一份文档该有的样子（columns 校验思路同 task-board：列必须是非空数组）。 */
function looksLikeDoc(v: unknown): boolean {
  const d = v as DashboardDoc
  return !!d && typeof d === 'object' && Array.isArray(d.sections) && typeof d.title === 'string'
}

interface StorageLike {
  readText: (file: string) => Promise<string>
  writeText: (file: string, data: string) => Promise<void>
}

export async function loadDashboard(storage: StorageLike, project: string): Promise<DashboardDoc> {
  const file = dashFile(project)
  const doc = await readJsonStore<DashboardDoc>(storage, file, defaultDashboard(project), looksLikeDoc)
  doc.project = project
  return doc
}

export async function writeDashboard(storage: StorageLike, doc: DashboardDoc): Promise<void> {
  await storage.writeText(dashFile(doc.project), JSON.stringify(doc, null, 2))
}

/* ============ 真实统计（facts） ============ */

export interface Facts {
  files: number
  dirs: number
  bytes: number
  bytesText: string
  byExt: { ext: string; count: number }[]
  members: number
  lastUpdated: number | null
  recent7d: number
  truncated: boolean
  scannedAt: number
}

function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  if (i <= 0 || i === name.length - 1) return ''
  return name.slice(i + 1).toLowerCase()
}

export function humanBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0, v = n
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++ }
  return (i === 0 ? String(v) : v.toFixed(v >= 100 ? 0 : 1)) + ' ' + u[i]
}

/**
 * 统计一个项目的真实数据。递归列目录，**带上限**（避免大项目把看板拖死）：
 * 扫到 `MAX_SCAN` 条即停并置 truncated=true（前端照显已有计数，并标「部分」）。
 * 个人空间不会进到这里（调用方只对项目调用）。
 */
const MAX_SCAN = 50000
const MAX_DEPTH = 16

export async function computeFacts(ctx: { privhub: any }, project: string): Promise<Facts> {
  const byExt = new Map<string, number>()
  let files = 0, dirs = 0, bytes = 0, recent7d = 0
  let lastUpdated: number | null = null
  let truncated = false
  const sevenAgo = Date.now() - 7 * 864e5
  const queue: { path: string; depth: number }[] = [{ path: '', depth: 0 }]
  let scanned = 0
  while (queue.length) {
    const { path, depth } = queue.shift() as { path: string; depth: number }
    if (depth > MAX_DEPTH) continue
    let entries: any[] = []
    try { entries = await ctx.privhub.listFiles(project, path) } catch { entries = [] }
    for (const e of entries) {
      if (++scanned > MAX_SCAN) { truncated = true; break }
      const rel = path ? path + '/' + e.name : e.name
      if (e.isDir) {
        dirs++
        queue.push({ path: rel, depth: depth + 1 })
      } else {
        files++
        const size = Number(e.size) || 0
        bytes += size
        const ex = extOf(e.name) || '(无扩展名)'
        byExt.set(ex, (byExt.get(ex) || 0) + 1)
        const mt = Date.parse(String(e.mtime))
        if (Number.isFinite(mt)) {
          if (lastUpdated === null || mt > lastUpdated) lastUpdated = mt
          if (mt >= sevenAgo) recent7d++
        }
      }
    }
    if (truncated) break
  }
  const byExtArr = [...byExt.entries()].map(([ext, count]) => ({ ext, count })).sort((a, b) => b.count - a.count)
  let members = 0
  try {
    for (const u of ctx.privhub.users.values()) {
      if (u && u.role !== 'admin' && Array.isArray(u.projects) && u.projects.includes(project)) members++
    }
  } catch { members = 0 }
  return { files, dirs, bytes, bytesText: humanBytes(bytes), byExt: byExtArr, members, lastUpdated, recent7d, truncated, scannedAt: Date.now() }
}

/* ---- facts 短缓存：连点看板不重复整树扫描 ---- */

const FACTS_TTL = 15000
const factsCache = new Map<string, { at: number; facts: Facts }>()

export async function computeFactsCached(ctx: { privhub: any }, project: string): Promise<Facts> {
  const hit = factsCache.get(project)
  if (hit && Date.now() - hit.at < FACTS_TTL) return hit.facts
  const facts = await computeFacts(ctx, project)
  factsCache.set(project, { at: Date.now(), facts })
  return facts
}

/* ============ 任务进度（实时投影自任务看板） ============ */

/**
 * 「任务进度」视图的三态：
 *   · 有数据 → `{ ok: true, …TaskSummary }`（各列计数 / 完成度 / 卡片明细）；
 *   · 功能被关或数据不可读 → `{ ok: false, disabled: true, reason }`（前端显示一行说明，不报错）；
 *   · 该看板没有 tasks 组件 → 路由根本不算它（响应里 `tasks: null`）。
 */
export type TaskProgressView = ({ ok: true } & TaskSummary) | { ok: false; disabled: true; reason: string }

/** 看板文档里有没有 tasks 组件 —— 没有就不必去读任务看板文件（省一次 IO）。 */
export function wantsTasks(doc: DashboardDoc): boolean {
  return doc.sections.some((sec) => sec.widgets.some((w) => w.type === 'tasks'))
}

/* ============ 智能体名册（实时投影自名册 + 该项目的系统实证） ============ */

/**
 * 「智能体名册」视图的三态（与任务进度同构）：
 *   · 有数据 → `{ ok: true, entries }`（服务本项目的智能体 + 各自在该项目的战绩）；
 *   · 名册数据不可读 → `{ ok: false, disabled: true, reason }`（前端显示一行说明，不报错）；
 *   · 该看板没有 agents 组件 → 路由根本不算它（响应里 `agents: null`）。
 */
export type AgentsView = { ok: true; entries: AgentView[] } | { ok: false; disabled: true; reason: string }

/** 看板文档里有没有 agents 组件 —— 没有就不必去读名册（省一次 IO）。 */
export function wantsAgents(doc: DashboardDoc): boolean {
  return doc.sections.some((sec) => sec.widgets.some((w) => w.type === 'agents'))
}

/**
 * 读某项目的智能体名册视图。**读失败不抛**：名册只是附加视图，名册文件出问题
 * 不该让整块项目看板 500 —— 降级成一行说明即可（json-store 已把损坏隔离存证并打了日志）。
 */
export async function readAgents(storage: StorageLike, project: string): Promise<AgentsView> {
  try {
    return { ok: true, entries: await loadAgentsView(storage, project) }
  } catch (e) {
    return { ok: false, disabled: true, reason: '智能体名册数据不可读：' + msgOf(e) }
  }
}

/**
 * 读任务进度。**读失败不抛**：项目看板不该因为任务看板的文件出问题而整页 500
 * —— 进度只是附加视图，降级成一行说明即可（`json-store` 已把损坏隔离存证并打了日志，
 * 所以这里降级不属于「静默」）。
 */
export async function readTaskProgress(storage: StorageLike, project: string): Promise<TaskProgressView> {
  try {
    return { ok: true, ...(await loadTaskSummary(storage, project)) }
  } catch (e) {
    return { ok: false, disabled: true, reason: '任务看板数据不可读：' + msgOf(e) }
  }
}
