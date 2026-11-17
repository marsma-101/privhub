/**
 * relocate-panel — 库搬迁（把文件字节从当前库搬到分离的新地址 + 形态变换）。
 *
 * ## 它和「老库迁移」的区别（界面上必须讲清，否则用户又会点错）
 *   · 老库迁移（MigratePanel）：把**外部老库**（source=legacy）搬进主库池。
 *     已经在池里的文件它一个都不动。
 *   · 库搬迁（本面板）：把**已经在库里的全部文件**搬到另一块卷，并可选
 *     解密 / 加密 / 保持不变。这才是「程序与库分离」「为速度转明文」用的。
 *
 * 后端：POST /storage/relocate（202 后台）+ GET /storage/relocate-status 轮询
 *       + POST /storage/relocate-cancel。源默认不删；可显式删源、可切默认写入卷。
 *
 * @module privhub-admin-console/client/relocate-panel
 */

import { api } from './deps.js'
import { adminToast } from './toast.js'
import { confirmAction } from './confirm.js'

async function rget(path) {
  try { const r = await api(path); if (r && r.ok) return { ok: true, data: r }; return { ok: false, error: (r && r.error) || '接口返回失败' } }
  catch (e) { return { ok: false, error: (e && e.message) || '网络错误' } }
}
async function rsend(path, payload) {
  try { const r = await api(path, { method: 'POST', body: JSON.stringify(payload || {}) }); if (r && r.ok) return { ok: true, data: r }; return { ok: false, error: (r && r.error) || '操作失败' } }
  catch (e) { return { ok: false, error: (e && e.message) || '网络错误' } }
}

const MODE_HINT = {
  decrypt: '解密成明文：新架构为保证运行速度（nginx 直读）推荐此项。密文会在搬运时解密，落到目标盘的是明文。',
  encrypt: '加密成密文：目标盘上的文件以 PHENC1 加密存放（读取时自动解密）。',
  keep: '保持不变：源是密文就仍密文、源是明文就仍明文，原样字节复制。',
}

