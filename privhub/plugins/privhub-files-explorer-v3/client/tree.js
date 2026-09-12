/**
 * tree — 目录树：缓存读写 + 递归节点组件 + tree slot 组件。
 * @module privhub-files-explorer-v3/client/tree
 */

import { nav, bus, AUTH, fileIcon } from './deps.js'
import { store } from './store.js'
import { openTab } from './tabs.js'
import { loadTree, treeOf, toggleTree } from './treecache.js'
import { openMenuFor, cancelRename, submitRename, submitMkdirV3, newSheetFile, newPageFile } from './ops.js'
import { esc, inline } from './content.js'

/* ================= 递归树节点 ================= */
const TreeNodeV3 = {
  name: 'v3-tree-node',
  props: {
    label: String, project: String, path: String, depth: Number, entry: Object,
  },
  data() { return { store } },
  computed: {
    node() { return treeOf(this.project, this.path) },
    expanded() { const n = this.node; return n ? n.expanded : false },
    children() { const n = this.node; return n ? n.children : [] },
    isActive() { return nav.project === this.project && nav.path === this.path },
  },
  methods: {
    onToggle() { void toggleTree(this.project, this.path) },
    onClick() {
      if (this.entry.isDir) nav.openDir(this.project, this.path)
      else openTab(this.entry, this.project, this.path.includes('/') ? this.path.slice(0, this.path.lastIndexOf('/')) : '')
    },
    onDots(ev) { ev.stopPropagation(); openMenuFor(this.entry, this.path.includes('/') ? this.path.slice(0, this.path.lastIndexOf('/')) : '', ev.clientX, ev.clientY + 6) },
    /* 文件夹双击：展开 / 再双击收起（树形目录惯例） */
    onDblClick() {
      if (this.entry.isDir) void toggleTree(this.project, this.path)
    },
    openFileInDir() {
      // 树里文件点击 = 打开标签（路径即文件完整相对路径）
      openTab(this.entry, this.project, this.path.includes('/') ? this.path.slice(0, this.path.lastIndexOf('/')) : '')
    },
    submitRename() { void submitRename() },
    cancelRename() { cancelRename() },
  },
  template: `
    <div>
      <div class="v3-tn" :class="{ active: isActive }" :style="{ paddingLeft: (8 + depth * 15) + 'px' }">
        <span class="tree-arrow" @click.stop="onToggle" style="cursor:pointer;width:14px;display:inline-block;flex-shrink:0;text-align:center;font-size:10px;color:var(--muted)">
          {{ entry.isDir ? (expanded ? '▾' : '▸') : '·' }}
        </span>
        <template v-if="store.renameState && store.renameState.rel === entry.path">
          <input
            v-model="store.renameState.value"
            @keyup.enter="submitRename"
            @keyup.esc="cancelRename"
            @click.stop
            @mousedown.stop
            style="flex:1;min-width:0;padding:2px 6px;border-radius:4px;border:1px solid var(--accent);background:var(--bg);color:var(--text);font-size:12.5px;outline:none"
          />
        </template>
        <template v-else>
          <span @click="entry.isDir ? onClick() : openFileInDir()" @dblclick.stop="onDblClick" style="flex:1;display:flex;align-items:center;gap:6px;cursor:pointer;min-width:0">
            <span>{{ entry.isDir ? (expanded ? '📂' : '📁') : fileIcon(entry.type) }}</span>
            <span class="v3-name" :title="entry.name">{{ label }}</span>
          </span>
        </template>
        <span class="v3-dots" title="操作" @click.stop="onDots($event)">⋯</span>
      </div>
      <div v-if="entry.isDir && expanded">
        <v3-tree-node
          v-for="c in children" :key="c.path"
          :label="c.name" :project="project" :path="c.path"
          :depth="depth + 1" :entry="c"
        ></v3-tree-node>
      </div>
    </div>
  `,
}

