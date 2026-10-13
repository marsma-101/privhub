/**
 * 私域枢纽上传查重 Service（privhub-svc-dup）—— Q6 / §3.3「上传期重复提示」
 *
 * 以 cordis Service 形式暴露 `ctx.dup`：把每个（已上传过的）文件的指纹记进侧车索引
 * `data/dup-index.json`，于是**同一份文件再传一次**时能当场查到"与 X 内容相同"。
 *
 * ## 只提示，不落盘（这是刻意的，别顺手加物理复用）
 *
 * 另一条路是 nowen 那种「复用物理密文 + 引用计数」：命中就把第二份元数据指到同一段
 * 密文，删除靠引用计数、最后一个引用消失才 unlink。PrivHub 是**加密存储**，且
 * `isEncrypted` 的 size 记账依赖文件长度 —— 两处引用同一份密文会同时打乱记账与
 * 回收站语义，方案 §3.3 把它列为"风险不低、待 Q6 拍板"。所以本批**只回提示**：
 * 两份文件各自独立落盘、各自可删，用户自己决定留哪份。
 *
 * ## 索引是派生数据
 *
 * 丢了重建即可（下次上传/改名时会重新登记），所以：读取用严格读取（D4：损坏 →
 * 隔离存证 + 拒写，绝不覆盖），但**绝不因为索引出问题而挡住任何上传** —— 上传路径
 * 里对它的调用全部 catch 掉，失败就当"没查到重复"。
 *
 * ## 谁往里写
 *
 * - **上传路由**（privhub-files）在写完文件后直接 `register`（指纹是流式算的，不重读盘）；
 * - `file:changed` 事件：renamed/moved → 条目跟着走；deleted/purged → 摘掉
 *   （别让提示指向一个已经进回收站的路径）。
 *
 * 编辑器保存产生的文件**不进索引**（那需要重读盘，且本功能的口径就是"上传期"）。
 * 这类文件要能被后续上传命中，得先被上传一次；这是本版的已知边界。
 *
 * @module privhub-svc-dup
 */

import { join, resolve } from 'node:path'
import { Service } from '@deepseek-ai/cordis'
import type { Context } from '@deepseek-ai/cordis'
import { readJsonStore, assertStoreWritable, msgOf } from '../../privhub-core/src/json-store'
import {
  STORE_FILE, STORE_VERSION, MAX_ENTRIES, NEAR_THRESHOLD, NEAR_HITS_CAP,
  fingerprint as fpOf, sigSimilarity, bandKeys, kFile, kRaw, kNorm, kBand,
  normalizeStore, type DupEntry, type Fingerprint, type DupStore,
} from './core'

export interface Config {
  file: string
  /** 近似阈值（签名一致率）；不传用 {@link NEAR_THRESHOLD}。 */
  nearThreshold?: number
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    dup: DupService
  }
}

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()

/** 落盘节流：登记是高频动作（每次上传/改名），不能一文件一次写。 */
const SAVE_DEBOUNCE_MS = 400

/** 查重命中：内容完全相同的一份既有文件。 */
export interface DupHit { path: string; size: number }
/** 近似命中：与本次上传高度相似（≥阈值）的一份既有文件。 */
export interface NearHit { path: string; score: number }
export interface DupCheckResult { exact: DupHit[]; near: NearHit[] }

export interface DupStats {
  entries: number
  projects: number
  /** 索引读取时是否损坏过（损坏时仍工作：重建即可）。 */
  corrupt: boolean
}

export class DupService extends Service {
  private readonly file: string
  private readonly threshold: number
  private readonly store: DupStore = { version: STORE_VERSION, entries: [] }
  private readonly byFile = new Map<string, DupEntry>()
  private readonly byRaw = new Map<string, string[]>()
  private readonly byNorm = new Map<string, string[]>()
  private readonly byBand = new Map<string, string[]>()
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private dirty = false
  private corrupt = false
  /** 载入完成信号（消费方 await 它；不 await 也安全，只是可能少看几个已有指纹）。 */
  readonly ready: Promise<void>

  constructor(ctx: Context, private readonly config: Config) {
    super(ctx, 'dup')
    const f = (config?.file ?? '').trim()
    this.file = f === '' ? join(rootDir, 'data', STORE_FILE) : resolve(f)
    const t = Number(config?.nearThreshold)
    this.threshold = Number.isFinite(t) && t > 0 && t <= 1 ? t : NEAR_THRESHOLD
    this.ready = this.load().catch(() => { /* 已在 load 内记录；索引不是关键路径 */ })
  }

  /* ---------------- 载入 / 落盘 ---------------- */

  private async load(): Promise<void> {
    try {
      const raw = await readJsonStore<unknown>(
        this.ctx.storage, this.file, null,
        (v) => v === null || (typeof v === 'object' && Array.isArray((v as { entries?: unknown }).entries)),
      )
      if (raw === null) return
      for (const e of normalizeStore(raw).entries) this.adopt(e)
    } catch (e) {
      this.corrupt = true
      console.error('[dup] 上传查重索引读取失败（写入已拒绝，避免覆盖）：' + msgOf(e))
    }
  }

