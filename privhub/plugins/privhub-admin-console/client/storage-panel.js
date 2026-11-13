/**
 * 存储卷面板（管理控制台「系统运维 → 存储卷」）
 *
 * ## 这个页面解决什么
 *
 * 改造前「文件库」只能是一个固定目录（`PRIVHUB_DATA_FILES`）。用户的实际
 * 诉求是**程序与库分处不同盘/设备**，并且能按盘的性质分工：
 *
 * > 一块物理硬盘做主盘存数据，一块 SSD 做快速下载，空闲时把内容移到主盘。
 *
 * 所以这个页面做四件事：
 *   1. **挂载**：加号 + 输入框，填本地盘符路径或网络路径（UNC），可挂多个。
 *   2. **容量**：每块盘显示总/已用/剩余，低于水位标红。
 *   3. **分工**：给每个卷标「热卷 / 冷卷 / 通用卷」，决定写入优先与搬移方向。
 *   4. **搬移**：显示热卷上还有多少待搬，可手动触发一轮。
 *
 * ## 前端不做任何策略判断
 *
 * 「能不能写」「该搬谁」全部由后端算好（`writable` / `tieringEnabled`）。
 * 前端只渲染。理由：一旦前后端各有一套判定，必然出现「界面说能写、
 * 实际被拒」这种最难排查的不一致。
 *
 * @module privhub-admin-console/client/storage-panel
 */

import { api } from './deps.js'
import { adminToast } from './toast.js'
import { confirmAction } from './confirm.js'
import { AdminSkeleton, AdminErrorState, AdminEmptyState } from './ui.js'

/** 统一取数：失败不抛，返回 { ok, data, error }。 */
async function vget(path) {
  try {
    const r = await api(path)
    if (r && r.ok) return { ok: true, data: r }
    return { ok: false, error: (r && r.error) || '接口返回失败' }
  } catch (e) {
    return { ok: false, error: (e && e.message) || '网络错误' }
  }
}

/** 统一提交。 */
async function vsend(path, payload) {
  try {
    const r = await api(path, { method: 'POST', body: JSON.stringify(payload || {}) })
    if (r && r.ok) return { ok: true, data: r }
    return { ok: false, error: (r && r.error) || '操作失败' }
  } catch (e) {
    return { ok: false, error: (e && e.message) || '网络错误' }
  }
}

