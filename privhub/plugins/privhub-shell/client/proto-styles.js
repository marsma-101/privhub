/**
 * proto-styles — 交互原型（issue #3 样机）的组件样式补充（import 即注入）
 *
 * 主体视觉令牌（--p-*）与 L0 框架/驾驶舱/tab/抽屉的类已在骨架 index.html 的
 * 「交互原型组件层」里定义（骨架是唯一主界面，框架样式归骨架）。
 * 本文件只放**插件侧才用到**的原型样式：个人层「我的」与项目层头部，
 * 它们由 shell 插件渲染，样式跟着插件走，避免骨架塞进过多业务细节。
 *
 * 全部走 --p-* 原型令牌，深浅两套主题自动跟随；不自造第二套配色。
 *
 * @module privhub-shell/client/proto-styles
 */

const ID = 'privhub-shell-proto'
if (typeof document !== 'undefined' && !document.getElementById(ID)) {
  const el = document.createElement('style')
  el.id = ID
  el.textContent = `
/* ══════════ 个人层「我的」（原型视觉：卡片 + 渐变 tab）══════════ */
.ph-me { flex: 1 1 auto; min-height: 0; width: 100%; overflow: auto; padding: 18px 22px; }
.ph-me .ph-vhead { margin-bottom: 12px; }
.ph-me-tabs { display: flex; gap: 6px; margin: 6px 0 14px; flex-wrap: wrap; }
.ph-me-tab {
  display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 9px;
  border: 1px solid var(--p-border); background: var(--p-surface); color: var(--p-muted);
  font-size: 13px; cursor: pointer; transition: .15s;
}
.ph-me-tab:not(.on):hover { border-color: var(--p-indigo); color: var(--p-indigo); }
.ph-me-tab.on { background: var(--p-grad-btn); border-color: transparent; color: #fff; font-weight: 600; box-shadow: 0 4px 12px color-mix(in srgb, var(--p-indigo) 30%, transparent); }
.ph-me-tab:focus-visible { outline: 2px solid var(--p-indigo); outline-offset: 1px; }
.ph-me-panel { background: var(--p-surface); border: 1px solid var(--p-border); border-radius: 12px; padding: 16px; box-shadow: var(--p-shadow-sm); }
.ph-me-panel-h { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.ph-me-panel-h .t { font-size: 14px; font-weight: 700; color: var(--p-text); }
.ph-me-panel-h .n { font-size: 12px; color: var(--p-muted); }
.ph-me-state { padding: 26px 14px; text-align: center; color: var(--p-muted); font-size: 13px; line-height: 1.9; }
.ph-me-state.bad { color: var(--p-red); }
.ph-me-rows { display: flex; flex-direction: column; gap: 8px; }
.ph-me-row {
  display: grid; grid-template-columns: 1fr auto auto; gap: 12px; align-items: center;
  padding: 10px 12px; border-radius: 10px; border: 1px solid var(--p-border);
  background: var(--p-surface2); cursor: pointer; text-align: left; transition: .15s;
}
.ph-me-row:hover { border-color: var(--p-indigo); background: color-mix(in srgb, var(--p-indigo) 6%, transparent); }
.ph-me-row:focus-visible { outline: 2px solid var(--p-indigo); outline-offset: 1px; }
.ph-me-row .t { font-size: 13px; color: var(--p-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ph-me-row .p { font-size: 11px; color: var(--p-muted); }
.ph-me-row .d { font-size: 11px; padding: 2px 9px; border-radius: 99px; background: var(--p-surface); color: var(--p-muted); border: 1px solid var(--p-border); }
.ph-me-row .d.late { background: color-mix(in srgb, var(--p-red) 10%, transparent); color: var(--p-red); border-color: color-mix(in srgb, var(--p-red) 40%, transparent); font-weight: 600; }
.ph-me-row .d.today { background: color-mix(in srgb, var(--p-amber) 12%, transparent); color: var(--p-amber); border-color: color-mix(in srgb, var(--p-amber) 40%, transparent); font-weight: 600; }
.ph-me-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
.ph-me-card {
  display: flex; flex-direction: column; gap: 4px; text-align: left; padding: 12px;
  border-radius: 10px; border: 1px solid var(--p-border); background: var(--p-surface2); cursor: pointer; transition: .15s;
}
.ph-me-card:hover { border-color: var(--p-indigo); box-shadow: var(--p-shadow-sm); transform: translateY(-1px); }
.ph-me-card:focus-visible { outline: 2px solid var(--p-indigo); outline-offset: 1px; }
.ph-me-card .k { font-size: 11px; color: var(--p-muted); }
.ph-me-card .v { font-size: 14px; font-weight: 700; color: var(--p-text); }
.ph-me-card .h { font-size: 11px; color: var(--p-muted); }
.ph-me-pref { display: flex; align-items: center; gap: 14px; padding: 8px 0; flex-wrap: wrap; }
.ph-me-pref .k { font-size: 13px; color: var(--p-text); min-width: 96px; }
.ph-me-pref .v { font-size: 12px; color: var(--p-muted); }
.ph-me-note { margin-top: 12px; font-size: 11px; color: var(--p-faint); line-height: 1.8; }
.ph-me-scroll { max-height: 440px; overflow: auto; }
/* 我的规则：自由文本 + 保存（原型个人层第 4 tab） */
.ph-rules-area {
  width: 100%; min-height: 220px; resize: vertical; padding: 12px 14px;
  border: 1px solid var(--p-border); border-radius: 10px; background: var(--p-surface2);
  color: var(--p-text); font-size: 13px; line-height: 1.8; outline: none;
  font-family: inherit;
}
.ph-rules-area:focus { border-color: var(--p-indigo); }
.ph-rules-foot { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
.ph-rules-foot .hint { font-size: 12px; color: var(--p-muted); }

/* ══════════ 项目层头部（原型：返回总览 + 项目名 + 负责人 + 截止）══════════ */
.ph-projhead { display: flex; align-items: center; gap: 12px; padding: 14px 22px 0; flex-wrap: wrap; }
.ph-projhead h2 { font-size: 18px; color: var(--p-text); }
.ph-projhead .sub { color: var(--p-muted); font-size: 12.5px; }

/* 窄屏 */
@media (max-width: 720px) {
  .ph-me { padding: 14px; }
  .ph-projhead { padding: 12px 14px 0; }
}
`
  document.head.appendChild(el)
}

export default true