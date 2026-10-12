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
.db-wrap { max-width: 1080px; margin: 0 auto; padding: var(--sp-4) var(--sp-5) var(--sp-6); }

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

.db-head { margin: 0 0 var(--sp-4); }
.db-h2 { margin: 0; font-size: var(--fs-xl); font-weight: 600; }
.db-sub { margin: 6px 0 0; color: var(--muted); font-size: var(--fs-sm); }

/* 版式：两列网格。全宽分区跨两列，半宽分区占一列 —— 两个相邻的 half 自动并排。 */
.db-body { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--sp-3); align-items: start; }
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

.db-foot { margin-top: var(--sp-2); display: flex; flex-direction: column; gap: 4px; color: var(--muted); font-size: var(--fs-xs); }
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
