# 03 · 功能实现完整性评审

> 评审角度：**功能到底做完了没有、名实是否相符**（宣称有的功能，用户真的能用上吗）
> 源码基线：`privhub/` v3.1.0（`privhub/package.json:3`）｜评审日期：2026-09-18
> 纪律：全程只读，`privhub/` 与 `docs/` 已有文件**零改动**（`git status --porcelain` 已核）
> 口径沿用《交底》：活跃插件 50／含 client 32／含 src 43／无 client 18／有 client 无 src 7／barItems 20／图标栏 12
>
> **正文的可信度标注说明**：§3.2、§3.3 与附录各表的每一行都挂了 `文件:行号`，凡该行**我亲自打开文件读到**的即 **【实体】**（§3.2/§3.3/附录为全实体，逐行已核）；仅 §3.2 中"A 的用户观感部分"、§3.2 第五梯队 #6、§3.4 与 §6 中带标记的条目标为 **[推断]** 或 **[存疑]**。"实测"一律指 §2.2 里列出并已执行过的命令。
>
> **⚠ 本报告初稿有一处事实性错误，已在实测后更正并留痕**：初稿写"`privhub-admin-console` 的 barItem 漏了 `adminOnly`，普通用户也能进管理界面" —— **错**。该 manifest 确有 `adminOnly:true`（`tests/admin-console.mjs` 实测 **76 通过 / 0 失败**）。更正后的结论更精确，见 §3.2 A 与 §6 第 6 条。

---

## 1. 一句话结论

**功能本身没缺：12 个图标入口 12 个有真实落地、`openBarItem` 白名单一个 view 不漏、8 条 `admin-nav` 全有实现。真正的问题是"名字与行为被拆到了两个插件里"—— 图标栏底部第一项显示的是 👥「用户管理」（来自 `privhub-admin`），点开却是「管理控制台」（由 `privhub-admin-console` 渲染），而控制台自己那条 🛠️ 声明因为两个插件都用了 `view:'admin'` 而**永远不会显示在图标栏上**。同类的"声明与实现脱节"还有 6 处，都是同一个病根：`view` 在本仓既当"入口标识"又当"视图标识"，且**允许多个插件声明同一个值**。**

根因链（全部已实测）：
1. `privhub-admin/client/manifest.json:8` 与 `privhub-admin-console/client/manifest.json:8` **都声明 `view:"admin"`**（前者 `slot:"admin-nav"`，后者 `slot:"admin-console"`，**两者都带 `adminOnly:true`**）。
2. `privhub-shell/client/index.js:80-83` 的 `bottomItems` 用 `order.map(v => barItems.find(bi => (bi.view||bi.slot) === v))`，`order=['admin','settings']` → `find('admin')` 取**第一条**，即 `privhub-admin` 的 👥 用户管理（实测 `plugins/` 枚举序：`privhub-admin`=0、`privhub-admin-console`=4）。
3. `frontend/index.html:1049` 在 `activeView==='admin'` 时渲染 `slotComps['admin-console']`（AdminShell） → **点开的是控制台**。
4. **口子在 `:75-78` 与 `:80-83` 的不对称**：`topItems` 有 `bi.slot !== 'admin-nav'` 过滤（把"只给控制台侧栏用"的声明挡掉），`bottomItems` **没有**这个过滤 —— 所以一条 `slot:"admin-nav"` 的条目才会出现在图标栏底部。
5. 连带后果：`privhub-admin-console` 自己的 🛠️ 图标栏条目**从未被渲染**，它的 `barItems` 唯一实际作用是给控制台 `routes.js` 的 `viewSet()` 当"视图已装载"的凭据。

**实测命令与结果**（已跑）：
- `node tests/admin-console.mjs` → **76 通过 / 0 失败**（含"管理控制台图标栏条目为 adminOnly"）
- `node tests/frontend-templates.mjs` → **12 通过 / 0 失败**（60 个模板零错误零警告）
- 复刻 `loadBarItems`/`topItems`/`bottomItems` 的只读脚本 → 管理员视角 `bottomItems(2): 👥用户管理 [slot=admin-nav] | ⚙设置 [slot=app-iconbar]`；普通用户视角 `bottomItems(1): ⚙设置`（**普通用户看不到管理入口，这一点是对的**）

---

## 2. 我实际看过的证据

### 2.1 亲自打开并逐行读过的文件

| 文件 | 看过什么 |
|---|---|
| `privhub/frontend/index.html` | 全文 1130 行（`nav` 状态机 :425-690、桥 :731-764、渲染链 :975-1115） |
| `privhub/plugins/privhub-shell/client/index.js` | 全文 167 行（`topItems` :75-78、`bottomItems` :80-83、`isActive` :85-94、模板 :99-121） |
| `privhub/plugins/privhub-shell/server/index.ts` | 全文 112 行（`collectManifests` :42-76、冲突检测 :56-62、分级返回 :99-107） |
| `privhub/plugins/privhub-admin-console/client/manifest.json` | 全文 10 行（含 `:8` 的 `adminOnly:true`） |
| `privhub/plugins/privhub-admin-console/client/routes.js` | 全文 143 行（ROUTES 13 条 :37-54、`viewSet` :71-78、`isAvailable` :81-86、`isPending` :100-102） |
| `privhub/plugins/privhub-admin-console/client/shell.js` | 全文 182 行（`viewComps` :60-65、`missing` :73-78、`:89` `isMobileDetail`、渲染 :150-171） |
| `privhub/plugins/privhub-admin-console/client/action.js` | 全文 112 行（`navigate` :48-58、`onHashChange` :87-93） |
| `privhub/plugins/privhub-admin-console/client/sidebar.js` | 全文 64 行 |
| `privhub/plugins/privhub-admin-console/client/index.js` | 全文 26 行 |
| `privhub/plugins/privhub-admin-console/client/panels.js` | :180-209、:259-266、:313 |
| `privhub/plugins/privhub-files-explorer-v3/client/panel.js` | :1-200、:270-295、:355-400、:400-617 |
| `privhub/plugins/privhub-files-explorer-v3/client/ops.js` | :1-40、:138-155、:204-225、:330-345 |
| `privhub/plugins/privhub-files-explorer-v3/client/detail.js` | :105-125 |
| `privhub/plugins/privhub-files-explorer-v3/client/utils.js` | :12-33 |
| `privhub/plugins/privhub-files-explorer-v3/client/treecache.js` | 全文 50 行 |
| `privhub/plugins/privhub-files-upload/client/index.js` | 全文 177 行 |
| `privhub/plugins/privhub-trash-ui/client/index.js` | 全文 97 行 |
| `privhub/plugins/privhub-shell-settings/client/index.js` | 全文 156 行 |
| `privhub/plugins/privhub-admin/client/index.js` | :12-90 |
| `privhub/plugins/privhub-admin/src/index.ts` | 路由与 admin 判定（:29-122） |
| `privhub/plugins/privhub-trash/src/index.ts` | 路由与权限（:49-115） |
| `privhub/plugins/privhub-svc-rag/client/index.js` | :985-1029 |
| `privhub/plugins/privhub-svc-rag/src/index.ts` | :1085-1139 |
| `privhub/plugins/privhub-svc-collab/src/index.ts` | 全文 125 行 |
| `privhub/plugins/privhub-files-template/client/index.js` | :100-120、:165-186 |
| `privhub/tests/admin-console.mjs` | :320-399、:400-539、:680-696 |
| `privhub/tests/frontend-templates.mjs` | 全文 336 行 |
| `privhub/tests/run-all.mjs` | 全文 143 行 |
| 32 个 `client/manifest.json` | **全量 dump 逐条读过**（barItems 与 slots 声明） |
| `CHANGELOG.md`（仓库根，非 `privhub/` 内） | :25-139（v3.1.0 全文） |

### 2.2 跑过的命令 / 脚本

