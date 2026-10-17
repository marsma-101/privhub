/**
 * privhub-svc-model — 模型接入层（M0，L2 能力 Service）
 *
 * 不选型、不绑定方向：只认 OpenAI 兼容协议（Ollama / vLLM / LM Studio / DSH 网关等）。
 * 运维在 RAG 界面（或 /api/model/config）填写 baseURL + apiKey(可选) + 模型名即可生效。
 *
 * 能力：
 *   - embed(texts)：批量向量化（≤32/批，串行重试），返回 number[][]
 *   - chat({messages, stream, onChunk, params})：非流式返回全文；流式经 onChunk 输出；
 *     `params` 为**本次调用**的生成参数覆盖（Q2），与当前 profile 的默认参数叠加
 *   - check(ctx, force, deep)：端点半健康检查（GET {base}/v1/models），状态 ok/unconfigured/
 *     unreachable/timeout/auth-error/model-missing；`deep=true` 时额外真调一次 embedding，
 *     回 `dims` / `latencyMs`（失败则 embed-error）——见 deepCheckEmbedding
 *   - mock：baseURL 填 'mock' 时离线可用——embedding 返回种子伪向量（64 维），
 *     chat 返回回显文本；用于无模型环境下的开发与测试
 *   - 多 Profile（Q1 §1.2）：`{ profiles, activeId, maxRetries }` 多套配置切换；
 *     **读取时兼容旧的扁平结构**（旧文件当单 profile 迁移，无需手工转换）
 *
 * 红线：不内置任何厂商 SDK；无云端回退；apiKey 存 storage（S7 加密），不进日志/审计。
 * 配置：data/model.json（S7 加密），admin 经 API 写入，重启不丢。
 *
 * @module privhub-svc-model
 */

import { createHash, randomBytes } from 'node:crypto'
import { join } from 'node:path'
import { Service } from '@deepseek-ai/cordis'
import type { Context } from '@deepseek-ai/cordis'
/* 只取叶子模块（不牵进 core 的整张模块图）：读取系统 JSON 的统一入口（D4）。 */
import { readJsonStore, assertStoreWritable } from '../../privhub-core/src/json-store'

export interface ModelEndpoint {
  baseURL: string      // http(s)://host:port 或 'mock'
  apiKey?: string
  model: string
  timeoutMs: number
}
export interface ModelConfig {
  llm: ModelEndpoint
  embedding: ModelEndpoint
  maxRetries: number
}
export type ModelHealth =
  | { status: 'unconfigured' }
  /** `dims` / `latencyMs` 只有**深度自检**（check(…, deep=true)）才会带上，见 deepCheckEmbedding */
  | { status: 'ok'; models: string[]; dims?: number; latencyMs?: number }
  | { status: 'unreachable'; error: string }
  | { status: 'timeout' }
  | { status: 'auth-error' }
  | { status: 'model-missing'; models: string[] }
  /** 端点活着、`/v1/models` 也答了，但**真的调一次 embedding 失败**（模型名不是向量模型、
   *  上游不支持该接口…）。与 unreachable 分开：处置方式完全不同（改模型名 vs 改地址）。 */
  | { status: 'embed-error'; error: string }

export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }

export class ModelError extends Error {
  constructor(
    public code: 'MODEL_TIMEOUT' | 'MODEL_AUTH' | 'MODEL_NOT_FOUND' | 'MODEL_UNREACHABLE' | 'MODEL_BAD_RESPONSE' | 'MODEL_RATE_LIMIT',
    message: string,
  ) {
    super(message)
  }
}

/* ---------- 上游回包解析与脱敏（纯函数，可单测） ----------
 *
 * 这组函数的产出会**直接进用户可见的错误文案**（/api/rag/ask 的 catch 把 e.message
 * 原样回给前端，前端 toast 出来）。所以两条硬规则：
 *   1. 脱敏：上游回包里出现 `sk-…` / `Bearer …` / `api_key:` 一律打码 —— 上游常把
 *      收到的请求头回显在 error 里，照抄等于把密钥显示在界面上。
 *   2. 不 dump 整个 JSON：裸 JSON 对用户零信息量，还可能是几百字噪声。
 *      改为「可读的原因 + 响应形状摘要」——形状摘要足够定位「端点不是 OpenAI 兼容」。 */

