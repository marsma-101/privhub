# 交底：PrivHub 前端与功能现状（供各视角专家审阅）

> 用途：给挂载不同思维框架（诺曼 / 克鲁格 / Refactoring UI / 库珀 / Shape Up）的评审者一份**同一份事实**，使五份改进方案可比、可交叉验证。
> 编制：萧潇｜基线：v3.1.0（`privhub/package.json` version 字段）、源码复核 2026-09-14
> 阅读约定：**【实测】** 由本次命令直接量出　**【实体】** 已读源码/文档确认　**【推断】** 有据未复现

---

## 0. 一句话

**PrivHub（私域枢纽）** —— 局域网文件枢纽：纯 Cordis 底座 + 自研插件架构的文件管理系统，AES-256-GCM 加密落盘，可私有化部署。
**作者非程序员出身，全部代码由 AI 生成**（README 开篇自陈）。这是他亲口定的前提，请据此校准你的建议：任何预设「有设计师/有前端团队」的方案都不成立。

---

## 1. 技术形态（这是硬约束，不是选择）

| 项 | 事实 |
|---|---|
| 底座 | 纯 Cordis（`@deepseek-ai/cordis` + schemastery + tsx），无重型 Web 框架，目录搬走即可运行 |
| 后端 | 自研 `node:http` webServer，**仅支持精确匹配路由**（`privhub/src/web-server.ts:66-72`，无 param/prefix 中间件） |
| 前端 | **Vue 单页骨架 + 手写 CSS，无打包链**（`privhub/frontend/index.html`，**1130 行**单文件〔2026-09-17 实测〕；09-11 审计基线记作 955 行，已增长） |
| 插件前端 | 「**发现式**」加载：骨架启动时调 `GET /privhub/api/shell/manifest`，服务端现场扫描 `plugins/*/client/manifest.json`，骨架再 `import('/privhub-plugins/<名>/index.js')`。**插件前端代码从不写入主页面** |
| 卸载语义 | 删目录 + 重启服务 = 卸载，**零残留**（已实测：插件数 31→30，其前端资源 200→404） |
| 规模 | **50 个插件目录**、112 条后端路由（31 个插件注册）、32 个含前端 |
| 通信 | 骨架通过 `window.PrivHub`（骨架 26 个键 + 插件运行时追加）与插件对话 |

**`无打包链` 是项目的既定特性，不是欠债。**理由（已定案）：局域网下多几次请求无感、二访全 304、**改完刷新即生效**。给建议时若要引入构建步骤，必须论证其收益大于「失去即时生效」。

---

## 2. 界面区域 → 提供它的插件 → 该改哪个文件（权威索引）

由运行中的 manifest 实测得出（21 个 slot 全部已挂载）。**改界面先查这张表。**

| 界面区域 | slot | 改这个文件 |
|---|---|---|
| 未登录：登录/注册 | `auth` | `plugins/privhub-auth/client/index.js` + `privhub-shell` |
| 顶栏·左（欢迎/项目下拉/➕） | `project-tabs` | `plugins/privhub-shell/client/index.js` |
| 顶栏·右（徽章/头像/退出/最近） | `user-area` | `privhub-shell` + `privhub-shell-recent` + `privhub-files-explorer-v3` |
| 最左·竖排图标栏 | `app-iconbar` | `plugins/privhub-shell/client/index.js` |
| 左栏（未选项目=项目列表） | `welcome` | `plugins/privhub-shell/client/index.js` |
| **左栏（已选项目=目录树）** | `tree` | `plugins/privhub-files-explorer-v3/client/index.js` |
| 中栏·标签行 / 内容区 | `tabs` / `panel` | `plugins/privhub-files-explorer-v3/client/index.js` |
| 中栏·设置 / 用户管理 | `settings` / `admin` | `privhub-shell-settings` / `privhub-admin` |
| 中栏·权限/审计/标签/模板/图谱/知识库 | `acl`/`audit`/`tags`/`template`/`kg`/`wiki` | 各同名插件 |
| 中栏·AI 工具总台 / 智能体接入 | `rag-view` / `agent-view` | `privhub-svc-rag` / `privhub-shell-agent-console` |
| 中栏·回收站/搜索/收藏 | `trash-view`/`search-view`/`fav-view` | `privhub-trash-ui` / `privhub-files-search` / `privhub-shell-favorites` |
| 浮层·上传队列 / Office 编辑器 | `upload-queue` / `office-editor` | `privhub-files-upload-queue` / 8 个插件共用 |

