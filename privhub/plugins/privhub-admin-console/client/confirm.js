/**
 * confirm — 统一的危险操作确认服务（Promise 式）。
 *
 * 用法：`if (!(await confirmAction({ title, message, require: 'xxx' }))) return`
 *
 * 弹窗本体是 shell.js 里的 AdminConfirmDialog，它只读 state 并回填 state.resolve。
 * 放在独立模块是为了让「确认逻辑」不依赖任何组件，避免组件间互相 import。
 *
 * @module privhub-admin-console/client/confirm
 */

import { reactive } from './deps.js'

/** 确认弹窗状态（null = 未打开）。 */
const confirmState = reactive({
  open: false,
  title: '确认操作',
  message: '',
  detail: '',
  confirmText: '确 定',
  cancelText: '取 消',
  danger: false,
  /** 非空时要求用户逐字输入该关键词才能确认（高风险操作） */
  require: '',
  /** 用户已输入的内容 */
  input: '',
  resolve: null,
})

/**
 * 打开确认弹窗并等待用户选择。
 *
 * @param {{ title?: string, message?: string, detail?: string, confirmText?: string,
 *           cancelText?: string, danger?: boolean, require?: string }} opts
 * @returns {Promise<boolean>} 用户确认返回 true，取消 / Esc / 点遮罩返回 false
 */
function confirmAction(opts) {
  const o = opts || {}
  // 已有弹窗未关闭：先当作取消，避免 Promise 永久悬挂
  if (confirmState.open && confirmState.resolve) confirmState.resolve(false)
  confirmState.open = true
  confirmState.title = o.title || '确认操作'
  confirmState.message = o.message || ''
  confirmState.detail = o.detail || ''
  confirmState.confirmText = o.confirmText || '确 定'
  confirmState.cancelText = o.cancelText || '取 消'
  confirmState.danger = o.danger === true
  confirmState.require = o.require || ''
  confirmState.input = ''
  return new Promise((resolve) => { confirmState.resolve = resolve })
}

/** 关闭弹窗并结算（result=true 表示确认）。 */
function settleConfirm(result) {
  const fn = confirmState.resolve
  confirmState.open = false
  confirmState.resolve = null
  confirmState.input = ''
  if (fn) fn(result === true)
}

export { confirmState, confirmAction, settleConfirm }
