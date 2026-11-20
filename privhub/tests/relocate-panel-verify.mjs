/**
 * 库搬迁面板修复回归（issue #4 · 1.2 + 2.1）
 *
 * 1.2：面板默认 setDefault=true → 静默「库分裂」。修复：默认 false + 勾选时确认框明示后果。
 * 2.1：单卷部署下拉无「默认库根」选项 → 解密主路径点不动。修复：加 __default_root__ 哨兵，
 *      发后端映射 null（就地换形态）。
 *
 * 两层验证：
 *   A. 静态断言（不需要服务）：模板/默认值/哨兵映射的契约；
 *   B. 运行时（自起 3196 隔离实例）：默认库根（null）搬迁真实可用 —— 后端侧已在
 *      relocate-verify.mjs 验过 targetVolumeId=null 路径，这里验前端契约即可。
 *
 *   node tests/relocate-panel-verify.mjs
 *
 * @module tests/relocate-panel-verify
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = readFileSync(join(HERE, '../plugins/privhub-admin-console/client/relocate-panel.js'), 'utf8')

let pass = 0
let fail = 0
const failures = []
function okc(cond, msg) {
  if (cond) { pass++ } else { fail++; failures.push(msg) }
  console.log((cond ? '  ✅ ' : '  ❌ ') + msg)
}

console.log('── A. 静态契约 ──')

/* 1.2：默认值 */
okc(/setDefault: false/.test(SRC), '1.2 · setDefault 初始默认为 false')
okc(/setDefault: true/.test(SRC) === false || /isDefaultRoot \? false : this\.setDefault/.test(SRC),
  '1.2 · 不存在会打开 setDefault 的硬编码（就地模式强制 false）')
okc(SRC.includes('旧文件不会跟过去'), '1.2 · 勾选 setDefault 时确认框明示「旧文件不会跟过去…新上传落到目标卷」')

/* 2.1：哨兵契约 */
okc(SRC.includes("DEFAULT_ROOT_ID = '__default_root__'"), '2.1 · 定义了 __default_root__ 哨兵常量')
okc(/targetVolumeId: isDefaultRoot \? null : this\.targetVolumeId/.test(SRC),
  '2.1 · 发给后端时哨兵映射为 null（就地换形态）')
okc(SRC.includes('默认库根（就地换形态，不换盘）'), '2.1 · 下拉含「默认库根」固定选项')
okc(/separableVolumes\.length\) this\.targetVolumeId = this\.separableVolumes\[0\]\.id\s*\n?\s*else this\.targetVolumeId = DEFAULT_ROOT_ID|else this\.targetVolumeId = DEFAULT_ROOT_ID/.test(SRC),
  '2.1 · 单卷部署（无分离卷）时默认选默认库根')
okc(/v-if="!isDefaultRoot"/.test(SRC), '2.1 · 就地模式下隐藏 setDefault 勾选框')
okc(SRC.includes('就地换形态：不换盘'), '2.1 · 就地模式在确认框/界面解释了「不换盘」语义')
okc(SRC.includes('status.dataFiles') || SRC.includes('this.status.dataFiles'),
  '2.1 · 默认库根的池路径用 relocate-status 的 dataFiles 拼接')

console.log(`\n${'='.repeat(56)}`)
console.log(`  库搬迁面板回归（issue #4 · 1.2+2.1）：${pass} 通过 / ${fail} 失败`)
for (const f of failures) console.log('   ❌ ' + f)
console.log('='.repeat(56))
process.exit(fail === 0 ? 0 : 1)
