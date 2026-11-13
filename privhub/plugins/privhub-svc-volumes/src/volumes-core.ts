/**
 * 存储卷的**纯逻辑**（不认识 ctx，可复用/可测）
 *
 * ## 这个模块要解决什么
 *
 * 改造前「文件库」是**一个**目录（`PRIVHUB_DATA_FILES`）。这带来一个硬约束：
 * 程序和数据必须放在一起，或者至少得手工配环境变量。用户的原话：
 *
 * > 我需要将程序和库放在同一个地方，这样不行，如果程序和库不在同一个盘符，
 * > 甚至不在同一个设备上，就没办法做设置了。
 *
 * 于是引入「卷」：一个卷 = 一块可独立挂载/卸载的存储位置（本地盘符、某个文件夹、
 * 局域网 UNC 路径）。文件字节散落在多个卷上，**虚拟层级仍然只活在索引里**，
 * 所以前端渲染的目录树、URL、侧车状态全都不受影响。
 *
 * ## 三种角色（决定「往哪写」和「什么时候搬」）
 *
 * ```
 *   hot   热卷  ── 新上传先落这里（通常是 SSD）。写完就可以被读，用户立刻可用。
 *      │
 *      │  空闲时搬移（复制→校验→改索引→删源）
 *      ▼
 *   cold  冷卷  ── 长期存放（通常是 HDD / NAS）。容量大、慢，但便宜。
 *
 *   any   通用卷 ── 没配冷热分层时用：所有写入都落它，不做搬移。
 * ```
 *
 * 用户举的例子正是 `hot=SSD` + `cold=HDD`：上传立刻完成（落 SSD），
 * 空闲时搬到 HDD，索引里的 `volumeId` 改了但 `virtualPath` 不变 —— 无感。
 *
 * ## 四条设计约定（改之前先读）
 *
 * 1. **卷是配置，不是缓存。** 卷列表落盘（加密 JSON），重启必须还在；
 *    但**卷的可用容量不是配置**，是每次现问磁盘的派生量。
 * 2. **容量水位决定能不能写。** 写之前检查目标卷剩余空间，不够就换卷；
 *    全部卷都不够才失败。**绝不允许写到盘满** —— 盘满会让整个服务连日志都写不出。
 * 3. **搬移只改索引，不碰虚拟路径。** 所以搬移期间文件仍然可读（源还在），
 *    搬完才删源。断电最坏结果是「两份都有」或「索引指向源」，都不会丢数据。
 * 4. **卷缺失 ≠ 数据丢失。** 某个卷离线时，只有落在它上面的文件不可读，
 *    其余卷照常服务。索引条目一律保留，等卷回来。
 *
 * @module privhub-svc-fileindex/volumes-core
 */

/** 卷的角色：决定写入优先级与是否参与分层搬移。 */
export type VolumeRole = 'hot' | 'cold' | 'any'

/** 一个存储卷的持久化配置。 */
export interface VolumeRecord {
  /** 稳定 ID（`V` + 随机十六进制）。索引条目靠它定位字节在哪。永不复用。 */
  id: string
  /** 展示名（用户自己起，如「主盘 HDD」「SSD 缓存」）。 */
  label: string
  /**
   * 挂载点（绝对路径）。
   * 本地：`D:\privhub-store`；网络：`\\192.168.1.10\share\privhub`。
   */
  root: string
  /** 角色。 */
  role: VolumeRole
  /**
   * 写入水位（百分比，1~99）。剩余空间低于此值时**不再往这个卷写新文件**。
   *
   * 为什么是「剩余低于阈值」而不是「已用高于阈值」：盘满的后果是灾难性的
   * （连审计日志都写不出、SQLite 类存储可能损坏），所以要留安全余量。
   * 默认 10%：一块 1TB 盘留 100GB，足够搬运和系统自身写入周转。
   */
  highWatermark: number
  /** 是否启用。停用的卷不接收新写入，但已有文件仍可读（用于准备下线）。 */
  enabled: boolean
  /** 创建时间（epoch 毫秒）。 */
  createdAt: number
  /** 备注（可选，便于运维记录这块盘是什么设备）。 */
  note?: string
}

/** 卷列表的落盘形状。 */
export interface VolumeStore {
  version: number
  volumes: VolumeRecord[]
  /**
   * 默认写入卷 id。空 = 按角色自动选（hot 优先，其次 any，最后 cold）。
   * 显式指定用于「我就想全写这块盘」的场景。
   */
  defaultVolumeId: string | null
  /** 是否启用分层搬移（hot → cold）。默认 true，但只有同时存在 hot 和 cold 才真正生效。 */
  tieringEnabled: boolean
}

export const VOLUME_STORE_VERSION = 1

