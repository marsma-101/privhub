/**
 * 任务日历回归（privhub-task-calendar）
 *
 * 日历是**纯客户端插件**（只有 client/，无 src/index.ts，不挂服务端路由）：
 * 它复用既有的任务看板接口，把卡片的 dueDate 铺到月/周/日三视图上。
 * 所以本套件验的不是「日历界面」（那由 tests/frontend-templates.mjs 编译校验 + 人工目视），
 * 而是**日历所依赖的那份服务端契约**：
 *   ① 卡片能带 dueDate 建出来；
 *   ② 能把卡片改到另一天（拖动改期走的就是这一步）；③ 能清空 dueDate（移出排期）；
 *   ④ 接口回读的 dueDate 是「当天 0 点」的毫秒数（日历按天归位就靠这个口径）。
 *
 * 使用独立项目 `_taskcal_reg`，结束后整项目删除并清空回收站。
 *
 * @module tests/task-calendar
 */

import {
  createSuite, ok, eq, loginOk, GET, POST, PATCH, purgeTrashOfProject,
} from './lib.mjs'

const PROJECT = '_taskcal_reg'

/** 本地时区当天 0 点的毫秒（与日历前端 dayKey/startOfDay 同口径）。 */
function dayMs(y, m, d) {
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime()
}

export function build() {
  const s = createSuite('任务日历（task-calendar）')
  let admin = ''
  let cardId = ''
  const DAY_A = dayMs(2030, 3, 10)
  const DAY_B = dayMs(2030, 3, 17)

  s.test('登录（admin）', async () => {
    admin = await loginOk('admin', 'admin123')
  })

  s.test('清理并新建测试项目', async () => {
    await POST('/privhub/api/project-delete', { token: admin, body: { name: PROJECT } }).catch(() => null)
    await purgeTrashOfProject(admin, PROJECT)
    const r = await POST('/privhub/api/project-create', { token: admin, body: { name: PROJECT } })
    ok(r.json && r.json.ok, '新建项目失败：' + r.text.slice(0, 120))
  })

  s.test('带截止日期建卡（日历据此铺到某一天）', async () => {
    const r = await POST('/privhub/api/taskboard/cards', {
      token: admin,
      body: { project: PROJECT, title: '日历回归卡片', dueDate: DAY_A, priority: 'high' },
    })
    ok(r.json && r.json.ok, '建卡失败：' + r.text.slice(0, 120))
    cardId = r.json.card.id
    eq(r.json.card.dueDate, DAY_A, 'dueDate 应按原样保存')
  })

  s.test('回读：卡片带 dueDate，且是当天 0 点', async () => {
    const r = await GET('/privhub/api/taskboard?project=' + encodeURIComponent(PROJECT), { token: admin })
    ok(r.json && r.json.ok, '读看板失败：' + r.text.slice(0, 120))
    const card = r.json.board.cards.find((c) => c.id === cardId)
    ok(card, '卡片应在看板里')
    eq(card.dueDate, DAY_A, '回读的 dueDate 应与写入一致')
    const d = new Date(card.dueDate)
    // 用 join 比较：lib 的 eq 是 `!==` 恒等比较，数组永远不等（会变成"期望 [0,0,0] 实际 [0,0,0]"的假失败）
    eq([d.getHours(), d.getMinutes(), d.getSeconds()].join(','), '0,0,0', '应是当天 0 点（日历按天归位的前提）')
  })

  s.test('拖动改期：改到另一天', async () => {
    const r = await PATCH('/privhub/api/taskboard/cards', {
      token: admin, body: { project: PROJECT, id: cardId, dueDate: DAY_B },
    })
    ok(r.json && r.json.ok, '改期失败：' + r.text.slice(0, 120))
    const g = await GET('/privhub/api/taskboard?project=' + encodeURIComponent(PROJECT), { token: admin })
    eq(g.json.board.cards.find((c) => c.id === cardId).dueDate, DAY_B, '已改到新的一天')
  })

  s.test('移出排期：dueDate 置空', async () => {
    const r = await PATCH('/privhub/api/taskboard/cards', {
      token: admin, body: { project: PROJECT, id: cardId, dueDate: null },
    })
    ok(r.json && r.json.ok, '清空截止日期失败：' + r.text.slice(0, 120))
    const g = await GET('/privhub/api/taskboard?project=' + encodeURIComponent(PROJECT), { token: admin })
    eq(g.json.board.cards.find((c) => c.id === cardId).dueDate, null, 'dueDate 应为 null（未排期）')
  })

  s.test('清理：删除测试项目并清空回收站', async () => {
    await POST('/privhub/api/project-delete', { token: admin, body: { name: PROJECT } }).catch(() => null)
    await purgeTrashOfProject(admin, PROJECT)
    ok(true, '已清理')
  })

  return s
}
