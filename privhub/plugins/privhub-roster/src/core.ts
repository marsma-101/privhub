/**
 * privhub-roster · core —— 智能体名册的「数据契约 + 存储 + 实证」（纯逻辑，不注册路由）
 *
 * 名册是什么：一张**全局**清单，登记「这个实例上有哪些智能体、各擅长什么、以前干过什么、
 * 服务哪些项目」。项目看板把它渲染成 `agents` 组件，PM 据此把任务卡指派给某个智能体。
 *
 * 三件事刻意分开（用户口径：「自述 + 系统实证」）：
 *   ① **自述**（`skills` / `bio`）—— 智能体自己写的「我擅长…、我以前做过…」；
 *   ② **系统实证**（`evidence`）—— 服务端**从任务看板现算**出来「它在这项目里实际完成过几张卡」，
 *      **不落盘**，所以永远不会和看板漂移（与项目看板的 tasks 组件同源：读同一份板文件）；
 *   ③ **服务范围**（`scope`）—— 注册时声明：服务全部项目，或只服务指定项目。
 *
 * 被三处共用（谁调用谁负责鉴权）：
 *   ① `src/index.ts` —— 网页登录态的名册读写路由；
 *   ② `privhub-files-agent` —— `/privhub/api/agent/v1/roster`（智能体凭密钥自注册/改自述）；
 *   ③ `privhub-project-dashboard` —— 项目看板的 `agents` 组件（只读投影 + 实证）。
 *
 * 数据：`data/roster.json`，全实例一份，经 `ctx.storage` 透明加密（PHENC1）。
 * 不做「读进内存常驻」——每次现读现写，故严格走 {@link readJsonStore}：
 * 文件存在但读不出来 = 损坏（隔离存证 + 抛错），绝不静默当成空名册。
 *
 * @module privhub-roster/core
 */

import { join } from 'node:path'
import { readJsonStore } from '../../privhub-core/src/json-store'
import { DONE_COL, boardFile, loadBoard, type Board } from '../../privhub-task-board/src/core'

/* ============ 契约 ============ */

/** 服务范围：全部项目 / 只服务 `projects` 里列出的项目。 */
export type RosterScopeKind = 'all' | 'projects'
/** 条目状态：在册 / 暂停（暂时别派活）/ 退役（历史留档，不再出现于指派候选）。 */
export type RosterStatus = 'active' | 'paused' | 'retired'

export interface RosterEntry {
  id: string
  /** 智能体名（在名册内唯一；任务卡的 assignee 用这个名字）。 */
  name: string
  /** 类型 / 厂商，自由文本，如「Claude Code」「本地脚本」「Excel 机器人」。 */
  kind: string
  /** 擅长（标签，短词）。 */
  skills: string[]
  /** 自述：以前干过什么（自由文本，支持换行）。 */
  bio: string
  scope: RosterScopeKind
  /** scope='projects' 时的项目清单（服务范围）。 */
  projects: string[]
  status: RosterStatus
  /** 谁登记的：智能体自注册 / 人工补录。 */
  source: 'agent' | 'human'
  /** 自注册时绑定的密钥 id（人工补录为空）——同一把钥匙重复注册即更新同一条。 */
  keyId: string
  keyName: string
  /** 归属账号（自注册=密钥绑定账号；人工补录=录入者）。 */
  username: string
  contact: string
  at: number
  updatedAt: number
  /** 最近活动时间（自注册/更新时刷新，供「它还在不在」参考）。 */
  lastActiveAt: number
}

export interface RosterDoc { version: number; entries: RosterEntry[]; updatedAt: number }

/** 一条「系统实证」：某个智能体**在该项目**里的实际战绩（现算自任务看板）。 */
export interface Evidence {
  project: string
  /** 已完成的卡数（在「已完成」列）。 */
  done: number
  /** 未完成的卡数（不在「已完成」列）。 */
  open: number
  /** 指派给它的卡总数。 */
  total: number
  /** 最近一次完成时间（用已完成卡的 updatedAt 近似 —— 看板不单独记完成时刻）。 */
  lastDoneAt: number
}

/** 对外展示的一条 = 名册条目 + 该项目里的实证（null = 该读不到看板，只缺实证，不报错）。 */
export interface AgentView extends RosterEntry { evidence: Evidence | null }

/* ============ 边界常量 ============ */

export const LIMITS = {
  entries: 500,
  name: 60,
  kind: 40,
  skills: 12,
  skill: 24,
  bio: 2000,
  projects: 50,
  contact: 120,
} as const

