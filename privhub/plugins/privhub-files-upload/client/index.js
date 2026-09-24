/**
 * privhub-files-upload · client — 上传控制器（upload slot，不可见）
 *
 * 职责：
 *   - 全局拖拽：拖入文件/文件夹 → 递归收集（webkitGetAsEntry）→ 上传
 *   - 文件选择：监听 bus 'upload:request'（F07 面板「＋添加文件」按钮，以及文件夹 ⋯ 菜单
 *     「⬆ 上传文件到该文件夹」带 payload.path）→ 打开选择框
 *   - 上传进度：更新 nav.uploading 等，emit 'upload:progress'（F12 队列消费）
 *
 * 目标目录 = payload.path（文件夹 ⋯ 菜单指定的目录）或当前导航位置（nav.project / nav.path），
 * 同名文件由服务端返回 409 拒绝（不静默覆盖）。
 *
 * @module privhub-files-upload/client
 */

const { api, AUTH, nav, bus } = window.PrivHub

const UploadController = {
  name: 'upload-controller',
  data() { return { nav, _dirTarget: null } },
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
    /* 取出并清空「本次上传的目标目录」（相对项目根）；无指定则回退到当前导航目录。
     * ⚠ 必须在选择框回调里【立即取走】：用户取消选择框不会触发任何事件，
     *   残留的目标目录会让下一次上传落到错误位置（确认框写的目录与实际落地目录不一致）。 */
    takeDirTarget() {
      const t = this._dirTarget
      this._dirTarget = null
      return t === null || t === undefined ? nav.path || '' : String(t)
    },
    async handleFiles(fileList) {
      const files = Array.from(fileList)
      const base = this.takeDirTarget()
      if (!files.length || !nav.project) return
      const dest = base ? nav.project + '/' + base : nav.project
      if (!confirm('上传 ' + files.length + ' 个文件到「' + dest + '」？同名文件将被覆盖。')) return
      await this.uploadAll(files, base)
    },
    /* 文件夹选择：webkitdirectory 的 File 带 webkitRelativePath（含顶层文件夹名），
       赋给 _relPath 后复用递归上传管道（目录自动创建、同名覆盖）。
       目标目录：bus payload.path（文件夹 ⋯ 菜单「📁⬆ 上传文件夹到该文件夹」）或当前导航目录 */
    handleDirFiles(fileList) {
      const files = Array.from(fileList).map((f) => {
        f._relPath = f.webkitRelativePath || f.name
        return f
      })
      if (!files.length || !nav.project) return
      const base = this.takeDirTarget()
      const top = files[0]._relPath.split('/')[0]
      const dest = (base ? base + '/' : '') + top
      if (!confirm('上传文件夹「' + top + '」及其全部内容（' + files.length + ' 个文件）到「' + nav.project + '/' + dest + '」？同名文件将被覆盖。')) return
      void this.uploadAll(files, base)
    },
    /* 确保目录树存在（递归上传需要） */
    async ensureDirs(dirs) {
      for (const d of dirs) {
        try {
          await api('/privhub/api/mkdir', { method: 'POST', body: JSON.stringify({ project: nav.project, path: d.parent, name: d.name }) })
        } catch { /* 已存在则忽略 */ }
      }
    },
    async uploadAll(files, baseArg) {
      nav.uploading = true; nav.uploadDone = 0; nav.uploadTotal = files.length
      // 目标目录：本次上传指定（文件夹 ⋯ 菜单）或当前导航目录
      const base = baseArg !== undefined && baseArg !== null ? String(baseArg) : nav.path || ''
      let okCount = 0
      const fails = []
      // 预收集需要创建的目录（相对项目根，含目标目录前缀；按深度排序去重）
      const dirSet = new Set()
      for (const f of files) {
        const rel = f._relPath || f.name
        const parts = rel.split('/')
        if (parts.length > 1) {
          let acc = ''
          for (let i = 0; i < parts.length - 1; i++) {
            acc = acc ? acc + '/' + parts[i] : parts[i]
            dirSet.add(base ? base + '/' + acc : acc)
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
          const r = await fetch('/privhub/api/upload?project=' + encodeURIComponent(nav.project) + '&path=' + encodeURIComponent(base ? base + (sub ? '/' + sub : '') : sub) + '&name=' + encodeURIComponent(name), {
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
      // E2：上传完成改为非阻塞 toast（成功绿 / 部分失败橙）
      if (fails.length === 0) window.PrivHub.toast('已上传 ' + okCount + '/' + files.length + ' 个文件')
      else if (okCount > 0) window.PrivHub.toast('已上传 ' + okCount + '/' + files.length + ' 个，失败 ' + fails.length + ' 个', 'warn')
      else window.PrivHub.toast('上传失败 ' + fails.length + ' 个文件', 'error')
      // 上传完成后导航到目标目录（看到结果）；同目录时等价于刷新
      await nav.openDir(nav.project, base)
      this._dirTarget = null
    },
  },
  async mounted() {
    this._onDragOver = (e) => { e.preventDefault() }
    this._onDrop = async (e) => {
      e.preventDefault()
      if (!nav.project) return
      /* 拖拽一律落到【当前导航目录】：不受菜单里“待定的目标目录”影响
       * （否则：先用菜单选目标→取消选择框→再拖文件，会落到旧目标） */
      this._dirTarget = null
      const files = await this.collectEntries(e.dataTransfer)
      await this.handleFiles(files)
    }
    document.addEventListener('dragover', this._onDragOver)
    document.addEventListener('drop', this._onDrop)
    // payload.path：文件夹 ⋯ 菜单「⬆ 上传文件到该文件夹」指定的目标目录（相对项目根）；缺省 = 当前导航目录
    this._offReq = bus.on('upload:request', (payload) => {
      this._dirTarget = payload && payload.path !== undefined && payload.path !== null ? String(payload.path) : null
      this.$refs.fileInput && this.$refs.fileInput.click()
    })
    // payload.path：文件夹 ⋯ 菜单「📁⬆ 上传文件夹到该文件夹」指定的目标目录；缺省 = 当前导航目录
    this._offReqDir = bus.on('upload:request-dir', (payload) => {
      this._dirTarget = payload && payload.path !== undefined && payload.path !== null ? String(payload.path) : null
      this.$refs.dirInput && this.$refs.dirInput.click()
    })
  },
  beforeUnmount() {
    document.removeEventListener('dragover', this._onDragOver)
    document.removeEventListener('drop', this._onDrop)
    if (this._offReq) this._offReq()
    if (this._offReqDir) this._offReqDir()
  },
  template: `
    <div style="display:none">
      <input ref="fileInput" type="file" multiple @change="e => { handleFiles(e.target.files); e.target.value = '' }" />
      <input ref="dirInput" type="file" webkitdirectory multiple @change="e => { handleDirFiles(e.target.files); e.target.value = '' }" />
    </div>
  `,
}

export default {
  id: 'privhub-files-upload',
  slots: {
    upload: UploadController,
  },
}
