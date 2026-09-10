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

export const name = 'privhub-files'
export const inject = ['privhub', 'audit', 'storage', 'eventBus']

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
    json(res, 200, { ok: true, type: r.type, data: r.data })
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
    const mime: Record<string, string> = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
      svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon', pdf: 'application/pdf',
    }
    // S7：预览原始字节流解密读（图片/PDF 二进制，密文/明文自动识别）
    const body = await ctx.storage.readBuffer(target)
    // A13：SVG 可携带脚本 → 沙箱响应头禁止脚本执行；其余类型加 nosniff
    const headers: Record<string, string | number> = {
      'content-type': mime[ext] ?? 'application/octet-stream',
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
      // S7 安全加固：realpath 校验防 junction 目录写穿越
      const dir = await svc.resolveReal(project, subPath)
      if (dir === null || !existsSync(dir)) return json(res, 400, { ok: false, error: '目标目录不存在' })
      // A11+S7：流式加密落盘（storage.createWriteStream 内部写密文头+加密流+末尾 tag），不整读进内存；超限中断清理
      const target = join(dir, name)
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
              ;(stream as NodeJS.WritableStream).destroy()
              req.destroy()
              fail(new Error('文件过大（超过 2GB 上限）'))
            }
          })
          req.on('error', (e) => { if (!aborted) { aborted = true; (stream as NodeJS.WritableStream).destroy(); fail(e) } })
          req.pipe(stream as NodeJS.WritableStream)
          ;(stream as NodeJS.WritableStream).on('finish', () => {
            // 等全部密文（含 tag）落盘后再完成
            void done.then(() => { if (!aborted) ok(written) }, (e) => fail(e))
          })
        }).catch((e) => fail(e))
      }).catch(async (e) => { await unlink(tmp).catch(() => {}); throw e })
      await rename(tmp, target)
      json(res, 200, { ok: true, size })
      void audit(u, 'upload', project + '/' + (subPath ? subPath + '/' : '') + name, 'size=' + size)
      changed(project, (subPath ? subPath + '/' : '') + name, 'created')
    } catch (e) { json(res, 400, { ok: false, error: e instanceof Error ? e.message : '上传失败' }) }
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
