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
import type { Dirent } from 'node:fs'
import type { Readable, Writable } from 'node:stream'
import { join, dirname, relative, basename, resolve, sep } from 'node:path'
import { Transform } from 'node:stream'
import { Service } from '@deepseek-ai/cordis'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

/** 密文文件头：magic 8 字节（"PHENC1\0" + 版本 1）+ IV 12 字节 = 20 字节；tag 在密文末尾（16 字节）。 */
const MAGIC = Buffer.from([0x50, 0x48, 0x45, 0x4e, 0x43, 0x31, 0x00, 0x01]) // "PHENC1\0\x01"
const HEADER_LEN = MAGIC.length + 12 // 20

/** 把一个可读流收成 Buffer（`readRange` 的明文分支用；`readOleStream` 在 office 那边是同一件事）。 */
function collectStream(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', (c) => chunks.push(c as Buffer))
    stream.on('error', reject)
    stream.on('end', () => resolve(Buffer.concat(chunks)))
  })
}

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

/** 一个仍以明文落盘的系统数据文件。 */
export interface PlaintextFile {
  /** 绝对路径 */
  file: string
  bytes: number
}

/** 单文件迁移结果。「拒绝」是一种结果，不是沉默 —— 调用方必须能看出哪些没动、以及为什么。 */
export interface FileMigrateResult {
  file: string
  status: 'migrated' | 'already-encrypted' | 'refused' | 'failed'
  reason?: string
  /** 迁移前明文的备份路径（迁移成功或失败都可能留有备份） */
  backup?: string
}

const msgOf = (e: unknown): string => (e instanceof Error ? e.message : String(e))

