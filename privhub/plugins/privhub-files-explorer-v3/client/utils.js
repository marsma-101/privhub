/**
 * utils — 纯工具函数（无状态、无副作用）。
 * @module privhub-files-explorer-v3/client/utils
 */

import { api } from './deps.js'

const tabKey = (project, path) => project + '|' + path
function kindOf(name) {
  const ext = (name.split('.').pop() || '').toLowerCase()
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  if (ext === 'md') return 'md'
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return 'office'
  return 'text'
}
/* 可内嵌编辑的文本扩展名（与 privhub-files-edit-md 的 EDITABLE_TEXT_EXTS 保持一致） */
const TEXT_EDIT_EXTS = ['txt', 'json', 'csv', 'log', 'yaml', 'yml', 'ini', 'py', 'sh', 'bat', 'sql', 'xml', 'js', 'ts', 'css']
function isEditableText(name) {
  return TEXT_EDIT_EXTS.includes((name.split('.').pop() || '').toLowerCase())
}
function rawUrl(project, path) {
  return '/privhub/api/preview-raw?project=' + encodeURIComponent(project) + '&path=' + encodeURIComponent(path)
}
function relPath(project, dir, name) { return dir ? dir + '/' + name : name }

/* 整体缩放（页面字体 A±）：fixed 弹层会随 html zoom 一起缩放，事件坐标（clientX / rect）同为
 * 缩放后的视觉坐标 → 落位前除以 zoom 转回 css 布局坐标；钳制边界同样按 zoom 折算 */
function uiZoom() {
  return parseFloat(getComputedStyle(document.documentElement).zoom) || 1
}

export { tabKey, kindOf, TEXT_EDIT_EXTS, isEditableText, rawUrl, relPath, uiZoom }
