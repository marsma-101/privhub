/**
 * privhub-task-calendar · styles —— 任务日历全部样式（import 即注入）
 *
 * 类名统一 `cal-` 前缀；颜色/间距/字号/圆角走骨架令牌（两套主题自动跟随）。
 * 注入写法与 shell-home / project-dashboard 一致：哨兵防重复 + 无 DOM 沙箱保护
 * （personal-ui 的测试沙箱没有 document，缺保护会在 import 阶段就抛错）。
 *
 * @module privhub-task-calendar/client/styles
 */

const CSS = `
/* ============ 任务日历 ============ */
/* 竖版长页面，直接挂在骨架 .main（overflow:hidden）下：必须自带滚动条（同 project-dashboard 的 .db-wrap）。 */
.cal-wrap { flex: 1 1 auto; min-height: 0; overflow-y: auto; max-width: 1280px; margin: 0 auto; padding: var(--sp-4) var(--sp-5) var(--sp-6); }

.cal-bar { display: flex; align-items: center; gap: var(--sp-3); flex-wrap: wrap; padding: 4px 0 var(--sp-3); border-bottom: 1px solid var(--line); margin-bottom: var(--sp-3); }
.cal-nav { display: flex; align-items: center; gap: 6px; }
.cal-title { margin-left: 4px; font-size: var(--fs-lg); font-weight: 600; }
.cal-modes { display: flex; border: 1px solid var(--line); border-radius: var(--r-2); overflow: hidden; }
.cal-mbtn { padding: 5px 14px; border: 0; background: var(--bg); color: var(--text); cursor: pointer; font-size: var(--fs-sm); }
.cal-mbtn + .cal-mbtn { border-left: 1px solid var(--line); }
.cal-mbtn.on { background: var(--accent, #4a7bd6); color: #fff; }
.cal-right { margin-left: auto; display: flex; align-items: center; gap: var(--sp-2); }
.cal-sel { padding: 4px 8px; border: 1px solid var(--line); border-radius: var(--r-2); background: var(--bg); color: var(--text); font-size: var(--fs-sm); }
.cal-btn { padding: 5px 12px; border: 1px solid var(--line); border-radius: var(--r-2); background: var(--bg); color: var(--text); cursor: pointer; font-size: var(--fs-sm); }
.cal-btn:hover { border-color: var(--accent, #4a7bd6); }
.cal-btn:disabled { opacity: .55; cursor: default; }

.cal-empty, .cal-err { padding: var(--sp-5); text-align: center; color: var(--muted); }
.cal-err { color: var(--danger); }

/* ---- 月视图 ---- */
.cal-month { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
.cal-wd { text-align: center; color: var(--muted); font-size: var(--fs-xs); padding: 4px 0; }
.cal-cell { min-height: 96px; border: 1px solid var(--line); border-radius: var(--r-2); background: var(--card, var(--bg)); padding: 4px 5px; display: flex; flex-direction: column; gap: 3px; }
.cal-cell.out { opacity: .45; }
.cal-cell.today { border-color: var(--accent, #4a7bd6); box-shadow: inset 0 0 0 1px var(--accent, #4a7bd6); }
.cal-cell.over, .cal-wcol.over, .cal-undated.over { background: var(--accent-soft, rgba(74,123,214,.12)); border-color: var(--accent, #4a7bd6); }
.cal-cell-head { display: flex; align-items: center; justify-content: space-between; }
.cal-daynum { font-size: var(--fs-xs); color: var(--muted); cursor: pointer; padding: 1px 4px; border-radius: var(--r-2); }
.cal-cell.today .cal-daynum, .cal-wcol.today .cal-daynum { color: #fff; background: var(--accent, #4a7bd6); font-weight: 600; }
.cal-daynum:hover { background: var(--bg-soft, rgba(0,0,0,.06)); }
.cal-add { border: 0; background: transparent; color: var(--muted); cursor: pointer; font-size: var(--fs-sm); line-height: 1; padding: 0 3px; opacity: 0; }
.cal-cell:hover .cal-add, .cal-wcol:hover .cal-add { opacity: 1; }
.cal-add:hover { color: var(--accent, #4a7bd6); }

.cal-chips { display: flex; flex-direction: column; gap: 2px; }
.cal-chip { display: flex; align-items: center; gap: 4px; padding: 2px 5px; border-left: 3px solid var(--line); border-radius: 3px; background: var(--bg-soft, rgba(0,0,0,.04)); font-size: var(--fs-xs); cursor: grab; }
.cal-chip.sel { outline: 1px solid var(--accent, #4a7bd6); }
.cal-chip.done .cal-chip-t { text-decoration: line-through; color: var(--muted); }
.cal-chip-t { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cal-chip-a { color: var(--muted); font-size: 10px; flex: 0 0 auto; }
.cal-more { color: var(--muted); font-size: 10px; cursor: pointer; padding-left: 4px; }
.cal-more:hover { color: var(--accent, #4a7bd6); }

/* ---- 周视图 ---- */
.cal-week { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: var(--sp-2); align-items: start; }
.cal-wcol { min-height: 200px; border: 1px solid var(--line); border-radius: var(--r-2); background: var(--card, var(--bg)); padding: 6px; display: flex; flex-direction: column; gap: 4px; }
.cal-wcol.today { border-color: var(--accent, #4a7bd6); }
.cal-wcol-head { display: flex; align-items: center; justify-content: space-between; }
.cal-none { color: var(--muted); font-size: var(--fs-xs); }
@media (max-width: 860px) { .cal-week { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

/* ---- 日视图 ---- */
.cal-daylist { display: flex; flex-direction: column; gap: 2px; border: 1px solid var(--line); border-radius: var(--r-2); padding: var(--sp-3); min-height: 120px; background: var(--card, var(--bg)); }
.cal-row { display: flex; align-items: center; gap: 8px; padding: 7px 8px; border-radius: var(--r-2); cursor: grab; font-size: var(--fs-sm); }
.cal-row:hover { background: var(--bg-soft, rgba(0,0,0,.04)); }
.cal-row.sel { outline: 1px solid var(--accent, #4a7bd6); }
.cal-row.done .cal-row-t { text-decoration: line-through; color: var(--muted); }
.cal-dot { width: 8px; height: 8px; border-radius: 50%; flex: 0 0 auto; }
.cal-row-t { flex: 1; min-width: 0; }
.cal-badge { color: var(--muted); font-size: var(--fs-xs); border: 1px solid var(--line); border-radius: 3px; padding: 0 5px; }
.cal-row-a { color: var(--muted); font-size: var(--fs-xs); }
.cal-row-p { color: var(--muted); font-size: var(--fs-xs); }

/* ---- 未排期 ---- */
.cal-undated { margin-top: var(--sp-3); border: 1px dashed var(--line); border-radius: var(--r-2); padding: 8px 10px; }
.cal-undated-h { display: block; color: var(--muted); font-size: var(--fs-xs); margin-bottom: 5px; }

/* ---- 详情 ---- */
.cal-detail { margin-top: var(--sp-3); border: 1px solid var(--line); border-radius: var(--r-2); background: var(--bg-soft, rgba(0,0,0,.03)); padding: var(--sp-3); }
.cal-detail-h { display: flex; align-items: center; gap: 8px; }
.cal-detail-h .cal-btn { margin-left: auto; }
.cal-meta { display: flex; flex-wrap: wrap; gap: var(--sp-3); color: var(--muted); font-size: var(--fs-xs); margin-top: 6px; }
.cal-desc { margin-top: 8px; font-size: var(--fs-sm); white-space: pre-wrap; line-height: 1.6; }
.cal-detail-actions { margin-top: 10px; display: flex; gap: var(--sp-2); }

.cal-foot { margin-top: var(--sp-3); color: var(--muted); font-size: var(--fs-xs); }
`

const MARK = 'data-privhub-calendar'
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