| 命令 | 结果 |
|---|---|
| `git status --porcelain` | 只有未跟踪目录；`privhub/` 与 `docs/` 已有文件**零改动** |
| `git log --oneline` | 最新 `5f1beb1 v3.1.0 管理控制台外壳…` |
| `node tests/frontend-templates.mjs` | **12 通过 / 0 失败** |
| `node tests/admin-console.mjs` | **76 通过 / 0 失败** |
| `node -e "readdirSync('plugins')"` | `privhub-admin` idx **0**、`privhub-admin-console` idx **4** |
| 复刻 `loadBarItems`/`topItems`/`bottomItems` 的只读脚本 | barItems **20**；topItems **10**；bottomItems **2**；全部 view 值 **14** 个 |
| 复刻服务端冲突检测的只读脚本 | 唯一冲突：`admin : privhub-admin <-> privhub-admin-console` |
| slot 覆盖扫描 | 声明 slot **31** 个；骨架不直接渲染的 **4** 个（`admin-settings`/`admin-tags`/`admin-template`/`admin-trash`，由 AdminShell 从 `slotComps` 取，属设计内） |
| 死全局读取计数 | `openSettings`/`openAcl`/`openAudit`/`openTags`/`openTemplate`/`openKg`/`openWiki`/`openConsole` 各**写 1 / 读 0**；`openAdmin` 读 4 次（活着） |
| `readBodyRaw` / `readJsonBody` 出现次数 | **各 1 次**（只有定义，零调用） |

### 2.3 委派的只读勘察（2 个 subagent，1 个已验证）

- `7fd6bab3`（能力层 vs 缺入口）— 关键结论我已逐条独立复验（§附录 表 D）。
- `0eb1ae96`（死代码与重复实现）— **其线索我已抽验：全部成立**（明细见 §3.3；抽验项：8 个死全局的读计数、`readBodyRaw`/`readJsonBody` 出现次数、`ops.js:140-151` 无护栏 vs `template:104` 有护栏、`ops.js:335` vs `template:172` 的 HTML 模板同构、两个不可达分支）。

---

## 3. 现状判定

### 3.1 做对了的

| # | 事实 | 证据 |
|---|---|---|
| 1 | **图标栏 12 个入口，逐个追到渲染链，全部有真实组件落地，没有一条"点了白屏"** | 见 §附录 表 A：12/12 全部 `slotComps[...]` 命中 |
| 2 | **`openBarItem` 的视图白名单覆盖全部 14 个 view，一个不漏** | 全部 view 值 = `acl, admin, agent, audit, favorites, files, kg, rag, search, settings, tags, template, trash, wiki`；`index.html:748-764` 显式分支 5 个 + `else if` 列表 9 个 |
| 3 | **8 条 `admin-nav` 全部在控制台侧栏有路由、有实现、点得到**（含 4 个 `admin-*` slot 别名全部真实 export） | 见 §附录 表 B；`files-tags:152`、`files-template:361`、`trash-ui:95`、`shell-settings:154` |
| 4 | **`adminOnly` 过滤是生效的：普通用户看不到管理入口** | 实测普通用户视角 `bottomItems(1): ⚙设置`；`index.html:742` `if (bi.adminOnly && !admin) continue` |
| 5 | **"插件卸载 → 侧栏条目变『待接入』"真实成立且有测试覆盖** | `routes.js:100-102`；`sidebar.js:53`；`shell.js:151-157`；`tests/admin-console.mjs:393-399` |
| 6 | **管理控制台的失败可见性比文件侧高一个档次**：骨架屏、带主按钮的空状态、带"重试"的局部错误卡片、危险操作要打字确认 | `ui.js:18/40/75/96/187/292`；`shell.js:151-157`；`tests/admin-console.mjs:537-560` |
| 7 | **前端模板有编译回归防线**，能挡住"模板写错 → 打开某界面才白屏" | `tests/frontend-templates.mjs:210-240`（已实测 12/12 通过） |
| 8 | **RAG 摄取队列确有"重启补偿"**，不止是内存队列 | `svc-rag/src/index.ts:1127-1128` `setTimeout(() => rebuild(ctx), 8000)` |

#### `F4` 五项未做功能 · 现状实测（逐项给"停在哪一步"）

| 项 | 现状 | 证据 |
|---|---|---|
| 多人实时协同 | **服务骨架已注册，全仓零消费者**。`CollabService` 提供 `join/leave/presence/broadcast/stats`；`ctx.collab` 注册于 `:63`；**全仓 `ctx.collab` / `collab.join|broadcast|presence` 的调用点 = 0**（仅注释与 `package.json` 自述）。无 CRDT、无协同光标、无前端 | `svc-collab/src/index.ts:54-119,121-125` |
| 病毒扫描 | **全无**。全仓 `virus\|clamav\|杀毒` 命中 0（12 处命中全是"扫描文件/扫描网段"的无关义）。上传完成的 `file:uploaded` 事件已 emit，源码注释自陈"当前无监听者" | `files-upload/client/index.js:120-121` |
| 外部检索引擎 | **未接**。仍是自研 BM25+bigram（`svc-search`）+ sqlite-vec | `svc-rag/src/index.ts` 全文无 Meilisearch/FTS5 |
| 反向链接面板 | **未做**。全仓 `反向链接\|反链\|backlink` 命中 **0**（唯一命中在 `easymde.min.js` 的无关代码） | — |
| RAG 摄取队列持久化 | **队列纯内存（闭包变量），进程重启丢事件；但有一次性的启动全量重建兜底，无周期定时器** | 队列 `:1090-1094`；事件订阅 `:1098-1125`；兜底 `:1127-1128`；`grep setInterval` 在 svc-rag 无命中 |

> 第 5 项比《改进建议》F4 的说法更精确：原文标 **[不确定] 是否有周期性 rebuild 补偿** → 实测答案：**没有周期，只有启动后一次性 `setTimeout`**。

### 3.2 做错了的

