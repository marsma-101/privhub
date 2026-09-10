/**
 * privhub-svc-rag · client — RAG 界面一期（M2）
 *
 * 视图：
 *   rag-view（🤖 AI 工具，全员）：管理员 = 治理总台（语料仓库/语料总览/待裁决/模型接入/向量化/问答/Key 管理/专属回收站/我的 AI 密钥页签）；
 *                             普通用户 = 「我的 AI 密钥」（自助申请 + 如何交给 AI 教程）
 *
 * 后端接口：/privhub/api/rag/*（svc-rag）· /privhub/api/model/* · /privhub/api/agent/v1/*（Agent 网关）
 *
 * @module privhub-svc-rag/client
 */

const { api, nav } = window.PrivHub

/* 统一按钮交互样式（对齐骨架 hover/禁用反馈；组件级注入一次） */
if (!document.getElementById('rag-btn-style')) {
  const st = document.createElement('style')
  st.id = 'rag-btn-style'
  st.textContent = `
    button.rag-btn { transition: filter .12s, opacity .12s; }
    button.rag-btn:hover { filter: brightness(1.12); }
    button.rag-btn:active { filter: brightness(.94); }
    button.rag-btn:disabled { opacity: .45; cursor: not-allowed; filter: none; }
    button.rag-danger:hover { filter: brightness(1.25); }
  `
  document.head.appendChild(st)
}

/* ================= 通用小件 ================= */

const S = {
  btn: 'display:inline-block;padding:3px 10px;border-radius:6px;border:1px solid var(--line);background:var(--line);color:var(--text);cursor:pointer;font-size:12px;margin-right:6px;',
  btnDanger: 'display:inline-block;padding:3px 10px;border-radius:6px;border:1px solid #f85149;background:#3d1d1d;color:#ffa198;cursor:pointer;font-size:12px;margin-right:6px;',
  input: 'width:100%;padding:5px 8px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text);font-size:12px;box-sizing:border-box;',
  select: 'padding:4px 6px;border-radius:6px;border:1px solid var(--line);background:var(--panel);color:var(--text);font-size:12px;',
  table: 'width:100%;border-collapse:collapse;font-size:12px;',
  th: 'text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);color:var(--muted);font-weight:600;white-space:nowrap;',
  td: 'text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);color:var(--text);',
  card: 'background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px 16px;',
  badge: 'display:inline-block;padding:1px 7px;border-radius:10px;font-size:11px;margin-right:6px;',
  tabsBtn: 'padding:6px 14px;border-radius:8px 8px 0 0;border:1px solid var(--line);border-bottom:none;background:var(--panel);color:var(--muted);cursor:pointer;font-size:13px;margin-right:4px;',
  tabsBtnOn: 'padding:6px 14px;border-radius:8px 8px 0 0;border:1px solid var(--accent);border-bottom:none;background:var(--bg);color:var(--accent);cursor:pointer;font-size:13px;margin-right:4px;',
  section: 'margin-bottom:16px;',
  secTitle: 'font-size:14px;font-weight:600;margin:2px 0 10px;color:var(--text);',
}

const fmtDate = (n) => (n ? new Date(n).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—')
/* S4 安全修复：badge 经 v-html 渲染，text 可能来自文件 frontmatter（用户可控），必须转义。 */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
))
const badge = (text, color) => `<span style="${S.badge}background:${color}22;color:${color};border:1px solid ${color}55">${esc(text)}</span>`

/* ================= 帮助体系（ⓘ 引导） ================= */

const HELP_Q = 'display:inline-block;width:15px;height:15px;line-height:15px;text-align:center;border-radius:50%;border:1px solid var(--accent);color:var(--accent);font-size:10px;cursor:pointer;margin-left:7px;vertical-align:1px;user-select:none;'
const HINT_BAR = 'background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:8px 12px;font-size:12px;color:var(--muted);margin-bottom:14px;line-height:1.6;'

const HELP = {
  corpus: {
    title: '📚 语料仓库',
    desc: '这里是你 RAG 问答的「知识来源清单」——系统自动把项目里的文档解析、清洗、切块后收入语料，问答时从中找答案。文档随项目文件自动同步（上传/编辑/删除都会自动更新），不需要手动导入。',
    steps: [
      '① 先在「模型接入」页签配置模型（LLM + 向量），这是问答的引擎',
      '② 回到本页，看到的就是已进入语料的文档清单',
      '③ 状态标记：🟢在用=参与检索 · 🚫已剔除=被人工移出 · ⏳已过期=暂不参与 · 🟣已并入=内容并入主文档 · ⚪扫描件=图片型 PDF（不收录）',
      '④ 想让某文档不进语料：交给管理员在「待裁决/治理」处理，或在文档 frontmatter 写 rag: false',
    ],
    tips: '文件改动后语料自动增量更新；「♻ 全量重建」只在数据异常时使用。',
  },
  dup: {
    title: '🔁 项目查重',
    desc: '把原来「搜索页查重」和 AI 语料的查重合并成一个入口：只查当前项目，不跨项目。两类重复都会列出——查完处理掉，项目里就是干净数据，再上传新资料不会叠重复。',
    steps: [
      '① 顶栏选项目（默认 = 你在文件页打开的那个）→ 自动扫描',
      '② 📄 同名同大小：文件名和大小都相同的文件（所有类型都算，含图片/压缩包等不解析内容的）',
      '③ 🧬 内容一字不差：文件名或大小不同、但正文完全相同的可解析文档（md/txt/office/pdf 等）；已在第 ② 类列出的不重复出现',
      '④ 每组保留 1 个（默认第一个），其余勾选 → 点删除，文件进回收站（可恢复），语料随之自动同步',
      '⑤ 有写权限才能删；只读用户可查可看，删除会提示无权限',
    ],
    tips: '名称相似但内容不同的「版本」（方案_v1/方案_v2）不算重复、不会出现在这里——版本/近似类治理在「语料治理 → 待裁决」（管理员）。文件页顶栏的 🔁 查重按钮会直接跳到这里并选中当前项目。',
  },
  mykeys: {
    title: '🔑 我的 AI 密钥',
    desc: '密钥是「你的 AI 工具访问 PrivHub 的通行证」。把 key 配置到局域网其他电脑的 AI 软件（Claude Code 等），它就能以【你的权限】读写文件：项目只读、你的专属空间（.agents/你的用户名/）可增删改。',
    steps: [
      '① 填用途名称、选一个项目 → 生成（pha_ 开头，明文仅显示这一次，立即复制保存）',
      '② 到你的 AI 工具里配置：请求头 X-Agent-Key: pha_xxx，接口地址 http://<主机IP>:3181/privhub/api/agent/v1/',
      '③ 先验证：curl http://<主机IP>:3181/privhub/api/agent/v1/me -H "X-Agent-Key: pha_xxx"，应返回你的身份与可见项目',
      '④ 把 /schema 返回的工具清单配给 AI 工具（写操作只会落到你的专属空间）',
      '⑤ 完整接入教程见仓库 docs/PrivHub-AgentAPI-接入指南.md',
    ],
    tips: '密钥每月末自动过期，到期前 7 天响应带 x-key-expires 提醒 → 重新申请或让管理员续期；一项目一钥避免信息混杂；密钥遗失只能吊销重办。',
  },
  overview: {
    title: '📊 语料总览',
    desc: '一眼看清「语料健康度」与「模型接入状态」——RAG 问答前先看这里：语料有没有、模型通不通。',
    steps: [
      '① 语料文档/分块：知识库体积；待裁决组：需要人工处理的重复/版本问题（数量>0 建议去处理）',
      '② 模型接入：LLM=回答引擎，embedding=向量化引擎；绿色 ok 才算就绪',
      '③ 策展：canonical 权威文档 / 剔除 / 过期 / 并入 的当前数量',
      '④ 类型分布：语料构成（markdown/合同/xlsx…）',
    ],
    tips: '模型配置改了之后点「连通自检」刷新状态；「♻ 全量重建」会幂等重扫全部项目（数据异常时用）。',
  },
  pending: {
    title: '🧾 待裁决',
    desc: '自动检测三类「语料污染」：内容完全相同的文档（重复保存）、内容高度相似、同一文件的多个版本（v1/v2/副本…）。同一知识命中多份文档会导致 AI 回答来源混乱——需要你人工决定保留谁。',
    steps: [
      '① 勾选组内文档（可多选）',
      '② ⭐ 保留首选：选中项标记为权威版本，检索优先用它',
      '③ 🚫 剔除：移出语料（原文件不受影响，可在语料仓库看不到后反操作恢复）',
      '④ ⏳ 过期：标记 1 年内不参与检索（过期想恢复 → 管理员可用 unexpire）',
      '⑤ 🔗 合并：勾选第一个为主文档，其余并入（从文档不再单独检索）',
    ],
    tips: '所有动作只作用于「语料」，你磁盘上的原文件一字不动；全部操作可反操作（剔除→恢复、过期→撤销）。',
  },
  model: {
    title: '🤖 模型接入',
    desc: '填入模型的地址和名字，PrivHub 就能「调用」它：LLM 负责回答，embedding 负责把语料向量化。只要讲 OpenAI 兼容协议的服务都可以（Ollama / vLLM / LM Studio / DSH 网关）。',
    steps: [
      '① baseURL：形如 http://192.168.1.10:11434（不要带 /v1 后缀）；没有真实模型可先填 mock 体验全流程',
      '② 模型名：你服务里真实部署的名字（如 qwen3:8b、bge-m3）',
      '③ apiKey：服务有鉴权才填；填错会在自检显示「鉴权失败」',
      '④ 保存 → 点「连通自检」：绿 ok=就绪；其它状态会给出原因（不可达/超时/鉴权/模型名不存在）',
    ],
    tips: 'LLM 与 embedding 可以指向不同服务（问答一台、向量一台）；配置加密存在服务器 data/model.json，他人看不到你的 apiKey。',
  },
  keys: {
    title: '🔑 Key 管理（管理员）',
    desc: '为局域网智能体发放访问凭证：选定「绑定用户 + 项目范围」，生成的密钥只能看到该用户在该项目内的内容——一项目一钥，防止跨项目信息混杂。',
    steps: [
      '① 名称（备注用途）+ 选择用户 + 选择项目 → 生成（明文仅这一次，交给对应用户/智能体配置）',
      '② 「全部可见项目」慎用：一个 key 覆盖该用户全部可见范围，信息混杂风险高',
      '③ 续期：签发同配置新 key，旧 key 保留到自然到期（平滑切换，无断点）',
      '④ 挂起：临时熔断（可疑活动），可恢复；吊销：立即失效，不可恢复',
    ],
    tips: '密钥每月末自动过期，到期前 7 天有预警；生成/吊销/挂起/续期全部进审计，可在审计面板追溯。',
  },
  trash: {
    title: '🗑 专属空间回收站',
    desc: '智能体在你的专属空间（.agents/<用户>/）删除的文件会先进这里——误删可以救回。这是专属空间回收站的唯一管理入口（普通文件视图看不到隐藏目录）。',
    steps: [
      '① 输入用户名过滤（留空=查看全部用户的专属空间）',
      '② 恢复：文件回到原位置；彻底删除：不可恢复',
      '③ 建议定期清空：回收站里的文件仍占用用户配额',
    ],
    tips: '每个用户的专属空间互相隔离；恢复/删除全部留审计。',
  },
  vec: {
    title: '⚡ 向量化',
    desc: '把语料库里的文档块变成「向量」存进向量库——这是语义检索的基础。语料文本在 P1 已自动入库（清洗+切块），向量化是把它们一次性转换，之后新增文档进入语料时需再次运行以增量转换（重复运行会自动跳过已处理的块，可安全重复）。',
    steps: [
      '① 先确认「模型接入」里 embedding 端点已配置且自检 ok（绿）',
      '② 点「开始向量化」——进度条实时显示 已处理/总数（数十秒到几分钟，取决于文档量）',
      '③ 完成后状态变「完成」；中途失败会显示为「部分完成」（可重跑，失败区块自动重试）',
      '④ 之后每次语料有变化（新增/编辑文档），再次点开始即可增量补齐',
    ],
    tips: 'mock 模型可先跑通流程（维度 64、无真实语义）；接真实向量模型后请「删除重建」或重跑一次以获得真实语义向量。',
  },
  qa: {
    title: '💬 问答',
    desc: '向语料提问：系统检索相关文档块（关键词+语义双通道），由 LLM 综合资料回答，并标注每条答案的来源。检索与回答严格限定你权限内的项目。',
    steps: [
      '① 选择检索范围：全部可见项目 / 单个项目',
      '② 输入问题 → 发送（需要 LLM 与向量均已配置）',
      '③ 回答下方列出引用来源（项目/文件/片段），可据此核对',
      '④ 资料中没有的内容，助手会明确说「未找到」而不是编造',
    ],
    tips: '问得具体命中率更高；「没有权限」的内容不会出现在结果里，也不会被引用。',
  },
}

