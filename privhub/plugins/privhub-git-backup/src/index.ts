/**
 * privhub-git-backup — 文件版本 Git 备份（自动 + 手动）
 *
 * 机制：
 *   - 镜像目录 data/git-backup/mirror/{project}/…：定时（60s）将 data-files 的
 *     项目文件（密文字节）同步到镜像（增量拷贝），并 git add -A + commit
 *   - 即时钩子：监听 bus 不可用于服务端——改用写后探测：任何文件变更由轮询捕获；
 *     另提供手动/即时接口供客户端触发
 *   - POST /api/gitbackup/commit { project?, path?, message? }   手动/即时备份（无变化跳过）
 *   - GET  /api/gitbackup/history?project=&path=                 该文件的历史（git log --follow）
 *   - POST /api/gitbackup/restore { project, path, commit }      回滚到指定提交（覆盖原文件）
 *
 * 说明：镜像存密文（与 S7 加密存储一致，不落明文）；git 提供完整历史与可回滚性。
 *
 * @module privhub-git-backup
 */

import { readdir, stat, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { Context } from '@deepseek-ai/cordis'
import { json, readBody } from '../../privhub-core/src/index'

const execFileP = promisify(execFile)

export const name = 'privhub-git-backup'
export const inject = ['storage', 'privhub', 'acl']

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()
const DATA_FILES = join(rootDir, 'data-files')
const REPO = join(rootDir, 'data', 'git-backup')
const MIRROR = join(REPO, 'mirror')
const POLL_MS = 60 * 1000

async function git(cwd: string, args: string[]): Promise<string> {
  const r = await execFileP('git', args, { cwd, timeout: 20000 })
  return r.stdout
}

/**
 * D11：显式探测 git 是否可用。
 * 原实现强依赖外部 git 二进制，缺失时每 60s 静默失败（只写 logger.error），
 * 管理员会误以为「备份在正常工作」。这里探测结果供启动告警与前端状态展示。
 */
let gitAvailable: boolean | null = null
async function probeGit(): Promise<boolean> {
  if (gitAvailable !== null) return gitAvailable
  try {
    await execFileP('git', ['--version'], { timeout: 5000 })
    gitAvailable = true
  } catch {
    gitAvailable = false
  }
  return gitAvailable
}

/** 初始化仓库 + 首次全量镜像 */
async function ensureRepo(): Promise<void> {
  if (!existsSync(REPO)) {
    await mkdir(REPO, { recursive: true })
    await git(REPO, ['init', '-b', 'main'])
    await writeFile(join(REPO, 'README.txt'), 'PrivHub Git 备份仓库（自动 + 手动备份，镜像为密文文件）\n', 'utf8')
  }
  // 仓库级身份（不污染全局 git 配置）
  await git(REPO, ['config', 'user.name', 'PrivHub Backup'])
  await git(REPO, ['config', 'user.email', 'backup@privhub.local'])
}

/** 递归列出目录文件（相对路径列表） */
async function walkFiles(dir: string): Promise<string[]> {
  const out: string[] = []
  if (!existsSync(dir)) return out
  const entries = await readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    if (e.name.startsWith('.')) continue // .trash 等隐藏目录不备份
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      const sub = await walkFiles(full)
      for (const s of sub) out.push(e.name + '/' + s)
    } else out.push(e.name)
  }
  return out
}

/**
 * D11：系统数据（账号 / 权限 / 标签 / 版本 / 审计等）此前完全不在备份范围内——
 * 用户文件能回滚，但误删账号或 ACL 规则就只能重建。
 * 这些文件本就经 svc-storage 加密，直接按字节镜像即可，仍然不会被宿主机读明文。
 * 注意：secret.key 单独排除（密钥不应进备份仓库，应离线另行保管）。
 */
const DATA_DIR = join(rootDir, 'data')
const SYSTEM_BACKUP_FILES = [
  'users.json', 'acl.json', 'meta.json', 'templates.json', 'trash.json',
  'versions.json', 'favorites.json', 'recent.json', 'settings.json',
  'comments.json', 'invites.json', 'publish.json', 'office-api.json',
  'rag-curation.json', 'rag-vectorize.json', 'model.json',
]

