/**
 * 文件主索引的**纯逻辑**（不认识 ctx，可复用/可测）—— v6 方案 §3.2
 *
 * ## 这个模块要解决什么
 *
 * 改造前「用户看到什么」和「磁盘上有什么」是同一件事：`/api/list` 每次
 * `readdir` + 逐条 `stat` + 逐文件读 8 字节判密文（实测 5000 文件 P50≈287ms，
 * 外推 10 万文件≈5.8s）。而「这条侧车状态属于哪个文件」的答案，散落在
 * meta / comments / versions / favorites / recent / links / dup / fulltext /
 * rag / kg 十来个插件里，全部用 `project + 路径` 当键 —— 于是**改一次名，
 * 大部分插件的关联就断了**（只有 links/dup 手写了 `renamed` 搬迁逻辑）。
 *
 * 本模块引入三层分离：
 *
 * ```
 *   虚拟路径（分层，用户可见）   项目A/子目录/报告.md
 *        ↕  主索引（本模块）
 *   物理 ID（扁平，磁盘真相）    .pool/7f3a…c2.md
 * ```
 *
 * 改名字只改索引里的 `name`，**物理 ID 不动**，因此：
 *   - 所有按 `fileId` 关联的侧车状态天然不受影响（不需要每个插件各写一套搬迁逻辑）；
 *   - URL 只含 ID，改名不换链接；
 *   - 磁盘是扁平池，无子目录、无用户可控路径 → 直读的穿越面大幅收窄。
 *
 * ## 三条设计约定（与 svc-links 同口径，改之前先读）
 *
 * 1. **派生数据。** 索引丢了能全量重建（扫一遍磁盘），所以读取用宽容口径、
 *    条目损坏就丢弃、**绝不因为索引出问题而挡住任何文件操作**。
 * 2. **物理池文件名 = ID，不是原名。** 原名只活在索引里。这样磁盘上永远不会有
 *    「用户可控路径」参与拼接，也就没有 `%2e%2e` / 反斜杠 / junction 那一类问题。
 * 3. **目录也进索引**（`isDir=true` 且无 `physicalId`）。文件夹是**纯虚拟**的：
 *    磁盘上没有对应的目录，只有一条索引行。这样目录树/面包屑/mkdir/移动全部
 *    仍按虚拟路径工作，而物理层保持扁平。
 *
 * @module privhub-svc-fileindex/core
 */

import { randomUUID } from 'node:crypto'

