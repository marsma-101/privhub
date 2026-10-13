/**
 * 链接登记表的**纯逻辑**（不认识 ctx，可单测）—— Q4 / §2.6
 *
 * ## 登记表要解决什么
 *
 * 改造前 `[[名]]` 按**文件名**匹配，于是"把被引用的文件改个名"= 图谱边断、反链消失
 * （改进方案 §2.6 现状）。现在每个文件在**侧车登记表**里有稳定 ID：
 *
 * ```
 * [[设计.md]] ──(名→ID)──▶ id Lx7f ──▶ 当前路径 docs/概要.md
 * ```
 *
 * 名字被改掉之后，**旧名作为别名留着**，所以 `[[设计.md]]` 照样解析到那个文件 ——
 * 用户不必去改文档（本仓**不改写用户文档**：改写正文是不可逆的破坏性操作，
 * 且会连带触发版本历史、编辑器锁、协同会话）。
 *
 * ## 三条与既有行为的兼容约定
 *
 * 1. **目标按完整文件名匹配**（含扩展名），与改造前一致，不新增"去扩展名"命中；
 * 2. **文件名优先于别名**：某个别名被后来的新文件"重新占用"时，新文件胜出
 *    （当前存在的文件名是用户的直接意图，别名只是历史）；
 * 3. **同名多命中时优先与引用方同目录**的那个（比改造前的"取第一个"稳定，
 *    且不需要记住"上次解析到谁"这种额外状态）。
 *
 * @module privhub-svc-links/core
 */

/** 登记表里的一条：一个文件 → 一个稳定 ID。 */
export interface LinkEntry {
  /** 稳定 ID（`L` + 时间戳36进制 + 随机十六进制），永不复用。 */
  id: string
  project: string
  /** 当前路径（项目内相对路径，正斜杠）。 */
  path: string
  /** 当前文件名（含扩展名）。 */
  name: string
  /** 退役过的文件名（改名后旧名留在这里，用于"改名不断链"）。最近一次在前。 */
  aliases: string[]
  /** 最后一次触碰时间（用于条目上限的淘汰）。 */
  at: number
}

/** 落盘形状。 */
export interface LinkStore {
  version: number
  entries: LinkEntry[]
}

export const STORE_VERSION = 1
/** 条目上限：超出后按 `at` 淘汰最旧的（登记表是**派生**数据，丢了能重建）。 */
export const MAX_ENTRIES = 20000
/** 单条最多保留多少个退役名（防病态改名刷爆条目）。 */
export const MAX_ALIASES = 12
/** 侧车登记表的落盘文件名（相对 PRIVHUB_ROOT）。 */
export const STORE_FILE = 'links.json'
/** 每次惰性补登记最多处理多少个文件（FIFO 队列，余下的下次继续）。 */
export const BACKFILL_PER_CALL = 400

/** 统一路径写法：正斜杠、去前导 `./` 与 `/`。 */
export function normalizePath(p: string): string {
  let t = String(p ?? '').replace(/\\/g, '/').trim()
  while (t.startsWith('./')) t = t.slice(2)
  return t.replace(/^\/+/, '')
}

/** 取最后一段（文件名）。 */
export function nameOf(p: string): string {
  const t = normalizePath(p)
  return t.slice(t.lastIndexOf('/') + 1)
}

/** 取目录（不含尾斜杠；根目录为空串）。 */
export function dirOf(p: string): string {
  const t = normalizePath(p)
  const i = t.lastIndexOf('/')
  return i < 0 ? '' : t.slice(0, i)
}

/**
 * 新 ID：时间戳 + 进程内单调计数器（随机起点）。不追求密码学强度，只要求**不重复**且短。
 *
 * 曾经的写法是「时间戳 + 4 位纯随机」—— 36^4 ≈ 168 万的空间，同一毫秒内连生成 500 个
 * 就有 ~7% 的概率撞上（生日问题），而登记表在**批量扫描**时恰恰是同毫秒连续生成。
 * ID 撞了的后果不是报错而是**静默串档**：两个文件共用一个 ID，改名后 `[[旧名]]`
 * 会解析到另一个文件上——正是"改名不断链"最不能出的错。
 *
 * 改成计数器后，同一毫秒内生成 36^4 个以内**保证**互不相同（真实场景远达不到上限）；
 * 随机起点让**跨进程**（不同次启动、同一毫秒）也不易撞。
 */
