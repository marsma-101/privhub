/**
 * 个人空间回归（个人空间 v1）
 *
 * 个人空间 = data-files 下的顶层文件夹，但【不是项目】：
 *   1) 仅归属者本人可见可访问（管理员也不行，管理员只有审计可见性）
 *   2) 不计入 allProjects / 项目列表 / 索引范围
 *   3) 实名注册时自动创建，姓名全局唯一（冲突时提示「姓名-部门」）
 *   4) 系统永不自动删除（删账号、删项目都不动它）
 *
 * @module tests/personal-space
 */

import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { createSuite, ok, eq, GET, POST, loginOk, uploadFile, listDir } from './lib.mjs'

const PFX = '_ps_'

/**
 * 测试根惰性读取：run-all.mjs 的 import 早于它设置 PRIVHUB_TEST_ROOT，
 * 写成模块级 const 会读到 undefined，导致磁盘断言静默跳过（空断言）。
 */
const TEST_ROOT = () => process.env.PRIVHUB_TEST_ROOT || ''

/** 测试根下的个人空间目录绝对路径（无测试根时返回空串，跳过磁盘断言）。 */
function spacePath(name) {
  return TEST_ROOT() ? join(TEST_ROOT(), 'data-files', name) : ''
}

export function build() {
  const s = createSuite('个人空间（personal-space）')
  let admin = ''
  let user1 = ''

  const rand = Math.random().toString(36).slice(2, 8)
  const uname = PFX + rand
  const realName = '测试员' + rand
  let token = ''

  /** 临时开启自助注册后建号（finally 复原开关，避免把测试环境的注册永久改掉）。 */
  async function registerUser(username, displayName) {
    const before = await GET('/privhub/api/settings', { token: admin })
    const orig = before.json?.settings?.allowSelfRegister
    try {
      await POST('/privhub/api/settings', { token: admin, body: { allowSelfRegister: true } })
      return await POST('/privhub/api/register', {
        body: { username, password: 'test123456', displayName },
      })
    } finally {
      await POST('/privhub/api/settings', {
        token: admin,
        body: { allowSelfRegister: typeof orig === 'boolean' ? orig : false },
      }).catch(() => null)
    }
  }

  s.test('准备：测试根可用（否则磁盘断言会被静默跳过）', async () => {
    ok(!!TEST_ROOT(), 'PRIVHUB_TEST_ROOT 已传给测试进程')
  })

  s.test('准备：登录管理员与普通用户', async () => {
    admin = await loginOk('admin', 'admin123')
    user1 = await loginOk('user1', 'user123')
    ok(admin && user1, '登录成功')
  })

  s.test('未填真实姓名不得注册（实名制前提）', async () => {
    const r = await registerUser(PFX + rand + 'x', '')
    eq(r.status, 400, '未填姓名应 400，实际 ' + r.status)
    ok(!r.json?.ok, '未填姓名不得注册成功')
  })

  s.test('实名注册成功并自动创建个人空间目录', async () => {
    const r = await registerUser(uname, realName)
    ok(r.json && r.json.ok, '注册失败：' + r.text.slice(0, 160))
    eq(r.json.personalDir, realName, '返回的 personalDir 应为真实姓名')
    ok(existsSync(spacePath(realName)), `应已创建目录 data-files/${realName}`)
  })

  s.test('同名注册被拒，并提示改用「姓名-部门」', async () => {
    const r = await registerUser(PFX + rand + 'y', realName)
    eq(r.status, 409, '重名注册应 409，实际 ' + r.status)
    const msg = String(r.json?.error || '')
    ok(msg.includes('部门'), '错误文案应提示加部门区分，实际：' + msg)
    ok(msg.includes(realName + '-'), '错误文案应给出「姓名-部门」示例，实际：' + msg)
  })

  s.test('本人可列出并写入自己的个人空间', async () => {
    token = await loginOk(uname, 'test123456')
    const me = await GET('/privhub/api/me', { token })
    eq(me.json?.user?.personalDir, realName, '/api/me 应返回 personalDir')
    const pl = await GET('/privhub/api/projects', { token })
    ok((pl.json?.projects || []).includes(realName), '个人空间应出现在本人项目列表：' + JSON.stringify(pl.json?.projects))
    const up = await uploadFile(token, realName, '', PFX + 'mine.txt', 'hello')
    ok(up.json && up.json.ok, '本人应能写入个人空间：' + up.text.slice(0, 120))
    const ents = await listDir(token, realName)
    ok(ents.some((e) => e.name === PFX + 'mine.txt'), '应能列到自己上传的文件')
  })

  s.test('其他普通用户不可访问', async () => {
    const r = await GET('/privhub/api/list?' + new URLSearchParams({ project: realName }), { token: user1 })
    eq(r.status, 403, `非本人访问应 403（实际 ${r.status}）`)
  })

  s.test('管理员不可访问、且列表中看不到（核心设计）', async () => {
    const r = await GET('/privhub/api/list?' + new URLSearchParams({ project: realName }), { token: admin })
    eq(r.status, 403, `管理员访问他人个人空间应 403（实际 ${r.status}）`)
    const pl = await GET('/privhub/api/projects', { token: admin })
    ok(!(pl.json?.projects || []).includes(realName), '管理员项目列表不得包含他人个人空间')
    const us = await GET('/privhub/api/admin/users', { token: admin })
    ok(!(us.json?.allProjects || []).includes(realName), 'allProjects 不得包含他人个人空间')
  })

  s.test('不能新建同名项目，也不能把个人空间当项目删除', async () => {
    const c = await POST('/privhub/api/project-create', { token: admin, body: { name: realName } })
    ok(!c.json?.ok, '不该允许创建与个人空间同名的项目')
    const d = await POST('/privhub/api/project-delete', { token: admin, body: { name: realName } })
    ok(!d.json?.ok, '不该允许把个人空间当项目删除')
    ok(existsSync(spacePath(realName)), '个人空间目录必须仍然存在')
  })

  s.test('删除账号后个人空间与文件仍保留（永不自动删除）', async () => {
    await POST('/privhub/api/admin/user-delete', { token: admin, body: { username: uname } }).catch(() => null)
    ok(existsSync(spacePath(realName)), '删除账号后个人空间目录必须保留')
    ok(existsSync(join(spacePath(realName), PFX + 'mine.txt')), '个人空间内的文件必须保留')
  })

  s.test('清理测试产物', async () => {
    // 系统按设计不会删除个人空间，测试必须自行清理，否则残留目录会让下次注册查重失败
    try { rmSync(spacePath(realName), { recursive: true, force: true }) } catch { /* 忽略 */ }
    const us = await GET('/privhub/api/admin/users', { token: admin })
    for (const u of (us.json?.users || [])) {
      if (String(u.username).startsWith(PFX)) {
        await POST('/privhub/api/admin/user-delete', { token: admin, body: { username: u.username } }).catch(() => null)
      }
    }
  })

  return s
}
