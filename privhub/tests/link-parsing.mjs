/**
 * 双链解析 + 链接登记表回归（privhub-svc-links，Q4 / §2.6）
 *
 * 为什么单独有这个文件：`[[…]]` 的口径过去在 5 个文件里各写一份，任何一处漂移都会
 * 造成"图谱里有这条边、引用检查里却报断链"这种自相矛盾。现在服务端三处共用
 * `linkparse.ts`，浏览器端两处保留字面量并由 integrity.mjs 钉住唯一性 ——
 * 本套件负责**口径本身**（解析 + 改名不断链的解析顺序），integrity 负责**没有第二份**。
 *
 * 断言原则：**指向行为** —— 断言"改名后 [[旧名]] 仍解到新路径""id: 直取""同名优先同目录"，
 * 不断言正则实现或内部 Map 结构。
 *
 * 自给自足：进程内挂真实 LinkService + 最小 storage/eventBus 桩，**不连服务、不碰真实 data/**。
 * 落盘目录 `tests/.testroot-links`。存储桩写真明文（只验 JSON 语义与解析，不验加密；
 * 加密那半由 HTTP 套件 link-id.mjs 断言 PHENC1 头）。
 *
 *   node --import tsx/esm tests/link-parsing.mjs
 *
 * @module tests/link-parsing
 */

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs'
import { Context, Service } from '@deepseek-ai/cordis'

const HERE = dirname(fileURLToPath(import.meta.url))
const TESTROOT = join(HERE, '.testroot-links')

let pass = 0
let fail = 0
const failures = []
function ok(cond, msg) {
  if (cond) { pass++ } else { fail++; failures.push(msg) }
  console.log((cond ? '  ✅ ' : '  ❌ ') + msg)
}

/* 必须先设定根目录再 import（svc-links 在模块加载时读 PRIVHUB_ROOT 定根） */
rmSync(TESTROOT, { recursive: true, force: true })
mkdirSync(join(TESTROOT, 'data'), { recursive: true })
process.env.PRIVHUB_ROOT = TESTROOT

const parse = await import('../plugins/privhub-svc-links/src/linkparse.ts')
const core = await import('../plugins/privhub-svc-links/src/core.ts')
const svcMod = await import('../plugins/privhub-svc-links/src/index.ts')
const { WIKI_LINK_RE, ID_PREFIX, normalizeLinkTarget, parseWikiLinks, wikiLinkTargets } = parse
const { normalizePath, nameOf, dirOf, newId, normalizeStore, pickCandidate, pushAlias, buildLiveIndex, MAX_ALIASES } = core
const { LinkService } = svcMod

/* ================= 一、目标规范化（纯函数） ================= */

console.log('\n── 1. 目标规范化：锚点/尖括号/分隔符/外链 ──')
const nt = (s) => normalizeLinkTarget(s)

ok(nt('  a.md  ').target === 'a.md', '首尾空白被 trim')
ok(nt('a.md#块名').target === 'a.md' && nt('a.md#块名').anchor === '块名', '`#锚点` 被切出，目标只剩文件名')
ok(nt('a.md#块#二').anchor === '块#二', '只认第一个 #：块名里的 # 不再切')
ok(nt('a.md#').anchor === null, '空锚点归一为 null')
ok(nt('<a.md>').target === 'a.md', '`<>` 包裹被剥掉（Obsidian 风格）')
ok(nt('sub\\a.md').target === 'sub/a.md', '反斜杠转正斜杠（Windows 手写路径）')
ok(nt('./a.md').target === 'a.md' && nt('/a.md').target === 'a.md', '前导 `./` 与 `/` 去掉')
ok(nt('https://x/y').target === '' && nt('https://x/y').id === null, '外链接视为无目标（不造出假边）')
ok(nt('mailto:a@b').target === '', '`scheme:` 一律当外链')
ok(nt('').target === '' && nt('.').target === '' && nt('..').target === '', '空串 / `.` / `..` 归空')
ok(nt('id:Lx7f').id === 'Lx7f' && nt('id:Lx7f').target === '', '`id:` 前缀被识别为稳定 ID 写法')
ok(nt('id:').id === null && nt('id:').target === '', '空 `id:` 归一为无目标')
ok(nt('id:Lx7f#块').id === 'Lx7f' && nt('id:Lx7f#块').anchor === '块', 'ID 写法也能带锚点')

/* ================= 二、双链解析（纯函数） ================= */

