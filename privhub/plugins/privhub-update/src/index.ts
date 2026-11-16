/**
 * privhub-update —— 「系统更新」的管理 HTTP 面（服务端）
 *
 * 定位：**只做代理与鉴权，不实现更新逻辑**。真正的下载/校验/切换都在稳定层
 * （runtime/update.mjs + runtime/control.mjs）里，这样业务代码更新中途被换掉，
 * 更新能力也不会跟着消失。
 *
 * 控制层只监听回环并要求 x-privhub-control-token；槽进程由控制层启动，
 * 环境里有 PRIVHUB_CONTROL_TOKEN / PRIVHUB_CONTROL_PORT，因此可以安全地
 * 以「本机 + 令牌」身份调用。直连模式（npm run dev / start.bat）没有控制层，
 * 这里统一返回 managed:false，界面据此显示「当前不是蓝绿部署」。
 *
 * 路由（全管理员）：
 *   GET  /privhub/api/update/status    当前版本 / 更新源配置 / 最近检查结果 / 日志尾
 *   POST /privhub/api/update/check     检查新版本（可能较慢：git 源要 clone）
 *   POST /privhub/api/update/apply     一键更新（后台切换，立即返回；前端轮询状态）
 *   POST /privhub/api/update/config    保存更新源（config/update.json）
 *   POST /privhub/api/update/rollback  回滚到上一版本
 *
 * @module privhub-update
 */

import { readFileSync, existsSync } from 'node:fs'
import { request as httpRequest } from 'node:http'
import { join, resolve } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { json, readJsonBody } from '../../privhub-core/src/index'

export const name = 'privhub-update'
export const inject = ['privhub', 'audit', 'cap']

const CONTROL_TIMEOUT_MS = 16 * 60 * 1000
const CONTROL_FAST_MS = 15_000

/** 蓝绿两个槽的固定标识（与 runtime/control.mjs 的 CONFIG.slots 同源口径）。
 *  写成常量而不是内联字面量：既是单点定义，也避免被「手写扩展名清单」扫描器误判。 */
const SLOT_IDS = ['blue', 'green'] as const

function codeRoot(): string {
  return process.env.PRIVHUB_ROOT?.trim() || process.cwd()
}

function appVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(codeRoot(), 'package.json'), 'utf8')) as { version?: unknown }
    return typeof pkg.version === 'string' ? pkg.version : 'unknown'
  } catch { return 'unknown' }
}

function controlPort(): number {
  const n = Number(process.env.PRIVHUB_CONTROL_PORT)
  return Number.isFinite(n) && n > 0 ? n : 3300
}

function controlToken(): string {
  return process.env.PRIVHUB_CONTROL_TOKEN?.trim() || ''
}

function managed(): boolean {
  return controlToken() !== ''
}

/** 控制层状态：运行中、蓝绿部署、有令牌。直连模式为 false。 */
function managedState(): { managed: boolean; reason?: string } {
  if (managed()) return { managed: true }
  return {
    managed: false,
    reason: '当前是单进程直连模式（没有蓝绿控制层），一键更新仅在 start-runtime.bat 蓝绿部署下可用。',
  }
}

