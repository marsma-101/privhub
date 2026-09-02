/**
 * privhub-files-upload-queue · client — 上传队列抽屉（upload-queue slot）
 *
 * 监听 bus 'upload:progress' / 'upload:done'：
 *   底部抽屉逐条显示 文件名 → 状态（上传中/成功/失败）；
 *   失败项可「重试」（重新触发文件选择由用户重选，简化：点击重试按钮
 *   重新 uploadAll？F11 未暴露重试——此处提供重试提示：刷新后重新拖入。
 *   基础版：失败项提供「重试」→ 重新 emit upload:request 由用户重选同名文件）。
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
      // 通知 F11 重新打开文件选择（用户重选同名文件即覆盖）
      bus.emit('upload:request')
      this.items = this.items.map(x => ({ ...x, status: 'uploading' }))
    },
    clearDone() {
      this.items = this.items.filter(x => x.status === 'uploading' || x.status === 'fail')
      if (this.items.length === 0) this.open = false
    },
  },
  mounted() {
    this._offP = bus.on('upload:progress', (p) => {
      this.open = true
      this.upsert(p)
    })
    this._offD = bus.on('upload:done', () => {
      // 保留失败项与成功项供查看，30s 后自动清掉成功项
      setTimeout(() => { this.clearDone() }, 30_000)
    })
  },
  beforeUnmount() { if (this._offP) this._offP(); if (this._offD) this._offD() },
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
