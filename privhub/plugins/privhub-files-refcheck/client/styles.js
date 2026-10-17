/**
 * privhub-files-refcheck · styles —— 「引用检查」全部样式（import 即注入）
 *
 * 类名统一 `rc-` 前缀；颜色/间距/字号/圆角走骨架令牌（两套主题自动跟随）。
 * 注入写法与 shell-home / project-dashboard / task-calendar 一致：哨兵防重复 +
 * 无 DOM 沙箱保护（personal-ui 的测试沙箱没有 document，缺保护会在 import 阶段抛错）。
 *
 * @module privhub-files-refcheck/client/styles
 */

const CSS = `
/* ============ 引用检查 ============ */
/* 版式与任务看板/项目看板同一标准：整页铺满主区（不限宽、不居中），工具条钉顶、
 * 结果表落在有界滚动视口里、页脚贴底。直接挂在骨架 .main（flex column / overflow:hidden）下。 */
.rc-wrap {
  flex: 1 1 auto; min-height: 0; width: 100%;
  display: flex; flex-direction: column;
  padding: var(--sp-4) var(--sp-5) var(--sp-3);
}

/* 工具条：钉在结果上方，翻表时「开始扫描 / 导出」始终够得着 */
.rc-bar { display: flex; align-items: center; gap: var(--sp-2); flex-wrap: wrap; padding: 4px 0 var(--sp-3); border-bottom: 1px solid var(--line); margin-bottom: var(--sp-3); }
.rc-title { font-size: var(--fs-lg); font-weight: 600; margin-right: 4px; }
.rc-label { color: var(--muted); font-size: var(--fs-sm); }
.rc-sel { padding: 4px 8px; border: 1px solid var(--line); border-radius: var(--r-2); background: var(--bg); color: var(--text); font-size: var(--fs-sm); max-width: 240px; }
.rc-check { display: inline-flex; align-items: center; gap: 4px; color: var(--muted); font-size: var(--fs-sm); cursor: pointer; }
.rc-right { margin-left: auto; display: flex; gap: var(--sp-2); }
.rc-btn { padding: 5px 12px; border: 1px solid var(--line); border-radius: var(--r-2); background: var(--bg); color: var(--text); cursor: pointer; font-size: var(--fs-sm); }
.rc-btn:hover:not(:disabled) { border-color: var(--accent, #4a7bd6); }
.rc-btn:disabled { opacity: .5; cursor: default; }
.rc-primary { background: var(--accent, #4a7bd6); border-color: var(--accent, #4a7bd6); color: #fff; }
.rc-primary:hover:not(:disabled) { filter: brightness(1.06); }

.rc-hint { max-width: 720px; padding: var(--sp-4) 0; color: var(--text); font-size: var(--fs-sm); line-height: 1.8; }
.rc-hint ul { margin: 6px 0 10px 18px; }
.rc-hint li { margin: 4px 0; }
.rc-hint code, .rc-muted code { background: var(--bg-soft, rgba(0,0,0,.06)); padding: 0 4px; border-radius: 3px; }
.rc-muted { color: var(--muted); font-size: var(--fs-xs); }
.rc-err { padding: var(--sp-5); text-align: center; color: var(--danger); }
.rc-suppress { margin: 0 0 var(--sp-2); }
/* 未扫描的说明 / 出错是 .rc-wrap 的直系子元素：吃掉工具条与页脚之外的高度 */
.rc-wrap > .rc-hint, .rc-wrap > .rc-err { flex: 1; }
.rc-wrap > .rc-err { display: grid; place-content: center; }

/* 结果区 = 本页唯一的滚动视口（工具条与页脚在它之外，不随滚动消失）。
 * flex:1 + min-height:0 缺一不可（缺 min-height:0 时 flex 项不肯比内容矮、滚动条被顶出屏幕）。 */
.rc-body { flex: 1; min-height: 0; overflow: auto; padding-bottom: var(--sp-1); }

.rc-stats { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: var(--sp-2); }
.rc-chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 9px; border: 1px solid var(--line); border-radius: 999px; font-size: var(--fs-xs); color: var(--muted); }
.rc-chip b { color: var(--text); font-weight: 600; }
.rc-chip-bad b { color: var(--danger, #d05a5a); }
.rc-chip-dim { opacity: .8; }
.rc-warn { margin: 0 0 var(--sp-2); padding: 6px 10px; border: 1px solid var(--warn, #c07a2b); border-radius: var(--r-2); color: var(--warn, #c07a2b); font-size: var(--fs-xs); }

.rc-tabs { display: flex; align-items: center; gap: 6px; margin-bottom: var(--sp-2); }
.rc-tab { padding: 5px 12px; border: 1px solid var(--line); border-radius: var(--r-2); background: var(--bg); color: var(--text); cursor: pointer; font-size: var(--fs-sm); }
.rc-tab.on { background: var(--accent, #4a7bd6); border-color: var(--accent, #4a7bd6); color: #fff; }
.rc-filter { margin-left: auto; width: 240px; padding: 4px 8px; border: 1px solid var(--line); border-radius: var(--r-2); background: var(--bg); color: var(--text); font-size: var(--fs-sm); }

.rc-tablewrap { border: 1px solid var(--line); border-radius: var(--r-2); overflow: hidden; }
.rc-table { width: 100%; border-collapse: collapse; font-size: var(--fs-sm); }
.rc-table th { text-align: left; padding: 7px 10px; background: var(--bg-soft, rgba(0,0,0,.04)); color: var(--muted); font-weight: 500; font-size: var(--fs-xs); border-bottom: 1px solid var(--line); }
.rc-table td { padding: 6px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
.rc-table tr:last-child td { border-bottom: 0; }
.rc-table tbody tr:hover td { background: var(--bg-soft, rgba(0,0,0,.03)); }
.rc-path { cursor: pointer; word-break: break-all; }
.rc-path:hover { color: var(--accent, #4a7bd6); text-decoration: underline; }
.rc-proj { display: inline-block; margin-right: 5px; padding: 0 5px; border: 1px solid var(--line); border-radius: 3px; color: var(--muted); font-size: var(--fs-xs); }
.rc-target { word-break: break-all; color: var(--muted); }
.rc-num-col { width: 120px; white-space: nowrap; }
.rc-dim { color: var(--muted); }
.rc-empty { text-align: center; color: var(--muted); padding: var(--sp-5) 0; }
.rc-more { padding: 8px 10px; color: var(--muted); font-size: var(--fs-xs); background: var(--bg-soft, rgba(0,0,0,.03)); }

/* 页脚：钉在 .rc-wrap 底部（在滚动视口之外），不随结果表滚走 */
.rc-foot { margin-top: var(--sp-3); padding-top: var(--sp-2); border-top: 1px solid var(--line); color: var(--muted); font-size: var(--fs-xs); }

@media (max-width: 720px) {
  .rc-filter { margin-left: 0; width: 100%; }
  .rc-right { margin-left: 0; }
  .rc-num-col { width: auto; }
}
`

const MARK = 'data-privhub-refcheck'
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
