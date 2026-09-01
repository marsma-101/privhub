/**
 * privhub-files-dataview · client — 监听 bus 'dataview:new' → 生成数据看板页面
 */
const { api, bus } = window.PrivHub

const DataViewCtrl = {
  name: 'dataview-ctrl',
  methods: {
    async create(payload) {
      const project = payload && payload.project ? payload.project : (window.PrivHub.nav.project || '')
      if (!project) { window.PrivHub.toast('请先选择项目', 'warn'); return }
      const r = await api('/privhub/api/dataview/new', { method: 'POST', body: JSON.stringify({ project, dir: payload && payload.dir ? payload.dir : '' }) })
      if (r.ok) {
        window.PrivHub.toast('已创建数据看板 📊 ' + r.path)
        bus.emit('trash:changed', {})
      } else window.PrivHub.toast(r.error || '创建失败', 'error')
    },
  },
  mounted() {
    this._off = bus.on('dataview:new', (payload) => { void this.create(payload) })
  },
  beforeUnmount() { if (this._off) this._off() },
  template: `<div style="display:none"></div>`,
}

export default {
  id: 'privhub-files-dataview',
  slots: {
    'office-editor': DataViewCtrl,
  },
}
