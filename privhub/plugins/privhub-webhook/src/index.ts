/**
 * privhub-webhook —— 事件订阅（把 PrivHub 里发生的事 POST 到指定地址）
 *
 * 用户拍板的形态：**全部事件**（文件 / 任务 / 看板 / 审计）+ HMAC-SHA256 签名 +
 * 失败重试 + 管理面板。生产环境要拿它去驱动外部流水（通知、镜像、工单、监控）。
 *
 * 路由（exact 匹配，资源标识走 query/body；**全部仅管理员**）：
 *   GET    /privhub/api/webhook/list                     订阅列表（不含密钥）+ 队列统计
 *   GET    /privhub/api/webhook/events                   可订阅事件目录（供界面勾选）
 *   POST   /privhub/api/webhook/save   {id?|name,url,events?,project?,enabled?,secret?,rotate?}
 *   POST   /privhub/api/webhook/delete {id}
 *   POST   /privhub/api/webhook/toggle {id,enabled}
 *   GET    /privhub/api/webhook/deliveries ?hookId=&limit=   投递日志（新的在前）
 *   POST   /privhub/api/webhook/replay {id}              按日志原样重发一次
 *   POST   /privhub/api/webhook/test   {id}              发一条 ping，同步回结果
 *
 * ## 三条设计口径（都是有意的取舍）
 *
 * 1. **投递绝不影响写入路径。** 监听器只做「入队 + 立刻返回」，真正的 POST 在
 *    另一条异步链上跑。cordis 的 `emit` 是同步的，监听器里 `await fetch` 会把
 *    上传/保存这类写操作按在对端的响应时间上（对端挂了 = 写操作跟着卡 8 秒）。
 *    同理，监听器整体包了 try/catch：一个抛异常的监听器会顺着 `emit` 冒回调用方，
 *    把「文件已保存成功」这件事变成 500。**webhook 坏了不能拖垮文件操作。**
 *
 * 2. **每个订阅各自一条串行链。** 同一订阅内部保持发出顺序（先 upload 后 delete
 *    乱序会让订阅方的状态机错乱），但订阅之间互不阻塞 —— 一个地址黑洞（连不上、
 *    要等满超时并重试）不该让其它订阅的投递一起排队。旧的「全局单队列」写法正是
 *    这个坑：一个坏地址能让好地址延迟几十秒。
 *
 * 3. **密钥只进不出。** `secret` 落盘（经 ctx.storage 加密），任何列表/详情响应都
 *    不回传它，只回 `hasSecret`；仅「生成/轮换密钥」的那一次响应里回显，界面提示
 *    「请立即复制，此后不再显示」。这样一个被复制的抓包/截图不会变成长期凭据。
 *
 * 鉴权：全部路由 `requireUser(401) → role==='admin'(403)`。订阅地址与密钥是
 * 全实例级别的出网凭据，普通用户不应看到（更不该改）。
 *
 * 数据：
 *   - `data/webhooks.json`    订阅配置（含密钥）—— 严格读取：损坏即中止，不覆盖。
 *   - `data/webhook-log.json` 投递日志（环形 300 条）—— 宽容读取：它只是诊断记录，
 *     丢了不影响任何投递能力，损坏时隔离存证后按空日志继续（重建即可）。
 *
 * @module privhub-webhook
 */

import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import {
  json, readBody, readJsonStore, readJsonStoreLenient, assertStoreWritable,
} from '../../privhub-core/src/index'
import {
  LIMITS, EVENTS, PING_EVENT,
  blankHook, buildBody, classifyStatus, cleanEvents, cleanName, cleanSecret, cleanUrl,
  genSecret, hookMatches, newId, projectOf, pushLog, sign, toView, trimPayload,
} from './core'
import type { DeliveryRecord, Hook, HookView } from './core'

export const name = 'privhub-webhook'
export const inject = ['privhub', 'storage', 'audit', 'eventBus', 'cap']

