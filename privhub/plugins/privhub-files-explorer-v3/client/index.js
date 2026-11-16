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
 *   tree.js      目录树组件（旧左栏 tree slot；骨架已不再挂载，保留可回退）
 *   panel.js     中栏内容区（panel slot）：文件夹+文件列表 + 标签页 + 各类弹窗
 *   side.js      右侧可伸缩边栏（操作/详情两标签：上传/新建/查重 + 信息/标签/引用链/文件操作）
 *   detail.js    旧右侧详情面板（preview slot；骨架已不再挂载，保留可回退）
 *   fontzoom.js  顶栏整体缩放（user-area slot）
 *
 * 依赖方向严格单向：deps → utils → store → viewers → {content, tabs} → ops →
 * tree → side → panel → 本文件。
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
    /* tree / preview 槽仍声明（manifest 契约 + 可回退），但骨架 2026-11-13 起
     * 不再挂载它们：文件夹进中间列表，详情收进右侧可伸缩边栏（panel 内部组件 side.js）。 */
    tree: TreeV3,
    panel: PanelV3,
    preview: RightDetail,
    'user-area': FontZoom,
  },
}
