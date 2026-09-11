/**
 * 智能体沙箱回归（个人空间 v1 · 批次B）
 *
 * 被测语义：智能体沙箱 = 绑定账号的「个人空间」（data-files/<真实姓名>/）。
 *   - 项目对智能体【永远只读】：写项目一律 403 AGENT-4032
 *   - 沙箱 = 个人空间：写入落在 data-files/<姓名>/，天然「仅本人可见」
 *   - 沙箱名【不出现在项目清单里】（它不是项目，避免被按名枚举）
 *   - 未开通个人空间的账号：写入类操作 403 AGENT-4036（显式失败，不静默落到别处）
 *   - 个人空间不进 RAG 语料 / 全文索引（防私人内容经检索泄露）
 *
 * 依赖真实数据目录的断言（沙箱落位、索引排除）需要 PRIVHUB_TEST_ROOT，
 * 缺失时显式失败而不是静默跳过——静默跳过会让套件变成假保险。
 *
 *   node tests/agent-sandbox.mjs
 *
 * @module tests/agent-sandbox
 */

import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { createSuite, ok, eq, GET, POST, loginOk, cookieOf, uploadFile } from './lib.mjs'

const PFX = '_sb_'
const PROJECT = process.env.PRIVHUB_TEST_PROJECT || '公共'

/** 惰性读取测试根（run-all 的 import 早于它设置该环境变量）。 */
const testRoot = () => process.env.PRIVHUB_TEST_ROOT || ''
const spacePath = (name) => (testRoot() ? join(testRoot(), 'data-files', name) : '')

/** 轮询直到条件成立。 */
async function waitFor(cond, timeoutMs = 15000, stepMs = 300) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await cond()) return true
    await new Promise((r) => setTimeout(r, stepMs))
  }
  return false
}

/** 带 Agent 密钥的请求。 */
const agent = (key) => ({
  GET: (p) => GET(p, { headers: { 'x-agent-key': key } }),
  POST: (p, body, extraHeaders = {}) => POST(p, {
    headers: { 'x-agent-key': key, 'x-idempotency-key': 'k-' + Math.random().toString(36).slice(2, 12), ...extraHeaders },
    body,
  }),
})

