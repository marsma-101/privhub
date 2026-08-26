/**
 * 冒烟测试补充：验证普通用户 user1 的界面级权限隔离
 * user1 应只见「公共」「A项目」，看不到「B项目」；且无「用户管理」「＋项目」入口。
 */
import { chromium } from 'playwright-core'

const BASE = 'http://127.0.0.1:3180'
let fails = 0
function check(name, cond) {
  if (cond) console.log('✅ ' + name)
  else { console.log('❌ ' + name); fails++ }
}

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage()
const errs = []
page.on('pageerror', (e) => errs.push(e.message))

try {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.fill('input[placeholder*="用户名"]', 'user1')
  await page.fill('input[type="password"]', 'user123')
  await page.click('button:has-text("登 录")')
  await page.waitForSelector('.topbar', { timeout: 5000 })

  check('user1 登录成功', await page.locator('.topbar').count() > 0)
  check('显示普通用户徽章(非管理员)', await page.locator('.badge:not(.admin)').count() > 0)

  await page.waitForTimeout(800)
  await page.waitForSelector('.tree-item', { timeout: 5000 })

  check('user1 可见 公共', await page.locator('.tree-item:has-text("公共")').count() > 0)
  check('user1 可见 A项目', await page.locator('.tree-item:has-text("A项目")').count() > 0)
  check('user1 不可见 B项目', await page.locator('.tree-item:has-text("B项目")').count() === 0)
  check('user1 无「＋项目」按钮', await page.locator('button:has-text("＋项目")').count() === 0)

  await page.click('.settings-fab')
  await page.waitForTimeout(400)
  check('user1 设置里无「用户管理」', await page.locator('.modal button:has-text("用户管理")').count() === 0)

} catch (e) {
  console.log('❌ 异常: ' + e.message)
  fails++
}

if (errs.length) { console.log('❌ 页面错误: ' + errs.join('; ')); fails++ }
else console.log('✅ 无页面错误')

console.log(`\n===== 权限隔离冒烟: ${fails === 0 ? '全部通过 ✅' : fails + ' 项失败 ❌'} =====`)
await browser.close()
