# 05 · Shape Up 视角：PrivHub「做什么、不做什么」

> 挂载框架：`docs/experts/shape-up-perspective/SKILL.md`（37signals 功能取舍方法论）
> 基线：PrivHub v3.1.0（`privhub/package.json` version 字段实测）、源码复核 2026-09-14
> 视角纪律：本视角只做取舍判断，不接执行。所有引语均标注说话人与年份；凡属我的推断，标 [推断]。
> 阅读约定：**【实测】** 本次命令/读源码直接确认　**【实体】** 已读源码或文档确认　**未核实** 如实标注

---

## 1. 一句话判断

**现在该做的不是"再完善功能"，是先把「入口从哪来、视图怎么被渲染」这条平台线焊死——因为 PrivHub 的功能蔓延不是插件太多，是入口与能力的登记各写各的，而这条线正是当前唯一"砍一半还成立"的工作。**

补一句判断依据：50 个活跃插件里，**18 个有服务端 `src/index.ts`、界面上没有任何可渲染的 UI 代码**，另**7 个有 `client/`、却没有 `src/index.ts`**【实测，口径与可复核命令见 2.4】。数量不是问题，"名实相副"才是。

---

## 2. 我实际看过的证据

### 2.1 三样必读（全文读完）

| 文件 | 读法 | 取用处 |
|---|---|---|
| `docs/experts/shape-up-perspective/SKILL.md` | 706 行全文读完 | M1~M7 心智模型、B1~B5 诚实边界、下游转译说明（599-635 行） |
| `docs/experts/_交底-PrivHub前端与功能现状.md` | 164 行全文读完 | 第 4 节 8 条约束、第 5 节账本剩余、第 6 节悬而未决问题 |
| `docs/PrivHub-改进建议.md` | 893 行，含 S/D/P/O/E/U/F 全部分节 | 「不重复已修项」的判据（第 11 节 + 验收报告） |
| `docs/PrivHub-需求文件.md` | 198 行全文读完 | 四档功能选型（第一/二/三梯队 + ⚪不做）、迭代记录 |
| `docs/PrivHub-验收报告-2026-09-11.md` | 149 行，读到第 80 行 | 判定"哪些已经做完了"的唯一凭据 |
| `README.md` | 87 行全文读完 | 作者自陈（第 3 行）、版本、插件/路由统计（12-19 行） |

### 2.2 一手 Skill 依据（行号可回查）

| 我用它的哪一层 | 原文/位置 | 年份归属 |
|---|---|---|
| 单人转译的**授权** | 书附录 2：「a tiny team can throw out most of the structure. You don't need to work six weeks at a time. You don't need a cool-down period, formal pitches or a betting table.」（`references/sources/articles/shapeup-official-fulltext-notes.md:247`） | 2019 书，[一手] |
| 单人转译的**背书** | 官方沟通指南：「Heartbeats summarize... for a given team, department, or individual (**if that person is a department of one**)」（`references/sources/articles/shapeup-2025-2026-evolution-notes.md:283`；SKILL.md:603 复述） | 官方 Guides，[一手] |
| **串行漏斗替代 betting table** | SKILL.md:253 —— Singer 2025：「It's not that we're shaping many, many things and then choosing at the last minute, we're actually narrowing down before we even shape.」 | 2025，[一手] |
| 三列状态词 | SKILL.md:172-176 —— Candidate / Frame Go（原书 **没有 Framing 这个词**）/ Shape Go | 2025，[一手] |
| **头号失败模式** | SKILL.md:281 + 538 —— Singer 2025：「**The #1 failure mode of attempted Shape Up adoptions is "undershaped" work.**」；成因「if you try to shape with only PMs and non-technical designers, **projects will churn**」；且「everyone at Basecamp — including designers — **was very technical!**」 | 2025，[一手] |
| 无底洞判据 | SKILL.md:270 —— 「**Any rabbit hole that isn't _solved_ during shaping is a time bomb that can churn the project.**」 | 2025，[一手] |
| Shape Go 判据 | SKILL.md:278 —— 「**No material unknowns from both a technical and interaction standpoint.**」 | 官方定义 |
| Framing 的问法 | SKILL.md:342 (H2) —— 问「你**什么时候**想要它的？当时你在干什么？」，不问「你想要它长什么样」 | 书 Ch.3，[一手] |
| 垂直切片上限 | SKILL.md:277 —— 「break the work up into at maximum **nine** separate scopes」 | 2025，[一手] |
| 砍范围的制度化 | 书 Ch.14 八连问 + nice-to-have 标 `~`：「The act of marking them as a nice-to-have is the scope hammering.」+「**Usually they never get built.**」（SKILL.md:229） | 2019 书，[一手] |
| **B2 硬约束（最高优先级）** | SKILL.md:549-552 —— 官方《七条发布原则》把「**anything that mutates or munges data. If you can lose data, it's high criticality.**」列为高关键性；SKILL.md:552 明写「上传、移动、删除、去重、索引重建——**全部属于「会动数据」**... **这一条优先于本 Skill 的其他所有建议。**」 | 官方 Guides，[一手] |
| 说不的强制力消失（张力的原话） | SKILL.md:305-307 —— DHH 2026-07：「**what happens to product management when suddenly there's not this great constraint of, I only have so many programmers**」；Jason 2026-07：「There's about 20 things that we have listed as things we might be working on over the next six weeks. That would normally be maybe six things like a year ago.」 | 2026，[一手]；**SKILL.md:307 明写：他们"没有给出替代方案"** |
| 保底判断：可逆就做 | Signals 05「Err on the side of do」vs Signals 21「Know no」，分界线是"决策是否可逆"——**SKILL.md:309 自己标注这是 [推断]，官方没解释** | [推断] |

### 2.3 项目侧实测证据（本次亲自打开确认）

**入口系统（这是本次最重要的新证据）**

| 事实 | 证据 |
|---|---|
| 图标栏渲染 = 各插件 `barItems` 合并后过滤 | `frontend/index.html:737-747`；过滤规则 `privhub/plugins/privhub-shell/client/index.js:76-77`（排除 `settings/admin/acl/audit` 与 `admin-nav`），底部固定组 `:81` |
| 声明 `barItems` 的**活跃插件 = 15 个**（另有 `_retired-v2/privhub-files-explorer` 1 个，不参与装配：`src/main.ts:63` `if (ent.name.startsWith('_')) continue`） | 21 条 manifest 命中（grep `"view"` / `"adminOnly"`）；装配规则 `src/main.ts:42-65` |
| 图标栏顶部实际会有 **12 个**入口；底部管理组 2 个（`admin` / `settings`） | 逐条按 `:76-77` 过滤后计数：文件 / 搜索 / 知识图谱 / 新建文档 / AI 工具 / 智能体接入 / 回收站 / 知识库 / 收藏 / 标签 / 管理控制台 + 设置。**12 个全部能溯源到 manifest**（「文件」出自 `privhub-files-explorer-v3/client/manifest.json:8`，已回读确认）。与交底第 2 节「由运行中的 manifest 实测得出」的表（交底 43-49 行）一致 |
| （排查记录）静态扫描为何一开始漏掉「文件」 | 一次 `Select-String -Pattern 'barItems'` 扫描只报出 **15 个文件**（含 `explorer-v3` + `_retired-v2`）；随后按 `"title": "文件"` 精确检索时，PowerShell 控制台以 GBK 回显 UTF-8，中文被打成乱码（`"鏂囦欢"`），一度让我怀疑该条目无法溯源。**改用 read 工具直读该 manifest 后确认无误**。记为教训：**在 Windows 控制台里检索中文字面量不可靠，中文断言必须回读文件本身** |
| 视图分发是**两个硬编码白名单并存**：`openBarItem` 的视图名枚举 + 功能面板的 `v-else-if` 组件链 | `frontend/index.html:748-764`（13 个视图名，**其中 759-762 已含 `template`/`kg`/`wiki`/`rag`/`agent`**）、`:1037-1045`（12 条 `<component v-else-if>`） |
| 已有"插件注册进 slot、骨架却不认识"的先例包袱：骨架仍在渲染**已退役的 `tabs` slot**（全仓 0 个 manifest 声明） | `frontend/index.html:1028`（E8 记录为 `:876`，本次实测已在 `:1028`；`tabs` 组件实由 `shell-tabs` 提供，该插件已退役 → 该行恒不渲染） |

