/**
 * privhub-store-ops · client —— 存储运维（超管）面板（挂 admin-storeops slot）
 *
 * 设计稿：docs/存储搬迁重构架构设计-2026-11-20.md §二/§四（v2 阶段 3 前端）。
 * 挂载：管理控制台 → 系统运维 → 存储运维（超管）。admin-console 的 routes.js
 * 有一行指向本 slot 的路由条目（与 privhub-webhook / privhub-update 同一套接线：
 * 控制台路由表是静态表，不支持外部注册，新子页 = 那边加一行 + 这边声明 slot）。
 *
 * 两块面板：
 *   A 扫描与建库   POST /privhub/api/storeinfo/scan（202 轮询 status）
 *                  + 一键「扫描+建库+搬移」POST /privhub/api/storeops/scan+build
 *   B 物理搬移     POST /privhub/api/storeops/move（202 轮询 move-status）+ move-cancel
 *
 * 权限：后端全部路由仅 system_admin（普通管理员也 403）；前端入口由 manifest 的
 * capFeature=admin.storage（minRole=system_admin）过滤，组件挂载后再按
 * window.PrivHub.isSystemAdmin() 二次拦截（非超管整页显示「仅系统管理员可用」）。
 *
 * 客户端纪律：本插件是 client-only，由浏览器 import() 加载；**不 import 其它插件的
 * 内部模块**（admin-console 的模块没有公开导出路径），小工具（vget/vsend/确认框/
 * toast）就地自建；样式 import 即注入（学 relocate-panel 的写法）。
 *
 * @module privhub-store-ops/client
 */

const { api } = window.PrivHub

/* ── 就地自建的小工具（不跨插件 import） ── */

async function vget(path) {
  try { const r = await api(path); if (r && r.ok) return { ok: true, data: r }; return { ok: false, error: (r && r.error) || '接口返回失败' } }
  catch (e) { return { ok: false, error: (e && e.message) || '网络错误' } }
}
async function vsend(path, payload) {
  try { const r = await api(path, { method: 'POST', body: JSON.stringify(payload || {}) }); if (r && r.ok) return { ok: true, data: r }; return { ok: false, error: (r && r.error) || '操作失败' } }
  catch (e) { return { ok: false, error: (e && e.message) || '网络错误' } }
}

/** 轻提示：优先走管理台的 toast 容器不可达（跨插件），直接用骨架全局 toast。 */
function soToast(msg, type) {
  try { window.PrivHub.toast(msg, type || 'success') } catch { /* 忽略 */ }
}

/* 哨兵：默认库根（就地，不换盘）。真实卷 id 形如 V0000…，不会相撞。
 * 发给后端时映射为 volumeId / targetVolumeId = ''（后端归一为 null）。 */
const SO_DEFAULT = '__default_root__'

const MODE_HINT = {
  decrypt: '解密成明文：搬完目标盘上是明文（为运行速度推荐）。',
  encrypt: '加密成密文：目标盘上的文件以 PHENC1 加密存放（读取时自动解密）。',
  keep: '保持不变：源是密文就仍密文、源是明文就仍明文，原样字节复制。',
}

