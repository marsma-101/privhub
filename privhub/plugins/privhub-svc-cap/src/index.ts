/**
 * 私域枢纽能力 Service：功能权限开关（privhub-svc-cap）
 *
 * 以 cordis Service 形式暴露 `ctx.cap`：level / can / snapshot / set / reset。
 * 存 data/capabilities.json，只存「普通用户」那一列（管理员恒为 write）。
 *
 * 形态与 `privhub-svc-acl` 一致（本仓 L2 服务的既有做法）：本 Service **不注册任何
 * HTTP 路由**——路由在 `privhub-admin-cap`；消费方（各插件）直接 `ctx.cap.can(...)`。
 *
 * ## 为什么是「启动时读进内存、之后按需写回」
 *
 * 判定在每次请求上都发生（可能每请求多次），不可能每次读盘。所以整表读进内存，
 * 写回走 {@link assertStoreWritable}：读坏过就拒绝写，绝不把可能可恢复的配置清空。
 *
 * @module privhub-svc-cap
 */

import { join, resolve } from 'node:path'
import { Service } from '@deepseek-ai/cordis'
import type { Context } from '@deepseek-ai/cordis'
/* 只取叶子模块：读取系统 JSON 的统一入口（D4）。 */
import { readJsonStore, assertStoreWritable, msgOf } from '../../privhub-core/src/json-store'
import z from '@deepseek-ai/schemastery'
import {
  FEATURES, defaultTable, normalizeTable, levelFor, allows, isLevel,
  type Level, type Actor, type FeatureSpec,
} from './core'

export interface Config {
  file: string
}

export const Config: z<Config> = z.object({
  file: z.string().default(''),
})

declare module '@deepseek-ai/cordis' {
  interface Context {
    cap: CapService
  }
}

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()

/** 出网的单个功能视图（界面直接渲染）。 */
export interface FeatureView extends FeatureSpec {
  /** 普通用户当前级别（表值或默认值）。 */
  userLevel: Level
  /** 是否已偏离默认（界面上标「已改」）。 */
  changed: boolean
}

export class CapService extends Service {
  private readonly file: string
  private table: Record<string, Level> = {}
  /** D4：配置文件读坏过 —— 之后一律拒绝写入。 */
  private corrupt = false

  constructor(ctx: Context, private readonly config: Config) {
    super(ctx, 'cap')
    const f = config.file.trim()
    this.file = f === '' ? join(rootDir, 'data', 'capabilities.json') : resolve(f)
    this.table = defaultTable()
    void this.load().catch(() => { /* 失败已在 load 内记录并置标志 */ })
  }

  /** 载入配置（D4：损坏 → 隔离存证 + 记标志；写路径据此拒绝，绝不覆盖）。 */
  async load(): Promise<void> {
    try {
      const parsed = await readJsonStore<{ table?: unknown }>(
        this.ctx.storage, this.file, {},
        (v) => !!v && typeof v === 'object' && !Array.isArray(v),
      )
      // 只覆盖「表里出现过」的键；缺失/未知的一律回落默认值（见 core.normalizeTable）。
      const stored = normalizeTable((parsed as { table?: unknown })?.table)
      this.table = { ...defaultTable(), ...stored }
    } catch (e) {
      this.corrupt = true
      this.table = defaultTable()
      console.error('[cap] 功能开关配置读取失败（写入已拒绝，避免覆盖）：' + msgOf(e))
    }
  }

  private async save(): Promise<void> {
    assertStoreWritable(!this.corrupt, this.file)
    await this.ctx.storage.writeText(this.file, JSON.stringify({ table: this.table }, null, 2))
  }

  /** 配置是否曾读坏（界面据此提示，写操作会被拒）。 */
  isCorrupt(): boolean {
    return this.corrupt
  }

  /** 求 actor 对 feature 的有效级别（管理员恒为 write）。 */
  level(actor: Actor | null | undefined, feature: string): Level {
    return levelFor(actor, feature, this.table)
  }

  /** actor 是否满足对 feature 的 need（默认 read）。 */
  can(actor: Actor | null | undefined, feature: string, need: Level = 'read'): boolean {
    return allows(this.level(actor, feature), need)
  }

  /** 普通用户那一列（副本）。 */
  userTable(): Record<string, Level> {
    return { ...this.table }
  }

  /** 全部功能 + 当前级别（界面用）。 */
  snapshot(): FeatureView[] {
    return FEATURES.map((f) => {
      const userLevel = this.table[f.id] ?? f.userDefault
      return { ...f, userLevel, changed: userLevel !== f.userDefault }
    })
  }

  /**
   * 批量设置普通用户级别。返回实际生效的表。
   * 未知功能 id / 非法级别被静默丢弃（{@link normalizeTable}）。
   */
  async setMany(patch: unknown): Promise<Record<string, Level>> {
    const clean = normalizeTable(patch)
    if (Object.keys(clean).length === 0) return this.userTable()
    this.table = { ...this.table, ...clean }
    await this.save()
    return this.userTable()
  }

  /** 单个功能设置（未知功能 / 非法级别 → 抛错，避免静默无操作）。 */
  async set(feature: string, level: Level): Promise<Record<string, Level>> {
    if (!FEATURES.some((f) => f.id === feature)) throw new Error('未知功能：' + feature)
    if (!isLevel(level)) throw new Error('非法级别：' + String(level))
    return this.setMany({ [feature]: level })
  }

  /** 恢复全部默认（上线前的行为）。 */
  async reset(): Promise<Record<string, Level>> {
    this.table = defaultTable()
    await this.save()
    return this.userTable()
  }
}

/** 插件挂载：注册 CapService 到 ctx.cap。 */
export const name = 'privhub-svc-cap'
export const inject = ['storage']
export function apply(ctx: Context, config: Config): void {
  new CapService(ctx, config)
}
