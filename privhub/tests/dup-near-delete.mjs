/**
 * 近似 / 版本族「可勾选删除」开关（Q7 / §3.5）—— HTTP 回归。
 *
 * Q7 的拍板：近似/版本族**默认只提示、不勾选**；能不能勾进删除流程由功能开关
 * `dup.near.delete` 决定（管理员恒可，普通用户默认关）。服务端在 `/rag/dup` 结果里
 * 回带 `allowNearDelete` 作为**单一事实来源**，界面据此决定渲不渲染勾选框 ——
 * 本套件就钉住这个字段：管理员恒 true、普通用户默认 false、开关打开后 true。
 *
 * 为什么值得单独验：这是个"能力开关"，判反了会两个方向都疼 ——
 * 默认 true ⇒ 普通用户能一键删掉"看起来像重复"的近似文件（Q7 明确不建议）；
 * 开关打开仍 false ⇒ 管理员开了却用不了。
 *
 * 端口纪律：只打 3190（run-all 默认目标）。本套件不建任何文件，只读接口 + 改/复位开关。
 *
 * @module tests/dup-near-delete
 */

import { createSuite, ok, eq, loginOk, GET, POST } from './lib.mjs'

const PROJECT = process.env.PRIVHUB_TEST_PROJECT || '公共'

async function allowNearDelete(token) {
  const r = await GET('/privhub/api/rag/dup?' + new URLSearchParams({ project: PROJECT }), { token })
  ok(r.json && r.json.ok, '查重接口失败：' + r.text.slice(0, 160))
  return r.json.allowNearDelete
}

async function setCap(token, patch) {
  const r = await POST('/privhub/api/cap/save', { token, body: { table: patch } })
  ok(r.json && r.json.ok, '设置功能开关失败：' + r.text.slice(0, 160))
  return r
}

export function build() {
  const s = createSuite('近似/版本族删除开关（Q7：管理员恒可 / 用户默认关 / 可开）')
  let admin = ''

  s.test('准备：管理员登录', async () => {
    admin = await loginOk('admin', 'admin123')
    await setCap(admin, { 'dup.near.delete': 'none' }) // 从默认态开始
  })

  s.test('管理员恒可：dup.near.delete=none 时 allowNearDelete 仍为 true', async () => {
    eq(await allowNearDelete(admin), true, '管理员对 dup.near.delete 恒为 write（用户口径：对管理员全开放）')
  })

  s.test('普通用户默认关：user1 拿到 allowNearDelete=false', async () => {
    const u = await loginOk('user1', 'user123')
    eq(await allowNearDelete(u), false, '普通用户默认不可勾选近似族删除（Q7：默认只提示）')
  })

  s.test('开关打开：把 dup.near.delete 设为 write 后，普通用户 allowNearDelete=true', async () => {
    await setCap(admin, { 'dup.near.delete': 'write' })
    const u = await loginOk('user1', 'user123')
    eq(await allowNearDelete(u), true, '开关打开后普通用户可勾选（这就是"简单切换的开关"）')
  })

  s.test('复位：dup.near.delete 恢复默认（none），不留偏离默认的配置', async () => {
    await setCap(admin, { 'dup.near.delete': 'none' })
    const u = await loginOk('user1', 'user123')
    eq(await allowNearDelete(u), false, '复位生效')
  })

  return s
}

export default build
