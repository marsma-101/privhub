/**
 * 私域枢纽链接登记 Service（privhub-svc-links）—— Q4 / §2.6「双链 ID 化」
 *
 * 以 cordis Service 形式暴露 `ctx.links`。存 `data/links.json`（侧车登记表），
 * 记住「文件 → 稳定 ID」以及**退役过的文件名**，于是：
 *
 * ```
 * 把被引用的文件改名  →  [[旧名]] 仍然解析到它  →  图谱边与反链不断
 * ```
 *
 * ## 三条设计决定（都是刻意的，改之前先读）
 *
 * 1. **不改写用户文档。** 另一条路是"改名时把别的文档里的 `[[旧名]]` 改成新名"，
 *    但那要逐字改用户正文 —— 不可逆、会触发版本历史/编辑锁/协同会话，
 *    还可能改错（同名不同目录）。本仓选**侧车登记表**：用户文档一个字节都不动。
 * 2. **对前端不可见。** 界面照旧只认 `[[名]]`；ID 只活在服务端登记表里，
 *    因此没有任何前端契约变化（老客户端不感知、老数据不用迁移）。
 *    `[[id:xxx]]` 是**可选**写法，服务端认，界面不生成。
 * 3. **登记表是派生数据。** 丢了能重建（名→路径从磁盘重扫），所以读取用宽容口径，
 *    条目数有上限、按最久未触碰淘汰。**绝不因为登记表出问题而挡住任何文件操作。**
 *
 * ## 谁往里写
 *
 * - `file:changed` 事件（created/saved/restored → 登记；renamed/moved → 搬迁 + 留别名）；
 * - 消费方每次图构建/扫描时调 {@link LinkService.ensureAll} **惰性补登记**
 *   （老文件不可能在启动时全扫一遍，所以走 FIFO 补登记队列，每轮有上限）。
 *
 * @module privhub-svc-links
 */

import { join, resolve } from 'node:path'
import { Service } from '@deepseek-ai/cordis'
import type { Context } from '@deepseek-ai/cordis'
import { readJsonStore, assertStoreWritable, msgOf } from '../../privhub-core/src/json-store'
import { normalizeLinkTarget } from './linkparse'
import {
  STORE_FILE, STORE_VERSION, MAX_ENTRIES, BACKFILL_PER_CALL,
  normalizePath, nameOf, newId, normalizeStore, pickCandidate, pushAlias,
  type LinkEntry, type LinkStore, type LiveIndex,
} from './core'

export interface Config {
  file: string
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    links: LinkService
  }
}

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()

/** 键：项目 + 名字空间 + 值。用 JSON 元组而不是拼接 —— 名字里可能出现分隔符（同 refcheck 缓存键的做法）。 */
const kPath = (project: string, path: string): string => JSON.stringify([project, 'p', path])
const kName = (project: string, name: string): string => JSON.stringify([project, 'n', name])
const kAlias = (project: string, name: string): string => JSON.stringify([project, 'a', name])

/** 落盘节流：登记是高频动作（每次图构建都会补一批），不能一文件一次写。 */
const SAVE_DEBOUNCE_MS = 400

export interface LinkStats {
  entries: number
  projects: number
  /** 等待惰性补登记的文件数（FIFO 队列剩余）。 */
  pending: number
  /** 登记表读取时是否损坏过（损坏时仍然工作：重建即可）。 */
  corrupt: boolean
}

export class LinkService extends Service {
  private readonly file: string
  private readonly store: LinkStore = { version: STORE_VERSION, entries: [] }
  private readonly byId = new Map<string, LinkEntry>()
  private readonly byPath = new Map<string, string>()
  private readonly byName = new Map<string, string[]>()
  private readonly byAlias = new Map<string, string[]>()
  /** 惰性补登记队列（FIFO）。 */
  private readonly pending: { project: string; path: string }[] = []
  private readonly queued = new Set<string>()
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private drainTimer: ReturnType<typeof setTimeout> | null = null
  private dirty = false
  private corrupt = false
  /** 载入完成信号：消费方在解析前 await 它（否则首批请求可能看不到别名）。 */
  readonly ready: Promise<void>

  constructor(ctx: Context, private readonly config: Config) {
    super(ctx, 'links')
    const f = (config?.file ?? '').trim()
    this.file = f === '' ? join(rootDir, 'data', STORE_FILE) : resolve(f)
    this.ready = this.load().catch(() => { /* 已在 load 内记录，登记表不是关键路径 */ })
  }

  /* ---------------- 载入 / 落盘 ---------------- */

