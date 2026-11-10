/**
 * 上传上限 · 端到端（GitHub issue #1）—— HTTP 回归。
 *
 * 验收：
 *   1. 上限**与设置面板同源**：设置里写 1MB，上传 1.5MB 必须被拒（此前 2GB 硬编码，
 *      设置面板调到 1MB 也照样放行 —— 「设置形同虚设」）。
 *   2. 超限响应是**可读的 413 JSON**（`{ok:false, error:'文件过大…'}`），
 *      不是连接被掐断后的「网络错误」。这正是 issue 里「视频反复上传失败、看不到原因」的根因。
 *   3. 设置成 0 时**不限**（默认值），大于旧硬编码阈值的文件也能传成功。
 *   4. 收尾恢复原始设置并清掉样本（磁盘上不留痕）。
 *
 * 端口纪律：只打 run-all 的隔离实例（3190）。样本前缀 `_ul_`。
 *
 * @module tests/upload-limit
 */

import http from 'node:http'
import {
  BASE, createSuite, ok, eq, includes, loginOk, uploadFile, safeDelete, purgeTrashOfProject,
  GET, POST,
} from './lib.mjs'

const PROJECT = process.env.PRIVHUB_TEST_PROJECT || '公共'
const PFX = '_ul_'
const RAND = Date.now().toString(36).slice(-6)

const BIG = PFX + 'big_' + RAND + '.bin'      // 1.5MB：超过 1MB 上限、低于旧 2GB 硬编码
const SMALL = PFX + 'small_' + RAND + '.bin'  // 0.5MB：上限内
const FREE = PFX + 'free_' + RAND + '.bin'    // 3MB：用于验证 0 = 不限
const CHUNK = PFX + 'chunk_' + RAND + '.bin'  // 1.5MB：chunked（无 content-length）流式超限

/** 造一个内容确定、体积精确的二进制样本（避免全零带来的极端压缩/去重行为）。 */
function bytes(n, seed) {
  const buf = Buffer.alloc(n)
  for (let i = 0; i < n; i++) buf[i] = (i * 31 + seed) % 251
  return buf
}

/**
 * 以 chunked 传输（**不带 content-length**）上传，专测服务端的流式兜底分支。
 *
 * 为什么必须单独测：带 content-length 的超限在「读体之前」就被预检拒绝；
 * issue #1 的原始故障点（先 req.destroy 再写 413）恰恰在流式分支上 ——
 * 只测预检会漏掉这条最容易复发的路径。
 */
function chunkedUpload(token, project, name, content) {
  const u = new URL('/privhub/api/upload', BASE)
  u.searchParams.set('project', project)
  u.searchParams.set('name', name)
  return new Promise((resolve, reject) => {
    let settled = false
    let responded = false
    const finish = (fn, v) => { if (!settled) { settled = true; clearTimeout(timer); fn(v) } }
    const timer = setTimeout(() => finish(reject, new Error('chunked 上传超时（服务端未回 413）')), 30_000)
    const req = http.request({
      hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: 'POST',
      headers: { authorization: 'Bearer ' + token, 'content-type': 'application/octet-stream' },
    }, (res) => {
      responded = true
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        let json = null
        try { json = JSON.parse(text) } catch { /* 非 JSON */ }
        finish(resolve, { status: res.statusCode, text, json })
      })
    })
    /* 服务端 413 后主动断开时，客户端可能在写完剩余字节前收到 EPIPE；
     * 响应本身已经到达，不能把这个错误当成失败。 */
    req.on('error', (e) => { if (!settled && !responded) finish(reject, e) })
    let off = 0
    const CH = 64 * 1024
    const pump = () => {
      if (settled || responded) return
      if (off >= content.length) { req.end(); return }
      const okWrite = req.write(content.subarray(off, off + CH))
      off += CH
      if (okWrite) setImmediate(pump)
      else req.once('drain', pump)
    }
    pump()
  })
}

async function setLimit(token, mb) {
  const r = await POST('/privhub/api/settings', { token, body: { maxUploadMB: mb } })
  ok(r.json && r.json.ok, '保存上传上限失败：' + r.text.slice(0, 160))
  return r.json.settings.maxUploadMB
}

