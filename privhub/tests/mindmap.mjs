/**
 * 思维导图（`.mindmap`）常驻断言
 *
 * 覆盖四层，**从纯函数到真接口**：
 *   ① 格式：`outline.js` 的解析 / 序列化 / 树操作（CRLF、Tab、混缩进、缩进跳跃、坏行降级、
 *      往返稳定）—— 这是「人与智能体读写同一份文件」的地基，格式一漂两端立刻对不上；
 *   ② 布局：`layout.js` 的整齐树坐标不变量（列对齐、父居中、叶子有序、折叠剪枝、超宽截断）；
 *   ③ 接线：`index.js` 向宿主 viewer 契约的注册（认领的扩展名 / 优先级 / 卸载清理），
 *      以及**契约缺席时必须 console.error**（本仓 CI 禁静默降级）；
 *   ⑤ 项目视图（P2）：`list.js` 的多张管理（最小桥驱动真身：列出 / 打开 / 新建 / 改名 / 删除），
 *      外加图标栏条目与功能开关、骨架白名单的接线；
 *   ⑥ 全局图（P3）：竖栏一级入口（插在「工作台」与「智能体接入」之间、仅管理员）的**接线**
 *      （manifest / 功能开关 `mindmap.global` / 骨架白名单与渲染链 / 竖栏排序 / 服务端三件套），
 *      外加 `global.js` 的**真身**行为（最小桥）与「数据源可注入」—— 真 `editor.js` 拿注入的
 *      loader/saver 跑一遍读写，证明全局图**复用**同一个编辑器而不是第二份画布；
 *   ④ 端到端（真接口、隔离实例）：`editor.js` 的**真身**在 Node 里跑一次
 *      「打开 → 改 → 存 → 重开」——读走 `/api/preview`、写走 `/api/text/save`。
 *      `.mindmap` 必须被预览链路认成 `type:'text'`（它进了 `TEXT_EXTS`），
 *      否则查看器拿不到正文 —— 这条就是本文件最该钉住的运行期事实。
 *
 * 自给自足：自带隔离实例（端口 3191 + 测试根 `tests/.testroot-mindmap`），
 * **不碰 data/ 与 data-files/**，跑完自清。脚本自身只发 HTTP、只 import `.js`，
 * 因此**不需要** tsx（与 `write-serialization.mjs` 同类）。
 *
 *   端口账（全仓唯一的一份在这里，`media-preview.mjs` 的注释里也留了一行）：
 *     3190 run-all / 3191 本文件 / 3193 matrix / 3195 rag / 3196 preview-limits
 *     3197 file-exts·model-parsing·mcp-protocol / 3198 office-doc·json-corruption / 3199 write-serialization
 *   run-all 串行跑这些脚本，所以复用端口本来也不冲突；分开只是为了让「日志里那个端口
 *   是谁起的」一眼可查（上个版本本文件与 file-exts 都用 3197，排查时绕了一圈）。
 *
 *   node tests/mindmap.mjs
 *
 * @module tests/mindmap
 */

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync, mkdirSync, rmSync, lstatSync, unlinkSync, symlinkSync, readFileSync } from 'node:fs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const TESTROOT = join(HERE, '.testroot-mindmap')
const PORT = Number(process.env.PRIVHUB_MINDMAP_PORT || 3191)
const BASE = `http://127.0.0.1:${PORT}`
const PROJECT = '公共'
/** 生产 / 开发端口黑名单：与 run-all 同一口径，绝不指向真实数据。 */
const FORBIDDEN = new Set(['3180', '3181'])
if (FORBIDDEN.has(String(PORT))) {
  console.error('[mindmap] 拒绝执行：目标端口 ' + PORT + ' 是真实数据实例。')
  process.exit(2)
}

const P = (...segs) => join(ROOT, 'plugins', 'privhub-mindmap', 'client', ...segs)
const urlOf = (rel) => new URL('../plugins/privhub-mindmap/client/' + rel, import.meta.url).href

/* ---------------- 断言（计数器式：一条失败不中断后面几组） ---------------- */
let pass = 0
let fail = 0
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✅ ' + msg) } else { fail++; console.log('  ❌ ' + msg) }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 树深比较：`{text, children}` 的键序由构造函数固定，所以 JSON 串比较是可靠的。 */
const j = (v) => JSON.stringify(v)
const sameTree = (a, b) => j(a) === j(b)
/** 键集合的比较（对象键序里「整数键在前」这类细节不该让断言变脆）。 */
const sortedKeys = (o) => Object.keys(o || {}).sort()

/* ══════════════════════════════════════════════════════════════════════════
 * ① 格式：解析 / 序列化 / 树操作
 * ══════════════════════════════════════════════════════════════════════════ */

async function groupFormat() {
  console.log('\n── ① .mindmap 格式（纯函数） ──')
  const O = await import(urlOf('outline.js'))

  const SHAPE = `
- 私域枢纽
  - 文件中枢
    - 目录树
    - 预览
  - 协作
- 马泉斌
`
  const LF = '# 我现在有哪些项目\n' + SHAPE
  const t = O.parseOutline(LF)
  ok(t.text === '我现在有哪些项目', '首行 `# ` 认成标题（root.text）')
  ok(t.children.length === 2, '一级分支 2 条')
  ok(t.children[0].children.length === 2, '「私域枢纽」下 2 条')
  ok(t.children[0].children[0].children.map((n) => n.text).join(',') === '目录树,预览', '三级节点顺序正确')
  ok(t.children[1].text === '马泉斌' && t.children[1].children.length === 0, '叶子节点无子节点')

  ok(sameTree(O.parseOutline(LF.replace(/\n/g, '\r\n')), t), 'CRLF 与 LF 解析结果完全一致（Windows 主战场）')
  const tabTree = O.parseOutline('# T\n\t- 甲\n\t\t- 甲一\n\t- 乙\n')
  ok(tabTree.children.length === 2 && tabTree.children[0].children.length === 1,
    'Tab 缩进文件按 4 列 / 单位=4 正确分层')
  const fourTree = O.parseOutline('# T\n    - 甲\n        - 甲一\n    - 乙\n')
  ok(sameTree(tabTree, fourTree), 'Tab 与 4 空格得到同一棵树（单位自适应）')

  const star = O.parseOutline('# T\n* 甲\n+ 乙\n- 丙\n')
  ok(star.children.map((n) => n.text).join(',') === '甲,乙,丙', '`* ` / `+ ` / `- ` 三种圆点都吃')

  const blank = O.parseOutline('# T\n\n- 甲\n\n\n- 乙\n\n')
  ok(blank.children.length === 2, '空行忽略（不产生空节点）')

  /* 坏行降级：不带圆点、又缩进的东西不是合法节点，但**绝不能丢** */
  const messy = O.parseOutline('# T\n- 甲\n  这是没有圆点的一行\n- 乙\n')
  const flatMessy = O.parseOutline('# T\n- 甲\n- 这是没有圆点的一行\n- 乙\n')
  ok(messy.children[0].children[0].text === '这是没有圆点的一行',
    '没圆点的缩进行当节点（挂到更浅的祖先下，不丢内容）')
  ok(flatMessy.children.length === 3, '没圆点且无缩进的行也当节点')

  const jump = O.parseOutline('# T\n- 甲\n      - 深跳\n- 乙\n')
  const jumpCount = (n) => 1 + n.children.reduce((s, c) => s + jumpCount(c), 0)
  ok(jumpCount(jump) === 4, '缩进跳跃（0 → 三级）不丢节点（4 个节点一个不少）')
  ok(O.parseOutline('# T\n- 甲\n      - 深跳\n').children[0].children.length === 1,
    '跳跃节点挂到最近的更浅祖先下（树深仍连续）')

  const twoHead = O.parseOutline('# 标题\n- 甲\n# 不是标题\n- 乙\n')
  ok(twoHead.text === '标题', '标题只认第一处 `# `')
  ok(twoHead.children.map((n) => n.text).join(',') === '甲,# 不是标题,乙', '第二个 `# ` 行当普通节点（不吞不丢）')

  ok(j(O.parseOutline('')) === j({ text: '', children: [] }), '空文本 → 空树（不抛错）')
  ok(O.serializeOutline({ text: '', children: [] }) === '', '空树序列化回空串（不凭空造标题）')

  const canonical = O.serializeOutline(t)
  ok(canonical.split('\n')[0] === '# 我现在有哪些项目', '序列化第一行是 `# 标题`')
  ok(canonical.includes('\n- 私域枢纽\n  - 文件中枢\n    - 目录树\n'),
    '序列化用 2 空格一级 + `- ` 的规范形（根的子树顶格，每深一层多 2 空格）')
  ok(canonical.endsWith('\n'), '序列化以换行结尾（文本文件的体面）')
  const reT = O.parseOutline(canonical)
  ok(sameTree(O.serializeOutline(reT), canonical), '「解析 → 序列化」二次往返稳定（幂等）')

  /* 归一：Tab / 4 空格 / `*` 圆点文件，归一一次后与原文件**同树** */
  for (const [name, src] of [
    ['Tab', '# T\n\t- 甲\n\t\t- 甲一\n\t- 乙\n'],
    ['4 空格', '# T\n    - 甲\n        - 甲一\n    - 乙\n'],
    ['星号', '# T\n* 甲\n* 乙\n'],
  ]) {
    const once = O.serializeOutline(O.parseOutline(src))
    ok(sameTree(O.serializeOutline(O.parseOutline(once)), once), name + '缩进文件归一后语义不变（往返稳定）')
  }

  const made = O.createOutline('我的图')
  ok(made.text === '我的图' && made.children.length === 1, 'createOutline 造出「标题 + 一个中心节点」')
  ok(O.stemOf('我的图.mindmap') === '我的图' && O.stemOf('a.b.mindmap') === 'a.b', 'stemOf 只切最后一个扩展名')

  /* ── 树操作 ── */
  const base = O.parseOutline('# T\n- 甲\n  - 甲一\n- 乙\n')
  const keyRoot = O.keyOf([])
  const keyA = O.keyOf([0])
  const keyA1 = O.keyOf([0, 0])
  ok(keyRoot === '' && keyA === '0' && keyA1 === '0/0', 'keyOf / 根 key 是空串')
  ok(j(O.pathOf('0/0')) === j([0, 0]) && j(O.pathOf('')) === j([]), 'pathOf 是 keyOf 的逆')
  ok(O.nodeAt(base, [0, 0]).text === '甲一' && O.nodeAt(base, [9]) === null, 'nodeAt 越界回 null（不抛）')

  const ins = O.insertChild(base, [0], '甲二')
  ok(j(ins.path) === j([0, 1]), 'insertChild 返回新节点路径')
  ok(O.nodeAt(ins.root, [0, 1]).text === '甲二', 'insertChild 落在选中节点下')
  ok(base.children[0].children.length === 1, '树操作不改入参（返回新树）')

  const sib = O.insertSibling(base, [0], '甲前')
  ok(sib.root.children.map((n) => n.text).join(',') === '甲,甲前,乙', 'insertSibling 插在选中节点之后')
  const sibRoot = O.insertSibling(base, [], 'X')
  ok(sibRoot.root.children.length === 3, '根的「＋同级」退化为加一级分支（不抛错）')

  const rm = O.removeAt(base, [0])
  ok(rm.children.map((n) => n.text).join(',') === '乙', 'removeAt 删掉整棵子树')
  ok(O.removeAt(base, []).children.length === 2, '根不可删（原样返回）')
  ok(O.setTextAt(base, [0, 0], '  甲一改  ').children[0].children[0].text === '甲一改', 'setTextAt 改文字并去首尾空白')
  ok(O.countNodes(base) === 4 && O.countNodes(O.parseOutline('')) === 1, 'countNodes 数得对')

  return { O }
}

