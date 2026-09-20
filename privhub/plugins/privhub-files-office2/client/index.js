/**
 * privhub-files-office2 · client — Office 原生观感预览（声明式 viewer）
 *
 * 第二步 b：把「往别人的容器里塞 iframe」改成「向宿主声明式注册 viewer」。
 *
 *   迁前：监听 bus 'v3:md-rendered' → 自己去查别人的内容区容器 → 自己 prepend iframe、
 *         藏别人的 .v3-md、按类名声称内容区布局。
 *   迁后：只做一件事 —— 向宿主契约声明「我能开 .docx / .xlsx」，
 *         由宿主决定「现在该谁上场」，并把**宿主自己的挂载点** `.v3-viewer-host`
 *         交给本插件；本插件只往那块地里放 iframe，卸载由宿主调它返回的清理函数。
 *
 * 一句话：**少一次跨插件 DOM 认领，内容区的所有权才真正归宿主**（硬约束 5 的正解）。
 *
 *   const stop = window.PrivHub.viewers.register({ id, exts, priority, mount(hostEl, ctx) })
 *   // 组件 beforeUnmount 里 stop()：插件被卸载 → 声明消失 → 零残留
 *
 *   mount 的 ctx = { project, path, name, key, ext }
 *
 * ── 为什么【不】声明 update（同类 docx→docx 换文件） ──────────────────────
 *   契约里 update 的语义是「复用同一个 viewer 换文件」。本插件**刻意不声明它**：
 *   旧写法正是「有 frame 就只换 src」，而浏览器在 iframe 导航期间会继续显示上一个
 *   文件已经画好的画面 —— 那正是「切回来又闪一下旧 docx」的次要触发点。
 *   不声明 update，宿主会在同一个挂载点里**先收后建**，且两步在同一同步批次内完成
 *   （中间不给浏览器绘制机会）：新 frame 从空白开始加载，没有旧画面可露。
 *   宁可不复用，也不回退到这个 bug 的触发点上。
 *
 * ── CSS 只认自己的挂载点 ──────────────────────────────────────────────
 *   布局规则一律收敛到 `.v3-viewer-host[data-viewer="privhub-files-office2"]` 之下，
 *   只声明「自己的地里怎么排」。内容区整块让给 viewer 的那个状态类（padding:0 /
 *   纵向 flex）由**宿主**写在宿主自己的样式里（`.v3-content--viewer`），
 *   本插件一行都不碰 `.v3-content`。
 *
 * ── 回退 ────────────────────────────────────────────────────────────
 *   卸载本插件（删除 plugins 目录）→ 不再注册 → 宿主解析不到 viewer →
 *   .docx/.xlsx 回到老路（内容区显示 Office → Markdown 的文本提取）。零残留、零影响。
 *
 * @module privhub-files-office2/client
 */

/** viewer 身份：全局唯一，惯例直接用插件 id（宿主据此写锚点的 data-viewer）。 */
const VIEWER_ID = 'privhub-files-office2'
/** 本插件认领的扩展名（小写带点）。其余类型不干预：pptx 保持宿主的 md 提取预览。 */
const REPLACE_EXTS = ['.docx', '.xlsx']
/** 优先级：高于契约默认值 100，保证本插件在同类扩展名上先上场。 */
const VIEWER_PRIORITY = 200

/* 归属标记：本插件自建的节点都带这个属性。
 * 第二步 b 起宿主清场**跳过挂载点内部**（panel.js 的 clearInjected —— 挂载点里是
 * viewer 的私有财产，由它自己的 cleanup 收，宿主不能顺手删掉在岗的 viewer），
 * 所以这个标记**已经不再被任何代码读取**；留着是为了自证归属：在浏览器里一眼看出
 * 这个节点是谁造的、是不是还赖着没走。删掉它不影响任何行为（已核实，见 b 批回报）。 */
const MARK = 'data-v3-injected'

/* 只声明「自己的地里怎么排」：挂载点吃掉内容区纵向剩余空间，iframe 撑满挂载点。
 * 注意：V3 的内容区已不再有 .v3-content-head（详情/⋯ 已移到标签行）。
 * 不要在这里重新引入任何占据内容区顶部的元素——否则又会变成
 * 「标签行 + 内容顶栏 + office 自身工具条」的多层顶栏与重叠干涉。 */
const styleEl = document.createElement('style')
styleEl.textContent = `
.v3-viewer-host[data-viewer="${VIEWER_ID}"] { display:flex; flex:1 1 auto; min-height:0; }
.v3-viewer-host[data-viewer="${VIEWER_ID}"] iframe.office2-frame { display:block; flex:1 1 auto; min-height:0; width:100%; height:100%; border:none; background:#fff; }
`
document.head.appendChild(styleEl)

/** 预览页 URL（iframe 自己取 /privhub-plugins/privhub-files-office2/view.html）。 */
function frameUrl(ctx) {
  const project = (ctx && ctx.project) || ''
  const path = (ctx && ctx.path) || ''
  const name = (ctx && ctx.name) || path.split('/').pop() || ''
  return '/privhub-plugins/privhub-files-office2/view.html?project=' + encodeURIComponent(project) +
    '&path=' + encodeURIComponent(path) +
    '&name=' + encodeURIComponent(name)
}

/**
 * viewer 声明：**一次 mount 造一个全新的 frame**。
 * 只往宿主给的 hostEl 里建节点（绝不碰 .v3-content / 别人的节点），
 * 返回的函数就是卸载时的清理函数 —— 自己造的节点自己收，不留给宿主善后。
 */
const office2Viewer = {
  id: VIEWER_ID,
  exts: REPLACE_EXTS,
  priority: VIEWER_PRIORITY,
  mount(hostEl, ctx) {
    const frame = document.createElement('iframe')
    frame.className = 'office2-frame'
    frame.setAttribute(MARK, VIEWER_ID)
    frame.src = frameUrl(ctx)
    hostEl.appendChild(frame)
    return () => { frame.remove() }
  },
}

const Office2Viewer = {
  name: 'office2-viewer',
  mounted() {
    const V = window.PrivHub && window.PrivHub.viewers
    if (!V || !V.__isViewerRegistry) {
      /* 本项目的老病是「连错了不吭声」：契约不在就当场喊出来，不静默降级。 */
      console.error('[privhub-files-office2] 找不到内容区 viewer 契约 window.PrivHub.viewers —— ' +
        '本插件不会上场（.docx/.xlsx 退回宿主的 Markdown 提取预览）。请确认 explorer-v3 已加载。')
      return
    }
    this._stop = V.register(office2Viewer)
  },
  beforeUnmount() {
    // 插件被卸载 → 声明消失 → 宿主解析不到 viewer → 零残留
    if (this._stop) { this._stop(); this._stop = null }
  },
  template: `<div style="display:none"></div>`,
}

export default {
  id: 'privhub-files-office2',
  slots: {
    'office-editor': Office2Viewer,
  },
}
