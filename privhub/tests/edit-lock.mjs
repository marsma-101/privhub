/**
 * Y 批编辑锁回归（2026-10-12）：悲观独占编辑锁。
 *
 * 为什么必须单独有一套：锁的效果是「别人正在改的东西，你改不动、删不掉、改不了名」，
 * 这类拦截只在**多用户并发**下才看得出来，单人自测永远绿灯。这里用 admin + user1
 * 两个真实会话，覆盖：
 *   ① 申请/被占 409/释放/强解  ② 写前校验（保存被拦）
 *   ③ 名字级操作（重命名、移动父目录、删除）被拦  ④ 不误伤其它文件
 *   ⑤ 心跳续期  ⑥ TTL 过期自动解锁  ⑦ 前缀冲突（锁文件 ↔ 改名其父目录）
 *
 * 端口纪律：只打 3190（run-all 默认目标），由 `run-all.mjs --spawn` 拉起隔离实例。
 *
 * @module tests/edit-lock
 */

import { createSuite, ok, eq, loginOk, uploadFile, safeDelete, GET, POST, PUT, DEL } from './lib.mjs'

const PROJECT = process.env.PRIVHUB_TEST_PROJECT || '公共'
const PFX = '_ylock_'
const RAND = Date.now().toString(36).slice(-6)
const DIR = PFX + RAND
const SUB = DIR + '/sub'
const A = SUB + '/a_' + RAND + '.md'
const B = DIR + '/b_' + RAND + '.md'

async function mkdirp(token, rel) {
  const parts = rel.split('/')
  let cur = ''
  for (const p of parts) {
    await POST('/privhub/api/mkdir', { token, body: { project: PROJECT, path: cur, name: p } })
    cur = cur ? cur + '/' + p : p
  }
}

const lockGet = (token, path) =>
  GET('/privhub/api/lock?project=' + encodeURIComponent(PROJECT) + '&path=' + encodeURIComponent(path), { token })
const lockAcq = (token, path, ttlMs) =>
  POST('/privhub/api/lock', { token, body: { project: PROJECT, path, ...(ttlMs ? { ttlMs } : {}) } })
const lockRel = (token, path, force) =>
  DEL('/privhub/api/lock?project=' + encodeURIComponent(PROJECT) + '&path=' + encodeURIComponent(path) + (force ? '&force=1' : ''), { token })

