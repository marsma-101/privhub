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
      frame.style.cssText = 'width:100%;flex:1;min-height:480px;border:none;border-radius:8px;background:#fff'
      const body = content.querySelector('.v3-content-head')
      if (body) body.after(frame)
      else content.appendChild(frame)
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
