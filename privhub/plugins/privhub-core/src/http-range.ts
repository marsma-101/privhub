/**
 * http-range —— **单区间** RFC 7233 解析（音视频预览的 Range 支持，2026-10-09）
 *
 * ## 为什么只认**一个**区间
 *
 * 参照 nowen-note（`backend/src/lib/http-range.ts`）的决定，跟着它的理由：
 * 浏览器的 `<video>` / `<audio>` **一次只要一个区间**（要"整段"时它就不发 `Range`），
 * 而多区间（`bytes=0-99,200-299`）要回 `multipart/byteranges`：既多一套拼装代码，
 * 又让**响应体大小由请求方随手决定** —— 一个 `bytes=0-9,0-9,0-9,…` 就能把分配放大任意倍。
 * ⇒ 见到逗号直接判 `multiple` 不做，省掉那条路径。
 *
 * ## 三种失败要分得开（调用方靠它决定回什么）
 *
 *   · `malformed`      —— 语法看不懂（不是 `bytes=` 开头、两端都空、不是 `数字-数字`）
 *   · `multiple`       —— 多于一个区间（见上：**有意不做**，不是"没实现"）
 *   · `unsatisfiable`  —— 语法合法但落在文件外（`start ≥ totalSize`、空文件、`bytes=-0`）
 * 三种**都回 416**（配合 `Content-Range: bytes *​/total`），但原因分开留着：
 * 断言能据此分辨"我们没实现多区间"和"客户端发疯了"。
 *
 * ## 边界（照 RFC，也照 nowen-note）
 *
 *   · `bytes=100-`  → 从 100 到结尾
 *   · `bytes=-500`  → **最后 500 字节**（后缀式；请求超过文件长度时整段给）
 *   · `bytes=0-99`  → 闭区间，**`end` 含在内**（`length = end - start + 1`）
 *   · `end` 超过文件尾 → 收敛到 `totalSize - 1`（不报错，这是 RFC 允许的宽容）
 *
 * 纯函数：不碰文件系统、不认识 HTTP 对象 ⇒ 可以直接拿合成用例断言（`tests/media-preview.mjs`）。
 *
 * @module privhub-core/http-range
 */

/** 解析结果。`reason` 的三个取值语义见文件头。 */
export type ParsedRange =
  | { ok: true; start: number; end: number; length: number }
  | { ok: false; reason: 'malformed' | 'multiple' | 'unsatisfiable' }

/**
 * 解析一个 `Range` 头。
 *
 * 返回 `null` 表示**没有区间请求**（头为空）—— 调用方据此走"整段"分支。
 * 这与"解析失败"是两件事，故意用两种返回（`null` vs `{ok:false}`）分开。
 */
export function parseSingleRange(header: string | null | undefined, totalSize: number): ParsedRange | null {
  if (!header) return null
  if (!Number.isSafeInteger(totalSize) || totalSize < 0) return { ok: false, reason: 'unsatisfiable' }

  const trimmed = String(header).trim()
  if (!trimmed.toLowerCase().startsWith('bytes=')) return { ok: false, reason: 'malformed' }
  const raw = trimmed.slice(trimmed.indexOf('=') + 1).trim()
  if (!raw) return { ok: false, reason: 'malformed' }
  /* 多区间：**有意不做**（见文件头）。判在语法之前，好让"我们没实现"与"客户端发错了"分得开。 */
  if (raw.includes(',')) return { ok: false, reason: 'multiple' }

  const m = raw.match(/^(\d*)-(\d*)$/)
  if (!m) return { ok: false, reason: 'malformed' }
  const [, rawStart, rawEnd] = m
  if (rawStart === '' && rawEnd === '') return { ok: false, reason: 'malformed' }
  if (totalSize === 0) return { ok: false, reason: 'unsatisfiable' }

  let start: number
  let end: number
  if (rawStart === '') {
    // 后缀式：bytes=-500 = 最后 500 字节
    const suffix = Number(rawEnd)
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return { ok: false, reason: 'unsatisfiable' }
    const len = Math.min(suffix, totalSize)
    start = totalSize - len
    end = totalSize - 1
  } else {
    start = Number(rawStart)
    if (!Number.isSafeInteger(start) || start < 0 || start >= totalSize) return { ok: false, reason: 'unsatisfiable' }
    if (rawEnd === '') {
      end = totalSize - 1
    } else {
      const e = Number(rawEnd)
      if (!Number.isSafeInteger(e) || e < start) return { ok: false, reason: 'unsatisfiable' }
      end = Math.min(e, totalSize - 1) // end 超尾：收敛，不报错
    }
  }
  return { ok: true, start, end, length: end - start + 1 }
}