/* ══════════════════════════════════════════════════════════════════════════
 * ② 布局：整齐树坐标不变量
 * ══════════════════════════════════════════════════════════════════════════ */

async function groupLayout(O) {
  console.log('\n── ② 布局（整齐树不变量） ──')
  const L = await import(urlOf('layout.js'))

  const tree = O.parseOutline([
    '# 根标题',
    '- 甲',
    '  - 甲一',
    '    - 甲一甲',
    '  - 甲二',
    '- 乙',
    '- 丙',
    '',
  ].join('\n'))
  const lay = L.layoutTree(tree)
  const byKey = lay.byKey

  ok(lay.nodes.length === 7, '全部 7 个节点都进了布局（含根）')
  ok(lay.nodes.every((n) => n.key === O.keyOf(n.path)), '每个节点的 key 与 keyOf(path) 一致（画布选中可原地还原）')

  const ys = (depth) => lay.nodes.filter((n) => n.depth === depth).map((n) => n.y)
  const sorted = (a) => a.slice().sort((x, y) => x - y)
  ok(j(ys(1)) === j(sorted(ys(1))), '同层节点按纵向顺序排列（不交错）')
  const d1 = sorted(ys(1))
  const gaps = d1.slice(1).map((y, i) => y - d1[i])
  ok(gaps.every((g) => g >= 30), `同层节点纵向间距不小于节点高（最小 ${Math.min(...gaps)}）`)

  const parent = byKey.get('0')
  const kids = [byKey.get('0/0'), byKey.get('0/1')]
  ok(Math.abs(parent.y - (kids[0].y + kids[1].y) / 2) < 1e-6, '父节点垂直居中于它的子节点区间')
  const xs = new Set(lay.nodes.filter((n) => n.depth === 1).map((n) => n.x))
  ok(xs.size === 1, '同层节点左边缘对齐（列宽按该层最宽节点统一）')
  ok(byKey.get('0').x > byKey.get('').x, 'x 随层级递增（根在左）')
  ok(lay.nodes.every((n) => n.x >= 0 && n.y - n.h / 2 >= 0), '所有节点在画布内（无负坐标）')
  ok(lay.nodes.every((n) => n.x + n.w <= lay.width + 0.5 && n.y + n.h / 2 <= lay.height + 0.5),
    '画布尺寸包得住所有节点（导出 / 适应窗口靠它）')
  ok(lay.width > 0 && lay.height > 0, '画布尺寸为正')

  const colors = lay.nodes.filter((n) => n.depth === 1).map((n) => n.color)
  ok(byKey.get('').color === L.ROOT_COLOR, '根用自己的颜色')
  ok(new Set(colors).size === colors.length, '一级分支各自一色（分类一眼分得开）')
  ok(byKey.get('0/0').color === byKey.get('0').color && byKey.get('0/0/0').color === byKey.get('0').color,
    '同一支的后代沿用该支颜色（视觉上是一根枝）')

  ok(lay.links.length === lay.nodes.length - 1, '连线数 = 节点数 − 1（树边齐全）')
  ok(lay.links.every((l) => byKey.has(l.from) && byKey.has(l.to) && /^M [\d.]+ [\d.]+ C /.test(l.d)),
    '每条连线的两端都在布局里，且 d 是三次贝塞尔')

  /* 折叠：整棵子树剪掉，节点自己留下并带 folded 标记 */
  const folded = L.layoutTree(tree, new Set(['0']))
  ok(folded.nodes.length === 4, '折叠「甲」后只剩 4 个节点（根 + 甲 + 乙 + 丙，子树整棵剪掉）')
  ok(folded.byKey.get('0').folded === true && folded.byKey.get('0').childCount === 2,
    '折叠节点保留标记与子节点数（画布据此画 +N 圆点）')
  ok(!folded.byKey.has('0/0') && !folded.byKey.has('0/0/0'), '被折叠的子孙完全不在布局里')
  ok(folded.height < lay.height, '折叠后画布更矮（留白不浪费）')
  const foldObj = L.layoutTree(tree, { 0: true })
  ok(foldObj.nodes.length === 4, '折叠集合用普通对象也认（组件里存的就是对象）')

  /* 超宽截断 */
  const longText = '这是一个非常非常非常非常非常非常长的节点标题'.repeat(3)
  const longTree = O.parseOutline('# T\n- ' + longText + '\n')
  const longLay = L.layoutTree(longTree)
  const ln = longLay.byKey.get('0')
  ok(ln.text.length > ln.display.length && ln.display.endsWith('…'), '超宽节点文字被截断成……')
  ok(ln.title === ln.text, '完整文字保留在 title 里（悬停可见）')
  ok(L.textWidth(ln.display) < L.textWidth(ln.text), '截断后的估宽确实更小')
  ok(ln.w <= 280, '节点矩形宽有上限（长文本不撑破画布）')

  /* 静态 SVG 导出 */
  const svg = L.renderSvg(lay, {}, L.escXml)
  ok(svg.startsWith('<svg ') && svg.endsWith('</svg>'), 'renderSvg 出一份完整 svg 文档片段')
  ok((svg.match(/<text/g) || []).length === lay.nodes.length, 'SVG 里节点文字数与布局一致')
  const evil = L.layoutTree(O.parseOutline('# T\n- <script>alert(1)</script>\n'))
  const evilSvg = L.renderSvg(evil, {}, L.escXml)
  ok(evilSvg.includes('&lt;script&gt;') && !evilSvg.includes('<script>'), '节点文字里的标签被转义（SVG 不被注入）')
  ok(L.escXml('a"b\'c&d<e>f') === 'a&quot;b&apos;c&amp;d&lt;e&gt;f', 'escXml 五个实体都转')
  return { L }
}

/* ══════════════════════════════════════════════════════════════════════════
 * ③ 接线：viewer 注册 / 卸载清理 / 契约缺席必须出声
 * ══════════════════════════════════════════════════════════════════════════ */

