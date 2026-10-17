/**
 * global — 「全局思维导图」视图（最左竖栏 `global` 组的一级入口，`view=mindmap-global`）。
 *
 * ## 这一页是什么
 *
 * 项目内导图（P1/P2）问的是「这个项目里有哪些图」；这一页问的是**整个实例**
 * 「我现在有哪些项目」—— 管理员的总览图。主人 2026-10-17 的口径：这一层是**单独的
 * 一个级别，只有管理员权限才能看见**，所以入口挂在竖栏 `global` 组
 * （📊 工作台 ↔ 🌳 思维导图 ↔ 🔌 智能体接入），功能开关 `mindmap.global` 默认 `none`。
 *
 * ## 它不是文件（所以复用了 P1 的编辑器，而不是把编辑器再写一遍）
 *
 * 全局图没有归属项目、不进任何文件树，服务端存在 `data/mindmaps/global.json`
 * （见 `../src/core.ts`）。既然不是文件，就不能用「预览 + 文本保存」那两条文件接口，
 * 于是给 `editor.js` 注入了 `loader` / `saver`（它为此加了两个可选 prop）——
 * 画布、大纲互同步、折叠、导出 SVG **一行都没重写**。
 *
 * ## 「带出全部项目为根节点」是怎么做的
 *
 * 建图时用 `/api/projects`（管理员拿到的是全部项目）把项目名写成一级分支；
 * 之后新开了项目，用列表行的「⤓ 补齐项目」——**只增不改**：把还没出现的项目名
 * 追加成根节点，已有节点（连同你手写的说明）原样不动。不做「按项目列表重建」，
 * 那会把手画的内容冲掉。
 *
 * @module privhub-mindmap/client/global
 */

import { api, nav, toast, askInput, confirmText, fail } from './deps.js'
import { MindmapEditor } from './editor.js'
import { parseOutline, serializeOutline, insertChild, countNodes } from './outline.js'

const API = '/privhub/api/mindmap/global'

/** 默认标题（与 src/core.ts 的 DEFAULT_TITLE 一致；这边只是输入框的初值）。 */
const DEFAULT_TITLE = '项目总览'

/** 取 `{ text, children }` 树的全部节点文字（用来判「这个项目名已经在图里了吗」）。 */
function textsOf(node, out) {
  const acc = out || []
  for (const c of (node && node.children) || []) {
    acc.push(String(c.text || '').trim())
    textsOf(c, acc)
  }
  return acc
}

/** 时间戳 → 简短中文时间（本插件不依赖骨架的格式化工具，自己写一行）。 */
function when(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const p = (n) => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
}

function errText(e) {
  return (e && e.message) ? e.message : String(e)
}