/** 上游错误文案脱敏 + 截断（`sk-…` / `Bearer …` / `api_key: …` 均打码）。 */
export function sanitizeError(input: string, max = 300): string {
  return String(input)
    .replace(/\b(sk-[A-Za-z0-9_-]{4})[A-Za-z0-9_-]+/g, '$1***')
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi, '$1***')
    .replace(/((?:api[_-]?key|api[_-]?token|authorization)["'\s:=]+)[A-Za-z0-9._~+/=-]{8,}/gi, '$1***')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

/**
 * 从上游回包里取「可读原因」：`error.message` / `error` / `message` / `detail`。
 * 取不到结构化原因时回退到原文（截断），再取不到就回空串。
 */
export function upstreamMessage(body: unknown, rawText = ''): string {
  const pick = (v: unknown): string => {
    if (typeof v === 'string') return v
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>
      for (const k of ['message', 'msg', 'detail', 'reason', 'type', 'code']) {
        if (typeof o[k] === 'string' && o[k]) return o[k] as string
      }
      if (typeof o.error === 'string') return o.error
    }
    return ''
  }
  if (body && typeof body === 'object') {
    const o = body as Record<string, unknown>
    for (const k of ['error', 'errors', 'detail']) {
      const m = pick(o[k])
      if (m) return sanitizeError(m)
    }
    const m = pick(o)
    if (m) return sanitizeError(m)
  }
  return rawText ? sanitizeError(rawText, 160) : ''
}

/**
 * 从 chat 回包里按「多种 OpenAI 兼容形状」抽取正文。
 *
 * 为什么不能只认 `choices[0].message.content`：各家兼容网关的实现差异很大 ——
 * legacy completions 形状给 `choices[0].text`，Responses 风格给 `output_text` /
 * `output.text`，Gemini 的兼容层给 `candidates[0].content.parts[].text`。
 * 只认一种会让「换了上游就整个 RAG 问答不可用」，而代码本身没做错什么。
 *
 * `reasoning` 单独回传：推理模型（DeepSeek-R1 / QwQ 一类）会把思考过程放在
 * `reasoning_content`，有时 `content` 是空的。**思考内容不当作答案**，
 * 但必须能与「上游什么都没给」区分开，否则用户只会看到一句无信息量的报错。
 */
export function extractChatText(body: unknown): { text: string; reasoning: string } {
  const none = { text: '', reasoning: '' }
  if (!body || typeof body !== 'object') return none
  const o = body as Record<string, any>

  const asParts = (v: unknown): string => {
    if (typeof v === 'string') return v
    if (Array.isArray(v)) {
      return v.map((p) => (typeof p === 'string' ? p : (typeof (p as any)?.text === 'string' ? (p as any).text : ''))).join('')
    }
    if (v && typeof v === 'object' && typeof (v as any).text === 'string') return (v as any).text
    return ''
  }

  const first = Array.isArray(o.choices) ? o.choices[0] : undefined
  const reasoning = String(first?.message?.reasoning_content ?? first?.delta?.reasoning_content ?? o.reasoning_content ?? '')

  let text = ''
  if (first) {
    text = asParts(first.message?.content)          // 标准形状
      || asParts(first.message?.parts)             // 部分网关
      || (typeof first.text === 'string' ? first.text : '')            // legacy completions
      || asParts(first.delta?.content)             // 已聚合的流式帧
      || asParts(first.content)                    // 部分网关把 content 放在 choice 上
  }
  if (!text) {
    text = asParts(o.output_text)                  // Responses 风格
      || asParts(o.output?.text)
      || asParts(o.output?.content)
      || asParts(o.response)
      || (typeof o.content === 'string' ? o.content : '')
      || (typeof o.text === 'string' ? o.text : '')
      || asParts(o.candidates?.[0]?.content?.parts)  // Gemini 兼容层
      || asParts(o.candidates?.[0]?.content)
  }
  return { text, reasoning }
}

/**
 * 「响应形状」摘要：只列出现过的键与容器长度，60 字以内。
 * 目的是让人一眼看出「这端点不是 chat/completions 形状」，而不是把整个 JSON 甩给用户。
 */
/**
 * 端点地址，用于报错里说清「连不上的是哪个地址」。
 *
 * 地址本身不是密钥（是管理员自己填的），但**地址里可能夹着凭据**，两处都要剥：
 *   - userinfo：`http://user:pass@host` —— 报错原文会把它显示到界面上；
 *   - 查询串：`http://host/v1?api_key=…` —— Gemini 一类网关把凭据放 query，
 *     照抄同样等于把密钥贴到 toast 里（2026-10-11 补，见 W-B/§1.5）。
 * 剥法是「整段 query 换成 `?…`」而不是打码：报错要保留的是主机与端口（定位用），
 * query 里没有任何有助于定位的信息。
 */
export function endpointLabel(baseURL: string): string {
  return String(baseURL ?? '')
    .replace(/\/+$/, '')
    .replace(/\/\/[^/@]*@/, '//')
    .replace(/\?[^#]*/, '?…')
}

export function describeShape(body: unknown): string {
  if (body === null || body === undefined) return '空响应体'
  if (typeof body !== 'object') return typeof body
  const o = body as Record<string, any>
  const parts: string[] = []
  for (const k of Object.keys(o).slice(0, 6)) {
    const v = o[k]
    if (Array.isArray(v)) parts.push(`${k}[${v.length}]`)
    else if (v && typeof v === 'object') parts.push(`${k}{${Object.keys(v).slice(0, 3).join(',')}}`)
    else parts.push(k)
  }
  return parts.join(' ') || '（无键）'
}

/* ---------- 模型生成参数（Q2）：knobs 全做出来，谁可改由 `ai.params` 开关决定 ---------- */

/**
 * 可调生成参数（OpenAI 兼容命名）。全部可选；不填 = 上游默认。
 *
 * 这是「功能要全」的那一半：参数一个不少地做出来。至于**谁能改**，由功能开关
 * `ai.params` 决定（管理员恒可；普通用户默认不可）—— 服务层只负责把「被允许改的那份」
 * 映射进请求体，不越界替调用方做权限判断。
 */
export interface ModelParams {
  /** 采样温度 0–2；越低越确定 */
  temperature?: number
  /** 核采样 top_p，0–1 */
  topP?: number
  /** 生成上限 token 数 */
  maxTokens?: number
  /** presence penalty，-2–2 */
  presencePenalty?: number
  /** frequency penalty，-2–2 */
  frequencyPenalty?: number
  /** 随机种子（上游支持时用于复现） */
  seed?: number
}

/** 参数上下限。越界一律**夹到边界**而不是报错 —— 否则「温度填了 3」会让整个问答失败。 */
const PARAM_BOUNDS: Record<keyof ModelParams, [number, number]> = {
  temperature: [0, 2],
  topP: [0, 1],
  maxTokens: [1, 200000],
  presencePenalty: [-2, 2],
  frequencyPenalty: [-2, 2],
  seed: [0, 2147483647],
}

/** 参数名 → 上游请求体字段名。 */
const PARAM_WIRE: Record<keyof ModelParams, string> = {
  temperature: 'temperature',
  topP: 'top_p',
  maxTokens: 'max_tokens',
  presencePenalty: 'presence_penalty',
  frequencyPenalty: 'frequency_penalty',
  seed: 'seed',
}

/** 清洗一份参数：非数字/空值丢弃，数值夹到界限并取整（token/seed 取整）。 */
export function sanitizeParams(input: unknown): ModelParams {
  const out: ModelParams = {}
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out
  const o = input as Record<string, unknown>
  for (const key of Object.keys(PARAM_BOUNDS) as (keyof ModelParams)[]) {
    const v = o[key]
    if (v === undefined || v === null || v === '' || typeof v === 'boolean') continue
    const n = Number(v)
    if (!Number.isFinite(n)) continue
    const [lo, hi] = PARAM_BOUNDS[key]
    let x = Math.min(hi, Math.max(lo, n))
    if (key === 'maxTokens' || key === 'seed') x = Math.round(x)
    out[key] = x
  }
  return out
}

/** 把参数映射成上游请求体字段（跳过未设置的）。 */
function paramsToWire(p: ModelParams): Record<string, number> {
  const out: Record<string, number> = {}
  for (const key of Object.keys(PARAM_WIRE) as (keyof ModelParams)[]) {
    const v = p[key]
    if (typeof v === 'number') out[PARAM_WIRE[key]] = v
  }
  return out
}

/* ---------- 多 Profile（Q1 §1.2）：全局多套，管理员配置 ---------- */

/** 一套模型配置：LLM 与 embedding 可以指向同一或不同服务，外加一份生成参数。 */
export interface ModelProfile {
  /** 稳定 id（前端用 id 引用「当前 profile」，不用名字） */
  id: string
  /** 展示名 */
  name: string
  llm: ModelEndpoint
  embedding: ModelEndpoint
  /** 生成参数（Q2）；缺省 = 上游默认 */
  params?: ModelParams
}

/** `data/model.json` 的落盘形状。 */
export interface ModelConfig {
  profiles: ModelProfile[]
  /** 当前生效的 profile id；null = 未配置 */
  activeId: string | null
  maxRetries: number
}

/**
 * `getConfig()` 的返回：把**当前 profile 摊平**，兼容老调用方直接读 `cfg.llm`
 * （并带上完整 profile 列表与 activeId，供新前端渲染）。
 */
export interface ResolvedModelConfig {
  llm: ModelEndpoint
  embedding: ModelEndpoint
  params: ModelParams
  maxRetries: number
  profiles: ModelProfile[]
  activeId: string | null
}

function clampRetries(v: unknown): number {
  return Math.max(0, Math.min(5, Number(v ?? 2) || 2))
}

/** 读侧端点规范化：只做类型兜底，不做「打码保留」等表单语义（那是写侧的事）。 */
function normalizeEndpoint(v: unknown): ModelEndpoint {
  const o = (v && typeof v === 'object') ? v as Record<string, unknown> : {}
  return {
    baseURL: String(o.baseURL ?? '').trim(),
    apiKey: typeof o.apiKey === 'string' && o.apiKey !== '' ? o.apiKey : undefined,
    model: String(o.model ?? '').trim(),
    timeoutMs: Math.max(1000, Number(o.timeoutMs) || 60000),
  }
}

function normalizeProfile(v: unknown): ModelProfile | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const o = v as Record<string, unknown>
  const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : ''
  if (!id) return null
  const name = typeof o.name === 'string' && o.name.trim() ? o.name.trim() : id
  return { id, name, llm: normalizeEndpoint(o.llm), embedding: normalizeEndpoint(o.embedding), params: sanitizeParams(o.params) }
}

/**
 * 规范化落盘配置：**兼容旧结构**。
 *
 * 旧 `data/model.json` 是扁平的 `{ llm, embedding, maxRetries }`。这里把它当
 * 「单 profile」读进来（id 固定 `default`），因此**旧文件无需手工迁移即可用**；
 * 转换是纯读侧、幂等的，直到第一次保存才落新形状。
 */
export function normalizeConfig(raw: unknown): ModelConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { profiles: [], activeId: null, maxRetries: 2 }
  const o = raw as Record<string, unknown>
  const maxRetries = clampRetries(o.maxRetries)
  if (Array.isArray(o.profiles)) {
    const profiles = o.profiles.map(normalizeProfile).filter((p): p is ModelProfile => p !== null)
    const ids = new Set(profiles.map((p) => p.id))
    const activeId = typeof o.activeId === 'string' && ids.has(o.activeId) ? o.activeId : (profiles[0]?.id ?? null)
    return { profiles, activeId, maxRetries }
  }
  if (o.llm || o.embedding) {
    const p = normalizeProfile({ id: 'default', name: '默认', llm: o.llm, embedding: o.embedding, params: o.params })
    if (p) return { profiles: [p], activeId: 'default', maxRetries }
  }
  return { profiles: [], activeId: null, maxRetries }
}

/**
 * 写侧端点合并：把表单提交的端点与旧值合并。
 * `baseURL` 变了就**不保留**旧 key（免得把 A 端点的密钥用到 B 端点）；
 * 提交的 key 是空的或打码形态（`…` / `****`）= 「不修改」，保留旧值。
 */
function mergeEndpoint(v: unknown, old: ModelEndpoint | undefined): ModelEndpoint {
  const o = (v && typeof v === 'object') ? v as Record<string, unknown> : {}
  const baseURL = String(o.baseURL ?? '').trim()
  const apiKeyRaw = o.apiKey ? String(o.apiKey).trim() : ''
  const keepOld = apiKeyRaw === '' || apiKeyRaw.includes('…') || apiKeyRaw.startsWith('****')
  const apiKey = keepOld ? (old && old.baseURL === baseURL ? old.apiKey : undefined) : apiKeyRaw
  return {
    baseURL,
    apiKey,
    model: String(o.model ?? '').trim(),
    timeoutMs: Math.max(1000, Number(o.timeoutMs) || (old?.timeoutMs ?? 60000)),
  }
}

/** 端点地址合法性：空串（该端未配）/ `mock` / http(s):// 三者之一。 */
function assertEndpointURL(ep: ModelEndpoint, label: string): void {
  if (ep.baseURL === '' || ep.baseURL === 'mock' || /^https?:\/\//.test(ep.baseURL)) return
  throw new ModelError('MODEL_BAD_RESPONSE', label + '.baseURL 必须是 http(s):// 或 mock（当前：' + endpointLabel(ep.baseURL) + '）')
}

function newProfileId(): string {
  return 'p' + Date.now().toString(36) + randomBytes(2).toString('hex')
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    model: ModelService
  }
}

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()
const CONFIG_FILE = join(rootDir, 'data', 'model.json')
const EMBEDDING_DIM = 64

export class ModelService extends Service {
  private store: ModelConfig = { profiles: [], activeId: null, maxRetries: 2 }
  /** D4：配置在启动时读坏了 —— 之后一律拒绝写入，免得把可能可恢复的配置覆盖掉。 */
  private cfgCorrupt = false
  private healthCache: { key: string; at: number; llm: ModelHealth; embedding: ModelHealth } | null = null

  constructor(ctx: Context) {
    super(ctx, 'model')
  }

  /* ---------- 配置 ---------- */

  /** 当前生效的 profile（无 = null）。 */
  private active(): ModelProfile | null {
    const id = this.store.activeId
    if (!id) return null
    return this.store.profiles.find((p) => p.id === id) ?? null
  }

  /** 供老调用方读 `cfg.llm` 的摊平视图；无有效当前 profile 时回 null（= 未配置）。 */
  getConfig(): ResolvedModelConfig | null {
    const a = this.active()
    if (!a || (a.llm.baseURL === '' && a.embedding.baseURL === '')) return null
    return {
      llm: { ...a.llm },
      embedding: { ...a.embedding },
      params: sanitizeParams(a.params),
      maxRetries: this.store.maxRetries,
      profiles: this.listProfiles(),
      activeId: this.store.activeId,
    }
  }

  /** 全部 profile（副本）。 */
  listProfiles(): ModelProfile[] {
    return this.store.profiles.map((p) => ({ ...p, llm: { ...p.llm }, embedding: { ...p.embedding }, params: { ...sanitizeParams(p.params) } }))
  }

  activeProfileId(): string | null { return this.store.activeId }

  /** 配置是否曾读坏（界面据此提示，写操作会被拒）。 */
  isCorrupt(): boolean { return this.cfgCorrupt }

  async loadConfig(ctx: Context): Promise<void> {
    try {
      /* D4：模型配置里有**接口密钥**。损坏时隔离存证并抛错（这里接住并记下，
       * 因为本方法是启动时 `void` 调用的），并置 cfgCorrupt —— 各写方法据此拒绝写入，
       * 避免「改一下模型地址」把另一端的密钥连同整份配置一起覆盖掉。 */
      const raw = await readJsonStore<unknown>(
        ctx.storage, CONFIG_FILE, null,
        (v) => v === null || (typeof v === 'object' && !Array.isArray(v)),
      )
      this.store = normalizeConfig(raw)
    } catch (e) {
      this.cfgCorrupt = true
      this.store = { profiles: [], activeId: null, maxRetries: 2 }
      console.error('[model] 模型配置读取失败（改动已被拒绝，避免覆盖）：' + (e instanceof Error ? e.message : String(e)))
    }
  }

  private async persist(ctx: Context): Promise<void> {
    await ctx.storage.writeText(CONFIG_FILE, JSON.stringify(this.store, null, 2))
    this.healthCache = null // 配置变更后强制重检
  }

  /**
   * 兼容入口（老前端 / 老测试）：接受**两种形状**。
   *   - `{ profiles, activeId, maxRetries }` → 整表替换；
   *   - 扁平 `{ llm, embedding, maxRetries }`  → 写进当前 profile（无则建 `default`）。
   * 老代码据此继续能用，不必改一处。
   */
  async saveConfig(ctx: Context, input: unknown): Promise<void> {
    /* D4：配置此前读坏了 —— 拒绝写入。否则这份新配置会把损坏但可能可恢复的原文（含密钥）盖掉。 */
    assertStoreWritable(!this.cfgCorrupt, CONFIG_FILE)
    const o = (input && typeof input === 'object' && !Array.isArray(input)) ? input as Record<string, unknown> : {}
    if (Array.isArray(o.profiles)) {
      this.store = normalizeConfig(o)
    } else {
      const cur = this.active()
      const id = cur?.id ?? 'default'
      const profile: ModelProfile = {
        id,
        name: cur?.name ?? '默认',
        llm: mergeEndpoint(o.llm, cur?.llm),
        embedding: mergeEndpoint(o.embedding, cur?.embedding),
        params: sanitizeParams(o.params ?? cur?.params),
      }
      assertEndpointURL(profile.llm, 'llm')
      assertEndpointURL(profile.embedding, 'embedding')
      this.store = {
        profiles: [...this.store.profiles.filter((p) => p.id !== id), profile],
        activeId: id,
        maxRetries: o.maxRetries === undefined ? this.store.maxRetries : clampRetries(o.maxRetries),
      }
    }
    for (const p of this.store.profiles) {
      assertEndpointURL(p.llm, p.name + ' / llm')
      assertEndpointURL(p.embedding, p.name + ' / embedding')
    }
    // 「两端都空」的 profile 视为未配置：删掉它；表空则 activeId=null。
    this.store.profiles = this.store.profiles.filter((p) => p.llm.baseURL !== '' || p.embedding.baseURL !== '')
    if (!this.store.profiles.some((p) => p.id === this.store.activeId)) this.store.activeId = this.store.profiles[0]?.id ?? null
    await this.persist(ctx)
  }

  /** 新建/更新一个 profile（id 缺省 = 新建）。返回表与当前 id。 */
  async upsertProfile(ctx: Context, input: unknown): Promise<{ profiles: ModelProfile[]; activeId: string | null; created: boolean }> {
    assertStoreWritable(!this.cfgCorrupt, CONFIG_FILE)
    const o = (input && typeof input === 'object' && !Array.isArray(input)) ? input as Record<string, unknown> : {}
    const name = typeof o.name === 'string' && o.name.trim() ? o.name.trim() : '未命名'
    let id = typeof o.id === 'string' ? o.id.trim() : ''
    const existing = id ? this.store.profiles.find((p) => p.id === id) : undefined
    const created = !existing
    if (!id) id = newProfileId()
    const profile: ModelProfile = {
      id,
      name,
      llm: mergeEndpoint(o.llm, existing?.llm),
      embedding: mergeEndpoint(o.embedding, existing?.embedding),
      params: sanitizeParams(o.params ?? existing?.params),
    }
    assertEndpointURL(profile.llm, 'llm')
    assertEndpointURL(profile.embedding, 'embedding')
    this.store.profiles = [...this.store.profiles.filter((p) => p.id !== id), profile]
    if (!this.store.activeId || o.activate === true) this.store.activeId = id
    if (o.maxRetries !== undefined) this.store.maxRetries = clampRetries(o.maxRetries)   // 全局项，随任一次保存一起落盘
    await this.persist(ctx)
    return { profiles: this.listProfiles(), activeId: this.store.activeId, created }
  }

  /** 删除一个 profile；删的是当前项则顺位到第一个。 */
  async removeProfile(ctx: Context, id: string): Promise<{ profiles: ModelProfile[]; activeId: string | null }> {
    assertStoreWritable(!this.cfgCorrupt, CONFIG_FILE)
    const p = this.store.profiles.find((x) => x.id === id)
    if (!p) throw new ModelError('MODEL_BAD_RESPONSE', '不存在的 profile：' + id)
    this.store.profiles = this.store.profiles.filter((x) => x.id !== id)
    if (this.store.activeId === id) this.store.activeId = this.store.profiles[0]?.id ?? null
    await this.persist(ctx)
    return { profiles: this.listProfiles(), activeId: this.store.activeId }
  }

  /** 切换当前 profile。 */
  async setActive(ctx: Context, id: string): Promise<void> {
    assertStoreWritable(!this.cfgCorrupt, CONFIG_FILE)
    if (!this.store.profiles.some((p) => p.id === id)) throw new ModelError('MODEL_BAD_RESPONSE', '不存在的 profile：' + id)
    this.store.activeId = id
    await this.persist(ctx)
  }


  /* ---------- 健康检查 ---------- */

  async check(ctx: Context, force = false, deep = false): Promise<{ llm: ModelHealth; embedding: ModelHealth; checkedAt: number }> {
    const a = this.active()
    if (!a || (a.llm.baseURL === '' && a.embedding.baseURL === '')) {
      return { llm: { status: 'unconfigured' }, embedding: { status: 'unconfigured' }, checkedAt: Date.now() }
    }
    const key = JSON.stringify({ llm: a.llm, embedding: a.embedding, maxRetries: this.store.maxRetries })
    // deep 不吃缓存：否则「测试」按钮可能一次真实调用都没发生就报「通过」
    if (!force && !deep && this.healthCache && this.healthCache.key === key && Date.now() - this.healthCache.at < 60000) {
      return { llm: this.healthCache.llm, embedding: this.healthCache.embedding, checkedAt: this.healthCache.at }
    }
    const [llm, embedding] = await Promise.all([this.probe(ctx, a.llm), this.probe(ctx, a.embedding)])
    const emb = deep ? await this.deepCheckEmbedding(ctx, embedding) : embedding
    // 深度结果不进缓存：它带一次真实调用的耗时，缓存下来只会变成「假新鲜」
    if (!deep) this.healthCache = { key, at: Date.now(), llm, embedding: emb }
    return { llm, embedding: emb, checkedAt: Date.now() }
  }

  /**
   * 深度自检 embedding（W-B/§1.4）：真的调一次，回维数与耗时。
   *
   * 为什么必须显式开启而不是并进普通 check：`/api/model/status` 会被首页工作台轮询，
   * 若默认就打 embedding，等于每次轮询都花一次真实调用（与额度）。
   *
   * 维数是有用的信号：它既证明「这条路真的通」，又是配向量索引的必要参数 ——
   * 之前的自检只证明 `/v1/models` 答了，答了不代表 embeddings 这条能跑。
   */
  private async deepCheckEmbedding(ctx: Context, h: ModelHealth): Promise<ModelHealth> {
    if (h.status !== 'ok') return h // 端点本身都不通/模型名都不对，不必再打一次
    const t0 = Date.now()
    try {
      const v = await this.embed(ctx, ['连通自检'])
      const dims = v[0]?.length ?? 0
      if (!dims) return { status: 'embed-error', error: '上游没有返回向量（该模型名可能不是向量模型，或该端点未实现 embeddings）' }
      return { ...h, dims, latencyMs: Date.now() - t0 }
    } catch (e) {
      return { status: 'embed-error', error: sanitizeError(e instanceof Error ? e.message : String(e), 200) }
    }
  }

  private async probe(ctx: Context, ep: ModelEndpoint): Promise<ModelHealth> {
    if (ep.baseURL === 'mock') return { status: 'ok', models: ['mock-endpoint'] }
    try {
      const r = await this.call(ctx, ep.baseURL, 'GET', '/v1/models', undefined, ep.apiKey, ep.timeoutMs, 0, false)
      if (r.status >= 400) {
        if (r.status === 401 || r.status === 403) return { status: 'auth-error' }
        return { status: 'unreachable', error: 'HTTP ' + r.status }
      }
      const body = await r.json().catch(() => ({ data: [] })) as { data?: Array<{ id: string }> }
      const models = (body.data ?? []).map((m) => m.id)
      if (ep.model && models.length > 0 && !models.includes(ep.model)) return { status: 'model-missing', models }
      return { status: 'ok', models }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (/timeout|abort/i.test(msg)) return { status: 'timeout' }
      // 这条 error 会经 /api/model/status、/api/rag/status 一路显示到界面（shell-home 的
      // 状态卡）：与 call() 同一条理由，整句脱敏（W-B/§1.5）。
      return { status: 'unreachable', error: sanitizeError(msg, 200) }
    }
  }

  /* ---------- 调用封装（OpenAI 兼容） ---------- */

  private async call(
    ctx: Context, baseURL: string, method: string, path: string,
    body: unknown, apiKey: string | undefined, timeoutMs: number,
    retryLeft: number, expectJson: boolean,
  ): Promise<Response> {
    const url = baseURL.replace(/\/+$/, '') + path
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'content-type': 'application/json',
          ...(apiKey ? { authorization: 'Bearer ' + apiKey } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: ctrl.signal,
      })
      if (res.status === 401 || res.status === 403) throw new ModelError('MODEL_AUTH', '模型端点鉴权失败（HTTP ' + res.status + '），请检查 apiKey')
      if (res.status === 404) throw new ModelError('MODEL_NOT_FOUND', '模型端点路径不存在（' + path + '），请检查 baseURL')
      if (res.status === 429 && retryLeft > 0) {
        await new Promise((r) => setTimeout(r, 500 * (2 - retryLeft)))
        return this.call(ctx, baseURL, method, path, body, apiKey, timeoutMs, retryLeft - 1, expectJson)
      }
      if (res.status >= 500 && retryLeft > 0) {
        await new Promise((r) => setTimeout(r, 300 * (2 - retryLeft)))
        return this.call(ctx, baseURL, method, path, body, apiKey, timeoutMs, retryLeft - 1, expectJson)
      }
      if (!res.ok) {
        // 429 单独成一类：「上游限流」与「回包格式不对」是两种完全不同的处置
        // （前者该等/降并发，后者该改配置），混在一句「返回 429」里用户无从下手。
        if (res.status === 429) {
          throw new ModelError('MODEL_RATE_LIMIT', '上游限流（HTTP 429）：请稍后重试；若持续出现，请降低并发或缩短语料规模')
        }
        // 优先用上游给出的结构化原因；拿不到再回退原文。两者都脱敏。
        const raw = await res.text().catch(() => '')
        let parsed: unknown = null
        try { parsed = raw ? JSON.parse(raw) : null } catch { /* 非 JSON，走原文回退 */ }
        const reason = upstreamMessage(parsed, parsed ? '' : raw)
        throw new ModelError('MODEL_BAD_RESPONSE',
          '模型端点返回 HTTP ' + res.status + (reason ? '：' + reason : '（上游未给出原因）'))
      }
      return res
    } catch (e) {
      if (e instanceof ModelError) throw e
      /* 「连不上」这一类必须说清**连的是哪个地址**：裸的 `fetch failed` / `ECONNREFUSED`
       * 对配置者毫无信息量 —— 他不知道是地址写错、服务没启、还是端口不通。
       * 地址不是密钥（是管理员自己填的），但要剥掉 URL 里的 userinfo。 */
      const where = endpointLabel(baseURL)
      if ((e as Error).name === 'AbortError') throw new ModelError('MODEL_TIMEOUT', sanitizeError('模型端点超时（>' + timeoutMs + 'ms）：' + where))
      /* 整句过一遍 sanitizeError：`e.message` 来自 fetch/undici，**不保证**里面没有地址
       * （例如 `Failed to parse URL from <url>` 会把整个 URL 连同 query 抄进来）。
       * 这里也走脱敏，密钥就不会从这条支路漏出去（W-B/§1.5）。 */
      throw new ModelError('MODEL_UNREACHABLE', sanitizeError(
        '无法连接模型端点 ' + where + '：' + (e instanceof Error ? e.message : String(e)).slice(0, 160)
        + '（请确认地址与端口可达、服务已启动）'))
    } finally {
      clearTimeout(timer)
    }
  }

  /* ---------- embedding ---------- */

  async embed(ctx: Context, texts: string[]): Promise<number[][]> {
    const a = this.active()
    if (!a || (a.llm.baseURL === '' && a.embedding.baseURL === '')) throw new ModelError('MODEL_UNREACHABLE', '模型未配置（请先在 RAG 界面/API 填写模型地址）')
    if (a.embedding.baseURL === 'mock') return texts.map((t) => this.mockEmbed(t))
    if (!a.embedding.model) throw new ModelError('MODEL_BAD_RESPONSE', 'embedding.model 未填写')
    const out: number[][] = []
    for (let i = 0; i < texts.length; i += 32) {
      const batch = texts.slice(i, i + 32)
      const r = await this.call(ctx, a.embedding.baseURL, 'POST', '/v1/embeddings', { model: a.embedding.model, input: batch }, a.embedding.apiKey, a.embedding.timeoutMs, this.store.maxRetries, true)
      // 形状兜底：标准是 { data: [{ embedding }] }，少数网关给 { embeddings: [[...]] }。
      // 报错不再 dump 整个 JSON（那是几百字噪声、还可能回显请求头），改为「差多少 + 可读原因 + 形状摘要」。
      const body = await r.json().catch(() => null) as any
      const vecs: unknown[] = Array.isArray(body?.data)
        ? body.data.map((d: any) => d?.embedding)
        : Array.isArray(body?.embeddings) ? body.embeddings : []
      if (vecs.length < batch.length) {
        const reason = upstreamMessage(body?.error ?? body)
        throw new ModelError('MODEL_BAD_RESPONSE',
          'embedding 上游没有返回足够的向量（需要 ' + batch.length + ' 条，实得 ' + vecs.length + ' 条）'
          + (reason ? '：' + reason : '') + '（响应形状：' + describeShape(body) + '）')
      }
      for (const v of vecs) {
        if (!Array.isArray(v) || v.length === 0) {
          throw new ModelError('MODEL_BAD_RESPONSE', 'embedding 向量缺失或为空（上游可能只支持单条输入，请检查该端点的输入格式）')
        }
        out.push(v as number[])
      }
    }
    return out
  }

  private mockEmbed(text: string): number[] {
    // 确定性伪向量（哈希种子 × 64 维 → 归一化）；同一文本恒等、不同文本可区分
    const h = createHash('sha256').update('mock-embed:' + text).digest()
    const vec: number[] = []
    let acc = 0
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      if (i % 4 === 0) acc = h.readUInt32BE((i / 4) % 8 * 4)
      const x = ((acc >> ((i % 4) * 8)) & 0xff) / 255 - 0.5
      vec.push(x)
    }
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1
    return vec.map((v) => v / norm)
  }

  /* ---------- chat ---------- */

  async chat(ctx: Context, messages: ChatMessage[], opts: { stream?: boolean; onChunk?: (delta: string) => void; params?: ModelParams } = {}): Promise<string> {
    const a = this.active()
    if (!a || (a.llm.baseURL === '' && a.embedding.baseURL === '')) throw new ModelError('MODEL_UNREACHABLE', '模型未配置（请先在 RAG 界面/API 填写模型地址）')
    // 生效参数 = profile 默认 ↑ 本次调用覆盖（后者已由调用方按 `ai.params` 开关裁过）
    const effective = { ...sanitizeParams(a.params), ...sanitizeParams(opts.params) }
    if (a.llm.baseURL === 'mock') {
      const last = messages.filter((m) => m.role === 'user').pop()?.content ?? ''
      const text = '[mock] ' + last.slice(0, 120) + (last.length > 120 ? '…' : '') + '\n（离线模拟响应：配置真实模型地址后返回真实答案）'
      if (opts.stream && opts.onChunk) { for (const ch of text.split('')) opts.onChunk(ch) }
      return text
    }
    if (!a.llm.model) throw new ModelError('MODEL_BAD_RESPONSE', 'llm.model 未填写')
    const payload = { model: a.llm.model, messages, stream: opts.stream === true, ...paramsToWire(effective) }
    const r = await this.call(ctx, a.llm.baseURL, 'POST', '/v1/chat/completions', payload, a.llm.apiKey, a.llm.timeoutMs, this.store.maxRetries, false)
    if (opts.stream) {
      // SSE：data: {...}\n\n；[DONE] 结束
      const reader = r.body?.getReader()
      if (!reader) throw new ModelError('MODEL_BAD_RESPONSE', '流式响应无 body')
      const decoder = new TextDecoder()
      let buf = ''
      let full = ''
      let reasoning = ''
      /** 处理一行 `data:` 帧；把 `delta.content`/`delta.text`/整帧 message.content 都当正文 */
      const feedLine = (line: string): void => {
        if (!line.startsWith('data:')) return
        const data = line.slice(5).trim()
        if (data === '' || data === '[DONE]') return
        let chunk: any
        try { chunk = JSON.parse(data) } catch { return }   // 跳过坏帧
        const c = chunk?.choices?.[0]
        const d = c?.delta?.content ?? c?.delta?.text ?? c?.message?.content ?? c?.text ?? ''
        if (typeof d === 'string' && d) { full += d; opts.onChunk?.(d) }
        const rr = c?.delta?.reasoning_content ?? c?.message?.reasoning_content ?? ''
        if (typeof rr === 'string' && rr) reasoning += rr
      }
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        let idx: number
        while ((idx = buf.indexOf('\n')) >= 0) {
          feedLine(buf.slice(0, idx).trim())
          buf = buf.slice(idx + 1)
        }
      }
      // 末帧可能没有换行（有的网关最后一帧不带 \n），不 flush 就会静默丢掉最后一次增量
      if (buf.trim()) feedLine(buf.trim())
      if (full === '') {
        // 空回答必须如实报错：返回空字符串会让界面显示一个没有任何解释的空气泡，
        // 「上游只吐了思考内容」这种情况下用户最需要知道的是「换个模型或关掉推理模式」。
        throw new ModelError('MODEL_BAD_RESPONSE', reasoning
          ? '上游流式响应只包含「思考内容」而没有正文：该模型可能是推理模型，请改用非推理模型或关闭推理/思考模式'
          : '上游流式响应里没有任何正文（端点可能不支持 stream，或返回了非 OpenAI 兼容的形状）')
      }
      return full
    }
    const body = await r.json().catch(() => null)
    const { text, reasoning } = extractChatText(body)
    if (text) return text
    if (reasoning) {
      throw new ModelError('MODEL_BAD_RESPONSE',
        '上游只返回了「思考内容」而没有正文：该模型可能是推理模型（思考内容放在 reasoning_content），请改用非推理模型或关闭推理/思考模式')
    }
    const reason = upstreamMessage((body as any)?.error ?? body) || upstreamMessage(null, typeof body === 'string' ? body : '')
    throw new ModelError('MODEL_BAD_RESPONSE',
      '上游没有返回正文' + (reason ? '：' + reason : '') + '（响应形状：' + describeShape(body) + '）')
  }
}