**体量与名实（subagent 只读勘察实测，未改任何文件）**

| 事实 | 数值 |
|---|---|
| 插件目录 | 顶层 51 个 = **50 活跃 + 1 `_retired-v2`**（交底与 README 记 50） |
| 有 `client/`（= 有界面） | 32 个 |
| 有 `src/index.ts` | 43 个（README:16 口径：其中 31 个真正注册路由） |
| **无 `client/`（界面上无任何可渲染 UI 代码）** | **18 个**：admin-audit / core / files / files-agent / files-export / files-fulltext / git-backup / svc-acl / svc-audit / svc-collab / svc-events / svc-meta / svc-model / svc-office / svc-search / svc-storage / **svc-watermark** / trash（**全部含 `src/index.ts`，无例外**） |
| **有 `client/` 但无 `src/index.ts`** | **7 个**：admin-console / admin-audit-panel / files-upload / files-upload-queue / files-wiki / shell / trash-ui |
| 入口极薄（client+src 合计 < 200 行） | 3 个：`trash-ui` 102 / `shell-favorites` 191 / `files-search` 188 |
| 15 个入口的体量上限 | 最大三个：admin-console **2217 行**、explorer-v3 **1797 行**、svc-rag **2536 行**（client 1053 + src 1483）—— **其余 12 个入口的 client+src 合计全部 < 400 行**（`files-template` 363+60 是第四大） |

> ### ⚠️ 更正记录（2026-09-17，父级复核后修订）
>
> **本文件初版在证据表中写过一条"「新建文档」图标点了不渲染（真 bug）"。该结论错误，已删除。**
>
> **错在哪**：我把 `barItems[].slot` 与插件 manifest 顶层的 `slots` 当成了同一套东西。它们是两回事——
> - `barItems[].slot` **只决定这个图标进图标栏的哪个桶**：`privhub-shell/client/index.js:75-77` 用它做过滤（`slot:"panel"` 的条目因此不被底部管理组排除）；
> - **渲染用哪个 slot，由插件 manifest 顶层的 `slots` 数组决定**，再经 `mod.default.slots` 注册进 `slotComps`（`frontend/index.html:839-842`）。`privhub-files-template/client/manifest.json:6` 声明的是 `"slots": ["template","admin-template"]`，所以 `slotComps.template` 会被正常填充。
>
> **正确的事实（父级逐行读，我复核确认）**：
> 1. `frontend/index.html:759-762` 的 `openBarItem` **已处理 `view === 'template'`**，点击会正确 `nav.setActiveView('template')`；
> 2. `frontend/index.html:1041` **有显式的渲染分支** `v-else-if="nav.activeView === 'template' && slotComps.template && slotComps.template.length"`；
> 3. 我初版引的 `:1064`（`slotComps.panel`）是**文件视图 files** 的分支，与 template 无关；
> 4. 插件把组件注册进 `template` slot 见 `privhub-files-template/client/index.js:358-359`——与读取的渲染分支**是匹配的**。
>
> **对结论的影响**：P0-① 中"修死入口"这一半不成立，已剔除；**U2 那半（`openBarItem` 是硬编码白名单、新增顶层视图必须回来改中心文件）依然成立，保留。**
> **教训**：同一个词（`slot`）在这个项目里有两个不同含义。凡涉及 slot 的结论，必须同时读 `barItems[].slot` 与 manifest 顶层 `slots`，并回读实际渲染分支——不能只看一处就下判断。
>
> **连带更正**：同表另一条把 README:16 的"7 个纯前端"直接套成"5 个入口无 `src/`"，属**误用别人的口径**。正确口径见 2.4 节。

**仍在待办池里、本次被点名的项（去重后）**

| 编号 | 内容 | 出处 |
|---|---|---|
| U8 | 交互细节 5 处（重试不是重试 / 取消后永久 ⏳ / `fav:add` 双监听发两次 POST / 3 处绕过 `api()` / `trashBadge` 死全局） | 交底 3.2；建议清单 774-784 |
| U1 | 键盘快捷键体系缺失 | 交底 3.2；建议清单 725-730 |
| U2 | 视图分发硬编码枚举 | 交底 3.2；建议清单 732-737 |
| U3 | 前端事件命名两套并存（`entry:open` 8 处 vs `file:opened` 4 处）+ `bus` 无声明 | 交底 3.2；建议清单 739-744 |
| U4 | 主题变量未收敛（插件内硬编码 `rgba(90,130,200` 残留 13 处） | 交底 2.2 / 3.2 |
| U5 | 列表无虚拟滚动（千级目录全量渲染） | 交底 3.2；建议清单 753-758 |
| U6 | 标签页 30 上限**静默淘汰**最早标签 | 交底 3.2 记为 `explorer-v3/client/index.js:197`；**实测已随 v3.0.4 模块拆分迁到 `client/tabs.js:57`**（`if (store.tabs.length > 30) store.tabs.splice(0, store.tabs.length - 30)`） |
| U7 | 回收站同名冲突无「覆盖/跳过/改名」三选一 | 交底 3.2；建议清单 767-772 |
| U9 | 视觉层（毛玻璃/圆角/柔和配色/窄屏），**受约束：入口必须留在左侧图标栏** | 交底 3.2；约束第 1 条 |
| E4 | 5 份同构 Markdown 渲染器（约 350 行重复），`esc()` 逐份手抄 —— 已修 S3 正是复制导致转义缺失的实例 | 交底 3.3；建议清单 682-688 |
| E7 | 5 处共 88 行 CSS 经 `createElement('style')` 注入且不随卸载移除 | 交底 3.3 |
| E8 | 骨架仍渲染已退役的 `tabs` slot | 交底 3.3（本次实测行号见上表） |
| E1 | 插件装配双源维护（`CORE_PLUGINS` 硬编码 17 项 与 L3 自动发现并存，漏改**不报错**） | 交底 3.3；建议清单 651-658 |
| E2 | 大文件拆分：`explorer-v3/client` **已拆为 12 模块**（实测入口 39 行，已修）；`svc-rag` 服务端 1483 行 + client 1053 行**未拆** | 交底 3.3（E2 部分已修，勿重复） |
| 3.4 | **3 个插件靠 explorer-v3 的内部类名工作**（`files-office2` / `files-edit-md` / `files-comments` 各自 `querySelector('.v3-content')`）；违反约束第 5 条；修订顶栏时已连撞两次 | 交底 3.4 |
| F1 / F2 / F3 | ACL 自锁防护 / ACL 守卫覆盖自查（白名单 37 条 vs 全仓 108 条注册）/ API 契约文档 | 建议清单 797-817 |

