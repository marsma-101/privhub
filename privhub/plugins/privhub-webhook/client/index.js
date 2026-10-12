/**
 * privhub-webhook · client —— 「Webhook 订阅」管理面板（挂 admin-webhook slot）
 *
 * 位置：管理控制台 → 系统运维 → Webhook 订阅（由 admin-console 的 routes.js 指过来；
 * 本插件只声明 slot 与 admin-nav barItem，不认识控制台本身）。
 *
 * 三块内容：
 *   ① 左：订阅列表（启用状态、最近一次投递结果一眼可见）
 *   ② 右：订阅表单（地址 / 事件勾选 / 项目过滤 / 密钥轮换）+ 测试投递 + 删除
 *   ③ 下：投递日志（时间 / 事件 / 结果 / HTTP / 耗时 / 尝试次数 / 错误）+ 原样重放
 *
 * 密钥显示口径：**只进不出**。列表与详情永不回传 `secret`，只有「新建/轮换」那一次
 * 响应里带 `secret`，面板把它显示在黄色提示条里并写明「此后不再显示」。
 * 这样一份被复制粘贴的界面截图不会变成长期凭据。
 *
 * 界面上的两处刻意「不做」：
 *   - 不放「清空日志」按钮：日志是排查投递失败的唯一线索，滚出即被环形覆盖，
 *     不需要一个人工入口把它一次性抹掉（真要清就删 data/webhook-log.json）。
 *   - 不放「批量重放失败项」：失败往往是同一个原因（地址挂了），批量重放等于
 *     对着一个已经不通的地址发一串请求，先把地址修好再逐条重放才是对的。
 *
 * @module privhub-webhook/client
 */

const { api } = window.PrivHub

