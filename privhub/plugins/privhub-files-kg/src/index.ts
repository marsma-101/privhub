/**
 * 私域枢纽知识图谱插件（privhub-files-kg，F18 / C17）
 *
 * 项目内文档关联图：
 *   - 节点 = 项目内 .md 文档（含双链解析）+ 带标签的文件
 *   - 边   = 双链 [[文件名]]（F16 语法，双向）+ 标签共现（F19 元数据）
 *   - 社区 = 连通分量（union-find），前端按社区同色系着色
 *   - 增量：监听 file:saved（F16 保存/回滚）与 meta:changed（F19 标签）
 *     清除对应项目缓存（节流 500ms），下次请求惰性重建
 *   - GET /privhub/api/kg?project= → { nodes, edges, communities }
 *
 * client：图标栏「🕸 知识图谱」→ 模态：项目选择 + SVG 图（社区分组圆环布局、
 * 滚轮缩放、hover 高亮、点击节点定位文件并预览）；无 .md 项目显示引导空态。
 *
 * @module privhub-files-kg
 */

import { readdir, readFile, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { existsSync } from 'node:fs'
import type { Context } from '@deepseek-ai/cordis'
import { json } from '../../privhub-core/src/index'

export const name = 'privhub-files-kg'
export const inject = ['privhub', 'storage', 'meta', 'eventBus']

export interface KgNode { id: string; name: string; path: string; tags: string[] }
export interface KgEdge { source: string; target: string; type: 'link' | 'tag' }
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
}

/** 双链语法：[[文件名]] / [[文件名|别名]] */
const LINK_RE = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g

export function apply(ctx: Context): void {
  /* E1 事件声明（监听） */
  ctx.eventBus.declareListen('file:saved', 'privhub-files-kg', '文档保存 → 图谱双链重建')
  ctx.eventBus.declareListen('meta:changed', 'privhub-files-kg', '标签变更 → 图谱关联更新')
  const svc = ctx.privhub
  const meta = ctx.meta

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
    const offMeta = ctx.on('meta:changed', (payload: { project?: string }) => {
      if (payload?.project) invalidate(payload.project)
    })
    return () => { offSaved(); offMeta() }
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

  /** 构建项目图（惰性：缓存命中直接返回）。 */
  async function buildGraph(project: string): Promise<KgGraph> {
    const cached = cache.get(project)
    if (cached && Date.now() - cached.at < 60_000) return cached.graph

    const files = await collectFiles(project)
    const mdFiles = files.filter((f) => f.isMd)
    // 节点：.md 文档 + 带标签的文件
    const nodes: KgNode[] = []
    const nodeByPath = new Map<string, KgNode>()
    for (const f of files) {
      const tags = await meta.getTags(project, f.path)
      if (!f.isMd && tags.length === 0) continue
      const node: KgNode = { id: project + '::' + f.path, name: f.name, path: f.path, tags }
      nodes.push(node)
      nodeByPath.set(f.path, node)
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
      const text = await readMd(project, f.path)
      const links = resolveLinks(text, mdFiles)
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
    for (const paths of tagIndex.values()) {
      for (let i = 0; i < paths.length; i++) {
        for (let j = i + 1; j < paths.length; j++) addEdge(paths[i], paths[j], 'tag')
      }
    }
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
    const insights: KgInsights = (() => {
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
      return {
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
    })()

    const graph: KgGraph = { nodes, edges, communities, insights }
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
      json(res, 200, { ok: true, project, graph })
    } catch (e) {
      json(res, 400, { ok: false, error: e instanceof Error ? e.message : '图谱构建失败' })
    }
  }, 'kg')
}