  private adopt(e: DupEntry): void {
    this.store.entries.push(e)
    const key = kFile(e.project, e.path)
    this.byFile.set(key, e)
    this.indexAdd(this.byRaw, kRaw(e.project, e.h), key)
    if (e.n) this.indexAdd(this.byNorm, kNorm(e.project, e.n), key)
    if (e.s) for (const b of bandKeys(e.s)) this.indexAdd(this.byBand, kBand(e.project, b), key)
  }

  private indexAdd(map: Map<string, string[]>, key: string, id: string): void {
    const arr = map.get(key)
    if (arr) { if (!arr.includes(id)) arr.push(id) } else map.set(key, [id])
  }

  private indexRemove(map: Map<string, string[]>, key: string, id: string): void {
    const arr = map.get(key)
    if (!arr) return
    const i = arr.indexOf(id)
    if (i >= 0) arr.splice(i, 1)
    if (arr.length === 0) map.delete(key)
  }

  /** 把一个条目的三类桶挂进/摘出索引。 */
  private unindex(e: DupEntry): void {
    const key = kFile(e.project, e.path)
    this.indexRemove(this.byRaw, kRaw(e.project, e.h), key)
    if (e.n) this.indexRemove(this.byNorm, kNorm(e.project, e.n), key)
    if (e.s) for (const b of bandKeys(e.s)) this.indexRemove(this.byBand, kBand(e.project, b), key)
  }