/** 索引里的一条：一个文件（或虚拟目录）的元数据。 */
export interface FileEntry {
  /** 稳定 ID（`F` + 时间戳36进制 + 随机十六进制）。永不复用；URL 与侧车状态都用它。 */
  id: string
  /** 所属项目（顶层目录名；个人空间也用它的显示名）。 */
  project: string
  /**
   * 虚拟路径（项目内相对路径，正斜杠）。**权威展示位置**。
   * 目录条目指目录本身的路径；文件条目指文件的完整路径（含文件名）。
   */
  virtualPath: string
  /** 当前展示名（含扩展名）。改名只改这里。 */
  name: string
  /** 扩展名（小写，不含点；目录为空串）。 */
  ext: string
  /** 是否虚拟目录（磁盘上没有对应目录）。 */
  isDir: boolean
  /** 明文长度（字节）；目录为 0。 */
  size: number
  /** 最后修改时间（epoch 毫秒）。 */
  mtime: number
  /**
   * 物理 ID（= `.pool/` 里的文件名，不含扩展名）。
   * 目录为 null；文件必有值。
   * 老库迁移期间 `source='legacy'` 时它指向老库里的相对路径（见 `physicalPath`）。
   */
  physicalId: string | null
  /** 物理字节当前在哪：新扁平池 / 老库（尚未搬完）。 */
  source: 'pool' | 'legacy'
  /**
   * 物理字节所在的**卷** id（`volumes-core` 的 `VolumeRecord.id`）。
   *
   * `null` / 缺省 = 落在**默认卷**（即 `dataFiles/.pool`，单卷时代的唯一位置）。
   * 这是刻意的向后兼容：单卷部署升级后，所有既有条目都不带这个字段，
   * 它们仍然解析到老位置，不需要任何数据迁移。
   *
   * 多卷启用后，新写入的条目会带上具体的卷 id；搬移（hot→cold）只改这个字段，
   * **不动 `virtualPath`**，所以前端、URL、侧车状态全都不受影响。
   */
  volumeId?: string | null
  /** 老库模式下的相对路径（`source='legacy'` 时有值）。 */
  legacyPath?: string
  /**
   * 老库**根目录**（绝对路径）。`source='legacy'` 且此字段有值时，
   * 物理路径 = `<legacyRoot>/<project>/<legacyPath>`；无值时回退到当前 `dataFiles`。
   *
   * 为什么需要它：用户的真实场景是「老库在 E 盘，新装 PrivHub 把数据位置设到 F 盘」。
   * 若永远按当前 dataFiles（F 盘）拼路径，就根本找不到 E 盘那份老数据 —— 迁移功能等于没做。
   * 搬完后这个字段会被清掉（字节已经进池，不再需要知道它从哪儿来）。
   */
  legacyRoot?: string
  /** 回收站标记：true = 已删除但物理字节还在（虚拟回收站）。 */
  trashed?: boolean
  /** 进回收站的时间（epoch 毫秒）。 */
  trashedAt?: number
  /** 进回收站前的完整虚拟路径（恢复时用；也用于「新旧对比」）。 */
  trashedFrom?: string
  /** 操作者用户名（回收站审计用）。 */
  trashedBy?: string
  /** 退役过的旧文件名（改名后留在这里，供 `[[旧名]]` 之类的引用继续解析）。最近一次在前。 */
  aliases: string[]
  /** 创建时间（epoch 毫秒）。 */
  createdAt: number
  /** 最后一次触碰时间（用于条目上限淘汰与增量对账）。 */
  at: number
  /**
   * 内容指纹（sha256 原始哈希，十六进制）。用于查重合并：
   * 同项目内 `sha256` 相同的多个文件可以共用同一个 `physicalId`（引用计数）。
   * 老库只读扫描阶段若未算（省时间），这里为 undefined。
   */
  sha256?: string
  /* 这里曾有 `refs?: number`（物理字节被多少条索引行引用）。
   *
   * 已**删除**：它是派生量，却被存成了实体字段，靠 `sharePhysical` 手动 +1
   * 维护，而 `releasePhysical` 根本不读它、是直接扫条目数决定的。结果就是
   * 同一个物理文件在两条索引上各记一个互相矛盾的计数（A 说 1、B 说 2），
   * 既不参与任何判断，又会让运维误以为要"对账"。
   *
   * 引用数现在**只由「有多少条 source='pool' 且 physicalId 相同」决定**，
   * 见 `refCountOf()`。派生量不落盘，就不可能不一致。 */
}

/** 落盘形状。 */
export interface FileIndexStore {
  version: number
  entries: FileEntry[]
}

export const STORE_VERSION = 2
/** 条目上限：超出后按 `at` 淘汰最旧的（索引是**派生**数据，丢了能重建）。 */
export const MAX_ENTRIES = 200000
/** 单条最多保留多少个退役名。 */
export const MAX_ALIASES = 12
/** 侧车索引的落盘文件名（相对 `<dataRoot>/data`）。 */
export const STORE_FILE = 'fileindex.json'

/* ---------------- 路径与名字工具 ---------------- */

/** 统一路径写法：正斜杠、去前导 `./` 与 `/`、折叠多余斜杠、去尾部斜杠。 */
export function normalizePath(p: string): string {
  let t = String(p ?? '').replace(/\\/g, '/').trim()
  while (t.startsWith('./')) t = t.slice(2)
  t = t.replace(/\/{2,}/g, '/')
  t = t.replace(/^\/+/, '')
  // 去掉 `.` 段与 `..` 段（虚拟路径不允许越级；物理安全由调用方另做 realpath）
  const parts: string[] = []
  for (const seg of t.split('/')) {
    if (seg === '' || seg === '.') continue
    if (seg === '..') { parts.pop(); continue }
    parts.push(seg)
  }
  return parts.join('/')
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

/** 取扩展名（小写，不含点；无扩展名返回空串）。 */
export function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  if (i <= 0 || i === name.length - 1) return ''
  return name.slice(i + 1).toLowerCase()
}

/**
 * 拼一个子项的虚拟路径。
 * 单独抽出来是因为「根目录下」与「子目录下」的分隔符处理最容易写错。
 */
export function joinVirtual(parent: string, name: string): string {
  const p = normalizePath(parent)
  const n = String(name ?? '').replace(/\\/g, '/')
  return p === '' ? n : p + '/' + n
}

/**
 * 判断 `child` 是否是 `parent` 目录下的直接子项。
 * 用于「按目录列一页」——只比一层，不做递归。
 */
export function isDirectChild(parent: string, child: string): boolean {
  const p = normalizePath(parent)
  const c = normalizePath(child)
  if (c === '' || c === p) return false
  return dirOf(c) === p
}

/* ---------------- ID 生成 ---------------- */