| # | 问题 | 严重度 | 证据 |
|---|---|---|---|
| **A** | **底部管理组图标"写 A 开 B"**：显示 👥「用户管理」，点开是「管理控制台」；控制台自己的 🛠️ 声明**永不显示** | **高**（第一眼困惑） | 见 §1 根因链 1-5。关键两行：`shell/client/index.js:80-83`（`find()` 取首条，无 `admin-nav` 过滤）vs `:75-78`（`topItems` **有**该过滤）；`index.html:1049`（实际渲染 `admin-console`） |
| **B** | **管理控制台侧栏的 `adminOnly` 是死字段：普通用户绕过图标栏进来后，13 条全部可见可点** | 中 | `routes.js:41,47,52,53` 声明 `adminOnly: true`，但**全仓无任何读取处**（`shell.js:60-65` 只看 `r.slot`/`r.builtin`；`sidebar.js` 只看 `it.pending`/`it.provider`）。**唯一的"进不来"靠图标栏过滤**（`index.html:742`）；一旦用户手输 `#/admin/access/users`，`action.js:87-93` 的 `onHashChange` 会照常进入并渲染 |
| **C** | **进得来之后是"哑失败"**：`/privhub/api/admin/users` 返回 403，客户端**静默**，渲染出只有表头、零行的空表格 | 中 | 服务端拦得住：`privhub-admin/src/index.ts:53-56`。客户端不报：`privhub-admin/client/index.js:27-30` `if (r.ok) {...}` **无 else**；模板 `:67-82` **无空状态、无错误提示**。控制台已有现成的 `ui.js:75 AdminErrorState`，未被使用 |
| **D** | **图标栏"AI 工具"在 RAG 视图内点击会把自己关掉（toggle 语义泄漏）** | 中 | `index.html:759-762` 对 `rag/tags/template/kg/wiki/agent/settings/acl/audit` 走 `nav.setActiveView(view)`；`setActiveView`（`:460-463`）在 `activeView === v` 时把目标改成 `'files'` → **再点一次回文件页**。而 `svc-rag/client/index.js:1001-1006` 的 `openRagDup()` 正是"找 `view==='rag'` 的 barItem → `openBarItem`"，其唯一调用者是**文件页的「🔁 查重」按钮**（`panel.js:318`）；用户在 AI 工具页内再次触发即把面板关掉。**仅 `admin` 分支加了 `noToggle`（`:756-758`），其余 9 个 view 没有** |
| **E** | **`entryOf` 依赖的"视图已装载"是**跨插件的巧合**：`access/users` 能否点，取决于 `privhub-admin` 是否还在 | 中（脆弱） | `routes.js:84-85` `isAvailable` 用 `viewSet()` 判 `entryOf:'admin'` 是否存在；`viewSet`（`:71-78`）遍历 `barItems` 收 `view`。而 `view:'admin'` 的两条声明里，**`:1049` 渲染的是控制台、`:1052` 渲染的才是 `slotComps['admin']`**。若卸载 `privhub-admin`，`viewSet` 里 `admin` 依然在（控制台自己也声明了），于是侧栏**不会**变"待接入"，但内容区 `viewComps` 取空 → 落到 `shell.js:151` 的"暂不可用"卡片。**两种降级路径都能给出可见解释，但判据不自洽** |
| **F** | **同一前端两套人机工程，本报告实测的差距比既有说法更窄也更准** | 低（但有真缺口） | **管理侧确实独有**：打字确认危险操作（`ui.js:108-140`）、`Esc` 关弹窗（`ui.js:108`）、列表-详情主从（`ui.js:292`）、`↑/↓` 键盘选择（`panels.js:259-266,313`）。**但"键盘选择"只在发布链接页有**：`ui.js:187-266` 的 `AdminDataTable` **无 `tabindex`、无键盘处理**，用户管理与项目权限矩阵**都只有鼠标**。**文件侧的真缺口**：`explorer-v3/client/ops.js:18-24` 的全局 Esc 只取消重命名/关菜单，**没有"回到目录"**；回到目录的唯一办法是关掉标签（`panel.js:375` `v3-tab-x`）或走 ⋯ 菜单的"关闭当前标签"（`:391`）—— 对比控制台顶栏常驻「← 返回文件」（`shell.js:106`） |
| **G** | **图标栏底部注释与实现三方不符** | 低（会误导维护） | `shell/client/index.js:79` 注释写"只保留「管理控制台」一个入口"，`:81` 的 `order` 却是 `['admin','settings']`；`index.html:219-220` CSS 注释仍写"底部管理组（设置/用户管理/权限管理/审计）"——四项目时代残留。**三处互相矛盾，且注释描述的是设计意图、实现是另一种、显示出来又是第三种** |
| **H** | **`settings.defaultView` 是一个"完整但两头都断"的功能** | 低 | 后端存：`shell-settings/src/index.ts:23,36,84`；骨架读：`index.html:933` `nav.viewMode = r.settings.defaultView`；**写入入口 = 0**（`shell-settings/client/index.js` 与 `admin-console/client/panels.js` 全无 `defaultView`/`默认视图` 字样）；**消费方 = 0**（`nav.viewMode` 只被 `:443` 声明、`:553` 写、`:933` 写，**无任何读取**；`nav.setViewMode` 无调用方；网格/列表开关只存在于退役 v2 `:320-321,330`） |
| **I** | **版本号规则要求的 `CHANGELOG.md` 不在 `privhub/` 内**（实际在仓库根） | 低 | `privhub/` 下无 `CHANGELOG.md`；根有 `CHANGELOG.md`（22,784 B）。交底 §6 第 8 条未指明路径 |
| **J** | **插槽越权直取：控制台拿到了骨架的全部组件实例** | 低（当前未出事） | `shell.js:60-65` `viewComps` 直接 `this.slotComps[r.slot]`；`slotComps` 由 `index.html:1049` 整份注入。→ 控制台可渲染**任何** slot，**不受该插件 manifest 声明约束**。当前 4 个 `admin-*` 别名都在 manifest 里如实声明，所以没出事；但这条通道本身没有守卫 |

#### `view` 重名全景（这是 A 与 E 的同一块土壤）

| view | 声明 1 | 声明 2 | 是否曾出事 |
|---|---|---|---|
| `admin` | `privhub-admin`（`slot:"admin-nav"`, adminOnly） | `privhub-admin-console`（`slot:"admin-console"`, adminOnly） | **是 —— 问题 A** |
| `agent` | `shell-agent-console`（`slot:"app-iconbar"`，全员） | `shell-agent-console`（`slot:"admin-nav"`, adminOnly，同插件） | 否（同插件，`viewSet` 语义自洽） |
| `settings` | `shell-settings`（`slot:"app-iconbar"`，全员） | `shell-settings`（`slot:"admin-nav"`, adminOnly，同插件） | 否（同上） |
| `trash` | `trash-ui`（`slot:"panel"`, 全员） | `trash-ui`（`slot:"admin-nav"`，同插件） | 否（同上） |
| `tags` | `files-tags`（`slot:"panel"`） | `files-tags`（`slot:"admin-nav"`，同插件） | 否 |
| `template` | `files-template`（`slot:"panel"`） | `files-template`（`slot:"admin-nav"`，同插件） | 否 |

> **6 组重名，只有 `admin` 那一组是跨插件的** —— 所以只有它出了事。但 6 组用的是同一个机制，`server/index.ts:56-62` 的冲突检测也**只对跨插件生效**（同插件重复不报）。这就是问题 A 能藏到现在的原因。

#### 死代码 / 不可达分支 / 死字段清单

**第一梯队：已无活跃调用方的骨架函数/状态（`_retired-v2` 不计作调用方）— 10 个**

| # | 符号 | 定义位置 | 全部出现位置 | 判定 |
|---|---|---|---|---|
| 1 | `nav.doRename` | `index.html:593` | `:593` + 退役 v2 `:132` | **死**（V3 侧同名的是 `ops.js:76` 独立函数） |
| 2 | `nav.submitMkdir` | `index.html:584` | `:584` + 退役 v2 `:63,:242`；`ops.js:304` 仅注释 | **死**（活跃侧用 `submitMkdirV3`） |
| 3 | `nav.isExpanded` | `index.html:524` | `:524` + 退役 v2 `:22` | **死** |
| 4 | `nav.childrenOf` | `index.html:528` | `:528` + 退役 v2 `:23,:69` | **死** |
| 5 | `nav.setViewMode` | `index.html:553` | `:553` + 退役 v2 `:320,:321` | **死** |
| 6 | `nav.openEntry` | `index.html:568` | `:568`；`edit-md:4`(注释)、`:396`(= `bus.on('entry:open')` 的事件名，**不是**调用) | **死** |
| 7 | `sortedEntries()` | `index.html:694` | `:694` 定义、`:731` 挂到 `window.PrivHub` | **死**（挂了但无人读） |
| 8 | `nav.viewMode` | `index.html:443` | `:443` 声明、`:553` 写（本身死）、`:933` 写 | **死状态**（见问题 H） |
| 9 | `nav.toggleTree` | `index.html:511` | 定义 + 退役 v2；**活跃侧 V3 用 `treecache.js:33 toggleTree`** | **死**（连带 `nav.tree`/`nav.treeKey`/`nav.refreshTree` 整棵缓存树在活跃界面失效，见下） |
| 10 | `nav.gotoCrumb` | `index.html:507` | 定义 + **`panel.js:426` 有活跃调用** | ✅ **不是死的**（列此以说明"逐条核实"的必要） |

> 第 9 项的连带影响（**这条比死函数本身重要**）：`nav.refreshTree`（`index.html:532`）仍被 3 个活跃点调用 —— `files-office-ui/client/index.js:99`、`files-tags/client/index.js:61`、`files-wiki/client/index.js:142`（都写作 `nav.refreshTree && nav.refreshTree()`）。但它清的是 `nav.tree`，而 **V3 的树用 `store.tree`**（`treecache.js:14-48`）。→ **这 3 处在活跃界面上是空转**：改完标签/知识库/Office 保存后，左侧目录树不会自动刷新（V3 自己走 `ops.js` 里的 `refreshTree()`，但外部插件调的是骨架那个）。**这是一个"能看见的功能落差"，不只是代码整洁问题。**

**第二梯队：写到 `window.PrivHub` 上但从没人读的全局 — 8 个**

`openSettings`(`index.html:956`)、`openAcl`(`:957`)、`openAudit`(`:958`)、`openTags`(`:959`)、`openTemplate`(`:960`)、`openKg`(`:961`)、`openWiki`(`:962`)、`openConsole`(`:955`) —— **各写 1 / 读 0**（已实测）。对照 `openAdmin` 读 4 次（活着，含 `shell-settings:58` 的真实使用）。
**旁注**：这 7 个（去掉 `openConsole`）正是 `CHANGELOG.md:91-93` 承诺"全部保留"的入口，`tests/admin-console.mjs:684-686` 也在断言它们**存在**。所以"删掉"会与既有承诺冲突 —— 见 §5 第 1 条。

**第三梯队：定义后零引用的其它符号**

