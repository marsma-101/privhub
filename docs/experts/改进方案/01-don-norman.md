# PrivHub 前端交互与功能审阅 · Don Norman 视角

> 审阅对象：PrivHub（私域枢纽）v3.1.0，`privhub/frontend/index.html` + `privhub/plugins/*/client/*`
> 审阅基线：`docs/experts/_交底-PrivHub前端与功能现状.md`（2026-09-17）
> 方法：只读回源码。全文每个结论均挂 `文件:行号`。
> 免责：我不是诺曼本人，我是基于他公开著作与言论提炼的视角。他会犯错，我这个版本也会，而且我可能错得比他更早。这次我**没有把这个软件跑起来、没有截图、没有真实使用者**——所以下面凡是"看起来"的地方，就是"看起来"。

---

## 1. 一句话判断

**这个界面的问题不是"太多了"，是"每一块都自成一个世界，而世界之间没有路"。**

12 个图标、4 个面板、21 个已挂载的界面 slot、3 个全局浮层，单看每一块都还像样——图标栏有悬停提示（`frontend/index.html:213-217`）、空目录给了上传按钮（`explorer-v3/client/panel.js:446-451`）、权限弹窗知道告诉普通用户"请联系管理员"（`panel.js:541`）、管理控制台甚至有得体的分组（`admin-console/client/routes.js:18-23`）。这些都对。

但它们拼不成一件事。打开一个文件，目录列表整块消失（`panel.js:401` 与 `:422` 是两个互斥的 `<template>`），而且**界面上没有任何"回到目录"的入口**；改个文件名被拒绝，输入框已经先关了，你打的字没了，错误只活 2.6 秒；把一个文件命名成 `.合同` 能成功，然后它从列表里消失（`privhub-core/src/index.ts:701`）——系统接受了你的操作，然后假装它不存在。

我不打算说"这界面太复杂"。它服务的任务本来就复杂：50 个插件目录、多项目、多层目录、批量操作、多标签、Office 预览、加密落盘。**要消灭的是困惑，不是复杂度。** 而这里正好相反：复杂度被保留下来了，可理解性被削减掉了——功能按"一个插件一块面板"摊开，而没有按"人要做的那件连续的事"接起来。诺曼 2005 年那句批评，原封不动地落在这个界面上：

> "The methods of HCD seem centered around static understanding of each set of controls, each screen on an electronic display. But as a result, the **sequential operations** of activities are often ill-supported."

一句话：**它是一个启动器（launcher），不是一张工作台（workbench）。** 而启动器的问题是——用户必须自己记住每件东西在哪，还要记住自己刚才在哪。

---

## 2. 我实际看过的证据

### 2.1 我亲自打开过的文件（本报告所有结论都基于这些）

| 文件 | 行数 | 我读的范围 |
|---|---|---|
| `privhub/frontend/index.html` | 1130 | **全文** |
| `privhub/plugins/privhub-files-explorer-v3/client/panel.js` | 617 | **全文** |
| `privhub/plugins/privhub-files-explorer-v3/client/ops.js` | 351 | **全文** |
| `privhub/plugins/privhub-files-explorer-v3/client/tabs.js` | 105 | **全文** |
| `privhub/plugins/privhub-files-explorer-v3/client/utils.js` | 33 | **全文** |
| `privhub/plugins/privhub-files-explorer-v3/client/content.js` | 124 | **全文** |
| `privhub/plugins/privhub-files-explorer-v3/client/tree.js` | 150 | **全文** |
| `privhub/plugins/privhub-files-explorer-v3/client/detail.js` | 206 | **全文** |
| `privhub/plugins/privhub-files-explorer-v3/client/styles.js` | 100 | **全文** |
| `privhub/plugins/privhub-files-explorer-v3/client/fontzoom.js` | 34 | **全文** |
| `privhub/plugins/privhub-files-explorer-v3/client/deps.js` | 13 | **全文** |
| `privhub/plugins/privhub-files-explorer-v3/client/manifest.json` | 10 | **全文** |
| `privhub/plugins/privhub-shell/client/index.js` | 167 | **全文** |
| `privhub/plugins/privhub-shell/client/manifest.json` | — | **全文** |
| `privhub/plugins/privhub-shell/server/index.ts` | 112 | 全文（含 manifest 聚合与分级返回） |
| `privhub/plugins/privhub-shell-recent/client/index.js` | 77 | **全文** |
| `privhub/plugins/privhub-shell-recent/src/index.ts` | 115 | 1-58 + grep |
| `privhub/plugins/privhub-shell-favorites/client/index.js` | 103 | **全文** |
| `privhub/plugins/privhub-shell-settings/client/index.js` | 156 | **全文** |
| `privhub/plugins/privhub-trash-ui/client/index.js` | 97 | 1-60 + grep |
| `privhub/plugins/privhub-files-upload/client/index.js` | 177 | 40-169 + grep |
| `privhub/plugins/privhub-files-upload-queue/client/index.js` | 99 | **全文** |
| `privhub/plugins/privhub-files-search/client/index.js` | 151 | 1-115 |
| `privhub/plugins/privhub-admin-console/client/confirm.js` | 62 | **全文** |
| `privhub/plugins/privhub-admin-console/client/toast.js` | 41 | **全文** |
| `privhub/plugins/privhub-admin-console/client/sidebar.js` | 64 | **全文** |
| `privhub/plugins/privhub-admin-console/client/routes.js` | 143 | **全文** |
| `privhub/plugins/privhub-admin-console/client/action.js` | 112 | **全文** |
| `privhub/plugins/privhub-core/src/index.ts` | 959 | 470-629、694-711、750-839 逐行 + 全文 grep |
| `privhub/plugins/privhub-files/src/index.ts` | 249 | 105-144 + 全文 grep |
| `privhub/plugins/privhub-files-fulltext/src/index.ts` | — | grep（点开头过滤、`.agents` 排除） |
| `privhub/plugins/privhub-svc-search/src/index.ts` | 251 | 108-137 + grep |

（另：`privhub/plugins/*/client/manifest.json` 共 15 份含 `barItems`，逐份用文本匹配读出原文；用 PowerShell 逐目录枚举核对了 `readdir` 的实际顺序。这些**不在"我读过全文"之列**，只读了 `barItems` 数组与 `id/title/icon/slots`。）

**并行只读勘察**：另起 2 个只读 subagent 做交叉核验。第一个（重命名/错误路径/确认框/撤销/上传失败/批量/选中态/键盘点/空状态，共 A~J 十节）的结论我已逐条回源码抽查（`ops.js:87`、`core/index.ts:701`、`core/index.ts:802-806`、`files/src/index.ts:186`、`panel.js:238`、`upload-queue/client/index.js:31-44` 均已亲自复核）。第二个（入口组织与导航）在我初稿落笔后才返回，带回**三处修正**我已回源码确认并写进本报告：图标栏实为 **10+2=12 项**（我初稿漏了 🔌）、管理组首项因 `readdir` 顺序实际显示为「👥 用户管理」而非注释所称的「管理控制台」、以及**项目与目录完全不入 URL（F5 会丢位置）**。凡我未亲自看过的，均已标注"未核实"。

### 2.2 图标栏的真实构成（我实测汇总）

由 `privhub-shell/client/index.js:75-83` 的两条过滤规则 + 各插件 `client/manifest.json` 的 `barItems` 实测得出：

| 位置 | 图标 | 提示文字 | 点击行为 | 来源 |
|---|---|---|---|---|
| 上 | 📁 | 文件 | 回文件视图 / 重开当前项目 | `explorer-v3/client/manifest.json:8` |
| 上 | 🔍 | 搜索 | `activeView='search'` | `files-search/client/manifest.json:8` |
| 上 | 🗑️ | 回收站 | `activeView='trash'` + 角标 | `trash-ui/client/manifest.json:8` |
| 上 | ⭐ | 收藏 | `activeView='favorites'` | `shell-favorites/client/manifest.json:8` |
| 上 | 🏷️ | 标签 | `activeView='tags'` | `files-tags/client/manifest.json:8` |
| 上 | 📝 | 新建文档 | `activeView='template'` | `files-template/client/manifest.json:8` |
| 上 | 🕸️ | 知识图谱 | `activeView='kg'` | `files-kg/client/manifest.json:8` |
| 上 | 📚 | 知识库 | `activeView='wiki'` | `files-wiki/client/manifest.json:8` |
| 上 | 🤖 | AI 工具 | `activeView='rag'` | `svc-rag/client/manifest.json:8` |
| 上 | 🔌 | 智能体接入 | `activeView='agent'` | `shell-agent-console/client/manifest.json:8` |
| 下 | 👥 | **用户管理** | `activeView='admin'`（不 toggle） | 图标与文字取自 `privhub-admin/client/manifest.json:8`；装配在 `shell/client/index.js:81-82` |
| 下 | ⚙ | 设置 | `activeView='settings'`（toggle） | `shell-settings/client/manifest.json:8` |

