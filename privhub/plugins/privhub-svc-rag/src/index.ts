/**
 * privhub-svc-rag — RAG 语料治理插件（P1 核心，L3）
 *
 * 数据质量优先：原文（S7）不动，全部清洗/去重/策展作用于派生语料层。
 *
 * 能力：
 *   - 摄取：监听 file:changed / file:saved 增量 + 启动全量扫描（跳过 .agents/.trash）
 *   - 解析矩阵：md/txt（编码检测）· docx/xlsx/pptx/pdf（复用 svc-office）· html 去标签
 *   - 清洗：BOM/零宽/CRLF 归一、连续空行压缩；frontmatter 元数据提取（rag:false 自声明不进语料）
 *   - 去重：内容哈希（精确）+ MinHash banding（近似候选）→ 待裁决清单（不自动删除）
 *   - 冲突组：版本系列命名归一（v2/副本/final/日期 等）同族分组
 *   - 策展台账 data/rag-curation.json：keep-canonical / exclude / expire / merge / 反操作
 *   - 语料：data/rag-corpus/<docHash>.jsonl（S7 加密，结构感知分块）+ manifest.json
 *   - 全量重建（admin）：幂等（内容哈希未变跳过），清除已删除文档的语料
 *   - 模型配置/自检 API（admin）：转发到 svc-model（运维填 baseURL+模型名即用）
 *
 * 检索与问答（P2）预留：manifest/chunks 携带 vector 字段位，分块与元数据先行。
 *
 * @module privhub-svc-rag
 */

import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createHash } from 'node:crypto'
import { join, extname, basename, dirname } from 'node:path'
import { readdir, stat, mkdir } from 'node:fs/promises'
import { existsSync, readFileSync, unlinkSync } from 'node:fs'
import { networkInterfaces } from 'node:os'
import { VectorStore, docKeyOf } from './vec'
// 错误文案脱敏：本插件的 catch 把 e.message 原样回给前端（toast / SSE error 帧），
// 是密钥可能外泄的最后一道边界，与 svc-model 内部同一套规则（W-B/§1.5）。
import { sanitizeError } from '../../privhub-svc-model/src/index'

export const name = 'privhub-svc-rag'
export const inject = ['privhub', 'storage', 'audit', 'eventBus', 'model', 'office', 'search', 'acl']

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()
const CORPUS_DIR = join(rootDir, 'data', 'rag-corpus')
const MANIFEST_FILE = join(CORPUS_DIR, 'manifest.json')
const CURATION_FILE = join(rootDir, 'data', 'rag-curation.json')
const VEC_STATE_FILE = join(rootDir, 'data', 'rag-vectorize.json')
const VEC_DB_FILE = join(CORPUS_DIR, 'vectors.db')
/** 问答检索块上限 */
const ASK_TOPK = 6

/* 【扩展名一处定义】本插件不再自己写文本 / Office 清单，改为从 `privhub-core/src/file-exts` **显式派生**：
 *   · `RAG_TEXT_EXTS` = 可索引的纯文本 −（配置族 `.env` ∪ `RAG_EXCLUDED_EXTS` 的 `.jsonl/.tsv/.ipynb`）；
 *   · `OFFICE_EXTS`   = 基础集合里的 Office 那一份，与 `privhub-svc-office` 同值。
 * 为什么"要不要向量化"要单独派生而**不是**直接用可预览那套：「进向量库」比「能打开」代价高得多
 * （切块 + 远程 embed + 落库），且错的进库会污染问答召回 —— 见 `file-exts.ts` 的「逐用途派生」表。
 * ⚠ **有意保持迁前范围**：`.jsonl/.tsv/.ipynb/.env` 本批**不进** RAG（迁前也不在），属"不扩权"。 */
import { RAG_TEXT_EXTS, OFFICE_EXTS as SHARED_OFFICE_EXTS } from '../../privhub-core/src/file-exts'
import type { UserRecord } from '../../privhub-core/src/index'
import { readJsonStore, readJsonStoreLenient } from '../../privhub-core/src/json-store'
const TEXT_EXTS = new Set(RAG_TEXT_EXTS)
const OFFICE_EXTS = new Set(SHARED_OFFICE_EXTS)
/** 单文档解析上限（Office 由 svc-office 自身 32MB 限制拦截） */
const MAX_PARSE_BYTES = 8 * 1024 * 1024
/** 分块目标（中文场景 ~400-600 token 对应字符量） */
const CHUNK_MAX = 1600
const CHUNK_OVERLAP = 150
/** MinHash 参数：16 特征 = 4 band × 4 rows */
const MINHASH_FEATURES = 16
const MINHASH_BANDS = 4
const NEAR_THRESHOLD = 0.55

interface CorpusDoc {
  docId: string            // project::path
  project: string
  path: string
  type: string
  author: string
  updated: number          // mtime ms
  size: number
  hash: string             // 规范化内容哈希（去重/变更检测）
  minHash: number[] | null // 近似重复指纹
  dupHash: string          // 精确去重键
  versions: string         // 版本族（命名归一后 basename）
  canonical: boolean
  excluded: boolean
  expiredAt: number | null
  mergedInto: string | null
  scanOnly: boolean        // 扫描件（PDF 无文本层）→ 不进语料
  chunks: number
  reparsedAt: number
}
type Manifest = Record<string, CorpusDoc>

interface CurationRec {
  at: number
  by: string
  action: string
  docIds: string[]
  note?: string
}
type CurationLog = CurationRec[]

interface ChunkRec {
  docId: string
  chunkId: string
  seq: number
  text: string
  meta: { project: string; path: string; type: string; author: string; updated: number }
}

/* ============ 工具 ============ */

function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(Buffer.byteLength(payload)),
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'no-referrer',
  })
  res.end(payload)
}
function readBody(req: IncomingMessage, max = 4 * 1024 * 1024): Promise<string> {
  return new Promise((ok, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (c: Buffer) => { size += c.length; if (size > max) { reject(new Error('请求体过大')); req.destroy(); return } chunks.push(c) })
    req.on('end', () => ok(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}
function sha256(s: string): string { return createHash('sha256').update(s).digest('hex') }
function docIdOf(project: string, path: string): string { return project + '::' + path }

/** 规范化文本（去重与变更检测用）：\r 归一、去 BOM/零宽、压缩连续空白 */
function normalizeText(raw: string): string {
  let t = raw.replace(/^\uFEFF/, '').replace(/[\u200B-\u200D\u2060]/g, '')
  t = t.replace(/\r\n?/g, '\n')
  t = t.replace(/[ \t]+\n/g, '\n')
  t = t.replace(/\n{3,}/g, '\n\n').trim()
  return t
}

/** 解析 md frontmatter（--- key: value ---） */
function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw)
  if (!m) return { meta: {}, body: raw }
  const meta: Record<string, string> = {}
  for (const line of m[1].split('\n')) {
    const kv = /^([A-Za-z_][\w]*)\s*:\s*(.+)$/.exec(line.trim())
    if (kv) meta[kv[1].toLowerCase()] = kv[2].trim()
  }
  return { meta, body: raw.slice(m[0].length) }
}

/** 清洗后的语料文本（保留结构；原文不动） */
function cleanText(raw: string): string {
  return normalizeText(raw)
}

/** 版本族命名归一：xxx_v2.md / xxx-副本.md / xxx(终稿).docx / xxx-2026-09.md → xxx */
function versionFamily(name: string): string {
  let b = basename(name)
  b = b.replace(/\.[^.]+$/, '')
  b = b.replace(/[\s_\-]*([vV]\d+([.\-]\d+)?|副本|拷贝|终稿|最终|final|FINAL|新|旧|备份|backup)$/g, '')
  b = b.replace(/[\s_\-]*\(([^)]*)\)$/g, ($0, inner: string) => (/^\d{4}[-/.]?\d{0,2}[-/.]?\d{0,2}$/.test(inner) ? '' : $0))
  b = b.trim().toLowerCase()
  return b || basename(name)
}

/** 结构感知分块：md 按标题族优先；其余按段落聚合；块间重叠尾窗 */
/**
 * D9：从向量表的 chunk_id（形如 `<docKey>#cN`）反查真实 docId。
 * 旧格式（`project::path#cN`）在升级后无法反查，返回 null 由调用方丢弃。
 */
function docIdOfChunk(chunkId: string, keyToDocId: Map<string, string>): string | null {
  const idx = chunkId.lastIndexOf('#')
  if (idx <= 0) return null
  return keyToDocId.get(chunkId.slice(0, idx)) ?? null
}

function chunkText(text: string, docId: string, project: string, path: string, type: string, author: string, updated: number): ChunkRec[] {
  const meta = { project, path, type, author, updated }
  // D9：chunkId 进向量表（明文 SQLite），因此只放 docId 的摘要，不放路径
  const docKey = docKeyOf(docId)
  const blocks: string[] = []
  if (type === 'markdown' || /\.md$/i.test(path)) {
    // 按 ##/### 标题切分；保留标题行在块首
    const lines = text.split('\n')
    let cur = ''
    for (const line of lines) {
      if (/^#{1,4}\s/.test(line) && cur.trim()) { blocks.push(cur.trim()); cur = '' }
      cur += line + '\n'
    }
    if (cur.trim()) blocks.push(cur.trim())
  }
  if (blocks.length === 0) {
    const paras = text.split(/\n\s*\n/)
    let cur = ''
    for (const p of paras) {
      if ((cur + '\n' + p).length > CHUNK_MAX && cur.trim()) { blocks.push(cur.trim()); cur = p }
      else cur = cur ? cur + '\n\n' + p : p
    }
    if (cur.trim()) blocks.push(cur.trim())
  }
  // 超长块二次切分 + 重叠窗
  const out: ChunkRec[] = []
  let seq = 0
  for (let b of blocks) {
    if (b.length <= CHUNK_MAX) { out.push({ docId, chunkId: docKey + '#c' + out.length, seq: seq++, text: b, meta }); continue }
    let pos = 0
    while (pos < b.length) {
      let end = pos + CHUNK_MAX
      // 尽量在换行处断开
      if (end < b.length) { const nl = b.lastIndexOf('\n', end); if (nl > pos + CHUNK_MAX / 2) end = nl }
      const part = b.slice(pos, Math.min(end, b.length)).trim()
      if (part) out.push({ docId, chunkId: docKey + '#c' + out.length, seq: seq++, text: part, meta })
      const next = Math.max(pos + 1, end - CHUNK_OVERLAP)
      if (next <= pos) break
      pos = next
    }
  }
  return out
}

/** MinHash 16 特征（4-gram shingle） */
function minHashOf(text: string): number[] {
  const nd = normalizeText(text)
  if (nd.length < 8) return []
  const FEATURES = MINHASH_FEATURES
  const sig: number[] = Array.from({ length: FEATURES }, () => Infinity)
  for (let i = 0; i + 4 <= nd.length; i += 2) {
    const h = createHash('sha256').update(nd.slice(i, i + 4)).digest()
    for (let k = 0; k < FEATURES; k++) {
      const v = h.readUInt32BE(k * 2 % 28) // 16 × 4 字节 散布
      const w = (v + k * 2654435761) >>> 0 // 洗牌偏移
      if (w < sig[k]) sig[k] = w
    }
  }
  return sig.map((v) => (v === Infinity ? 0 : v))
}

/**
 * MinHash 签名一致率 = 逐位相同的比例，是标准的 Jaccard 相似度估计量
 * （16 特征 → 分辨率 1/16 ≈ 0.0625）。
 *
 * 为什么不用「命中 band 数 / 总 band」：banding 只负责把 O(n²) 的两两比较
 * 收敛成候选对，它给出的相似度只有 0 / 0.25 / 0.5 / 0.75 / 1 五档（4 band）。
 * 阈值 NEAR_THRESHOLD = 0.55 正好落在 0.5 与 0.75 之间 —— 按 band 比算，
 * 实际门槛被抬到「3/4 band 全中」，近似文档几乎不会被报出；而且前端要显示
 * 「相似度百分比」，五档值根本给不出。签名一致率是连续量，可直接与阈值比较、
 * 也可直接当百分比展示。
 */
function minHashSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  if (n === 0) return 0
  let same = 0
  for (let i = 0; i < n; i++) if (a[i] === b[i]) same++
  return same / n
}

