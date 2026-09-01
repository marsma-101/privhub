/**
 * privhub-files-publish · client — HTML 发布浮层（office-editor slot 复用挂载）
 *
 * 监听 bus 'html:publish' { project, path, name }（V3 详情面板「发布」emit）：
 *   - 生成/复用内网只读链接（/pub?code=…）
 *   - 复制链接 / 新窗口打开 / 撤销
 *
 * @module privhub-files-publish/client
 */

const { api, bus, AUTH } = window.PrivHub

const PublishPanel = {
  name: 'publish-panel',
  data() {
    return {
      open: false,
      project: '',
      path: '',
      name: '',
      url: '',
      list: [],
      busy: false,
      status: '',
    }
  },
  methods: {
    openFor(payload) {
      if (!payload || !payload.project || !payload.path) return
      this.project = payload.project
      this.path = payload.path
      this.name = payload.name || payload.path.split('/').pop()
      this.url = ''
      this.status = ''
      this.open = true
      void this.refresh()
    },
    close() { this.open = false },
    async refresh() {
      try {
        const r = await api('/privhub/api/publish/list')
        if (r.ok) this.list = (r.publishes || []).filter(p => p.project === this.project && p.path === this.path)
      } catch { /* 忽略 */ }
    },
    async create(expiresHours) {
      if (this.busy) return
      this.busy = true
      try {
        const r = await api('/privhub/api/publish', { method: 'POST', body: JSON.stringify({ project: this.project, path: this.path, expiresHours }) })
        if (r.ok) {
          this.url = location.origin + r.url
          this.status = r.reused ? '已复用该页面的既有链接' : '发布成功'
          await this.refresh()
        } else this.status = r.error || '发布失败'
      } catch { this.status = '发布失败（网络错误）' }
      this.busy = false
    },
    async copy() {
      if (!this.url) return
      try {
        await navigator.clipboard.writeText(this.url)
        window.PrivHub.toast('链接已复制 📋')
      } catch { window.PrivHub.toast('请手动复制：' + this.url, 'warn') }
    },
    openLink() { if (this.url) window.open(this.url, '_blank') },
    async revoke(code) {
      if (!confirm('撤销后链接立即失效，任何人无法再访问。确定？')) return
      const r = await api('/privhub/api/publish?code=' + encodeURIComponent(code), { method: 'DELETE' })
      if (r.ok) { window.PrivHub.toast('已撤销发布'); if (code === this.url.split('code=')[1]) this.url = ''; await this.refresh() }
      else window.PrivHub.toast(r.error || '撤销失败', 'error')
    },
    isMine(p) { return p.createdBy === AUTH.user.username || AUTH.user.role === 'admin' },
  },
  mounted() {
    this._off = bus.on('html:publish', (payload) => { this.openFor(payload) })
  },
  beforeUnmount() { if (this._off) this._off() },
  template: `
    <div v-if="open" class="modal-mask" @click.self="close">
      <div class="modal" style="width:460px">
        <h2>🔗 发布页面 · {{ name }}</h2>
        <div class="modal-body">
          <div style="font-size:12.5px;color:var(--muted);margin-bottom:10px">发布为内网只读链接：任何人打开链接即可查看该 HTML 页面（无需登录），不显示文件系统入口。</div>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="btn btn-primary" style="width:auto" :disabled="busy" @click="create(0)">{{ busy ? '发布中…' : '发布 / 刷新链接' }}</button>
            <button class="icon-btn" :disabled="busy" @click="create(24)">24 小时</button>
            <button class="icon-btn" :disabled="busy" @click="create(7 * 24)">7 天</button>
          </div>
          <div v-if="url" style="display:flex;gap:8px;align-items:center;margin-top:12px;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--panel2)">
            <code style="flex:1;font-size:12.5px;word-break:break-all">{{ url }}</code>
            <button class="icon-btn" @click="copy">复制</button>
            <button class="icon-btn" @click="openLink">打开</button>
          </div>
          <div v-if="status" style="font-size:12px;color:var(--accent);margin-top:8px">{{ status }}</div>
          <div v-if="list.length" style="margin-top:14px">
            <div style="font-size:12.5px;color:var(--muted);margin-bottom:6px">发布记录（{{ list.length }}）</div>
            <div v-for="p in list" :key="p.code" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid var(--line);border-radius:6px;margin-bottom:6px;font-size:12px">
              <code style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ p.url }}</code>
              <span style="color:var(--muted);flex-shrink:0">{{ p.expiresAt ? '至 ' + new Date(p.expiresAt).toLocaleString() : '永久' }}</span>
              <span v-if="isMine(p)" style="color:var(--danger);cursor:pointer;flex-shrink:0" title="撤销" @click="revoke(p.code)">✕</span>
            </div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="close">关 闭</button>
        </div>
      </div>
    </div>
  `,
}

export default {
  id: 'privhub-files-publish',
  slots: {
    'office-editor': PublishPanel,
  },
}
