/**
 * 蓝绿热更新的静态契约（不需要服务、不需要 tsx）
 *
 * 这套架构的关键不变量都是「跨文件的对齐」，任何一处被单独改掉时，运行期
 * 都可能「看起来正常，切换那天才炸」：
 *
 *   · 稳定层（runtime/control.mjs、update.mjs）只许 import node 内置模块，
 *     一旦 import release 里的东西，「更新器跟着业务代码一起坏」；
 *   · 控制层的切换顺序必须是「预热 → 冻结 → 排空 → 重读 → 激活 → nginx → 停旧」，
 *     顺序错了要么双写共享 data/，要么新槽带着陈旧会话先服务；
 *   · 待命槽必须由 PRIVHUB_STANDBY 驱动，且所有后台写任务都挂在激活钩子上
 *     （回收站/审计/RAG/全文索引/git 备份/文件 Agent）；
 *   · nginx 版本 Cookie、409 版本门、前端阻断层、`/runtime/reload|activate`、
 *     package.json 能力声明，少一处就是「更新了但旧页面继续写」或「无法预热」；
 *   · 打包/更新器绝不允许把 data/、data-files/、config/ 带进 release。
 *
 *   node tests/runtime-contract.mjs
 *
 * @module tests/runtime-contract
 */

import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')

let pass = 0
let fail = 0
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✅ ' + msg) } else { fail++; console.log('  ❌ ' + msg) }
}
function read(rel) {
  const p = join(ROOT, rel)
  return existsSync(p) ? readFileSync(p, 'utf8') : ''
}
function idx(src, needle) {
  const i = src.indexOf(needle)
  ok(i >= 0, `存在：${needle.slice(0, 60)}`)
  return i
}

console.log('\n── 稳定层：只依赖 Node 内置模块 ──')
for (const rel of ['runtime/control.mjs', 'runtime/update.mjs', 'scripts/build-release.mjs']) {
  const src = read(rel)
  ok(src.length > 0, `${rel} 存在且非空`)
  const imports = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1])
  const bad = imports.filter((s) => !s.startsWith('node:'))
  ok(bad.length === 0, `${rel} 只 import node: 内置模块${bad.length ? '，越界：' + bad.join(', ') : ''}`)
}

console.log('\n── 控制层：槽进程与切换顺序 ──')
const control = read('runtime/control.mjs')
ok(/PRIVHUB_DATA_ROOT:\s*STORE_DIR/.test(control), '槽进程显式继承共享数据根 PRIVHUB_DATA_ROOT')
ok(/PRIVHUB_HOST:\s*'127\.0\.0\.1'/.test(control), '槽只监听回环（对外入口是 nginx）')
ok(/PRIVHUB_STANDBY:\s*standby\s*\?\s*'1'\s*:\s*'0'/.test(control), '待命态由 PRIVHUB_STANDBY 显式传入')
ok(/PRIVHUB_CONTROL_TOKEN:\s*CONTROL_TOKEN/.test(control), '槽进程拿到控制令牌（冻结/重读/激活接口的准入）')
ok(/standby:\s*true/.test(control) && /ensureSlot\(target,\s*info\.dir,\s*info\.version,\s*\{\s*standby:\s*true\s*\}\)/.test(control),
  '切换前先在目标槽待命预热（冷启动不占冻结窗口）')
