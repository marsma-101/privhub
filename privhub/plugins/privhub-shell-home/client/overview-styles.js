/**
 * overview — 项目总览（L1 驾驶舱）的全部样式（import 即注入）。
 *
 * ## 配色纪律
 * 颜色/间距/字号/圆角一律走**骨架令牌**（FE-03 刻度层），两套主题自动跟随。
 * 唯一例外是四个「管线桶」色：待办/进行中/待审核/完成需要**同时可分辨**，
 * 骨架令牌里没有四个语义色，因此在这里定义 `--ov-b-*` 四个变量并在深色主题下各自覆盖。
 * 这四个色**只用于管线**（堆叠条 / 图例 / 徽标），不参与其它区域，避免变成第二套配色。
 *
 * ## 可分辨性不只靠颜色
 * 桶色对色觉障碍用户不够，所以每个桶还带**图案**（斜纹 / 点阵）与**直接标签**：
 * 堆叠条上写数字、图例上写中文名，去掉颜色也能读懂（issue #3「图表六到八色需靠图案/
 * 直接标签/明度共同区分」）。
 *
 * @module privhub-shell-home/client/overview-styles
 */

const CSS = `
/* ============ 管线桶色（唯一自定义色族）============ */
:root {
  --ov-b-todo:   #7b8794;   /* 待办：中性冷灰蓝 —— 还没开工 */
  --ov-b-doing:  #2f6fd0;   /* 进行中：电蓝 —— 主色，占比最大 */
  --ov-b-review: #c8811a;   /* 待审核：琥珀 —— 等人，需要注意 */
  --ov-b-done:   #1f7a4d;   /* 完成：绿 */
  --ov-b-todo-soft:   rgba(123, 135, 148, .16);
  --ov-b-doing-soft:  rgba(47, 111, 208, .14);
  --ov-b-review-soft: rgba(200, 129, 26, .16);
  --ov-b-done-soft:   rgba(31, 122, 77, .14);
}
[data-theme="dark"] {
  --ov-b-todo:   #93a1af;
  --ov-b-doing:  #5b9bf5;
  --ov-b-review: #e0a53f;
  --ov-b-done:   #47b57c;
  --ov-b-todo-soft:   rgba(147, 161, 175, .20);
  --ov-b-doing-soft:  rgba(91, 155, 245, .20);
  --ov-b-review-soft: rgba(224, 165, 63, .20);
  --ov-b-done-soft:   rgba(71, 181, 124, .20);
}

/* 总览外壳：自身不滚动 —— 滚动落在外层 .home-wrap（全站唯一滚动视口，契约钉住） */
.ov-root { display: block; }

/* ============ 头部 ============ */
.ov-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 2px; }
.ov-head .big { font-size: var(--fs-xl); font-weight: 600; }
.ov-head .sub { color: var(--muted); font-size: var(--fs-sm); }
.ov-head .acts { margin-left: auto; display: flex; gap: var(--sp-2); align-items: center; }
.ov-philosophy { color: var(--muted); font-size: var(--fs-sm); margin: 4px 0 var(--sp-4); line-height: 1.7; }

/* ============ KPI 行 ============ */
.ov-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--sp-3); margin-bottom: var(--sp-4); }
.ov-kpi {
  position: relative; overflow: hidden;
  padding: 12px 14px; border-radius: var(--r-3);
  border: 1px solid var(--line); background: var(--panel2); box-shadow: var(--sh-1);
}
/* 左侧一道色脊：让每张 KPI 自带语义，而不是一排同样的灰卡 */
.ov-kpi::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--accent); }
.ov-kpi.warn::before { background: var(--warn); }
.ov-kpi.bad::before { background: var(--danger); }
.ov-kpi.ok::before { background: var(--ok); }
.ov-kpi .k { display: block; color: var(--muted); font-size: var(--fs-sm); margin-bottom: 6px; }
.ov-kpi .v { font-size: var(--fs-xl); font-weight: 600; line-height: 1.1; letter-spacing: -.01em; }
.ov-kpi.warn .v { color: var(--warn); }
.ov-kpi.bad .v { color: var(--danger); }
.ov-kpi.ok .v { color: var(--ok); }
.ov-kpi .u { font-size: var(--fs-sm); font-weight: 400; color: var(--muted); margin-left: 3px; }
.ov-kpi .hint { display: block; margin-top: 5px; color: var(--muted); font-size: var(--fs-xs); line-height: 1.6; }

/* ============ 管线聚合 ============ */
.ov-panel { border: 1px solid var(--line); border-radius: var(--r-3); background: var(--panel2); box-shadow: var(--sh-1); padding: 12px 14px; margin-bottom: var(--sp-4); }
.ov-panel-h { display: flex; align-items: center; gap: var(--sp-2); font-size: var(--fs-base); font-weight: 600; margin-bottom: 10px; }
.ov-panel-h .note { margin-left: auto; font-weight: 400; font-size: var(--fs-xs); color: var(--muted); }

.ov-bar { display: flex; height: 26px; border-radius: var(--r-2); overflow: hidden; background: var(--panel); border: 1px solid var(--line); }
.ov-seg {
  display: flex; align-items: center; justify-content: center; min-width: 0;
  font-size: var(--fs-xs); color: #fff; font-weight: 600;
  transition: flex-grow .32s cubic-bezier(.4, 0, .2, 1);
}
/* 图案：待办斜纹、待审核点阵 —— 去掉颜色也能区分 */
/* 四个桶**各自一种图案**：斜纹 / 竖纹 / 点阵 / 网格。
 * 只给两个桶加图案是不够的 —— 去掉颜色后 doing 与 done 会变成同一片实色，
 * 「进行中」和「已完成」再也分不开，而这两段恰恰是最需要分清的。
 * 图案方向/密度互不相同，灰度打印或色觉障碍下仍可区分。 */
.ov-seg.todo { background: var(--ov-b-todo); background-image: repeating-linear-gradient(45deg, rgba(255,255,255,.22) 0 3px, transparent 3px 6px); }
.ov-seg.doing { background: var(--ov-b-doing); background-image: repeating-linear-gradient(90deg, rgba(255,255,255,.20) 0 2px, transparent 2px 7px); }
.ov-seg.review { background: var(--ov-b-review); background-image: radial-gradient(rgba(255,255,255,.34) 1px, transparent 1.2px); background-size: 6px 6px; }
.ov-seg.done { background: var(--ov-b-done); background-image: repeating-linear-gradient(0deg, rgba(255,255,255,.18) 0 1px, transparent 1px 5px), repeating-linear-gradient(90deg, rgba(255,255,255,.18) 0 1px, transparent 1px 5px); }
.ov-bar-empty { flex: 1; display: grid; place-items: center; color: var(--muted); font-size: var(--fs-xs); }

.ov-legend { display: flex; flex-wrap: wrap; gap: var(--sp-3); margin-top: 10px; }
.ov-lg { display: inline-flex; align-items: center; gap: 6px; font-size: var(--fs-sm); color: var(--text); }
.ov-lg .sw { width: 12px; height: 12px; border-radius: 3px; flex: 0 0 12px; }
/* 图例色块与条内图案**必须一致**：图例是「哪种图案＝哪一段」的对照表，
 * 两处不一致等于给了张错的地图。 */
.ov-lg .sw.todo { background: var(--ov-b-todo); background-image: repeating-linear-gradient(45deg, rgba(255,255,255,.22) 0 3px, transparent 3px 6px); }
.ov-lg .sw.doing { background: var(--ov-b-doing); background-image: repeating-linear-gradient(90deg, rgba(255,255,255,.20) 0 2px, transparent 2px 7px); }
.ov-lg .sw.review { background: var(--ov-b-review); background-image: radial-gradient(rgba(255,255,255,.34) 1px, transparent 1.2px); background-size: 6px 6px; }
.ov-lg .sw.done { background: var(--ov-b-done); background-image: repeating-linear-gradient(0deg, rgba(255,255,255,.18) 0 1px, transparent 1px 5px), repeating-linear-gradient(90deg, rgba(255,255,255,.18) 0 1px, transparent 1px 5px); }
.ov-lg .n { color: var(--muted); font-variant-numeric: tabular-nums; }
.ov-lg.total { margin-left: auto; font-weight: 600; }

/* partial = 数据完整性告知（统计不全），不是告警：用中性色，别混进红色卡点里 */
.ov-reason.info { color: var(--muted); background: transparent; }
/* 「还有 N 条」的提示：弱化但可读，说明列出来的不是全部 */
.ov-reason.more { color: var(--muted); background: transparent; font-style: normal; }

/* 筛选回执行：说明「在多少个里搜、命中多少、显示了多少」，避免把部分当全部 */
.ov-found {
  display: flex; align-items: center; gap: var(--sp-2); flex-wrap: wrap;
  padding: var(--sp-2) var(--sp-3); margin-bottom: var(--sp-2);
  border-radius: var(--r-2); font-size: var(--fs-xs); color: var(--muted);
  background: var(--ov-b-doing-soft);
}
.ov-link {
  border: none; background: none; padding: 0; cursor: pointer;
  color: var(--accent); font-size: var(--fs-xs); text-decoration: underline;
}
.ov-link:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: var(--r-1); }

/* 对象级筛选框：只在项目名里筛，范围写在 placeholder 与 title 上 */
.ov-find {
  width: 132px; padding: 3px 8px; margin-right: var(--sp-2);
  border-radius: var(--r-2); font-size: var(--fs-xs);
  border: 1px solid var(--line); background: var(--panel); color: var(--text);
}
.ov-find::placeholder { color: var(--muted); }
.ov-find:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; border-color: var(--accent); }

/* 排序下拉 + 筛选 chip：控件必须反映当前态（选中态有底色 + 勾号 + aria-pressed） */
.ov-sort { display: inline-flex; align-items: center; gap: 5px; font-size: var(--fs-xs); color: var(--muted); margin-right: var(--sp-2); }
.ov-sel {
  padding: 3px 6px; border-radius: var(--r-2); font-size: var(--fs-xs);
  border: 1px solid var(--line); background: var(--panel); color: var(--text); cursor: pointer;
}
.ov-sel:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.ov-chip {
  padding: 3px 10px; border-radius: var(--r-pill); cursor: pointer;
  font-size: var(--fs-xs); border: 1px solid var(--line);
  background: var(--panel); color: var(--muted);
}
.ov-chip:hover { border-color: var(--accent); color: var(--accent); }
.ov-chip.on { background: var(--warn-soft); border-color: var(--warn); color: var(--warn); font-weight: 600; }
.ov-chip:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }

/* ============ 项目卡片 ============ */
.ov-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(268px, 1fr)); gap: var(--sp-3); }
.ov-card {
  position: relative; text-align: left; width: 100%;
  padding: 12px 13px; border-radius: var(--r-3); cursor: pointer;
  border: 1px solid var(--line); background: var(--panel2); box-shadow: var(--sh-1);
  display: flex; flex-direction: column; gap: 9px;
  transition: box-shadow .18s, border-color .18s, transform .18s;
}
.ov-card:hover { border-color: var(--accent); box-shadow: var(--sh-2); transform: translateY(-1px); }
.ov-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.ov-card.warn { border-left: 3px solid var(--warn); }
.ov-card.good { border-left: 3px solid var(--ok); }
.ov-card-h { display: flex; align-items: center; gap: var(--sp-2); }
.ov-card-h .name { font-weight: 600; font-size: var(--fs-base); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ov-card-h .go { color: var(--muted); font-size: var(--fs-sm); }
.ov-pill { flex-shrink: 0; font-size: var(--fs-xs); padding: 2px 8px; border-radius: var(--r-pill); border: 1px solid transparent; }
.ov-pill.warn { background: var(--warn-soft); color: var(--warn); border-color: var(--warn); }
.ov-pill.good { background: var(--ok-soft); color: var(--ok); border-color: var(--ok); }
.ov-pill.normal { background: var(--accent-soft); color: var(--muted); }

.ov-prog { display: flex; align-items: center; gap: var(--sp-2); }
.ov-track { flex: 1; height: 7px; border-radius: var(--r-pill); background: var(--panel); border: 1px solid var(--line); overflow: hidden; }
.ov-fill { height: 100%; background: linear-gradient(90deg, var(--ov-b-doing), var(--ov-b-done)); transition: width .32s cubic-bezier(.4, 0, .2, 1); }
.ov-prog .pct { font-size: var(--fs-sm); font-variant-numeric: tabular-nums; color: var(--muted); min-width: 34px; text-align: right; }

.ov-node { font-size: var(--fs-sm); line-height: 1.6; color: var(--text); }
.ov-node .lbl { color: var(--muted); margin-right: 5px; }
.ov-meta { display: flex; flex-wrap: wrap; gap: var(--sp-2) var(--sp-3); color: var(--muted); font-size: var(--fs-xs); }
.ov-reasons { display: flex; flex-direction: column; gap: 3px; padding-top: 2px; border-top: 1px dashed var(--line); }
.ov-reason { font-size: var(--fs-xs); color: var(--warn); line-height: 1.6; }

/* ============ 个人入口（单卡片）============ */
.ov-mine { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--sp-3); align-items: stretch; }
.ov-mine-cell { padding: 10px 12px; border-radius: var(--r-2); background: var(--panel); border: 1px solid var(--line); }
.ov-mine-cell .k { display: block; color: var(--muted); font-size: var(--fs-xs); margin-bottom: 4px; }
.ov-mine-cell .v { font-size: var(--fs-lg); font-weight: 600; }
.ov-mine-cell .u { font-size: var(--fs-xs); font-weight: 400; color: var(--muted); margin-left: 3px; }

/* ============ 折叠区（原有工作台内容下沉，一条不删）============ */
.ov-fold { border: 1px solid var(--line); border-radius: var(--r-3); background: var(--panel2); margin-bottom: var(--sp-4); overflow: hidden; }
.ov-fold-h {
  display: flex; align-items: center; gap: var(--sp-2); width: 100%;
  padding: 11px 14px; cursor: pointer; user-select: none;
  background: transparent; border: none; color: var(--text);
  font-size: var(--fs-base); font-weight: 600; text-align: left;
}
.ov-fold-h:hover { background: var(--accent-soft); }
.ov-fold-h:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.ov-fold-h .caret { color: var(--muted); font-size: var(--fs-xs); transition: transform .2s; }
.ov-fold-h .caret.open { transform: rotate(90deg); }
.ov-fold-h .hint { margin-left: auto; font-weight: 400; font-size: var(--fs-xs); color: var(--muted); }
.ov-fold-b { padding: 0 14px 14px; }

/* 空态 / 错误态 / 加载态（三态全覆盖，空态给下一步） */
.ov-state { padding: 22px 14px; text-align: center; color: var(--muted); font-size: var(--fs-sm); line-height: 1.8; }
.ov-state.bad { color: var(--danger); }
.ov-state .btn { width: auto; margin-top: 10px; }
.ov-trunc { margin-top: 10px; padding: 8px 10px; border-radius: var(--r-2); background: var(--warn-soft); color: var(--warn); font-size: var(--fs-xs); line-height: 1.7; }

/* 窄屏：KPI 两列、卡片单列，卡片内元素不挤压 */
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