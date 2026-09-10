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

/* 模块级监听（唯一）：F07 长按菜单 emit 的收藏事件。
 * 注意：组件内【不再】重复监听同一事件——原实现两处都监听，
 * 导致收藏夹视图打开时一次收藏发出两次 POST（服务端有去重，但仍是浪费）。
 * 组件挂载时通过 'favorites:changed' 刷新列表，与写入路径解耦。 */
bus.on('fav:add', async (payload) => {
  try {
    const r = await api('/privhub/api/favorites', { method: 'POST', body: JSON.stringify(payload) })
    if (r.ok) bus.emit('favorites:changed', { name: payload.name })
  } catch { /* 静默：失败不影响主流程 */ }
})

const FavView = {
  name: 'fav-view',
  data() {
    return { nav, all: [] }
  },
  computed: {
    // 项目上下文：只显示当前项目内的收藏
    shown() {
      if (!this.nav.project) return []
      return this.all.filter((f) => f.project === this.nav.project)
    },
  },
  methods: {
    async load() {
      try {
        const r = await api('/privhub/api/favorites')
        // shown 为 computed（依赖 all 与 nav.project），此处只需赋值 all
        if (r.ok) this.all = r.favorites
      } catch { this.all = [] }
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
    // 只订阅「已变更」通知，不再直接监听写入事件（避免二次 POST）
    this._off = bus.on('favorites:changed', () => { void this.load() })
  },
  beforeUnmount() { if (this._off) this._off() },
  template: `
    <div style="display:contents">
      <div class="main-head">
        <span class="breadcrumb"><span style="color:var(--text)">⭐ 收藏</span></span>
        <span class="crumb" style="margin-left:8px">{{ nav.project ? '当前项目：' + nav.project + '（' + shown.length + ' 项）' : '未选择项目' }}</span>
      </div>
      <div class="main-body">
        <div v-if="!nav.project" class="empty">
          <div style="font-size:15px;margin-bottom:6px">请先选择一个项目</div>
          <div>收藏仅显示当前项目内的内容。返回文件视图，在左侧选择项目后再查看。</div>
          <button class="btn btn-primary" style="width:auto;margin-top:14px" @click="nav.backToWelcome">去选择项目 →</button>
        </div>
        <div v-else-if="shown.length === 0" class="empty">当前项目还没有收藏。在文件上长按选择「⭐ 收藏」。</div>
        <div v-else class="file-table-wrap">
          <div class="file-table-head" style="grid-template-columns:1fr 130px 90px">
            <span class="col-name">名称</span>
            <span class="col-size">路径</span>
            <span class="col-time">操作</span>
          </div>
          <div v-for="e in shown" :key="e.project + '/' + e.path" class="file-table-row" style="grid-template-columns:1fr 130px 90px">
            <span class="col-name"><span class="tico">{{ e.isDir ? '📂' : '📄' }}</span>{{ e.name }}</span>
            <span class="col-size">{{ e.path }}</span>
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
