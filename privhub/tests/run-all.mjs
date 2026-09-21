/**
 * PrivHub 回归总入口（O4）
 *
 *   node tests/run-all.mjs --spawn      # 推荐：自动拉起隔离实例（3190）后跑全部
 *   node tests/run-all.mjs              # 跑全部（需目标已在跑）
 *   PRIVHUB_TEST_BASE=http://127.0.0.1:3190 node tests/run-all.mjs
 *
 * 安全约束：默认只指向隔离测试实例。**显式禁止指向生产端口 3180/3181**
 * （那里的 data/ 与 data-files/ 是真实数据）。测试会清理自己创建的产物，
 * 但任何测试都不应触碰真实数据。
 *
 * @module tests/run-all
 */

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync, mkdirSync, symlinkSync } from 'node:fs'
import { report, waitForServer, BASE } from './lib.mjs'
import { build as buildSmoke } from './smoke.mjs'
import { build as buildSecurity } from './security.mjs'
import { build as buildHardening } from './hardening.mjs'
import { build as buildFirstScreen } from './first-screen.mjs'
import { build as buildPersonalSpace } from './personal-space.mjs'
import { build as buildPersonalRename } from './personal-rename.mjs'
import { build as buildAgentSandbox } from './agent-sandbox.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')

/** 生产端口黑名单：绝不允许把测试打到真实数据上。 */
const PRODUCTION_PORTS = new Set(['3180', '3181'])

const args = process.argv.slice(2)
const shouldSpawn = args.includes('--spawn')
const TEST_PORT = Number(process.env.PRIVHUB_TEST_PORT || new URL(BASE).port || 3190)
const TEST_ROOT = process.env.PRIVHUB_TEST_ROOT || join(HERE, '.testroot')

let child = null

