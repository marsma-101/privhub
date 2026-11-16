/**
 * side — 文件区右侧可伸缩边栏（2026-11-13 二次重排）。
 *
 * 把原先「常驻动作栏（actions.js）」与「右上角详情下拉（detail-menu.js）」合并成
 * 一个带标签的抽屉：标签少而精，按使用频率排——
 *   ⚡ 操作（默认）：上传 / 新建 / 查重 / 收藏 / 回收站（最常用，放第一个）
 *   ℹ️ 详情：选中项的信息 / 标签 / 引用链 / 文件操作
 * 搜索保持在外部（项目导航的文件族子入口），这里不重复设计。
 *
 * 可伸缩：拖左缘手柄调宽（220–420px，localStorage 持久化）；「详情」按钮开合。
 * 数据逻辑与旧详情面板完全同源（同一批 API 与 bus 事件），只换承载形态。
 *
 * @module privhub-files-explorer-v3/client/side
 */

import { api, nav, bus, AUTH, fileIcon } from './deps.js'
import { isEditableText, downloadUrl } from './utils.js'
import { store } from './store.js'
import { openTab, activateTab } from './tabs.js'
import { submitMkdirV3, newSheetFile, newPageFile, newMindmapFile, openPermFor, convertDocToDocx } from './ops.js'

