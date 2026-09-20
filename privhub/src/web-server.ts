/**
 * 自研 Web 服务器（替代 DSH 底座的 host-webserver）
 *
 * 以 cordis Service 形式注册为 `ctx.webServer`（key 与 DSH 底座一致，
 * 因此 privhub-core 的 svc.route() 无需改动）：
 *   - register({ kind: 'exact', path, handler })：注册 exact 路由，返回可逆 disposer
 *   - 静态服务：frontend/（index.html、vue.global.prod.js、favicon 等）
 *   - 插件 client 映射：/privhub-plugins/<插件名>/<文件> -> plugins/<插件名>/client/<文件>
 *
 * @module src/web-server
 */

import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname, sep } from 'node:path'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { Service } from '@deepseek-ai/cordis'
import type { Context } from '@deepseek-ai/cordis'

export interface WebServerConfig {
  /** 监听端口 */
  port: number
  /** 前端静态根（frontend/） */
  frontendDir: string
  /** 插件目录（plugins/，用于 /privhub-plugins/ 映射） */
  pluginsDir: string
  /** 单请求 JSON/表单请求体字节上限（默认 16MB；文件上传走流式另有限额） */
  maxBodyBytes?: number
}

/** S1：默认请求体上限 16MB（可用 PRIVHUB_BODY_MAX_MB 覆盖）。 */
const DEFAULT_MAX_BODY_BYTES = 16 * 1024 * 1024

/**
 * 自带上限的路由：不参与全局 body 上限预检，由插件内部按各自契约校验。
 *
 * - `/privhub/api/upload`：流式落盘，上限 2GB（files 插件内校验）
 * - `/privhub/api/agent/v1/write`：Agent API 二进制写入，契约上限 200MB
 *   （files-agent 的 LIMITS.writeBinaryMax），超出时返回带 code 的 413 信封。
 *   若纳入全局 16MB 预检会【破坏已发布接口契约】，故必须豁免。
 */
const SELF_LIMITED_PATHS = new Set([
  '/privhub/api/upload',
  '/privhub/api/agent/v1/write',
])

/**
 * 骨架 HTML 的 CSP。
 * S14：`unsafe-inline` 仍保留——骨架内有内联 <script>（Vue 应用入口），
 * 移除需先把它外移为独立文件（已列入《改进建议》S14 第二步）。
 * `unsafe-eval` 也仍然必需：全仓 29 个文件、41 处字符串 `template:`
 * 依赖 Vue 运行时模板编译；贸然移除会导致所有插件 client 白屏。
 * 当前防护由 XSS 出口转义（S3/S4）+ 发布页 sandbox（S2）承担。
 */
const HTML_CSP = "default-src 'self'; script-src 'unsafe-inline' 'unsafe-eval' 'self'; "
  + "style-src 'unsafe-inline' 'self'; img-src 'self' data: blob:; connect-src 'self'; "
  + "font-src 'self' data; frame-ancestors 'self'"

export type RouteHandler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>

declare module '@deepseek-ai/cordis' {
  interface Context {
    webServer: WebServerService
  }
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

export class WebServerService extends Service {
  private readonly routes = new Map<string, RouteHandler>()
  private server: ReturnType<typeof createServer> | null = null

  /**
   * 会话校验钩子：由 main.ts 在 privhub 就绪后注入。
   * 不在本文件 inject privhub —— privhub-core 已经 inject webServer，
   * 反向注入会形成循环依赖，故走显式注入。
   */
  private sessionValidator: ((req: IncomingMessage) => boolean) | null = null

  /** auth slot 插件目录缓存（静态资源鉴权的放行名单；目录扫描较重，5s TTL）。 */
  private static authSlotCache: { at: number; dirs: Set<string> } | null = null

  constructor(ctx: Context, private readonly config: WebServerConfig) {
    super(ctx, 'webServer')
  }

  /** 由 main.ts 在 privhub.ready 之后注入：判断请求是否携带有效会话。 */
  setSessionValidator(fn: (req: IncomingMessage) => boolean): void {
    this.sessionValidator = fn
  }