async function groupWiring() {
  console.log('\n── ③ 查看器接线（宿主契约） ──')

  const logs = []
  const realError = console.error
  console.error = (...a) => { logs.push(a.join(' ')) }

  let captured = null
  let stopped = 0
  let mountedApps = 0
  let unmountedApps = 0
  const registrations = []

  globalThis.window = {
    PrivHub: {
      viewers: {
        __isViewerRegistry: true,
        register(decl) { captured = decl; registrations.push(decl); return () => { stopped++ } },
      },
    },
    Vue: {
      createApp(comp, props) {
        capturedApp = { comp, props }
        return {
          mount(el) { mountedApps++; return { $el: { parentNode: null } } },
          unmount() { unmountedApps++ },
        }
      },
    },
  }
  let capturedApp = null

  const mod = await import(urlOf('index.js'))
  const entry = mod.default
  ok(entry && entry.id === 'privhub-mindmap', '入口声明插件 id')
  const Reg = entry.slots && entry.slots['office-editor']
  ok(!!Reg && typeof Reg === 'object', '注册器挂在常驻的 office-editor 槽（不新造槽位）')
  const man = JSON.parse(readFileSync(P('manifest.json'), 'utf8'))
  /* P3 起本插件有**三个**槽（办公室查看器 / 项目视图 / 全局图），且不再是纯客户端插件 ——
   * 全局图要有服务端存储，于是多了 `src/`。下面两条断言随之更新到新契约。 */
  ok(j(man.slots) === j(['office-editor', 'mindmap', 'mindmap-global']), 'manifest 声明的槽位与入口一致（少一处就静默不加载）')
  ok(j(Object.keys(entry.slots).sort()) === j(['mindmap', 'mindmap-global', 'office-editor']),
    '入口导出的槽位与 manifest 一一对应（声明了却不导出 ⇒ 那个槽永远是空的）')
  ok(man.id === 'privhub-mindmap' && !!man.icon, 'manifest 声明 id 与图标（左栏/说明气泡要用）')
  ok(existsSync(join(ROOT, 'plugins', 'privhub-mindmap', 'src', 'index.ts')), 'P3 起有服务端：src/index.ts ⇒ 服务端挂载它（全局图的存储与路由）')

  const regThis = {}
  Reg.mounted.call(regThis)
  ok(!!captured && captured.id === 'privhub-mindmap', '向契约注册了 viewer（id 与插件同名）')
  ok(j(captured.exts) === j(['.mindmap']), '只认领 .mindmap（不与任何既有 viewer 抢扩展名）')
  ok(typeof captured.priority === 'number' && captured.priority > 100, '优先级高于契约默认值（同类扩展名时先上场）')
  ok(typeof captured.mount === 'function', '声明了 mount(hostEl, ctx)')

  /* mount：把 ctx 原样交给编辑器，并返回卸载函数 */
  const fakeHost = { appendChild() {} }
  const cleanup = captured.mount(fakeHost, { project: 'P', path: 'A/x.mindmap', name: 'x.mindmap' })
  ok(mountedApps === 1, 'mount 时挂上一棵独立 Vue 应用')
  ok(capturedApp && capturedApp.props.project === 'P' && capturedApp.props.path === 'A/x.mindmap',
    'ctx 的 project / path 传给编辑器（编辑器据此取文件）')
  ok(typeof cleanup === 'function', 'mount 返回清理函数（宿主换文件时调用）')
  cleanup()
  ok(unmountedApps === 1, '清理函数调用 app.unmount()（零残留）')

  Reg.beforeUnmount.call(regThis)
  ok(stopped === 1, '组件卸载 → 注销 viewer 声明')
  ok(regThis._stop === null, '注销后清空句柄（重复卸载不二次注销）')
  Reg.beforeUnmount.call(regThis)
  ok(stopped === 1, '重复卸载是幂等的')

  /* 契约缺席：必须 console.error，不静默降级 */
  globalThis.window = { PrivHub: {} }
  const logs2 = []
  console.error = (...a) => { logs2.push(a.join(' ')) }
  const mod2 = await import(urlOf('index.js') + '?missing-contract')
  const reg2 = {}
  mod2.default.slots['office-editor'].mounted.call(reg2)
  ok(logs2.some((s) => s.includes('viewers')), '契约缺席时 console.error 出声（不静默降级）')
  ok(reg2._stop === undefined || reg2._stop === null, '契约缺席时不留下注册句柄')

  console.error = realError
  ok(logs.length === 0, '契约正常时**不**打任何错误日志（不该拿噪声掩盖真问题）')
}

/* ══════════════════════════════════════════════════════════════════════════
 * ⑤ 项目视图（P2）：图标栏入口 + 多张管理
 *
 * 这一组不碰网络：`list.js` 依赖的一切都从 `window.PrivHub` 来，所以造一个最小桥
 * 就能把**真身**驱动起来（与 `iconbar.mjs` / `personal-ui.mjs` 同一手法）。
 * 桥里的 `api` 记账每一次调用，断言就看「调了哪个接口、带了什么体」。
 * ══════════════════════════════════════════════════════════════════════════ */

