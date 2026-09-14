# PrivHub 插件实现规则

> 配套文档：《PrivHub-需求文件》（功能基线）、《PrivHub-架构与功能说明.md》（当前状态基线）、《PrivHub-知识图谱.html》（插件关联可视化）。
> 本文档在**不改动底座、功能分类、插件划分**的前提下，为每一个插件指定**实现方式**与**交互方式**。
> 核心原则：**已实现的不动，只加功能；想到新功能 = 往对应枢纽挂一个叶子插件，不动其他代码**。
> 最近核对：**2026-09-11**（按 `privhub/plugins/` 实际目录 + `src/main.ts` + `frontend/index.html` 逐项核对）

---

## 0. 已验证的实现现状（2026-09-14 · v3.1.0 代码核对）

下表来自对 `privhub/plugins/` 的**实际扫描**，作为后续"现状"判定的唯一事实源。

统计口径：插件 = `plugins/` 下非 `_` 开头目录；后端 ✅ = 存在 `src/index.ts` 或 `server/index.ts`；前端 ✅ = 存在 `client/manifest.json`（可被骨架挂载）。

**总计 50 个插件目录**：43 个含 `src/index.ts`（17 核心清单手动挂载 + 26 L3 自动发现）+ 7 个纯前端。
其中 **31 个真正注册 HTTP 路由**（共 112 条），32 个含前端。
另存 `_retired-v2/`（3 个已退役目录：`files-explorer`、`files-preview`、`shell-tabs`），以 `_` 前缀排除，不参与装配。

### 0.1 L2 能力 Service（10 个，纯后端，main.ts 手动挂载）

| 插件 | 后端 | 前端 | 说明 |
| --- | --- | --- | --- |
| privhub-svc-storage | ✅ | — | S7 静态加密存储（AES-256-GCM，文件头 `PHENC1` / 审计块 `PHAUD1`） |
| privhub-svc-events | ✅ | — | E1 事件总线注册表（`declareEmit` / `declareListen`） |
| privhub-svc-audit | ✅ | — | S1 审计日志（JSONL，60 天保留） |
| privhub-svc-acl | ✅ | — | S2 细粒度 ACL（规则解析：路径最具体优先、同深度拒绝优先） |
| privhub-svc-watermark | ✅ | — | S3 数字水印 |
| privhub-svc-search | ✅ | — | S4 搜索（BM25 + CJK bigram） |
| privhub-svc-meta | ✅ | — | S5 元数据（标签 / 自定义字段，`meta.json`） |
| privhub-svc-collab | ✅ | — | S6 协同骨架（会话/补丁上限，尚无多人实时编辑） |
| privhub-svc-office | ✅ | — | Office 能力库（`office-lib.mjs` 共用解析） |
| privhub-svc-model | ✅ | — | M0 模型接入层（OpenAI 兼容，配置走 `data/model.json`） |

### 0.2 L1 六枢纽（6 个，main.ts 手动挂载）

| 插件 | 后端 | 前端 | 说明 |
| --- | --- | --- | --- |
| privhub-core | ✅ | — | `ctx.privhub` 服务：持久化 + 权限判定 + HTTP 工具，供各域 inject 复用 |
| privhub-auth | ✅ | ✅ `auth` | 登录 / 注册 / 会话 / me（4 路由） |
| privhub-files | ✅ | — | 文件核心 API（10 路由：projects/list/preview/preview-raw/download/upload/mkdir/delete/rename/move） |
| privhub-trash | ✅ | — | 回收站后端（4 路由：list/restore/purge 等），依赖 core 的 `moveToTrash` |
| privhub-admin | ✅ | ✅ `admin` | 用户 / 角色 / 项目权限管理（6 路由） |
| privhub-shell | ✅(server) | ✅ | 骨架枢纽：manifest 聚合接口 + `project-tabs` / `user-area` / `app-iconbar` / `welcome` / `auth` 五组件 |

### 0.3 L3 功能插件（33 个：26 自动发现 + 6 纯前端 + admin-acl 守卫）

