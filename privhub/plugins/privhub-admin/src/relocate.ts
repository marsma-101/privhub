/**
 * 库搬迁（relocate）—— 把**文件字节本身**从当前库搬到另一个地址，并可选变换加密形态。
 *
 * ## 为什么需要它（与 legacy 迁移 / 分层搬移的区别）
 *
 * 主人 2026-11-17 的明确需求：老库位置在项目文件夹内部（程序与库未分离），
 * 必须把**文件**（不是索引/数据库表格）重新搬到分离的新地址；新架构为保证
 * 运行速度（nginx 直读）需要明文，所以搬迁时要能**解密**，也要能**加密**或**保持不变**。
 *
 * 三个既有能力都不覆盖这件事：
 *   · legacy 迁移（migrate.ts）：只搬 `source==='legacy'` 的外部老库条目 → 主库池；
 *     已经在池里的文件它一个都不动（pending 恒 0）。
 *   · 分层搬移（tiering）：只在热卷→冷卷之间挪，且有 1MB 门槛、目标自动选，
 *     库根（volumeId=null）的文件选不中，也不接受用户指定目标卷。
 *   · 二者都不做「按用户选择的形态重新加密/解密」。
 *
 * 本模块补上的正是：**池内全部文件 → 用户指定的目标卷 + 用户指定的形态**，
 * 搬完可把默认写入卷切到目标卷，实现「程序与库分离」。
 *
 * ## 安全约束（与 migrate.ts 同源，逐条遵守）
 *   1. **默认不删源**：复制 → 校验 → 改索引 → 落盘，源字节保留（可回退）。
 *      仅当显式 `deleteSource=true` 才在索引落盘后删源（真正的「移动」）。
 *   2. **原子落位**：tmp + rename；索引在 rename 之后才改；改完立即 commit 落盘。
 *   3. **待命槽不跑**：蓝绿待命进程拒绝（避免双写同一数据根）。
 *   4. **单飞**：一个进程同时只允许一个搬迁（busy）。
 *   5. **形态强制**：明文模式下通用写流会强制明文，故「加密/保持密文」必须走
 *      storage.createForcedWriteStream 绕过 isPlainPath —— 否则写不出密文。
 *   6. **按模式精确比对期望长度**（2026-11-20，与 migrateEntry 同口径）：搬完对 tmp
 *      按 isEncrypted 判形态，并按模式核对期望长度（decrypt: tmpSize===srcPlain；
 *      encrypt: tmpSize-36===srcPlain，密文头 20 + tag 16；keep: 同形态同盘上长度）。
 *      校验失败 throw，走 catch 记 failed 并清 tmp，源不会被删。
 *
 * @module privhub-admin/relocate
 */

import type { Context } from '@deepseek-ai/cordis'
import { join, resolve } from 'node:path'
import { existsSync, createReadStream as fsCreateReadStream, createWriteStream as fsCreateWriteStream } from 'node:fs'
import { mkdir, stat, rename, unlink } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import { json, readJsonBody } from '../../privhub-core/src/index'
import { probeKeyMismatch, isKeyMismatchError } from './migrate'
import type { FileIndexService } from '../../privhub-svc-fileindex/src/index'
import type { FileEntry } from '../../privhub-svc-fileindex/src/core'
import { linkIntoMirror, resetMirror, MIRROR_DIRNAME, type MirrorItem } from './mirror'

const msgOf = (e: unknown): string => (e instanceof Error ? e.message : String(e))
const sleep = (ms: number): Promise<void> => new Promise((r) => { const t = setTimeout(r, ms); if (typeof t.unref === 'function') t.unref() })

/** 搬迁形态：解密成明文 / 加密成密文 / 保持源形态。 */
export type RelocateMode = 'decrypt' | 'encrypt' | 'keep'

interface VolumesLike {
  list?: () => Array<{ id: string; label?: string; root: string; enabled?: boolean; isSystemRoot?: boolean }>
  poolDirOf?: (id: string | null) => string
  setDefault?: (id: string | null) => Promise<{ ok: true } | { ok: false; error: string }>
  defaultVolumeId?: string | null
  defaultRoot?: string
}

/**
 * 某卷的「原名可见镜像根」= `<卷根>/.library-view`。
 *
 * 池目录是 `<卷根>/.pool`，镜像与它并列。传 null 时用默认卷根。
 */
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

interface RunState {
  running: boolean
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
  /** 本轮自愈的条目数（索引说在某卷、实际在另一卷，已被修正）。 */
  healed?: number
  /** 本轮在镜像区建成「原名可见」链接的文件数。 */
  mirrored?: number
  /** issue #4 · 4.5：deleteSource 时为「源卷 ≠ 目标卷」的卷重建镜像的数量。 */
  srcMirrorRebuilt?: number
}

