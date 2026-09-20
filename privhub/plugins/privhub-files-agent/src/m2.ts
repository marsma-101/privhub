/**
 * privhub-files-agent — M2 可靠与治理模块（写并发闸门 / 幂等 / 配额账本 / 持久化限流 / 版本快照）
 *
 * 纯逻辑模块，不注册路由。被 src/index.ts 引用。
 *
 * @module privhub-files-agent/m2
 */

import { createHash } from 'node:crypto'
import { join, extname } from 'node:path'
import { readFile, writeFile, mkdir, readdir, stat, unlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import type { Context } from '@deepseek-ai/cordis'
/* 【扩展名一处定义】快照清单取自 `privhub-core/src/file-exts`（一处定义 + 显式派生），
 * 本文件不再手写任何扩展名字面量。 */
import { AGENT_SNAPSHOT_EXTS } from '../../privhub-core/src/file-exts'

/* ============ 配置 ============ */

export interface M2Config {
  writeConcurrency: number   // 写并发上限（§6.3）
  queueCapacity: number      // 队列容量（满 → AGENT-4293）
  queueWaitMs: number        // 排队超时（→ AGENT-4294）
  quotaPersonalMb: number    // 专属空间存量配额（写前预检）
  rateKeyPerMin: number
  rateUserPerMin: number
  rateIpPerMin: number
  idemTtlMs: number          // 幂等记录 TTL
  snapshotMax: number        // 版本快照滚动上限
  flushSec: number           // 账本/限流周期落盘秒
}

export const M2_DEFAULTS: M2Config = {
  writeConcurrency: 8,
  queueCapacity: 100,
  queueWaitMs: 30000,
  quotaPersonalMb: 1024,
  rateKeyPerMin: 600,
  rateUserPerMin: 1200,
  rateIpPerMin: 3000,
  idemTtlMs: 24 * 3600 * 1000,
  snapshotMax: 20,
  flushSec: 60,
}

/* ============ 工具 ============ */

export function sha256(s: string): string { return createHash('sha256').update(s).digest('hex') }

/** 与 read 端点一致的 ETag（明文 size + 前 64KB base64） */
export function fileEtag(size: number, headB64: string): string {
  return sha256(String(size) + ':' + headB64)
}

/* ============ 写并发闸门（类网关 accept-queue，§6.3） ============ */

export type GateResult =
  | { ok: true; release: () => void; position: number; waitMs: number }
  | { ok: false; error: 'full' }
  | { ok: false; error: 'timeout' }

export class WriteGate {
  private running = 0
  private queue: Array<{ at: number; timer: NodeJS.Timeout; fire: (r: GateResult) => void }> = []

  constructor(private readonly max: number, private readonly cap: number, private readonly waitMs: number) {}

  acquire(): Promise<GateResult> {
    if (this.running < this.max) {
      this.running++
      return Promise.resolve({ ok: true, release: this.release.bind(this), position: 0, waitMs: 0 })
    }
    if (this.queue.length >= this.cap) return Promise.resolve({ ok: false, error: 'full' })
    return new Promise<GateResult>((resolve) => {
      const entry: { at: number; timer: NodeJS.Timeout; fire: (r: GateResult) => void } = {
        at: Date.now(),
        timer: setTimeout(() => {
          const idx = this.queue.indexOf(entry)
          if (idx >= 0) { this.queue.splice(idx, 1); entry.fire({ ok: false, error: 'timeout' }) }
        }, this.waitMs),
        fire: resolve,
      }
      this.queue.push(entry)
    })
  }

  /** 队头晋升（由 release 触发）；返回队内序号（1 起）供响应头展示 */
  private pump(): void {
    while (this.running < this.max && this.queue.length > 0) {
      const e = this.queue.shift()!
      clearTimeout(e.timer)
      this.running++
      const position = 1
      const waitMs = Date.now() - e.at
      e.fire({ ok: true, release: this.release.bind(this), position, waitMs })
    }
  }

  private release(): void {
    if (this.running > 0) this.running--
    this.pump()
  }

  get depth(): number { return this.queue.length }
}

/* ============ 幂等写入（X-Idempotency-Key，24h TTL） ============ */

const IDEM_DIR = 'agent-idem'

export class Idempotency {
  constructor(private readonly rootDir: string, private readonly ttlMs: number) {}

  private fileOf(keyId: string, idemKey: string): string {
    return join(this.rootDir, 'data', IDEM_DIR, sha256(keyId + '|' + idemKey) + '.json')
  }

  /** 命中返回已存储响应（可重放）；未命中返回 miss；conflict=同幂等键不同请求体 */
  async check(ctx: Context, keyId: string, idemKey: string, bodyHash: string): Promise<{ hit: true; response: unknown } | { hit: false; conflict?: boolean }> {
    const f = this.fileOf(keyId, idemKey)
    if (!existsSync(f)) return { hit: false }
    try {
      const raw = JSON.parse(await ctx.storage.readText(f)) as { bodyHash: string; response: unknown; at: number }
      if (Date.now() - raw.at > this.ttlMs) { await unlink(f).catch(() => {}); return { hit: false } }
      if (raw.bodyHash !== bodyHash) return { hit: false, conflict: true }
      return { hit: true, response: raw.response }
    } catch { return { hit: false } }
  }

  /** 记录（写类成功后调用） */
  async store(ctx: Context, keyId: string, idemKey: string, bodyHash: string, response: unknown): Promise<void> {
    const f = this.fileOf(keyId, idemKey)
    await mkdir(join(this.rootDir, 'data', IDEM_DIR), { recursive: true })
    await ctx.storage.writeText(f, JSON.stringify({ bodyHash, response, at: Date.now() }))
  }

  /** TTL 清理（周期调用） */
  async purgeExpired(ctx: Context): Promise<number> {
    const dir = join(this.rootDir, 'data', IDEM_DIR)
    if (!existsSync(dir)) return 0
    let n = 0
    for (const f of await readdir(dir)) {
      try {
        const p = join(dir, f)
        const raw = JSON.parse(await ctx.storage.readText(p)) as { at?: number }
        if (!raw.at || Date.now() - raw.at > this.ttlMs) { await unlink(p).catch(() => {}); n++ }
      } catch { await unlink(join(dir, f)).catch(() => {}); n++ }
    }
    return n
  }
}

/* ============ 配额账本（专属空间存量，1GB/用户，写前预检） ============ */

export class QuotaLedger {
  private users = new Map<string, { bytes: number; updatedAt: number }>()
  private dirty = false
  private readonly file: string

  constructor(rootDir: string, private readonly quotaBytes: number, private readonly ctx: Context) {
    this.file = join(rootDir, 'data', 'agent-quota.json')
  }

  private async scanUser(ctx: Context, username: string): Promise<number> {
    const root = join(ctx.privhub.dataRoot, '.agents', username)
    if (!existsSync(root)) return 0
    let total = 0
    const walk = async (dir: string): Promise<void> => {
      for (const e of await readdir(dir, { withFileTypes: true })) {
        if (e.name.startsWith('.')) continue
        const full = join(dir, e.name)
        if (e.isDirectory()) await walk(full)
        else if (e.isFile()) {
          try {
            const s = await stat(full)
            let size = s.size
            if (await ctx.storage.isEncrypted(full)) size = Math.max(0, size - 36)
            total += size
          } catch { /* 单文件跳过 */ }
        }
      }
    }
    await walk(root)
    return total
  }

  /** 启动/首次：加载账本；不存在则全量扫描重建 */
  async load(ctx: Context): Promise<void> {
    if (existsSync(this.file)) {
      try {
        const raw = JSON.parse(await ctx.storage.readText(this.file)) as { users?: Record<string, { bytes: number; updatedAt: number }> }
        if (raw.users) {
          for (const [u, v] of Object.entries(raw.users)) this.users.set(u, { bytes: Number(v.bytes) || 0, updatedAt: Number(v.updatedAt) || 0 })
          return
        }
      } catch { /* 损坏则重建 */ }
    }
    // 全量扫描 .agents/*（首启或账本缺失）
    const root = join(ctx.privhub.dataRoot, '.agents')
    if (existsSync(root)) {
      for (const e of await readdir(root, { withFileTypes: true })) {
        if (e.isDirectory()) {
          const u = e.name
          this.users.set(u, { bytes: await this.scanUser(ctx, u), updatedAt: Date.now() })
        }
      }
    }
    this.dirty = true
  }

  /** 惰性保证：某用户首次使用时若不在账本 → 扫描 */
  async ensure(ctx: Context, username: string): Promise<void> {
    if (!this.users.has(username)) {
      this.users.set(username, { bytes: await this.scanUser(ctx, username), updatedAt: Date.now() })
      this.dirty = true
    }
  }

  async usage(ctx: Context, username: string): Promise<number> {
    await this.ensure(ctx, username)
    return this.users.get(username)!.bytes
  }

  /** 写前预检：usage + added - removed ≤ quota */
  async precheck(ctx: Context, username: string, addedBytes: number, removedBytes = 0): Promise<{ ok: boolean; usage: number; quota: number }> {
    const usage = await this.usage(ctx, username)
    const after = usage + addedBytes - removedBytes
    return { ok: after <= this.quotaBytes, usage: after, quota: this.quotaBytes }
  }

  /** 增量更新（write/fork/delete 后） */
  async add(ctx: Context, username: string, delta: number): Promise<void> {
    await this.ensure(ctx, username)
    const u = this.users.get(username)!
    u.bytes = Math.max(0, u.bytes + delta)
    u.updatedAt = Date.now()
    this.dirty = true
  }

  /** 全量重算（restore/purge 等低频管理操作后） */
  async recalc(ctx: Context, username: string): Promise<number> {
    const bytes = await this.scanUser(ctx, username)
    this.users.set(username, { bytes, updatedAt: Date.now() })
    this.dirty = true
    return bytes
  }

  /** 周期落盘（dirty 才写） */
  async flush(ctx: Context): Promise<void> {
    if (!this.dirty) return
    const payload = { version: 1, users: Object.fromEntries(this.users) }
    await ctx.storage.writeText(this.file, JSON.stringify(payload, null, 2))
    this.dirty = false
  }
}

/* ============ 持久化限流（读类：key / user / IP，滑动窗口 + 周期落盘） ============ */

interface Bucket { count: number; resetAt: number }

export class RateLimiter {
  private buckets = new Map<string, Bucket>()
  constructor(private readonly limits: { key: number; user: number; ip: number }) {}

  private bucket(dim: string): Bucket {
    const now = Date.now()
    const resetAt = Math.floor(now / 60000) * 60000 + 60000
    let b = this.buckets.get(dim)
    if (!b || b.resetAt <= now) { b = { count: 0, resetAt }; this.buckets.set(dim, b) }
    return b
  }

  private prune(now = Date.now()): void {
    if (this.buckets.size <= 5000) return
    for (const [k, b] of this.buckets) if (b.resetAt <= now) this.buckets.delete(k)
  }

  check(dims: { key: string; user: string; ip: string }): { ok: true; limit: number; remaining: number; resetAt: number } | { ok: false; limit: number; remaining: number; resetAt: number; retryAfter: number; dim: string } {
    this.prune()
    const candidates: Array<{ dim: string; limit: number }> = [
      { dim: 'key:' + dims.key, limit: this.limits.key },
      { dim: 'user:' + dims.user, limit: this.limits.user },
      { dim: 'ip:' + dims.ip, limit: this.limits.ip },
    ]
    let tightest: { ok: true; limit: number; remaining: number; resetAt: number } | null = null
    for (const c of candidates) {
      const b = this.bucket(c.dim)
      b.count++
      const remaining = Math.max(0, c.limit - b.count)
      const agg = { ok: true as const, limit: c.limit, remaining, resetAt: b.resetAt }
      if (remaining === 0) {
        return { ok: false, limit: c.limit, remaining: 0, resetAt: b.resetAt, retryAfter: Math.max(1, Math.ceil((b.resetAt - Date.now()) / 1000)), dim: c.dim }
      }
      if (!tightest || remaining < tightest.remaining) tightest = agg
    }
    return tightest!
  }

  snapshot(): Record<string, Bucket> { return Object.fromEntries(this.buckets) }
  restore(entries: Record<string, Bucket>): void { for (const [k, v] of Object.entries(entries)) this.buckets.set(k, v) }
}

/* ============ 版本快照（复用 privhub-files-versions 数据格式 data/versions.json） ============ */

/* 【扩展名一处定义】不再手写：取自共享派生集合 `AGENT_SNAPSHOT_EXTS`，与迁前那份 17 项手写清单
 * **逐项同值**（迁前清单里 `md`/`html` 也在；`AGENT_SNAPSHOT_EXTS` 把 `md` 加回、
 * `html` 与 `toml/java/c/cpp/htm` 按"不扩权"留在不做快照那一侧，行为一字不变）。
 * 为什么这份与 `privhub-files-versions` 不同：智能体的覆盖写在**沙箱**里，非快照类型走 `.bak-` 备份，
 * 这是既有的分级策略，本批只把清单"归一"，不改分级。
 * 要改范围，只改 `privhub-core/src/file-exts.ts` 的派生式，不要在这里写第二份清单。 */
const SNAPSHOT_EXTS = new Set(AGENT_SNAPSHOT_EXTS)
const VERSIONS_FILE = 'data/versions.json'

interface Version { at: number; by: string; content: string }
type Store = Record<string, Version[]>

async function loadVersions(ctx: Context, rootDir: string): Promise<Store> {
  const f = join(rootDir, VERSIONS_FILE)
  if (!existsSync(f)) return {}
  try { return JSON.parse(await ctx.storage.readText(f)) as Store } catch { return {} }
}

/** 覆盖前快照（仅文本类；与 versions 插件同格式，滚动 snapshotMax 版；写锁内调用） */
export async function versionSnapshot(ctx: Context, rootDir: string, by: string, project: string, relPath: string, target: string, max: number): Promise<void> {
  if (!SNAPSHOT_EXTS.has(extname(target).slice(1).toLowerCase())) return
  try {
    const content = await ctx.storage.readText(target).catch(() => null)
    if (content === null) return
    const store = await loadVersions(ctx, rootDir)
    const key = project + '|' + relPath.replace(/^\/+|\/+$/g, '')
    const arr = store[key] || []
    arr.push({ at: Date.now(), by, content })
    while (arr.length > max) arr.shift()
    store[key] = arr
    await mkdir(join(rootDir, 'data'), { recursive: true })
    await ctx.storage.writeText(join(rootDir, VERSIONS_FILE), JSON.stringify(store, null, 2))
  } catch { /* 快照失败不阻断主写入 */ }
}

/* ============ per-path 写锁（同一目标串行化） ============ */

export class PathLocks {
  private locks = new Map<string, Promise<unknown>>()
  async run<T>(path: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.locks.get(path) ?? Promise.resolve()
    let release!: () => void
    const gate = new Promise<void>((r) => { release = r })
    const next = prev.then(() => gate)
    this.locks.set(path, next)
    await prev
    try {
      return await fn()
    } finally {
      release()
      if (this.locks.get(path) === next) this.locks.delete(path)
    }
  }
}

/* ============ 周期 flush 助手 ============ */

export function startFlusher(ctx: Context, quota: QuotaLedger, rate: RateLimiter, idem: Idempotency, sec: number): () => void {
  const flushQuota = (): void => { void quota.flush(ctx).catch(() => {}) }
  const flushRate = (): void => {
    const file = join(process.env.PRIVHUB_ROOT?.trim() || process.cwd(), 'data', 'agent-ratelimit.json')
    void ctx.storage.writeText(file, JSON.stringify({ version: 1, at: Date.now(), buckets: rate.snapshot() })).catch(() => {})
  }
  void quota.flush(ctx).catch(() => {})
  const t = setInterval(() => {
    flushQuota()
    flushRate()
    void idem.purgeExpired(ctx).catch(() => {})
  }, Math.max(5000, sec * 1000))
  const dispose = (): void => {
    clearInterval(t)
    flushQuota()
    flushRate()
  }
  ctx.on('dispose', dispose)
  return dispose
}

/** 恢复限流桶（启动时） */
export function restoreRateBuckets(ctx: Context, rate: RateLimiter): void {
  const file = join(process.env.PRIVHUB_ROOT?.trim() || process.cwd(), 'data', 'agent-ratelimit.json')
  void (async () => {
    try {
      const raw = JSON.parse(await ctx.storage.readText(file)) as { buckets?: Record<string, { count: number; resetAt: number }> }
      if (raw.buckets) rate.restore(raw.buckets)
    } catch { /* 无快照则冷启动 */ }
  })()
}