| 符号 | 位置 | 备注 |
|---|---|---|
| `readJsonBody` | `privhub-core/src/index.ts:153` | 全仓出现 **1 次**（已实测） |
| `readBodyRaw` | `privhub-core/src/index.ts:168` | 全仓出现 **1 次**（已实测）。**注意**：《改进建议》S1 把 `readBodyRaw` 当作"上限写法的现成参照"来推荐 —— 它确实写对了，但**自己也没人用** |
| `mockSeed` | `svc-model/src/index.ts:278` | 出现 1 次 |
| `isMobileDetail()` | `admin-console/client/shell.js:89` | 出现 1 次；模板用的是 `st.mobileDetail`（`:136,:142`） |
| `previewRender()` / `onInput()` | `edit-md/client/index.js:178` / `:289` | 各 0 引用（实走 `codemirror.on('change')` `:181`） |
| `discModel` / `pickModel` | `svc-rag/client/index.js:644` / `:645` | 各 1 次 |
| `panel.js` 模板零引用的 5 个方法 | `isEditFile:61`、`openFile:84`、`editActive:90`、`detailActive:120`、`reloadActive:161` | V3 拆模块时的残留 |
| `TreeNodeV3` import + `v3-tree-node` 注册 | `panel.js:17` + `:615` | panel 模板**无** `<v3-tree-node>`（真正注册它的是 `tree.js:148`）→ 死引用 |
| `esc, inline` import | `tree.js:11` | tree 模板未使用（`display:inline-block` / `@keyup.esc` 是假阳性） |
| 6 处未使用 import | `shell/client/index.js:16`(api)、`invite:11`(AUTH)、`tags:12`(AUTH)、`wiki:14`(AUTH)、`admin-console/action.js:15`(isValidKey)、`tree.js:11` | — |

**第四梯队：死字段**

| 字段 | 位置 | 为何是死的 |
|---|---|---|
| `implemented: true` | `routes.js:40,42,43,45,46,48,50,51` | 全仓无读取处 |
| `route.view` | 同上各条 | **`shell.js` 只读 `r.slot` 与 `r.builtin`**，`r.view` 无人读（`isAvailable:83` 读的也是 `route.view === ''` 这个**判断**，但真正的分发不用它） |
| `adminOnly` | `routes.js:41,47,52,53` | 全仓无读取处（问题 B） |
| `previewImageUrl` / `previewPdfUrl` | `index.html:722` / `:726` | 唯一"使用"是 `explorer-v3/client/deps.js:10` 解构 + `:13` 再导出，而该再导出无人 import；同一件事由 `utils.js:22-23 rawUrl` 承担 |

**第五梯队：逻辑上不可达 / 恒真 / 恒空**

| # | 位置 | 判定与推演 |
|---|---|---|
| 1 | `index.html:1057` | **不可达**。链：`:1031 v-if` → `:1033…:1049 v-else-if` → `:1052 v-else-if C` → `:1053 v-else-if(activeView==='admin')` → **`:1057 v-else-if C`（与 `:1052` 字面相同）** → `:1059/:1064 v-else-if` → `:1067 v-else`。记 C = `activeView==='admin' && slotComps.admin && slotComps.admin.length`：C 真→`:1052` 命中；C 假且 admin→`:1053` 命中；C 假且非 admin→两者皆假。**穷尽三情形均不命中 `:1057`**。旁证：全仓同文件内 v-if/v-else-if 条件重复者**仅此一对** |
| 2 | `panel.js:164` `if (e.isDir)` | **不可达**。`entries`（`:25-26`）已 `.filter(e => !e.isDir)`；唯一调用绑定是模板 `:462-463 v-for="e in entries"` → `:466 @click="onEntryClick(e)"` / `:467 @dblclick="onEntryDbl(e)"`（`:167` 转发同一个 `e`） |
| 3 | `shell-recent/client/index.js:34` `if (e.isDir)` | **恒真 → `:35-40` else 不可达**。全仓唯一写入方 `:49 record({..., isDir: true})`；服务端 `shell-recent/src/index.ts:96` `isDir = body.isDir === true`；`:45-49` 注释自述"打开任意目录都记录最近"。连带 `:63 e.isDir ? '📂' : '📄'` 恒取真支 |
| 4 | `admin-console/client/shell.js:142` | **恒真合取项**。`v-else-if="!st.mobileDetail && hasView"` 紧接 `:136 v-if="st.mobileDetail"` → 进入 else 已保证 `!st.mobileDetail`，该合取项无效 |
| 5 | `files-search/client/index.js:131` | **调用恒为常量**。`{{ h.isDir ? '📁' : fileIcon('') }}` —— `fileIcon`（`index.html:713-721`）对空串必回兜底 `'📄'`，实参 `''` 不含任何类型信息，等价于 `h.isDir ? '📁' : '📄'` |
| 6 | `panel.js:406-408` `v-else-if="content.office"` | **分支可达但正文恒空**。渲染 `renderMd()`（`:321` 读 `this.content.markdown`），而 office 数据的 markdown 挂在 `content.office.markdown`（`content.js:18`），顶层无 `markdown` → 恒输出空 div。**反向读法**：`office2/client/index.js:50` 恰好把 `.v3-md` 当锚点隐藏并插 iframe，故这个空 div 疑似被有意当占位符。**两种读法我都摆出来，不定性** |

### 3.3 重复实现清单（已排除 `json()` / `readBody()` / Markdown 渲染器）

| # | 动作 | 份数 | 位置 | 是否已分叉 |
|---|---|---|---|---|
| 1 | **下载文件**（`/api/download` + Blob + `a.click` + 5s revoke） | **4** | `panel.js:102-119`、`panel.js:270-294`、`ops.js:204-222`、`detail.js:107-124` | 否（当前四份逐字近似） |
| 2 | **上传文件**（`/api/upload` + Bearer + octet-stream） | **4** | `files-upload/client/index.js:111`（主通道）、`ops.js:122`（复制副本）、`ops.js:338`、`template/client/index.js:174` | 部分：**#1 的 URL 拼装处理 base+sub 前缀，另三处只处理单层目录** |
| 3 | **"新建空 HTML 页面"** | **2** | `ops.js:331-345` vs `template/client/index.js:171-179` | **是**（同构但硬编码分叉）：`ops.js:335` 标题写死「未命名页面」、文件名 `未命名页面-<base36四位>.html`；`template:172` 用用户输入的 `base`。**改默认页面模板要改两处** |
| 4 | **目录树递归构建** | **2** | `ops.js:140-151`（移动选择器）vs `template:103-114`（新建向导） | **是（护栏不同）**：`ops.js` **无深度/数量上限、不过滤符号链接**；`template:104` 有 `depth > 8 \|\| out.length > 400`，`:108` 跳过 `isSymbolicLink`。**超大目录下移动选择器无护栏** |
| 5 | **时间格式化** | **客户端 5 份 + 服务端 1 份 + 7 处裸 `toLocaleString`** | `index.html:617-621`、`edit-md:284-288`（与骨架**逐字相同**）、`admin-audit-panel:58-62`（+秒）、`admin-console/panels.js:56-69`（相对时间）、`shell-agent-console:59-63`（仅日期）、`svc-watermark/src/index.ts:68-69`；裸用法 `files-versions:73,78,111`、`invite:97`、`publish:99`、`comments:274`、`svc-rag:49` | **是（行为不一致）**：秒有无、相对/绝对、是否本地化混用并存 |
| 6 | **可编辑文本扩展名清单** | **2，且成员不同** | `edit-md/client/index.js:110`（16 项，**含 md**）vs `explorer-v3/client/utils.js:18`（15 项，**不含 md**；`:17` 注释自称"与 edit-md 保持一致"） | 当前**行为等价**（8 个调用点各自另写了 md 特判，如 `ops.js:267`、`panel.js:100`），**任何新调用点漏掉 md 特判即分叉** |
| 7 | **office 扩展名判断** | **4，粒度两派** | 正则 `/\.(doc\|docx\|xls\|xlsx\|ppt\|pptx\|pdf)$/i` 在 `detail.js:40` 与 `panel.js:602` 逐字重复；数组含 pdf 的 `ops.js:262`；不含 pdf 的 `utils.js:14`、`panel.js:53` | **是**（"是否含 pdf"分两派） |
| 8 | **面包屑构建** | **客户端 3 套 + 控制台 1 套** | 骨架 `index.html:788-794` 与 V3 `panel.js:41-47` **逐字相同**（仅模板图标不同）；`admin-acl:84,96` 另一套；控制台 `breadcrumb.js:10` + `shell.js:79-84`（section/route 语义，另一模型） | 骨架与 V3 完全重复，改一处另一处不跟 |
| 9 | 服务端文本扩展名集合 | **5 套，成员各异** | `core/src/index.ts:733`、`files-fulltext:32`、`files-versions:35`、`svc-rag:44`、`files-agent/m2.ts:302` | 是（后两者含 java/c/cpp/toml/markdown，versions 那套不含） |

