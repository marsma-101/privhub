/**
 * privhub-shell-tabs · client — 内容区多标签页（tabs slot）
 *
 * 监听 bus 'file:opened'：打开的位置（项目+路径）记录为标签（去重，
 * 上限 10），存 sessionStorage 刷新恢复。点击标签切换（nav.openDir），
 * 关闭按钮移除；当前激活标签高亮。
 *
 * @module privhub-shell-tabs/client
 */

const { nav, bus, AUTH } = window.PrivHub
const STORE_PREFIX = 'privhub_tabs_'

const TabsBar = {
  name: 'tabs-bar',
  data() {
    return { nav, tabs: [], userKey: '' }
  },
  computed: {
    // 当前用户可见项目（服务端 visibleProjects 已过滤；登录后 nav.projectsList 填充）
    visibleProjects() { return this.nav.projectsList || [] },
  },
  methods: {
    storeKey() {
      // 按用户名隔离：登出换用户后不串标签（无权限项目名/文件名不外泄）
      const u = AUTH.user ? AUTH.user.username : 'anon'
      return STORE_PREFIX + u
    },
    persist() {
      try { sessionStorage.setItem(this.storeKey(), JSON.stringify(this.tabs)) } catch { /* 忽略 */ }
    },
    restore() {
      try {
        const raw = sessionStorage.getItem(this.storeKey())
        if (raw) {
          const arr = JSON.parse(raw)
          if (Array.isArray(arr)) this.tabs = arr.slice(0, 10)
        }
      } catch { this.tabs = [] }
      // 权限过滤：只保留当前用户可见项目内的标签（防止历史标签泄露无权项目）
      const visible = this.visibleProjects
      if (visible && visible.length) {
        this.tabs = this.tabs.filter((t) => visible.includes(t.project))
        this.persist()
      }
    },
    addTab(payload) {
      if (!payload || payload.project === undefined || payload.path === undefined) return
      // 欢迎页/回收站等非目录打开不建标签
      if (payload.project === null) return
      const tab = { project: payload.project, path: payload.path }
      this.tabs = this.tabs.filter(t => !(t.project === tab.project && t.path === tab.path))
      this.tabs.push(tab)
      if (this.tabs.length > 10) this.tabs = this.tabs.slice(-10)
      this.persist()
    },
    isActive(t) {
      return nav.project === t.project && nav.path === t.path && !nav.trashView && !nav.searchView && !nav.favView
    },
    label(t) {
      return t.path === '' ? t.project : t.path.split('/').pop()
    },
    async go(t) {
      // 权限前置校验：无权限项目不打开（服务端同样 403，前端避免报错）
      const visible = this.visibleProjects
      if (visible && visible.length && !visible.includes(t.project)) {
        window.PrivHub.toast('无权限访问该项目', 'error')
        this.close(t)
        return
      }
      await nav.openDir(t.project, t.path)
    },
    close(t) {
      this.tabs = this.tabs.filter(x => !(x.project === t.project && x.path === t.path))
      this.persist()
    },
  },
  mounted() {
    this.restore()
    this._off = bus.on('file:opened', (payload) => { this.addTab(payload) })
    // 用户登录变化（登出/切换）→ 重新按新用户恢复标签（AUTH.user 由骨架 me() 恢复）
    this._unwatch = this.$watch(() => AUTH.user ? AUTH.user.username : '', () => {
      this.tabs = []
      this.restore()
    })
  },
  beforeUnmount() {
    if (this._off) this._off()
    if (this._unwatch) this._unwatch()
  },
  template: `
    <div style="display:flex;align-items:center;gap:4px;padding:6px 14px 0;border-bottom:1px solid var(--line);background:var(--panel);overflow-x:auto;scrollbar-width:none">
      <div
        v-for="t in tabs" :key="t.project + '/' + t.path"
        class="tab-item"
        :class="{ on: isActive(t) }"
        @click="go(t)"
        style="flex-shrink:0;display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:7px 7px 0 0;font-size:12.5px;cursor:pointer;color:var(--muted);border:1px solid transparent;white-space:nowrap;max-width:200px"
      >
        <span style="overflow:hidden;text-overflow:ellipsis">{{ label(t) }}</span>
        <span class="tab-close" @click.stop="close(t)" style="width:15px;height:15px;border-radius:50%;text-align:center;line-height:15px;font-size:11px;flex-shrink:0" title="关闭">✕</span>
      </div>
    </div>
  `,
}

export default {
  id: 'privhub-shell-tabs',
  slots: {
    tabs: TabsBar,
  },
}
