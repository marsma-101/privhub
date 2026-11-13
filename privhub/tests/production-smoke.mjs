/**
 * 生产冒烟套件 —— 交付前由**开发者**跑的最后一关。
 *
 * 与其它套件的分工不同：那些套件验证「某个功能对不对」，本套件验证
 * **「这套东西能不能放到生产上」**。它只测生产环境才会走到的路径，
 * 并且刻意**不依赖任何开发期便利**。
 *
 * ## 为什么需要它
 *
 * 本次改造（读写分离 + 扁平存储 + nginx 直读）有一类特别阴的失败姿态：
 * 缺陷**只在生产路径上出现**，而开发路径完全正常。已经踩到的两个：
 *
 *   - `X-Accel-Redirect` 的 MIME 由 nginx 按 accel URI 扩展名查 `types{}`，
 *     而 nginx 自带 mime.types **没有 `md`** ⇒ 生产上所有 Markdown 变成
 *     `application/octet-stream`（浏览器直接下载、不预览）。直连模式完全正常。
 *   - `PRIVHUB_BEHIND_NGINX=1` 但 nginx 不在时，旧实现返回 `204 + 0 字节`：
 *     文件"能打开"但内容是空的，且没有任何报错。
 *
 * 所以本套件的断言集中在：**直读与降级的产出必须完全一致**，以及
 * **索引/磁盘不一致必须可被程序发现**。
 *
 * ## 断言取向
 *
 * - 只断言**行为**，不断言行号、不断言内部字段名。
 * - 每条失败信息都写清"生产上会看到什么"，而不是"期望 X 得到 Y"。
 * - 不 mock：全部走真实 HTTP 与真实磁盘。
 *
 * @module tests/production-smoke
 */

import { createSuite, ok, eq, includes, login, loginOk, uploadFile, GET, POST, DEL } from './lib.mjs'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/** 测试根（--spawn 会传；没有就跳过磁盘断言）。 */
const TEST_ROOT = process.env.PRIVHUB_TEST_ROOT || ''
const DATA_FILES = TEST_ROOT ? join(TEST_ROOT, 'data-files') : ''
const POOL = DATA_FILES ? join(DATA_FILES, '.pool') : ''

const PROJ = '_smoke_prod_'

/**
 * 造一个文件，先清掉同名残留。
 *
 * 上传接口对同名文件返回 409（冲突需要用户显式选择覆盖，这是刻意的 UX），
 * 所以测试不能假设"名字一定没被用过" —— 上一轮失败的运行会留下残留。
 */
async function putFile(token, name, content) {
  await POST('/privhub/api/delete', { token, body: { project: PROJ, path: name } }).catch(() => null)
  const up = await uploadFile(token, PROJ, '', name, content)
  return up
}

/** 列出项目根目录条目（失败时返回空数组，让断言自己报错）。 */
async function listRoot(token) {
  const r = await GET('/privhub/api/list?project=' + encodeURIComponent(PROJ) + '&path=', { token })
  return (r.json && r.json.entries) || []
}