/**
 * 近似重复候选：MinHash banding 出候选对 → 按签名一致率算真实相似度，低于
 * NEAR_THRESHOLD 丢弃（L1 口径：只报告、不做删除）。
 *
 * 修复记录（2026-10-11）：迁前这里把 score 写死 0.25，而过滤条件是
 * `score >= NEAR_THRESHOLD * 0.5`（= 0.275）⇒ 0.25 < 0.275，函数恒返回空数组，
 * MinHash 那套从未生效（near 类在「待裁决」里永远缺席）。现在 score 是真实算出来的。
 */
function nearCandidates(docs: CorpusDoc[]): Array<{ a: string; b: string; score: number }> {
  const sigOf = new Map<string, number[]>()
  for (const d of docs) {
    if (d.minHash && d.minHash.length >= MINHASH_FEATURES) sigOf.set(d.docId, d.minHash)
  }
  const rows = Math.floor(MINHASH_FEATURES / MINHASH_BANDS)
  const bucket = new Map<string, string[]>()
  const pairs = new Map<string, { a: string; b: string; score: number }>()
  for (const [id, sig] of sigOf) {
    for (let b = 0; b < MINHASH_BANDS; b++) {
      const key = b + ':' + sha256(sig.slice(b * rows, (b + 1) * rows).join(',')).slice(0, 8)
      const list = bucket.get(key) ?? []
      for (const other of list) {
        if (other === id) continue
        const a = id < other ? id : other
        const b2 = id < other ? other : id
        const pk = a + '\u0000' + b2 // 路径/项目名不含换行，分隔符不会与内容撞车
        if (pairs.has(pk)) continue // 同一对可能在多个 band 撞桶 → 只算一次
        pairs.set(pk, { a, b: b2, score: minHashSimilarity(sigOf.get(a)!, sigOf.get(b2)!) })
      }
      list.push(id)
      bucket.set(key, list)
    }
  }
  return [...pairs.values()]
    .map((x) => ({ ...x, score: Math.round(x.score * 100) / 100 }))
    .filter((x) => x.score >= NEAR_THRESHOLD)
}

/* ============ 存储 ============ */

async function loadManifest(ctx: Context): Promise<Manifest> {
  /* D4：语料清单是**派生数据**（真身是盘上的语料文件），丢了重建一次即可 ——
   * 所以用宽容版：隔离存证 + 记日志，但不因此让整个 RAG 功能不可用。
   * 与下面的 loadCuration（人工整理的记录，丢了找不回来）区别对待。 */
  const raw = await readJsonStoreLenient<{ docs?: Manifest }>(ctx.storage, MANIFEST_FILE, {})
  return raw.docs ?? {}
}
async function saveManifest(ctx: Context, m: Manifest): Promise<void> {
  await mkdir(CORPUS_DIR, { recursive: true })
  await ctx.storage.writeText(MANIFEST_FILE, JSON.stringify({ version: 1, docs: m }, null, 1))
}
async function loadCuration(ctx: Context): Promise<CurationLog> {
  /* D4：整理记录是**人工成果**、丢了找不回来 —— 损坏时隔离存证并抛错，
   * 免得下一次追加把之前的记录全部覆盖成只剩这一条。 */
  return readJsonStore<CurationLog>(ctx.storage, CURATION_FILE, [])
}
async function saveCuration(ctx: Context, log: CurationLog): Promise<void> {
  await ctx.storage.writeText(CURATION_FILE, JSON.stringify(log, null, 1))
}
function chunkFileOf(docId: string): string { return join(CORPUS_DIR, sha256(docId).slice(0, 16) + '.jsonl') }

/* ============ 摄取 ============ */

async function parseToText(ctx: Context, project: string, relPath: string, absPath: string): Promise<{ text: string; type: string; scanOnly: boolean } | null> {
  const ext = extname(absPath).slice(1).toLowerCase()
  const name = basename(relPath)
  if (TEXT_EXTS.has(ext)) {
    const s = await stat(absPath).catch(() => null)
    if (!s || s.size > MAX_PARSE_BYTES) return null
    const buf = await ctx.storage.readBuffer(absPath).catch(() => null)
    if (!buf) return null
    const ok = new TextDecoder('utf-8', { fatal: true })
    let raw: string
    try { raw = ok.decode(buf) } catch { raw = new TextDecoder('gbk').decode(buf) }
    const { meta, body } = parseFrontmatter(raw)
    if (meta.rag === 'false') return null // 文档自声明不进语料
    // S4 安全修复：meta.type 来自文件 frontmatter（用户可控）且会经前端 v-html 渲染，
    // 必须归一化到安全字符集，异常值降级为 text。
    const rawType = ext === 'md' || ext === 'markdown' ? 'markdown' : (meta.type || 'text')
    const type = /^[A-Za-z0-9_-]{1,16}$/.test(rawType) ? rawType : 'text'
    return { text: cleanText(meta.title ? `# ${meta.title}\n\n` : '') + cleanText(body), type, scanOnly: false }
  }
  if (OFFICE_EXTS.has(ext)) {
    const r = await ctx.office.read(project, relPath).catch(() => ({ ok: false as const, kind: 'unknown' as const, error: 'read fail' }))
    if (!r.ok) return null
    const c = r.content as any
    let text = ''
    if (r.kind === 'doc' || r.kind === 'docx') text = String(c?.text ?? '')
    else if (r.kind === 'pdf') {
      text = String(c?.text ?? '')
      if (text.trim().length < 20) return { text: '', type: 'pdf', scanOnly: true } // 扫描件
      text = `[PDF ${c?.pages ?? '?'}页]\n` + text
    } else if (r.kind === 'xlsx') {
      text = (c?.sheets ?? []).map((s: any) => `[表 ${s?.name ?? ''}]\n` + (s?.rows ?? []).map((row: unknown[]) => row.map((v) => String(v ?? '')).join(' | ')).join('\n')).join('\n\n')
    } else if (r.kind === 'pptx') {
      text = (c?.slides ?? []).map((s: any) => typeof s === 'string' ? s : String(s?.text ?? s?.title ?? JSON.stringify(s))).join('\n\n')
    }
    return { text: cleanText(text), type: r.kind, scanOnly: false }
  }
  if (ext === 'html' || ext === 'htm') {
    const s = await stat(absPath).catch(() => null)
    if (!s || s.size > MAX_PARSE_BYTES) return null
    const buf = await ctx.storage.readBuffer(absPath).catch(() => null)
    if (!buf) return null
    const raw = buf.toString('utf8')
    const text = raw
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    if (cleanText(text).length < 20) return null
    return { text: cleanText(text), type: 'html', scanOnly: false }
  }
  return null // 图片/压缩包等不进语料
}

/** 摄取单文档（幂等：hash 未变跳过）。串行队列防风暴。manifestRef 供全量重建复用，避免反复 IO。 */
async function ingestDoc(ctx: Context, project: string, path: string, knownText?: string, manifestRef?: Manifest): Promise<void> {
  /* 个人空间（= 智能体沙箱）绝不进语料库。
   * 为什么必须在【摄取口】拦：管理员端 /privhub/api/rag/corpus 是 adminOnly 且
   * 不按 canAccess 过滤，会原样列出每条语料的 project/path——私人目录名与文件名
   * 因此会直接暴露给管理员。全量 rebuild 走 allProjects() 已天然排除个人空间，
   * 但 file:changed 事件驱动这条增量路径原先没有防护，上传即泄密，
   * 直到下一次重启重建才被清掉（实测存在该时间窗）。 */
  if (ctx.privhub.isPersonalDir(project)) return
  const abs = await ctx.privhub.resolveReal(project, path)
  if (abs === null || !existsSync(abs)) return
  const s = await stat(abs).catch(() => null)
  if (!s || s.isDirectory()) return
  let parsed: { text: string; type: string; scanOnly: boolean } | null = null
  if (knownText !== undefined) {
    const raw = knownText
    const { meta, body } = parseFrontmatter(raw)
    if (meta.rag === 'false') { await removeDoc(ctx, project, path, manifestRef); return }
    parsed = { text: cleanText(body), type: meta.type || 'markdown', scanOnly: false }
  } else {
    parsed = await parseToText(ctx, project, path, abs)
  }
  if (parsed === null) { await removeDoc(ctx, project, path, manifestRef); return }
  const docId = docIdOf(project, path)
  const hash = sha256(parsed.scanOnly ? '' : normalizeText(parsed.text))
  const manifest = manifestRef ?? await loadManifest(ctx)
  const existing = manifest[docId]
  if (existing && existing.hash === hash && existing.scanOnly === parsed.scanOnly) return
  const name = basename(path)
  const doc: CorpusDoc = {
    docId, project, path,
    type: parsed.type,
    author: existing?.author ?? 'unknown',
    updated: s.mtimeMs,
    size: s.size,
    hash,
    minHash: parsed.scanOnly ? [] : minHashOf(parsed.text),
    dupHash: sha256(normalizeText(parsed.text)),
    versions: versionFamily(name),
    canonical: existing?.canonical ?? true,
    excluded: existing?.excluded ?? false,
    expiredAt: existing?.expiredAt ?? null,
    mergedInto: existing?.mergedInto ?? null,
    scanOnly: parsed.scanOnly,
    chunks: 0,
    reparsedAt: Date.now(),
  }
  manifest[docId] = doc
  await saveManifest(ctx, manifest)
  const rec: ChunkRec[] = doc.excluded || doc.scanOnly || doc.expiredAt !== null || doc.mergedInto
    ? []
    : chunkText(parsed.scanOnly || parsed.text === '' ? '' : parsed.text, docId, project, path, doc.type, doc.author, doc.updated)
  doc.chunks = rec.length
  const f = chunkFileOf(docId)
  await mkdir(CORPUS_DIR, { recursive: true })
  await ctx.storage.writeText(f, rec.map((c) => JSON.stringify(c)).join('\n'))
  await saveManifest(ctx, manifest)
}

