/**
 * layout — 树 → 画布坐标（**纯函数，不碰 DOM**，可被单元测试直接驱动）。
 *
 * ## 为什么自己算坐标（不上 d3 / markmap）
 *
 * 本仓是「无构建步骤」的：前端插件是浏览器直接 `import()` 的裸 ES 模块，
 * 不能有打包器去解析第三方依赖；从 CDN 取又会把内网应用绑到外网上（规划 §1 决策）。
 * 而思维导图的布局是**整齐树（tidy tree）**里最简单的一类：叶子按序纵向排开、
 * 父节点垂直居中于它的子节点区间 —— 三十行就够，且完全可测。
 *
 * ## 坐标系
 *
 * 原点在画布左上，y 向下（SVG 原生坐标系）。每个节点是一个矩形：
 *   · `x` 左边缘、`y` 是**中线**（不是上边缘 —— 连线接在左右中线，父居中于子更直观）；
 *   · 列宽按「该层最宽节点」统一，保证同层左边缘对齐、不会长短不一互相压。
 *
 * ## 输入输出
 *
 *   layoutTree(root, foldedKeys) → { nodes, links, width, height }
 *
 *   nodes: [{ key, path, text, display, title, depth, x, y, w, h, color, isRoot,
 *             hasChildren, folded, childCount }]
 *   links: [{ key, from, to, d }]   // d 是 SVG path 的 `d`（三次贝塞尔）
 *
 * `foldedKeys` 可以是 `Set` 或 `{ [key]: true }`；折叠的节点**不进 nodes/links**
 * （它的子孙整棵剪掉），但它自己仍在，并带 `folded: true` 供画布画「+N」。
 *
 * `key` 的取法与 `outline.js` 的 `keyOf(path)` 完全一致（根 = `''`），
 * 因此画布上选中的 key 可以原地喂回 `nodeAt(root, pathOf(key))`。
 *
 * @module privhub-mindmap/client/layout
 */

import { keyOf } from './outline.js'

/** 节点矩形高。 */
const NODE_H = 30
/** 相邻叶子的纵向间距（中心距）。 */
const ROW_STEP = 40
/** 父子列之间的水平空隙。 */
const COL_GAP = 44
/** 画布四周留白。 */
const PAD = 28
/** 节点矩形最小 / 最大宽度。 */
const MIN_W = 56
const MAX_W = 280
/** 矩形内部左右内边距（文字两侧）。 */
const INNER_PAD = 12
/** 正文字号（与 styles.js 的 .mm-node 保持一致，用于估宽）。 */
const FONT = 13

