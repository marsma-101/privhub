/**
 * kg-layout.mjs — 知识图谱客户端布局与过滤回归套件（W-C / §2.5 §2.7 §2.8）
 *
 * 为什么需要这一套：
 *   「50+ 节点不再重叠成球」是 §2.7 的验收条件，而这件事**只有把布局代码跑起来
 *   量距离才验得出来**。frontend-templates 只编译模板（语法对就绿）、
 *   integrity 只看文件契约，两者都不会发现力导向退化成了"叠成一团"——
 *   而"叠成一团"恰恰是改造前的老毛病，最容易在后续调参时悄悄复发。
 *
 * 做法：给模块一个最小 window 桩（模块顶层只用到 window.PrivHub），
 *   直接 import 真实的 plugins/privhub-files-kg/client/index.js，
 *   取出组件对象、把 computed 变成 getter、把 methods 绑上去，
 *   然后喂合成图调用 layout() / visibleGraph，对**真实坐标**做断言。
 *   不连服务、不起 DOM，纯静态套件。
 *
 *   node tests/kg-layout.mjs
 *
 * @module tests/kg-layout
 */

const MODULE_URL = new URL('../plugins/privhub-files-kg/client/index.js', import.meta.url).href
const PAD = 46
const W = 900
const H = 560

let pass = 0
let fail = 0
const failures = []

function ok(cond, msg) {
  if (cond) pass++
  else { fail++; failures.push(msg) }
  console.log((cond ? '  ✅ ' : '  ❌ ') + msg)
}

/* ══════════ 1. 加载真实客户端模块（最小 window 桩） ══════════ */

globalThis.window = {
  PrivHub: {
    api: async () => ({ ok: false, error: '（静态套件不连服务）' }),
    nav: {
      project: '', selected: null, entries: [],
      relPathOf: (n) => n, openDir: async () => {}, selectEntry: () => {},
    },
    toast: () => {},
  },
}

let KgView
try {
  const mod = await import(MODULE_URL)
  KgView = mod.default.slots.kg
} catch (e) {
  console.log('  ❌ 加载 KG 客户端模块失败：' + (e && e.message))
  process.exit(1)
}

/** 组装一个"够像 Vue 实例"的对象：computed → getter，methods → 绑定方法。 */
function mount(graph, w = W, h = H) {
  const o = KgView.data()
  for (const [k, fn] of Object.entries(KgView.computed)) {
    Object.defineProperty(o, k, { get: fn.bind(o), configurable: true })
  }
  for (const [k, fn] of Object.entries(KgView.methods)) o[k] = fn.bind(o)
  o.graph = graph
  o.W = w
  o.H = h
  return o
}

/**
 * 合成图：链 + 跨节点短接 + 每 7 个节点一个标签，另带目录分层与一个孤立点，
 * 形状刻意"不像圆环"——环状合成图会让任何布局都好看，验不出问题。
 */
function synth(n, { dirs = false } = {}) {
  const nodes = []
  const edges = []
  for (let i = 0; i < n; i++) {
    const dir = dirs && i % 3 === 0 ? 'docs/' : dirs && i % 3 === 1 ? 'notes/' : ''
    const path = dir + 'f' + i + '.md'
    nodes.push({
      id: 'P::' + path,
      name: 'f' + i + '.md',
      path,
      tags: i % 7 === 0 ? ['会议'] : (i % 11 === 0 ? ['规范'] : []),
    })
  }
  const add = (a, b, type) => { if (a !== b) edges.push({ source: nodes[a].path, target: nodes[b].path, type }) }
  for (let i = 0; i + 1 < n; i++) add(i, i + 1, 'link')
  for (let i = 0; i + 5 < n; i += 3) add(i, i + 5, i % 2 ? 'tag' : 'link')
  for (let i = 0; i + 17 < n; i += 11) add(i, i + 17, 'link')
  const communities = []
  for (let i = 0; i < n; i += 10) communities.push(nodes.slice(i, i + 10).map((x) => x.path))
  return {
    nodes, edges, communities,
    insights: {
      nodeCount: n, edgeCount: edges.length, communityCount: communities.length,
      maxCommunitySize: 10, isolatedCount: 0, linkEdges: 0, tagEdges: 0,
      linkDensity: 0, topTags: [], hubs: [],
    },
  }
}

/** 重叠对：圆心距 < 两半径之和（视觉上点压点）。 */
function overlapPairs(positions) {
  let overlap = 0
  let minGap = Infinity
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const a = positions[i]
      const b = positions[j]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      minGap = Math.min(minGap, d - (a.r + b.r))
      if (d < a.r + b.r) overlap++
    }
  }
  return { overlap, minGap: positions.length < 2 ? Infinity : minGap }
}