/** 帮助浮层组件（右下角卡片，点 ⓘ 弹出） */
const HelpTip = {
  name: 'rag-help-tip',
  props: ['help'],
  emits: ['close'],
  template: `
  <div style="position:fixed;right:22px;bottom:22px;width:400px;max-height:70vh;overflow:auto;z-index:999;background:var(--panel2);border:1px solid #58a6ff66;border-radius:12px;box-shadow:0 10px 36px rgba(0,0,0,.6);padding:16px 18px;font-size:12.5px;line-height:1.7;color:var(--text);">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <b style="font-size:14px;color:var(--accent);">{{ help.title }}</b>
      <span style="cursor:pointer;color:var(--muted);font-size:16px;" @click="$emit('close')">✕</span>
    </div>
    <div style="color:var(--muted);">{{ help.desc }}</div>
    <div style="margin-top:10px;color:var(--muted);font-weight:600;">使用流程</div>
    <ol style="margin:6px 0 0 18px;padding:0;color:var(--text);">
      <li v-for="(s,i) in help.steps" :key="i" style="margin-bottom:5px;">{{ s }}</li>
    </ol>
    <div style="margin-top:10px;padding:8px 10px;background:#1c2a3f;border-radius:8px;color:var(--muted);">
      💡 {{ help.tips }}
    </div>
  </div>`,
}

/* ================= 视图一：语料（全员） ================= */

/* ================= 可复用面板 ================= */

/* 语料仓库面板（管理员） */
const RagCorpusPanel = {
  name: 'rag-corpus-panel',
  components: { HelpTip },
  data() { return { S, HELP, HELP_Q, badge, fmtDate, helpKey: '', docs: [], corpusProject: 'all' } },
  computed: {
    grouped() {
      const m = {}
      for (const d of this.docs) (m[d.project] = m[d.project] || []).push(d)
      return m
    },
    corpusProjects() { return [...new Set(this.docs.map((d) => d.project))].sort() },
    shownGroups() {
      if (this.corpusProject !== 'all' && this.grouped[this.corpusProject]) {
        const o = {}
        o[this.corpusProject] = this.grouped[this.corpusProject]
        return o
      }
      return this.grouped
    },
    shownCount() { return Object.values(this.shownGroups).reduce((s, l) => s + l.length, 0) },
    chunkTotal() { return this.docs.reduce((s, d) => s + (d.chunks || 0), 0) },
  },
  methods: {
    openHelp(k) { this.helpKey = this.helpKey === k ? '' : k },
    async load() {
      try {
        const r = await api('/privhub/api/rag/corpus')
        if (r.ok) this.docs = r.docs || []
      } catch { /* 静默 */ }
    },
  },
  mounted() { this.load() },
  template: `
  <div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap;">
      <span style="font-size:15px;font-weight:700;">📚 语料仓库</span>
      <select v-model="corpusProject" :style="S.select">
        <option value="all">所有项目（{{ docs.length }} 篇）</option>
        <option v-for="p in corpusProjects" :key="p" :value="p">{{ p }}（{{ grouped[p].length }} 篇）</option>
      </select>
      <span :style="HELP_Q" @click="openHelp('corpus')">?</span>
      <span style="flex:1"></span>
      <span style="color:var(--muted);font-size:12px;">文档自动入库 · {{ shownCount }} 篇 / {{ chunkTotal }} 块</span>
    </div>
    <div v-for="(list, proj) in shownGroups" :key="proj" :style="S.section">
      <div :style="S.secTitle">📁 {{ proj }}（{{ list.length }} 篇）</div>
      <div :style="S.card">
        <table :style="S.table">
          <tr><th :style="S.th">文件</th><th :style="S.th">类型</th><th :style="S.th">块</th><th :style="S.th">更新</th><th :style="S.th">状态</th></tr>
          <tr v-for="d in list" :key="d.docId">
            <td :style="S.td" style="max-width:380px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ d.path }}</td>
            <td :style="S.td">{{ d.type }}</td>
            <td :style="S.td">{{ d.chunks }}</td>
            <td :style="S.td" style="white-space:nowrap;">{{ fmtDate(d.updated) }}</td>
            <td :style="S.td">
              <span v-if="d.canonical && !d.excluded && !d.expiredAt && !d.mergedInto" v-html="badge('在用','#3fb950')"></span>
              <span v-if="d.scanOnly" v-html="badge('扫描件','#7d8590')"></span>
              <span v-if="d.excluded" v-html="badge('已剔除','#f85149')"></span>
              <span v-if="d.expiredAt" v-html="badge('已过期','#d29922')"></span>
              <span v-if="d.mergedInto" v-html="badge('已并入','#a371f7')"></span>
            </td>
          </tr>
          <tr v-if="!list.length"><td :style="S.td" colspan="5" style="color:var(--muted);">暂无语料</td></tr>
        </table>
      </div>
    </div>
    <HelpTip v-if="helpKey" :help="HELP[helpKey]" @close="helpKey=''" />
  </div>`,
}