console.log('\n── 2. 双链解析：别名 / 锚点 / 位置 / 误写 ──')
const wl = parseWikiLinks('见 [[a.md]] 与 [[b.md|乙名]] 和 [[c.md#块]]，还有 [[id:L9|甲]]。')
ok(wl.length === 4, '解出 4 条双链（实测 ' + wl.length + '）')
ok(wl[0].target === 'a.md' && wl[0].alias === null, '`[[a.md]]` 目标正确、无别名')
ok(wl[1].target === 'b.md' && wl[1].alias === '乙名', '`[[b.md|乙名]]` 目标与别名分别取出（不能因别名丢掉目标）')
ok(wl[2].target === 'c.md' && wl[2].anchor === '块', '`[[c.md#块]]` 锚点被剥、目标保留')
ok(wl[3].id === 'L9' && wl[3].alias === '甲', '`[[id:L9|甲]]` 走 ID 写法且带别名')
ok(wl[0].index === 2, '给出起始下标（refcheck 要用它指回原文行号）')
ok(wl[1].raw === 'b.md|乙名', 'raw 保留括号内原文（含别名）')
ok(parseWikiLinks('[[a.md]]').length === 1 && parseWikiLinks('a.md').length === 0, '普通文本不误判为双链')
ok(parseWikiLinks('[[]]').length === 0 || parseWikiLinks('[[]]')[0].target === '', '空 `[[]]` 不产生有意义目标')
ok(parseWikiLinks('[[未闭合').length === 0, '未闭合的 `[[` 不匹配（不会吃掉半篇文档）')
ok(parseWikiLinks('[[a.md]] [[a.md]]').length === 2, '重复出现各算一条（去重交给消费者）')
ok(JSON.stringify(wikiLinkTargets('[[a.md|x]] [[id:L1]] [[https://y]]')) === JSON.stringify(['a.md']),
  'wikiLinkTargets 只回非空目标（id:/外链不混进来）')

/* 正则必须是共享同一实例语义：全局正则不能靠 exec 复用（lastIndex 会漏） */
ok(WIKI_LINK_RE.global === true, '权威正则带 g 标志')

/* ================= 三、登记表纯逻辑 ================= */

console.log('\n── 3. 登记表纯逻辑：路径 / 形状 / 选优 / 别名 ──')
ok(normalizePath('sub\\a.md') === 'sub/a.md' && normalizePath('./x/') === 'x/', '路径统一为正向斜杠、去前导 ./')
ok(nameOf('a/b/c.md') === 'c.md' && nameOf('c.md') === 'c.md', 'nameOf 取末段')
ok(dirOf('a/b/c.md') === 'a/b' && dirOf('c.md') === '', 'dirOf 取目录，根目录为空串')

const ids = new Set()
for (let i = 0; i < 500; i++) ids.add(newId())
ok(ids.size === 500, '500 次 newId 无重复（ID 不复用是"改名不断链"的前提）')

ok(normalizeStore(null).entries.length === 0, 'normalizeStore(null) → 空表')
ok(normalizeStore({ entries: 'x' }).entries.length === 0, 'entries 非数组 → 空表')
const ns = normalizeStore({ entries: [
  { id: 'L1', project: 'P', path: 'a.md', name: 'a.md', aliases: ['旧.md'], at: 5 },
  { id: '', project: 'P', path: 'b.md' },          // 空 id → 丢
  { id: 'L2', project: 'P' },                       // 缺 path → 丢
  'garbage',                                        // 非对象 → 丢
  { id: 'L3', project: 'P', path: 'sub\\c.md' },    // 缺 name → 用 nameOf 兜底
] })
ok(ns.entries.length === 2, '形状裁决：只留合法条目（实测 ' + ns.entries.length + '）')
ok(ns.entries[1].path === 'sub/c.md' && ns.entries[1].name === 'c.md', '缺 name 用规范路径兜底，路径也被规范化')
ok(normalizeStore({ entries: [{ id: 'L4', project: 'P', path: 'd.md', aliases: Array.from({ length: 30 }, (_, i) => 'a' + i) }] }).entries[0].aliases.length === MAX_ALIASES,
  '别名截断到上限（防病态改名刷爆条目）')

ok(pickCandidate(['a/x.md', 'b/x.md'], 'b/y.md') === 'b/x.md', '同名多命中优先与引用方同目录')
ok(pickCandidate(['a/x.md', 'b/x.md']) === 'a/x.md', '无来源时取第一个（确定性）')
ok(pickCandidate(['a/x.md'], 'z/y.md') === 'a/x.md', '只有一个候选时直接用，不看目录')
ok(pickCandidate([]) === null, '无候选回 null')

const aliased = pushAlias(pushAlias([], 'n.md'), 'n.md')
ok(aliased.length === 1 && aliased[0] === 'n.md', 'pushAlias 去重（同名改回不重复堆）')
ok(pushAlias(['n.md'], 'm.md')[0] === 'm.md', '新别名放最前（最近退役在前）')