/** 镜像同步：data-files → mirror（增量 copy），返回变更数 */
async function syncMirror(): Promise<number> {
  let changed = 0
  if (!existsSync(DATA_FILES)) return 0
  const projects = await readdir(DATA_FILES, { withFileTypes: true })
  for (const p of projects) {
    if (!p.isDirectory() || p.name.startsWith('.')) continue // 项目 = 顶层目录（.trash 等跳过）
    const srcRoot = join(DATA_FILES, p.name)
    const dstRoot = join(MIRROR, p.name)
    const files = await walkFiles(srcRoot)
    for (const f of files) {
      const src = join(srcRoot, f)
      const dst = join(dstRoot, f)
      const [ss, ds] = await Promise.all([stat(src), existsSync(dst) ? stat(dst) : Promise.resolve(null)])
      if (!ds || ss.mtimeMs !== ds.mtimeMs || ss.size !== ds.size) {
        await mkdir(dirname(dst), { recursive: true })
        await copyFile(src, dst)
        changed++
      }
    }
  }
  // 系统数据（D11）
  const sysDstRoot = join(MIRROR, '_system')
  for (const name of SYSTEM_BACKUP_FILES) {
    const src = join(DATA_DIR, name)
    if (!existsSync(src)) continue
    const dst = join(sysDstRoot, name)
    const [ss, ds] = await Promise.all([stat(src), existsSync(dst) ? stat(dst) : Promise.resolve(null)])
    if (!ds || ss.mtimeMs !== ds.mtimeMs || ss.size !== ds.size) {
      await mkdir(sysDstRoot, { recursive: true })
      await copyFile(src, dst)
      changed++
    }
  }
  // 注意：不复刻删除（保留历史版本由 git 提交承担），但显式提示不做源删除同步。
  return changed
}

/** 提交（无变更跳过）；返回 commit hash 或 null */
async function commitAll(message: string): Promise<string | null> {
  await ensureRepo()
  const changed = await syncMirror()
  if (changed === 0) {
    // 仍尝试 commit（可能仅删除/空目录结构变化由 git 捕获）
    try {
      await git(REPO, ['add', '-A'])
      const st = (await git(REPO, ['status', '--porcelain'])).trim()
      if (!st) return null
    } catch { return null }
  } else {
    await git(REPO, ['add', '-A'])
  }
  await git(REPO, ['commit', '-m', message, '--allow-empty'])
  const head = (await git(REPO, ['rev-parse', 'HEAD'])).trim()
  return head
}

