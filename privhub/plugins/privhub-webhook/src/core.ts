/**
 * privhub-webhook · core —— 纯逻辑层：事件目录、订阅模型、HMAC 签名、载荷裁剪、
 * 投递结果分类与日志环形缓冲。
 *
 * 本文件**不做任何 IO、不认识 HTTP、不碰 ctx**：投递（fetch）、存储（ctx.storage）、
 * 路由都在 `index.ts`。这样拆的理由与 refcheck/dashboard 的 core.ts 一致 ——
 * 「签名算得对不对」「载荷裁得对不对」「什么状态码该重试」是能被单测和复用的判定，
 * 而它们一旦混进路由回调就只能靠起服务来验。
 *
 * ## 为什么必须裁剪载荷
 *
 * `file:saved` 的载荷里带**整篇文档正文**（`doc`，见 privhub-core/events.ts）——
 * 一篇笔记可以有几 MB。把这它原样 POST 给订阅方有三个后果：
 *   ① 接收端多半只是想知道「哪个文件被保存了」，塞全文既慢又没用；
 *   ② 一次保存就把订阅方的磁盘/带宽吃掉，等于给生产环境埋了个放大攻击面；
 *   ③ 投递日志会把正文留一份在 `data/webhook-log.json` 里，正文的加密边界被打散。
 * 所以 `file:saved` 的投递载荷只带 `docBytes` + `docPreview`（前若干字符），
 * 需要全文的订阅方拿 `project`+`path` 去读文件接口 —— 那才是鉴权正确的路。
 *
 * ## 为什么「投递失败」要比「投递成功」多一层判定
 *
 * 一个只会 `if (!res.ok) 重试` 的实现，会在对端回 404/400（地址写错、路径变更）
 * 时把同一个必然失败的请求重试满次数 —— 既救不回来，又给对端加了三倍负载。
 * {@link classifyStatus} 因此把失败分成两类：**可重试**（网络不通 / 408 / 429 /
 * 5xx，通常是暂时状况）与**终态失败**（其余 4xx，重试无意义）。
 *
 * @module privhub-webhook/core
 */

import { createHmac, randomBytes } from 'node:crypto'

/* ---------- 事件目录（可订阅的清单 = 全仓实际 emit 的事件） ---------- */

export interface EventSpec {
  name: string
  desc: string
}

/**
 * 可订阅事件清单。
 *
 * 这份表必须与「全仓实际 emit 的事件」一一对应：漏一个 = 该事件永远投不出去
 * （而且没有任何报错，只是收不到）。`tests/webhook.mjs` 的「全事件目录」用例
 * 会核对它与 `privhub-svc-events` 注册表快照一致，改一边不改另一边会红。
 */
export const EVENTS: EventSpec[] = [
  { name: 'file:changed', desc: '文件系统变更（上传/删除/重命名/移动/恢复/清空）' },
  { name: 'file:saved', desc: '文本文件保存成功（为避免放大，正文只带摘要与首段预览）' },
  { name: 'meta:changed', desc: '文件/目录标签变更' },
  { name: 'personal:renamed', desc: '用户改名（个人空间目录随之迁移）' },
  { name: 'audit:logged', desc: '审计流水（各类写操作落盘后广播）；载荷无项目字段，设了项目过滤的订阅收不到' },
  { name: 'task:changed', desc: '任务看板变更（卡片增删改、拖拽、列操作）' },
  { name: 'dashboard:changed', desc: '项目看板（纵向分区页）变更' },
]

/** 事件名集合（校验订阅的 events 字段用）。 */
export const EVENT_NAMES: ReadonlySet<string> = new Set(EVENTS.map((e) => e.name))

/** 本插件自己发的测试投递事件（不在可订阅清单里：它只发给被点的那个订阅）。 */
export const PING_EVENT = 'ping'

/* ---------- 规模闸门 · 上限（沿用 W-C 口径：只保护「别炸」，截断必明说） ---------- */

export const LIMITS = {
  /** 订阅数上限。 */
  maxHooks: 50,
  /** 单次投递正文上限（超限降级为极简信封并标记 truncated）。 */
  maxPayloadBytes: 32 * 1024,
  /** file:saved 保留的正文预览字符数。 */
  docPreviewChars: 500,
  /** 投递日志保留条数（环形，新的在前）。 */
  logMax: 300,
  /** 单个订阅的待投递积压上限（超了丢弃并计数，不无界排队）。 */
  backlogMax: 50,
  /** 单次尝试超时。 */
  timeoutMs: 8000,
  /** 总尝试次数（1 次首发 + 其余为重试）。 */
  attempts: 3,
  /** 两次尝试之间的等待（毫秒），不足则取最后一项。 */
  backoffMs: [500, 1500],
  /** 地址与名称长度上限。 */
  urlMax: 2000,
  nameMax: 60,
  /** 自定义签名密钥的最短长度。 */
  minSecretLen: 8,
}

/* ---------- 订阅模型 ---------- */

