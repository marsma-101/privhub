/**
 * 双链语法解析 —— PrivHub 全仓唯一权威定义（Q4 / §2.6）
 *
 * ## 为什么要有这个模块
 *
 * `[[…]]` 的正则此前在 **5 个文件里各写一份**（kg / refcheck / export / edit-md / wiki），
 * 只要有人改一处忘改另一处，"图谱里有这条边、引用检查里却报断链"这种自相矛盾就会出现。
 * 现在：
 *   · **服务端三处**（kg / refcheck / export）直接 `import` 本模块，只有一份实现；
 *   · **两个浏览器端渲染器**（edit-md / wiki）不能 import 服务端 `.ts`
 *     （`client/` 是浏览器直接加载的静态模块，Node 侧的静态套件也会 import 它们），
 *     各自保留一份字面量，但由 `tests/integrity.mjs` 断言**全仓只有一个不同的字面量**
 *     —— 漂移即测试失败（见该套件「双链正则唯一性」）。
 *
 * ## 语法
 *
 * ```
 * [[目标]]              [[目标|别名]]            [[目标#块锚点]]
 * [[id:<稳定ID>]]       [[id:<稳定ID>|别名]]
 * ```
 *
 * - `目标` 按**完整文件名**解析（含扩展名）。这与改造前**完全一致**：本模块刻意
 *   **不新增"去掉扩展名也算命中"** 的口径 —— 那会凭空造出原本不存在的图边与
 *   "不再是断链"的结论，属于另一件事（见改进方案 §2.6「新增块锚点可后置」）。
 * - `#块锚点` 在解析目标时剥掉（refcheck 早就这么做了，kg 此前没有 —— 现在两边一致）。
 * - `id:` 前缀是**稳定 ID 写法**：改名不断链靠的是它 / 靠登记表的"名→ID"表，
 *   而不是靠把用户文档里的 `[[名]]` 改写成 ID（本仓不改写用户文档，见 `svc-links` 说明）。
 *
 * @module privhub-svc-links/linkparse
 */

/**
 * 双链正则（**全仓唯一字面量**，5 个消费方必须一字不差）。
 *
 * 带 `g` 标志，因此**只用于 `matchAll` / `replace`**，不要用 `test` / `exec` ——
 * 全局正则的 `lastIndex` 是跨调用共享的可变状态，直接 `exec` 会漏匹配。
 * （`matchAll` 与 `String.replace(globalRe)` 内部都会另建实例，不受影响。）
 */
export const WIKI_LINK_RE = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g

/** 一条被解析出来的双链。 */
export interface WikiLink {
  /** `[[` 与 `]]` 之间的原文（含 `|别名` / `#锚点`），用于原样回写。 */
  raw: string
  /** 目标（已剥 `#锚点`、已 trim）；`id:` 写法时为空串（ID 另见 {@link id}）。 */
  target: string
  /** 稳定 ID（`[[id:xxx]]` 写法），否则 null。 */
  id: string | null
  /** 别名（`|` 右侧），否则 null。 */
  alias: string | null
  /** 块锚点（`#` 右侧），否则 null。 */
  anchor: string | null
  /** 在整个文本里的起始下标。 */
  index: number
}

/** 稳定 ID 的书写前缀：`[[id:xxxx]]`。 */
export const ID_PREFIX = 'id:'

/**
 * 把一条原始链接文本规范成 `{ id, target, anchor }`。
 *
 * 顺序：trim → 在**第一个** `#` 处切出锚点 → 剥掉 `<>` 包裹 → 反斜杠转正向斜杠 →
 * 去掉前导 `./` 与 `/` → 识别 `id:` 前缀。外链/盘符（`http:` `mailto:` `C:`）返回空目标。
 * 与 refcheck 原有 `normTarget` 的口径保持一致（那边多做了百分号解码，因为 md 链接
 * 可能被 URL 编码；双链是手写语法，不做解码）。
 */
export function normalizeLinkTarget(raw: string): { id: string | null; target: string; anchor: string | null } {
  let t = String(raw ?? '').trim()
  if (t === '') return { id: null, target: '', anchor: null }
  // 块锚点：只认第一个 #（`#块名` 里再出现 # 只是块名的一部分）
  let anchor: string | null = null
  const hash = t.indexOf('#')
  if (hash >= 0) {
    anchor = t.slice(hash + 1).trim() || null
    t = t.slice(0, hash)
  }
  if (t.startsWith('<') && t.endsWith('>')) t = t.slice(1, -1).trim()
  t = t.replace(/\\/g, '/').trim()
  while (t.startsWith('./')) t = t.slice(2)
  t = t.replace(/^\/+/, '')
  // 外链 / 盘符：不是项目内目标（`[[https://…]]` 属误用，按无目标处理）
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(t) && !t.startsWith(ID_PREFIX)) {
    return { id: null, target: '', anchor }
  }
  if (t.startsWith(ID_PREFIX)) {
    const id = t.slice(ID_PREFIX.length).trim()
    return id === '' ? { id: null, target: '', anchor } : { id, target: '', anchor }
  }
  if (t === '' || t === '.' || t === '..') return { id: null, target: '', anchor }
  return { id: null, target: t, anchor }
}

/**
 * 把一段文本里的双链全部解析出来（顺序 = 出现顺序）。
 *
 * 注意：正则的捕获组 1 **只含目标**（`[^\]|]+` 会把 `|别名` 与 `#锚点` 挡在外面），
 * 所以别名/锚点是从**整个匹配**里再切出来的，不能直接用 `m[1]`。
 */
export function parseWikiLinks(text: string): WikiLink[] {
  const out: WikiLink[] = []
  const src = String(text ?? '')
  for (const m of src.matchAll(WIKI_LINK_RE)) {
    const inner = m[0].slice(2, -2)
    const bar = inner.indexOf('|')
    const head = bar >= 0 ? inner.slice(0, bar) : inner
    const alias = bar >= 0 ? (inner.slice(bar + 1).trim() || null) : null
    const h = normalizeLinkTarget(head)
    out.push({
      raw: inner,
      target: h.target,
      id: h.id,
      anchor: h.anchor,
      alias,
      index: m.index ?? 0,
    })
  }
  return out
}

/** 只要目标（供"这段文本引用了谁"使用；不含别名的 UI 语义）。 */
export function wikiLinkTargets(text: string): string[] {
  return parseWikiLinks(text).map((l) => l.target).filter((t) => t !== '')
}
