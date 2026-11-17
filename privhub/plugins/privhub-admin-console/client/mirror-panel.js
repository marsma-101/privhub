/**
 * mirror-panel — 「按原文件名查看」入口（2026-11-17）。
 *
 * 主人反馈：「你移动过来的文件为什么把文件名都给我改了？弄得我都找不到目标文件了」
 *
 * 真相：扁平池（`.pool/<内部ID>.md`）是程序内部布局，原名只存在数据库里。
 * 现在程序会在 `<卷根>/.library-view/<项目>/<原路径>` 建**硬链接**（同盘不占额外空间），
 * 于是你在资源管理器里能直接按原名找到并打开文件。
 *
 * 这个面板只做三件事：告诉你镜像在哪、多少个文件、一键重建（改名/删除后同步）。
 *
 * @module privhub-admin-console/client/mirror-panel
 */

import { api } from './deps.js'
import { adminToast } from './toast.js'

async function mget(path) {
  try { const r = await api(path); if (r && r.ok) return { ok: true, data: r }; return { ok: false, error: (r && r.error) || '接口失败' } }
  catch (e) { return { ok: false, error: (e && e.message) || '网络错误' } }
}
async function msend(path, payload) {
  try { const r = await api(path, { method: 'POST', body: JSON.stringify(payload || {}) }); if (r && r.ok) return { ok: true, data: r }; return { ok: false, error: (r && r.error) || '操作失败' } }
  catch (e) { return { ok: false, error: (e && e.message) || '网络错误' } }
}

export const MirrorPanel = {
  name: 'admin-mirror-panel',
  props: {
    /** 当前默认/目标卷 id（决定镜像建在哪块盘上）。 */
    volumeId: { type: String, default: '' },
  },
  data() { return { loading: true, rebuildBusy: false, status: null, lastMsg: '' } },
  computed: {
    mirrorRoot() { return (this.status && this.status.mirrorRoot) || '' },
    linked() { return this.status ? (this.status.mirrored || 0) : 0 },
  },
  methods: {
    async load() {
      this.loading = true
      const r = await mget('/privhub/api/storage/relocate-status')
      if (r.ok) this.status = r.data
      this.loading = false
    },
    async rebuild() {
      this.rebuildBusy = true
      const r = await msend('/privhub/api/storage/mirror-rebuild', { volumeId: this.volumeId || null })
      this.rebuildBusy = false
      if (!r.ok) { adminToast(r.error || '重建失败', 'error'); return }
      this.lastMsg = r.data.message || ('已重建 ' + (r.data.linked || 0) + ' 个链接')
      adminToast(this.lastMsg)
      await this.load()
    },
    async copyPath() {
      const p = this.mirrorRoot
      if (!p) return
      try { await navigator.clipboard.writeText(p); adminToast('路径已复制，可粘贴到资源管理器') }
      catch { adminToast('复制失败，请手动选择路径：' + p, 'warn') }
    },
  },
  mounted() { void this.load() },
  template: `
    <div class="ad-section-card">
      <div class="ad-section-card-head">
        <span class="ad-section-card-title">📁 按原文件名查看（给人在盘里找文件）</span>
        <div class="ad-actions">
          <button class="ad-btn ad-btn-sm" :disabled="rebuildBusy" @click="rebuild">
            {{ rebuildBusy ? '重建中…' : '↻ 重建链接' }}
          </button>
        </div>
      </div>

      <div class="ad-dim" style="line-height:1.7;margin-bottom:8px">
        程序内部把字节平铺存成 <code>.pool/内部ID.md</code>（为了安全和改名不失效），
        但会在这里额外建<strong>硬链接</strong>，按<strong>原文件名 + 原目录结构</strong>呈现 ——
        <strong>硬链接不占额外空间</strong>，你可以直接在资源管理器里打开。
      </div>

      <div v-if="mirrorRoot" class="mp-path">
        <code>{{ mirrorRoot }}</code>
        <button class="ad-btn ad-btn-sm" @click="copyPath">复制路径</button>
      </div>
      <div v-else class="ad-dim">尚未建立（跑一次「库搬迁」或点上面的「重建链接」）。</div>

      <div v-if="lastMsg" class="ad-dim" style="margin-top:8px">{{ lastMsg }}</div>
      <div class="ad-dim" style="margin-top:8px;line-height:1.7">
        改名 / 删除文件后，点「重建链接」同步一次（旧链接会被清掉，不会留下死链）。
      </div>
    </div>
  `,
}

export const MIRROR_PANEL_CSS = `
.mp-path {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 8px 10px; border-radius: var(--admin-radius);
  background: var(--admin-bg); border: 1px solid var(--admin-border);
}
.mp-path code {
  flex: 1; min-width: 220px;
  font-family: ui-monospace, Consolas, monospace; font-size: 12px;
  word-break: break-all; color: var(--admin-text);
}
`

if (typeof document !== 'undefined' && !document.querySelector('style[data-privhub-mirror-panel]')) {
  const el = document.createElement('style')
  el.setAttribute('data-privhub-mirror-panel', '')
  el.textContent = MIRROR_PANEL_CSS
  document.head.appendChild(el)
}
