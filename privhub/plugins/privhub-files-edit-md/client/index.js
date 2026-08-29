/**
 * privhub-files-edit-md · client — Markdown 在线编辑器（挂 md-editor slot，浮层形态）
 *
 * 打开方式：双击任意 .md 文件（骨架 openEntry emit 'entry:open'）→ 本组件
 * 监听 bus，判定为 .md 后打开全屏编辑浮层：左侧编辑（textarea，无构建链）、
 * 右侧实时预览（自带轻量 markdown 渲染器，离线可用）。
 *
 * 能力：
 *   - frontmatter（--- title/tags/created ---）解析显示，保存后自动补齐 created
 *   - 双链 [[文件名]] 渲染为可点击链接，点击定位当前目录同名文件
 *   - 保存：PUT /api/doc（带 baseMtime 冲突检测，409 时确认覆盖后重试）
 *   - 版本历史：GET /api/doc/versions + POST /api/doc/restore（回滚）
 *   - 未保存修改关闭前提示；保存/回滚后 emit bus 'md:changed'（供列表刷新）
 *
 * @module privhub-files-edit-md/client
 */

const { api, bus, nav, AUTH } = window.PrivHub

/* ============ 轻量 markdown 渲染（离线、无依赖） ============ */
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** 行内渲染：代码 / 加粗 / 斜体 / 行内链接 / 双链 */
function inline(s) {
  let out = esc(s)
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  // 双链 [[文件名]]
  out = out.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (m, name, alias) => {
    const label = esc(alias || name)
    return '<a href="javascript:void 0" class="md-wikilink" data-name="' + esc(name) + '">🔗 ' + label + '</a>'
  })
  // 普通链接 [text](url)
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
  return out
}

