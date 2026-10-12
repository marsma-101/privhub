/**
 * W-A 安全回归（2026-10-11）：文件级 ACL 必须在「图谱 / 全文检索 / 查重」三处生效；
 * 外加 §0.1「near 近似重复死代码」的验收，与 §2.2「frontmatter tags 进图谱」的验收。
 *
 * 为什么单独一个套件：这三处漏的是同一类问题 —— ACL 守卫（privhub-admin-acl）
 * 在 GET 上只从 query 取 project/path，而这三条路由只传 project，守卫按项目根
 * 判定（`privhub-svc-acl` 对子路径规则返回 depth -3 ⇒ 不裁决）⇒ 项目内被文件级
 * 拒绝的文件仍会以节点/边/片段/路径出现在结果里。回归必须覆盖「守卫管不到的那一段」，
 * 否则补了服务端过滤也没人拦得住它被删掉。
 *
 * 每个「摘除」断言前都先做一次**基线自证**（配规则之前三处确实都看得见），
 * 免得断言因为「文件压根没上传/没进索引」而空转成绿。
 *
 * 端口纪律：只打 3190（run-all 默认目标），由 `run-all.mjs --spawn` 拉起隔离实例。
 *
 * @module tests/acl-file-filter
 */

import {
  createSuite, ok, includes, notIncludes,
  loginOk, uploadFile, safeDelete, GET, POST, DEL,
} from './lib.mjs'

const PROJECT = process.env.PRIVHUB_TEST_PROJECT || '公共'
const PFX = '_wa_acl_'
/** 同批次唯一标记：内容与文件名都带它，避免与其它套件/历史残留互相干扰。 */
const RAND = Date.now().toString(36).slice(-6)
const TOKEN = 'waacl' + RAND

const OPEN = PFX + 'open_' + RAND + '.md'
const SECRET = PFX + 'secret_' + RAND + '.md'
const DUP_DIR = PFX + 'dup_' + RAND
const DUP_A = DUP_DIR + '/x/same_' + RAND + '.md'
const DUP_B = DUP_DIR + '/y/same_' + RAND + '.md'
/** 对照组：另一组不被 deny 的同名同大小文件，用来证明「过滤没有把查重结果整片清空」。 */
const DUP_C = DUP_DIR + '/z/other_' + RAND + '.md'
const DUP_D = DUP_DIR + '/w/other_' + RAND + '.md'
const NEAR_A = PFX + 'near_a_' + RAND + '.md'
const NEAR_B = PFX + 'near_b_' + RAND + '.md'
const NEAR_C = PFX + 'near_c_' + RAND + '.md'
/** 显式写一次标签把图谱缓存打掉：让基线断言不依赖事件时序（W-A 起 file:changed 也会失效缓存）。 */
const POKE_TAG = '_wa_poke_' + RAND

/* §2.4 反向链接：A 引用 B */
const BL_A = PFX + 'bl_a_' + RAND + '.md'
const BL_B = PFX + 'bl_b_' + RAND + '.md'

/* §2.2 frontmatter tags：两篇 .md 共享同一个 frontmatter 标签（一篇行内数组、一篇 YAML 列表） */
const FG_TAG = '_wa_fm_' + RAND
const FM_A = PFX + 'fm_a_' + RAND + '.md'
const FM_B = PFX + 'fm_b_' + RAND + '.md'
const FM_A_TEXT = '---\ntitle: 甲\ntags: [' + FG_TAG + ', 补充标签]\n---\n\n# 甲\n正文。\n'
const FM_B_TEXT = '---\ntitle: 乙\ntags:\n  - ' + FG_TAG + '\n---\n\n# 乙\n正文。\n'

/** 轮询直到条件成立（事件驱动的索引/摄取不是同步的）。 */
async function waitFor(fn, timeoutMs = 8000, stepMs = 400) {
  const deadline = Date.now() + timeoutMs
  let last = false
  while (Date.now() < deadline) {
    last = await fn()
    if (last) return true
    await new Promise((r) => setTimeout(r, stepMs))
  }
  return last
}

