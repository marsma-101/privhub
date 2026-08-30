# PrivHub 物理拆分映射表

> 配套文档：《PrivHub-需求文件》《设计与实施 — 私域枢纽（PrivHub）》《PrivHub-插件实现规则》《PrivHub-知识图谱.html》。
> 本文档是**物理拆分的唯一依据**：把新的功能划分（6 枢纽 + 33 功能点）落到磁盘目录级，做到"想到功能 = 在 `plugins/` 下建一个目录"，不动已落地的基座代码。
> 原则（沿用）：**已实现的不动，只加功能；基座宿主目录不拆，功能点独立成目录插件。**
> 已按《PrivHub-插件架构（Cordis 原理重搭）》同步修订：B13/ACL/防病毒 改为「独立 Service + intercept + 事件钩子」（原 `ctx.privhub.appendAudit` / `canAccess 加文件级` / `upload hook` 写法已废弃，不可再用）。

---

## 1. 物理拆分模型

### 1.1 两级目录结构

```
plugins/
├── privhub-core/        ┐
├── privhub-shell/       │  6 个「枢纽宿主」目录 = 平台基座
├── privhub-auth/        │  提供 slot 容器 / 已落地后端接口 / 共享服务
├── privhub-admin/       │  不拆、不动
├── privhub-files/       │
└── privhub-trash/       ┘
├── privhub-shell-tabs/      ┐
├── privhub-shell-favorites/ │  N 个「功能插件」目录 = 独立可插拔单元
├── privhub-files-search/    │  每个功能点一个目录，自带 manifest+client(+可选后端)
├── privhub-admin-audit/     │  删除目录 = 卸载，零侵入
└── ... (共 27 个功能插件目录) ┘
```

### 1.2 关键事实（已验证，决定本模型）

- shell 的 manifest 聚合是 `readdir(pluginsDir)` **目录级扫描**，每个目录读 `client/manifest.json` 抽 `id/slots/barItems/entry`。**机制天生支持"一个功能一个目录"，零改即可挂 33 个独立插件**——新增目录 = 自动被发现，删目录 = 自动卸载。
- 6 个宿主目录里**已落地的后端接口是基座能力**（core 的 `ctx.privhub`、auth 的 login/register、admin 的权限 API、files 的 8 接口、trash 接口、shell 的 manifest 聚合）。这些**不重写、不抽离**，功能插件通过 `window.PrivHub.api()` / `ctx.privhub` 复用。
- 现状盘点（2026-08-28）：auth/admin 的 client **已迁移**（auth 挂 `auth` slot、admin 挂 `admin` slot 且图标栏已声明"用户管理"）；shell client 占位；files/trash/core 暂无 client。**已迁移的 client 作为基座 UI 保留，不拆**；待迁与新增的前端按功能拆成独立目录。

### 1.3 命名规范

- 宿主目录：`privhub-<hub>`（core/shell/auth/admin/files/trash，沿用现有 6 个）。
- 功能插件目录：`privhub-<hub>-<feature>`，`<feature>` 取功能短名（见下表"独立插件目录"列）。
- 每个功能插件目录 = `package.json` + `cordis.patch.yml` + `client/manifest.json` + `client/index.js`（前端），仅当需新增后端时再加 `src/index.ts`（复用 `ctx.privhub` 做持久化/权限，不另起存储）。

---

## 2. 基座能力清单（不拆 · 保留在宿主目录）

以下功能属"平台基座"，**不是独立功能插件，不进拆分映射表**，保持现有宿主目录内的实现：

