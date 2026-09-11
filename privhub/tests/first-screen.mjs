/**
 * 首屏链路测试（S16 登录死锁的直接防线）
 *
 * 背景：2026-09-11 出现「打开页面永久停在加载中…、无法登录」的死锁——
 * 登录框由插件提供（auth slot），而插件清单来自需要登录的 manifest 接口。
 * 当时 84 项测试全绿却漏掉了它，因为 S16 用例把「未登录 401」这个缺陷
 * 断言成了预期行为（详见 docs/PrivHub-修复计划-S16登录死锁.md）。
 *
 * 本文件不依赖浏览器，但**严格复刻骨架 mounted() 的真实请求序列**，
 * 逐环节断言可走通；任一步断链即红：
 *
 *   ① GET /                        → 骨架页可达
 *   ② GET manifest（无 token）      → 200 且含 auth 插件
 *   ③ 逐个 import 清单里的 entry    → 每个都 200（登录界面真的能加载）
 *   ④ POST login                   → 拿到 token + 会话 Cookie
 *   ⑤ GET manifest（带 token）      → 完整清单（数量显著变多）
 *   ⑥ 逐个 import 完整清单的 entry  → 每个都 200（工作区真的能加载）
 *   ⑧ 未登录拉取非 auth 插件资源    → 401（插件代码即 API 全貌，不得枚举）
 *   ⑦ 关键 slot 齐全                → 不是空壳
 *
 *   node tests/first-screen.mjs
 *
 * @module tests/first-screen
 */

import { createSuite, ok, eq, GET, POST, loginOkWithCookie, BASE } from './lib.mjs'
import { report } from './lib.mjs'

export function build() {
  const s = createSuite('首屏链路（first-screen）')
  let token = ''
  let cookie = ''
  let minimal = []
  let full = []

  s.test('① 骨架页可达', async () => {
    const r = await GET('/')
    eq(r.status, 200, '首页应返回 200')
    ok(r.text.includes('window.PrivHub'), '首页应包含骨架脚本（window.PrivHub）')
  })

  s.test('② 未登录可拿到 manifest（含登录组件）', async () => {
    const r = await GET('/privhub/api/shell/manifest')
    eq(r.status, 200, '未登录必须能拿到 manifest —— 否则登录框渲染不出来（死锁）')
    minimal = r.json?.manifests || []
    ok(minimal.length > 0, `应返回非空清单（实际 ${minimal.length}）`)
    const authPlugins = minimal.filter((m) => (m.slots || []).includes('auth'))
    ok(authPlugins.length > 0, '清单中必须包含 auth slot 提供者（登录框来源）')
  })

  s.test('③ 登录界面的插件资源可加载', async () => {
    const withEntry = minimal.filter((m) => m.entry)
    ok(withEntry.length > 0, '最小清单应含可加载的 entry')
    for (const m of withEntry) {
      const r = await GET(m.entry)
      eq(r.status, 200, `插件资源应可加载：${m.entry}`)
      ok(r.text.length > 0, `${m.id} 的资源内容非空`)
    }
  })

  s.test('④ 登录成功（token + 会话 Cookie）', async () => {
    const r = await loginOkWithCookie('admin', 'admin123')
    token = r.token
    cookie = r.cookie
    ok(token && token.length >= 32, '应拿到有效 token')
    // 会话 Cookie 是插件静态资源的唯一凭据；缺失则登录后插件全部加载不出来
    ok(cookie && cookie.startsWith('privhub_sid='), '登录应下发会话 Cookie（插件资源靠它鉴权）')
  })

  s.test('⑤ 登录后拿到完整清单（数量显著变多）', async () => {
    const r = await GET('/privhub/api/shell/manifest', { token })
    full = r.json?.manifests || []
    ok(full.length >= 25, `完整清单应 >= 25 个插件（实际 ${full.length}）`)
    ok(full.length > minimal.length,
      `完整清单必须多于最小清单（最小 ${minimal.length} → 完整 ${full.length}）`)
  })

  s.test('⑥ 工作区所有插件资源可加载（无断链）', async () => {
    const withEntry = full.filter((m) => m.entry)
    ok(withEntry.length >= 25, `应有多数插件带 entry（实际 ${withEntry.length}）`)
    const failed = []
    for (const m of withEntry) {
      // 用 Cookie（浏览器 import() 的真实通道），而非 Bearer
      const r = await GET(m.entry, { headers: { cookie } })
      if (r.status !== 200) failed.push(`${m.id} → HTTP ${r.status} (${m.entry})`)
    }
    ok(failed.length === 0,
      `全部插件资源可加载${failed.length ? '，失败 ' + failed.length + ' 个：' + failed.slice(0, 5).join('; ') : ''}`)
  })

  s.test('⑧ 未登录不得枚举插件资源（插件代码即 API 全貌）', async () => {
    // 与生产同一条判据：声明了 auth slot 的插件是登录框自身，必须放行；
    // 其余插件未登录一律拒绝，避免「用地址直接读取页面信息」。
    const isAuthSlot = (m) => (m.slots || []).includes('auth')
    const guarded = full.filter((m) => m.entry && !isAuthSlot(m))
    ok(guarded.length >= 25, `应有多数插件受保护（实际 ${guarded.length}）`)

    const leaks = []
    for (const m of guarded) {
      const r = await GET(m.entry) // 不带任何凭据
      if (r.status !== 401) leaks.push(`${m.id} → ${r.status}`)
    }
    ok(leaks.length === 0,
      `未登录拉取受保护插件资源应全部 401${leaks.length ? '，但有 ' + leaks.length + ' 个未拒绝：' + leaks.slice(0, 5).join(', ') : ''}`)

    // 登录框自身必须仍放行（③ 的对照；若这里红了说明会重现 S16 死锁）
    const authEntries = minimal.filter(isAuthSlot).map((m) => m.entry)
    ok(authEntries.length > 0, '登录前必须放行 auth slot 插件（③ 的对照）')
    for (const e of authEntries) {
      const r = await GET(e)
      eq(r.status, 200, `auth slot 插件必须放行（否则登录框加载不出来）：${e}`)
    }
  })

  s.test('⑦ 关键 slot 齐全（登录后不是空壳）', async () => {
    const all = new Set()
    for (const m of full) for (const sl of (m.slots || [])) all.add(sl)
    const need = [
      'auth', 'app-iconbar', 'user-area', 'welcome',   // 骨架框架
      'tree', 'panel', 'preview',                       // 文件区三栏
      'trash-view', 'search-view', 'fav-view',          // 常用视图
      'settings', 'admin', 'acl', 'audit',              // 管理
      'tags', 'template', 'kg', 'wiki', 'rag-view',     // 知识库与 AI
    ]
    const missing = need.filter((n) => !all.has(n))
    ok(missing.length === 0, `关键 slot 应齐全${missing.length ? '，缺失：' + missing.join(', ') : '（' + need.length + ' 个）'}`)
  })

  return s
}

/* 直接运行时独立执行 */
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  console.log(`目标服务：${BASE}\n`)
  const results = [{ suite: '首屏链路（first-screen）', results: await build().run() }]
  process.exit(report(results) ? 0 : 1)
}