/** 迁移备份用的时间戳（文件名安全：无冒号、无空格）。 */
function stamp(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-')
}

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

  /**
   * **明文**长度（字节）—— 盘上文件的长度对密文来说**不等于**内容长度。
   *
   * 为什么必须单独有这个方法：`Content-Range` 里的 `total` 必须是**浏览器看到的那串字节**的长度，
   * 而 `<video>` 的偏移量是相对**播放内容**算的。密文在盘上多出 20 字节头 + 16 字节 tag，
   * 若拿 `stat().size` 当 `total`，浏览器算出的区间会整体错位（表现为"拖到某处就卡死/报错"）。
   * 明文件原样返回 `stat().size`。
   */
  async plainSize(file: string): Promise<number> {
    const st = await stat(file)
    if (!(await this.isEncrypted(file))) return st.size
    return st.size - HEADER_LEN - 16
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

  /**
   * 读取**明文字节区间** `[start, end]`（含端点）—— 音视频预览的 HTTP Range 要用（2026-10-09）。
   *
   * ## 为什么这件事必须在 storage 里做，而不是在路由里
   *
   * 盘上的用户文件是 **PHENC1 密文**（AES-256-GCM）。密文**没有可随机访问的索引**：
   * 认证 tag 在**文件末尾**、keystream 必须从头逐块推进 ⇒ 「seek 到第 N 字节」在密文上**做不到**。
   * 这个约束只有 storage 知道（密钥、头长、tag 位置都在这里），所以能力放在这里，
   * 路由只表达"我要 [start,end] 这一段"。
   *
   * 两条路：
   *   · **明文**文件（未迁移的旧数据，或 `enabled:false`）→ 真区间读：`createReadStream(file,{start,end})`，零多余开销；
   *   · **密文**文件 → 从头解密、**丢弃**前 `start` 字节，凑够 `end-start+1` 字节即停。
   *
   * ## 代价（明说，不藏）
   *
   * 密文上一次区间读的 CPU 是 **O(end)** —— 与"区间从哪开始"有关，与区间长度无关。
   * 这与浏览器播视频的行为匹配（每次只要一小段，但落点随拖动而变）：
   * **首帧便宜，拖到后段要看"解密到那一段"的价格**。1 GB 的视频拖到 90% 处，
   * 服务端要解约 900 MB。局域网单用户可接受；要更快得改成"加密块 + 块索引"（另开专项）。
   *
   * ## 认证（如实记，这是本方法的**真实弱点**）
   *
   * GCM 的 tag 只有**读到文件末尾**才校验得了。整段读（`readBuffer` / `decryptBuffer`）会校验；
   * **部分区间读不会**（读到 `end` 就停）⇒ 区间里出来的是**未经认证**的明文。
   * 换句话说：若密文在中途被篡改，整段读会抛错，区间读**看不出来**。
   * 这是"能拖进度条"换来的，写在 `docs/reviews/17-音视频预览.md` §5。
   * （不作为安全问题处理的原因：攻击者要改盘上文件得先有盘上写权限，那时他直接读明文更省事。）
   *
   * 越界参数（`start < 0` / `end < start` / `end ≥ 明文长度`）一律**抛错**，由调用方转 416 —
   * 不静默截断，因为"静默给一段错位的数据"是比 416 坏得多的行为。
   */
  async readRange(file: string, start: number, end: number): Promise<Buffer> {
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start) {
      throw new Error(`readRange: 区间非法 [${start}, ${end}]`)
    }
    const want = end - start + 1
    const encrypted = await this.isEncrypted(file)

    if (!encrypted) {
      /* 明文：真区间读。文件不足 end+1 字节时 readStream 会自然少给 —— 由下面的长度校验兜住。 */
      const st = await stat(file)
      if (end >= st.size) throw new Error(`readRange: 区间越界（文件 ${st.size} 字节，请求到 ${end}）`)
      return await collectStream(fsCreateReadStream(file, { start, end }))
    }

    /* 密文：解头 → 解尾 tag → 逐块解密并跳过前 start 字节。 */
    const key = await this.ensureKey()
    const fh = await import('node:fs/promises').then((m) => m.open(file, 'r'))
    let head: Buffer
    let tail: Buffer
    let size = 0
    try {
      const st = await fh.stat()
      size = st.size
      if (size < HEADER_LEN + 16) throw new Error('readRange: 密文文件不完整')
      head = Buffer.alloc(HEADER_LEN)
      await fh.read(head, 0, HEADER_LEN, 0)
      tail = Buffer.alloc(16)
      await fh.read(tail, 0, 16, size - 16)
    } finally { await fh.close() }

    const plainLen = size - HEADER_LEN - 16
    if (end >= plainLen) throw new Error(`readRange: 区间越界（明文 ${plainLen} 字节，请求到 ${end}）`)

    const decipher = createDecipheriv('aes-256-gcm', key, head.subarray(MAGIC.length, HEADER_LEN))
    decipher.setAuthTag(tail)
    const bodyStream = fsCreateReadStream(file, { start: HEADER_LEN, end: size - 17 })
    bodyStream.on('error', (e) => decipher.destroy(e))
    bodyStream.pipe(decipher)

    /* 手动迭代而不是 for-await：凑够就停，且**显式销毁两端**。
     * 为什么不能靠 for-await 的 break：`pipe` 在目的端被销毁时**不会**销毁源端
     * （Node 的 pipe 只做 unpipe），源端若不流动就漏一个 fd —— 每个 Range 请求漏一个。 */
    const chunks: Buffer[] = []
    let need = want
    let skip = start
    try {
      for await (const chunk of decipher) {
        const buf = chunk as Buffer
        if (skip >= buf.length) { skip -= buf.length; continue }
        const piece = skip > 0 ? buf.subarray(skip) : buf
        skip = 0
        if (piece.length >= need) { chunks.push(piece.subarray(0, need)); need = 0; break }
        chunks.push(piece)
        need -= piece.length
      }
    } finally {
      decipher.destroy()
      bodyStream.destroy()
    }
    const out = Buffer.concat(chunks)
    if (out.length !== want) {
      /* 到这里只可能是文件在读取途中被改短（或 tag 校验失败被 destroy）。
       * 如实抛，让路由回 416/500 —— 不给半截数据。 */
      throw new Error(`readRange: 只取到 ${out.length} 字节，请求 ${want} 字节`)
    }
    return out
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
  async createWriteStream(file: string): Promise<{ stream: Writable; done: Promise<void> }> {
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
  async createReadStream(file: string): Promise<Readable> {
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

  /**
   * 该路径是否**绝不允许**被包成 PHENC1。
   *
   * 背景：这里原先是个递归遍历整目录的 `migrateTree`。它对最自然的调用
   * `migrateTree(dataDir)` 会顺手做掉四件不可挽回的事：
   *   ① 加密 `secret.key` —— 密钥没了，**全部密文永久不可恢复**；
   *   ② 加密 `audit.jsonl` 与它的 `.damaged-*` 备份 —— 审计用的是自有块格式
   *      （PHAUD1 头），外面再包一层 PHENC1 后 `auditScan` 一个块都读不出来；
   *   ③ 加密 `data/logs/*.log` —— 文件日志是**明文追加**的，加密后新追加的行
   *      会和密文混在一个文件里，两边都读不了；
   *   ④ 加密 `data/git-backup/**` —— 那是个真 git 仓库（HEAD/config/objects），
   *      内部文件被加密 = 备份全废。
   * 一个无备份、原地写、能一键毁库的函数，而且全仓零调用 —— 所以直接换掉，
   * 改成「显式清单 + 逐条守卫」，把「不能碰什么」写在代码里而不是留给调用方记住。
   *
   * @returns 拒绝原因；允许迁移则返回 null
   */
  private refuseReason(file: string): string | null {
    if (!this.enabled) return '加密未启用（storage.enabled=false），迁移无意义'
    /* 路径包含必须带分隔符比较：`data-files-x` 这类同前缀兄弟目录不能算「在 data-files 里」 */
    const norm = resolve(file)
    const under = (dir: string): boolean => {
      const d = resolve(dir)
      return norm === d || norm.startsWith(d.endsWith(sep) ? d : d + sep)
    }
    if (norm === resolve(this.keyFile)) return '这是密钥文件，加密它等于让所有密文永久不可恢复'
    if (basename(norm).toLowerCase().startsWith('audit')) {
      return '这是审计文件（自有 PHAUD1 加密块格式），再包一层 PHENC1 后 auditScan 读不出任何块'
    }
    if (under(join(rootDir, 'data', 'logs'))) return '应用日志是明文追加的，加密后会与后续追加内容混成乱码'
    if (under(join(rootDir, 'data', 'git-backup'))) return '这是 git 仓库内部文件，加密会毁掉自动备份'
    return null
  }

  /**
   * 扫描「由 ctx.storage 管理、但仍以明文落盘」的系统数据文件。
   *
   * 只扫 `data/` **顶层**的 `*.json`，不递归：系统 JSON 全部住在那一层，
   * 而递归正是上面那四类灾难的来源。已加密的、隐藏的、以及被守卫拒绝的都不出现在结果里
   * （守卫拒绝项由 `migrateFilesToEncrypted` 显式报告，不在这里吞掉）。
   */
  async scanPlaintextSystemFiles(): Promise<PlaintextFile[]> {
    const dir = join(rootDir, 'data')
    let entries: Dirent[]
    try { entries = await readdir(dir, { withFileTypes: true }) } catch { return [] }
    const out: PlaintextFile[] = []
    for (const e of entries) {
      if (!e.isFile() || e.name.startsWith('.') || !e.name.toLowerCase().endsWith('.json')) continue
      const full = join(dir, e.name)
      if (await this.isEncrypted(full)) continue
      const s = await stat(full).catch(() => null)
      out.push({ file: full, bytes: s ? s.size : 0 })
    }
    return out.sort((a, b) => a.file.localeCompare(b.file))
  }

  /**
   * 把指定文件迁移为密文（安全版）。四道保险，缺一不可：
   *   ① 逐条守卫 —— 密钥/审计/日志/git 备份一律拒绝，**并说明原因**（拒绝是一种结果，不是沉默）；
   *   ② 先备份明文到 `<file>.plain-<时间戳>.bak`，备份写不成就**不动原文件**；
   *   ③ 经 `writeBuffer` 原子替换（临时名 + rename），绝不原地截断 —— 中途断电不会留下空文件；
   *   ④ 写完**回读逐字节比对**，不一致就还原明文并报失败。
   *
   * 为什么值得这么重：这一步要改的是**已经在盘上、且可能是最后一份**的旧数据。
   * 迁移能重跑，覆写不能撤销。
   */
  async migrateFilesToEncrypted(files: string[]): Promise<FileMigrateResult[]> {
    const out: FileMigrateResult[] = []
    for (const file of files) {
      const refused = this.refuseReason(file)
      if (refused) { out.push({ file, status: 'refused', reason: refused }); continue }
      if (!existsSync(file)) { out.push({ file, status: 'failed', reason: '文件不存在' }); continue }
      if (await this.isEncrypted(file)) { out.push({ file, status: 'already-encrypted' }); continue }

      let plain: Buffer
      try { plain = await readFile(file) } catch (e) {
        out.push({ file, status: 'failed', reason: '读取失败：' + msgOf(e) })
        continue
      }
      const backup = `${file}.plain-${stamp()}.bak`
      try {
        // wx：备份文件必须是我们新建的，绝不去覆盖同名旧备份（那可能正是最后一份明文）
        await writeFile(backup, plain, { flag: 'wx' })
      } catch (e) {
        out.push({ file, status: 'failed', reason: '备份失败，未改动原文件：' + msgOf(e) })
        continue
      }
      try {
        await this.writeBuffer(file, plain)
        const back = await this.readBuffer(file)
        if (!(await this.isEncrypted(file)) || !back.equals(plain)) throw new Error('回读校验不一致')
        out.push({ file, status: 'migrated', backup })
      } catch (e) {
        // 宁可留明文，也不能留一个半截的密文
        let restored = true
        try { await writeFile(file, plain) } catch { restored = false }
        out.push({
          file, status: 'failed', backup,
          reason: '迁移失败：' + msgOf(e) + (restored ? '（已还原明文）' : '⚠ 还原也失败了，请从备份手工恢复：' + basename(backup)),
        })
      }
    }
    return out
  }
}

/** 插件挂载：注册 StorageService 到 ctx.storage。 */
export const name = 'privhub-svc-storage'
export function apply(ctx: Context, config: Config): void {
  const svc = new StorageService(ctx, config)
  /* 注意这里用 console 而不是 ctx.logger：本仓**没有任何 logger exporter**，
   * `ctx.logger.warn(...)` 实测输出到虚空（不打印、不进 data/logs）。而 main.ts 的
   * installFileLogger 是挂在 `console` 上的 —— 想让告警真的出现在
   * `data/logs/privhub-YYYY-MM-DD.log` 里，就必须走 console。 */
  // 启动即确保密钥就绪（密钥缺失尽早暴露，而非首个请求时）
  void svc.ensureKey().catch((e) => console.error('[storage] 密钥初始化失败: ' + msgOf(e)))

  /* 启动自检：还有哪些系统数据文件是明文。
   * 只报告、**不擅自迁移** —— 启动时静默改写用户数据是比「明文」更糟的问题
   * （没法复核、没处回退）。真正的迁移由管理员在管理端显式触发，走备份+校验那条路。 */
  void (async () => {
    try {
      const files = await svc.scanPlaintextSystemFiles()
      if (files.length === 0) return
      console.warn('[storage] 有 ' + files.length + ' 个系统数据文件仍以明文落盘：'
        + files.map((f) => basename(f.file)).join('、')
        + '（管理员可执行 POST /privhub/api/storage/migrate 迁移为密文；迁移前会自动备份明文）')
      for (const f of files) {
        console.warn('[storage]   明文：' + f.file + '（' + f.bytes + ' 字节）')
      }
    } catch (e) {
      console.warn('[storage] 明文扫描失败（不影响启动）：' + msgOf(e))
    }
  })()
}