const SidePanel = {
  name: 'v3-side',
  data() {
    return {
      store, nav,
      tags: [], tagInput: '', tagBusy: false, tagLoadedFor: '',
      backlinks: { incoming: [], outgoing: [] }, blLoadedFor: '', blBusy: false,
      dragging: false,
    }
  },
  computed: {
    here() { return nav.path ? nav.path.split('/').pop() : (nav.project || '项目根') },
    hereFull() { return (nav.project || '') + (nav.path ? ' / ' + nav.path : '') },
    hasRag() { return nav.hasBarView('rag') },
    hasFav() { return nav.hasBarView('favorites') },
    hasTrash() { return nav.hasBarView('trash') },
    /* 详情目标 = 当前选中/打开的文件（非目录）；没有选中文件时回落当前目录 */
    target() {
      const s = nav.selected
      if (s && !s.isDir) {
        return {
          name: s.name, path: nav.relPathOf(s.name), project: nav.project, isDir: false,
          sizeText: s.sizeText || '', type: s.type || '', mtime: s.mtime || '', id: s.id || '',
        }
      }
      if (nav.project !== null) {
        return { name: nav.path ? nav.path.split('/').pop() : nav.project, path: nav.path || '', project: nav.project, isDir: true, sizeText: '', type: '文件夹', mtime: '', id: '' }
      }
      return null
    },
    isFile() { return !!(this.target && !this.target.isDir) },
    isOffice() { const t = this.target; return t && !t.isDir ? /\.(doc|docx|xls|xlsx|ppt|pptx|pdf)$/i.test(t.name) : false },
    isMd() { const t = this.target; return t && !t.isDir ? /\.md$/i.test(t.name) : false },
    isHtml() { const t = this.target; return t && !t.isDir ? /\.html?$/i.test(t.name) : false },
    isText() { const t = this.target; return t && !t.isDir ? /\.(txt|md|json|js|ts|css|html|xml|csv|log|yaml|yml|ini|py|sh|bat|sql)$/i.test(t.name) : false },
    isEdit() { const t = this.target; if (!t || t.isDir) return false; return this.isOffice || /\.md$/i.test(t.name) || isEditableText(t.name) },
  },
  watch: {
    target(n, o) {
      if (!n || !o || n.project !== o.project || n.path !== o.path) { this.loadTags(); this.loadBacklinks() }
    },
    'store.sideTab'(v) { if (v === 'detail') { this.loadTags(); this.loadBacklinks() } },
    'store.sideOpen'(v) { if (v && this.store.sideTab === 'detail') { this.loadTags(); this.loadBacklinks() } },
  },
  mounted() { if (this.target) { this.loadTags(); this.loadBacklinks() } },
  beforeUnmount() { this.stopDrag() },
  methods: {
    fileIcon,
    /* ---- 开合 / 标签 / 伸缩 ---- */
    close() { store.sideOpen = false; try { localStorage.setItem('privhub_side_open', '0') } catch { /* 忽略 */ } },
    setTab(t) { store.sideTab = t },
    startDrag(ev) {
      ev.preventDefault()
      this.stopDrag()                       // 清掉上一次可能残留的监听（拖拽在窗口外结束时兜底）
      this.dragging = true
      this._dragX = ev.clientX
      this._dragW = store.sideWidth
      this._onMove = (e) => {
        const dx = this._dragX - e.clientX           // 往左拖 = 变宽
        store.sideWidth = Math.min(420, Math.max(220, this._dragW + dx))
      }
      this._onUp = () => {
        this.stopDrag()
        try { localStorage.setItem('privhub_side_w', String(store.sideWidth)) } catch { /* 忽略 */ }
      }
      window.addEventListener('mousemove', this._onMove)
      window.addEventListener('mouseup', this._onUp)
    },
    stopDrag() {
      this.dragging = false
      if (this._onMove) window.removeEventListener('mousemove', this._onMove)
      if (this._onUp) window.removeEventListener('mouseup', this._onUp)
      this._onMove = null; this._onUp = null
    },
    /* ---- 操作标签：上传 / 新建 / 查重 / 快捷入口 ---- */
    addFile() { bus.emit('upload:request') },
    addFolder() { bus.emit('upload:request-dir') },
    mkdir() { submitMkdirV3() },
    newSheet() { newSheetFile() },
    newPage() { newPageFile() },
    newMindmap() { newMindmapFile() },
    dupScan() {
      if (window.PrivHub.openRagDup) window.PrivHub.openRagDup()
      else window.PrivHub.toast('查重页面未就绪（AI 工具未加载）', 'error')
    },
    go(view) { if (nav.hasBarView(view)) nav.setActiveView(view, { noToggle: true }) },
    /* ---- 详情标签：标签 / 引用链 / 文件操作（与旧详情面板同源） ---- */
    async loadTags() {
      const t = this.target
      if (!t || t.isDir) { this.tags = []; this.tagLoadedFor = ''; return }
      this.tags = []; this.tagLoadedFor = ''
      try {
        const r = await api('/privhub/api/meta/tags?project=' + encodeURIComponent(t.project) + '&path=' + encodeURIComponent(t.path))
        if (r.ok) { this.tags = r.tags || []; this.tagLoadedFor = t.path }
      } catch { /* 静默 */ }
    },
    async addTag() {
      const t = this.target
      const v = this.tagInput.trim()
      if (!t || t.isDir || !v || this.tagBusy) return
      this.tagBusy = true
      try {
        const r = await api('/privhub/api/meta/tags', { method: 'POST', body: JSON.stringify({ project: t.project, path: t.path, tags: [...this.tags, v] }) })
        if (r.ok) { this.tags = r.tags || []; this.tagInput = ''; window.PrivHub.toast('已添加标签 🏷') }
        else window.PrivHub.toast(r.error || '标签保存失败', 'error')
      } catch { window.PrivHub.toast('标签保存失败', 'error') }
      this.tagBusy = false
    },
    removeTag(tag) {
      const t = this.target
      if (!t || t.isDir || this.tagBusy) return
      this.tagBusy = true
      api('/privhub/api/meta/tags', { method: 'POST', body: JSON.stringify({ project: t.project, path: t.path, tags: this.tags.filter(x => x !== tag) }) })
        .then(r => { if (r.ok) this.tags = r.tags || [] })
        .finally(() => { this.tagBusy = false })
    },
    async loadBacklinks() {
      const t = this.target
      this.backlinks = { incoming: [], outgoing: [] }
      this.blLoadedFor = ''
      if (!t || t.isDir) return
      this.blBusy = true
      try {
        const r = await api('/privhub/api/kg/backlinks?project=' + encodeURIComponent(t.project) + '&path=' + encodeURIComponent(t.path))
        if (r.ok) {
          this.backlinks = { incoming: r.incoming || [], outgoing: r.outgoing || [] }
          this.blLoadedFor = t.path
        }
      } catch { /* 图谱未就绪等情况：静默 */ }
      this.blBusy = false
    },
    async openLink(it) {
      if (!it || !it.path) return
      const dir = it.path.includes('/') ? it.path.slice(0, it.path.lastIndexOf('/')) : ''
      try { await nav.openDir(it.project, dir) } catch { /* 失败时仍尝试定位已加载的条目 */ }
      const e = nav.entries.find((x) => x.name === it.name && !x.isDir)
      if (e) { nav.selectEntry(e); bus.emit('entry:open', { entry: e, project: it.project, path: dir }) }
      else window.PrivHub.toast('未在当前目录找到 ' + it.name, 'error')
    },
    copyPath() {
      const t = this.target
      if (!t) return
      const text = t.project + '/' + t.path
      try { navigator.clipboard.writeText(text); window.PrivHub.toast('已复制：' + text) } catch { window.PrivHub.toast('复制失败：' + text, 'warn') }
    },
    async download() {
      const t = this.target
      if (!t || t.isDir) return
      try {
        const r = await fetch(downloadUrl(t.project, t.path), { headers: { authorization: 'Bearer ' + AUTH.token } })
        if (!r.ok) { window.PrivHub.toast('下载失败（HTTP ' + r.status + '）', 'error'); return }
        const blob = await r.blob()
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob); a.download = t.name
        document.body.appendChild(a); a.click(); a.remove()
        setTimeout(() => URL.revokeObjectURL(a.href), 5000)
      } catch { window.PrivHub.toast('下载失败', 'error') }
    },
    edit() {
      const t = this.target
      if (!t || t.isDir || !this.isEdit) return
      const dir = t.path.includes('/') ? t.path.slice(0, t.path.lastIndexOf('/')) : ''
      if (this.isOffice) {
        if (/\.doc$/i.test(t.name)) {
          void convertDocToDocx({ entry: { name: t.name, isDir: false }, project: t.project, dirPath: dir })
          return
        }
        bus.emit('office:edit', { entry: { name: t.name, isDir: false }, project: t.project, path: t.path })
        return
      }
      const tab = store.tabs.find(x => x.project === t.project && x.path === t.path)
      if (!tab) openTab({ name: t.name, isDir: false, sizeText: t.sizeText, type: t.type, id: t.id }, t.project, dir)
      else activateTab(tab.key)
      bus.emit('entry:open', { entry: { name: t.name, isDir: false }, project: t.project, path: dir })
    },
    perm() { const t = this.target; if (t) void openPermFor({ name: t.name, isDir: t.isDir, sizeText: t.sizeText, type: t.type, mtime: t.mtime }, t.project, t.path.includes('/') ? t.path.slice(0, t.path.lastIndexOf('/')) : '') },
    fav() {
      const t = this.target
      if (!t || t.isDir) return
      bus.emit('fav:add', { project: t.project, path: t.path, name: t.name, isDir: false })
      window.PrivHub.toast('已加入收藏 ⭐')
    },
    comments() { const t = this.target; if (t && !t.isDir) bus.emit('file:comments', { project: t.project, path: t.path, name: t.name }) },
    genpage() { const t = this.target; if (t && !t.isDir) bus.emit('md:genpage', { project: t.project, path: t.path }) },
    publish() { const t = this.target; if (t && !t.isDir) bus.emit('html:publish', { project: t.project, path: t.path, name: t.name }) },
    versions() { const t = this.target; if (t && !t.isDir) bus.emit('file:versions', { project: t.project, path: t.path, name: t.name }) },
  },
  template: `
    <aside v-if="store.sideOpen" class="v3-side" :class="{ dragging: dragging }" :style="{ width: store.sideWidth + 'px' }" aria-label="文件操作与详情">
      <div class="v3-side-grip" title="拖动调整宽度" @mousedown="startDrag"></div>
      <div class="v3-side-head">
        <div class="v3-side-tabs" role="tablist">
          <button class="v3-side-tab" :class="{ on: store.sideTab === 'actions' }" role="tab" :aria-selected="store.sideTab === 'actions' ? 'true' : 'false'" @click="setTab('actions')">⚡ 操作</button>
          <button class="v3-side-tab" :class="{ on: store.sideTab === 'detail' }" role="tab" :aria-selected="store.sideTab === 'detail' ? 'true' : 'false'" @click="setTab('detail')">ℹ️ 详情</button>
        </div>
        <button class="v3-side-close" title="收起边栏" @click="close">✕</button>
      </div>

      <!-- ⚡ 操作：最常用放最前（上传 / 新建 / 查重），收藏 / 回收站次之。搜索在外部，不重复。 -->
      <div v-if="store.sideTab === 'actions'" class="v3-side-body">
        <div class="v3-side-target" :title="'动作作用于：' + hereFull">
          <span class="v3-side-target-ico">📂</span>
          <span class="v3-side-target-name">{{ here }}</span>
          <span class="v3-side-target-sub">动作将作用于当前目录</span>
        </div>
        <div class="v3-side-sec">添加</div>
        <button class="v3-act primary" title="上传文件到当前目录（也可拖拽到页面任意处）" @click="addFile"><span class="v3-act-ico">⬆</span><span class="v3-act-t">上传文件</span></button>
        <button class="v3-act primary" title="整个文件夹上传到当前目录（保留子目录结构）" @click="addFolder"><span class="v3-act-ico">🗂</span><span class="v3-act-t">上传文件夹</span></button>
        <button class="v3-act" title="在当前目录下新建子文件夹" @click="mkdir"><span class="v3-act-ico">📁</span><span class="v3-act-t">新建文件夹</span></button>
        <div class="v3-side-sec">新建文档</div>
        <button class="v3-act" title="新建 Excel 表格（.xlsx）" @click="newSheet"><span class="v3-act-ico">📊</span><span class="v3-act-t">Excel 表格</span></button>
        <button class="v3-act" title="新建 HTML 页面（.html）" @click="newPage"><span class="v3-act-ico">🌐</span><span class="v3-act-t">HTML 页面</span></button>
        <button class="v3-act" title="新建思维导图（.mindmap 大纲）" @click="newMindmap"><span class="v3-act-ico">🧠</span><span class="v3-act-t">思维导图</span></button>
        <div class="v3-side-sec">整理</div>
        <button class="v3-act" :disabled="!hasRag" :title="hasRag ? '打开本项目查重（内容级，可一键清理重复）' : 'AI 工具未启用'" @click="dupScan"><span class="v3-act-ico">🔁</span><span class="v3-act-t">项目查重</span></button>
        <div class="v3-side-links">
          <button v-if="hasFav" class="v3-act-link" title="我的收藏" @click="go('favorites')">⭐ 收藏</button>
          <button v-if="hasTrash" class="v3-act-link" title="回收站" @click="go('trash')">🗑 回收站</button>
        </div>
        <div class="v3-side-tip">💡 文件可直接拖拽到页面上传；右键 / ⋯ 可对单个条目操作。</div>
      </div>

      <!-- ℹ️ 详情：选中项的信息 / 标签 / 引用链 / 文件操作 -->
      <div v-else class="v3-side-body">
        <template v-if="target">
          <div class="v3-side-filehead">
            <span>{{ fileIcon(target.type, target.isDir) }}</span>
            <span class="v3-side-filename" :title="target.project + ' / ' + target.path">{{ target.name }}</span>
          </div>
          <div class="v3-detail-kv"><span class="k">类型</span><span class="v">{{ target.type || (target.isDir ? '文件夹' : '文件') }}</span></div>
          <div class="v3-detail-kv" v-if="!target.isDir"><span class="k">大小</span><span class="v">{{ target.sizeText || '—' }}</span></div>
          <div class="v3-detail-kv" v-if="!target.isDir"><span class="k">修改时间</span><span class="v">{{ target.mtime ? target.mtime.replace('T',' ').slice(0,16) : '—' }}</span></div>
          <div class="v3-detail-kv"><span class="k">所属项目</span><span class="v">{{ target.project }}</span></div>
          <div class="v3-detail-kv"><span class="k">完整路径</span><span class="v">{{ target.project + ' / ' + target.path }}</span></div>

          <template v-if="isFile">
            <div class="v3-side-sec">标签</div>
            <div class="v3-detail-tags">
              <span v-if="tagLoadedFor !== target.path" style="color:var(--muted);font-size:12px">加载中…</span>
              <template v-else>
                <span v-for="tg in tags" :key="tg" class="v3-detail-tag" :title="'移除标签 ' + tg" style="cursor:pointer" @click="removeTag(tg)">{{ tg }} ✕</span>
                <span v-if="!tags.length" style="color:var(--muted);font-size:12px">暂无标签</span>
              </template>
              <input v-model="tagInput" placeholder="输入标签后回车添加" @keyup.enter="addTag" :disabled="tagBusy" />
            </div>

            <div class="v3-side-sec" v-if="isMd || backlinks.incoming.length || backlinks.outgoing.length">引用链</div>
            <div class="v3-detail-tags" v-if="isMd || backlinks.incoming.length || backlinks.outgoing.length">
              <div style="font-size:12px;color:var(--muted);margin:2px 0 6px">🔗 双向链接（md 里写 [[文件名]] 即建立引用）</div>
              <span v-if="blBusy" style="color:var(--muted);font-size:12px">加载中…</span>
              <template v-else-if="blLoadedFor === target.path">
                <div style="font-size:12px;margin-top:4px">📥 谁引用了本文<span style="color:var(--muted)">（{{ backlinks.incoming.length }}）</span></div>
                <div v-for="it in backlinks.incoming" :key="'in-' + it.id" class="v3-bl-item" :title="it.project + '/' + it.path + (it.anchor ? ' · 行 ' + it.anchor : '')" @click="openLink(it)">
                  <div class="v3-bl-name">📄 {{ it.name }}<span style="color:var(--muted);font-weight:400"> · {{ it.project }}</span></div>
                  <div class="v3-bl-snippet" v-if="it.snippet">{{ it.snippet }}</div>
                </div>
                <div v-if="!backlinks.incoming.length" style="color:var(--muted);font-size:12px">暂无（还没有文档引用本文）</div>
                <div style="font-size:12px;margin-top:10px">📤 本文引用了谁<span style="color:var(--muted)">（{{ backlinks.outgoing.length }}）</span></div>
                <div v-for="it in backlinks.outgoing" :key="'out-' + it.id" class="v3-bl-item" :title="it.project + '/' + it.path" @click="openLink(it)">
                  <div class="v3-bl-name">📄 {{ it.name }}<span style="color:var(--muted);font-weight:400"> · {{ it.project }}</span></div>
                </div>
                <div v-if="!backlinks.outgoing.length" style="color:var(--muted);font-size:12px">暂无（在正文里写 [[文件名]] 建立引用）</div>
              </template>
            </div>
          </template>

          <div class="v3-side-sec">{{ isFile ? '文件操作' : '目录操作' }}</div>
          <div class="v3-detail-actions">
            <template v-if="isFile">
              <div class="v3-detail-act" title="收藏到星标列表" @click="fav"><span class="v3-detail-act-ico">⭐</span>收藏</div>
              <div class="v3-detail-act" title="下载文件" @click="download"><span class="v3-detail-act-ico">⬇️</span>下载</div>
              <div class="v3-detail-act" :title="isEdit ? '在编辑器中打开' : '仅支持 md / Office / 文本文件'" :class="{ dev: !isEdit }" @click="isEdit ? edit() : null"><span class="v3-detail-act-ico">✏️</span>编辑</div>
              <div class="v3-detail-act" :title="isMd ? '选中正文添加评论 / 查看评论线程' : '仅支持 md 文档'" :class="{ dev: !isMd }" @click="isMd ? comments() : null"><span class="v3-detail-act-ico">💬</span>批注评论</div>
              <div class="v3-detail-act" :title="isMd ? '一键生成 HTML 展示页' : '仅支持 md 文档'" :class="{ dev: !isMd }" @click="isMd ? genpage() : null"><span class="v3-detail-act-ico">🌐</span>生成页面</div>
              <div class="v3-detail-act" :title="isHtml ? '发布为内网只读链接' : '仅支持 HTML 页面'" :class="{ dev: !isHtml }" @click="isHtml ? publish() : null"><span class="v3-detail-act-ico">🔗</span>发布链接</div>
              <div class="v3-detail-act" :title="isText ? '创建/查看版本快照（最近 20 版）' : '仅支持文本类文件'" :class="{ dev: !isText }" @click="isText ? versions() : null"><span class="v3-detail-act-ico">🕘</span>版本历史</div>
            </template>
            <div class="v3-detail-act" title="复制完整路径" @click="copyPath"><span class="v3-detail-act-ico">📋</span>复制路径</div>
            <div class="v3-detail-act" title="查看/管理权限规则" @click="perm"><span class="v3-detail-act-ico">🔐</span>权限</div>
          </div>
        </template>
        <div v-else class="v3-loading">未选择文件</div>
      </div>
    </aside>
  `,
}

export { SidePanel }