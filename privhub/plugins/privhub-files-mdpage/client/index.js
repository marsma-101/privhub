/**
 * privhub-files-mdpage · client — 监听 bus 'md:genpage' { project, path }
 * 调用生成接口并提示结果（V3 详情面板「生成页面」emit）。
 */
const { api, bus } = window.PrivHub

const MdPageCtrl = {
  name: 'mdpage-ctrl',
  methods: {
    async gen(payload) {
      if (!payload || !payload.project || !payload.path) return
      const r = await api('/privhub/api/mdpage/generate', { method: 'POST', body: JSON.stringify({ project: payload.project, path: payload.path }) })
      if (r.ok) {
        window.PrivHub.toast('已生成页面 🌐 ' + r.path)
        bus.emit('trash:changed', {})
      } else window.PrivHub.toast(r.error || '生成失败', 'error')
    },
  },
  mounted() {
    this._off = bus.on('md:genpage', (payload) => { void this.gen(payload) })
  },
  beforeUnmount() { if (this._off) this._off() },
  template: `<div style="display:none"></div>`,
}

export default {
  id: 'privhub-files-mdpage',
  slots: {
    'office-editor': MdPageCtrl,
  },
}
