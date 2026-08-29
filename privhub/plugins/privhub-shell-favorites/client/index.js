/**
 * privhub-shell-favorites · client — 收藏视图（fav-view slot）
 *
 * 图标栏星标入口 → 收藏列表（点击跳转原路径，可取消收藏）。
 * 文件面板右键「⭐ 收藏」通过 bus 'fav:add' 事件进入（由 F07 explorer
 * 的长按菜单 emit，本插件监听后调 API 并刷新）。
 *
 * @module privhub-shell-favorites/client
 */

const { api, nav, bus } = window.PrivHub

/* 模块级监听：F07 长按菜单 emit 的收藏事件（视图未打开时也生效） */
bus.on('fav:add', async (payload) => {
  try {
    const r = await api('/privhub/api/favorites', { method: 'POST', body: JSON.stringify(payload) })
    if (r.ok) bus.emit('favorites:changed', { name: payload.name })
  } catch { /* 静默 */ }
})

const FavView = {
  name: 'fav-view',
  data() {
    return { nav, list: [] }
  },
  methods: {
    async load() {
      try {
        const r = await api('/privhub/api/favorites')
        if (r.ok) this.list = r.favorites
      } catch { this.list = [] }
    },
    async add(payload) {
      const r = await api('/privhub/api/favorites', { method: 'POST', body: JSON.stringify(payload) })
      if (r.ok) bus.emit('favorites:changed', { name: payload.name })
      await this.load()
    },
    async remove(e) {
      const r = await api('/privhub/api/favorites', { method: 'DELETE', body: JSON.stringify({ project: e.project, path: e.path }) })
      if (r.ok) bus.emit('favorites:changed', { name: e.name })
      await this.load()
    },
    async go(e) {
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
    this._off = bus.on('fav:add', (payload) => { this.add(payload) })
  },
  beforeUnmount() { if (this._off) this._off() },
  template: `
    <div style="display:contents">
      <div class="main-head">
        <span class="breadcrumb"><span style="color:var(--text)">⭐ 收藏</span></span>
        <span class="crumb" style="margin-left:8px">共 {{ list.length }} 项</span>
      </div>
      <div class="main-body">
        <div v-if="list.length === 0" class="empty">还没有收藏。在文件上长按选择「⭐ 收藏」。</div>
        <div v-else class="file-table-wrap">
          <div class="file-table-head" style="grid-template-columns:1fr 130px 90px">
            <span class="col-name">名称</span>
            <span class="col-size">路径</span>
            <span class="col-time">操作</span>
          </div>
          <div v-for="e in list" :key="e.project + '/' + e.path" class="file-table-row" style="grid-template-columns:1fr 130px 90px">
            <span class="col-name"><span class="tico">{{ e.isDir ? '📂' : '📄' }}</span>{{ e.name }}</span>
            <span class="col-size">{{ e.project }} / {{ e.path }}</span>
            <span>
              <button class="small-btn" @click="go(e)">{{ e.isDir ? '进入' : '定位' }}</button>
              <button class="small-btn danger" style="margin-left:6px" @click="remove(e)">取消</button>
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
}

export default {
  id: 'privhub-shell-favorites',
  slots: {
    'fav-view': FavView,
  },
}
