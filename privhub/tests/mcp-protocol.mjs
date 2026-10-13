/**
 * MCP 转接器协议回归（①地基）
 *
 * 被测对象：`mcp/privhub-mcp.mjs` —— 宿主机智能体管家的 MCP stdio 转接器。
 *
 * 本套件**自带一个假 PrivHub**（极小的 node:http 服务，监听 3197），不依赖 run-all
 * 拉起的那个实例，所以它能作为"静态批"独立跑，且不会碰到任何真实数据。
 *
 * 钉住的契约：
 *   · initialize / ping / tools/list 的响应形状（客户端据此判断"这是个能用的 MCP 服务"）；
 *   · tools/list 的每个工具都有 name/description/inputSchema（缺了客户端会报无效工具）；
 *   · 通知（无 id）**不回响应**——回了会被客户端当成协议错误；
 *   · tools/call 真的把请求转成 HTTP：health 不带密钥、butler_status 带 X-Agent-Key；
 *   · 未配置钥匙时，需要鉴权的工具**明确报错**而不是静默失败；
 *   · 未知工具 → isError；未知方法 → JSON-RPC error -32601。
 *
 *   node tests/mcp-protocol.mjs
 *
 * @module tests/mcp-protocol
 */

import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createSuite, ok, eq, includes, report } from './lib.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const SHIM = join(ROOT, 'mcp', 'privhub-mcp.mjs')
const PORT = 3197
const BASE = 'http://127.0.0.1:' + PORT

/* ---------------- 假 PrivHub ---------------- */

const seen = []
const server = createServer((req, res) => {
  seen.push({ url: req.url, key: req.headers['x-agent-key'] || null })
  const send = (obj, code = 200) => {
    const b = JSON.stringify(obj)
    res.writeHead(code, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(b) })
    res.end(b)
  }
  if (req.url === '/privhub/api/health') return send({ ok: true, service: 'privhub', version: 'test', uptimeSeconds: 3 })
  if (req.url === '/privhub/api/agent/v1/butler/status') return send({ ok: true, lane: 'butler', capabilities: { files: 'write', users: 'none' } })
  if (req.url === '/privhub/api/agent/v1/me') return send({ ok: true, user: { username: 'admin', role: 'admin' } })
  send({ ok: false, error: 'not found' }, 404)
})
await new Promise((r) => server.listen(PORT, '127.0.0.1', r))

/* ---------------- 转接器进程助手 ---------------- */

/** 起一个转接器子进程，提供 send/next/kill。 */
function spawnShim(extraEnv = {}) {
  const p = spawn(process.execPath, [SHIM], {
    env: { ...process.env, PRIVHUB_URL: BASE, ...extraEnv },
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  const rl = createInterface({ input: p.stdout })
  const queue = []
  const waiters = []
  rl.on('line', (line) => {
    const s = line.trim()
    if (s === '') return
    let m
    try { m = JSON.parse(s) } catch { return }
    if (waiters.length) waiters.shift()(m)
    else queue.push(m)
  })
  return {
    send: (m) => p.stdin.write(JSON.stringify(m) + '\n'),
    next: (timeoutMs = 6000) => new Promise((res, rej) => {
      if (queue.length) return res(queue.shift())
      const t = setTimeout(() => rej(new Error('等待 MCP 响应超时（' + timeoutMs + 'ms）')), timeoutMs)
      waiters.push((m) => { clearTimeout(t); res(m) })
    }),
    kill: () => { try { p.kill() } catch { /* 忽略 */ } },
  }
}

const withKey = spawnShim({ PRIVHUB_BUTLER_KEY: 'pha_testkey_0123456789' })
const noKey = spawnShim({ PRIVHUB_BUTLER_KEY: '' })

const s = createSuite('MCP 转接器协议（mcp-protocol）')

s.test('initialize：给出协议版本与服务器信息', async () => {
  withKey.send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '0' } } })
  const r = await withKey.next()
  eq(r.id, 1, '响应 id 应回显')
  ok(r.result && typeof r.result.protocolVersion === 'string' && r.result.protocolVersion.length > 0, '应返回 protocolVersion')
  ok(r.result.capabilities && r.result.capabilities.tools, '应声明 tools 能力')
  eq(r.result.serverInfo?.name, 'privhub-mcp', 'serverInfo.name 应为 privhub-mcp')
})