export const RelocatePanel = {
  name: 'admin-relocate-panel',
  data() {
    return {
      loading: true, error: '',
      volumes: [], status: null,
      targetVolumeId: '', mode: 'decrypt',
      deleteSource: false, setDefault: true,
      busy: false, lastMsg: '',
      _timer: null,
    }
  },
  computed: {
    targetVol() { return this.volumes.find((v) => v.id === this.targetVolumeId) || null },
    modeHint() { return MODE_HINT[this.mode] || '' },
    running() { return !!(this.status && this.status.running) },
    pct() {
      const s = this.status
      if (!s || !s.target) return 0
      return Math.min(100, Math.round((s.done / s.target) * 100))
    },
    /* 非系统卷才能作为「分离」的目标（系统库根就在程序目录里，搬过去等于没分离）。 */
    separableVolumes() { return this.volumes.filter((v) => !v.isSystemRoot) },
    summary() {
      const s = this.status
      if (!s) return ''
      if (s.running) return '搬迁中：' + s.done + ' / ' + s.target + '（成功 ' + s.moved + '，跳过 ' + s.skipped + '，失败 ' + s.failed + '）'
      if (s.finishedAt) return '上次搬迁：成功 ' + s.moved + '，跳过 ' + s.skipped + '，失败 ' + s.failed + (s.target ? '（共 ' + s.target + '）' : '')
      return '待搬到该卷的文件：' + (s.poolPending ?? '—') + ' 个（池内共 ' + (s.poolTotal ?? '—') + ' 个）'
    },
    /* 目标卷的池目录路径（告诉用户文件到底在哪，而不是让他去翻盘符）。 */
    targetPoolPath() {
      const v = this.targetVol
      if (!v) return ''
      return String(v.root).replace(/[\\/]+$/, '') + '\\.pool'
    },
    /* 索引悬空数（搬迁中断留下的「看得见打不开」）。 */
    dangling() { return this.status ? this.status.dangling : null },
  },
  methods: {
    async load() {
      this.loading = true; this.error = ''
      const [vols, st] = await Promise.all([
        rget('/privhub/api/volumes/list'),
        rget('/privhub/api/storage/relocate-status'),
      ])
      if (!vols.ok && !st.ok) { this.error = '读取存储状态失败：' + (vols.error || st.error); this.loading = false; return }
      this.volumes = (vols.data && vols.data.volumes) || []
      this.status = st.data || null
      /* 默认目标：第一个非系统卷（最符合「分离」意图）；没有就留空让用户选。 */
      if (!this.targetVolumeId && this.separableVolumes.length) this.targetVolumeId = this.separableVolumes[0].id
      this.loading = false
      if (this.running) this.startPoll()
    },
    startPoll() {
      this.stopPoll()
      this._timer = setInterval(async () => {
        const r = await rget('/privhub/api/storage/relocate-status')
        if (r.ok) {
          this.status = r.data
          if (!r.data.running) { this.stopPoll(); this.busy = false; await this.refreshVolumes() }
        }
      }, 1000)
    },
    stopPoll() { if (this._timer) { clearInterval(this._timer); this._timer = null } },
    async refreshVolumes() { const r = await rget('/privhub/api/volumes/list'); if (r.ok) this.volumes = (r.data && r.data.volumes) || [] },
    async start() {
      if (!this.targetVolumeId) { adminToast('请先选择目标卷（要搬到哪块盘）', 'error'); return }
      const vol = this.targetVol
      const modeText = this.mode === 'decrypt' ? '解密成明文' : this.mode === 'encrypt' ? '加密成密文' : '保持不变'
      const ok = await confirmAction({
        title: '开始库搬迁',
        message: '将把库里的文件字节搬到卷「' + (vol ? vol.label + '（' + vol.root + '）' : this.targetVolumeId) + '」。\n\n'
          + '· 形态：' + modeText + '\n'
          + '· ' + (this.deleteSource ? '搬完会删除源文件（真正的移动）' : '源文件保留（可回退，确认无误后再手动清理）') + '\n'
          + '· ' + (this.setDefault ? '搬完把默认写入卷切到目标卷（实现程序与库分离）' : '不切换默认写入卷') + '\n\n'
          + '低并发后台执行，可随时停止；已完成的不会重搬。',
        confirmText: '开始搬迁',
      })
      if (!ok) return
      this.busy = true; this.lastMsg = ''
      const r = await rsend('/privhub/api/storage/relocate', {
        targetVolumeId: this.targetVolumeId, mode: this.mode,
        deleteSource: this.deleteSource, setDefault: this.setDefault,
      })
      if (!r.ok) { this.busy = false; adminToast(r.error || '启动搬迁失败', 'error'); return }
      /* 诚实反馈：后端说没启动（没东西可搬）就如实讲，不再假报「已启动」。 */
      if (r.data.started === false) {
        this.busy = false
        this.lastMsg = r.data.message || '没有可搬迁的文件'
        adminToast(this.lastMsg, 'warn')
        await this.load()
        return
      }
      this.lastMsg = '已启动：' + r.data.queued + ' 个文件 → ' + (r.data.targetLabel || '目标卷') + '（' + modeText + '）'
      adminToast('库搬迁已启动')
      await this.load()
      this.startPoll()
    },
    async cancel() {
      const r = await rsend('/privhub/api/storage/relocate-cancel', {})
      if (!r.ok) { adminToast(r.error || '取消失败', 'error'); return }
      adminToast('已请求停止，当前文件搬完后会停下')
    },
  },
  mounted() { void this.load() },
  beforeUnmount() { this.stopPoll() },
  template: `
    <div class="ad-section-card">
      <div class="ad-section-card-head">
        <span class="ad-section-card-title">🚚 库搬迁（文件搬到新地址 · 程序与库分离）</span>
        <span class="ad-chip" :class="running ? 'on' : 'off'">{{ running ? '搬迁中' : '空闲' }}</span>
      </div>
      <div class="ad-dim" style="line-height:1.7;margin-bottom:10px">
        把<strong>已经在库里的文件字节</strong>搬到另一块盘，并可选变换加密形态。
        老库在程序目录里、想让程序与库分离、或为运行速度转明文 —— 用这里。
        （「老库迁移」只处理外部老库，已在库里的文件请用本功能。）
      </div>

      <div class="ad-field">
        <label class="ad-label">目标卷（搬到哪）</label>
        <select class="ad-input" v-model="targetVolumeId">
          <option value="" disabled>选择目标卷…</option>
          <option v-for="v in separableVolumes" :key="v.id" :value="v.id" :disabled="v.enabled === false">
            {{ v.label }} — {{ v.root }}{{ v.enabled === false ? '（已停用）' : '' }}
          </option>
        </select>
        <div v-if="separableVolumes.length === 0" class="ad-dim" style="margin-top:4px;color:var(--ad-warn)">
          还没有可分离的目标卷。先在上方「存储卷」挂一块新盘（程序目录之外的路径）。
        </div>
      </div>

      <div class="ad-field">
        <label class="ad-label">加密形态</label>
        <div class="rl-modes">
          <label class="rl-mode" :class="{ on: mode === 'decrypt' }">
            <input type="radio" value="decrypt" v-model="mode" /> 解密成明文
          </label>
          <label class="rl-mode" :class="{ on: mode === 'encrypt' }">
            <input type="radio" value="encrypt" v-model="mode" /> 加密成密文
          </label>
          <label class="rl-mode" :class="{ on: mode === 'keep' }">
            <input type="radio" value="keep" v-model="mode" /> 保持不变
          </label>
        </div>
        <div class="ad-dim" style="margin-top:6px;line-height:1.6">{{ modeHint }}</div>
      </div>

      <label class="ad-check">
        <input type="checkbox" v-model="setDefault" />
        搬完把默认写入卷切到目标卷（实现程序与库分离，新文件直接落新盘）
      </label>
      <label class="ad-check">
        <input type="checkbox" v-model="deleteSource" />
        搬完删除源文件（真正的移动；不勾则保留源，可回退）
      </label>

      <div class="ad-actions" style="margin-top:10px">
        <button class="ad-btn ad-btn-primary ad-btn-sm" :disabled="busy || running || !targetVolumeId" @click="start">开始搬迁</button>
        <button class="ad-btn ad-btn-sm" v-if="running" @click="cancel">停止</button>
      </div>

      <div v-if="lastMsg" class="ad-dim" style="margin-top:8px;line-height:1.6">{{ lastMsg }}</div>
      <div v-if="status && status.lastError" class="ad-warn-block" style="margin-top:8px;line-height:1.6">{{ status.lastError }}</div>

      <!-- 「文件到底在哪」：扁平池是按内部 ID 平铺的，用户去翻盘符只会看到一堆乱码名。
           这里直接告诉他真实路径，并说明目录层级在数据库里（这是设计，不是丢文件）。 -->
      <div v-if="targetPoolPath" class="rl-where" style="margin-top:12px">
        <div class="rl-where-h">📂 文件实际存放在哪</div>
        <div class="ad-dim" style="line-height:1.7">
          扁平池按<strong>内部 ID 平铺</strong>存放，所以你在盘里看到的是
          <code>{{ targetPoolPath }}</code> 下一堆形如 <code>0183c7e2….md</code> 的文件 ——
          这<strong>不是丢文件</strong>，而是架构设计：字节平铺、目录层级只存在数据库里。
          想看真实目录结构，请回到「文件」页浏览，那里按项目/文件夹显示。
        </div>
      </div>
      <!-- 索引与磁盘不一致（搬迁中断留下的「看得见打不开」）：给出可执行的下一步。 -->
      <div v-if="dangling" class="ad-warn-block" style="margin-top:10px;line-height:1.7">
        检测到 <strong>{{ dangling }}</strong> 个条目的字节不在索引记录的位置（搬迁中断所致，
        表现为「页面看得见但打开 404」）。<strong>再点一次「开始搬迁」即可自动修复</strong> ——
        程序会到各卷池里按 ID 找回真实字节并修正索引。
      </div>

      <div v-if="status && (status.running || status.finishedAt)" style="margin-top:12px">
        <div class="ad-dim" style="margin-bottom:4px">{{ summary }}</div>
        <div class="ad-progress"><div class="ad-progress-bar" :style="{ width: pct + '%' }"></div></div>
        <div v-if="status.running && status.lastPath" class="ad-dim" style="margin-top:4px">正在搬：{{ status.lastPath }}</div>
      </div>
      <div v-else-if="status" class="ad-dim" style="margin-top:10px">{{ summary }}</div>
    </div>
  `,
}

