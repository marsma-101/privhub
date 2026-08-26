/**
 * 冒烟测试：双击文件夹进入（像 Windows 双击打开）
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
  check('进入 A项目，中间显示文件列表', await page.locator('.file-list').count() > 0)
  check('可见 设计稿 文件夹', await page.locator('.file-card:has-text("设计稿")').count() > 0)

  // 双击 设计稿 文件夹
  await page.locator('.file-card:has-text("设计稿")').dblclick()
  await page.waitForTimeout(800)
  // 验证面包屑显示 设计稿，说明进入了子目录
  check('双击后进入 设计稿（面包屑含设计稿）', await page.locator('.breadcrumb:has-text("设计稿")').count() > 0)
  check('双击后当前目录显示 UI 子文件夹', await page.locator('.file-card:has-text("UI")').count() > 0)

  // 双击 UI 再进入一层
  await page.locator('.file-card:has-text("UI")').dblclick()
  await page.waitForTimeout(800)
  check('双击进入 UI（面包屑含UI）', await page.locator('.breadcrumb:has-text("UI")').count() > 0)

} catch (e) {
  console.log('❌ 异常: ' + e.message)
  fails++
}

if (errs.length) { console.log('❌ 页面错误: ' + errs.join('; ')); fails++ }
else console.log('✅ 无页面错误')

console.log(`\n===== 双击打开冒烟: ${fails === 0 ? '全部通过 ✅' : fails + ' 项失败 ❌'} =====`)
await browser.close()