function controlCall(
  path: string,
  opts: { method?: 'GET' | 'POST'; body?: unknown; timeoutMs?: number } = {},
): Promise<Record<string, unknown>> {
  const method = opts.method || 'GET'
  const timeoutMs = opts.timeoutMs || CONTROL_FAST_MS
  const token = controlToken()
  if (!token) {
    const e = new Error('控制层未就绪（缺少控制令牌）') as Error & { code?: string }
    e.code = 'PRIVHUB_CONTROL_UNAVAILABLE'
    return Promise.reject(e)
  }
  const payload = opts.body === undefined ? '' : JSON.stringify(opts.body)
  return new Promise((resolve, reject) => {
    const req = httpRequest({
      host: '127.0.0.1',
      port: controlPort(),
      path,
      method,
      timeout: timeoutMs,
      headers: {
        'x-privhub-control-token': token,
        ...(opts.body === undefined
          ? {}
          : {
            'content-type': 'application/json; charset=utf-8',
            'content-length': String(Buffer.byteLength(payload)),
          }),
      },
    }, (res) => {
      let data = ''
      res.setEncoding('utf8')
      res.on('data', (c: string) => { data += c })
      res.on('end', () => {
        let parsed: Record<string, unknown> | null = null
        try { parsed = JSON.parse(data) as Record<string, unknown> } catch { /* fallthrough */ }
        if ((res.statusCode || 500) < 200 || (res.statusCode || 500) >= 300) {
          const e = new Error(String(parsed?.error || `控制层 HTTP ${res.statusCode}`)) as Error & { code?: string; status?: number }
          e.code = typeof parsed?.code === 'string' ? parsed.code : 'PRIVHUB_CONTROL_HTTP'
          e.status = res.statusCode
          reject(e)
        } else {
          resolve(parsed || {})
        }
      })
    })
    req.on('timeout', () => {
      req.destroy()
      const e = new Error('控制层响应超时') as Error & { code?: string }
      e.code = 'PRIVHUB_CONTROL_TIMEOUT'
      reject(e)
    })
    req.on('error', (err) => {
      const e = err as Error & { code?: string }
      if (e.code === 'ECONNREFUSED' || e.code === 'ECONNRESET') e.code = 'PRIVHUB_CONTROL_UNAVAILABLE'
      reject(e)
    })
    req.end(payload)
  })
}