| 插件 | 后端 | 前端 | slots | 说明 |
| --- | --- | --- | --- | --- |
| privhub-admin-acl | ✅ | ✅ | `acl` | 细粒度 ACL 守卫（F14）：包装 `svc.route`，白名单 `GUARD_PATHS` 管辖 **37 条**文件相关路由（per-method 裁决 view/upload/edit/delete），另提供规则管理 API（adminOnly） |
| privhub-admin-audit | ✅ | — | — | 审计数据（F13/B13）：写操作落 JSONL + CSV 导出 |
| privhub-admin-audit-panel | — | ✅ | `audit` | 审计日志可视化（F15）：时间线 + 四维筛选（时间/操作/用户/项目）+ CSV，仅管理员 |
| **privhub-admin-console**（v3.1.0） | — | ✅ | `admin-console` | **管理控制台外壳**（纯前端，16 模块）：顶部栏 + 管理侧栏 + 内容区；`#/admin/...` hash 路由；契约见 §1.1 |
| privhub-auth-watermark | ✅ | ✅ | `watermark` | 数字水印：预览时右下角叠加用户名+时间（防截屏外泄） |
| privhub-files-agent | ✅ | — | — | Agent API 智能体接口网关（18 路由，全仓最多）：`pha_` 密钥 / 专属空间 / 配额限流 / 版本快照 / 幂等 |
| privhub-files-comments | ✅ | ✅ | `office-editor` | md 文档位置锚定批注：选区评论、高亮锚点、回复线程、状态流转 |
| privhub-files-dataview | ✅ | ✅ | `office-editor` | 数据表页面模板：HTML 页面 + xlsx 数据表双向编辑（`ph-table` 组件） |
| privhub-files-edit-md | ✅ | ✅ | `md-editor` | Markdown 在线编辑（F16/C14）：编辑/预览分栏、frontmatter、双链、版本历史 20 版、冲突检测 |
| privhub-files-explorer-v3 | ✅ | ✅ | `tree` `panel` `preview` `user-area` | V3 布局：侧边栏文件树（含文件 + ⋯ 菜单）+ 中央 VS Code 式标签页内容区（**1649 行单文件**，见《改进建议》E2） |
| privhub-files-export | ✅ | — | — | 页面导出（F21）：MD → HTML/PDF/Word |
| privhub-files-fulltext | ✅ | — | — | 全文搜索（F17/C15）：BM25 + CJK bigram，snippet 高亮，项目内检索 |
| privhub-files-invite | ✅ | ✅ | `office-editor` | 邀请链接：生成永久/限时邀请码，同事用码自助加入项目（5 路由） |
| privhub-files-kg | ✅ | ✅ | `kg` | 知识图谱（F18/C17）：项目内 .md 双链 + 标签关联图，社区同色系，点击节点定位文件 |
| privhub-files-mdpage | ✅ | ✅ | `office-editor` | Markdown 一键生成 HTML 展示页（md → html） |
| privhub-files-office | ✅ | ✅ | — | Office 文档读取（docx/xlsx/pptx → Markdown 预览 + 全文索引） |
| privhub-files-office-ai | ✅ | ✅ | — | Office 智能体入口（API Key 鉴权，外部 AI 读写项目 Office 文档，C22） |
| privhub-files-office-ui | ✅ | ✅ | `office-editor` | Office 文档人工编辑（docx/xlsx 编辑保存，pptx/pdf 只读查看） |
| privhub-files-office2 | ✅ | ✅ | `office-editor` | Office 原生观感预览 + 单人独占编辑（docx 保真渲染 / xlsx 电子表格 UI；编辑锁） |
| privhub-files-publish | ✅ | ✅ | `office-editor` | HTML 内网发布：免登录只读分享链接（有效期/撤销） |
| privhub-files-search | ✅ | ✅ | `search-view` | 文件名搜索（B8）：全项目递归匹配，点击结果跳转 |
| privhub-files-tags | ✅ | ✅ | `tags` | 文件标签（F19）：为选中文件打标签（联想已有标签），按标签筛选定位文件 |
| privhub-files-template | ✅ | ✅ | `template` | 新建文档（F20）：选模板（会议记录/产品需求/工作日志等）→ 在当前目录创建 .md |
| privhub-files-upload | — | ✅ | `upload` | 拖拽上传（B11）：拖入文件/文件夹递归上传，同名覆盖（**纯前端**） |
| privhub-files-upload-queue | — | ✅ | `upload-queue` | 上传进度队列（B12）：底部抽屉，逐条进度/失败重试（**纯前端**） |
| privhub-files-versions | ✅ | ✅ | `office-editor` | 通用文件版本历史：文本类快照/列表/预览/恢复（每文件 20 版） |
| privhub-files-wiki | — | ✅ | `wiki` | 知识库视图（F22）：当前目录 README.md/index.md 渲染为 Wiki 页面，双链可点击定位（**纯前端**） |
| privhub-git-backup | ✅ | — | — | 文件版本 Git 备份（自动 + 手动）：把 data-files 镜像为本地裸仓 |
| privhub-shell-favorites | ✅ | ✅ | `fav-view` | 文件/文件夹收藏（星标）：收藏列表，一键跳转原路径 |
| privhub-shell-recent | ✅ | ✅ | `user-area` | 最近打开文件列表（顶栏下拉，点击定位） |
| privhub-shell-settings | ✅ | ✅ | `settings` | 系统设置面板（D25）：主题 / 默认视图 / 上传限制 |
| privhub-svc-rag | ✅ | ✅ | `rag-view` | AI 工具总台（14 路由）：语料仓库/总览/待裁决/模型接入/向量化/问答/Key 管理/专属回收站/我的 AI 密钥；sqlite-vec 向量库 |
| privhub-trash-ui | — | ✅ | `trash-view` | 回收站视图（B9）：列表/恢复/彻底删除/清空 30 天，角标计数（**纯前端**） |

### 0.4 前端通信总线（`window.PrivHub`，v3.0.1 核对：骨架 **25 个键** + 插件运行时追加）

骨架在 `frontend/index.html#L688` 建立基座对象，后续自行扩展，插件亦反向扩展：

