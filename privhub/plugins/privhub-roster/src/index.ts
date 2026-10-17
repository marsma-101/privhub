/**
 * privhub-roster —— 智能体名册（全局一份）
 *
 * 让智能体「登记到系统里」并写明**自己擅长什么、以前干过什么、服务哪些项目**，
 * 好让 PM 在项目看板上把任务指派给它（用户口径：全局名册 + 注册时声明服务范围）。
 *
 * 路由（svc.route 为 exact 匹配，资源标识走 query/body）：
 *   GET    /privhub/api/roster            ?project=            读名册（带该项目里的「系统实证」）
 *   GET    /privhub/api/roster/schema                          条目契约（供页面/智能体发现）
 *   POST   /privhub/api/roster            {id?,name,kind,…}    新建 / 更新条目（人工补录）
 *   DELETE /privhub/api/roster            ?id=                 删除条目
 *
 * 鉴权串联：requireUser(401) → 功能开关 roster.write（写操作）→ 项目可见性（服务范围）→ 加锁读写。
 * 读名册**不设功能开关**：名册是本实例内的公开元数据（谁在、擅什么），登录即可看；
 * 「我不能用这个功能」的闸门落在**写**上（roster.write）。
 * 数据：`data/roster.json`，经 ctx.storage 透明加密；读改写整体包进 svc.withFileLock。
 *
 * 智能体自注册走 **privhub-files-agent** 的 `/privhub/api/agent/v1/roster`（X-Agent-Key），
 * 与本文件共用 core.ts 的清洗与存储 —— 两个入口的数据形状因此不可能各说各话。
 *
 * @module privhub-roster
 */

import type { Context } from '@deepseek-ai/cordis'
import { json, readBody } from '../../privhub-core/src/index'
import {
  LIMITS, applyEntryInput, buildEntry, findByName, loadAgentsView, loadRoster, rosterFile, sanitizeEntryInput, saveRoster,
} from './core'
import type { RosterEntry } from './core'

export const name = 'privhub-roster'
export const inject = ['privhub', 'storage', 'audit', 'eventBus', 'cap']

function queryParam(req: unknown, key: string): string {
  const url = new URL(String((req as { url?: string }).url ?? '/'), 'http://x')
  return url.searchParams.get(key) ?? ''
}

