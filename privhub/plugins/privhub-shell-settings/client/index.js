/**
 * privhub-shell-settings · client — 系统设置弹窗（settings slot）
 *
 * 主题切换即时生效（localStorage + applyTheme），并写回 /api/settings
 * （管理员）；管理员功能入口（用户管理）通过 window.PrivHub.openAdmin 打开。
 *
 * @module privhub-shell-settings/client
 */

const { api, THEME, applyTheme, AUTH, nav } = window.PrivHub

const SettingsPanel = {
  name: 'settings-panel',
  data() {
    return {
      theme: THEME,
      maxUploadMB: 2048,
      saved: false,
      myName: '',
      nameBusy: false,
    }
  },
  computed: {
    isAdmin() { return AUTH.user && AUTH.user.role === 'admin' },
    /** 当前登录态的真实姓名（= 名下文件夹的名字） */
    currentName() { return (AUTH.user && AUTH.user.displayName) || '' },
    /** 本人名下文件夹的目录名；未开通为 null */
    personalDir() { return (AUTH.user && AUTH.user.personalDir) || null },
    /** 输入是否与原姓名不同（决定是否显示改名警告） */
    nameChanged() { return this.myName.trim() !== '' && this.myName.trim() !== this.currentName },
  },
  async mounted() {
    this.myName = this.currentName
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
    /**
     * 改真实姓名。姓名与名下文件夹的名字是同一件事（联动），
     * 因此必须先明确告知用户「文件夹会一起改名」，确认后再提交。
     */
    async saveMyName() {
      if (this.nameBusy) return
      const next = this.myName.trim()
      if (!next) { window.PrivHub.toast('姓名不能为空', 'error'); return }
      if (next === this.currentName) { window.PrivHub.toast('姓名没有变化'); return }

      const pd = this.personalDir
      const msg = pd
        ? '确认把真实姓名改为「' + next + '」？\n\n'
          + '⚠ 你名下的文件夹会同步改名：\n'
          + '        ' + pd + '  →  ' + next + '\n\n'
          + '文件夹内的文件不会丢失；显示名、收藏/最近等引用会自动更新。\n'
          + '旧文件夹名将被系统永久保留（不会给别人用），以免历史数据被他人读到。'
        : '确认把真实姓名改为「' + next + '」？'
      if (!confirm(msg)) return

      this.nameBusy = true
      try {
        const r = await api('/privhub/api/me/display-name', { method: 'POST', body: JSON.stringify({ displayName: next }) })
        if (!r.ok) { window.PrivHub.toast(r.error || '修改失败', 'error'); return }
        // 刷新登录态与项目列表：文件夹名已变，左栏需要同步
        const me = await api('/privhub/api/me')
        if (me.ok) AUTH.user = me.user
        if (nav && nav.loadProjects) await nav.loadProjects()
        this.myName = this.currentName
        window.PrivHub.toast(r.renamedDir ? '姓名已修改，文件夹已同步改名' : '姓名已修改')
      } finally { this.nameBusy = false }
    },
  },
  template: `
    <div class="view-page">
      <div class="view-inner">
        <h2>⚙ 设置</h2>
        <div class="modal-body">
          <div style="font-size:13px;color:var(--muted);margin-bottom:12px">我的账号</div>
          <div class="field">
            <label>真实姓名</label>
            <div style="display:flex;gap:8px">
              <input v-model="myName" placeholder="请输入真实姓名" style="flex:1" @keyup.enter="saveMyName" />
              <button class="btn btn-primary" style="width:auto" :disabled="nameBusy || !nameChanged" @click="saveMyName">修 改</button>
            </div>
            <div class="field-hint" v-if="personalDir">
              你的文件夹名和它保持一致：<b>{{ personalDir }}</b>（仅你本人可见）。
            </div>
            <div class="field-hint" v-else>
              修改姓名不会影响文件。
            </div>
            <div class="field-hint" v-if="nameChanged && personalDir" style="color:var(--warn)">
              ⚠ 改名后你的文件夹会同步变为「{{ myName.trim() }}」，提交时会再次确认。
            </div>
          </div>

          <div style="margin-top:20px;font-size:13px;color:var(--muted);margin-bottom:12px">主题风格</div>
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
  drawerWidth: 420,
  slots: {
    settings: SettingsPanel,
    /* 管理控制台「系统运维 > 系统设置」用同一组件渲染（同一份实现、两处入口） */
    'admin-settings': SettingsPanel,
  },
}