let idSeq = Math.floor(Math.random() * 36 ** 4)
export function newId(): string {
  const t = Date.now().toString(36)
  const r = (idSeq++ % 36 ** 4).toString(36).padStart(4, '0')
  return 'L' + t + r
}

/** 登记表读入时的形状裁决：非法条目一律丢弃（登记表损坏不值得让服务起不来）。 */
export function normalizeStore(raw: unknown): LinkStore {
  const src = (raw ?? {}) as { version?: unknown; entries?: unknown }
  if (!Array.isArray(src.entries)) return { version: STORE_VERSION, entries: [] }
  const entries: LinkEntry[] = []
  for (const e of src.entries) {
    if (!e || typeof e !== 'object') continue
    const o = e as Record<string, unknown>
    if (typeof o.id !== 'string' || o.id === '') continue
    if (typeof o.project !== 'string') continue
    if (typeof o.path !== 'string' || o.path === '') continue
    const path = normalizePath(o.path)
    const name = typeof o.name === 'string' && o.name !== '' ? o.name : nameOf(path)
    const aliases = Array.isArray(o.aliases)
      ? o.aliases.filter((a): a is string => typeof a === 'string' && a !== '').slice(0, MAX_ALIASES)
      : []
    const at = typeof o.at === 'number' && Number.isFinite(o.at) ? o.at : 0
    entries.push({ id: o.id, project: o.project, path, name, aliases, at })
  }
  return { version: STORE_VERSION, entries }
}

/**
 * 多命中时挑一个：**优先与引用方同目录**的那个，否则取第一个。
 *
 * 为什么不是"记住上次解析到谁"：那需要为每一对 (来源文件, 名字) 持久化一份选择表，
 * 会随引用数线性膨胀；而同目录优先是**无状态**的确定性规则，对"同名不同目录"
 * 这个最常见场景已经够用（且明确优于改造前的"取第一个"）。
 */
export function pickCandidate(candidates: string[], sourcePath?: string): string | null {
  if (candidates.length === 0) return null
  if (candidates.length === 1 || !sourcePath) return candidates[0]
  const dir = dirOf(sourcePath)
  const same = candidates.find((c) => dirOf(c) === dir)
  return same ?? candidates[0]
}

/** 别名表推送：去重、把新别名放最前、截断到上限。 */
export function pushAlias(aliases: string[], name: string): string[] {
  if (name === '') return aliases
  return [name, ...aliases.filter((a) => a !== name)].slice(0, MAX_ALIASES)
}

/**
 * 「项目里现在实际有哪些文件」的索引（登记表之外的**活文件**口径）。
 *
 * 为什么要它：登记表是**惰性**建立的（老文件要等被扫到才登记），若解析只看登记表，
 * 那些还没登记的现存文件就会"解析不到" —— 表现为升级后图谱突然少了一批边。
 * 所以解析时把「磁盘上真实存在的文件列表」一并带上：登记表负责**改名历史**，
 * 活列表负责**当下存在**，两者取并集。
 *
 * 由调用方**每次图构建建一次**再复用（每个文档都建一遍是 O(n²)）。
 */
export interface LiveIndex {
  pathSet: Set<string>
  /** 文件名（含扩展名）→ 项目内路径列表（同名多目录时多个）。 */
  byName: Map<string, string[]>
}

export function buildLiveIndex(paths: string[]): LiveIndex {
  const pathSet = new Set<string>()
  const byName = new Map<string, string[]>()
  for (const raw of paths) {
    const p = normalizePath(raw)
    if (p === '') continue
    pathSet.add(p)
    const n = nameOf(p)
    const arr = byName.get(n)
    if (arr) arr.push(p)
    else byName.set(n, [p])
  }
  return { pathSet, byName }
}
