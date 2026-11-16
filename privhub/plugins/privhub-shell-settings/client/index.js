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
      maxUploadMB: 0,
      allowSelfRegister: true,
      /* v6 存储布局：与后端 Settings 一一对应。
       * 全部默认「原有行为」—— 地址留空走默认、加密保持开启。 */
      dataFilesDir: '',
      publicLinkDir: '',
      tempUploadDir: '',
      plainStorage: false,
      storageSaved: false,
      saved: false,
      myName: '',
      nameBusy: false,
      curPw: '',
      newPw: '',
      pwBusy: false,
      version: '',
      uptime: '',
      origin: (typeof location !== 'undefined' && location.origin) || '',
      /* 「关于」：当前版本 + 蓝绿槽版本 + 更新记录（后两项仅管理员看得到）。
         主人 2026-11-15：版本标注只放在关于里，前端其他地方不显示槽信息。 */
      about: { current: '', deployment: '', slots: [], history: [], switchedAt: null, note: '', controlReachable: null },
    }
  },
  computed: {
    isAdmin() { return !!(window.PrivHub && window.PrivHub.isManager && window.PrivHub.isManager()) },
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
          /* v6 存储布局：读回当前值（空串表示「用默认」，不要渲染成 undefined）。 */
          this.dataFilesDir = r.settings.dataFilesDir || ''
          this.publicLinkDir = r.settings.publicLinkDir || ''
          this.tempUploadDir = r.settings.tempUploadDir || ''
          this.plainStorage = r.settings.plainStorage === true
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

    /* 「关于」：只有管理员能拿到槽版本与更新记录（接口也做了一次校验，
       前端 `v-if="isAdmin"` 只是不再白跑一次必然 403 的请求）。 */
    if (this.isAdmin) {
      try {
        const a = await api('/privhub/api/update/about')
        if (a && a.ok) this.about = Object.assign(this.about, a)
      } catch { /* 非蓝绿部署 / 控制层不可达：保持默认空值，界面不显示槽块 */ }
    }
  },
  methods: {
    /** ISO → 本地「MM-DD HH:mm」，关于页只做简短标注，不引入日期库。 */
    fmtTime(iso) {
      if (!iso) return ''
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return ''
      const p = (n) => String(n).padStart(2, '0')
      return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
    },
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
    /**
     * 保存存储布局（v6）。
     *
     * 这几项**都需要重启才生效**（路径在进程启动第一条就被求值，加密开关在
     * svc-storage 构造期固化），所以保存成功后必须明确提示「重启后生效」，
     * 不能让人以为立刻就好了 —— 否则管理员会以为配错了。
     */
    async saveStorage() {
      const patch = {
        dataFilesDir: this.dataFilesDir,
        publicLinkDir: this.publicLinkDir,
        tempUploadDir: this.tempUploadDir,
        plainStorage: this.plainStorage,
      }
      const r = await api('/privhub/api/settings', { method: 'POST', body: JSON.stringify(patch) }).catch(() => null)
      if (!r || !r.ok) {
        window.PrivHub.toast((r && r.error) || '保存失败', 'error')
        return
      }
      /* 用服务端回写的值校准本地（避免「输入框里是我改的、实际存的是旧的」）。 */
      const s = r.settings || {}
      this.dataFilesDir = s.dataFilesDir || ''
      this.publicLinkDir = s.publicLinkDir || ''
      this.tempUploadDir = s.tempUploadDir || ''
      this.plainStorage = s.plainStorage === true
      const need = Array.isArray(r.restartRequired) ? r.restartRequired : []
      this.storageSaved = true
      setTimeout(() => { this.storageSaved = false }, 4000)
      window.PrivHub.toast(
        need.length > 0
          ? '已保存，' + need.length + ' 项设置需重启服务后生效'
          : '已保存（无变化）',
      )
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
            <div style="font-size:13px;color:var(--muted);margin-bottom:12px">单文件上传上限（MB）</div>
            <div class="field" style="display:flex;gap:8px">
              <input v-model.number="maxUploadMB" type="number" min="0" max="8192" style="flex:1" />
              <button class="btn btn-primary" style="width:auto" @click="saveUploadLimit">保存</button>
              <span v-if="saved" style="color:var(--warn);font-size:12px;line-height:38px">已保存</span>
            </div>
            <div class="field-hint">
              0 = 不限（默认）；此上限由上传路由实时读取，改完立即生效。
              {{ maxUploadMB > 0 ? '当前上限：' + maxUploadMB + ' MB（超出会返回 413 并明确提示）' : '当前不限制单个文件大小。' }}
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

          <!-- ===== 存储布局（v6）：路径类与加密开关都需重启生效 ===== -->
          <div v-if="isAdmin" style="margin-top:24px;padding-top:16px;border-top:1px solid rgba(128,128,128,.25)">
            <div style="font-size:13px;color:var(--muted);margin-bottom:4px">存储布局</div>
            <div class="field-hint" style="margin-bottom:14px">
              下面几项在服务启动时生效，<b>改完需要重启</b>；重启前旧设置仍然有效。
            </div>

            <div class="field">
              <label style="display:flex;align-items:center;gap:5px">
                实际存储地址
                <span style="cursor:help;opacity:.7;font-size:12px" title="项目文件真正存放的目录，所有文件最终落在这里">ℹ️</span>
              </label>
              <input v-model="dataFilesDir" placeholder="留空 = 使用默认位置" style="width:100%" />
            </div>

            <div class="field">
              <label style="display:flex;align-items:center;gap:5px">
                对外访问地址（软连接）
                <span style="cursor:help;opacity:.7;font-size:12px" title="对外访问的入口地址；需与运维配置的 nginx 指向一致">ℹ️</span>
              </label>
              <input v-model="publicLinkDir" placeholder="留空 = 与实际存储地址相同" style="width:100%" />
            </div>

            <div class="field">
              <label style="display:flex;align-items:center;gap:5px">
                临时存储文件夹
                <span style="cursor:help;opacity:.7;font-size:12px" title="上传先落这里；留空则用实际存储地址。建议指向独立 SSD">ℹ️</span>
              </label>
              <input v-model="tempUploadDir" placeholder="留空 = 用实际存储地址" style="width:100%" />
            </div>

            <!-- 上面三项此前只存进 data/settings.json（界面回显用），而启动期的根解析
                 读的是 config/store.json —— 于是"保存成功、提示重启、重启后毫无变化"。
                 现在三项会**双写**，这段说明把"生效位置"和"何时生效"讲清楚，
                 避免用户改完不知道去哪验证。 -->
            <div class="field-hint" style="margin-top:6px">
              以上三项保存后写入 <code>config/store.json</code>，<strong>重启服务后生效</strong>。
              填写的必须是绝对路径；留空表示恢复默认。
            </div>

            <div class="field" style="margin-top:14px">
              <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text);cursor:pointer">
                <input type="checkbox" v-model="plainStorage" style="width:16px;height:16px;cursor:pointer" />
                文件库不加密存放（局域网可信环境可关闭）
                <span style="cursor:help;opacity:.7;font-size:12px" title="关闭后文件以明文存放，nginx 才能直读；系统账号与审计记录始终加密">ℹ️</span>
              </label>
              <div class="field-hint" :style="plainStorage ? 'color:var(--warn)' : ''">
                {{ plainStorage
                  ? '⚠ 已开启：新写入的用户文件将以明文落盘。系统账号、会话、审计记录仍然加密。'
                  : '保持加密（默认）。若需要 nginx 直读提速，才需要关闭。' }}
              </div>
            </div>

            <div style="display:flex;gap:8px;margin-top:12px;align-items:center">
              <button class="btn btn-primary" style="width:auto" @click="saveStorage">保存存储设置</button>
              <span v-if="storageSaved" style="color:var(--warn);font-size:12px">已保存，重启后生效</span>
            </div>
          </div>

          <div v-if="isAdmin" style="margin-top:20px">
            <div style="font-size:13px;color:var(--muted);margin-bottom:12px">管理员功能</div>
            <button class="btn btn-primary" style="width:auto" @click="openAdmin">👥 用户管理</button>
          </div>
        </div>
        <!-- ── 关于 ──────────────────────────────────────────────
             主人 2026-11-15：版本信息只在这里显示（主版本），**前端不显示蓝绿槽**；
             蓝/绿两个槽各自承载的版本只在**管理员**的「关于」里出现，
             用来确认「刚更新完 = 新版本 + 旧版本并存」。
             普通用户只看得到当前版本这一行。 -->
        <div style="margin-top:20px;padding-top:12px;border-top:1px solid rgba(128,128,128,.25);font-size:12px;color:var(--muted)">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-size:13px;color:var(--text);font-weight:600">关于</span>
            <span v-if="about.deployment" style="font-size:11px;padding:1px 7px;border-radius:99px;border:1px solid var(--line);color:var(--muted)">{{ about.deployment }}</span>
          </div>

          <!-- 当前版本（所有人可见；这就是「主版本」） -->
          <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px">
            <span style="color:var(--text);font-weight:600;font-size:13px">PrivHub v{{ about.current || version || '—' }}</span>
            <span v-if="uptime"> · 已运行 {{ uptime }}</span>
          </div>
          <div v-if="about.switchedAt" style="margin-bottom:6px">
            最近更新：{{ fmtTime(about.switchedAt) }}
          </div>

          <!-- 蓝绿槽版本：仅管理员。措辞刻意用「槽」而非字母，避免让人以为是两个站点 -->
          <div v-if="isAdmin && about.slots && about.slots.length" style="margin:10px 0;padding:10px 12px;border-radius:8px;background:var(--surface2);border:1px solid var(--line)">
            <div style="font-size:11px;color:var(--faint);margin-bottom:8px">蓝绿槽（仅管理员可见；前端不展示）</div>
            <div v-for="s in about.slots" :key="s.id" style="display:flex;align-items:center;gap:8px;padding:3px 0">
              <span style="width:46px;color:var(--muted)">{{ s.id === 'blue' ? '蓝槽' : '绿槽' }}</span>
              <span style="color:var(--text);font-weight:600">v{{ s.version || '—' }}</span>
              <span v-if="s.active" style="font-size:10px;padding:1px 6px;border-radius:99px;background:color-mix(in srgb,var(--accent) 16%,transparent);color:var(--accent)">正在服务</span>
              <span v-else-if="s.healthy === false" style="font-size:10px;color:var(--faint)">待命</span>
            </div>
          </div>

          <!-- 更新记录 -->
          <div v-if="isAdmin && about.history && about.history.length" style="margin-top:8px">
            <div style="font-size:11px;color:var(--faint);margin-bottom:6px">更新记录</div>
            <div v-for="(h, i) in about.history" :key="i" style="display:flex;align-items:center;gap:8px;padding:2px 0">
              <span style="color:var(--text)">v{{ h.version }}</span>
              <span v-if="h.current" style="font-size:10px;color:var(--accent)">当前</span>
              <span v-else style="font-size:10px;color:var(--faint)">上一版</span>
              <span v-if="h.at" style="color:var(--faint);font-size:11px">{{ fmtTime(h.at) }}</span>
            </div>
          </div>

          <div v-if="origin" style="margin-top:8px">服务器地址：{{ origin }}</div>
          <div v-if="isAdmin && about.controlReachable === false" style="margin-top:6px;color:var(--warn)">
            控制层暂时不可达：槽状态读不到实时值（显示的是上次记录）
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
