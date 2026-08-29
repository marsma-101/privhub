/**
 * 私域枢纽能力 Service：搜索（privhub-svc-search，S4）
 *
 * 以 cordis Service 形式暴露 `ctx.search`：query / index / remove / searchFulltext。
 *   - query：文件名递归匹配（批次① 能力，行为不变）
 *   - index / remove：全文索引（批次② 升级为真实实现——CJK bigram 分词
 *     + 倒排索引 + BM25 打分；F16 保存 / F17 构建与增量均调用）
 *   - searchFulltext：全文检索（命中返回片段 snippet ±40 字符）
 * 索引为内存态：F17 插件启动时全量构建、监听事件增量维护；重启重建
 * （≤5s 可接受，符合低配宿主机约束）。
 *
 * @module privhub-svc-search
 */

import { readdir } from 'node:fs/promises'
import { Service } from '@deepseek-ai/cordis'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

/** 一条命中结果。 */
export interface SearchHit {
  project: string
  /** 项目内相对路径（含文件名） */
  path: string
  name: string
  isDir: boolean
  /** 匹配方式：filename（文件名）/ fulltext（全文） */
  match: 'filename' | 'fulltext'
  /** 全文命中分数（BM25）与上下文片段 */
  score?: number
  snippet?: string
}

export interface SearchScope {
  /** 项目名；空表示当前用户可见的全部项目 */
  project?: string
  /** 项目内起始目录；空表示项目根 */
  path?: string
}

export interface Config {
  /** 单次搜索最大命中数 */
  maxHits: number
  /** 是否跳过隐藏项 */
  skipHidden: boolean
  /** 全文索引单文件大小上限（字节），超限跳过不索引 */
  maxIndexBytes: number
}

export const Config: z<Config> = z.object({
  maxHits: z.number().default(200),
  skipHidden: z.boolean().default(true),
  maxIndexBytes: z.number().default(512 * 1024),
})

declare module '@deepseek-ai/cordis' {
  interface Context {
    search: SearchService
  }
}

/* ---------- CJK bigram 分词 ---------- */
/** 英文/数字词 + 中文 bigram（连续中文字符串按每 2 字切 token，单字保留）。 */
export function tokenize(text: string): string[] {
  const out: string[] = []
  const lower = text.toLowerCase()
  for (const m of lower.match(/[a-z0-9_]+/g) ?? []) out.push(m)
  for (const seg of lower.match(/[\u4e00-\u9fff]+/g) ?? []) {
    if (seg.length === 1) { out.push(seg); continue }
    for (let i = 0; i < seg.length - 1; i++) out.push(seg.slice(i, i + 2))
  }
  return out
}

export class SearchService extends Service {
  /** 全文文档：id(project::path) → { text, tokens: Map<token, tf>, len } */
  private readonly docs = new Map<string, { text: string; tokens: Map<string, number>; len: number }>()
  /** 倒排索引：token → Map<docId, tf> */
  private readonly postings = new Map<string, Map<string, number>>()
  private totalLen = 0

  constructor(ctx: Context, private readonly config: Config) {
    super(ctx, 'search')
    ctx.on('dispose', () => { this.docs.clear(); this.postings.clear(); this.totalLen = 0 })
  }

  /* ---------- 文件名搜索（批次①，行为不变） ---------- */

  async query(
    q: string,
    scope: SearchScope = {},
    visible: string[] = [],
    list: (project: string, subPath?: string) => Promise<{ name: string; isDir: boolean }[]>,
    resolve: (project: string, relPath: string) => string | null,
  ): Promise<SearchHit[]> {
    const keyword = q.trim().toLowerCase()
    if (keyword === '') return []
    const projects = scope.project !== undefined && scope.project !== ''
      ? (visible.includes(scope.project) ? [scope.project] : [])
      : visible
    const hits: SearchHit[] = []
    for (const project of projects) {
      await this.walk(project, scope.path ?? '', keyword, list, resolve, hits)
      if (hits.length >= this.config.maxHits) break
    }
    return hits.slice(0, this.config.maxHits)
  }

  private async walk(
    project: string,
    rel: string,
    keyword: string,
    list: (project: string, subPath?: string) => Promise<{ name: string; isDir: boolean }[]>,
    resolve: (project: string, relPath: string) => string | null,
    out: SearchHit[],
  ): Promise<void> {
    if (out.length >= this.config.maxHits) return
    const entries = await list(project, rel)
    for (const e of entries) {
      if (this.config.skipHidden && e.name.startsWith('.')) continue
      const childPath = rel === '' ? e.name : `${rel}/${e.name}`
      if (e.name.toLowerCase().includes(keyword)) {
        out.push({ project, path: childPath, name: e.name, isDir: e.isDir, match: 'filename' })
        if (out.length >= this.config.maxHits) return
      }
      if (e.isDir) {
        await this.walk(project, childPath, keyword, list, resolve, out)
      }
    }
  }