ok(/'standby',\s*'reload-state',\s*'activate'/.test(control), '按 release 能力协商是否可预热')
ok(/healthCheck\(prev\.port/.test(control) && /capabilities/.test(control), '冻结旧槽前先探测它是否真支持 freeze（首次升级不炸）')

const iPre = control.indexOf('standby: true')
const iFreeze = control.indexOf('await freezeSlot(prev')
const iReload = control.indexOf("'/privhub/api/runtime/reload'")
const iActivate = control.indexOf("'/privhub/api/runtime/activate'")
const iSave = control.indexOf('saveActive(nextActive)')
const iNginx = control.indexOf('await prepareNginxConfig(nextActive)')
const iBroadcast = control.indexOf('broadcastVersion(nextActive)')
const iStopOld = control.indexOf('await stopSlot(oldSlot)')
ok(iPre >= 0 && iFreeze > iPre, '顺序①预热在冻结之前')
ok(iFreeze > 0 && iReload > iFreeze && iActivate > iReload, '顺序②冻结/排空 → 重读状态 → 激活')
ok(iActivate > 0 && iSave > iActivate, '顺序③激活后才落盘 active.json')
ok(iSave > 0 && iNginx > iSave, '顺序④先落盘切换意图，再切 nginx')
ok(iNginx > 0 && iBroadcast > iNginx, '顺序⑤nginx 生效后广播 SSE')
ok(iBroadcast > 0 && iStopOld > iBroadcast, '顺序⑥切换完成才停旧槽')
ok(/unfreezeSlot\(prev\)/.test(control), '切换失败路径会解冻旧槽')
ok(/PRIVHUB_DRAIN_TIMEOUT/.test(control), '旧槽写请求排不空时取消切换（不带着在途写切流）')
ok(/PRIVHUB_SLOT_STUCK/.test(control), '强杀后确认进程真的结束（否则端口假释放）')
ok(/function startUpdater\(/.test(control) && /await startControlServer\(\)\n  startUpdater\(\)/s.test(control),
  '存在 update.json 时控制层随启动拉起更新守护')
ok(/stopUpdater\(\)/.test(control) && control.lastIndexOf('stopUpdater()') < control.indexOf('for (const slot of SLOTS.values())'),
  '停机时先停更新守护，再停槽（避免停机中途发起切换）')

console.log('\n── 控制层：对外版本端点与安全 ──')
ok(control.includes("path === '/privhub/_version/stream'"), 'SSE 端点 /privhub/_version/stream')
ok(control.includes("path === '/privhub/_version'"), '版本查询端点 /privhub/_version')
ok(/event:\s*hello/.test(control) && /event:\s*version/.test(control), 'SSE 发 hello 与 version 两种事件')
ok(/managed:\s*true/.test(control), '控制层版本响应标记 managed:true')
ok(/controlAuthorized/.test(control) && /x-privhub-control-token/.test(control), '控制接口要求令牌')
ok(/127\.0\.0\.1'?\s*&&|remoteAddress/.test(control), '控制接口限制回环来源')

console.log('\n── 槽进程：待命语义与冻结 ──')
const core = read('plugins/privhub-core/src/index.ts')
ok(/standby\s*=\s*process\.env\.PRIVHUB_STANDBY\s*===\s*'1'/.test(core), 'core 从 PRIVHUB_STANDBY 进入待命')
ok(/onActivate\(fn/.test(core) && /async activate\(/.test(core), 'core 提供 onActivate / activate')
ok(/runtime:activated/.test(core), '激活时发 runtime:activated（挂载早于 core 的 L2 服务靠它解待命）')
ok(/if \(store\.standby\) return/.test(core), '待命槽跳过会话清扫（不写共享数据）')
ok(/capabilities:\s*\['freeze',\s*'reload-state',\s*'standby',\s*'activate',\s*'session-check'\]/.test(core),
  'health 声明运行能力，供控制层协商')
ok(/frozen:\s*store\.frozen/.test(core) && /writesInFlight:\s*store\.writesInFlight/.test(core),
  'health 暴露冻结态与在途写数（排空判定依据）')
ok(core.includes("'/privhub/api/runtime/reload'") && core.includes("'/privhub/api/runtime/activate'"),
  'core 提供 reload / activate 控制端点')
ok(/PRIVHUB_NOT_STANDBY/.test(read('src/main.ts')), 'reload 仅待命槽可用（不能覆盖正在服务进程的内存态）')
ok(/CONTROL_ROUTES/.test(core) && core.includes("'/privhub/api/runtime/freeze'"), '控制端点不受冻结拦截（否则无法解冻）')

console.log('\n── 待命槽延后的后台写任务 ──')
const gates = [
  ['plugins/privhub-trash/src/index.ts', /svc\.onActivate\(/, '回收站清理'],
  ['plugins/privhub-svc-rag/src/index.ts', /svc\.onActivate\(/, 'RAG 重建'],
  ['plugins/privhub-files-fulltext/src/index.ts', /svc\.onActivate\(/, '全文索引全量构建'],
  ['plugins/privhub-git-backup/src/index.ts', /svc\.onActivate\(/, 'git 备份定时器'],
  ['plugins/privhub-files-agent/src/m2.ts', /standby\(\)/, '文件 Agent 配额/限速落盘'],
  ['plugins/privhub-svc-audit/src/index.ts', /runtime:activated/, '审计清理定时器'],
]
for (const [rel, re, label] of gates) ok(re.test(read(rel)), `${label}在待命期间不运行（${rel}）`)

console.log('\n── 状态重读清单（src/main.ts） ──')
const main = read('src/main.ts')
for (const name of ['loadUsers', 'loadSessions', "ctx.acl.load", "ctx.cap.load", "ctx.meta.load", 'loadTemplates', 'ctx.links.reload', 'ctx.dup.reload', 'ctx.model.loadConfig']) {
  ok(main.includes(name), `reload 覆盖：${name}`)
}

console.log('\n── nginx：版本门 / 静态 / 会话校验 ──')
const nginx = read('runtime/nginx.conf.template')
ok(/client_max_body_size\s+0/.test(nginx), 'nginx 不限制上传体积（2GB/200MB 契约由 Node 路由各自校验）')
ok(/try_files \$uri =404/.test(nginx), '插件/前端静态由 nginx 直读当前 release')
ok(/auth_request \/__privhub_auth/.test(nginx), '非 auth 插件静态文件经 Node 校验会话')
ok(/proxy_pass http:\/\/privhub_active\/privhub\/api\/session\/check/.test(nginx), 'auth_request 复用业务会话校验')
ok(/Add-Cookie|Set-Cookie/.test(nginx) && /privhub_client_version=\{\{ACTIVE_VERSION\}\}/.test(nginx),
  '版本 Cookie 与本次 HTML 响应原子绑定')
ok(/add_header X-PrivHub-Version "\{\{ACTIVE_VERSION\}\}" always/.test(nginx), 'HTML 响应带版本身份头')
ok(/map \$cookie_privhub_client_version/.test(nginx), 'nginx 比较客户端 Cookie 与当前版本')
ok(/PRIVHUB_CLIENT_STALE/.test(nginx), '旧页面的写请求收到 409 版本门')
ok(/location = \/privhub\/api\/login/.test(nginx) && /location = \/privhub\/api\/register/.test(nginx) && /location \/privhub\/api\/agent\//.test(nginx),
  '登录/注册/Agent 写路径豁免版本门（避免旧页死锁）')
ok(/proxy_pass http:\/\/127\.0\.0\.1:\{\{CONTROL_PORT\}\}/.test(nginx), '版本端点由常驻控制层应答（切换时不断连）')

console.log('\n── 前端：版本握手与阻断层 ──')
const fe = read('frontend/index.html')
ok(/const VERSION = reactive\(/.test(fe), '前端有版本状态')
ok(/initVersionWatch\(\)/.test(fe), '启动时执行版本握手')
ok(/EventSource\('\/privhub\/_version\/stream'\)/.test(fe), '订阅切换事件')
ok(/privhub_client_version/.test(fe), '读取 nginx 写入的版本 Cookie')
ok(/PRIVHUB_CLIENT_STALE/.test(fe), '前端识别 409 版本门')
ok(/VERSION\.stale && method !== 'GET'/.test(fe), '阻断态下 api() 本地拒绝写请求')
ok(/path\.includes\('\/privhub\/api\/login'\)/.test(fe) && /path\.includes\('\/privhub\/api\/register'\)/.test(fe),
  '登录/注册在阻断态下仍可发（可重新登录）')
ok(/privhub-version-mask/.test(fe) && /立即刷新/.test(fe), '阻断层带「立即刷新」出口')
ok(/reloadNow\(\)/.test(fe), '刷新动作存在')

console.log('\n── 发布包 / 更新器 ──')
const pkg = JSON.parse(read('package.json') || '{}')
ok(Array.isArray(pkg.privhub?.runtimeCapabilities)
  && ['freeze', 'reload-state', 'standby', 'activate', 'session-check'].every((c) => pkg.privhub.runtimeCapabilities.includes(c)),
  'package.json 声明完整运行能力')
ok(existsSync(join(ROOT, 'scripts', 'build-release.mjs')), 'release 构建器存在')
const build = read('scripts/build-release.mjs')
ok(/const ENTRIES = \[/.test(build) && !/['"]data-files['"]/.test(build) && !/'data'/.test(build),
  '构建器只复制白名单，不带 data/ 与 data-files/')
ok(/activeReleaseDirs/.test(build) && /正在被 active\.json 使用/.test(build), '构建器拒绝覆盖正在服务的 release')
const upd = read('runtime/update.mjs')
ok(/\/control\/switch/.test(upd), '更新器只通过控制层切换（不直接停进程）')
ok(/PRIVHUB_DEPS_CHANGED/.test(upd), '依赖清单变化时拒绝复用旧 node_modules')
ok(/update\.lock/.test(upd), '更新器有单实例锁')
ok(/'clone',\s*'--depth'/.test(upd), 'git 源使用浅克隆')
ok(/keepReleases/.test(upd) && /function pruneReleases\(/.test(upd), '更新器会清理旧 release（keepReleases）')
ok(/hasConf && \(!loaded/.test(upd), 'update.json 解析失败时报错（不静默按默认值跑）')
ok(/cmdPrune/.test(upd) && /prune: cmdPrune/.test(upd), '更新器提供手动清理命令（prune）')
ok(/activeNow\?\.previous/.test(upd) && /protectedDirs/.test(upd),
  '清理旧 release 时保留当前与上一版本（回滚目标不被删）')
ok(upd.indexOf('pruned = pruneReleases(cfg)') > upd.indexOf('await switchTo('),
  '只有切换成功后才清理旧 release')
ok(existsSync(join(ROOT, 'runtime', 'README.md')), '运行时说明文档存在')
ok(existsSync(join(ROOT, 'start-runtime.bat')), '蓝绿启动器存在')
ok(existsSync(join(ROOT, 'scripts', 'fetch-nginx.ps1')), 'nginx 安装脚本存在')

console.log('\n' + '='.repeat(56))
console.log(`  运行时契约：${pass} 通过 / ${fail} 失败`)
console.log('='.repeat(56) + '\n')
process.exit(fail === 0 ? 0 : 1)
