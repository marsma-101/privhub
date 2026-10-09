/**
 * A 组交互缺口回归（JT-01 / JT-03 / JT-05 / JT-06）
 *
 * 这四条都是「功能在，但用户走不通或看不懂」的缺口，修的是体验与信息暴露，
 * 不是新增能力，因此断言也盯行为：
 *   · JT-01 自助改密码：验证当前密码、改后旧密码失效、其它会话失效、当前会话保留
 *   · JT-03 个人空间全文检索：明确给出「不参与检索」的说明（而不是静默空结果）
 *   · JT-05 上传失败文案：不把服务器绝对路径/errno 抛给用户
 *   · JT-06 项目不存在：返回 404 语义（而不是伪装成空目录）
 *
 * @module tests/selfservice
 */

import { rmSync } from 'node:fs'
import { join } from 'node:path'
import {
  createSuite, ok, eq, includes,
  loginOk, uploadFile, GET, POST,
} from './lib.mjs'

const PROJECT = process.env.PRIVHUB_TEST_PROJECT || '公共'
const PFX = '_self_'
const TEST_ROOT = process.env.PRIVHUB_TEST_ROOT || ''

/** 删除测试账号的个人空间目录（删用户不会删个人空间，必须自行清理）。 */
function cleanupPersonalDir(dir) {
  if (!TEST_ROOT || !dir) return
  try { rmSync(join(TEST_ROOT, 'data-files', dir), { recursive: true, force: true }) } catch { /* 忽略 */ }
}

