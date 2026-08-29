/**
 * privhub-files-upload · client — 上传控制器（upload slot，不可见）
 *
 * 职责：
 *   - 全局拖拽：拖入文件/文件夹 → 递归收集（webkitGetAsEntry）→ 上传
 *   - 文件选择：监听 bus 'upload:request'（F07 面板「＋添加文件」按钮）→ 打开选择框
 *   - 上传进度：更新 nav.uploading 等，emit 'upload:progress'（F12 队列消费）
 *
 * 目标目录 = 当前导航位置（nav.project / nav.path），同名覆盖。
 *
 * @module privhub-files-upload/client
 */

const { api, AUTH, nav, bus } = window.PrivHub

const UploadController = {
  name: 'upload-controller',
  data() { return { nav } },
  methods: {
    /* 递归收集拖入的目录树（webkitGetAsEntry） */
    collectEntries(dataTransfer) {
      return new Promise((resolve) => {
        const files = []
        const entries = []
        for (const it of dataTransfer.items || []) {
          const en = it.webkitGetAsEntry && it.webkitGetAsEntry()
          if (en) entries.push(en)
        }
        if (entries.length === 0) {
          // 兜底：普通文件列表
          for (const f of dataTransfer.files || []) { f._relPath = f.name; files.push(f) }
          resolve(files)
          return
        }
        const walk = (item, path) => new Promise((res) => {
          if (item.isFile) {
            item.file((f) => { f._relPath = path + item.name; files.push(f); res() }, () => res())
          } else if (item.isDirectory) {
            const reader = item.createReader()
            const readBatch = () => reader.readEntries(async (list) => {
              if (list.length === 0) { res(); return }
              for (const en of list) await walk(en, path + item.name + '/')
              // 某些浏览器分批返回
              readBatch()
            }, () => res())
            readBatch()
          } else res()
        })
        Promise.all(entries.map(en => walk(en, ''))).then(() => resolve(files))
      })
    },
    async handleFiles(fileList) {
      const files = Array.from(fileList)
      if (!files.length || !nav.project) return
      const dest = nav.path ? nav.project + '/' + nav.path : nav.project
      if (!confirm('上传 ' + files.length + ' 个文件到「' + dest + '」？同名文件将被覆盖。')) return
      await this.uploadAll(files)
    },
    /* 确保目录树存在（递归上传需要） */
    async ensureDirs(dirs) {
      for (const d of dirs) {
        try {
          await api('/privhub/api/mkdir', { method: 'POST', body: JSON.stringify({ project: nav.project, path: d.parent, name: d.name }) })
        } catch { /* 已存在则忽略 */ }
      }
    },
    async uploadAll(files) {
      nav.uploading = true; nav.uploadDone = 0; nav.uploadTotal = files.length
      let okCount = 0
      const fails = []
      // 预收集需要创建的目录（按深度排序去重）
      const dirSet = new Set()
      for (const f of files) {
        const rel = f._relPath || f.name
        const parts = rel.split('/')
        if (parts.length > 1) {
          let acc = ''
          for (let i = 0; i < parts.length - 1; i++) {
            acc = acc ? acc + '/' + parts[i] : parts[i]
            dirSet.add(acc)
          }
        }
      }
      await this.ensureDirs([...dirSet].sort((a, b) => a.split('/').length - b.split('/').length).map(p => ({
        parent: p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '',
        name: p.split('/').pop(),
      })))
      for (const f of files) {
        const rel = f._relPath || f.name
        const sub = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : ''
        const name = rel.includes('/') ? rel.split('/').pop() : rel
        bus.emit('upload:progress', { name, sub, status: 'uploading', index: nav.uploadDone, total: files.length })
        try {
          const r = await fetch('/privhub/api/upload?project=' + encodeURIComponent(nav.project) + '&path=' + encodeURIComponent(nav.path ? nav.path + (sub ? '/' + sub : '') : sub) + '&name=' + encodeURIComponent(name), {
            method: 'POST',
            headers: { authorization: 'Bearer ' + AUTH.token, 'content-type': 'application/octet-stream' },
            body: f,
          })
          const j = await r.json().catch(() => ({}))
          if (j.ok) {
            okCount++
            bus.emit('upload:progress', { name, sub, status: 'ok', index: nav.uploadDone, total: files.length })
            // file:uploaded：触发下游（防病毒 F27 / 审计 F13 等，当前无监听者，安全）
            bus.emit('file:uploaded', { project: nav.project, path: (nav.path ? nav.path + '/' : '') + rel, name })
          }
          else { fails.push({ name, sub }); bus.emit('upload:progress', { name, sub, status: 'fail', error: j.error, index: nav.uploadDone, total: files.length }) }
        } catch {
          fails.push({ name, sub })
          bus.emit('upload:progress', { name, sub, status: 'fail', error: '网络错误', index: nav.uploadDone, total: files.length })
        }
        nav.uploadDone++
      }
      nav.uploading = false
      bus.emit('upload:done', { ok: okCount, total: files.length, fails })
      alert('已上传 ' + okCount + '/' + files.length + ' 个文件' + (fails.length ? '，失败 ' + fails.length + ' 个' : ''))
      await nav.openDir(nav.project, nav.path)
    },
  },
  async mounted() {
    this._onDragOver = (e) => { e.preventDefault() }
    this._onDrop = async (e) => {
      e.preventDefault()
      if (!nav.project) return
      const files = await this.collectEntries(e.dataTransfer)
      await this.handleFiles(files)
    }
    document.addEventListener('dragover', this._onDragOver)
    document.addEventListener('drop', this._onDrop)
    this._offReq = bus.on('upload:request', () => { this.$refs.fileInput && this.$refs.fileInput.click() })
  },
  beforeUnmount() {
    document.removeEventListener('dragover', this._onDragOver)
    document.removeEventListener('drop', this._onDrop)
    if (this._offReq) this._offReq()
  },
  template: `
    <div style="display:none">
      <input ref="fileInput" type="file" multiple @change="e => { handleFiles(e.target.files); e.target.value = '' }" />
    </div>
  `,
}

export default {
  id: 'privhub-files-upload',
  slots: {
    upload: UploadController,
  },
}