export interface Hook {
  id: string
  name: string
  url: string
  /** HMAC-SHA256 签名密钥。**永不出现在任何响应里**（只在生成/轮换那一次回显）。 */
  secret: string
  /** 订阅的事件名；空数组 = 全部事件。 */
  events: string[]
  /** 只投该项目的载荷；空串 = 不限项目。 */
  project: string
  enabled: boolean
  createdAt: number
  createdBy: string
  /** 最近一次投递结果（供列表一眼看出「这个订阅还活着吗」）。 */
  lastAt: number
  lastStatus: '' | 'ok' | 'fail'
  lastError: string
  delivered: number
  failed: number
}

/** 出网的订阅视图：**剥掉 secret**，只留「有没有配」的布尔。 */
export interface HookView {
  id: string
  name: string
  url: string
  hasSecret: boolean
  events: string[]
  project: string
  enabled: boolean
  createdAt: number
  createdBy: string
  lastAt: number
  lastStatus: string
  lastError: string
  delivered: number
  failed: number
}

export interface DeliveryRecord {
  id: string
  hookId: string
  event: string
  /** 首次尝试时刻（epoch 毫秒）。 */
  at: number
  url: string
  ok: boolean
  /** HTTP 状态码；连不上时为 null。 */
  httpStatus: number | null
  /** 从首次尝试到出结果的总耗时。 */
  ms: number
  /** 实际发起的尝试次数（>1 说明重试过）。 */
  attempts: number
  error: string
  /** 实际发出的正文（重放按原样重发；超限降级后仍然记录降级后的正文）。 */
  body: string
  bodyBytes: number
  /** 由哪条记录重放而来（人工重放才带）。 */
  replayOf?: string
}

export function newId(prefix: string): string {
  return prefix + Date.now().toString(36) + randomBytes(3).toString('hex')
}

/* ---------- 签名 ---------- */

/** 生成签名密钥（24 字节随机 → 48 位十六进制）。 */
export function genSecret(): string {
  return randomBytes(24).toString('hex')
}

/**
 * 计算签名头。
 *
 * 口径：`sha256=<hex(HMAC-SHA256(secret, rawBody))>`，与 GitHub / Stripe 的
 * `X-Hub-Signature-256` / `Stripe-Signature` 同构（不带时间戳参与签名——本实现
 * 不提供防重放窗口，重放由订阅方按 `x-privhub-delivery` 幂等处理）。
 *
 * **必须对「实际发出的那串字节」签名**（而不是对对象重新 `JSON.stringify` 一次）：
 * 两次序列化只要有一个空格差异，订阅方验签就会失败，且失败原因极难排查。
 */
export function sign(secret: string, body: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(body, 'utf8').digest('hex')
}

/* ---------- 载荷 ---------- */

/** 从事件载荷里取项目名（取不到返回空串 —— 只有不设项目过滤的订阅会收到）。 */
export function projectOf(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const p = (data as { project?: unknown }).project
  return typeof p === 'string' ? p : ''
}

/**
 * 裁剪载荷。
 *
 * 目前只动 `file:saved`：把 `doc` 换成 `docBytes` + `docPreview` + `docTruncated`。
 * 其余事件原样透传（task/dashboard 的载荷本就很轻）。
 *
 * **必须幂等**：本函数在两处被调用 —— 入队时（尽早释放正文内存）与构造正文时
 * （信封大小守卫的入口）。若第二次调用把已经裁过的载荷再裁一次，它会看不到 `doc`
 * 而把 `docBytes` 覆写成 0、`docPreview` 覆写成空串 —— 订阅方拿到一份「字节数为 0」
 * 的假摘要。所以「没有 `doc` 字符串」时直接原样返回。
 */
export function trimPayload(event: string, data: unknown): unknown {
  if (!data || typeof data !== 'object') return data
  if (event !== 'file:saved') return data
  const o = data as Record<string, unknown>
  if (typeof o.doc !== 'string') return data
  const { doc, ...rest } = o
  return {
    ...rest,
    docBytes: Buffer.byteLength(doc, 'utf8'),
    docPreview: doc.slice(0, LIMITS.docPreviewChars),
    docTruncated: doc.length > LIMITS.docPreviewChars,
  }
}

/** 投递信封。 */
export interface Envelope {
  /** 本次投递 id（同一事件的每个订阅各一个，订阅方可据此幂等）。 */
  id: string
  event: string
  at: number
  data: unknown
  /** 载荷超限被降级时为 true。 */
  truncated?: boolean
}

/**
 * 构造投递正文（含超限降级）。
 *
 * 返回的 `body` 就是**将要发出的那串字节**，也是签名对象与日志留存对象 ——
 * 三者必须是同一份，否则验签对不上、重放发出去的也和日志里记的不一样。
 */
export function buildBody(input: Omit<Envelope, 'truncated'>): { body: string; truncated: boolean } {
  let truncated = false
  let envelope: Envelope = { ...input, data: trimPayload(input.event, input.data) }
  let body = JSON.stringify(envelope)
  if (Buffer.byteLength(body, 'utf8') > LIMITS.maxPayloadBytes) {
    truncated = true
    envelope = {
      id: input.id,
      event: input.event,
      at: input.at,
      truncated: true,
      data: { note: '载荷超过上限已省略，请用 x-privhub-event 判断事件类型后到接口取详情' },
    }
    body = JSON.stringify(envelope)
  }
  return { body, truncated }
}

