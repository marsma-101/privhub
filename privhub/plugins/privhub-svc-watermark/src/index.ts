/**
 * 私域枢纽能力 Service：数字水印（privhub-svc-watermark，S3）
 *
 * 以 cordis Service 形式暴露 `ctx.watermark`：render / applyTo。
 * 纯后端逻辑：生成预览叠加所需的水印文本与样式。F05（privhub-auth-watermark，
 * 批次①）在 preview slot 消费 render() 的结果做叠加层；applyTo 为
 * 直接返回可注入 HTML 元素的样式描述（供需要程序化叠加的场景）。
 *
 * @module privhub-svc-watermark
 */

import { Service } from '@deepseek-ai/cordis'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

/** 水印渲染结果：文本 + 样式片段（前端可原样使用）。 */
export interface WatermarkView {
  /** 叠加文本（用户名 @ 时间） */
  text: string
  /** CSS 样式对象（position 由调用方决定：preview 叠加层固定右下角） */
  style: {
    color: string
    fontSize: string
    opacity: number
    pointerEvents: 'none'
    zIndex: string
    background?: string
  }
  /** 是否启用（未登录用户 / 配置关闭时为 false） */
  enabled: boolean
}

export interface Config {
  /** 是否启用水印；留空默认启用 */
  enabled: boolean
  /** 样式微调（可空） */
  text: string
  opacity: number
}

export const Config: z<Config> = z.object({
  enabled: z.boolean().default(true),
  text: z.string().default(''),
  opacity: z.number().default(0.18),
})

declare module '@deepseek-ai/cordis' {
  interface Context {
    watermark: WatermarkService
  }
}

export class WatermarkService extends Service {
  constructor(ctx: Context, private readonly config: Config) {
    super(ctx, 'watermark')
  }

  /**
   * 生成某用户的水印视图。
   * @param user - 当前用户（displayName 优先）。
   * @param at - 可选时间；缺省为当前时间。
   */
  render(user: { username: string; displayName?: string }, at = new Date()): WatermarkView {
    if (!this.config.enabled) {
      return { text: '', style: { color: 'rgba(0,0,0,0)', fontSize: '0', opacity: 0, pointerEvents: 'none', zIndex: '0' }, enabled: false }
    }
    const name = user.displayName || user.username
    const pad = (n: number): string => String(n).padStart(2, '0')
    const time = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())} ${pad(at.getHours())}:${pad(at.getMinutes())}`
    const text = this.config.text !== '' ? this.config.text : `${name} @ ${time}`
    return {
      text,
      style: {
        color: 'rgba(90,130,200,.55)',
        fontSize: '12px',
        opacity: this.config.opacity,
        pointerEvents: 'none',
        zIndex: '999',
      },
      enabled: true,
    }
  }

  /**
   * 返回可直接套用的 CSS 描述（含右下角定位），供程序化叠加。
   * @param user - 当前用户。
   */
  applyTo(user: { username: string; displayName?: string }): Record<string, string> {
    const v = this.render(user)
    return {
      position: 'fixed',
      right: '12px',
      bottom: '10px',
      ...v.style,
      content: JSON.stringify(v.text),
      'font-family': 'inherit',
    }
  }
}

/** 插件挂载：注册 WatermarkService 到 ctx.watermark。 */
export const name = 'privhub-svc-watermark'
export function apply(ctx: Context, config: Config): void {
  new WatermarkService(ctx, config)
}
