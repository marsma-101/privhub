/**
 * privhub-files-office2 · client — Office 原生观感预览替换钩子
 *
 * 监听 bus 'v3:md-rendered'（V3 内容区渲染完成，带 project/path/key）：
 *   - docx / xlsx 文件 → 把内容区的 md 预览替换为 iframe（本插件 view.html）
 *   - 其余类型不干预（pptx 保持现状 md 提取预览）
 *
 * 回退：卸载本插件（删除 plugins 目录）→ 监听者消失 → V3 恢复原 md 预览，零影响。
 *
 * @module privhub-files-office2/client
 */

const { bus } = window.PrivHub

const REPLACE_EXTS = ['.docx', '.xlsx']

/* Office 原生预览占满内容区：内容区改纵向布局，iframe 随窗口伸缩（不设下限 480px） */
const styleEl = document.createElement('style')
styleEl.textContent = `
.v3-content:has(iframe.office2-frame) { display:flex; flex-direction:column; padding:0; overflow:hidden; }
.v3-content:has(iframe.office2-frame) iframe.office2-frame { flex:1 1 auto; min-height:0; }
iframe.office2-frame { display:block; width:100%; height:100%; border:none; background:#fff; }
/* 注意：V3 的内容区已不再有 .v3-content-head（详情/⋯ 已移到标签行）。
   不要在这里重新引入任何占据内容区顶部的元素——否则又会变成
   「标签行 + 内容顶栏 + office 自身工具条」的多层顶栏与重叠干涉。 */
`
document.head.appendChild(styleEl)

const Office2Replace = {
  name: 'office2-replace',
  methods: {
    extOf(path) {
      const m = /\.([^.]+)$/.exec(path || '')
      return m ? '.' + m[1].toLowerCase() : ''
    },
    replace(payload) {
      if (!payload || !payload.project || !payload.path) return
      const ext = this.extOf(payload.path)
      if (!REPLACE_EXTS.includes(ext)) return
      // 当前内容区（V3 激活 tab 渲染处）
      const content = document.querySelector('.v3-content')
      if (!content) return
      // 幂等：已替换过则仅刷新 iframe src（内容可能变化）
      let frame = content.querySelector('iframe.office2-frame')
      if (frame) {
        frame.src = this.frameUrl(payload)
        return
      }
      // 隐藏 md 预览（V3 渲染的 officeToMd 结果），插入 iframe
      const md = content.querySelector('.v3-md')
      const txt = content.querySelector('.v3-text')
      const target = md || txt
      if (target) target.style.display = 'none'
      frame = document.createElement('iframe')
      frame.className = 'office2-frame'
      frame.src = this.frameUrl(payload)
      frame.style.cssText = 'width:100%;height:100%;flex:1 1 auto;min-height:0;border:none;background:#fff'
      // 作为内容区首个子元素插入：V3 已移除 .v3-content-head（内容区不再有顶栏），
      // 原先以它为锚点的写法会找不到元素而退化成 appendChild（顺序错乱）。
      content.prepend(frame)
    },
    frameUrl(payload) {
      return '/privhub-plugins/privhub-files-office2/view.html?project=' + encodeURIComponent(payload.project) +
        '&path=' + encodeURIComponent(payload.path) +
        '&name=' + encodeURIComponent(payload.name || payload.path.split('/').pop())
    },
  },
  mounted() {
    this._off = bus.on('v3:md-rendered', (payload) => { this.replace(payload) })
  },
  beforeUnmount() { if (this._off) this._off() },
  template: `<div style="display:none"></div>`,
}

export default {
  id: 'privhub-files-office2',
  slots: {
    'office-editor': Office2Replace,
  },
}