| 编号 | 能力 | 宿主目录 | 说明 |
| --- | --- | --- | --- |
| A1 | 工作区图标栏（骨架主前端） | privhub-shell | 图标来源 = 各插件 `barItems`，由 shell 统一渲染 |
| A2 | 面板可拖拽/可折叠（骨架布局） | privhub-shell | 分隔条拖拽 + 折叠态持久化 localStorage |
| 登录 | 登录/注册/会话 API | privhub-auth | login/register/me/logout 已落地 |
| 权限API | 用户/角色/项目权限 API | privhub-admin | 用户管理接口已落地 |
| 持久化 | JSON 存储（users/sessions/trash） | privhub-core | `ctx.privhub` 已实现 |
| 权限引擎 | 权限判定（角色×项目，目录树继承） | privhub-core | `canAccess/visibleProjects` 已实现 |

> 若后续要把 A1/A2/登录/权限API 也拆成独立目录插件亦可，但当前它们与骨架/基座耦合深、且已实现，按"不动"原则暂留宿主目录。

---

## 3. 物理拆分映射表（27 个功能插件）

图例 — 现状：✅ 后端已落地 · 🟡 client 待迁（后端已有，前端拆目录重构）· ⬜ 纯新增（需建目录+开发）
档位：🟢 本轮 · 🟠 阶段三优先 · 🟡 后话 · ⚪ 基础
拆分批次：① 首拆(🟢本轮·随迁/新增) ② 次拆(🟠阶段三) ③ 后拆(🟡后话)

### 3.1 shell 枢纽（页面骨架）· 4 个

| 序 | 编号 | 功能 | 独立插件目录 | 挂载 slot | FE/BE | 现状 | 后端来源 | 依赖 core | 批次 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | A3 | 内容区多标签页 | `privhub-shell-tabs` | panel(上方标签栏) | FE | ⬜ | 无（状态存 sessionStorage） | 可选读 recent | ① |
| 2 | 收藏 | 文件/文件夹星标 | `privhub-shell-favorites` | app-iconbar + tree(右键) | FE+BE | ⬜ | 新增 `/api/favorites`（存 users.json `stars[]`） | privhub 持久化 | ① |
| 3 | 最近 | 最近打开文件列表 | `privhub-shell-recent` | user-area(下拉) | FE+BE | ⬜ | 新增 `/api/recent`（存 `recent[]` 上限 N） | privhub 持久化 | ① |
| 4 | D25 | 系统设置面板 | `privhub-shell-settings` | app-iconbar(齿轮) | FE+BE | ⬜ | 新增 `/api/settings`（存 `settings.json`） | privhub 持久化 | ① |

### 3.2 auth 枢纽（认证）· 1 个

| 序 | 编号 | 功能 | 独立插件目录 | 挂载 slot | FE/BE | 现状 | 后端来源 | 依赖 core | 批次 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 5 | 水印 | 数字水印 | `privhub-auth-watermark` | preview(叠加层) | FE | ⬜ | 无（复用 auth.me 取用户信息） | requireUser | ① |

### 3.3 admin 枢纽（权限）· 3 个

| 序 | 编号 | 功能 | 独立插件目录 | 挂载 slot | FE/BE | 现状 | 后端来源 | 依赖 core | 批次 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 6 | B13 | 审计日志 | `privhub-admin-audit` | （服务+数据） | BE | ⬜ | 独立 `audit` Service（`ctx.audit.log/query/exportCsv`，写 JSONL 保留 60 天）+ `/api/audit` 查询/导出 | inject:['audit'] 消费 | ② |
| 7 | ACL | 细粒度 ACL | `privhub-admin-acl` | （策略） | FE+BE | ⬜ | 独立 `acl` Service（`ctx.acl.can/setRule`）+ 用 `ctx.intercept('privhub',{canAccess})` 增强权限引擎 | inject:['acl','privhub'] | ② |
| 8 | 审计面板 | 审计可视化 | `privhub-admin-audit-panel` | app-iconbar(adminOnly) | FE | ⬜ | 调 B13 接口 | 无 | ② |

### 3.4 trash 枢纽（回收站）· 1 个

| 序 | 编号 | 功能 | 独立插件目录 | 挂载 slot | FE/BE | 现状 | 后端来源 | 依赖 core | 批次 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 9 | B9 | 回收站 UI | `privhub-trash-ui` | app-iconbar(角标) + panel | FE | 🟡 | 复用 trash 宿主接口（已落地） | moveToTrash / read trash.json | ① |

