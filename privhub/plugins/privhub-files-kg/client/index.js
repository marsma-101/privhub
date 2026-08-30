/**
 * privhub-files-kg · client — 知识图谱视图（挂 kg slot，模态形态）
 *
 * 项目选择 → GET /api/kg → SVG 节点图：
 *   - 布局：社区分组圆环（每个连通分量一个子环，分布在主圆上），确定性无迭代
 *   - 社区同色系着色（8 色调色板循环）；双链边实线、标签共现边虚线
 *   - 滚轮缩放（0.4x–2.5x）+ 按钮放大/缩小/复位；hover 高亮邻接边与节点
 *   - 点击节点 → 定位文件（跳目录 + 选中 + 预览）；空态引导文案
 *
 * @module privhub-files-kg/client
 */

const { api, nav } = window.PrivHub

const PALETTE = ['#6e8fd8', '#7cc48a', '#e0a35c', '#d47d9a', '#8f9bc4', '#6ab8b8', '#b89ad4', '#c9a05f']

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
      hover: null,
      positions: [], // [{x, y, node}]
      edgeLines: [], // [{x1,y1,x2,y2,type}]
      W: 860,
      H: 520,
    }
  },
  computed: {
    colorOf() {
      const map = {}
      if (this.graph) {
        this.graph.communities.forEach((group, i) => {
          for (const p of group) map[p] = PALETTE[i % PALETTE.length]
        })
      }
      return (path) => map[path] || PALETTE[0]
    },
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
          this.layout()
          this.zoom = 1
        } else {
          this.status = r.error || '加载失败'
        }
      } finally { this.loading = false }
    },
    /** 社区分组圆环布局：主圆上按社区角度分布，社区内节点均匀分布在小圆上。 */
    layout() {
      const g = this.graph
      if (!g || g.nodes.length === 0) { this.positions = []; this.edgeLines = []; return }
      const R = Math.min(this.W, this.H) / 2 - 60
      const cx = this.W / 2
      const cy = this.H / 2
      const k = g.communities.length
      const pos = new Map()
      g.communities.forEach((group, gi) => {
        const n = group.length
        const centerA = k === 1 ? -Math.PI / 2 : (2 * Math.PI * gi) / k - Math.PI / 2
        const cx2 = k === 1 ? cx : cx + (R * 0.62) * Math.cos(centerA)
        const cy2 = k === 1 ? cy : cy + (R * 0.62) * Math.sin(centerA)
        const r2 = k === 1 ? R : Math.max(28, Math.min(70, R * 0.32 * Math.min(1, 6 / n)))
        group.forEach((path, i) => {
          const a = (2 * Math.PI * i) / n - Math.PI / 2
          pos.set(path, { x: cx2 + r2 * Math.cos(a), y: cy2 + r2 * Math.sin(a) })
        })
      })
      this.positions = g.nodes.map((node) => ({ ...pos.get(node.path), node }))
      this.edgeLines = g.edges.map((e) => {
        const a = pos.get(e.source)
        const b = pos.get(e.target)
        return a && b ? { x1: a.x, y1: a.y, x2: b.x, y2: b.y, type: e.type } : null
      }).filter(Boolean)
    },
    zoomBy(d) {
      this.zoom = Math.min(2.5, Math.max(0.4, this.zoom + d))
    },
    onWheel(e) {
      e.preventDefault()
      this.zoomBy(e.deltaY < 0 ? 0.1 : -0.1)
    },
    isAdjacent(path) {
      if (!this.hover || !this.graph) return false
      if (this.hover === path) return true
      return this.graph.edges.some((e) =>
        (e.source === this.hover && e.target === path) || (e.source === path && e.target === this.hover))
    },
    async go(node) {
      const dir = node.path.includes('/') ? node.path.slice(0, node.path.lastIndexOf('/')) : ''
      await nav.openDir(this.project, dir)
      const e = nav.entries.find((x) => x.name === node.name)
      if (e) nav.selectEntry(e)
      this.status = '已定位：' + node.name
    },
  },
  async mounted() {
    await this.loadProjects()
  },
  template: `
    <div class="drawer-mask" @click.self="$emit('close')">
      <div class="drawer">
        <h2>🕸️ 知识图谱</h2>
        <div class="modal-body">
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap">
            <select v-model="project" @change="load" style="padding:7px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text)">
              <option value="" disabled>选择项目…</option>
              <option v-for="p in projects" :key="p" :value="p">{{ p }}</option>
            </select>
            <button class="small-btn" @click="zoomBy(0.2)">＋</button>
            <button class="small-btn" @click="zoomBy(-0.2)">－</button>
            <button class="small-btn" @click="zoom = 1">复位</button>
            <button class="small-btn" @click="load">🔄 刷新</button>
            <span style="font-size:12px;color:var(--muted)">{{ status }} · 滚轮缩放 · 点击节点定位文件</span>
          </div>

          <div v-if="loading" class="empty" style="padding:60px">图谱构建中…</div>
          <div v-else-if="graph && graph.nodes.length === 0" class="empty" style="padding:60px">
            📄 该项目暂无 Markdown 文档。<br />用「📝 新建文档」创建 .md 文件（含 [[双链]] 或共享标签）即可生成知识图谱。
          </div>
          <div v-else-if="graph" style="border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--panel2)">
            <svg :width="W" :height="H" style="display:block" @wheel.prevent="onWheel">
              <g :transform="'translate(' + (W/2 - W/2*zoom) + ',' + (H/2 - H/2*zoom) + ') scale(' + zoom + ')'">
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
                  @click="go(p.node)"
                  @mouseenter="hover = p.node.path"
                  @mouseleave="hover = null"
                >
                  <circle r="17" :fill="colorOf(p.node.path)" :fill-opacity="hover && !isAdjacent(p.node.path) ? 0.25 : 0.85" stroke="#fff" stroke-width="1.5" />
                  <text y="5" text-anchor="middle" font-size="14">📄</text>
                  <text y="34" text-anchor="middle" font-size="11" fill="var(--text)">{{ p.node.name.length > 8 ? p.node.name.slice(0, 8) + '…' : p.node.name }}</text>
                </g>
              </g>
            </svg>
          </div>
          <div v-else class="empty" style="padding:60px">请选择项目查看图谱</div>

          <div v-if="graph && graph.nodes.length" style="display:flex;gap:12px;margin-top:8px;font-size:12px;color:var(--muted);flex-wrap:wrap;align-items:center">
            <span>节点 {{ graph.nodes.length }} · 边 {{ graph.edges.length }} · 连通分量 {{ graph.communities.length }}</span>
            <span v-for="(c, i) in graph.communities" :key="i" style="display:inline-flex;align-items:center;gap:4px">
              <span :style="{ width: '10px', height: '10px', borderRadius: '50%', background: colorAt(i), display: 'inline-block' }"></span>
              <span>{{ c.length }}</span>
            </span>
            <span>实线=双链 · 虚线=标签共现</span>
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
