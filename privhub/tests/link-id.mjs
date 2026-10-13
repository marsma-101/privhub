/**
 * 双链 ID 化端到端回归（privhub-files-kg + svc-links，Q4 / §2.6）
 *
 * 验收（改进方案 §2.6 原文）：**把被引用的文件重命名，图谱边与反链不断**。
 * 这条套件就用真实 HTTP 把这句话跑一遍：
 *   1. 建两篇文档，A 里写 `[[B]]` → 图谱里出现 A→B 的 link 边；
 *   2. `POST /privhub/api/rename` 把 B 改名；
 *   3. 重新取图 → **边仍在、且已指向新路径**；反过来查新路径的反链 → 仍是 A；
 *   4. 界面点不动的那半：`/privhub/api/kg/resolve` 用**旧名字**也能解到新路径。
 *
 * 另断言两件安全相关的事：
 *   · 解析对**不可见文件**一律回 null（不是 403）—— 403 等于承认"这个名字指向你看不见的文件"；
 *   · 登记表落盘 `data/links.json` 是密文（PHENC1 头，走 ctx.storage，不是裸 fs）。
 *
 * 用独立项目 `_linkid_reg`，收尾删项目 + 清回收站 + 删 ACL 规则（规则必须清干净，否则污染后续套件）。
 * 端口纪律：只打 3190（run-all 默认），由 `run-all.mjs --spawn` 拉起隔离实例。
 *
 * @module tests/link-id
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  createSuite, ok, eq, includes, notIncludes,
  loginOk, uploadFile, purgeTrashOfProject, GET, POST, DEL,
} from './lib.mjs'

const PROJECT = '_linkid_reg'
const RAND = Date.now().toString(36).slice(-6)

const A = 'src_' + RAND + '.md'
const B = 'target_' + RAND + '.md'
const NEW = 'renamed_' + RAND + '.md'
const SUB = 'sub_' + RAND
const DEEP = SUB + '/deep_' + RAND + '.md'

/** A 引用 B：同目录名 + 一个带目录路径的引用（两种写法都要能在改名后解析）。 */
const A_TEXT = ['# 甲', '', '同目录引用：[[__B__]]', '带目录引用：[[__DEEP__]]', ''].join('\n')
  .replace('__B__', B).replace('__DEEP__', DEEP)
const B_TEXT = '# 乙\n\n被引用的目标。\n'
const DEEP_TEXT = '# 深\n\n另一个目标。\n'

/** 轮询直到条件成立（图谱缓存由事件失效，但事件与请求可能赛跑）。 */
async function waitFor(fn, tries = 20, stepMs = 150) {
  let last = null
  for (let i = 0; i < tries; i++) {
    last = await fn()
    if (last) return true
    await new Promise((r) => setTimeout(r, stepMs))
  }
  return last
}

const kgUrl = (extra) => '/privhub/api/kg?' + new URLSearchParams({ project: PROJECT, ...(extra || {}) })
const resolveUrl = (target) => '/privhub/api/kg/resolve?' + new URLSearchParams({ project: PROJECT, target })
const backlinksUrl = (path) => '/privhub/api/kg/backlinks?' + new URLSearchParams({ project: PROJECT, path })

async function graph(token) {
  const r = await GET(kgUrl(), { token })
  ok(r.json && r.json.ok, '图谱接口失败：' + r.text.slice(0, 160))
  return r.json.graph
}

/** 是否有一条 A → path 的 link 边。 */
const hasEdge = (g, from, to) => (g.edges || []).some((e) => e.type === 'link' && e.source === from && e.target === to)

