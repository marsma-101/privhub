/**
 * privhub-mindmap —— 全局思维导图的 HTTP 面（服务端）
 *
 * 「全局导图」= 实例级的管理员总览图（「我现在有哪些项目」那张），与项目内那些
 * `.mindmap` 文件不是一回事：它没有归属项目、不出现在任何文件树里，所以必须有自己的
 * 存储（`data/mindmaps/global.json`，见 `./core`）与自己的路由。项目内导图**一条服务端
 * 代码都不需要** —— 那是文件，走既有的预览与文本保存链路（规划 §5）。
 *
 * 路由（`svc.route` 为 exact 匹配，资源标识走 query / body）：
 *
 *   GET    /privhub/api/mindmap/global             读：全部全局图 + 我能不能改
 *   GET    /privhub/api/mindmap/global/schema      条目契约（供页面 / 智能体发现，不读数据）
 *   POST   /privhub/api/mindmap/global             { id?, title?, text? }  新建 / 更新
 *   DELETE /privhub/api/mindmap/global?id=         删除
 *
 * ## 鉴权（为什么不是 `adminOnly` 硬判）
 *
 * 串联：`requireUser`(401) → 功能开关 `mindmap.global`(403) → 加锁读写。
 * 该功能的 `userDefault` 是 `none`，而**管理员在开关表里恒为 `write`**
 * （`svc-cap/core.levelFor`），所以**默认效果就是「仅管理员可见 / 可改」**——正是主人
 * 2026-10-17 的口径（「单独的一个级别，只有管理员权限才能看见」）。
 * 用开关而不是写死 `role !== 'admin'`，是为了万一将来要让人代管全局图：
 * 把那个开关调成 read/write 即可，**入口与路由同时生效**，不会出现「入口放开了、接口还 403」。
 *
 * ⚠ 本插件**不进** `privhub-admin-acl` 的 `GUARD_PATHS`：那条链管的是「项目内文件」的
 * 目录级 ACL，而全局图根本不在任何项目里（无文件、无路径），放进去反而会因取不到
 * `project/path` 而误判。它的闸门就是上面那道功能开关。
 *
 * @module privhub-mindmap
 */

import type { Context } from '@deepseek-ai/cordis'
import { json, readBody } from '../../privhub-core/src/index'
import {
  DEFAULT_TITLE, LIMITS, defaultText, globalFile, loadGlobal, newId, saveGlobal,
  sanitizeMapInput, sortMaps, viewMap,
} from './core'
import type { GlobalMap } from './core'

export const name = 'privhub-mindmap'
export const inject = ['privhub', 'storage', 'audit', 'cap']

/** 读取 query 参数（`svc.route` 是 exact 匹配，参数一律走 query / body）。 */
function queryParam(req: unknown, key: string): string {
  const url = new URL(String((req as { url?: string }).url ?? '/'), 'http://x')
  return url.searchParams.get(key) ?? ''
}

