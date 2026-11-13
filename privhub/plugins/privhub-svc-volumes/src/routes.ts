/**
 * 存储卷的管理接口（管理员专用）。
 *
 * 路由前缀 `/privhub/api/volumes*`。全部要求 admin：
 * 卷是**物理位置**，改它等于改数据落在哪块盘，普通用户不该碰。
 *
 * ## 为什么每个写操作都返回完整列表
 *
 * 管理台每次操作后都要重新渲染「容量条 + 文件数 + 可写状态」。
 * 如果只返回 `{ok:true}`，前端必须再发一次 list —— 两次往返之间
 * 状态可能已经变了（另一次操作、搬移在跑），界面就会闪一下再跳回来。
 * 一次返回全量视图，前端直接替换，没有中间态。
 *
 * @module privhub-svc-volumes/routes
 */

import { existsSync } from 'node:fs'
import { json, readJsonBody } from '../../privhub-core/src/index'
import { msgOf } from '../../privhub-core/src/json-store'
import type { VolumeService } from './index'
import type { VolumeStat } from './volumes-core'

/** 索引侧能给卷服务的最小能力（避免卷服务反向依赖 fileindex）。 */
interface IndexLike {
  all?: () => ReadonlyArray<{ isDir?: boolean; volumeId?: string | null; size?: number }>
}

/**
 * 从索引算「每个卷上有多少文件 / 多少字节」。
 *
 * 为什么要传进来而不是让卷服务自己算：卷服务不依赖 fileindex（单卷部署里
 * fileindex 完全不知道 volumes 存在）。这里由路由层把两边接起来。
 */
function countersFrom(fi: IndexLike | null): (volumeId: string | null) => { files: number; bytes: number } {
  if (!fi || typeof fi.all !== 'function') {
    return () => ({ files: 0, bytes: 0 })
  }
  let entries: ReadonlyArray<{ isDir?: boolean; volumeId?: string | null; size?: number }>
  try {
    entries = fi.all()
  } catch {
    return () => ({ files: 0, bytes: 0 })
  }
  /* 一次遍历算全部卷，避免每个卷各扫一遍索引（卷多了会变成 O(n·m)）。 */
  const acc = new Map<string, { files: number; bytes: number }>()
  for (const e of entries) {
    if (e.isDir) continue
    const key = e.volumeId ?? ''
    const cur = acc.get(key) ?? { files: 0, bytes: 0 }
    cur.files++
    cur.bytes += Number(e.size) || 0
    acc.set(key, cur)
  }
  return (volumeId: string | null) => acc.get(volumeId ?? '') ?? { files: 0, bytes: 0 }
}

/** core（privhub）实例的最小形状：只声明本文件用到的成员。 */
interface CoreLike {
  route: (path: string, handler: (req: never, res: never) => unknown, label?: string) => void
  requireUser: (req: never, res: never) => { role?: string; username?: string } | null
}

