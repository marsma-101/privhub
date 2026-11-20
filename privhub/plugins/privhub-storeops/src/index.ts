/**
 * 存储运维·执行搬移（privhub-storeops）—— 存储搬迁重构 §二（v2 修订，阶段 2）
 *
 * 职责一句话：**把文件字节从当前位置搬到目标卷，并可变换加密形态**。
 * 信息收集（扫描登记）在 privhub-svc-storeinfo；本插件只执行搬移 —— 二者解耦。
 *
 * ## 与 privhub-admin/src/relocate.ts 的关系
 *
 * 搬移循环**平移自 relocate.ts @ 7d9fe71**（issue #4 四项修复全部保留：
 * 1.1 按模式精确校验含 0 字节口径、4.2 poolCipherSample 抽样、4.4 密钥预检、
 * 4.5 源卷镜像重建）。旧路由/旧文件过渡期保留不动（设计稿 §四 兼容策略）。
 *
 * 相对 relocate 的**口径变化**（设计稿 v2）：
 *   · 候选不再限 source==='pool' —— 候选 = 全部非目录条目（含扫描登记的
 *     legacy 形状条目），按 project / includePersonal 过滤。legacy 条目搬移
 *     落位后转为 pool 形状（分配新 physicalId，走 fileindex.sharePhysical
 *     的 reindex 路径，派生表同步不会漏）；已在池里的条目保持原 physicalId。
 *   · physicalPath 快照：搬移成功后写入 finalPath（v2 新列，只展示用）。
 *   · personal 条目：includePersonal!==true 时直接排除；true 时照搬
 *     （超管全库操作，设计稿 §〇.2）。
 *   · access/personal 字段**搬移不碰**（设计稿 §六：只写不改不控）——
 *     本插件对条目的全部写入是 physicalId/source/volumeId/physicalPath，
 *     不触碰 access/personal。
 *
 * ## 安全约束（与 relocate.ts 同源，逐条遵守）
 *   1. **默认不删源**：复制 → 校验 → 改索引 → 落盘，源字节保留（可回退）。
 *      仅当显式 deleteSource=true 才在索引落盘后删源。
 *   2. **原子落位**：tmp + rename；索引在 rename 之后才改；改完立即 commit 落盘。
 *   3. **待命槽不跑**：蓝绿待命进程拒绝（避免双写同一数据根）。
 *   4. **单飞**：一个进程同时只允许一个搬移（busy）。
 *   5. **形态强制**：加密/保持密文必须走 storage.createForcedWriteStream。
 *   6. **按模式精确比对期望长度**（平移自 relocate.ts，2026-11-20）：0 字节源
 *      同样按模式算期望（decrypt=0、encrypt=36、keep=源长）。
 *
 * ## 守卫
 *
 * 全部路由 `roleAtLeast(u.role,'system_admin')`（照 privhub-svc-storeinfo 的
 * guard 逐字口径）—— 本功能是超管专属的全库备份/加解密工具。
 *
 * @module privhub-storeops
 */

import { Service, type Context } from '@deepseek-ai/cordis'
import { join, resolve } from 'node:path'
import { existsSync, createReadStream as fsCreateReadStream, createWriteStream as fsCreateWriteStream } from 'node:fs'
import { mkdir, stat, rename, unlink } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import { json, readJsonBody, roleAtLeast } from '../../privhub-core/src/index'
import type { FileIndexService } from '../../privhub-svc-fileindex/src/index'
import { newPhysicalId, type FileEntry } from '../../privhub-svc-fileindex/src/core'
/* 镜像助手直接复用 privhub-admin 的实现（只 import 不改动 —— 红线：admin 文件不动）。
 * 链接策略（硬链接优先/软链接回退/失败不阻断）与 relocate 完全同一份代码，不会漂移。 */
import { linkIntoMirror, resetMirror, MIRROR_DIRNAME, type MirrorItem } from '../../privhub-admin/src/mirror'

export const name = 'privhub-storeops'
/* privhub：路由注册（svc.route）与 requireUser / standby / onActivate 闸门。
 * audit：审计埋点。storage：三形态写流 / plainSize / isEncrypted / 密钥预检整读。
 *
 * fileindex / volumes / storeinfo **不进 inject**，运行期 reflect 探测
 * （与 storeinfo / migrate.ts 同一套模式）：服务不在时端点降级 503，不影响挂载。 */
export const inject = ['privhub', 'audit', 'storage']

declare module '@deepseek-ai/cordis' {
  interface Context {
    storeops: StoreOpsService
  }
}

const msgOf = (e: unknown): string => (e instanceof Error ? e.message : String(e))
const sleep = (ms: number): Promise<void> => new Promise((r) => { const t = setTimeout(r, ms); if (typeof t.unref === 'function') t.unref() })

/** 搬移形态：解密成明文 / 加密成密文 / 保持源形态。（平移自 relocate.ts） */
export type RelocateMode = 'decrypt' | 'encrypt' | 'keep'

/* ================= 运行期探测（照 storeinfo / migrate.ts 的 reflect 模式） ================= */

function fileindexOf(ctx: Context): FileIndexService | null {
  try {
    const fi = (ctx as unknown as { reflect?: { get: (n: string, s?: boolean) => unknown } })
      .reflect?.get('fileindex', false) as FileIndexService | undefined
    return fi && typeof fi.all === 'function' ? fi : null
  } catch { return null }
}