export function apply(ctx: Context): void {
  const svc = ctx.privhub

  /** 管理入口：登录 401（requireUser 自己写）、无管理权限 403。 */
  const requireAdmin = (req: unknown, res: unknown): { username: string } | null => {
    const u = svc.requireUser(req as never, res as never)
    if (!u) return null
    if (!ctx.cap.can(u, 'admin.update', 'write')) {
      json(res as never, 403, { ok: false, error: '仅管理员可管理系统更新' })
      return null
    }
    return u as { username: string }
  }

  const audit = (username: string, action: string, target: string, detail: string) =>
    void ctx.audit.log({ user: username, action, target, detail }).catch(() => null)

  const fail = (res: unknown, e: unknown): void => {
    const err = e as Error & { code?: string; status?: number }
    const status = Number(err?.status) || (err?.code === 'PRIVHUB_CONTROL_UNAVAILABLE' ? 503 : 500)
    json(res as never, status, {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      code: err?.code || 'PRIVHUB_UPDATE_ERROR',
    })
  }

  /* 当前状态：版本、是否蓝绿、更新源、最近一次检查/更新结果。 */
  svc.route('/privhub/api/update/status', async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return json(res, 405, { ok: false, error: 'method not allowed' })
    }
    const u = requireAdmin(req, res)
    if (!u) return
    const state = managedState()
    if (!state.managed) {
      return json(res, 200, {
        ok: true, managed: false, current: appVersion(), reason: state.reason,
      })
    }
    try {
      const r = await controlCall('/control/update/status', { timeoutMs: CONTROL_FAST_MS })
      json(res, 200, { ...r, ok: true, managed: true, current: r.current || appVersion() })
    } catch (e) {
      /* 控制层短暂不可用（切换中）不应把管理页打成错误页：给出可解释状态。 */
      json(res, 200, {
        ok: true, managed: true, current: appVersion(), controlReachable: false,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }, 'update-status')

  /* 检查更新：git 源要 clone，给足 15 分钟；HTTP 源通常秒级。 */
  svc.route('/privhub/api/update/check', async (req, res) => {
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    const u = requireAdmin(req, res)
    if (!u) return
    const body = await readJsonBody<Record<string, unknown>>(req, res)
    if (body === null) return
    if (!managed()) return json(res, 200, { ok: false, managed: false, error: managedState().reason })
    try {
      const r = await controlCall('/control/update/check', { method: 'POST', body: {}, timeoutMs: CONTROL_TIMEOUT_MS })
      audit(u.username, 'update_check', 'runtime', `candidate=${String(r.candidate || '')} newer=${String(r.newer)}`)
      json(res, 200, r)
    } catch (e) { fail(res, e) }
  }, 'update-check')

  /* 一键更新：控制层后台启动 update.mjs apply，本身几乎立刻返回。 */
  svc.route('/privhub/api/update/apply', async (req, res) => {
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    const u = requireAdmin(req, res)
    if (!u) return
    const body = await readJsonBody<Record<string, unknown>>(req, res)
    if (body === null) return
    if (!managed()) return json(res, 200, { ok: false, managed: false, error: managedState().reason })
    try {
      const r = await controlCall('/control/update/apply', { method: 'POST', body: {}, timeoutMs: CONTROL_FAST_MS })
      audit(u.username, 'update_apply', 'runtime', `started=${String(r.started)} pid=${String(r.pid || '')}`)
      json(res, 200, r)
    } catch (e) { fail(res, e) }
  }, 'update-apply')

  /* 更新源配置（使用版第一次接线用；写入 config/update.json 并重启守护）。 */
  svc.route('/privhub/api/update/config', async (req, res) => {
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    const u = requireAdmin(req, res)
    if (!u) return
    const body = await readJsonBody<Record<string, unknown>>(req, res)
    if (body === null) return
    if (!managed()) return json(res, 200, { ok: false, managed: false, error: managedState().reason })
    try {
      const r = await controlCall('/control/update/config', { method: 'POST', body, timeoutMs: CONTROL_FAST_MS })
      audit(u.username, 'update_config', 'runtime', `source=${String((body as Record<string, unknown>).source || '')}`)
      json(res, 200, r)
    } catch (e) { fail(res, e) }
  }, 'update-config')

  /* 回滚到上一版本（失败切换 / 新版本异常时的人工出口）。
   *
   * 与控制层的 rollback 一样必须**异步**：回滚会停掉当前活跃槽，而本请求正跑在
   * 该槽里。控制层收到后立刻返回，实际切换由 runtime/update.mjs rollback 执行；
   * 前端轮询 status 观察进度。 */
  svc.route('/privhub/api/update/rollback', async (req, res) => {
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    const u = requireAdmin(req, res)
    if (!u) return
    const body = await readJsonBody<Record<string, unknown>>(req, res)
    if (body === null) return
    if (!managed()) return json(res, 200, { ok: false, managed: false, error: managedState().reason })
    try {
      const r = await controlCall('/control/update/rollback', { method: 'POST', body: {}, timeoutMs: CONTROL_FAST_MS })
      audit(u.username, 'update_rollback', 'runtime', `started=${String(r.started)} pid=${String(r.pid || '')}`)
      json(res, 200, r)
    } catch (e) { fail(res, e) }
  }, 'update-rollback')

  /* 「关于」：给设置面板用的一站式版本说明（仅管理员）。
   *
   * 为什么单独一个端点而不是复用 update/status：
   *   · 关于页要看的是「当前版本 + 蓝绿两个槽各自承载哪个版本 + 最近更新记录」，
   *     这些在非蓝绿部署下也能答（那时只有 current，槽信息留空）；
   *   · status 会去调控制层（可能慢、切槽期间还会失败），关于页不该因此打不开。
   * 所以这里**先本地读 package.json 与 active.json**，控制层可达时再补槽详情。 */
  svc.route('/privhub/api/update/about', async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return json(res, 405, { ok: false, error: 'method not allowed' })
    }
    const u = requireAdmin(req, res)
    if (!u) return

    const current = appVersion()
    const about: Record<string, unknown> = {
      ok: true,
      current,
      managed: managed(),
      deployment: managed() ? '蓝绿双槽（blue-green）' : '单进程直连',
      slots: [] as Array<Record<string, unknown>>,
      note: '',
      switchedAt: null,
      history: [] as Array<Record<string, unknown>>,
    }

    /* active.json：当前版本的正本。
     *
     * ⚠ 2026-11-16 实测踩到：这段以前只读 `join(codeRoot(),'config','active.json')`，
     * 但**蓝绿部署下槽进程的 codeRoot 是 release 目录**（releases/3.6.1），
     * 而 active.json 在实例根的 `privhub/config/` —— release 里根本没有 config/，
     * 于是 try 整个抛错、被 catch 静默吞掉，关于页的槽版本恒为空数组。
     * 现在按「实例根」找：PRIVHUB_DATA_ROOT / PRIVHUB_ROOT 指向实例根，
     * 再兜底 codeRoot 的上一级（release 的父目录）。控制层可达时下面的
     * controlCall 还会覆盖成更权威的值。 */
    try {
      const candidates = [
        process.env.PRIVHUB_DATA_ROOT, process.env.PRIVHUB_ROOT,
        resolve(codeRoot(), '..'), resolve(codeRoot(), '..', '..'), codeRoot(),
      ].filter((x): x is string => typeof x === 'string' && x.trim() !== '')
      let a: Record<string, unknown> | null = null
      for (const root of candidates) {
        const f = join(root, 'config', 'active.json')
        try {
          if (!existsSync(f)) continue
          a = JSON.parse(readFileSync(f, 'utf8')) as Record<string, unknown>
          break
        } catch { /* 换个候选继续找 */ }
      }
      if (a === null) throw new Error('active.json 未找到')
      about.activeVersion = typeof a.version === 'string' ? a.version : null
      about.activeSlot = typeof a.slot === 'string' ? a.slot : null
      about.switchedAt = typeof a.switchedAt === 'string' ? a.switchedAt : null
      about.note = typeof a.currentNote === 'string' ? a.currentNote : ''
      const sv = a.slotVersions && typeof a.slotVersions === 'object' ? a.slotVersions as Record<string, unknown> : {}
      const readVer = (id: string): string | null => (typeof sv[id] === 'string' ? sv[id] as string : null)
      about.slots = SLOT_IDS.map((id) => ({
        id, version: readVer(id), active: a.slot === id,
      }))
      /* 更新记录：当前 + 上一版（active.json 的 previous 链只保留一跳，够说明「上一版是什么」）。 */
      const prev = a.previous && typeof a.previous === 'object' ? a.previous as Record<string, unknown> : null
      const hist: Array<Record<string, unknown>> = []
      if (typeof a.version === 'string') {
        hist.push({ version: a.version, slot: a.slot ?? null, at: a.switchedAt ?? null, current: true })
      }
      if (prev && typeof prev.version === 'string' && prev.version !== a.version) {
        hist.push({ version: prev.version, slot: prev.slot ?? null, at: prev.switchedAt ?? null, current: false })
      }
      about.history = hist
    } catch { /* active.json 缺失/损坏：非蓝绿部署下属正常，保持空 */ }

    /* 控制层可达时补「槽是否健康」——失败不影响关于页。 */
    if (managed()) {
      try {
        const s = await controlCall('/control/update/status', { timeoutMs: CONTROL_FAST_MS }) as Record<string, unknown>
        about.controlReachable = true
        if (typeof s.version === 'string' && s.version !== '') about.current = s.version
        if (Array.isArray(s.slots)) {
          about.slots = (s.slots as Array<Record<string, unknown>>).map((x) => ({
            id: x.id, version: x.version ?? null, active: x.active === true,
            healthy: x.healthy === true, port: x.port ?? null,
          }))
        }
        if (typeof s.currentVersion === 'string' && s.currentVersion !== '') about.current = s.currentVersion
      } catch {
        about.controlReachable = false
      }
    }
    json(res, 200, about)
  }, 'update-about')
}