export function registerVolumeRoutes(
  ctx: unknown,
  svc: VolumeService,
  getIndex: () => IndexLike | null,
): void {
  /* **不能写 `ctx.privhub`**：cordis 的 ctx 是 Proxy，只允许访问 `inject` 里声明过的
   * 键，未声明时直接抛 `cannot get property "privhub" without inject` ——
   * 哪怕这个服务明明已经存在（`ctx.reflect.get` 能拿到）。
   *
   * 所以这里全程用 reflect 取到的**实例**，不经过 ctx 的属性访问。
   * 这也是本插件不敢 `inject: ['privhub']` 的原因（会推迟整个 apply，
   * 让 fileindex 拿不到卷服务，见 index.ts 的 inject 注释）。 */
  const core = (ctx as { reflect?: { get?: (k: string, d?: unknown) => unknown } })
    .reflect?.get?.('privhub', false) as CoreLike | null
  if (!core || typeof core.route !== 'function') {
    console.error('[volumes] 未能拿到 privhub 实例，存储卷接口不可用（装配顺序异常）')
    return
  }
  const route = core.route.bind(core)

  /** 统一的「管理员准入」前置。返回 false = 已写响应，调用方直接 return。 */
  const adminOnly = (req: unknown, res: unknown): boolean => {
    const u = core.requireUser(req as never, res as never)
    if (!u) return false
    if (u.role !== 'admin') {
      json(res as never, 403, { ok: false, error: '仅管理员可管理存储卷' })
      return false
    }
    return true
  }

  /** 拼一个完整的列表响应（所有写操作都复用它）。 */
  const listPayload = (): Record<string, unknown> => {
    const fi = getIndex()
    const views = svc.views(countersFrom(fi))
    return {
      ok: true,
      volumes: views,
      defaultVolumeId: svc.defaultVolumeId,
      tieringEnabled: svc.tieringEnabled,
      /* 默认库根（`volumeId=null` 的条目落这里）。界面要单独显示它，
       * 因为用户需要知道「没挂卷时数据在哪」。 */
      defaultRoot: {
        path: svc.defaultRoot,
        stat: svc.defaultRootStat(),
        ...countersFrom(fi)(null),
        exists: existsSync(svc.defaultRoot),
      },
      busy: svc.busy,
    }
  }

  /* ---------- 列表 ---------- */
  route('/privhub/api/volumes/list', async (req: any, res: any) => {
    if (!adminOnly(req, res)) return
    try {
      json(res, 200, listPayload())
    } catch (e) {
      json(res, 500, { ok: false, error: '读取存储卷失败：' + msgOf(e) })
    }
  }, 'volumes-list')

  /* ---------- 挂载新卷 ---------- */
  route('/privhub/api/volumes/add', async (req: any, res: any) => {
    if (!adminOnly(req, res)) return
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    const body = await readJsonBody<{
      root?: string; label?: string; role?: string; highWatermark?: number; note?: string
    }>(req, res)
    if (body === null) return
    try {
      const out = await svc.add({
        root: String(body.root ?? ''),
        label: body.label,
        role: body.role as 'hot' | 'cold' | 'any' | undefined,
        highWatermark: body.highWatermark,
        note: body.note,
      })
      if (!out.ok) return json(res, 400, { ok: false, error: out.error })
      json(res, 200, { ...listPayload(), volume: out.volume })
    } catch (e) {
      json(res, 500, { ok: false, error: '挂载失败：' + msgOf(e) })
    }
  }, 'volumes-add')

  /* ---------- 改卷属性 ---------- */
  route('/privhub/api/volumes/update', async (req: any, res: any) => {
    if (!adminOnly(req, res)) return
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    const body = await readJsonBody<{
      id?: string; label?: string; role?: string; highWatermark?: number; enabled?: boolean; note?: string
    }>(req, res)
    if (body === null) return
    const id = String(body.id ?? '').trim()
    if (id === '') return json(res, 400, { ok: false, error: '缺少 id' })
    try {
      const out = await svc.update(id, {
        label: body.label,
        role: body.role as 'hot' | 'cold' | 'any' | undefined,
        highWatermark: body.highWatermark,
        enabled: body.enabled,
        note: body.note,
      })
      if (!out.ok) return json(res, 400, { ok: false, error: out.error })
      json(res, 200, listPayload())
    } catch (e) {
      json(res, 500, { ok: false, error: '更新失败：' + msgOf(e) })
    }
  }, 'volumes-update')

  /* ---------- 卸载卷 ---------- */
  route('/privhub/api/volumes/remove', async (req: any, res: any) => {
    if (!adminOnly(req, res)) return
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    const body = await readJsonBody<{ id?: string; force?: boolean }>(req, res)
    if (body === null) return
    const id = String(body.id ?? '').trim()
    if (id === '') return json(res, 400, { ok: false, error: '缺少 id' })
    try {
      const count = countersFrom(getIndex())(id).files
      const out = await svc.remove(id, count, body.force === true)
      if (!out.ok) return json(res, 400, { ok: false, error: out.error })
      json(res, 200, listPayload())
    } catch (e) {
      json(res, 500, { ok: false, error: '卸载失败：' + msgOf(e) })
    }
  }, 'volumes-remove')

  /* ---------- 设默认写入卷 / 开关分层 ---------- */
  route('/privhub/api/volumes/settings', async (req: any, res: any) => {
    if (!adminOnly(req, res)) return
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    const body = await readJsonBody<{ defaultVolumeId?: string | null; tieringEnabled?: boolean }>(req, res)
    if (body === null) return
    try {
      if (body.defaultVolumeId !== undefined) {
        const out = await svc.setDefault(body.defaultVolumeId === null ? null : String(body.defaultVolumeId))
        if (!out.ok) return json(res, 400, { ok: false, error: out.error })
      }
      if (typeof body.tieringEnabled === 'boolean') await svc.setTiering(body.tieringEnabled)
      json(res, 200, listPayload())
    } catch (e) {
      json(res, 500, { ok: false, error: '保存设置失败：' + msgOf(e) })
    }
  }, 'volumes-settings')

  /* ---------- 探测一个候选路径（挂载前的「试一下」） ---------- */
  route('/privhub/api/volumes/probe', async (req: any, res: any) => {
    if (!adminOnly(req, res)) return
    try {
      const u = new URL(String(req.url ?? ''), 'http://x')
      const p = String(u.searchParams.get('path') ?? '').trim()
      const stat: VolumeStat = p === ''
        ? { online: false, total: 0, free: 0, used: 0, usedPercent: 0, error: '缺少 path' }
        : svc.statOf({ id: '', label: '', root: p, role: 'any', highWatermark: 10, enabled: true, createdAt: 0 })
      json(res, 200, { ok: true, path: p, stat, exists: p !== '' && existsSync(p) })
    } catch (e) {
      json(res, 500, { ok: false, error: '探测失败：' + msgOf(e) })
    }
  }, 'volumes-probe')

  /* ---------- 手动触发一轮搬移 ---------- */
  route('/privhub/api/volumes/tiering-run', async (req: any, res: any) => {
    if (!adminOnly(req, res)) return
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    try {
      /* 真正的搬移逻辑在 fileindex 侧（它持有索引与条目），这里只做触发。
       * 拿不到就明确报错 —— 不能让按钮点了没反应。
       * 用 core 实例（reflect 取的），不写 ctx.privhub（见本函数开头注释）。 */
      const runner = (core as unknown as { runTieringNow?: () => Promise<unknown> }).runTieringNow
      if (typeof runner !== 'function') {
        return json(res, 501, { ok: false, error: '搬移任务未装配（索引不可用）' })
      }
      const out = await runner()
      json(res, 200, { ok: true, result: out, ...listPayload() })
    } catch (e) {
      json(res, 500, { ok: false, error: '搬移失败：' + msgOf(e) })
    }
  }, 'volumes-tiering-run')
}