const StoreOpsPanel = {
  name: 'admin-storeops',
  data() {
    return {
      canUse: false,          // 非超管整页隐藏，显示「仅系统管理员可用」
      loading: true, error: '',
      volumes: [],
      /* 面板 A：扫描与建库 */
      scanVolumeId: SO_DEFAULT,
      scanBusy: false,
      scanStatus: null,       // storeinfo/status：entries/pathDrift/sample*/run
      scanMsg: '',
      buildBusy: false,       // 一键扫描+建库+搬移
      /* 面板 A：文件清单（entries 路由分页） */
      listEntries: [],
      listTotal: 0,
      listOffset: 0,
      listLimit: 100,
      listBusy: false,
      listMsg: '',
      /* 面板 B：物理搬移 */
      mvTargetId: SO_DEFAULT,
      mvProject: '',
      mvIncludePersonal: false,
      mvMode: 'keep',
      mvDeleteSource: false,
      mvSetDefault: false,
      mvBusy: false,
      mvStatus: null,         // move-status
      mvMsg: '',
      mvConfirm: null,        // { title, message, resolve } 本地确认框
      _scanTimer: null,
      _mvTimer: null,
    }
  },
  computed: {
    volumesAll() {
      return [{ id: SO_DEFAULT, label: '默认库根', root: '' }].concat(this.volumes || [])
    },
    scanVolumeLabel() {
      const v = (this.volumes || []).find((x) => x.id === this.scanVolumeId)
      return this.scanVolumeId === SO_DEFAULT ? '默认库根' : (v ? (v.label || v.root) : this.scanVolumeId)
    },
    modeHint() { return MODE_HINT[this.mvMode] || '' },
    mvRunning() { return !!(this.mvStatus && this.mvStatus.running) },
    mvPhase() {
      const s = this.mvStatus
      if (!s || !s.running) return ''
      return s.phase === 'scan' ? '扫描中' : s.phase === 'move' ? '搬移中' : '进行中'
    },
    mvPct() {
      const s = this.mvStatus
      if (!s || !s.target) return 0
      return Math.min(100, Math.round((s.done / s.target) * 100))
    },
    /* 搬完（非运行 + 默认库根）时的抽样口径：c=0 → 「抽样全部为明文 ✅」 */
    cipherNote() {
      const s = this.mvStatus
      const sample = s && !s.running && s.targetVolumeId === null && s.poolCipherSample ? s.poolCipherSample : null
      if (!sample) return ''
      return sample.cipher === 0
        ? '抽样全部为明文 ✅'
        : ('抽样 ' + sample.checked + ' 条中 ' + sample.cipher + ' 条仍是密文')
    },
    failedRecent() {
      const s = this.mvStatus
      return (s && Array.isArray(s.failedRecent)) ? s.failedRecent : []
    },
    scanRunning() { return !!(this.scanStatus && this.scanStatus.run && this.scanStatus.run.running) },
  },
  methods: {
    /* ---------- 面板 A：文件清单（entries 分页） ---------- */
    async loadEntries(offset) {
      if (this.listBusy) return
      this.listBusy = true; this.listMsg = ''
      const vid = this.scanVolumeId === SO_DEFAULT ? '' : this.scanVolumeId
      const qs = 'volumeId=' + encodeURIComponent(vid)
        + '&limit=' + this.listLimit
        + '&offset=' + (Number.isFinite(offset) ? Math.max(0, offset) : 0)
      const r = await vget('/privhub/api/storeinfo/entries?' + qs)
      this.listBusy = false
      if (!r.ok) { this.listMsg = r.error || '读取清单失败'; soToast(this.listMsg, 'error'); return }
      this.listEntries = (r.data && r.data.entries) || []
      this.listTotal = (r.data && r.data.total) || 0
      this.listOffset = Number.isFinite(offset) ? Math.max(0, offset) : 0
    },
    prevEntries() { if (this.listOffset > 0) this.loadEntries(Math.max(0, this.listOffset - this.listLimit)) },
    nextEntries() {
      if (this.listOffset + this.listLimit < this.listTotal) this.loadEntries(this.listOffset + this.listLimit)
    },
    soVisibility(entry) {
      const v = entry && entry.access && entry.access.visibility
      if (v === 'personal') return '个人空间'
      if (v === 'restricted') return '受限'
      return '项目开放'
    },
    soSize(n) {
      const v = Number(n) || 0
      if (v < 1024) return v + ' B'
      if (v < 1048576) return (v / 1024).toFixed(1) + ' KB'
      if (v < 1073741824) return (v / 1048576).toFixed(1) + ' MB'
      return (v / 1073741824).toFixed(2) + ' GB'
    },
    soVolumeLabel(id) {
      if (!id) return '默认库根'
      const v = (this.volumes || []).find((x) => x.id === id)
      return v ? (v.label || v.root || id) : id
    },
    /* ---------- 取数 ---------- */
    async load() {
      this.loading = true; this.error = ''
      const [vols, st] = await Promise.all([
        vget('/privhub/api/volumes/list'),
        vget(this.statusUrl(this.scanVolumeId)),
      ])
      if (!vols.ok && !st.ok) {
        this.error = '读取存储状态失败：' + (vols.error || st.error)
          + (st.error && st.error.indexOf('403') >= 0 ? '（仅系统管理员可用）' : '')
        this.loading = false
        return
      }
      if (vols.ok) this.volumes = (vols.data && vols.data.volumes) || []
      if (st.ok) this.scanStatus = st.data
      this.loading = false
      if (this.scanRunning) this.pollScan()
    },
    statusUrl(id) {
      const v = id === SO_DEFAULT ? '' : id
      return '/privhub/api/storeinfo/status?volumeId=' + encodeURIComponent(v)
    },
    /* ---------- 面板 A：扫描登记（202 + 轮询） ---------- */
    async startScan() {
      if (this.scanBusy || this.scanRunning) return
      const okGo = await this.soConfirm({
        title: '扫描登记「' + this.scanVolumeLabel + '」',
        message: '将递归扫描该卷上实际存在的全部文件（含个人空间条目）并登记进主索引。\n'
          + '已有池内条目不会被翻回；个人空间条目仅本页（超管）可见。',
        confirmText: '开始扫描',
      })
      if (!okGo) return
      this.scanBusy = true; this.scanMsg = ''
      const vid = this.scanVolumeId === SO_DEFAULT ? '' : this.scanVolumeId
      const r = await vsend('/privhub/api/storeinfo/scan', { volumeId: vid })
      if (!r.ok) { this.scanBusy = false; soToast(r.error || '启动扫描失败', 'error'); return }
      soToast('扫描已开始（后台执行）')
      this.pollScan()
    },
    pollScan() {
      this.stopScanPoll()
      this._scanTimer = setInterval(async () => {
        const r = await vget(this.statusUrl(this.scanVolumeId))
        if (!r.ok) return
        this.scanStatus = r.data
        if (!(r.data.run && r.data.run.running)) {
          this.stopScanPoll()
          this.scanBusy = false
          const res = r.data.run && r.data.run.lastResult
          const err = r.data.run && r.data.run.lastError
          if (err) soToast('扫描异常中止：' + err, 'error')
          else if (res) soToast('扫描完成：新建 ' + res.created + '，更新 ' + res.updated + (res.failed ? '，失败 ' + res.failed : ''))
        }
      }, 1000)
    },
    stopScanPoll() { if (this._scanTimer) { clearInterval(this._scanTimer); this._scanTimer = null } },
    async cancelScan() {
      const r = await vsend('/privhub/api/storeinfo/cancel', {})
      if (!r.ok) { soToast(r.error || '取消失败', 'error'); return }
      soToast('已请求停止扫描', 'warn')
    },
    /* ---------- 一键扫描+建库+搬移 ---------- */
    async startScanBuild() {
      if (this.buildBusy || this.mvRunning) return
      const okGo = await this.soConfirm({
        title: '一键扫描+建库+搬移「' + this.scanVolumeLabel + '」',
        message: '将连做两步：\n'
          + '① 扫描登记该卷全部文件（含个人空间）；\n'
          + '② 扫描完成后自动搬移（保持形态、不删源、含个人空间、目标=同卷），把扫出的条目收敛进池布局。\n'
          + '进度与搬移共用同一任务（页面下方「物理搬移」面板可见）。',
        confirmText: '开始（两步连做）',
      })
      if (!okGo) return
      this.buildBusy = true; this.scanMsg = ''
      const vid = this.scanVolumeId === SO_DEFAULT ? '' : this.scanVolumeId
      const r = await vsend('/privhub/api/storeops/scan+build', { volumeId: vid })
      if (!r.ok) { this.buildBusy = false; soToast(r.error || '启动失败', 'error'); return }
      soToast('扫描+建库+搬移已开始（后台执行，进度见「物理搬移」）')
      this.pollScan()
      this.pollMove()
    },
    /* ---------- 面板 B：物理搬移 ---------- */
    async startMove() {
      if (this.mvBusy || this.mvRunning) return
      const vol = (this.volumes || []).find((x) => x.id === this.mvTargetId)
      const targetText = this.mvTargetId === SO_DEFAULT
        ? '默认库根（就地）'
        : (vol ? vol.label + '（' + vol.root + '）' : this.mvTargetId)
      const modeText = this.mvMode === 'decrypt' ? '解密成明文' : this.mvMode === 'encrypt' ? '加密成密文' : '保持不变'
      const okGo = await this.soConfirm({
        title: '开始物理搬移 → ' + targetText,
        message: '· 范围：全库（扫描登记条目）'
          + (this.mvIncludePersonal ? '，含个人空间（超管全库操作）' : '，不含个人空间') + '\n'
          + '· 形态：' + modeText + '\n'
          + '· ' + (this.mvDeleteSource ? '搬完删除源文件（真正的移动）' : '源文件保留（可回退）') + '\n'
          + (this.mvTargetId !== SO_DEFAULT
            ? '· ' + (this.mvSetDefault ? '搬完把默认写入卷切到目标卷（旧文件不跟过去，新上传落新盘）' : '不切换默认写入卷') + '\n'
            : '') + '\n低并发后台执行，可随时停止；已完成的不会重搬。',
        confirmText: '开始搬移',
      })
      if (!okGo) return
      this.mvBusy = true; this.mvMsg = ''
      const r = await vsend('/privhub/api/storeops/move', {
        targetVolumeId: this.mvTargetId === SO_DEFAULT ? null : this.mvTargetId,
        mode: this.mvMode,
        project: this.mvProject || undefined,
        includePersonal: this.mvIncludePersonal,
        deleteSource: this.mvDeleteSource,
        setDefault: this.mvTargetId !== SO_DEFAULT ? this.mvSetDefault : false,
      })
      if (!r.ok) { this.mvBusy = false; soToast(r.error || '启动搬移失败', 'error'); return }
      /* 后端没东西可搬时 started=false（200），如实反馈。 */
      if (r.data && r.data.started === false) {
        this.mvBusy = false
        this.mvMsg = r.data.message || '没有可搬移的条目'
        soToast(this.mvMsg, 'warn')
        await this.refreshMove()
        return
      }
      this.mvMsg = '已启动：' + (r.data && r.data.queued != null ? r.data.queued + ' 个条目' : '') + ' → ' + targetText + '（' + modeText + '）'
      soToast('物理搬移已启动')
      this.refreshMove()
      this.pollMove()
    },
    async refreshMove() {
      const r = await vget('/privhub/api/storeops/move-status')
      if (r.ok) this.mvStatus = r.data
    },
    pollMove() {
      this.stopMovePoll()
      this._mvTimer = setInterval(async () => {
        const r = await vget('/privhub/api/storeops/move-status')
        if (!r.ok) return
        this.mvStatus = r.data
        if (!r.data.running) {
          this.stopMovePoll()
          this.buildBusy = false
          this.mvBusy = false
          const s = r.data
          if (s.lastError) soToast('搬移异常/部分失败：' + s.lastError, 'error')
          else soToast('搬移结束：成功 ' + s.moved + '，跳过 ' + s.skipped + '，失败 ' + s.failed)
        }
      }, 1000)
    },
    stopMovePoll() { if (this._mvTimer) { clearInterval(this._mvTimer); this._mvTimer = null } },
    async cancelMove() {
      const r = await vsend('/privhub/api/storeops/move-cancel', {})
      if (!r.ok) { soToast(r.error || '取消失败', 'error'); return }
      soToast('已请求停止，当前文件搬完后会停下', 'warn')
    },
    /* ---------- 本地确认框（Promise 式；不跨插件借用 admin-console 的） ---------- */
    soConfirm(opts) {
      return new Promise((resolve) => {
        this.mvConfirm = {
          title: (opts && opts.title) || '确认操作',
          message: (opts && opts.message) || '',
          confirmText: (opts && opts.confirmText) || '确 定',
          resolve,
        }
      })
    },
    soConfirmDone(yes) {
      const c = this.mvConfirm
      this.mvConfirm = null
      if (c && c.resolve) c.resolve(yes === true)
    },
    fmtTime(ms) {
      if (!ms) return '—'
      const d = new Date(ms)
      if (isNaN(d.getTime())) return '—'
      const p = (n) => String(n).padStart(2, '0')
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
    },
  },
  mounted() {
    /* 二次权限拦截：入口已被 capFeature=admin.storage 过滤，这里兜住直达 hash。 */
    try {
      if (window.PrivHub && typeof window.PrivHub.isSystemAdmin === 'function') this.canUse = window.PrivHub.isSystemAdmin()
      else {
        const u = window.PrivHub && window.PrivHub.AUTH && window.PrivHub.AUTH.user
        this.canUse = !!u && u.role === 'system_admin'
      }
    } catch { this.canUse = false }
    if (this.canUse) void this.load()
    else this.loading = false
  },
  beforeUnmount() { this.stopScanPoll(); this.stopMovePoll() },
  template: `
    <div class="so-wrap">
      <!-- 非超管：整页隐藏（入口 capFeature 过滤之外的第二道拦截） -->
      <div v-if="!canUse" class="ad-section-card">
        <div class="ad-section-card-head">
          <span class="ad-section-card-title">🧬 存储运维（超管）</span>
        </div>
        <div class="ad-warn-block" style="margin-top:6px;line-height:1.7">
          仅系统管理员可用。本页负责全库扫描登记与物理搬移（含个人空间），普通管理员与管理员无权访问。
        </div>
      </div>

      <template v-else>
        <div v-if="loading" class="ad-dim">加载中…</div>
        <div v-else-if="error" class="ad-warn-block">{{ error }}</div>

        <template v-else>
          <!-- ═══ 面板 A：扫描与建库 ═══ -->
          <div class="ad-section-card">
            <div class="ad-section-card-head">
              <span class="ad-section-card-title">🧬 扫描与建库（物理搬移见下方第二块）</span>
              <span class="ad-chip" :class="scanRunning ? 'on' : 'off'">{{ scanRunning ? '扫描中' : '空闲' }}</span>
            </div>
            <div class="ad-dim" style="line-height:1.7;margin-bottom:10px">
              对选定卷做<strong>全量扫描登记</strong>：递归扫出卷上实际存在的全部文件（含个人空间条目，仅本页可见），
              按实际存储位置登记进主索引并写入 physicalPath 快照。扫描只登记、不搬字节。
            </div>

            <div class="ad-field">
              <label class="ad-label">扫描卷</label>
              <select class="ad-input" v-model="scanVolumeId" style="width:340px">
                <option v-for="v in volumesAll" :key="v.id" :value="v.id">
                  {{ v.label }}{{ v.root ? ' — ' + v.root : '' }}
                </option>
              </select>
            </div>

            <div class="ad-actions">
              <button class="ad-btn ad-btn-primary ad-btn-sm" :disabled="scanBusy || scanRunning || buildBusy || mvRunning" @click="startScan">扫描登记</button>
              <button class="ad-btn ad-btn-sm" v-if="scanRunning" @click="cancelScan">停止扫描</button>
              <button class="ad-btn ad-btn-sm" :disabled="scanBusy || scanRunning || buildBusy || mvRunning" @click="startScanBuild">一键扫描+建库+搬移</button>
              <span v-if="buildBusy || mvRunning" class="ad-dim">（一键任务进行中，进度见下方「物理搬移」）</span>
            </div>

            <div v-if="scanStatus" style="margin-top:12px">
              <div class="ad-dim" style="margin-bottom:6px">
                该卷登记统计：条目 <strong>{{ scanStatus.entries }}</strong>
                · 路径漂移 <strong>{{ scanStatus.pathDrift }}</strong>
                · 抽样 {{ scanStatus.sampled }} 条中密文 <strong>{{ scanStatus.sampledEncrypted }}</strong>
                <span v-if="scanStatus.run && scanStatus.run.lastError" style="color:var(--ad-warn)"> · 上次异常：{{ scanStatus.run.lastError }}</span>
              </div>
              <div v-if="scanStatus.run && scanStatus.run.lastResult" class="ad-dim" style="line-height:1.7">
                最近一次扫描（{{ fmtTime(scanStatus.run.lastVolumeId === undefined ? 0 : 0) }}口径见审计）：
                扫到 {{ scanStatus.run.lastResult.scanned }} · 新建 <strong>{{ scanStatus.run.lastResult.created }}</strong>
                · 更新 {{ scanStatus.run.lastResult.updated }} · 失败 {{ scanStatus.run.lastResult.failed }}
              </div>
              <div v-if="!scanStatus.run || (!scanStatus.run.lastResult && !scanStatus.run.running)" class="ad-dim" style="margin-top:4px">
                该卷还没有扫描结果：点「扫描登记」开始。
              </div>
              <!-- 文件清单 / 开放对象列：GET /storeinfo/entries 分页只读清单。 -->
              <div class="so-list" style="margin-top:12px">
                <div class="ad-dim" style="margin-bottom:6px">
                  文件清单（不含已删除/目录行；共 <strong>{{ listTotal }}</strong> 条
                  · 本页 {{ listEntries.length }} 条 · 第 {{ listTotal === 0 ? 0 : listOffset + 1 }}–{{ listOffset + listEntries.length }} 条）
                  <button class="ad-btn ad-btn-sm" style="margin-left:8px" :disabled="listBusy" @click="loadEntries(0)">刷新清单</button>
                </div>
                <div v-if="listMsg" class="ad-warn-block">{{ listMsg }}</div>
                <div v-else-if="!listEntries.length && !listBusy" class="ad-dim">清单为空：先「扫描登记」或点「刷新清单」。</div>
                <div v-else class="so-table-wrap">
                  <table class="so-table">
                    <thead>
                      <tr>
                        <th>文件名</th><th>项目</th><th>类型</th><th>大小</th><th>所在卷</th>
                        <th>实际位置</th><th>开放对象</th><th>形态</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="e in listEntries" :key="e.id">
                        <td class="so-td-path" :title="e.virtualPath">
                          {{ e.virtualPath }}
                          <span v-if="e.personal" class="ad-chip on">个人空间</span>
                        </td>
                        <td>{{ e.project }}</td>
                        <td>{{ e.ext || '—' }}</td>
                        <td>{{ soSize(e.size) }}</td>
                        <td>{{ soVolumeLabel(e.volumeId) }}</td>
                        <td class="so-td-path" :title="e.physicalPath"><code>{{ e.physicalPath }}</code></td>
                        <td>
                          {{ soVisibility(e) }}
                          <span v-if="e.personal && e.access && e.access.owner"> · owner：{{ e.access.owner }}</span>
                        </td>
                        <td>{{ e.encrypted === true ? '密文' : e.encrypted === false ? '明文' : '未知' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="ad-actions" style="margin-top:8px">
                  <button class="ad-btn ad-btn-sm" :disabled="listBusy || listOffset <= 0" @click="prevEntries">上一页</button>
                  <span class="ad-dim">第 {{ listTotal === 0 ? 0 : (listOffset / listLimit) + 1 }} 页 / 共 {{ Math.ceil(listTotal / listLimit) || 1 }} 页（每页 {{ listLimit }} 条）</span>
                  <button class="ad-btn ad-btn-sm" :disabled="listBusy || listOffset + listLimit >= listTotal" @click="nextEntries">下一页</button>
                </div>
              </div>
            </div>
          </div>

          <!-- ═══ 面板 B：物理搬移 ═══ -->
          <div class="ad-section-card">
            <div class="ad-section-card-head">
              <span class="ad-section-card-title">🚚 物理搬移（把文件字节搬到目标卷 · 可选变换形态）</span>
              <span class="ad-chip" :class="mvRunning ? 'on' : 'off'">{{ mvRunning ? mvPhase : '空闲' }}</span>
            </div>
            <div class="ad-dim" style="line-height:1.7;margin-bottom:10px">
              <strong>超管全库操作</strong>：按范围把登记在库里的文件字节搬到目标卷，并可选解密 / 加密 / 保持不变。
              老库收敛进池布局、程序与库分离、为速度转明文 —— 用这里。
            </div>

            <div class="ad-field">
              <label class="ad-label">源范围（筛选要搬谁）</label>
              <label class="ad-check">
                <input type="checkbox" v-model="mvIncludePersonal" />
                包含个人空间条目（<strong>超管全库操作</strong>；不勾则只搬项目文件）
              </label>
            </div>

            <div class="ad-field">
              <label class="ad-label">目标卷（搬到哪）</label>
              <select class="ad-input" v-model="mvTargetId" style="width:340px">
                <option :value="SO_DEFAULT_SENTINEL" disabled hidden></option>
                <option v-for="v in volumesAll" :key="v.id" :value="v.id" :disabled="v.enabled === false">
                  {{ v.label }}{{ v.root ? ' — ' + v.root : '' }}{{ v.enabled === false ? '（已停用）' : '' }}
                </option>
              </select>
            </div>

            <div class="ad-field">
              <label class="ad-label">加密形态</label>
              <div class="so-modes">
                <label class="so-mode" :class="{ on: mvMode === 'decrypt' }">
                  <input type="radio" value="decrypt" v-model="mvMode" /> 解密成明文
                </label>
                <label class="so-mode" :class="{ on: mvMode === 'encrypt' }">
                  <input type="radio" value="encrypt" v-model="mvMode" /> 加密成密文
                </label>
                <label class="so-mode" :class="{ on: mvMode === 'keep' }">
                  <input type="radio" value="keep" v-model="mvMode" /> 保持不变
                </label>
              </div>
              <div class="ad-dim" style="margin-top:6px;line-height:1.6">{{ modeHint }}</div>
            </div>

            <label class="ad-check">
              <input type="checkbox" v-model="mvDeleteSource" />
              搬完删除源文件（真正的移动；不勾则保留源，可回退）
            </label>
            <label class="ad-check" v-if="mvTargetId !== SO_DEFAULT">
              <input type="checkbox" v-model="mvSetDefault" />
              搬完把默认写入卷切到目标卷（实现程序与库分离，新文件直接落新盘）
            </label>

            <div class="ad-actions" style="margin-top:10px">
              <button class="ad-btn ad-btn-primary ad-btn-sm" :disabled="mvBusy || mvRunning || scanRunning || buildBusy" @click="startMove">开始搬移</button>
              <button class="ad-btn ad-btn-sm" v-if="mvRunning" @click="cancelMove">停止</button>
            </div>

            <div v-if="mvMsg" class="ad-dim" style="margin-top:8px;line-height:1.6">{{ mvMsg }}</div>
            <div v-if="mvStatus && mvStatus.lastError" class="ad-warn-block" style="margin-top:8px;line-height:1.6">{{ mvStatus.lastError }}</div>

            <div v-if="mvStatus && (mvStatus.running || mvStatus.finishedAt)" style="margin-top:12px">
              <div class="ad-dim" style="margin-bottom:4px">
                {{ mvRunning
                  ? (mvPhase + '：' + mvStatus.done + ' / ' + mvStatus.target + '（成功 ' + mvStatus.moved + '，跳过 ' + mvStatus.skipped + '，失败 ' + mvStatus.failed + '）')
                  : '上次搬移：成功 ' + mvStatus.moved + '，跳过 ' + mvStatus.skipped + '，失败 ' + mvStatus.failed + (mvStatus.target ? '（共 ' + mvStatus.target + '）' : '')
                    + (cipherNote ? '（' + cipherNote + '）' : '') }}
              </div>
              <div class="ad-progress"><div class="ad-progress-bar" :style="{ width: mvPct + '%' }"></div></div>
              <div v-if="mvRunning && mvStatus.lastPath" class="ad-dim" style="margin-top:4px">正在搬：{{ mvStatus.lastPath }}</div>
              <div v-if="!mvRunning && cipherNote" class="ad-dim" style="margin-top:6px">{{ cipherNote }}</div>
              <div v-if="mvStatus.personalTotal" class="ad-dim" style="margin-top:4px">
                个人空间：本轮包含 {{ mvStatus.personalIncluded || 0 }} / 候选共 {{ mvStatus.personalTotal }} 条
              </div>
              <div v-if="mvStatus.dangling" class="ad-warn-block" style="margin-top:8px;line-height:1.7">
                检测到 <strong>{{ mvStatus.dangling }}</strong> 个条目的字节不在索引记录的位置（中断所致）。
                <strong>再点一次「开始搬移」即可自动修复</strong>（程序会按 ID 找回真实字节并修正索引）。
              </div>
            </div>
            <div v-else-if="mvStatus" class="ad-dim" style="margin-top:10px">
              待搬到该卷的条目：{{ mvStatus.poolPending != null ? mvStatus.poolPending : '—' }} 个（池内共 {{ mvStatus.poolTotal != null ? mvStatus.poolTotal : '—' }} 个）
            </div>

            <div v-if="failedRecent.length" style="margin-top:10px">
              <div class="ad-dim" style="margin-bottom:4px">失败明细（最近 {{ failedRecent.length }} 条）：</div>
              <div v-for="(f, i) in failedRecent" :key="i" class="so-fail">
                <code>{{ f.path }}</code> — {{ f.error }}
              </div>
            </div>
          </div>
        </template>
      </template>

      <!-- 本地确认框（预检文案都在这里过一遍才发请求） -->
      <div v-if="mvConfirm" class="so-mask" @click.self="soConfirmDone(false)">
        <div class="so-dialog" role="dialog" aria-modal="true">
          <div class="so-dialog-title">{{ mvConfirm.title }}</div>
          <div class="so-dialog-msg">{{ mvConfirm.message }}</div>
          <div class="so-dialog-acts">
            <button class="ad-btn ad-btn-sm" @click="soConfirmDone(false)">取 消</button>
            <button class="ad-btn ad-btn-primary ad-btn-sm" @click="soConfirmDone(true)">{{ mvConfirm.confirmText }}</button>
          </div>
        </div>
      </div>
    </div>
  `,
}

