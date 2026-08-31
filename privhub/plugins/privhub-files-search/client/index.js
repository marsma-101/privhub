/**
 * privhub-files-search · client — 搜索视图（search-view slot）+ 项目内查重
 *
 * 两个页签：
 *   🔍 搜索：文件名模式（/api/search）+ 全文模式（/api/fulltext/search）
 *   🔁 查重：/api/duplicates 递归扫描当前项目（文件名+大小均相同判重），
 *            每组单选保留（默认第一个），勾选其余移入回收站；删除后自动重扫
 *
 * @module privhub-files-search/client
 */

const { api, nav, fileIcon } = window.PrivHub

/* ============ 查重面板样式（本插件注入） ============ */
const styleEl = document.createElement('style')
styleEl.textContent = `
.dup-head { display:flex; align-items:center; gap:10px; margin-bottom:14px; padding-bottom:12px; border-bottom:1px solid var(--line); }
.dup-title { font-size:14px; font-weight:600; display:flex; align-items:center; gap:8px; }
.dup-title .dup-path { font-weight:400; font-size:11.5px; color:var(--muted); }
.dup-sum { font-size:12px; color:var(--muted); }
.dup-group { border:1px solid var(--line); border-radius:8px; margin-bottom:12px; background:var(--panel); overflow:hidden; }
.dup-group-head { display:flex; align-items:center; gap:10px; padding:8px 12px; background:var(--panel2); border-bottom:1px solid var(--line); font-size:12.5px; font-weight:600; }
.dup-group-head .dup-count { color:var(--warn); font-weight:400; }
.dup-file { display:flex; align-items:center; gap:10px; padding:7px 12px; font-size:12.5px; border-bottom:1px solid var(--line); }
.dup-file:last-child { border-bottom:none; }
.dup-file:hover { background:var(--panel2); }
.dup-file .dup-path { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--muted); }
.dup-file .dup-keep { display:flex; align-items:center; gap:4px; color:var(--accent); font-size:12px; cursor:pointer; flex-shrink:0; }
.dup-file .dup-del { display:flex; align-items:center; gap:4px; color:var(--danger); font-size:12px; cursor:pointer; flex-shrink:0; }
.dup-file.keep { background:rgba(90,130,200,.07); }
.dup-file.todel { opacity:.55; }
.dup-foot { display:flex; align-items:center; gap:10px; margin-top:14px; }
`
document.head.appendChild(styleEl)

