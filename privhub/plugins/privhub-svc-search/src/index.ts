/**
 * 私域枢纽能力 Service：搜索（privhub-svc-search，S4）
 *
 * 以 cordis Service 形式暴露 `ctx.search`：query / index / remove。
 * 基础版（批次①）：query 对文件名做递归匹配（复用 core 的文件根与权限），
 * index/remove 为 C15 全文索引预留契约（基础版为空实现，返回 ok）。
 * F09（privhub-files-search）消费 query 提供搜索接口与 UI。
 *
 * @module privhub-svc-search
 */

import { readdir, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { existsSync } from 'node:fs'
import { Service } from '@deepseek-ai/cordis'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

/** 一条命中结果。 */
export interface SearchHit {
  project: string
  /** 项目内相对路径（含文件名） */
  path: string
  name: string
  isDir: boolean
  /** 匹配方式：filename（基础版） */
  match: 'filename'
}

export interface SearchScope {
  /** 项目名；空表示当前用户可见的全部项目 */
  project?: string
  /** 项目内起始目录；空表示项目根 */
  path?: string
}

export interface Config {
  /** 单次搜索最大命中数 */
  maxHits: number
  /** 是否跳过隐藏项 */
  skipHidden: boolean
}

export const Config: z<Config> = z.object({
  maxHits: z.number().default(200),
  skipHidden: z.boolean().default(true),
})

declare module '@deepseek-ai/cordis' {
  interface Context {
    search: SearchService
  }
}

export class SearchService extends Service {
  constructor(ctx: Context, private readonly config: Config) {
    super(ctx, 'search')
  }

  /**
   * 文件名搜索：递归扫描（复用 core 的文件根与路径安全）。
   * @param q - 关键字（大小写不敏感，支持子串匹配）。
   * @param scope - 限定项目/目录；project 缺省时覆盖调用方可见项目。
   * @param visible - 调用方可访问的项目列表（用于缺省 scope 与权限过滤）。
   */
  async query(
    q: string,
    scope: SearchScope = {},
    visible: string[] = [],
    list: (project: string, subPath?: string) => Promise<{ name: string; isDir: boolean }[]>,
    resolve: (project: string, relPath: string) => string | null,
  ): Promise<SearchHit[]> {
    const keyword = q.trim().toLowerCase()
    if (keyword === '') return []
    const projects = scope.project !== undefined && scope.project !== ''
      ? (visible.includes(scope.project) ? [scope.project] : [])
      : visible
    const hits: SearchHit[] = []
    for (const project of projects) {
      await this.walk(project, scope.path ?? '', keyword, list, resolve, hits)
      if (hits.length >= this.config.maxHits) break
    }
    return hits.slice(0, this.config.maxHits)
  }

  private async walk(
    project: string,
    rel: string,
    keyword: string,
    list: (project: string, subPath?: string) => Promise<{ name: string; isDir: boolean }[]>,
    resolve: (project: string, relPath: string) => string | null,
    out: SearchHit[],
  ): Promise<void> {
    if (out.length >= this.config.maxHits) return
    const entries = await list(project, rel)
    for (const e of entries) {
      if (this.config.skipHidden && e.name.startsWith('.')) continue
      const childPath = rel === '' ? e.name : `${rel}/${e.name}`
      if (e.name.toLowerCase().includes(keyword)) {
        out.push({ project, path: childPath, name: e.name, isDir: e.isDir, match: 'filename' })
        if (out.length >= this.config.maxHits) return
      }
      if (e.isDir) {
        await this.walk(project, childPath, keyword, list, resolve, out)
      }
    }
  }

  /** 全文索引入口（基础版空实现；C15 批次② 落地）。 */
  async index(doc: { id: string; text: string }): Promise<{ ok: boolean }> {
    void doc
    return { ok: true }
  }

  /** 从索引移除（基础版空实现）。 */
  async remove(id: string): Promise<{ ok: boolean }> {
    void id
    return { ok: true }
  }
}

/** 插件挂载：注册 SearchService 到 ctx.search。 */
export const name = 'privhub-svc-search'
export function apply(ctx: Context, config: Config): void {
  new SearchService(ctx, config)
}