**骨架自己渲染、没有 slot 的区域（只能改骨架）**：`.topbar` 外壳、`.side-wrap` 外壳、`.resize-handle`、`.main` 视图分发、**输入模态**（`nav.inputState`，`frontend/index.html:1070-1086`）。

### 2.1 前端真实体量【实测】

| 插件 | 文件数 | 体积 |
|---|---|---|
| `privhub-files-office2` | 7 | **10 987 KB** ← 见下方说明，**不影响首屏** |
| `privhub-files-explorer-v3` | 14 | 94.7 KB |
| `privhub-admin-console` | 17 | 92.9 KB |
| `privhub-svc-rag` | 2 | 71.4 KB |
| 其余 29 个含前端插件 | 各 2~3 | 各 ≤ 28.7 KB |

前端总量：约 **8172 行 / 33 个文件**（09-11 基线）。

**关于 office2 的 10.9 MB【实测·已结案】**：其中 `client/vendor/univer.bundle.js` = **10 721 KB**（另有 `univer.css` 80 KB、`docx-preview.js` 73.5 KB、`jszip.js` 95.3 KB）。
但这四个 vendor 文件**是在 `client/view.html` 里被 `<script src>` 加载的**（`view.html:7,71-73`），而 `view.html` 只由 `client/index.js:63` 构造的 **iframe** 打开——即**仅当用户预览 docx/xlsx 时才下载**，不进骨架首屏，浏览器缓存后二次打开不再重传。
→ **结论：这不是首屏性能问题**，而是「打开 Office 预览时的首包体积」问题。若提建议，请按这个前提提。

### 2.2 设计令牌现状【实测 2026-09-17】——**改样式前先看这里**

对 `privhub/frontend/index.html` 逐项量过：

| 项 | 实测值 | 含义 |
|---|---|---|
| CSS 自定义属性总数 | **10 个** | `--accent`、`--bg`、`--danger`、`--line`、`--muted`、`--panel`、`--panel2`、`--text`、`--warn`、`--ui-zoom` ——**其中 9 个是颜色，`--ui-zoom` 不是** |
| 间距刻度 | **无** | 没有 `--space-*` 一类刻度 |
| 字号刻度 | **无** | 没有 `--text-*` / `--font-*` 刻度 |
| 离散 px 值 | **45 个互不相同的值** | 即：间距/尺寸是逐处手写的，没有系统 |
| `box-shadow` 出现次数 | **仅 4 处** | 层级几乎不靠阴影表达 |

**这条对「视觉层」类建议是关键前提**：项目不是「用了设计系统但没用好」，而是**根本没有令牌层**——颜色有 9 个变量，间距与字号完全没有。任何"先把变量补成一整套刻度、再把 45 个离散 px 收敛进去"的建议，都属**从零建层**，需评估对现有 32 个插件前端的影响面（插件里还有 13 处硬编码 `rgba(90,130,200` 未走变量，见 U4）。

**另附一处口径更正**：Refactoring UI 一路的调研底稿称"只有 10 个颜色变量"，精确说法是**10 个自定义属性、其中 9 个颜色**，多的那个是 `--ui-zoom`。其余两项（45 个离散 px、4 处 box-shadow）已复核，**完全正确**。

---

## 3. 已知问题清单（**已去重，勿重复劳动**）

### 3.1 已修复的 P0（09-11 验收，本次已回源码抽验确认，**不要再报**）

| 项 | 现状 | 证据 |
|---|---|---|
| 请求体无大小上限 | ✅ 已修 | `privhub-core/src/index.ts:130` 带 `max = MAX_BODY_BYTES` |
| `/pub` 免登录发布页 XSS → 账号接管 | ✅ 已修 | `files-publish/src/index.ts:145` 已挂 `default-src 'none'; sandbox` |
| 全文搜索 snippet 存储型 XSS | ✅ 已修 | `files-search/client/index.js:17,28-32` 已加 `esc()` |

### 3.2 前端交互问题（U 系列，**本次评审的主战场**）

