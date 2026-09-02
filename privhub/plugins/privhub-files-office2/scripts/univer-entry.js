/* Univer bundle 入口：通过 export + --global-name 暴露全局 Office2Univer */
import zhCN from '@univerjs/presets/lib/es/preset-sheets-core/locales/zh-CN.js'
export { createUniver, Univer, FUniver, LogLevel, LocaleType } from '@univerjs/presets'
export { UniverSheetsCorePreset } from '@univerjs/presets/preset-sheets-core'
export const zhCNLocale = zhCN
