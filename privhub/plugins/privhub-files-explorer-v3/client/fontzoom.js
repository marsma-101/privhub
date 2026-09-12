/**
 * fontzoom — 顶栏整体缩放（user-area slot）。
 * @module privhub-files-explorer-v3/client/fontzoom
 */

/* ================= 顶栏字体缩放（user-area slot） ================= */
const FontZoom = {
  name: 'v3-font-zoom',
  data() {
    return {
      scale: parseFloat(localStorage.getItem('privhub_ui_font_scale') || '1') || 1,
    }
  },
  methods: {
    apply() {
      document.documentElement.style.zoom = String(this.scale)
      document.documentElement.style.setProperty('--ui-zoom', String(this.scale))
      try { localStorage.setItem('privhub_ui_font_scale', String(this.scale)) } catch { /* 忽略 */ }
    },
    inc() { this.scale = Math.min(1.4, Math.round((this.scale + 0.1) * 10) / 10); this.apply() },
    dec() { this.scale = Math.max(0.8, Math.round((this.scale - 0.1) * 10) / 10); this.apply() },
    reset() { this.scale = 1; this.apply() },
  },
  mounted() { this.apply() },
  template: `
    <span style="display:flex;align-items:center;gap:2px;font-size:12px;color:var(--muted);border:1px solid var(--line);border-radius:6px;padding:2px 4px">
      <span title="页面字体调小" style="cursor:pointer;padding:0 4px" @click="dec">A−</span>
      <span title="重置页面字体" style="cursor:pointer;padding:0 4px;min-width:34px;text-align:center" @click="reset">{{ Math.round(scale * 100) }}%</span>
      <span title="页面字体调大" style="cursor:pointer;padding:0 4px" @click="inc">A+</span>
    </span>
  `,
}

export { FontZoom }