export function build() {
  const s = createSuite('edit-lock')

  s.test('准备：两个会话 + 两个 .md 文件', async () => {
    const admin = await loginOk('admin', 'admin123')
    const user1 = await loginOk('user1', 'user123')
    ok(!!admin && !!user1, 'admin/user1 均可登录')
    await mkdirp(admin, DIR)
    await mkdirp(admin, SUB)
    const e1 = await uploadFile(admin, PROJECT, SUB, 'a_' + RAND + '.md', '# A ' + RAND + '\n')
    const e2 = await uploadFile(admin, PROJECT, DIR, 'b_' + RAND + '.md', '# B ' + RAND + '\n')
    ok(e1.json && e1.json.ok, 'a.md 上传成功')
    ok(e2.json && e2.json.ok, 'b.md 上传成功')
  })

  s.test('① 未锁 → 查询为 unlocked，admin 可申请', async () => {
    const admin = await loginOk('admin', 'admin123')
    const st = await lockGet(admin, A)
    eq(st.json.locked, false, '初始未锁')
    const acq = await lockAcq(admin, A)
    eq(acq.status, 200, 'admin 申请锁成功')
    eq(acq.json.acquired, true)
  })

  s.test('② user1 申请同一文件 → 409 且提示占用人', async () => {
    const user1 = await loginOk('user1', 'user123')
    const acq = await lockAcq(user1, A)
    eq(acq.status, 409, '被占 → 409')
    ok(typeof acq.json.error === 'string' && acq.json.error.includes('文件正被'), '文案含「文件正被」')
    ok(acq.json.error.includes('admin'), '文案点名占用人 admin')
    const st = await lockGet(user1, A)
    eq(st.json.locked, true, '查询可见已锁')
    eq(st.json.by, 'admin', '占用人为 admin')
  })

  s.test('③ 写前校验：user1 保存被锁文件 → 409', async () => {
    const user1 = await loginOk('user1', 'user123')
    const r = await PUT('/privhub/api/doc', { token: user1, body: { project: PROJECT, path: A, doc: '# 想偷偷覆盖\n', baseMtime: 0 } })
    eq(r.status, 409, '保存被编辑锁拦下')
    ok(String(r.json.error).includes('文件正被'), '错误文案一致')
  })

  s.test('④ 名字级操作被拦：重命名 / 改名父目录 / 删除', async () => {
    const user1 = await loginOk('user1', 'user123')
    const ren = await POST('/privhub/api/rename', { token: user1, body: { project: PROJECT, path: A, newName: 'hacked.md' } })
    eq(ren.status, 409, '重命名被锁文件 → 409')
    const renDir = await POST('/privhub/api/rename', { token: user1, body: { project: PROJECT, path: SUB, newName: 'sub2' } })
    eq(renDir.status, 409, '改名其父目录 → 409（前缀冲突）')
    const del = await POST('/privhub/api/delete', { token: user1, body: { project: PROJECT, path: A } })
    eq(del.status, 409, '删除被锁文件 → 409')
  })

  s.test('⑤ 不误伤：user1 可锁并保存另一个文件', async () => {
    const user1 = await loginOk('user1', 'user123')
    const acq = await lockAcq(user1, B)
    eq(acq.status, 200, '不同文件可单独加锁')
    const r = await PUT('/privhub/api/doc', { token: user1, body: { project: PROJECT, path: B, doc: '# B 被 user1 改过 ' + RAND + '\n', baseMtime: 0 } })
    eq(r.status, 200, '自己持锁的文件可保存')
  })

  s.test('⑥ 心跳续期：仅持有人可续，他人续期失败', async () => {
    const user1 = await loginOk('user1', 'user123')
    const admin = await loginOk('admin', 'admin123')
    const re1 = await POST('/privhub/api/lock/renew', { token: user1, body: { project: PROJECT, path: B } })
    eq(re1.status, 200, '持有人续期成功')
    const re2 = await POST('/privhub/api/lock/renew', { token: admin, body: { project: PROJECT, path: B } })
    eq(re2.status, 409, '非持有人续期失败')
  })

  s.test('⑦ 释放：非持有人不能释放，admin 可强解', async () => {
    const user1 = await loginOk('user1', 'user123')
    const admin = await loginOk('admin', 'admin123')
    const r1 = await lockRel(user1, A)
    eq(r1.json.released, false, 'user1 释放 admin 的锁无效')
    const r2 = await lockRel(admin, A, true)
    eq(r2.json.released, true, 'admin 强解成功')
    const st = await lockGet(admin, A)
    eq(st.json.locked, false, '强解后已解锁')
    const re = await lockAcq(user1, A)
    eq(re.status, 200, '解锁后 user1 可申请')
    await lockRel(user1, A)
  })

  s.test('⑧ TTL 过期后自动解锁', async () => {
    const user1 = await loginOk('user1', 'user123')
    const acq = await lockAcq(user1, B, 2000)
    eq(acq.status, 200, '短 TTL 申请成功')
    const before = await lockGet(user1, B)
    eq(before.json.locked, true, '锁存在')
    await new Promise((r) => setTimeout(r, 2600))
    const after = await lockGet(user1, B)
    eq(after.json.locked, false, '超过 TTL 后自动解锁')
  })

  s.test('⑨ 统计接口（仅 admin）', async () => {
    const admin = await loginOk('admin', 'admin123')
    const user1 = await loginOk('user1', 'user123')
    const r = await GET('/privhub/api/lock/stats', { token: admin })
    eq(r.status, 200, 'admin 可读统计')
    ok(typeof r.json.total === 'number', '返回 total 计数')
    const bad = await GET('/privhub/api/lock/stats', { token: user1 })
    eq(bad.status, 403, 'user1 被拒')
  })

  s.test('⑩ 只读（无写权限）用户不能申请锁', async () => {
    const admin = await loginOk('admin', 'admin123')
    const user1 = await loginOk('user1', 'user123')
    // 给 B 打 read 档（放行 view、拒绝 edit）→ 申请锁必须 403，而不是先占住再让别人写不进
    const r = await POST('/privhub/api/acl/policy', { token: admin, body: { project: PROJECT, path: B, target: 'file', role: '', mode: 'read' } })
    ok(r.json && r.json.ok, '设置 read 档失败：' + r.text.slice(0, 160))
    const acq = await lockAcq(user1, B)
    eq(acq.status, 403, '只读用户申请编辑锁 → 403')
    const rules = await GET('/privhub/api/acl/rules', { token: admin })
    for (const rule of (rules.json && rules.json.rules) || []) {
      if (rule.project === PROJECT && rule.path === B) await DEL('/privhub/api/acl/rules', { token: admin, body: { id: rule.id } })
    }
  })

  s.test('清理：释放全部锁并删除样本', async () => {
    const admin = await loginOk('admin', 'admin123')
    await lockRel(admin, A, true)
    await lockRel(admin, B, true)
    await safeDelete(admin, PROJECT, DIR)
    ok(true, '清理完成')
  })

  return s
}

export default build
