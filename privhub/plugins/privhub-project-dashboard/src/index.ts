/**
 * privhub-project-dashboard —— 每项目一块「项目看板」（纵向分区页）
 *
 * 版式由用户选定：从上到下的分区（section），每区可 full 全宽 / half 半宽（两栏并排）。
 * **布局与内容完全交给 AI 智能体**：智能体重写整份文档即可调整分区大小/顺序/内容。
 * 人只读（本插件不提供拖拽编辑器）。智能体的写入车道在 `privhub-files-agent`
 * （`/api/agent/v1/dashboard`，X-Agent-Key），与本文件的登录态路由共用 core.ts 的清洗与存储。
 *
 * 路由（exact 匹配，资源标识走 query/body）：
 *   GET  /privhub/api/dashboard?project=      读看板 + 实时 facts
 *   PUT  /privhub/api/dashboard                { project, dashboard } 覆盖写（需可编辑）
 *   POST /privhub/api/dashboard/reset          { project } 还原为默认看板（需可编辑）
 *   GET  /privhub/api/dashboard/schema         组件契约（供智能体发现）
 *
 * 鉴权串联与 task-board 一致：requireUser(401) → 项目名合法(400) → canAccess(403) →
 * 写操作再叠一层文件级 ACL（action=edit，路径=项目根）。
 * 数据：`data/dashboards/<project>.json`，经 ctx.storage 透明加密；
 * 读改写整体包进 svc.withFileLock（D6：不做无锁读改写，revision 才数得准）。
 *
 * @module privhub-project-dashboard
 */

import type { Context } from '@deepseek-ai/cordis'
import { json, readBody } from '../../privhub-core/src/index'
import {
  LIMITS, STAT_REFS, computeFactsCached, defaultDashboard, loadDashboard, sanitizeDashboard, writeDashboard,
} from './core'
import { dashFile } from './core'

export const name = 'privhub-project-dashboard'
export const inject = ['privhub', 'acl', 'storage', 'audit', 'eventBus', 'cap']

function queryParam(req: unknown, key: string): string {
  const url = new URL(String((req as { url?: string }).url ?? '/'), 'http://x')
  return url.searchParams.get(key) ?? ''
}

