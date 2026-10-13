#!/usr/bin/env node
/**
 * privhub-mcp —— PrivHub 宿主机智能体管家 · MCP 转接器（stdio）
 *
 * 它是什么：一段**零第三方依赖**的小程序，把 PrivHub 的管家能力翻译成
 * 「模型上下文协议（MCP）」，让宿主机上任何支持 MCP 的 AI 软件
 * （Claude Code / Trae / VSCode / opencode / Cherry Studio …）都能接管家的活。
 *
 * 为什么零依赖、为什么自己实现：项目定下"零外部依赖、低配宿主机、不开外网"，
 * 而 MCP 的本地（stdio）部分是**很小很稳定**的四条消息（initialize / tools/list /
 * tools/call / ping），自己实现两百来行、可测可控，反而不引入要长期维护的东西。
 *
 * ## 怎么接（任选其一）
 *
 * 1) 环境变量（最通用）：
 *      PRIVHUB_URL=http://127.0.0.1:3181
 *      PRIVHUB_BUTLER_KEY=pha_xxx          # 在 PrivHub「智能体接入」页一键签发
 * 2) 配置文件：在本文件同目录放 `privhub-mcp.json`
 *      { "url": "http://127.0.0.1:3181", "key": "pha_xxx" }
 *
 * 支持 MCP 的软件，在其配置里把它挂成一个 stdio server 即可：
 *      command: node
 *      args: ["<本文件的绝对路径>"]
 *      env:  { "PRIVHUB_URL": "http://127.0.0.1:3181", "PRIVHUB_BUTLER_KEY": "pha_xxx" }
 *
 * 不支持 MCP 的软件：让它读 `GET /privhub/api/agent/v1/schema` 的工具清单，
 * 按同样约定直接发 HTTP（这是"两条腿"里的第二条，见方案文档）。
 *
 * 注意：本进程的 **stdout 只用于 MCP 协议帧**（每行一个 JSON-RPC 消息）；
 * 一切诊断信息走 stderr，否则会污染协议、让客户端解析失败。
 *
 * @see docs/PrivHub-宿主机智能体管家-MCP-方案-2026-10-13.md
 */

import { createInterface } from 'node:readline'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const VERSION = '0.1.0'
/** 我们实现的 MCP 协议版本（回给客户端的）—— 稳定、且被主流客户端接受。 */
const PROTOCOL_VERSION = '2024-11-05'

/** 读配置：环境变量优先，其次同目录的 privhub-mcp.json，最后回退默认地址。 */
function loadConfig() {
  let fileCfg = {}
  const f = process.env.PRIVHUB_MCP_CONFIG || join(HERE, 'privhub-mcp.json')
  if (existsSync(f)) {
    try { fileCfg = JSON.parse(readFileSync(f, 'utf8')) || {} } catch { /* 配置坏则忽略，回退默认 */ }
  }
  const url = String(process.env.PRIVHUB_URL || fileCfg.url || 'http://127.0.0.1:3181').replace(/\/+$/, '')
  const key = String(process.env.PRIVHUB_BUTLER_KEY || process.env.PRIVHUB_AGENT_KEY || fileCfg.key || '')
  return { url, key }
}
const CFG = loadConfig()

/** 发一条 HTTP 请求给 PrivHub（成功与失败都返回结构化结果，不抛）。 */
async function httpJson(method, path, opts = {}) {
  const headers = { accept: 'application/json' }
  if (opts.auth) {
    if (!CFG.key) {
      return { status: 0, json: null, text: '未配置管家钥匙：请设置环境变量 PRIVHUB_BUTLER_KEY，或在本文件同目录写 privhub-mcp.json 的 "key" 字段。' }
    }
    headers['x-agent-key'] = CFG.key
  }
  let payload
  if (opts.body !== undefined) {
    headers['content-type'] = 'application/json'
    payload = JSON.stringify(opts.body)
  }
  try {
    const res = await fetch(CFG.url + path, { method, headers, body: payload })
    const text = await res.text()
    let json = null
    try { json = JSON.parse(text) } catch { /* 非 JSON（HTML/二进制） */ }
    return { status: res.status, json, text }
  } catch (e) {
    return { status: 0, json: null, text: '无法连接 PrivHub（' + CFG.url + '）：' + (e && e.message ? e.message : String(e)) }
  }
}

