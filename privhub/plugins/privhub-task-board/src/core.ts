/**
 * privhub-task-board · core —— 任务看板的「数据契约 + 存储 + 汇总」
 *
 * 被两处共用：
 *   ① `src/index.ts`（任务看板的读写路由）；
 *   ② `privhub-project-dashboard`（项目看板的「任务进度」组件 —— 实时读同一份看板）。
 *
 * 所以本文件只放**纯逻辑**（无 ctx.route 注册），谁调用谁负责鉴权。
 * 这样「任务看板是第一信息源」在**代码层**就成立：项目看板不是抄一份进度，
 * 而是用同一个加载器读同一个文件 —— 两边不可能漂移。
 *
 * @module privhub-task-board/core
 */

import { join } from 'node:path'
import { readJsonStore } from '../../privhub-core/src/index'

/* ============ 契约 ============ */

export type Priority = 'low' | 'normal' | 'high' | 'urgent'

export interface Column { id: string; title: string; order: number; wipLimit: number | null }
export interface RelatedFile { project: string; path: string }
export interface Card {
  id: string
  title: string
  desc: string
  assignee: string
  priority: Priority
  dueDate: number | null
  columnId: string
  order: number
  labels: string[]
  relatedFiles: RelatedFile[]
  createdBy: string
  createdAt: number
  updatedAt: number
  source: 'human'
}
export interface Board { project: string; columns: Column[]; cards: Card[]; updatedAt: number }

/**
 * 内置「待审核」列。审核流（提交审核 → 通过 / 退回重做）挂在它身上，
 * 因此它由服务端**保证存在**（见 `ensureReviewColumn`）、且不允许删除。
 * 老看板（只有 待办/进行中/已完成 三列）在首次读取时自动补齐，位置固定在「已完成」之前。
 */
export const REVIEW_COL = 'col_review'
/** 退回重做时给卡片打的标签（在「待办」列里一眼看得出这是被打回的活）。 */
export const REJECT_LABEL = '退回重做'
/** 「已完成」列 id —— 进度百分比按它算。 */
export const DONE_COL = 'col_done'

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()
const BOARDS_DIR = join(rootDir, 'data', 'taskboards')

/** 存储只用到这两个方法；用最小结构类型，避免把 Service 形状写进函数签名。 */
export interface StorageLike {
  readText: (file: string) => Promise<string>
  writeText: (file: string, data: string) => Promise<void>
}

export function boardFile(project: string): string {
  return join(BOARDS_DIR, project + '.json')
}

export function defaultBoard(project: string): Board {
  return {
    project,
    columns: [
      { id: 'col_todo', title: '待办', order: 0, wipLimit: null },
      { id: 'col_doing', title: '进行中', order: 1, wipLimit: null },
      { id: REVIEW_COL, title: '待审核', order: 2, wipLimit: null },
      { id: DONE_COL, title: '已完成', order: 3, wipLimit: null },
    ],
    cards: [],
    updatedAt: Date.now(),
  }
}

/**
 * 保证内置「待审核」列存在（老看板补齐）。
 *
 * 只在**缺失**时插入，位置固定在「已完成」列之前 —— 用数组下标插入而非按 order 重建，
 * 因为这是「补一列进去」而不是「重排列序」；已存在则原样不动（用户若改名/挪位，尊重其选择）。
 * 只改内存副本；下一次走锁写入时自然落盘。纯读取（R1）不改盘。
 */
export function ensureReviewColumn(board: Board): void {
  if (board.columns.some((c) => c.id === REVIEW_COL)) return
  const at = board.columns.findIndex((c) => c.id === DONE_COL)
  const col: Column = { id: REVIEW_COL, title: '待审核', order: 0, wipLimit: null }
  if (at >= 0) board.columns.splice(at, 0, col)
  else board.columns.push(col)
  board.columns.forEach((c, i) => { c.order = i })
}

/** 一份看板文件该有的样子（列必须是数组且非空，卡片必须是数组）。 */
export function looksLikeBoard(v: unknown): boolean {
  const b = v as Board
  return !!b && typeof b === 'object' && Array.isArray(b.columns) && b.columns.length > 0 && Array.isArray(b.cards)
}

