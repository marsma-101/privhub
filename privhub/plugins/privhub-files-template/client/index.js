/**
 * privhub-files-template · client — 新建文档向导 + 模板管理（挂 template slot，模态形态）
 *
 * 流程：进入项目 → 图标栏「📝 新建文档」→ 选模板 → 输入文件名 →
 * 在项目当前目录创建 .md（{{date}} 替换为当天，title 注入文件名）→
 * 调用 F16 /api/doc 新建 → 定位并打开文件。
 * admin 可在模态内「管理模板」：新增/编辑/删除（内置 3 个亦可管理）。
 *
 * @module privhub-files-template/client
 */

const { api, nav, AUTH } = window.PrivHub

const TemplateDoc = {
  name: 'template-doc',
  data() {
    return {
      nav,
      templates: [],
      pick: '',
      fileName: '',
      creating: false,
      status: '',
      manage: false,
      editTpl: null, // 编辑中的模板副本（null = 关闭编辑表单）
      newTpl: false,
    }
  },
  computed: {
    isAdmin() { const u = AUTH.user; return u && u.role === 'admin' },
    picked() { return this.templates.find((t) => t.id === this.pick) || null },
    targetDir() { return nav.project ? (nav.path ? nav.project + '/' + nav.path : nav.project) : '（未进入项目）' },
  },
  methods: {
    async load() {
      const r = await api('/privhub/api/templates')
      if (r.ok) {
        this.templates = r.templates
        if (!this.pick && this.templates.length) this.pick = this.templates[0].id
      }
    },
    pickTemplate(t) {
      this.pick = t.id
      this.fileName = t.name + '.md'
    },
    async create() {
      if (!nav.project) { this.status = '请先进入项目'; return }
      const t = this.picked
      const name = this.fileName.trim()
      if (!t) { this.status = '请选择模板'; return }
      if (!name.endsWith('.md')) { this.status = '文件名需以 .md 结尾'; return }
      this.creating = true
      try {
        const today = new Date().toISOString().slice(0, 10)
        const title = name.replace(/\.md$/i, '')
        let content = t.content.replace(/\{\{date\}\}/g, today).replace(/^title: .*$/m, 'title: ' + title)
        const rel = nav.path ? nav.path + '/' + name : name
        // 新建：baseMtime=0 表示目标不存在，允许创建
        const r = await api('/privhub/api/doc', { method: 'PUT', body: JSON.stringify({ project: nav.project, path: rel, doc: content, baseMtime: 0 }) })
        if (r.ok) {
          this.status = '✅ 已创建 ' + this.targetDir + '/' + name
          await nav.openDir(nav.project, nav.path)
          const e = nav.entries.find((x) => x.name === name)
          if (e) nav.selectEntry(e)
        } else {
          this.status = r.error || '创建失败'
        }
      } finally { this.creating = false }
    },
    /* ---- 管理模板 ---- */
    startEdit(t) { this.editTpl = JSON.parse(JSON.stringify(t)); this.newTpl = false },
    startNew() { this.newTpl = true; this.editTpl = { name: '', description: '', content: '# 新模板\n\n' } },
    cancelEdit() { this.editTpl = null; this.newTpl = false },
    async saveTpl() {
      const t = this.editTpl
      if (!t || !t.name.trim() || !t.content) { this.status = '名称与内容必填'; return }
      const body = { name: t.name.trim(), description: t.description || '', content: t.content }
      const r = this.newTpl
        ? await api('/privhub/api/templates', { method: 'POST', body: JSON.stringify(body) })
        : await api('/privhub/api/templates', { method: 'PUT', body: JSON.stringify({ id: t.id, ...body }) })
      if (r.ok) { this.cancelEdit(); await this.load(); this.status = '✅ 模板已保存' }
      else this.status = r.error || '保存失败'
    },
    async deleteTpl(t) {
      if (!confirm('删除模板「' + t.name + '」？')) return
      const r = await api('/privhub/api/templates', { method: 'DELETE', body: JSON.stringify({ id: t.id }) })
      if (r.ok) { await this.load(); this.status = '✅ 模板已删除' }
      else this.status = r.error || '删除失败'
    },
  },
  async mounted() { await this.load() },
  template: `
    <div class="view-page">
      <div class="view-inner">
        <h2>📝 新建文档</h2>
        <div class="modal-body">
          <div class="field" v-if="!manage">
            <label>目标目录：{{ targetDir }}</label>
            <div style="display:flex;gap:10px">
              <div style="flex:1;display:flex;flex-direction:column;gap:8px;max-height:260px;overflow:auto">
                <div
                  v-for="t in templates" :key="t.id"
                  style="padding:10px 12px;border:1px solid var(--line);border-radius:8px;cursor:pointer"
                  :style="pick === t.id ? 'border-color:var(--accent);background:rgba(90,130,200,.12)' : 'background:var(--panel2)'"
                  @click="pickTemplate(t)"
                >
                  <div style="font-weight:600">{{ t.name }}</div>
                  <div style="font-size:12px;color:var(--muted);margin-top:2px">{{ t.description }}</div>
                </div>
              </div>
              <div style="flex:1">
                <div class="field">
                  <label>文件名（.md）</label>
                  <input v-model="fileName" placeholder="输入文件名…" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text)" />
                </div>
                <div class="field" v-if="picked">
                  <label>模板预览</label>
                  <pre style="max-height:150px;overflow:auto;font-size:12px;background:var(--bg);padding:8px;border-radius:6px;white-space:pre-wrap">{{ picked.content.slice(0, 300) }}{{ picked.content.length > 300 ? '…' : '' }}</pre>
                </div>
              </div>
            </div>
            <div style="display:flex;gap:8px;margin-top:10px;align-items:center">
              <button class="btn btn-primary" style="width:auto" :disabled="creating" @click="create">{{ creating ? '创建中…' : '创建文档' }}</button>
              <button class="small-btn" v-if="isAdmin" @click="manage = true">⚙ 管理模板</button>
              <span style="font-size:12px;color:var(--muted)">{{ status }}</span>
            </div>
          </div>

          <!-- 管理模板 -->
          <div v-else>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <button class="small-btn" @click="manage = false">← 返回新建</button>
              <button class="small-btn" @click="startNew()">＋ 新增模板</button>
            </div>
            <div v-for="t in templates" :key="t.id" style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--line)">
              <span style="flex:1;font-size:13px">📄 {{ t.name }} <span style="color:var(--muted)">{{ t.description }}</span></span>
              <button class="small-btn" @click="startEdit(t)">编辑</button>
              <button class="small-btn danger" @click="deleteTpl(t)">删除</button>
            </div>
            <div v-if="editTpl" style="margin-top:10px;border:1px solid var(--line);border-radius:8px;padding:12px">
              <div class="field"><label>名称</label><input v-model="editTpl.name" style="width:100%;padding:7px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text)" /></div>
              <div class="field"><label>描述</label><input v-model="editTpl.description" style="width:100%;padding:7px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text)" /></div>
              <div class="field"><label>内容（{{date}} 会被替换为当天日期）</label><textarea v-model="editTpl.content" rows="8" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text);font-family:Consolas,monospace;font-size:13px"></textarea></div>
              <div style="display:flex;gap:8px">
                <button class="btn btn-primary" style="width:auto" @click="saveTpl">保存模板</button>
                <button class="btn btn-ghost" @click="cancelEdit">取消</button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="$emit('close')">关 闭</button>
        </div>
      </div>
    </div>
  `,
}

export default {
  id: 'privhub-files-template',
  drawerWidth: 560,
  slots: {
    template: TemplateDoc,
  },
}
