/**
 * privhub-svc-dup · core —— 上传期查重的**纯逻辑**（无 IO / 不认识 ctx）。
 *
 * ## 它解决什么（Q6 / §3.3 轻量版）
 *
 * 「同一份文件传两次」是查重页最常见的一类重复来源（方案 §3.3 原文）。本模块提供
 * 一套**文件指纹 + 索引**，让上传时能查到"与 X 内容相同"——
 * **只提示、不落盘**：不做物理复用（复用密文 + 引用计数会牵动加密存储与回收站
 * 语义，方案把物理复用列为高风险、待 Q6 拍板，本批不做）。
 *
 * ## 三层指纹（都放同一份条目里）
 *
 * - `h` 原始字节 sha256 —— 「一个个字节都一样」的文件在这里相同；
 * - `n` 规范化文本 sha256 —— 换行 / 首尾空白不同、正文其实一样的文本在这里相同
 *   （与 RAG 语料同一套 {@link normalizeText} 口径，否则「一个进了语料、一个没进」
 *   的同内容文件会判成不同）；
 * - `s` MinHash 16 特征签名 —— 给**近似**用：banding 出候选对，再按签名一致率
 *   与阈值比较（阈值由上层给，默认见 {@link NEAR_THRESHOLD}）。
 *
 * 三种指纹是同一份 buffer 上的一次遍历算出来的，不是算三遍。
 *
 * ## 为什么 normalizeText 在这里又写了一份
 *
 * svc-rag 是 L3 功能插件、svc-dup 是 L2 能力服务，让 L2 反向依赖 L3 会把装配顺序
 * 倒过来（L2 先于 L3 挂载）。抽共享模块又要跨 L2/L3 边界建包。这段逻辑只有几行且是
 * **冻结口径**（改了会让"同内容"判定漂移），两处同值比抽模块更省事；本文件的
 * 字符类全部用 `String.fromCharCode` 构造而不是转义字面量 —— 免得源码里落进真实
 * 的不可见字符（历史上踩过转义被工具链解码成裸控制字符的坑）。
 *
 * @module privhub-svc-dup/core
 */

import { createHash } from 'node:crypto'

/** 侧车索引文件名（放 `data/` 下）。 */
export const STORE_FILE = 'dup-index.json'
export const STORE_VERSION = 1

/** MinHash 特征数（与 svc-rag 的语料指纹同规格：16 特征 → 分辨率 1/16）。 */
export const MINHASH_FEATURES = 16
/** LSH banding 的 band 数（4 band × 4 row）。 */
export const MINHASH_BANDS = 4

/** 近似相似度阈值（Jaccard 估计量的签名一致率）。可由上层覆盖。 */
export const NEAR_THRESHOLD = 0.9

/**
 * 只有不超过这个大小的文件才算 `n` / `s`（近似与规范化）。
 * 超了照旧只算 `h` —— 大文件读全量进内存不值当，且上传是流式的。
 * 与 svc-rag 的 `FINGERPRINT_MAX_BYTES`（8MB）不同：这里是**上传热路径**，
 * 上限取小些（2MB）以避免把上传请求的内存峰值抬起来。
 */
export const NEAR_MAX_BYTES = 2 * 1024 * 1024

/** 单次 check 最多回带的近似命中数（避免一次上传刷出几十条提示）。 */
export const NEAR_HITS_CAP = 5

/** 条目上限：超了按最久未触碰淘汰（索引是派生数据，丢了重建即可）。 */
export const MAX_ENTRIES = 20000

/** 值分隔符：用 charCode 而不是转义序列，避免源码里出现真实控制字符。 */
const NUL = String.fromCharCode(0)
/** UTF-8 BOM（U+FEFF）。 */
const BOM_RE = new RegExp('^' + String.fromCharCode(0xfeff))
/** 零宽 / 词连接符：U+200B ZWSP、U+200C ZWNJ、U+200D ZWJ、U+2060 WJ。 */
const ZERO_WIDTH_RE = new RegExp('[' + String.fromCharCode(0x200b, 0x200c, 0x200d, 0x2060) + ']', 'g')

/** 一份文件的指纹。`n` / `s` 仅文本类小文件有。 */
export interface Fingerprint {
  /** 原始字节 sha256（十六进制）。 */
  h: string
  /** 规范化文本 sha256（仅文本类小文件）。 */
  n?: string
  /** MinHash 签名（仅文本类小文件）。 */
  s?: number[]
  size: number
}

/** 索引里的一条（指纹 + 归属）。 */
export interface DupEntry extends Fingerprint {
  project: string
  path: string
  /** 最近一次触碰时间（淘汰用）。 */
  at: number
}

export interface DupStore {
  version: number
  entries: DupEntry[]
}

/* ============ 指纹 ============ */

/** sha256 十六进制。 */
export function sha256(x: string | Buffer): string {
  return createHash('sha256').update(x).digest('hex')
}

/**
 * 规范化文本（与 svc-rag 的语料口径**同值**）：去 BOM/零宽、\r 归一、压缩连续空白。
 */
