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
import { existsSync } from 'node:fs'
import { networkInterfaces } from 'node:os'
import { VectorStore, docKeyOf } from './vec'

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

/* 文本类（与预览/全文索引同集 + html） */
const TEXT_EXTS = new Set(['md', 'markdown', 'txt', 'json', 'js', 'ts', 'html', 'htm', 'css', 'xml', 'yaml', 'yml', 'csv', 'log', 'py', 'java', 'c', 'cpp', 'sh', 'bat', 'ini', 'toml', 'sql'])
const OFFICE_EXTS = new Set(['doc', 'docx', 'xlsx', 'pptx', 'pdf'])
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

/** 近似相似度：候选对在指定 band 撞桶（L1 只报告，不做删除） */
function nearCandidates(docs: CorpusDoc[]): Array<{ a: string; b: string; score: number }> {
  const out: Array<{ a: string; b: string; score: number }> = []
  const bucket = new Map<string, string[]>()
  for (const d of docs) {
    if (!d.minHash || d.minHash.length < MINHASH_FEATURES) continue
    const rows = Math.floor(MINHASH_FEATURES / MINHASH_BANDS)
    for (let b = 0; b < MINHASH_BANDS; b++) {
      const band = d.minHash.slice(b * rows, (b + 1) * rows).join(',')
      const key = b + ':' + sha256(band).slice(0, 8)
      const list = bucket.get(key) ?? []
      for (const other of list) {
        if (other === d.docId) continue
        const a = d.docId < other ? d.docId : other
        const b2 = d.docId < other ? other : d.docId
        if (!out.some((x) => x.a === a && x.b === b2)) {
          // 相似度 = 共享 band 数 / 总 band
          const score = 0.25 // 至少 1 band 命中（保守标记，人工复核）
          out.push({ a, b, score })
        }
      }
      list.push(d.docId)
      bucket.set(key, list)
    }
  }
  return out.filter((x) => x.score >= NEAR_THRESHOLD * 0.5)
}

/* ============ 存储 ============ */

async function loadManifest(ctx: Context): Promise<Manifest> {
  try {
    const raw = JSON.parse(await ctx.storage.readText(MANIFEST_FILE)) as { docs?: Manifest }
    return raw.docs ?? {}
  } catch { return {} }
}
async function saveManifest(ctx: Context, m: Manifest): Promise<void> {
  await mkdir(CORPUS_DIR, { recursive: true })
  await ctx.storage.writeText(MANIFEST_FILE, JSON.stringify({ version: 1, docs: m }, null, 1))
}
async function loadCuration(ctx: Context): Promise<CurationLog> {
  try { return JSON.parse(await ctx.storage.readText(CURATION_FILE)) as CurationLog } catch { return [] }
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
  docs: Array<{ docId: string; path: string; project: string; updated: number; hash: string }>
  reason: string
}

async function scanPending(ctx: Context): Promise<{ groups: PendingGroup[]; stats: { exact: number; near: number; version: number } }> {
  const manifest = await loadManifest(ctx)
  const docs = Object.values(manifest).filter((d) => !d.scanOnly)
  const stats = { exact: 0, near: 0, version: 0 }
  const groups: PendingGroup[] = []
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
      groups.push({ kind: 'exact', docs: list.map((d) => ({ docId: d.docId, path: d.path, project: d.project, updated: d.updated, hash: h.slice(0, 10) })), reason: '内容完全相同的 ' + list.length + ' 个文档' })
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
    if (uniq.length >= 2 && !groups.some((g) => g.kind === 'version' && g.reason.includes(v))) {
      groups.push({ kind: 'version', docs: uniq.map((d) => ({ docId: d.docId, path: d.path, project: d.project, updated: d.updated, hash: d.dupHash.slice(0, 10) })), reason: '版本族「' + v + '」存在 ' + uniq.length + ' 个版本（请确认权威版）' })
      stats.version++
    }
  }
  // 近似重复（MinHash banding 候选）
  const near = nearCandidates(docs)
  const nearSet = new Map<string, Set<string>>()
  for (const n of near) {
    const s = nearSet.get(n.a) ?? new Set()
    s.add(n.b)
    nearSet.set(n.a, s)
  }
  for (const [a, set] of nearSet) {
    const da = manifest[a]
    const list = [a, ...set].map((id) => manifest[id]).filter(Boolean)
    if (list.length >= 2 && !groups.some((g) => g.kind === 'near' && g.docs.some((d) => d.docId === a))) {
      groups.push({ kind: 'near', docs: list.map((d) => ({ docId: d.docId, path: d.path, project: d.project, updated: d.updated, hash: d.hash.slice(0, 10) })), reason: '内容高度相似的 ' + list.length + ' 个文档（请核对是否重复/合并）' })
      stats.near++
    }
  }
  return { groups, stats }
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

