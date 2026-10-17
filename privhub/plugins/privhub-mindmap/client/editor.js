/**
 * editor — 思维导图编辑器（画布 + 大纲并排，实时互同步，存盘到 `.mindmap`）。
 *
 * ## 数据流（**单一事实来源 = `raw` 字符串**）
 *
 *     raw（文本框的字符串，也就是文件内容）
 *       ↓ computed        ↑ serializeOutline
 *     tree（{ text, children }）
 *       ↓ layoutTree
 *     画布坐标 → SVG
 *
 * 所有修改都走 `apply()`：**从 `raw` 重新解析** → 交给 `outline.js` 的纯函数改树 →
 * 序列化回 `raw`。于是「画布改」与「大纲改」天然同源，不需要两套同步逻辑，
 * 也不会出现「面板与画布各存一份、谁覆盖谁」的经典 bug。
 *
 * ## 读写走哪条接口（**不是 `/api/doc`**）
 *
 *   · 读：`GET /privhub/api/preview` —— `.mindmap` 已登记为可预览文本，
 *     回 `{ ok:true, type:'text', data }`；
 *   · 写：`POST /privhub/api/text/save` —— **扩展名无关**的文本写接口，且已在
 *     `privhub-admin-acl` 的 `GUARD_PATHS` 里登记为 edit 侧（文件级 ACL 生效）。
 * `/api/doc` 那条链只认 `.md`（`isMd` 闸），对 `.mindmap` 会 400 —— 别改回去。
 *
 * 排他锁（Y 批）：`/api/text/save` 会带 `409 + { holder }`，界面把「谁在编辑」如实说出，
 * 不静默失败。
 *
 * ## 数据源是可注入的（P3 全局图复用本编辑器）
 *
 * 上面那两条接口是**默认**数据源（项目内文件）。全局导图（P3）不是文件、没有 `project/path`，
 * 它传 {@link MindmapEditor} 的 `loader` / `saver` 两个函数进来 —— 于是画布、大纲互同步、
 * 折叠、导出 SVG 这些逻辑**一行都不用改**，也就不会有「两套编辑器各修各的 bug」。
 * 页脚那句「这是一份文件」由 `note` 覆盖（全局图不是项目文件）。
 *
 * ## 智能体同权
 *
 * 同一份文件智能体也走 `agent/v1/write` 写（沙箱内）—— 因此这里**必须有「↻ 重新载入」**：
 * 人这边看着的是打开时的快照，agent 改完要能一键拉取最新内容（规划 §4）。
 *
 * @module privhub-mindmap/client/editor
 */

import { api, toast, askInput, confirmText } from './deps.js'
import { MindCanvas } from './canvas.js'
import { layoutTree, renderSvg, escXml } from './layout.js'
import {
  parseOutline, serializeOutline, countNodes, keyOf, pathOf, nodeAt,
  insertChild, insertSibling, setTextAt, removeAt, stemOf,
} from './outline.js'

/** 视图模式（'画布' / '并排' / '大纲'），记在本地，下次打开沿用。 */
const MODE_KEY = 'privhub.mindmap.mode'
const MODES = ['split', 'canvas', 'outline']

/** 小输入框：优先用骨架自带的 `nav.askInput`（与改名/建文件夹一致的交互），
 *  桥缺席时退化成原生 `prompt`；**两条路都走同一个回调**，调用点不用关心。 */
function ask(title, initial, onOk) {
  if (askInput(title, initial, onOk)) return
  const v = (typeof window !== 'undefined' && typeof window.prompt === 'function')
    ? window.prompt(title, initial)
    : null
  if (v !== null && v !== undefined) onOk(String(v))
}

function readMode() {
  try {
    const m = localStorage.getItem(MODE_KEY)
    return MODES.includes(m) ? m : 'split'
  } catch { return 'split' }
}

