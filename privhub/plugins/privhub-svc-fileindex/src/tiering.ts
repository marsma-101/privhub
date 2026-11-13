/**
 * 分层搬移的编排（hot → cold）
 *
 * ## 为什么单独一个文件
 *
 * 搬移需要同时知道「索引条目」和「卷容量」—— 也就是 fileindex 和 volumes
 * 两个服务的知识。把它们塞进任一方都会制造反向依赖：
 *   · 塞进 volumes → 卷服务依赖索引（单卷部署也要加载索引，耦合没必要）；
 *   · 塞进 fileindex → 索引依赖卷（读路径核心不该因为卷配置坏掉而受影响）。
 *
 * 所以编排放在这一层：**两个服务都通过 reflect 惰性取**，任一缺失就整体不启动。
 *
 * ## 触发时机
 *
 * 1. 定时（默认 5 分钟一轮）：用户上传完就去干别的，搬移在后台悄悄完成。
 * 2. 手动（管理台按钮）：需要立刻腾出热卷空间时。
 * 3. 热卷水位告急时：`pickForWrite` 会失败，此时应先搬一轮再重试写入。
 *
 * 一轮搬多少：默认最多 20 个文件，每个之间让出事件循环 ——
 * 一次搬几百个会让磁盘持续跑满，用户体验反而变差（读文件也变慢）。
 *
 * @module privhub-svc-fileindex/tiering
 */

import { existsSync } from 'node:fs'
import { msgOf } from '../../privhub-core/src/json-store'
import type { FileEntry } from './core'

/** 卷服务的最小形状（避免 import 具体类）。 */
interface VolumesLike {
  ready?: Promise<void>
  tieringEnabled?: boolean
  busy?: boolean
  stats?: (maxAgeMs?: number) => Map<string, unknown>
  list?: () => Array<{ id: string; role: string; root: string; enabled: boolean }>
  runTiering?: (
    candidates: ReadonlyArray<{ id: string; volumeId: string | null; size: number; physicalId: string; ext: string }>,
    resolveSrc: (c: { id: string; physicalId: string }) => string | null,
    commit: (id: string, newVolumeId: string) => boolean | Promise<boolean>,
  ) => Promise<{ moved: number; skipped: number; failed: Array<{ id: string; error: string }> }>
  statOf?: (v: unknown) => unknown
  get?: (id: string) => unknown
}

/** 索引服务的最小形状。 */
interface IndexLike {
  ready?: Promise<void>
  all?: () => readonly FileEntry[]
  resolvePhysical?: (e: FileEntry) => string | null
  setVolume?: (id: string, volumeId: string | null) => boolean
  commit?: () => Promise<void>
}

export interface TieringStats {
  moved: number
  skipped: number
  failed: Array<{ id: string; error: string }>
}

export interface TieringRunner {
  /** 跑一轮。并发调用会合并（第二调用直接返回上一轮结果）。 */
  runOnce: (limit?: number) => Promise<TieringStats>
  /** 启动定时器（幂等）。 */
  start: (intervalMs?: number) => void
  /** 停止定时器。 */
  stop: () => void
  /** 最近一次结果（管理台展示）。 */
  lastResult: () => TieringStats & { at: number }
}

/**
 * 造一个搬移编排器。
 *
 * @param getIndex   取索引服务（可能还没挂载好）
 * @param getVolumes 取卷服务（单卷部署时可能不存在）
 */
