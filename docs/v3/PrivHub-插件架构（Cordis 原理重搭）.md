# PrivHub 插件架构（基于 Cordis 原理重搭）

> **本文取代《PrivHub-插件架构方案.md》里的 A/B/C 草案。** 完全按《Cordis-说明文档》的五条设计哲学重搭，功能清单 / slot / 批次沿用《PrivHub-物理拆分映射表.md》。
>
> 核心变化：把"直接往 `ctx.privhub` 上挂方法、互相 inject、改 `canAccess`"等违规写法，全部换成 Cordis 标准做法——**能力抽成 Service、跨插件只走事件、增强用 intercept、副作用用 effect 可逆**。
>
> **编号规则（2026-08-28 按开发进度重排）**：L2 能力 Service 用 `S1–S6`；L3 功能插件用 `F01–F27`，编号顺序 = 开发批次①→②→③（即先落地的先编号）。原需求文件编号（A3/B6/C14…）保留为"原需求编号"列，仅供追溯需求来源。

---

## 0. 与 Cordis 设计哲学的对照（先建这张表，全文都对应它）

| Cordis 设计哲学 | PrivHub 落点 |
| --- | --- |
| **① 服务即契约** | 6 枢纽各提供一个域 Service（`privhub` / `auth` / `admin` / `files` / `trash` / `shell`）；另抽 6 个**能力 Service**（`audit` / `acl` / `search` / `meta` / `collab` / `watermark`，编号 S1–S6）。所有能力以 `ctx.xxx` 形式被注入消费。 |
| **② 通信靠事件** | 功能插件之间**互不 inject**，跨功能只走事件总线（`file:*` / `favorites:*` / `auth:*` / `trash:*`）。删任一功能插件不会让别的插件崩。 |
| **③ 副作用可逆** | 每个插件 `apply` 内用 `ctx.effect()` 注册监听器 / 定时器 / 连接，卸载时逆序清理，零残留。 |
| **④ 增强用拦截** | ACL 增强权限引擎、水印叠加预览、防病毒拦截上传——统统用 `ctx.intercept(...)` 或监听事件钩子，**不往原 Service 实例上挂属性**。 |
| **⑤ 目录即插件** | 沿用 shell 的 `readdir(pluginsDir)` 聚合；每个功能 / 服务一个独立目录带 `client/manifest.json`，删目录 = 卸载。 |

---

## 1. 三层架构总览

```
                        ┌─────────────────────────────────────┐
   基座 Service 提供方   │  L1  6 大枢纽宿主（不拆、不动已实现） │
   （平台能力）          │  core / shell / auth / admin /      │
                        │  files / trash  → 各提供域 Service   │
                        └───────────────┬─────────────────────┘
                                        │ 提供 + 注入
                        ┌───────────────▼─────────────────────┐
   能力 Service 插件     │  L2  6 个可复用能力 Service（S1–S6）  │
   （抽出的公共能力）     │  audit / acl / search / meta /      │
                        │  collab / watermark                 │
                        └───────────────┬─────────────────────┘
                                        │ 注入 + 走事件
                        ┌───────────────▼─────────────────────┐
   功能插件             │  L3  27 个独立功能插件（F01–F27）     │
   （消费 Service +     │  批次① 12 个 / 批次② 10 个 /         │
    发听事件）          │  批次③ 5 个，编号即构建顺序           │
                        └─────────────────────────────────────┘
```

- **L1 枢纽**：只提供"已落地、稳定的"域能力，不写业务功能，不拆目录。
- **L2 能力 Service**：把"被多个功能插件复用的能力"抽出来，独立成 Service（S1–S6）。这是修掉违规写法的关键层。
- **L3 功能插件**：只**消费** L1/L2 的 Service + 发/听事件，彼此不直接依赖。编号 F01–F27 按开发批次①→②→③顺序给定。

> L3 按枢纽的原始分布（仅作数量核对，不等于开发顺序）：shell×4 / auth×1 / admin×3 / trash×1 / files×17 / core×1 = 27。

---

## 2. L1 枢纽 = 域 Service 提供方（不拆、已实现不动）

| 宿主目录 | 提供的 Service（key） | 已落地能力（保持原样，不重写） | 备注 |
| --- | --- | --- | --- |
| `privhub-core` | `privhub`（持久化 + 权限引擎） | `ctx.privhub` 读写 users/sessions/trash/settings；`canAccess` / `visibleProjects` | 视为 core 提供的 Service；新增强走 `intercept`，不挂属性 |
| `privhub-auth` | `auth` | login / register / me / logout | 挂 `auth` slot（基座 UI 保留） |
| `privhub-admin` | `admin` | 用户 / 角色 / 项目管理接口 | 挂 `admin` slot |
| `privhub-files` | `files` | list / preview / upload / delete / rename / mkdir 等 8 接口 | 功能插件复用这些接口 |
| `privhub-trash` | `trash` | moveToTrash / 读 trash.json / 恢复 | 挂 `app-iconbar` 角标 |
| `privhub-shell` | `shell` | manifest 聚合（readdir 扫描）、slot 渲染、图标栏 | 前端骨架，挂载所有插件的 UI |

