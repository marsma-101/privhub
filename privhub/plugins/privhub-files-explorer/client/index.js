/**
 * privhub-files-explorer · client — 目录树（tree slot）+ 文件面板（panel slot）
 *
 * 消费骨架桥（window.PrivHub）：
 *   - nav：导航状态机（project/path/entries/selected/…与骨架共享）
 *   - bus：事件总线（emit file:opened / file:trash）
 *   - api：统一 fetch
 * 长按 1.5s 弹操作菜单（详情/重命名/新建子文件夹/删除）。
 *
 * @module privhub-files-explorer/client
 */

const { api, nav, bus, fileIcon, previewImageUrl, previewPdfUrl, sortedEntries } = window.PrivHub

/* ============ 递归目录树节点 ============ */
const TreeNode = {
  name: 'tree-node',
  props: {
    label: String, project: String, path: String, depth: Number, active: Boolean,
  },
  computed: {
    expanded() { return nav.isExpanded(this.project, this.path) },
    children() { return nav.childrenOf(this.project, this.path) },
    isActivePath() { return nav.project === this.project && nav.path === this.path },
    isAdminRoot() {
      const u = window.PrivHub.AUTH.user
      return u && u.role === 'admin' && this.path === '' && this.depth === 0
    },
  },
  methods: {
    onToggle() { nav.toggleTree(this.project, this.path) },
    onOpen() { nav.openDir(this.project, this.path) },
    onDel() { nav.delProject(this.project) },
  },
  template: `
    <div>
      <div class="tree-item" :class="{ active: active }" :style="{ paddingLeft: (10 + depth * 16) + 'px' }">
        <span class="tree-arrow" @click.stop="onToggle" style="cursor:pointer;width:14px;display:inline-block">
          {{ expanded ? '▾' : '▸' }}
        </span>
        <span @click="onOpen" style="flex:1;display:flex;align-items:center;gap:6px;cursor:pointer">
          <span>{{ expanded ? '📂' : '📁' }}</span><span class="name">{{ label }}</span>
        </span>
        <button v-if="isAdminRoot" class="small-btn danger" @click.stop="onDel" title="删除项目">🗑</button>
      </div>
      <tree-node
        v-for="c in (expanded ? children : [])"
        :key="c.path"
        :label="c.name"
        :project="project"
        :path="c.path"
        :depth="depth + 1"
        :active="isActivePath"
      ></tree-node>
    </div>
  `,
}

/* 树视图（tree slot） */
const TreeView = {
  name: 'files-tree',
  data() { return { nav } },
  computed: {
    isAdmin() { return window.PrivHub.AUTH.user && window.PrivHub.AUTH.user.role === 'admin' },
  },
  template: `
    <div class="sidebar">
      <div class="side-head">
        <span class="side-title">📂 {{ nav.project }} · 目录</span>
      </div>
      <div class="tree-item" :class="{ active: nav.path === '' }" @click="nav.openDir(nav.project, '')">
        <span>🏠</span><span class="name">项目根目录</span>
      </div>
      <div v-for="c in nav.childrenOf(nav.project, '')" :key="c.path">
        <tree-node
          :label="c.name"
          :project="nav.project"
          :path="c.path"
          :depth="0"
          :active="nav.path === c.path"
        ></tree-node>
      </div>
    </div>
  `,
}