export function build() {
  const s = createSuite('上传上限（issue #1：设置同源 / 413 可读 / 0=不限）')
  let admin = ''
  let originalLimit = null

  s.test('准备：管理员登录并记下原始上传上限', async () => {
    admin = await loginOk('admin', 'admin123')
    const r = await GET('/privhub/api/settings', { token: admin })
    ok(r.json && r.json.ok, '读取设置失败：' + r.text.slice(0, 160))
    originalLimit = r.json.settings.maxUploadMB
    ok(typeof originalLimit === 'number', '设置里应有 maxUploadMB，实际：' + JSON.stringify(r.json.settings))
  })

  s.test('上限可保存为 1MB（0 也是合法值，不再是「必须 ≥1」）', async () => {
    eq(await setLimit(admin, 1), 1, '设置应持久化为 1')
    // 0 = 不限，必须能被保存（此前校验 >0，0 会被当成无效值静默忽略）
    eq(await setLimit(admin, 0), 0, '0（不限）应能被保存')
    eq(await setLimit(admin, 1), 1, '再设回 1MB')
  })

  s.test('★ 超限上传返回可读 413（不是断连后的「网络错误」）', async () => {
    const r = await uploadFile(admin, PROJECT, '', BIG, bytes(1536 * 1024, 7))
    eq(r.status, 413, '超限应回 413')
    ok(r.json && r.json.ok === false, '413 响应体应是 JSON {ok:false}，实际：' + r.text.slice(0, 160))
    includes(r.text, '文件过大', '错误文案应说明「文件过大」')
    includes(r.text, '系统设置', '错误文案应告诉用户去哪里改上限（可行动提示）')
    /* 关键：响应必须完整到达客户端；若服务端先 destroy 再写，客户端只会拿到空的/非 JSON。 */
    includes(r.json.error, '上限', '错误里应带出上限值')
  })

  s.test('★ 无 content-length（chunked）超限同样回可读 413', async () => {
    /* 走流式兜底分支：服务端读到超过上限才拒绝。旧实现此处 req.destroy()
     * 先断连接，客户端只能看到网络错误 —— 必须仍能收到 413 + 中文原因。 */
    const r = await chunkedUpload(admin, PROJECT, CHUNK, bytes(1536 * 1024, 17))
    eq(r.status, 413, 'chunked 超限应回 413')
    ok(r.json && r.json.ok === false, '413 响应体应是 JSON {ok:false}，实际：' + r.text.slice(0, 160))
    includes(r.text, '文件过大', '流式超限的错误文案应说明「文件过大」')
  })

  s.test('上限内的文件正常上传（证明 413 只影响超限项）', async () => {
    const r = await uploadFile(admin, PROJECT, '', SMALL, bytes(512 * 1024, 11))
    ok(r.json && r.json.ok, '0.5MB 应上传成功：' + r.status + ' ' + r.text.slice(0, 160))
  })

  s.test('★ 上限设为 0 后，3MB 文件上传成功（0 = 不限）', async () => {
    eq(await setLimit(admin, 0), 0, '上限应已设为 0')
    const r = await uploadFile(admin, PROJECT, '', FREE, bytes(3 * 1024 * 1024, 13))
    ok(r.json && r.json.ok, '0=不限时 3MB 应成功：' + r.status + ' ' + r.text.slice(0, 160))
  })

  s.test('清理：恢复原始上限，删除样本与回收站条目', async () => {
    if (admin && originalLimit !== null) await setLimit(admin, originalLimit)
    for (const name of [BIG, SMALL, FREE, CHUNK]) await safeDelete(admin, PROJECT, name)
    await purgeTrashOfProject(admin, PROJECT)
    // 复核：设置确已回到原值，后续套件不会被打乱
    const r = await GET('/privhub/api/settings', { token: admin })
    if (r.json && r.json.ok) eq(r.json.settings.maxUploadMB, originalLimit, '收尾应恢复原始上限')
  })

  return s
}