**上 10 项 + 下 2 项 = 12 项（管理员），普通用户 11 项**（`adminOnly` 项被 `frontend/index.html:742` 过滤）。分割规则是硬编码的白名单 `new Set(['settings','admin','acl','audit'])` 加一个只放 `['admin','settings']` 的顺序数组（`privhub-shell/client/index.js:76-82`）。

**分隔线画了两条**：`.abar-bottom`（带 `border-top`，`frontend/index.html:220`）被挂在**每一个**下部项上（`privhub-shell/client/index.js:113`），所以 2 个下部项各画一条上边框。

**一个由枚举顺序造成的意符错配**：下部第一项用 `.find()` 取"第一个 view 为 admin 的条目"（`privhub-shell/client/index.js:81-82`），而同时声明 `view:'admin'` 的有两个插件——`privhub-admin`（👥 用户管理）和 `privhub-admin-console`（🛠️ 管理控制台）。`readdir` 先枚举到 `privhub-admin`，所以**图标栏上显示的是「👥 用户管理」，点开却是管理控制台**；紧跟其上的注释写着"只保留『管理控制台』一个入口"（`privhub-shell/client/index.js:79`），与代码实际取到的条目不一致。这不是显示 bug，是**标签与结果不符**——用户按"用户管理"点的，得到的是个控制台。

**顺序来源**：`privhub-shell/server/index.ts:48` 的 `readdir(pluginsDir)`——**文件系统枚举顺序**，不是任何人为排序。在 NTFS 上它恰好接近字母序；换台机器、换个文件系统（ext4 的 readdir 是 inode 序）就可能变。**这是我把"位置"当作意符时最担心的一件事：用户学会的是位置，而位置没有被任何人承诺过。**

### 2.3 后端到底怎么拒绝一个文件名（这是整份报告的支点）

```
privhub/plugins/privhub-core/src/index.ts:801-806
  isValidName(name) {
    return name !== '' && name !== '.' && name !== '..'
      && !name.includes('/') && !name.includes('\\') && !name.includes(':') && !name.includes('*')
      && !name.includes('?') && !name.includes('"') && !name.includes('<') && !name.includes('>') && !name.includes('|')
  }
```

- **不拦**：首字符为点、尾随空格、尾随点、**任何长度**。
- **报错塌缩**：非法名与重名，在后端是同一个 `false`；到前端是同一句话。
  - `privhub/plugins/privhub-core/src/index.ts:795`（非法名 → `false`）、`:797`（重名 → `false`）
  - `privhub/plugins/privhub-files/src/index.ts:186` → `{ ok:false, error:'重命名失败' }`
  - 同上 `:158` `'新建失败'`、`:172` `'删除失败'`、`:220` `'移动失败'`
  - 全仓唯一能区分的相邻语义是移动的 `'目标目录已存在同名项'`（`files/src/index.ts:213`）和上传的 `'文件名无效'`（`:112`）
- **前端动手前没有任何提示**：行内重命名输入框只有 `v-model`（`panel.js:476-484`、`tree.js:51-58`），骨架内联模态只有 `placeholder="输入后回车确认"`（`frontend/index.html:1101-1106`）。全仓唯一做了实时名字校验的是**另一个插件**：`privhub-files-template/client/index.js:287` 的 `名称不能包含 \ / : * ? " < > | 字符`。

### 2.4 世界里的知识 vs 头脑里的知识（这是我看得最重的一节）

我把界面上"能操作的东西"逐个过了一遍，问两个问题：**(a) 它能做什么？(b) 用户怎么知道它能做什么？**

| 能操作的东西 | 它是什么 | 用户怎么知道 | 位置 |
|---|---|---|---|
| 文件行 ⋯ | 打开操作菜单 | **只在该行 hover 时才可见**（`visibility:hidden` → `:hover` 才 `visible`） | `styles.js:71-72`、`panel.js:491` |
| 目录树节点 ⋯ | 同上 | 同上 | `styles.js:16-17`、`tree.js:66` |
| 行本身 | **单击即打开标签**，不是选中 | 无任何提示；`@click` 与 `@dblclick` 绑同一个函数 | `panel.js:466-467`、`:163-167` |
| 长按一行 | 呼出同一个菜单 | **只在首次进入时提示一次**，之后永不再提示 | `panel.js:322-327` |
| 双击一个文件夹 | 展开/收起树 | 无提示（单击是"进入"） | `tree.js:34-36` |
| 图标栏 12 项（管理员）/ 11 项（普通用户） | 各自切换一个视图 | 悬停时**两种提示同时上**：CSS 自绘气泡（`frontend/index.html:213-217` 的 `::after` + `attr(title)`，有 0.15s 过渡）**以及**浏览器原生 `title` 提示（`privhub-shell/client/index.js:105,115`，延迟约 1–2 秒）——先出深色气泡，再叠一个系统黄框 | `privhub-shell/client/index.js:101-119` |
| 图标栏"文件"，在已打开标签时 | **它是唯一的"回到目录列表"出口** | 无任何提示 | `frontend/index.html:753` |
| 右侧详情面板 10 个按钮 | 点得动的 6 个 / 点不动的 4 个 | **点不动的长得像"置灰"**，真规则藏在悬停提示里 | `detail.js:189-198`、`styles.js:93-98` |
| 右上"打开侧栏/收起侧栏" | 控制**右侧**详情面板 | 字面说"侧栏"，但左侧那个侧栏由左栏的 `⏴` 控制 | `privhub-shell/client/index.js:63`、`tree.js:119` |

最后一行是我这次看到的最小的、也最典型的一个意符错误：**同一个词"侧栏"被用来指两个不同的东西，而两个开关在屏幕的两端**。

### 2.5 两个鸿沟的实际位置

**执行鸿沟（想做，找不到路）**
- 详情面板的 4 个按钮（批注评论/生成页面/发布链接/版本历史）**永远显示**，不可用时只是 `opacity:.55` + `cursor:not-allowed`，而真实条件（`.md` / `.html` / 文本类）只在 `title` 里（`detail.js:194-197`）。鼠标悬停 1–2 秒后才知道规则。
- 批量移动的目标目录是**手打路径**的文本框（`panel.js:211` 文案"移动到哪个目录？（相对当前项目根，留空 = 项目根）"），而单项移动给的是一个**目录树选择器**（`ops.js:133-155` + `panel.js:554-576`）。同一件事，两套完全不同的操作方式。
- 占位符说"留空 = 项目根"，但 `submitPrompt()` 里 `if (!value) return`（`panel.js:238`）——**留空什么都不会发生**。这是文案与行为直接相反。

**评估鸿沟（做了，不知道发生了什么）**
- 重命名失败：**输入框先关，再发请求**（`ops.js:87` 在 `:90` 之前），失败后只剩 2.6 秒的 toast（`frontend/index.html:399`），你打的字全丢。见 3.1。
- 打开文件后：目录列表整块被内容替换（`panel.js:401` / `:422` 互斥分支），面包屑、批量工具栏、"共 N 个文件"全在另一支里（`panel.js:423-443`）。屏幕上没有任何东西告诉你"怎么回去"。
- 标签超过 30 个：`store.tabs.splice(0, store.tabs.length - 30)`（`tabs.js:57`）**静默淘汰最早的标签**，无提示、无补回入口。
- 视图切换：从文件视图切到"设置/回收站/搜索"后，**左栏整块消失**（`frontend/index.html:1009` 的 `v-if="nav.activeView === 'files' && ..."`）、**右侧详情消失**（`:1079`）。唯一还在说话的是图标栏的高亮（`privhub-shell/client/index.js:104`），以及各视图自己写在 `main-head` 里的一行标题（如 `trash-ui/client/index.js:54`、`files-search/client/index.js:101`）。
- **刷新丢失位置**：全仓没有 `pushState` / `popstate`（唯一用到 URL 状态的是管理控制台的 `#/admin/<key>`，`admin-console/client/action.js:22-41,67`），项目与目录**完全不进 URL**。`nav.project` 初值是 `null`（`frontend/index.html:426`），启动流程里也没有任何从 URL 恢复位置的代码（`:902-906` 只做 `/api/me`，`:941-942` 只拉项目列表与回收站）。所以**按 F5 之后回到欢迎页**——你刚才在哪个项目、哪个目录，界面上不留痕迹。标签页更微妙：它确实被持久化了（sessionStorage，`tabs.js:11-38`），但恢复逻辑里有一条"未选项目则不恢复"（`tabs.js:30`），而刷新后 `nav.project` 恰恰是空的（`frontend/index.html:426`）——所以**标签也没能回来**。存了、写对了、读的时候被条件挡掉了：位置信息就这样在两层之间被吃掉。

