/**
 * 私域枢纽管理插件（privhub-admin）
 *
 * 管理员域接口：项目新建/删除（软删除进回收站）+ 用户管理
 * （列表 / 改角色与项目权限 / 删除用户 / 重置密码）。
 *
 * @module privhub-admin
 */

import type { Context } from '@deepseek-ai/cordis'
import { basename } from 'node:path'
import { json, readBody, hashPassword } from '../../privhub-core/src/index'

export const name = 'privhub-admin'
export const inject = ['privhub', 'audit', 'eventBus', 'storage']

export function apply(ctx: Context): void {
  /* E1 事件声明 */
  ctx.eventBus.declareEmit('audit:logged', 'privhub-admin', '写操作成功审计广播（S1 闭环）')
  ctx.eventBus.declareEmit('personal:renamed', 'privhub-admin', '个人空间目录改名（管理员改显示名联动）→ 各存储同步引用')
  const svc = ctx.privhub

  /* 审计埋点（F13 契约）：成功后写审计并广播 audit:logged；失败静默，不影响主流程 */
  const audit = async (u: { username: string }, action: string, target: string, detail?: string): Promise<void> => {
    const rec = await ctx.audit.log({ user: u.username, action, target, detail }).catch(() => null)
    if (rec) ctx.emit('audit:logged', rec)
  }

  /* 新建项目（管理员） */
  svc.route('/privhub/api/project-create', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (u.role !== 'admin') return json(res, 403, { ok: false, error: '仅管理员可新建项目' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const ok = await svc.createProject(String(body.name ?? '').trim())
    json(res, ok ? 200 : 400, ok ? { ok: true } : { ok: false, error: '项目名无效或已存在' })
    if (ok) void audit(u, 'project-create', String(body.name ?? '').trim())
  }, 'project-create')

  /* 删除项目（管理员）——软删除，整个项目进回收站，可恢复 */
  svc.route('/privhub/api/project-delete', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (u.role !== 'admin') return json(res, 403, { ok: false, error: '仅管理员可删除项目' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const ok = await svc.moveProjectToTrash(String(body.name ?? ''), u.username)
    json(res, ok ? 200 : 400, ok ? { ok: true } : { ok: false, error: '移入回收站失败' })
    if (ok) void audit(u, 'project-delete', String(body.name ?? ''))
  }, 'project-delete')

  /* 用户管理：列出所有用户（管理员） */
  svc.route('/privhub/api/admin/users', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (u.role !== 'admin') return json(res, 403, { ok: false, error: '仅管理员' })
    // hasPersonalSpace 用于界面提示「改名会同步改个人空间文件夹」。
    // 只暴露「是否存在」，不暴露目录内容（目录名恒等于 displayName，无额外信息泄露）。
    const users = [...svc.users.values()].map((x) => ({
      username: x.username, displayName: x.displayName, role: x.role, projects: x.projects,
      hasPersonalSpace: String(x.personalDir ?? '').trim() !== '',
    }))
    json(res, 200, { ok: true, users, allProjects: await svc.allProjects() })
  }, 'admin-users')

  /* 用户管理：更新角色/项目权限（管理员） */
  svc.route('/privhub/api/admin/user-update', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (u.role !== 'admin') return json(res, 403, { ok: false, error: '仅管理员' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const username = String(body.username ?? '')
    const rec = svc.users.get(username)
    if (!rec) return json(res, 404, { ok: false, error: '用户不存在' })
    // 改显示名必须走 core：显示名与个人空间目录名 live-bound，要一起改。
    // 直接 rec.displayName = ... 会造出「文件夹叫旧名、账号记新名」的不可访问状态，
    // 且旧名不再登记为个人空间后会被当成普通项目名（管理员可见）——最坏结果。
    // 放在 role/projects 之前：改名失败即整单中止，不产生半改。
    let renamed: { oldName: string; newName: string; renamedDir: boolean } | null = null
    if (typeof body.displayName === 'string' && body.displayName.trim() !== '') {
      const r = await svc.changeDisplayName(username, body.displayName)
      if (!r.ok) return json(res, 400, { ok: false, error: r.reason })
      renamed = r
    }

    if (body.role === 'admin' || body.role === 'user') rec.role = body.role
    if (Array.isArray(body.projects)) {
      const names = (body.projects as unknown[]).filter((p): p is string => typeof p === 'string')
      rec.projects = [...new Set(names)]
    }
    await svc.saveUsers()

    // 广播放在 registry 落盘之后：监听方（rag/recent）据此清理旧目录名引用
    if (renamed && renamed.renamedDir) {
      ctx.emit('personal:renamed', { username, oldName: renamed.oldName, newName: renamed.newName })
    }

    json(res, 200, { ok: true, renamedDir: !!(renamed && renamed.renamedDir) })
    void audit(u, 'user-update', username,
      'role=' + rec.role + ' projects=[' + rec.projects.join(',') + ']' +
      (renamed && renamed.renamedDir ? ' displayName=' + renamed.oldName + '->' + renamed.newName + '（文件夹已同步改名）' : ''))
  }, 'admin-user-update')

  /* 用户管理：删除用户（管理员） */
  svc.route('/privhub/api/admin/user-delete', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (u.role !== 'admin') return json(res, 403, { ok: false, error: '仅管理员' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const username = String(body.username ?? '')
    if (username === 'admin') return json(res, 400, { ok: false, error: '不能删除主管理员' })
    if (!svc.users.has(username)) return json(res, 404, { ok: false, error: '用户不存在' })
    svc.users.delete(username)
    await svc.saveUsers()
    json(res, 200, { ok: true })
    void audit(u, 'user-delete', username)
  }, 'admin-user-delete')

  /* 用户管理：重置密码（管理员，防止用户忘记密码） */
  svc.route('/privhub/api/admin/user-reset-password', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (u.role !== 'admin') return json(res, 403, { ok: false, error: '仅管理员' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    const username = String(body.username ?? '')
    const newPassword = String(body.newPassword ?? '')
    if (newPassword.length < 6) return json(res, 400, { ok: false, error: '新密码至少6位' })
    const rec = svc.users.get(username)
    if (!rec) return json(res, 404, { ok: false, error: '用户不存在' })
    rec.password = hashPassword(newPassword)
    // 重置后强制该用户所有会话失效（安全）
    for (const [token, entry] of svc.sessions) {
      if (entry.username === username) svc.sessions.delete(token)
    }
    await svc.saveUsers()
    await svc.saveSessions()
    json(res, 200, { ok: true })
    void audit(u, 'user-reset-password', username)
  }, 'admin-user-reset-password')

  /* ---------- 系统数据：明文→密文（D13）----------
   * 为什么需要它：读写早就统一走 ctx.storage（新写入自动是密文），但**在此之前**写入的
   * 文件不会自己变密文 —— 只有「下次被写」才会。于是那些再也不会被写的旧数据
   * （老邀请码、老批注、旧发布链接）就永远停在明文，而它们恰恰可能含免登录取证。
   *
   * 两条路由分开：先能**看见**（GET），再决定**动手**（POST）。管理端一进来就能看到
   * 「还有几个明文」，而不是点了迁移才知道。 */

  /* 列出仍以明文落盘的系统数据文件（管理员） */
  svc.route('/privhub/api/storage/plaintext', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (u.role !== 'admin') return json(res, 403, { ok: false, error: '仅管理员' })
    if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'method not allowed' })
    const files = await ctx.storage.scanPlaintextSystemFiles()
    /* 只回文件名与体积，不回绝对路径：管理员要判断的是「哪个文件、多大」，
     * 盘符与目录结构对这件事没有帮助，少泄露一点是一点。 */
    json(res, 200, {
      ok: true,
      encryptionEnabled: ctx.storage.active,
      total: files.length,
      files: files.map((f) => ({ name: basename(f.file), bytes: f.bytes })),
    })
  }, 'storage-plaintext')

  /* 迁移为密文（管理员）：迁移前自动备份明文，逐文件回报结果 */
  svc.route('/privhub/api/storage/migrate', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (u.role !== 'admin') return json(res, 403, { ok: false, error: '仅管理员' })
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    if (!ctx.storage.active) return json(res, 400, { ok: false, error: '加密未启用（storage.enabled=false），迁移无意义' })
    const files = (await ctx.storage.scanPlaintextSystemFiles()).map((f) => f.file)
    if (files.length === 0) return json(res, 200, { ok: true, migrated: 0, failed: 0, results: [] })

    const results = await ctx.storage.migrateFilesToEncrypted(files)
    const migrated = results.filter((r) => r.status === 'migrated').length
    const failed = results.filter((r) => r.status === 'failed')
    for (const r of results) {
      void audit(u, 'storage-migrate', basename(r.file),
        r.status + (r.reason ? '：' + r.reason : '') + (r.backup ? ' backup=' + basename(r.backup) : ''))
    }
    json(res, 200, {
      ok: failed.length === 0,
      migrated, failed: failed.length,
      ...(failed.length ? { error: '有 ' + failed.length + ' 个文件迁移失败（原文件已保持/还原为明文，详见 results）' } : {}),
      results: results.map((r) => ({
        name: basename(r.file), status: r.status, reason: r.reason,
        backup: r.backup ? basename(r.backup) : undefined,
      })),
    })
  }, 'storage-migrate')
}
