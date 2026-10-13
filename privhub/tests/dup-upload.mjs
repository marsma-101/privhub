/**
 * 上传期查重（privhub-svc-dup，Q6 / §3.3）—— 进程内回归。
 *
 * 为什么单独一套：这套逻辑的"输出"是「这条上传与已有内容相同」的一句判断。
 * 判错了不会让谁崩溃，但会让用户以为"没重复"而重复堆文件，或反过来对着两条
 * 并不相同的内容去删 —— 两种都靠肉眼验不出来。这里对**核心指纹**（原始/规范化/
 * MinHash 三层）与**服务行为**（登记/查/改名跟随/删除摘除/损坏守卫/落盘重载）
 * 逐条断言，并钉住两个功能开关的默认值。
 *
 * 自给自足：进程内挂真实 DupService + 最小 storage/eventBus 桩，**不连服务、不碰真实 data/**。
 * 落盘目录 `tests/.testroot-dup`；存储桩写真明文（只验 JSON 语义与查重，不验加密）。
 *
 *   node --import tsx/esm tests/dup-upload.mjs
 *
 * @module tests/dup-upload
 */

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs'
import { Context, Service } from '@deepseek-ai/cordis'

const HERE = dirname(fileURLToPath(import.meta.url))
const TESTROOT = join(HERE, '.testroot-dup')

let pass = 0
let fail = 0
const failures = []
function ok(cond, msg) {
  if (cond) { pass++ } else { fail++; failures.push(msg) }
  console.log((cond ? '  ✅ ' : '  ❌ ') + msg)
}

/* 必须先设定根目录再 import（svc-dup 在模块加载时读 PRIVHUB_ROOT 定根） */
rmSync(TESTROOT, { recursive: true, force: true })
mkdirSync(join(TESTROOT, 'data'), { recursive: true })
process.env.PRIVHUB_ROOT = TESTROOT

const core = await import('../plugins/privhub-svc-dup/src/core.ts')
const dupMod = await import('../plugins/privhub-svc-dup/src/index.ts')
const capCore = await import('../plugins/privhub-svc-cap/src/core.ts')
const { fingerprint, normalizeText, minHashSig, sigSimilarity, bandKeys, normalizeStore, NEAR_MAX_BYTES, MINHASH_FEATURES } = core
const { DupService } = dupMod

/* ================= 一、指纹（纯函数） ================= */

console.log('\n── 1. 三层指纹：原始 / 规范化 / MinHash ──')

const t = '第一行正文。\n第二行也在这里，够长以便 MinHash 有稳定的 shingle。\n'
const fpA = fingerprint(Buffer.from(t, 'utf8'))
const fpB = fingerprint(Buffer.from(t, 'utf8'))
ok(fpA.h === fpB.h && fpA.h.length === 64, '相同字节 → 相同原始哈希（64 位十六进制）')
ok(fpA.n === fpB.n && fpA.s.join(',') === fpB.s.join(','), '相同文本 → 相同规范化哈希与 MinHash 签名')
ok(fpA.size === Buffer.byteLength(t), 'size = 字节数')

/* 换行口径：CRLF vs LF —— 原始哈希不同、规范化哈希相同（这就是 n 存在的意义） */
const lf = 'a\nb\nc\n' + t
const crlf = 'a\r\nb\r\nc\r\n' + t
const fpLf = fingerprint(Buffer.from(lf, 'utf8'))
const fpCrlf = fingerprint(Buffer.from(crlf, 'utf8'))
ok(fpLf.h !== fpCrlf.h, 'CRLF 与 LF 的原始哈希不同（字节确实不同）')
ok(fpLf.n === fpCrlf.n, '★ CRLF 与 LF 的规范化哈希相同（换行不同不算不同内容）')

/* 二进制（含 NUL）→ 只算原始哈希 */
const bin = Buffer.from([0x50, 0x4b, 0x00, 0x03, 0x04, 0x41, 0x42])
const fpBin = fingerprint(bin)
ok(fpBin.h.length === 64 && fpBin.n === undefined && fpBin.s === undefined, '含 NUL 的二进制只算原始哈希（无 n/s）')

/* 超过上限 → 只算原始哈希 */
const big = Buffer.alloc(NEAR_MAX_BYTES + 10, 0x61)
const fpBig = fingerprint(big)
ok(fpBig.n === undefined && fpBig.s === undefined, '超过 NEAR_MAX_BYTES 只算原始哈希（大文件不进内存）')

/* 文本归一：去 BOM、压缩空白 */
ok(normalizeText('  a\r\n\r\n\r\n\r\nb  ') === 'a\n\nb', 'normalizeText：CRLF 归一 + 压缩空行 + 去首尾空白')

