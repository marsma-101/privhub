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
      allowSelfRegister: true,
      saved: false,
      myName: '',
      nameBusy: false,
      curPw: '',
      newPw: '',
      pwBusy: false,
      version: '',
      uptime: '',
      origin: (typeof location !== 'undefined' && location.origin) || '',
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
    /** JT-01：两项都填了才允许提交（服务端还会再校验当前密码/长度/新旧不同） */
    canChangePw() { return this.curPw !== '' && this.newPw.length >= 6 && !this.pwBusy },
  },
  async mounted() {
    this.myName = this.currentName
    try {
      const r = await api('/privhub/api/settings')
      if (r.ok) {
        this.maxUploadMB = r.settings.maxUploadMB
        // PLAN-04：自助注册开关（服务端已有，此前面板无入口）。缺省 = 开（与后端 DEFAULT 一致）。
        this.allowSelfRegister = r.settings.allowSelfRegister !== false
        // 后端设置的默认主题若与本地不同，以本地（用户选择优先）为准
      }
    } catch { /* 读取失败用默认值 */ }
    // JT-09：把服务器版本/运行时长露出来，出问题时用户能报出具体版本
    try {
      const h = await api('/privhub/api/health')
      if (h && h.ok) {
        // 'unknown' 表示服务端没读到 package.json，此时宁可不显示也不显示 "vunknown"
        this.version = h.version && h.version !== 'unknown' ? h.version : ''
        const s = Math.floor(h.uptimeSeconds || 0)
        this.uptime = s >= 86400 ? Math.floor(s / 86400) + ' 天' : s >= 3600 ? Math.floor(s / 3600) + ' 小时' : Math.floor(s / 60) + ' 分钟'
      }
    } catch { /* 健康接口不可用时留空 */ }
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
    /** PLAN-04：切换自助注册。保存后才提示，失败回滚勾选状态（不静默宣称已改）。 */
    async toggleSelfRegister() {
      const next = this.allowSelfRegister
      const r = await api('/privhub/api/settings', { method: 'POST', body: JSON.stringify({ allowSelfRegister: next }) }).catch(() => null)
      if (!r || !r.ok) {
        this.allowSelfRegister = !next
        window.PrivHub.toast((r && r.error) || '保存失败', 'error')
        return
      }
      this.allowSelfRegister = r.settings.allowSelfRegister !== false
      window.PrivHub.toast(this.allowSelfRegister ? '已开放自助注册' : '已关闭自助注册（新人需管理员建号或邀请码）')
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
    /**
     * 改本人密码（JT-01）。需要当前密码；成功后服务端会让本人其它会话失效，
     * 本会话（当前 token/Cookie）保留，所以改完不用重新登录。
     */
    async changePassword() {
      if (this.pwBusy) return
      if (this.newPw.length < 6) { window.PrivHub.toast('新密码至少 6 位', 'error'); return }
      this.pwBusy = true
      try {
        const r = await api('/privhub/api/me/password', {
          method: 'POST',
          body: JSON.stringify({ currentPassword: this.curPw, newPassword: this.newPw }),
        }).catch(() => null)
        if (!r || !r.ok) { window.PrivHub.toast((r && r.error) || '修改失败', 'error'); return }
        this.curPw = ''
        this.newPw = ''
        window.PrivHub.toast('密码已修改，其它设备上的登录已失效')
      } finally { this.pwBusy = false }
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

          <!-- JT-01 修改密码：此前只有管理员能重置他人密码，用户自己没有入口 -->
          <div style="margin-top:20px;font-size:13px;color:var(--muted);margin-bottom:12px">登录密码</div>
          <div class="field">
            <label>当前密码</label>
            <input v-model="curPw" type="password" autocomplete="current-password" placeholder="请输入当前密码" />
          </div>
          <div class="field">
            <label>新密码</label>
            <div style="display:flex;gap:8px">
              <input v-model="newPw" type="password" autocomplete="new-password" placeholder="至少 6 位" style="flex:1" @keyup.enter="changePassword" />
              <button class="btn btn-primary" style="width:auto" :disabled="!canChangePw" @click="changePassword">{{ pwBusy ? '提交中…' : '修 改' }}</button>
            </div>
            <div class="field-hint">改完后，你在其它设备/浏览器上的登录会退出，本窗口保持登录。</div>
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
            <div style="font-size:13px;color:var(--muted);margin-bottom:12px">自助注册</div>
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text);cursor:pointer">
              <input type="checkbox" v-model="allowSelfRegister" @change="toggleSelfRegister" style="width:16px;height:16px;cursor:pointer" />
              允许新用户自助注册
            </label>
            <div class="field-hint">
              {{ allowSelfRegister ? '任何人可自行注册账号。' : '关闭后新人须由管理员建号，或走邀请码加入。' }}
            </div>
          </div>
          <div v-if="isAdmin" style="margin-top:20px">
            <div style="font-size:13px;color:var(--muted);margin-bottom:12px">管理员功能</div>
            <button class="btn btn-primary" style="width:auto" @click="openAdmin">👥 用户管理</button>
          </div>
        </div>
        <!-- JT-09 / JT-21：版本与服务器地址，出问题时用户能直接报出这两个值 -->
        <div v-if="version || origin" style="margin-top:20px;padding-top:12px;border-top:1px solid rgba(128,128,128,.25);font-size:12px;color:var(--muted)">
          <span v-if="version">PrivHub v{{ version }}</span>
          <span v-if="version && uptime"> · 已运行 {{ uptime }}</span>
          <div v-if="origin" style="margin-top:4px">服务器地址：{{ origin }}</div>
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