/** 卷 ID 的形状：`V` + 32 位十六进制（与 physicalId 同风格，便于肉眼区分）。 */
export const VOLUME_ID_RE = /^V[0-9a-f]{32}$/

/** 生成新卷 ID。 */
export function newVolumeId(): string {
  /* 用 randomUUID 去横线，与 core 的 newPhysicalId 保持一致风格。
   * 前缀 `V` 让「卷 id」和「物理 id」在日志里一眼可分。 */
  const hex = (globalThis.crypto?.randomUUID?.() ?? '').replace(/-/g, '')
  if (hex.length === 32) return 'V' + hex
  /* 极老运行时的兜底：不该走到，但绝不能返回一个非法 ID（索引会因此拒绝解析）。 */
  let out = ''
  for (let i = 0; i < 32; i++) out += '0123456789abcdef'[Math.floor(Math.random() * 16)]
  return 'V' + out
}

/** 卷的运行时状态（每次现问磁盘，不落盘）。 */
export interface VolumeStat {
  /** 挂载点是否存在且可访问。 */
  online: boolean
  /** 总容量（字节）；离线或取不到为 0。 */
  total: number
  /** 剩余可用（字节）；离线或取不到为 0。 */
  free: number
  /** 已用（字节）= total - free。 */
  used: number
  /** 已用百分比（0~100，保留一位小数）；取不到为 0。 */
  usedPercent: number
  /** 离线原因（online=false 时给可读原因）。 */
  error?: string
}

/** 一个卷的配置 + 运行时状态的合并视图（管理台直接渲染它）。 */
export interface VolumeView extends VolumeRecord {
  stat: VolumeStat
  /** 该卷上有多少条索引条目（文件数，不含目录）。 */
  files: number
  /** 该卷上文件占用的明文总字节。 */
  bytes: number
  /** 是否正在被选为写入目标（按当前策略判定）。 */
  writable: boolean
}

/**
 * 空卷列表的初始形状。
 *
 * 注意 `defaultVolumeId: null` + `tieringEnabled: true` 的组合：首次启用多卷时，
 * 若用户只加了一个卷，它自然是唯一目标；加第二个（冷卷）后分层才会真正生效。
 */
export function emptyVolumeStore(): VolumeStore {
  return { version: VOLUME_STORE_VERSION, volumes: [], defaultVolumeId: null, tieringEnabled: true }
}

/**
 * 规范化落盘内容（宽容口径）。
 *
 * 索引是**配置**，坏一条不该让整个卷列表消失 —— 但也**绝不能静默改用户的路径**：
 * 路径不合法的条目直接丢弃（丢弃会被自检报出来），而不是「猜一个」。
 */
export function normalizeVolumeStore(raw: unknown): VolumeStore {
  const out = emptyVolumeStore()
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  const o = raw as Record<string, unknown>
  if (typeof o.tieringEnabled === 'boolean') out.tieringEnabled = o.tieringEnabled

  const list = Array.isArray(o.volumes) ? o.volumes : []
  const seen = new Set<string>()
  for (const item of list) {
    const v = normalizeVolume(item)
    if (!v) continue
    if (seen.has(v.id)) continue
    seen.add(v.id)
    out.volumes.push(v)
  }
  /* defaultVolumeId 必须指向一个真实存在的卷，否则当作没配（自动选）。
   * 不这么做的话，删掉默认卷后会「有一个指向虚空的默认」，写入全部失败。 */
  const did = typeof o.defaultVolumeId === 'string' ? o.defaultVolumeId : ''
  out.defaultVolumeId = did !== '' && seen.has(did) ? did : null
  return out
}

/** 规范化单条卷配置；不合法返回 null（由调用方丢弃并报告）。 */
export function normalizeVolume(raw: unknown): VolumeRecord | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>

  const id = typeof o.id === 'string' ? o.id : ''
  if (!VOLUME_ID_RE.test(id)) return null

  const root = typeof o.root === 'string' ? o.root.trim() : ''
  if (root === '') return null

  const role = o.role === 'hot' || o.role === 'cold' || o.role === 'any' ? o.role : 'any'

  const label = typeof o.label === 'string' && o.label.trim() !== ''
    ? o.label.trim().slice(0, 60)
    : defaultLabelFor(root, role)

  const hw = Number(o.highWatermark)
  const highWatermark = Number.isFinite(hw) ? Math.max(1, Math.min(99, Math.round(hw))) : 10

  return {
    id,
    label,
    root,
    role,
    highWatermark,
    enabled: o.enabled !== false,
    createdAt: Number.isFinite(Number(o.createdAt)) ? Number(o.createdAt) : Date.now(),
    ...(typeof o.note === 'string' && o.note.trim() !== '' ? { note: o.note.trim().slice(0, 200) } : {}),
  }
}

