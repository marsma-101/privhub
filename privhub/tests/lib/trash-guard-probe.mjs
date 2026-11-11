#!/usr/bin/env node
/**
 * 回收站根守卫探针（GitHub issue #2 / REQ-5）
 *
 * 目的：装配两个 `PrivHubStore` 实例，让它们的 `dataRoot` 与
 * `PRIVHUB_DATA_FILES` 一个一致、一个不一致，验证 `trashRootStatus()`：
 *   - 一致   → ok:true  （正常清理照常执行）
 *   - 不一致 → ok:false （拒绝物理删除，避免在错误的库上删文件）
 *
 * 为什么不用 HTTP 测：要制造「core 的 dataRoot ≠ 配置库根」这种错配，
 * 只能绕过正常装配直接传参；从 HTTP 侧无论怎么配，两者总是同源。
 *
 * 用法（由 tests/store-config.mjs 调用，也可单独跑）：
 *   node --import tsx/esm tests/lib/trash-guard-probe.mjs
 * 环境：需要 PRIVHUB_DATA_FILES / PRIVHUB_DATA_ROOT 指向隔离测试根。
 *
 * 输出一行 JSON 给调用方断言。退出码 0 = 探针本身跑通（断言在调用方做）。
 *
 * @module tests/lib/trash-guard-probe
 */

import { join, resolve } from 'node:path'
import { mkdirSync, rmSync } from 'node:fs'
import { Context } from '@deepseek-ai/cordis'

const library = resolve(process.env.PRIVHUB_DATA_FILES || '')
const dataRootDir = process.env.PRIVHUB_DATA_ROOT || ''

/* core 在模块加载期读 env，所以必须先拿到根再 import。 */
const coreMod = await import('../../plugins/privhub-core/src/index.ts')
const { PrivHubStore } = coreMod

/** 用真实 cordis Context 装配一个 store（与 main.ts 的方式一致）。 */
function makeStore(dataRoot) {
  const ctx = new Context()
  /* storeCheck 会碰 storage；这里只需要能构造，不必真加密。 */
  ctx.storage = {
    keyInfo: { source: 'probe', file: '', env: false },
    readText: async () => '{"users":[]}',
    readBuffer: async () => Buffer.alloc(0),
    findCiphertextFile: async () => null,
  }
  return new PrivHubStore(ctx, { usersFile: '', dataRoot, sessionTtlDays: 7 })
}

const same = makeStore(library).trashRootStatus()

/* 错配场景：换一个不相干的目录当 dataRoot，回收站就落在配置库根之外。 */
const decoy = join(dataRootDir, 'decoy-root')
mkdirSync(decoy, { recursive: true })
const wrong = makeStore(decoy).trashRootStatus()
try { rmSync(decoy, { recursive: true, force: true }) } catch { /* ignore */ }

console.log(JSON.stringify({
  dataFiles: library,
  sameRoot: same,
  wrongRoot: wrong,
  decoy,
}))