const WebhookPanel = {
  name: 'admin-webhook',
  data() {
    return {
      hooks: [],
      stats: null,
      corrupt: false,
      catalog: [],
      projects: [],
      deliveries: [],
      loading: false,
      busy: false,
      msg: '',
      msgKind: 'info',
      // 表单：id 为空 = 新建
      form: null,
      /** 仅新建/轮换那一次回显的密钥（此后接口不再给）。 */
      issuedSecret: '',
      /** 日志过滤：只看某个订阅时填它的 id。 */
      logHookId: '',
      /* 按钮样式放 data 里而不是各处内联：整块界面有 8 个按钮，逐个内联既长又容易
       * 改漏一个（改漏的那个按钮就成了裸文字，很难在编译期发现）。 */
      btnStyle: 'padding:6px 12px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text);cursor:pointer;font-size:13px',
      btnPrimary: 'padding:6px 12px;border-radius:6px;border:none;background:var(--accent-solid);color:#fff;cursor:pointer;font-size:13px',
      btnSmall: 'padding:2px 8px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text);cursor:pointer;font-size:11px',
    }
  },
  computed: {
    /** 当前列表里选中的订阅（视图对象；已删除则为 null）。 */
    current() {
      if (!this.form || !this.form.id) return null
      return this.hooks.find((h) => h.id === this.form.id) || null
    },
    isNew() { return !!this.form && !this.form.id },
    logTitle() {
      if (!this.logHookId) return '全部订阅'
      const h = this.hooks.find((x) => x.id === this.logHookId)
      return h ? h.name : '（已删除的订阅）'
    },
  },
  methods: {
    fmtTime(at) {
      if (!at) return '—'
      const d = new Date(at)
      const p = (n) => String(n).padStart(2, '0')
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
        + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
    },
    fmtBytes(n) {
      const b = Number(n) || 0
      if (b < 1024) return b + ' B'
      if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
      return (b / 1024 / 1024).toFixed(1) + ' MB'
    },
    say(text, kind) { this.msg = text; this.msgKind = kind || 'info' },

    async load() {
      this.loading = true
      try {
        const r = await api('/privhub/api/webhook/list')
        if (!r.ok) { this.say(r.error || '加载失败', 'error'); return }
        this.hooks = r.hooks
        this.stats = r.stats
        this.corrupt = !!r.corrupt
        if (this.corrupt) this.say('订阅配置此前读取失败（已隔离存证）：改动会被拒绝，请先人工处理 data/webhooks.json', 'error')
        // 选中的订阅被删掉后不要留着一个幽灵表单
        if (this.form && this.form.id && !this.hooks.some((h) => h.id === this.form.id)) this.form = null
      } finally { this.loading = false }
    },

    async loadCatalog() {
      const r = await api('/privhub/api/webhook/events')
      if (r.ok) this.catalog = r.events
    },

    async loadProjects() {
      const r = await api('/privhub/api/projects')
      if (r.ok) this.projects = r.projects || []
    },

    async loadDeliveries() {
      const q = this.logHookId ? '?hookId=' + encodeURIComponent(this.logHookId) + '&limit=100' : '?limit=100'
      const r = await api('/privhub/api/webhook/deliveries' + q)
      if (r.ok) this.deliveries = r.deliveries
      else this.say(r.error || '日志加载失败', 'error')
    },

    /** 点左侧某项 → 载入表单（密钥那一栏留空表示「不修改」）。 */
    pick(h) {
      this.issuedSecret = ''
      this.say('')
      this.form = {
        id: h.id, name: h.name, url: h.url, events: [...h.events],
        project: h.project, enabled: h.enabled, secret: '', rotate: false,
      }
    },

    blank() {
      this.issuedSecret = ''
      this.say('')
      this.form = { id: '', name: '', url: '', events: [], project: '', enabled: true, secret: '', rotate: false }
    },

    async save() {
      if (!this.form) return
      this.busy = true
      try {
        const r = await api('/privhub/api/webhook/save', { method: 'POST', body: JSON.stringify(this.form) })
        if (!r.ok) { this.say(r.error || '保存失败', 'error'); return }
        // 只有「刚生成/刚轮换」的响应里才有 secret
        this.issuedSecret = r.secret || ''
        this.form.id = r.hook.id
        this.form.secret = ''
        this.form.rotate = false
        this.say(this.issuedSecret ? '已保存。请立即复制下面的签名密钥 —— 此后不再显示。' : '已保存', 'ok')
        await this.load()
        await this.loadDeliveries()
      } finally { this.busy = false }
    },

    async toggle(h) {
      this.busy = true
      try {
        const r = await api('/privhub/api/webhook/toggle', { method: 'POST', body: JSON.stringify({ id: h.id, enabled: !h.enabled }) })
        if (!r.ok) { this.say(r.error || '操作失败', 'error'); return }
        await this.load()
      } finally { this.busy = false }
    },

    async remove() {
      if (!this.form || !this.form.id) return
      if (!window.confirm('删除这个订阅？投递会立即停止（已有日志保留）。')) return
      this.busy = true
      try {
        const r = await api('/privhub/api/webhook/delete', { method: 'POST', body: JSON.stringify({ id: this.form.id }) })
        if (!r.ok) { this.say(r.error || '删除失败', 'error'); return }
        this.form = null
        this.issuedSecret = ''
        this.say('已删除', 'ok')
        await this.load()
        await this.loadDeliveries()
      } finally { this.busy = false }
    },

    async ping() {
      if (!this.form || !this.form.id) return
      this.busy = true
      try {
        const r = await api('/privhub/api/webhook/test', { method: 'POST', body: JSON.stringify({ id: this.form.id }) })
        if (!r.ok) { this.say(r.error || '测试失败', 'error'); return }
        const d = r.delivery
        this.say(d.ok
          ? '测试投递成功（HTTP ' + d.httpStatus + '，' + d.ms + 'ms）'
          : '测试投递失败：' + (d.error || '未知原因'), d.ok ? 'ok' : 'error')
        await this.load()
        await this.loadDeliveries()
      } finally { this.busy = false }
    },

    async replay(rec) {
      this.busy = true
      try {
        const r = await api('/privhub/api/webhook/replay', { method: 'POST', body: JSON.stringify({ id: rec.id }) })
        if (!r.ok) { this.say(r.error || '重放失败', 'error'); return }
        const d = r.delivery
        this.say(d.ok ? '重放成功（HTTP ' + d.httpStatus + '）' : '重放仍未成功：' + (d.error || ''), d.ok ? 'ok' : 'error')
        await this.load()
        await this.loadDeliveries()
      } finally { this.busy = false }
    },

    async onlyThis(h) {
      this.logHookId = h.id
      await this.loadDeliveries()
    },

    async allLogs() {
      this.logHookId = ''
      await this.loadDeliveries()
    },
  },
  async mounted() {
    await this.loadCatalog()
    await this.load()
    await this.loadProjects()
    await this.loadDeliveries()
  },
  template: `
    <div class="view-page">
      <div class="view-inner">
        <h2>🪝 Webhook 订阅</h2>
        <p style="color:var(--muted);margin:4px 0 14px;line-height:1.6">
          把这里发生的事 POST 到你的地址：<b>文件变更 / 文档保存 / 标签 / 用户改名 / 审计 / 任务看板 / 项目看板</b>。
          每个请求带 <code>x-privhub-event</code>、<code>x-privhub-delivery</code> 与
          <code>x-privhub-signature</code>（<code>sha256=HMAC-SHA256(密钥, 请求正文)</code>）；
          失败会按 0.5s / 1.5s 重试两次（4xx 不重试，那里重试也没用）。
        </p>

        <div v-if="msg" :style="'padding:8px 10px;border-radius:6px;margin-bottom:12px;font-size:13px;' +
          (msgKind === 'error' ? 'background:rgba(220,60,60,.12);color:var(--danger, #d33)' :
           msgKind === 'ok' ? 'background:rgba(60,170,90,.12);color:var(--ok, #2a8)' : 'background:rgba(120,120,120,.12);color:var(--muted)')">{{ msg }}</div>

        <div v-if="stats" style="color:var(--muted);font-size:12px;margin-bottom:12px">
          订阅 {{ stats.hooks }}（启用 {{ stats.enabled }}） · 本次启动以来成功 {{ stats.delivered }} 条 ·
          因积压丢弃 {{ stats.dropped }} · 待投递 {{ stats.pending }} · 日志 {{ stats.logged }} 条
        </div>

        <div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">
          <!-- 左：订阅列表 -->
          <div style="flex:0 0 300px;min-width:260px">
            <button :style="btnPrimary" @click="blank" :disabled="busy" style="width:100%;margin-bottom:8px">+ 新建订阅</button>
            <div v-if="!hooks.length" style="color:var(--muted);font-size:13px;padding:10px;border:1px dashed var(--line);border-radius:6px">
              还没有订阅。点「新建订阅」，把地址填上即可。
            </div>
            <div v-for="h in hooks" :key="h.id" @click="pick(h)"
              :style="'padding:9px 10px;border:1px solid ' + (form && form.id === h.id ? 'var(--accent)' : 'var(--line)')
                + ';border-radius:6px;margin-bottom:6px;cursor:pointer;background:' + (h.enabled ? 'var(--bg)' : 'rgba(120,120,120,.08)')">
              <div style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600">
                <span :style="'width:8px;height:8px;border-radius:50%;display:inline-block;background:' +
                  (!h.enabled ? '#999' : h.lastStatus === 'ok' ? '#2a8' : h.lastStatus === 'fail' ? '#d33' : '#cc9')"></span>
                <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ h.name }}</span>
                <span style="color:var(--muted);font-weight:400">{{ h.enabled ? '' : '已停用' }}</span>
              </div>
              <div style="color:var(--muted);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px">{{ h.url }}</div>
              <div style="color:var(--muted);font-size:11px;margin-top:2px">
                {{ h.events.length ? h.events.join(' · ') : '全部事件' }}{{ h.project ? ' · 限「' + h.project + '」' : '' }}
              </div>
              <div style="margin-top:4px">
                <button @click.stop="onlyThis(h)" :style="btnSmall">只看它的日志</button>
              </div>
              <div v-if="h.lastStatus === 'fail'" style="color:#d33;font-size:11px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                最近失败：{{ h.lastError }}
              </div>
            </div>
          </div>

          <!-- 右：表单 -->
          <div style="flex:1;min-width:360px">
            <div v-if="!form" style="color:var(--muted);font-size:13px;padding:16px;border:1px dashed var(--line);border-radius:6px">
              从左侧选一个订阅来编辑，或点「新建订阅」。
            </div>
            <div v-else>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
                <b style="font-size:14px">{{ isNew ? '新建订阅' : '编辑订阅' }}</b>
                <span v-if="current" :style="'font-size:12px;color:' + (current.lastStatus === 'ok' ? '#2a8' : current.lastStatus === 'fail' ? '#d33' : 'var(--muted)')">
                  累计 {{ current.delivered }} 成功 / {{ current.failed }} 失败
                </span>
              </div>

              <label style="display:block;font-size:12px;color:var(--muted);margin-bottom:3px">名称（留空用地址主机名）</label>
              <input v-model="form.name" placeholder="如：工单系统" style="width:100%;padding:7px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text);margin-bottom:9px" />

              <label style="display:block;font-size:12px;color:var(--muted);margin-bottom:3px">订阅地址（http/https）</label>
              <input v-model="form.url" placeholder="https://example.com/hooks/privhub" style="width:100%;padding:7px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text);margin-bottom:9px" />

              <label style="display:block;font-size:12px;color:var(--muted);margin-bottom:3px">
                签名密钥{{ isNew ? '（留空由系统生成）' : '（留空 = 不修改）' }}
              </label>
              <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
                <input v-model="form.secret" type="text" placeholder="至少 8 个字符" style="flex:1;padding:7px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text)" />
                <label v-if="!isNew" style="font-size:12px;color:var(--muted);display:flex;align-items:center;gap:4px">
                  <input type="checkbox" v-model="form.rotate" /> 轮换
                </label>
              </div>
              <div v-if="issuedSecret" style="padding:8px 10px;border-radius:6px;background:rgba(220,170,40,.15);font-size:12px;margin-bottom:9px;word-break:break-all">
                <b>签名密钥（仅此一次显示）</b>：<code>{{ issuedSecret }}</code><br />
                请现在复制到订阅方配置里；页面刷新后就取不回来了（要换就点「轮换」再存一次）。
              </div>

              <label style="display:block;font-size:12px;color:var(--muted);margin-bottom:3px">只订阅某个项目（留空 = 全部项目）</label>
              <select v-model="form.project" style="width:100%;padding:7px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text);margin-bottom:9px">
                <option value="">全部项目</option>
                <option v-for="p in projects" :key="p" :value="p">{{ p }}</option>
                <option v-if="form.project && !projects.includes(form.project)" :value="form.project">{{ form.project }}（不在可见列表里）</option>
              </select>

              <label style="display:block;font-size:12px;color:var(--muted);margin-bottom:3px">订阅事件（一个都不勾 = 全部事件）</label>
              <div style="border:1px solid var(--line);border-radius:6px;padding:8px;margin-bottom:9px">
                <label v-for="e in catalog" :key="e.name" style="display:flex;gap:6px;align-items:flex-start;font-size:12px;padding:3px 0">
                  <input type="checkbox" v-model="form.events" :value="e.name" style="margin-top:3px" />
                  <span><code>{{ e.name }}</code> — {{ e.desc }}</span>
                </label>
                <div v-if="!catalog.length" style="color:var(--muted);font-size:12px">事件目录加载中…</div>
              </div>

              <label style="display:flex;gap:6px;align-items:center;font-size:13px;margin-bottom:12px">
                <input type="checkbox" v-model="form.enabled" /> 启用（停用后不再投递，但保留配置与密钥）
              </label>

              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button :style="btnPrimary" @click="save" :disabled="busy">保存</button>
                <button v-if="!isNew" :style="btnStyle" @click="ping" :disabled="busy">测试投递</button>
                <button v-if="!isNew" :style="btnStyle" @click="toggle(current)" :disabled="busy">{{ current && current.enabled ? '停用' : '启用' }}</button>
                <button v-if="!isNew" :style="btnStyle" @click="remove" :disabled="busy" style="color:#d33">删除</button>
              </div>
              <div style="color:var(--muted);font-size:12px;margin-top:8px">
                「测试投递」会发一条 <code>ping</code> 事件，只试一次并同步回结果 —— 用来确认地址、证书与签名配置是否通。
              </div>
            </div>
          </div>
        </div>

        <!-- 下：投递日志 -->
        <div style="display:flex;align-items:center;gap:10px;margin:18px 0 8px">
          <b style="font-size:14px">投递日志</b>
          <span style="color:var(--muted);font-size:12px">当前：{{ logTitle }}（最多保留最近 300 条）</span>
          <button v-if="logHookId" :style="btnSmall" @click="allLogs" style="font-size:12px;padding:3px 8px">看全部</button>
          <button :style="btnSmall" @click="loadDeliveries" style="font-size:12px;padding:3px 8px">刷新</button>
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead>
              <tr style="color:var(--muted);text-align:left">
                <th style="padding:5px 6px;border-bottom:1px solid var(--line)">时间</th>
                <th style="padding:5px 6px;border-bottom:1px solid var(--line)">事件</th>
                <th style="padding:5px 6px;border-bottom:1px solid var(--line)">结果</th>
                <th style="padding:5px 6px;border-bottom:1px solid var(--line)">HTTP</th>
                <th style="padding:5px 6px;border-bottom:1px solid var(--line)">耗时</th>
                <th style="padding:5px 6px;border-bottom:1px solid var(--line)">尝试</th>
                <th style="padding:5px 6px;border-bottom:1px solid var(--line)">正文</th>
                <th style="padding:5px 6px;border-bottom:1px solid var(--line)">说明</th>
                <th style="padding:5px 6px;border-bottom:1px solid var(--line)"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in deliveries" :key="d.id">
                <td style="padding:5px 6px;border-bottom:1px solid var(--line);white-space:nowrap">{{ fmtTime(d.at) }}</td>
                <td style="padding:5px 6px;border-bottom:1px solid var(--line)"><code>{{ d.event }}</code></td>
                <td :style="'padding:5px 6px;border-bottom:1px solid var(--line);color:' + (d.ok ? '#2a8' : '#d33')">{{ d.ok ? '成功' : '失败' }}</td>
                <td style="padding:5px 6px;border-bottom:1px solid var(--line)">{{ d.httpStatus === null ? '—' : d.httpStatus }}</td>
                <td style="padding:5px 6px;border-bottom:1px solid var(--line)">{{ d.ms }} ms</td>
                <td style="padding:5px 6px;border-bottom:1px solid var(--line)">{{ d.attempts }}</td>
                <td style="padding:5px 6px;border-bottom:1px solid var(--line)">{{ fmtBytes(d.bodyBytes) }}</td>
                <td style="padding:5px 6px;border-bottom:1px solid var(--line);max-width:320px;color:var(--muted)">
                  <span v-if="d.replayOf" style="color:var(--muted)">[重放] </span>{{ d.error }}
                </td>
                <td style="padding:5px 6px;border-bottom:1px solid var(--line)">
                  <button :style="btnSmall" @click="replay(d)" :disabled="busy" style="font-size:11px;padding:2px 7px">重放</button>
                </td>
              </tr>
              <tr v-if="!deliveries.length">
                <td colspan="9" style="padding:14px;color:var(--muted);text-align:center">还没有投递记录</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style="color:var(--muted);font-size:12px;line-height:1.6;margin-top:10px">
          「重放」按日志里存的<b>原文</b>重新发一次（载荷不重新构造），发往订阅<b>当前的地址</b>；
          投递 = 至少一次送达，订阅方请用 <code>x-privhub-delivery</code> 做幂等。
        </p>
      </div>
    </div>
  `,
}

export default {
  id: 'privhub-webhook',
  slots: { 'admin-webhook': WebhookPanel },
}
