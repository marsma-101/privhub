/**
 * privhub-shell-home · client — 工作台
 *
 * 「进来先干什么」：一屏回答三个问题 ——
 *   1. AI 到底通不通（模型接入状态，管理员可在此自检/跳转配置）
 *   2. 我刚在忙什么（最近打开 / 我的收藏，点击直接定位）
 *   3. 还能去哪（快捷入口，按已装载插件动态出现）
 *
 * 不抢默认视图：登录仍落在「欢迎页 + 项目列表」（既有且被测试钉住的入口），
 * 工作台从图标栏进入。默认视图一旦改成工作台，新装环境首屏会是一个空面板。
 *
 * 它只读既有接口，不新增服务端路由：
 *   GET /privhub/api/recent                （privhub-shell-recent）
 *   GET /privhub/api/favorites             （privhub-shell-favorites）
 *   GET /privhub/api/model/config          （svc-rag 注册，管理员）
 *   GET /privhub/api/model/status?force=1  （svc-rag 注册，管理员）
 * 两个 model 接口对非管理员返回 403，所以只在 isAdmin 时请求 —— 不制造必然失败的请求。
 *
 * 样式拆在 ./styles.js（import 即注入），本文件只留组件与数据流。
 *
 * @module privhub-shell-home/client
 */

import './styles.js'

const { api, nav, bus, AUTH } = window.PrivHub

/* 模型端点六种自检结果（svc-model ModelHealth 的全部取值，不多不少） */
const STATUS_TEXT = {
  ok: '已连通',
  unconfigured: '未配置',
  unreachable: '无法连接',
  timeout: '连接超时',
  'auth-error': '鉴权失败',
  'model-missing': '模型名不存在',
}
const STATUS_DOT = {
  ok: 'ok',
  unconfigured: 'warn',
  unreachable: 'bad',
  timeout: 'bad',
  'auth-error': 'bad',
  'model-missing': 'warn',
}
const WEEK = ['日', '一', '二', '三', '四', '五', '六']

/** 相对时间：工作台上「多久没碰过了」比精确时间戳有用 */
function rel(ts) {
  if (!ts) return ''
  const d = Date.now() - ts
  if (d < 60000) return '刚刚'
  if (d < 3600000) return Math.floor(d / 60000) + ' 分钟前'
  if (d < 86400000) return Math.floor(d / 3600000) + ' 小时前'
  if (d < 30 * 86400000) return Math.floor(d / 86400000) + ' 天前'
  const t = new Date(ts)
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0')
}