export function apply(ctx: Context): void {
  const svc = ctx.privhub

  /** 该用户能不能改全局图（管理员恒可以；普通用户看开关表，默认 none）。 */
  const canWrite = (u: unknown): boolean => ctx.cap.can(u as never, 'mindmap.global', 'write')
  /** 能不能看。默认使得只有管理员通过 —— 普通用户连列表都拿不到。 */
  const canRead = (u: unknown): boolean => ctx.cap.can(u as never, 'mindmap.global', 'read')

  /* 闸门：401 → 403。返回 null 表示已经写过响应，调用方直接 return。 */
  const guard = (
    req: import('node:http').IncomingMessage,
    res: import('node:http').ServerResponse,
    need: 'read' | 'write',
  ) => {
    const u = svc.requireUser(req, res)
    if (!u) return null
    const ok = need === 'write' ? canWrite(u) : canRead(u)
    if (!ok) {
      json(res, 403, {
        ok: false,
        error: need === 'write' ? '全局思维导图仅管理员可编辑' : '全局思维导图仅管理员可见',
      })
      return null
    }
    return u
  }

  const audit = (username: string, action: string, target: string, detail: string) =>
    void ctx.audit.log({ user: username, action, target, detail }).catch(() => null)

  /* ---------- 条目契约（页面与智能体都可发现；不读数据、不设开关） ---------- */
  svc.route('/privhub/api/mindmap/global/schema', (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    json(res, 200, {
      ok: true,
      version: '1.0.0',
      what: '全局思维导图：实例级的管理员总览图（多张），存 data/mindmaps/global.json',
      visibility: '受功能开关 mindmap.global 管，默认 none ⇒ 只有管理员看得到 / 改得动',
      fields: {
        id: '图 id（服务端生成，新建时不填）',
        title: '图标题（新建缺省为「' + DEFAULT_TITLE + '」）',
        text: '正文：与 .mindmap 同一套缩进大纲文本（# 标题 + - 节点，2 空格一级）。服务端不做语义校验',
        createdBy: '创建者用户名',
        updatedBy: '最后写入者用户名',
        createdAt: '创建时间（ms）',
        updatedAt: '最后写入时间（ms）',
      },
      limits: LIMITS,
      routes: {
        list: 'GET /privhub/api/mindmap/global',
        save: 'POST /privhub/api/mindmap/global { id?, title?, text? }（不填 id 即新建）',
        remove: 'DELETE /privhub/api/mindmap/global?id=',
      },
      example: 'POST { "title": "项目地图", "text": "# 项目地图\\n\\n- 私域枢纽\\n  - 文件中枢\\n- 马泉斌\\n  - 个人空间\\n" }',
    })
  }, 'mindmap-global-schema')

  /* ---------- 读：全部全局图 ---------- */
  svc.route('/privhub/api/mindmap/global', async (req, res) => {
    const u = guard(req, res, 'read')
    if (!u) return

    if (req.method === 'GET') {
      const doc = await loadGlobal(ctx.storage)
      /* `?id=` 取单张：编辑器「↻ 重新载入」只想要自己那张的最新正文，不必拖回整份清单。 */
      const id = queryParam(req, 'id')
      if (id) {
        const hit = doc.maps.find((m) => m.id === id)
        if (!hit) return json(res, 404, { ok: false, error: '这张全局导图不存在（可能已被删除）' })
        json(res, 200, { ok: true, map: viewMap(hit), canEdit: canWrite(u) })
        return
      }
      json(res, 200, {
        ok: true,
        maps: sortMaps(doc.maps).map(viewMap),
        canEdit: canWrite(u),
        limits: { maps: LIMITS.maps, title: LIMITS.title, text: LIMITS.text },
      })
      return
    }

    if (req.method === 'DELETE') {
      /* 读已经放过（canRead）；写要按写闸门再判一次 —— 只读用户不该删得掉东西。 */
      if (!canWrite(u)) return json(res, 403, { ok: false, error: '全局思维导图仅管理员可编辑' })
      const id = queryParam(req, 'id')
      if (!id) return json(res, 400, { ok: false, error: '缺少 id' })
      const file = globalFile()
      const hit = await svc.withFileLock(file, async () => {
        const doc = await loadGlobal(ctx.storage)
        const found = doc.maps.find((m) => m.id === id)
        if (!found) return null
        doc.maps = doc.maps.filter((m) => m.id !== id)
        await saveGlobal(ctx.storage, doc)
        return { map: found, total: doc.maps.length }
      })
      if (!hit) return json(res, 404, { ok: false, error: '这张全局导图不存在（可能已被删除）' })
      audit(u.username, 'mindmap-global-delete', 'mindmap:' + hit.map.title, 'id=' + id)
      json(res, 200, { ok: true, total: hit.total })
      return
    }

    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    if (!canWrite(u)) return json(res, 403, { ok: false, error: '全局思维导图仅管理员可编辑' })

    let body: unknown
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: '请求体不是合法 JSON' }) }
    const input = sanitizeMapInput(body)
    if (!input) return json(res, 400, { ok: false, error: '请求体必须是对象：{ id?, title?, text? }' })

    const id = String((body as { id?: unknown }).id ?? '').trim()
    const file = globalFile()
    const res0 = await svc.withFileLock(file, async (): Promise<
      { kind: 'ok'; map: GlobalMap } | { kind: 'not-found' } | { kind: 'full' }
    > => {
      const doc = await loadGlobal(ctx.storage)
      const now = Date.now()
      if (id) {
        const m = doc.maps.find((x) => x.id === id)
        if (!m) return { kind: 'not-found' }
        /* 只覆盖「提交了的」字段：改标题的请求不该顺手把正文清空。 */
        if (input.title) m.title = input.title
        if (input.text) m.text = input.text
        m.updatedBy = u.username
        m.updatedAt = now
        await saveGlobal(ctx.storage, doc)
        return { kind: 'ok', map: m }
      }
      if (doc.maps.length >= LIMITS.maps) return { kind: 'full' }
      const title = input.title || DEFAULT_TITLE
      const m: GlobalMap = {
        id: newId(),
        title,
        text: input.text || defaultText(title),
        createdBy: u.username,
        updatedBy: u.username,
        createdAt: now,
        updatedAt: now,
      }
      doc.maps.push(m)
      await saveGlobal(ctx.storage, doc)
      return { kind: 'ok', map: m }
    })

    if (res0.kind === 'not-found') return json(res, 404, { ok: false, error: '这张全局导图不存在（可能已被删除）' })
    if (res0.kind === 'full') return json(res, 400, { ok: false, error: '全局导图张数已达上限（' + LIMITS.maps + ' 张）' })
    const m = res0.map
    audit(u.username, id ? 'mindmap-global-update' : 'mindmap-global-create',
      'mindmap:' + m.title, 'id=' + m.id + ' 正文 ' + m.text.length + ' 字符')
    json(res, 200, { ok: true, map: viewMap(m) })
  }, 'mindmap-global')
}