export const RELOCATE_PANEL_CSS = `
.rl-modes { display: flex; gap: 8px; flex-wrap: wrap; }
.rl-mode {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 8px; cursor: pointer;
  border: 1px solid var(--admin-border); font-size: 12.5px;
  color: var(--admin-text); transition: .14s;
}
.rl-mode.on { border-color: var(--admin-primary); background: var(--admin-primary-soft); color: var(--admin-primary); font-weight: 600; }
.rl-mode input { margin: 0; }
.rl-where {
  padding: 10px 12px; border-radius: var(--admin-radius);
  background: var(--admin-bg); border: 1px solid var(--admin-border);
}
.rl-where-h { font-size: 12.5px; font-weight: 600; margin-bottom: 4px; color: var(--admin-text); }
.rl-where code {
  font-family: ui-monospace, Consolas, monospace; font-size: 11.5px;
  background: var(--admin-card-bg); padding: 1px 5px; border-radius: 4px;
  border: 1px solid var(--admin-border); word-break: break-all;
}
`

/* import 即注入（同 styles.js 写法）：只插一次。 */
if (typeof document !== 'undefined' && !document.querySelector('style[data-privhub-relocate-panel]')) {
  const el = document.createElement('style')
  el.setAttribute('data-privhub-relocate-panel', '')
  el.textContent = RELOCATE_PANEL_CSS
  document.head.appendChild(el)
}
