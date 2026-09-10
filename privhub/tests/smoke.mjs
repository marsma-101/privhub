/**
 * PrivHub 核心冒烟回归（O4）
 *
 * 覆盖主干链路：登录 → 项目 → 新建目录 → 上传 → 列表 → 预览 → 下载 →
 * 重命名 → 移动 → 删除 → 回收站列表 → 恢复 → 彻底删除 → 审计 → 权限。
 *
 * 运行前需先启动隔离测试实例（端口 3190），测试数据落在测试根目录内。
 * 所有测试产物统一使用 `_smoke_` 前缀，结束后清理。
 *
 * @module tests/smoke
 */

import {
  createSuite, ok, eq, includes,
  login, loginOk, uploadFile, listDir, safeDelete, purgeTrashOfProject,
  GET, POST,
} from './lib.mjs'

const PROJECT = process.env.PRIVHUB_TEST_PROJECT || '公共'
const PFX = '_smoke_'

export function build() {
  const s = createSuite('核心冒烟（smoke）')
  let admin = ''
  let user1 = ''
  const created = [] // { project, path } 供清理

  s.test('未登录访问受保护接口返回 401', async () => {
    const r = await GET('/privhub/api/list?project=' + encodeURIComponent(PROJECT))
    eq(r.status, 401, '未登录应 401')
  })

  s.test('错误密码登录被拒', async () => {
    const r = await login('admin', 'definitely-wrong-password')
    ok(r.status === 401, '错误密码应 401，实际 ' + r.status)
  })

  s.test('管理员登录成功', async () => {
    admin = await loginOk('admin', 'admin123')
    ok(admin.length >= 32, 'token 长度异常')
  })

  s.test('普通用户登录成功', async () => {
    user1 = await loginOk('user1', 'user123')
    ok(user1.length >= 32, 'token 长度异常')
  })

  s.test('/me 返回当前用户', async () => {
    const r = await GET('/privhub/api/me', { token: admin })
    ok(r.json && r.json.ok, 'me 失败')
    eq(r.json.user.username, 'admin', '用户名')
    eq(r.json.user.role, 'admin', '角色')
  })

  s.test('项目列表可见', async () => {
    const r = await GET('/privhub/api/projects', { token: admin })
    ok(r.json && r.json.ok, 'projects 失败')
    ok(r.json.projects.includes(PROJECT), '应包含项目 ' + PROJECT)
  })

  s.test('新建文件夹', async () => {
    const name = PFX + 'dir'
    created.push({ project: PROJECT, path: name })
    const r = await POST('/privhub/api/mkdir', { token: admin, body: { project: PROJECT, name } })
    ok(r.json && r.json.ok, 'mkdir 失败：' + r.text.slice(0, 120))
  })

  s.test('上传文件到子目录', async () => {
    const r = await uploadFile(admin, PROJECT, PFX + 'dir', PFX + 'a.txt', 'hello-privhub')
    ok(r.json && r.json.ok, 'upload 失败：' + r.text.slice(0, 120))
    eq(r.json.size, 'hello-privhub'.length, '落盘大小')
  })

  s.test('列表能看到新文件', async () => {
    const entries = await listDir(admin, PROJECT, PFX + 'dir')
    const hit = entries.find((e) => e.name === PFX + 'a.txt')
    ok(hit, '列表中未找到上传的文件')
    ok(!hit.isDir, '应为文件')
  })

  s.test('预览返回文件内容', async () => {
    const q = new URLSearchParams({ project: PROJECT, path: PFX + 'dir/' + PFX + 'a.txt' })
    const r = await GET('/privhub/api/preview?' + q.toString(), { token: admin })
    ok(r.json && r.json.ok, 'preview 失败')
    eq(r.json.type, 'text', '预览类型')
    eq(r.json.data, 'hello-privhub', '预览内容')
  })

  s.test('下载返回原始字节', async () => {
    const q = new URLSearchParams({ project: PROJECT, path: PFX + 'dir/' + PFX + 'a.txt' })
    const r = await GET('/privhub/api/download?' + q.toString(), { token: admin })
    eq(r.status, 200, '下载状态')
    eq(r.buffer.toString('utf8'), 'hello-privhub', '下载内容')
  })

  s.test('重命名生效', async () => {
    const r = await POST('/privhub/api/rename', {
      token: admin,
      body: { project: PROJECT, path: PFX + 'dir/' + PFX + 'a.txt', newName: PFX + 'b.txt' },
    })
    ok(r.json && r.json.ok, 'rename 失败：' + r.text.slice(0, 120))
    const entries = await listDir(admin, PROJECT, PFX + 'dir')
    ok(entries.some((e) => e.name === PFX + 'b.txt'), '新名未出现')
    ok(!entries.some((e) => e.name === PFX + 'a.txt'), '旧名仍存在')
  })

  s.test('移动文件到项目根', async () => {
    const r = await POST('/privhub/api/move', {
      token: admin,
      body: { project: PROJECT, from: PFX + 'dir/' + PFX + 'b.txt', toDir: '' },
    })
    ok(r.json && r.json.ok, 'move 失败：' + r.text.slice(0, 120))
    created.push({ project: PROJECT, path: PFX + 'b.txt' })
  })

  s.test('删除文件进入回收站', async () => {
    const r = await POST('/privhub/api/delete', { token: admin, body: { project: PROJECT, path: PFX + 'b.txt' } })
    ok(r.json && r.json.ok, 'delete 失败：' + r.text.slice(0, 120))
    const t = await GET('/privhub/api/trash-list', { token: admin })
    ok(t.json && t.json.ok, 'trash-list 失败')
    const hit = (t.json.trash || []).find((x) => x.name === PFX + 'b.txt' && x.project === PROJECT)
    ok(hit, '回收站中未找到刚删除的文件')
    ok(hit.deletedBy === 'admin', 'deletedBy 应为 admin')
  })

  s.test('回收站恢复文件', async () => {
    const t = await GET('/privhub/api/trash-list', { token: admin })
    const hit = (t.json.trash || []).find((x) => x.name === PFX + 'b.txt' && x.project === PROJECT)
    ok(hit, '回收站条目丢失')
    const r = await POST('/privhub/api/trash-restore', { token: admin, body: { id: hit.id } })
    ok(r.json && r.json.ok, 'restore 失败：' + r.text.slice(0, 120))
    const entries = await listDir(admin, PROJECT)
    ok(entries.some((e) => e.name === PFX + 'b.txt'), '恢复后文件未出现')
  })

  s.test('删除并彻底清除', async () => {
    await POST('/privhub/api/delete', { token: admin, body: { project: PROJECT, path: PFX + 'b.txt' } })
    const t = await GET('/privhub/api/trash-list', { token: admin })
    const hit = (t.json.trash || []).find((x) => x.name === PFX + 'b.txt' && x.project === PROJECT)
    ok(hit, '回收站条目丢失')
    const r = await POST('/privhub/api/trash-purge', { token: admin, body: { id: hit.id } })
    ok(r.json && r.json.ok, 'purge 失败：' + r.text.slice(0, 120))
    const t2 = await GET('/privhub/api/trash-list', { token: admin })
    ok(!(t2.json.trash || []).some((x) => x.id === hit.id), '彻底删除后条目仍在')
  })

  s.test('越权访问其它项目返回 403', async () => {
    const r = await GET('/privhub/api/list?project=' + encodeURIComponent('B项目'), { token: user1 })
    eq(r.status, 403, 'user1 访问 B项目 应 403')
  })

  s.test('路径穿越被拒绝', async () => {
    const r = await GET('/privhub/api/list?project=' + encodeURIComponent(PROJECT) + '&path=../../data', { token: admin })
    ok(r.status === 200, '请求应被正常处理')
    ok(r.json && r.json.ok, '应返回 ok 但内容为空')
    eq((r.json.entries || []).length, 0, '穿越路径不应列出内容')
  })

  s.test('管理员可查询审计日志', async () => {
    const r = await GET('/privhub/api/audit?limit=50', { token: admin })
    ok(r.json && r.json.ok, 'audit 失败：' + r.text.slice(0, 120))
    ok(Array.isArray(r.json.entries), 'entries 应为数组')
    ok(r.json.entries.length > 0, '审计应有记录')
  })

  s.test('普通用户不能查询审计日志', async () => {
    const r = await GET('/privhub/api/audit', { token: user1 })
    eq(r.status, 403, 'user1 查审计应 403')
  })

  s.test('文件名非法时上传被拒', async () => {
    const q = new URLSearchParams({ project: PROJECT, name: 'bad/name.txt' })
    const r = await POST('/privhub/api/upload?' + q.toString(), { token: admin, raw: 'x' })
    eq(r.status, 400, '非法文件名应 400')
  })

  // 清理
  s.test('清理测试产物', async () => {
    for (const c of created) await safeDelete(admin, c.project, c.path)
    await purgeTrashOfProject(admin, PROJECT)
    const entries = await listDir(admin, PROJECT)
    const leftovers = entries.filter((e) => e.name.startsWith(PFX))
    ok(leftovers.length === 0, '仍有测试残留：' + leftovers.map((e) => e.name).join(','))
  })

  return s
}