| 分组 | 键 | 用途 |
| --- | --- | --- |
| 骨架基座（12） | `api(path, opts)` | 统一 fetch，自动带 token |
| | `AUTH` | reactive 登录态（`token` / `user`） |
| | `THEME` / `applyTheme` | 主题状态与切换 |
| | `logout()` | 清除登录态 |
| | `toast(msg, type)` | 全局提示（取代 alert） |
| | `bus` | 前端事件总线（`emit` / `on`） |
| | `nav` | 导航状态机（`activeView` / `project` / `path` / `setActiveView` / `openTrash` …），定义于 #L394 |
| | `fileIcon(name)` | 按扩展名取图标 |
| | `previewImageUrl` / `previewPdfUrl` | 预览直链构造 |
| | `sortedEntries` | 目录排序工具 |
| 骨架扩展（13） | `badges` | 图标栏角标（如回收站待恢复数） |
| | `manifests` / `barItems` / `loadBarItems` | manifest 列表与图标栏条目（按登录态过滤 adminOnly） |
| | `openBarItem(bi)` | 图标栏点击分发（#L705） |
| | `openAdmin` / `openSettings` / `openAcl` / `openAudit` / `openTags` / `openTemplate` / `openKg` / `openWiki` | 面板视图快捷入口（#L816-823） |
| 插件反向扩展（3） | `openRagDup` / `ragIntent` | svc-rag 的查重入口与跨插件意图传递 |
| | `trashBadge` | trash-ui 写入的回收站角标 |

**加载机制（已验证）**：骨架启动时调用 `GET /privhub/api/shell/manifest` 聚合各插件 `client/manifest.json`（shell 插件扫描 + 5s TTL 缓存 + A19 view 冲突检测），按 `slots` 逐一动态 `import()` 加载 `/privhub-plugins/{目录名}/index.js`；某插件 manifest 缺失则对应 slot 不渲染，其余不受影响（可插拔）。

---

## 1. 基础契约（沿用设计文档，不修改）

每个插件 = `package.json` + `src/index.ts`（后端，可选）+ `client/manifest.json` + `client/index.js`（前端，可选），前后端可一体可独立。

> ⚠️ `cordis.patch.yml` 已**不再参与装配**（`src/main.ts` 为纯代码装配）：全仓仍有 **27 个** 历史遗留文件，属待清理项（《改进建议》E5）。

**slot 挂载点（插件实际声明并集 31 个；另有 `tabs` 仅骨架渲染）**：

| 分类 | slot |
| --- | --- |
| 骨架布局（shell 声明） | `auth`（全屏登录）· `project-tabs`（顶栏项目横排）· `user-area`（顶栏右侧）· `app-iconbar`（左侧图标栏容器）· `welcome`（欢迎页） |
| 文件区（explorer-v3 声明） | `tree`（左面板目录树）· `panel`（中面板文件区）· `preview`（右侧详情面板） |
| 功能面板 | `trash-view` · `search-view` · `fav-view` · `settings` · `admin` · `acl` · `audit` · `tags` · `template` · `kg` · `wiki` · `rag-view` |
| 浮层 / 增强 | `upload` · `upload-queue` · `watermark` · `md-editor` · `office-editor` |
| **管理控制台**（v3.1.0） | `admin-console`（外壳本体）· `admin-tags` · `admin-template` · `admin-trash` · `admin-settings`（**内容区别名**：同一组件实现、两处入口；由外壳按路由渲染） |
| （闲置） | `tabs` —— 骨架仍在渲染，但已无插件声明（`shell-tabs` 已退役），可从骨架移除 |

**同 slot 可多组件**（数组累积，#L789），实践中：
`office-editor` 挂 8 个（comments / dataview / invite / mdpage / office-ui / office2 / publish / versions）；
`user-area` 挂 3 个（explorer-v3 / shell / shell-recent）；`auth` 挂 2 个（auth / shell）。

**manifest 字段**：`id` / `title` / `icon` / `description` / `slots[]` / `entry`（由 shell 按目录名自动生成）/ `barItems[]`（图标栏项：`{ icon, title, slot, view, adminOnly }`）。
`barItems[].view` 决定点击行为，当前实际 **13 个 view**：`files` `trash` `search` `favorites` `settings` `admin` `acl` `audit` `tags` `template` `kg` `wiki` `rag`。
（另有 `slot: "admin-nav"` 的管理导航声明，**不渲染进图标栏**，见 §1.1。）

**client 默认导出形态（已验证）**：
```js
export default { id: 'privhub-xxx', slots: { tree: Component, panel: Component } }
```

### 1.1 管理控制台契约（v3.1.0 起，新增管理页照此接入）

管理相关界面**不再各自占满全宽**，而是统一渲染在 `admin-console` 外壳内（顶部栏 + 左侧管理导航 + 内容区）。
两类插件参与其中，**都只需改自己插件目录内的 manifest 与 client，无需改骨架**：

| 你要做的事 | 改哪里 | 怎么写 |
| --- | --- | --- |
| 让管理页出现在**左侧管理导航** | 自己插件的 `client/manifest.json` | `barItems` 加一项：`{ "icon": "...", "title": "...", "slot": "admin-nav", "view": "<视图名>", "adminOnly": true }` |
| 让管理页在**内容区**渲染 | 自己插件的 `client/index.js` | `slots` 加别名：`'admin-<名>': 你的组件`（与既有 slot 同一个组件即可，一份实现两处入口） |
| 路由与分组 | `privhub-admin-console/client/routes.js` | 在 `ROUTES` 加一条：`key`（= hash 路径，如 `content/tags`）、`label`、`section`（overview/access/content/ops）、`view`（切到骨架哪个 activeView）、`slot`（内容区 slot 名）、`entryOf`（对应 barItem 的 view，用于判可用性） |

**必须遵守的三条**：

1. `slot: "admin-nav"` 的 barItem **不会**渲染进图标栏（那是控制台侧栏的声明），
   图标栏底部只保留「🛠️ 管理控制台 + ⚙ 设置」两个入口。
