/**
 * privhub-task-board — 每项目任务看板（PLAN-01 第 1 期）
 *
 * 每个项目一个任务看板：列（状态机）+ 卡片，支持人类用户建/改/删/拖拽。
 * 第 1 期【不含任何 AI/智能体写入口】（R9–R11 暂缓，见需求规格 §1/§8）。
 *
 * 路由（svc.route 为 exact 匹配，不支持路径参数，资源标识走 query/body）：
 *   GET    /privhub/api/taskboard              ?project=            读看板
 *   POST   /privhub/api/taskboard/cards        {project,title,...}  建卡
 *   PATCH  /privhub/api/taskboard/cards        {project,id,...}     改卡
 *   DELETE /privhub/api/taskboard/cards        ?project=&id=        删卡
 *   POST   /privhub/api/taskboard/cards/move   {project,id,toColumnId,order}  拖拽
 *   POST   /privhub/api/taskboard/columns      {project,title,order?}         建列
 *   PATCH  /privhub/api/taskboard/columns      {project,id,title?,order?,wipLimit?} 改列
 *   DELETE /privhub/api/taskboard/columns      ?project=&id=        删列（卡片迁移到首列）
 *
 * 数据：每项目一个文件 `data/taskboards/<project>.json`，单个 Board。
 *   - 经 `ctx.storage` 透明加密（PHENC1），与 comments/dataview 一致；
 *   - 所有「读 → 改 → 写」整体包进 `svc.withFileLock(FILE, …)`（D6：不做无锁读改写）。
 *
 * 鉴权串联：requireUser(401) → 项目名合法(400) → canAccess(403) → 加锁读写。
 * （先判项目名再判权限：非法项目名 canAccess 恒 false，不能让它被误报成「无权限」。）
 *
 * @module privhub-task-board
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { json, readBody, readJsonStore } from '../../privhub-core/src/index'

export const name = 'privhub-task-board'
export const inject = ['storage', 'privhub', 'audit', 'eventBus']

type Priority = 'low' | 'normal' | 'high' | 'urgent'

interface Column { id: string; title: string; order: number; wipLimit: number | null }
interface RelatedFile { project: string; path: string }
interface Card {
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
interface Board { project: string; columns: Column[]; cards: Card[]; updatedAt: number }

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()
const BOARDS_DIR = join(rootDir, 'data', 'taskboards')

/**
 * 优先级取值表。刻意用对象而非字面量数组：`tests/file-exts.mjs` 的反漂移扫描
 * 会把「≥4 个小写字母词条的数组」判为疑似文件扩展名清单；优先级不是扩展名，
 * 不该进那张备案表，故此处不写成数组形态。
 */
const PRIORITIES: Record<Priority, true> = { low: true, normal: true, high: true, urgent: true }
const TITLE_MAX = 200
const DESC_MAX = 20000
const ASSIGNEE_MAX = 64
const LABEL_MAX = 40
const LABELS_MAX = 20
const RELATED_MAX = 50

/** 存储只用到这两个方法；用最小结构类型，避免把 Service 形状写进函数签名。 */
interface StorageLike {
  readText: (file: string) => Promise<string>
  writeText: (file: string, data: string) => Promise<void>
}

function boardFile(project: string): string {
  return join(BOARDS_DIR, project + '.json')
}

function defaultBoard(project: string): Board {
  return {
    project,
    columns: [
      { id: 'col_todo', title: '待办', order: 0, wipLimit: null },
      { id: 'col_doing', title: '进行中', order: 1, wipLimit: null },
      { id: 'col_done', title: '已完成', order: 2, wipLimit: null },
    ],
    cards: [],
    updatedAt: Date.now(),
  }
}

/** 一份看板文件该有的样子（列必须是数组且非空，卡片必须是数组）。 */
function looksLikeBoard(v: unknown): boolean {
  const b = v as Board
  return !!b && typeof b === 'object' && Array.isArray(b.columns) && b.columns.length > 0 && Array.isArray(b.cards)
}

/**
 * 读看板。
 *
 * D4：**文件不存在**才是「还没有看板」→ 回退默认三列；**文件存在但读不出来 / 形状不对**
 * 是损坏 → 隔离存证并抛错。此前后者也回退默认空看板，于是一次「加卡片」就把整板卡片
 * （用户的真实工作内容）覆盖成只剩这一张 —— 这属于静默数据丢失，不能只图不报错。
 */