/* ---------- 写作助手动作组（§1.8）----------
 *
 * 「一段文字 + 一个动作 → 改过的文字」这件事的**唯一一处**定义：动作表 + 提示词拼装。
 * 放在模型接入层而不是路由处，是因为「提示词长什么样」属于模型知识，与 HTTP 无关；
 * 将来换引擎（V4）时只有适配器变，这一处不动。**路由只负责鉴权/取正文/调模型/回文本**。
 *
 * 两条约定，缺一即坏体验：
 *   1. 模型**只回正文** —— 所有动作都显式要求「只输出结果本身，不要解释、不要引号或代码块
 *      包裹、不要复述原文」。否则用户点一下「润色」会拿到一整段
 *      「好的，这是润色后的版本：……」。
 *   2. 结果再兜一道 {@link stripWriteResult} —— 模型不听话时把整段结果套了 ``` 围栏，
 *      只做最保守的清理（去围栏 + 首尾空白），绝不改动正文内容。
 */
export interface WriteAction {
  /** 稳定 id（前端下拉的 value、审计里的 action）。 */
  id: string
  /** 下拉里的分组标题。 */
  group: string
  /** 中文标题（下拉项）。 */
  title: string
  /** 送给模型的指令。`custom` 动作这条为空，改用用户当次填的 instruction。 */
  prompt: string
  /** 自定义动作：用用户填写的 instruction 代替 prompt。 */
  custom?: boolean
}