/** 监听的 8 个事件（与 core.ts 的 EVENTS 一一对应；改一边必须改另一边）。 */
const LISTEN = [
  'file:changed', 'file:saved', 'meta:changed', 'personal:renamed',
  'audit:logged', 'task:changed', 'dashboard:changed', 'roster:changed',
] as const

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()
const CFG_FILE = join(rootDir, 'data', 'webhooks.json')
const LOG_FILE = join(rootDir, 'data', 'webhook-log.json')

/** 订阅配置文件的形状（严格读取时的 check）。 */
function looksLikeStore(v: unknown): boolean {
  return !!v && typeof v === 'object' && Array.isArray((v as { hooks?: unknown }).hooks)
}

function msgOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/**
 * 错误文本脱敏：与 svc-model 同一套口径。投递错误里可能带上订阅地址
 * （`Failed to parse URL from <url>` 之类），地址不是密钥但 URL 里可能被填进
 * userinfo（`https://user:pass@host/`），所以统一剥掉 userinfo 再落日志。
 */
function sanitizeError(input: string, max = 300): string {
  return String(input)
    .replace(/\b(sk-[A-Za-z0-9_-]{4})[A-Za-z0-9_-]+/g, '$1***')
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi, '$1***')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

/** 去掉地址里的 userinfo 与 query（日志里要能看出「发给谁」，又不带凭据）。 */
function endpointLabel(url: string): string {
  return String(url ?? '')
    .replace(/\/\/[^/@]*@/, '//')
    .replace(/\?[^#]*/, '?…')
    .slice(0, 300)
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

export function apply(ctx: Context): void {
  ctx.eventBus.declareEmit('audit:logged', 'privhub-webhook', 'Webhook 配置变更审计广播（S1 闭环）')
  for (const ev of LISTEN) ctx.eventBus.declareListen(ev, 'privhub-webhook', 'Webhook 订阅投递')

  const svc = ctx.privhub

  /* ---------- 内存态 ---------- */

  let hooks: Hook[] = []
  /** 配置文件损坏 → 拒绝一切写入（免得把可能可恢复的订阅+密钥覆盖掉）。 */
  let cfgCorrupt = false
  /** 配置文件是否已成功读过一次（未读完之前不接受投递，避免用空订阅集乱跑）。 */
  let cfgLoaded = false
  const log: DeliveryRecord[] = []
  /** 每个订阅一条串行链：链内保序，链间并行。 */
  const chains = new Map<string, Promise<void>>()
  /** 每个订阅的待投递积压数（超过 LIMITS.backlogMax 丢弃并计数）。 */
  const backlog = new Map<string, number>()
  let dropped = 0
  let delivered = 0

  /* ---------- 配置读写 ---------- */

  async function loadAll(): Promise<void> {
    try {
      const raw = await readJsonStore<{ hooks: Hook[] }>(ctx.storage, CFG_FILE, { hooks: [] }, looksLikeStore)
      hooks = (Array.isArray(raw.hooks) ? raw.hooks : [])
        .map((h) => blankHook({ ...h, events: Array.isArray(h?.events) ? h.events : [] }))
        .filter((h) => h.id && h.url)
        .slice(0, LIMITS.maxHooks)
    } catch (e) {
      cfgCorrupt = true
      hooks = []
      console.error('[webhook] 订阅配置读取失败（改动已被拒绝，避免覆盖）：' + msgOf(e))
    }
    try {
      // 日志是**派生数据**：真身就是本插件投递过的事实，丢了重建即可 —— 用宽容读，
      // 不因为一份诊断记录损坏就让整个订阅功能不可用。
      const raw = await readJsonStoreLenient<{ deliveries: DeliveryRecord[] }>(
        ctx.storage, LOG_FILE, { deliveries: [] },
      )
      const list = Array.isArray(raw.deliveries) ? raw.deliveries : []
      for (const r of list.slice(0, LIMITS.logMax)) if (r && r.id) log.push(r)
    } catch (e) {
      console.error('[webhook] 投递日志读取失败（按空日志继续）：' + msgOf(e))
    }
    cfgLoaded = true
  }

  /** 串行化的写盘：并发投递各自落一条记录，不能让两次写入互相截断。 */
  let writeChain: Promise<void> = Promise.resolve()
  function persist(): Promise<void> {
    const snapshot = JSON.stringify({ hooks }, null, 2)
    const logSnapshot = JSON.stringify({ deliveries: log.slice(0, LIMITS.logMax) }, null, 2)
    writeChain = writeChain.then(async () => {
      try {
        assertStoreWritable(!cfgCorrupt, CFG_FILE)
        await ctx.storage.writeText(CFG_FILE, snapshot)
        await ctx.storage.writeText(LOG_FILE, logSnapshot)
      } catch (e) {
        console.error('[webhook] 写入失败：' + msgOf(e))
      }
    })
    return writeChain
  }

  /* ---------- 投递 ---------- */

  interface Attempt { ok: boolean; status: number; error: string }

  /** 单次尝试：一次 POST，超时即中止。 */
  async function attemptOnce(hook: Hook, body: string, deliveryId: string, event: string): Promise<Attempt> {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), LIMITS.timeoutMs)
    try {
      const res = await fetch(hook.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'user-agent': 'PrivHub-Webhook/1.0',
          'x-privhub-event': event,
          'x-privhub-delivery': deliveryId,
          'x-privhub-signature': sign(hook.secret, body),
        },
        body,
        signal: ctrl.signal,
      })
      if (res.ok) {
        // 必须把回包读掉：不读完的响应会占着连接（undici 的连接池会耗干）。
        await res.text().catch(() => '')
        return { ok: true, status: res.status, error: '' }
      }
      const raw = await res.text().catch(() => '')
      return {
        ok: false,
        status: res.status,
        error: 'HTTP ' + res.status + (raw ? '：' + sanitizeError(raw, 200) : ''),
      }
    } catch (e) {
      const label = endpointLabel(hook.url)
      if ((e as Error).name === 'AbortError') {
        return { ok: false, status: 0, error: `超时（>${LIMITS.timeoutMs}ms 无响应）：${label}` }
      }
      return { ok: false, status: 0, error: sanitizeError(`无法连接 ${label}：${msgOf(e).slice(0, 160)}`) }
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * 投递一条事件到一个订阅（含重试），结果落日志 + 更新订阅统计。
   *
   * @param replayOf 人工重放时带上原记录 id（日志里能看出「这条是人重发的」）
   */
  async function deliver(hook: Hook, event: string, data: unknown, replayOf = ''): Promise<DeliveryRecord> {
    const id = newId('d')
    const at = Date.now()
    const { body } = buildBody({ id, event, at, data })
    let attempts = 0
    let res: Attempt = { ok: false, status: 0, error: '未尝试' }
    const t0 = Date.now()

    for (let i = 0; i < LIMITS.attempts; i++) {
      attempts++
      res = await attemptOnce(hook, body, id, event)
      if (res.ok) break
      const verdict = classifyStatus(res.status)
      // 4xx（非 408/429）= 重试也没用：地址写错了不会因为再发一次就变对。
      if (verdict === 'fail') break
      if (i === LIMITS.attempts - 1) break
      // 期间订阅被停用/删除就不再重试（人已经明确表示不要了）
      const cur = hooks.find((h) => h.id === hook.id)
      if (!cur || !cur.enabled) break
      await sleep(LIMITS.backoffMs[Math.min(i, LIMITS.backoffMs.length - 1)])
    }

    const rec: DeliveryRecord = {
      id, hookId: hook.id, event, at, url: hook.url,
      ok: res.ok,
      httpStatus: res.status > 0 ? res.status : null,
      ms: Date.now() - t0,
      attempts,
      error: res.ok ? '' : res.error,
      body,
      bodyBytes: Buffer.byteLength(body, 'utf8'),
      ...(replayOf ? { replayOf } : {}),
    }
    pushLog(log, rec)

    const cur = hooks.find((h) => h.id === hook.id)
    if (cur) {
      cur.lastAt = at
      cur.lastStatus = res.ok ? 'ok' : 'fail'
      cur.lastError = res.ok ? '' : res.error
      if (res.ok) cur.delivered = (Number(cur.delivered) || 0) + 1
      else cur.failed = (Number(cur.failed) || 0) + 1
    }
    if (res.ok) delivered++
    void persist()
    return rec
  }

  /**
   * 入队一条事件（同步、立刻返回）。**这是监听器唯一做的事。**
   *
   * 载荷在**入队时就裁剪**（而不是等投递时）：`file:saved` 的 `doc` 可能有几 MB，
   * 留到异步链上再裁，等于把整篇正文在内存里多挂一段不确定的时间。
   * （`trimPayload` 幂等，所以构造正文时再裁一次是安全的 —— 只裁没裁过的。）
   */
  function enqueue(event: string, data: unknown): void {
    if (!cfgLoaded || hooks.length === 0) return
    const project = projectOf(data)
    const trimmed = trimPayload(event, data)
    for (const hook of hooks) {
      if (!hookMatches(hook, event, project)) continue
      const pending = backlog.get(hook.id) ?? 0
      if (pending >= LIMITS.backlogMax) { dropped++; continue }
      backlog.set(hook.id, pending + 1)
      const prev = chains.get(hook.id) ?? Promise.resolve()
      const next = prev
        .then(() => deliver(hook, event, trimmed))
        .catch((e) => { console.error('[webhook] 投递异常：' + msgOf(e)) })
        .finally(() => {
          const left = (backlog.get(hook.id) ?? 1) - 1
          if (left <= 0) backlog.delete(hook.id)
          else backlog.set(hook.id, left)
        })
      chains.set(hook.id, next)
    }
  }

  /* ---------- 监听（try/catch 兜底：监听器抛错会冒回写操作调用方） ---------- */

  function listen(event: string): void {
    ctx.on(event as never, ((data: unknown) => {
      try { enqueue(event, data) } catch (e) { console.error('[webhook] 入队失败：' + msgOf(e)) }
    }) as never)
  }
  for (const ev of LISTEN) listen(ev)

  /* ---------- 审计 ---------- */

  const audit = async (u: { username: string }, action: string, target: string, detail?: string): Promise<void> => {
    const rec = await ctx.audit.log({ user: u.username, action, target, detail }).catch(() => null)
    if (rec) ctx.emit('audit:logged', rec)
  }

  /** 管理端点统一入口：未登录 401（requireUser 自己写）、非管理员 403。 */
  function requireAdmin(req: unknown, res: unknown): { username: string } | null {
    const u = svc.requireUser(req as never, res as never)
    if (!u) return null
    // 订阅/投递日志查询是 GET（read），增删改与重放是写（write）
    const need = (req as { method?: string }).method === 'GET' ? 'read' : 'write'
    if (!ctx.cap.can(u, 'admin.webhook', need)) {
      json(res as never, 403, { ok: false, error: '仅管理员' })
      return null
    }
    return u as { username: string }
  }

  function queryParam(req: unknown, key: string): string {
    const url = new URL(String((req as { url?: string }).url ?? '/'), 'http://x')
    return url.searchParams.get(key) ?? ''
  }

  function findHook(id: string): Hook | undefined {
    return hooks.find((h) => h.id === id)
  }

  /**
   * 队列统计。
   *
   * `delivered` / `dropped` 是**本次启动以来**的计数（内存态）：它们要回答的是
   * 「现在这条链路健康吗」，重启不清零反而会让「刚修好又出问题」看不出来。
   * 每个订阅的历史成功/失败次数在 `Hook.delivered/failed` 里（随配置落盘）。
   */
  function stats(): Record<string, number> {
    let pending = 0
    for (const n of backlog.values()) pending += n
    return { hooks: hooks.length, enabled: hooks.filter((h) => h.enabled).length, delivered, dropped, pending, logged: log.length }
  }

  /* ---------- 路由：目录 ---------- */

  svc.route('/privhub/api/webhook/events', async (req, res) => {
    if (!requireAdmin(req, res)) return
    json(res, 200, {
      ok: true,
      events: EVENTS.map((e) => ({ ...e, recent: log.filter((r) => r.event === e.name).length })),
      ping: PING_EVENT,
      limits: LIMITS,
      note: 'events 留空 = 订阅全部事件；审计事件载荷里没有项目字段，设了项目过滤的订阅收不到它。',
    })
  }, 'webhook-events')

  /* ---------- 路由：列表 ---------- */

  svc.route('/privhub/api/webhook/list', async (req, res) => {
    if (!requireAdmin(req, res)) return
    json(res, 200, {
      ok: true,
      hooks: hooks.map(toView),
      stats: stats(),
      corrupt: cfgCorrupt,
    })
  }, 'webhook-list')

  /* ---------- 路由：新建 / 修改 ---------- */

  svc.route('/privhub/api/webhook/save', async (req, res) => {
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    const u = requireAdmin(req, res)
    if (!u) return
    let body: Record<string, unknown>
    try { body = JSON.parse(await readBody(req)) as Record<string, unknown> } catch {
      return json(res, 400, { ok: false, error: 'invalid json' })
    }

    const id = String(body.id ?? '').trim()
    const existing = id ? findHook(id) : undefined
    if (id && !existing) return json(res, 404, { ok: false, error: '订阅不存在' })
    if (!existing && hooks.length >= LIMITS.maxHooks) {
      return json(res, 400, { ok: false, error: `订阅数已达上限 ${LIMITS.maxHooks}` })
    }

    const url = cleanUrl(body.url)
    if (!url.ok) return json(res, 400, { ok: false, error: url.error })
    const secret = cleanSecret(body.secret)
    if (!secret.ok) return json(res, 400, { ok: false, error: secret.error })
    const project = String(body.project ?? '').trim()
    if (project && !svc.isValidProjectName(project)) return json(res, 400, { ok: false, error: '项目名无效' })
    const events = cleanEvents(body.events)

    // 密钥策略：新建没给就生成；显式 rotate=1 也重生成；改地址时**保留**原密钥
    // （改地址不该让订阅方那边验签突然全挂）。
    let issued = ''
    let nextSecret = existing?.secret ?? ''
    if (!existing || body.rotate === true) {
      nextSecret = secret.value || genSecret()
      issued = nextSecret
    } else if (secret.value) {
      nextSecret = secret.value
      issued = nextSecret
    }

    const hook: Hook = existing ?? blankHook({ id: newId('w'), createdAt: Date.now(), createdBy: u.username })
    hook.name = cleanName(body.name, url.value)
    hook.url = url.value
    hook.secret = nextSecret
    hook.events = events
    hook.project = project
    hook.enabled = body.enabled === undefined ? (existing ? existing.enabled : true) : body.enabled === true

    assertStoreWritable(!cfgCorrupt, CFG_FILE)
    if (!existing) hooks.push(hook)
    await persist()
    void audit(u, existing ? 'webhook-update' : 'webhook-create', hook.id, `url=${endpointLabel(hook.url)} events=${events.length ? events.join(',') : '全部'}`)
    // 密钥只在「刚生成/刚轮换」的这一次响应里回显。
    json(res, 200, { ok: true, hook: toView(hook), ...(issued ? { secret: issued } : {}) })
  }, 'webhook-save')

  /* ---------- 路由：删除 ---------- */

  svc.route('/privhub/api/webhook/delete', async (req, res) => {
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    const u = requireAdmin(req, res)
    if (!u) return
    let body: Record<string, unknown>
    try { body = JSON.parse(await readBody(req)) as Record<string, unknown> } catch {
      return json(res, 400, { ok: false, error: 'invalid json' })
    }
    const hook = findHook(String(body.id ?? ''))
    if (!hook) return json(res, 404, { ok: false, error: '订阅不存在' })
    assertStoreWritable(!cfgCorrupt, CFG_FILE)
    hooks = hooks.filter((h) => h.id !== hook.id)
    // 已排队的投递在每次尝试前会重新查 hooks，删除后会自动停下（不发已经取消的东西）。
    await persist()
    void audit(u, 'webhook-delete', hook.id, `url=${endpointLabel(hook.url)}`)
    json(res, 200, { ok: true })
  }, 'webhook-delete')

  /* ---------- 路由：启用 / 停用 ---------- */

  svc.route('/privhub/api/webhook/toggle', async (req, res) => {
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    const u = requireAdmin(req, res)
    if (!u) return
    let body: Record<string, unknown>
    try { body = JSON.parse(await readBody(req)) as Record<string, unknown> } catch {
      return json(res, 400, { ok: false, error: 'invalid json' })
    }
    const hook = findHook(String(body.id ?? ''))
    if (!hook) return json(res, 404, { ok: false, error: '订阅不存在' })
    assertStoreWritable(!cfgCorrupt, CFG_FILE)
    hook.enabled = body.enabled === true
    await persist()
    void audit(u, 'webhook-toggle', hook.id, hook.enabled ? '启用' : '停用')
    json(res, 200, { ok: true, hook: toView(hook) })
  }, 'webhook-toggle')

  /* ---------- 路由：投递日志 ---------- */

  svc.route('/privhub/api/webhook/deliveries', async (req, res) => {
    if (!requireAdmin(req, res)) return
    const hookId = queryParam(req, 'hookId')
    const limit = Math.max(1, Math.min(200, Number(queryParam(req, 'limit')) || 50))
    const list = (hookId ? log.filter((r) => r.hookId === hookId) : log).slice(0, limit)
    // 正文不回给界面（可能是文档片段）：列表只给体积，需要重发走 replay 由服务端照发。
    json(res, 200, {
      ok: true,
      deliveries: list.map((r) => ({
        id: r.id, hookId: r.hookId, event: r.event, at: r.at, url: r.url,
        ok: r.ok, httpStatus: r.httpStatus, ms: r.ms, attempts: r.attempts,
        error: r.error, bodyBytes: r.bodyBytes, replayOf: r.replayOf ?? '',
      })),
      total: hookId ? log.filter((r) => r.hookId === hookId).length : log.length,
    })
  }, 'webhook-deliveries')

  /* ---------- 路由：重放 ---------- */

  svc.route('/privhub/api/webhook/replay', async (req, res) => {
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    const u = requireAdmin(req, res)
    if (!u) return
    let body: Record<string, unknown>
    try { body = JSON.parse(await readBody(req)) as Record<string, unknown> } catch {
      return json(res, 400, { ok: false, error: 'invalid json' })
    }
    const rec = log.find((r) => r.id === String(body.id ?? ''))
    if (!rec) return json(res, 404, { ok: false, error: '投递记录不存在（日志已滚出或已清空）' })
    const hook = findHook(rec.hookId)
    if (!hook) return json(res, 404, { ok: false, error: '订阅已删除，无法重放' })
    // 重放发往**订阅当前的地址**（可能已经被改过）：日志里那份地址只作记录。
    // 载荷用日志里存的原文重发，不重新构造 —— 这样「重放」确实是原样的那一条。
    const resent = await deliverForReplay(hook, rec)
    void audit(u, 'webhook-replay', hook.id, `of=${rec.id} event=${rec.event}`)
    json(res, 200, {
      ok: true,
      delivery: {
        id: resent.id, hookId: resent.hookId, event: resent.event, at: resent.at,
        url: resent.url, ok: resent.ok, httpStatus: resent.httpStatus, ms: resent.ms,
        attempts: resent.attempts, error: resent.error, bodyBytes: resent.bodyBytes,
        replayOf: resent.replayOf ?? '',
      },
    })
  }, 'webhook-replay')

  /** 重放：不改载荷，只换投递 id 与签名外的头部。 */
  async function deliverForReplay(hook: Hook, rec: DeliveryRecord): Promise<DeliveryRecord> {
    const id = newId('d')
    const at = Date.now()
    let attempts = 0
    let res: Attempt = { ok: false, status: 0, error: '未尝试' }
    const t0 = Date.now()
    for (let i = 0; i < LIMITS.attempts; i++) {
      attempts++
      res = await attemptOnce(hook, rec.body, id, rec.event)
      if (res.ok) break
      if (classifyStatus(res.status) === 'fail') break
      if (i === LIMITS.attempts - 1) break
      await sleep(LIMITS.backoffMs[Math.min(i, LIMITS.backoffMs.length - 1)])
    }
    const out: DeliveryRecord = {
      id, hookId: hook.id, event: rec.event, at, url: hook.url,
      ok: res.ok, httpStatus: res.status > 0 ? res.status : null,
      ms: Date.now() - t0, attempts, error: res.ok ? '' : res.error,
      body: rec.body, bodyBytes: rec.bodyBytes, replayOf: rec.id,
    }
    pushLog(log, out)
    const cur = findHook(hook.id)
    if (cur) {
      cur.lastAt = at
      cur.lastStatus = res.ok ? 'ok' : 'fail'
      cur.lastError = res.ok ? '' : res.error
      if (res.ok) cur.delivered = (Number(cur.delivered) || 0) + 1
      else cur.failed = (Number(cur.failed) || 0) + 1
    }
    if (res.ok) delivered++
    void persist()
    return out
  }

  /* ---------- 路由：测试投递（同步回结果，界面等着看） ---------- */

  svc.route('/privhub/api/webhook/test', async (req, res) => {
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    const u = requireAdmin(req, res)
    if (!u) return
    let body: Record<string, unknown>
    try { body = JSON.parse(await readBody(req)) as Record<string, unknown> } catch {
      return json(res, 400, { ok: false, error: 'invalid json' })
    }
    const hook = findHook(String(body.id ?? ''))
    if (!hook) return json(res, 404, { ok: false, error: '订阅不存在' })
    // 测试投递只试一次：界面要的是「现在通不通」的即时答案，不是把超时×3 等满。
    const rec = await deliverPingOnce(hook)
    void audit(u, 'webhook-test', hook.id, rec.ok ? 'ok' : 'fail')
    json(res, 200, { ok: true, delivered: rec.ok, delivery: { id: rec.id, ok: rec.ok, httpStatus: rec.httpStatus, ms: rec.ms, error: rec.error } })
  }, 'webhook-test')

  /** ping 投递（单次尝试）。 */
  async function deliverPingOnce(hook: Hook): Promise<DeliveryRecord> {
    const id = newId('d')
    const at = Date.now()
    const { body } = buildBody({
      id, event: PING_EVENT, at,
      data: { message: 'PrivHub Webhook 测试投递', hook: hook.name, at },
    })
    const t0 = Date.now()
    const res = await attemptOnce(hook, body, id, PING_EVENT)
    const rec: DeliveryRecord = {
      id, hookId: hook.id, event: PING_EVENT, at, url: hook.url,
      ok: res.ok, httpStatus: res.status > 0 ? res.status : null,
      ms: Date.now() - t0, attempts: 1, error: res.ok ? '' : res.error,
      body, bodyBytes: Buffer.byteLength(body, 'utf8'),
    }
    pushLog(log, rec)
    const cur = findHook(hook.id)
    if (cur) {
      cur.lastAt = at
      cur.lastStatus = res.ok ? 'ok' : 'fail'
      cur.lastError = res.ok ? '' : res.error
      if (res.ok) cur.delivered = (Number(cur.delivered) || 0) + 1
      else cur.failed = (Number(cur.failed) || 0) + 1
    }
    if (res.ok) delivered++
    void persist()
    return rec
  }

  /* ---------- 卸载 ---------- */

  ctx.effect(() => () => {
    // 把最后一次统计落盘（不等写链完成 —— effect 清理不能 await）。
    void persist()
  })

  void loadAll()
}