/**
 * 新文件 ID：时间戳 + 进程内单调计数器（随机起点）。
 *
 * 与 svc-links 的 `newId()` 同策略、不同前缀（`F`）。为什么不能用纯随机：
 * 批量扫描时同一毫秒会连生成几百个，4 位 36 进制（≈168 万）在生日问题下
 * 撞号概率不可忽略；而 ID 撞了的后果是**静默串档**（两个文件共用一个 ID），
 * 比报错难查得多。计数器保证同毫秒内不重复，随机起点避免跨进程撞。
 */
let idSeq = Math.floor(Math.random() * 36 ** 4)
export function newFileId(): string {
  const t = Date.now().toString(36)
  const r = (idSeq++ % 36 ** 4).toString(36).padStart(4, '0')
  return 'F' + t + r
}

/**
 * 新物理 ID（= `.pool/` 里的文件名主体）。
 *
 * 与 fileId 分开是因为将来可能「一份物理字节被多条索引行共用」（查重合并），
 * 那时物理 ID 的生命周期由引用计数决定，不能跟某一条索引行绑死。
 *
 * 用 `randomUUID` 去横线：128 位随机，碰撞概率可忽略，且长度固定，
 * 便于 `^[0-9a-f]{32}$` 一类正则校验（nginx 侧要用）。
 */
export function newPhysicalId(): string {
  return randomUUID().replace(/-/g, '')
}

/** 物理 ID 的合法形状（nginx 侧与路由侧共用同一口径，避免两处正则漂移）。 */
export const PHYSICAL_ID_RE = /^[0-9a-f]{32}$/

/* ---------------- 载入时的形状裁决 ---------------- */

/**
 * 索引读入时的形状裁决：非法条目一律丢弃（索引损坏不值得让服务起不来）。
 *
 * 与 svc-links 的 `normalizeStore` 同口径：**宽容读取**。理由：索引是派生数据，
 * 少几条顶多让「这次没列出某个文件」，而一旦因为索引坏了拒绝启动，用户连
 * 「文件还在不在」都查不了 —— 那才是真的坏。
 */
export function normalizeStore(raw: unknown): FileIndexStore {
  const src = (raw ?? {}) as { version?: unknown; entries?: unknown }
  if (!Array.isArray(src.entries)) return { version: STORE_VERSION, entries: [] }
  const entries: FileEntry[] = []
  const seenId = new Set<string>()
  for (const e of src.entries) {
    if (!e || typeof e !== 'object') continue
    const o = e as Record<string, unknown>
    if (typeof o.id !== 'string' || o.id === '') continue
    if (seenId.has(o.id)) continue
    if (typeof o.project !== 'string' || o.project === '') continue
    if (typeof o.virtualPath !== 'string' || o.virtualPath === '') continue
    const virtualPath = normalizePath(o.virtualPath)
    if (virtualPath === '') continue
    const isDir = o.isDir === true
    const name = typeof o.name === 'string' && o.name !== '' ? o.name : nameOf(virtualPath)
    const ext = typeof o.ext === 'string' ? o.ext : extOf(name)
    const physicalId = typeof o.physicalId === 'string' && o.physicalId !== '' ? o.physicalId : null
    /* 文件必须有物理 ID（除非是还没搬过来的老库条目）；目录必须没有。
     * 形状不对的条目直接丢 —— 留一条"没有物理 ID 的文件"出去，读的时候必然 500。 */
    const source: FileEntry['source'] = o.source === 'legacy' ? 'legacy' : 'pool'
    if (!isDir && physicalId === null && source === 'pool') continue
    const aliases = Array.isArray(o.aliases)
      ? o.aliases.filter((a): a is string => typeof a === 'string' && a !== '').slice(0, MAX_ALIASES)
      : []
    const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d)
    seenId.add(o.id)
    entries.push({
      id: o.id,
      project: o.project,
      virtualPath,
      name,
      ext,
      isDir,
      size: num(o.size, 0),
      mtime: num(o.mtime, 0),
      physicalId,
      source,
      ...(typeof o.legacyPath === 'string' && o.legacyPath !== '' ? { legacyPath: o.legacyPath } : {}),
      ...(typeof o.legacyRoot === 'string' && o.legacyRoot !== '' ? { legacyRoot: o.legacyRoot } : {}),
      ...(o.trashed === true ? { trashed: true } : {}),
      ...(o.trashed === true ? { trashedAt: num(o.trashedAt, 0) } : {}),
      ...(typeof o.trashedFrom === 'string' ? { trashedFrom: o.trashedFrom } : {}),
      ...(typeof o.trashedBy === 'string' ? { trashedBy: o.trashedBy } : {}),
      aliases,
      createdAt: num(o.createdAt, 0),
      at: num(o.at, 0),
      ...(typeof o.sha256 === 'string' && o.sha256 !== '' ? { sha256: o.sha256 } : {}),
    })
  }
  return { version: STORE_VERSION, entries }
}