/** 单个字符的估宽（单位：px）。CJK / 全角按 2 个西文位算。 */
export function charWidth(ch) {
  const c = ch.codePointAt(0)
  const wide =
    (c >= 0x1100 && c <= 0x115f) ||   // 谚文字母
    (c >= 0x2e80 && c <= 0xa4cf) ||   // CJK 部首 / 假名 / 汉字 / 注音
    (c >= 0xac00 && c <= 0xd7a3) ||   // 谚文音节
    (c >= 0xf900 && c <= 0xfaff) ||   // CJK 兼容汉字
    (c >= 0xfe30 && c <= 0xfe6f) ||   // CJK 兼容形式
    (c >= 0xff00 && c <= 0xff60) ||   // 全角 ASCII
    (c >= 0xffe0 && c <= 0xffe6) ||   // 全角符号
    (c >= 0x1f300 && c <= 0x1faff)    // emoji（近似按全角）
  if (wide) return FONT * 1.0
  if (ch === ' ') return FONT * 0.30
  if (/[iIlj.,:;!'|]/.test(ch)) return FONT * 0.32
  if (/[A-Z@%&WM]/.test(ch)) return FONT * 0.68
  return FONT * 0.58
}

/** 估算一段文字的像素宽度。**只用于排版估宽**，不追求与浏览器逐像素一致。 */
export function textWidth(text) {
  let w = 0
  for (const ch of String(text == null ? '' : text)) w += charWidth(ch)
  return w
}

/** 节点矩形宽：按文字估宽，钳到 [MIN_W, MAX_W]。 */
function boxWidth(text) {
  const w = Math.round(textWidth(text) + INNER_PAD * 2)
  return Math.max(MIN_W, Math.min(MAX_W, w))
}

/** 超宽文字截断成 `…`（截断只影响**画面**；完整文字仍挂在 `<title>` 里可悬停看）。 */
function fitText(text, boxW) {
  const s = String(text == null ? '' : text)
  const avail = boxW - INNER_PAD * 2
  if (textWidth(s) <= avail) return s
  const ell = '…'
  const budget = avail - charWidth(ell)
  let out = ''
  let acc = 0
  for (const ch of s) {
    const cw = charWidth(ch)
    if (acc + cw > budget) break
    out += ch
    acc += cw
  }
  return out + ell
}

/**
 * 顶层分支配色板（按「一级子节点的序号」取色，与具体层级无关）。
 *
 * 用固定色板而不是按深度算 HSL：深浅层次再多也只有一级分支是「分类」，
 * 让它一眼分得开就够了；更深层沿用祖先的颜色（视觉上就是「同一根枝」）。
 * 色值刻意选中低饱和度，深浅两个主题下都能读（主题差异由 styles.js 兜）。
 */
export const BRANCH_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6',
]

/** 根节点颜色（不参与分支轮转）。 */
export const ROOT_COLOR = '#475569'

/**
 * 判一个 key 是否在折叠集里（`Set` / 普通对象都吃）。
 * @param {Set<string>|Object} foldedKeys
 * @param {string} key
 */
function isFolded(foldedKeys, key) {
  if (!foldedKeys) return false
  if (typeof foldedKeys.has === 'function') return !!foldedKeys.has(key)
  return !!foldedKeys[key]
}

/**
 * 计算整齐树布局。
 *
 * @param {{ text?: string, children?: Array }} root
 * @param {Set<string>|Object} [foldedKeys] 折叠的 key 集合（不含这些节点的子孙）
 * @returns {{ nodes: Array, links: Array, width: number, height: number }}
 */
export function layoutTree(root, foldedKeys) {
  const flat = []
  let leafCursor = 0

  /** 后序遍历：先摆叶子（按序占用 y），父节点再取子区间的中点。 */
  function walk(node, depth, path, branch) {
    const key = keyOf(path)
    const all = (node && node.children) || []
    const folded = isFolded(foldedKeys, key)
    const kids = folded ? [] : all
    const rec = {
      key,
      path: path.slice(),
      /* 根节点没有文字时给个占位名 —— 否则画布正中是一个空方块。 */
      text: depth === 0 ? (String(node.text || '').trim() || '（未命名导图）') : String(node.text == null ? '' : node.text),
      depth,
      branch,
      isRoot: depth === 0,
      hasChildren: all.length > 0,
      childCount: all.length,
      folded,
      w: 0,
      h: NODE_H,
      x: 0,
      y: 0,
      color: depth === 0 ? ROOT_COLOR : BRANCH_COLORS[branch % BRANCH_COLORS.length],
      children: [],
    }
    if (!kids.length) {
      rec.y = leafCursor
      leafCursor += ROW_STEP
    } else {
      rec.children = kids.map((c, i) => walk(c, depth + 1, path.concat(i), depth === 0 ? i : branch))
      rec.y = (rec.children[0].y + rec.children[rec.children.length - 1].y) / 2
    }
    flat.push(rec)
    return rec
  }
  walk(root, 0, [], 0)

  /* 列宽：每层取该层最宽节点，逐层累加得到每层的 x。 */
  const maxW = []
  for (const n of flat) maxW[n.depth] = Math.max(maxW[n.depth] || 0, boxWidth(n.text))
  const colX = []
  for (let d = 0; d < maxW.length; d++) colX[d] = d === 0 ? PAD : colX[d - 1] + maxW[d - 1] + COL_GAP

  for (const n of flat) {
    n.w = boxWidth(n.text)
    n.x = colX[n.depth]
    n.display = fitText(n.text, n.w)
    n.title = n.text
  }

  /* 平移成「从留白处开始」：叶子游标从 0 起算，最后一并加 PAD。
   * 椭圆对齐不必补偿 —— y 是中线，PAD 对每一层同样偏心。 */
  let maxDepth = 0
  for (const n of flat) {
    n.y = n.y + PAD + NODE_H / 2
    if (n.depth > maxDepth) maxDepth = n.depth
  }

  const byKey = new Map(flat.map((n) => [n.key, n]))
  const links = []
  for (const n of flat) {
    for (const c of n.children) {
      links.push({ key: n.key + '>' + c.key, from: n.key, to: c.key, d: linkPath(n, c) })
    }
  }

  const width = (colX[maxDepth] || PAD) + (maxW[maxDepth] || MIN_W) + PAD
  /* 高度 = 内容高 + 上下留白。内容高 = 「最后一片叶子的中线往下半个节点」减去「第一片叶子
   * 的中线往上半个节点」：中线间距是 (叶子数 − 1) × ROW_STEP，再加一个整节点高即得。
   * ⚠ 那个 `+ NODE_H` 不能省 —— 只留上下各 PAD 的话，最后一片叶子会被画布下沿切掉半格
   * （本插件的测试里有一条「画布包得住所有节点」的断言就守着它）。 */
  const height = Math.max(leafCursor - ROW_STEP, 0) + NODE_H + PAD * 2

  return { nodes: flat, links, width, height, byKey }
}

/** 父子连线：从父右缘中点拉到子左缘中点的三次贝塞尔（控制点横向伸出半格）。 */
function linkPath(parent, child) {
  const x1 = parent.x + parent.w
  const y1 = parent.y
  const x2 = child.x
  const y2 = child.y
  const mx = (x2 - x1) / 2
  return `M ${x1} ${y1} C ${x1 + mx} ${y1}, ${x2 - mx} ${y2}, ${x2} ${y2}`
}

/** 布局包围盒（导出 SVG 用）：内容 + 四周留白。 */
export function layoutBounds(layout) {
  return { x: 0, y: 0, width: Math.max(layout.width, 1), height: Math.max(layout.height, 1) }
}

/** XML 文本转义（节点文字进 `<text>` 前必须过这一道，否则 `a<b` 会让整份 SVG 解析失败）。 */
export function escXml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]
  ))
}

