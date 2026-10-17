/**
 * outline — `.mindmap` 文件格式：解析 / 序列化 / 树操作（**纯函数，不碰 DOM**）。
 *
 * ## 格式（唯一出处；规划文档 `docs/PrivHub-思维导图-规划-2026-10-17.md` §1）
 *
 * 一张导图 = 一个 `.mindmap` 文件，内容是一份 **Markdown 风格缩进大纲**：
 *
 *   # 我现在有哪些项目        ← 第一行 `# ` 是导图标题（= 画布中心节点），可省略
 *
 *   - 私域枢纽
 *     - 文件中枢
 *       - 目录树 / 预览 / 上传
 *     - 协作
 *   - 马泉斌
 *
 * 解析规则（刻意宽松，**坏行降级不整张报废**）：
 *   · 行尾 `\r\n` / `\r` 一律按 `\n` 处理；
 *   · 空行忽略；
 *   · 首行缩进为 0 的 `# ` 行 = 标题（只认第一处）；之后的行一律当节点；
 *   · 行首 `- ` / `* ` / `+ ` 可有可无（Markdown 列表与手写缩进都能吃）；
 *   · 层级由**缩进宽度**决定：Tab 记 4 列，缩进单位取「全文件最小的正缩进宽度」
 *     （2 空格文件按 2、4 空格文件按 4、纯 Tab 文件按 4），因此三种常见写法都能正确分层；
 *   · 缩进跳跃（0 → 三级）不会丢节点：它挂到「最近的更浅祖先」下面，树深仍连续。
 *
 * ## 为什么是纯文本（设计地基，别改成 JSON 画布）
 *
 *   1. **智能体可写** —— 大模型写缩进列表是本能，不需要理解节点坐标；
 *      现有 `/privhub/api/agent/v1/write` 通道即插即用。
 *   2. **白拿全部既有能力** —— 版本历史、评论、标签、全库搜索、引用检查、双链、ACL：
 *      它就是一个普通文件。
 *   3. **插件关掉也不丢** —— 没有本插件时它仍是一份可读文本，不会变成打不开的黑盒。
 *
 * ## 序列化口径
 *
 * 一律输出 **2 空格一级 + `- ` 圆点**的规范形式（与模板一致）。因此「解析 → 序列化」
 * 会把 Tab / 4 空格 / `*` 圆点统一成规范形 —— 这是**有意**的归一，不是丢失：
 * 语义树不变；断言写成「先归一一次，再往返仍相等」。
 *
 * @module privhub-mindmap/client/outline
 */

/** 一个 Tab 在缩进里折算成多少列（Markdown 惯例 4）。 */
const TAB_COLS = 4
/** 行首圆点：`- ` / `* ` / `+ `。 */
const BULLET_RE = /^[-*+]\s+/
/** 标题行：0 缩进的 `# ` … `###### `。 */
const HEADING_RE = /^#{1,6}\s+(.+?)\s*$/
/** 行首空白。 */
const INDENT_RE = /^[ \t]*/

/** 缩进宽度（Tab = 4 列）。 */
function indentWidth(ws) {
  let w = 0
  for (const ch of ws) w += ch === '\t' ? TAB_COLS : 1
  return w
}

/** 去掉行首圆点与首尾空白。 */
function bareText(body) {
  return String(body).replace(BULLET_RE, '').trim()
}

/**
 * 解析大纲文本 → 树。
 *
 * 返回 `{ text, children }`，其中 `root.text` 就是标题（没有标题行时为空串）。
 * **不会抛错**：任何一行最坏也只是变成节点文本。
 *
 * @param {string} text
 * @returns {{ text: string, children: Array }}
 */
export function parseOutline(text) {
  const src = String(text == null ? '' : text).replace(/\r\n?/g, '\n')
  const lines = src.split('\n')

  /** 第一遍：拆出标题与「缩进宽度 + 文本」的行。 */
  let title = null
  const rows = []
  for (const raw of lines) {
    if (!raw.trim()) continue
    const ws = (INDENT_RE.exec(raw) || [''])[0]
    const body = raw.slice(ws.length)
    if (!ws.length && !title) {
      const h = HEADING_RE.exec(body)
      if (h) { title = h[1].trim(); continue }
    }
    const t = bareText(body)
    if (!t) continue
    rows.push({ w: indentWidth(ws), text: t })
  }

  /* 缩进单位：全文件最小的正宽度；没有缩进就是 2（随便一个值，反正不会有更深层）。 */
  let unit = 0
  for (const r of rows) if (r.w > 0 && (unit === 0 || r.w < unit)) unit = r.w
  if (!unit) unit = 2

  const root = { text: title === null ? '' : title, children: [] }
  const stack = [{ level: -1, node: root }]
  for (const r of rows) {
    const level = Math.max(0, Math.round(r.w / unit))
    // 挂到「最近的更浅祖先」下：缩进跳跃也不会丢节点
    while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop()
    const node = { text: r.text, children: [] }
    stack[stack.length - 1].node.children.push(node)
    stack.push({ level, node })
  }
  return root
}

