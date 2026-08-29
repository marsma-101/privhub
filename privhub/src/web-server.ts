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
import { join, extname } from 'node:path'
import { existsSync } from 'node:fs'
import { Service } from '@deepseek-ai/cordis'
import type { Context } from '@deepseek-ai/cordis'

export interface WebServerConfig {
  /** 监听端口 */
  port: number
  /** 前端静态根（frontend/） */
  frontendDir: string
  /** 插件目录（plugins/，用于 /privhub-plugins/ 映射） */
  pluginsDir: string
}

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

  constructor(ctx: Context, private readonly config: WebServerConfig) {
    super(ctx, 'webServer')
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

  /** 静态文件服务（前端 + 插件 client 映射）。 */
  private async serveStatic(pathname: string, res: ServerResponse): Promise<void> {
    // /privhub-plugins/<插件名>/<文件> -> plugins/<插件名>/client/<文件>
    const pluginMatch = /^\/privhub-plugins\/([^/]+)\/(.+)$/.exec(pathname)
    if (pluginMatch) {
      const [, pluginName, file] = pluginMatch
      const target = join(this.config.pluginsDir, pluginName, 'client', file)
      if (target.startsWith(this.config.pluginsDir) && existsSync(target)) {
        return this.sendFile(target, res)
      }
      res.writeHead(404); res.end('not found'); return
    }
    // 前端静态
    const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
    const target = join(this.config.frontendDir, rel)
    if (target.startsWith(this.config.frontendDir) && existsSync(target)) {
      return this.sendFile(target, res)
    }
    res.writeHead(404); res.end('not found')
  }

  private async sendFile(target: string, res: ServerResponse): Promise<void> {
    try {
      const s = await stat(target)
      if (s.isDirectory()) { res.writeHead(404); res.end('not found'); return }
      const body = await readFile(target)
      const ext = extname(target).toLowerCase()
      const isHtml = ext === '.html'
      res.writeHead(200, {
        'content-type': MIME[ext] ?? 'application/octet-stream',
        'content-length': body.length,
        // A13：安全响应头基线（HTML 附加宽松 CSP；Vue 运行时模板编译需 unsafe-eval，迁移到 SFC 预编译后可移除）
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'referrer-policy': 'no-referrer',
        ...(isHtml ? { 'content-security-policy': "default-src 'self'; script-src 'unsafe-inline' 'unsafe-eval' 'self'; style-src 'unsafe-inline' 'self'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self' data:" } : {}),
      })
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
    this.server = createServer((req, res) => {
      void (async () => {
        try {
          const url = new URL(req.url ?? '/', 'http://localhost')
          const handler = routes.get(url.pathname)
          if (handler) return await handler(req, res)
          await self.serveStatic(url.pathname, res)
        } catch (e) {
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