export function normalizeText(raw: string): string {
  let t = raw.replace(BOM_RE, '').replace(ZERO_WIDTH_RE, '')
  t = t.replace(/\r\n?/g, '\n')
  t = t.replace(/[ \t]+\n/g, '\n')
  t = t.replace(/\n{3,}/g, '\n\n').trim()
  return t
}

/**
 * MinHash 16 特征（4-gram shingle，步长 2）。与 svc-rag 的 `minHashOf` 同算法。
 *
 * 文本过短（< 8 字符）返回 `[]` —— 太短的串没有统计意义，宁可不算近似。
 */
export function minHashSig(text: string): number[] {
  const nd = normalizeText(text)
  if (nd.length < 8) return []
  const sig: number[] = Array.from({ length: MINHASH_FEATURES }, () => Infinity)
  for (let i = 0; i + 4 <= nd.length; i += 2) {
    const h = createHash('sha256').update(nd.slice(i, i + 4)).digest()
    for (let k = 0; k < MINHASH_FEATURES; k++) {
      const v = h.readUInt32BE((k * 2) % 28) // 16 × 4 字节散布（与 svc-rag 同式）
      const w = (v + k * 2654435761) >>> 0 // 洗牌偏移
      if (w < sig[k]) sig[k] = w
    }
  }
  return sig.map((v) => (v === Infinity ? 0 : v))
}

/** 签名一致率 = 逐位相同的比例（Jaccard 相似度估计量）。 */
export function sigSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  if (n === 0) return 0
  let same = 0
  for (let i = 0; i < n; i++) if (a[i] === b[i]) same++
  return same / n
}

/** 签名的 band 桶键（4 个）。 */
export function bandKeys(sig: number[]): string[] {
  if (sig.length < MINHASH_FEATURES) return []
  const rows = Math.floor(MINHASH_FEATURES / MINHASH_BANDS)
  const out: string[] = []
  for (let b = 0; b < MINHASH_BANDS; b++) {
    out.push(b + ':' + sha256(sig.slice(b * rows, (b + 1) * rows).join(',')).slice(0, 8))
  }
  return out
}

/**
 * 从一段明文 buffer 造指纹。
 *
 * 判文本的方式与 svc-rag 一致：**含 NUL 字节就当二进制**（不按扩展名 —— 扩展名会撒谎）。
 * 超过 {@link NEAR_MAX_BYTES} 只算 `h`。
 *
 * @param rawHash 若调用方已流式算过原始 sha256，直接传进来（省一次全量哈希）。
 */
export function fingerprint(buf: Buffer, rawHash?: string): Fingerprint {
  const fp: Fingerprint = { h: rawHash ?? sha256(buf), size: buf.length }
  if (buf.length > NEAR_MAX_BYTES) return fp
  const text = buf.toString('utf8')
  if (text.indexOf(NUL) < 0) {
    fp.n = sha256(normalizeText(text))
    fp.s = minHashSig(text)
  }
  return fp
}

/* ============ 形状裁决 ============ */

function isFp(x: unknown): x is Fingerprint {
  const o = x as Fingerprint
  if (!o || typeof o !== 'object') return false
  if (typeof o.h !== 'string' || o.h.length !== 64) return false
  if (typeof o.size !== 'number' || !Number.isFinite(o.size) || o.size < 0) return false
  if (o.n !== undefined && (typeof o.n !== 'string' || o.n.length !== 64)) return false
  if (o.s !== undefined && (!Array.isArray(o.s) || o.s.some((v) => typeof v !== 'number'))) return false
  return true
}

/**
 * 清洗一份外部传入的索引：只留形状合法的条目（项目/路径/指纹都齐全），其余静默丢弃。
 * 丢弃不会丢"文件"，只会让它下次上传时重新登记一遍 —— 索引是派生数据。
 */
export function normalizeStore(input: unknown): DupStore {
  const out: DupStore = { version: STORE_VERSION, entries: [] }
  const raw = (input as { entries?: unknown })?.entries
  if (!Array.isArray(raw)) return out
  for (const item of raw) {
    const o = item as DupEntry
    if (!o || typeof o !== 'object') continue
    if (typeof o.project !== 'string' || o.project === '') continue
    if (typeof o.path !== 'string' || o.path === '') continue
    if (!isFp(o)) continue
    out.entries.push({
      ...o,
      at: typeof o.at === 'number' && Number.isFinite(o.at) ? o.at : 0,
      s: o.s ? o.s.slice(0, MINHASH_FEATURES) : undefined,
    })
  }
  return out
}

/** 索引键：项目 + 路径。用 JSON 元组而不是拼接（路径里可能含分隔符）。 */
export const kFile = (project: string, path: string): string => JSON.stringify([project, path])

/** 项目内「原始哈希 / 规范化哈希 / band」三类桶的键（都带项目，避免跨项目互相命中）。 */
export const kRaw = (project: string, h: string): string => JSON.stringify([project, 'r', h])
export const kNorm = (project: string, n: string): string => JSON.stringify([project, 'n', n])
export const kBand = (project: string, band: string): string => JSON.stringify([project, 'b', band])