/**
 * 读看板。
 *
 * D4：**文件不存在**才是「还没有看板」→ 回退默认列；**文件存在但读不出来 / 形状不对**
 * 是损坏 → 隔离存证并抛错（`readJsonStore` 负责），绝不静默当成空板。
 */
export async function loadBoard(storage: StorageLike, file: string, project: string): Promise<Board> {
  const b = await readJsonStore<Board>(storage, file, defaultBoard(project), looksLikeBoard)
  b.project = project
  ensureReviewColumn(b)
  return b
}

export async function saveBoard(storage: StorageLike, file: string, board: Board): Promise<void> {
  board.updatedAt = Date.now()
  await storage.writeText(file, JSON.stringify(board, null, 2))
}

/* ============ 汇总（项目看板的「任务进度」用） ============ */

/** 一次汇总最多带出的卡片数（防大板把响应撑大；超出置 cardsTruncated）。 */
export const SUMMARY_CARDS_MAX = 200

export interface TaskSummaryColumn { id: string; title: string; order: number; count: number; wipLimit: number | null }
export interface TaskSummaryCard {
  id: string
  title: string
  columnId: string
  /** 列内次序 —— 消费方据此把卡片排成「看板上的顺序」（先列序、再列内序）。 */
  order: number
  priority: Priority
  assignee: string
  dueDate: number | null
  labels: string[]
  updatedAt: number
}
export interface TaskSummary {
  total: number
  byColumn: TaskSummaryColumn[]
  doneColumnId: string
  doneCount: number
  donePercent: number
  cards: TaskSummaryCard[]
  cardsTruncated: boolean
  updatedAt: number
}

/**
 * 把一份任务看板压成「进度摘要」：各列计数（按列序）+ 完成度 + 卡片明细（有界）。
 *
 * 纯函数 —— 项目看板直接用它的输出渲染，因此两边的「进度」永远是同一份数据算出来的。
 * 只保留渲染必要的字段（不把 desc / relatedFiles 整个端出去：那是任务卡内部的事，
 * 进度视图不需要，少传也少泄露）。
 */
export function summarizeBoard(board: Board): TaskSummary {
  const cols = [...board.columns].sort((a, b) => a.order - b.order)
  const byColumn: TaskSummaryColumn[] = cols.map((c) => ({
    id: c.id,
    title: c.title,
    order: c.order,
    count: board.cards.filter((k) => k.columnId === c.id).length,
    wipLimit: c.wipLimit,
  }))
  const total = board.cards.length
  const done = byColumn.find((c) => c.id === DONE_COL)
  const doneCount = done ? done.count : 0
  const donePercent = total > 0 ? Math.round((doneCount / total) * 100) : 0
  /* 卡片按「列序 → 列内序」排出看板上的真实顺序：这样消费方取前 N 张就是
   * 看板最上面那 N 张（而不是按创建时间截断出的一堆零散卡）。 */
  const colIndex = new Map(cols.map((c, i) => [c.id, i]))
  const ordered = [...board.cards].sort((a, b) => {
    const ca = colIndex.has(a.columnId) ? (colIndex.get(a.columnId) as number) : cols.length
    const cb = colIndex.has(b.columnId) ? (colIndex.get(b.columnId) as number) : cols.length
    return (ca - cb) || ((Number(a.order) || 0) - (Number(b.order) || 0))
  })
  const cards: TaskSummaryCard[] = ordered.slice(0, SUMMARY_CARDS_MAX).map((k) => ({
    id: k.id,
    title: k.title,
    columnId: k.columnId,
    order: Number(k.order) || 0,
    priority: k.priority,
    assignee: k.assignee,
    dueDate: k.dueDate,
    labels: Array.isArray(k.labels) ? k.labels : [],
    updatedAt: k.updatedAt,
  }))
  return {
    total,
    byColumn,
    doneColumnId: DONE_COL,
    doneCount,
    donePercent,
    cards,
    cardsTruncated: board.cards.length > SUMMARY_CARDS_MAX,
    updatedAt: board.updatedAt,
  }
}

/** 便捷入口：读文件 + 汇总（项目看板只需这一句）。 */
export async function loadTaskSummary(storage: StorageLike, project: string): Promise<TaskSummary> {
  const board = await loadBoard(storage, boardFile(project), project)
  return summarizeBoard(board)
}
