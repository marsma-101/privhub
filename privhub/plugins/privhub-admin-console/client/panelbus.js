/**
 * panelbus — 管理控制台内部的「打开面板」总线（插件内事件，不跨插件）。
 *
 * 侧栏、顶部栏、概览卡片都用它打开某个管理路由；详情页也用它在「查看关联项」时
 * 跳转到别的管理页。集中在这里是为了避免各组件互相 import 形成环。
 *
 * @module privhub-admin-console/client/panelbus
 */

/* 事件名 → 处理函数数组。AdminShell 挂载时注册唯一的处理函数。 */
const listeners = {}

function on(ev, fn) {
  (listeners[ev] || (listeners[ev] = [])).push(fn)
  return () => off(ev, fn)
}

function off(ev, fn) {
  const arr = listeners[ev]
  if (!arr) return
  const i = arr.indexOf(fn)
  if (i >= 0) arr.splice(i, 1)
}

function emit(ev, payload) {
  ;(listeners[ev] || []).slice().forEach((fn) => {
    try { fn(payload) } catch (e) { console.error('[admin-console] panelbus', ev, e) }
  })
}

/** 打开管理路由（唯一入口；侧栏/概览/详情都走这里）。 */
function openAdminRoute(key) { emit('admin:open', { key }) }

export { on, off, emit, openAdminRoute }