export function createTieringRunner(
  getIndex: () => IndexLike | null,
  getVolumes: () => VolumesLike | null,
): TieringRunner {
  let timer: NodeJS.Timeout | null = null
  let running: Promise<TieringStats> | null = null
  let last: TieringStats & { at: number } = { moved: 0, skipped: 0, failed: [], at: 0 }

  const empty = (): TieringStats => ({ moved: 0, skipped: 0, failed: [] })

  const runOnce = async (limit = 20): Promise<TieringStats> => {
    /* 并发保护：定时器和手动按钮可能同时触发。
     * 两个搬移任务同时改同一批条目会让「复制→改索引→删源」的交错变得不可推理。 */
    if (running) return running
    running = (async (): Promise<TieringStats> => {
      const fi = getIndex()
      const vols = getVolumes()
      /* 任一不可用 → 什么都不做（单卷部署的正常路径）。 */
      if (!fi || !vols) return empty()
      if (vols.tieringEnabled === false) return empty()
      if (typeof fi.all !== 'function') return empty()
      if (typeof vols.runTiering !== 'function') return empty()
      if (typeof fi.resolvePhysical !== 'function') return empty()
      if (typeof fi.setVolume !== 'function') return empty()

      try { await vols.ready } catch { /* 卷列表坏了 → 下面自然没有可搬的 */ }
      try { await fi.ready } catch { /* 索引坏了 → all() 会是空表 */ }

      /* 候选：池内、非目录、非回收站、有物理 ID、大小过门槛。
       * 回收站里的文件**不搬**：它随时可能被彻底删除，搬它是白干。 */
      let entries: readonly FileEntry[]
      try {
        entries = fi.all()
      } catch (e) {
        console.error('[tiering] 读取索引失败：' + msgOf(e))
        return empty()
      }

      const files = entries
        .filter((e) => !e.isDir && e.source === 'pool' && e.trashed !== true
          && typeof e.physicalId === 'string' && e.physicalId !== '')
        .map((e) => ({
          id: e.id,
          volumeId: e.volumeId ?? null,
          size: Number(e.size) || 0,
          physicalId: e.physicalId as string,
          ext: e.ext ?? '',
        }))

      /* 让卷服务决定搬谁（它知道冷热角色与容量）。 */
      const candidates = await pickCandidates(vols, files, limit)
      if (candidates.length === 0) return empty()

      const out = await vols.runTiering(
        candidates,
        (c) => {
          const e = entries.find((x) => x.id === c.id)
          if (!e) return null
          try {
            return fi.resolvePhysical?.(e) ?? null
          } catch {
            return null
          }
        },
        async (id, newVolumeId) => {
          const changed = fi.setVolume?.(id, newVolumeId) ?? false
          if (!changed) return false
          /* **必须落盘**才能删源：否则进程崩在落盘前，索引会指回已删的源。 */
          if (typeof fi.commit === 'function') await fi.commit()
          return true
        },
      )

      last = { ...out, at: Date.now() }
      if (out.moved > 0 || out.failed.length > 0) {
        console.log('[tiering] 本轮搬移：成功 ' + out.moved + '，跳过 ' + out.skipped
          + '，失败 ' + out.failed.length
          + (out.failed.length > 0 ? '（首个原因：' + out.failed[0]!.error + '）' : ''))
      }
      return out
    })()
    try {
      return await running
    } finally {
      running = null
    }
  }

  const start = (intervalMs = 5 * 60 * 1000): void => {
    if (timer) return
    /* 首轮延后 90 秒：让启动期的索引载入、自检、前端首屏先跑完。
     * 一上来就搬移会和启动 IO 抢带宽，表现为「刚启动时界面很卡」。 */
    setTimeout(() => {
      void runOnce().catch(() => { /* 已在内部记录 */ })
    }, 90_000).unref?.()
    timer = setInterval(() => {
      void runOnce().catch(() => { /* 已在内部记录 */ })
    }, intervalMs)
    timer.unref?.()
  }

  const stop = (): void => {
    if (timer) { clearInterval(timer); timer = null }
  }

  return { runOnce, start, stop, lastResult: () => ({ ...last }) }
}

/**
 * 挑候选：先问卷服务要「该搬谁」，拿不到就自己按角色算。
 *
 * 为什么要有回退：卷服务可能是旧版本（没有 `selectCandidates` 导出），
 * 而搬移是**优化**不是正确性 —— 挑不出来就不搬，不该因此报错。
 */
async function pickCandidates(
  vols: VolumesLike,
  files: ReadonlyArray<{ id: string; volumeId: string | null; size: number; physicalId: string; ext: string }>,
  limit: number,
): Promise<Array<{ id: string; volumeId: string | null; size: number; physicalId: string; ext: string }>> {
  const list = typeof vols.list === 'function' ? vols.list() : []
  const hotIds = new Set(list.filter((v) => v.role === 'hot').map((v) => v.id))
  if (hotIds.size === 0) return []
  /* 没有冷卷可写 → 搬了也没地方放。 */
  const coldWritable = list.filter((v) => v.role !== 'hot' && v.enabled).length > 0
  if (!coldWritable) return []

  const onHot = files.filter((f) => f.volumeId !== null && hotIds.has(f.volumeId))
  if (onHot.length === 0) return []
  /* 小的先搬：能更快腾出空间，界面上也能看到进度在推进。 */
  return [...onHot].sort((a, b) => a.size - b.size).slice(0, limit)
}
