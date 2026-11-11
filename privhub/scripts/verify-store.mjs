#!/usr/bin/env node
/**
 * PrivHub 存储体检（只读）—— GitHub issue #2 / REQ-4
 *
 * 用法（在 privhub/ 下）：
 *   node scripts/verify-store.mjs
 *   node scripts/verify-store.mjs --json
 *
 * 检查内容：
 *   1. 三类根（代码 / 系统数据 / 文件库）解析结果与来源；
 *   2. 文件库根存在、顶层项目与个人空间数量；
 *   3. 密钥是否可用（PRIVHUB_SECRET 或 data/secret.key）；
 *   4. 系统账号文件能否通过 GCM 认证解密；
 *   5. 库内抽样一个密文文件整段解密（最多看 300 个文件、≤8MB）。
 *
 * 全程只读：不解密写回、不创建目录、不生成密钥。
 * 退出码：0 = 通过；1 = 有硬失败（库不可读 / 密钥缺失但有密文 / 解密失败）。
 *
 * 与启动使用同一套根解析（src/store-paths.mjs），避免「体检说没问题、启动用错根」。
 */

import { createDecipheriv, createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync, openSync, readSync, closeSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * 找到同一套根解析模块：
 *   · 开发目录 / release：`<app>/scripts/verify-store.mjs` → `<app>/src/store-paths.mjs`
 *   · 纯使用版：`<home>/scripts/verify-store.mjs` → 读 `config/active.json`，
 *     从当前 release 里加载 `src/store-paths.mjs`（业务代码随 release 走，
 *     体检脚本不能自己再抄一份解析规则，否则迟早分叉）。
 */
async function loadStorePaths() {
  const local = join(HERE, '..', 'src', 'store-paths.mjs')
  if (existsSync(local)) return import(pathToFileURL(local).href)
  const home = join(HERE, '..')
  const activeFile = join(home, 'config', 'active.json')
  if (existsSync(activeFile)) {
    try {
      const a = JSON.parse(readFileSync(activeFile, 'utf8'))
      const p = a?.releaseDir ? join(a.releaseDir, 'src', 'store-paths.mjs') : ''
      if (p && existsSync(p)) {
        if (!process.env.PRIVHUB_CONFIG_DIR) process.env.PRIVHUB_CONFIG_DIR = join(home, 'config')
        if (!process.env.PRIVHUB_DATA_ROOT && a.dataRoot) process.env.PRIVHUB_DATA_ROOT = a.dataRoot
        if (!process.env.PRIVHUB_DATA_FILES && a.dataFiles && existsSync(a.dataFiles)) {
          process.env.PRIVHUB_DATA_FILES = a.dataFiles
        }
        return import(pathToFileURL(p).href)
      }
    } catch { /* 落到下面的明确报错 */ }
  }
  throw new Error('找不到 src/store-paths.mjs：请把本脚本放在 <app>/scripts/ 下运行（纯使用版放在 <home>/scripts/）。')
}

const { storePaths } = await loadStorePaths()

const MAGIC = Buffer.from([0x50, 0x48, 0x45, 0x4e, 0x43, 0x31, 0x00, 0x01]) // "PHENC1\0\x01"
const HEADER_LEN = 20
const jsonOut = process.argv.includes('--json')

const warnings = []
const hardErrors = []

function warn(msg) { warnings.push(msg) }
function fail(msg) { hardErrors.push(msg) }

function isCipherHead(head) {
  if (head.length >= MAGIC.length && head.subarray(0, MAGIC.length).equals(MAGIC)) return true
  return head.length >= 6 && head.subarray(0, 6).toString('latin1') === 'PHAUD1'
}

/** 有界遍历：找第一个密文文件（跳过符号链接，最多看 maxFiles 个文件）。 */
function findCiphertext(root, maxFiles = 300) {
  let seen = 0
  const stack = [root]
  while (stack.length > 0) {
    const dir = stack.pop()
    let ents
    try { ents = readdirSync(dir, { withFileTypes: true }) } catch { continue }
    for (const ent of ents) {
      if (ent.isSymbolicLink()) continue
      const full = join(dir, ent.name)
      if (ent.isDirectory()) {
        if (ent.name === 'node_modules' || ent.name === '.git') continue
        stack.push(full)
        continue
      }
      if (!ent.isFile()) continue
      if (++seen > maxFiles) return null
      try {
        const buf = Buffer.alloc(8)
        const fd = openSync(full, 'r')
        try { readSync(fd, buf, 0, 8, 0) } finally { closeSync(fd) }
        if (isCipherHead(buf)) return full
      } catch { /* 单个文件读不了：继续 */ }
    }
  }
  return null
}

function loadKey() {
  const secret = (process.env.PRIVHUB_SECRET || '').trim()
  if (secret) {
    return {
      key: createHash('sha256').update(secret, 'utf8').digest(),
      source: '环境变量 PRIVHUB_SECRET',
    }
  }
  if (existsSync(storePaths.secretKey)) {
    try {
      const buf = readFileSync(storePaths.secretKey)
      if (buf.length !== 32) {
        fail('密钥文件长度不是 32 字节（' + buf.length + '）：' + storePaths.secretKey)
        return { key: null, source: '密钥文件（损坏）' }
      }
      return { key: buf, source: '密钥文件 ' + storePaths.secretKey }
    } catch (e) {
      fail('密钥文件读取失败：' + storePaths.secretKey + ' —— ' + e.message)
      return { key: null, source: '密钥文件（不可读）' }
    }
  }
  return { key: null, source: '未找到（无 PRIVHUB_SECRET，也没有 ' + storePaths.secretKey + '）' }
}

function decryptOnce(file, key) {
  const raw = readFileSync(file)
  if (!(raw.length >= HEADER_LEN && raw.subarray(0, MAGIC.length).equals(MAGIC))) {
    return { encrypted: false, ok: true, plain: raw }
  }
  if (!key) return { encrypted: true, ok: false, error: '密文存在但密钥缺失' }
  try {
    const iv = raw.subarray(MAGIC.length, HEADER_LEN)
    const body = raw.subarray(HEADER_LEN, raw.length - 16)
    const tag = raw.subarray(raw.length - 16)
    const d = createDecipheriv('aes-256-gcm', key, iv)
    d.setAuthTag(tag)
    return { encrypted: true, ok: true, plain: Buffer.concat([d.update(body), d.final()]) }
  } catch (e) {
    return { encrypted: true, ok: false, error: '解密失败（密钥与密文不匹配）：' + e.message }
  }
}

function checkLibrary() {
  const root = storePaths.dataFiles
  const lib = { dataFiles: root, exists: false, entries: 0, projects: 0, personalSpaces: 0 }
  if (!existsSync(root)) {
    fail('文件库根不存在：' + root)
    return lib
  }
  lib.exists = true
  try {
    if (!statSync(root).isDirectory()) {
      fail('文件库根不是目录：' + root)
      return lib
    }
    const ents = readdirSync(root, { withFileTypes: true })
    for (const ent of ents) {
      if (!ent.isDirectory() || ent.name.startsWith('.')) continue
      lib.entries++
    }
    lib.projects = lib.entries // 个人空间由 users.json 登记，下面再修正
  } catch (e) {
    fail('文件库根无法读取：' + root + ' —— ' + e.message)
  }
  return lib
}

function main() {
  console.log('PrivHub 存储体检（只读）')
  console.log('  代码根    : ' + storePaths.codeRoot)
  console.log('  系统数据根: ' + storePaths.dataRoot + '（data/ 下为系统数据）')
  console.log('  文件库根  : ' + storePaths.dataFiles + (storePaths.dataFilesExplicit ? '（显式配置）' : '（默认）'))
  console.log('  配置文件  : ' + storePaths.configFile + (storePaths.configLoaded ? '' : '（不存在）'))
  console.log('  严格模式  : ' + (storePaths.strict ? '开' : '关'))
  console.log('')

  const lib = checkLibrary()
  const keyInfo = loadKey()
  console.log('  密钥来源  : ' + keyInfo.source)
  if (!keyInfo.key) {
    const found = findCiphertext(join(storePaths.dataRoot, 'data'), 2000)
      ?? findCiphertext(storePaths.dataFiles, 300)
    if (found) {
      fail('检测到既有密文（' + found + '），但找不到密钥。绝不建议生成新密钥；'
        + '请把原部署的 data/secret.key 放回 ' + storePaths.secretKey + '，或设置 PRIVHUB_SECRET。')
    } else {
      warn('没有密钥，但也没发现密文（全新库可正常初始化）。')
    }
  }

  /* 系统账号文件：最权威的「密钥是否正确」样本（GCM 认证）。 */
  const usersFile = join(storePaths.dataRoot, 'data', 'users.json')
  let users = null
  console.log('')
  console.log('  账号文件  : ' + usersFile)
  if (!existsSync(usersFile)) {
    warn('账号文件不存在（全新部署首次启动时属于正常）。')
  } else {
    const r = decryptOnce(usersFile, keyInfo.key)
    if (!r.ok) {
      fail('账号文件抽样解密失败：' + r.error)
    } else {
      try {
        users = JSON.parse(r.plain.toString('utf8'))
        console.log('  账号数量  : ' + (Array.isArray(users.users) ? users.users.length : '未知'))
      } catch (e) {
        fail('账号文件解密后不是合法 JSON：' + e.message)
      }
    }
  }

  /* 库内抽样：找第一个密文文件，≤8MB 才整段解密（GCM tag 只有整段读才校验）。 */
  let sample = null
  if (lib.exists) {
    const found = findCiphertext(storePaths.dataFiles, 300)
    if (!found) {
      warn('库内未抽样到密文文件（可能是明文旧库，或库为空）。')
    } else {
      sample = found
      const st = statSync(found)
      console.log('  库内样本  : ' + relative(storePaths.dataFiles, found) + '（' + st.size + ' 字节）')
      if (st.size > 8 * 1024 * 1024) {
        warn('库内样本超过 8MB，跳过整段解密。')
      } else {
        const r = decryptOnce(found, keyInfo.key)
        if (!r.ok) fail('库内样本解密失败：' + r.error)
      }
    }
  }

  /* 用 users.json 的 personalDir 修正「项目 / 个人空间」计数。 */
  if (users && Array.isArray(users.users) && lib.exists) {
    const personal = new Set(users.users.map((u) => (u.personalDir || '').trim()).filter(Boolean))
    let personalCount = 0
    try {
      for (const ent of readdirSync(storePaths.dataFiles, { withFileTypes: true })) {
        if (ent.isDirectory() && !ent.name.startsWith('.') && personal.has(ent.name)) personalCount++
      }
    } catch { /* 上面已检查过可读性 */ }
    lib.personalSpaces = personalCount
    lib.projects = lib.entries - personalCount
  }

  console.log('')
  console.log('  顶层条目  : ' + lib.entries + '（项目 ' + lib.projects + '，个人空间 ' + lib.personalSpaces + '）')
  if (lib.exists && lib.entries === 0) warn('文件库顶层没有任何项目/个人空间目录。')

  for (const w of warnings) console.warn('  [警告] ' + w)
  for (const e of hardErrors) console.error('  [失败] ' + e)

  const result = {
    ok: hardErrors.length === 0,
    codeRoot: storePaths.codeRoot,
    dataRoot: storePaths.dataRoot,
    dataFiles: storePaths.dataFiles,
    configFile: storePaths.configFile,
    keySource: keyInfo.source,
    library: lib,
    sample,
    warnings,
    errors: hardErrors,
  }
  if (jsonOut) console.log(JSON.stringify(result, null, 2))
  else console.log('')
  console.log(hardErrors.length === 0
    ? (warnings.length === 0 ? '体检通过。' : '体检通过（有警告，请留意上面的提示）。')
    : '体检未通过：' + hardErrors.length + ' 项硬失败。')
  return hardErrors.length === 0 ? 0 : 1
}

let code = 1
try {
  code = main()
} catch (e) {
  console.error('体检脚本执行失败：' + (e && e.message ? e.message : String(e)))
  code = 1
}
process.exit(code)