/** 给导出用的静态 SVG 片段（不依赖 Vue；测试可以直接断言字符串）。 */
export function renderSvg(layout, opts, esc) {
  const o = opts || {}
  const escFn = esc || escXml
  const b = layoutBounds(layout)
  const parts = []
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${b.width}" height="${b.height}" viewBox="0 0 ${b.width} ${b.height}" font-family="system-ui,-apple-system,'Segoe UI','Microsoft YaHei',sans-serif">`)
  if (o.background) parts.push(`<rect x="0" y="0" width="${b.width}" height="${b.height}" fill="${escFn(o.background)}"/>`)
  for (const l of layout.links) {
    const from = layout.byKey.get(l.from)
    parts.push(`<path d="${l.d}" fill="none" stroke="${escFn(from ? from.color : ROOT_COLOR)}" stroke-width="1.6" stroke-opacity="0.55" stroke-linecap="round"/>`)
  }
  for (const n of layout.nodes) {
    const top = n.y - n.h / 2
    const r = n.isRoot ? 8 : 6
    parts.push(`<g><rect x="${n.x}" y="${top}" width="${n.w}" height="${n.h}" rx="${r}" ry="${r}" fill="${escFn(n.color)}" fill-opacity="${n.isRoot ? 1 : 0.12}" stroke="${escFn(n.color)}" stroke-width="${n.isRoot ? 1.5 : 1.2}"/>` +
      `<text x="${n.x + INNER_PAD}" y="${n.y}" dominant-baseline="central" font-size="${n.isRoot ? FONT + 1 : FONT}" fill="${n.isRoot ? '#ffffff' : escFn(n.color)}"${n.isRoot ? ' font-weight="600"' : ''}>${escFn(n.display)}</text></g>`)
  }
  parts.push('</svg>')
  return parts.join('\n')
}