const MindmapEditor = {
  name: 'mindmap-editor',
  components: { MindCanvas },
  props: {
    project: { type: String, default: '' },
    path: { type: String, default: '' },
    name: { type: String, default: '' },
    /* 数据源注入（全局导图用）：不传 ⇒ 走下面的默认文件接口。
     * `loader()` 返回正文字符串（失败就抛 / 让 reject）；`saver(text)` 返回与
     * `/api/text/save` 同形状的 `{ ok, error? }`。 */
    loader: { type: Function, default: null },
    saver: { type: Function, default: null },
    /** 页脚第二行（说明「这份东西是什么」）。空 = 用项目文件的默认说法。 */
    note: { type: String, default: '' },
  },
  data() {
    return {
      /** 文件内容（唯一事实来源）。 */
      raw: '',
      /** 打开时 / 上次保存时的内容，用来算「未保存」。 */
      loadedRaw: '',
      /** 选中的节点 key（根 = ''，未选中 = null）。 */
      selected: null,
      /** 折叠集合：`{ [key]: true }`。 */
      folded: {},
      mode: readMode(),
      state: 'loading',
      errorMsg: '',
      saving: false,
      fitToken: 0,
    }
  },
  computed: {
    tree() { return parseOutline(this.raw) },
    nodeCount() { return countNodes(this.tree) },
    dirty() { return this.raw !== this.loadedRaw },
    fileName() { return this.name || String(this.path).split('/').pop() || '未命名.mindmap' },
    /** 数据源是不是调用方注入的（全局导图 = true，项目内文件 = false）。 */
    isExternal() { return typeof this.loader === 'function' },
    bodyClass() { return this.mode === 'outline' ? 'outline-only' : '' },
    showCanvas() { return this.mode !== 'outline' },
    statusText() {
      if (this.state === 'loading') return '读取中…'
      if (this.state === 'error') return '读取失败'
      if (this.saving) return '保存中…'
      if (this.dirty) return '● 未保存'
      return '已保存 · ' + this.nodeCount + ' 个节点'
    },
    statusClass() {
      if (this.state === 'error') return 'err'
      return this.dirty ? 'dirty' : ''
    },
    /** 有选中节点（含根）时，增删改才可用。 */
    hasSel() { return this.selected !== null },
    canDelete() { return this.selected !== null && this.selected !== '' },
  },
  watch: {
    raw() {
      /* 选中节点可能已被「大纲」面板手改删掉 —— 及时清掉，免得工具条操作打空。 */
      if (this.selected !== null && !nodeAt(this.tree, pathOf(this.selected))) this.selected = null
    },
  },
  created() {
    void this.load()
  },
  mounted() {
    /* Ctrl/Cmd+S 保存：绑在 document 上。同一时刻只可能有一个导图查看器在场
     * （宿主的内容区只挂一个 viewer），所以不会互相抢。 */
    this._onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); void this.save() }
    }
    document.addEventListener('keydown', this._onKey)
  },
  beforeUnmount() {
    if (this._onKey) document.removeEventListener('keydown', this._onKey)
  },
  methods: {
    /* ── 读写 ──────────────────────────────────────────────────── */
    async load() {
      this.state = 'loading'
      this.errorMsg = ''
      try {
        let text
        if (typeof this.loader === 'function') {
          /* 注入的数据源（全局导图）：读法由调用方定，这里只管拿到正文字符串。 */
          text = String(await this.loader())
        } else {
          const q = '?project=' + encodeURIComponent(this.project) + '&path=' + encodeURIComponent(this.path)
          const r = await api('/privhub/api/preview' + q)
          if (!r || !r.ok) {
            this.state = 'error'
            this.errorMsg = (r && r.error) || '无法读取该文件'
            return
          }
          if (r.type === 'too-large') {
            this.state = 'error'
            this.errorMsg = '文件过大（' + Math.round((r.size || 0) / 1024) + ' KB），超出在线预览上限：请下载后用其它工具打开。'
            return
          }
          if (r.type !== 'text' && r.type !== 'md') {
            this.state = 'error'
            this.errorMsg = '该文件不是可解析的缩进大纲（接口回的 type=' + r.type + '）。'
            return
          }
          text = typeof r.data === 'string' ? r.data : String(r.data == null ? '' : r.data)
        }
        this.raw = text
        this.loadedRaw = text
        this.selected = null
        this.folded = {}
        this.state = 'ready'
        this.fitToken++
      } catch (e) {
        this.state = 'error'
        this.errorMsg = String((e && e.message) || e)
      }
    },
    async reload() {
      if (this.dirty && !confirmText('本页有未保存的改动，重新载入会丢弃它们。继续？')) return
      this.folded = {}
      this.selected = null
      await this.load()
      if (this.state === 'ready') toast(this.isExternal ? '已重新载入最新内容' : '已从磁盘重新载入')
    },
    async save() {
      if (this.saving || this.state !== 'ready') return
      this.saving = true
      try {
        const r = typeof this.saver === 'function'
          ? await this.saver(this.raw)
          : await api('/privhub/api/text/save', {
            method: 'POST',
            body: JSON.stringify({ project: this.project, path: this.path, text: this.raw }),
          })
        if (!r || !r.ok) {
          /* 排他锁：把「谁在编辑」如实说出来（Y 批的 409 契约） */
          const msg = r && r.holder ? ('「' + r.holder + '」正在编辑该文件，请稍后再存') : ((r && r.error) || '保存失败')
          this.errorMsg = msg
          toast(msg, 'error')
          return
        }
        this.loadedRaw = this.raw
        this.errorMsg = ''
        toast('已保存')
      } catch (e) {
        const msg = String((e && e.message) || e)
        this.errorMsg = msg
        toast(msg, 'error')
      } finally {
        this.saving = false
      }
    },

    /* ── 变更：一律「raw → 树 → 纯函数改 → 序列化回 raw」────────── */
    apply(res) {
      if (!res) return
      const root = res.root || res
      this.raw = serializeOutline(root)
      if (res.path) this.selected = keyOf(res.path)
      /* 折叠集合里的旧 key 可能已失效（删了节点）—— 留着无害（key 不复用即不会误折叠），
       * 但结构变化的瞬间清一次更干净。不整体清空：用户折起来的分支不该被一次编辑全展开。 */
      if (res.resetFold) this.folded = {}
    },
    selPath() {
      if (this.selected === null) return null
      return pathOf(this.selected)
    },
    warn(msg) { toast(msg, 'warn') },
    opAddChild() {
      const p = this.selPath()
      if (!p) return this.warn('先点一个节点，再用「＋子节点」')
      ask('子节点文字', '', (v) => this.apply(insertChild(parseOutline(this.raw), p, v)))
    },
    opAddSibling() {
      const p = this.selPath()
      if (!p) return this.warn('先点一个节点，再用「＋同级」')
      if (!p.length) return this.warn('根节点没有同级 —— 用「＋子节点」加一级分支')
      ask('同级节点文字', '', (v) => this.apply(insertSibling(parseOutline(this.raw), p, v)))
    },
    opRename() {
      const p = this.selPath()
      if (!p) return this.warn('先点一个节点再改名')
      const cur = (nodeAt(this.tree, p) || {}).text || ''
      ask(p.length ? '修改节点文字' : '修改导图标题', cur, (v) => this.apply(setTextAt(parseOutline(this.raw), p, v)))
    },
    opRemove() {
      const p = this.selPath()
      if (!p) return this.warn('先点一个节点再删除')
      if (!p.length) return this.warn('根节点不能删除（它就是这个文件的标题）')
      const node = nodeAt(this.tree, p)
      const kids = (node && node.children && node.children.length) || 0
      if (kids && !confirmText('该节点下还有 ' + kids + ' 个子节点，一并删除？')) return
      this.apply(removeAt(this.tree, p))
      if (p.length > 1) this.selected = keyOf(p.slice(0, -1))
      else this.selected = ''
    },

    /* ── 折叠 / 视图 ───────────────────────────────────────────── */
    onFold(key) {
      const f = Object.assign({}, this.folded)
      if (f[key]) delete f[key]
      else f[key] = true
      this.folded = f
    },
    onSelect(key) { this.selected = key },
    /** 收集「有子节点」的全部 key（含已折叠节点内部 —— 折叠是独立的、不遗传）。 */
    collectFoldable() {
      const out = {}
      const walk = (node, path) => {
        const kids = (node && node.children) || []
        if (kids.length) out[keyOf(path)] = true
        kids.forEach((c, i) => walk(c, path.concat(i)))
      }
      walk(this.tree, [])
      return out
    },
    foldAll() { this.folded = this.collectFoldable() },
    expandAll() { this.folded = {} },
    fitCanvas() { this.fitToken++ },
    setMode(m) {
      if (!MODES.includes(m)) return
      this.mode = m
      try { localStorage.setItem(MODE_KEY, m) } catch { /* 隐私模式下写不了，忽略 */ }
    },

    /* ── 导出 SVG（P1 只做这一种；多格式导入导出属下一期，见看板 P6）── */
    exportSvg() {
      const L = layoutTree(this.tree, this.folded)
      /* 主题判定优先问骨架（`window.PrivHub.THEME.theme`），拿不到再看 html 上的
       * `data-theme` 属性 —— 骨架就是往这个属性上写主题的。两边都拿不到 ⇒ 按浅色导出。 */
      const B = (typeof window !== 'undefined' && window.PrivHub) || null
      const t = (B && B.THEME && B.THEME.theme) || document.documentElement.getAttribute('data-theme')
      const svg = renderSvg(L, { background: t === 'dark' ? '#0f172a' : '#ffffff' }, escXml)
      const blob = new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n' + svg], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = stemOf(this.fileName) + '.svg'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
      toast('已导出 SVG')
    },

    /* ── 画布抛上来的键盘动作（无参数：都作用于选中节点） ────────── */
    onCanvasAddChild() { this.opAddChild() },
    onCanvasAddSibling() { this.opAddSibling() },
    onCanvasRemove() { this.opRemove() },
    onCanvasRename() { this.opRename() },
  },
  template: `
    <div class="mm-root">
      <div class="mm-bar">
        <button v-for="m in ['split', 'canvas', 'outline']" :key="m" class="mm-btn"
                :class="{ on: mode === m }" :title="'视图：' + (m === 'split' ? '画布 + 大纲并排' : (m === 'canvas' ? '只看画布' : '只看大纲文本'))"
                @click="setMode(m)">{{ m === 'split' ? '并排' : (m === 'canvas' ? '画布' : '大纲') }}</button>
        <span class="mm-sep"></span>
        <button class="mm-btn" :disabled="!hasSel" title="在选中节点下加一个子节点（快捷键 Tab）" @click="opAddChild">＋子节点</button>
        <button class="mm-btn" :disabled="!hasSel" title="在选中节点后面加一个同级节点（快捷键 Enter）" @click="opAddSibling">＋同级</button>
        <button class="mm-btn" :disabled="!hasSel" title="修改选中节点的文字（快捷键 F2；根节点改的是导图标题）" @click="opRename">✏ 改名</button>
        <button class="mm-btn" :disabled="!canDelete" title="删除选中节点及其子树（快捷键 Delete）" @click="opRemove">🗑 删除</button>
        <span class="mm-sep"></span>
        <button class="mm-btn" title="把整张图缩放到合适的比例" @click="fitCanvas">⤢ 适应窗口</button>
        <button class="mm-btn" title="折叠所有有子节点的节点" @click="foldAll">⊟ 全折叠</button>
        <button class="mm-btn" title="展开全部节点" @click="expandAll">⊞ 全展开</button>
        <button class="mm-btn" title="导出为 SVG 图片（下一期会有更多格式，见任务看板 P6）" @click="exportSvg">⬇ 导出 SVG</button>
        <span class="mm-grow"></span>
        <span class="mm-state" :class="statusClass">{{ statusText }}</span>
        <button class="mm-btn primary" :disabled="!dirty || state !== 'ready'" :title="'保存（Ctrl+S）：写回 ' + fileName" @click="save">💾 保存</button>
        <button class="mm-btn" title="丢弃本页改动，从磁盘重新读取（智能体改过这份文件时用它）" @click="reload">↻ 重新载入</button>
      </div>

      <div class="mm-body" :class="bodyClass">
        <div v-if="state === 'loading'" class="mm-center"><div class="mm-big">🌳</div>正在读取 {{ fileName }} …</div>
        <div v-else-if="state === 'error'" class="mm-center">
          <div class="mm-big">⚠️</div>
          <div>{{ errorMsg }}</div>
          <button class="mm-btn" @click="load">重试</button>
        </div>
        <template v-else>
          <MindCanvas v-if="showCanvas" ref="canvas" :root="tree" :selected="selected" :folded="folded"
                      :fit-token="fitToken"
                      @select="onSelect" @fold="onFold"
                      @add-child="onCanvasAddChild" @add-sibling="onCanvasAddSibling"
                      @remove="onCanvasRemove" @rename="onCanvasRename"></MindCanvas>
          <div class="mm-outline">
            <div class="mm-outline-head">
              <span>大纲文本</span>
              <span style="flex:1 1 auto"></span>
              <span>改这里，画布立刻跟着变</span>
            </div>
            <textarea v-model="raw" spellcheck="false"
                      placeholder="一行一个节点，缩进表示层次：&#10;# 导图标题&#10;- 一级分支&#10;  - 二级节点"></textarea>
          </div>
        </template>
      </div>

      <div class="mm-foot">
        节点：单击选中 · 双击改名 · 圆点折叠/展开 ｜ 画布：拖拽平移 · 滚轮缩放 ｜ 键盘：<code>Tab</code> 子节点 · <code>Enter</code> 同级 · <code>Delete</code> 删除 · <code>Ctrl+S</code> 保存
        <br>
        <template v-if="note">{{ note }}</template>
        <template v-else>这份文件就是一份 Markdown 缩进大纲（<code># 标题</code> + <code>- 圆点</code>，每 2 空格一级）——
        智能体可以直接读写、版本历史与全库搜索也都认它。</template>
      </div>
    </div>
  `,
}

export { MindmapEditor, MODES, MODE_KEY }