async function removeDoc(ctx: Context, project: string, path: string, manifestRef?: Manifest): Promise<void> {
  const docId = docIdOf(project, path)
  const manifest = manifestRef ?? await loadManifest(ctx)
  if (manifest[docId]) {
    delete manifest[docId]
    await saveManifest(ctx, manifest)
  }
  const f = chunkFileOf(docId)
  if (existsSync(f)) await ctx.storage.writeText(f, '').catch(() => {})
  // 同时清理向量表中的块。仅在向量库已存在时操作，
  // 避免为从不使用向量检索的部署凭空创建 db 文件。
  try { if (vecStore) vecStore.removeDoc(docId) } catch { /* 向量库不可用时忽略 */ }
}

/**
 * 移除某个顶层目录（项目 / 个人空间）名下的全部语料与向量。
 *
 * 为什么需要：个人空间改名后，【旧目录名】既不是项目、也不再登记为任何人的
 * 个人空间——此时它既不会被 allProjects() 扫到（rebuild 的 gone 逻辑失效），
 * 也不受「个人空间不进入索引」类判断保护。若不清理：
 *   ① 管理员端 /rag/corpus 不按权限过滤，仍会列出这些私人文档的 project/path；
 *   ② 检索索引里留下指向不存在目录的孤儿条目。
 * 因此改名时必须把旧目录名下的语料彻底清掉。
 */
async function removeProjectDocs(ctx: Context, project: string): Promise<number> {
  if (!project) return 0
  const manifest = await loadManifest(ctx)
  let n = 0
  for (const id of Object.keys(manifest)) {
    if (manifest[id]?.project !== project) continue
    delete manifest[id]
    const f = chunkFileOf(id)
    if (existsSync(f)) await ctx.storage.writeText(f, '').catch(() => { /* 尽力而为 */ })
    try { if (vecStore) vecStore.removeDoc(id) } catch { /* 向量库不可用时忽略 */ }
    n++
  }
  if (n > 0) await saveManifest(ctx, manifest)
  return n
}

/** 全量重建：扫描 dataRoot 所有项目（跳过隐藏）；幂等；移除已消失文档的语料 */
async function rebuild(ctx: Context): Promise<{ scanned: number; updated: number; removed: number }> {
  const stats = { scanned: 0, updated: 0, removed: 0 }
  const manifest = await loadManifest(ctx)
  const projects = await ctx.privhub.allProjects()
  const seen = new Set<string>()
  const walk = async (project: string, rel: string): Promise<void> => {
    const dir = await ctx.privhub.resolveReal(project, rel)
    if (dir === null || !existsSync(dir)) return
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
    for (const e of entries) {
      if (e.name.startsWith('.')) continue
      const child = rel === '' ? e.name : rel + '/' + e.name
      if (e.isDirectory() && !e.isSymbolicLink()) await walk(project, child)
      else if (e.isFile()) {
        const id = docIdOf(project, child)
        seen.add(id)
        stats.scanned++
        const beforeHash = manifest[id]?.hash
        await ingestDoc(ctx, project, child, undefined, manifest)
        if (manifest[id]?.hash !== beforeHash) stats.updated++
      }
    }
  }
  for (const p of projects) await walk(p, '')
  const gone = Object.keys(manifest).filter((id) => !seen.has(id))
  for (const id of gone) {
    delete manifest[id]
    const f = chunkFileOf(id)
    if (existsSync(f)) await ctx.storage.writeText(f, '').catch(() => {})
    stats.removed++
  }
  await saveManifest(ctx, manifest)
  return stats
}

/* ============ 待裁决清单 ============ */

interface PendingGroup {
  kind: 'exact' | 'near' | 'version'
  docs: Array<{ docId: string; path: string; project: string; updated: number; hash: string; size: number }>
  reason: string
  /** 近似组：组内两两相似度的最大值（0~1）。精确/版本组没有这个概念，故为 undefined。 */
  score?: number
  /** 版本组：归一后的族名（basename），界面用来分组折叠 */
  label?: string
}

/**
 * 语料重复分析（精确 / 版本族 / 近似三类）。
 *
 * 为什么抽成独立函数：查重页（§3.2-A3）要显示「近似 / 版本族」，而这两类此前只活在
 * 「语料治理 → 待裁决」里。抽出来让**两处跑同一段算法**，只是喂进去的语料范围不同
 * （治理 = 全库，查重页 = 本项目）—— 若各写一份，两边的口径迟到会漂移，
 * 用户会在两个页面看到对同一批文件的不同结论。
 */
function corpusGroups(docs: CorpusDoc[]): { groups: PendingGroup[]; stats: { exact: number; near: number; version: number } } {
  const stats = { exact: 0, near: 0, version: 0 }
  const groups: PendingGroup[] = []
  const byId = new Map<string, CorpusDoc>()
  for (const d of docs) byId.set(d.docId, d)
  const brief = (d: CorpusDoc, hash: string) => ({ docId: d.docId, path: d.path, project: d.project, updated: d.updated, hash: hash.slice(0, 10), size: d.size })
  // 精确重复
  const byDup = new Map<string, CorpusDoc[]>()
  for (const d of docs) {
    if (d.mergedInto) continue
    const list = byDup.get(d.dupHash) ?? []
    list.push(d)
    byDup.set(d.dupHash, list)
  }
  for (const [h, list] of byDup) {
    if (list.length >= 2) {
      groups.push({ kind: 'exact', docs: list.map((d) => brief(d, h)), reason: '内容完全相同的 ' + list.length + ' 个文档' })
      stats.exact++
    }
  }
  // 版本族（命名归一相同且非精确重复）
  const byVer = new Map<string, CorpusDoc[]>()
  for (const d of docs) {
    if (d.mergedInto) continue
    const list = byVer.get(d.versions) ?? []
    list.push(d)
    byVer.set(d.versions, list)
  }
  for (const [v, list] of byVer) {
    const uniq = list.filter((d, i) => list.findIndex((x) => x.dupHash === d.dupHash) === i)
    if (uniq.length >= 2 && !groups.some((g) => g.kind === 'version' && g.label === v)) {
      groups.push({ kind: 'version', label: v, docs: uniq.map((d) => brief(d, d.dupHash)), reason: '版本族「' + v + '」存在 ' + uniq.length + ' 个版本（请确认权威版）' })
      stats.version++
    }
  }
  // 近似重复（MinHash banding 候选）
  const near = nearCandidates(docs)
  const pairScore = new Map<string, number>()
  const nearSet = new Map<string, Set<string>>()
  for (const n of near) {
    pairScore.set(n.a + '\u0000' + n.b, n.score)
    const s = nearSet.get(n.a) ?? new Set()
    s.add(n.b)
    nearSet.set(n.a, s)
  }
  for (const [a, set] of nearSet) {
    const ids = [a, ...set]
    const list = ids.map((id) => byId.get(id)).filter((d): d is CorpusDoc => !!d)
    if (list.length >= 2 && !groups.some((g) => g.kind === 'near' && g.docs.some((d) => d.docId === a))) {
      // 组内最强的那条边的相似度 = 这组的代表分（用户看"这几篇像到什么程度"）
      let mx = 0
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const key = ids[i] < ids[j] ? ids[i] + '\u0000' + ids[j] : ids[j] + '\u0000' + ids[i]
          const s = pairScore.get(key)
          if (s !== undefined && s > mx) mx = s
        }
      }
      groups.push({ kind: 'near', docs: list.map((d) => brief(d, d.hash)), score: Math.round(mx * 100) / 100, reason: '内容高度相似的 ' + list.length + ' 个文档（请核对是否重复/合并）' })
      stats.near++
    }
  }
  return { groups, stats }
}

async function scanPending(ctx: Context): Promise<{ groups: PendingGroup[]; stats: { exact: number; near: number; version: number } }> {
  const manifest = await loadManifest(ctx)
  return corpusGroups(Object.values(manifest).filter((d) => !d.scanOnly))
}

/* ============ 项目查重（全员可用；范围 = 单个项目） ============ */

interface DupFileEntry {
  name: string
  path: string
  size: number
  mtime: string
}

function dupSizeText(n: number): string {
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
  return (n / 1024 / 1024).toFixed(1) + ' MB'
}

/** 递归收集项目内全部文件（跳过隐藏项/专属空间，与语料摄取一致） */
async function walkProjectFiles(ctx: Context, project: string): Promise<DupFileEntry[]> {
  const root = await ctx.privhub.resolveReal(project, '')
  if (root === null) return []
  const out: DupFileEntry[] = []
  const stack: Array<{ dir: string; rel: string }> = [{ dir: root, rel: '' }]
  while (stack.length) {
    const cur = stack.pop()!
    let ents
    try { ents = await readdir(cur.dir, { withFileTypes: true }) } catch { continue }
    for (const e of ents) {
      if (e.name.startsWith('.')) continue
      const full = join(cur.dir, e.name)
      const childRel = cur.rel ? cur.rel + '/' + e.name : e.name
      if (e.isDirectory()) {
        stack.push({ dir: full, rel: childRel })
        continue
      }
      try {
        const st = await stat(full)
        out.push({ name: e.name, path: childRel, size: st.size, mtime: st.mtime.toISOString() })
      } catch { /* 坏文件跳过 */ }
    }
  }
  return out
}

/** 文件级 ACL 放行判定：未命中任何规则（undefined）= 放行，由项目级权限兜底。 */
function aclAllows(ctx: Context, user: UserRecord, project: string, path: string): boolean {
  const d = ctx.acl.can(user, 'view', project, path)
  return !d || d.allow
}

/**
 * 文件级删除权限（§3.6 验收②）。
 *
 * 为什么要在查重结果里回带它：删除动作本来就会被 `/api/delete` 的 ACL 守卫拦下，
 * 但只读账号会「点了才被拒」—— 用户已经勾了一屏文件、点了删除才收到"无权限"。
 * 服务端在返回结果时把 `canDelete` 一起判好，界面就能**先**置灰并说明原因。
 * 注意这只是**提前告知**，真正的裁决仍在 `/api/delete` 的守卫上（此处放宽了也不会真的删掉）。
 */
function canDeleteFile(ctx: Context, user: UserRecord, project: string, path: string): boolean {
  const d = ctx.acl.can(user, 'delete', project, path)
  return !d || d.allow
}

/** 同名同大小的分组键分隔符：'\0' 不会出现在文件名里；用 charCode 而不是转义序列，
 *  避免源码里出现真实控制字符（历史上踩过一次：转义被工具链解码成了裸 NUL 落盘）。 */
const DUP_KEY_SEP = String.fromCharCode(0)

/** 指纹计算的文件大小上限：超过就不读了，如实标成"未校验"（不猜）。 */
const FINGERPRINT_MAX_BYTES = 8 * 1024 * 1024