export default {
  id: 'privhub-store-ops',
  slots: {
    'admin-storeops': StoreOpsPanel,
  },
}

/* ── 自带样式：import 即注入（只插一次） ── */
const STORE_OPS_CSS = `
.so-wrap { display: flex; flex-direction: column; gap: 14px; }
.so-modes { display: flex; gap: 8px; flex-wrap: wrap; }
.so-mode {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 8px; cursor: pointer;
  border: 1px solid var(--admin-border); font-size: 12.5px;
  color: var(--admin-text); transition: .14s;
}
.so-mode.on { border-color: var(--admin-primary); background: var(--admin-primary-soft); color: var(--admin-primary); font-weight: 600; }
.so-mode input { margin: 0; }
.so-fail { font-size: 12px; color: var(--admin-text-muted); line-height: 1.7; word-break: break-all; }
.so-fail code { font-family: ui-monospace, Consolas, monospace; font-size: 11.5px; background: var(--admin-card-bg); padding: 1px 5px; border-radius: 4px; border: 1px solid var(--admin-border); }
.so-mask {
  position: fixed; inset: 0; z-index: 90;
  background: rgba(0,0,0,.42);
  display: flex; align-items: center; justify-content: center;
}
.so-dialog {
  width: min(560px, calc(100vw - 48px));
  background: var(--admin-card-bg); color: var(--admin-text);
  border: 1px solid var(--admin-border); border-radius: 12px;
  padding: 18px 20px; box-shadow: 0 12px 40px rgba(0,0,0,.25);
}
.so-dialog-title { font-size: 14px; font-weight: 700; margin-bottom: 10px; }
.so-dialog-msg { font-size: 12.5px; line-height: 1.8; white-space: pre-wrap; color: var(--admin-text-muted); }
.so-dialog-acts { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
.so-list { font-size: 12.5px; }
.so-table-wrap { overflow-x: auto; border: 1px solid var(--admin-border); border-radius: 8px; }
.so-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.so-table th, .so-table td { text-align: left; padding: 5px 8px; border-bottom: 1px solid var(--admin-border); white-space: nowrap; }
.so-table th { color: var(--admin-text-muted); font-weight: 600; }
.so-table td code { font-family: ui-monospace, Consolas, monospace; font-size: 11px; }
.so-td-path { max-width: 320px; overflow: hidden; text-overflow: ellipsis; }
`

if (typeof document !== 'undefined' && !document.querySelector('style[data-privhub-store-ops]')) {
  const el = document.createElement('style')
  el.setAttribute('data-privhub-store-ops', '')
  el.textContent = STORE_OPS_CSS
  document.head.appendChild(el)
}