export const NAME_MAX = LIMITS.name

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()

export function rosterFile(): string {
  return join(rootDir, 'data', 'roster.json')
}

/* ============ 清洗 ============ */

function s(v: unknown, max: number): string {
  return String(v ?? '').slice(0, max)
}

function cleanList(v: unknown, itemMax: number, max: number): string[] {
  if (!Array.isArray(v)) return []
  const out: string[] = []
  for (const x of v) {
    if (typeof x !== 'string') continue
    const t = x.trim().slice(0, itemMax)
    if (t && !out.includes(t)) out.push(t)
    if (out.length >= max) break
  }
  return out
}

/** 项目名做**语法级**清洗；是否「真实存在 / 有没有权限」由调用方（路由层）判。 */
function cleanProjects(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  const out: string[] = []
  for (const x of v) {
    if (typeof x !== 'string') continue
    const t = x.trim().slice(0, 200)
    if (t && !t.includes('..') && !t.includes('/') && !t.includes('\\') && !out.includes(t)) out.push(t)
    if (out.length >= LIMITS.projects) break
  }
  return out
}

function cleanScopeKind(v: unknown): RosterScopeKind {
  return v === 'projects' ? 'projects' : 'all'
}

function cleanStatus(v: unknown): RosterStatus {
  return v === 'paused' || v === 'retired' ? v : 'active'
}

/** 调用方可提交的字段（其余一律由服务端裁决，不进这里）。 */
export interface EntryInput {
  name: string
  kind: string
  skills: string[]
  bio: string
  scope: RosterScopeKind
  projects: string[]
  status: RosterStatus
  contact: string
}

/**
 * 清洗一份外部提交的名册字段；形状不对（非对象）返回 null（调用方回 400）。
 * `name` 缺失/空白视为非法 —— 名字是指派时的锚点，不能是空串。
 */
export function sanitizeEntryInput(v: unknown): EntryInput | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const o = v as Record<string, unknown>
  const name = s(o.name, LIMITS.name).trim()
  if (!name) return null
  return {
    name,
    kind: s(o.kind, LIMITS.kind).trim(),
    skills: cleanList(o.skills, LIMITS.skill, LIMITS.skills),
    bio: s(o.bio, LIMITS.bio),
    scope: cleanScopeKind(o.scope),
    projects: cleanProjects(o.projects),
    status: cleanStatus(o.status),
    contact: s(o.contact, LIMITS.contact).trim(),
  }
}

/* ============ 读 / 写 ============ */

/** 存储只用到这两个方法；用最小结构类型，避免把 Service 形状写进函数签名。 */
export interface StorageLike {
  readText: (file: string) => Promise<string>
  writeText: (file: string, data: string) => Promise<void>
}

function emptyDoc(): RosterDoc {
  return { version: 1, entries: [], updatedAt: 0 }
}

/** 一份名册文件该有的样子（entries 必须是数组）。 */
export function looksLikeRoster(v: unknown): boolean {
  const d = v as RosterDoc
  return !!d && typeof d === 'object' && Array.isArray(d.entries)
}

export async function loadRoster(storage: StorageLike): Promise<RosterDoc> {
  const doc = await readJsonStore<RosterDoc>(storage, rosterFile(), emptyDoc(), looksLikeRoster)
  if (!Array.isArray(doc.entries)) doc.entries = []
  return doc
}

export async function saveRoster(storage: StorageLike, doc: RosterDoc): Promise<void> {
  doc.updatedAt = Date.now()
  doc.version = 1
  await storage.writeText(rosterFile(), JSON.stringify(doc, null, 2))
}