### 2.6 撤与恢复（我的必查项）

- **全仓没有"撤销上一步"**。grep `undo` 只命中的是"撤销发布链接/撤销邀请/吊销密钥"，与文件操作无关。
- 删除之后：只弹一句 toast（`ops.js:179-180`），**toast 组件没有操作按钮**（`frontend/index.html:388-400` 只创建文本 div）。想恢复只能自己点图标栏 🗑️ 进回收站视图，再从列表里找回那一行点"↩ 恢复"（`trash-ui/client/index.js:80` → `frontend/index.html:651-661`）。
- **确认框是这里唯一的防线，而且有 28 处**（活跃插件 26 处 + 骨架 4 个调用点）。全部是浏览器原生 `confirm()`：不可换行样式、不可样式化、长得像系统警告、且**没有一处区分"可逆"与"不可逆"**。
  - 可逆的：`'《X》将移入回收站，30 天后自动清除，可在回收站恢复。确定删除？'`（`ops.js:175`）
  - **不可逆的**：`'彻底删除「X」？此操作不可恢复！'`（`frontend/index.html:663`）、`'清理在回收站中超过 30 天的条目（物理删除，不可恢复）？'`（`:670`）、`'确认吊销密钥「X」？…此操作不可撤销。'`（`shell-agent-console/client/index.js:110`）
  - 这三句里唯一可靠地表达"不可逆"的手段是**中文感叹号和"不可恢复"四个字**。用户点掉它们的速度，和点掉上面那句"可在回收站恢复"的速度是完全一样的。
- 管理控制台**已经写对了**一套：`admin-console/client/confirm.js` 是一个 Promise 式确认服务，支持 `danger` 样式，还支持高风险操作**要求逐字输入关键词**才能确认（`confirm.js:23-24`、`ui.js:124`）。但它只被调用了 2 次（`panels.js:284-289`、`:404-408`），explorer-v3 **完全没有引用它**。

### 2.7 一个我原以为是缺陷、核实后不是的

`frontend/index.html:876` 仍在渲染已退役的 `tabs` slot（全仓 0 个 manifest 声明它）。我按交底 E8 去核实，看到骨架实际用的是 `slotComps['tabs']`（`:1029`，由 `explorer-v3` 提供），`:876` 是**死的 v-else-if 分支**——无害，但会让下一位读者以为"标签页是骨架的功能"。**不算问题，算债务。**

---

## 3. 改进建议（P0 / P1 / P2，按投入产出比排序）

排序依据：**修一条要动几处 × 用户一天会撞几次 × 撞上之后的损失是否可逆。**

---

### P0-1 · 重命名失败 = 输入框先关、你打的字全丢、错误只说"重命名失败"

**【问题】** 这正是我 2014 年写《Error Messages Are Evil》的那个案例，一字不差地重演了。当时的原话是：

> "How am I supposed to know your secrets? And even if I did do it wrong by your obscure standards, **why did you discard my work? Why not let me fix it?**"

现在的行为是四重失败叠加：
1. **规则不前置**——哪些字符不能用，界面上一个字都没写（`panel.js:476-484`）。
2. **先关再判**——`store.renameState = null` 在 `await api(...)` 之前（`ops.js:87` vs `:90`），失败时输入框已经销毁。
3. **输入不可恢复**——值只存在于将被置空的 `store.renameState.value`，没有任何地方留副本。
4. **消息无信息且稍纵即逝**——后端把"非法字符"和"重名"塌缩成同一句话（`files/src/index.ts:186`），前端原样转成一闪而过的 toast（`ops.js:104`）。

**【证据】**
- `privhub/plugins/privhub-files-explorer-v3/client/ops.js:83-105`（尤其 `:87` 先置空、`:88` 静默 return、`:104` 只有 toast）
- `privhub/plugins/privhub-files-explorer-v3/client/panel.js:475-485`（行内输入框，无校验无提示）
- `privhub/plugins/privhub-files-explorer-v3/client/tree.js:50-58`（树节点同一函数）
- 新建文件夹同一缺陷：`ops.js:275-296`（`store.promptState = null` 在 `:283`，API 调用在 `:286`）与 `ops.js:305-316`（骨架模态版，同样先关）
- `privhub/frontend/index.html:804-810`（骨架内联模态也是先 `inputState = null` 再回调）、`:1096-1113`（模态模板）
- `privhub/plugins/privhub-core/src/index.ts:795,797`（两种失败不可区分）
- `privhub/plugins/privhub-files/src/index.ts:182,186`
- `privhub/frontend/index.html:388-400`（toast 无按钮、2.6 秒）

**【一条好消息】** 这块的改动面比我以为的小：骨架里那套 `doRename` / `submitMkdir`（`frontend/index.html:584-602`）**已经没有任何活跃调用方**——v3 用的是自己那份实现（`ops.js:83,305`），骨架那套只剩已退役的 v2 explorer 在调（`_retired-v2/privhub-files-explorer/client/index.js:132,242`）。实际要改的是 **v3 的 2 个提交函数 + 2 个输入框模板**，骨架那套顺手删掉即可（少一条以后一定会分叉的平行实现）。

**【改法】**（三条，按顺序做，每条独立可交付）
1. **前置规则**：在重命名输入框与新建文件夹模态下方常驻一行灰色小字，照抄全仓唯一做对的那个实现的文案——`名称不能包含 \ / : * ? " < > | 字符`（`privhub-files-template/client/index.js:287`），并加即时校验：输入含非法字符时，把输入框描边改 `--danger`、禁用"确定"、行内显示原因。
2. **失败不关框**：`renameState` 不在提交前置空，而是等 `r.ok` 后再清；失败时保持输入框打开、把 `r.error` 显示在输入框正下方（一行红字）、**保留用户已输入的全部文本并全选**，让用户直接改。
3. **后端把理由说清**：`isValidName` 通过返回 `{ok, reason}` 或拆成 `isValidName` + 显式 reason 分支，让 `rename` 至少能返回三种可区分的原因：`名称包含不允许的字符（\ / : * ? " < > |）` / `已存在同名条目` / `名称不能为空或仅由点组成`。这是**改一个函数、三处调用**的事。

**【验收】**
- 新建一个文件夹，输入 `a*b`：输入框不关闭、下方出现"名称不能包含 \ / : * ? " < > | 字符"、已输入内容仍在且被选中。
- 把它改成 `已存在的名字`（同目录确实存在）：出现"已存在同名条目"，而不是"重命名失败"。
- 把 `a*b` 改成 `ab` 回车：成功，toast 显示"已重命名为「ab」"。
- 全程不需要重新右键、不需要重新打字。

**【成本】** 中（1 个后端函数 + 3 处调用点 + 3 处前端输入框；不动布局、不动插件边界）。

---

### P0-2 · 打开一个文件，目录列表整块消失，而且没有"回去"的路

**【问题】** 这是我这次看到的最严重的一个**死路**。`panel.js` 的内容区是两个互斥分支：有激活标签 → 显示文件内容；没有 → 显示目录列表与操作栏。**单击一行文件就直接开标签**（`@click="onEntryClick"`，而 `onEntryClick` 对文件就是 `openTab`），所以——

- 用户只是想"点一下看看"，整个目录列表没了；
- 面包屑、"共 N 个文件"、全选/下载所选/移动所选/删除所选**全在被替换掉的那一支里**（`panel.js:423-443`）；
- 屏幕上**没有任何一个元素**说"怎么回到目录"。唯一能回去的办法有三个，一个都没提示：
  1. 点图标栏的 📁"文件"（`frontend/index.html:753`）
  2. ⋯ 菜单里的"关闭全部标签"（`panel.js:393` → `:147-153`）
  3. 在左栏目录树里点**另一个**目录——点当前目录无效，因为 `nav.path` 值没变、Vue 的 watcher 不触发（`panel.js:78-80`）

用户学到的会是什么？"点文件会把东西弄不见。" 这是评估鸿沟的教科书形态。

