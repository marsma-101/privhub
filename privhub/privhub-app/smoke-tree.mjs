/**
 * 冒烟测试：验证目录树的展开、子文件夹浏览、面包屑导航
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
  await page.fill('input[placeholder*="用户名"]', 'admin')
  await page.fill('input[type="password"]', 'admin123')
  await page.click('button:has-text("登 录")')
  await page.waitForSelector('.topbar', { timeout: 5000 })
  await page.waitForTimeout(800)

  check('项目树显示 A项目', await page.locator('.tree-item:has-text("A项目")').count() > 0)

  const aNode = page.locator('.tree-item', { hasText: 'A项目' }).first()
  await aNode.locator('.tree-arrow').click()
  await page.waitForTimeout(800)
  check('展开后显示 设计稿 子文件夹', await page.locator('.tree-item:has-text("设计稿")').count() > 0)
  check('展开后显示 合同', await page.locator('.tree-item:has-text("合同")').count() > 0)

  const sheji = page.locator('.tree-item', { hasText: '设计稿' }).first()
  await sheji.locator('.tree-arrow').click()
  await page.waitForTimeout(800)
  check('展开 设计稿 后显示 UI', await page.locator('.tree-item:has-text("UI")').count() > 0)

  await page.locator('.tree-item', { hasText: '设计稿' }).first().locator('span > span.name, span:nth-child(2)').first().click()
  await page.waitForTimeout(800)
  check('进入 设计稿 后显示面包屑', await page.locator('.breadcrumb').count() > 0)
  check('面包屑含 设计稿', await page.locator('.breadcrumb:has-text("设计稿")').count() > 0)

  const crumbA = page.locator('.breadcrumb a:has-text("A项目")').first()
  if (await crumbA.count() > 0) {
    await crumbA.click()
    await page.waitForTimeout(600)
    check('面包屑返回 A项目根', await page.locator('.breadcrumb:has-text("A项目")').count() > 0)
  }

} catch (e) {
  console.log('❌ 异常: ' + e.message)
  fails++
}

if (errs.length) { console.log('❌ 页面错误: ' + errs.join('; ')); fails++ }
else console.log('✅ 无页面错误')

console.log(`\n===== 目录树冒烟: ${fails === 0 ? '全部通过 ✅' : fails + ' 项失败 ❌'} =====`)
await browser.close()
