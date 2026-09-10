/**
 * 私域枢纽能力 Service：审计日志（privhub-svc-audit，S1）
 *
 * 以 cordis Service 形式暴露 `ctx.audit`：log / query / exportCsv。
 * 数据写 JSONL（data/audit.jsonl），按保留天数（默认 60 天）与条数上限（20 万）
 * 定期清理。供 F13 审计日志插件（写）与 F15 审计面板插件（查/导出）消费。
 *
 * ── 2026-09-11 可靠性加固（对应《改进建议》D1/D2/D3）──────────────
 * 修复了造成 2026-09-05「审计文件损坏并膨胀至 446MB」事故的三个缺陷：
 *
 *  D1 迁移竞态：明文 JSONL → 加密块的惰性迁移此前用布尔标志守卫，
 *     标志在 await 之后才置位，两个并发首写会导致后者把【二进制密文】
 *     按 UTF-8 读入、按行切分后再加密一遍，块数爆炸、内容全损。
 *     现改为：① 单飞 Promise 串行化；② 魔数按【字节】比对（不再 utf8 解码比对）；
 *     ③ 迁移前校验内容确为 JSONL（行首为 '{'），否则拒绝迁移并报错，
 *        从根上杜绝"把密文当文本二次加密"；④ 迁移与清理均走原子替换并留备份。
 *  D2 保留策略失效：清理触发条件写成「墙钟秒数为 200 的倍数那一秒」（命中率 0.5%），
 *     实际几乎不触发（事故文件 87.4 万条远超 20 万上限即为此故）。
 *     现改为按【写入计数】触发 + 定时器兜底双通道。
 *  D3 非原子写：迁移与清理的整文件重写未用 tmp+rename，中断即产生半截文件
 *     （磁盘上 audit.jsonl.damaged-* 的"1961 块后断裂 + 6.5MB 尾部残留"即此签名）。
 *     现统一走 writeFile(tmp) + rename，并在替换前保留 .bak。
 *
 * @module privhub-svc-audit
 */

import { appendFile, readFile, writeFile, mkdir, rename, open, copyFile, rm } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { Service } from '@deepseek-ai/cordis'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

/** 一条审计记录。 */
export interface AuditEntry {
  id: string
  /** epoch 毫秒时间戳 */
  at: number
  /** 操作者用户名 */
  user: string
  /** 操作类型：upload / delete / rename / mkdir / restore / purge / clean / login / logout / register / project-create / project-delete / user-update / user-delete / user-reset-password 等 */
  action: string
  /** 目标文件/项目路径（可选） */
  target?: string
  /** 补充说明（可选） */
  detail?: string
}

/** 查询过滤条件（全部可选，命中即包含）。 */
export interface AuditFilter {
  user?: string
  action?: string
  /** 时间范围（epoch 毫秒，含端点） */
  from?: number
  to?: number
  limit?: number
}

export interface Config {
  /** JSONL 文件路径；留空则按项目根（PRIVHUB_ROOT）定位 data/audit.jsonl */
  file: string
  /** 保留天数，默认 60 */
  retentionDays: number
}

export const Config: z<Config> = z.object({
  file: z.string().default(''),
  retentionDays: z.number().default(60),
})

declare module '@deepseek-ai/cordis' {
  interface Context {
    audit: AuditService
  }
}

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()

/** 加密块魔数：'PHAUD1' + 2 个 NUL，共 8 字节（与 svc-storage 写入格式一致）。 */
const MAGIC = Buffer.from('PHAUD1\u0000\u0000', 'latin1')

export class AuditService extends Service {
  private readonly file: string
  private readonly ttlMs: number
  private readonly maxEntries: number
  /** D1：迁移单飞 Promise（null = 尚未迁移）。 */
  private migrate: Promise<void> | null = null
  /** 写操作串行链：保证 append 与 prune 不会交错。 */
  private writeChain: Promise<unknown> = Promise.resolve()
  /** D2：自上次清理以来的写入条数。 */
  private sincePrune = 0
  /** 每写入 N 条触发一次清理（可用 PRIVHUB_AUDIT_PRUNE_EVERY 调整，测试用）。 */
  private readonly pruneEvery: number

