/**
 * privhub-shell-recent · client — 最近打开下拉（user-area slot）
 *
 * 监听 bus 'file:opened' 记录最近（POST /api/recent）；
 * 顶栏「最近」下拉展示最近 20 条，点击直接定位到所在目录。
 *
 * @module privhub-shell-recent/client
 */

const { api, nav, bus } = window.PrivHub

const RecentDropdown = {
  name: 'recent-dropdown',
  data() {
    return { open: false, recent: [] }
  },
  methods: {
    async load() {
      try {
        const r = await api('/privhub/api/recent')
        if (r.ok) this.recent = r.recent
      } catch { this.recent = [] }
    },
    async record(payload) {
      // 登出瞬间 token 已清空时跳过（避免登出后残留 401 请求）
      if (!window.PrivHub.AUTH.token) return
      try {
        const r = await api('/privhub/api/recent', { method: 'POST', body: JSON.stringify(payload) })
        if (r.ok) bus.emit('recent:updated')
      } catch { /* 静默 */ }
    },
    async go(e) {
      this.open = false
      if (e.isDir) await nav.openDir(e.project, e.path)
      else {
        const dir = e.path.includes('/') ? e.path.slice(0, e.path.lastIndexOf('/')) : ''
        await nav.openDir(e.project, dir)
        const hit = nav.entries.find(x => x.name === e.name)
        if (hit) nav.selectEntry(hit)
      }
    },
  },
  async mounted() {
    await this.load()
    // 打开任意目录都记录最近（file:opened 由 nav.openDir emit）
    this._off = bus.on('file:opened', (payload) => {
      if (payload && payload.project && payload.path !== undefined) {
        const name = payload.path === '' ? payload.project : payload.path.split('/').pop()
        this.record({ project: payload.project, path: payload.path, name, isDir: true })
        this.load()
      }
    })
  },
  beforeUnmount() { if (this._off) this._off() },
  template: `
    <div style="position:relative">
      <button class="icon-btn" :class="{ on: open }" @click="open = !open; if (open) load()">🕘 最近</button>
      <div v-if="open" class="ctx-mask" @click="open = false" style="position:fixed;inset:0;z-index:998"></div>
      <div v-if="open" style="position:absolute;right:0;top:34px;z-index:999;width:300px;background:var(--panel2);border:1px solid var(--line);border-radius:10px;box-shadow:0 12px 34px rgba(0,0,0,.18);padding:8px;max-height:420px;overflow:auto">
        <div style="font-size:12px;color:var(--muted);padding:4px 8px 8px">最近打开（{{ recent.length }}）</div>
        <div v-if="recent.length === 0" style="font-size:12px;color:var(--muted);padding:12px;text-align:center">暂无记录</div>
        <div v-for="e in recent" :key="e.project + '/' + e.path" class="tree-item" @click="go(e)" style="font-size:12.5px">
          <span>{{ e.isDir ? '📂' : '📄' }}</span>
          <span class="name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ e.isDir ? (e.path === '' ? e.project : e.path) : e.name }}</span>
          <span style="color:var(--muted);font-size:11px;flex-shrink:0">{{ e.project }}</span>
        </div>
      </div>
    </div>
  `,
}

export default {
  id: 'privhub-shell-recent',
  slots: {
    'user-area': RecentDropdown,
  },
}
