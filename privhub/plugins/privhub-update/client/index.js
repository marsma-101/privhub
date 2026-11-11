/**
 * privhub-update · client —— 「系统更新」管理面板（挂 admin-update slot）
 *
 * 位置：管理控制台 → 系统运维 → 系统更新。界面只做三件事：
 *   1. 显示当前版本 / 更新源 / 最近一次检查结果；
 *   2. 检查更新（只读一个 manifest，不下载整包）；
 *   3. 一键更新（后台 apply + 蓝绿切换）与回滚。
 *
 * 所有真正的工作都在稳定层（runtime/update.mjs → runtime/control.mjs）完成；
 * 本组件通过 /privhub/api/update/* 代理调用，因此业务代码被替换时更新能力仍在。
 *
 * @module privhub-update/client
 */

const { api } = window.PrivHub

const PHASE_LABEL = {
  idle: '空闲',
  checking: '正在检查',
  preparing: '准备更新',
  downloading: '正在下载更新包',
  extracting: '正在解包',
  staging: '正在组装新版本',
  switching: '正在切换（旧版本继续服务）',
  done: '更新完成',
  error: '出错',
}

const UpdatePanel = {
  name: 'admin-update',
  data() {
    return {
      loading: false,
      busy: '',
      msg: '',
      msgKind: 'info',
      status: null,
      /* 更新源表单 */
      form: {
        enabled: true,
        source: 'http',
        manifestUrl: '',
        remote: '',
        branch: 'main',
        subdir: 'privhub',
        path: '',
        autoApply: false,
        intervalMinutes: 360,
        keepReleases: 3,
        requireNewer: true,
      },
      timer: null,
      btnPrimary: 'padding:6px 14px;border-radius:6px;border:none;background:var(--accent-solid);color:#fff;cursor:pointer;font-size:13px',
      btn: 'padding:6px 14px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text);cursor:pointer;font-size:13px',
      card: 'border:1px solid var(--line);border-radius:10px;padding:16px 18px;background:var(--bg);margin-bottom:14px',
      label: 'display:block;font-size:12px;color:var(--muted);margin-bottom:4px',
      input: 'width:100%;box-sizing:border-box;padding:7px 9px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--text);font-size:13px',
    }
  },
  computed: {
    managed() { return !!(this.status && this.status.managed) },
    current() { return (this.status && this.status.current) || '未知' },
    state() { return (this.status && this.status.state) || {} },
    phase() { return this.state.phase || 'idle' },
    phaseText() { return PHASE_LABEL[this.phase] || this.phase },
    active() { return ['checking', 'preparing', 'downloading', 'extracting', 'staging', 'switching'].includes(this.phase) },
    progress() {
      const n = Number(this.state.progress)
      if (!Number.isFinite(n)) return null
      return Math.max(0, Math.min(100, n))
    },
    candidate() { return this.state.candidate || '' },
    newer() { return this.state.newer === true },
    notes() { return this.state.notes || '' },
    errorText() { return this.state.error || '' },
    config() { return (this.status && this.status.config) || {} },
    daemonRunning() { return !!(this.status && this.status.daemon && this.status.daemon.running) },
    applying() { return !!(this.status && this.status.applying) },
    logTail() { return (this.status && this.status.logTail) || '' },
    sourceHint() {
      if (this.form.source === 'http') return '清单地址（latest.json）：可放在 GitHub Release、内网静态服务器或任意能访问的 HTTP 目录。'
      if (this.form.source === 'dir') return '共享目录：把构建好的 release 目录放到网络盘（如 \\\\nas\\privhub\\releases）。'
      return 'Git 仓库：使用版机器需要安装 git，并能访问远端仓库。'
    },
  },
  methods: {
    say(text, kind) { this.msg = text; this.msgKind = kind || 'info' },

    fmtTime(v) {
      if (!v) return ''
      try { return new Date(v).toLocaleString() } catch { return String(v) }
    },

    async load() {
      this.loading = true
      try {
        const r = await api('/privhub/api/update/status')
        if (r && r.ok) {
          this.status = r
          this.applyConfigToForm(r.config || {})
        } else {
          this.say((r && r.error) || '加载更新状态失败', 'error')
        }
      } catch (e) {
        this.say('加载更新状态失败：' + (e && e.message ? e.message : e), 'error')
      } finally {
        this.loading = false
        this.schedulePoll()
      }
    },

    applyConfigToForm(cfg) {
      if (!cfg || !cfg.exists) return
      this.form.enabled = cfg.enabled !== false
      this.form.source = cfg.source || 'http'
      this.form.manifestUrl = cfg.manifestUrl || ''
      this.form.remote = cfg.remote || ''
      this.form.branch = cfg.branch || 'main'
      this.form.subdir = cfg.subdir || ''
      this.form.path = cfg.path || ''
      this.form.autoApply = cfg.autoApply === true
      this.form.intervalMinutes = cfg.intervalMinutes || 360
      this.form.keepReleases = cfg.keepReleases || 3
      this.form.requireNewer = cfg.requireNewer !== false
    },

    schedulePoll() {
      if (this.timer) { clearTimeout(this.timer); this.timer = null }
      /* 只在更新真的进行中时轮询；update-state 落成 done / error 后停表，避免面板常开时空转。 */
      const shouldPoll = this.managed && (this.applying || this.active)
      if (!shouldPoll) return
      this.timer = setTimeout(() => { this.load() }, 2000)
    },

    async saveConfig() {
      this.busy = 'save'
      try {
        const body = { ...this.form }
        if (body.source !== 'http') body.manifestUrl = this.form.manifestUrl || ''
        const r = await api('/privhub/api/update/config', { method: 'POST', body: JSON.stringify(body) })
        if (!r || !r.ok) { this.say((r && r.error) || '保存失败', 'error'); return }
        this.say('更新源已保存，守护进程已按新配置重启', 'ok')
        await this.load()
      } catch (e) {
        this.say('保存失败：' + (e && e.message ? e.message : e), 'error')
      } finally { this.busy = '' }
    },

    async check() {
      this.busy = 'check'
      this.say('正在检查更新…', 'info')
      try {
        const r = await api('/privhub/api/update/check', { method: 'POST', body: '{}' })
        if (!r || !r.ok) { this.say((r && r.error) || '检查失败', 'error'); return }
        if (!r.newer) {
          this.say(`已是最新版本（当前 ${r.current || this.current}，更新源 ${r.candidate || '—'}）`, 'ok')
        } else {
          this.say(`发现新版本 ${r.candidate}（当前 ${r.current || this.current}）`, 'ok')
        }
        await this.load()
      } catch (e) {
        this.say('检查失败：' + (e && e.message ? e.message : e), 'error')
      } finally { this.busy = '' }
    },

    async applyUpdate() {
      const target = this.candidate || '新版本'
      if (!window.confirm(`立即更新到 ${target}？\n\n更新在后台进行，旧版本会继续服务；切换完成后页面会提示刷新。`)) return
      this.busy = 'apply'
      try {
        const r = await api('/privhub/api/update/apply', { method: 'POST', body: '{}' })
        if (!r || !r.ok) { this.say((r && r.error) || '启动更新失败', 'error'); return }
        this.say('更新已开始，正在后台下载并切换；页面可继续使用', 'info')
        this.status = { ...(this.status || {}), applying: true }
        this.schedulePoll()
      } catch (e) {
        this.say('启动更新失败：' + (e && e.message ? e.message : e), 'error')
      } finally { this.busy = '' }
    },

    async rollback() {
      if (!window.confirm('回滚到上一个版本？\n\n当前页面会在切换后要求刷新。')) return
      this.busy = 'rollback'
      try {
        const r = await api('/privhub/api/update/rollback', { method: 'POST', body: '{}' })
        if (!r || !r.ok) { this.say((r && r.error) || '回滚失败', 'error'); return }
        /* 回滚由独立进程执行（当前槽稍后会被停掉），这里只表示「已开始」；
         * 进度靠轮询 status，切换完成后版本门会提示刷新。 */
        this.say('回滚已开始，正在切换；完成后页面会提示刷新', 'info')
        this.status = { ...(this.status || {}), applying: true }
        this.schedulePoll()
      } catch (e) {
        this.say('回滚失败：' + (e && e.message ? e.message : e), 'error')
      } finally { this.busy = '' }
    },

    close() { window.PrivHub.nav.setActiveView('files') },
  },
  mounted() { this.load() },
  beforeUnmount() { if (this.timer) clearTimeout(this.timer) },
  template: `
    <div class="ph-scroll" style="height:100%;overflow:auto;padding:20px 24px;max-width:920px;margin:0 auto">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px">
        <div>
          <h2 style="margin:0 0 4px;font-size:18px">系统更新</h2>
          <div style="font-size:12px;color:var(--muted)">
            当前版本 <b style="color:var(--text)">{{ current }}</b>
            <span v-if="managed"> · 蓝绿热更新</span>
          </div>
        </div>
        <button :style="btn" @click="load" :disabled="loading">{{ loading ? '刷新中…' : '刷新状态' }}</button>
      </div>

      <div v-if="msg" :style="{ padding:'9px 12px', borderRadius:'8px', marginBottom:'14px', fontSize:'13px',
           border:'1px solid var(--line)',
           color: msgKind === 'error' ? '#c0392b' : (msgKind === 'ok' ? '#1e8449' : 'var(--text)') }">
        {{ msg }}
      </div>

      <!-- 直连模式：解释为什么不能一键更新 -->
      <div v-if="status && !managed" :style="card">
        <div style="font-weight:600;margin-bottom:6px">当前不是蓝绿部署</div>
        <div style="font-size:13px;color:var(--muted);line-height:1.7">
          {{ status.reason || '一键更新需要运行时控制层（start-runtime.bat）。' }}<br>
          单进程模式下仍可手动更新：在 privhub 目录执行
          <code>node runtime\\update.mjs apply</code>，然后重启进程。
        </div>
      </div>

      <template v-if="managed">
        <!-- 当前状态 -->
        <div :style="card">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px">
            <div>
              <div :style="label">当前版本</div>
              <div style="font-size:20px;font-weight:600">{{ current }}</div>
            </div>
            <div>
              <div :style="label">更新源</div>
              <div style="font-size:13px">{{ config.source || '未配置' }}</div>
              <div style="font-size:11px;color:var(--muted);word-break:break-all">
                {{ config.source === 'http' ? (config.manifestUrl || '未填清单地址')
                   : (config.source === 'dir' ? (config.path || '未填目录')
                   : (config.remote || '未填仓库')) }}
              </div>
            </div>
            <div>
              <div :style="label">后台守护</div>
              <div style="font-size:13px">{{ daemonRunning ? '运行中' : '未运行' }}</div>
              <div style="font-size:11px;color:var(--muted)">每 {{ config.intervalMinutes || 360 }} 分钟检查；{{ config.autoApply ? '自动更新' : '只检查，手动更新' }}</div>
            </div>
            <div>
              <div :style="label">最近检查</div>
              <div style="font-size:13px">{{ state.checkedAt ? fmtTime(state.checkedAt) : '尚未检查' }}</div>
              <div style="font-size:11px;color:var(--muted)" v-if="candidate">
                源上版本 {{ candidate }}（{{ newer ? '可更新' : '不高于当前' }}）
              </div>
            </div>
          </div>
        </div>

        <!-- 更新进行中 / 结果 -->
        <div v-if="active || phase === 'error' || phase === 'done'" :style="card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <div style="font-weight:600">{{ phaseText }}<span v-if="candidate"> → {{ candidate }}</span></div>
            <div v-if="progress !== null && active" style="font-size:12px;color:var(--muted)">{{ progress }}%</div>
          </div>
          <div v-if="active && progress !== null" style="height:8px;border-radius:4px;background:var(--line);overflow:hidden">
            <div :style="{ height:'100%', width: progress + '%', background:'var(--accent-solid)', transition:'width .3s' }"></div>
          </div>
          <div v-if="errorText" style="margin-top:10px;font-size:12px;color:#c0392b;white-space:pre-wrap">{{ errorText }}</div>
          <div v-if="phase === 'done'" style="margin-top:10px;font-size:13px;color:#1e8449">
            更新完成，当前运行 {{ state.current || current }}。页面若未自动提示，可手动刷新。
          </div>
          <pre v-if="notes" style="margin-top:10px;white-space:pre-wrap;font-size:12px;color:var(--muted);max-height:180px;overflow:auto">{{ notes }}</pre>
        </div>

        <!-- 操作 -->
        <div :style="card">
          <div style="font-weight:600;margin-bottom:10px">更新操作</div>
          <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">
            <button :style="btnPrimary" @click="check" :disabled="!!busy || active">
              {{ busy === 'check' ? '检查中…' : '检查更新' }}
            </button>
            <button :style="btnPrimary" @click="applyUpdate" :disabled="!!busy || active || !newer"
                    :title="newer ? '' : '请先检查更新，且更新源版本必须高于当前版本'">
              {{ busy === 'apply' || applying ? '更新中…' : (candidate && newer ? ('立即更新到 ' + candidate) : '立即更新') }}
            </button>
            <button :style="btn" @click="rollback" :disabled="!!busy || active"
                    title="回滚到上一版本（需要上一版本仍在 releases/ 中）">回滚到上一版</button>
            <span style="font-size:12px;color:var(--muted)">更新在后台完成；旧版本会继续服务到切换完成。</span>
          </div>
        </div>

        <!-- 更新源配置 -->
        <div :style="card">
          <div style="font-weight:600;margin-bottom:10px">更新源</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
            <div>
              <label :style="label">来源类型</label>
              <select v-model="form.source" :style="input">
                <option value="http">HTTP 清单（推荐）</option>
                <option value="dir">共享目录</option>
                <option value="git">Git 仓库</option>
              </select>
            </div>
            <div v-if="form.source === 'http'">
              <label :style="label">清单地址 manifestUrl</label>
              <input v-model.trim="form.manifestUrl" :style="input" placeholder="https://…/latest.json">
            </div>
            <div v-if="form.source === 'dir'">
              <label :style="label">共享目录 path</label>
              <input v-model.trim="form.path" :style="input" placeholder="\\\\nas\\privhub\\releases">
            </div>
            <template v-if="form.source === 'git'">
              <div>
                <label :style="label">远端 remote</label>
                <input v-model.trim="form.remote" :style="input" placeholder="https://…/privhub.git">
              </div>
              <div>
                <label :style="label">分支 branch</label>
                <input v-model.trim="form.branch" :style="input" placeholder="main">
              </div>
              <div>
                <label :style="label">应用子目录 subdir</label>
                <input v-model.trim="form.subdir" :style="input" placeholder="privhub">
              </div>
            </template>
            <div>
              <label :style="label">检查间隔（分钟）</label>
              <input v-model.number="form.intervalMinutes" type="number" min="5" :style="input">
            </div>
            <div>
              <label :style="label">保留旧版本数</label>
              <input v-model.number="form.keepReleases" type="number" min="1" :style="input">
            </div>
          </div>
          <div style="margin-top:10px;font-size:12px;color:var(--muted);line-height:1.7">{{ sourceHint }}</div>
          <div style="display:flex;flex-wrap:wrap;gap:16px;margin-top:12px;font-size:13px">
            <label style="display:flex;align-items:center;gap:6px">
              <input type="checkbox" v-model="form.enabled"> 启用后台检查
            </label>
            <label style="display:flex;align-items:center;gap:6px">
              <input type="checkbox" v-model="form.autoApply"> 发现新版本自动更新
            </label>
            <label style="display:flex;align-items:center;gap:6px">
              <input type="checkbox" v-model="form.requireNewer"> 只接受更高版本
            </label>
          </div>
          <div style="margin-top:12px;display:flex;align-items:center;gap:12px">
            <button :style="btnPrimary" @click="saveConfig" :disabled="!!busy || active">
              {{ busy === 'save' ? '保存中…' : '保存更新源' }}
            </button>
            <span style="font-size:12px;color:var(--muted)">保存后立即生效，无需重启服务。</span>
          </div>
        </div>

        <!-- 更新日志 -->
        <details v-if="logTail" :style="card">
          <summary style="cursor:pointer;font-weight:600;font-size:13px">更新日志（最近 40 行）</summary>
          <pre style="margin-top:10px;white-space:pre-wrap;font-size:11px;color:var(--muted);max-height:260px;overflow:auto">{{ logTail }}</pre>
        </details>
      </template>
    </div>
  `,
}

export default {
  id: 'privhub-update',
  slots: {
    'admin-update': UpdatePanel,
  },
}
