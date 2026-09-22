# PrivHub — 项目架构与功能说明（V3 现状快照）

> 版本：**V3 现状快照 · 复核 2026-09-21（v3.1.1）**（历次核对：2026-09-06 / 09-11 / 09-14 v3.1.0）· docs/ 根目录，持续维护
> 2026-09-21 复核结论：v3.1.0→v3.1.1 为缺陷修复批次（A 批 5 条后端致命 bug、预览上限 512KB→10MB、内容区止血、扩展名白名单收敛），
> **插件数（50）/ 路由数（112）/ 插件装配结构均无变化**，本快照正文结构仍然有效；新增问题与遗留项以《PrivHub-待改进清单-2026-09-21.md》为准。
> 本次复核方式：直接扫描 `privhub/plugins/`、`privhub/src/`、`privhub/frontend/index.html`、
> `privhub/data/` 与最近一次启动日志（`privhub/server-dev.log`，2026-09-06 09:39），逐项替换文档数字。
> **核对口径**：插件数 = `privhub/plugins/` 下非 `_` 开头目录数；路由数 = 各插件 `src/`（含 `server/`）中 `.route(` 调用数；
> slot 数 = 各 `client/manifest.json` 的 `slots` 并集；视图数 = `barItems[].view` 并集。
> 代码位置：`privhub/`（纯 Cordis 插件架构，零 DSH 依赖）· 开发环境 3180 · 生产环境 3181（`deploy/privhub-deploy/`）
> 历史文档归档：`docs/v2/`（V2 时代全部方案/计划/报告）· `docs/v1/`（最早归档）

---

## 一、项目定位

**私域枢纽（PrivHub）** — 公司内部文件管理系统：局域网内所有终端通过浏览器访问宿主机共享文件夹，实现文件浏览、上传、下载、管理与知识库能力。

- **底座**：`@deepseek-ai/cordis`（4.0.1）+ 自研 webServer，完全独立于 DSH，`node --import tsx/esm src/main.ts --port N` 启动
- **形态**：插件化分层架构（L1 六枢纽 → L2 能力 Service → L3 功能插件），前端 Vue3 全局构建（无打包），插件 client 经 manifest 动态挂载
- **宿主机**：Windows 低配原生环境，实测运行 Node **v24.21.0**

## 二、总体架构

### 2.1 插件全景（**50 个插件目录**，2026-09-21 v3.1.1 复核：数量与结构无变化）

`privhub/plugins/` 下非归档目录共 **50 个**（另有 `_retired-v2/` 3 个已退役目录，以 `_` 前缀排除，不参与装配）。

**按装配方式拆解（权威依据 = `src/main.ts` + 启动日志）**：

| 装配方式 | 数量 | 说明 |
|---|---|---|
| 核心清单手动挂载（`CORE_PLUGINS`，main.ts 硬编码 17 项） | 17 | L2 能力 Service 10 个 + L1 六枢纽 6 个 + `admin-acl` 守卫 1 个（必须早于业务路由注册） |
| L3 自动发现装配（扫描到 `src/index.ts` 即挂载） | 26 | 含 `svc-rag`（命名 `svc-` 前缀但装配层级实为 L3，见改进清单 B2） |
| 纯前端插件（只有 `client/`，无 `src/index.ts`） | 7 | `admin-audit-panel` / `admin-console`※ / `files-upload` / `files-upload-queue` / `files-wiki` / `shell-agent-console` / `trash-ui` |

→ **43 个含 `src/index.ts` + 7 个纯前端 = 50**。其中 **32 个插件带 `client/manifest.json`**（前端可挂载）；
43 个有 `src/` 的插件里，**31 个真正注册 HTTP 路由**，其余仅提供注入能力或纯前端。

> ※ `admin-console`（v3.1.0 新增）是**纯前端插件**：无 `src/` 故不参与服务端装配，只提供
> 管理控制台外壳与 `admin-nav` / `admin-*` slot 契约。
>
> `privhub-shell` 属特例：服务端代码在 `server/index.ts`（非 `src/index.ts`），故计入「纯前端」列的统计口径，
> 但它实际提供 manifest 聚合路由。

**按分层归类**：

