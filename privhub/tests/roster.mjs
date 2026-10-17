/**
 * 智能体名册回归（privhub-roster）
 *
 * 覆盖：条目契约 / 登录态读写（401·400·409·404）/ 重名冲突 / 服务范围越权拒绝 /
 * 全局列表与「按项目」视图（服务范围过滤）/ 系统实证（现算自任务看板，不落盘）/
 * 退役条目不再出现 / roster.write 开关对普通用户生效（读不受影响）/
 * **智能体车道**（X-Agent-Key 自注册：按密钥幂等 / 同名 AGENT-4042 / 读自己的指派）/
 * 项目看板 agents 组件（只读投影 + 实证 + canEditRoster）/ roster:changed 进入可订阅事件目录。
 *
 * 使用独立项目 `_roster_reg` / `_roster_reg_b`，结束后删条目、吊销密钥、删项目、清回收站。
 * 名册是**全局**一份，故收尾只删本套件建过的条目（按记录的 id），不动别人的。
 * 磁盘断言仅在 PRIVHUB_TEST_ROOT 存在时执行（否则静默降级为空断言）。
 *
 * @module tests/roster
 */

import { existsSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import {
  createSuite, ok, eq, includes, notIncludes, loginOk,
  GET, POST, PATCH, DEL, purgeTrashOfProject,
} from './lib.mjs'

const PROJECT = '_roster_reg'
const OTHER = '_roster_reg_b'
const INVIS = '_roster_reg_invisible'

function dataPath(...parts) {
  const root = process.env.PRIVHUB_TEST_ROOT
  return root ? join(root, 'data', ...parts) : ''
}

/** 带 Agent 密钥的请求（与 dashboard/agent-sandbox 同形）。 */
const agent = (key) => ({
  GET: (p) => GET(p, { headers: { 'x-agent-key': key } }),
  POST: (p, body) => POST(p, {
    headers: { 'x-agent-key': key, 'x-idempotency-key': 'k-' + Math.random().toString(36).slice(2, 12) },
    body,
  }),
})

export function build() {
  const s = createSuite('智能体名册（roster）')
  let admin = ''
  let user1 = ''
  let humanId = ''       // admin 人工补录的条目 id
  let scopedId = ''      // 只服务 OTHER 的条目 id
  let agentKey = ''      // 智能体自注册用的密钥
  let agentKeyId = ''
  let agentKey2 = ''
  let agentKey2Id = ''
  let cardId = ''
  const entryIds = []    // 本套件建过的名册条目 id（收尾按 id 删）
  const keyIds = []      // 本套件签发的密钥 id（收尾吊销）

  s.test('未登录读名册 → 401', async () => {
    const r = await GET('/privhub/api/roster')
    eq(r.status, 401, '未登录应 401')
  })

  s.test('登录（admin / user1）', async () => {
    admin = await loginOk('admin', 'admin123')
    user1 = await loginOk('user1', 'user123')
  })

  s.test('清理并新建测试项目', async () => {
    for (const p of [PROJECT, OTHER]) {
      await POST('/privhub/api/project-delete', { token: admin, body: { name: p } }).catch(() => null)
      await purgeTrashOfProject(admin, p)
    }
    const a = await POST('/privhub/api/project-create', { token: admin, body: { name: PROJECT } })
    ok(a.json && a.json.ok, '新建主项目失败：' + a.text.slice(0, 120))
    const b = await POST('/privhub/api/project-create', { token: admin, body: { name: OTHER } })
    ok(b.json && b.json.ok, '新建对照项目失败：' + b.text.slice(0, 120))
  })

  s.test('条目契约 GET /roster/schema', async () => {
    const r = await GET('/privhub/api/roster/schema', { token: admin })
    ok(r.json && r.json.ok, '取契约失败：' + r.text.slice(0, 120))
    ok(r.json.fields && r.json.fields.name && r.json.fields.skills && r.json.fields.bio, '契约应含 name/skills/bio 字段')
    ok(r.json.fields.scope && r.json.fields.status, '契约应含服务范围与状态字段')
    ok(typeof r.json.evidence === 'string' && r.json.evidence.length > 0, '契约应说明「系统实证」')
    ok(r.json.limits && r.json.limits.entries > 0, '契约应给出边界常量')
    ok(r.json.write && r.json.write.human && r.json.write.agent, '契约应说明人工/智能体两条写入车道')
  })

  s.test('人工补录一条（scope=all）', async () => {
    const r = await POST('/privhub/api/roster', {
      token: admin,
      body: { name: '_roster_human', kind: '本地脚本', skills: ['整理', '归档'], bio: '以前做过批量归档', scope: 'all', status: 'active' },
    })
    ok(r.json && r.json.ok && r.json.entry, '登记失败：' + r.text.slice(0, 160))
    humanId = r.json.entry.id
    entryIds.push(humanId)
    eq(r.json.entry.name, '_roster_human', '名字')
    eq(r.json.entry.source, 'human', '人工补录 source=human')
    eq(r.json.entry.scope, 'all', '服务范围 all')
    includes(r.json.entry.skills.join(','), '归档', '擅长标签应落盘')
  })

  s.test('缺 name → 400', async () => {
    const r = await POST('/privhub/api/roster', { token: admin, body: { name: '   ', skills: [] } })
    eq(r.status, 400, '空名字应 400')
  })

  s.test('重名登记 → 409', async () => {
    const r = await POST('/privhub/api/roster', { token: admin, body: { name: '_roster_human', scope: 'all' } })
    eq(r.status, 409, '同名应 409')
  })

  s.test('服务范围含不可见项目 → 400（普通用户）', async () => {
    const r = await POST('/privhub/api/roster', {
      token: user1,
      body: { name: '_roster_badscope', scope: 'projects', projects: [INVIS] },
    })
    eq(r.status, 400, '普通用户填看不见的项目应 400')
    includes(String(r.json && r.json.error), '不可见', '错误文本应点明不可见项目')
  })

  s.test('登记一条只服务对照项目（scope=projects）', async () => {
    const r = await POST('/privhub/api/roster', {
      token: admin,
      body: { name: '_roster_scoped', kind: 'Excel 机器人', skills: ['表格'], bio: '只服务对照项目', scope: 'projects', projects: [OTHER] },
    })
    ok(r.json && r.json.ok && r.json.entry, '登记失败：' + r.text.slice(0, 160))
    scopedId = r.json.entry.id
    entryIds.push(scopedId)
    eq(r.json.entry.scope, 'projects', '服务范围 projects')
    includes(r.json.entry.projects.join(','), OTHER, '项目清单')
  })

  s.test('全局列表含新条目', async () => {
    const r = await GET('/privhub/api/roster', { token: admin })
    ok(r.json && r.json.ok && Array.isArray(r.json.entries), '读名册失败：' + r.text.slice(0, 120))
    const names = r.json.entries.map((e) => e.name)
    includes(names.join(','), '_roster_human', '全局列表应含人工条目')
    includes(names.join(','), '_roster_scoped', '全局列表应含对照条目')
    eq(r.json.canEdit, true, '管理员 canEdit=true')
  })

  s.test('按项目视图：只列「服务该项目」的条目', async () => {
    const r = await GET('/privhub/api/roster?project=' + encodeURIComponent(PROJECT), { token: admin })
    ok(r.json && r.json.ok, '读项目名册失败：' + r.text.slice(0, 120))
    eq(r.json.project, PROJECT, '应回显项目名')
    const names = r.json.entries.map((e) => e.name)
    includes(names.join(','), '_roster_human', 'scope=all 的条目应出现')
    notIncludes(names.join(','), '_roster_scoped', '只服务别的项目的条目不应出现')
  })

  s.test('编辑条目（改名 + 改擅长）', async () => {
    const r = await POST('/privhub/api/roster', {
      token: admin,
      body: { id: humanId, name: '_roster_human2', kind: '本地脚本', skills: ['整理', '检索'], bio: '改过的自述', scope: 'all', status: 'active' },
    })
    ok(r.json && r.json.ok && r.json.entry, '编辑失败：' + r.text.slice(0, 160))
    eq(r.json.entry.id, humanId, 'id 不变')
    eq(r.json.entry.name, '_roster_human2', '名字已改')
    includes(r.json.entry.skills.join(','), '检索', '擅长已更新')
  })

  s.test('编辑不存在的条目 → 404', async () => {
    const r = await POST('/privhub/api/roster', { token: admin, body: { id: 'agt_nope', name: '_roster_x', scope: 'all' } })
    eq(r.status, 404, '不存在的 id 应 404')
  })

  s.test('系统实证：现算自任务看板（已完成/未完成）', async () => {
    // 建两张卡指派给该智能体：一张留待办，一张移到已完成。
    const c1 = await POST('/privhub/api/taskboard/cards', { token: admin, body: { project: PROJECT, title: '给智能体的任务A' } })
    ok(c1.json && c1.json.ok, '建卡失败：' + c1.text.slice(0, 120))
    cardId = c1.json.card.id
    await PATCH('/privhub/api/taskboard/cards', { token: admin, body: { project: PROJECT, id: cardId, assignee: '_roster_human2' } })

    const c2 = await POST('/privhub/api/taskboard/cards', { token: admin, body: { project: PROJECT, title: '给智能体的任务B' } })
    const card2 = c2.json.card.id
    await PATCH('/privhub/api/taskboard/cards', { token: admin, body: { project: PROJECT, id: card2, assignee: '_roster_human2' } })
    await POST('/privhub/api/taskboard/cards/move', { token: admin, body: { project: PROJECT, id: card2, toColumnId: 'col_done', order: 0 } })

    const r = await GET('/privhub/api/roster?project=' + encodeURIComponent(PROJECT), { token: admin })
    ok(r.json && r.json.ok, '读项目名册失败：' + r.text.slice(0, 120))
    const me = r.json.entries.find((e) => e.name === '_roster_human2')
    ok(me, '应找到该智能体条目')
    ok(me.evidence && typeof me.evidence === 'object', '条目应带系统实证')
    eq(me.evidence.total, 2, '实证：总指派 2 张')
    eq(me.evidence.done, 1, '实证：已完成 1 张')
    eq(me.evidence.open, 1, '实证：未完成 1 张')
  })

  s.test('项目看板 agents 组件：只读投影 + 实证 + canEditRoster', async () => {
    const r = await GET('/privhub/api/dashboard?project=' + encodeURIComponent(PROJECT), { token: admin })
    ok(r.json && r.json.ok, '读看板失败：' + r.text.slice(0, 120))
    ok(r.json.agents && r.json.agents.ok === true && Array.isArray(r.json.agents.entries), 'agents 组件应返回名册视图')
    const me = r.json.agents.entries.find((e) => e.name === '_roster_human2')
    ok(me && me.evidence && me.evidence.done === 1, '看板的 agents 组件应带同一份实证')
    eq(r.json.canEditRoster, true, '管理员 canEditRoster=true')
  })

  s.test('roster:changed 进入可订阅事件目录', async () => {
    const r = await GET('/privhub/api/webhook/events', { token: admin })
    ok(r.json && r.json.ok, '读事件目录失败：' + r.text.slice(0, 120))
    includes(r.json.events.map((e) => e.name).join(','), 'roster:changed', '事件目录应含 roster:changed')
  })

  s.test('退役条目不再出现于指派候选', async () => {
    const r = await POST('/privhub/api/roster', {
      token: admin,
      body: { id: scopedId, name: '_roster_scoped', scope: 'projects', projects: [OTHER], status: 'retired' },
    })
    ok(r.json && r.json.ok, '改状态失败：' + r.text.slice(0, 120))
    const g = await GET('/privhub/api/roster', { token: admin })
    notIncludes(g.json.entries.map((e) => e.name).join(','), '_roster_scoped', '退役条目不应出现在全局列表')
    const p = await GET('/privhub/api/roster?project=' + encodeURIComponent(OTHER), { token: admin })
    notIncludes(p.json.entries.map((e) => e.name).join(','), '_roster_scoped', '退役条目不应出现在项目视图')
  })

  /* ---------- 功能开关（roster.write） ---------- */

  s.test('关闭 roster.write → 普通用户写 403，读仍 200', async () => {
    await POST('/privhub/api/cap/save', { token: admin, body: { feature: 'roster.write', level: 'none' } })
    const w = await POST('/privhub/api/roster', { token: user1, body: { name: '_roster_blocked', scope: 'all' } })
    eq(w.status, 403, '开关关闭后普通用户写应 403')
    const r = await GET('/privhub/api/roster', { token: user1 })
    eq(r.status, 200, '读名册不设开关，应仍 200')
    eq(r.json.canEdit, false, '开关关闭后 canEdit=false')
    // 复位到默认（userDefault=write），别给后面的套件留偏离
    await POST('/privhub/api/cap/save', { token: admin, body: { feature: 'roster.write', level: 'write' } })
    const back = await GET('/privhub/api/roster', { token: admin })
    eq(back.json.canEdit, true, '复位后 canEdit=true')
  })

  /* ---------- 智能体车道（自注册） ---------- */

  s.test('智能体：签发本项目 scope 的密钥', async () => {
    const r = await POST('/privhub/api/agent/v1/keys', {
      token: admin,
      body: { name: 'roster-test', username: 'admin', scope: { kind: 'project', project: PROJECT } },
    })
    ok(r.json && r.json.ok && r.json.key, '签发密钥失败：' + r.text.slice(0, 200))
    agentKey = r.json.key
    agentKeyId = r.json.id
    keyIds.push(agentKeyId)
    ok(agentKey.startsWith('pha_'), '密钥前缀应为 pha_')
  })

  s.test('智能体自注册（X-Agent-Key）→ source=agent', async () => {
    const r = await agent(agentKey).POST('/privhub/api/agent/v1/roster', {
      name: '_roster_agent', kind: 'Claude Code', skills: ['写代码', '看板'], bio: '我擅长按规格改前端', scope: 'all', status: 'active',
    })
    ok(r.json && r.json.ok && r.json.entry, '自注册失败：' + r.text.slice(0, 200))
    eq(r.json.created, true, '首次自注册 created=true')
    eq(r.json.entry.source, 'agent', 'source=agent')
    entryIds.push(r.json.entry.id)
  })

  s.test('同密钥重复自注册 → 幂等（不新增，created=false）', async () => {
    const before = await GET('/privhub/api/roster', { token: admin })
    const n0 = before.json.entries.filter((e) => e.name === '_roster_agent').length
    const r = await agent(agentKey).POST('/privhub/api/agent/v1/roster', {
      name: '_roster_agent', kind: 'Claude Code', skills: ['写代码'], bio: '更新后的自述', scope: 'all',
    })
    ok(r.json && r.json.ok, '重复自注册失败：' + r.text.slice(0, 200))
    eq(r.json.created, false, '重复注册应 updating（created=false）')
    const after = await GET('/privhub/api/roster', { token: admin })
    const n1 = after.json.entries.filter((e) => e.name === '_roster_agent').length
    eq(n1, n0, '按密钥幂等：不应堆出新条目')
  })

  s.test('另一把密钥用同名 → AGENT-4042', async () => {
    const k = await POST('/privhub/api/agent/v1/keys', {
      token: admin,
      body: { name: 'roster-test-2', username: 'admin', scope: { kind: 'project', project: PROJECT } },
    })
    agentKey2 = k.json.key
    agentKey2Id = k.json.id
    keyIds.push(agentKey2Id)
    const r = await agent(agentKey2).POST('/privhub/api/agent/v1/roster', { name: '_roster_agent', scope: 'all' })
    eq(r.status, 409, '同名应 409')
    eq(r.json && r.json.code, 'AGENT-4042', '错误码 AGENT-4042')
  })

  s.test('智能体读自己的指派：GET /agent/v1/board', async () => {
    const r = await agent(agentKey).GET('/privhub/api/agent/v1/board?project=' + encodeURIComponent(PROJECT))
    ok(r.json && r.json.ok, '读指派失败：' + r.text.slice(0, 200))
    eq(r.json.myName, '_roster_agent', 'myName 取自名册条目名')
    ok(Array.isArray(r.json.assigned), '应回 assigned 数组（该名字名下的卡）')
    ok(r.json.board && Array.isArray(r.json.board.cards), '应回整份看板供智能体自读')
  })

  s.test('智能体按可见项目过滤名册', async () => {
    const r = await agent(agentKey).GET('/privhub/api/agent/v1/roster')
    ok(r.json && r.json.ok, '智能体读名册失败：' + r.text.slice(0, 200))
    const names = r.json.entries.map((e) => e.name)
    includes(names.join(','), '_roster_agent', '应看得见自己那条')
    ok(typeof r.json.mine === 'string', '应回 mine（自己条目 id）')
  })

  /* ---------- 删除 ---------- */

  s.test('删除条目 → 200，再删 → 404', async () => {
    const r = await DEL('/privhub/api/roster?id=' + encodeURIComponent(humanId), { token: admin })
    ok(r.json && r.json.ok, '删除失败：' + r.text.slice(0, 120))
    const again = await DEL('/privhub/api/roster?id=' + encodeURIComponent(humanId), { token: admin })
    eq(again.status, 404, '重复删除应 404')
    entryIds.splice(entryIds.indexOf(humanId), 1) // 已删，收尾别再删
  })

  s.test('缺 id 删除 → 400', async () => {
    const r = await DEL('/privhub/api/roster', { token: admin })
    eq(r.status, 400, '缺 id 应 400')
  })

  s.test('名册落盘加密（PHENC1）', async () => {
    const file = dataPath('roster.json')
    if (!file || !existsSync(file)) return // 无 PRIVHUB_TEST_ROOT：静默降级
    const raw = readFileSync(file)
    ok(raw.length > 0, '名册文件应非空')
    eq(raw.subarray(0, 6).toString('latin1'), 'PHENC1', '名册应加密落盘')
  })

  s.test('收尾：吊销密钥 + 删条目 + 删项目 + 清回收站', async () => {
    for (const id of keyIds) {
      await POST('/privhub/api/agent/v1/keys/revoke', { token: admin, body: { id } }).catch(() => null)
    }
    for (const id of entryIds) {
      await DEL('/privhub/api/roster?id=' + encodeURIComponent(id), { token: admin }).catch(() => null)
    }
    for (const p of [PROJECT, OTHER]) {
      await POST('/privhub/api/project-delete', { token: admin, body: { name: p } }).catch(() => null)
      await purgeTrashOfProject(admin, p)
    }
    const tb = dataPath('taskboards', PROJECT + '.json')
    const db = dataPath('dashboards', PROJECT + '.json')
    for (const f of [tb, db]) if (f && existsSync(f)) rmSync(f, { force: true })
    const left = await GET('/privhub/api/roster', { token: admin })
    const names = (left.json && left.json.entries ? left.json.entries : []).map((e) => e.name)
    notIncludes(names.join(','), '_roster_human2', '收尾应删掉人工条目')
    notIncludes(names.join(','), '_roster_agent', '收尾应删掉智能体条目')
  })

  return s
}
