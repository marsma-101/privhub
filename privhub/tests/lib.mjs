/**
 * PrivHub 回归测试公共库（O4）
 *
 * 纯 node:http 实现，无第三方依赖。所有测试通过 HTTP 打真实服务，
 * 默认目标 http://127.0.0.1:3190（隔离测试实例），可用 PRIVHUB_TEST_BASE 覆盖。
 *
 * @module tests/lib
 */

import { request as httpRequest } from 'node:http'

export const BASE = process.env.PRIVHUB_TEST_BASE || 'http://127.0.0.1:3190'

/* ---------------- 断言 ---------------- */

export class AssertionError extends Error {
  constructor(msg) { super(msg); this.name = 'AssertionError' }
}

export function ok(cond, msg) {
  if (!cond) throw new AssertionError(msg || '断言失败')
}

export function eq(actual, expected, msg) {
  if (actual !== expected) {
    throw new AssertionError(`${msg || '值不相等'}：期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`)
  }
}

export function includes(haystack, needle, msg) {
  if (!String(haystack).includes(needle)) {
    throw new AssertionError(`${msg || '不包含'}：${JSON.stringify(String(haystack).slice(0, 200))} 中未找到 ${JSON.stringify(needle)}`)
  }
}

export function notIncludes(haystack, needle, msg) {
  if (String(haystack).includes(needle)) {
    throw new AssertionError(`${msg || '不应包含'}：${JSON.stringify(String(haystack).slice(0, 200))} 中出现了 ${JSON.stringify(needle)}`)
  }
}

/* ---------------- HTTP ---------------- */

/**
 * 发起请求。
 * @param {string} method
 * @param {string} path 形如 '/privhub/api/login'
 * @param {{token?: string, body?: any, raw?: Buffer|string, headers?: Record<string,string>, timeoutMs?: number}} [opts]
 * @returns {Promise<{status:number, headers:Record<string,string>, text:string, json:any, buffer:Buffer}>}
 */
export function req(method, path, opts = {}) {
  const url = new URL(path, BASE)
  const headers = { ...(opts.headers || {}) }
  let payload = null
  if (opts.raw !== undefined) {
    payload = Buffer.isBuffer(opts.raw) ? opts.raw : Buffer.from(String(opts.raw), 'utf8')
  } else if (opts.body !== undefined) {
    payload = Buffer.from(JSON.stringify(opts.body), 'utf8')
    headers['content-type'] = headers['content-type'] || 'application/json'
  }
  if (opts.token) headers.authorization = 'Bearer ' + opts.token
  if (payload) headers['content-length'] = String(payload.length)

  return new Promise((resolve, reject) => {
    const r = httpRequest({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers,
      timeout: opts.timeoutMs ?? 30000,
    }, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        const buffer = Buffer.concat(chunks)
        const text = buffer.toString('utf8')
        let json = null
        try { json = JSON.parse(text) } catch { /* 非 JSON（二进制/HTML） */ }
        resolve({ status: res.statusCode, headers: res.headers, text, json, buffer })
      })
      res.on('error', reject)
    })
    r.on('error', reject)
    r.on('timeout', () => { r.destroy(new Error('请求超时 ' + (opts.timeoutMs ?? 30000) + 'ms')) })
    if (payload) r.write(payload)
    r.end()
  })
}

export const GET = (p, o) => req('GET', p, o)
export const POST = (p, o) => req('POST', p, o)
export const PUT = (p, o) => req('PUT', p, o)
export const DEL = (p, o) => req('DELETE', p, o)

/* ---------------- 业务辅助 ---------------- */

export async function login(username, password) {
  const r = await POST('/privhub/api/login', { body: { username, password } })
  return r
}

export async function loginOk(username, password) {
  const r = await login(username, password)
  ok(r.json && r.json.ok && r.json.token, `${username} 登录失败：${r.status} ${r.text.slice(0, 120)}`)
  return r.json.token
}

export async function uploadFile(token, project, subPath, name, content) {
  const q = new URLSearchParams({ project, name })
  if (subPath) q.set('path', subPath)
  return POST('/privhub/api/upload?' + q.toString(), { token, raw: content })
}

export async function listDir(token, project, subPath = '') {
  const q = new URLSearchParams({ project })
  if (subPath) q.set('path', subPath)
  const r = await GET('/privhub/api/list?' + q.toString(), { token })
  ok(r.json && r.json.ok, '列目录失败：' + r.text.slice(0, 120))
  return r.json.entries
}

/** 删除项目内条目（找不到也不报错，用于清理）。 */
export async function safeDelete(token, project, path) {
  return POST('/privhub/api/delete', { token, body: { project, path } }).catch(() => null)
}

/** 清理回收站中属于指定项目的条目。 */
export async function purgeTrashOfProject(token, project) {
  const r = await GET('/privhub/api/trash-list', { token })
  if (!r.json || !r.json.ok) return 0
  let n = 0
  for (const item of (r.json.trash || r.json.items || r.json.entries || [])) {
    if (item.project === project) {
      await POST('/privhub/api/trash-purge', { token, body: { id: item.id } }).catch(() => null)
      n++
    }
  }
  return n
}

/* ---------------- 测试运行器 ---------------- */

export function createSuite(name) {
  const cases = []
  const api = {
    name,
    test(title, fn) { cases.push({ title, fn }) },
    async run() {
      const results = []
      for (const c of cases) {
        const started = Date.now()
        try {
          await c.fn()
          results.push({ title: c.title, pass: true, ms: Date.now() - started })
        } catch (e) {
          results.push({ title: c.title, pass: false, ms: Date.now() - started, error: e })
        }
      }
      return results
    },
  }
  return api
}

export function report(suitesResults) {
  let pass = 0
  let fail = 0
  for (const { suite, results } of suitesResults) {
    console.log(`\n── ${suite} ──`)
    for (const r of results) {
      if (r.pass) {
        pass++
        console.log(`  ✅ ${r.title}  (${r.ms}ms)`)
      } else {
        fail++
        console.log(`  ❌ ${r.title}  (${r.ms}ms)`)
        console.log(`     ${r.error && r.error.message}`)
        if (r.error && r.error.stack && process.env.PRIVHUB_TEST_VERBOSE) {
          console.log(r.error.stack.split('\n').slice(1, 4).join('\n'))
        }
      }
    }
  }
  console.log(`\n${'='.repeat(56)}`)
  console.log(`  结果：${pass} 通过 / ${fail} 失败 / 共 ${pass + fail}`)
  console.log('='.repeat(56))
  return fail === 0
}

export async function waitForServer(timeoutMs = 40000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const r = await GET('/', { timeoutMs: 3000 })
      if (r.status === 200) return true
    } catch { /* 未就绪 */ }
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}
