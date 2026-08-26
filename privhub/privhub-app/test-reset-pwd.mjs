// 测试管理员重置用户密码功能
const BASE = 'http://127.0.0.1:3180'
async function run() {
  // admin 登录
  const l1 = await (await fetch(`${BASE}/privhub/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'admin123' }) })).json()
  const auth = { authorization: 'Bearer ' + l1.token }

  // 重置 user1 密码为 newpass123
  const r = await fetch(`${BASE}/privhub/api/admin/user-reset-password`, {
    method: 'POST', headers: { 'content-type': 'application/json', ...auth },
    body: JSON.stringify({ username: 'user1', newPassword: 'newpass123' }),
  })
  console.log('1. 重置 user1 密码:', await r.text())

  // 用旧密码登录 → 应失败
  const oldLogin = await (await fetch(`${BASE}/privhub/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'user1', password: 'user123' }) })).json()
  console.log('2. 旧密码登录(应失败):', JSON.stringify(oldLogin))

  // 用新密码登录 → 应成功
  const newLogin = await (await fetch(`${BASE}/privhub/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'user1', password: 'newpass123' }) })).json()
  console.log('3. 新密码登录(应成功):', JSON.stringify(newLogin))

  // 非法：密码太短
  const short = await fetch(`${BASE}/privhub/api/admin/user-reset-password`, {
    method: 'POST', headers: { 'content-type': 'application/json', ...auth },
    body: JSON.stringify({ username: 'user1', newPassword: '123' }),
  })
  console.log('4. 短密码(应失败):', await short.text())

  // 恢复 user1 原密码 user123
  const restore = await fetch(`${BASE}/privhub/api/admin/user-reset-password`, {
    method: 'POST', headers: { 'content-type': 'application/json', ...auth },
    body: JSON.stringify({ username: 'user1', newPassword: 'user123' }),
  })
  console.log('5. 恢复 user1 原密码:', await restore.text())
}
run().catch((e) => console.error('错误:', e.message))