**约束与口径的 [冲突] 记录（不是我发现的优先级，是我必须摆出来的）**

| # | 冲突 | 两边的原话/位置 |
|---|---|---|
| C1 | 交底第 5 节说 `D2/D4/D5/D6/D8/D9`、`O1`、`P1` 未完成，但**验收报告显示 D1 已修**（`svc-audit` 改单飞 Promise + 字节魔数比对 + 原子替换）、`O1` 已修、`O4` 已修 | 交底 151 行 vs `docs/PrivHub-验收报告-2026-09-11.md:26-31`。**我按验收报告取值**，本次方案不覆盖已修项 |
| C2 | 交底 3.3 说 `explorer-v3/client/index.js` 已拆（E2 前半已修），但账本 E2 正文仍按 1649 行写 | 交底 115 行 vs 建议清单 664-672。**实测：入口文件 39 行已拆** |
| C3 | 交底 U6/U8 引用的行号基于拆分前的单文件；拆分后行号全部漂移 | 实测 `tabs.js:57` / `ops.js:175,245` / `panel.js:298` 等。**引用旧行号会找不到代码** |
| C4 | 约束第 4 条要求"骨架只做容器与总线"，但当前骨架自己维护两个硬编码视图白名单 | 交底 140 行 vs `index.html:748-764`、`:1037-1045` |
| C5 | 约束第 3 条要求"每个插件前端完全在自己目录内"，但 3 个插件靠 `querySelector` 操作 explorer-v3 的 DOM | 交底 139 行 vs 交底 3.4。**这一条决定了 U2 之后必须先修 DOM 契约，否则 U2 一改类名就静默炸三个插件** |
| C6 | 需求文件第 85 行把「全局键盘快捷键」放在"靠后部分"（等核心功能完成后统一补充），而 U1 被列为 P1 | `docs/PrivHub-需求文件.md:85` vs 建议清单 727 |
| C7 | 交底 2.2 说"根本没有令牌层"（10 个自定义属性、45 个离散 px、无间距/字号刻度），意味着 U4/U9 属**从零建层**，需评估对 32 个插件前端的影响面 | 交底 75-81 + 3.2 U4 |

---

### 2.4 口径声明与可复核命令（应父级要求补，2026-09-17）

**先说两个词在这份文件里的定义**——本项目里 `slot` 有歧义，凡引用必须写清是哪一种：

| 术语 | 定义 | 位置 |
|---|---|---|
| `barItems[].slot` | **只管图标进图标栏的哪个桶**，不参与渲染分发 | `privhub-shell/client/index.js:75-77` |
| **组件 slot**（本文件凡单说"slot"均指这个） | **决定组件渲染到界面哪个区域**，由插件 manifest 顶层 `slots` 数组声明 → `mod.default.slots` → `slotComps[slot]` | `frontend/index.html:839-842`，渲染分支 `:1037-1045` |

**口径声明**：

- **"界面上无任何可渲染的 UI 代码"** 的判据是 **`plugins/<名>/client/` 目录不存在**。
  ⚠️ 这**不等于**"用户看不到这个功能"——很多能力是**被别的插件调用**呈现的。已核实的反例：`privhub-admin-console/client/panels.js` 里就**引用到了 svc-* 服务**（`Select-String` 命中 `svc-watermark|svc-search|svc-storage|svc-meta|svc-events|svc-acl|svc-audit|svc-model|svc-office|svc-collab`）——说明这批"无 client"的插件是**被别的界面调用的能力层**，不是"没有入口的死功能"。
  → 所以 2.3 节那句话的**准确说法是"没有自己的界面代码"**，而**不能**读成"用户找不到、白做了"。这是本节对初版口气的收紧。
- **"有 `client/` 却无 `src/index.ts`"** 的判据是两个目录标志位，**不代表该功能没有服务端**：它的服务端可能在 `svc-*` 层或 `privhub-core`。

**可复核命令**（在 `G:\program\dsh-SQL` 下执行，纯只读）：

```powershell
$root='G:\program\dsh-SQL\privhub\plugins'
$act = Get-ChildItem $root -Directory | Where-Object { -not $_.Name.StartsWith('_') }
"活跃插件数: " + $act.Count                                                    # 50
"A 无 client/（含 src/index.ts）:"
($act | Where-Object { -not (Test-Path (Join-Path $_.FullName 'client')) }).Name
"B 有 client/ 但无 src/index.ts:"
($act | Where-Object { (Test-Path (Join-Path $_.FullName 'client')) -and -not (Test-Path (Join-Path $_.FullName 'src\index.ts')) }).Name
```

**本次实测输出（与上表一致，可对拍）**：

- 活跃插件 **50**；含 `client/` **32**；含 `src/index.ts` **43**；**A 组 18 个**；**B 组 7 个**；**A ∪ B = 25，交集 0**。
- A 组 18 个（本次实测全名，注意含 **`privhub-svc-watermark`**——初版清单漏了它、误记为 17 个；另注意**不含** `privhub-admin-audit-panel`，它属于 B 组）：
  `privhub-admin-audit`、`privhub-core`、`privhub-files`、`privhub-files-agent`、`privhub-files-export`、`privhub-files-fulltext`、`privhub-git-backup`、`privhub-svc-acl`、`privhub-svc-audit`、`privhub-svc-collab`、`privhub-svc-events`、`privhub-svc-meta`、`privhub-svc-model`、`privhub-svc-office`、`privhub-svc-search`、`privhub-svc-storage`、`privhub-svc-watermark`、`privhub-trash`
- B 组 7 个：`privhub-admin-console`、`privhub-admin-audit-panel`、`privhub-files-upload`、`privhub-files-upload-queue`、`privhub-files-wiki`、`privhub-shell`、`privhub-trash-ui`
  ⚠️ **B 组不是缺陷**：`privhub-shell` 是骨架本身、`files-upload` / `files-upload-queue` 是 explorer-v3 的伴生 UI——**它们本来就不需要自己的路由**。B 组只有"是否该独立成插件"这个**组织问题**，没有功能问题。初版把它说成"纯前端壳"是又一次口气过大。

**数据车道行号的复核（应父级要求，逐条回读确认）**：