2. 管理页内**不要再放自己的「关闭」按钮或页面级外壳**：导航由侧栏负责；
   外壳已通过 `.ad-view .view-inner > .modal-foot { display: none }` 隐藏既有面板的关闭按钮
   （插件内部结构与业务逻辑不动）。
3. 管理路由走 **hash**（`#/admin/<key>`）；管理视图内切换**必须**只改 hash，
   不得调用 `nav.setActiveView(同值)` —— 那会 toggle 回文件页。
   需要用骨架切换视图时传 `{ noToggle: true }`。

**可用性判定（卸载即失效）**：外壳用「视图名是否在骨架的 barItems 里」判断该管理页是否可用。
因此**卸载承载插件后，侧栏条目自动变为「待接入」，点进去显示可见原因 + 重试**，而不是空白页；
插件装回即自动恢复（未改控制台一行代码）。

**外壳提供的复用件**（`privhub-admin-console/client/ui.js`，管理页应优先复用，勿各自造轮子）：
`AdminEmptyState`（图标+标题+说明+主按钮）、`AdminSkeleton`（骨架屏，禁止整屏 spinner）、
`AdminErrorState`（局部错误 + 重试）、`AdminConfirmDialog`（危险操作确认，可要求输入关键词）、
`AdminToast`、`AdminBulkBar`（批量操作栏）、`AdminDataTable`（统一表头/行高/选中态）、
`AdminListDetail`（列表-详情主从，列表 320px 可拖拽 280–480）。参考实现见 `panels.js` 的「发布链接」页。

---

## 2. 统一交互规范（跨插件一致）

为避免各插件交互割裂，以下范式强制统一：

- **图标栏（app-iconbar）**：每个图标来自某插件的 manifest `barItems`（icon/title/slot/view/adminOnly）；hover 气泡显示 `title`；支持角标计数（如回收站待恢复数）。
- **面板（tree / panel / preview）**：左树中面板右预览；面板间分隔条可拖拽调宽、可折叠收起（骨架自带布局能力，A2）。
- **模态 / 抽屉**：管理类（用户、设置、详情）用模态弹窗（参考 admin 的 `modal-mask` 范式）或右侧抽屉；点击遮罩/`关闭` 经 `$emit('close')` 由骨架关闭。
- **批量操作**：panel 内行首多选 checkbox → 顶部浮现批量工具栏（移动 / 删除 / 下载）。
- **上传**：向 panel 拖入文件或文件夹 → 底部"上传队列"抽屉，逐条进度条，失败显示重试按钮。
- **反馈**：所有写操作经 `PrivHub.api` 后给 toast（成功绿 / 失败红）；破坏性操作（删除用户、清空回收站）二次确认。
- **状态**：列表/树渲染需含加载态（骨架屏）与空态提示；权限不足时静默隐藏入口而非报错。

---

## 3. 领域枢纽规则（6 个，划分不变）

### 3.1 privhub-core · 共享服务枢纽
- **职责**：唯一持有共享状态（账号/会话/回收站持久化、data-files 文件根、权限判定）。**不暴露任何 HTTP 接口**，接口按域归属各业务插件。
- **提供基座能力**：`svc.route()`（复用自研 webServer 注册路由）、`svc.requireUser()`、`svc.canAccess(u, project)`、`svc.visibleProjects(u)`、`svc.listFiles()`、`svc.readFileForPreview()`、`svc.isValidName()`、`svc.resolveInProject()`、`svc.createFolder()`、`svc.moveToTrash()`、`svc.renameEntry()`；HTTP 工具 `json/readBody/readBodyRaw/MAX_UPLOAD_BYTES`。
- **子插件挂载约定**：core 无 client，子插件均为"后端能力"，在 `src/index.ts` 中扩展 `ctx.privhub` 方法，供其他枢纽复用。
- **状态**：✅ 已实现（494 行）。新增子能力（如防病毒扫描）只扩展服务方法，不动现有逻辑。

### 3.2 privhub-shell · 页面骨架枢纽
- **职责**：提供 slot 容器（实际 25 个 slot 的消费方）+ manifest 聚合接口，其他插件按 slot 挂载 UI。
- **提供基座能力**：`GET /privhub/api/shell/manifest`（自动扫描 `plugins/*/client/manifest.json`，5s TTL 缓存 + view 冲突检测）；骨架页内联实现顶栏与布局。
- **子插件挂载约定**：
  - 图标栏类插件 → 在自身 manifest 声明 `barItems`（slot: `app-iconbar`），由骨架统一渲染；
  - 树/面板/预览类 → 各自挂 `tree`/`panel`/`preview`；
  - 顶栏类 → `project-tabs` / `user-area` / `auth`。
- **状态**：✅ 已插件化。`privhub-shell/client/index.js` 提供 `project-tabs`（顶栏项目横排）/ `user-area`（用户区：徽章/头像/退出）/ `app-iconbar`（图标栏容器）/ `welcome`（欢迎页）/ `auth` 五组件；slot 机制支持同一 slot 多组件（user-area 与最近并存）；骨架页（`frontend/index.html`，955 行）为纯容器（slot 渲染）+ 导航状态机（`window.PrivHub.nav`）+ 插件桥（28 键）+ manifest 加载器。A2 面板拖拽/折叠**已实现**（`startResize` + `toggleSidebar` + localStorage 持久化）。

