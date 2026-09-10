/**
 * 私域枢纽能力 Service：审计日志（privhub-svc-audit，S1）
 *
 * 以 cordis Service 形式暴露 `ctx.audit`：log / query / exportCsv。
 * 数据写 JSONL（data/audit.jsonl），按保留天数（默认 60 天）
 * 在每次写入时顺带清理过期条目。供 F13 审计日志插件（写）与
 * F15 审计面板插件（查/导出）消费；也可被任意功能插件直接调用。
 *
 * @module privhub-svc-audit
 */

import { appendFile, readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { dirname } from 'node:path'
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

export class AuditService extends Service {
  private readonly file: string
  private readonly ttlMs: number
  private readonly maxEntries: number
  private blockReady = false

  constructor(ctx: Context, private readonly config: Config) {
    super(ctx, 'audit')
    const f = config.file.trim()
    this.file = f === '' ? join(rootDir, 'data', 'audit.jsonl') : resolve(f)
    this.ttlMs = (config.retentionDays > 0 ? config.retentionDays : 60) * 24 * 3600 * 1000
    // 防止单次写入无限膨胀：保留天数之外再兜底 20 万条
    this.maxEntries = 200_000
  }

  /** S7：惰性把明文 JSONL 迁移为加密块格式（首次写入时检查文件头）。 */
  private async ensureBlockFormat(): Promise<void> {
    if (this.blockReady) return
    if (existsSync(this.file)) {
      const fh = await import('node:fs/promises').then((m) => m.open(this.file, 'r'))
      try {
        const head = Buffer.alloc(8)
        const { bytesRead } = await fh.read(head, 0, 8, 0)
        // 与 svc-storage 写入格式一致：'PHAUD1\0'.padEnd(8,'\0') = 8 字节（50 48 41 55 44 31 00 00）
        if (bytesRead === 8 && head.toString('utf8') === 'PHAUD1\0\0') { this.blockReady = true; return }
      } finally { await fh.close() }
      // 明文 JSONL → 逐行加密块，覆写
      const raw = await readFile(this.file, 'utf8')
      const lines = raw.split('\n').filter((l) => l.trim() !== '')
      const blocks = await Promise.all(lines.map((l) => this.ctx.storage.auditEncryptBlock(l)))
      await writeFile(this.file, Buffer.concat(blocks))
    }
    this.blockReady = true
  }

  /** 追加一条审计记录（自动带 id/at，并顺带清理过期条目；S7 记录级加密块追加）。 */
  async log(entry: Omit<AuditEntry, 'id' | 'at'>): Promise<AuditEntry> {
    const rec: AuditEntry = {
      ...entry,
      id: `${Date.now()}_${randomBytes(4).toString('hex')}`,
      at: Date.now(),
    }
    await mkdir(dirname(this.file), { recursive: true })
    await this.ensureBlockFormat()
    const block = await this.ctx.storage.auditEncryptBlock(JSON.stringify(rec))
    await appendFile(this.file, block)
    // 低频清理：每 200 条触发一次过期清理，避免每次写入都重读文件
    if (Math.floor(Date.now() / 1000) % 200 === 0) await this.prune()
    return rec
  }

  /** 按条件查询（按时间倒序；limit 默认 200）。 */
  async query(filter: AuditFilter = {}): Promise<AuditEntry[]> {
    const all = await this.readAll()
    const out = all.filter((e) => {
      // 防御：跳过 at 无效的损坏记录（历史遗留坏数据，避免 CSV/展示崩溃）
      if (typeof e.at !== 'number' || Number.isNaN(e.at)) return false
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

  /** 读取全部条目（文件不存在返回空；S7 解密块解析，兼容旧明文）。 */
  private async readAll(): Promise<AuditEntry[]> {
    if (!existsSync(this.file)) return []
    try {
      const lines = await this.ctx.storage.auditDecryptAll(this.file)
      const out: AuditEntry[] = []
      for (const line of lines) {
        try { out.push(JSON.parse(line) as AuditEntry) } catch { /* 跳过损坏块 */ }
      }
      return out
    } catch { return [] }
  }

  /** 清理超过保留期的条目；超出上限时保留最新的 maxEntries 条。 */
  private async prune(): Promise<void> {
    const all = await this.readAll()
    if (all.length === 0) return
    const now = Date.now()
    let kept = all.filter((e) => now - e.at <= this.ttlMs)
    if (kept.length > this.maxEntries) kept = kept.slice(kept.length - this.maxEntries)
    if (kept.length !== all.length) {
      // S7：清理后整体重写为加密块
      const blocks = await Promise.all(kept.map((e) => this.ctx.storage.auditEncryptBlock(JSON.stringify(e))))
      await writeFile(this.file, Buffer.concat(blocks))
    }
  }
}

/** 插件挂载：注册 AuditService 到 ctx.audit。 */
export const name = 'privhub-svc-audit'
export const inject = ['storage']
export function apply(ctx: Context, config: Config): void {
  const svc = new AuditService(ctx, config)
  ctx.on('dispose', () => { void svc.prune() })
}
