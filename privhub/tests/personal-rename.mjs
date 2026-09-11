/**
 * 个人空间改名回归（个人空间 v1 · 第 3 步）
 *
 * 被测语义：显示名与个人空间目录名 live-bound —— 改一个必须同时改另一个。
 *
 * 本套件的重点不是「改名成功」，而是【改名不能制造越权】：
 * 个人空间的数据不止在文件夹里，还散落在一批以目录名为键、只用 canAccess
 * 把关的存储中（versions / comments / meta / fulltext / 回收站 …），而
 * canAccess 对管理员是「任意合法名字都放行」。因此一旦改名后旧名被释放：
 *   - 管理员可以按旧名直接读到私人文件的历史版本正文；
 *   - 若之后有人注册成同名，新人会继承旧名的可见性，读到前任的私人内容。
 * 修复方式是「旧名退休」：旧名永久保留并维持归属，canAccess 继续拒绝所有人。
 *
 * 覆盖：
 *   A 改名成功：文件夹随之改名、文件不丢、不需要重新登录
 *   B 旧名退休：管理员按旧名读 list/versions/comments 全部 403（核心断言）
 *   C 旧名不可复用：新账号用旧名注册被拒
 *   D 冲突/无效：改成已存在的名字被拒且不产生改动；改成同名是空操作
 *   E 无个人空间的历史账号：只改显示名，不碰磁盘
 *   F 旧名语料被清理（RAG 语料清单里不再出现旧目录名）
 *
 *   node tests/personal-rename.mjs（需目标服务在跑）
 *
 * @module tests/personal-rename
 */

import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { createSuite, ok, eq, GET, POST, loginOk, uploadFile, listDir } from './lib.mjs'

const PFX = '_pr_'

/**
 * 惰性读取测试根。
 * 不能写成模块级 const：run-all.mjs 的 import 早于它设置 PRIVHUB_TEST_ROOT，
 * 模块加载时读到的是 undefined —— 那样所有磁盘断言都会静默跳过（空断言）。
 */
const dataFiles = () => (process.env.PRIVHUB_TEST_ROOT ? join(process.env.PRIVHUB_TEST_ROOT, 'data-files') : '')
const dirPath = (name) => (dataFiles() ? join(dataFiles(), name) : '')
const onDisk = (name) => !!dataFiles() && existsSync(dirPath(name))

/** 轮询直到 cond() 为真（默认最多 15s）。 */
async function waitFor(cond, timeoutMs = 15000, stepMs = 300) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await cond()) return true
    await new Promise((r) => setTimeout(r, stepMs))
  }
  return false
}

/** RAG 语料清单里是否出现某个 project。 */
async function corpusHasProject(token, project) {
  const r = await GET('/privhub/api/rag/corpus', { token })
  if (!r.json || !r.json.ok) return null // RAG 不可用
  return (r.json.docs || []).some((d) => d.project === project)
}

