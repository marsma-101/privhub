/**
 * privhub-mindmap · core —— 全局思维导图的「数据契约 + 存储」（纯逻辑，不注册路由）
 *
 * 项目内的导图**就是一个文件**（`.mindmap`），走既有文件读写，服务端一行都不用改。
 * 全局导图不一样：它没有归属项目，也不该出现在任何项目的文件树里 —— 它是**实例级的
 * 管理员视图**（「我现在有哪些项目」那张总览图）。所以它落在这里：
 * `data/mindmaps/global.json`，经 `ctx.storage` 透明加密（PHENC1），与 `data/roster.json` 同规格。
 *
 * 为什么把「多张图」放进**一个** JSON 而不是一个图一个文件：
 *   · 全局图永远只有管理员看得到、数量在个位到十位数，没有「按需打开单张」的规模问题；
 *   · 一个文件 = 一次原子写（`writeBuffer` 临时名 + rename），不存在「读到一半另一张图不见了」；
 *   · 与名册（`data/roster.json`）保持同一形状，运维只需认一套。
 *
 * ⚠ `text` 存的是**大纲原文**（与 `.mindmap` 同一套缩进格式），不是渲染后的树：
 *   服务端不做导图语义校验，解析/容错全在客户端 `client/outline.js`（规划 §6）。
 *   这样智能体手上拿到的就是一份可以直接抄写的人读文本。
 *
 * @module privhub-mindmap/core
 */

import { join } from 'node:path'
import { readJsonStore } from '../../privhub-core/src/json-store'

/* ============ 契约 ============ */

/** 一张全局导图。`text` 是缩进大纲原文（`# 标题` + `- 节点`）。 */
export interface GlobalMap {
  id: string
  title: string
  text: string
  /** 创建者用户名（显示用，不参与鉴权）。 */
  createdBy: string
  /** 最后写入者用户名 —— 多人管同一张图时至少知道「谁动过」。 */
  updatedBy: string
  createdAt: number
  updatedAt: number
}

export interface GlobalDoc { version: number; maps: GlobalMap[]; updatedAt: number }

/** 新建时若不填标题，用这个（与客户端「未命名思维导图」同一口径）。 */
export const DEFAULT_TITLE = '未命名全局导图'

/** 新建时若不填正文，给一张带一个中心节点与两条示例分支的空图。 */
export function defaultText(title: string): string {
  const t = String(title || DEFAULT_TITLE).trim()
  return '# ' + t + '\n\n- 中心主题\n  - 分支一\n  - 分支二\n'
}

/* ============ 边界 ============ */

export const LIMITS = {
  /** 全局图张数上限（管理员手维的东西，几十张足够；防的是失控脚本）。 */
  maps: 100,
  title: 80,
  /** 单张图的正文上限（字符）。1M 字符 ≈ 一本中篇，远超任何人手画的导图。 */
  text: 1_000_000,
} as const

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()

/** 全局导图的落盘位置（`PRIVHUB_ROOT` 锚定，与其它系统 JSON 同根）。 */
export function globalFile(): string {
  return join(rootDir, 'data', 'mindmaps', 'global.json')
}

/* ============ 清洗 ============ */

function s(v: unknown, max: number): string {
  return String(v ?? '').slice(0, max)
}

/** 新条目的 id：时间 + 随机后缀（同一毫秒连建两张也不会撞）。 */
export function newId(): string {
  return 'gm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/** 调用方可提交的字段（其余一律服务端裁决）。 */
export interface MapInput { title: string; text: string }

/**
 * 清洗一份外部提交的导图字段。
 * `title` 缺失**不算错**：建图时用 {@link DEFAULT_TITLE} 补，改名时留空则沿用原标题（由路由判）。
 * 形状不对（非对象）返回 null（调用方回 400）。
 */
export function sanitizeMapInput(v: unknown): MapInput | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const o = v as Record<string, unknown>
  return {
    title: s(o.title, LIMITS.title).trim(),
    text: s(o.text, LIMITS.text),
  }
}

/* ============ 读 / 写 ============ */

/** 存储只用到这两个方法（与 roster 同一最小结构类型，避免把 Service 形状写进签名）。 */
export interface StorageLike {
  readText: (file: string) => Promise<string>
  writeText: (file: string, data: string) => Promise<void>
}

function emptyDoc(): GlobalDoc {
  return { version: 1, maps: [], updatedAt: 0 }
}

/** 一份全局图文件该有的样子（`maps` 必须是数组）。 */
export function looksLikeGlobal(v: unknown): boolean {
  const d = v as GlobalDoc
  return !!d && typeof d === 'object' && Array.isArray(d.maps)
}

/** 严格读：文件在但读不出来 = 损坏（隔离存证 + 抛错），绝不静默当成「一张图都没有」。 */
export async function loadGlobal(storage: StorageLike): Promise<GlobalDoc> {
  const doc = await readJsonStore<GlobalDoc>(storage, globalFile(), emptyDoc(), looksLikeGlobal)
  if (!Array.isArray(doc.maps)) doc.maps = []
  return doc
}

export async function saveGlobal(storage: StorageLike, doc: GlobalDoc): Promise<void> {
  doc.updatedAt = Date.now()
  await storage.writeText(globalFile(), JSON.stringify(doc, null, 2))
}

/** 对外视图：字段就是契约里这些（`text` 原样给出，客户端自己解析）。 */
export function viewMap(m: GlobalMap): GlobalMap {
  return {
    id: m.id, title: m.title, text: m.text,
    createdBy: m.createdBy, updatedBy: m.updatedBy,
    createdAt: m.createdAt, updatedAt: m.updatedAt,
  }
}

/** 列表排序：最近改过的排前面（管理员多半接着上次那张继续画）。 */
export function sortMaps(maps: GlobalMap[]): GlobalMap[] {
  return maps.slice().sort((a, b) => b.updatedAt - a.updatedAt || a.title.localeCompare(b.title))
}
