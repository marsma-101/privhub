/**
 * privhub-files-explorer-v3 · server（历史）
 *
 * 原「项目内查重」GET /api/duplicates 已于 M2.6 下线：查重功能整体并入
 * privhub-svc-rag 的 GET /api/rag/dup（同名同大小 + 内容一字不差双规则，
 * AI 工具「🔁 查重」页 + 文件页顶栏直达按钮），本插件不再提供服务端路由。
 * 插件位保留（其 client 提供文件面板 files-panel-v3 / files-tree-v3）。
 *
 * @module privhub-files-explorer-v3/server
 */

export const name = 'privhub-files-explorer-v3'
export const inject: string[] = []

export function apply(): void {
  /* 无 server 路由（查重端点已迁移至 privhub-svc-rag） */
}
