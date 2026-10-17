/**
 * privhub-project-dashboard · styles —— 项目看板的全部样式（import 即注入）
 *
 * 全部类名带 `db-` 前缀；颜色/间距/字号/圆角一律走骨架令牌（FE-03 刻度层），
 * 因此两套主题自动跟随，不另配一套配色。
 * 注入写法照抄 shell-home/styles.js 那套已验证的哨兵；并对无 DOM 的测试沙箱做保护
 * （personal-ui 的 K 沙箱里没有 document，缺了保护会在 import 阶段就抛错、连累主路径）。
 *
 * @module privhub-project-dashboard/client/styles
 */

const CSS = `
/* ============ 项目看板 ============ */
/* 版式与任务看板同一标准（.tb-wrap 那套）：整页直接挂在骨架 .main（flex column / overflow:hidden）下。
 * 刻意【不用】限宽居中的 .view-inner —— 主区一宽两侧就留出两条 --bg 空带。
 * .db-wrap 吃满主区、不设底色（底板=--bg，白底只留给分区与组件），自己是个 flex 列容器：
 * 工具条钉在顶部，中间 .db-body 是**有界滚动视口**（不是整页滚动），页脚落在底部。 */
.db-wrap {
  flex: 1 1 auto; min-height: 0; width: 100%;
  display: flex; flex-direction: column;
  padding: var(--sp-4) var(--sp-5) var(--sp-3);
}

/* 工具条：钉在看板上方，不随内容滚动 */
.db-bar { display: flex; align-items: center; gap: var(--sp-3); flex-wrap: wrap; padding: 4px 0 var(--sp-4); border-bottom: 1px solid var(--line); margin-bottom: var(--sp-4); }
.db-title { display: flex; align-items: center; gap: 8px; font-size: var(--fs-lg); font-weight: 600; }
.db-ico { font-size: var(--fs-xl); }
.db-sel { margin-left: 6px; padding: 4px 8px; border: 1px solid var(--line); border-radius: var(--r-2); background: var(--bg); color: var(--text); font-size: var(--fs-sm); }
.db-actions { margin-left: auto; display: flex; align-items: center; gap: var(--sp-2); }
.db-meta { color: var(--muted); font-size: var(--fs-xs); }
.db-btn { padding: 5px 12px; border: 1px solid var(--line); border-radius: var(--r-2); background: var(--bg-soft, transparent); color: var(--text); cursor: pointer; font-size: var(--fs-sm); }
.db-btn:hover { border-color: var(--accent, #4a7bd6); }
.db-btn:disabled { opacity: .55; cursor: default; }

.db-empty, .db-err { padding: var(--sp-5); text-align: center; color: var(--muted); font-size: var(--fs-base); }
.db-err { color: var(--danger); }
/* 空/错/加载态是 .db-wrap 的直系子元素：吃掉工具条与页脚之外的全部高度（页脚才始终贴底） */
.db-wrap > .db-empty, .db-wrap > .db-err { flex: 1; display: grid; place-content: center; }

.db-head { grid-column: 1 / -1; margin: 0 0 var(--sp-4); }
.db-h2 { margin: 0; font-size: var(--fs-xl); font-weight: 600; }
.db-sub { margin: 6px 0 0; color: var(--muted); font-size: var(--fs-sm); }

/* 版式：两列网格 + 本页唯一的滚动视口。
 * flex:1 吃掉工具条/页脚之外的高度；min-height:0 是关键 —— flex 项默认不肯比内容矮，
 * 缺了它整页会被内容撑高、滚动条被顶出屏幕（与任务看板同一个坑）。
 * ⚠ grid-auto-rows:max-content 不是可选项：本元素同时是「高度确定的滚动容器」与「网格容器」，
 *   此时 Chromium 会把 auto 行轨按容器高度摊分（实测 6 个分区被压成 2px 行、内容互相重叠），
 *   显式写成 max-content 才让每行按内容定高。凡是「网格 + overflow:auto + flex 定高」的组合都要写。 */
.db-body { flex: 1; min-height: 0; overflow: auto; padding-bottom: var(--sp-1);
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: max-content;
  gap: var(--sp-3); align-items: start; }
@media (max-width: 720px) { .db-body { grid-template-columns: minmax(0, 1fr); } .db-sec.w-half { grid-column: 1 / -1 !important; } }

.db-sec { grid-column: 1 / -1; border: 1px solid var(--line); border-radius: var(--r-2); background: var(--card, var(--bg)); overflow: hidden; }
.db-sec-head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; cursor: pointer; user-select: none; background: var(--bg-soft, rgba(0,0,0,.02)); }
.db-sec-head:hover { background: var(--accent-soft, rgba(74,123,214,.08)); }
.db-caret { color: var(--muted); font-size: var(--fs-sm); width: 12px; }
.db-sec-title { font-weight: 600; font-size: var(--fs-base); }
.db-sec-n { margin-left: auto; color: var(--muted); font-size: var(--fs-xs); }
.db-sec-body { padding: var(--sp-3) 12px var(--sp-4); display: flex; flex-direction: column; gap: var(--sp-3); }
/* 半宽分区：与相邻半宽并排成两栏（容器用两列网格，全宽分区跨两列） */
.db-body > .db-sec.w-half { grid-column: span 1; }

.db-widget { border-top: 1px dashed var(--line); padding-top: var(--sp-3); }
.db-widget:first-child { border-top: 0; padding-top: 0; }
.db-wtitle { font-weight: 600; font-size: var(--fs-sm); margin-bottom: 8px; color: var(--text); }
.db-muted { color: var(--muted); font-size: var(--fs-sm); }

/* 统计卡 */
.db-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--sp-3); }
.db-stat { padding: 10px 12px; border-radius: var(--r-2); background: var(--bg-soft, rgba(0,0,0,.03)); }
.db-stat-v { font-size: var(--fs-xl); font-weight: 700; line-height: 1.2; }
.db-stat-l { margin-top: 4px; color: var(--muted); font-size: var(--fs-xs); }
.db-stat-h { display: block; margin-top: 2px; opacity: .8; }

/* 计划 / 里程碑 */
.db-plan { display: flex; flex-direction: column; gap: 2px; }
.db-plan-i { display: flex; gap: 8px; padding: 6px 8px; border-radius: var(--r-2); font-size: var(--fs-sm); }
.db-plan-i:hover { background: var(--bg-soft, rgba(0,0,0,.03)); }
.db-plan-ico { flex: 0 0 auto; }
.db-plan-t { flex: 1; min-width: 0; }
.db-plan-i.st-done .db-plan-t { color: var(--muted); text-decoration: line-through; }
.db-plan-i.st-doing .db-plan-t { font-weight: 600; }
.db-plan-i.st-blocked .db-plan-t { color: var(--danger); }
.db-plan-n { display: block; margin-top: 2px; color: var(--muted); font-size: var(--fs-xs); text-decoration: none; }

/* 任务进度（实时投影自任务看板） */
.db-tasks { display: flex; flex-direction: column; gap: var(--sp-2); }
.db-tprog-top { display: flex; justify-content: space-between; align-items: baseline; font-size: var(--fs-sm); margin-bottom: 4px; }
.db-tprog-n { color: var(--muted); }
.db-tprog-p { font-weight: 600; }
.db-tprog-bar { height: 8px; border-radius: 999px; background: var(--bg-soft, rgba(0,0,0,.06)); overflow: hidden; }
.db-tprog-bar > i { display: block; height: 100%; border-radius: 999px; background: var(--accent, #4a7bd6); transition: width .3s ease; }
.db-tcols { display: flex; flex-wrap: wrap; gap: 6px; }
.db-tcol { padding: 2px 9px; border: 1px solid var(--line); border-radius: 999px; font-size: var(--fs-xs); color: var(--muted); }
.db-tcol b { color: var(--text); margin-left: 3px; }
.db-tcards { display: flex; flex-direction: column; gap: 2px; margin-top: 2px; }
.db-tcard { display: flex; align-items: baseline; gap: 8px; padding: 5px 8px; border-radius: var(--r-2); font-size: var(--fs-sm); cursor: pointer; }
.db-tcard:hover { background: var(--bg-soft, rgba(0,0,0,.03)); }
.db-tcard-dot { flex: 0 0 auto; width: 7px; height: 7px; border-radius: 50%; background: var(--muted); align-self: center; }
.db-tcard-dot.p-low { background: #9aa4b2; }
.db-tcard-dot.p-normal { background: #4a7bd6; }
.db-tcard-dot.p-high { background: #e08a2e; }
.db-tcard-dot.p-urgent { background: #d64545; }
.db-tcard-t { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.db-tcard-meta { flex: 0 0 auto; color: var(--muted); font-size: var(--fs-xs); }
.db-tfoot { display: flex; justify-content: space-between; align-items: center; gap: var(--sp-2); margin-top: 4px; }
.db-btn-sm { padding: 2px 10px; font-size: var(--fs-xs); }

/* 智能体名册（登记/自述 + 系统实证） */
.db-agents { display: flex; flex-direction: column; gap: var(--sp-2); }
.db-agt { border: 1px solid var(--line); border-radius: var(--r-2); padding: 8px 10px; display: flex; flex-direction: column; gap: 5px; }
.db-agt-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.db-agt-name { font-weight: 600; font-size: var(--fs-sm); }
.db-agt-kind { color: var(--muted); font-size: var(--fs-xs); }
.db-agt-status { margin-left: auto; font-size: var(--fs-xs); padding: 1px 8px; border-radius: 999px; border: 1px solid var(--line); color: var(--muted); }
.db-agt-status.st-active { color: #2e8b57; border-color: #2e8b57; }
.db-agt-status.st-paused { color: #e08a2e; border-color: #e08a2e; }
.db-agt-skills { display: flex; flex-wrap: wrap; gap: 4px; }
.db-agt-skill { padding: 1px 8px; border-radius: 999px; background: var(--accent-soft, rgba(74,123,214,.12)); font-size: var(--fs-xs); }
.db-agt-bio { color: var(--text); font-size: var(--fs-sm); white-space: pre-wrap; }
.db-agt-line { color: var(--muted); font-size: var(--fs-xs); }
.db-agt-acts { display: flex; gap: 6px; }
.db-agt-form { display: flex; flex-direction: column; gap: 6px; border: 1px dashed var(--line); border-radius: var(--r-2); padding: 10px; }
.db-agt-form label { font-size: var(--fs-xs); color: var(--muted); }
.db-agt-form input, .db-agt-form textarea, .db-agt-form select { width: 100%; padding: 6px 9px; background: var(--bg); border: 1px solid var(--line); border-radius: var(--r-2); color: var(--text); font-size: var(--fs-sm); box-sizing: border-box; }
.db-agt-row { display: flex; gap: 8px; }
.db-agt-row > * { flex: 1; }
.db-agt-err { color: var(--danger); font-size: var(--fs-xs); }

/* 受限 Markdown */
.db-md { font-size: var(--fs-base); line-height: 1.75; color: var(--text); }
.db-md h3, .db-md h4, .db-md h5 { margin: 10px 0 6px; font-weight: 600; }
.db-md h3 { font-size: var(--fs-lg); }
.db-md h4 { font-size: var(--fs-base); }
.db-md h5 { font-size: var(--fs-sm); color: var(--muted); }
.db-md p { margin: 6px 0; }
.db-md ul { margin: 6px 0; padding-left: 20px; }
.db-md li { margin: 2px 0; }
.db-md code { padding: 1px 5px; border-radius: var(--r-2); background: var(--bg-soft, rgba(0,0,0,.05)); font-family: ui-monospace, Consolas, monospace; font-size: var(--fs-sm); }
.db-md blockquote { margin: 6px 0; padding: 4px 10px; border-left: 3px solid var(--line); color: var(--muted); }
.db-md a { color: var(--accent, #4a7bd6); }

/* 页脚：钉在 .db-wrap 底部（在滚动视口之外），不随内容滚走 */
.db-foot { margin-top: var(--sp-3); display: flex; flex-direction: column; gap: 4px; color: var(--muted); font-size: var(--fs-xs); }
.db-foot-edit { color: var(--muted); }
`

const MARK = 'data-privhub-dashboard'
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