/**
 * 单份文件的内容指纹（§3.2-A2：同名同大小**还不够**判重复，要再比一次内容）。
 *
 * 返回 null = 未校验（文件过大 / 读不到），调用方据此**不下"重复"结论**——
 * 这正是这一版要修的病：旧实现用 `文件名 + 字节大小` 当分组键，两个同名同大小但
 * 内容完全不同的文件会被判成重复，用户照着删就删错了。宁可不判，也不误判。
 *
 * 口径：语料内文档直接复用摄取时算好的 `dupHash`（同一套 normalizeText + sha256）；
 * 语料外文件现场算 —— 文本类走**同一套 normali​zeText 口径**（否则"一个进了语料、
 * 一个没进"的两个同内容文件会被误判成内容不同），二进制只能按原始字节比。
 */
async function fingerprintOf(ctx: Context, project: string, relPath: string, size: number, corpus: Map<string, CorpusDoc>): Promise<string | null> {
  const d = corpus.get(docIdOf(project, relPath))
  if (d && !d.scanOnly) return d.dupHash
  if (size > FINGERPRINT_MAX_BYTES) return null
  const abs = await ctx.privhub.resolveReal(project, relPath).catch(() => null)
  if (abs === null || !existsSync(abs)) return null
  const buf = await ctx.storage.readBuffer(abs).catch(() => null)
  if (buf === null) return null
  if (TEXT_EXTS.has(extname(relPath).toLowerCase())) {
    const txt = buf.toString('utf8')
    if (txt.indexOf(String.fromCharCode(0)) < 0) return sha256(normalizeText(txt))
  }
  return 'raw:' + createHash('sha256').update(buf).digest('hex')
}

/** 查重页近似/版本族的单组上限：超了只回前面的，并如实回带总量（§3.5）。 */
const NEAR_GROUP_CAP = 30

interface DupFileItem {
  path: string
  mtime: string
  canDelete: boolean
  /** 校验过后的内容指纹前 10 位；null = 未校验（过大/读不到），此时**不下重复结论** */
  fingerprint: string | null
  /** 同组内**已证明内容相同**的另一份路径（取第一个）；null = 本组内没有与它内容相同的兄弟 */
  sameAs: string | null
}

interface DupFileGroup {
  name: string
  size: number
  sizeText: string
  count: number
  /** same=已证明内容一致；differ=已证明内容不同（同名同大小但其实是两份不同的东西）；unknown=没能校验（过大/读不到） */
  verdict: 'same' | 'differ' | 'unknown'
  files: DupFileItem[]
}

/**
 * 项目查重（只查本项目，不跨项目）：
 *  - fileGroups   = 文件名 + 大小均相同（覆盖所有文件类型，含未入语料的二进制/图片），
 *                   再逐份算内容指纹给出 verdict（§3.2-A2）
 *  - contentGroups= 内容一字不差（仅语料内可解析文档；成员已命中文件层的不同步列出，避免重复）
 *  - nearGroups   = 近似 / 版本族（与「语料治理 → 待裁决」同一段算法，喂本项目语料）
 * 三组只报告不删除；删除动作由前端经 /api/delete（回收站）执行。
 *
 * §3.2-A2（2026-10-11）：旧实现直接拿「文件名 + 字节大小」当重复判据，两个同名同大小
 * 但内容完全不同的文件会被摆成一对重复，用户照着删就删错了。现在组内再算一次内容指纹，
 * 给出 same / differ / unknown 三种结论：**只有 same 的才敢说"重复"**，differ 明说
 * "名字大小一样但内容不同"，unknown 如实说没验证（不猜）。宁可少报，不可误报。
 *
 * 权限（W-A 安全修复，2026-10-11）：此前只做项目级 canAccess，项目内被文件级 ACL
 * 拒绝的文件，其**文件名与路径**仍会出现在查重列表里（只读泄漏）。现在在收集阶段
 * 就按 acl.can(view) 摘掉：文件层过滤走盘列表，内容层过滤走 manifest，两处同一判据，
 * 保证「已摘文件」不会从另一条路径重新出现。
 * §3.6（同一批）：结果里每份文件回带 canDelete —— 只读账号的删除按钮**事先**置灰并说明
 * 原因，而不是勾完一屏点下去才被拒；真正的裁决仍在 /api/delete 的守卫上。
 */
async function dupCheckProject(ctx: Context, project: string, user: UserRecord): Promise<{
  project: string
  fileGroups: DupFileGroup[]
  contentGroups: Array<{ count: number; files: Array<{ path: string; size: number; updated: number; canDelete: boolean }> }>
  nearGroups: Array<{ kind: 'near' | 'version'; label?: string; score?: number; reason: string; docs: Array<{ path: string; size: number; updated: number; canDelete: boolean }> }>
  nearGroupsTotal: number
  caps: { nearGroups: number }
}> {
  // ① 文件层：同名同大小（先按文件级 ACL 摘除无权查看的文件）
  const files = (await walkProjectFiles(ctx, project)).filter((f) => aclAllows(ctx, user, project, f.path))
  const byKey = new Map<string, DupFileEntry[]>()
  for (const f of files) {
    const key = f.name + DUP_KEY_SEP + f.size
    const arr = byKey.get(key)
    if (arr) arr.push(f)
    else byKey.set(key, [f])
  }
  const manifest = await loadManifest(ctx)
  const corpus = new Map<string, CorpusDoc>()
  for (const d of Object.values(manifest)) if (d.project === project) corpus.set(d.docId, d)

  const fileGroups: DupFileGroup[] = []
  const inFileDup = new Set<string>() // 文件层已覆盖的路径（内容层不再重复列出）
  for (const [key, arr] of byKey) {
    if (arr.length < 2) continue
    const name = key.slice(0, key.indexOf(DUP_KEY_SEP))
    arr.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    // 逐份算指纹（§3.2-A2）：这一步是"同名同大小 ≠ 重复"的唯一凭据
    const fps = await Promise.all(arr.map((f) => fingerprintOf(ctx, project, f.path, f.size, corpus)))
    const buckets = new Map<string, string[]>()
    for (let i = 0; i < arr.length; i++) {
      const fp = fps[i]
      if (fp === null) continue
      const b = buckets.get(fp)
      if (b) b.push(arr[i].path)
      else buckets.set(fp, [arr[i].path])
    }
    let verdict: 'same' | 'differ' | 'unknown' = 'unknown'
    if ([...buckets.values()].some((b) => b.length >= 2)) verdict = 'same'
    else if (fps.every((fp) => fp !== null)) verdict = 'differ'
    // 只有**证明内容一致**的那组才算"已覆盖"：differ/unknown 的文件仍可能出现在
    // 近似族里（它们与别的文档相似是另一回事），不该被这里吞掉。
    if (verdict === 'same') for (const f of arr) inFileDup.add(f.path)
    fileGroups.push({
      name,
      size: arr[0].size,
      sizeText: dupSizeText(arr[0].size),
      count: arr.length,
      verdict,
      files: arr.map((f, i) => {
        const fp = fps[i]
        // sameAs 只在"确实有另一份同指纹"时才给：用户据此才敢删其中任意一份
        const sameAs = fp === null ? null : (buckets.get(fp) ?? []).find((p) => p !== f.path) ?? null
        return {
          path: f.path,
          mtime: f.mtime.replace('T', ' ').slice(0, 16),
          canDelete: canDeleteFile(ctx, user, project, f.path),
          fingerprint: fp === null ? null : fp.slice(0, 10),
          sameAs,
        }
      }),
    })
  }
  fileGroups.sort((a, b) => (b.size - a.size) || (a.name < b.name ? -1 : 1))

  // ② 内容层：语料内本项目文档、内容哈希相同（名字或大小不同但内容一字不差）
  const byDup = new Map<string, Array<{ path: string; size: number; updated: number }>>()
  for (const d of Object.values(manifest)) {
    if (d.project !== project || d.scanOnly) continue
    if (inFileDup.has(d.path)) continue // 文件层已列出
    if (!aclAllows(ctx, user, project, d.path)) continue // 文件级 ACL 拒绝 → 不列出
    const abs = await ctx.privhub.resolveReal(d.project, d.path).catch(() => null)
    if (abs === null || !existsSync(abs)) continue
    const list = byDup.get(d.dupHash) ?? []
    list.push({ path: d.path, size: d.size, updated: d.updated })
    byDup.set(d.dupHash, list)
  }
  const contentGroups: Array<{ count: number; files: Array<{ path: string; size: number; updated: number; canDelete: boolean }> }> = []
  for (const [, list] of byDup) {
    if (list.length < 2) continue
    list.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    contentGroups.push({ count: list.length, files: list.map((x) => ({ ...x, canDelete: canDeleteFile(ctx, user, project, x.path) })) })
  }
  contentGroups.sort((a, b) => b.files.length - a.files.length || (a.files[0].path < b.files[0].path ? -1 : 1))

  // ③ 近似 / 版本族（§3.2-A3）：与治理页共用 corpusGroups，范围收窄到本项目，
  //    并摘掉前面两层已经列过的路径（同一批文件不在页面上出现两次）。
  const projectDocs = [...corpus.values()].filter((d) => !d.scanOnly && aclAllows(ctx, user, project, d.path))
  const { groups } = corpusGroups(projectDocs)
  const nearAll = groups
    .filter((g) => g.kind === 'near' || g.kind === 'version')
    .map((g) => ({
      kind: g.kind as 'near' | 'version',
      label: g.label,
      score: g.score,
      reason: g.reason,
      docs: g.docs
        .filter((d) => !inFileDup.has(d.path))
        .map((d) => ({ path: d.path, size: d.size, updated: d.updated, canDelete: canDeleteFile(ctx, user, project, d.path) })),
    }))
    .filter((g) => g.docs.length >= 2)
  const nearGroups = nearAll.slice(0, NEAR_GROUP_CAP)

  return { project, fileGroups, contentGroups, nearGroups, nearGroupsTotal: nearAll.length, caps: { nearGroups: NEAR_GROUP_CAP } }
}

/* ============ 策展动作 ============ */