const live = buildLiveIndex(['sub/a.md', 'a.md', 'x/y.md'])
ok(live.pathSet.has('sub/a.md') && live.pathSet.has('a.md'), 'live 索引收全部现存路径')
ok(live.byName.get('a.md').length === 2, 'byName 同名多目录时给多个路径')
ok(buildLiveIndex(['']).pathSet.size === 0, '空路径不进 live 索引')

/* ================= 四、真实 LinkService（进程内挂生产本体） ================= */

console.log('\n── 4. 登记 + 改名不断链（挂真实 LinkService） ──')

class StubStorage extends Service {
  constructor(c) { super(c, 'storage') }
  readText(f) { return Promise.resolve(readFileSync(f, 'utf8')) }
  writeText(f, d) { writeFileSync(f, d, 'utf8'); return Promise.resolve() }
}
class StubEvents extends Service {
  constructor(c) { super(c, 'eventBus') }
  declareListen() { /* 仅记录用途，本套件直接 ctx.emit 驱动 */ }
}

const STORE = join(TESTROOT, 'data', 'links.json')
const ctx = new Context()
new StubStorage(ctx)
new StubEvents(ctx)
await ctx.plugin({ name: svcMod.name, inject: svcMod.inject, apply: svcMod.apply }, { file: STORE })
const links = ctx.links
await links.ready
ok(links instanceof LinkService, '进程内挂出真实 LinkService（用的就是生产代码本体）')

/* 4.1 登记 */
const idB = links.register('P', 'sub/b.md')
links.register('P', 'a.md')
ok(typeof idB === 'string' && idB.startsWith('L'), '注册返回稳定 ID（实测 ' + idB + '）')
ok(links.idOf('P', 'sub/b.md') === idB, 'idOf 按路径取回同一 ID')
ok(links.register('P', 'sub/b.md') === idB, '重复注册返回同一 ID（幂等）')
ok(links.count('P') === 2, '项目内条目计数正确')

/* 4.2 文件名解析（含 .md 自动补、同名优先同目录、活文件并集） */
let lv = buildLiveIndex(['sub/b.md', 'a.md'])
ok(links.resolveTarget('P', 'b.md', { live: lv }) === 'sub/b.md', '按文件名解析到现存路径')
ok(links.resolveTarget('P', 'sub/b.md', { live: lv }) === 'sub/b.md', '完整路径写法直接命中')
ok(links.resolveTarget('P', 'nope.md', { live: lv }) === null, '不存在且未登记 → null（不造边）')
ok(links.resolveTarget('P', 'a', { live: buildLiveIndex(['a.md']) }) === 'a.md', '不带扩展名时补 .md 命中现存文件')

/* 同名多目录：优先与来源同目录 */
links.register('P', 'other/b.md')
lv = buildLiveIndex(['sub/b.md', 'other/b.md'])
ok(links.resolveTarget('P', 'b.md', { live: lv, sourcePath: 'other/z.md' }) === 'other/b.md',
  '同名多命中：优先解到与引用方同目录的那个')

/* 4.3 改名 → 别名 → 旧名仍解到新路径（这就是验收的那条） */
const idDesign = links.register('P', 'docs/设计.md')
ok(links.idOf('P', 'docs/设计.md') === idDesign, '改名前的路径已登记')
await links.renamed('P', 'docs/设计.md', 'docs/概要.md')
ok(links.pathOf('P', idDesign) === 'docs/概要.md', '条目搬到新路径（ID 不变）')
ok(links.idOf('P', 'docs/设计.md') === null, '旧路径不再是现名')
ok(links.resolveTarget('P', '设计.md', { live: buildLiveIndex(['docs/概要.md']) }) === 'docs/概要.md',
  '★★★★ 改名后 [[旧名]] 仍解到新路径（图谱边 / 反链不断的根本）')
ok(links.resolveTarget('P', '概要.md', { live: buildLiveIndex(['docs/概要.md']) }) === 'docs/概要.md',
  '新名同样能解到')
ok(links.lookup('P', '设计.md') === 'docs/概要.md', 'lookup 走登记表（不看磁盘）也认旧名')
ok(JSON.stringify(links.namesOf('P', 'docs/概要.md')) === JSON.stringify(['概要.md', '设计.md']),
  'namesOf 给出「现名 + 退役别名」（反链摘要据此匹配正文里的老写法）')
ok(JSON.stringify(links.namesOf('P', 'docs/没登记.md')) === JSON.stringify(['没登记.md']),
  'namesOf 对未登记路径退回现名（不报错）')

