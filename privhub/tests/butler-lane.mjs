/**
 * 宿主机智能体管家车道回归（①地基）
 *
 * 被测语义（方案 docs/PrivHub-宿主机智能体管家-MCP-方案-2026-10-13.md §3、§5）：
 *   · 管家钥匙是【专用类型】（type=butler），服务端强制 scope=all、IP 白名单=本机回环；
 *   · 绑定账号必须是管理员；
 *   · 管家车道四关：钥匙类型 → 本机来源 → 总开关 → 分项开关，任一不过即 403；
 *   · 普通内容钥匙（user/admin）不得调用 butler/*（AGENT-4037）；
 *   · 管理员【会话】才能签发/吊销管家钥匙；普通登录用户 403。
 *
 *   node tests/butler-lane.mjs   （需先有服务在 PRIVHUB_TEST_BASE，通常 3190）
 *
 * @module tests/butler-lane
 */

import { spawn } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSuite, ok, eq, GET, POST, DEL, loginOk, BASE } from './lib.mjs'

/** 跑一个 node 子进程并收集输出（用于驱动 mcp/butler-setup.mjs）。 */
function runNode(args) {
  return new Promise((res) => {
    const p = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    p.stdout.on('data', (d) => { out += String(d) })
    p.stderr.on('data', (d) => { err += String(d) })
    p.on('exit', (code) => res({ code, stdout: out, stderr: err }))
    p.on('error', (e) => res({ code: -1, stdout: out, stderr: err + String(e && e.message) }))
  })
}

/** 带 Agent 密钥的请求。 */
const agent = (key) => ({
  GET: (p) => GET(p, { headers: { 'x-agent-key': key } }),
  POST: (p, body) => POST(p, { headers: { 'x-agent-key': key, 'x-idempotency-key': 'k-' + Math.random().toString(36).slice(2, 12) }, body }),
})