| 编号 | 问题 | 证据 |
|---|---|---|
| U1 | **键盘快捷键体系完全缺失**——全仓无 `registerHotkey`，仅 txt/md 内嵌编辑有 Ctrl+S。无 F2 重命名 / Delete / F5 / Enter 打开 / Backspace 上级 / Ctrl+F | — |
| U2 | **视图分发是硬编码枚举**：`openBarItem` 的 if/else 13 个视图名（`index.html:705-717`）、功能面板 12 条 `<component v-else-if>`（:878-892）。新增视图必须改骨架 | — |
| U3 | **事件命名两套并存**：前端 `entry:open` 8 处 vs 后端 `file:opened` 4 处；前端 `bus`（`index.html:376`）无声明与审计 | — |
| U4 | 主题变量未收敛：插件 client 中硬编码 `rgba(90,130,200` 残留 **13 处** | `explorer-v3/client/index.js:101` 附近 |
| U5 | 列表**无虚拟滚动**，千级目录全量渲染 DOM | — |
| U6 | **标签页软上限 30，超出静默淘汰最早的标签，无任何提示** | `explorer-v3/client/index.js:197` |
| U7 | 回收站同名冲突只返回失败，无「覆盖/跳过/改名恢复」三选一 | `privhub-core/src/index.ts:490` |
| U8 | **交互细节 5 处**：① ~~「重试失败项」实际不是重试~~ 【**已修，本条作废**：`upload-queue/client/index.js:38-43` 已有 60 秒超时回滚（未重选则置 `fail`）、`:54,59,61,69-70` 已清全部定时器、`:65` 有 `beforeUnmount`、`:88` 按钮文案已写「（重选同名文件）」】；② `fav:add` 被模块级+组件级**双重监听**，收藏一次发两次 POST；③ 3 处绕过 `window.PrivHub.api()` 直接 fetch 读 token，**丢失统一 401 自动登出**；④ 裸调用 `api()` 不 await/catch，失败无反馈；⑤ `trashBadge` 是只写不读的死全局 | `upload-queue/client/index.js:29-33,46`、`shell-favorites/client/index.js:14,62`、`dataview/client/ph-table.js:12,14`、`explorer-v3/client/index.js:1502`、`trash-ui/client/index.js:7,15` |
| U9 | 视觉层待改进（毛玻璃/圆角/柔和配色；<640px 收敛为图标 + hover 气泡） | **约束：功能入口必须保持在左侧图标栏，不改交互布局（用户既定要求）** |

### 3.3 工程与一致性问题（E 系列，会拖慢后续所有前端改动）

| 编号 | 问题 | 证据 |
|---|---|---|
| E2 | 大文件：`explorer-v3/client/index.js` 曾 1649 行 —— **v3.0.4 已拆为 12 个模块**（入口 40 行）；`svc-rag/client/index.js` 1025 行**未拆** | `77f15933` |
| E4 | **5 份同构 Markdown 渲染器（约 350 行重复）**，`esc()` 逐份手抄；S3 那个 XSS 就是复制导致转义缺失的实例 | 3 份客户端 + 2 份服务端 |
| E7 | 5 处共 88 行 CSS 经 `createElement('style')` 注入且**不随卸载移除** | `files-comments:15`、`explorer-v3:45`+`:1395`、`files-office2:18`、`svc-rag:17` |
| E8 | 骨架仍渲染**已退役的 `tabs` slot**（全仓 0 个 manifest 声明它） | `index.html:876` |
| E1 | 插件装配**双源维护**：`CORE_PLUGINS` 硬编码 17 项 与 L3 自动发现并存；漏改时**不报错**，只少一行日志 | `src/main.ts:46-51` |

### 3.4 架构级耦合（前端重构的核心待办）

**3 个插件靠 explorer-v3 的内部类名工作**——违反「插件自治 / 卸载即消失」：

| 插件 | 依赖 |
|---|---|
| `files-office2` | `document.querySelector('.v3-content')` → `prepend(iframe)` |
| `files-edit-md` | `querySelector('.v3-content')` + `teleport to=".v3-content"` |
| `files-comments` | `document.querySelector('.v3-content .v3-md')` |

**后果**：卸载/重命名 explorer-v3，或仅改它的类名 → 这三个插件**静默失效**（不报错，就是不工作）。修订顶栏时已因此**连撞两次**。

---

## 4. 不可违背的既定约束（**违反 = 无效建议**）

1. **功能入口必须保持在左侧图标栏，不改交互布局**（用户明示，针对 U9）。
2. **无打包链是特性**，改完刷新即生效；不得默认引入构建步骤。
3. **每个插件的前端必须完全在自己的目录内**——卸载插件 → 其前端一并消失（用户明示的重构方向）。
4. **前端保持一个主界面**：骨架只做容器与总线；各区域按功能拆独立文件（顶栏一个文件、侧栏一个文件、每个弹窗一个文件）。
5. **禁止插件用 DOM 类名操作别的插件的界面**——跨插件 `querySelector` 要改成插槽/事件契约。
6. **右侧详情面板里「收藏/权限/批注评论/生成页面/发布链接/版本历史/向量数据库」等按钮硬编码在 `explorer-v3` 的 `detail.js`，是【有意的临时代码】，不是缺陷**。待对应插件开发到那一步再迁回。**不要把它当缺陷提。**
7. **测试/示例数据保持原样**（含 `data-files/.agents/` 里的早期残留），不必就此类数据征求意见。
8. 改动纪律：功能改动涉及的非示例数据随改动迁移并附说明；**写 `CHANGELOG.md` + 递增版本号**（版本号唯一来源 `privhub/package.json`）；人工确认无误后提交推送，同步项目说明文件。

