/**
 * privhub-files-versions · client — 版本历史浮层（office-editor slot 复用挂载）
 *
 * 监听 bus 'file:versions' { project, path, name }（V3 详情面板「版本历史」emit）：
 *   - 版本列表（时间/修改人/大小，最新在前）
 *   - 「＋ 创建快照」：保存当前内容为版本
 *   - 点击版本行 → 预览内容；「恢复此版本」→ 写回（自动生成新版本可反悔）
 *
 * @module privhub-files-versions/client
 */

const { api, bus } = window.PrivHub

const VersionsPanel = {
  name: 'versions-panel',
  data() {
    return {
      open: false,
      project: '',
      path: '',
      name: '',
      versions: [],
      loading: false,
      previewAt: 0,
      previewText: '',
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
      this.open = true
      this.previewAt = 0
      this.previewText = ''
      this.status = ''
      void this.refresh()
    },
    close() { this.open = false },
    async refresh() {
      this.loading = true
      try {
        const r = await api('/privhub/api/versions?project=' + encodeURIComponent(this.project) + '&path=' + encodeURIComponent(this.path))
        if (r.ok) this.versions = r.versions || []
        else this.status = r.error || '读取失败'
      } catch { this.status = '读取失败（网络错误）' }
      this.loading = false
    },
    async snapshot() {
      if (this.busy) return
      this.busy = true
      try {
        const r = await api('/privhub/api/versions/snapshot', { method: 'POST', body: JSON.stringify({ project: this.project, path: this.path }) })
        if (r.ok) { window.PrivHub.toast('已创建版本快照'); await this.refresh() }
        else window.PrivHub.toast(r.error || '快照失败', 'error')
      } catch { window.PrivHub.toast('快照失败（网络错误）', 'error') }
      this.busy = false
    },
    async preview(v) {
      if (this.previewAt === v.at && this.previewText) { this.previewAt = 0; this.previewText = ''; return }
      try {
        const r = await api('/privhub/api/versions?project=' + encodeURIComponent(this.project) + '&path=' + encodeURIComponent(this.path) + '&preview=1')
        if (r.ok) {
          const hit = (r.versions || []).find(x => x.at === v.at)
          if (hit) { this.previewAt = v.at; this.previewText = hit.content || '' }
        }
      } catch { /* 忽略 */ }
    },
    async restore(v) {
      if (!confirm('将「' + this.name + '」恢复为 ' + new Date(v.at).toLocaleString() + ' 的版本？恢复后会自动生成一个新版本（可反悔）。')) return
      this.busy = true
      try {
        const r = await api('/privhub/api/versions/restore', { method: 'POST', body: JSON.stringify({ project: this.project, path: this.path, at: v.at }) })
        if (r.ok) {
          window.PrivHub.toast('已恢复到 ' + new Date(v.at).toLocaleString() + ' 的版本')
          this.previewAt = 0
          this.previewText = ''
          bus.emit('md:changed', { project: this.project, path: this.path })
          await this.refresh()
        } else window.PrivHub.toast(r.error || '恢复失败', 'error')
      } catch { window.PrivHub.toast('恢复失败（网络错误）', 'error') }
      this.busy = false
    },
  },
  mounted() {
    this._off = bus.on('file:versions', (payload) => { this.openFor(payload) })
  },
  beforeUnmount() { if (this._off) this._off() },
  template: `
    <div v-if="open" class="modal-mask" @click.self="close">
      <div class="modal" style="width:480px">
        <h2>🕘 版本历史 · {{ name }}</h2>
        <div class="modal-body">
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
            <button class="btn btn-primary" style="width:auto" :disabled="busy" @click="snapshot">{{ busy ? '处理中…' : '＋ 创建快照' }}</button>
            <span style="font-size:12px;color:var(--muted)">每文件保留最近 20 个版本；恢复后自动生成新版本可反悔</span>
          </div>
          <div v-if="status" style="font-size:12px;color:var(--danger);margin-bottom:8px">{{ status }}</div>
          <div v-if="loading" style="color:var(--muted);font-size:12.5px;padding:12px 0">加载中…</div>
          <div v-else-if="versions.length === 0" style="color:var(--muted);font-size:12.5px;padding:12px 0">暂无版本，点「创建快照」保存当前内容</div>
          <div v-else style="max-height:300px;overflow:auto">
            <div
              v-for="v in versions" :key="v.at"
              style="display:flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid var(--line);border-radius:6px;margin-bottom:6px;font-size:12.5px;cursor:pointer"
              :style="{ background: previewAt === v.at ? 'rgba(90,130,200,.12)' : '' }"
              @click="preview(v)"
            >
              <span style="flex:1">{{ new Date(v.at).toLocaleString() }}</span>
              <span style="color:var(--muted)">{{ v.by }} · {{ v.len }} 字符</span>
              <button class="small-btn" @click.stop="restore(v)">恢复此版本</button>
            </div>
            <div v-if="previewAt" style="margin-top:8px">
              <div style="font-size:12px;color:var(--muted);margin-bottom:4px">版本预览（点击行收起）</div>
              <pre style="background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:10px;font-size:12px;white-space:pre-wrap;word-break:break-all;max-height:200px;overflow:auto">{{ previewText }}</pre>
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
  id: 'privhub-files-versions',
  slots: {
    'office-editor': VersionsPanel,
  },
}