/**
 * 工具表。每个工具：给 AI 看的名字 / 说明 / 入参 schema，以及真正干活的 `call`。
 *
 * 命名统一 `privhub_` 前缀，避免与客户端自带的工具重名；后续批次（内容整理、
 * 内部管理、模型检索、服务运维）就在这里往后加，`/schema` 同步登记，两条腿保持一致。
 */
const TOOLS = [
  {
    name: 'privhub_health',
    description: 'PrivHub 服务健康检查：返回服务名、版本、已运行秒数。不需要密钥。',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    call: () => httpJson('GET', '/privhub/api/health', { auth: false }),
  },
  {
    name: 'privhub_butler_status',
    description: '管家车道自检：返回服务状态、当前管家钥匙信息，以及各项能力（内容整理/用户/项目/开关/密钥/审计/模型/运维）的开关等级（none=已被管理员关闭）。需要管家钥匙。',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    call: () => httpJson('GET', '/privhub/api/agent/v1/butler/status', { auth: true }),
  },
  {
    name: 'privhub_me',
    description: '查询当前钥匙绑定的身份（用户名/显示名/角色）与可见项目列表。需要管家钥匙。',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    call: () => httpJson('GET', '/privhub/api/agent/v1/me', { auth: true }),
  },
]

/** 把一次 HTTP 结果渲染成 MCP 的工具返回（失败置 isError，让模型看到并自行处理）。 */
function renderToolResult(r) {
  const okHttp = r.status >= 200 && r.status < 300
  const okBody = r.json === null ? okHttp : r.json.ok !== false
  const body = r.json !== null ? JSON.stringify(r.json, null, 2) : r.text
  return {
    content: [{ type: 'text', text: 'HTTP ' + r.status + '\n' + body }],
    isError: !(okHttp && okBody),
  }
}

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n')
}
function reply(id, result) { send({ jsonrpc: '2.0', id, result }) }
function replyError(id, code, message) { send({ jsonrpc: '2.0', id, error: { code, message } }) }

/** 处理一条 JSON-RPC 消息，返回是否要回（通知不回）。 */
async function handle(msg) {
  const id = msg.id
  const method = msg.method
  // 通知（无 id）一律不回响应
  if (id === undefined || id === null) {
    if (method === 'notifications/initialized' || method === 'notifications/cancelled') return
    return
  }
  if (method === 'initialize') {
    return reply(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: 'privhub-mcp', version: VERSION },
    })
  }
  if (method === 'ping') return reply(id, {})
  if (method === 'tools/list') {
    return reply(id, {
      tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
    })
  }
  if (method === 'tools/call') {
    const params = msg.params || {}
    const tool = TOOLS.find((t) => t.name === params.name)
    if (!tool) return reply(id, { content: [{ type: 'text', text: '未知工具：' + String(params.name) }], isError: true })
    try {
      const r = await tool.call(params.arguments || {})
      return reply(id, renderToolResult(r))
    } catch (e) {
      return reply(id, { content: [{ type: 'text', text: '工具执行异常：' + (e && e.message ? e.message : String(e)) }], isError: true })
    }
  }
  return replyError(id, -32601, 'method not found: ' + String(method))
}

function main() {
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity })
  rl.on('line', (line) => {
    const s = line.trim()
    if (s === '') return
    let msg
    try { msg = JSON.parse(s) } catch {
      // 无法解析的行：若是请求（带 id）才回错误；否则忽略
      return
    }
    Promise.resolve(handle(msg)).catch((e) => {
      if (msg && msg.id !== undefined && msg.id !== null) replyError(msg.id, -32603, 'internal error: ' + (e && e.message ? e.message : String(e)))
    })
  })
  rl.on('close', () => process.exit(0))
  process.stderr.write('[privhub-mcp] 就绪：url=' + CFG.url + ' key=' + (CFG.key ? '已配置' : '未配置') + '\n')
}

main()