### 3.4 我看不出来的

| # | 事项 | 缺什么才能判 |
|---|---|---|
| 1 | **`barItems` 的枚举序在部署机上是否一致** | 本机 Windows 的 `readdirSync` 返回字典序（实测 `privhub-admin` idx 0）。**Linux 上 ext4 的 readdir 不保证字典序** → 问题 A 的"显示哪一条图标"可能因平台而异；但"两条 `view` 冲突 + `bottomItems` 无 `admin-nav` 过滤"这个**根因与平台无关** |
| 2 | **112 条后端路由没有逐条核对前端调用方** | 只定位了 4 条无入口：`/office-preview`（`files-office/src/index.ts:46`）、`/ai/office/*` 4 条（`files-office-ai/src/index.ts:145,159,174,191`）、`/gitbackup/history\|restore`（`git-backup/src/index.ts:219,241`）、`/audit/stats`（`admin-audit/src/index.ts:124`）。**其余未核** |
| 3 | **`nav.refreshTree` 空转的实际用户可见程度** | 我确认了机制（骨架缓存 vs V3 `store.tree`），**但没实测**"标签页打完标签后左侧树是否真的不刷新"。属 [推断] |
| 4 | **`svc-collab` 是"超前建设"还是"白做"** | 代码事实确定（零消费者）。判断需要**主子的排期意图** |
| 5 | **`files-office-ai` 的 `pho_` 密钥体系是否"本来就只给外部程序用"** | 其 client 只有注释（`office-ai/client/index.js:2`"提供鉴权端点供外部智能体调用"）。若设计意图就是"不给人用的机器接口"，那它不算缺入口；但 `/ai/office/keys` 的签发/吊销**目前只能 curl**，对非程序员主子是真实障碍。标 **[存疑]**，不擅自定性为缺陷 |
| 6 | **`panel.js:406-408` 的空 div 是 bug 还是有意占位** | 两种读法都成立（见 §3.2 第五梯队 #6），需要主子或原作者确认 |

---

## 4. 改进建议

> 排序依据：**投入产出比**。P0 ≤ 5 条。每条含【问题】【证据】【改法】【验收】【成本】。

### P0-1 · 让图标栏底部"名实一致"：给 `bottomItems` 加 `admin-nav` 过滤

- **【问题】** 底部第一项显示 👥「用户管理」，点开是「管理控制台」；控制台自己的 🛠️ 声明永不显示。根因是 `topItems` 与 `bottomItems` 的过滤不对称。
- **【证据】**
  - `privhub-shell/client/index.js:75-78`（`topItems`）`return this.barItems.filter((bi) => !bottom.has(bi.view \|\| bi.slot) && bi.slot !== 'admin-nav')` ← **有** `admin-nav` 过滤
  - `privhub-shell/client/index.js:80-83`（`bottomItems`）`const order = ['admin','settings']; return order.map(v => this.barItems.find(bi => (bi.view \|\| bi.slot) === v)).filter(Boolean)` ← **没有**该过滤，且用 `find()` 取首条
  - `privhub-admin/client/manifest.json:8` `{ "icon":"👥","title":"用户管理","slot":"admin-nav","view":"admin", "adminOnly":true }`
  - `privhub-admin-console/client/manifest.json:8` `{ "icon":"🛠️","title":"管理控制台","slot":"admin-console","view":"admin", "adminOnly":true }`
  - 实测枚举序：`privhub-admin`=0 < `privhub-admin-console`=4
- **【改法】**（**只改 `shell/client/index.js` 一行，不动任何插件**）
  ```js
  const order = ['admin-console', 'app-iconbar']          // 底部两项：控制台 + 设置图标
  bottomItems() {
    return order
      .map((slot) => this.barItems.find((bi) => bi.slot === slot))
      .filter(Boolean)
  }
  ```
  按 `slot` 精确取：`slot:'admin-console'` = 🛠️「管理控制台」、`slot:'app-iconbar'` = ⚙「设置」。**顺带把 CSS 注释（`index.html:219-220`）与 JS 注释（`:79`）一起改成"底部管理组 = 🛠️ 管理控制台 + ⚙ 设置"**，三处对齐。
  ⚠ **不要**改成"删掉 `privhub-admin` 的 `admin-nav` 声明"：那条声明**是控制台 `routes.js:84-85 isAvailable` 判定「用户管理」页可用性的凭据**，删了会让它变成"待接入"（见问题 E）。
- **【验收】**
  - 管理员登录 → 底部第一个图标悬停提示为 **「🛠️ 管理控制台」**，点开进控制台
  - 管理员 → 底部第二个为 ⚙「设置」
  - 普通用户 → 底部**只有** ⚙「设置」（`adminOnly` 过滤仍生效）
  - `node tests/admin-console.mjs` 仍 **76/76 绿**
  - 启动日志**不再**出现 `[shell] barItems 冲突：view "admin" …`（冲突检测只对跨插件生效，见 `server/index.ts:56-62`）
- **【成本】小**（一行逻辑 + 两处注释）

### P0-2 · 让管理页的"无权限"给出可见解释，而不是空表格

- **【问题】** 普通用户若经 URL 进入控制台并点开「用户管理」，看到一张**只有表头、零行**的表格，无任何提示；实际是 403。ACL / 审计页同理。
- **【证据】**
  - 客户端静默：`privhub-admin/client/index.js:27-30` `async load(){ const r = await api('/privhub/api/admin/users'); if (r.ok) { this.adminUsers = r.users; ... } }` —— **无 else、无 toast、无 error 字段**
  - 模板无空状态：`privhub-admin/client/index.js:67-82`（纯 `<table>` + `v-for`）
  - 服务端拦得住：`privhub-admin/src/index.ts:53-56`
  - 控制台有现成件未用：`admin-console/client/ui.js:75 AdminErrorState`（已被 `shell.js:151` 用于"插件未装载"）
- **【改法】** 两步，第二步治本：
  1. **面板侧兜底（小）**：`privhub-admin/client/index.js:27-30` 补 else 分支，`r.error === '仅管理员'` 时把文案写进一个 `error` 字段并在模板里渲染（照抄 `admin-console/client/panels.js:167` 现成写法：`this.error = u.error === '仅管理员' ? '仅管理员可查看项目权限（当前账号不是管理员）' : ...`）。**同一插件里已有正确写法，可照抄**。
  2. **入口侧治本（中）**：让 `sidebar.js` 真的消费 `routes.js` 已声明的 `adminOnly`（`routes.js:41,47,52,53`）—— 无权限的条目**不渲染**或渲染为禁用态。这与 `shell.js:71-78` 的 `missing` 判定是同一处逻辑，加一个 `if (r.adminOnly && !isAdmin) return false` 即可。
- **【验收】** 用普通账号：控制台侧栏**看不到**「用户管理 / ACL 规则 / 审计日志 / 系统设置」；若强行手改 hash `#/admin/access/users`，页面显示**明确的权限说明文案**（不是空表格、不是白屏）。管理员侧零回归。
- **【成本】小到中**（第一步 10 行；第二步 1-3 行 + 一处 admin 判定来源）

### P0-3 · 删掉 `index.html:1057`，并给渲染链补一条"同条件分支"静态检查

- **【问题】** 骨架渲染链里有一段**字面重复、永不执行**的组件分支；同时 `:1049`/`:1052` 两条同条件分支让"点管理图标会看到什么"无法从代码一眼读出。
- **【证据】** `index.html:1049`（`admin-console`）、`:1052`（`admin` 回退）、`:1053`（占位）、`:1057`（**与 `:1052` 字面相同的重复**）
- **【改法】**
  1. 删除 `:1057` 一行。
  2. 给 `tests/frontend-templates.mjs` 加一条断言：解析骨架模板里的 `v-if`/`v-else-if` 条件表达式串，**同一链上重复出现即报错**。该文件已有"扫描 → 断言"的成熟骨架（`:226-240`），成本极低。
  3. 给 `:1052` 补一句注释"仅当 admin-console 插件缺失时可达"，避免下一个人再误判。