/* ---------- 订阅匹配与结果分类 ---------- */

/**
 * 该订阅是否应收这条事件。
 *
 * `events` 为空数组视为「全部事件」（界面上的默认值），非空则必须命中；
 * `project` 非空时要求载荷里的项目名与之相等。
 */
export function hookMatches(hook: Pick<Hook, 'enabled' | 'events' | 'project'>, event: string, project: string): boolean {
  if (!hook.enabled) return false
  if (Array.isArray(hook.events) && hook.events.length > 0 && !hook.events.includes(event)) return false
  if (hook.project && hook.project !== project) return false
  return true
}

/** 投递结果分类：`ok` 收工；`retry` 值得再试；`fail` 重试也无意义。 */
export type Verdict = 'ok' | 'retry' | 'fail'

/** 0 = 没能连上（网络层错误），与 5xx 同类：换一次很可能就好了。 */
export function classifyStatus(status: number): Verdict {
  if (status >= 200 && status < 300) return 'ok'
  if (status === 0) return 'retry'
  if (status === 408 || status === 429) return 'retry'
  if (status >= 500) return 'retry'
  return 'fail'
}

/* ---------- 日志环形缓冲 ---------- */

/** 追加一条记录到环形日志（新的在前，超出上限从头截断）。就地修改传入数组。 */
export function pushLog(log: DeliveryRecord[], rec: DeliveryRecord): DeliveryRecord[] {
  log.unshift(rec)
  if (log.length > LIMITS.logMax) log.length = LIMITS.logMax
  return log
}

/** 求某订阅最近一次结果的摘要（列表/侧栏用；没有记录时返回空）。 */
export function lastOf(log: DeliveryRecord[], hookId: string): DeliveryRecord | null {
  for (const r of log) if (r.hookId === hookId) return r
  return null
}

/* ---------- 校验 ---------- */

export type Cleaned<T> = { ok: true; value: T } | { ok: false; error: string }

/** Webhook 地址：只接受 http(s) 绝对地址（LAN 内部署，不限私网/公网）。 */
export function cleanUrl(input: unknown): Cleaned<string> {
  const url = String(input ?? '').trim().slice(0, LIMITS.urlMax)
  if (!url) return { ok: false, error: '订阅地址不能为空' }
  if (!/^https?:\/\//i.test(url)) return { ok: false, error: '订阅地址必须以 http:// 或 https:// 开头' }
  try {
    const u = new URL(url)
    if (!u.hostname) return { ok: false, error: '订阅地址缺少主机名' }
  } catch {
    return { ok: false, error: '订阅地址不是合法的 URL' }
  }
  return { ok: true, value: url }
}

/** 事件名清单：未知名字直接丢掉（不报错，避免订阅方因某个事件被下线就打不上钩子）。 */
export function cleanEvents(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const out: string[] = []
  for (const x of input) {
    const s = String(x ?? '').trim()
    if (EVENT_NAMES.has(s) && !out.includes(s)) out.push(s)
  }
  return out
}

/** 名称：留空则用地址主机名兜底（列表里总得有个可辨认的标签）。 */
export function cleanName(input: unknown, url: string): string {
  const name = String(input ?? '').trim().slice(0, LIMITS.nameMax)
  if (name) return name
  try { return new URL(url).hostname.slice(0, LIMITS.nameMax) } catch { return '未命名订阅' }
}

/** 自定义密钥：留空 = 交给服务端生成；给了就要求足够长。 */
export function cleanSecret(input: unknown): Cleaned<string | null> {
  const s = String(input ?? '').trim()
  if (!s) return { ok: true, value: null }
  if (s.length < LIMITS.minSecretLen) {
    return { ok: false, error: `签名密钥至少 ${LIMITS.minSecretLen} 个字符（留空则由系统生成）` }
  }
  return { ok: true, value: s.slice(0, 256) }
}

/** 剥掉 secret 的出网视图。 */
export function toView(hook: Hook): HookView {
  return {
    id: hook.id,
    name: hook.name,
    url: hook.url,
    hasSecret: !!hook.secret,
    events: Array.isArray(hook.events) ? [...hook.events] : [],
    project: hook.project || '',
    enabled: !!hook.enabled,
    createdAt: Number(hook.createdAt) || 0,
    createdBy: String(hook.createdBy || ''),
    lastAt: Number(hook.lastAt) || 0,
    lastStatus: String(hook.lastStatus || ''),
    lastError: String(hook.lastError || ''),
    delivered: Number(hook.delivered) || 0,
    failed: Number(hook.failed) || 0,
  }
}

/** 新订阅的默认值（把散落在各处的字段默认值收在一处）。 */
export function blankHook(partial: Partial<Hook> = {}): Hook {
  return {
    id: '', name: '', url: '', secret: '', events: [], project: '', enabled: true,
    createdAt: 0, createdBy: '', lastAt: 0, lastStatus: '', lastError: '', delivered: 0, failed: 0,
    ...partial,
  }
}