async function curate(ctx: Context, by: string, action: string, docIds: string[], note?: string, days?: number): Promise<{ ok: true; affected: number } | { ok: false; error: string }> {
  if (!Array.isArray(docIds) || docIds.length === 0) return { ok: false, error: 'docIds 不能为空' }
  if (action === 'merge' && docIds.length < 2) return { ok: false, error: 'merge 需要至少 [主文档, 从文档...]' }
  const manifest = await loadManifest(ctx)
  let affected = 0
  for (const id of docIds) {
    const d = manifest[id]
    if (!d) continue
    switch (action) {
      case 'keep-canonical':
        if (d.mergedInto) d.mergedInto = null
        d.canonical = true
        affected++
        break
      case 'exclude':
        d.excluded = true
        affected++
        break
      case 'unexclude':
        d.excluded = false
        affected++
        break
      case 'expire':
        d.expiredAt = Date.now() + (Number(days) > 0 ? Number(days) : 365) * 864e5
        affected++
        break
      case 'unexpire':
        d.expiredAt = null
        affected++
        break
      case 'merge': {
        // docIds[0] = 主文档（canonical）；其余 = 从文档（mergedInto 指向主文档）
        // P1 语义：从文档不进语料（主文档保持内容）；内容级合并在二期做
        const primary = manifest[docIds[0]]
        if (!primary) return { ok: false, error: '主文档不存在' }
        if (d.docId === primary.docId) { primary.canonical = true; affected++; continue }
        d.mergedInto = primary.docId
        d.canonical = false
        affected++
        break
      }
      default:
        return { ok: false, error: '未知动作: ' + action }
    }
  }
  await saveManifest(ctx, manifest)
  // 语料同步：被 exclude/expire/merge 的文档清块（保持块文件与状态一致）
  for (const id of docIds) {
    const d = manifest[id]
    if (!d) continue
    const keep = !d.excluded && d.expiredAt === null && !d.scanOnly && d.mergedInto === null
    if (!keep && d.chunks > 0) {
      const f = chunkFileOf(id)
      if (existsSync(f)) await ctx.storage.writeText(f, '').catch(() => {})
      d.chunks = 0
    }
  }
  await saveManifest(ctx, manifest)
  const log = await loadCuration(ctx)
  log.push({ at: Date.now(), by, action, docIds, note })
  await saveCuration(ctx, log)
  return { ok: true, affected }
}

/* ============ M3：向量化任务与检索问答 ============ */

interface VecState {
  state: 'idle' | 'running' | 'done' | 'partial'
  dim: number
  total: number
  done: number
  failed: number
  startedAt: number
  finishedAt: number
  error?: string
}
let vecState: VecState = { state: 'idle', dim: 0, total: 0, done: 0, failed: 0, startedAt: 0, finishedAt: 0 }
let vecStore: VectorStore | null = null
let vecTask: Promise<VecState> | null = null

function storeOf(): VectorStore {
  if (!vecStore) vecStore = new VectorStore(VEC_DB_FILE)
  return vecStore
}

/** 串行任务句柄：完成/失败即释放，杜绝并发触发与竞态 */
function startVecTask(ctx: Context): Promise<VecState> {
  if (!vecTask) {
    vecTask = runVectorize(ctx).finally(() => { vecTask = null })
  }
  return vecTask
}

async function loadVecState(ctx: Context): Promise<void> {
  /* D4：向量库状态是**派生数据**（丢了重新向量化即可）——宽容版：隔离存证 + 记日志，
   * 但不因此让服务起不来。 */
  const raw = await readJsonStoreLenient<Partial<VecState>>(ctx.storage, VEC_STATE_FILE, {})
  vecState = { ...vecState, ...raw }
}
async function saveVecState(ctx: Context): Promise<void> {
  await mkdir(CORPUS_DIR, { recursive: true })
  await ctx.storage.writeText(VEC_STATE_FILE, JSON.stringify(vecState, null, 1))
}

/** 读取有效语料全部块（排除治理态） */
async function allChunks(ctx: Context): Promise<ChunkRec[]> {
  const manifest = await loadManifest(ctx)
  const out: ChunkRec[] = []
  for (const doc of Object.values(manifest)) {
    if (doc.excluded || doc.expiredAt !== null || doc.scanOnly || doc.mergedInto || doc.chunks === 0) continue
    const f = chunkFileOf(doc.docId)
    if (!existsSync(f)) continue
    try {
      const raw = await ctx.storage.readText(f)
      for (const line of raw.split('\n').filter(Boolean)) {
        const rec = JSON.parse(line) as ChunkRec
        if (rec.text) out.push(rec)
      }
    } catch { /* 单文档损坏跳过 */ }
  }
  return out
}

/** 向量化任务（用户触发；幂等续跑：已入库 chunk 跳过；进度落盘） */
async function runVectorize(ctx: Context): Promise<VecState> {
  if (vecTask) return vecState
  try {
    const chunks = await allChunks(ctx)
    if (chunks.length === 0) {
      vecState = { state: 'done', dim: 0, total: 0, done: 0, failed: 0, startedAt: Date.now(), finishedAt: Date.now() }
      await saveVecState(ctx)
      return vecState
    }
    const store = storeOf()
    // 维度探测：用第一块文本确定当前 embedding 维度；与表维度不一致时重建表（换真实模型后自动全量重灌）
    let probeDim = 0
    try {
      const probe = await ctx.model.embed(ctx, [chunks[0].text])
      probeDim = probe?.[0]?.length ?? 0
    } catch { /* 探测失败按现状继续（批处理时会再报错） */ }
    if (probeDim > 0) {
      const curDim = store.dims()
      if (curDim !== null && curDim !== probeDim) {
        ctx.logger?.warn('[rag] 向量维度变化 ' + curDim + ' → ' + probeDim + '，重建向量表并全量重灌')
        store.rebuildTable(probeDim)
      }
    }
    const existing = store.allIds()
    const todo = chunks.filter((c) => !existing.has(c.chunkId))
    const base = chunks.length - todo.length
    vecState = { state: 'running', dim: vecState.dim || 0, total: chunks.length, done: base, failed: 0, startedAt: Date.now(), finishedAt: 0, error: undefined }
    await saveVecState(ctx)
    let failed = 0
    let dim = vecState.dim || 0
    let errMsg: string | undefined
    for (let i = 0; i < todo.length; i += 32) {
      const batch = todo.slice(i, i + 32)
      try {
        const vecs = await ctx.model.embed(ctx, batch.map((c) => c.text))
        dim = vecs[0]?.length ?? dim
        if (dim > 0) store.ensureTable(dim)
        for (let j = 0; j < batch.length; j++) {
          const v = vecs[j]
          if (v) store.upsert(batch[j].chunkId, Float32Array.from(v))
          else failed++
        }
      } catch (e) {
        failed += batch.length
        errMsg = e instanceof Error ? e.message : String(e)
      }
      vecState.dim = dim
      vecState.done = base + Math.min(i + batch.length, todo.length)
      vecState.failed = failed
      vecState.error = errMsg
      if (i % 96 === 0 || i + 32 >= todo.length) await saveVecState(ctx)
    }
    vecState.state = failed > 0 ? 'partial' : 'done'
    vecState.finishedAt = Date.now()
    await saveVecState(ctx)
    return vecState
  } finally {
    // 任务释放由 startVecTask 的 finally 统一处理（vecTask = null）
  }
}

/** 读取某文档全部块（父上下文扩展用）
 *
 * D4 有意**不**套用严格读取：这里是 JSONL（一行一块），且整份内容都是从语料文件
 * 重新解析出来的**派生数据** —— 读坏了返回空、下次摄取重建即可，不会丢任何原始内容。
 * （对比 `loadCuration`：那是人工成果，必须严格。） */
async function chunksOfDoc(ctx: Context, docId: string): Promise<ChunkRec[]> {
  const f = chunkFileOf(docId)
  if (!existsSync(f)) return []
  try {
    const raw = await ctx.storage.readText(f)
    return raw.split('\n').filter(Boolean).map((l) => JSON.parse(l) as ChunkRec)
  } catch { return [] }
}

interface RagSource {
  docId: string
  project: string
  path: string
  chunkId: string
  snippet: string
}

/** 检索方式（§1.7）：这是对「实际发生了什么」的如实记录 ——
 *  · hybrid  —— BM25 与向量两路都真的跑了，按 RRF 融合；
 *  · keyword —— 只有 BM25。向量通道不可用（未建索引 / 调用失败 / 维数不符）时如实降级。
 *  注意 hybrid 也可能是 0 条命中（融合后没有任何文档过得了权限），那仍是 hybrid：
 *  这里记的是「走了哪条路」，不是「有没有结果」。 */
type RetrievalMode = 'hybrid' | 'keyword'

interface RagSearchResult {
  sources: RagSource[]
  scopeProjects: string[]
  mode: RetrievalMode
  /** mode 为 keyword 时的降级原因（面向用户的中文短语）；hybrid 时为空串 */
  modeReason: string
}

/** 混合检索（BM25 + 向量 RRF 融合）+ 权限过滤（visible ∩ ACL view）+ 父上下文 */
async function ragSearch(ctx: Context, user: UserRecord, q: string, collection: string, topK = ASK_TOPK): Promise<RagSearchResult> {
  const visible = await ctx.privhub.visibleProjects(user)
  let scope = visible
  if (collection && collection !== 'all') {
    if (!visible.includes(collection)) {
      return { sources: [], scopeProjects: scope, mode: 'keyword', modeReason: '指定的集合不可见或不存在，未做检索' }
    }
    scope = [collection]
  }
  // 源1：BM25（服务端已按 visible 过滤）
  const bmHits: Array<{ project: string; path: string; score?: number }> = []
  try {
    const hits = await ctx.search.searchFulltext(q, collection && collection !== 'all' ? { project: collection } : {}, visible)
    for (const h of hits) if (!h.isDir) bmHits.push(h)
  } catch { /* BM25 不可用不影响向量通道 */ }
  // D9 修复补充：manifest 必须在此处【首次使用之前】取得。
  // 原先 const manifest 声明在函数尾部（权限裁决那一段），而本段（向量命中反查 = 第一处
  // 使用者）在它之前执行 —— 同一函数体内 const 存在暂时性死区（TDZ），
  // 每次调用都会抛 `Cannot access 'manifest' before initialization`，
  // 表现为检索接口 500、问答接口 400，RAG 入口整体不可用。
  // 这里只是把「读取 + 赋值」的时机提前到首次使用之前，语义与调用顺序不变：
  //   · loadManifest 是纯读（失败返回空对象），不依赖本段任何变量；
  //   · 位置在 collection 校验之后，与原先一样「无权限直接返回、不读盘」的短路顺序得以保留。
  const manifest = await loadManifest(ctx)
  // 源2：向量（全库 topK×6 → 按 scope 过滤）
  // D9：向量表内的 chunk_id 是 docId 的摘要，需经 manifest 反查回真实 docId。
  const keyToDocId = new Map<string, string>()
  for (const d of Object.values(manifest)) keyToDocId.set(docKeyOf(d.docId), d.docId)
  const scopeDocs = new Set(
    Object.values(manifest).filter((d) => scope.includes(d.project)).map((d) => d.docId),
  )
  let vecHits: Array<{ chunkId: string; distance: number }> = []
  // §1.7：先假定位向量通道不可用，只有真的取到同维向量并算了命中才算 hybrid。
  // 判据放在这里而不是「有没有命中」，是因为 0 命中与「没走这条路」是两回事。
  let mode: RetrievalMode = 'keyword'
  let modeReason = '尚未建立向量索引（先在「向量化」里生成索引，或先填入 embedding 模型）'
  const store = storeOf()
  const dims = store.dims()
  if (dims) {
    const emb = await ctx.model.embed(ctx, [q]).catch(() => null)
    if (emb && emb[0] && emb[0].length === dims) {
      mode = 'hybrid'
      modeReason = ''
      vecHits = store.search(Float32Array.from(emb[0]), topK * 6).filter((h) => {
        const docId = docIdOfChunk(h.chunkId, keyToDocId)
        return docId !== null && scopeDocs.has(docId)
      })
    } else {
      // 端点通、索引也在，但这次向量化没成——最常见的两种是「模型不可达」和「换了模型维数对不上」
      modeReason = emb && emb[0]
        ? `向量维数(${emb[0].length})与索引(${dims})不一致，需重建向量索引`
        : '向量化调用失败（模型未配置或不可达）'
    }
  }
  // 文档级 RRF 融合
  const rankOf = new Map<string, number[]>() // docId -> [rank1, rank2]
  const push = (id: string, rank: number): void => {
    const arr = rankOf.get(id) ?? []
    if (arr.length < 2) arr.push(rank)
    rankOf.set(id, arr)
  }
  bmHits.forEach((h, i) => push(h.project + '::' + h.path, i + 1))
  const vecByDoc = new Map<string, Array<{ chunkId: string; distance: number }>>()
  vecHits.forEach((h, i) => {
    const docId = docIdOfChunk(h.chunkId, keyToDocId)
    if (docId === null) return // 摘要无法反查（旧格式残留）→ 丢弃该命中
    push(docId, i + 1)
    const list = vecByDoc.get(docId) ?? []
    list.push(h)
    vecByDoc.set(docId, list)
  })
  const scored = [...rankOf.entries()]
    .map(([docId, ranks]) => ({ docId, rrf: ranks.reduce((s, r) => s + 1 / (60 + r), 0) }))
    .sort((a, b) => b.rrf - a.rrf)
    .slice(0, topK)
  // 权限：ACL view 裁决（manifest 校验 + 文件存在）
  const sources: RagSource[] = []
  for (const { docId } of scored) {
    const doc = manifest[docId]
    if (!doc) continue
    const d = ctx.acl.can(user, 'view', doc.project, doc.path)
    if (d && !d.allow) continue
    const abs = await ctx.privhub.resolveReal(doc.project, doc.path).catch(() => null)
    if (abs === null || !existsSync(abs)) continue
    const docChunks = await chunksOfDoc(ctx, docId)
    if (docChunks.length === 0) continue
    // 取块：向量命中优先，否则包含查询词的块，兜底第一块；命中块附加相邻块（父上下文）
    const vecList = (vecByDoc.get(docId) ?? []).sort((a, b) => a.distance - b.distance)
    const pick = (): ChunkRec[] => {
      if (vecList.length > 0) {
        const hit = docChunks.find((c) => c.chunkId === vecList[0].chunkId)
        if (hit) {
          const seq = hit.seq
          const near = docChunks.filter((c) => Math.abs(c.seq - seq) <= 1)
          return near.length >= 2 ? near : [hit]
        }
      }
      const kw = q.split(/\s+/).filter((w) => w.length >= 2)
      const byKw = docChunks.find((c) => kw.some((w) => c.text.includes(w)))
      return byKw ? [byKw] : [docChunks[0]]
    }
    for (const c of pick()) {
      if (sources.length >= topK) break
      sources.push({ docId, project: doc.project, path: doc.path, chunkId: c.chunkId, snippet: (c.text ?? '').slice(0, 160) })
    }
  }
  return { sources, scopeProjects: scope, mode, modeReason }
}

