/**
 * privhub-admin-console · client 入口 —— 只做装配与声明，不承载任何实现。
 *
 * 提供 slot：
 *   admin-console  管理控制台外壳（AdminShell）
 *   admin-nav      其它管理插件的导航条目（由本插件侧栏渲染，不占图标栏）
 *   admin-view     **未直接使用**：管理页内容区由 AdminShell 按 slot 名（admin / acl /
 *                  audit / tags …）自己去骨架的 slotComps 里取并渲染，
 *                  这样插件被卸载时对应条目自动变为「未装载」。
 *
 * 其它模块职责见同目录文件：routes（路由表）/ store（状态）/ action（导航）/
 * shell（外壳）/ sidebar / topbar / breadcrumb / sectionheader / ui / panels /
 * confirm / toast / panelbus / styles。
 *
 * @module privhub-admin-console/client
 */

import './styles.js'
import { AdminShell } from './shell.js'

export default {
  id: 'privhub-admin-console',
  slots: {
    'admin-console': AdminShell,
  },
}