> 务实处理：现有 `ctx.privhub` 继续作为 core 提供的 Service 使用（key 不变，兼容已实现代码），但其"增强"必须通过 `intercept` 进行，不允许 `ctx.privhub.xxx = ...` 直接挂方法。

---

## 3. L2 能力 Service 插件（修掉违规写法的核心层，S1–S6）

> **原违规写法**（映射表旧版）：B13 审计 `ctx.privhub.appendAudit=...`；ACL "canAccess 之上加文件级"；防病毒"扩展 upload 流程 hook"。
> **改为**：各自成为独立 Service / 独立能力插件，通过 `inject` 被消费，通过 `intercept` 或事件钩子增强。

| 编号 | Service 插件目录 | 提供 key | 方法契约（示例） | 替代的旧违规写法 | 批次 |
| --- | --- | --- | --- | --- | --- |
| S1 | `privhub-svc-audit` | `ctx.audit` | `log(entry)` / `query(filter)` / `exportCsv()` | 替代 `ctx.privhub.appendAudit` | ① |
| S2 | `privhub-svc-acl` | `ctx.acl` | `can(user, action, file)` / `setRule(...)` / `listRules()` | 替代"canAccess 之上加文件级" | ① |
| S3 | `privhub-svc-watermark` | `ctx.watermark` | `render(user)` / `applyTo(el)` | 预览叠加数字水印 | ① |
| S4 | `privhub-svc-search` | `ctx.search` | `query(q, scope)` / `index(doc)` / `remove(id)` | 统一 B8 搜索 + C15 全文 + C17 图谱索引源（基础版） | ① |
| S5 | `privhub-svc-meta` | `ctx.meta` | `getTags(file)` / `setTags(file, tags)` / `templates()` | 标签 / 模板元数据统一存储（基础版） | ① |
| S6 | `privhub-svc-collab` | `ctx.collab` | `join(docId)` / `presence()` / `broadcast(patch)` | 协同光标 / 实时编辑 | ② |

**注册顺序与拓扑排序**：L2 的 Service 插件在 L3 功能插件**之前**注册（Cordis 按依赖图自动排序——Service 先挂，消费方后挂，缺依赖的功能插件不启动）。
**后续升级（不新增目录，在原 Service 上扩展）**：S4 在批次③接入 Meilisearch/FTS5 替换索引后端；S5 在批次②补全模板/标签完整能力；S6 在批次③接入 Yjs 落地实时协同。

---

## 4. L3 功能插件搭配（按开发批次编号 F01–F27）

> 每行三件事：**消费哪些 Service**（inject）· **发/听哪些事件**· 挂载 slot / 现状。
> 原映射表"依赖 core"列统一升级为"消费 Service + 事件契约"；**编号 F01–F27 = 开发批次①→②→③的构建顺序**；"原需求编号"列保留需求文件原始编号供追溯。

### 4.1 批次①（🟢 本轮，12 个：F01–F12）

> 先落 S1–S5 五个基础 Service，再把前端待迁 / 骨架自带功能按目录拆出。全部不碰基座已落地代码。

| 新编号 | 原需求编号 | 目录 | inject（消费 Service） | 监听 / emit 事件 | slot | 现状 |
| --- | --- | --- | --- | --- | --- | --- |
| F01 | A3 | `privhub-shell-tabs` | shell | `emit tab:open/close`；`listen file:opened` | panel(标签栏) | ⬜ |
| F02 | 收藏 | `privhub-shell-favorites` | privhub | `emit favorites:changed{id}`；`listen file:opened` | app-iconbar + tree | ⬜ |
| F03 | 最近 | `privhub-shell-recent` | privhub | `listen file:opened{id,path}` → 写入最近；`emit recent:updated` | user-area | ⬜ |
| F04 | D25 | `privhub-shell-settings` | privhub | `listen auth:login/logout` 重置 | app-iconbar(齿轮) | ⬜ |
| F05 | 水印 | `privhub-auth-watermark` | auth, watermark | `listen file:opened` 决定是否叠加；`listen auth:login` 取用户信息 | preview(叠加层) | ⬜ |
| F06 | B9 | `privhub-trash-ui` | trash | `emit trash:changed`；`listen file:trash` 刷新角标 | app-iconbar(角标) + panel | 🟡 |
| F07 | B6 | `privhub-files-explorer` | files, privhub | `emit file:opened / file:trash / file:restored`；`listen trash:changed` 刷新树 | tree + panel | 🟡 |
| F08 | B7 | `privhub-files-preview` | files | `listen file:opened` 渲染预览 | preview | 🟡 |
| F09 | B8 | `privhub-files-search` | search, files | `emit search:queried`；`listen file:saved` 触发重索引 | panel(顶部框) | 🟡 |
| F10 | B10 | `privhub-files-batch` | files, trash | `emit file:trash{id}`（调 trash Service）；`listen file:restored` | panel(多选+工具栏) | 🟡 |
| F11 | B11 | `privhub-files-upload` | files | `emit file:uploaded{path}`（触发防病毒钩子）；`listen upload:progress` | panel(拖入) | 🟡 |
| F12 | B12 | `privhub-files-upload-queue` | — | `listen upload:progress / file:uploaded` 更新队列 | panel(底部抽屉) | 🟡 |