export function build() {
  const s = createSuite('宿主机智能体管家车道（butler-lane）')
  const rand = Math.random().toString(36).slice(2, 8)
  let admin = ''
  let butlerKey = ''
  let butlerId = ''
  let contentKey = ''
  let contentId = ''
  const tmpUser = '_but_' + rand
  let tmpToken = ''
  let regOn = false

  /** 临时开启自助注册建号（finally 复原）。 */
  async function withRegisterOn(fn) {
    const before = await GET('/privhub/api/settings', { token: admin })
    const orig = before.json?.settings?.allowSelfRegister
    try {
      await POST('/privhub/api/settings', { token: admin, body: { allowSelfRegister: true } })
      return await fn()
    } finally {
      await POST('/privhub/api/settings', { token: admin, body: { allowSelfRegister: typeof orig === 'boolean' ? orig : false } }).catch(() => null)
    }
  }

  /** 设置某个功能对普通用户的级别（管理），返回是否成功。 */
  const setCap = (feature, level) => POST('/privhub/api/cap/save', { token: admin, body: { feature, level } })

  s.test('准备：管理员登录', async () => {
    const lr = await POST('/privhub/api/login', { body: { username: 'admin', password: 'admin123' } })
    admin = (lr.json && lr.json.ok && lr.json.token) ? lr.json.token : ''
    ok(admin && admin.length >= 32, '管理员 token 有效')
  })

  s.test('准备：建一个普通用户（用于"非管理员不能签发"的断言）', async () => {
    const r = await withRegisterOn(() => POST('/privhub/api/register', {
      body: { username: tmpUser, password: 'test123456', displayName: '管家测试' + rand },
    }))
    ok(r.json && r.json.ok, '注册失败：' + r.text.slice(0, 160))
    tmpToken = await loginOk(tmpUser, 'test123456')
    ok(tmpToken.length >= 32, '普通用户 token 有效')
  })

  s.test('A 管家钥匙列表：初始为空，且声明本机回环约束', async () => {
    const r = await GET('/privhub/api/agent/v1/butler/key', { token: admin })
    ok(r.json && r.json.ok, '取管家钥匙列表失败：' + r.text.slice(0, 160))
    ok(Array.isArray(r.json.keys), '应返回 keys 数组')
    ok(Array.isArray(r.json.localOnly) && r.json.localOnly.some((c) => String(c).startsWith('127.')),
      '应声明本机回环白名单（localOnly 含 127.0.0.0/8）')
    ok(!r.json.keys.some((k) => k.id === butlerId), '尚未签发，列表不应含目标 id')
  })

  s.test('B 签发管家钥匙：强制 scope=all + 本机回环白名单 + 绑定管理员', async () => {
    const r = await POST('/privhub/api/agent/v1/butler/key', { token: admin, body: { name: 'butler-' + rand } })
    ok(r.json && r.json.ok && r.json.key, '签发管家钥匙失败：' + r.text.slice(0, 200))
    butlerKey = r.json.key
    butlerId = r.json.id
    ok(butlerKey.startsWith('pha_'), '管家钥匙应为 pha_ 前缀')
    eq(r.json.scope?.kind, 'all', 'scope 应被强制为 all')
    eq(r.json.username, 'admin', '默认应绑定签发者本人（admin）')
    ok(Array.isArray(r.json.ipWhitelist) && r.json.ipWhitelist.some((c) => String(c).startsWith('127.')),
      'IP 白名单应被强制为本机回环')

    // 列表里应能看到，且 type=butler
    const list = await GET('/privhub/api/agent/v1/butler/key', { token: admin })
    const mine = (list.json?.keys || []).find((k) => k.id === butlerId)
    ok(mine, '新签发的管家钥匙应出现在列表中')
    eq(mine.type, 'butler', '列表中的 type 应为 butler')
    ok(!('keyHash' in mine) && !('key' in mine), '列表不得泄露密钥哈希或明文')
  })

  s.test('C 普通用户不能签发 / 查看管家钥匙（权限开关 admin.agent.keys）', async () => {
    const get = await GET('/privhub/api/agent/v1/butler/key', { token: tmpToken })
    eq(get.status, 403, `普通用户取管家钥匙列表应 403（实际 ${get.status}）`)
    const post = await POST('/privhub/api/agent/v1/butler/key', { token: tmpToken, body: { name: 'x' } })
    eq(post.status, 403, `普通用户签发管家钥匙应 403（实际 ${post.status}）`)
    const anon = await GET('/privhub/api/agent/v1/butler/key')
    eq(anon.status, 401, `匿名访问应 401（实际 ${anon.status}）`)
  })

  s.test('D 管家自检：管家钥匙可调，返回各分项开关等级', async () => {
    const r = await agent(butlerKey).GET('/privhub/api/agent/v1/butler/status')
    ok(r.json && r.json.ok, '管家自检失败：' + r.text.slice(0, 200))
    eq(r.json.lane, 'butler', '应声明 lane=butler')
    ok(r.json.capabilities && typeof r.json.capabilities === 'object', '应返回 capabilities')
    for (const k of ['files', 'users', 'projects', 'switches', 'keys', 'audit', 'model', 'service']) {
      ok(k in r.json.capabilities, 'capabilities 应含分项 ' + k)
    }
    eq(r.json.capabilities.files, 'write', '默认 files 应为 write')
    ok(r.json.key && r.json.key.name, '应回带钥匙信息')
    eq(r.json.user?.role, 'admin', '绑定身份应为管理员')
  })

  s.test('E 内容通道钥匙不得越界到管家车道（AGENT-4037）', async () => {
    const c = await POST('/privhub/api/agent/v1/keys', {
      token: admin, body: { name: 'content-' + rand, username: 'admin', scope: { kind: 'all' } },
    })
    ok(c.json && c.json.ok && c.json.key, '签发内容钥匙失败：' + c.text.slice(0, 160))
    contentKey = c.json.key
    contentId = c.json.id
    const r = await agent(contentKey).GET('/privhub/api/agent/v1/butler/status')
    eq(r.status, 403, `普通内容钥匙调管家端点应 403（实际 ${r.status}）`)
    eq(r.json?.code, 'AGENT-4037', '错误码应为 AGENT-4037（非管家钥匙）')
  })

  s.test('F 无钥匙调用管家端点 → 401', async () => {
    const r = await GET('/privhub/api/agent/v1/butler/status')
    eq(r.status, 401, `无钥匙应 401（实际 ${r.status}）`)
  })

  s.test('G 总开关关闭 → 整条车道 403（AGENT-4039）；开启后恢复', async () => {
    const off = await setCap('agent.butler', 'none')
    eq(off.status, 200, '关闭总开关应 200')
    const r = await agent(butlerKey).GET('/privhub/api/agent/v1/butler/status')
    eq(r.status, 403, `总开关关闭后应 403（实际 ${r.status}）`)
    eq(r.json?.code, 'AGENT-4039', '错误码应为 AGENT-4039（开关已关）')
    try {
      const on = await setCap('agent.butler', 'write')
      eq(on.status, 200, '恢复总开关应 200')
      ok((await agent(butlerKey).GET('/privhub/api/agent/v1/butler/status')).json?.ok, '恢复后管家自检应重新可用')
    } finally {
      await setCap('agent.butler', 'write').catch(() => null)
    }
  })

  s.test('H 分项开关：关掉 users 后自检仍通，但该分项等级变 none', async () => {
    const off = await setCap('agent.butler.users', 'none')
    eq(off.status, 200, '关闭分项应 200')
    try {
      const r = await agent(butlerKey).GET('/privhub/api/agent/v1/butler/status')
      ok(r.json && r.json.ok, '分项关闭不应影响总开关下的自检')
      eq(r.json.capabilities.users, 'none', 'users 分项应显示为 none')
      eq(r.json.capabilities.files, 'write', '其它分项不受影响（files 仍 write）')
    } finally {
      await setCap('agent.butler.users', 'write').catch(() => null)
    }
  })

  s.test('I 安装脚本 butler-setup：一条命令签发钥匙并写出 MCP 配置，且签出来的钥匙立刻可用', async () => {
    const out = join(tmpdir(), 'privhub-butler-' + rand + '.json')
    const script = join(dirname(fileURLToPath(import.meta.url)), '..', 'mcp', 'butler-setup.mjs')
    const r = await runNode([script, '--url', BASE, '--user', 'admin', '--password', 'admin123', '--name', 'setup-' + rand, '--out', out, '--json'])
    eq(r.code, 0, '安装脚本应成功退出：' + r.stderr.slice(0, 200))
    const line = r.stdout.trim().split('\n').filter(Boolean).pop() || ''
    let got = null
    try { got = JSON.parse(line) } catch { /* 下面断言会给出更清楚的失败信息 */ }
    ok(got && got.ok && got.key, '脚本应输出 {ok:true, key}：' + r.stdout.slice(0, 200))
    ok(String(got.key).startsWith('pha_'), '脚本签发的应是 pha_ 钥匙')
    const cfg = JSON.parse(readFileSync(out, 'utf8'))
    eq(cfg.key, got.key, '写出的配置文件 key 应与输出一致')
    eq(cfg.url, BASE, '写出的配置文件 url 应为目标地址')

    // 关键：脚本签出来的钥匙**立刻能用**（证明"接上就能干活"）
    const st = await agent(got.key).GET('/privhub/api/agent/v1/butler/status')
    ok(st.json && st.json.ok, '脚本签发的钥匙应能通过管家自检：' + st.text.slice(0, 160))

    await DEL('/privhub/api/agent/v1/butler/key', { token: admin, body: { id: got.id } }).catch(() => null)
    rmSync(out, { force: true })
  })

  s.test('J 非本机来源：管家钥匙回车道专属码 AGENT-4038（不是通用白名单码 4014）', async () => {
    /* 回归：非本机请求原本被 authAgent 的通用白名单先挡下、回 401 AGENT-4014，
     * 使车道的 AGENT-4038 分支不可达 —— 与方案文档/车道契约不符。
     * 本机若无非回环 IPv4、或防火墙挡住 LAN，则**可见跳过**（打印说明），不静默、不判红。 */
    const { networkInterfaces } = await import('node:os')
    const lan = Object.values(networkInterfaces()).flat().find((n) => n && n.family === 'IPv4' && !n.internal)
    if (!lan) { console.log('    ⏭ 本机无非回环 IPv4 —— 跳过 J（可见跳过）'); return }
    const url = `http://${lan.address}:${new URL(BASE).port}/privhub/api/agent/v1/butler/status`
    let r
    try {
      r = await fetch(url, { headers: { 'x-agent-key': butlerKey } })
    } catch (e) {
      console.log('    ⏭ 无法经 LAN(' + lan.address + ')访问（防火墙/路由）：' + (e && e.message) + ' —— 跳过 J（可见跳过）')
      return
    }
    eq(r.status, 403, `非本机来源应 403（实际 ${r.status}）`)
    const j = await r.json().catch(() => ({}))
    eq(j.code, 'AGENT-4038', '非本机应回车道专属码 AGENT-4038（而非通用 401 AGENT-4014）')
    // 反证：同一把钥匙经回环仍可用
    const loop = await agent(butlerKey).GET('/privhub/api/agent/v1/butler/status')
    ok(loop.json && loop.json.ok, '同一把钥匙经 127.0.0.1 仍应可用')
  })

  s.test('清理测试产物', async () => {
    if (butlerId) await DEL('/privhub/api/agent/v1/butler/key', { token: admin, body: { id: butlerId } }).catch(() => null)
    if (contentId) await POST('/privhub/api/agent/v1/keys/revoke', { token: admin, body: { id: contentId } }).catch(() => null)
    await POST('/privhub/api/admin/user-delete', { token: admin, body: { username: tmpUser } }).catch(() => null)
    // 复原可能被改动的分项开关，避免污染后续套件
    await setCap('agent.butler', 'write').catch(() => null)
    await setCap('agent.butler.users', 'write').catch(() => null)
  })

  return s
}
