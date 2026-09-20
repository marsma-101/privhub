# 10 · 内容区所有权与 docx 残留 —— 方案

> 用途：把「打开 docx 后再打开任何别的文件都闪一下旧界面」这个已确诊 bug 的机制钉死，从 VS Code 借一套**所有权 + 声明式 viewer** 的做法，翻成 PrivHub 能落地的两步走方案。
> 编制：萧潇｜日期：2026-09-17｜源码基线：v3.1.0（版本号唯一来源 `privhub/package.json`）
> 纪律留痕：**全程只读**。`privhub/` 与 `docs/` 既有文件**一字未改**；本次唯一新建文件即本文件。未使用 workflow / ralph，未委派子智能体。**绝不提交、绝不推送、绝不 stash。**
> 行号约定：本文 `privhub/` 前缀一律省略，`plugins/...` 指 `privhub/plugins/...`，`frontend/index.html` 指 `privhub/frontend/index.html`。所有行号均以 `read`/`grep` 工具读到的为准。
> 可信度标记沿用七路评审口径：**【实体】**亲自打开文件看到该行　**【实证】**由命令/统计得出　**【推断】**有据未复现　**【官方文档】**/**【本机实读】**

---

## 1. 一句话结论

**这个 bug 不是某个插件写坏了，而是「`.v3-content` 这块公共内容区没有主人」**——所有者 `explorer-v3` 只把它当模板占位，四个插件各自伸手往里塞东西（其中一个塞进去就再也不拿走），于是**插件注入的 iframe 成了 Vue 的「盲区」**：Vue 不认识它、不敢删它，它就一直挂在那儿，切到任何文件都先把它显出来。修法就是 VS Code 的做法——**内容区归宿主所有、宿主负责挂载与卸载，插件只做声明并只操作「发给它的那块地」**。

---

## 2. bug 的精确机制（含「闪烁」成因）

### 2.1 涉及的三个文件、五处代码

| 位置 | 代码做什么 | 问题 |
|---|---|---|
| `plugins/privhub-files-office2/client/index.js:15` | `REPLACE_EXTS = ['.docx', '.xlsx']` | 只管这两种扩展名 |
| `:36-39` | `if (!payload \|\| !payload.project \|\| !payload.path) return` → `const ext = this.extOf(payload.path)` → `if (!REPLACE_EXTS.includes(ext)) return` | **打开任何非 docx/xlsx 的文件，这里直接 return，什么都不清理** |
| `:41-48` | `const content = document.querySelector('.v3-content')`；`let frame = content.querySelector('iframe.office2-frame')`；**有 frame 就只换 `frame.src` 然后 return** | 复用旧 iframe = 保留上一次的 DOM 节点 |
| `:50-60` | 找 `.v3-md` / `.v3-text` 并 `style.display='none'` → 造 iframe → **`content.prepend(frame)`** | 把 iframe 插到内容区**第一个**子节点 |
| `:18-27` | 往 `<head>` 注入 CSS：`.v3-content:has(iframe.office2-frame) { display:flex; ... padding:0 }` | **只要 iframe 还在，内容区就一直是 office 布局** |
| `:68-71` | `mounted()` 里 `bus.on('v3:md-rendered', …)`；`beforeUnmount()` 只 `_off()` | 只取消监听，**从不移除 iframe** |

**全仓核查【实证】**：`grep 'office2-frame'` 命中**只有 `plugins/privhub-files-office2/client/index.js` 这 7 处**（`:20 :21 :22 :23(注释) :44 :55 :58(注释)`）。**没有任何一处移除 `.office2-frame`** —— 父级这一条复核无误。

### 2.2 内容区的真实 DOM 长什么样（`plugins/privhub-files-explorer-v3/client/panel.js`）

模板在 `:401` 起：

```
:401  <template v-if="activeTab && content && content.key === activeTab.key">
:402    <div class="v3-content">
:406      <div v-if="content.readonlyHint" class="v3-readonly-hint">…</div>
:407      <div v-if="content.state === 'loading'" class="v3-loading">正在加载…</div>
:408      <div v-else-if="content.state === 'error'" class="v3-loading">…</div>
:409      <template v-else-if="content.office">
:410        <div v-html="renderMd()" class="v3-md"></div>
:412      <template v-else-if="content.markdown !== undefined">
:413        <div v-html="renderMd()" class="v3-md"></div>
:415      <template v-else-if="content.text !== undefined">
:416        <pre class="v3-text">{{ content.text }}</pre>
:418      <template v-else-if="content.url">  … img / iframe.v3-pdf
:422    </div>
```

**这块容器是 Vue 模板渲染的**，Vue 只认识它自己列表里的那几个子节点。

### 2.3 「闪烁」到底怎么发生的 —— 四步，全部有行号

**第 0 步（残留已经形成）**
打开 docx → `content.js:36` 取 office 内容 → `:37` `store.content = {key, state:'ready', office:{…}}` → `:40` `bus.emit('v3:md-rendered', {project, path, key})`。
office2 的监听器（`office2/client/index.js:69`）**同步**执行 `replace(payload)`：此时 `.v3-content` 已由 Vue 渲染好（docx 是上一个已完成的渲染），于是 `:50` 找到 `.v3-md`、`:53` 把它 `display:none`，`:60` **`content.prepend(frame)`** 把 iframe 插进去。
→ **`.v3-content` 现在的子节点是：`[iframe.office2-frame]`（Vue 不认识）+ `[.v3-md]`（被隐藏）**。

**第 1 步（切到别的文件，iframe 没人管）**
点开一个 .md / 图片 / txt：
- `tabs.js:75-77` `store.activeKey = key` → `loadContent(key)`；
- `content.js:33` 立刻 `store.content = { key, state:'loading' }`；
- `content.js:86` 内容就绪后再发一次 `v3:md-rendered` → office2 收到，`replace` 里 `:39` 扩展名不在清单 → **`return`**。

⇒ **iframe 原地不动，CSS 类名和 `src` 都没变。**

**第 2 步（Vue 重渲染，但它是「瞎」的）**
Vue 按 `:401` 的条件 patch 这个 `div.v3-content`。旧内容是 `[iframe] + [.v3-md]`，新内容是 `[.v3-loading]`（或新的 `.v3-md`）。
Vue 的 patchChildren **只认它自己 vnode 里有的那两个节点**，会把 `.v3-md` 删掉/替换掉，**但那个 iframe 不在 vnode 列表里**——Vue 不会去删一个它不认识的邻居节点。
⇒ **iframe 活下来了，且现在排在 `.v3-loading` / 新 `.v3-md` 的后面（DOM 顺序：iframe 第一，新内容第二）。**

**第 3 步（`:has()` 把「残留」升级成「整块布局错乱」）**
`office2/client/index.js:20` 的 `.v3-content:has(iframe.office2-frame)` 仍然命中 ⇒ 内容区变 `display:flex; flex-direction:column; padding:0; overflow:hidden`。
又因为 `:21` 的 `iframe.office2-frame { flex:1 1 auto; min-height:0 }` + `:22` 的 `height:100%`，**iframe 会把整个内容区撑满**（flex 列方向、`overflow:hidden`，后面的新内容被挤出可视区）。
⇒ 用户看到的**不是「一闪」，而是「先看到 docx 铺满整个内容区」**——这就是报告的「闪烁出现那个 docx 的界面」。

**第 4 步（为什么是「闪一下」而不是「一直错」）**
等到用户（或下一步操作）让 `.v3-content` **整个被销毁重建**（`:401` 的 `v-if` 变假：关掉标签、`store.activeKey=''`、`nav.path` 变化——`panel.js:75`、`:79`、`:150-151`、`tabs.js:20`、`:88`），Vue 把 `div.v3-content` 连同里面的 iframe **一起从 DOM 摘掉**，残留才消失。
⇒ **「闪一下」的完整形状是**：打开非 office 文件 → 立刻看见旧 docx 铺满 → 直到内容区被整体重建才回到正常。
**另一个触发点（更像「闪」）**：切回/再打开同一个 docx 时，`:44-47` 复用旧 iframe，**只改 `src`**——iframe 导航期间浏览器会保留上一次已绘制的画面（浏览器对 iframe 的既有行为【推断】），于是又看到一次旧 docx。

**⚠️ 一条被忽略的连带伤【推断】**：残留期间 `:has()` 让内容区变 `padding:0; overflow:hidden; display:flex`，此时若打开的是**图片**（`:419`）或 **PDF**（`:420` `iframe.v3-pdf height:calc(100vh-260px)`），**它们的排版也会跟着错**（图片居中失效、PDF 高度失准）。所以这个 bug 的可见面比「闪一下」更宽。

**⚠️ 一个看似凶手其实不是的家伙**：`office2:44-47`「有 frame 就只换 src」是**放大器**（让旧画面有时间绘制出来），但**根因仍是「Vue 不知道这个节点存在，没人负责卸载」**。只改 `:44-47` 治不了切换到非 office 文件的那条路。

### 2.4 时序细节（父级没查的那一半）

| 事实 | 位置 | 后果 |
|---|---|---|
| `v3:md-rendered` 在 `store.content` 赋值之后**同一 tick 内同步发出**，此时 Vue **还没 flush** DOM | `content.js:37` → `:40`（office 分支）、`:86`（末尾统一发） | office2 的 `querySelector('.v3-md')` 看到的是**上一次渲染的旧节点**，不是新内容 |
| 非 office 分支走网络 `await api(...)`，`state:'loading'` 会先渲染一帧 | `content.js:33` → `:45` | 这一帧里 `.v3-content` 只有 `.v3-loading`，**iframe 独占整块** → 最刺眼的闪光就在这一帧 |
| docx 分支 `:40` 之后 `return`，**不经过** `:86` | `content.js:41` | docx 只发一次事件；其它类型发一次。没有「发两次」的重复问题 |
| 切标签前先发 `md:interrupt` | `tabs.js:53`、`:69`；`panel.js:79` | 这是 edit-md 用的「离开通知」，office2 **完全没听这个事件**（`office2:69` 只听 `v3:md-rendered`） |
| 切目录时 `store.content = null` 让 `:401` 变假，整个内容区被销毁 | `panel.js:75`、`:79`、`:150-151`；`tabs.js:20`、`:88` | **这正是残留「偶尔自己好了」的原因——内容区被销毁重建，把脏东西一起带走了。**⇒ 反证：残留的生命周期完全跟着内容区的生命周期，与 iframe 自己无关 |

---

## 3. 现状盘点：谁在动 `.v3-content`

**检索口径【实证】**：`grep 'v3-content|office2-frame|v3-md|v3-text'`（范围 `privhub/`，排除 `_retired-v2`）＋ 逐条回读。命中分三类：**真操作 DOM 的 4 家**、**只在自己模板里借类名的 1 家**、**只读不写的 1 家**。

| # | 插件 | 动了什么 | 代码位置 | 谁触发 | **有没有清理** | 用的什么清理方式 |
|---|---|---|---|---|---|---|
| 1 | **`privhub-files-explorer-v3`**（**所有者**） | 渲染 `.v3-content` 本体 + `.v3-md` / `.v3-text` / `.v3-loading` / `.v3-readonly-hint` | `panel.js:402`、`:406`、`:410`、`:413`、`:416`、`:407-408` | 自己的 `v-if`（`:401`）+ `store.content` | **Vue 自动** | 条件为假时整个 `div.v3-content` 连子节点一起销毁 ⇒ **但它只删自己 vnode 列表里的节点**，注入的 iframe 不在列表里 ⇒ **删不掉** |
| 2 | **`privhub-files-office2`** | ① 往 `.v3-content` **prepend** `iframe.office2-frame`；② 把 `.v3-md`/`.v3-text` 设为 `display:none`；③ 往 `<head>` 注入依赖 `.v3-content` 的 `:has()` 规则 | `index.js:41`、`:44`、`:50-53`、`:54-60`；CSS `:20-22`；注入 `:18-27` | `bus.on('v3:md-rendered')`（`:69`） | **❌ 完全没有** | `beforeUnmount` 只 `_off()`（`:71`）。**全仓无一处移除 `.office2-frame`**【实证】 |
| 3 | **`privhub-files-edit-md`** | ① `querySelector('.v3-content')` 判有没有内容区；② 把 `.v3-md, .v3-text` 设 `display:none`；③ 用 `<teleport to=".v3-content">` **把自己整块编辑器塞进别人的容器** | `index.js:229`、`:274-275`、`:307-308`、`:311`、**:465（`<teleport … to=".v3-content">`）** | `bus.on('entry:open')`（`:434`）、`bus.on('md:auto-edit')`（`:439`）、显式点「编辑」 | **✅ 有，且双保险** | ① `exitInline()` `:308` 恢复 `display`、`:311` `host.querySelectorAll('.md-inline-root').forEach(el => el.remove())`；② 监听 `md:interrupt`（`:449-456`）在切标签/切目录/关标签前把 `open=false; mode='float'` ⇒ Vue 拆掉 teleport 内容。**⚠️ 但 `beforeUnmount`（`:458-462`）里没有清 `.md-inline-root` 与恢复 `display`** ⇒ 若这个组件被整体卸载，会留下隐藏的 `.v3-md` 和残留节点 |
| 4 | **`privhub-files-comments`** | 往 `.v3-md` 里插 `<mark class="v3-cmt">` 锚点（**修改别人渲染出来的节点内容**） | 读节点 `index.js:112`（`document.querySelector('.v3-content .v3-md')`）；插入 `:46-71`（`:63-69` 造 mark、`extractContents`、`insertNode`） | `mdEl` 变化的 watch（`:116-125`） | **✅ 有** | `renderMarks()` 开头 `:46-50` 先把自己插的 mark 拆回文本（`replaceWith(textNode)` + `normalize()`）再重画；`beforeUnmount` `:241` `this._mo.disconnect()`。**⚠️ 它靠 `MutationObserver`（`:119-123`，`childList+subtree+characterData`）盯住 `.v3-md`**，因为 Vue 每次 `v-html` 都会把节点重建 |
| 5 | `privhub-shell-agent-console` | **只是在自己模板里写 `class="v3-loading"` 借样式**，没有任何 `querySelector` | `client/index.js:174`、`:175`、`:293` | — | 不需要 | **不算注入者**（与 `08-连线契约.md:410` 一致） |
| 6 | `privhub-files-explorer-v3`（**反向**） | **CSS 认 edit-md 的类名**：`.v3-content:has(.md-inline-root)` 三处 + `.md-src` | `client/styles.js:28`、`:52`、`:53`、`:54` | 纯 CSS | — | 这是**双向耦合的另一半**：explorer-v3 的样式跟着 edit-md 的类名走（`08-连线契约.md:411` 已记） |

**结论【实体】**：**真正的注入者是 4 家**，其中 **office2 是唯一一家「只进不出」的**；edit-md 与 comments 都有清理，但都用了**各自的私有手段**（teleport 生命周期 / MutationObserver），而**所有者本身没有任何「内容区归我管」的意识**——它只保证自己渲染的那几个节点对。

---

## 4. VS Code 是怎么做的

> **重要前置说明（必须原样保留）**：**本机没有安装 VS Code。**
> 我按题目给的三个候选路径逐个 `Test-Path` 全为 `False`：`C:\Users\Administrator\AppData\Local\Programs\Microsoft VS Code\Code.exe`、`C:\Program Files\Microsoft VS Code\Code.exe`、`C:\Program Files (x86)\Microsoft VS Code\Code.exe`。另查注册表卸载项、`HKLM\…\App Paths\Code.exe`、开始菜单/桌面 `*Code*.lnk`、`where code`、`%USERPROFILE%\.vscode` —— **均无 VS Code**【实证】。
> **本机装的是 VS Code 的三个同源发行版（fork）**：`Trae CN`（`D:\Program Files\Trae CN\`，`resources/app/package.json` 自报 `"name": "Trae CN", "version": "1.107.1", "author": Microsoft Corporation`，`product.json` 的 `vscodeVersion` 也是 **1.107.1**）、`CodeBuddy CN`、`Qoder CN IDE`。它们的 `resources/app/` 结构与 VS Code 完全同源（`out/vscode-dts/vscode.d.ts`、`extensions/` 内置扩展、`product.json`）。
> **所以本文的【本机实读】部分读的是 Trae CN 内置的这份 VS Code 1.107.1 资源**——读的是**同一套扩展机制与同一份 API 契约文件**（`vscode.d.ts`、内置扩展的 `package.json`），但**不是** Microsoft 原版安装目录。凡引用之处我逐条标了真实路径，**请勿把它当成「原版 VS Code 安装目录」**。

### 4.1 【本机实读】声明式文件：扩展如何「声明自己能开哪类文件」

**读到的文件**：`D:\Program Files\Trae CN\resources\app\extensions\<扩展名>\package.json`

**① `markdown-language-features/package.json` 的 `contributes.customEditors`**（原文）：

```json
{"viewType":"vscode.markdown.preview.editor","displayName":"Markdown Preview","priority":"option","selector":[{"filenamePattern":"*.md"}]}
```

**② `media-preview/package.json`**（三个声明，节选第一个）：

```json
[{"viewType":"imagePreview.previewEditor","displayName":"%customEditor.imagePreview.displayName%","priority":"builtin",
  "selector":[{"filenamePattern":"*.{jpg,jpe,jpeg,png,bmp,gif,ico,webp,avif,svg}"}]},
 {"viewType":"vscode.audioPreview", …}, {"viewType":"vscode.videoPreview", …}]
```

**③ `ms-vscode.vscode-js-profile-table/package.json`**：`priority: "default"` × 3（`*.cpuprofile` / `*.heapprofile` / `*.heapsnapshot`）。

**④ 这几个扩展的 `activationEvents` 与被读到的 `contributes` 键**（同文件）：

| 扩展 | `activationEvents` | `contributes` 键 |
|---|---|---|
| `media-preview` | **空（未声明）** | `configuration`, **`customEditors`**, `commands`, `menus` |
| `markdown-language-features` | `onLanguage:markdown` … `onCommand:…` `onWebviewPanel:markdown.preview` | …**, `customEditors`** |
| `git-base` | `*` | `commands`, `menus`, **`languages`**, `grammars` |
| `ipynb` | `onNotebook:jupyter-notebook` … | `notebooks`, `notebookRenderer`, … |
| `simple-browser` | `onCommand:…`, `onOpenExternalUri:http/https`, `onWebviewPanel:simpleBrowser.view` | `commands`, `configuration` |

⇒ **关键事实【本机实读】**：`media-preview` **一个 `activationEvents` 都没写**，却完整声明了 3 个 customEditor。也就是说 **VS Code 会从 `contributes.customEditors` 自动派生 `onCustomEditor:<viewType>` 激活事件**，扩展不需要手写（与【官方文档】4.2 最后一段互相印证）。

**⑤ 【本机实读】扩展真正注册 provider 的那一行**（`media-preview/dist/extension.js`，压缩产物，我只摘了登记调用这一段，未通读）：

```js
window.registerCustomEditorProvider(l.viewType, r, {
  supportsMultipleEditorsPerDocument: !0,
  webviewOptions: { retainContextWhenHidden: !0 }
})
```

⇒ 这是「**声明与实现分离**」的现场证据：`package.json` 里说「我能开 `*.mp4`」，`extension.js` 里才注册真正的实现；**扩展从头到尾没有碰过 VS Code 的 DOM**。

### 4.2 【官方文档】三条机制

#### (a) 编辑器组与标签页：同一时刻只有一个「激活编辑器」，其它**隐藏而不销毁**

| 事实 | 出处 |
|---|---|
| 「When a webview panel is **moved into a background tab, it becomes hidden. It is not destroyed however.** VS Code will automatically restore the webview's content from `webview.html` when the panel is brought to the foreground again」 | [Webview API · Visibility and Moving](https://code.visualstudio.com/api/extension-guides/webview) |
| 「The `.visible` property tells you if the webview panel is currently visible or not.」`reveal()` 把它带回前台 | 同上 |
| `WebviewPanel` 的契约字段：`active`（是否被聚焦）、`visible`（是否可见）、`viewColumn`、`onDidChangeViewState` | 本机 `vscode.d.ts:10101-10114`【本机实读】；[API 参考](https://code.visualstudio.com/api/references/vscode-api#WebviewPanel) |
| 编辑器组/标签的「激活」概念：`window.activeTextEditor`（**单个**）与 `window.visibleTextEditors`（**多个**）并存，并有 `onDidChangeActiveTextEditor` / `onDidChangeVisibleTextEditors` | 本机 `vscode.d.ts:11062`、`:11067`、`:11074`、`:11080`【本机实读】 |

⇒ **「一个激活 + 多个可见但非激活」是 VS Code 的显式模型**，而且「隐藏 ≠ 销毁」被写进了 API 注释。

#### (b) webview 生命周期：谁在什么时候 dispose、`retainContextWhenHidden` 换来什么代价

| 事实 | 出处 |
|---|---|
| 「**Webview panels are owned by the extension that creates them.** The extension must hold onto the webview returned from `createWebviewPanel`. **If your extension loses this reference, it cannot regain access to that webview again**, even though the webview will continue to show」 | [Webview API · Lifecycle](https://code.visualstudio.com/api/extension-guides/webview) |
| 「Normally the webview panel's html context is **created when the panel becomes visible and destroyed when it is hidden**」 | 本机 `vscode.d.ts:10042-10043`【本机实读】 |
| 「`retainContextWhenHidden` **has a high memory overhead** and should only be used if your panel's context cannot be quickly saved and restored」「When a webview using `retainContextWhenHidden` becomes hidden, **its scripts and other dynamic content are suspended**. … **You cannot send messages to a hidden webview**」 | 本机 `vscode.d.ts:10046-10054`【本机实读】；同文见 [Webview API](https://code.visualstudio.com/api/extension-guides/webview) |
| 「When a webview panel is closed by the user, **the webview itself is destroyed. Attempting to use a destroyed webview throws an exception.**」用 `onDidDispose` 清理定时器/资源 | [Webview API · Lifecycle](https://code.visualstudio.com/api/extension-guides/webview) |
| 「Dispose of the webview panel. This closes the panel if it showing and **disposes of the resources owned by the webview**. Webview panels are also disposed when the user closes the webview panel. **Both cases fire the `onDispose` event.**」 | 本机 `vscode.d.ts:10137-10144`【本机实读】 |
| 自定义编辑器：「VS Code handles the lifecycle of both the view component … and the model component」；关闭时 **先 `WebviewPanel.onDidDispose`（每个视图实例一次），最后一个编辑器关闭后再 `CustomDocument.dispose`** | [Custom Editor API · Custom Text Editor lifecycle / Closing Custom Editors](https://code.visualstudio.com/api/extension-guides/custom-editors) |
| `CustomDocument`「The lifecycle of a `CustomDocument` **is managed by the editor**. When no more references remain to a `CustomDocument`, it is disposed of.」「`dispose()`: **This is invoked by the editor** when there are no more references」 | 本机 `vscode.d.ts:10368-10383`【本机实读】 |
| 「**By default, the editor only allows one editor instance to be open at a time for each resource.**」要支持多视图必须显式 `supportsMultipleEditorsPerDocument: true` | 本机 `vscode.d.ts:11776-11789`【本机实读】；[Custom Editor API](https://code.visualstudio.com/api/extension-guides/custom-editors) |
| 「A poorly designed webview can easily feel out of place … Webviews are **resource heavy**」「Just because you can do something with webviews, doesn't mean you should.」 | [Webview API · Should I use a webview?](https://code.visualstudio.com/api/extension-guides/webview) |

⇒ **两条硬事实**：① **谁是创建者谁负责持有并销毁**，宿主负责「可见时创建、隐藏时销毁」；② **「保住上下文」是要付出高内存代价的显式选择**，默认行为是「隐藏即销毁、回来重建」。

#### (c) 扩展边界：为什么扩展**不需要**、也**不能**互相操作 UI

| 事实 | 出处 |
|---|---|
| 「**No DOM Access** — Extensions have no access to the DOM of VS Code UI. You **cannot** write an extension that applies custom CSS to VS Code or adds an HTML element to VS Code UI. … we run extensions in an **Extension Host process** and **prevent direct access to the DOM**.」 | [Extension Capabilities · Restrictions](https://code.visualstudio.com/api/extension-capabilities/overview) |
| 「**No custom style sheets** — A custom style sheet provided by users or extensions would work against the DOM structure **and class names**. These are **not documented as we consider them internal**. … Any change to the DOM can break existing custom style sheets」 | 同上 |
| 扩展之间怎么「连」：只通过 **Contribution Points（声明）**、**命令 / 事件 / 各种 Provider API**、以及 **webview 内部的 message passing**。「Your extension registers **Contribution Points** to extend various functionalities」 | [Contribution Points](https://code.visualstudio.com/api/references/contribution-points)、[Custom Editor API](https://code.visualstudio.com/api/extension-guides/custom-editors) |
| 多个扩展想开同一类文件怎么办：**`priority` 声明 + 用户选择**。`"default"` = 每个匹配文件都优先用它（多个则让用户选）；`"option"` = 默认不用、允许用户切过去 | [Custom Editor API · Contribution point](https://code.visualstudio.com/api/extension-guides/custom-editors) |

⇒ **这一段是最直接的答案**：VS Code 不支持、也不允许「扩展 A 去改扩展 B 的界面」，**连给自己加 CSS 都不允许**——理由是「DOM 结构与类名是我们内部实现，随时会变」。**这正好是 PrivHub 硬约束第 5 条（禁止插件用 DOM 类名操作别的插件的界面）的同一条理由**。

### 4.3 【本机实读】`vscode.d.ts` 契约原文摘抄

文件：`D:\Program Files\Trae CN\resources\app\out\vscode-dts\vscode.d.ts`（共 21164 行）

| 契约 | 行号 | 原文摘（关键句） |
|---|---|---|
| `WebviewPanelOptions.retainContextWhenHidden` | `:10030-10054` | 「Controls if the webview panel's content (iframe) is kept around even when the panel is no longer visible. **Normally the webview panel's html context is created when the panel becomes visible and destroyed when it is hidden.** … `retainContextWhenHidden` **has a high memory overhead**」 |
| `WebviewPanel` | `:10060-10145` | `viewType` / `title` / `webview` / `options` / `viewColumn` / **`active`** / **`visible`** / `onDidChangeViewState` / **`onDidDispose`** / `reveal()` / **`dispose()`** |
| `WebviewPanel.dispose` | `:10137-10144` | 「**disposes of the resources owned by the webview** … **Both cases fire the `onDispose` event.**」 |
| `CustomTextEditorProvider` | `:10334-10363` | 「Text based custom editors use a `TextDocument` as their data model. … **The provider is responsible for synchronizing text changes between the webview and the `TextDocument`.**」`resolveCustomTextEditor(document, webviewPanel, token)`：「**During resolve, the provider must fill in the initial html for the content webview panel and hook up all the event listeners on it**」 |
| `CustomDocument` | `:10365-10384` | 「**The lifecycle of a `CustomDocument` is managed by the editor.**」「`dispose()`: **This is invoked by the editor** when there are no more references」 |
| `CustomReadonlyEditorProvider` | `:10503-10526` | 「`openCustomDocument` is called when the first time an editor for a given resource is opened. **Already opened `CustomDocument` are re-used** if the user opened additional editors. **When all editors for a given resource are closed, the `CustomDocument` is disposed of.**」 |
| `registerCustomEditorProvider` | `:11755-11790` | 「When a custom editor is opened, **an `onCustomEditor:viewType` activation event is fired**. Your extension **must register** a … provider **for `viewType` as part of activation**.」「By default, **the editor only allows one editor instance to be open at a time for each resource**」 |
| `WebviewViewResolveContext` | `:10281-10311` | 「**the editor normally deallocates webview documents (the iframe content) that are not visible** … The `WebviewView` itself is kept alive but **the webview's underlying document is deallocated. It is recreated when the view becomes visible again.**」「You can prevent this behavior by setting `retainContextWhenHidden` … **However this increases resource usage and should be avoided wherever possible.**」 |
| `window.activeTextEditor` / `visibleTextEditors` | `:11062` / `:11067` | 「The currently active text editor … The visible text editors.」两个独立概念 |
| `registerWebviewPanelSerializer` | `:11711` | 「Persist webview panels that have been persisted when vscode shuts down … **make sure that `registerWebviewPanelSerializer` is called during activation**」 |

---

## 5. 可迁移规则（一条一句，附出处）

> 每条都标了 VS Code 侧的出处。**规则的「PrivHub 落点」写在括号里**，第 6/7 节展开。

| # | 规则 | VS Code 出处 |
|---|---|---|
| R1 | **内容区归宿主所有**：视图容器由宿主创建、由宿主持有引用，创建者以外的人不持有它。 | 【官方文档】Webview API「Webview panels are **owned by the extension that creates them**」 |
| R2 | **扩展只做声明，不做装配**：能开哪类文件写在 `package.json` 的 `contributes.customEditors`（`viewType` + `selector.filenamePattern` + `priority`）里，由宿主读声明决定派谁上场。 | 【本机实读】`media-preview`/`markdown-language-features`/`vscode-js-profile-table` 的 `package.json`；【官方文档】Custom Editor API · Contribution point |
| R3 | **宿主负责挂载与卸载**：可见时创建、隐藏时销毁，都是宿主的事，扩展只被回调。 | 【本机实读】`vscode.d.ts:10042-10043`；【官方文档】Webview API · Visibility and Moving |
| R4 | **离开即卸载，回来再挂载**：默认行为是「隐藏即销毁上下文、再可见时重建」，而不是「藏起来假装卸载」。 | 【本机实读】`vscode.d.ts:10042-10046`、`:10285-10288` |
| R5 | **不靠隐藏来假装卸载**：`retainContextWhenHidden` 是**显式付出高内存代价**的例外，官方措辞是「be conservative」「should be avoided wherever possible」。 | 【本机实读】`vscode.d.ts:10051-10054`、`:10290-10292`；【官方文档】Webview API |
| R6 | **没人认领的节点等于泄漏**：扩展一旦丢失 webview 引用，就再也拿不回它——**引用与生命周期必须成对**。 | 【官方文档】Webview API · Lifecycle「If your extension loses this reference, it cannot regain access to that webview again」 |
| R7 | **销毁必须成对**：视图销毁（`WebviewPanel.dispose` / `onDidDispose`）与模型销毁（`CustomDocument.dispose`）分开、按引用计数触发，都由宿主发起。 | 【本机实读】`vscode.d.ts:10137-10144`、`:10368-10383`；【官方文档】Custom Editor API · Closing Custom Editors |
| R8 | **同一资源默认只开一个实例**：想多开必须显式声明 `supportsMultipleEditorsPerDocument: true`，并自己保证多实例状态一致。 | 【本机实读】`vscode.d.ts:11776-11789` |
| R9 | **能力用声明派生激活，不靠抢**：`contributes.customEditors` 自动派生 `onCustomEditor:<viewType>`，扩展不必手写、也无权干涉别人的派生。 | 【本机实读】`media-preview` 的 `activationEvents` 为空而 `customEditors` 齐全；【本机实读】`vscode.d.ts:11758-11760` |
| R10 | **撞车交给声明的优先级 + 用户选择**：`priority: default | option | builtin`，多个都能开同一文件时由用户选，不是谁先跑谁赢。 | 【官方文档】Custom Editor API · Contribution point；【本机实读】三份内置扩展 manifest |
| R11 | **禁止跨扩展操作 UI——这是**设计决定**，不是能力不足**：没有 DOM 访问、不许注入自定样式。 | 【官方文档】Extension Capabilities · Restrictions「**No DOM Access**」「**No custom style sheets**」 |
| R12 | **理由也是现成的**：类名/结构与 DOM 属「**内部实现，我们随时会改**」，所以不能把它们变成跨方契约。 | 【官方文档】同名章节「These are not documented as **we consider them internal**」 |
| R13 | **每个扩展只能在自己那块地里画**：webview 内部随你写 HTML/CSS/JS，但只能通过 message 与宿主说话。 | 【官方文档】Webview API「Think of a webview as an `iframe` within VS Code **that your extension controls**」；Custom Editor API |
| R14 | **一个模型、多个视图，状态在模型层共享**：拆编辑器时共享同一个 `TextDocument`/`CustomDocument`，视图各自持有自己的 UI 状态（如缩放）。 | 【官方文档】Custom Editor API「a single `TextDocument` … but there are now two webviews」 |
| R15 | **别把「能」当「该」**：webview/iframe 资源贵，能用原生就用原生（对 PrivHub 的直接含义：**office 预览这类重组件应当「只在需要时挂载」**）。 | 【官方文档】Webview API · Should I use a webview? |

---

## 6. 等价设计：所有权 + 契约

### 6.1 所有权归属（明确到人）

**`.v3-content` 及其全部子节点，归 `privhub-files-explorer-v3` 所有**——理由：它是 `panel` 插槽的提供者（`plugins/privhub-files-explorer-v3/client/manifest.json:6` 声明 `panel`；骨架在 `frontend/index.html:1064` 渲染它），内容区的模板就在它的 `panel.js:402`。**所有者只有一个，就是它。**

三条铁律：

1. **只有所有者可以「增删 `.v3-content` 的子节点」。**
2. **其它插件只能通过「宿主发给它的挂载点」工作**——挂载点是宿主**新建的一个 `div`**，插件在里面爱怎么折腾都行；**插件的任何节点不得成为 `.v3-content` 的直接子节点**。
3. **插件的 CSS 不得声称拥有 `.v3-content`**——`:has()` 这类「按别人的后代反查布局」的写法一律视为越权（本次 bug 的放大器就是它）。

> 这三条等于把「VS Code 的 Extension Host 边界」缩小规模搬到浏览器里——**没有进程隔离可用，就用「挂载点 + 命名契约 + 校验」来当边界。**

### 6.2 契约形状：走「宿主注册表」而不是新 manifest 字段

**为什么不用 manifest 新字段【实体+推断】**
- `manifest.json` 由 `privhub-shell/server/index.ts:55` 扫描，**只检查 `id` 与 `slots` 数组**，其余字段被忽略；加 `viewers` 字段需要同时改服务端扫描逻辑与前端消费逻辑。
- `frontend/index.html:839` 真正装配的是 `mod.default.slots`，**manifest 的 `slots` 数组本身不驱动挂载**（`08-连线契约.md:143` 已记）。再加一个「写了不一定生效」的声明字段，是在**已经踩过的坑**上再挖一锹。
- `window.PrivHub.manifests` 在 `frontend/index.html:832`、`:894` **会被整体替换**，而插件侧拿到的可能是**旧引用**（`08-连线契约.md:292-294`）。**让能力清单依赖一个会被整体替换的引用，等于给未来埋雷。**

**为什么走宿主注册表**
- **不新增 manifest 字段**、不改服务端扫描、不动骨架的路由/图标栏/布局 ⇒ **不触碰硬约束 1、2、4**。
- 插件**在自己目录里自包含地声明**（声明代码写在 `client/index.js` 里），仍满足硬约束 3。
- 装配时机明确：骨架 `import(p.entry)` 之后组件还没挂载，**组件 `mounted()` 时注册**即可——**注册与卸载都在插件自己的生命周期里**，插件被删目录后自然不再注册（**零残留**，与交底 §3 的卸载语义一致）。

**契约的具体形状（建议正式定义）**

```js
// —— 宿主提供（explorer-v3 在 client/index.js 挂载时建立，只此一份）——
window.PrivHub.viewers = {
  // 注册：返回一个「注销函数」，插件必须在 beforeUnmount 里调用它
  register({
    id,                 // 必填，全局唯一，惯例用插件 id，如 'privhub-files-office2'
    exts,               // 必填，扩展名数组（小写、带点），如 ['.docx', '.xlsx']
    priority = 100,     // 可选，数字大的先试；同分时先注册的先试（显式定序，不给文件系统顺序留后门）
    mount,              // 必填，(hostEl, ctx) => cleanup | void
                        //   hostEl：宿主新建的挂载点 div（插件只能动这棵子树）
                        //   ctx：{ project, path, name, key, ext }
                        //   cleanup：卸载时调用（移除监听、断开 observer、清定时器）
    unmount,            // 可选，(hostEl) => void，兜底清理
  }),
  // 注销：manifest id 被卸载/组件 beforeUnmount 时调用
  unregister(id),
  // 宿主内部用：问「这个扩展名谁能开」
  resolve(ext),         // => 最高优先级的注册项 | null
}
```

**宿主侧的挂载流程（`panel.js` 内容区内部）**

```
1. 内容区渲染条件不变（panel.js:401）。
2. 宿主在 .v3-content 内部、.v3-md/.v3-text 之后，放一个稳定锚点：
     <div class="v3-viewer-host" data-viewer="none"></div>       ← 永远是同一个位置
3. store.content 变成 ready、且 activeTab 变化时：
     const v = window.PrivHub.viewers.resolve(ext)                ← 按扩展名问
     if (v) {
       host.replaceChildren()                                     ← 先把上次的收干净
       const cleanup = v.mount(host, { project, path, name, key, ext })
       host.dataset.viewer = v.id
       host.dataset.cleanup = ...                                 ← 存起来
     } else if (host.dataset.viewer !== 'none') {
       // 上一个 viewer 下班：先 unmount/cleanup，再清空，再把 data-viewer 归位
       unmountPrev(host); host.replaceChildren(); host.dataset.viewer = 'none'
     }
4. 内容区整体被销毁时（panel.js:401 变假），宿主一并卸载当前 viewer。
5. 宿主自己的 md / text / image / pdf 渲染分支一律不动（它们本来就是宿主亲儿子）。
```

**谁负责什么（一句话版）**

| 角色 | 职责 |
|---|---|
| **宿主（explorer-v3）** | 决定「现在该谁上场」；**建挂载点、挂载、卸载、清空**；保证同一时刻只有一个 viewer 活着；保证切走就把上一个收干净 |
| **插件（如 office2）** | **只声明**「我能开 `.docx` / `.xlsx`」；实现 `mount`，**只在发给它的 `hostEl` 里建自己的 iframe**；实现 `cleanup`；**一行都不许碰 `.v3-content` 本身或别人的节点** |

**office2 迁移后长什么样（示意，示意不是代码改动承诺）**

```js
// 现状：document.querySelector('.v3-content').prepend(frame) + 隐藏别人的 .v3-md
// 迁移后：
const stop = window.PrivHub.viewers.register({
  id: 'privhub-files-office2',
  exts: ['.docx', '.xlsx'],
  priority: 200,
  mount(host, ctx) {
    const frame = document.createElement('iframe')
    frame.className = 'office2-frame'
    frame.src = '/privhub-plugins/privhub-files-office2/view.html?project=' + ...
    host.appendChild(frame)            // ← 只往宿主给的地里放
    return () => { frame.remove() }    // ← 卸载时自己收
  },
})
// beforeUnmount: stop()
```

**CSS 随之收敛**：office2 不再写 `.v3-content:has(…)`，改为在**自己的挂载点里**定义尺寸：

```css
.v3-viewer-host[data-viewer="privhub-files-office2"] { flex:1 1 auto; min-height:0; display:flex; }
.v3-viewer-host[data-viewer="privhub-files-office2"] iframe.office2-frame { flex:1 1 auto; min-height:0; width:100%; border:none; }
```

——这一处改动同时消掉了**双向耦合**：宿主不必再为 office 特判，office 也不必再认 `.v3-content`。

---

## 7. 两步走

### 第一步：最小 bug 修（今天就能做，安全、可单独验收）

**目标只有一个**：**残留消失**。不做所有权重构，不碰其它插件。

**改哪个文件**：`plugins/privhub-files-explorer-v3/client/panel.js`（**所有者自己**，不新增跨插件耦合）。
**怎么改**：在所有者里加一处「交接清理」——内容区**换内容/换标签时，先清掉非本模板注入的残留节点**。

```
在 PanelV3.methods 里加一个方法（示意）：
  clearInjected() {
    const el = this.$el && this.$el.querySelector ? this.$el.querySelector('.v3-content') : null
    if (!el) return
    el.querySelectorAll('[data-v3-injected]').forEach((n) => n.remove())
  }

在 watch 里挂上（与 panel.js:74-80 同一处风格）：
  'store.activeKey'() { this.$nextTick(() => this.clearInjected()) }
  'store.content'(n, o) { if (n && o && n.key !== o.key) this.$nextTick(() => this.clearInjected()) }

配套：office2 造 iframe 时给它加一个标记属性
  frame.dataset.v3Injected = 'privhub-files-office2'     // 替代「靠类名认人」
```

两处细节，都不能省：

1. **必须用 `data-v3-injected` 这种「归属标记」，不能再靠 `.office2-frame` 这个类名认人。** 类名认人 = 硬约束 5 里点名的「用 DOM 类名操作别的插件的界面」；标记属性则是**显式契约**：谁注入谁打标记，宿主认标记不认实现。
2. **`clearInjected()` 必须在「新内容渲染之前」跑到**——用 `$nextTick` 挂在 `activeKey` / `content` 变化上；否则会出现「清掉又立刻渲染」的顺序倒挂。

**同时（可选但建议）改 office2 一处**：`office2/client/index.js:39` 的 `if (!REPLACE_EXTS.includes(ext)) return` 前面加一句自我收尾——扩展名不在清单时，**把自己上一篇留下的 frame 摘掉**。这样即便将来又有人绕过 `data-v3-injected` 约定，office2 也不会再攒残留。

**影响面（第一步）**

| 项 | 判断 |
|---|---|
| 触动的文件 | `explorer-v3/client/panel.js`（+1 方法、+2 watch，约 12 行）；`office2/client/index.js`（+1 属性 / +1 清理分支，约 4 行） |
| 触动的插件数 | **2 个**（其中 1 个是所有者自己） |
| 会不会动布局 | **不会**。不新增/删除任何可见元素，只在切换瞬间清掉异物 |
| 会不会动图标栏/路由/插槽 | **不会** |
| 会不会动无打包链 | **不会**（纯前端文件，刷新即生效） |
| 与现有测试的关系 | ⚠️ **会撞一条既有断言**：`tests/personal-ui.mjs:338` 断言 `ok(/content\.prepend\(frame\)/.test(o2Src), 'office2 以 prepend 插入 iframe（不再依赖已删除的锚点）')`。若第一步改成 `host.appendChild(frame)`，**这条必须同步改成新契约的断言**（例如「office2 不再往 `.v3-content` 直接插入」+「office2 给自己注入的节点打了归属标记」）。**改测试属于代码改动，需主子点头** |
| 回退方式 | 只需还原本文件的两处小改（无数据变更、无迁移、无持久化残留）。`git checkout -- privhub/plugins/privhub-files-explorer-v3/client/panel.js` 即可 |

**第一步收益 / 代价**：收益＝**残留当场消失**（含 2.3 第 4 步那条「切回来的旧画面」也会因为不复用旧节点而消失）；代价＝**没有解决「谁有权动内容区」这个根**，第二个注入者出现时同样的病会再犯一次。

### 第二步：结构契约（所有权 + 声明式 viewer）

**做什么**：按第 6 节的形状，把内容区改成「**宿主当老板，插件递名片**」。

**四家现有注入者的迁移路径**

| 顺序 | 插件 | 现状 | 迁移后 | 为什么排这个位置 |
|---|---|---|---|---|
| **①** | **`privhub-files-explorer-v3`（宿主）** | 只有 `div.v3-content` 与几个渲染分支，**没有挂载点、没有注册表** | 加 `window.PrivHub.viewers`（register/unregister/resolve）＋ 在 `.v3-content` 里加 `.v3-viewer-host` 稳定锚点 ＋ 内容切换时的「问—挂—卸」流程 | **先立规矩**。宿主不改，后面三家无处可去 |
| **②** | **`privhub-files-office2`** | 往 `.v3-content` prepend iframe、隐藏别人的 `.v3-md`、注入 `.v3-content:has()` 的 CSS | 改成 `viewers.register({ exts:['.docx','.xlsx'], mount(host){ 在 host 里放 iframe }, cleanup(){ 摘 iframe } })`；CSS 从 `.v3-content:has()` 收敛到 `.v3-viewer-host[data-viewer=…]` | **最痛的那个先上**：它是唯一「只进不出」的注入者，也是本次 bug 的当事人。**它一动，根就治了** |
| **③** | **`privhub-files-edit-md`** | `querySelector('.v3-content')` 判存在 → `teleport to=".v3-content"` → 藏 `.v3-md/.v3-text` → `md:interrupt` 时清 `.md-inline-root` | 两步：**(3a)** 宿主 CSS 里 `.v3-content:has(.md-inline-root)` 四行（`styles.js:28,52,53,54`）改成认**宿主自己**的状态类（如 `.v3-content.v3-content--editor`），由宿主在「编辑态开启/关闭」时切；**(3b)** `teleport` 目标从 `.v3-content` 换成 `.v3-viewer-host` 或宿主提供的编辑器舱位；`:229/:307` 的 `querySelector('.v3-content')` 换成「宿主通过 bus 告知是否可内嵌」 | **改它要连带动宿主 CSS**（`08-连线契约.md` R9/R10 就是这条），所以排在 office2 之后、且必须分 3a/3b 两步 |
| **④** | **`privhub-files-comments`** | `document.querySelector('.v3-content .v3-md')` + 在别人节点上挂 `MutationObserver`（`:119-123`） | 保持「渲染锚点」这个职责不变，但 **①锚点根从 `querySelector('.v3-content .v3-md')` 改成宿主随 `v3:md-rendered` 一起给出的节点引用；②`MutationObserver` 换成宿主事件**（宿主在 `.v3-md` 重建后主动通知，避免 observer 盯整棵子树） | **最后动**。它依赖「宿主渲染出 `.v3-md`」这件事实，而 3a 会改 `.v3-content` 的布局类。**放在最后，等 ①~③ 稳定** |

**迁移顺序的依赖关系（谁牵动谁）**

```
① 宿主（注册表 + 挂载点 + 交接流程）
      └─> ② office2（最大受益者；改完 = bug 根除）
              └─> ③ edit-md（3a 改宿主 CSS ⇒ 牵动 explorer-v3/styles.js；3b 改 teleport 目标）
                      └─> ④ comments（依赖 ③ 之后的 .v3-md 生成时机）
```

**必须同时改的地方（漏一处就静默坏）**

| 改动 | 连带位置 | 依据 |
|---|---|---|
| 宿主加挂载点 | `panel.js:402` 内容区模板、`styles.js:26-28`（`.v3-content` 布局）、`:52-54`（`:has(.md-inline-root)` 四行） | 本节 ③ |
| edit-md 改 teleport 目标 | `edit-md/client/index.js:465`（`to=".v3-content"`）、`:229`、`:307` | `08-连线契约.md:407` |
| office2 换契约 | `office2/client/index.js:41/44/50/51/53/60` 与 CSS `:20-22` | 本节 ② |
| comments 换锚点来源 | `comments/client/index.js:112`、`:119-123` | `08-连线契约.md:408` |
| 事件契约 | `v3:md-rendered`（`content.js:40`、`:86`）的 payload 若加字段，两个监听方（`comments:230`、`office2:69`）必须同步 | `08-连线契约.md:325` |
| **静态校验** | `tests/personal-ui.mjs:306-342` 那段「内容区顶栏/锚点」断言需要整体改写为新契约的断言 | 第 9 节 |
| 文档 | `CHANGELOG.md` + 版本号递增 + 项目说明（硬约束 8） | 交底 §6-8 |

**影响面（第二步）**：**4 个插件 + 1 个测试文件 + 骨架不动**（`frontend/index.html` **完全不用改**，因为不新增插槽）。
**回退方式**：第二步天然可以按 ①→④ 分批上；每批都是「宿主先兼容旧路径、再切新路径」的双轨过渡（例如宿主同时支持「注册表 viewer」与「旧的 prepend 注入」），**任何一批出问题都能单独还原该批的两个文件**。

---

## 8. 与 8 条硬约束的冲突与折中

> 逐条过。**写不动的就说写不动。**

| # | 硬约束（交底 §6） | 本方案是否冲突 | 折中 / 说明 |
|---|---|---|---|
| 1 | **功能入口必须保持在左侧图标栏，不改交互布局** | **不冲突** | 全程不新增/移动图标，不新增插槽（`frontend/index.html` 一字不改）；office 预览仍由「点文件」触发，与今天完全一致 |
| 2 | **无打包链是特性** | **不冲突** | 只改 `client/*.js` 与 `client/*.css`（内联 style 串），刷新即生效；不引入任何构建步骤 |
| 3 | **每个插件前端必须完全在自己的目录内** | **不冲突，且强化** | 注册表代码在宿主目录、声明与实现都在各插件自己目录；卸载 = 删目录，注册自然消失（`beforeUnmount` → `unregister`），比今天的「监听器消失但 DOM 残留」更干净 |
| 4 | **前端保持一个主界面；骨架只做容器与总线** | **轻微张力** | 把「内容区注册表」放在 **explorer-v3 插件里**（而不是骨架 `index.html`），正是为了守住这条——**但这也意味着一份新的公共契约由某个 L3 插件提供**。折中：把它定义为「`panel` 插槽提供者的附带职责」，并在文档里写明——**若将来出现第二个内容区提供者，这条得改**（写不动的部分：浏览器里没有 VS Code 的 Extension Host 边界，任何一个插件都能 `document.querySelector` 到别人的容器，**只能靠契约与校验，不能靠隔离**） |
| 5 | **禁止插件用 DOM 类名操作别的插件的界面** | **本方案正是在修它，但第一步只修一半**【必须写明】 | 第一步的 `clearInjected()` 仍是「宿主按 `[data-v3-injected]` 清别人的节点」——**用归属标记替换了类名**，比现状好，但**离「完全不动别人的节点」还差得远**（现实中总得有人负责清场）。第二步才真正把「建/挂/卸」都收归宿主。**这是刻意的两步：先止血、后正骨** |
| 6 | **右侧详情面板里硬编码按钮是有意为之，不要当缺陷提** | **不涉及** | 本方案完全不碰 `detail.js` |
| 7 | **测试/示例数据保持原样** | **有直接冲突**【必须写明】 | `tests/personal-ui.mjs:338` 明确断言 `content.prepend(frame)`。**第一步只要动了 office2 的注入方式，这条断言必然失败**。折中：**把该断言改写为「新契约断言」并附说明**（这属于代码/测试改动，需主子点头）；**若主子要求「不许动测试」，那第一步就只能做「宿主侧清场」（只改 `panel.js`）**，即：office2 保持原样、宿主按 `[data-v3-injected]` 清——但那样 office2 就得先学会打标记，**又回到改插件**。⇒ **结论：第一步无论如何都要动 office2 一处，或者接受「宿主按类名认人」这一临时妥协**。这一条我判不了哪个更合主子意，请主子拍板 |
| 8 | **写 CHANGELOG + 递增版本号 + 人工确认后提交推送** | **不冲突** | 本文件只是方案；真正施工时按此条走。**本次我未做任何提交/推送/stash** |

**另外两条与本方案相关的既有约束（不是 8 条里的，但会撞）**
- `08-连线契约.md:143`「manifest 的 `slots` 数组本身不驱动挂载」⇒ 本方案**没有**新增 manifest 字段，避开了这个坑。
- `tests/preview-limits.mjs` 与 `tests/frontend-templates.mjs` 用「在 Node 里跑前端模块 / 编译 Vue 模板」的方式做断言 ⇒ **第二步的契约改动应当补进这两类静态套件的口径里**，而不是指望浏览器测试。

---

## 9. 验收方法

> **前提【必须记住】**：**仓库里没有任何浏览器测试**。`tests/run-all.mjs` 跑的是 HTTP 套件 +「在 Node 里 import 前端模块 / 编译 Vue 模板」的静态套件（`tests/preview-limits.mjs:230` 自陈「这条链路在浏览器里…本测试不开浏览器」）。所以验收必须**人手步骤为主、静态断言为辅**。

### 9.1 人可照做的验证步骤（15 分钟，不需要看代码）

**准备**：一个项目里准备 4 个文件 —— `A.docx`、`B.xlsx`、`C.md`、`D.png`。

| # | 步骤 | 观察什么 | 修好前的症状 |
|---|---|---|---|
| 1 | 打开 `A.docx`，等它显示完整 | 内容区铺满 docx | 正常 |
| 2 | **不关标签**，直接打开 `C.md` | 内容区应**直接**是 md 正文；**任何时刻都不应该先出现 docx 画面** | ❌ 先看到 docx 铺满 → 才变 md |
| 3 | 反复在 `A.docx` ↔ `C.md` 之间点标签切换 5 次 | 每次都是「目标文件」，无一次例外 | ❌ 交替出现旧 docx |
| 4 | 打开 `B.xlsx`，再打开 `D.png` | 图片应居中、尺寸正常、`padding` 正常 | ❌ 图片被拉伸/边距丢失（`:has()` 残留导致） |
| 5 | 打开 `A.docx` 后**切到左侧目录里另一个文件夹**，再回到文件列表 | 文件列表排版正常、无异常留白 | ❌ 内容区仍带 office 布局 |
| 6 | **在控制台跑**：`document.querySelectorAll('.v3-content > iframe.office2-frame').length` | **任何非 docx 文件下都必须是 `0`** | ❌ 返回 `1`（残留实锤） |
| 7 | **在控制台跑**：`document.querySelector('.v3-content').className` 与 `getComputedStyle(document.querySelector('.v3-content')).display` | 非 docx 时应为块级、有 `padding` | ❌ 是 `flex` 且 `padding:0` |
| 8 | 断网后重复步骤 2 | 也不该出现 docx 画面（因为残留与网络无关） | ❌ 网络慢时更明显（第 1 步 `loading` 帧更长） |

**第 6、7 步是最硬的判据**——它们直接对着「有没有残留节点 / 布局有没有被劫持」，**不依赖手感**。

### 9.2 可自动化的部分（不需要浏览器）

| # | 断言（建议加进静态套件） | 为什么能自动 |
|---|---|---|
| A1 | **只有 `explorer-v3/client/panel.js` 里允许出现 `.v3-content` 的 `querySelector`** —— 全仓扫 `plugins/*/client/**`，命中其它插件即失败 | 纯文本检索【实证可行】 |
| A2 | **任何往内容区注入的节点必须打 `data-v3-injected` 标记** —— 扫 `createElement` + 插入调用，或（更实际）反向断言「没有 `content.prepend(` / `.v3-content` 直接 `appendChild`」 | 纯文本检索 |
| A3 | **插件 CSS 不得出现 `.v3-content:has(`** —— 扫 `plugins/*/client/*.js` 的 style 串 | 纯文本检索 |
| A4 | **宿主必须存在交接清理** —— 断言 `panel.js` 里有 `clearInjected`（或等价函数）且被 `watch` 调用 | 纯文本/模板断言 |
| A5 | **改写 `tests/personal-ui.mjs:338`** 的旧断言（`content.prepend(frame)`）为新契约断言 | 现成文件 |
| A6 | **契约文档化**：把 `window.PrivHub.viewers` 加进 `08-连线契约.md` 第 3 节的键表（含「谁提供 / 谁消费 / 卸载语义」） | 文档，人审 |
| A7 | **迁移期双轨检查**：宿主同时支持旧注入时，断言「新路径优先、旧路径仍可用」，避免半渡期白屏 | 模板断言 |

**⚠️ 不能自动化的那一块**：**「闪烁」本身是浏览器的绘制时序现象**，Node 里既没有 iframe 也没有合成层。A1~A5 只能证明「不该在的节点不在、代码结构对了」，**证明不了「用户眼睛看不到闪」**。这一块只能靠 9.1 的手工步骤。

---

## 10. 我判不了的

**必须原样保留，不许含糊：**

1. **我没有浏览器，无法实测「闪烁」，也无法实测修复后的手感。**
   本文件中所有关于「先说一句」的时序描述（`v3:md-rendered` 与 Vue patch 的先后、iframe 导航期间保留旧画面的行为）都是**基于代码顺序的【推断】**，我**没有在真实浏览器里用 Performance/绘制录制复现过**。第 2.3 节的四步链条，逻辑上自洽、且与用户实测现象吻合，但**它不是录像证据**。
2. **我无法实测「修好之后还闪不闪」。** 第一步与第二步的验收都写成「人手步骤」正是因为这个。
3. **我没有 docx/xlsx 样本、没有跑起来的 office 服务**，所以 `office2/client/view.html` 那一侧（iframe 内部）的表现我一概没验。
4. **本机没有 Microsoft 原版 VS Code。** 第 4 节的【本机实读】读的是 `D:\Program Files\Trae CN\resources\app\` 下的 **VS Code 1.107.1 同源资源**（`product.json` 的 `vscodeVersion` = 1.107.1）。**同一份 `vscode.d.ts` 契约与同一套 `contributes` 机制，但发行版不是原版**；原版可能在某些细节（尤其是内置扩展的自定义版本）上不同。引用之处我已逐条标真实路径。
5. **`media-preview/dist/extension.js` 是压缩产物，我只摘了 `registerCustomEditorProvider` 那一段**，没有通读。摘出的那行（`webviewOptions: { retainContextWhenHidden: true }`）可信，但**不能据此断言图片预览的全部行为**。
6. **硬约束 7（测试保持原样）与第一步之间存在真实冲突**（见第 8 节）。**是要「改测试断言」还是「接受宿主按类名认人」，我判不了，请主子拍板。**
7. **第二步的优先级数字怎么定、同一扩展名多家声明时谁赢**，本方案给了「priority + 先注册先试」的形状，**但具体数值需要主子最终定**——这属于产品决策，不是技术决策。
8. **`edit-md` 的 `teleport` 目标换成挂载点后，内嵌编辑器的滚动/焦点行为会不会变**，我无法验证（`edit-md/client/index.js:276-279` 有 `nextTick` 后 focus + `syncScroll()`，换宿主可能影响它）。**这一条建议在第二步 3b 之前，先做一次只在浏览器里的人工验证。**

---

## 附：本文实际打开过的文件清单（供复核）

**PrivHub 侧（只读）**
- `docs/reviews/_交底-Cordis插件项目基础情况.md`（全 183 行）
- `docs/reviews/08-连线契约.md`（第 1–434 行，含 R9/R10 与 §3.3/§5.3）
- `plugins/privhub-files-office2/client/index.js`（全 80 行）
- `plugins/privhub-files-explorer-v3/client/panel.js`（全 620 行）
- `plugins/privhub-files-explorer-v3/client/content.js`（全 173 行）
- `plugins/privhub-files-explorer-v3/client/store.js`（全 27 行）
- `plugins/privhub-files-explorer-v3/client/tabs.js`（grep 命中行）
- `plugins/privhub-files-explorer-v3/client/styles.js`（第 1–70 行）
- `plugins/privhub-files-edit-md/client/index.js`（第 200–379、428–472 行）
- `plugins/privhub-files-comments/client/index.js`（第 40–189 行 + grep）
- `tests/personal-ui.mjs`（第 296–348 行）+ `grep` 全仓 `.v3-content|office2-frame|v3-md|v3-text`
- `grep` 全仓 `document.querySelector|createElement|prepend|appendChild|remove()|style.display`

**VS Code 侧（只读；Trae CN 内置的 VS Code 1.107.1 资源）**
- `D:\Program Files\Trae CN\resources\app\package.json`、`product.json`（字段子集）
- `D:\Program Files\Trae CN\resources\app\extensions\{markdown-language-features,media-preview,ms-vscode.vscode-js-profile-table,simple-browser,git-base,ipynb}\package.json`
- `D:\Program Files\Trae CN\resources\app\extensions\media-preview\dist\extension.js`（仅 `registerCustomEditorProvider` 一段）
- `D:\Program Files\Trae CN\resources\app\out\vscode-dts\vscode.d.ts`（第 9990–10189、10265–10394、11752–11801 行 + 全文件 `Select-String` 索引）

**官方文档（web）**
- [Custom Editor API](https://code.visualstudio.com/api/extension-guides/custom-editors)
- [Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- [Extension Capabilities Overview · Restrictions](https://code.visualstudio.com/api/extension-capabilities/overview)
- [Contribution Points](https://code.visualstudio.com/api/references/contribution-points)

**未打开（明确说明）**：`plugins/privhub-files-office2/client/view.html` / `view.js`（iframe 内部，本次与 bug 机制无关）；`vscode.d.ts` 全文（21164 行，只读了上列区间）；任何 VS Code 安装目录以外的系统文件。