**【证据】**
- `privhub/plugins/privhub-files-explorer-v3/client/panel.js:401` 与 `:422`（两个互斥 `<template>`）
- `privhub/plugins/privhub-files-explorer-v3/client/panel.js:163-167`（单击=打开、双击=同一个函数）
- `privhub/plugins/privhub-files-explorer-v3/client/panel.js:78-80`（只有 `nav.path` **变更**时才回到列表）
- `privhub/plugins/privhub-files-explorer-v3/client/panel.js:423-443`（被隐藏的那一整条操作栏）
- `privhub/frontend/index.html:753`（📁 的唯一"回到列表"语义，且无提示）
- `privhub/plugins/privhub-files-explorer-v3/client/panel.js:147-153`（关闭全部标签）

**【改法】**（与既定约束 1 不冲突：图标栏不动、布局不动，只加一条"退路"）
1. **内容区顶部常驻一条窄面包屑栏**：`📁 项目 / 子目录 / 文件名`，其中最右一段可点 = "回到该目录的列表"。它复用 `panel.js:41-47` 已有的 `crumbs` 计算属性，不新增状态。
2. **给内容视图挂一个"← 返回目录"按钮**，放在标签行右侧操作区（`v3-tabops`，`panel.js:379-397`），与既有的"ℹ️ 详情""⋯"同排。
3. **Esc 加一条**：内容视图下按 Esc = 回到目录列表（现有 Esc 只做"功能视图→文件视图"，`frontend/index.html:965-967`；`ops.js:18-24` 的 Esc 只管重命名与菜单）。

**【验收】**
- 打开任意一个 .md 文件后，屏幕顶部能看见当前目录路径，且**一眼就能看到一个"返回"控件**。
- 点它 → 回到目录列表，标签仍然保留在标签行上，再点标签能回到内容。
- 按 Esc → 同样回到目录列表。
- 关闭最后一个标签 → 仍然回到目录列表（保持现有行为，`panel.js:93-95`）。

**【成本】** 小（改 1 个文件，加 1 条面包屑 + 1 个按钮 + 1 条 Esc 分支；不动骨架、不动插件契约）。

---

### P0-3 · 命名成 `.合同` 能成功，然后它从列表里消失

**【问题】** 这是一个**系统接受了你的操作，然后假装它不存在**的缺陷——典型的"机器以自己的秘密规则为中心"。`isValidName` 不拦首字符为点（`core/index.ts:802-806`），而列表接口把 `.` 开头的条目静默过滤掉（`core/index.ts:701`，注释说明这是为防 junction/symlink 穿越）。

后果：用户新建文件夹时手滑打了 `.归档` → 提示"文件夹「.归档」已创建"（`ops.js:311`）→ **列表里没有它，树里也没有它，搜索也搜不到**。在用户的世界里，这个文件夹被创建成功了、然后被吞了。而 Windows 上"点开头"恰好是一个真实存在的习惯（隐藏文件夹）。

再往下追一层，我发现了比"这个文件看不见"更糟的事：**搜索遍历是从这份已经过滤过的列表里递归的**。文件名搜索的 `walk()` 拿到的 entries 来自 `listFiles`（`svc-search/src/index.ts:118-128`），而它早就被砍掉了点开头的条目——所以**项目里任何一个点开头的目录，它下面的整棵子树都是搜索盲区**。也就是说，一旦你（或别人）建出一个 `.某目录`，那不是"里面某个文件搜不到"，是"那个文件夹里的一切都不再存在"。
（一个细节：`svc-search/src/index.ts:120` 还额外写了一句 `skipHidden` 判断——那层防御是多余的，因为上游早就滤干净了。**防御写在了错误的地方**，这正是"同一条规则散落在多层"的典型代价。）
另需说明：`data-files/` 根下那些点开头的目录（如 `.trash`、`.agents`）是**被设计成不可见的**（`allProjects` 在 `core/index.ts:602` 排除点开头，`.agents` 个人空间另有"不进索引"的显式规则），那是有意为之，我不视为缺陷。**本条针对的是"用户可创建、但创建后不可见"的那一类。**

**【证据】**
- `privhub/plugins/privhub-core/src/index.ts:801-806`（不拦首字符点、不拦尾随空格/点、无长度上限）
- `privhub/plugins/privhub-core/src/index.ts:701`（`if (e.name.startsWith('.') || e.isSymbolicLink()) return null`）
- `privhub/plugins/privhub-core/src/index.ts:788`（mkdir 只判重名不判点开头）、`:797`（rename 同）
- `privhub/plugins/privhub-files-explorer-v3/client/ops.js:309-314`（成功后直接 toast"已创建"，不校验可见性）
- `privhub/plugins/privhub-svc-search/src/index.ts:118-128`（搜索按 `listFiles` 的结果递归）
- `privhub/plugins/privhub-files-fulltext/src/index.ts:69`（全文索引另有独立的 `startsWith('.')` 过滤）、`:93`（`.agents` 空间明确不入索引）

**【改法】**（低风险优先，二选一，我推荐先做 ①）
1. **拦在门口**：把 `isValidName` 收紧为「不允许首字符为 `.`」，并在前端 P0-1 那行提示里一并写明「名称不能以点开头」。代价：历史上若已存在此类条目（我**未核实**是否存在），会变成不可重命名——所以需要一条"检测到旧条目时仍允许改回合法名"的例外。
2. **让它可见**：`listFiles` 放行 `.` 开头的条目，只拦符号链接；前端给这类条目加一个"隐藏文件"小标记。语义更正确，但涉及索引、搜索、回收站等一串下游，成本大。

**【验收】**
- 新建文件夹输入 `.测试`：不成功，并明确告知"名称不能以点开头"。
- 输入 `新建 文件夹 `（尾随空格）或 `报告.`（尾随点）：要么同样前置拦下，要么创建成功且列表里**确实能看见**它。
- 无论走哪条路径，都不存在"提示成功但列表里找不到"的状态。

**【成本】** 小（若选 ①：1 个函数 + 前端一行提示；②为中）。

---

### P0-4 · 左栏目录树：空文件夹展开后是一片空白，没有任何出口

**【问题】** 主内容区的空目录做得很好——有图标、有解释、有"⬆ 上传文件"和"📁 新建文件夹"两个按钮（`panel.js:446-451`）。**左栏的树却没有空态**：`rootExpanded` 为真就直接渲染 children，空数组就是一片空白（`tree.js:141-143`），而且 `treecache.js` 连 loading 标志都没有（`treecache.js:15-28`）。用户看到的是"这个文件夹好像坏了"，而不是"这个文件夹是空的，你可以往里放东西"。

**【证据】**
- `privhub/plugins/privhub-files-explorer-v3/client/tree.js:141-143`
- `privhub/plugins/privhub-files-explorer-v3/client/treecache.js`（`loadTree` 无 loading 态）
- 对照（做得对的）：`privhub/plugins/privhub-files-explorer-v3/client/panel.js:446-451`

**【改法】** 在树里为空时插入一行灰色小字「（空文件夹）」，并给一个可点的「＋ 新建子文件夹」——后者已经有现成实现（`store.promptState` + `doMkdirHere`，`ops.js:275-296`）。

**【验收】** 展开一个空文件夹：出现「（空文件夹）」与一个可点的新建入口；点它 → 弹出新建框 → 创建后树里立刻出现新节点。

**【成本】** 小（1 个文件、约 8 行模板）。

---

### P0-5 · 按一下 F5，你刚才在哪儿就没了

**【问题】** 项目和目录**完全不进 URL**：全仓没有 `pushState`、没有 `popstate`（唯一用 URL 状态的是管理控制台的 `#/admin/<key>`）。`nav.project` 初值是 `null`（`frontend/index.html:426`），启动流程里也没有任何"从地址栏恢复位置"的代码。于是 F5 之后回到欢迎页。

标签页没能救回来，虽然它差一点就救回来了：标签**确实**写了 sessionStorage（`tabs.js:14-16`），恢复函数也在面板挂载时被调用了（`panel.js:330`）——但恢复逻辑里有一条"未选项目则不恢复任何标签"（`tabs.js:30`），而刷新后 `nav.project` 恰好是 `null`。**信息存了、写对了，读的时候被一个条件挡掉。** 用户感受到的是"刷新一下，一切归零"。

我不打算把这个算成"缺一个路由框架"——那是大工程。这里有一条便宜得多的路：**你已经在为标签做会话级持久化了，把"当前项目 + 当前目录"一起存了就行**，恢复时先恢复目录、再恢复标签，顺序反过来就不会互相挡。