interface VolumesLike {
  list?: () => Array<{ id: string; label?: string; root: string; enabled?: boolean; isSystemRoot?: boolean }>
  poolDirOf?: (id: string | null) => string
  setDefault?: (id: string | null) => Promise<{ ok: true } | { ok: false; error: string }>
  defaultVolumeId?: string | null
  defaultRoot?: string
}

function volumesOf(ctx: Context): VolumesLike | null {
  try {
    const v = (ctx as unknown as { reflect?: { get: (n: string, s?: boolean) => unknown } })
      .reflect?.get('volumes', false) as VolumesLike | undefined
    return v ?? null
  } catch { return null }
}

interface StoreInfoLike {
  scanVolume?: (volumeId: string | null, opts?: { signal?: { aborted: boolean }; onProgress?: (done: number, total: number, current: string) => void }) => Promise<{ scanned: number; created: number; updated: number; failed: Array<{ path: string; error: string }> }>
  status?: (volumeId: string | null) => Promise<unknown>
}

function storeinfoOf(ctx: Context): StoreInfoLike | null {
  try {
    const s = (ctx as unknown as { reflect?: { get: (n: string, s?: boolean) => unknown } })
      .reflect?.get('storeinfo', false) as StoreInfoLike | undefined
    return s ?? null
  } catch { return null }
}

/* ================= 密钥错配预检（平移自 migrate.ts @ 7d9fe71 · issue #4 · 4.4） =================
 *
 * 为什么不用 readRange：svc-storage 的 readRange 对密文走「解头 → 解尾 tag →
 * 凑够就停」—— 部分区间读提前 break、不走 final()，GCM tag 根本不校验，
 * 测不出密钥错配。所以必须整读（readBuffer，读到文件末尾触发 final()）。
 * 为避免大文件 OOM，只挑 <1MB 的密文样本整读。
 */

export const KEY_MISMATCH_SAMPLES = 3
export const KEY_MISMATCH_SAMPLE_MAX_BYTES = 1048576

/** 错误是否为「密钥错配 / GCM 认证失败」特征。（平移自 migrate.ts） */
export function isKeyMismatchError(e: unknown): boolean {
  if (e instanceof Error && e.name === 'PrivHubKeyMismatchError') return true
  return /Unsupported state|authenticat/i.test(msgOf(e))
}

/**
 * 从队列里抽样做密钥错配预检。（平移自 migrate.ts probeKeyMismatch）
 *
 * 只挑「盘上存在且 isEncrypted 为真」的源，顺序找够 KEY_MISMATCH_SAMPLES 个
 * （或扫完为止）就停；全库没有密文样本 → 跳过预检（无样本可测，不算失败）。
 *
 * @returns null = 无密文样本/全部通过；string = 预检失败的原因
 */
export async function probeKeyMismatch(
  ctx: { storage: { isEncrypted(p: string): Promise<boolean>; readBuffer(p: string): Promise<Buffer> } },
  entries: ReadonlyArray<{ resolve: () => string | null }>,
): Promise<string | null> {
  const checked: string[] = []
  for (const e of entries) {
    if (checked.length >= KEY_MISMATCH_SAMPLES) break
    const p = e.resolve()
    if (!p) continue
    let enc: boolean
    try { enc = await ctx.storage.isEncrypted(p) } catch { continue } // 盘上读不了 → 留给逐条处理去报
    if (!enc) continue
    try {
      const st = await (await import('node:fs/promises')).stat(p)
      if (!st.isFile() || st.size >= KEY_MISMATCH_SAMPLE_MAX_BYTES) continue
      checked.push(p)
      await ctx.storage.readBuffer(p) // 整读 → 读到末尾 → final() 校验 GCM tag
    } catch (err) {
      if (isKeyMismatchError(err)) {
        return '密钥校验预检失败：' + msgOf(err)
      }
      // 非 mismatch 错误（IO/权限等）不拦截 —— 预检只管密钥这一件事
    }
  }
  return null
}

/* ================= 镜像 / 卷根助手（平移自 relocate.ts @ 7d9fe71） ================= */

/** 某卷的「原名可见镜像根」= `<卷根>/.library-view`。（平移自 relocate.ts mirrorRootOf） */
function mirrorRootOf(vols: VolumesLike | null, volumeId: string | null): string | null {
  try {
    if (!vols) return null
    let root = ''
    if (volumeId === null) {
      root = String(vols.defaultRoot ?? '')
    } else {
      const v = (vols.list?.() ?? []).find((x) => x.id === volumeId)
      root = v ? String(v.root ?? '') : ''
    }
    if (root === '') return null
    return join(resolve(root), MIRROR_DIRNAME)
  } catch { return null }
}

/**
 * 在所有卷的池目录里按 physicalId+ext 找真实字节（自愈定位）。
 * （平移自 relocate.ts locateInPools；legacy 条目 physicalId 为 null → 返回 null，
 * 它们的物理定位走 resolvePhysical 的 legacyRoot 口径，fileindex 已支持。）
 */
function locateInPools(
  vols: VolumesLike | null,
  physicalId: string | undefined | null,
  ext: string | undefined,
): { volumeId: string | null; path: string } | null {
  if (!physicalId) return null
  const name = physicalId + (ext ? '.' + ext : '')
  const candidates: Array<{ volumeId: string | null; dir: string }> = []
  if (vols && typeof vols.poolDirOf === 'function') {
    try { candidates.push({ volumeId: null, dir: vols.poolDirOf(null) }) } catch { /* 忽略 */ }
    for (const v of vols.list?.() ?? []) {
      try { candidates.push({ volumeId: v.id, dir: vols.poolDirOf(v.id) }) } catch { /* 忽略 */ }
    }
  }
  const seen = new Set<string>()
  for (const c of candidates) {
    if (seen.has(c.dir)) continue
    seen.add(c.dir)
    const p = join(c.dir, name)
    if (existsSync(p)) return { volumeId: c.volumeId, path: p }
  }
  return null
}

