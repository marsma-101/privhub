/**
 * 多 Profile 模型配置回归（§1.2）+ 生成参数（§Q2）
 *
 * 覆盖 HTTP 面：
 *   - 鉴权：未登录 401；普通用户读/改模型配置 403。
 *   - profile 增删改切：新建（第一套自动设为当前）、切换、删除（当前项顺位）。
 *   - 兼容旧形状：POST 扁平 {llm,embedding,maxRetries} 写进当前 profile。
 *   - 参数清洗：越界夹到界限（temperature 9 → 2、top_p 2 → 1）。
 *   - 落盘：data/model.json 加密（PHENC1）（仅在 PRIVHUB_TEST_ROOT 存在时断言）。
 *
 * 「参数真的进上游请求体」「旧结构迁移」这类纯逻辑/出网语义在 tests/model-parsing.mjs §8
 * 里以进程内真 svc-model + 假上游验证（那里能抓到请求体，这里抓不到）。
 *
 * 收尾清掉本套件建的 profile，跑完不留被改动的模型配置。
 *
 * @module tests/model-profiles
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createSuite, ok, eq, GET, POST, loginOk } from './lib.mjs'

export function build() {
  const s = createSuite('多 Profile 模型配置（model-profiles）')
  let admin = ''
  let user1 = ''
  const made = []

  const mockEp = { baseURL: 'mock', model: 'mock-llm', timeoutMs: 5000 }
  const mockEmb = { baseURL: 'mock', model: 'mock-emb', timeoutMs: 5000 }

  s.test('未登录读模型配置 → 401', async () => {
    const r = await GET('/privhub/api/model/config')
    eq(r.status, 401, '未登录应 401')
  })

  s.test('登录（admin / user1）', async () => {
    admin = await loginOk('admin', 'admin123')
    user1 = await loginOk('user1', 'user123')
    ok(!!user1, '普通用户可登录')
  })

  s.test('普通用户读模型配置 → 403', async () => {
    const r = await GET('/privhub/api/model/config', { token: user1 })
    eq(r.status, 403, '普通用户读模型配置应 403')
  })

  s.test('管理员读：返回 profiles 列表与 activeId', async () => {
    const r = await GET('/privhub/api/model/config', { token: admin })
    ok(r.json && r.json.ok, '读取失败：' + r.text.slice(0, 120))
    ok(Array.isArray(r.json.profiles), 'profiles 应为数组')
    ok('activeId' in r.json, '应回 activeId')
    eq(r.json.corrupt, false, '初始不应处于损坏态')
  })

  s.test('新建第一套（activate）→ 自动设为当前', async () => {
    const r = await POST('/privhub/api/model/profile', {
      token: admin,
      body: { name: '_reg_甲', llm: mockEp, embedding: mockEmb, activate: true },
    })
    ok(r.json && r.json.ok, '新建失败：' + r.text.slice(0, 120))
    const mine = (r.json.profiles || []).find((p) => p.name === '_reg_甲')
    ok(!!mine, '列表里应出现新建的 profile')
    if (mine) { made.push(mine.id); eq(r.json.activeId, mine.id, '第一套应自动设为当前') }
  })

  s.test('config 摊平视图反映当前 profile（baseURL=mock）', async () => {
    const r = await GET('/privhub/api/model/config', { token: admin })
    eq(r.json.configured, true, '配置了 mock 端点后应视为已配置')
    eq(r.json.config?.llm?.baseURL, 'mock', '摊平视图的 llm.baseURL 应为 mock')
  })

  s.test('新建第二套（不 activate）→ 不抢当前', async () => {
    let r = await GET('/privhub/api/model/config', { token: admin })
    const beforeActive = r.json.activeId
    r = await POST('/privhub/api/model/profile', {
      token: admin,
      body: { name: '_reg_乙', llm: { ...mockEp, model: 'mock-llm-2' }, embedding: mockEmb },
    })
    ok(r.json && r.json.ok, '新建第二套失败：' + r.text.slice(0, 120))
    const mine = (r.json.profiles || []).find((p) => p.name === '_reg_乙')
    if (mine) made.push(mine.id)
    eq(r.json.activeId, beforeActive, '未传 activate 不应改变当前生效项')
  })

  s.test('切换当前 profile', async () => {
    const list = await GET('/privhub/api/model/config', { token: admin })
    const target = (list.json.profiles || []).find((p) => p.name === '_reg_乙')
    ok(!!target, '应有 _reg_乙')
    if (!target) return
    const r = await POST('/privhub/api/model/activate', { token: admin, body: { id: target.id } })
    ok(r.json && r.json.ok, '切换失败：' + r.text.slice(0, 120))
    eq(r.json.activeId, target.id, 'activeId 应切到目标')
    const after = await GET('/privhub/api/model/config', { token: admin })
    eq(after.json.config?.llm?.model, 'mock-llm-2', '摊平视图的模型名应随切换而变')
  })

  s.test('参数越界被夹到界限', async () => {
    const list = await GET('/privhub/api/model/config', { token: admin })
    const target = (list.json.profiles || []).find((p) => p.name === '_reg_乙')
    if (!target) { ok(false, '缺 _reg_乙'); return }
    const r = await POST('/privhub/api/model/profile', {
      token: admin,
      body: { id: target.id, name: '_reg_乙', llm: { ...mockEp, model: 'mock-llm-2' }, embedding: mockEmb, params: { temperature: 9, topP: 2, maxTokens: 2048 } },
    })
    ok(r.json && r.json.ok, '保存参数失败：' + r.text.slice(0, 120))
    const p = (r.json.profiles || []).find((x) => x.id === target.id)
    eq(p?.params?.temperature, 2, 'temperature 9 应被夹到 2')
    eq(p?.params?.topP, 1, 'top_p 2 应被夹到 1')
    eq(p?.params?.maxTokens, 2048, 'max_tokens 合法值原样保留')
  })

  s.test('非法 baseURL → 400', async () => {
    const r = await POST('/privhub/api/model/profile', {
      token: admin,
      body: { name: '_reg_bad', llm: { baseURL: 'ftp://nope', model: 'x', timeoutMs: 5000 }, embedding: mockEmb },
    })
    eq(r.status, 400, '非法 baseURL 应 400')
  })

  s.test('兼容旧形状：POST /model/config 扁平结构写进当前 profile', async () => {
    const list = await GET('/privhub/api/model/config', { token: admin })
    const active = list.json.activeId
    const r = await POST('/privhub/api/model/config', {
      token: admin,
      body: { llm: { ...mockEp, model: 'legacy-model' }, embedding: mockEmb, maxRetries: 3 },
    })
    ok(r.json && r.json.ok, '旧形状保存失败：' + r.text.slice(0, 120))
    const after = await GET('/privhub/api/model/config', { token: admin })
    eq(after.json.activeId, active, '旧形状写入不应改动 activeId')
    eq(after.json.config?.llm?.model, 'legacy-model', '旧形状写入后当前 profile 的模型名应更新')
    eq(after.json.maxRetries, 3, 'maxRetries 应被写入')
  })

  s.test('普通用户改模型配置 → 403', async () => {
    const r = await POST('/privhub/api/model/profile', {
      token: user1,
      body: { name: '_reg_hack', llm: mockEp, embedding: mockEmb },
    })
    eq(r.status, 403, '普通用户改模型配置应 403')
  })

  s.test('删除 profile', async () => {
    const list = await GET('/privhub/api/model/config', { token: admin })
    const target = (list.json.profiles || []).find((p) => p.name === '_reg_甲')
    ok(!!target, '应有 _reg_甲')
    if (!target) return
    const r = await POST('/privhub/api/model/profile/delete', { token: admin, body: { id: target.id } })
    ok(r.json && r.json.ok, '删除失败：' + r.text.slice(0, 120))
    ok(!(r.json.profiles || []).some((p) => p.id === target.id), '删除后列表不应再有它')
    const i = made.indexOf(target.id); if (i >= 0) made.splice(i, 1)
  })

  s.test('删除不存在的 profile → 400', async () => {
    const r = await POST('/privhub/api/model/profile/delete', { token: admin, body: { id: 'nope-xyz' } })
    eq(r.status, 400, '删除不存在的 profile 应 400')
  })

  s.test('落盘：model.json 加密（PHENC1）', async () => {
    const root = process.env.PRIVHUB_TEST_ROOT
    if (!root) return   // 无测试根时静默降级
    const f = join(root, 'data', 'model.json')
    ok(existsSync(f), 'model.json 应存在')
    const head = readFileSync(f).subarray(0, 6).toString('latin1')
    eq(head, 'PHENC1', '模型配置应以密文落盘（PHENC1 头）')
  })

  s.test('清理：删除本套件建的 profile 并把 maxRetries 复位', async () => {
    for (const id of made.slice()) {
      const r = await POST('/privhub/api/model/profile/delete', { token: admin, body: { id } })
      if (r.json && r.json.ok) made.splice(made.indexOf(id), 1)
    }
    // 把全局重试数复位（本套件在上面改成了 3）
    await POST('/privhub/api/model/config', { token: admin, body: { llm: { baseURL: '' }, embedding: { baseURL: '' }, maxRetries: 2 } })
    const after = await GET('/privhub/api/model/config', { token: admin })
    eq(after.json.maxRetries, 2, 'maxRetries 应复位为 2')
    ok(made.length === 0, '本套件建的 profile 应已清理干净')
  })

  return s
}
