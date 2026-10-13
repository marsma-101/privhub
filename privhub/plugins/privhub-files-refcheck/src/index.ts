/**
 * privhub-files-refcheck —— 附件引用检查（只报告 + 导出清单）
 *
 * 路由（svc.route 为 exact 匹配，资源标识一律走 query）：
 *   GET /privhub/api/refcheck?project=<项目>[&refresh=1]    扫一个项目
 *   GET /privhub/api/refcheck?all=1[&refresh=1]             扫本人可见的全部顶层文件夹
 *   GET /privhub/api/refcheck/export?project=|all=1&kind=orphans|dangling|all   CSV 清单
 *
 * **本插件不提供任何删除/移动/改写接口**（用户已拍板：只报告，删除另走人工确认）。
 * 因此这里的路由对磁盘是**只读**的，唯一的写入是审计记录。
 *
 * 鉴权：requireUser(401) → 项目名合法(400) → canAccess(403) →（文件级见下）。
 * 文件级 ACL 不走 admin-acl 的 GUARD_PATHS 表，而是**在扫描内部逐文件过滤**
 * （canView 回调，先例：privhub-files-fulltext / privhub-files-lock）：因为本路由
 * 的文件标识不是单一 path 参数，而是「一次扫出成百上千条」，表驱动守卫无从下手。
 *
 * 结果缓存：键 = 项目 + 用户名（ACL 逐用户过滤，不能跨用户共享），
 * 事件失效（file:changed / file:saved / meta:changed）+ 5 分钟 TTL + 条数上限。
 *
 * @module privhub-files-refcheck
 */

import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { json, readJsonStore } from '../../privhub-core/src/index'
import { LIMITS, mapLimit, mergeReports, reportToCsv, scanProject, type Report } from './core'

export const name = 'privhub-files-refcheck'
export const inject = ['privhub', 'acl', 'storage', 'audit', 'eventBus', 'links']

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()
const BOARDS_DIR = join(rootDir, 'data', 'taskboards')

interface User { username: string; role: string; projects?: string[] }

function queryParam(req: unknown, key: string): string {
  const url = new URL(String((req as { url?: string }).url ?? '/'), 'http://x')
  return url.searchParams.get(key) ?? ''
}

