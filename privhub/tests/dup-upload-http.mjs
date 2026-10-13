/**
 * 上传期重复提示 · 端到端（Q6 / §3.3）—— HTTP 回归。
 *
 * 验收（方案原文）：**「同一文件传两次，第二次给出"内容重复"提示。」**
 * 这一条只能在真实上传链路上验（指纹是在流式落盘时顺带算的、查重是在 rename 之后
 * 做的），所以本套件打真服务（3190 隔离实例，由 `run-all.mjs --spawn` 拉起）。
 *
 * 另验：不同内容不误报 / 近似会报进 near / 跨项目不外泄 / 功能开关 dup.prompt 关掉后
 * 普通用户不再收到提示（管理员恒可）。
 *
 * 端口纪律：只打 3190（run-all 默认目标）。样本一律用 `_dq_` 前缀并在收尾清掉。
 *
 * @module tests/dup-upload-http
 */

import { createSuite, ok, eq, loginOk, uploadFile, safeDelete, purgeTrashOfProject, POST } from './lib.mjs'

const PROJECT = process.env.PRIVHUB_TEST_PROJECT || '公共'
const PFX = '_dq_'
const RAND = Date.now().toString(36).slice(-6)

const A = PFX + 'a_' + RAND + '.txt'
const B = PFX + 'b_' + RAND + '.txt'
const C = PFX + 'c_' + RAND + '.txt'
const D = PFX + 'd_' + RAND + '.txt'
const N_A = PFX + 'near_a_' + RAND + '.md'
const N_B = PFX + 'near_b_' + RAND + '.md'

/* 内容要足够独特，避免与其它套件/历史数据撞哈希 */
const TEXT = '上传期查重端到端样本 ' + RAND + '\n第二行也相同，这样两份内容一字不差。\n'
const OTHER = '这是一份不同内容的样本 ' + RAND + '，字面完全不一样。\n'
const SHARED = Array.from({ length: 40 }, (_, i) =>
  `第 ${i} 行：上传查重近似族端到端测试的共享正文 ${RAND}，写得足够长以便 MinHash 产生稳定指纹。`).join('\n')

function dupPaths(res) {
  return (res.json && res.json.duplicates ? res.json.duplicates : []).map((x) => x.path)
}

/** 设置某功能开关（管理员），返回是否成功。 */
async function setCap(token, patch) {
  const r = await POST('/privhub/api/cap/save', { token, body: { table: patch } })
  ok(r.json && r.json.ok, '设置功能开关失败：' + r.text.slice(0, 160))
  return r
}

export function build() {
  const s = createSuite('上传期重复提示（Q6/§3.3：同内容提示 + 开关）')
  let admin = ''
  let user1 = ''

  s.test('准备：管理员登录，上传第一份样本（作为"已有文件"）', async () => {
    admin = await loginOk('admin', 'admin123')
    const r = await uploadFile(admin, PROJECT, '', A, TEXT)
    ok(r.json && r.json.ok, '上传 A 失败：' + r.text.slice(0, 160))
    ok(dupPaths(r).length === 0, '首次上传不报重复（还没有可比的对象）')
  })

  s.test('★ 验收：同一文件传两次，第二次给出"内容重复"提示', async () => {
    const r = await uploadFile(admin, PROJECT, '', B, TEXT)
    ok(r.json && r.json.ok, '上传 B 失败：' + r.text.slice(0, 160))
    ok(dupPaths(r).includes(A), `第二次上传（同内容、不同名）应提示与 ${A} 内容相同（实测：${JSON.stringify(dupPaths(r))}）`)
    ok(Array.isArray(r.json.near) && r.json.near.length === 0, '一字不差的重复进 duplicates、不再重复进 near（两类不重报）')
  })

  s.test('不同内容不误报', async () => {
    const r = await uploadFile(admin, PROJECT, '', C, OTHER)
    ok(r.json && r.json.ok, '上传 C 失败：' + r.text.slice(0, 160))
    ok(dupPaths(r).length === 0, '内容不同不得报重复（实测：' + JSON.stringify(dupPaths(r)) + '）')
  })

  s.test('近似：共享大段正文、末行不同 → 报进 near 且带相似度', async () => {
    const ra = await uploadFile(admin, PROJECT, '', N_A, SHARED + '\n差异行：甲甲甲\n')
    ok(ra.json && ra.json.ok, '上传近似样本 A 失败：' + ra.text.slice(0, 160))
    const rb = await uploadFile(admin, PROJECT, '', N_B, SHARED + '\n差异行：乙乙乙\n')
    ok(rb.json && rb.json.ok, '上传近似样本 B 失败：' + rb.text.slice(0, 160))
    const near = (rb.json.near || [])
    const hit = near.find((x) => x.path === N_A)
    ok(!!hit, '高度相似的第二份应报进 near（实测：' + JSON.stringify(near.map((x) => x.path)) + '）')
    ok(hit && typeof hit.score === 'number' && hit.score >= 0.9, 'near 带相似度且 ≥ 阈值（实测 ' + (hit && hit.score) + '）')
  })

  s.test('功能开关 dup.prompt：关掉后普通用户不再收到提示，管理员仍提示', async () => {
    user1 = await loginOk('user1', 'user123')
    await setCap(admin, { 'dup.prompt': 'none' })
    try {
      // 普通用户：同内容再传一次，响应里不应带 duplicates 字段
      const ru = await uploadFile(user1, PROJECT, '', D, TEXT)
      ok(ru.json && ru.json.ok, '普通用户上传失败：' + ru.text.slice(0, 160))
      ok(!('duplicates' in ru.json), '开关关掉后普通用户的响应里没有 duplicates（实测 keys：' + JSON.stringify(Object.keys(ru.json || {})) + '）')
      // 管理员恒可：同内容再传一次仍提示（内容与 A/B 相同）
      const ra = await uploadFile(admin, PROJECT, '', PFX + 'e_' + RAND + '.txt', TEXT)
      ok(ra.json && ra.json.ok, '管理员上传失败：' + ra.text.slice(0, 160))
      ok(dupPaths(ra).includes(A), '管理员不受开关影响（管理员恒为可读写），仍收到重复提示')
    } finally {
      await setCap(admin, { 'dup.prompt': 'read' }) // 复位，不留偏离默认的配置
    }
  })

  s.test('清理：删除样本并清空回收站', async () => {
    for (const p of [A, B, C, PFX + 'e_' + RAND + '.txt', N_A, N_B]) {
      await safeDelete(admin, PROJECT, p)
    }
    await purgeTrashOfProject(admin, PROJECT)
  })

  return s
}

export default build
