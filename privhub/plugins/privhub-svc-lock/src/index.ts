/**
 * 私域枢纽能力 Service：文件排他编辑锁（privhub-svc-lock，Y 批）
 *
 * 以 cordis Service 形式暴露 `ctx.lock`：status / acquire / renew / release /
 * conflict / withNameLock / stats。
 *
 * 解决的问题：在线编辑是「读 → 改 → 写」的长事务，两个用户同时进来会互相覆盖
 * （最后一次写赢，前一个人的改动无声消失）。既有的 `baseMtime` 409 是**乐观**检测
 * ——冲突在保存那一刻才发现；本 Service 提供**悲观**锁——第二个用户一申请就被拦下，
 * 提示「文件正被 X 修改，请稍后重试」（对应用户的 C++ mutex 类比）。
 *
 * 两类锁：
 *   - content：编辑器持有的长锁（默认 TTL 10 分钟，保存/心跳续期）。
 *   - name：重命名 / 移动 / 删除这类「名字级」操作在服务端瞬时持有的短锁
 *     （整个 fs 操作期间不可被并发抢），它既拦截正在编辑该文件的人，
 *     也被正在编辑的人反向拦截。
 *
 * 冲突判定按**路径前缀**（分隔符感知）：同名同项目、或一方是另一方的祖先目录
 * 才算冲突。`a/b.md` 与 `a/b.md.txt` 不冲突；锁住目录 `a` 与锁住 `a/b.md` 冲突。
 *
 * 纯内存态（重启即清空），单进程部署下即为全局唯一锁表；卸载时通过 ctx.effect
 * 清空，零残留（Cordis 可逆副作用）。
 *
 * @module privhub-svc-lock
 */

import { Service } from '@deepseek-ai/cordis'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

/** 锁的类别：content=编辑器长锁；name=名字级操作的瞬时锁。 */
export type LockKind = 'content' | 'name'

/** 一条锁记录。 */
export interface LockRec {
  project: string
  /** 项目内相对路径（已归一化：正斜杠、无首尾斜杠）；'' 表示项目根 */
  path: string
  /** 持有人用户名 */
  user: string
  kind: LockKind
  /** 最后一次活动时间（获取/续期/保存）；epoch 毫秒 */
  at: number
  /** 存活时长（毫秒）：超过 at+ttl 的锁视为已过期 */
  ttl: number
}

/** 查询锁状态的结果（对外可安全下发）。 */
export interface LockStatus {
  locked: boolean
  by: string | null
  expiresAt: number | null
  kind: LockKind | null
}

/** 申请锁的结果。 */
export interface AcquireResult {
  ok: boolean
  /** 同一用户重复申请 → 视为续期 */
  renew?: boolean
  /** 冲突时的占用人（ok=false） */
  holder?: string
  expiresAt?: number
  kind?: LockKind
}

export interface Config {
  /** 默认锁存活时长（毫秒），默认 10 分钟 */
  ttlMs: number
  /** 锁表容量上限（防内存膨胀），默认 5000 */
  maxLocks: number
}

export const Config: z<Config> = z.object({
  ttlMs: z.number().default(10 * 60 * 1000),
  maxLocks: z.number().default(5000),
})

/** 单次申请允许的 TTL 范围（防止客户端把锁设成永久或瞬间过期）。 */
const MIN_TTL_MS = 2 * 1000
const MAX_TTL_MS = 60 * 60 * 1000

declare module '@deepseek-ai/cordis' {
  interface Context {
    lock: LockService
  }
}

/** 路径归一化：反斜杠转正斜杠、去掉 `./` 前缀与首尾斜杠。 */
function normPath(p: string): string {
  let s = String(p ?? '').replace(/\\/g, '/')
  while (s.startsWith('./')) s = s.slice(2)
  return s.replace(/^\/+|\/+$/g, '')
}

/**
 * 两路径是否冲突（分隔符感知的前缀包含）。
 * 项目根（''）视为锁住整个项目。
 */
function overlaps(a: string, b: string): boolean {
  if (a === b) return true
  if (a === '' || b === '') return true
  return a.startsWith(b + '/') || b.startsWith(a + '/')
}

export class LockService extends Service {
  /** key = kind + '|' + project + '|' + path */
  private readonly locks = new Map<string, LockRec>()
  private readonly defTtl: number
  private readonly maxLocks: number

  constructor(ctx: Context, config: Config) {
    super(ctx, 'lock')
    this.defTtl = config.ttlMs >= MIN_TTL_MS ? config.ttlMs : 10 * 60 * 1000
    this.maxLocks = config.maxLocks > 0 ? config.maxLocks : 5000
    /* 卸载清理：锁表清零，零残留 */
    ctx.effect(() => () => { this.locks.clear() })
  }

  private key(kind: LockKind, project: string, path: string): string {
    return kind + '|' + project + '|' + path
  }

  /** 清掉已过期的锁；返回清掉的数量。 */
  private prune(now = Date.now()): number {
    let n = 0
    for (const [k, v] of this.locks) {
      if (now - v.at >= v.ttl) { this.locks.delete(k); n++ }
    }
    return n
  }

  /**
   * 查找与 (project, path) 冲突的锁（可选排除某个用户，用于「自己写自己的」放行）。
   * 返回第一条命中的记录，无则 null。
   */
  conflict(project: string, path: string, exceptUser?: string): LockRec | null {
    this.prune()
    const p = normPath(path)
    for (const v of this.locks.values()) {
      if (v.project !== project) continue
      if (exceptUser !== undefined && v.user === exceptUser) continue
      if (overlaps(v.path, p)) return { ...v }
    }
    return null
  }

