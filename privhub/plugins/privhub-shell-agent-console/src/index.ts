/**
 * privhub-shell-agent-console · server（纯前端插件，无服务端路由）
 *
 * 「智能体接入」开发者平台界面：密钥管理 / 接入信息 / 接口文档。
 *
 * 数据全部来自 privhub-files-agent 已有的端点：
 *   - GET    /privhub/api/agent/v1/console    平台数据（网页登录态）
 *   - GET    /privhub/api/agent/v1/schema     接口清单（登录态或有效密钥）
 *   - GET    /privhub/api/agent/v1/my-keys    我的密钥（登录态）
 *   - POST   /privhub/api/agent/v1/my-keys    自助签发
 *   - DELETE /privhub/api/agent/v1/my-keys    自助吊销
 *   - GET/POST /privhub/api/agent/v1/keys     全部密钥（仅管理员）
 *   - POST   /privhub/api/agent/v1/keys/{revoke,suspend,resume,rotate}（仅管理员）
 * 本插件不新增任何服务端能力，只做界面编排。
 *
 * @module privhub-shell-agent-console/server
 */

export const name = 'privhub-shell-agent-console'
export const inject: string[] = []

export function apply(): void {
  /* 无 server 路由：界面所需数据由 privhub-files-agent 提供 */
}
