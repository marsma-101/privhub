/**
 * privhub-shell-settings · client — 系统设置弹窗（settings slot）
 *
 * 主题切换即时生效（localStorage + applyTheme），并写回 /api/settings
 * （管理员）；管理员功能入口（用户管理）通过 window.PrivHub.openAdmin 打开。
 *
 * @module privhub-shell-settings/client
 */

const { api, THEME, applyTheme, AUTH } = window.PrivHub

const SettingsPanel = {
  name: 'settings-panel',
  data() {
    return {
      theme: THEME,
      maxUploadMB: 2048,
      saved: false,
    }
  },
  computed: {
    isAdmin() { return AUTH.user && AUTH.user.role === 'admin' },
  },
  async mounted() {
    try {
      const r = await api('/privhub/api/settings')
      if (r.ok) {
        this.maxUploadMB = r.settings.maxUploadMB
        // 后端设置的默认主题若与本地不同，以本地（用户选择优先）为准
      }
    } catch { /* 读取失败用默认值 */ }
  },
  methods: {
    setTheme(t) {
      this.theme.theme = t
      applyTheme()
      this.save({ theme: t })
    },
    async save(patch) {
      try { await api('/privhub/api/settings', { method: 'POST', body: JSON.stringify(patch) }) } catch { /* 静默 */ }
    },
    async saveUploadLimit() {
      await this.save({ maxUploadMB: this.maxUploadMB })
      this.saved = true
      setTimeout(() => { this.saved = false }, 1500)
    },
    openAdmin() {
      this.$emit('close')
      window.PrivHub.openAdmin && window.PrivHub.openAdmin()
    },
  },
  template: `
    <div class="modal-mask" @click.self="$emit('close')">
      <div class="modal">
        <h2>⚙ 设置</h2>
        <div class="modal-body">
          <div style="font-size:13px;color:var(--muted);margin-bottom:12px">主题风格</div>
          <div class="theme-opts">
            <div class="theme-opt" :class="{ active: theme.theme === 'light' }" @click="setTheme('light')">
              <div class="theme-swatch swatch-light"></div>
              <div>浅色（护眼）</div>
            </div>
            <div class="theme-opt" :class="{ active: theme.theme === 'dark' }" @click="setTheme('dark')">
              <div class="theme-swatch swatch-dark"></div>
              <div>深色（护眼）</div>
            </div>
          </div>
          <div v-if="isAdmin" style="margin-top:20px">
            <div style="font-size:13px;color:var(--muted);margin-bottom:12px">上传限制（MB）</div>
            <div class="field" style="display:flex;gap:8px">
              <input v-model.number="maxUploadMB" type="number" min="1" max="8192" style="flex:1" />
              <button class="btn btn-primary" style="width:auto" @click="saveUploadLimit">保存</button>
              <span v-if="saved" style="color:var(--warn);font-size:12px;line-height:38px">已保存</span>
            </div>
          </div>
          <div v-if="isAdmin" style="margin-top:20px">
            <div style="font-size:13px;color:var(--muted);margin-bottom:12px">管理员功能</div>
            <button class="btn btn-primary" style="width:auto" @click="openAdmin">👥 用户管理</button>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="$emit('close')">关 闭</button>
        </div>
      </div>
    </div>
  `,
}

export default {
  id: 'privhub-shell-settings',
  slots: {
    settings: SettingsPanel,
  },
}
