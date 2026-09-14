/**
 * privhub-files-template · client — 新建文档向导（三步）+ 模板管理（挂 template slot）
 *
 * 三步向导（在项目内）：
 *   ① 选择格式（Markdown / 纯文本 / Word / Excel / HTML）
 *   ② 命名文档（自动补扩展名）
 *   ③ 选择保存目录（项目内文件夹树，默认当前目录）
 * 创建后返回文件视图并定位新文件；md 可选模板（{{date}} 替换 + title 注入）。
 * admin 可「管理模板」：新增/编辑/删除。
 *
 * @module privhub-files-template/client
 */

const { api, nav, AUTH, bus, toast } = window.PrivHub

/* 可选格式（ext 用于命名/校验；hint 显示在创建提示） */
const FORMATS = [
  { id: 'md', icon: '📄', label: 'Markdown', ext: '.md', desc: '知识库文档 · 模板 · 双链 · 版本' },
  { id: 'txt', icon: '📝', label: '纯文本', ext: '.txt', desc: '普通文本，内嵌编辑' },
  { id: 'docx', icon: '📘', label: 'Word 文档', ext: '.docx', desc: '富文本（.docx）' },
  { id: 'xlsx', icon: '📊', label: 'Excel 表格', ext: '.xlsx', desc: '电子表格' },
  { id: 'html', icon: '🌐', label: 'HTML 页面', ext: '.html', desc: '网页展示页' },
]

