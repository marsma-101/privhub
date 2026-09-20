/**
 * viewers — 内容区 viewer 契约（**宿主侧**实现）。
 *
 * 设计依据：`docs/reviews/10-内容区所有权与docx残留-方案.md` §6「等价设计：所有权 + 契约」。
 * 一句话：**宿主当老板，插件递名片** —— 插件只声明「我能开哪类文件」，
 * 由宿主决定「现在该谁上场」，并由宿主负责挂载、卸载、清场。
 *
 * ── 三条铁律（方案 §6.1） ──────────────────────────────────────────────
 *   1. 只有宿主（privhub-files-explorer-v3）可以增删 `.v3-content` 的子节点。
 *   2. 其它插件只能通过宿主发给它的**挂载点** `.v3-viewer-host` 工作；
 *      插件的任何节点不得成为 `.v3-content` 的直接子节点。
 *   3. 插件的 CSS 不得声称拥有 `.v3-content`（`.v3-content:has(…)` 一律视为越权）。
 *
 * ── 为什么走宿主注册表，而不是给 manifest 加 `viewers` 字段 ────────────
 *   `manifest.json` 由 `privhub-shell/server/index.ts:55` 扫描，只认 `id` 与 `slots`，
 *   其余字段被忽略；而 `frontend/index.html:832/894` 会把 `window.PrivHub.manifests`
 *   **整体替换**，插件侧拿到的可能是旧引用。让能力清单依赖一个会被整体替换的引用，
 *   等于给未来埋雷。注册表则是插件在自己目录里自包含地声明，卸载 = 删目录 + 删声明。
 *
 * ── 插件侧要写的全部代码（契约形状） ────────────────────────────────────
 *
 *   const stop = window.PrivHub.viewers.register({
 *     id: 'privhub-files-office2',   // 必填；全局唯一，惯例用插件 id
 *     exts: ['.docx', '.xlsx'],      // 必填；扩展名数组，小写带点
 *     priority: 200,                 // 可选；默认 100；数字大的先试，同分【先注册先试】
 *     mount(hostEl, ctx) {           // 必填；只能往 hostEl 里建自己的节点
 *       const frame = document.createElement('iframe')
 *       hostEl.appendChild(frame)
 *       return () => { frame.remove() }        // 返回值 = 卸载时调用的清理函数
 *     },
 *     update(hostEl, ctx) { … },     // 可选；同一个 viewer 换文件时【复用】它（不卸不建）
 *     cleanup(hostEl, ctx) { … },    // 可选；mount 没返回清理函数时用这个兜底
 *   })
 *   // 组件 beforeUnmount 里必须 stop()：插件被卸载 → 声明消失 → 零残留
 *
 *   ctx = { project, path, name, key, ext }
 *
 * ── 宿主怎么用（panel.js） ─────────────────────────────────────────────
 *   内容区模板里有一个稳定锚点 `<div class="v3-viewer-host" data-viewer="none"></div>`，
 *   由宿主创建与销毁；`store.activeKey` / `store.content` 变化时调
 *   `session.sync({ host, tab, content })`：
 *     · 解析出 viewer 且与上一个不同 → **先卸旧的、再挂新的**；
 *     · 同类文件之间切换 → **复用**（挂载点不重建、viewer 身份不变、中间不留空窗）；
 *     · 无任何声明 → **回退老路**（宿主自己的 md / text / image / pdf 分支照跑，一字未改）。
 *
 * ── 顺序准绳（丢了就是丢未保存内容，比「闪一下」严重得多） ──────────────
 *   切标签时 `tabs.js:53/69/84` 会**先同步** emit `md:interrupt`（编辑器借此静默保存），
 *   再改 `store.activeKey`。宿主由 watcher 驱动卸载，用的是 Vue 默认（pre）flush ——
 *   它排在那个同步块【之后】的微任务里。两件事合起来 ⇒ **卸载 viewer 必然晚于保存意图**。
 *   这条顺序不是只写在注释里：
 *     · 每次 save-intent / unmount 都按发生顺序记进本模块的流水，
 *       `window.PrivHub.viewers.lifecycle.checkOrder()` 能扫出「先卸后存」的倒挂；
 *       一旦倒挂当场 `console.error`（本项目的老病正是「连错了不吭声」）。
 *     · `tests/personal-ui.mjs` 里另有一条跑 `tabs.js` 真身、用【同步观察者】看顺序的断言。
 *   ⚠ 本批只立钩子点，**不改既有保存时序**（改它属于 c 批 edit-md）。
 *
 * @module privhub-files-explorer-v3/client/viewers
 */