/** 字节 → 人类可读（1.5 GB）。容量展示必须可读，否则用户无法判断该挂哪块盘。 */
export function fmtBytes(n) {
  const v = Number(n) || 0
  if (v <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  let i = 0
  let x = v
  while (x >= 1024 && i < units.length - 1) { x /= 1024; i++ }
  return (x >= 100 ? Math.round(x) : Math.round(x * 10) / 10) + ' ' + units[i]
}

export const StoragePanel = {
  name: 'admin-storage-panel',
  components: { AdminSkeleton, AdminErrorState, AdminEmptyState },
  data() {
    return {
      loading: true,
      error: '',
      busy: '',
      data: null,
      /* 挂载表单 */
      form: { root: '', label: '', role: 'any', highWatermark: 10 },
      showForm: false,
      probe: null,
      probeBusy: false,
      /* 编辑中的卷（内联编辑角色/水位） */
      editing: '',
      editBuf: {},
    }
  },
  computed: {
    volumes() { return (this.data && this.data.volumes) || [] },
    def() { return (this.data && this.data.defaultRoot) || null },
    tieringEnabled() { return !!(this.data && this.data.tieringEnabled) },
    busyServer() { return !!(this.data && this.data.busy) },
    /** 热卷上还有多少文件（用于「待搬移」提示）。 */
    hotPending() {
      const hot = this.volumes.filter((v) => v.role === 'hot')
      if (hot.length === 0) return { files: 0, bytes: 0 }
      return hot.reduce((a, v) => ({ files: a.files + v.files, bytes: a.bytes + v.bytes }), { files: 0, bytes: 0 })
    },
    /** 有没有冷卷可接收（决定「立即搬移」按钮是否可用）。 */
    hasCold() {
      return this.volumes.some((v) => v.role !== 'hot' && v.enabled && v.writable)
    },
    canTier() {
      return this.tieringEnabled && this.hasCold && this.hotPending.files > 0 && !this.busyServer
    },
    /** 有卷但一块都不可写 → 全局告警（这是「上传全部失败」的根因）。 */
    noWritable() {
      if (this.volumes.length === 0) return false
      return !this.volumes.some((v) => v.writable)
    },
  },
  mounted() { void this.load() },
  methods: {
    fmt: fmtBytes,
    pct(v) {
      const s = (v && v.stat) || {}
      return Number(s.usedPercent) || 0
    },
    barClass(v) {
      if (!v.stat || !v.stat.online) return 'st-bar st-bar-off'
      const p = this.pct(v)
      if (p >= 95) return 'st-bar st-bar-danger'
      if (p >= 100 - Number(v.highWatermark || 10)) return 'st-bar st-bar-warn'
      return 'st-bar st-bar-ok'
    },
    roleText(r) {
      return r === 'hot' ? '热卷（快速写入）' : r === 'cold' ? '冷卷（长期存放）' : '通用卷'
    },
    roleIcon(r) { return r === 'hot' ? '⚡' : r === 'cold' ? '🧊' : '💾' },
    async load() {
      this.loading = true
      this.error = ''
      const r = await vget('/privhub/api/volumes/list')
      if (!r.ok) { this.error = r.error; this.data = null }
      else this.data = r.data
      this.loading = false
    },
    /** 探测候选路径：挂载前先看容量，避免挂一个错的盘。 */
    async doProbe() {
      const p = (this.form.root || '').trim()
      if (p === '') { this.probe = null; return }
      this.probeBusy = true
      const r = await vget('/privhub/api/volumes/probe?path=' + encodeURIComponent(p))
      this.probeBusy = false
      this.probe = r.ok ? r.data : { stat: { online: false, error: r.error } }
    },
    async add() {
      const root = (this.form.root || '').trim()
      if (root === '') { adminToast('请填写路径', 'error'); return }
      this.busy = 'add'
      const r = await vsend('/privhub/api/volumes/add', {
        root,
        label: this.form.label,
        role: this.form.role,
        highWatermark: Number(this.form.highWatermark),
      })
      this.busy = ''
      if (!r.ok) { adminToast(r.error, 'error'); return }
      this.data = r.data
      this.form = { root: '', label: '', role: 'any', highWatermark: 10 }
      this.probe = null
      this.showForm = false
      adminToast('已挂载', 'ok')
    },
    startEdit(v) {
      this.editing = v.id
      this.editBuf = { label: v.label, role: v.role, highWatermark: v.highWatermark, enabled: v.enabled }
    },
    cancelEdit() { this.editing = ''; this.editBuf = {} },
    async saveEdit(v) {
      this.busy = v.id
      const r = await vsend('/privhub/api/volumes/update', { id: v.id, ...this.editBuf })
      this.busy = ''
      if (!r.ok) { adminToast(r.error, 'error'); return }
      this.data = r.data
      this.editing = ''
      this.editBuf = {}
      adminToast('已保存', 'ok')
    },
    async remove(v) {
      const msg = v.files > 0
        ? '「' + v.label + '」上还有 ' + v.files + ' 个文件。\n\n卸载后这些文件暂时打不开（字节仍留在盘上），把同一个路径重新挂载即可恢复。\n\n确定卸载吗？'
        : '确定卸载「' + v.label + '」吗？'
      if (!(await confirmAction(msg))) return
      this.busy = v.id
      const r = await vsend('/privhub/api/volumes/remove', { id: v.id, force: v.files > 0 })
      this.busy = ''
      if (!r.ok) { adminToast(r.error, 'error'); return }
      this.data = r.data
      adminToast('已卸载', 'ok')
    },
    async setDefault(id) {
      const r = await vsend('/privhub/api/volumes/settings', { defaultVolumeId: id })
      if (!r.ok) { adminToast(r.error, 'error'); return }
      this.data = r.data
      adminToast(id === null ? '已改为自动选择' : '已设为默认写入卷', 'ok')
    },
    async toggleTiering() {
      const r = await vsend('/privhub/api/volumes/settings', { tieringEnabled: !this.tieringEnabled })
      if (!r.ok) { adminToast(r.error, 'error'); return }
      this.data = r.data
      adminToast(r.data.tieringEnabled ? '已开启分层搬移' : '已关闭分层搬移', 'ok')
    },
    async tieringNow() {
      this.busy = 'tier'
      const r = await vsend('/privhub/api/volumes/tiering-run', {})
      this.busy = ''
      if (!r.ok) { adminToast(r.error, 'error'); return }
      const res = (r.data && r.data.result) || {}
      this.data = r.data
      const moved = res.moved || 0
      const failed = (res.failed && res.failed.length) || 0
      adminToast('搬移完成：成功 ' + moved + ' 个' + (failed ? '，失败 ' + failed + ' 个' : ''), failed ? 'error' : 'ok')
    },
  },
  template: `
    <div class="ad-page">
      <AdminSkeleton v-if="loading" :rows="4"></AdminSkeleton>
      <AdminErrorState v-else-if="error" :message="error" @retry="load"></AdminErrorState>
      <template v-else>
        <!-- 全局告警：有卷但一块都写不了。这是「上传全失败」的直接原因。 -->
        <div v-if="noWritable" class="ad-alert ad-alert-error" style="margin-bottom:12px">
          <strong>当前没有任何可写的存储卷</strong>
          <div class="ad-dim" style="margin-top:4px">
            所有卷都已满、离线或已停用，<strong>新上传会全部失败</strong>。
            请检查各卷的剩余空间与连接状态，或挂载一个新卷。
          </div>
        </div>

        <!-- 默认库根：没有挂任何卷时数据就在这里。 -->
        <div class="ad-section-card">
          <div class="ad-section-card-head">
            <span class="ad-section-card-title">📦 默认库根</span>
            <span class="ad-chip">{{ def && def.exists ? '在用' : '不存在' }}</span>
          </div>
          <div class="ad-dim" style="font-family:monospace;font-size:12px;word-break:break-all">
            {{ def && def.path }}
          </div>
          <div v-if="def && def.stat" class="ad-dim" style="margin-top:6px">
            总 {{ fmt(def.stat.total) }} · 已用 {{ fmt(def.stat.used) }} · 剩余 {{ fmt(def.stat.free) }}
            <span v-if="def.files"> · {{ def.files }} 个文件（{{ fmt(def.bytes) }}）</span>
          </div>
          <div class="ad-dim" style="margin-top:6px">
            未挂载任何卷时，所有文件都落在这里。挂载卷之后，新文件按卷策略分布，
            <strong>这里已有的文件不受影响</strong>。
          </div>
        </div>

        <!-- 卷列表 -->
        <div class="ad-section-card">
          <div class="ad-section-card-head">
            <span class="ad-section-card-title">🗄️ 存储卷</span>
            <div class="ad-actions">
              <button class="ad-btn ad-btn-sm" :disabled="busy === 'tier'" @click="tieringNow">
                {{ busy === 'tier' ? '搬移中…' : '立即搬移' }}
              </button>
              <button class="ad-btn ad-btn-primary ad-btn-sm" @click="showForm = !showForm">
                {{ showForm ? '取消' : '＋ 挂载新卷' }}
              </button>
            </div>
          </div>

          <!-- 挂载表单 -->
          <div v-if="showForm" style="padding:12px 0;border-bottom:1px solid var(--ad-line)">
            <div style="display:flex;gap:8px;align-items:flex-start">
              <input
                v-model="form.root"
                class="ad-input"
                style="flex:1"
                placeholder="D:\\privhub-store  或  \\\\192.168.1.10\\share\\privhub"
                @change="doProbe"
              />
              <button class="ad-btn ad-btn-sm" :disabled="probeBusy" @click="doProbe">
                {{ probeBusy ? '探测中…' : '探测' }}
              </button>
            </div>
            <div v-if="probe" class="ad-dim" style="margin-top:6px">
              <template v-if="probe.stat && probe.stat.online">
                ✅ 可访问 · 总 {{ fmt(probe.stat.total) }} · 剩余 {{ fmt(probe.stat.free) }}
                <span v-if="!probe.exists"> （目录不存在，挂载时会自动创建）</span>
              </template>
              <template v-else>
                ⚠️ 暂时不可达：{{ (probe.stat && probe.stat.error) || '路径无效' }}
                <br />
                <span class="ad-dim">
                  仍然可以挂载 —— 配置会保存，等设备上线后自动可用。
                  网络盘建议先确认共享已连通，否则上传会一直失败。
                </span>
              </template>
            </div>
            <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
              <input v-model="form.label" class="ad-input" style="width:180px" placeholder="名称（可留空）" />
              <select v-model="form.role" class="ad-input" style="width:190px">
                <option value="hot">⚡ 热卷（快速写入）</option>
                <option value="cold">🧊 冷卷（长期存放）</option>
                <option value="any">💾 通用卷</option>
              </select>
              <label class="ad-dim" style="display:flex;align-items:center;gap:6px">
                保留余量
                <input v-model.number="form.highWatermark" type="number" min="1" max="99"
                       class="ad-input" style="width:70px" /> %
              </label>
              <button class="ad-btn ad-btn-primary ad-btn-sm" :disabled="busy === 'add'" @click="add">
                {{ busy === 'add' ? '挂载中…' : '确认挂载' }}
              </button>
            </div>
            <div class="ad-dim" style="margin-top:8px;line-height:1.7">
              <strong>热卷</strong>：新上传先写这里（通常是 SSD），写完立刻可读。<br />
              <strong>冷卷</strong>：长期存放（通常是 HDD / NAS）。热卷上的文件会在空闲时自动搬过来。<br />
              <strong>保留余量</strong>：剩余空间低于这个百分比就不再往该卷写，避免把盘写满。
            </div>
          </div>

          <!-- 卷卡片 -->
          <div v-for="v in volumes" :key="v.id" style="padding:12px 0;border-bottom:1px solid var(--ad-line)">
            <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
              <span>{{ roleIcon(v.role) }}</span>
              <strong style="flex:1">{{ v.label }}</strong>
              <span class="ad-chip" v-if="data && data.defaultVolumeId === v.id">默认写入</span>
              <span class="ad-chip" v-if="!v.enabled">已停用</span>
              <span class="ad-chip" v-if="!v.stat || !v.stat.online">离线</span>
              <span class="ad-chip" v-else-if="!v.writable">不可写</span>
              <button class="ad-btn ad-btn-sm" @click="editing === v.id ? cancelEdit() : startEdit(v)">
                {{ editing === v.id ? '收起' : '编辑' }}
              </button>
              <button class="ad-btn ad-btn-sm" :disabled="busy === v.id" @click="remove(v)">卸载</button>
            </div>

            <div class="ad-dim" style="font-family:monospace;font-size:12px;margin-top:4px;word-break:break-all">
              {{ v.root }}
            </div>

            <!-- 容量条 -->
            <div style="margin-top:8px">
              <div class="st-bar-track">
                <div :class="barClass(v)" :style="{ width: Math.min(100, pct(v)) + '%' }"></div>
              </div>
              <div class="ad-dim" style="margin-top:4px">
                <template v-if="v.stat && v.stat.online">
                  总 {{ fmt(v.stat.total) }} · 已用 {{ fmt(v.stat.used) }}（{{ pct(v) }}%） ·
                  剩余 {{ fmt(v.stat.free) }}
                  <span v-if="v.stat.total === 0">（无法读取容量）</span>
                </template>
                <template v-else>
                  ⚠️ {{ (v.stat && v.stat.error) || '离线' }} —— 这块盘上的文件暂时打不开
                </template>
              </div>
              <div class="ad-dim" style="margin-top:2px">
                {{ v.files }} 个文件 · {{ fmt(v.bytes) }} · 保留余量 {{ v.highWatermark }}%
              </div>
            </div>

            <!-- 内联编辑 -->
            <div v-if="editing === v.id" style="margin-top:10px;padding:10px;background:var(--ad-bg-soft);border-radius:6px">
              <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                <input v-model="editBuf.label" class="ad-input" style="width:180px" placeholder="名称" />
                <select v-model="editBuf.role" class="ad-input" style="width:190px">
                  <option value="hot">⚡ 热卷</option>
                  <option value="cold">🧊 冷卷</option>
                  <option value="any">💾 通用卷</option>
                </select>
                <label class="ad-dim" style="display:flex;align-items:center;gap:6px">
                  保留余量
                  <input v-model.number="editBuf.highWatermark" type="number" min="1" max="99"
                         class="ad-input" style="width:70px" /> %
                </label>
                <label class="ad-dim" style="display:flex;align-items:center;gap:6px">
                  <input type="checkbox" v-model="editBuf.enabled" /> 启用
                </label>
                <button class="ad-btn ad-btn-primary ad-btn-sm" :disabled="busy === v.id" @click="saveEdit(v)">
                  保存
                </button>
              </div>
              <div class="ad-dim" style="margin-top:8px">
                停用后不再往这个卷写新文件，但已有文件仍可正常读取 —— 用于准备下线一块盘。
              </div>
              <div style="margin-top:8px">
                <button class="ad-btn ad-btn-sm" @click="setDefault(v.id)">设为默认写入卷</button>
                <button v-if="data && data.defaultVolumeId" class="ad-btn ad-btn-sm"
                        style="margin-left:6px" @click="setDefault(null)">改回自动选择</button>
              </div>
            </div>
          </div>

          <AdminEmptyState v-if="!volumes.length"
            message="还没有挂载任何存储卷 —— 当前所有文件都在默认库根里。">
          </AdminEmptyState>
        </div>

        <!-- 分层搬移 -->
        <div class="ad-section-card">
          <div class="ad-section-card-head">
            <span class="ad-section-card-title">⚡ 分层搬移（热卷 → 冷卷）</span>
            <button class="ad-btn ad-btn-sm" @click="toggleTiering">
              {{ tieringEnabled ? '已开启（点击关闭）' : '已关闭（点击开启）' }}
            </button>
          </div>
          <div class="ad-dim" style="line-height:1.8">
            上传时先落<strong>热卷</strong>，用户立刻可用；空闲时自动把文件搬到<strong>冷卷</strong>，
            并更新索引里的存储位置 —— <strong>文件路径和链接都不变</strong>，用户完全无感。<br />
            搬移是「复制 → 校验 → 改索引 → 删源」四步，任何一步中断都不会丢数据：
            最坏情况是两份都在，自检会把多余的那份扫出来。
          </div>
          <div style="margin-top:10px" class="ad-dim">
            <template v-if="hotPending.files > 0">
              热卷上还有 <strong>{{ hotPending.files }}</strong> 个文件（{{ fmt(hotPending.bytes) }}）待搬移。
            </template>
            <template v-else>热卷目前是空的（这是正常状态）。</template>
            <span v-if="!hasCold"> 但<strong>没有可写的冷卷</strong>，所以暂时搬不了 —— 请挂载一块冷卷。</span>
          </div>
          <div v-if="busyServer" class="ad-dim" style="margin-top:6px">⏳ 正在搬移中…</div>
        </div>

        <div class="ad-hint-block">
          <strong>物理上平铺，逻辑上分层。</strong>
          文件在每块盘上都是平铺存放的（「卷根/.pool/」下，文件名是内部 ID），
          目录层级只存在于数据库里。所以<strong>改目录名、移动文件都不碰磁盘</strong>，
          也不会因为盘不同而失效。<br />
          想换一块盘：先挂载新盘设为冷卷 → 等文件搬过去 → 再卸载旧盘。
          卸载时字节不会被删，重新挂回同一路径即可恢复访问。
        </div>
      </template>
    </div>
  `,
}

/** 面板样式（只加这个页面用的，避免污染全局）。 */
export const STORAGE_PANEL_CSS = `
.st-bar-track {
  height: 8px;
  background: var(--ad-line);
  border-radius: 4px;
  overflow: hidden;
}
.st-bar {
  height: 100%;
  border-radius: 4px;
  transition: width .3s ease;
}
.st-bar-ok { background: #3aa76d; }
.st-bar-warn { background: #d9a441; }
.st-bar-danger { background: #d9534f; }
.st-bar-off { background: #999; width: 100% !important; opacity: .35; }
`