**【证据】**
- `privhub/frontend/index.html:425-440`（`nav` 全部是内存 reactive）、`:426`（`project: null`）
- `privhub/frontend/index.html:891-945`（启动流程，`:902-906` 只做 `/api/me`，`:941-942` 只拉项目/回收站，无位置恢复）
- `privhub/plugins/privhub-admin-console/client/action.js:22-41,67`（唯一用 URL 状态的地方）
- `privhub/plugins/privhub-files-explorer-v3/client/tabs.js:14-38`（持久化 + `:30` 那条挡掉恢复的条件）
- `privhub/plugins/privhub-files-explorer-v3/client/panel.js:330`（恢复调用点）

**【改法】** 会话级"上次位置"：
1. 在 `nav.openDir()` 成功后把 `{project, path}` 写进 sessionStorage（`frontend/index.html:477-493`，一行）。
2. 在启动流程里，登录态恢复之后读它，若项目仍在 `projectsList` 里就 `nav.openProject(project)` 再 `nav.openDir(project, path)`（`frontend/index.html:940-945`）。
3. 顺序放在 `restoreTabs()` 之前，让 `tabs.js:30` 那个条件不再挡掉恢复。

**【验收】** 进到 `项目A / 合同 / 2026`，打开一个文件，按 F5：仍然停在 `项目A / 合同 / 2026`，标签行上的文件还在，右栏详情指向同一个文件。

**【成本】** 小（骨架 1 处写入 + 启动 3 行；不动插件、不动 URL 方案）。

---

### P1-1 · 28 处原生 `confirm()`，且"可逆"与"不可逆"长得一模一样

**【问题】** 确认框在这个界面里是**唯一**的错误防线，却分两种实现、28 处调用，而且没有一处表达"这个能不能撤回"：
- 可逆的一句：`《X》将移入回收站，30 天后自动清除，可在回收站恢复`（`ops.js:175`）
- **真不可逆的三句**：彻底删除（`frontend/index.html:663`）、清理 30 天前（`:670`）、吊销密钥（`shell-agent-console/client/index.js:110`）

它们用的是**同一个浏览器原生弹窗样式**。用户对确认框的心理反应是肌肉记忆式的"点确定"——这正是确认弹窗作为通用安全策略失效的原因。**能撤回的用确认框是浪费，不能撤回的用普通确认框是危险。**

项目管理控制台**已经有一个正确的实现**（`admin-console/client/confirm.js`，Promise 式，支持 `danger` 与"逐字输入关键词"确认），却只用了 2 次，explorer-v3 一次都没用。

**【证据】**
- 可逆：`privhub/plugins/privhub-files-explorer-v3/client/ops.js:175`、`panel.js:298`
- 不可逆：`privhub/frontend/index.html:663`、`:670`、`privhub/plugins/privhub-shell-agent-console/client/index.js:110`、`:141`、`privhub/plugins/privhub-svc-rag/client/index.js:301`
- 已具备正确设施：`privhub/plugins/privhub-admin-console/client/confirm.js:23-24,37-51`、`ui.js:124`（逐字输入确认）、`panels.js:284-289`
- 删除后无撤销：`privhub/plugins/privhub-files-explorer-v3/client/ops.js:179-180`、toast 无按钮 `privhub/frontend/index.html:388-400`

**【改法】**（三步走，先做最省的）
1. **给 toast 加一个可选操作按钮**（骨架 `toast(msg, type, action)`，`frontend/index.html:388-400`）。删除成功后不再弹确认框、直接删、然后给一条带「↩ 撤销」的 toast，调已有的 `/api/trash-restore`（`frontend/index.html:651-661` 已有实现）。**这一步就把"删除"从"必须确认"降级为"可撤回"，符合我的主张：宁可 undo，不要 confirm。**
2. **统一危险确认组件**：把这套 `confirmAction` 从 `admin-console` 提升到骨架（或复制一份到骨架，遵守约束 3 的"插件前端完全在自己的目录内"，不要让 explorer 去 import admin-console 的文件）。explorer 的 6 处 + 骨架的 4 处先迁移。
3. **按可逆性分档**：可逆 → 不做确认（只 undo）；不可逆 → 用 `danger` 样式 + 把"不可恢复"从文案升级为**需要一次额外动作**（勾选框或逐字输入，设施已存在）。

**【验收】**
- 删除一个文件：**不再弹确认框**，删除后 5 秒内出现带「↩ 撤销」的提示，点它能恢复。
- 执行"彻底删除"：出现的是 HTML 确认框（非系统弹窗），`danger` 红色，且必须勾选"我确认此操作不可恢复"才能点确定。
- 吊销密钥：同样走 HTML 危险确认，而非系统弹窗。

**【成本】** 中（1 个骨架服务 + 迁移约 10 处调用点；其余 16 处可分批）。

---

### P1-2 · `viewMode` / `defaultView` 是一套没人读的设置（而设置面板里还看不到它）

**【问题】** 这是"看起来能操作、其实不能"的典型，而且它藏得比较深：
- 骨架里 `viewMode` 只被**写**过 2 次，**没有任何人读**（`setViewMode` 是死的，`nav.viewMode` 无消费方）。
- 后端 `settings.defaultView` 存在并有校验（`shell-settings/src/index.ts:23,36,84`），骨架登录时会把它读进 `nav.viewMode`（`frontend/index.html:933`）——**读进来以后没人用**。
- 而设置面板的界面上**根本没有这项**（`shell-settings/client/index.js:116-138` 只有主题与上传限制）。
- v3 主界面只剩表格视图一种（`panel.js:453-493`），卡片/网格只在骨架的 CSS 里留着（`frontend/index.html:144-153`）和被替代的 v2 里用（`_retired-v2/.../index.js:320-333`）。

顺带：`privhub/frontend/index.html:876` 那个已退役的 `tabs` slot 分支，会让读者误以为标签页是骨架功能。

**【证据】**
- `privhub/frontend/index.html:443`、`:553`、`:933`（三处 `viewMode`，无消费方）
- `privhub/plugins/privhub-shell-settings/src/index.ts:23,36,84`（后端字段存在）
- `privhub/plugins/privhub-shell-settings/client/index.js:116-138`（设置面板无此项）
- `privhub/plugins/privhub-files-explorer-v3/client/panel.js:453-493`（只有表格视图）
- `privhub/frontend/index.html:876`（退役分支）

**【改法】** 二选一，别停在中间：
- **A（推荐，小）**：删掉 `setViewMode`、`viewMode` 与骨架 `:933` 的读取，后端字段保留不动（避免动数据），并在 `shell-settings` 的说明里不再承诺"默认视图"。
- **B（中）**：真的做——把 v2 的 `▦/☰` 切换按钮移植进 v3 面板头部，并让 `defaultView` 真正生效。

**【验收】** 选 A：全仓 grep `viewMode` 为零命中（除历史文档）。选 B：在设置里选"网格"，新开一个项目，主区是卡片视图；再手动切到列表，刷新后保持列表。

**【成本】** 小（A）/ 中（B）。

---

### P1-3 · "最近打开"只记录目录，不记录文件

**【问题】** 顶栏的「🕘 最近」是长任务里唯一"接着上次继续"的入口，但它的数据源是 `bus.on('file:opened')`（`shell-recent/client/index.js:46`），而这个事件**只在 `nav.openDir()` 里发出**（`frontend/index.html:492`），且 payload 是 `{project, path}`——`path` 是**目录路径**。真正打开文件走的是 `openTab`（`tabs.js:41-65`）或 `nav.openEntry`，**不经过这条事件**。于是"最近打开"退化成"最近浏览过的目录"，而功能名与文档都写着文件。

**【证据】**
- `privhub/frontend/index.html:492`（唯一 emit 点，payload 是目录）
- `privhub/plugins/privhub-shell-recent/client/index.js:45-51`（按目录记，名字取 path 末段）
- `privhub/plugins/privhub-shell-recent/src/index.ts:23-29`（类型支持 `isDir:false`，即服务端本可收文件）
- `privhub/plugins/privhub-files-explorer-v3/client/tabs.js:41-65`（真正的文件打开路径，无任何记录调用）

**注意时序**：`bus.emit` 是同步的，而 `openDir` 是 async（`frontend/index.html:477`、`:492`），`openProject` 在 await 之后会再触发一次——所以记录到的其实是**导航结束后的位置**。这不影响上面的结论，但值得知道。

