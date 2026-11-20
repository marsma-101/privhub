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
/* 迁移面板（老库 → 扁平池）。2026-11-16 主人要求把「存储迁移」与「存储卷」合并成一页：
 * 两块本来强相关（搬完的数据要落到卷上），分成两页反而让人看不出因果关系。
 * 这里直接复用既有实现，不复制一份 —— 迁移的进度轮询/取消/失败明细都留在原组件里。 */
import { MigratePanel as StorageMigrate } from './panels.js'
/* 库搬迁（池内文件 → 指定卷 + 形态变换）。2026-11-17：这才是「程序与库分离」
 * 的主路径，放在老库迁移之前；老库迁移只处理外部老库，是补充。 */
import { RelocatePanel, RELOCATE_PANEL_CSS } from './relocate-panel.js'
/* 「按原文件名查看」面板：解决「搬到盘上一堆 ID 找不到文件」（2026-11-17）。 */
import { MirrorPanel, MIRROR_PANEL_CSS } from './mirror-panel.js'

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
  components: { AdminSkeleton, AdminErrorState, AdminEmptyState, StorageMigrate, RelocatePanel, MirrorPanel },
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
      /* 数据形态（2026-11-16 合并新增）：plainLib = 用户文件是否明文落盘。
       * null = 还没取到（别猜，猜错就是误导）。 */
      plainLib: null,
      plainBusy: false,
      plainSaving: false,
      /* 2026-11-17 重设计：三段式标签页。默认停在「总览」，
       * 因为大多数人进来只想看「我的数据在哪、多大、有没有问题」。 */
      tab: 'overview',
      /* 缺陷 2.3：系统数据明文清单（GET /storage/plaintext）。
       * null = 尚未取到；接口失败也保持 null（不猜）。 */
      plainFiles: null,
      plainFilesBusy: false,
      plainResults: null,
      /* 缺陷 3.2：明文迁移备份清单（GET /storage/backups）。null = 未取到，不猜。 */
      plainBackups: null,
      plainBackupsBusy: false,
    }
  },
  computed: {
    volumes() { return (this.data && this.data.volumes) || [] },
    /** 三段式标签（2026-11-17 重设计）。 */
    tabs() {
      return [
        { id: 'overview', icon: '💾', label: '总览' },
        { id: 'form', icon: '🔐', label: '加密形态' },
        { id: 'relocate', icon: '🚚', label: '搬迁与整理' },
      ]
    },
    /** 全部卷的文件数与字节数合计（顶部摘要用）。 */
    totalFiles() {
      return this.volumes.reduce((a, v) => a + (Number(v.files) || 0), 0)
    },
    totalBytes() {
      return this.volumes.reduce((a, v) => a + (Number(v.bytes) || 0), 0)
    },
    /** 程序与库是否分离：存在非系统卷且它是默认写入卷，或系统库根之外有文件。 */
    separated() {
      const sys = this.volumes.find((v) => v.isSystemRoot)
      const defId = this.data && this.data.defaultVolumeId
      if (!sys) return false
      if (defId && defId !== sys.id) return true
      return this.volumes.some((v) => !v.isSystemRoot && (Number(v.files) || 0) > 0)
    },
    /** 镜像面板用哪块卷：优先默认写入卷，回退系统库根。 */
    mirrorVolumeId() {
      const defId = this.data && this.data.defaultVolumeId
      if (defId) return defId
      const sys = this.volumes.find((v) => v.isSystemRoot)
      return sys ? sys.id : ''
    },
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
    /**
     * 当前被选为「默认写入」的卷。
     * 它是**显式配置**（defaultVolumeId），会优先于按角色自动选。
     */
    defaultVol() {
      const id = this.data && this.data.defaultVolumeId
      if (!id) return null
      return this.volumes.find((v) => v.id === id) || null
    },
    /**
     * 「默认写入」指向一个可疑目标时的提醒（2026-11-16 实测踩到）。
     *
     * 真实场景：把一块**空的冷卷**设成了默认写入，于是所有新上传都往那块空盘写，
     * 而承载着历史数据的主库反而收不到新文件 —— 界面上两块盘都"正常"，
     * 只有用户发现「我上传的文件不在原来那堆里」。这不是故障，是配置歧义，
     * 但**必须提示**，否则很难自己发现。
     *
     * 判定：默认卷是冷的、且它上面没有文件、而系统库根上有文件 → 提示。
     */
    defaultLooksWrong() {
      /* 注意：`defaultVol` 是 **computed**，访问它不能带括号（写成 this.defaultVol() 会
       * 抛 "this.defaultVol is not a function"，整个面板渲染失败变空白 —— 实测踩过）。 */
      const d = this.defaultVol
      if (!d) return null
      if (d.isSystemRoot) return null
      const sys = this.volumes.find((v) => v.isSystemRoot)
      if (!sys || !sys.files) return null
      if (d.files > 0) return null
      if (d.role === 'cold') {
        return '「' + d.label + '」是冷卷且还是空的，却被设为默认写入 —— 新上传会全部落到它上面，'
          + '而主库「' + sys.label + '」上的 ' + sys.files + ' 个已有文件不会被追加。'
          + '如果这不是你的本意，请点「设为默认」把主库设回默认写入。'
      }
      return null
    },
  },
  mounted() { void this.load(); void this.loadPlain() },
  methods: {
    fmt: fmtBytes,
    /** 缺陷 2.3：拉取系统数据明文清单（GET /storage/plaintext）。失败保持 null，不猜。
     *  缺陷 3.2：同时拉取迁移备份清单（GET /storage/backups），失败互不影响。 */
    async loadPlain() {
      const r = await vget('/privhub/api/storage/plaintext')
      this.plainFiles = r.ok ? r.data : null
      const rb = await vget('/privhub/api/storage/backups')
      this.plainBackups = rb.ok ? rb.data : null
    },
    /** 缺陷 3.1：文件行 kind 标记文本。 */
    kindLabel(kind) {
      if (kind === 'bak') return '.bak 备份'
      if (kind === 'tmp') return '.tmp 残留'
      return 'JSON 数据'
    },
    /** 缺陷 3.2：清理迁移明文备份（POST /storage/backups/delete）。 */
    async deletePlainBackups() {
      const d = this.plainBackups
      if (!d || !(d.total > 0)) return
      const ok = await confirmAction({
        title: '清理明文迁移备份',
        message: '将删除 ' + d.total + ' 个迁移产生的明文备份（.bak）。\n'
          + '备份里可能是这些系统数据最后的明文副本，确认迁移无误后再清理。确定执行吗？',
        confirmText: '清理备份',
      })
      if (!ok) return
      this.plainBackupsBusy = true
      const r = await vsend('/privhub/api/storage/backups/delete', {})
      this.plainBackupsBusy = false
      if (!r.ok && !r.data) { adminToast(r.error || '清理失败', 'error'); return }
      const res = r.data || {}
      const failed = (res.failed || []).length
      adminToast('清理完成：删除 ' + (res.deleted || 0) + ' 个' + (failed ? '，失败 ' + failed + ' 个' : ''), failed ? 'error' : 'ok')
      await this.loadPlain()
    },
    /** 缺陷 2.3：一键迁移系统数据明文 → 密文（POST /storage/migrate）。 */
    async migratePlain() {
      const d = this.plainFiles
      if (!d || !(d.total > 0)) return
      const ok = await confirmAction({
        title: '系统数据迁移为密文',
        message: '将把 ' + d.total + ' 个明文系统文件加密落盘（逐个生成备份后再替换）。\n迁移过程中这些数据不可写。确定执行吗？',
        confirmText: '开始迁移',
      })
      if (!ok) return
      this.plainFilesBusy = true
      const r = await vsend('/privhub/api/storage/migrate', {})
      this.plainFilesBusy = false
      if (!r.ok) { adminToast(r.error || '迁移失败', 'error'); return }
      const res = r.data
      const done = res.migrated || 0
      const failed = res.failed || 0
      this.plainResults = res.results || []
      adminToast('迁移完成：成功 ' + done + ' 个' + (failed ? '，失败 ' + failed + ' 个' : ''), failed ? 'error' : 'ok')
      await this.loadPlain()
    },
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
      /* 数据形态：取真实生效值。issue #4 · 4.1：settings.plainStorage 是写入通道的值
       * （默认 false），实际落盘形态由 main.ts 启动期判定（默认 true=明文），
       * 二者会打架 —— 照 settings 显示就是假显示。所以显示一律读 GET 下发的
       * effective.fileLibPlain（svc-storage 的真实生效值）；取不到才回退
       * settings.plainStorage（旧后端兼容），再取不到 null（界面显示「未知」），
       * 绝不默认成「明文」或「加密」—— 猜错比不显示更糟。 */
      const s = await vget('/privhub/api/settings')
      const eff = s.ok && s.data && s.data.effective && typeof s.data.effective.fileLibPlain === 'boolean'
        ? s.data.effective.fileLibPlain
        : null
      const fromSettings = s.ok && s.data && s.data.settings && typeof s.data.settings.plainStorage === 'boolean'
        ? s.data.settings.plainStorage
        : null
      this.plainLib = eff !== null ? eff : fromSettings
      this.loading = false
    },
    /** 切换「用户文件明文落盘」。如实提交、如实回读，失败就还原勾选。 */
    async togglePlain(ev) {
      const want = !!(ev && ev.target && ev.target.checked)
      this.plainBusy = true
      const r = await vsend('/privhub/api/settings', { plainStorage: want })
      this.plainBusy = false
      if (!r.ok) {
        adminToast(r.error || '保存失败', 'error')
        if (ev && ev.target) ev.target.checked = !want
        return
      }
      /* 回读同理用生效值（issue #4 · 4.1）：POST 响应里也带 effective（仍是保存前的
       * 生效值 —— 开关需重启才生效），有就用它，没有回退 settings.plainStorage。 */
      const effNow = r.data && r.data.effective && typeof r.data.effective.fileLibPlain === 'boolean'
        ? r.data.effective.fileLibPlain
        : null
      const applied = effNow !== null ? effNow
        : (r.data && r.data.settings && typeof r.data.settings.plainStorage === 'boolean' ? r.data.settings.plainStorage : want)
      this.plainLib = typeof applied === 'boolean' ? applied : want
      this.plainSaving = true
      adminToast('已保存：用户文件将' + (this.plainLib ? '明文' : '加密') + '落盘（重启后生效）', 'ok')
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
    <div class="ad-page st-page">
      <AdminSkeleton v-if="loading" :rows="4"></AdminSkeleton>
      <AdminErrorState v-else-if="error" :message="error" @retry="load"></AdminErrorState>
      <template v-else>
        <!-- 顶部现状摘要：先给结论，再给操作（2026-11-17 重设计） -->
        <div class="st-hero">
          <div class="st-hero-main">
            <div class="st-hero-line">
              <span class="st-hero-k">数据存放</span>
              <span class="st-hero-v">{{ volumes.length }} 块盘 · {{ totalFiles }} 个文件 · {{ fmt(totalBytes) }}</span>
            </div>
            <div class="st-hero-line">
              <span class="st-hero-k">加密形态</span>
              <span class="st-hero-v">
                <template v-if="plainLib === null">未知（读取设置失败）</template>
                <template v-else>{{ plainLib ? '明文落盘（最快，可直读）' : '加密落盘' }}</template>
              </span>
            </div>
            <div class="st-hero-line">
              <span class="st-hero-k">程序与库</span>
              <span class="st-hero-v" :class="{ 'st-warn': !separated }">
                {{ separated ? '已分离（数据在独立盘）' : '未分离（库根在程序目录内）' }}
              </span>
            </div>
          </div>
          <div class="st-hero-acts">
            <button v-if="!separated" class="ad-btn ad-btn-sm" @click="tab = 'relocate'">去分离 →</button>
          </div>
        </div>

        <div v-if="noWritable" class="ad-alert ad-alert-error" style="margin:12px 0">
          <strong>当前没有任何可写的存储卷</strong>
          <div class="ad-dim" style="margin-top:4px">
            所有卷都已满、离线或已停用，<strong>新上传会全部失败</strong>。请检查剩余空间或挂载新卷。
          </div>
        </div>
        <div v-if="defaultLooksWrong" class="ad-alert" style="margin:12px 0">
          <strong>默认写入卷可能不是你想要的</strong>
          <div class="ad-dim" style="margin-top:4px">{{ defaultLooksWrong }}</div>
        </div>

        <!-- 三段式标签页 -->
        <div class="st-tabs" role="tablist">
          <button
            v-for="t in tabs" :key="t.id"
            class="st-tab" :class="{ on: tab === t.id }"
            role="tab" :aria-selected="tab === t.id ? 'true' : 'false'"
            @click="tab = t.id"
          >
            <span class="st-tab-ic">{{ t.icon }}</span>
            <span class="st-tab-tx">{{ t.label }}</span>
          </button>
        </div>

        <!-- ① 总览 -->
        <template v-if="tab === 'overview'">
          <div class="ad-section-card">
            <div class="ad-section-card-head">
              <span class="ad-section-card-title">💾 存储卷</span>
              <div class="ad-actions">
                <button class="ad-btn ad-btn-primary ad-btn-sm" @click="showForm = !showForm">
                  {{ showForm ? '取消' : '＋ 挂载新卷' }}
                </button>
              </div>
            </div>

            <div v-if="showForm" class="st-form">
              <div style="display:flex;gap:8px;align-items:flex-start">
                <input v-model="form.root" class="ad-input" style="flex:1"
                  placeholder="D:\\privhub-store  或  \\\\192.168.1.10\\share\\privhub" @change="doProbe" />
                <button class="ad-btn ad-btn-sm" :disabled="probeBusy" @click="doProbe">
                  {{ probeBusy ? '探测中…' : '探测' }}
                </button>
              </div>
              <div v-if="probe" class="ad-dim" style="margin-top:6px">
                <template v-if="probe.stat && probe.stat.online">
                  ✅ 可访问 · 总 {{ fmt(probe.stat.total) }} · 剩余 {{ fmt(probe.stat.free) }}
                  <span v-if="!probe.exists">（目录不存在，挂载时自动创建）</span>
                </template>
                <template v-else>
                  ⚠️ 暂时不可达：{{ (probe.stat && probe.stat.error) || '路径无效' }}
                  <span class="ad-dim">（仍可挂载，设备上线后自动可用）</span>
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
                  <input v-model.number="form.highWatermark" type="number" min="1" max="99" class="ad-input" style="width:70px" /> %
                </label>
                <button class="ad-btn ad-btn-primary ad-btn-sm" :disabled="busy === 'add'" @click="add">
                  {{ busy === 'add' ? '挂载中…' : '确认挂载' }}
                </button>
              </div>
            </div>

            <div v-for="v in volumes" :key="v.id" class="st-vol">
              <div class="st-vol-head">
                <span class="st-vol-ic">{{ roleIcon(v.role) }}</span>
                <strong class="st-vol-name">{{ v.label }}</strong>
                <span class="ad-chip" v-if="v.isSystemRoot" title="系统自动识别的文件库根">主库</span>
                <span class="ad-chip" v-if="data && data.defaultVolumeId === v.id">默认写入</span>
                <span class="ad-chip" v-if="!v.enabled">已停用</span>
                <span class="ad-chip" v-if="!v.stat || !v.stat.online">离线</span>
                <span class="ad-chip" v-else-if="!v.writable">不可写</span>
                <span class="st-vol-grow"></span>
                <button v-if="v.isSystemRoot && data && data.defaultVolumeId !== v.id"
                  class="ad-btn ad-btn-sm" @click="setDefault(v.id)">设为默认</button>
                <button v-if="!v.isSystemRoot" class="ad-btn ad-btn-sm"
                  @click="editing === v.id ? cancelEdit() : startEdit(v)">
                  {{ editing === v.id ? '收起' : '编辑' }}
                </button>
                <button v-if="!v.isSystemRoot" class="ad-btn ad-btn-sm" :disabled="busy === v.id" @click="remove(v)">卸载</button>
              </div>
              <div class="st-vol-path">{{ v.root }}</div>
              <div class="st-bar-track" style="margin-top:6px">
                <div :class="barClass(v)" :style="{ width: Math.min(100, pct(v)) + '%' }"></div>
              </div>
              <div class="st-vol-stat">
                <template v-if="v.stat && v.stat.online">
                  <strong>{{ v.files }}</strong> 个文件 · {{ fmt(v.bytes) }}
                  <span class="st-vol-dim">| 盘已用 {{ fmt(v.stat.used) }} / {{ fmt(v.stat.total) }}（{{ pct(v) }}%），剩余 {{ fmt(v.stat.free) }}</span>
                </template>
                <template v-else>容量不可读（卷离线）</template>
              </div>

              <div v-if="editing === v.id" class="st-form" style="margin-top:8px">
                <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                  <input v-model="editBuf.label" class="ad-input" style="width:180px" placeholder="名称" />
                  <select v-model="editBuf.role" class="ad-input" style="width:180px">
                    <option value="hot">⚡ 热卷</option>
                    <option value="cold">🧊 冷卷</option>
                    <option value="any">💾 通用卷</option>
                  </select>
                  <label class="ad-dim" style="display:flex;align-items:center;gap:6px">
                    保留余量 <input v-model.number="editBuf.highWatermark" type="number" min="1" max="99" class="ad-input" style="width:70px" /> %
                  </label>
                  <button class="ad-btn ad-btn-primary ad-btn-sm" :disabled="busy === v.id" @click="saveEdit(v)">保存</button>
                </div>
              </div>
            </div>

            <AdminEmptyState v-if="!volumes.length"
              message="还没有挂载任何存储卷 —— 当前所有文件都在默认库根里。"></AdminEmptyState>
          </div>

          <mirror-panel :volume-id="mirrorVolumeId"></mirror-panel>

          <details class="st-details">
            <summary>库根位置与布局原理（技术细节）</summary>
            <div class="st-details-body">
              <div><strong>库根：</strong><code>{{ (def && def.path) || '—' }}</code></div>
              <div style="margin-top:6px">
                由系统自动解析（<code>PRIVHUB_DATA_FILES</code> → <code>config/store.json</code> → 默认），无需手工挂载。
              </div>
              <div style="margin-top:6px">
                <strong>物理布局：</strong>程序把字节平铺存在 <code>&lt;卷根&gt;/.pool/&lt;内部ID&gt;</code>（磁盘上不会有用户可控路径，安全）；
                <code>&lt;卷根&gt;/.library-view/&lt;项目&gt;/&lt;原文件名&gt;</code> 是给你按原名查看的硬链接（不占额外空间）。
              </div>
            </div>
          </details>
        </template>

        <!-- ② 加密形态 -->
        <template v-else-if="tab === 'form'">
          <div class="ad-section-card">
            <div class="ad-section-card-head">
              <span class="ad-section-card-title">🔐 加密形态</span>
              <span class="ad-chip" :class="plainLib ? 'ad-chip-warn' : ''">
                {{ plainLib === null ? '未知' : (plainLib ? '明文落盘' : '加密落盘') }}
              </span>
            </div>

            <div v-if="plainLib === null" class="ad-dim">读取设置失败，无法判断当前形态。</div>
            <template v-else>
              <div style="margin-bottom:10px">
                <strong>{{ plainLib ? '当前是「明文」模式' : '当前是「加密」模式' }}</strong>
                <span class="ad-dim">
                  —— {{ plainLib
                    ? '用户文件以原样存在磁盘上（可直读，性能最好）；系统数据仍加密。'
                    : '用户文件以密文存在磁盘上（每个字节都要服务端解密，无法直读）。' }}
                </span>
              </div>

              <label class="st-switch">
                <input type="checkbox" :checked="plainLib" :disabled="plainBusy" @change="togglePlain($event)" />
                <span>用户文件以明文保存（关闭 = 加密）</span>
              </label>
              <div class="ad-dim" style="margin-top:8px;line-height:1.7">
                ⚠ 改动<strong>需要重启服务</strong>才生效，且<strong>只影响新写入</strong>的文件；
                已有文件形态不变，仍可正常读取。
              </div>
              <div v-if="plainSaving" class="ad-dim" style="margin-top:6px;color:var(--ad-warn)">已保存，重启后生效</div>

              <details class="st-details" style="margin-top:12px">
                <summary>三类数据分别是什么形态？</summary>
                <div class="st-details-body">
                  <div>· <strong>用户文件</strong>（上传的文档/图片）：受上面开关控制。</div>
                  <div>· <strong>系统数据</strong>（账号、审计、会话、密钥）：目标形态为加密，当前仍有 {{ (plainFiles && plainFiles.total) || 0 }} 个明文文件待迁移（见下方清单）。</div>
                  <div>· <strong>历史密文</strong>（老库遗留）：读取时自动解密；搬迁后按当前模式落盘。</div>
                </div>
              </details>

              <!-- 缺陷 2.3：系统数据明文清单 + 一键迁移（API 已有，此前无 UI）。 -->
              <div class="st-details" style="margin-top:12px;padding:12px;border:1px solid var(--admin-border);border-radius:8px">
                <div style="font-weight:600;margin-bottom:6px">🧾 系统数据明文清单</div>
                <div v-if="plainFiles === null" class="ad-dim">读取明文清单失败。</div>
                <template v-else>
                  <div v-if="!plainFiles.encryptionEnabled" class="ad-dim">加密未启用，无需迁移。</div>
                  <template v-else>
                    <div v-if="plainFiles.total > 0" class="ad-dim" style="margin-bottom:8px">
                      目标形态为加密，当前仍有 <strong>{{ plainFiles.total }}</strong> 个明文文件待迁移。
                    </div>
                    <div v-else class="ad-dim">系统数据已全部加密 ✅</div>
                    <div v-if="plainFiles.files && plainFiles.files.length" style="margin:8px 0;line-height:1.8">
                      <div v-for="f in plainFiles.files" :key="f.name" class="ad-dim">
                        · <code>{{ f.name }}</code>（{{ fmt(f.bytes) }}）
                        <span class="ad-chip">{{ kindLabel(f.kind) }}</span>
                      </div>
                    </div>
                    <div class="ad-actions" style="margin-top:8px" v-if="plainFiles.total > 0">
                      <button class="ad-btn ad-btn-primary ad-btn-sm" :disabled="plainFilesBusy" @click="migratePlain">
                        {{ plainFilesBusy ? '迁移中…' : '一键迁移为密文' }}
                      </button>
                    </div>
                    <div v-if="plainResults && plainResults.length" style="margin-top:8px;line-height:1.7">
                      <div style="font-weight:600;margin-bottom:4px">迁移结果</div>
                      <div v-for="r in plainResults" :key="r.name" class="ad-dim">
                        · {{ r.name }}：{{ r.status }}{{ r.reason ? '（' + r.reason + '）' : '' }}
                      </div>
                    </div>

                    <!-- 缺陷 3.2：明文迁移备份区（可列举 + 显式清理） -->
                    <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--admin-border)">
                      <div style="font-weight:600;margin-bottom:6px">🗃 明文备份</div>
                      <div v-if="plainBackups === null" class="ad-dim">读取备份清单失败。</div>
                      <template v-else>
                        <div v-if="!plainBackups.total" class="ad-dim">暂无迁移备份。</div>
                        <template v-else>
                          <div class="ad-dim" style="margin-bottom:8px">
                            共 <strong>{{ plainBackups.total }}</strong> 个迁移明文备份：
                          </div>
                          <div style="margin:8px 0;line-height:1.8">
                            <div v-for="b in plainBackups.files" :key="b.name" class="ad-dim">
                              · <code>{{ b.name }}</code>（{{ fmt(b.bytes) }}，{{ new Date(b.at).toLocaleString() }}）
                            </div>
                          </div>
                          <div class="ad-actions" style="margin-top:8px">
                            <button class="ad-btn ad-btn-sm" :disabled="plainBackupsBusy" @click="deletePlainBackups">
                              {{ plainBackupsBusy ? '清理中…' : '清理备份' }}
                            </button>
                          </div>
                        </template>
                      </template>
                    </div>
                  </template>
                </template>
              </div>
            </template>
          </div>
        </template>

        <!-- ③ 搬迁与整理 -->
        <template v-else-if="tab === 'relocate'">
          <relocate-panel @changed="load"></relocate-panel>

          <details class="st-details">
            <summary>分层搬移（热卷 → 冷卷）—— 已{{ tieringEnabled ? '开启' : '关闭' }}</summary>
            <div class="st-details-body">
              <div class="ad-dim" style="line-height:1.8">
                上传先落<strong>热卷</strong>，立刻可用；空闲时自动搬到<strong>冷卷</strong>，
                并更新索引位置 —— 路径和链接都不变。<br />
                搬移是「复制 → 校验 → 改索引 → 删源」，中断不丢数据。
              </div>
              <div style="margin-top:8px" class="ad-dim">
                <template v-if="hotPending.files > 0">
                  热卷上还有 <strong>{{ hotPending.files }}</strong> 个文件（{{ fmt(hotPending.bytes) }}）待搬移。
                </template>
                <template v-else>热卷目前是空的（正常状态）。</template>
                <span v-if="!hasCold"> 但没有可写的冷卷，暂时搬不了。</span>
              </div>
              <div class="ad-actions" style="margin-top:10px">
                <button class="ad-btn ad-btn-sm" :disabled="busy === 'tier' || !canTier" @click="tieringNow">
                  {{ busy === 'tier' ? '搬移中…' : '立即搬移一轮' }}
                </button>
                <button class="ad-btn ad-btn-sm" @click="toggleTiering">
                  {{ tieringEnabled ? '关闭自动搬移' : '开启自动搬移' }}
                </button>
              </div>
              <div v-if="busyServer" class="ad-dim" style="margin-top:6px">⏳ 正在搬移中…</div>
            </div>
          </details>

          <details class="st-details">
            <summary>老库迁移（外部老库 → 本库）—— 只处理还在外部目录里的旧文件</summary>
            <div class="st-details-body">
              <div class="ad-dim" style="margin-bottom:10px;line-height:1.7">
                ⚠ 这里<strong>只搬「还在外部老库目录里」的文件</strong>。
                已在库里的文件请用上面的「🚚 库搬迁」换盘/转明文。
              </div>
              <storage-migrate @changed="load"></storage-migrate>
            </div>
          </details>
        </template>
      </template>
    </div>
  `,
}

/** 面板样式（只加这个页面用的，避免污染全局）。 */
export const STORAGE_PANEL_CSS = `
/* ===== 存储页（2026-11-17 重设计：从 6 张平铺卡片 → 摘要 + 三段标签页） ===== */
.st-page { max-width: 1180px; }