  constructor(ctx: Context, private readonly config: Config) {
    super(ctx, 'audit')
    const f = config.file.trim()
    this.file = f === '' ? join(rootDir, 'data', 'audit.jsonl') : resolve(f)
    this.ttlMs = (config.retentionDays > 0 ? config.retentionDays : 60) * 24 * 3600 * 1000
    // 防止无限膨胀：保留天数之外再兜底 20 万条
    this.maxEntries = 200_000
    const every = Number(process.env.PRIVHUB_AUDIT_PRUNE_EVERY)
    this.pruneEvery = Number.isFinite(every) && every > 0 ? Math.floor(every) : 200
  }

  /* ---------------- 内部：文件格式 ---------------- */

  /** 读取文件头 8 字节，判断是否为加密块格式。 */
  private async hasMagic(): Promise<boolean> {
    if (!existsSync(this.file)) return false
    const fh = await open(this.file, 'r')
    try {
      const head = Buffer.alloc(MAGIC.length)
      const { bytesRead } = await fh.read(head, 0, MAGIC.length, 0)
      // D1：按字节比对，绝不把二进制当 utf8 字符串比较
      return bytesRead === MAGIC.length && head.equals(MAGIC)
    } finally { await fh.close() }
  }

  /**
   * 诊断日志（迁移拒绝 / 写入失败 / 替换失败等必须可见）。
   * 原事故长期未被发现，根因之一就是失败被静默吞掉；
   * 因此除 ctx.logger 外再兜底写 stderr——本部署未挂 logger 插件时也能看到。
   */
  private warn(msg: string, e?: unknown, visible = true): void {
    const detail = e === undefined ? '' : ' → ' + (e instanceof Error ? e.message : String(e))
    const line = '[audit] ' + msg + detail
    try { this.ctx.logger?.warn?.(line) } catch { /* logger 不可用则放弃 */ }
    if (visible) console.error(line)
  }