### 3.5 files 枢纽（文件管理）· 17 个

| 序 | 编号 | 功能 | 独立插件目录 | 挂载 slot | FE/BE | 现状 | 后端来源 | 依赖 core | 批次 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | B6 | 目录树+文件面板 | `privhub-files-explorer` | tree + panel | FE | 🟡 | 复用 files 宿主 `list` 接口 | listFiles / resolveInProject | ① |
| 11 | B7 | 文件预览 | `privhub-files-preview` | preview | FE | 🟡 | 复用 files 宿主 `preview/preview-raw` | readFileForPreview | ① |
| 12 | B8 | 文件名搜索 | `privhub-files-search` | panel(顶部框) | FE+BE | 🟡 | 新增 `/api/search`（复用 listFiles 递归） | listFiles | ① |
| 13 | B10 | 批量操作 | `privhub-files-batch` | panel(多选+工具栏) | FE | 🟡 | 复用 files 宿主 delete/rename/mkdir | moveToTrash / renameEntry / createFolder | ① |
| 14 | B11 | 拖拽上传 | `privhub-files-upload` | panel(拖入) | FE | 🟡 | 复用 files 宿主 `upload`（raw ≤2GB） | 上传工具 / MAX_UPLOAD_BYTES | ① |
| 15 | B12 | 上传进度队列 | `privhub-files-upload-queue` | panel(底部抽屉) | FE | 🟡 | 无（监听上传进度） | 无 | ① |
| 16 | C14 | Markdown 在线编辑 | `privhub-files-edit-md` | panel | FE+BE | ⬜ | 新增 `/api/doc`（读写 .md + 版本） | resolveInProject / readFileForPreview | ② |
| 17 | C15 | 内容全文搜索 | `privhub-files-fulltext` | panel(搜索框切换) | FE+BE | ⬜ | 新增 BM25+CJK bigram 索引（与 B8 合并统一搜索） | listFiles | ② |
| 18 | C17 | 知识图谱 | `privhub-files-kg` | panel(图谱视图) | FE+BE | ⬜ | 新增扫描双链/标签构建关联图 | listFiles / 读元数据 | ② |
| 19 | 标签 | 文件标签/元数据 | `privhub-files-tags` | tree(右键) + panel(筛选) | FE+BE | ⬜ | 新增 `/api/meta`（存 `meta.json`） | privhub 持久化 | ② |
| 20 | 模板 | 页面模板+富文本 | `privhub-files-template` | panel | FE+BE | ⬜ | 新增 `/api/templates`（模板库） | resolveInProject | ② |
| 21 | 导出 | 页面导出 | `privhub-files-export` | panel(菜单) | FE+BE | ⬜ | 新增 `/api/export`（md→PDF/Word/HTML） | 读文件 | ② |
| 22 | 知识库 | 知识库视图 | `privhub-files-wiki` | panel(视图切换) | FE | ⬜ | 无（渲染 README/index.md） | listFiles / readFileForPreview | ② |
| 23 | C22 | 智能体外部 API | `privhub-files-agent` | （admin 启用） | FE+BE | ⬜ | 新增鉴权代理 API（受项目权限约束） | canAccess / visibleProjects / api 工具 | ③ |
| 24 | 检索引擎 | 全文检索引擎 | `privhub-files-search-engine` | （替换 C15 索引源） | FE+BE | ⬜ | 新增 Meilisearch/SQLite FTS5 接入 | listFiles | ③ |
| 25 | 协同 | 多人实时协同 | `privhub-files-realtime` | panel(协同光标) | FE+BE | ⬜ | 新增 CRDT/OT（Yjs/ShareDB） | 读文件 / 冲突处理 | ③ |
| 26 | 引用图 | 页面引用关系图 | `privhub-files-backlinks` | panel(侧栏) | FE+BE | ⬜ | 新增双向/反向链接解析 | 读元数据 | ③ |