### 3.3 privhub-auth · 认证枢纽
- **职责**：登录/注册/会话 + 身份相关的预览增强。
- **基座能力**：后端 login/register/me/logout 已落地（4 路由）；client 已挂 `auth` slot，使用 `PrivHub.api/AUTH/logout`。
- **子插件挂载约定**：水印插件挂 `watermark` slot（见 4.2）。
- **状态**：✅ 后端+client 已实现。

### 3.4 privhub-admin · 权限枢纽
- **职责**：用户/角色/项目权限 + 审计与细粒度 ACL。
- **基座能力**：后端用户管理接口已落地（6 路由）；client 已挂 `admin` slot（全宽视图形态），并在图标栏声明"用户管理"入口（adminOnly）。
- **子插件挂载约定**：审计（`admin-audit` / `admin-audit-panel`）、ACL（`admin-acl` / `svc-acl`）作为独立插件，复用 `admin`/`acl`/`audit` slot 或 `barItems` 图标（均 adminOnly）。
- **状态**：✅ 后端+client 已实现；审计日志/ACL/审计面板均已落地。

### 3.5 privhub-files · 文件管理枢纽
- **职责**：目录树/文件面板/预览/上传，以及知识库主线（编辑、检索、图谱、标签、模板、导出、知识库视图、智能体 API 等）。
- **基座能力**：后端 10 路由已落地（projects/list/preview/preview-raw/download/upload/mkdir/delete/rename/move），全部复用 `ctx.privhub`，含路径安全与权限判定。
- **子插件挂载约定**：V3 布局挂 `tree`+`panel`+`preview`；上传/队列挂 `upload`/`upload-queue`；知识库类各自挂对应功能视图 slot（`md-editor`/`kg`/`tags`/`template`/`wiki`/`search-view` 等），零新增存储。
- **状态**：✅ 后端 + client 均已落地（V3 由 `files-explorer-v3` 承载）；编辑/检索/图谱/标签/模板/导出/知识库视图/智能体均已实现。

### 3.6 privhub-trash · 回收站枢纽
- **职责**：列表/恢复/彻底删除/定时清理。
- **基座能力**：后端回收站接口已落地（4 路由，依赖 core 的 `moveToTrash` / `trash.json`），`ttlDays: 30`、`intervalHours: 6`。
- **子插件挂载约定**：`trash-ui` 作为其 client，挂 `trash-view`（视图形态）+ `barItems` 图标（角标 = 待恢复数）。
- **状态**：✅ 后端 + client 均已落地。

---

## 4. 功能插件规则

现状图例：✅ 已落地 · 🟠 部分落地 · ⬜ 未实现（需开发后端+client）。
档位图例：🟢 本轮 · 🟠 阶段三优先 · 🟡 后话 · ⚪ 基础。

### 4.1 shell 枢纽（页面骨架）

| 编号 | 功能 | 档 | 现状 | 实现规则 | 交互方式 |
| --- | --- | --- | --- | --- | --- |
| A1 | 工作区图标栏 | 🟢 | ✅ | `privhub-shell` 提供 `app-iconbar` 容器；图标来源 = 各插件 manifest `barItems`，骨架统一渲染 | 左侧窄条图标，hover 气泡显示标题，角标计数（如回收站未读数） |
| A2 | 面板可拖拽/可折叠 | 🟢 | ✅ | 骨架自带布局能力（`startResize` 分隔条拖拽 + `toggleSidebar` 折叠，宽度持久化到 localStorage） | 拖动面板边界调宽；双击/折叠箭头收起左面板 |
| A3 | 内容区多标签页 | 🟢 | ✅ | `files-explorer-v3` 自带文件级标签栏，状态存 sessionStorage（**按用户名分 key**）；软上限 **30**，超限从头部淘汰 | 点击文件开新标签；标签可关闭/切换；刷新后恢复 |
| 收藏 | 文件/文件夹收藏（星标） | 🟢 | ✅ | `privhub-shell-favorites`（后端 1 路由 + `fav-view`）；数据存 `data/favorites.json` | ⋯菜单"收藏"；图标栏星标入口展开收藏列表，一键跳转原路径 |
| 最近 | 最近打开文件列表 | 🟢 | ✅ | `privhub-shell-recent`（后端 1 路由 + `user-area`）；记录存 `data/recent.json` | 顶栏头像下拉显示最近打开；点击直接定位并预览 |
| D25 | 系统设置面板 | 🟢 | ✅ | `privhub-shell-settings`（后端 1 路由 + `settings` slot）；设置存 `data/settings.json`（主题/默认视图/上传限制，当前 light/grid/2048MB） | 点齿轮开设置视图，改主题/默认视图即时生效，上传限制写回后端校验 |
| — | 欢迎页 / 引导 | 🟢 | ✅ | `privhub-shell` 的 `welcome` 组件（未选项目时的空态引导） | 未选项目时左侧栏显示项目列表，主区保持干净 |

### 4.2 auth 枢纽（认证）

| 编号 | 功能 | 档 | 现状 | 实现规则 | 交互方式 |
| --- | --- | --- | --- | --- | --- |
| 登录/注册 | 登录/注册/会话 API | ⚪ | ✅ | 后端 login/register/me/logout 已落地；client 已挂 `auth` slot，**不动** | 未登录全屏 auth；登录后进入骨架；注册默认普通用户仅"公共"项目 |
| 水印 | 数字水印 | 🟢 | ✅ | `privhub-auth-watermark`（后端 1 路由 + `watermark` slot，能力由 `svc-watermark` 提供） | 预览任何文件时右下角显示"用户@时间"半透明水印 |

