/**
 * 私域枢纽文件插件（privhub-files）
 *
 * 项目浏览、目录列表、预览、上传、新建文件夹、重命名、软删除。
 * 路径安全与权限判定复用 privhub-core 服务（ctx.privhub）。
 *
 * @module privhub-files
 */

import { writeFile, stat, rename, unlink, mkdir, readdir } from 'node:fs/promises'
import { join, resolve, extname, sep, basename } from 'node:path'
import { existsSync } from 'node:fs'
import { createHash, randomUUID } from 'node:crypto'
import { once } from 'node:events'
import type { Writable } from 'node:stream'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import { json, readBody } from '../../privhub-core/src/index'
import { lookupFileId } from '../../privhub-core/src/events'
import { isMediaExt } from '../../privhub-core/src/file-exts'
import { contentTypeOf } from '../../privhub-svc-fileindex/src/mime'
import { parseSingleRange } from '../../privhub-core/src/http-range'
import { NEAR_MAX_BYTES } from '../../privhub-svc-dup/src/core'

export const name = 'privhub-files'
export const inject = ['privhub', 'audit', 'storage', 'eventBus', 'lock', 'cap', 'dup']

/* ---------- B6：分片上传 / 断点续传 ----------
 *
 * 为什么需要：单次整文件 POST 在局域网里传大视频时，任何一次断网/关标签都会
 * 从 0 重传（issue #1 P0#1）。这里把大文件切成固定大小的分片，**每片独立
 * 加密落盘**；客户端按 uploadId 只补缺失分片，合并时才生成最终文件。
 *
 * 会话元数据与会话分片都在 `data/.upload-sessions/`，24h 未活动即清理；
 * 它们不属于用户文件，不参与索引/查重/回收站。
 */
const UPLOAD_CHUNK_SIZE = 8 * 1024 * 1024
const UPLOAD_SESSION_TTL_MS = 24 * 3600 * 1000
const UPLOAD_SESSION_CLEAN_INTERVAL_MS = 60 * 60 * 1000
/** randomUUID 的固定形状；同时用于挡住把 uploadId 当路径用的穿越尝试。 */
const UPLOAD_SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

interface UploadSession {
  id: string
  user: string
  project: string
  subPath: string
  name: string
  size: number
  key: string
  chunkSize: number
  createdAt: number
  updatedAt: number
  chunks: number[]
}

/** Y 批：名字级操作（重命名/移动/删除）撞上他人编辑锁时的统一文案。 */
function busyMsg(holder: string): string {
  return '文件正被 ' + holder + ' 修改，请稍后重试'
}

/** 上传超限（内置状态码，路由据此回 413 而不是笼统的 400）。 */
class UploadTooLargeError extends Error {
  readonly status = 413 as const
  constructor(readonly limitBytes: number) {
    super('文件过大（当前上限 ' + formatUploadSize(limitBytes) + '）')
    this.name = 'UploadTooLargeError'
  }
}

/** 人类可读的体积（用于「上限 8GB / 本次 9.2GB」这类可行动提示）。 */
function formatUploadSize(bytes: number): string {
  const GiB = 1024 * 1024 * 1024
  const MiB = 1024 * 1024
  if (bytes >= GiB) {
    const v = bytes / GiB
    return (Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)) + 'GB'
  }
  if (bytes >= MiB) {
    const v = bytes / MiB
    return (Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)) + 'MB'
  }
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + 'KB'
  return bytes + 'B'
}

/**
 * 超限时**先回 413 JSON，等响应真正写出后再断开请求**。
 *
 * 旧实现先 `req.destroy()` 再 `json(400)`：连接已经没了，那句「文件过大」永远
 * 到不了浏览器，客户端只能看到「网络错误」，于是反复重传同一个大文件
 * （GitHub issue #1 P0#2）。这里沿用 web-server `rejectTooLarge` 的证明过
 * 的顺序：res.end 回调里才 destroy。客户端（XHR）因此能读到 413 与真实原因。
 */
function replyUploadTooLarge(req: IncomingMessage, res: ServerResponse, limitBytes: number, actualBytes?: number): void {
  const sizeText = actualBytes !== undefined && Number.isFinite(actualBytes)
    ? '文件大小 ' + formatUploadSize(actualBytes) + '，'
    : ''
  const payload = JSON.stringify({
    ok: false,
    error: '文件过大：' + sizeText + '当前上限 ' + formatUploadSize(limitBytes)
      + '。管理员可在「系统设置 → 单文件上传上限」调整（0 = 不限），或压缩后再传。',
  })
  try {
    res.writeHead(413, {
      'content-type': 'application/json; charset=utf-8',
      'content-length': Buffer.byteLength(payload),
      connection: 'close',
      'x-content-type-options': 'nosniff',
    })
    res.end(payload, () => req.destroy())
  } catch {
    req.destroy()
  }
}

/**
 * JT-05：上传失败时对用户的说法。
 *
 * 之前直接把 `err.message` 抛给前端，ENAMETOOLONG / ENOENT 会把**服务器绝对路径**
 * （含部署目录名、盘符）原样显示在界面上；这对内网用户也没有任何行动价值。
 * 这里只按 errno 给可执行的下一步，其余一律归为「上传失败」。
 * 注意保留上传流程自己抛的那条中文文案（超 2GB），它不含路径且用户需要看到。
 */
function uploadErrorText(e: unknown): string {
  if (e instanceof Error && e.message.startsWith('文件过大')) return e.message
  const code = (e as { code?: string } | null)?.code
  switch (code) {
    case 'ENAMETOOLONG': return '文件名或路径过长，请缩短文件名后重试'
    case 'ENOENT': return '目标目录不存在，请刷新后重试'
    case 'EACCES': case 'EPERM': return '没有写入权限，请联系管理员'
    case 'ENOSPC': return '磁盘空间不足，请联系管理员'
    case 'EBUSY': return '文件被占用，请关闭后重试'
    default: return '上传失败，请重试或联系管理员'
  }
}

/** JT-05：单个文件名的字节上限。NTFS 单段上限 255 个 UTF-16 单元，中文名按 UTF-8
 *  最多 3 字节/字，200 字节留出安全余量，避免落到磁盘层才报 ENAMETOOLONG。 */
const MAX_NAME_BYTES = 200