export const WRITE_ACTIONS: readonly WriteAction[] = [
  /* 优化 */
  { id: 'polish', group: '优化', title: '润色', prompt: '润色下面这段文字：让表达更顺畅、更专业，但**不改变原意、不增删要点**。' },
  { id: 'concise', group: '优化', title: '精简', prompt: '精简下面这段文字：删去冗余与重复，保留全部要点，尽量缩短篇幅。' },
  { id: 'expand', group: '优化', title: '扩写', prompt: '扩写下面这段文字：在**不虚构事实**的前提下补充细节与过渡，让它更充实。' },
  { id: 'rewrite', group: '优化', title: '改写', prompt: '改写下面这段文字：保持意思不变，换一种更清晰的表达方式。' },
  /* 编辑 */
  { id: 'grammar', group: '编辑', title: '修语法', prompt: '修正下面这段文字的语法、错别字与标点错误，其余一律不动。只输出改正后的文字。' },
  { id: 'summary', group: '编辑', title: '摘要', prompt: '为下面这段文字写一段简短摘要（不超过原文的三分之一），只输出摘要本身。' },
  { id: 'continue', group: '编辑', title: '续写', prompt: '顺着下面这段文字的语意与文风继续往下写一小段，不要重复已有内容，只输出新写的那一段。' },
  { id: 'explain', group: '编辑', title: '解释', prompt: '解释下面这段文字在说什么：先用一句话概括，再列出关键点。' },
  /* 翻译 */
  { id: 'to_en', group: '翻译', title: '中译英', prompt: '把下面这段文字翻译成地道的英文，只输出译文。' },
  { id: 'to_zh', group: '翻译', title: '英译中', prompt: '把下面这段文字翻译成自然的中文，只输出译文。' },
  /* 格式 */
  { id: 'md_format', group: '格式', title: 'Markdown 排版', prompt: '把下面这段文字整理成结构清晰的 Markdown（合理使用标题、列表），不要增删实质内容。只输出排版后的 Markdown 源码。' },
  { id: 'code_format', group: '格式', title: '代码格式化', prompt: '把下面这段代码按该语言的通用风格整理格式（缩进、换行、命名一致），不改变逻辑。只输出代码本身。' },
  /* 其他 */
  { id: 'custom', group: '其他', title: '自定义…', prompt: '', custom: true },
]