/* ============ 查重面板（页签 2） ============ */
const DupPanel = {
  name: 'dup-panel',
  data() {
    return {
      nav,
      loading: false,
      error: '',
      project: '',
      groups: [],
      keep: {}, // groupIdx -> fileIdx（每组保留一个）
      del: {},  // groupIdx -> { fileIdx: true }（标记删除）
    }
  },
  computed: {
    delCount() {
      return Object.values(this.del).reduce((s, m) => s + Object.keys(m).length, 0)
    },
    totalCount() {
      return this.groups.reduce((s, g) => s + g.count, 0)
    },
  },
  watch: {
    'nav.project'() { this.load() },
  },
  mounted() { this.load() },
  methods: {
    async load() {
      const project = nav.project
      if (!project) { this.groups = []; this.error = ''; this.loading = false; this.project = ''; return }
      this.loading = true
      this.error = ''
      this.project = project
      this.groups = []
      this.keep = {}
      this.del = {}
      try {
        const r = await api('/privhub/api/duplicates?project=' + encodeURIComponent(project))
        if (r.ok) {
          this.groups = r.groups || []
          const keep = {}
          for (let g = 0; g < this.groups.length; g++) keep[g] = 0 // 每组默认保留第一个
          this.keep = keep
        } else this.error = r.error || '查重失败'
      } catch { this.error = '查重失败（网络错误）' }
      this.loading = false
    },
    keepFile(g, idx) {
      this.keep[g] = idx
      // 保留的文件不能标记删除
      const del = this.del[g]
      if (del && del[idx]) { delete del[idx]; if (!Object.keys(del).length) delete this.del[g] }
    },
    toggleDel(g, idx) {
      if (!this.del[g]) this.del[g] = {}
      if (this.del[g][idx]) {
        delete this.del[g][idx]
        if (!Object.keys(this.del[g]).length) delete this.del[g]
      } else {
        this.del[g][idx] = true
        // 若删的是当前保留项 → 保留自动切到组内第一个未删的
        if (this.keep[g] === idx) {
          const files = this.groups[g].files
          for (let i = 0; i < files.length; i++) {
            if (i !== idx && !this.del[g][i]) { this.keep[g] = i; break }
          }
        }
      }
    },
    isDel(g, idx) { const d = this.del[g]; return !!(d && d[idx]) },
    async doDelete() {
      if (this.delCount === 0) return
      if (!confirm('将勾选的 ' + this.delCount + ' 个重复文件移入回收站？')) return
      let okCount = 0
      for (let g = 0; g < this.groups.length; g++) {
        const del = this.del[g]
        if (!del) continue
        for (const idxStr of Object.keys(del)) {
          const file = this.groups[g].files[Number(idxStr)]
          if (!file) continue
          try {
            const r = await api('/privhub/api/delete', { method: 'POST', body: JSON.stringify({ project: this.project, path: file.path }) })
            if (r.ok) okCount++
          } catch { /* 单条失败继续 */ }
        }
      }
      window.PrivHub.toast('已将 ' + okCount + '/' + this.delCount + ' 个重复文件移入回收站')
      window.PrivHub.bus && window.PrivHub.bus.emit('trash:changed', {})
      await this.load() // 删除后自动重扫
    },
  },
  template: `
    <div style="display:contents">
      <div v-if="!nav.project" class="empty">
        <div style="font-size:15px;margin-bottom:6px">请先选择一个项目</div>
        <div>查重仅针对当前项目。返回文件视图，在左侧选择项目后再查重。</div>
        <button class="btn btn-primary" style="width:auto;margin-top:14px" @click="nav.backToWelcome">去选择项目 →</button>
      </div>
      <template v-else>
        <div class="dup-head">
          <span class="dup-title">🔁 重复文件查重 <span class="dup-path">{{ project }}</span></span>
          <span class="spacer"></span>
          <span v-if="!loading && !error" class="dup-sum">{{ groups.length }} 组重复 · 共 {{ totalCount }} 个文件</span>
          <button class="icon-btn" @click="load">🔄 重新扫描</button>
        </div>
        <div v-if="loading" class="empty">正在扫描项目…</div>
        <div v-else-if="error" class="empty">{{ error }}</div>
        <div v-else-if="groups.length === 0" class="empty">✅ 当前项目未发现重复文件（文件名 + 大小均相同才算重复）</div>
        <template v-else>
          <div v-for="(g, gi) in groups" :key="gi" class="dup-group">
            <div class="dup-group-head">
              <span>📄 {{ g.name }}</span>
              <span class="dup-count">（{{ g.sizeText }} × {{ g.count }} 份）</span>
            </div>
            <div
              v-for="(f, fi) in g.files" :key="f.path"
              class="dup-file"
              :class="{ keep: keep[gi] === fi, todel: isDel(gi, fi) }"
            >
              <label class="dup-keep" :title="'保留此文件'">
                <input type="radio" :name="'dup-keep-' + gi" :checked="keep[gi] === fi" @click="keepFile(gi, fi)" />
                保留
              </label>
              <label class="dup-del" :title="'勾选后移入回收站'">
                <input type="checkbox" :checked="isDel(gi, fi)" @click="toggleDel(gi, fi)" />
                删除
              </label>
              <span class="dup-path">{{ f.path }}</span>
              <span style="color:var(--muted);flex-shrink:0;font-size:11.5px">{{ f.mtime }}</span>
            </div>
          </div>
          <div class="dup-foot">
            <button class="icon-btn" style="color:var(--danger)" :disabled="delCount === 0" @click="doDelete">🗑 删除勾选的 {{ delCount }} 个重复文件（移入回收站）</button>
            <span class="dup-sum">每组必须保留 1 个（默认第一个）；删除后可从回收站找回</span>
          </div>
        </template>
      </template>
    </div>
  `,
}

function hl(snippet, q) {
  if (!snippet) return ''
  const terms = (q || '').trim().toLowerCase()
  if (!terms) return snippet
  const i = snippet.toLowerCase().indexOf(terms)
  if (i < 0) return snippet
  return snippet.slice(0, i) + '<mark style="background:rgba(230,180,60,.35);border-radius:3px;padding:0 2px">' + snippet.slice(i, i + terms.length) + '</mark>' + snippet.slice(i + terms.length)
}