### 4.3 admin 枢纽（权限）

| 编号 | 功能 | 档 | 现状 | 实现规则 | 交互方式 |
| --- | --- | --- | --- | --- | --- |
| 权限API | 用户/角色/项目权限 API | ⚪ | ✅ | 后端用户管理接口已落地（6 路由）；client 已挂 `admin` slot + 图标栏入口（adminOnly），**不动** | 图标栏"用户管理"开视图：表格增删改、重置密码、项目勾选 |
| B13 | 审计日志 | 🟢 | ✅ | `privhub-admin-audit`（后端 3 路由，能力由 `svc-audit` 提供）：写操作用户/动作/项目落 JSONL，保留 60 天；CSV 导出接口 | 后台静默记录，界面由"审计面板"呈现 |
| ACL | 细粒度 ACL | 🟠 | ✅ | `privhub-svc-acl`（规则引擎）+ `privhub-admin-acl`（**守卫**：包装 `svc.route`，`GUARD_PATHS` 管辖 37 条文件路由，per-method 裁决；body 类路由先读 JSON 判定后用 PassThrough 重放）；client 挂 `acl` slot | 管理员对文件/目录设"allow/deny/read"三档覆盖规则，子项继承（路径最具体优先） |
| 审计面板 | 审计日志可视化 | 🟠 | ✅ | `privhub-admin-audit-panel`（纯前端，挂 `audit` slot）；调审计接口，前端按时间/操作/用户/项目筛选 | 图标栏"审计"开视图：时间线列表 + 四维筛选 + 导出 CSV |

### 4.4 trash 枢纽（回收站）

| 编号 | 功能 | 档 | 现状 | 实现规则 | 交互方式 |
| --- | --- | --- | --- | --- | --- |
| B9 | 回收站 | ⚪ | ✅ | 后端 `privhub-trash`（4 路由，30 天 + 6 小时定时清理）；client `privhub-trash-ui`（**纯前端**，挂 `trash-view`）+ `barItems` 角标 | 图标栏垃圾桶入口开回收站视图；逐项恢复/彻底删除，管理员可清空 |

### 4.5 files 枢纽（文件管理）

