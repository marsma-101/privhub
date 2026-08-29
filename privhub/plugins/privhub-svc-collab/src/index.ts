/**
 * 私域枢纽能力 Service：协同（privhub-svc-collab，S6）
 *
 * 以 cordis Service 形式暴露 `ctx.collab`：join / leave / presence / broadcast。
 * 批次② 落地「服务骨架」：内存会话表 + 补丁环形缓冲，方法契约固定，
 * 供 F25（privhub-files-realtime，批次③）消费；批次③ 接入 Yjs 时
 * 仅在服务内部替换网络同步实现，方法签名不变。
 *
 * 会话为纯内存态（重启即清空，符合当前无持久协同的需求）；
 * 卸载时通过 ctx.on('dispose') 清空，零残留（Cordis 可逆副作用）。
 *
 * @module privhub-svc-collab
 */

import { Service } from '@deepseek-ai/cordis'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

/** 一条协同补丁记录（批次③ 接 Yjs 时 payload 为 Yjs update）。 */
export interface CollabPatch {
  /** epoch 毫秒时间戳 */
  at: number
  /** 发起者用户名 */
  userId: string
  /** 补丁内容（批次② 为任意结构化数据） */
  patch: unknown
}

/** 加入会话的返回：当前在线同伴 + 最近补丁（供新加入者追平状态）。 */
export interface JoinResult {
  docId: string
  peers: string[]
  recentPatches: CollabPatch[]
}

export interface Config {
  /** 全局并发会话上限（防内存膨胀），默认 500 */
  maxSessions: number
  /** 每个文档的补丁环形缓冲上限，默认 100 */
  maxPatches: number
}

export const Config: z<Config> = z.object({
  maxSessions: z.number().default(500),
  maxPatches: z.number().default(100),
})

declare module '@deepseek-ai/cordis' {
  interface Context {
    collab: CollabService
  }
}

export class CollabService extends Service {
  /** docId -> (userId -> joinedAt) */
  private readonly sessions = new Map<string, Map<string, number>>()
  /** docId -> 补丁环形缓冲（新补丁在尾部） */
  private readonly patches = new Map<string, CollabPatch[]>()
  private readonly maxSessions: number
  private readonly maxPatches: number

  constructor(ctx: Context, config: Config) {
    super(ctx, 'collab')
    this.maxSessions = config.maxSessions > 0 ? config.maxSessions : 500
    this.maxPatches = config.maxPatches > 0 ? config.maxPatches : 100
    // 可逆副作用：卸载时清空会话与补丁，零残留
    ctx.on('dispose', () => { this.sessions.clear(); this.patches.clear() })
  }

  /** 加入文档会话；返回同伴列表与最近补丁；会话满返回 null。 */
  join(docId: string, userId: string): JoinResult | null {
    if (docId === '' || userId === '') return null
    if (!this.sessions.has(docId)) {
      if (this.sessions.size >= this.maxSessions) return null
      this.sessions.set(docId, new Map())
    }
    const room = this.sessions.get(docId)!
    if (!room.has(userId)) room.set(userId, Date.now())
    return {
      docId,
      peers: [...room.keys()].filter((u) => u !== userId).sort(),
      recentPatches: this.patches.get(docId) ?? [],
    }
  }

  /** 离开文档会话；房间清空时移除整房间（自动回收内存）。 */
  leave(docId: string, userId: string): void {
    const room = this.sessions.get(docId)
    if (!room) return
    room.delete(userId)
    if (room.size === 0) {
      this.sessions.delete(docId)
      this.patches.delete(docId)
    }
  }

  /** 当前在线用户列表（升序）。 */
  presence(docId: string): string[] {
    return [...(this.sessions.get(docId)?.keys() ?? [])].sort()
  }

  /** 广播一条补丁到文档会话；返回除发送者外的在线人数（=应接收者数）。 */
  broadcast(docId: string, userId: string, patch: unknown): number {
    const room = this.sessions.get(docId)
    if (!room) return 0
    const list = this.patches.get(docId) ?? []
    list.push({ at: Date.now(), userId, patch })
    if (list.length > this.maxPatches) list.splice(0, list.length - this.maxPatches)
    this.patches.set(docId, list)
    return room.size - (room.has(userId) ? 1 : 0)
  }

  /** 会话统计（供调试/监控）。 */
  stats(): { sessions: number; patches: number } {
    let patches = 0
    for (const list of this.patches.values()) patches += list.length
    return { sessions: this.sessions.size, patches }
  }
}

/** 插件挂载：注册 CollabService 到 ctx.collab。 */
export const name = 'privhub-svc-collab'
export function apply(ctx: Context, config: Config): void {
  new CollabService(ctx, config)
}