/**
 * 树 → 规范大纲文本（2 空格一级 + `- `）。空树返回空串（不凭空造标题行）。
 *
 * @param {{ text?: string, children?: Array }} root
 * @returns {string}
 */
export function serializeOutline(root) {
  const out = []
  const title = String((root && root.text) || '').trim()
  if (title) out.push('# ' + title)
  const walk = (node, depth) => {
    for (const c of (node && node.children) || []) {
      out.push('  '.repeat(depth) + '- ' + String(c.text == null ? '' : c.text).trim())
      walk(c, depth + 1)
    }
  }
  walk(root, 0)
  return out.length ? out.join('\n') + '\n' : ''
}

/** 新建模板：标题 + 一个中心节点 + 两条示例分支。 */
export function createOutline(title) {
  const t = String(title == null ? '' : title).trim()
  return parseOutline(
    '# ' + (t || '思维导图') + '\n\n- 中心主题\n  - 分支一\n  - 分支二\n',
  )
}

/* ══════════════════════════════════════════════════════════════════════════
 * 树操作：一律**返回新对象**（不改入参），方便 Vue 侦听与撤销类扩展
 * ══════════════════════════════════════════════════════════════════════════ */

/** 深拷贝（只认 `{ text, children }` 两个字段）。 */
export function cloneTree(node) {
  return {
    text: String((node && node.text) || ''),
    children: ((node && node.children) || []).map(cloneTree),
  }
}

/** 路径（子节点下标数组）→ 画布用的稳定 key。根 = 空串。 */
export function keyOf(path) {
  return (path || []).join('/')
}

/** key → 路径。 */
export function pathOf(key) {
  const s = String(key == null ? '' : key)
  return s === '' ? [] : s.split('/').map((n) => Number(n))
}

/** 按路径取节点；越界返回 null。 */
export function nodeAt(root, path) {
  let n = root
  for (const i of path || []) {
    if (!n || !n.children || !n.children[i]) return null
    n = n.children[i]
  }
  return n || null
}

/** 按路径取父节点（根的父节点为 null）。 */
export function parentAt(root, path) {
  const p = path || []
  return p.length ? nodeAt(root, p.slice(0, -1)) : null
}

/** 按路径改文本，返回新树（路径无效 ⇒ 原样克隆返回）。 */
export function setTextAt(root, path, text) {
  const next = cloneTree(root)
  const n = nodeAt(next, path)
  if (n) n.text = String(text == null ? '' : text).trim()
  return next
}

/**
 * 在 `path` 节点下追加子节点，返回 `{ root, path }`（新节点路径）。
 * `path` 指向不存在的节点时，退化为挂在根下。
 */
export function insertChild(root, path, text) {
  const next = cloneTree(root)
  let n = nodeAt(next, path)
  if (!n) n = next
  if (!Array.isArray(n.children)) n.children = []
  n.children.push({ text: String(text == null ? '' : text).trim() || '新节点', children: [] })
  const parentPath = nodeAt(next, path) ? (path || []) : []
  return { root: next, path: parentPath.concat(n.children.length - 1) }
}

/**
 * 在 `path` 节点**之后**插入同级节点，返回 `{ root, path }`。
 * 根（或无效路径）没有同级 ⇒ 退化为在根下追加（与「＋子节点」一致）。
 */
export function insertSibling(root, path, text) {
  const p = path || []
  if (!p.length) return insertChild(root, [], text)
  const next = cloneTree(root)
  const parent = parentAt(next, p)
  if (!parent) return insertChild(next, [], text)
  const idx = p[p.length - 1]
  parent.children.splice(idx + 1, 0, { text: String(text == null ? '' : text).trim() || '新节点', children: [] })
  return { root: next, path: p.slice(0, -1).concat(idx + 1) }
}

/** 删除节点（根不可删），返回新树。 */
export function removeAt(root, path) {
  const p = path || []
  const next = cloneTree(root)
  if (!p.length) return next
  const parent = parentAt(next, p)
  if (parent) parent.children.splice(p[p.length - 1], 1)
  return next
}

/** 可见节点数（含根与标题）。 */
export function countNodes(root) {
  let n = 1
  for (const c of (root && root.children) || []) n += countNodes(c)
  return n
}

/** 文件名去扩展名（缺省标题用）。 */
export function stemOf(name) {
  return String(name == null ? '' : name).replace(/\.[^./\\]+$/, '')
}