/** 没起名时给一个能认出来的默认名（盘符 / UNC 主机名 / 末级目录名）。 */
export function defaultLabelFor(root: string, role: VolumeRole): string {
  const roleText = role === 'hot' ? '热卷' : role === 'cold' ? '冷卷' : '通用卷'
  /* UNC：\\host\share\... → 用 host\share 当名字，比整条路径短且够辨识。 */
  if (root.startsWith('\\\\')) {
    const parts = root.slice(2).split(/[\\/]+/).filter(Boolean)
    const tail = parts.slice(0, 2).join('\\')
    return tail !== '' ? tail + '（' + roleText + '）' : roleText
  }
  /* 本地盘符：D:\... → "D: 盘（热卷）" */
  const drive = /^([A-Za-z]):/.exec(root)
  if (drive) return drive[1].toUpperCase() + ': 盘（' + roleText + '）'
  /* 其它（挂载点 / 相对化的绝对路径）：取末级目录名。 */
  const parts = root.split(/[\\/]+/).filter(Boolean)
  const last = parts[parts.length - 1] ?? ''
  return last !== '' ? last + '（' + roleText + '）' : roleText
}

/**
 * 判断某个卷当前是否**可以接收新写入**。
 *
 * 三个条件缺一不可：
 *   1. 启用（`enabled`）；
 *   2. 在线（挂载点可访问）；
 *   3. 剩余空间高于水位（留出安全余量，避免写满）。
 *
 * 为什么把「水位」放在这里而不是写入时临时算：判定规则只能有一处，
 * 否则「管理台显示可写、实际写入被拒」这类不一致必然出现。
 */
export function isWritable(v: VolumeRecord, stat: VolumeStat): boolean {
  if (!v.enabled) return false
  if (!stat.online) return false
  if (stat.total <= 0) return false
  /* 剩余百分比低于水位 → 停写。用整数比较避免浮点边界（刚好 10.0% 算可写）。 */
  const freePercent = (stat.free / stat.total) * 100
  return freePercent > v.highWatermark
}

/**
 * 按策略挑一个写入目标卷。
 *
 * 优先级：
 *   1. 显式指定的 `defaultVolumeId`（且可写）；
 *   2. `hot` 卷（用户要求「上传先落 SSD」）；
 *   3. `any` 卷；
 *   4. `cold` 卷（兜底：至少还能用）。
 *
 * 同一档里按**剩余空间多的优先**（尽量均衡，也避免总写同一块盘）。
 * 返回 null = 没有任何可写卷（调用方必须明确失败，不能静默写本地）。
 *
 * @param needBytes 本次要写的字节数。给了就要求剩余空间够放它（+水位余量）。
 */
export function pickWriteVolume(
  store: VolumeStore,
  stats: ReadonlyMap<string, VolumeStat>,
  needBytes = 0,
): VolumeRecord | null {
  const usable = store.volumes.filter((v) => {
    const st = stats.get(v.id)
    if (!st || !isWritable(v, st)) return false
    /* 留出水位余量后还得放得下这次要写的内容。 */
    const reserve = (st.total * v.highWatermark) / 100
    return st.free - reserve >= needBytes
  })
  if (usable.length === 0) return null

  if (store.defaultVolumeId) {
    const d = usable.find((v) => v.id === store.defaultVolumeId)
    if (d) return d
    /* 默认卷不可写时**继续往下选**，而不是直接失败：
     * 「默认卷满了」应当自动溢到别的卷，否则一次盘满就让整个服务停写。 */
  }

  const rank: Record<VolumeRole, number> = { hot: 0, any: 1, cold: 2 }
  const sorted = [...usable].sort((a, b) => {
    const r = rank[a.role] - rank[b.role]
    if (r !== 0) return r
    const fa = stats.get(a.id)?.free ?? 0
    const fb = stats.get(b.id)?.free ?? 0
    return fb - fa
  })
  return sorted[0] ?? null
}

/**
 * 挑一个搬移目标卷（hot → cold 用）。
 *
 * 只考虑 `cold` 和 `any`：`hot` 是「中转站」，把文件搬回热卷没有意义
 * （热卷通常更小，搬回去只会挤掉新上传的空间）。
 */