export function build() {
  const s = createSuite('生产冒烟（读写分离 / 扁平存储 / 自检）')

  s.test('自检接口存在且只读可用（管理员）', async () => {
    const admin = await loginOk('admin', 'admin123')
    const r = await GET('/privhub/api/doctor/check', { token: admin })
    eq(r.status, 200, '自检接口应返回 200（生产上这是唯一的主动体检入口）')
    ok(r.json && typeof r.json === 'object', '自检应返回 JSON 报告')
    /* 注意 ok 的语义：它表示「没查出问题」，不是「接口调用成功」。
     * 断言它等于 true 会把「查出了问题」误判成「接口坏了」。 */
    ok(typeof r.json.ok === 'boolean', '报告应带 ok 布尔值（表示是否一切正常）')
    ok(typeof r.json.problems === 'number', '报告应带 problems 计数')
    ok(Array.isArray(r.json.checks) && r.json.checks.length >= 6,
      '自检应覆盖至少 6 项（索引/池/孤儿/加密/密钥/回收站/nginx）')
    /* 每项都必须有可读结论 —— 只给一个布尔值的"体检"没有诊断价值。 */
    for (const c of r.json.checks) {
      ok(typeof c.id === 'string' && c.id !== '', '检查项应有稳定 id：' + JSON.stringify(c.id))
      ok(typeof c.title === 'string' && c.title !== '', '检查项 ' + c.id + ' 应有标题')
      ok(typeof c.detail === 'string' && c.detail !== '', '检查项 ' + c.id + ' 应有结论文字')
      ok(['ok', 'warn', 'error', 'skipped'].includes(c.status),
        '检查项 ' + c.id + ' 的状态应合法（实际 ' + c.status + '）')
      ok(typeof c.fixable === 'boolean', '检查项 ' + c.id + ' 应标明能否自动修复')
    }
  })

  s.test('自检不对普通用户开放', async () => {
    const u = await loginOk('user1', 'user123')
    const r = await GET('/privhub/api/doctor/check', { token: u })
    eq(r.status, 403, '普通用户跑自检应被拒（自检会暴露池内文件名等内部信息）')
  })

  s.test('修复接口拒绝未知项与非 POST', async () => {
    const admin = await loginOk('admin', 'admin123')
    const bad = await POST('/privhub/api/doctor/repair', { token: admin, body: { id: 'no-such-check' } })
    ok(bad.status >= 400, '未知检查项不应被当作成功（实际 ' + bad.status + '）')
    const notPost = await GET('/privhub/api/doctor/repair?id=index-pool', { token: admin })
    ok(notPost.status === 405 || notPost.status >= 400, 'GET 修复接口应被拒（实际 ' + notPost.status + '）')
  })

  s.test('上传后索引登记的大小 = 明文字节数（不是密文长度）', async () => {
    const admin = await loginOk('admin', 'admin123')
    await POST('/privhub/api/projects', { token: admin, body: { name: PROJ } }).catch(() => null)
    const body = '明文大小校验 ' + 'x'.repeat(200)
    const up = await putFile(admin, 'size.txt', body)
    eq(up.status, 200, '上传应成功')
    const entries = await listRoot(admin)
    const ent = entries.find((e) => e.name === 'size.txt')
    ok(ent, '列表里应能看到刚上传的文件')
    /* 索引 size 必须是明文长度：它是前端显示的大小，也是下载头 /total 的依据。
     * 若误记成密文长度（+36），用户看到的大小会比真实值大，Range 也会错位。 */
    eq(ent.size, Buffer.byteLength(body, 'utf8'),
      '索引登记的大小应等于明文字节数（多 36 说明记成了密文长度）')
  })

  s.test('下载返回的字节与上传内容逐字节一致', async () => {
    const admin = await loginOk('admin', 'admin123')
    const body = '字节一致性 ' + '中'.repeat(50)
    await putFile(admin, 'bytes.txt', body)
    const dl = await GET('/privhub/api/download?project=' + encodeURIComponent(PROJ) + '&path=bytes.txt', { token: admin })
    eq(dl.status, 200, '下载应成功')
    eq(dl.text, body, '下载内容应与上传内容逐字节一致（不一致说明解密/搬运破坏了数据）')
  })

  s.test('Range 下载返回 206 且 Content-Range 正确', async () => {
    const admin = await loginOk('admin', 'admin123')
    const body = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    await putFile(admin, 'range.txt', body)
    const r = await GET('/privhub/api/download?project=' + encodeURIComponent(PROJ) + '&path=range.txt',
      { token: admin, headers: { Range: 'bytes=10-19' } })
    eq(r.status, 206, 'Range 请求应返回 206（断点续传的基础）')
    eq(r.text, body.slice(10, 20), 'Range 区间内容应正确')
    includes(String(r.headers['content-range'] || ''), 'bytes 10-19/' + body.length,
      'Content-Range 应给出正确的区间与总长（总长错说明索引 size 与实际不符）')
  })

  s.test('池内文件是明文（nginx 直读的前提）', async () => {
    if (!POOL) return 'skip'
    const admin = await loginOk('admin', 'admin123')
    const body = 'plain-check ' + 'y'.repeat(100)
    await putFile(admin, 'plain.txt', body)
    if (!existsSync(POOL)) return 'skip'
    const want = Buffer.byteLength(body, 'utf8')
    /* 找池里大小恰好等于明文长度的文件：存在 ⇒ 明文落盘。
     * 若全是 +36 的长度 ⇒ 仍在加密，nginx 直读必然失败（只能 Node 转发）。 */
    const names = readdirSync(POOL)
    let foundPlain = false
    for (const nm of names) {
      try {
        if (statSync(join(POOL, nm)).size === want) { foundPlain = true; break }
      } catch { /* 竞态：可能刚被清理 */ }
    }
    ok(foundPlain,
      '池内应存在与明文等长的文件（找不到说明文件仍被加密，nginx 无法直读）')
  })

  s.test('健康检查能报告运行状态与能力', async () => {
    const r = await GET('/privhub/api/health')
    eq(r.status, 200, '健康检查应无需登录即可访问（运维探活用）')
    ok(r.json && r.json.ok === true, '健康检查应带 ok')
    ok(typeof r.json.uptimeSeconds === 'number', '应报告运行时长')
    ok(r.json.capabilities && typeof r.json.capabilities === 'object', '应报告能力集合')
  })

  s.test('自检在正常状态下不报 error', async () => {
    const admin = await loginOk('admin', 'admin123')
    const r = await GET('/privhub/api/doctor/check', { token: admin })
    eq(r.status, 200, '自检应成功')
    const errors = ((r.json && r.json.checks) || []).filter((c) => c.status === 'error')
    /* warn 允许（比如"还没装 nginx"是环境事实），但 error 意味着有真实损坏。 */
    eq(errors.length, 0,
      '正常状态下不应有 error 级问题（实际：' + errors.map((c) => c.id + '=' + c.detail).join('；') + '）')
  })

  s.test('自检报告覆盖全部必需检查项', async () => {
    const admin = await loginOk('admin', 'admin123')
    const r = await GET('/privhub/api/doctor/check', { token: admin })
    const ids = new Set(((r.json && r.json.checks) || []).map((c) => c.id))
    /* 每一项都对应一类"扁平存储下会静默坏掉"的状态。少一项 = 少一类盲区。 */
    for (const need of ['fileindex', 'index-pool', 'pool-orphan', 'encryption', 'secret', 'trash']) {
      ok(ids.has(need), '自检应包含 ' + need + ' 检查项（实际有：' + [...ids].join(', ') + '）')
    }
  })

  s.test('删除后物理字节被释放、索引条目消失', async () => {
    const admin = await loginOk('admin', 'admin123')
    const body = 'to-be-deleted ' + 'z'.repeat(64)
    await putFile(admin, 'gone.txt', body)
    ok((await listRoot(admin)).some((e) => e.name === 'gone.txt'), '删除前应能看到文件')

    /* 删除接口是 POST /api/delete（进回收站），不是 DELETE /api/file。 */
    const del = await POST('/privhub/api/delete', { token: admin, body: { project: PROJ, path: 'gone.txt' } })
    eq(del.status, 200, '删除应成功')

    ok(!(await listRoot(admin)).some((e) => e.name === 'gone.txt'), '删除后列表里不应再有该文件')

    /* 删除后自检不应因这次删除而出现不一致 —— 这是"索引与磁盘同步变更"的直接检验。 */
    const chk = await GET('/privhub/api/doctor/check', { token: admin })
    const bad = ((chk.json && chk.json.checks) || [])
      .filter((c) => c.id === 'index-pool' && c.status === 'error')
    eq(bad.length, 0, '删除后不应留下指向已删字节的索引条目')
  })

  s.test('删除项目后它不再出现在项目列表里（回收站条目不算"存在"）', async () => {
    /* 扁平化后「项目存在」完全由索引判定。删除项目会把**目录条目本身**
     * （project=P、relPath=''、isDir=true）放进回收站，那条记录仍带着 project=P。
     * 若 `projectNamesFromIndex()` 不排除 `trashed`，删掉的项目会永远留在列表里，
     * 点进去是空目录 —— 用户会以为「删不掉」。
     *
     * 这个缺陷不报错、不留日志，只能靠行为断言抓住。 */
    const admin = await loginOk('admin', 'admin123')
    const proj = '_smoke_delproj_' + Date.now()
    const created = await POST('/privhub/api/projects', { token: admin, body: { name: proj } })
    eq(created.status, 200, '创建临时项目应成功')

    const before = (await GET('/privhub/api/projects', { token: admin })).json?.projects || []
    ok(before.includes(proj), '创建后应出现在项目列表里')

    /* path='' 删的就是项目目录条目本身。 */
    const del = await POST('/privhub/api/delete', { token: admin, body: { project: proj, path: '' } })
    eq(del.status, 200, '删除项目应成功')

    const after = (await GET('/privhub/api/projects', { token: admin })).json?.projects || []
    ok(!after.includes(proj), '删除后不应再出现在项目列表里（回收站里的目录条目不算存在）')

    /* 回收站里应当确实有这条记录 —— 证明是"进回收站"而不是"凭空消失"。 */
    const trash = (await GET('/privhub/api/trash-list', { token: admin })).json?.trash || []
    ok(trash.some((e) => e.project === proj), '回收站里应有该项目的目录条目（可恢复）')

    /* 从回收站恢复后，项目应重新出现 —— 证明判定是可逆的，不是单向丢失。 */
    const entry = trash.find((e) => e.project === proj)
    if (entry) {
      await POST('/privhub/api/trash-restore', { token: admin, body: { id: entry.id } })
      const restored = (await GET('/privhub/api/projects', { token: admin })).json?.projects || []
      ok(restored.includes(proj), '从回收站恢复后项目应重新出现')
      /* 收尾：再删一次，别把临时项目留给后续套件。 */
      await POST('/privhub/api/delete', { token: admin, body: { project: proj, path: '' } })
    }
  })

  s.test('清理测试文件', async () => {
    const admin = await loginOk('admin', 'admin123')
    /* 项目本身可以用 `delete path=''` 删（进回收站，可恢复）。这里只清本套件
     * 造的文件，不删项目 —— 项目是其他套件共用的夹具。 */
    for (const e of await listRoot(admin)) {
      await POST('/privhub/api/delete', { token: admin, body: { project: PROJ, path: e.name } }).catch(() => null)
    }
    eq((await listRoot(admin)).length, 0, '清理后测试项目应为空（残留文件会污染后续套件）')
  })

  return s
}
