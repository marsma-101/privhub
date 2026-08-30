/**
 * privhub-files-office-ui · client — Office 编辑浮层（office-editor slot）
 *
 * 监听 bus 'office:edit'（files-explorer 右键「编辑」emit）→ 打开浮层：
 *   - xlsx：表格编辑（可改单元格，保存写回）
 *   - docx：文本编辑（textarea + 预览，保存写回）
 *   - pptx/pdf：只读查看（Markdown/文本展示）
 * 权限由服务端 /api/office/read|write 校验（canAccess + ACL）。
 *
 * @module privhub-files-office-ui/client
 */

const { api, bus, nav } = window.PrivHub

const OfficeEditor = {
  name: 'office-editor',
  data() {
    return {
      open: false,
      project: '',
      path: '',
      name: '',
      kind: 'unknown',
      loading: false,
      saving: false,
      status: '',
      // xlsx 编辑态
      sheets: [],       // [{ name, rows }]
      sheetIndex: 0,
      // docx 编辑态
      docText: '',
      // pptx/pdf 只读态
      readonlyText: '',
    }
  },
  computed: {
    currentSheet() { return this.sheets[this.sheetIndex] || null },
  },
  methods: {
    /* payload 兼容：{ entry, project, path }（path = 文件完整相对路径）；裸 entry 时回退 nav 上下文 */
    async openEditor(payload) {
      const e = payload && payload.entry ? payload.entry : payload
      if (!e || e.isDir) return
      const ext = (e.name.split('.').pop() || '').toLowerCase()
      if (!['doc', 'docx', 'xlsx', 'pptx', 'pdf'].includes(ext)) return
      this.project = (payload && payload.project) || nav.project || ''
      this.path = (payload && payload.path) || nav.relPathOf(e.name)
      this.name = e.name
      this.kind = ext
      this.open = true
      this.status = '加载中…'
      this.loading = true
      try {
        const r = await api('/privhub/api/office/read?project=' + encodeURIComponent(this.project) + '&path=' + encodeURIComponent(this.path))
        if (!r.ok) { this.status = r.error || '读取失败'; return }
        if (ext === 'xlsx') {
          this.sheets = r.content.sheets || []
          this.sheetIndex = 0
        } else if (ext === 'docx') {
          this.docText = r.content.text || ''
        } else if (ext === 'pptx') {
          const slides = r.content.slides || []
          this.readonlyText = slides.map((s, i) => '## Slide ' + (i + 1) + '\n\n**' + s.title + '**\n' + (s.bullets || []).map((b) => '- ' + b).join('\n')).join('\n\n')
        } else {
          this.readonlyText = r.content.text || ''
        }
        this.status = '已打开 · ' + e.name
      } catch { this.status = '读取失败（网络错误）' }
      finally { this.loading = false }
    },
    switchSheet(i) { this.sheetIndex = i },
    /* xlsx 单元格编辑 */
    setCell(ri, ci, val) {
      const sheet = this.currentSheet
      if (!sheet) return
      if (!sheet.rows[ri]) sheet.rows[ri] = []
      sheet.rows[ri][ci] = val
      this.status = '未保存修改…'
    },
    /* docx 输入 */
    onDocInput() { this.status = '未保存修改…' },
    async save() {
      if (this.kind !== 'xlsx' && this.kind !== 'docx') { this.status = '该格式只读，不可保存'; return }
      this.saving = true
      try {
        let content
        if (this.kind === 'xlsx') {
          // 去掉尾部空行
          const rows = this.currentSheet ? this.currentSheet.rows.slice() : []
          while (rows.length && rows[rows.length - 1].every((c) => c === null || c === '' || c === undefined)) rows.pop()
          content = rows
        } else {
          content = this.docText
        }
        const r = await api('/privhub/api/office/write', { method: 'POST', body: JSON.stringify({ project: this.project, path: this.path, content }) })
        if (r.ok) {
          this.status = '✅ 已保存'
          bus.emit('trash:changed', {}) // 触发列表刷新
          nav.refreshTree && nav.refreshTree()
        } else this.status = r.error || '保存失败'
      } catch { this.status = '保存失败（网络错误）' }
      finally { this.saving = false }
    },
    tryClose() {
      if (this.status.includes('未保存') && !confirm('有未保存的修改，确定关闭？')) return
      this.open = false
    },
    fmtCell(v) { return v === null || v === undefined ? '' : String(v) },
  },
  mounted() {
    this._off = bus.on('office:edit', (payload) => { void this.openEditor(payload) })
  },
  beforeUnmount() { if (this._off) this._off() },
  template: `
    <div v-if="open" class="md-editor-mask" style="position:fixed;inset:0;z-index:200;background:rgba(10,14,20,.55);display:flex;align-items:center;justify-content:center">
      <div style="width:92vw;max-width:1100px;height:88vh;background:var(--panel);border-radius:12px;display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--line)">
        <!-- 头部 -->
        <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--line);background:var(--panel2)">
          <span style="font-size:16px">{{ kind === 'docx' ? '📄' : kind === 'xlsx' ? '📊' : kind === 'pptx' ? '📽️' : '📕' }}</span>
          <strong>{{ name }}</strong>
          <span style="color:var(--muted);font-size:12px">{{ project }}/{{ path }}</span>
          <span style="flex:1"></span>
          <button v-if="kind === 'xlsx' || kind === 'docx'" class="icon-btn" :disabled="saving" @click="save">{{ saving ? '保存中…' : '💾 保存' }}</button>
          <button class="icon-btn" @click="tryClose()">✖ 关闭</button>
        </div>
        <!-- 主体 -->
        <div style="flex:1;display:flex;min-height:0">
          <!-- xlsx：工作表切换 + 表格编辑 -->
          <div v-if="kind === 'xlsx'" style="flex:1;display:flex;flex-direction:column;min-width:0">
            <div style="display:flex;gap:6px;padding:8px 14px;border-bottom:1px solid var(--line);flex-wrap:wrap">
              <button v-for="(s, i) in sheets" :key="s.name" class="small-btn" :class="{ on: i === sheetIndex }" @click="switchSheet(i)">{{ s.name }}</button>
              <span style="flex:1"></span>
              <span style="font-size:12px;color:var(--muted)">单击单元格编辑</span>
            </div>
            <div style="flex:1;overflow:auto;padding:10px 14px">
              <div v-if="!currentSheet" class="empty">（空工作簿）</div>
              <table v-else style="border-collapse:collapse;font-size:12.5px">
                <tr v-for="(row, ri) in currentSheet.rows" :key="ri">
                  <td v-for="(cell, ci) in row" :key="ci" style="border:1px solid var(--line);min-width:70px">
                    <input
                      :value="fmtCell(cell)"
                      @input="setCell(ri, ci, $event.target.value)"
                      style="width:100%;border:none;outline:none;padding:3px 6px;background:transparent;color:var(--text);font-size:12.5px"
                    />
                  </td>
                </tr>
              </table>
            </div>
          </div>
          <!-- docx：文本编辑 + 只读提示（写回为纯文本结构） -->
          <div v-else-if="kind === 'docx'" style="flex:1;display:flex;flex-direction:column;min-width:0">
            <div style="padding:6px 14px;font-size:12px;color:var(--muted);background:var(--bg)">编辑区（纯文本/轻量 Markdown，保存后按结构重建文档）</div>
            <textarea v-model="docText" @input="onDocInput" spellcheck="false" style="flex:1;width:100%;border:none;outline:none;resize:none;padding:14px;font-family:Consolas,monospace;font-size:14px;line-height:1.7;background:var(--panel2);color:var(--text)"></textarea>
          </div>
          <!-- pptx/pdf：只读 -->
          <div v-else style="flex:1;overflow:auto;padding:16px 20px">
            <div style="font-size:12px;color:var(--muted);margin-bottom:8px">{{ kind === 'pptx' ? '📽️ 演示文稿（只读）' : '📕 PDF 文本（只读）' }}</div>
            <pre style="font-size:13px;line-height:1.7;white-space:pre-wrap;font-family:inherit;color:var(--text)">{{ readonlyText }}</pre>
          </div>
        </div>
        <!-- 底部状态 -->
        <div style="display:flex;gap:14px;padding:6px 16px;border-top:1px solid var(--line);font-size:12px;color:var(--muted);background:var(--panel2)">
          <span>{{ status }}</span>
          <span style="flex:1"></span>
          <span v-if="loading">加载中…</span>
        </div>
      </div>
    </div>
  `,
}

export default {
  id: 'privhub-files-office-ui',
  slots: {
    'office-editor': OfficeEditor,
  },
}