s.test('通知（无 id）不回响应，紧随的 ping 才对上号', async () => {
  withKey.send({ jsonrpc: '2.0', method: 'notifications/initialized' })
  withKey.send({ jsonrpc: '2.0', id: 2, method: 'ping' })
  const r = await withKey.next()
  eq(r.id, 2, '通知书不应产生响应；拿到的第一条应是 ping 的响应')
  ok(r.result && typeof r.result === 'object', 'ping 应返回空对象结果')
})

s.test('tools/list：工具齐全且每个都有 name/description/inputSchema', async () => {
  withKey.send({ jsonrpc: '2.0', id: 3, method: 'tools/list' })
  const r = await withKey.next()
  const tools = r.result?.tools
  ok(Array.isArray(tools) && tools.length >= 3, '工具清单应至少 3 个（实际 ' + (tools ? tools.length : 'null') + '）')
  const names = tools.map((t) => t.name)
  for (const n of ['privhub_health', 'privhub_butler_status', 'privhub_me']) {
    ok(names.includes(n), '工具清单应含 ' + n)
  }
  ok(tools.every((t) => t.name && t.description && t.inputSchema && t.inputSchema.type === 'object'),
    '每个工具都必须有 name/description/object 型 inputSchema')
})

s.test('tools/call health：不带密钥也能通，且请求真的到了后端', async () => {
  seen.length = 0
  withKey.send({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'privhub_health', arguments: {} } })
  const r = await withKey.next()
  ok(r.result && Array.isArray(r.result.content), 'tools/call 应返回 content 数组')
  includes(r.result.content[0].text, '"service"', '返回文本应含后端 JSON')
  eq(r.result.isError, false, '健康检查成功不应标记 isError')
  const hit = seen.find((x) => x.url === '/privhub/api/health')
  ok(hit, '后端应收到 /privhub/api/health 请求')
  eq(hit.key, null, 'health 不应携带 X-Agent-Key')
})

s.test('tools/call butler_status：携带 X-Agent-Key 转成 HTTP', async () => {
  seen.length = 0
  withKey.send({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'privhub_butler_status', arguments: {} } })
  const r = await withKey.next()
  includes(r.result.content[0].text, '"lane"', '返回应含后端 butler 状态')
  eq(r.result.isError, false, '后端 200 且 ok:true 时不应标记 isError')
  const hit = seen.find((x) => x.url === '/privhub/api/agent/v1/butler/status')
  ok(hit, '后端应收到管家自检请求')
  eq(hit.key, 'pha_testkey_0123456789', '管家请求必须带 X-Agent-Key')
})

s.test('未配置钥匙：需要鉴权的工具明确报错，而不是静默失败', async () => {
  noKey.send({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'privhub_butler_status', arguments: {} } })
  const r = await noKey.next()
  eq(r.result.isError, true, '缺钥匙应标记 isError')
  includes(r.result.content[0].text, '未配置管家钥匙', '应给出"未配置钥匙"的中文提示')
})

s.test('未知工具 → isError；未知方法 → JSON-RPC -32601', async () => {
  withKey.send({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'privhub_nope', arguments: {} } })
  const r1 = await withKey.next()
  eq(r1.result?.isError, true, '未知工具应标记 isError')

  withKey.send({ jsonrpc: '2.0', id: 8, method: 'no/such/method' })
  const r2 = await withKey.next()
  eq(r2.error?.code, -32601, '未知方法应返回 -32601')
})

const results = await s.run()
withKey.kill()
noKey.kill()
await new Promise((r) => server.close(r))
const pass = report([{ suite: s.name, results }])
process.exit(pass ? 0 : 1)