| 我引用的 | 复核结果 |
|---|---|
| `privhub-files/src/index.ts:118` `const tmp = target + '.part'` / `:141` `await rename(tmp, target)` | ✅ 准确 |
| 上传覆盖前**无存在性检查**：`:111-115` 全段只有权限、文件名、目录三项校验 | ✅ 准确。**我初版把 `:115` 的 `existsSync(dir)` 误记为 `existsSync(target)`**——复核后确认它检的是**目录**，结论（不检同名文件）不变，但引用方式已改 |
| `:200-221` 移动路径 `:213` 查同名 → `:215` 单次 `rename`，无 `EXDEV` 分支 | ✅ 准确。另实测：全仓 `src/*.ts` 搜 `EXDEV|copyFile|cpSync`，**只有 `files-agent` 用 copyFile**，Web 移动路径确实没有兜底 |
| `:206-210` 路径校验用字符串 `resolve`、不过 `realpath`（对比上传 `:114`、预览/下载 `:79`/`:233` 走 `resolveReal`） | ✅ 准确 |
| `privhub-core/src/index.ts:837` 先 `rename` 进 `.trash/<id>_<name>`、`:839` 写 `trash.json`（同锁内，`:828` `withFileLock`） | ✅ 准确 |
| `:871-882` `purgeTrash`（`:880` `rm -r` / `:881` `unlink`，不可逆） | ✅ 准确 |
| `git-backup/src/index.ts:35` `POLL_MS = 60 * 1000`、`:107` 跳过 `.` 开头目录、`:181` `setInterval`、`:140-156` commit、`:241`/`:266` 回滚 | ⚠️ **部分修正**：`:35` 是 `POLL_MS` 常量定义（60s，文件头 `:5` 注释亦写明"定时（60s）"），`:181` 才是启动定时器；跳过隐藏目录实际有两处（`:77` 与 `:107`）；**回滚端点在 `:241`（`/gitbackup/restore`），`git checkout` 在 `:262`、覆盖原文件在 `:266`**——`:241` 是路由声明行、不是回滚动作行，引用已改。该端点经 ACL 裁决（`:254-256`）并校验 commit 格式（`:252`）。结论不变。**"是否真的在跑"仍未核实**，可用 `GET /privhub/api/gitbackup/status` 的 `autoBackup` 字段（`:212` `autoBackup: has && timer !== null`）实机确认 |
| **（G3 表里）"项目里已有正确写法可抄：`privhub-svc-storage/src/index.ts:150-156`"** | ❌ **行号错误，已改**：`:150-156` 实际是 `decryptBuffer`（解密读），**不是原子写**。真正的原子写在 **`privhub-svc-storage/src/index.ts:194-201`**——`const tmp = \`${file}.${process.pid}.${randomBytes(4).toString('hex')}.tmp\`` → `await writeFile(tmp, out)` → `await rename(tmp, file)`，且 `:194-195` 注释写明这是 D7 修过的"临时名必须唯一"（此前固定 `.tmp` 会并发撞车）。**这才是该抄的范例行。**（该错误来自我直接沿用账本 D3 的措辞，未回读原文件——已改） |
| `*.part` 残留 | ❌ **撤回**：初版写"无清理机制"是错的。实测全仓 4 处 `.part`，**4 处都在失败路径有 `unlink` 清理**（Web 上传 `privhub-files/src/index.ts:140`；`files-agent` `:688`/`:761`/`:906`）。**唯一真正未核实的是"进程被强杀导致的残留"**——详见 3.4 节第 3 条 |

---

## 3. 改进建议

### 3.0 先立规矩：单人版的结构性约束（回应"AI 放开产能后说不的强制力消失"）

**这是本方案的地基，写在所有 P0 之前。**

SKILL.md:307 已经把话说明白了：37signals 的"说不"**不是靠意志力，是靠产能稀缺替他们说的**（DHH 2025：「任何 Basecamp 客户最多付我们 $299，所以我们付得起说不」）。AI 把产能放开之后，这个强制力消失，而**DHH 2026-07 是在提问，不是在回答**——他们没有替代方案。

主子这里的情况比他们更极端：非程序员 + 全 AI 生成代码 = **"说不"的边际成本趋近于零**。今天说"顺手加一个插件"，明天就有代码。所以必须自己造结构。

**[推断·非他们原话] 单人可执行的四条结构性约束**，请主子挑愿意写死的：

| 编号 | 约束（写死、可验证、不靠自觉） | 为什么是这一条 |
|---|---|---|
| **S1** | **同一时刻只允许 1 项处于 Shape Go。** 要推第二项，先把第一项移出（做完 / 退回 / 砍掉） | 直接对应 Singer 2025 的串行漏斗。单人没有"团队被占用"的问题，但**有注意力被占用的问题**，这条是注意力的封顶 |
| **S2** | **图标栏入口数量上限锁死在 12**（当前实测已满 12）。要加第 13 个，必须先从现有 12 个里删一个 | 用数字封住"反正加一个也不贵"。这是把 DHH 那种"定价封顶"换成本项目的等价物 |
| **S3** | **任何新插件立项，必须先从现有插件里砍掉一个（做换，不做加）** | 官方原话「**What we usually need are substitutions, not additions.**」（SKILL.md:123）。这条最狠，也最有效 |
| **S4** | **一个 Shape Go 到期未完成 → 退回 Candidate/Frame Go 重新收窄，而不是延期** | 这是把 `circuit breaker` 做单人弱化（SKILL.md:624 的转译建议）。单人弃项代价全由自己承担，所以不能"取消"，只能"退回" |

> **诚实标注**：S1-S4 是我基于 SKILL.md 的转译说明推出的，**Singer / Fried / DHH 从未针对"非程序员 + AI 写全部代码"这个场景给过具体方案**。其中 S2 的"12"取的是当前现状，不是任何人的建议值。

### 3.1 P0（建议下一批就做，串行漏斗三列见 3.2）

#### P0-1　视图分发从"骨架白名单"改成"插件声明"（= U2，**修版**：已剔除初版误判的「新建文档死入口」）

- **为什么是 P0**：加一个顶层视图，**必须回来改中心文件**——`frontend/index.html:748-764` 的 `openBarItem` 是一串手写视图名判断，`:1037-1045` 是 12 条手写 `<component v-else-if>`。这是"插件架构"里唯一一处仍然由骨架硬编码枚举的功能入口，也是 U2 的本体。**（U2 本身成立，与初版误判无关——见 2.3 节更正记录。）**
- **旁证（不是理由，是同类现象）**：骨架至今仍在渲染**已退役的 `tabs` slot**（`frontend/index.html:1028`，全仓 0 个 manifest 声明它，E8 编号项）——硬编码名单与插件世界脱节之后，代价是"没人敢删"。
- **收窄后的范围（砍一半）**：**只做"视图分发表"这一半**——`barItems[].view` 直连 `nav.activeView`，功能面板改成 `VIEW_SLOT` 映射 + `v-for`（建议清单 U2 原方案）。**砍掉**：不动 `openBarItem` 里 trash/search/favorites/files/admin 那五条**有专属跳转逻辑**的分支（它们不是纯枚举，动了会破语义）；不引入插件声明式路由注册表；不做 slot 契约版本号。
- **什么算完成**：① 新增一个 `barItems.view` **不需要改 `frontend/index.html`**；② 现有 12 个图标栏入口逐个点一遍无回归（含「新建文档」——**它本来就是好的，这一条是防回归，不是修 bug**）；③ 顺手清掉 E8 那行死 slot 渲染。

#### P0-2　修 U8 的 5 处交互缺陷（先修"骗人"的那两处）

- **为什么是 P0**：「重试失败项」实际不是重试、取消后条目**永久停在 ⏳**——这是**界面在说谎**。它比缺功能更伤：用户会开始不信任何进度提示。
- **收窄后的范围（砍一半）**：**只修前两条**（重试保留失败 File 引用 + 保留 `beforeUnmount` 清理；`fav:add` 双监听二留一）。**砍掉**：3 处绕过 `api()` 的统一改造、裸调用补 catch、删死全局 —— 后三条属"顺手优化"，与本周期问题无关。
- **什么算完成**：取消上传后条目不留在 ⏳；收藏一次只发一次 POST。两条都能手动复现验证。

#### P0-3　把 explorer-v3 的 DOM 契约改掉（约束第 5 条 + 交底 3.4）