console.log('\n── §2.7 力导向布局：不重叠、有限、确定 ──')

for (const n of [12, 60, 150, 400]) {
  const o = mount(synth(n))
  const t0 = Date.now()
  o.layout()
  const ms = Date.now() - t0
  const ps = o.positions
  ok(ps.length === n, `n=${n}：每个节点都有坐标（${ps.length}/${n}）`)
  ok(ps.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)), `n=${n}：坐标无 NaN/Infinity`)
  ok(ps.every((p) => p.x >= PAD - 1e-6 && p.x <= o.W - PAD + 1e-6 && p.y >= PAD - 1e-6 && p.y <= o.H - PAD + 1e-6),
    `n=${n}：全部落在画布留白内（无节点被裁到框外）`)
  const { overlap, minGap } = overlapPairs(ps)
  ok(overlap === 0, `n=${n}：无重叠节点对（实测 ${overlap} 对，最小净间距 ${minGap.toFixed(1)}px）`)
  ok(ms < 3000, `n=${n}：布局耗时在预算内（${ms}ms < 3000ms）`)

  // 确定性：同一份图两次布局必须完全一致，否则用户每次刷新看到的形状都不同
  const o2 = mount(synth(n))
  o2.layout()
  const same = o2.positions.every((p, i) => Math.abs(p.x - ps[i].x) < 1e-9 && Math.abs(p.y - ps[i].y) < 1e-9)
  ok(same, `n=${n}：布局确定性（两次坐标完全一致，不依赖随机数）`)
}

{
  // 边端点必须落在真实节点坐标上，否则线会指向虚空
  const o = mount(synth(40))
  o.layout()
  const pts = new Set(o.positions.map((p) => p.x.toFixed(3) + ',' + p.y.toFixed(3)))
  ok(o.edgeLines.length === o.visibleGraph.edges.length, `边数与可见边一致（${o.edgeLines.length}）`)
  ok(o.edgeLines.every((l) => pts.has(l.x1.toFixed(3) + ',' + l.y1.toFixed(3)) && pts.has(l.x2.toFixed(3) + ',' + l.y2.toFixed(3))),
    '每条边的两端都锚在真实节点坐标上')
  ok(o.edgeLines.every((l) => l.type === 'link' || l.type === 'tag'), '边分型（link/tag）原样带到绘制层')
}

console.log('\n── §2.5 边分型过滤 ──')
{
  const o = mount(synth(60))
  o.showTag = false
  ok(o.visibleGraph.edges.every((e) => e.type === 'link'), '关掉标签共现后只剩双链边')
  o.showTag = true
  o.showLink = false
  ok(o.visibleGraph.edges.every((e) => e.type === 'tag'), '关掉双链后只剩标签边')
  o.showLink = true
  ok(o.visibleGraph.nodes.length === 60 && o.visibleGraph.edges.length > 0, '两个开关都打开时恢复全图')
}