const SearchView = {
  name: 'search-view',
  data() {
    return {
      nav,
      q: '',
      mode: 'filename', // filename | fulltext
      tab: 'search',    // search | dup
      loading: false,
      hits: [],
      searched: false,
      noProject: false,
    }
  },
  watch: {
    // 输入即搜索（B8：输入即筛选）；500ms 防抖避免每键一次请求
    q() {
      clearTimeout(this._deb)
      this._deb = setTimeout(() => { this.doSearch() }, 500)
    },
  },
  methods: {
    hl,
    switchTab(t) {
      if (this.tab === t) return
      this.tab = t
    },
    async doSearch() {
      const keyword = this.q.trim()
      if (!keyword) { this.hits = []; this.searched = false; return }
      // 项目上下文：搜索限定当前项目（未选项目时提示先选择，不做全局查询）
      if (!nav.project) {
        this.hits = []; this.searched = true; this.noProject = true
        return
      }
      this.noProject = false
      this.loading = true
      try {
        if (this.mode === 'filename') {
          const r = await api('/privhub/api/search?q=' + encodeURIComponent(keyword) + '&project=' + encodeURIComponent(nav.project))
          this.hits = r.ok ? r.hits : []
        } else {
          const r = await api('/privhub/api/fulltext/search?q=' + encodeURIComponent(keyword) + '&project=' + encodeURIComponent(nav.project))
          this.hits = r.ok ? r.hits : []
        }
      } catch { this.hits = [] }
      this.loading = false
      this.searched = true
    },
    switchMode(m) {
      if (this.mode === m) return
      this.mode = m
      this.hits = []
      this.searched = false
      if (this.q.trim()) this.doSearch()
    },
    async go(hit) {
      if (hit.isDir) {
        await nav.openDir(hit.project, hit.path)
      } else {
        // 文件：跳到所在目录并选中
        const dir = hit.path.includes('/') ? hit.path.slice(0, hit.path.lastIndexOf('/')) : ''
        await nav.openDir(hit.project, dir)
        const e = nav.entries.find(x => x.name === hit.name)
        if (e) nav.selectEntry(e)
      }
    },
  },
  template: `
    <div style="display:contents">
      <div class="main-head">
        <span class="breadcrumb"><span style="color:var(--text)">{{ tab === 'search' ? '🔍 搜索' : '🔁 查重' }}</span></span>
        <span class="crumb" style="margin-left:8px">{{ nav.project ? '当前项目：' + nav.project : '未选择项目' }}</span>
        <span class="spacer"></span>
        <template v-if="tab === 'search'">
          <input
            v-model="q"
            @keyup.enter="doSearch"
            :placeholder="mode === 'filename' ? '输入文件名回车搜索…' : '输入内容关键字搜索（支持中文）…'"
            style="padding:7px 12px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text);font-size:13px;width:240px;outline:none"
          />
          <button class="small-btn" :class="{ on: mode === 'filename' }" style="margin-left:8px" @click="switchMode('filename')">📄 文件名</button>
          <button class="small-btn" :class="{ on: mode === 'fulltext' }" @click="switchMode('fulltext')">🔎 全文</button>
          <button class="icon-btn" :class="{ on: loading }" @click="doSearch">搜索</button>
          <button class="icon-btn" style="margin-left:4px" @click="switchTab('dup')">🔁 查重</button>
        </template>
        <template v-else>
          <button class="icon-btn" @click="switchTab('search')">🔍 搜索</button>
        </template>
      </div>
      <div class="main-body">
        <dup-panel v-if="tab === 'dup'"></dup-panel>
        <template v-else>
          <div v-if="noProject" class="empty">
            <div style="font-size:15px;margin-bottom:6px">请先选择一个项目</div>
            <div>搜索仅限定在当前项目内。返回文件视图，在左侧选择项目后再搜索。</div>
            <button class="btn btn-primary" style="width:auto;margin-top:14px" @click="nav.backToWelcome">去选择项目 →</button>
          </div>
          <div v-else-if="loading" class="empty">搜索中…</div>
          <div v-else-if="q && !searched" class="empty">回车开始搜索</div>
          <div v-else-if="searched && hits.length === 0" class="empty">没有匹配「{{ q }}」的内容</div>
          <div v-else class="file-table-wrap">
            <div class="file-table-head" style="grid-template-columns:1fr 200px 90px">
              <span class="col-name">{{ mode === 'filename' ? '名称' : '命中内容' }}</span>
              <span class="col-size">路径</span>
              <span class="col-time">操作</span>
            </div>
            <div v-for="h in hits" :key="h.project + '/' + h.path" class="file-table-row" style="grid-template-columns:1fr 200px 90px">
              <span class="col-name" style="white-space:normal">
                <template v-if="mode === 'filename'"><span class="tico">{{ h.isDir ? '📁' : fileIcon('') }}</span>{{ h.name }}</template>
                <template v-else>
                  <span class="tico">📄</span><span style="font-weight:600">{{ h.name }}</span>
                  <div style="font-size:12px;color:var(--muted);margin-top:2px" v-html="hl(h.snippet, q)"></div>
                </template>
              </span>
              <span class="col-size">{{ h.project }} / {{ h.path }}</span>
              <span><button class="small-btn" @click="go(h)">{{ h.isDir ? '进入' : '定位' }}</button></span>
            </div>
          </div>
        </template>
      </div>
    </div>
  `,
}

SearchView.components = { 'dup-panel': DupPanel }

export default {
  id: 'privhub-files-search',
  slots: {
    'search-view': SearchView,
  },
}