export function apply(ctx: Context): void {
  const svc = ctx.privhub

  /* E1 事件声明（注册表） */
  ctx.eventBus.declareEmit('audit:logged', 'privhub-files', '写操作成功审计广播（S1 闭环）')
  ctx.eventBus.declareEmit('file:changed', 'privhub-files', '文件系统变更专用事件（创建/删除/重命名/移动）→ fulltext 索引维护')

  /* 文件变更广播（fulltext/kg 增量维护）
   *
   * B 批：payload 附带主索引的稳定 fileId，让按 ID 关联的侧车状态（评论/标签/
   * 版本/收藏/最近/全文/RAG/KG）不必各自实现「改名跟随」。
   * `lookupFileId` 内部已全程容错：索引缺失/未就绪/查不到/抛异常都只是让
   * fileId 留空，**绝不影响写入主流程**（索引是派生数据）。 */
  const changed = (project: string, path: string, action: string, newPath?: string, trashed?: boolean): void => {
    /* 改名/移动：ID 不变，但索引里的 virtualPath 可能已经跟着改了（或还没改），
     * 两个路径都试一次，纯查表、不额外开销。 */
    const fileId = lookupFileId(ctx, project, path) ?? (newPath ? lookupFileId(ctx, project, newPath) : undefined)
    ctx.emit('file:changed', {
      project, path, action, newPath,
      ...(fileId ? { fileId } : {}),
      ...(trashed === undefined ? {} : { trashed }),
    })
  }

  /* 审计埋点（F13 契约）：成功后写审计并广播 audit:logged；失败静默，不影响主流程 */
  const audit = async (u: { username: string }, action: string, target: string, detail?: string): Promise<void> => {
    const rec = await ctx.audit.log({ user: u.username, action, target, detail }).catch(() => null)
    if (rec) ctx.emit('audit:logged', rec)
  }

  /* ---------- 分片上传：会话存储 ---------- */

  const sessionJson = (id: string): string => join(svc.uploadSessionDir, id + '.json')
  const chunkPath = (id: string, index: number): string => join(svc.uploadSessionDir, id + '-' + index + '.chunk')
  const totalChunks = (s: UploadSession): number => Math.max(1, Math.ceil(s.size / s.chunkSize))
  const chunkBytes = (s: UploadSession, index: number): number => {
    const last = totalChunks(s) - 1
    return index < last ? s.chunkSize : Math.max(0, s.size - last * s.chunkSize)
  }

  /** 只做形状校验的读取（清理任务用，不绑定用户）。 */
  const loadSessionAny = async (id: string): Promise<UploadSession | null> => {
    if (!UPLOAD_SESSION_ID_RE.test(id)) return null
    try {
      const s = JSON.parse(await ctx.storage.readText(sessionJson(id))) as UploadSession
      return s && s.id === id ? s : null
    } catch { return null }
  }

  /** 按用户读取会话；不属于当前用户一律当「不存在」，不泄漏他人上传活动。 */
  const loadSession = async (id: string, u: { username: string }): Promise<UploadSession | null> => {
    const s = await loadSessionAny(id)
    if (!s || s.user !== u.username) return null
    if (Date.now() - s.updatedAt > UPLOAD_SESSION_TTL_MS) return null
    return s
  }

  const saveSession = async (s: UploadSession): Promise<void> => {
    await mkdir(svc.uploadSessionDir, { recursive: true })
    await ctx.storage.writeText(sessionJson(s.id), JSON.stringify(s))
  }

  const removeSession = async (id: string): Promise<void> => {
    if (!UPLOAD_SESSION_ID_RE.test(id)) return
    await unlink(sessionJson(id)).catch(() => {})
    const names = await readdir(svc.uploadSessionDir).catch(() => [] as string[])
    for (const n of names) {
      if (n.startsWith(id + '-')) await unlink(join(svc.uploadSessionDir, n)).catch(() => {})
    }
  }

  /** 返回磁盘上确实存在的分片序号（会话里记过、但文件被清理掉的不算）。 */
  const existingChunks = async (s: UploadSession): Promise<number[]> => {
    const out: number[] = []
    for (const i of s.chunks) {
      const st = await stat(chunkPath(s.id, i)).catch(() => null)
      /* 空文件只有一个 0 字节分片：存在即算到账（否则永远凑不齐）。 */
      if (st && st.isFile() && (st.size > 0 || s.size === 0)) out.push(i)
    }
    return out.sort((a, b) => a - b)
  }

  /** 断点续传：同用户 + 同目标 + 同大小 + 同 key 的未过期会话直接复用。 */
  const findResumableSession = async (
    u: { username: string }, project: string, subPath: string, name: string, size: number, key: string,
  ): Promise<UploadSession | null> => {
    const names = await readdir(svc.uploadSessionDir).catch(() => [] as string[])
    let best: UploadSession | null = null
    for (const n of names) {
      if (!n.endsWith('.json')) continue
      const s = await loadSessionAny(n.slice(0, -5))
      if (!s || s.user !== u.username) continue
      if (Date.now() - s.updatedAt > UPLOAD_SESSION_TTL_MS) { await removeSession(s.id); continue }
      if (s.project !== project || s.subPath !== subPath || s.name !== name || s.size !== size || s.key !== key) continue
      if (!best || s.updatedAt > best.updatedAt) best = s
    }
    return best
  }

  /** 会话清理：每小时最多一次，按「最后活动时间」删过期会话与孤儿分片。 */
  let lastSessionClean = 0
  const cleanExpiredSessions = async (): Promise<void> => {
    const now = Date.now()
    if (now - lastSessionClean < UPLOAD_SESSION_CLEAN_INTERVAL_MS) return
    lastSessionClean = now
    const names = await readdir(svc.uploadSessionDir).catch(() => [] as string[])
    for (const n of names) {
      if (!n.endsWith('.json')) continue
      const id = n.slice(0, -5)
      const s = await loadSessionAny(id)
      if (s && now - s.updatedAt <= UPLOAD_SESSION_TTL_MS) continue
      await removeSession(id)
    }
  }

  /**
   * 上传完成后的旁路元数据：内容指纹 → 同项目查重 → 登记。
   * 单次直传与分片合并共用一份实现，避免两条路径的查重口径漂移。
   * 任何失败只记日志，绝不影响「文件已经落盘成功」这个事实。
   */
  const finalizeUploadMeta = (
    /* 必须带 `role`：`ctx.cap.can()` 的 `Actor` 契约是 `{username, role}`，
     * 管理员恒可、普通用户按功能表判。之前这里只声明 `{username}`，
     * 于是类型上无法证明调用方传了 role —— 运行期靠调用方恰好传了完整用户对象
     * 才正确。类型写全，这个前提才被编译器守住。 */
    u: { username: string; role: string }, project: string, subPath: string, name: string, size: number,
    hasher: ReturnType<typeof createHash>, chunks: Buffer[], tooBigForNear: boolean,
  ): { exact: Array<{ path: string; size: number }>; near: Array<{ path: string; score: number }> } | null => {
    let dup: { exact: Array<{ path: string; size: number }>; near: Array<{ path: string; score: number }> } | null = null
    try {
      const rawHash = hasher.digest('hex')
      const fp = tooBigForNear ? { h: rawHash, size } : ctx.dup.fingerprint(Buffer.concat(chunks), rawHash)
      const relPath = (subPath ? subPath + '/' : '') + name
      // 功能开关（dup.prompt）：关掉就不查、不回带（管理员恒可；普通用户默认开、可关）。
      if (ctx.cap.can(u, 'dup.prompt', 'read')) dup = ctx.dup.check(project, relPath, fp)
      ctx.dup.register(project, relPath, fp)
    } catch (e) {
      ctx.logger?.warn?.('[upload] 查重旁路失败（不影响上传）：' + (e instanceof Error ? e.message : String(e)))
    }
    return dup
  }

  /* 项目列表（当前用户可见） */
  svc.route('/privhub/api/projects', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    /* 建项目（POST）。此前本路由不区分方法、永远只回列表，导致前端「新建项目」
     * 静默无效 —— 建完刷新列表还是空的。扁平化后项目只存在于索引里，
     * 没有磁盘目录可以「碰巧」证明它存在，这个缺陷才暴露出来。 */
    if (req.method === 'POST') {
      let body: { name?: unknown }
      try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
      const name = String(body.name ?? '').trim()
      if (name === '') return json(res, 400, { ok: false, error: '项目名不能为空' })
      if (!svc.isValidProjectName(name)) return json(res, 400, { ok: false, error: '项目名非法（不能含路径分隔符等字符）' })
      /* 已存在则幂等成功：重复点「新建」不该报错，也不该覆盖。 */
      const existing = await svc.allProjects()
      if (!existing.includes(name)) {
        const created = await svc.createProject(name)
        if (!created) return json(res, 400, { ok: false, error: '创建失败（项目名可能已存在或与个人空间重名）' })
        void audit(u, 'project-create', name, '')
      }
      json(res, 200, { ok: true, projects: await svc.visibleProjects(u) })
      return
    }
    if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'method not allowed' })
    json(res, 200, { ok: true, projects: await svc.visibleProjects(u) })
  }, 'projects')

  /* 列某项目内文件（支持子路径 path） */
  svc.route('/privhub/api/list', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    try {
      const url = new URL(req.url ?? '/', 'http://x')
      const project = url.searchParams.get('project') ?? ''
      const subPath = url.searchParams.get('path') ?? ''
      if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限访问该项目' })
      /* JT-06：项目目录已被删除/改名时，此前返回空目录 —— 用户看到的是"空的"，
       * 分不清是「本来就没文件」还是「项目已经不存在」。权限已过，这里只判存在性。
       * 前端 openDir 拿到 !ok 会把 error 弹出来（A6），无需改 UI。
       *
       * v6 扁平化后**磁盘上不再有项目目录**：文件字节全在 `.pool/` 里，项目只是
       * 索引里的一个字段。所以「项目是否存在」不能再问磁盘，否则升级后每个项目
       * 都会被判成「不存在」，整个界面打不开。
       * 判定顺序：
       *   ① 索引里有这个项目的任何条目（含目录/回收站之外）→ 存在；
       *   ② 索引不可用或为空（还没扫描）→ 回退到原来的磁盘判定，保持旧语义。
       * 两条都不满足才报 404。 */
      const fi = ctx.reflect?.get?.('fileindex', false) as { listProject?: (p: string) => unknown[] } | undefined
      let projectExists = false
      if (fi && typeof fi.listProject === 'function') {
        try { projectExists = fi.listProject(project).length > 0 } catch { /* 索引故障不挡读 */ }
      }
      if (!projectExists && !existsSync(join(svc.dataRoot, project))) {
        return json(res, 404, { ok: false, error: '项目不存在或已被删除（若刚刚改过名，请刷新项目列表）' })
      }
      json(res, 200, { ok: true, entries: await svc.listFiles(project, subPath) })
    } catch (e) { json(res, 400, { ok: false, error: e instanceof Error ? e.message : '读取失败' }) }
  }, 'list')

  /* 预览 */
  svc.route('/privhub/api/preview', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    const url = new URL(req.url ?? '/', 'http://x')
    const project = url.searchParams.get('project') ?? ''
    const path = url.searchParams.get('path') ?? ''
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    const r = await svc.readFileForPreview(project, path)
    if (!r) return json(res, 404, { ok: false, error: '无法预览' })
    /* 体积超限（type='too-large'）时把 size / limit 如实透给前端，
     * 供界面说清「多大、超出上限多少」并指向「下载后查看」。
     * 其余类型没有这两个字段，响应形状除新增可选字段外与原先一致。 */
    const body: { ok: true; type: string; data: string; size?: number; limit?: number } = { ok: true, type: r.type, data: r.data }
    if (typeof r.size === 'number') body.size = r.size
    if (typeof r.limit === 'number') body.limit = r.limit
    json(res, 200, body)
  }, 'preview')

  /* 预览原始字节流（供 img/iframe 直接加载图片与 PDF） */
  svc.route('/privhub/api/preview-raw', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    const url = new URL(req.url ?? '/', 'http://x')
    const project = url.searchParams.get('project') ?? ''
    const path = url.searchParams.get('path') ?? ''
    if (!svc.canAccess(u, project)) { res.writeHead(403); res.end('forbidden'); return }
    // S7 安全加固：realpath 校验防 junction/symlink 穿越
    const target = await svc.resolveReal(project, path)
    if (target === null || !existsSync(target)) { res.writeHead(404); res.end('not found'); return }
    const s = await stat(target)
    if (s.isDirectory()) { res.writeHead(404); res.end('not found'); return }
    const ext = extname(target).slice(1).toLowerCase()
    /* 【MIME 一处定义】走 `runtime/mime-map.json` —— 它与 nginx `types{}` 同源，
     * 是读路径唯一的 MIME 真相。
     *
     * 这里曾经手写一张只覆盖「图片 + PDF + 音视频」的表，文本类（含 Markdown）
     * 全部落到 `application/octet-stream`。后果是用户点开 `.md` 不是预览而是
     * 弹下载 —— 而 Markdown 恰恰是本系统最主要的文件类型。
     *
     * 那张手写表还有个更隐蔽的问题：它必须与 `file-exts.ts` 的集合逐项同步，
     * 靠 `tests/file-exts.mjs` 盯着。改成读共享表后，新增类型只改一处，
     * Node 与 nginx 自动同时跟上，**不可能再漂移**。
     *
     * SVG 要额外处理（见下），其余直接查表。 */
    const contentType = contentTypeOf(ext)

    /* ── 音视频：走 Range 分支（2026-10-09）────────────────────────────────
     * 为什么音视频要单独一条路：`<video>` 拖动进度条时发的是**字节区间**请求，
     * 服务端必须回 206 + `Content-Range`，否则浏览器只能整段下载后才允许 seek
     * （几十 MB 的文件表现就是"点了播放半天不动"）。图片/PDF 没有这个需求，
     * 一律走下面的原路 —— **本分支不改变它们一个字节**。
     *
     * `total` 取**明文**长度而不是 `stat().size`：盘上是 PHENC1 密文，多出 20 字节头 + 16 字节 tag，
     * 拿盘上长度当 total 会让浏览器算出的偏移整体错位（见 `storage.plainSize`）。 */
    if (isMediaExt(ext)) {
      const total = Math.max(0, await ctx.storage.plainSize(target))
      const parsed = parseSingleRange(req.headers.range, total)
      if (parsed && !parsed.ok) {
        /* 语法坏 / 多区间 / 落在文件外 —— 三种都回 416，但原因码不同（见 http-range.ts）。
         * `Content-Range: bytes *​/total` 是 416 的规定动作，浏览器据此知道真实总长。 */
        res.writeHead(416, {
          'content-range': `bytes */${total}`,
          'accept-ranges': 'bytes',
          'x-content-type-options': 'nosniff',
        })
        res.end()
        return
      }
      if (parsed && parsed.ok) {
        let chunk: Buffer
        try {
          chunk = await ctx.storage.readRange(target, parsed.start, parsed.end)
        } catch {
          /* 区间在"明文长度"上合法、却读不出来：文件在读取途中变了。
           * 不回半截数据，按 416 处理（浏览器会重发一次不带 Range 的请求，能自愈）。 */
          res.writeHead(416, { 'content-range': `bytes */${total}`, 'accept-ranges': 'bytes' })
          res.end()
          return
        }
        res.writeHead(206, {
          'content-type': contentType,
          'content-length': chunk.length,
          'content-range': `bytes ${parsed.start}-${parsed.end}/${total}`,
          'accept-ranges': 'bytes',
          'x-content-type-options': 'nosniff',
        })
        res.end(chunk)
        return
      }
      /* 没带 Range：整段下发，**流式**（不是 readBuffer —— 几十 MB 的视频不该先进内存）。
       * 带 `accept-ranges` 是告诉浏览器"可以来要区间"，这是能 seek 的前提。
       * 整段读会自然走到文件末尾 ⇒ GCM tag 校验生效（部分区间读校验不了，见 storage.readRange）。 */
      res.writeHead(200, {
        'content-type': contentType,
        'content-length': total,
        'accept-ranges': 'bytes',
        'x-content-type-options': 'nosniff',
      })
      const stream = await ctx.storage.createReadStream(target)
      stream.on('error', () => { try { res.destroy() } catch { /* 已断开的连接，忽略 */ } })
      stream.pipe(res)
      return
    }

    // S7：预览原始字节流解密读（图片/PDF 二进制，密文/明文自动识别）
    const body = await ctx.storage.readBuffer(target)
    // A13：SVG 可携带脚本 → 沙箱响应头禁止脚本执行；其余类型加 nosniff
    const headers: Record<string, string | number> = {
      'content-type': contentType,
      'content-length': body.length,
      'x-content-type-options': 'nosniff',
    }
    if (ext === 'svg') headers['content-security-policy'] = "default-src 'none'; sandbox"
    res.writeHead(200, headers)
    res.end(body)
  }, 'preview-raw')

  /* 上传文件（raw body：project/path/name 走查询参数，文件内容作为请求体） */
  svc.route('/privhub/api/upload', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    try {
      const url = new URL(req.url ?? '/', 'http://x')
      const project = url.searchParams.get('project') ?? ''
      const subPath = url.searchParams.get('path') ?? ''
      const name = url.searchParams.get('name') ?? ''
      if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限上传到该项目' })
      if (!svc.isValidName(name)) return json(res, 400, { ok: false, error: '文件名无效' })
      // JT-05：isValidName 只管字符合法性，不管长度；超长名此前要到磁盘层才炸，
      // 且错误文案会带上服务器绝对路径。这里提前拦下，给可执行的提示。
      if (Buffer.byteLength(name, 'utf8') > MAX_NAME_BYTES) {
        return json(res, 400, { ok: false, error: '文件名过长（中文约 60 字以内），请缩短后重试' })
      }
      /* 上传上限与设置面板同源：0 = 不限（默认）。每次上传实时读取，
       * 管理员改完设置立即生效，不再有「设置写 8GB、路由仍卡 2GB」的分裂。 */
      const limitBytes = await svc.uploadLimitBytes()
      if (limitBytes > 0) {
        const declared = Number(req.headers['content-length'])
        if (Number.isFinite(declared) && declared > limitBytes) {
          /* 绝大多数客户端都带 content-length：在读取请求体之前就拒绝，
           * 既不浪费流量，也能稳定把 413 送达（不必等流式超限再处理）。 */
          void audit(u, 'upload_fail', project + '/' + (subPath ? subPath + '/' : '') + name,
            'too_large size=' + declared + ' limit=' + limitBytes)
          return replyUploadTooLarge(req, res, limitBytes, declared)
        }
      }
      // S7 安全加固：realpath 校验防 junction 目录写穿越
      /* v6 扁平化：上传目标由 core 统一解析 —— 扁平池里落 `.pool/<physicalId>.<ext>`，
       * 传统布局仍落项目目录。**不能用 resolveReal(project, subPath)**：扁平化后
       * 磁盘上没有项目目录，那会永远返回「目标目录不存在」。
       *
       * 多卷：把「这次要写多少字节」传下去，让选卷时能留够空间。
       * 没有 content-length（chunked）时传 0 —— 只按水位判定，不预留具体大小。 */
      const declaredBytes = Number(req.headers['content-length'])
      const ut = await svc.resolveUploadTarget(
        project, subPath, name,
        Number.isFinite(declaredBytes) && declaredBytes > 0 ? declaredBytes : 0,
      )
      if (!ut.ok) {
        /* 区分两种失败：目录不存在是**用户操作问题**（400），
         * 没有可写卷是**运维问题**（507 Insufficient Storage）。
         * 用同一个 400 会让管理员去查用户，用同一个 507 会让用户以为服务器坏了。 */
        if (ut.reason === 'no-space') {
          return json(res, 507, {
            ok: false,
            error: '没有可用的存储空间：所有存储卷都已满、离线或已停用。请联系管理员检查存储设置。',
          })
        }
        return json(res, 400, { ok: false, error: '目标目录不存在' })
      }
      const dir = ut.dir
      /* A4（只做「不再静默」这一步）：同名文件已存在时【明确失败】，不再静默覆盖。
       *
       * 为什么不改写入语义、也不做自动备份：覆盖会改数据，属于「会动数据」的功能，
       * 按 Shape Up 的硬约束不适用轻量交付 —— 备份/版本历史要单独立项设计
       * （版本历史随覆盖清空的问题属另一批）。本批只让这一次拒绝被用户看见。
       * 校验必须在【读取请求体之前】，避免先落 .part 再报错、留下垃圾临时文件。
       * 已知影响面：同目录重名上传（含「复制副本」若同名副本已存在）会从
       * 「静默覆盖」变成「明确失败并在界面提示」，这是有意的行为变化。
       *
       * v6 冲突交互：用户明确要求「先查索引，再让用户选改名还是覆盖」。
       * 判定顺序是 **索引优先**（扁平化后磁盘上没有项目目录，`existsSync` 只看得到池），
       * 索引不可用时才回落到磁盘判定。冲突时不直接写，而是回 409 并带上
       * 可执行的选项：`conflict: true` + `suggestName`（服务端算好的不重名候选）
       * + `existing`（被挡住的条目信息），前端据此弹「改名 / 覆盖」二选一。
       * 覆盖必须由客户端显式带 `overwrite=1` 再来一次，绝不做静默覆盖。 */
      const vp = (subPath ? subPath + '/' : '') + name
      const overwrite = url.searchParams.get('overwrite') === '1'
      const fiUp = ctx.reflect?.get?.('fileindex', false) as
        { getByPath?: (p: string, v: string) => unknown; listDirItems?: (p: string, s?: string) => ReadonlyArray<{ name?: unknown; isDir?: unknown; size?: unknown; id?: unknown }> } | undefined
      let existing: { id?: unknown; size?: unknown; isDir?: unknown; physicalId?: unknown } | null = null
      if (fiUp && typeof fiUp.getByPath === 'function') {
        try {
          const e = fiUp.getByPath(project, vp) as { id?: unknown; size?: unknown; isDir?: unknown; physicalId?: unknown; trashed?: unknown } | null
          if (e && e.trashed !== true) existing = e
        } catch { /* 索引故障不挡上传判定，回落磁盘 */ }
      }
      const target = ut.target
      const onDisk = existsSync(target)
      if ((existing || onDisk) && !overwrite) {
        /* 服务端算一个不重名的候选名，前端可以直接拿来用，不必自己拼。 */
        let suggest = name
        try {
          const siblings = fiUp && typeof fiUp.listDirItems === 'function'
            ? fiUp.listDirItems(project, subPath).map((x) => String(x.name ?? ''))
            : []
          const dot = name.lastIndexOf('.')
          const stem = dot > 0 ? name.slice(0, dot) : name
          const ext = dot > 0 ? name.slice(dot) : ''
          for (let i = 2; i < 200; i++) {
            const cand = stem + ' (' + i + ')' + ext
            if (!siblings.includes(cand)) { suggest = cand; break }
          }
        } catch { /* 算不出候选就用原名，前端仍可自己输入 */ }
        return json(res, 409, {
          ok: false,
          conflict: true,
          error: '同名文件已存在：' + name,
          existing: existing ? { id: existing.id, size: existing.size } : null,
          suggestName: suggest,
          options: ['rename', 'overwrite'],
        })
      }
      // A11+S7：流式加密落盘（storage.createWriteStream 内部写密文头+加密流+末尾 tag），不整读进内存；超限中断清理
      const tmp = target + '.part'
      /* Q6（§3.3）上传期重复提示：一边流式落盘、一边算内容指纹。
       * 原始 sha256 全程流式累加（不占内存）；文本类小文件的规范化哈希与 MinHash 需要全文，
       * 所以只对 ≤ NEAR_MAX_BYTES 的请求把明文留在内存里，更大的只算原始哈希。
       * 这里是**旁路**：算指纹/查重出任何问题都不该让上传本身失败（见下方 try/catch）。 */
      const hasher = createHash('sha256')
      const chunks: Buffer[] = []
      let buffered = 0
      let tooBigForNear = false
      const size = await new Promise<number>((ok, fail) => {
        let written = 0
        let aborted = false
        void ctx.storage.createWriteStream(tmp).then(({ stream, done }) => {
          stream.on('error', (e) => { aborted = true; fail(e) })
          req.on('data', (c: Buffer) => {
            written += c.length
            hasher.update(c)
            if (!tooBigForNear) {
              if (buffered + c.length > NEAR_MAX_BYTES) { tooBigForNear = true; chunks.length = 0; buffered = 0 }
              else { chunks.push(c); buffered += c.length }
            }
            /* chunked / 无 content-length 的客户端走流式兜底。
             * 关键区别：这里**不再 req.destroy()** —— 先让 catch 分支把 413
             * 写出去（res.end 回调里才断开），客户端才能看到真实原因。
             * 停止读入时 unpipe + pause，避免把剩余字节继续灌进已销毁的流。 */
            if (limitBytes > 0 && written > limitBytes && !aborted) {
              aborted = true
              ;(stream as import('node:stream').Writable).destroy()
              req.unpipe(stream as import('node:stream').Writable)
              req.pause()
              fail(new UploadTooLargeError(limitBytes))
            }
          })
          req.on('error', (e) => { if (!aborted) { aborted = true; (stream as import('node:stream').Writable).destroy(); fail(e) } })
          req.pipe(stream as import('node:stream').Writable)
          ;(stream as import('node:stream').Writable).on('finish', () => {
            // 等全部密文（含 tag）落盘后再完成
            void done.then(() => { if (!aborted) ok(written) }, (e) => fail(e))
          })
        }).catch((e) => fail(e))
      }).catch(async (e) => { await unlink(tmp).catch(() => {}); throw e })
      await rename(tmp, target)
      /* v6 扁平化：文件已落到池里，必须登记进主索引，否则列表/直读都看不到它。
       * 登记失败不回滚字节（文件已经在盘上），但要**明确失败**——
       * 静默成功会造成「上传成功但界面没有」的幽灵文件，比报错难查得多。 */
      if (ut.flat && ut.physicalId) {
        const fi = ctx.reflect?.get?.('fileindex', false) as
          { createFile?: (i: { project: string; virtualPath: string; physicalId: string; size?: number; volumeId?: string | null }) => { id?: unknown } | null } | undefined
        if (overwrite && existing) {
          /* 覆盖：旧条目必须**先摘掉**再登记新条目，否则 byPath 里留着旧行，
           * 列表会出现两个同名文件（一个指向已不存在的池文件）。
           * 旧物理字节按引用计数释放：只有引用归零才真删，
           * 同一份字节被别的条目共享时不能删掉别人的文件。 */
          const fiAny = fi as unknown as {
            removeEntry?: (id: string) => unknown
            releasePhysical?: (pid: string, ext: string) => Promise<unknown>
          } | undefined
          const oldId = typeof (existing as { id?: unknown }).id === 'string' ? (existing as { id: string }).id : ''
          const oldPid = typeof (existing as { physicalId?: unknown }).physicalId === 'string'
            ? (existing as { physicalId: string }).physicalId : ''
          if (oldId !== '') fiAny?.removeEntry?.(oldId)
          if (oldPid !== '' && typeof fiAny?.releasePhysical === 'function') {
            const dot = name.lastIndexOf('.')
            const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
            await fiAny.releasePhysical(oldPid, ext).catch(() => { /* 释放失败不阻断上传 */ })
          }
        }
        {
          const created = fi?.createFile?.({
            project,
            virtualPath: vp,
            physicalId: ut.physicalId,
            size,
            /* 多卷：记下这次字节落在哪个卷上。单卷部署时是 null，
             * `createFile` 会**不写这个字段**（保持索引与改造前字节级一致）。 */
            volumeId: ut.volumeId ?? null,
          })
          if (!created || typeof created.id !== 'string') {
            ctx.logger?.warn?.('[upload] 索引登记失败：' + project + '/' + name)
            return json(res, 500, { ok: false, error: '文件已写入，但索引登记失败，请联系管理员（文件不会出现在列表中）' })
          }
        }
      }
      /* Q6：算指纹 → 同项目内查重（只提示）→ 登记，供下次上传命中（与分片合并共用）。 */
      const dup = finalizeUploadMeta(u, project, subPath, name, size, hasher, chunks, tooBigForNear)
      json(res, 200, { ok: true, size, ...(dup ? { duplicates: dup.exact, near: dup.near } : {}) })
      void audit(u, 'upload', project + '/' + (subPath ? subPath + '/' : '') + name, 'size=' + size)
      changed(project, (subPath ? subPath + '/' : '') + name, 'created')
    } catch (e) {
      // JT-05：不经 err.message 直传，避免 errno/绝对路径泄漏到界面（见 uploadErrorText）
      ctx.logger?.warn?.('[upload] 失败：' + (e instanceof Error ? e.message : String(e)))
      /* 流式超限：临时文件已在 promise 的 catch 里清理；这里先写 413，再断连接。 */
      if (e instanceof UploadTooLargeError) {
        replyUploadTooLarge(req, res, e.limitBytes)
        return
      }
      json(res, 400, { ok: false, error: uploadErrorText(e) })
    }
  }, 'upload')

  /* ══════════ B6：分片上传（断点续传）══════════
   *
   * 三段式：init 建会话 → chunk 逐片上传（可乱序/重复，缺哪片补哪片）→ complete 合并。
   * 与单次 POST 并存：小文件仍走 /upload，大文件走这里；两者最终落盘格式完全一致
   * （仍是 storage.createWriteStream 的加密流），下游预览/检索/查重无需区分来源。
   */

  /* 建会话（幂等：同一文件再次 init 会拿回已有 uploadId 与已收分片） */
  svc.route('/privhub/api/upload/init', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = String(body.project ?? '')
    const subPath = String(body.path ?? '')
    const name = String(body.name ?? '')
    const size = Number(body.size)
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限上传到该项目' })
    if (!svc.isValidName(name)) return json(res, 400, { ok: false, error: '文件名无效' })
    if (Buffer.byteLength(name, 'utf8') > MAX_NAME_BYTES) {
      return json(res, 400, { ok: false, error: '文件名过长（中文约 60 字以内），请缩短后重试' })
    }
    if (!Number.isSafeInteger(size) || size < 0) return json(res, 400, { ok: false, error: '文件大小无效' })
    const limitBytes = await svc.uploadLimitBytes()
    if (limitBytes > 0 && size > limitBytes) {
      void audit(u, 'upload_fail', project + '/' + (subPath ? subPath + '/' : '') + name,
        'too_large size=' + size + ' limit=' + limitBytes)
      return json(res, 413, {
        ok: false,
        error: '文件过大：文件大小 ' + formatUploadSize(size) + '，当前上限 ' + formatUploadSize(limitBytes)
          + '。管理员可在「系统设置 → 单文件上传上限」调整（0 = 不限），或压缩后再传。',
      })
    }
    /* v6 扁平化：分片上传的目标目录同样不能再问 resolveReal ——
     * 磁盘上没有项目目录，那会永远 400。改为：扁平池模式直接放行（目录是虚拟的，
     * 存在性由索引保证），传统布局才校验物理目录。 */
    const fiInit = ctx.reflect?.get?.('fileindex', false) as
      { getByPath?: (p: string, v: string) => { trashed?: unknown } | null } | undefined
    const flat = !!(fiInit && typeof fiInit.getByPath === 'function')
    if (!flat) {
      const dir = await svc.resolveReal(project, subPath)
      if (dir === null || !existsSync(dir)) return json(res, 400, { ok: false, error: '目标目录不存在' })
    }
    /* 同名冲突：与整文件上传同口径 —— 索引优先、带 conflict 标记让前端二选一。
     * 分片上传的覆盖由 complete 阶段处理（客户端会在 init 时带 overwrite=1）。 */
    const vpInit = (subPath ? subPath + '/' : '') + name
    const overwriteInit = body.overwrite === true || body.overwrite === 1 || body.overwrite === '1'
    if (!overwriteInit) {
      let clash = false
      if (fiInit && typeof fiInit.getByPath === 'function') {
        try {
          const e = fiInit.getByPath(project, vpInit)
          if (e && e.trashed !== true) clash = true
        } catch { /* 索引故障不挡上传 */ }
      }
      if (!clash) {
        const dir2 = await svc.resolveReal(project, subPath)
        if (dir2 !== null && existsSync(join(dir2, name))) clash = true
      }
      if (clash) {
        let suggest = name
        try {
          const fiList = ctx.reflect?.get?.('fileindex', false) as
            { listDirItems?: (p: string, s?: string) => ReadonlyArray<{ name?: unknown }> } | undefined
          const siblings = fiList && typeof fiList.listDirItems === 'function'
            ? fiList.listDirItems(project, subPath).map((x) => String(x.name ?? ''))
            : []
          const dot = name.lastIndexOf('.')
          const stem = dot > 0 ? name.slice(0, dot) : name
          const ext = dot > 0 ? name.slice(dot) : ''
          for (let i = 2; i < 200; i++) {
            const cand = stem + ' (' + i + ')' + ext
            if (!siblings.includes(cand)) { suggest = cand; break }
          }
        } catch { /* 用原名兜底 */ }
        return json(res, 409, {
          ok: false,
          conflict: true,
          error: '同名文件已存在：' + name,
          suggestName: suggest,
          options: ['rename', 'overwrite'],
        })
      }
    }
    /* key 由客户端按「项目/目录/文件名/大小/修改时间」生成（FNV 摘要即可）：
     * 刷新页面后重新选择同一个文件，仍能命中未完成会话。 */
    const key = String(body.key ?? '').slice(0, 200) || (project + '|' + subPath + '|' + name + '|' + size)
    await cleanExpiredSessions()
    const found = await findResumableSession(u, project, subPath, name, size, key)
    if (found) {
      found.chunks = await existingChunks(found)
      found.updatedAt = Date.now()
      await saveSession(found)
      return json(res, 200, {
        ok: true, uploadId: found.id, chunkSize: found.chunkSize,
        uploaded: found.chunks, total: totalChunks(found), resumed: true,
      })
    }
    const s: UploadSession = {
      id: randomUUID(), user: u.username, project, subPath, name, size, key,
      chunkSize: UPLOAD_CHUNK_SIZE, createdAt: Date.now(), updatedAt: Date.now(), chunks: [],
    }
    await saveSession(s)
    json(res, 200, { ok: true, uploadId: s.id, chunkSize: s.chunkSize, uploaded: [], total: totalChunks(s), resumed: false })
  }, 'upload-init')

  /* 上传单个分片（原始字节 body；元数据走查询参数，与 /upload 一致） */
  svc.route('/privhub/api/upload/chunk', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    const url = new URL(req.url ?? '/', 'http://x')
    const project = url.searchParams.get('project') ?? ''
    const subPath = url.searchParams.get('path') ?? ''
    const id = url.searchParams.get('id') ?? ''
    const index = Number(url.searchParams.get('index'))
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限上传到该项目' })
    const s = await loadSession(id, u)
    if (!s) return json(res, 404, { ok: false, error: '上传会话不存在或已过期，请重新上传' })
    if (s.project !== project || s.subPath !== subPath) {
      return json(res, 403, { ok: false, error: '上传会话与目标目录不一致' })
    }
    const total = totalChunks(s)
    if (!Number.isInteger(index) || index < 0 || index >= total) {
      return json(res, 400, { ok: false, error: '分片序号无效' })
    }
    const expected = chunkBytes(s, index)
    const declared = Number(req.headers['content-length'])
    if (Number.isFinite(declared) && declared !== expected) {
      return json(res, 400, { ok: false, error: '分片大小不符（期望 ' + expected + ' 字节）' })
    }
    const file = chunkPath(id, index)
    const tmp = file + '.part'
    try {
      const { stream, done } = await ctx.storage.createWriteStream(tmp)
      const w = stream as Writable
      let written = 0
      let overflow = false
      await new Promise<void>((ok, fail) => {
        let settled = false
        const finish = (fn: (v?: unknown) => void, v?: unknown): void => { if (!settled) { settled = true; fn(v) } }
        req.on('data', (c: Buffer) => {
          written += c.length
          /* 声明大小被突破：立刻停止落盘（继续消费请求但不再写），收尾后回错误。
           * 不能 destroy 写流 —— storage 的密文流是「cipher → fileStream」管道，
           * 只销毁 cipher 不会关闭底层文件句柄，会留下删不掉的 .part。 */
          if (!overflow && written > expected) {
            overflow = true
            req.unpipe(w)
            w.end()
            void done.catch(() => {})
            req.resume()
          }
        })
        req.on('error', (e) => {
          req.unpipe(w)
          w.end()
          void done.then(() => finish(fail, e), () => finish(fail, e))
        })
        req.pipe(w)
        w.on('finish', () => { void done.then(() => finish(ok), (e) => finish(fail, e)) })
      })
      if (overflow || written !== expected) throw new Error('分片大小不符')
      await rename(tmp, file)
    } catch (e) {
      await unlink(tmp).catch(() => {})
      ctx.logger?.warn?.('[upload-chunk] 失败：' + (e instanceof Error ? e.message : String(e)))
      return json(res, 400, { ok: false, error: '分片写入失败，请重试' })
    }
    /* 会话是「读 → 改 → 写」：用 core 的串行锁避免两个并发分片丢序号。 */
    const after = await svc.withFileLock(sessionJson(id), async () => {
      const cur = await loadSession(id, u)
      if (!cur) return null
      if (!cur.chunks.includes(index)) cur.chunks.push(index)
      cur.chunks.sort((a, b) => a - b)
      cur.updatedAt = Date.now()
      await saveSession(cur)
      return cur
    })
    if (!after) return json(res, 404, { ok: false, error: '上传会话已失效' })
    json(res, 200, { ok: true, index, received: after.chunks.length, total })
  }, 'upload-chunk')

  /* 合并所有分片 → 按单次上传同样的加密格式落到目标文件 */
  svc.route('/privhub/api/upload/complete', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = String(body.project ?? '')
    const subPath = String(body.path ?? '')
    const name = String(body.name ?? '')
    const id = String(body.id ?? '')
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限写入该项目' })
    const s = await loadSession(id, u)
    if (!s) return json(res, 404, { ok: false, error: '上传会话不存在或已过期，请重新上传' })
    if (s.project !== project || s.subPath !== subPath || s.name !== name) {
      return json(res, 403, { ok: false, error: '上传会话与目标文件不一致' })
    }
    const total = totalChunks(s)
    const present = await existingChunks(s)
    if (present.length !== total) {
      const missing: number[] = []
      for (let i = 0; i < total; i++) if (!present.includes(i)) missing.push(i)
      return json(res, 409, { ok: false, error: '还有分片未上传（缺 ' + missing.length + ' 片）', missing, received: present.length, total })
    }
    /* v6 扁平化：合并目标同样要走 resolveUploadTarget（池路径 + 索引登记），
     * 不能再用 resolveReal + join(dir, name)。 */
    const utc = await svc.resolveUploadTarget(project, subPath, name)
    if (!utc.ok) {
      if (utc.reason === 'no-space') {
        return json(res, 507, {
          ok: false,
          error: '没有可用的存储空间：所有存储卷都已满、离线或已停用。请联系管理员检查存储设置。',
        })
      }
      return json(res, 400, { ok: false, error: '目标目录不存在' })
    }
    const target = utc.target
    let merged: { size: number; dup: ReturnType<typeof finalizeUploadMeta> }
    try {
      merged = await svc.withFileLock('upload-complete:' + id, async () => {
        const cur = await loadSession(id, u)
        if (!cur) throw new Error('上传会话已失效')
        const now = await existingChunks(cur)
        if (now.length !== total) throw new Error('分片不完整')
        const tmp = target + '.part'
        const hasher = createHash('sha256')
        const chunks: Buffer[] = []
        let buffered = 0
        let tooBigForNear = false
        let written = 0
        const { stream, done } = await ctx.storage.createWriteStream(tmp)
        try {
          for (const idx of now) {
            const rs = await ctx.storage.createReadStream(chunkPath(cur.id, idx))
            for await (const c of rs) {
              const buf = c as Buffer
              written += buf.length
              hasher.update(buf)
              if (!tooBigForNear) {
                if (buffered + buf.length > NEAR_MAX_BYTES) { tooBigForNear = true; chunks.length = 0; buffered = 0 }
                else { chunks.push(buf); buffered += buf.length }
              }
              if (!(stream as Writable).write(buf)) await once(stream as Writable, 'drain')
            }
          }
          ;(stream as Writable).end()
          await done
        } catch (e) {
          /* 收尾而不是 destroy：密文写流必须走 end() 才会关闭底层文件句柄、
           * 让 .part 在 Windows 上能被删除（见 chunk 路由同处注释）。 */
          try { (stream as Writable).end() } catch { /* 已销毁 */ }
          await done.catch(() => {})
          await unlink(tmp).catch(() => {})
          throw e
        }
        if (written !== cur.size) {
          await unlink(tmp).catch(() => {})
          throw new Error('分片总大小与声明不一致')
        }
        await rename(tmp, target)
        /* v6 扁平化：分片合并完也必须登记索引，否则字节在池里、列表里看不见。
         * 覆盖场景（init 时带了 overwrite=1）先摘掉旧条目，避免出现同名幽灵行。 */
        const fiC = ctx.reflect?.get?.('fileindex', false) as {
          getByPath?: (p: string, v: string) => { id?: unknown; physicalId?: unknown } | null
          removeEntry?: (id: string) => unknown
          releasePhysical?: (pid: string, ext: string) => Promise<unknown>
          createFile?: (i: { project: string; virtualPath: string; physicalId: string; size?: number }) => { id?: unknown } | null
        } | undefined
        if (fiC && typeof fiC.createFile === 'function') {
          const vpC = (subPath ? subPath + '/' : '') + name
          if (typeof fiC.getByPath === 'function') {
            const old = fiC.getByPath(project, vpC)
            if (old && typeof old.id === 'string') {
              fiC.removeEntry?.(old.id)
              if (typeof old.physicalId === 'string' && old.physicalId !== '' && typeof fiC.releasePhysical === 'function') {
                const dotC = name.lastIndexOf('.')
                const extC = dotC > 0 ? name.slice(dotC + 1).toLowerCase() : ''
                await fiC.releasePhysical(old.physicalId, extC).catch(() => { /* 释放失败不阻断 */ })
              }
            }
          }
          /* 只有扁平池才有 physicalId；传统布局（没 physicalId）不需要登记索引，
           * 文件本来就在项目目录里，listFiles 走磁盘分支能看见。 */
          if (typeof utc.physicalId === 'string' && utc.physicalId !== '') {
            const createdC = fiC.createFile({
              project, virtualPath: vpC, physicalId: utc.physicalId, size: cur.size,
            })
            if (!createdC || typeof createdC.id !== 'string') {
              ctx.logger?.warn?.('[upload-complete] 索引登记失败：' + project + '/' + name)
              throw new Error('索引登记失败')
            }
          }
        }
        const dup = finalizeUploadMeta(u, project, subPath, name, cur.size, hasher, chunks, tooBigForNear)
        await removeSession(cur.id)
        return { size: written, dup }
      })
    } catch (e) {
      ctx.logger?.warn?.('[upload-complete] 失败：' + (e instanceof Error ? e.message : String(e)))
      return json(res, 409, { ok: false, error: '合并失败：分片不完整或会话已失效，请重新上传' })
    }
    json(res, 200, { ok: true, size: merged.size, ...(merged.dup ? { duplicates: merged.dup.exact, near: merged.dup.near } : {}) })
    void audit(u, 'upload', project + '/' + (subPath ? subPath + '/' : '') + name, 'size=' + merged.size + ' chunks=' + total)
    changed(project, (subPath ? subPath + '/' : '') + name, 'created')
  }, 'upload-complete')

  /* 放弃上传（主动取消或客户端决定不再续传）；未完成会话到期也会被清理 */
  svc.route('/privhub/api/upload/abort', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const id = String(body.id ?? '')
    const s = await loadSession(id, u)
    if (!s) return json(res, 200, { ok: true })  // 已不存在 = 目标状态
    await removeSession(s.id)
    json(res, 200, { ok: true })
  }, 'upload-abort')

  /* 新建文件夹（支持在子路径 path 下创建） */
  svc.route('/privhub/api/mkdir', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = String(body.project ?? '')
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    const subPath = String(body.path ?? '')
    const ok = await svc.createFolder(project, subPath, String(body.name ?? ''))
    json(res, ok ? 200 : 400, ok ? { ok: true } : { ok: false, error: '新建失败' })
    if (ok) void audit(u, 'mkdir', project + '/' + (subPath ? subPath + '/' : '') + String(body.name ?? ''))
    if (ok) changed(project, (subPath ? subPath + '/' : '') + String(body.name ?? ''), 'created')
  }, 'mkdir')

  /* 删除文件/文件夹（软删除，进回收站） */
  svc.route('/privhub/api/delete', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = String(body.project ?? '')
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    const delPath = String(body.path ?? '')
    /* Y 批：删除是「名字级」操作——若该文件（或其祖先目录）正被他人编辑，先拦下 */
    const r = await ctx.lock.withNameLock(u.username, project, [delPath], () => svc.moveToTrash(project, delPath, u.username))
    if (!r.ok) return json(res, 409, { ok: false, error: busyMsg(r.holder.user), holder: r.holder.user })
    const ok = r.value
    json(res, ok ? 200 : 400, ok ? { ok: true } : { ok: false, error: '删除失败' })
    if (ok) void audit(u, 'delete', project + '/' + delPath)
    if (ok) changed(project, delPath, 'deleted', undefined, true)
  }, 'delete')

  /* 重命名 */
  svc.route('/privhub/api/rename', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = String(body.project ?? '')
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    const renPath = String(body.path ?? '')
    /* Y 批：重命名是名字级操作——正在被他人编辑的文件不许改名 */
    const r = await ctx.lock.withNameLock(u.username, project, [renPath], () => svc.renameEntry(project, renPath, String(body.newName ?? '')))
    if (!r.ok) return json(res, 409, { ok: false, error: busyMsg(r.holder.user), holder: r.holder.user })
    const ok = r.value
    json(res, ok ? 200 : 400, ok ? { ok: true } : { ok: false, error: '重命名失败' })
    if (ok) void audit(u, 'rename', project + '/' + renPath, '-> ' + String(body.newName ?? ''))
    if (ok) {
      // newPath：同目录新名（目录内文件路径 → 替换最后一段）
      const p = renPath.replace(/\\/g, '/')
      const newPath = p.includes('/') ? p.slice(0, p.lastIndexOf('/') + 1) + String(body.newName ?? '') : String(body.newName ?? '')
      changed(project, p, 'renamed', newPath)
    }
  }, 'rename')

  /* 移动：把项目内条目移动到另一目录（同卷 rename；目标必须已存在且无同名） */
  svc.route('/privhub/api/move', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = String(body.project ?? '')
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    const from = String(body.from ?? '')
    const toDir = String(body.toDir ?? '').trim().replace(/^\/+|\/+$/g, '')
    /* v6 扁平化：移动优先走索引 —— 磁盘上没有项目目录，纯物理 rename 必然「源不存在」。
     * 扁平池里移动只是改 virtualPath（零字节搬运），物理文件按 physicalId 原地不动。 */
    const fiMove = ctx.reflect?.get?.('fileindex', false) as {
      getByPath?: (p: string, v: string) => { id?: unknown; isDir?: unknown } | null
      moveEntry?: (id: string, toDir: string) => number
    } | undefined
    if (fiMove && typeof fiMove.moveEntry === 'function' && typeof fiMove.getByPath === 'function') {
      try {
        const srcEntry = fiMove.getByPath(project, from)
        if (srcEntry && typeof srcEntry.id === 'string') {
          /* 返回值语义：-1 = 失败（目标目录不存在 / 同名冲突），
           * 0 = 已经在目标目录，>0 = 受影响条目数。只有 -1 才算失败。 */
          const moved = fiMove.moveEntry(srcEntry.id, toDir)
          if (typeof moved === 'number' && moved >= 0) {
            const newPath = toDir === '' ? basename(from) : toDir + '/' + basename(from)
            json(res, 200, { ok: true, to: toDir === '' ? '' : newPath })
            void audit(u, 'move', project + '/' + from, '-> ' + newPath)
            changed(project, from, 'moved', newPath)
            return
          }
          if (moved === -1) {
            /* 索引明确拒绝：给出与物理实现同口径的错误，不再往下走物理分支
             * （扁平池下物理分支必然「源不存在」，会把真实原因盖掉）。 */
            return json(res, 400, { ok: false, error: '目标目录不存在或已存在同名项' })
          }
        }
      } catch { /* 索引异常 → 落到物理实现 */ }
    }
    const base = resolve(svc.dataRoot, project)
    const src = resolve(base, from)
    if (src === base || !src.startsWith(base + sep) || !existsSync(src)) return json(res, 400, { ok: false, error: '源不存在' })
    const destDir = toDir === '' ? base : resolve(base, toDir)
    if (destDir !== base && (!destDir.startsWith(base + sep) || !existsSync(destDir))) return json(res, 400, { ok: false, error: '目标目录不存在' })
    if (destDir === src) return json(res, 400, { ok: false, error: '已在目标目录' })
    const dest = join(destDir, basename(src))
    if (existsSync(dest)) return json(res, 400, { ok: false, error: '目标目录已存在同名项' })
    try {
      /* Y 批：移动是名字级操作——源文件或目标目录被他人锁着则拒绝 */
      const lr = await ctx.lock.withNameLock(
        u.username, project, [from, toDir].filter((x) => x !== ''),
        async () => { await rename(src, dest) },
      )
      if (!lr.ok) return json(res, 409, { ok: false, error: busyMsg(lr.holder.user), holder: lr.holder.user })
      json(res, 200, { ok: true, to: toDir === '' ? '' : toDir + '/' + basename(src) })
      void audit(u, 'move', project + '/' + from, '-> ' + (toDir === '' ? '' : toDir + '/') + basename(src))
      changed(project, from, 'moved', toDir === '' ? basename(src) : toDir + '/' + basename(src))
    } catch (e) {
      json(res, 400, { ok: false, error: e instanceof Error ? e.message : '移动失败' })
    }
  }, 'move')

  /* 下载（attachment 下载，中文文件名 UTF-8 编码） */
  svc.route('/privhub/api/download', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    const url = new URL(req.url ?? '/', 'http://x')
    const project = url.searchParams.get('project') ?? ''
    const path = url.searchParams.get('path') ?? ''
    if (!svc.canAccess(u, project)) { res.writeHead(403); res.end('forbidden'); return }
    // S7 安全加固：realpath 校验防 junction/symlink 穿越
    const target = await svc.resolveReal(project, path)
    if (target === null || !existsSync(target)) { res.writeHead(404); res.end('not found'); return }
    const s = await stat(target)
    if (s.isDirectory()) { res.writeHead(400); res.end('cannot download directory'); return }
    const name = basename(target)
    // RFC 5987：filename* 支持中文；同时保留 ASCII 兜底
    const encoded = encodeURIComponent(name).replace(/['()*]/g, (c) => '%' + c.charCodeAt(0).toString(16))
    const baseHeaders: Record<string, string | number> = {
      'content-type': 'application/octet-stream',
      'content-disposition': "attachment; filename*=UTF-8''" + encoded + '; filename="download"',
      /* v6：断点续传。用户明确要求「下载可以慢，但是要有断点续传」——
       * 声明 accept-ranges 并真正实现 206，浏览器/下载器才会续传；
       * 只声明不实现，客户端会在续传时拿到整段，反而更糟。
       * Range 语义与 `/f/<id>`（svc-fileindex/auth.ts:404-430）和
       * `/preview-raw` 同口径：只认单区间，坏语法/多区间/越界一律 416。 */
      'accept-ranges': 'bytes',
    }

    let total: number
    try {
      total = Math.max(0, await ctx.storage.plainSize(target))
    } catch {
      /* plainSize 不可用（老 storage 实现）：退回直接整段读，不支持 Range。 */
      const body = await ctx.storage.readBuffer(target)
      res.writeHead(200, { ...baseHeaders, 'content-length': body.length })
      res.end(body)
      return
    }

    const parsed = parseSingleRange(req.headers.range, total)
    if (parsed && !parsed.ok) {
      res.writeHead(416, { ...baseHeaders, 'content-range': `bytes */${total}` })
      res.end()
      return
    }

    if (parsed && parsed.ok) {
      let chunk: Buffer
      try {
        chunk = await ctx.storage.readRange(target, parsed.start, parsed.end)
      } catch {
        /* 区间在明文长度上合法却读不出来（文件在读取途中变了/密文损坏）：
         * 不回半截数据，按 416 处理，客户端会重发一次不带 Range 的请求自愈。 */
        res.writeHead(416, { ...baseHeaders, 'content-range': `bytes */${total}` })
        res.end()
        return
      }
      res.writeHead(206, {
        ...baseHeaders,
        'content-length': chunk.length,
        'content-range': `bytes ${parsed.start}-${parsed.end}/${total}`,
      })
      res.end(chunk)
      return
    }

    // S7：下载解密读（无 Range：整段下发，GCM tag 校验生效）
    const body = await ctx.storage.readBuffer(target)
    res.writeHead(200, { ...baseHeaders, 'content-length': body.length })
    res.end(body)
  }, 'download')
}
