/**
 * privhub-svc-cap · core —— 功能能力表（纯逻辑，无 IO / 不认识 ctx）。
 *
 * ## 它解决什么
 *
 * 全仓此前把「这个功能给不给普通用户用」写成了 **34 处散落的 `u.role !== 'admin'`**
 * （见 `docs/PrivHub-功能权限开关-2026-10-13.md` 的清单）。想给某个功能对普通用户
 * 开或关，得去改代码。本模块把这件事收成**一张表**：
 *
 *     功能（feature） × 普通用户级别（none / read / write）
 *
 * **管理员恒为 write**（用户口径：「系统内部功能对管理员全部开放」），所以表里
 * 只存普通用户那一列 —— 要调就是调这一列，单点、可逆。
 *
 * ## 默认值必须「保持现状」
 *
 * {@link FEATURES} 里每个功能的 `userDefault` **不是随手定的**，它必须等于「本表
 * 落地之前，普通用户对该功能的实际能力」：
 *   · 此前**管理员专属**的功能 → `'none'`（普通用户本来就进不去）；
 *   · 此前**所有登录用户都能用**的功能 → `'read'` 或 `'write'`（按现状）。
 * 这样开关表上线**本身不改变任何行为**，之后每一次翻转都是用户显式的决定。
 * 「改默认值」与「用户翻转开关」是两件事，不要混。
 *
 * 唯一的例外是**开关表上线之后**新增的用户侧功能：那时没有"上线前行为"可对齐，
 * 按用户口径（「用户理论上能全开放、但要留开关」）默认给 `read`，管理员恒为 `write`；
 * 危险的写能力仍默认 `none`。每个这类功能都要在下方注释里点明它是新增的。
 *
 * @module privhub-svc-cap/core
 */

/** 功能对某个角色的级别。`none` 无权限；`read` 只读；`write` 可读可写。 */
export type Level = 'none' | 'read' | 'write'

/** 级别偏序：none < read < write。 */
export const RANK: Record<Level, number> = { none: 0, read: 1, write: 2 }

/** 合法级别清单（供校验/界面下拉）。 */
export const LEVELS: readonly Level[] = ['none', 'read', 'write']

/** 中文标签（界面与文档共用一处，避免两处漂移）。 */
export const LEVEL_LABEL: Record<Level, string> = { none: '不可用', read: '只读', write: '可读写' }

export interface FeatureSpec {
  /** 稳定 id：`<域>.<名>`，如 `admin.users`。**发布后不可改**（表以 id 为键）。 */
  id: string
  /** 分组（界面按组折叠）。 */
  group: string
  /** 中文标题。 */
  title: string
  /** 一句话说明（界面悬停/副标题）。 */
  desc: string
  /** 普通用户默认级别。**必须等于上线前的实际行为**（见模块头注释）。 */
  userDefault: Level
}

/**
 * 功能清单。
 *
 * 增删功能 = 改这张表（新功能一律登记进来；已下线功能留在表里把默认值改成 `'none'`
 * 更安全，直接删只影响「表里已有该 id 的旧配置」——会被 {@link normalizeTable} 丢掉）。
 */
