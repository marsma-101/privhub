// 子路径功能接口测试（用原生 fetch，避免 shell 转义问题）
const BASE = 'http://127.0.0.1:3181'

async function run() {
  const loginRes = await fetch(`${BASE}/privhub/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  })
  const login = await loginRes.json()
  console.log('1. 登录:', JSON.stringify(login))
  const token = login.token
  const auth = { authorization: 'Bearer ' + token }

  const r1 = await fetch(`${BASE}/privhub/api/list?project=${encodeURIComponent('A项目')}`, { headers: auth })
  console.log('2. A项目根:', await r1.text())

  const r2 = await fetch(`${BASE}/privhub/api/list?project=${encodeURIComponent('A项目')}&path=${encodeURIComponent('设计稿')}`, { headers: auth })
  console.log('3. A项目/设计稿:', await r2.text())

  const r3 = await fetch(`${BASE}/privhub/api/mkdir`, {
    method: 'POST', headers: { 'content-type': 'application/json', ...auth },
    body: JSON.stringify({ project: 'A项目', path: '设计稿', name: '图标' }),
  })
  console.log('4. 建子文件夹:', await r3.text())

  const r4 = await fetch(`${BASE}/privhub/api/preview?project=${encodeURIComponent('A项目')}&path=${encodeURIComponent('设计稿/UI/说明.txt')}`, { headers: auth })
  console.log('5. 预览 设计稿/UI/说明.txt:', await r4.text())

  const r5 = await fetch(`${BASE}/privhub/api/list?project=${encodeURIComponent('A项目')}&path=${encodeURIComponent('设计稿/UI')}`, { headers: auth })
  console.log('6. A项目/设计稿/UI:', await r5.text())
}

run().catch((e) => console.error('错误:', e.message))