> F05 水印**不是**直接改 preview，而是消费 S3 `watermark` Service 提供的叠加能力，挂在 preview slot 上。

### 4.2 批次②（🟠 阶段三，10 个：F13–F22）

> 落 S6 `collab`，并补全 S5 `meta` 完整版；开发 admin 三个 + files 七个进阶功能。

| 新编号 | 原需求编号 | 目录 | inject（消费 Service） | 监听 / emit 事件 | slot | 现状 |
| --- | --- | --- | --- | --- | --- | --- |
| F13 | B13 | `privhub-admin-audit` | audit, privhub | `listen file:saved / file:trash / auth:login` → `ctx.audit.log(...)` | （服务 + 数据） | ⬜ |
| F14 | ACL | `privhub-admin-acl` | acl, privhub | 自身注册为 `ctx.intercept('privhub', { canAccess })` 增强权限引擎 | （策略） | ⬜ |
| F15 | 审计面板 | `privhub-admin-audit-panel` | audit | 调 `ctx.audit.query`；`listen audit:logged` 刷新 | app-iconbar(adminOnly) | ⬜ |
| F16 | C14 | `privhub-files-edit-md` | files, privhub | `emit file:saved{id,doc}`（触发检索/图谱/审计）；`listen file:opened` | panel | ⬜ |
| F17 | C15 | `privhub-files-fulltext` | search | `listen file:saved` → `ctx.search.index(doc)` | panel(搜索框切换) | ⬜ |
| F18 | C17 | `privhub-files-kg` | files, meta | `listen file:saved` 重建关联图 | panel(图谱视图) | ⬜ |
| F19 | 标签 | `privhub-files-tags` | meta, privhub | `listen file:opened` 显示标签；`emit meta:changed` | tree(右键)+panel | ⬜ |
| F20 | 模板 | `privhub-files-template` | meta, files | `listen meta:changed` | panel | ⬜ |
| F21 | 导出 | `privhub-files-export` | files | — | panel(菜单) | ⬜ |
| F22 | 知识库 | `privhub-files-wiki` | files | `listen file:saved` 刷新视图 | panel(视图切换) | ⬜ |

> **关键修正**：F14 ACL 不再"改 canAccess"，而是由 `privhub-admin-acl` 插件用 `ctx.intercept('privhub', { canAccess(ctx, ...) {...} })` 增强 core 的权限引擎——原 `canAccess` 不受影响，卸载 ACL 自动恢复。

### 4.3 批次③（🟡 后话，5 个：F23–F27）

> S4 升级 Meilisearch、S6 升级 Yjs；开发外部依赖/低风险优先评估项。

| 新编号 | 原需求编号 | 目录 | inject（消费 Service） | 监听 / emit 事件 | slot | 现状 |
| --- | --- | --- | --- | --- | --- | --- |
| F23 | C22 | `privhub-files-agent` | files, privhub, authz | 鉴权代理（受 `canAccess` 约束） | （admin 启用） | ⬜ |
| F24 | 检索引擎 | `privhub-files-search-engine` | search | 替换 `ctx.search` 索引后端为 Meilisearch/FTS5 | （后端） | ⬜ |
| F25 | 协同 | `privhub-files-realtime` | collab, files | `listen file:opened` 加入协同会话 | panel(协同光标) | ⬜ |
| F26 | 引用图 | `privhub-files-backlinks` | meta, files | `listen file:saved` 重建反向链接 | panel(侧栏) | ⬜ |
| F27 | 防病毒 | `privhub-core-antivirus` | privhub | `listen file:uploaded{path}` → 调 ClamAV 扫描，命中 `emit security:blocked` + `ctx.audit.log(...)` | （上传钩子） | ⬜ |

> **关键修正**：F27 防病毒不再"扩展 upload 流程 hook"，而是监听 F11 上传插件 emit 的 `file:uploaded` 事件——upload 插件完全不知道防病毒的存在，删掉防病毒插件，上传照常工作。

---

