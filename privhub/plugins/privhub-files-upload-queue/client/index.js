/**
 * privhub-files-upload-queue · client — 上传队列抽屉（upload-queue slot）
 *
 * 监听 bus 'upload:progress' / 'upload:done'：
 *   底部抽屉逐条显示 文件名 → 状态 + 百分比进度条（大文件不再只有「上传中」）。
 *
 * 「重试失败项」：发出 'upload:retry-failed'，由 files-upload 控制器用失败时的
 * File 句柄原样重传（目标项目/目录也沿用当时的），用户不必再重新选一遍文件。
 * 若句柄已不存在（例如刷新过页面），控制器会退回打开文件选择框。
 *
 * @module privhub-files-upload-queue/client
 */

const { bus } = window.PrivHub

const UploadQueue = {
  name: 'upload-queue',
  data() {
    return {
      open: false,
      items: [],   // { name, sub, status: 'uploading'|'ok'|'fail', error, percent, loaded, size }
    }
  },
  computed: {
    failedCount() { return this.items.filter(x => x.status === 'fail').length },
    /* 整批进度：队列里所有条目按字节加权（未知大小的按 0 计），显示在标题栏。 */
    overallPercent() {
      const known = this.items.filter(x => Number(x.size) > 0)
      if (!known.length) return null
      const total = known.reduce((a, x) => a + Number(x.size), 0)
      const done = known.reduce((a, x) => a + (x.status === 'ok' ? Number(x.size) : Number(x.loaded) || 0), 0)
      return Math.max(0, Math.min(100, Math.round((done / total) * 100)))
    },
  },
  methods: {
    upsert(item) {
      const i = this.items.findIndex(x => x.name === item.name && x.sub === item.sub)
      if (i >= 0) this.items.splice(i, 1, { ...this.items[i], ...item })
      else this.items.push(item)
    },
    retryAll() {
      // 真重试：控制器持有 File 句柄，直接重传（此前发 upload:request 等于让用户重选）
      this._retrying = true
      this.items = this.items.map(x => x.status === 'fail' ? { ...x, status: 'uploading', error: '', percent: 0, loaded: 0 } : x)
      bus.emit('upload:retry-failed')
      /* 兜底：控制器若退回文件选择框而用户又取消，不会有 progress/done 事件，
       * 条目不能永久停在 ⏳。超时只把「仍在转圈」的条目回滚为失败（不臆断成功）。 */
      clearTimeout(this._retryTimer)
      this._retryTimer = setTimeout(() => {
        if (!this._retrying) return
        this._retrying = false
        this.items = this.items.map(x => x.status === 'uploading'
          ? { ...x, status: 'fail', error: x.error || '重试未开始（可能已取消选择）' } : x)
      }, 60_000)
    },
    clearDone() {
      this.items = this.items.filter(x => x.status === 'uploading' || x.status === 'fail')
      if (this.items.length === 0) this.open = false
    },
  },
  mounted() {
    this._offP = bus.on('upload:progress', (p) => {
      this.open = true
      this._retrying = false
      clearTimeout(this._retryTimer)
      this.upsert(p)
    })
    this._offD = bus.on('upload:done', () => {
      this._retrying = false
      clearTimeout(this._retryTimer)
      // 保留失败项与成功项供查看，30s 后自动清掉成功项
      clearTimeout(this._clearTimer)
      this._clearTimer = setTimeout(() => { this.clearDone() }, 30_000)
    })
  },
  beforeUnmount() {
    if (this._offP) this._offP()
    if (this._offD) this._offD()
    // 卸载时清理定时器，避免对已销毁组件写入状态
    clearTimeout(this._clearTimer)
    clearTimeout(this._retryTimer)
  },
  template: `
    <div v-if="open" style="position:fixed;right:14px;bottom:14px;z-index:var(--z-drawer,1200);width:360px;background:var(--panel2);border:1px solid var(--line);border-radius:12px;box-shadow:0 14px 40px rgba(0,0,0,.2);overflow:hidden">
      <div style="display:flex;align-items:center;padding:10px 14px;border-bottom:1px solid var(--line);font-size:13px;font-weight:600">
        <span>📥 上传队列</span>
        <span v-if="overallPercent !== null" style="margin-left:8px;font-size:11px;font-weight:400;color:var(--muted)">{{ overallPercent }}%</span>
        <span class="spacer"></span>
        <span style="font-size:11px;color:var(--muted);cursor:pointer" @click="open = false">收起</span>
      </div>
      <div style="max-height:280px;overflow:auto;padding:6px 10px">
        <div v-for="it in items" :key="it.sub + '/' + it.name" style="padding:6px 4px;font-size:12.5px;border-bottom:1px dashed var(--line)">
          <div style="display:flex;align-items:center;gap:8px">
            <span>{{ it.status === 'ok' ? '✅' : it.status === 'fail' ? '❌' : '⏳' }}</span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" :title="it.sub ? it.sub + '/' + it.name : it.name">{{ it.sub ? it.sub + '/' : '' }}{{ it.name }}</span>
            <span v-if="it.status === 'uploading' && it.percent !== undefined" style="color:var(--muted);font-size:11px">{{ it.percent }}%</span>
            <span v-if="it.status === 'fail'" style="color:var(--danger);font-size:11px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" :title="it.error || '失败'">{{ it.error || '失败' }}</span>
          </div>
          <!-- 进度条：只有上传中且已知大小时显示，避免无意义的空条 -->
          <div v-if="it.status === 'uploading' && it.percent !== undefined" style="margin-top:4px;height:3px;background:var(--line);border-radius:2px;overflow:hidden">
            <div :style="{ width: it.percent + '%', height: '100%', background: 'var(--accent, #4c8dff)', transition: 'width .2s' }"></div>
          </div>
          <!-- 重试提示（例如「第 1 次失败：网络中断，2 秒后重试」） -->
          <div v-if="it.status === 'uploading' && it.error" style="margin-top:3px;font-size:11px;color:var(--warn)">{{ it.error }}</div>
        </div>
        <div v-if="items.length === 0" style="font-size:12px;color:var(--muted);text-align:center;padding:14px">队列为空</div>
      </div>
      <div v-if="failedCount > 0" style="padding:8px 12px;border-top:1px solid var(--line);display:flex;align-items:center;gap:8px">
        <button class="small-btn" @click="retryAll">↻ 重试失败项（{{ failedCount }}）</button>
        <span style="font-size:11px;color:var(--muted)">直接沿用原文件重传</span>
      </div>
    </div>
  `,
}

export default {
  id: 'privhub-files-upload-queue',
  slots: {
    'upload-queue': UploadQueue,
  },
}
