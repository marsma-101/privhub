/**
 * 私域枢纽最近打开插件（privhub-shell-recent，F03）
 *
 * 最近打开文件列表：GET /privhub/api/recent（当前用户）、
 * POST /privhub/api/recent（记录一条，上限 20 条）。
 * 数据存 data/recent.json（按用户名分组）。
 * 前端挂 user-area slot：顶栏「最近」下拉，点击直接定位。
 *
 * ## 键模型：fileId 主键 + project|path 惰性兼容（v6 §3.2 侧车迁移第一批）
 *
 * 改造前「最近」的身份是 `project + path`，文件一改名，这条记录就指向不存在的路径
 * （点进去找不到，或被新同名文件顶替）。现在主索引给了稳定 fileId：
 *
 * - **写路径**：能查到 fileId 就写 `fileId` 字段；查不到则只写 `project + path`（与改造前等价）。
 * - **读路径**：fileId 命中优先；miss 再按 `project + path` 匹配老记录。
 * - **惰性升级**：路径命中的老记录、且该文件现在有 fileId 时**就地补写** `fileId`
 *   （`supersededBy` 标出键已迁移），不新增第二条、不删除原记录。不做一次性主动迁移 ——
 *   主动迁移写坏不可回滚，而惰性升级最坏只是「这条要等下次被访问才升级」。
 * - **绝不双份并存**：fileId 命中后不再按路径二次匹配。
 *
 * 对「最近」来说这套键尤其重要：这里**每打开一个目录就写一次**，是最密集的写入点，
 * 一旦去重口径写错，用户看到的就是「同一个文件夹在最近列表里出现 N 次」。
 *
 * ## 个人空间隔离（安全底线，不是可选项）
 *
 * fileId 全局唯一，而个人空间内容按 `canAccess` 隔离 —— 键里省掉 project **不等于**
 * 可以省掉鉴权。读出条目后必须再判 `ownerOfPersonalDir(project) === u.username`
 * （个人空间只归本人，管理员亦不可见）。这里保留 project 字段就是为了能做这次判断，
 * 同时它也是「显示在哪个项目」的展示信息。
 *
 * @module privhub-shell-recent
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { existsSync } from 'node:fs'
import type { Context } from '@deepseek-ai/cordis'
import { json, readBody, readJsonStore } from '../../privhub-core/src/index'
import type { PrivHubStore, UserRecord } from '../../privhub-core/src/index'

export const name = 'privhub-shell-recent'
export const inject = ['privhub', 'storage', 'eventBus']

const dataRootDir = process.env.PRIVHUB_DATA_ROOT?.trim() || process.env.PRIVHUB_ROOT?.trim() || process.cwd()

export interface RecentEntry {
  project: string
  path: string
  name: string
  isDir: boolean
  at: number
  /** 稳定文件 ID（主索引 `FileEntry.id`）；改名/移动不变。老数据没有，首次访问时惰性补写。 */
  fileId?: string
  /**
   * 键已迁移标记：值为迁移后的 `fileId`。
   *
   * 语义是「**这一条的键**从 project|path 升级成了该 ID」，而**不是**「这条被另一条取代」
   * —— 库里始终只有一条记录，`project`/`path` 原值保留，随时可回滚。
   */
  supersededBy?: string
}

interface RecentData {
  [username: string]: RecentEntry[]
}

const MAX_RECENT = 20

/* 最近列表同样是**所有用户共用一份**（按 username 分键）。 */
const RECENT_FILE = join(dataRootDir, 'data', 'recent.json')

/* ---------------- 主索引桥接（可选依赖，绝不进 inject） ---------------- */

/** 本插件从主索引需要的展示/定位字段（读侧一律当不可信数据裁决）。 */
interface IndexEntry {
  id?: unknown
  name?: unknown
  virtualPath?: unknown
  isDir?: unknown
  trashed?: unknown
}

interface FileIndexLike {
  getByPath(project: string, virtualPath: string): IndexEntry | null
  get(id: string): IndexEntry | null
}

/**
 * 取主索引服务（**可选**，取不到就是 undefined）。
 *
 * 【不要写成 `ctx.fileindex`】cordis 的 Context 代理对「未 inject 的服务」是**取值即抛**
 * （`cannot get property "fileindex" without inject`），**可选链也拦不住** —— get trap 在
 * 取值那一刻就抛了。同样不能把 fileindex 加进 `inject`：索引是派生数据（丢了能重建），
 * 它缺失绝不能连累「最近」这种基础功能装配失败。
 * `reflect.get(name, false)` 直接读服务表：缺失返回 undefined，不触发依赖判定。
 */
function indexOf(ctx: Context): FileIndexLike | undefined {
  try {
    const fi = ctx.reflect.get('fileindex', false) as FileIndexLike | undefined
    if (!fi || typeof fi.getByPath !== 'function' || typeof fi.get !== 'function') return undefined
    return fi
  } catch { return undefined }
}

