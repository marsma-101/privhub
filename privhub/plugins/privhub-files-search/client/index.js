/**
 * privhub-files-search · client — 搜索视图（search-view slot）
 *
 * 输入关键字 → 统一搜索：
 *   - 文件名模式（B8）：/privhub/api/search 递归文件名匹配
 *   - 全文模式（C15/F17）：/privhub/api/fulltext/search BM25 + CJK bigram，
 *     命中展示上下文片段（snippet 高亮），结果全部为文件
 * 结果列表点击：目录直接进入；文件跳转到其所在目录并选中。
 *
 * @module privhub-files-search/client
 */

const { api, nav, fileIcon } = window.PrivHub

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
      loading: false,
      hits: [],
      searched: false,
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
      this.loading = true
      try {
        if (this.mode === 'filename') {
          const r = await api('/privhub/api/search?q=' + encodeURIComponent(keyword))
          this.hits = r.ok ? r.hits : []
        } else {
          const r = await api('/privhub/api/fulltext/search?q=' + encodeURIComponent(keyword))
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
        <span class="crumb" style="margin-left:8px">{{ mode === 'filename' ? '文件名匹配' : '全文匹配（BM25）' }}（全部可见项目）</span>
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
        <div v-if="loading" class="empty">搜索中…</div>
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
