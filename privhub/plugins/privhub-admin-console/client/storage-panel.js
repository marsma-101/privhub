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
  components: { AdminSkeleton, AdminErrorState, AdminEmptyState, StorageMigrate },
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
      /* 数据形态：取真实生效值。取不到就保持 null（界面显示「未知」），
       * 绝不默认成「明文」或「加密」—— 猜错比不显示更糟。 */
      const s = await vget('/privhub/api/settings')
      if (s.ok && s.data && s.data.settings && typeof s.data.settings.plainStorage === 'boolean') {
        this.plainLib = s.data.settings.plainStorage
      } else {
        this.plainLib = null
      }
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
      const applied = r.data && r.data.settings ? r.data.settings.plainStorage : want
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

        <!-- 默认写入卷指错了地方 → 提示（不是错误，但很难自己发现） -->
        <div v-if="defaultLooksWrong" class="ad-alert" style="margin-bottom:12px">
          <strong>默认写入卷可能不是你想要的</strong>
          <div class="ad-dim" style="margin-top:4px">{{ defaultLooksWrong }}</div>
        </div>

        <!-- ② 数据形态：明文 / 加密。
             这一段是 2026-11-16 合并时**新增**的：原先「存储卷」和「存储迁移」两页
             都没说清「我的文件到底加不加密」，而这一问题恰恰是运维最关心的。
             三个概念必须分开讲，否则用户会以为「整个系统都加密了」：
               a) 文件库（用户文件）—— 受 plainStorage 控制，默认明文
               b) 系统 JSON（账号/审计/session）—— **始终加密**，不受开关影响
               c) 老密文（迁移前遗留）—— 读取时自动解密，落盘时按 a) 的规则走 -->
        <div class="ad-section-card">
          <div class="ad-section-card-head">
            <span class="ad-section-card-title">🔐 数据形态（加密 / 明文）</span>
            <span class="ad-chip" :class="plainLib ? 'ad-chip-warn' : ''">
              {{ plainLib === null ? '未知' : (plainLib ? '用户文件：明文落盘' : '用户文件：加密落盘') }}
            </span>
          </div>

          <div v-if="plainLib === null" class="ad-dim">读取设置失败，无法判断当前形态。</div>
          <template v-else>
            <div style="margin-bottom:8px">
              <strong>{{ plainLib ? '当前是「明文」模式' : '当前是「加密」模式' }}</strong>
              <span class="ad-dim">
                —— {{ plainLib
                  ? '用户文件直接以原样存在磁盘上（nginx 可直读，性能最好）；系统数据仍然加密。'
                  : '用户文件以 PHENC1 密文存在磁盘上（每个字节都要经服务端解密，无法直读）。' }}
              </span>
            </div>

            <div class="ad-dim" style="margin-bottom:10px;line-height:1.7">
              <div>· <strong>用户文件</strong>（你上传的文档/图片）：受此开关控制。</div>
              <div>· <strong>系统数据</strong>（账号、审计、会话、密钥）：<strong>始终加密</strong>，不受此开关影响。</div>
              <div>· <strong>历史密文</strong>（老库遗留）：读取时自动解密；<strong>迁移到新池后按当前模式落盘</strong>
                （即：明文模式下会变成明文）。</div>
            </div>

            <!-- 切换开关：与现实一致才叫「配置」，因此这里直接反映真实生效值 -->
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" :checked="plainLib" :disabled="plainBusy" @change="togglePlain($event)" />
              <span>用户文件以明文保存（关闭 = 加密）</span>
            </label>
            <div class="ad-dim" style="margin-top:6px">
              ⚠ 改动<strong>需要重启服务</strong>才生效（加密形态在服务启动时就固定了）。
              重启后<strong>只影响新写入</strong>的文件；已有文件的形态不变，仍可正常读取。
            </div>
            <div v-if="plainSaving" class="ad-dim" style="margin-top:6px;color:var(--ad-warn)">已保存，重启后生效</div>
          </template>
        </div>

        <!-- 库根说明（**不重复列容量/文件数**：库根已作为「主库（系统）」在下面的卷列表里，
             数据由系统自动识别并展示。这里只解释它是怎么定出来的，避免两处各显示一遍）。 -->
        <div class="ad-section-card">
          <div class="ad-section-card-head">
            <span class="ad-section-card-title">📦 库根位置</span>
            <span class="ad-chip">{{ def && def.exists ? '在用' : '不存在' }}</span>
          </div>
          <div class="ad-dim" style="font-family:monospace;font-size:12px;word-break:break-all">
            {{ def && def.path }}
          </div>
          <div class="ad-dim" style="margin-top:6px">
            位置由系统自动解析（环境变量 <code>PRIVHUB_DATA_FILES</code> → <code>config/store.json</code> → 默认），
            无需手工挂载 —— 它已作为「主库（系统）」出现在下面的卷列表里。
            未挂载其他卷时所有文件都落这里；挂载卷之后新文件按卷策略分布，
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
              <!-- 系统库根：由系统自动识别（env / store.json / 默认值），不是谁手工挂的 -->
              <span class="ad-chip" v-if="v.isSystemRoot" title="系统自动识别的文件库根，数据就在这块盘上；路径由环境决定，不可改">主库（系统自动识别）</span>
              <span class="ad-chip" v-if="data && data.defaultVolumeId === v.id">默认写入</span>
              <span class="ad-chip" v-if="!v.enabled">已停用</span>
              <span class="ad-chip" v-if="!v.stat || !v.stat.online">离线</span>
              <span class="ad-chip" v-else-if="!v.writable">不可写</span>
              <!-- 系统库根也要能「设为默认」：把默认写入从一块空冷卷改回主库，
                   是最常见的纠错动作（配置错了却没有出口 = 用户干瞪眼）。 -->
              <button v-if="v.isSystemRoot && data && data.defaultVolumeId !== v.id"
                      class="ad-btn ad-btn-sm" @click="setDefault(v.id)">设为默认写入卷</button>
              <button v-if="!v.isSystemRoot" class="ad-btn ad-btn-sm" @click="editing === v.id ? cancelEdit() : startEdit(v)">
                {{ editing === v.id ? '收起' : '编辑' }}
              </button>
              <button v-else class="ad-btn ad-btn-sm" disabled title="系统库根不可卸载（那是本实例的数据所在地）">不可卸载</button>
              <button v-if="!v.isSystemRoot" class="ad-btn ad-btn-sm" :disabled="busy === v.id" @click="remove(v)">卸载</button>
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
        <!-- ③ 数据怎么搬：老库迁移（传统目录 → 扁平池）。
             2026-11-16 合并：原先这是独立一页「存储迁移」，与「存储卷」互相不知道
             对方存在 —— 用户在 A 页挂卷、在 B 页搬数据，却看不到"搬完会落到哪块盘"。
             合并后放在同一页，顺序也与真实心智一致：先看数据在哪（②段前）→ 是什么形态
             （②段）→ 要不要搬（本段）。 -->
        <storage-migrate @changed="load"></storage-migrate>
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
