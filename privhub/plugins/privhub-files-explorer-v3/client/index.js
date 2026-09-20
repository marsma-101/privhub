/**
 * privhub-files-explorer-v3 · client — V3 布局（tree + panel + preview + user-area）
 *
 * 本文件只是【装配入口】：把各职责模块拼起来并导出 slot 组件。
 * 具体实现按职责拆在同目录下的模块里，改哪块只碰哪个文件：
 *
 *   deps.js      对 window.PrivHub / window.Vue 的依赖收敛点
 *   utils.js     纯工具函数（无状态）
 *   styles.js    本插件注入的全部样式
 *   store.js     共享状态（reactive）
 *   content.js   内容加载 + Markdown / Office→Markdown 渲染
 *   tabs.js      文件标签页（持久化 / 打开 / 激活 / 关闭）
 *   viewers.js   内容区 viewer 契约（注册表 + 挂载锚点 + 挂/卸生命周期，第二步 a）
 *   ops.js       ⋯ 菜单 + 文件操作（改名/复制/移动/删除/下载/编辑/新建）
 *   tree.js      左栏目录树（tree slot）
 *   panel.js     中栏内容区（panel slot）
 *   detail.js    右侧详情面板（preview slot）
 *   fontzoom.js  顶栏整体缩放（user-area slot）
 *
 * 依赖方向严格单向：deps → utils → store → viewers → {content, tabs} → ops → tree → panel → 本文件。
 * 新增功能时先判断它属于哪个模块；不要在这里堆逻辑。
 *
 * @module privhub-files-explorer-v3/client
 */

import './styles.js'                       // 副作用：注入样式
import { TreeV3 } from './tree.js'
import { PanelV3 } from './panel.js'
import { RightDetail } from './detail.js'
import { FontZoom } from './fontzoom.js'

export default {
  id: 'privhub-files-explorer-v3',
  slots: {
    tree: TreeV3,
    panel: PanelV3,
    preview: RightDetail,
    'user-area': FontZoom,
  },
}
