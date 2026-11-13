/**
 * 读路径的 MIME 判定（**只在 Node 降级分支用**）。
 *
 * ## 两种收尾，MIME 责任方不同
 *
 * | 分支 | 谁决定 Content-Type | 本文件是否参与 |
 * |---|---|---|
 * | 直读（`X-Accel-Redirect`） | **nginx**，按 accel URI 的扩展名查 `types{}` | ❌ 不参与 |
 * | 降级（密文 / 老库未迁移） | **Node**，Node 直接写响应头 | ✅ 就是本文件 |
 *
 * 直读分支的机制值得写下来（两轮实测都在这里翻过车）：nginx 内部跳转后会
 * **按目标 URI 再查一次** `types{}`，上游响应里的 `Content-Type` 被忽略；
 * 而"按公开 URL 的扩展名"也是错的 —— 只有 accel URI 说了算。
 * 我们的 accel URI 是 `.pool/<physicalId>.<ext>`，天然带真实扩展名，
 * 所以直读分支的 MIME 自动正确，不需要本文件。
 *
 * ## 为什么这里允许再写一份「扩展名 → MIME」
 *
 * 因为降级分支里 Node 必须自己给一个值。键集**不手写**（避免与
 * `privhub-core/src/file-exts.ts` 漂移），而是从 `IMAGE_EXTS ∪ {pdf} ∪ MEDIA_EXTS`
 * 派生；`checkMimeCoverage()` 在 apply 时自检键集，不一致只告警不抛错
 * —— MIME 判错不该让整个索引服务装不上，最坏结果只是 `application/octet-stream`。
 *
 * ⚠ 这份映射的**取值**参照 `privhub-files/src/index.ts` 的 `preview-raw`。
 * 这里不重复那套断言：本文件的键集由下面的派生式保证，改集合时自动跟随。
 *
 * @module privhub-svc-fileindex/mime
 */

import { IMAGE_EXTS, MEDIA_EXTS } from '../../privhub-core/src/file-exts'
import { loadExtMime } from './nginx-types'

/**
 * 扩展名 → Content-Type。
 *
 * **取值不手写**：来自 `runtime/mime-map.json`（读路径 MIME 的唯一真实来源），
 * 同一份 JSON 也用于生成 nginx 的 `types{}` 补充块。这样「直读给什么 MIME」
 * 与「降级给什么 MIME」由构造保证一致，不需要两处各写一份再对账。
 *
 * 这里剥掉 `; charset=utf-8` 之类的参数：Node 侧由调用方按需补 charset，
 * 而 nginx 的 `types{}` 语法里不允许带参数。
 */
let MIME_BY_EXT: Record<string, string> | null = null

function mimeTable(): Record<string, string> {
  if (MIME_BY_EXT) return MIME_BY_EXT
  const src = loadExtMime()
  MIME_BY_EXT = Object.fromEntries(
    Object.entries(src).map(([ext, mime]) => [ext, mime.split(';')[0].trim()]),
  )
  return MIME_BY_EXT
}

/** 本映射**应该**覆盖的键集（派生自 core 的集合，不手写）。 */
export const MIME_EXPECTED_EXTS: readonly string[] = Object.freeze([
  ...IMAGE_EXTS, 'pdf', ...MEDIA_EXTS,
])

/**
 * 取 Content-Type；不在映射里 → `application/octet-stream`。
 *
 * 为什么兜底是八位字节流而不是猜文本：文本类文件虽然也能预览，但那条链走的是
 * `/api/preview`（JSON 正文），不经过本端点；走到这里的未知类型若硬猜成 text/plain，
 * 反而会让二进制内容以明文形式内联渲染（更坏的失败姿态）。
 *
 * ⚠ **只用于 Node 自己发字节的降级分支**（`sendFromNode`，那里 Node 直接写响应头，
 * 本函数真实生效）。交给 nginx 的直读分支**不要**用它 —— accel 分支的 MIME 由
 * `X-Accel-Redirect` 那个 URI 的扩展名决定，上游 `Content-Type` 会被忽略，
 * 原因与被推翻的两种说法都记在 `auth.ts` 的 `redirectToNginx` 注释里。
 */
export function contentTypeOf(ext: string): string {
  const e = String(ext ?? '').trim().replace(/^\.+/, '').toLowerCase()
  try {
    return mimeTable()[e] ?? 'application/octet-stream'
  } catch {
    /* 表读不到（部署缺文件）时给 octet-stream 而不是让请求 500。
     * 这是**唯一**允许的降级方向：错误类型只会让浏览器改成下载，
     * 而抛错会让文件完全打不开。启动期 checkMimeCoverage 已经报过错了。 */
    return 'application/octet-stream'
  }
}

/** 该扩展名是不是 SVG（需要单独的严格 CSP，见调用方）。 */
export function isSvgExt(ext: string): boolean {
  return String(ext ?? '').trim().replace(/^\.+/, '').toLowerCase() === 'svg'
}

/**
 * 键集自检：与 core 的集合比对。**只告警不抛错**（见文件头）。
 * 由 `registerFileAuth` 在 apply 时调一次，结果进启动日志。
 */
export function checkMimeCoverage(): { missing: string[]; extra: string[] } {
  /* 读表失败**不能**让 fileindex 挂不上：这是启动期自检，它的职责是报告问题，
   * 不是成为新的故障点。失败就明确报出来，然后按"没有覆盖"处理。 */
  let table: Record<string, string>
  try {
    table = mimeTable()
  } catch (e) {
    console.error('[fileindex] MIME 表读取失败，直读/降级都会退化成 octet-stream：'
      + (e instanceof Error ? e.message : String(e)))
    return { missing: [...MIME_EXPECTED_EXTS], extra: [] }
  }
  const have = new Set(Object.keys(table))
  const want = new Set(MIME_EXPECTED_EXTS)
  const missing = [...want].filter((e) => !have.has(e))
  const extra = [...have].filter((e) => !want.has(e))
  if (missing.length > 0 || extra.length > 0) {
    console.warn('[fileindex] 降级分支的 MIME 映射与 core 扩展名集合不一致：缺 ['
      + missing.join(', ') + ']；多 [' + extra.join(', ') + ']（只有降级分支受影响，直读不受影响）')
  }
  return { missing, extra }
}