  /**
   * 登录前必须放行的插件目录名：声明了 `auth` slot 的插件。
   *
   * 登录框本身由插件提供（privhub-auth 挂 auth slot），若连它的代码都要登录才能加载，
   * 就会形成 S16 那类死锁：拿不到插件 → 渲染不出登录框 → 用户无从登录。
   * 这里与 shell 服务端 manifest 分级采用【同一条判据】，避免两处规则漂移。
   *
   * 失败关闭（fail-closed）：manifest 损坏或目录不可读时按「不放行」处理，
   * 宁可让登录框报错，也不要把插件代码暴露出去。
   */
  private authSlotDirs(): Set<string> {
    const now = Date.now()
    const cached = WebServerService.authSlotCache
    if (cached && now - cached.at < 5000) return cached.dirs
    const dirs = new Set<string>()
    const base = this.config.pluginsDir
    try {
      for (const ent of readdirSync(base, { withFileTypes: true })) {
        if (!ent.isDirectory()) continue
        const mf = join(base, ent.name, 'client', 'manifest.json')
        if (!existsSync(mf)) continue
        try {
          const raw = JSON.parse(readFileSync(mf, 'utf8')) as { slots?: unknown }
          if (Array.isArray(raw.slots) && raw.slots.includes('auth')) dirs.add(ent.name)
        } catch { /* 坏 manifest：不放行 */ }
      }
    } catch { /* 目录不可读：不放行 */ }
    WebServerService.authSlotCache = { at: now, dirs }
    return dirs
  }

  /** 注册路由（effect 可逆：返回移除函数）。 */
  register(opts: { kind: 'exact'; path: string; handler: RouteHandler }, _label?: string): () => void {
    if (opts.kind === 'exact') {
      this.routes.set(opts.path, opts.handler)
      return () => { this.routes.delete(opts.path) }
    }
    return () => {}
  }

  /** 当前监听端口（供其它 Service 查询）。 */
  get port(): number { return this.config.port }

  /** S1：单请求请求体上限（字节）。 */
  private get maxBodyBytes(): number {
    if (this.config.maxBodyBytes && this.config.maxBodyBytes > 0) return this.config.maxBodyBytes
    const mb = Number(process.env.PRIVHUB_BODY_MAX_MB)
    if (Number.isFinite(mb) && mb > 0) return Math.floor(mb * 1024 * 1024)
    return DEFAULT_MAX_BODY_BYTES
  }

  /**
   * S1：超限请求以 413 拒绝。
   *
   * 重要：必须等响应真正写出后（res.end 的回调）再断开请求。
   * 客户端此刻仍在发送请求体，若立即 req.destroy() 会触发 TCP RST，
   * 把尚未送达的响应一起丢弃 —— 实测客户端只会看到 ECONNRESET，
   * 拿不到 413，无法区分「体积超限」与「网络故障」。
   */
  private rejectTooLarge(req: IncomingMessage, res: ServerResponse, limit: number): void {
    const payload = JSON.stringify({ ok: false, error: `请求体过大（上限 ${Math.floor(limit / 1024 / 1024)}MB）` })
    try {
      res.writeHead(413, {
        'content-type': 'application/json; charset=utf-8',
        'content-length': Buffer.byteLength(payload),
        connection: 'close',
      })
      res.end(payload, () => {
        // 响应已交给内核缓冲区，此时断开才安全
        req.destroy()
      })
    } catch {
      req.destroy()
    }
  }

  /** 静态文件服务（前端 + 插件 client 映射）。 */
  private async serveStatic(pathname: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
    // /privhub-plugins/<插件名>/<文件> -> plugins/<插件名>/client/<文件>
    // S5：拒绝含 NUL 的路径（防截断绕过）
    if (pathname.includes('\0')) { res.writeHead(400); res.end('bad request'); return }
    const pluginMatch = /^\/privhub-plugins\/([^/]+)\/(.+)$/.exec(pathname)
    if (pluginMatch) {
      const [, pluginName, file] = pluginMatch
      /* 插件前端代码等于本项目 API 的全貌（端点、参数、错误码、内部结构），
       * 未登录者不得靠猜地址把它枚举走——否则「用地址直接读取页面信息」就成立了。
       * 只放行登录框自身所需的最小集合（声明 auth slot 的插件），其余要求有效会话。
       * 会话经 Cookie 传递：浏览器 import() 子资源无法附加 Bearer 头。 */
      if (!this.authSlotDirs().has(pluginName)) {
        const okSession = this.sessionValidator !== null && this.sessionValidator(req)
        if (!okSession) {
          res.writeHead(401, {
            'content-type': 'text/plain; charset=utf-8',
            'cache-control': 'no-store',
            'x-content-type-options': 'nosniff',
          })
          res.end('unauthorized')
          return
        }
      }
      const base = this.config.pluginsDir
      const target = join(base, pluginName, 'client', file)
      // S5：前缀比对必须带路径分隔符，否则 frontend-x/ 这类同前缀兄弟目录会被误判为「在范围内」
      if ((target === base || target.startsWith(base + sep)) && existsSync(target)) {
        return this.sendFile(target, res)
      }
      res.writeHead(404); res.end('not found'); return
    }
    // 前端静态
    const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
    const base = this.config.frontendDir
    const target = join(base, rel)
    if ((target === base || target.startsWith(base + sep)) && existsSync(target)) {
      return this.sendFile(target, res)
    }
    res.writeHead(404); res.end('not found')
  }

