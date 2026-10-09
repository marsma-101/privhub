/**
 * 私域枢纽文件插件（privhub-files）
 *
 * 项目浏览、目录列表、预览、上传、新建文件夹、重命名、软删除。
 * 路径安全与权限判定复用 privhub-core 服务（ctx.privhub）。
 *
 * @module privhub-files
 */

import { writeFile, stat, rename, unlink } from 'node:fs/promises'
import { join, resolve, extname, sep, basename } from 'node:path'
import { existsSync } from 'node:fs'
import type { Context } from '@deepseek-ai/cordis'
import { json, readBody, MAX_UPLOAD_BYTES } from '../../privhub-core/src/index'
import { isMediaExt } from '../../privhub-core/src/file-exts'
import { parseSingleRange } from '../../privhub-core/src/http-range'

export const name = 'privhub-files'
export const inject = ['privhub', 'audit', 'storage', 'eventBus']

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

  /* 文件变更广播（fulltext/kg 增量维护） */
  const changed = (project: string, path: string, action: string, newPath?: string): void => {
    ctx.emit('file:changed', { project, path, action, newPath })
  }

  /* 审计埋点（F13 契约）：成功后写审计并广播 audit:logged；失败静默，不影响主流程 */
  const audit = async (u: { username: string }, action: string, target: string, detail?: string): Promise<void> => {
    const rec = await ctx.audit.log({ user: u.username, action, target, detail }).catch(() => null)
    if (rec) ctx.emit('audit:logged', rec)
  }

  /* 项目列表（当前用户可见） */
  svc.route('/privhub/api/projects', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
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
       * 前端 openDir 拿到 !ok 会把 error 弹出来（A6），无需改 UI。 */
      if (!existsSync(join(svc.dataRoot, project))) {
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
    /* 【扩展名一处定义】这张表是「扩展名 → MIME」的映射（映射本身必须逐条写），
     * 但它的**键集**受约束：必须恰好等于共享的 `IMAGE_EXTS` ∪ `{pdf}` ∪ `MEDIA_EXTS`。
     * 这条不靠人记 —— `tests/file-exts.mjs` 有一组断言直接读这段源码取键、与
     * `privhub-core/src/file-exts.ts` 的三个集合比对，漏一个（例如 `.ico`）立刻变红。
     *
     * ⚠ 音视频那一组（2026-10-09）**故意比"浏览器能播的"多**：`mov/qt/avi/mkv/3gp…`
     * 只是"浏览器多半播不了"，但它们确实是媒体 —— 前端据此画**兜底说明 + 下载入口**
     * （nowen-note 的原做法），比回一句"该文件类型不支持在线查看"诚实得多。 */
    const mime: Record<string, string> = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
      svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon', pdf: 'application/pdf',
      mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg',
      aac: 'audio/aac', m4a: 'audio/mp4', flac: 'audio/flac',
      mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg',
      mov: 'video/quicktime', qt: 'video/quicktime', '3gp': 'video/3gpp', '3g2': 'video/3gpp2',
      avi: 'video/x-msvideo', mkv: 'video/x-matroska',
    }
    const contentType = mime[ext] ?? 'application/octet-stream'

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
      // S7 安全加固：realpath 校验防 junction 目录写穿越
      const dir = await svc.resolveReal(project, subPath)
      if (dir === null || !existsSync(dir)) return json(res, 400, { ok: false, error: '目标目录不存在' })
      /* A4（只做「不再静默」这一步）：同名文件已存在时【明确失败】，不再静默覆盖。
       *
       * 为什么不改写入语义、也不做自动备份：覆盖会改数据，属于「会动数据」的功能，
       * 按 Shape Up 的硬约束不适用轻量交付 —— 备份/版本历史要单独立项设计
       * （版本历史随覆盖清空的问题属另一批）。本批只让这一次拒绝被用户看见。
       * 校验必须在【读取请求体之前】，避免先落 .part 再报错、留下垃圾临时文件。
       * 已知影响面：同目录重名上传（含「复制副本」若同名副本已存在）会从
       * 「静默覆盖」变成「明确失败并在界面提示」，这是有意的行为变化。 */
      const target = join(dir, name)
      if (existsSync(target)) {
        return json(res, 409, { ok: false, error: '同名文件已存在：' + name + '（为避免覆盖，请改名后重新上传）' })
      }
      // A11+S7：流式加密落盘（storage.createWriteStream 内部写密文头+加密流+末尾 tag），不整读进内存；超限中断清理
      const tmp = target + '.part'
      const size = await new Promise<number>((ok, fail) => {
        let written = 0
        let aborted = false
        void ctx.storage.createWriteStream(tmp).then(({ stream, done }) => {
          stream.on('error', (e) => { aborted = true; fail(e) })
          req.on('data', (c: Buffer) => {
            written += c.length
            if (written > MAX_UPLOAD_BYTES && !aborted) {
              aborted = true
              ;(stream as import('node:stream').Writable).destroy()
              req.destroy()
              fail(new Error('文件过大（超过 2GB 上限）'))
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
      json(res, 200, { ok: true, size })
      void audit(u, 'upload', project + '/' + (subPath ? subPath + '/' : '') + name, 'size=' + size)
      changed(project, (subPath ? subPath + '/' : '') + name, 'created')
    } catch (e) {
      // JT-05：不经 err.message 直传，避免 errno/绝对路径泄漏到界面（见 uploadErrorText）
      ctx.logger?.warn?.('[upload] 失败：' + (e instanceof Error ? e.message : String(e)))
      json(res, 400, { ok: false, error: uploadErrorText(e) })
    }
  }, 'upload')

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
    const ok = await svc.moveToTrash(project, String(body.path ?? ''), u.username)
    json(res, ok ? 200 : 400, ok ? { ok: true } : { ok: false, error: '删除失败' })
    if (ok) void audit(u, 'delete', project + '/' + String(body.path ?? ''))
    if (ok) changed(project, String(body.path ?? ''), 'deleted')
  }, 'delete')

  /* 重命名 */
  svc.route('/privhub/api/rename', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = String(body.project ?? '')
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    const ok = await svc.renameEntry(project, String(body.path ?? ''), String(body.newName ?? ''))
    json(res, ok ? 200 : 400, ok ? { ok: true } : { ok: false, error: '重命名失败' })
    if (ok) void audit(u, 'rename', project + '/' + String(body.path ?? ''), '-> ' + String(body.newName ?? ''))
    if (ok) {
      // newPath：同目录新名（目录内文件路径 → 替换最后一段）
      const p = String(body.path ?? '').replace(/\\/g, '/')
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
    const base = resolve(svc.dataRoot, project)
    const src = resolve(base, from)
    if (src === base || !src.startsWith(base + sep) || !existsSync(src)) return json(res, 400, { ok: false, error: '源不存在' })
    const destDir = toDir === '' ? base : resolve(base, toDir)
    if (destDir !== base && (!destDir.startsWith(base + sep) || !existsSync(destDir))) return json(res, 400, { ok: false, error: '目标目录不存在' })
    if (destDir === src) return json(res, 400, { ok: false, error: '已在目标目录' })
    const dest = join(destDir, basename(src))
    if (existsSync(dest)) return json(res, 400, { ok: false, error: '目标目录已存在同名项' })
    try {
      await rename(src, dest)
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
    // S7：下载解密读
    const body = await ctx.storage.readBuffer(target)
    res.writeHead(200, {
      'content-type': 'application/octet-stream',
      'content-disposition': "attachment; filename*=UTF-8''" + encoded + '; filename="download"',
      'content-length': body.length,
    })
    res.end(body)
  }, 'download')
}