/** 按 project+path 查当前 fileId；索引不可用/查不到 → null（写路径退化为只写路径键）。 */
function fileIdOf(ctx: Context, project: string, path: string): string | null {
  const fi = indexOf(ctx)
  if (!fi) return null
  try {
    const e = fi.getByPath(project, path)
    return e && typeof e.id === 'string' && e.id !== '' ? e.id : null
  } catch { return null }
}

/**
 * 这条记录是否指向「这次要记录的那份资源」。
 *
 * 口径（与 favorites 一致）：
 *   ① fileId 相同 → 命中（改名/移动后仍认得出）；
 *   ② 否则 `project + path` 相同 → 命中（老记录 / 孤儿记录）。
 *
 * ②是①的兜底而不是并列的第二身份：①命中后不再走②，因此不会出现「同一条两份」。
 * 注意**目录**也走同一套：目录同样在索引里有稳定 ID，「最近打开过的文件夹」改名后
 * 也应该还能定位。
 */
function matches(e: RecentEntry, project: string, path: string, fileId: string | null): boolean {
  if (fileId !== null && e.fileId === fileId) return true
  return e.project === project && e.path === path
}

/**
 * 惰性升级：给命中的**老记录**补上 fileId（就地打标，不新增条目、不删原记录）。
 * @returns 是否真的改了（只有改了才需要回写盘）
 */
function upgrade(e: RecentEntry, fileId: string | null): boolean {
  if (fileId === null) return false
  if (typeof e.fileId === 'string' && e.fileId !== '') return false
  e.fileId = fileId
  e.supersededBy = fileId
  return true
}

/**
 * 用主索引把**展示用的位置**刷新到资源当前所在处（改名/移动后仍能点进去）。
 *
 * 只动返回副本、不回写盘（GET 不该写盘）；索引不可用、已进回收站、字段形状不符时
 * 一律退回存储里的原值 —— 降级方向永远是「显示旧位置」，不是「报错」。
 * ⚠ 只取 `virtualPath` / `name` / `isDir` 三个展示字段，**物理 ID 绝不出服务端**。
 */
function projectForDisplay(ctx: Context, e: RecentEntry): RecentEntry {
  if (typeof e.fileId !== 'string' || e.fileId === '') return e
  const fi = indexOf(ctx)
  if (!fi) return e
  let ent: IndexEntry | null
  try { ent = fi.get(e.fileId) } catch { return e }
  if (!ent || ent.trashed === true) return e
  const virtualPath = typeof ent.virtualPath === 'string' ? ent.virtualPath : ''
  if (virtualPath === '') return e
  const name = typeof ent.name === 'string' && ent.name !== '' ? ent.name : e.name
  return { ...e, path: virtualPath, name, isDir: ent.isDir === true }
}

/**
 * 该用户能否看到这条记录指向的项目。
 *
 * **个人空间显式判**：`ownerOfPersonalDir` 非 null 就说明这是个人空间，只有归属者本人
 * 可见（管理员亦不可见）。与 `canAccess` 内部那段重复是**刻意的冗余** —— 键里已不强制
 * 带 project，鉴权就不能只靠某个上游函数兜着。
 *
 * @param visible 调用方预先算好的 `visibleProjects(u)`，避免每条记录都重算一次项目列表
 */
function canSee(svc: PrivHubStore, u: UserRecord, project: string, visible: Set<string>): boolean {
  const p = String(project ?? '')
  const owner = svc.ownerOfPersonalDir(p)
  if (owner !== null) return owner === u.username
  if (!visible.has(p)) return false
  return svc.canAccess(u, p)
}

/**
 * 把存储里的原始列表投影成**能返回给这个用户**的列表：先鉴权过滤，再刷新展示位置。
 *
 * **所有**返回最近列表的路由都必须走它，包括 POST 的响应 —— 这个写接口的响应体是
 * 「记录后的完整列表」，如果只过滤 GET，写接口就成了越权元数据的旁路
 * （收藏插件实测过同一问题：POST 响应里带回了别人的个人空间条目）。
 */
function viewFor(
  ctx: Context,
  svc: PrivHubStore,
  u: UserRecord,
  list: RecentEntry[],
  visible: Set<string>,
): RecentEntry[] {
  return list
    .filter((e) => canSee(svc, u, e.project, visible))
    .map((e) => projectForDisplay(ctx, e))
}

/** 每个返回列表的路由都要用它取一次可见项目集合（口径与 GET 一致）。 */
async function visibleOf(svc: PrivHubStore, u: UserRecord): Promise<Set<string>> {
  return new Set(await svc.visibleProjects(u))
}

async function loadAll(storage: { readText: (f: string) => Promise<string> }): Promise<RecentData> {
  /* D4：最近列表损坏 → 隔离存证 + 抛错（此前静默当空，一次「打开」就把所有人的最近记录清掉）。 */
  return readJsonStore<RecentData>(storage, RECENT_FILE, {})
}

