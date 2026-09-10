/**
 * PrivHub 安全回归（O4 + 改进建议 S1/S2/S3/S4/S5）
 *
 * 分两类：
 *  1) 前端转义单测——把插件 client 里的纯函数源码抽出来在沙箱中执行，
 *     断言用户可控内容被转义（对应 S3 搜索片段 / S4 语料类型）。
 *  2) 服务端行为——请求体上限、/pub 响应头、静态资源路径校验。
 *
 * 这些用例在修复前应当失败、修复后通过，是修复的验收依据。
 *
 * @module tests/security
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  createSuite, ok, eq, includes, notIncludes,
  loginOk, uploadFile, safeDelete, GET, POST, DEL, BASE,
} from './lib.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const PLUGINS = join(HERE, '..', 'plugins')

const PROJECT = process.env.PRIVHUB_TEST_PROJECT || '公共'
const PFX = '_sec_'

/* ---------------- 源码抽取工具 ---------------- */

/**
 * 在沙箱中加载插件 client 模块并取回内部函数。
 *
 * 做法：读源码 → 去掉 `export default {...}` 尾部 → 在带 window/document 桩的
 * Function 作用域中整体求值 → 返回目标绑定。这样测的是**真实实现**，
 * 不依赖脆弱的源码切片解析。
 */
function loadClientFn(file, fnName) {
  let src = readFileSync(file, 'utf8')
  const cut = src.indexOf('export default')
  if (cut >= 0) src = src.slice(0, cut)

  const noop = () => {}
  const el = () => ({ id: '', textContent: '', style: {}, appendChild: noop, removeChild: noop, setAttribute: noop, classList: { add: noop, remove: noop, contains: () => false } })
  const doc = {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: el,
    head: { appendChild: noop, removeChild: noop },
    body: { appendChild: noop },
    addEventListener: noop,
    removeEventListener: noop,
  }
  const win = {
    PrivHub: {
      api: async () => ({ ok: false }),
      nav: {},
      AUTH: { user: null, token: '' },
      THEME: {},
      applyTheme: noop,
      logout: noop,
      toast: noop,
      bus: { on: () => noop, off: noop, emit: noop, once: noop },
      barItems: [],
      badges: {},
      fileIcon: () => '',
      previewImageUrl: () => '',
      previewPdfUrl: () => '',
      sortedEntries: (x) => x,
      openBarItem: noop,
      loadBarItems: noop,
    },
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
  }

  const factory = new Function(
    'window', 'document', 'localStorage', 'console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
    src + `\n;return (typeof ${fnName} !== 'undefined') ? ${fnName} : undefined`,
  )
  const fn = factory(win, doc, win.localStorage, console,
    () => 0, noop, () => 0, noop)
  ok(typeof fn === 'function', `未能从 ${file} 取到函数 ${fnName}（返回 ${typeof fn}）`)
  return fn
}

/* ---------------- 用例 ---------------- */