export const FEATURES: readonly FeatureSpec[] = [
  /* ---- 管理（管理控制台各页） ---- */
  { id: 'admin.console', group: '管理', title: '管理控制台', desc: '管理控制台入口与其中各管理页', userDefault: 'none' },
  { id: 'admin.users', group: '管理', title: '用户管理', desc: '新建/编辑/删除用户、重置密码', userDefault: 'none' },
  { id: 'admin.project.create', group: '管理', title: '新建项目', desc: '创建新的顶层项目目录', userDefault: 'none' },
  { id: 'admin.project.delete', group: '管理', title: '删除项目', desc: '删除整个项目及其内容', userDefault: 'none' },
  { id: 'admin.invite', group: '管理', title: '邀请码', desc: '生成 / 查看 / 撤销邀请码', userDefault: 'none' },
  { id: 'admin.template', group: '管理', title: '模板管理', desc: '新建 / 编辑 / 删除文件模板（读取模板对所有人开放）', userDefault: 'none' },
  { id: 'admin.trash.clean', group: '管理', title: '清空回收站', desc: '彻底清空回收站（不可恢复）', userDefault: 'none' },
  { id: 'admin.lock', group: '管理', title: '锁管理', desc: '强制解锁他人占用、查看锁统计', userDefault: 'none' },
  { id: 'admin.settings', group: '管理', title: '系统设置', desc: '全局设置：读取对所有人开放，写入管理员专属', userDefault: 'read' },

  /* ---- 安全 ---- */
  { id: 'admin.audit', group: '安全', title: '审计日志', desc: '查看 / 导出操作流水', userDefault: 'none' },
  { id: 'admin.acl', group: '安全', title: '权限规则', desc: '文件 / 目录级访问控制规则', userDefault: 'none' },
  { id: 'admin.storage', group: '安全', title: '存储维护', desc: '明文数据清单与加密迁移', userDefault: 'none' },

  /* ---- 集成 ---- */
  { id: 'admin.webhook', group: '集成', title: 'Webhook 订阅', desc: '事件订阅、投递日志与重放', userDefault: 'none' },
  { id: 'admin.rag', group: '集成', title: 'RAG 与模型治理', desc: '语料摄取 / 策展 / 向量化、模型配置与自检', userDefault: 'none' },
  { id: 'admin.agent.keys', group: '集成', title: '智能体密钥', desc: '签发 / 吊销 / 轮换 pha_ 密钥', userDefault: 'none' },
  { id: 'admin.agent.trash', group: '集成', title: '智能体回收站', desc: '查看 / 恢复 / 清空智能体删除项', userDefault: 'none' },
  { id: 'admin.office.ai', group: '集成', title: 'Office AI 密钥', desc: 'Office 写作助手的模型密钥', userDefault: 'none' },

  /* ---- 协作（普通用户日常功能） ---- */
  { id: 'task.write', group: '协作', title: '任务看板写入', desc: '建卡 / 改卡 / 拖拽 / 列操作（只读则仅可查看）', userDefault: 'write' },
  { id: 'dashboard.write', group: '协作', title: '项目看板写入', desc: '编辑项目看板（分区/组件）布局', userDefault: 'write' },

  /* ---- AI（模型能力，管理员恒可，普通用户默认关） ---- */
  { id: 'ai.params', group: 'AI', title: '模型参数自定义', desc: '问答时可自调 temperature / max_tokens 等生成参数（关闭则一律用管理员配置）', userDefault: 'none' },

  /* ---- 查重（Q6/Q7；新功能，用户侧默认按"能用"给、需要时关） ---- */
  { id: 'dup.prompt', group: '查重', title: '上传期重复提示', desc: '上传文件时，若与项目内已有文件内容相同/高度相似，提示"内容重复"（只提示，不阻止、不改写）', userDefault: 'read' },
  { id: 'dup.near.delete', group: '查重', title: '近似/版本族可勾选删除', desc: '在项目查重页，允许勾选「近似 / 版本族」里的文件参与删除（默认不勾、只作提示）', userDefault: 'none' },

  /* ---- 管家（宿主机智能体管家车道；2026-10-13 新增，方案见
   *      docs/PrivHub-宿主机智能体管家-MCP-方案-2026-10-13.md） ----
   * 这一组【不是】给普通用户的功能，而是「管家车道」自己的开关：
   * 由宿主机上的智能体持【专用钥匙】（type=butler、仅本机回环 IP、可单独吊销）调用。
   * 车道内部用一个 role≠admin 的伪身份去问 ctx.cap，所以把这些值改成 'none'
   * 就等于关掉那一项 —— 这正是「我要关的时候能关上」。
   * 默认全 'write'：车道的真正闸门是【钥匙本身】（须管理员显式签发、仅本机、可吊销），
   * 没有钥匙什么也做不了；开关是给"关"用的，不是给"开"用的。 */
  { id: 'agent.butler', group: '管家', title: '管家车道总开关', desc: '宿主机智能体管家车道的总闸；关掉则整条车道 403（与普通用户无关）', userDefault: 'write' },
  { id: 'agent.butler.files', group: '管家', title: '管家·内容整理', desc: '管家读写 / 移动 / 重命名 / 删除项目内文件', userDefault: 'write' },
  { id: 'agent.butler.users', group: '管家', title: '管家·用户管理', desc: '管家新建 / 编辑 / 删除用户、重置密码', userDefault: 'write' },
  { id: 'agent.butler.projects', group: '管家', title: '管家·项目管理', desc: '管家新建 / 删除项目', userDefault: 'write' },
  { id: 'agent.butler.switches', group: '管家', title: '管家·开关管理', desc: '管家读写功能权限开关表（含管家自身各项）', userDefault: 'write' },
  { id: 'agent.butler.keys', group: '管家', title: '管家·密钥管理', desc: '管家签发 / 吊销智能体密钥', userDefault: 'write' },
  { id: 'agent.butler.audit', group: '管家', title: '管家·审计', desc: '管家查询 / 导出审计日志', userDefault: 'write' },
  { id: 'agent.butler.model', group: '管家', title: '管家·模型检索', desc: '管家配置模型端点、触发向量化 / 重建索引', userDefault: 'write' },
  { id: 'agent.butler.service', group: '管家', title: '管家·服务运维', desc: '管家看服务状态 / 日志、跑备份、重启服务', userDefault: 'write' },
]

