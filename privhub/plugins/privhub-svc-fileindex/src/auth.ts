/**
 * 读路径端点（nginx 直读 + Node 降级）—— v6 §3.1 / §3.2
 *
 * `GET /privhub/api/file?id=<fileId>`（规范路径）
 * `GET /privhub/api/file-auth?id=<fileId>`（**同一条 handler** 的别名，见下「为什么两个路径」）
 *
 * ## 它解决什么
 *
 * 读路径提速后，**正常情况字节由 nginx 直接发给浏览器**（nginx 读盘 sendfile），
 * Node 只做判权、不搬数据。代价是：nginx 的 `alias` 没有 realpath 校验、
 * `auth_request` 也只看会话 ⇒ **整条权限链必须在本端点里完整跑一遍**，
 * 它是 nginx 发字节之前的最后一道（也是唯一一道）闸门。
 *
 * 顺序严格、且每一步都不得省略（详见 `authorize()`）：
 *   method → 登录 → id 形状 → 索引存在且是未删除的文件 → 项目级权限 →
 *   **个人空间归属** → **文件级 ACL** → 物理路径自证 → 分发明文/降级两路
 *
 * ## 两条最容易漏、也是本端点存在意义的规则
 *
 * 1. **个人空间是「另一条」规则，不是 canAccess 的子集。**
 *    `canAccess`（core:1014）对 admin 放行所有**项目**，而个人空间的规则是
 *    「仅归属者本人可见，管理员亦不可见」（core:816-823）。本端点用
 *    `ctx.privhub.isPersonalDir()` + `ownerOfPersonalDir()`（core:838/843，
 *    **公开方法**，含 retired 旧名 → 改过名之后旧名依旧按个人空间对待）
 *    显式再判一次。为什么已经在 `canAccess` 里判过还要再判：
 *    单点判断一旦被绕过（未来谁改了 canAccess、或加了包装层），越权范围是
 *    「管理员读到任意员工私人文件」，代价极高；这里是纵深防御的第二道。
 *
 * 2. **文件级 ACL 必须显式调用。**
 *    改造前它靠 `privhub-admin-acl` 包装 `svc.route` 自动生效，但那条机制
 *    只覆盖 GUARD_PATHS 表里登记的 `/api/*` 路由，**不会**覆盖本端点
 *    （本端点故意不登记进 GUARD_PATHS：它自己的判定顺序更严 —— ACL 之外
 *    还要判个人空间、还要自证物理路径 —— 走外部守卫反而会被"先 ACL 后
 *    个人空间"的顺序打乱，且守卫取 `?project=&path=` 而本端点只有 id）。
 *    因此这里显式 `ctx.acl.can(u, 'view', entry.project, entry.virtualPath)`。
 *
 * ## 两种收尾（**每次请求自适应，不问配置**）
 *
 * 判断依据只有一条：**磁盘上的这份字节现在是不是明文**（`storage.isEncrypted`）。
 *
 * | 情形 | 收尾 | 结果 |
 * |---|---|---|
 * | 明文（明文开关已开 / 本来就是明文的老文件） | `X-Accel-Redirect` → nginx sendfile | 快 |
 * | 密文（明文开关没开） | Node `storage.createReadStream` 解密流式发送 | 慢但正确 |
 * | `source='legacy'`（老库未迁移） | 同上，**一律降级** | 慢但正确 |
 *
 * **为什么不让 nginx 问「开关开没开」**：那等于要求部署时两处配置协调一致，
 * 任何一处漏配的结果都是「nginx 以为该直发、实际发出去的是密文乱码」——
 * 一个静默的、只在某个文件上暴露的数据错误。让 Node 每次自己读 20 字节文件头判定，
 * 则**开关开不开、老库迁没迁、存量是哪种格式，全都不需要协调**：
 * 能直发就直发，不能就自己发，功能永不坏，只是快慢不同。
 *
 * `source='legacy'` 即使当前是明文也降级：那份字节还在老库项目目录里，
 * 由 Node 自证路径比让 nginx 碰它更稳（老库是只读约定，不该被新读路径依赖）。
 *
 * ## 为什么两个路径
 *
 * `runtime/nginx.conf.template` 的 `/f/<id>` location 是把**主请求**直接
 * `proxy_pass` 到 `/privhub/api/file-auth`（不是 `auth_request` 子请求 ——
 * 模板注释里记着子请求里的 `X-Accel-Redirect` 不会被主响应消费，那条路已实测否定）。
 * 所以这条 URL 现在承担的是「读路径」，不是「auth_request 探针」。
 * 为免去一次模板改动（模板归另一个任务），`/file-auth` 与规范的 `/file`
 * **注册同一个 handler**；新代码请用 `/file`。
 *
 * ## 响应契约
 *
 * - 成功：`X-Accel-Redirect: /__privhub_internal/<相对路径>`（**URI**，非绝对路径）
 *   或 200/206 直接带字节；均带 `cache-control: no-store` + `nosniff`。
 * - 失败：`{ok:false,error:'<中文>'}`，**永不回物理路径**、永不回堆栈。
 * - 所有响应都带 `cache-control: no-store` —— 判权结果不能被任何一层缓存。
 *
 * @module privhub-svc-fileindex/auth
 */

