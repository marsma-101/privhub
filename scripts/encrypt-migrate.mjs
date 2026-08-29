/**
 * PrivHub 静态加密迁移脚本（明文 → 密文，可重复执行：自动跳过已加密文件）
 *
 * 用法：cd privhub && node --import tsx/esm ../scripts/encrypt-migrate.mjs
 * 迁移范围：data/ 下系统数据（users/sessions/trash/meta/templates/acl/favorites/
 * recent/audit 等，自动识别格式）+ data-files/ 用户文件。
 * 注意：迁移前请备份 data/secret.key 与数据目录；迁移不可逆（如需回退请用备份）。
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const rootDir = process.cwd()
const cordisPath = 'file:///' + rootDir.replace(/\\/g, '/') + '/node_modules/@deepseek-ai/cordis/lib/index.js'
const { Context } = await import(cordisPath)
const ctx = new Context()

const storagePath = 'file:///' + rootDir.replace(/\\/g, '/') + '/plugins/privhub-svc-storage/src/index.ts'
const storageMod = await import(storagePath)
await ctx.plugin({ name: storageMod.name, apply: storageMod.apply }, { enabled: true, keyFile: '', auditMagic: 'PHAUD1\0' })
const st = ctx.storage
await st.ensureKey()

/* 1. data-files 用户文件 */
const df = join(rootDir, 'data-files')
if (existsSync(df)) {
  const r = await st.migrateTree(df)
  console.log(`[迁移] data-files：加密 ${r.migrated} 个，跳过 ${r.skipped} 个（含 .trash 已在跳过名单外单独处理）`)
}

/* 2. data/ 系统 JSON（整文件加密；密钥文件 secret.key 必须保持明文） */
const dataDir = join(rootDir, 'data')
if (existsSync(dataDir)) {
  const r = await st.migrateTreeExclude(dataDir, ['secret.key'], false)
  console.log(`[迁移] data/：加密 ${r.migrated} 个，跳过 ${r.skipped} 个（secret.key 已排除）`)
}

/* 3. audit.jsonl 特殊：块格式迁移（若为明文 JSONL 则转加密块） */
const auditFile = join(dataDir, 'audit.jsonl')
if (existsSync(auditFile)) {
  const head = await st.isEncrypted(auditFile)
  const magicOk = (async () => {
    const fs = await import('node:fs/promises')
    const fh = await fs.open(auditFile, 'r')
    const h = Buffer.alloc(8)
    await fh.read(h, 0, 8, 0)
    await fh.close()
    return h.toString('utf8') === 'PHAUD1\0'
  })()
  if (!(await magicOk) && !head) {
    const lines = (await import('node:fs')).readFileSync(auditFile, 'utf8').split('\n').filter((l) => l.trim())
    const blocks = await Promise.all(lines.map((l) => st.auditEncryptBlock(l)))
    await (await import('node:fs/promises')).writeFile(auditFile, Buffer.concat(blocks))
    console.log(`[迁移] audit.jsonl：${lines.length} 条明文记录 → 加密块`)
  } else {
    console.log('[迁移] audit.jsonl：已是加密块或不存在，跳过')
  }
}

console.log('[迁移] 完成。请重启服务使新格式生效（读取自动识别，重启非必须）。')
process.exit(0)
