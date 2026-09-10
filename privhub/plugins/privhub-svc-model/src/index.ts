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
  constructor(public code: 'MODEL_TIMEOUT' | 'MODEL_AUTH' | 'MODEL_NOT_FOUND' | 'MODEL_UNREACHABLE' | 'MODEL_BAD_RESPONSE', message: string) {
    super(message)
  }
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
  private healthCache: { key: string; at: number; llm: ModelHealth; embedding: ModelHealth } | null = null

  constructor(ctx: Context) {
    super(ctx, 'model')
  }

  /* ---------- 配置 ---------- */

  getConfig(): ModelConfig | null { return this.cfg }

  async loadConfig(ctx: Context): Promise<void> {
    try {
      const raw = JSON.parse(await ctx.storage.readText(CONFIG_FILE)) as ModelConfig
      if (raw && typeof raw === 'object' && raw.llm?.baseURL && raw.embedding?.baseURL) this.cfg = raw
    } catch { this.cfg = null }
  }

  async saveConfig(ctx: Context, cfg: ModelConfig): Promise<void> {
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
        const msg = await res.text().catch(() => '')
        throw new ModelError('MODEL_BAD_RESPONSE', '模型端点返回 ' + res.status + ': ' + msg.slice(0, 200))
      }
      return res
    } catch (e) {
      if (e instanceof ModelError) throw e
      if ((e as Error).name === 'AbortError') throw new ModelError('MODEL_TIMEOUT', '模型端点超时（>' + timeoutMs + 'ms）')
      throw new ModelError('MODEL_UNREACHABLE', (e instanceof Error ? e.message : String(e)).slice(0, 200))
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
      const body = await r.json().catch(() => null) as { data?: Array<{ embedding?: number[] }>; error?: { message?: string } } | null
      if (!body || !Array.isArray(body.data) || body.data.length < batch.length) {
        throw new ModelError('MODEL_BAD_RESPONSE', 'embedding 响应异常：' + JSON.stringify(body?.error ?? body).slice(0, 160))
      }
      for (const item of body.data) {
        if (!Array.isArray(item.embedding)) throw new ModelError('MODEL_BAD_RESPONSE', 'embedding 向量缺失')
        out.push(item.embedding)
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
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        let idx: number
        while ((idx = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, idx).trim()
          buf = buf.slice(idx + 1)
          if (!line.startsWith('data:')) continue
          const data = line.slice(5).trim()
          if (data === '[DONE]') continue
          try {
            const chunk = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> }
            const d = chunk.choices?.[0]?.delta?.content ?? ''
            if (d) { full += d; opts.onChunk?.(d) }
          } catch { /* 跳过坏帧 */ }
        }
      }
      return full
    }
    const body = await r.json().catch(() => null) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } } | null
    if (!body || !Array.isArray(body.choices) || !body.choices[0]?.message?.content) {
      throw new ModelError('MODEL_BAD_RESPONSE', 'chat 响应异常：' + JSON.stringify(body?.error ?? body).slice(0, 160))
    }
    return body.choices[0].message.content
  }
}

/* mock 辅助：随机种子（测试用） */
export function mockSeed(): string { return randomBytes(4).toString('hex') }

export const name = 'privhub-svc-model'
export const inject: string[] = []
export function apply(ctx: Context): void {
  const svc = new ModelService(ctx)
  void svc.loadConfig(ctx).catch(() => {})
}