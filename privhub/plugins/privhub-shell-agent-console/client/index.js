/**
 * privhub-shell-agent-console · client — 智能体接入开发者平台（agent-view slot）
 *
 * 形态参考微信公众号平台的开发者配置页：左「接入信息」右「密钥与文档」，
 * 明文密钥只在签发瞬间显示一次。
 *
 * 两条通道严格分开：
 *   - 本页面 = 人用的网页登录态（AUTH.token），不受密钥状态影响；
 *   - 智能体 = X-Agent-Key，只能经 /privhub/api/agent/v1/* 读授权范围内的数据。
 *
 * @module privhub-shell-agent-console/client
 */

const { api, AUTH } = window.PrivHub
const toast = (m, t) => window.PrivHub.toast(m, t)

const AgentConsole = {
  name: 'agent-console',
  data() {
    return {
      loading: true,
      err: '',
      info: null,
      // 新建密钥表单
      form: { name: '', scopeKind: 'project', scopeProject: '', ipWhitelist: '' },
      // 管理员代签表单
      adminForm: { name: '', username: '', scopeKind: 'project', scopeProject: '' },
      showAdminCreate: false,
      // 明文密钥：只在签发后展示一次，刷新即消失
      freshKey: '',
      freshKeyName: '',
      busy: false,
      docs: null,
      docsOpen: false,
      tab: 'keys',
    }
  },
  computed: {
    isAdmin() { return AUTH.user && AUTH.user.role === 'admin' },
    projects() { return (window.PrivHub.nav && window.PrivHub.nav.projectsList) || [] },
    canCreate() { return this.form.name.trim() !== '' && this.form.scopeProject !== '' },
    myKeys() { return (this.info && this.info.myKeys) || [] },
    allKeys() { return (this.info && this.info.allKeys) || [] },
  },
  async mounted() { await this.load() },
  methods: {
    statusText(s) {
      return ({ active: '正常', suspended: '已挂起', revoked: '已吊销', expired: '已过期' })[s] || s
    },
    statusClass(s) {
      return s === 'active' ? 'on' : 'off'
    },
    scopeText(sc) {
      if (!sc) return '—'
      if (sc.kind === 'all') return '全部可见项目'
      if (sc.kind === 'directory') return sc.project + ' / ' + (sc.path || '根')
      return sc.project
    },
    fmtTime(ms) {
      if (!ms) return '—'
      const d = new Date(ms)
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    },
    fmtUsed(k) {
      if (!k.lastUsedAt) return '从未调用'
      return '调用 ' + (k.usageCount || 0) + ' 次 · 最近 ' + this.fmtTime(k.lastUsedAt)
    },

    async load() {
      this.loading = true
      this.err = ''
      try {
        const r = await api('/privhub/api/agent/v1/console')
        if (!r.ok) { this.err = r.error || '加载失败'; return }
        this.info = r
        if (!this.form.scopeProject && this.projects.length) this.form.scopeProject = this.projects[0]
      } catch (e) {
        this.err = '网络错误：' + (e && e.message ? e.message : e)
      } finally {
        this.loading = false
      }
    },

    async createKey() {
      if (this.busy) return
      if (!this.form.name.trim()) { toast('请填写密钥名称', 'error'); return }
      if (this.form.scopeKind !== 'all' && !this.form.scopeProject) { toast('请选择授权项目', 'error'); return }
      this.busy = true
      try {
        const body = {
          name: this.form.name.trim(),
          scope: this.form.scopeKind === 'all'
            ? { kind: 'all' }
            : { kind: 'project', project: this.form.scopeProject },
          ipWhitelist: this.form.ipWhitelist.trim()
            ? this.form.ipWhitelist.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean)
            : [],
        }
        const r = await api('/privhub/api/agent/v1/my-keys', { method: 'POST', body: JSON.stringify(body) })
        if (!r.ok) { toast(r.error || '签发失败', 'error'); return }
        this.freshKey = r.key
        this.freshKeyName = r.name || body.name
        this.form.name = ''
        await this.load()
        toast('密钥已签发，请立即复制保存')
      } finally { this.busy = false }
    },

    async revokeKey(k) {
      if (!confirm('确认吊销密钥「' + k.name + '」？\n\n吊销后该密钥立即失效，使用它的智能体将无法再访问。此操作不可撤销。')) return
      const r = await api('/privhub/api/agent/v1/my-keys', { method: 'DELETE', body: JSON.stringify({ id: k.id }) })
      if (!r.ok) { toast(r.error || '吊销失败', 'error'); return }
      toast('已吊销')
      await this.load()
    },

    async adminCreate() {
      if (this.busy) return
      const f = this.adminForm
      if (!f.username.trim()) { toast('请填写绑定账号', 'error'); return }
      if (f.scopeKind !== 'all' && !f.scopeProject) { toast('请选择授权项目', 'error'); return }
      this.busy = true
      try {
        const body = {
          name: f.name.trim() || ('agent-key-' + Date.now().toString(36)),
          username: f.username.trim(),
          scope: f.scopeKind === 'all' ? { kind: 'all' } : { kind: 'project', project: f.scopeProject },
        }
        const r = await api('/privhub/api/agent/v1/keys', { method: 'POST', body: JSON.stringify(body) })
        if (!r.ok) { toast(r.error || '签发失败', 'error'); return }
        this.freshKey = r.key
        this.freshKeyName = r.name
        this.showAdminCreate = false
        await this.load()
        toast('密钥已签发，请立即复制保存')
      } finally { this.busy = false }
    },

    async adminOp(op, k) {
      const label = ({ revoke: '吊销', suspend: '挂起', resume: '恢复', rotate: '轮换' })[op] || op
      if (!confirm('确认' + label + '密钥「' + k.name + '」？')) return
      const r = await api('/privhub/api/agent/v1/keys/' + op, { method: 'POST', body: JSON.stringify({ id: k.id }) })
      if (!r.ok) { toast(r.error || (label + '失败'), 'error'); return }
      if (op === 'rotate' && r.key) {
        this.freshKey = r.key
        this.freshKeyName = k.name + '（轮换后）'
      }
      toast('已' + label)
      await this.load()
    },

    async copyKey() {
      if (!this.freshKey) return
      try { await navigator.clipboard.writeText(this.freshKey); toast('已复制到剪贴板') } catch { toast('复制失败，请手动选中复制', 'warn') }
    },
    dismissKey() { this.freshKey = ''; this.freshKeyName = '' },

    async loadDocs() {
      if (this.docs) { this.docsOpen = !this.docsOpen; return }
      const r = await api('/privhub/api/agent/v1/schema')
      if (!r.ok) { toast(r.error || '接口文档加载失败', 'error'); return }
      this.docs = r
      this.docsOpen = true
    },
    curlSample(k) {
      const base = location.origin
      return 'curl -H "X-Agent-Key: ' + (k ? '<你的密钥>' : 'pha_xxx') + '" ' + base + '/privhub/api/agent/v1/me'
    },
  },
  template: `
    <div class="view-page">
      <div class="view-inner">
        <h2>🔌 智能体接入</h2>
        <div v-if="loading" class="v3-loading">正在加载…</div>
        <div v-else-if="err" class="v3-loading">{{ err }}</div>
        <template v-else>
          <div class="modal-body">

            <!-- 接入信息 -->
            <div class="ac-card">
              <div class="ac-card-title">接入信息</div>
              <div class="ac-grid">
                <div class="ac-kv"><span class="k">密钥请求头</span><span class="v">X-Agent-Key</span></div>
                <div class="ac-kv"><span class="k">密钥前缀</span><span class="v">{{ info.keyPrefix }}…</span></div>
                <div class="ac-kv"><span class="k">有效期</span><span class="v">自然月（每月末自动失效，到期前可轮换）</span></div>
                <div class="ac-kv"><span class="k">项目权限</span><span class="v">只读（智能体不可写入任何项目）</span></div>
                <div class="ac-kv"><span class="k">沙箱（可写）</span>
                  <span class="v">
                    <template v-if="info.sandbox"><code>{{ info.sandboxPath }}</code> · 仅你本人可见</template>
                    <template v-else>—</template>
                  </span>
                </div>
              </div>
              <div v-if="info.sandboxHint" class="ac-warn">{{ info.sandboxHint }}</div>
              <div class="ac-hint">
                智能体只能经 <code>/privhub/api/agent/v1/*</code> 携带密钥读取<b>授权范围内</b>的信息；
                它无法用网页地址读取页面或越权访问其他项目——所有请求都会在服务端逐次校验密钥范围、
                账号权限与文件级 ACL。
              </div>
            </div>

            <!-- 明文密钥（仅一次） -->
            <div v-if="freshKey" class="ac-card ac-fresh">
              <div class="ac-card-title">🔑 密钥「{{ freshKeyName }}」已签发</div>
              <div class="ac-hint" style="color:var(--warn)">
                明文<b>只显示这一次</b>，关闭后无法再次查看。请立即复制并妥善保存。
              </div>
              <div class="ac-keyrow">
                <code class="ac-key">{{ freshKey }}</code>
                <button class="btn btn-primary" style="width:auto" @click="copyKey">复制</button>
                <button class="btn btn-ghost" @click="dismissKey">我已保存</button>
              </div>
            </div>

            <!-- 标签页 -->
            <div class="ac-tabs">
              <div class="ac-tab" :class="{ on: tab === 'keys' }" @click="tab = 'keys'">我的密钥</div>
              <div class="ac-tab" :class="{ on: tab === 'docs' }" @click="tab = 'docs'; loadDocs()">接口文档</div>
              <div v-if="isAdmin" class="ac-tab" :class="{ on: tab === 'admin' }" @click="tab = 'admin'">全部密钥（管理员）</div>
            </div>

            <!-- 我的密钥 -->
            <template v-if="tab === 'keys'">
              <div class="ac-card">
                <div class="ac-card-title">签发新密钥</div>
                <div class="ac-form">
                  <div class="field" style="flex:1;min-width:160px">
                    <label>名称</label>
                    <input v-model="form.name" placeholder="例如：我的知识库助手" />
                  </div>
                  <div class="field" style="flex:1;min-width:150px">
                    <label>授权范围</label>
                    <select v-model="form.scopeProject" :disabled="form.scopeKind === 'all'">
                      <option v-for="p in projects" :key="p" :value="p">{{ p }}</option>
                    </select>
                  </div>
                  <div class="field" style="flex:1;min-width:170px">
                    <label>IP 白名单（可选，逗号分隔）</label>
                    <input v-model="form.ipWhitelist" placeholder="192.168.1.0/24" />
                  </div>
                  <button class="btn btn-primary" style="width:auto;align-self:flex-end" :disabled="busy || !canCreate" @click="createKey">签 发</button>
                </div>
                <div class="ac-hint">
                  自助密钥只能授权到<b>单个项目</b>。需要访问全部项目，请让管理员在「全部密钥」中签发。
                </div>
              </div>

              <table class="u-table">
                <thead><tr><th>名称</th><th>密钥</th><th>授权范围</th><th>状态</th><th>到期</th><th>使用情况</th><th>操作</th></tr></thead>
                <tbody>
                  <tr class="u-row" v-for="k in myKeys" :key="k.id">
                    <td>{{ k.name }}</td>
                    <td><code>{{ k.keyMask }}</code></td>
                    <td>{{ scopeText(k.scope) }}</td>
                    <td><span class="ac-status" :class="statusClass(k.status)">{{ statusText(k.status) }}</span></td>
                    <td>{{ fmtTime(k.expiresAt) }}</td>
                    <td class="ac-dim">{{ fmtUsed(k) }}</td>
                    <td>
                      <button class="small-btn danger" v-if="k.status !== 'revoked'" @click="revokeKey(k)">吊销</button>
                      <span v-else class="ac-dim">—</span>
                    </td>
                  </tr>
                  <tr v-if="!myKeys.length"><td colspan="7" class="ac-dim" style="text-align:center;padding:16px">还没有密钥，用上面的表单签发一把</td></tr>
                </tbody>
              </table>
            </template>

            <!-- 接口文档 -->
            <template v-else-if="tab === 'docs'">
              <div v-if="docs && docsOpen" class="ac-card">
                <div class="ac-card-title">接口清单（{{ (docs.tools || []).length }} 个端点）</div>
                <table class="u-table">
                  <thead><tr><th>接口</th><th>方法</th><th>路径</th><th>说明</th></tr></thead>
                  <tbody>
                    <tr class="u-row" v-for="t in docs.tools" :key="t.name">
                      <td><code>{{ t.name }}</code></td>
                      <td>{{ t.method }}</td>
                      <td><code class="ac-dim">{{ t.path }}</code></td>
                      <td>{{ t.desc }}</td>
                    </tr>
                  </tbody>
                </table>
                <div class="ac-card-title" style="margin-top:18px">错误码</div>
                <div class="ac-codes">
                  <div v-for="c in docs.errorCodes" :key="c.code" class="ac-code">
                    <code>{{ c.code }}</code><span>{{ c.desc }}</span>
                  </div>
                </div>
                <div class="ac-card-title" style="margin-top:18px">快速开始</div>
                <pre class="ac-pre">{{ curlSample() }}</pre>
                <div class="ac-hint">把 <code>pha_xxx</code> 换成你在「我的密钥」里签发的明文密钥。</div>
              </div>
              <div v-else class="v3-loading">正在加载接口文档…</div>
            </template>

            <!-- 全部密钥（管理员） -->
            <template v-else-if="tab === 'admin' && isAdmin">
              <div class="ac-card">
                <div class="ac-card-title" style="display:flex;align-items:center">
                  <span>签发密钥（可指定任意账号与范围，含全部项目）</span>
                  <button class="small-btn" style="margin-left:auto" @click="showAdminCreate = !showAdminCreate">{{ showAdminCreate ? '收起' : '展开' }}</button>
                </div>
                <div v-if="showAdminCreate" class="ac-form">
                  <div class="field" style="flex:1;min-width:140px">
                    <label>绑定账号（用户名）</label>
                    <input v-model="adminForm.username" placeholder="例如 maquanbin" />
                  </div>
                  <div class="field" style="flex:1;min-width:140px">
                    <label>名称</label>
                    <input v-model="adminForm.name" placeholder="可留空" />
                  </div>
                  <div class="field" style="flex:1;min-width:150px">
                    <label>范围类型</label>
                    <select v-model="adminForm.scopeKind">
                      <option value="project">单个项目</option>
                      <option value="all">全部可见项目</option>
                    </select>
                  </div>
                  <div class="field" style="flex:1;min-width:150px">
                    <label>项目</label>
                    <select v-model="adminForm.scopeProject" :disabled="adminForm.scopeKind === 'all'">
                      <option v-for="p in projects" :key="p" :value="p">{{ p }}</option>
                    </select>
                  </div>
                  <button class="btn btn-primary" style="width:auto;align-self:flex-end" :disabled="busy" @click="adminCreate">签 发</button>
                </div>
              </div>

              <table class="u-table">
                <thead><tr><th>名称</th><th>绑定账号</th><th>密钥</th><th>范围</th><th>状态</th><th>到期</th><th>使用情况</th><th>操作</th></tr></thead>
                <tbody>
                  <tr class="u-row" v-for="k in allKeys" :key="k.id">
                    <td>{{ k.name }}</td>
                    <td>{{ k.username }}</td>
                    <td><code>{{ k.keyMask }}</code></td>
                    <td>{{ scopeText(k.scope) }}</td>
                    <td><span class="ac-status" :class="statusClass(k.status)">{{ statusText(k.status) }}</span></td>
                    <td>{{ fmtTime(k.expiresAt) }}</td>
                    <td class="ac-dim">{{ fmtUsed(k) }}</td>
                    <td style="white-space:nowrap">
                      <button class="small-btn" v-if="k.status === 'active'" @click="adminOp('suspend', k)">挂起</button>
                      <button class="small-btn" v-if="k.status === 'suspended'" @click="adminOp('resume', k)">恢复</button>
                      <button class="small-btn" v-if="k.status !== 'revoked'" @click="adminOp('rotate', k)">轮换</button>
                      <button class="small-btn danger" v-if="k.status !== 'revoked'" @click="adminOp('revoke', k)">吊销</button>
                    </td>
                  </tr>
                  <tr v-if="!allKeys.length"><td colspan="8" class="ac-dim" style="text-align:center;padding:16px">暂无密钥</td></tr>
                </tbody>
              </table>
            </template>

          </div>
        </template>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="$emit('close')">关 闭</button>
        </div>
      </div>
    </div>
  `,
}

export default {
  id: 'privhub-shell-agent-console',
  slots: {
    'agent-view': AgentConsole,
  },
}
