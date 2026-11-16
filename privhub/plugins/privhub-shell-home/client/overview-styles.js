/**
 * overview — 项目总览（L1 驾驶舱）的全部样式（import 即注入）。
 *
 * ## 视觉：交互原型（issue #3 样机）
 * 主子要求「界面/样式先按原型走」。本文件把驾驶舱换成原型的视觉语言：
 * indigo→cyan 主色族、卡片色脊、26px 粗 KPI、渐变管线、圆角项目卡。
 * 颜色走骨架的**原型令牌**（--p-*，深浅两套主题各自覆盖），不再自造配色。
 *
 * ## 可分辨性不只靠颜色（契约钉住，不可放宽）
 * 四个管线桶（待办/进行中/待审核/完成）各自带**图案**（斜纹/竖纹/点阵/网格）
 * 与**直接标签**：堆叠条上写数字、图例上写中文名，去掉颜色也能读懂。
 * 图例色块与条内图案必须一致（图例是「哪种图案＝哪一段」的对照表）。
 * 这四个桶色只用于管线，不参与其它区域。
 *
 * @module privhub-shell-home/client/overview-styles
 */

const CSS = `
/* ============ 管线桶色（唯一自定义色族，原型四态）============ */
:root {
  --ov-b-todo:   #2563eb;   /* 待办：电蓝 */
  --ov-b-doing:  #4f46e5;   /* 进行中：靛蓝 —— 主色，占比最大 */
  --ov-b-review: #d97706;   /* 待审核：琥珀 —— 等人，需要注意 */
  --ov-b-done:   #16a34a;   /* 完成：绿 */
  --ov-b-todo-soft:   rgba(37, 99, 235, .14);
  --ov-b-doing-soft:  rgba(79, 70, 229, .14);
  --ov-b-review-soft: rgba(217, 119, 6, .16);
  --ov-b-done-soft:   rgba(22, 163, 74, .14);
}
[data-theme="dark"] {
  --ov-b-todo:   #60a5fa;
  --ov-b-doing:  #818cf8;
  --ov-b-review: #fbbf24;
  --ov-b-done:   #4ade80;
  --ov-b-todo-soft:   rgba(96, 165, 250, .20);
  --ov-b-doing-soft:  rgba(129, 140, 248, .20);
  --ov-b-review-soft: rgba(251, 191, 36, .20);
  --ov-b-done-soft:   rgba(74, 222, 128, .20);
}

/* 总览外壳：自身不滚动 —— 滚动落在外层 .home-wrap（全站唯一滚动视口，契约钉住） */
.ov-root { display: block; }

/* ============ 头部（原型 vhead）============ */
.ov-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 2px; }
.ov-head .big { font-size: 18px; font-weight: 700; color: var(--p-text); }
.ov-head .sub { color: var(--p-muted); font-size: 12.5px; }
.ov-head .acts { margin-left: auto; display: flex; gap: var(--sp-2); align-items: center; }
.ov-philosophy { color: var(--p-muted); font-size: 12.5px; margin: 4px 0 var(--sp-4); line-height: 1.7; }

/* ============ KPI 行（原型 kpi：色脊 + 26px 粗数字）============ */
.ov-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 14px; }
.ov-kpi {
  position: relative; overflow: hidden;
  padding: 14px 16px; border-radius: 12px;
  border: 1px solid var(--p-border); background: var(--p-surface); box-shadow: var(--p-shadow-sm);
  transition: .18s;
}
.ov-kpi::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: linear-gradient(180deg, var(--p-indigo), var(--p-cyan)); }
.ov-kpi:hover { transform: translateY(-2px); box-shadow: var(--p-shadow); }
.ov-kpi.warn::before { background: var(--p-amber); }
.ov-kpi.bad::before { background: var(--p-red); }
.ov-kpi.ok::before { background: var(--p-green); }
.ov-kpi .k { display: block; color: var(--p-muted); font-size: 12px; margin-bottom: 6px; }
.ov-kpi .v { font-size: 26px; font-weight: 800; line-height: 1.1; letter-spacing: -.02em; color: var(--p-text); }
.ov-kpi.warn .v { color: var(--p-amber); }
.ov-kpi.bad .v { color: var(--p-red); }
.ov-kpi.ok .v { color: var(--p-green); }
.ov-kpi .u { font-size: 12px; font-weight: 400; color: var(--p-muted); margin-left: 3px; }
.ov-kpi .hint { display: block; margin-top: 5px; color: var(--p-faint); font-size: 11px; line-height: 1.6; }

/* ============ 管线聚合（原型 pipeline）============ */
.ov-panel { border: 1px solid var(--p-border); border-radius: 12px; background: var(--p-surface); box-shadow: var(--p-shadow-sm); padding: 14px 16px; margin-bottom: 14px; }
.ov-panel-h { display: flex; align-items: center; gap: var(--sp-2); font-size: 14px; font-weight: 700; margin-bottom: 10px; color: var(--p-text); }
.ov-panel-h .note { margin-left: auto; font-weight: 400; font-size: 11px; color: var(--p-muted); }

.ov-bar { display: flex; height: 28px; border-radius: 8px; overflow: hidden; background: var(--p-surface2); border: 1px solid var(--p-border); }
.ov-seg {
  display: flex; align-items: center; justify-content: center; min-width: 0;
  font-size: 11px; color: #fff; font-weight: 700;
  transition: flex-grow .5s cubic-bezier(.4, 0, .2, 1);
}
/* 四个桶**各自一种图案**：斜纹 / 竖纹 / 点阵 / 网格。
 * 只给两个桶加图案是不够的 —— 去掉颜色后 doing 与 done 会变成同一片实色，
 * 「进行中」和「已完成」再也分不开，而这两段恰恰是最需要分清的。
 * 图案方向/密度互不相同，灰度打印或色觉障碍下仍可区分。 */
.ov-seg.todo { background: var(--ov-b-todo); background-image: repeating-linear-gradient(45deg, rgba(255,255,255,.22) 0 3px, transparent 3px 6px); }
.ov-seg.doing { background: var(--ov-b-doing); background-image: repeating-linear-gradient(90deg, rgba(255,255,255,.20) 0 2px, transparent 2px 7px); }
.ov-seg.review { background: var(--ov-b-review); background-image: radial-gradient(rgba(255,255,255,.34) 1px, transparent 1.2px); background-size: 6px 6px; }
.ov-seg.done { background: var(--ov-b-done); background-image: repeating-linear-gradient(0deg, rgba(255,255,255,.18) 0 1px, transparent 1px 5px), repeating-linear-gradient(90deg, rgba(255,255,255,.18) 0 1px, transparent 1px 5px); }
.ov-bar-empty { flex: 1; display: grid; place-items: center; color: var(--p-muted); font-size: 12px; }

.ov-legend { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 10px; align-items: center; }
.ov-lg { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--p-muted); }
.ov-lg .sw { width: 10px; height: 10px; border-radius: 3px; flex: 0 0 10px; }
/* 图例色块与条内图案**必须一致**：图例是「哪种图案＝哪一段」的对照表，
 * 两处不一致等于给了张错的地图。 */
.ov-lg .sw.todo { background: var(--ov-b-todo); background-image: repeating-linear-gradient(45deg, rgba(255,255,255,.22) 0 3px, transparent 3px 6px); }
.ov-lg .sw.doing { background: var(--ov-b-doing); background-image: repeating-linear-gradient(90deg, rgba(255,255,255,.20) 0 2px, transparent 2px 7px); }
.ov-lg .sw.review { background: var(--ov-b-review); background-image: radial-gradient(rgba(255,255,255,.34) 1px, transparent 1.2px); background-size: 6px 6px; }
.ov-lg .sw.done { background: var(--ov-b-done); background-image: repeating-linear-gradient(0deg, rgba(255,255,255,.18) 0 1px, transparent 1px 5px), repeating-linear-gradient(90deg, rgba(255,255,255,.18) 0 1px, transparent 1px 5px); }
.ov-lg .n { color: var(--p-text); font-variant-numeric: tabular-nums; font-weight: 600; }
.ov-lg.total { margin-left: auto; font-weight: 600; color: var(--p-text); }

/* partial = 数据完整性告知（统计不全），不是告警：用中性色，别混进红色卡点里 */
.ov-reason.info { color: var(--p-muted); background: transparent; }
.ov-reason.more { color: var(--p-muted); background: transparent; font-style: normal; }

/* 筛选回执行 */
.ov-found {
  display: flex; align-items: center; gap: var(--sp-2); flex-wrap: wrap;
  padding: var(--sp-2) var(--sp-3); margin-bottom: var(--sp-2);
  border-radius: 9px; font-size: 12px; color: var(--p-muted);
  background: var(--ov-b-doing-soft);
}
.ov-link {
  border: none; background: none; padding: 0; cursor: pointer;
  color: var(--p-indigo); font-size: 12px; text-decoration: underline;
}
.ov-link:focus-visible { outline: 2px solid var(--p-indigo); outline-offset: 2px; border-radius: 4px; }

/* 对象级筛选框（原型 searchbox）：只在项目名里筛，范围写在 placeholder 与 title 上 */
.ov-find {
  width: 150px; padding: 6px 10px; margin-right: var(--sp-2);
  border-radius: 9px; font-size: 13px;
  border: 1px solid var(--p-border); background: var(--p-surface); color: var(--p-text);
}
.ov-find::placeholder { color: var(--p-faint); }
.ov-find:focus-visible { outline: 2px solid var(--p-indigo); outline-offset: 1px; border-color: var(--p-indigo); }

/* 排序下拉 + 筛选 chip（原型 chipf）：控件必须反映当前态 */
.ov-sort { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--p-muted); margin-right: var(--sp-2); }
.ov-sel {
  padding: 4px 8px; border-radius: 9px; font-size: 12px;
  border: 1px solid var(--p-border); background: var(--p-surface); color: var(--p-text); cursor: pointer;
}
.ov-sel:focus-visible { outline: 2px solid var(--p-indigo); outline-offset: 1px; }
.ov-chip {
  padding: 4px 12px; border-radius: 99px; cursor: pointer;
  font-size: 12px; border: 1px solid var(--p-border);
  background: var(--p-surface); color: var(--p-muted);
}
.ov-chip:hover { border-color: var(--p-indigo); color: var(--p-indigo); }
.ov-chip.on { background: color-mix(in srgb, var(--p-indigo) 12%, transparent); border-color: var(--p-indigo); color: var(--p-indigo); font-weight: 600; }
.ov-chip:focus-visible { outline: 2px solid var(--p-indigo); outline-offset: 1px; }

/* ============ 项目卡片（原型 pcard：色带 + 健康点 + 进度 + 节点 chip）============ */
.ov-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 14px; }
.ov-card {
  position: relative; text-align: left; width: 100%;
  padding: 16px; border-radius: 14px; cursor: pointer;
  border: 1px solid var(--p-border); background: var(--p-surface); box-shadow: var(--p-shadow-sm);
  display: flex; flex-direction: column; gap: 9px; overflow: hidden;
  transition: box-shadow .18s, border-color .18s, transform .18s;
}
.ov-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--p-cyan); }
.ov-card:hover { border-color: var(--p-indigo); box-shadow: var(--p-shadow); transform: translateY(-2px); }
.ov-card:focus-visible { outline: 2px solid var(--p-indigo); outline-offset: 2px; }
.ov-card.warn::before { background: var(--p-amber); }
.ov-card.good::before { background: var(--p-green); }
.ov-card-h { display: flex; align-items: center; gap: var(--sp-2); }
.ov-card-h .name { font-weight: 700; font-size: 15px; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--p-text); }
.ov-card-h .go { color: var(--p-faint); font-size: 13px; }
.ov-pill { flex-shrink: 0; font-size: 11px; padding: 2px 9px; border-radius: 99px; border: 1px solid transparent; }
.ov-pill.warn { background: color-mix(in srgb, var(--p-red) 10%, transparent); color: var(--p-red); border-color: color-mix(in srgb, var(--p-red) 40%, transparent); }
.ov-pill.good { background: color-mix(in srgb, var(--p-green) 10%, transparent); color: var(--p-green); border-color: color-mix(in srgb, var(--p-green) 40%, transparent); }
.ov-pill.normal { background: color-mix(in srgb, var(--p-indigo) 8%, transparent); color: var(--p-indigo); border-color: var(--p-border); }

.ov-prog { display: flex; align-items: center; gap: var(--sp-2); }
.ov-track { flex: 1; height: 8px; border-radius: 99px; background: var(--p-surface2); border: 1px solid var(--p-border); overflow: hidden; }
.ov-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--p-indigo), var(--p-cyan)); transition: width .55s cubic-bezier(.4, 0, .2, 1); }
.ov-prog .pct { font-size: 12px; font-variant-numeric: tabular-nums; color: var(--p-muted); min-width: 34px; text-align: right; }

.ov-node { font-size: 12px; line-height: 1.6; color: var(--p-text); }
.ov-node .lbl { color: var(--p-muted); margin-right: 5px; }
.ov-meta { display: flex; flex-wrap: wrap; gap: var(--sp-2) 12px; color: var(--p-muted); font-size: 12px; }
.ov-reasons { display: flex; flex-direction: column; gap: 3px; padding-top: 6px; border-top: 1px dashed var(--p-border); }
.ov-reason { font-size: 11px; color: var(--p-amber); line-height: 1.6; }

/* ============ 个人入口（原型单卡片）============ */
.ov-mine { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; align-items: stretch; }
.ov-mine-cell { padding: 12px 14px; border-radius: 10px; background: var(--p-surface2); border: 1px solid var(--p-border); }
.ov-mine-cell .k { display: block; color: var(--p-muted); font-size: 11px; margin-bottom: 4px; }
.ov-mine-cell .v { font-size: 18px; font-weight: 700; color: var(--p-text); }
.ov-mine-cell .u { font-size: 11px; font-weight: 400; color: var(--p-muted); margin-left: 3px; }

/* ============ 折叠区（原有工作台内容下沉，一条不删）============ */
.ov-fold { border: 1px solid var(--p-border); border-radius: 12px; background: var(--p-surface); margin-bottom: 14px; overflow: hidden; }
.ov-fold-h {
  display: flex; align-items: center; gap: var(--sp-2); width: 100%;
  padding: 11px 14px; cursor: pointer; user-select: none;
  background: transparent; border: none; color: var(--p-text);
  font-size: 13px; font-weight: 600; text-align: left;
}
.ov-fold-h:hover { background: color-mix(in srgb, var(--p-indigo) 6%, transparent); }
.ov-fold-h:focus-visible { outline: 2px solid var(--p-indigo); outline-offset: -2px; }
.ov-fold-h .caret { color: var(--p-muted); font-size: 11px; transition: transform .2s; }
.ov-fold-h .caret.open { transform: rotate(90deg); }
.ov-fold-h .hint { margin-left: auto; font-weight: 400; font-size: 11px; color: var(--p-muted); }
.ov-fold-b { padding: 0 14px 14px; }

/* 空态 / 错误态 / 加载态（三态全覆盖，空态给下一步） */
.ov-state { padding: 26px 14px; text-align: center; color: var(--p-muted); font-size: 13px; line-height: 1.8; }
.ov-state.bad { color: var(--p-red); }
.ov-state .btn { width: auto; margin-top: 10px; }
.ov-trunc { margin-top: 10px; padding: 8px 10px; border-radius: 9px; background: color-mix(in srgb, var(--p-amber) 12%, transparent); color: var(--p-amber); font-size: 11px; line-height: 1.7; }

/* 窄屏：KPI 两列、卡片单列 */
@media (max-width: 720px) {
  .ov-kpis { grid-template-columns: repeat(2, 1fr); }
  .ov-cards { grid-template-columns: 1fr; }
  .ov-lg.total { margin-left: 0; }
}
`

const MARK = 'data-privhub-shell-home-overview'
if (!document.querySelector('style[' + MARK + ']')) {
  const el = document.createElement('style')
  el.setAttribute(MARK, '')
  el.textContent = CSS
  document.head.appendChild(el)
}