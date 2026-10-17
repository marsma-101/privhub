/**
 * styles — 本插件的全部 CSS，**一律收在自己的挂载点之下**。
 *
 * 硬约束（`tests/integrity.mjs` 的 FE-06）：插件不得在别人的容器上声称布局 ——
 * 所以本文件**只**出现两类选择器：
 *   1. `.v3-viewer-host[data-viewer="privhub-mindmap"]` —— 宿主在 viewer 上场时写到
 *      **它自己的**挂载点上的属性，本插件据此声明「我的地里怎么排」；
 *   2. `.mm-*` —— 本插件自建节点的类名。
 * 内容区那个「整块让给 viewer」的状态类（`.v3-content--viewer`）由**宿主**写在宿主样式里，
 * 本插件一行都不碰 `.v3-content`。
 *
 * 版式沿用本仓看板页的既定标准（`docs/` 里那条）：**工具栏钉顶 / 正文区有界滚动 / 页脚钉底**，
 * 且**不设 max-width**（要铺满）。画布这一路把「有界滚动」换成了「有界视口 + 画布内缩放平移」——
 * 语义相同：正文不会把整页顶出去。
 *
 * @module privhub-mindmap/client/styles
 */

const STYLE_ID = 'privhub-mindmap-style'

const CSS = `
/* ── 挂载点：吃掉内容区的纵向剩余空间，内部再分工具栏 / 正文 / 页脚 ─────────── */
.v3-viewer-host[data-viewer="privhub-mindmap"] { display:flex; flex:1 1 auto; min-height:0; min-width:0; }
.v3-viewer-host[data-viewer="privhub-mindmap"] > div { flex:1 1 auto; min-width:0; min-height:0; display:flex; flex-direction:column; }

.mm-root { flex:1 1 auto; min-height:0; display:flex; flex-direction:column; background:var(--bg); color:var(--text); }

/* ── 工具栏（钉顶，允许换行：窄栏时按钮折行而不是横向溢出） ───────────────── */
.mm-bar { flex:0 0 auto; display:flex; align-items:center; flex-wrap:wrap; gap:6px; padding:6px 10px; border-bottom:1px solid var(--line); background:var(--panel); }
.mm-btn { font-size:12.5px; padding:3px 9px; border-radius:6px; border:1px solid var(--line); background:var(--panel2); color:var(--text); cursor:pointer; white-space:nowrap; }
.mm-btn:hover:not(:disabled) { border-color:var(--accent); }
.mm-btn:disabled { opacity:.42; cursor:default; }
.mm-btn.on { border-color:var(--accent); color:var(--accent); }
.mm-btn.primary { background:var(--accent); color:#fff; border-color:var(--accent); }
.mm-sep { width:1px; align-self:stretch; background:var(--line); margin:0 3px; }
.mm-grow { flex:1 1 auto; }
.mm-state { font-size:11.5px; color:var(--muted); white-space:nowrap; }
.mm-state.dirty { color:var(--danger); font-weight:600; }
.mm-state.err { color:var(--danger); }

/* ── 正文区：有界视口（画布自己缩放平移；大纲面板自己滚） ──────────────────── */
.mm-body { flex:1 1 auto; min-height:0; display:flex; min-width:0; }

.mm-canvaswrap { flex:1 1 auto; min-width:0; min-height:0; position:relative; overflow:hidden; outline:none;
  background:var(--bg); touch-action:none; }
.mm-svg { display:block; }
.mm-svg .mm-n { cursor:pointer; }
.mm-svg .mm-n rect { transition:stroke-width .08s ease; }
.mm-svg .mm-n:hover rect { stroke-width:2.4; }
.mm-svg .mm-n.sel rect { stroke-width:3; }
.mm-svg .mm-n.sel text { font-weight:700; }
.mm-svg .mm-fold { fill:var(--panel); stroke-width:1.2; cursor:pointer; }
.mm-svg .mm-fold-t { font-size:12px; font-weight:700; cursor:pointer; user-select:none; }

/* ── 大纲面板（并排时的右栏 / 纯大纲时的整幅） ───────────────────────────── */
.mm-outline { flex:0 0 38%; min-width:200px; max-width:56%; display:flex; flex-direction:column; min-height:0;
  border-left:1px solid var(--line); background:var(--panel); }
.mm-body.outline-only .mm-outline { flex:1 1 auto; min-width:0; max-width:none; border-left:none; }
.mm-outline-head { flex:0 0 auto; display:flex; align-items:center; gap:8px; padding:5px 10px; font-size:11.5px; color:var(--muted); border-bottom:1px solid var(--line); }
.mm-outline textarea { flex:1 1 auto; min-height:0; width:100%; resize:none; border:none; outline:none;
  background:var(--bg); color:var(--text); padding:10px 12px; box-sizing:border-box;
  font-family:ui-monospace,SFMono-Regular,Consolas,'Courier New',monospace; font-size:12.5px; line-height:1.7; tab-size:2; }
.mm-outline textarea::placeholder { color:var(--muted); }

/* ── 页脚提示（钉底） ───────────────────────────────────────────────────── */
.mm-foot { flex:0 0 auto; padding:5px 10px; border-top:1px solid var(--line); background:var(--panel);
  font-size:11.5px; color:var(--muted); line-height:1.6; }
.mm-foot code { background:var(--panel2); padding:0 4px; border-radius:4px; font-size:11px; }

/* ── 载入 / 出错态 ─────────────────────────────────────────────────────── */
.mm-center { flex:1 1 auto; display:flex; align-items:center; justify-content:center; flex-direction:column; gap:10px;
  color:var(--muted); font-size:13px; padding:24px; text-align:center; }
.mm-center .mm-big { font-size:30px; }

/* ══════════ 「思维导图」项目视图（P2，图标栏「知识」组） ══════════════════════
 * 直接挂在骨架 .main（flex column / overflow:hidden）下，与引用检查页同一套版式：
 * 整页铺满（不限宽、不居中）、工具条钉顶、列表落在有界滚动视口、页脚贴底。 */
.mm-page { flex:1 1 auto; min-height:0; width:100%; display:flex; flex-direction:column;
  padding:var(--sp-4) var(--sp-5) var(--sp-3); box-sizing:border-box; }

.mm-page-bar { display:flex; align-items:center; gap:var(--sp-2); flex-wrap:wrap;
  padding:4px 0 var(--sp-3); border-bottom:1px solid var(--line); margin-bottom:var(--sp-3); }
.mm-page-title { font-size:var(--fs-lg); font-weight:600; margin-right:4px; }
.mm-page-scope { color:var(--muted); font-size:var(--fs-sm); }
.mm-page-scope b { color:var(--text); font-weight:600; }
.mm-page-filter { width:220px; padding:4px 8px; border:1px solid var(--line); border-radius:var(--r-2);
  background:var(--bg); color:var(--text); font-size:var(--fs-sm); }
.mm-page-err { flex:1 1 auto; display:grid; place-content:center; color:var(--danger); font-size:var(--fs-sm); text-align:center; padding:var(--sp-4); }

/* 唯一滚动视口：flex:1 + min-height:0 缺一不可，否则滚动条被内容顶出屏幕 */
.mm-page-body { flex:1 1 auto; min-height:0; overflow:auto; }

/* 编辑态（P3 全局图）：正文区整块让给编辑器 —— 它自己管滚动（画布有界视口 + 大纲自己滚），
 * 外层再套一层 overflow:auto 会多出一条没用的滚动条。 */
.mm-page-body.mm-edit { overflow:hidden; display:flex; padding:0; }

.mm-btn-danger { color:var(--danger); border-color:var(--danger); }
.mm-btn-danger:hover:not(:disabled) { background:var(--danger); color:#fff; }

.mm-empty { padding:var(--sp-5) 0; color:var(--muted); font-size:var(--fs-sm); text-align:center; line-height:1.9; }
.mm-empty p { margin:0 0 4px; }

.mm-list { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:2px; }
.mm-item { display:flex; align-items:center; gap:var(--sp-3); padding:7px 10px; border-radius:var(--r-2); border:1px solid transparent; }
.mm-item:hover { background:var(--bg-soft, rgba(0,0,0,.045)); border-color:var(--line); }
.mm-item-icon { flex:0 0 auto; font-size:16px; }
.mm-item-main { flex:1 1 auto; min-width:0; display:flex; align-items:baseline; gap:8px; cursor:pointer; }
.mm-item-name { font-size:var(--fs-sm); color:var(--accent); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.mm-item:hover .mm-item-name { text-decoration:underline; }
.mm-item-path { color:var(--muted); font-size:var(--fs-xs); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.mm-item-ops { flex:0 0 auto; display:flex; gap:6px; opacity:.55; transition:opacity .1s ease; }
.mm-item:hover .mm-item-ops, .mm-item:focus-within .mm-item-ops { opacity:1; }

.mm-page-foot { flex:0 0 auto; padding:var(--sp-2) 0 0; border-top:1px solid var(--line); margin-top:var(--sp-3);
  font-size:var(--fs-xs); color:var(--muted); line-height:1.7; }
.mm-page-foot code { background:var(--panel2); padding:0 4px; border-radius:4px; font-size:11px; }
`

if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = CSS
  document.head.appendChild(el)
}

export { CSS }