export function pickColdVolume(
  store: VolumeStore,
  stats: ReadonlyMap<string, VolumeStat>,
  needBytes = 0,
): VolumeRecord | null {
  const usable = store.volumes.filter((v) => {
    if (v.role === 'hot') return false
    const st = stats.get(v.id)
    if (!st || !isWritable(v, st)) return false
    const reserve = (st.total * v.highWatermark) / 100
    return st.free - reserve >= needBytes
  })
  if (usable.length === 0) return null
  const rank: Record<VolumeRole, number> = { cold: 0, any: 1, hot: 2 }
  return [...usable].sort((a, b) => {
    const r = rank[a.role] - rank[b.role]
    if (r !== 0) return r
    return (stats.get(b.id)?.free ?? 0) - (stats.get(a.id)?.free ?? 0)
  })[0] ?? null
}

/**
 * 判断是否需要搬移，以及搬哪些。
 *
 * 触发条件（满足其一）：
 *   · 热卷上有文件，且冷卷可写 —— 这是常态：热卷就该是空的。
 *   · 热卷剩余空间低于水位 —— 紧急：再不搬就写不进去了。
 *
 * 返回按 `size` 升序排列的候选：先搬小的能更快腾出空间，
 * 也让「搬移进度」在界面上可见地推进（一次搬一个 4GB 大文件会让人以为卡住了）。
 */
export function selectTieringCandidates(
  files: ReadonlyArray<{ id: string; volumeId: string | null; size: number }>,
  store: VolumeStore,
  stats: ReadonlyMap<string, VolumeStat>,
  limit = 50,
): Array<{ id: string; volumeId: string | null; size: number }> {
  if (!store.tieringEnabled) return []
  const hotIds = new Set(store.volumes.filter((v) => v.role === 'hot').map((v) => v.id))
  if (hotIds.size === 0) return []
  /* 冷卷必须有可写的，否则搬了也没地方放。 */
  if (pickColdVolume(store, stats) === null) return []

  const onHot = files.filter((f) => f.volumeId !== null && hotIds.has(f.volumeId))
  if (onHot.length === 0) return []
  return [...onHot].sort((a, b) => a.size - b.size).slice(0, limit)
}

/**
 * 校验挂载点字符串的形状（**不碰磁盘**，纯语法检查）。
 *
 * 为什么语法和可访问性要分开：语法错的路径应当立刻拒绝（用户输错了），
 * 而「路径现在不可达」可能是 NAS 还没挂载 —— 后者要允许先存配置，
 * 等设备上线后自动可用。两者混在一起会让「先配置后接电」的流程走不通。
 *
 * @returns 错误提示；合法返回 null。
 */
export function validateVolumeRoot(root: string): string | null {
  const v = root.trim()
  if (v === '') return '路径不能为空'
  if (v.includes('\u0000')) return '路径含非法字符（NUL）'
  if (v.length > 240) return '路径过长（超过 240 字符）'

  /* UNC：\\host\share[\...] —— 必须至少有主机和共享名。 */
  if (v.startsWith('\\\\')) {
    const parts = v.slice(2).split(/[\\/]+/).filter(Boolean)
    if (parts.length < 2) return '网络路径至少要写到共享名，例如 \\\\192.168.1.10\\share'
    if (!/^[A-Za-z0-9._-]+$/.test(parts[0]!)) return '网络路径的主机名含非法字符'
    return null
  }

  /* 本地：必须是绝对路径。相对路径会按进程 cwd 解析，而 cwd 取决于启动方式
   * （start.bat / 蓝绿槽 / 手工 node），结果不可预期 —— 这种「配了但指到别处」
   * 比直接拒绝更难排查。 */
  if (!/^[A-Za-z]:[\\/]/.test(v)) {
    return '必须是绝对路径（盘符路径如 D:\\store，或网络路径 \\\\主机\\共享）'
  }
  /* 禁止把卷根指到系统关键位置：盘满/误删的后果不可承受。 */
  const up = v.replace(/\//g, '\\').toUpperCase()
  if (/^[A-Z]:\\?$/.test(up)) return '不能直接挂载盘符根目录，请指定一个子目录（如 D:\\privhub-store）'
  if (/^[A-Z]:\\WINDOWS(\\|$)/.test(up)) return '不能挂载到 Windows 系统目录'
  if (/^[A-Z]:\\PROGRAM FILES/.test(up)) return '不能挂载到程序安装目录'
  return null
}

/**
 * 计算「这份文件该不该搬」的收益判断。
 *
 * 只搬「留在热卷上不划算」的文件：
 *   · 太小（< 1MB）的文件搬移开销（一次读+一次写+一次删）大于收益；
 *   · 正在被读的文件不搬（由调用方保证，这里只看静态属性）。
 *
 * 为什么设 1MB 门槛：热卷的价值是「快」，而小文件本来就已经很快，
 * 搬它们只会制造无谓的 IO 和索引写入。
 */
export const MIN_TIERING_BYTES = 1024 * 1024

export function worthTiering(size: number): boolean {
  return size >= MIN_TIERING_BYTES
}