export function newEntryId(): string {
  return 'agt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

/* ============ 检索 / 归属 ============ */

/** 该智能体是否服务这个项目（退役的一律不服务）。 */
export function servesProject(e: RosterEntry, project: string): boolean {
  if (e.status === 'retired') return false
  if (e.scope === 'all') return true
  return e.projects.includes(project)
}

/** 名册里是否已有同名条目（名字唯一，避免指派时两义）。 */
export function findByName(doc: RosterDoc, name: string): RosterEntry | undefined {
  const n = name.trim()
  return doc.entries.find((e) => e.name === n)
}

export function findByKey(doc: RosterDoc, keyId: string): RosterEntry | undefined {
  if (!keyId) return undefined
  return doc.entries.find((e) => e.keyId === keyId)
}

/**
 * 建一条新条目（不清洗，输入须已过 {@link sanitizeEntryInput}）。
 * `owner` 是服务端裁决的归属信息（谁是它、绑哪把钥匙）。
 */
export function buildEntry(
  input: EntryInput,
  owner: { source: 'agent' | 'human'; username: string; keyId?: string; keyName?: string },
  now = Date.now(),
): RosterEntry {
  return {
    id: newEntryId(),
    name: input.name,
    kind: input.kind,
    skills: input.skills,
    bio: input.bio,
    scope: input.scope,
    projects: input.projects,
    status: input.status,
    source: owner.source,
    keyId: owner.keyId ?? '',
    keyName: owner.keyName ?? '',
    username: owner.username,
    contact: input.contact,
    at: now,
    updatedAt: now,
    lastActiveAt: now,
  }
}

/** 把一条已清洗的输入套到既有条目上（保留 id / at / source / keyId 等归属字段）。 */
export function applyEntryInput(e: RosterEntry, input: EntryInput, now = Date.now()): void {
  e.name = input.name
  e.kind = input.kind
  e.skills = input.skills
  e.bio = input.bio
  e.scope = input.scope
  e.projects = input.projects
  e.status = input.status
  e.contact = input.contact
  e.updatedAt = now
  e.lastActiveAt = now
}

/* ============ 系统实证（现算自任务看板） ============ */

/**
 * 从一份任务看板里，算出某个 assignee 的战绩。
 *
 * 「完成」的判据 = 卡片落在内置「已完成」列（{@link DONE_COL}）——
 * 与项目看板算完成度用的是同一个列 id，所以两处口径一致，不会出现
 * 「看板说 3 张已完成、名册说 2 张」这种对不上的情况。
 */
export function evidenceOfBoard(board: Board, name: string, project: string): Evidence {
  const mine = board.cards.filter((c) => c.assignee === name)
  const done = mine.filter((c) => c.columnId === DONE_COL)
  let lastDoneAt = 0
  for (const c of done) if (Number(c.updatedAt) > lastDoneAt) lastDoneAt = Number(c.updatedAt)
  return { project, done: done.length, open: mine.length - done.length, total: mine.length, lastDoneAt }
}

/** 未指派 / 无名可算时用这份空实证（例如该名字在板上一张卡都没有）。 */
export function zeroEvidence(project: string): Evidence {
  return { project, done: 0, open: 0, total: 0, lastDoneAt: 0 }
}

/**
 * 读某项目的名册视图：条目（按服务范围过滤，退役的不列）+ 各自在该项目的实证。
 *
 * 读看板失败**不抛** —— 实证只是附加信息，读不到就置 `evidence: null`，
 * 让看板照常显示名册（与项目看板「任务进度读失败降级成一行说明」同口径）。
 */
export async function loadAgentsView(storage: StorageLike, project: string): Promise<AgentView[]> {
  const doc = await loadRoster(storage)
  const list = doc.entries
    .filter((e) => servesProject(e, project))
    .sort((a, b) => a.name.localeCompare(b.name))
  let board: Board | null = null
  try {
    board = await loadBoard(storage, boardFile(project), project)
  } catch {
    board = null
  }
  return list.map((e) => ({
    ...e,
    evidence: board ? evidenceOfBoard(board, e.name, project) : null,
  }))
}

/* ============ 智能体车道：按密钥 upsert ============ */

/**
 * 用一把密钥自注册/更新自述。
 *
 * 幂等锚点是 `keyId`（不是名字）：同一把钥匙反复注册**更新同一条**，
 * 不会每次在名册里堆一条新记录。名字可改（改名要查重 —— 撞了别人就回 `name-taken`）。
 *
 * 返回 `{ entry, created }`；名字被别的条目占用时返回 `{ conflict: true }`。
 */
export function upsertByKey(
  doc: RosterDoc,
  key: { id: string; name: string; username: string },
  input: EntryInput,
  now = Date.now(),
): { entry: RosterEntry; created: boolean } | { conflict: true } {
  const existing = findByKey(doc, key.id)
  const sameName = findByName(doc, input.name)
  if (sameName && (!existing || sameName.id !== existing.id)) return { conflict: true }
  if (existing) {
    applyEntryInput(existing, input, now)
    existing.keyName = key.name
    existing.username = key.username
    return { entry: existing, created: false }
  }
  const entry = buildEntry(input, { source: 'agent', username: key.username, keyId: key.id, keyName: key.name }, now)
  doc.entries.push(entry)
  return { entry, created: true }
}
