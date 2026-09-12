/**
 * styles — 本插件注入的全部样式（不依赖骨架 CSS）。
 *
 * 两段分别为：V3 界面样式、右侧详情面板样式。import 本模块即完成注入。
 *
 * @module privhub-files-explorer-v3/client/styles
 */

/* ================= 样式注入（V3 专属，不依赖骨架 CSS） ================= */
const styleEl = document.createElement('style')
styleEl.textContent = `
.v3-tn { display:flex; align-items:center; gap:6px; padding:5px 6px; border-radius:6px; font-size:13px; cursor:pointer; position:relative; }
.v3-tn:hover { background:var(--panel2); }
.v3-tn.active { background:rgba(90,130,200,.15); color:var(--accent); }
.v3-tn .v3-name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.v3-tn .v3-dots { visibility:hidden; width:22px; height:22px; border-radius:5px; text-align:center; line-height:20px; font-size:13px; color:var(--muted); flex-shrink:0; }
.v3-tn:hover .v3-dots { visibility:visible; }
.v3-tn .v3-dots:hover { background:var(--panel); color:var(--text); }
.v3-tabs { display:flex; align-items:center; gap:2px; padding:5px 10px 0; border-bottom:1px solid var(--line); background:var(--panel); overflow-x:auto; scrollbar-width:none; }
.v3-tab { flex-shrink:0; display:flex; align-items:center; gap:6px; padding:5px 10px; border-radius:7px 7px 0 0; font-size:12.5px; cursor:pointer; color:var(--muted); border:1px solid transparent; border-bottom:none; white-space:nowrap; max-width:200px; }
.v3-tab:hover { background:var(--panel2); color:var(--text); }
.v3-tab.on { background:var(--panel2); color:var(--accent); border-color:var(--line); font-weight:600; }
.v3-tab .v3-tab-name { overflow:hidden; text-overflow:ellipsis; }
.v3-tab .v3-tab-x { width:16px; height:16px; border-radius:50%; text-align:center; line-height:15px; font-size:11px; flex-shrink:0; }
.v3-tab .v3-tab-x:hover { background:var(--line); color:var(--danger); }
.v3-content { flex:1; overflow:auto; padding:16px 22px; background:var(--bg); }
/* 内嵌编辑模式（md/txt）：内容区改纵向布局，编辑区撑满整个中间栏 */
.v3-content:has(.md-inline-root) { display:flex; flex-direction:column; padding:0; overflow:hidden; }
/*
 * 标签行 = 标签栏 + 右侧操作区（详情 / ⋯）。
 *
 * 操作区为什么放在【标签行】而不是内容区：
 *   内容区会被 Office 预览的 iframe 整块占满（office2 从顶部铺到底），
 *   任何悬浮在内容区之上的按钮都会压到 iframe 自身的工具条上——实测到的重叠干涉。
 *   标签行是唯一不被内容遮挡的空白带，放这里与内容天然互不干扰。
 *   同时它不额外增加顶栏层数：按钮与标签同一行。
 */
.v3-tabrow { display:flex; align-items:stretch; background:var(--panel); border-bottom:1px solid var(--line); }
.v3-tabrow .v3-tabs { flex:1; min-width:0; border-bottom:none; background:transparent; }
.v3-tabops { position:relative; display:flex; align-items:center; gap:4px; padding:0 8px 0 4px; flex-shrink:0; }
/* ⋯ 菜单：锚在操作区上。操作区没有 overflow，菜单不会被裁掉
 * （标签栏本身 overflow-x:auto，菜单若放它内部会被裁）。 */
.v3-menu { position:absolute; top:32px; right:6px; z-index:30; min-width:172px; background:var(--panel2); border:1px solid var(--line); border-radius:8px; padding:5px 0; box-shadow:0 10px 28px rgba(0,0,0,.25); }
.v3-menu-item { display:flex; align-items:center; gap:8px; padding:6px 12px; font-size:12.5px; cursor:pointer; color:var(--text); white-space:nowrap; }
.v3-menu-item:hover { background:var(--panel); color:var(--accent); }
.v3-menu-item .v3-menu-k { margin-left:auto; color:var(--muted); font-size:11.5px; }
.v3-menu-sep { height:1px; background:var(--line); margin:5px 0; }
.v3-menu-row { display:flex; align-items:center; gap:2px; padding:5px 12px; font-size:12.5px; color:var(--muted); }
.v3-menu-row .v3-fs { cursor:pointer; padding:1px 7px; border-radius:5px; }
.v3-menu-row .v3-fs:hover { background:var(--panel); color:var(--accent); }
/* 编辑期间隐藏只读预览（CSS 级，重渲染后依然生效） */
.v3-content:has(.md-inline-root) .v3-md, .v3-content:has(.md-inline-root) .v3-text { display:none; }
.v3-content:has(.md-inline-root) .md-inline-root { flex:1 1 auto; min-height:0; }
.v3-content:has(.md-inline-root) .md-inline-root .md-src { font-size:var(--v3-preview-font, 13.5px) !important; }
.v3-op-btn { font-size:12px; padding:4px 10px; border-radius:6px; background:transparent; border:1px solid var(--line); color:var(--muted); cursor:pointer; }
.v3-op-btn:hover { color:var(--accent); border-color:var(--accent); }
.v3-md { font-size:var(--v3-preview-font, 13.5px); line-height:1.75; color:var(--text); max-width:900px; }
.v3-md h1,.v3-md h2,.v3-md h3 { margin:16px 0 8px; }
.v3-md pre { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:12px; overflow:auto; font-size:12.5px; }
.v3-md code { background:var(--panel); padding:1px 5px; border-radius:4px; font-size:12.5px; }
.v3-md pre code { background:transparent; padding:0; }
.v3-md table { border-collapse:collapse; margin:8px 0; font-size:12.5px; }
.v3-md th,.v3-md td { border:1px solid var(--line); padding:5px 10px; }
.v3-md th { background:var(--panel); }
.v3-md blockquote { border-left:3px solid var(--accent); margin:8px 0; padding:2px 12px; color:var(--muted); }
.v3-md a { color:var(--accent); }
.v3-text { font-size:var(--v3-preview-font, 13.5px); white-space:pre-wrap; word-break:break-all; color:var(--text); font-family:Consolas,Menlo,monospace; }
.v3-img { max-width:100%; border-radius:8px; }
.v3-pdf { width:100%; height:calc(100vh - 260px); border:1px solid var(--line); border-radius:8px; }
.v3-loading { color:var(--muted); font-size:13px; padding:60px 0; text-align:center; }
.file-table-row .v3-row-dots { visibility:hidden; margin-left:auto; width:22px; height:22px; border-radius:5px; text-align:center; line-height:20px; font-size:13px; color:var(--muted); cursor:pointer; flex-shrink:0; }
.file-table-row:hover .v3-row-dots { visibility:visible; }
.file-table-row .v3-row-dots:hover { background:var(--panel); color:var(--accent); }
`
document.head.appendChild(styleEl)