async function loadBoard(storage: StorageLike, file: string, project: string): Promise<Board> {
  const b = await readJsonStore<Board>(storage, file, defaultBoard(project), looksLikeBoard)
  b.project = project
  return b
}

async function saveBoard(storage: StorageLike, file: string, board: Board): Promise<void> {
  board.updatedAt = Date.now()
  await storage.writeText(file, JSON.stringify(board, null, 2))
}

/* ---------- 入参清洗 ---------- */

function str(v: unknown, max: number): string {
  return String(v ?? '').slice(0, max)
}

function cleanPriority(v: unknown): Priority | undefined {
  const s = String(v ?? '') as Priority
  return Object.prototype.hasOwnProperty.call(PRIORITIES, s) ? s : undefined
}

function cleanLabels(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  const out: string[] = []
  for (const x of v) {
    if (typeof x !== 'string') continue
    const s = x.trim().slice(0, LABEL_MAX)
    if (s && !out.includes(s)) out.push(s)
    if (out.length >= LABELS_MAX) break
  }
  return out
}

function cleanRelated(v: unknown): RelatedFile[] {
  if (!Array.isArray(v)) return []
  const out: RelatedFile[] = []
  for (const x of v) {
    if (!x || typeof x !== 'object') continue
    const project = str((x as { project?: unknown }).project, 200).trim()
    const path = str((x as { path?: unknown }).path, 1000).trim()
    if (project && path && !path.includes('..')) out.push({ project, path })
    if (out.length >= RELATED_MAX) break
  }
  return out
}

/** 某列内按 order 重排为 0..n-1（拖拽/删除后调用，保持有序且整数化）。 */
function normalizeColumn(board: Board, columnId: string): void {
  const list = board.cards.filter((c) => c.columnId === columnId).sort((a, b) => a.order - b.order)
  list.forEach((c, i) => { c.order = i })
}

function queryParam(req: unknown, key: string): string {
  const url = new URL(String((req as { url?: string }).url ?? '/'), 'http://x')
  return url.searchParams.get(key) ?? ''
}

function newId(prefix: string): string {
  const now = Date.now()
  return prefix + now.toString(36) + Math.random().toString(36).slice(2, 6)
}

