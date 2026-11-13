/**
 * privhub-project-dashboard —— 每项目一块「项目看板」（纵向分区页）
 *
 * 版式由用户选定：从上到下的分区（section），每区可 full 全宽 / half 半宽（两栏并排）。
 * **布局与内容完全交给 AI 智能体**：智能体重写整份文档即可调整分区大小/顺序/内容。
 * 人只读（本插件不提供拖拽编辑器）。智能体的写入车道在 `privhub-files-agent`
 * （`/api/agent/v1/dashboard`，X-Agent-Key），与本文件的登录态路由共用 core.ts 的清洗与存储。
 *
 * 路由（exact 匹配，资源标识走 query/body）：
 *   GET  /privhub/api/dashboard?project=      读看板 + 实时 facts + 任务进度（含 tasks 组件时）
 *                                             + 智能体名册（含 agents 组件时）
 *   GET  /privhub/api/dashboard/overview      跨项目总览（L1 驾驶舱用）：只聚合当前用户
 *                                             可索引的**项目**（排除个人空间），进度投影自任务看板
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
  LIMITS, STAT_REFS, computeFactsCached, defaultDashboard, loadDashboard,
  readAgents, readTaskProgress, sanitizeDashboard, wantsAgents, wantsTasks, writeDashboard,
} from './core'
import { dashFile } from './core'
import { aggregateOverview, OVERVIEW_MAX_PROJECTS, type OverviewInput } from './overview'

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
        tasks: {
          note: '**实时投影任务看板**（同一份数据，只读）：各列计数 + 完成度 + 卡片明细。'
            + '不要在这里写死进度 —— 任务在「任务看板」里维护，本组件自动跟随。',
          options: {
            columns: '只看这些列（列 id 或列标题的数组；缺省=全部列）',
            limit: '卡片明细条数上限（1…' + LIMITS.taskCards + '，缺省 30）',
            showCards: 'false = 只显示计数与进度条，不列卡片',
          },
          disabledWhen: 'task.write 功能被关时不显示进度，只回一行说明（不会让看板报错）',
        },
        agents: {
          note: '**实时投影智能体名册**（只读）：只列「服务本项目」的智能体'
            + '（名册条目自己声明服务范围 all / 指定项目），每条给「擅长 / 自述 / 系统实证」。'
            + '系统实证 = 服务端从任务看板现算的该项目战绩（已完成 / 未完成 / 总数 / 最近完成），不落盘。',
          noOptions: '本组件没有旋钮：范围由名册条目自身的服务范围决定',
          disabledWhen: '名册文件不可读时只回一行说明（不会让看板报错）',
          write: '登记 / 编辑名册：POST /privhub/api/roster（登录态，需 roster.write）'
            + '；智能体自注册：POST /privhub/api/agent/v1/roster（X-Agent-Key）',
        },
      },
      limits: LIMITS,
      write: {
        human: 'PUT /privhub/api/dashboard { project, dashboard }',
        agent: 'POST /privhub/api/agent/v1/dashboard { project, dashboard }（X-Agent-Key）',
        reset: 'POST /privhub/api/dashboard/reset { project }',
      },
    })
  }, 'dashboard-schema')

  /* ---------- L1 项目总览（跨项目聚合 · 只读） ----------
   *
   * 领导的第一屏要回答「整个盘子怎么样」，不该逐个点开 N 块看板再心算。
   *
   * 三条边界（与 overview.ts 的硬约束对应）：
   *   · 范围 = `indexableProjects`（**排除个人空间**）再逐个 canAccess。绝不用 allProjects：
   *     那会把别人的私有目录算进领导的 KPI，等于从聚合数字里泄露隐私。
   *   · **不做 facts 递归扫描**。computeFacts 要遍历整棵树，72GB 的库扫一遍就是几十秒，
   *     乘以几十个项目足以把首屏拖死。成员数改从用户表现算（O(用户数)），文件数留 null。
   *   · 任务功能被关时 tasks=null（不是 0），前端显示「—」并说明原因，不拿 0% 冒充没进展。
   *
   * ⚠️ 本路由**刻意不列进 privhub-admin-acl 的 GUARD_PATHS**（不是漏登记）：
   *   文件级 ACL 守卫的入参是 (project, path) —— 它管的是「某个文件让不让这个人看」。
   *   总览没有 path，也不返回任何文件路径/文件名，只回项目级的计数与进度；
   *   它的权限边界是**项目级**的 indexableProjects + canAccess，已在下面逐个过。
   *   若硬塞进 GUARD_PATHS，守卫拿不到 path 会走透传分支，等于白登记还误导后人。
   *   反过来说：日后若给总览加上「文件数/最近文件」等**带路径**的字段，
   *   就必须重新评估这条豁免（那时它才真的开始碰文件级 ACL）。
   */
  svc.route('/privhub/api/dashboard/overview', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'method not allowed' })
    if (!ctx.cap.can(u, 'dashboard.write', 'read')) return json(res, 403, { ok: false, error: '项目看板功能已关闭' })

    const all = (await svc.indexableProjects(u as never)).filter((p) => svc.canAccess(u as never, p))
    /* 多取一个：aggregateOverview 据此判断是否截断，前端才能如实说「只显示了前 N 个」。 */
    const scoped = all.slice(0, OVERVIEW_MAX_PROJECTS + 1)
    const canTasks = ctx.cap.can(u, 'task.write', 'read')

    /* 按名查找（?q=）必须在**截断之前**做。
     * 实测踩到的坑：项目数超过上限时，前端只在已加载的前 N 个里筛，
     * 第 N+1 个项目**永远搜不到** —— 用户会以为项目不存在。
     * 所以搜索走服务端全量名单，KPI 仍是全盘的（totals 不受 q 影响，口径不漂移）。 */
    const q = String(new URL(req.url ?? '/', 'http://x').searchParams.get('q') ?? '').trim().toLowerCase()

    const memberCount = new Map<string, number>()
    try {
      for (const usr of svc.users.values()) {
        if (!usr || usr.role === 'admin' || !Array.isArray(usr.projects)) continue
        for (const p of usr.projects) memberCount.set(p, (memberCount.get(p) || 0) + 1)
      }
    } catch { /* 用户表不可读：成员数留空，不编造 */ }

    const loadInput = async (p: string): Promise<OverviewInput> => {
      const [dash, prog] = await Promise.all([
        loadDashboard(ctx.storage, p).catch(() => null),
        canTasks ? readTaskProgress(ctx.storage, p) : Promise.resolve(null),
      ])
      return {
        project: p,
        tasks: prog && prog.ok ? prog : null,
        dashboard: dash,
        facts: null,
        members: memberCount.get(p) ?? 0,
      }
    }

    const inputs: OverviewInput[] = []
    for (const p of scoped) inputs.push(await loadInput(p))
    const result = aggregateOverview(inputs)

    /* 搜索结果单独一路：命中名单取自**全量可见项目**，再把「首屏之外」的命中补读进来。
     * totals 与 mine 仍按全盘口径（不随筛选变化）—— 否则一搜「A项目」，
     * KPI 就变成只剩 A 项目的数字，领导会以为盘子塌了。 */
    let projects = result.projects
    let search: { q: string; matched: number; truncated: boolean } | null = null
    if (q) {
      const hits = all.filter((p) => p.toLowerCase().includes(q))
      const inScope = new Set(scoped)
      const extra = hits.filter((p) => !inScope.has(p)).slice(0, OVERVIEW_MAX_PROJECTS)
      const extraInputs: OverviewInput[] = []
      for (const p of extra) extraInputs.push(await loadInput(p))
      projects = [
        ...result.projects.filter((p) => p.project.toLowerCase().includes(q)),
        ...aggregateOverview(extraInputs).projects,
      ]
      search = { q, matched: hits.length, truncated: hits.length > projects.length }
    }

    /* 「我的任务」：按显示名/用户名匹配 assignee（任务卡存的是名册名，不是 username）。 */
    const names = new Set([String((u as { displayName?: string }).displayName || ''), u.username].filter(Boolean))
    let mine = 0, mineOpen = 0
    if (canTasks) {
      for (const it of inputs) {
        if (!it.tasks) continue
        for (const c of it.tasks.cards) {
          if (!names.has(c.assignee)) continue
          mine++
          if (c.columnId !== it.tasks.doneColumnId) mineOpen++
        }
      }
    }

    /* 个人入口：只给**本人**的目录名与顶层条目数（非递归，一次 listFiles）。
     * 管理员也拿不到别人的 —— personalDirOf 只看当前用户。 */
    let personal: { dir: string; entries: number } | null = null
    const ownDir = svc.personalDirOf(u as never)
    if (ownDir) {
      const list = await svc.listFiles(ownDir, '').catch(() => [])
      personal = { dir: ownDir, entries: Array.isArray(list) ? list.length : 0 }
    }

    json(res, 200, {
      ok: true, ...result, projects, search,
      tasksDisabled: !canTasks, mine: { total: mine, open: mineOpen }, personal,
    })
  }, 'dashboard-overview')

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
      /* 任务进度：只有看板真的用了 tasks 组件才去读任务看板（否则 tasks=null）。
       * 这是**只读投影** —— 项目看板不存一份进度副本，所以它和任务看板不会各说各话。 */
      let tasks: unknown = null
      if (wantsTasks(dashboard)) {
        tasks = ctx.cap.can(u, 'task.write', 'read')
          ? await readTaskProgress(ctx.storage, project)
          : { ok: false, disabled: true, reason: '任务看板功能已关闭' }
      }
      /* 智能体名册：同理，看板用了 agents 组件才去读名册（否则 agents=null）。
       * 读名册不设功能开关（登录即可看）；写由 roster.write 把（见 canEditRoster）。 */
      let agents: unknown = null
      if (wantsAgents(dashboard)) agents = await readAgents(ctx.storage, project)
      json(res, 200, {
        ok: true, dashboard, facts,
        canEdit: canEdit(u, project),
        canEditRoster: ctx.cap.can(u, 'roster.write', 'write'),
        tasks, agents,
      })
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