```
┌─────────────────────────────────────────────────────────────┐
│  L3 功能插件（32 个 = 26 自动发现 + 5 纯前端 + admin-acl 守卫） │
│  admin-acl(细粒度ACL) admin-audit(审计数据)                   │
│  admin-audit-panel(审计UI) auth-watermark(水印)               │
│  files-agent(智能体API) files-comments(批注)                  │
│  files-dataview(数据看板) files-edit-md(MD编辑)               │
│  files-explorer-v3(V3布局：树+标签页+详情) files-export        │
│  files-fulltext(全文) files-invite(邀请链接) files-kg(图谱)    │
│  files-mdpage(md→HTML) files-office(读取) files-office-ai      │
│  files-office-ui(人工编辑) files-office2(原生观感+独占锁)      │
│  files-publish(内网发布) files-search files-tags files-template│
│  files-upload files-upload-queue files-versions(版本历史)      │
│  files-wiki git-backup(自动备份) shell-favorites              │
│  shell-recent shell-settings trash-ui svc-rag(RAG 总台)        │
├─────────────────────────────────────────────────────────────┤
│  L2 能力 Service（10 个，手动挂载）                           │
│  svc-storage(S7加密) svc-events(事件注册表) svc-audit(S1审计)  │
│  svc-acl(S2 ACL) svc-watermark(S3) svc-search(S4 搜索)       │
│  svc-meta(S5 元数据) svc-collab(S6 协同骨架) svc-office       │
│  svc-model(模型接入层)                                       │
├─────────────────────────────────────────────────────────────┤
│  L1 六枢纽 + 底座（6 个，手动挂载）                            │
│  core(用户/会话/文件核心) auth files trash admin shell(骨架)    │
│  webServer（自研 HTTP + 静态资源 + 插件 manifest 聚合）         │
└─────────────────────────────────────────────────────────────┘
```

**挂载顺序（`src/main.ts`）**：webServer → L2（S7 storage 最先，其余依赖它）→ core → adminAcl（包装 `svc.route`，必须在路由注册前）→ auth/files/trash/admin/shell → L3 功能插件自动发现（`CORE_PLUGINS` 清单外的插件）→ listen。

**最近一次启动日志实证**（`privhub/server-dev.log`，2026-09-06 09:39，晚于最后一次源码改动）：26 个 L3 插件全部发现并挂载成功，无失败项；唯一告警是 Node `fs.rmdir({recursive:true})` 的 DEP0147 弃用提示（`privhub/server-dev.err.log`）。

### 2.2 前端骨架（frontend/index.html，1100 行单文件 + Vue3 全局）

