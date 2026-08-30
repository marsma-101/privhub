# PrivHub 插件实现规则

> 配套文档：《PrivHub-需求文件》（功能基线）、《设计与实施 — 私域枢纽（PrivHub）》（架构蓝图）、《PrivHub-知识图谱.html》（插件关联可视化）。
> 本文档在**不改动底座、功能分类、插件划分**的前提下，为图谱中的每一个插件指定**实现方式**与**交互方式**。
> 核心原则：**已实现的不动，只加功能；想到新功能 = 往对应枢纽挂一个叶子插件，不动其他代码**。

---

## 0. 已验证的实现现状（2026-08-28 代码核对）

下表来自对 `privhub/plugins/` 的实际核对，作为后续"现状"判定的唯一事实源。

| 插件 | 后端（src） | 前端（client） | 说明 |
| --- | --- | --- | --- |
| privhub-core | ✅ 已落地 | 无（纯后端） | `ctx.privhub` 服务：持久化 + 权限判定 + HTTP 工具，供各域 inject 复用 |
| privhub-shell | ✅ 已落地 | ✅ 已插件化 | server 已实现 manifest 聚合接口；client 提供 project-tabs/user-area/app-iconbar/welcome 四组件（2026-08-28 骨架壳子拆分完成） |
| privhub-auth | ✅ 已落地 | ✅ 已迁移 | client 挂 `auth` slot；后端 login/register/me 已落地 |
| privhub-admin | ✅ 已落地 | ✅ 已迁移 | client 挂 `admin` slot；manifest `barItems` 已在图标栏声明"用户管理"(adminOnly) |
| privhub-files | ✅ 已落地 | 🟡 待迁 | 后端 8 接口已落地（projects/list/preview/preview-raw/upload/mkdir/delete/rename）；client 待从旧 frontend 搬入 |
| privhub-trash | ✅ 已落地 | 🟡 待迁 | 后端回收站接口已落地；client 待迁 |

**前端通信总线（约定，已验证）**：所有 client 插件通过全局 `window.PrivHub` 与骨架/后端通信——
- `PrivHub.api(path, opts)`：统一 fetch，自动带 token；
- `PrivHub.AUTH`：reactive 登录态（`token` / `user`）；
- `PrivHub.logout()`：清除登录态。

**加载机制（约定，已验证）**：骨架启动时调用 `GET /privhub/api/shell/manifest` 聚合各插件 `client/manifest.json`，按 `slots` 逐一动态 `import()` 加载 `/privhub-plugins/{插件名}/index.js`；某插件 manifest 缺失则对应 slot 不渲染，其余不受影响（可插拔）。

---

## 1. 基础契约（沿用设计文档，不修改）

每个插件 = `package.json` + `cordis.patch.yml` + `src/index.ts`（后端）+ `client/manifest.json` + `client/index.js`（前端），前后端一体。

**7 个 slot 挂载点**（不变）：
`auth`（全屏登录）· `project-tabs`（顶栏项目横排）· `user-area`（顶栏右侧）· `app-iconbar`（工作区左侧图标栏）· `tree`（左面板目录树）· `panel`（中面板文件区）· `preview`（右预览条）。

**manifest 字段**（不变）：`id` / `title` / `icon` / `description` / `slots[]` / `entry`（自动）/`barItems[]`（图标栏项：`{ icon, title, slot, adminOnly }`）。

**client 默认导出形态**（已验证）：
```js
export default { id: 'privhub-xxx', slots: { tree: Component, panel: Component } }
```

---

## 2. 统一交互规范（跨插件一致）

为避免各插件交互割裂，以下范式强制统一：