  /** 查询锁状态（不区分用户）。 */
  status(project: string, path: string): LockStatus {
    const hit = this.conflict(project, path)
    if (!hit) return { locked: false, by: null, expiresAt: null, kind: null }
    return { locked: true, by: hit.user, expiresAt: hit.at + hit.ttl, kind: hit.kind }
  }

  /** 该文件是否被「除我以外」的人锁着（写前校验用）。 */
  isLockedByOther(user: string, project: string, path: string): LockRec | null {
    return this.conflict(project, path, user)
  }

  /** 是否是「我」持有的锁（office2 保存前校验用）。 */
  isHeldBy(user: string, project: string, path: string): boolean {
    this.prune()
    const p = normPath(path)
    for (const v of this.locks.values()) {
      if (v.project === project && v.kind === 'content' && v.path === p) {
        return v.user === user && Date.now() - v.at < v.ttl
      }
    }
    return false
  }

  /**
   * 申请 content 长锁。同一用户重复申请 = 续期；被他人占用 → ok=false 带占用人。
   */
  acquire(user: string, project: string, path: string, ttlMs?: number): AcquireResult {
    const p = normPath(path)
    const ttl = Math.min(MAX_TTL_MS, Math.max(MIN_TTL_MS, Number(ttlMs ?? this.defTtl) || this.defTtl))
    this.prune()
    const mine = this.locks.get(this.key('content', project, p))
    if (mine && mine.user === user) {
      mine.at = Date.now(); mine.ttl = ttl
      return { ok: true, renew: true, expiresAt: mine.at + mine.ttl, kind: 'content' }
    }
    const hit = this.conflict(project, p)
    if (hit) return { ok: false, holder: hit.user, expiresAt: hit.at + hit.ttl, kind: hit.kind }
    if (this.locks.size >= this.maxLocks) {
      this.prune()
      if (this.locks.size >= this.maxLocks) return { ok: false, holder: '（锁表已满）' }
    }
    const at = Date.now()
    this.locks.set(this.key('content', project, p), { project, path: p, user, kind: 'content', at, ttl })
    return { ok: true, renew: false, expiresAt: at + ttl, kind: 'content' }
  }

  /** 续期（心跳）。仅当确实持有该 content 锁时成功。 */
  renew(user: string, project: string, path: string, ttlMs?: number): boolean {
    const p = normPath(path)
    this.prune()
    const rec = this.locks.get(this.key('content', project, p))
    if (!rec || rec.user !== user) return false
    rec.at = Date.now()
    if (ttlMs !== undefined) rec.ttl = Math.min(MAX_TTL_MS, Math.max(MIN_TTL_MS, Number(ttlMs) || rec.ttl))
    return true
  }

  /**
   * 释放 content 锁。默认仅持有人可释放；force=true（管理员强解）忽略持有人。
   * 返回是否真的释放了一条锁。
   */
  release(user: string, project: string, path: string, opts?: { force?: boolean }): boolean {
    const p = normPath(path)
    this.prune()
    const k = this.key('content', project, p)
    const rec = this.locks.get(k)
    if (!rec) return false
    if (!opts?.force && rec.user !== user) return false
    this.locks.delete(k)
    return true
  }

  /**
   * 名字级操作（重命名/移动/删除）的服务端临界区。
   *
   * 同步登记 name 锁（Node 单线程，此段无 await → 与并发的 acquire/withNameLock
   * 互斥），随后执行 fn，finally 里释放。任一目标路径与他人锁冲突即返回 ok=false。
   *
   * @param paths 需要保护的路径集合（如 move 的源 + 目标目录）；空串会被忽略
   *              （''=项目根，只用于冲突判定，不作登记，否则等于锁全项目）。
   */
  async withNameLock<T>(
    user: string,
    project: string,
    paths: string[],
    fn: () => Promise<T>,
  ): Promise<{ ok: true; value: T } | { ok: false; holder: LockRec }> {
    this.prune()
    const targets = paths.map(normPath).filter((p) => p !== '')
    /* 1) 冲突检查（他人锁 → 拒绝） */
    for (const p of targets) {
      const hit = this.conflict(project, p, user)
      if (hit) return { ok: false, holder: hit }
    }
    /* 2) 登记瞬时 name 锁（同一用户已有的 name 锁直接续期，不重复占位） */
    const now = Date.now()
    const keys: string[] = []
    for (const p of targets) {
      const k = this.key('name', project, p)
      const prev = this.locks.get(k)
      this.locks.set(k, { project, path: p, user, kind: 'name', at: prev && prev.user === user ? prev.at : now, ttl: MAX_TTL_MS })
      keys.push(k)
    }
    try {
      return { ok: true, value: await fn() }
    } finally {
      for (const k of keys) {
        const rec = this.locks.get(k)
        if (rec && rec.kind === 'name' && rec.user === user) this.locks.delete(k)
      }
    }
  }

  /** 锁表统计（供调试/监控）。 */
  stats(): { total: number; content: number; name: number } {
    this.prune()
    let content = 0
    let name = 0
    for (const v of this.locks.values()) (v.kind === 'content' ? content++ : name++)
    return { total: this.locks.size, content, name }
  }
}

/** 插件挂载：注册 LockService 到 ctx.lock。 */
export const name = 'privhub-svc-lock'
export function apply(ctx: Context, config: Config): void {
  new LockService(ctx, config)
}
