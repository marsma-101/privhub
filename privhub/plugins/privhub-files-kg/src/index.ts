/**
 * 私域枢纽知识图谱插件（privhub-files-kg，F18 / C17）
 *
 * 项目内文档关联图：
 *   - 节点 = 项目内 .md 文档（含双链解析）+ 带标签的文件
 *   - 边   = 双链 [[文件名]]（F16 语法，双向）+ 标签共现（F19 元数据）
 *   - 标签来源 = sidecar（data/meta.json）∪ 文档 frontmatter `tags:`（W-A / §2.2，
 *     读侧合并；写侧同步与来源标记留待后续，详见 frontmatterTags 注释）
 *   - 社区 = 连通分量（union-find），前端按社区同色系着色
 *   - 增量：监听 file:saved（F16 保存/回滚）、file:changed（上传/恢复）与
 *     meta:changed（F19 标签）清除对应项目缓存（节流 500ms），下次请求惰性重建
 *   - 规模保护（W-C / §2.8）：节点/边上限 + 标签团单团截断 + 有上限并发读取
 *   - GET /privhub/api/kg?project= → { nodes, edges, communities, insights, truncated }
 *   - GET /privhub/api/kg/backlinks?project=&path= → 反向链接 / 出链（W-C / §2.4）
 *   - 权限：项目级 canAccess + **逐文件 ACL（acl.can view）**——被拒文件必须从
 *     节点、边、洞察（hubs/topTags）三处一并摘除，否则文件名仍会泄露
 *     （W-A 安全修复，2026-10-11）；反向链接的来源与目标同样逐条过滤，否则
 *     "谁引用了这个文件"会变成一条绕过文件 ACL 的读取旁路。
 *
 * client：图标栏「🕸 知识图谱」→ 视图：项目选择 + SVG 图（自研力导向布局、
 * 拖拽平移、滚轮缩放、图内搜索、边分型过滤、聚焦局部图、hover 高亮、点击定位文件）。
 *
 * @module privhub-files-kg
 */

import { readdir, stat } from 'node:fs/promises'
import { extname } from 'node:path'
import { existsSync } from 'node:fs'
import type { Context } from '@deepseek-ai/cordis'
import { json } from '../../privhub-core/src/index'
import type { UserRecord } from '../../privhub-core/src/index'

export const name = 'privhub-files-kg'
export const inject = ['privhub', 'storage', 'meta', 'eventBus', 'acl']

export interface KgNode { id: string; name: string; path: string; tags: string[] }
export interface KgEdge { source: string; target: string; type: 'link' | 'tag' }
/** 规模保护回执（W-C / §2.8）：只在真的截断时出现，界面据此明说"仅显示 Top-N"。 */
export interface KgTruncated { nodeTotal: number; edgeTotal: number; tagGroupsTrimmed: number }
/** G3 洞察：图结构统计。 */
export interface KgInsights {
  /** 总节点数 */
  nodeCount: number
  /** 总边数 */
  edgeCount: number
  /** 连通分量数（社区数） */
  communityCount: number
  /** 最大社区节点数 */
  maxCommunitySize: number
  /** 孤立节点数（无任何边） */
  isolatedCount: number
  /** 双链边数 / 标签共现边数 */
  linkEdges: number
  tagEdges: number
  /** 双链密度：有双链的文档数 / 文档节点数（0~1） */
  linkDensity: number
  /** 标签 Top（按出现次数降序，最多 5 个） */
  topTags: { tag: string; count: number }[]
  /** 关联最多的节点（最多 3 个：入边+出边数） */
  hubs: { name: string; degree: number }[]
}
export interface KgGraph {
  nodes: KgNode[]
  edges: KgEdge[]
  /** 连通分量：每组一个节点 id 数组（按组内节点数降序） */
  communities: string[][]
  /** G3 洞察 */
  insights: KgInsights
  /** 规模保护的截断回执（W-C / §2.8）；未截断时为 undefined */
  truncated?: KgTruncated
}

/** 双链语法：[[文件名]] / [[文件名|别名]] */
const LINK_RE = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g