/** 逐级建目录（后端 createFolder 不自动补父级；已存在的中间层容忍）。 */
async function mkdirp(token, rel) {
  const parts = rel.split('/')
  let cur = ''
  for (let i = 0; i < parts.length; i++) {
    const r = await POST('/privhub/api/mkdir', { token, body: { project: PROJECT, path: cur, name: parts[i] } })
    if (i === parts.length - 1) ok(r.json && r.json.ok, `建目录 ${rel} 失败：` + r.text.slice(0, 160))
    cur = cur ? cur + '/' + parts[i] : parts[i]
  }
}

/** 项目内全部节点的 path 列表。 */
async function kgNodes(token) {
  const r = await GET('/privhub/api/kg?' + new URLSearchParams({ project: PROJECT }), { token })
  ok(r.json && r.json.ok, '图谱接口失败：' + r.text.slice(0, 160))
  return (r.json.graph?.nodes || []).map((n) => n.path)
}

/** 设置 deny 规则（role 空 = 对所有人含管理员生效）。 */
async function deny(token, path, target) {
  const r = await POST('/privhub/api/acl/policy', { token, body: { project: PROJECT, path, target, role: '', mode: 'deny' } })
  ok(r.json && r.json.ok, '设置 deny 失败：' + r.text.slice(0, 160))
}

/** 删除某路径上的全部规则，返回删除条数。 */
async function clearRules(token, path) {
  const r = await GET('/privhub/api/acl/rules', { token })
  ok(r.json && r.json.ok, '规则列表失败：' + r.text.slice(0, 160))
  let n = 0
  for (const rule of r.json.rules || []) {
    if (rule.project === PROJECT && rule.path === path) {
      const d = await DEL('/privhub/api/acl/rules', { token, body: { id: rule.id } })
      if (d.json && d.json.ok) n++
    }
  }
  return n
}

