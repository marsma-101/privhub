/**
 * nav-styles — L2 项目层导航 + L1 层级条 + 个人层的样式（import 即注入）
 *
 * 全部走骨架的设计令牌（--accent / --panel / --line / --sp-* / --r-* / --fs-*），
 * 深浅两套主题自动跟随 [data-theme]，本文件不自造第二套配色。
 * 唯一的例外是层级条的三条语义色带（L1 总览 / L2 项目 / L3 管理），
 * 它们表达「你在哪一层」，用 accent / warn / muted 三档区分，不新增色相。
 *
 * @module privhub-shell/client/nav-styles
 */

const ID = 'privhub-shell-nav'
if (typeof document !== 'undefined' && !document.getElementById(ID)) {
  const el = document.createElement('style')
  el.id = ID
  el.textContent = `
/* ══════════ 层级条：告诉人「你在哪一层」，并给出一键回上一层 ══════════ */
.lbar {
  display: flex; align-items: center; gap: var(--sp-2);
  padding: 0 var(--sp-3); height: 34px; flex: 0 0 auto;
  border-bottom: 1px solid var(--line);
  background: linear-gradient(90deg, var(--accent-soft) 0%, transparent 42%);
  font-size: var(--fs-xs); color: var(--muted);
}
.lbar-step {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px; border-radius: var(--r-pill);
  border: 1px solid transparent; background: transparent;
  color: var(--muted); font-size: var(--fs-xs); cursor: pointer;
  transition: color .16s, background .16s, border-color .16s;
}
.lbar-step:hover { color: var(--text); background: var(--accent-soft-2); }
.lbar-step.on {
  color: var(--accent); background: var(--panel);
  border-color: var(--line); box-shadow: var(--sh-1); cursor: default;
}
.lbar-step:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.lbar-step[disabled] { opacity: .55; cursor: not-allowed; }
.lbar-sep { color: var(--line); user-select: none; }
.lbar-cur { color: var(--text); font-weight: 600; }
.lbar-right { margin-left: auto; display: flex; align-items: center; gap: var(--sp-2); }
.lbar-hint { color: var(--muted); font-size: var(--fs-nano); }
/* 管理层用暖色带区分：它是「配置系统」不是「干活」，误入的代价更高 */
.lbar.admin { background: linear-gradient(90deg, var(--warn-soft) 0%, transparent 42%); }
.lbar.admin .lbar-step.on { color: var(--warn); }

/* ══════════ L2 项目层：固定主 tab + 「更多」抽屉 ══════════ */
.pnav {
  flex: 0 0 auto; border-bottom: 1px solid var(--line);
  background: var(--panel);
}
.pnav-row {
  display: flex; align-items: center; gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3); flex-wrap: wrap;
}
.pnav-tabs { display: flex; align-items: center; gap: var(--sp-1); }
.pnav-tab {
  position: relative; display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: var(--r-2);
  border: 1px solid transparent; background: transparent;
  color: var(--muted); font-size: var(--fs-sm); cursor: pointer;
  transition: color .16s, background .16s, border-color .16s, box-shadow .16s;
}
.pnav-tab:hover { color: var(--text); background: var(--accent-soft-2); }
.pnav-tab.on {
  color: var(--accent); background: var(--accent-soft);
  border-color: var(--accent-select); box-shadow: var(--sh-1);
}
/* 选中态除了颜色还有**底部实条**：去掉颜色也认得出当前 tab */
.pnav-tab.on::after {
  content: ''; position: absolute; left: 12px; right: 12px; bottom: -1px; height: 2px;
  border-radius: var(--r-full); background: var(--accent);
}
.pnav-tab:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.pnav-ico { font-size: var(--fs-base); line-height: 1; }
.pnav-label { font-weight: 600; }
.pnav-badge {
  min-width: 16px; height: 16px; padding: 0 4px; border-radius: var(--r-full);
  background: var(--danger); color: #fff; font-size: var(--fs-nano); line-height: 16px; text-align: center;
}
.pnav-badge.sm { min-width: 14px; height: 14px; line-height: 14px; }
.pnav-caret { font-size: 10px; transition: transform .18s; }
.pnav-caret.open { transform: rotate(180deg); }
.pnav-dot {
  position: absolute; top: 5px; right: 6px; width: 5px; height: 5px;
  border-radius: var(--r-full); background: var(--accent);
}
/* 文件族子入口：只在文件 tab 下出现 */
.pnav-subs { display: flex; align-items: center; gap: var(--sp-1); margin-left: auto; flex-wrap: wrap; }
.pnav-sub {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 10px; border-radius: var(--r-1);
  border: 1px solid var(--line); background: var(--bg);
  color: var(--muted); font-size: var(--fs-xs); cursor: pointer;
  transition: color .16s, background .16s, border-color .16s;
}
.pnav-sub:hover { color: var(--text); border-color: var(--accent-select); }
.pnav-sub.on { color: var(--accent); background: var(--accent-soft); border-color: var(--accent-select); }
.pnav-sub:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }

/* 「更多」抽屉：低频功能的新家，一条不删 */
.pnav-drawer {
  border-top: 1px dashed var(--line);
  padding: var(--sp-3);
  background: linear-gradient(180deg, var(--accent-soft) 0%, transparent 60%);
  animation: pnav-in .18s cubic-bezier(.4, 0, .2, 1);
}
@keyframes pnav-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
.pnav-grp { margin-bottom: var(--sp-3); }
.pnav-grp:last-of-type { margin-bottom: var(--sp-2); }
.pnav-grp-h {
  display: flex; align-items: center; gap: 6px; margin-bottom: var(--sp-2);
  font-size: var(--fs-xs); color: var(--muted); font-weight: 600;
}
.pnav-grp-n {
  padding: 0 6px; border-radius: var(--r-full);
  background: var(--panel2); color: var(--muted); font-size: var(--fs-nano);
}
.pnav-grp-b { display: grid; grid-template-columns: repeat(auto-fill, minmax(232px, 1fr)); gap: var(--sp-2); }
.pnav-item {
  display: grid; grid-template-columns: 24px 1fr; grid-template-rows: auto auto;
  gap: 2px var(--sp-2); align-items: center; text-align: left;
  padding: var(--sp-2) var(--sp-3); border-radius: var(--r-2);
  border: 1px solid var(--line); background: var(--panel);
  color: var(--text); cursor: pointer;
  transition: border-color .16s, box-shadow .16s, transform .16s;
}
.pnav-item:hover { border-color: var(--accent-select); box-shadow: var(--sh-2); transform: translateY(-1px); }
.pnav-item.on { border-color: var(--accent); background: var(--accent-soft); }
.pnav-item:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.pnav-item-ico { grid-row: 1 / span 2; font-size: var(--fs-md); text-align: center; }
.pnav-item-t { font-size: var(--fs-sm); font-weight: 600; }
.pnav-item-d {
  font-size: var(--fs-nano); color: var(--muted); line-height: 1.5;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.pnav-drawer-foot {
  display: flex; align-items: center; gap: var(--sp-2);
  padding-top: var(--sp-2); border-top: 1px solid var(--line);
  font-size: var(--fs-nano); color: var(--muted);
}
.pnav-link {
  margin-left: auto; border: none; background: none; padding: 0;
  color: var(--accent); font-size: var(--fs-xs); cursor: pointer; text-decoration: underline;
}
.pnav-link:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: var(--r-1); }

/* ══════════ 个人层：我的（任务 / 日程 / 文件 / 偏好） ══════════ */
.me-root { flex: 1 1 auto; min-height: 0; width: 100%; overflow: auto; padding: var(--sp-4); }
.me-head { display: flex; align-items: baseline; gap: var(--sp-3); margin-bottom: var(--sp-3); flex-wrap: wrap; }
.me-head .big { font-size: var(--fs-lg); font-weight: 700; color: var(--text); }
.me-head .sub { font-size: var(--fs-xs); color: var(--muted); }
.me-tabs { display: flex; gap: var(--sp-1); margin-bottom: var(--sp-3); flex-wrap: wrap; }
.me-tab {
  position: relative; display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: var(--r-2);
  border: 1px solid var(--line); background: var(--panel);
  color: var(--muted); font-size: var(--fs-sm); cursor: pointer;
  transition: color .16s, background .16s, border-color .16s;
}
.me-tab:hover { color: var(--text); border-color: var(--accent-select); }
.me-tab.on { color: var(--accent); background: var(--accent-soft); border-color: var(--accent-select); font-weight: 600; }
.me-tab.on::after {
  content: ''; position: absolute; left: 12px; right: 12px; bottom: -1px; height: 2px;
  border-radius: var(--r-full); background: var(--accent);
}
.me-tab:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.me-panel {
  border: 1px solid var(--line); border-radius: var(--r-3);
  background: var(--panel); padding: var(--sp-4); box-shadow: var(--sh-1);
}
.me-panel-h { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-3); flex-wrap: wrap; }
.me-panel-h .t { font-size: var(--fs-base); font-weight: 700; color: var(--text); }
.me-panel-h .n { font-size: var(--fs-xs); color: var(--muted); }
.me-state { padding: var(--sp-4); text-align: center; color: var(--muted); font-size: var(--fs-sm); line-height: 1.9; }
.me-state.bad { color: var(--danger); }
.me-rows { display: flex; flex-direction: column; gap: var(--sp-1); }
.me-row {
  display: grid; grid-template-columns: 1fr auto auto; gap: var(--sp-2); align-items: center;
  padding: var(--sp-2) var(--sp-3); border-radius: var(--r-2);
  border: 1px solid transparent; background: var(--bg); cursor: pointer; text-align: left;
  transition: border-color .16s, background .16s;
}
.me-row:hover { border-color: var(--accent-select); background: var(--accent-soft-2); }
.me-row:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.me-row .t { font-size: var(--fs-sm); color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.me-row .p { font-size: var(--fs-nano); color: var(--muted); }
.me-row .d { font-size: var(--fs-nano); padding: 2px 7px; border-radius: var(--r-pill); background: var(--panel2); color: var(--muted); }
.me-row .d.late { background: var(--danger-soft); color: var(--danger); font-weight: 600; }
.me-row .d.today { background: var(--warn-soft); color: var(--warn); font-weight: 600; }
.me-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--sp-2); }
.me-card {
  display: flex; flex-direction: column; gap: 4px; text-align: left;
  padding: var(--sp-3); border-radius: var(--r-2);
  border: 1px solid var(--line); background: var(--bg); cursor: pointer;
  transition: border-color .16s, box-shadow .16s, transform .16s;
}
.me-card:hover { border-color: var(--accent-select); box-shadow: var(--sh-2); transform: translateY(-1px); }
.me-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.me-card .k { font-size: var(--fs-nano); color: var(--muted); }
.me-card .v { font-size: var(--fs-md); font-weight: 700; color: var(--text); }
.me-card .h { font-size: var(--fs-nano); color: var(--muted); }
.me-pref { display: flex; align-items: center; gap: var(--sp-3); padding: var(--sp-2) 0; flex-wrap: wrap; }
.me-pref .k { font-size: var(--fs-sm); color: var(--text); min-width: 96px; }
.me-pref .v { font-size: var(--fs-xs); color: var(--muted); }
.me-note { margin-top: var(--sp-3); font-size: var(--fs-nano); color: var(--muted); line-height: 1.8; }
.me-scroll { max-height: 420px; overflow: auto; }

/* 窄屏：tab 文案收起为图标 + 短标签，子入口换行不挤压 */
@media (max-width: 720px) {
  .pnav-row { gap: var(--sp-2); }
  .pnav-tab { padding: 6px 10px; }
  .pnav-subs { margin-left: 0; width: 100%; }
  .pnav-grp-b { grid-template-columns: 1fr; }
  .me-root { padding: var(--sp-3); }
  .lbar-hint { display: none; }
}
`
  document.head.appendChild(el)
}

export default true