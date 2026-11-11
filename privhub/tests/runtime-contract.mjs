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
ok(/store\.json/.test(control) && /STORE_CONF_FILE/.test(control),
  '稳定层读取代码树之外的 config/store.json（升级不丢配置）')
ok(/CONF_DATA_FILES/.test(control) && /PRIVHUB_DATA_FILES/.test(control),
  '文件库根可独立配置（PRIVHUB_DATA_FILES / store.json dataFiles）')
ok(/function computeDataFiles/.test(control) && /if \(df\.explicit\) env\.PRIVHUB_DATA_FILES = df\.dir/.test(control),
  '只有显式配置库根时才下发 PRIVHUB_DATA_FILES（避免首装被误判为显式路径）')
ok(/function validateStoreRoots/.test(control) && /PRIVHUB_DATA_FILES_MISSING/.test(control),
  '显式库根不存在时拒绝启动（不再静默给空库）')
ok(/console\.warn\('\[control\] 未发现 store/.test(control),
  '无 store/data/data-files 时创建空 store 必须先告警（保守探测）')
ok(/storeCheckSlot/.test(control) && /function storeCheckSlot/.test(control),
  '切换前对新槽执行存储自检')
ok(/PRIVHUB_STORE_CHECK_FAILED/.test(control), '存储自检失败会中止切换并保留旧槽')
const iStoreCheck = control.indexOf('await storeCheckSlot(target)')
ok(iStoreCheck >= 0 && iStoreCheck < control.indexOf('await freezeSlot(prev'),
  '存储自检发生在冻结旧槽之前（失败时旧槽完全不受影响）')
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

console.log('\n── 存储根 / 密钥安全（GitHub issue #2）──')
const storePathsSrc = read('src/store-paths.mjs')
ok(storePathsSrc.length > 0, '存在统一存储根解析模块 src/store-paths.mjs')
ok(/PRIVHUB_DATA_FILES/.test(storePathsSrc) && /dataFiles/.test(storePathsSrc),
  '解析模块区分系统数据根与文件库根')
ok(/dataFilesExplicit/.test(storePathsSrc) && /拒绝启动/.test(storePathsSrc),
  '显式库根不存在时拒绝启动（不制造空库假象）')
ok(/store\.json/.test(storePathsSrc), '支持代码树之外的 store.json 配置')
ok(/\\uFEFF/.test(storePathsSrc) && /\\uFEFF/.test(control),
  'store.json 容忍 UTF-8 BOM（记事本 / PowerShell 5.1 写出的文件不会被当成坏配置）')
const mainSrc = read('src/main.ts')
const iStoreImport = mainSrc.indexOf("from './store-paths.mjs'")
ok(iStoreImport >= 0 && iStoreImport < mainSrc.indexOf("from '@deepseek-ai/cordis'"),
  'main.ts 先解析存储根，再加载任何插件（否则插件读不到配置）')
ok(!/[A-Za-z]:[\\/]/.test(mainSrc.split('\n').filter((l) => /mount\(core|dataRoot|data-files/.test(l)).join('\n')),
  'main.ts 的存储相关行没有盘符硬编码')
ok(/dataRoot:\s*storePaths\.dataFiles/.test(mainSrc), 'core 的 dataRoot 来自解析模块（不是写死字符串）')
ok(/若已有旧库/.test(mainSrc), '默认根为空时提示如何指向已有旧库（新端口看不到老库的现场指引）')
const storageSrc = read('plugins/privhub-svc-storage/src/index.ts')
ok(/拒绝自动生成新密钥/.test(storageSrc), '已有密文且缺密钥时拒绝生成新密钥')
ok(/findCiphertextFile/.test(storageSrc) && /PHENC1|PHAUD1/.test(storageSrc),
  '生成密钥前探测既有密文（PHENC1 / PHAUD1）')
ok(/PrivHubKeyMismatchError/.test(storageSrc), '密钥错配错误可被上层识别（避免静默回退空配置）')
ok(/readJsonEnc[\s\S]{0,700}PrivHubKeyMismatchError/.test(storageSrc),
  'readJsonEnc 不会把密钥错配吞成「文件不存在」')
ok(/系统数据根/.test(storageSrc) && /refuseReason[\s\S]{0,1800}dataRootDir, 'data'/.test(storageSrc),
  '迁移前校验目标根等于配置的系统数据根（根指错时拒绝，而不是改另一棵树）')
const gitBackupSrc = read('plugins/privhub-git-backup/src/index.ts')
ok(/PRIVHUB_DATA_FILES/.test(gitBackupSrc), 'git 备份镜像使用配置的文件库根（不是写死 data-files）')
ok(/文件库根不存在/.test(gitBackupSrc), '文件库根缺失时显式告警（避免「备份在跑、实际为空」）')
ok(existsSync(join(ROOT, 'scripts', 'verify-store.mjs')), '提供只读体检命令 scripts/verify-store.mjs')
ok(existsSync(join(ROOT, 'tests', 'store-config.mjs')), '提供存储根/密钥安全回归套件')
ok(/'store-check'/.test(read('plugins/privhub-core/src/index.ts')), '健康/控制端点声明 store-check 能力')

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
ok(/capabilities:\s*\['freeze',\s*'reload-state',\s*'standby',\s*'activate',\s*'session-check',\s*'store-check'\]/.test(core),
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
/* 只看白名单数组本身：「data」这个词在别处（例如 hash 流的 'data' 事件）出现不算越界。 */
const entriesBlock = (/const ENTRIES = \[([\s\S]*?)\]/.exec(build) || [''])[1]
ok(entriesBlock.length > 0 && !/['"](data|data-files|store|config|logs)['"]/.test(entriesBlock),
  '构建器只复制白名单，不带 data/ 与 data-files/')
ok(/activeReleaseDirs/.test(build) && /正在被 active\.json 使用/.test(build), '构建器拒绝覆盖正在服务的 release')
ok(/function renameWithRetry/.test(build) && /function moveDirInto/.test(build) && /RENAME_RETRY_CODES/.test(build),
  '构建器在目录被占用时重试 rename 并退化为复制（杀毒/索引不会让打包失败）')
const upd = read('runtime/update.mjs')
ok(/function renameWithRetry/.test(upd) && /moveDirInto\(staging, target\)/.test(upd),
  '更新器放置 release 同样重试并退化为复制（一键更新不被外部占用打断）')
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

console.log('\n── 纯使用版：HTTP 更新源 / 一键更新 / 自包含打包 ──')

/* 使用版的核心承诺：机器上只有 release + runtime，没有源码、没有 git、没有 npm。
 * 因此更新能力必须落在稳定层（runtime/*），业务插件只做代理；清单与整包都走 HTTP。 */
ok(/cfg\.source === 'http'/.test(upd), '更新器支持 http 源（使用版机器不再需要 git / 共享盘）')
ok(/manifestUrl/.test(upd) && /function fetchHttpCandidate/.test(upd), 'http 源按 manifestUrl 读取清单并挑选候选版本')
ok(/function fetchFile/.test(upd) && /createHash\('sha256'\)/.test(upd),
  '整包下载边下边算 sha256（不需要额外工具，且能校验完整性）')
ok(/更新包校验失败/.test(upd) && /allowUnverified/.test(upd),
  '清单带 sha256 时强制校验；无 sha256 默认拒绝（除非显式放行）')
ok(/function extractArchive/.test(upd) && /System32.*tar\.exe|tar\.exe/.test(upd),
  '解包用系统自带 tar.exe（稳定层不引第三方依赖）')
ok(/function detectAppRoot/.test(upd) && /function materializeHttpCandidate/.test(upd),
  '解包后识别应用根并校验版本（压缩包多套一层目录也能处理）')
ok(/phase:\s*'downloading'/.test(upd) && /phase:\s*'extracting'/.test(upd) && /phase:\s*'switching'/.test(upd),
  '更新阶段写入 update-state.json（管理界面才能显示下载/解包/切换进度）')
ok(/autoApply\s*===\s*false/.test(upd) && /cmdCheck\(\)/.test(upd),
  'autoApply=false 时守护只检查不更新（企业内网默认安全姿势）')
ok(/function cmdDaemon/.test(upd) && !/timer\.unref/.test(upd),
  '更新守护的定时器保持引用（unref 会让守护启动后立刻退出，自动检查形同虚设）')
ok(/cmd === 'daemon'\)\s*return/.test(upd),
  '命令分发器不提前 exit 守护进程（否则控制层拉起的 daemon 启动即退出）')

ok(/path === '\/control\/update\/status'/.test(control)
  && /path === '\/control\/update\/check'/.test(control)
  && /path === '\/control\/update\/apply'/.test(control)
  && /path === '\/control\/update\/config'/.test(control)
  && /path === '\/control\/update\/rollback'/.test(control),
  '控制层提供 status / check / apply / config / rollback 五个更新接口')
ok(/PRIVHUB_UPDATE_BUSY/.test(control), '并发更新被拒绝（不会两个 apply 同时切槽）')
ok(/function startUpdateRollback/.test(control) && /startUpdaterTask\('rollback'/.test(control),
  '回滚交给独立进程执行（否则发起回滚的槽会把自己算作在途写，排空必然超时）')
ok(/rollback: cmdRollback/.test(upd) && /function cmdRollback/.test(upd),
  '更新器提供 rollback 子命令（回滚不依赖即将被停掉的槽进程）')
ok(/function saveUpdateConfig/.test(control) && /config\/update\.json|UPDATE_CONF/.test(control),
  '更新源可从管理界面改写（保存后重启守护，无需重启服务）')
ok(/PRIVHUB_HOME:\s*HOME_DIR/.test(control) && /PRIVHUB_CONTROL_PORT:\s*String\(CONFIG\.controlPort\)/.test(control),
  '槽进程拿到 PRIVHUB_HOME / PRIVHUB_CONTROL_PORT（业务插件才能回连控制层）')

const updPlugin = read('plugins/privhub-update/src/index.ts')
ok(/export const name = 'privhub-update'/.test(updPlugin) && /export const inject/.test(updPlugin),
  '系统更新插件符合服务端插件三件套')
for (const p of ['status', 'check', 'apply', 'config', 'rollback']) {
  ok(updPlugin.includes(`'/privhub/api/update/${p}'`), `系统更新插件代理 /privhub/api/update/${p}`)
}
ok(/ctx\.cap\.can\(u,\s*'admin\.update'/.test(updPlugin), '更新接口要求 admin.update 权限（不是只认 admin 角色）')
const updManifest = read('plugins/privhub-update/client/manifest.json')
ok(/"admin-update"/.test(updManifest) && /"view":\s*"admin-update"/.test(updManifest),
  '系统更新面板声明 admin-update slot 与入口')
ok(/"adminOnly":\s*true/.test(updManifest), '系统更新入口是 adminOnly')
ok(/entryOf:\s*'admin-update'/.test(read('plugins/privhub-admin-console/client/routes.js')),
  '管理控制台路由表登记「系统更新」（否则侧栏点不进去）')
ok(/id: 'admin\.update'/.test(read('plugins/privhub-svc-cap/src/core.ts')),
  'admin.update 登记在功能权限表（manifest 的 capFeature 才不会落空）')

ok(existsSync(join(ROOT, 'scripts', 'build-standalone.mjs')), '纯使用版打包器存在')
const sb = read('scripts/build-standalone.mjs')
{
  const imports = [...sb.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1])
  const bad = imports.filter((s) => !s.startsWith('node:'))
  ok(bad.length === 0, `build-standalone 只 import node: 内置模块${bad.length ? '，越界：' + bad.join(', ') : ''}`)
}
ok(/runtime\/node\/node\.exe|'node\.exe'/.test(sb) && /--with-node/.test(sb),
  '打包器可内置 Node（使用版机器无需预装）')
ok(/start-runtime\.bat/.test(sb) && /使用说明\.md/.test(sb), '打包产物带启动器与使用说明')
ok(/config\/update\.json|writeUpdateConfig/.test(sb) && /manifestUrl/.test(sb),
  '打包时可预置更新源（开箱即用，无需手工配置）')
ok(/releases/.test(sb) && /runtime/.test(sb) && /runtime',\s*'nginx|NO_NGINX/.test(sb),
  '打包产物 = runtime + releases + 启动器（自包含，不需要源码）')

const launcher = read('start-runtime.bat')
ok(/runtime\\node\\node\.exe/.test(launcher), '启动器优先使用内置 Node（使用版无系统 Node 也能跑）')
ok(/Node\.js not found/.test(launcher), '没有 Node 时给出可读错误（不是一句 unknown command）')

const pkgBuild = read('scripts/build-release.mjs')
ok(/--package|PACKAGE = flag\('package'\)/.test(pkgBuild) && /latest\.json/.test(pkgBuild),
  '发布构建器可产出 latest.json 清单（配 http 更新源）')
ok(/--with-modules|WITH_MODULES/.test(pkgBuild) && /PRIVHUB_DEPS_CHANGED/.test(upd),
  '依赖变化时有明确出路：--with-modules 打整包；否则更新器拒绝复用旧模块')

/* ---- issue #2 REQ-5：破坏性操作的根守卫 ---- */
const coreSrc = read('plugins/privhub-core/src/index.ts')
ok(/trashRootGuard\s*\(/.test(coreSrc), '（REQ-5）core 存在回收站根守卫函数')
ok(/PRIVHUB_DATA_FILES/.test(coreSrc) && /trashRootStatus/.test(coreSrc),
  '（REQ-5）守卫以配置的库根（PRIVHUB_DATA_FILES）为权威')
ok(/async purgeTrash[\s\S]{0,400}trashRootGuard\(\)/.test(coreSrc),
  '（REQ-5）purgeTrash 物理删除前先过守卫')
ok(/async purgeExpiredTrash[\s\S]{0,500}trashRootGuard\(\)/.test(coreSrc),
  '（REQ-5）定时清理 purgeExpiredTrash 前也过守卫（无人盯着的最危险）')
ok(/trash\?:\s*\{[\s\S]{0,120}dataFiles/.test(coreSrc) && /^\s+trash,$/m.test(coreSrc),
  '（REQ-5）storeCheck 回报 trash 一致性（启动自检即可发现根错配）')

/* ---- issue #2 REQ-6：蓝绿首启沿用旧单进程布局 ---- */
ok(/function probeLegacyLayout\s*\(/.test(control), '（REQ-6）控制层存在旧布局探测函数')
ok(/function adoptLegacyLayout\s*\(/.test(control), '（REQ-6）控制层存在沿用落盘函数')
ok(/opts\.dryRun/.test(control), '（REQ-6）沿用支持 dry-run（只报告不落盘）')
ok(/已有 config\/store\.json/.test(control), '（REQ-6）已配置过时不覆盖人的决定')
ok(/不会替你猜/.test(control), '（REQ-6）库在别处时明确拒绝猜测库根')
ok(/cmd === 'adopt-legacy'/.test(control), '（REQ-6）提供 adopt-legacy 显式子命令')
ok(/cmd === 'serve'[\s\S]{0,300}activateLegacyAdoption\(\)/.test(control),
  '（REQ-6）serve 时自动沿用（不是模块加载期，避免只读命令产生副作用）')
ok(/function computeDataFiles\s*\(/.test(control),
  '（REQ-6）库根改为函数求值（沿用结果能被后续代码看到，不是常量快照）')
ok(!/^const DATA_FILES_DIR/m.test(control) && !/^const DATA_FILES_EXPLICIT/m.test(control),
  '（REQ-6）不再有模块级 DATA_FILES_DIR/DATA_FILES_EXPLICIT 常量快照')
ok(/LEGACY_ADOPT\.publicPort/.test(control), '（REQ-6）可沿用旧实例的对外端口')

console.log('\n' + '='.repeat(56))
console.log(`  运行时契约：${pass} 通过 / ${fail} 失败`)
console.log('='.repeat(56) + '\n')
process.exit(fail === 0 ? 0 : 1)
