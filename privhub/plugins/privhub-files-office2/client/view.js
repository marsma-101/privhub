/* privhub-files-office2 · view.js — Office 原生观感预览 + 单人独占编辑 */
(function () {
  'use strict'
  const QS = new URLSearchParams(location.search)
  const project = QS.get('project') || ''
  const path = QS.get('path') || ''
  const name = QS.get('name') || path.split('/').pop() || 'file'
  const ext = (name.split('.').pop() || '').toLowerCase()
  const token = localStorage.getItem('privhub_token') || ''
  const $ = (id) => document.getElementById(id)

  /* 单独打开本页时才显示文件名——被 V3 内容区以 iframe 嵌入时，文件名由标签栏承担，
   * 本页再显示一次就会形成重复（用户反馈的「三层顶栏、文件名三次」）。 */
  if (window.self === window.top) document.body.classList.add('standalone')

  let locked = false
  let editing = false
  let heartbeat = null
  let univer = null
  let univerAPI = null

  /* ---------- 基础 ---------- */
  function toast(msg) {
    const t = $('toast')
    t.textContent = msg
    t.classList.add('show')
    clearTimeout(t._h)
    t._h = setTimeout(() => t.classList.remove('show'), 2600)
  }
  async function api(u, opts) {
    const r = await fetch(u, {
      ...opts,
      headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json', ...(opts && opts.headers) },
    })
    let j = {}
    try { j = await r.json() } catch { /* 非 JSON */ }
    return { status: r.status, ...j }
  }
  function setStatus(text, cls) {
    const s = $('status')
    s.textContent = text
    s.className = 'st' + (cls ? ' ' + cls : '')
  }
  if (!token) { setStatus('未登录（请从 PrivHub 打开）', 'locked'); $('loading').textContent = '未登录'; return }

  $('fname').textContent = name

  /* ---------- 锁 ---------- */
  async function queryLock() {
    const r = await api('/privhub/api/office2/lock?project=' + encodeURIComponent(project) + '&path=' + encodeURIComponent(path))
    return r
  }
  async function acquireLock() {
    const r = await api('/privhub/api/office2/lock', { method: 'POST', body: JSON.stringify({ project, path }) })
    if (r.status === 200 && (r.acquired || r.renew)) {
      locked = true
      startHeartbeat()
      return true
    }
    return false
  }
  async function releaseLock() {
    if (!locked) return
    locked = false
    stopHeartbeat()
    await api('/privhub/api/office2/lock?project=' + encodeURIComponent(project) + '&path=' + encodeURIComponent(path), { method: 'DELETE' })
  }
  function startHeartbeat() {
    stopHeartbeat()
    heartbeat = setInterval(() => {
      api('/privhub/api/office2/lock', { method: 'POST', body: JSON.stringify({ project, path }) }).catch(() => {})
    }, 60000)
  }
  function stopHeartbeat() { if (heartbeat) { clearInterval(heartbeat); heartbeat = null } }
  window.addEventListener('beforeunload', () => { releaseLock() })

  /* 锁状态轮询：只读且编辑按钮被禁用时，周期性探测是否已解锁（他人保存/释放后自动恢复） */
  let lockWatcher = null
  function startLockWatch() {
    stopLockWatch()
    lockWatcher = setInterval(async () => {
      if (editing || locked) return
      const q = await queryLock()
      if (q.locked && q.lockedBy) {
        setStatus('🔒 ' + q.lockedBy + ' 正在编辑', 'locked')
      } else {
        setStatus('只读预览', '')
        $('btn-edit').disabled = false
        $('btn-edit').title = '获取独占编辑锁后编辑'
        stopLockWatch()
      }
    }, 10000)
  }
  function stopLockWatch() { if (lockWatcher) { clearInterval(lockWatcher); lockWatcher = null } }

  /* ---------- 编辑模式切换 ---------- */
  function enterEdit() {
    editing = true
    $('btn-edit').style.display = 'none'
    $('btn-save').style.display = 'inline-block'
    $('btn-release').style.display = 'inline-block'
    $('btn-exit').style.display = 'inline-block'
    setStatus('编辑中（你持有独占锁）', 'editing')
    if (ext === 'docx') {
      $('docx').contentEditable = 'true'
      $('etool').style.display = 'flex'
      $('docx').focus()
    } else if (ext === 'xlsx' && univerAPI) {
      const sheet = univerAPI.getActiveWorkbook().getActiveSheet()
      if (sheet && typeof sheet.setEditable === 'function') sheet.setEditable(true)
    }
  }
  function exitEdit(keepLock) {
    editing = false
    $('btn-edit').style.display = 'inline-block'
    $('btn-save').style.display = 'none'
    $('btn-release').style.display = 'none'
    $('btn-exit').style.display = 'none'
    $('etool').style.display = 'none'
    if (ext === 'docx') $('docx').contentEditable = 'false'
    else if (ext === 'xlsx' && univerAPI) {
      const sheet = univerAPI.getActiveWorkbook().getActiveSheet()
      if (sheet && typeof sheet.setEditable === 'function') sheet.setEditable(false)
    }
    setStatus(keepLock ? '只读（锁保留中）' : '只读')
  }

  /* ---------- 保存 ---------- */
  /* 收集可保存的正文 HTML：docx-preview 会在容器里注入 <style> 与页面骨架（页眉/页脚/分页容器），
   * 直接 innerHTML 会把样式文本当正文写进文档开头。这里克隆后只保留真正的正文内容结构。 */
  function collectDocHtml() {
    const clone = $('docx').cloneNode(true)
    clone.querySelectorAll('style,link,script,meta,title').forEach((n) => n.remove())
    // 页面装饰：页眉 / 页脚 / 页码（docx-preview 每页一个 section>footer 等）
    clone.querySelectorAll('.docx-wrapper>section.docx>footer,.docx-wrapper>section.docx>header,section.docx>footer,section.docx>header,.docx-page-footer,.docx-page-header,.docx-footnotes,.docx-endnotes').forEach((n) => n.remove())
    // 展平外层骨架（wrapper/section/article 只留内部内容，避免空壳被转为空段）
    const unwrap = (sel) => clone.querySelectorAll(sel).forEach((n) => { while (n.firstChild) n.parentNode.insertBefore(n.firstChild, n); n.remove() })
    unwrap('.docx-wrapper')
    unwrap('section.docx')
    unwrap('article')
    // 清掉纯空白/空壳块（保留含图片/表格/分隔线的节点）
    clone.querySelectorAll('p,div,h1,h2,h3,h4,h5,h6,li').forEach((n) => {
      if (!n.textContent.trim() && !n.querySelector('img,table,hr')) n.remove()
    })
    return clone.innerHTML
  }
  async function saveDocx() {
    const html = collectDocHtml()
    const r = await api('/privhub/api/office2/save', { method: 'POST', body: JSON.stringify({ project, path, kind: 'docx', content: html }) })
    if (r.status === 200) {
      toast('✅ 已保存')
      await reloadDocx() // 重新渲染最新内容
    } else {
      toast('❌ ' + (r.error || '保存失败'))
      if (r.status === 409) { releaseLock(); exitEdit(false) }
    }
  }
  async function saveXlsx() {
    const wb = univerAPI.getActiveWorkbook()
    const rows = []
    const sheet = wb.getActiveSheet()
    const range = sheet.getRange(0, 0, sheet.getMaxRows(), sheet.getMaxColumns())
    const matrix = range.getValues()
    // 去掉全空尾部行
    let last = matrix.length
    while (last > 0 && matrix[last - 1].every((c) => c === null || c === '' || c === undefined)) last--
    for (let i = 0; i < last; i++) rows.push(matrix[i].map((c) => (c === null || c === undefined ? '' : c)))
    const r = await api('/privhub/api/office2/save', { method: 'POST', body: JSON.stringify({ project, path, kind: 'xlsx', content: rows }) })
    if (r.status === 200) toast('✅ 已保存')
    else {
      toast('❌ ' + (r.error || '保存失败'))
      if (r.status === 409) { releaseLock(); exitEdit(false) }
    }
  }
  async function doSave() {
    if (!editing) return
    $('btn-save').disabled = true
    try {
      if (ext === 'docx') await saveDocx()
      else if (ext === 'xlsx') await saveXlsx()
    } finally { $('btn-save').disabled = false }
  }

  /* ---------- 按钮绑定 ---------- */
  $('btn-download').onclick = () => {
    const a = document.createElement('a')
    a.href = '/privhub/api/download?project=' + encodeURIComponent(project) + '&path=' + encodeURIComponent(path)
    a.download = name
    a.click()
  }
  $('btn-edit').onclick = async () => {
    if (ext !== 'docx' && ext !== 'xlsx') return
    const ok = await acquireLock()
    if (ok) enterEdit()
    else {
      const q = await queryLock()
      toast('🔒 文件正被 ' + (q.lockedBy || '他人') + ' 编辑，只能只读查看')
      setStatus('🔒 ' + (q.lockedBy || '他人') + ' 正在编辑', 'locked')
    }
  }
  $('btn-save').onclick = () => doSave()
  $('btn-release').onclick = async () => {
    await doSave()
    await releaseLock()
    exitEdit(false)
    toast('已保存并释放锁')
  }
  $('btn-exit').onclick = async () => {
    if (!confirm('放弃本次修改？未保存的内容将丢失。')) return
    await releaseLock()
    exitEdit(false)
    // 重新加载预览
    if (ext === 'docx') await reloadDocx()
  }
  // docx 编辑工具栏
  document.querySelectorAll('#etool button[data-cmd]').forEach((b) => {
    b.onclick = () => {
      $('docx').focus()
      if (b.dataset.cmd === 'formatBlock') document.execCommand('formatBlock', false, b.dataset.val)
      else document.execCommand(b.dataset.cmd, false, null)
    }
  })

  /* ---------- docx：docx-preview 保真渲染 ---------- */
  async function reloadDocx() {
    const wrap = $('wrap')
    $('loading').style.display = 'flex'
    $('docx').style.display = 'none'
    try {
      const r = await fetch('/privhub/api/office2/raw?project=' + encodeURIComponent(project) + '&path=' + encodeURIComponent(path), {
        headers: { authorization: 'Bearer ' + token },
      })
      if (!r.ok) throw new Error('读取失败 HTTP ' + r.status)
      const buf = await r.arrayBuffer()
      await docx.renderAsync(buf, $('docx'), null, { inWrapper: true, ignoreWidth: false, ignoreHeight: false })
      $('loading').style.display = 'none'
      $('docx').style.display = 'block'
    } catch (e) {
      $('loading').textContent = '❌ 文档渲染失败：' + (e.message || e)
      setStatus('渲染失败', 'locked')
    }
  }

  /* ---------- xlsx：Univer 电子表格 ---------- */
  function rowsToSnapshot(sheets) {
    const out = []
    let rmax = 1
    for (const s of sheets) if (s.rows) rmax = Math.max(rmax, s.rows.length)
    for (let si = 0; si < sheets.length; si++) {
      const s = sheets[si]
      const rows = s.rows || []
      const cellData = {}
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r] || []
        const cells = {}
        for (let c = 0; c < row.length; c++) {
          const v = row[c]
          if (v === null || v === undefined || v === '') continue
          let t = 's'
          if (typeof v === 'number') t = 'n'
          else if (typeof v === 'boolean') t = 'b'
          cells[c] = { v, t }
        }
        if (Object.keys(cells).length) cellData[r] = cells
      }
      out.push({
        id: 's' + si,
        name: s.name || 'Sheet' + (si + 1),
        rowCount: Math.max(rows.length, 100),
        columnCount: 20,
        cellData,
      })
    }
    return {
      id: 'wb-' + Date.now(),
      locale: 'zhCN',
      name: name,
      sheetOrder: out.map((x) => x.id),
      sheets: out,
      styles: {},
    }
  }
  async function loadXlsx() {
    const r = await api('/privhub/api/office/read?project=' + encodeURIComponent(project) + '&path=' + encodeURIComponent(path))
    if (!r.ok) { $('loading').textContent = '❌ 读取失败：' + (r.error || '未知'); setStatus('读取失败', 'locked'); return }
    const snapshot = rowsToSnapshot(r.content.sheets || [])
    const { createUniver, UniverSheetsCorePreset, LocaleType, zhCNLocale } = window.Office2Univer
    const created = createUniver({
      locale: LocaleType.ZH_CN,
      locales: { [LocaleType.ZH_CN]: zhCNLocale },
      presets: [
        UniverSheetsCorePreset({
          container: 'sheet',
          toolbar: false,
          formulaBar: false,
          footer: false,
          statusBarStatistic: false,
          contextMenu: true,
        }),
      ],
    })
    univer = created.univer
    univerAPI = created.univerAPI
    if (typeof univerAPI.createUniverSheet === 'function') univerAPI.createUniverSheet(snapshot)
    else univer.createUnit(univerAPI.Enum.UniverInstanceType.UNIVER_SHEET, snapshot)
    // 默认只读（编辑需取锁）
    const sheet = univerAPI.getActiveWorkbook().getActiveSheet()
    if (sheet && typeof sheet.setEditable === 'function') sheet.setEditable(false)
    $('loading').style.display = 'none'
    $('sheet').style.display = 'block'
    setStatus('只读预览', '')
  }

  /* ---------- 启动 ---------- */
  ;(async function init() {
    $('fname').textContent = name
    if (ext === 'docx') {
      await reloadDocx()
    } else if (ext === 'xlsx') {
      await loadXlsx()
    } else {
      $('loading').textContent = '该类型暂不支持 Office 原生预览'
      setStatus('不支持', 'locked')
      return
    }
    // 锁状态提示
    const q = await queryLock()
    if (q.locked && q.lockedBy) {
      setStatus('🔒 ' + q.lockedBy + ' 正在编辑', 'locked')
      $('btn-edit').disabled = true
      $('btn-edit').title = '文件正被 ' + q.lockedBy + ' 编辑'
      startLockWatch()
    } else {
      setStatus('只读预览', '')
    }
  })()
})()
