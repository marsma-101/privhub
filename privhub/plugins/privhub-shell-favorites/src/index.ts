/**
 * 私域枢纽收藏插件（privhub-shell-favorites，F02）
 *
 * 文件/文件夹收藏（星标）：
 *   GET    /privhub/api/favorites     当前用户收藏列表
 *   POST   /privhub/api/favorites     添加 { project, path, name, isDir }
 *   DELETE /privhub/api/favorites     移除（body { project, path }）
 * 数据存 data/favorites.json（按用户名分组）。
 * 前端：图标栏星标入口 → 收藏视图（点击跳转）；文件面板右键「收藏」。
 *
 * ## 键模型：fileId 主键 + project|path 惰性兼容（v6 §3.2 侧车迁移第一批）
 *
 * 改造前收藏的身份是 `project + path`，于是**文件一改名/移动，收藏就指向不存在的路径**。
 * 现在主索引给了稳定 fileId（改名只改索引里的 name，ID 不动），所以：
 *
 * - **写路径**：能查到 fileId 就写 `fileId` 字段；查不到（老库未扫描 / 索引不可用）则只写
 *   `project + path`，行为与改造前等价。
 * - **读路径**：fileId 命中优先；miss 再按 `project + path` 匹配老记录。
 * - **惰性升级**：路径命中的老记录、且该文件现在有 fileId 时，**就地补写 `fileId`**
 *   （`supersededBy` 标出「此条的键已从路径迁移到该 ID」），**不新增第二条、不删除原记录**。
 *   不做一次性主动迁移：主动迁移一旦写坏不可回滚，而惰性升级的风险上限只是
 *   「这条老收藏要等下次被访问才升级」。
 * - **绝不双份并存**：fileId 命中后不再按路径二次匹配，避免同一条收藏出现两份。
 *
 * ## 个人空间隔离（安全底线，不是可选项）
 *
 * fileId 是**全局唯一**的，而个人空间的内容按 `canAccess` 隔离。因此键里省掉 project
 * **不等于**可以省掉鉴权：每条读出的记录都必须再判一次「这个 project 该不该给这个用户看」。
 * 这里显式走 `ownerOfPersonalDir`（个人空间只归本人，管理员亦不可见）而不只依赖
 * `visibleProjects` —— 后者将来若被改动，这道独立判断仍然成立。
 *
 * @module privhub-shell-favorites
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { existsSync } from 'node:fs'
import type { Context } from '@deepseek-ai/cordis'
import { json, readBody, readJsonStore } from '../../privhub-core/src/index'
import type { PrivHubStore, UserRecord } from '../../privhub-core/src/index'

export const name = 'privhub-shell-favorites'
export const inject = ['privhub', 'storage']

const dataRootDir = process.env.PRIVHUB_DATA_ROOT?.trim() || process.env.PRIVHUB_ROOT?.trim() || process.cwd()

export interface FavoriteEntry {
  project: string
  path: string
  name: string
  isDir: boolean
  at: number
  /**
   * 稳定文件 ID（主索引里的 `FileEntry.id`）。改名/移动不变，因此收藏不再因改名而失效。
   * 老数据没有这个字段，首次被访问时惰性补写。
   */
  fileId?: string
  /**
   * 键已迁移标记：值为迁移后的 `fileId`。
   *
   * 语义是「**这一条的键**从 project|path 升级成了该 ID」，而**不是**「这条被另一条取代」
   * —— 库里始终只有一条记录（不双份），`project`/`path` 原值也原样保留，所以随时可回滚。
   */
  supersededBy?: string
}

interface FavData {
  [username: string]: FavoriteEntry[]
}

/* ---------------- 主索引桥接（可选依赖，绝不进 inject） ---------------- */

