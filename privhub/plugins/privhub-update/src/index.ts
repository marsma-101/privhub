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

import { readFileSync } from 'node:fs'
import { request as httpRequest } from 'node:http'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { json, readJsonBody } from '../../privhub-core/src/index'

export const name = 'privhub-update'
export const inject = ['privhub', 'audit', 'cap']

const CONTROL_TIMEOUT_MS = 16 * 60 * 1000
const CONTROL_FAST_MS = 15_000

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
}