- **【验收】** 删除后功能零变化；新增断言在"故意插一条重复分支"时变红、当前为绿。
- **【成本】小**

### P0-4 · 给"入口 → 声明能力 → 实际可用"补一份自动核对

- **【问题】** 本次发现的 A/B/C/E/H 五个问题，**本质是同一类**：manifest 的一个字段、骨架的一段分支、控制台的一张路由表、客户端的一个条件，四处各说各话。现有测试**测不到这件事** —— `tests/admin-console.mjs:334-345` 用的是**手写桩** `barItemsStub`（顺序与 `adminOnly` 都与真实 manifest 不一致），而它读真实 manifest 的只有 `:688-691` 一条。`tests/integrity.mjs:332-334` 对 manifest 只做**文本正则**检查，不构造装配结果。
- **【证据】**
  - 桩：`tests/admin-console.mjs:334-345`（`admin-console` 在首位，与真实枚举序**相反**）
  - 真：`privhub-admin-console/client/manifest.json:8` / `privhub-admin/client/manifest.json:8`
  - 唯一的真实-manifest 断言：`tests/admin-console.mjs:688-691`
  - 已有的装配复刻手法可复用：`tests/admin-console.mjs:320-361`
- **【改法】** 新增 `tests/entry-matrix.mjs`（或并入 `integrity.mjs`），**读真实 32 个 manifest**，构造 `topItems`/`bottomItems`/`viewSet`，断言：
  1. **跨插件的 `view` 重名必须报出**（当前会命中 `admin`；同插件重名 5 组则是设计内，放行并打印说明）；
  2. 每条 `barItems` 的 `view` 都能在 `index.html` 的 `openBarItem` 白名单里找到；
  3. 每条 `view` 声明的承载 `slot`，在**某个真实 client 的 `slots` 导出里存在**（挡住"声明了视图但没人实现"）；
  4. 控制台 13 条 `ROUTES` 的 `slot` 同样有实现，`entryOf` 能在真实 `barItems` 里反查到；
  5. `topItems + bottomItems + admin-nav` 三组**无重叠、无遗漏**（这条会直接命中问题 A）；
  6. **`routes.js` 里声明但全仓无读取的字段**（`adminOnly`/`implemented`/`route.view`）列成清单打印出来 —— 不强制报错，但让"声明了没接线"变成可见。
- **【验收】** 该脚本对**当前源码必须先红**（至少 A 与第 1、5 条命中）；做完 P0-1 后全绿；把任意 `manifest.json` 的 `view` 改成随机值，脚本变红。
- **【成本】小到中**（约 130-200 行，可大量复用 `tests/admin-console.mjs` 与 `tests/lib.mjs` 的手法）

### P0-5 · 决定 `settings.defaultView` 是"补入口"还是"删干净"（问题 H）

- **【问题】** 一个完整实现但**两头都断**的功能：后端存、骨架读、没人写、没人用。它同时带来 `nav.setViewMode` 与 `nav.viewMode` 两处死代码。
- **【证据】** 存 `shell-settings/src/index.ts:23,36,84`；读 `index.html:933`；写入入口 0；消费方 0；`nav.setViewMode`（`:553`）无调用方；网格/列表开关只在退役 v2（`:320-321,330`）
- **【改法】二选一，由主子拍板：**
  - **A｜补上**：设置面板加"默认视图：网格 / 列表"（`shell-settings/client/index.js:117-126` 现成有成对卡片写法可照抄），并让 explorer-v3 真的按 `nav.viewMode` 切换 —— 当前中栏是表格式（`panel.js:453-493`），需要一个卡片式布局分支。
  - **B｜删干净**：移除 `nav.viewMode` / `setViewMode` / `:933` 的应用逻辑，以及后端 `defaultView` 字段（`shell-settings/src/index.ts:23,36,84`）—— 属跨端改动。
- **【验收】** 选 A：设置页能改、刷新后中栏真的按所选呈现。选 B：全仓 grep `viewMode|defaultView` 命中 0。
- **【成本】A 中（要写一个卡片式视图）｜B 小到中（跨端删字段）**
- **[冲突提示]** 与交底 §6 第 1 条（功能入口必须保持在左侧图标栏、不改交互布局）**不冲突**：默认视图是"同一入口内的呈现方式"，不是新增或移动入口。

---

## 5. 我建议不要做的

| # | 看着像问题 | 为什么不做 |
|---|---|---|
| 1 | **删掉那 7 个没人读的 `window.PrivHub.openXxx`（`index.html:956-962`）** | 它们是 `CHANGELOG.md:91-93` 明确承诺"**全部保留**（入口一个不少）"的对象，`tests/admin-console.mjs:684-686` 也逐条断言其存在。删掉 = 与既有承诺和既有测试同时冲突。**正确做法是登记为"兼容性 API（保留但当前无调用方）"，并在 `openBarItem` 的注释里说明"外部入口走 openAdmin/openBarItem，这些是历史兼容面"**。真要删，应先改 CHANGELOG 与测试，属独立决策 |
| 2 | **把 `entryOf` / `route.view` / `implemented` 三个字段一并清掉** | `entryOf` **不是死的** —— `routes.js:84` 的 `isAvailable()` 与 `:89-96` 的 `providerOf()` 都在用它，是"插件卸载→条目变待接入"与侧栏 tooltip 的依据。只有 `route.view` 与 `implemented` 是真死字段。**混在一起清会打断现有的降级机制**。而且 P0-1 的改法依赖 `viewSet()` 继续工作 |
| 3 | **把 `panel.js:164` 的 `isDir` 分支补上（让它可达）** | 中栏"只显示文件、文件夹交给左侧目录树"是 v3 的**明确设计**（`panel.js:24` 注释）；左侧树（`tree.js`）已承担目录导航。把目录塞回中栏是**改交互布局**，撞交底 §6 第 1 条。**正确动作是删掉这段不可达分支，不是给它补调用方** |
| 4 | **把 4 份 `download` / 4 份 `upload` 立即合并** | 下载四份当前**行为一致**（同 URL、同头、同模板），没分叉。而抽取共享模块会同时撞"插件前端必须完全在自己目录内"（交底 §6 第 3 条）与"无打包链"（第 2 条）—— 跨插件共享客户端代码在这个架构里**没有现成落点**（`E4` 的 Markdown 渲染器 5 份之所以没合并，也是同一个原因）。**只登记、不合并**；若要合，先有"客户端共享模块"这一层 |
| 5 | **把控制台 13 条路由改成"从 manifest 自动生成"** | 控制台刻意做成"只认 view/slot 名、不认插件 id"（`routes.js:10` 注释），并刻意保留 5 个自渲染面板（概览/项目权限/发布链接/自动备份/水印，`shell.js:35-41`）。改成纯自动生成会**丢掉按管理员职责分组的语义**与 5 个自渲染面板。**保持手工路由表是对的**；要补的是 P0-4 的自动**核对**，不是自动**生成** |
| 6 | **把 `_retired-v2/` 整体删掉** | 已由《改进建议》`E5` 登记为"归档而非删除"，且它是本次判定"哪些函数只剩退役 v2 在调"的**关键参照物**（第 1 梯队的 6 条全靠它反证）。删了就失去线索，且交底 §6 第 7 条要求测试数据保持原样 |
| 7 | **为"图标栏只有 emoji、没有文字"单独立项** | 已在五份顾问方案里由 Krug/Norman 提出，并被列为需主子拍板的第 1 项（是否加宽图标栏 52px → 64~72px），**撞约束 1**。本角度不重复主张，只提示：**P0-1 修好后，底部图标提示会从「用户管理」变成「管理控制台」，命名问题先解决一半，不必等加宽** |
| 8 | **给 `nav.refreshTree` 空转"补一个正确实现"就完事** | 3 个调用点（`office-ui:99`/`tags:61`/`wiki:142`）想刷新的是**它们刚改完的当前目录**，而 V3 的 `store.tree` 是另一个缓存。把骨架那棵树修好只是"让空转不空转"，但**骨架那棵树本身已无渲染方**（唯一渲染它的是已退役的 v2）。**正确方向是让这 3 个调用点改调 V3 的刷新入口（跨插件调用的老问题），或明确它们在 V3 下不需要刷新** —— 这属"跨插件契约"议题，不要当成单点 bug 修 |