/* 只做类型引用：运行时不得反向 import index.ts（否则与 apply 形成循环加载）。 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { existsSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { json, tokenOf } from '../../privhub-core/src/index'
import { parseSingleRange } from '../../privhub-core/src/http-range'
import type { FileIndexService } from './index'
import type { FileEntry } from './core'
import { contentTypeOf, isSvgExt } from './mime'

/** 规范读路径。 */
export const FILE_PATH = '/privhub/api/file'
/** 兼容路径：现行 nginx 模板的 `/f/<id>` 直接 proxy 到这里（见文件头「为什么两个路径」）。 */
export const FILE_AUTH_PATH = '/privhub/api/file-auth'

/**
 * nginx 内部落盘前缀。模板里 `location /__privhub_internal/ { internal; alias "{{DATA_FILES_DIR}}/"; }`
 * —— 即 URI 后缀会拼到**文件库根**后面，所以这里要发「相对文件库根」的路径，
 * 不能用 `basename`（`.pool/<id>.<ext>` 与老库 `<project>/<path>` 都是多级的）。
 */
export const INTERNAL_PREFIX = '/__privhub_internal/'

/**
 * 多卷直读的 URI 段前缀：`v-<卷id去掉V>--`。
 *
 * 为什么要有它：nginx 的 `alias` 是**一个字符串前缀**，单卷时代整个库根只有
 * 一个 alias。多卷时字节散在不同盘上，必须为每个卷配一个独立 location，
 * 也就必须让 accel URI 能区分「这条属于哪个卷」。
 *
 * 形状约定（必须与 `runtime/control.mjs` 生成模板时的规则**逐字一致**）：
 *
 * ```
 *   /__privhub_internal/v-<32hex>/...   → alias "<卷根>/"
 *   /__privhub_internal/<其余>           → alias "<DATA_FILES_DIR>/"（默认卷 + legacy）
 * ```
 *
 * 为什么用 `v-` 前缀而不是把卷根编进 URL：`alias` 只吃相对路径，
 * 绝对路径（`D:\`）拼进 URI 会被 nginx 当成不存在的路径。
 *
 * 为什么默认卷**不加前缀**：既有部署的 accel URI 全都长
 * `/__privhub_internal/.pool/<id>.<ext>`，加前缀会让那些 URL 全部失效
 * （浏览器缓存、正在播放的视频流、断点续传的下一次 Range 请求都会断）。
 * 保持默认卷的 URI 形状不变，升级才无感。
 */
export const VOLUME_URI_SEG = 'v-'

/** 从卷 id 算 accel URI 里的路径段；默认卷（null）返回空串。 */
export function volumeUriPrefixOf(volumeId: string | null | undefined): string {
  if (!volumeId) return ''
  /* 卷 id 是 `V` + 32 hex。去掉 `V`、加 `v-` 前缀和 `--` 后缀，
   * 让它绝不会与项目名冲突（项目名里出现 `v-<32hex>--` 是不可能的组合），
   * 也不会被误认为 `.pool`。 */
  const hex = volumeId.startsWith('V') ? volumeId.slice(1) : volumeId
  return VOLUME_URI_SEG + hex + '--'
}

/** 取卷服务（可能不存在 —— 单卷部署）。 */
function volumesOf(svc: FileIndexService): {
  get?: (id: string) => { root: string } | null
} | null {
  const c = svc as unknown as { ctx?: { reflect?: { get?: (k: string, d?: unknown) => unknown } } }
  return (c.ctx?.reflect?.get?.('volumes', false) ?? null) as never
}

/** 该条目的 accel URI 卷前缀（默认卷/无卷服务 → 空串）。 */
function volumeUriPrefix(svc: FileIndexService, entry: FileEntry): string {
  if (entry.source !== 'pool' || !entry.volumeId) return ''
  return volumeUriPrefixOf(entry.volumeId)
}

/** 该条目所在卷的根目录；取不到返回 null（调用方回落 dataFiles）。 */
function volumeRootOf(svc: FileIndexService, entry: FileEntry): string | null {
  if (entry.source !== 'pool' || !entry.volumeId) return null
  const vols = volumesOf(svc)
  if (!vols || typeof vols.get !== 'function') return null
  try {
    const v = vols.get(entry.volumeId)
    return v && typeof v.root === 'string' ? v.root : null
  } catch {
    return null
  }
}