/**
 * 在镜像区把一批条目建成「原名 + 原目录结构」的硬链接。
 * （平移自 relocate.ts buildMirror；只对 source==='pool' 的条目建 —— 搬移落位后
 * 本轮队列条目已全部是 pool 形状。）
 */
async function buildMirror(
  fi: FileIndexService,
  mirrorRoot: string,
  only?: ReadonlyArray<FileEntry>,
): Promise<number> {
  let n = 0
  const items: MirrorItem[] = []
  const source = only && only.length > 0 ? only : fi.all()
  for (const e of source) {
    if (e.isDir) continue
    if (e.source !== 'pool') continue
    const physicalPath = fi.resolvePhysical(e)
    if (!physicalPath) continue
    items.push({ project: e.project, virtualPath: e.virtualPath, physicalPath })
  }
  for (const it of items) {
    const r = await linkIntoMirror(mirrorRoot, it)
    if (r.ok) n++
  }
  if (items.length > 0) {
    console.log('[storeops] 原名可见镜像：' + n + '/' + items.length + ' 条已建立（'
      + mirrorRoot + '，硬链接不占额外空间）')
  }
  return n
}

/* ================= 运行态 ================= */

interface RunState {
  running: boolean
  /** 本轮在干什么：纯搬移 / 扫描+建库串接的扫描段 / 搬移段。 */
  phase: 'move' | 'scan' | null
  startedAt: number
  finishedAt: number
  target: number
  done: number
  moved: number
  skipped: number
  failedCount: number
  cancelRequested: boolean
  lastPath: string
  lastError: string
  targetVolumeId: string | null
  mode: RelocateMode | null
  /** 本轮自愈的条目数（索引说在某卷、实际在另一卷，已被修正）。（平移自 relocate.ts） */
  healed?: number
  /** 本轮在镜像区建成「原名可见」链接的文件数。 */
  mirrored?: number
  /** issue #4 · 4.5：deleteSource 时为「源卷 ≠ 目标卷」的卷重建镜像的数量。 */
  srcMirrorRebuilt?: number
  /** v2：本轮候选里 personal 条目数（includePersonal=true 时它们参与搬移）。 */
  personalIncluded?: number
  /** v2：扫描+建库串接时，扫描段的登记结果。 */
  scanResult?: { scanned: number; created: number; updated: number; failed: number } | null
}

function emptyRun(): RunState {
  return {
    running: false, phase: null, startedAt: 0, finishedAt: 0, target: 0, done: 0,
    moved: 0, skipped: 0, failedCount: 0, cancelRequested: false,
    lastPath: '', lastError: '', targetVolumeId: null, mode: null,
  }
}

/* ================= 服务 ================= */

export class StoreOpsService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'storeops')
  }
}

export interface StoreOpsHooks {
  /** 审计埋点（照 storeinfo 的写法；失败静默不影响主流程）。 */
  audit: (u: { username: string }, action: string, target: string, detail?: string) => Promise<void>
}

