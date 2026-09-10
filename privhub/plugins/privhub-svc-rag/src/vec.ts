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
import { createHash } from 'node:crypto'
import { load as sqliteVecLoad } from 'sqlite-vec'

/**
 * D9：向量库是明文 SQLite（无法像其它数据那样整体加密，因为要交给
 * better-sqlite3 直接打开）。原始实现把 chunk_id 写成 `project::path#cN`，
 * 于是宿主机直接打开 vectors.db 就能读出全部文件名与目录结构。
 *
 * 修复：向量表内只存【文档键的 sha256 摘要】，真实 docId 只保留在
 * 已加密的 manifest.json 与语料 jsonl 中（它们本就经 svc-storage 加密）。
 * 摘要不可逆，且向量本身也不可逆，明文库不再泄露路径信息。
 */
export function docKeyOf(docId: string): string {
  return createHash('sha256').update(docId).digest('hex').slice(0, 32)
}

/** 向量库 chunk_id 的格式版本；格式变更时自动重建（旧向量作废并重灌）。 */
export const VEC_ID_FORMAT = 'hashed-v1'

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
    this.migrateIdFormat()
  }

  /**
   * D9：chunk_id 格式从「明文 project::path#cN」改为「sha256 摘要#cN」。
   * 升级时旧格式的记录会让检索永远命中不到（回读 docId 失败），
   * 因此检测到格式版本不符时清空向量表，由调用方按需重新向量化。
   */
  private migrateIdFormat(): void {
    try {
      this.db.exec('CREATE TABLE IF NOT EXISTS rag_meta (k TEXT PRIMARY KEY, v TEXT)')
      const row = this.db.prepare("SELECT v FROM rag_meta WHERE k = 'idFormat'").get() as { v?: string } | undefined
      if (row?.v === VEC_ID_FORMAT) return
      // 格式不符（首次使用或从旧版升级）：丢弃旧向量，重灌即可恢复
      this.db.exec('DROP TABLE IF EXISTS rag_vec')
      this.db.prepare("INSERT INTO rag_meta (k, v) VALUES ('idFormat', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").run(VEC_ID_FORMAT)
      this.dimCache = null
    } catch { /* 迁移失败不阻断启动；后续 ensureTable 会重新建表 */ }
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

  /** 删除某文档的全部块（D9：入参为 docKeyOf(docId) 摘要，与写入格式一致） */
  removeDoc(docId: string): void {
    try {
      this.db.prepare('DELETE FROM rag_vec WHERE chunk_id LIKE ?').run(docKeyOf(docId) + '#%')
    } catch { /* 表不存在等情形忽略 */ }
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