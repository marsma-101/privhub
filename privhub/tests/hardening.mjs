/**
 * 加固回归（D6 / S6 / S7 / S8 / S9 / S11）
 *
 * 验证 2026-09-11 加固批次的关键行为，重点是 D6 并发删除不丢回收站记录
 * （丢记录 = 文件永久消失且无法清理，是本项目最严重的数据可靠性缺陷）。
 *
 * @module tests/hardening
 */

import { rmSync } from 'node:fs'
import { join } from 'node:path'
import {
  createSuite, ok, eq, includes,
  loginOk, uploadFile, listDir, safeDelete, purgeTrashOfProject,
  GET, POST, DEL,
} from './lib.mjs'

const PROJECT = process.env.PRIVHUB_TEST_PROJECT || '公共'
const PFX = '_hard_'
const TEST_ROOT = process.env.PRIVHUB_TEST_ROOT || ''

/**
 * 清理测试账号的个人空间目录。
 * 设计上删除用户【不会】删除个人空间（数据保留给项目维护者），
 * 所以测试必须自行清理；否则残留的同名目录会让下一次注册查重失败。
 */
function cleanupPersonalDir(dir) {
  if (!TEST_ROOT || !dir) return
  try { rmSync(join(TEST_ROOT, 'data-files', dir), { recursive: true, force: true }) } catch { /* 忽略 */ }
}