function emptyRun(): RunState {
  return {
    running: false, startedAt: 0, finishedAt: 0, target: 0, done: 0,
    moved: 0, skipped: 0, failedCount: 0, cancelRequested: false,
    lastPath: '', lastError: '', targetVolumeId: null, mode: null,
  }
}

/**
 * 在镜像区把一批条目建成「原名 + 原目录结构」的硬链接。
 *
 * 主人 2026-11-17 的核心诉求：「别把文件名改掉，我要能找到目标文件」。
 * `.pool/<ID>.<ext>` 是程序的事；`<卷根>/.library-view/<项目>/<原路径>` 是给人的。
 *
 * @returns 成功建立的链接数
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
    console.log('[relocate] 原名可见镜像：' + n + '/' + items.length + ' 条已建立（'
      + mirrorRoot + '，硬链接不占额外空间）')
  }
  return n
}

export interface RelocateHooks {
  audit: (u: { username: string }, action: string, target: string, detail?: string) => Promise<void>
}

/**
 * 在所有卷的池目录里按 physicalId+ext 找真实字节。
 *
 * 用途：索引的 volumeId 可能因搬迁中断/旧 bug 与磁盘不一致（页面能看见、打开 404）。
 * 找到即返回真实「卷 + 绝对路径」，让调用方优先用它并修正索引。
 *
 * @returns { volumeId, path } 或 null（真的哪都没有，条目该被摘除）
 */