ok(minHashSig('短').length === 0, '过短文本不算 MinHash（无统计意义）')
ok(minHashSig(t).length === MINHASH_FEATURES, '够长的文本给出 16 特征签名')
ok(sigSimilarity(fpA.s, fpB.s) === 1, '同一文本的签名一致率 = 1')
ok(bandKeys(fpA.s).length === 4, 'banding 出 4 个桶键')

/* 形状裁决 */
ok(normalizeStore(null).entries.length === 0, 'normalizeStore(null) → 空表')
const ns = normalizeStore({ entries: [
  { project: 'P', path: 'a.md', h: 'a'.repeat(64), size: 3, at: 1 },
  { project: 'P', path: 'b.md', h: 'too-short', size: 3 },     // h 长度不对 → 丢
  { project: '', path: 'c.md', h: 'c'.repeat(64), size: 1 },   // 空项目 → 丢
  { project: 'P', path: 'd.md', h: 'd'.repeat(64), size: 1, s: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 99] },
  'garbage',
] })
ok(ns.entries.length === 2, '形状裁决：只留合法条目（实测 ' + ns.entries.length + '）')
ok(ns.entries[1].s.length === MINHASH_FEATURES, '签名被截到 16 特征（防病态超长签名）')

/* ================= 二、DupService（进程内挂生产本体） ================= */

console.log('\n── 2. 登记 + 查重 + 改名跟随（挂真实 DupService） ──')

class StubStorage extends Service {
  constructor(c) { super(c, 'storage') }
  readText(f) { return Promise.resolve(readFileSync(f, 'utf8')) }
  writeText(f, d) { writeFileSync(f, d, 'utf8'); return Promise.resolve() }
}
class StubEvents extends Service {
  constructor(c) { super(c, 'eventBus') }
  declareListen() { /* 本套件直接 ctx.emit 驱动 */ }
}

const STORE = join(TESTROOT, 'data', 'dup-index.json')
const ctx = new Context()
new StubStorage(ctx)
new StubEvents(ctx)
await ctx.plugin({ name: dupMod.name, inject: dupMod.inject, apply: dupMod.apply }, { file: STORE, nearThreshold: 0.9 })
const dup = ctx.dup
await dup.ready
ok(dup instanceof DupService, '进程内挂出真实 DupService（用的就是生产代码本体）')

const TXT = '内容一致的样本，用来验证上传期重复提示。\n第二行。\n'
const fp1 = fingerprint(Buffer.from(TXT, 'utf8'))

/* 2.1 先登记 A，再用同内容查 B → 命中 A */
dup.register('P', 'a/报告.txt', fp1)
ok(dup.stats().entries === 1, '登记一条')
const hit1 = dup.check('P', 'b/报告-副本.txt', fp1)
ok(hit1.exact.length === 1 && hit1.exact[0].path === 'a/报告.txt', '★ 同内容查到已有的一份（验收："同一文件传两次"）')
ok(hit1.exact[0].size === fp1.size, '命中项回带字节数（界面据此说明"大小一致"）')

/* 2.2 自己不算命中 */
ok(dup.check('P', 'a/报告.txt', fp1).exact.length === 0, '同一个路径不把自己算成重复（重传同名走 409 那层）')

/* 2.3 不同内容 → 不命中 */
const fpOther = fingerprint(Buffer.from('完全不同的另一份内容，字面完全不一样哦。\n', 'utf8'))
ok(dup.check('P', 'c/别的.txt', fpOther).exact.length === 0, '不同内容不误报')

/* 2.4 项目隔离：别的项目同样内容不该命中 */
ok(dup.check('Q', 'x/报告.txt', fp1).exact.length === 0, '★ 跨项目不外泄（别的项目里同内容不提示）')

/* 2.5 换行口径：LF 与 CRLF 仍判同内容 */
const fpCrlfOnly = fingerprint(Buffer.from(TXT.replace(/\n/g, '\r\n'), 'utf8'))
ok(dup.check('P', 'd/报告-crlf.txt', fpCrlfOnly).exact.length === 1, '★ CRLF 版本的同一文档也能命中（走规范化哈希）')

/* 2.6 近似 */
const SHARED = Array.from({ length: 40 }, (_, i) => `第 ${i} 行：上传查重近似族测试的共享正文，写得足够长以便 MinHash 产生稳定指纹。`).join('\n')
const nearA = SHARED + '\n差异行：甲甲甲\n'
const nearB = SHARED + '\n差异行：乙乙乙\n'
dup.register('P', 'n/甲.md', fingerprint(Buffer.from(nearA, 'utf8')))
const nearHit = dup.check('P', 'n/乙.md', fingerprint(Buffer.from(nearB, 'utf8')))
ok(nearHit.near.length >= 1 && nearHit.near[0].path === 'n/甲.md', '★ 高度相似（共享 40 行）的两篇报进 near')
ok(nearHit.near[0].score >= 0.9, '相似度 ≥ 阈值 0.9（实测 ' + (nearHit.near[0] && nearHit.near[0].score) + '）')
ok(nearHit.exact.length === 0, '近似但不是一字不差 ⇒ 不进 exact（两类不能混）')