export function build() {
  const s = createSuite('文件级 ACL 过滤 + near 近似去重（W-A）')
  let token = ''

  s.test('准备：上传用例文件，并自证「配规则前三处都看得见」', async () => {
    token = await loginOk('admin', 'admin123')
    const body = '# 独角兽 ' + TOKEN + '\n\n用于全文检索与图谱写法的正文。\n'
    for (const path of [OPEN, SECRET]) {
      const up = await uploadFile(token, PROJECT, '', path, body)
      ok(up.json && up.json.ok, `上传 ${path} 失败：` + up.text.slice(0, 160))
    }
    // 查重用：同名同大小但分处两个目录（两组：一组将被 deny，一组作对照）
    await mkdirp(token, DUP_DIR + '/x')
    await mkdirp(token, DUP_DIR + '/y')
    await mkdirp(token, DUP_DIR + '/z')
    await mkdirp(token, DUP_DIR + '/w')
    const dupBody = '# 重复样本 ' + TOKEN + '\n正文一字不差。\n'
    const dupBody2 = '# 对照样本 ' + TOKEN + '\n另一组内容相同但名字不同。\n'
    for (const [p, body] of [[DUP_A, dupBody], [DUP_B, dupBody], [DUP_C, dupBody2], [DUP_D, dupBody2]]) {
      const dir = p.slice(0, p.lastIndexOf('/'))
      const name = p.slice(p.lastIndexOf('/') + 1)
      const up = await uploadFile(token, PROJECT, dir, name, body)
      ok(up.json && up.json.ok, `上传 ${p} 失败：` + up.text.slice(0, 160))
    }
    // 打掉 KG 图缓存（否则基线断言会看到"上传前"的旧图）
    const poke = await POST('/privhub/api/meta/tags', { token, body: { project: PROJECT, path: OPEN, tags: [POKE_TAG] } })
    ok(poke.json && poke.json.ok, '打缓存用的标签写入失败：' + poke.text.slice(0, 160))

    // 基线 1：图谱两篇都在
    const nodes = await kgNodes(token)
    ok(nodes.includes(OPEN) && nodes.includes(SECRET), `图谱基线应含两篇（实测 ${JSON.stringify(nodes).slice(0, 200)}）`)

    // 基线 2：全文检索两篇都能命中（事件驱动，轮询等索引）
    const ftOk = await waitFor(async () => {
      const r = await GET('/privhub/api/fulltext/search?' + new URLSearchParams({ q: TOKEN, project: PROJECT }), { token })
      const paths = (r.json?.hits || []).map((h) => h.path)
      return paths.includes(OPEN) && paths.includes(SECRET)
    })
    ok(ftOk, '全文检索基线应命中两篇（等 8s 仍未索引到 —— 若如此，后面的"摘除"断言就是空转）')

    // 基线 3：查重能看到同名同大小的一组
    const dupOk = await waitFor(async () => {
      const r = await GET('/privhub/api/rag/dup?' + new URLSearchParams({ project: PROJECT }), { token })
      const g = (r.json?.fileGroups || []).find((x) => x.files.some((f) => f.path === DUP_A))
      return !!(g && g.files.some((f) => f.path === DUP_B))
    })
    ok(dupOk, '查重基线应把两份同名同大小文件归到一组')
  })

  s.test('配 deny 后：图谱节点、边、洞察里都不再有被拒文件', async () => {
    await deny(token, SECRET, 'file')
    const nodes = await kgNodes(token)
    ok(!nodes.includes(SECRET), '被 ACL 拒绝的文件不得作为图谱节点出现')
    ok(nodes.includes(OPEN), '未被拒绝的对照文件应仍然在图上（否则是"整图空了"的假通过）')
    // 洞察（hubs/topTags）由节点派生，也必须一并重算 —— 用整包字符串兜底检查
    const r = await GET('/privhub/api/kg?' + new URLSearchParams({ project: PROJECT }), { token })
    notIncludes(JSON.stringify(r.json.graph), SECRET, '被拒文件名不得从洞察/边等任何字段漏出')
  })

  s.test('配 deny 后：全文检索不再返回被拒文件的片段', async () => {
    const r = await GET('/privhub/api/fulltext/search?' + new URLSearchParams({ q: TOKEN, project: PROJECT }), { token })
    const paths = (r.json?.hits || []).map((h) => h.path)
    ok(!paths.includes(SECRET), '被拒文件的片段不得出现在全文命中里')
    ok(paths.includes(OPEN), '对照文件应仍然命中（证明过滤不是"把结果清空"）')
  })

  s.test('配 deny 后：查重结果不再列出被拒文件（文件层与内容层都不能漏）', async () => {
    await deny(token, DUP_B, 'file')
    const r = await GET('/privhub/api/rag/dup?' + new URLSearchParams({ project: PROJECT }), { token })
    ok(r.json && r.json.ok, '查重接口失败：' + r.text.slice(0, 160))
    const all = [
      ...(r.json.fileGroups || []).flatMap((g) => g.files.map((f) => f.path)),
      ...(r.json.contentGroups || []).flatMap((g) => g.files.map((f) => f.path)),
    ]
    ok(!all.includes(DUP_B), '被拒文件不得以任何形式出现在查重结果里')
    // 该组被摘到只剩 1 份 ⇒ 不再构成"同名同大小的一对"，整组消失（这是设计行为）
    ok(!all.includes(DUP_A), '同组里被拒文件摘掉后，剩下的那份不再是重复 ⇒ 整组应消失')
    ok(all.includes(DUP_C) && all.includes(DUP_D), '另一组未被 deny 的重复必须仍在结果里（证明过滤没有整片清空）')
  })

  s.test('撤规则后恢复可见（可逆：过滤读的是规则，不是把文件藏起来了）', async () => {
    const n1 = await clearRules(token, SECRET)
    ok(n1 > 0, '应删掉至少一条规则（否则"恢复"无从谈起）')
    const nodes = await kgNodes(token)
    includes(nodes, SECRET, '撤掉规则后图谱节点应恢复')
  })

  s.test('near 近似重复：高度相似但非一字不差的文档要被报出，且不误报无关文档', async () => {
    // 共享 40 行正文，各多一行不同内容 → dupHash 不同（不是精确重复），但 MinHash 高度一致。
    // 正文里必须带 RAND：否则两次运行内容逐字节相同，语料库按内容去重会把本次摄取判成
    // 「没变化」而跳过，自证断言就会莫名其妙少一篇（实测坑，2026-10-11）。
    const shared = Array.from({ length: 40 }, (_, i) => `第 ${i} 行：近似去重测试的共享正文 ${RAND}，包含足够多字符以便 MinHash 产生稳定指纹。`).join('\n')
    const cases = [
      [NEAR_A, '# 甲\n' + shared + '\n差异行：甲\n'],
      [NEAR_B, '# 乙\n' + shared + '\n差异行：乙\n'],
      [NEAR_C, '# 丙\n完全不相关的内容：' + TOKEN + ' 讲的是另一件事，用于确认近似判定不会误报。\n'],
    ]
    for (const [path, text] of cases) {
      const up = await uploadFile(token, PROJECT, '', path, text)
      ok(up.json && up.json.ok, `上传 ${path} 失败：` + up.text.slice(0, 160))
      // 显式摄取：不依赖事件队列的时机，用例可重复
      const ig = await POST('/privhub/api/rag/ingest', { token, body: { project: PROJECT, path } })
      ok(ig.json && ig.json.ok, `摄取 ${path} 失败：` + ig.text.slice(0, 160))
    }
    const A = PROJECT + '::' + NEAR_A
    const B = PROJECT + '::' + NEAR_B
    const C = PROJECT + '::' + NEAR_C
    // 自证：三篇确实进了语料库，否则下面的 near 断言是空转。
    // 轮询预算给到 20s：摄取走 svc-rag 的**串行队列**，而每次 ingestDoc 会把整份
    // manifest 重写两遍（svc-rag/src/index.ts:1202 入队、:418/:426 两次 saveManifest），
    // 语料库一大就慢；且服务启动 8s 时还有一次全量 rebuild（同文件 :1242）压在同一队列上。
    // 用 8s 预算时实测过「命中 2/3」的假失败——那是排队没跑完，不是功能坏了。
    let ids = []
    const ingested = await waitFor(async () => {
      const corpus = await GET('/privhub/api/rag/corpus?' + new URLSearchParams({ project: PROJECT }), { token })
      ids = (corpus.json?.docs || []).map((d) => d.docId)
      return [A, B, C].every((id) => ids.includes(id))
    }, 20000)
    ok(ingested, `三篇都应已摄取（实测 A/B/C 命中 ${[A, B, C].filter((id) => ids.includes(id)).length}/3）`)
    const r = await GET('/privhub/api/rag/pending', { token })
    ok(r.json && r.json.ok, '待裁决清单失败：' + r.text.slice(0, 160))
    const near = (r.json.groups || []).filter((g) => g.kind === 'near')
    const hit = near.find((g) => g.docs.some((d) => d.docId === A))
    ok(!!hit, `近似重复应被报出（near 组数=${near.length}；实为 ${JSON.stringify(near.map((g) => g.docs.map((d) => d.docId)))}）—— 迁前 score 写死 0.25 < 阈值 0.275，near 恒空`)
    ok(hit.docs.some((d) => d.docId === B), '高度相似的 B 应和 A 同组')
    ok(!hit.docs.some((d) => d.docId === C), '内容无关的 C 不得被判为近似（误报）')
  })

  s.test('§2.2 frontmatter 的 tags 要进图谱（行内数组 + YAML 列表两种写法）', async () => {
    for (const [path, text] of [[FM_A, FM_A_TEXT], [FM_B, FM_B_TEXT]]) {
      const up = await uploadFile(token, PROJECT, '', path, text)
      ok(up.json && up.json.ok, `上传 ${path} 失败：` + up.text.slice(0, 160))
    }
    const fetchGraph = async () => {
      const r = await GET('/privhub/api/kg?' + new URLSearchParams({ project: PROJECT }), { token })
      return r.json?.graph || { nodes: [], edges: [] }
    }
    // 自证：两篇都上了图（否则下面的标签断言是空转）
    const onGraph = await waitFor(async () => {
      const g = await fetchGraph()
      const paths = (g.nodes || []).map((n) => n.path)
      return paths.includes(FM_A) && paths.includes(FM_B)
    })
    ok(onGraph, '两篇 .md 都应先作为节点出现')

    const g = await fetchGraph()
    const a = (g.nodes || []).find((n) => n.path === FM_A)
    const b = (g.nodes || []).find((n) => n.path === FM_B)
    includes(a?.tags || [], FG_TAG, `frontmatter 行内数组 tags 应进入节点标签（实测 ${JSON.stringify(a?.tags)}）`)
    includes(b?.tags || [], FG_TAG, `frontmatter YAML 列表 tags 应进入节点标签（实测 ${JSON.stringify(b?.tags)}）`)
    // 验收标准原文：「手写 frontmatter tags 保存后，图谱里该文件立刻连到该标签团」
    const joined = (g.edges || []).some((e) => e.type === 'tag'
      && [e.source, e.target].includes(FM_A) && [e.source, e.target].includes(FM_B))
    ok(joined, '两篇共享同一个 frontmatter 标签 ⇒ 应有一条 tag 共现边（否则「连到标签团」没发生）')
    ok(!g.truncated, '这么小的项目不该被规模保护截断（会误伤正常项目的"保护"等于故障）')
  })

  s.test('§2.4 反向链接：A 引用 B，B 的反链能看到 A（引用方逐个过 ACL）', async () => {
    const upA = await uploadFile(token, PROJECT, '', BL_A, '# 甲\n本文引用了 [[' + BL_B + ']] 这一篇。\n')
    const upB = await uploadFile(token, PROJECT, '', BL_B, '# 乙\n被引用的正文。\n')
    ok(upA.json && upA.json.ok && upB.json && upB.json.ok, '上传反链用例文件')

    const bl = (p) => GET('/privhub/api/kg/backlinks?' + new URLSearchParams({ project: PROJECT, path: p }), { token })

    // 自证：A → B 的 link 边已建立，否则下面的反链断言全是空转
    const linked = await waitFor(async () => {
      const g = await GET('/privhub/api/kg?' + new URLSearchParams({ project: PROJECT }), { token })
      return (g.json?.graph?.edges || []).some((e) => e.type === 'link' && e.source === BL_A && e.target === BL_B)
    })
    ok(linked, '自证：A → B 的双链边已建立（等 8s 仍无 ⇒ 后面的反链断言是空转）')

    const rB = await bl(BL_B)
    ok(rB.json && rB.json.ok, '反链接口可用：' + rB.text.slice(0, 160))
    const inB = rB.json?.incoming || []
    ok(inB.some((x) => x.path === BL_A), `B 的反链里应有 A（实测 ${JSON.stringify(inB.map((x) => x.path))}）`)
    ok(inB.some((x) => x.path === BL_A && x.snippet.includes('bl_b')), '反链条目带来源里的那一行摘要（打开面板就知道"哪一句引用了我"）')
    ok((rB.json?.outgoing || []).length === 0, 'B 没有出链（入链与出链不能搞反）')

    const rA = await bl(BL_A)
    ok((rA.json?.outgoing || []).some((x) => x.path === BL_B), 'A 的出链里应有 B')

    // 关键安全断言：引用方被 ACL 拒绝后，它的名字与摘要在反链里都不能再出现
    await deny(token, BL_A, 'file')
    const rB2 = await bl(BL_B)
    ok(rB2.json && rB2.json.ok, '拒绝 A 之后 B 的反链接口仍可用')
    ok(!(rB2.json?.incoming || []).some((x) => x.path === BL_A), '被拒绝的引用方不得出现在反链里（否则是一条绕过文件 ACL 的读取旁路）')
    notIncludes(rB2.text, BL_A, '被拒文件名不得从反链响应的任何字段漏出')

    // 守卫：对被拒文件自身查询反链应被拦下（这条路由必须进 GUARD_PATHS）
    const rDenied = await bl(BL_A)
    ok(rDenied.status === 403, `对无权限文件查询反链应被拒（实际 ${rDenied.status}）`)
    await clearRules(token, BL_A)
  })

  s.test('清理：撤标签、删规则、删用例文件与目录', async () => {
    // 先撤规则再删文件：deny 规则（action 空）连 delete 一起拒，否则清理会失败
    for (const p of [SECRET, DUP_B, BL_A]) await clearRules(token, p)
    await POST('/privhub/api/meta/tags', { token, body: { project: PROJECT, path: OPEN, tags: [] } }).catch(() => null)
    for (const p of [OPEN, SECRET, DUP_A, DUP_B, DUP_C, DUP_D, NEAR_A, NEAR_B, NEAR_C, FM_A, FM_B, BL_A, BL_B,
      DUP_DIR + '/x', DUP_DIR + '/y', DUP_DIR + '/z', DUP_DIR + '/w', DUP_DIR]) {
      await safeDelete(token, PROJECT, p)
    }
    const nodes = await kgNodes(token)
    ok(!nodes.includes(SECRET), '清理后被拒文件不应留在图谱里')
  })

  return s
}

export default build