- **图标栏（app-iconbar）**：每个图标来自某插件的 manifest `barItems`（icon/title/slot/adminOnly）；hover 气泡显示 `title`；支持角标计数（如回收站待恢复数）。
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
- **提供基座能力**：`svc.route()`（复用底座 webServer 注册路由）、`svc.requireUser()`、`svc.canAccess(u, project)`、`svc.visibleProjects(u)`、`svc.listFiles()`、`svc.readFileForPreview()`、`svc.isValidName()`、`svc.resolveInProject()`、`svc.createFolder()`、`svc.moveToTrash()`、`svc.renameEntry()`；HTTP 工具 `json/readBody/readBodyRaw/MAX_UPLOAD_BYTES`。
- **子插件挂载约定**：core 无 client，子插件均为"后端能力"，在 `src/index.ts` 中扩展 `ctx.privhub` 方法，供其他枢纽复用。
- **状态**：✅ 已实现。新增子能力（如防病毒扫描）只扩展服务方法，不动现有逻辑。

### 3.2 privhub-shell · 页面骨架枢纽
- **职责**：提供 7 个 slot 容器 + manifest 聚合接口，其他插件按 slot 挂载 UI。
- **提供基座能力**：`GET /privhub/api/shell/manifest`（自动扫描 plugins/*/client/manifest.json）；骨架页内联实现顶栏与布局。
- **子插件挂载约定**：
  - 图标栏类插件 → 在自身 manifest 声明 `barItems`（slot: `app-iconbar`），由骨架统一渲染；
  - 树/面板/预览类 → 各自挂 `tree`/`panel`/`preview`；
  - 顶栏类 → `project-tabs` / `user-area` / `auth`。
- **状态**：✅ 已插件化（2026-08-28 骨架壳子拆分完成）。`privhub-shell/client/index.js` 提供 `project-tabs`（顶栏项目横排）/ `user-area`（用户区：徽章/头像/退出）/ `app-iconbar`（图标栏容器，渲染各插件 barItems）/ `welcome`（欢迎页）四个组件；slot 机制支持同一 slot 多组件（user-area 与 F03 最近并存）；骨架页（frontend/index.html）瘦身为纯容器（slot 渲染）+ 导航状态机（window.PrivHub.nav）+ 插件桥（api/bus/barItems/badges）+ manifest 加载器。A2 面板拖拽/折叠为骨架布局能力，待后续实现。

### 3.3 privhub-auth · 认证枢纽
- **职责**：登录/注册/会话 + 身份相关的预览增强。
- **基座能力**：后端 login/register/me/logout 已落地；client 已挂 `auth` slot，使用 `PrivHub.api/AUTH/logout`。
- **子插件挂载约定**：水印插件以增强"预览条"方式挂载（见 4.3）。
- **状态**：✅ 后端+client 已实现。

### 3.4 privhub-admin · 权限枢纽
- **职责**：用户/角色/项目权限 + 审计与细粒度 ACL。
- **基座能力**：后端用户管理接口已落地；client 已挂 `admin` slot（模态形态），并在图标栏声明"用户管理"入口（adminOnly）。
- **子插件挂载约定**：审计面板/ACL 作为 admin 下的子插件，复用 `admin` slot 或新增 `barItems` 图标（均 adminOnly）。
- **状态**：✅ 后端+client 已实现；审计日志/ACL/审计面板为新增。

### 3.5 privhub-files · 文件管理枢纽
- **职责**：目录树/文件面板/预览/上传，以及知识库主线（编辑、检索、图谱、标签、模板、导出、知识库视图、智能体 API 等）。
- **基座能力**：后端 8 接口已落地（projects/list/preview/preview-raw/upload/mkdir/delete/rename），全部复用 `ctx.privhub`，含路径安全与权限判定。
- **子插件挂载约定**：B6 挂 `tree`+`panel`；B7 挂 `preview`；上传/批量/搜索/标签页等挂 `panel` 或 `app-iconbar`；知识库类在 `panel` 内以"视图切换"形态呈现（复用 tree+权限，零新增存储）。
- **状态**：✅ 后端已落地，client 待迁；编辑/检索/图谱/标签/模板/导出/知识库视图/智能体等为新增。

### 3.6 privhub-trash · 回收站枢纽
- **职责**：列表/恢复/彻底删除/定时清理。
- **基座能力**：后端回收站接口已落地（依赖 core 的 `moveToTrash`/trash.json）。
- **子插件挂载约定**：B9 作为其核心 client，挂 `app-iconbar`（图标 + 待恢复角标）与 `panel`（列表/恢复/彻底删除/清空）。
- **状态**：✅ 后端已落地，client 待迁。

---

## 4. 功能插件规则（34 个）

现状图例：✅ 后端已落地 · 🟡 client 待迁（后端已有，前端从旧 frontend 重构）· ⬜ 纯新增（需开发后端+client）。
档位图例：🟢 本轮 · 🟠 阶段三优先 · 🟡 后话 · ⚪ 基础。

### 4.1 shell 枢纽（页面骨架）

| 编号 | 功能 | 档 | 现状 | 实现规则 | 交互方式 |
| --- | --- | --- | --- | --- | --- |
| A1 | 工作区图标栏 | 🟢 | 🟡 | 骨架主前端；图标来源 = 各插件 manifest `barItems`，由 shell 统一渲染 | 左侧窄条图标，hover 气泡显示标题，角标计数（如回收站未读数） |
| A2 | 面板可拖拽/可折叠 | 🟢 | 🟡 | 骨架自带布局能力（分隔条拖拽 + 折叠态持久化到 localStorage） | 拖动面板边界调宽；点折叠箭头收起左/右面板 |
| A3 | 内容区多标签页 | 🟢 | ⬜ | 新增 client 插件，挂 `panel` 上方标签栏；打开文件 = 新标签，状态存 sessionStorage | 点击文件开新标签；标签可关闭/切换；刷新后恢复 |
| 收藏 | 文件/文件夹收藏（星标） | 🟢 | ⬜ | 新增 client 插件，挂 `app-iconbar` + 复用 `tree` 右键；收藏数据存 core（users.json 扩展 `stars[]`） | 文件右键"收藏"；图标栏星标入口展开收藏列表，一键跳转到原路径 |
| 最近 | 最近打开文件列表 | 🟢 | ⬜ | 新增 client 插件，挂 `user-area` 下拉或首页；最近记录存 core（按用户维护 `recent[]`，上限 N） | 顶栏头像下拉显示最近打开；点击直接定位并预览 |
| D25 | 系统设置面板 | 🟢 | ⬜ | 新增 client 插件，挂 `app-iconbar`（齿轮）；设置存 core 的 `settings.json`（主题/默认视图/上传限制） | 点齿轮开设置抽屉，改主题/默认视图即时生效，上传限制写回后端校验 |

### 4.2 auth 枢纽（认证）

| 编号 | 功能 | 档 | 现状 | 实现规则 | 交互方式 |
| --- | --- | --- | --- | --- | --- |
| 登录/注册 | 登录/注册/会话 API | ⚪ | ✅ | 后端 login/register/me/logout 已落地；client 已挂 `auth` slot，**不动** | 未登录全屏 auth；登录后进入骨架；注册默认普通用户仅"公共"项目 |
| 水印 | 数字水印 | 🟢 | ⬜ | 新增：后端在 `preview` 响应中注入用户信息；client 在 `preview` 槽叠加用户名+时间浮层（不可去除以防截屏） | 预览任何文件时右下角显示"用户@时间"半透明水印 |

### 4.3 admin 枢纽（权限）

| 编号 | 功能 | 档 | 现状 | 实现规则 | 交互方式 |
| --- | --- | --- | --- | --- | --- |
| 权限API | 用户/角色/项目权限 API | ⚪ | ✅ | 后端用户管理接口已落地；client 已挂 `admin` slot + 图标栏入口（adminOnly），**不动** | 图标栏"用户管理"开模态：表格增删改、重置密码、项目勾选 |
| B13 | 审计日志 | 🟢 | ⬜ | 新增后端：由各写操作（upload/delete/rename/mkdir/restore/purge 等）调用 core `appendAudit(action, user, detail)` 写 JSONL，保留 60 天；导出 CSV 接口 | 后台静默记录，界面由"审计面板"呈现 |
| ACL | 细粒度 ACL | 🟠 | ⬜ | 新增后端：扩展 core 权限模型，在 `canAccess` 之上加文件/目录级（继承/覆盖）规则，存 `acl.json`；client 在文件右键"权限"设置 | 管理员对文件夹设"可读/可写/禁止"覆盖规则，子项继承 |
| 审计面板 | 审计日志可视化 | 🟠 | ⬜ | 新增 client 插件，挂 `app-iconbar`（adminOnly）；调审计日志接口，前端按时间/操作/用户筛选 | 图标栏"审计"开面板：时间线列表 + 筛选（操作类型/用户/项目）+ 导出 CSV |

### 4.4 trash 枢纽（回收站）

| 编号 | 功能 | 档 | 现状 | 实现规则 | 交互方式 |
| --- | --- | --- | --- | --- | --- |
| B9 | 回收站 | ⚪ | 🟡 | 后端回收站接口已落地；client 待迁：挂 `app-iconbar`（角标=待恢复数）+ `panel`（列表/恢复/彻底删除/清空30天） | 图标栏垃圾桶入口开回收站面板；逐项恢复/彻底删除，管理员可清空 30 天前 |

### 4.5 files 枢纽（文件管理，17 个）

| 编号 | 功能 | 档 | 现状 | 实现规则 | 交互方式 |
| --- | --- | --- | --- | --- | --- |
| B6 | 目录树 + 文件面板 | 🟢 | 🟡 | 后端 list 已落地；client 待迁：挂 `tree`+`panel`，从旧 frontend 重构为插件 | 左树展开项目/子目录；中面板显示当前目录文件网格/列表 |
| B7 | 文件预览 | 🟢 | 🟡 | 后端 preview/preview-raw 已落地（图片/文本/PDF）；client 待迁挂 `preview`，全格式（Office 等）本轮补转换 | 选中文件右栏预览；图片/PDF 直载，文本高亮，Office 经服务端转换后预览 |
| B8 | 搜索（文件名） | 🟢 | 🟡 | 后端新增 `/api/search?q=` 走文件名匹配（复用 listFiles 递归）；client 在 `panel` 顶部搜索框 | 输入即筛选当前项目文件；回车全局搜 |
| B10 | 批量操作 | 🟢 | 🟡 | 后端复用 delete/rename/mkdir；client 行首多选 + 顶部批量工具栏 | 勾选多个 → 批量移动/删除/下载 |
| B11 | 拖拽上传 + 递归上传 | 🟢 | 🟡 | 后端 upload 已落地（raw body ≤2GB，同名覆盖）；client 拖拽整个文件夹递归建目录并上传 | 拖文件夹进面板 → 保持目录结构上传，冲突同名覆盖 |
| B12 | 上传进度队列 | 🟢 | 🟡 | 后端 upload 已落地；client 底部"上传队列"抽屉显示逐条进度，失败重试 | 上传时右下角浮现队列，进度条 + 失败重试按钮 |
| C14 | Markdown 在线编辑 | 🟠 | ⬜ | 新增后端：读写为 `.md`，保存历史版本（frontmatter + 双链解析）；client 编辑器挂 `panel` | 双击 .md 进编辑态，左侧编辑右预览，保存生成版本 |
| C15 | 内容全文搜索 | 🟠 | ⬜ | 新增后端：BM25 + CJK bigram 索引（与 B8 合并为统一搜索）；client 复用搜索框 | 搜索框切换"文件名/全文"，全文返回命中片段 |
| C17 | 知识图谱 | 🟠 | ⬜ | 新增后端：扫描双链/标签构建关联图 + 社区发现；client 图谱视图挂 `panel` | "图谱"视图以节点图展示文档关联，点击节点定位文件 |
| 标签 | 文件标签/自定义元数据 | 🟠 | ⬜ | 新增后端：metadata 存 `meta.json`（标签/自定义字段）；client 文件右键打标签 + 按标签筛选 | 右键"打标签"；panel 上方按标签过滤 |
| 模板 | 页面模板 + 富文本增强 | 🟠 | ⬜ | 新增后端：模板库（`templates/`）；client 升级编辑器为 Milkdown/TipTap | 新建文档选模板（会议记录/产品需求等）；富文本编辑 |
| 导出 | 页面导出 | 🟠 | ⬜ | 新增后端：md → PDF/Word/HTML 转换；client "导出"按钮 | 文档菜单"导出为 PDF/Word/HTML"下载 |
| 知识库视图 | 知识库视图 | 🟠 | ⬜ | 复用 tree+权限零新增存储；client 在 `panel` 上方切"知识库视图"，渲染当前目录 README.md/index.md 为 Wiki | 切到知识库视图，目录即站点，README 作首页 |
| C22 | 智能体外部 API/MCP | 🟡 | ⬜ | 新增后端：鉴权代理，AI 智能体（Claude Code/Codex 等）经 token 读写数据，受项目权限约束 | 对外暴露受控 API；仅 admin 可启用 |
| 检索引擎 | 全文检索引擎 | 🟡 | ⬜ | 新增后端：引入 Meilisearch / SQLite FTS5 替代纯前端 BM25，承接 C15 大规模检索 | 透明替换 C15 索引源，前端无感 |
| 协同 | 多人实时协同编辑 | 🟡 | ⬜ | 新增后端：CRDT/OT（Yjs/ShareDB）；client 协同光标 | 多人在线同编，显示他人光标；需评估低配 Windows 风险 |
| 引用图 | 页面间引用关系图 | 🟡 | ⬜ | 新增后端：双向/反向链接解析（Obsidian/Logseq 风格）；client 引用面板 | 文档侧栏显示"反向链接"列表 + 关系图 |

### 4.6 core 枢纽（共享服务，3 个）

| 编号 | 功能 | 档 | 现状 | 实现规则 | 交互方式 |
| --- | --- | --- | --- | --- | --- |
| 持久化 | JSON 存储（users/sessions/trash） | ⚪ | ✅ | core 服务已实现，**不动** | 无直接 UI，被各域复用 |
| 权限引擎 | 权限判定（角色×项目，目录树继承） | ⚪ | ✅ | `canAccess/visibleProjects` 已实现，**不动**；ACL 插件在其上扩展 | 无直接 UI |
| 防病毒 | 防病毒扫描 | 🟡 | ⬜ | 新增可选后端插件：调用 ClamAV 外部进程扫描上传文件，命中则拦截并写审计 | 后台扫描，仅 admin 可启用；失败不影响主流程 |

---

## 5. 新增插件接入 SOP（证明"想到功能就加插件"）

以"新增一个叶子插件"为例，全程**不修改骨架与其他插件**：

1. 在 `plugins/` 下建 `privhub-<功能>/`。
2. `package.json`：声明 cordis 插件 + client 入口字段（沿用既有插件写法）。
3. `cordis.patch.yml`：装配配置（复制既有插件模板）。
4. `src/index.ts`（仅当需要后端）：`export const inject = ['privhub']; export function apply(ctx){ const svc=ctx.privhub; svc.route('/privhub/api/xxx', ..., 'xxx') }`，**复用 core 服务做持久化与权限**，不另起存储。
5. `client/manifest.json`：`{ id, title, icon, description, slots:[...], barItems?:[...] }`。
6. `client/index.js`：`export default { id, slots: { 目标slot: Vue组件 } }`，组件内通过 `window.PrivHub.api()` 调后端。
7. 重启服务；shell 的 manifest 聚合自动发现新插件，对应 slot 渲染，**无需改骨架一行代码**。

删除同理：移除该插件目录即卸载，其余功能不受影响（可插拔）。

---

## 6. 与知识图谱的对应关系

本文档逐条对应《PrivHub-知识图谱.html》中的 34 个叶子插件与 6 大枢纽：图谱管"有哪些、挂哪"，本文档管"怎么实现、怎么交互"。两者分类、编号、档位完全一致，后续新增功能时同步在图谱加节点、在本文档加一行即可。
