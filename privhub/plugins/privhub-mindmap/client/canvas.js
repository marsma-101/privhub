/**
 * canvas — SVG 画布组件（**只管画与看**：缩放 / 平移 / 适应窗口 / 折叠 / 选中）。
 *
 * 这一层刻意不碰文件、不碰任何接口：所有变更都以事件抛给 `editor.js`，
 * 由 editor 去改树、去存盘。好处是画布可以单独喂一棵构造出来的树来跑（测试与以后复用）。
 *
 * 交互约定（写在页脚提示里，与这里保持一致）：
 *   · 单击节点 = 选中（工具条的增删改都以选中节点为基准）；
 *   · 双击节点 = 改名；圆点 = 折叠 / 展开该子树；
 *   · 空白处拖拽 = 平移；滚轮 = 以光标为锚点的缩放；
 *   · Tab / Enter / Delete / F2 = 子节点 / 同级 / 删除 / 改名（画布聚焦时）。
 *
 * @module privhub-mindmap/client/canvas
 */

import { layoutTree } from './layout.js'

/** 缩放范围（再小就看不清、再大就没意义）。 */
const ZOOM_MIN = 0.15
const ZOOM_MAX = 4

const MindCanvas = {
  name: 'mindmap-canvas',
  props: {
    root: { type: Object, required: true },
    selected: { type: String, default: null },
    folded: { type: Object, default: () => ({}) },
    /* 变一次 = 请求「适应窗口」一次（editor 在载入完成 / 点按钮 / 切视图时自增）。 */
    fitToken: { type: Number, default: 0 },
  },
  emits: ['select', 'fold', 'add-child', 'add-sibling', 'remove', 'rename'],
  data() {
    return { zoom: 1, tx: 0, ty: 0, panning: false }
  },
  computed: {
    layout() { return layoutTree(this.root, this.folded) },
    transform() { return 'translate(' + this.tx + ',' + this.ty + ') scale(' + this.zoom + ')' },
  },
  watch: {
    fitToken() { this.$nextTick(() => this.fit()) },
  },
  mounted() {
    this.fit()
    /* 面板尺寸变化（切「并排 / 画布」视图、收起侧栏）时重新适应 —— 否则画布会停在旧尺寸的居中位。 */
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => { if (!this.panning) this.fit() })
      this._ro.observe(this.$el)
    }
    /* 滚轮要 preventDefault 才拦得住浏览器缩放，passive:false 是硬需求。 */
    this._onWheel = (e) => this.onWheel(e)
    this.$el.addEventListener('wheel', this._onWheel, { passive: false })
  },
  beforeUnmount() {
    if (this._ro) { this._ro.disconnect(); this._ro = null }
    if (this.$el && this._onWheel) this.$el.removeEventListener('wheel', this._onWheel)
  },
  methods: {
    /* ── 视图控制 ─────────────────────────────────────────────── */
    size() {
      const r = this.$el.getBoundingClientRect()
      return { w: r.width || this.$el.clientWidth || 800, h: r.height || this.$el.clientHeight || 600 }
    },
    fit() {
      const L = this.layout
      const { w, h } = this.size()
      const margin = 24
      const z = Math.min((w - margin * 2) / L.width, (h - margin * 2) / L.height, 1)
      this.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z || 1))
      this.tx = (w - L.width * this.zoom) / 2
      this.ty = (h - L.height * this.zoom) / 2
    },
    zoomAt(factor, cx, cy) {
      const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, this.zoom * factor))
      const k = next / this.zoom
      this.tx = cx - (cx - this.tx) * k
      this.ty = cy - (cy - this.ty) * k
      this.zoom = next
    },
    zoomStep(factor) {
      const { w, h } = this.size()
      this.zoomAt(factor, w / 2, h / 2)
    },
    onWheel(e) {
      e.preventDefault()
      const r = this.$el.getBoundingClientRect()
      this.zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top)
    },
    /* ── 平移（空白处拖拽；节点上按下不抢，交给点击） ───────────── */
    onDown(e) {
      if (e.button !== 0) return
      this.panning = true
      this._px = e.clientX
      this._py = e.clientY
      this._tx = this.tx
      this._ty = this.ty
      this.$el.setPointerCapture && this.$el.setPointerCapture(e.pointerId)
    },
    onMove(e) {
      if (!this.panning) return
      this.tx = this._tx + (e.clientX - this._px)
      this.ty = this._ty + (e.clientY - this._py)
    },
    onUp(e) {
      if (!this.panning) return
      this.panning = false
      this.$el.releasePointerCapture && this.$el.releasePointerCapture(e.pointerId)
    },
    /* ── 选择 / 折叠 ──────────────────────────────────────────── */
    pick(n) { this.$emit('select', n.key) },
    toggleFold(n) { this.$emit('fold', n.key) },
    /* ── 键盘（画布聚焦时） ───────────────────────────────────── */
    onKey(e) {
      if (e.key === 'Tab') { e.preventDefault(); this.$emit('add-child') }
      else if (e.key === 'Enter') { e.preventDefault(); this.$emit('add-sibling') }
      else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); this.$emit('remove') }
      else if (e.key === 'F2') { e.preventDefault(); this.$emit('rename') }
    },
  },
  template: `
    <div class="mm-canvaswrap" tabindex="0" @keydown="onKey"
         @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="onUp"
         :style="{ cursor: panning ? 'grabbing' : 'grab' }">
      <!-- 刻意**不用 viewBox**：viewBox 会让 SVG 自带的缩放与下面的 zoom 变换叠加，
           拖拽/滚轮的换算就变成「屏幕像素 vs 用户单位」两套尺度，锚点立刻算错。
           这里让 1 用户单位 = 1 CSS 像素，缩放平移全部由 transform 一处负责。 -->
      <svg class="mm-svg" width="100%" height="100%">
        <g :transform="transform">
          <path v-for="l in layout.links" :key="l.key" :d="l.d" fill="none"
                :stroke="layout.byKey.get(l.from).color" stroke-width="1.6" stroke-opacity="0.5" stroke-linecap="round"></path>
          <g v-for="n in layout.nodes" :key="n.key" class="mm-n" :class="{ sel: n.key === selected, root: n.isRoot }"
             @click.stop="pick(n)">
            <rect :x="n.x" :y="n.y - n.h / 2" :width="n.w" :height="n.h" :rx="n.isRoot ? 8 : 6" :ry="n.isRoot ? 8 : 6"
                  :fill="n.isRoot ? n.color : 'var(--panel2)'" :stroke="n.color"
                  :stroke-width="n.isRoot ? 1.5 : 1.2" :fill-opacity="n.isRoot ? 1 : 1"></rect>
            <text :x="n.x + 12" :y="n.y" dominant-baseline="central" text-anchor="start"
                  :font-size="n.isRoot ? 14 : 13" :font-weight="n.isRoot ? 600 : 400"
                  :fill="n.isRoot ? '#fff' : (n.depth === 1 ? n.color : 'var(--text)')">
              {{ n.display }}
            </text>
            <title>{{ n.title }}</title>
            <circle v-if="n.hasChildren" class="mm-fold" :cx="n.x + n.w + 11" :cy="n.y" r="8.5"
                    :stroke="n.color" @click.stop="toggleFold(n)"></circle>
            <text v-if="n.hasChildren" class="mm-fold-t" :x="n.x + n.w + 11" :y="n.y" text-anchor="middle"
                  dominant-baseline="central" :fill="n.color" @click.stop="toggleFold(n)">{{ n.folded ? '+' : '−' }}</text>
          </g>
        </g>
      </svg>
    </div>
  `,
}

export { MindCanvas }