  /** P1：静态资源缓存策略——HTML 不缓存（保证能拿到新版本引用），其余按 mtime 协商缓存。 */
  private static isCacheable(ext: string): boolean {
    return ext !== '.html'
  }

  private async sendFile(target: string, res: ServerResponse): Promise<void> {
    try {
      const s = await stat(target)
      if (s.isDirectory()) { res.writeHead(404); res.end('not found'); return }
      const ext = extname(target).toLowerCase()
      const isHtml = ext === '.html'

      /* P1：按 mtime 生成 ETag 并支持 If-None-Match 协商缓存。
       * 此前一律 no-cache，导致每次打开页面都要重传约 2.4MB 静态资源；
       * 而开发期「改了立即生效」的需求改由 ETag 变化来满足——
       * 文件一改 mtime 即变 → ETag 变 → 浏览器自动取新版本，
       * 与 no-cache 的即时性等价，但未变更时返回 304 不传正文。 */
      const etag = `W/"${s.size.toString(16)}-${Math.floor(s.mtimeMs).toString(16)}"`
      const cacheable = WebServerService.isCacheable(ext)
      const headers: Record<string, string | number> = {
        'content-type': MIME[ext] ?? 'application/octet-stream',
        // A13：安全响应头基线
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'SAMEORIGIN',
        'referrer-policy': 'no-referrer',
        ...(isHtml ? { 'content-security-policy': HTML_CSP } : {}),
      }
      if (cacheable) {
        headers.etag = etag
        headers['cache-control'] = 'no-cache' // 语义：每次带 ETag 校验，命中则 304
      } else {
        headers['cache-control'] = 'no-cache'
      }

      const inm = res.req?.headers?.['if-none-match']
      if (cacheable && inm && inm === etag) {
        res.writeHead(304, headers)
        res.end()
        return
      }

      const body = await readFile(target)
      headers['content-length'] = body.length
      res.writeHead(200, headers)
      res.end(body)
    } catch {
      res.writeHead(404); res.end('not found')
    }
  }

  /** 启动 HTTP 服务。 */
  async listen(port = this.config.port): Promise<void> {
    if (this.server) return
    const routes = this.routes
    const self = this
    const maxBody = this.maxBodyBytes
    this.server = createServer((req, res) => {
      void (async () => {
        try {
          const url = new URL(req.url ?? '/', 'http://localhost')
          /* S1：请求体上限。
           * 此处按 content-length 预检（覆盖绝大多数客户端，能在读取前就拒绝）。
           * chunked（无 content-length）拿不到预检信息，由 core.readBody 在累积过程中
           * 兜底并以 413 语义抛错；自带上限的路由（上传 / Agent 写入）豁免，
           * 否则会破坏它们各自的体积契约。 */
          if (!SELF_LIMITED_PATHS.has(url.pathname)) {
            const cl = Number(req.headers['content-length'])
            if (Number.isFinite(cl) && cl > maxBody) return self.rejectTooLarge(req, res, maxBody)
          }
          const handler = routes.get(url.pathname)
          if (handler) return await handler(req, res)
          await self.serveStatic(url.pathname, req, res)
        } catch (e) {
          /* O3/07 修复：此处是全站【唯一】兜底 catch —— 此前它把异常整个吞掉
           * （e 未被使用、无任何日志），表现为「接口 500 但日志里查不到原因」。
           * 现在把异常写进系统日志（console 已被 main.ts 的 installFileLogger
           * 接到 data/logs/privhub-YYYY-MM-DD.log），响应行为保持原样：仍是 500。 */
          console.error('[webServer] 路由处理异常 ' + req.method + ' ' + (req.url ?? '') + ':', e)
          try { res.writeHead(500); res.end('internal server error') } catch { /* 忽略 */ }
        }
      })()
    })
    await new Promise<void>((ok, err) => {
      this.server!.once('error', err)
      this.server!.listen(port, () => { this.server!.off('error', err); ok() })
    })
  }

  /** 关闭服务。 */
  async close(): Promise<void> {
    if (!this.server) return
    const s = this.server
    this.server = null
    await new Promise<void>((ok) => s.close(() => ok()))
  }
}
