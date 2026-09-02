/**
 * 私域枢纽能力 Service：静态加密存储（privhub-svc-storage，S7）
 *
 * 目标：data-files 用户文件与 data/ 系统数据在宿主机上不可直接读取。
 * 以 cordis Service 形式暴露 `ctx.storage`：
 *   - readText / writeText：透明加解密文本（自动识别密文/明文头，平滑兼容迁移期）
 *   - readBuffer / writeBuffer：Buffer 读写
 *   - createReadStream / createWriteStream：流式（上传大文件）
 *   - readJsonEnc / writeJsonEnc：系统 JSON 加密读写（配合调用方内存常驻）
 *   - isEncrypted / encryptBuffer / decryptBuffer / auditAppend / auditReadAll
 *   - migrateTree：明文 → 密文迁移（脚本用，可逆）
 *
 * 加密格式（AES-256-GCM，Node 内置 crypto，零新依赖）：
 *   文件头 36 字节 = magic[8]("PHENC1\0" + ver=1) + iv[12] + 预留[0]
 *   密文 = GCM(明文)，认证 tag 16 字节由 cipher 流自动附加在密文末尾
 *   （Node GCM 流式模式下 tag 作为末块；解密流自动消费末块校验）
 *   无 magic 头的文件视为明文直接透传（兼容未加密旧数据）
 *
 * 密钥管理：
 *   - 优先环境变量 PRIVHUB_SECRET（任意字符串 → sha256 派生 32 字节）
 *   - 缺省 data/secret.key（32 字节随机，首次启动生成）
 *   - 密钥文件必须随数据一起备份（丢失 = 密文不可恢复）
 *
 * @module privhub-svc-storage
 */