export function registerRoutes(ctx: Context, _svc: StoreOpsService, hooks: StoreOpsHooks): void {
  const ph = ctx.privhub

  /* 激活闸门（平移自 relocate.ts，与 migrate.ts 同写法）：待命槽只登记不执行。 */
  let activated = false
  let openGate!: () => void
  const gate = new Promise<void>((r) => { openGate = r })
  const offActivate = ph.onActivate(() => { activated = true; openGate() })
  ctx.effect(() => () => offActivate())

  let run: RunState = emptyRun()
  let busy = false
  const failed: Array<{ id: string; path: string; error: string }> = []

  /** 守卫：登录 + **system_admin**（照 storeinfo 的 guard 逐字口径）+ 方法检查。 */
  const guard = (
    req: Parameters<typeof ph.requireUser>[0],
    res: Parameters<typeof json>[0],
    method: 'GET' | 'POST',
  ): { username: string } | null => {
    const u = ph.requireUser(req, res)
    if (!u) return null
    if (!roleAtLeast(u.role, 'system_admin')) {
      json(res, 403, { ok: false, error: '仅系统管理员可使用存储运维功能' })
      return null
    }
    if ((req.method ?? 'GET').toUpperCase() !== method) {
      json(res, 405, { ok: false, error: 'method not allowed' })
      return null
    }
    return { username: u.username }
  }

  /** 公共前置：待命槽拒绝 + fileindex 就绪检查。 */
  const preflight = (res: any): FileIndexService | null => {
    if (ph.standby || !activated) {
      json(res, 503, { ok: false, error: '当前进程处于蓝绿待命槽，存储搬移不可用；请在在线槽执行' })
      return null
    }
    const fi = fileindexOf(ctx)
    if (!fi) { json(res, 503, { ok: false, error: '主索引服务未就绪，存储搬移暂不可用' }); return null }
    return fi
  }

  /**
   * 候选口径（v2，与 relocate 的差异点）：不再限 source==='pool' ——
   * 全部非目录条目（含扫描登记的 legacy 形状条目）按 project / includePersonal 过滤。
   * 已在池里的条目搬移保持原 physicalId；legacy 条目落位后转 pool 形状。
   */
  const candidatesOf = (fi: FileIndexService, project: string | undefined, includePersonal: boolean): FileEntry[] =>
    fi.all().filter((e) => !e.isDir
      && (project === undefined || e.project === project)
      && (includePersonal === true || e.personal !== true))

  /**
   * 搬移循环（逐段平移自 relocate.ts @ 7d9fe71 的启动搬迁路由后台段）。
   *
   * 相对 relocate 的两处适配（其余逐段一致）：
   *   ① keep 模式「源已在目标卷 → 跳过」只对 pool 条目生效 —— legacy 条目
   *      （扫描登记的）即使源卷=目标卷也要搬（收敛进池布局），否则 scan+build
   *      的 keep 同卷搬移会一个都不动。
   *   ② 落位后：pool 条目走 setVolume；legacy 条目先经 sharePhysical 转 pool
   *      形状（分配新 physicalId，reindex 同步全部派生表），再 setVolume；
   *      最后写 physicalPath 快照 = finalPath。access/personal 一律不碰。
   */
  const runMove = async (
    fi: FileIndexService,
    vols: VolumesLike,
    queue: FileEntry[],
    opts: { targetVolumeId: string | null; mode: RelocateMode; deleteSource: boolean; setDefault: boolean; gapMs: number },
  ): Promise<void> => {
    const { targetVolumeId, mode, deleteSource, setDefault, gapMs } = opts
    const destPool = vols.poolDirOf ? vols.poolDirOf(targetVolumeId) : join(resolve(ph.dataRoot), '.pool')
    try {
      /* issue #4 · 4.4：密钥错配预检 —— 启动搬移前抽最多 3 个 <1MB 的密文样本
       * 整读触发 GCM tag 校验（readRange 部分读不校验 tag，不能用）；错配则
       * 整批不启动（moved=0），lastError 交代原因，审计记 key-mismatch-abort。 */
      {
        const samples = queue.slice(0, 50).map((e) => ({ resolve: () => fi.resolvePhysical(e) }))
        const bad = await probeKeyMismatch(ctx, samples)
        if (bad !== null) {
          run.lastError = bad
          console.error('[storeops] ' + bad + '（搬移未启动）')
          void hooks.audit({ username: 'system' }, 'storeops-move', targetVolumeId ?? '默认库根', 'key-mismatch-abort：' + bad)
          return
        }
      }
      await mkdir(destPool, { recursive: true })
      /* issue #4 · 4.5：记下每个条目搬前所在卷 —— deleteSource=true 时这些
       * 源卷的 .library-view 硬链接会指向已删字节，收尾要对它们重建镜像。 */
      const srcVols = new Set<string | null>()
      for (const e of queue) {
        if (run.cancelRequested) break
        run.lastPath = e.virtualPath
        try {
          let src = fi.resolvePhysical(e)
          /* 自愈（平移自 relocate.ts，2026-11-17 实测踩出来的）：索引与磁盘不一致时
           * 先按 physicalId 到各卷池里找一遍，找到就用它作源并修正索引。 */
          let healedVol: string | null | undefined
          if (!src || !existsSync(src)) {
            const found = locateInPools(vols, e.physicalId, e.ext)
            if (found) { src = found.path; healedVol = found.volumeId }
          }
          if (!src) { run.skipped++; continue }
          let st
          try { st = await stat(src) } catch { run.skipped++; continue }
          if (!st.isFile()) { run.skipped++; continue }
          /* 位置与索引不一致：先把索引改到真实卷（避免后续按错误路径解析）。 */
          if (healedVol !== undefined && (e.volumeId ?? null) !== healedVol) {
            if (fi.setVolume(e.id, healedVol)) await fi.commit()
            run.healed = (run.healed || 0) + 1
          }

          /* 「保持」模式且源已在目标卷 → 无需搬（形态也不变）。
           * 适配①：仅对 pool 条目生效；legacy 条目必须搬进池。 */
          const srcVol = e.volumeId ?? null
          srcVols.add(srcVol)
          if (e.source === 'pool' && mode === 'keep' && srcVol === targetVolumeId) { run.skipped++; continue }

          /* 落位物理名：pool 条目保持原 physicalId；legacy 条目分配新 ID。 */
          const targetPhysicalId = (e.source === 'pool' && typeof e.physicalId === 'string' && e.physicalId !== '')
            ? e.physicalId
            : newPhysicalId()
          const ext = e.ext ? '.' + e.ext : ''
          const finalPath = join(destPool, targetPhysicalId + ext)
          const tmpPath = finalPath + '.' + process.pid + '.relocate.tmp'

          /* 取源的明文长度（写之前）：用于搬完后按模式精确比对。 */
          const srcPlain = await ctx.storage.plainSize(src)

          /* 形态决策（平移自 relocate.ts）：
           *   decrypt → 读流自动解密成明文，强制明文写；
           *   encrypt → 读流自动解密成明文，强制密文写；
           *   keep    → 源是密文就原样字节复制，源是明文就原样复制。 */
          if (mode === 'keep') {
            await pipeline(fsCreateReadStream(src), fsCreateWriteStream(tmpPath))
          } else {
            const rs = await ctx.storage.createReadStream(src) // 透明：密文→明文，明文→直通
            const wantCipher = mode === 'encrypt'
            const { stream, done } = await ctx.storage.createForcedWriteStream(tmpPath, wantCipher)
            await pipeline(rs, stream)
            await done // 等 GCM tag 写完 / 文件 close
          }

          /* 校验（issue #4 · 1.1，平移自 relocate.ts）：按模式精确比对期望长度，
           * 形态也用 isEncrypted 复核。0 字节源单独处理：encrypt 模式下
           * createForcedWriteStream 仍会写出 PHENC1 头（36 字节，无正文），
           * 所以 0 字节源的期望长度同样按模式算（decrypt=0、encrypt=36、keep=源长），
           * 而不是「0 进 0 出」。 */
          const tmpStat = await stat(tmpPath)
          const dstSize = tmpStat.size
          const ZERO_CIPHER = 36 // 0 字节正文的 PHENC1 密文：头 20 + tag 16
          if (st.size === 0) {
            const want = mode === 'decrypt' ? 0 : mode === 'encrypt' ? ZERO_CIPHER : 0
            if (dstSize !== want) {
              throw new Error(`0 字节源校验失败：期望 ${want} 字节（${mode} 模式），实际 ${dstSize} 字节（写入异常）`)
            }
          } else if (mode === 'decrypt') {
            const tmpEnc = await ctx.storage.isEncrypted(tmpPath)
            if (tmpEnc || dstSize !== srcPlain) {
              throw new Error(`decrypt 模式校验失败：期望明文长度 ${srcPlain}，实际盘上长度 ${dstSize}${tmpEnc ? '（tmp 仍是密文形态）' : ''}`)
            }
          } else if (mode === 'encrypt') {
            const tmpEnc = await ctx.storage.isEncrypted(tmpPath)
            if (!tmpEnc || dstSize - 36 !== srcPlain) {
              throw new Error(`encrypt 模式校验失败：期望密文长度 ${srcPlain + 36}（明文 ${srcPlain} + 头 20 + tag 16），实际盘上长度 ${dstSize}${tmpEnc ? '' : '（tmp 不是密文形态）'}`)
            }
          } else { // keep：与源同形态且同盘上长度
            const [tmpEnc, srcEnc] = [await ctx.storage.isEncrypted(tmpPath), await ctx.storage.isEncrypted(src)]
            if (tmpEnc !== srcEnc || dstSize !== st.size) {
              throw new Error(`keep 模式校验失败：期望${srcEnc ? '密文' : '明文'}且盘上长度 ${st.size}，实际${tmpEnc ? '密文' : '明文'}盘上长度 ${dstSize}`)
            }
          }
          await rename(tmpPath, finalPath)

          /* 改索引指向新卷 → 立即落盘（之后才允许删源）。
           * 适配②：legacy 条目先转 pool 形状（sharePhysical 内部走 reindex，
           * byPath/byParent/byPhysical/bySha 四张派生表同步摘挂，不会漏）；
           * pool 条目 sharePhysical 同 ID 早退（no-op）。 */
          fi.sharePhysical(e.id, targetPhysicalId)
          const changed = fi.setVolume(e.id, targetVolumeId)
          if (changed) await fi.commit()

          /* v2：更新 physicalPath 快照 = finalPath。该列不参与任何派生索引键，
           * 直接改条目对象即可；落盘由上面的 markDirty（sharePhysical/setVolume）
           * 或本批收尾的 flushNow 兜底。access/personal **不碰**（§六）。 */
          const cur = fi.get(e.id)
          if (cur) cur.physicalPath = finalPath

          /* 删源（仅显式要求时）：源与目标不同路径才删，避免就地搬移误删。 */
          if (deleteSource && resolve(src) !== resolve(finalPath)) {
            await unlink(src).catch((err) => { console.warn('[storeops] 删源失败（已留孤儿，自检会回收）：' + src + ' — ' + msgOf(err)) })
          }
          run.moved++
        } catch (err) {
          run.failedCount++
          /* issue #4 · 4.4 补：单条命中密钥错配特征时，原因里点名（而不是笼统的 IO 文案）。 */
          const reason = isKeyMismatchError(err) ? '密钥校验失败（密钥错配或密文损坏）：' + msgOf(err) : msgOf(err)
          run.lastError = e.virtualPath + '：' + reason
          if (failed.length < 200) failed.push({ id: e.id, path: e.virtualPath, error: reason })
          /* 清掉可能残留的 tmp（尽力）。 */
          const ext = e.ext ? '.' + e.ext : ''
          const pid = (e.source === 'pool' && typeof e.physicalId === 'string' && e.physicalId !== '')
            ? e.physicalId : ''
          /* tmp 名含落位 ID；legacy 条目的 ID 是逐条生成的，无法在 catch 里还原 ——
           * 按 glob 口径尽力清：遍历候选 tmp（同进程 PID 后缀）。 */
          if (pid !== '') {
            await unlink(join(vols.poolDirOf ? vols.poolDirOf(run.targetVolumeId) : join(resolve(ph.dataRoot), '.pool'), pid + ext + '.' + process.pid + '.relocate.tmp')).catch(() => {})
          } else {
            try {
              const dp = vols.poolDirOf ? vols.poolDirOf(run.targetVolumeId) : join(resolve(ph.dataRoot), '.pool')
              const { readdir } = await import('node:fs/promises')
              const names = await readdir(dp).catch(() => [] as string[])
              for (const nm of names) {
                if (nm.endsWith('.' + process.pid + '.relocate.tmp')) {
                  await unlink(join(dp, nm)).catch(() => {})
                }
              }
            } catch { /* 尽力 */ }
          }
        }
        run.done++
        if (gapMs > 0) await sleep(gapMs)
      }
      /* 收尾落盘索引（含 physicalPath 快照的兜底）。 */
      try { await fi.flushNow() } catch (e) { run.lastError = '索引落盘失败：' + msgOf(e) }

      /* 建「原名可见」镜像（平移自 relocate.ts；硬链接同盘零额外空间，失败只 warn）。 */
      const mRoot = mirrorRootOf(vols, targetVolumeId)
      if (mRoot) {
        run.mirrored = await buildMirror(fi, mRoot, queue)
      }

      /* issue #4 · 4.5：deleteSource 且源卷 ≠ 目标卷时，源卷镜像逐个重建。（平移） */
      if (deleteSource) {
        const staleVols = [...srcVols].filter((v) => v !== targetVolumeId)
        let rebuilt = 0
        for (const v of staleVols) {
          const svRoot = mirrorRootOf(vols, v)
          if (!svRoot) continue
          try {
            await resetMirror(svRoot)
            await buildMirror(fi, svRoot)
            rebuilt++
          } catch (err) {
            console.warn('[storeops] 源卷镜像重建失败（不影响搬移结果）：' + svRoot + ' — ' + msgOf(err))
          }
        }
        if (rebuilt > 0 || staleVols.length > 0) run.srcMirrorRebuilt = rebuilt
      }

      /* 切默认写入卷：仅当指定了目标卷且用户要求。（平移） */
      if (setDefault && targetVolumeId !== null && vols.setDefault) {
        const r = await vols.setDefault(targetVolumeId)
        if (!r.ok) run.lastError = '搬移完成，但切换默认写入卷失败：' + r.error
      }
    } catch (e) {
      run.lastError = '搬移异常中止：' + msgOf(e)
    }
  }

  /**
   * 受理一次搬移（/move 路由与 scan+build 共用）。返回 null 表示已代为响应。
   */
  const acceptMove = async (
    u: { username: string },
    res: any,
    body: {
      targetVolumeId?: string | null; mode?: string; project?: string
      includePersonal?: boolean; deleteSource?: boolean; setDefault?: boolean; gapMs?: number
    },
    action: string,
  ): Promise<boolean> => {
    const fi = preflight(res)
    if (!fi) return false
    if (busy) { json(res, 409, { ok: false, error: '已有搬移在进行中，请稍后重试' }); return false }

    const vols = volumesOf(ctx)
    if (!vols) { json(res, 503, { ok: false, error: '卷服务未就绪，无法搬移' }); return false }

    /* 目标卷必须真实存在且启用。null/空 = 默认库根（就地换形态，不换盘）。 */
    const targetVolumeId = typeof body.targetVolumeId === 'string' && body.targetVolumeId.trim() !== ''
      ? body.targetVolumeId.trim() : null
    let targetLabel = '默认库根'
    if (targetVolumeId !== null) {
      const hit = (vols.list?.() ?? []).find((v) => v.id === targetVolumeId)
      if (!hit) { json(res, 400, { ok: false, error: '目标卷不存在：' + targetVolumeId }); return false }
      if (hit.enabled === false) { json(res, 400, { ok: false, error: '目标卷已停用，不能作为搬移目标' }); return false }
      targetLabel = hit.label || hit.root
    }

    const mode: RelocateMode = body.mode === 'encrypt' ? 'encrypt' : body.mode === 'keep' ? 'keep' : 'decrypt'
    const project = typeof body.project === 'string' && body.project.trim() !== '' ? body.project.trim() : undefined
    const includePersonal = body.includePersonal === true
    const deleteSource = body.deleteSource === true
    const setDefault = body.setDefault === true
    const gapMs = Number.isFinite(Number(body.gapMs)) ? Math.max(0, Math.min(1000, Math.floor(Number(body.gapMs)))) : 20

    const queue = candidatesOf(fi, project, includePersonal)
    if (queue.length === 0) {
      const personalPending = fi.all().filter((e) => !e.isDir && e.personal === true).length
      const hint = !includePersonal && personalPending > 0
        ? '；另有 ' + personalPending + ' 个个人空间条目未包含（includePersonal=true 可包含）'
        : ''
      json(res, 200, { ok: true, started: false, pending: 0, message: '没有可搬移的条目' + (project ? '（项目「' + project + '」）' : '') + hint })
      return false
    }

    run = {
      ...emptyRun(), running: true, phase: 'move', startedAt: Date.now(),
      target: queue.length, targetVolumeId, mode,
      personalIncluded: queue.filter((e) => e.personal === true).length,
    }
    busy = true
    void (async () => {
      await gate
      try {
        await runMove(fi, vols, queue, { targetVolumeId, mode, deleteSource, setDefault, gapMs })
      } finally {
        busy = false
        run = { ...run, running: false, finishedAt: Date.now() }
        void hooks.audit(u, action, targetLabel,
          'mode=' + mode + ' moved=' + run.moved + '/' + queue.length + ' skipped=' + run.skipped
          + ' failed=' + run.failedCount + ' deleteSource=' + deleteSource + ' setDefault=' + setDefault
          + ' personalIncluded=' + (run.personalIncluded ?? 0)
          + (run.cancelRequested ? '（已取消）' : ''))
      }
    })()

    json(res, 202, {
      ok: true, started: true, queued: queue.length, mode, targetVolumeId, targetLabel,
      deleteSource, setDefault, includePersonal, personalIncluded: run.personalIncluded ?? 0,
    })
    return true
  }

  /* ---------------- 路由：启动搬移（后台） ---------------- */

  ph.route('/privhub/api/storeops/move', async (req, res) => {
    const u = guard(req, res, 'POST')
    if (!u) return
    const body = await readJsonBody<{
      targetVolumeId?: string | null; mode?: string; project?: string; includePersonal?: boolean
      deleteSource?: boolean; setDefault?: boolean; gapMs?: number
    }>(req, res)
    if (body === null) return
    await acceptMove(u, res, body, 'storeops-move')
  }, 'storeops-move')

  /* ---------------- 路由：进度 ---------------- */

  ph.route('/privhub/api/storeops/move-status', async (req, res) => {
    const u = guard(req, res, 'GET')
    if (!u) return
    const fi = fileindexOf(ctx)
    const vols = volumesOf(ctx)
    /* 「待搬」= 按当前候选口径、还没在目标卷上的文件。（平移自 relocate-status 的
     * 2026-11-17 修法：按目标卷算差集，搬完自然归零。） */
    const allPool = fi ? candidatesOf(fi, undefined, true) : []
    const tgt = run.targetVolumeId
    const pending = fi
      ? (tgt === null
        ? allPool.filter((e) => e.source !== 'pool').length
        : allPool.filter((e) => (e.volumeId ?? null) !== tgt || e.source !== 'pool').length)
      : null
    /* 索引悬空自检（平移自 relocate-status）：只检查 source==='pool' 的条目 ——
     * legacy 条目的字节按设计就在老库/扫描位置，不是悬空。 */
    let dangling = null
    if (fi) {
      try {
        let n = 0
        for (const e of allPool) {
          if (e.source !== 'pool') continue
          const p = fi.resolvePhysical(e)
          if (!p || !existsSync(p)) n++
        }
        dangling = n
      } catch { dangling = null }
    }
    /* issue #4 · 4.2（平移自 relocate-status）：就地形态变换搬完时的可验证终点 ——
     * 非 running 时对候选抽样（前 200 条）数「盘上仍是密文」的条数。 */
    let poolCipherSample: { checked: number; cipher: number } | null = null
    if (fi && !run.running && tgt === null && allPool.length > 0) {
      const sample = allPool.slice(0, 200)
      const results = await Promise.all(sample.map(async (e) => {
        try {
          const p = fi.resolvePhysical(e)
          if (!p || !existsSync(p)) return { checked: true, cipher: false }
          return { checked: true, cipher: (await ctx.storage.isEncrypted(p)) === true }
        } catch { return { checked: true, cipher: false } }
      }))
      poolCipherSample = {
        checked: results.length,
        cipher: results.reduce((acc, r) => acc + (r.cipher ? 1 : 0), 0),
      }
    }
    json(res, 200, {
      ok: true,
      indexReady: fi !== null,
      running: run.running,
      phase: run.phase,
      target: run.target,
      done: run.done,
      moved: run.moved,
      skipped: run.skipped,
      healed: run.healed || 0,
      mirrored: run.mirrored || 0,
      srcMirrorRebuilt: run.srcMirrorRebuilt ?? 0,
      failed: run.failedCount,
      cancelRequested: run.cancelRequested,
      lastPath: run.lastPath,
      lastError: run.lastError || null,
      targetVolumeId: run.targetVolumeId,
      mode: run.mode,
      startedAt: run.startedAt || null,
      finishedAt: run.finishedAt || null,
      poolPending: pending,
      poolTotal: allPool.length,
      /* v2：personal 统计 —— 候选里的 personal 条目数 + 本轮实际包含数。 */
      personalTotal: allPool.filter((e) => e.personal === true).length,
      personalIncluded: run.personalIncluded ?? 0,
      scanResult: run.scanResult ?? null,
      poolCipherSample,
      dangling,
      defaultVolumeId: vols?.defaultVolumeId ?? null,
      dataFiles: resolve(ph.dataRoot),
      mirrorRoot: mirrorRootOf(vols, run.targetVolumeId ?? vols?.defaultVolumeId ?? null),
      poolLayoutHint: '程序用 <卷根>/.pool/<内部ID>；<卷根>/.library-view/<项目>/<原文件名> 是给你的可见入口（硬链接，不占空间）',
      failedRecent: failed.slice(-20),
    })
  }, 'storeops-move-status')

  /* ---------------- 路由：取消（协作式，平移自 relocate-cancel） ---------------- */

  ph.route('/privhub/api/storeops/move-cancel', async (req, res) => {
    const u = guard(req, res, 'POST')
    if (!u) return
    const wasRunning = run.running
    run.cancelRequested = true
    void hooks.audit(u, 'storeops-move-cancel', 'storeops', wasRunning ? '已请求取消' : '当前无运行任务')
    json(res, 200, { ok: true, wasRunning, cancelRequested: true })
  }, 'storeops-move-cancel')

  /* ---------------- 路由：扫描 + 建库（串接） ----------------
   *
   * 语义：先对指定卷做全量扫描登记（转调 storeinfo.scanVolume —— 信息收集块
   * 的公共方法，直接方法调用、不经它的 202 路由层），扫描完成后**自动触发一次
   * 搬移**（mode=keep、deleteSource=false、includePersonal=true、目标=同卷）——
   * 把扫出来的条目收敛到池布局。
   *
   * 状态机：本插件自己的 run.phase = 'scan' → 'move'，单飞由本插件的 busy 闸门
   * 统一管（扫描段与搬移段都占住 busy）。scanVolume 是幂等可重入的（storeinfo
   * 语义），与 storeinfo 自身路由的并发窗口由其「已有 pool 条目绝不翻回」语义兜底。
   * 取消：协作式 —— 扫描段经 signal 透传 cancelRequested；搬移段循环内检查。
   */

  ph.route('/privhub/api/storeops/scan+build', async (req, res) => {
    const u = guard(req, res, 'POST')
    if (!u) return
    const fi = preflight(res)
    if (!fi) return
    if (busy) { json(res, 409, { ok: false, error: '已有搬移/扫描在进行中，请稍后重试' }); return }
    const si = storeinfoOf(ctx)
    if (!si || typeof si.scanVolume !== 'function') {
      json(res, 503, { ok: false, error: '存储信息收集服务未就绪（ctx.storeinfo 不可用），扫描建库暂不可用' })
      return
    }
    const body = await readJsonBody<{ volumeId?: string | null }>(req, res)
    if (body === null) return
    const vols = volumesOf(ctx)
    if (!vols) { json(res, 503, { ok: false, error: '卷服务未就绪，无法搬移' }); return }
    const volumeId = typeof body.volumeId === 'string' && body.volumeId.trim() !== '' ? body.volumeId.trim() : null

    /* 卷存在性先验一次（与 storeinfo 路由同口径：后台跑完才报错会让人白等）。 */
    try {
      await si.scanVolume(volumeId, { signal: { aborted: true } })
    } catch (e) {
      json(res, 400, { ok: false, error: e instanceof Error ? e.message : String(e) })
      return
    }

    run = { ...emptyRun(), running: true, phase: 'scan', startedAt: Date.now(), targetVolumeId: volumeId }
    busy = true
    void (async () => {
      await gate
      try {
        /* 段 1：扫描登记（转调 storeinfo）。 */
        const scanRes = await si.scanVolume!(volumeId, {
          signal: { get aborted() { return run.cancelRequested } },
        })
        run.scanResult = {
          scanned: scanRes.scanned, created: scanRes.created,
          updated: scanRes.updated, failed: scanRes.failed.length,
        }
        void hooks.audit(u, 'storeops-scan-build', volumeId ?? '默认库根',
          'phase=scan scanned=' + scanRes.scanned + ' created=' + scanRes.created
          + ' updated=' + scanRes.updated + ' failed=' + scanRes.failed.length
          + (run.cancelRequested ? '（已取消，不再搬移）' : ''))
        if (run.cancelRequested) return // 协作式：扫描段被取消就不再搬移

        /* 段 2：自动搬移（mode=keep、不删源、含个人空间、目标=同卷）。
         * 候选在新口径下包含扫描登记的 legacy 条目；pool 条目 keep 同卷跳过 ——
         * 恰好等于「只收敛扫出来的条目进池布局」。 */
        const queue = candidatesOf(fi, undefined, true)
        run.phase = 'move'
        run.target = queue.length
        run.personalIncluded = queue.filter((e) => e.personal === true).length
        if (queue.length === 0) return
        await runMove(fi, vols, queue, {
          targetVolumeId: volumeId, mode: 'keep', deleteSource: false, setDefault: false, gapMs: 20,
        })
      } catch (e) {
        run.lastError = '扫描建库异常中止：' + msgOf(e)
      } finally {
        busy = false
        run = { ...run, running: false, finishedAt: Date.now() }
        void hooks.audit(u, 'storeops-scan-build', volumeId ?? '默认库根',
          'phase=move moved=' + run.moved + '/' + run.target + ' skipped=' + run.skipped
          + ' failed=' + run.failedCount + (run.cancelRequested ? '（已取消）' : ''))
      }
    })()

    json(res, 202, {
      ok: true, started: true, phase: 'scan', volumeId,
      note: '扫描已在后台执行；扫描完成后自动搬移（keep 模式收敛进池布局）。进度见 GET /privhub/api/storeops/move-status',
    })
  }, 'storeops-scan-build')

  /* ---------------- 路由：卷状态（转调 storeinfo.status，透传） ---------------- */

  ph.route('/privhub/api/storeops/status', async (req, res) => {
    const u = guard(req, res, 'GET')
    if (!u) return
    const si = storeinfoOf(ctx)
    if (!si || typeof si.status !== 'function') {
      json(res, 503, { ok: false, error: '存储信息收集服务未就绪（ctx.storeinfo 不可用）' })
      return
    }
    const url = new URL(req.url ?? '/', 'http://x')
    const raw = url.searchParams.get('volumeId')
    const volumeId = raw === null || raw === '' ? null : raw
    try {
      const st = await si.status(volumeId)
      json(res, 200, { ok: true, ...(st as Record<string, unknown>) })
    } catch (e) {
      json(res, 500, { ok: false, error: msgOf(e) })
    }
  }, 'storeops-status')
}

export function apply(ctx: Context): void {
  const svc = new StoreOpsService(ctx)
  ;(ctx as unknown as Record<string, unknown>).storeops = svc

  /* 审计埋点（照 storeinfo 的写法）：成功后写审计并广播；失败静默不影响主流程。 */
  const audit = async (u: { username: string }, action: string, target: string, detail?: string): Promise<void> => {
    const rec = await ctx.audit.log({ user: u.username, action, target, detail }).catch(() => null)
    if (rec) ctx.emit('audit:logged', rec)
  }

  registerRoutes(ctx, svc, { audit })
  console.log('[storeops] 存储搬移执行服务就绪（system_admin 专属）')
}