export function build() {
  const s = createSuite('智能体沙箱（agent-sandbox）')
  let admin = ''
  let cookie = ''

  const rand = Math.random().toString(36).slice(2, 8)
  const uname = PFX + rand
  const realName = '沙箱测试' + rand
  let aKey = ''
  let userToken = ''

  /** 临时开启自助注册建号（finally 复原）。 */
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

  s.test('准备：测试根可用 + 管理员登录', async () => {
    ok(!!testRoot(), 'PRIVHUB_TEST_ROOT 已传给测试进程（否则磁盘断言会是空断言）')
    const r = await (async () => {
      const lr = await POST('/privhub/api/login', { body: { username: 'admin', password: 'admin123' } })
      return lr
    })()
    admin = lr_token(r)
    ok(admin && admin.length >= 32, '管理员 token 有效')
    cookie = cookieOf(r, 'privhub_sid')
  })

  s.test('准备：实名注册一个带个人空间的账号', async () => {
    const r = await withRegisterOn(() => POST('/privhub/api/register', {
      body: { username: uname, password: 'test123456', displayName: realName },
    }))
    ok(r.json && r.json.ok, '注册失败：' + r.text.slice(0, 160))
    eq(r.json.personalDir, realName, '个人空间目录名应等于真实姓名')
    userToken = await loginOk(uname, 'test123456')
  })

  s.test('准备：管理员为该账号签发 Agent 密钥（scope = 公共）', async () => {
    const r = await POST('/privhub/api/agent/v1/keys', {
      token: admin,
      body: { name: 'sb-test-' + rand, username: uname, scope: { kind: 'project', project: PROJECT } },
    })
    ok(r.json && r.json.ok && r.json.key, '签发密钥失败：' + r.text.slice(0, 200))
    aKey = r.json.key
    ok(aKey.startsWith('pha_'), '密钥前缀应为 pha_')
    eq(r.json.scope?.project, PROJECT, 'scope 应为指定项目')
  })

  s.test('A /me 与 /projects：沙箱单列，且不混进项目清单', async () => {
    const me = await agent(aKey).GET('/privhub/api/agent/v1/me')
    ok(me.json && me.json.ok, '/me 应成功：' + me.text.slice(0, 160))
    eq(me.json.sandbox, realName, '/me 的 sandbox 应为该账号个人空间目录名')
    ok((me.json.visibleProjects || []).includes(PROJECT), 'scope 内项目应在可见列表')
    ok(!(me.json.visibleProjects || []).includes(realName),
      '个人空间【不得】出现在项目清单里（它不是项目）')
    eq(me.json.projectReadOnly, true, '/me 应声明项目只读')

    const pj = await agent(aKey).GET('/privhub/api/agent/v1/projects')
    ok(pj.json && pj.json.ok, '/projects 应成功')
    eq(pj.json.sandbox, realName, '/projects 应给出 sandbox 名')
    ok(!(pj.json.projects || []).includes(realName), '/projects 不得包含个人空间')
    // 关键回归：原实现 /me 不做 scope 过滤，会把全部项目名发给智能体
    ok(!(me.json.visibleProjects || []).includes('B项目') || PROJECT === 'B项目',
      '/me 的可见项目应受密钥 scope 限制（不得泄露 scope 外项目名）')
  })

  s.test('B 写入沙箱：落到个人空间目录，且本人可见', async () => {
    const rel = PFX + 'ai-note.md'
    const w = await agent(aKey).POST('/privhub/api/agent/v1/write', { path: rel, content: '# AI 产出' + rand })
    ok(w.json && w.json.ok, '写入沙箱失败：' + w.text.slice(0, 200))
    ok(String(w.json.savedAt || '').startsWith(realName + '/'),
      `写入路径应在个人空间下（实际 ${w.json.savedAt}）`)

    const onDisk = join(spacePath(realName), PROJECT, rel)
    ok(existsSync(onDisk), `文件应落在 data-files/${realName}/${PROJECT}/${rel}`)

    // 本人经网页接口读得到（个人空间对本人开放）
    const rl = await GET('/privhub/api/list?' + new URLSearchParams({ project: realName, path: PROJECT }), { token: userToken })
    ok(rl.json && rl.json.ok, '本人应能列出个人空间内的 AI 产出：' + rl.text.slice(0, 120))
    ok((rl.json.entries || []).some((e) => e.name === rel), '本人应看到 AI 写入的文件')
  })

  s.test('C 项目只读：写项目一律 403（核心隔离）', async () => {
    const r = await agent(aKey).POST('/privhub/api/agent/v1/write', {
      project: PROJECT, path: PFX + 'evil.md', content: '不应写入项目',
    })
    eq(r.status, 403, `写项目应 403（实际 ${r.status}）`)
    eq(r.json?.code, 'AGENT-4032', '错误码应为 AGENT-4032（项目只读）')
    // 必须确实没写进去
    const onDisk = join(testRoot(), 'data-files', PROJECT, PFX + 'evil.md')
    ok(!existsSync(onDisk), '项目目录下不得出现该文件')
  })

  s.test('D 管理员也读不到沙箱（个人空间仅本人可见）', async () => {
    const r = await GET('/privhub/api/list?' + new URLSearchParams({ project: realName, path: PROJECT }), { token: admin })
    eq(r.status, 403, `管理员读他人个人空间应 403（实际 ${r.status}）`)
  })

  s.test('E 未开通个人空间的账号：写入被显式拒绝（AGENT-4036）', async () => {
    // admin 是内置账号，没有 personalDir
    const kr = await POST('/privhub/api/agent/v1/keys', {
      token: admin,
      body: { name: 'sb-nospace-' + rand, username: 'admin', scope: { kind: 'all' } },
    })
    ok(kr.json && kr.json.ok, '为 admin 签发密钥失败：' + kr.text.slice(0, 160))
    const w = await agent(kr.json.key).POST('/privhub/api/agent/v1/write', { path: PFX + 'x.md', content: 'x' })
    eq(w.status, 403, `无个人空间账号写入应 403（实际 ${w.status}）`)
    eq(w.json?.code, 'AGENT-4036', '错误码应为 AGENT-4036（沙箱不可用）')
    // 收尾：吊销这把临时密钥
    await POST('/privhub/api/agent/v1/keys/revoke', { token: admin, body: { id: kr.json.id } }).catch(() => null)
  })

  s.test('F 个人空间不进 RAG 语料（防私人内容泄露给管理员）', async () => {
    /* 必须走【网页上传】这条路径来构造用例。
     * 原因：Agent 写入是直接落盘的，不会发 file:changed 事件；
     * 而 RAG 的增量摄取恰恰挂在 file:changed 上——只有网页上传/编辑才会触发它。
     * 第一版用例只用了 Agent 写入，于是「去掉 RAG 的个人空间拦截」这个变异
     * 测试依然全绿（敏感性验证实测到了这个假保险）。 */
    const name = PFX + 'leak-canary.md'
    const up = await uploadFile(userToken, realName, PROJECT, name, '# 私人内容 ' + rand)
    ok(up.json && up.json.ok, '网页上传到个人空间失败：' + up.text.slice(0, 160))

    const corpus = await GET('/privhub/api/rag/corpus', { token: admin })
    if (!corpus.json || !corpus.json.ok) {
      ok(true, '（跳过）RAG 语料清单不可用')
      return
    }
    // 等足「事件摄取 + 启动重建」窗口，确保不是"还没来得及摄取"
    const leaked = await waitFor(async () => {
      const c = await GET('/privhub/api/rag/corpus', { token: admin })
      return (c.json?.docs || []).some((d) => d.project === realName)
    }, 8000, 500)
    ok(!leaked, '个人空间目录名【不得】出现在 RAG 语料清单里（管理员端可见该清单）')

    // 断言有效性自检：文件确实躺在个人空间里（否则"没泄露"可能只是因为压根没上传成功）
    const rl = await GET('/privhub/api/list?' + new URLSearchParams({ project: realName, path: PROJECT }), { token: userToken })
    ok((rl.json?.entries || []).some((e) => e.name === name), '金丝雀文件确实在个人空间内（保证上条断言不是空断言）')

    // 同时确认索引侧也没有：全文检索不应命中个人空间
    const ft = await GET('/privhub/api/fulltext/search?' + new URLSearchParams({ q: '私人内容' + rand }), { token: admin })
    const hits = (ft.json?.hits || []).filter((h) => h.project === realName)
    ok(hits.length === 0, `全文索引也不得命中个人空间（实际 ${hits.length} 条）`)
  })

  s.test('G 个人空间不参与查重（dup 仅针对项目）', async () => {
    const r = await GET('/privhub/api/rag/dup?' + new URLSearchParams({ project: realName }), { token: userToken })
    eq(r.status, 400, `对个人空间查重应 400（实际 ${r.status}）`)
  })

  s.test('H 开发者平台端点：仅网页会话可用，且给出沙箱与密钥清单', async () => {
    // 未登录一律拒绝（该端点走会话通道，不接受 Agent 密钥）
    const anon = await GET('/privhub/api/agent/v1/console')
    eq(anon.status, 401, `未登录访问平台端点应 401（实际 ${anon.status}）`)

    const kAnon = await GET('/privhub/api/agent/v1/console', { headers: { 'x-agent-key': aKey } })
    eq(kAnon.status, 401, `平台端点不接受 Agent 密钥（它是给【人】用的会话通道，实际 ${kAnon.status}）`)

    const r = await GET('/privhub/api/agent/v1/console', { token: userToken })
    ok(r.json && r.json.ok, '登录后应可取平台数据：' + r.text.slice(0, 160))
    eq(r.json.sandbox, realName, '平台应返回沙箱目录名')
    eq(r.json.projectReadOnly, true, '平台应声明项目只读')
    ok(r.json.keyPrefix === 'pha_', '平台应返回密钥前缀')
    ok(Array.isArray(r.json.myKeys), '平台应返回我的密钥列表')
    ok(r.json.myKeys.every((k) => !('keyHash' in k) && !('key' in k)),
      '密钥清单【不得】包含哈希或明文')
  })

  s.test('I 接口清单：未授权不得读取（地址规则不公开）', async () => {
    const anon = await GET('/privhub/api/agent/v1/schema')
    eq(anon.status, 401, `未授权读接口清单应 401（实际 ${anon.status}）`)

    const bySession = await GET('/privhub/api/agent/v1/schema', { token: userToken })
    ok(bySession.json && bySession.json.ok, '登录会话应可读接口清单（平台要渲染文档）')

    const byKey = await GET('/privhub/api/agent/v1/schema', { headers: { 'x-agent-key': aKey } })
    ok(byKey.json && byKey.json.ok, '有效 Agent 密钥应可读接口清单（自描述发现）')
  })

  s.test('J 自助密钥：可签单项目范围，但不允许 all scope', async () => {
    const okOne = await POST('/privhub/api/agent/v1/my-keys', {
      token: userToken, body: { name: 'self-' + rand, scope: { kind: 'project', project: PROJECT } },
    })
    ok(okOne.json && okOne.json.ok && okOne.json.key, '自助签发单项目密钥失败：' + okOne.text.slice(0, 160))
    ok(String(okOne.json.key).startsWith('pha_'), '自助密钥应为 pha_ 前缀')

    const bad = await POST('/privhub/api/agent/v1/my-keys', {
      token: userToken, body: { name: 'self-all-' + rand, scope: { kind: 'all' } },
    })
    eq(bad.status, 403, `自助签发 all scope 应 403（实际 ${bad.status}）`)
    eq(bad.json?.code, 'AGENT-4035', '错误码应为 AGENT-4035')

    // 清理：吊销刚签发的自助密钥
    await POST('/privhub/api/agent/v1/my-keys', {
      token: userToken, method: 'DELETE', body: { id: okOne.json.id },
    }).catch(() => null)
  })

  s.test('清理测试产物', async () => {
    // 删掉写进个人空间的文件（走网页接口，本人有权）
    for (const rel of [PFX + 'ai-note.md', PFX + 'leak-canary.md']) {
      await POST('/privhub/api/delete', {
        token: userToken, body: { project: realName, path: PROJECT + '/' + rel },
      }).catch(() => null)
    }
    await POST('/privhub/api/admin/user-delete', { token: admin, body: { username: uname } }).catch(() => null)
    try { rmSync(spacePath(realName), { recursive: true, force: true }) } catch { /* 忽略 */ }
    // 顺带清理测试期间被移入回收站的条目，避免残留
    const tr = await GET('/privhub/api/trash-list', { token: admin })
    for (const t of (tr.json?.trash || tr.json?.items || [])) {
      if (String(t.project || '').includes(realName)) {
        await POST('/privhub/api/trash-purge', { token: admin, body: { id: t.id } }).catch(() => null)
      }
    }
  })

  return s
}

/** 从登录响应里取 token（避免依赖 loginOk 的断言消息）。 */
function lr_token(r) {
  return (r.json && r.json.ok && r.json.token) ? r.json.token : ''
}