  /* ---------- 全文索引（批次② 真实实现） ---------- */

  /** 写入/更新一篇文档到全文索引。 */
  async index(doc: { id: string; text: string }): Promise<{ ok: boolean }> {
    if (!doc.id || typeof doc.text !== 'string') return { ok: false }
    if (Buffer.byteLength(doc.text, 'utf8') > this.config.maxIndexBytes) return { ok: false }
    await this.remove(doc.id) // 先清旧
    const tokens = tokenize(doc.text)
    if (tokens.length === 0) return { ok: true }
    const tf = new Map<string, number>()
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1)
    this.docs.set(doc.id, { text: doc.text, tokens: tf, len: tokens.length })
    this.totalLen += tokens.length
    for (const [t, count] of tf) {
      const post = this.postings.get(t) ?? new Map<string, number>()
      post.set(doc.id, count)
      this.postings.set(t, post)
    }
    return { ok: true }
  }

  /** 从全文索引移除一篇文档。 */
  async remove(id: string): Promise<{ ok: boolean }> {
    const doc = this.docs.get(id)
    if (!doc) return { ok: true }
    this.docs.delete(id)
    this.totalLen -= doc.len
    for (const t of doc.tokens.keys()) {
      const post = this.postings.get(t)
      if (!post) continue
      post.delete(id)
      if (post.size === 0) this.postings.delete(t)
    }
    return { ok: true }
  }

  /** 全文检索：BM25 打分 + 片段（±40 字符）。 */
  async searchFulltext(q: string, scope: SearchScope = {}, visible: string[] = []): Promise<SearchHit[]> {
    const query = q.trim()
    if (query === '') return []
    const terms = tokenize(query)
    if (terms.length === 0) return []
    const projects = new Set(
      scope.project !== undefined && scope.project !== ''
        ? (visible.includes(scope.project) ? [scope.project] : [])
        : visible,
    )
    const N = this.docs.size
    if (N === 0) return []
    const avgdl = this.totalLen / N
    const k1 = 1.5
    const b = 0.75

    // 候选文档（倒排并集）
    const candidates = new Map<string, number>() // docId → 累加分数
    const seen = new Set<string>()
    for (const term of terms) {
      const post = this.postings.get(term)
      if (!post) continue
      const df = post.size
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5))
      for (const [docId, tf] of post) {
        if (seen.has(docId)) continue
        seen.add(docId)
        const doc = this.docs.get(docId)
        if (!doc) continue
        const sep = docId.indexOf('::')
        const project = docId.slice(0, sep)
        if (!projects.has(project)) continue
        const denom = tf + k1 * (1 - b + b * (doc.len / avgdl))
        candidates.set(docId, idf * ((tf * (k1 + 1)) / denom))
      }
    }
    const ranked = [...candidates.entries()].sort((a, b) => b[1] - a[1]).slice(0, this.config.maxHits)
    const hits: SearchHit[] = []
    for (const [docId, score] of ranked) {
      const doc = this.docs.get(docId)
      if (!doc) continue
      const sep = docId.indexOf('::')
      const project = docId.slice(0, sep)
      const path = docId.slice(sep + 2)
      const name = path.includes('/') ? path.slice(path.lastIndexOf('/') + 1) : path
      hits.push({
        project,
        path,
        name,
        isDir: false,
        match: 'fulltext',
        score,
        snippet: makeSnippet(doc.text, terms),
      })
    }
    return hits
  }

  /** 索引统计（调试/监控）。 */
  stats(): { docs: number; postings: number; totalLen: number } {
    return { docs: this.docs.size, postings: this.postings.size, totalLen: this.totalLen }
  }
}

/** 在原文中定位首个命中词，截取 ±40 字符片段。 */
function makeSnippet(text: string, terms: string[]): string {
  const flat = text.replace(/\s+/g, ' ')
  let idx = -1
  for (const t of terms) {
    const i = flat.toLowerCase().indexOf(t)
    if (i >= 0 && (idx === -1 || i < idx)) idx = i
  }
  if (idx < 0) return flat.slice(0, 80)
  const start = Math.max(0, idx - 40)
  const end = Math.min(flat.length, idx + 40)
  return (start > 0 ? '…' : '') + flat.slice(start, end) + (end < flat.length ? '…' : '')
}

/** 插件挂载：注册 SearchService 到 ctx.search。 */
export const name = 'privhub-svc-search'
export function apply(ctx: Context, config: Config): void {
  new SearchService(ctx, config)
}
