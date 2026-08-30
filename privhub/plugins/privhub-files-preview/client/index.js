/**
 * privhub-files-preview · client — 预览条（preview slot）
 *
 * 读取骨架桥 nav.selected / nav.preview / nav.rightOpen：
 *   - image：preview-raw 直载
 *   - text：内容高亮展示
 *   - pdf：iframe 直载
 *   - docx/xlsx/pptx：调 /api/office-preview 提取 Markdown 渲染（G1）
 *
 * @module privhub-files-preview/client
 */

const { api, nav, previewImageUrl, previewPdfUrl } = window.PrivHub

/* 轻量 Markdown 渲染（Office 提取结果展示；与 edit-md 的渲染器同思路，离线无依赖） */
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function renderMd(md) {
  const lines = String(md || '').replace(/\r\n/g, '\n').split('\n')
  const html = []
  let i = 0
  let inCode = false
  let codeBuf = []
  while (i < lines.length) {
    const line = lines[i]
    if (inCode) {
      if (line.trim().startsWith('```')) { inCode = false; html.push('<pre><code>' + esc(codeBuf.join('\n')) + '</code></pre>'); codeBuf = [] }
      else codeBuf.push(line)
      i++; continue
    }
    const t = line.trim()
    if (t.startsWith('```')) { inCode = true; i++; continue }
    if (t.startsWith('### ')) { html.push('<h4>' + esc(t.slice(4)) + '</h4>'); i++; continue }
    if (t.startsWith('## ')) { html.push('<h4 style="margin-top:10px">' + esc(t.slice(3)) + '</h4>'); i++; continue }
    if (t.startsWith('# ')) { html.push('<h4>' + esc(t.slice(2)) + '</h4>'); i++; continue }
    if (t.startsWith('|')) {
      // 表格行合并输出
      const rows = []
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(lines[i].trim()); i++ }
      const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => esc(c.trim()))
      const isSep = (r) => /^[\s|:-]+$/.test(r.replace(/[|]/g, '')) && r.includes('---')
      const header = isSep(rows[0]) ? [] : cells(rows[0])
      const body = rows.filter((r) => !isSep(r)).slice(header.length ? 1 : 0).map(cells)
      if (header.length) {
        html.push('<table style="border-collapse:collapse;font-size:12px;margin:6px 0"><tr>' + header.map((c) => '<th style="border:1px solid var(--line);padding:4px 8px;background:var(--panel)">' + c + '</th>').join('') + '</tr>' +
          body.map((r) => '<tr>' + r.map((c) => '<td style="border:1px solid var(--line);padding:4px 8px">' + c + '</td>').join('') + '</tr>').join('') + '</table>')
      }
      continue
    }
    if (t.startsWith('- ')) {
      const items = []
      while (i < lines.length && lines[i].trim().startsWith('- ')) { items.push(esc(lines[i].trim().slice(2))); i++ }
      html.push('<ul style="margin:4px 0;padding-left:18px">' + items.map((x) => '<li style="font-size:12.5px">' + x + '</li>').join('') + '</ul>')
      continue
    }
    if (t.startsWith('**') && t.endsWith('**')) { html.push('<div style="font-weight:600;margin:4px 0">' + esc(t.slice(2, -2)) + '</div>'); i++; continue }
    if (t.startsWith('*') && t.endsWith('*')) { html.push('<div style="font-style:italic;margin:4px 0">' + esc(t.slice(1, -1)) + '</div>'); i++; continue }
    if (t === '') { i++; continue }
    html.push('<div style="margin:3px 0;font-size:12.5px;line-height:1.6">' + esc(t) + '</div>')
    i++
  }
  return html.join('')
}

const PreviewPanel = {
  name: 'files-preview',
  data() { return { nav, office: null, officeErr: '' } },
  computed: {
    selected() { return nav.selected },
    preview() { return nav.preview },
    // Office 扩展名（docx/xls/xlsx/pptx）
    isOffice() {
      const n = this.selected && this.selected.name || ''
      return /\.(docx|xls|xlsx|pptx)$/i.test(n)
    },
  },
  watch: {
    // 选中变化（nav.selected 由骨架 selectEntry 更新）：清 Office 缓存；是 Office 文件则拉取
    'nav.selected': {
      handler(e) {
        this.office = null
        this.officeErr = ''
        if (e && !e.isDir && /\.(docx|xls|xlsx|pptx)$/i.test(e.name)) this.loadOffice(e)
      },
      deep: true,
    },
    // 骨架 selectEntry 同时设置 nav.preview——以它为主驱动（选中非 Office 或清空时同步重置）
    'nav.preview': {
      handler(p) {
        if (!p || p.type !== 'office') { this.office = null; this.officeErr = '' }
      },
      deep: true,
    },
  },
  mounted() {
    // 兜底：挂载时已有选中 Office 文件（视图切换返回）立即拉取
    const cur = nav.selected
    if (cur && !cur.isDir && /\.(docx|xls|xlsx|pptx)$/i.test(cur.name)) this.loadOffice(cur)
  },
  methods: {
    async loadOffice(e) {
      const rel = nav.relPathOf(e.name)
      try {
        const r = await api('/privhub/api/office-preview?project=' + encodeURIComponent(nav.project) + '&path=' + encodeURIComponent(rel))
        if (r.ok) { this.office = { type: r.type, markdown: r.markdown } }
        else this.officeErr = r.error || '无法预览'
      } catch { this.officeErr = '无法预览' }
    },
    renderOffice() { return this.office ? renderMd(this.office.markdown) : '' },
  },
  template: `
    <div class="right-panel">
      <div class="right-head">
        <span>预览</span>
        <span class="right-close" @click="nav.rightOpen = false">✕</span>
      </div>
      <div class="right-body">
        <div v-if="!selected" class="preview-empty">选中文件后在此预览</div>
        <div v-else-if="selected.isDir" class="preview-empty">📁 文件夹<br/>{{ selected.name }}</div>
        <div v-else-if="isOffice" style="text-align:left">
          <div style="font-weight:600;margin-bottom:10px">{{ selected.name }}</div>
          <div v-if="officeErr" class="preview-empty">{{ officeErr }}</div>
          <div v-else-if="!office" class="preview-empty">正在提取…</div>
          <div v-else v-html="renderOffice()" style="font-size:12.5px;line-height:1.7;background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:14px;overflow:auto;max-height:520px"></div>
        </div>
        <div v-else-if="preview && preview.type === 'image'" style="text-align:center">
          <div style="font-weight:600;margin-bottom:10px">{{ selected.name }}</div>
          <img class="preview-img" :src="previewImageUrl(selected.name)" alt="preview" />
        </div>
        <div v-else-if="preview && preview.type === 'text'" style="text-align:left">
          <div style="font-weight:600;margin-bottom:10px">{{ selected.name }}</div>
          <pre class="preview-text">{{ preview.data }}</pre>
        </div>
        <div v-else-if="preview && preview.type === 'pdf'" style="text-align:center">
          <div style="font-weight:600;margin-bottom:10px">{{ selected.name }}</div>
          <iframe class="preview-pdf" :src="previewPdfUrl(selected.name)"></iframe>
        </div>
        <div v-else class="preview-empty">
          <div style="font-size:30px;margin-bottom:10px">📄</div>
          {{ selected ? selected.name : '' }}<br/>暂不支持预览该文件类型
        </div>
      </div>
    </div>
  `,
}

export default {
  id: 'privhub-files-preview',
  slots: {
    preview: PreviewPanel,
  },
}