  private async load(): Promise<void> {
    /* D4：损坏 → 隔离存证 + 记标志。这里**不退化为"就当没数据"**，因为
     * "读到空表 → 接着一次写入"会把可能还能恢复的登记表覆盖掉。
     * 置标志后写路径被拒（改名的别名落不了盘，但**文件操作照常** ——
     * 登记表是派生数据，丢了顶多丢"改名不断链"这一层，绝不该挡住任何文件操作）。 */
    try {
      const raw = await readJsonStore<unknown>(
        this.ctx.storage, this.file, null,
        (v) => v === null || (typeof v === 'object' && Array.isArray((v as { entries?: unknown }).entries)),
      )
      if (raw === null) return
      for (const e of normalizeStore(raw).entries) this.adopt(e)
    } catch (e) {
      this.corrupt = true
      console.error('[links] 链接登记表读取失败（写入已拒绝，避免覆盖）：' + msgOf(e))
    }
  }

  /** 把一条记录挂进内存索引（载入用；不触发落盘）。 */
  private adopt(e: LinkEntry): void {
    this.store.entries.push(e)
    this.byId.set(e.id, e)
    this.byPath.set(kPath(e.project, e.path), e.id)
    this.indexAdd(this.byName, kName(e.project, e.name), e.id)
    for (const a of e.aliases) this.indexAdd(this.byAlias, kAlias(e.project, a), e.id)
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

  private scheduleSave(): void {
    this.dirty = true
    if (this.saveTimer) return
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      void this.flush().catch((e) => console.error('[links] 登记表落盘失败：' + msgOf(e)))
    }, SAVE_DEBOUNCE_MS)
    this.saveTimer.unref?.()
  }

  /** 立即落盘（改名后调用 / 测试用）。 */
  async flush(): Promise<void> {
    if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null }
    if (!this.dirty) return
    assertStoreWritable(!this.corrupt, this.file)
    await this.ctx.storage.writeText(this.file, JSON.stringify({ version: STORE_VERSION, entries: this.store.entries }))
    this.dirty = false
  }

  /* ---------------- 登记 ---------------- */

  private create(project: string, path: string): LinkEntry {
    const e: LinkEntry = { id: newId(), project, path, name: nameOf(path), aliases: [], at: Date.now() }
    this.store.entries.push(e)
    this.byId.set(e.id, e)
    this.byPath.set(kPath(project, path), e.id)
    this.indexAdd(this.byName, kName(project, e.name), e.id)
    this.prune()
    this.scheduleSave()
    return e
  }

  /** 条目上限：按最久未触碰淘汰（登记表是派生数据，淘汰只是让老文件下次再登记一遍）。 */
  private prune(): void {
    if (this.store.entries.length <= MAX_ENTRIES) return
    const drop = this.store.entries.length - MAX_ENTRIES
    const victims = [...this.store.entries].sort((a, b) => a.at - b.at).slice(0, drop)
    const gone = new Set(victims.map((v) => v.id))
    for (const v of victims) this.forget(v)
    this.store.entries = this.store.entries.filter((e) => !gone.has(e.id))
  }

  private forget(e: LinkEntry): void {
    this.byId.delete(e.id)
    if (this.byPath.get(kPath(e.project, e.path)) === e.id) this.byPath.delete(kPath(e.project, e.path))
    this.indexRemove(this.byName, kName(e.project, e.name), e.id)
    for (const a of e.aliases) this.indexRemove(this.byAlias, kAlias(e.project, a), e.id)
  }

  /**
   * 登记一个文件（已登记则只刷新触碰时间）。返回它的稳定 ID。
   *
   * 已登记的情况下**只更新内存里的 `at`**，不触发落盘 —— 否则每次保存文档都写一遍
   * 登记表（`file:changed:saved` 是高频事件）。
   */
  register(project: string, rawPath: string): string {
    const path = normalizePath(rawPath)
    if (project === '' || path === '') return ''
    const hit = this.byPath.get(kPath(project, path))
    if (hit !== undefined) {
      const e = this.byId.get(hit)
      if (e) { e.at = Date.now(); return e.id }
    }
    return this.create(project, path).id
  }

  /**
   * 惰性补登记（FIFO 队列，每轮上限 {@link BACKFILL_PER_CALL}）。
   *
   * 为什么要有上限：大项目一次几万个文件，同步登记会卡住首个图谱请求；
   * 余下的排进队列由下一轮（或定时器）继续。**队列积压不影响正确性** ——
   * 解析同时参考"活文件列表"，没登记的文件也照样能被现名解析到。
   */
  ensureAll(project: string, rawPaths: string[]): void {
    if (project === '') return
    for (const raw of rawPaths) {
      const path = normalizePath(raw)
      if (path === '' || path === project) continue
      const key = kPath(project, path)
      if (this.byPath.has(key) || this.queued.has(key)) continue
      this.queued.add(key)
      this.pending.push({ project, path })
    }
    this.drain()
  }

  private drain(): void {
    let n = 0
    while (this.pending.length > 0 && n < BACKFILL_PER_CALL) {
      const item = this.pending.shift() as { project: string; path: string }
      this.queued.delete(kPath(item.project, item.path))
      n++
      if (!this.byPath.has(kPath(item.project, item.path))) this.create(item.project, item.path)
    }
    if (this.pending.length > 0 && !this.drainTimer) {
      this.drainTimer = setTimeout(() => { this.drainTimer = null; this.drain() }, 0)
      this.drainTimer.unref?.()
    }
  }

  /**
   * 改名 / 移动：把条目搬到新路径，**旧文件名留作别名**（这是"改名不断链"的全部机制）。
   *
   * 目录改名也要处理（事件只带顶层那一条），所以以 `oldPath + '/'` 为前缀的子项一并搬迁。
   * `flush()` 立即落盘：改名是低频且关键的动作，不能等着节流窗口。
   */
  async renamed(project: string, rawOld: string, rawNew: string): Promise<void> {
    const oldPath = normalizePath(rawOld)
    const newPath = normalizePath(rawNew)
    if (project === '' || oldPath === '' || newPath === '' || oldPath === newPath) return
    const oldName = nameOf(oldPath)
    const newName = nameOf(newPath)
    const id = this.byPath.get(kPath(project, oldPath))

    if (id === undefined) {
      // 老路径没登记过（升级前就存在的文件）：登记新路径，并把老名记为别名 ——
      // 别人文档里写的老名依然要能解析到它。
      const created = this.create(project, newPath)
      if (oldName !== newName) {
        created.aliases = pushAlias(created.aliases, oldName)
        this.indexAdd(this.byAlias, kAlias(project, oldName), created.id)
      }
    } else {
      const e = this.byId.get(id) as LinkEntry
      this.byPath.delete(kPath(project, e.path))
      this.indexRemove(this.byName, kName(project, e.name), e.id)
      e.path = newPath
      e.name = newName
      e.at = Date.now()
      if (oldName !== newName) {
        e.aliases = pushAlias(e.aliases, oldName)
        this.indexAdd(this.byAlias, kAlias(project, oldName), e.id)
      }
      this.byPath.set(kPath(project, newPath), e.id)
      this.indexAdd(this.byName, kName(project, newName), e.id)
    }

    // 子项（目录改名/移动）：改名字，路径前缀替换。
    for (const child of this.byId.values()) {
      if (child.project !== project || child.path === oldPath) continue
      if (!child.path.startsWith(oldPath + '/')) continue
      this.byPath.delete(kPath(project, child.path))
      child.path = newPath + child.path.slice(oldPath.length)
      child.at = Date.now()
      this.byPath.set(kPath(project, child.path), child.id)
    }

    this.scheduleSave()
    await this.flush()
  }

  /* ---------------- 查询 ---------------- */

  idOf(project: string, rawPath: string): string | null {
    return this.byPath.get(kPath(project, normalizePath(rawPath))) ?? null
  }

  pathOf(project: string, id: string): string | null {
    return this.byId.get(id)?.path ?? null
  }

  /**
   * 一个文件当前用过的**全部名字**：现名 + 退役别名。
   *
   * 给反链摘要用 —— 摘要要在引用方正文里找「含目标名的那一行」，而改名之后
   * 正文里写的仍是老名字；只按现名找会得到空摘要（界面显示"（未取到摘要）"）。
   */
  namesOf(project: string, rawPath: string): string[] {
    const e = this.byId.get(this.byPath.get(kPath(project, normalizePath(rawPath))) ?? '')
    if (!e) return [nameOf(rawPath)]
    return [e.name, ...e.aliases]
  }

  /** 项目里登记了多少条（诊断用）。 */
  count(project: string): number {
    let n = 0
    for (const e of this.byId.values()) if (e.project === project) n++
    return n
  }

  /**
   * 按登记表查一个引用目标（**不看磁盘**）：现名优先，其次退役名，`id:` 直接取。
   *
   * 返回的路径**可能已不存在**（文件被删了但别名还在），所以调用方必须自行校验存在性
   * —— refcheck 用它做"断链"判定的最后一道兜底，正是靠这个校验来保证**不把真断链说成没断**。
   */
  lookup(project: string, rawTarget: string): string | null {
    const { id, target } = normalizeLinkTarget(rawTarget)
    if (id !== null) {
      const e = this.byId.get(id)
      return e && e.project === project ? e.path : null
    }
    if (target === '') return null
    const name = nameOf(target)
    for (const [map, key] of [[this.byName, kName(project, name)], [this.byAlias, kAlias(project, name)]] as const) {
      for (const cid of map.get(key) ?? []) {
        const e = this.byId.get(cid)
        if (e && e.path !== '') return e.path
      }
    }
    return null
  }

  /**
   * 解析一个引用目标到**当前存在的项目内路径**；解不到返回 null。
   *
   * @param live      调用方本次枚举出的活文件索引（图构建/扫描时建一次复用）；给了才做存在性校验
   * @param sourcePath 引用方自身的路径（同名多命中时优先同目录）
   */
  resolveTarget(project: string, rawTarget: string, opts: { live?: LiveIndex; sourcePath?: string } = {}): string | null {
    const { id, target } = normalizeLinkTarget(rawTarget)
    const live = opts.live

    if (id !== null) {
      const p = this.pathOf(project, id)
      if (p === null) return null
      return !live || live.pathSet.has(p) ? p : null
    }
    if (target === '') return null

    // 1) 目标直接就是一条现存路径（带目录的写法最常命中这里）
    if (live) {
      if (live.pathSet.has(target)) return target
      if (!target.includes('/') && live.pathSet.has(target + '.md')) return target + '.md'
    }

    // 2) 按文件名：登记表现名 ∪ 活文件现名（登记表在前 ⇒ 解析结果长期稳定）
    const name = nameOf(target)
    const cands: string[] = []
    for (const cid of this.byName.get(kName(project, name)) ?? []) {
      const e = this.byId.get(cid)
      if (e) cands.push(e.path)
    }
    if (live) for (const p of live.byName.get(name) ?? []) cands.push(p)
    const hit = this.pick(cands, live, opts.sourcePath)
    if (hit !== null) return hit

    // 3) 退役名（改名之后的那条路）
    const aliased: string[] = []
    for (const cid of this.byAlias.get(kAlias(project, name)) ?? []) {
      const e = this.byId.get(cid)
      if (e) aliased.push(e.path)
    }
    return this.pick(aliased, live, opts.sourcePath)
  }

  private pick(cands: string[], live: LiveIndex | undefined, sourcePath?: string): string | null {
    const uniq = [...new Set(cands.filter((p) => p !== ''))]
    const usable = live ? uniq.filter((p) => live.pathSet.has(p)) : uniq
    return pickCandidate(usable, sourcePath)
  }

  /* ---------------- 诊断 ---------------- */

  stats(): LinkStats {
    const projects = new Set<string>()
    for (const e of this.byId.values()) projects.add(e.project)
    return { entries: this.byId.size, projects: projects.size, pending: this.pending.length, corrupt: this.corrupt }
  }
}