/* 我的密钥面板（普通用户 + 管理员） */
const RagKeysPanel = {
  name: 'rag-keys-panel',
  components: { HelpTip },
  data() { return { S, HELP, HELP_Q, HINT_BAR, badge, fmtDate, helpKey: '', projects: [], myKeys: [], myForm: { name: '', project: '' }, myCreating: false } },
  methods: {
    openHelp(k) { this.helpKey = this.helpKey === k ? '' : k },
    async load() {
      try {
        const p = await api('/privhub/api/projects')
        if (p.ok) this.projects = p.projects || []
        const mk = await api('/privhub/api/agent/v1/my-keys')
        if (mk.ok) this.myKeys = mk.keys || []
      } catch { /* 静默 */ }
    },
    async applyMy() {
      if (!this.myForm.name || !this.myForm.project) { window.PrivHub.toast('请填写名称并选择项目', 'error'); return }
      this.myCreating = true
      try {
        const r = await api('/privhub/api/agent/v1/my-keys', { method: 'POST', body: JSON.stringify({ name: this.myForm.name, scope: { kind: 'project', project: this.myForm.project } }) })
        if (r.ok) {
          window.PrivHub.toast('密钥已生成（仅此一次显示）：' + r.key, 'success')
          this.myForm.name = ''
          await this.load()
        } else window.PrivHub.toast(r.error || '申请失败', 'error')
      } finally { this.myCreating = false }
    },
    async revokeMy(id) {
      if (!confirm('吊销该密钥？立即失效不可恢复')) return
      const r = await api('/privhub/api/agent/v1/my-keys', { method: 'DELETE', body: JSON.stringify({ id }) })
      if (r.ok) { window.PrivHub.toast('已吊销', 'success'); await this.load() }
      else window.PrivHub.toast(r.error || '吊销失败', 'error')
    },
  },
  mounted() { this.load() },
  template: `
  <div>
    <div :style="HINT_BAR">💡 这是给你的 AI 工具（Claude Code 等）发「通行证」的地方。下面三步教你怎么交给 AI ：<span :style="HELP_Q" @click="openHelp('mykeys')">?</span></div>
    <div :style="S.card" style="max-width:820px;margin-bottom:14px;">
      <div :style="S.secTitle">🤖 如何把密钥交给 AI 智能体软件</div>
      <div style="font-size:12.5px;line-height:2.1;color:var(--text);">
        <div><b>第一步：在下方申请密钥</b>（选一个项目）→ 复制生成的 <code style="font-family:monospace;background:var(--bg);padding:1px 5px;border-radius:4px;">pha_…</code>（明文只显示这一次，请立即保存）</div>
        <div><b>第二步：把密钥交给 AI 软件</b>——三种方式任选一：</div>
        <div style="font-family:monospace;background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:8px 10px;margin:4px 0;font-size:12px;">
① 对话监控式（最简单）：直接把这句话贴给 AI：「请使用这个接口：X-Agent-Key: pha_你的密钥，基地地址 http://&lt;宿主机IP&gt;:3181/privhub/api/agent/v1/，可以帮我读写项目文件」<br/>
② 环境变量式（推荐，Claude Code 等）：在工具配置文件填入环境变量 PRIVHUB_AGENT_KEY=pha_xxx，并告诉它用这个变量做请求头<br/>
③ 工具说明文档式：把 docs/PrivHub-AgentAPI-接入指南.md 给 AI 看，它会按里面的配置模板接入
        </div>
        <div><b>第三步：验证</b>：<code style="font-family:monospace;">curl http://&lt;宿主机IP&gt;:3181/privhub/api/agent/v1/me -H "X-Agent-Key: pha_…"</code> 返回你的身份即成功</div>
      </div>
    </div>
    <div :style="S.section">
      <div :style="S.secTitle">🔑 申请新密钥（绑定自己，一项目一密钥）<span :style="HELP_Q" @click="openHelp('mykeys')">?</span></div>
      <div :style="S.card">
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <input v-model="myForm.name" placeholder="用途名称（如：写作助手）" :style="[S.input,{width:200}]" />
          <select v-model="myForm.project" :style="S.select">
            <option value="">选择项目…</option>
            <option v-for="p in projects" :key="p" :value="p">{{ p }}</option>
          </select>
          <button class="rag-btn" :style="S.btn" :disabled="myCreating" @click="applyMy">生成（明文仅显示一次）</button>
        </div>
        <div style="margin-top:8px;color:var(--muted);font-size:12px;">密钥按自然月到期，到期前 7 天系统会提醒续期；密钥迷失只能吊销重办。</div>
      </div>
    </div>
    <div :style="S.section">
      <div :style="S.secTitle">我的密钥清单</div>
      <div :style="S.card">
        <table :style="S.table">
          <tr><th :style="S.th">名称</th><th :style="S.th">项目</th><th :style="S.th">密钥</th><th :style="S.th">到期</th><th :style="S.th">状态</th><th :style="S.th">用量</th><th :style="S.th"></th></tr>
          <tr v-for="k in myKeys" :key="k.id">
            <td :style="S.td">{{ k.name }}</td>
            <td :style="S.td">{{ k.scope.kind === 'all' ? '全部可见项目' : k.scope.project }}</td>
            <td :style="S.td" style="font-family:monospace;">{{ k.keyMask }}</td>
            <td :style="S.td" style="white-space:nowrap;">{{ fmtDate(k.expiresAt) }}</td>
            <td :style="S.td">{{ k.status }}</td>
            <td :style="S.td">{{ k.usageCount }}</td>
            <td :style="S.td"><button class="rag-btn rag-danger" :style="S.btnDanger" @click="revokeMy(k.id)">吊销</button></td>
          </tr>
          <tr v-if="!myKeys.length"><td :style="S.td" colspan="7" style="color:var(--muted);">暂无密钥</td></tr>
        </table>
      </div>
    </div>
    <HelpTip v-if="helpKey" :help="HELP[helpKey]" @close="helpKey=''" />
  </div>`,
}

/* ================= 项目查重面板（全员；范围 = 当前项目） ================= */

/* 合并了原「搜索页查重」（同名同大小）与语料内容查重：
 *  - 文件层：/api/rag/dup.fileGroups  —— 所有文件类型，含未入语料的
 *  - 内容层：/api/rag/dup.contentGroups —— 语料内可解析文档、正文一字不差
 * 每组保留 1 个（默认第一个），其余勾选移入回收站（/api/delete）；删除后自动重扫 */