  /**
   * D3：原子替换整个文件（临时文件名带 pid + 随机后缀，避免并发写互相覆盖），
   * 替换前保留一份 .bak。
   *
   * Windows 注意：目标文件被其它句柄占用时 rename 会抛 EPERM/EBUSY，
   * 因此带短重试；失败时清理临时文件，绝不留下半成品。
   */
  private async atomicReplace(data: Buffer): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true })
    if (existsSync(this.file)) {
      await copyFile(this.file, this.file + '.bak').catch((e) => this.warn('备份 .bak 失败（不阻断）', e, false))
    }
    const tmp = `${this.file}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`
    await writeFile(tmp, data)
    let lastErr: unknown = null
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await rename(tmp, this.file)
        return
      } catch (e) {
        lastErr = e
        // 目标被占用（Windows 常见）：退避后重试
        await new Promise((r) => setTimeout(r, 30 * (attempt + 1)))
      }
    }
    // 重试仍失败：清理临时文件，避免残留堆积，并把错误交给调用方
    await rm(tmp, { force: true }).catch(() => { /* 清理失败也不掩盖原错误 */ })
    this.warn('原子替换失败（已清理临时文件）', lastErr)
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
  }

  /**
   * D1：惰性把明文 JSONL 迁移为加密块格式。
   * 单飞 Promise 保证并发首写只迁移一次；迁移前校验内容特征，拒绝误迁移。
   */
  private ensureBlockFormat(): Promise<void> {
    if (!this.migrate) {
      this.migrate = this.doMigrate().catch((e) => {
        // 迁移失败必须让后续写入失败，而不是带着错误状态继续跑
        this.migrate = null
        throw e
      })
    }
    return this.migrate
  }

  private async doMigrate(): Promise<void> {
    if (!existsSync(this.file)) return
    if (await this.hasMagic()) return // 已是加密格式

    // 明文 → 先读全文并做特征校验
    const raw = await readFile(this.file, 'utf8')
    const lines = raw.split('\n').filter((l) => l.trim() !== '')
    if (lines.length > 0) {
      const allJsonObjects = lines.every((l) => l.trim().startsWith('{'))
      if (!allJsonObjects) {
        // 内容既不是密文（无魔数）也不是合法 JSONL —— 极可能是历史损坏或误格式。
        // 此时【拒绝迁移】，宁可报错也不要把内容再加密一遍放大损坏。
        throw new Error(
          `[audit] 拒绝迁移 ${this.file}：内容既非加密块（无 PHAUD1 魔数）也非 JSONL。` +
          '请人工确认该文件（可能是历史损坏产物），处理后重启。',
        )
      }
    }
    const blocks = await Promise.all(lines.map((l) => this.ctx.storage.auditEncryptBlock(l)))
    await this.atomicReplace(Buffer.concat(blocks))
  }

  /** 损坏告警只报一次，避免每次查询刷屏。 */
  private integrityWarned = false

  /**
   * 读取全部条目 + 完整性统计（文件不存在返回空）。
   *
   * 完整性统计是必需的：2026-09-05 事故期间损坏完全不可见（坏块静默跳过），
   * 管理员只看到「审计条目变少了」，无从判断是数据损坏还是本来就没记录。
   */
  private async readAll(): Promise<{
    entries: AuditEntry[]
    badBlocks: number
    unreadable: boolean
    totalBlocks: number
    trailingBytes: number
  }> {
    if (!existsSync(this.file)) {
      return { entries: [], badBlocks: 0, unreadable: false, totalBlocks: 0, trailingBytes: 0 }
    }
    let scan: Awaited<ReturnType<typeof this.ctx.storage.auditScan>>
    try {
      scan = await this.ctx.storage.auditScan(this.file)
    } catch {
      // 整体不可读（例如密钥不匹配 / 文件严重损坏）：必须让调用方知道，
      // 否则 prune 会误判为「空文件」而放弃修复，或更糟——按空内容覆写。
      return { entries: [], badBlocks: 0, unreadable: true, totalBlocks: 0, trailingBytes: 0 }
    }
    const entries: AuditEntry[] = []
    let badBlocks = scan.badBlocks
    for (const line of scan.lines) {
      try {
        const parsed = JSON.parse(line) as AuditEntry
        if (typeof parsed.at !== 'number' || Number.isNaN(parsed.at)) { badBlocks++; continue }
        entries.push(parsed)
      } catch { badBlocks++ }
    }
    // 损坏可见：坏块或结构断裂时显著告警（仅一次，避免刷屏）
    const damaged = badBlocks > 0 || scan.trailingBytes > 0
    if (damaged && !this.integrityWarned) {
      this.integrityWarned = true
      this.warn(
        `审计文件存在损坏：可读 ${entries.length} 条 / 坏块 ${badBlocks} 个 / 尾部未解析 ${scan.trailingBytes} 字节。` +
        `文件：${this.file}。损坏块无法恢复，但【不会】被自动删除或覆盖；` +
        '请备份该文件后联系维护者，并检查是否曾发生并发首写（历史上曾导致密文被二次加密）。',
      )
    }
    return { entries, badBlocks, unreadable: false, totalBlocks: scan.totalBlocks, trailingBytes: scan.trailingBytes }
  }

  /* ---------------- 公开 API ---------------- */

  /** 追加一条审计记录（自动带 id/at；S7 记录级加密块追加）。 */
  async log(entry: Omit<AuditEntry, 'id' | 'at'>): Promise<AuditEntry> {
    const rec: AuditEntry = {
      ...entry,
      id: `${Date.now()}_${randomBytes(4).toString('hex')}`,
      at: Date.now(),
    }
    // 串行化：append 与 prune 不交错，避免读-改-写丢记录
    const task = async (): Promise<void> => {
      await mkdir(dirname(this.file), { recursive: true })
      await this.ensureBlockFormat()
      const block = await this.ctx.storage.auditEncryptBlock(JSON.stringify(rec))
      await appendFile(this.file, block)
      // D2：按写入计数触发清理（原实现用墙钟取模，命中率 0.5%，实际从未生效）
      if (++this.sincePrune >= this.pruneEvery) {
        this.sincePrune = 0
        // 记录已落盘；清理失败不得让本次审计写入失败，但必须留下日志
        try { await this.pruneNow() } catch (e) { this.warn('清理失败（本次写入已成功）', e) }
      }
    }
    const p = this.writeChain.then(task, task)
    this.writeChain = p.catch((e) => { this.warn('审计写入失败', e) })
    await p
    return rec
  }

  /** 按条件查询（按时间倒序；limit 默认 200）。 */
  async query(filter: AuditFilter = {}): Promise<AuditEntry[]> {
    const { entries } = await this.readAll()
    const out = entries.filter((e) => {
      if (filter.user !== undefined && e.user !== filter.user) return false
      if (filter.action !== undefined && e.action !== filter.action) return false
      if (filter.from !== undefined && e.at < filter.from) return false
      if (filter.to !== undefined && e.at > filter.to) return false
      return true
    })
    out.sort((a, b) => b.at - a.at)
    return out.slice(0, filter.limit ?? 200)
  }

  /** 导出 CSV（UTF-8 带 BOM，Excel 可直接打开）。 */
  async exportCsv(filter: AuditFilter = {}): Promise<string> {
    const rows = await this.query({ ...filter, limit: undefined })
    const esc = (v: string): string => '"' + String(v).replace(/"/g, '""') + '"'
    const head = ['id', 'at', 'user', 'action', 'target', 'detail'].map(esc).join(',')
    const lines = rows.map((e) => [e.id, new Date(e.at).toISOString(), e.user, e.action, e.target ?? '', e.detail ?? ''].map(esc).join(','))
    return '\uFEFF' + head + '\n' + lines.join('\n')
  }

  /** 当前审计文件状态（供健康检查 / 管理面板诊断）。 */
  async stats(): Promise<{
    entries: number; badBlocks: number; unreadable: boolean; file: string
    totalBlocks: number; trailingBytes: number; healthy: boolean
  }> {
    const r = await this.readAll()
    return {
      entries: r.entries.length,
      badBlocks: r.badBlocks,
      unreadable: r.unreadable,
      file: this.file,
      totalBlocks: r.totalBlocks,
      trailingBytes: r.trailingBytes,
      healthy: !r.unreadable && r.badBlocks === 0 && r.trailingBytes === 0,
    }
  }

  /**
   * 清理超过保留期的条目；超出上限时保留最新的 maxEntries 条。
   * 走原子替换（D3）；读取失败时【不做任何写入】（D4 同源原则：损坏状态禁止覆写）。
   */
  async pruneNow(): Promise<void> {
    const { entries, unreadable } = await this.readAll()
    if (unreadable) return
    if (entries.length === 0) return
    const now = Date.now()
    let kept = entries.filter((e) => now - e.at <= this.ttlMs)
    if (kept.length > this.maxEntries) {
      kept = kept.slice().sort((a, b) => a.at - b.at).slice(kept.length - this.maxEntries)
    }
    if (kept.length === entries.length) return
    const ordered = kept.sort((a, b) => a.at - b.at)
    const blocks = await Promise.all(ordered.map((e) => this.ctx.storage.auditEncryptBlock(JSON.stringify(e))))
    await this.atomicReplace(Buffer.concat(blocks))
  }
}

/** 插件挂载：注册 AuditService 到 ctx.audit。 */
export const name = 'privhub-svc-audit'
export const inject = ['storage']
export function apply(ctx: Context, config: Config): void {
  const svc = new AuditService(ctx, config)
  // D2：定时兜底清理（写入计数之外的第二通道）；unref 避免阻碍进程退出
  const timer = setInterval(() => { void svc.pruneNow().catch(() => { /* 忽略 */ }) }, 30 * 60 * 1000)
  if (typeof timer.unref === 'function') timer.unref()
  ctx.effect(() => () => clearInterval(timer))
  ctx.on('dispose', () => { void svc.pruneNow().catch(() => { /* 忽略 */ }) })
}
