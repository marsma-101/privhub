/**
 * privhub-files-kg · client — 知识图谱视图（挂 kg slot）
 *
 * 项目选择 → GET /api/kg → SVG 节点图：
 *   - 布局：**自研力导向**（Fruchterman-Reingold，见 layout()）。为什么不用第三方
 *     d3-force：本项目**无构建步骤**，前端插件是浏览器直接 import 的裸 ES module，
 *     引库就得把一份 UMD/ESM 产物手工 vendor 进插件目录并长期跟版本 —— 而这里
 *     需要的只是「算坐标」这一件事，60 行确定性迭代足够（改进方案 §2.7 / Q5）。
 *   - 交互：拖拽平移、滚轮缩放（以指针为中心）、双击复位、图内搜索高亮并回车聚焦、
 *     边分型过滤（双链 / 标签共现）、只看孤立节点、聚焦某文件的局部一跳图
 *   - 画布随容器尺寸自适应（不再写死 860×520）
 *   - 规模保护：图接口回带 truncated 时明说「仅显示 Top-N」，不静默截断
 *   - 点击节点 → 定位文件（跳目录 + 选中）；hover 高亮邻接
 *
 * @module privhub-files-kg/client
 */

const { api, nav } = window.PrivHub

const PALETTE = ['#6e8fd8', '#7cc48a', '#e0a35c', '#d47d9a', '#8f9bc4', '#6ab8b8', '#b89ad4', '#c9a05f']
/** 画布留白：节点半径 + 名称文字需要地方，贴边会被裁掉 */
const PAD = 46
/** 缩放范围：下限要能看全大图，上限要能读清文字 */
const ZOOM_MIN = 0.25
const ZOOM_MAX = 3

/** 文件所在目录（根目录 = ''，供"按目录过滤"用） */
const dirOf = (path) => (path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '')