async function groupProjectView(O) {
  console.log('\n── ⑤ 项目视图（P2：知识组入口 + 多张管理） ──')

  /* ── 5a 接线：manifest 条目 / 功能开关 / 骨架白名单 ───────────────────── */
  const man = JSON.parse(readFileSync(P('manifest.json'), 'utf8'))
  const bi = man.barItems || []
  /* P3 起有两条：项目内的「知识」组一条 + 全局图「global」组一条（后者的接线在 ⑥ 里查）。 */
  const kb = bi.filter((x) => x.group === 'knowledge')
  ok(kb.length === 1 && bi.length === 2, 'manifest 声明了恰好一条「知识」组条目（另一条是全局图，见 ⑥）')
  const b = kb[0] || {}
  ok(b.group === 'knowledge', '条目落在「知识」组（与知识图谱 / 知识库同列）')
  ok(b.view === 'mindmap' && b.slot === 'panel', '条目 view=mindmap（骨架据此切 activeView 并渲染 slotComps.mindmap）')
  ok(b.capFeature === 'nav.mindmap', '条目挂了功能开关（用户侧可单独关掉这个入口）')
  ok(!!b.desc && /^\d{2}-.+\.md$/.test(b.doc || ''), '条目带说明与说明文档（悬停气泡要用）')
  ok(b.icon === '🌳', '图标是 🌳（不与「知识」大类的 🧠 撞）')

  const capSrc = readFileSync(join(ROOT, 'plugins', 'privhub-svc-cap', 'src', 'core.ts'), 'utf8')
  ok(/id:\s*'nav\.mindmap'/.test(capSrc), 'nav.mindmap 已登记进功能权限表（未登记 ⇒ 入口永远不可用）')
  const skel = readFileSync(join(ROOT, 'frontend', 'index.html'), 'utf8')
  ok(/view === 'mindmap'/.test(skel), '骨架认得 view=mindmap（不认得就点了没反应）')
  ok(/slotComps\.mindmap/.test(skel) && /activeView === 'mindmap'/.test(skel),
    '骨架渲染 slotComps.mindmap（新槽名必须落进 index.html 的渲染链）')

  /* ── 5b 行为：真身 + 最小桥 ───────────────────────────────────────────── */
  const calls = []
  const toasts = []
  let searchHits = []
  let failNext = ''
  let confirmAnswer = true
  let fakeEntries = []
  const fakeNav = {
    project: '公共', path: '', entries: [],
    openDirCalls: [], openEntryCalls: [], asked: null, askOnOk: null,
    async openDir(p, dir) {
      this.openDirCalls.push([p, dir])
      this.project = p; this.path = dir || ''; this.entries = fakeEntries
    },
    async openEntry(e) { this.openEntryCalls.push(e) },
    askInput(title, initial, onOk) { this.asked = { title, initial }; this.askOnOk = onOk; return true },
  }
  globalThis.window = {
    PrivHub: {
      AUTH: { user: { username: 'u', role: 'user' }, token: 't' },
      nav: fakeNav,
      toast: (...a) => { toasts.push(a.join(' ')) },
      confirm: () => confirmAnswer,
      async api(path, opts) {
        calls.push({ path, opts })
        if (path.startsWith('/privhub/api/search')) {
          if (failNext === 'search') return { ok: false, error: '列不出来' }
          return { ok: true, hits: searchHits }
        }
        if (failNext === 'rename' && path === '/privhub/api/rename') return { ok: false, error: '「张三」正在编辑该文件，请稍后重试' }
        return { ok: true }
      },
    },
  }

  const { MindmapListView: LV } = await import(urlOf('list.js'))
  ok(LV && LV.name === 'mindmap-list' && LV.template, 'list.js 导出项目视图组件（含 template）')
  ok(typeof LV.watch.project === 'function', '切项目时跟着换列表（watch.project）')

  const makeList = () => {
    const vm = { files: [], loading: false, error: '', q: '', busy: false }
    for (const [k, fn] of Object.entries(LV.computed)) Object.defineProperty(vm, k, { configurable: true, enumerable: true, get: fn.bind(vm) })
    for (const [k, fn] of Object.entries(LV.methods)) vm[k] = fn.bind(vm)
    return vm
  }

  searchHits = [
    { project: '公共', path: 'a.mindmap', name: 'a.mindmap', isDir: false, match: 'filename' },
    { project: '公共', path: '子/b.mindmap', name: 'b.mindmap', isDir: false, match: 'filename' },
    { project: '公共', path: 'x.mindmap.bak', name: 'x.mindmap.bak', isDir: false, match: 'filename' },
    { project: '公共', path: 'dir.mindmap', name: 'dir.mindmap', isDir: true },
  ]

  const vm = makeList()
  await vm.reload()
  ok(vm.files.length === 2, '只认后缀为 .mindmap 的文件（.mindmap.bak 与同名目录都不算）')
  ok(vm.files.some((f) => f.path === '子/b.mindmap' && f.dir === '子'), '子目录里的导图带出所在目录（列表里分得清同名文件）')
  ok(calls.some((c) => c.path.includes('q=' + encodeURIComponent('.mindmap'))),
    '列文件走搜索链（递归 + 权限过滤 + 路径复核都在那条链上，不自己递归 /api/list）')

  vm.q = '子'
  ok(vm.filtered.length === 1 && vm.filtered[0].name === 'b.mindmap', '过滤框按名称 / 目录过滤')
  vm.q = ''

  failNext = 'search'
  await vm.reload()
  ok(!!vm.error && vm.files.length === 0, '列出失败时如实报错并清空列表（不留旧数据装样子）')
  failNext = ''

  /* 挂载即列一次 */
  const vmMount = makeList()
  await LV.mounted.call(vmMount)
  ok(vmMount.files.length === 2, '挂载即列出（进页面就能看到清单，不用先点刷新）')

  /* 新建 */
  const vmNew = makeList()
  const beforeNewCalls = calls.length
  fakeNav.openDirCalls.length = 0
  await vmNew.create()
  const saveCall = calls.slice(beforeNewCalls).filter((c) => c.path === '/privhub/api/text/save').pop()
  ok(!!saveCall, '新建走 /privhub/api/text/save（不是只认 .md 的 /api/doc）')
  const saveBody = saveCall ? JSON.parse(saveCall.opts.body) : {}
  ok(saveBody.project === '公共' && /\.mindmap$/.test(saveBody.path || ''), '写进当前项目、且文件名带 .mindmap 后缀')
  const tpl = O.parseOutline(saveBody.text || '')
  ok(String(tpl.text || '').trim().length > 0 && tpl.children.length === 1 && tpl.children[0].children.length === 2,
    '新建模板能被同一套解析器解出预期形状（两个组件不各说各话）')
  ok(fakeNav.openDirCalls.length === 1, '建成即打开（跳到文件视图里的新导图）')

  /* 打开 */
  fakeEntries = [{ name: 'b.mindmap', isDir: false }]
  fakeNav.openDirCalls.length = 0
  fakeNav.openEntryCalls.length = 0
  await vm.open({ name: 'b.mindmap', path: '子/b.mindmap', dir: '子' })
  ok(j(fakeNav.openDirCalls.pop()) === j(['公共', '子']), '打开：先切到该文件所在目录')
  ok(fakeNav.openEntryCalls.length === 1 && fakeNav.openEntryCalls[0].name === 'b.mindmap',
    '打开：再选中该文件（预览区交给 P1 注册的 viewer 上场）')

  fakeEntries = []
  await vm.open({ name: 'gone.mindmap', path: 'gone.mindmap', dir: '' })
  ok(toasts.some((s) => s.includes('已定位到目录')), '文件已不在时如实提示（不假装打开了）')

  /* 改名 */
  vm.rename({ name: 'a.mindmap', path: 'a.mindmap', dir: '' })
  ok(fakeNav.asked && fakeNav.asked.initial === 'a.mindmap', '改名走骨架自己的输入框（不另造一个）')
  const relBefore = calls.filter((c) => c.path === '/privhub/api/rename').length
  await fakeNav.askOnOk('新名字')
  const renCall = calls.filter((c) => c.path === '/privhub/api/rename').pop()
  ok(calls.filter((c) => c.path === '/privhub/api/rename').length === relBefore + 1, '确认后调 /api/rename')
  ok(renCall && JSON.parse(renCall.opts.body).newName === '新名字.mindmap',
    '缺 .mindmap 后缀自动补上（改完不能变成一个没有后缀、查看器不认的文件）')

  failNext = 'rename'
  await fakeNav.askOnOk('另一个名字')
  ok(toasts.some((s) => s.includes('正在编辑')), '改名被写锁拦下时把原因透出来（不吞掉 409 的持有人说）')
  failNext = ''

  /* 删除 */
  const delBefore = calls.filter((c) => c.path === '/privhub/api/delete').length
  confirmAnswer = false
  await vm.remove({ name: 'a.mindmap', path: 'a.mindmap' })
  ok(calls.filter((c) => c.path === '/privhub/api/delete').length === delBefore, '确认框里点「取消」就不删（不替用户做决定）')
  confirmAnswer = true
  await vm.remove({ name: 'a.mindmap', path: 'a.mindmap' })
  ok(calls.filter((c) => c.path === '/privhub/api/delete').length === delBefore + 1, '确认后走 /api/delete（进回收站，可恢复）')
}

/* ══════════════════════════════════════════════════════════════════════════
 * ⑥ 全局图（P3）：竖栏一级入口（仅管理员）+ 服务端存储 + 复用同一个编辑器
 *
 * 分两半：**接线**（manifest / 功能开关 / 骨架白名单与渲染链 / 竖栏排序 /
 * 服务端路由与存储位置 —— 全是「改漏一处就静默失效」的地方），
 * **行为**（最小桥驱动 `global.js` 真身；再用真 `editor.js` 验证注入式数据源）。
 * 真接口那一半在 ④ 里（要实例），这里不碰网络。
 * ══════════════════════════════════════════════════════════════════════════ */