/** 功能 id → 规格。 */
export const FEATURE_BY_ID: ReadonlyMap<string, FeatureSpec> = new Map(FEATURES.map((f) => [f.id, f]))

export function isLevel(x: unknown): x is Level {
  return x === 'none' || x === 'read' || x === 'write'
}

/** 该 id 是否为已登记功能。 */
export function isFeature(id: unknown): boolean {
  return typeof id === 'string' && FEATURE_BY_ID.has(id)
}

/** 默认表（功能 → 普通用户默认级别）。 */
export function defaultTable(): Record<string, Level> {
  const out: Record<string, Level> = {}
  for (const f of FEATURES) out[f.id] = f.userDefault
  return out
}

/**
 * 清洗一份外部传入的表：**只保留已登记功能 + 合法级别**，其余静默丢弃。
 *
 * 保留未登记 id 会让「功能下线后旧配置复活」变得可能；丢弃未登记的则天然向前收敛。
 * 缺失的功能在上层用 {@link userLevelOf} 的默认值补齐，所以这里不必补全。
 */
export function normalizeTable(input: unknown): Record<string, Level> {
  const out: Record<string, Level> = {}
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (FEATURE_BY_ID.has(k) && isLevel(v)) out[k] = v
  }
  return out
}

export interface Actor {
  username: string
  role: string
}

/**
 * 求某角色对某功能的**有效级别**。
 *
 * 管理员恒为 `write`（用户口径：对管理员全部开放）—— 表里那一列只影响非管理员。
 * 未在表里（含被 {@link normalizeTable} 丢弃的未知 id）的功能退回其 `userDefault`；
 * 连功能都没登记时一律 `'none'`（**未知功能默认关闭**，比默认打开安全）。
 */
export function levelFor(actor: Actor | null | undefined, feature: string, table: Record<string, Level>): Level {
  if (actor && actor.role === 'admin') return 'write'
  if (table[feature] !== undefined) return table[feature]
  const spec = FEATURE_BY_ID.get(feature)
  return spec ? spec.userDefault : 'none'
}

/** 级别是否满足所需（`need` 默认为 `read`）。 */
export function allows(level: Level, need: Level = 'read'): boolean {
  return RANK[level] >= RANK[need]
}
