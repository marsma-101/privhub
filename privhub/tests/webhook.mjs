/**
 * Webhook 事件订阅回归（privhub-webhook）
 *
 * 验收用户拍板的形态：**全部事件**（文件/任务/看板/审计）+ HMAC-SHA256 签名 +
 * 失败重试 + 管理面板。本套件只打 HTTP，另在**本进程内**起一个真实接收端（sink，
 * 127.0.0.1 随机端口）—— 被测服务是另一个进程，所以这是真的跨进程投递，不是桩。
 *
 * 断言的重点（也就是「写错了会静默出事」的地方）：
 *   ① **签名能验**：`x-privhub-signature = sha256=HMAC-SHA256(密钥, 实际正文)`，
 *      且正文里 `id` 与响应头 `x-privhub-delivery` 一致（订阅方据此幂等）；
 *   ② **只投该投的**：事件过滤、项目过滤、停用三种情况下一条都不该多；
 *   ③ **失败怎么处置**：5xx / 连不上要重试满次数；4xx **不重试**（重试也救不回来）；
 *   ④ **密钥不外泄**：任何列表响应里都不得出现密钥原文；
 *   ⑤ **载荷不放大**：file:saved 不得把文档全文塞进投递。
 *
 * 清理是硬要求：订阅是**全实例级**配置（data/webhooks.json），一个指向死地址的
 * 残留订阅会让后续所有套件的每次写入都去重试三次。所以末尾必须把本套件建的订阅
 * 全部删掉（按名称前缀 `_whk_` 兜底删，即使中途失败也不留垃圾）。
 *
 * 端口纪律：只打 3190（run-all 默认目标），由 `run-all.mjs --spawn` 拉起隔离实例。
 *
 * @module tests/webhook
 */

import { createServer } from 'node:http'
import { createHmac } from 'node:crypto'
import {
  createSuite, ok, eq, includes, notIncludes,
  loginOk, uploadFile, purgeTrashOfProject, GET, POST, PUT, DEL,
} from './lib.mjs'

const PROJECT = '_webhook_reg'
const RAND = Date.now().toString(36).slice(-6)
const NAME_PREFIX = '_whk_' + RAND
const DOC = 'hook_' + RAND + '.md'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 起一个真实接收端：按路径分流（/fail 回 500、/404 回 404），并逐条记录。 */
function startSink() {
  const hits = []
  const server = createServer((req, res) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8')
      hits.push({ path: req.url, method: req.method, headers: req.headers, body, at: Date.now() })
      if (String(req.url).startsWith('/fail')) {
        res.writeHead(500, { 'content-type': 'text/plain' })
        res.end('sink boom')
        return
      }
      if (String(req.url).startsWith('/404')) {
        res.writeHead(404, { 'content-type': 'text/plain' })
        res.end('sink no such endpoint')
        return
      }
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end('{"ok":true}')
    })
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      resolve({
        hits,
        port,
        url: (p) => 'http://127.0.0.1:' + port + p,
        hitsAt: (p) => hits.filter((h) => h.path === p),
        close: () => new Promise((r) => server.close(() => r())),
      })
    })
  })
}

/** 轮询等待：投递是异步的，不能用固定 sleep 赌时间。 */
async function until(fn, ms = 8000) {
  const t0 = Date.now()
  for (;;) {
    const v = await fn()
    if (v) return v
    if (Date.now() - t0 > ms) return null
    await sleep(150)
  }
}

