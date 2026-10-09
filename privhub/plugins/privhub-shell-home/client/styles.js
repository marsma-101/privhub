/**
 * styles — 工作台的全部样式（import 即注入）。
 *
 * 全部类名带 `home-` 前缀；颜色/间距/字号/圆角一律走骨架令牌（FE-03 刻度层），
 * 因此两套主题自动跟随，不需要第二套配色。
 *
 * 注入写法照抄 admin-console 那套已验证的哨兵：同插件的模块可能被多次 import，
 * 但 `loadManifests()` 用的 `import()` 本身有模块缓存 —— 哨兵是保险，不是必需。
 *
 * @module privhub-shell-home/client/styles
 */

const CSS = `
/* ============ 工作台（首页）============ */
.home-wrap { max-width: 1080px; margin: 0 auto; padding: var(--sp-5) var(--sp-5) var(--sp-6); }

.home-hello { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.home-hello .big { font-size: var(--fs-xl); font-weight: 600; }
.home-time { color: var(--muted); font-size: var(--fs-sm); }
.home-sub { color: var(--muted); font-size: var(--fs-base); margin: 6px 0 var(--sp-4); }

/* 快捷入口（胶囊按钮行） */
.home-quick { display: flex; flex-wrap: wrap; gap: var(--sp-2); margin-bottom: var(--sp-5); }
.home-qbtn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: var(--r-pill);
  border: 1px solid var(--line); background: var(--panel2); color: var(--text);
  font-size: var(--fs-base); cursor: pointer;
}
.home-qbtn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-soft, #e7edf9); }
.home-qbtn:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }

/* 卡片栅格 */
.home-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--sp-4); align-items: start; }
.home-card {
  background: var(--panel2); border: 1px solid var(--line);
  border-radius: var(--r-4); box-shadow: var(--sh-1); overflow: hidden;
}
.home-card-h {
  display: flex; align-items: center; gap: var(--sp-2);
  padding: 12px 14px; border-bottom: 1px solid var(--line);
  font-size: var(--fs-base); font-weight: 600;
}
.home-card-h .more { margin-left: auto; font-size: var(--fs-sm); font-weight: 400; color: var(--accent); cursor: pointer; }
.home-card-h .more:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; border-radius: var(--r-1); }
.home-card-b { padding: 6px 8px 10px; }

/* 列表行 */
.home-row { display: flex; align-items: center; gap: var(--sp-2); padding: 6px 8px; border-radius: var(--r-2); font-size: var(--fs-base); cursor: pointer; }
.home-row:hover { background: var(--accent-soft, #e7edf9); }
.home-row:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.home-row .t { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.home-row .m { flex-shrink: 0; color: var(--muted); font-size: var(--fs-xs); }
.home-empty { padding: 16px 10px; text-align: center; color: var(--muted); font-size: var(--fs-sm); line-height: 1.7; }

/* 状态灯（AI 连接状态卡） */
.home-dot { width: 9px; height: 9px; border-radius: var(--r-full); flex: 0 0 9px; background: var(--muted); }
.home-dot.ok { background: var(--ok, #1f6b45); }
.home-dot.warn { background: var(--warn); }
.home-dot.bad { background: var(--danger); }
.home-kv { display: flex; gap: var(--sp-2); padding: 5px 8px; font-size: var(--fs-sm); }
.home-kv .k { flex: 0 0 76px; color: var(--muted); }
.home-kv .v { flex: 1; min-width: 0; word-break: break-all; }
.home-note { margin: 6px 8px 4px; padding: 8px 10px; border-radius: var(--r-2); background: var(--accent-soft, #e7edf9); color: var(--text); font-size: var(--fs-sm); line-height: 1.7; }
.home-note.bad { background: var(--danger-soft, #fbeaea); }
.home-acts { display: flex; gap: var(--sp-2); padding: 4px 8px 2px; flex-wrap: wrap; }
.home-acts .btn { width: auto; }
.home-badge { font-size: var(--fs-xs); padding: 2px 8px; border-radius: var(--r-pill); background: var(--ok-soft, #e2f1e8); color: var(--ok, #1f6b45); }
.home-badge.off { background: var(--accent-soft, #e7edf9); color: var(--muted); }
.home-badge.bad { background: var(--danger-soft, #fbeaea); color: var(--danger); }
.home-sep { height: 1px; background: var(--line); margin: 4px 12px; }
`

const MARK = 'data-privhub-shell-home'
if (!document.querySelector('style[' + MARK + ']')) {
  const el = document.createElement('style')
  el.setAttribute(MARK, '')
  el.textContent = CSS
  document.head.appendChild(el)
}