/** 整文渲染：代码块 / 标题 / 列表 / 表格 / 引用 / 分隔线 / 段落 */
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
    if (inCode) {
      if (line.trim().startsWith('```')) { inCode = false; html.push('<pre><code>' + esc(codeBuf.join('\n')) + '</code></pre>'); codeBuf = [] }
      else codeBuf.push(line)
      i++
      continue
    }
    if (line.trim().startsWith('```')) { flushList(); inCode = true; i++; continue }
    const t = line.trim()
    if (t === '') { flushList(); html.push(''); i++; continue }
    const h = /^(#{1,6})\s+(.*)$/.exec(t)
    if (h) { flushList(); html.push('<h' + h[1].length + '>' + inline(h[2]) + '</h' + h[1].length + '>'); i++; continue }
    if (t === '---' || t === '***') { flushList(); html.push('<hr />'); i++; continue }
    if (/^&gt;\s?/.test(t) || t.startsWith('>')) { flushList(); html.push('<blockquote>' + inline(t.replace(/^>\s?/, '')) + '</blockquote>'); i++; continue }
    if (/^[-*+]\s+/.test(t)) { if (listType !== 'ul') { flushList(); listType = 'ul' } listBuf.push(inline(t.replace(/^[-*+]\s+/, ''))); i++; continue }
    if (/^\d+\.\s+/.test(t)) { if (listType !== 'ol') { flushList(); listType = 'ol' } listBuf.push(inline(t.replace(/^\d+\.\s+/, ''))); i++; continue }
    flushList(); listType = ''
    // 表格
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

/** frontmatter：解析 --- 块；返回 { meta: {key:val}, body, hasMeta } */
function parseFrontmatter(doc) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(doc)
  if (!m) return { meta: {}, body: doc, hasMeta: false }
  const meta = {}
  for (const line of m[1].split('\n')) {
    const kv = /^([\w-]+):\s*(.*)$/.exec(line.trim())
    if (kv) meta[kv[1]] = kv[2].replace(/^["']|["']$/g, '')
  }
  return { meta, body: doc.slice(m[1].length + 9), hasMeta: true }
}

function buildFrontmatter(meta) {
  return '---\n' + Object.entries(meta).map(([k, v]) => k + ': ' + v).join('\n') + '\n---\n\n'
}

/* ============ 编辑器组件 ============ */
const MdEditor = {
  name: 'md-editor',
  data() {
    return {
      open: false,
      project: '',
      path: '',      // 项目内相对路径（含文件名）
      name: '',
      doc: '',
      baseMtime: 0,
      savedMtime: 0,
      dirty: false,
      saving: false,
      status: '',
      showVersions: false,
      versions: [],
      restoring: false,
      meta: {},
    }
  },
  computed: {
    canEdit() {
      const u = AUTH.user
      return u && (u.role === 'admin' || (u.projects || []).includes(this.project))
    },
    previewHtml() {
      return renderMarkdown(this.bodyText)
    },
    bodyText() {
      return this.doc
    },
    wordCount() { return this.doc.trim() ? this.doc.trim().split(/\s+/).length : 0 },
  },
  methods: {
    async openEditor(e) {
      if (!e || e.isDir || !/\.md$/i.test(e.name)) return
      const rel = nav.path ? nav.path + '/' + e.name : e.name
      this.project = nav.project || ''
      this.path = rel
      this.name = e.name
      this.showVersions = false
      const r = await api('/privhub/api/doc?project=' + encodeURIComponent(this.project) + '&path=' + encodeURIComponent(rel))
      if (!r.ok) { this.status = r.error || '读取失败'; return }
      const fm = parseFrontmatter(r.doc)
      this.meta = fm.meta
      this.doc = r.doc
      this.baseMtime = r.mtime
      this.savedMtime = r.mtime
      this.dirty = false
      this.status = '已打开 · ' + this.fmtTime(r.mtime)
      this.open = true
      bus.emit('md:opened', { project: this.project, path: this.path })
    },
    fmtTime(at) {
      const d = new Date(at)
      const p = (n) => String(n).padStart(2, '0')
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
    },
    onInput() { this.dirty = true; this.status = '未保存修改…' },
    async save(force = false) {
      if (!this.canEdit) { this.status = '无写权限'; return }
      this.saving = true
      try {
        // 保存前补齐 frontmatter created（4.4）
        let doc = this.doc
        const fm = parseFrontmatter(doc)
        if (!fm.hasMeta) {
          const meta = { title: this.name.replace(/\.md$/i, ''), created: new Date().toISOString().slice(0, 10) }
          doc = buildFrontmatter(meta) + doc
        } else if (!fm.meta.created) {
          const meta = { ...fm.meta, created: new Date().toISOString().slice(0, 10) }
          doc = buildFrontmatter(meta) + fm.body
        }
        const r = await api('/privhub/api/doc', { method: 'PUT', body: JSON.stringify({ project: this.project, path: this.path, doc, baseMtime: this.baseMtime }) })
        if (r.conflict && !force) {
          if (confirm('该文档已被他人修改（' + this.fmtTime(r.mtime) + '）。\n覆盖保存将丢失他人的修改，是否继续？')) return this.save(true)
          this.status = '已取消（保留他人修改，请重新打开查看）'
          return
        }
        if (r.ok) {
          this.doc = doc
          this.baseMtime = r.mtime
          this.savedMtime = r.mtime
          this.dirty = false
          this.status = '✅ 已保存 ' + this.fmtTime(r.mtime)
          bus.emit('md:changed', { project: this.project, path: this.path })
        } else {
          this.status = r.error || '保存失败'
        }
      } finally { this.saving = false }
    },
    async loadVersions() {
      this.showVersions = true
      const r = await api('/privhub/api/doc/versions?project=' + encodeURIComponent(this.project) + '&path=' + encodeURIComponent(this.path))
      this.versions = r.ok ? r.versions : []
    },
    async restore(v) {
      if (!confirm('回滚到 ' + this.fmtTime(v.at) + ' 的版本？\n当前内容将先自动存档，回滚后仍可恢复。')) return
      this.restoring = true
      try {
        const r = await api('/privhub/api/doc/restore', { method: 'POST', body: JSON.stringify({ project: this.project, path: this.path, version: v.at }) })
        if (r.ok) {
          this.status = '✅ 已回滚到 ' + this.fmtTime(v.at)
          await this.loadVersions()
          const re = await api('/privhub/api/doc?project=' + encodeURIComponent(this.project) + '&path=' + encodeURIComponent(this.path))
          if (re.ok) { this.doc = re.doc; this.baseMtime = re.mtime; this.savedMtime = re.mtime; this.dirty = false }
          bus.emit('md:changed', { project: this.project, path: this.path })
        } else this.status = r.error || '回滚失败'
      } finally { this.restoring = false }
    },
    tryClose() {
      if (this.dirty && !confirm('有未保存的修改，确定关闭？')) return
      this.open = false
    },
    /* F21：导出当前文档（HTML / PDF / Word，读权限即可） */
    async exportDoc(fmt) {
      const token = window.PrivHub.AUTH.token || ''
      try {
        const r = await fetch('/privhub/api/export?project=' + encodeURIComponent(this.project) + '&path=' + encodeURIComponent(this.path) + '&format=' + fmt, { headers: { authorization: 'Bearer ' + token } })
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          window.PrivHub.toast(j.error || '导出失败', 'error')
          return
        }
        const blob = await r.blob()
        const ext = fmt === 'doc' ? 'doc' : fmt
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = this.name.replace(/\.md$/i, '') + '.' + ext
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(a.href), 5000)
        window.PrivHub.toast('已导出 ' + ext.toUpperCase())
      } catch {
        window.PrivHub.toast('导出失败（网络错误）', 'error')
      }
    },
    async onPreviewClick(ev) {
      const a = ev.target.closest('.md-wikilink')
      if (!a) return
      const name = a.getAttribute('data-name')
      const r = await api('/privhub/api/list?project=' + encodeURIComponent(this.project) + '&path=' + encodeURIComponent(nav.path || ''))
      const hit = r.ok ? r.entries.find((e) => e.name === name) : null
      if (hit) { nav.selectEntry(hit); this.status = '🔗 已定位：' + name }
      else this.status = '当前目录未找到「' + name + '」（双链仅定位同目录文件）'
    },
  },
  mounted() {
    // payload = { entry, project, path }（骨架 openEntry emit）
    this._off = bus.on('entry:open', (payload) => { void this.openEditor(payload && payload.entry) })
  },
  beforeUnmount() { if (this._off) this._off() },
  template: `
    <div v-if="open" class="md-editor-mask" style="position:fixed;inset:0;z-index:200;background:rgba(10,14,20,.55);display:flex;align-items:center;justify-content:center">
      <div style="width:92vw;max-width:1200px;height:88vh;background:var(--panel);border-radius:12px;display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--line)">
        <!-- 头部 -->
        <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--line);background:var(--panel2)">
          <span style="font-size:16px">📝</span>
          <strong>{{ name }}</strong>
          <span style="color:var(--muted);font-size:12px">{{ project }}/{{ path }}</span>
          <span style="flex:1"></span>
          <button class="icon-btn" :disabled="saving" @click="save()">{{ saving ? '保存中…' : '💾 保存' }}</button>
          <button class="icon-btn" @click="loadVersions()">🕘 版本</button>
          <button class="icon-btn" @click="exportDoc('html')">⬇ HTML</button>
          <button class="icon-btn" @click="exportDoc('pdf')">⬇ PDF</button>
          <button class="icon-btn" @click="exportDoc('doc')">⬇ Word</button>
          <button class="icon-btn" @click="tryClose()">✖ 关闭</button>
        </div>
        <!-- 版本抽屉 -->
        <div v-if="showVersions" style="padding:8px 16px;border-bottom:1px solid var(--line);max-height:180px;overflow:auto;background:var(--bg)">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-weight:600">版本历史（最多 20 版）</span>
            <span style="flex:1"></span>
            <button class="small-btn" @click="showVersions = false">收起</button>
          </div>
          <div v-if="versions.length === 0" style="color:var(--muted);font-size:13px">暂无历史版本（保存后自动生成）</div>
          <div v-for="v in versions" :key="v.at" style="display:flex;align-items:center;gap:10px;padding:3px 0;font-size:13px">
            <span style="color:var(--muted)">{{ fmtTime(v.at) }}</span>
            <span style="flex:1"></span>
            <button class="small-btn" :disabled="restoring" @click="restore(v)">↩ 回滚到此版本</button>
          </div>
        </div>
        <!-- 编辑 + 预览 -->
        <div style="flex:1;display:flex;min-height:0">
          <div style="flex:1;display:flex;flex-direction:column;border-right:1px solid var(--line)">
            <div style="padding:6px 14px;font-size:12px;color:var(--muted);background:var(--bg)">编辑区（Markdown · frontmatter 自动补齐 created）</div>
            <textarea
              v-model="doc"
              @input="onInput"
              spellcheck="false"
              style="flex:1;width:100%;border:none;outline:none;resize:none;padding:14px;font-family:Consolas,monospace;font-size:14px;line-height:1.7;background:var(--panel2);color:var(--text)"
            ></textarea>
          </div>
          <div style="flex:1;display:flex;flex-direction:column">
            <div style="padding:6px 14px;font-size:12px;color:var(--muted);background:var(--bg)">预览（双链 [[文件名]] 可点击定位）</div>
            <div class="md-preview" v-html="previewHtml" @click="onPreviewClick" style="flex:1;overflow:auto;padding:14px 18px;background:var(--panel2);color:var(--text);font-size:14px;line-height:1.7"></div>
          </div>
        </div>
        <!-- 底部状态 -->
        <div style="display:flex;gap:14px;padding:6px 16px;border-top:1px solid var(--line);font-size:12px;color:var(--muted);background:var(--panel2)">
          <span>{{ status }}</span>
          <span style="flex:1"></span>
          <span>{{ wordCount }} 词</span>
          <span v-if="!canEdit" style="color:var(--danger)">当前账号无该项目写权限</span>
        </div>
      </div>
    </div>
  `,
}

export default {
  id: 'privhub-files-edit-md',
  slots: {
    'md-editor': MdEditor,
  },
}
