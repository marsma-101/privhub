/**
 * styles — 管理控制台的全部样式（import 即注入）。
 *
 * 全部类名带 `ad-` 前缀，且样式作用域限定在 `.admin-root` 之内，
 * 不会影响骨架与其它插件的界面；卸载本插件时样式一并消失。
 *
 * 变量统一用 `--admin-*` 前缀（需求里的视觉规范），值映射到主题变量，
 * 因此暗色模式自动跟随，无需第二套配色。
 *
 * @module privhub-admin-console/client/styles
 */

const CSS = `
/* ============ 变量（管理后台专用；值映射主题变量，暗色自动跟随） ============ */
.admin-root {
  --admin-sidebar-w: 240px;
  --admin-sidebar-collapsed-w: 64px;
  --admin-topbar-h: 56px;
  --admin-bg: var(--bg, #f7f8fa);
  --admin-card-bg: var(--panel2, #fff);
  --admin-border: var(--line, #e5e7eb);
  --admin-text: var(--text, #111827);
  --admin-text-muted: var(--muted, #6b7280);
  --admin-primary: var(--accent, #4a7bd6);
  --admin-danger: var(--danger, #dc2626);
  --admin-warn: var(--warn, #c07a2b);
  --admin-radius: 8px;
  --admin-gap: 16px;
  --admin-row-h: 40px;
  --admin-primary-soft: rgba(90, 130, 200, .14);
  --admin-shadow: 0 1px 2px rgba(0, 0, 0, .06), 0 2px 8px rgba(0, 0, 0, .04);

  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  font-size: 13px;
  color: var(--admin-text);
  background: var(--admin-bg);
}

/* ============ 顶部栏 ============ */
.ad-topbar {
  flex: 0 0 var(--admin-topbar-h);
  height: var(--admin-topbar-h);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  background: var(--admin-card-bg);
  border-bottom: 1px solid var(--admin-border);
}
.ad-drawer-btn { display: none; }
.ad-iconbtn {
  flex: 0 0 auto;
  width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--admin-border); border-radius: 6px;
  background: transparent; color: var(--admin-text-muted);
  font-size: 13px; cursor: pointer;
}
.ad-iconbtn:hover { color: var(--admin-primary); border-color: var(--admin-primary); }

/* 面包屑 */
.ad-crumb { display: flex; align-items: center; gap: 6px; font-size: 13px; min-width: 0; }
.ad-crumb-item { color: var(--admin-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; }
.ad-crumb-item.linkable { cursor: pointer; }
.ad-crumb-item.linkable:hover { color: var(--admin-primary); text-decoration: underline; }
.ad-crumb-item.on { color: var(--admin-text); font-weight: 600; }
.ad-crumb-sep { color: var(--admin-border); }

/* 全局搜索（第一阶段只做 UI） */
.ad-search {
  flex: 1 1 auto; max-width: 420px; margin: 0 auto;
  display: flex; align-items: center; gap: 6px;
  padding: 0 10px; height: 32px;
  background: var(--admin-bg);
  border: 1px solid var(--admin-border); border-radius: 16px;
}
.ad-search:focus-within { border-color: var(--admin-primary); }
.ad-search-icon { font-size: 12px; opacity: .7; }
.ad-search-input {
  flex: 1; min-width: 0; border: none; outline: none; background: transparent;
  color: var(--admin-text); font-size: 13px;
}
.ad-topbar-right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.ad-role-badge { font-size: 12px; padding: 3px 10px; border-radius: 20px; background: var(--admin-primary-soft); color: var(--admin-primary); white-space: nowrap; }
.ad-role-badge.admin { background: rgba(192, 122, 43, .16); color: var(--admin-warn); }
.ad-me { display: flex; align-items: center; gap: 7px; min-width: 0; }
.ad-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--admin-primary); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 600;
}
.ad-me-name { font-size: 13px; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ============ 主体：侧栏 + 内容 ============ */
.ad-body { flex: 1; min-height: 0; display: flex; position: relative; }

.ad-side {
  flex: 0 0 var(--admin-sidebar-w);
  width: var(--admin-sidebar-w);
  display: flex; flex-direction: column;
  background: var(--admin-card-bg);
  border-right: 1px solid var(--admin-border);
  overflow: hidden;
  transition: width .16s ease, flex-basis .16s ease;
}
.admin-root.side-collapsed .ad-side {
  flex-basis: var(--admin-sidebar-collapsed-w);
  width: var(--admin-sidebar-collapsed-w);
}
.ad-side-head {
  flex: 0 0 auto; height: 44px;
  display: flex; align-items: center; gap: 8px;
  padding: 0 12px; border-bottom: 1px solid var(--admin-border);
}
.ad-side-logo { font-size: 15px; }
.ad-side-title { font-size: 13px; font-weight: 600; white-space: nowrap; }
.ad-side-close { display: none; margin-left: auto; }
.ad-side-body { flex: 1; min-height: 0; overflow-y: auto; padding: 8px 8px 12px; }
.ad-side-foot {
  flex: 0 0 auto; padding: 8px 12px;
  border-top: 1px solid var(--admin-border);
  color: var(--admin-text-muted); font-size: 11px;
}
.admin-root.side-collapsed .ad-side-foot { display: none; }

.ad-group { margin-bottom: 10px; }
.ad-group-title {
  display: flex; align-items: center; gap: 7px;
  padding: 6px 8px 4px;
  font-size: 11px; letter-spacing: .06em;
  color: var(--admin-text-muted); white-space: nowrap;
}
.ad-group-text { overflow: hidden; }
.admin-root.side-collapsed .ad-group-text { display: none; }

.ad-nav-item {
  display: flex; align-items: center; gap: 9px;
  height: 34px; padding: 0 8px; margin-bottom: 2px;
  border-radius: 6px; cursor: pointer;
  border-left: 3px solid transparent;
  color: var(--admin-text); white-space: nowrap;
  transition: background .12s, color .12s;
}
.ad-nav-item:hover { background: var(--admin-bg); }
.ad-nav-item.on {
  background: var(--admin-primary-soft);
  border-left-color: var(--admin-primary);
  color: var(--admin-primary); font-weight: 600;
}
.ad-nav-item.pending { color: var(--admin-text-muted); }
.ad-nav-icon { flex: 0 0 18px; text-align: center; font-size: 13px; }
.ad-nav-text { flex: 1; overflow: hidden; text-overflow: ellipsis; font-size: 13px; }
.ad-nav-pending {
  font-size: 10px; padding: 1px 5px; border-radius: 8px;
  background: rgba(128, 128, 128, .14); color: var(--admin-text-muted);
}
.admin-root.side-collapsed .ad-nav-text,
.admin-root.side-collapsed .ad-nav-pending { display: none; }
.admin-root.side-collapsed .ad-nav-item { justify-content: center; padding: 0; }

.ad-drawer-mask { display: none; }

/* ============ 内容区 ============ */
.ad-content { flex: 1; min-width: 0; min-height: 0; overflow: auto; }
.ad-content-inner {
  max-width: 1440px;
  min-height: 100%;
  padding: var(--admin-gap);
  display: flex; flex-direction: column; gap: 12px;
}
.ad-sh { display: flex; flex-direction: column; gap: 10px; }
.ad-sh-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ad-sh-title { font-size: 15px; font-weight: 600; }
.ad-sh-meta { font-size: 12px; color: var(--admin-text-muted); }
.ad-sh-actions { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.ad-detail-toggle { display: none; }

.ad-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--admin-border); }
.ad-tab {
  padding: 7px 14px; font-size: 13px; cursor: pointer;
  color: var(--admin-text-muted); border-bottom: 2px solid transparent;
}
.ad-tab:hover { color: var(--admin-text); }
.ad-tab.on { color: var(--admin-primary); border-bottom-color: var(--admin-primary); }
.ad-tab-badge {
  margin-left: 5px; font-size: 11px; padding: 0 6px; border-radius: 9px;
  background: var(--admin-primary-soft); color: var(--admin-primary);
}

/* 视图容器：白卡片承载既有管理界面 */
.ad-view {
  flex: 1; min-height: 0;
  background: var(--admin-card-bg);
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius);
  box-shadow: var(--admin-shadow);
  overflow: auto;
  display: flex; flex-direction: column;
}
/* 既有管理面板（用户管理/权限/审计/标签/模板/回收站/设置/智能体接入）自带
 * 页面级外壳与「关闭」按钮 —— 在外壳里导航由侧栏负责，这些按钮没有意义，
 * 这里统一隐藏；面板内部结构与业务逻辑原封不动。 */
.ad-view .view-inner > .modal-foot { display: none; }
.ad-view .view-page { height: auto; }
.ad-view .view-inner { width: 100%; max-width: none; height: auto; }
.ad-view input, .ad-view select, .ad-view textarea { font-family: inherit; }

.ad-panel { padding: 14px 16px 18px; display: flex; flex-direction: column; gap: 12px; min-height: 0; }

/* 既有视图（回收站等）自带「整页三段式」外壳：在外壳内容区里改为占满卡片。
 * 只调整容器高度与内边距，不动它们内部任何业务结构与样式。 */
.ad-view .main-head { flex: 0 0 auto; border-bottom: 1px solid var(--admin-border); padding: 10px 14px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ad-view .main-body { flex: 1; min-height: 0; overflow: auto; padding: 0; }
.ad-view .main-body .empty { padding: 40px 20px; text-align: center; color: var(--admin-text-muted); line-height: 1.9; }

/* ============ 按钮三档 ============ */
.ad-btn {
  padding: 6px 12px; font-size: 13px; border-radius: 6px; cursor: pointer;
  border: 1px solid var(--admin-border);
  background: var(--admin-card-bg); color: var(--admin-text);
  transition: border-color .12s, color .12s, filter .12s;
  white-space: nowrap;
}
.ad-btn:hover { border-color: var(--admin-primary); color: var(--admin-primary); }
.ad-btn:disabled { opacity: .5; cursor: not-allowed; }
.ad-btn:disabled:hover { border-color: var(--admin-border); color: var(--admin-text); }
.ad-btn-sm { padding: 4px 10px; font-size: 12px; }
.ad-btn-primary { background: var(--admin-primary); border-color: var(--admin-primary); color: #fff; }
.ad-btn-primary:hover { color: #fff; filter: brightness(1.08); }
.ad-btn-danger { background: transparent; border-color: var(--admin-danger); color: var(--admin-danger); }
.ad-btn-danger:hover { background: var(--admin-danger); color: #fff; border-color: var(--admin-danger); }

.ad-input {
  padding: 7px 10px; font-size: 13px; border-radius: 6px;
  border: 1px solid var(--admin-border);
  background: var(--admin-bg); color: var(--admin-text); outline: none;
}
.ad-input:focus { border-color: var(--admin-primary); }
.ad-filterbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ad-filterbar .ad-input { min-width: 220px; }
.ad-check { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--admin-text-muted); cursor: pointer; }
.ad-dim { font-size: 12px; color: var(--admin-text-muted); }

/* ============ 概览卡片 ============ */
.ad-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
.ad-card {
  background: var(--admin-card-bg);
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius);
  padding: 12px 14px;
  box-shadow: var(--admin-shadow);
}
.ad-card-clickable { cursor: pointer; }
.ad-card-clickable:hover { border-color: var(--admin-primary); }
.ad-card-top { display: flex; align-items: center; gap: 7px; }
.ad-card-icon { font-size: 14px; }
.ad-card-label { font-size: 12.5px; color: var(--admin-text-muted); }
.ad-card-value { font-size: 24px; font-weight: 600; margin: 6px 0 4px; }
.ad-card-hint { font-size: 11.5px; color: var(--admin-text-muted); line-height: 1.6; }
.ad-hint-block {
  margin-top: 4px; padding: 10px 12px;
  font-size: 12px; line-height: 1.8; color: var(--admin-text-muted);
  background: var(--admin-bg);
  border: 1px solid var(--admin-border); border-radius: var(--admin-radius);
}
.ad-hint-block code, .ad-warn-block code { font-family: ui-monospace, Consolas, monospace; }
.ad-warn-block {
  margin-top: 8px; padding: 8px 10px; font-size: 12px; line-height: 1.7;
  color: var(--admin-warn);
  background: rgba(192, 122, 43, .1);
  border: 1px solid rgba(192, 122, 43, .3); border-radius: 6px;
}

/* 只读信息卡（备份 / 水印） */
.ad-section-card {
  background: var(--admin-card-bg);
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius);
  padding: 12px 14px;
}
.ad-section-card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.ad-section-card-title { font-size: 13px; font-weight: 600; }
.ad-section-card-head .ad-btn { margin-left: auto; }
.ad-kv { display: flex; gap: 10px; padding: 5px 0; font-size: 12.5px; align-items: baseline; }
.ad-kv-k { flex: 0 0 150px; color: var(--admin-text-muted); }
.ad-kv-v { flex: 1; word-break: break-all; line-height: 1.7; }
.ad-chip { font-size: 11.5px; padding: 1px 9px; border-radius: 10px; }
.ad-chip.on { color: #3f9d63; background: rgba(63, 157, 99, .14); }
.ad-chip.off { color: var(--admin-text-muted); background: rgba(128, 128, 128, .14); }

/* ============ 数据表 ============ */
.ad-table-wrap { overflow: auto; border: 1px solid var(--admin-border); border-radius: var(--admin-radius); }
.ad-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ad-table th, .ad-table td { padding: 0 10px; height: var(--admin-row-h); text-align: left; border-bottom: 1px solid var(--admin-border); }
.ad-table th { font-size: 12px; font-weight: 500; color: var(--admin-text-muted); background: var(--admin-bg); position: sticky; top: 0; z-index: 1; }
.ad-table tbody tr:last-child td { border-bottom: none; }
.ad-table tbody tr:hover td { background: var(--admin-bg); }
.ad-table tbody tr.on td { background: var(--admin-primary-soft); }
.ad-table tbody tr.clickable { cursor: pointer; }
.ad-table td.nowrap, .ad-table th.nowrap { white-space: nowrap; }
.ad-th-check, .ad-td-check { width: 36px; }
.ad-table-empty { text-align: center; color: var(--admin-text-muted); height: 80px; }

/* ============ 空 / 加载 / 错误 ============ */
.ad-empty {
  flex: 1; min-height: 200px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; padding: 36px 20px; text-align: center;
}
.ad-empty-icon { font-size: 30px; opacity: .8; }
.ad-empty-title { font-size: 14px; font-weight: 600; }
.ad-empty-desc { font-size: 12.5px; color: var(--admin-text-muted); max-width: 460px; line-height: 1.8; }
.ad-empty-hint { font-size: 11.5px; color: var(--admin-text-muted); max-width: 460px; line-height: 1.7; opacity: .85; }

.ad-skeleton { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.ad-skeleton.is-grid { flex-direction: row; flex-wrap: wrap; }
.ad-skeleton.is-grid .ad-sk-item { flex: 1 1 180px; }
.ad-sk-item { display: flex; flex-direction: column; gap: 7px; }
.ad-sk-bar {
  height: 12px; border-radius: 6px;
  background: linear-gradient(90deg, var(--admin-border) 25%, var(--admin-bg) 37%, var(--admin-border) 63%);
  background-size: 400% 100%;
  animation: ad-shimmer 1.4s ease infinite;
}
.ad-sk-bar.w40 { width: 40%; }
.ad-sk-bar.w55 { width: 55%; }
.ad-sk-bar.w70 { width: 70%; }
@keyframes ad-shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }

.ad-error {
  margin: 14px; padding: 12px 14px;
  display: flex; align-items: flex-start; gap: 10px;
  border: 1px solid var(--admin-danger); border-radius: var(--admin-radius);
  background: rgba(208, 90, 90, .07);
}
.ad-error-icon { font-size: 16px; }
.ad-error-body { flex: 1; min-width: 0; }
.ad-error-title { font-size: 13px; font-weight: 600; color: var(--admin-danger); }
.ad-error-detail { margin-top: 4px; font-size: 12px; color: var(--admin-text-muted); line-height: 1.7; }

/* ============ 批量操作栏 ============ */
.ad-bulk {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 8px 12px;
  background: var(--admin-primary-soft);
  border: 1px solid var(--admin-primary);
  border-radius: var(--admin-radius);
}
.ad-bulk-count { font-size: 12.5px; font-weight: 600; color: var(--admin-primary); }
.ad-bulk-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ad-bulk .ad-btn:last-child { margin-left: auto; }

/* ============ 列表-详情容器 ============ */
.ad-ld { flex: 1; min-height: 0; display: flex; }
.ad-ld.dragging { user-select: none; cursor: col-resize; }
.ad-ld-list {
  flex: 0 0 auto; min-width: 0;
  display: flex; flex-direction: column;
  border-right: 1px solid var(--admin-border);
  overflow: auto;
}
.ad-ld-grip { flex: 0 0 4px; cursor: col-resize; background: transparent; transition: background .15s; }
.ad-ld-grip:hover { background: var(--admin-primary); opacity: .45; }
.ad-ld-detail { flex: 1; min-width: 0; display: flex; flex-direction: column; overflow: auto; }
.ad-ld-backbar { display: none; padding: 8px 10px; border-bottom: 1px solid var(--admin-border); }

/* 列表项：主标题 / 副标题 / 状态徽章 / 最近更新；选中态浅主色 + 左侧主色条 */
.ad-li {
  display: flex; flex-direction: column; gap: 3px;
  padding: 8px 10px; cursor: pointer;
  border-left: 3px solid transparent;
  border-bottom: 1px solid var(--admin-border);
}
.ad-li:hover { background: var(--admin-bg); }
.ad-li.on { background: var(--admin-primary-soft); border-left-color: var(--admin-primary); }
.ad-li-top { display: flex; align-items: center; gap: 6px; }
.ad-li-title { font-size: 13px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ad-li-sub { font-size: 12px; color: var(--admin-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ad-li-foot { display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: var(--admin-text-muted); }
.ad-li-badge { font-size: 11px; padding: 0 7px; border-radius: 9px; background: var(--admin-primary-soft); color: var(--admin-primary); }
.ad-listpane { flex: 1; min-height: 0; overflow: auto; outline: none; }
.ad-listpane:focus-visible { box-shadow: inset 0 0 0 2px var(--admin-primary-soft); }
.ad-ld-hint { padding: 26px 14px; text-align: center; font-size: 12.5px; color: var(--admin-text-muted); }

/* 详情区（右侧） */
.ad-detail-body { padding: 14px 16px 18px; display: flex; flex-direction: column; gap: 4px; }
.ad-detail-title { font-size: 14px; font-weight: 600; word-break: break-all; }
.ad-detail-sub { font-size: 12px; color: var(--admin-text-muted); margin-bottom: 10px; word-break: break-all; }
.ad-detail-actions { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
.ad-detail-actions .ad-btn { text-decoration: none; display: inline-flex; align-items: center; }
.ad-danger-zone {
  margin-top: 18px; padding: 12px 14px;
  border: 1px solid var(--admin-danger); border-radius: var(--admin-radius);
  background: rgba(208, 90, 90, .06);
}
.ad-danger-title { font-size: 12.5px; font-weight: 600; color: var(--admin-danger); }
.ad-danger-desc { font-size: 12px; color: var(--admin-text-muted); line-height: 1.7; margin: 4px 0 10px; }

/* ============ 确认弹窗 ============ */
.ad-mask {
  position: fixed; inset: 0; z-index: 1300;
  background: rgba(0, 0, 0, .42);
  display: flex; align-items: center; justify-content: center;
}
.ad-dialog {
  width: 460px; max-width: 92vw; max-height: 86vh;
  display: flex; flex-direction: column;
  background: var(--admin-card-bg);
  border: 1px solid var(--admin-border); border-radius: var(--admin-radius);
  box-shadow: 0 16px 50px rgba(0, 0, 0, .3);
  padding: 18px;
}
.ad-dialog.danger { border-color: var(--admin-danger); }
.ad-dialog-head { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; }
.ad-dialog-icon { font-size: 16px; }
.ad-dialog-title { min-width: 0; }
.ad-dialog-body { margin-top: 12px; font-size: 13px; line-height: 1.8; overflow: auto; }
.ad-dialog-msg { color: var(--admin-text); }
.ad-dialog-detail {
  margin-top: 8px; padding: 8px 10px; font-size: 12px;
  color: var(--admin-text-muted); background: var(--admin-bg);
  border: 1px solid var(--admin-border); border-radius: 6px; word-break: break-all;
}
.ad-dialog-req { margin-top: 12px; }
.ad-dialog-req-hint { font-size: 12px; color: var(--admin-text-muted); margin-bottom: 6px; }
.ad-dialog-req .ad-input { width: 100%; }
.ad-dialog-foot { margin-top: 16px; display: flex; justify-content: flex-end; gap: 10px; }

/* ============ Toast ============ */
.ad-toasts {
  position: fixed; right: 18px; bottom: 18px; z-index: 1400;
  display: flex; flex-direction: column; gap: 8px; align-items: flex-end;
  pointer-events: none;
}
.ad-toast {
  pointer-events: auto;
  display: flex; align-items: center; gap: 8px;
  max-width: 380px; padding: 9px 12px;
  font-size: 12.5px; line-height: 1.6;
  background: var(--admin-card-bg);
  border: 1px solid var(--admin-border); border-left-width: 3px;
  border-radius: var(--admin-radius);
  box-shadow: 0 8px 26px rgba(0, 0, 0, .18);
  animation: ad-toast-in .18s ease;
}
.ad-toast.is-success { border-left-color: #3f9d63; }
.ad-toast.is-error { border-left-color: var(--admin-danger); }
.ad-toast.is-warn { border-left-color: var(--admin-warn); }
.ad-toast.is-info { border-left-color: var(--admin-primary); }
.ad-toast-msg { flex: 1; min-width: 0; word-break: break-word; }
.ad-toast-x {
  border: none; background: transparent; cursor: pointer;
  color: var(--admin-text-muted); font-size: 11px;
}
@keyframes ad-toast-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

/* ============ 响应式 ============ */
/* 1024–1279：侧栏折叠为图标，列表与详情仍并排 */
@media (max-width: 1279px) {
  .admin-root .ad-side { flex-basis: var(--admin-sidebar-collapsed-w); width: var(--admin-sidebar-collapsed-w); }
  .admin-root .ad-side-title,
  .admin-root .ad-group-text,
  .admin-root .ad-nav-text,
  .admin-root .ad-nav-pending,
  .admin-root .ad-side-foot { display: none; }
  .admin-root .ad-nav-item { justify-content: center; padding: 0; }
  .admin-root .ad-collapse-btn { display: none; }
}
/* <1024：侧栏变抽屉（汉堡菜单打开），列表与详情仍并排 */
@media (max-width: 1023px) {
  .admin-root .ad-drawer-btn { display: inline-flex; }
  .admin-root .ad-side {
    position: absolute; top: 0; bottom: 0; left: 0; z-index: 60;
    flex-basis: var(--admin-sidebar-w); width: var(--admin-sidebar-w);
    transform: translateX(-102%);
    transition: transform .2s ease;
    box-shadow: 0 0 30px rgba(0, 0, 0, .22);
  }
  .admin-root.side-drawer-open .ad-side { transform: none; }
  .admin-root .ad-side-title,
  .admin-root .ad-group-text,
  .admin-root .ad-nav-text,
  .admin-root .ad-side-foot { display: revert; }
  .admin-root .ad-nav-item { justify-content: flex-start; padding: 0 8px; }
  .admin-root .ad-side-close { display: inline-flex; }
  .admin-root.side-drawer-open .ad-drawer-mask {
    display: block; position: absolute; inset: 0; z-index: 50; background: rgba(0, 0, 0, .35);
  }
  .admin-root .ad-crumb-item { max-width: 150px; }
}
/* <768：列表与详情二选一，进入详情后提供返回列表按钮 */
@media (max-width: 767px) {
  .ad-topbar { gap: 6px; padding: 0 8px; }
  .ad-search { display: none; }
  .ad-role-badge, .ad-me-name { display: none; }
  .ad-content-inner { padding: 10px; }
  .ad-ld { position: relative; }
  .ad-ld-list { flex-basis: 100% !important; width: 100% !important; border-right: none; }
  .ad-ld-grip { display: none; }
  .ad-ld-detail { display: none; }
  .ad-ld.show-detail .ad-ld-list { display: none; }
  .ad-ld.show-detail .ad-ld-detail { display: flex; }
  .ad-detail-toggle { display: inline-flex; }
}
`

/* import 即注入：<style> 只插一次（同插件的模块可能被多次 import）。 */
const MARK = 'data-privhub-admin-console'
if (!document.querySelector('style[' + MARK + ']')) {
  const el = document.createElement('style')
  el.setAttribute(MARK, '')
  el.textContent = CSS
  document.head.appendChild(el)
}
