/**
 * 我的规则（me-rules）HTTP 回归
 *
 * 个人层「我的规则」tab 的后端契约：每个登录用户可保存一段自由文本规则，
 * 仅本人可读写（owner-only，连 admin 也读不到他人的规则）。断言全部盯行为：
 *   · 未登录 GET/POST → 401
 *   · 新账号 GET → 200 且 rules === ''（默认空，不报错）
 *   · POST 保存（含中文与换行）→ GET 往返一致
 *   · POST 超长（20001 字符）→ 400；非法 JSON → 400
 *   · 越权：B / admin 只能读到自己的（或空），读不到 A 的内容
 *   · 磁盘：data/user-rules/<username>.json 为 PHENC1 密文（仅 TEST_ROOT 存在时）
 *
 * @module tests/me-rules
 */

import { existsSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import {
  createSuite, ok, eq, includes, notIncludes,
  loginOk, GET, POST, req,
} from './lib.mjs'

const PFX = '_mrule_'
/* 测试根【惰性读取】：run-all.mjs 对套件模块的 import 早于它设置
 * PRIVHUB_TEST_ROOT，模块级快照会拿到空串 → 磁盘断言与清理被静默跳过
 * （personal-space.mjs 同款坑，这里沿用它的写法）。 */
const TEST_ROOT = () => process.env.PRIVHUB_TEST_ROOT || ''

/** 删除临时账号的个人空间目录（删用户不会删个人空间，必须自行清理）。 */
function cleanupPersonalDir(dir) {
  if (!TEST_ROOT() || !dir) return
  try { rmSync(join(TEST_ROOT(), 'data-files', dir), { recursive: true, force: true }) } catch { /* 忽略 */ }
}

/** 删除临时账号的规则文件（TEST_ROOT 存在时才做磁盘级清理）。 */
function cleanupRulesFile(username) {
  if (!TEST_ROOT() || !username) return
  try { rmSync(join(TEST_ROOT(), 'data', 'user-rules', username + '.json'), { force: true }) } catch { /* 忽略 */ }
}

export function build() {
  const s = createSuite('我的规则（me-rules）')
  let admin = ''
  let userA = ''
  let userB = ''
  let pass = 'test123456'
  let dirA = ''
  let dirB = ''

  /* A 的规则正文：含中文与换行；标记串用于越权断言 */
  const markA = PFX + 'A的私密规则'
  const rulesA = '一、文件先备份再改动。\n二、' + markA + '，admin 也不可读。\n三、收尾清理测试产物。'

  s.test('准备：登录管理员并创建两个临时账号（A/B）', async () => {
    admin = await loginOk('admin', 'admin123')
    ok(admin, '管理员登录成功')

    const rand = Math.random().toString(36).slice(2, 8)
    userA = PFX + 'a' + rand
    userB = PFX + 'b' + rand
    dirA = '规则A测试' + rand
    dirB = '规则B测试' + rand
    const before = await GET('/privhub/api/settings', { token: admin })
    const origReg = before.json?.settings?.allowSelfRegister
    try {
      await POST('/privhub/api/settings', { token: admin, body: { allowSelfRegister: true } })
      const ra = await POST('/privhub/api/register', {
        body: { username: userA, password: pass, displayName: dirA },
      })
      ok(ra.json && ra.json.ok, '创建临时账号A：' + ra.text.slice(0, 120))
      const rb = await POST('/privhub/api/register', {
        body: { username: userB, password: pass, displayName: dirB },
      })
      ok(rb.json && rb.json.ok, '创建临时账号B：' + rb.text.slice(0, 120))
    } finally {
      await POST('/privhub/api/settings', {
        token: admin,
        body: { allowSelfRegister: typeof origReg === 'boolean' ? origReg : false },
      }).catch(() => null)
    }
  })

  s.test('未登录 GET/POST /me/rules 均返回 401', async () => {
    const g = await GET('/privhub/api/me/rules')
    eq(g.status, 401, '未登录 GET 应 401')
    const p = await POST('/privhub/api/me/rules', { body: { rules: 'x' } })
    eq(p.status, 401, '未登录 POST 应 401')
  })

  s.test('新账号 GET：200 且默认为空规则', async () => {
    const tok = await loginOk(userA, pass)
    const r = await GET('/privhub/api/me/rules', { token: tok })
    eq(r.status, 200, '新账号 GET 应 200')
    ok(r.json && r.json.ok, '应返回 ok:true')
    eq(r.json?.rules, '', '没有规则文件时默认空字符串')
  })

  s.test('POST 保存中文规则（含换行）→ GET 往返一致', async () => {
    const tok = await loginOk(userA, pass)
    const p = await POST('/privhub/api/me/rules', { token: tok, body: { rules: rulesA } })
    eq(p.status, 200, '保存应 200')
    ok(p.json && p.json.ok, '保存应 ok:true')
    eq(p.json?.rules, rulesA, '保存响应应原样回显规则')

    const g = await GET('/privhub/api/me/rules', { token: tok })
    eq(g.status, 200, '读取应 200')
    eq(g.json?.rules, rulesA, 'GET 应与保存内容逐字符一致（含中文与换行）')

    /* 磁盘级：规则必须走 ctx.storage 加密落盘（PHENC1），不得明文可读 */
    if (TEST_ROOT()) {
      const file = join(TEST_ROOT(), 'data', 'user-rules', userA + '.json')
      ok(existsSync(file), '规则文件应落在 data/user-rules/<username>.json')
      const head = readFileSync(file).subarray(0, 6).toString('latin1')
      eq(head, 'PHENC1', '规则文件应为 PHENC1 密文头')
      notIncludes(readFileSync(file, 'latin1'), markA, '密文中不得直接出现规则明文')
    }
  })

  s.test('POST 超长（20001 字符）→ 400 且不覆盖已保存内容', async () => {
    const tok = await loginOk(userA, pass)
    const r = await POST('/privhub/api/me/rules', { token: tok, body: { rules: '长'.repeat(20001) } })
    eq(r.status, 400, '超长应 400')
    includes(r.json?.error || '', '过长', '错误文案应说明过长')
    const g = await GET('/privhub/api/me/rules', { token: tok })
    eq(g.json?.rules, rulesA, '失败的保存不得破坏已有规则')
  })

  s.test('POST 恰好 20000 字符（边界内）→ 200，随后恢复原规则', async () => {
    const tok = await loginOk(userA, pass)
    const edge = '边'.repeat(20000)
    const r = await POST('/privhub/api/me/rules', { token: tok, body: { rules: edge } })
    eq(r.status, 200, '上限值本身应允许保存')
    const g = await GET('/privhub/api/me/rules', { token: tok })
    eq(g.json?.rules, edge, '边界值应完整往返')
    const back = await POST('/privhub/api/me/rules', { token: tok, body: { rules: rulesA } })
    eq(back.status, 200, '恢复原规则应成功')
  })

  s.test('POST 非法 JSON → 400 invalid json', async () => {
    const tok = await loginOk(userA, pass)
    const r = await req('POST', '/privhub/api/me/rules', {
      token: tok, raw: '{bad', headers: { 'content-type': 'application/json' },
    })
    eq(r.status, 400, '非法 JSON 应 400')
    includes(r.json?.error || '', 'invalid json', '错误文案应指明 JSON 非法')
    const g = await GET('/privhub/api/me/rules', { token: tok })
    eq(g.json?.rules, rulesA, '非法请求不得破坏已有规则')
  })

  s.test('越权：账号B 只能读到自己的，读不到 A 的规则', async () => {
    const tokB = await loginOk(userB, pass)
    const g = await GET('/privhub/api/me/rules', { token: tokB })
    eq(g.status, 200, 'B 读自己的规则应 200')
    eq(g.json?.rules, '', 'B 没有保存过规则，应为默认空')

    /* 即使请求里带上 A 的用户名，也只能操作 B 自己的存储（owner-only 不认参数） */
    const spoof = await GET('/privhub/api/me/rules?username=' + encodeURIComponent(userA), { token: tokB })
    eq(spoof.status, 200, '带他人 username 参数的 GET 不应报错')
    notIncludes(spoof.json?.rules ?? '', markA, 'query 里塞他人用户名也读不到 A 的规则')
    const spoofPost = await POST('/privhub/api/me/rules', {
      token: tokB, body: { username: userA, rules: PFX + 'B冒充写入' },
    })
    eq(spoofPost.status, 200, '带他人 username 参数的 POST 只写自己')
    const tokA = await loginOk(userA, pass)
    const gA = await GET('/privhub/api/me/rules', { token: tokA })
    eq(gA.json?.rules, rulesA, 'A 的规则不得被 B 冒名覆盖')
    /* B 恢复为空，保持「B 默认空」的口径 */
    await POST('/privhub/api/me/rules', { token: tokB, body: { rules: '' } })
  })

  s.test('越权：admin 也只能读到自己的，读不到 A 的规则', async () => {
    const g = await GET('/privhub/api/me/rules', { token: admin })
    eq(g.status, 200, 'admin 读自己的规则应 200')
    notIncludes(g.json?.rules ?? '', markA, 'admin 不得读到 A 的规则（owner-only）')
  })

  s.test('清理：删除临时账号、个人空间目录与规则文件', async () => {
    await POST('/privhub/api/admin/user-delete', { token: admin, body: { username: userA } }).catch(() => null)
    await POST('/privhub/api/admin/user-delete', { token: admin, body: { username: userB } }).catch(() => null)
    cleanupPersonalDir(dirA)
    cleanupPersonalDir(dirB)
    cleanupRulesFile(userA)
    cleanupRulesFile(userB)
    ok(true, '已清理 ' + userA + ' / ' + userB)
  })

  return s
}