---

## 6. [存疑] / 未实测项

| # | 项 | 为什么没测 | 影响 |
|---|---|---|---|
| 1 | **没跑 `node tests/run-all.mjs --spawn`** | 交底 §5 已说明 `--spawn` 在受限沙箱内会因禁止创建子进程失败；本次为受限子智能体，**未尝试**（避免留下半启动实例与 `.testroot` 残留）。**但已单独跑通两个纯静态脚本**：`frontend-templates.mjs` 12/12 绿、`admin-console.mjs` 76/76 绿 | 因此"全量回归当前几绿几红"仍**未知**；本报告用到的两个结论不依赖它 |
| 2 | **没有浏览器 / 截图 / 真人操作** | 环境无浏览器工具 | 「12 个图标看起来是几个」「用户第一眼怎么理解底部那个图标」全靠静态推演。**问题 A 的"用户观感"部分属 [推断]**，根因（双声明 + `find()` 取首条 + 过滤不对称）属 **[实体]** |
| 3 | **Linux 部署机的 `readdirSync` 顺序** | 本机 Windows（字典序） | 见 §3.4 #1 |
| 4 | **`nav.refreshTree` 空转的实际可见程度** | 未做运行时验证 | 见 §3.4 #3 |
| 5 | **`panel.js:406-408` 空 div 的意图** | 两种读法都成立 | 见 §3.4 #6；**不定性** |
| 6 | **本报告初稿的那处错误** | 我误读了 `privhub-admin-console/client/manifest.json`，把 `:8` 的 `adminOnly:true` 读漏，因此在初稿里把"普通用户能看到管理入口"写成了事实 | **已更正**。教训：本仓 32 个 manifest 我是用 PowerShell 批量 dump 读的，批量输出里字段容易看漏；**凡用于定性的字段，必须单独回读原文件**（交底 §8 的"中文断言必须回读文件本身"是同一类纪律，本次的教训是它**也适用于英文字段**） |
| 7 | **`--spawn` 隔离实例下的真实首屏** | 同上 | 兜底：`tests/frontend-templates.mjs:315-316` 断言了"插件加载失败时界面给出可见原因与重试入口"，这条静态断言当前是绿的 |

---

## 7. 我这个角度的适用边界

**这个角度能看见什么**
- 一处功能"声明了 / 实现了 / 接上了 / 能用上"这**四态之间的落差**。
- 入口与行为的**名实对应**；同一动作在几处各写一遍；同一字段被几处各自解释。
- 代码里**写完了但永远走不到**的部分。

**这个角度看不见什么（需要别的角度或别的材料补）**

| 看不见的 | 需要什么 |
|---|---|
| **好不好用** —— 图标栏无文字、对比度、焦点态、响应式断点、emoji 是否看得懂 | 视觉/可用性角度（已有五份顾问方案），以及**真人上机录像** |
| **对不对** —— 数据会不会丢、权限会不会被绕、请求体有没有上限 | 安全（S）与数据可靠性（D）角度。本文只报"权限与入口的名实不符"，**不报越权可利用性**。按用户既定优先级，S/D 类属后话 |
| **快不快** —— 千级目录、静态资源 2.4MB 无缓存 | 性能角度（已有 `P1`~`P5`） |
| **该不该做** —— `svc-collab` 要不要接 Yjs、`defaultView` 补还是删、那 7 个兼容 API 删不删 | **主子的排期与产品意图**。本文只把事实与代价摆清 |
| **真实观感** —— 12 个图标实际渲染成什么样、普通用户点进去到底看到什么 | **一次真实浏览器观察**。这是本报告与五份顾问方案共同的盲区，也是"静态读代码"这个方法的结构性上限：**我能证明"代码里这两条声明冲突了"，不能证明"用户第一眼会怎么理解它"** |

**一条方法上的自我限制**：本文所有"不可达/死代码"判定，依据是**当前工作区的静态调用图**（排除 `_retired-v2` 作调用方）。若存在**运行时动态调用**（例如字符串拼 `window.PrivHub['do'+'Rename']()`），这些判定会失效。我做了全仓字符串检索，**未发现**这类模式，但无法穷尽证明其不存在。**[存疑]**

**另一条**：`view` 在本仓的**双重语义**（既当图标栏入口标识、又当骨架 `activeView` 视图标识），是问题 A 与 E 的共同土壤。**要彻底根治得先定"一个 view 只能一个声明方"这条契约** —— 但那会牵连骨架 if-else 链、控制台 `entryOf`、5 组同插件重名，属**架构决策**，不是功能完整性角度能定的。本文只把它作为 P0-4 的断言提出来。

---

## 附录 · 入口 → 声明的能力 → 实际能不能用 → 证据

### 表 A｜图标栏 12 个入口（**管理员视角**）

| # | 图标 | 声明标题 | `view` | 声明的 `slot` | 实际能不能用 | 证据（`文件:行号`） |
|---|---|---|---|---|---|---|
| 1 | 📁 | 文件 | `files` | `panel` | ✅ 能。有项目→重开项目／无项目→回欢迎页，渲染 `slotComps.panel` | 声明 `files-explorer-v3/client/manifest.json:8`；分发 `index.html:753`；实现 `explorer-v3/client/index.js:33-35`；渲染 `index.html:1064` |
| 2 | 🕸️ | 知识图谱 | `kg` | `panel` | ✅ 能 | 声明 `files-kg/client/manifest.json:8`；分发 `index.html:760`；实现 `files-kg/client/index.js:213-216`；渲染 `index.html:1042` |
| 3 | 🔍 | 搜索 | `search` | `panel` | ✅ 能。`nav.openSearch()` | 声明 `files-search/client/manifest.json:8`；分发 `index.html:751`；实现 `files-search/client/index.js:147-149`；渲染 `index.html:1033` |
| 4 | 🏷️ | 标签 | `tags` | `panel` | ✅ 能 | 声明 `files-tags/client/manifest.json:8`；分发 `index.html:760`；实现 `files-tags/client/index.js:147-149`；渲染 `index.html:1040` |
| 5 | 📝 | 新建文档 | `template` | `panel` | ✅ 能 | 声明 `files-template/client/manifest.json:8`；分发 `index.html:760`；实现 `files-template/client/index.js:357-359`；渲染 `index.html:1041` |
| 6 | 📚 | 知识库 | `wiki` | `panel` | ✅ 能 | 声明 `files-wiki/client/manifest.json:8`；分发 `index.html:760`；实现 `files-wiki/client/index.js:206-209`；渲染 `index.html:1043` |
| 7 | 🔌 | 智能体接入 | `agent` | `app-iconbar` | ✅ 能 | 声明 `privhub-shell-agent-console/client/manifest.json:8`；分发 `index.html:761`；实现 `client/index.js:363-365`；渲染 `index.html:1045` |
| 8 | ⭐ | 收藏 | `favorites` | `app-iconbar` | ✅ 能。`nav.openFavorites()` | 声明 `shell-favorites/client/manifest.json:8`；分发 `index.html:752`；渲染 `index.html:1035` |
| 9 | 🤖 | AI 工具 | `rag` | `app-iconbar` | ⚠️ **能打开，但重复点击会关掉自己**（问题 D） | 声明 `svc-rag/client/manifest.json:8`；分发 `index.html:761`；实现 `client/index.js:1012`；渲染 `index.html:1044`；**toggle 语义 `index.html:460-463`；外部入口 `client/index.js:1001-1006` + `panel.js:318`** |
| 10 | 🗑️ | 回收站 | `trash` | `panel` | ✅ 能（带角标）。`nav.openTrash()` | 声明 `trash-ui/client/manifest.json:8`；分发 `index.html:750`；角标 `shell/client/index.js:108`；实现 `trash-ui/client/index.js:90-93`；渲染 `index.html:1031` |
| 11 | 👥 | **用户管理** | `admin` | **`admin-nav`** | ⚠️ **名实不符（问题 A）**：图标/标题来自本条（`privhub-admin`），点开渲染的是「管理控制台」（`privhub-admin-console`） | 声明 `privhub-admin/client/manifest.json:8`；被选中 `shell/client/index.js:80-83`（`find` 取首条 + 无 `admin-nav` 过滤）；实际渲染 `index.html:1049`（`slotComps['admin-console']`） |
| 12 | ⚙ | 设置 | `settings` | `app-iconbar` | ✅ 能 | 声明 `shell-settings/client/manifest.json:8`；分发 `index.html:759`；实现 `client/index.js:148-152`；渲染 `index.html:1037` |