export function apply(ctx: Context): void {
  ctx.eventBus.declareEmit('audit:logged', 'privhub-roster', '名册写操作成功审计广播')
  /* roster:changed：名册（全局）变更的领域事件。载荷只带 id/名字/动作，
   * 不带整条（名册可能很大，而消费方通常只需要知道「变了」）。 */
  ctx.eventBus.declareEmit('roster:changed', 'privhub-roster', '智能体名册变更（登记 / 更新 / 删除）')
  const svc = ctx.privhub

  const audit = async (u: { username: string }, action: string, target: string, detail?: string): Promise<void> => {
    const rec = await ctx.audit.log({ user: u.username, action, target, detail }).catch(() => null)
    if (rec) ctx.emit('audit:logged', rec)
  }

  const canWrite = (u: unknown): boolean => ctx.cap.can(u as never, 'roster.write', 'write')

  /** 剔除敏感/内部字段以外的原样视图（名册条目本身不含密钥材料，可直接对外）。 */
  const view = (e: RosterEntry): RosterEntry => ({ ...e, skills: [...e.skills], projects: [...e.projects] })

  /* ---------- 条目契约（供页面与智能体发现） ---------- */
  svc.route('/privhub/api/roster/schema', (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    json(res, 200, {
      ok: true,
      version: '1.0.0',
      what: '智能体名册：全局登记「有哪些智能体 / 擅长什么 / 干过什么 / 服务哪些项目」',
      fields: {
        name: '智能体名（名册内唯一；任务卡 assignee 用这个名字）',
        kind: '类型/厂商，自由文本（如 Claude Code / 本地脚本）',
        skills: '擅长标签数组（短词，最多 ' + LIMITS.skills + ' 个）',
        bio: '自述：以前干过什么（自由文本）',
        scope: "服务范围：'all' 全部项目 | 'projects' 仅 projects 列出的项目",
        projects: "scope='projects' 时的项目名数组（最多 " + LIMITS.projects + ' 个）',
        status: "在册状态：'active' 在册 | 'paused' 暂停 | 'retired' 退役（不再出现在指派候选）",
        contact: '联系方式（可选）',
      },
      evidence: '每个条目附「系统实证」= 服务端从**任务看板现算**的该项目战绩（done/open/total/lastDoneAt），不落盘、不会与看板漂移',
      limits: LIMITS,
      write: {
        human: 'POST /privhub/api/roster { id?, name, kind, skills, bio, scope, projects, status, contact }',
        agent: 'POST /privhub/api/agent/v1/roster （X-Agent-Key；按密钥幂等，同一把钥匙重复注册=更新同一条）',
        remove: 'DELETE /privhub/api/roster?id=',
      },
    })
  }, 'roster-schema')

  /* ---------- 读名册 ---------- */
  svc.route('/privhub/api/roster', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return

    if (req.method === 'GET') {
      const project = queryParam(req, 'project')
      const doc = await loadRoster(ctx.storage)
      /* 带 project：只列「服务该项目」的条目，并各带一份该项目里的实证
       * （走核心的 loadAgentsView，与项目看板的 agents 组件同一条路径）。 */
      if (project) {
        if (!svc.isValidProjectName(project)) return json(res, 400, { ok: false, error: '项目名无效' })
        if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
        const entries = await loadAgentsView(ctx.storage, project)
        json(res, 200, { ok: true, project, entries, canEdit: canWrite(u) })
        return
      }
      const entries = doc.entries
        .filter((e) => e.status !== 'retired')
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(view)
      json(res, 200, { ok: true, entries, canEdit: canWrite(u) })
      return
    }

    if (req.method === 'DELETE') {
      if (!canWrite(u)) return json(res, 403, { ok: false, error: '名册写入功能已关闭' })
      const id = queryParam(req, 'id')
      if (!id) return json(res, 400, { ok: false, error: '缺少 id' })
      const file = rosterFile()
      let total = 0
      const hit = await svc.withFileLock(file, async () => {
        const doc = await loadRoster(ctx.storage)
        const found = doc.entries.find((e) => e.id === id)
        if (!found) return null
        doc.entries = doc.entries.filter((e) => e.id !== id)
        await saveRoster(ctx.storage, doc)
        total = doc.entries.length
        return found
      })
      if (!hit) return json(res, 404, { ok: false, error: '名册条目不存在' })
      void audit(u, 'roster-delete', 'agent:' + hit.name, 'id=' + id)
      ctx.emit('roster:changed', { action: 'delete', id, name: hit.name, total })
      json(res, 200, { ok: true })
      return
    }

    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    if (!canWrite(u)) return json(res, 403, { ok: false, error: '名册写入功能已关闭' })

    let body: Record<string, unknown>
    try { body = JSON.parse(await readBody(req)) as Record<string, unknown> } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const input = sanitizeEntryInput(body)
    if (!input) return json(res, 400, { ok: false, error: '条目非法：name 不能为空' })

    /* 服务范围只能填「我看得见的项目」——否则会把名册变成一张越权的项目清单。 */
    if (input.scope === 'projects' && input.projects.length) {
      const visible = new Set(await svc.visibleProjects(u))
      const bad = input.projects.filter((p) => !visible.has(p))
      if (bad.length) return json(res, 400, { ok: false, error: '服务范围包含不可见项目：' + bad.join('、') })
    }

    const id = String(body.id ?? '')
    const file = rosterFile()
    let conflict = ''
    let total = 0
    const entry = await svc.withFileLock(file, async () => {
      const doc = await loadRoster(ctx.storage)
      if (id) {
        const e = doc.entries.find((x) => x.id === id)
        if (!e) { conflict = 'NOT_FOUND'; return null }
        const other = findByName(doc, input.name)
        if (other && other.id !== e.id) { conflict = 'NAME_TAKEN'; return null }
        applyEntryInput(e, input)
        await saveRoster(ctx.storage, doc)
        total = doc.entries.length
        return e
      }
      const dup = findByName(doc, input.name)
      if (dup) { conflict = 'NAME_TAKEN'; return null }
      if (doc.entries.length >= LIMITS.entries) { conflict = 'FULL'; return null }
      const e = buildEntry(input, { source: 'human', username: u.username })
      doc.entries.push(e)
      await saveRoster(ctx.storage, doc)
      total = doc.entries.length
      return e
    })

    if (!entry) {
      if (conflict === 'NOT_FOUND') return json(res, 404, { ok: false, error: '名册条目不存在' })
      if (conflict === 'NAME_TAKEN') return json(res, 409, { ok: false, error: '已有同名智能体：' + input.name })
      return json(res, 400, { ok: false, error: '名册条目已达上限（' + LIMITS.entries + ' 条）' })
    }
    void audit(u, id ? 'roster-update' : 'roster-create', 'agent:' + entry.name, 'scope=' + entry.scope + ' status=' + entry.status)
    ctx.emit('roster:changed', { action: id ? 'update' : 'create', id: entry.id, name: entry.name, total })
    json(res, 200, { ok: true, entry: view(entry) })
  }, 'roster')
}