/**
 * 本插件从主索引需要的**展示/定位**字段（读侧一律当不可信数据裁决）。
 *
 * 用最小结构类型而不是 import `FileIndexService`：收藏是基础功能，不该为「可重建的派生
 * 索引」承担编译期依赖 —— 索引插件被拆掉时这里照样编译、照样跑。
 */
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
 * 它缺失绝不能连累「收藏」这种基础功能装配失败。
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
 * 这条收藏是否指向「这次要操作的那份资源」。
 *
 * 口径（宽松命中，保证用户总能取消收藏、也绝不重复收藏同一路径）：
 *   ① fileId 相同 → 命中（改名/移动后仍能认出来）；
 *   ② 否则 `project + path` 相同 → 命中（老记录，以及文件已彻底删除后遗留的孤儿收藏）。
 *
 * ②是对①的兜底，而不是并列的第二身份：一旦①命中就不再走②，因此不会出现「同一条两份」。
 * 命中后是否**补写** fileId，由 `upgrade()` 单独决定 —— 已有的 fileId 不会被路径覆盖
 * （否则「删掉 A 又在同路径建了同名 B」会把 A 的关联错改成 B）。
 */
function matches(e: FavoriteEntry, project: string, path: string, fileId: string | null): boolean {
  if (fileId !== null && e.fileId === fileId) return true
  return e.project === project && e.path === path
}

/**
 * 惰性升级：给命中的**老记录**补上 fileId（就地打标，不新增条目、不删原记录）。
 * @returns 是否真的改了（只有改了才需要回写盘）
 */
function upgrade(e: FavoriteEntry, fileId: string | null): boolean {
  if (fileId === null) return false
  if (typeof e.fileId === 'string' && e.fileId !== '') return false
  e.fileId = fileId
  e.supersededBy = fileId
  return true
}

/**
 * 用主索引把**展示用的位置**刷新到文件当前所在处（改名/移动后收藏仍能点进去）。
 *
 * 只动内存里的返回副本，不回写盘（GET 不该写盘，否则并发 GET 会与写入抢锁）；
 * 真正的落盘升级发生在下一次 POST/DELETE。索引不可用、条目已进回收站、字段形状
 * 不符时一律退回存储里的原值 —— 降级方向永远是「显示旧位置」，不是「报错」。
 *
 * ⚠ 只取 `virtualPath` / `name` / `isDir` 三个展示字段，**物理 ID 绝不出服务端**。
 */