/* ---------------- 排序与分页 ---------------- */

export interface ListItem {
  id: string
  name: string
  ext: string
  isDir: boolean
  size: number
  sizeText: string
  mtime: string
  type: string
  virtualPath: string
}

/** 体积人类可读化（与 privhub-core 的 fmtSize 同口径，避免两处格式不一致）。 */
export function fmtSize(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let v = n
  let i = 0
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  return (i === 0 ? Math.round(v) : Math.round(v * 10) / 10) + ' ' + units[i]
}

/**
 * 目录优先、再按名称排序 —— 与改造前 `core.listFiles` 的排序**逐字一致**
 * （`a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1`）。
 * 界面已有「先文件夹后文件」的肌肉记忆，换了顺序会被当成 bug。
 */
export function compareListItems(a: Pick<FileEntry, 'isDir' | 'name'>, b: Pick<FileEntry, 'isDir' | 'name'>): number {
  if (a.isDir === b.isDir) return a.name.localeCompare(b.name)
  return a.isDir ? -1 : 1
}

/** 把索引条目投影成前端需要的形状（**不含物理路径** —— 见方案 §4 的接口契约）。 */
export function toListItem(e: FileEntry): ListItem {
  return {
    id: e.id,
    name: e.name,
    ext: e.ext,
    isDir: e.isDir,
    size: e.size,
    sizeText: e.isDir ? '—' : fmtSize(e.size),
    mtime: e.mtime ? new Date(e.mtime).toISOString() : '',
    type: e.isDir ? '文件夹' : (e.ext.toUpperCase() || '文件'),
    virtualPath: e.virtualPath,
  }
}

/* ---------------- 冲突与重名 ---------------- */

export interface NameConflict {
  /** 冲突类型：同名不同内容 / 同名同内容。 */
  kind: 'same-name' | 'same-name-same-content'
  /** 已存在的条目（供前端展示「换成谁 / 保留谁」）。 */
  existing: FileEntry
}

/**
 * 在一个目录里找同名条目（上传前拦截用）。
 *
 * 注意口径：**只在同一个虚拟目录内判重名**，与改造前 `/upload` 的行为一致
 * （不同目录可以同名共存）。扁平化之后磁盘上没有目录，但**虚拟目录仍然是
 * 重名判定的边界** —— 这一点很容易在实现时想当然地写成"全库判重"，
 * 那会让「两个项目各有一份 README.md」变成冲突。
 */
export function findSameName(entries: Iterable<FileEntry>, project: string, virtualPath: string): FileEntry | null {
  const p = normalizePath(virtualPath)
  for (const e of entries) {
    if (e.project !== project) continue
    if (e.trashed) continue
    if (normalizePath(e.virtualPath) === p) return e
  }
  return null
}

/**
 * 命名候选：`报告.md` → `报告 (2).md` → `报告 (3).md`…
 *
 * 用户选「自动选择」时用它保留两份（**不删任何一份**）。为什么不用 mtime
 * 自动留一个：实测上传是流式落盘、分片会话用 `Date.now()`，**根本没采集
 * 客户端的 `File.lastModified`**，拿服务端落盘时间当"谁更新"没有依据，
 * 会静默丢掉用户刚传的那份。
 */
export function suggestName(entries: Iterable<FileEntry>, project: string, virtualPath: string): string {
  const p = normalizePath(virtualPath)
  const dir = dirOf(p)
  const name = nameOf(p)
  const taken = new Set<string>()
  for (const e of entries) {
    if (e.project !== project || e.trashed) continue
    if (dirOf(normalizePath(e.virtualPath)) === dir) taken.add(e.name.toLowerCase())
  }
  if (!taken.has(name.toLowerCase())) return name
  const dot = name.lastIndexOf('.')
  const stem = dot > 0 ? name.slice(0, dot) : name
  const suffix = dot > 0 ? name.slice(dot) : ''
  for (let i = 2; i < 10000; i++) {
    const candidate = stem + ' (' + i + ')' + suffix
    if (!taken.has(candidate.toLowerCase())) return candidate
  }
  /* 极端情况（同名 1 万个）：退回时间戳，保证一定有解。 */
  return stem + ' (' + Date.now() + ')' + suffix
}

/** 别名表推送：去重、把新别名放最前、截断到上限（与 svc-links 同口径）。 */
export function pushAlias(aliases: string[], name: string): string[] {
  if (name === '') return aliases
  return [name, ...aliases.filter((a) => a !== name)].slice(0, MAX_ALIASES)
}
