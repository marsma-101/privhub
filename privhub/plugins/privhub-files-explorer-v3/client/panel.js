/**
 * panel — 中栏内容区（panel slot）：标签行、内容渲染、文件表、各类弹窗。
 *
 * 这是本插件最大的界面单元（约 590 行）。若日后还要再拆，
 * 优先把「文件表 + 批量工具栏」抽成子组件。
 *
 * @module privhub-files-explorer-v3/client/panel
 */

import { api, nav, bus, AUTH, fileIcon } from './deps.js'
import { isEditableText, relPath } from './utils.js'
import { store } from './store.js'
import { persistTabs, restoreTabs, openTab, activateTab, closeTab, closeOthers } from './tabs.js'
import { refreshTree } from './treecache.js'
import { openMenuFor, closeMenu, openDetail, openPerm, doRename, cancelRename, submitRename, doCopyHere, doMoveOpen, doMoveSubmit, doDelete, doFavorite, doDownload, convertDocToDocx, doEdit, doMkdirHere, doMkdirHereSubmit, submitMkdirV3 } from './ops.js'
import { loadContent, esc, renderMarkdown } from './content.js'
import { TreeNodeV3 } from './tree.js'

/* ================= 文件面板（panel slot）：标签栏 + 主区 ================= */
const PanelV3 = {
  name: 'files-panel-v3',
  data() { return { nav, store, AUTH, pressTimer: null, batchBusy: false, previewFont: parseFloat(localStorage.getItem('privhub_preview_font') || '13.5') || 13.5 } },
  computed: {
    /* 中间栏只显示文件（文件夹在左侧目录树管理） */
    entries() {
      const arr = [...nav.entries].filter(e => !e.isDir)
      const key = nav.sortKey
      const asc = nav.sortAsc ? 1 : -1
      arr.sort((a, b) => {
        let va, vb
        if (key === 'name') { va = a.name; vb = b.name }
        else if (key === 'size') { va = a.size; vb = b.size }
        else if (key === 'mtime') { va = a.mtime; vb = b.mtime }
        else { va = a.name; vb = b.name }
        if (va < vb) return -1 * asc
        if (va > vb) return 1 * asc
        return 0
      })
      return arr
    },
    crumbs() {
      const parts = this.nav.path ? this.nav.path.split('/').filter(Boolean) : []
      const arr = [{ label: this.nav.project, path: '' }]
      let acc = ''
      for (const p of parts) { acc = acc ? acc + '/' + p : p; arr.push({ label: p, path: acc }) }
      return arr
    },
    activeTab() { return store.tabs.find(t => t.key === store.activeKey) || null },
    content() { return store.content },
    showTabs() { return store.tabs.length > 0 },
    isOfficeFile() {
      const t = this.activeTab
      return t ? ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(t.kind === 'office' ? (t.name.split('.').pop() || '').toLowerCase() : '') : false
    },
    isMdFile() { const t = this.activeTab; return t ? t.kind === 'md' : false },
    /* 纯文本（txt/json/…）：edit-md 内嵌编辑，kind 为 text 且扩展名在可编辑清单 */
    isTextEditFile() {
      const t = this.activeTab
      return t ? t.kind === 'text' && isEditableText(t.name) : false
    },
    isEditFile() { return this.isOfficeFile || this.isMdFile || this.isTextEditFile },
    /* 详情开关状态：右侧面板打开且正显示当前激活文件 */
    detailOpen() {
      return !!(nav.rightOpen && nav.selected && !nav.selected.isDir && this.activeTab && nav.selected.name === this.activeTab.name)
    },
    isAdmin() { return AUTH.user && AUTH.user.role === 'admin' },
    isRootMenu() {
      const m = store.ctxMenu
      return m ? m.entry.isDir && m.dirPath === '' && m.entry.name === m.project : false
    },
  },
  watch: {
    // 切项目（旧项目非空）→ 清空标签；刷新恢复场景（null → 项目）不清
    'nav.project'(n, o) {
      if (o !== null && n !== o) { store.tabs = []; store.activeKey = ''; store.content = null; persistTabs() }
    },
    // 同项目内导航目录 → 回到目录浏览（标签保留，VS Code 语义：点标签再回内容）
    'nav.path'() {
      if (nav.project !== null) { store.activeKey = ''; store.content = null; bus.emit('md:interrupt', {}) }
    },
  },
  methods: {
    /* ---- 标签栏 ---- */
    openFile(e) { openTab(e, nav.project, nav.path) },
    activate(k) { activateTab(k) },
    close(k) { closeTab(k) },
    closeOthers(k) { closeOthers(k) },
    onAuxclick(k, ev) { if (ev.button === 1) { ev.preventDefault(); closeTab(k) } },
    /* ---- 编辑/下载（内容区操作按钮） ---- */
    editActive() {
      const t = this.activeTab
      if (!t) return
      if (t.kind === 'office') {
        if (/\.doc$/i.test(t.name)) {
          void convertDocToDocx({ entry: { name: t.name, isDir: false }, project: t.project, path: t.path })
          return
        }
        bus.emit('office:edit', { entry: { name: t.name, isDir: false }, project: t.project, path: t.path })
      }
      else if (t.kind === 'md' || isEditableText(t.name)) bus.emit('entry:open', { entry: { name: t.name, isDir: false }, project: t.project, path: t.path.includes('/') ? t.path.slice(0, t.path.lastIndexOf('/')) : '' })
    },
    async downloadActive() {
      const t = this.activeTab
      if (!t) return
      try {
        const r = await fetch('/privhub/api/download?project=' + encodeURIComponent(t.project) + '&path=' + encodeURIComponent(t.path), {
          headers: { authorization: 'Bearer ' + AUTH.token },
        })
        if (!r.ok) { window.PrivHub.toast('下载失败（HTTP ' + r.status + '）', 'error'); return }
        const blob = await r.blob()
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = t.name
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(a.href), 5000)
      } catch { window.PrivHub.toast('下载失败', 'error') }
    },
    detailActive() {
      const t = this.activeTab
      if (!t) return
      // 内容区「ℹ️ 详情」：右侧详情面板显示该文件
      nav.selected = { name: t.name, isDir: false, sizeText: t.sizeText, type: t.type }
      nav.rightOpen = true
    },
    /* 内容区头部详情开关：开/关右侧详细信息面板 */
    detailToggle() {
      const t = this.activeTab
      if (!t) return
      if (this.detailOpen) { nav.rightOpen = false; return }
      nav.selected = { name: t.name, isDir: false, sizeText: t.sizeText, type: t.type }
      nav.rightOpen = true
    },
    /* ---- 预览字体大小（独立于页面字体） ---- */
    applyPreviewFont() {
      document.documentElement.style.setProperty('--v3-preview-font', this.previewFont + 'px')
      try { localStorage.setItem('privhub_preview_font', String(this.previewFont)) } catch { /* 忽略 */ }
    },
    previewFontInc() { this.previewFont = Math.min(24, Math.round((this.previewFont + 1) * 10) / 10); this.applyPreviewFont() },
    previewFontDec() { this.previewFont = Math.max(10, Math.round((this.previewFont - 1) * 10) / 10); this.applyPreviewFont() },
    previewFontReset() { this.previewFont = 13.5; this.applyPreviewFont() },
    /* ---- 内容区 ⋯ 菜单（把原先散在标题行上的功能收进一个按钮） ---- */
    toggleMenu() { store.menu = !store.menu },
    menuCloseCurrent() { store.menu = false; close(store.activeKey) },
    menuCloseOthers() { store.menu = false; closeOthers(store.activeKey) },
    menuCloseAll() {
      store.menu = false
      store.tabs = []
      store.activeKey = ''
      store.content = null
      persistTabs()
    },
    async menuCopyPath() {
      store.menu = false
      const t = this.activeTab
      if (!t) return
      const abs = t.project + '/' + t.path
      try { await navigator.clipboard.writeText(abs); window.PrivHub.toast('已复制：' + abs) } catch { window.PrivHub.toast('复制失败：' + abs, 'warn') }
    },
    reloadActive() { const t = this.activeTab; if (t) void loadContent(t.key) },
    /* ---- 目录浏览 ---- */
    onEntryClick(e) {
      if (e.isDir) { nav.openDir(nav.project, nav.relPathOf(e.name)); return }
      openTab(e, nav.project, nav.path)
    },
    onEntryDbl(e) { this.onEntryClick(e) },
    startPress(e, el) {
      this.pressTimer = setTimeout(() => {
        const rect = el.getBoundingClientRect()
        openMenuFor(e, nav.path, Math.min(rect.left + 20, window.innerWidth - 180), Math.min(rect.top + 20, window.innerHeight - 160))
      }, 1500)
    },
    cancelPress() { if (this.pressTimer) { clearTimeout(this.pressTimer); this.pressTimer = null } },
    openCtxMenu(e, ev) { this.cancelPress(); openMenuFor(e, nav.path, ev.clientX, ev.clientY) },
    onDots(e, ev) { ev.stopPropagation(); openMenuFor(e, nav.path, ev.clientX, ev.clientY + 6) },
    closeMenu() { closeMenu() },
    openDetail() { openDetail() },
    doRename() { doRename() },
    submitRename() { void submitRename() },
    cancelRename() { cancelRename() },
    doDelete() { doDelete() },
    doFavorite() { doFavorite() },
    doDownload() { void doDownload() },
    doCopyHere() { void doCopyHere() },
    doMoveOpen() { void doMoveOpen() },
    doMoveSubmit() { void doMoveSubmit() },
    doEdit() { doEdit() },
    doMkdirHere() { doMkdirHere() },
    /* 文件夹 ⋯ 菜单：上传整个文件夹到该文件夹（根节点 → 项目根） */
    doUploadHere() {
      const m = store.ctxMenu
      closeMenu()
      if (!m || !m.entry.isDir) return
      const isRoot = m.dirPath === '' && m.entry.name === m.project
      const rel = isRoot ? '' : relPath(m.project, m.dirPath, m.entry.name)
      bus.emit('upload:request-dir', { path: rel })
    },
    /* 树根 ⋯ 菜单：邀请成员（admin，privhub-files-invite 插件弹窗） */
    doInvite() {
      const m = store.ctxMenu
      closeMenu()
      if (!m) return
      bus.emit('invite:open', { project: m.project })
    },
    async openPerm() { await openPerm() },
    /* ---- 内联输入模态（批量移动 / 新建子文件夹） ---- */
    batchMove() {
      const names = Object.keys(nav.checked).filter(n => nav.checked[n])
      if (!names.length) return
      store.promptState = { mode: 'move', title: '移动到哪个目录？（相对当前项目根，留空 = 项目根）', value: '' }
    },
    async doBatchMove(dir) {
      const names = Object.keys(nav.checked).filter(n => nav.checked[n])
      store.promptState = null
      this.batchBusy = true
      let okCount = 0
      try {
        for (const n of names) {
          const rel = nav.relPathOf(n)
          try {
            const r = await api('/privhub/api/move', { method: 'POST', body: JSON.stringify({ project: nav.project, from: rel, toDir: dir }) })
            if (r.ok) okCount++
            else { window.PrivHub.toast('移动「' + n + '」失败：' + (r.error || '未知错误'), 'error'); break }
          } catch { window.PrivHub.toast('移动「' + n + '」失败', 'error'); break }
        }
      } finally { this.batchBusy = false }
      nav.checked = {}
      if (okCount > 0) {
        window.PrivHub.toast('已移动 ' + okCount + '/' + names.length + ' 项')
        await nav.openDir(nav.project, nav.path)
        await refreshTree()
      }
    },
    submitPrompt() {
      const st = store.promptState
      if (!st) return
      const value = st.value.trim()
      if (!value) return
      if (st.mode === 'move') void this.doBatchMove(value)
      else if (st.mode === 'mkdir') void doMkdirHereSubmit(value)
    },
    cancelPrompt() { store.promptState = null },
    /* ---- 批量选择 ---- */
    isChecked(name) { return nav.checked[name] === true },
    toggleCheck(e, ev) {
      ev.stopPropagation()
      if (nav.checked[e.name]) delete nav.checked[e.name]
      else nav.checked[e.name] = true
    },
    checkedCount() { return Object.keys(nav.checked).filter(n => nav.checked[n]).length },
    checkedSizeText() {
      const names = Object.keys(nav.checked).filter(n => nav.checked[n])
      let total = 0
      for (const n of names) {
        const e = nav.entries.find(x => x.name === n)
        if (e && !e.isDir && typeof e.size === 'number') total += e.size
      }
      if (total === 0) return ''
      if (total < 1024) return total + ' B'
      if (total < 1024 * 1024) return (total / 1024).toFixed(1) + ' KB'
      return (total / 1024 / 1024).toFixed(1) + ' MB'
    },
    selectAll() {
      const all = this.entries.every(e => nav.checked[e.name])
      if (all) nav.checked = {}
      else { nav.checked = {}; for (const e of this.entries) nav.checked[e.name] = true }
    },
    clearChecked() { nav.checked = {} },
    async batchDownload() {
      const names = Object.keys(nav.checked).filter(n => nav.checked[n])
      const files = names.map(n => nav.entries.find(e => e.name === n)).filter(e => e && !e.isDir)
      if (!files.length) { window.PrivHub.toast('所选项目中无文件可下载', 'warn'); return }
      this.batchBusy = true
      try {
        for (const e of files) {
          try {
            const r = await fetch('/privhub/api/download?project=' + encodeURIComponent(nav.project) + '&path=' + encodeURIComponent(nav.relPathOf(e.name)), {
              headers: { authorization: 'Bearer ' + AUTH.token },
            })
            if (!r.ok) continue
            const blob = await r.blob()
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = e.name
            document.body.appendChild(a)
            a.click()
            a.remove()
            setTimeout(() => URL.revokeObjectURL(a.href), 5000)
          } catch { /* 单条失败继续 */ }
        }
        window.PrivHub.toast('已开始下载 ' + files.length + ' 个文件')
      } finally { this.batchBusy = false }
    },
    async batchDelete() {
      const names = Object.keys(nav.checked).filter(n => nav.checked[n])
      if (!names.length) return
      if (!confirm('将选中的 ' + names.length + ' 项移入回收站（30 天后自动清除，可在回收站恢复）？')) return
      this.batchBusy = true
      let okCount = 0
      try {
        for (const n of names) {
          const rel = nav.relPathOf(n)
          try { const r = await api('/privhub/api/delete', { method: 'POST', body: JSON.stringify({ project: nav.project, path: rel }) }); if (r.ok) okCount++ } catch { /* 单条失败继续 */ }
        }
      } finally { this.batchBusy = false }
      nav.checked = {}
      await nav.openDir(nav.project, nav.path)
      await refreshTree()
      bus.emit('trash:changed', {})
      window.PrivHub.toast('已将 ' + okCount + '/' + names.length + ' 项移入回收站')
    },
    /* ---- 其他 ---- */
    doSubmitMkdir() { submitMkdirV3() },
    doAddFile() { nav.addFile() },
    /* 合并查重入口：跳转 AI 工具 → 查重页签（RagView 消费 ragIntent 后自动选中 nav.project） */
    openDup() {
      if (window.PrivHub.openRagDup) window.PrivHub.openRagDup()
      else window.PrivHub.toast('查重页面未就绪（AI 工具未加载）', 'error')
    },
    renderMd() { return this.content && this.content.markdown !== undefined ? renderMarkdown(this.content.markdown) : '' },
    /* E3：长按功能发现性——首次进入面板提示一次 */
    maybeHint() {
      if (localStorage.getItem('privhub_longpress_hint')) return
      localStorage.setItem('privhub_longpress_hint', '1')
      window.PrivHub.toast('提示：长按文件或文件夹可呼出操作菜单', 'warn')
    },
  },
  mounted() {
    restoreTabs()
    this.applyPreviewFont()
    this.maybeHint()
    this._offMd = bus.on('md:changed', () => {
      const t = store.tabs.find(x => x.key === store.activeKey)
      if (t && (t.kind === 'md' || (t.kind === 'text' && isEditableText(t.name)))) void loadContent(t.key)
      if (nav.project !== null) { void nav.openDir(nav.project, nav.path); void refreshTree() }
      // openDir 会清零选中/右侧详情；标签仍激活 → 重新选中当前文件，详情面板保持打开
      const tab = store.tabs.find(x => x.key === store.activeKey)
      if (tab && nav.project === tab.project) {
        nav.selected = { name: tab.name, isDir: false, sizeText: tab.sizeText, type: tab.type }
        nav.rightOpen = true
      }
    })
    this._offTrash = bus.on('trash:changed', () => { if (nav.project !== null) { void nav.openDir(nav.project, nav.path); void refreshTree() } })
    // 跨插件刷新（新建文档向导等创建文件后通知，刷新目录树缓存；列表由调用方 openDir 刷新）
    this._offRef = bus.on('files:refresh', () => { if (nav.project !== null) void refreshTree() })
    // 脏标记：md 编辑器未保存 → 标签标题 ●
    this._offDirty = bus.on('md:dirty', (p) => {
      if (!p || !p.project || !p.path) return
      const t = store.tabs.find(x => x.project === p.project && x.path === p.path)
      if (t && !!t.dirty !== !!p.dirty) { t.dirty = !!p.dirty; persistTabs() }
    })
    this._offTabOpened = bus.on('v3:tab-opened', () => {}) // 占位：未来跨组件联动
  },
  beforeUnmount() {
    if (this._offMd) this._offMd()
    if (this._offTrash) this._offTrash()
    if (this._offRef) this._offRef()
    if (this._offDirty) this._offDirty()
    if (this._offTabOpened) this._offTabOpened()
  },
  template: `
    <div style="display:contents">
      <!-- 标签行：左＝标签栏（文件名唯一出处），右＝操作区（详情 / ⋯），同一行不叠层 -->
      <div v-if="showTabs" class="v3-tabrow">
        <div class="v3-tabs">
          <div
            v-for="t in store.tabs" :key="t.key"
            class="v3-tab" :class="{ on: t.key === store.activeKey }"
            @click="activate(t.key)" @auxclick="onAuxclick(t.key, $event)"
            :title="t.project + ' / ' + t.path"
          >
            <span>{{ fileIcon(t.type) }}</span>
            <span class="v3-tab-name">{{ t.dirty ? '● ' : '' }}{{ t.name }}</span>
            <span class="v3-tab-x" title="关闭" @click.stop="close(t.key)">✕</span>
          </div>
          <div style="flex:1"></div>
        </div>
        <div v-if="activeTab" class="v3-tabops">
          <button class="v3-op-btn" :title="detailOpen ? '关闭右侧详细信息' : '打开右侧详细信息'" @click="detailToggle">{{ detailOpen ? '✖ 详情' : 'ℹ️ 详情' }}</button>
          <button class="v3-op-btn" title="更多（字号 / 关闭标签 / 文件位置）" @click.stop="toggleMenu">⋯</button>
          <div v-if="store.menu" class="ctx-mask" @click="store.menu = false"></div>
          <div v-if="store.menu" class="v3-menu" @click.stop>
            <div class="v3-menu-row" title="内容/编辑字号">
              <span>字号</span>
              <span class="v3-fs" @click="previewFontDec">A−</span>
              <span class="v3-fs" @click="previewFontReset">{{ previewFont }}px</span>
              <span class="v3-fs" @click="previewFontInc">A+</span>
            </div>
            <div class="v3-menu-sep"></div>
            <div class="v3-menu-item" @click="menuCloseCurrent">✕ 关闭当前标签</div>
            <div v-if="store.tabs.length > 1" class="v3-menu-item" @click="menuCloseOthers">✕ 关闭其他标签</div>
            <div v-if="store.tabs.length > 1" class="v3-menu-item" @click="menuCloseAll">✕ 关闭全部标签</div>
            <div class="v3-menu-sep"></div>
            <div class="v3-menu-item" :title="activeTab.project + ' / ' + activeTab.path" @click="menuCopyPath">📋 复制文件位置<span class="v3-menu-k">{{ activeTab.project }}</span></div>
          </div>
        </div>
      </div>

      <!-- 主区：有激活标签 → 内容区；否则 → 目录浏览 -->
      <template v-if="activeTab && content && content.key === activeTab.key">
        <div class="v3-content">
          <!-- 内容区不再有任何顶栏/悬浮条：文件名在标签行，操作也在标签行 -->
          <div v-if="content.state === 'loading'" class="v3-loading">正在加载…</div>
          <div v-else-if="content.state === 'error'" class="v3-loading">{{ content.error }}</div>
          <template v-else-if="content.office">
            <div v-html="renderMd()" class="v3-md"></div>
          </template>
          <template v-else-if="content.markdown !== undefined">
            <div v-html="renderMd()" class="v3-md"></div>
          </template>
          <template v-else-if="content.text !== undefined">
            <pre class="v3-text">{{ content.text }}</pre>
          </template>
          <template v-else-if="content.url">
            <div v-if="activeTab.kind === 'image'" style="text-align:center"><img class="v3-img" style="cursor:zoom-in" :src="content.url" :alt="activeTab.name" @click="store.lightbox = content.url" /></div>
            <iframe v-else class="v3-pdf" :src="content.url"></iframe>
          </template>
        </div>
      </template>

      <template v-else>
        <div class="main-head">
          <span class="breadcrumb">
            <span v-for="(c, i) in crumbs" :key="i">
              <a v-if="i < crumbs.length - 1" @click="nav.gotoCrumb(c.path)" style="cursor:pointer">{{ i === 0 ? '📁 ' : '' }}{{ c.label }}</a>
              <span v-else style="color:var(--text)">{{ i === 0 ? '📁 ' : '' }}{{ c.label }}</span>
              <span v-if="i < crumbs.length - 1" class="crumb"> / </span>
            </span>
          </span>
          <span class="crumb" style="margin-left:8px">共 {{ entries.length }} 个文件</span>
          <span v-if="checkedCount() > 0" class="crumb" style="margin-left:8px;color:var(--accent)">已选 {{ checkedCount() }} 项{{ checkedSizeText() ? ' · ' + checkedSizeText() : '' }}</span>
          <span class="spacer"></span>
          <button v-if="nav.project" class="icon-btn" style="margin-left:4px" title="查重整个项目：同名同大小 + 内容一字不差（合并查重）" @click="openDup">🔁 查重</button>
          <template v-if="checkedCount() > 0">
            <button class="icon-btn" @click="selectAll">☑ 全选/取消</button>
            <button class="icon-btn" @click="clearChecked">取消选择</button>
            <button class="icon-btn" :disabled="batchBusy" @click="batchDownload">{{ batchBusy ? '处理中…' : '⬇ 下载所选' }}</button>
            <button class="icon-btn" :disabled="batchBusy" @click="batchMove">{{ batchBusy ? '处理中…' : '📦 移动所选' }}</button>
            <button class="icon-btn" style="color:var(--danger)" :disabled="batchBusy" @click="batchDelete">{{ batchBusy ? '处理中…' : '🗑 删除所选 (' + checkedCount() + ')' }}</button>
          </template>
          <span v-if="nav.uploading" class="crumb">上传中 {{ nav.uploadDone }}/{{ nav.uploadTotal }}…</span>
        </div>
        <div class="main-body">
          <div v-if="nav.listLoading" class="empty">加载中…</div>
          <div v-else-if="entries.length === 0" class="empty">
            <div style="font-size:32px;margin-bottom:10px">📂</div>
            <div style="font-size:13.5px;color:var(--text)">此文件夹下没有文件</div>
            <div style="font-size:12px;color:var(--muted);margin:6px 0 14px">上传文件，或从左侧目录树管理文件夹</div>
            <button class="btn btn-primary" style="width:auto" @click="doAddFile">⬆ 上传文件</button>
            <button class="icon-btn" style="margin-left:8px" @click="doSubmitMkdir">📁 新建文件夹</button>
          </div>
          <div v-else class="file-table-wrap">
            <div class="file-table-head" style="grid-template-columns:28px 1fr 90px 120px 110px 26px">
              <span><input type="checkbox" @click="selectAll" /></span>
              <span class="col-name" style="cursor:pointer" @click="nav.toggleSort('name')" title="按名称排序">名称{{ nav.sortKey==='name' ? (nav.sortAsc?' ↑':' ↓') : '' }}</span>
              <span class="col-size" style="cursor:pointer" @click="nav.toggleSort('size')" title="按大小排序">大小{{ nav.sortKey==='size' ? (nav.sortAsc?' ↑':' ↓') : '' }}</span>
              <span class="col-type">类型</span>
              <span class="col-time" style="cursor:pointer" @click="nav.toggleSort('mtime')" title="按修改时间排序">修改时间{{ nav.sortKey==='mtime' ? (nav.sortAsc?' ↑':' ↓') : '' }}</span>
              <span></span>
            </div>
            <div
              v-for="e in entries" :key="e.name"
              class="file-table-row" :class="{ sel: nav.selected && nav.selected.name === e.name }"
              style="grid-template-columns:28px 1fr 90px 120px 110px 26px"
              @click="onEntryClick(e)"
              @dblclick="onEntryDbl(e)"
              @mousedown="startPress(e, $event.currentTarget)"
              @mouseup="cancelPress"
              @mouseleave="cancelPress"
              @contextmenu.prevent="openCtxMenu(e, $event)"
            >
              <span><input type="checkbox" :checked="isChecked(e.name)" @click="toggleCheck(e, $event)" style="cursor:pointer" /></span>
              <span class="col-name">
                <template v-if="store.renameState && store.renameState.entry.name === e.name && !e.isDir">
                  <input
                    v-model="store.renameState.value"
                    @keyup.enter="submitRename"
                    @keyup.esc="cancelRename"
                    @click.stop
                    @dblclick.stop
                    @mousedown.stop
                    style="width:100%;padding:3px 6px;border-radius:4px;border:1px solid var(--accent);background:var(--bg);color:var(--text);font-size:12.5px;outline:none"
                  />
                </template>
                <template v-else><span class="tico">{{ fileIcon(e.type) }}</span>{{ e.name }}</template>
              </span>
              <span class="col-size">{{ e.sizeText }}</span>
              <span class="col-type">{{ e.type }}</span>
              <span class="col-time">{{ e.mtime ? e.mtime.replace('T', ' ').slice(0, 16) : '—' }}</span>
              <span class="v3-row-dots" title="操作" @click="onDots(e, $event)">⋯</span>
            </div>
          </div>
        </div>
      </template>

      <!-- ⋯ / 右键 / 长按 共用菜单 -->
      <div v-if="store.ctxMenu" class="ctx-mask" @click="closeMenu"></div>
      <div v-if="store.ctxMenu" class="ctx-menu" :style="{ left: store.ctxMenu.x + 'px', top: store.ctxMenu.y + 'px' }" @click.stop>
        <div class="ctx-item" @click="openDetail">ℹ️ 详情</div>
        <div class="ctx-item" @click="openPerm">🔐 权限</div>
        <div class="ctx-item" @click="doFavorite">⭐ 收藏</div>
        <div v-if="!store.ctxMenu.entry.isDir" class="ctx-item" @click="doDownload">⬇ 下载</div>
        <div v-if="!store.ctxMenu.entry.isDir" class="ctx-item" @click="doCopyHere">📄 复制副本</div>
        <div class="ctx-item" @click="doMoveOpen">📦 移动</div>
        <div v-if="!store.ctxMenu.entry.isDir && (isOfficeMenu || isMdMenu || isTextMenu)" class="ctx-item" @click="doEdit">✏️ 编辑</div>
        <div class="ctx-item" @click="doRename">✏️ 重命名</div>
        <div v-if="store.ctxMenu.entry.isDir" class="ctx-item" @click="doMkdirHere">＋ 新建子文件夹</div>
        <div v-if="store.ctxMenu.entry.isDir" class="ctx-item" @click="doUploadHere">📁 上传到该文件夹</div>
        <div v-if="isRootMenu && isAdmin" class="ctx-item" @click="doInvite">📨 邀请成员</div>
        <div class="ctx-item danger" @click="doDelete">🗑 删除</div>
      </div>

      <!-- 图片放大预览（lightbox） -->
      <div v-if="store.lightbox" class="modal-mask" style="background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center" @click.self="store.lightbox = null">
        <span style="position:fixed;top:16px;right:24px;font-size:24px;color:#fff;cursor:pointer;z-index:1101" @click="store.lightbox = null">✕</span>
        <img :src="store.lightbox" style="max-width:92vw;max-height:88vh;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,.5)" />
      </div>

      <!-- 权限弹窗 -->
      <div v-if="store.permTarget" class="modal-mask" @click.self="store.permTarget = null">
        <div class="modal" style="width:420px">
          <h2>🔐 权限 · {{ store.permTarget.entry.name }}</h2>
          <div class="modal-body">
            <div v-if="store.permTarget.loading" style="color:var(--muted);font-size:12.5px;padding:10px 0">加载中…</div>
            <template v-else>
              <div class="kv"><span class="k">当前用户</span><span>{{ AUTH.user.username }}（{{ AUTH.user.role === 'admin' ? '管理员' : '普通用户' }}）</span></div>
              <div class="kv"><span class="k">项目可见</span><span>{{ (nav.projectsList || []).includes(store.permTarget.project) ? '✅ 可访问' : '⛔ 不可访问' }}</span></div>
              <div style="margin-top:12px;font-size:12.5px;color:var(--muted)">
                <template v-if="AUTH.user.role === 'admin'">
                  以下为该项目/路径生效的 ACL 规则：
                  <div v-if="store.permTarget.rules && store.permTarget.rules.length" style="margin-top:8px">
                    <div v-for="(r, i) in store.permTarget.rules" :key="i" class="kv">
                      <span class="k">{{ r.path === '' ? '（项目根）' : r.path }}</span>
                      <span>{{ r.role }} · {{ r.action || '全部' }} · {{ r.allow ? '✅ 允许' : '⛔ 拒绝' }}</span>
                    </div>
                  </div>
                  <div v-else style="margin-top:8px">（无 ACL 规则，默认按项目可见性放行）</div>
                </template>
                <template v-else>
                  文件级权限规则由管理员在「权限管理」中配置。若你对该文件的操作被拒绝，请联系管理员调整 ACL。
                </template>
              </div>
              <div v-if="store.permTarget.error" style="margin-top:10px;color:var(--danger);font-size:12.5px">{{ store.permTarget.error }}</div>
            </template>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" @click="store.permTarget = null">关 闭</button>
          </div>
        </div>
      </div>

      <!-- 移动选择器（⋯ 菜单「移动」→ 树形目录选择） -->
      <div v-if="store.moveState" class="modal-mask" @click.self="store.moveState = null">
        <div class="modal" style="width:430px">
          <h2>📦 移动「{{ store.moveState.entry.name }}」到…</h2>
          <div class="modal-body">
            <div v-if="store.moveState.loading" style="color:var(--muted);font-size:12.5px;padding:12px 0">加载目录…</div>
            <template v-else>
              <div style="font-size:12.5px;max-height:320px;overflow:auto">
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:6px 8px;border-radius:6px" :style="{ background: store.moveState.target === '' ? 'rgba(90,130,200,.12)' : '' }">
                  <input type="radio" v-model="store.moveState.target" value="" /> 🏠 项目根目录
                </label>
                <label v-for="n in store.moveState.tree" :key="n.path" style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:6px 8px;border-radius:6px" :style="{ paddingLeft: (8 + n.depth * 18) + 'px', background: store.moveState.target === n.path ? 'rgba(90,130,200,.12)' : '' }">
                  <input type="radio" v-model="store.moveState.target" :value="n.path" /> 📁 {{ n.name }}
                </label>
              </div>
              <div style="color:var(--muted);font-size:12px;margin-top:6px">不能移动到自身或其子目录</div>
            </template>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" @click="store.moveState = null">取 消</button>
            <button class="btn btn-primary" style="width:auto" :disabled="store.moveState.busy" @click="doMoveSubmit">确 定</button>
          </div>
        </div>
      </div>

      <!-- 内联输入模态（批量移动 / 新建子文件夹） -->
      <div v-if="store.promptState" class="modal-mask" @click.self="cancelPrompt">
        <div class="modal" style="width:380px">
          <h2>{{ store.promptState.mode === 'move' ? '📦 批量移动' : '＋ 新建子文件夹' }}</h2>
          <div class="modal-body">
            <div class="field">
              <label>{{ store.promptState.title }}</label>
              <input v-model="store.promptState.value" @keyup.enter="submitPrompt" placeholder="输入后回车确认" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text)" />
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" @click="cancelPrompt">取 消</button>
            <button class="btn btn-primary" style="width:auto" @click="submitPrompt">确 定</button>
          </div>
        </div>
      </div>
    </div>
  `,
}

/* 菜单项动态显示（office/md/文本 才显示编辑）——用计算属性替代模板内函数 */
PanelV3.computed.isOfficeMenu = function () {
  const m = store.ctxMenu
  if (!m || m.entry.isDir) return false
  return /\.(doc|docx|xls|xlsx|ppt|pptx|pdf)$/i.test(m.entry.name)
}
PanelV3.computed.isMdMenu = function () {
  const m = store.ctxMenu
  if (!m || m.entry.isDir) return false
  return /\.md$/i.test(m.entry.name)
}
PanelV3.computed.isTextMenu = function () {
  const m = store.ctxMenu
  if (!m || m.entry.isDir) return false
  return isEditableText(m.entry.name)
}

PanelV3.components = { 'v3-tree-node': TreeNodeV3 }

export { PanelV3 }
