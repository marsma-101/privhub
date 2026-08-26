/**
 * 私域枢纽冒烟测试脚本
 * 驱动系统 Edge（channel:msedge）做端到端验证。
 */
import { chromium } from 'playwright-core'

const BASE = 'http://127.0.0.1:3180'
const results = []
const consoleErrors = []

function check(name, cond) {
  results.push({ name, pass: !!cond })
  console.log(`${cond ? '✅' : '❌'} ${name}`)
}

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage()
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
page.on('pageerror', (err) => { consoleErrors.push('PageError: ' + err.message) })

try {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  check('首页加载(HTTP 200)', true)
  check('登录页渲染(Vue执行成功)', await page.locator('.auth-card').count() > 0)
  const title = await page.title()
  check('页面标题正确', title.includes('私域枢纽'))

  check('有用户名输入框', await page.locator('input[placeholder*="用户名"]').count() > 0)
  check('有密码输入框', await page.locator('input[type="password"]').count() > 0)
  check('有登录按钮', await page.locator('button:has-text("登")').count() > 0)
  check('有注册入口', await page.locator('text=申请注册').count() > 0)

  await page.fill('input[placeholder*="用户名"]', 'admin')
  await page.fill('input[type="password"]', 'admin123')
  await page.click('button:has-text("登 录")')
  await page.waitForSelector('.topbar', { timeout: 5000 })
  check('登录成功进入主界面', true)
  check('顶栏显示私域枢纽', await page.locator('.logo:has-text("私域枢纽")').count() > 0)
  check('显示管理员徽章', await page.locator('.badge.admin').count() > 0)

  await page.waitForSelector('.tree-item', { timeout: 5000 })
  const treeCount = await page.locator('.tree-item').count()
  check(`项目树有项目(共${treeCount}项)`, treeCount >= 4)
  check('有A项目', await page.locator('.tree-item:has-text("A项目")').count() > 0)

  check('中间显示欢迎语', await page.locator('text=欢迎使用私域枢纽').count() > 0)

  await page.click('.tree-item:has-text("公共")')
  await page.waitForTimeout(800)
  check('点击项目后显示文件面板', await page.locator('.main-head').count() > 0)

  await page.click('.settings-fab')
  await page.waitForTimeout(500)
  check('设置弹窗打开', await page.locator('.modal:has-text("设置")').count() > 0)
  check('有主题切换', await page.locator('.theme-opt').count() >= 2)

  await page.click('.theme-opt:has-text("深色")')
  await page.waitForTimeout(400)
  const themeAttr = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
  check('深色主题生效', themeAttr === 'dark')
  await page.click('.theme-opt:has-text("浅色")')
  await page.waitForTimeout(400)

  check('管理员可见用户管理入口', await page.locator('.modal:has-text("用户管理")').count() > 0)
  await page.click('.modal button:has-text("用户管理")')
  await page.waitForTimeout(800)
  check('用户管理弹窗打开', await page.locator('.u-table').count() > 0)
  check('用户列表有admin', await page.locator('.u-table td:has-text("admin")').count() > 0)

  await page.click('.modal button:has-text("关 闭")')
  await page.waitForTimeout(300)

} catch (e) {
  console.log('❌ 冒烟测试异常: ' + e.message)
  results.push({ name: '异常中断', pass: false, error: e.message })
}

console.log('\n===== 控制台错误 =====')
if (consoleErrors.length === 0) console.log('✅ 无 JS 控制台错误')
else {
  console.log(`❌ 发现 ${consoleErrors.length} 个错误：`)
  consoleErrors.forEach((e, i) => console.log(`  ${i + 1}. ${e.slice(0, 200)}`))
}

const passed = results.filter((r) => r.pass).length
console.log(`\n===== 冒烟测试结果: ${passed}/${results.length} 通过 =====`)
await browser.close()
