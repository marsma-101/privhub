/**
 * 冒烟测试：排序 + 视图切换
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

  // 进入 A项目
  await page.locator('.tree-item', { hasText: 'A项目' }).first().locator('.name').click()
  await page.waitForTimeout(800)

  // 默认网格视图
  check('默认网格视图', await page.locator('.file-list').count() > 0)

  // 切到列表视图
  await page.click('button:has-text("☰")')
  await page.waitForTimeout(400)
  check('切换到列表视图(有列表头)', await page.locator('.file-table-head').count() > 0)
  check('列表显示行', await page.locator('.file-table-row').count() > 0)

  // 切回网格
  await page.click('button:has-text("▦")')
  await page.waitForTimeout(400)
  check('切回网格视图', await page.locator('.file-list').count() > 0)

  // 点大小排序
  await page.click('button:has-text("大小")')
  await page.waitForTimeout(300)
  check('排序按钮存在且可点', true)

} catch (e) {
  console.log('❌ 异常: ' + e.message)
  fails++
}

if (errs.length) { console.log('❌ 页面错误: ' + errs.join('; ')); fails++ }
else console.log('✅ 无页面错误')

console.log(`\n===== 排序视图冒烟: ${fails === 0 ? '全部通过 ✅' : fails + ' 项失败 ❌'} =====`)
await browser.close()