/* 文件面板（panel slot） */
const FilePanel = {
  name: 'files-panel',
  data() {
    return {
      nav,
      ctxMenu: null,
      pressTimer: null,
    }
  },
  computed: {
    entries() { return sortedEntries() },
    crumbs() {
      const parts = this.nav.path ? this.nav.path.split('/').filter(Boolean) : []
      const arr = [{ label: this.nav.project, path: '' }]
      let acc = ''
      for (const p of parts) { acc = acc ? acc + '/' + p : p; arr.push({ label: p, path: acc }) }
      return arr
    },
  },
  methods: {
    /* 长按 1.5 秒弹菜单 */
    startPress(e, el) {
      this.pressTimer = setTimeout(() => {
        const rect = el.getBoundingClientRect()
        this.ctxMenu = {
          x: Math.min(rect.left + 20, window.innerWidth - 170),
          y: Math.min(rect.top + 20, window.innerHeight - 150),
          entry: e,
        }
      }, 1500)
    },
    cancelPress() { if (this.pressTimer) { clearTimeout(this.pressTimer); this.pressTimer = null } },
    closeMenu() { this.ctxMenu = null },
    openDetail() { this.detailTarget = this.ctxMenu ? this.ctxMenu.entry : null; this.ctxMenu = null },
    doRename() {
      const e = this.ctxMenu ? this.ctxMenu.entry : null
      this.ctxMenu = null
      if (e) nav.doRename(e)
    },
    doDelete() {
      const e = this.ctxMenu ? this.ctxMenu.entry : null
      this.ctxMenu = null
      if (e) nav.doDelete(e)
    },
    doFavorite() {
      const e = this.ctxMenu ? this.ctxMenu.entry : null
      this.ctxMenu = null
      if (!e) return
      // 走事件总线：F02 收藏插件监听 fav:add 后调 API（本插件不依赖 F02）
      bus.emit('fav:add', {
        project: nav.project,
        path: nav.relPathOf(e.name),
        name: e.name,
        isDir: e.isDir,
      })
      alert('已加入收藏 ⭐')
    },
    /* 下载单个文件（fetch blob + a 标签，带 token 鉴权） */
    async doDownload(entry) {
      const rel = nav.relPathOf(entry.name)
      try {
        const r = await fetch('/privhub/api/download?project=' + encodeURIComponent(nav.project) + '&path=' + encodeURIComponent(rel), {
          headers: { authorization: 'Bearer ' + window.PrivHub.AUTH.token },
        })
        if (!r.ok) { alert('下载失败（HTTP ' + r.status + '）'); return }
        const blob = await r.blob()
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = entry.name
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(a.href), 5000)
      } catch { alert('下载失败') }
    },
    /* 批量下载所选（逐个触发，浏览器按队列处理） */
    async batchDownload() {
      const names = Object.keys(nav.checked).filter(n => nav.checked[n])
      const files = names.map(n => nav.entries.find(e => e.name === n)).filter(e => e && !e.isDir)
      if (files.length === 0) { alert('所选项目中无文件可下载'); return }
      for (const e of files) await this.doDownload(e)
    },
    /* 批量移动所选（目标目录必须已存在；同卷 rename） */
    async batchMove() {
      const names = Object.keys(nav.checked).filter(n => nav.checked[n])
      if (!names.length) return
      const toDir = prompt('移动到哪个目录？（相对当前项目根，留空 = 项目根）')
      if (toDir === null) return
      const dir = toDir.trim()
      let okCount = 0
      for (const n of names) {
        const rel = nav.relPathOf(n)
        try {
          const r = await api('/privhub/api/move', { method: 'POST', body: JSON.stringify({ project: nav.project, from: rel, toDir: dir }) })
          if (r.ok) okCount++
          else { alert('移动「' + n + '」失败：' + (r.error || '未知错误')); break }
        } catch { alert('移动「' + n + '」失败'); break }
      }
      nav.checked = {}
      if (okCount > 0) {
        alert('已移动 ' + okCount + '/' + names.length + ' 项')
        await nav.openDir(nav.project, nav.path)
      }
    },
    async doMkdirHere() {
      const e = this.ctxMenu ? this.ctxMenu.entry : null
      this.ctxMenu = null
      if (!e) return
      // 在长按的文件夹内新建子文件夹：临时切到该目录创建
      const rel = nav.relPathOf(e.name)
      const name = prompt('在「' + e.name + '」中新建文件夹名称：')
      if (!name) return
      const r = await api('/privhub/api/mkdir', { method: 'POST', body: JSON.stringify({ project: nav.project, path: rel, name }) })
      if (r.ok) { nav.refreshTree(); nav.openDir(nav.project, rel) }
      else alert(r.error || '新建失败')
    },
    doSubmitMkdir() { nav.submitMkdir() },
    doAddFile() { nav.addFile() },
    /* ---- F10 批量操作：多选 + 批量删除 ---- */
    isChecked(name) { return nav.checked[name] === true },
    toggleCheck(e, ev) {
      ev.stopPropagation()
      if (nav.checked[e.name]) { delete nav.checked[e.name] }
      else { nav.checked[e.name] = true }
    },
    checkedCount() { return Object.keys(nav.checked).filter(n => nav.checked[n]).length },
    selectAll() {
      const all = this.entries.every(e => nav.checked[e.name])
      if (all) nav.checked = {}
      else { nav.checked = {}; for (const e of this.entries) nav.checked[e.name] = true }
    },
    clearChecked() { nav.checked = {} },
    async batchDelete() {
      const names = Object.keys(nav.checked).filter(n => nav.checked[n])
      if (!names.length) return
      if (!confirm('将选中的 ' + names.length + ' 项移入回收站？')) return
      for (const n of names) {
        const rel = nav.relPathOf(n)
        try { await api('/privhub/api/delete', { method: 'POST', body: JSON.stringify({ project: nav.project, path: rel }) }) } catch { /* 单条失败继续 */ }
      }
      nav.checked = {}
      await nav.openDir(nav.project, nav.path)
      bus.emit('trash:changed', {})
    },
  },
  template: `
    <div style="display:contents">
      <div class="main-head">
        <span class="breadcrumb">
          <span v-for="(c, i) in crumbs" :key="i">
            <a v-if="i < crumbs.length - 1" @click="nav.gotoCrumb(c.path)" style="cursor:pointer">{{ i === 0 ? '📁 ' : '' }}{{ c.label }}</a>
            <span v-else style="color:var(--text)">{{ i === 0 ? '📁 ' : '' }}{{ c.label }}</span>
            <span v-if="i < crumbs.length - 1" class="crumb"> / </span>
          </span>
        </span>
        <span class="crumb" style="margin-left:8px">共 {{ entries.length }} 项</span>
        <span class="spacer"></span>
        <!-- F10 批量工具栏：有选中项时出现 -->
        <template v-if="checkedCount() > 0">
          <button class="icon-btn" @click="selectAll">☑ 全选/取消</button>
          <button class="icon-btn" @click="clearChecked">取消选择</button>
          <button class="icon-btn" @click="batchDownload">⬇ 下载所选</button>
          <button class="icon-btn" @click="batchMove">📦 移动所选</button>
          <button class="icon-btn" style="color:var(--danger)" @click="batchDelete">🗑 删除所选 ({{ checkedCount() }})</button>
        </template>
        <button class="icon-btn" @click="nav.toggleSort('name')">名称{{ nav.sortKey==='name' ? (nav.sortAsc?' ↑':' ↓') : '' }}</button>
        <button class="icon-btn" @click="nav.toggleSort('size')">大小{{ nav.sortKey==='size' ? (nav.sortAsc?' ↑':' ↓') : '' }}</button>
        <button class="icon-btn" @click="nav.toggleSort('mtime')">时间{{ nav.sortKey==='mtime' ? (nav.sortAsc?' ↑':' ↓') : '' }}</button>
        <button class="icon-btn" @click="nav.setViewMode('grid')" :class="{on: nav.viewMode==='grid'}">▦</button>
        <button class="icon-btn" @click="nav.setViewMode('list')" :class="{on: nav.viewMode==='list'}">☰</button>
        <button class="icon-btn" @click="doSubmitMkdir">＋新建文件夹</button>
        <button class="icon-btn" @click="doAddFile">＋添加文件</button>
        <span v-if="nav.uploading" class="crumb">上传中 {{ nav.uploadDone }}/{{ nav.uploadTotal }}…</span>
      </div>
      <div class="main-body">
        <div v-if="nav.listLoading" class="empty">加载中…</div>
        <div v-else-if="entries.length === 0" class="empty">（空目录）</div>
        <!-- 网格视图 -->
        <div v-else-if="nav.viewMode === 'grid'" class="file-list">
          <div
            v-for="e in entries" :key="e.name"
            class="file-card" :class="{ sel: nav.selected && nav.selected.name === e.name }"
            @click="nav.selectEntry(e)"
            @dblclick="nav.openEntry(e)"
            @mousedown="startPress(e, $event.currentTarget)"
            @mouseup="cancelPress"
            @mouseleave="cancelPress"
            @contextmenu.prevent
          >
            <input type="checkbox" :checked="isChecked(e.name)" @click="toggleCheck(e, $event)" style="position:absolute;left:8px;top:8px;cursor:pointer" />
            <div class="file-ico">{{ e.isDir ? '📁' : fileIcon(e.type) }}</div>
            <div class="file-name">{{ e.name }}</div>
            <div class="file-meta">{{ e.isDir ? e.type : (e.sizeText + ' · ' + e.type) }}</div>
          </div>
        </div>
        <!-- 列表视图 -->
        <div v-else class="file-table-wrap">
          <div class="file-table-head" style="grid-template-columns:28px 1fr 90px 120px 110px">
            <span><input type="checkbox" @click="selectAll" /></span>
            <span class="col-name">名称</span>
            <span class="col-size">大小</span>
            <span class="col-type">类型</span>
            <span class="col-time">修改时间</span>
          </div>
          <div
            v-for="e in entries" :key="e.name"
            class="file-table-row" :class="{ sel: nav.selected && nav.selected.name === e.name }"
            style="grid-template-columns:28px 1fr 90px 120px 110px"
            @click="nav.selectEntry(e)"
            @dblclick="nav.openEntry(e)"
            @mousedown="startPress(e, $event.currentTarget)"
            @mouseup="cancelPress"
            @mouseleave="cancelPress"
            @contextmenu.prevent
          >
            <span><input type="checkbox" :checked="isChecked(e.name)" @click="toggleCheck(e, $event)" style="cursor:pointer" /></span>
            <span class="col-name"><span class="tico">{{ e.isDir ? '📁' : fileIcon(e.type) }}</span>{{ e.name }}</span>
            <span class="col-size">{{ e.sizeText }}</span>
            <span class="col-type">{{ e.type }}</span>
            <span class="col-time">{{ e.mtime || '—' }}</span>
          </div>
        </div>
      </div>

      <!-- 长按菜单遮罩 -->
      <div v-if="ctxMenu" class="ctx-mask" @click="closeMenu"></div>
      <!-- 长按菜单 -->
      <div v-if="ctxMenu" class="ctx-menu" :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }" @click.stop>
        <div class="ctx-item" @click="openDetail">ℹ️ 详情</div>
        <div class="ctx-item" @click="doFavorite">⭐ 收藏</div>
        <div v-if="!ctxMenu.entry.isDir" class="ctx-item" @click="doDownload(ctxMenu.entry)">⬇ 下载</div>
        <div class="ctx-item" @click="doRename">✏️ 重命名</div>
        <div v-if="ctxMenu.entry.isDir" class="ctx-item" @click="doMkdirHere">＋ 新建子文件夹</div>
        <div class="ctx-item danger" @click="doDelete">🗑 删除</div>
      </div>

      <!-- 详情弹窗 -->
      <div v-if="detailTarget" class="modal-mask" @click.self="detailTarget = null">
        <div class="modal" style="width:380px">
          <h2>{{ detailTarget.isDir ? '📁' : '📄' }} {{ detailTarget.name }}</h2>
          <div class="modal-body">
            <div class="kv"><span class="k">名称</span><span>{{ detailTarget.name }}</span></div>
            <div class="kv"><span class="k">类型</span><span>{{ detailTarget.type }}</span></div>
            <div class="kv"><span class="k">大小</span><span>{{ detailTarget.sizeText }}</span></div>
            <div class="kv"><span class="k">修改时间</span><span>{{ detailTarget.mtime || '—' }}</span></div>
            <div class="kv"><span class="k">所属项目</span><span>{{ nav.project }}</span></div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" @click="detailTarget = null">关 闭</button>
          </div>
        </div>
      </div>
    </div>
  `,
}

/* 注册：tree-node 递归组件 */
TreeView.components = { 'tree-node': TreeNode }
FilePanel.components = { 'tree-node': TreeNode }

export default {
  id: 'privhub-files-explorer',
  slots: {
    tree: TreeView,
    panel: FilePanel,
  },
}