/**
 * fileId 的合法形状。
 *
 * `newFileId()`（core:178）产出 `F + 时间戳36进制 + 4位36进制`，实际字符集是
 * `[a-z0-9]` 加前缀 `F`。这里放宽到 `[A-Za-z0-9_-]` 并限长：既覆盖当前实现，
 * 也不至于把将来的 ID 生成策略换掉就全站 404；同时把控制字符、`..`、`/`
 * 之类的东西挡在查表之前（它们本来也查不到，但少一次无意义的比较）。
 */
const FILE_ID_RE = /^[A-Za-z0-9_-]{1,64}$/

/** 授权通过后交给收尾分支的东西。 */
interface Authorized {
  entry: FileEntry
  /** 物理绝对路径（唯一来源 `resolvePhysical`，且已过 `withinNativeRoot` 自证）。 */
  physical: string
}

/** 授权结果：要么放行并给出条目，要么「响应已经写完」。 */
type AuthOutcome = { ok: true; value: Authorized } | { ok: false }

/**
 * 注册读路径（`/file` 与 `/file-auth` 同一 handler）。在 `apply` 里调用一行。
 *
 * @param ctx cordis 上下文（需 inject 了 `privhub` / `storage` / `acl`）
 * @param svc 本插件的索引服务（物理路径只从 `resolvePhysical` 来）
 */
export function registerFileRoutes(ctx: Context, svc: FileIndexService): void {
  const handler = makeHandler(ctx, svc)
  ctx.privhub.route(FILE_PATH, handler, 'file')
  ctx.privhub.route(FILE_AUTH_PATH, handler, 'file-auth')
}

function makeHandler(ctx: Context, svc: FileIndexService) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    /* 判权结果绝不能被缓存：一旦被 nginx/浏览器缓存，权限回收就不生效了。 */
    res.setHeader('cache-control', 'no-store')
    res.setHeader('x-content-type-options', 'nosniff')

    try {
      const got = await authorize(ctx, svc, req, res)
      if (!got.ok) return // 拒绝原因已在 authorize 内响应
      await send(ctx, svc, req, res, got.value)
    } catch (e) {
      /* 兜底：不回堆栈、不回物理路径。web-server 的全局 catch 也会兜住，
       * 但那里回的是英文 "internal server error"，与本仓中文信封约定不一致。 */
      console.error('[fileindex] 读路径异常：' + (e instanceof Error ? e.message : String(e)))
      if (!res.headersSent) json(res, 500, { ok: false, error: '读取失败' })
      else res.destroy()
    }
  }
}

/* ---------------- ①~⑧ 判权链 ---------------- */

/**
 * 完整判权链。**通过则什么都不写**（交给 `send`），拒绝则**自己写完响应**并返回 `{ok:false}`。
 *
 * 顺序不可调整：每一步都依赖前一步的产物，且「先判权、后碰磁盘」是硬要求
 * —— 未授权的请求连 `isEncrypted`（一次 open+read 20 字节）都不该触发。
 */