/**
 * 项目查重（只查本项目，不跨项目）：
 *  - fileGroups   = 文件名 + 大小均相同（覆盖所有文件类型，含未入语料的二进制/图片）
 *  - contentGroups= 内容一字不差（仅语料内可解析文档；成员已命中文件层的不同步列出，避免重复）
 * 两组合起来 = 项目内所有可判定的重复；查重只报告，删除动作由前端经 /api/delete（回收站）执行。
 */
async function dupCheckProject(ctx: Context, project: string): Promise<{
  project: string
  fileGroups: Array<{ name: string; size: number; sizeText: string; count: number; files: Array<{ path: string; mtime: string }> }>
  contentGroups: Array<{ count: number; files: Array<{ path: string; size: number; updated: number }> }>
}> {
  // ① 文件层：同名同大小
  const files = await walkProjectFiles(ctx, project)
  const byKey = new Map<string, DupFileEntry[]>()
  for (const f of files) {
    const key = f.name + '\u0000' + f.size
    const arr = byKey.get(key)
    if (arr) arr.push(f)
    else byKey.set(key, [f])
  }
  const fileGroups: Array<{ name: string; size: number; sizeText: string; count: number; files: Array<{ path: string; mtime: string }> }> = []
  const inFileDup = new Set<string>() // 文件层已覆盖的路径（内容层不再重复列出）
  for (const [key, arr] of byKey) {
    if (arr.length < 2) continue
    const name = key.slice(0, key.indexOf('\u0000'))
    arr.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    for (const f of arr) inFileDup.add(f.path)
    fileGroups.push({
      name,
      size: arr[0].size,
      sizeText: dupSizeText(arr[0].size),
      count: arr.length,
      files: arr.map((f) => ({ path: f.path, mtime: f.mtime.replace('T', ' ').slice(0, 16) })),
    })
  }
  fileGroups.sort((a, b) => (b.size - a.size) || (a.name < b.name ? -1 : 1))

  // ② 内容层：语料内本项目文档、内容哈希相同（名字或大小不同但内容一字不差）
  const manifest = await loadManifest(ctx)
  const byDup = new Map<string, Array<{ path: string; size: number; updated: number }>>()
  for (const d of Object.values(manifest)) {
    if (d.project !== project || d.scanOnly) continue
    if (inFileDup.has(d.path)) continue // 文件层已列出
    const abs = await ctx.privhub.resolveReal(d.project, d.path).catch(() => null)
    if (abs === null || !existsSync(abs)) continue
    const list = byDup.get(d.dupHash) ?? []
    list.push({ path: d.path, size: d.size, updated: d.updated })
    byDup.set(d.dupHash, list)
  }
  const contentGroups: Array<{ count: number; files: Array<{ path: string; size: number; updated: number }> }> = []
  for (const [, list] of byDup) {
    if (list.length < 2) continue
    list.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    contentGroups.push({ count: list.length, files: list })
  }
  contentGroups.sort((a, b) => b.files.length - a.files.length || (a.files[0].path < b.files[0].path ? -1 : 1))

  return { project, fileGroups, contentGroups }
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
  try {
    const raw = JSON.parse(await ctx.storage.readText(VEC_STATE_FILE)) as VecState
    vecState = { ...vecState, ...raw }
  } catch { /* 默认 idle */ }
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

/** 读取某文档全部块（父上下文扩展用） */
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

/** 混合检索（BM25 + 向量 RRF 融合）+ 权限过滤（visible ∩ ACL view）+ 父上下文 */
async function ragSearch(ctx: Context, user: { username: string; role: string }, q: string, collection: string, topK = ASK_TOPK): Promise<{ sources: RagSource[]; scopeProjects: string[] }> {
  const visible = await ctx.privhub.visibleProjects(user)
  let scope = visible
  if (collection && collection !== 'all') {
    if (!visible.includes(collection)) return { sources: [], scopeProjects: scope }
    scope = [collection]
  }
  // 源1：BM25（服务端已按 visible 过滤）
  const bmHits: Array<{ project: string; path: string; score?: number }> = []
  try {
    const hits = await ctx.search.searchFulltext(q, collection && collection !== 'all' ? { project: collection } : {}, visible)
    for (const h of hits) if (!h.isDir) bmHits.push(h)
  } catch { /* BM25 不可用不影响向量通道 */ }
  // 源2：向量（全库 topK×6 → 按 scope 过滤）
  // D9：向量表内的 chunk_id 是 docId 的摘要，需经 manifest 反查回真实 docId。
  const keyToDocId = new Map<string, string>()
  for (const d of Object.values(manifest)) keyToDocId.set(docKeyOf(d.docId), d.docId)
  const scopeDocs = new Set(
    Object.values(manifest).filter((d) => scope.includes(d.project)).map((d) => d.docId),
  )
  let vecHits: Array<{ chunkId: string; distance: number }> = []
  const store = storeOf()
  if (store.dims()) {
    const emb = await ctx.model.embed(ctx, [q]).catch(() => null)
    if (emb && emb[0] && emb[0].length === store.dims()) {
      vecHits = store.search(Float32Array.from(emb[0]), topK * 6).filter((h) => {
        const docId = docIdOfChunk(h.chunkId, keyToDocId)
        return docId !== null && scopeDocs.has(docId)
      })
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
  const manifest = await loadManifest(ctx)
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
  return { sources, scopeProjects: scope }
}

/** 组装问答上下文并调用 LLM（mock 可测） */
async function ragAsk(ctx: Context, user: { username: string; role: string }, question: string, collection: string): Promise<{ answer: string; sources: RagSource[] }> {
  const { sources } = await ragSearch(ctx, user, question, collection, ASK_TOPK)
  if (sources.length === 0) {
    return { answer: '未在语料中找到相关资料（或您对这些资料没有查看权限）。请换一种问法，或确认语料已向量化。', sources: [] }
  }
  const blocks = sources.map((s, i) => `[${i + 1}] 来源 ${s.project}/${s.path}\n${s.snippet}`).join('\n\n')
  const messages = [
    { role: 'system' as const, content: '你是「私域枢纽 PrivHub」的知识助手。严格基于提供的资料回答问题，回答中用 [n] 标注来源编号；资料中没有的内容请明确回答「资料中未找到」，不要编造。' },
    { role: 'user' as const, content: `资料：\n${blocks}\n\n问题：${question}` },
  ]
  const answer = await ctx.model.chat(ctx, messages)
  return { answer, sources }
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

  /* 摄取串行队列（防并发风暴） */
  let queue: Promise<unknown> = Promise.resolve()
  const enqueue = (fn: () => Promise<void>): void => {
    queue = queue.then(fn, fn)
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

  /* 模型自检（admin） */
  svc.route('/privhub/api/model/status', async (req, res) => {
    const admin = adminOf(req, res)
    if (!admin) return
    const force = req.url?.includes('force=1') ?? false
    json(res, 200, { ok: true, ...await ctx.model.check(ctx, force) })
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
      json(res, 200, { ok: true, ...await dupCheckProject(ctx, project) })
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
    json(res, 200, { ok: true, affected: r.affected.length })
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
      const { sources } = await ragSearch(ctx, u, q, collection, k)
      void audit(ctx, u.username, 'rag-search', '', 'q=' + q.slice(0, 40) + ' hits=' + sources.length)
      json(res, 200, { ok: true, hits: sources })
    } catch (e) {
      json(res, 500, { ok: false, error: String(e instanceof Error ? e.message : e).slice(0, 200) })
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
    try {
      const r = await ragAsk(ctx, u, question, collection)
      void audit(ctx, u.username, 'rag-ask', '', 'q=' + question.slice(0, 40) + ' sources=' + r.sources.length)
      json(res, 200, { ok: true, answer: r.answer, sources: r.sources })
    } catch (e) {
      json(res, 400, { ok: false, error: e instanceof Error ? e.message : '问答失败' })
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