async function groupGlobalView(O) {
  console.log('\n── ⑥ 全局图（P3：管理员竖栏入口 + 服务端存储） ──')

  /* ── 6a 接线 ─────────────────────────────────────────────────────────── */
  const man = JSON.parse(readFileSync(P('manifest.json'), 'utf8'))
  const bi = (man.barItems || []).filter((x) => x.group === 'global')
  ok(bi.length === 1, 'manifest 里有一条 global 组条目（项目内那条仍在知识组）')
  const g = bi[0] || {}
  ok(g.view === 'mindmap-global' && g.slot === 'panel',
    '条目 view=mindmap-global（与项目视图 mindmap 分开 —— 两者同时在场，共用一个 view 名会互相顶掉）')
  ok(g.capFeature === 'mindmap.global', '条目挂了独立开关 mindmap.global')
  ok(g.icon === '🌳', '图标沿用 🌳（与项目入口同一门面）')
  ok(!!g.desc && /^\d{2}-.+\.md$/.test(g.doc || ''), '条目带说明与说明文档（悬停气泡要用）')
  ok((man.slots || []).includes('mindmap-global'), 'manifest 声明了 mindmap-global 槽')
  const entrySrc = readFileSync(P('index.js'), 'utf8')
  ok(/['"]mindmap-global['"]\s*:/.test(entrySrc), 'client/index.js 往 mindmap-global 槽注册了组件')

  const capSrc = readFileSync(join(ROOT, 'plugins', 'privhub-svc-cap', 'src', 'core.ts'), 'utf8')
  ok(/id:\s*'mindmap\.global'/.test(capSrc), 'mindmap.global 已登记进功能权限表（否则条目永远不可用）')
  const gRow = (capSrc.match(/\{[^{}]*id:\s*'mindmap\.global'[^{}]*\}/) || [''])[0]
  ok(/userDefault:\s*'none'/.test(gRow),
    '该项默认 none ⇒ 只有管理员看得见（管理员在开关表里恒为 write；这正是主人「单独一个级别」的口径）')

  const skel = readFileSync(join(ROOT, 'frontend', 'index.html'), 'utf8')
  ok(/view === 'mindmap-global'/.test(skel), '骨架白名单认得 view=mindmap-global（不认得就点了没反应）')
  ok(/slotComps\['mindmap-global'\]/.test(skel) && /activeView === 'mindmap-global'/.test(skel),
    '骨架渲染 slotComps[\'mindmap-global\']（新槽名必须落进 index.html 的渲染链）')

  /* 竖栏落点：global 组的排序数组里插在 home 与 agent 之间。 */
  const shellSrc = readFileSync(join(ROOT, 'plugins', 'privhub-shell', 'client', 'index.js'), 'utf8')
  const order = (shellSrc.match(/GLOBAL_ORDER\s*=\s*\[([^\]]*)\]/) || [])[1] || ''
  const names = order.split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
  ok(names.length === 3 && names[0] === 'home' && names[2] === 'agent',
    '竖栏全局组仍是「工作台 … 智能体接入」两个端点（不挤走既有入口）')
  ok(names[1] === 'mindmap-global', '🌳 全局导图插在两者之间（主人 2026-10-17 指定的位置）')

  /* 服务端：文件存在 + 三件套 + 路由 + 落盘位置 */
  const srv = readFileSync(join(ROOT, 'plugins', 'privhub-mindmap', 'src', 'index.ts'), 'utf8')
  const core = readFileSync(join(ROOT, 'plugins', 'privhub-mindmap', 'src', 'core.ts'), 'utf8')
  ok(/export const name\s*=/.test(srv) && /export const inject\s*=/.test(srv) && /export function apply/.test(srv),
    'src/index.ts 是合规的服务端插件（三件套齐全，main.ts 的 L3 发现靠它）')
  ok(/'cap'/.test((srv.match(/export const inject[^=]*=\s*\[([^\]]*)\]/) || [])[1] || ''),
    "inject 声明了 'cap'（用了 ctx.cap 却不声明 ⇒ 启动即挂）")
  for (const p of ['/privhub/api/mindmap/global/schema', '/privhub/api/mindmap/global']) {
    ok(srv.includes("'" + p + "'"), '服务端注册了 ' + p)
  }
  ok(/req\.method === 'DELETE'/.test(srv) && /'POST'/.test(srv), '同一条路由按方法分派 GET / POST / DELETE')
  ok(/'mindmaps'/.test(core) && /'global\.json'/.test(core), '落盘位置是 data/mindmaps/global.json（系统级，不在任何项目里）')
  ok(/requireUser/.test(srv) && /mindmap\.global/.test(srv),
    '路由自带闸门：requireUser(401) + 功能开关(403)，不指望 ACL 那条只管项目内文件的路')

  /* ── 6b 行为：global.js 真身 + 最小桥 ─────────────────────────────────── */
  const { GlobalMindmapView: GV } = await import(urlOf('global.js'))
  ok(GV && GV.name === 'mindmap-global' && GV.template, 'global.js 导出全局视图组件（含 template）')
  ok(!!(GV.components && GV.components.MindmapEditor), '它复用 P1 的 MindmapEditor（画布逻辑不重写第二份）')
  ok(/:loader="loaderFor\(editing\)"/.test(GV.template) && /:saver="saverFor\(editing\)"/.test(GV.template),
    '模板把注入式数据源接给编辑器')

  const calls = []
  const toasts = []
  let store = []
  let failNext = false
  let confirmAnswer = true
  const G_API = '/privhub/api/mindmap/global'
  const copy = (v) => JSON.parse(JSON.stringify(v))
  const fakeNav = { project: null, projectsList: ['私域枢纽', '马泉斌'], asked: null, askOnOk: null,
    askInput(title, initial, onOk) { this.asked = { title, initial }; this.askOnOk = onOk; return true } }
  const nextStore = () => {
    store = [
      { id: 'g1', title: '项目地图', text: '# 项目地图\n\n- 私域枢纽\n', createdBy: 'admin', updatedBy: 'admin', createdAt: 1, updatedAt: 2 },
      { id: 'g2', title: '团队分工', text: '# 团队分工\n\n- 开发\n- 测试\n', createdBy: 'admin', updatedBy: 'admin', createdAt: 1, updatedAt: 3 },
    ]
  }
  globalThis.window = {
    PrivHub: {
      AUTH: { user: { username: 'admin', role: 'admin' }, token: 't' },
      nav: fakeNav,
      toast: (...a) => { toasts.push(a.join(' ')) },
      confirm: () => confirmAnswer,
      async api(path, opts) {
        const method = (opts && opts.method) || 'GET'
        const body = (opts && opts.body) ? JSON.parse(opts.body) : null
        calls.push({ method, path, body })
        if (!path.startsWith(G_API)) {
          if (path.startsWith('/privhub/api/projects')) return { ok: true, projects: ['私域枢纽', '马泉斌'] }
          return { ok: false, error: '未预期的请求 ' + path }
        }
        if (failNext) { failNext = false; return { ok: false, error: '全局图仅管理员可见' } }
        const id = (new URL('http://x' + path)).searchParams.get('id')
        if (method === 'GET') {
          if (id) {
            const m = store.find((x) => x.id === id)
            return m ? { ok: true, map: copy(m) } : { ok: false, error: '这张全局导图不存在（可能已被删除）' }
          }
          return { ok: true, maps: store.map(copy), canEdit: true }
        }
        if (method === 'DELETE') {
          store = store.filter((x) => x.id !== id)
          return { ok: true, total: store.length }
        }
        if (body && body.id) {
          const m = store.find((x) => x.id === body.id)
          if (!m) return { ok: false, error: '这张全局导图不存在（可能已被删除）' }
          if (body.title) m.title = body.title
          if (body.text !== undefined) m.text = body.text
          m.updatedAt = 99
          return { ok: true, map: copy(m) }
        }
        const made = { id: 'g' + (store.length + 1), title: body.title, text: body.text, createdBy: 'admin', updatedBy: 'admin', createdAt: 9, updatedAt: 9 }
        store.push(made)
        return { ok: true, map: copy(made) }
      },
    },
  }

  /* 真身驱动器：computed → 具名 getter（与 makeEditor / personal-ui 同一手法）。 */
  const makeGlobal = () => {
    const vm = Object.assign({ $refs: {}, $nextTick: (fn) => { if (typeof fn === 'function') fn() } }, GV.data())
    for (const [k, fn] of Object.entries(GV.computed)) Object.defineProperty(vm, k, { configurable: true, enumerable: true, get: fn.bind(vm) })
    for (const [k, fn] of Object.entries(GV.methods)) vm[k] = fn.bind(vm)
    return vm
  }

  nextStore()
  const vm = makeGlobal()
  await vm.reload()
  ok(vm.maps.length === 2 && vm.error === '', '列出全部全局图')
  ok(vm.nodes(vm.maps[0]) === 2, '列表显示节点数（现算，不落盘一份可能漂移的计数）')
  vm.q = '团队'
  ok(vm.filtered.length === 1 && vm.filtered[0].title === '团队分工', '过滤框按标题过滤')
  vm.q = ''

  failNext = true
  await vm.reload()
  ok(!!vm.error && vm.maps.length === 0, '被 403 拦下时如实报错并清空列表（不装作空清单）')
  await vm.reload()
  ok(vm.error === '' && vm.maps.length === 2, '恢复后可再次列出')

  /* 打开 / 注入式数据源 */
  const m1 = vm.maps.find((x) => x.id === 'g1')
  vm.open(m1)
  ok(vm.editing && vm.editing.id === 'g1', '打开一张：进入编辑态（不新开页面，同一页内切）')
  const read = await vm.loaderFor(m1)()
  ok(read === m1.text, '编辑器读法：现取该张正文（?id= 单张读，不拖回整份清单）')
  ok(calls.some((c) => c.method === 'GET' && c.path === G_API + '?id=g1'), '…确实走的是带 ?id= 的那条')
  const w = await vm.saverFor(m1)('# 项目地图\n\n- 私域枢纽\n  - 文件中枢\n')
  ok(w && w.ok, '编辑器写法：POST 同一张（保存不另开接口）')
  const wBody = calls.filter((c) => c.method === 'POST').pop().body
  ok(wBody.id === 'g1' && /文件中枢/.test(wBody.text), '…请求体带 id 与正文')
  vm.close()
  ok(vm.editing === null, '返回列表：退出编辑态')

  /* 新建：自动把全部项目写成一级分支 */
  const beforeCreate = calls.length
  vm.create()
  ok(fakeNav.asked && fakeNav.asked.title.includes('新建全局图'), '新建走骨架自己的输入框（不另造一个）')
  await fakeNav.askOnOk('项目总览')
  await sleep(30)
  const cBody = (calls.slice(beforeCreate).find((c) => c.method === 'POST') || {}).body || {}
  ok(cBody.title === '项目总览', '按输入的标题建图')
  const cTree = O.parseOutline(cBody.text || '')
  ok(cTree.children.map((n) => n.text).join(',') === '私域枢纽,马泉斌',
    '建图时把全部项目写成一级分支（管理员的 /api/projects 就是全部项目）')
  ok(vm.maps.some((x) => x.title === '项目总览'), '建完刷新列表')
  ok(vm.editing && vm.editing.title === '项目总览', '建成即打开（建图的目的就是马上画）')

  /* 补齐项目：只增不改 */
  const beforeSync = calls.length
  await vm.syncProjects(vm.maps.find((x) => x.id === 'g1'))
  const sBody = (calls.slice(beforeSync).find((c) => c.method === 'POST') || {}).body || {}
  const sTree = O.parseOutline(sBody.text || '')
  ok(sTree.children.map((n) => n.text).join(',') === '私域枢纽,马泉斌',
    '补齐：已有的项目不重复，缺的那一个补成一级分支（只增不改）')
  ok(/私域枢纽/.test(sBody.text || ''), '…已有节点原样保留（不做「按项目列表重建」那种会冲掉手写内容的操作）')
  const noop = calls.length
  await vm.syncProjects({ id: 'g2', title: '团队分工', text: '# 团队分工\n\n- 私域枢纽\n- 马泉斌\n' })
  ok(calls.length === noop && toasts.some((s) => s.includes('已经包含全部')), '全都在图里时什么都不写，只提示')

  /* 改名 / 删除 */
  vm.rename({ id: 'g1', title: '项目地图' })
  ok(fakeNav.asked && fakeNav.asked.title.includes('重命名'), '改名走骨架输入框')
  await vm._doRename({ id: 'g1', title: '项目地图' }, '新名字')
  const rBody = calls.filter((c) => c.method === 'POST').pop().body
  ok(rBody.id === 'g1' && rBody.title === '新名字' && rBody.text === undefined,
    '改名只提交 title（不顺手把正文一起写回去 —— 只给 title 时服务端也不该动正文）')

  const delBefore = calls.filter((c) => c.method === 'DELETE').length
  confirmAnswer = false
  await vm.remove({ id: 'g1', title: '项目地图' })
  ok(calls.filter((c) => c.method === 'DELETE').length === delBefore, '确认框里点「取消」就不删')
  confirmAnswer = true
  await vm.remove({ id: 'g1', title: '项目地图' })
  const dCall = calls.filter((c) => c.method === 'DELETE').pop()
  ok(calls.filter((c) => c.method === 'DELETE').length === delBefore + 1 && /id=g1/.test(dCall.path),
    '确认后按 id 删除（全局图不在回收站，所以确认文案要说清「找不回来」）')
  ok(!vm.maps.some((x) => x.id === 'g1'), '删完刷新列表')

  /* ── 6c 注入式数据源真的被 editor.js 用上（撤掉实现即变红） ───────────── */
  const GSEED = '# 全局图\n\n- 甲\n- 乙\n'
  let savedText = null
  const { vm: ev } = await makeEditor({ project: '', path: '', name: '全局图', loader: async () => GSEED, saver: async (t) => { savedText = t; return { ok: true } } })
  ok(ev.isExternal === true, '编辑器认得「数据源是注入的」')
  await ev.load()
  ok(ev.state === 'ready' && ev.raw === GSEED, '注入 loader：不碰 /api/preview 也能读档')
  ok(!calls.some((c) => c.path.startsWith('/privhub/api/preview')), '…没走文件预览那条链（全局图不是文件）')
  ev.raw = '# 全局图\n\n- 甲\n- 乙\n- 丙\n'
  ok(ev.dirty === true, '改内容标脏')
  await ev.save()
  ok(savedText === ev.raw && ev.dirty === false, '注入 saver：保存写回的是同一个 saver，且成功后清脏')
  ok(!calls.some((c) => c.path === '/privhub/api/text/save'), '…没走文件文本保存那条链')

  delete globalThis.window
}

