/**
 * privhub-svc-events — 事件总线注册表（E1，L2 能力 Service）
 *
 * 治理插件间的字符串事件：
 *   - declareEmit(name, plugin, desc?)：emit 方在 apply 时声明「我发什么事件」
 *   - declareListen(name, plugin, desc?)：监听方声明「我听什么事件」
 *   - snapshot()：完整注册表（事件 → 语义描述 / emit 方 / 监听方）
 *   - warnIfNoListener(name, plugin)：可选检查（emit 前调用，无监听方时 logger.warn）
 *
 * 设计：只做「声明 + 可见性」，不包裹 ctx.emit/ctx.on（零侵入、零风险）；
 * 注册表为内存态（M3 控制台经管理端点暴露）。
 *
 * 事件契约（2026-09-05 治理基线）：
 *   audit:logged  ── 写操作成功审计广播（S1 闭环）。emit: auth/admin/files/trash/edit-md/
 *                    office-ui/office-ai/agent · listen: admin-audit（面板实时刷新）
 *   file:changed  ── 文件系统变更专用事件（创建/保存/删除/重命名/移动/恢复/清空）。
 *                    payload { project, path, action: created|saved|deleted|renamed|moved|
 *                    restored|purged|clean, newPath? }
 *                    emit: files/trash/edit-md/office-ui · listen: fulltext（索引增量维护）
 *   file:saved    ── 文档保存广播（带内容 doc，供全文索引/图谱直用）。
 *                    emit: edit-md/office-ui · listen: fulltext/kg
 *   meta:changed  ── 元数据（标签）变更广播。emit: tags · listen: kg
 *   dispose       ── cordis 内置清理通知（各插件 effect 清理任务）
 *
 * @module privhub-svc-events
 */

import { Service } from '@deepseek-ai/cordis'
import type { Context } from '@deepseek-ai/cordis'

export interface EventSpec {
  desc: string
  emits: string[]
  listens: string[]
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    eventBus: EventsRegistry
  }
}

export class EventsRegistry extends Service {
  private readonly reg = new Map<string, EventSpec>()
  constructor(ctx: Context) {
    super(ctx, 'eventBus')
  }

  /** emit 方声明（同插件重复调用幂等） */
  declareEmit(name: string, plugin: string, desc = ''): void {
    const cur = this.reg.get(name) ?? { desc, emits: [], listens: [] }
    if (!cur.emits.includes(plugin)) cur.emits.push(plugin)
    if (desc && !cur.desc) cur.desc = desc
    this.reg.set(name, cur)
  }

  /** 监听方声明（同插件重复调用幂等） */
  declareListen(name: string, plugin: string, desc = ''): void {
    const cur = this.reg.get(name) ?? { desc, emits: [], listens: [] }
    if (!cur.listens.includes(plugin)) cur.listens.push(plugin)
    if (desc && !cur.desc) cur.desc = desc
    this.reg.set(name, cur)
  }

  /** 主动检查：emit 的事件无监听方时告警（不阻断） */
  warnIfNoListener(name: string, plugin: string): void {
    const cur = this.reg.get(name)
    if (cur && cur.listens.length === 0) {
      this.ctx.logger?.warn(`[events] ${plugin} emit '${name}' 但暂无监听方`)
    }
  }

  /** 完整注册表快照（控制台/运维展示） */
  snapshot(): Record<string, EventSpec> {
    return Object.fromEntries([...this.reg.entries()].sort((a, b) => a[0].localeCompare(b[0])))
  }
}

export const name = 'privhub-svc-events'
export const inject: string[] = []
export function apply(ctx: Context): void {
  new EventsRegistry(ctx)
}