import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'node:crypto'
import { readFile, writeFile, mkdir, rename, readdir, stat } from 'node:fs/promises'
import { createReadStream as fsCreateReadStream, createWriteStream as fsCreateWriteStream, existsSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { Transform } from 'node:stream'
import { Service } from '@deepseek-ai/cordis'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

/** 密文文件头：magic 8 字节（"PHENC1\0" + 版本 1）+ IV 12 字节 = 20 字节；tag 在密文末尾（16 字节）。 */
const MAGIC = Buffer.from([0x50, 0x48, 0x45, 0x4e, 0x43, 0x31, 0x00, 0x01]) // "PHENC1\0\x01"
const HEADER_LEN = MAGIC.length + 12 // 20

export interface Config {
  /** 总开关；false = 明文直通（读自动识别密文仍可解） */
  enabled: boolean
  /** 密钥文件路径；空 = data/secret.key */
  keyFile: string
  /** 审计记录加密块 magic（区别于文件头） */
  auditMagic: string
}

export const Config: z<Config> = z.object({
  enabled: z.boolean().default(true),
  keyFile: z.string().default(''),
  auditMagic: z.string().default('PHAUD1\0'),
})

declare module '@deepseek-ai/cordis' {
  interface Context {
    storage: StorageService
  }
}

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()

export class StorageService extends Service {
  private key: Buffer | null = null
  private readonly enabled: boolean
  private readonly keyFile: string
  private readonly auditMagic: Buffer

  constructor(ctx: Context, private readonly config: Config) {
    super(ctx, 'storage')
    this.enabled = config.enabled
    this.keyFile = config.keyFile.trim() === '' ? join(rootDir, 'data', 'secret.key') : config.keyFile
    // 审计块 magic 固定 8 字节（不足补 NUL，与文件头对齐）
    this.auditMagic = Buffer.from((config.auditMagic || 'PHAUD1\0').padEnd(8, '\0'), 'utf8')
  }

  /** 是否启用加密（读路径不受影响：自动识别密文头）。 */
  get active(): boolean { return this.enabled }

  /** 加载/生成密钥。env PRIVHUB_SECRET 优先；否则 secret.key 文件。 */
  async ensureKey(): Promise<Buffer> {
    if (this.key) return this.key
    const env = process.env.PRIVHUB_SECRET
    if (env && env.trim() !== '') {
      this.key = createHash('sha256').update(env.trim(), 'utf8').digest()
      return this.key
    }
    if (!existsSync(this.keyFile)) {
      await mkdir(dirname(this.keyFile), { recursive: true })
      await writeFile(this.keyFile, randomBytes(32), { mode: 0o600 })
    }
    this.key = await readFile(this.keyFile)
    if (this.key.length !== 32) throw new Error('密钥文件长度必须为 32 字节（hex 64 位字符串请转二进制）')
    return this.key
  }

  /** 加密 Buffer → 带头的密文 Buffer。 */
  async encryptBuffer(plain: Buffer): Promise<Buffer> {
    if (!this.enabled) return plain
    const key = await this.ensureKey()
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    const body = Buffer.concat([cipher.update(plain), cipher.final()])
    const tag = cipher.getAuthTag()
    return Buffer.concat([MAGIC, iv, body, tag])
  }

  /** 解密 Buffer（自动识别密文头；明文直接透传）。 */
  async decryptBuffer(data: Buffer): Promise<Buffer> {
    if (data.length >= HEADER_LEN && data.subarray(0, MAGIC.length).equals(MAGIC)) {
      const key = await this.ensureKey()
      const iv = data.subarray(MAGIC.length, HEADER_LEN)
      const body = data.subarray(HEADER_LEN, data.length - 16)
      const tag = data.subarray(data.length - 16)
      const decipher = createDecipheriv('aes-256-gcm', key, iv)
      decipher.setAuthTag(tag)
      return Buffer.concat([decipher.update(body), decipher.final()])
    }
    return data // 明文透传（未加密旧数据）
  }

  /** 判断文件是否为密文（只读头部 20 字节，大文件不整读）。 */
  async isEncrypted(file: string): Promise<boolean> {
    try {
      const fh = await import('node:fs/promises').then((m) => m.open(file, 'r'))
      try {
        const head = Buffer.alloc(HEADER_LEN)
        const { bytesRead } = await fh.read(head, 0, HEADER_LEN, 0)
        return bytesRead >= HEADER_LEN && head.subarray(0, MAGIC.length).equals(MAGIC)
      } finally { await fh.close() }
    } catch { return false }
  }

  /* ---------- 文本/Buffer 读写（透明） ---------- */

  async readText(file: string): Promise<string> {
    const data = await readFile(file)
    const plain = await this.decryptBuffer(data)
    return plain.toString('utf8')
  }

  async readBuffer(file: string): Promise<Buffer> {
    return this.decryptBuffer(await readFile(file))
  }

  async writeText(file: string, text: string): Promise<void> {
    await this.writeBuffer(file, Buffer.from(text, 'utf8'))
  }

  async writeBuffer(file: string, data: Buffer): Promise<void> {
    const out = this.enabled ? await this.encryptBuffer(data) : data
    await mkdir(dirname(file), { recursive: true })
    const tmp = file + '.tmp'
    await writeFile(tmp, out)
    await rename(tmp, file)
  }

  /* ---------- 流式（上传大文件 / 下载 / 预览原流） ---------- */

  /** 加密写流（async：先写头；cipher 数据流末尾手动追加 GCM tag）。
   *  返回 { stream, done }：done 在文件全部落盘（close）后 resolve，
   *  调用方须 await done 后再 rename/返回（避免 tag 未写完）。 */
  async createWriteStream(file: string): Promise<{ stream: NodeJS.WritableStream; done: Promise<void> }> {
    if (!this.enabled) {
      const s = fsCreateWriteStream(file)
      const done = new Promise<void>((ok, fail) => { s.on('close', ok); s.on('error', fail) })
      return { stream: s, done }
    }
    const key = await this.ensureKey()
    const iv = randomBytes(12)
    const fileStream = fsCreateWriteStream(file)
    fileStream.write(Buffer.concat([MAGIC, iv]))
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    cipher.pipe(fileStream, { end: false })
    cipher.on('end', () => {
      // GCM tag 不随 cipher 流输出（Node stream 模式），手动追加后收尾
      fileStream.write(cipher.getAuthTag())
      fileStream.end()
    })
    cipher.on('error', (e) => fileStream.destroy(e))
    const done = new Promise<void>((ok, fail) => { fileStream.on('close', ok); fileStream.on('error', fail) })
    return { stream: cipher, done }
  }

  /** 解密读流（async：读头判定；密文则手动取末尾 tag，流式解 body）。 */
  async createReadStream(file: string): Promise<NodeJS.ReadableStream> {
    const fh = await import('node:fs/promises').then((m) => m.open(file, 'r'))
    const head = Buffer.alloc(HEADER_LEN)
    const { bytesRead } = await fh.read(head, 0, HEADER_LEN, 0)
    await fh.close()
    if (bytesRead < HEADER_LEN || !head.subarray(0, MAGIC.length).equals(MAGIC)) {
      // 明文直通
      return fsCreateReadStream(file)
    }
    const key = await this.ensureKey()
    const iv = head.subarray(MAGIC.length, HEADER_LEN)
    // GCM tag 在文件末尾 16 字节，需手动提取（Node decipher 流模式不自动消费）
    const s = await stat(file)
    if (s.size < HEADER_LEN + 16) throw new Error('密文文件不完整')
    const tagFile = await import('node:fs/promises').then((m) => m.open(file, 'r'))
    const tag = Buffer.alloc(16)
    await tagFile.read(tag, 0, 16, s.size - 16)
    await tagFile.close()
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    const bodyStream = fsCreateReadStream(file, { start: HEADER_LEN, end: s.size - 17 })
    bodyStream.pipe(decipher)
    bodyStream.on('error', (e) => decipher.destroy(e))
    return decipher
  }

  /* ---------- 系统 JSON（整文件加密，配合调用方内存常驻） ---------- */

  async readJsonEnc<T>(file: string, fallback: T): Promise<T> {
    if (!existsSync(file)) return fallback
    try {
      const plain = await this.readText(file)
      return JSON.parse(plain) as T
    } catch { return fallback }
  }

  async writeJsonEnc(file: string, value: unknown): Promise<void> {
    await this.writeText(file, JSON.stringify(value, null, 2))
  }

  /* ---------- 审计记录级加密块（append 可行） ----------
   * 格式：magic(8) | len(4, BE, 密文块长) | iv(12) | 密文+tag(16) 循环追加。
   * 读取：逐块解析解密。单条损坏跳过（与明文 JSONL 容错一致）。
   */

  /** 加密追加一条审计记录（返回加密块 Buffer，调用方 append 到文件末尾）。 */
  async auditEncryptBlock(plain: string): Promise<Buffer> {
    const key = await this.ensureKey()
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    const body = Buffer.concat([cipher.update(Buffer.from(plain, 'utf8')), cipher.final()])
    const tag = cipher.getAuthTag()
    const len = body.length + 16
    const head = Buffer.alloc(12)
    this.auditMagic.copy(head, 0)
    head.writeUInt32BE(len, 8)
    return Buffer.concat([head, iv, body, tag])
  }

  /** 解析审计加密块文件 → 明文行数组（损坏块跳过；兼容旧明文 JSONL）。
   *  块格式：magic(8) + len(4, iv+body+tag 长) + iv(12) + body + tag(16)。 */
  async auditDecryptAll(file: string): Promise<string[]> {
    const data = await readFile(file).catch(() => null)
    if (!data) return []
    // 兼容旧明文 JSONL
    if (!(data.length >= 8 && data.subarray(0, 8).equals(this.auditMagic))) {
      return data.toString('utf8').split('\n').filter((l) => l.trim() !== '')
    }
    const key = await this.ensureKey()
    const out: string[] = []
    let off = 0
    while (off + 12 <= data.length) {
      const magicOk = data.subarray(off, off + 8).equals(this.auditMagic)
      if (!magicOk) break
      const len = data.readUInt32BE(off + 8) // iv(12) + body + tag(16)
      const ivStart = off + 12
      const payloadEnd = ivStart + 12 + len
      if (payloadEnd > data.length) break
      const iv = data.subarray(ivStart, ivStart + 12)
      const body = data.subarray(ivStart + 12, payloadEnd - 16)
      const tag = data.subarray(payloadEnd - 16, payloadEnd)
      try {
        const decipher = createDecipheriv('aes-256-gcm', key, iv)
        decipher.setAuthTag(tag)
        out.push(Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8'))
      } catch { /* 损坏块跳过 */ }
      off = payloadEnd
    }
    return out
  }

  /* ---------- 迁移（明文 → 密文） ---------- */

  /** 递归迁移目录内所有文件（跳过已加密/隐藏项）；返回迁移数。 */
  async migrateTree(dir: string, skipHidden = true): Promise<{ migrated: number; skipped: number }> {
    return this.migrateTreeExclude(dir, [], skipHidden)
  }

  /** 递归迁移（支持排除文件名清单——密钥文件等绝不可加密）。 */
  async migrateTreeExclude(dir: string, excludeFiles: string[], skipHidden = true): Promise<{ migrated: number; skipped: number }> {
    let migrated = 0
    let skipped = 0
    if (!existsSync(dir)) return { migrated, skipped }
    const entries = await readdir(dir, { withFileTypes: true })
    for (const e of entries) {
      if (skipHidden && e.name.startsWith('.')) { skipped++; continue }
      if (excludeFiles.includes(e.name)) { skipped++; continue }
      const full = join(dir, e.name)
      if (e.isDirectory()) {
        const r = await this.migrateTreeExclude(full, excludeFiles, skipHidden)
        migrated += r.migrated
        skipped += r.skipped
        continue
      }
      if (await this.isEncrypted(full)) { skipped++; continue }
      const plain = await readFile(full)
      await this.writeBuffer(full, plain)
      migrated++
    }
    return { migrated, skipped }
  }
}

/** 插件挂载：注册 StorageService 到 ctx.storage。 */
export const name = 'privhub-svc-storage'
export function apply(ctx: Context, config: Config): void {
  const svc = new StorageService(ctx, config)
  // 启动即确保密钥就绪（密钥缺失尽早暴露，而非首个请求时）
  void svc.ensureKey().catch((e) => ctx.logger.error('[storage] 密钥初始化失败: ' + e.message))
}
