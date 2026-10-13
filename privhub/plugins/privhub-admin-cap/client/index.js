/**
 * privhub-admin-cap · client —— 「功能权限开关」管理面板（挂 admin-cap slot）
 *
 * 位置：管理控制台 → 系统运维 → 功能权限（由 admin-console/routes.js 指过来；
 * 本插件只声明 slot 与 admin-nav barItem，不认识控制台本身）。
 *
 * 界面就一块表：**功能 × 普通用户级别**（不可用 / 只读 / 可读写）。
 * 管理员那一列恒为「可读写」，只读展示 —— 用户口径是「系统内部功能对管理员全部开放」，
 * 所以表里只配普通用户这一列，改起来是单点、可逆。
 *
 * 默认值口径（重要）：每一项的默认值**等于本功能上线前的实际行为**（见 svc-cap/core.ts）。
 * 所以「恢复默认」不是「全部关掉」，而是回到系统原本的样子；界面上标「已改」的即为偏离默认。
 *
 * @module privhub-admin-cap/client
 */

const { api } = window.PrivHub

const CapPanel = {
  name: 'admin-cap',
  data() {
    return {
      features: [],
      levels: ['none', 'read', 'write'],
      levelLabel: { none: '不可用', read: '只读', write: '可读写' },
      corrupt: false,
      loading: false,
      busy: false,
      msg: '',
      msgKind: 'info',
      /** 编辑中的表（功能 id → 级别）；载入时从 features 拷一份，保存时提交。 */
      draft: {},
      btnPrimary: 'padding:6px 14px;border-radius:6px;border:none;background:var(--accent-solid);color:#fff;cursor:pointer;font-size:13px',
      btnStyle: 'padding:6px 14px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text);cursor:pointer;font-size:13px',
      cell: 'padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top',
    }
  },
  computed: {
    /** 按 group 折叠。顺序沿用 FEATURES 的登记顺序（同一组内不重排）。 */
    grouped() {
      const out = []
      const idx = {}
      for (const f of this.features) {
        if (idx[f.group] === undefined) { idx[f.group] = out.length; out.push({ name: f.group, items: [] }) }
        out[idx[f.group]].items.push(f)
      }
      return out
    },
    /** 草稿相对默认值改了几项（顶部提示用）。 */
    changedCount() {
      return this.features.filter((f) => this.draft[f.id] !== f.userDefault).length
    },
  },
  methods: {
    say(text, kind) { this.msg = text; this.msgKind = kind || 'info' },

    /** 该功能当前草稿是否偏离默认。 */
    dirty(id) {
      const f = this.features.find((x) => x.id === id)
      return !!f && this.draft[id] !== f.userDefault
    },

    async load() {
      this.loading = true
      try {
        const r = await api('/privhub/api/cap/list')
        if (!r.ok) { this.say(r.error || '加载失败', 'error'); return }
        this.features = r.features || []
        this.levels = r.levels || this.levels
        this.corrupt = !!r.corrupt
        this.draft = {}
        for (const f of this.features) this.draft[f.id] = f.userLevel
        if (this.corrupt) this.say('功能开关配置此前读取失败（已隔离存证）：改动会被拒绝，请先人工处理 data/capabilities.json', 'error')
      } finally { this.loading = false }
    },

    async save() {
      this.busy = true
      try {
        const r = await api('/privhub/api/cap/save', { method: 'POST', body: JSON.stringify({ table: this.draft }) })
        if (!r.ok) { this.say(r.error || '保存失败', 'error'); return }
        this.features = r.features || this.features
        this.draft = {}
        for (const f of this.features) this.draft[f.id] = f.userLevel
        const n = (r.changed || []).length
        this.say(n ? '已保存（' + n + ' 项变更）' : '已保存（无变化）', 'ok')
      } finally { this.busy = false }
    },

    async reset() {
      this.busy = true
      try {
        const r = await api('/privhub/api/cap/reset', { method: 'POST' })
        if (!r.ok) { this.say(r.error || '重置失败', 'error'); return }
        this.features = r.features || this.features
        this.draft = {}
        for (const f of this.features) this.draft[f.id] = f.userLevel
        this.say('已恢复默认（等于系统升级前的行为）', 'ok')
      } finally { this.busy = false }
    },
  },
  mounted() { this.load() },
  template: `
  <div class="view-page"><div class="view-inner">
    <h2 style="margin:0 0 6px">功能权限开关</h2>
    <p style="color:var(--text-dim);font-size:13px;line-height:1.7;margin:0 0 14px">
      管理员**始终拥有全部功能**。这里配置的是<b>普通用户</b>能用哪些功能（每项：不可用 / 只读 / 可读写）。
      默认值 = 本功能上线前的实际行为，标「已改」的即为偏离默认。改完点保存即刻生效。
    </p>
    <div v-if="corrupt" style="padding:8px 12px;border-radius:6px;background:rgba(220,80,80,.12);color:#c0392b;margin-bottom:12px;font-size:13px">
      配置文件此前读取失败（已隔离存证），当前显示的是默认值，保存会被拒绝。
    </div>
    <div v-if="msg" style="padding:8px 12px;border-radius:6px;margin-bottom:12px;font-size:13px"
         :style="msgKind==='error' ? 'background:rgba(220,80,80,.12);color:#c0392b' : (msgKind==='ok' ? 'background:rgba(60,180,120,.14);color:#1e7e46' : 'background:var(--bg-soft)')">
      {{ msg }}
    </div>

    <div v-for="g in grouped" :key="g.name" style="margin-bottom:18px">
      <h3 style="margin:0 0 6px;font-size:14px">{{ g.name }}</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="color:var(--text-dim);text-align:left">
            <th style="padding:6px 10px;border-bottom:1px solid var(--line)">功能</th>
            <th style="padding:6px 10px;border-bottom:1px solid var(--line);width:110px">管理员</th>
            <th style="padding:6px 10px;border-bottom:1px solid var(--line);width:150px">普通用户</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in g.items" :key="f.id">
            <td :style="cell">
              {{ f.title }}
              <div style="color:var(--text-dim);font-size:12px;margin-top:2px">{{ f.desc }}</div>
            </td>
            <td :style="cell" style="color:var(--text-dim)">可读写</td>
            <td :style="cell">
              <select v-model="draft[f.id]" style="padding:4px 6px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text)">
                <option v-for="lv in levels" :key="lv" :value="lv">{{ levelLabel[lv] }}</option>
              </select>
              <span v-if="dirty(f.id)" style="margin-left:6px;color:#b8860b;font-size:12px">已改</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div style="display:flex;gap:10px;align-items:center;margin-top:6px">
      <button :style="btnPrimary" :disabled="busy || corrupt" @click="save">保存</button>
      <button :style="btnStyle" :disabled="busy || corrupt" @click="reset">恢复默认</button>
      <span style="color:var(--text-dim);font-size:12px" v-if="changedCount">待保存 {{ changedCount }} 项变更</span>
    </div>
  </div></div>
  `,
}

export default {
  id: 'privhub-admin-cap',
  slots: { 'admin-cap': CapPanel },
}