- **为什么是 P0，且必须排在 P0-1 之后**：3 个插件（`files-office2` / `files-edit-md` / `files-comments`）靠 `document.querySelector('.v3-content')` 工作。**「修订顶栏时已因此连撞两次」**（交底 3.4 原话）。P0-1 一动渲染层，这三个插件就会静默失效——不报错，就是不工作。所以顺序不能反。
- **收窄后的范围（砍一半）**：**只处理 `.v3-content` 这一个类名**，改成插槽或事件契约；**砍掉** `.v3-md` 以及所有其他类名依赖，先只把一个跑通并留成范例。
- **什么算完成**：把 `.v3-content` 改名后，三个插件仍正常工作；且全仓 `querySelector('.v3-content')` 归零。

#### P0-4　把 42 项账本"冻结"成历史记录，而不是继续养着

- **为什么是 P0**：这是纯文档动作，成本近乎零，但它决定了后面所有决策的清晰度。书 Ch.7 原话：「**Backlogs are a big weight we don't need to carry.** … The growing pile gives us a feeling like we're always behind even though we're not.」（SKILL.md:244）
- **怎么做**：在 `docs/PrivHub-改进建议.md` 顶部加一行状态横幅——「本文件自 2026-09-XX 起**冻结为历史记录**，不再作为待办池；新的采纳入口是《05-shape-up.md》的三列漏斗」。**不删除任何条目**（保留可追溯性）。
- **什么算完成**：下一次要决定"做不做某条"时，没有人会去翻这 893 行找一个编号。

> **为什么 P0 只有 4 条**：单人 + 串行漏斗 + S1「同一时刻只允许 1 项 Shape Go」是互斥的——**列 4 条不是为了同时做 4 条，是为了给"下 4 次"备好货**。当前真正只推 1 条。

### 3.2 串行漏斗三列：具体怎么用

**这不是待办清单，是一条单行道。** 三列的名称与判据取自 Singer 2025（SKILL.md:172-176、253），**只有列名是他的，"单人硬化判据"那一栏是我的 [推断]**。

| 列 | 谁能进 | ? 单人硬化判据（我的转译） | 出口动作 |
|---|---|---|---|
| **① Candidate**<br>（还没被 framing 的请求） | 任何念头、任何反馈 **都先进这里**，不进别处 | **必须先回答「你什么时候会想要它？当时你在干什么？」**（书 Ch.3，SKILL.md:342）<br>→ 单人特殊规则：**答案必须是"过去某个真实时刻"，不能是"如果……的话"。"如果"型答案一律退回，不入列。** | 答得出具体时刻 + 有计数（见下）→ 右移 |
| **② Frame Go**<br>（问题与产出足够紧，值得进入 shaping） | 只接受"具体的失败时刻 + 基线" | 四项齐全才准进：<br>1) **具体失败时刻**（一次，不是一类）<br>2) **基线**：没有它，用户损失了什么/多花了多少工夫。**说不出来 = 基线太低，直接砍**<br>3) **appetite**（见 3.3）<br>4) **砍半测试**：砍掉一半还成立吗？**不成立 → 退回 Candidate**（H4） | 有解 + 无未解项 → 右移 |
| **③ Shape Go**<br>（可交给 builder，从技术和交互角度看**没有实质未解项**） | 只接受①②都走完的 | **七项齐全 + 一道外部闸门**：<br>1) 具体故事（验收标准）<br>2) appetite 与上限<br>3) 砍半后的范围<br>4) 什么算完成（可当场验证）<br>5) **No-gos**（这次明确不做什么）<br>6) **无底洞已解决**（不是记下来，是解决掉）<br>7) 垂直切片 ≤ 9 条，每条"丑但能跑"<br>**闸门：不能自己宣布 Shape Go** —— 必须让**另一个 AI 会话（不带本次上下文）**逐条盘问这 7 项，专门找"AI 说能做但其实没解决"的地方。这直接对应 B1（SKILL.md:542）。 | 进建构；**一次只放 1 条**（S1） |

**两个必须有、但容易被忽略的机制：**

1. **计数规则（单人必须改写）**：SKILL.md:611 建议"回来 ≥3 次才进 Candidate"，但 SKILL.md:257 同时点出健忘的单人开发者缺组织冗余。**单人没有"多个部门反复提"这层冗余**，所以计数要分两路：**外部来的**（用户/同事提）→ 数它回来几次；**自己想出来的** → 靠"同一个念头**在不同日子**被想起 ≥3 次"计数（同一天内的反复不算，那是兴致）。
2. **No-go 的写法**：书 Ch.6 第 5 味配料。原话理由：「**given the appetite it was important to mark this as a no-go**」。**必须写下来**，因为单人的 no-go 只存在于脑子里，会被下一次兴致冲掉。

### 3.3 下一批"成形"清单（4 条，按 S1 一次只推 1 条）

> 说明：以下我先给**立项判断**（该不该进漏斗），再给**已成形程度**。**除 SH-1 外，其余三条我认为还没有真正成形**——我把缺口写明，不替主子宣布它们能开工。

---

#### SH-1　视图分发与入口单一来源（= P0-1 + P0-3 合并成一个 scope）

- **问题框定**：**（修版·初版此处引用的"点新建文档没反应"是错的，已删除；理由见 2.3 节更正记录。）** 现在的问题陈述只能落到**基线**上，而没有落到"某个具体的失败时刻"——这本身就是它**尚未完全成形**的地方：*改一次骨架渲染层，三个靠类名工作的插件会静默失效（不报错、就是不工作）*——这句话有据（交底 3.4："修订顶栏时已因此连撞两次"），但它描述的是**开发时的失败时刻，不是使用时的失败时刻**。按 M1 的判据，它离"能当验收标准的问题"还差一步。
- **基线**：当前要靠改 `frontend/index.html` 才能加一个入口；**改一次骨架已经连撞两次 DOM 耦合**（交底 3.4）。不做的话，每加一个插件都要再撞一次。
- **appetite**：**一次小批量 = 2 周量级**（Singer 2025 口径「maybe two weeks here, three weeks there」，SKILL.md:196/书附录2）。**先定额度，再想方案。**
- **砍掉一半后的范围**（这是我认为唯一"砍一半还成立"的）：
  - **留**：功能面板改 `VIEW_SLOT` 映射 + `v-for`；`barItems[].view` 直连 `activeView`；清掉 E8 的死 slot 渲染；**`.v3-content` 类名依赖改成插槽/事件**（只这一个类名）。
  - **砍**：不动主题变量（U4）、不建令牌层、不改 `openBarItem` 里 trash/search/favorites/files/admin 五条有专属跳转的分支、不引入构建步骤、不做 slot 契约版本号、不碰右侧详情面板里那批"有意的临时代码"（约束第 6 条）。
- **什么算完成**（三条，都能当场验证）：
  1. 新增一个 `barItems.view` 不改 `frontend/index.html`；
  2. 把 `.v3-content` 改名，`files-office2` / `files-edit-md` / `files-comments` 三个插件仍工作；
  3. 12 个图标栏入口逐个点一遍无回归（**含「新建文档」——它本来就是好的，此条为防回归**）。
- **No-gos**：不做虚拟滚动（U5）；不做键盘快捷键（U1，见 SH-2）；不做标签页上限提示（U6，见 SH-3）；不动 `admin-console` 外壳。
- **切片上限**：≤ 9 条垂直切片，每条丑但能跑，先接线后上漆。

---

#### SH-2　键盘快捷键（U1）—— ⚠️ **尚未成形，需先拆**

