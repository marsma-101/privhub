/**
 * privhub-mindmap · client — 思维导图（`.mindmap`）的查看器与编辑器。
 *
 * ## 本插件是什么形状
 *
 * 三个槽：`office-editor` 上是隐形控制器（声明 viewer）；`mindmap` 上是「思维导图」
 * 整页列表（P2，图标栏「知识」组那个入口，见 `list.js`）；`mindmap-global` 上是
 * 「全局思维导图」（P3，最左竖栏 `global` 组的一级入口，仅管理员，见 `global.js`）。
 *
 * **项目内导图（P1/P2）一行服务端代码都不需要**：`.mindmap` 就是一个普通文件，
 * 格式登记（`file-exts.ts`）与读写接口（`/api/preview` · `/api/text/save`）都是既有的。
 * 但 P3 的**全局图不是文件**（没有归属项目、不进文件树），所以本插件自 P3 起有了
 * `src/index.ts`：`data/mindmaps/global.json` + 四条管理员路由（`main.ts` 的 L3 自动发现
 * 只认 `<dir>/src/index.ts`，加了就会被挂载，无需改任何装配代码）。
 *
 * ## 怎么上场（宿主契约，见 explorer-v3 的 `viewers.js`）
 *
 *     const stop = window.PrivHub.viewers.register({ id, exts, priority, mount(hostEl, ctx) })
 *
 * 宿主按扩展名解析「现在该谁上场」并把**宿主自己的挂载点** `.v3-viewer-host` 交给本插件，
 * 顺便在锚点上写 `data-viewer="privhub-mindmap"`（本插件的 CSS 就挂在这个属性下面）。
 * `mount` 返回的函数是清理函数，由宿主在换文件 / 卸载时调用。
 *
 * ## 这里为什么要造一个**嵌套 Vue 应用**
 *
 * 本插件不是「往容器里塞一个 iframe」，而是一棵要用 Vue 响应式的界面（画布 ↔ 大纲实时同步）。
 * 宿主给的是**普通 DOM 元素**（不是 Vue 组件的插槽），所以只能自己
 * `window.Vue.createApp(...)` 挂上去 —— 骨架把 Vue 全局构建挂在 `window.Vue` 上，
 * 且 CSP 保留了 `unsafe-eval`（组件用的是字符串 `template:`，靠运行期编译）。
 * 这是本仓第一个这么做的插件；卸载时 `app.unmount()` 一次清干净，不留残留。
 *
 * ## 卸载即回退
 *
 * 删掉 `plugins/privhub-mindmap/` ⇒ 不再注册 ⇒ 宿主解析不到 viewer ⇒ `.mindmap`
 * 退回**文本预览**（它已经登记为可预览文本）：文件照样打得开、改得了，
 * 只是没有图形画布。这是「纯文本格式」这条设计地基换来的下限保障。
 *
 * @module privhub-mindmap/client
 */

import './styles.js'
import { MindmapEditor } from './editor.js'
import { MindmapListView } from './list.js'
import { GlobalMindmapView } from './global.js'
import { fail } from './deps.js'

/** viewer 身份：全局唯一；宿主据此写锚点属性，本插件据它挂 CSS。 */
const VIEWER_ID = 'privhub-mindmap'
/** 认领的扩展名（小写带点）。`.mindmap` 全仓只有本插件认领，所以没有竞争。 */
const REPLACE_EXTS = ['.mindmap']
/** 优先级：> 契约默认 100（与 office2 同档 200；两者扩展名不重叠，不会真的抢）。 */
const VIEWER_PRIORITY = 200

/**
 * 往宿主给的挂载点里挂一棵独立的 Vue 应用。
 *
 * `ctx = { project, path, name, key, ext }`，逐个当 props 传给编辑器（编辑器自己
 * 用 `/api/preview` 拉内容 —— 不用 ctx 里的任何已渲染数据，这是 viewer 的契约口径）。
 */
const MindmapViewer = {
  id: VIEWER_ID,
  exts: REPLACE_EXTS,
  priority: VIEWER_PRIORITY,
  mount(hostEl, ctx) {
    const c = ctx || {}
    const Vue = typeof window !== 'undefined' && window.Vue
    if (!Vue || typeof Vue.createApp !== 'function') {
      fail('页面里没有 Vue 全局构建（window.Vue）—— 思维导图查看器无法上场。')
      const tip = document.createElement('div')
      tip.style.cssText = 'padding:16px;color:var(--muted);font-size:13px'
      tip.textContent = '思维导图查看器加载失败：找不到 Vue 运行期。'
      hostEl.appendChild(tip)
      return () => tip.remove()
    }
    const app = Vue.createApp(MindmapEditor, {
      project: c.project || '',
      path: c.path || '',
      name: c.name || '',
    })
    const vm = app.mount(hostEl)
    return () => {
      try {
        app.unmount()
      } catch (e) {
        /* 卸载阶段出错也要出声：静默降级是本仓的老病。 */
        fail('卸载思维导图查看器时报错：' + ((e && e.message) || e))
      }
      /* Vue 的 unmount 只清它自己渲染的节点；宿主给的挂载点本身归宿主，不去动它。 */
      if (vm && vm.$el && vm.$el.parentNode && vm.$el.parentNode !== hostEl) vm.$el.remove()
    }
  },
}

/**
 * 常驻的「注册器」组件：挂在 `office-editor` 槽上（一个**一直存在**的槽，
 * 本仓多个插件都用它当隐形控制器的落点 —— office2 / comments / versions 都是这个套路）。
 * 它自己不渲染任何东西，只负责「插件在 ⇒ 声明在；插件卸载 ⇒ 声明消失」。
 */
const MindmapViewerRegistrar = {
  name: 'mindmap-viewer-registrar',
  mounted() {
    const V = typeof window !== 'undefined' && window.PrivHub && window.PrivHub.viewers
    if (!V || !V.__isViewerRegistry) {
      /* 契约不在就当场喊出来，不静默降级（与 office2 同一口径）：
       * 此时 .mindmap 会退回文本预览，属于「可用但不是预期形态」，必须让它可见。 */
      fail('找不到内容区 viewer 契约 window.PrivHub.viewers —— 本插件不会上场（.mindmap 退回文本预览）。请确认 explorer-v3 已加载。')
      return
    }
    this._stop = V.register(MindmapViewer)
  },
  beforeUnmount() {
    if (this._stop) { this._stop(); this._stop = null }
  },
  template: `<div style="display:none"></div>`,
}

/* ── 三个槽的三件事 ────────────────────────────────────────────────────────
 * `office-editor`：隐形控制器，负责「插件在 ⇒ viewer 声明在」（P1）。
 * `mindmap`：项目层「知识」组的整页视图（P2）——自己不画图，只把文件「打开」到
 *           文件视图，交给 viewer 上场（画布渲染逻辑全仓只有一份）。
 * `mindmap-global`：实例级全局图（P3）——它复用的也是同一个 `MindmapEditor`，
 *           只是把数据源从「项目内文件」换成注入的 `loader` / `saver`。 */
export default {
  id: VIEWER_ID,
  slots: {
    'office-editor': MindmapViewerRegistrar,
    mindmap: MindmapListView,
    'mindmap-global': GlobalMindmapView,
  },
}