## 5. 跨插件通信示例（事件流，证明"互不 inject"也能协作）

**场景 A：用户打开一个文件**
```
F07 files-explorer 监听到双击
  → emit('file:opened', {id, path})
  → F03 shell-recent    listen → 写入最近列表，emit('recent:updated')
  → F08 files-preview   listen → 渲染预览
  → F05 auth-watermark listen → 决定是否在预览叠加水印
  → F18 files-kg / F26 backlinks listen → 刷新关联图（异步）
```
没有任何插件直接调用另一个插件的内部方法，全部通过事件解耦。

**场景 B：用户删除文件**
```
F10 files-batch 调 trash Service.moveToTrash()
  → emit('file:trash', {id})
  → F06 trash-ui    listen → 角标 +1
  → F07 files-explorer listen → 目录树移除该项
```

**场景 C：用户保存编辑**
```
F16 files-edit-md 写入并 emit('file:saved', {id, doc})
  → F17 privhub-files-fulltext listen → ctx.search.index(doc)
  → F18 privhub-files-kg       listen → 重建图谱
  → F13 privhub-admin-audit    listen → ctx.audit.log(...)
```

---

## 6. 增强用 intercept 的标准写法（替代"污染原服务"）

```js
// 旧（违规）：ctx.privhub.appendAudit = function(){...}
// 新（合规）：独立 Service + 注入
// privhub-svc-audit/src/index.ts
export class AuditService extends Service {
  constructor(ctx) { super(ctx, 'audit') }   // 暴露为 ctx.audit（S1）
  log(entry) { /* 写 JSONL，保留 60 天 */ }
}

// ACL 增强权限引擎（不改 canAccess 源码）
// privhub-admin-acl/src/index.ts（F14）
export const inject = ['privhub']
export function apply(ctx) {
  ctx.intercept('privhub', {
    canAccess(original, user, action, resource) {
      // 在 core 权限判定之上叠加文件级 ACL
      if (!ctx.acl.can(user, action, resource)) return false
      return original(user, action, resource)
    },
  })
}
```

---

## 7. 可插拔验证（删插件零残留）

以"删除 `privhub-files-search`（F09）"为例：
1. 移除该目录 → shell 的 `readdir` 聚合不再挂载其 UI。
2. 它 `inject` 的 `search` / `files` Service 由**别的插件**提供（S4 / L1），不受影响。
3. 它 `emit` 的 `search:queried` 若无人监听，Cordis 事件无监听方是安全的（不报错）。
4. 卸载时它的 `ctx.effect` 注册的所有监听器被**逆序清理** → 零残留。
5. 其余 26 个功能插件照常工作。

这正是 Cordis 文档第 8.3 节"删掉一个插件目录，运行时零残留"的工程落地。

---

## 8. 落地批次（沿用映射表，附新编号）

- **批次①（🟢本轮）**：L2 的 S1 `audit` / S2 `acl` / S3 `watermark` / S4 `search`（基础）/ S5 `meta`（基础）先落地为 Service；L3 的 F01–F12（shell×4 + auth 水印 + trash B9 + files B6~B12）按功能拆目录迁过去。**全部不碰基座已落地代码**，只建新目录或把待迁前端挪进新目录。
- **批次②（🟠阶段三）**：L2 的 S5 `meta` 完整版 / S6 `collab`；L3 的 F13–F22（admin B13/ACL/审计面板、files C14/C15/C17/标签/模板/导出/知识库）。
- **批次③（🟡后话）**：L2 的 S4 接 Meilisearch/FTS5、S6 接 Yjs；L3 的 F23–F27（C22/检索引擎/协同/引用图/防病毒，评估外部依赖与 Windows 低配风险后做）。

---

## 9. 与配套文档的关系

- **《PrivHub-物理拆分映射表.md》**：本文第 3/4 节已反向修订其第 84、85、120、160 行——把 `ctx.privhub.appendAudit`、`canAccess 加文件级`、`扩展 upload hook` 等违规写法，替换为 L2 能力 Service + `intercept` + 事件钩子。改后两份文档自洽。
- **《PrivHub-插件实现规则.md》**：第 4 节"34 个功能插件规则"中的实现/交互描述，按本文升级为"消费 Service + 事件契约"。
- **《PrivHub-知识图谱.html》**：图谱管"有哪些、挂哪"；本文管"怎么按 Cordis 原理搭配、怎么通信"。新增功能 = 图谱加节点 + 映射表加一行 + 建目录 + （若复用能力则 inject 对应 Service，跨插件则 emit/listen 事件）。
- **编号对照**：本文 F01–F27 / S1–S6 为开发进度编号；《物理拆分映射表》《插件实现规则》仍沿用需求原始编号（A3/B6/C14…），跨文档追溯时以"原需求编号"列对齐。
</content>