async function saveAll(storage: { writeText: (f: string, d: string) => Promise<void> }, data: RecentData): Promise<void> {
  await mkdir(dirname(RECENT_FILE), { recursive: true })
  await storage.writeText(RECENT_FILE, JSON.stringify(data, null, 2))
}

export function apply(ctx: Context): void {
  const svc = ctx.privhub

  ctx.eventBus.declareListen('personal:renamed', 'privhub-shell-recent', '个人空间改名 → 同步最近列表里的项目名')

  /* 个人空间改名 → 把最近列表里指向旧目录名的条目的 project 改写成新名。
   * 不改写也不会报错（读取时会按 visibleProjects 过滤掉），但用户的「最近」
   * 记录会静默丢失一条，属于数据腐坏，顺手修掉。 */
  ctx.effect(() => {
    const off = ctx.on('personal:renamed', (p: { oldName?: string; newName?: string }) => {
      const oldName = String(p?.oldName ?? '')
      const newName = String(p?.newName ?? '')
      if (oldName === '' || newName === '' || oldName === newName) return
      void (async () => {
        try {
          /* D6：改写整份文件，必须与「写最近一条」互斥 —— 否则这次全量写回会和
           * 用户此刻正在记录的「最近一条」互相覆盖。 */
          await svc.withFileLock(RECENT_FILE, async () => {
            const all = await loadAll(ctx.storage)
            let touched = false
            for (const key of Object.keys(all)) {
              for (const e of all[key] ?? []) {
                if (e.project === oldName) { e.project = newName; touched = true }
              }
            }
            if (touched) await saveAll(ctx.storage, all)
          })
        } catch { /* 最近列表非关键数据，失败不影响改名本身 */ }
      })()
    })
    return () => off()
  })

  /* 最近列表（当前用户） */
  svc.route('/privhub/api/recent', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (req.method === 'GET') {
      /* 可见过滤：权限收回后的项目残留不展示（与 favorites 同规则）。
       * 鉴权用 canSee：个人空间走 ownerOfPersonalDir 显式判，不依赖键里是否带 project。 */
      const all = await loadAll(ctx.storage)
      json(res, 200, { ok: true, recent: viewFor(ctx, svc, u, all[u.username] ?? [], await visibleOf(svc, u)) })
      return
    }
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = String(body.project ?? '')
    const path = String(body.path ?? '')
    const name = String(body.name ?? '')
    const isDir = body.isDir === true
    if (project === '' || name === '') return json(res, 400, { ok: false, error: '参数不完整' })
    // 权限校验：只能记录自己有权限的项目
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限访问该项目' })
    /* 请求里带了 fileId 就直接用；否则查索引。查不到 → null，退化为只写路径键（改造前行为）。 */
    const wantId = typeof body.fileId === 'string' && body.fileId !== '' ? body.fileId : fileIdOf(ctx, project, path)
    /* D6：读-改-写整体串行 —— 打开一个文件就会走到这里，是**最密集**的写入点，
     * 两个人同时浏览就足以互相覆盖（列表是共用的，丢的是别人的记录）。 */
    const next = await svc.withFileLock(RECENT_FILE, async () => {
      const all = await loadAll(ctx.storage)
      const list = all[u.username] ?? []
      /* 去重口径与 GET 一致：ID 命中优先，miss 才比路径。
       * 这一步错的话，用户看到的就是「同一个文件夹在最近列表里出现 N 次」。 */
      const rest = list.filter((e) => !matches(e, project, path, wantId))
      const updated = [{
        project, path, name, isDir, at: Date.now(),
        ...(wantId !== null ? { fileId: wantId } : {}),
      }, ...rest].slice(0, MAX_RECENT)
      /* 顺带把留下的老记录升级掉：同一次落盘里做完，不多付一次写盘。
       * 必须落在**锁内**，否则并发的两个写入各自升级会互相覆盖。 */
      for (const e of rest) upgrade(e, fileIdOf(ctx, e.project, e.path))
      all[u.username] = updated
      // 尽力而为：多实例共享数据目录时 rename 偶发竞争，重试一次；仍失败不阻塞（最近列表非关键数据）
      try {
        await saveAll(ctx.storage, all)
      } catch {
        await new Promise((r) => setTimeout(r, 80))
        await saveAll(ctx.storage, all).catch(() => { /* 忽略 */ })
      }
      return updated
    })
    /* 与 GET 保持同一契约：返回出去的列表一律过 viewFor（鉴权 + 展示投影）；盘上存的仍是
     * 原值。**写接口的响应同样要过鉴权** —— 否则它就是越权元数据的旁路。 */
    json(res, 200, { ok: true, recent: viewFor(ctx, svc, u, next, await visibleOf(svc, u)) })
  }, 'recent')
}
