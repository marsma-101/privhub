/**
 * store — 插件共享状态（reactive）。全局唯一实例，各模块 import 同一对象。
 *
 * 注意：这里只放【状态】。会操作状态的副作用（如 Esc 取消重命名）放在 ops。
 *
 * @module privhub-files-explorer-v3/client/store
 */

import { reactive } from './deps.js'

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
  newMenu: false,    // 侧边栏「+」下拉
  menu: false,       // 标签行右侧 ⋯ 菜单（字号/关闭标签/复制位置）
})

export { store }