function locateInPools(
  vols: VolumesLike | null,
  physicalId: string | undefined,
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

export function registerRelocation(ctx: Context, hooks: RelocateHooks): void {
  const svc = ctx.privhub

  let run: RunState = emptyRun()
  let busy = false
  const failed: Array<{ id: string; path: string; error: string }> = []

  /* 激活闸门（与 migrate.ts 同写法）：待命槽只登记不执行。 */
  let activated = false
  let openGate!: () => void
  const gate = new Promise<void>((r) => { openGate = r })
  const offActivate = ctx.privhub.onActivate(() => { activated = true; openGate() })
  ctx.effect(() => () => offActivate())

  const reflect = (name: string): unknown => {
    try {
      return (ctx as unknown as { reflect?: { get: (n: string, s?: boolean) => unknown } }).reflect?.get(name, false)
    } catch { return undefined }
  }
  const fileindexOf = (): FileIndexService | null => {
    const fi = reflect('fileindex') as FileIndexService | undefined
    return fi && typeof fi.all === 'function' ? fi : null
  }
  const volumesOf = (): VolumesLike | null => {
    const v = reflect('volumes') as VolumesLike | undefined
    return v && typeof v.list === 'function' ? v : null
  }

  const guard = (req: any, res: any, method: 'GET' | 'POST'): { username: string } | null => {
    const u = svc.requireUser(req, res)
    if (!u) return null
    if (!ctx.cap.can(u, 'admin.storage', 'write')) { json(res, 403, { ok: false, error: '仅管理员' }); return null }
    if ((req.method ?? 'GET').toUpperCase() !== method) { json(res, 405, { ok: false, error: 'method not allowed' }); return null }
    return { username: u.username }
  }

  const preflight = (res: any): FileIndexService | null => {
    if (svc.standby || !activated) {
      json(res, 503, { ok: false, error: '当前进程处于蓝绿待命槽，库搬迁不可用；请在在线槽执行' })
      return null
    }
    const fi = fileindexOf()
    if (!fi) { json(res, 503, { ok: false, error: '主索引服务未就绪，库搬迁暂不可用' }); return null }
    return fi
  }

  /** 候选：池内、非目录、有物理 ID 的全部文件（不限大小 —— 搬迁不是分层，小文件也要搬）。 */
  const candidatesOf = (fi: FileIndexService, project?: string): FileEntry[] =>
    fi.all().filter((e) => !e.isDir && e.source === 'pool'
      && typeof e.physicalId === 'string' && e.physicalId !== ''
      && (project === undefined || e.project === project))

  /* ---------------- 路由：启动搬迁（后台） ---------------- */

  ctx.privhub.route('/privhub/api/storage/relocate', async (req, res) => {
    const u = guard(req, res, 'POST')
    if (!u) return
    const fi = preflight(res)
    if (!fi) return
    if (busy) return json(res, 409, { ok: false, error: '已有搬迁在进行中，请稍后重试' })

    const body = await readJsonBody<{
      targetVolumeId?: string | null; mode?: string; project?: string
      deleteSource?: boolean; setDefault?: boolean; gapMs?: number
    }>(req, res)
    if (body === null) return

    const vols = volumesOf()
    if (!vols) return json(res, 503, { ok: false, error: '卷服务未就绪，无法搬迁' })

    /* 目标卷必须真实存在且启用。null/空 = 默认库根（就地换形态，不换盘）。 */
    const targetVolumeId = typeof body.targetVolumeId === 'string' && body.targetVolumeId.trim() !== ''
      ? body.targetVolumeId.trim() : null
    let targetLabel = '默认库根'
    if (targetVolumeId !== null) {
      const hit = (vols.list?.() ?? []).find((v) => v.id === targetVolumeId)
      if (!hit) return json(res, 400, { ok: false, error: '目标卷不存在：' + targetVolumeId })
      if (hit.enabled === false) return json(res, 400, { ok: false, error: '目标卷已停用，不能作为搬迁目标' })
      targetLabel = hit.label || hit.root
    }

    const mode: RelocateMode = body.mode === 'encrypt' ? 'encrypt' : body.mode === 'keep' ? 'keep' : 'decrypt'
    const project = typeof body.project === 'string' && body.project.trim() !== '' ? body.project.trim() : undefined
    const deleteSource = body.deleteSource === true
    const setDefault = body.setDefault === true
    const gapMs = Number.isFinite(Number(body.gapMs)) ? Math.max(0, Math.min(1000, Math.floor(Number(body.gapMs)))) : 20

    const queue = candidatesOf(fi, project)
    if (queue.length === 0) {
      /* 缺陷 2.2：使用端文件可能全在老布局（source==='legacy'），此时池内候选为 0
       * 属于正常状态而非无活可干 —— 空转提示必须给出可行动的引导，而不是让用户以为搬迁坏了。 */
      const legacyPending = fi.all().filter((e) => !e.isDir && e.source === 'legacy').length
      if (legacyPending > 0) {
        return json(res, 200, {
          ok: true, started: false, pending: 0, legacyPending,
          message: '检测到 ' + legacyPending + ' 个文件仍在外部老库布局，请先在『搬迁与整理』页底部的『老库迁移』执行 扫描 → 搬运（自动解密入池），完成后再回来做库搬迁',
        })
      }
      return json(res, 200, { ok: true, started: false, pending: 0, message: '没有可搬迁的池内文件' + (project ? '（项目「' + project + '」）' : '') })
    }

    const destPool = vols.poolDirOf ? vols.poolDirOf(targetVolumeId) : join(resolve(svc.dataRoot), '.pool')

    run = { ...emptyRun(), running: true, startedAt: Date.now(), target: queue.length, targetVolumeId, mode }
    busy = true
    void (async () => {
      await gate
      try {
        /* issue #4 · 4.4：密钥错配预检 —— 启动搬迁前抽最多 3 个 <1MB 的密文样本
         * 整读触发 GCM tag 校验（readRange 部分读不校验 tag，不能用）；错配则
         * 整批不启动（moved=0），lastError 交代原因，审计记 key-mismatch-abort。 */
        {
          const samples = queue.slice(0, 50).map((e) => ({ resolve: () => fi.resolvePhysical(e) }))
          const bad = await probeKeyMismatch(ctx, samples)
          if (bad !== null) {
            run.lastError = bad
            console.error('[relocate] ' + bad + '（搬迁未启动）')
            void hooks.audit(u, 'storage-relocate', targetLabel, 'key-mismatch-abort：' + bad)
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
            /* 自愈（2026-11-17 实测踩出来的）：搬迁被中断/旧版本 bug 会留下
             * 「索引说字节在某卷，实际字节在另一卷」的条目 —— 表现为页面看得见、
             * 打开却 404。这里在搬之前先按 physicalId 到各卷池里找一遍：
             * 找到真实字节就用它作源，并顺手把索引的 volumeId 修正过来。
             * 这样一次搬迁就能把历史悬空一并收敛，而不是把错误原样传下去。 */
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

            /* 「保持」模式且源已在目标卷 → 无需搬（形态也不变）。 */
            const srcVol = e.volumeId ?? null
            srcVols.add(srcVol)
            if (mode === 'keep' && srcVol === targetVolumeId) { run.skipped++; continue }

            const ext = e.ext ? '.' + e.ext : ''
            const finalPath = join(destPool, e.physicalId + ext)
            const tmpPath = finalPath + '.' + process.pid + '.relocate.tmp'

            /* 取源的明文长度（写之前）：用于搬完后按模式精确比对。 */
            const srcPlain = await ctx.storage.plainSize(src)

            /* 形态决策：
             *   decrypt → 读流自动解密成明文，强制明文写；
             *   encrypt → 读流自动解密成明文，强制密文写；
             *   keep    → 源是密文就原样字节复制（仍密文），源是明文就原样复制（仍明文）。 */
            if (mode === 'keep') {
              await pipeline(fsCreateReadStream(src), fsCreateWriteStream(tmpPath))
            } else {
              const rs = await ctx.storage.createReadStream(src) // 透明：密文→明文，明文→直通
              const wantCipher = mode === 'encrypt'
              const { stream, done } = await ctx.storage.createForcedWriteStream(tmpPath, wantCipher)
              await pipeline(rs, stream)
              await done // 等 GCM tag 写完 / 文件 close
            }

            /* 校验（2026-11-20，与 migrateEntry 同口径）：按模式精确比对期望长度，
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

            /* 改索引指向新卷 → 立即落盘（之后才允许删源）。 */
            const changed = fi.setVolume(e.id, targetVolumeId)
            if (changed) await fi.commit()

            /* 删源（仅显式要求时）：源与目标不同路径才删，避免就地搬迁误删。 */
            if (deleteSource && resolve(src) !== resolve(finalPath)) {
              await unlink(src).catch((err) => { console.warn('[relocate] 删源失败（已留孤儿，自检会回收）：' + src + ' — ' + msgOf(err)) })
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
            await unlink(join(destPool, e.physicalId + ext + '.' + process.pid + '.relocate.tmp')).catch(() => {})
          }
          run.done++
          if (gapMs > 0) await sleep(gapMs)
        }
        /* 收尾落盘索引。 */
        try { await fi.flushNow() } catch (e) { run.lastError = '索引落盘失败：' + msgOf(e) }

        /* 建「原名可见」镜像（2026-11-17 主人反馈：搬到盘上一堆 ID 找不到文件）。
         * 用硬链接，同盘零额外空间；失败只 warn，不影响搬迁结果。 */
        const mRoot = mirrorRootOf(vols, targetVolumeId)
        if (mRoot) {
          run.mirrored = await buildMirror(fi, mRoot, queue)
        }

        /* issue #4 · 4.5：deleteSource 且源卷 ≠ 目标卷时，源卷的 .library-view
         * 硬链接已指向被删的源字节（死链）—— 与 mirror-rebuild 路由同口径
         * （resetMirror + buildMirror）逐个重建。失败只 warn，不影响搬迁结果。 */
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
              console.warn('[relocate] 源卷镜像重建失败（不影响搬迁结果）：' + svRoot + ' — ' + msgOf(err))
            }
          }
          if (rebuilt > 0 || staleVols.length > 0) run.srcMirrorRebuilt = rebuilt
        }

        /* 切默认写入卷（实现程序/库分离）：仅当指定了目标卷且用户要求。 */
        if (setDefault && targetVolumeId !== null && vols.setDefault) {
          const r = await vols.setDefault(targetVolumeId)
          if (!r.ok) run.lastError = '搬迁完成，但切换默认写入卷失败：' + r.error
        }
      } catch (e) {
        run.lastError = '搬迁异常中止：' + msgOf(e)
      } finally {
        busy = false
        run = { ...run, running: false, finishedAt: Date.now() }
        void hooks.audit(u, 'storage-relocate', targetLabel,
          'mode=' + mode + ' moved=' + run.moved + '/' + queue.length + ' skipped=' + run.skipped
          + ' failed=' + run.failedCount + ' deleteSource=' + deleteSource + ' setDefault=' + setDefault
          + (run.cancelRequested ? '（已取消）' : ''))
      }
    })()

    json(res, 202, {
      ok: true, started: true, queued: queue.length, mode, targetVolumeId, targetLabel,
      deleteSource, setDefault,
    })
  }, 'storage-relocate')

  /* ---------------- 路由：重建「原名可见」镜像（不搬字节） ---------------- */

  ctx.privhub.route('/privhub/api/storage/mirror-rebuild', async (req, res) => {
    const u = guard(req, res, 'POST')
    if (!u) return
    const fi = preflight(res)
    if (!fi) return
    const vols = volumesOf()
    const body = await readJsonBody<{ volumeId?: string | null }>(req, res)
    if (body === null) return
    const volumeId = typeof body.volumeId === 'string' && body.volumeId.trim() !== '' ? body.volumeId.trim() : null
    const mRoot = mirrorRootOf(vols, volumeId)
    if (!mRoot) return json(res, 400, { ok: false, error: '解析不到该卷的根目录，无法建立镜像' })
    /* 先清空再重建：镜像可以随时丢弃重建，这样改名/删除的残留不会留下死链。 */
    await resetMirror(mRoot)
    const n = await buildMirror(fi, mRoot)
    void hooks.audit(u, 'storage-mirror-rebuild', volumeId ?? 'default', 'linked=' + n)
    json(res, 200, {
      ok: true, linked: n, mirrorRoot: mRoot,
      message: '已按原文件名/原目录结构建立 ' + n + ' 个链接（硬链接，不占额外空间）',
    })
  }, 'storage-mirror-rebuild')

  /* ---------------- 路由：进度 ---------------- */

  ctx.privhub.route('/privhub/api/storage/relocate-status', async (req, res) => {
    const u = guard(req, res, 'GET')
    if (!u) return
    const fi = fileindexOf()
    const vols = volumesOf()
    /* 「待搬」= 还没在目标卷上的文件（不是池内文件总数）。
     * 2026-11-17 修：原先用 candidatesOf(fi).length（全部候选），搬完后仍显示 198，
     * 用户以为没搬成功。现在按目标卷算差集，搬完自然归零。 */
    const allPool = fi ? candidatesOf(fi) : []
    const tgt = run.targetVolumeId
    const pending = fi
      ? (tgt === null ? allPool.length : allPool.filter((e) => (e.volumeId ?? null) !== tgt).length)
      : null
    /* 索引悬空自检（搬迁中断留下的不一致）：条目指向的物理文件已不在。
     *
     * 口径修正（2026-11-17）：只检查 `source==='pool'` 的条目。
     * legacy 条目的字节按设计就在老库目录里（不在池里），拿池路径去 existsSync
     * 必然 false —— 那是**正常状态**，不是悬空。早期版本把二者混在一起统计，
     * 于是「3 个从未进池的老布局文件」被误报成索引损坏。 */
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
    /* issue #4 · 4.2：就地形态变换（targetVolumeId=null）搬完时 pending 仍是池内总数
     * —— 索引不记录每条落盘形态，没法按形态算差集，「解密完成」没有可验证终点。
     * 修法（抽样统计，最小改动）：非 running 时对池内条目抽样（前 200 条），
     * 逐条 resolvePhysical + isEncrypted 数「盘上仍是密文」的条数，下发
     * poolCipherSample: { checked, cipher }。前端摘要据此给出可验证文案。 */
    let poolCipherSample: { checked: number; cipher: number } | null = null
    if (fi && !run.running && tgt === null && allPool.length > 0) {
      const sample = allPool.slice(0, 200)
      const results = await Promise.all(sample.map(async (e) => {
        try {
          const p = fi.resolvePhysical(e)
          if (!p || !existsSync(p)) return { checked: true, cipher: false } // 解析失败/不存在计入 checked 不算 cipher
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
      target: run.target,
      done: run.done,
      moved: run.moved,
      skipped: run.skipped,
      healed: run.healed || 0,
      mirrored: run.mirrored || 0,
      /* issue #4 · 4.5：deleteSource 时重建了几个「源卷 ≠ 目标卷」的镜像（0/undefined = 无需重建）。 */
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
      /* issue #4 · 4.2：就地形态变换的抽样统计（非 running 且 targetVolumeId=null 才算）。
       * cipher=0 表示抽样全部明文 —— 「解密完成」的可验证终点。 */
      poolCipherSample,
      dangling,
      defaultVolumeId: vols?.defaultVolumeId ?? null,
      dataFiles: resolve(svc.dataRoot),
      /* 「原名可见」镜像位置：给人看的目录结构在这里（硬链接，不占额外空间）。 */
      mirrorRoot: mirrorRootOf(vols, run.targetVolumeId ?? vols?.defaultVolumeId ?? null),
      poolLayoutHint: '程序用 <卷根>/.pool/<内部ID>；<卷根>/.library-view/<项目>/<原文件名> 是给你的可见入口（硬链接，不占空间）',
      failedRecent: failed.slice(-20),
    })
  }, 'storage-relocate-status')

  /* ---------------- 路由：取消 ---------------- */

  ctx.privhub.route('/privhub/api/storage/relocate-cancel', async (req, res) => {
    const u = guard(req, res, 'POST')
    if (!u) return
    const wasRunning = run.running
    run.cancelRequested = true
    void hooks.audit(u, 'storage-relocate-cancel', 'relocate', wasRunning ? '已请求取消' : '当前无运行任务')
    json(res, 200, { ok: true, wasRunning, cancelRequested: true })
  }, 'storage-relocate-cancel')
}