| 编号 | 功能 | 档 | 现状 | 实现规则 | 交互方式 |
| --- | --- | --- | --- | --- | --- |
| B6 | 目录树 + 文件面板 | 🟢 | ✅ | `privhub-files-explorer-v3` 挂 `tree`+`panel`（1649 行单文件，含树缓存/标签栏/内容渲染/详情面板/⋯菜单/移动选择器/行内重命名/lightbox，见 F4 待拆分） | 左树展开项目/子目录；中面板显示当前目录列表；表头点击排序 |
| B7 | 文件预览 | 🟢 | ✅ | 后端 preview/preview-raw 已落地；client 挂 `preview`；Office 由 `files-office` / `files-office-ui` / `files-office2` 三档承载（Markdown 转换 / 人工编辑 / 原生观感+独占锁） | 打开文件在中间内容区渲染；右侧详情面板显示类型/大小/时间/路径 |
| B8 | 搜索（文件名） | 🟢 | ✅ | `privhub-files-search`（后端 1 路由 + `search-view`），复用 `listFiles` 递归；**必须带 project 参数**（防全局越权感） | 顶栏搜索入口开视图；输入即筛选当前项目文件 |
| B10 | 批量操作 | 🟢 | ✅ | 复用 delete/rename/move；client 行首多选 + 顶部批量工具栏 | 勾选多个 → 批量移动/删除/下载 |
| B11 | 拖拽上传 + 递归上传 | 🟢 | ✅ | 后端 upload 已落地（raw body ≤2GB，同名覆盖）；client `privhub-files-upload`（纯前端，挂 `upload`）拖拽整个文件夹递归建目录并上传 | 拖文件夹进面板 → 保持目录结构上传 |
| B12 | 上传进度队列 | 🟢 | ✅ | `privhub-files-upload-queue`（纯前端，挂 `upload-queue`）逐条进度，失败重试 | 上传时浮现队列抽屉，进度条 + 失败重试按钮 |
| C14 | Markdown 在线编辑 | 🟠 | ✅ | `privhub-files-edit-md`（后端 4 路由 + `md-editor` slot）：frontmatter + 双链 + 版本历史 20 版 + 冲突检测 | 打开 .md 进编辑视图，左编辑右预览，Ctrl+S 保存生成版本 |
| C15 | 内容全文搜索 | 🟠 | ✅ | `privhub-files-fulltext`（后端 1 路由）：BM25 + CJK bigram 索引，snippet 高亮，项目内检索 | 搜索视图切换"文件名/全文"，全文返回命中片段 |
| C17 | 知识图谱 | 🟠 | ✅ | `privhub-files-kg`（后端 1 路由 + `kg` slot）：扫描双链/标签构建关联图 + 社区发现 | 图谱视图以节点图展示文档关联，点击节点定位文件 |
| 标签 | 文件标签/自定义元数据 | 🟠 | ✅ | `privhub-svc-meta`（能力）+ `privhub-files-tags`（后端 3 路由 + `tags` slot），元数据存 `data/meta.json` | ⋯菜单打标签（联想已有标签）；tags 视图按标签筛选 |
| 模板 | 页面模板 | 🟠 | ✅ | `privhub-files-template`（后端 1 路由 + `template` slot）；模板库存 `data/templates.json` | 新建文档选模板（会议记录/产品需求/工作日志等）→ 在当前目录创建 .md |
| 导出 | 页面导出 | 🟠 | ✅ | `privhub-files-export`（后端 1 路由）：md → HTML/PDF/Word | 文档菜单"导出"下载 |
| 知识库视图 | 知识库视图 | 🟠 | ✅ | `privhub-files-wiki`（**纯前端**，挂 `wiki` slot）：复用 tree+权限零新增存储，渲染当前目录 README.md/index.md | 切到知识库视图，目录即站点，README 作首页，双链可点击定位 |
| C22 | 智能体外部 API/MCP | 🟡 | ✅ | `privhub-files-agent`（19 路由：`pha_` 密钥 / 专属空间 / 配额限流 / 版本快照 / 幂等）+ `privhub-files-office-ai`（4 路由，Office 读写）；受项目权限约束 | 对外暴露受控 API；仅 admin 可启用；方案见《PrivHub-AgentAPI-*》 |
| — | HTML 内网发布 | 🟠 | ✅ | `privhub-files-publish`（后端 3 路由 + `office-editor` 入口）：免登录只读分享链接（有效期/撤销），存 `data/publish.json` | 文件菜单"发布"，生成链接与二维码 |
| — | 邀请链接 | 🟠 | ✅ | `privhub-files-invite`（后端 5 路由 + `office-editor` 入口），存 `data/invites.json` | 生成永久/限时邀请码，同事用码自助加入项目 |
| — | 文档批注评论 | 🟠 | ✅ | `privhub-files-comments`（后端 3 路由 + `office-editor` 入口），存 `data/comments.json` | md 文档选区评论、高亮锚点、回复线程、状态流转 |
| — | 通用版本历史 | 🟠 | ✅ | `privhub-files-versions`（后端 3 路由 + `office-editor` 入口），存 `data/versions.json` | 每文件 20 版快照/列表/预览/恢复 |
| — | 数据看板 | 🟠 | ✅ | `privhub-files-dataview`（后端 1 路由 + `office-editor` 入口）：HTML 页面 + xlsx 双向编辑（`ph-table`） | 数据表页面模板，表格内直接编辑 |
| — | 自动备份 | 🟠 | ✅ | `privhub-git-backup`（后端 3 路由）：把 `data-files/` 镜像为本地 git 裸仓（`data/git-backup/`） | 自动 + 手动触发，保留历史版本 |
| — | RAG 检索问答 | 🟠 | ✅ | `privhub-svc-rag`（14 路由 + `rag-view`）：语料治理（解析/去重/策展）+ BM25/向量混合检索 + LLM 问答；`sqlite-vec` 向量库（`data/rag-corpus/vectors.db`） | AI 工具总台视图：语料仓库/总览/待裁决/模型接入/向量化/问答/Key 管理 |
| 检索引擎 | 全文检索引擎（外部） | 🟡 | 🟠 | 未引入 Meilisearch / SQLite FTS5；当前为自研 BM25+bigram（`svc-search`/`files-fulltext`）+ sqlite-vec 向量检索 | 若大规模语料出现性能问题再替换索引源，前端无感 |
| 协同 | 多人实时协同编辑 | 🟡 | ⬜ | 仅 `privhub-svc-collab` 骨架（会话/补丁上限），无 CRDT/OT、无协同光标 | 需评估低配 Windows 风险后再立项 |
| 引用图 | 页面间引用关系图 | 🟡 | 🟠 | 双链关系已由 `files-kg` 以图谱形式呈现；独立"反向链接"侧栏面板未做 | 文档侧栏显示"反向链接"列表 |

### 4.6 core 枢纽（共享服务）

| 编号 | 功能 | 档 | 现状 | 实现规则 | 交互方式 |
| --- | --- | --- | --- | --- | --- |
| 持久化 | JSON 存储（users/sessions/trash …） | ⚪ | ✅ | core 服务已实现，**不动**；经 `svc-storage` 加密落盘（`PHENC1`） | 无直接 UI，被各域复用 |
| 权限引擎 | 权限判定（角色×项目，目录树继承） | ⚪ | ✅ | `canAccess/visibleProjects` 已实现，**不动**；ACL 插件在其上扩展 | 无直接 UI |
| 防病毒 | 防病毒扫描 | 🟡 | ⬜ | 新增可选后端插件：调用 ClamAV 外部进程扫描上传文件，命中则拦截并写审计 | 后台扫描，仅 admin 可启用；失败不影响主流程 |

---

## 5. 新增插件接入 SOP（证明"想到功能就加插件"）

以"新增一个叶子插件"为例，全程**不修改骨架与其他插件**：

1. 在 `plugins/` 下建 `privhub-<功能>/`。
2. `package.json`：声明插件元信息（沿用既有插件写法）。`cordis.patch.yml` **不需要**（纯代码装配，历史遗留件不参与运行）。
3. `src/index.ts`（仅当需要后端）：`export const name = 'xxx'; export const inject = ['privhub']; export function apply(ctx){ const svc=ctx.privhub; svc.route('/privhub/api/xxx', ..., 'xxx') }`，**复用 core 服务做持久化与权限**，不另起存储。
   - 若新路由属于**文件级操作**（带 project/path），需在 `privhub-admin-acl` 的 `GUARD_PATHS` 白名单登记裁决动作，否则不经 ACL 守卫（见《改进建议》F2）。
