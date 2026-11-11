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
 * Q6（§3.3）：服务端会按内容指纹回带「与已有文件内容相同 / 高度相似」的提示（duplicates/near），
 * 这里在全部上传完成后汇总成一条 toast —— 只提示，不阻止、不改名、不自动删。
 *
 * @module privhub-files-upload/client
 */

const { api, AUTH, nav, bus, VERSION } = window.PrivHub

/* 自动重试：只对「网络中断 / 超时 / 5xx」这类换一次就可能成功的错误重试。
 * 413（超限）、409（同名）、401/403 属于终态，重试没有意义，必须让用户看到原因。 */
const UPLOAD_RETRY_MAX = 3
const UPLOAD_RETRY_DELAYS = [1500, 4000]

/** 上传失败（带可重试标记）；队列据此决定是否显示「重试」。 */
class UploadError extends Error {
  constructor(message, opts = {}) {
    super(message)
    this.name = 'UploadError'
    this.retryable = !!opts.retryable
    this.status = opts.status || 0
  }
}

function formatSize(n) {
  if (!Number.isFinite(n) || n <= 0) return '0B'
  if (n >= 1024 * 1024 * 1024) return (n / 1024 / 1024 / 1024).toFixed(1) + 'GB'
  if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + 'MB'
  if (n >= 1024) return Math.round(n / 1024) + 'KB'
  return Math.round(n) + 'B'
}

/** 当前生效的单文件上限（字节）；0 = 不限。读不到设置时按不限处理（服务端仍会兜底）。 */
async function fetchUploadLimitBytes() {
  try {
    const r = await api('/privhub/api/settings')
    const mb = Number(r && r.settings && r.settings.maxUploadMB)
    return Number.isFinite(mb) && mb > 0 ? Math.floor(mb) * 1024 * 1024 : 0
  } catch { return 0 }
}

/**
 * 用 XHR 上传单个文件。
 *
 * 为什么不用 fetch：浏览器 fetch 没有上传进度事件，几 GB 的视频几分钟只有
 * 「上传中」、没有百分比，用户会以为卡死并主动中断（GitHub issue #1 P1#4）。
 * XHR 的 upload.onprogress 能给出已传字节，队列据此显示百分比。
 */
function xhrUpload(url, file, token, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url, true)
    xhr.setRequestHeader('authorization', 'Bearer ' + token)
    xhr.setRequestHeader('content-type', 'application/octet-stream')
    if (onProgress) {
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded, e.total) }
    }
    xhr.onload = () => {
      let body = null
      try { body = JSON.parse(xhr.responseText) } catch { /* 非 JSON 响应 */ }
      resolve({ status: xhr.status, body, text: xhr.responseText })
    }
    xhr.onerror = () => reject(new UploadError('网络中断', { retryable: true, status: 0 }))
    xhr.ontimeout = () => reject(new UploadError('上传超时', { retryable: true, status: 0 }))
    xhr.onabort = () => reject(new UploadError('上传已取消', { retryable: false, status: 0 }))
    xhr.send(file)
  })
}

/** 把服务端响应归类成可行动的错误；5xx 与网络错误可重试。 */
function responseError(r) {
  const status = Number(r && r.status) || 0
  const msg = (r && r.body && r.body.error)
    || (status ? '服务器返回异常（HTTP ' + status + '）' : '网络错误')
  if (status === 401) window.PrivHub.logout && window.PrivHub.logout()
  return new UploadError(msg, { status, retryable: status >= 500 })
}

/* ---------- B6：分片上传 / 断点续传 ----------
 *
 * 超过阈值的文件不再一次性 POST，而是 init → 逐片上传 → complete：
 * 单次断网只影响一个 8MB 分片，刷新页面后重新选择同一文件可从已传分片继续
 * （服务端按 uploadId 记录到账分片，见 files 插件 /upload/chunk）。
 * 阈值以下的文件继续走单次上传，避免小文件多付三次往返。 */
const CHUNK_THRESHOLD = 32 * 1024 * 1024