const RagDupPanel = {
  name: 'rag-dup-panel',
  components: { HelpTip },
  data() {
    return {
      S, HELP, HELP_Q, HINT_BAR, badge, fmtDate, nav,
      helpKey: '', projects: [], project: '', loading: false, error: '',
      res: null, keep: {}, del: {}, deleting: false,
    }
  },
  computed: {
    fileGroups() { return (this.res && this.res.fileGroups) || [] },
    contentGroups() { return (this.res && this.res.contentGroups) || [] },
    groupCount() { return this.fileGroups.length + this.contentGroups.length },
    dupCount() {
      return this.fileGroups.reduce((s, g) => s + g.count, 0) + this.contentGroups.reduce((s, g) => s + g.count, 0)
    },
    delCount() {
      return Object.keys(this.del).reduce((s, k) => s + this.del[k].length, 0)
    },
  },
  watch: {
    project() { this.load() },
  },
  mounted() {
    this.loadProjects()
  },
  methods: {
    openHelp(k) { this.helpKey = this.helpKey === k ? '' : k },
    async loadProjects() {
      try {
        const p = await api('/privhub/api/projects')
        if (p.ok) {
          this.projects = p.projects || []
          // 赋值触发 watch.project → load()；默认取文件页当前打开的项目
          this.project = this.nav.project || this.projects[0] || ''
        }
      } catch { /* 静默 */ }
    },
    pickProject(e) { this.project = e.target.value },
    async load() {
      if (!this.project) { this.res = null; this.error = ''; return }
      this.loading = true
      this.error = ''
      this.res = null
      try {
        const r = await api('/privhub/api/rag/dup?project=' + encodeURIComponent(this.project))
        if (r.ok) {
          this.res = r
          const keep = {}
          for (let g = 0; g < (r.fileGroups || []).length; g++) keep['f' + g] = 0
          for (let g = 0; g < (r.contentGroups || []).length; g++) keep['c' + g] = 0
          this.keep = keep
          this.del = {}
        } else this.error = r.error || '查重失败'
      } catch { this.error = '查重失败（网络错误）' }
      this.loading = false
    },
    secKey(section, gi) { return section + gi },
    keepFile(section, gi, fi) {
      const k = this.secKey(section, gi)
      this.keep[k] = fi
      const del = this.del[k]
      if (del && del[fi]) { del.splice(del.indexOf(fi), 1); if (!del.length) delete this.del[k] }
    },
    toggleDel(section, gi, fi) {
      const k = this.secKey(section, gi)
      const del = this.del[k] || (this.del[k] = [])
      const i = del.indexOf(fi)
      if (i >= 0) del.splice(i, 1)
      else {
        del.push(fi)
        // 若删的是当前保留项 → 保留自动切到组内第一个未删的
        if (this.keep[k] === fi) {
          const files = (section === 'f' ? this.fileGroups : this.contentGroups)[gi].files
          for (let j = 0; j < files.length; j++) {
            if (j !== fi && del.indexOf(j) < 0) { this.keep[k] = j; break }
          }
        }
      }
      if (!del.length) delete this.del[k]
    },
    isDel(section, gi, fi) {
      const d = this.del[this.secKey(section, gi)]
      return !!(d && d.indexOf(fi) >= 0)
    },
    rowStyle(section, gi, fi) {
      const base = 'display:flex;align-items:center;gap:10px;padding:7px 4px;border-bottom:1px solid var(--line);font-size:12.5px;'
      const k = this.secKey(section, gi)
      if (this.keep[k] === fi) return base + 'background:rgba(63,185,80,.07);'
      if (this.isDel(section, gi, fi)) return base + 'background:rgba(248,81,73,.07);opacity:.6;'
      return base
    },
    async doDelete() {
      if (this.delCount === 0) return
      if (!confirm('将勾选的 ' + this.delCount + ' 个重复文件移入回收站？（每组保留 1 个，其余删除）')) return
      this.deleting = true
      let okCount = 0
      try {
        const plan = []
        for (const [k, idxs] of Object.entries(this.del)) {
          const section = k[0]
          const gi = Number(k.slice(1))
          const groups = section === 'f' ? this.fileGroups : this.contentGroups
          const g = groups[gi]
          if (!g) continue
          for (const fi of idxs) {
            const file = g.files[fi]
            if (file) plan.push(file.path)
          }
        }
        for (const path of plan) {
          try {
            const r = await api('/privhub/api/delete', { method: 'POST', body: JSON.stringify({ project: this.project, path }) })
            if (r.ok) okCount++
            else window.PrivHub.toast(r.error || '删除失败：' + path, 'error')
          } catch { /* 单条失败继续 */ }
        }
      } finally { this.deleting = false }
      window.PrivHub.toast('已将 ' + okCount + '/' + this.delCount + ' 个重复文件移入回收站')
      window.PrivHub.bus && window.PrivHub.bus.emit('trash:changed', {})
      await this.load() // 删除后自动重扫
    },
  },
  template: `
  <div style="flex:1;min-height:0;display:flex;flex-direction:column;">
    <div style="padding:12px 18px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--line);flex-wrap:wrap;">
      <span style="font-size:14px;font-weight:700;">🔁 项目查重</span>
      <select :value="project" :style="S.select" style="max-width:220px;" @change="pickProject">
        <option value="">选择项目…</option>
        <option v-for="p in projects" :key="p" :value="p">{{ p }}</option>
      </select>
      <span :style="HELP_Q" @click="openHelp('dup')">?</span>
      <span style="flex:1"></span>
      <span v-if="!loading && !error && res" style="color:var(--muted);font-size:12px;">{{ groupCount }} 组重复 · 共 {{ dupCount }} 个文件</span>
      <button class="rag-btn" :style="S.btn" :disabled="loading || !project" @click="load">🔄 重新扫描</button>
    </div>
    <div style="flex:1;min-height:0;overflow:auto;padding:16px 20px;">
      <div v-if="!project" :style="S.card">👆 先在上方选择一个项目（默认是你在文件页打开的项目）。查重只针对单个项目，不跨项目。</div>
      <div v-else-if="loading" :style="S.card">正在扫描项目「{{ project }}」…</div>
      <div v-else-if="error" :style="S.card" style="color:#f85149;">{{ error }} <button class="rag-btn" :style="S.btn" @click="load">重试</button></div>
      <div v-else-if="groupCount === 0" :style="S.card" style="color:#3fb950;">
        ✅ 项目「{{ project }}」未发现重复文件（同名同大小 / 内容一字不差 两类均未命中），数据是干净的，可以放心上传新资料。
      </div>
      <template v-else>
        <!-- 文件层：同名同大小 -->
        <div v-if="fileGroups.length" :style="S.section">
          <div :style="S.secTitle">📄 同名同大小（{{ fileGroups.length }} 组）<span style="font-weight:400;color:var(--muted);font-size:12px;">所有文件类型都算，含图片/压缩包</span></div>
          <div v-for="(g, gi) in fileGroups" :key="'f' + gi" class="rag-dup-card" :style="[S.card,{marginBottom:'12px',padding:'10px 12px'}]">
            <div style="display:flex;align-items:center;gap:10px;padding:2px 4px 8px;font-size:12.5px;font-weight:600;border-bottom:1px solid var(--line);">
              <span>📄 {{ g.name }}</span>
              <span style="color:var(--muted);font-weight:400;">{{ g.sizeText }} × {{ g.count }} 份</span>
              <span style="flex:1"></span>
            </div>
            <div v-for="(f, fi) in g.files" :key="'f' + gi + '-' + fi" class="rag-dup-row" :style="rowStyle('f', gi, fi)">
              <label style="display:flex;align-items:center;gap:4px;color:var(--accent);font-size:12px;cursor:pointer;flex-shrink:0;">
                <input type="radio" :name="'dup-keep-f-' + gi" :checked="keep['f'+gi]===fi" @click="keepFile('f',gi,fi)" /> 保留
              </label>
              <label style="display:flex;align-items:center;gap:4px;color:#f85149;font-size:12px;cursor:pointer;flex-shrink:0;">
                <input type="checkbox" :checked="isDel('f',gi,fi)" @click="toggleDel('f',gi,fi)" /> 删除
              </label>
              <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);">{{ f.path }}</span>
              <span style="color:var(--muted);font-size:11.5px;flex-shrink:0;">{{ f.mtime }}</span>
            </div>
          </div>
        </div>
        <!-- 内容层：内容一字不差 -->
        <div v-if="contentGroups.length" :style="S.section">
          <div :style="S.secTitle">🧬 内容一字不差（{{ contentGroups.length }} 组）<span style="font-weight:400;color:var(--muted);font-size:12px;">名字或大小不同、但正文完全相同</span></div>
          <div v-for="(g, gi) in contentGroups" :key="'c' + gi" class="rag-dup-card" :style="[S.card,{marginBottom:'12px',padding:'10px 12px'}]">
            <div style="display:flex;align-items:center;gap:10px;padding:2px 4px 8px;font-size:12.5px;font-weight:600;border-bottom:1px solid var(--line);">
              <span>🧬 内容相同</span>
              <span style="color:var(--muted);font-weight:400;">{{ g.count }} 份</span>
              <span style="flex:1"></span>
            </div>
            <div v-for="(f, fi) in g.files" :key="'c' + gi + '-' + fi" class="rag-dup-row" :style="rowStyle('c', gi, fi)">
              <label style="display:flex;align-items:center;gap:4px;color:var(--accent);font-size:12px;cursor:pointer;flex-shrink:0;">
                <input type="radio" :name="'dup-keep-c-' + gi" :checked="keep['c'+gi]===fi" @click="keepFile('c',gi,fi)" /> 保留
              </label>
              <label style="display:flex;align-items:center;gap:4px;color:#f85149;font-size:12px;cursor:pointer;flex-shrink:0;">
                <input type="checkbox" :checked="isDel('c',gi,fi)" @click="toggleDel('c',gi,fi)" /> 删除
              </label>
              <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);">{{ f.path }}</span>
              <span style="color:var(--muted);font-size:11.5px;flex-shrink:0;">{{ fmtDate(f.updated) }}</span>
            </div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:6px;">
          <button class="rag-btn rag-danger" :style="S.btnDanger" :disabled="delCount === 0 || deleting" @click="doDelete">{{ deleting ? '处理中…' : '🗑 删除勾选的 ' + delCount + ' 个重复文件（移入回收站）' }}</button>
          <span style="color:var(--muted);font-size:12px;">每组必须保留 1 个（默认第一个）；删除后可从回收站找回，语料自动同步</span>
        </div>
      </template>
    </div>
    <HelpTip v-if="helpKey" :help="HELP[helpKey]" @close="helpKey=''" />
  </div>`,
}

/* ================= 视图二：治理（admin） ================= */