function projectForDisplay(ctx: Context, e: FavoriteEntry): FavoriteEntry {
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
 * **个人空间显式判**：`ownerOfPersonalDir` 非 null 就说明这是个人空间，只有归属者本人可见
 * （管理员亦不可见）。这条判断与 `canAccess` 内部那段重复，是**刻意的冗余** ——
 * 键里已经不强制带 project，鉴权就不能只靠某一个上游函数兜着。
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
 * **所有**返回收藏/最近的路由都必须走它，包括 POST/DELETE 的响应 —— 这两个写接口的
 * 响应体是「操作后的完整列表」，如果只过滤 GET，写接口就成了越权元数据的旁路
 * （实测过：alice 收藏自己个人空间的文件时，POST 响应里带回了指向 Bob 个人空间的
 * 那条记录，等于告诉她「Bob 有这个文件」）。鉴权口径必须**与 GET 完全一致**。
 */
function viewFor(
  ctx: Context,
  svc: PrivHubStore,
  u: UserRecord,
  list: FavoriteEntry[],
  visible: Set<string>,
): FavoriteEntry[] {
  return list
    .filter((e) => canSee(svc, u, e.project, visible))
    .map((e) => projectForDisplay(ctx, e))
}

/** 每个返回列表的路由都要用它取一次可见项目集合（口径与 GET 一致）。 */
async function visibleOf(svc: PrivHubStore, u: UserRecord): Promise<Set<string>> {
  return new Set(await svc.visibleProjects(u))
}

/* 收藏文件是**所有用户共用一份**（按 username 分键），所以两个人同时收藏就会撞同一个文件。 */
const FAV_FILE = join(dataRootDir, 'data', 'favorites.json')

async function loadAll(storage: { readText: (f: string) => Promise<string> }): Promise<FavData> {
  /* D4：收藏库损坏 → 隔离存证 + 抛错（此前静默当空，一次「收藏」就把所有人的收藏清掉）。 */
  return readJsonStore<FavData>(storage, FAV_FILE, {})
}

async function saveAll(storage: { writeText: (f: string, d: string) => Promise<void> }, data: FavData): Promise<void> {
  await storage.writeText(FAV_FILE, JSON.stringify(data, null, 2))
}

export function apply(ctx: Context): void {
  const svc = ctx.privhub

  svc.route('/privhub/api/favorites', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return

    if (req.method === 'GET') {
      /* 项目上下文安全：只返回当前用户仍可见项目内的收藏（权限收回后残留不展示）。
       * 鉴权用 canSee：个人空间走 ownerOfPersonalDir 显式判，不依赖键里是否带 project。 */
      const all = await loadAll(ctx.storage)
      const list = all[u.username] ?? []
      json(res, 200, { ok: true, favorites: viewFor(ctx, svc, u, list, await visibleOf(svc, u)) })
      return
    }
    if (req.method === 'DELETE') {
      let body: any
      try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
      const project = String(body.project ?? '')
      const path = String(body.path ?? '')
      /* 请求里可带 fileId（前端从 /api/list 拿得到）。带了就按 ID 认，改名后照样能取消。 */
      const wantId = typeof body.fileId === 'string' && body.fileId !== '' ? body.fileId : fileIdOf(ctx, project, path)
      /* D6：读-改-写必须整体串行。否则两个请求各自「读到旧状态 → 改 → 写回」，
       * 后写的把先写的那条丢掉（丢的是**别人**的收藏，用户视角就是「我明明收藏了」）。 */
      const next = await svc.withFileLock(FAV_FILE, async () => {
        const all = await loadAll(ctx.storage)
        const list = all[u.username] ?? []
        const kept = list.filter((e) => !matches(e, project, path, wantId))
        /* 顺带把同批其它老记录升级掉：同一次落盘里做完，不多付一次写盘。
         * 升级必须落在**锁内**，否则并发的两个 DELETE 各自升级会互相覆盖。 */
        for (const e of kept) upgrade(e, fileIdOf(ctx, e.project, e.path))
        all[u.username] = kept
        await saveAll(ctx.storage, all)
        return kept
      })
      /* 与其他列表接口保持同一契约：返回出去的列表一律过 viewFor（鉴权 + 展示投影）；
       * 盘上存的仍是原值。**写接口的响应同样要过鉴权** —— 否则它就是越权元数据的旁路。 */
      json(res, 200, { ok: true, favorites: viewFor(ctx, svc, u, next, await visibleOf(svc, u)) })
      return
    }
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = String(body.project ?? '')
    const path = String(body.path ?? '')
    const name = String(body.name ?? '')
    if (project === '' || name === '') return json(res, 400, { ok: false, error: '参数不完整' })
    // 项目上下文安全：只能收藏自己有权限的项目（放在锁外：不通过就根本不该排队）
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限访问该项目' })
    /* 请求里带了 fileId 就直接用；否则查索引。查不到 → null，退化为只写路径键（改造前行为）。 */
    const wantId = typeof body.fileId === 'string' && body.fileId !== '' ? body.fileId : fileIdOf(ctx, project, path)
    const { list: next, already } = await svc.withFileLock(FAV_FILE, async () => {
      const all = await loadAll(ctx.storage)
      const list = all[u.username] ?? []
      /* 去重口径与 DELETE 一致：ID 命中优先，miss 才比路径 —— 保证「同一份文件只有一条收藏」。 */
      const hit = list.find((e) => matches(e, project, path, wantId))
      if (hit) {
        /* 已收藏：顺手把这个老条目的 fileId 补上（惰性升级），只在真改了时才回写。 */
        if (upgrade(hit, wantId)) await saveAll(ctx.storage, all)
        return { list, already: true }
      }
      const updated = [{
        project, path, name, isDir: body.isDir === true, at: Date.now(),
        ...(wantId !== null ? { fileId: wantId } : {}),
      }, ...list]
      all[u.username] = updated
      await saveAll(ctx.storage, all)
      return { list: updated, already: false }
    })
    const view = viewFor(ctx, svc, u, next, await visibleOf(svc, u))
    json(res, 200, already ? { ok: true, favorites: view, already: true } : { ok: true, favorites: view })
  }, 'favorites')
}
