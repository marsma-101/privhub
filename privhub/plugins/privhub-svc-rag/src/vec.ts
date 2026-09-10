/**
 * privhub-svc-rag · vec.ts — 向量存储（better-sqlite3 + sqlite-vec，零服务依赖）
 *
 * 向量库文件：data/rag-corpus/vectors.db
 * 只存 chunk_id → 向量（浮点数组）；原文文本始终在 S7 加密的语料 jsonl，
 * 检索流程：命中向量 → chunk_id → 回读加密文本（向量本身不可逆，隐私可接受；
 * 如需强隔离可后续加整库解密内存模式）。
 *
 * @module privhub-svc-rag/vec
 */

import Database from 'better-sqlite3'
import { load as sqliteVecLoad } from 'sqlite-vec'

export interface VecHit {
  chunkId: string   // docId#cN（docId = project::path）
  distance: number
}

export class VectorStore {
  private db: Database.Database
  private dimCache: number | null = null

  constructor(private readonly file: string) {
    this.db = new Database(file)
    this.db.pragma('journal_mode = WAL')
    sqliteVecLoad(this.db as unknown as never)
  }

  /** 表维度（创建时确定，模型固定后不变） */
  dims(): number | null {
    if (this.dimCache !== null) return this.dimCache
    try {
      const row = this.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='rag_vec'").get() as { sql?: string } | undefined
      const m = /FLOAT\[(\d+)\]/.exec(row?.sql ?? '')
      this.dimCache = m ? Number(m[1]) : null
      return this.dimCache
    } catch { return null }
  }

  ensureTable(dim: number): void {
    this.dimCache = dim
    this.db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS rag_vec USING vec0(chunk_id TEXT PRIMARY KEY, embedding FLOAT[${dim}])`)
  }

  /** 维度变更（换 embedding 模型）时重建表（旧向量作废，调用方将全量重灌） */
  rebuildTable(dim: number): void {
    this.db.exec('DROP TABLE IF EXISTS rag_vec')
    this.dimCache = null
    this.ensureTable(dim)
  }

  upsert(chunkId: string, vec: Float32Array): void {
    const dim = this.dims()
    if (dim === null) throw new Error('向量表未初始化（维度未知）')
    if (vec.length !== dim) throw new Error('向量维度与表不符: ' + vec.length + ' vs ' + dim)
    // vec0 虚拟表不支持 UPSERT：先删后插（调用方已按 allIds 跳过已有块，此兜底仅防并发重复）
    this.db.prepare('DELETE FROM rag_vec WHERE chunk_id = ?').run(chunkId)
    this.db.prepare('INSERT INTO rag_vec (chunk_id, embedding) VALUES (?, ?)').run(chunkId, vec)
  }

  has(chunkId: string): boolean {
    const r = this.db.prepare('SELECT 1 FROM rag_vec WHERE chunk_id = ?').get(chunkId)
    return !!r
  }

  count(): number {
    try {
      const r = this.db.prepare('SELECT COUNT(*) AS n FROM rag_vec').get() as { n: number }
      return r?.n ?? 0
    } catch { return 0 }
  }

  /** 删除某文档的全部块（chunk_id 前缀 = docId） */
  removeDoc(docId: string): void {
    this.db.prepare('DELETE FROM rag_vec WHERE chunk_id LIKE ?').run(docId + '#%')
  }

  /** 向量相似检索（topK；可再按前缀过滤） */
  search(vec: Float32Array, k: number, projectPrefix?: string): VecHit[] {
    const dim = this.dims()
    if (dim === null || vec.length !== dim) return []
    const stmt = this.db.prepare('SELECT chunk_id, distance FROM rag_vec WHERE embedding MATCH ? AND k = ? ORDER BY distance')
    const rows = stmt.all(vec, k) as Array<{ chunk_id: string; distance: number }>
    return rows
      .filter((r) => !projectPrefix || r.chunk_id.startsWith(projectPrefix))
      .map((r) => ({ chunkId: r.chunk_id, distance: r.distance }))
  }

  /** 全部 chunk_id（续跑断点用；表不存在返回空） */
  allIds(): Set<string> {
    try {
      const rows = this.db.prepare('SELECT chunk_id FROM rag_vec').all() as Array<{ chunk_id: string }>
      return new Set(rows.map((r) => r.chunk_id))
    } catch { return new Set() }
  }

  close(): void { this.db.close() }
}