const GlobalMindmapView = {
  name: 'mindmap-global',
  components: { MindmapEditor },

  template: `
    <div class="mm-page">
      <div class="mm-page-bar">
        <template v-if="editing">
          <button class="mm-btn" @click="close">← 返回列表</button>
          <span class="mm-page-title">🌳 {{ editing.title }}</span>
          <span class="mm-page-scope">全局图 · 仅管理员</span>
          <span class="mm-grow"></span>
          <span class="mm-page-scope">{{ when(editing.updatedAt) }} 由 <b>{{ editing.updatedBy }}</b> 保存</span>
        </template>
        <template v-else>
          <span class="mm-page-title">🌳 全局思维导图</span>
          <span class="mm-page-scope">实例总览 · 仅管理员</span>
          <input class="mm-page-filter" v-model="q" placeholder="过滤标题…" />
          <span class="mm-grow"></span>
          <button class="mm-btn" :disabled="loading" @click="reload">{{ loading ? '刷新中…' : '↻ 刷新' }}</button>
          <button class="mm-btn primary" :disabled="busy" @click="create">＋ 新建全局图</button>
        </template>
      </div>

      <div v-if="error" class="mm-page-err">{{ error }}</div>

      <!-- 编辑中：整块让给 P1 的编辑器（数据源由下面两个函数注入） -->
      <div v-else-if="editing" class="mm-page-body mm-edit">
        <MindmapEditor :key="editing.id" :name="editing.title" :note="editNote"
                       :loader="loaderFor(editing)" :saver="saverFor(editing)" />
      </div>

      <div v-else class="mm-page-body ph-scroll">
        <div v-if="loading && maps.length === 0" class="mm-empty">正在读取全局图…</div>
        <div v-else-if="filtered.length === 0" class="mm-empty">
          <p v-if="q.trim()">没有匹配「{{ q.trim() }}」的全局图。</p>
          <p v-else>还没有全局图。点右上「＋ 新建全局图」——建图时会自动把全部项目写成一级分支。</p>
        </div>
        <ul v-else class="mm-list">
          <li v-for="m in filtered" :key="m.id" class="mm-item">
            <span class="mm-item-icon">🌳</span>
            <span class="mm-item-main" :title="'新建于 ' + when(m.createdAt) + ' · ' + m.createdBy" @click="open(m)">
              <span class="mm-item-name">{{ m.title }}</span>
              <span class="mm-item-path">{{ nodes(m) }} 个节点 · {{ when(m.updatedAt) }} {{ m.updatedBy }}</span>
            </span>
            <span class="mm-item-ops">
              <button class="mm-btn" @click.stop="open(m)">打开</button>
              <button class="mm-btn" :disabled="busy" title="把还没画进图里的项目名补成一级分支（只增不改，已手写的节点不动）" @click.stop="syncProjects(m)">⤓ 补齐项目</button>
              <button class="mm-btn" :disabled="busy" @click.stop="rename(m)">改名</button>
              <button class="mm-btn mm-btn-danger" :disabled="busy" @click.stop="remove(m)">删除</button>
            </span>
          </li>
        </ul>
      </div>

      <div class="mm-page-foot">
        全局图存在服务端（<code>data/mindmaps/global.json</code>，密文落盘），<b>不属于任何项目</b>，所以普通用户看不到、也进不来。
        正文与项目内导图同一套大纲格式：<code># 标题</code> + <code>- 节点</code>，缩进定层级。
      </div>
    </div>
  `,

  data() {
    return {
      maps: [],
      loading: false,
      busy: false,
      error: '',
      q: '',
      /** 正在编辑的那张（null = 列表态）。 */
      editing: null,
    }
  },

  computed: {
    filtered() {
      const q = this.q.trim().toLowerCase()
      if (!q) return this.maps
      return this.maps.filter((m) => String(m.title || '').toLowerCase().includes(q))
    },
    editNote() {
      return '这是实例级全局图（不属于任何项目，普通用户看不到）。它同样是一份缩进大纲，'
        + '可以直接手写；「＋ 新建全局图」建的图会自动把全部项目写成一级分支。'
    },
  },

  methods: {
    when,
    nodes(m) { return countNodes(parseOutline(m && m.text)) },

    /* ── 读 ─────────────────────────────────────────────────── */
    async reload() {
      this.loading = true
      this.error = ''
      try {
        const r = await api(API)
        if (!r || !r.ok) {
          this.error = (r && r.error) || '读取失败'
          this.maps = []
          return
        }
        this.maps = r.maps || []
      } catch (e) {
        this.error = '读取失败：' + errText(e)
        this.maps = []
      } finally {
        this.loading = false
      }
    },

    /** 当前可见项目名（管理员 = 全部）。骨架的 projectsList 还没拉到时自己问一次接口。 */
    async projectNames() {
      const n = nav()
      if (n && Array.isArray(n.projectsList) && n.projectsList.length) return n.projectsList.slice()
      try {
        const r = await api('/privhub/api/projects')
        return (r && r.ok && Array.isArray(r.projects)) ? r.projects.slice() : []
      } catch { return [] }
    },

    /* ── 新建（把全部项目写成一级分支） ───────────────────────── */
    create() {
      const ok = askInput('新建全局图 · 标题', DEFAULT_TITLE, (v) => { void this._doCreate(v) })
      if (!ok) fail('骨架未提供 nav.askInput —— 无法弹出标题输入框（本页不自己造输入框）')
    },

    async _doCreate(raw) {
      if (this.busy) return
      const title = String(raw == null ? '' : raw).trim()
      if (!title) return
      this.busy = true
      try {
        const projects = await this.projectNames()
        const lines = ['# ' + title, '']
        if (projects.length) for (const p of projects) lines.push('- ' + p)
        else lines.push('- （还没有项目：管理员建项目后点「⤓ 补齐项目」）')
        const r = await api(API, { method: 'POST', body: JSON.stringify({ title, text: lines.join('\n') + '\n' }) })
        if (!r || !r.ok) { toast((r && r.error) || '创建失败', 'error'); return }
        toast('已创建「' + title + '」（' + projects.length + ' 个项目已写成一级分支）')
        await this.reload()
        const made = (this.maps || []).find((x) => x.id === (r.map && r.map.id))
        if (made) this.open(made)
      } catch (e) {
        toast('创建失败：' + errText(e), 'error')
      } finally {
        this.busy = false
      }
    },

    /* ── 打开 / 关闭 ────────────────────────────────────────── */
    open(m) { this.editing = m },
    close() { this.editing = null; void this.reload() },

    /* 编辑器注入的两个函数。**每次都从服务端现取**：另一个管理员可能刚改过
     * （「↻ 重新载入」就是靠这个拿到最新的）。 */
    loaderFor(m) {
      return async () => {
        const r = await api(API + '?id=' + encodeURIComponent(m.id))
        if (!r || !r.ok) throw new Error((r && r.error) || '读取失败')
        const map = r.map
        if (!map) throw new Error('这张全局图已被删除（可能另一个管理员删掉了）')
        return String(map.text == null ? '' : map.text)
      }
    },
    saverFor(m) {
      return async (text) => await api(API, { method: 'POST', body: JSON.stringify({ id: m.id, text }) })
    },

    /* ── 补齐项目（只增不改） ───────────────────────────────── */
    async syncProjects(m) {
      if (this.busy) return
      this.busy = true
      try {
        const projects = await this.projectNames()
        if (!projects.length) { toast('当前没有可见项目可补', 'warn'); return }
        const have = new Set(textsOf(parseOutline(m.text), []))
        const missing = projects.filter((p) => !have.has(String(p).trim()))
        if (!missing.length) { toast('图里已经包含全部 ' + projects.length + ' 个项目了'); return }
        /* 纯函数改树：与编辑器同一条路径（raw → 树 → 改 → 序列化），不另起一套文本拼接。
         * ⚠ `insertChild` 返回的是 `{ root, path }`（还要把新节点的路径带回去给调用方选中），
         *   不是树本身 —— 直接当树链下去会把 `{root,path}` 再喂给下一轮，序列化出一堆垃圾。 */
        let tree = parseOutline(m.text)
        for (const p of missing) tree = insertChild(tree, [], String(p)).root
        const r = await api(API, { method: 'POST', body: JSON.stringify({ id: m.id, text: serializeOutline(tree) }) })
        if (!r || !r.ok) { toast((r && r.error) || '补齐失败', 'error'); return }
        toast('已补 ' + missing.length + ' 个节点：' + missing.join('、'))
        await this.reload()
      } catch (e) {
        toast('补齐失败：' + errText(e), 'error')
      } finally {
        this.busy = false
      }
    },

    /* ── 改名 / 删除 ───────────────────────────────────────── */
    rename(m) {
      const ok = askInput('重命名全局图「' + m.title + '」', m.title, (v) => { void this._doRename(m, v) })
      if (!ok) fail('骨架未提供 nav.askInput —— 无法弹出重命名输入框（本页不自己造输入框）')
    },

    async _doRename(m, raw) {
      const title = String(raw == null ? '' : raw).trim()
      if (!title || title === m.title || this.busy) return
      this.busy = true
      try {
        const r = await api(API, { method: 'POST', body: JSON.stringify({ id: m.id, title }) })
        if (!r || !r.ok) { toast((r && r.error) || '改名失败', 'error'); return }
        toast('已改名为「' + title + '」')
        if (this.editing && this.editing.id === m.id && r.map) this.editing = r.map
        await this.reload()
      } catch (e) {
        toast('改名失败：' + errText(e), 'error')
      } finally {
        this.busy = false
      }
    },

    async remove(m) {
      if (this.busy) return
      if (!confirmText('删除全局图「' + m.title + '」？\n\n全局图不在回收站里，删掉就找不回来了。')) return
      this.busy = true
      try {
        const r = await api(API + '?id=' + encodeURIComponent(m.id), { method: 'DELETE' })
        if (!r || !r.ok) { toast((r && r.error) || '删除失败', 'error'); return }
        toast('已删除「' + m.title + '」')
        if (this.editing && this.editing.id === m.id) this.editing = null
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

export { GlobalMindmapView, DEFAULT_TITLE, textsOf, when }
