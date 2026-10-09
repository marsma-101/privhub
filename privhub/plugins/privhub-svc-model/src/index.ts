/**
 * privhub-svc-model — 模型接入层（M0，L2 能力 Service）
 *
 * 不选型、不绑定方向：只认 OpenAI 兼容协议（Ollama / vLLM / LM Studio / DSH 网关等）。
 * 运维在 RAG 界面（或 /api/model/config）填写 baseURL + apiKey(可选) + 模型名即可生效。
 *
 * 能力：
 *   - embed(texts)：批量向量化（≤32/批，串行重试），返回 number[][]
 *   - chat({messages, stream, onChunk})：非流式返回全文；流式经 onChunk 输出
 *   - check()：端点半健康检查（GET {base}/v1/models），状态 ok/unconfigured/unreachable/
 *     timeout/auth-error/model-missing
 *   - mock：baseURL 填 'mock' 时离线可用——embedding 返回种子伪向量（64 维），
 *     chat 返回回显文本；用于无模型环境下的开发与测试
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
  | { status: 'ok'; models: string[] }
  | { status: 'unreachable'; error: string }
  | { status: 'timeout' }
  | { status: 'auth-error' }
  | { status: 'model-missing'; models: string[] }

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
 * 剥掉 URL 里的 userinfo（`http://user:pass@host` 这种写法把凭据放在地址里，
 * 报错原文会把它显示到界面上，等于把密钥贴出去）。
 */
