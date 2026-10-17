/**
 * list — 「思维导图」项目视图（图标栏「知识」组那个入口，`view=mindmap`）。
 *
 * ## 这一页干什么
 *
 * 一个项目的思维导图可能散在任意子目录里，这一页把它们**一次列全**（含所在目录），
 * 并给出「新建 / 打开 / 改名 / 删除」四个动作。它是 P2 的落点：P1 只做到
 * 「在文件树里点开一张 `.mindmap` 就看到画布」，缺一个「本项目的导图都在哪」的入口。
 *
 * ## 为什么用 `/api/search` 列文件，而不是自己递归 `/api/list`
 *
 * 搜索这条链（`privhub-files-search` → `privhub-svc-search.query`）本身就是
 * **递归文件名匹配**，而且已经串好了两件我们必须要的事：
 *   ① 权限：只走 `visibleProjects(u)`，且路由登记在 ACL `GUARD_PATHS`（文件级过滤）；
 *   ② 路径安全：命中项由 `resolveInProject` 复核，不逃出项目根。
 * 自己从 `/api/list` 一层层递归会把这些再做一遍（还更容易做漏），且一个目录一次 HTTP，
 * 大项目下很吵。代价是**拿不到体积与修改时间**（命中项只有 name/path），
 * 所以这一页不显示大小/时间列 —— 不显示好过显示假的。
 *
 * ## 与 P1 的关系
 *
 * 画布 / 编辑器**一行都没重复**：点「打开」= 跳到文件视图 + 选中该文件，
 * P1 注册的 viewer（`index.js`）照常上场。本页只管「列表与文件操作」。
 *
 * @module privhub-mindmap/client/list
 */

import { api, nav, toast, askInput, confirmText, fail } from './deps.js'

/** 新建导图的模板 —— 与 explorer-v3 的「新建文件」菜单**故意各写一份**（见那边的注释）：
 *  explorer-v3 不该反向依赖一个可卸载的查看器插件，而这里也不该依赖 explorer-v3。
 *  两份都只是「一段普通的缩进大纲」，格式本身由 outline.js 定义，不会各说各话。 */
const TEMPLATE = (title) => '# ' + title + '\n\n- 中心主题\n  - 分支一\n  - 分支二\n'

/** 路径 → 所在目录（项目根 = ''）。 */
function dirOf(rel) {
  const p = String(rel || '').replace(/\\/g, '/')
  return p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : ''
}

/** 取路径最后一段。 */
function baseOf(rel) {
  const p = String(rel || '').replace(/\\/g, '/')
  return p.includes('/') ? p.slice(p.lastIndexOf('/') + 1) : p
}

function errText(e) {
  return (e && e.message) ? e.message : String(e)
}

