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
/* 有 viewer 上场时，内容区整块让给它（第二步 b）：去内边距、纵向铺满、不滚动，
 * 宿主自己的只读预览（.v3-md / .v3-text）同时让位。
 *
 * 谁的地谁管：这条规则写在【宿主自己的样式】里、挂在【宿主自己的状态类】上
 * （panel.js 的 contentClass 由 viewer 会话的返回值驱动）。
 * 迁前它是 office2 注入的 .v3-content--office + iframe.office2-frame ——
 * 插件按类名声称拥有别人的容器，正是硬约束 5 要治的那种写法。 */
.v3-content--viewer { display:flex; flex-direction:column; padding:0; overflow:hidden; }
.v3-content--viewer .v3-md, .v3-content--viewer .v3-text { display:none; }
/* 图片 / PDF 铺满（本轮新增形态）：与 --viewer / --editor 同一范式 ——
 * 状态由**宿主自己派生**（panel.js 的 fillLayout，写进响应式 data）、规则写在
 * **宿主自己的样式**里、插件一个字节都不参与。
 * 与 --viewer 的区别是「谁上场」：--viewer 是插件 viewer 上场、宿主让位；
 * 这里是**宿主亲儿子**（img / iframe 由宿主模板直接渲染），语义不同，故另开一个状态类。
 *
 * 治的是什么（用户原话：「背景和背景大小别做限制，给 100%」「现在分好几层，大小还有的格式有限制」）：
 *   ① 去掉 .v3-content 的内边距（迁前 16px 22px ⇒ 图片/PDF 四周一圈留白）；
 *   ② 去掉 PDF 的写死高度（迁前 100vh 减 260px，与实际 chrome 高度无关，必然对不上）；
 *   ③ 去掉装饰性边框与圆角（迁前给 PDF 套了个相框、给图片加了 8px 圆角）；
 *   ④ 图片居中且不超出、可点开放大；PDF 的高度整个交给容器（让页面自己的背景当背景）。
 * ⚠ 文本阅读排版一行不动：.v3-md 的 max-width:900px 是**有意**为阅读舒适设的，
 *   这条状态类只作用于图片 / PDF 这两个宿主分支（office 走 viewer 契约，文本走只读排版）。
 * ⚠ 这一大段是 CSS 模板串的内容：注释里一律不写反引号（会当场结束模板串，b 批踩过）。 */
.v3-content--fill { display:flex; flex-direction:column; padding:0; overflow:hidden; }
.v3-content--fill .v3-img-wrap { flex:1 1 auto; min-height:0; display:flex; align-items:center; justify-content:center; overflow:auto; }
.v3-content--fill .v3-img { border-radius:0; }
.v3-content--fill .v3-pdf { flex:1 1 auto; min-height:0; }
/* 内嵌编辑模式（md/txt）：内容区改纵向布局，编辑区撑满整个中间栏。
 *
 * 第二步 c：状态来自**宿主自己的响应式状态**（panel.js 的 editorLayout，由插件经 bus 报
 * 「编辑态开/关」后由宿主写进 data），不再用 .v3-content:has(.md-inline-root) ——
 * 那是按**别人的后代**反查布局，等于让插件按类名声称拥有宿主的内容区（交底 §6-5）。
 * 编辑器的落点也归宿主：.v3-editor-host 这个舱位由宿主创建与销毁，插件只往它里面放节点。
 * ⚠ 这一大段是 CSS 模板串的**内容**：里面的反引号会当场结束模板串（第二步 b 在这里
 *   留下过一次语法错误，整块样式模块因此不解析），所以 CSS 注释里一律不写反引号。 */
.v3-content--editor { display:flex; flex-direction:column; padding:0; overflow:hidden; }
.v3-content--editor .v3-md, .v3-content--editor .v3-text { display:none; }
.v3-content--editor .v3-editor-host { flex:1 1 auto; min-height:0; display:flex; }
.v3-content--editor .v3-editor-host .md-inline-root { flex:1 1 auto; min-height:0; }
.v3-content--editor .v3-editor-host .md-src { font-size:var(--v3-preview-font, 13.5px) !important; }
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
/* 编辑期间的只读预览隐藏 / 编辑区尺寸：规则本体已上移到 .v3-content--editor 那一组
 * （宿主状态类旁边），这里不再重复。 */
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
/* 图片：宿主亲儿子形态之一。这里只保留「不超出容器」这一条媒体自身约束 ——
 * 装饰性的边框圆角与固定底色一律不加（让图片自己的背景当背景），
 * 铺满时的高度与居中由下面的 .v3-content--fill 那一组决定。
 * 迁前是 max-width:100% + border-radius:8px：只限宽不给高，外层又是内联 text-align:center，
 * 加上 .v3-content 的 16px/22px 内边距 ⇒ 图片四周一圈留白、且高度没人管。 */
.v3-img { max-width:100%; max-height:100%; }
/* 图片外层：没有铺满形态时的兜底居中（与迁前那个内联 text-align:center 的 div 等价） */
.v3-img-wrap { text-align:center; }
/* PDF：宽高都交给容器，不加边框圆角。
 * 迁前是 width:100% + height:calc(100vh - 260px) + 1px 边框 + 8px 圆角 ——
 * 写死高度与实际 chrome 高度无关（标签行/顶栏一变就对不上），边框圆角等于给
 * 浏览器内置 PDF 阅读器套了个相框，页面自己的背景反而显示不出来。 */
.v3-pdf { width:100%; height:100%; border:0; display:block; }
.v3-loading { color:var(--muted); font-size:13px; padding:60px 0; text-align:center; }
/* 大文件只读说明：一行克制的提示（不占位改动布局，滚走即不可见） */
.v3-readonly-hint { margin:0 0 12px; padding:6px 10px; border-left:3px solid var(--line); background:var(--panel); color:var(--muted); font-size:12.5px; line-height:1.6; border-radius:0 6px 6px 0; }
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
