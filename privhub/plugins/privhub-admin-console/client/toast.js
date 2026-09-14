/**
 * toast — 管理控制台自己的轻提示队列。
 *
 * 为什么不用骨架的 window.PrivHub.toast：那个 toast 直接把节点插进 document.body，
 * 由骨架的全局样式控制，插件无法在上面加「管理后台」的样式与去向。
 * 这里用 reactive 队列 + 组件渲染，样式全部留在本插件（卸载即消失）。
 *
 * @module privhub-admin-console/client/toast
 */

import { reactive } from './deps.js'

let seq = 0

/** 当前展示中的 toast 列表：{ id, msg, type, at } */
const toasts = reactive([])

/**
 * 推一条提示。
 *
 * @param {string} msg 文案
 * @param {'success'|'error'|'warn'|'info'} [type] 类型（默认 success）
 * @param {number} [ms] 停留毫秒（默认 2600）
 */
function adminToast(msg, type, ms) {
  const id = ++seq
  toasts.push({ id, msg: String(msg == null ? '' : msg), type: type || 'success', at: Date.now() })
  const life = typeof ms === 'number' ? ms : 2600
  setTimeout(() => dismissToast(id), life)
  // 队列上限：极端情况下（批量操作刷屏）不无限堆积
  while (toasts.length > 6) toasts.shift()
  return id
}

/** 立即移除一条。 */
function dismissToast(id) {
  const i = toasts.findIndex((t) => t.id === id)
  if (i >= 0) toasts.splice(i, 1)
}

export { toasts, adminToast, dismissToast }