**【改法】** 在 `openTab()` 里追加一次记录（复用同一总线事件名，payload 带 `isDir:false` 与文件路径），让"最近"里真的出现文件；顺手把目录项与文件项在视觉上分开。同时让"最近"的点击落到与收藏一致的定位逻辑上（`tabs.js:47` 已有"已打开则直接激活"）。

**【验收】** 在文件视图里打开 `报告.md` → 打开「🕘 最近」→ 列表首条是 `报告.md`（而不是它所在的目录）→ 点它回到该文件。

**【成本】** 小（1 处 emit + 1 处消费）。

---

### P1-4 · 标签页 30 个上限：静默淘汰、无提示、且与"关掉就能回到列表"冲突

**【问题】** `store.tabs.splice(0, store.tabs.length - 30)`（`tabs.js:57`）——第 31 个标签打开时，**第 1 个标签无声消失**。用户可能正在对照两个文件，回头发现第一个不见了。没有提示、没有"标签已满"的说明、也没有办法找回（除非重新打开）。

**【证据】**
- `privhub/plugins/privhub-files-explorer-v3/client/tabs.js:57`
- `privhub/plugins/privhub-files-explorer-v3/client/tabs.js:11-38`（sessionStorage 持久化，刷新后恢复，但被淘汰的已无法恢复）
- `privhub/frontend/index.html:876`（退役的 tabs slot 分支，见 P1-2）

**【改法】** 最小改法：在淘汰发生的那一次弹一条 warn toast——「标签已达上限 30，最早的「X」已关闭」；更好的改法是**不淘汰**，改为横向滚动（标签行已经是 `overflow-x:auto`，`styles.js:19`）。

**【验收】** 开到第 31 个标签：出现明确提示（或没有任何标签消失，标签行可横向滚动）。

**【成本】** 小。

---

### P1-5 · 键盘用户进不了主流程（不是"没快捷键"，是"焦点根本到不了"）

**【问题】** 全仓只有 1 处全局 keydown（Esc，`ops.js:18-24`）和骨架 1 处（Esc，`frontend/index.html:965-968`），加上若干输入框上的 Enter。这符合交底 U1。但我要指出一个**比"缺快捷键"更根本**的事实：

**主流程里最关键的那几个元素，键盘根本无法聚焦。** 文件行是 `<div class="file-table-row">`（`panel.js:462-472`），没有 `tabindex`；详情面板的 10 个操作是 `<div class="v3-detail-act">`（`detail.js:188-199`），也不是按钮，且 `.dev` 那条还有 `cursor:not-allowed`（`styles.js:96`）。所以键盘用户不仅没有 F2/Delete，甚至无法**选中一个文件行**，也就无法呼出 ⋯ 菜单——因为 ⋯ 只在 hover 时可见（`styles.js:71-72`）。

骨架其实做对了一部分：`.btn / .icon-btn / .small-btn` 有 `:focus-visible` 描边与最小点击尺寸（`frontend/index.html:337-341`）。缺的是把这条纪律延伸到 explorer 自己造的那批可点元素上。

**【证据】**
- `privhub/plugins/privhub-files-explorer-v3/client/panel.js:462-472`（行无 tabindex）、`:491`（⋯ 在 hover 才出现）
- `privhub/plugins/privhub-files-explorer-v3/client/detail.js:188-199`（div 当按钮）
- `privhub/plugins/privhub-files-explorer-v3/client/styles.js:71-72`、`:93-98`
- 做对的部分：`privhub/frontend/index.html:337-341`
- 全仓键盘点清单：`privhub/plugins/privhub-files-explorer-v3/client/ops.js:18-24`、`frontend/index.html:965-968`、`panel.js:478-479,585`、`tree.js:53-54`（其余为输入框 Enter）

**【改法】**
1. 给 `.file-table-row` 与树节点加 `tabindex="0"` + `:focus-visible` 描边 + Enter=打开 / Delete=删除（Delete 走 P1-1 的"可撤回删除"）。
2. 把详情面板的 `.v3-detail-act` 从 `div` 改成 `button`，不可用时用**真 `disabled`**，并给一条常驻的一行说明（见 P1-6）。
3. ⋯ 在键盘聚焦时也可见（`:focus-within` 与 `:hover` 同权）。
4. 之后才是"骨架级快捷键注册表"（F2/Ctrl+F/Backspace 上级）——那件事交底 U1 与需求文件里已列为"等核心功能完成后统一补充"（`docs/PrivHub-需求文件.md:85`），我同意这个排序。

**【验收】**
- 只用 Tab / Shift+Tab / Enter / Delete 四个键，能从顶栏走到一个具体文件、打开它、删掉它，并撤销删除。
- Tab 到详情面板的按钮时，能看到清晰的焦点描边；Tab 不会停在不可用的按钮上。

**【成本】** 中（explorer 内 2 个文件；不动骨架、不动插件边界）。

---

### P1-6 · 详情面板：10 个按钮永远都显示，规则藏在悬浮提示里

**【问题】** 右侧详情面板对**任何**文件都显示同样的 10 个按钮（`detail.js:188-199`）。其中 4 个是有条件的：批注评论/生成页面（仅 .md）、发布链接（仅 .html）、版本历史（仅文本类）。不可用时它们的表现是 `opacity:.55` + `cursor:not-allowed`，而**真实规则只在 `title` 里**——鼠标停 1–2 秒才看到"仅支持 md 文档"。

更要紧的是：**"开发中"的向量数据库按钮和"这个文件用不上"的按钮长得一模一样**——两者共用 `.dev` 这一个类（`detail.js:192,194-198` 与 `styles.js:96-97`）。同一个视觉信号表达两种完全不同的含义，这在我看来是要立刻改掉的：一个是"还没有"，一个是"这次不行"。

**【证据】**
- `privhub/plugins/privhub-files-explorer-v3/client/detail.js:188-199`（含 `:192` 与 `:198` 都用 `.dev`）
- `privhub/plugins/privhub-files-explorer-v3/client/styles.js:93-98`（`.v3-detail-act.dev { cursor:not-allowed; opacity:.55 }`）
- 约束说明：这批按钮硬编码在 `detail.js` 是**有意的临时代码**（交底约束 6），所以我不主张"迁回各自插件"，只主张改**呈现**。

**【改法】** 拆开这两个含义，并把规则从"世界之外"（悬浮提示）挪到"世界之内"（界面）：
1. 语义上不可用的按钮：**不渲染**（`v-if` 而不是 `.dev`），或渲染但旁边常驻一行小字说明条件（如"批注评论 · 仅 .md"）。
2. 真正"开发中"的：保留角标"开发中"（已有 `.v3-dev-badge`），给它自己的类，不要与"条件不满足"共用。
3. 用**真 `disabled`** 而不是 `cursor:not-allowed` 的 div——前者对键盘与辅助技术是诚实的。

**【验收】** 打开一个 .txt 文件：看不到"生成页面""发布链接"（或它们旁边写着"仅 .md / 仅 .html"），而"向量数据库"仍然带着"开发中"角标，两者一眼可区分。

**【成本】** 小（主要是模板条件 + 一个类名拆分，1 个文件）。

---

### P1-7 · 字体缩放：名字说字体，做的是整页缩放

**【问题】** 顶栏的 `A− / 100% / A+` 提示文字是"页面字体调小/重置/调大"（`fontzoom.js:27-29`），实现是 `document.documentElement.style.zoom = scale`（`fontzoom.js:16`）——**缩放的是整个界面**，不是字体。骨架里还得为它专门补偿高度 `height: calc(100vh / var(--ui-zoom, 1))`（`frontend/index.html:88`），并在拖拽换算里除以 zoom（`:878-879`）。

更值得说的是：**同一个界面里有两套缩放**——顶栏这个（整页）和内容区的 `--v3-preview-font`（仅预览/编辑字号，`panel.js:136-142`、`styles.js:54,57,67`）。用户看到两个"调整大小"的控件，它们做的事完全不同，但没有一个字说明区别。

**【证据】**
- `privhub/plugins/privhub-files-explorer-v3/client/fontzoom.js:14-31`
- `privhub/frontend/index.html:88`、`:878-879`
- `privhub/plugins/privhub-files-explorer-v3/client/panel.js:135-142`、`:384-389`（内容区字号，在 ⋯ 菜单里）

**【改法】** 语义对齐，二选一：
- 把它正名为"界面缩放"（改 title 文字即可，成本近零），并在 ⋯ 菜单的内容区字号旁写清"仅影响正文"；
- 或改成真的只调 `font-size`（`--ui-font` 基准刻度），但那需要先有字号刻度（见 P2-1）。