async function main() {
  // 硬性守卫生效：防止误把回归打到生产/开发主数据
  const basePort = new URL(BASE).port
  if (PRODUCTION_PORTS.has(basePort)) {
    console.error(`[run-all] 拒绝执行：目标端口 ${basePort} 是生产/开发环境（真实数据）。`)
    console.error('[run-all] 请使用隔离实例（默认 3190）或加 --spawn 自动拉起。')
    process.exit(2)
  }

  if (shouldSpawn) {
    // 审核指出：旧版只建空目录，而全仓没有任何代码创建默认项目「公共」，
    // 导致 smoke 的「项目列表可见」必然失败 —— --spawn 从未真正跑通过。
    // 这里补齐最小可测环境：数据目录 + 三个项目 + 代码 junction。
    mkdirSync(join(TEST_ROOT, 'data'), { recursive: true })
    for (const p of ['公共', 'A项目', 'B项目']) {
      mkdirSync(join(TEST_ROOT, 'data-files', p), { recursive: true })
    }
    for (const d of ['src', 'plugins', 'frontend', 'node_modules']) {
      const link = join(TEST_ROOT, d)
      if (!existsSync(link)) {
        try { symlinkSync(join(ROOT, d), link, 'junction') } catch { /* 已存在或权限不足 */ }
      }
    }
    // 关键：把测试根也告诉【测试进程自身】，否则各套件里的磁盘落盘断言
    // 会因为拿不到 PRIVHUB_TEST_ROOT 而静默跳过（= 空断言，看着通过其实没验）。
    process.env.PRIVHUB_TEST_ROOT = TEST_ROOT
    console.log(`[run-all] 启动隔离测试实例：root=${TEST_ROOT} port=${TEST_PORT}`)
    child = spawn(process.execPath, ['--import', 'tsx/esm', 'src/main.ts', '--port', String(TEST_PORT)], {
      cwd: TEST_ROOT,
      // PRIVHUB_TEST_ROOT 透传给测试，供「磁盘落盘校验」类用例定位测试根
      env: { ...process.env, PRIVHUB_ROOT: TEST_ROOT, PRIVHUB_TEST_ROOT: TEST_ROOT },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    child.stdout.on('data', (d) => process.env.PRIVHUB_TEST_VERBOSE && process.stdout.write('[server] ' + d))
    child.stderr.on('data', (d) => process.stderr.write('[server:err] ' + d))
  }

  const alive = await waitForServer(shouldSpawn ? 60000 : 15000)
  if (!alive) {
    console.error(`[run-all] 无法连接 ${BASE} —— 请先启动服务，或加 --spawn 自动拉起`)
    await shutdown()
    process.exit(1)
  }
  console.log(`[run-all] 目标服务就绪：${BASE}`)

  // 首屏链放最前：它验证「能不能进得去」，是其它一切用例的前提
  const suites = [
    buildFirstScreen(), buildSmoke(), buildSecurity(), buildHardening(),
    buildPersonalSpace(), buildPersonalRename(), buildAgentSandbox(),
  ]
  const results = []
  for (const s of suites) results.push({ suite: s.name, results: await s.run() })

  let pass = report(results)

  // 静态检查（不需要服务）：前端模板编译与已知显示 bug 回归
  console.log('\n[run-all] 运行静态与冷启动检查：前端模板 / 管理控制台 / 审计可靠性 / 交付完整性 / 首次部署 / A 批修复断言 / 预览上限断言')
  for (const script of ['frontend-templates.mjs', 'admin-console.mjs', 'personal-ui.mjs', 'audit-reliability.mjs', 'integrity.mjs', 'first-run.mjs', 'rag-resilience.mjs', 'preview-limits.mjs', 'file-exts.mjs', 'office-doc.mjs']) {
    const okStatic = await runChild(join(HERE, script))
    if (!okStatic) pass = false
  }

  await shutdown()
  process.exit(pass ? 0 : 1)
}

/** 运行一个独立测试脚本（继承 stdio，返回是否全部通过）。 */
function runChild(script) {
  return new Promise((resolve) => {
    /* 需要读 TS 源码（并以 `import()` 直接装载 .ts）的脚本，自身必须以 tsx 转译运行：
     *   · rag-resilience.mjs  —— 读 `src/web-server.ts` 的源码文本；
     *   · file-exts.mjs       —— 动态 `import()` 共享定义 `plugins/privhub-core/src/file-exts.ts`
     *                            （本机 Node 24 本身也能剥类型，但走 tsx 与全仓口径一致、更稳）；
     *   · office-doc.mjs      —— 同上（读 `file-exts.ts`），另外直接 import `svc-office/src/index.ts`
     *                            来驱动 `read()` 的契约断言。
     * 其余静态脚本不需要，保持原样调用。 */
    const needsTsx = /(rag-resilience|file-exts|office-doc)\.mjs$/.test(script)
    const args = needsTsx ? ['--import', 'tsx/esm', script] : [script]
    const p = spawn(process.execPath, args, { cwd: ROOT, stdio: 'inherit' })
    p.on('exit', (code) => resolve(code === 0))
    p.on('error', () => resolve(false))
  })
}

/**
 * 停止子进程。
 * 注意：child.killed 只表示「信号已发出」，不代表进程已退出
 * （审核实测：kill() 后 killed 立即为 true，故旧写法里的 SIGKILL 永不执行，
 *  服务若忽略 SIGTERM 就会残留占端口）。这里改为等待 exit 事件，超时再强杀。
 */
async function shutdown() {
  if (!child) return
  if (child.exitCode !== null || child.signalCode !== null) return
  const done = new Promise((r) => child.once('exit', r))
  child.kill()
  const timedOut = await Promise.race([
    done.then(() => false),
    new Promise((r) => setTimeout(() => r(true), 1500)),
  ])
  if (timedOut) {
    child.kill('SIGKILL')
    await Promise.race([done, new Promise((r) => setTimeout(r, 1500))])
  }
}

process.on('SIGINT', async () => { await shutdown(); process.exit(130) })

main().catch(async (e) => {
  console.error('[run-all] 运行异常：', e)
  await shutdown()
  process.exit(1)
})
