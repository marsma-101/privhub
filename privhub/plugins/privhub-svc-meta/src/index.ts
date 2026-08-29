/**
 * 私域枢纽能力 Service：元数据（privhub-svc-meta，S5）
 *
 * 以 cordis Service 形式暴露 `ctx.meta`：getTags / setTags / templates。
 * 基础版（批次①）：标签存 data/meta.json
 * （{ [project]: { [relPath]: { tags: string[] } } }）；templates() 返回
 * 内置模板库。F19 标签插件 / F20 模板插件（批次②）消费。
 *
 * @module privhub-svc-meta
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { existsSync } from 'node:fs'
import { Service } from '@deepseek-ai/cordis'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

/** 一个文档模板（基础版内置，不落盘）。 */
export interface DocTemplate {
  id: string
  name: string
  description: string
  /** 模板正文（Markdown，含 frontmatter 占位） */
  content: string
}

export interface Config {
  file: string
}

export const Config: z<Config> = z.object({
  file: z.string().default(''),
})

declare module '@deepseek-ai/cordis' {
  interface Context {
    meta: MetaService
  }
}

const rootDir = process.env.PRIVHUB_ROOT?.trim() || process.cwd()

interface MetaData {
  [project: string]: {
    [relPath: string]: { tags: string[] }
  }
}

export class MetaService extends Service {
  private readonly file: string
  private data: MetaData = {}

  constructor(ctx: Context, private readonly config: Config) {
    super(ctx, 'meta')
    const f = config.file.trim()
    this.file = f === '' ? join(rootDir, 'data', 'meta.json') : resolve(f)
    void this.load().catch(() => { /* 无元数据时按空处理 */ })
  }

  async load(): Promise<void> {
    if (!existsSync(this.file)) { this.data = {}; return }
    try {
      const raw = await readFile(this.file, 'utf8')
      this.data = JSON.parse(raw) as MetaData
    } catch { this.data = {} }
  }

  private async save(): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true })
    await writeFile(this.file, JSON.stringify(this.data, null, 2), 'utf8')
  }

  /** 读取某文件/目录的标签（无标签返回空数组）。 */
  async getTags(project: string, relPath: string): Promise<string[]> {
    return [...(this.data[project]?.[relPath]?.tags ?? [])]
  }

  /** 设置某文件/目录的标签（整体替换；空数组即清除）。 */
  async setTags(project: string, relPath: string, tags: string[]): Promise<void> {
    const cleaned = [...new Set(tags.map((t) => t.trim()).filter((t) => t !== ''))]
    if (!this.data[project]) this.data[project] = {}
    if (cleaned.length === 0) {
      delete this.data[project][relPath]
      if (Object.keys(this.data[project]).length === 0) delete this.data[project]
    } else {
      this.data[project][relPath] = { tags: cleaned }
    }
    await this.save()
  }

  /** 内置模板库（基础版）。 */
  templates(): DocTemplate[] {
    return [
      {
        id: 'meeting-minutes',
        name: '会议记录',
        description: '会议纪要模板：主题/参会人/结论/待办',
        content: [
          '---',
          'title: 会议记录',
          'tags: [会议]',
          'date: {{date}}',
          '---',
          '',
          '# 会议记录',
          '',
          '- **主题**：',
          '- **时间**：{{date}}',
          '- **参会人**：',
          '',
          '## 讨论内容',
          '',
          '## 结论',
          '',
          '## 待办',
          '',
          '- [ ] ',
        ].join('\n'),
      },
      {
        id: 'product-requirement',
        name: '产品需求',
        description: 'PRD 模板：背景/目标/功能/验收',
        content: [
          '---',
          'title: 产品需求',
          'tags: [需求]',
          'date: {{date}}',
          '---',
          '',
          '# 产品需求',
          '',
          '## 背景与问题',
          '',
          '## 目标',
          '',
          '## 功能清单',
          '',
          '## 验收标准',
          '',
        ].join('\n'),
      },
      {
        id: 'work-log',
        name: '工作日志',
        description: '每日工作记录模板',
        content: [
          '---',
          'title: 工作日志',
          'tags: [日志]',
          'date: {{date}}',
          '---',
          '',
          '# 工作日志',
          '',
          '## 今日完成',
          '',
          '## 问题与风险',
          '',
          '## 明日计划',
          '',
        ].join('\n'),
      },
    ]
  }
}

/** 插件挂载：注册 MetaService 到 ctx.meta。 */
export const name = 'privhub-svc-meta'
export function apply(ctx: Context, config: Config): void {
  new MetaService(ctx, config)
}