> **普通用户视角**：第 11 项被 `adminOnly` 过滤掉（`index.html:742`），底部只剩 ⚙「设置」（实测）。第 7 项「智能体接入」是 `app-iconbar` 那条（全员），第 6 条 `admin-nav` 的「智能体密钥」不进图标栏。
> **小计**：12/12 有真实实现；**1 处名实不符（#11）**、**1 处交互缺陷（#9）**。

### 表 B｜`admin-nav` 8 条（不进图标栏，进控制台侧栏）

| # | 图标 | 声明标题 | 声明插件 | `view` | 控制台路由 | 承载 `slot` | 实际能不能用 | 证据 |
|---|---|---|---|---|---|---|---|---|
| 1 | 👥 | 用户管理 | `privhub-admin` | `admin` | `access/users` | `admin` | ✅ 能（管理员）。⚠️ **普通用户经 URL 进入时看到空表格**（问题 C） | 声明 `privhub-admin/client/manifest.json:8`；路由 `routes.js:40`；实现 `privhub-admin/client/index.js:152-155`；渲染 `shell.js:60-65,165-170`；空表格 `client/index.js:27-30,67-82` |
| 2 | 🔒 | 权限管理 | `privhub-admin-acl` | `acl` | `access/acl` | `acl` | ✅ 能 | 声明 `client/manifest.json:8`；路由 `routes.js:42`；实现 `client/index.js:211-214` |
| 3 | 📋 | 审计 | `privhub-admin-audit-panel` | `audit` | `ops/audit` | `audit` | ✅ 能。⚠️ 该条在 `routes.js:50` **未标 `adminOnly`**（其余 3 条标了），普通用户也会看到入口 | 声明 `client/manifest.json:8`；路由 `routes.js:50`；实现 `client/index.js:184-187` |
| 4 | 🏷️ | 标签管理 | `privhub-files-tags` | `tags` | `content/tags` | `admin-tags` | ✅ 能 | 声明 `client/manifest.json:9`；路由 `routes.js:45`；别名 export `client/index.js:152` |
| 5 | 📝 | 模板管理 | `privhub-files-template` | `template` | `content/templates` | `admin-template` | ✅ 能 | 声明 `client/manifest.json:9`；路由 `routes.js:46`；别名 export `client/index.js:361` |
| 6 | 🔌 | 智能体密钥 | `privhub-shell-agent-console` | `agent` | `access/agents` | `agent-view` | ✅ 能（**与表 A #7 同一 `view`、同一 slot，同插件，两入口一份实现**） | 声明 `client/manifest.json:9`；路由 `routes.js:43`；实现 `client/index.js:363-365` |
| 7 | ⚙ | 系统设置 | `privhub-shell-settings` | `settings` | `ops/settings` | `settings` | ✅ 能（**与表 A #12 同一 `view`、同一 slot，同插件**） | 声明 `client/manifest.json:9`；路由 `routes.js:51`；实现 `client/index.js:148-154` |
| 8 | 🗑️ | 回收站 | `privhub-trash-ui` | `trash` | `content/trash` | `admin-trash` | ✅ 能（**与表 A #10 同一 `view`，不同 slot**：图标栏走 `trash-view`、控制台走 `admin-trash`，同一组件实例） | 声明 `client/manifest.json:9`；路由 `routes.js:48`；双别名 `client/index.js:92-95` |

> **小计**：8/8 在控制台侧栏有对应路由、有实现、点得到。
> **注意**：8 条中 6 条的 `view` 与表 A 某条重名（`admin`/`agent`/`tags`/`template`/`settings`/`trash`）。设计上就是"同一份实现、两处入口"（`CHANGELOG.md:98`），**不是缺陷**；但它正是问题 A 得以发生的同一种土壤（§3.2 的"view 重名全景"）。

### 表 C｜控制台自有的 5 条自渲染路由（无对应 `admin-nav`，属外壳自带）

| # | 路由 | 面板 | 实际能不能用 | 证据 |
|---|---|---|---|---|
| 1 | `overview` | 概览（5 张统计卡） | ✅ 能，有测试覆盖 | `routes.js:38`；`panels.js:79`；`shell.js:35-41`；`tests/admin-console.mjs:483-501` |
| 2 | `access/projects` | 项目权限（只读矩阵） | ✅ 能（只读；改归属跳「用户管理」） | `routes.js:41`；`panels.js:132`；文案 `panels.js:201-204` |
| 3 | `content/publish` | 发布链接（列表-详情） | ✅ 能。**全仓唯一实现 `↑`/`↓` 键盘选择的页面** | `routes.js:47`；`panels.js:215,259-266,313` |
| 4 | `ops/backup` | 自动备份 | ✅ 能（调 `git-backup` 接口） | `routes.js:52`；`panels.js:371`；接口 `panels.js:393,411` |
| 5 | `ops/watermark` | 水印配置 | ✅ 能，但**只读**（后端无配置接口，`CHANGELOG.md:128-129` 已说明） | `routes.js:53`；`panels.js:452` |

### 表 D｜服务端能力层 vs 缺入口

| 类别 | 插件 | 判定 | 证据 |
|---|---|---|---|
| 正常能力层（无自身界面是设计） | `svc-storage`/`svc-events`/`svc-audit`/`svc-acl`/`svc-watermark`/`svc-search`/`svc-meta`/`svc-office`/`svc-model`/`core`/`files`/`trash`/`admin`/`admin-acl` | ✅ 正常 | 各插件 `inject` 声明；交底 §2.2 已说明"18 个无 client 多为能力层" |
| 服务端能力，入口在**别的插件**界面上 | `admin-audit`（←审计面板）、`files-export`（←md 编辑器）、`files-fulltext`（←搜索视图）、`git-backup`（←md 编辑器/控制台备份页）、`trash`（←trash-ui） | ✅ 正常 | `admin-audit-panel/client/index.js:93,111`；`edit-md/client/index.js:365,438`；`files-search/client/index.js:72`；`admin-console/client/panels.js:393,411` |
| **真有功能但无入口** | `privhub-files-office`（`/office-preview`） | ⚠️ 唯一引用者是**已退役**插件 | `files-office/src/index.ts:46`；`_retired-v2/privhub-files-preview/client/index.js:8`；client 空壳 `files-office/client/index.js:5` |
| **真有功能但无入口** | `privhub-files-office-ai`（`/ai/office/*` 4 条 + 一整套 `pho_` 密钥签发/吊销） | ⚠️ 活跃前端零调用 | `files-office-ai/src/index.ts:145,159,174,191`；密钥 `src/index.ts:206,191-226`；client `index.js:5` `slots:{}`；仅 `tests/hardening.mjs:154-173` 直接打接口。**[存疑]** 是否"本就只给外部程序用"，见 §3.4 #5 |
| **孤立子路由** | `/gitbackup/history`、`/gitbackup/restore`、`/audit/stats` | ⚠️ 无前端调用方 | `git-backup/src/index.ts:219,241`；`admin-audit/src/index.ts:124` |
| **注册了但零消费者的服务** | `privhub-svc-collab`（`ctx.collab`） | ⚠️ 骨架未接线 | `svc-collab/src/index.ts:63,121-125`；全仓 `ctx.collab` 命中 0 |
| **界面入口有重复（共用一套服务端）** | `pha_` 密钥（`files-agent`） | ✅ 非重复实现 | 两个前端入口共用同一批端点：`shell-agent-console/client/index.js:73,99,111,129,142,160` 与 `svc-rag/client/index.js:284,292,302,658,660,717,724`。服务端只有 `files-agent/src/index.ts` 一套 |

---

*报告完 · 全程只读：未修改 `privhub/` 下任何源码，未改动 `docs/` 下任何已有文件，仅新建本报告。*
