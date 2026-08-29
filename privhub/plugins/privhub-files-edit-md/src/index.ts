/**
 * 私域枢纽 Markdown 在线编辑插件（privhub-files-edit-md，F16 / C14）
 *
 * 知识库主线入口：.md 文件读写 + 版本历史 + 双链支持。
 *
 *   GET  /privhub/api/doc?project=&path=        读取 .md（读权限，仅 .md）
 *   PUT  /privhub/api/doc                       保存（写权限 + 冲突检测 + 版本存档）
 *   GET  /privhub/api/doc/versions?project=&path=  版本列表（倒序，上限 20）
 *   POST /privhub/api/doc/restore               回滚到指定版本（回滚本身也留档）
 *
 * 版本存储：data/doc-versions/ 下按 <hash8>_<at>.md 存快照，index.json 记录
 * 映射（project/path → [{at, file}]），每文件上限 20 版，超限删最旧。
 *
 * 事件契约：保存/回滚成功后 emit 'file:saved'（F17 全文索引/图谱消费）
 * 并写审计（ctx.audit.log + emit audit:logged，F13 闭环）。
 * 冲突检测：客户端保存时带上打开时的 mtime；服务端不一致返回 409。
 *
 * @module privhub-files-edit-md
 */

import { readFile, writeFile, mkdir, stat, unlink } from 'node:fs/promises'
import { join, extname, dirname } from 'node:path'
import { existsSync } from 'node:fs'
import { createHash, randomBytes } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import { json, readBody } from '../../privhub-core/src/index'

export const name = 'privhub-files-edit-md'
export const inject = ['privhub', 'audit']

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()
const VERSIONS_DIR = join(rootDir, 'data', 'doc-versions')
const INDEX_FILE = join(VERSIONS_DIR, 'index.json')
/** 每文件版本上限（计划 4.2） */
const MAX_VERSIONS = 20

interface VersionRec { at: number; file: string }
type VersionIndex = Record<string, VersionRec[]> // key: project + '::' + path

async function loadIndex(): Promise<VersionIndex> {
  if (!existsSync(INDEX_FILE)) return {}
  try { return JSON.parse(await readFile(INDEX_FILE, 'utf8')) as VersionIndex } catch { return {} }
}
async function saveIndex(index: VersionIndex): Promise<void> {
  await mkdir(dirname(INDEX_FILE), { recursive: true })
  await writeFile(INDEX_FILE, JSON.stringify(index, null, 2), 'utf8')
}

function isMd(path: string): boolean {
  return extname(path).toLowerCase() === '.md'
}