/** 问答用的对话消息（与 svc-model 的 ChatMessage 同形） */
type AskMessage = { role: 'system' | 'user' | 'assistant'; content: string }

/* ---------- 多轮对话（§1.6）----------
 * 历史**只用来消解指代**（「那保修呢」里的「那」），**不参与检索**：
 *   · 权限上：历史里出现过的资料不在本轮 ACL 复核范围内，把它们并进检索
 *     等于让上一轮的结果绕过本轮的权限判定；
 *   · 质量上：把旧问题一起丢进 BM25，会把本轮真正命中的文档从排名里挤下去。
 * 所以检索永远只用本轮 question，history 只进模型的 messages。
 * 上限是双保险（条数 + 单条字数），超出的从**最旧**开始丢 —— 最近的一轮最有用。 */
const HISTORY_MAX_MSGS = 6
const HISTORY_MAX_CHARS = 2000

/** 把客户端送来的 history 收敛成可信形状：只认 user/assistant、只认字符串、丢空条。 */
function sanitizeHistory(raw: unknown): AskMessage[] {
  if (!Array.isArray(raw)) return []
  const out: AskMessage[] = []
  for (const m of raw) {
    if (!m || typeof m !== 'object') continue
    const role = (m as { role?: unknown }).role
    const content = (m as { content?: unknown }).content
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') continue
    const text = content.trim()
    if (!text) continue
    out.push({ role, content: text.slice(0, HISTORY_MAX_CHARS) })
  }
  return out.slice(-HISTORY_MAX_MSGS)
}

/** 语料为空时的如实答复（不调用模型，也不编造） */
const NO_SOURCE_ANSWER = '未在语料中找到相关资料（或您对这些资料没有查看权限）。请换一种问法，或确认语料已向量化。'

/**
 * 问答的**检索与组包**阶段：一切权限裁决都在这里（ragSearch 内部按 ACL 过滤）。
 *
 * 为什么拆出来：流式与非流式只有「怎么把模型的话送出去」不同，检索、组包、
 * 权限范围必须**逐字共享**——否则两条路径迟早会分叉，而分叉最可能的地方恰恰是
 * 「谁能看到哪些资料」这种不该出错的地方。`messages === null` 表示语料为空，
 * 此时 `answer` 是既定的如实答复，调用方直接送出、不请求模型。
 *
 * `history`（§1.6）只拼进 messages，**不进 ragSearch** —— 理由见 sanitizeHistory。
 */
async function ragPrepare(ctx: Context, user: UserRecord, question: string, collection: string, history: AskMessage[] = []): Promise<{ messages: AskMessage[] | null; answer: string; sources: RagSource[]; mode: RetrievalMode; modeReason: string }> {
  const { sources, mode, modeReason } = await ragSearch(ctx, user, question, collection, ASK_TOPK)
  // 空结果也把检索方式带出去：用户最需要知道「找不到」是资料里真没有，还是向量通道没起来
  if (sources.length === 0) return { messages: null, answer: NO_SOURCE_ANSWER, sources: [], mode, modeReason }
  const blocks = sources.map((s, i) => `[${i + 1}] 来源 ${s.project}/${s.path}\n${s.snippet}`).join('\n\n')
  const messages: AskMessage[] = [
    { role: 'system', content: '你是「私域枢纽 PrivHub」的知识助手。严格基于提供的资料回答问题，回答中用 [n] 标注来源编号；资料中没有的内容请明确回答「资料中未找到」，不要编造。' },
    // 历史夹在系统提示与本轮之间（§1.6）：只帮模型理解指代，本轮资料仍是唯一依据
    ...history,
    { role: 'user', content: `资料：\n${blocks}\n\n问题：${question}` },
  ]
  return { messages, answer: '', sources, mode, modeReason }
}

/** 组装问答上下文并调用 LLM（mock 可测）。非流式的一次性答复。 */
async function ragAsk(ctx: Context, user: UserRecord, question: string, collection: string, history: AskMessage[] = []): Promise<{ answer: string; sources: RagSource[]; mode: RetrievalMode; modeReason: string }> {
  const prep = await ragPrepare(ctx, user, question, collection, history)
  if (prep.messages === null) return { answer: prep.answer, sources: prep.sources, mode: prep.mode, modeReason: prep.modeReason }
  const answer = await ctx.model.chat(ctx, prep.messages)
  return { answer, sources: prep.sources, mode: prep.mode, modeReason: prep.modeReason }
}

/* ============ M3.1：模型服务自动发现 ============ */

/** 常见本地模型服务端口（Ollama/LM Studio/vLLM/llama.cpp/LocalAI/Jan 等） */
const DISCOVER_PORTS = [11434, 1234, 8000, 8080, 8081, 5000, 5001, 3000, 9997, 1337, 8090]
const DISCOVER_TIMEOUT = 1500
const DISCOVER_CONCURRENCY = 24
const DISCOVER_MAX_TARGETS = 640

interface DiscoveredService {
  host: string
  port: number
  baseURL: string
  kind: 'ollama' | 'openai' | 'unknown'
  models: string[]
  latencyMs: number
  error?: string
}

function ipv4Of(ip: string): string | null {
  const m = /^(\d{1,3})(?:\.(\d{1,3})){3}$/.exec(ip)
  return m ? ip : null
}
/** 私网地址校验（安全默认：扫描仅限本机/私网） */
function isPrivateIp(ip: string): boolean {
  if (ip === '127.0.0.1' || ip === 'localhost') return true
  const p = ip.split('.').map(Number)
  if (p.length !== 4 || p.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false
  if (p[0] === 10) return true
  if (p[0] === 192 && p[1] === 168) return true
  if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true
  return false
}
/** CIDR 展开（/8~/31 私网段） */
function expandCidr(cidr: string): string[] {
  const [net, bitsStr] = cidr.split('/')
  const bits = bitsStr ? Number(bitsStr) : 24
  if (!ipv4Of(net) || bits < 16 || bits > 31) return []
  const toInt = (s: string): number => s.split('.').reduce((acc, v) => (acc << 8) | Number(v), 0) >>> 0
  const base = toInt(net) & (bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0)
  const total = Math.min(1 << (32 - bits), 256)
  const out: string[] = []
  for (let i = 0; i < total; i++) {
    const n = base + i
    out.push([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.'))
  }
  return out
}
function localIPv4s(): string[] {
  const out: string[] = []
  for (const addrs of Object.values(networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family === 'IPv4' && !a.internal && a.address) out.push(a.address)
    }
  }
  return out
}

async function probeModelService(host: string, port: number): Promise<DiscoveredService> {
  const baseURL = `http://${host}:${port}`
  const t0 = Date.now()
  const out: DiscoveredService = { host, port, baseURL, kind: 'unknown', models: [], latencyMs: 0 }
  const fetchTimeout = (url: string, timeout: number): Promise<Response> => {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeout)
    return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(t))
  }
  try {
    // OpenAI 兼容 /v1/models
    const r = await fetchTimeout(baseURL + '/v1/models', DISCOVER_TIMEOUT)
    if (!r.ok) { out.error = 'http ' + r.status; return out }
    const body = await r.json().catch(() => null) as { data?: Array<{ id: string }> } | null
    const models = (body?.data ?? []).map((m) => m.id).filter(Boolean)
    // Ollama 专有 /api/tags（更全：含 embedding 模型）
    let kind: DiscoveredService['kind'] = 'openai'
    try {
      const tagsRes = await fetchTimeout(baseURL + '/api/tags', DISCOVER_TIMEOUT)
      if (tagsRes.ok) {
        const tags = await tagsRes.json().catch(() => null) as { models?: Array<{ name: string }> } | null
        const tagModels = (tags?.models ?? []).map((m) => m.name).filter(Boolean)
        if (tagModels.length > 0) { models.length = 0; models.push(...tagModels) }
        kind = 'ollama'
      }
    } catch { /* 非 Ollama */ }
    out.kind = kind
    out.models = [...new Set(models)]
    out.latencyMs = Date.now() - t0
  } catch (e) {
    out.error = e instanceof Error && (e as Error).name === 'AbortError' ? 'timeout' : (e instanceof Error ? e.message : String(e)).slice(0, 120)
  }
  return out
}