/** 插件挂载：注册 LinkService 到 `ctx.links`，并跟随 `file:changed` 维护登记表。 */
export const name = 'privhub-svc-links'
export const inject = ['storage', 'eventBus']
export function apply(ctx: Context, config: Config): void {
  const svc = new LinkService(ctx, config)
  ctx.eventBus.declareListen('file:changed', 'privhub-svc-links',
    '文件创建/保存/恢复 → 登记；改名/移动 → 搬迁并保留旧名别名（双链 ID 化：改名不断链）')
  ctx.effect(() => {
    const off = ctx.on('file:changed', (payload: unknown) => {
      const e = payload as { project?: unknown; path?: unknown; action?: unknown; newPath?: unknown }
      if (!e || typeof e.project !== 'string' || e.project === '') return
      if (typeof e.path !== 'string' || e.path === '') return
      const action = String(e.action ?? '')
      if (action === 'renamed' || action === 'moved') {
        if (typeof e.newPath === 'string' && e.newPath !== '') {
          void svc.renamed(e.project, e.path, e.newPath).catch((err) => {
            console.error('[links] 改名登记失败：' + msgOf(err))
          })
        }
        return
      }
      // created / saved / restored：登记即可；deleted / purged / clean **不动**条目
      //（别名要活着：删掉的文件若被重新建回来，引用还是同一个 ID）。
      if (action === 'created' || action === 'saved' || action === 'restored') svc.register(e.project, e.path)
    })
    return () => { off() }
  })
}