4. `client/manifest.json`：`{ id, title, icon, description, slots:[...], barItems?:[{icon,title,slot,view,adminOnly}] }`。
5. `client/index.js`：`export default { id, slots: { 目标slot: Vue组件 } }`，组件内 `const { api } = window.PrivHub` 调后端。
6. 重启服务；shell 的 manifest 聚合（5s TTL 缓存）自动发现新插件，对应 slot 渲染，**无需改骨架一行代码**。

删除同理：移除该插件目录即卸载，其余功能不受影响（可插拔）。

> 注意：**L1/L2 插件例外**——它们必须手工登记进 `src/main.ts` 的 `CORE_PLUGINS` 清单并按依赖顺序 `mount()`，新增/移除需改 `main.ts`（见《改进建议》E1）。

---

## 6. 代码修改纪律（2026-09-05 事故教训固化）

> 事故回放：批量注入中文声明时经系统 PowerShell 全文件读改写，6 个插件被双重编码损坏（UTF-8→ANSI 误读→乱码写出），agent 插件需完整重建。git 恢复了 5 个存量文件，损失可控。

1. **批量改代码禁止经系统 PowerShell 读改写含中文文件**：本机 pwsh 以 ANSI(GBK) 解码管道，`Get-Content -Raw` + `WriteAllText` 组合会把整文件的中文双重编码损坏。
   - 允许：*edit/write 工具*（可靠 UTF-8）；纯 ASCII 替换的 node 脚本（`readFileSync`/`writeFileSync` UTF-8）；git 恢复。
   - 禁止：pwsh `Get-Content -Raw` + `[IO.File]::WriteAllText` 搬运含中文文件；pwsh 命令参数/替换串中夹带中文。
2. **改前建基线**：批量操作前 `git status` 确认；**未跟踪新文件先 `git add`**（必要时提交），保证任何损坏可一键 `git checkout` 恢复。
   - ⚠️ 本机 `git` **不在 PATH**，命令行走不通 git；此条纪律需在装有 git 的环境执行，或先修复 PATH。
3. **改后即验**：批量改动后 `git diff --stat` 抽查 + node 校验（UTF-8 合法、无 U+FFFD、无乱码字特征）。
4. **中文串注入**：任何带中文字符串的注入（声明/注释/文案）一律用 edit/write 工具，或 node 脚本写成 `\uXXXX` 转义（命令保持纯 ASCII）。

---

## 6.1 环境操作纪律（2026-09-11 事故教训固化）

> **事故回放**：AI 助手在未获授权的情况下，擅自将开发源码同步到生产部署包 `deploy/privhub-deploy/`，
> 并启动了生产实例。所幸本机仅作开发用途，未造成线上事故。
>
> **若该机同时承载生产服务，后果是**：正在运行的生产进程代码被替换 → 线上服务停机、局域网用户无法访问；
> 且 `data/` 与 `data-files/` 若被一并覆盖，**旧密钥与数据不匹配将导致数据永久无法解密**。

### 铁律（任何情况下不得违反）

5. **生产环境同步必须获得用户明确授权**：
   - **绝不允许**由助手自行决定同步/覆盖生产部署包，或启动生产实例；
   - 正确顺序：**开发环境（3180）改完并测试通过 → 向用户报告 → 用户明确指示"同步生产" → 才执行同步**；
   - 同步前必须确认目标 `data/`、`data-files/`、`secret.key` **不被覆盖**；
   - 生产端口为 **3181**，开发端口为 **3180**；不确定时先问，不要猜。
6. **开发与生产分离是硬性架构约束，不是建议**：
   - `privhub/` = 开发（可随意改、可重启）
   - `deploy/privhub-deploy/`、`deploy/privhub-prod/` = 生产部署产物（同步需授权）
   - 任何"顺手同步一下"的想法都必须先申请。
7. **只做被要求的事，不擅自扩大范围**：
   - 用户说"关掉生产、开开发"就只做这两件事；
   - **发现疑似 bug 时，先报告现象与证据，等用户决定是否修**，不要自行开工；
   - 需要变更时先说明"我建议做什么、为什么、影响是什么"，获批后执行。

### 配套教训：测试不能把 bug 固化为预期行为

8. **回归测试的断言必须反映"正确行为"，而非"当前行为"**：
   - 本次事故的直接成因之一：S16 修复后，测试断言写成
     `未登录拉取 manifest 应返回 401` —— 这**恰好把"登录界面加载不出来"的死锁写成了预期行为**，
     导致 84 项测试全部通过、缺陷却流入交付物。
   - 新增/修改断言前自问：**这条断言写的是"应该如此"还是"现在如此"？**
   - 涉及"权限收紧"类改动时，必须同时补一条**端到端可用性**测试
     （例：未登录用户能否走完"打开页面 → 渲染登录框 → 成功登录"）。

---

## 7. 与知识图谱的对应关系

本文档与《PrivHub-知识图谱.html》共同描述插件体系：图谱管"有哪些、挂哪"，本文档管"怎么实现、怎么交互"。

> ⚠️ 《PrivHub-知识图谱.html》尚未随本次核对更新（其节点数仍为 V2 时代的"34 个叶子插件 + 6 大枢纽"）；实际为 **48 个插件目录**。
> 后续新增功能时需同时同步：图谱加节点、本文档加一行、`docs/PrivHub-架构与功能说明.md` 第 2.1 节更新计数。