import { bus } from './deps.js'
import { store } from './store.js'

/** 宿主挂载点选择器：插件只认这个（不再认 `.v3-content`）。 */
const HOST_SELECTOR = '.v3-viewer-host'
/** 没有 viewer 上场时锚点上留的值（给 CSS/调试一个明确的初态）。 */
const VIEWER_NONE = 'none'
/** 未声明 priority 时的默认值。 */
const DEFAULT_PRIORITY = 100
/** 顺序流水最多留多少条（只用于取证与自检，不参与渲染）。 */
const LOG_MAX = 200

/** 扩展名归一化：'DOCX' / 'docx' / '.DOCX' 一律变成 '.docx'；非法返回空串。 */
function normExt(raw) {
  if (typeof raw !== 'string') return ''
  let s = raw.trim().toLowerCase()
  if (!s) return ''
  if (s[0] !== '.') s = '.' + s
  return s
}

/** 从一个文件名取归一化扩展名（'a.DOCX' → '.docx'；无扩展名 → ''）。 */
function extOfName(name) {
  const m = /\.([^.\\/]+)$/.exec(String(name || ''))
  return m ? '.' + m[1].toLowerCase() : ''
}

/* =====================================================================
 * 注册表：插件声明的唯一去处；解析「这个扩展名谁能开」
 * ===================================================================== */

/**
 * 造一个新的注册表。生产环境只会有一个（挂在 `window.PrivHub.viewers`）；
 * 之所以做成工厂，是为了让测试能反复造干净的实例。
 */
