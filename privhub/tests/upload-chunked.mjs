/**
 * 分片上传 + 断点续传 · 端到端（issue #1 中期项 B6）—— HTTP 回归。
 *
 * 验收的是「大视频传到一半断了，不用从头再来」这条用户价值：
 *   1. init 建会话；同一文件再次 init 拿回同一个 uploadId 与已收分片（续传）。
 *   2. 分片可乱序、可重复上传；缺片时 complete 明确报还缺哪几片。
 *   3. complete 合并后的文件内容必须与原始字节**逐字节一致**（落盘仍是加密流）。
 *   4. 会话归属：别人的 uploadId 不能续传/合并（否则等于越权写文件）。
 *   5. 上限仍与设置同源（init 阶段就拒绝，不浪费一个字节的流量）。
 *   6. 收尾 abort 清会话，样本删除、回收站清空。
 *
 * 端口纪律：只打 run-all 的隔离实例（3190）。样本前缀 `_uc_`。
 *
 * @module tests/upload-chunked
 */

import {
  createSuite, ok, eq, includes, loginOk, safeDelete, purgeTrashOfProject, GET, POST,
} from './lib.mjs'

const PROJECT = process.env.PRIVHUB_TEST_PROJECT || '公共'
const PFX = '_uc_'
const RAND = Date.now().toString(36).slice(-6)
const MiB = 1024 * 1024

/* 服务端固定 8MB 分片：9MB = 8MB + 1MB，正好两片，够验证乱序/续传。 */
const BIG = PFX + 'big_' + RAND + '.bin'
const BIG_SIZE = 9 * MiB
const SMALL = PFX + 'small_' + RAND + '.bin'
const EMPTY = PFX + 'empty_' + RAND + '.bin'
const ABORTED = PFX + 'aborted_' + RAND + '.bin'
const OTHER = PFX + 'other_' + RAND + '.bin'

/** 内容确定、可逐字节比对；不用全零，避免与查重/压缩的极端路径混淆。 */
function bytes(n, seed) {
  const buf = Buffer.alloc(n)
  for (let i = 0; i < n; i++) buf[i] = (i * 37 + seed) % 251
  return buf
}

const BIG_BUF = bytes(BIG_SIZE, 3)
const SMALL_BUF = bytes(MiB, 5)

function init(token, name, size, key, path = '') {
  return POST('/privhub/api/upload/init', { token, body: { project: PROJECT, path, name, size, key } })
}

function chunk(token, id, index, content, path = '') {
  const q = new URLSearchParams({ project: PROJECT, path, id, index: String(index) })
  return POST('/privhub/api/upload/chunk?' + q.toString(), { token, raw: content })
}

function complete(token, name, id, path = '') {
  return POST('/privhub/api/upload/complete', { token, body: { project: PROJECT, path, name, id } })
}

function abort(token, id) {
  return POST('/privhub/api/upload/abort', { token, body: { id } })
}

async function setLimit(token, mb) {
  const r = await POST('/privhub/api/settings', { token, body: { maxUploadMB: mb } })
  ok(r.json && r.json.ok, '保存上传上限失败：' + r.text.slice(0, 160))
}

async function download(token, name) {
  const q = new URLSearchParams({ project: PROJECT, path: name })
  return GET('/privhub/api/download?' + q.toString(), { token, timeoutMs: 60000 })
}