**【验收】** 顶栏那个控件与 ⋯ 菜单里那个控件，从文字上就能看出分别影响什么，不需要试。

**【成本】** 小（改字）/ 大（真做字号刻度）。

---

### P2-1 · 一批"死路"空状态（逐个都很小，但加起来是"界面在装死"）

**【问题】** 空状态分两种：给出下一步的（好），和什么都不给的（死路）。我抽查了各视图，**死路的占多数**。最典型的是回收站空态——它甚至不告诉用户"你可以离开这里"。相对照，一个"好"的样本就在同一个文件的上方（未选项目时给了"去选择项目 →"按钮）。

**【证据】**
- 死路（只有一行字）：
  - `privhub/plugins/privhub-trash-ui/client/index.js:65`「当前项目回收站是空的」
  - `privhub/plugins/privhub-files-search/client/index.js:122`「没有匹配「q」的内容」（无"清除筛选"）
  - `privhub/plugins/privhub-admin-audit-panel/client/index.js:160`「暂无审计记录」
  - `privhub/plugins/privhub-shell-recent/client/index.js:61`「暂无记录」
  - `privhub/plugins/privhub-files-tags/client/index.js:124,130`
  - `privhub/plugins/privhub-files-upload-queue/client/index.js:85`「队列为空」
- 好样本：`privhub/plugins/privhub-trash-ui/client/index.js:60-64`（带"去选择项目 →"）、`explorer-v3/client/panel.js:446-451`（带两个动作按钮）

**【改法】** 给每条空态加**一个**可点的下一步（清空筛选 / 上传第一个文件 / 返回文件视图 / 打开设置）。不必一次改完，按用户最常撞到的顺序：回收站 → 搜索 → 标签。

**【验收】** 每条空态里至少有一个按钮，点了确实能把用户带到别处。

**【成本】** 小（每条 2–4 行）。

---

### P2-2 · 全局拖拽上传：放入点不可见，且在非文件视图里也生效

**【问题】** `drop` 事件挂在 `document` 上（`files-upload/client/index.js:149-150`），`dragover` 只做 `preventDefault`，**没有任何视觉提示**说"松手会放到哪里"。目标目录取 `nav.project` + `nav.path`（`:111`、`:55`）。而 `nav.path` 在非文件视图里**不会被清零**（切视图只清 `selected/rightOpen/preview`，`frontend/index.html:469`）——所以在"设置"页里把文件拖进来，它会静默上传到你上次浏览的那个目录。

好消息是有一个 `confirm()` 会告诉你目标目录名（`:56`）。坏消息是**拖拽这种动作的心理模型是"直接放下"**，而这里放下之后要先读一段系统弹窗才知道放哪了；而且 `confirm()` 出现在拖拽之后，用户已经在心里认为"放下了"。

**【证据】**
- `privhub/plugins/privhub-files-upload/client/index.js:142-150`、`:52-58`
- `privhub/frontend/index.html:460-470`（`setActiveView` 不清 `path`）
- `privhub/plugins/privhub-files-explorer-v3/client/panel.js:31`（`nav.path` 的消费方）

**【改法】**
1. 监听 `dragenter`，在文件视图上盖一层半透明提示：「⬆ 上传到：项目名 / 当前目录」；非文件视图则显示「拖拽上传仅在文件视图可用」。
2. 非文件视图直接不响应 drop。

**【验收】** 在文件视图里把文件拖到窗口上：放下之前就能看到将上传到哪个目录。在设置页里拖：不会静默上传。

**【成本】** 小（1 个文件，新增一层遮罩 + 一个条件判断）。

---

### P2-3 · 全仓没有一处"我该怎么用这个"——但这件事优先级不高

**【问题】** grep 全仓，没有任何帮助/引导/快捷键表/首次使用流程（唯一的"帮助体系"是 AI 工具插件自己的 ⓘ 浮层，`svc-rag/client/index.js:56,176`）。对一个 50 个插件、18 个界面入口的系统来说，这很高。但**我不把它排在前面**：一个快捷键表帮不了找不到"回到目录"的人（P0-2），也帮不了改名失败的人（P0-1）。**先修路，再印地图。**

**【证据】** `privhub/plugins/privhub-svc-rag/client/index.js:56`（唯一一处）；全仓无 `help|帮助|引导|快捷键` 的其他命中。

**【改法】** 等 P0/P1 落地之后，再补一个常驻的「?」——里面是**一张入口地图**（每个图标做什么、每个视图能做什么）而不是功能清单。设计文档里已经写出过更好的答案：Ctrl+K 启动器（`docs/PrivHub-交互融合方案-整体设计.md:14,121`），那比快捷键表更符合这个系统的体量。

**【验收】** 新用户能在不借助文档的情况下，从界面上找到"如何回到目录""如何撤销删除""如何新建文件夹"三个答案。

**【成本】** 中（待 P0 完成后评估）。

---

### P2-4 · 设计令牌层（视觉一致性）

**【问题】** 交底 2.2 已实测：只有 10 个自定义属性（9 个颜色 + `--ui-zoom`），无间距刻度、无字号刻度、45 个互不相同的离散 px、全站只有 4 处 `box-shadow`。我复核了这条并确认它是对的。

我只补一句判断：**这是"从零建层"，不是"用好已有的层"**。而它现在的实际代价不是"不好看"，是**意符不可靠**——当间距与字号没有刻度时，"这个看起来更重要的东西"就变成了巧合而非承诺。举例：`.sel` 的行高亮用 `rgba(90,130,200,.1)`（`frontend/index.html:163`），树节点用 `rgba(90,130,200,.15)`（`styles.js:14`），标签激活又是另一套（`styles.js:22`）——三处"选中"，三套色值。

**【证据】**
- 交底 2.2（实测数据）+ 我的复核：`privhub/frontend/index.html:14-21`（10 个变量）、`:163`、`privhub/plugins/privhub-files-explorer-v3/client/styles.js:14,22,90`
- 交底 U4：13 处硬编码 `rgba(90,130,200` 残留在插件里

**【改法】** 不主张"补一整套刻度再收敛 45 个值"（那是大工程且影响 32 个插件）。先做**语义收敛**：定义 4 个语义令牌——`--sel-bg`（选中）、`--cur-bg`（当前/激活）、`--mark-bg`（标记/徽章）、`--danger-soft`——把所有"蓝色半透明"按语义归到这四个上。**这一步只改值不改结构，插件可以逐个迁。**

**【验收】** 全仓不再出现裸写的 `rgba(90,130,200,...)`；"选中"和"当前"在视觉上仍可区分，但同族。

**【成本】** 中（改值，牵涉约 20 处；可分插件渐进）。

---

## 4. 我建议不要做的

**4.1 不要引入构建步骤（与既定约束 2 冲突 → 明确作废）**
"统一样式要上 Tailwind / 抽取公共组件要上打包链"这类建议，在这个项目里一律不成立。约束 2 已定案：无打包链是特性（改完刷新即生效）。**如果非要论证**，唯一可能站得住的场景是 `explorer-v3` 那 12 个模块（交底 E2）——但那是**服务端同源 ES module + 浏览器原生 `import()`**（骨架 `frontend/index.html:838` 已经在用），本就不需要打包链。所以：**这条路连"值得论证"都算不上。**

**4.2 不要为了"清净"把图标栏按插件分组 / 收进二级菜单（与既定约束 1 冲突 → 作废）**
约束 1 明示：功能入口必须保持在左侧图标栏、不改交互布局。我完全同意，而且从我的框架看理由更硬：**12 个图标不是"太多"，是"没有被赋予结构"**。收进二级菜单 = 把复杂度从界面转移到用户的记忆里，那是更贵的债（"Simplicity is in the mind, complexity is in the world"）。**要修的是顺序与分组，不是数量。** 顺手可做且不违约束：把 `bottomItems` 的白名单（`privhub-shell/client/index.js:76-82`）从"两个固定名"改成按 barItem 自带的 `order` 字段排序——**顺序只有它是被人承诺过的，位置才配当意符。**

**4.3 不要给列表加"跨目录拖拽移动"**
看着很缺（我确认全仓没有 `draggable`，也没有任何 dragstart），但成本与风险都不划算：文件移动是**有副作用**的操作，而拖拽是一个**没有确认、没有预览、极易 slip** 的输入方式（drop 落到错误的目录里不会报错）。现有的"⋯ → 📦 移动 → 目录树选择器"（`ops.js:133-170` + `panel.js:554-576`）虽然笨，但**它把目标目录显示在屏幕上让人确认**。真要改进，改的是**批量移动那个手打路径的文本框**（`panel.js:211`），把它换成同一个树选择器——**同一件事两套操作方式才是真问题**，而不是缺少拖拽。