export function apply(ctx: Context): void {
  const svc = ctx.privhub

  /* 审计埋点（F13 契约） */
  const audit = async (u: { username: string }, action: string, target: string, detail?: string): Promise<void> => {
    const rec = await ctx.audit.log({ user: u.username, action, target, detail }).catch(() => null)
    if (rec) ctx.emit('audit:logged', rec)
  }

  /** 版本存档：把当前文件内容快照存入版本库（上限 MAX_VERSIONS）。 */
  async function snapshot(project: string, path: string): Promise<void> {
    const target = svc.resolveInProject(project, path)
    if (target === null || !existsSync(target)) return
    const at = Date.now()
    const hash = createHash('sha1').update(project + '::' + path).digest('hex').slice(0, 8)
    const file = `${hash}_${at}.md`
    const body = await readFile(target)
    await mkdir(VERSIONS_DIR, { recursive: true })
    await writeFile(join(VERSIONS_DIR, file), body)
    const key = project + '::' + path
    const index = await loadIndex()
    const list = index[key] ?? []
    list.push({ at, file })
    // 超限删最旧（文件 + 记录）
    while (list.length > MAX_VERSIONS) {
      const old = list.shift()
      if (old) await unlink(join(VERSIONS_DIR, old.file)).catch(() => {})
    }
    index[key] = list
    await saveIndex(index)
  }

  /* ---- 读取 .md ---- */
  svc.route('/privhub/api/doc', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    try {
      const url = new URL(req.url ?? '/', 'http://x')
      if (req.method === 'GET') {
        const project = url.searchParams.get('project') ?? ''
        const path = url.searchParams.get('path') ?? ''
        if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
        if (!isMd(path)) return json(res, 400, { ok: false, error: '仅支持 .md 文档' })
        const target = svc.resolveInProject(project, path)
        if (target === null || !existsSync(target)) return json(res, 404, { ok: false, error: '文档不存在' })
        const s = await stat(target)
        if (s.isDirectory()) return json(res, 400, { ok: false, error: '目标为文件夹' })
        json(res, 200, { ok: true, doc: await readFile(target, 'utf8'), mtime: s.mtimeMs })
        return
      }
      if (req.method !== 'PUT') return json(res, 405, { ok: false, error: 'method not allowed' })
      let body: any
      try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
      const project = String(body.project ?? '')
      const path = String(body.path ?? '')
      const doc = String(body.doc ?? '')
      if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
      if (!isMd(path)) return json(res, 400, { ok: false, error: '仅支持 .md 文档' })
      const target = svc.resolveInProject(project, path)
      if (target === null) return json(res, 400, { ok: false, error: '路径无效' })
      if (!existsSync(target)) {
        // 允许新建 .md（父目录须存在）
        const parent = dirname(target)
        if (parent !== svc.resolveInProject(project, '') && !existsSync(parent)) return json(res, 400, { ok: false, error: '目标目录不存在' })
        await mkdir(parent, { recursive: true })
      }
      // 冲突检测：baseMtime 与当前文件 mtime 不一致 → 409（客户端确认覆盖后重试）
      const baseMtime = Number(body.baseMtime ?? 0)
      if (existsSync(target) && baseMtime > 0) {
        const s = await stat(target)
        if (Math.abs(s.mtimeMs - baseMtime) > 1) {
          return json(res, 409, { ok: false, error: '文档已被他人修改', conflict: true, mtime: s.mtimeMs })
        }
      }
      await snapshot(project, path) // 保存前存档上一版
      await writeFile(target, doc, 'utf8')
      const s2 = await stat(target)
      ctx.emit('file:saved', { project, path, doc })
      void audit(u, 'doc-save', project + '/' + path, 'bytes=' + Buffer.byteLength(doc, 'utf8'))
      json(res, 200, { ok: true, mtime: s2.mtimeMs })
    } catch (e) {
      json(res, 400, { ok: false, error: e instanceof Error ? e.message : '读写失败' })
    }
  }, 'doc-readwrite')

  /* ---- 版本列表 ---- */
  svc.route('/privhub/api/doc/versions', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    try {
      const url = new URL(req.url ?? '/', 'http://x')
      const project = url.searchParams.get('project') ?? ''
      const path = url.searchParams.get('path') ?? ''
      if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
      const index = await loadIndex()
      const list = (index[project + '::' + path] ?? []).slice().reverse()
      json(res, 200, { ok: true, versions: list })
    } catch (e) {
      json(res, 400, { ok: false, error: e instanceof Error ? e.message : '读取失败' })
    }
  }, 'doc-versions')

  /* ---- 回滚 ---- */
  svc.route('/privhub/api/doc/restore', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    try {
      if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
      let body: any
      try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
      const project = String(body.project ?? '')
      const path = String(body.path ?? '')
      const at = Number(body.version ?? 0)
      if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
      if (!isMd(path)) return json(res, 400, { ok: false, error: '仅支持 .md 文档' })
      const index = await loadIndex()
      const list = index[project + '::' + path] ?? []
      const rec = list.find((v) => v.at === at)
      if (!rec) return json(res, 404, { ok: false, error: '版本不存在' })
      const body2 = await readFile(join(VERSIONS_DIR, rec.file))
      const target = svc.resolveInProject(project, path)
      if (target === null) return json(res, 400, { ok: false, error: '路径无效' })
      await snapshot(project, path) // 回滚前先存档当前版（回滚可逆）
      await writeFile(target, body2, 'utf8')
      ctx.emit('file:saved', { project, path, doc: body2.toString('utf8') })
      void audit(u, 'doc-restore', project + '/' + path, 'version@' + new Date(at).toISOString())
      json(res, 200, { ok: true })
    } catch (e) {
      json(res, 400, { ok: false, error: e instanceof Error ? e.message : '回滚失败' })
    }
  }, 'doc-restore')
}
