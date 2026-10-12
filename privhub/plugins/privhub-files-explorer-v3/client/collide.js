/**
 * collide — 「标题碰撞」纯函数：同目录下输入的名字是否与既有条目撞名。
 *
 * 为什么单独一个模块：这条判断要在三处用（侧栏树的行内重命名、文件表的行内重命名、
 * 新建文档向导），且必须能被 Node 直接 import 做静态回归。不引 window / DOM，
 * 输入全部由调用方给 —— 因此它是纯的，测试不必起浏览器。
 *
 * 口径（为什么这样定）：
 *   · **以完整名字为主**：重命名会把扩展名一起改掉，用户提交的是完整文件名，
 *     前缀判据应当作用在整名上（如 `季度销售2026-北京.md` 与 `季度销售2026-上海.md`
 *     整名公共前缀 10 字 → 提示）。只比基名还会把「扩展名也是名字的一部分」丢掉。
 *   · 完全相同（大小写不敏感）⇒ exact。
 *   · 否则整名公共前缀 ≥ 8 **个字符**（中文、emoji 各算 1 个，按码点切）⇒ prefix，
 *     conflict 取前缀最长的那个名字。
 *   · 再补一层「基名相同」的兜底 ⇒ exact：`报告` 与 `报告.md` 的整名公共前缀只有
 *     2 字、够不到 8，但两者只差一个扩展名，在用户眼里就是同一个名字；只按整名前缀
 *     会漏掉这类「一个是另一个 + 扩展名」的包含关系。
 *   · 空白输入不判 —— 还没输完不该报警。
 *
 * 提示是「提示」不是「阻断」：本函数只描述冲突，是否放行由调用方/后端决定
 * （重命名与新建的同名拦截仍在服务端，会返回明确错误）。
 *
 * @module privhub-files-explorer-v3/client/collide
 */

/* 前缀阈值：与 nowen 的 titleDuplicateAssist 对齐（公共前缀 ≥ 8 字才提示）。 */
const PREFIX_MIN = 8

/** 按码点取字符：中文/emoji 各算 1 个「字」（`str.length` 会把 emoji 算成 2）。 */
function chars(s) { return Array.from(s) }

/** 两个已小写化的名字的公共前缀长度（按字符）。 */
function commonChars(a, b) {
  const A = chars(a)
  const B = chars(b)
  const n = Math.min(A.length, B.length)
  let i = 0
  while (i < n && A[i] === B[i]) i++
  return i
}

/** 去掉最后一个扩展名（`报告.md` → `报告`）；无扩展名或点开头的隐藏文件整个保留。 */
function stemOf(name) {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

/**
 * @param {string[]} names 同目录【其他】条目的名字（调用方须先排除被改名的那个自己）
 * @param {string} value 当前输入的标题
 * @returns {{ level: 'exact'|'prefix'|'', conflict: string, n: number }}
 *   exact：与 conflict 撞名；prefix：与 conflict 前 n 字相同；无冲突时 level/conflict 为空、n=0
 */
export function titleCollision(names, value) {
  const v = String(value == null ? '' : value).trim()
  if (!v) return { level: '', conflict: '', n: 0 }
  const lv = v.toLowerCase()
  let best = ''
  let bestLen = 0
  for (const raw of names || []) {
    const name = String(raw)
    const ln = name.toLowerCase()
    if (ln === lv) return { level: 'exact', conflict: name, n: 0 }
    const L = commonChars(lv, ln)
    if (L > bestLen) { best = name; bestLen = L }
  }
  /* 基名相同（扩展名不同）：报告 / 报告.md、报告.md / 报告.txt —— 整名前缀够不到阈值也要提示。
   * 此刻整名必不相同（相同已在上面 exact 返回），所以这里只可能是「基名同、整名异」。 */
  const vStem = stemOf(lv)
  for (const raw of names || []) {
    const name = String(raw)
    if (stemOf(name.toLowerCase()) === vStem) return { level: 'exact', conflict: name, n: 0 }
  }
  if (bestLen >= PREFIX_MIN) return { level: 'prefix', conflict: best, n: bestLen }
  return { level: '', conflict: '', n: 0 }
}