const MindmapListView = {
  name: 'mindmap-list',

  template: `
    <div class="mm-page">
      <div class="mm-page-bar">
        <span class="mm-page-title">🌳 思维导图</span>
        <span class="mm-page-scope">项目 <b>{{ project || '（未选择）' }}</b></span>
        <input class="mm-page-filter" v-model="q" placeholder="过滤名称 / 路径…" />
        <span class="mm-grow"></span>
        <button class="mm-btn" :disabled="loading || !project" @click="reload">{{ loading ? '刷新中…' : '↻ 刷新' }}</button>
        <button class="mm-btn primary" :disabled="busy || !project" @click="create">＋ 新建思维导图</button>
      </div>

      <div v-if="error" class="mm-page-err">{{ error }}</div>

      <div v-else class="mm-page-body ph-scroll">
        <div v-if="!project" class="mm-empty">先选择一个项目，再看它的思维导图。</div>
        <div v-else-if="loading && files.length === 0" class="mm-empty">正在列出导图…</div>
        <div v-else-if="filtered.length === 0" class="mm-empty">
          <p v-if="q.trim()">没有匹配「{{ q.trim() }}」的导图。</p>
          <p v-else>这个项目还没有思维导图。点右上「＋ 新建思维导图」建第一张。</p>
        </div>
        <ul v-else class="mm-list">
          <li v-for="f in filtered" :key="f.path" class="mm-item">
            <span class="mm-item-icon">🌳</span>
            <span class="mm-item-main" :title="f.path" @click="open(f)">
              <span class="mm-item-name">{{ f.name }}</span>
              <span v-if="f.dir" class="mm-item-path">{{ f.dir }}/</span>
            </span>
            <span class="mm-item-ops">
              <button class="mm-btn" @click.stop="open(f)">打开</button>
              <button class="mm-btn" @click.stop="rename(f)">改名</button>
              <button class="mm-btn mm-btn-danger" @click.stop="remove(f)">删除</button>
            </span>
          </li>
        </ul>
      </div>

      <div class="mm-page-foot">
        导图 = 一份纯文本大纲（<code>.mindmap</code>）：首行 <code># 标题</code>，下面用 <code>- </code> 列表、缩进定层级。
        它同时就是一个普通文件 —— 版本历史、评论、全库搜索、智能体读写全都照常。
      </div>
    </div>
  `,

  data() {
    return { files: [], loading: false, error: '', q: '', busy: false }
  },

  computed: {
    /** 当前项目（导航状态；骨架上没有项目时为空串）。 */
    project() {
      const n = nav()
      return (n && n.project) || ''
    },
    filtered() {
      const q = this.q.trim().toLowerCase()
      if (!q) return this.files
      return this.files.filter((f) => (f.name + ' ' + f.dir).toLowerCase().includes(q))
    },
  },

  watch: {
    /* 在视图里切项目（左栏点另一个项目）也要跟着换列表 */
    project() { void this.reload() },
  },

  methods: {
    /** 列全本项目里的 `.mindmap`（递归；权限与路径安全由搜索链保证）。 */
    async reload() {
      const p = this.project
      if (!p) { this.files = []; this.error = ''; return }
      this.loading = true
      this.error = ''
      try {
        const r = await api('/privhub/api/search?project=' + encodeURIComponent(p) + '&q=' + encodeURIComponent('.mindmap'))
        if (!r || !r.ok) {
          this.error = (r && r.error) || '列出失败'
          this.files = []
          return
        }
        this.files = (r.hits || [])
          /* 搜索是「名字里含 .mindmap」，所以 `x.mindmap.bak` 也会命中 —— 这里只认真正的后缀。 */
          .filter((h) => h && !h.isDir && /\.mindmap$/i.test(h.name || ''))
          .map((h) => ({ name: h.name, path: h.path, dir: dirOf(h.path) }))
      } catch (e) {
        this.error = '列出失败：' + errText(e)
        this.files = []
      } finally {
        this.loading = false
      }
    },

    /** 建一张新导图（项目根），建成即打开 —— 建导图的目的就是要马上画。 */
    async create() {
      const p = this.project
      if (!p || this.busy) return
      const title = '未命名思维导图-' + Date.now().toString(36).slice(-4)
      const name = title + '.mindmap'
      this.busy = true
      try {
        const r = await api('/privhub/api/text/save', {
          method: 'POST',
          body: JSON.stringify({ project: p, path: name, text: TEMPLATE(title) }),
        })
        if (!r || !r.ok) { toast((r && r.error) || '创建失败', 'error'); return }
        toast('已创建「' + name + '」')
        await this.open({ name, path: name, dir: '' })
      } catch (e) {
        toast('创建失败：' + errText(e), 'error')
      } finally {
        this.busy = false
      }
    },

    /** 打开一张导图：跳到文件视图、进它所在目录、选中它（预览区由 P1 的 viewer 接管）。 */
    async open(f) {
      const n = nav()
      if (!n || !f) return
      /* openDir 自己会把 activeView 切回 files（见骨架实现），不必先切。 */
      await n.openDir(this.project, f.dir)
      const e = (n.entries || []).find((x) => x.name === f.name)
      if (e) await n.openEntry(e)
      else toast('已定位到目录：' + (f.dir === '' ? this.project : f.dir) + '（文件可能已被移动或改名）', 'warn')
    },

    /** 改名：弹骨架的输入框；缺 `.mindmap` 后缀自动补上。 */
    rename(f) {
      const ok = askInput('重命名「' + f.name + '」', f.name, (v) => { void this._doRename(f, v) })
      if (!ok) fail('骨架未提供 nav.askInput —— 无法弹出重命名输入框（本页不自己造输入框）')
    },

    async _doRename(f, raw) {
      let nn = String(raw == null ? '' : raw).trim()
      if (!nn || nn === f.name) return
      if (!/\.mindmap$/i.test(nn)) nn += '.mindmap'
      this.busy = true
      try {
        const r = await api('/privhub/api/rename', {
          method: 'POST',
          body: JSON.stringify({ project: this.project, path: f.path, newName: nn }),
        })
        if (!r || !r.ok) {
          /* 409 是「文件正被别人编辑」——骨架那边的口径是把持有人说出来，这里照做 */
          toast((r && r.error) || '重命名失败', 'error')
          return
        }
        toast('已重命名为「' + nn + '」')
        await this.reload()
      } catch (e) {
        toast('重命名失败：' + errText(e), 'error')
      } finally {
        this.busy = false
      }
    },

    /** 删除 = 移入回收站（可恢复），所以用一次确认即可，不做二次输入。 */
    async remove(f) {
      if (this.busy) return
      if (!confirmText('删除「' + f.name + '」？\n\n它会移入回收站，之后可以从「回收站」恢复。')) return
      this.busy = true
      try {
        const r = await api('/privhub/api/delete', {
          method: 'POST',
          body: JSON.stringify({ project: this.project, path: f.path }),
        })
        if (!r || !r.ok) { toast((r && r.error) || '删除失败', 'error'); return }
        toast('已移入回收站：' + f.name)
        await this.reload()
      } catch (e) {
        toast('删除失败：' + errText(e), 'error')
      } finally {
        this.busy = false
      }
    },
  },

  async mounted() { await this.reload() },
}

export { MindmapListView, dirOf, baseOf, TEMPLATE }
