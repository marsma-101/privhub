/**
 * 功能权限开关回归（privhub-svc-cap + privhub-admin-cap）
 *
 * 覆盖：
 *   - 鉴权：未登录 401；普通用户读开关表 403；普通用户改开关 403。
 *   - 默认值 = 上线前行为：管理员全 write；普通用户对 admin.* 一律 none（403）、
 *     对 task.write / dashboard.write 默认 write（200）。
 *   - 单点开关：把某功能对普通用户打开（read/write）后立刻生效，关掉后立刻收回。
 *   - 校验：未知功能 400、非法级别 400。
 *   - 复位：reset 回到默认表。
 *   - 落盘：data/capabilities.json 加密（PHENC1）（仅在 PRIVHUB_TEST_ROOT 存在时断言）。
 *
 * 使用独立项目 `_cap_reg` 做项目域用例，结束后删除并清空回收站。
 * 所有开关改动都在用例内复位，跑完不留偏离默认的配置。
 *
 * @module tests/cap
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createSuite, ok, eq, loginOk, GET, POST, PUT, purgeTrashOfProject } from './lib.mjs'

const PROJECT = '_cap_reg'

export function build() {
  const s = createSuite('功能权限开关（cap）')
  let admin = ''
  let user1 = ''

  s.test('未登录读 /cap/me → 401', async () => {
    const r = await GET('/privhub/api/cap/me')
    eq(r.status, 401, '未登录应 401')
  })

  s.test('登录（admin / user1）', async () => {
    admin = await loginOk('admin', 'admin123')
    user1 = await loginOk('user1', 'user123')
  })

  s.test('管理员 /cap/me：全部功能为 write', async () => {
    const r = await GET('/privhub/api/cap/me', { token: admin })
    ok(r.json && r.json.ok, '取开关表失败：' + r.text.slice(0, 120))
    eq(r.json.role, 'admin', '角色应为 admin')
    ok(r.json.levels && r.json.levels['admin.audit'] === 'write', '管理员对 admin.audit 恒为 write')
    ok(r.json.levels['task.write'] === 'write', '管理员对 task.write 恒为 write')
  })

  s.test('管理员 /cap/list：功能清单 + 无损坏', async () => {
    const r = await GET('/privhub/api/cap/list', { token: admin })
    ok(r.json && r.json.ok, '取清单失败：' + r.text.slice(0, 120))
    eq(r.json.corrupt, false, '配置初始应无损坏')
    ok(Array.isArray(r.json.features) && r.json.features.length >= 19, '功能清单应含全部登记项')
    const ids = r.json.features.map((f) => f.id)
    for (const id of ['admin.users', 'admin.audit', 'admin.webhook', 'task.write', 'dashboard.write', 'ai.params']) {
      ok(ids.includes(id), '清单应含 ' + id)
    }
    ok(r.json.features.every((f) => ['none', 'read', 'write'].includes(f.userLevel)), '每项都有合法级别')
  })

  s.test('普通用户 /cap/list → 403（不能看全表）', async () => {
    const r = await GET('/privhub/api/cap/list', { token: user1 })
    eq(r.status, 403, '普通用户读全表应 403')
  })

  s.test('默认：普通用户对 admin.audit 不可用（403）', async () => {
    const r = await GET('/privhub/api/audit', { token: user1 })
    eq(r.status, 403, '默认普通用户审计应 403')
  })

  s.test('打开 admin.audit=read：普通用户随即可用', async () => {
    let r = await POST('/privhub/api/cap/save', { token: admin, body: { feature: 'admin.audit', level: 'read' } })
    ok(r.json && r.json.ok, '保存失败：' + r.text.slice(0, 120))
    r = await GET('/privhub/api/audit', { token: user1 })
    eq(r.status, 200, '打开后普通用户审计应 200')
    const me = await GET('/privhub/api/cap/me', { token: user1 })
    eq(me.json.levels['admin.audit'], 'read', '/cap/me 应反映 read')
  })

  s.test('关掉 admin.audit=none：普通用户立即收回', async () => {
    let r = await POST('/privhub/api/cap/save', { token: admin, body: { feature: 'admin.audit', level: 'none' } })
    ok(r.json && r.json.ok, '保存失败：' + r.text.slice(0, 120))
    r = await GET('/privhub/api/audit', { token: user1 })
    eq(r.status, 403, '关掉后普通用户审计应 403')
  })

  s.test('未知功能 → 400', async () => {
    const r = await POST('/privhub/api/cap/save', { token: admin, body: { feature: 'nope.x', level: 'read' } })
    eq(r.status, 400, '未知功能应 400')
  })

  s.test('非法级别 → 400', async () => {
    const r = await POST('/privhub/api/cap/save', { token: admin, body: { feature: 'admin.audit', level: 'super' } })
    eq(r.status, 400, '非法级别应 400')
  })

  s.test('普通用户改开关 → 403', async () => {
    const r = await POST('/privhub/api/cap/save', { token: user1, body: { feature: 'admin.audit', level: 'write' } })
    eq(r.status, 403, '普通用户改开关应 403')
  })

  s.test('批量保存 { table } 并反映 changed', async () => {
    const r = await POST('/privhub/api/cap/save', {
      token: admin,
      body: { table: { 'admin.audit': 'read', 'admin.webhook': 'read' } },
    })
    ok(r.json && r.json.ok, '批量保存失败：' + r.text.slice(0, 120))
    ok(Array.isArray(r.json.changed) && r.json.changed.includes('admin.audit'), 'changed 应含 admin.audit')
    const me = await GET('/privhub/api/cap/me', { token: user1 })
    eq(me.json.levels['admin.webhook'], 'read', '批量保存后普通用户应拿到 admin.webhook=read')
  })

  s.test('reset：回到默认（普通用户重新 403）', async () => {
    const r = await POST('/privhub/api/cap/reset', { token: admin })
    ok(r.json && r.json.ok, '复位失败：' + r.text.slice(0, 120))
    const me = await GET('/privhub/api/cap/me', { token: user1 })
    eq(me.json.levels['admin.audit'], 'none', '复位后 admin.audit 应回 none')
    const audit = await GET('/privhub/api/audit', { token: user1 })
    eq(audit.status, 403, '复位后普通用户审计应 403')
  })

  s.test('user 向协作功能：task.write 默认 write', async () => {
    await POST('/privhub/api/project-delete', { token: admin, body: { name: PROJECT } }).catch(() => null)
    await purgeTrashOfProject(admin, PROJECT)
    const cr = await POST('/privhub/api/project-create', { token: admin, body: { name: PROJECT } })
    ok(cr.json && cr.json.ok, '新建项目失败：' + cr.text.slice(0, 120))
    // 让 user1 可见该项目
    await POST('/privhub/api/admin/user-update', { token: admin, body: { username: 'user1', projects: ['公共', 'A项目', PROJECT] } })

    const r = await GET('/privhub/api/taskboard?project=' + encodeURIComponent(PROJECT), { token: user1 })
    eq(r.status, 200, '默认普通用户应能读任务看板（task.write=write）')
  })

  s.test('关掉 task.write=none：普通用户读任务看板被挡', async () => {
    await POST('/privhub/api/cap/save', { token: admin, body: { feature: 'task.write', level: 'none' } })
    const r = await GET('/privhub/api/taskboard?project=' + encodeURIComponent(PROJECT), { token: user1 })
    eq(r.status, 403, '关掉后普通用户读任务看板应 403')
    // 恢复，避免影响后续用例/其它套件
    await POST('/privhub/api/cap/save', { token: admin, body: { feature: 'task.write', level: 'write' } })
    const back = await GET('/privhub/api/taskboard?project=' + encodeURIComponent(PROJECT), { token: user1 })
    eq(back.status, 200, '恢复后普通用户应又能读任务看板')
  })

  s.test('dashboard.write=none：普通用户 PUT 看板被挡', async () => {
    await POST('/privhub/api/cap/save', { token: admin, body: { feature: 'dashboard.write', level: 'none' } })
    const r = await PUT('/privhub/api/dashboard', {
      token: user1,
      body: { project: PROJECT, dashboard: { sections: [] } },
    })
    eq(r.status, 403, '关掉后普通用户写看板应 403')
    await POST('/privhub/api/cap/save', { token: admin, body: { feature: 'dashboard.write', level: 'write' } })
  })

  s.test('清理测试项目 + 属性复位', async () => {
    // user1 项目列表复原
    await POST('/privhub/api/admin/user-update', { token: admin, body: { username: 'user1', projects: ['公共', 'A项目'] } })
    await POST('/privhub/api/project-delete', { token: admin, body: { name: PROJECT } }).catch(() => null)
    await purgeTrashOfProject(admin, PROJECT)
    const r = await POST('/privhub/api/cap/reset', { token: admin })
    ok(r.json && r.json.ok, '收尾复位失败')
  })

  s.test('落盘：capabilities.json 加密（PHENC1）', async () => {
    const root = process.env.PRIVHUB_TEST_ROOT
    if (!root) return   // 无测试根时静默降级
    // 触发一次写入，确保文件存在
    await POST('/privhub/api/cap/save', { token: admin, body: { feature: 'admin.audit', level: 'none' } })
    await POST('/privhub/api/cap/reset', { token: admin })
    const f = join(root, 'data', 'capabilities.json')
    ok(existsSync(f), 'capabilities.json 应存在')
    const head = readFileSync(f).subarray(0, 6).toString('latin1')
    eq(head, 'PHENC1', '开关表应以密文落盘（PHENC1 头）')
  })

  return s
}