export function build() {
  const s = createSuite('账号自助与交互缺口（selfservice）')
  let admin = ''
  let tmpUser = ''
  let tmpPass = 'test123456'
  let tmpDir = ''

  s.test('准备：登录管理员并创建临时账号', async () => {
    admin = await loginOk('admin', 'admin123')
    ok(admin, '管理员登录成功')

    const rand = Math.random().toString(36).slice(2, 8)
    tmpUser = PFX + rand
    tmpDir = 'SS测试' + rand
    const before = await GET('/privhub/api/settings', { token: admin })
    const origReg = before.json?.settings?.allowSelfRegister
    try {
      await POST('/privhub/api/settings', { token: admin, body: { allowSelfRegister: true } })
      const r = await POST('/privhub/api/register', {
        body: { username: tmpUser, password: tmpPass, displayName: tmpDir },
      })
      ok(r.json && r.json.ok, '创建临时账号：' + r.text.slice(0, 120))
    } finally {
      await POST('/privhub/api/settings', {
        token: admin,
        body: { allowSelfRegister: typeof origReg === 'boolean' ? origReg : false },
      }).catch(() => null)
    }
  })

  /* ---------- JT-01 自助改密码 ---------- */
  s.test('JT-01 未登录改密码返回 401', async () => {
    const r = await POST('/privhub/api/me/password', { body: { currentPassword: 'a', newPassword: 'b123456' } })
    eq(r.status, 401, '未登录应 401')
  })

  s.test('JT-01 当前密码错误 / 新密码过短 / 与旧密码相同 一律拒绝', async () => {
    const tok = await loginOk(tmpUser, tmpPass)
    const bad = await POST('/privhub/api/me/password', {
      token: tok, body: { currentPassword: 'wrong-pass', newPassword: 'newpass123' },
    })
    eq(bad.status, 400, '当前密码错误应 400')
    includes(bad.json?.error || '', '当前密码', '错误文案应指明当前密码不对')

    const short = await POST('/privhub/api/me/password', {
      token: tok, body: { currentPassword: tmpPass, newPassword: '123' },
    })
    eq(short.status, 400, '新密码过短应 400')

    const same = await POST('/privhub/api/me/password', {
      token: tok, body: { currentPassword: tmpPass, newPassword: tmpPass },
    })
    eq(same.status, 400, '新旧密码相同应 400')

    // 关键：连续失败后旧密码必须仍然有效（不能把密码改坏）
    const still = await loginOk(tmpUser, tmpPass)
    ok(still, '失败尝试后旧密码仍可登录')
  })

  s.test('JT-01 改密码成功后：新密码可登录、旧密码失效、其它会话失效、本会话保留', async () => {
    const tokA = await loginOk(tmpUser, tmpPass)
    const tokB = await loginOk(tmpUser, tmpPass) // 第二台"设备"
    const next = 'newpass456'

    const r = await POST('/privhub/api/me/password', {
      token: tokA, body: { currentPassword: tmpPass, newPassword: next },
    })
    ok(r.json && r.json.ok, '改密码应成功：' + r.text.slice(0, 120))

    // 本会话保留（用户不需要重新登录）
    const meA = await GET('/privhub/api/me', { token: tokA })
    ok(meA.json && meA.json.ok, '发起改密的会话应保持有效')

    // 其它会话立即失效（可能落在他人设备上）
    const meB = await GET('/privhub/api/me', { token: tokB })
    eq(meB.status, 401, '其它会话应失效（实际 ' + meB.status + '）')

    // 新密码可用、旧密码作废
    const withNew = await loginOk(tmpUser, next)
    ok(withNew, '新密码应能登录')
    const withOld = await POST('/privhub/api/login', { body: { username: tmpUser, password: tmpPass } })
    eq(withOld.status, 401, '旧密码应失效')

    tmpPass = next
  })

  /* ---------- JT-06 项目不存在 ---------- */
  s.test('JT-06 列出不存在的项目返回 404 而不是空目录', async () => {
    const r = await GET('/privhub/api/list?project=' + encodeURIComponent('_no_such_project_'), { token: admin })
    eq(r.status, 404, `不存在的项目应 404（实际 ${r.status}）`)
    ok(!r.json?.ok, '不应装作成功返回空列表')
    includes(r.json?.error || '', '不存在', '文案应说明项目不存在')
  })

  s.test('JT-06 正常项目仍是 200', async () => {
    const r = await GET('/privhub/api/list?project=' + encodeURIComponent(PROJECT), { token: admin })
    eq(r.status, 200, '正常项目应 200')
    ok(Array.isArray(r.json?.entries), '应返回 entries 数组')
  })

  /* ---------- JT-05 上传失败文案 ---------- */
  s.test('JT-05 超长文件名被提前拦下，且文案不含服务器路径', async () => {
    const longName = PFX + 'a'.repeat(240) + '.txt'
    const r = await uploadFile(admin, PROJECT, '', longName, 'x')
    eq(r.status, 400, '超长文件名应 400')
    includes(r.json?.error || '', '过长', '文案应说明文件名过长')
    if (TEST_ROOT) {
      ok(!String(r.json?.error || '').includes(TEST_ROOT), '不得把服务器根路径抛给用户')
    }
    ok(!/[A-Za-z]:\\\\/.test(String(r.json?.error || '')), '不得出现 Windows 绝对路径')
    ok(!/ENAMETOOLONG|errno|ENOENT/.test(String(r.json?.error || '')), '不得出现 errno 代码')
  })

  s.test('JT-05 上传到不存在的目录：400 且文案不含绝对路径', async () => {
    const r = await uploadFile(admin, PROJECT, '_no_such_dir_', PFX + 'x.txt', 'x')
    eq(r.status, 400, '目标目录不存在应 400')
    if (TEST_ROOT) {
      ok(!String(r.json?.error || '').includes(TEST_ROOT), '不得泄漏绝对路径')
    }
    ok(!/[A-Za-z]:\\\\/.test(String(r.json?.error || '')), '不得出现 Windows 绝对路径')
  })

  /* ---------- JT-03 个人空间全文检索说明 ---------- */
  s.test('JT-03 在个人空间搜全文：200 + 明确说明（不是静默空结果）', async () => {
    const tok = await loginOk(tmpUser, tmpPass)
    const r = await GET(
      '/privhub/api/fulltext/search?q=' + encodeURIComponent('测试') + '&project=' + encodeURIComponent(tmpDir),
      { token: tok },
    )
    ok(r.json && r.json.ok, '应返回 200：' + r.text.slice(0, 120))
    ok(r.json?.personal === true, '应标记 personal')
    // 文案刻意避开「个人空间」一词（界面按普通文件夹对待人名目录，见 personal-ui D2）
    includes(r.json?.notice || '', '不参与全文检索', '应说明该文件夹不参与全文检索')
    eq((r.json?.hits || []).length, 0, '不应有命中')
  })

  s.test('JT-03 他人查询我的个人空间仍被拒绝（说明不得成为越权入口）', async () => {
    const other = await loginOk('user1', 'user123')
    const r = await GET(
      '/privhub/api/fulltext/search?q=x&project=' + encodeURIComponent(tmpDir),
      { token: other },
    )
    eq(r.status, 403, `他人访问个人空间应 403（实际 ${r.status}）`)
  })

  s.test('清理：删除临时账号与个人空间目录', async () => {
    await POST('/privhub/api/admin/user-delete', { token: admin, body: { username: tmpUser } }).catch(() => null)
    cleanupPersonalDir(tmpDir)
    ok(true, '已清理 ' + tmpUser + ' / ' + tmpDir)
  })

  return s
}
