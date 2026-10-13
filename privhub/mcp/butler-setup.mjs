#!/usr/bin/env node
/**
 * butler-setup —— 一步把宿主机接上 PrivHub 管家（①地基）
 *
 * 做三件事：
 *   ① 用管理员账号登录（只在本次进程内用密码换 token，**不落盘**）；
 *   ② 签发一把【管家钥匙】（type=butler，仅本机回环，可随时吊销）；
 *   ③ 把 { url, key } 写进 `privhub-mcp.json`（与 MCP 转接器同目录），并打印
 *      可直接粘贴到各类 AI 软件里的 MCP 配置。
 *
 * 用法：
 *   node mcp/butler-setup.mjs --password <管理员密码>
 *   node mcp/butler-setup.mjs --url http://127.0.0.1:3181 --user admin --password *** --name 宿主机管家
 *   node mcp/butler-setup.mjs --password *** --json          # 只输出机器可读结果（不打印说明）
 *   node mcp/butler-setup.mjs --password *** --out C:\path\to\privhub-mcp.json
 *
 * 安全提示：密码只用于换取一次 token，**不会被写出**；请勿把密码写进任何脚本。
 *
 * @see docs/PrivHub-宿主机智能体管家-MCP-方案-2026-10-13.md
 */

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const SHIM = join(HERE, 'privhub-mcp.mjs')

function parseArgs(argv) {
  const a = { url: process.env.PRIVHUB_URL || 'http://127.0.0.1:3181', user: 'admin', password: '', name: '', out: '', json: false }
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]; const v = argv[i + 1]
    if (k === '--url') { a.url = v; i++ }
    else if (k === '--user') { a.user = v; i++ }
    else if (k === '--password') { a.password = v; i++ }
    else if (k === '--name') { a.name = v; i++ }
    else if (k === '--out') { a.out = v; i++ }
    else if (k === '--json') a.json = true
  }
  a.url = String(a.url).replace(/\/+$/, '')
  return a
}

function fail(msg, json) {
  if (json) process.stdout.write(JSON.stringify({ ok: false, error: msg }) + '\n')
  else process.stderr.write('❌ ' + msg + '\n')
  process.exit(1)
}

const a = parseArgs(process.argv.slice(2))
if (!a.password) fail('缺少 --password（管理员密码）；用法：node mcp/butler-setup.mjs --password <密码>', a.json)

/* ① 登录换 token（密码仅在本进程内使用） */
let login
try {
  const r = await fetch(a.url + '/privhub/api/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: a.user, password: a.password }),
  })
  login = await r.json()
} catch (e) {
  fail('无法连接 PrivHub（' + a.url + '）：' + (e && e.message ? e.message : String(e)), a.json)
}
if (!login || !login.ok || !login.token) fail('登录失败：' + ((login && login.error) || '账号或密码不正确'), a.json)

/* ② 签发管家钥匙 */
let iss
try {
  const r = await fetch(a.url + '/privhub/api/agent/v1/butler/key', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + login.token },
    body: JSON.stringify({ name: a.name || '宿主机管家' }),
  })
  iss = await r.json()
} catch (e) {
  fail('签发管家钥匙请求失败：' + (e && e.message ? e.message : String(e)), a.json)
}
if (!iss || !iss.ok || !iss.key) fail('签发管家钥匙失败：' + ((iss && iss.error) || '未知错误'), a.json)

/* ③ 写配置 + 打印接线说明 */
const outPath = a.out ? resolve(a.out) : join(HERE, 'privhub-mcp.json')
const cfg = { url: a.url, key: iss.key }
writeFileSync(outPath, JSON.stringify(cfg, null, 2), 'utf8')

const genericConfig = JSON.stringify({
  mcpServers: {
    privhub: { command: 'node', args: [SHIM], env: { PRIVHUB_URL: a.url, PRIVHUB_BUTLER_KEY: iss.key } },
  },
}, null, 2)

if (a.json) {
  process.stdout.write(JSON.stringify({ ok: true, id: iss.id, name: iss.name, url: a.url, key: iss.key, configPath: outPath }) + '\n')
  process.exit(0)
}

console.log('✅ 管家钥匙已签发，配置已写入：' + outPath)
console.log('   钥匙（仅此一次完整显示，请妥善保存）：' + iss.key)
console.log('   到期：' + new Date(iss.expiresAt).toLocaleDateString() + '（自然月周期，可随时吊销）')
console.log('')
console.log('接下来 —— 把下面这段 JSON 贴进你所用 AI 软件的 MCP 配置里（各软件位置不同，格式大同小异）：')
console.log(genericConfig)
console.log('')
console.log('Claude Code 用户可以直接用一条命令接上：')
console.log('   claude mcp add privhub --env PRIVHUB_URL=' + a.url + ' --env PRIVHUB_BUTLER_KEY=' + iss.key + ' -- node "' + SHIM + '"')
console.log('')
console.log('接好后，让 AI 调一下 privhub_butler_status 自检：能返回各项开关等级，就说明管家车道通了。')
console.log('不支持 MCP 的软件：让它读 ' + a.url + '/privhub/api/agent/v1/schema 的工具清单，按同样约定直接发 HTTP。')
console.log('要收回权限：在 PrivHub 管理端的密钥列表里吊销它，或调 DELETE /privhub/api/agent/v1/butler/key。')