- **问题框定**：需要"具体失败时刻"才能进 Frame Go。目前我**拿不到**（见第 5 节）。现状描述"全仓无 `registerHotkey`"是**功能缺口陈述，不是失败时刻**。
- **基线**：未测。不知道批量重命名/连续删除的实际耗时。
- **appetite**：**不值一次小批量**——按 H4「砍掉一半还成不成立」检验：砍掉一半（只做 Enter 打开 / F5 刷新 / Backspace 上级）**仍成立，而且更该先做**。
- **【关键·必须按 B2 拆开】**：U1 里 **`F2 重命名` 与 `Delete 删除` 属于"会动数据"**（对应 B2 的 high criticality 清单：移动/删除）。所以：
  - **键盘快捷键的"只读部分"**（Enter 打开 / F5 刷新 / Backspace 上级 / Ctrl+F 搜索）→ 走本漏斗。
  - **`F2` / `Delete` 键位** → **必须走 3.4 的数据车道**（需二次确认、需进回收站、需可撤销）。**这两半不能在同一个 scope 里交付。**
- **一个前置的 [冲突]**：`需求文件:85` 把「全局键盘快捷键」列在"靠后部分（等所有核心功能完成后统一补充）"，建议清单却把 U1 列 P1。**两边不一致，需主子定。**

---

#### SH-3　标签页上限行为（U6）—— ⚠️ **尚未成形，需先定规范**

- **问题框定**：**能**还原成一个具体失败时刻：*打开第 31 个标签时，最早那个被静默淘汰、无任何提示，用户以为它还在*（实测 `explorer-v3/client/tabs.js:57`）。
- **基线**：说不出来——**没有人测过 30 个标签这个上限是否合理**。没有基线 → 按维度 B 就是"基线太低"。
- **appetite**：**最多一天**，不值一档。
- **砍掉一半后的范围**：**只加一句提示**。不动"是否该淘汰"，不做横向滚动，不改 `需求文件` 的 A3 描述（那是另一件事）。
- **什么算完成**：打开第 31 个标签时，有一条可见反馈。
- **为什么它排在第 3**：因为它牵出一个**产品问题而不是缺陷**——`需求文件:35` 写"除非关闭否则常驻"，实现却是"超过 30 静默淘汰"。**文件与实现矛盾，得先拍板哪个是对的**。拍板之前不该动代码。

---

#### SH-4　`svc-rag` 大文件拆分（E2 后半）—— ⚠️ **不建议现在做**

- **问题框定**：**不成立**。E2 给出的理由是"改一处要通读全文 / AI 代理改这类文件更容易误伤无关代码（历史上已有 6 个插件被批量改坏的事故）"——这是**工程风险陈述**，不是用户的失败时刻。
- **判定**：**退回 Candidate**。理由两条：① 它没有基线（用户没被它伤到过）；② 它是典型的 grab-bag 形态（"拆分"是重构类标签，H3 明确要求先打回）。**触发条件写清楚**：等 RAG 功能真的要动（而非为了整洁）时再进来。

### 3.4 数据类功能：按 B2 该走什么不同的交付方式

> **先声明边界**：数据可靠性与安全类改动，主子已明示**往后放**。本小节**不新开任何数据工作**，只回答一个问题——**当那条线真的启动时，它不能走上面的漏斗。** 这是 B2 的要求，也是 SKILL.md:616 的转译条目 10：「把安全 / 数据相关的工作单独分出来，不放进上面的漏斗」。

**为什么必须分开**——37signals 自己的标准（《七条发布原则》原文，SKILL.md:549）：
> 「**anything that mutates or munges data. If you can lose data, it's high criticality.**」并要求「**you better be pretty sure you've checked everything twice or thrice**」

而**本项目的这些操作全在清单上**：上传、覆盖、移动/重命名、删除、回收站彻底删除、去重（查重后移入回收站）、索引/向量重建。SKILL.md:552 已经点名：「**这一条优先于本 Skill 的其他所有建议。**」

**单人最缺的恰恰是第 3 条（外部复核）**，所以他们可以"轻量交付 + 先上再修"，主子不能。

**数据车道的五条闸门**（[推断] 转译，落地时才需要细化）。每条后面附**本次只读勘察实测到的现状**——它决定了这条闸门现在有多厚：

| 闸门 | 具体动作 | 为什么 | **现状（实测）** |
|---|---|---|---|
| **G1 不并行** | 数据类改动**同一时刻只推 1 项**，且**不与任何前端 scope 并行** | 前端出错的代价是"点不动"，数据出错是"文件没了"。代价不对称，就不能共享注意力 | 无现状可测，属纪律 |
| **G2 先备份、且验过能还原** | 改动前备份，**并且实际演练一次还原**——不是"有备份"，是"证明备份能用" | 项目里已经有真实教训：446MB 损坏事故（`D1`）与 442.9MB 损坏备件至今未清理（建议清单 845 行）。**有备份 ≠ 备份能用** | ⚠️ **Web 上传路径无覆盖前备份**：`files-agent` 写前有 `.bak`（`:682`/`:754`），Web 上传路径没有（全仓 `.bak` 另见 `svc-audit/src/index.ts:143`，属审计文件）。存在 `privhub-git-backup` 周期性全局镜像（`POLL_MS = 60 * 1000` 见 `:35`，定时器 `:181`，镜像 `:101-137`，提交 `:140-156`），**但它是 60 秒粒度的整仓快照，回滚不了一次单独的上传**；且 `:77` 与 `:107` 两处都跳过 `.` 开头目录 → **回收站内容不进 git 备份**。它当前是否真的在跑：**未核实**（可查 `GET /privhub/api/gitbackup/status` 的 `autoBackup`，`:212`） |
| **G3 原子操作** | 破坏性动作必须是"临时文件 + 原子改名"或"写成功再删源"，**不允许先删后写** | 项目里已有正确写法可抄：**`privhub-svc-storage/src/index.ts:194-201`**（唯一临时名 + `rename`，注释自述是 D7 修过的并发撞车） | ✅ 上传这一条**做对了**：`privhub-files/src/index.ts:118` 建 `target + '.part'` → `:141` 在加密流 `done` 之后才 `rename`，磁盘上不留明文中间态。删除也做对了（`:171` → `privhub-core/src/index.ts:837` 先 `rename` 进 `.trash/<id>_<name>`，再同锁内写 `trash.json:839`）。**这两个现有写法应当被保留为范例** |
| **G4 可撤销优先** | 优先做成"进回收站"而不是"物理删除"；界面必须写明后果 | 现有实现已经在这么做 | ✅ 现状良好：`ttlDays` 默认 30（`privhub-trash/src/index.ts:26`）；前端两处 confirm 文案都明写「30 天后自动清除，可在回收站恢复」（`explorer-v3/client/ops.js:175`、`panel.js:298`）；彻底删除在 `privhub-core/src/index.ts:871-882`（**真正不可逆**）。**查重也走这条**：`svc-rag/client/index.js:461` 有 confirm，`:479` 逐条打 `/api/delete` 进回收站 → **误删 30 天内可逐条恢复** |
| **G5 验证强度高于功能** | 数据类改动的验收标准是"20 个并发首写后块数 == 20 且全部可解密"这种量级（D1 的验收原文），不是"点一下没报错" | 单人无 QA，唯一能替代的是**对抗性验证**——用另一个 AI 会话专门尝试把它弄坏（但注意 B1：非程序员无法验证 AI 的架构判断，SKILL.md:626） | 无现状可测，属纪律 |

