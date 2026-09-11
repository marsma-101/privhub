/**
 * 私域枢纽全文搜索插件（privhub-files-fulltext，F17 / C15）
 *
 * 把 S4 `ctx.search` 的全文索引接上数据源：
 *   - 启动时全量构建：扫描所有项目内文本文件（md/txt/json/csv 等，≤512KB）
 *     → ctx.search.index({ id: project::path, text })
 *   - 增量维护（监听事件，零侵入）：
 *       file:saved（F16 保存/回滚，带 doc 内容）→ 直接索引
 *       audit:logged action=upload / restore → 读文件索引
 *       action=delete / purge → remove
 *       action=rename / move → remove 旧路径 + 读新路径索引
 *       action=clean（清空回收站）→ 全量重建（低频保守策略）
 *   - GET /privhub/api/fulltext/search?q=&project= → BM25 命中（snippet ±40 字符），
 *     结果按可见项目过滤（canAccess）
 *
 * F09（privhub-files-search）前端加「文件名 / 全文」切换后调用本接口。
 *
 * @module privhub-files-fulltext
 */

import { readdir, stat } from 'node:fs/promises'
import { join, extname, dirname } from 'node:path'
import { existsSync } from 'node:fs'
import type { Context } from '@deepseek-ai/cordis'
import { json } from '../../privhub-core/src/index'
import type { AuditEntry } from '../../privhub-svc-audit/src/index'

export const name = 'privhub-files-fulltext'
export const inject = ['privhub', 'storage', 'search', 'audit', 'eventBus']

/** 参与全文索引的文本扩展名（与 core 预览文本集一致，另加常见文档类）。 */
const TEXT_EXTS = new Set(['md', 'txt', 'json', 'js', 'ts', 'html', 'htm', 'css', 'xml', 'yaml', 'yml', 'csv', 'log', 'py', 'java', 'c', 'cpp', 'sh', 'bat', 'ini', 'toml', 'sql', 'markdown'])
/** 单文件大小上限（与 S4 maxIndexBytes 一致）。 */
const MAX_BYTES = 512 * 1024

export function apply(ctx: Context): void {
  const svc = ctx.privhub
  const search = ctx.search

  /* E1 事件声明（监听） */
  ctx.eventBus.declareListen('file:saved', 'privhub-files-fulltext', '文档保存 → 直接索引 doc 内容')
  ctx.eventBus.declareListen('file:changed', 'privhub-files-fulltext', '文件系统变更 → 增量维护全文索引')

  const docId = (project: string, path: string): string => project + '::' + path

  /** 读一个文件并索引（不存在/超限/非文本忽略）。 */
  async function indexFile(project: string, path: string): Promise<void> {
    // 个人空间（= 智能体沙箱）不进全文索引：
    // 它是「仅本人可见」的私有区，一旦入索引就可能经检索/问答间接泄露给他人；
    // 事件驱动的增量索引尤其需要这道闸（全量 rebuild 走 allProjects 已天然排除）。
    if (svc.isPersonalDir(project)) return
    const target = await svc.resolveReal(project, path)
    if (target === null || !existsSync(target)) return
    const s = await stat(target).catch(() => null)
    if (!s || s.isDirectory() || s.size > MAX_BYTES) return
    const ext = extname(target).slice(1).toLowerCase()
    if (!TEXT_EXTS.has(ext)) return
    const text = await ctx.storage.readText(target).catch(() => '')
    await search.index({ id: docId(project, path), text })
  }

  /** 递归扫描项目内文本文件并索引。 */
  async function indexTree(project: string, rel = ''): Promise<void> {
    if (svc.isPersonalDir(project)) return
    const dir = await svc.resolveReal(project, rel)
    if (dir === null || !existsSync(dir)) return
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
    for (const e of entries) {
      if (e.name.startsWith('.')) continue
      const child = rel === '' ? e.name : rel + '/' + e.name
      if (e.isDirectory() && !e.isSymbolicLink()) await indexTree(project, child)
      else await indexFile(project, child)
    }
  }

  /** 全量重建（启动 / 回收站清空后）。 */
  async function rebuild(): Promise<void> {
    const projects = await svc.allProjects()
    for (const project of projects) await indexTree(project)
  }

  /* ---- 事件监听（effect 可逆） ---- */

  ctx.effect(() => {
    const offSaved = ctx.on('file:saved', (payload: { project?: string; path?: string; doc?: string }) => {
      if (!payload?.project || !payload.path || typeof payload.doc !== 'string') return
      if (svc.isPersonalDir(payload.project)) return // 个人空间不入索引（见 indexFile 说明）
      void search.index({ id: docId(payload.project, payload.path), text: payload.doc })
    })
    // E1 语义拆分：文件系统变更走专用事件 file:changed（audit:logged 回归纯审计语义，不再兼任索引线索）
    const offChanged = ctx.on('file:changed', (payload: { project?: string; path?: string; action?: string; newPath?: string }) => {
      if (!payload?.project || !payload.path || !payload.action) return
      // .agents 专属空间默认不进全文索引（Agent 网关产出，RAG 期再评估收录）
      if (payload.project === '.agents' || payload.project.startsWith('.agents/')) return
      const project = payload.project
      const path = payload.path
      switch (payload.action) {
        case 'created':
        case 'saved':
        case 'restored':
          void indexFile(project, path)
          break
        case 'deleted':
        case 'purged':
          void search.remove(docId(project, path))
          break
        case 'renamed':
        case 'moved': {
          void search.remove(docId(project, path))
          if (payload.newPath) void indexFile(project, payload.newPath)
          break
        }
        case 'clean':
          void rebuild()
          break
        default:
          break
      }
    })
    return () => { offSaved(); offChanged() }
  })

  /* ---- 启动全量构建（不阻塞监听） ---- */
  void rebuild().catch(() => {})

  /* ---- 全文检索接口 ---- */
  svc.route('/privhub/api/fulltext/search', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    try {
      const url = new URL(req.url ?? '/', 'http://x')
      const q = url.searchParams.get('q') ?? ''
      const projectParam = url.searchParams.get('project') ?? ''
      const visible = await svc.visibleProjects(u)
      const hits = await search.searchFulltext(q, projectParam ? { project: projectParam } : {}, visible)
      json(res, 200, { ok: true, hits, stats: search.stats() })
    } catch (e) {
      json(res, 400, { ok: false, error: e instanceof Error ? e.message : '搜索失败' })
    }
  }, 'fulltext-search')
}