### 3.6 core 枢纽（共享服务）· 1 个

| 序 | 编号 | 功能 | 独立插件目录 | 挂载 slot | FE/BE | 现状 | 后端来源 | 依赖 core | 批次 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 27 | 防病毒 | ClamAV 扫描 | `privhub-core-antivirus` | （上传钩子） | BE | ⬜ | 监听 `file:uploaded` 事件钩子（上传后调 ClamAV，命中拦截+写审计），不改动 upload | inject:['privhub','audit'] 监听事件 | ③ |

---

## 4. 拆分批次与节奏（建议）

按"先迁未迁移的、已稳定的测试后再加"推进，对应你定的节奏：

- **批次①（立即 · 🟢本轮）**：files/trash 的 client 本来就要迁，按功能拆目录迁过去（B6/B7/B8/B10/B11/B12/B9）；shell 的 A3/收藏/最近/D25、auth 水印属纯新增，直接建目录。**这批全部不碰基座已落地代码**，只建新目录或把待迁前端挪进新目录。
- **批次②（🟠阶段三优先）**：admin 的 B13/ACL/审计面板、files 的 C14/C15/C17/标签/模板/导出/知识库。均为 ⬜ 纯新增，建独立目录即可，无回退风险。
- **批次③（🟡后话）**：C22/检索引擎/协同/引用图/防病毒。评估外部依赖（ClamAV、Meilisearch、Yjs、Windows 低配风险）后再做。

> 已迁移的 auth/admin client（登录模态、用户管理模态）保持宿主目录内，不拆——它们是基座 UI，对应第 2 节"不拆"清单。

---

## 5. 与现有代码 / 规则文档 / 知识图谱的对应

- **知识图谱**：本文档 27 个功能插件 = 图谱中 33 叶子节点减去第 2 节 6 个基座内置（A1/A2/登录/权限API/持久化/权限引擎）；分类、编号、档位、归属枢纽完全一致。后续新增功能：在图谱加节点 + 本文档加一行 + 建一个目录。
- **规则文档**：第 4 节"34 个功能插件规则"中的实现/交互描述直接映射到本文档"独立插件目录"列（一个功能 = 一个目录）。规则文档第 5 节 SOP 的 7 步 = 本表每行的落地动作。
- **现有代码**：6 个宿主目录（`privhub-core/shell/auth/admin/files/trash`）保持原名、内部已落地代码不动；新增的 27 个目录平铺在 `plugins/` 下，shell 的 `readdir` 聚合自动发现。

---

## 6. 附录：独立插件目录最小模板（套用 SOP）

以 `privhub-files-search` 为例（含新增后端）：

```
privhub-files-search/
├── package.json            # 沿用既有插件写法（cordis 插件 + client 入口）
├── cordis.patch.yml        # 复制既有插件模板
├── client/
│   ├── manifest.json       # { id:'privhub-files-search', title:'搜索', icon:'🔍', slots:['panel'], barItems? }
│   └── index.js            # export default { id, slots:{ panel: SearchBox } }，内用 window.PrivHub.api('/privhub/api/search')
└── src/
    └── index.ts            # export const inject=['privhub']; export function apply(ctx){ const svc=ctx.privhub; svc.route('/privhub/api/search',...) }
```

- 纯前端插件（如 B12 上传队列、知识库视图、水印）：无 `src/`，仅 `client/`。
- 扩展能力一律走 L2 能力 Service，不污染原服务：B13 审计 → 独立 `audit` Service（`ctx.audit`）；ACL → 独立 `acl` Service 并用 `ctx.intercept('privhub',{canAccess})` 增强权限引擎；防病毒 → 监听 `file:uploaded` 事件钩子。三者均通过 `inject` 被消费，不往 `ctx.privhub` 上挂方法。
- 删除 = 移除该目录，shell 聚合自动卸载，其余功能零影响（可插拔）。