/* 顶部现状摘要：先给结论 */
.st-hero {
  display: flex; align-items: flex-start; gap: 16px;
  padding: 16px 18px; margin-bottom: 14px;
  background: var(--admin-card-bg);
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius);
  box-shadow: var(--admin-shadow);
}
.st-hero-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 7px; }
.st-hero-line { display: flex; align-items: baseline; gap: 10px; font-size: 13px; }
.st-hero-k { flex: 0 0 68px; color: var(--admin-text-muted); font-size: 12px; }
.st-hero-v { flex: 1; color: var(--admin-text); font-weight: 500; }
.st-hero-v.st-warn { color: var(--admin-warn); }
.st-hero-acts { flex: 0 0 auto; }

/* 三段标签页 */
.st-tabs {
  display: flex; gap: 6px; margin-bottom: 14px;
  border-bottom: 1px solid var(--admin-border);
}
.st-tab {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 16px; cursor: pointer; font-size: 13px;
  background: none; border: none; border-bottom: 2px solid transparent;
  color: var(--admin-text-muted); transition: .14s;
}
.st-tab:hover { color: var(--admin-text); }
.st-tab.on { color: var(--admin-primary); border-bottom-color: var(--admin-primary); font-weight: 600; }
.st-tab-ic { font-size: 14px; }