/* 重构为选项式，避免函数式组件复杂度 */
function makeAdminView() {
  return {
    name: 'rag-admin-view',
    components: { HelpTip, RagCorpusPanel, RagKeysPanel },
    data() { return { S, HELP, HELP_Q, HINT_BAR, badge, fmtDate, helpKey: '', tab: 'overview', status: null, pending: null, users: [], allProjects: [], projects: [], keys: [], trash: [], modelCfg: null, mForm: { llm: { baseURL: '', apiKey: '', model: '', timeoutMs: 60000 }, embedding: { baseURL: '', apiKey: '', model: '', timeoutMs: 30000 }, maxRetries: 2 }, keyForm: { name: '', username: '', project: '', all: false }, trashUser: '', building: false, saving: false, sel: {}, mergeSel: {}, vecStatus: null, vecBusy: false, vecTimer: null, qaQuestion: '', qaCollection: 'all', qaBusy: false, qaResult: null, discHosts: '', discBusy: false, discResult: null, discSel: {} } },
    computed: {
      healthTxt() {
        const h = (x) => (x?.status === 'ok' ? '✅ ok' : x?.status === 'unconfigured' ? '⚪ 未配置' : x?.status === 'unreachable' ? '❌ 不可达' : x?.status === 'timeout' ? '⏱ 超时' : x?.status === 'auth-error' ? '🔐 鉴权失败' : x?.status === 'model-missing' ? '⚠️ 模型名不在服务清单' : '❓ ' + (x?.status || '未知'))
        return { llm: h(this.status?.model?.llm), embedding: h(this.status?.model?.embedding) }
      },
      keyUsers() {
        // 生成表单：用户及其可见项目
        return this.users.map((u) => ({ username: u.username, projects: u.projects || [] }))
      },
      pendingGroups() { return this.pending?.groups || [] },
      pct() {
        const v = this.vecStatus
        return v ? Math.round(100 * (v.vec.done || 0) / Math.max(1, v.vec.total || 1)) : 0
      },
    },
    methods: {
      openHelp(k) { this.helpKey = this.helpKey === k ? '' : k },
      async refreshVec() {
        const r = await api('/privhub/api/rag/vectorize/status')
        if (r.ok) this.vecStatus = r
        this.vecBusy = r.ok && r.vec && r.vec.state === 'running'
        if (this.vecBusy && !this.vecTimer) {
          this.vecTimer = setInterval(() => {
            this.refreshVec().then(() => {
              if (!this.vecBusy && this.vecTimer) { clearInterval(this.vecTimer); this.vecTimer = null }
            })
          }, 3000)
        }
        if (!this.vecBusy && this.vecTimer) { clearInterval(this.vecTimer); this.vecTimer = null }
      },
      async startVec() {
        if (!confirm('开始向量化？（只对语料中未处理的块执行，可重复运行增量补齐）')) return
        const r = await api('/privhub/api/rag/vectorize', { method: 'POST' })
        if (r.ok) {
          window.PrivHub.toast('向量化已启动', 'success')
          this.vecBusy = true
          this.vecTimer = setInterval(() => { this.refreshVec().then(() => { if (!this.vecBusy && this.vecTimer) { clearInterval(this.vecTimer); this.vecTimer = null } }) }, 3000)
          await this.refreshVec()
        } else window.PrivHub.toast(r.error || '启动失败', 'error')
      },
      async ask() {
        const q = this.qaQuestion.trim()
        if (!q) { window.PrivHub.toast('请输入问题', 'error'); return }
        this.qaBusy = true
        this.qaResult = null
        try {
          const r = await api('/privhub/api/rag/ask', { method: 'POST', body: JSON.stringify({ question: q, collection: this.qaCollection }) })
          if (r.ok) { this.qaResult = r; window.PrivHub.toast(r.sources.length + ' 处引用', 'success') }
          else window.PrivHub.toast(r.error || '问答失败', 'error')
        } finally { this.qaBusy = false }
      },
      async discover() {
        this.discBusy = true
        this.discResult = null
        try {
          const hosts = this.discHosts.trim() ? this.discHosts.split(/[,，\s]+/).filter(Boolean) : []
          const r = await api('/privhub/api/rag/discover', { method: 'POST', body: JSON.stringify({ hosts }) })
          if (r.ok) { this.discResult = r; if (!r.services.length) window.PrivHub.toast('未发现模型服务（可尝试填写网段如 192.168.1.0/24）', 'info') }
          else window.PrivHub.toast(r.error || '扫描失败', 'error')
        } finally { this.discBusy = false }
      },
      discModel(svc, i) { return this.discSel[svc.baseURL] || (svc.models[i] || svc.models[0] || '') },
      pickModel(svc) { this.discSel[svc.baseURL] = svc.models[0] },
      fillModel(kind, svc) {
        const model = this.discSel[svc.baseURL] || svc.models[0]
        if (!model) { window.PrivHub.toast('该服务没有可用模型', 'error'); return }
        if (kind === 'llm') { this.mForm.llm.baseURL = svc.baseURL; this.mForm.llm.model = model }
        else { this.mForm.embedding.baseURL = svc.baseURL; this.mForm.embedding.model = model }
        window.PrivHub.toast('已填入' + (kind === 'llm' ? ' LLM' : ' embedding') + '：' + svc.baseURL + ' / ' + model + '，点「保存配置」生效', 'success')
      },
      async refresh() {
        const s = await api('/privhub/api/rag/status')
        if (s.ok) this.status = s
        const p = await api('/privhub/api/rag/pending')
        if (p.ok) this.pending = p
        const u = await api('/privhub/api/admin/users')
        if (u.ok) { this.users = u.users || []; this.allProjects = u.allProjects || [] }
        const k = await api('/privhub/api/agent/v1/keys')
        if (k.ok) this.keys = k.keys || []
        const pr = await api('/privhub/api/projects')
        if (pr.ok) this.projects = pr.projects || []
        await this.loadModel()
        await this.loadTrash()
        await this.refreshVec()
      },
      async rebuild() {
        if (!confirm('全量重建语料（幂等，会扫描全部项目）？')) return
        this.building = true
        try {
          const r = await api('/privhub/api/rag/rebuild', { method: 'POST' })
          if (r.ok) { window.PrivHub.toast(`重建完成: 扫描 ${r.scanned} · 更新 ${r.updated} · 移除 ${r.removed}`, 'success'); await this.refresh() }
          else window.PrivHub.toast(r.error || '重建失败', 'error')
        } finally { this.building = false }
      },
      async curate(action, docIds, note) {
        if (!docIds || !docIds.length) { window.PrivHub.toast('请先选择文档', 'error'); return }
        if (action === 'merge' && docIds.length < 2) { window.PrivHub.toast('合并需至少勾选 2 个（第一个为主文档）', 'error'); return }
        const r = await api('/privhub/api/rag/curate', { method: 'POST', body: JSON.stringify({ action, docIds, note }) })
        if (r.ok) { window.PrivHub.toast('已生效', 'success'); await this.refresh() }
        else window.PrivHub.toast(r.error || '操作失败', 'error')
      },
      async loadModel() {
        const c = await api('/privhub/api/model/config')
        if (c.ok && c.config) {
          this.mForm.llm = { ...c.config.llm }; this.mForm.embedding = { ...c.config.embedding }; this.mForm.maxRetries = c.config.maxRetries
        }
      },
      async saveModel() {
        this.saving = true
        try {
          const r = await api('/privhub/api/model/config', { method: 'POST', body: JSON.stringify(this.mForm) })
          if (r.ok) { window.PrivHub.toast('模型配置已保存', 'success'); await this.refresh() }
          else window.PrivHub.toast(r.error || '保存失败', 'error')
        } finally { this.saving = false }
      },
      async checkModel() {
        const r = await api('/privhub/api/model/status?force=1')
        if (r.ok) { this.status.model = r; window.PrivHub.toast('自检完成', 'success'); }
        else window.PrivHub.toast(r.error || '自检失败', 'error')
      },
      async loadTrash() {
        const t = await api('/privhub/api/agent/v1/trash?user=' + encodeURIComponent(this.trashUser))
        if (t.ok) this.trash = t.trash || []
      },
      async trashOp(op, id) {
        const r = await api('/privhub/api/agent/v1/trash/' + op, { method: 'POST', body: JSON.stringify({ id }) })
        if (r.ok) { window.PrivHub.toast(op === 'restore' ? '已恢复' : '已彻底删除', 'success'); await this.loadTrash() }
        else window.PrivHub.toast(r.error || '操作失败', 'error')
      },
      async genKey() {
        const f = this.keyForm
        if (!f.name || !f.username) { window.PrivHub.toast('请填写名称并选择用户', 'error'); return }
        const scope = f.all ? { kind: 'all' } : { kind: 'project', project: f.project }
        if (!f.all && !f.project) { window.PrivHub.toast('请选择项目范围', 'error'); return }
        const r = await api('/privhub/api/agent/v1/keys', { method: 'POST', body: JSON.stringify({ name: f.name, username: f.username, scope }) })
        if (r.ok) {
          window.PrivHub.toast(`密钥已生成（仅此一次显示）：${r.key}`, 'success')
          await this.refresh()
        } else window.PrivHub.toast(r.error || '生成失败', 'error')
      },
      async keyOp(op, id) {
        const r = await api('/privhub/api/agent/v1/keys/' + op, { method: 'POST', body: JSON.stringify({ id }) })
        if (r.ok) { window.PrivHub.toast('已执行：' + op, 'success'); await this.refresh() }
        else window.PrivHub.toast(r.error || '操作失败', 'error')
      },
      selOf(gIdx, docId) { return this.sel[gIdx + '|' + docId] === true },
      toggleSel(gIdx, docId) { this.sel[gIdx + '|' + docId] = !this.sel[gIdx + '|' + docId] },
      selIds(gIdx) { return (this.pendingGroups[gIdx]?.docs || []).filter((d) => this.sel[gIdx + '|' + d.docId]).map((d) => d.docId) },
    },
    mounted() { this.refresh() },
    template: `
  <div class="view-page">
    <div style="padding:14px 18px;display:flex;gap:0;border-bottom:1px solid var(--line);flex-wrap:wrap;">
      <button :style="tab==='corpus'?S.tabsBtnOn:S.tabsBtn" @click="tab='corpus'">📚 语料仓库</button>
      <button :style="tab==='overview'?S.tabsBtnOn:S.tabsBtn" @click="tab='overview'">📊 语料总览</button>
      <button :style="tab==='pending'?S.tabsBtnOn:S.tabsBtn" @click="tab='pending'">🧾 待裁决<template v-if="pending">（{{ pending.stats.exact + pending.stats.version + pending.stats.near }}）</template></button>
      <button :style="tab==='model'?S.tabsBtnOn:S.tabsBtn" @click="tab='model'">🤖 模型接入</button>
      <button :style="tab==='vec'?S.tabsBtnOn:S.tabsBtn" @click="tab='vec'">⚡ 向量化</button>
      <button :style="tab==='qa'?S.tabsBtnOn:S.tabsBtn" @click="tab='qa'">💬 问答</button>
      <button :style="tab==='keys'?S.tabsBtnOn:S.tabsBtn" @click="tab='keys'">🔑 Key 管理</button>
      <button :style="tab==='trash'?S.tabsBtnOn:S.tabsBtn" @click="tab='trash'">🗑 专属回收站</button>
      <button :style="tab==='mine'?S.tabsBtnOn:S.tabsBtn" @click="tab='mine'">🔑 我的 AI 密钥</button>
      <span style="flex:1"></span>
      <button class="rag-btn" :style="S.btn" :disabled="building" @click="rebuild">♻ 全量重建</button>
    </div>
    <div class="view-inner" style="padding:16px 18px;flex:1;overflow:auto;">
      <!-- 语料仓库（原「AI 语料」目录，合并入总台） -->
      <div v-if="tab==='corpus'"><RagCorpusPanel /></div>
      <!-- 总览 -->
      <div v-else-if="tab==='overview'" style="display:flex;gap:12px;flex-wrap:wrap;">
        <div style="width:100%;display:flex;align-items:center;justify-content:space-between;">
          <div :style="HINT_BAR" style="flex:1;margin-bottom:0;">💡 这里看三件事：语料有多少、待裁决有几组、模型通不通。每个卡片旁边点 <span :style="HELP_Q" @click="openHelp('overview')">?</span> 看说明；先配模型再问问题。</div>
        </div>
        <div :style="S.card" style="min-width:150px;"><div style="font-size:12px;color:var(--muted);">语料文档</div><div style="font-size:22px;font-weight:700;">{{ status?.corpus?.docs ?? 0 }}</div></div>
        <div :style="S.card" style="min-width:150px;"><div style="font-size:12px;color:var(--muted);">分块数</div><div style="font-size:22px;font-weight:700;">{{ status?.corpus?.chunks ?? 0 }}</div></div>
        <div :style="S.card" style="min-width:150px;"><div style="font-size:12px;color:var(--muted);">扫描件(未收录)</div><div style="font-size:22px;font-weight:700;">{{ status?.corpus?.scanOnly ?? 0 }}</div></div>
        <div :style="S.card" style="min-width:150px;"><div style="font-size:12px;color:var(--muted);">待裁决组</div><div style="font-size:22px;font-weight:700;">{{ (pending?.stats.exact ?? 0) + (pending?.stats.version ?? 0) + (pending?.stats.near ?? 0) }}</div></div>
        <div :style="S.card" style="min-width:170px;"><div style="font-size:12px;color:var(--muted);">策展</div><div style="font-size:13px;margin-top:4px;">canonical {{ status?.curation?.canonical ?? 0 }} · 剔除 {{ status?.curation?.excluded ?? 0 }} · 过期 {{ status?.curation?.expired ?? 0 }} · 并入 {{ status?.curation?.merged ?? 0 }}</div></div>
        <div :style="S.card" style="min-width:220px;flex:1;">
          <div style="font-size:12px;color:var(--muted);">模型接入</div>
          <div style="font-size:13px;margin-top:6px;">
            <div>问答 LLM：<span v-html="badge(healthTxt.llm,'var(--accent)')"></span></div>
            <div style="margin-top:4px;">向量 embedding：<span v-html="badge(healthTxt.embedding,'#3fb950')"></span></div>
            <div style="color:var(--muted);font-size:12px;margin-top:4px;">{{ status?.model?.checkedAt ? '最近检查 ' + fmtDate(status.model.checkedAt) : '' }} · <a style="color:var(--accent);cursor:pointer;" @click="checkModel">立即自检</a></div>
          </div>
        </div>
        <div :style="S.card" style="min-width:220px;flex:1;">
          <div style="font-size:12px;color:var(--muted);">类型分布</div>
          <div style="font-size:12px;margin-top:6px;display:flex;gap:8px;flex-wrap:wrap;">
            <span v-for="(n, t) in status?.corpus?.byType" :key="t" v-html="badge(t + ' ×' + n, 'var(--muted)')"></span>
          </div>
        </div>
      </div>
      <!-- 待裁决 -->
      <div v-else-if="tab==='pending'">
        <div :style="HINT_BAR">💡 系统自动找出「重复/版本冲突」的文档组——同一知识被多份文档命中会让 AI 答案来源混乱。勾选后处理：<span :style="HELP_Q" @click="openHelp('pending')">?</span> 看每个动作的含义。</div>
        <div v-for="(g, gi) in pendingGroups" :key="gi" :style="[S.card,{marginBottom:'14px'}]">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span v-html="badge(g.kind === 'exact' ? '完全重复' : g.kind === 'near' ? '近似重复' : '版本族', g.kind === 'exact' ? '#f85149' : g.kind === 'near' ? '#d29922' : '#a371f7')"></span>
            <span style="font-size:13px;">{{ g.reason }}</span>
            <span style="flex:1"></span>
            <button class="rag-btn" :style="S.btn" @click="curate('keep-canonical', selIds(gi), '保留首选')">⭐ 保留首选</button>
            <button class="rag-btn" :style="S.btn" @click="curate('exclude', selIds(gi), '剔除')">🚫 剔除</button>
            <button class="rag-btn" :style="S.btn" @click="curate('expire', selIds(gi), '标记过期', )">⏳ 过期365天</button>
            <button class="rag-btn" :style="S.btn" @click="curate('merge', selIds(gi), '合并')">🔗 合并（首个为主）</button>
          </div>
          <table :style="[S.table,{marginTop:'8px'}]">
            <tr><th :style="S.th" style="width:30px;"></th><th :style="S.th">文件</th><th :style="S.th">项目</th><th :style="S.th">更新</th><th :style="S.th">哈希</th></tr>
            <tr v-for="d in g.docs" :key="d.docId">
              <td :style="S.td"><input type="checkbox" :checked="selOf(gi, d.docId)" @change="toggleSel(gi, d.docId)" /></td>
              <td :style="S.td">{{ d.path }}</td>
              <td :style="S.td">{{ d.project }}</td>
              <td :style="S.td" style="white-space:nowrap;">{{ fmtDate(d.updated) }}</td>
              <td :style="S.td" style="font-family:monospace;color:var(--muted);">{{ d.hash }}</td>
            </tr>
          </table>
          <div style="color:var(--muted);font-size:12px;margin-top:6px;">操作仅作用于派生语料，原文不改动；可随时反操作。</div>
        </div>
        <div v-if="!pendingGroups.length" :style="S.card" style="color:#3fb950;">✅ 没有待裁决项——语料干净。</div>
      </div>
      <!-- 模型接入 -->
      <div v-else-if="tab==='model'">
        <div :style="HINT_BAR">💡 填「模型服务地址 + 模型名」即可驱动 RAG：LLM 负责回答、embedding 负责向量化。不会填？<span :style="HELP_Q" @click="openHelp('model')">?</span> 一步步教；没有真实模型可先填 <b style="color:var(--accent);">mock</b> 体验全流程。</div>
        <div :style="S.section"><div :style="S.secTitle">模型端点（OpenAI 兼容：Ollama / vLLM / LM Studio / DSH 网关）<span :style="HELP_Q" @click="openHelp('model')">?</span></div>
          <div :style="S.card" style="max-width:760px;">
            <div style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--accent);">问答 LLM（chat/completions）</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;">
              <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px;">baseURL</div><input v-model="mForm.llm.baseURL" placeholder="http://192.168.x.x:11434 或 mock" :style="S.input" /></div>
              <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px;">模型名</div><input v-model="mForm.llm.model" placeholder="qwen3:8b" :style="S.input" /></div>
              <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px;">apiKey（可选）</div><input v-model="mForm.llm.apiKey" placeholder="无鉴权可留空" :style="S.input" /></div>
              <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px;">超时 ms</div><input v-model.number="mForm.llm.timeoutMs" :style="S.input" /></div>
            </div>
            <div style="font-size:13px;font-weight:600;margin:14px 0 8px;color:#3fb950;">向量 embedding（embeddings）</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;">
              <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px;">baseURL</div><input v-model="mForm.embedding.baseURL" placeholder="http://192.168.x.x:11434 或 mock" :style="S.input" /></div>
              <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px;">模型名</div><input v-model="mForm.embedding.model" placeholder="bge-m3" :style="S.input" /></div>
              <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px;">apiKey（可选）</div><input v-model="mForm.embedding.apiKey" placeholder="无鉴权可留空" :style="S.input" /></div>
              <div><div style="font-size:11px;color:var(--muted);margin-bottom:4px;">超时 ms</div><input v-model.number="mForm.embedding.timeoutMs" :style="S.input" /></div>
            </div>
            <div style="margin-top:14px;display:flex;gap:10px;align-items:center;">
              <button class="rag-btn" :style="S.btn" :disabled="saving" @click="saveModel">保存配置</button>
              <button class="rag-btn" :style="S.btn" @click="checkModel">连通自检</button>
              <span style="color:var(--muted);font-size:12px;">LLM 与 embedding 可指向同一或不同服务；baseURL 填 mock 可离线模拟。</span>
            </div>
          </div>
        </div>
        <!-- 自动发现 -->
        <div :style="S.section">
          <div :style="S.secTitle">🔍 自动发现本地/局域网模型服务<span :style="HELP_Q" @click="openHelp('model')">?</span></div>
          <div :style="S.card">
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
              <input v-model="discHosts" placeholder="留空=扫描本机；或填网段 192.168.1.0/24（私网内）" :style="[S.input,{width:320}]" @keyup.enter="discover" />
              <button class="rag-btn" :style="S.btn" :disabled="discBusy" @click="discover">{{ discBusy ? '扫描中…' : '🔍 开始扫描' }}</button>
              <span style="color:var(--muted);font-size:12px;">常见端口：Ollama 11434 · LM Studio 1234 · vLLM 8000 · llama.cpp 8080 等</span>
            </div>
            <div v-if="discResult" style="margin-top:12px;">
              <div style="font-size:12px;color:var(--muted);margin-bottom:8px;">扫描 {{ discResult.scanned }} 个目标 · 发现 {{ discResult.services.length }} 个服务。选择模型 → 点「设为 LLM / 设为 embedding」自动填入上方表单。</div>
              <div v-for="(svc, i) in discResult.services" :key="svc.baseURL" style="display:flex;gap:10px;align-items:center;padding:8px 10px;border:1px solid var(--line);border-radius:8px;margin-bottom:8px;flex-wrap:wrap;background:var(--panel);">
                <span v-html="badge(svc.kind === 'ollama' ? 'Ollama' : svc.kind === 'openai' ? 'OpenAI 兼容' : '未知', svc.kind === 'ollama' ? '#3fb950' : '#58a6ff')"></span>
                <code style="font-family:monospace;font-size:12px;">{{ svc.baseURL }}</code>
                <span style="color:var(--muted);font-size:12px;">{{ svc.latencyMs }}ms · {{ svc.models.length }} 模型</span>
                <span style="flex:1"></span>
                <select v-if="svc.models.length" :value="discSel[svc.baseURL] || svc.models[0]" :style="S.select" @change="discSel[svc.baseURL] = $event.target.value">
                  <option v-for="m in svc.models" :key="m" :value="m">{{ m }}</option>
                </select>
                <button class="rag-btn" :style="S.btn" @click="fillModel('llm', svc)">→ 设为 LLM</button>
                <button class="rag-btn" :style="S.btn" @click="fillModel('embedding', svc)">→ 设为 embedding</button>
              </div>
              <div v-if="!discResult.services.length" style="color:var(--muted);font-size:12px;">未发现模型服务。检查：① 模型服务是否已启动 ② 是否在私网段内 ③ 可换填网段再扫。</div>
            </div>
          </div>
        </div>
      </div>
      <!-- Key 管理 -->
      <div v-else-if="tab==='keys'">
        <div :style="HINT_BAR">💡 给局域网智能体发「访问凭证」：绑定用户 + 选定项目，生成的 key 只能看该用户在该项目内的内容。流程与注意事项：<span :style="HELP_Q" @click="openHelp('keys')">?</span></div>
        <div :style="S.section"><div :style="S.secTitle">🔑 生成密钥（绑定用户 + 单项目 scope）<span :style="HELP_Q" @click="openHelp('keys')">?</span></div>
          <div :style="S.card" style="max-width:760px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
            <input v-model="keyForm.name" placeholder="用途（如：审批群智能体）" :style="[S.input,{width:180}]" />
            <select v-model="keyForm.username" :style="S.select"><option value="">选择用户…</option><option v-for="u in keyUsers" :key="u.username" :value="u.username">{{ u.username }}</option></select>
            <select v-model="keyForm.project" :style="S.select" :disabled="keyForm.all">
              <option value="">选择项目…</option>
              <option v-for="p in (keyUsers.find(u => u.username === keyForm.username)?.projects || [])" :key="p" :value="p">{{ p }}</option>
            </select>
            <label style="font-size:12px;color:var(--muted);"><input type="checkbox" v-model="keyForm.all" /> 全部可见项目（有数据污染风险，慎用）</label>
            <button class="rag-btn" :style="S.btn" @click="genKey">生成（明文仅一次）</button>
          </div>
        </div>
        <div :style="S.section"><div :style="S.secTitle">密钥清单</div>
          <div :style="S.card">
            <table :style="S.table">
              <tr><th :style="S.th">名称</th><th :style="S.th">用户</th><th :style="S.th">项目范围</th><th :style="S.th">状态</th><th :style="S.th">到期</th><th :style="S.th">用量</th><th :style="S.th">密钥</th><th :style="S.th">操作</th></tr>
              <tr v-for="k in keys" :key="k.id">
                <td :style="S.td">{{ k.name }}</td>
                <td :style="S.td">{{ k.username }}</td>
                <td :style="S.td">{{ k.scope.kind === 'all' ? '全部' : k.scope.kind === 'directory' ? k.scope.project + '/' + k.scope.path : k.scope.project }}</td>
                <td :style="S.td">{{ k.status }}</td>
                <td :style="S.td" style="white-space:nowrap;">{{ fmtDate(k.expiresAt) }}</td>
                <td :style="S.td">{{ k.usageCount }}</td>
                <td :style="S.td" style="font-family:monospace;color:var(--muted);">{{ k.keyMask }}</td>
                <td :style="S.td" style="white-space:nowrap;">
                  <button class="rag-btn" :style="S.btn" @click="keyOp('rotate', k.id)">续期</button>
                  <button class="rag-btn" :style="S.btn" @click="keyOp(k.status === 'suspended' ? 'resume' : 'suspend', k.id)">{{ k.status === 'suspended' ? '恢复' : '挂起' }}</button>
                  <button class="rag-btn rag-danger" :style="S.btnDanger" @click="keyOp('revoke', k.id)">吊销</button>
                </td>
              </tr>
              <tr v-if="!keys.length"><td :style="S.td" colspan="8" style="color:var(--muted);">暂无密钥</td></tr>
            </table>
            <div style="color:var(--muted);font-size:12px;margin-top:6px;">续期 = 签发同配置新 key（旧 key 保留至自然到期，平滑迁移）；明文仅生成时显示一次。</div>
          </div>
        </div>
      </div>
      <!-- 专属回收站 -->
      <div v-else-if="tab==='trash'">
        <div :style="HINT_BAR">💡 智能体从专属空间删除的文件先进这里（隐藏目录的回收站）——误删可救回。操作说明：<span :style="HELP_Q" @click="openHelp('trash')">?</span></div>
        <div :style="S.section"><div :style="S.secTitle">🗑 专属空间回收站（.agents/ 智能体生成物）<span :style="HELP_Q" @click="openHelp('trash')">?</span></div>
          <div :style="S.card" style="max-width:760px;display:flex;gap:10px;align-items:center;">
            <input v-model="trashUser" placeholder="按用户名过滤（留空=全部）" :style="[S.input,{width:200}]" />
            <button class="rag-btn" :style="S.btn" @click="loadTrash">查询</button>
          </div>
        </div>
        <div :style="S.card">
          <table :style="S.table">
            <tr><th :style="S.th">用户</th><th :style="S.th">路径</th><th :style="S.th">删除者</th><th :style="S.th">删除时间</th><th :style="S.th">操作</th></tr>
            <tr v-for="t in trash" :key="t.id">
              <td :style="S.td">{{ t.project.replace('.agents/','') }}</td>
              <td :style="S.td">{{ t.relPath || t.name }}</td>
              <td :style="S.td">{{ t.deletedBy }}</td>
              <td :style="S.td" style="white-space:nowrap;">{{ fmtDate(t.deletedAt) }}</td>
              <td :style="S.td" style="white-space:nowrap;">
                <button class="rag-btn" :style="S.btn" @click="trashOp('restore', t.id)">恢复</button>
                <button class="rag-btn rag-danger" :style="S.btnDanger" @click="trashOp('purge', t.id)">彻底删除</button>
              </td>
            </tr>
            <tr v-if="!trash.length"><td :style="S.td" colspan="5" style="color:var(--muted);">回收站为空</td></tr>
          </table>
        </div>
      </div>
      <!-- 我的 AI 密钥（自助申请 + 交给 AI 的教程，admin 也自己用） -->
      <div v-else-if="tab==='mine'"><RagKeysPanel /></div>
      <!-- 向量化 -->
      <div v-else-if="tab==='vec'">
        <div :style="HINT_BAR">💡 语料文本已自动入库，这里是「转成向量」的一步——点击开始即可，进度实时显示，可重复运行增量补齐。说明：<span :style="HELP_Q" @click="openHelp('vec')">?</span></div>
        <div :style="S.card" style="max-width:640px;">
          <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
            <div>
              <div style="font-size:12px;color:var(--muted);">当前状态</div>
              <div style="font-size:17px;font-weight:700;">
                <template v-if="vecBusy">⏳ 进行中…</template>
                <template v-else>⚪ 空闲（当前没有正在执行的向量化任务）</template>
              </div>
              <div v-if="!vecBusy" style="font-size:12px;color:var(--muted);margin-top:2px;">
                <template v-if="vecStatus && vecStatus.vec.finishedAt">上次结果：{{ vecStatus.vec.state === 'done' ? '已完成' : '部分完成（失败 ' + vecStatus.vec.failed + '，可重跑）' }} {{ vecStatus.vec.done }}/{{ vecStatus.vec.total }} · {{ fmtDate(vecStatus.vec.finishedAt) }}</template>
                <template v-else>尚未执行过向量化</template>
              </div>
            </div>
            <div style="flex:1;min-width:200px;">
              <template v-if="vecBusy">
                <div style="font-size:12px;color:var(--muted);margin-bottom:4px;">进度：{{ vecStatus ? vecStatus.vec.done + ' / ' + vecStatus.vec.total : 0 }}</div>
                <div style="height:10px;border-radius:5px;background:var(--line);overflow:hidden;">
                  <div :style="'height:100%;width:' + pct + '%;background:var(--accent);transition:width .5s;'"></div>
                </div>
              </template>
              <div v-else style="font-size:12px;color:var(--muted);">点下方「开始向量化」执行；重复点击 = 增量补齐新增文档（自动跳过已向量化内容）</div>
            </div>
            <div>
              <div style="font-size:12px;color:var(--muted);">向量库内</div>
              <div style="font-size:14px;font-weight:600;">{{ vecStatus ? vecStatus.db.count : 0 }} 块 · {{ vecStatus && vecStatus.db.dims ? vecStatus.db.dims + ' 维' : '-' }}</div>
            </div>
          </div>
          <div style="margin-top:14px;display:flex;gap:10px;align-items:center;">
            <button class="rag-btn" :style="S.btn" style="background:var(--accent);border-color:var(--accent);color:#fff;" :disabled="vecBusy || !vecStatus" @click="startVec">⚡ 开始向量化</button>
            <button class="rag-btn" :style="S.btn" @click="refreshVec">刷新</button>
            <span style="color:var(--muted);font-size:12px;">{{ vecStatus && vecStatus.vec.error ? '上次错误：' + vecStatus.vec.error.slice(0, 80) : '' }}</span>
          </div>
        </div>
        <div :style="S.card" style="max-width:640px;margin-top:14px;">
          <div :style="S.secTitle" style="font-size:13px;">前提检查</div>
          <div style="font-size:12px;line-height:2;color:var(--muted);">
            <div>· embedding 模型：<span v-html="badge(healthTxt.embedding,'#3fb950')"></span>（未配置或不可达时先到「模型接入」配置）</div>
            <div>· 语料文档：语料总览中的「语料文档」数（0 则无内容可向量化）</div>
            <div>· 向量库文件：data/rag-corpus/vectors.db（随 data 备份；可随时删掉重新生成）</div>
          </div>
        </div>
      </div>
      <!-- 问答 -->
      <div v-else-if="tab==='qa'">
        <div :style="HINT_BAR">💡 向语料提问，回答带来源引用，严格限定你权限内项目。用法：<span :style="HELP_Q" @click="openHelp('qa')">?</span></div>
        <div :style="S.card" style="max-width:720px;">
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
            <select v-model="qaCollection" :style="S.select">
              <option value="all">全部可见项目</option>
              <option v-for="p in projects" :key="p" :value="p">{{ p }}</option>
            </select>
            <input v-model="qaQuestion" placeholder="输入你的问题，例如：这份合同的核心条款是什么？" :style="[S.input,{flex:1,minWidth:260}]" @keyup.enter="ask" />
            <button class="rag-btn" :style="S.btn" style="background:var(--accent);border-color:var(--accent);color:#fff;" :disabled="qaBusy" @click="ask">{{ qaBusy ? '思考中…' : '发送' }}</button>
          </div>
          <div v-if="qaResult" style="margin-top:14px;">
            <div style="white-space:pre-wrap;font-size:13px;line-height:1.8;color:var(--text);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:12px 14px;">{{ qaResult.answer }}</div>
            <div v-if="qaResult.sources && qaResult.sources.length" style="margin-top:10px;">
              <div style="font-size:12px;color:var(--muted);margin-bottom:6px;">📚 引用来源（{{ qaResult.sources.length }}）</div>
              <div v-for="(s, i) in qaResult.sources" :key="s.chunkId" style="margin-bottom:6px;font-size:12px;color:var(--muted);">
                <span style="color:var(--accent);font-weight:600;">[{{ i + 1 }}]</span> {{ s.project }}/{{ s.path }}<div style="margin-top:2px;color:var(--muted);padding-left:16px;">{{ s.snippet }}…</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <HelpTip v-if="helpKey" :help="HELP[helpKey]" @close="helpKey=''" />
  </div>`,
  }
}