function createRegistry() {
  const decls = []              // 注册顺序即同优先级下的定序（先注册先试）
  const byId = new Map()
  const subscribers = new Set()
  const log = []                // 顺序流水（save-intent / mount / update / unmount / reuse …）
  let regSeq = 0
  let logSeq = 0
  let lastMountedKey = ''       // 当前 viewer 正在显示哪个文件（卸载时用来认「这一轮是哪个文件」）
  const reported = new Set()    // 已经喊过的倒挂签名，避免同一个错刷屏

  function note(kind, payload) {
    const e = {
      seq: ++logSeq,
      kind,
      key: (payload && payload.key) || '',
      id: (payload && payload.id) || '',
      reason: (payload && payload.reason) || '',
      at: Date.now(),
    }
    log.push(e)
    if (log.length > LOG_MAX) log.splice(0, log.length - LOG_MAX)
    reportNewViolations()
    return e
  }

  /**
   * 顺序不变式（只查**倒挂**，不查「有没有发过保存」——后者会误伤
   * `menuCloseAll` 这类本来就不发 `md:interrupt` 的既有路径）：
   *
   *   一次**内容切换式**卸载之后、下一次挂载之前，不得再出现同一个文件 key 的 save-intent。
   *   出现了就说明有人「先把 viewer 卸了、才想起来让编辑器保存」——
   *   那正是丢未保存内容的顺序。
   *
   *   只查内容切换式卸载（switch / swap / no-viewer）：面板整体卸载（teardown）、
   *   内容区被销毁（host-gone）、声明被注销（unregistered）都不是「切文件」，
   *   不在这条准绳的管辖范围内。
   */
  const ORDER_SCOPED = { switch: 1, swap: 1, 'no-viewer': 1 }
  function checkOrder() {
    const bad = []
    for (let i = 0; i < log.length; i++) {
      const u = log[i]
      if (u.kind !== 'unmount' || !ORDER_SCOPED[u.reason]) continue
      for (let j = i + 1; j < log.length; j++) {
        const e = log[j]
        if (e.kind === 'mount') break
        if (e.kind === 'save-intent' && e.key && u.key && e.key === u.key) {
          bad.push({ key: u.key, reason: u.reason, unmountSeq: u.seq, saveSeq: e.seq })
          break
        }
      }
    }
    return bad
  }

  function reportNewViolations() {
    for (const v of checkOrder()) {
      const sig = v.key + '#' + v.unmountSeq + '>' + v.saveSeq
      if (reported.has(sig)) continue
      reported.add(sig)
      console.error(
        '[viewers] 顺序契约被破坏：文件 ' + v.key + ' 的 viewer 卸载（#' + v.unmountSeq +
        '）发生在静默保存意图（#' + v.saveSeq + '）之前 —— 这正是会丢未保存内容的顺序。' +
        '请检查：① tabs.js 是否仍在改 store.activeKey 之前 emit md:interrupt；' +
        '② 宿主的内容切换 watcher 是否被人改成了 flush:\'sync\'。')
    }
  }

  function notify(ev) {
    for (const fn of [...subscribers]) {
      try { fn(ev) } catch (err) { console.error('[viewers] 订阅者回调抛错（不影响其它订阅者）：', err) }
    }
  }

  const registry = {
    /** 标记：这个对象确实是 viewer 注册表（测试与插件都可以据此判断）。 */
    __isViewerRegistry: true,
    /** 宿主挂载点选择器，插件可读（不要硬编码字符串）。 */
    hostSelector: HOST_SELECTOR,

    /**
     * 注册一个 viewer 声明。**校验不过一律抛错**——本项目的老病是「连错了不吭声」，
     * 所以这里宁可当场炸掉（错误信息里写明怎么改），也不静默降级。
     * @returns {() => boolean} 注销函数（务必在组件 beforeUnmount 里调用）
     */
    register(decl) {
      if (!decl || typeof decl !== 'object') {
        throw new TypeError('[viewers] register 需要一个声明对象：{ id, exts, priority?, mount, update?, cleanup? }')
      }
      const id = typeof decl.id === 'string' ? decl.id.trim() : ''
      if (!id) throw new TypeError('[viewers] 声明缺少 id（必填、全局唯一，惯例直接用插件 id）')
      const exts = Array.isArray(decl.exts) ? decl.exts.map(normExt).filter(Boolean) : []
      if (!exts.length) {
        throw new TypeError('[viewers] 声明 ' + id + ' 缺少 exts（必填；扩展名数组，如 [".docx", ".xlsx"]）')
      }
      if (typeof decl.mount !== 'function') {
        throw new TypeError('[viewers] 声明 ' + id + ' 缺少 mount(hostEl, ctx)（必填；只能往宿主给的挂载点里建节点）')
      }
      if (decl.update !== undefined && typeof decl.update !== 'function') {
        throw new TypeError('[viewers] 声明 ' + id + ' 的 update 必须是函数（它可选，写了就要能用）')
      }
      if (decl.cleanup !== undefined && typeof decl.cleanup !== 'function') {
        throw new TypeError('[viewers] 声明 ' + id + ' 的 cleanup 必须是函数（它可选，写了就要能用）')
      }
      const priority = decl.priority === undefined ? DEFAULT_PRIORITY : decl.priority
      if (typeof priority !== 'number' || !Number.isFinite(priority)) {
        throw new TypeError('[viewers] 声明 ' + id + ' 的 priority 必须是有限数字（可省略，默认 ' + DEFAULT_PRIORITY + '）')
      }
      if (byId.has(id)) {
        throw new Error('[viewers] id 重复注册：' + id +
          '（一个 id 只能有一个声明；重复通常意味着上一次 register 的返回值没有在 beforeUnmount 里调用）')
      }
      const entry = { id, exts, priority, order: ++regSeq, decl }
      byId.set(id, entry)
      decls.push(entry)
      notify({ type: 'register', id })
      return function stop() { return registry.unregister(id) }
    },

    /** 注销：返回是否真的注销掉了（false = 本来就没有这个 id，不抛错，便于幂等调用）。 */
    unregister(id) {
      const key = typeof id === 'string' ? id.trim() : ''
      const entry = byId.get(key)
      if (!entry) return false
      byId.delete(key)
      const i = decls.indexOf(entry)
      if (i >= 0) decls.splice(i, 1)
      notify({ type: 'unregister', id: key })
      return true
    },

    /**
     * 问「这个扩展名谁能开」。
     * 规则：priority 大的先赢；同分时**先注册的先赢**（显式定序，不给文件系统顺序留后门）。
     * @returns 注册时交进来的那个声明对象 | null
     */
    resolve(ext) {
      const e = normExt(ext)
      if (!e) return null
      let best = null
      for (const d of decls) {
        if (!d.exts.includes(e)) continue
        if (!best || d.priority > best.priority) best = d
        // 同分不动：decls 按注册顺序排列，先注册的先赢
      }
      return best ? best.decl : null
    },

    /** 只读快照，给调试与占位面板用（不返回 mount，免得被乱调）。 */
    list() {
      return decls.map((d) => ({ id: d.id, exts: d.exts.slice(), priority: d.priority }))
    },

    /** 宿主内部：注册表变了（注册/注销）时通知在跑的会话，让它重新解析一次。 */
    subscribe(fn) {
      subscribers.add(fn)
      return function off() { subscribers.delete(fn) }
    },

    /** 宿主内部：记一条「保存意图」。key 取当前激活标签；被清空时退回当前 viewer 显示的文件。 */
    noteSaveIntent() {
      return note('save-intent', { key: (store && store.activeKey) || lastMountedKey })
    },

    /** 宿主内部：会话写顺序流水用。 */
    _note: note,
    /** 宿主内部：会话登记「当前 viewer 正在显示哪个文件」。 */
    _setMountedKey(k) { lastMountedKey = k || '' },

    /** 顺序取证（人可读、也可被测试直接调）。 */
    lifecycle: {
      log() { return log.map((e) => ({ ...e })) },
      clear() { log.length = 0; reported.clear() },
      checkOrder,
      violations() { return checkOrder() },
    },
  }
  return registry
}

