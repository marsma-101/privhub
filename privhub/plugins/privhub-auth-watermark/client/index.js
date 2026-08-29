/**
 * privhub-auth-watermark · client — 水印叠加层（watermark slot）
 *
 * 登录后全局右下角叠加「用户名 @ 时间」半透明水印（防截屏外泄）。
 * 文本来自 /privhub/api/watermark（后端消费 S3 watermark Service）。
 *
 * @module privhub-auth-watermark/client
 */

const { api, AUTH, bus } = window.PrivHub

const WatermarkOverlay = {
  name: 'watermark-overlay',
  data() {
    return { text: '', style: {} }
  },
  methods: {
    async refresh() {
      if (!AUTH.user) { this.text = ''; return }
      try {
        const r = await api('/privhub/api/watermark')
        if (r.ok && r.view.enabled) {
          this.text = r.view.text
          this.style = r.view.style
        } else {
          this.text = ''
        }
      } catch { this.text = '' }
    },
  },
  async mounted() {
    await this.refresh()
    this._off = bus.on('auth:login', () => { this.refresh() })
  },
  beforeUnmount() { if (this._off) this._off() },
  template: `
    <div v-if="text" class="watermark-overlay" :style="style">{{ text }}</div>
  `,
}

export default {
  id: 'privhub-auth-watermark',
  slots: {
    watermark: WatermarkOverlay,
  },
}