export function build() {
  const s = createSuite('分片上传 / 断点续传（issue #1 · B6）')
  let admin = ''
  let user1 = ''
  let originalLimit = null
  let bigId = ''

  s.test('准备：管理员登录、记下上限并临时改为 0（不限）', async () => {
    admin = await loginOk('admin', 'admin123')
    const r = await GET('/privhub/api/settings', { token: admin })
    ok(r.json && r.json.ok, '读取设置失败：' + r.text.slice(0, 160))
    originalLimit = r.json.settings.maxUploadMB
    await setLimit(admin, 0)
  })

  s.test('init 建会话：返回 uploadId / 分片大小 / 总分片数', async () => {
    const r = await init(admin, BIG, BIG_SIZE, 'k-big')
    eq(r.status, 200, 'init 应成功：' + r.text.slice(0, 160))
    ok(r.json && r.json.ok && r.json.uploadId, '应返回 uploadId')
    eq(r.json.resumed, false, '首次应是新会话')
    eq(r.json.total, 2, '9MB 按 8MB 分片应为 2 片')
    ok(r.json.chunkSize >= MiB, 'chunkSize 应是一个合理值，实际：' + r.json.chunkSize)
    bigId = r.json.uploadId
  })

  s.test('先传最后一片 → complete 明确报还缺第 0 片', async () => {
    const last = BIG_BUF.subarray(8 * MiB)
    const c = await chunk(admin, bigId, 1, last)
    ok(c.json && c.json.ok, '最后一片应上传成功：' + c.status + ' ' + c.text.slice(0, 160))
    eq(c.json.received, 1, '服务端应记录 1 片到账')
    const r = await complete(admin, BIG, bigId)
    eq(r.status, 409, '缺片时 complete 应回 409')
    ok(Array.isArray(r.json.missing) && r.json.missing.length === 1 && r.json.missing[0] === 0,
      'missing 应准确指出缺第 0 片，实际：' + JSON.stringify(r.json))
  })

  s.test('★ 再次 init 命中同一会话并带回已收分片（断点续传的关键）', async () => {
    const r = await init(admin, BIG, BIG_SIZE, 'k-big')
    eq(r.status, 200, '重复 init 应成功：' + r.text.slice(0, 160))
    eq(r.json.uploadId, bigId, '同一文件应命中同一个 uploadId，而不是新建会话')
    eq(r.json.resumed, true, '应标记为续传')
    ok(Array.isArray(r.json.uploaded) && r.json.uploaded.length === 1 && r.json.uploaded[0] === 1,
      'uploaded 应只含已到账的第 1 片，实际：' + JSON.stringify(r.json.uploaded))
  })

  s.test('分片可重复上传（幂等），补齐首片后 complete 成功', async () => {
    const dup = await chunk(admin, bigId, 1, BIG_BUF.subarray(8 * MiB))
    ok(dup.json && dup.json.ok, '重复上传同一片应成功（幂等）：' + dup.text.slice(0, 160))
    eq(dup.json.received, 1, '重复片不应重复计数')
    const c = await chunk(admin, bigId, 0, BIG_BUF.subarray(0, 8 * MiB))
    ok(c.json && c.json.ok, '首片应上传成功：' + c.text.slice(0, 160))
    const r = await complete(admin, BIG, bigId)
    eq(r.status, 200, '补齐后 complete 应成功：' + r.text.slice(0, 200))
    eq(r.json.size, BIG_SIZE, '合并后大小应等于声明大小')
  })

  s.test('★ 合并后的文件逐字节一致（仍走加密落盘/解密下载）', async () => {
    const r = await download(admin, BIG)
    eq(r.status, 200, '下载应成功：' + r.status)
    ok(r.buffer.length === BIG_SIZE, '下载大小应为 ' + BIG_SIZE + '，实际 ' + r.buffer.length)
    ok(r.buffer.equals(BIG_BUF), '合并内容应与原始字节完全一致')
  })

  s.test('会话在 complete 后被清理；同名再 init 直接 409', async () => {
    const r = await init(admin, BIG, BIG_SIZE, 'k-big')
    eq(r.status, 409, '同名文件已存在时 init 应回 409（不静默覆盖）')
    includes(r.text, '同名文件已存在', '应给出可读原因')
    const again = await complete(admin, BIG, bigId)
    eq(again.status, 404, 'complete 已完成的会话应 404（会话已清理）')
  })

  s.test('分片大小不符（声明 1MB 实发 0.5MB）→ 400，不建脏数据', async () => {
    const i = await init(admin, SMALL, MiB, 'k-small')
    eq(i.status, 200, 'init 应成功')
    const c = await chunk(admin, i.json.uploadId, 0, bytes(MiB / 2, 9))
    eq(c.status, 400, '大小不符的分片应被拒')
    const done = await complete(admin, SMALL, i.json.uploadId)
    eq(done.status, 409, '缺片时 complete 应回 409')
    await abort(admin, i.json.uploadId)
  })

  s.test('★ 跨用户不能用别人的 uploadId（越权写入防线）', async () => {
    user1 = await loginOk('user1', 'user123')
    const i = await init(user1, OTHER, MiB, 'k-other')
    eq(i.status, 200, 'user1 在公共项目 init 应成功：' + i.text.slice(0, 160))
    const id = i.json.uploadId
    const c = await chunk(admin, id, 0, bytes(MiB, 13))
    eq(c.status, 404, '管理员也不能续传他人会话（按用户隔离，回 404 不泄漏）')
    const done = await complete(admin, OTHER, id)
    eq(done.status, 404, '管理员也不能合并他人会话')
    const a = await abort(user1, id)
    ok(a.json && a.json.ok, '本人 abort 应成功')
  })

  s.test('abort 后 complete → 404；abort 本身幂等', async () => {
    const i = await init(admin, ABORTED, MiB, 'k-abort')
    const id = i.json.uploadId
    await abort(admin, id)
    const r = await complete(admin, ABORTED, id)
    eq(r.status, 404, '放弃后的会话不应还能合并')
    const again = await abort(admin, id)
    ok(again.json && again.json.ok, 'abort 不认识/已删除的会话也应返回 ok（幂等）')
  })

  s.test('上限在 init 阶段就生效（413，不浪费流量）', async () => {
    await setLimit(admin, 1)
    const r = await init(admin, PFX + 'over_' + RAND + '.bin', 2 * MiB, 'k-over')
    eq(r.status, 413, '超限应在 init 阶段回 413')
    includes(r.text, '文件过大', '错误文案应说明「文件过大」')
    await setLimit(admin, 0)
  })

  s.test('空文件（0 字节）也能走分片通道', async () => {
    const i = await init(admin, EMPTY, 0, 'k-empty')
    eq(i.status, 200, '0 字节文件 init 应成功')
    eq(i.json.total, 1, '0 字节文件只有 1 片')
    const c = await chunk(admin, i.json.uploadId, 0, Buffer.alloc(0))
    ok(c.json && c.json.ok, '空分片应上传成功：' + c.text.slice(0, 160))
    const r = await complete(admin, EMPTY, i.json.uploadId)
    eq(r.status, 200, '空文件 complete 应成功：' + r.text.slice(0, 160))
    const d = await download(admin, EMPTY)
    eq(d.status, 200, '空文件应可下载')
    eq(d.buffer.length, 0, '下载内容应为 0 字节')
  })

  s.test('清理：恢复原始上限，删除样本与回收站条目', async () => {
    if (admin && originalLimit !== null) await setLimit(admin, originalLimit)
    for (const name of [BIG, SMALL, EMPTY, ABORTED, OTHER, PFX + 'over_' + RAND + '.bin']) {
      await safeDelete(admin, PROJECT, name)
    }
    await purgeTrashOfProject(admin, PROJECT)
    const r = await GET('/privhub/api/settings', { token: admin })
    if (r.json && r.json.ok) eq(r.json.settings.maxUploadMB, originalLimit, '收尾应恢复原始上限')
  })

  return s
}
