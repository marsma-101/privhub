/**
 * title-collision.mjs — 「标题碰撞即时提示」纯函数回归（W-§3.4）
 *
 * 为什么需要这一套：撞名提示的口径（整名 / 基名 / 前缀阈值 / 中文按字符）是一条
 * 纯字符串规则，改一个字符的边界就会在用户面前变味（该报的不报、不该报的乱报）。
 * 它被三处界面共用，就地散测会漏；这里直接 import 纯函数跑逻辑，
 * 不连服务、不起 DOM。
 *
 *   node tests/title-collision.mjs
 *
 * @module tests/title-collision
 */

const MODULE_URL = new URL('../plugins/privhub-files-explorer-v3/client/collide.js', import.meta.url).href

let pass = 0
let fail = 0
const failures = []
function ok(cond, msg) {
  if (cond) pass++
  else { fail++; failures.push(msg) }
  console.log((cond ? '  ✅ ' : '  ❌ ') + msg)
}

const { titleCollision } = await import(MODULE_URL)

const EMPTY = (r) => r.level === '' && r.conflict === '' && r.n === 0

console.log('\n── 完全相同（大小写不敏感）⇒ exact ──')
{
  const r = titleCollision(['汇报.md', '会议记录.md'], '会议记录.md')
  ok(r.level === 'exact' && r.conflict === '会议记录.md', `整名相同判 exact 且带撞上的名字（${r.level}/${r.conflict}）`)
  const ci = titleCollision(['Report.md'], 'report.md')
  ok(ci.level === 'exact' && ci.conflict === 'Report.md', '大小写不敏感，conflict 返回原样大小写的名字')
  // exact 优先于 prefix：前缀也很长但整名相同，仍应是 exact
  const p = titleCollision(['abcdefghij.md'], 'abcdefghij.md')
  ok(p.level === 'exact' && p.n === 0, '整名相同优先判 exact（不给 prefix 计数）')
}

console.log('\n── 基名相同（扩展名不同）⇒ exact（报告 / 报告.md 这类包含关系）──')
{
  const r = titleCollision(['报告.md'], '报告')
  ok(r.level === 'exact' && r.conflict === '报告.md', '「报告」撞上既有「报告.md」——整名前缀只有 2 字也要提示（基名兜底）')
  const r2 = titleCollision(['报告.txt'], '报告.md')
  ok(r2.level === 'exact' && r2.conflict === '报告.txt', '「报告.md」撞上「报告.txt」——同基名不同扩展名')
  const r3 = titleCollision(['报告.md'], '报告甲')
  ok(EMPTY(r3), '短前缀但基名不同（报告甲 vs 报告.md）不提示——避免 2 字前缀就乱报')
  const r4 = titleCollision(['.gitignore'], '.gitattributes')
  ok(EMPTY(r4), '点开头的隐藏文件不算扩展名，不因同名前缀误报')
}

console.log('\n── 整名公共前缀 ≥ 8 字 ⇒ prefix ──')
{
  const r = titleCollision(['abcdefghY'], 'abcdefghZ')
  ok(r.level === 'prefix' && r.n === 8 && r.conflict === 'abcdefghY', `前缀正好 8 字命中（n=${r.n}）`)
  const r7 = titleCollision(['abcdefgY'], 'abcdefgZ')
  ok(EMPTY(r7), '前缀 7 字不命中（阈值是 8）')
  const r10 = titleCollision(['季度销售2026-上海.md'], '季度销售2026-北京.md')
  ok(r10.level === 'prefix' && r10.n >= 8, `整名长前缀命中（n=${r10.n}，基数在整名上算）`)
}

console.log('\n── 中文按【字符】算，不按 UTF-16 码元 ──')
{
  const value = '季度销售报告二零二六'
  const r = titleCollision(['季度销售报告二零二五'], value)
  ok(r.level === 'prefix' && r.n === 9, `中文 9 字前缀命中（n=${r.n}，若按字节/Buffer 会算错）`)
  // 7 个中文字 + 一个不同字 = 7 字前缀，不命中
  const r7 = titleCollision(['甲乙丙丁戊己庚乙'], '甲乙丙丁戊己庚甲')
  ok(EMPTY(r7), '中文 7 字前缀不命中（按字符数不到 8）')
}

console.log('\n── 空输入 / 无冲突 ──')
{
  ok(EMPTY(titleCollision(['a.md'], '')), '空字符串不提示')
  ok(EMPTY(titleCollision(['a.md'], '   ')), '纯空白不提示')
  ok(EMPTY(titleCollision(['a.md', 'b.md'], 'zzz')), '毫无关系的名字不提示')
  ok(EMPTY(titleCollision([], 'anything')), '空目录列表不提示')
  ok(EMPTY(titleCollision(['a.md'], null)), 'value 为 null 不报错、不提示')
  ok(EMPTY(titleCollision(undefined, 'x.md')), 'names 缺失不报错、不提示')
}

console.log('\n── 多个候选取前缀最长的那一个 ──')
{
  const names = ['abcdefghXX', 'abcdefghiYY', 'abcdZZ']
  const r = titleCollision(names, 'abcdefghiZZ')
  ok(r.level === 'prefix' && r.conflict === 'abcdefghiYY' && r.n === 9,
    `取前缀最长的候选（conflict=${r.conflict}, n=${r.n}）`)
  // 顺序无关：把最长候选放前面，仍取它
  const r2 = titleCollision(['abcdefghiYY', 'abcdefghXX'], 'abcdefghiZZ')
  ok(r2.conflict === 'abcdefghiYY', '结果与候选顺序无关（始终取最长前缀）')
}

console.log('\n── 调用方契约：names 须先排除被改名的自己 ──')
{
  // 调用方排除自己后，自己原来的名字不会出现；此处模拟：值改回原名但列表里已无原名
  const r = titleCollision(['other.md'], 'me.md')
  ok(EMPTY(r), '自己原名的条目已被调用方排除时，不把自己判成冲突')
}

console.log('\n========================================================')
console.log(`  标题碰撞纯函数回归：${pass} 通过 / ${fail} 失败`)
if (fail) {
  console.log('  失败项：')
  for (const f of failures) console.log('    - ' + f)
}
console.log('========================================================')
process.exit(fail ? 1 : 0)
