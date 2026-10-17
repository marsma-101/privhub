/**
 * deps — 本插件与骨架之间**唯一**的通道。
 *
 * 为什么要有这一层（而不是各处直接写 `window.PrivHub.xxx`）：
 *   · 骨架桥是**唯一**的跨插件通道（`index.html` 里的 `window.PrivHub`），
 *     但它在纯逻辑测试里不存在 —— 走 `window.PrivHub &&` 的散写会让每个调用点都要防一手；
 *   · 集中到这里以后，`tests/mindmap.mjs` 只要造一个最小 `window` 桩就能把
 *     画布 / 编辑器的**真实模块**跑起来（与 explorer-v3 的 `deps.js` 同一手法）。
 *
 * ⚠ 本文件的每个函数在 `window.PrivHub` 缺席时**都不抛错**（除 `api` 明确抛）：
 *   插件在登录页/骨架早期被动加载时不该把一个未定义的属性访问变成白屏。
 *
 * ⚠ 硬约束：插件 client 模块只能引用**同目录**文件（`tests/integrity.mjs` 断言守着），
 *   所以这里只 import `window`，不 import 任何其它插件。
 *
 * @module privhub-mindmap/client/deps
 */

/** 取骨架桥（可能为 null：测试桩 / 骨架早期）。 */
function bridge() {
  return (typeof window !== 'undefined' && window.PrivHub) || null
}

/**
 * 发一次接口请求（骨架的 `api()` 已带 Bearer / Cookie、401 自动登出、返回已解析 JSON）。
 * 桥缺席时**抛出**：这条路径上继续下去只会得到更难查的错。
 */
function api(path, opts) {
  const b = bridge()
  if (!b || typeof b.api !== 'function') throw new Error('PrivHub 骨架未就绪（window.PrivHub.api 不存在）')
  return b.api(path, opts)
}

/** 轻提示。桥缺席时退化成 console，**不报错**。 */
function toast(msg, type) {
  const b = bridge()
  if (b && typeof b.toast === 'function') return b.toast(msg, type)
  /* eslint-disable-next-line no-console */
  console.log('[privhub-mindmap]', msg)
}

/** 当前登录用户（未登录 / 桥缺席 ⇒ null）。 */
function currentUser() {
  const b = bridge()
  return (b && b.AUTH && b.AUTH.user) || null
}

/** 导航状态（`project` / `path` / `openTab` …）。 */
function nav() {
  const b = bridge()
  return (b && b.nav) || null
}

/** 事件总线（可能为 null）。 */
function bus() {
  const b = bridge()
  return (b && b.bus) || null
}

/**
 * 弹一个「输入一行文字」的小框（骨架自带，`index.html` 的 `nav.askInput`）。
 *
 * 导图的改名 / 加节点都用它，而不是在画布上做就地输入 —— 一来骨架已有这个既成交互
 * （改名、建文件夹都走它），二来 SVG 里的就地编辑要自己处理 IME 与滚动，不值当。
 *
 * @param {string} title 提示标题
 * @param {string} initial 初值
 * @param {(v: string) => void} onOk 确认回调（取消时不调）
 * @returns {boolean} true = 已转交给骨架弹框；false = 桥缺席（调用方自己兜底）
 */
function askInput(title, initial, onOk) {
  const b = bridge()
  if (b && b.nav && typeof b.nav.askInput === 'function') {
    b.nav.askInput(title, initial, onOk)
    return true
  }
  return false
}

/** 确认框（骨架的 `window.confirm` 包装；缺省就用原生 confirm）。 */
function confirmText(msg) {
  const b = bridge()
  if (b && typeof b.confirm === 'function') return !!b.confirm(msg)
  if (typeof window !== 'undefined' && typeof window.confirm === 'function') return !!window.confirm(msg)
  return true
}

/** 插件被卸载 / 契约缺席时**必须出声**（本仓 CI 断言「不许静默降级」）。 */
function fail(msg) {
  /* eslint-disable-next-line no-console */
  console.error('[privhub-mindmap] ' + msg)
}

export { api, toast, currentUser, nav, bus, askInput, confirmText, fail, bridge }