/**
 * 断点续传用的文件身份：项目 + 目录 + 文件名 + 大小 + 修改时间。
 * 不用内容哈希（读 10GB 文件算哈希本身就比上传慢）；同路径重新选同一个文件
 * 才会命中，足以覆盖「关标签/断网后重来」这个真实场景。
 */
function fileUploadKey(project, sub, name, file) {
  const s = project + '\u0000' + sub + '\u0000' + name + '\u0000' + file.size + '\u0000' + (file.lastModified || 0)
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0
    h2 = Math.imul(h2 ^ (c + i), 0x85ebca6b) >>> 0
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')
}

/** POST JSON（init / complete 用）；与 xhrUpload 同样的响应收敛方式。 */
function xhrPostJson(url, payload, token) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url, true)
    xhr.setRequestHeader('authorization', 'Bearer ' + token)
    xhr.setRequestHeader('content-type', 'application/json')
    xhr.onload = () => {
      let body = null
      try { body = JSON.parse(xhr.responseText) } catch { /* 非 JSON 响应 */ }
      resolve({ status: xhr.status, body, text: xhr.responseText })
    }
    xhr.onerror = () => reject(new UploadError('网络中断', { retryable: true, status: 0 }))
    xhr.ontimeout = () => reject(new UploadError('上传超时', { retryable: true, status: 0 }))
    xhr.onabort = () => reject(new UploadError('上传已取消', { retryable: false, status: 0 }))
    xhr.send(JSON.stringify(payload))
  })
}

/** POST 一个分片（原始字节）；onProgress 给的是本片已发字节。 */
function xhrPostBlob(url, blob, token, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url, true)
    xhr.setRequestHeader('authorization', 'Bearer ' + token)
    xhr.setRequestHeader('content-type', 'application/octet-stream')
    if (onProgress) {
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded) }
    }
    xhr.onload = () => {
      let body = null
      try { body = JSON.parse(xhr.responseText) } catch { /* 非 JSON 响应 */ }
      resolve({ status: xhr.status, body, text: xhr.responseText })
    }
    xhr.onerror = () => reject(new UploadError('网络中断', { retryable: true, status: 0 }))
    xhr.ontimeout = () => reject(new UploadError('上传超时', { retryable: true, status: 0 }))
    xhr.onabort = () => reject(new UploadError('上传已取消', { retryable: false, status: 0 }))
    xhr.send(blob)
  })
}