export function apply(ctx: Context): void {
  const svc = ctx.privhub as unknown as {
    route: (path: string, handler: (req: unknown, res: unknown) => Promise<void> | void, name?: string) => void
    requireUser: (req: unknown, res: unknown) => { username: string; role: string } | null
    canAccess: (u: { username: string; role: string }, project: string) => boolean
    resolveReal: (project: string, relPath: string) => Promise<string | null>
  }

  /* D11：启动探测 git。缺失时【显著告警并关闭定时器】，
   * 而不是每 60 秒静默失败——"以为有备份、实际没有"比没有备份更危险。 */
  let timer: ReturnType<typeof setInterval> | null = null
  void (async () => {
    const has = await probeGit()
    if (!has) {
      const msg = '[gitbackup] 未检测到 git，自动备份已【停用】。'
        + '请安装 git 并确保其在 PATH 中，或改用其它备份方式。'
      try { ctx.logger?.error?.(msg) } catch { /* logger 不可用 */ }
      console.error(msg)
      return
    }
    try { await ensureRepo() } catch (e) {
      ctx.logger?.error?.('[gitbackup] 仓库初始化失败: ' + (e instanceof Error ? e.message : String(e)))
    }
    timer = setInterval(() => {
      void commitAll('auto: 文件变更备份').catch((e) => ctx.logger?.error?.('[gitbackup] 自动备份失败: ' + (e instanceof Error ? e.message : String(e))))
    }, POLL_MS)
    if (typeof timer.unref === 'function') timer.unref()
  })()
  ctx.on('dispose', () => { if (timer) clearInterval(timer) })

  /* 手动/即时备份 */
  svc.route('/privhub/api/gitbackup/commit', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    let body: { message?: string }
    try { body = JSON.parse(await readBody(req)) } catch { body = {} }
    const msg = String(body.message ?? '').trim() || 'manual: ' + u.username
    try {
      const head = await commitAll(msg)
      json(res, 200, { ok: true, commit: head, changed: head !== null })
    } catch (e) {
      json(res, 500, { ok: false, error: e instanceof Error ? e.message : '备份失败' })
    }
  }, 'gitbackup-commit')

  /* D11：备份可用性状态（前端/运维可见，避免"以为在备份"） */
  svc.route('/privhub/api/gitbackup/status', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    const has = await probeGit()
    json(res, 200, {
      ok: true,
      gitAvailable: has,
      autoBackup: has && timer !== null,
      scope: { files: 'data-files/', system: SYSTEM_BACKUP_FILES },
      note: has ? undefined : '未检测到 git，自动备份未运行',
    })
  }, 'gitbackup-status')

  /* 历史 */
  svc.route('/privhub/api/gitbackup/history', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    const url = new URL(String((req as { url?: string }).url ?? '/'), 'http://x')
    const project = url.searchParams.get('project') ?? ''
    const path = url.searchParams.get('path') ?? ''
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    try {
      await ensureRepo()
      const rel = 'mirror/' + project + '/' + path // git 跟踪路径含 mirror/ 前缀（正斜杠）
      const log = (await git(REPO, ['log', '--follow', '--format=%H|%at|%s', '--', rel])).trim()
      const out = log ? log.split('\n').map((l) => {
        const [hash, at, ...msgParts] = l.split('|')
        return { commit: hash, at: Number(at), message: msgParts.join('|') }
      }) : []
      json(res, 200, { ok: true, history: out })
    } catch (e) {
      json(res, 500, { ok: false, error: e instanceof Error ? e.message : '历史读取失败' })
    }
  }, 'gitbackup-history')

  /* 回滚：git checkout 到 mirror（工作区，二进制无损）→ 覆盖原文件 */
  svc.route('/privhub/api/gitbackup/restore', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    let body: { project?: string; path?: string; commit?: string }
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const project = String(body.project ?? '')
    const path = String(body.path ?? '')
    const commit = String(body.commit ?? '')
    // S10 修复：commit 会作为参数传给 git，必须校验格式（防选项注入 / 异常输入）。
    // 注：用的是 execFile 无 shell，故非命令注入；但以 '--' 开头的值仍会被 git 当选项解析。
    if (!/^[0-9a-fA-F]{7,40}$/.test(commit)) return json(res, 400, { ok: false, error: 'commit 格式无效' })
    if (!svc.canAccess(u, project)) return json(res, 403, { ok: false, error: '无权限' })
    // S10 修复：回滚 = 覆盖写文件，必须与其它写路径一致地经过文件级 ACL 裁决。
    const aclD = ctx.acl?.can(u, 'edit', project, path)
    if (aclD && !aclD.allow) return json(res, 403, { ok: false, error: 'ACL 拒绝访问' })
    const target = await svc.resolveReal(project, path)
    if (target === null) return json(res, 404, { ok: false, error: '文件不存在' })
    try {
      await ensureRepo()
      const rel = 'mirror/' + project + '/' + path // git 跟踪路径含 mirror/ 前缀（正斜杠）
      await git(REPO, ['checkout', commit, '--', rel])
      const restored = join(MIRROR, project, path)
      if (!existsSync(restored)) return json(res, 404, { ok: false, error: '该版本不存在此文件' })
      await mkdir(dirname(target), { recursive: true })
      await copyFile(restored, target)
      json(res, 200, { ok: true })
    } catch (e) {
      json(res, 500, { ok: false, error: e instanceof Error ? e.message : '回滚失败' })
    }
  }, 'gitbackup-restore')
}
