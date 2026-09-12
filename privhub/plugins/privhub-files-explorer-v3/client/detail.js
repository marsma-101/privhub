/**
 * detail — 右侧详情面板（preview slot）。
 * @module privhub-files-explorer-v3/client/detail
 */

import { api, nav, bus, AUTH, fileIcon } from './deps.js'
import { isEditableText } from './utils.js'
import { store } from './store.js'
import { openTab, activateTab } from './tabs.js'
import { openPermFor, convertDocToDocx } from './ops.js'

const RightDetail = {
  name: 'right-detail',
  data() {
    return {
      nav,
      tags: [],
      tagInput: '',
      tagBusy: false,
      tagLoadedFor: '',
    }
  },
  computed: {
    /* 详情目标 = 当前选中/打开的文件（非目录） */
    target() {
      const s = nav.selected
      if (!s || s.isDir) return null
      return {
        name: s.name,
        path: nav.relPathOf(s.name),
        project: nav.project,
        isDir: false,
        sizeText: s.sizeText || '',
        type: s.type || '',
        mtime: s.mtime || '',
      }
    },
    isOffice() {
      const t = this.target
      return t ? /\.(doc|docx|xls|xlsx|ppt|pptx|pdf)$/i.test(t.name) : false
    },
    isMd() {
      const t = this.target
      return t ? /\.md$/i.test(t.name) : false
    },
    isHtml() {
      const t = this.target
      return t ? /\.html?$/i.test(t.name) : false
    },
    isText() {
      const t = this.target
      return t ? /\.(txt|md|json|js|ts|css|html|xml|csv|log|yaml|yml|ini|py|sh|bat|sql)$/i.test(t.name) : false
    },
    /* 可编辑：Office 文档 + md/文本文件（走 edit-md 内嵌编辑） */
    isEdit() {
      const t = this.target
      if (!t) return false
      return this.isOffice || /\.md$/i.test(t.name) || isEditableText(t.name)
    },
  },
  watch: {
    target(n, o) {
      if (!n || !o || n.project !== o.project || n.path !== o.path) this.loadTags()
    },
  },
  methods: {
    close() { nav.rightOpen = false },
    /* ---- 标签 ---- */
    async loadTags() {
      const t = this.target
      if (!t) { this.tags = []; this.tagLoadedFor = ''; return }
      this.tags = []
      this.tagLoadedFor = ''
      try {
        const r = await api('/privhub/api/meta/tags?project=' + encodeURIComponent(t.project) + '&path=' + encodeURIComponent(t.path))
        if (r.ok) { this.tags = r.tags || []; this.tagLoadedFor = t.path }
      } catch { /* 标签读取失败静默 */ }
    },
    async addTag() {
      const t = this.target
      const v = this.tagInput.trim()
      if (!t || !v || this.tagBusy) return
      this.tagBusy = true
      try {
        const r = await api('/privhub/api/meta/tags', { method: 'POST', body: JSON.stringify({ project: t.project, path: t.path, tags: [...this.tags, v] }) })
        if (r.ok) { this.tags = r.tags || []; this.tagInput = ''; window.PrivHub.toast('已添加标签 🏷') }
        else window.PrivHub.toast(r.error || '标签保存失败', 'error')
      } catch { window.PrivHub.toast('标签保存失败', 'error') }
      this.tagBusy = false
    },
    removeTag(tag) {
      const t = this.target
      if (!t || this.tagBusy) return
      this.tagBusy = true
      api('/privhub/api/meta/tags', { method: 'POST', body: JSON.stringify({ project: t.project, path: t.path, tags: this.tags.filter(x => x !== tag) }) })
        .then(r => { if (r.ok) { this.tags = r.tags || [] } else window.PrivHub.toast(r.error || '标签保存失败', 'error') })
        .catch(() => window.PrivHub.toast('标签保存失败', 'error'))
        .finally(() => { this.tagBusy = false })
    },
    /* ---- 操作按钮 ---- */
    fav() {
      const t = this.target
      if (!t) return
      bus.emit('fav:add', { project: t.project, path: t.path, name: t.name, isDir: false })
      window.PrivHub.toast('已加入收藏 ⭐')
    },
    async download() {
      const t = this.target
      if (!t) return
      try {
        const r = await fetch('/privhub/api/download?project=' + encodeURIComponent(t.project) + '&path=' + encodeURIComponent(t.path), {
          headers: { authorization: 'Bearer ' + AUTH.token },
        })
        if (!r.ok) { window.PrivHub.toast('下载失败（HTTP ' + r.status + '）', 'error'); return }
        const blob = await r.blob()
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = t.name
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(a.href), 5000)
      } catch { window.PrivHub.toast('下载失败', 'error') }
    },
    edit() {
      const t = this.target
      if (!t) return
      if (this.isOffice) {
        if (/\.doc$/i.test(t.name)) {
          const dir2 = t.path.includes('/') ? t.path.slice(0, t.path.lastIndexOf('/')) : ''
          void convertDocToDocx({ entry: { name: t.name, isDir: false }, project: t.project, dirPath: dir2 })
          return
        }
        bus.emit('office:edit', { entry: { name: t.name, isDir: false }, project: t.project, path: t.path })
        return
      }
      if (!this.isMd && !isEditableText(t.name)) return
      // 文本类（md/txt 等）：确保作为标签打开进入内容区，再进入内嵌编辑
      const dir = t.path.includes('/') ? t.path.slice(0, t.path.lastIndexOf('/')) : ''
      const tab = store.tabs.find(x => x.project === t.project && x.path === t.path)
      if (!tab) openTab({ name: t.name, isDir: false, sizeText: t.sizeText, type: t.type }, t.project, dir)
      else activateTab(tab.key)
      bus.emit('entry:open', { entry: { name: t.name, isDir: false }, project: t.project, path: dir })
    },
    perm() { const t = this.target; if (t) void openPermFor({ name: t.name, isDir: false, sizeText: t.sizeText, type: t.type, mtime: t.mtime }, t.project, t.path.includes('/') ? t.path.slice(0, t.path.lastIndexOf('/')) : '') },
    /* 批注评论 / 生成页面 / 发布 / 版本历史（跨插件 bus 触发） */
    comments() { const t = this.target; if (t) bus.emit('file:comments', { project: t.project, path: t.path, name: t.name }) },
    genpage() { const t = this.target; if (t) bus.emit('md:genpage', { project: t.project, path: t.path }) },
    publish() { const t = this.target; if (t) bus.emit('html:publish', { project: t.project, path: t.path, name: t.name }) },
    versions() { const t = this.target; if (t) bus.emit('file:versions', { project: t.project, path: t.path, name: t.name }) },
    async copyPath() {
      const t = this.target
      if (!t) return
      try {
        await navigator.clipboard.writeText(t.project + '/' + t.path)
        window.PrivHub.toast('路径已复制 📋')
      } catch { window.PrivHub.toast('复制失败', 'error') }
    },
  },
  template: `
    <div class="v3-detail">
      <div class="v3-detail-head">
        <span>{{ target ? fileIcon(target.type) : '📄' }}</span>
        <span class="v3-detail-name" :title="target ? target.project + ' / ' + target.path : ''">{{ target ? target.name : '文件详情' }}</span>
        <span class="v3-detail-close" title="关闭详情" @click="close">✕</span>
      </div>
      <div class="v3-detail-body">
        <template v-if="!target">
          <div style="color:var(--muted);font-size:12px;text-align:center;padding:40px 0">选中或打开文件后<br/>在此显示详细信息</div>
        </template>
        <template v-else>
          <div class="v3-detail-kv"><span class="k">类型</span><span class="v">{{ target.type || '文件' }}</span></div>
          <div class="v3-detail-kv"><span class="k">大小</span><span class="v">{{ target.sizeText || '—' }}</span></div>
          <div class="v3-detail-kv"><span class="k">修改时间</span><span class="v">{{ target.mtime ? target.mtime.replace('T',' ').slice(0,16) : '—' }}</span></div>
          <div class="v3-detail-kv"><span class="k">所属项目</span><span class="v">{{ target.project }}</span></div>
          <div class="v3-detail-kv"><span class="k">完整路径</span><span class="v">{{ target.project + ' / ' + target.path }}</span></div>

          <!-- 标签 -->
          <div class="v3-detail-tags">
            <div style="font-size:12px;color:var(--muted);margin-bottom:4px">🏷 标签{{ tagLoadedFor === target.path && tags.length ? '（' + tags.length + '）' : '' }}</div>
            <div v-if="tags.length">
              <span v-for="tg in tags" :key="tg" class="v3-detail-tag" :title="'移除标签' + tg" style="cursor:pointer" @click="removeTag(tg)">{{ tg }} ✕</span>
            </div>
            <input v-model="tagInput" @keyup.enter="addTag" :disabled="tagBusy" placeholder="输入标签名回车添加…" />
          </div>

          <!-- 功能按钮 -->
          <div class="v3-detail-actions">
            <div class="v3-detail-act" title="收藏到星标列表" @click="fav"><span class="v3-detail-act-ico">⭐</span>收藏</div>
            <div class="v3-detail-act" title="复制完整路径" @click="copyPath"><span class="v3-detail-act-ico">📋</span>复制路径</div>
            <div class="v3-detail-act" title="下载文件" @click="download"><span class="v3-detail-act-ico">⬇️</span>下载</div>
            <div class="v3-detail-act" :title="isEdit ? '在编辑器中打开' : '仅支持 md / Office / 文本文件'" :class="{ dev: !isEdit }" @click="isEdit ? edit() : null"><span class="v3-detail-act-ico">✏️</span>编辑</div>
            <div class="v3-detail-act" title="查看/管理权限规则" @click="perm"><span class="v3-detail-act-ico">🔐</span>权限</div>
            <div class="v3-detail-act" :title="isMd ? '选中正文添加评论 / 查看评论线程' : '仅支持 md 文档'" :class="{ dev: !isMd }" @click="isMd ? comments() : null"><span class="v3-detail-act-ico">💬</span>批注评论</div>
            <div class="v3-detail-act" :title="isMd ? '一键生成 HTML 展示页' : '仅支持 md 文档'" :class="{ dev: !isMd }" @click="isMd ? genpage() : null"><span class="v3-detail-act-ico">🌐</span>生成页面</div>
            <div class="v3-detail-act" :title="isHtml ? '发布为内网只读链接' : '仅支持 HTML 页面'" :class="{ dev: !isHtml }" @click="isHtml ? publish() : null"><span class="v3-detail-act-ico">🔗</span>发布链接</div>
            <div class="v3-detail-act" :title="isText ? '创建/查看版本快照（最近 20 版）' : '仅支持文本类文件'" :class="{ dev: !isText }" @click="isText ? versions() : null"><span class="v3-detail-act-ico">🕘</span>版本历史</div>
            <div class="v3-detail-act dev" title="开发中"><span class="v3-detail-act-ico">📚</span>向量数据库<span class="v3-dev-badge">开发中</span></div>
          </div>
        </template>
      </div>
    </div>
  `,
}

export { RightDetail }