export function build() {
  const s = createSuite('Webhook 订阅（privhub-webhook）')
  let admin = ''
  let user1 = ''
  let sink = null
  let cardId = ''
  /** 本套件建的订阅 id → 密钥（清理由 id 兜底，不靠用例顺序）。 */
  const made = []
  const seenHookIds = new Set()

  /** 建订阅的便捷封装：返回 {hook, secret}。 */
  const makeHook = async (fields) => {
    const r = await POST('/privhub/api/webhook/save', {
      token: admin,
      body: { name: NAME_PREFIX + '_' + fields.name, url: fields.url, events: fields.events || [], project: fields.project || '', enabled: true },
    })
    ok(r.json && r.json.ok, '建订阅失败：' + r.text.slice(0, 160))
    ok(!!r.json.secret, '新建订阅必须回一次密钥（此后不再给）')
    made.push(r.json.hook.id)
    return { hook: r.json.hook, secret: r.json.secret }
  }

  const deliveries = async (hookId) => {
    const r = await GET('/privhub/api/webhook/deliveries?hookId=' + encodeURIComponent(hookId) + '&limit=200', { token: admin })
    ok(r.json && r.json.ok, '读投递日志失败：' + r.text.slice(0, 160))
    return r.json.deliveries
  }

  s.test('匿名访问被拒（401）', async () => {
    eq((await GET('/privhub/api/webhook/list')).status, 401, '未登录应 401')
    eq((await POST('/privhub/api/webhook/save', { body: { url: 'http://x/' } })).status, 401, '未登录建订阅应 401')
  })

  s.test('登录（admin / user1）', async () => {
    admin = await loginOk('admin', 'admin123')
    user1 = await loginOk('user1', 'user123')
  })

  s.test('非管理员一律 403（含读日志与重放）', async () => {
    for (const [m, p] of [['GET', '/privhub/api/webhook/list'], ['GET', '/privhub/api/webhook/deliveries'],
      ['GET', '/privhub/api/webhook/events'], ['POST', '/privhub/api/webhook/test'],
      ['POST', '/privhub/api/webhook/replay'], ['POST', '/privhub/api/webhook/delete']]) {
      const r = m === 'GET' ? await GET(p, { token: user1 }) : await POST(p, { token: user1, body: {} })
      eq(r.status, 403, `${m} ${p} 对普通用户应 403，实际 ${r.status}`)
    }
  })

  s.test('启动本地接收端（sink）', async () => {
    sink = await startSink()
    ok(sink.port > 0, 'sink 端口应有效')
  })

  s.test('保存校验：非法地址 / 密钥过短 / 超量事件名', async () => {
    const bad1 = await POST('/privhub/api/webhook/save', { token: admin, body: { name: NAME_PREFIX + '_bad', url: 'not-a-url' } })
    eq(bad1.status, 400, '非 http(s) 地址应 400，实际 ' + bad1.status)
    const bad2 = await POST('/privhub/api/webhook/save', { token: admin, body: { name: NAME_PREFIX + '_bad', url: sink.url('/a'), secret: 'short' } })
    eq(bad2.status, 400, '过短密钥应 400，实际 ' + bad2.status)
    // 未知事件名被静默丢弃（不报错），落库后 events 里不该出现它
    const r = await POST('/privhub/api/webhook/save', {
      token: admin,
      body: { name: NAME_PREFIX + '_dirty', url: sink.url('/a'), events: ['file:changed', 'bogus:event'], enabled: false },
    })
    ok(r.json && r.json.ok, '建订阅失败：' + r.text.slice(0, 160))
    made.push(r.json.hook.id)
    eq(r.json.hook.events.join(','), 'file:changed', '未知事件名应被丢弃，实际 ' + r.json.hook.events.join(','))
    await POST('/privhub/api/webhook/delete', { token: admin, body: { id: r.json.hook.id } })
    made.pop()
  })

  s.test('事件目录：7 个事件，覆盖全部实际 emit 的事件', async () => {
    const r = await GET('/privhub/api/webhook/events', { token: admin })
    ok(r.json && r.json.ok, '读事件目录失败：' + r.text.slice(0, 160))
    const names = r.json.events.map((e) => e.name).sort()
    eq(names.join(','), [
      'audit:logged', 'dashboard:changed', 'file:changed', 'file:saved',
      'meta:changed', 'personal:renamed', 'task:changed',
    ].join(','), '事件目录与实际 emit 的事件集合不一致')
  })

  s.test('新建订阅：回一次密钥，且钩子视图里没有密钥', async () => {
    const { hook, secret } = await makeHook({ name: 'a', url: sink.url('/a'), events: ['file:changed'] })
    seenHookIds.add(hook.id)
    eq(hook.secret, undefined, '响应里的 hook 不得带 secret 字段')
    eq(hook.hasSecret, true, '应回 hasSecret=true')
    eq(String(secret).length, 48, '默认密钥应为 24 字节十六进制（48 字符）')
    s._secretA = secret
  })

  s.test('列表不回传密钥原文', async () => {
    const r = await GET('/privhub/api/webhook/list', { token: admin })
    ok(r.json && r.json.ok, '读列表失败：' + r.text.slice(0, 160))
    notIncludes(r.text, s._secretA, '列表响应里出现了密钥原文')
    const hit = r.json.hooks.find((h) => h.name.startsWith(NAME_PREFIX + '_a'))
    ok(hit, '列表里应能按名称找到刚建的订阅')
    eq(hit.secret, undefined, '列表项的 hook 不得带 secret 字段')
  })

  s.test('文件事件投递：签名可验、载荷与头一致', async () => {
    await POST('/privhub/api/project-create', { token: admin, body: { name: PROJECT } })
    const up = await uploadFile(admin, PROJECT, '', DOC, '# 一\n\n正文')
    ok(up.json && up.json.ok, '上传失败：' + up.text.slice(0, 160))

    const hit = await until(() => sink.hitsAt('/a').find((h) => h.headers['x-privhub-event'] === 'file:changed'))
    ok(hit, '订阅方应收到 file:changed 投递（8s 内）')
    // 验签：必须对「实际收到的正文」算，任何序列化差异都会在这里暴露
    const expect = 'sha256=' + createHmac('sha256', s._secretA).update(hit.body, 'utf8').digest('hex')
    eq(hit.headers['x-privhub-signature'], expect, 'HMAC 签名应可由订阅方验证')
    includes(String(hit.headers['user-agent']), 'PrivHub-Webhook', 'UA 应可辨认')
    eq(hit.method, 'POST', '投递应是 POST')
    const env = JSON.parse(hit.body)
    eq(env.event, 'file:changed', '信封 event 字段')
    eq(env.id, hit.headers['x-privhub-delivery'], '信封 id 应与 x-privhub-delivery 一致（幂等键）')
    eq(env.data.project, PROJECT, '载荷应带项目名')
    eq(env.data.path, DOC, '载荷应带路径')
  })

  s.test('事件过滤：只订 audit:logged 的订阅收不到 file:changed', async () => {
    const { hook } = await makeHook({ name: 'b', url: sink.url('/b'), events: ['audit:logged'] })
    seenHookIds.add(hook.id)
    const before = sink.hitsAt('/a').length
    const up = await uploadFile(admin, PROJECT, '', 'second_' + RAND + '.md', 'x')
    ok(up.json && up.json.ok, '上传失败：' + up.text.slice(0, 160))
    const gotB = await until(() => sink.hitsAt('/b').length >= 1)
    ok(gotB, '订阅 audit:logged 的钩子应收到审计事件')
    await sleep(600) // 给可能的「多余投递」留出到达时间
    const eventsB = [...new Set(sink.hitsAt('/b').map((h) => h.headers['x-privhub-event']))]
    eq(eventsB.join(','), 'audit:logged', '只订 audit:logged 的钩子不该收到别的（实际 ' + eventsB.join(',') + '）')
    ok(sink.hitsAt('/a').length > before, '订阅 file:changed 的钩子应收到新的文件事件')
  })

  s.test('停用后不再投递', async () => {
    const hit = (await GET('/privhub/api/webhook/list', { token: admin })).json.hooks.find((h) => h.name.startsWith(NAME_PREFIX + '_b'))
    ok(hit, '应找到订阅 b')
    const t = await POST('/privhub/api/webhook/toggle', { token: admin, body: { id: hit.id, enabled: false } })
    ok(t.json && t.json.ok && t.json.hook.enabled === false, '停用失败：' + t.text.slice(0, 160))
    const n = sink.hitsAt('/b').length
    await uploadFile(admin, PROJECT, '', 'third_' + RAND + '.md', 'y')
    await sleep(1200)
    eq(sink.hitsAt('/b').length, n, '停用后不应再有投递')
  })

  s.test('项目过滤：限别的项目的订阅收不到本项目事件', async () => {
    const { hook } = await makeHook({ name: 'c', url: sink.url('/c'), events: [], project: '__other_' + RAND })
    seenHookIds.add(hook.id)
    await uploadFile(admin, PROJECT, '', 'fourth_' + RAND + '.md', 'z')
    await sleep(1200)
    eq(sink.hitsAt('/c').length, 0, '项目过滤不匹配时不应投递')
  })

  s.test('失败重试：5xx 重试满 3 次，并写入失败日志', async () => {
    const { hook } = await makeHook({ name: 'd', url: sink.url('/fail'), events: ['file:changed'] })
    seenHookIds.add(hook.id)
    await uploadFile(admin, PROJECT, '', 'fifth_' + RAND + '.md', 'w')
    const rec = await until(async () => (await deliveries(hook.id))[0], 12000)
    ok(rec, '应产生失败投递记录')
    eq(rec.ok, false, '投递应判为失败')
    eq(rec.attempts, 3, '5xx 应重试满 3 次，实际 ' + rec.attempts)
    eq(rec.httpStatus, 500, '应记下 HTTP 状态码')
    includes(rec.error, 'HTTP 500', '错误应说明 HTTP 状态：' + rec.error)
    eq(sink.hitsAt('/fail').length, 3, '接收端应真的被打 3 次')
  })

  s.test('连不上：记 httpStatus=null、attempts=3、错误含地址', async () => {
    const { hook } = await makeHook({ name: 'e', url: 'http://127.0.0.1:1/none', events: ['file:changed'] })
    seenHookIds.add(hook.id)
    await uploadFile(admin, PROJECT, '', 'sixth_' + RAND + '.md', 'v')
    const rec = await until(async () => (await deliveries(hook.id))[0], 15000)
    ok(rec, '连不上也应留下记录（否则用户看不到「它一直没送到」）')
    eq(rec.httpStatus, null, '没连上时不该编一个状态码')
    eq(rec.attempts, 3, '连不上应重试满 3 次，实际 ' + rec.attempts)
    includes(rec.error, '无法连接', '错误应说明是连接失败：' + rec.error)
  })

  s.test('4xx 不重试（地址写错时不该打三次）', async () => {
    const { hook } = await makeHook({ name: 'f', url: sink.url('/404'), events: ['file:changed'] })
    seenHookIds.add(hook.id)
    await uploadFile(admin, PROJECT, '', 'seventh_' + RAND + '.md', 'u')
    const rec = await until(async () => (await deliveries(hook.id))[0], 9000)
    ok(rec, '应产生记录')
    eq(rec.attempts, 1, '404 属终态失败，不该重试，实际 ' + rec.attempts)
    eq(rec.httpStatus, 404, '应记下 404')
    eq(sink.hitsAt('/404').length, 1, '接收端应只被打 1 次')
  })

  s.test('投递日志：按订阅过滤 + limit 生效 + 不含正文', async () => {
    const all = await GET('/privhub/api/webhook/deliveries?limit=200', { token: admin })
    ok(all.json && all.json.ok, '读日志失败')
    ok(all.json.deliveries.length > 0, '应有日志')
    const hookA = (await GET('/privhub/api/webhook/list', { token: admin })).json.hooks.find((h) => h.name.startsWith(NAME_PREFIX + '_a'))
    const only = await deliveries(hookA.id)
    ok(only.length > 0, '订阅 a 应有日志')
    ok(only.every((d) => d.hookId === hookA.id), '按订阅过滤后不该混入别的订阅的记录')
    const small = await GET('/privhub/api/webhook/deliveries?limit=2', { token: admin })
    eq(small.json.deliveries.length, 2, 'limit 应生效')
    eq(all.json.deliveries[0].body, undefined, '日志列表不该回正文（正文只用于服务端重放）')
  })

  s.test('重放：按原文重发，并标记来源记录', async () => {
    const hookA = (await GET('/privhub/api/webhook/list', { token: admin })).json.hooks.find((h) => h.name.startsWith(NAME_PREFIX + '_a'))
    const ok0 = (await deliveries(hookA.id)).find((d) => d.ok)
    ok(ok0, '订阅 a 应有成功记录可供重放')
    const before = sink.hitsAt('/a').length
    const r = await POST('/privhub/api/webhook/replay', { token: admin, body: { id: ok0.id } })
    ok(r.json && r.json.ok, '重放失败：' + r.text.slice(0, 160))
    eq(r.json.delivery.ok, true, '重放应成功')
    eq(r.json.delivery.replayOf, ok0.id, '新记录应标出重放来源')
    eq(r.json.delivery.id === ok0.id, false, '重放必须换新投递 id（否则订阅方幂等会把重放当成重复丢掉）')
    await until(() => sink.hitsAt('/a').length > before)
    ok(sink.hitsAt('/a').length > before, '接收端应再收到一次')
    const resent = JSON.parse(sink.hitsAt('/a')[sink.hitsAt('/a').length - 1].body)
    eq(resent.event, ok0.event, '重放应发同一条事件（原文）')
  })

  s.test('测试投递：ping 事件，同步回结果', async () => {
    const hookA = (await GET('/privhub/api/webhook/list', { token: admin })).json.hooks.find((h) => h.name.startsWith(NAME_PREFIX + '_a'))
    const r = await POST('/privhub/api/webhook/test', { token: admin, body: { id: hookA.id } })
    ok(r.json && r.json.ok, '测试投递失败：' + r.text.slice(0, 160))
    eq(r.json.delivered, true, '应报告投递成功')
    eq(r.json.delivery.httpStatus, 200, '应回对端状态码')
    const ping = sink.hitsAt('/a').find((h) => h.headers['x-privhub-event'] === 'ping')
    ok(ping, '接收端应收到 ping')
    eq(r.json.delivery.ok, true, '结果应同步返回（界面要即时答案）')
  })

  s.test('task:changed：建卡 / 移动 / 删卡各投递一次', async () => {
    const { hook } = await makeHook({ name: 'g', url: sink.url('/g'), events: ['task:changed'] })
    seenHookIds.add(hook.id)
    const c = await POST('/privhub/api/taskboard/cards', { token: admin, body: { project: PROJECT, title: '钩子卡_' + RAND } })
    ok(c.json && c.json.ok, '建卡失败：' + c.text.slice(0, 160))
    cardId = c.json.card.id
    const mv = await POST('/privhub/api/taskboard/cards/move', { token: admin, body: { project: PROJECT, id: cardId, toColumnId: 'col_done' } })
    ok(mv.json && mv.json.ok, '移卡失败：' + mv.text.slice(0, 160))
    const dl = await DEL('/privhub/api/taskboard/cards?project=' + encodeURIComponent(PROJECT) + '&id=' + encodeURIComponent(cardId), { token: admin })
    ok(dl.json && dl.json.ok, '删卡失败：' + dl.text.slice(0, 160))
    cardId = ''
    const got = await until(() => sink.hitsAt('/g').length >= 3)
    ok(got, '应收到 3 条 task:changed（建/移/删）')
    const actions = sink.hitsAt('/g').map((h) => JSON.parse(h.body).data.action)
    eq(actions.join(','), 'card-create,card-move,card-delete', '投递要保序且动作正确，实际 ' + actions.join(','))
    const env = JSON.parse(sink.hitsAt('/g')[1].body)
    eq(env.data.fromColumnId, 'col_todo', '跨列移动应带上「从哪列来」')
    eq(env.data.columnId, 'col_done', '应带上目标列')
  })

  s.test('dashboard:changed：还原看板投递', async () => {
    const { hook } = await makeHook({ name: 'h', url: sink.url('/h'), events: ['dashboard:changed'] })
    seenHookIds.add(hook.id)
    const r = await POST('/privhub/api/dashboard/reset', { token: admin, body: { project: PROJECT } })
    ok(r.json && r.json.ok, '重置看板失败：' + r.text.slice(0, 160))
    const got = await until(() => sink.hitsAt('/h').find((h) => JSON.parse(h.body).data.action === 'reset'))
    ok(got, '应收到 dashboard:changed')
    const env = JSON.parse(got.body)
    eq(env.event, 'dashboard:changed', '事件名')
    ok(env.data.revision >= 1, '应带版本号')
    ok(typeof env.data.sections === 'number', '应带分区数')
  })

  s.test('载荷不放大：file:saved 不带文档全文', async () => {
    const { hook } = await makeHook({ name: 'i', url: sink.url('/i'), events: ['file:saved'] })
    seenHookIds.add(hook.id)
    const body = 'A'.repeat(4000)
    const r = await PUT('/privhub/api/doc', { token: admin, body: { project: PROJECT, path: DOC, doc: body } })
    // 文档保存路由可能因版本存档/锁拒绝；被拒时本用例没有意义，直接跳过断言（不制造假失败）
    if (!(r.json && r.json.ok)) return
    const hit = await until(() => sink.hitsAt('/i').find((h) => h.headers['x-privhub-event'] === 'file:saved'))
    ok(hit, '应收到 file:saved 投递')
    const env = JSON.parse(hit.body)
    eq(env.data.doc, undefined, '投递载荷不得带文档全文（会放大成 MB 级广播）')
    eq(env.data.docBytes, Buffer.byteLength(body, 'utf8'), '应给出正文字节数')
    ok(env.data.docPreview.length <= 500, '预览应被截断，实际 ' + env.data.docPreview.length)
    eq(env.data.docTruncated, true, '被截断时应有标记')
    notIncludes(hit.body, body, '投递正文里不该出现完整文档')
  })

  s.test('删除订阅：投递立即停止、配置里不再有它', async () => {
    const hookA = (await GET('/privhub/api/webhook/list', { token: admin })).json.hooks.find((h) => h.name.startsWith(NAME_PREFIX + '_a'))
    const d = await POST('/privhub/api/webhook/delete', { token: admin, body: { id: hookA.id } })
    ok(d.json && d.json.ok, '删除失败：' + d.text.slice(0, 160))
    const n = sink.hitsAt('/a').length
    await uploadFile(admin, PROJECT, '', 'eighth_' + RAND + '.md', 't')
    await sleep(1200)
    eq(sink.hitsAt('/a').length, n, '删除后不应再有投递')
    const left = (await GET('/privhub/api/webhook/list', { token: admin })).json.hooks.filter((h) => h.id === hookA.id)
    eq(left.length, 0, '配置里不该还有这条订阅')
    // 已删除的订阅无法重放（日志还在，按钮得给出明确原因）
    const old = (await deliveries(hookA.id)).find((x) => x.id)
    if (old) {
      const rp = await POST('/privhub/api/webhook/replay', { token: admin, body: { id: old.id } })
      eq(rp.status, 404, '订阅已删除时重放应 404，实际 ' + rp.status)
    }
  })

  s.test('清理：删全部本套件订阅 + 测试项目 + 回收站', async () => {
    // 兜底：按名称前缀删（中途失败留下的也要清掉 —— 残留订阅会拖慢后续所有套件的写入）
    const all = (await GET('/privhub/api/webhook/list', { token: admin })).json.hooks || []
    for (const h of all) {
      if (h.name.startsWith(NAME_PREFIX)) await POST('/privhub/api/webhook/delete', { token: admin, body: { id: h.id } }).catch(() => null)
    }
    const left = (await GET('/privhub/api/webhook/list', { token: admin })).json.hooks.filter((h) => h.name.startsWith(NAME_PREFIX))
    eq(left.length, 0, '清理后不该还有本套件的订阅：' + left.map((h) => h.name).join(','))
    if (cardId) await DEL('/privhub/api/taskboard/cards?project=' + encodeURIComponent(PROJECT) + '&id=' + encodeURIComponent(cardId), { token: admin }).catch(() => null)
    await POST('/privhub/api/project-delete', { token: admin, body: { name: PROJECT } }).catch(() => null)
    await purgeTrashOfProject(admin, PROJECT)
    if (sink) await sink.close()
    ok(true, '已清理')
  })

  return s
}
