/**
 * privhub-task-board · styles —— 任务看板的版式与滚动条（import 即注入）
 *
 * 只负责**版式**：整页骨架（铺满主区 / 工具条 / 看板视口 / 页脚）与滚动条。
 * 卡片、列的观感仍写在模板的行内样式里（这一轮只动「宽度与滚动」这件事）。
 *
 * 类名统一 `tb-` 前缀；颜色/间距/字号/圆角一律走骨架令牌（FE-03 刻度层），
 * 两套主题自动跟随。注入写法照抄 privhub-project-dashboard/client/styles.js 的哨兵，
 * 并对无 DOM 的测试沙箱做保护（缺了保护会在 import 阶段就抛错、连累主路径）。
 *
 * @module privhub-task-board/client/styles
 */

const CSS = `
/* ============ 任务看板 ============ */
/* 本页是「横向铺满 + 横向滚动」的看板，直接挂在骨架 .main（flex column / overflow:hidden）下。
 * 所以【刻意不用】骨架 .view-inner —— 它限宽 1100px 居中，主区一宽就在两侧留出两条 --bg
 * 空带（用户反馈的「两边儿有两个底儿」）。.tb-wrap 自己吃满主区、不设底色（与项目看板
 * .db-wrap 同一路子：底板就是 --bg，白色只留给列与卡片）。
 * 它同时是这一页的 flex 列容器：h2 / 工具条 / 看板视口 / 页脚 依次排下来。 */
.tb-wrap {
  flex: 1 1 auto; min-height: 0; width: 100%;
  display: flex; flex-direction: column;
  padding: var(--sp-4) var(--sp-5) var(--sp-3);
}
.tb-h2 { font-size: 16px; margin-bottom: var(--sp-3); }

/* 工具条：钉在看板上方，不随看板滚动 */
.tb-bar { display: flex; gap: var(--sp-2); align-items: center; flex-wrap: wrap; margin-bottom: var(--sp-3); }

/* 空/加载/出错态：撑满剩余高度，页脚才始终落在底部 */
.empty.tb-empty { flex: 1; padding: 60px 0; }

/* 看板视口 + 列容器（同一个元素，两个类各管一段）。
 * flex:1 吃掉 h2 / 工具条 / 页脚之外的全部高度；min-height:0 是关键 —— flex 项默认不肯
 * 比内容矮，缺了它整页会被内容撑高，滚动条被顶到屏幕外（原来「加了列看不见」正是这个原因）。
 * 视口对上下都有界，于是两根滚动条都落在它的边缘：横向条永远贴在可见区域底边。 */
.tb-scroll { flex: 1; min-height: 0; overflow: auto; padding-bottom: var(--sp-1); }
.tb-cols { display: flex; gap: var(--sp-3); align-items: flex-start; }

/* 细滚动条不再自己实现：全站统一走骨架的 .ph-scroll（6px 细条 + 透明轨道 + 滑块右下 2px 投影）。
 * 模板里给视口同时挂 tb-scroll 与 ph-scroll 两个类 —— 前者管版式，后者管滚动条。
 * （默认滚动条在 Windows 上占 15px 宽、还带一截箭头区，压在卡片右缘很难看。） */

.tb-foot { margin-top: var(--sp-3); display: flex; gap: 10px; justify-content: flex-end; }
`

const MARK = 'data-privhub-taskboard'
try {
  if (typeof document !== 'undefined' && document.querySelector && document.createElement && document.head) {
    if (!document.querySelector('style[' + MARK + ']')) {
      const el = document.createElement('style')
      el.setAttribute(MARK, '')
      el.textContent = CSS
      document.head.appendChild(el)
    }
  }
} catch { /* 无 DOM 沙箱：静默跳过注入 */ }