/* ══════════════════════════════════════════════════════════════════════════
 * ④ 端到端：隔离实例上的真接口
 * ══════════════════════════════════════════════════════════════════════════ */

function cleanRoot() {
  if (!existsSync(TESTROOT)) return
  for (const d of ['src', 'plugins', 'frontend', 'node_modules']) {
    const link = join(TESTROOT, d)
    try { if (existsSync(link) && lstatSync(link).isSymbolicLink()) unlinkSync(link) } catch { /* 忽略 */ }
  }
  try { rmSync(TESTROOT, { recursive: true, force: true }) } catch { /* 忽略 */ }
}

function prepareRoot() {
  cleanRoot()
  mkdirSync(join(TESTROOT, 'data'), { recursive: true })
  mkdirSync(join(TESTROOT, 'data-files', PROJECT), { recursive: true })
  for (const d of ['src', 'plugins', 'frontend', 'node_modules']) {
    const link = join(TESTROOT, d)
    try { if (!existsSync(link)) symlinkSync(join(ROOT, d), link, 'junction') } catch { /* 已存在或权限不足 */ }
  }
}

function startServer() {
  return spawn(process.execPath, ['--import', 'tsx/esm', 'src/main.ts', '--port', String(PORT)], {
    cwd: TESTROOT,
    env: { ...process.env, PRIVHUB_ROOT: TESTROOT, PRIVHUB_TEST_ROOT: TESTROOT },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

async function stopServer(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return
  const done = new Promise((r) => child.once('exit', r))
  child.kill()
  const t = await Promise.race([done.then(() => false), new Promise((r) => setTimeout(r, 2000))])
  if (t) { child.kill('SIGKILL'); await Promise.race([done, new Promise((r) => setTimeout(r, 1500))]) }
}

async function waitReady(ms = 60000) {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    try {
      const r = await fetch(BASE + '/privhub/api/health', { signal: AbortSignal.timeout(2000) })
      if (r.status === 200) return true
    } catch { /* 未就绪 */ }
    await sleep(300)
  }
  return false
}

/** 端口必须是**我们的**实例：真有东西在答就拒绝跑（宁可红，也不要测错对象）。 */
async function portInUse() {
  try {
    await fetch(BASE + '/privhub/api/health', { signal: AbortSignal.timeout(1200) })
    return true
  } catch { return false }
}

async function api(method, path, { token, body, headers = {} } = {}) {
  let payload
  const h = { ...headers }
  if (body !== undefined) { payload = Buffer.from(JSON.stringify(body), 'utf8'); h['content-type'] = 'application/json' }
  if (token) h.authorization = 'Bearer ' + token
  const res = await fetch(BASE + path, { method, headers: h, body: payload, signal: AbortSignal.timeout(30000) })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* 非 JSON */ }
  return { status: res.status, text, json }
}

/**
 * 把 `editor.js` 的**真身**装成一个可驱动的实例。
 *
 * 不开浏览器，只补三样它真正依赖的东西：
 *   · computed → 具名 getter（与 `personal-ui.mjs` 同一手法）；
 *   · `raw` 改成带 setter 的属性：赋值时执行组件里那句 `watch.raw`（清失效选中）；
 *   · `$nextTick` → 同步执行。
 * 于是「打开 → 改 → 存」跑的是真代码，而不是本文件重写一遍的假流程。
 */
async function makeEditor(props) {
  const { MindmapEditor: V } = await import(urlOf('editor.js'))
  const vm = {
    project: props.project, path: props.path, name: props.name || '',
    /* P3：全局图把数据源**注入**进来（loader/saver/note）—— 不传即 null，行为与 P1/P2 完全一致。 */
    loader: props.loader || null, saver: props.saver || null, note: props.note || '',
    loadedRaw: '', selected: null, folded: {}, mode: 'split',
    state: 'loading', errorMsg: '', saving: false, fitToken: 0,
    raw: '', $refs: {},
    $nextTick: (fn) => { if (typeof fn === 'function') fn() },
  }
  let raw = ''
  Object.defineProperty(vm, 'raw', {
    configurable: true, enumerable: true,
    get() { return raw },
    set(v) { raw = v; V.watch.raw.call(vm) },
  })
  for (const [k, fn] of Object.entries(V.computed)) {
    Object.defineProperty(vm, k, { configurable: true, enumerable: true, get: fn.bind(vm) })
  }
  for (const [k, fn] of Object.entries(V.methods)) vm[k] = fn.bind(vm)
  return { vm, V }
}

async function groupEndToEnd() {
  console.log('\n── ④ 端到端（隔离实例 + 真接口，读 /api/preview，写 /api/text/save） ──')

  if (await portInUse()) {
    ok(false, `端口 ${PORT} 已有服务在答 —— 拒绝在别人的实例上跑（请换 PRIVHUB_MINDMAP_PORT）`)
    return
  }
  prepareRoot()
  const child = startServer()
  let serverErr = ''
  child.stderr.on('data', (d) => { serverErr += d.toString() })
  const ready = await waitReady()
  ok(ready, `隔离实例就绪（${BASE}）`)
  if (!ready) {
    console.log(serverErr.split('\n').slice(-10).join('\n'))
    await stopServer(child)
    return
  }

  try {
    const login = await api('POST', '/privhub/api/login', { body: { username: 'admin', password: 'admin123' } })
    const token = login.json && login.json.token
    ok(!!token, '登录拿到令牌')
    if (!token) return

    /* ── 人（浏览器桥）这条链：把 editor.js 真身接到真接口上 ── */
    let prompted = null
    const toasts = []
    globalThis.window = {
      PrivHub: {
        api: (path, opts) => api(opts && opts.method ? opts.method : 'GET', path, {
          token,
          body: opts && opts.body ? JSON.parse(opts.body) : undefined,
        }).then((r) => r.json || { ok: false, error: 'HTTP ' + r.status }),
        toast: (m, t) => toasts.push((t || 'success') + ':' + m),
        nav: { askInput: (title, initial, onOk) => { onOk(prompted === null ? '新分支' : prompted); return true } },
        AUTH: { user: { name: 'admin', role: 'admin' } },
        THEME: { theme: 'light' },
      },
    }

    const NAME = 'MM端到端.mindmap'
    const PATH = NAME
    const SEED = '# 端到端导图\n\n- 一级甲\n  - 二级甲\n- 一级乙\n'

    /* 父目录不存在 ⇒ 400：文本写接口**不替你造目录**（「新建思维导图」是在既有目录里造文件）。
     * 这条钉住的是「失败可见」——若哪天改成静默 mkdir，用户拼错路径就会凭空多出目录。 */
    const badParent = await api('POST', '/privhub/api/text/save', {
      token, body: { project: PROJECT, path: '不存在的目录/x.mindmap', text: 'x' },
    })
    ok(badParent.status === 400 && badParent.json && badParent.json.ok === false,
      `父目录不存在时 400 且报错说明（status=${badParent.status}）`)

    /* 写接口：扩展名无关（这就是智能体将来写同一份文件所走的同一类通道） */
    const create = await api('POST', '/privhub/api/text/save', {
      token, body: { project: PROJECT, path: PATH, text: SEED },
    })
    ok(create.json && create.json.ok, '/api/text/save 能新建 .mindmap（扩展名无关的文本写接口）')

    const pv = await api('GET', '/privhub/api/preview?' + new URLSearchParams({ project: PROJECT, path: PATH }), { token })
    ok(pv.json && pv.json.ok && pv.json.type === 'text',
      `.mindmap 被预览链路认成 text（type=${pv.json && pv.json.type}）—— 查看器能拿到正文的前提`)
    ok(pv.json && pv.json.data === SEED, '预览回的正文与写入的逐字节一致（加解密透明）')

    const listed = await api('GET', '/privhub/api/list?' + new URLSearchParams({ project: PROJECT, path: '' }), { token })
    ok(listed.json && listed.json.ok && (listed.json.entries || []).some((e) => e.name === NAME),
      '.mindmap 出现在目录列表里（是一个普通文件，不是特例）')

    /* 编辑器真身：打开 */
    const { vm } = await makeEditor({ project: PROJECT, path: PATH, name: NAME })
    await vm.load()
    ok(vm.state === 'ready', `编辑器读档进入 ready（state=${vm.state}${vm.errorMsg ? ' / ' + vm.errorMsg : ''}）`)
    ok(vm.raw === SEED && vm.dirty === false, '读到的内容与文件一致，且未标脏')
    ok(vm.tree.text === '端到端导图' && vm.tree.children.length === 2, '编辑器解析出的树正确')
    ok(vm.selected === null, '刚打开时没有选中节点（工具条增删改此时禁用）')

    /* 编辑器真身：改（选中「一级甲」→ 加子节点） */
    vm.onSelect('0')
    ok(vm.hasSel === true && vm.canDelete === true, '选中后增删改可用')
    vm.opAddChild()
    ok(vm.raw.includes('  - 新分支\n'), '加子节点后大纲文本同步出现新行（画布与大纲同源）')
    ok(vm.dirty === true && vm.statusText.includes('未保存'), '改动后标脏（状态区提示未保存）')
    ok(vm.tree.children[0].children.map((n) => n.text).join(',') === '二级甲,新分支', '新节点落在选中节点下、同级之后')
    ok(vm.selected === '0/1', '选中跳到新节点（接着敲下一个不用重新点）')

    /* 编辑器真身：存 */
    await vm.save()
    ok(vm.dirty === false && toasts.some((s) => s.startsWith('success')), '保存成功后清脏并给出成功提示')
    const pv2 = await api('GET', '/privhub/api/preview?' + new URLSearchParams({ project: PROJECT, path: PATH }), { token })
    const pv2data = (pv2.json && pv2.json.data) || ''
    ok(pv2data === vm.raw, '存盘内容与编辑器里的一致（回读逐字节相同）')
    ok(pv2data.includes('新分支'), '磁盘上的文件确实带上了新节点')

    /* 编辑器真身：重开（往返稳定） */
    const { vm: vm2 } = await makeEditor({ project: PROJECT, path: PATH, name: NAME })
    await vm2.load()
    ok(j(vm2.tree) === j(vm.tree), '关掉重开，解析出的树完全一致（往返稳定）')

    /* 排他锁 / 接口报错：把错误如实说出来，不静默失败（Y 批的 409 契约形状） */
    const realApi = globalThis.window.PrivHub.api
    globalThis.window.PrivHub.api = async () => ({ ok: false, error: '该文件正被编辑', holder: '张三' })
    await vm.opAddChild()
    await vm.save()
    ok(vm.dirty === true, '保存失败时**不**清脏（不能假装存上了）')
    ok(vm.errorMsg.includes('张三'), `把「谁在编辑」如实说出来（errorMsg=${vm.errorMsg}）`)
    ok(toasts.some((s) => s.startsWith('error:') && s.includes('张三')), '同时给出一条 error 提示')
    globalThis.window.PrivHub.api = realApi

    /* 折叠 / 视图 / 导出（不依赖网络的几条） */
    /* 期望值从**当前树**里现算（不写死 key）：上面那段「保存失败」的用例也动过树，
     * 写死就会把「行为对了、断言错了」变成红。 */
    const expectFold = []
    ;(function walk(n, p) {
      const kids = n.children || []
      if (kids.length) expectFold.push(p.join('/'))
      kids.forEach((c, i) => walk(c, p.concat(i)))
    })(vm.tree, [])
    vm.foldAll()
    ok(sortedKeys(vm.folded).join('|') === expectFold.slice().sort().join('|') && expectFold.length > 0,
      `全折叠：把有子节点的 key 都收起来（${expectFold.length} 个，含根）`)
    vm.expandAll()
    ok(j(vm.folded) === j({}), '全展开复位')
    vm.setMode('outline')
    ok(vm.mode === 'outline' && vm.showCanvas === false, '视图切换到「只看大纲」')
    vm.setMode('split')
    ok(vm.showCanvas === true && vm.bodyClass === '', '视图切回「并排」')
    ok(vm.setMode('乱写') === undefined && vm.mode === 'split', '非法视图名被忽略（不把界面切坏）')

    /* 新建入口的模板：与插件同源，别把模板写飘 */
    const ops = readFileSync(join(ROOT, 'plugins', 'privhub-files-explorer-v3', 'client', 'ops.js'), 'utf8')
    ok(/newMindmapFile/.test(ops) && /\.mindmap/.test(ops), '「新建思维导图」入口落在 explorer-v3 的 ops.js')
    ok(/\/privhub\/api\/text\/save/.test(ops), '新建入口走 text/save（不是只认 .md 的 /api/doc）')
    const treeSrc = readFileSync(join(ROOT, 'plugins', 'privhub-files-explorer-v3', 'client', 'tree.js'), 'utf8')
    ok(/onNewMindmap/.test(treeSrc) && /新建思维导图/.test(treeSrc), '目录树的「＋」菜单里有这一项')

    /* 模板的自我一致性：入口模板与 editor 的解析口径对得上 */
    const O = await import(urlOf('outline.js'))
    const tplText = '# 未命名思维导图\n\n- 中心主题\n  - 分支一\n  - 分支二\n'
    const tplTree = O.parseOutline(tplText)
    ok(tplTree.children[0].children.length === 2, '新建入口的模板文本能被解析成预期形状（入口与格式同源）')

    /* ══ 智能体这条链：**同一份 .mindmap 智能体也读得懂、写得进**（P1 的硬要求） ══
     * 不需要任何服务端改动：写走智能体沙箱的 `/agent/v1/write`（扩展名无关），
     * 读走 `/agent/v1/read`（按文本解码，同样扩展名无关）。这里**真签一把钥匙**跑一遍 ——
     * 「纯文本格式」这条设计地基换来的最大红利就是它，值得有一条常驻断言守着。 */
    const reg = Math.random().toString(36).slice(2, 8)
    const agentUser = 'mmagent' + reg
    const agentName = '导图智能体' + reg
    await api('POST', '/privhub/api/settings', { token, body: { allowSelfRegister: true } })
    const rg = await api('POST', '/privhub/api/register', {
      body: { username: agentUser, password: 'test123456', displayName: agentName },
    })
    ok(rg.json && rg.json.ok, '注册一个带个人空间的账号（智能体的沙箱 = 它的个人空间）')
    const keyRes = await api('POST', '/privhub/api/agent/v1/keys', {
      token,
      body: { name: 'mm-' + reg, username: agentUser, scope: { kind: 'project', project: PROJECT } },
    })
    const akey = keyRes.json && keyRes.json.key
    ok(typeof akey === 'string' && akey.startsWith('pha_'), '为它签发一把 Agent 密钥')
    if (akey) {
      const agentReq = (method, p, body) => api(method, p, {
        headers: method === 'POST'
          ? { 'x-agent-key': akey, 'x-idempotency-key': 'mm-' + Math.random().toString(36).slice(2, 12) }
          : { 'x-agent-key': akey },
        body,
      })
      const AW = '# 智能体写的导图\n\n- 收集需求\n  - 访谈\n- 画原型\n'
      /* 写接口的正文键是 `content`（见 /agent/v1/schema 的 write 条目）——
       * 写成别的键服务端不报错、只是存了个 0 字节文件，正是「静默写空」的坑。 */
      const aw = await agentReq('POST', '/privhub/api/agent/v1/write', { path: 'agent-map.mindmap', content: AW })
      ok(aw.json && aw.json.ok, `智能体把 .mindmap 写进沙箱（${aw.status} ${aw.text.slice(0, 80)}）`)
      const ar = await agentReq('GET', '/privhub/api/agent/v1/read?path=' + encodeURIComponent('agent-map.mindmap'))
      ok(ar.json && ar.json.ok && ar.json.type === 'text', '智能体按文本读回 .mindmap（扩展名无关）')
      ok((ar.json && ar.json.data) === AW, '读回的内容与写入的逐字节一致（人机同一份文件）')
      /* 人这一侧也认得出智能体写的东西：同一份内容用同一套解析器解出来 */
      ok(O.parseOutline((ar.json && ar.json.data) || '').children.length === 2,
        '智能体写的导图，人的解析器解出同一棵树（格式是共同语言）')
    }

    /* ══ 全局图这条链（P3）：竖栏一级入口背后的真接口 ══
     * 它是**唯一**一张不属于任何项目的导图，也就唯一一处需要服务端存储 ——
     * 所以它的闸门（谁能看见 / 谁能改）、落盘位置、以及「只提交了哪些字段就只动哪些」
     * 必须在真接口上钉住，而不是只靠 client 侧的最小桥。 */
    const G = '/privhub/api/mindmap/global'
    const ag = await api('GET', G, { token })
    ok(ag.status === 200 && ag.json && ag.json.ok && Array.isArray(ag.json.maps) && ag.json.maps.length === 0,
      '管理员列出全局图（初始为空表）')
    ok(ag.json && ag.json.canEdit === true && ag.json.limits && ag.json.limits.maps > 0,
      '响应同时带 canEdit 与 limits（页面不用再猜自己能不能改）')

    const sc = await api('GET', G + '/schema', { token })
    ok(sc.status === 200 && sc.json && sc.json.ok && sc.json.routes && sc.json.fields,
      'schema 广播条目契约（人与智能体同一份，不读数据）')

    const GTITLE = '全局总览'
    const GTEXT = '# 全局总览\n\n- 私域枢纽\n  - 文件中枢\n- 马泉斌\n'
    const cre = await api('POST', G, { token, body: { title: GTITLE, text: GTEXT } })
    ok(cre.status === 200 && cre.json && cre.json.ok && cre.json.map && cre.json.map.id,
      '管理员新建一张（服务端生成 id）')
    const gid = cre.json && cre.json.map && cre.json.map.id
    ok(cre.json.map.createdBy === 'admin' && cre.json.map.updatedBy === 'admin',
      '新建记下创建者 / 最后写入者')
    ok(cre.json.map.text === GTEXT, '正文原样存回（服务端不做语义校验，格式的权威在 client 的解析器）')

    const one = await api('GET', G + '?id=' + encodeURIComponent(gid), { token })
    ok(one.status === 200 && one.json && one.json.map && one.json.map.text === GTEXT,
      '?id= 单独取一张（编辑器「重新载入」就走这条，不必拖回整份清单）')
    const miss = await api('GET', G + '?id=nope', { token })
    ok(miss.status === 404 && miss.json && miss.json.ok === false, '不存在的 id 是 404（不是空对象糊弄过去）')

    const upd = await api('POST', G, { token, body: { id: gid, text: '# 全局总览\n\n- 改过了\n' } })
    ok(upd.status === 200 && upd.json && upd.json.map.title === GTITLE,
      '只提交 text 时标题**不被清掉**（局部更新语义：没提交的字段一律不动）')
    ok(upd.json.map.text === '# 全局总览\n\n- 改过了\n', '…正文换成新的')
    ok(upd.json.map.updatedBy === 'admin' && upd.json.map.updatedAt >= upd.json.map.createdAt,
      '…更新时间戳与最后写入者')

    const badBody = await api('POST', G, { token, body: 'not-an-object' })
    ok(badBody.status === 400 && badBody.json && /对象/.test(badBody.json.error || ''),
      '请求体不是对象时 400 并说清楚（不默认当标题）')

    /* 落盘：位置与加密。全局图不是文件，只在 data/ 下，与任何项目无关。 */
    const gfile = join(TESTROOT, 'data', 'mindmaps', 'global.json')
    ok(existsSync(gfile), '落盘在 data/mindmaps/global.json（系统级，不在任何项目里）')
    if (existsSync(gfile)) {
      const buf = readFileSync(gfile)
      ok(buf.subarray(0, 6).toString('latin1') === 'PHENC1', '落盘内容带 PHENC1 密文头（走 storage，不落明文）')
      ok(!buf.toString('latin1').includes(GTITLE), '磁盘上读不到明文标题（确认真加密）')
    }

    /* 闸门：普通用户与匿名。user1 是隔离实例首启就种下的账号（非管理员）。 */
    const lu = await api('POST', '/privhub/api/login', { body: { username: 'user1', password: 'user123' } })
    const utoken = lu.json && lu.json.token
    ok(!!utoken, '普通用户登录（隔离实例首启种下的 user1）')
    if (utoken) {
      const uGet = await api('GET', G, { token: utoken })
      ok(uGet.status === 403 && /管理员可见/.test((uGet.json && uGet.json.error) || ''),
        '普通用户连列表都拿不到（403，不是空清单）')
      const uPost = await api('POST', G, { token: utoken, body: { title: 'x' } })
      /* 路由的读闸门先于写闸门：普通用户连「这条路由对我可见」都不成立，所以回的是
       * 「仅管理员可见」而不是「可编辑」——先过 read 那一关，写闸门在能读到之后才谈。 */
      ok(uPost.status === 403 && /仅管理员/.test((uPost.json && uPost.json.error) || ''), '普通用户新建立即 403')
      const uDel = await api('DELETE', G + '?id=' + encodeURIComponent(gid), { token: utoken })
      ok(uDel.status === 403, '普通用户删除 403')
      const still = await api('GET', G + '?id=' + encodeURIComponent(gid), { token })
      ok(still.status === 200, '…被拒之后那张图还在（拒绝不是「删了再说无权限」）')

      const capsU = await api('GET', '/privhub/api/cap/me', { token: utoken })
      const lvU = capsU.json && capsU.json.levels && capsU.json.levels['mindmap.global']
      ok(lvU === 'none', `普通用户该功能级别是 none（cap/me 实况=${lvU}）`)
    }
    const capsA = await api('GET', '/privhub/api/cap/me', { token })
    ok(capsA.json && capsA.json.levels && capsA.json.levels['mindmap.global'] === 'write',
      '管理员该功能恒为 write（表里那一列只管普通用户）')

    const noAuth = await api('GET', G)
    ok(noAuth.status === 401, '匿名 401（先要求登录，再谈开关）')

    const del = await api('DELETE', G + '?id=' + encodeURIComponent(gid), { token })
    ok(del.status === 200 && del.json && del.json.ok && del.json.total === 0, '管理员删除，返回剩余张数')
    const gone = await api('GET', G + '?id=' + encodeURIComponent(gid), { token })
    ok(gone.status === 404, '删后按 id 取不到（真删了，不在回收站）')
  } finally {
    await stopServer(child)
    cleanRoot()
  }
}

/* ══════════════════════════════════════════════════════════════════════════
 * 主体
 * ══════════════════════════════════════════════════════════════════════════ */

async function main() {
  console.log('══ 思维导图 .mindmap 常驻断言 ══')
  const { O } = await groupFormat()
  await groupLayout(O)
  await groupWiring()
  await groupProjectView(O)
  await groupGlobalView(O)
  await groupEndToEnd()

  console.log(`\n${'='.repeat(56)}`)
  console.log(`  思维导图断言：${pass} 通过 / ${fail} 失败`)
  console.log('='.repeat(56))
  process.exit(fail === 0 ? 0 : 1)
}

process.on('SIGINT', () => process.exit(130))
main().catch((e) => { console.error('测试异常：', e); process.exit(1) })