export function apply(ctx: Context): void {
  ctx.eventBus.declareEmit('audit:logged', 'privhub-task-board', '看板写操作成功审计广播（S1 闭环）')
  const svc = ctx.privhub

  const audit = async (u: { username: string }, action: string, target: string, detail?: string): Promise<void> => {
    const rec = await ctx.audit.log({ user: u.username, action, target, detail }).catch(() => null)
    if (rec) ctx.emit('audit:logged', rec)
  }

  /* ---------- R1 读看板 ---------- */
  svc.route('/privhub/api/taskboard', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    const project = queryParam(req, 'project')
    if (!svc.isValidProjectName(project)) return json(res, 400, { ok: false, error: '项目名无效' })
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    const file = boardFile(project)
    const board = await loadBoard(ctx.storage, file, project)
    json(res, 200, { ok: true, board })
  }, 'taskboard')

  /* ---------- R2/R3/R4 卡片 ---------- */
  svc.route('/privhub/api/taskboard/cards', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return

    if (req.method === 'DELETE') {
      const project = queryParam(req, 'project')
      const id = queryParam(req, 'id')
      if (!svc.isValidProjectName(project)) return json(res, 400, { ok: false, error: '项目名无效' })
      if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
      const file = boardFile(project)
      const hit = await svc.withFileLock(file, async () => {
        const board = await loadBoard(ctx.storage, file, project)
        const card = board.cards.find((c) => c.id === id)
        if (!card) return false
        board.cards = board.cards.filter((c) => c.id !== id)
        normalizeColumn(board, card.columnId)
        await saveBoard(ctx.storage, file, board)
        return true
      })
      if (!hit) return json(res, 404, { ok: false, error: '卡片不存在' })
      json(res, 200, { ok: true })
      void audit(u, 'taskboard-card-delete', project, 'id=' + id)
      return
    }

    let body: Record<string, unknown>
    try { body = JSON.parse(await readBody(req)) as Record<string, unknown> } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = str(body.project, 200)
    if (!svc.isValidProjectName(project)) return json(res, 400, { ok: false, error: '项目名无效' })
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    const file = boardFile(project)

    if (req.method === 'POST') {
      const title = str(body.title, TITLE_MAX).trim()
      if (!title) return json(res, 400, { ok: false, error: '标题不能为空' })
      let failed = ''
      const card = await svc.withFileLock(file, async () => {
        const board = await loadBoard(ctx.storage, file, project)
        const col = body.columnId
          ? board.columns.find((c) => c.id === String(body.columnId))
          : [...board.columns].sort((a, b) => a.order - b.order)[0]
        if (!col) { failed = '目标列不存在'; return null }
        // WIP 上限：达到上限拒绝建卡（第 1 期按列计数，不区分人）。
        const inCol = board.cards.filter((c) => c.columnId === col.id).length
        if (col.wipLimit !== null && inCol >= col.wipLimit) { failed = `「${col.title}」已达 WIP 上限 ${col.wipLimit}`; return null }
        const now = Date.now()
        const c: Card = {
          id: newId('k'),
          title,
          desc: str(body.desc, DESC_MAX),
          assignee: str(body.assignee, ASSIGNEE_MAX).trim(),
          priority: cleanPriority(body.priority) ?? 'normal',
          dueDate: typeof body.dueDate === 'number' && Number.isFinite(body.dueDate) ? body.dueDate : null,
          columnId: col.id,
          order: inCol,
          labels: cleanLabels(body.labels),
          relatedFiles: cleanRelated(body.relatedFiles),
          createdBy: u.username,
          createdAt: now,
          updatedAt: now,
          source: 'human',
        }
        board.cards.push(c)
        await saveBoard(ctx.storage, file, board)
        return c
      })
      if (!card) return json(res, 400, { ok: false, error: failed || '建卡失败' })
      json(res, 200, { ok: true, card })
      void audit(u, 'taskboard-card-create', project, 'title=' + title)
      return
    }

    if (req.method === 'PATCH') {
      const id = str(body.id, 64)
      const priority = body.priority === undefined ? undefined : cleanPriority(body.priority)
      if (body.priority !== undefined && priority === undefined) return json(res, 400, { ok: false, error: 'priority 无效' })
      const hit = await svc.withFileLock(file, async () => {
        const board = await loadBoard(ctx.storage, file, project)
        const card = board.cards.find((c) => c.id === id)
        if (!card) return false
        if (typeof body.title === 'string') {
          const t = str(body.title, TITLE_MAX).trim()
          if (!t) return false
          card.title = t
        }
        if (typeof body.desc === 'string') card.desc = str(body.desc, DESC_MAX)
        if (typeof body.assignee === 'string') card.assignee = str(body.assignee, ASSIGNEE_MAX).trim()
        if (priority) card.priority = priority
        if (body.dueDate === null) card.dueDate = null
        else if (typeof body.dueDate === 'number' && Number.isFinite(body.dueDate)) card.dueDate = body.dueDate
        if (body.labels !== undefined) card.labels = cleanLabels(body.labels)
        if (body.relatedFiles !== undefined) card.relatedFiles = cleanRelated(body.relatedFiles)
        if (typeof body.order === 'number' && Number.isFinite(body.order)) card.order = body.order
        card.updatedAt = Date.now()
        normalizeColumn(board, card.columnId)
        await saveBoard(ctx.storage, file, board)
        return true
      })
      if (!hit) return json(res, 404, { ok: false, error: '卡片不存在或标题为空' })
      json(res, 200, { ok: true })
      void audit(u, 'taskboard-card-update', project, 'id=' + id)
      return
    }

    json(res, 405, { ok: false, error: 'method not allowed' })
  }, 'taskboard-cards')

  /* ---------- R5 拖拽改列 + 排序 ---------- */
  svc.route('/privhub/api/taskboard/cards/move', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    let body: Record<string, unknown>
    try { body = JSON.parse(await readBody(req)) as Record<string, unknown> } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = str(body.project, 200)
    if (!svc.isValidProjectName(project)) return json(res, 400, { ok: false, error: '项目名无效' })
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    const id = str(body.id, 64)
    const toColumnId = str(body.toColumnId, 64)
    const file = boardFile(project)
    let failed = ''
    const okMove = await svc.withFileLock(file, async () => {
      const board = await loadBoard(ctx.storage, file, project)
      const card = board.cards.find((c) => c.id === id)
      if (!card) { failed = '卡片不存在'; return false }
      const to = board.columns.find((c) => c.id === toColumnId)
      if (!to) { failed = '目标列不存在'; return false }
      const from = card.columnId
      const others = board.cards.filter((c) => c.columnId === to.id && c.id !== id).sort((a, b) => a.order - b.order)
      const want = typeof body.order === 'number' && Number.isFinite(body.order) ? Math.trunc(body.order) : others.length
      const idx = Math.max(0, Math.min(others.length, want))
      card.columnId = to.id
      others.splice(idx, 0, card)
      others.forEach((c, i) => { c.order = i })
      card.updatedAt = Date.now()
      if (from !== to.id) normalizeColumn(board, from)
      await saveBoard(ctx.storage, file, board)
      return true
    })
    if (!okMove) return json(res, 404, { ok: false, error: failed || '移动失败' })
    json(res, 200, { ok: true })
    void audit(u, 'taskboard-card-move', project, `id=${id} → ${toColumnId}`)
  }, 'taskboard-cards-move')

  /* ---------- R6/R7/R8 列 ---------- */
  svc.route('/privhub/api/taskboard/columns', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return

    if (req.method === 'DELETE') {
      const project = queryParam(req, 'project')
      const id = queryParam(req, 'id')
      if (!svc.isValidProjectName(project)) return json(res, 400, { ok: false, error: '项目名无效' })
      if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
      const file = boardFile(project)
      let failed = ''
      const done = await svc.withFileLock(file, async () => {
        const board = await loadBoard(ctx.storage, file, project)
        if (board.columns.length <= 1) { failed = '至少保留一列'; return false }
        const col = board.columns.find((c) => c.id === id)
        if (!col) { failed = '列不存在'; return false }
        board.columns = board.columns.filter((c) => c.id !== id)
        // 卡片迁移到剩余的第一列（不静默丢卡）
        const target = [...board.columns].sort((a, b) => a.order - b.order)[0]
        for (const c of board.cards) if (c.columnId === id) c.columnId = target.id
        board.columns.forEach((c, i) => { c.order = i })
        normalizeColumn(board, target.id)
        await saveBoard(ctx.storage, file, board)
        return true
      })
      if (!done) return json(res, 400, { ok: false, error: failed || '删列失败' })
      json(res, 200, { ok: true })
      void audit(u, 'taskboard-column-delete', project, 'id=' + id)
      return
    }

    let body: Record<string, unknown>
    try { body = JSON.parse(await readBody(req)) as Record<string, unknown> } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = str(body.project, 200)
    if (!svc.isValidProjectName(project)) return json(res, 400, { ok: false, error: '项目名无效' })
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    const file = boardFile(project)

    if (req.method === 'POST') {
      const title = str(body.title, 40).trim()
      if (!title) return json(res, 400, { ok: false, error: '列名不能为空' })
      let column: Column | null = null
      await svc.withFileLock(file, async () => {
        const board = await loadBoard(ctx.storage, file, project)
        const order = typeof body.order === 'number' && Number.isFinite(body.order) ? Math.trunc(body.order) : board.columns.length
        const col: Column = { id: newId('col'), title, order, wipLimit: null }
        board.columns.push(col)
        // 占位重排，保证 order 连续
        board.columns.sort((a, b) => a.order - b.order).forEach((c, i) => { c.order = i })
        await saveBoard(ctx.storage, file, board)
        column = col
      })
      json(res, 200, { ok: true, column })
      void audit(u, 'taskboard-column-create', project, 'title=' + title)
      return
    }

    if (req.method === 'PATCH') {
      const id = str(body.id, 64)
      let badWip = false
      const hit = await svc.withFileLock(file, async () => {
        const board = await loadBoard(ctx.storage, file, project)
        const col = board.columns.find((c) => c.id === id)
        if (!col) return false
        if (typeof body.title === 'string') {
          const t = str(body.title, 40).trim()
          if (!t) return false
          col.title = t
        }
        if (body.wipLimit === null) col.wipLimit = null
        else if (typeof body.wipLimit === 'number' && Number.isFinite(body.wipLimit)) {
          const w = Math.trunc(body.wipLimit)
          if (w < 1 || w > 999) { badWip = true; return false }
          col.wipLimit = w
        }
        if (typeof body.order === 'number' && Number.isFinite(body.order)) col.order = Math.trunc(body.order)
        board.columns.sort((a, b) => a.order - b.order).forEach((c, i) => { c.order = i })
        await saveBoard(ctx.storage, file, board)
        return true
      })
      if (!hit) return json(res, 400, { ok: false, error: badWip ? 'WIP 上限需为 1–999 的整数' : '列不存在或列名为空' })
      json(res, 200, { ok: true })
      void audit(u, 'taskboard-column-update', project, 'id=' + id)
      return
    }

    json(res, 405, { ok: false, error: 'method not allowed' })
  }, 'taskboard-columns')
}