/* 名称非法字符（Windows 文件系统保留） */
const BAD_NAME = /[\\/:*?"<>|]/

const TemplateDoc = {
  name: 'template-doc',
  data() {
    return {
      nav,
      formats: FORMATS,
      badNameRe: BAD_NAME,
      step: 1,               // 1 格式 → 2 名称 → 3 目录
      fmt: 'md',
      templates: [],
      pick: '',              // md 模板 id（'' = 空白文档）
      fileName: '',
      dirTree: [],           // [{ name, path, depth }]
      dirLoading: false,
      dir: '',               // 保存目录（项目内相对路径，'' = 项目根）
      creating: false,
      status: '',
      manage: false,
      editTpl: null,
      newTpl: false,
    }
  },
  computed: {
    isAdmin() { const u = AUTH.user; return u && u.role === 'admin' },
    fmtMeta() { return FORMATS.find((f) => f.id === this.fmt) || FORMATS[0] },
    picked() { return this.templates.find((t) => t.id === this.pick) || null },
    projectName() { return nav.project || '（未进入项目）' },
    dirLabel() {
      const p = this.dir || ''
      if (!nav.project) return '（未进入项目）'
      return p ? nav.project + ' / ' + p : nav.project + '（根目录）'
    },
    /* 完整文件名（自动补扩展名） */
    fullName() {
      const base = this.fileName.trim().replace(/\.[^.]+$/, '')
      return base ? base + this.fmtMeta.ext : ''
    },
    canNext1() { return !!this.fmt },
    canNext2() {
      const n = this.fileName.trim()
      if (!n) return false
      if (BAD_NAME.test(n)) return false
      return true
    },
    canNext3() { return this.canNext2 && !this.dirLoading },
  },
  methods: {
    async load() {
      const r = await api('/privhub/api/templates')
      if (r.ok) {
        this.templates = r.templates
        if (this.fmt === 'md') {
          if (!this.templates.find((t) => t.id === this.pick)) this.pick = this.templates.length ? this.templates[0].id : ''
        }
      }
    },
    /* ① 格式 */
    chooseFmt(f) {
      this.fmt = f.id
      if (f.id === 'md') {
        if (!this.templates.find((t) => t.id === this.pick)) this.pick = this.templates.length ? this.templates[0].id : ''
        this.status = ''
      }
    },
    pickTemplate(t) {
      this.pick = t ? t.id : ''
      if (t && !this.fileName.trim()) this.fileName = t.name
    },
    /* ③ 目录树（项目内递归拉取文件夹，深≤8） */
    async loadDirs() {
      if (!nav.project) return
      this.dirLoading = true
      this.dirTree = []
      try {
        const out = []
        const walk = async (dir, depth) => {
          if (depth > 8 || out.length > 400) return
          const r = await api('/privhub/api/list?project=' + encodeURIComponent(nav.project) + (dir ? '&path=' + encodeURIComponent(dir) : ''))
          if (!r.ok) return
          for (const e of r.entries || []) {
            if (!e.isDir || e.isSymbolicLink) continue
            const p = dir ? dir + '/' + e.name : e.name
            out.push({ name: e.name, path: p, depth })
            await walk(p, depth + 1)
          }
        }
        await walk('', 0)
        this.dirTree = out
        // 默认保存位置 = 当前所在目录（存在则选中）
        if (!this.dirTree.find((d) => d.path === (nav.path || ''))) this.dir = ''
      } finally { this.dirLoading = false }
    },
    /* 步骤导航 */
    async next() {
      if (this.step === 1) {
        if (!nav.project) { this.status = '请先进入项目（左上角选择项目）'; return }
        if (!this.canNext1) return
        this.step = 2
        if (!this.fileName.trim()) this.fileName = (this.fmt === 'md' && this.picked) ? this.picked.name : '未命名文档'
        this.status = ''
      } else if (this.step === 2) {
        if (!this.canNext2) { this.status = '请先输入文档名称（不能包含 \\ / : * ? " < > |）'; return }
        this.step = 3
        this.status = ''
        await this.loadDirs()
      }
    },
    back() { if (this.step > 1) { this.step--; this.status = '' } },
    /* ---- 创建 ---- */
    async create() {
      if (!nav.project) { this.status = '请先进入项目'; return }
      if (!this.canNext3) return
      const full = this.fullName
      const base = full.replace(/\.[^.]+$/, '')
      const dir = this.dir || ''
      const rel = dir ? dir + '/' + full : full
      this.creating = true
      this.status = ''
      try {
        // 同名检查（列表取目标目录）
        const list = await api('/privhub/api/list?project=' + encodeURIComponent(nav.project) + (dir ? '&path=' + encodeURIComponent(dir) : ''))
        if (!list.ok) { this.status = list.error || '无法读取目标目录'; return }
        if ((list.entries || []).some((e) => e.name === full)) { this.status = '「' + full + '」已存在，请换一个名称'; return }
        const today = new Date().toISOString().slice(0, 10)
        let ok = false
        let err = ''
        if (this.fmt === 'md') {
          const t = this.picked
          const content = t && t.content
            ? t.content.replace(/\{\{date\}\}/g, today).replace(/^title: .*$/m, 'title: ' + base)
            : '---\ntitle: ' + base + '\ncreated: ' + today + '\n---\n\n'
          const r = await api('/privhub/api/doc', { method: 'PUT', body: JSON.stringify({ project: nav.project, path: rel, doc: content, baseMtime: 0 }) })
          ok = r.ok; err = r.error || ''
        } else if (this.fmt === 'txt') {
          const r = await api('/privhub/api/text/save', { method: 'POST', body: JSON.stringify({ project: nav.project, path: rel, text: '' }) })
          ok = r.ok; err = r.error || ''
        } else if (this.fmt === 'docx') {
          // 空白 Word 文档（docx 库会把内容中的 _ 转义，故不预填标题文本）
          const r = await api('/privhub/api/office/write', { method: 'POST', body: JSON.stringify({ project: nav.project, path: rel, content: '' }) })
          ok = r.ok; err = r.error || ''
        } else if (this.fmt === 'xlsx') {
          const r = await api('/privhub/api/office/write', { method: 'POST', body: JSON.stringify({ project: nav.project, path: rel, content: [['']] }) })
          ok = r.ok; err = r.error || ''
        } else if (this.fmt === 'html') {
          const html = '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n<title>' + base + '</title>\n</head>\n<body style="font-family:system-ui,sans-serif;padding:24px;color:#333">\n  <h1>' + base + '</h1>\n  <p>在此编写你的页面内容……</p>\n</body>\n</html>\n'
          try {
            const res = await fetch('/privhub/api/upload?project=' + encodeURIComponent(nav.project) + '&path=' + encodeURIComponent(dir) + '&name=' + encodeURIComponent(full), {
              method: 'POST', headers: { authorization: 'Bearer ' + AUTH.token, 'content-type': 'application/octet-stream' }, body: new TextEncoder().encode(html),
            })
            const j = await res.json().catch(() => ({}))
            ok = j.ok; err = j.error || ''
          } catch { err = '上传失败（网络错误）' }
        }
        if (!ok) { this.status = err || '创建失败'; return }
        // 成功：返回文件视图 → 刷新 → 定位新文件
        toast('✅ 已创建 ' + this.dirLabel + ' / ' + full)
        this.status = '✅ 已创建 ' + this.dirLabel + ' / ' + full
        await nav.openDir(nav.project, dir)
        // 通知文件面板刷新目录树缓存
        setTimeout(() => bus.emit('files:refresh'), 600)
        const e = (nav.entries || []).find((x) => x.name === full)
        if (e) nav.selectEntry(e)
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
  async mounted() {
    this.dir = nav.path || ''
    await this.load()
  },
  template: `
    <div class="view-page">
      <div class="view-inner" style="max-width:720px">
        <h2>📝 新建文档</h2>
        <div class="modal-body">
          <template v-if="!manage">
            <!-- 步骤指示 -->
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;font-size:12.5px">
              <span :style="{ fontWeight: step >= 1 ? 700 : 400, color: step >= 1 ? 'var(--accent)' : 'var(--muted)' }">① 选择格式</span>
              <span style="color:var(--line)">→</span>
              <span :style="{ fontWeight: step >= 2 ? 700 : 400, color: step >= 2 ? 'var(--accent)' : 'var(--muted)' }">② 命名文档</span>
              <span style="color:var(--line)">→</span>
              <span :style="{ fontWeight: step >= 3 ? 700 : 400, color: step >= 3 ? 'var(--accent)' : 'var(--muted)' }">③ 保存位置</span>
              <span style="flex:1"></span>
              <span style="color:var(--muted)">项目：{{ projectName }}</span>
            </div>

            <!-- ① 格式 -->
            <div v-if="step === 1">
              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">
                <div
                  v-for="f in formats"
                  :key="f.id"
                  class="wiz-fmt-card"
                  @click="chooseFmt(f)"
                  style="padding:12px;border:1px solid var(--line);border-radius:10px;cursor:pointer;display:flex;gap:10px;align-items:center"
                  :style="fmt === f.id ? 'border-color:var(--accent);background:rgba(90,130,200,.12)' : 'background:var(--panel2)'"
                >
                  <span style="font-size:22px">{{ f.icon }}</span>
                  <span style="min-width:0">
                    <span style="display:block;font-weight:600">{{ f.label }}</span>
                    <span style="display:block;font-size:11.5px;color:var(--muted);margin-top:2px">{{ f.desc }}</span>
                  </span>
                </div>
              </div>
              <!-- md 模板快速选择 -->
              <div v-if="fmt === 'md'" style="margin-top:12px">
                <div style="font-size:12px;color:var(--muted);margin-bottom:6px">套用模板（可选，也可选「空白文档」）：</div>
                <div style="display:flex;flex-wrap:wrap;gap:6px">
                  <span
                    class="wiz-tpl-chip"
                    @click="pickTemplate(null)"
                    style="padding:4px 10px;border-radius:14px;border:1px solid var(--line);cursor:pointer;font-size:12px"
                    :style="pick === '' ? 'border-color:var(--accent);background:rgba(90,130,200,.14);color:var(--accent)' : 'background:var(--panel2);color:var(--muted)'"
                  >⬜ 空白文档</span>
                  <span
                    v-for="t in templates" :key="t.id"
                    class="wiz-tpl-chip"
                    @click="pickTemplate(t)"
                    style="padding:4px 10px;border-radius:14px;border:1px solid var(--line);cursor:pointer;font-size:12px"
                    :style="pick === t.id ? 'border-color:var(--accent);background:rgba(90,130,200,.14);color:var(--accent)' : 'background:var(--panel2);color:var(--muted)'"
                    :title="t.description"
                  >{{ t.name }}</span>
                </div>
              </div>
              <div style="color:var(--muted);font-size:12px;margin-top:10px">将创建 <strong>{{ fmtMeta.ext }}</strong> 格式文档（保存位置在下一步选择）</div>
            </div>

            <!-- ② 名称 -->
            <div v-else-if="step === 2" class="field">
              <label>文档名称（无需输入扩展名，将保存为 .{{ fmt }} 文件）</label>
              <input
                v-model="fileName"
                @keyup.enter="next()"
                placeholder="例如：写作计划 / 项目复盘 / 待办清单"
                style="width:100%;padding:9px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text);font-size:14px;outline:none"
              />
              <div style="margin-top:6px;font-size:12px;color:var(--muted)">
                将创建：<strong style="color:var(--accent)">{{ fullName || '（输入名称后显示）' }}</strong>
              </div>
              <div v-if="fileName.trim() && badNameRe.test(fileName.trim())" style="margin-top:4px;font-size:12px;color:var(--danger)">名称不能包含 \\ / : * ? " &lt; &gt; | 字符</div>
              <div v-if="picked" style="margin-top:12px;border:1px solid var(--line);border-radius:8px;padding:8px 10px;background:var(--panel2)">
                <div style="font-size:12px;color:var(--muted);margin-bottom:4px">模板「{{ picked.name }}」预览：</div>
                <pre style="max-height:130px;overflow:auto;font-size:12px;background:var(--bg);padding:8px;border-radius:6px;white-space:pre-wrap;margin:0">{{ picked.content.slice(0, 220) }}{{ picked.content.length > 220 ? '…' : '' }}</pre>
              </div>
            </div>

            <!-- ③ 保存位置 -->
            <div v-else-if="step === 3">
              <label>保存到「{{ projectName }}」中的目录：</label>
              <div v-if="dirLoading" style="color:var(--muted);font-size:12.5px;padding:12px 0">正在加载目录…</div>
              <div v-else style="border:1px solid var(--line);border-radius:8px;max-height:300px;overflow:auto;margin-top:6px;background:var(--panel2)">
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:7px 10px;border-bottom:1px dashed var(--line)" :style="{ background: dir === '' ? 'rgba(90,130,200,.12)' : '' }">
                  <input type="radio" v-model="dir" value="" /> 🏠 项目根目录
                </label>
                <label
                  v-for="d in dirTree" :key="d.path"
                  style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:7px 10px;border-bottom:1px dashed var(--line)"
                  :style="{ paddingLeft: (10 + d.depth * 18) + 'px', background: dir === d.path ? 'rgba(90,130,200,.12)' : '' }"
                >
                  <input type="radio" v-model="dir" :value="d.path" /> 📁 {{ d.name }}
                </label>
              </div>
              <div style="margin-top:6px;font-size:12px;color:var(--muted)">新文件：{{ dirLabel }} / {{ fullName }}</div>
            </div>

            <div style="display:flex;gap:8px;margin-top:14px;align-items:center">
              <button v-if="step > 1" class="btn btn-ghost" style="width:auto" @click="back">← 上一步</button>
              <button v-if="step < 3" class="btn btn-primary" style="width:auto" :disabled="(step === 1 && !canNext1) || (step === 2 && !canNext2)" @click="next()">下一步 →</button>
              <button v-else class="btn btn-primary" style="width:auto" :disabled="creating || !canNext3" @click="create()">{{ creating ? '创建中…' : '✅ 创建文档' }}</button>
              <button class="small-btn" v-if="isAdmin" @click="manage = true">⚙ 管理模板</button>
              <span style="font-size:12px;color:var(--muted)">{{ status }}</span>
            </div>
          </template>

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
              <!-- 显示 bug 修复：此处意在【字面展示】占位符 {{date}}，但 Vue 会把它当插值编译，
                   而该组件并无 date 变量 → 渲染成空白，用户看不到「模板里要写 {{date}}」这条关键提示。
                   用 v-pre 让该 label 跳过编译。 -->
              <div class="field"><label v-pre>内容（{{date}} 会被替换为当天日期）</label><textarea v-model="editTpl.content" rows="8" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text);font-family:Consolas,monospace;font-size:13px"></textarea></div>
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
  drawerWidth: 620,
  slots: {
    template: TemplateDoc,
    /* 管理控制台「内容治理 > 模板管理」用同一组件渲染（同一份实现、两处入口） */
    'admin-template': TemplateDoc,
  },
}