---

## 5. 账本还剩下什么（原始清单索引）

完整清单：`docs/PrivHub-改进建议.md`（893 行 / 42 项 / 09-11 基线），**P0 六项与 19 项高价值 P1 已完成**（`docs/PrivHub-验收报告-2026-09-11.md`）。
未完成集中在：`D2/D4/D5/D6/D8/D9`（数据可靠性）、`S4/S5/S6/S9/S10`（安全）、`P1`（静态资源无缓存）、`O1`（生产包 `deploy/privhub-deploy/` 落后于开发源码）、`E1~E8`、`U1~U9`、`F1~F4`。

**本次评审的题目**：**前端交互 + 功能**。即 `U1~U9`、`E2/E4/E7/E8`、`F1~F4`、以及第 3.4 节的跨插件耦合。安全（S）与数据可靠性（D）**已由用户明示往后放**，不必花力气。

### 5.1 F 系列到底指什么（补：原交底只引编号未给定义，是缺漏）

| 编号 | 名称 | 性质 |
|---|---|---|
| `F1` | ACL 规则自锁防护（禁止经由界面移除 admin 对 `admin/acl/audit` 的 view 权限 + 前端警示） | 后端为主，**前端仅加警示文案** |
| `F2` | ACL 守卫覆盖自查（`GUARD_PATHS` 白名单 37 条 vs 全仓 108 条注册，未登记即透传） | 纯后端 |
| `F3` | API 契约文档（108 条路由无集中清单） | 文档 |
| `F4` | **明确未做的功能（非缺陷）**：多人实时协同、病毒扫描、外部检索引擎、反向链接面板、RAG 摄取队列持久化 | 产品决策 |

→ **结论：F1~F4 与「界面命名/标签」类建议无重叠**，不必去重；只有 `F1` 沾一点前端文案。

### 5.2 数数时的口径警告（Cooper 一路实测得出，已复核成立）

统计插件/插槽时**不要计入 `plugins/_retired-v2/`** —— 那里面还有 **3 个旧 manifest**，计入会把数字变成 35/45/26 这种错值。**正确口径：32 个带前端插件 / 31 个插槽名 / 41 次注册 / 28 个 1:1 插槽。**

---

## 6. 需要产品判断的悬而未决问题（欢迎各视角给出判断与理由）

1. **50 个插件的入口组织**：现在图标栏 + 顶栏 + 标签 + 详情面板四处散落，用户该按什么找功能？
2. ~~`files-office2` 前端为何 10.9 MB~~ → **已结案：Univer 打包文件 10.7 MB，在 iframe 内按需加载，不进首屏**（见 2.1）。改为可讨论：**打开 Office 预览要等 10.7 MB**，值不值得优化（换 CDN？按需裁包？还是接受）？
3. **标签页 30 个上限**该提示、该不淘汰、还是该改成横向滚动？
4. **「输入模态」还在骨架里**（唯一的例外），该不该抽成插件？
5. **无用户研究条件**下，如何低成本发现界面问题（非程序员、无测试用户来源）？
6. **功能蔓延的边界**在哪：50 个插件之后，什么该做、什么该拒？

### 6.1 已复核的两条澄清（写方案时别再搞错）

- **「搜索无常驻输入框」要分两半说**：搜索结果视图**内部确有输入框**（`privhub-files-search/client/index.js:104-107`）；缺的是**全局常驻搜索框**。且 Cooper 一路明确**不建议加**——图标栏仅 52px 塞不下，进顶栏则等于改布局，会撞第 4 节硬约束第 1 条。
- **「知识图谱」(`kg`) 与「知识库」(`wiki`) 是异物近名**——两个不同 view、由两个不同插件提供，**从名字读不出区别**。这比「同物异名」更危险：同物异名只是多费一次点击，异物近名会让用户**点错功能**。原先只有「同物异名」被记录，此项由 Cooper 一路补出。