/**
 * 建立/取回宿主注册表。**幂等**：只此一份。
 * `bus` 上的 `md:interrupt` 监听在这里挂一次——它是「保存意图」的取证点。
 */
function installViewerRegistry() {
  const PH = typeof window !== 'undefined' ? window.PrivHub : null
  if (!PH) return null
  if (!PH.viewers || !PH.viewers.__isViewerRegistry) {
    PH.viewers = createRegistry()
    bus.on('md:interrupt', () => { PH.viewers.noteSaveIntent() })
  }
  return PH.viewers
}

/* =====================================================================
 * 会话：宿主侧「解析 → 挂载 → 卸载」的唯一执行者
 * ===================================================================== */

/** 取当前注册表（不存在就顺手建立；拿不到就返回 null ⇒ 一切走老路）。 */
function currentRegistry() {
  const PH = typeof window !== 'undefined' ? window.PrivHub : null
  if (!PH) return null
  if (!PH.viewers || !PH.viewers.__isViewerRegistry) return installViewerRegistry()
  return PH.viewers
}

/**
 * 造一个 viewer 会话。一个宿主组件实例一个。
 * @param {{ refresh?: () => void }} [opts] refresh：注册表变化时怎么重新解析（默认什么都不做）
 */
function createViewerSession(opts) {
  const refresh = (opts && typeof opts.refresh === 'function') ? opts.refresh : null
  let cur = null      // { id, decl, key, host, ext, cleanup }
  let offSub = null

  function callCleanup(entry) {
    if (!entry || typeof entry.cleanup !== 'function') return
    try { entry.cleanup() } catch (e) { console.error('[viewers] ' + entry.id + ' 的 cleanup 抛错（已吞，不影响宿主）：', e) }
  }

  /** 清空挂载点的子节点并把标签归位。**只动锚点内部，绝不碰 `.v3-content` 本身或别人的节点。** */
  function clearHost(host) {
    if (!host) return
    try { host.replaceChildren() } catch {
      while (host.firstChild) host.removeChild(host.firstChild)
    }
    try { if (host.dataset) host.dataset.viewer = VIEWER_NONE } catch { /* 无所谓 */ }
  }

  /**
   * 卸载当前 viewer。
   * @param {'switch'|'swap'|'no-viewer'|'host-gone'|'teardown'|'unregistered'} reason
   */
  function unmount(reason) {
    if (!cur) return null
    const prev = cur
    cur = null
    const reg = currentRegistry()
    /* 注意：这里**不**把 lastMountedKey 清空。它是「保存意图该算在哪个文件头上」的兜底：
     * panel.js 的 nav.path 那条路径会先把 activeKey 置空、再 emit md:interrupt，
     * 那时只能靠「上一个上过场的文件」把顺序认回来（否则倒挂会查不出来）。 */
    if (reg) reg._note('unmount', { key: prev.key, id: prev.id, reason })
    callCleanup(prev)
    // 挂载点已经随内容区一起被 Vue 销毁时，它的 DOM 不用我们管
    if (reason !== 'host-gone') clearHost(prev.host)
    return prev
  }

  function mountInto(decl, host, ctx) {
    try { if (host.dataset) host.dataset.viewer = decl.id } catch { /* 无所谓 */ }
    const entry = { id: decl.id, decl, key: ctx.key, host, ext: ctx.ext, cleanup: null }
    cur = entry
    let ret = null
    try {
      ret = decl.mount(host, ctx)
    } catch (e) {
      console.error('[viewers] ' + decl.id + '.mount 抛错，本文件退化为无 viewer（宿主自己的渲染分支不受影响）：', e)
      cur = null
      const reg = currentRegistry()
      if (reg) reg._note('mount-error', { key: ctx.key, id: decl.id })
      clearHost(host)
      return { action: 'mount-error' }
    }
    if (typeof ret === 'function') entry.cleanup = ret
    else if (typeof decl.cleanup === 'function') entry.cleanup = function () { decl.cleanup(host, ctx) }
    else entry.cleanup = null
    const reg = currentRegistry()
    if (reg) { reg._note('mount', { key: ctx.key, id: decl.id }); reg._setMountedKey(ctx.key) }
    return { action: 'mount' }
  }

  const session = {
    /**
     * 解析并同步当前该谁上场。**幂等**：同文件 + 同 viewer + 同挂载点 → 完全不动。
     * @param {{ host: Element|null, tab: object|null, content: object|null }} input
     */
    sync(input) {
      const host = (input && input.host) || null
      const tab = (input && input.tab) || null
      const content = (input && input.content) || null
      const reg = currentRegistry()

      // 只有「内容就绪」才轮到 viewer；loading / error 时一律不上场（老路照跑）
      let ext = ''
      let decl = null
      if (tab && content && content.state === 'ready') {
        ext = extOfName(tab.name)
        decl = reg ? reg.resolve(ext) : null
      }

      /* ── 无声明 → 回退老路 ───────────────────────────────────────────
       * 宿主自己的 md / text / image / pdf 渲染分支一字未改，锚点留空即等于「没有这一步」。
       * 这一段就是「本批没有插件注册时也要完全照跑」的落点。 */
      if (!decl) {
        if (cur) { unmount('no-viewer'); return { action: 'unmount' } }
        if (host) clearHost(host)
        return { action: 'fallback' }
      }

      if (!host) {
        // 内容区整体没了（切到别的视图 / 标签全关）→ 存量 viewer 必须收干净
        if (cur) { unmount('host-gone'); return { action: 'unmount' } }
        return { action: 'no-host' }
      }

      const key = tab.key || ''
      const sameHost = !!(cur && cur.host === host)
      const sameViewer = !!(cur && cur.id === decl.id)

      // ① 同文件（或无关重渲染）→ 复用，一个 DOM 动作都不做（这才是真正的「不白闪」）
      if (sameHost && sameViewer && cur.key === key) {
        if (reg) reg._note('reuse', { key, id: decl.id })
        return { action: 'reuse' }
      }

      // ② 同类文件之间切换 → 复用：挂载点不重建、viewer 身份不变
      if (sameHost && sameViewer) {
        const ctx = { project: tab.project, path: tab.path, name: tab.name, key, ext }
        if (typeof decl.update === 'function') {
          try {
            decl.update(host, ctx)
            cur.key = key
            cur.ext = ext
            if (reg) { reg._note('update', { key, id: decl.id }); reg._setMountedKey(key) }
            return { action: 'update' }
          } catch (e) {
            console.error('[viewers] ' + decl.id + '.update 抛错，退回重建一次：', e)
          }
        }
        // 没声明 update（或 update 抛错）：同一个锚点里「先收后建」，同一批次完成 → 中间不给浏览器绘制机会
        unmount('swap')
        return mountInto(decl, host, { project: tab.project, path: tab.path, name: tab.name, key, ext })
      }

      // ③ 异类（或挂载点被 Vue 重建过）→ **先卸旧的、再挂新的**
      if (cur) unmount('switch')
      return mountInto(decl, host, { project: tab.project, path: tab.path, name: tab.name, key, ext })
    },

    /** 宿主组件 beforeUnmount / 内容区销毁时调用：把当前的 viewer 收干净。 */
    dispose(reason) {
      if (offSub) { offSub(); offSub = null }
      return unmount(reason || 'teardown')
    },

    /** 当前在场上的是谁（调试/测试用）。 */
    current() {
      return cur ? { id: cur.id, key: cur.key, ext: cur.ext, host: cur.host } : null
    },

    /** 会话开始：注册表一变就重新解析一次（插件热装卸时不会留半截状态）。 */
    start() {
      if (offSub) return session
      const reg = currentRegistry()
      if (reg && refresh) offSub = reg.subscribe(() => { refresh() })
      return session
    },
  }
  return session
}

/* 模块加载即建立注册表：所有插件模块的 import 都发生在任何组件挂载之前，
 * 因此插件在 mounted() 里 register 时，注册表必然已经在那儿了。 */
installViewerRegistry()

export {
  HOST_SELECTOR,
  VIEWER_NONE,
  DEFAULT_PRIORITY,
  normExt,
  extOfName,
  createRegistry,
  installViewerRegistry,
  createViewerSession,
}