export function apply(ctx: Context): void {
  ctx.eventBus.declareEmit('audit:logged', 'privhub-files-refcheck', '引用检查的扫描/导出执行审计广播')
  ctx.eventBus.declareListen('file:changed', 'privhub-files-refcheck', '上传/删除/恢复等变更 → 引用扫描缓存失效')
  ctx.eventBus.declareListen('file:saved', 'privhub-files-refcheck', '文档保存（可能新增/删除引用）→ 缓存失效')
  ctx.eventBus.declareListen('meta:changed', 'privhub-files-refcheck', '改名/移动 → 缓存失效（改名的两端都会影响引用）')

  const svc = ctx.privhub
  const acl = ctx.acl

  /** 缓存：键 project\0username → 报告。逐用户隔离，因为结果已按 ACL 过滤。 */
  const cache = new Map<string, { at: number; report: Report }>()

  function invalidate(): void {
    cache.clear()
  }

  ctx.effect(() => {
    const offs = (['file:changed', 'file:saved', 'meta:changed'] as const).map((ev) => ctx.on(ev, () => invalidate()))
    return () => { for (const off of offs) off() }
  })

  const audit = async (u: User, action: string, target: string, detail?: string): Promise<void> => {
    const rec = await ctx.audit.log({ user: u.username, action, target, detail }).catch(() => null)
    if (rec) ctx.emit('audit:logged', rec)
  }

  /**
   * 本项目有没有可能命中 ACL 规则？没有就直接跳过逐文件判定。
   * 这一步是**性能关键**：生产项目动辄几万文件，而绝大多数项目一条规则都没有；
   * 逐个文件调 acl.can 会白付 O(文件数 × 规则数)。
   */
  const hasAclRules = async (project: string): Promise<boolean> => {
    if (!acl || typeof acl.listRules !== 'function') return true // 拿不到规则表 ⇒ 保守：逐文件判
    const rules = await acl.listRules().catch(() => null)
    if (!Array.isArray(rules)) return true
    return rules.some((r) => r.project === project || r.project === '')
  }

  /**
   * 汇总「任务卡 relatedFiles」指向各项目的引用。
   * 只读**本人可见**项目的看板（visibleProjects 已保证），因此不会碰到无权访问的数据。
   */
  const gatherBoardRefs = async (u: User): Promise<Map<string, { source: string; path: string }[]>> => {
    const map = new Map<string, { source: string; path: string }[]>()
    const projects = await svc.visibleProjects(u as never)
    for (const p of projects) {
      const file = join(BOARDS_DIR, p + '.json')
      const board = await readJsonStore<{ cards?: unknown }>(
        ctx.storage, file, { cards: [] },
        (v) => !!v && typeof v === 'object' && Array.isArray((v as { cards?: unknown }).cards),
      ).catch(() => null)
      if (!board || !Array.isArray(board.cards)) continue
      for (const raw of board.cards) {
        const card = raw as { title?: unknown; relatedFiles?: unknown }
        if (!Array.isArray(card.relatedFiles)) continue
        for (const rf of card.relatedFiles) {
          const rel = rf as { project?: unknown; path?: unknown }
          if (typeof rel.project !== 'string' || typeof rel.path !== 'string') continue
          if (rel.project === '' || rel.path === '') continue
          const arr = map.get(rel.project) ?? []
          arr.push({ source: '任务卡「' + String(card.title ?? '') + '」', path: rel.path })
          map.set(rel.project, arr)
        }
      }
    }
    return map
  }

  /** 扫单个项目（带缓存）。 */
  const scanOne = async (u: User, project: string, boards: Map<string, { source: string; path: string }[]>, refresh: boolean): Promise<Report> => {
    // 键用 JSON 元组而不是拼接：项目名/用户名里可能出现分隔符，拼接会撞键
    const key = JSON.stringify([project, u.username])
    const hit = cache.get(key)
    if (!refresh && hit && Date.now() - hit.at < LIMITS.cacheTtlMs) return hit.report

    const root = await svc.resolveReal(project, '')
    const needFileAcl = await hasAclRules(project)
    const canView = (rel: string): boolean => {
      if (!needFileAcl) return true
      const d = acl?.can(u as never, 'view', project, rel)
      return !(d && !d.allow)
    }

    /* Q4 / §2.6：登记表就绪后再扫，否则「刚改过名」的第一扫会把老名字报成断链。
     * 存在性由 core 用 pathSet 自行裁决（这里只管"登记表怎么说"）。 */
    await ctx.links.ready

    const report = await scanProject({
      project,
      root,
      canView,
      boardRefs: boards.get(project) ?? [],
      readText: (abs) => ctx.storage.readText(abs),
      isEncrypted: (abs) => ctx.storage.isEncrypted(abs),
      join,
      resolveAlias: (target) => ctx.links.lookup(project, target),
    })

    cache.set(key, { at: Date.now(), report })
    while (cache.size > LIMITS.maxCacheEntries) {
      const oldest = cache.keys().next().value
      if (oldest === undefined) break
      cache.delete(oldest)
    }
    return report
  }

  /** 跑一次扫描（project 为 null ⇒ 全部可见顶层文件夹）。 */
  const runScan = async (u: User, project: string | null, refresh: boolean): Promise<Report> => {
    const projects = project === null ? await svc.visibleProjects(u as never) : [project]
    const boards = await gatherBoardRefs(u)
    // 项目之间并发 4：多项目扫描不至于把磁盘/加密层打满
    const reports = await mapLimit(projects, 4, (p) => scanOne(u, p, boards, refresh))
    return mergeReports(reports, project === null ? 'all' : 'project')
  }

  /* ---------- 扫描 ---------- */
  svc.route('/privhub/api/refcheck', async (req, res) => {
    const u = svc.requireUser(req, res) as User | null
    if (!u) return
    if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'method not allowed' })

    const all = queryParam(req, 'all') === '1'
    const refresh = queryParam(req, 'refresh') === '1'
    const project = queryParam(req, 'project')
    if (!all) {
      if (!svc.isValidProjectName(project)) return json(res, 400, { ok: false, error: '项目名无效' })
      if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    }

    const report = await runScan(u, all ? null : project, refresh)
    void audit(u, 'refcheck-scan', all ? `*（${report.projects.length} 个项目）` : project,
      `orphans=${report.orphanTotal} dangling=${report.danglingTotal} files=${report.totals.files} ms=${report.durationMs}`)
    json(res, 200, { ok: true, report, limits: LIMITS })
  }, 'refcheck')

  /* ---------- 导出 CSV ---------- */
  svc.route('/privhub/api/refcheck/export', async (req, res) => {
    const u = svc.requireUser(req, res) as User | null
    if (!u) return
    if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'method not allowed' })

    const all = queryParam(req, 'all') === '1'
    const project = queryParam(req, 'project')
    const kindRaw = queryParam(req, 'kind')
    const kind: 'orphans' | 'dangling' | 'all' =
      kindRaw === 'dangling' ? 'dangling' : kindRaw === 'all' ? 'all' : 'orphans'
    if (!all) {
      if (!svc.isValidProjectName(project)) return json(res, 400, { ok: false, error: '项目名无效' })
      if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    }

    const report = await runScan(u, all ? null : project, false)
    const csv = reportToCsv(report, kind)
    const label = all ? 'all' : project
    const name = `refcheck-${kind}-${label}-${new Date().toISOString().slice(0, 10)}.csv`
    const encoded = encodeURIComponent(name).replace(/['()*]/g, (c) => '%' + c.charCodeAt(0).toString(16))
    const body = Buffer.from(csv, 'utf8')
    res.writeHead(200, {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': "attachment; filename*=UTF-8''" + encoded + '; filename="refcheck.csv"',
      'content-length': body.length,
    })
    res.end(body)
    void audit(u, 'refcheck-export', all ? `*（${report.projects.length} 个项目）` : project,
      `kind=${kind} orphans=${report.orphanTotal} dangling=${report.danglingTotal}`)
  }, 'refcheck-export')
}