export function build() {
  const s = createSuite('个人空间改名（personal-rename）')
  let admin = ''

  const rand = Math.random().toString(36).slice(2, 8)
  const uname = PFX + rand
  const oldName = '改名测试' + rand
  const newName = '改名后' + rand
  let token = ''
  /**
   * 改名【之前】旧目录名是否已被 RAG 摄取。
   * 必须在改名之前探测——改名后语料会被清理，之后再查就永远找不到，
   * 「清理成功」会变成空断言（第一版测试就踩了这个坑）。
   */
  let ingestedBeforeRename = false

  /** 临时开启自助注册建号（finally 复原，避免把测试环境注册永久改掉）。 */
  async function withRegisterOn(fn) {
    const before = await GET('/privhub/api/settings', { token: admin })
    const orig = before.json?.settings?.allowSelfRegister
    try {
      await POST('/privhub/api/settings', { token: admin, body: { allowSelfRegister: true } })
      return await fn()
    } finally {
      await POST('/privhub/api/settings', {
        token: admin,
        body: { allowSelfRegister: typeof orig === 'boolean' ? orig : false },
      }).catch(() => null)
    }
  }

  s.test('预热：越过 svc-rag 的启动全量重建窗口', async () => {
    // svc-rag 启动后 8s 会跑一次全量 rebuild()，而 rebuild 会移除所有
    // 「不在 allProjects() 中的目录」的语料 —— 个人空间恰好属于这一类。
    // 若不等这次 rebuild 过去就断言「旧名语料已清理」，清理会被它顺带完成，
    // 于是【去掉清理逻辑测试仍然通过】（敏感性验证实测到了这个假保险）。
    // 本套件起跑必然晚于服务启动，故等待 10s 即可确保该窗口已过。
    await new Promise((r) => setTimeout(r, 10000))
    ok(true, '已越过启动全量重建窗口（8s）')
  })

  s.test('准备：登录管理员并建一个带个人空间的账号', async () => {
    admin = await loginOk('admin', 'admin123')
    const r = await withRegisterOn(() => POST('/privhub/api/register', {
      body: { username: uname, password: 'test123456', displayName: oldName },
    }))
    ok(r.json && r.json.ok, '注册失败：' + r.text.slice(0, 160))
    eq(r.json.personalDir, oldName, '注册后个人空间目录名应为真实姓名')
    token = await loginOk(uname, 'test123456')
    ok(onDisk(oldName), '个人空间目录已创建')
  })

  s.test('改名前置：个人空间内的文件与版本快照', async () => {
    const up = await uploadFile(token, oldName, '', PFX + 'secret.md', '# 私密内容-' + rand)
    ok(up.json && up.json.ok, '上传到个人空间失败：' + up.text.slice(0, 120))
    const snap = await POST('/privhub/api/versions/snapshot', {
      token, body: { project: oldName, path: PFX + 'secret.md' },
    })
    ok(snap.json && snap.json.ok, '创建版本快照失败：' + snap.text.slice(0, 120))
    // 基线：改名【之前】管理员读不到（说明后面的断言确实在测"改名后的状态"）
    const listBefore = await GET('/privhub/api/list?' + new URLSearchParams({ project: oldName }), { token: admin })
    eq(listBefore.status, 403, '改名前的基线：管理员也不该读到个人空间')

    // 前置条件：等语料被摄取，记录「改名之前确实存在旧名语料」
    ingestedBeforeRename = await waitFor(
      async () => (await corpusHasProject(admin, oldName)) === true, 15000,
    )
  })

  s.test('A 改名成功：文件夹随之改名，文件不丢', async () => {
    const r = await POST('/privhub/api/me/display-name', { token, body: { displayName: newName } })
    ok(r.json && r.json.ok, '改名失败：' + r.text.slice(0, 160))
    eq(r.json.renamedDir, true, '应报告文件夹已同步改名')
    eq(r.json.displayName, newName, '返回新显示名')
    eq(r.json.personalDir, newName, '返回新个人空间目录名')

    const me = await GET('/privhub/api/me', { token })
    eq(me.json?.user?.displayName, newName, '/api/me 显示名应已更新')
    eq(me.json?.user?.personalDir, newName, '/api/me 个人空间目录名应已更新')

    ok(!!dataFiles(), '测试根可用（否则下面的磁盘断言会被跳过）')
    ok(onDisk(newName), '新目录已存在')
    ok(!onDisk(oldName), '旧目录已不存在')
    // 文件内容必须完好（改名不是重建）
    const ents = await listDir(token, newName)
    ok(ents.some((e) => e.name === PFX + 'secret.md'), '改名后仍能列出原文件')
    const pv = await GET('/privhub/api/preview?' + new URLSearchParams({
      project: newName, path: PFX + 'secret.md',
    }), { token })
    ok(pv.json && pv.json.ok, '改名后仍能预览原文件：' + pv.text.slice(0, 120))
    // 项目列表里只应出现新名
    const pl = await GET('/privhub/api/projects', { token })
    const list = pl.json?.projects || []
    ok(list.includes(newName), '项目列表应含新名')
    ok(!list.includes(oldName), '项目列表不应再含旧名')
  })

  s.test('B 旧名退休：管理员按旧名读不到任何私人数据（核心越权防护）', async () => {
    const q = new URLSearchParams({ project: oldName })

    const list = await GET('/privhub/api/list?' + q, { token: admin })
    eq(list.status, 403, `管理员按旧名列目录应 403（实际 ${list.status}）`)

    // 版本历史里存的是文件【正文】——最关键的泄露点
    const ver = await GET('/privhub/api/versions?' + new URLSearchParams({
      project: oldName, path: PFX + 'secret.md', preview: '1',
    }), { token: admin })
    eq(ver.status, 403, `管理员按旧名读版本历史应 403（实际 ${ver.status}）`)
    ok(!String(ver.text).includes('私密内容'), '版本接口响应里不得出现私人正文')

    const cmt = await GET('/privhub/api/comments?' + new URLSearchParams({
      project: oldName, path: PFX + 'secret.md',
    }), { token: admin })
    eq(cmt.status, 403, `管理员按旧名读批注应 403（实际 ${cmt.status}）`)

    const pv = await GET('/privhub/api/preview?' + new URLSearchParams({
      project: oldName, path: PFX + 'secret.md',
    }), { token: admin })
    eq(pv.status, 403, `管理员按旧名预览应 403（实际 ${pv.status}）`)

    // 旧名不得出现在管理员的项目清单里
    const us = await GET('/privhub/api/admin/users', { token: admin })
    ok(!(us.json?.allProjects || []).includes(oldName), 'allProjects 不应含旧名')
  })

  s.test('C 旧名不可复用：新账号用旧名注册被拒', async () => {
    const r = await withRegisterOn(() => POST('/privhub/api/register', {
      body: { username: PFX + rand + 'x', password: 'test123456', displayName: oldName },
    }))
    eq(r.status, 409, `用退休旧名注册应 409（实际 ${r.status}）`)
    ok(/不可复用|曾被使用/.test(String(r.json?.error || '')), '错误文案应说明该姓名不可复用：' + r.json?.error)
  })

  s.test('D 冲突与空操作', async () => {
    // 撞已有项目名 → 拒绝，且不得改动任何状态
    const r1 = await POST('/privhub/api/me/display-name', { token, body: { displayName: '公共' } })
    ok(!r1.json?.ok, '改成已存在的文件夹名应被拒')
    const me1 = await GET('/privhub/api/me', { token })
    eq(me1.json?.user?.personalDir, newName, '被拒后个人空间目录名不得变化')
    ok(onDisk(newName), '被拒后新目录必须仍然存在')

    // 空名 → 400
    const r2 = await POST('/privhub/api/me/display-name', { token, body: { displayName: '   ' } })
    eq(r2.status, 400, '空姓名应 400')

    // 改成同名 → 成功且不动磁盘
    const r3 = await POST('/privhub/api/me/display-name', { token, body: { displayName: newName } })
    ok(r3.json?.ok, '改成同名应成功')
    eq(r3.json?.renamedDir, false, '同名时不应报告改目录')
  })

  s.test('E 无个人空间的历史账号：只改显示名，不碰磁盘', async () => {
    // user1 是内置历史账号，没有 personalDir；用 try/finally 保证改回原名
    const before = await GET('/privhub/api/admin/users', { token: admin })
    const u1 = (before.json?.users || []).find((x) => x.username === 'user1')
    ok(u1, '应存在内置账号 user1')
    eq(u1.hasPersonalSpace, false, 'user1 不应有个人空间（历史账号）')
    const orig = u1.displayName
    const tmp = '临时改名' + rand
    try {
      const r = await POST('/privhub/api/admin/user-update', { token: admin, body: { username: 'user1', displayName: tmp } })
      ok(r.json && r.json.ok, '管理员改名失败：' + r.text.slice(0, 140))
      eq(r.json.renamedDir, false, '无个人空间时不应报告改目录')
      const after = await GET('/privhub/api/admin/users', { token: admin })
      const u1b = (after.json?.users || []).find((x) => x.username === 'user1')
      eq(u1b.displayName, tmp, '显示名应已更新')
      eq(u1b.hasPersonalSpace, false, '仍不应凭空出现个人空间')
      ok(!onDisk(tmp), '不应为无个人空间的账号创建目录')
    } finally {
      await POST('/privhub/api/admin/user-update', { token: admin, body: { username: 'user1', displayName: orig } }).catch(() => null)
    }
    const fin = await GET('/privhub/api/admin/users', { token: admin })
    const u1c = (fin.json?.users || []).find((x) => x.username === 'user1')
    eq(u1c.displayName, orig, 'user1 显示名应已还原（避免污染其他用例）')
  })

  s.test('F 旧名语料不残留（RAG 语料清单不含旧目录名）', async () => {
    const probe = await corpusHasProject(admin, oldName)
    if (probe === null) { ok(true, '（跳过）RAG 语料清单不可用，未验证语料残留'); return }

    /* 注意断言口径的变化（批次B 之后）：
     * 批次B 已在【摄取口】拦下个人空间，因此新数据根本不会进语料库，
     * 「改名时清理旧名语料」这条路径对【升级前的存量数据】才有意义。
     * 于是本用例从「清理行为」改为「不残留」契约断言：
     * 无论历史存量如何、无论改名与否，个人空间目录名都不该出现在语料清单里
     * —— 该清单是管理员可读的，出现即泄露私人目录名与文件名。
     * 清理逻辑（removeProjectDocs）仍保留作为防御纵深，其对存量的作用由
     * integrity 静态契约（监听器与清理函数必须存在）守护。 */
    if (ingestedBeforeRename) console.log('       ℹ️  改名前的个人空间语料曾被摄取（升级存量的情形）')
    const gone = await waitFor(async () => (await corpusHasProject(admin, oldName)) === false, 15000)
    ok(gone, '语料清单里不得出现个人空间目录名（管理员可读该清单，出现即泄露）')

    // 新名同样不得出现
    const gone2 = await waitFor(async () => (await corpusHasProject(admin, newName)) === false, 10000)
    ok(gone2, '语料清单里不得出现改名后的个人空间目录名')
  })

  s.test('清理测试产物', async () => {
    // 系统按设计不删除个人空间，且旧名进入"退休表"，测试必须自行清理
    await POST('/privhub/api/admin/user-delete', { token: admin, body: { username: uname } }).catch(() => null)
    for (const d of [oldName, newName]) {
      try { rmSync(dirPath(d), { recursive: true, force: true }) } catch { /* 忽略 */ }
    }
  })

  return s
}