const Home = {
  name: 'home-view',
  data() {
    return {
      loading: true,
      err: '',
      recent: [],
      favs: [],
      model: null,        // { llm, embedding, checkedAt } | null
      cfg: null,          // { llm, embedding, maxRetries }（apiKey 已被服务端打码）
      modelErr: '',
      checking: false,
      now: Date.now(),
    }
  },
  computed: {
    /* AUTH 是骨架的 reactive，这里读它即可自动跟随登录态变化 */
    isAdmin() { return !!(AUTH.user && AUTH.user.role === 'admin') },
    userName() { const u = AUTH.user || {}; return u.displayName || u.username || '' },
    hello() {
      const h = new Date(this.now).getHours()
      if (h < 6) return '夜深了'
      if (h < 12) return '早上好'
      if (h < 14) return '中午好'
      if (h < 18) return '下午好'
      return '晚上好'
    },
    today() {
      const t = new Date(this.now)
      return t.getFullYear() + ' 年 ' + (t.getMonth() + 1) + ' 月 ' + t.getDate() + ' 日 · 周' + WEEK[t.getDay()]
    },
    /* 最近 6 条足够「接着干活」，再多就该去最近下拉里翻 */
    recentTop() { return this.recent.slice(0, 6) },
    favTop() { return this.favs.slice(0, 6) },
  },
  watch: {
    /* 登录态里 role 是登录后才拿到的：拿到管理员身份后再去碰 admin-only 接口 */
    isAdmin(v) { if (v && !this.model) this.loadModel() },
  },
  methods: {
    rel,

    async load() {
      this.loading = true
      this.err = ''
      try {
        const [r1, r2] = await Promise.all([
          api('/privhub/api/recent').catch(() => null),
          api('/privhub/api/favorites').catch(() => null),
        ])
        if (r1 && r1.ok) this.recent = r1.recent || []
        if (r2 && r2.ok) this.favs = r2.favorites || []
        // 两个接口都是「本用户的私人列表」，一起失败才认为是真故障
        if ((!r1 || !r1.ok) && (!r2 || !r2.ok)) this.err = (r1 && r1.error) || (r2 && r2.error) || '最近与收藏读取失败'
      } finally {
        this.loading = false
      }
    },

    async loadModel(force) {
      if (!this.isAdmin) return
      this.checking = true
      this.modelErr = ''
      try {
        // 两份都每次取：端点不一定在别处改过，但配置与状态必须同一次快照，不然后面显示会自相矛盾
        const [c, s] = await Promise.all([
          api('/privhub/api/model/config').catch(() => null),
          api('/privhub/api/model/status' + (force ? '?force=1' : '')).catch(() => null),
        ])
        if (c && c.ok) this.cfg = c.config
        if (s && s.ok) this.model = s
        else this.modelErr = (s && s.error) || '自检接口不可用'
      } finally {
        this.checking = false
      }
    },

    /* 点最近/收藏：目录直接进，文件先进所在目录再选中（与 shell-recent 的 go 同规则） */
    async open(e) {
      if (!e || !e.project) return
      if (e.isDir) { await nav.openDir(e.project, e.path); return }
      const dir = e.path && e.path.includes('/') ? e.path.slice(0, e.path.lastIndexOf('/')) : ''
      await nav.openDir(e.project, dir)
      const hit = nav.entries.find((x) => x.name === e.name)
      if (hit) nav.selectEntry(hit)
    },

    /* 路径显示：目录显示到自身，文件显示所在目录 */
    where(e) {
      if (e.isDir) return e.project + (e.path ? ' / ' + e.path : '')
      const dir = e.path && e.path.includes('/') ? e.path.slice(0, e.path.lastIndexOf('/')) : ''
      return e.project + (dir ? ' / ' + dir : '')
    },

    /* 该视图是否真的装得上（插件可能被卸载；点了没反应的按钮比没有更糟） */
    hasView(view) {
      const items = []
      for (const m of window.PrivHub.manifests || []) for (const b of (m.barItems || [])) items.push(b)
      return items.some((b) => (b.view || b.slot) === view && (!b.adminOnly || this.isAdmin))
    },

    quick(view) {
      if (view === 'trash') return nav.openTrash()
      if (view === 'search') return nav.openSearch()
      if (view === 'favorites') return nav.openFavorites()
      if (view === 'files') return nav.backToWelcome()
      if (this.hasView(view)) nav.setActiveView(view, { noToggle: true })
    },

    statusText(h) { return (h && STATUS_TEXT[h.status]) || '未知' },
    statusDot(h) { return (h && STATUS_DOT[h.status]) || '' },
    /* 只有 refused/timeout 这类才给原文，免得把内部地址回显在首页 */
    statusDetail(h) { return h && h.status === 'unreachable' && h.error ? h.error : '' },
  },
  async mounted() {
    await this.load()
    // 打开任意目录（含从工作台点最近/收藏）都会 emit file:opened —— 顺势刷新最近列表
    this._off = bus.on('file:opened', () => { this.load() })
    this._timer = setInterval(() => { this.now = Date.now() }, 60000)
  },
  beforeUnmount() {
    if (this._off) this._off()
    if (this._timer) clearInterval(this._timer)
  },
  template: `
    <div class="home-wrap">
      <div class="home-hello">
        <span class="big">{{ hello }}<template v-if="userName">，{{ userName }}</template></span>
        <span class="home-time">{{ today }}</span>
      </div>
      <div class="home-sub">这是工作台：左边是文件，这里是你接下来可能要做的事。</div>

      <div class="home-quick">
        <button v-if="hasView('search')" class="home-qbtn" @click="quick('search')"><span>🔍</span>搜索文件</button>
        <button v-if="hasView('favorites')" class="home-qbtn" @click="quick('favorites')"><span>⭐</span>我的收藏</button>
        <button v-if="hasView('trash')" class="home-qbtn" @click="quick('trash')"><span>🗑️</span>回收站</button>
        <button v-if="hasView('rag')" class="home-qbtn" @click="quick('rag')"><span>🤖</span>AI 问答</button>
        <button v-if="hasView('wiki')" class="home-qbtn" @click="quick('wiki')"><span>📚</span>知识库</button>
        <button v-if="hasView('kg')" class="home-qbtn" @click="quick('kg')"><span>🕸️</span>知识图谱</button>
        <button v-if="hasView('taskboard')" class="home-qbtn" @click="quick('taskboard')"><span>📋</span>任务看板</button>
        <button v-if="hasView('template')" class="home-qbtn" @click="quick('template')"><span>📝</span>新建文档</button>
      </div>

      <div v-if="err" class="home-note bad">{{ err }}</div>

      <div class="home-grid">
        <!-- AI 连接状态 -->
        <div class="home-card">
          <div class="home-card-h">
            <span>🤖</span><span>AI 连接状态</span>
            <span class="home-badge" :class="modelOk ? '' : 'off'">{{ model ? (modelOk ? '可用' : '待处理') : (isAdmin ? '未检测' : '仅管理员可见') }}</span>
          </div>
          <div class="home-card-b">
            <template v-if="!isAdmin">
              <div class="home-note">模型接入由管理员在「AI 工具 → 模型接入」里配置。需要在本机或外部程序里调用 PrivHub，请用「智能体接入」签发的密钥。</div>
              <div class="home-acts">
                <button v-if="hasView('agent')" class="btn" @click="quick('agent')">智能体接入</button>
                <button v-if="hasView('rag')" class="btn" @click="quick('rag')">打开 AI 工具</button>
              </div>
            </template>

            <template v-else>
              <div v-if="modelErr" class="home-note bad">{{ modelErr }}</div>
              <template v-if="model">
                <div class="home-kv"><span class="k">对话模型</span><span class="v">{{ cfg && cfg.llm ? (cfg.llm.model || '（未填模型名）') : '—' }}</span></div>
                <div class="home-kv"><span class="k">服务地址</span><span class="v">{{ cfg && cfg.llm ? (cfg.llm.baseURL || '（未填）') : '—' }}</span></div>
                <div class="home-kv"><span class="k">嵌入模型</span><span class="v">{{ cfg && cfg.embedding ? (cfg.embedding.model || '（未填模型名）') : '—' }}</span></div>
                <div class="home-sep"></div>
                <div class="home-kv">
                  <span class="k">对话通道</span>
                  <span class="v"><span class="home-dot" :class="statusDot(model.llm)"></span> {{ statusText(model.llm) }}<template v-if="statusDetail(model.llm)"> · {{ statusDetail(model.llm) }}</template></span>
                </div>
                <div class="home-kv">
                  <span class="k">检索通道</span>
                  <span class="v"><span class="home-dot" :class="statusDot(model.embedding)"></span> {{ statusText(model.embedding) }}</span>
                </div>
                <div v-if="model.llm.status === 'unconfigured' || model.embedding.status === 'unconfigured'" class="home-note">还没填模型地址：填 <b>mock</b> 可离线试用（返回模拟答复与伪向量），换成 http(s)://… 即接真实模型。</div>
                <div v-else-if="model.llm.status === 'auth-error'" class="home-note bad">端点拒绝了这个密钥（HTTP 401/403），请核对 apiKey。</div>
                <div v-else-if="model.llm.status === 'model-missing'" class="home-note bad">端点没有这个模型名，请在模型接入里改成服务端实际提供的名字。</div>
              </template>
              <div v-else-if="checking" class="home-empty">正在检测模型通道…</div>
              <div v-else class="home-empty">尚未取得状态。</div>
              <div class="home-acts">
                <button class="btn" :disabled="checking" @click="loadModel(true)">{{ checking ? '检测中…' : '重新检测' }}</button>
                <button v-if="hasView('rag')" class="btn" @click="quick('rag')">模型接入</button>
                <button v-if="hasView('agent')" class="btn" @click="quick('agent')">智能体接入</button>
              </div>
            </template>
          </div>
        </div>

        <!-- 最近打开 -->
        <div class="home-card">
          <div class="home-card-h">
            <span>🕘</span><span>最近打开</span>
            <span class="more" role="button" tabindex="0" @click="load" @keydown.enter="load">刷新</span>
          </div>
          <div class="home-card-b">
            <div v-if="recentTop.length === 0" class="home-empty">
              {{ loading ? '读取中…' : '还没有记录。浏览过的文件与文件夹会出现在这里。' }}
            </div>
            <div v-for="e in recentTop" :key="'r' + e.project + '/' + e.path" class="home-row" role="button" tabindex="0" @click="open(e)" @keydown.enter="open(e)">
              <span>{{ e.isDir ? '📂' : '📄' }}</span>
              <span class="t">{{ e.isDir ? (e.path === '' ? e.project : e.name) : e.name }}</span>
              <span class="m">{{ rel(e.at) }}</span>
            </div>
          </div>
        </div>

        <!-- 我的收藏 -->
        <div class="home-card">
          <div class="home-card-h">
            <span>⭐</span><span>我的收藏</span>
            <span class="more" role="button" tabindex="0" @click="load" @keydown.enter="load">刷新</span>
          </div>
          <div class="home-card-b">
            <div v-if="favTop.length === 0" class="home-empty">
              {{ loading ? '读取中…' : '还没有收藏。在文件上点星标即可固定到这里。' }}
            </div>
            <div v-for="e in favTop" :key="'f' + e.project + '/' + e.path" class="home-row" role="button" tabindex="0" @click="open(e)" @keydown.enter="open(e)">
              <span>{{ e.isDir ? '📂' : '📄' }}</span>
              <span class="t">{{ e.name }}</span>
              <span class="m">{{ where(e) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
}

export default {
  id: 'privhub-shell-home',
  slots: {
    home: Home,
  },
}
