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
import { readFile, writeFile, mkdir, rename, readdir, stat, rm } from 'node:fs/promises'
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
  /** 密钥加载单飞 Promise（并发首触发只执行一次，避免并发写同一密钥文件）。 */
  private keyPromise: Promise<Buffer> | null = null
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

  /**
   * 加载/生成密钥。env PRIVHUB_SECRET 优先；否则 secret.key 文件。
   *
   * 并发安全（首次部署的关键路径）：
   * 启动时多个插件会同时触发 storage 操作（core 载入 users、audit 落盘、
   * agent 载入配额……），它们并发调用本方法。原先的实现是
   * 「existsSync 不存在 → writeFile → readFile」三步，虽然 Node 是单线程，
   * 但每个 await 都是让出点：A 与 B 可能都判定"文件不存在"，随后【并发写同一文件】，
   * 一方的 writeFile 会 truncate 掉另一方正在写入的内容，导致读到不足 32 字节
   * 而抛「密钥文件长度必须为 32 字节」→ **全新部署偶发启动失败**（实测可复现）。
   *
   * 三重防护：
   *  1. 单飞 Promise —— 进程内并发只执行一次生成/读取；
   *  2. `flag: 'wx'`（O_CREAT|O_EXCL）—— 跨进程也只有一方能创建成功，
   *     失败方视为"别人已创建"，转而读取；
   *  3. 长度校验 + 短暂重试 —— 容忍其它进程写入尚未落完的瞬时状态。
   */
  async ensureKey(): Promise<Buffer> {
    if (this.key) return this.key
    if (!this.keyPromise) {
      this.keyPromise = this.doEnsureKey().catch((e) => {
        this.keyPromise = null // 失败后可重试，不留下永久失败的缓存
        throw e
      })
    }
    return this.keyPromise
  }

  private async doEnsureKey(): Promise<Buffer> {
    const env = process.env.PRIVHUB_SECRET
    if (env && env.trim() !== '') {
      this.key = createHash('sha256').update(env.trim(), 'utf8').digest()
      return this.key
    }
    await mkdir(dirname(this.keyFile), { recursive: true })
    try {
      // 原子创建：仅当文件不存在时成功，避免并发写互相截断
      await writeFile(this.keyFile, randomBytes(32), { mode: 0o600, flag: 'wx' })
    } catch (e) {
      if ((e as { code?: string }).code !== 'EEXIST') throw e
      // 已存在（可能是并发方刚创建）：继续走读取
    }
    let lastLen = -1
    for (let attempt = 0; attempt < 10; attempt++) {
      const buf = await readFile(this.keyFile)
      if (buf.length === 32) { this.key = buf; return buf }
      lastLen = buf.length
      // 极短退避：等待创建方写完（正常情况下一轮即成功）
      await new Promise((r) => setTimeout(r, 20 * (attempt + 1)))
    }
    throw new Error(
      `密钥文件长度必须为 32 字节（当前 ${lastLen}）。文件：${this.keyFile}。`
      + '若该文件来自备份或迁移，请确认未被截断；hex 形式的 64 位密钥请先转为二进制。',
    )
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
    // D7：临时名必须唯一（pid + 随机后缀）。此前固定为 file+'.tmp'，
    // 两个并发写同一目标会共用临时文件 → 内容错乱或 rename 竞争失败。
    const tmp = `${file}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`
    await writeFile(tmp, out)
    let lastErr: unknown = null
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await rename(tmp, file)
        return
      } catch (e) {
        lastErr = e
        await new Promise((r) => setTimeout(r, 20 * (attempt + 1)))
      }
    }
    await rm(tmp, { force: true }).catch(() => { /* 清理失败不掩盖原错误 */ })
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
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

  /**
   * 解析审计加密块文件，返回明文行 + 【完整性统计】。
   *
   * 块格式：magic(8) + len(4, = iv+body+tag 长) + iv(12) + body + tag(16)。
   *
   * 为什么返回统计而非仅行数组：2026-09-05 的 446MB 事故期间，损坏是
   * 「不可见」的——坏块被静默跳过，查询只是少返回几条，管理员毫无察觉，
   * 直到文件膨胀到几百 MB 才被发现。因此这里必须把「有多少块坏了」
   * 一路传递到调用方，让损坏可以被看见、被告警。
   */
  async auditScan(file: string): Promise<{
    lines: string[]
    totalBlocks: number
    okBlocks: number
    badBlocks: number
    /** 解析提前终止时的剩余字节数（>0 说明结构断裂，后面还有数据但读不了） */
    trailingBytes: number
    /** 文件是否为加密块格式（false = 旧明文 JSONL） */
    encrypted: boolean
  }> {
    const data = await readFile(file).catch(() => null)
    if (!data) {
      return { lines: [], totalBlocks: 0, okBlocks: 0, badBlocks: 0, trailingBytes: 0, encrypted: false }
    }
    // 兼容旧明文 JSONL
    if (!(data.length >= 8 && data.subarray(0, 8).equals(this.auditMagic))) {
      const lines = data.toString('utf8').split('\n').filter((l) => l.trim() !== '')
      return { lines, totalBlocks: lines.length, okBlocks: lines.length, badBlocks: 0, trailingBytes: 0, encrypted: false }
    }
    const key = await this.ensureKey()
    const lines: string[] = []
    let off = 0
    let bad = 0
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
        lines.push(Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8'))
      } catch { bad++ } // 解密失败：计为坏块，不再静默
      off = payloadEnd
    }
    const total = lines.length + bad
    return {
      lines,
      totalBlocks: total,
      okBlocks: lines.length,
      badBlocks: bad,
      trailingBytes: data.length - off,
      encrypted: true,
    }
  }

  /** 解析审计加密块文件 → 明文行数组（兼容旧签名；需要统计信息请用 auditScan）。 */
  async auditDecryptAll(file: string): Promise<string[]> {
    return (await this.auditScan(file)).lines
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