export function endpointLabel(baseURL: string): string {
  return String(baseURL ?? '').replace(/\/+$/, '').replace(/\/\/[^/@]*@/, '//')
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

declare module '@deepseek-ai/cordis' {
  interface Context {
    model: ModelService
  }
}

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()
const CONFIG_FILE = join(rootDir, 'data', 'model.json')
const EMBEDDING_DIM = 64

export class ModelService extends Service {
  private cfg: ModelConfig | null = null
  /** D4：配置在启动时读坏了 —— 之后一律拒绝写入，免得把可能可恢复的配置覆盖掉。 */
  private cfgCorrupt = false
  private healthCache: { key: string; at: number; llm: ModelHealth; embedding: ModelHealth } | null = null

  constructor(ctx: Context) {
    super(ctx, 'model')
  }

  /* ---------- 配置 ---------- */

  getConfig(): ModelConfig | null { return this.cfg }

  async loadConfig(ctx: Context): Promise<void> {
    try {
      /* D4：模型配置里有**接口密钥**。损坏时隔离存证并抛错（这里接住并记下，
       * 因为本方法是启动时 `void` 调用的），并置 cfgCorrupt —— saveConfig 据此拒绝写入，
       * 避免「改一下模型地址」把另一端的密钥连同整份配置一起覆盖掉。
       * 形状裁决交给 check：`null` 是合法状态（两端都清空 = 未配置）。 */
      const raw = await readJsonStore<ModelConfig | null>(
        ctx.storage, CONFIG_FILE, null,
        (v) => v === null || (typeof v === 'object' && !Array.isArray(v)),
      )
      if (raw && typeof raw === 'object' && raw.llm?.baseURL && raw.embedding?.baseURL) this.cfg = raw
    } catch (e) {
      this.cfgCorrupt = true
      this.cfg = null
      console.error('[model] 模型配置读取失败（改动已被拒绝，避免覆盖）：' + (e instanceof Error ? e.message : String(e)))
    }
  }

  async saveConfig(ctx: Context, cfg: ModelConfig): Promise<void> {
    /* D4：配置此前读坏了 —— 拒绝写入。否则这份新配置会把损坏但可能可恢复的原文（含密钥）盖掉。 */
    assertStoreWritable(!this.cfgCorrupt, CONFIG_FILE)
    const old = this.cfg
    const clean = (e: ModelEndpoint | undefined): ModelEndpoint => {
      const baseURL = String(e?.baseURL ?? '').trim()
      const apiKeyRaw = e?.apiKey ? String(e.apiKey).trim() : ''
      // 表单回显的是打码形态（…），提交时视为「不修改」，保留旧值
      const apiKey = apiKeyRaw === '' || apiKeyRaw.includes('…') || apiKeyRaw.startsWith('****')
        ? old?.llm?.baseURL === baseURL ? old.llm.apiKey : undefined
        : apiKeyRaw
      return {
        baseURL,
        apiKey,
        model: String(e?.model ?? '').trim(),
        timeoutMs: Math.max(1000, Number(e?.timeoutMs) || 60000),
      }
    }
    const next: ModelConfig = {
      llm: clean(cfg.llm),
      embedding: clean(cfg.embedding),
      maxRetries: Math.max(0, Math.min(5, Number(cfg?.maxRetries) || 2)),
    }
    if (next.llm.baseURL === '' && next.embedding.baseURL === '') { this.cfg = null }
    else {
      const valid = (u: string): boolean => u === 'mock' || /^https?:\/\//.test(u)
      if (!valid(next.llm.baseURL)) throw new ModelError('MODEL_BAD_RESPONSE', 'llm.baseURL 必须是 http(s):// 或 mock')
      if (!valid(next.embedding.baseURL)) throw new ModelError('MODEL_BAD_RESPONSE', 'embedding.baseURL 必须是 http(s):// 或 mock')
      this.cfg = next
    }
    await ctx.storage.writeText(CONFIG_FILE, JSON.stringify(this.cfg, null, 2))
    this.healthCache = null // 配置变更后强制重检
  }

  /* ---------- 健康检查 ---------- */

  async check(ctx: Context, force = false): Promise<{ llm: ModelHealth; embedding: ModelHealth; checkedAt: number }> {
    const cfg = this.cfg
    if (!cfg) return { llm: { status: 'unconfigured' }, embedding: { status: 'unconfigured' }, checkedAt: Date.now() }
    const key = JSON.stringify(cfg)
    if (!force && this.healthCache && this.healthCache.key === key && Date.now() - this.healthCache.at < 60000) {
      return { llm: this.healthCache.llm, embedding: this.healthCache.embedding, checkedAt: this.healthCache.at }
    }
    const [llm, embedding] = await Promise.all([this.probe(ctx, cfg.llm), this.probe(ctx, cfg.embedding)])
    this.healthCache = { key, at: Date.now(), llm, embedding }
    return { llm, embedding, checkedAt: Date.now() }
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
      return { status: 'unreachable', error: msg.slice(0, 200) }
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
      if ((e as Error).name === 'AbortError') throw new ModelError('MODEL_TIMEOUT', '模型端点超时（>' + timeoutMs + 'ms）：' + where)
      throw new ModelError('MODEL_UNREACHABLE',
        '无法连接模型端点 ' + where + '：' + (e instanceof Error ? e.message : String(e)).slice(0, 160)
        + '（请确认地址与端口可达、服务已启动）')
    } finally {
      clearTimeout(timer)
    }
  }

  /* ---------- embedding ---------- */

  async embed(ctx: Context, texts: string[]): Promise<number[][]> {
    const cfg = this.cfg
    if (!cfg) throw new ModelError('MODEL_UNREACHABLE', '模型未配置（请先在 RAG 界面/API 填写模型地址）')
    if (cfg.embedding.baseURL === 'mock') return texts.map((t) => this.mockEmbed(t))
    if (!cfg.embedding.model) throw new ModelError('MODEL_BAD_RESPONSE', 'embedding.model 未填写')
    const out: number[][] = []
    for (let i = 0; i < texts.length; i += 32) {
      const batch = texts.slice(i, i + 32)
      const r = await this.call(ctx, cfg.embedding.baseURL, 'POST', '/v1/embeddings', { model: cfg.embedding.model, input: batch }, cfg.embedding.apiKey, cfg.embedding.timeoutMs, cfg.maxRetries, true)
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

  async chat(ctx: Context, messages: ChatMessage[], opts: { stream?: boolean; onChunk?: (delta: string) => void } = {}): Promise<string> {
    const cfg = this.cfg
    if (!cfg) throw new ModelError('MODEL_UNREACHABLE', '模型未配置（请先在 RAG 界面/API 填写模型地址）')
    if (cfg.llm.baseURL === 'mock') {
      const last = messages.filter((m) => m.role === 'user').pop()?.content ?? ''
      const text = '[mock] ' + last.slice(0, 120) + (last.length > 120 ? '…' : '') + '\n（离线模拟响应：配置真实模型地址后返回真实答案）'
      if (opts.stream && opts.onChunk) { for (const ch of text.split('')) opts.onChunk(ch) }
      return text
    }
    if (!cfg.llm.model) throw new ModelError('MODEL_BAD_RESPONSE', 'llm.model 未填写')
    const payload = { model: cfg.llm.model, messages, stream: opts.stream === true }
    const r = await this.call(ctx, cfg.llm.baseURL, 'POST', '/v1/chat/completions', payload, cfg.llm.apiKey, cfg.llm.timeoutMs, cfg.maxRetries, false)
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