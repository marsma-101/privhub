/**
 * 系统数据「明文 → 密文」迁移回归（svc-storage，D13）
 *
 * 为什么单独有这个文件：读写早就统一走 `ctx.storage`（新写入自动是密文），
 * 但**在此之前**写入的文件不会自己变密文 —— 只有「下次被写」才会。于是那些
 * 再也不会被写的旧数据（老邀请码、老批注、旧发布链接）就永远停在明文，
 * 而它们恰恰可能含免登录取证。实测本机 `data/invites.json` 里就是明文邀请码。
 *
 * 而原先唯一能做这件事的函数 `migrateTree` 是个危险品：它递归遍历整目录，
 * 对最自然的调用 `migrateTree(dataDir)` 会顺手加密掉
 *   ① `secret.key`（密钥没了 → 全部密文永久不可恢复）
 *   ② `audit.jsonl`（自有 PHAUD1 块格式，被 PHENC1 包一层后读不出任何块）
 *   ③ `data/logs/*.log`（明文追加的，加密后新旧内容混成乱码）
 *   ④ `data/git-backup/**`（真 git 仓库，加密内部文件 = 备份全废）
 * 且它无备份、原地写、全仓零调用。本套件因此**不是**在测那个函数，
 * 而是在测替换掉它的「显式清单 + 逐条守卫 + 备份 + 原子写 + 回读校验」。
 *
 * 断言原则：指向行为 —— 断言「拒绝并说明原因」「明文不会丢」「回读一致」，
 * 不断言内部实现。
 *
 * 自给自足：进程内挂真实 svc-storage，**不连服务、不碰真实 data/**。
 * 所有文件都在 `tests/.testroot-migrate` 里现造。
 *
 *   node --import tsx/esm tests/storage-migration.mjs
 *
 * @module tests/storage-migration
 */

import { fileURLToPath } from 'node:url'
import { dirname, join, basename } from 'node:path'
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync } from 'node:fs'
import { Context } from '@deepseek-ai/cordis'

const HERE = dirname(fileURLToPath(import.meta.url))
const TESTROOT = join(HERE, '.testroot-migrate')