**本次实测额外挖出的三类具体隐患**（都属于"动数据"，但**不新增工作，只是记账**）：

1. **上传覆盖是静默的**：写路径**不检查目标文件是否已存在**。`:111-115` 全段只有三项校验——权限（`:111`）、文件名合法性（`:112`）、**目标目录**存在性（`:115` `existsSync(dir)`，注意查的是目录不是同名文件）。同名即覆盖，**无确认、无旧内容留存**——审计只记了新文件的 `size`（`:143`），**旧文件大小/哈希未记录**（此条为代码可见推断，未实测）。对照：`files-agent` 的写入通道**有**覆盖前 `.bak`（`files-agent/src/index.ts:682`、`:754`），**两条通道的安全水位不一致**这一点是代码可见的。
2. **移动/重命名跨卷会直接失败**：移动是单次 `fs.rename`（`privhub-files/src/index.ts:215`，前置 `:213` 查同名），**无 `EXDEV` 分支、无 copy 退化**。好处是不会出现"先删后写"的半途丢失；坏处是跨卷场景报错而非可用。另：`:206-210` 的路径校验用字符串 `resolve`，**移动/重命名不过 `realpath`**（只有上传 `:114`、预览/下载 `:79`/`:233` 走 `resolveReal`）。
3. **中断残留清理机制**：实测全仓 4 处 `.part`，**4 处都在失败路径有 `unlink` 清理**——Web 上传在 `privhub-files/src/index.ts:140`（`.catch` 内 `await unlink(tmp)`），`files-agent` 在 `:688`/`:761`/`:906`（同形态）。**所以"无清理机制"这个说法不成立，我撤回**。真正**未核实**的是：**进程被强杀（而非抛错）时留下的 `.part` 是否在磁盘上堆积过**——这类残留不会有 catch 兜住，而本次为纯静态阅读，未查运行数据目录。

> **这三类我建议只记账、不排产**——主子已明示数据与安全往后放。写在这里是为了它们将来进数据车道时有据可查，不会在"顺手一起修"里被漏掉或误当成小事。

**放慢的意思是什么**：不是"拖时间"，是**不允许 circuit breaker**。功能类到期未完成 → 退回 shaping（S4）；**数据类到期未完成 → 只能等它完成**，因为半成品的数据改动比没做的数据改动更危险。

**当前状态下我的建议**：数据车道**保持空车道**（主子已明示往后放）。真正需要做的只有一件——**把它们从功能漏斗里物理隔离出去**，避免哪天被当成"顺手一起修了"。

### 3.5 明确不做什么（清单 + 理由）

**这一节按 Signals 21 的算法写：「"No" is no to one thing. "Yes" is no to a lot of things.」每条都写出它"杀掉了什么"。**

| # | 不做的事 | 理由（依据） | 它杀掉了什么（机会成本） |
|---|---|---|---|
| **N1** | **不再新增任何插件，直到图标栏入口重新定义完** | 约束 S2（12 上限，实测已满）；且已有 **18 个插件没有自己的界面代码、7 个插件没有自己的路由**（口径见 2.4） | 换来的是"每个入口真的能用" |
| **N2** | **不做"移动端竖屏适配"** | `需求文件:191-198` 明确列为"暂缓排产"；且它要动左侧栏默认收起、右侧面板改底部抽屉——**与约束第 1 条（入口必须留在左侧图标栏）正面冲突** | 换来了骨架改造的注意力 |
| **N3** | **不做多人实时协同编辑（CRDT/OT）** | `需求文件:81` 自陈"工程复杂度高，与低配 Windows 环境冲突风险大"；`F4`（建议清单 825）列为"须评估低配风险后再立项" | 换掉一整个季度的架构风险 |
| **N4** | **不做病毒扫描（ClamAV）** | `F4` 列为可选插件、依赖外部进程。**H9 原话**：依赖第三方的工作「**Better to do that work on a kanban than Shape Up style.**」（SKILL.md:350）→ 它连这个漏斗都不该进 | 换掉一个"依赖不归你控制的进程"的运维负担 |
| **N5** | **不换检索引擎（Meilisearch / SQLite FTS5）** | `F4` 写得很清楚："语料规模大到出现性能问题再换"——**触发条件未到** | 换掉一次全量索引重建的风险 |
| **N6** | **不做独立的反向链接面板** | `F4`：双链关系已由 `files-kg` 图谱呈现。**H10 的教训**：Jason 2025 砍 Fizzy 功能时的话——「我从没用过，你用过吗？」 | 换掉"同一件事两个入口"的长期维护 |
| **N7** | **不做 RAG 摄取队列持久化** | `F4` 末行标【不确定】是否有周期性全量 rebuild 补偿——**连现状都没查清，不该立项**（M5：没解决的未知是无底洞） | 换掉一次没搞清需求的架构改动 |
| **N8** | **不做虚拟滚动（U5）** | 建议清单 U5 自己的改法就写着："**先实测千级目录基线，确有卡顿再引入窗口化**"——基线未测。**H6**：它解决的是肉眼可见的问题，还是得拿显微镜才看得见的问题？ | 换掉一个 3000 行窗口化实现的复杂度 |
| **N9** | **不把主题变量收敛 / 视觉层（U4/U9）与 SH-1 混做一个 scope** | 交底 2.2 已判定：**项目没有令牌层，U4/U9 属"从零建层"**，要评估对 32 个插件前端的影响面 | 保住了 SH-1 的"砍一半还成立" |
| **N10** | **不引入打包链 / 构建步骤** | 交底约束第 2 条：无打包链是**特性**（局域网多次请求无感、二访全 304、改完刷新即生效） | 保住"改完刷新即生效"这个既有优势 |
| **N11** | **不动 `explorer-v3/detail.js` 里那批硬编码按钮**（收藏/权限/批注评论/生成页面/发布链接/版本历史/向量数据库） | 交底约束第 6 条：**这是【有意的临时代码】，不是缺陷。不要把它当缺陷提。** | 避免把"有意设计"当 bug 改 |
| **N12** | **不把 42 项账本当 backlog 继续养** | 书 Ch.7：「**Backlogs are a big weight we don't need to carry.**」+ M4：**Really important ideas will come back to you.** | 换掉"永远做不完"的持续挫败感 |
| **N13** | **不做「更新/通知横幅」** | `需求文件:91`：**已确认不做** | —— |
| **N14** | **不在本轮碰任何 S（安全）/ D（数据可靠性）编号项** | 主子明示往后放；B2 要求它们走 3.4 数据车道 | 换来本轮"功能与前端交互"的专注 |
| **N15** | **不在这份方案里给"该砍哪个插件"的结论** | **没有任何使用数据**（见第 5 节）。按 H10 的精神，砍要看"有没有人用"，而我不知道谁在用 | 避免我拿猜测冒充依据 |

**加一条元规则**：**N1~N15 不是永久否决，是"not now"**（书 Ch.3：a very soft "no" that leaves all our options open）。它们可以重新进 Candidate——**但必须重新走一遍三列，不能因为"上次差一点就做了"而插队**。

---

## 4. 我建议不要做的

**这一节是与第 3.5 节不同性质的东西**：3.5 是"PrivHub 不要做的功能"，这里是"**不要照搬 37signals 的东西**"。单人不等于小号 Basecamp。