/* 卷卡片：紧凑行式，不再每块占一大段 */
.st-vol {
  padding: 14px 0; border-bottom: 1px solid var(--admin-border);
}
.st-vol:last-child { border-bottom: none; }
.st-vol-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.st-vol-ic { font-size: 14px; }
.st-vol-name { font-size: 13.5px; }
.st-vol-grow { flex: 1; min-width: 8px; }
.st-vol-path {
  margin-top: 3px; font-family: ui-monospace, Consolas, monospace;
  font-size: 11.5px; color: var(--admin-text-muted);
  word-break: break-all;
}
.st-vol-stat { margin-top: 5px; font-size: 12px; color: var(--admin-text); }
.st-vol-dim { color: var(--admin-text-muted); }

.st-form {
  padding: 12px; margin: 8px 0;
  background: var(--admin-bg);
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius);
}

/* 折叠区：技术细节/低频功能收在这里，默认不占视线 */
.st-details {
  margin-top: 14px;
  background: var(--admin-card-bg);
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius);
  overflow: hidden;
}
.st-details > summary {
  padding: 11px 16px; cursor: pointer; font-size: 12.5px;
  color: var(--admin-text-muted); user-select: none;
  list-style: none;
}
.st-details > summary::-webkit-details-marker { display: none; }
.st-details > summary::before { content: '▸ '; color: var(--admin-text-muted); }
.st-details[open] > summary::before { content: '▾ '; }
.st-details > summary:hover { color: var(--admin-primary); }
.st-details-body { padding: 0 16px 14px; font-size: 12.5px; color: var(--admin-text); }
.st-details-body code {
  font-family: ui-monospace, Consolas, monospace; font-size: 11.5px;
  background: var(--admin-bg); padding: 1px 5px; border-radius: 4px;
  word-break: break-all;
}

.st-switch { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; }
.st-switch input { margin: 0; }

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