/* 4.4 目录改名：子项路径前缀一并搬迁 */
links.register('P', 'old/x.md')
links.register('P', 'old/sub/y.md')
await links.renamed('P', 'old', 'new')
ok(links.idOf('P', 'new/x.md') !== null && links.idOf('P', 'new/sub/y.md') !== null,
  '目录改名：直接子项与新深度的孙项都搬到新前缀')
ok(links.idOf('P', 'old/x.md') === null, '旧前缀下不再有现名')

/* 4.5 id: 写法（服务端认，界面不生成） */
ok(links.resolveTarget('P', 'id:' + idB, { live: buildLiveIndex(['sub/b.md']) }) === 'sub/b.md',
  '`[[id:…]]` 直接取到当前路径')
ok(links.resolveTarget('P', 'id:L没人', { live: lv }) === null, '未知 ID → null')
ok(links.lookup('P', 'id:' + idDesign) === 'docs/概要.md', 'lookup 支持 id: 写法')

/* 4.6 lookup 可能给出已不存在的路径（调用方必须自行校验存在性 —— refcheck 靠它不误报断链） */
links.register('P', 'gone.md')
const gonePath = links.lookup('P', 'gone.md')
ok(gonePath === 'gone.md' && links.resolveTarget('P', 'gone.md', { live: buildLiveIndex([]) }) === null,
  'lookup 回到登记路径、resolveTarget 带 live 时因不存在而拒（存在性校验在调用方）')

/* 4.7 落盘 + 重新载入：别名要活过重启 */
await links.flush()
ok(existsSync(STORE), 'flush 把登记表落盘')
const ctx2 = new Context()
new StubStorage(ctx2)
new StubEvents(ctx2)
await ctx2.plugin({ name: svcMod.name, inject: svcMod.inject, apply: svcMod.apply }, { file: STORE })
await ctx2.links.ready
ok(ctx2.links.resolveTarget('P', '设计.md', { live: buildLiveIndex(['docs/概要.md']) }) === 'docs/概要.md',
  '重启后旧名别名仍在（登记表持久化生效）')

/* 4.8 事件驱动：created 登记、renamed 迁移（走的是 apply 里那份接线） */
ctx.emit('file:changed', { project: 'Q', path: 'e.md', action: 'created' })
ok(links.idOf('Q', 'e.md') !== null, 'file:changed:created → 自动登记')
const idE = links.idOf('Q', 'e.md')
ctx.emit('file:changed', { project: 'Q', path: 'e.md', action: 'renamed', newPath: 'e2.md' })
await new Promise((r) => setTimeout(r, 30))
ok(links.idOf('Q', 'e2.md') === idE, 'file:changed:renamed → ID 跟着走')
ok(links.resolveTarget('Q', 'e.md', { live: buildLiveIndex(['e2.md']) }) === 'e2.md',
  '改名事件后 [[旧名]] 解到新路径（端到端走事件，不是直接调 renamed）')
ctx.emit('file:changed', { project: 'Q', path: 'e2.md', action: 'deleted' })
ok(links.idOf('Q', 'e2.md') === idE, 'deleted 不动条目（别名要活着：文件建回来还是同一个 ID）')
/* 收掉节流窗口：不让这次运行的定时落盘在下一节改坏 STORE 之后才触发 */
await links.flush()

/* ================= 五、损坏守卫（D4） ================= */

console.log('\n── 5. 登记表损坏：拒写、不覆盖、不挡文件操作 ──')
writeFileSync(STORE, '{ 这不是 JSON', 'utf8')
const ctx3 = new Context()
new StubStorage(ctx3)
new StubEvents(ctx3)
await ctx3.plugin({ name: svcMod.name, inject: svcMod.inject, apply: svcMod.apply }, { file: STORE })
await ctx3.links.ready
ok(ctx3.links.stats().corrupt === true, '损坏被识别（stats.corrupt）')
ctx3.links.register('Z', 'z.md')          // 内存里照常工作
ok(ctx3.links.idOf('Z', 'z.md') !== null, '损坏后内存功能照常（登记表是派生数据，不挡任何文件操作）')
let refused = false
try { await ctx3.links.flush() } catch { refused = true }
ok(refused, '损坏后 flush 被拒（不会把可能可恢复的原文覆盖掉）')
try { unlinkSync(STORE) } catch { /* 清理 */ }

/* ================= 收尾 ================= */
console.log('\n' + (fail === 0 ? '✅' : '❌') + ` link-parsing：通过 ${pass} / 失败 ${fail}`)
if (fail) { console.log('失败项：'); for (const f of failures) console.log('  · ' + f) }
rmSync(TESTROOT, { recursive: true, force: true })
process.exit(fail === 0 ? 0 : 1)