console.log('\n── §2.7 聚焦局部图 / 只看孤立节点 / 标签·目录·度数过滤 ──')
{
  const o = mount(synth(60))
  o.focusPath = 'f20.md'
  const vg = o.visibleGraph
  const paths = vg.nodes.map((n) => n.path).sort()
  ok(paths.includes('f20.md'), '聚焦时包含自身')
  ok(vg.nodes.length === 1 + vg.edges.length, '聚焦视图里节点数 = 1 + 一跳边数（看不到二跳）')
  ok(vg.edges.every((e) => e.source === 'f20.md' || e.target === 'f20.md'), '聚焦视图里的边都与焦点相连')

  o.focusPath = ''
  o.isolateOnly = true
  ok(o.visibleGraph.edges.length === 0, '只看孤立节点时没有边')
  ok(o.visibleGraph.nodes.every((nd) => !synth(60).edges.some((e) => e.source === nd.path || e.target === nd.path)),
    '只看孤立节点时列出的确实都是孤点')

  o.isolateOnly = false
  o.tagFilter = '会议'
  ok(o.visibleGraph.nodes.length > 0 && o.visibleGraph.nodes.every((nd) => nd.tags.includes('会议')),
    `按标签过滤：只剩带该标签的节点（${o.visibleGraph.nodes.length} 个）`)
  o.tagFilter = ''

  // 目录过滤要喂带目录的图（根目录 '' 也要能选）
  const od = mount(synth(60, { dirs: true }))
  od.dirFilter = 'docs'
  ok(od.visibleGraph.nodes.length > 0 && od.visibleGraph.nodes.every((nd) => nd.path.startsWith('docs/')),
    `按目录过滤：只剩该目录下的节点（${od.visibleGraph.nodes.length} 个）`)
  ok(od.visibleGraph.edges.every((e) => e.source.startsWith('docs/') && e.target.startsWith('docs/')),
    '按目录过滤后不留"悬挂边"（两端都被过滤掉的边必须剪掉）')
  od.dirFilter = ''
  ok(od.visibleGraph.nodes.length === 60, '清空目录过滤后回到全图')
  od.dirFilter = ''
  ok(od.allDirs.includes('docs') && od.allDirs.includes('notes') && od.allDirs.includes(''),
    `目录下拉列出图里出现过的全部目录含根目录（${od.allDirs.map((d) => d === '' ? '（根）' : d).join(' ')}）`)

  // 度数阈值：判的是**原图度数**（"重要程度"），不是过滤后残余边数
  // —— 过滤会剪掉连向被滤节点的边，用残余边数回判必然对不上（这不是 bug，是口径）
  o.minDeg = 3
  const fullDeg = new Map()
  for (const e of o.graph.edges) {
    fullDeg.set(e.source, (fullDeg.get(e.source) || 0) + 1)
    fullDeg.set(e.target, (fullDeg.get(e.target) || 0) + 1)
  }
  ok(o.visibleGraph.nodes.length > 0 && o.visibleGraph.nodes.every((nd) => (fullDeg.get(nd.path) || 0) >= 3),
    `度数阈值过滤：剩下的节点（按全图度数）都不小于阈值（${o.visibleGraph.nodes.length} 个）`)
  o.minDeg = 0
  ok(o.visibleGraph.nodes.length === 60, '清空过滤后回到全图')
}

console.log('\n── §2.8 规模保护回执：截断必须明说，不能静默 ──')
{
  const bare = synth(20)
  ok(mount(bare).truncNote === '', '未截断时不给提示（不制造无谓警告）')

  const t = synth(20)
  t.truncated = { nodeTotal: 512, edgeTotal: 9000, tagGroupsTrimmed: 0 }
  const note = mount(t).truncNote
  ok(note.includes('截断'), '截断时提示里明说"已截断"')
  ok(note.includes(`20/512`) && note.includes(`${t.edges.length}/9000`), `截断提示带"实显/总量"（${note}）`)

  const t2 = synth(20)
  t2.truncated = { nodeTotal: 20, edgeTotal: t2.edges.length, tagGroupsTrimmed: 3 }
  const note2 = mount(t2).truncNote
  ok(note2.includes('3'), '只有标签团被截断时也要提示（只靠节点/边数看不出来）')
}

console.log('\n── §2.7 密集图只标枢纽（标注比圆点更早糊） ──')
{
  const big = mount(synth(200))
  const hubs = [...big.hubLabels]
  ok(hubs.length > 0 && hubs.length <= 12, `200 节点图里挑出 ${hubs.length} 个枢纽用于标名（≤12）`)
  // 度数最高的节点必须在标名集合里；度数为 1 的末端节点必须不在
  const deg = new Map()
  for (const e of big.graph.edges) {
    deg.set(e.source, (deg.get(e.source) || 0) + 1)
    deg.set(e.target, (deg.get(e.target) || 0) + 1)
  }
  const top = [...deg.entries()].sort((a, b) => b[1] - a[1])[0][0]
  ok(big.hubLabels.has(top), '度数最高的节点一定标名（枢纽不会被漏掉）')
  const leaf = [...deg.entries()].find(([, d]) => d === 1)
  ok(!big.hubLabels.has(leaf[0]) && big.showLabel(leaf[0]) === false, '末端叶子节点默认不标名')

  big.hover = leaf[0]
  ok(big.showLabel(leaf[0]) === true, 'hover 的节点始终显示名称')
  big.hover = null
  big.q = 'f3'
  ok(big.showLabel('f3.md') === true && big.showLabel('f100.md') === false, '搜索命中的节点显示名称、未命中的不显示')
  big.q = ''
  big.zoom = 2
  ok(big.showLabel(leaf[0]) === true, '放大到 1.8x 以上后全部标名（用户明确要看时的出口）')
  const small = mount(synth(20))
  ok(small.showLabel('f0.md') === true, '小图（≤150 节点）始终标名')
}

console.log('\n========================================================')
console.log(`  知识图谱布局回归：${pass} 通过 / ${fail} 失败`)
if (fail) {
  console.log('  失败项：')
  for (const f of failures) console.log('    - ' + f)
}
console.log('========================================================')
process.exit(fail ? 1 : 0)
