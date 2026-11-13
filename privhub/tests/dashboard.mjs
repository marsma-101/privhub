/**
 * 项目看板回归（Z 批 · privhub-project-dashboard）
 *
 * 覆盖：读看板 + 实时 facts / 组件契约 / 读写权限（401·403·400）/
 * 覆盖写与 revision 递增 / 清洗（丢未知组件、夹长度）/ 还原默认 /
 * **智能体车道**（X-Agent-Key 写布局，source=agent；scope 越界 403）/
 * 项目隔离 / 加密落盘（PHENC1）。
 *
 * 使用独立项目 `_dashboard_reg`，结束后整项目删除并清空回收站；看板文件一并清除。
 * 磁盘断言仅在 PRIVHUB_TEST_ROOT 存在时执行（否则静默降级为空断言）。
 *
 * @module tests/dashboard
 */

import { readFileSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import {
  createSuite, ok, eq, includes, notIncludes, loginOk,
  GET, POST, PUT, purgeTrashOfProject,
} from './lib.mjs'

const PROJECT = '_dashboard_reg'
const OTHER = '_dashboard_reg_b'

function dashPath(project) {
  const root = process.env.PRIVHUB_TEST_ROOT
  return root ? join(root, 'data', 'dashboards', project + '.json') : ''
}

/** tasks 组件会读任务看板文件；收尾要一并清掉，别给下游套件留残留。 */
function tbPath(project) {
  const root = process.env.PRIVHUB_TEST_ROOT
  return root ? join(root, 'data', 'taskboards', project + '.json') : ''
}

/** 带 Agent 密钥的请求（与 agent-sandbox 同形）。 */
const agent = (key) => ({
  GET: (p) => GET(p, { headers: { 'x-agent-key': key } }),
  POST: (p, body) => POST(p, {
    headers: { 'x-agent-key': key, 'x-idempotency-key': 'k-' + Math.random().toString(36).slice(2, 12) },
    body,
  }),
})

export function build() {
  const s = createSuite('项目看板（dashboard）')
  let admin = ''
  let user1 = ''
  let adminKey = ''   // 管理员签发的、scope=本项目 的 Agent 密钥
  let adminKeyId = ''

  s.test('未登录读看板 → 401', async () => {
    const r = await GET('/privhub/api/dashboard?project=' + encodeURIComponent(PROJECT))
    eq(r.status, 401, '未登录应 401')
  })

  s.test('登录（admin / user1）', async () => {
    admin = await loginOk('admin', 'admin123')
    user1 = await loginOk('user1', 'user123')
  })

  s.test('清理并新建测试项目', async () => {
    await POST('/privhub/api/project-delete', { token: admin, body: { name: PROJECT } }).catch(() => null)
    await purgeTrashOfProject(admin, PROJECT)
    const r = await POST('/privhub/api/project-create', { token: admin, body: { name: PROJECT } })
    ok(r.json && r.json.ok, '新建项目失败：' + r.text.slice(0, 120))
  })

  s.test('组件契约 GET /dashboard/schema', async () => {
    const r = await GET('/privhub/api/dashboard/schema', { token: admin })
    ok(r.json && r.json.ok, '取契约失败：' + r.text.slice(0, 120))
    ok(r.json.widgetTypes && r.json.widgetTypes.markdown && r.json.widgetTypes.stats && r.json.widgetTypes.plan,
      '契约应含三种组件类型')
    ok(r.json.widgetTypes.tasks && r.json.widgetTypes.tasks.note, '契约应含 tasks 组件（任务看板实时投影）')
    ok(r.json.widgetTypes.stats.refs && r.json.widgetTypes.stats.refs.files, 'stats 应给出实时引用清单')
    ok(r.json.limits && r.json.limits.sections > 0, '契约应给出边界常量')
    ok(r.json.write && r.json.write.agent, '契约应说明智能体写入车道')
  })

  s.test('无权限用户读看板 → 403', async () => {
    const r = await GET('/privhub/api/dashboard?project=' + encodeURIComponent(PROJECT), { token: user1 })
    eq(r.status, 403, '非项目成员应 403')
  })

  s.test('缺 project → 400（不是 403）', async () => {
    const r = await GET('/privhub/api/dashboard', { token: admin })
    eq(r.status, 400, '项目名无效应 400')
  })

  s.test('首读返回默认看板 + 实时 facts', async () => {
    const r = await GET('/privhub/api/dashboard?project=' + encodeURIComponent(PROJECT), { token: admin })
    ok(r.json && r.json.ok, '读看板失败：' + r.text.slice(0, 120))
    const d = r.json.dashboard
    ok(Array.isArray(d.sections) && d.sections.length === 4, '默认四区（概览 / 任务进度 / 智能体名册 / 说明）')
    eq(d.source, 'default', '默认来源 default')
    eq(d.sections[0].width, 'full', '首区默认全宽')
    eq(r.json.canEdit, true, '管理员对项目根应有编辑权')
    const f = r.json.facts
    ok(f && typeof f.files === 'number' && typeof f.dirs === 'number' && typeof f.members === 'number',
      'facts 应含 files/dirs/members 计数')
    ok(typeof f.bytesText === 'string' && f.bytesText.length > 0, 'facts 应含可读占用空间')
    ok(!f.truncated, '小项目不应触发扫描截断')
  })

  s.test('覆盖写：新布局落盘并 revision+1', async () => {
    const before = await GET('/privhub/api/dashboard?project=' + encodeURIComponent(PROJECT), { token: admin })
    const rev0 = before.json.dashboard.revision
    const doc = {
      title: '回归看板',
      subtitle: '由测试写入',
      sections: [
        { id: 's1', title: '概览', width: 'half', widgets: [
          { type: 'stats', items: [{ label: '文件总数', ref: 'files' }, { label: '静态', value: '42' }] },
        ] },
        { id: 's2', title: '计划', width: 'half', widgets: [
          { type: 'plan', items: [{ text: '第一件事', state: 'doing', note: '进行中' }, { text: '第二件事', state: 'done' }] },
        ] },
        { id: 's3', title: '说明', width: 'full', widgets: [
          { type: 'markdown', text: '## 小标题\n\n- 列表项\n- **加粗**' },
        ] },
      ],
    }
    const r = await PUT('/privhub/api/dashboard', { token: admin, body: { project: PROJECT, dashboard: doc } })
    ok(r.json && r.json.ok, '覆盖写失败：' + r.text.slice(0, 120))
    eq(r.json.dashboard.revision, rev0 + 1, 'revision 应递增')
    eq(r.json.dashboard.source, 'human', '人工写 source=human')
    eq(r.json.dashboard.sections[0].width, 'half', '半宽保留')
    eq(r.json.dashboard.sections[0].widgets[0].items[0].ref, 'files', 'stats ref 保留')
  })

  /* ---------- tasks 组件：任务看板实时投影（第一信息源 = 任务看板） ---------- */

  s.test('tasks 组件：清洗保留 columns / limit 旋钮', async () => {
    const doc = {
      title: 'T',
      sections: [{
        id: 's1', title: '进度', width: 'full', widgets: [{
          type: 'tasks', title: '任务进度',
          columns: ['col_todo', 'col_done', 'col_todo', 123],   // 去重 + 丢非字符串
          limit: 500,                                            // 超过上限 → 夹到 LIMITS.taskCards
          showCards: false,
        }],
      }],
    }
    const r = await PUT('/privhub/api/dashboard', { token: admin, body: { project: PROJECT, dashboard: doc } })
    ok(r.json && r.json.ok, '写 tasks 看板失败：' + r.text.slice(0, 120))
    const w = r.json.dashboard.sections[0].widgets[0]
    eq(w.type, 'tasks', 'tasks 组件应保留')
    eq((w.columns || []).join(','), 'col_todo,col_done', 'columns 去重且丢非字符串')
    eq(w.limit, 60, 'limit 夹到上限 60')
    eq(w.showCards, false, 'showCards=false 保留')
  })

  s.test('tasks 组件：数据实时取自任务看板（同一份）', async () => {
    // 先在任务看板里造两张卡，把其中一张挪到「已完成」
    const r1 = await POST('/privhub/api/taskboard/cards', { token: admin, body: { project: PROJECT, title: '联动卡 A' } })
    const r2 = await POST('/privhub/api/taskboard/cards', { token: admin, body: { project: PROJECT, title: '联动卡 B' } })
    ok(r1.json && r1.json.ok && r2.json && r2.json.ok, '建卡失败：' + r1.text.slice(0, 120) + r2.text.slice(0, 120))
    const mv = await POST('/privhub/api/taskboard/cards/move', {
      token: admin, body: { project: PROJECT, id: r2.json.card.id, toColumnId: 'col_done' },
    })
    ok(mv.json && mv.json.ok, '挪到已完成失败：' + mv.text.slice(0, 120))

    // 看板只留一个 tasks 组件
    await PUT('/privhub/api/dashboard', {
      token: admin,
      body: { project: PROJECT, dashboard: { title: 'T', sections: [{ id: 's1', title: '进度', width: 'full', widgets: [{ type: 'tasks' }] }] } },
    })
    const r = await GET('/privhub/api/dashboard?project=' + encodeURIComponent(PROJECT), { token: admin })
    ok(r.json && r.json.ok, '读看板失败：' + r.text.slice(0, 120))
    const t = r.json.tasks
    ok(t && t.ok === true, '应返回 tasks 摘要：' + JSON.stringify(t).slice(0, 160))
    eq(t.doneColumnId, 'col_done', '完成列 id')
    ok(t.total >= 2, '总数应含两张联动卡（实际 ' + t.total + '）')
    eq(t.doneCount, 1, '已完成应恰为 1 张')
    eq(t.byColumn.length, 4, '四列计数')
    ok(t.byColumn.some((c) => c.id === 'col_done' && c.count === 1), '「已完成」列计数应为 1')
    ok(t.cards.some((k) => k.title === '联动卡 A'), '卡片明细应带出联动卡')
    ok(t.cards.length && !('desc' in t.cards[0]), '卡片明细只带渲染所需字段（不含 desc）')
    ok(typeof t.donePercent === 'number' && t.donePercent > 0, '完成度应为正数')
  })

  s.test('tasks 组件：看板未用 tasks 组件 → tasks=null（不去读任务看板）', async () => {
    await PUT('/privhub/api/dashboard', {
      token: admin,
      body: { project: PROJECT, dashboard: { title: 'T', sections: [{ id: 's1', title: 'A', width: 'full', widgets: [{ type: 'markdown', text: '只有说明' }] }] } },
    })
    const r = await GET('/privhub/api/dashboard?project=' + encodeURIComponent(PROJECT), { token: admin })
    ok(r.json && r.json.ok, '读看板失败')
    eq(r.json.tasks, null, '没有 tasks 组件时应为 null')
  })

  s.test('清洗：未知组件类型被丢弃、越界状态归一', async () => {
    const doc = {
      title: 'X',
      sections: [{
        id: 's1', title: 'A', width: 'weird',
        widgets: [
          { type: 'evil', text: 'should drop' },
          { type: 'plan', items: [{ text: 'e', state: '不存在的状态' }] },
        ],
      }],
    }
    const r = await PUT('/privhub/api/dashboard', { token: admin, body: { project: PROJECT, dashboard: doc } })
    ok(r.json && r.json.ok, '写失败：' + r.text.slice(0, 120))
    eq(r.json.dashboard.sections[0].widgets.length, 1, '未知类型组件应被丢弃')
    eq(r.json.dashboard.sections[0].widgets[0].type, 'plan', '仅保留合法组件')
    eq(r.json.dashboard.sections[0].widgets[0].items[0].state, 'todo', '非法状态应归一为 todo')
    eq(r.json.dashboard.sections[0].width, 'full', '非法 width 应归一为 full')
  })

  s.test('结构非法（无 sections）→ 400', async () => {
    const r = await PUT('/privhub/api/dashboard', { token: admin, body: { project: PROJECT, dashboard: { nope: 1 } } })
    eq(r.status, 400, '缺少 sections 应 400')
  })

  s.test('无编辑权限用户写 → 403', async () => {
    const r = await PUT('/privhub/api/dashboard', { token: user1, body: { project: PROJECT, dashboard: { sections: [] } } })
    eq(r.status, 403, '非成员写应 403')
  })

  s.test('还原默认看板', async () => {
    const r = await POST('/privhub/api/dashboard/reset', { token: admin, body: { project: PROJECT } })
    ok(r.json && r.json.ok, '还原失败：' + r.text.slice(0, 120))
    eq(r.json.dashboard.source, 'default', '还原后 source=default')
    eq(r.json.dashboard.sections.length, 4, '还原为默认四区')
    eq(r.json.dashboard.updatedBy, 'admin', '记录操作者')
  })

  /* ---------- 智能体车道 ---------- */

  s.test('智能体：签发本项目 scope 的密钥', async () => {
    const r = await POST('/privhub/api/agent/v1/keys', {
      token: admin,
      body: { name: 'dash-test', username: 'admin', scope: { kind: 'project', project: PROJECT } },
    })
    ok(r.json && r.json.ok && r.json.key, '签发密钥失败：' + r.text.slice(0, 200))
    adminKey = r.json.key
    adminKeyId = r.json.id
    ok(adminKey.startsWith('pha_'), '密钥前缀应为 pha_')
  })

  s.test('智能体读看板（含 facts）', async () => {
    const r = await agent(adminKey).GET('/privhub/api/agent/v1/dashboard?project=' + encodeURIComponent(PROJECT))
    ok(r.json && r.json.ok, '智能体读看板失败：' + r.text.slice(0, 160))
    ok(r.json.dashboard && Array.isArray(r.json.dashboard.sections), '应返回看板文档')
    ok(r.json.facts && typeof r.json.facts.files === 'number', '应返回实时 facts')
  })

  s.test('智能体重写布局：source=agent、revision 递增', async () => {
    const before = await agent(adminKey).GET('/privhub/api/agent/v1/dashboard?project=' + encodeURIComponent(PROJECT))
    const rev0 = before.json.dashboard.revision
    const doc = {
      title: 'AI 维护的看板',
      sections: [
        { id: 'ai1', title: '当前状态', width: 'half', widgets: [
          { type: 'stats', title: '盘子', items: [{ label: '文件', ref: 'files' }, { label: '成员', ref: 'members' }] },
        ] },
        { id: 'ai2', title: '施工计划', width: 'half', widgets: [
          { type: 'plan', items: [{ text: '接线看板', state: 'done' }, { text: '补测试', state: 'doing' }] },
        ] },
      ],
    }
    const r = await agent(adminKey).POST('/privhub/api/agent/v1/dashboard', { project: PROJECT, dashboard: doc })
    ok(r.json && r.json.ok, '智能体写看板失败：' + r.text.slice(0, 160))
    eq(r.json.dashboard.source, 'agent', '智能体写 source=agent')
    eq(r.json.dashboard.revision, rev0 + 1, 'revision 应递增')
    eq(r.json.dashboard.sections.length, 2, '两区生效')
    ok(String(r.json.dashboard.updatedBy).startsWith('ai:'), 'updatedBy 应标注 ai: 前缀')
  })

  s.test('智能体写：scope 越界项目 → 403 AGENT-4031', async () => {
    await POST('/privhub/api/project-create', { token: admin, body: { name: OTHER } }).catch(() => null)
    const r = await agent(adminKey).POST('/privhub/api/agent/v1/dashboard', {
      project: OTHER, dashboard: { sections: [] },
    })
    eq(r.status, 403, `scope 外项目应 403（实际 ${r.status}）`)
    eq(r.json?.code, 'AGENT-4031', '错误码应为 AGENT-4031')
  })

  s.test('项目隔离：另一项目仍为默认看板', async () => {
    const r = await GET('/privhub/api/dashboard?project=' + encodeURIComponent(OTHER), { token: admin })
    ok(r.json && r.json.ok, '读另一项目失败')
    eq(r.json.dashboard.source, 'default', '另一项目不受影响')
  })

  s.test('看板文件加密落盘（PHENC1）', async () => {
    const f = dashPath(PROJECT)
    if (!f || !existsSync(f)) return // 无测试根：降级为空断言
    const head = readFileSync(f).subarray(0, 6).toString('latin1')
    eq(head, 'PHENC1', '看板应为加密落盘，实际头部 ' + JSON.stringify(head))
    const body = readFileSync(f).toString('latin1')
    notIncludes(body, 'AI 维护的看板', '明文不应出现看板标题')
  })

  /* ══════════ L1 项目总览（issue #3：首屏回答「整个盘子怎么样」）══════════
   * 这里验的是**服务端口径**：权限范围、空板不冒充 0、任务开关降级、个人入口只给本人。
   * 纯函数层面的桶归类/卡点计数/均值分母在 tests/overview-aggregate.mjs（65 项）。 */

  s.test('总览：未登录 → 401', async () => {
    const r = await GET('/privhub/api/dashboard/overview')
    eq(r.status, 401, '未登录应 401')
  })

  s.test('总览：非 GET → 405', async () => {
    const r = await POST('/privhub/api/dashboard/overview', { token: admin, body: {} })
    eq(r.status, 405, '总览是只读端点，写方法应 405')
  })

  s.test('总览：结构齐备（KPI / 桶 / 项目卡片 / 我的）', async () => {
    const r = await GET('/privhub/api/dashboard/overview', { token: admin })
    ok(r.json && r.json.ok, '总览读取失败：' + r.text.slice(0, 160))
    const t = r.json.totals
    ok(t && typeof t.projects === 'number', 'totals.projects 是数字')
    ok(t.buckets && ['todo', 'doing', 'review', 'done'].every((k) => typeof t.buckets[k] === 'number'),
      '四个管线桶都有计数（没有就是 0，不缺键）')
    ok(Array.isArray(r.json.projects), 'projects 是数组')
    ok(r.json.mine && typeof r.json.mine.open === 'number', '带「我的待办」计数')
    ok(typeof r.json.truncated === 'boolean', '带截断标记（前端据此明说只显示了前 N 个）')
  })

  s.test('总览：按名查找能在截断之前命中（项目多于上限也搜得到）', async () => {
    /* 这条是实测踩出来的：测试根里堆了几百个历史项目，聚合上限 60，
     * 测试项目排在后面被截断 —— 若筛选只在前端做，用户会以为项目不存在。
     * 所以这里**必须**用 ?q= 走服务端全量名单，且断言它真的命中。 */
    const ov = await GET('/privhub/api/dashboard/overview?q=' + encodeURIComponent(PROJECT), { token: admin })
    ok(ov.json && ov.json.ok, '带 q 的总览读取失败：' + ov.text.slice(0, 160))
    const hit = (ov.json.projects || []).find((p) => p.project === PROJECT)
    ok(hit, `按名查找应命中测试项目（实际返回 ${(ov.json.projects || []).length} 条）`)
    ok(ov.json.search && ov.json.search.q === PROJECT, '回包带上 search.q（前端据此说明筛选范围）')
    ok((ov.json.projects || []).every((p) => p.project.includes(PROJECT)),
      '搜索结果里不混入不匹配的项目')
    /* KPI 不随筛选缩水：否则一搜某个项目，领导会以为整个盘子塌了 */
    const full = await GET('/privhub/api/dashboard/overview', { token: admin })
    eq(ov.json.totals.tasks, full.json.totals.tasks, '筛选不改变任务合计（KPI 始终是全盘口径）')
    eq(ov.json.mine.open, full.json.mine.open, '筛选不改变「我的待办」')
  })

  s.test('总览：本项目进度与任务看板同源', async () => {
    const [ov, board] = await Promise.all([
      GET('/privhub/api/dashboard/overview?q=' + encodeURIComponent(PROJECT), { token: admin }),
      GET('/privhub/api/taskboard?project=' + encodeURIComponent(PROJECT), { token: admin }),
    ])
    const hit = (ov.json.projects || []).find((p) => p.project === PROJECT)
    ok(hit, '总览里应能找到测试项目')
    const cards = board.json.board.cards
    eq(hit.total, cards.length, '总任务数 = 任务看板卡片数（同一真相源，不另存副本）')
    eq(hit.doneCount, cards.filter((c) => c.columnId === 'col_done').length, '完成数与看板一致')
    const sum = hit.buckets.todo + hit.buckets.doing + hit.buckets.review + hit.buckets.done
    eq(sum, hit.total, '四桶之和 = 总数（自定义列也被归位，没有漏桶）')
  })

  s.test('总览：普通用户只看到自己有权的项目', async () => {
    const r = await GET('/privhub/api/dashboard/overview', { token: user1 })
    ok(r.json && r.json.ok, '普通用户读总览失败：' + r.text.slice(0, 160))
    const pl = await GET('/privhub/api/projects', { token: user1 })
    const visible = new Set(pl.json.projects || [])
    const leaked = (r.json.projects || []).filter((p) => !visible.has(p.project))
    eq(leaked.length, 0, '不得出现无权项目：' + leaked.map((p) => p.project).join(', '))
  })

  /* 为什么用 allProjects 做对照而不是 users[].personalDir：
   * /api/admin/users 出于隐私只回 hasPersonalSpace，**不回目录名** ——
   * 拿它取 personalDir 会永远是空数组，断言变成「永远绿的假保险」。
   * allProjects 的契约就是「全部项目、不含任何个人目录」（personal-space 套件已钉住），
   * 所以「总览项目 ⊆ allProjects」是一条真能失败的越界检查。 */
  s.test('总览：只含真项目，个人目录绝不进聚合（管理员也不行）', async () => {
    const [r, us] = await Promise.all([
      GET('/privhub/api/dashboard/overview', { token: admin }),
      GET('/privhub/api/admin/users', { token: admin }),
    ])
    ok(us.json && us.json.ok, '读用户表失败：' + us.text.slice(0, 120))
    const real = new Set(us.json.allProjects || [])
    ok(real.size > 0, '对照集非空（否则本条断言没有意义）')
    const leaked = (r.json.projects || []).filter((p) => !real.has(p.project))
    eq(leaked.length, 0, '总览出现了非项目条目（个人目录/越权）：' + leaked.map((p) => p.project).join(', '))
  })

  s.test('总览：我的入口只给本人目录', async () => {
    const me = await GET('/privhub/api/me', { token: admin })
    const r = await GET('/privhub/api/dashboard/overview', { token: admin })
    const own = me.json?.user?.personalDir || null
    if (!own) { eq(r.json.personal, null, '未开通个人目录 → personal=null'); return }
    eq(r.json.personal && r.json.personal.dir, own, 'personal.dir 必须是**本人**目录')
  })

  s.test('总览：文件数不递归统计（首屏不能被大库拖死）', async () => {
    const r = await GET('/privhub/api/dashboard/overview', { token: admin })
    const withFiles = (r.json.projects || []).filter((p) => p.files !== null)
    eq(withFiles.length, 0, '总览默认不做 facts 递归扫描，files 一律 null（界面显示「—」而非 0）')
  })

  s.test('总览：任务功能关闭 → 明说原因且进度为 null（不显示 0%）', async () => {
    /* 开关口径与 cap 套件一致：{ feature, level }；收尾必须复位，
     * 否则后面所有套件的任务看板都会 403（这是本轮最容易留下环境污染的地方）。 */
    const off = await POST('/privhub/api/cap/save', { token: admin, body: { feature: 'task.write', level: 'none' } })
    ok(off.json && off.json.ok, '关闭 task.write 失败：' + off.text.slice(0, 120))
    try {
      const me = await GET('/privhub/api/cap/me', { token: user1 })
      eq(me.json.levels['task.write'], 'none', '普通用户的 task.write 应已为 none')
      const r = await GET('/privhub/api/dashboard/overview', { token: user1 })
      ok(r.json && r.json.ok, '任务功能关闭时总览本身仍应可读：' + r.text.slice(0, 120))
      eq(r.json.tasksDisabled, true, '必须回 tasksDisabled=true，让界面说清原因')
      const bad = (r.json.projects || []).filter((p) => p.percent !== null)
      eq(bad.length, 0, '所有项目进度必须为 null（界面「—」），不得显示 0%')
      eq(r.json.mine.open, 0, '任务不可读时「我的待办」不编造数字')
    } finally {
      const on = await POST('/privhub/api/cap/save', { token: admin, body: { feature: 'task.write', level: 'write' } })
      ok(on.json && on.json.ok, '复位 task.write 失败（会污染后续套件）')
    }
  })

  s.test('清理：吊销密钥 + 删除测试项目并清空回收站', async () => {
    if (adminKeyId) await POST('/privhub/api/agent/v1/keys/revoke', { token: admin, body: { id: adminKeyId } }).catch(() => null)
    await POST('/privhub/api/project-delete', { token: admin, body: { name: PROJECT } }).catch(() => null)
    await POST('/privhub/api/project-delete', { token: admin, body: { name: OTHER } }).catch(() => null)
    await purgeTrashOfProject(admin, PROJECT)
    await purgeTrashOfProject(admin, OTHER)
    for (const p of [PROJECT, OTHER]) {
      for (const f of [dashPath(p), tbPath(p)]) {
        if (f && existsSync(f)) { try { rmSync(f) } catch { /* 忽略 */ } }
      }
    }
    ok(true, '已清理')
  })

  return s
}
