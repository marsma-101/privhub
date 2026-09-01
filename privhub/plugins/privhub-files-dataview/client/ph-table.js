/* ph-table 组件：数据表页面模板的表格组件（读 xlsx → 可编辑表格 → 保存写回） */
class PhTable extends HTMLElement {
  connectedCallback() {
    this._rows = []
    this.render()
    this.load()
  }
  get _project() { return this.getAttribute('project') || '' }
  get _src() { return this.getAttribute('src') || '' }
  async load() {
    if (!this._src) { this.innerHTML = '<p style="color:#c00">缺少 src 属性</p>'; return }
    const tok = localStorage.getItem('privhub_token') || ''
    try {
      const r = await fetch('/privhub/api/office/read?project=' + encodeURIComponent(this._project) + '&path=' + encodeURIComponent(this._src), { headers: { authorization: 'Bearer ' + tok } })
      const j = await r.json()
      if (j.ok && j.content && j.content.sheets && j.content.sheets[0]) {
        this._rows = j.content.sheets[0].rows || []
        this.render()
      } else this.showStatus('❌ ' + (j.error || '加载失败'), true)
    } catch { this.showStatus('❌ 加载失败（网络错误）', true) }
  }
  showStatus(text, persistent) {
    const st = this.querySelector('#ph-status')
    if (!st) return
    st.textContent = text
    if (!persistent) setTimeout(() => { if (st.textContent === text) st.textContent = '' }, 2500)
  }
  esc(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
  render() {
    const rows = this._rows
    const header = rows.length ? rows[0] : []
    const body = rows.slice(1)
    this.innerHTML =
      '<div style="overflow:auto;border:1px solid #ddd;border-radius:8px">' +
      '<table style="border-collapse:collapse;font-size:13px;width:100%">' +
      '<thead><tr>' + header.map((c) => '<th style="border:1px solid #ddd;padding:6px 10px;background:#f0f0f0;text-align:left">' + this.esc(c) + '</th>').join('') + '</tr></thead>' +
      '<tbody>' + (body.length ? body.map((r) => '<tr>' + r.map((c) => '<td style="border:1px solid #ddd;padding:5px 9px" contenteditable>' + this.esc(c) + '</td>').join('') + '</tr>').join('') : '<tr><td style="border:1px solid #ddd;padding:14px;color:#aaa;text-align:center">（空数据表）</td></tr>') + '</tbody>' +
      '</table></div>' +
      '<div style="margin-top:10px;display:flex;align-items:center;gap:8px">' +
      '<button id="ph-add-row" style="padding:5px 14px;border:1px solid #999;border-radius:6px;background:#fff;cursor:pointer">＋ 新增行</button>' +
      '<button id="ph-save" style="padding:5px 16px;border:none;border-radius:6px;background:#2b6cb0;color:#fff;cursor:pointer">💾 保存数据表</button>' +
      '<span id="ph-status" style="font-size:12px;color:#888"></span>' +
      '</div>'
    this.querySelector('#ph-add-row').onclick = () => { this._rows.push([]); this.render() }
    this.querySelector('#ph-save').onclick = () => this.save()
  }
  async save() {
    const tbl = this.querySelector('table')
    if (!tbl) return
    const rows = []
    for (const tr of tbl.querySelectorAll('tr')) {
      rows.push([...tr.querySelectorAll('th,td')].map((c) => c.innerText))
    }
    const tok = localStorage.getItem('privhub_token') || ''
    try {
      const r = await fetch('/privhub/api/office/write', {
        method: 'POST',
        headers: { authorization: 'Bearer ' + tok, 'content-type': 'application/json' },
        body: JSON.stringify({ project: this._project, path: this._src, content: rows }),
      })
      const j = await r.json()
      if (j.ok) this.showStatus('✅ 已保存 ' + new Date().toLocaleTimeString())
      else this.showStatus('❌ ' + (j.error || '保存失败'), true)
    } catch { this.showStatus('❌ 保存失败（网络错误）', true) }
  }
}
customElements.define('ph-table', PhTable)
