/**
 * privhub-admin-acl · client — 细粒度权限管理（挂 acl slot，模态形态）
 *
 * 管理员流程：选项目 → 浏览目录树 → 选中文件/目录 → 选择角色与策略
 * （🔓 允许 / 🔒 禁止 / 👁 只读）→ 保存；或删除现有规则。
 * 规则继承：父目录规则自动作用于子项，可在子项上覆盖。
 *
 * 通信：window.PrivHub.api 调后端；根元素 modal-mask，点击遮罩或「关闭」
 * 时 $emit('close')，由骨架关闭弹窗（与 admin 用户管理同范式）。
 *
 * @module privhub-admin-acl/client
 */

const { api } = window.PrivHub

const AclAdmin = {
  name: 'acl-admin',
  data() {
    return {
      projects: [],
      project: '',
      path: '',            // 当前浏览的目录路径（'' = 项目根）
      crumbs: [],          // 面包屑（path 分段）
      entries: [],         // 当前目录条目
      selected: null,      // 选中的文件/目录 { name, isDir }
      rules: [],           // 全部规则（按 project+path 过滤展示）
      role: 'user',
      mode: 'deny',
      saving: false,
      loading: false,
    }
  },
  computed: {
    selTarget() {
      return this.selected ? (this.project ? this.project : '') + (this.path ? '/' + this.path : '') + (this.selected ? '/' + this.selected.name : '') : ''
    },
    selRules() {
      if (!this.selected) return []
      const target = (this.path ? this.path + '/' : '') + this.selected.name
      const exact = this.rules.filter((r) => r.project === this.project && r.path === target)
      // 展示精确规则 + 继承来源（父目录规则）
      const inherited = this.rules.filter((r) => r.project === this.project && r.path !== target && target.startsWith((r.path ? r.path + '/' : '')) && r.path !== '')
      return { exact, inherited }
    },
  },
  methods: {
    modeLabel(m) {
      if (m === 'deny') return '🔒 禁止（拒绝全部）'
      if (m === 'allow') return '🔓 允许（读写放行）'
      return '👁 只读（可看不可改）'
    },
    actionText(a) {
      if (a === 'upload') return '上传/新建'
      if (a === 'edit') return '重命名/移动'
      if (a === 'delete') return '删除'
      return '全部操作'
    },
    ruleText(r) {
      const who = r.role === '' ? '所有人' : (r.role === 'admin' ? '管理员' : '普通用户')
      const act = this.actionText(r.action)
      return (r.allow ? '✅ 允许' : '⛔ 拒绝') + ' · ' + who + ' · ' + act
    },
    async loadProjects() {
      const r = await api('/privhub/api/projects')
      if (r.ok) this.projects = r.projects
    },
    async loadRules() {
      const r = await api('/privhub/api/acl/rules')
      if (r.ok) this.rules = r.rules
    },
    async openProject(p) {
      this.project = p
      this.path = ''
      this.crumbs = []
      this.selected = null
      await this.browse('')
    },
    async browse(subPath) {
      this.loading = true
      try {
        const r = await api('/privhub/api/list?project=' + encodeURIComponent(this.project) + '&path=' + encodeURIComponent(subPath))
        if (r.ok) {
          this.path = subPath
          this.crumbs = subPath === '' ? [] : subPath.split('/')
          this.entries = r.entries
          this.selected = null
        } else {
          window.PrivHub.toast(r.error || '读取目录失败', 'error')
        }
      } finally { this.loading = false }
    },
    async enterDir(e) {
      const next = this.path ? this.path + '/' + e.name : e.name
      await this.browse(next)
    },
    crumbGo(i) {
      const parts = this.crumbs.slice(0, i + 1)
      void this.browse(parts.join('/'))
    },
    select(e) { this.selected = e },
    async savePolicy() {
      if (!this.selected) { window.PrivHub.toast('请先选中文件或文件夹', 'error'); return }
      this.saving = true
      try {
        const target = (this.path ? this.path + '/' : '') + this.selected.name
        const r = await api('/privhub/api/acl/policy', {
          method: 'POST',
          body: JSON.stringify({ project: this.project, path: target, target: this.selected.isDir ? 'dir' : 'file', role: this.role, mode: this.mode }),
        })
        if (r.ok) { await this.loadRules(); window.PrivHub.toast('已保存：' + this.selTarget + ' → ' + this.modeLabel(this.mode)) }
        else window.PrivHub.toast(r.error || '保存失败', 'error')
      } finally { this.saving = false }
    },
    async removeRule(id) {
      if (!confirm('确认删除这条规则？')) return
      const r = await api('/privhub/api/acl/rules', { method: 'DELETE', body: JSON.stringify({ id }) })
      if (r.ok) await this.loadRules()
      else window.PrivHub.toast(r.error || '删除失败', 'error')
    },
  },
  async mounted() {
    await this.loadProjects()
    await this.loadRules()
  },
  template: `
    <div class="drawer-mask" @click.self="$emit('close')">
      <div class="drawer">
        <h2>🔒 细粒度权限（ACL）</h2>
        <div class="modal-body">
          <div class="field">
            <label>选择项目</label>
            <select v-model="project" style="width:100%;padding:9px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text)" @change="openProject(project)">
              <option value="" disabled>请选择项目…</option>
              <option v-for="p in projects" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>

          <template v-if="project">
            <div class="field">
              <label>目录浏览（点击文件夹进入；点击文件/文件夹选中）</label>
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;font-size:13px">
                <span class="crumb" style="cursor:pointer;color:var(--accent)" @click="browse('')">📁 {{ project }}</span>
                <template v-for="(c, i) in crumbs" :key="i">
                  <span style="color:var(--muted)">/</span>
                  <span class="crumb" style="cursor:pointer" @click="crumbGo(i)">{{ c }}</span>
                </template>
              </div>
              <div style="max-height:200px;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:6px;background:var(--bg)">
                <div v-if="loading" class="empty" style="padding:12px">加载中…</div>
                <div v-else-if="entries.length === 0" class="empty" style="padding:12px">（空目录）</div>
                <div
                  v-for="e in entries" :key="e.name"
                  style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer"
                  :style="selected && selected.name === e.name ? 'background:rgba(90,130,200,.22)' : ''"
                  @click="e.isDir ? enterDir(e) : select(e)"
                >
                  <span>{{ e.isDir ? '📁' : '📄' }}</span>
                  <span style="flex:1">{{ e.name }}</span>
                  <span v-if="!e.isDir" style="color:var(--muted);font-size:12px">{{ e.type }}</span>
                  <button v-if="e.isDir" class="small-btn" style="padding:2px 8px" @click.stop="select(e)">选此目录</button>
                </div>
              </div>
              <div v-if="selected" style="margin-top:8px;font-size:13px;color:var(--accent)">
                ✅ 已选中：{{ project }}/{{ selTarget }}
              </div>
            </div>

            <div class="field" v-if="selected">
              <label>设置策略</label>
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                <select v-model="role" style="padding:8px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text)">
                  <option value="user">普通用户</option>
                  <option value="">所有人（含管理员，慎用）</option>
                </select>
                <select v-model="mode" style="padding:8px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text)">
                  <option value="deny">🔒 禁止</option>
                  <option value="read">👁 只读</option>
                  <option value="allow">🔓 允许</option>
                </select>
                <button class="btn btn-primary" style="width:auto" :disabled="saving" @click="savePolicy">{{ saving ? '保存中…' : '保存策略' }}</button>
              </div>
              <div style="font-size:12px;color:var(--muted);margin-top:6px">
                子目录/文件默认继承本目录规则；可在子项上再设策略覆盖。「只读」= 可浏览/预览/下载，禁止上传、重命名、移动、删除。
              </div>
            </div>

            <div class="field" v-if="selected && selRules.exact.length">
              <label>当前目标上的精确规则（点击删除）</label>
              <div v-for="r in selRules.exact" :key="r.id" style="display:flex;align-items:center;gap:8px;padding:4px 0">
                <span style="flex:1;font-size:13px">{{ ruleText(r) }}</span>
                <button class="small-btn danger" @click="removeRule(r.id)">删除</button>
              </div>
            </div>
            <div class="field" v-if="selected && selRules.inherited.length">
              <label>继承自父目录的规则</label>
              <div v-for="r in selRules.inherited" :key="r.id" style="font-size:12px;color:var(--muted);padding:2px 0">
                {{ r.path === '' ? '（项目根）' : r.path }} → {{ ruleText(r) }}
              </div>
            </div>
          </template>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="$emit('close')">关 闭</button>
        </div>
      </div>
    </div>
  `,
}

export default {
  id: 'privhub-admin-acl',
  drawerWidth: 640,
  slots: {
    acl: AclAdmin,
  },
}