| 机制 | 实际现状（2026-09-14 v3.1.0 复核） |
|---|---|
| `window.PrivHub` 桥 | **骨架 26 个键 + 插件运行时追加**。骨架基座 12：`api` / `AUTH` / `THEME` / `applyTheme` / `logout` / `toast` / `bus` / `nav` / `fileIcon` / `previewImageUrl` / `previewPdfUrl` / `sortedEntries`；骨架扩展 14：`badges` / `manifests` / `barItems` / `loadBarItems` / `openBarItem` / `openAdmin`（=`openConsole`）/ `openSettings` / `openAcl` / `openAudit` / `openTags` / `openTemplate` / `openKg` / `openWiki`；插件运行时追加（实测 2 个）：`openRagDup` / `ragIntent`（svc-rag） |
| `window.PrivHub` 第二层鉴权 | 插件前端代码经 `/privhub-plugins/<名>/<文件>` 加载，**需有效会话**（v3.0.1 起）。仅放行登录框自身（声明 `auth` slot 的插件，与 manifest 分级同判据）。会话经 `privhub_sid` Cookie 传递（HttpOnly + SameSite=Strict）——浏览器 `import()` 子资源无法附加 `Authorization` 头；`Bearer` 通道保持不变 |
| slot 挂载 | 骨架按 `slots` 渲染；插件 client 导出 `export default { id, slots: { 槽名: Vue组件 } }`；**同 slot 可多组件**（数组累积）。插件实际声明的 slot 并集 **31 个**：`auth` `project-tabs` `user-area` `app-iconbar` `welcome` `tree` `panel` `preview` `upload` `upload-queue` `trash-view` `search-view` `fav-view` `settings` `admin` `acl` `audit` `tags` `template` `kg` `wiki` `rag-view` `md-editor` `office-editor` `watermark` `admin-console`（v3.1.0）`admin-tags` `admin-template` `admin-trash` `admin-settings`（v3.1.0，管理控制台内容区别名）；另有 `tabs` 仅骨架渲染、已无插件声明（`shell-tabs` 已退役进 `_retired-v2/`） |
| 多组件 slot | `office-editor` 挂 8 个插件（comments / dataview / invite / mdpage / office-ui / office2 / publish / versions）；`user-area` 挂 3 个（explorer-v3 / shell / shell-recent）；`auth` 挂 2 个（auth / shell） |
| `nav.activeView` | **单一视图状态源**（⑤ 视图化，llm_wiki 范式）。`setActiveView(v, opts)` 内置「同视图再点即回 files」的 toggle 语义，**`opts.noToggle` 可关闭该语义**（管理控制台专用：管理页之间切换不得被弹回文件页）。实际 **13 个视图**：`files` `trash` `search` `favorites` `settings` `admin` `acl` `audit` `tags` `template` `kg` `wiki` `rag` |
| manifest 加载链 | 骨架 `GET /privhub/api/shell/manifest`（shell 插件聚合，5s TTL 缓存 + A19 view 冲突检测）→ 逐插件 `import('/privhub-plugins/<目录名>/index.js')` → 按 slot 注册 |
| V3 布局 | explorer-v3 自带文件树（含文件 + ⋯ 菜单）+ 中央 VS Code 式标签页 + 右侧详情面板；md/txt 内嵌编辑 + office 浮层编辑；标签页软上限 **30**（超限从头部淘汰，见 `explorer-v3/client/tabs.js`） |
| **插件前端模块化**（v3.0.4） | 插件前端按职责拆成同目录多文件，**全部留在该插件目录内**（卸载插件则其前端一并消失）。范例：`explorer-v3/client/` 单文件 1628 行 → 12 个模块；`admin-console/client/` 16 个模块 / 1980 行。依赖方向严格单向、无环。骨架 `frontend/` 只做容器与总线（唯一主界面），不承载业务 UI |
| **管理控制台外壳**（v3.1.0） | `admin-console` slot + `#/admin/...` hash 路由；侧栏 240px（可折叠 64px）按职责分 4 组共 13 条；顶部栏 56px；内容区最大宽 1440px。`admin-nav` barItem = 进入控制台侧栏，`admin-*` slot = 内容区组件；**卸载插件 → 条目自动变「待接入」**。详见 §3.3 |
| 项目上下文 | 选项目后搜索/收藏/回收站均限定当前项目（服务端 visibleProjects 白名单兜底） |
| 持久化 | localStorage（token/主题/侧栏宽/字体档/**管理侧栏折叠态/管理详情列表宽/上次管理路由**）、sessionStorage（标签，按用户名分 key） |

### 2.3 后端路由面（**112 条路由 · 31 个插件**，v3.0.1）

- 全仓 `svc.route('...')` 注册 **112 条**（无重复路径），分布于 **31 个插件**（其余有 `src/` 的插件不注册 HTTP 路由，仅提供注入能力）。
- 路由数 Top：`files-agent` 20 · `svc-rag` 14 · `files` 10 · `admin` 6 · `files-invite` 5。
- **ACL 守卫覆盖面**：`admin-acl` 以白名单表 `GUARD_PATHS` 显式管辖 **37 条文件相关路由**（per-method 裁决 view/upload/edit/delete），并包装 `svc.route` 使之后注册的全部路由都经守卫函数（未列入白名单的 method 直接透传）。守卫于 2026-09-05 从 L1 扩展到 L3 写路由。

### 2.3b 核心概念：项目 / 个人空间 / 智能体沙箱（v3.0.1 新增）

三类顶层目录，语义严格区分：

| 概念 | 物理位置 | 可见性 | 索引 | 智能体权限 |
|---|---|---|---|---|
| **项目** | `data-files/<项目名>/` | 按账号授权；管理员可见全部项目 | 参与查重/向量化/全文索引 | **只读** |
| **个人空间** | `data-files/<真实姓名>/` | **仅本人**；管理员亦不可见（只有审计记录） | **全部排除** | 读写（= 沙箱） |
| 系统内部 | `data-files/.agents/`、`.trash/` | 以 `.` 前缀排除出项目枚举 | 排除 | — |

**个人空间**（`users[].personalDir` 登记）：

- 注册时按**真实姓名**自动创建；姓名全局唯一（与其他账号姓名、其他账号个人空间名、
  `data-files` 下已存在的同名顶层目录查重），冲突时提示改用「姓名-部门」
- 显示名与目录名 **live-bound**：改名时文件夹同步改名（先改磁盘、后落盘账号，落盘失败回滚）
- **旧名退休**（`retiredPersonalDirs`）：改过的旧名永久保留并维持归属，`canAccess` 继续拒绝所有人
  （含管理员），也不可再被注册

> 为什么需要「退休」：个人空间的数据不止在文件夹里，还散落在一批**以目录名为键、只用 `canAccess` 把关**
> 的存储中（`versions.json` 存的是文件正文、`comments.json`、`meta.json`、全文索引、回收站…），
> 而 `canAccess` 对管理员是「任意合法名字都放行」。旧名一旦释放，① 管理员可按旧名读到私人文件的
> 历史版本正文；② 若有人注册成同名，新人会继承旧名的可见性读到前任内容。退休一条规则关掉整类越权。

- **系统永不自动删除**（删账号、删项目都不动它）
- 权限收敛点集中在 `privhub-core` 的 `allProjects` / `visibleProjects` / `canAccess`，
  另加 `indexableProjects`（索引范围 = 项目）供查重/向量化/全文索引共用，避免多处口径漂移

**智能体沙箱 = 绑定账号的个人空间**（v3.0.1 起，原为 `.agents/<用户>/` 隐藏目录）：

- 项目对智能体**始终只读**，写项目一律 `403 AGENT-4032`
- 沙箱缺位（账号未开通个人空间）→ `403 AGENT-4036`，显式失败而非静默落到别处
- 沙箱名不出现在 `/me`、`/projects` 的项目清单里

### 2.4 数据与安全

- **S7 静态加密**：文件头 `PHENC1` + iv + tag；审计块 `PHAUD1`。密钥 `data/secret.key`（32B）或环境变量 `PRIVHUB_SECRET`。宿主机直接打开 `data-files/` 无法读取明文。
- **⚠️ 加密并非全覆盖（2026-09-21 实测更新）**：`data/` 下系统 JSON 绝大多数为 `PHENC1` 密文；
  **仍为明文的剩 3 个**：`comments.json`、`publish.json`、`invites.json`（文档批注、发布链接、邀请码——后两者含免登录凭据）。
  ~~`settings.json`~~ 已收口：`privhub-shell-settings/src/index.ts:43-57` 改走 `ctx.storage`，磁盘实测文件头为 `PHENC1`。
  旧版文档「所有落盘数据均已加密」的说法不准确；剩余 3 类数据在宿主机上仍可直接读取（待办见《待改进清单-2026-09-21》B 组 D10）。
- **权限三层**：角色（admin/user）→ 项目范围（visibleProjects 白名单）→ 文件级 ACL（`acl.json` 规则，view/upload/download/edit/delete；「路径最具体优先，同深度拒绝优先」，子路径继承父目录）。
- **审计闭环**：写操作入审计（JSONL）+ 可视化面板（F15）+ CSV 导出，60 天保留。
- **`data/` 实际文件**（2026-09-11 盘点，共 20 个 JSON + 5 个子目录/其他）：
  - 状态类：`users.json`、`sessions.json`、`trash.json`、`acl.json`、`meta.json`、`favorites.json`、`recent.json`、`versions.json`、`templates.json`、`comments.json`、`invites.json`、`publish.json`、`settings.json`、`office-api.json`
  - 智能体类：`agent-keys.json`、`agent-quota.json`、`agent-ratelimit.json`
  - RAG 类：`model.json`、`rag-curation.json`、`rag-vectorize.json` + 目录 `rag-corpus/`（语料 jsonl + `manifest.json` + `vectors.db` sqlite-vec 向量库）
  - 其他：`audit.jsonl`、`secret.key`、`git-backup/`（git-backup 插件的裸仓镜像）、`agent-idem/`、`doc-versions/`、`export-tmp/`

## 三、功能全景

### 3.1 文件管理（核心，V3 布局）
| 功能 | 说明 |
|---|---|
| 目录树 + 文件面板 | 树同时显示文件与文件夹 + 每节点 ⋯ 菜单（详情/权限/收藏/下载/编辑/重命名/新建子文件夹/上传到该文件夹/删除）；中间栏仅列表视图（排序在表头点击）；可拖拽调宽/双击折叠 |
| 上传/下载 | 拖拽 + 整文件夹递归；批量移动/删除/下载；上传进度队列 + 失败重试；多选批量操作 |
| 文件预览 | 图片/文本/PDF/Office（docx/xlsx/pptx → 预览或 Markdown）；右侧详情面板（类型/大小/时间/项目/路径 + 标签 + 功能按钮） |
| 回收站 | 30 天保留 + 恢复/彻底删除/清空 + 项目上下文过滤 |
| 收藏/最近打开 | 按项目过滤 + 权限校验（越权 403） |
| 多标签页 | VS Code 式文件级标签栏（explorer-v3 自带），刷新恢复，**按用户名隔离**（防跨用户串项目），软上限 30 |
| 内嵌编辑 | txt/md/json 等文本文件打开即编辑（Trae 式），Ctrl+S 保存；md/Office 编辑入口统一在「✏️ 编辑」 |
| 状态栏 | 「共 N 项 · 已选 M 项 · 合计大小」 |
| 增强能力 | 行内重命名、复制副本、移动选择器、图片 lightbox、新建向导（格式→命名→目录）、查重（M2.6 起并入 AI 工具「🔁 查重」，文件页顶栏直达）、邀请链接、版本历史（20 版）、md→HTML 页面、内网发布、md 批注评论、数据看板 |

### 3.2 知识库主线
| 功能 | 说明 |
|---|---|
| MD 在线编辑（F16） | frontmatter + 双链 + 版本历史（20 版）+ 冲突检测；txt 等纯文本也支持内嵌编辑 |
| 全文搜索（F17） | BM25 + CJK bigram，snippet 高亮，**项目内检索**；搜文件名的普通搜索走 files-search |
| 知识图谱（F18） | 双链+标签关联图，社区发现，点击节点定位文件 |
| 标签（F19）/ 模板（F20） | 打标筛选；会议记录/需求等模板 + 管理 |
| 导出（F21） | MD → HTML/PDF/Word |
| 知识库视图（F22） | README.md 渲染为 Wiki 页，双链可点击定位 |
| RAG 问答 | svc-rag：语料治理（解析/去重/策展）+ BM25/向量混合检索 + LLM 问答（OpenAI 兼容模型接入 svc-model）；sqlite-vec 向量库 |
| 智能体接入 | `files-agent`（20 路由，`pha_` 密钥 / **沙箱=个人空间** / 配额限流 / 版本快照）+ `files-office-ai`（Office 智能体入口）；平台界面见 `shell-agent-console`；方案与接入见《PrivHub-AgentAPI-*》 |

### 3.3 管理能力
| 功能 | 说明 |
|---|---|
| **管理控制台外壳**（v3.1.0） | 进入管理相关视图渲染统一外壳（顶部栏 56px + 左侧管理导航 + 内容区）。管理路由走 hash（`#/admin/access/acl` 等），**刷新保持位置**，「返回文件」后再进入回到上次管理页。侧栏按**管理员职责**分四组 13 条：概览 / 用户与权限（用户管理·项目权限·ACL·智能体密钥）/ 内容治理（标签·模板·发布链接·回收站）/ 系统运维（审计·系统设置·自动备份·水印）。统一空状态·骨架屏·错误重试·危险操作确认（高风险需输入关键词）·Toast·批量操作栏；响应式 1280 / 1024 / 768 三档。实现见 `plugins/privhub-admin-console/client/`（16 模块） |
| 用户管理 | 增删改查/角色/项目权限/重置密码（既有界面，已嵌入控制台「用户与权限 > 用户管理」） |
| 细粒度 ACL | 文件/目录级规则（继承/覆盖），管理 UI；守卫管辖 37 条文件路由 |
| 审计面板 | 时间/操作/用户/项目四维筛选 + 实时刷新 + CSV |
| 系统设置 | 主题（浅/深）/默认视图/上传限制（默认 `settings.json`：light / grid / 2048MB） |
| 数字水印 | 预览叠加用户名+时间，防截屏外泄（控制台内为**只读状态页**，无配置接口） |
| 自动备份 | `git-backup`：把 `data-files/` 镜像为本地 git 裸仓（`data/git-backup/`），3 条路由；控制台「自动备份」页展示可用性并可手动触发一次提交 |
| 发布链接管理 | 控制台「内容治理 > 发布链接」列出全部免登录分享链接并可复制/撤销（复用既有 publish 接口，**未新增后端**） |
| 项目权限矩阵 | 控制台「用户与权限 > 项目权限」只读矩阵（谁能访问哪些项目）；修改归属仍走「用户管理」 |

**管理入口映射（v3.1.0，既有入口一个不少）**：

| 既有入口 | 进入方式 | 管理路由 |
|---|---|---|
| `openAdmin()` | 图标栏 🛠️ 管理控制台 | 上次停留位置（默认 `#/admin/overview`） |
| `openAcl()` | 直达 ACL 视图（外壳自动高亮） | `#/admin/access/acl` |
| `openAudit()` | 直达审计视图 | `#/admin/ops/audit` |
| `openSettings()` | 直达设置视图 | `#/admin/ops/settings` |
| `openTags()` / `openTemplate()` | 直达标签/模板视图 | `#/admin/content/tags` / `#/admin/content/templates` |
| `shell-agent-console` | 侧栏「用户与权限 > 智能体密钥」 | `#/admin/access/agents` |
| `trash-ui` | 侧栏「内容治理 > 回收站」 | `#/admin/content/trash` |

> 图标栏底部管理组现为「🛠️ 管理控制台 + ⚙ 设置」两项；用户管理 / 权限 / 审计三个图标
> 已收进控制台侧栏（功能入口未删除，只是不再重复占图标栏）。
>
> ⚠️ **已知缺陷（2026-09-18 实测，待修，见待改进清单 D-04）**：`privhub-admin` 与 `privhub-admin-console`
> 都声明了 `view:"admin"`，底部项用 `find()` 取第一个，故图标栏**实际显示为 👥「用户管理」**，
> 点击进入的却是整个管理控制台；服务端冲突告警文案也与实际相反。上表描述的是**设计意图**，以代码修复后为准。

### 3.4 交互体验（V2/V3 演进）
| 项 | 说明 |
|---|---|
| 功能面板视图化 | 功能面板 = main 全宽视图（llm_wiki 范式），单一 activeView，天然互斥无残留（共 13 个视图，其中 9 个功能面板：settings/admin/acl/audit/tags/template/kg/wiki/rag） |
| V3 布局（VS Code 范式） | 侧边栏树含文件 + ⋯ 菜单；中央文件级标签页 + 内容区（撑满中间栏）；右侧详情面板（选中/打开即显示） |
| 项目选择栏 | 未选项目时左侧栏显示项目列表（选中后变目录树），主区保持干净 |
| 项目上下文贯穿 | 搜索/收藏/回收站限定当前项目；未选项目空态引导，杜绝跨项目混淆 |
| 顶栏项目下拉 | 项目多时不溢出；图标栏 toggle 开合 + 高亮跟随 |
| 原生对话框清零 | alert → toast；prompt → 骨架级内联输入模态；删除确认写明后果；复制到剪贴板（copy API） |
| 引导体系 | 各区块标题旁 ⓘ 帮助卡（这是什么/使用流程/提示）+ 页签顶部「💡 快速上手」引导条 + 教程卡。⚠️ **2026-09-18 实测落差**：全客户端仅 `privhub-svc-rag`（AI 工具）一个插件真正实现了就地引导，其余 12 个视图均无（见待改进清单 JT-18） |

## 四、安全修复记录（近期重点）

| 漏洞 | 修复 |
|---|---|
| 回收站 restore/purge 越权（P1-1） | 条目归属校验（deletedBy）+ 项目权限 canAccess + ACL edit 裁决 |
| 收藏/最近跨项目展示 | GET 按 visibleProjects 过滤；POST canAccess 校验（403） |
| 标签跨用户串项目 | sessionStorage 按用户名分 key + 恢复时可见过滤 + 点击前置校验 |
| 搜索全局越权感 | API 始终带 project 参数；未选项目不做全局查询 |

## 五、环境注意

- 本机 **`git` 不在 PATH**（`Get-Command git` 为空），工作区虽有 `.git` 目录但无法在命令行执行 git 操作；
  文档中涉及 `git rm` / `git status` / `git diff` 的纪律与步骤在本机不可直接执行（见《PrivHub-插件实现规则.md》第 6 节）。
- `data-files/` 下存在大量 `_*验证_*`、`_*测试_*` 命名的历史测试产物目录，随项目一起被 `git-backup` 镜像。

## 六、文档索引

### docs/ 根（V3 开发基础，持续维护）
| 文档 | 内容 |
|---|---|
| `PrivHub-架构与功能说明.md`（本文） | 项目定位 / 分层架构 / 插件全景 / 功能全景 / 安全修复记录（**当前状态基线**） |
| `PrivHub-需求文件.md` | 功能基线（四档：🟢🟠🟡⚪）+ 迭代记录 |
| `PrivHub-插件架构（Cordis 原理重搭）.md` | 架构设计、F/S 编号、挂载规则 |
| `PrivHub-插件实现规则.md` | 插件工程规范 + 实现现状 + 代码修改纪律（**当前状态基线**） |
| `PrivHub-改进建议.md` | **改进事项清单（当前有效）**：42 项（S/D/P/O/E/U/F），基于 2026-09-11 三路审计，含证据/影响/改法/验收 |
| `v2/PrivHub-改进需求清单（已归档）.md` | 上一版改进清单（24 项旧编号），**已被《改进建议》取代**，仅作历史对照 |
| `PrivHub-插件架构脑图.html` | 插件关联可视化 |
| `PrivHub-AgentAPI-智能体接口方案.md` | 智能体外部 API/MCP 企业级方案（v3.1 定稿） |
| `PrivHub-AgentAPI-接入指南.md` | 智能体接入步骤 + 首次接入 Skill |
| `PrivHub-RAG-方案.md` | RAG 方案（数据治理/模型接入/检索问答） |
| `PrivHub-交互融合方案-整体设计.md` | 交互融合整体设计 |
| `需求对照核查报告-2026-08-30.md` | 需求对照核查（2026-08-30） |

### docs/v2/（V2 历史归档）
| 文档 | 内容 |
|---|---|
| `生产计划表-阶段三-批次②.md` | F13–F22 + S6 里程碑（10 步全部 ✅） |
| `PrivHub-物理拆分映射表.md` | 物理目录 ↔ 逻辑功能映射 |
| `设计与实施 — 私域枢纽（PrivHub）.md` | 总体设计与实施 |
| `功能完成度盘点-2026-08-30.md` | 需求基线完成度对照 + 待办优先级 |
| `交互改进-项目选择与文件视图三栏化.md` / `项目上下文贯穿方案.md` | 交互改造方案（已实施） |
| `侧边栏优化方案-llm-wiki参考.md` / `侧边栏显示隐藏互斥逻辑.md` / `视觉升级计划-参照llm-wiki.md` | 布局/视觉方案（视觉升级待实施） |
| `生产审查报告-2026-08-28.md` | 审查修复记录 |
| `PrivHub-插件架构方案.md` 等 | 早期方案与学习笔记 |

## 七、验证与部署

```bash
# 开发（在 privhub/ 目录；start.bat 已内置 PRIVHUB_ROOT，双击即用）
cd privhub
$env:PRIVHUB_ROOT='G:\program\dsh-SQL\privhub\'
node --import tsx/esm src/main.ts --port 3180

# 生产（独立部署包）
deploy/privhub-deploy/
node --import tsx/esm src/main.ts --port 3181     # 或双击其中的 start.bat 3181
```

**⚠️ 部署包状态（2026-09-11 复核：落后于开发源码）**

| 项 | `privhub/`（开发） | `deploy/privhub-deploy/`（生产） |
|---|---|---|
| 插件目录数 | 48 | 45 |
| `svc-rag`（AI 工具总台） | ✅ 有 | ❌ **完全没有** |
| `src/main.ts` | 09-05 18:23 | 09-02 07:17 |
| `src/web-server.ts` | 09-06 00:17 | 09-02 08:05 |
| `frontend/index.html` | 09-06 09:13 | 09-04 00:01 |
| `explorer-v3/client/index.js` | 09-06 09:31 | 09-05 18:39 |

即：**3181 生产环境当前跑的是 09-02～09-05 的旧快照，不含 RAG 与最近一批修复**。上线前需重新同步 `src/ plugins/ frontend/` 三个目录（本次未处理，详见《PrivHub-改进建议.md》O1）。

**测试脚本说明（复核纠正）**：旧版文档引用的 `tests/_archive/project-tests/`
（`smoke-batch1.mjs` / `privhub-closedloop-test.mjs` / `run-all.mjs` / `verify-package.mjs` / `check-storage-enc.mjs`）
与 `scripts/build-deploy.ps1` **在本工作区均不存在**，当前目录下无法执行回归与打包脚本。
现存脚本仅 `privhub/scripts/doc2md.py`（文档转 Markdown 辅助）。

## 八、改进建议清单（独立文件）

> 本文档（架构与功能说明）只描述**当前状态**。所有改进事项已独立成文，直接转交开发执行：
> **《PrivHub-改进建议.md》**（docs/ 根，**42 项**，编号体系 `S` 安全 / `D` 数据 / `P` 性能 / `O` 运维 / `E` 工程 / `U` 体验 / `F` 功能缺口，
> 每条含证据（文件:行号）/影响/改法/验收标准，基于 2026-09-11 三路独立审计）。
> 其中 **6 项 P0 必做**：审计文件迁移竞态、`/pub` XSS、搜索 snippet XSS、请求体无上限、部署包落后、测试脚本缺失。
> 分工约定：🟢 前端为主 · 🟠 后端为主 · 🟡 前后端协作 · 优先级 P0(立即)/P1(近期)/P2(排期)。
> 上一版清单（24 项旧编号）已归档至 `docs/v2/PrivHub-改进需求清单（已归档）.md`，新旧对照见《改进建议》第 10 节。

---

## 九、变更记录

| 日期 | 变更 |
|---|---|
| 2026-09-21 | **v3.1.1 复核（文档同步）**：插件/路由/slot/装配结构实测无变化（50 插件 / 112 路由 / 31 个注册插件）；本快照头部刷新；**未解决问题统一汇入《PrivHub-待改进清单-2026-09-21.md》**；评审过程证据归档至 `docs/reviews/evidence-2026-09-17/` |
| 2026-09-17 | **v3.1.1 缺陷修复批次**（无架构变化）：A 批 5 条后端致命 bug（RAG 检索 TDZ、摄取异常杀进程、点开头文件盲区、同名上传静默覆盖、兜底 catch 吞异常）+ 新增 `rag-resilience.mjs`；文本预览上限 512KB→**10MB** 并把「超限」与「不支持」语义分离、新增大文件只读闸；内容区残留两步走止血；扩展名白名单收敛（前后端清单同源）。详见 `CHANGELOG.md` 的 3.1.1 条 |
| 2026-09-17 | **七角度只读评审 + 黑盒交互测试**：评审报告存 `docs/reviews/00`~`12`（总览见 `00-总览`）；交互测试 53 用例发现 9 个问题，报告存《PrivHub-交互测试报告-2026-09-18.md》；另有《PrivHub-小白使用问题清单.md》17 项——**这些问题在 v3.1.1 中均未处理**，已汇入 2026-09-21 待改进清单 |
| 2026-09-14 | **v3.1.0 管理控制台外壳（第一阶段）**：新增纯前端插件 `privhub-admin-console`（16 模块）提供统一管理外壳；插件数 49→**50**、纯前端插件 6→**7**、插件声明的 slot 并集 25→**31**（新增 `admin-console` 与 4 个 `admin-*` 别名）、`window.PrivHub` 桥 25→**26** 键（新增 `openConsole` 别名）；`setActiveView` 新增 `noToggle`（管理视图内不 toggle 回 files）；图标栏管理组收敛为 2 项，管理入口统一到控制台侧栏（既有 `open*` 入口全部保留）；新增 §3.3「管理入口映射」。实现/测试/说明见 `CHANGELOG.md` 的 3.1.0 条 |
| 2026-09-12 | **v3.0.4 前端模块化拆分**：`explorer-v3/client` 由单文件 1628 行拆为 12 个职责模块（入口仅 40 行装配）；新增「插件前端模块化」条目；确立约束「拆出来的东西必须留在所属插件目录内、骨架只做容器与总线」。完整变更见 `CHANGELOG.md` |
| 2026-09-11 | **v3.0.1 个人空间批次**：新增 2.3b「项目 / 个人空间 / 智能体沙箱」核心概念；插件数 48→**49**（新增 `shell-agent-console`）；路由数 108→**112**（files-agent 18→20）；`window.PrivHub` 键口径改为「骨架 25 + 插件追加」；补静态资源鉴权说明；智能体写入落点由 `.agents/<用户>/` 改为**个人空间**。完整变更见仓库根 `CHANGELOG.md` |
| 2026-09-11 | **三路审计后重建改进清单**：新建《PrivHub-改进建议.md》（42 项）；旧《改进需求清单》归档至 `v2/`；本文档索引与引用同步 |
| 2026-09-11 | **代码核对同步**：插件数 45→48（新增装配方式拆解：17 手动 + 26 自动 + 5 纯前端）；补后端路由面（108 条 / 31 插件 / ACL 守卫 37 条）；`window.PrivHub` 桥 9→28 键；slot 并集 25 个、视图 13 个；**纠正加密描述**（4 个 JSON 为明文）；新增「环境注意」节；标注部署包落后与测试脚本缺失；文档索引补齐 |
| 2026-09-06 | 升级为 V3 现状快照：插件全景 33→45、前端骨架/V3 布局、功能全景补全、文档索引补新 |
| 2026-09-06 | 改进需求（24 项：D1-D4/F1-F8/B1-B6/A1-A4/N1-N2）从本文拆出，独立成文转交开发；本文档对应章节改为引用 |
