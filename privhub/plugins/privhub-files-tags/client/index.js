/**
 * privhub-files-tags · client — 标签管理（挂 tags slot，模态形态）
 *
 * 流程：选中文件 → 图标栏「🏷 标签」→ 模态：
 *   - 顶部：当前选中文件标签编辑（chips 多选 + 新建标签，输入联想已有标签）
 *   - 中部：项目标签云（全部标签 + 计数）→ 点击标签 → 文件列表 → 定位
 * 未选中文件时顶部提示，标签云仍可用。
 *
 * @module privhub-files-tags/client
 */

const { api, nav, AUTH } = window.PrivHub

const TagsAdmin = {
  name: 'tags-admin',
  data() {
    return { nav, allTags: [], tagFiles: [], activeTag: '', tagInput: '', editing: false }
  },
  computed: {
    selected() { return nav.selected },
    selectedPath() {
      const s = nav.selected
      if (!s) return ''
      return nav.path ? nav.path + '/' + s.name : s.name
    },
    currentTags() {
      if (!this.selected || !this._loadedFor) return []
      return this._currentTags || []
    },
  },
  methods: {
    async loadAll() {
      if (!nav.project) return
      const r = await api('/privhub/api/meta/tags/all?project=' + encodeURIComponent(nav.project))
      if (r.ok) this.allTags = r.tags
    },
    async loadCurrent() {
      if (!this.selected || !nav.project) return
      const r = await api('/privhub/api/meta/tags?project=' + encodeURIComponent(nav.project) + '&path=' + encodeURIComponent(this.selectedPath))
      if (r.ok) {
        this._currentTags = r.tags
        this._loadedFor = this.selectedPath
      }
    },
    async toggleTag(tag) {
      const cur = this.currentTags
      const next = cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag]
      await this.save(next)
    },
    async addTag() {
      const t = this.tagInput.trim()
      if (!t) return
      this.tagInput = ''
      await this.save([...this.currentTags, t])
    },
    async save(tags) {
      const r = await api('/privhub/api/meta/tags', { method: 'POST', body: JSON.stringify({ project: nav.project, path: this.selectedPath, tags }) })
      if (r.ok) {
        this._currentTags = r.tags
        await this.loadAll()
        nav.refreshTree && nav.refreshTree()
      } else {
        window.PrivHub.toast(r.error || '保存失败', 'error')
      }
    },
    async filterBy(tag) {
      this.activeTag = tag
      const r = await api('/privhub/api/meta/tagged?project=' + encodeURIComponent(nav.project) + '&tag=' + encodeURIComponent(tag))
      this.tagFiles = r.ok ? r.files : []
    },
    async go(file) {
      const dir = file.path.includes('/') ? file.path.slice(0, file.path.lastIndexOf('/')) : ''
      await nav.openDir(nav.project, dir)
      const e = nav.entries.find((x) => x.name === file.name)
      if (e) nav.selectEntry(e)
    },
  },
  watch: {
    'nav.selected': { handler() { this._loadedFor = ''; this._currentTags = []; this.loadCurrent() }, deep: true },
  },
  async mounted() {
    await this.loadAll()
    await this.loadCurrent()
  },
  template: `
    <div class="modal-mask" @click.self="$emit('close')">
      <div class="modal" style="width:640px">
        <h2>🏷️ 文件标签</h2>
        <div class="modal-body">
          <!-- 当前文件标签编辑 -->
          <div class="field">
            <label>当前文件：{{ nav.project || '—' }}{{ selectedPath ? ' / ' + selectedPath : '（未选中文件，请先在工作区点击选中）' }}</label>
            <template v-if="selected">
              <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
                <span
                  v-for="t in allTags" :key="t.tag"
                  class="u-project-chip"
                  style="cursor:pointer;padding:4px 10px;user-select:none"
                  :style="currentTags.includes(t.tag) ? 'background:rgba(90,130,200,.35)' : 'background:var(--bg)'"
                  @click="toggleTag(t.tag)"
                >{{ t.tag }}<span style="opacity:.6;margin-left:4px">×{{ t.count }}</span></span>
                <input
                  v-model="tagInput"
                  @keyup.enter="addTag"
                  placeholder="新建标签后回车…"
                  style="padding:6px 10px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text);font-size:13px;width:150px;outline:none"
                />
              </div>
              <div style="font-size:12px;color:var(--muted);margin-top:6px">当前标签：{{ currentTags.length ? currentTags.join('、') : '（无）' }} · 点击标签切换，回车新建</div>
            </template>
          </div>

          <!-- 标签筛选 -->
          <div class="field">
            <label>按标签筛选（点击标签查看该标签下的文件）</label>
            <div style="display:flex;flex-wrap:wrap;gap:8px">
              <span
                v-for="t in allTags" :key="t.tag"
                class="u-project-chip"
                style="cursor:pointer;padding:4px 10px"
                :style="activeTag === t.tag ? 'background:rgba(120,180,90,.35)' : 'background:var(--bg)'"
                @click="filterBy(t.tag)"
              >{{ t.tag }}（{{ t.count }}）</span>
              <span v-if="allTags.length === 0" style="color:var(--muted);font-size:13px">该项目暂无标签</span>
            </div>
          </div>

          <div class="field" v-if="activeTag">
            <label>「{{ activeTag }}」下的文件（{{ tagFiles.length }}）</label>
            <div v-if="tagFiles.length === 0" style="color:var(--muted);font-size:13px">无文件</div>
            <div v-for="f in tagFiles" :key="f.path" style="display:flex;align-items:center;gap:8px;padding:3px 0">
              <span style="flex:1;font-size:13px">📄 {{ f.name }} <span style="color:var(--muted)">（{{ f.path }}）</span></span>
              <button class="small-btn" @click="go(f)">定位</button>
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
  id: 'privhub-files-tags',
  slots: {
    tags: TagsAdmin,
  },
}
