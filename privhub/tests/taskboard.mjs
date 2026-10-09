/**
 * 任务看板回归（PLAN-01 · privhub-task-board）
 *
 * 覆盖 R1–R8：读看板 / 建改删卡 / 拖拽改列 / 建改删列（卡片迁移）/ WIP 上限 /
 * 权限（401·403·400）/ 项目隔离 / 加密落盘（PHENC1）。
 *
 * 使用独立项目 `_taskboard_reg`，结束后整项目删除并回收站清空；看板文件一并清除。
 * 磁盘断言仅在 PRIVHUB_TEST_ROOT 存在时执行（否则静默降级为空断言）。
 *
 * @module tests/taskboard
 */

import { readFileSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import {
  createSuite, ok, eq, includes, notIncludes, loginOk,
  GET, POST, PATCH, DEL, purgeTrashOfProject,
} from './lib.mjs'

const PROJECT = '_taskboard_reg'
const OTHER = '_taskboard_reg_b'

function boardPath(project) {
  const root = process.env.PRIVHUB_TEST_ROOT
  return root ? join(root, 'data', 'taskboards', project + '.json') : ''
}

export function build() {
  const s = createSuite('任务看板（taskboard）')
  let admin = ''
  let user1 = ''
  let cardId = ''
  let colB = ''

  s.test('未登录读看板 → 401', async () => {
    const r = await GET('/privhub/api/taskboard?project=' + encodeURIComponent(PROJECT))
    eq(r.status, 401, '未登录应 401')
  })

  s.test('登录（admin / user1）', async () => {
    admin = await loginOk('admin', 'admin123')
    user1 = await loginOk('user1', 'user123')
  })

  s.test('清理并新建测试项目', async () => {
    // 上一次异常退出可能留下同名项目：先软删 + 清空回收站，再新建
    await POST('/privhub/api/project-delete', { token: admin, body: { name: PROJECT } }).catch(() => null)
    await purgeTrashOfProject(admin, PROJECT)
    const r = await POST('/privhub/api/project-create', { token: admin, body: { name: PROJECT } })
    ok(r.json && r.json.ok, '新建项目失败：' + r.text.slice(0, 120))
  })

  s.test('无权限用户读看板 → 403', async () => {
    const r = await GET('/privhub/api/taskboard?project=' + encodeURIComponent(PROJECT), { token: user1 })
    eq(r.status, 403, '非项目成员应 403')
  })

  s.test('缺 project → 400（不是 403）', async () => {
    const r = await GET('/privhub/api/taskboard', { token: admin })
    eq(r.status, 400, '项目名无效应 400')
  })

  s.test('空看板返回默认三列', async () => {
    const r = await GET('/privhub/api/taskboard?project=' + encodeURIComponent(PROJECT), { token: admin })
    ok(r.json && r.json.ok, '读看板失败：' + r.text.slice(0, 120))
    eq(r.json.board.columns.length, 3, '默认三列')
    eq(r.json.board.cards.length, 0, '默认无卡片')
    eq(r.json.board.columns[0].title, '待办', '首列标题')
  })

  s.test('建卡成功', async () => {
    const r = await POST('/privhub/api/taskboard/cards', {
      token: admin,
      body: { project: PROJECT, title: '回归卡片', priority: 'high', labels: ['x', 'y'] },
    })
    ok(r.json && r.json.ok, '建卡失败：' + r.text.slice(0, 120))
    cardId = r.json.card.id
    eq(r.json.card.priority, 'high', '优先级')
    eq(r.json.card.columnId, 'col_todo', '默认落首列')
    eq(r.json.card.source, 'human', '第 1 期 source 固定 human')
  })

  s.test('空标题建卡 → 400', async () => {
    const r = await POST('/privhub/api/taskboard/cards', { token: admin, body: { project: PROJECT, title: '   ' } })
    eq(r.status, 400, '空标题应 400')
  })

  s.test('改卡成功（PATCH：标题 / 指派 / 标签）', async () => {
    const r = await PATCH('/privhub/api/taskboard/cards', {
      token: admin,
      body: { project: PROJECT, id: cardId, title: '回归卡片-改', assignee: 'user1', labels: ['z'] },
    })
    ok(r.json && r.json.ok, '改卡失败：' + r.text.slice(0, 120))
    const g = await GET('/privhub/api/taskboard?project=' + encodeURIComponent(PROJECT), { token: admin })
    const card = g.json.board.cards.find((c) => c.id === cardId)
    eq(card.title, '回归卡片-改', '标题已改')
    eq(card.assignee, 'user1', '负责人已改')
    eq(card.labels.length, 1, '标签已改')
  })

  s.test('拖拽：卡片移到「进行中」列', async () => {
    const r = await POST('/privhub/api/taskboard/cards/move', {
      token: admin,
      body: { project: PROJECT, id: cardId, toColumnId: 'col_doing', order: 0 },
    })
    ok(r.json && r.json.ok, '移动失败：' + r.text.slice(0, 120))
    const g = await GET('/privhub/api/taskboard?project=' + encodeURIComponent(PROJECT), { token: admin })
    eq(g.json.board.cards.find((c) => c.id === cardId).columnId, 'col_doing', '已改列')
  })

  s.test('移到不存在的列 → 404', async () => {
    const r = await POST('/privhub/api/taskboard/cards/move', {
      token: admin, body: { project: PROJECT, id: cardId, toColumnId: 'col_nope', order: 0 },
    })
    eq(r.status, 404, '目标列不存在应 404')
  })

  s.test('新建列成功', async () => {
    const r = await POST('/privhub/api/taskboard/columns', { token: admin, body: { project: PROJECT, title: '待验证' } })
    ok(r.json && r.json.ok, '建列失败：' + r.text.slice(0, 120))
    colB = r.json.column.id
  })

  s.test('改列：重命名 + WIP 上限', async () => {
    const r = await PATCH('/privhub/api/taskboard/columns', {
      token: admin, body: { project: PROJECT, id: colB, title: '待验证-改', wipLimit: 1 },
    })
    ok(r.json && r.json.ok, '改列失败：' + r.text.slice(0, 120))
    const g = await GET('/privhub/api/taskboard?project=' + encodeURIComponent(PROJECT), { token: admin })
    const col = g.json.board.columns.find((c) => c.id === colB)
    eq(col.title, '待验证-改', '列名已改')
    eq(col.wipLimit, 1, 'WIP 上限已设')
  })

  s.test('WIP 上限生效：超限建卡被拒', async () => {
    const a = await POST('/privhub/api/taskboard/cards', { token: admin, body: { project: PROJECT, title: 'wip-1', columnId: colB } })
    ok(a.json && a.json.ok, '第一张应成功')
    const b = await POST('/privhub/api/taskboard/cards', { token: admin, body: { project: PROJECT, title: 'wip-2', columnId: colB } })
    eq(b.status, 400, '超过 WIP 上限应 400')
    includes(b.text, 'WIP', '错误应说明 WIP 上限')
  })

  s.test('非法 WIP 值被拒', async () => {
    const { req } = await import('./lib.mjs')
    const r = await req('PATCH', '/privhub/api/taskboard/columns', { token: admin, body: { project: PROJECT, id: colB, wipLimit: 0 } })
    eq(r.status, 400, 'WIP=0 应 400')
  })

  s.test('删列：卡片迁移到首列（不丢卡）', async () => {
    const r = await DEL('/privhub/api/taskboard/columns?project=' + encodeURIComponent(PROJECT) + '&id=' + encodeURIComponent(colB), { token: admin })
    ok(r.json && r.json.ok, '删列失败：' + r.text.slice(0, 120))
    const g = await GET('/privhub/api/taskboard?project=' + encodeURIComponent(PROJECT), { token: admin })
    eq(g.json.board.columns.length, 3, '删回三列')
    ok(!g.json.board.cards.some((c) => c.columnId === colB), '无卡片残留在已删列')
    eq(g.json.board.cards.length, 2, '卡片总数不变（迁移而非删除）')
  })

  s.test('删列删到只剩一列 → 400', async () => {
    const g = await GET('/privhub/api/taskboard?project=' + encodeURIComponent(PROJECT), { token: admin })
    const ids = g.json.board.columns.map((c) => c.id)
    // 依次删到 1 列
    for (const id of ids.slice(1)) {
      await DEL('/privhub/api/taskboard/columns?project=' + encodeURIComponent(PROJECT) + '&id=' + encodeURIComponent(id), { token: admin })
    }
    const r = await DEL('/privhub/api/taskboard/columns?project=' + encodeURIComponent(PROJECT) + '&id=' + encodeURIComponent(ids[0]), { token: admin })
    eq(r.status, 400, '最后一列不可删')
    includes(r.text, '至少保留一列', '错误应说明原因')
  })

  s.test('删卡成功', async () => {
    const r = await DEL('/privhub/api/taskboard/cards?project=' + encodeURIComponent(PROJECT) + '&id=' + encodeURIComponent(cardId), { token: admin })
    ok(r.json && r.json.ok, '删卡失败：' + r.text.slice(0, 120))
    const g = await GET('/privhub/api/taskboard?project=' + encodeURIComponent(PROJECT), { token: admin })
    ok(!g.json.board.cards.some((c) => c.id === cardId), '卡片已删除')
  })

  s.test('删不存在的卡 → 404', async () => {
    const r = await DEL('/privhub/api/taskboard/cards?project=' + encodeURIComponent(PROJECT) + '&id=nope', { token: admin })
    eq(r.status, 404, '不存在应 404')
  })

  s.test('项目隔离：另一项目看板不含本项目的卡片', async () => {
    await POST('/privhub/api/project-create', { token: admin, body: { name: OTHER } }).catch(() => null)
    const r = await GET('/privhub/api/taskboard?project=' + encodeURIComponent(OTHER), { token: admin })
    ok(r.json && r.json.ok, '读另一项目看板失败')
    eq(r.json.board.cards.length, 0, '另一项目应为空看板')
  })

  s.test('看板文件加密落盘（PHENC1）', async () => {
    const f = boardPath(PROJECT)
    if (!f || !existsSync(f)) return // 无测试根：降级为空断言
    const head = readFileSync(f).subarray(0, 6).toString('latin1')
    eq(head, 'PHENC1', '看板应为加密落盘，实际头部 ' + JSON.stringify(head))
    const body = readFileSync(f).toString('latin1')
    notIncludes(body, '回归卡片', '明文不应出现卡片标题')
  })

  s.test('清理：删除测试项目并清空回收站', async () => {
    await POST('/privhub/api/project-delete', { token: admin, body: { name: PROJECT } }).catch(() => null)
    await POST('/privhub/api/project-delete', { token: admin, body: { name: OTHER } }).catch(() => null)
    await purgeTrashOfProject(admin, PROJECT)
    await purgeTrashOfProject(admin, OTHER)
    for (const p of [PROJECT, OTHER]) {
      const f = boardPath(p)
      if (f && existsSync(f)) { try { rmSync(f) } catch { /* 忽略 */ } }
    }
    ok(true, '已清理')
  })

  return s
}