export const WRITE_ACTION_BY_ID: ReadonlyMap<string, WriteAction> = new Map(WRITE_ACTIONS.map((a) => [a.id, a]))

/**
 * 拼装写作动作的 messages。未知动作直接抛错（调用方翻成 400），不当成空动作静默放行 ——
 * 静默放行会让「前端传错 id」表现为「模型乱改一通」而不是一条清楚的报错。
 */
export function buildWriteMessages(actionId: string, text: string, instruction = ''): ChatMessage[] {
  const a = WRITE_ACTION_BY_ID.get(actionId)
  if (!a) throw new Error('未知的写作动作：' + actionId)
  const task = a.custom ? (instruction.trim() || '按要求修改下面这段文字。') : a.prompt
  const system = '你是中文写作助手。只输出【结果本身】：不要解释、不要客套、不要用引号或代码块包裹整段结果、不要复述原文。保持原文的语言与 Markdown 结构（除非任务本身就是翻译或排版）。'
  return [
    { role: 'system', content: system },
    { role: 'user', content: task + '\n\n---\n' + text },
  ]
}

/** 兜一道：模型偶尔把整段结果套了 ``` 围栏（或首尾引号），只做最保守的清理，不动正文。 */
export function stripWriteResult(input: string): string {
  let t = String(input ?? '').trim()
  const fence = t.match(/^```[A-Za-z0-9_+.-]*\n([\s\S]*?)\n?```$/)
  if (fence) t = fence[1].trim()
  return t
}

/* mock 辅助：随机种子（测试用） */
export function mockSeed(): string { return randomBytes(4).toString('hex') }

export const name = 'privhub-svc-model'
/**
 * 必须显式声明 `storage`：`loadConfig` 经 `ctx.storage` 读 `data/model.json`。
 * 这里长期是空数组 —— cordis 对未 inject 的服务键是**取用即抛**
 * （`cannot get property "storage" without inject`），而当时 `loadConfig` 的
 * `catch` 把这句话静静吞了，于是「模型配置重启后不生效」这件事**没有任何迹象**：
 * 界面显示未配置，运维再填一遍又能用，谁也不会怀疑落盘/重读。
 * （D4 把静默 catch 换成告警才把它暴露出来 —— 见 `loadConfig` 的 catch。）
 */
export const inject: string[] = ['storage']
export function apply(ctx: Context): void {
  const svc = new ModelService(ctx)
  void svc.loadConfig(ctx).catch(() => {})
}