const KgView = {
  name: 'kg-view',
  data() {
    return {
      projects: [],
      project: '',
      graph: null,
      loading: false,
      status: '',
      zoom: 1,
      panX: 0,
      panY: 0,
      hover: null,
      q: '',
      showLink: true,
      showTag: true,
      isolateOnly: false,
      focusPath: '',
      tagFilter: '',
      dirFilter: '',
      minDeg: 0,
      positions: [],
      edgeLines: [],
      W: 860,
      H: 520,
      dragging: false,
      _drag: null,
    }
  },
  computed: {
    /**
     * 过滤后的可见子图（§2.5 边分型 / §2.7 标签·目录·度数·孤立 / §2.7 聚焦局部图）。
     * 顺序是刻意的：先按边分型收窄边 → 再挑节点 → 最后把悬挂边剪掉，
     * 否则"已过滤掉节点的边"会在画布上留下指向虚空的线。
     */
    visibleGraph() {
      const g = this.graph
      if (!g) return null
      let edges = g.edges.filter((e) => (e.type === 'link' ? this.showLink : this.showTag))
      let nodes = g.nodes
      if (this.focusPath) {
        const keep = new Set([this.focusPath])
        for (const e of edges) {
          if (e.source === this.focusPath) keep.add(e.target)
          if (e.target === this.focusPath) keep.add(e.source)
        }
        nodes = nodes.filter((n) => keep.has(n.path))
        edges = edges.filter((e) => keep.has(e.source) && keep.has(e.target))
      }
      const tf = this.tagFilter.trim().toLowerCase()
      const df = this.dirFilter
      const md = Number(this.minDeg) || 0
      if (tf) nodes = nodes.filter((n) => (n.tags || []).some((t) => String(t).toLowerCase().includes(tf)))
      if (df) nodes = nodes.filter((n) => dirOf(n.path) === df)
      if (md > 0) {
        const deg = new Map()
        for (const e of edges) { deg.set(e.source, (deg.get(e.source) || 0) + 1); deg.set(e.target, (deg.get(e.target) || 0) + 1) }
        nodes = nodes.filter((n) => (deg.get(n.path) || 0) >= md)
      }
      if (tf || df || md > 0) {
        const keep = new Set(nodes.map((n) => n.path))
        edges = edges.filter((e) => keep.has(e.source) && keep.has(e.target))
      }
      if (this.isolateOnly) {
        const deg = new Set()
        for (const e of edges) { deg.add(e.source); deg.add(e.target) }
        nodes = nodes.filter((n) => !deg.has(n.path))
        edges = []
      }
      return { ...g, nodes, edges }
    },
    /** 密集图里"值得标名"的枢纽节点：度数前 12（度数 < 3 的不算枢纽） */
    hubLabels() {
      const vg = this.visibleGraph
      if (!vg) return new Set()
      const deg = new Map()
      for (const e of vg.edges) {
        deg.set(e.source, (deg.get(e.source) || 0) + 1)
        deg.set(e.target, (deg.get(e.target) || 0) + 1)
      }
      return new Set(
        [...deg.entries()]
          .filter(([, d]) => d >= 3)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 12)
          .map(([p]) => p),
      )
    },
    /** 图里出现过的目录（供"按目录过滤"下拉） */
    allDirs() {
      if (!this.graph) return []
      return [...new Set(this.graph.nodes.map((n) => dirOf(n.path)))].sort()
    },
    /** 图里出现过的标签（供"按标签过滤"下拉） */
    allTags() {
      if (!this.graph) return []
      return [...new Set(this.graph.nodes.flatMap((n) => n.tags || []))].sort()
    },
    /** 影响坐标的过滤条件（变化才重排；q/hover 只影响高亮，不在其中） */
    layoutKey() {
      return [this.showLink, this.showTag, this.isolateOnly, this.focusPath, this.tagFilter, this.dirFilter, this.minDeg].join('|')
    },
    colorOf() {
      const map = {}
      if (this.graph) {
        this.graph.communities.forEach((group, i) => {
          for (const p of group) map[p] = PALETTE[i % PALETTE.length]
        })
      }
      return (path) => map[path] || PALETTE[0]
    },
    /** 命中搜索词的节点（空查询 = 无高亮，不改变任何透明度） */
    matches() {
      const q = this.q.trim().toLowerCase()
      if (!q || !this.visibleGraph) return new Set()
      return new Set(this.visibleGraph.nodes.filter((n) => n.name.toLowerCase().includes(q)).map((n) => n.path))
    },
    /** 当前选中文件是否在本图内（决定「聚焦」按钮是否可用） */
    focusable() {
      const s = nav.selected
      if (!s || s.isDir) return false
      if (!this.graph || nav.project !== this.project) return false
      const p = nav.relPathOf(s.name)
      return this.graph.nodes.some((n) => n.path === p)
    },
    truncNote() {
      const t = this.graph && this.graph.truncated
      if (!t) return ''
      const parts = []
      if (this.graph.nodes.length < t.nodeTotal) parts.push(`节点 ${this.graph.nodes.length}/${t.nodeTotal}`)
      if (this.graph.edges.length < t.edgeTotal) parts.push(`边 ${this.graph.edges.length}/${t.edgeTotal}`)
      if (t.tagGroupsTrimmed) parts.push(`${t.tagGroupsTrimmed} 个标签的文件过多，团内只连了前 40 篇`)
      return parts.length ? '⚠ 图过大，已按关联度截断显示：' + parts.join('、') : ''
    },
  },
  watch: {
    /* 单个 watcher 盯住"全部影响坐标的条件"：一次交互只重排一次 */
    layoutKey() { this.layout() },
  },
  methods: {
    colorAt(i) { return PALETTE[i % PALETTE.length] },

    async loadProjects() {
      const r = await api('/privhub/api/projects')
      if (r.ok) {
        this.projects = r.projects
        if (!this.project && this.projects.length) { this.project = nav.project || this.projects[0]; await this.load() }
      }
    },

    async load() {
      if (!this.project) return
      this.loading = true
      this.status = ''
      try {
        const r = await api('/privhub/api/kg?project=' + encodeURIComponent(this.project))
        if (r.ok) {
          this.graph = r.graph
          // 换项目/刷新：过滤条件必须清空（旧项目的目录/标签名在新图里不存在，
          // 留着会得到一个"空图 + 下拉框空白"的困惑态）
          this.focusPath = ''
          this.q = ''
          this.tagFilter = ''
          this.dirFilter = ''
          this.minDeg = 0
          this.resetView()
          // 上面的字段变更会各自触发 layoutKey watcher；布局是确定性的，
          // 重复排一次只是同样的坐标算两遍，不会跳变（成本已由节点上限约束）
          this.layout()
        } else {
          this.status = r.error || '加载失败'
        }
      } finally { this.loading = false }
    },

    /**
     * 自研力导向布局（Fruchterman-Reingold）。
     *
     * 为什么值得自己写而不是照旧用"社区圆环"：圆环布局里节点只按社区均分在圆周上，
     * 同一社区内部的**真实连接结构**完全看不出来，节点一多还必然重叠成球（这是
     * 改进方案 §2.7 点名的病）。力导向让"连得多的挤在一起"，社区结构自己浮现。
     *
     * 三个刻意的取舍：
     *   · 初始位置用**黄金角螺旋**而不是随机数 —— 同一份图每次布局一致，
     *     用户刷新后不会"图突然换了个形状"，回归里也能复现。
     *   · 迭代次数随节点数下降（n² 的斥力计算），400 节点量级仍是百毫秒级；
     *     真正的规模保护在服务端做（§2.8），这里只保证不至于卡住界面。
     *   · 温度退火 + 每轮限位，避免节点飞出画布后靠"引力"慢慢爬回来。
     */
    layout() {
      const g = this.visibleGraph
      if (!g || g.nodes.length === 0) { this.positions = []; this.edgeLines = []; return }
      const n = g.nodes.length
      const W = this.W
      const H = this.H
      const cx = W / 2
      const cy = H / 2
      const idx = new Map()
      const deg = new Map()
      g.nodes.forEach((nd, i) => { idx.set(nd.path, i); deg.set(nd.path, 0) })
      for (const e of g.edges) {
        deg.set(e.source, (deg.get(e.source) || 0) + 1)
        deg.set(e.target, (deg.get(e.target) || 0) + 1)
      }
      const R = Math.max(60, Math.min(W, H) * 0.45)
      const pos = g.nodes.map((nd, i) => {
        const a = i * 2.399963229728653   // 黄金角
        const rr = Math.sqrt((i + 0.5) / n) * R
        return { x: cx + rr * Math.cos(a), y: cy + rr * Math.sin(a) }
      })
      const k = Math.sqrt((W * H) / Math.max(1, n)) * 0.55
      const iters = n <= 120 ? 220 : n <= 250 ? 130 : 70
      let temp = Math.min(W, H) / 8
      const cool = temp / (iters + 1)
      const disp = pos.map(() => ({ x: 0, y: 0 }))
      /* 软边界：只在节点飞出可视区很远时拉回，**不做硬夹取**。
         硬夹取的后果实测过（n=120 时最近两点只剩 3px、n=400 直接重合）：被同时
         推到边框上的节点会沿着边框叠成一条线，图看起来"糊成一团"——这正是
         §2.7 要修的病。收敛后统一做 fit-to-view 落到画布内。 */
      const M = Math.max(W, H)
      for (let it = 0; it < iters; it++) {
        for (let i = 0; i < n; i++) { disp[i].x = 0; disp[i].y = 0 }
        // 斥力：所有点对（n²，节点数已被服务端上限约束）
        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            let dx = pos[i].x - pos[j].x
            let dy = pos[i].y - pos[j].y
            let d2 = dx * dx + dy * dy
            if (d2 < 0.01) { dx = 0.1 + i * 0.001; dy = 0.1; d2 = dx * dx + dy * dy }
            const d = Math.sqrt(d2)
            const f = (k * k) / d
            const ux = dx / d
            const uy = dy / d
            disp[i].x += ux * f; disp[i].y += uy * f
            disp[j].x -= ux * f; disp[j].y -= uy * f
          }
        }
        // 引力：有边相连的点对
        for (const e of g.edges) {
          const a = idx.get(e.source)
          const b = idx.get(e.target)
          if (a === undefined || b === undefined) continue
          const dx = pos[a].x - pos[b].x
          const dy = pos[a].y - pos[b].y
          const d = Math.max(0.01, Math.sqrt(dx * dx + dy * dy))
          const f = (d * d) / k
          const ux = dx / d
          const uy = dy / d
          disp[a].x -= ux * f; disp[a].y -= uy * f
          disp[b].x += ux * f; disp[b].y += uy * f
        }
        for (let i = 0; i < n; i++) {
          // 轻微向心：防止连通分量被推到角落
          disp[i].x += (cx - pos[i].x) * 0.02
          disp[i].y += (cy - pos[i].y) * 0.02
          const dl = Math.sqrt(disp[i].x * disp[i].x + disp[i].y * disp[i].y) || 1
          const lim = Math.min(dl, temp)
          pos[i].x += (disp[i].x / dl) * lim
          pos[i].y += (disp[i].y / dl) * lim
          if (pos[i].x < -M) pos[i].x = -M
          else if (pos[i].x > W + M) pos[i].x = W + M
          if (pos[i].y < -M) pos[i].y = -M
          else if (pos[i].y > H + M) pos[i].y = H + M
        }
        temp = Math.max(0.4, temp - cool)
      }
      /* 收敛之后还有两步"可读性"处理，都是为了让 §2.7 那句"50+ 节点不再重叠成球"
         真的成立 —— 力导向只保证"结构对"，不保证"点不压在一起"：
         B. fit-to-view：等比映射进画布留白（上限放大 1.4 倍，免得三两个节点
            被撑成一屏巨大圆点）。等比缩放不会把节点压到一条线上。
         C. 去重叠：对"圆心距 < 两个半径 + 2"的点对沿连线各推开一半，迭代若干轮。
            这是局部修正，不动整体结构，但把重叠直接消掉（力导向的比值力只会
            "趋于分散"，收敛在有限步数里总会留下几对贴死的点）。
         D. 回缩：C 会把外圈顶出画布，所以只在超框时按中心等比缩回来（允许的
            缩量很小，且是等比的 —— 这正是 D 和"每轮硬夹取"的差别）。 */
      const fp = pos.map((p) => ({ x: p.x, y: p.y }))
      const rBase = (i) => 9 + Math.min(9, deg.get(g.nodes[i].path) || 0)
      const availW = Math.max(40, W - 2 * PAD)
      const availH = Math.max(40, H - 2 * PAD)
      const fitFill = () => {
        let a = Infinity; let b = Infinity; let c = -Infinity; let d = -Infinity
        for (const p of fp) {
          if (p.x < a) a = p.x
          if (p.x > c) c = p.x
          if (p.y < b) b = p.y
          if (p.y > d) d = p.y
        }
        const bw = Math.max(1, c - a)
        const bh = Math.max(1, d - b)
        const s = Math.min(availW / bw, availH / bh, 1.4)
        const ox = PAD + (availW - bw * s) / 2 - a * s
        const oy = PAD + (availH - bh * s) / 2 - b * s
        for (const p of fp) { p.x = p.x * s + ox; p.y = p.y * s + oy }
        return s
      }
      const fitShrink = () => {
        let a = Infinity; let b = Infinity; let c = -Infinity; let d = -Infinity
        for (const p of fp) {
          if (p.x < a) a = p.x
          if (p.x > c) c = p.x
          if (p.y < b) b = p.y
          if (p.y > d) d = p.y
        }
        const s = Math.min(1, availW / Math.max(1, c - a), availH / Math.max(1, d - b))
        if (s >= 1) return 1
        const mx = (a + c) / 2
        const my = (b + d) / 2
        for (const p of fp) { p.x = W / 2 + (p.x - mx) * s; p.y = H / 2 + (p.y - my) * s }
        return s
      }
      let s = fitFill()
      let rFinal = Math.max(0.55, Math.min(1, s))
      for (let round = 0; round < 2; round++) {
        const rs = g.nodes.map((_, i) => rBase(i) * rFinal)
        // 迭代到不动点为止（上限 30 轮）：推开一对可能压到另一对，所以要反复。
        // 实测 400 节点 12 轮会剩 9 对贴在一起 —— "几乎不重叠"和"不重叠"在
        // 界面上的差别就是"糊成一片"和"看得清"，值得多花这几个毫秒。
        for (let it = 0; it < 30; it++) {
          let moved = 0
          for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
              let dx = fp[i].x - fp[j].x
              let dy = fp[i].y - fp[j].y
              const need = rs[i] + rs[j] + 2
              const d2 = dx * dx + dy * dy
              if (d2 >= need * need) continue
              let d = Math.sqrt(d2)
              if (d < 0.01) { dx = (i % 7) * 0.3 + 0.05; dy = (j % 7) * 0.3 + 0.05; d = Math.sqrt(dx * dx + dy * dy) }
              const push = ((need - d) / 2 / d) * 0.95
              fp[i].x += dx * push; fp[i].y += dy * push
              fp[j].x -= dx * push; fp[j].y -= dy * push
              moved++
            }
          }
          if (!moved) break
        }
        /* 关键：回缩必须**同时**缩半径。只缩坐标的话，"圆心距 ≥ 两半径之和"
           这个刚建立起来的不变式会被等比缩坐标破坏（半径没跟着缩），
           400 节点时实测又冒出 32 对重叠 —— 这是本文件唯一一条不能省的不变式。 */
        const s2 = fitShrink()
        if (s2 < 1) rFinal *= s2
      }
      this.positions = g.nodes.map((nd, i) => ({ x: fp[i].x, y: fp[i].y, r: rBase(i) * rFinal, node: nd }))
      const byPath = new Map()
      g.nodes.forEach((nd, i) => byPath.set(nd.path, { x: fp[i].x, y: fp[i].y }))
      this.edgeLines = g.edges.map((e) => {
        const a = byPath.get(e.source)
        const b = byPath.get(e.target)
        return a && b ? { x1: a.x, y1: a.y, x2: b.x, y2: b.y, type: e.type } : null
      }).filter(Boolean)
    },

    /* ---- 视图变换：平移 / 缩放 ---- */
    resetView() {
      this.zoom = 1
      this.panX = 0
      this.panY = 0
    },
    /** 以 (mx,my) 为锚点缩放：锚点在画布上的位置保持不变（= "向指针处放大"） */
    zoomAt(factor, mx, my) {
      const z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.zoom * factor))
      const k = z / this.zoom
      this.panX = mx - (mx - this.panX) * k
      this.panY = my - (my - this.panY) * k
      this.zoom = z
    },
    zoomBy(d) { this.zoomAt(1 + d, this.W / 2, this.H / 2) },
    onWheel(e) {
      const box = this.$refs.svg && this.$refs.svg.getBoundingClientRect()
      const mx = box ? e.clientX - box.left : this.W / 2
      const my = box ? e.clientY - box.top : this.H / 2
      this.zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, mx, my)
    },
    onDown(e) {
      this.dragging = true
      this._drag = { x: e.clientX, y: e.clientY, px: this.panX, py: this.panY }
    },
    onMove(e) {
      if (!this.dragging || !this._drag) return
      this.panX = this._drag.px + (e.clientX - this._drag.x)
      this.panY = this._drag.py + (e.clientY - this._drag.y)
    },
    onUp() { this.dragging = false; this._drag = null },
    /** 回车：把第一个命中节点移到视野中心（搜到了却找不到在哪，等于没搜到） */
    focusHit() {
      const p = this.positions.find((x) => this.matches.has(x.node.path))
      if (!p) return
      this.panX = this.W / 2 - p.x * this.zoom
      this.panY = this.H / 2 - p.y * this.zoom
    },
    focusSelected() {
      const s = nav.selected
      if (!s || s.isDir || !this.graph) return
      const p = nav.relPathOf(s.name)
      if (!this.graph.nodes.some((n) => n.path === p)) { window.PrivHub.toast('该文件不在当前图谱里（需要是 .md 或带标签的文件）', 'error'); return }
      this.focusPath = p
    },
    clearFocus() { this.focusPath = '' },

    /* ---- 关系高亮 ---- */
    isAdjacent(path) {
      if (!this.graph) return false
      if (this.hover === path) return true
      const vg = this.visibleGraph
      return !!vg && vg.edges.some((e) =>
        (e.source === this.hover && e.target === path) || (e.source === path && e.target === this.hover))
    },
    /** 节点不透明度：hover 邻接 > 搜索命中 > 普通；搜索进行中非命中变淡 */
    nodeOpacity(path) {
      if (this.hover) return this.isAdjacent(path) ? 0.95 : 0.2
      if (this.q.trim()) return this.matches.has(path) ? 1 : 0.18
      return 0.85
    },
    /**
     * 是否画名称：节点密到一定程度时，**标注比圆点更早糊成一片** ——
     * 力导向收敛后 200+ 节点的最近邻距离只有 ~14px，而一个名字宽 30~60px，
     * 全画出来就是一片灰。所以密集图只标"在意的那几个"：
     * 度数排前 12 的节点（图里的枢纽），外加 hover 的与搜索命中的；
     * 想全看就把图放大到 1.8x 以上（那是用户明确的意图，由他决定）。
     */
    showLabel(path) {
      if (this.hover === path) return true
      if (this.q.trim()) return this.matches.has(path)
      const vg = this.visibleGraph
      if (!vg) return false
      if (vg.nodes.length <= 150) return true
      if (this.zoom >= 1.8) return true
      return this.hubLabels.has(path)
    },
    label(path, name) {
      if (this.q.trim() && this.matches.has(path)) return name
      return name.length > 10 ? name.slice(0, 10) + '…' : name
    },

    async go(node) {
      const dir = node.path.includes('/') ? node.path.slice(0, node.path.lastIndexOf('/')) : ''
      await nav.openDir(this.project, dir)
      const e = nav.entries.find((x) => x.name === node.name)
      if (e) nav.selectEntry(e)
      window.PrivHub.toast('已定位：' + node.name)
    },
  },
  async mounted() {
    await this.loadProjects()
    this._onMove = (e) => this.onMove(e)
    this._onUp = () => this.onUp()
    window.addEventListener('mousemove', this._onMove)
    window.addEventListener('mouseup', this._onUp)
    // 画布自适应：容器宽度变化就重排（旧版写死 860×520，窄屏直接被裁）
    if (typeof ResizeObserver !== 'undefined' && this.$refs.wrap) {
      this._ro = new ResizeObserver(() => {
        const box = this.$refs.wrap.getBoundingClientRect()
        const w = Math.max(360, Math.round(box.width))
        const h = Math.max(320, Math.round(Math.min(720, box.height || 520)))
        if (w !== this.W || h !== this.H) { this.W = w; this.H = h; this.layout() }
      })
      this._ro.observe(this.$refs.wrap)
    }
  },
  beforeUnmount() {
    if (this._onMove) window.removeEventListener('mousemove', this._onMove)
    if (this._onUp) window.removeEventListener('mouseup', this._onUp)
    if (this._ro) this._ro.disconnect()
  },
  template: `
    <div class="view-page">
      <div class="view-inner">
        <h2>🕸️ 知识图谱</h2>
        <div class="modal-body">
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap">
            <select v-model="project" @change="load" style="padding:7px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text)">
              <option value="" disabled>选择项目…</option>
              <option v-for="p in projects" :key="p" :value="p">{{ p }}</option>
            </select>
            <input v-model="q" @keyup.enter="focusHit" placeholder="图内搜索节点名…" style="padding:6px 8px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text);width:160px" />
            <span v-if="q.trim()" style="font-size:12px;color:var(--muted)">命中 {{ matches.size }} 个{{ matches.size ? '（回车聚焦）' : '' }}</span>
            <button class="small-btn" @click="zoomBy(0.2)">＋</button>
            <button class="small-btn" @click="zoomBy(-0.2)">－</button>
            <button class="small-btn" @click="resetView">复位</button>
            <button class="small-btn" @click="load">🔄 刷新</button>
          </div>

          <div style="display:flex;gap:14px;align-items:center;margin-bottom:8px;flex-wrap:wrap;font-size:12px;color:var(--muted)">
            <label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" v-model="showLink" /> 双链</label>
            <label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" v-model="showTag" /> 标签共现</label>
            <label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" v-model="isolateOnly" /> 只看孤立节点</label>
            <select v-model="dirFilter" title="按目录过滤" style="padding:4px 6px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text);font-size:12px">
              <option value="">全部目录</option>
              <option v-for="d in allDirs" :key="d" :value="d">{{ d === '' ? '（根目录）' : d }}</option>
            </select>
            <select v-model="tagFilter" title="按标签过滤" style="padding:4px 6px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text);font-size:12px">
              <option value="">全部标签</option>
              <option v-for="t in allTags" :key="t" :value="t">{{ t }}</option>
            </select>
            <label style="display:flex;align-items:center;gap:4px;cursor:pointer" title="只显示度数（关联数）不小于该值的节点">
              度数 ≥ <input type="number" min="0" max="20" step="1" v-model.number="minDeg" style="width:52px;padding:3px 5px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text);font-size:12px" />
            </label>
            <button class="small-btn" :disabled="!focusable" :title="focusable ? '只显示该文件的一跳邻域' : '先在文件列表里选中一个在本图内的文件'" @click="focusSelected">🎯 聚焦选中文件</button>
            <span v-if="focusPath" style="display:inline-flex;align-items:center;gap:6px;background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:2px 8px">
              聚焦：{{ focusPath }} <span role="button" tabindex="0" style="cursor:pointer;color:var(--accent)" @click="clearFocus" @keydown.enter="clearFocus">✕</span>
            </span>
            <span>{{ status }} · 拖拽平移 · 滚轮缩放 · 双击复位 · 点击节点定位文件</span>
          </div>

          <div v-if="truncNote" style="margin-bottom:8px;font-size:12px;color:var(--warn);background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:6px 10px">{{ truncNote }}</div>

          <div v-if="loading" class="empty" style="padding:60px">图谱构建中…</div>
          <div v-else-if="graph && graph.nodes.length === 0" class="empty" style="padding:60px">
            📄 该项目暂无 Markdown 文档。<br />用「📝 新建文档」创建 .md 文件（含 [[双链]] 或共享标签）即可生成知识图谱。
          </div>
          <div v-else-if="graph && visibleGraph && visibleGraph.nodes.length === 0" class="empty" style="padding:40px">
            当前过滤条件下没有节点。试试打开「双链 / 标签共现」或取消「只看孤立节点」。
          </div>
          <div v-else-if="graph" ref="wrap" style="border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--panel2)">
            <svg ref="svg" :width="W" :height="H" style="display:block;cursor:grab" @wheel.prevent="onWheel" @mousedown="onDown" @dblclick="resetView">
              <g :transform="'translate(' + panX + ',' + panY + ') scale(' + zoom + ')'">
                <line
                  v-for="(l, i) in edgeLines" :key="i"
                  :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2"
                  :stroke="l.type === 'link' ? 'rgba(110,143,216,.55)' : 'rgba(180,170,150,.45)'"
                  :stroke-dasharray="l.type === 'tag' ? '4 4' : ''"
                  stroke-width="1.2"
                />
                <g
                  v-for="p in positions" :key="p.node.id"
                  :transform="'translate(' + p.x + ',' + p.y + ')'"
                  style="cursor:pointer"
                  @mousedown.stop
                  @dblclick.stop
                  @click="go(p.node)"
                  @mouseenter="hover = p.node.path"
                  @mouseleave="hover = null"
                >
                  <circle :r="p.r" :fill="colorOf(p.node.path)" :fill-opacity="nodeOpacity(p.node.path)" stroke="#fff" stroke-width="1.5" />
                  <text y="5" text-anchor="middle" font-size="14">📄</text>
                  <text v-if="showLabel(p.node.path)" y="24" text-anchor="middle" font-size="11" fill="var(--text)" :opacity="nodeOpacity(p.node.path) < 0.5 ? 0.35 : 1">{{ label(p.node.path, p.node.name) }}</text>
                </g>
              </g>
            </svg>
          </div>
          <div v-else class="empty" style="padding:60px">请选择项目查看图谱</div>

          <div v-if="graph && visibleGraph && visibleGraph.nodes.length" style="display:flex;gap:12px;margin-top:8px;font-size:12px;color:var(--muted);flex-wrap:wrap;align-items:center">
            <span>显示 {{ visibleGraph.nodes.length }} 节点 · {{ visibleGraph.edges.length }} 边<template v-if="visibleGraph.nodes.length !== graph.nodes.length"> / 全图 {{ graph.nodes.length }} · {{ graph.edges.length }}</template> · 连通分量 {{ graph.communities.length }}</span>
            <span style="display:inline-flex;align-items:center;gap:4px"><svg width="26" height="8"><line x1="0" y1="4" x2="26" y2="4" stroke="rgba(110,143,216,.75)" stroke-width="2" /></svg>双链</span>
            <span style="display:inline-flex;align-items:center;gap:4px"><svg width="26" height="8"><line x1="0" y1="4" x2="26" y2="4" stroke="rgba(150,140,120,.85)" stroke-width="2" stroke-dasharray="4 4" /></svg>标签共现</span>
            <span v-for="(c, i) in graph.communities" :key="i" style="display:inline-flex;align-items:center;gap:4px">
              <span :style="{ width: '10px', height: '10px', borderRadius: '50%', background: colorAt(i), display: 'inline-block' }"></span>
              <span>{{ c.length }}</span>
            </span>
          </div>

          <!-- G3 洞察卡片 -->
          <div v-if="graph && graph.insights && graph.nodes.length" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-top:12px">
            <div style="background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px 14px">
              <div style="font-size:11px;color:var(--muted);margin-bottom:4px">📊 图结构</div>
              <div style="font-size:13px;color:var(--text)">{{ graph.insights.nodeCount }} 节点 · {{ graph.insights.edgeCount }} 边</div>
              <div style="font-size:12px;color:var(--muted)">{{ graph.insights.communityCount }} 个社区（最大 {{ graph.insights.maxCommunitySize }} 节点）· {{ graph.insights.isolatedCount }} 孤立</div>
            </div>
            <div style="background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px 14px">
              <div style="font-size:11px;color:var(--muted);margin-bottom:4px">🔗 关联</div>
              <div style="font-size:13px;color:var(--text)">{{ graph.insights.linkEdges }} 双链 · {{ graph.insights.tagEdges }} 标签共现</div>
              <div style="font-size:12px;color:var(--muted)">双链密度 {{ Math.round(graph.insights.linkDensity * 100) }}%</div>
            </div>
            <div v-if="graph.insights.hubs.length" style="background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px 14px">
              <div style="font-size:11px;color:var(--muted);margin-bottom:4px">⭐ 核心节点</div>
              <div v-for="hb in graph.insights.hubs" :key="hb.name" style="font-size:12.5px;color:var(--text);display:flex;justify-content:space-between;gap:8px">
                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ hb.name }}</span><span style="color:var(--accent)">{{ hb.degree }}</span>
              </div>
            </div>
            <div v-if="graph.insights.topTags.length" style="background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px 14px">
              <div style="font-size:11px;color:var(--muted);margin-bottom:4px">🏷️ 热门标签</div>
              <div v-for="tg in graph.insights.topTags" :key="tg.tag" style="font-size:12.5px;color:var(--text);display:flex;justify-content:space-between;gap:8px">
                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ tg.tag }}</span><span style="color:var(--warn)">×{{ tg.count }}</span>
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
  id: 'privhub-files-kg',
  drawerWidth: 640,
  slots: {
    kg: KgView,
  },
}