export function build() {
  const s = createSuite('双链 ID 化（Q4 / §2.6）')
  let admin = ''

  s.test('匿名访问被拒（401）', async () => {
    const r = await GET(resolveUrl(B))
    eq(r.status, 401, '未登录解析应 401，实际 ' + r.status)
  })

  s.test('登录（admin）', async () => {
    admin = await loginOk('admin', 'admin123')
  })

  s.test('准备：新建测试项目 + 目录 + 两篇互链文档', async () => {
    await POST('/privhub/api/project-delete', { token: admin, body: { name: PROJECT } }).catch(() => null)
    await purgeTrashOfProject(admin, PROJECT)
    const c = await POST('/privhub/api/project-create', { token: admin, body: { name: PROJECT } })
    ok(c.json && c.json.ok, '新建项目失败：' + c.text.slice(0, 120))
    const d = await POST('/privhub/api/mkdir', { token: admin, body: { project: PROJECT, path: '', name: SUB } })
    ok(d.json && d.json.ok, '建目录失败：' + d.text.slice(0, 120))
    for (const [dir, name, text] of [['', A, A_TEXT], ['', B, B_TEXT], [SUB, 'deep_' + RAND + '.md', DEEP_TEXT]]) {
      const r = await uploadFile(admin, PROJECT, dir, name, text)
      ok(r.json && r.json.ok, '上传失败 ' + dir + '/' + name + '：' + r.text.slice(0, 120))
    }
  })

  s.test('基线：A 的 [[B]] 与 [[sub/deep]] 都产生了 link 边', async () => {
    const ok1 = await waitFor(async () => {
      const g = await graph(admin)
      return hasEdge(g, A, B) && hasEdge(g, A, DEEP)
    })
    ok(ok1, '基线应有 A→B 与 A→' + DEEP + ' 两条双链边（实测：' + JSON.stringify((await graph(admin)).edges) + '）')
  })

  s.test('基线：resolve 现名直接命中', async () => {
    const r = await GET(resolveUrl(B), { token: admin })
    ok(r.json && r.json.ok, '解析失败：' + r.text.slice(0, 120))
    eq(r.json.path, B, '现名应解析到自身')
    const rd = await GET(resolveUrl(DEEP), { token: admin })
    eq(rd.json.path, DEEP, '带目录路径写法也直接命中')
  })

  s.test('★ 验收：重命名被引用的文件后，图谱边指向新路径而非断掉', async () => {
    const ren = await POST('/privhub/api/rename', { token: admin, body: { project: PROJECT, path: B, newName: NEW } })
    ok(ren.json && ren.json.ok, '改名失败：' + ren.text.slice(0, 160))
    const still = await waitFor(async () => {
      const g = await graph(admin)
      return hasEdge(g, A, NEW) && !hasEdge(g, A, B)
    })
    ok(still, '改名后 A→新路径 的边仍在，且不再指向旧名（实测：'
      + JSON.stringify((await graph(admin)).edges.filter((e) => e.source === A)) + '）')
  })

  s.test('★ 验收：改名后反链仍是 A（反链不断）', async () => {
    const ok1 = await waitFor(async () => {
      const r = await GET(backlinksUrl(NEW), { token: admin })
      const inc = (r.json?.incoming || []).map((x) => x.path)
      return inc.includes(A)
    })
    ok(ok1, '新路径的反链里应仍有 A')
    const r = await GET(backlinksUrl(NEW), { token: admin })
    const inc = (r.json?.incoming || []).find((x) => x.path === A)
    ok(inc, '反链明细应含 A')
    includes(String(inc?.snippet || ''), '[[' + B + ']]', '摘要仍是原文里的老名字（本仓不改写用户文档）')
  })

  s.test('界面点得动：resolve 用旧名字解到新路径', async () => {
    const r = await GET(resolveUrl(B), { token: admin })
    ok(r.json && r.json.ok, '解析失败：' + r.text.slice(0, 120))
    eq(r.json.path, NEW, '旧名应经登记表的别名解到新路径（这是"改名不断链"的用户可见那一半）')
    const rn = await GET(resolveUrl(NEW), { token: admin })
    eq(rn.json.path, NEW, '新名同样解得到')
  })

  s.test('未知名的解析：ok=true 且 path=null（不报错、不造边）', async () => {
    const r = await GET(resolveUrl('压根不存在_' + RAND + '.md'), { token: admin })
    ok(r.json && r.json.ok, '未知名不应报错：' + r.text.slice(0, 120))
    eq(r.json.path, null, '未知名应为 null')
  })

  s.test('参数校验与鉴权：target 空 → 400；非成员 → 403', async () => {
    const empty = await GET('/privhub/api/kg/resolve?' + new URLSearchParams({ project: PROJECT, target: '' }), { token: admin })
    eq(empty.status, 400, '空 target 应 400，实际 ' + empty.status)
    const user1 = await loginOk('user1', 'user123')
    const r = await GET(resolveUrl(B), { token: user1 })
    eq(r.status, 403, '非成员应 403，实际 ' + r.status)
    const rk = await GET(kgUrl(), { token: user1 })
    eq(rk.status, 403, '非成员取图谱应 403，实际 ' + rk.status)
  })

  s.test('安全：目标不可见时 resolve 回 null（不是 403 —— 403 会承认这个名字指向某个看不见的文件）', async () => {
    const p = await POST('/privhub/api/acl/policy', {
      token: admin,
      body: { project: PROJECT, path: NEW, target: 'file', role: '', mode: 'deny' },
    })
    ok(p.json && p.json.ok, '加 ACL 规则失败：' + p.text.slice(0, 120))
    const r = await GET(resolveUrl(B), { token: admin })
    ok(r.json && r.json.ok, '被拒目标不应是 403，而应是 ok:true：' + r.text.slice(0, 120))
    eq(r.json.path, null, '对本用户不可见的目标一律"没解析到"')
    // 恢复：删规则后能重新解析
    const rules = (await GET('/privhub/api/acl/rules', { token: admin })).json.rules || []
    for (const rule of rules.filter((x) => x.project === PROJECT && x.path === NEW)) {
      await DEL('/privhub/api/acl/rules', { token: admin, body: { id: rule.id } })
    }
    const back = await GET(resolveUrl(B), { token: admin })
    eq(back.json.path, NEW, '规则删除后旧名又能解析（证明上一步的 null 是权限所致，不是解析坏了）')
  })

  s.test('登记表落盘为密文（PHENC1，走 ctx.storage 而非裸 fs）', async () => {
    const root = process.env.PRIVHUB_TEST_ROOT
    if (!root) { ok(true, '未设 PRIVHUB_TEST_ROOT（未走 --spawn），跳过磁盘断言'); return }
    const file = join(root, 'data', 'links.json')
    const ok1 = await waitFor(() => existsSync(file), 20, 150)
    ok(ok1, '落盘文件 ' + file + ' 应存在')
    const head = readFileSync(file).subarray(0, 6).toString('latin1')
    eq(head, 'PHENC1', '登记表应是密文（PHENC1 头），不是明文 JSON')
    notIncludes(readFileSync(file).toString('latin1'), B, '磁盘上不应出现明文文件名（登记表也含路径，必须加密）')
  })

  s.test('清理：删项目、清回收站、删规则', async () => {
    const rules = (await GET('/privhub/api/acl/rules', { token: admin })).json.rules || []
    for (const rule of rules.filter((x) => x.project === PROJECT)) {
      await DEL('/privhub/api/acl/rules', { token: admin, body: { id: rule.id } })
    }
    await POST('/privhub/api/project-delete', { token: admin, body: { name: PROJECT } }).catch(() => null)
    await purgeTrashOfProject(admin, PROJECT)
    ok(true, '已清理')
  })

  return s
}