| # | 不要做 | 为什么 |
|---|---|---|
| **D1** | **不要上六周周期 + 两周 cooldown** | 书附录 2 已授权：「You don't need to work six weeks at a time. You don't need a cool-down period」（`shapeup-official-fulltext-notes.md:247`）。**保留"先定额度"这个动作，丢掉"必须是 6 周"** |
| **D2** | **不要建 betting table（多 pitch 竞标）** | Singer 2025 自己说小团队应改成串行漏斗。而且——**单人没有"竞标"的对手**，竞标表会退化成给自己的日记 |
| **D3** | **不要画 hill chart** | Singer 2025 亲口承认 scopes + hill charts 那套「**for 90[%] of teams … not at all necessary to start**」（`02-conversations.md:166`）。起步只用一条判据：**上坡=还有未知 / 下坡=只剩执行** |
| **D4** | **不要写正式 pitch 文档** | 已列进"单人可丢"清单。**但 pitch 五味配料的"内容"要保留**（Problem / Appetite / Solution / Rabbit holes / No-gos）——用 3.3 那四条的格式，不写长文 |
| **D5** | **不要套用他们的"轻量交付、先上再修"来处理任何动数据的东西** | B2，SKILL.md:631 明写「**不要用「轻量交付、先上再修」处理任何会动数据的插件**」 |
| **D6** | **不要把"说不"当成意志力问题** | 见 3.0。他们的结论是**产能稀缺替他们说了不**；AI 放开产能后这个机制失效。**靠"我要有定力"必然失败，必须靠 S1~S4 那种写死的结构** |
| **D7** | **不要指望"用了 Shape Up"就等于交付会变好** | B3：公开成功案例有自选择偏差，「失败者不写博客」；最诚实的说法是**它更可靠地改善的是"决策的可见性"**，交付改善的证据弱于宣传。**别把它当保证** |
| **D8** | **不要把这套东西当成敏捷/看板流派** | 书序言原话：「we're not into waterfall or agile or scrum … **No backlogs, no Kanban, no velocity tracking, none of that.**」——[冲突] 但 DHH 2025-12 发布了 Fizzy（自述是他们的 Kanban），**引用须注明时点** |
| **D9** | **不要用"我 6 周后一定做完"这种承诺** | 书 Ch.14 的 only-two-conditions 里，**任何周期末的上坡工作都指向 shaping 出了问题**。单人 + AI 生成代码，最可能出现的恰恰是"上坡没解决" |
| **D10** | **不要为了凑满三列而把 Candidate 清空** | 书 Ch.7：「**Nothing else is on the table.**」一列空着是正常的，**空列不是失败** |

---

## 5. 我判不了的

**如实列出，不补、不猜。**

| # | 判不了的事 | 为什么判不了 | 谁能判 |
|---|---|---|---|
| **U-1** | **50 个插件里，哪些真的被用过** | 没有任何使用数据。README 说明这是"公司专用文件管理系统"（`需求文件:8`），但我看不到任何使用记录、访谈、埋点。**这也是 N15 与 N1 为什么只写"暂不新增"而不写"该砍哪个"的原因** | 只有主子（问同事 / 自己回忆） |
| **U-2** | **Shape Go 的判据我无法验证** | 这是本次最重要的一条判不了。官方判据是「**No material unknowns from both a technical and interaction standpoint**」，而 **B1 已判定：非程序员最难判断的恰恰是"AI 说这个能做，是真的能做吗"**。SKILL.md:282 原话：**这套模型的有效性取决于 shaping 那一端有没有真正的技术判断力** | **无法由本视角解决**。只能靠"另一个不带上下文的 AI 会话做对抗性复核"缓解，且**缓解不等于解决** |
| **U-3** | **"什么时候会想要它"这个问题，在单人项目里问谁** | Singer 的问法是问需求方（书 Ch.3 的日历案例；SKILL.md:606）。这里需求方就是作者本人，**而 M1 的失效条件明写：一个人自言自语时，framing 容易退化成"我觉得"** | 需要替代输入源（真实使用场景 / 真实用户），我提供不了 |
| **U-4** | **U1 键盘快捷键、U6 标签页上限、U7 回收站冲突的真实基线** | 三项都需要实测（"连续重命名 20 个文件要多久"这类），本次为纯静态阅读，**未启动服务、未发送任何请求** | 需要主子在自己的环境上实测 |
| **U-5** | **数据车道的 G2（备份可还原）在本机是否真的做得到** | 项目里已有 442.9MB 损坏备件"保留待专家恢复"至今（建议清单 845 行），说明**历史上还原能力是存疑的**。更具体的三个未知：① `privhub-git-backup` 当前**是否真的在运行**（读不到运行环境，只看到 `:171-177` 探测不到 git 时会**关掉定时器并告警**）；② 它只做 60s 粒度的**整仓快照**，回滚端点是 `:241`（按 project+path+commit 单文件回滚，`:262`→`:266`），**回滚不了一次单独的上传**这个判断仍成立，但"能不能回滚单文件历史版本"我**没实测**——理论上可以，取决于镜像里是否留有那个版本；③ 进程被强杀时留下的 `.part` 是否堆积过（正常失败路径**都有** `unlink`，见 3.4 节第 3 条） | 需要**一次真实的还原演练**（挑一个文件、造一次覆盖、走 `/gitbackup/restore` 试还原），并实机确认 `/privhub/api/gitbackup/status` 的 `autoBackup` 字段 |
| **U-6** | **`deploy/privhub-deploy/` 与开发源码的实际差距** | README:64 说落后（少 2 个插件），但 `O1` 在验收报告里标为已修。**两边对不上**，我没去逐文件比对 | 需在同步前做一次哈希比对 |
| **U-7** | **图标栏 12 这个数字是不是真的可接受** | S2 的"12"取的是当前现状，**没有任何依据说 12 是合适的上限**。[推断] 我只能说"12 已经满了，所以到了一个必须做决定的点" | 主子（取决于真实使用密度） |

**判不了的最大一块**：**U-2 —— Shape Go 的那道闸门，我一个人补不上。** Singer 说头号失败模式是 undershaped work，成因是"用只有 PM 和非技术设计师做 shaping"；而本项目"非程序员 + 全 AI 生成代码"正落在这一档。**我能做的只是把判据写得足够具体（3.2 的七项 + 外部闸门），让"没解决的无底洞"更容易显形——但我没办法替主子判断 AI 有没有在骗人。** 这一条我建议当作整份方案的最高风险项看待。

---

## 6. 我这把视角适合干什么活

**一句话：适合回答"这个功能到底做不做、砍到什么程度、下一批只准推几件"，产出三列漏斗、appetite、砍半范围与 No-gos——不适合验证代码、也不适合替主子拍板。**

具体一点（供主子决定是否做成常驻智能体）：

- **能接**：新功能请求的立项判断；把模糊需求逼成"具体失败时刻"；范围砍半；给一批工作定 appetite；写"明确不做"清单与理由；单人版交付节奏与结构性约束的设计。
- **不接**：写代码 / 改代码 / 排期工具（SKILL.md:90 明写"执行类 → 不做"）；替代真实用户研究；判断 AI 生成的代码是否真的满足了"无实质未解项"。
- **最该常驻的时机**：**每次动"要不要加一个插件 / 要不要顺手做某条"之前**——也就是主子现在这个时点。

---

> 本文件不动 `privhub/` 下任何源码，不动 `docs/experts/` 下任何既有 Skill 文件；仅新建本文件。
> 未核实项已在正文逐条标注；与既定约束冲突处集中记于第 2.3 节 C1~C7。