const RagAdminView = makeAdminView()

/* 文件页「🔁 查重」按钮跳转钩子：置 intent → 打开 AI 工具视图（由 RagView 消费） */
if (!window.PrivHub.openRagDup) {
  window.PrivHub.openRagDup = () => {
    window.PrivHub.ragIntent = { tab: 'dup' }
    const it = (window.PrivHub.barItems || []).find((b) => b.view === 'rag')
    if (it && window.PrivHub.openBarItem) window.PrivHub.openBarItem(it)
    else window.PrivHub.toast('查重页面未就绪', 'error')
  }
}

/* 合并入口（单一 barItem「AI 工具」，全员）：
 *   外层页签：🔁 查重（项目查重，全员）+ admin 🧰 语料治理（原治理总台）/ user 🔑 我的 AI 密钥
 *   冷启动默认：admin=语料治理（保持原落点），user=查重；文件页查重按钮带 intent 直达查重页签 */
const RagView = {
  name: 'rag-view',
  components: { RagAdminView, RagKeysPanel, RagDupPanel },
  data() { return { S, isAdmin: false, tab: 'gov' } },
  mounted() {
    const u = window.PrivHub && window.PrivHub.AUTH && window.PrivHub.AUTH.user
    this.isAdmin = !!(u && u.role === 'admin')
    const it = window.PrivHub && window.PrivHub.ragIntent
    if (it && it.tab === 'dup') this.tab = 'dup'
    window.PrivHub.ragIntent = null
    if (!this.isAdmin && this.tab === 'gov') this.tab = 'dup'
    if (this.isAdmin && this.tab === 'mine') this.tab = 'gov'
  },
  template: `
  <div class="view-page">
    <div style="padding:10px 18px 0;display:flex;gap:0;border-bottom:1px solid var(--line);flex-wrap:wrap;background:var(--panel);">
      <button :style="tab==='dup'?S.tabsBtnOn:S.tabsBtn" @click="tab='dup'">🔁 查重</button>
      <button v-if="isAdmin" :style="tab==='gov'?S.tabsBtnOn:S.tabsBtn" @click="tab='gov'">🧰 语料治理</button>
      <button v-else :style="tab==='mine'?S.tabsBtnOn:S.tabsBtn" @click="tab='mine'">🔑 我的 AI 密钥</button>
    </div>
    <div style="flex:1;min-height:0;display:flex;flex-direction:column;">
      <RagDupPanel v-if="tab==='dup'" />
      <div v-else-if="tab==='gov'" style="flex:1;min-height:0;"><RagAdminView /></div>
      <div v-else class="view-inner" style="padding:16px 18px;"><RagKeysPanel /></div>
    </div>
  </div>`,
}

export default {
  id: 'privhub-svc-rag',
  slots: { 'rag-view': RagView },
}