/* ================= 右侧详情面板（preview slot） ================= */
const detailStyle = document.createElement('style')
detailStyle.textContent = `
.v3-detail { width: 320px; border-left: 1px solid var(--line); background: var(--panel); display: flex; flex-direction: column; overflow: hidden; flex-shrink: 0; }
.v3-detail-head { padding: 12px 14px; border-bottom: 1px solid var(--line); display: flex; align-items: center; gap: 8px; }
.v3-detail-head .v3-detail-name { flex: 1; font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.v3-detail-close { cursor: pointer; color: var(--muted); }
.v3-detail-close:hover { color: var(--danger); }
.v3-detail-body { flex: 1; overflow: auto; padding: 12px 14px; }
.v3-detail-kv { display: flex; gap: 8px; padding: 5px 0; font-size: 12.5px; border-bottom: 1px dashed var(--line); }
.v3-detail-kv .k { flex-shrink: 0; width: 62px; color: var(--muted); }
.v3-detail-kv .v { word-break: break-all; }
.v3-detail-tags { margin-top: 10px; }
.v3-detail-tags .v3-detail-tag { display: inline-block; margin: 2px 4px 2px 0; padding: 2px 9px; border-radius: 10px; background: rgba(90,130,200,.14); color: var(--accent); font-size: 11.5px; }
.v3-detail-tags input { width: 100%; padding: 5px 9px; margin-top: 6px; border-radius: 6px; border: 1px solid var(--line); background: var(--bg); color: var(--text); font-size: 12px; outline: none; }
.v3-detail-actions { margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.v3-detail-act { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 9px 4px; border-radius: 8px; border: 1px solid var(--line); background: var(--panel2); cursor: pointer; font-size: 11.5px; color: var(--text); position: relative; }
.v3-detail-act:hover { border-color: var(--accent); color: var(--accent); }
.v3-detail-act .v3-detail-act-ico { font-size: 17px; }
.v3-detail-act.dev { cursor: not-allowed; opacity: .55; }
.v3-detail-act.dev:hover { border-color: var(--line); color: var(--text); }
.v3-detail-act .v3-dev-badge { position: absolute; top: -6px; right: -6px; font-size: 9px; background: var(--warn); color: #fff; border-radius: 8px; padding: 0 5px; line-height: 14px; }
`
document.head.appendChild(detailStyle)
