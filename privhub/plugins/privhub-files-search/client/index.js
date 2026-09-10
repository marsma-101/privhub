/**
 * privhub-files-search · client — 搜索视图（search-view slot）
 *
 * 纯搜索：文件名模式（/api/search）+ 全文模式（/api/fulltext/search），限定当前项目。
 * 注：原「🔁 查重」页签已移除——查重功能已合并进 AI 工具（🤖 → 🔁 查重，项目级，
 * 同名同大小 + 内容一字不差），文件页顶栏有直达按钮；服务端 /api/duplicates 由
 * privhub-svc-rag 的 /api/rag/dup 取代（本插件不再调用）。
 *
 * @module privhub-files-search/client
 */

const { api, nav, fileIcon } = window.PrivHub

/* S3 安全修复：片段来自项目内文件原文（用户可控），进入 v-html 前必须转义，
 * 否则上传含 <img onerror=...> 的文本文件 → 任何人全文搜索命中即执行脚本。
 * 做法：先按原文定位关键词（保证高亮位置正确），再对三段分别转义。 */
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

function hl(snippet, q) {
  if (!snippet) return ''
  const raw = String(snippet)
  const terms = (q || '').trim().toLowerCase()
  const i = terms ? raw.toLowerCase().indexOf(terms) : -1
  if (i < 0) return esc(raw)
  return esc(raw.slice(0, i))
    + '<mark style="background:rgba(230,180,60,.35);border-radius:3px;padding:0 2px">'
    + esc(raw.slice(i, i + terms.length)) + '</mark>'
    + esc(raw.slice(i + terms.length))
}

const SearchView = {
  name: 'search-view',
  data() {
    return {
      nav,
      q: '',
      mode: 'filename', // filename | fulltext
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
        <span class="breadcrumb"><span style="color:var(--text)">🔍 搜索</span></span>
        <span class="crumb" style="margin-left:8px">{{ nav.project ? '当前项目：' + nav.project : '未选择项目' }}</span>
        <span class="spacer"></span>
        <input
          v-model="q"
          @keyup.enter="doSearch"
          :placeholder="mode === 'filename' ? '输入文件名回车搜索…' : '输入内容关键字搜索（支持中文）…'"
          style="padding:7px 12px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text);font-size:13px;width:240px;outline:none"
        />
        <button class="small-btn" :class="{ on: mode === 'filename' }" style="margin-left:8px" @click="switchMode('filename')">📄 文件名</button>
        <button class="small-btn" :class="{ on: mode === 'fulltext' }" @click="switchMode('fulltext')">🔎 全文</button>
        <button class="icon-btn" :class="{ on: loading }" @click="doSearch">搜索</button>
      </div>
      <div class="main-body">
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
      </div>
    </div>
  `,
}

export default {
  id: 'privhub-files-search',
  slots: {
    'search-view': SearchView,
  },
}