/* 2.7 改名跟随（file:changed:renamed 走 apply 里那份接线） */
ctx.emit('file:changed', { project: 'P', path: 'a/报告.txt', action: 'renamed', newPath: 'a/报告终稿.txt' })
await new Promise((r) => setTimeout(r, 20))
const afterRename = dup.check('P', 'b/报告-副本.txt', fp1)
ok(afterRename.exact.length === 1 && afterRename.exact[0].path === 'a/报告终稿.txt',
  '★ 改名后命中指向新路径（否则提示会指向一个不存在的路径）')

/* 2.8 删除摘除 */
ctx.emit('file:changed', { project: 'P', path: 'a/报告终稿.txt', action: 'deleted' })
ok(dup.check('P', 'b/报告-副本.txt', fp1).exact.length === 0,
  '删除后不再提示（别把"与已进回收站的文件重复"当成重复）')

/* 2.9 覆盖登记：同路径内容变了，旧指纹不得留成幽灵 */
dup.register('P', 'e/x.txt', fingerprint(Buffer.from('第一版内容，够长以便有签名。\n', 'utf8')))
const fpV2 = fingerprint(Buffer.from('第二版内容，完全不同了，但也够长以便有签名。\n', 'utf8'))
dup.register('P', 'e/x.txt', fpV2)
ok(dup.check('P', 'f/y.txt', fingerprint(Buffer.from('第一版内容，够长以便有签名。\n', 'utf8'))).exact.length === 0,
  '覆盖登记后旧指纹不再命中（不留指向同一路径的幽灵桶）')
ok(dup.check('P', 'f/y.txt', fpV2).exact.length === 1, '覆盖登记后新指纹命中')

/* 2.10 落盘 + 重载 */
await dup.flush()
ok(existsSync(STORE), 'flush 把索引落盘')
const ctx2 = new Context()
new StubStorage(ctx2)
new StubEvents(ctx2)
await ctx2.plugin({ name: dupMod.name, inject: dupMod.inject, apply: dupMod.apply }, { file: STORE, nearThreshold: 0.9 })
await ctx2.dup.ready
ok(ctx2.dup.check('P', 'g/z.txt', fpV2).exact.length === 1, '重启后索引仍在（落盘生效）')

/* ================= 三、损坏守卫（D4） ================= */

console.log('\n── 3. 索引损坏：拒写、不覆盖、不挡上传 ──')
writeFileSync(STORE, '{ 这不是 JSON', 'utf8')
const ctx3 = new Context()
new StubStorage(ctx3)
new StubEvents(ctx3)
await ctx3.plugin({ name: dupMod.name, inject: dupMod.inject, apply: dupMod.apply }, { file: STORE, nearThreshold: 0.9 })
await ctx3.dup.ready
ok(ctx3.dup.stats().corrupt === true, '损坏被识别（stats.corrupt）')
ctx3.dup.register('Z', 'z.md', fp1)          // 内存里照常工作
ok(ctx3.dup.stats().entries === 1, '损坏后内存功能照常（索引是派生数据，不挡任何上传）')
let refused = false
try { await ctx3.dup.flush() } catch { refused = true }
ok(refused, '损坏后 flush 被拒（不会把可能可恢复的原文覆盖掉）')
try { unlinkSync(STORE) } catch { /* 清理 */ }

/* ================= 四、功能开关登记 ================= */

console.log('\n── 4. 功能开关：两个新功能已登记且默认值符合口径 ──')
const byId = new Map(capCore.FEATURES.map((f) => [f.id, f]))
ok(byId.has('dup.prompt'), 'dup.prompt 已登记（上传期重复提示）')
ok(byId.get('dup.prompt') && byId.get('dup.prompt').userDefault === 'read', 'dup.prompt 普通用户默认「只读」（新增功能，用户侧默认可用、可关）')
ok(byId.has('dup.near.delete'), 'dup.near.delete 已登记（近似/版本族可勾选删除）')
ok(byId.get('dup.near.delete') && byId.get('dup.near.delete').userDefault === 'none', 'dup.near.delete 普通用户默认「不可用」（危险的写能力默认关）')
ok(capCore.levelFor({ username: 'u', role: 'admin' }, 'dup.near.delete', {}) === 'write', '管理员对 dup.near.delete 恒为 write')

/* ================= 收尾 ================= */
console.log('\n' + (fail === 0 ? '✅' : '❌') + ` dup-upload：通过 ${pass} / 失败 ${fail}`)
if (fail) { console.log('失败项：'); for (const f of failures) console.log('  · ' + f) }
rmSync(TESTROOT, { recursive: true, force: true })
process.exit(fail === 0 ? 0 : 1)