  private scheduleSave(): void {
    this.dirty = true
    if (this.saveTimer) return
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      void this.flush().catch((e) => console.error('[dup] 索引落盘失败：' + msgOf(e)))
    }, SAVE_DEBOUNCE_MS)
    this.saveTimer.unref?.()
  }

  /** 立即落盘（测试用 / 关停前）。 */
  async flush(): Promise<void> {
    if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null }
    if (!this.dirty) return
    assertStoreWritable(!this.corrupt, this.file)
    await this.ctx.storage.writeText(this.file, JSON.stringify({ version: STORE_VERSION, entries: this.store.entries }))
    this.dirty = false
  }

  /* ---------------- 登记 ---------------- */

  /** 造指纹（上传路由用；流式算过原始哈希就传 rawHash）。 */
  fingerprint(buf: Buffer, rawHash?: string): Fingerprint {
    return fpOf(buf, rawHash)
  }

  /**
   * 登记 / 覆盖一个文件的指纹（同项目同路径只留一条）。
   *
   * 覆盖时**先摘旧桶再挂新桶** —— 内容变了（编辑器保存后重传）指纹会变，
   * 不摘旧桶就会留下「指向同一路径的幽灵指纹」，让后续上传误报。
   */
  register(project: string, path: string, fp: Fingerprint): void {
    if (project === '' || path === '') return
    const key = kFile(project, path)
    const old = this.byFile.get(key)
    if (old) {
      this.unindex(old)
      old.h = fp.h; old.n = fp.n; old.s = fp.s; old.size = fp.size; old.at = Date.now()
      this.indexAdd(this.byRaw, kRaw(project, old.h), key)
      if (old.n) this.indexAdd(this.byNorm, kNorm(project, old.n), key)
      if (old.s) for (const b of bandKeys(old.s)) this.indexAdd(this.byBand, kBand(project, b), key)
    } else {
      const e: DupEntry = { project, path, h: fp.h, n: fp.n, s: fp.s, size: fp.size, at: Date.now() }
      this.store.entries.push(e)
      this.byFile.set(key, e)
      this.indexAdd(this.byRaw, kRaw(project, e.h), key)
      if (e.n) this.indexAdd(this.byNorm, kNorm(project, e.n), key)
      if (e.s) for (const b of bandKeys(e.s)) this.indexAdd(this.byBand, kBand(project, b), key)
    }
    this.prune()
    this.scheduleSave()
  }

  /** 摘掉一条（删除/进回收站时）。 */
  forget(project: string, path: string): void {
    const key = kFile(project, path)
    const e = this.byFile.get(key)
    if (!e) return
    this.unindex(e)
    this.byFile.delete(key)
    const i = this.store.entries.indexOf(e)
    if (i >= 0) this.store.entries.splice(i, 1)
    this.scheduleSave()
  }

  /** 改名 / 移动：条目跟着走（含目录改名时的子项前缀替换）。 */
  moved(project: string, oldPath: string, newPath: string): void {
    if (project === '' || oldPath === '' || newPath === '' || oldPath === newPath) return
    const hit = this.byFile.get(kFile(project, oldPath))
    const targets: DupEntry[] = []
    if (hit) targets.push(hit)
    for (const e of this.byFile.values()) {
      if (e.project !== project || e.path === oldPath) continue
      if (e.path.startsWith(oldPath + '/')) targets.push(e)
    }
    for (const e of targets) {
      const key = kFile(e.project, e.path)
      this.unindex(e)
      e.path = e.path === oldPath ? newPath : newPath + e.path.slice(oldPath.length)
      e.at = Date.now()
      const nk = kFile(e.project, e.path)
      this.byFile.delete(key)
      this.byFile.set(nk, e)
      this.indexAdd(this.byRaw, kRaw(e.project, e.h), nk)
      if (e.n) this.indexAdd(this.byNorm, kNorm(e.project, e.n), nk)
      if (e.s) for (const b of bandKeys(e.s)) this.indexAdd(this.byBand, kBand(e.project, b), nk)
    }
    if (targets.length) this.scheduleSave()
  }

  /** 条目上限：按最久未触碰淘汰（索引是派生数据，淘汰只是让老文件下次再登记一遍）。 */
  private prune(): void {
    if (this.store.entries.length <= MAX_ENTRIES) return
    const drop = this.store.entries.length - MAX_ENTRIES
    const victims = [...this.store.entries].sort((a, b) => a.at - b.at).slice(0, drop)
    const gone = new Set(victims)
    for (const v of victims) {
      this.unindex(v)
      this.byFile.delete(kFile(v.project, v.path))
    }
    this.store.entries = this.store.entries.filter((e) => !gone.has(e))
  }

  /* ---------------- 查 ---------------- */

  /**
   * 查本次上传的指纹在**同一项目**里有没有相同的（exact）或高度相似的（near）。
   *
   * 为什么限定同项目：跨项目提示会把"你看得见的项目"和"你看不见的项目"关联起来
   * （A 项目上传命中 B 项目的内容 ⇒ 泄漏 B 的存在）。查重页的跨项目口径（Q8）另有其事，
   * 上传提示按项目内自洽。
   *
   * @param path 本次上传落地的相对路径；自己不算命中（存在性/唯一性交给 409 那层）
   */
  check(project: string, path: string, fp: Fingerprint): DupCheckResult {
    const self = kFile(project, path)
    const exact: DupHit[] = []
    const seen = new Set<string>()
    const collect = (map: Map<string, string[]>, key: string) => {
      for (const fk of map.get(key) ?? []) {
        if (fk === self || seen.has(fk)) continue
        const e = this.byFile.get(fk)
        if (!e) continue
        seen.add(fk)
        exact.push({ path: e.path, size: e.size })
      }
    }
    collect(this.byRaw, kRaw(project, fp.h))
    if (fp.n) collect(this.byNorm, kNorm(project, fp.n))
    exact.sort((a, b) => (a.path < b.path ? -1 : 1))

    const near: NearHit[] = []
    if (fp.s && fp.s.length >= 16) {
      const cand = new Set<string>()
      for (const b of bandKeys(fp.s)) for (const fk of this.byBand.get(kBand(project, b)) ?? []) {
        if (fk !== self && !seen.has(fk) && !cand.has(fk)) cand.add(fk)
      }
      for (const fk of cand) {
        const e = this.byFile.get(fk)
        if (!e || !e.s) continue
        const score = sigSimilarity(fp.s, e.s)
        if (score >= this.threshold) near.push({ path: e.path, score: Math.round(score * 100) / 100 })
      }
      near.sort((a, b) => b.score - a.score || (a.path < b.path ? -1 : 1))
      near.length = Math.min(near.length, NEAR_HITS_CAP)
    }
    return { exact, near }
  }

  /* ---------------- 诊断 ---------------- */

  /** 近似阈值（诊断/测试用）。 */
  nearThreshold(): number {
    return this.threshold
  }

  stats(): DupStats {
    const projects = new Set<string>()
    for (const e of this.store.entries) projects.add(e.project)
    return { entries: this.store.entries.length, projects: projects.size, corrupt: this.corrupt }
  }
}

/** 插件挂载：注册 DupService 到 `ctx.dup`，并跟随 `file:changed` 维护索引。 */
export const name = 'privhub-svc-dup'
export const inject = ['storage', 'eventBus']
export function apply(ctx: Context, config: Config): void {
  const svc = new DupService(ctx, config)
  ctx.eventBus.declareListen('file:changed', 'privhub-svc-dup',
    '改名/移动 → 上传查重索引条目跟着走；删除/清空 → 摘掉（别让提示指向已进回收站的路径）')
  ctx.effect(() => {
    const off = ctx.on('file:changed', (payload: unknown) => {
      const e = payload as { project?: unknown; path?: unknown; action?: unknown; newPath?: unknown }
      if (!e || typeof e.project !== 'string' || e.project === '') return
      if (typeof e.path !== 'string' || e.path === '') return
      const action = String(e.action ?? '')
      if (action === 'renamed' || action === 'moved') {
        if (typeof e.newPath === 'string' && e.newPath !== '') svc.moved(e.project, e.path, e.newPath)
        return
      }
      if (action === 'deleted' || action === 'purged') svc.forget(e.project, e.path)
    })
    return () => { off() }
  })
}