/** 自动发现：hosts 为空=本机（127.0.0.1 + localhost + 本机局域网 IP）；支持 CIDR 网段 */
async function discoverModels(ctx: Context, hostsInput: string[]): Promise<{ services: DiscoveredService[]; scanned: number; errors: number }> {
  const hosts = new Set<string>()
  const inputs = Array.isArray(hostsInput) ? hostsInput.map((s) => String(s).trim()).filter(Boolean) : []
  if (inputs.length === 0) {
    hosts.add('127.0.0.1')
    hosts.add('localhost')
    for (const ip of localIPv4s()) hosts.add(ip)
  } else {
    for (const h of inputs) {
      if (h.includes('/')) {
        for (const ip of expandCidr(h)) if (isPrivateIp(ip)) hosts.add(ip)
      } else if (isPrivateIp(h)) hosts.add(h)
    }
  }
  const hostList = [...hosts].slice(0, 64)
  const targets: Array<{ host: string; port: number }> = []
  for (const host of hostList) {
    for (const port of DISCOVER_PORTS) {
      targets.push({ host, port })
      if (targets.length >= DISCOVER_MAX_TARGETS) break
    }
    if (targets.length >= DISCOVER_MAX_TARGETS) break
  }
  const services: DiscoveredService[] = []
  let errors = 0
  for (let i = 0; i < targets.length; i += DISCOVER_CONCURRENCY) {
    const batch = targets.slice(i, i + DISCOVER_CONCURRENCY)
    const results = await Promise.allSettled(batch.map((t) => probeModelService(t.host, t.port)))
    for (const r of results) {
      if (r.status === 'fulfilled') {
        if (r.value.models.length > 0 || r.value.error) {
          if (r.value.error) errors++
          else services.push(r.value)
        }
      }
    }
  }
  services.sort((a, b) => a.host.localeCompare(b.host) || a.port - b.port)
  return { services, scanned: targets.length, errors }
}

/* ============ 审计与事件 ============ */

async function audit(ctx: Context, user: string, action: string, target: string, detail?: string): Promise<void> {
  const rec = await ctx.audit.log({ user, action, target, detail }).catch(() => null)
  if (rec) ctx.emit('audit:logged', rec)
}

/* ============ 插件主体 ============ */