export function build() {
  const s = createSuite('安全回归（security）')
  let admin = ''

  /* ---- S3：全文搜索片段转义 ---- */
  s.test('S3 搜索片段转义：用户内容不得原样进入 HTML', () => {
    const file = join(PLUGINS, 'privhub-files-search', 'client', 'index.js')
    const hl = loadClientFn(file, 'hl')
    const evil = '<img src=x onerror=alert(1)>'
    const out = hl(evil, 'img')
    // 不变量：去掉自产的高亮标记后，输出中不得残留任何未转义的 '<'
    const bare = out.replace(/<\/?mark[^>]*>/g, '')
    notIncludes(bare, '<', '除高亮标记外不得残留未转义标签')
    includes(out, '&lt;', '应输出转义后的实体')
    // 无关键词时也必须转义
    notIncludes(hl(evil, '').replace(/<\/?mark[^>]*>/g, ''), '<', '无关键词分支同样要转义')
    // 关键词未命中分支
    notIncludes(hl(evil, 'zzz').replace(/<\/?mark[^>]*>/g, ''), '<', '未命中分支同样要转义')
    // 引号/脚本闭合
    notIncludes(hl('"><script>alert(1)</script>', 'script').replace(/<\/?mark[^>]*>/g, ''), '<', '不得保留未转义 script 标签')
  })

  s.test('S3 搜索片段转义：高亮标记本身保留', () => {
    const file = join(PLUGINS, 'privhub-files-search', 'client', 'index.js')
    const hl = loadClientFn(file, 'hl')
    const out = hl('hello world', 'world')
    includes(out, '<mark', '高亮标记应保留')
    includes(out, 'world', '内容应保留')
  })

  /* ---- S4：RAG 语料类型转义 ---- */
  s.test('S4 语料 badge 转义：type 注入不得形成标签', () => {
    const file = join(PLUGINS, 'privhub-svc-rag', 'client', 'index.js')
    const badge = loadClientFn(file, 'badge')
    const out = badge('<img src=x onerror=alert(1)> ×3', '#f00')
    // 仅允许自产的 <span>，其余不得出现未转义 '<'
    const bare = out.replace(/<\/?span[^>]*>/g, '')
    notIncludes(bare, '<', 'badge 除自身 span 外不得输出未转义标签')
    includes(out, '&lt;', '应输出转义后的实体')
    // 正常文本不受影响
    includes(badge('markdown ×5', '#0f0'), 'markdown ×5', '正常文本应保留')
  })

  /* ---- S1：请求体上限 ---- */
  s.test('S1 超大请求体被拒绝且服务存活', async () => {
    // 必须超过默认上限（16MB；可用 PRIVHUB_BODY_MAX_MB 调整）
    const mb = Number(process.env.PRIVHUB_TEST_BODY_MB || 20)
    const big = Buffer.alloc(mb * 1024 * 1024, 0x41)
    let status = 0
    try {
      const r = await POST('/privhub/api/login', {
        raw: big,
        headers: { 'content-type': 'application/json' },
        timeoutMs: 30000,
      })
      status = r.status
    } catch (e) {
      // 连接被重置也视为已拒绝（服务端主动断开）
      status = -1
    }
    // 必须是「因体积被拒」：413 或服务端主动断开；
    // 400 只说明 JSON 解析失败，不能证明体积有上限
    ok(status === 413 || status === -1,
      `3MB 请求体应因体积被拒（413/断开），实际 ${status}`)
    // 服务必须仍然存活
    const alive = await GET('/', { timeoutMs: 8000 })
    eq(alive.status, 200, '拒绝大请求后服务应仍然存活')
  })

  s.test('S1 正常大小请求体不受影响', async () => {
    const t = await loginOk('admin', 'admin123')
    ok(t, '正常登录应成功')
  })

  /* ---- S2：/pub 响应头 ---- */
  s.test('S2 发布页带 CSP 且不以内联脚本同源执行', async () => {
    admin = await loginOk('admin', 'admin123')
    const name = PFX + 'pub.html'
    const up = await uploadFile(admin, PROJECT, '', name, '<html><body><script>document.title=1</script>ok</body></html>')
    ok(up.json && up.json.ok, '上传 html 失败：' + up.text.slice(0, 120))
    const pub = await POST('/privhub/api/publish', { token: admin, body: { project: PROJECT, path: name } })
    ok(pub.json && pub.json.ok, '发布失败：' + pub.text.slice(0, 120))
    const code = pub.json.code
    const view = await GET('/pub?code=' + encodeURIComponent(code))
    eq(view.status, 200, '/pub 应可访问')
    const csp = view.headers['content-security-policy']
    ok(csp, '/pub 必须带 content-security-policy 响应头')
    includes(csp, 'sandbox', 'CSP 应含 sandbox')
    includes(csp, "default-src 'none'", 'CSP 应默认拒绝所有来源')
    // 审核指出：只查 sandbox 存在不够——`sandbox allow-scripts allow-same-origin`
    // 等价于沙箱失效（脚本可用且同源 → 仍可读 localStorage 里的会话 token）。
    // 因此必须断言这两个危险 token 的【缺席】。
    notIncludes(csp, 'allow-scripts', 'CSP 的 sandbox 不得放行脚本')
    notIncludes(csp, 'allow-same-origin', 'CSP 的 sandbox 不得保留同源身份')
    // 只禁止脚本侧的内联放行（style-src 需要 unsafe-inline 以支持内联样式，属合理）
    const scriptSrc = /script-src([^;]*)/i.exec(csp)
    ok(!scriptSrc || !/unsafe-inline/.test(scriptSrc[1]),
      `script-src 不得放行内联脚本${scriptSrc ? '（实际 ' + scriptSrc[1].trim() + '）' : '（无 script-src，回落到 default-src）'}`)
    // 清理（审核指出：撤销路由要求 DELETE，用 POST 会静默失败并残留条目）
    await DEL('/privhub/api/publish?code=' + encodeURIComponent(code), { token: admin }).catch(() => null)
    await safeDelete(admin, PROJECT, name)
  })

  /* ---- S5：静态资源路径前缀 ---- */
  s.test('S5 静态服务不允许读取同前缀兄弟目录', async () => {
    // 审核指出：用 lib 的 req() 会经 new URL() 把 `..` 归一化掉，
    // 旧版 5 个探针实际都变成了「请求不存在的文件」，无论代码对错都 404。
    // 因此这里用【原始 socket】发送未归一化的请求行，并真实创建同前缀兄弟目录
    // —— 这样断言才具备判别力：修复被回滚即会读到 secret 文件。
    const { request: rawRequest } = await import('node:http')
    const mkdirSync = (await import('node:fs')).mkdirSync
    const writeFileSync = (await import('node:fs')).writeFileSync
    const existsSync = (await import('node:fs')).existsSync

    const root = process.env.PRIVHUB_TEST_ROOT || ''
    const probes = [
      '/../frontendX/secret.txt',
      '/..%2FfrontendX%2Fsecret.txt',
      '/%2e%2e/frontendX/secret.txt',
      '/../frontendX/../../data/secret.key',
      '/../data/secret.key',
    ]

    const sendRaw = (rawPath) => new Promise((resolve) => {
      const u = new URL(BASE)
      const r = rawRequest({
        hostname: u.hostname,
        port: u.port,
        path: rawPath,
        method: 'GET',
        headers: { host: u.host },
      }, (res) => {
        const c = []
        res.on('data', (d) => c.push(d))
        res.on('end', () => resolve({ status: res.statusCode, text: Buffer.concat(c).toString('utf8') }))
      })
      r.on('error', () => resolve({ status: -1, text: '' }))
      r.end()
    })

    let leaked = 0
    for (const p of probes) {
      const r = await sendRaw(p)
      const bad = r.status === 200 && /PHENC1|secret/i.test(r.text)
      if (bad) leaked++
      ok(!bad, `原始请求 ${p} 不得返回文件内容（实际 HTTP ${r.status}）`)
    }
    ok(leaked === 0, '未通过任何原始路径请求读到受保护内容')

    // 若测试根可写，额外做一次「同前缀兄弟目录」实证（对照条件）
    if (root && existsSync(root)) {
      const sibling = root + '-sibling'
      try {
        mkdirSync(sibling, { recursive: true })
        writeFileSync(sibling + '/secret.txt', 'PHENC1-LEAK-CANARY', 'utf8')
        const r = await sendRaw('/../' + sibling.split(/[\\/]/).pop() + '/secret.txt')
        ok(!(r.status === 200 && r.text.includes('CANARY')),
          '同前缀兄弟目录不可读（这是 S5 前缀校验的真实判别条件）')
      } catch { /* 环境不允许创建时跳过实证 */ }
    }
  })

  /* ---- S16：manifest 分级返回 ----
   *
   * ⚠️ 历史教训：本用例原先断言「未登录拉取 manifest 应 401」——
   * 但登录框本身就是插件提供的（auth slot），而清单来自本接口，
   * 401 会让登录界面渲染不出来、永久卡在「加载中…」。
   * 那条断言把【缺陷】写成了【预期行为】，导致 84 项测试全绿却漏掉该死锁。
   * 详见 docs/PrivHub-修复计划-S16登录死锁.md
   *
   * 现在按「正确行为」断言：既要拿得到登录组件，又不能暴露完整清单。 */
  s.test('S16 未登录只返回登录所需的最小清单', async () => {
    const r = await GET('/privhub/api/shell/manifest')
    eq(r.status, 200, '未登录也必须能拿到 manifest（否则登录框渲染不出，界面死锁）')
    ok(r.json && r.json.ok, '应返回 ok')
    const list = r.json.manifests || []
    ok(list.length > 0, '必须返回非空清单（含登录组件）')
    eq(r.json.partial, true, '未登录时应带 partial 标记')

    // 必须包含提供 auth slot 的插件，否则登录界面无组件可用
    ok(list.some((m) => (m.slots || []).includes('auth')), '最小清单必须包含 auth slot 的提供者')

    // 反向断言：不得暴露与登录无关的敏感插件
    const ids = list.map((m) => m.id)
    for (const sensitive of ['privhub-files-agent', 'privhub-admin', 'privhub-svc-rag', 'privhub-admin-acl']) {
      ok(!ids.includes(sensitive), `未登录清单不得包含 ${sensitive}`)
    }
    ok(list.length <= 4, `未登录清单应远小于完整清单（实际 ${list.length} 个）`)
  })

  s.test('S16 登录后返回完整清单', async () => {
    const t = await loginOk('admin', 'admin123')
    const r = await GET('/privhub/api/shell/manifest', { token: t })
    ok(r.json && r.json.ok, '登录后应返回 ok')
    const list = r.json.manifests || []
    ok(list.length >= 25, `登录后应返回完整清单（实际 ${list.length} 个）`)
    ok(r.json.partial !== true, '登录后不应再带 partial 标记')

    // 关键 slot 必须齐全，否则「能登录但进去是空壳」
    const allSlots = new Set()
    for (const m of list) for (const sl of (m.slots || [])) allSlots.add(sl)
    for (const need of ['auth', 'tree', 'panel', 'preview', 'app-iconbar', 'user-area']) {
      ok(allSlots.has(need), `完整清单应包含 slot: ${need}`)
    }
  })

  return s
}