/* ---------- 规模保护（W-C / §2.8）----------
 * 为什么需要：两张图都会爆 ——
 *   · 标签团是 O(k²)，一个 500 篇的标签会生成 12 万条边（内存与前端渲染一起崩）；
 *   · 大项目里 `meta.getTags` / `readMd` 逐条 await 是串行的，重建要按秒计。
 * 上限取值的口径：**只保护"别炸"，不追求精确**。被丢掉的一定是度数最低的节点
 * （孤立点信息量最低），且截断事实会随 `truncated` 一起回给界面明说，不静默截。 */
const NODE_CAP = 400
const EDGE_CAP = 1500
/** 单个标签最多参与成团的文件数（团内两两成边 ⇒ 40 篇 = 780 条边，已是可读上限） */
const TAG_CLIQUE_MAX = 40
/** 读取 .md / 标签的并发上限：够快，又不至于把磁盘/加密层打满 */
const IO_CONCURRENCY = 8

/**
 * 有上限的并发 map（§2.8②）：逐条 await 的串行循环在大项目里是主要耗时。
 * 用「工位拉取」而不是切片并发：每个工位做完一个立刻取下一个，
 * 不会因为某一条慢而让整批等它（切片并发最慢那片等于整批耗时）。
 */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length)
  let next = 0
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const i = next++
      if (i >= items.length) return
      out[i] = await fn(items[i], i)
    }
  })
  await Promise.all(workers)
  return out
}