export function apply(ctx: Context): void {
  const svc = ctx.privhub
  void loadVecState(ctx).catch(() => {})

  /* E1 事件声明 */
  ctx.eventBus.declareListen('file:changed', 'privhub-svc-rag', '文件系统变更 → 语料增量更新')
  ctx.eventBus.declareListen('file:saved', 'privhub-svc-rag', '文档保存 → 语料重解析')
  ctx.eventBus.declareListen('personal:renamed', 'privhub-svc-rag', '个人空间改名 → 清理旧目录名语料（防私人文档路径残留）')
  ctx.eventBus.declareEmit('audit:logged', 'privhub-svc-rag', '写操作成功审计广播（S1 闭环）')

  /* 摄取串行队列（防并发风暴）
   *
   * ⚠ 错误出口（必读，别改回 queue.then(fn, fn)）：
   * 旧写法是 `queue = queue.then(fn, fn)`——把【上一个任务的失败】原样当作
   * 【下一个任务的执行函数】再跑一遍，且链尾是裸 Promise：任何一次摄取抛出异常，
   * 若此后没有新事件进来接手，链尾就变成「无人处理的 rejection」。
   * Node 24 默认 --unhandled-rejections=throw ⇒ 整进程退出。
   * 也就是说：一次上传解析失败，可能把整个服务打死（全站不可用），
   * 而日志里什么都没有（实测该链尾不做任何记录）。
   *
   * 现在的语义：
   *   ① 队列自身吞掉异常并落日志，链永不 reject —— 后续事件照常处理（一次失败只损失一条语料）；
   *   ② 不再把失败当函数执行（旧写法会让同一异常反复重放，且丢掉本次等待的处理逻辑）；
   *   ③ 失败计数暴露给 /privhub/api/rag/status，供运维看见「有文档没进语料」。
   */
  let queue: Promise<unknown> = Promise.resolve()
  let queueErrors = 0
  /* 测试专用故障注入（默认不生效）：让「一次摄取抛错后服务是否仍存活」成为一条
   * 可复跑的常驻断言（见 tests/rag-resilience.mjs）。
   * 生效条件有两个，缺一不可：① 运行在隔离测试根（PRIVHUB_TEST_ROOT 存在）；
   * ② 数据目录下出现一次性标记文件 data/rag-test-inject-queue-error（由测试写入）。
   * 生产环境没有 PRIVHUB_TEST_ROOT，本函数恒返回 null —— 只是多一次 existsSync 判定。 */
  const TEST_INJECT_FILE = join(rootDir, 'data', 'rag-test-inject-queue-error')
  const takeTestInject = (): Error | null => {
    if (!process.env.PRIVHUB_TEST_ROOT) return null
    if (!existsSync(TEST_INJECT_FILE)) return null
    let msg = '测试注入的摄取失败'
    try { msg = readFileSync(TEST_INJECT_FILE, 'utf8').trim() || msg } catch { /* 用默认文案 */ }
    try { unlinkSync(TEST_INJECT_FILE) } catch { /* 一次性：删不掉就下次再来 */ }
    return new Error(msg)
  }
  const enqueue = (fn: () => Promise<void>): void => {
    const inject = takeTestInject()
    queue = queue.then(inject ? () => Promise.reject(inject) : fn).catch((e: unknown) => {
      queueErrors++
      console.error('[rag] 语料摄取失败（队列继续，不影响服务）: ' + (e instanceof Error ? e.message : String(e)))
    })
  }

  /* 文件事件订阅（跳过 .agents 专属空间） */
  ctx.effect(() => {
    const off1 = ctx.on('file:changed', (p: { project?: string; path?: string; action?: string; newPath?: string }) => {
      if (!p?.project || !p.path) return
      if (p.project.startsWith('.agents') || p.project === '.agents') return
      if (svc.isPersonalDir(p.project)) return // 个人空间（沙箱）不入语料（见 ingestDoc 说明）
      if (p.action === 'deleted' || p.action === 'purged') enqueue(() => removeDoc(ctx, p.project!, p.path!))
      else if (p.action === 'clean') enqueue(() => rebuild(ctx).then(() => {}))
      else if (p.action === 'renamed' || p.action === 'moved') {
        enqueue(async () => {
          await removeDoc(ctx, p.project!, p.path!)
          if (p.newPath) await ingestDoc(ctx, p.project!, p.newPath)
        })
      } else enqueue(() => ingestDoc(ctx, p.project!, p.path!))
    })
    const off2 = ctx.on('file:saved', (p: { project?: string; path?: string; doc?: string }) => {
      if (!p?.project || !p.path) return
      if (p.project.startsWith('.agents') || p.project === '.agents') return
      if (svc.isPersonalDir(p.project)) return // 同上：个人空间不入语料
      if (typeof p.doc === 'string') enqueue(() => ingestDoc(ctx, p.project!, p.path!, p.doc!))
      else enqueue(() => ingestDoc(ctx, p.project!, p.path!))
    })
    // 个人空间改名：旧目录名下的语料必须清掉（见 removeProjectDocs 说明）
    const off3 = ctx.on('personal:renamed', (p: { oldName?: string }) => {
      const oldName = String(p?.oldName ?? '')
      if (oldName === '') return
      enqueue(async () => { await removeProjectDocs(ctx, oldName) })
    })
    return () => { off1(); off2(); off3() }
  })

  /* 启动全量（延迟避免与全量索引冲突；失败静默） */
  setTimeout(() => { void rebuild(ctx).catch(() => {}) }, 8000)

  /* ---------- 管理工具 ---------- */

  const adminOf = (req: IncomingMessage, res: ServerResponse): { username: string; role: string } | null => {
    const u = svc.requireUser(req, res)
    if (!u) return null
    if (u.role !== 'admin') { json(res, 403, { ok: false, error: '仅管理员' }); return null }
    return u
  }

  const statusOf = async (): Promise<unknown> => {
    const manifest = await loadManifest(ctx)
    const docs = Object.values(manifest)
    const model = await ctx.model.check(ctx)
    const pending = await scanPending(ctx)
    const byType: Record<string, number> = {}
    for (const d of docs.filter((x) => !x.excluded && x.expiredAt === null && !x.scanOnly)) byType[d.type] = (byType[d.type] ?? 0) + 1
    return {
      ok: true,
      model: {
        configured: ctx.model.getConfig() !== null,
        llm: model.llm, embedding: model.embedding, checkedAt: model.checkedAt,
      },
      corpus: {
        docs: docs.filter((d) => !d.excluded && d.expiredAt === null && !d.scanOnly && !d.mergedInto).length,
        chunks: docs.reduce((s, d) => s + (d.chunks || 0), 0),
        totalDocs: docs.length,
        scanOnly: docs.filter((d) => d.scanOnly).length,
        byType,
      },
      curation: {
        canonical: docs.filter((d) => d.canonical).length,
        excluded: docs.filter((d) => d.excluded).length,
        expired: docs.filter((d) => d.expiredAt !== null).length,
        merged: docs.filter((d) => d.mergedInto !== null).length,
      },
      pending,
      ingestQueue: { errors: queueErrors },
    }
  }

  /* ---------- API ---------- */

  /* 模型配置（admin）：运维在此填 baseURL+模型名即生效 */
  svc.route('/privhub/api/model/config', async (req, res) => {
    const admin = adminOf(req, res)
    if (!admin) return
    if (req.method === 'GET') {
      const cfg = ctx.model.getConfig()
      const mask = (v: string | undefined): string | undefined => (v ? v.slice(0, 4) + '…' + v.slice(-4) : undefined)
      json(res, 200, { ok: true, configured: cfg !== null, config: cfg ? { llm: { ...cfg.llm, apiKey: mask(cfg.llm.apiKey) }, embedding: { ...cfg.embedding, apiKey: mask(cfg.embedding.apiKey) }, maxRetries: cfg.maxRetries } : null })
      return
    }
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    try {
      await ctx.model.saveConfig(ctx, body)
      void audit(ctx, admin.username, 'model-config', 'model.json', 'llm=' + (body.llm?.baseURL ?? '') + ' emb=' + (body.embedding?.baseURL ?? ''))
      json(res, 200, { ok: true })
    } catch (e) {
      json(res, 400, { ok: false, error: e instanceof Error ? e.message : '配置失败' })
    }
  }, 'model-config')

  /* 模型自检（admin）
   *   ?force=1 → 不吃 60s 缓存
   *   ?deep=1  → 额外真调一次 embedding，回维数与耗时（W-B/§1.4）。
   *              **默认不开**：这条路由会被首页轮询，默认打 embedding 就是每次轮询烧一次调用。 */
  svc.route('/privhub/api/model/status', async (req, res) => {
    const admin = adminOf(req, res)
    if (!admin) return
    const force = req.url?.includes('force=1') ?? false
    const deep = req.url?.includes('deep=1') ?? false
    json(res, 200, { ok: true, ...await ctx.model.check(ctx, force, deep) })
  }, 'model-status')

  /* RAG 总览状态（admin） */
  svc.route('/privhub/api/rag/status', async (req, res) => {
    const admin = adminOf(req, res)
    if (!admin) return
    json(res, 200, await statusOf())
  }, 'rag-status')

  /* 语料清单（adminOnly：语料库条目对普通用户隐藏） */
  svc.route('/privhub/api/rag/corpus', async (req, res) => {
    const admin = adminOf(req, res)
    if (!admin) return
    const url = new URL(req.url ?? '/', 'http://x')
    const projectFilter = url.searchParams.get('project') ?? ''
    const manifest = await loadManifest(ctx)
    const list = Object.values(manifest)
      .filter((d) => !projectFilter || d.project === projectFilter)
      .map((d) => ({ docId: d.docId, project: d.project, path: d.path, type: d.type, updated: d.updated, size: d.size, canonical: d.canonical, excluded: d.excluded, expiredAt: d.expiredAt, mergedInto: d.mergedInto, scanOnly: d.scanOnly, chunks: d.chunks, hash: d.hash.slice(0, 8) }))
      .sort((a, b) => a.project.localeCompare(b.project) || a.path.localeCompare(b.path))
    json(res, 200, { ok: true, docs: list, total: list.length })
  }, 'rag-corpus')

  /* 待裁决清单（admin） */
  svc.route('/privhub/api/rag/pending', async (req, res) => {
    const admin = adminOf(req, res)
    if (!admin) return
    json(res, 200, { ok: true, ...await scanPending(ctx) })
  }, 'rag-pending')

  /* 项目查重（全员可用：原搜索页查重 + AI 语料内容查重 合并；范围=当前项目） */
  svc.route('/privhub/api/rag/dup', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    const url = new URL(req.url ?? '/', 'http://x')
    const project = url.searchParams.get('project') ?? ''
    if (!project || !svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限访问该项目' })
    // 查重只针对「项目」：个人空间是私人沙箱，不做跨文件重复治理
    if (svc.isPersonalDir(project)) return json(res, 400, { ok: false, error: '查重仅针对项目，不作用于个人空间' })
    try {
      json(res, 200, { ok: true, ...await dupCheckProject(ctx, project, u) })
    } catch (e) {
      json(res, 500, { ok: false, error: e instanceof Error ? e.message : '查重失败' })
    }
  }, 'rag-dup')

  /* 策展动作（admin） */
  svc.route('/privhub/api/rag/curate', async (req, res) => {
    const admin = adminOf(req, res)
    if (!admin) return
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const r = await curate(ctx, admin.username, String(body.action ?? ''), body.docIds, String(body.note ?? ''), Number(body.days) || 0)
    if (!r.ok) return json(res, 400, { ok: false, error: r.error })
    void audit(ctx, admin.username, 'rag-curate', String(body.action ?? ''), (body.docIds ?? []).length + ' docs' + (body.note ? ' note=' + String(body.note) : ''))
    json(res, 200, { ok: true, affected: r.affected })
  }, 'rag-curate')

  /* 全量重建（admin） */
  svc.route('/privhub/api/rag/rebuild', async (req, res) => {
    const admin = adminOf(req, res)
    if (!admin) return
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    const stats = await rebuild(ctx)
    void audit(ctx, admin.username, 'rag-rebuild', '', 'scanned=' + stats.scanned + ' updated=' + stats.updated + ' removed=' + stats.removed)
    json(res, 200, { ok: true, ...stats })
  }, 'rag-rebuild')

  /* 单文档重解析（admin） */
  svc.route('/privhub/api/rag/ingest', async (req, res) => {
    const admin = adminOf(req, res)
    if (!admin) return
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = String(body.project ?? '')
    const path = String(body.path ?? '')
    if (!svc.isValidProjectName(project) || !path) return json(res, 400, { ok: false, error: 'project/path 必填' })
    if (svc.isPersonalDir(project)) return json(res, 400, { ok: false, error: '个人空间不入语料库' })
    await ingestDoc(ctx, project, path)
    void audit(ctx, admin.username, 'rag-ingest', project + '/' + path)
    json(res, 200, { ok: true })
  }, 'rag-ingest')

  /* ---------- M3：向量化（用户触发）+ 检索 + 问答 ---------- */

  /* 向量化状态（所有人可看状态；开始时需 admin） */
  svc.route('/privhub/api/rag/vectorize/status', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    json(res, 200, { ok: true, vec: { ...vecState }, db: vecStore ? { dims: vecStore.dims(), count: vecStore.count() } : { dims: null, count: 0 } })
  }, 'rag-vec-status')

  /* 开始向量化（admin 触发；幂等续跑） */
  svc.route('/privhub/api/rag/vectorize', async (req, res) => {
    const admin = adminOf(req, res)
    if (!admin) return
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    if (vecTask) return json(res, 409, { ok: false, error: '向量化进行中' })
    void startVecTask(ctx).then((st) => {
      void audit(ctx, admin.username, 'rag-vectorize', 'start', 'total=' + st.total + ' done=' + st.done + ' failed=' + st.failed + ' state=' + st.state)
    }, (e) => {
      ctx.logger?.error('[rag] 向量化任务异常: ' + (e instanceof Error ? e.message : String(e)))
    })
    json(res, 200, { ok: true, started: true })
  }, 'rag-vectorize')

  /* 混合检索（登录用户可用；结果限本人权限） */
  svc.route('/privhub/api/rag/search', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    const url = new URL(req.url ?? '/', 'http://x')
    const q = (url.searchParams.get('q') ?? '').trim()
    const collection = url.searchParams.get('collection') ?? ''
    if (!q) return json(res, 400, { ok: false, error: 'q 必填' })
    const k = Math.min(10, Number(url.searchParams.get('k')) || ASK_TOPK)
    try {
      const { sources, mode, modeReason } = await ragSearch(ctx, u, q, collection, k)
      void audit(ctx, u.username, 'rag-search', '', 'q=' + q.slice(0, 40) + ' hits=' + sources.length + ' mode=' + mode)
      json(res, 200, { ok: true, hits: sources, mode, modeReason })
    } catch (e) {
      json(res, 500, { ok: false, error: sanitizeError(e instanceof Error ? e.message : e, 200) })
    }
  }, 'rag-search')

  /* 问答（登录用户可用；结果限本人权限） */
  svc.route('/privhub/api/rag/ask', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    let body: any
    try { body = JSON.parse(await readBody(req, 1024 * 1024)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const question = String(body.question ?? '').trim()
    const collection = String(body.collection ?? '')
    if (!question) return json(res, 400, { ok: false, error: 'question 必填' })
    // 多轮上下文（§1.6）：形状不可信就当作没有历史，绝不因为一段脏历史而让问答失败。
    // 下面 SSE 与 JSON 两条分支共用这一份（同一路由、同一鉴权，只是送出方式不同）。
    const history = sanitizeHistory(body.history)

    /* 流式分支：**同一个路由、同一段鉴权与权限范围**，只是一个 query/body 开关。
     * 这样不新增权限面（requireUser + ragPrepare 内的 ACL 过滤原样生效），
     * 也不会有「有没有人记得给新路由加 ACL 守卫」这类经典漏网。
     * 只有「把模型的话怎么送出去」不同：一次 JSON 换成逐块 SSE。
     *
     * 帧约定（event/data 成对，空行结束一帧）：
     *   sources   → { sources }       先给来源，界面立刻能显示引用了哪几篇，不必等正文
     *   retrieval → { mode, reason }  检索方式（§1.7）：hybrid=两路融合，keyword=仅关键词，
     *                                 紧跟在 sources 之后（两者同一次检索的产物，分开送旧客户端也不炸）
     *   delta     → { text }          正文增量，可能很多帧
     *   done      → { answer, sources, mode } 终帧：完整正文（客户端可据此校对拼接结果）
     *   error     → { error }         出错：检索失败 / 模型报错 / 中途断流都在这里落地
     */
    if (body.stream === true) {
      res.writeHead(200, {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-store',
        connection: 'keep-alive',
        // 反代（nginx 等）默认会把响应整段缓冲到结束才吐，那样「流式」就白做了
        'x-accel-buffering': 'no',
      })
      const send = (event: string, data: unknown): void => {
        try { res.write('event: ' + event + '\ndata: ' + JSON.stringify(data) + '\n\n') } catch { /* 客户端已断开 */ }
      }
      try {
        const prep = await ragPrepare(ctx, u, question, collection, history)
        send('sources', { sources: prep.sources })
        send('retrieval', { mode: prep.mode, reason: prep.modeReason })
        let answer: string
        if (prep.messages === null) {
          answer = prep.answer          // 语料为空：如实说明，不请求模型
          send('delta', { text: answer })
        } else {
          answer = await ctx.model.chat(ctx, prep.messages, { stream: true, onChunk: (d) => send('delta', { text: d }) })
        }
        send('done', { answer, sources: prep.sources, mode: prep.mode, modeReason: prep.modeReason })
        void audit(ctx, u.username, 'rag-ask', '', 'q=' + question.slice(0, 40) + ' sources=' + prep.sources.length + ' mode=' + prep.mode + ' stream=1')
      } catch (e) {
        // 出错也必须让界面知道，否则前端只会看到一个永远停在半句的回答
        send('error', { error: sanitizeError(e instanceof Error ? e.message : '问答失败') })
      } finally {
        res.end()
      }
      return
    }

    try {
      const r = await ragAsk(ctx, u, question, collection, history)
      void audit(ctx, u.username, 'rag-ask', '', 'q=' + question.slice(0, 40) + ' sources=' + r.sources.length + ' mode=' + r.mode)
      json(res, 200, { ok: true, answer: r.answer, sources: r.sources, mode: r.mode, modeReason: r.modeReason })
    } catch (e) {
      json(res, 400, { ok: false, error: sanitizeError(e instanceof Error ? e.message : '问答失败') })
    }
  }, 'rag-ask')

  /* 模型服务自动发现（adminOnly）：扫描本机/网段的常见本地模型服务端口 */
  svc.route('/privhub/api/rag/discover', async (req, res) => {
    const admin = adminOf(req, res)
    if (!admin) return
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    let body: any
    try { body = JSON.parse(await readBody(req, 1024 * 1024)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const hosts: string[] = Array.isArray(body?.hosts) ? body.hosts.map((s: unknown) => String(s)) : []
    const r = await discoverModels(ctx, hosts)
    void audit(ctx, admin.username, 'rag-discover', '', 'hosts=' + (hosts.length ? hosts.join(',') : '本机') + ' scanned=' + r.scanned + ' found=' + r.services.length)
    json(res, 200, { ok: true, ...r })
  }, 'rag-discover')

  console.log('[assembly] privhub-svc-rag 已挂载（P1 语料治理：摄取/清洗/去重/策展/模型接入 + M3 向量化/混合检索/问答）')
}