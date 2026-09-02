/**
 * privhub-files-invite · client — 邀请成员浮层（office-editor slot 复用挂载）
 *
 * 监听 bus 'invite:open' { project }（V3 树根 ⋯ 菜单「邀请成员」emit）：
 *   - 生成/复用邀请码 → 显示复制链接
 *   - 当前项目邀请列表 + 撤销
 *
 * @module privhub-files-invite/client
 */

const { api, bus, AUTH } = window.PrivHub

const InvitePanel = {
  name: 'invite-panel',
  data() {
    return {
      open: false,
      project: '',
      code: '',
      invites: [],
      busy: false,
      status: '',
    }
  },
  methods: {
    openFor(payload) {
      if (!payload || !payload.project) return
      this.project = payload.project
      this.code = ''
      this.invites = []
      this.open = true
      this.status = ''
      void this.refresh()
    },
    close() { this.open = false },
    async refresh() {
      try {
        const r = await api('/privhub/api/invite/list')
        if (r.ok) this.invites = (r.invites || []).filter(i => i.project === this.project)
      } catch { /* 忽略 */ }
    },
    async create(expiresHours) {
      if (!this.project || this.busy) return
      this.busy = true
      try {
        const r = await api('/privhub/api/invite/create?project=' + encodeURIComponent(this.project) + (expiresHours ? '&expiresHours=' + expiresHours : ''))
        if (r.ok) {
          this.code = r.code
          this.status = r.reused ? '已复用该项目的永久邀请码' : '邀请码已生成'
          await this.refresh()
        } else this.status = r.error || '生成失败'
      } catch { this.status = '生成失败（网络错误）' }
      this.busy = false
    },
    async copyCode() {
      if (!this.code) return
      const url = location.origin + '/privhub/#invite=' + this.code
      try {
        await navigator.clipboard.writeText(url)
        window.PrivHub.toast('邀请链接已复制 📋')
      } catch {
        // 兜底：提示手动复制
        window.PrivHub.toast('请手动复制：' + url, 'warn')
      }
    },
    async revoke(code) {
      if (!confirm('撤销该邀请后，链接立即失效。确定？')) return
      const r = await api('/privhub/api/invite?code=' + encodeURIComponent(code), { method: 'DELETE' })
      if (r.ok) { window.PrivHub.toast('邀请已撤销'); await this.refresh() }
      else window.PrivHub.toast(r.error || '撤销失败', 'error')
    },
  },
  mounted() {
    this._off = bus.on('invite:open', (payload) => { this.openFor(payload) })
  },
  beforeUnmount() { if (this._off) this._off() },
  template: `
    <div v-if="open" class="modal-mask" @click.self="close">
      <div class="modal" style="width:440px">
        <h2>📨 邀请成员 · {{ project }}</h2>
        <div class="modal-body">
          <div style="font-size:12.5px;color:var(--muted);margin-bottom:10px">复制邀请链接发给同事，对方打开链接输入自己的账号即可加入「{{ project }}」项目。</div>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="btn btn-primary" style="width:auto" :disabled="busy" @click="create(0)">{{ busy ? '生成中…' : '＋ 生成永久邀请' }}</button>
            <button class="icon-btn" :disabled="busy" @click="create(24)">24 小时</button>
            <button class="icon-btn" :disabled="busy" @click="create(7 * 24)">7 天</button>
          </div>
          <div v-if="code" style="display:flex;gap:8px;align-items:center;margin-top:12px;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--panel2)">
            <code style="flex:1;font-size:13px;word-break:break-all">{{ locationOrigin }}/#invite={{ code }}</code>
            <button class="icon-btn" @click="copyCode">复制</button>
          </div>
          <div v-if="status" style="font-size:12px;color:var(--accent);margin-top:8px">{{ status }}</div>
          <div v-if="invites.length" style="margin-top:14px">
            <div style="font-size:12.5px;color:var(--muted);margin-bottom:6px">当前有效邀请（{{ invites.length }}）</div>
            <div v-for="inv in invites" :key="inv.code" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid var(--line);border-radius:6px;margin-bottom:6px;font-size:12.5px">
              <code style="flex:1">{{ inv.code }}</code>
              <span style="color:var(--muted);font-size:11.5px">{{ inv.expiresAt ? '有效期至 ' + new Date(inv.expiresAt).toLocaleString() : '永久' }} · {{ inv.createdBy }}</span>
              <span style="color:var(--danger);cursor:pointer" title="撤销" @click="revoke(inv.code)">✕</span>
            </div>
          </div>
          <div v-else-if="!code" style="font-size:12px;color:var(--muted);margin-top:10px">暂无邀请链接</div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="close">关 闭</button>
        </div>
      </div>
    </div>
  `,
}

InvitePanel.computed = {
  locationOrigin() { return location.origin },
}

export default {
  id: 'privhub-files-invite',
  slots: {
    'office-editor': InvitePanel,
  },
}