/** 只重试「换一次可能成功」的失败；终态错误（413/409/401/403）立即抛出。 */
async function withUploadRetry(fn, onRetry) {
  let lastErr = null
  for (let attempt = 1; attempt <= UPLOAD_RETRY_MAX; attempt++) {
    try { return await fn() } catch (e) {
      lastErr = e instanceof UploadError ? e : new UploadError('网络错误', { retryable: true, status: 0 })
      if (!lastErr.retryable || attempt >= UPLOAD_RETRY_MAX) throw lastErr
      const delay = UPLOAD_RETRY_DELAYS[attempt - 1] || 4000
      if (onRetry) onRetry(lastErr, attempt, delay)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastErr || new UploadError('上传失败')
}

function okBody(r) {
  if (r.status >= 200 && r.status < 300 && r.body && r.body.ok) return r.body
  throw responseError(r)
}

const UploadController = {
  name: 'upload-controller',
  data() { return { nav, _dirTarget: null, _failed: [] } },
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
    /* 确保目录树存在（递归上传需要）。project 显式传入：失败重试时可能已切项目，
       使用失败批次原来的项目，避免把文件落到当前目录。 */
    async ensureDirs(dirs, project) {
      for (const d of dirs) {
        try {
          await api('/privhub/api/mkdir', { method: 'POST', body: JSON.stringify({ project, path: d.parent, name: d.name }) })
        } catch { /* 已存在则忽略 */ }
      }
    },
    /** 单个文件上传 + 网络/5xx 自动退避重试。终态错误（413/409/401/403）立即抛出。 */
    async uploadOne(file, url, emitProgress) {
      let lastErr = null
      for (let attempt = 1; attempt <= UPLOAD_RETRY_MAX; attempt++) {
        try {
          const r = await xhrUpload(url, file, AUTH.token, emitProgress)
          if (r.status >= 200 && r.status < 300 && r.body && r.body.ok) return r.body
          throw responseError(r)
        } catch (e) {
          lastErr = e instanceof UploadError ? e : new UploadError('网络错误', { retryable: true, status: 0 })
          if (!lastErr.retryable || attempt >= UPLOAD_RETRY_MAX) throw lastErr
          const delay = UPLOAD_RETRY_DELAYS[attempt - 1] || 4000
          /* 版本切换期间旧页面被 nginx 409 拦住：不要重试，直接提示刷新。 */
          if (lastErr.status === 409) throw lastErr
          bus.emit('upload:progress', {
            name: file._uploadName, sub: file._uploadSub, status: 'uploading',
            error: '第 ' + attempt + ' 次失败：' + lastErr.message + '，' + Math.round(delay / 1000) + ' 秒后重试',
          })
          await new Promise((r2) => setTimeout(r2, delay))
        }
      }
      throw lastErr || new UploadError('上传失败')
    },
    /**
     * B6：分片上传（大文件）。返回与单次上传相同的响应体（含 duplicates/near）。
     * 断点续传：init 回带的 uploaded 是服务端已收分片，这里只补缺失的；刷新页面后
     * 重新选择同一文件（同项目/目录/名/大小/修改时间）会拿回同一个 uploadId。
     */
    async uploadChunked(file, project, sub, name, emitProgress) {
      const key = fileUploadKey(project, sub, name, file)
      const init = await withUploadRetry(async () => {
        const r = await xhrPostJson('/privhub/api/upload/init',
          { project, path: sub, name, size: file.size, key }, AUTH.token)
        return okBody(r)
      }, (err, attempt, delay) => {
        bus.emit('upload:progress', {
          name: file._uploadName, sub: file._uploadSub, status: 'uploading',
          error: '第 ' + attempt + ' 次失败：' + err.message + '，' + Math.round(delay / 1000) + ' 秒后重试',
        })
      })
      const chunkSize = Number(init.chunkSize) || 8 * 1024 * 1024
      const total = Math.max(1, Number(init.total) || Math.ceil(file.size / chunkSize))
      const sizeOf = (i) => i < total - 1 ? chunkSize : Math.max(0, file.size - (total - 1) * chunkSize)
      const got = new Set((Array.isArray(init.uploaded) ? init.uploaded : []).map(Number))
      let doneBytes = 0
      for (const i of got) doneBytes += sizeOf(i)
      if (got.size > 0) emitProgress(doneBytes, file.size)
      const sendChunk = (i) => {
        /* 续传时已到账的后续分片也计入进度基数，避免比例从 0 重新爬。 */
        const base = doneBytes - (got.has(i) ? sizeOf(i) : 0)
        return withUploadRetry(async () => {
          const blob = file.slice(i * chunkSize, Math.min(file.size, (i + 1) * chunkSize))
          const url = '/privhub/api/upload/chunk?project=' + encodeURIComponent(project)
            + '&path=' + encodeURIComponent(sub)
            + '&id=' + encodeURIComponent(init.uploadId)
            + '&index=' + i
          const r = await xhrPostBlob(url, blob, AUTH.token, (loaded) => emitProgress(base + loaded, file.size))
          return okBody(r)
        }, (err, attempt, delay) => {
          bus.emit('upload:progress', {
            name: file._uploadName, sub: file._uploadSub, status: 'uploading',
            percent: file.size ? Math.floor((base / file.size) * 100) : 0,
            loaded: base, size: file.size,
            error: '第 ' + attempt + ' 次失败：' + err.message + '，' + Math.round(delay / 1000) + ' 秒后重试',
          })
        }).then(() => {
          if (!got.has(i)) { got.add(i); doneBytes += sizeOf(i) }
        })
      }
      for (let i = 0; i < total; i++) {
        if (got.has(i)) continue
        await sendChunk(i)
      }
      /* complete：若服务端回「还缺分片」（分片在两次请求之间被清理），补传一轮再合并。 */
      for (let round = 0; ; round++) {
        try {
          return await withUploadRetry(async () => {
            const r = await xhrPostJson('/privhub/api/upload/complete',
              { project, path: sub, name, id: init.uploadId }, AUTH.token)
            if (r.status === 409 && r.body && Array.isArray(r.body.missing)) {
              const err = responseError(r)
              err.retryable = false
              err.missing = r.body.missing
              throw err
            }
            return okBody(r)
          })
        } catch (e) {
          if (round === 0 && e && Array.isArray(e.missing) && e.missing.length) {
            for (const i of e.missing) { got.delete(i); doneBytes = 0; for (const j of got) doneBytes += sizeOf(j); await sendChunk(i) }
            continue
          }
          throw e
        }
      }
    },
    async uploadAll(files, baseArg, projectArg) {
      const project = projectArg || nav.project
      if (!project) return
      if (VERSION && VERSION.stale) {
        window.PrivHub.toast('系统已更新，请刷新页面后再上传', 'warn')
        return
      }
      nav.uploading = true; nav.uploadDone = 0; nav.uploadTotal = files.length
      // 目标目录：本次上传指定（文件夹 ⋯ 菜单）或当前导航目录
      const base = baseArg !== undefined && baseArg !== null ? String(baseArg) : nav.path || ''
      let okCount = 0
      const fails = []
      /* Q6（§3.3）上传期重复提示：服务端在同项目内查到与本次上传内容相同 / 高度相似的
       * 已有文件时，会在响应里回带 duplicates / near（功能开关 dup.prompt 关掉就不回带）。
       * 这里只**汇总提示**，不阻止上传、不自动改名 —— 两份文件各自独立存在，由用户决定留哪份。 */
      const dupHits = []
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
      })), project)
      /* 上限同源：与设置面板 / 服务端读的是同一项。0 = 不限。
       * 先本地预检，超限的文件不发请求、直接给出可行动的提示，省掉传一半才失败的流量。 */
      const limitBytes = await fetchUploadLimitBytes()
      for (const f of files) {
        const rel = f._relPath || f.name
        const sub = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : ''
        const name = rel.includes('/') ? rel.split('/').pop() : rel
        f._uploadName = name
        f._uploadSub = sub
        bus.emit('upload:progress', { name, sub, status: 'uploading', index: nav.uploadDone, total: files.length })
        /* 本地预检（超限不传）。服务端仍会独立校验（客户端可绕过，不能只靠它）。 */
        if (limitBytes > 0 && Number(f.size) > limitBytes) {
          const msg = '文件过大：' + formatSize(f.size) + '，上限 ' + formatSize(limitBytes)
            + '（管理员可在「系统设置 → 单文件上传上限」调整，0 = 不限）'
          fails.push({ name, sub, error: msg })
          this._failed.push({ file: f, base, project, name, sub })
          bus.emit('upload:progress', { name, sub, status: 'fail', error: msg, index: nav.uploadDone, total: files.length })
          nav.uploadDone++
          continue
        }
        const fullSub = base ? base + (sub ? '/' + sub : '') : sub
        const url = '/privhub/api/upload?project=' + encodeURIComponent(project)
          + '&path=' + encodeURIComponent(fullSub)
          + '&name=' + encodeURIComponent(name)
        /* 字节级进度：同一文件只在百分比变化或间隔 ≥500ms 时发事件，避免刷屏。 */
        let lastPct = -1; let lastAt = 0
        const emitProgress = (loaded, total) => {
          if (!total) return
          const pct = Math.max(0, Math.min(100, Math.floor((loaded / total) * 100)))
          const now = Date.now()
          if (pct === lastPct && now - lastAt < 500) return
          lastPct = pct; lastAt = now
          bus.emit('upload:progress', {
            name, sub, status: 'uploading', percent: pct, loaded, size: total,
            index: nav.uploadDone, total: files.length,
          })
        }
        try {
          /* 大文件走分片（断点续传）；小文件仍一次 POST，少三次往返。 */
          const j = f.size >= CHUNK_THRESHOLD
            ? await this.uploadChunked(f, project, fullSub, name, emitProgress)
            : await this.uploadOne(f, url, emitProgress)
          okCount++
          const nDup = (j.duplicates || []).length
          const nNear = (j.near || []).length
          if (nDup || nNear) {
            const hit = (j.duplicates || [])[0] || (j.near || [])[0]
            dupHits.push({ name, rel, match: hit ? hit.path : '', exact: nDup > 0, near: nNear > 0 })
          }
          bus.emit('upload:progress', { name, sub, status: 'ok', percent: 100, index: nav.uploadDone, total: files.length })
          // file:uploaded：触发下游（防病毒 F27 / 审计 F13 等，当前无监听者，安全）
          bus.emit('file:uploaded', { project, path: (base ? base + '/' : '') + rel, name })
        } catch (e) {
          const err = e instanceof UploadError ? e : new UploadError('网络错误')
          const msg = err.message || '上传失败'
          fails.push({ name, sub, error: msg })
          this._failed.push({ file: f, base, project, name, sub })
          bus.emit('upload:progress', { name, sub, status: 'fail', error: msg, index: nav.uploadDone, total: files.length })
        }
        nav.uploadDone++
      }
      nav.uploading = false
      bus.emit('upload:done', { ok: okCount, total: files.length, fails })
      // E2：上传完成改为非阻塞 toast（成功绿 / 部分失败橙）
      if (fails.length === 0) window.PrivHub.toast('已上传 ' + okCount + '/' + files.length + ' 个文件')
      else if (okCount > 0) window.PrivHub.toast('已上传 ' + okCount + '/' + files.length + ' 个，失败 ' + fails.length + ' 个', 'warn')
      else {
        // 全失败时把首个原因直接说出来（特别是「文件过大」这类可行动的提示）
        window.PrivHub.toast('上传失败 ' + fails.length + ' 个文件：' + (fails[0].error || '未知原因'), 'error')
      }
      /* Q6：重复内容提示（上传已完成，这里只是一条提醒；用 warn 色，不打断）。 */
      if (dupHits.length) {
        const d = dupHits[0]
        const tail = dupHits.length > 1 ? '（等 ' + dupHits.length + ' 个文件）' : ''
        window.PrivHub.toast(
          (d.exact ? '内容重复：' : '内容高度相似：') + d.name + ' 与已有 ' + (d.match || '文件')
          + (d.exact ? ' 内容相同' : ' 相似') + tail + '，两份都保留了，可自行删除其一', 'warn')
      }
      // 上传完成后导航到目标目录（看到结果）；同目录时等价于刷新
      await nav.openDir(project, base)
      this._dirTarget = null
    },
    /** 真·重试：复用失败时的 File 句柄与目标项目/目录，不再弹文件选择框。 */
    retryFailed() {
      const failed = (this._failed || []).slice()
      if (!failed.length) {
        window.PrivHub.toast('没有可重试的文件（刷新页面后需重新选择）', 'warn')
        bus.emit('upload:request')
        return
      }
      const groups = new Map()
      for (const it of failed) {
        const key = it.project + '\u0000' + it.base
        if (!groups.has(key)) groups.set(key, { project: it.project, base: it.base, files: [] })
        groups.get(key).files.push(it.file)
      }
      this._failed = []
      void (async () => {
        for (const g of groups.values()) await this.uploadAll(g.files, g.base, g.project)
      })()
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
    /* 队列里的「重试」走这里：文件句柄还在内存里就直接重传，
       不再弹选择框（此前 retryAll 发 upload:request，等于让用户重新选一遍）。 */
    this._offRetry = bus.on('upload:retry-failed', () => { this.retryFailed() })
  },
  beforeUnmount() {
    document.removeEventListener('dragover', this._onDragOver)
    document.removeEventListener('drop', this._onDrop)
    if (this._offReq) this._offReq()
    if (this._offReqDir) this._offReqDir()
    if (this._offRetry) this._offRetry()
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