/* ================= 树视图（tree slot） ================= */
const TreeV3 = {
  name: 'files-tree-v3',
  data() { return { nav, store } },
  computed: {
    isAdmin() { return AUTH.user && AUTH.user.role === 'admin' },
    rootChildren() {
      const n = treeOf(nav.project, '')
      return n ? n.children : []
    },
    rootExpanded() {
      const n = treeOf(nav.project, '')
      return n ? n.expanded : false
    },
  },
  methods: {
    onRootToggle() { void toggleTree(nav.project, '') },
    onRootOpen() { nav.openDir(nav.project, '') },
    onNewFolder() { store.newMenu = false; submitMkdirV3() },
    onNewDoc() { store.newMenu = false; nav.setActiveView('template') },
    onNewSheet() { store.newMenu = false; void newSheetFile() },
    onNewPage() { store.newMenu = false; void newPageFile() },
    onNewDataview() { store.newMenu = false; bus.emit('dataview:new') },
    onAddFile() { store.newMenu = false; nav.addFile() },
    onAddFolder() { store.newMenu = false; bus.emit('upload:request-dir') },
    onDelProject() { nav.delProject(nav.project) },
    onRootDots(ev) {
      const entry = { name: nav.project, isDir: true, type: 'folder', sizeText: '', mtime: '' }
      openMenuFor(entry, '', ev.clientX, ev.clientY + 6)
    },
    onCollapseSide() { nav.toggleSidebar() },
  },
  mounted() {
    if (nav.project !== null && !treeOf(nav.project, '')) void loadTree(nav.project, '')
  },
  template: `
    <div class="sidebar">
      <div class="side-head" style="position:relative">
        <button class="icon-btn" style="padding:3px;font-size:16px;font-weight:700;line-height:1" title="新建 / 上传" @click="store.newMenu = !store.newMenu">＋</button>
        <button v-if="isAdmin && nav.path === ''" class="icon-btn" style="padding:3px;font-size:14px;color:var(--danger)" :title="'删除项目：' + nav.project" @click="onDelProject">🗑</button>
        <button class="icon-btn" style="padding:3px 5px;font-size:13px;margin-left:auto;flex-shrink:0" title="收起侧边栏（腾出中间栏空间）" @click="onCollapseSide">⏴</button>
        <!-- + 下拉：新建文档/数据表/页面 / 上传 -->
        <div v-if="store.newMenu" class="ctx-mask" @click="store.newMenu = false"></div>
        <div v-if="store.newMenu" style="position:absolute;top:36px;left:0;z-index:1100;background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:6px 0;box-shadow:0 10px 30px rgba(0,0,0,.25);min-width:180px">
          <div class="ctx-item" @click="onNewDoc">📄 新建文档</div>
          <div class="ctx-item" @click="onNewSheet">📊 新建数据表</div>
          <div class="ctx-item" @click="onNewPage">🌐 新建页面</div>
          <div class="ctx-item" @click="onNewDataview">📈 数据看板页面</div>
          <div style="height:1px;background:var(--line);margin:5px 0"></div>
          <div class="ctx-item" @click="onAddFile">⬆ 上传文件</div>
          <div class="ctx-item" @click="onAddFolder">📁⬆ 上传文件夹</div>
          <div style="height:1px;background:var(--line);margin:5px 0"></div>
          <div class="ctx-item" @click="onNewFolder">📁 新建文件夹</div>
        </div>
      </div>
      <div class="v3-tn" :class="{ active: nav.path === '' }" :style="{ paddingLeft: '8px' }">
        <span class="tree-arrow" style="width:14px;display:inline-block;text-align:center;font-size:10px;color:var(--muted);cursor:pointer;flex-shrink:0" @click.stop="onRootToggle">{{ rootExpanded ? '▾' : '▸' }}</span>
        <span @click="onRootOpen" @dblclick.stop="onRootToggle" style="flex:1;display:flex;align-items:center;gap:6px;cursor:pointer;min-width:0">
          <span>🏠</span><span class="v3-name">{{ nav.project }}</span>
        </span>
        <span class="v3-dots" title="操作" @click.stop="onRootDots($event)">⋯</span>
      </div>
      <div v-if="rootExpanded">
        <v3-tree-node v-for="c in rootChildren" :key="c.path" :label="c.name" :project="nav.project" :path="c.path" :depth="0" :entry="c"></v3-tree-node>
      </div>
    </div>
  `,
}

TreeV3.components = { 'v3-tree-node': TreeNodeV3 }

export { TreeNodeV3, TreeV3 }
