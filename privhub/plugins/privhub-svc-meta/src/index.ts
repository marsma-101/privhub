/**
 * 私域枢纽能力 Service：元数据（privhub-svc-meta，S5）
 *
 * 以 cordis Service 形式暴露 `ctx.meta`：
 *   - getTags / setTags：文件/目录标签（data/meta.json）
 *   - listTemplates / createTemplate / updateTemplate / deleteTemplate：
 *     模板库（批次② 完整版，data/templates.json 落盘；首次启动写入 3 个内置模板）
 * F19 标签插件 / F20 模板插件（批次②）消费。
 *
 * @module privhub-svc-meta
 */

import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { Service } from '@deepseek-ai/cordis'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

/** 一个文档模板。 */
export interface DocTemplate {
  id: string
  name: string
  description: string
  /** 模板正文（Markdown，含 frontmatter 占位 {{date}}） */
  content: string
}

export interface TemplateInput {
  name: string
  description?: string
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

/** 首次启动写入的内置模板（与批次① 内置一致，落盘后可在 UI 管理）。 */
const BUILTIN_TEMPLATES: DocTemplate[] = [
  {
    id: 'meeting-minutes',
    name: '会议记录',
    description: '会议纪要模板：主题/参会人/结论/待办',
    content: [
      '---', 'title: 会议记录', 'tags: [会议]', 'date: {{date}}', '---', '',
      '# 会议记录', '',
      '- **主题**：', '- **时间**：{{date}}', '- **参会人**：', '',
      '## 讨论内容', '', '## 结论', '', '## 待办', '', '- [ ] ',
    ].join('\n'),
  },
  {
    id: 'product-requirement',
    name: '产品需求',
    description: 'PRD 模板：背景/目标/功能/验收',
    content: [
      '---', 'title: 产品需求', 'tags: [需求]', 'date: {{date}}', '---', '',
      '# 产品需求', '',
      '## 背景与问题', '', '## 目标', '', '## 功能清单', '', '## 验收标准', '',
    ].join('\n'),
  },
  {
    id: 'work-log',
    name: '工作日志',
    description: '每日工作记录模板',
    content: [
      '---', 'title: 工作日志', 'tags: [日志]', 'date: {{date}}', '---', '',
      '# 工作日志', '',
      '## 今日完成', '', '## 问题与风险', '', '## 明日计划', '',
    ].join('\n'),
  },
]

export class MetaService extends Service {
  private readonly file: string
  private readonly templatesFile: string
  private data: MetaData = {}
  private templatesData: DocTemplate[] = []

  constructor(ctx: Context, private readonly config: Config) {
    super(ctx, 'meta')
    const f = config.file.trim()
    this.file = f === '' ? join(rootDir, 'data', 'meta.json') : resolve(f)
    this.templatesFile = join(dirname(this.file), 'templates.json')
    void this.load().catch(() => { /* 无元数据时按空处理 */ })
    void this.loadTemplates().catch(() => { /* 加载失败按内置处理 */ })
  }

  async load(): Promise<void> {
    if (!existsSync(this.file)) { this.data = {}; return }
    try {
      const raw = await this.ctx.storage.readText(this.file)
      this.data = JSON.parse(raw) as MetaData
    } catch { this.data = {} }
  }

  /** A12+S7：原子写 + 静态加密（经 ctx.storage 透明加解密）。 */
  private async atomicWrite(file: string, data: string): Promise<void> {
    await this.ctx.storage.writeText(file, data)
  }

  private async save(): Promise<void> {
    await this.atomicWrite(this.file, JSON.stringify(this.data, null, 2))
  }

  async loadTemplates(): Promise<void> {
    if (!existsSync(this.templatesFile)) {
      // 首次启动：写入内置模板
      this.templatesData = BUILTIN_TEMPLATES.map((t) => ({ ...t }))
      await this.saveTemplates()
      return
    }
    try {
      const raw = await this.ctx.storage.readText(this.templatesFile)
      const parsed = JSON.parse(raw) as DocTemplate[]
      this.templatesData = Array.isArray(parsed) ? parsed : []
    } catch { this.templatesData = BUILTIN_TEMPLATES.map((t) => ({ ...t })) }
  }

  private async saveTemplates(): Promise<void> {
    await this.atomicWrite(this.templatesFile, JSON.stringify(this.templatesData, null, 2))
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

  /** 项目内全部标签及使用计数（F19 标签云/筛选）。 */
  async allTags(project: string): Promise<{ tag: string; count: number }[]> {
    const counter = new Map<string, number>()
    for (const [relPath, meta] of Object.entries(this.data[project] ?? {})) {
      void relPath
      for (const t of meta.tags) counter.set(t, (counter.get(t) ?? 0) + 1)
    }
    return [...counter.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
  }

  /** 项目内带某标签的文件列表（F19 按标签筛选）。 */
  async taggedFiles(project: string, tag: string): Promise<{ path: string; name: string }[]> {
    const out: { path: string; name: string }[] = []
    for (const [relPath, meta] of Object.entries(this.data[project] ?? {})) {
      if (meta.tags.includes(tag)) {
        out.push({ path: relPath, name: relPath.includes('/') ? relPath.slice(relPath.lastIndexOf('/') + 1) : relPath })
      }
    }
    return out.sort((a, b) => a.path.localeCompare(b.path))
  }

  /* ---------- 模板库（批次② 完整版） ---------- */

  /** 模板列表（登录用户可读）。 */
  async listTemplates(): Promise<DocTemplate[]> {
    return this.templatesData.map((t) => ({ ...t }))
  }

  /** 新建模板（admin；id 自动生成）。 */
  async createTemplate(input: TemplateInput): Promise<DocTemplate> {
    const t: DocTemplate = {
      id: 'tpl_' + Date.now().toString(36) + '_' + randomBytes(3).toString('hex'),
      name: input.name.trim(),
      description: (input.description ?? '').trim(),
      content: input.content,
    }
    this.templatesData.push(t)
    await this.saveTemplates()
    return { ...t }
  }

  /** 更新模板（admin；name/content/description 缺省保留原值）。 */
  async updateTemplate(id: string, patch: Partial<TemplateInput>): Promise<DocTemplate | null> {
    const t = this.templatesData.find((x) => x.id === id)
    if (!t) return null
    if (patch.name !== undefined && patch.name.trim() !== '') t.name = patch.name.trim()
    if (patch.description !== undefined) t.description = patch.description.trim()
    if (patch.content !== undefined) t.content = patch.content
    await this.saveTemplates()
    return { ...t }
  }

  /** 删除模板（admin；内置模板也可删，删除后不再出现）。 */
  async deleteTemplate(id: string): Promise<boolean> {
    const before = this.templatesData.length
    this.templatesData = this.templatesData.filter((t) => t.id !== id)
    if (this.templatesData.length === before) return false
    await this.saveTemplates()
    return true
  }
}

/** 插件挂载：注册 MetaService 到 ctx.meta。 */
export const name = 'privhub-svc-meta'
export const inject = ['storage']
export function apply(ctx: Context, config: Config): void {
  new MetaService(ctx, config)
}