async function authorize(
  ctx: Context,
  svc: FileIndexService,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<AuthOutcome> {
  const privhub = ctx.privhub

  /* ① 方法。GET 取字节；HEAD 只取头（nginx 与浏览器都会发）。 */
  const method = (req.method ?? 'GET').toUpperCase()
  if (method !== 'GET' && method !== 'HEAD') {
    json(res, 405, { ok: false, error: '仅支持 GET/HEAD' })
    return { ok: false }
  }

  /* ② 登录。走 tokenOf：Bearer 优先、回退会话 Cookie ——
   * 浏览器拿 `<img>` / `<video>` 直接请求 /f/xxx 时带不了自定义头，
   * 只能靠 Cookie；nginx 已把 Cookie 头转发过来。 */
  const u = privhub.me(tokenOf(req))
  if (!u) {
    json(res, 401, { ok: false, error: '未登录' })
    return { ok: false }
  }

  /* ③ id 形状。 */
  const id = fileIdOf(req)
  if (id === null) {
    json(res, 400, { ok: false, error: '文件 ID 非法' })
    return { ok: false }
  }

  /* ④ 索引查行：不存在 / 目录 / 已进回收站一律 404。
   * 目录没有物理字节（虚拟目录），回收站文件不该还能被直读。 */
  const entry = svc.get(id)
  if (entry === null || entry.isDir || entry.trashed) {
    json(res, 404, { ok: false, error: '文件不存在' })
    return { ok: false }
  }

  /* ⑤ 项目级权限（个人空间的归属判断也在 canAccess 内，但见 ⑥）。 */
  if (!privhub.canAccess(u, entry.project)) {
    json(res, 403, { ok: false, error: '无权限' })
    return { ok: false }
  }

  /* ⑥ 个人空间：**另一条规则**，必须显式判（管理员同样不可见）。
   * ownerOfPersonalDir 同时覆盖 retired 旧名 → 改过名的旧目录不会被
   * 当成普通项目而让管理员看到历史文件。 */
  if (privhub.isPersonalDir(entry.project) && privhub.ownerOfPersonalDir(entry.project) !== u.username) {
    json(res, 403, { ok: false, error: '无权限' })
    return { ok: false }
  }

  /* ⑦ 文件级 ACL（改造前由 GUARD_PATHS 守卫自动完成，本端点必须显式调）。
   * 未命中任何规则时 `can` 返回 undefined = 放行（口径同 svc-acl:147）。 */
  const decision = ctx.acl.can(u, 'view', entry.project, entry.virtualPath)
  if (decision && !decision.allow) {
    json(res, 403, { ok: false, error: 'ACL 拒绝访问' })
    return { ok: false }
  }

  /* ⑦.5 卷离线：**必须与「文件不存在」区分开**。
   *
   * 卷掉线（NAS 断了 / 移动硬盘拔了 / 盘符没挂）时，文件其实还在，
   * 只是现在读不到。回 404 会让用户以为文件被删了，进而去回收站找、
   * 或者干脆重新上传一份 —— 两种反应都在制造新的混乱。
   *
   * 所以这里回 503 + 明确文案，让前端能显示「暂时不可用，请稍后重试」。
   * 判定放在物理路径解析**之前**：离线卷上的路径可能连 stat 都不该做
   * （网络盘 stat 会卡住几秒），先看卷状态能避免请求被拖死。 */
  const offline = volumeOffline(svc, entry)
  if (offline !== null) {
    json(res, 503, { ok: false, error: offline })
    return { ok: false }
  }

  /* ⑧ 物理路径：唯一来源是 resolvePhysical（别的插件/本端点都不许自己拼）。
   *    目录、缺 physicalId、非法 legacy 条目都会得到 null → 404。 */
  const physical = svc.resolvePhysical(entry)
  if (physical === null || !withinNativeRoot(svc, entry, physical)) {
    /* 越界说明索引条目被改过或损坏（索引是派生数据，走宽容口径）。
     * 只记一条服务端日志，对外仍是 404 —— 不回路径、不回原因。 */
    if (physical !== null) {
      console.warn('[fileindex] 拒绝越界的物理路径（id=' + entry.id + '，project=' + entry.project + '）')
    }
    json(res, 404, { ok: false, error: '文件不存在' })
    return { ok: false }
  }

  return { ok: true, value: { entry, physical } }
}

/* ---------------- ⑨ 两种收尾 ---------------- */

/** 分发：能交给 nginx 的发 `X-Accel-Redirect`，不能的由 Node 自己发（含 Range）。 */
async function send(
  ctx: Context,
  svc: FileIndexService,
  req: IncomingMessage,
  res: ServerResponse,
  { entry, physical }: Authorized,
): Promise<void> {
  /* 先确认磁盘上真有这份字节。
   *
   * 为什么在「交给 nginx」之前必须自己 stat 一次：索引是**派生数据**，
   * 允许落后于磁盘（迁移中途、外部删改、索引损坏后重建前）。若跳过这一步，
   * 我们会给 nginx 一个指向不存在文件的内部 URI —— 客户端拿到的是 nginx 的
   * 404 页面（HTML），而本端点的错误契约是 JSON 信封；更麻烦的是**当文件
   * 其实存在、只是索引指向了旧路径**时，用户会看到一个没有任何解释的 404。
   * 一次 stat 的成本远低于 `isEncrypted` 的 open+read（下面那条无论如何都要做）。 */
  if (!existsSync(physical)) {
    console.warn('[fileindex] 索引有条目但磁盘无字节（id=' + entry.id + '，project=' + entry.project + '）')
    json(res, 404, { ok: false, error: '文件不存在' })
    return
  }

  /* 降级判据只有两条，且都来自**这次请求的真实状态**，不来自配置：
   *   · `source='legacy'` —— 字节还在老库，不该让 nginx 碰（见文件头）；
   *   · `isEncrypted=true` —— 盘上是 PHENC1 密文，直发出去是乱码。
   * 其余一律直发。 */
  const legacy = entry.source === 'legacy'
  const encrypted = legacy ? true : await ctx.storage.isEncrypted(physical)

  /* 直读的前提是**前面真有 nginx**在消费 `X-Accel-Redirect`。没有它时该头
   * 会被直接丢弃，客户端拿到 204 + 0 字节 —— 文件"读不出来"却没有任何报错，
   * 是最难诊断的一类故障（实测：直连 Node 的 `/api/file` 就是这个症状）。
   *
   * 所以这里再判一次「本次请求是否经由 nginx」，**只认显式开关**：
   *   · `PRIVHUB_BEHIND_NGINX=1` —— control.mjs 启动槽时注入（槽必然在 nginx 后）；
   *   · 不设 —— 裸跑 Node（`npm run dev`），退回 Node 自己发字节。
   * 不用 `X-Real-IP` / `X-Forwarded-For` 猜：现行模板根本不设这两个头，
   * 靠 header 判定会把"有 nginx"误判成"没有"，于是每个字节又回到 Node 转发，
   * 读写分离静默失效 —— 那比直接不分离更糟，因为没人会发现。 */
  const behindNginx = process.env.PRIVHUB_BEHIND_NGINX === '1'

  /* 带 Range 的请求**不交给 nginx 直读**。
   *
   * 原因：`X-Accel-Redirect` 触发的是 nginx 的**内部重定向**，它会按新 URI
   * 重新走一遍 location 匹配 —— 原请求的 `Range` / `If-Range` 头不会被带到
   * 那个 internal location 上，于是 206 变成 200 整文件。表现就是 `<video>`
   * 拖进度条卡死、断点续传退化成从头下载。这与「下载可以慢，但必须能断点
   * 续传」的硬要求直接冲突，所以宁可让这部分字节过 Node。
   *
   * 代价可控：Range 请求只出现在播放/续传时，且通常只取一小段；
   * 而普通整文件预览（`<img>`、`<video>` 首帧、下载首包）仍然走 nginx。 */
  const hasRange = req.headers.range !== undefined

  if (!legacy && !encrypted && behindNginx && !hasRange) {
    redirectToNginx(svc, req, res, entry, physical)
    return
  }
  await sendFromNode(ctx, req, res, entry, physical)
}

/**
 * 明文直发：只回一个内部 URI，字节由 nginx 读盘 sendfile。
 *
 * 三个必须做对的细节：
 *  1. 值必须是 **URI 路径**而不是绝对路径 —— nginx 会对它 percent-decode 后
 *     拼到 internal location 的 `alias` 上；`D:\...` 会被当成不存在的 URI。
 *  2. 必须 **逐段** encode：`encodeURIComponent` 会把 `/` 也编成 `%2F`，
 *     整条路径就退化成一个文件名了。
 *  3. 相对的是**文件库根**（不是 `.pool`）：`alias "{{DATA_FILES_DIR}}/"` 前缀
 *     覆盖整个文件库，`.pool/` 与老库项目目录都在它下面。
 *
 * ## 这条 URI 长什么样（两种条目形态，别把 pool 的当通用）
 *
 * | 条目 | 物理路径 | accel URI | 含非 ASCII？ |
 * |---|---|---|---|
 * | `pool` | `<dataFiles>/.pool/<32hex>.<ext>` | `/__privhub_internal/.pool/<32hex>.<ext>` | **否，纯 ASCII** |
 * | `legacy`（尚未迁移） | `<legacyRoot>/<project>/<legacyPath>` | `/__privhub_internal/<project>/<legacyPath>` | **是**（项目名/原文件名往往是中文） |
 *
 * 池里之所以必然纯 ASCII：`newPhysicalId()`（core:204）产出 `randomUUID()` 去横线
 * = **32 位小写十六进制**，`resolvePhysical`（index.ts:335-339）拼的是
 * `<physicalId> + '.' + ext` —— 用户原名从不进物理文件名（原名只活在索引的 `name` 里）。
 * 所以「accel URI 含中文原文件名」对 pool 条目不成立。
 *
 * ⚠ 但 **legacy 条目是例外**：它拼的是老库里的真实层级，`<project>` 就是用户目录名
 * （本仓中文项目名是常态），`<legacyPath>` 是原名。所以逐段 encode 这条
 * **对 legacy 仍然必需**，不是摆设 —— 不要因为"池里都是 ASCII"就把它删掉。
 *
 * 不泄漏：nginx 会把 `X-Accel-Redirect` 从发给客户端的响应里剔除；
 * 直连 Node 的调试场景下会看到它，但那条 URI 只含「项目名 + 虚拟路径」
 * （正是 `/api/list` 本来就下发的信息），不含物理池 ID 之外的新信息，不算新增泄漏面。
 */
function redirectToNginx(
  svc: FileIndexService,
  req: IncomingMessage,
  res: ServerResponse,
  entry: FileEntry,
  physical: string,
): void {
  /* 多卷：字节可能在别的盘上，`relative(dataFiles, ...)` 会算出 `D:\...` 那种
   * 跨盘路径（`relative` 跨盘符直接返回绝对路径），于是下面那个检查会把它
   * 判成越界 → 404。所以先问卷服务：这个条目属于哪个卷，URI 该用哪个前缀。
   *
   * 单卷部署（没有卷服务 / volumeId 为空）时 `volPrefix` 是空串，
   * 拼出来的 URI 与改造前**完全一致**。 */
  const volPrefix = volumeUriPrefix(svc, entry)
  const root = volPrefix === null ? svc.dataFiles : volumeRootOf(svc, entry) ?? svc.dataFiles
  const rel = relative(root, physical)
  /* 理论上 withinNativeRoot 已保证在内；万一平台差异算出越界（如不同盘符），
   * 宁可 404 也不拼一个看着像 URI 的怪东西。 */
  if (rel === '' || rel.startsWith('..') || /^[A-Za-z]:/.test(rel)) {
    console.warn('[fileindex] 无法为直读构造内部 URI（id=' + entry.id + '）')
    json(res, 404, { ok: false, error: '文件不存在' })
    return
  }
  const uri = INTERNAL_PREFIX + volPrefix + rel.split(/[\\/]+/).map(encodeURIComponent).join('/')
  res.setHeader('X-Accel-Redirect', uri)
  /* Content-Type：**这里不发**。理由是被实测推翻过两轮的，记下来免得后人重犯 ——
   *
   * 走 X-Accel-Redirect 后，最终 Content-Type 由 **accel URI 自己的扩展名**决定
   * （nginx 内部跳转后按目标 URI 再查一次 `types{}`），**上游响应里的
   * `Content-Type` 被忽略**。隔离实验（公开 URL 固定，只变内部 URI）：
   *   `/f/x` + `.pool/id5.svg`  → image/svg+xml
   *   `/f/x.svg` + `.pool/id5.png` → image/png（内部 URI 说了算，不是公开 URL）
   *   `/f/x.wrongext` + `.pool/id5.svg` → image/svg+xml
   * 反过来，公开 URL 写什么扩展名都不影响结果。
   *
   * 顺带说明另一个被推翻的说法："nginx 按公开 URL 扩展名重算 MIME" 也是错的
   * （同上表第三行即可否证）。
   *
   * 所以 MIME 能否正确，取决于**本函数拼出来的 accel URI 有没有带对的扩展名**。
   * 本函数拼的是 `<INTERNAL_PREFIX>` + 物理相对路径，而 `resolvePhysical()` 给
   * 的文件名就是 `<physicalId>.<ext>`（ext 来自索引），**天然带真实扩展名**
   * ⇒ 图片/视频/SVG 的 MIME 自动正确，不需要在这里额外做任何事。
   *
   * 那为什么不再「顺手发一个 Content-Type 兜底」：实测它被忽略 ⇒ 发了也没用；
   * 而在「万一某些 nginx 版本会继承」的情形下，发一个保险的 `octet-stream`
   * 反而会把 nginx 本来能正确给成 `application/json` 的文件**降级成下载**。
   * 一个可能无效、又可能有害的头，不如不发。
   *
   * 真正会退化的只剩「索引里的 ext 为空」这一种（accel URI 无扩展名 →
   * `default_type` = octet-stream）。那是条目本身没有扩展名，与读路径无关。
   *
   * ⚠ 降级分支（`sendFromNode`，Node 自己发字节）不适用以上全部结论 ——
   * 那里 Node 直接写响应头，`contentTypeOf()` 是**真实生效**的，所以必须给。
   *
   * SVG 的严格 CSP 由模板里的 `map $uri ~*\.svg$` 加，与本文讨论的 MIME 无关联
   * （它匹配的正是内部跳转后的 accel URI）。 */
  /* 成功分支**不自己发 cache-control**：nginx 的 internal location 已经
   * `add_header Cache-Control "no-store"`，而 Cache-Control 正是上面那份保留清单里
   * 的一员 ⇒ 我在 204 上再设一次，最终响应会出两条同值头（实测确认，且
   * `proxy_hide_header` 对内部重定向并入的那条无效）。错误响应不经过 internal
   * location，所以入口处统一设的 no-store 对它们仍然是唯一来源。 */
  res.removeHeader('cache-control')
  res.removeHeader('content-type')
  /* 204 = 「我这里没有正文，去取这个 URI」。与 nginx 自带的 proxy_xar 测试
   * 以及 nginx-reader 实测链路一致；X-Accel-Redirect 由状态码无关的头触发，
   * 但用 204 语义最准，也让「Node 没发字节」这件事在抓包里一眼可见。 */
  res.writeHead(204)
  res.end()
}

/**
 * Node 自己发（密文解密 / 老库条目）。慢，但保证「开关没开、老文件没迁、
 * 存量是密文」这三种情况都能正常读，功能不坏。
 *
 * Range 逻辑与 `privhub-files` 的 `/preview-raw`（index.ts:357-413）**同口径**：
 * 只认单区间、三种失败都回 416 并带 `Content-Range: bytes *&#47;total`、
 * `total` 取**明文**长度（`plainSize`）而不是盘上长度 —— 密文多 20 字节头 +
 * 16 字节 tag，拿盘上长度当 total 会让浏览器的偏移整体错位。
 */
async function sendFromNode(
  ctx: Context,
  req: IncomingMessage,
  res: ServerResponse,
  entry: FileEntry,
  physical: string,
): Promise<void> {
  const isHead = (req.method ?? 'GET').toUpperCase() === 'HEAD'
  const contentType = contentTypeOf(entry.ext)

  /* 基础头：三种响应（200/206/416）共用。`no-store` 已在 handler 入口设过。
   * SVG 必须加严格 CSP（与 `preview-raw` 同口径）：同源存储型 XSS 的面。 */
  const base: Record<string, string | number> = {
    'content-type': contentType,
    'accept-ranges': 'bytes',
    'x-content-type-options': 'nosniff',
  }
  if (isSvgExt(entry.ext)) base['content-security-policy'] = "default-src 'none'; sandbox"

  let total: number
  try {
    total = Math.max(0, await ctx.storage.plainSize(physical))
  } catch {
    /* 索引有行、盘上没字节（迁移中途/被外部删掉）：对外 404，不回原因。 */
    console.warn('[fileindex] 读路径找不到物理字节（id=' + entry.id + '）')
    json(res, 404, { ok: false, error: '文件不存在' })
    return
  }

  const parsed = parseSingleRange(req.headers.range, total)
  if (parsed && !parsed.ok) {
    /* 语法坏 / 多区间 / 落在文件外 —— 三种都回 416（原因码在 http-range.ts 里分开了）。 */
    res.writeHead(416, { ...base, 'content-range': `bytes */${total}` })
    res.end()
    return
  }

  if (parsed && parsed.ok) {
    let chunk: Buffer
    try {
      chunk = await ctx.storage.readRange(physical, parsed.start, parsed.end)
    } catch {
      /* 区间在「明文长度」上合法却读不出来：文件在读取途中变了（或密文损坏）。
       * 不回半截数据，按 416 处理（浏览器会重发一次不带 Range 的请求，能自愈）。 */
      res.writeHead(416, { ...base, 'content-range': `bytes */${total}` })
      res.end()
      return
    }
    res.writeHead(206, {
      ...base,
      'content-length': chunk.length,
      'content-range': `bytes ${parsed.start}-${parsed.end}/${total}`,
    })
    res.end(chunk)
    return
  }

  /* 没带 Range：整段下发，**流式**（几十 MB 的视频不该先进内存）。
   * 整段读会自然走到文件末尾 ⇒ GCM tag 校验生效（区间读校验不了，见 storage.readRange）。 */
  res.writeHead(200, { ...base, 'content-length': total })
  if (isHead) {
    res.end()
    return
  }
  const stream = await ctx.storage.createReadStream(physical)
  stream.on('error', () => {
    console.error('[fileindex] 降级读流中断（id=' + entry.id + '）')
    try { res.destroy() } catch { /* 已断开的连接，忽略 */ }
  })
  stream.pipe(res)
}

/* ---------------- 内部工具 ---------------- */

/**
 * 取 id：优先查询串 `?id=`，其次 `X-Original-URI`（形如 `/f/<id>.pdf`）。
 *
 * 为什么留第二条通道：nginx 侧 `proxy_pass .../file-auth?id=$1`，一旦某个部署
 * 版本的 `$1` 为空（或 location 正则改了），整条读路径会全 400。
 * 让端点也能从 `X-Original-URI` 反解 id，nginx 配置两处任一正确就能工作。
 * 这不放松任何判权 —— 两条通道取到的 id 走的是同一套 ④~⑧。
 */
function fileIdOf(req: IncomingMessage): string | null {
  let raw = ''
  try {
    raw = (new URL(req.url ?? '/', 'http://localhost').searchParams.get('id') ?? '').trim()
  } catch { /* URL 解析失败：继续尝试 X-Original-URI */ }
  if (raw === '') raw = idFromOriginalUri(req.headers['x-original-uri'])
  return FILE_ID_RE.test(raw) ? raw : null
}

/** 从 `/f/<id>[.ext]` 里取 `<id>`；取不到返回空串。 */
function idFromOriginalUri(value: string | string[] | undefined): string {
  const uri = Array.isArray(value) ? value[0] : value
  if (typeof uri !== 'string' || uri === '') return ''
  const path = uri.split(/[?#]/)[0] ?? ''
  const seg = path.slice(path.lastIndexOf('/') + 1)
  /* 扩展名只是为了给 nginx 猜 MIME，不属于 ID（fileId 本身不含点）。 */
  const dot = seg.indexOf('.')
  return (dot < 0 ? seg : seg.slice(0, dot)).trim()
}

/** Windows 文件系统大小写不敏感：比较前统一小写，避免合法文件被误拒。 */
function normPath(p: string): string {
  return process.platform === 'win32' ? p.toLowerCase() : p
}

/**
 * 自证物理路径没有跑出「这条条目本来就该在的地方」。
 *
 * 为什么需要：`source='legacy'` 的物理路径是 `<legacyRoot>/<project>/<legacyPath>`，
 * 而 `legacyPath` / `legacyRoot` 都是索引文件里的字符串 —— 索引是**派生数据**
 * （宽容读取、可重建），一旦被改写或损坏成 `../../别的项目/机密.md`，nginx 就会
 * 照着这个路径发字节，权限链被完全绕过（⑥⑦ 判的是 `entry.project`，发的却是
 * 另一个项目的字节）。这里按条目类型卡死落点：
 *   - `pool`   → 必须在扁平池目录内（池内文件名 = 物理 ID，不可控）；
 *   - `legacy` → 必须在该条目所属项目目录内（老库尚未搬完的字节）。
 * 不满足就当「文件不存在」处理（fail-closed），并留一条服务端日志。
 *
 * ⚠️ 跨盘迁移（用户的真实场景：老库 E 盘、新库 F 盘）下，legacy 条目的基准
 * 根是 `legacyRoot` 而**不是**当前 `dataFiles`。早期实现这里写死了 `svc.dataFiles`，
 * 结果跨盘扫描出来的条目全部被判为「越界」→ 404，功能看着像没做。
 * 现在按条目自己记的根来判断，没有 legacyRoot 的老记录才回退到 dataFiles。
 */
function withinNativeRoot(svc: FileIndexService, entry: FileEntry, physical: string): boolean {
  if (entry.source === 'legacy') {
    const root = entry.legacyRoot && entry.legacyRoot !== '' ? resolve(entry.legacyRoot) : svc.dataFiles
    const base = resolve(root, entry.project)
    const p = normPath(physical)
    const b = normPath(base)
    return p === b || p.startsWith(b + sep)
  }
  /* 多卷：条目在哪个卷上，就以那个卷的池目录为根。
   *
   * 早期实现这里只认 `svc.poolDir`（默认卷），于是**其它卷上的文件全部被判越界
   * → 404**，而列表、上传、搬移全都正常 —— 症状是「文件明明在，就是打不开」，
   * 极易被误判成索引坏了。 */
  const pool = normPath(poolDirForEntry(svc, entry))
  return normPath(physical).startsWith(pool + sep)
}

/**
 * 该条目所在的卷是否离线。
 *
 * @returns 离线时返回给用户的文案；在线 / 无卷概念（单卷、legacy）返回 null。
 *
 * 判定口径：卷服务认为这块盘当前不可用（`resolveDir().online === false`）。
 * **不 stat 具体文件**：网络盘上 stat 一个不存在的路径可能要等好几秒，
 * 而卷级状态有缓存（默认 3 秒），代价低得多。
 */
function volumeOffline(svc: FileIndexService, entry: FileEntry): string | null {
  if (entry.source !== 'pool' || !entry.volumeId) return null
  const vols = volumesOf(svc) as {
    resolveDir?: (id: string | null) => { online: boolean }
    get?: (id: string) => { label?: string } | null
  } | null
  if (!vols || typeof vols.resolveDir !== 'function') return null
  let online = true
  try {
    online = vols.resolveDir(entry.volumeId).online !== false
  } catch {
    /* 卷服务内部异常：按「在线」处理，让后面的物理路径检查走正常 404/成功路径。
     * 宁可给一个普通错误，也不要因为卷服务抖动而把所有文件都报成「不可用」。 */
    return null
  }
  if (online) return null
  let label = ''
  try {
    const v = typeof vols.get === 'function' ? vols.get(entry.volumeId) : null
    if (v && typeof v.label === 'string') label = v.label
  } catch { /* 拿不到名字就用通用文案 */ }
  return '文件所在的存储卷「' + (label || entry.volumeId) + '」当前不可用（可能未挂载或网络中断），'
    + '请稍后重试或联系管理员检查存储设置。文件本身没有丢失。'
}

/**
 * 该条目所在的池目录。
 *
 * 卷服务不可用（单卷部署 / 卷配置读取失败）时回落默认池 ——
 * 与 `resolvePhysical` 的回落口径必须**完全一致**，否则会出现
 * 「路径算对了、越界判定用另一个根」的自相矛盾。
 */
function poolDirForEntry(svc: FileIndexService, entry: FileEntry): string {
  if (!entry.volumeId) return svc.poolDir
  const vols = volumesOf(svc) as { poolDirOf?: (id: string | null) => string } | null
  if (!vols || typeof vols.poolDirOf !== 'function') return svc.poolDir
  try {
    return vols.poolDirOf(entry.volumeId)
  } catch {
    return svc.poolDir
  }
}
