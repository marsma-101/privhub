/**
 * privhub-files-upload-queue · client — 上传队列抽屉（upload-queue slot）
 *
 * 监听 bus 'upload:progress' / 'upload:done'：
 *   底部抽屉逐条显示 文件名 → 状态（上传中/成功/失败）。
 *
 * 「重试失败项」的真实语义（修正）：
 *   上传组件（files-upload）在 'upload:request' 时会重新打开文件选择器。
 *   用户若取消选择，条目不能永久停在 ⏳——因此本组件在发出请求后
 *   等待 'upload:done' 回执；超时未收到则把状态回滚为 fail，并给出提示。
 *
 * @module privhub-files-upload-queue/client
 */

const { bus } = window.PrivHub

const UploadQueue = {
  name: 'upload-queue',
  data() {
    return {
      open: false,
      items: [],   // { name, sub, status: 'uploading'|'ok'|'fail', error }
    }
  },
  methods: {
    upsert(item) {
      const i = this.items.findIndex(x => x.name === item.name && x.sub === item.sub)
      if (i >= 0) this.items.splice(i, 1, { ...this.items[i], ...item })
      else this.items.push(item)
    },
    retryAll() {
      // 通知上传组件重新打开文件选择（用户重选同名文件即覆盖）
      this._retrying = true
      this.items = this.items.map(x => x.status === 'fail' ? { ...x, status: 'uploading' } : x)
      bus.emit('upload:request')
      // 用户取消选择时不会有 'upload:done'：超时把状态回滚为失败，
      // 避免条目永久停在 ⏳（原实现的缺陷）
      clearTimeout(this._retryTimer)
      this._retryTimer = setTimeout(() => {
        if (!this._retrying) return
        this._retrying = false
        this.items = this.items.map(x => x.status === 'uploading' ? { ...x, status: 'fail', error: '未重选文件' } : x)
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
    <div v-if="open" style="position:fixed;right:14px;bottom:14px;z-index:1200;width:340px;background:var(--panel2);border:1px solid var(--line);border-radius:12px;box-shadow:0 14px 40px rgba(0,0,0,.2);overflow:hidden">
      <div style="display:flex;align-items:center;padding:10px 14px;border-bottom:1px solid var(--line);font-size:13px;font-weight:600">
        <span>📥 上传队列</span>
        <span class="spacer"></span>
        <span style="font-size:11px;color:var(--muted);cursor:pointer" @click="open = false">收起</span>
      </div>
      <div style="max-height:260px;overflow:auto;padding:6px 10px">
        <div v-for="it in items" :key="it.sub + '/' + it.name" style="display:flex;align-items:center;gap:8px;padding:6px 4px;font-size:12.5px;border-bottom:1px dashed var(--line)">
          <span>{{ it.status === 'ok' ? '✅' : it.status === 'fail' ? '❌' : '⏳' }}</span>
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" :title="it.sub ? it.sub + '/' + it.name : it.name">{{ it.sub ? it.sub + '/' : '' }}{{ it.name }}</span>
          <span v-if="it.status === 'fail'" style="color:var(--danger);font-size:11px">{{ it.error || '失败' }}</span>
        </div>
        <div v-if="items.length === 0" style="font-size:12px;color:var(--muted);text-align:center;padding:14px">队列为空</div>
      </div>
      <div v-if="items.some(x => x.status === 'fail')" style="padding:8px 12px;border-top:1px solid var(--line)">
        <button class="small-btn" @click="retryAll">↻ 重试失败项（重选同名文件）</button>
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