export function apply(ctx: Context): void {
  ctx.eventBus.declareEmit('audit:logged', 'privhub-project-dashboard', '看板写操作成功审计广播')
  /* dashboard:changed：项目看板（纵向分区页）的领域事件。
   * 载荷带 revision（每次写入 +1）与分区数，消费方据此判断「要不要重读」——
   * 不带整份文档（一份看板可以很大，而事件消费方通常只需要知道它变了）。 */
  ctx.eventBus.declareEmit('dashboard:changed', 'privhub-project-dashboard', '项目看板（纵向分区页）变更')
  const svc = ctx.privhub

  const audit = async (u: { username: string }, action: string, target: string, detail?: string): Promise<void> => {
    const rec = await ctx.audit.log({ user: u.username, action, target, detail }).catch(() => null)
    if (rec) ctx.emit('audit:logged', rec)
  }

  /**
   * 写权限：项目可访问 + 文件级 ACL 的 edit 动作（路径取项目根 ''，即项目级策略）。
   * ACL 未命中规则时放行（与网页其余写路径同口径）。
   */
  const canEdit = (u: unknown, project: string): boolean => {
    if (!svc.canAccess(u as never, project)) return false
    const d = ctx.acl?.can(u as never, 'edit', project, '')
    return !(d && !d.allow)
  }

  /* ---------- 组件契约（供智能体发现「能写什么」） ---------- */
  svc.route('/privhub/api/dashboard/schema', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    json(res, 200, {
      ok: true,
      version: '1.0.0',
      layout: '纵向分区页：sections[] 自上而下堆叠；width=full 全宽 / half 半宽（两栏并排）；collapsed 可折叠',
      widgetTypes: {
        markdown: { text: '受限 Markdown（标题/粗体/斜体/行内代码/列表/链接/引用）。禁 HTML 直出。' },
        stats: { items: [{ label: '指标名', ref: '实时引用（可选）', value: '静态值（可选）', hint: '脚注（可选）' }], refs: STAT_REFS },
        plan: { items: [{ text: '事项', state: 'done|doing|todo|blocked', note: '备注' }] },
      },
      limits: LIMITS,
      write: {
        human: 'PUT /privhub/api/dashboard { project, dashboard }',
        agent: 'POST /privhub/api/agent/v1/dashboard { project, dashboard }（X-Agent-Key）',
        reset: 'POST /privhub/api/dashboard/reset { project }',
      },
    })
  }, 'dashboard-schema')

  /* ---------- 读看板 ---------- */
  svc.route('/privhub/api/dashboard', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return

    if (req.method === 'GET') {
      const project = queryParam(req, 'project')
      if (!svc.isValidProjectName(project)) return json(res, 400, { ok: false, error: '项目名无效' })
      if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
      const [dashboard, facts] = await Promise.all([
        loadDashboard(ctx.storage, project),
        computeFactsCached(ctx, project),
      ])
      json(res, 200, { ok: true, dashboard, facts, canEdit: canEdit(u, project) })
      return
    }

    if (req.method !== 'PUT') return json(res, 405, { ok: false, error: 'method not allowed' })
    if (!ctx.cap.can(u, 'dashboard.write', 'write')) return json(res, 403, { ok: false, error: '看板写入功能已关闭' })

    let body: Record<string, unknown>
    try { body = JSON.parse(await readBody(req)) as Record<string, unknown> } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = String(body.project ?? '')
    if (!svc.isValidProjectName(project)) return json(res, 400, { ok: false, error: '项目名无效' })
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    if (!canEdit(u, project)) return json(res, 403, { ok: false, error: '无编辑权限' })

    const clean = sanitizeDashboard(body.dashboard, project, u.username, 'human')
    if (!clean) return json(res, 400, { ok: false, error: '看板结构非法（需含 sections 数组）' })

    const file = dashFile(project)
    const saved = await svc.withFileLock(file, async () => {
      const prev = await loadDashboard(ctx.storage, project)
      clean.revision = (Number(prev.revision) || 0) + 1
      clean.updatedAt = Date.now()
      if (clean.source === 'default') clean.source = 'human'
      await writeDashboard(ctx.storage, clean)
      return clean
    })
    void audit(u, 'dashboard-write', project, 'sections=' + clean.sections.length + ' rev=' + clean.revision)
    ctx.emit('dashboard:changed', { project, action: 'write', revision: saved.revision, sections: saved.sections.length })
    json(res, 200, { ok: true, dashboard: saved })
  }, 'dashboard')

  /* ---------- 还原默认看板 ---------- */
  svc.route('/privhub/api/dashboard/reset', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    if (!ctx.cap.can(u, 'dashboard.write', 'write')) return json(res, 403, { ok: false, error: '看板写入功能已关闭' })
    let body: Record<string, unknown>
    try { body = JSON.parse(await readBody(req)) as Record<string, unknown> } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = String(body.project ?? '')
    if (!svc.isValidProjectName(project)) return json(res, 400, { ok: false, error: '项目名无效' })
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    if (!canEdit(u, project)) return json(res, 403, { ok: false, error: '无编辑权限' })

    const file = dashFile(project)
    const doc = await svc.withFileLock(file, async () => {
      const prev = await loadDashboard(ctx.storage, project)
      const next = defaultDashboard(project)
      next.revision = (Number(prev.revision) || 0) + 1
      next.updatedAt = Date.now()
      next.updatedBy = u.username
      next.source = 'default'
      await writeDashboard(ctx.storage, next)
      return next
    })
    void audit(u, 'dashboard-reset', project, 'rev=' + doc.revision)
    ctx.emit('dashboard:changed', { project, action: 'reset', revision: doc.revision, sections: doc.sections.length })
    json(res, 200, { ok: true, dashboard: doc })
  }, 'dashboard-reset')
}
