/**
 * storeops-panel-verify.mjs — 存储运维（超管）前端面板静态回归
 *
 * v2 存储重构阶段 3：privhub-store-ops（client-only）两块面板
 * （扫描与建库 / 物理搬移）的接线与文案契约。纯静态断言，不需要服务。
 *
 *   node tests/storeops-panel-verify.mjs
 *
 * @module tests/storeops-panel-verify
 */

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const PLUGIN = join(ROOT, 'plugins', 'privhub-store-ops', 'client')

let pass = 0
let fail = 0
const failures = []
function okc(cond, msg) {
  if (cond) { pass++ } else { fail++; failures.push(msg) }
  console.log((cond ? '  ✅ ' : '  ❌ ') + msg)
}

console.log('── A. manifest 接线 ──')
const mfPath = join(PLUGIN, 'manifest.json')
okc(existsSync(mfPath), 'manifest.json 存在')
let mf = null
try { mf = JSON.parse(readFileSync(mfPath, 'utf8')) } catch { /* 下面断言会红 */ }
okc(!!mf && Array.isArray(mf.slots) && mf.slots.includes('admin-storeops'), 'manifest 声明 admin-storeops slot')
okc(!!mf && Array.isArray(mf.barItems) && mf.barItems.length === 1, 'manifest 声明一个入口 barItem')
const bi = mf && mf.barItems && mf.barItems[0]
okc(!!bi && bi.slot === 'admin-nav' && bi.view === 'admin-storeops', 'barItem 指向 admin-nav / view=admin-storeops（控制台侧栏条目）')
okc(!!bi && bi.adminOnly === true, 'barItem adminOnly=true（普通用户不可见）')
okc(!!bi && bi.capFeature === 'admin.storage', 'barItem capFeature=admin.storage（minRole=system_admin，入口仅超管可见）')

console.log('── B. 控制台路由表接线 ──')
const routesSrc = readFileSync(join(ROOT, 'plugins', 'privhub-admin-console', 'client', 'routes.js'), 'utf8')
okc(/key:\s*'ops\/storeops'/.test(routesSrc), '控制台路由表含 ops/storeops 条目')
okc(/slot:\s*'admin-storeops'/.test(routesSrc), '控制台条目的 slot 指向 admin-storeops')
okc(/entryOf:\s*'admin-storeops'/.test(routesSrc), '控制台条目 entryOf=admin-storeops（插件未装载显示「未安装」）')

console.log('── C. 面板关键文案与契约 ──')
const SRC = readFileSync(join(PLUGIN, 'index.js'), 'utf8')
okc(SRC.includes('扫描登记'), '面板 A 含「扫描登记」按钮文案')
okc(SRC.includes('一键扫描+建库+搬移'), '面板 A 含一键扫描+建库+搬移入口')
okc(SRC.includes('物理搬移'), '面板 B 含「物理搬移」标题')
okc(SRC.includes('包含个人空间'), '面板 B 含「包含个人空间」开关')
okc(SRC.includes('超管全库操作'), '个人空间开关标注「超管全库操作」')
okc(SRC.includes('抽样全部为明文 ✅'), '搬完抽样 c=0 显示「抽样全部为明文 ✅」')
okc(SRC.includes('默认库根'), '卷下拉含「默认库根」哨兵选项')
okc(SRC.includes('__default_root__'), '定义了 __default_root__ 哨兵常量（发后端映射为空/null）')
okc(/targetVolumeId:\s*this\.mvTargetId === SO_DEFAULT \? null/.test(SRC), '搬移发后端时哨兵映射为 null')
okc(SRC.includes('仅系统管理员可用'), '非超管访问显示「仅系统管理员可用」')
okc(SRC.includes("isSystemAdmin()"), '挂载后按 isSystemAdmin() 二次拦截（v-if 整页隐藏）')
okc(SRC.includes('failedRecent'), '展示失败明细 failedRecent')
okc(SRC.includes('poolCipherSample'), '使用 move-status 的 poolCipherSample 摘要')
okc(SRC.includes('/privhub/api/storeinfo/scan'), '面板 A 调 storeinfo/scan')
okc(SRC.includes('/privhub/api/storeinfo/status'), '面板 A 轮询 storeinfo/status')
okc(SRC.includes('/privhub/api/storeops/move'), '面板 B 调 storeops/move')
okc(SRC.includes('/privhub/api/storeops/move-status'), '面板 B 轮询 storeops/move-status')
okc(SRC.includes('/privhub/api/storeops/move-cancel'), '面板 B 可取消（move-cancel）')
okc(SRC.includes('/privhub/api/storeops/scan+build'), '一键入口调 storeops/scan+build')
okc(SRC.includes('/privhub/api/volumes/list'), '卷下拉数据来自 volumes/list')
okc(SRC.includes('连做两步'), '一键确认文案说明会连做扫描与搬移两步')

console.log('── C2. 面板 A 文件清单区（收尾任务 1） ──')
okc(SRC.includes('文件清单'), '面板 A 含「文件清单」区')
okc(SRC.includes('/privhub/api/storeinfo/entries'), '清单区调用 entries 路由')
okc(SRC.includes('上一页') && SRC.includes('下一页'), '清单分页控件（上一页/下一页）')
okc(SRC.includes('开放对象'), '清单含「开放对象」列')
okc(SRC.includes('实际位置'), '清单含「实际位置」列')
okc(SRC.includes('密文') && SRC.includes('明文'), '清单含密文/明文形态列')
okc(SRC.includes('个人空间'), '清单含个人空间徽标文案')
okc(SRC.includes('owner'), '个人空间条目展示 owner')
okc(/:title=/.test(SRC), '长路径 title 属性 hover 显示全路径')
okc(SRC.includes('loadEntries'), '清单加载方法 loadEntries 存在')
okc(SRC.includes('soVisibility'), 'access.visibility 中文映射方法存在')
okc(SRC.includes('soSize'), '大小格式化方法存在')

console.log('── D. 纪律（不跨插件 import / 后端零改动） ──')
okc(!/from\s+'\/privhub-plugins\//.test(SRC), '无 /privhub-plugins/ 绝对路径跨插件 import')
okc(!/from\s+'[^']*\.\.\/privhub-admin-console\//.test(SRC), '无相对路径跨插件深引用（admin-console 等）')
okc(!/import\s+[^;]*from\s+'(\.\.\/)+[^']*(admin-console|relocate-panel|storage-panel)/.test(SRC), '不 import 旧面板/控制台内部模块')
okc(SRC.includes("window.PrivHub"), '仅通过 window.PrivHub 全局桥取依赖')
const routePatched = readFileSync(join(ROOT, 'plugins', 'privhub-admin-console', 'client', 'routes.js'), 'utf8')
okc(routePatched.includes("key: 'ops/storeops'") && !routePatched.includes('privhub-store-ops/client'), '控制台只加路由行，未反向 import 本插件')
okc(!existsSync(join(ROOT, 'plugins', 'privhub-store-ops', 'src')), 'client-only：无 src/index.ts（不参与服务端挂载）')

console.log(`\n${'='.repeat(56)}`)
console.log(`  存储运维面板回归：${pass} 通过 / ${fail} 失败`)
for (const f of failures) console.log('   ❌ ' + f)
console.log('='.repeat(56))
process.exit(fail === 0 ? 0 : 1)