**4.4 不要改回"双击打开文件"**
单击即打开（`panel.js:466-467`）在这个界面上其实是有道理的：标签行让"打开"变得廉价且可撤回（✕ 或中键关闭），而单击打开让"翻一批文件"变成连点。**它的问题不是打开方式，而是打开后目录列表整块消失（P0-2）。** 修 P0-2，别动这里。

**4.5 不要为了消除提示而砍掉提示**
图标栏的悬停气泡（`frontend/index.html:213-217`）和每行的 `title` 是当前**唯一**的发现通道。它们不够好（浏览器原生 tooltip 有延迟、不可控样式），但改成"更干净的、没有文字"的图标会更糟。要做的是把关键规则从 tooltip 搬到界面上（P1-6），不是删掉 tooltip。

**4.6 不要让"重命名"这一个动作继续有四种呈现并存**
同一件事现在有四张脸：行内输入框（`panel.js:475-485`）、骨架内联模态（`frontend/index.html:1096-1113`）、面板模态（`panel.js:579-593`）、以及**已经没人调用的骨架 `doRename`**（`frontend/index.html:593-602`，只剩已退役的 v2 在调）。用户每次都得重新判断"这次是按 Enter 还是点确定"。收敛方向是行内重命名——它离对象最近，也最容易实现"失败不关框"（P0-1）。

**4.7 明确不碰的（纪律）**
- **不碰安全（S）与数据可靠性（D）**——用户已明示往后放。
- **不碰 `privhub/` 下任何源码**，本报告是只读产物。
- **不把 `detail.js` 里的按钮硬编码当缺陷报**——交底约束 6 已声明那是有意的临时代码，我按约束处理（只改呈现，不主张迁回插件）。
- **不主张把"输入模态"从骨架抽成插件**（交底悬而未决问题 4）。骨架里 `nav.inputState`（`frontend/index.html:441,581-583,1096-1113`）现在唯一的活跃用户是"新建项目"（`frontend/index.html:677-685`）——因为它属于骨架自己负责的顶栏与欢迎页，抽成插件会让"新建项目"这个基础动作依赖一个可被卸载的东西。**基础能力不该是可插拔的**，所以我的判断是：**不抽。** 至于 P0-1 要收敛的那几处重命名/新建文件夹模态，方向见 4.6（收敛到行内，而不是把骨架模态铺得更大）。

---

## 5. 我判不了的

我把话说全，因为这次的判断有几处是真的边界，而不是客套。

1. **我没跑过它。** 没有截图、没有真实点击、没有真实数据规模。所有"看起来怎样"都来自读代码。具体说，我判不了：千级目录下的实际卡顿（交底 U5 说无虚拟滚动，我没验证过真实体感）、毛玻璃/圆角那类视觉观感（交底 U9）、以及触摸屏/小屏（<640px）下的实际可用性——后者我知道只有一处 hover 气泡的 CSS（`frontend/index.html:213-217`），但**触摸设备上长按菜单是否真的可靠，我完全没依据**。

2. **我把"用户"抽象成了一个人。** 这个系统实际至少有三类人：管理员（管用户/权限/审计/密钥）、普通成员（找文件、改文件、上传）、以及"AI 智能体通过 API 接入"（`files-agent`、`shell-agent-console`）。我的建议主要按**普通成员**写的。管理员那条线我看到的证据反而更好——管理控制台有分组导航（`routes.js:18-23`）、有键盘上下选择（`panels.js:262-267`）、有带打字确认的危险操作（`confirm.js:23-24`）、甚至会给未装载的插件显示"待接入"（`sidebar.js:53`）。**同一套前端里，管理侧的人机工程明显优于文件侧。** 这个落差值得单独研究，但不是我这次的题目。

3. **我判不了"这 12 个图标该按什么分组"。** 我可以说它现在没有模型；但按什么分组才叫"对"，取决于这个团队真实的工作方式——是"按项目归档"还是"按文档类型产出"？是"一个人干完所有事"还是"各管一段"？诺曼的答案在这件事上是硬要求：**必须真的懂那个活动**，否则给出来的分组只是漂亮话。交底第 6 节把这个问题列成了悬而未决，我同意它悬而未决——**我不替它拍板。**

4. **我要坦诚我的框架最大的两个盲区**（这不是谦虚，是使用说明）：
   - **键盘与手势类交互，我的框架天然覆盖不到。** 我本人说过手势是"新的命令行界面"，只能靠标准化。所以 P1-5 我给的是"先把焦点可达性修好"这种结构性建议，而不是一套快捷键方案——**快捷键该设哪些键、该不该有命令面板，我给不出比我引用的那两条原则更好的判断。**
   - **性能与实现的权衡，我这一路没有任何权威依据。** 比如"要不要上虚拟滚动"（交底 U5）、"Office 预览那 10.7 MB 该不该优化"（交底 2.1 已结案），我的框架只给得出一个泛泛的原则（等待也要设计——`Living with Complexity` 第 7 章 "The Design of Waits"，而**这一章的正文我没读到，属于依据官方概述的提及，不是原话**），给不出阈值。

5. **我需要什么才能把话说得更实。** 按价值排序：**（a）** 一段 5 分钟的真实使用录像——哪怕是作者自己操作的屏幕录制，比任何代码都更能告诉我路在哪里断；**（b）** 一次"错误日志"式的采集——把用户实际撞到的 toast/失败请求按次数排个序，我就能把 P0 的顺序从"读代码推测"变成"按频次排序"；**（c）** 交底约束 1/3/4/5 里"插件边界"这条，我还需要知道**作者愿意为"跨插件的连续操作"付多少耦合代价**——这是 M5 与约束 3/5 的真实冲突点，见下。

6. **一处我明确保留的张力（不调和）。**
   我的"以活动为中心"（M5）要求的是：**设计的是"把一批散落的文件按项目归档并共享给同事"这条完整链路**，包括中断与恢复。而这个项目有一条不可违背的约束 3/5：**每个插件的前端必须完全在自己的目录内，禁止跨插件 DOM 操作。**
   这两者在"跨插件连续操作"上会直接撞车。我在 P0-2、P1-1 里给出的都是**折中**：把"退路"和"撤销"放在骨架层（骨架本来就是容器与总线，`frontend/index.html:352,731`），而不是要求插件互相知道对方的界面。但我得诚实说：**折中不等于解决。** 一个真正以活动为中心的设计，可能需要"标签页 + 收藏 + 最近 + 搜索"共享同一个位置模型——而那是跨插件的。**这个取舍我不替作者做**（他才知道自己愿意付多少耦合代价）；我只能指出：现在的耦合是**隐式的**（三个插件靠 `.v3-content` 这类内部类名工作：`files-office2/client/index.js:41`、`files-edit-md/client/index.js:220,270,428`、`files-comments/client/index.js:112`——违反约束 5，且**静默失效**），而**隐式耦合比显式契约更贵**。要付耦合代价，也请付在明面上。

7. **最后，我对我自己的主张也要设限。** 我上面反复引用的"不要确认框、要 undo"，在**不可逆且代价极高**的操作上（彻底删除、吊销密钥）是有边界的——我从来没主张过把这些的确认去掉。而"复杂是好的"这句话本身也很危险：它太容易被用来替"什么乱东西"辩护。我在这里给的每一条都挂了 `文件:行号`，就是为了让你能自己去查，而不是信我。

> **Trust but verify.** 我会给你引用，但**你得去看那些文献**。

---

## 6. 我这把视角适合干什么活

**我能做的是**：拿一份只读源码，逐元素问"它能不能做 / 你怎么知道它能做"，把"用户出错"重新归因成"系统设计的产物"，并输出带行号、可当场验证、可拆成独立交付的改进项——**适合作常驻的"交互体检"角色，在每次功能改动后跑一遍，专门盯退路、撤销、错误文案、状态可见性这四样。**

**我不适合做的是**：视觉美化（我不用"用户友好"这种词，也不做配色）、性能阈值判断（我没有依据）、以及替你决定"这 12 个图标该怎么分组"——那需要真的懂这个团队怎么干活，而不是我读代码能读出来的。

---

*本报告全程只读。未修改 `privhub/` 下任何源码，未修改 `docs/experts/` 下任何既有文件。*