let pass = 0
let fail = 0
const failures = []
function ok(cond, msg) {
  if (cond) { pass++ } else { fail++; failures.push(msg) }
  console.log((cond ? '  ✅ ' : '  ❌ ') + msg)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ================= 造一个「什么样的文件都有」的 data/ ================= */

/* 必须先设根目录再 import —— svc-storage 在模块加载时就把 rootDir 定死了 */
rmSync(TESTROOT, { recursive: true, force: true })
const DATA = join(TESTROOT, 'data')
mkdirSync(join(DATA, 'logs'), { recursive: true })
mkdirSync(join(DATA, 'git-backup'), { recursive: true })

const KEY_FILE = join(DATA, 'secret.key')
writeFileSync(KEY_FILE, Buffer.from('0123456789abcdef0123456789abcdef', 'utf8'))

/** 明文系统数据（应当被迁移）——含中文与免登录凭据，正是真实场景里的样子 */
const COMMENTS = '{\n  "A项目|页面.md": [ { "text": "批注正文", "by": "张三" } ]\n}\n'
const INVITES = '[ { "code": "zzvxf9k2", "note": "免登录邀请码" } ]\n'
writeFileSync(join(DATA, 'comments.json'), COMMENTS, 'utf8')
writeFileSync(join(DATA, 'invites.json'), INVITES, 'utf8')
/* 已是密文的 json，扫描时应被跳过（这里先随便写个 PHENC1 头占位，稍后用真加密覆盖） */

/* 绝不能被包成 PHENC1 的四类 */
writeFileSync(join(DATA, 'audit.jsonl'), 'PHAUD1\0' + 'x'.repeat(80), 'utf8')
writeFileSync(join(DATA, 'logs', 'privhub-2026-01-01.log'), '[2026-01-01] 普通日志一行\n', 'utf8')
writeFileSync(join(DATA, 'git-backup', 'HEAD'), 'ref: refs/heads/main\n', 'utf8')
writeFileSync(join(DATA, 'git-backup', 'config'), '[core]\n\trepositoryformatversion = 0\n', 'utf8')
/* 同前缀兄弟目录：`logs-extra` 不是 `logs`，不能被「在 logs 里」的判据误伤
 * （本仓在静态服务里踩过同类前缀 bug，这里顺手钉一根） */
mkdirSync(join(DATA, 'logs-extra'), { recursive: true })
writeFileSync(join(DATA, 'logs-extra', 'notes.json'), '{"a":1}\n', 'utf8')

process.env.PRIVHUB_ROOT = TESTROOT

const mod = await import('../plugins/privhub-svc-storage/src/index.ts')
const { StorageService } = mod

/* ================= 一、挂载（含启动自检的告警） ================= */

/* 启动告警必须走 console：本仓没有任何 logger exporter（ctx.logger.warn 实测输出到虚空），
 * 而 main.ts 的 installFileLogger 挂在 console 上 —— 告警能不能进日志文件，取决于这一点。
 * 所以这里拦 console.warn，而不是 ctx.logger.warn。 */
const warns = []
const realConsoleWarn = console.warn
console.warn = (...args) => { warns.push(args.join(' ')) }
const ctx = new Context()
await ctx.plugin({ name: mod.name, apply: mod.apply, Config: mod.Config }, { enabled: true, keyFile: '', auditMagic: 'PHAUD1\0' })
const svc = ctx.storage

ok(svc instanceof StorageService, '进程内挂载出真实的 StorageService（用的就是生产代码本体）')
ok(svc.active === true, '加密处于启用状态')

/* 启动自检是**异步**的（有意不拖慢启动），所以要等它落地再收网 ——
 * 这段时间必须一直挂着拦截面，否则告警会从我还原之后溜出去（这条一度假红过）。 */
for (let i = 0; i < 80 && !warns.some((w) => w.includes('明文落盘')); i++) await sleep(25)
console.warn = realConsoleWarn
const warnText = warns.join('\n')
ok(/明文落盘/.test(warnText), '启动时报告「仍有文件以明文落盘」—— 不静默（这是 D13 的可见性那一半）')
ok(/comments\.json/.test(warnText) && /invites\.json/.test(warnText), '告警里点名了具体是哪些文件')
ok(/storage\/migrate/.test(warnText), '告警里给出下一步动作（管理员该怎么做），而不是只喊一声')
ok(!/secret\.key/.test(warnText), '告警里**没有**密钥文件 —— 它根本不该进入「待迁移」这一步')

/* ================= 二、扫描：把「该迁的」和「绝不能碰的」分开 ================= */

console.log('\n── 1. 扫描：只列该迁的，不列危险品 ──')
const found = await svc.scanPlaintextSystemFiles()
const names = found.map((f) => basename(f.file)).sort()
ok(names.includes('comments.json') && names.includes('invites.json'),
  `扫出两个明文系统数据文件（实测 ${names.join(', ')}）`)
ok(!names.includes('secret.key'), '密钥文件不在待迁移清单里')
ok(!names.includes('audit.jsonl'), '审计文件不在待迁移清单里')
ok(!names.some((n) => n.endsWith('.log')), '日志不在待迁移清单里')
ok(!names.includes('HEAD') && !names.includes('config'), 'git 备份内部文件不在待迁移清单里')
ok(found.every((f) => f.file.endsWith('.json')), '只收 data/ 顶层的 *.json（不递归 —— 递归正是灾难的来源）')

/* ================= 三、守卫：拒绝要出声 ================= */

console.log('\n── 2. 守卫：四类危险文件必须「拒绝 + 说明原因」，不是静默跳过 ──')
const guard = await svc.migrateFilesToEncrypted([
  KEY_FILE,
  join(DATA, 'audit.jsonl'),
  join(DATA, 'logs', 'privhub-2026-01-01.log'),
  join(DATA, 'git-backup', 'HEAD'),
])
for (const r of guard) {
  ok(r.status === 'refused' && typeof r.reason === 'string' && r.reason.length > 0,
    `拒绝 ${basename(r.file)} 并说明原因（「${r.reason}」）`)
}
ok(guard[0].reason.includes('密钥'), '密钥文件的拒绝理由是「加密它等于让所有密文永久不可恢复」这类')
ok(guard[1].reason.includes('审计'), '审计文件的拒绝理由点名了自有块格式（PHAUD1 vs PHENC1）')
ok(Buffer.from(readFileSync(KEY_FILE)).toString('utf8').startsWith('0123456789abcdef'),
  '密钥文件内容**没被动过**（这条不过就是灾难）')
ok(readFileSync(join(DATA, 'audit.jsonl'), 'utf8').startsWith('PHAUD1'),
  '审计文件仍是 PHAUD1 原样（没有被套一层 PHENC1）')
ok(readFileSync(join(DATA, 'logs', 'privhub-2026-01-01.log'), 'utf8').startsWith('[2026-01-01]'),
  '日志文件仍是明文追加可读的原样')

/* 同前缀兄弟目录不能被误伤 */
const sibling = await svc.migrateFilesToEncrypted([join(DATA, 'logs-extra', 'notes.json')])
ok(sibling[0].status === 'migrated',
  `\`data/logs-extra/\` 不被当成 \`data/logs/\` 误拒（实测 ${sibling[0].status}）—— 前缀比较必须带分隔符`)

/* ================= 四、迁移：明文不丢、回读一致 ================= */

console.log('\n── 3. 迁移：先备份、原子写、回读校验 ──')
const before = readFileSync(join(DATA, 'comments.json'))
const res = await svc.migrateFilesToEncrypted(found.map((f) => f.file))
const migrated = res.filter((r) => r.status === 'migrated')
ok(migrated.length === 2, `两个明文文件都被迁移（实测 ${res.map((r) => basename(r.file) + '=' + r.status).join(', ')}）`)

const cRes = res.find((r) => basename(r.file) === 'comments.json')
ok(await svc.isEncrypted(cRes.file), '迁移后文件头是 PHENC1（真的变成密文了，不是写了个空壳）')
ok(await svc.readText(cRes.file) === COMMENTS, '透过 ctx.storage 读回来内容**逐字一致**（迁移没有动数据）')
ok(existsSync(cRes.backup), '迁移前留了明文备份（要改的是最后一份旧数据，不能只靠运气）')
ok(Buffer.compare(readFileSync(cRes.backup), before) === 0, '备份内容与迁移前原文件**逐字节一致**')
ok(basename(cRes.backup).includes('.plain-') && cRes.backup.endsWith('.bak'),
  `备份名可辨认（实测 ${basename(cRes.backup)}）`)

const rawNow = readFileSync(join(DATA, 'comments.json'))
ok(!rawNow.equals(before), '现在直接读磁盘已看不到原文（宿主机上不可直接读 —— 这才是迁移的目的）')

const inv = res.find((r) => basename(r.file) === 'invites.json')
ok(await svc.readText(inv.file) === INVITES, '免登录邀请码文件迁移后内容不变、已加密')

const again = await svc.migrateFilesToEncrypted([cRes.file])
ok(again[0].status === 'already-encrypted', '重复迁移是幂等的（回 already-encrypted，不会又套一层）')
ok((await svc.scanPlaintextSystemFiles()).length === 0, '迁移后扫描结果为空 —— 界面上的「还有几个明文」会归零')

/* ================= 五、失败路径：宁可留明文，不留半截密文 ================= */

console.log('\n── 4. 失败路径：回读不过就还原明文 ──')
writeFileSync(join(DATA, 'publish.json'), '[ {"token":"pub-abc"} ]\n', 'utf8')
const PUBLISH = readFileSync(join(DATA, 'publish.json'))
/* 故障注入：让回读校验必然不一致（这条路径正常跑不到，只能注入） */
const realReadBuffer = svc.readBuffer.bind(svc)
let injected = 0
svc.readBuffer = async (f) => { injected++; return Buffer.from('被篡改的回读内容') }
const badRes = await svc.migrateFilesToEncrypted([join(DATA, 'publish.json')])
svc.readBuffer = realReadBuffer
ok(injected > 0, `（自证）回读确实被调用了 ${injected} 次 —— 否则下面这条是假绿`)
ok(badRes[0].status === 'failed', '回读不一致 → 报 failed（不假装成功）')
ok(/回读/.test(badRes[0].reason || ''), `失败原因说清了是回读校验（实测「${badRes[0].reason}」）`)
ok(/还原/.test(badRes[0].reason || ''), '并且说明了「已还原明文」—— 让调用方知道原文件现在是什么状态')
ok(await svc.isEncrypted(join(DATA, 'publish.json')) === false, '失败后文件**回到明文状态**（没有留下半截密文）')
const pubNow = readFileSync(join(DATA, 'publish.json'))
ok(Buffer.compare(pubNow, PUBLISH) === 0, '失败后内容与迁移前逐字节一致（数据没丢）')

/* ================= 六、加密关闭时不做事 ================= */

console.log('\n── 5. 加密关闭：拒绝而不是「假装迁了」 ──')
const ctx2 = new Context()
console.warn = realConsoleWarn   // 这一段不需要告警，还原真实通道免得静默出错
await ctx2.plugin({ name: mod.name, apply: mod.apply, Config: mod.Config }, { enabled: false, keyFile: '', auditMagic: 'PHAUD1\0' })
const off = await ctx2.storage.migrateFilesToEncrypted([join(DATA, 'publish.json')])
ok(off[0].status === 'refused' && /未启用/.test(off[0].reason || ''),
  `加密未启用时拒绝迁移并说明原因（实测 ${off[0].status}：${off[0].reason}）`)
ok(readFileSync(join(DATA, 'publish.json'), 'utf8').startsWith('[ {"token"'), '加密未启用时文件内容原样未动')

/* ================= 收尾 ================= */

/* 顺带记录：备份文件是怎么堆的 —— 运维需要知道它们会留在原地 */
const bakCount = readdirSync(DATA).filter((n) => /\.plain-.*\.bak$/.test(n)).length
console.log(`     [实测] data/ 下留了 ${bakCount} 个 .plain-*.bak 备份（迁移的明文存证，由运维决定何时清理）`)

try { await ctx.stop?.() } catch { /* 忽略 */ }
try { await ctx2.stop?.() } catch { /* 忽略 */ }
rmSync(TESTROOT, { recursive: true, force: true })

console.log(`\n${'='.repeat(56)}`)
console.log(`  系统数据迁移回归：${pass} 通过 / ${fail} 失败`)
for (const f of failures) console.log('   ❌ ' + f)
console.log('='.repeat(56))
process.exit(fail === 0 ? 0 : 1)
