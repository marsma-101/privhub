/**
 * privhub-files-wiki · client — 知识库视图（挂 wiki slot，模态形态，纯前端零后端）
 *
 * 项目内 README.md（缺省 fallback index.md）渲染为 Wiki 页面：
 *   - 数据源：F16 /api/doc 读 .md（复用现有权限与路径安全，零新增存储）
 *   - 渲染：自带轻量 markdown 渲染器（与 F16 同语义：标题/列表/表格/引用/代码/双链）
 *   - 双链 [[名称]] / 相对链接 [名](名.md)：点击定位到同目录文件
 *   - 空态：目录无 README/index → 引导文案 + 「创建 README.md」按钮（走 F16 /api/doc 新建）
 *   - frontmatter 隐藏；面包屑跟随当前目录（目录即站点）
 *
 * @module privhub-files-wiki/client
 */

const { api, nav, AUTH } = window.PrivHub

/* ---------- 轻量 markdown 渲染（与 F16 同语义，解耦复制） ---------- */
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function inline(s) {
  let out = esc(s)
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  out = out.replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, (m, name) => '<a href="javascript:void 0" class="wiki-link" data-name="' + esc(name) + '">🔗 ' + esc(name) + '</a>')
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, target) => {
    if (/^https?:\/\//.test(target)) return '<a href="' + esc(target) + '" target="_blank" rel="noopener">' + esc(label) + '</a>'
    if (/\.md$/i.test(target)) return '<a href="javascript:void 0" class="wiki-link" data-name="' + esc(target.replace(/\.md$/i, '')) + '">' + esc(label) + '</a>'
    return esc(label)
  })
  return out
}
function renderMarkdown(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const html = []
  let i = 0
  let inCode = false
  let codeBuf = []
  let listBuf = []
  let listType = ''
  const flushList = () => {
    if (!listBuf.length) return
    html.push('<' + (listType === 'ol' ? 'ol' : 'ul') + '>' + listBuf.map((x) => '<li>' + x + '</li>').join('') + '</' + (listType === 'ol' ? 'ol' : 'ul') + '>')
    listBuf = []
  }
  while (i < lines.length) {
    const line = lines[i]
    const t = line.trim()
    if (inCode) {
      if (t.startsWith('```')) { inCode = false; html.push('<pre><code>' + esc(codeBuf.join('\n')) + '</code></pre>'); codeBuf = [] }
      else codeBuf.push(line)
      i++
      continue
    }
    if (t.startsWith('```')) { flushList(); inCode = true; i++; continue }
    if (t === '') { flushList(); html.push(''); i++; continue }
    const h = /^(#{1,6})\s+(.*)$/.exec(t)
    if (h) { flushList(); html.push('<h' + h[1].length + '>' + inline(h[2]) + '</h' + h[1].length + '>'); i++; continue }
    if (t === '---' || t === '***') { flushList(); html.push('<hr />'); i++; continue }
    if (t.startsWith('>')) { flushList(); html.push('<blockquote>' + inline(t.replace(/^>\s?/, '')) + '</blockquote>'); i++; continue }
    if (/^[-*+]\s+/.test(t)) { if (listType !== 'ul') { flushList(); listType = 'ul' } listBuf.push(inline(t.replace(/^[-*+]\s+/, ''))); i++; continue }
    if (/^\d+\.\s+/.test(t)) { if (listType !== 'ol') { flushList(); listType = 'ol' } listBuf.push(inline(t.replace(/^\d+\.\s+/, ''))); i++; continue }
    flushList(); listType = ''
    if (/^\|/.test(t) && i + 1 < lines.length && /^\|[\s:|-]+\|$/.test(lines[i + 1].trim())) {
      const head = t.split('|').slice(1, -1).map((c) => inline(c.trim()))
      i += 2
      const rows = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].split('|').slice(1, -1).map((c) => inline(c.trim())))
        i++
      }
      html.push('<table><thead><tr>' + head.map((c) => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>' + rows.map((r) => '<tr>' + r.map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table>')
      continue
    }
    html.push('<p>' + inline(t) + '</p>')
    i++
  }
  if (inCode) html.push('<pre><code>' + esc(codeBuf.join('\n')) + '</code></pre>')
  flushList()
  return html.join('\n')
}