export function build() {
  const s = createSuite('加固回归（hardening）')
  let admin = ''
  let user1 = ''

  s.test('准备：登录', async () => {
    admin = await loginOk('admin', 'admin123')
    user1 = await loginOk('user1', 'user123')
    ok(admin && user1, '登录成功')
  })

  /* ---- D6：并发删除不得丢回收站记录 ---- */
  s.test('D6 并发删除 24 个文件，回收站记录数与实体数一致', async () => {
    const N = 24
    // 串行上传（避免把上传自身压到极限），并发删除才是被测点
    for (let i = 0; i < N; i++) {
      const r = await uploadFile(admin, PROJECT, '', `${PFX}f${i}.txt`, 'x' + i)
      ok(r.json && r.json.ok, `上传 ${PFX}f${i}.txt 失败：${r.text.slice(0, 80)}`)
    }
    // 并发删除：这是 D6 的触发场景（读-改-写交错）
    const results = await Promise.all(
      Array.from({ length: N }, (_, i) =>
        POST('/privhub/api/delete', { token: admin, body: { project: PROJECT, path: `${PFX}f${i}.txt` } })),
    )
    const okCount = results.filter((r) => r.json && r.json.ok).length
    eq(okCount, N, `全部 ${N} 次删除都应成功`)

    // 等审计/回收站写入稳定后核对记录数
    let recs = []
    for (let i = 0; i < 20; i++) {
      const t = await GET('/privhub/api/trash-list', { token: admin })
      recs = (t.json?.trash || []).filter((x) => x.project === PROJECT && String(x.name).startsWith(PFX))
      if (recs.length >= N) break
      await new Promise((r) => setTimeout(r, 300))
    }
    eq(recs.length, N, `回收站记录数应等于删除数（丢记录 = 文件永久丢失）`)
  })

  s.test('D6 清理并发删除产生的回收站条目', async () => {
    const n = await purgeTrashOfProject(admin, PROJECT)
    ok(n >= 0, `已清理 ${n} 条测试条目`)
    const entries = await listDir(admin, PROJECT)
    const left = entries.filter((e) => e.name.startsWith(PFX))
    eq(left.length, 0, '无测试残留')
  })

  /* ---- D10：写入即加密（行为验证，需真实服务） ---- */
  s.test('D10 系统数据写入后落盘为密文', async () => {
    // 审核指出 D10 此前零覆盖。这里做真正的行为验证：
    // 触发一次 settings 写入 → 从磁盘读该文件 → 断言文件头是 PHENC1。
    // 只检查「内容正确读写」是不够的，明文落盘同样能通过。
    const root = process.env.PRIVHUB_TEST_ROOT || ''
    if (!root) { ok(true, '（未提供 PRIVHUB_TEST_ROOT，跳过磁盘校验）'); return }

    const { readFileSync, existsSync } = await import('node:fs')
    const { join } = await import('node:path')
    const file = join(root, 'data', 'settings.json')

    const before = await GET('/privhub/api/settings', { token: admin })
    const orig = before.json?.settings || {}
    // 写一次，确保文件被 ctx.storage 重新落盘
    await POST('/privhub/api/settings', { token: admin, body: { maxUploadMB: orig.maxUploadMB || 2048 } })

    ok(existsSync(file), 'settings.json 存在')
    const head = readFileSync(file).subarray(0, 6).toString('latin1')
    eq(head, 'PHENC1', `settings.json 应为密文（实际开头 ${JSON.stringify(head)}）`)

    // 回读校验：加密不应影响功能
    const after = await GET('/privhub/api/settings', { token: admin })
    ok(after.json && after.json.ok && typeof after.json.settings.maxUploadMB === 'number',
      '密文状态下仍能正确读出设置')
  })

  /* ---- S7：邀请码/发布码随机性 ---- */
  s.test('S7 邀请码长度与字符集', async () => {
    const r = await POST('/privhub/api/invite/create?project=' + encodeURIComponent(PROJECT), { token: admin })
    ok(r.json && r.json.ok, '创建邀请失败：' + r.text.slice(0, 120))
    const code = r.json.code
    ok(typeof code === 'string' && code.length >= 12, `邀请码长度应 ≥12（实际 ${code?.length}）`)
    ok(/^[a-z2-9]+$/.test(code), '邀请码字符集应受限')
    await DEL('/privhub/api/invite?code=' + encodeURIComponent(code), { token: admin })
  })

  s.test('S7 邀请码具备随机性（字符分布无偏且不重复）', async () => {
    // 审核指出：只查长度的话，把实现改回 Math.random() 或常量池照样通过。
    // 这条补上「随机性」判别：多次生成的码必须互不相同，且字符分布不过度集中。
    const codes = []
    for (let i = 0; i < 8; i++) {
      const r = await POST('/privhub/api/invite/create?project=' + encodeURIComponent(PROJECT) + '&expiresHours=1', { token: admin })
      if (r.json && r.json.ok) codes.push(r.json.code)
    }
    ok(codes.length >= 6, `应能生成多份邀请（实际 ${codes.length}）`)
    const uniq = new Set(codes)
    ok(uniq.size === codes.length, `邀请码不得重复（${codes.length} 次生成得到 ${uniq.size} 个唯一值）`)

    const all = codes.join('')
    const freq = {}
    for (const ch of all) freq[ch] = (freq[ch] || 0) + 1
    const top = Math.max(...Object.values(freq))
    // 字符集 31 个，若随机源合格，单字符占比不应畸高（阈值宽松，只拦「几乎只用少数字符」的实现）
    ok(top / all.length < 0.35, `字符分布不应过度集中（最高频字符占 ${(top / all.length * 100).toFixed(0)}%）`)

    for (const c of codes) await DEL('/privhub/api/invite?code=' + encodeURIComponent(c), { token: admin }).catch(() => null)
  })

  /* ---- S8：邀请查询限流 ---- */
  s.test('S8 邀请码探测触发限流（429）', async () => {
    let got429 = false
    for (let i = 0; i < 40; i++) {
      const r = await GET('/privhub/api/invite/info?code=' + 'zzzzzzzz' + i)
      if (r.status === 429) { got429 = true; break }
    }
    ok(got429, '连续探测应触发 429 限流')
  })

  /* ---- S6：Office AI Key 的项目白名单与 ACL ---- */
  s.test('S6 Office AI Key 受项目白名单约束', async () => {
    const all = await GET('/privhub/api/projects', { token: admin })
    const other = (all.json?.projects || []).find((p) => p !== PROJECT)
    if (!other) { ok(true, '（无第二个项目，跳过）'); return }

    // 建一个只授权 PROJECT 的 Key
    const mk = await POST('/privhub/api/ai/office/keys', {
      token: admin,
      body: { label: PFX + 'key', projects: [PROJECT] },
    })
    ok(mk.json && mk.json.ok, '创建 Key 失败：' + mk.text.slice(0, 120))
    const key = mk.json.key

    // 访问被授权项目之外 → 必须 403
    const denied = await GET(
      `/privhub/api/ai/office/read?project=${encodeURIComponent(other)}&path=x.docx`,
      { headers: { 'x-office-key': key } },
    )
    eq(denied.status, 403, `越权项目应 403（实际 ${denied.status}）`)

    // 清理
    await DEL('/privhub/api/ai/office/keys', { token: admin, body: { key } })
  })

  s.test('S6 无 Key 访问 Office AI 接口返回 401', async () => {
    const r = await GET('/privhub/api/ai/office/read?project=' + encodeURIComponent(PROJECT) + '&path=x.docx')
    eq(r.status, 401, '无 Key 应 401')
  })

  /* ---- S11：注册开关 ---- */
  s.test('S11 注册受 allowSelfRegister 开关控制', async () => {
    const before = await GET('/privhub/api/settings', { token: admin })
    const orig = before.json?.settings?.allowSelfRegister
    const rand = Math.random().toString(36).slice(2, 8)
    const uname = PFX + rand
    // 实名制：注册必须带姓名，且姓名是全局唯一的个人空间目录名
    const pdir = 'S11测试' + rand

    // 审核指出：复原必须放在 finally。否则任一断言失败，目标环境的
    // allowSelfRegister 会永久停在 false（真实服务器上等于悄悄关掉注册）。
    try {
      await POST('/privhub/api/settings', { token: admin, body: { allowSelfRegister: false } })
      const r1 = await POST('/privhub/api/register', { body: { username: uname, password: 'test123456', displayName: pdir } })
      eq(r1.status, 403, '关闭注册后应 403，实际 ' + r1.status)

      await POST('/privhub/api/settings', { token: admin, body: { allowSelfRegister: true } })

      // 实名制前提：不填姓名必须被拒（而不是回退成用户名）
      const r1b = await POST('/privhub/api/register', { body: { username: uname + 'n', password: 'test123456' } })
      eq(r1b.status, 400, '未填真实姓名应 400，实际 ' + r1b.status)
      ok(!r1b.json?.ok, '未填姓名不得注册成功')

      const r2 = await POST('/privhub/api/register', { body: { username: uname, password: 'test123456', displayName: pdir } })
      ok(r2.json && r2.json.ok, '打开注册后应可注册：' + r2.text.slice(0, 120))
    } finally {
      await POST('/privhub/api/settings', {
        token: admin,
        body: { allowSelfRegister: typeof orig === 'boolean' ? orig : false },
      }).catch(() => null)
      // 清理测试账号，避免永久污染 users.json
      await POST('/privhub/api/admin/user-delete', { token: admin, body: { username: uname } }).catch(() => null)
      cleanupPersonalDir(pdir)
    }
  })

  /* ---- S9：彻底删除的权限校验 ---- */
  s.test('S9 非删除者不能彻底删除（归属校验）', async () => {
    const name = PFX + 'del.txt'
    await uploadFile(admin, PROJECT, '', name, 'x')
    await POST('/privhub/api/delete', { token: admin, body: { project: PROJECT, path: name } })
    const hit = await waitTrashEntry(admin, name)
    ok(hit, '回收站应存在该条目')
    // 注：这条只验证归属校验（修复前即通过），真正的 S9 判别力见下一条。
    const r = await POST('/privhub/api/trash-purge', { token: user1, body: { id: hit.id } })
    eq(r.status, 403, `非删除者彻底删除应 403（实际 ${r.status}）`)
    await POST('/privhub/api/trash-purge', { token: admin, body: { id: hit.id } })
  })

  s.test('S9 已失去项目权限的删除者不能彻底删除（真实判别条件）', async () => {
    // 审核指出：只用「非删除者」验证 403 是无判别力的——修复前的归属校验
    // 已经能拒绝。S9 的真实缺陷是【缺少 canAccess + 文件级 ACL】，
    // 只有在「本人删除、但之后失去该项目权限」时才暴露。
    const uname = PFX + 'u' + Math.random().toString(36).slice(2, 7)
    const name = PFX + 'revoke.txt'
    // 实名制：姓名全局唯一，且同时是个人空间目录名
    const pdir9 = 'S9测试' + uname.slice(PFX.length)
    let created = false

    // 1) 建一个普通用户。
    //    注：admin 域只有「列表/更新/删除/重置密码」，没有创建用户的接口
    //    （建号走自助注册或邀请码），因此这里临时开启注册来创建测试账号。
    const before = await GET('/privhub/api/settings', { token: admin })
    const origReg = before.json?.settings?.allowSelfRegister
    try {
      await POST('/privhub/api/settings', { token: admin, body: { allowSelfRegister: true } })
      const mk = await POST('/privhub/api/register', { body: { username: uname, password: 'test123456', displayName: pdir9 } })
      ok(mk.json && mk.json.ok, '创建测试用户：' + mk.text.slice(0, 120))
      created = !!(mk.json && mk.json.ok)

      // 该用户默认仅「公共」；若 PROJECT 不是公共则显式授予
      if (created && PROJECT !== '公共') {
        await POST('/privhub/api/admin/user-update', { token: admin, body: { username: uname, projects: [PROJECT] } })
      }
    } finally {
      await POST('/privhub/api/settings', {
        token: admin,
        body: { allowSelfRegister: typeof origReg === 'boolean' ? origReg : false },
      }).catch(() => null)
      cleanupPersonalDir(pdir9)
    }
    if (!created) {
      ok(false, '未能创建测试用户，S9 判别用例无法执行')
      return
    }

    try {
      const tok = await loginOk(uname, 'test123456')

      // 2) 该用户上传并删除一个文件（成为 deletedBy）
      const up = await uploadFile(tok, PROJECT, '', name, 'x')
      ok(up.json && up.json.ok, '测试用户上传应成功')
      const del = await POST('/privhub/api/delete', { token: tok, body: { project: PROJECT, path: name } })
      ok(del.json && del.json.ok, '测试用户删除应成功')
      const hit = await waitTrashEntry(admin, name)
      ok(hit, '回收站应存在该条目')

      // 3) 管理员收回其项目权限
      const upd = await POST('/privhub/api/admin/user-update', {
        token: admin,
        body: { username: uname, projects: [] },
      })
      ok(upd.json && upd.json.ok, '收回项目权限应成功：' + upd.text.slice(0, 120))

      // 4) 关键断言：该用户是删除者，但已无项目权限 → 必须 403
      //    修复前（只有归属校验）这里会放行 → 不可逆的物理删除
      const r = await POST('/privhub/api/trash-purge', { token: tok, body: { id: hit.id } })
      eq(r.status, 403, `已失去项目权限的删除者彻底删除应 403（实际 ${r.status}）—— 放行即造成不可逆数据丢失`)

      // 5) 条目仍在（未被物理删除）
      const t2 = await GET('/privhub/api/trash-list', { token: admin })
      ok((t2.json?.trash || []).some((x) => x.id === hit.id), '条目未被误删')
    } finally {
      // 清理：即便断言失败也要尝试删除测试用户与条目
      const t = await GET('/privhub/api/trash-list', { token: admin }).catch(() => null)
      const h = (t?.json?.trash || []).find((x) => x.name === name)
      if (h) await POST('/privhub/api/trash-purge', { token: admin, body: { id: h.id } }).catch(() => null)
      await POST('/privhub/api/admin/user-delete', { token: admin, body: { username: uname } }).catch(() => null)
    }
  })

  return s
}

/** 轮询回收站直到出现指定名称的条目。 */
async function waitTrashEntry(token, name, tries = 20) {
  for (let i = 0; i < tries; i++) {
    const t = await GET('/privhub/api/trash-list', { token })
    const hit = (t.json?.trash || []).find((x) => x.name === name)
    if (hit) return hit
    await new Promise((r) => setTimeout(r, 200))
  }
  return null
}
