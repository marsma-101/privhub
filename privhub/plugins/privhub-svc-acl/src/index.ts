/**
 * 私域枢纽能力 Service：细粒度 ACL（privhub-svc-acl，S2）
 *
 * 以 cordis Service 形式暴露 `ctx.acl`：can / setRule / listRules / removeRule。
 * 规则存 data/acl.json。本 Service 只做「文件/目录级」的叠加判定：
 * 命中规则按规则裁决；未命中返回 undefined（由上层 core 权限引擎兜底）。
 * F14（privhub-admin-acl，批次②）用 ctx.intercept('privhub',{canAccess})
 * 把它叠到 core 权限引擎之上。
 *
 * @module privhub-svc-acl
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, resolve, dirname, sep } from 'node:path'
import { existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { Service } from '@deepseek-ai/cordis'
import type { Context } from '@deepseek-ai/cordis'
/* 只取叶子模块：读取系统 JSON 的统一入口（D4）。 */
import { readJsonStore, assertStoreWritable, msgOf } from '../../privhub-core/src/json-store'
import z from '@deepseek-ai/schemastery'

/** 规则作用的目标类型。 */
export type AclTarget = 'file' | 'dir'

/** 一条 ACL 规则：允许或拒绝某个角色对某路径的某种操作。 */
export interface AclRule {
  id: string
  /** 项目名（空表示所有项目） */
  project: string
  /** 项目内路径（目录或文件；'' 表示项目根） */
  path: string
  /** 目标类型：dir 规则对其下所有子项继承 */
  target: AclTarget
  /** 适用角色：admin / user；空表示所有角色 */
  role: string
  /** 操作：view / upload / download / edit / delete；空表示所有操作 */
  action: string
  /** allow: true 放行 / false 拒绝 */
  allow: boolean
  /** 创建时间 */
  at: number
}

export interface AclInput {
  project: string
  path: string
  target?: AclTarget
  role?: string
  action?: string
  allow: boolean
}

export interface AclDecision {
  allow: boolean
  ruleId: string
}

export interface Config {
  file: string
}

export const Config: z<Config> = z.object({
  file: z.string().default(''),
})

declare module '@deepseek-ai/cordis' {
  interface Context {
    acl: AclService
  }
}

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()

export class AclService extends Service {
  private readonly file: string
  private rules: AclRule[] = []
  /** D4：规则文件读坏过 —— 之后一律拒绝写入。 */
  private corrupt = false

  constructor(ctx: Context, private readonly config: Config) {
    super(ctx, 'acl')
    const f = config.file.trim()
    this.file = f === '' ? join(rootDir, 'data', 'acl.json') : resolve(f)
    void this.load().catch(() => { /* 失败已在 load 内记录并置标志 */ })
  }

  /** 载入规则文件（D4：损坏 → 隔离存证 + 记标志；写路径据此拒绝，绝不覆盖）。 */
  async load(): Promise<void> {
    try {
      const parsed = await readJsonStore<{ rules?: AclRule[] }>(
        this.ctx.storage, this.file, {},
        (v) => !!v && typeof v === 'object' && Array.isArray((v as { rules?: unknown }).rules),
      )
      this.rules = Array.isArray(parsed.rules) ? parsed.rules : []
    } catch (e) {
      /* 注意：这里**只能**做到「不再覆盖」。读不到规则时本层仍会退化为「无规则」，
       * 即细粒度裁决失效、退回 core 的项目级权限 —— 这是本仓既有的失效姿态，
       * 收紧为 fail-closed 需要单独评估（会让所有文件访问在修复前一律被拒），
       * 已记入待改进清单。此处至少保证：规则文件不会被一次「新增规则」清空。 */
      this.corrupt = true
      this.rules = []
      console.error('[acl] 规则文件读取失败（写入已拒绝，避免覆盖）：' + msgOf(e))
    }
  }

  private async save(): Promise<void> {
    assertStoreWritable(!this.corrupt, this.file)
    await this.ctx.storage.writeText(this.file, JSON.stringify({ rules: this.rules }, null, 2))
  }

  /** 新增/替换一条规则（同 project+path+role+action 视为覆盖）。 */
  async setRule(input: AclInput): Promise<AclRule> {
    const rule: AclRule = {
      id: `${Date.now()}_${randomBytes(4).toString('hex')}`,
      project: input.project.trim(),
      path: (input.path ?? '').trim().replace(/^\/+|\/+$/g, ''),
      target: input.target ?? 'dir',
      role: input.role ?? '',
      action: input.action ?? '',
      allow: input.allow,
      at: Date.now(),
    }
    this.rules = this.rules.filter((r) => !(r.project === rule.project && r.path === rule.path && r.role === rule.role && r.action === rule.action))
    this.rules.push(rule)
    await this.save()
    return rule
  }

  /** 列出全部规则。 */
  async listRules(): Promise<AclRule[]> {
    return [...this.rules]
  }

  /** 删除一条规则。 */
  async removeRule(id: string): Promise<boolean> {
    const before = this.rules.length
    this.rules = this.rules.filter((r) => r.id !== id)
    if (this.rules.length === before) return false
    await this.save()
    return true
  }

  /**
   * 判定 user 对 project/path 的 action 是否被 ACL 放行。
   * 规则匹配优先级：路径最具体 → 目录继承 → 项目根规则 → 全项目规则；
   * 同优先级下更精确的（role/action 命中）优先。
   * @returns 命中规则时返回裁决（allow + 规则 id）；未命中返回 undefined。
   */
  can(user: { username: string; role: string }, action: string, project: string, relPath = ''): AclDecision | undefined {
    const candidates = this.rules.filter((r) => {
      if (r.project !== '' && r.project !== project) return false
      if (r.role !== '' && r.role !== user.role) return false
      if (r.action !== '' && r.action !== action) return false
      return true
    })
    if (candidates.length === 0) return undefined
    // 按匹配深度排序：全项目规则深度 -1 < 项目根 '' < 子路径（路径越长越具体）
    const depth = (r: AclRule): number => {
      if (r.project === '') return -2
      if (r.path === '') return -1
      const target = relPath.replace(/\\/g, '/')
      const rulePath = r.path.replace(/\\/g, '/')
      if (target === rulePath) return 10_000 + rulePath.length
      if (target.startsWith(rulePath + '/')) return rulePath.length
      return -3
    }
    const sorted = [...candidates].sort((a, b) => depth(b) - depth(a))
    const top = sorted[0]
    const d = depth(top)
    if (d === -3) return undefined
    // 同深度多规则：拒绝优先（安全默认）
    const same = sorted.filter((r) => depth(r) === d)
    const deny = same.find((r) => !r.allow)
    const pick = deny ?? same[0]
    return { allow: pick.allow, ruleId: pick.id }
  }
}

/** 插件挂载：注册 AclService 到 ctx.acl。 */
export const name = 'privhub-svc-acl'
export const inject = ['storage']
export function apply(ctx: Context, config: Config): void {
  new AclService(ctx, config)
}