const WikiView = {
  name: 'wiki-view',
  data() {
    return {
      nav,
      projects: [],
      project: '',
      doc: '',
      loading: false,
      status: '',
      creating: false,
    }
  },
  computed: {
    rendered() { return renderMarkdown(this.doc) },
    dirLabel() { return this.project ? (this.project + (nav.path ? ' / ' + nav.path : '')) : '—' },
  },
  methods: {
    async loadProjects() {
      const r = await api('/privhub/api/projects')
      if (r.ok) {
        this.projects = r.projects
        if (!this.project && this.projects.length) { this.project = nav.project || this.projects[0]; await this.load() }
      }
    },
    async load() {
      if (!this.project) return
      this.loading = true
      this.status = ''
      try {
        // 当前目录 README.md，缺省 fallback index.md
        const rel = nav.path ? nav.path + '/README.md' : 'README.md'
        let r = await api('/privhub/api/doc?project=' + encodeURIComponent(this.project) + '&path=' + encodeURIComponent(rel))
        if (!r.ok || !r.ok && !r.status) {
          const alt = nav.path ? nav.path + '/index.md' : 'index.md'
          r = await api('/privhub/api/doc?project=' + encodeURIComponent(this.project) + '&path=' + encodeURIComponent(alt))
        }
        if (r.ok) {
          // frontmatter 隐藏
          this.doc = r.doc.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
          this.status = ''
        } else {
          this.doc = ''
          this.status = r.error === '文档不存在' ? 'NO_DOC' : (r.error || '读取失败')
        }
      } finally { this.loading = false }
    },
    async createReadme() {
      if (!this.project) return
      this.creating = true
      try {
        const rel = nav.path ? nav.path + '/README.md' : 'README.md'
        const today = new Date().toISOString().slice(0, 10)
        const doc = '---\ntitle: ' + this.project + '\ncreated: ' + today + '\n---\n\n# ' + this.project + '\n\n欢迎使用知识库视图。用 `[[文件名]]` 添加双链，README.md 将作为本目录的 Wiki 首页。\n'
        const r = await api('/privhub/api/doc', { method: 'PUT', body: JSON.stringify({ project: this.project, path: rel, doc, baseMtime: 0 }) })
        if (r.ok) {
          this.status = ''
          await this.load()
          window.PrivHub.toast('README.md 已创建')
          await nav.openDir(this.project, nav.path)
          const e = nav.entries.find((x) => x.name === 'README.md')
          if (e) nav.selectEntry(e)
        } else {
          window.PrivHub.toast(r.error || '创建失败', 'error')
        }
      } finally { this.creating = false }
    },
    async onLinkClick(ev) {
      const a = ev.target.closest('.wiki-link')
      if (!a) return
      const name = a.getAttribute('data-name')
      // 双链名可能带/不带 .md 后缀
      const targetName = /\.md$/i.test(name) ? name : name + '.md'
      const rel = nav.path ? nav.path + '/' + targetName : targetName
      const r = await api('/privhub/api/doc?project=' + encodeURIComponent(this.project) + '&path=' + encodeURIComponent(rel))
      if (r.ok) {
        await nav.openDir(this.project, nav.path)
        const e = nav.entries.find((x) => x.name === targetName)
        if (e) nav.selectEntry(e)
        this.status = '已定位：' + targetName
      } else {
        this.status = '未找到「' + targetName + '」（双链目标需为同目录 .md 文件）'
      }
    },
  },
  async mounted() {
    await this.loadProjects()
  },
  template: `
    <div class="modal-mask" @click.self="$emit('close')">
      <div class="modal" style="width:900px">
        <h2>📚 知识库</h2>
        <div class="modal-body">
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap">
            <select v-model="project" @change="load" style="padding:7px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text)">
              <option value="" disabled>选择项目…</option>
              <option v-for="p in projects" :key="p" :value="p">{{ p }}</option>
            </select>
            <span style="font-size:13px;color:var(--muted)">📁 {{ dirLabel }}</span>
            <span v-if="status && status !== 'NO_DOC'" style="font-size:12px;color:var(--accent)">{{ status }}</span>
            <span style="flex:1"></span>
            <button class="small-btn" @click="load">🔄 刷新</button>
          </div>

          <div v-if="loading" class="empty" style="padding:60px">加载中…</div>
          <div v-else-if="status === 'NO_DOC'" class="empty" style="padding:60px">
            📄 本目录还没有 README.md（或 index.md）。<br />
            创建后，它将被渲染为当前目录的 Wiki 首页（目录即站点，零新增存储）。
            <div style="margin-top:14px"><button class="btn btn-primary" style="width:auto" :disabled="creating" @click="createReadme">{{ creating ? '创建中…' : '＋ 创建 README.md' }}</button></div>
          </div>
          <div v-else-if="status" class="empty" style="padding:60px">{{ status }}</div>
          <div v-else-if="doc" class="md-preview" v-html="rendered" @click="onLinkClick" style="border:1px solid var(--line);border-radius:10px;padding:18px 22px;max-height:520px;overflow:auto;background:var(--panel2);color:var(--text);font-size:14px;line-height:1.75"></div>
          <div v-else class="empty" style="padding:60px">请选择项目查看知识库</div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="$emit('close')">关 闭</button>
        </div>
      </div>
    </div>
  `,
}

export default {
  id: 'privhub-files-wiki',
  slots: {
    wiki: WikiView,
  },
}
