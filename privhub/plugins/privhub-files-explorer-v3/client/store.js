/**
 * store — 插件共享状态（reactive）。全局唯一实例，各模块 import 同一对象。
 *
 * 注意：这里只放【状态】。会操作状态的副作用（如 Esc 取消重命名）放在 ops。
 *
 * @module privhub-files-explorer-v3/client/store
 */

import { reactive } from './deps.js'

/* localStorage 读取守卫：浏览器里正常读；Node 沙箱（preview-limits 等）没有它时回退默认。
 * 与 tabs.js 的 sessionStorage 用法同一口径——持久化是锦上添花，读不到不该炸模块。 */
function lsGet(key, fallback) {
  try { return (typeof localStorage !== 'undefined' && localStorage.getItem(key)) || fallback } catch { return fallback }
}

/* ================= 共享 store（树缓存 + 文件标签 + 弹窗） ================= */
const store = reactive({
  tree: {},          // key(project + '/' + path) -> { expanded, children: [{name,path,isDir,type,sizeText,mtime}] }
  tabs: [],          // [{ key, project, path, name, kind, sizeText, type }]
  activeKey: '',     // 激活 tab key
  content: null,     // { key, state: 'loading'|'ready'|'error', text, markdown, url, office, error }
  ctxMenu: null,     // { x, y, entry, kind }  ⋯/右键/长按共用
  permTarget: null,
  promptState: null, // { mode:'move'|'mkdir', title, value, target }
  renameState: null, // 行内重命名 { project, dirPath, entry, value }
  moveState: null,   // 移动选择器 { project, from, entry, tree:[{path,name,depth}], loading, target, busy }
  lightbox: null,    // 图片放大预览 url
  newMenu: false,    // 侧边栏「+」下拉（旧树头部；树已不在骨架挂载，保留兼容）
  menu: false,       // 标签行右侧 ⋯ 菜单（字号/关闭标签/复制位置）
  headMenu: false,   // 文件区头部「⋯ 整理」下拉（排序/视图/筛选/刷新合并于此）
  detailMenu: false, // 兼容旧开关（详情下拉已收进右侧边栏，保留字段不报错）
  /* 右侧可伸缩边栏（2026-11-13 二次重排）：动作 + 详情合并成一个带标签的抽屉。
   * 默认收起（中间区干净），「ℹ️ 详情」按钮打开；sideTab 当前标签
   * （actions=常用操作 / detail=选中项详情）；sideWidth 拖左缘调整，localStorage 持久化。 */
  sideOpen: lsGet('privhub_side_open', '0') === '1',
  sideTab: 'actions',
  sideWidth: Math.min(420, Math.max(220, parseInt(lsGet('privhub_side_w', '280'), 10) || 280)),
})

export { store }