export function apply(ctx: Context): void {
  /* E1 事件声明（监听） */
  ctx.eventBus.declareListen('file:saved', 'privhub-files-kg', '文档保存 → 图谱双链重建')
  ctx.eventBus.declareListen('file:changed', 'privhub-files-kg', '上传/恢复等变更 → 图谱重建（此前只认 file:saved，上传的新文件要等 60s TTL 才上图）')
  ctx.eventBus.declareListen('meta:changed', 'privhub-files-kg', '标签变更 → 图谱关联更新')
  const svc = ctx.privhub
  const meta = ctx.meta
  const acl = ctx.acl

  /** 项目图缓存：project → { at, graph }（事件失效 + 60s TTL） */
  const cache = new Map<string, { at: number; graph: KgGraph }>()
  let invalidateTimer: ReturnType<typeof setTimeout> | null = null

  function invalidate(project?: string): void {
    if (project !== undefined) cache.delete(project)
    else cache.clear()
    // 节流：批量事件只清一次缓存（重建本身是惰性的）
    if (invalidateTimer) clearTimeout(invalidateTimer)
    invalidateTimer = setTimeout(() => { invalidateTimer = null }, 500)
  }

  /** 事件监听（effect 可逆） */
  ctx.effect(() => {
    const offSaved = ctx.on('file:saved', (payload: { project?: string }) => {
      if (payload?.project) invalidate(payload.project)
    })
    const offChanged = ctx.on('file:changed', (payload: { project?: string }) => {
      if (payload?.project) invalidate(payload.project)
    })
    const offMeta = ctx.on('meta:changed', (payload: { project?: string }) => {
      if (payload?.project) invalidate(payload.project)
    })
    return () => { offSaved(); offChanged(); offMeta() }
  })

  /** 递归收集项目内文件列表（.md 全部 + 其余扩展名仅作候选）。 */
  async function collectFiles(project: string, rel = ''): Promise<{ path: string; name: string; isMd: boolean }[]> {
    const dir = await svc.resolveReal(project, rel)
    if (dir === null || !existsSync(dir)) return []
    const out: { path: string; name: string; isMd: boolean }[] = []
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
    for (const e of entries) {
      if (e.name.startsWith('.')) continue
      const child = rel === '' ? e.name : rel + '/' + e.name
      if (e.isDirectory() && !e.isSymbolicLink()) {
        out.push(...await collectFiles(project, child))
      } else if (extname(e.name).toLowerCase() === '.md') {
        out.push({ path: child, name: e.name, isMd: true })
      } else {
        out.push({ path: child, name: e.name, isMd: false })
      }
    }
    return out
  }

  /** 读取 .md 文本（≤512KB）。 */
  async function readMd(project: string, path: string): Promise<string> {
    const target = await svc.resolveReal(project, path)
    if (target === null || !existsSync(target)) return ''
    const s = await stat(target).catch(() => null)
    if (!s || s.isDirectory() || s.size > 512 * 1024) return ''
    return ctx.storage.readText(target).catch(() => '')
  }

  /**
   * 取 markdown frontmatter 里的 `tags:`（W-A / §2.2，2026-10-11）。
   *
   * 为什么要在图谱侧读它：模板生成的文档 frontmatter 里写着 `tags: [会议]`，但全仓
   * 没有任何地方把它同步进 `data/meta.json`（`setTags` 只有标签插件的 HTTP 路由一个
   * 调用方）⇒ 用户"明明打了标签却不出现在图谱里"。
   *
   * 为什么这里是**读侧合并**而不是写进 meta：写侧会引入第二个 meta.json 写入方，
   * 且"界面删掉的标签下次保存又回来"这个坑需要给 meta 增加来源（provenance）字段
   * 才能避开——那是另一批的活（见改进方案 §2.2 与 W-C）。读侧合并先让图谱正确，
   * 且零写入、零迁移、可逆。
   *
   * 支持三种写法：`tags: [a, b]`、`tags: a, b`、以及 YAML 列表（`tags:` 后逐行 `- a`）。
   */
  function frontmatterTags(text: string): string[] {
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
    if (!fm) return []
    const unquote = (s: string): string => s.trim().replace(/^["']|["']$/g, '').trim()
    const block = fm[1]
    // 注意：这里只能用 [ \t] 不能用 \s —— \s 含换行，会把「tags: 后换行的 YAML 列表」
    // 误当成行内写法，把下一行的 `- 值` 连字符一起吃进标签（实测坑，2026-10-11）。
    const inline = /^tags[ \t]*:[ \t]*(.+)$/im.exec(block)
    if (inline) {
      const v = inline[1].trim()
      return v.replace(/^\[|\]$/g, '').split(',').map(unquote).filter((s) => s !== '')
    }
    const list = /^tags[ \t]*:[ \t]*\r?\n((?:[ \t]*-[ \t]*.+\r?\n?)+)/im.exec(block)
    if (list) return list[1].split('\n').map((l) => unquote(l.replace(/^[ \t]*-[ \t]*/, ''))).filter((s) => s !== '')
    return []
  }

  /** 合并两处标签（顺序：sidecar 在前，frontmatter 补缺；去重）。 */
  function mergeTags(sidecar: string[], fromFm: string[]): string[] {
    if (fromFm.length === 0) return sidecar
    return [...new Set([...sidecar, ...fromFm])]
  }

  /** 双链解析：[[名称]] → 目标节点 id（同目录或全项目匹配）。 */
  function resolveLinks(text: string, files: { path: string; name: string }[]): string[] {
    const targets: string[] = []
    for (const m of text.matchAll(LINK_RE)) {
      const name = m[1].trim()
      const hit = files.find((f) => f.name === name)
      if (hit) targets.push(hit.path)
    }
    return [...new Set(targets)]
  }

  /**
   * 从节点与边派生「社区 + 洞察」。抽成独立函数是为了让 ACL 过滤后能**重算**
   * 这两项统计：被拒文件必须先摘掉再统计，否则 hubs / topTags 仍会带出它的名字
   * （见 restrictGraph 的说明）。
   */
  function deriveStructure(nodes: KgNode[], edges: KgEdge[]): { communities: string[][]; insights: KgInsights } {
    // 社区：连通分量（union-find；节点自环初始化，find 循环需跳过自环）
    const parent = new Map<string, string>()
    const find = (x: string): string => {
      let r = parent.get(x) ?? x
      while (parent.has(r) && parent.get(r) !== r) r = parent.get(r)!
      return r
    }
    const union = (a: string, b: string): void => {
      const ra = find(a); const rb = find(b)
      if (ra !== rb) parent.set(ra, rb)
    }
    for (const n of nodes) parent.set(n.path, n.path)
    for (const e of edges) union(e.source, e.target)
    const groups = new Map<string, string[]>()
    for (const n of nodes) {
      const r = find(n.path)
      const arr = groups.get(r) ?? []
      arr.push(n.path)
      groups.set(r, arr)
    }
    const communities = [...groups.values()].sort((a, b) => b.length - a.length)

    /* G3 洞察：图结构统计 */
    const nodeCount = nodes.length
    const edgeCount = edges.length
    const linkEdges = edges.filter((e) => e.type === 'link').length
    const tagEdges = edges.filter((e) => e.type === 'tag').length
    // 孤立节点：度（link+tag 合计）为 0
    const degree = new Map<string, number>()
    for (const n of nodes) degree.set(n.path, 0)
    for (const e of edges) {
      degree.set(e.source, (degree.get(e.source) ?? 0) + 1)
      degree.set(e.target, (degree.get(e.target) ?? 0) + 1)
    }
    const isolatedCount = [...degree.values()].filter((d) => d === 0).length
    // 双链密度：至少有一条 link 边的文档数 / 文档节点数
    const linkedDocs = new Set<string>()
    for (const e of edges) if (e.type === 'link') { linkedDocs.add(e.source); linkedDocs.add(e.target) }
    const docNodes = nodes.filter((n) => n.path.toLowerCase().endsWith('.md')).length
    const linkDensity = docNodes > 0 ? linkedDocs.size / docNodes : 0
    // 标签 Top
    const tagCount = new Map<string, number>()
    for (const n of nodes) for (const t of n.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1)
    const topTags = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag, count]) => ({ tag, count }))
    // 关联最多的节点
    const hubs = [...degree.entries()]
      .filter(([path]) => degree.get(path) !== 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([path, d]) => ({ name: nodes.find((n) => n.path === path)?.name ?? path, degree: d }))
    const insights: KgInsights = {
      nodeCount,
      edgeCount,
      communityCount: communities.length,
      maxCommunitySize: communities.length ? communities[0].length : 0,
      isolatedCount,
      linkEdges,
      tagEdges,
      linkDensity: Math.round(linkDensity * 100) / 100,
      topTags,
      hubs,
    }
    return { communities, insights }
  }

  /**
   * 按文件级 ACL 过滤图（W-A 安全修复，2026-10-11）。
   *
   * 为什么不在 buildGraph 里过滤：图缓存按 project 缓存、与请求者无关。若在构建时
   * 就按「第一个请求者」的权限裁剪，后来权限更大的用户会拿到别人的裁剪结果。
   * 因此缓存只存**结构**，过滤在每次请求时施加（规则命中判定是内存操作，不昂贵）。
   *
   * 摘除顺序必须是「先节点、再边、后统计」：洞察里的 hubs / topTags 是从节点派生的，
   * 只摘节点不重算统计，被拒文件名仍会从「关联最多的节点」里露出来。
   */
  function restrictGraph(graph: KgGraph, user: UserRecord, project: string): KgGraph {
    const allowed = new Set<string>()
    for (const n of graph.nodes) {
      const d = acl.can(user, 'view', project, n.path)
      if (!d || d.allow) allowed.add(n.path)
    }
    if (allowed.size === graph.nodes.length) return graph // 无规则命中 → 原图原样返回
    const nodes = graph.nodes.filter((n) => allowed.has(n.path))
    const edges = graph.edges.filter((e) => allowed.has(e.source) && allowed.has(e.target))
    return { nodes, edges, ...deriveStructure(nodes, edges), truncated: graph.truncated }
  }

  /**
   * 反向链接 / 出链（W-C / §2.4）。
   *
   * 为什么复用图缓存而不是另建反向索引：图里 link 边的**方向语义就是"谁引用谁"**
   * （`addEdge(引用方, 被引用方, 'link')`），反向查询 = 一次 O(E) 过滤。另建索引
   * 就意味着第二个失效点，而这套缓存的事件失效已经写好且够用。
   *
   * 为什么来源与目标都要过 ACL：这是全仓唯一一处"读取某文件正文片段"的接口，
   * 不逐条过滤就等于给出一条绕过文件 ACL 的旁路 —— 一个你无权查看的文件，
   * 它的正文片段会从"谁引用了它"里漏出来。
   */
  async function backlinksFor(project: string, path: string, user: UserRecord): Promise<{
    incoming: { project: string; path: string; name: string; snippet: string }[]
    outgoing: { project: string; path: string; name: string; snippet: string }[]
  }> {
    const graph = await buildGraph(project)
    const allowed = (p: string): boolean => {
      const d = acl.can(user, 'view', project, p)
      return !d || d.allow
    }
    const nameOf = (p: string): string => graph.nodes.find((n) => n.path === p)?.name ?? p.slice(p.lastIndexOf('/') + 1)
    /** 取引用方正文里含 [[目标名]] 的那一行当摘要（找不到就回空串，界面显示"（未取到摘要）"） */
    const snippetOf = async (src: string, targetName: string): Promise<string> => {
      const text = await readMd(project, src)
      for (const line of text.split('\n')) {
        if (line.includes('[[') && line.includes(targetName)) return line.trim().slice(0, 160)
      }
      return ''
    }
    const myName = nameOf(path)
    // 入链：在**引用方**的正文里找 `[[我的名字]]` 那一行；出链：在**我**的正文里找 `[[目标名]]`
    const incomingPaths = graph.edges.filter((e) => e.type === 'link' && e.target === path && allowed(e.source)).map((e) => e.source)
    const outgoingPaths = graph.edges.filter((e) => e.type === 'link' && e.source === path && allowed(e.target)).map((e) => e.target)
    const incoming = await mapLimit(incomingPaths, IO_CONCURRENCY, async (p) => ({
      project, path: p, name: nameOf(p), snippet: await snippetOf(p, myName),
    }))
    const outgoing = await mapLimit(outgoingPaths, IO_CONCURRENCY, async (p) => ({
      project, path: p, name: nameOf(p), snippet: await snippetOf(path, nameOf(p)),
    }))
    return { incoming, outgoing }
  }


  /** 构建项目图（惰性：缓存命中直接返回；返回的是**未过滤**的完整结构图）。 */
  async function buildGraph(project: string): Promise<KgGraph> {
    const cached = cache.get(project)
    if (cached && Date.now() - cached.at < 60_000) return cached.graph

    const files = await collectFiles(project)
    const mdFiles = files.filter((f) => f.isMd)
    // 先读 .md 正文：既供双链解析，也供 frontmatter 标签合并（读一次，两处用）
    // §2.8②：有上限并发 —— 串行 await 是「大项目图谱慢」的主因
    const mdTextList = await mapLimit(mdFiles, IO_CONCURRENCY, (f) => readMd(project, f.path))
    const mdText = new Map<string, string>()
    mdFiles.forEach((f, i) => mdText.set(f.path, mdTextList[i]))
    // 节点：.md 文档 + 带标签的文件
    // 标签 = sidecar（meta.json）∪ frontmatter `tags:`（W-A / §2.2，见 frontmatterTags）
    const tagsList = await mapLimit(files, IO_CONCURRENCY, (f) => meta.getTags(project, f.path))
    const nodes: KgNode[] = []
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      const tags = mergeTags(tagsList[i], frontmatterTags(mdText.get(f.path) ?? ''))
      if (!f.isMd && tags.length === 0) continue
      nodes.push({ id: project + '::' + f.path, name: f.name, path: f.path, tags })
    }
    // 边：双链（双向）+ 标签共现
    const edges: KgEdge[] = []
    const edgeKey = new Set<string>()
    const addEdge = (a: string, b: string, type: 'link' | 'tag'): void => {
      if (a === b) return
      const key = a < b ? a + '|' + b : b + '|' + a
      if (edgeKey.has(key)) return
      edgeKey.add(key)
      edges.push({ source: a, target: b, type })
    }
    for (const f of mdFiles) {
      const links = resolveLinks(mdText.get(f.path) ?? '', mdFiles)
      for (const t of links) addEdge(f.path, t, 'link')
    }
    const tagIndex = new Map<string, string[]>()
    for (const n of nodes) {
      for (const t of n.tags) {
        const arr = tagIndex.get(t) ?? []
        arr.push(n.path)
        tagIndex.set(t, arr)
      }
    }
    // §2.8①：单个标签的成团规模也要设上限 —— 只靠全局边上限的话，一个热点标签
    // 会先吃满全部配额（O(k²) 的分配也发生在截断之前），把真正的双链边挤出去。
    let tagGroupsTrimmed = 0
    for (const paths of tagIndex.values()) {
      if (paths.length > TAG_CLIQUE_MAX) tagGroupsTrimmed++
      const use = paths.length > TAG_CLIQUE_MAX ? paths.slice(0, TAG_CLIQUE_MAX) : paths
      for (let i = 0; i < use.length; i++) {
        for (let j = i + 1; j < use.length; j++) addEdge(use[i], use[j], 'tag')
      }
    }
    // §2.8①：全局上限。先按度数留节点（孤立点先走），再按两端度数留边。
    const deg = new Map<string, number>()
    for (const n of nodes) deg.set(n.path, 0)
    for (const e of edges) {
      deg.set(e.source, (deg.get(e.source) ?? 0) + 1)
      deg.set(e.target, (deg.get(e.target) ?? 0) + 1)
    }
    let shownNodes = nodes
    let shownEdges = edges
    if (nodes.length > NODE_CAP) {
      shownNodes = [...nodes].sort((a, b) => (deg.get(b.path) ?? 0) - (deg.get(a.path) ?? 0)).slice(0, NODE_CAP)
      const keep = new Set(shownNodes.map((n) => n.path))
      shownEdges = shownEdges.filter((e) => keep.has(e.source) && keep.has(e.target))
    }
    if (shownEdges.length > EDGE_CAP) {
      shownEdges = [...shownEdges]
        .sort((a, b) => ((deg.get(b.source) ?? 0) + (deg.get(b.target) ?? 0)) - ((deg.get(a.source) ?? 0) + (deg.get(a.target) ?? 0)))
        .slice(0, EDGE_CAP)
    }
    const truncated: KgTruncated | undefined =
      shownNodes.length < nodes.length || shownEdges.length < edges.length || tagGroupsTrimmed > 0
        ? { nodeTotal: nodes.length, edgeTotal: edges.length, tagGroupsTrimmed }
        : undefined
    const graph: KgGraph = { nodes: shownNodes, edges: shownEdges, ...deriveStructure(shownNodes, shownEdges), truncated }
    cache.set(project, { at: Date.now(), graph })
    return graph
  }

  /* ---- 图谱接口 ---- */
  svc.route('/privhub/api/kg', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    try {
      const url = new URL(req.url ?? '/', 'http://x')
      const project = url.searchParams.get('project') ?? ''
      if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
      const graph = await buildGraph(project)
      json(res, 200, { ok: true, project, graph: restrictGraph(graph, u, project) })
    } catch (e) {
      json(res, 400, { ok: false, error: e instanceof Error ? e.message : '图谱构建失败' })
    }
  }, 'kg')

  /* ---- 反向链接（W-C / §2.4）----
   * 这条路由同时在 privhub-admin-acl 的 GUARD_PATHS 表里登记了 view 守卫
   * （按 query 的 project/path 判定），handler 内部再对**引用方与目标**逐条过滤。
   * 两处都要有：守卫管"你能不能看这个文件"，handler 管"你还能不能看引用了它的那些文件"。 */
  svc.route('/privhub/api/kg/backlinks', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    try {
      const url = new URL(req.url ?? '/', 'http://x')
      const project = url.searchParams.get('project') ?? ''
      const path = url.searchParams.get('path') ?? ''
      if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
      if (!path) return json(res, 400, { ok: false, error: 'path 必填' })
      const r = await backlinksFor(project, path, u)
      json(res, 200, { ok: true, project, path, ...r })
    } catch (e) {
      json(res, 400, { ok: false, error: e instanceof Error ? e.message : '反向链接查询失败' })
    }
  }, 'kg-backlinks')
}
