# 更新日志（CHANGELOG）

本文件记录 PrivHub 的每一次改动，并与版本号一一绑定。
**当前版本：3.1.1**

> 主仓库已迁移至 GitHub（https://github.com/marsma-101/privhub），Gitee 暂停同步。后续版本改进在 GitHub 上进行，每个发布版本以 git tag 标注（如 `v3.1.0`）。

## 版本号规则

`主版本.次版本.修订号`（三段式，按改动大小递增）

| 段位 | 何时递增 | 例子 |
|---|---|---|
| **主版本** | 不兼容的架构或数据格式变更（需要迁移、旧数据可能失效） | 数据存储格式改版、接口契约破坏性调整 |
| **次版本** | 向后兼容的**新功能** | 新增插件、新增权限模型、新增接口 |
| **修订号** | 缺陷修复、文案与界面微调、内部重构、文档同步 | 修 bug、改提示语、补测试 |

版本号的**唯一来源**是 `privhub/package.json` 的 `version` 字段；
`GET /privhub/api/health` 上报的就是它。改版本号只需改这一处。

> 历史沿革：3.0.1 之前的提交记录见 `git log`，本文件自 3.0.1 起逐条记录。

---

## [3.1.1] — 2026-09-17

### 缺陷修复 · A 批：后端致命 bug（5 条，只改行为、不做结构改造）

**动机**：七角度交叉评审（`docs/reviews/00-总览-七角度交叉结论.md`）确认这个项目
「块切得没错，病在缝上」——**出错没有出口**。本批只修其中最凶的 5 条后端缺陷，
不改数据格式、不改接口契约、不重命名、不删死代码（结构类的活留给 B/C 批）。

| # | 缺陷 | 修法 | 证据 |
|---|---|---|---|
| **A1** | **RAG 检索/问答入口是死的，每次必挂** —— `ragSearch()` 内在 :851/:853 使用 `manifest`，而 `const manifest` 声明在 :888，同一函数体内构成暂时性死区（TDZ），检索固定 500、问答固定 400 | 把 `const manifest = await loadManifest(ctx)` **上移到首次使用之前**（位置在 collection 校验之后，保留「无权限直接返回、不读盘」的原有短路顺序）；不改 `var`、不用可选链绕过 | `plugins/privhub-svc-rag/src/index.ts:846-849`（上移后） |
| **A2** | **一次摄取异常可能打死整个服务** —— `queue = queue.then(fn, fn)` 把上一次的失败当函数再跑，链尾是裸 Promise；全仓 `unhandledRejection` 零处理器，Node 24 默认 `--unhandled-rejections=throw` ⇒ 整进程退出 | ① 队列加错误出口：`queue.then(task).catch(...)`，异常落日志、链永不 reject；② `src/main.ts` 增进程级 `unhandledRejection` / `uncaughtException` 兜底（**只记录不退出**）；③ 队列失败计数暴露到 `/privhub/api/rag/status.ingestQueue.errors` | `plugins/privhub-svc-rag/src/index.ts:1098-1133`、`src/main.ts:134-158,169` |
| **A3** | **点开头名字「建得成、看不见」** —— `isValidName` 不拦首字符点，而 `listFiles` 静默过滤 `name.startsWith('.')`；且全文搜索是递归 `listFiles` ⇒ 点开头目录**整棵子树是搜索盲区** | 在 `isValidName` 里**拒绝首字符点**（不选「取消隐藏」：那会把回收站 `data-files/.trash/` 与历史遗留 `data-files/.agents/` 一并暴露）。只拦新建/上传/改名，**历史数据保持原样** | `plugins/privhub-core/src/index.ts:801-818` |
| **A4** | **同名上传静默覆盖**（覆盖后版本历史为空，已实测） | 只做「不再静默」这一步：同目录**同名文件已存在时明确失败**（HTTP 409 + 中文原因），校验在读取请求体之前完成。**不改写入语义、不做备份/版本历史**——覆盖会动数据，按 Shape Up 硬约束属另一批需单独设计 | `plugins/privhub-files/src/index.ts:116-127` |
| **A5** | **全站唯一兜底 catch 静默吞异常** —— `web-server.ts` 的 catch 里 `e` 未被使用、无任何日志 | 把异常写进系统日志（`console.error` 已被 `main.ts` 的 `installFileLogger` 接到 `data/logs/`），**响应行为保持 500 不变** | `src/web-server.ts:300-307` |

**同时新增常驻断言**（原先 A1/A2 所在的 RAG 路径与「异常是否落日志」**零覆盖**，
「改前改后失败清单逐条同名」这道闸门对它们是瞎的）：

- 新增 `privhub/tests/rag-resilience.mjs`（27 条断言，自带隔离实例端口 3195、
  独立测试根 `tests/.testroot-rag/`，**不碰 data/ 与 data-files/**）：
  A1 检索/问答正常作答、A3 点开头名字被拒且普通名字不受影响、
  A4 同名上传返回 409 且原文件内容未变、A2 注入一次摄取异常后
  **服务仍存活 / 日志有记录 / 后续上传照常**、A5 必抛错路由仍返回 500 且日志留痕。
- `privhub/tests/run-all.mjs` 脚本清单**追加**一项（原顺序未动），
  并让该脚本以 `--import tsx/esm` 启动（它要读 `src/web-server.ts`）。
- A2 的断言配了**阴性对照**：把队列改回 `queue.then(fn, fn)` 时，
  服务在注入后**当场死亡**（后续请求 `ECONNREFUSED`），断言由绿转红。

**已知影响面（有意为之的行为变化）**：

- 同目录重名上传由「静默覆盖成功」变为「明确失败」——用户会看到
  「同名文件已存在：xxx（为避免覆盖，请改名后重新上传）」。依赖覆盖语义的用法需改名上传。
- 点开头的文件名（例如 `.合同`）现在**不允许创建**；此前可以创建、但列表与搜索都看不到。

**回归对照**：`node tests/run-all.mjs --spawn` 改动前后**失败清单均为空、逐条同名**
（0 条失败），退出码 0；改动前基线 `docs/reviews/evidence-2026-09-17/_baseline-A.txt`、
改动后 `docs/reviews/evidence-2026-09-17/_after-A.txt`。

### 缺陷修复 · 文本文件超过 512 KB 时谎报「该文件类型不支持在线查看」

| 项 | 内容 |
|---|---|
| **缺陷** | 文本格式（`md`/`txt`/`json`/`csv`/`log`/`html` 等 22 种）**超过 512 KB 就报成「未知类型」**，界面照念「该文件类型不支持在线查看」——**类型明明是支持的，是体积超了**，用户据此以为「md 不能看了」。实测：`参考文/冰与火之歌I权力的游戏.md`（1,636,165 字节）预览返回 `{"ok":true,"type":"unknown","data":""}` |
| **修法（后端）** | `readFileForPreview` 把「超限」从「不支持」里拆出来：超限返回 `type:'too-large'` 并**如实带回 `size` 与 `limit`**；`unknown` 只留给**真的不支持在线预览的扩展名**（语义收敛）。判定放在图片/PDF 分支之前，避免把本来走字节流的类型抢走。**512 KB 上限原样保留**（它挡的是「把几百 MB 文本读进内存」） |
| **修法（路由）** | `/privhub/api/preview` 把 `size` / `limit` 原样透给前端；其余类型的响应形状不变（仅在超限时多两个可选字段） |
| **修法（前端）** | `content.js` 把两种情形**分两句说**：超限时给「文件过大（1.6 MB），超出在线查看上限 512 KB；请在文件列表里右键该文件，选「⬇ 下载」后用本地编辑器查看」，大小按 MB/KB 显示；真正的「类型不支持」**保留原话**。只改这一条文案与降级呈现，**不动交互结构、不加入口、不改布局** |
| **证据** | `plugins/privhub-core/src/index.ts:726-766`、`plugins/privhub-files/src/index.ts:65-75`、`plugins/privhub-files-explorer-v3/client/content.js:38-46,56-62` |
| **兼容性勘查** | `preview` 的 `type` 消费方全仓 3 处：`content.js:28-46`（本次改的）、`frontend/index.html:565`（只把失败归一成 `unknown`，读 `type/data`，未消费新值）、`plugins/_retired-v2/privhub-files-preview`（**已退役，不在装配清单**）。`edit-md` 不读 `type`，行为未变。无历史回归项依赖「超限 = unknown」 |

**同时新增常驻断言**（原先这条路径**零覆盖**，「改前改后失败清单逐条同名」这道闸门对它同样是瞎的）：

- 新增 `privhub/tests/preview-limits.mjs`（**20 条断言**，自带隔离实例端口 3196、
  独立测试根 `tests/.testroot-preview/`，探针文件直写测试根，**不碰 `data/` 与 `data-files/`**，跑完自清）：
  ① 超限文本给出可区分的超限原因（并回带真实的 `size`/`limit`）、
  ② 限内小文本仍返回可正常渲染的类型且内容照返、
  ③ 真正不支持的扩展名仍是明确的「不支持」、
  ④ 界面上指向的那条出路（`/privhub/api/download`）对超限文件照常可用。
  断言**指向行为不指向实现**：只断言「两种情形给出不同原因」，不断言具体中文句子、不断言字段名。
- `privhub/tests/run-all.mjs` 脚本清单**追加**一项（列在 A 批的 `rag-resilience.mjs` 之后，原顺序未动）。

**阴性对照（已做，做完整份还原）**：把后端那一处改回 `{ data:'', type:'unknown' }`，
断言**由 20 通过 / 0 失败 变为 15 通过 / 5 失败**（退出码 1），其中失败含核心那条
「超限与不支持给出【不同】的 type（unknown ≠ unknown）」；同一次运行里
「限内小文本照常」「不支持仍是不支持」「下载通道可用」共 15 条**保持绿**，
说明变红的不是环境也不是探针，正是被修的那一处行为。原始输出见
`docs/reviews/evidence-2026-09-17/_negative-control-oversize.txt`。

**回归对照**：`node tests/run-all.mjs --spawn` 改动前后**失败清单均为空、逐条同名**
（0 条失败），退出码 0；断言行 315 → 335，**差值 20 = 新增断言的条数**，
无既有断言改名或消失。改动前基线 `docs/reviews/evidence-2026-09-17/_baseline-oversize.txt`、
改动后 `docs/reviews/evidence-2026-09-17/_after-oversize.txt`。

**已知边界（本批未动，留给后续）**：内嵌编辑器（`privhub-files-edit-md`）读的是同一接口
但不看 `type`（`client/index.js:225-229`），超限文本在它那里会落成**空白编辑区**；
本批只让内容区说清原因，**未动编辑器**。

### 改进 · 文本在线查看上限 512 KB → 10 MB（并加一道大文件只读闸）

**动机**（用户原话「抬到 10 MB」）：要覆盖 `AI小说研究/参考文/` 下的 5 本书
（实测最大 2.4 MB）；原上限 512 KB 下这些书一律只能下载后看。

| 项 | 内容 |
|---|---|
| **上限新值** | **10 MB**（`10 * 1024 * 1024` = 10485760 字节），由新导出的具名常量 `MAX_TEXT_PREVIEW_BYTES` 承载，`limit` 字段如实反映它（前端文案自动跟着变，无需改句子） |
| **改了哪一处** | 只改 `readFileForPreview` 里那一个文本预览阈值。`files-export` / `files-fulltext` / `svc-search` / `files-kg` 里各自的 512 KB 类阈值是**各自独立**的，一律未动 |
| **保留不动的语义** | ① 新增的 `too-large` 与「类型不支持」分离；② 前端「超限」与「不支持」两句分说；③ 超限时仍如实回带 `size` 与 `limit`（说清「多大、超了多少」）；④ 超限时不把整份文件塞进 JSON |
| **证据** | `plugins/privhub-core/src/index.ts:63-70`（常量与来历注释）、`:747-757`（判定分支） |

**必须一起做的保险 · 大文件不自动进编辑器**（否则抬上限就等于白抬）：

- **风险**：`content.js` 打开文本后无条件 `bus.emit('md:auto-edit')`，edit-md 随即把
  **整份内容**灌进内嵌编辑器并同步渲染 —— 一本 2.4 MB 的书一打开就可能把浏览器卡死。
- **做法**：加**具名常量**体积闸 `AUTO_EDIT_MAX_BYTES = 1024 * 1024`（1 MB，
  `plugins/privhub-files-explorer-v3/client/content.js:10-24`，注释写明「超过这个体积
  自动编辑会拖垮浏览器」及其来历）：
  - 小于闸值 → **照旧自动进编辑态**（既有体验不变）；
  - 大于闸值 → **只读呈现**，并在内容区顶部给一句克制的说明
    （`panel.js:404-406` + `styles.js:71-72`，**不弹窗、不加按钮、不改布局**）。
- **为什么取 1 MB**：改动前实际上限就是 512 KB，即**所有原本能在线打开的文件都不超过 1 MB**，
  故闸值取 1 MB ⇒ 既有体验零变化，只有本轮新放开的「大书稿」走只读。留有余量、便于以后调。
- **界面上看到的话（原文）**：
  「文件较大（1.3 MB），已以只读方式打开；需要编辑请先在文件列表里右键该文件，选「⬇ 下载」后用本地编辑器打开」

**顺手修掉上一轮标出的相邻缺陷 · 空白编辑区**（02 号评审反复点名的「静默」类）：

- **缺陷**：`plugins/privhub-files-edit-md/client/index.js:225-229` 读同一个 `/api/preview`
  却**不看 `type`**：超限时接口正常作答 `{ok:true,type:'too-large',data:''}`，
  编辑器把空串当正文 ⇒ 开出**空白编辑区**；更糟的是此时点保存会把**空内容写回磁盘**。
- **修法**：尊重接口给出的类型/体积 —— 拿不到可编辑文本就**不开编辑器**，并明确说明原因与出路
  （非 md 文本：`too-large` 与非 `text` 分别给话，且仅在「自动进入」时用一次性提示补上原因，
  避免「点了没反应」；正文非字符串的异常形状另有兜底，**空串仍视为合法可编辑**）。
- **证据**：`plugins/privhub-files-edit-md/client/index.js:235-263`（类型/体积判定与兜底）、
  `:119-124`（`fmtBytes`，与 explorer-v3 的 `fmtSize` 同口径）。

**同时扩常驻断言**（同一个文件，不新建第二个）：`privhub/tests/preview-limits.mjs`
**20 条 → 39 条**，新增 19 条：

1. **上限绝对下限**：「在线查看上限 ≥ 10 MB」（把上限翻回 512 KB 时这一条必红）；
2. **只读闸存在且小于上限**；
3. **边界两侧**：略小于 10 MB（9.6 MB）→ `text` 可查看且内容照返；略大于 10 MB → `too-large`
   且 `limit` 等于当前上限（并断言回带的 `limit` 与源码常量一致）；
4. **只读闸行为**：把 `content.js` **真身** import 进 Node（只桩掉 `window.PrivHub` / `window.Vue`
   两个外部依赖，**不开浏览器**），喂**接口现在真正回带的响应形状**（正文本不带 `size`，
   由前端按 UTF-8 自算体积），观察「自动进编辑态」事件发没发 ——
   越闸大文本发 **0 次**、闸内小文本发 **1 次**、超限文本仍是错误态且不发。
   断行为（事件次数），不断言中文句子。
5. **真实样本书体积**：读 `data-files/AI小说研究/参考文/` 里 3 本最大 `.md` 的**真实字节数**
   （只读体积，不读内容、不写回），按同体积造探针过一遍接口 —— 3 本全部 `text` 可查看
   （旧 512 KB 上限下它们全部超限）。**为什么不直接复制真书进来**：真实数据是 AES-256-GCM
   密文（`PHENC1`），密钥属于真实实例，复制进隔离实例只会解密失败（HTTP 500）。
6. 原有 20 条**全部保留**（只把探针体积按新阈值重设，断言本身未改）。

**阴性对照（两条，各做完即整份还原）**：

| 对照 | 做法 | 结果 | 原始输出 |
|---|---|---|---|
| A · 上限翻回 512 KB | 把 `MAX_TEXT_PREVIEW_BYTES` 改回 `512 * 1024` | 39 通过 / 0 失败 → **35 通过 / 4 失败**，退出码 1 | `docs/reviews/evidence-2026-09-17/_negative-control-10m-limit.txt` |
| B · 去掉只读闸 | 把 `if (!readonlyHint)` 改成 `if (true)`（无条件自动进编辑） | 39 通过 / 0 失败 → **38 通过 / 1 失败**，退出码 1 | `docs/reviews/evidence-2026-09-17/_negative-control-10m-gate.txt` |

对照 A 里变红的第 1 条是**故意写死的绝对下限**（不是按阈值参数化算出来的）——
否则「边界两侧」那几条会跟着旧阈值一起缩，反而测不出「用户要的能力被拿掉了」。

**回归对照**：`node tests/run-all.mjs --spawn` 改动前后**失败清单均为空、逐条同名**
（0 条失败，前后都无 ❌），退出码 0；各套件 86/12/76/39/16/50/3 + A批27 + 预览上限
20 → 39，**总通过数 348**（其中预览上限由 20 涨到 39）；
**无既有断言改名、消失或转红**。
改动前基线 `docs/reviews/evidence-2026-09-17/_baseline-10m.txt`、改动后 `docs/reviews/evidence-2026-09-17/_after-10m.txt`。

**[未实测·如实标注]** 10 MB 文本在**真实浏览器**里的渲染与传输开销（Vue 把 ~10 MB 内容
交给 `v-html` / `<pre>` 的那一下）本批**无法实测**：现有回归没有一条开过浏览器。
本批只保证「不会自动把大文件灌进编辑器」，不保证「只读渲染 10 MB 一定不卡」。
另：`ops.js:269-273` 的「显式编辑」（entry:open，force）**不走**只读闸 ——
用户手动点编辑仍会进编辑器（本批未动，属既有能力）。

### 说明（本批没做的）

- **不是**「结构性改造」：没删死代码、没重命名、没重排文件、没动 `data/` 与 `data-files/`。
- **没有** git commit / push：等人工确认。
- A2 那条「一次异常打死服务」的**端到端**复现需要测试专用注入点
  （`PRIVHUB_TEST_ROOT` 存在时才生效的一次性标记文件），生产环境该分支恒不触发。

### 缺陷修复 · 内容区残留（打开 docx 后切别的文件会闪出旧 docx）—— 两步走的第一步·止血

**动机**（用户反馈）：打开过 docx 之后，再打开任何别的文件，内容区会先弹出上一个 docx 的
界面「闪一下」。已确诊的机制是：`privhub-files-office2` 往宿主内容区
（`explorer-v3` 的 `.v3-content`）里 `prepend` 了一个 iframe，而**全仓无一处移除它**
（旧代码在“扩展名不是 docx/xlsx”时直接 `return`，什么都不清理）；office2 的 CSS 又用
`.v3-content:has(iframe.office2-frame)` 反查这个外来节点来决定内容区布局 —— 只要它还在，
内容区就一直是 office 布局，旧 docx 因此铺满可见区、把新内容挤出，直到内容区被整体重建
才恢复。**根治（所有权 + 声明式 viewer）是第二步，本批只止血。**

| # | 改动 | 位置 |
|---|---|---|
| **1** | **宿主加「交接清理」**：切标签 / 换文件的那一刻，先清掉**带归属标记**的注入残留 | `plugins/privhub-files-explorer-v3/client/panel.js:95-107`（两处 watch）、`:116-135`（`clearInjected()`） |
| **2** | **office2 自我收尾**：注入时给自己那个 iframe 打归属标记；打开非 docx/xlsx 时**它自己把 frame 收掉**（不留给宿主善后） | `plugins/privhub-files-office2/client/index.js:17-21`（标记）、`:47-59`（`clearOwnFrame()` + 收尾分支）、`:66-71`（不再复用旧 frame） |
| **3** | **布局不再依赖外来节点**：office 布局改由宿主状态类 `.v3-content--office` 驱动（宿主按当前标签类型自己加），office2 的 CSS 不再反查自己插入的 iframe | `panel.js:67-80`（`contentClass`）、`:449`（`:class="contentClass"`）；`office2/client/index.js:23-33`（CSS） |
| **4** | **顺带治掉次要触发点**：换文件时**不再复用旧 iframe 只改 `src`**（iframe 导航期间浏览器会保留上一次已绘制的画面，这就是“切回来又闪一下”的来源），改成「先摘旧的、再造新的」 | `office2/client/index.js:63-76` |

**认人方式（守住硬约束 5）**：宿主的清理**按归属标记 `data-v3-injected` 认人**，
不用类名、不用标签名猜。带标记的才清，`edit-md` 的 `.md-inline-root`、`comments` 的
`mark` 锚点都不带标记 ⇒ **一个都不碰**（这三家的节点结构本批一律未动）。

**改了一条既有断言（原先锁的是实现写法）**：`privhub/tests/personal-ui.mjs` 里
`office2 以 prepend 插入 iframe` 断言的是 `content.prepend(frame)` 这个 **DOM API 写法**，
与项目自定规矩「优先断言行为，而非行号或实现细节」相悖，已改写为行为向断言
（打开 docx 有带标记的 viewer / 切走后不再有 / 不复用旧 frame），并**补齐常驻断言**：

- 新增 **G 内容区所有权契约**（15 条）：注入者必须打归属标记、注入者清单与预期一致、
  没有别家往内容区插节点、宿主存在交接清理且**两个交接入口都走到它**、
  插件 CSS 不得用“反查他人后代”的写法绑架布局、布局类由宿主状态驱动。
- 新增 **H/H2 DOM 级行为**（8 条）：把 office2 **真身**放进最小 DOM 桩里真跑
  `replace()`，断言「打开 docx → 内容区出现 1 个已标记 viewer；切到非 docx（.md/.png）→
  **数量为 0**；再次打开 docx → 换的是新节点」。
- 新增 **I 宿主清场行为**（9 条）：把宿主 `clearInjected()` 真身放在 DOM 桩里真跑，
  断言「清场后 `.v3-content > iframe.office2-frame` 数量为 0」、**edit-md / comments /
  宿主自己的 `.v3-pdf` 节点全部保留**、上一次 office 预览留下的内联隐藏被还原。
- 顺带修正 `personal-ui.mjs` 里一处**已经失效的切片边界**：标签行断言原本用
  `indexOf('v3-content')` 当边界，而内容区的类现在是宿主状态绑定（模板里不再有该字面量），
  边界取不到会让切片一路吃到内容区、把图片 `alt` 里的 `activeTab.name` 误判成
  “标签行里重复渲染文件名”。已改为按「内容区起始注释」切，并**加一条断言守住这个边界**。
- 测试文件内 `o2Src`（office2 入口源码）由 F 段块内声明**上提为模块级**，供 G 段复用
  （纯测试装配，不改任何断言口径）。

**阴性对照（已做，做完逐项还原）**：见下表，每一行都是把本次新增的**一处**清理逻辑去掉后
真实跑出来的红字（`privhub/tests/personal-ui.mjs`）：

| 对照 | 去掉什么 | 真实输出 |
|---|---|---|
| ① | office2 的自我收尾 `this.clearOwnFrame()` | `个人空间界面回归：64 通过 / 4 失败` —— ❌ 非 docx/xlsx 时 office2 自己收掉 viewer；❌ 切到非 docx（.md）后内容区不再有 office2 viewer（**实际 1，判据要求 0**）；❌ 容器里没有任何带归属标记的残留节点（**实际 1**）；❌ 切到图片后内容区不再有 office2 viewer（**实际 1**） |
| ② | 宿主 `store.activeKey` 处的交接清理 | `67 通过 / 1 失败` —— ❌ 切标签（store.activeKey 变化）时执行交接清理 |
| ③ | viewer 的归属标记赋值 | `65 通过 / 3 失败` —— ❌ 带归属标记；❌ 打开 docx 后出现 1 个已标记 viewer（**实际 0**）；❌ 再次打开 docx 时换了新 viewer |
| ④ | 把 office2 的 CSS 改回“反查外来节点”的写法 | `66 通过 / 2 失败` —— ❌ 没有任何插件用“反查他人后代”的写法绑架布局；❌ 布局规则不再反查自己插入的 iframe |

**回归对照**：`node tests/run-all.mjs --spawn` 改动前后**失败清单均为空、逐条同名**
（0 条失败），退出码 0；各套件 86/12/76/**39→77**/16/50/3 + A批27 + 预览上限39
（**个人空间界面回归的增量是本次新增断言**，前 39 条断言逐条同名且全绿）。
改动前基线 `docs/reviews/evidence-2026-09-17/_baseline-inject.txt`、改动后 `docs/reviews/evidence-2026-09-17/_after-inject.txt`。

**[未实测·如实标注]** **「闪烁」本身是浏览器的绘制时序现象，Node 里既没有浏览器也没有
合成层**，本批**没有**在真实浏览器里用绘制录制复现或验证过：

- 无法实测「改完还闪不闪」、无法实测切换手感与 office 预览页自身表现；
- 判据② `getComputedStyle(.v3-content).display` 的**计算值**同理拿不到（本机无浏览器、
  项目也没有 jsdom/happy-dom 这类可做 CSS 级联的依赖），只做到静态证明：office 布局规则
  现在只挂在宿主状态类上，而非 office 布局时宿主返回的类名里不含它；
- 「iframe 导航期间保留上一次画面」这一条是按代码顺序的**推断**，不是录像证据。
  ⇒ 仍需按方案 §9.1 的 8 步**手工验收**（控制台两条命令是硬判据）。

**本批没有做的事（边界）**：不建 `window.PrivHub.viewers` 契约、不改 manifest 字段、
不动插槽与骨架、不做四家注入者迁移（第二步）；不动交互结构、不新增入口、不改布局
（功能入口保持在左侧图标栏）；**未改 `edit-md` 与 `comments` 的任何逻辑**；
未动 `data/` 与 `data-files/`；未做 git commit / push / stash。

### 结构契约 · 第二步 a：viewer 契约 + 挂载锚点 + 挂/卸生命周期（只立规矩，不迁移任何插件）

**动机**：第一步止了血（残留消失），但没有解决「谁有权动内容区」这个根——
第二个注入者出现时同样的病会再犯。本批按 `docs/reviews/10-内容区所有权与docx残留-方案.md`
§6/§7 立契约：**宿主当老板，插件递名片**。

**形状（已定案，不许改）**：viewer 落在**标签自己的容器内**，由宿主
`explorer-v3` 按当前标签的格式**按需挂载与卸载**——不常驻、不新增插件、骨架一字不动。
常驻一块 office 视图就会退化成第一步刚修掉的那个残留 bug。

| 项 | 落点 |
|---|---|
| 契约 | **新增** `plugins/privhub-files-explorer-v3/client/viewers.js`（本插件自己目录内，硬约束 3）。`window.PrivHub.viewers = { register / unregister / resolve / list / subscribe / lifecycle }` |
| 声明形状 | `{ id, exts, priority=100, mount(hostEl, ctx), update?(hostEl, ctx), cleanup?(hostEl, ctx) }`；`mount` 返回的函数即卸载时的清理函数。**校验不过一律抛错**（缺 id/exts/mount、priority 非数字、id 重复），不静默降级 |
| 解析 | 同一扩展名多家声明：`priority` 大的先赢；同分**先注册先赢**（显式定序，不给文件系统顺序留后门） |
| 挂载锚点 | `panel.js` 内容区模板里新增 `<div class="v3-viewer-host" data-viewer="none"></div>`，**由宿主创建与销毁**且位置固定；插件只拿这个 div，**不再认 `.v3-content`**。空锚点不占位、不加任何 CSS ⇒ 现有布局零变化 |
| 生命周期 | `activeKey` / `content` 变化 → 解析 viewer：异类 → **先卸旧的、再挂新的**；同类换文件 → **复用**（走 `update()`，挂载点不重建、viewer 身份不变）；同文件重复同步 → **完全不动**；无任何声明 → **回退老路** |
| 顺序准绳 | **卸载 viewer 必须晚于「切标签前的静默保存」**（`tabs.js` 先同步 emit `md:interrupt` 再改 `activeKey`；宿主 watcher 用默认 pre flush）。本批**只立钩子点、不改既有保存时序** |
| 宿主清场 | `clearInjected()` 现在**跳过挂载点内部**——那是 viewer 的私有财产，由它自己的 `cleanup` 收 |

**为什么不走 manifest 新字段**：`privhub-shell/server/index.ts:55` 只认 `id` 与 `slots`；
`frontend/index.html:832/894` 会把 `window.PrivHub.manifests` **整体替换**，插件侧可能是旧引用。
让能力清单依赖一个会被整体替换的引用 = 给未来埋雷。

**本批一个插件都没迁移**：`office2` / `edit-md` / `comments` / 图片 / PDF **一律未动**，
老路（md/text 内联渲染、image/pdf 走 `preview-raw`、office2 现有注入）**原样照跑**。
双轨兼容，应用仍完全可用。

**新增断言**（`privhub/tests/personal-ui.mjs` 段 J，48 条；跑 `viewers.js` 与 `tabs.js` 的**真身**）：
契约形状与校验（含「id 重复必须抛错」）、priority / 先注册先赢、**无声明回退老路**（假 viewer
注册→注销后老路必须恢复）、**同类切换复用 / 异类切换换 viewer / 同文件零动作**、
**「卸载晚于保存」的可验证性**（源码级 + 真跑 `tabs.js` 用**同步观察者**看顺序）、
运行时倒挂自检、锚点由宿主创建、`index.html` 一字未动。

**阴性对照（已做，做完逐项还原，SHA256 校验一致）**：

| # | 去掉/改坏哪一环 | 真实输出 |
|---|---|---|
| ① | `viewers.js` 异类切换分支「只挂不卸」（`if (cur) unmount('switch')` → `if (false)`） | `个人空间界面回归：122 通过 / 3 失败` —— ❌ 异类切换 = 换 viewer（锚点里只剩新 viewer 一个）；❌ 先卸旧的、再挂新的（**实测：B.mount:P\|c.md**）；❌ 再切回去同样先卸后挂 |
| ② | `tabs.js` `activateTab` 把 `md:interrupt` 挪到 `store.activeKey` 之后 | `123 通过 / 2 失败` —— ❌ 三个切换入口都在改 activeKey 之前 emit md:interrupt；❌ 真跑 activateTab（**实测顺序：activeKey变更 → md:interrupt**） |

对照原始输出存 `docs/reviews/evidence-2026-09-17/_negative-control-viewer-NC1.txt` / `-NC2.txt`。

**回归对照**：`node tests/run-all.mjs --spawn` 改动前后**失败清单均为空、逐条同名**
（0 条失败），退出码 0；个人空间界面回归 **77 → 125**（增量全部是本次新增断言，
原有 77 条逐条同名且全绿）。
改动前基线 `docs/reviews/evidence-2026-09-17/_baseline-viewer.txt`、改动后 `docs/reviews/evidence-2026-09-17/_after-viewer.txt`。

**[未实测·如实标注]** **「同类切换复用不白闪」的肉眼观感，本批证明不了**：Node 里没有
浏览器、没有合成层，只有 DOM 桩。本批能证的是「不该重建的没重建、不该留的没留、
锚点元素自始至终是同一个」，**证不了「用户眼睛看不到闪」**。仍需按方案 §9.1 手工验收。

**本批没有做的事（边界）**：不迁移任何插件（`office2` 改声明式属 b 批，`edit-md` 属 c 批，
`comments` 属 d 批）；不动 manifest、不动插槽、不新增插件、不引入打包链；
不动 `frontend/index.html`（骨架一字未动）；不改交互结构与布局；不动 `data/` 与 `data-files/`；
**未做 git commit / push / stash**；版本号仍为 3.1.1（本轮条目追加在 3.1.1 段内）。

---

### 结构契约 · 第二步 b：office2 迁到 viewer 契约（"宿主当老板，插件递名片" 真正落地）

**动机**：第二步 a 立好了规矩（`window.PrivHub.viewers` + 挂载锚点 + 挂/卸生命周期），
但**一个插件都没迁**。最痛的那家 —— `privhub-files-office2`，唯一「只进不出」的注入者、
也是本次「打开 docx 后切任何文件都闪一下旧 docx」的当事人 —— 还在自己
`document.querySelector('.v3-content')` 往里 prepend iframe。本批把它按契约迁走：
**删掉那一次跨插件 DOM 认领，内容区的所有权才真正归宿主**（交底 §6-5 的正解）。

**迁移前后对照**

| 项 | 迁前 | 迁后 |
|---|---|---|
| 触发 | `bus.on('v3:md-rendered')` 自己监听 | 不监听任何事件：向契约登记一次即可 |
| 找容器 | `document.querySelector('.v3-content')` | **不用找** —— 宿主把挂载点 `.v3-viewer-host` 交给它 |
| 插入 | `content.prepend(fresh)` | `hostEl.appendChild(frame)`（只往自己那块地里放） |
| 卸载 | `clearOwnFrame()` 自己扫全文档摘 frame | `mount` 返回清理函数，**谁挂的谁收** |
| 换文件 | 自己先摘旧的再造新的 | 不声明 `update` ⇒ 宿主在同一锚点里「先收后建」 |
| 布局 | 注入 `.v3-content--office` + 全局 `iframe.office2-frame` | 只写 `.v3-viewer-host[data-viewer="…"]` 之下的规则 |
| 组件卸载 | 只摘监听器，节点留在别人容器里 | `beforeUnmount` → `stop()` → 声明消失 → 零残留 |
| 归属标记 `data-v3-injected` | 宿主清场据此认人 | **保留但已无代码读取**（宿主清场跳过锚点内部） |

**落点（4 个文件 + 测试）**

| 文件 | 行区间 | 做了什么 |
|---|---|---|
| `plugins/privhub-files-office2/client/index.js` | 全文件重写（96 → 118 行）；要点 `:40-52` 常量、`:58-63` 挂载点内 CSS、`:66-73` `frameUrl`、`:80-92` viewer 声明、`:94-111` 组件（`mounted` 注册 / `beforeUnmount` 注销） | 只声明「我能开 `.docx` / `.xlsx`」；`mount` 只往 `hostEl` 里放 iframe |
| `plugins/privhub-files-explorer-v3/client/panel.js` | `:20-42` 新增 `VIEWER_ON_STAGE_ACTIONS` + `layoutForAction`；`:47` data 增 `viewerLayout`；`:88-101` 重写 `contentClass`；`:206` `syncViewer` 写布局状态；`:748` 导出 `layoutForAction` | 宿主不再自带插件能力清单 |
| `plugins/privhub-files-explorer-v3/client/styles.js` | `:27-35` 新增 `.v3-content--viewer`（让位布局 + 隐藏自己的只读预览） | 让位布局回到宿主自己的样式里 |
| `privhub/tests/personal-ui.mjs` | F 段 ⑤、G 段、H 段（整段重写）、I 段、J6/J7 | 断言改写 + 新增（见下） |
| `frontend/index.html` | **一字未动** | 骨架仍只做容器与总线 |

**三个已由父级拍定的选择，照此执行**

1. **同类切换不声明 `update`**：旧写法「有 frame 就只换 `src`」会让浏览器在导航期间继续显示
   上一个文件已画好的画面（原始 bug 的次要触发点）。不声明 `update`，宿主走「先收后建」，
   两步在同一同步批次内完成，中间不给浏览器绘制机会。**不回退。**
2. **布局状态改为「谁上场谁给」**：迁前 `panel.js` 硬编码 `['.docx','.xlsx']`（宿主不知道插件能力，
   是残留耦合），规则本体却写在 office2 的 CSS 里（插件声称拥有别人的容器）。
   迁后宿主**读 viewer 会话的返回值**：`mount / update / reuse` ⇒ 内容区整块让给 viewer
   （`.v3-content--viewer`），`fallback / unmount / no-host / mount-error` ⇒ 普通布局、老路照跑。
   ⚠ 实现上刻意**没有**给声明加新字段（那等于扩契约，需另批授权）：布局只由「有没有 viewer 在场上」
   这一个事实上派生，注册表与会话模块 `viewers.js` **一个字节都没改**。
3. **测试断言同步改写**（父级已同意）：5 条盯 office2 老写法（`content.prepend(fresh)` /
   `fresh.dataset.v3Injected` / `clearOwnFrame` / 不复用旧 frame）的断言改为**行为向**；
   `KNOWN_INJECTORS` 白名单里的 office2 摘掉。

**CSS 归还领地**：office2 的样式全部收敛到自己挂载点上的选择器
（`.v3-viewer-host[data-viewer="privhub-files-office2"] …`）；按类名声称拥有内容区的
`.v3-content--office` / 全局 `iframe.office2-frame` 规则**整组删除**。

**新增/改写的断言**（`privhub/tests/personal-ui.mjs`，个人空间界面回归 125 → **153** 条）

- **F 段 ⑤**：office2 向契约登记（id / exts / priority）、**源码里不再出现 `.v3-content`**（先剥注释再判）、
  **加严一条：整个文件（含注释）grep 不到 `querySelector('.v3-content')`——0 命中**、
  声明里不写 `update`、`beforeUnmount` 调 `stop()`。
- **G 段**：注入者判据改为只看「以 `.v3-content` 为目标的注入写法」（删掉 `office2-frame` 那条会误报的兜底判据，
  判据①本来就覆盖 office2 迁前的写法）；新增「office2 已不在注入者名单里」；布局断言改为
  `.v3-content--viewer` + 「宿主不再硬编码扩展名清单」+ 「布局状态由会话返回值派生」+「contentClass 直读 viewerLayout」。
- **H 段（整段重写，跑 office2 真身）**：沙箱里真跑 `mounted()` 递名片；`mount` 只往挂载点里放 1 个 iframe、
  iframe 父节点就是挂载点、URL 三个参数正确编码、返回清理函数、**mount 全程没按 `.v3-content` 查过任何东西**
  （桩里给选择器留痕：实测查询 0 次）、卸载后节点与 DOM 断开、每次 mount 现造新节点、`beforeUnmount` 后声明消失。
- **I 段**：给 DOM 桩补 `closest()`，新增「锚点内部带标记的 viewer 被保留」——护住「宿主清场不误杀在岗 viewer」。
- **J6（新增）**：把 H 段跑出来的 **office2 真声明**注册进**真注册表**、喂给**真会话**，实测
  「打开 docx → 锚点出现 1 个 iframe」「docx→docx 换的是**新节点**」「切到 md → iframe 0 个、锚点为净」
  「切到 png → 回退老路」「插件注销 → 老路恢复」。
- **J7（新增）**：把 `panel.js` 的 `layoutForAction` 真身取出来跑，断「让位 / 不让位」两侧的映射。

**阴性对照（已做，做完逐项还原，SHA256 校验一致）**

| # | 去掉/改坏哪一环 | 真实输出 | 对照原始输出 |
|---|---|---|---|
| ① | office2 的 `mount` 改回「自己去认领 `.v3-content`」（`const content = document.querySelector('.v3-content'); content.prepend(frame)`） | `个人空间界面回归：139 通过 / 15 失败` —— ❌【要害】office2 源码里不再出现 .v3-content；❌【要害·加严】整个文件 grep 不到 querySelector(".v3-content")；❌ 多出注入者 office2；❌ office2 已不在注入者名单里；❌ mount 只往挂载点里放了 1 个 iframe（实测 0 个）；❌【要害】mount 全程没有按 .v3-content 查过任何东西（**实测查过：.v3-content**）；❌ 那个「别人的容器」一个节点都没多；❌ 打开 docx → 锚点出现 1 个 iframe（实测 0 个）等 | `docs/reviews/evidence-2026-09-17/_negative-control-office2-NC1.txt` |
| ② | 布局改回宿主硬编码 `['.docx','.xlsx']` 能力清单（`contentClass` + `viewerLayout` 两处一起回退） | `个人空间界面回归：149 通过 / 4 失败` —— ❌ office 专属的硬编码布局分支已彻底消失；❌ 宿主源码里不再硬编码扩展名能力清单；❌ 布局状态由 viewer 会话的返回值派生；❌ contentClass 直接读 viewerLayout | `docs/reviews/evidence-2026-09-17/_negative-control-office2-NC2.txt` |

> 对照②的一个如实说明：J7 是**孤立地**测 `layoutForAction` 这个映射函数，把调用点改坏时它不会红；
> 把它钉在实现上的是 G 段那条 `this.viewerLayout = layoutForAction(res.action)`（对照②里红了）。

**回归对照**：`cd privhub && node tests/run-all.mjs --spawn` 改动前后**失败清单均为空、逐条同名**
（0 条失败）；个人空间界面回归 **125 → 153**（增量全部是本次新增/改写的断言）。
改动前基线 `docs/reviews/evidence-2026-09-17/_baseline-office2.txt`、改动后 `docs/reviews/evidence-2026-09-17/_after-office2.txt`。
契约模块 `viewers.js`、骨架 `frontend/index.html`、manifest、插槽、打包链**均未改动**；
`data/` 与 `data-files/` 只读。

**[未实测·如实标注]** **「同类切换不露旧画面」的肉眼观感，本批同样证明不了**：Node 里没有浏览器、
没有合成层，桩里也只有节点树。本批能证的是「换的是新节点、中间没有第二次挂载、锚点里同一时刻只有 1 个 iframe」，
**证不了「用户眼睛看不到闪」**。另有一条**只能实机看**的风险：office2 的 iframe 从「内容区的直接子节点」
搬进了挂载点，尺寸链变成 `.v3-content--viewer`(flex 列) → `.v3-viewer-host`(flex 行) → iframe，
**这套 flex 尺寸在真实浏览器里的表现（有没有 1px 白边、有没有高度塌陷）我没有浏览器，验不了**，
必须由主子按 `docs/reviews/10-内容区所有权与docx残留-方案.md` §9.1 的步骤 1~8 手工过一遍。

**本批没有做的事（边界）**：不迁移 `edit-md`（c 批）、不动 `comments`（d 批）；
不改交互结构、不新增界面入口、不改布局；不动 manifest / 插槽 / 打包链；**未做 git commit / push / stash**；
版本号仍为 3.1.1（本轮条目追加在 3.1.1 段内）。

---

### 结构契约 · 第二步 c：edit-md 迁到「编辑舱位」契约（并把「丢内容」那条路堵死）

**动机**：第二步 a 立了 viewer 契约、b 批把 office2 迁走之后，剩下最刺眼的一家是
`privhub-files-edit-md`：它有**四处**伸手进宿主的内容区 —— 查别人的容器判断「能不能内嵌」、
隐藏别人的只读预览、清理别人的节点、`<teleport to=".v3-content">` 把自己整块编辑器塞进别人的容器。
更要紧的是 b 批查出来的**一条可能丢内容的路**：切标签时的静默保存是异步的
（`void this.save().finally(() => { this.open = false })`），**「保存意图」在前、「保存完成」可能落在
编辑器卸载之后**，而现有顺序准绳只保证**意图**不倒挂。本批两件事一起做：
**迁到宿主给的编辑舱位** + **把「数据在卸载前已被捕获并发出保存」变成可断言的事实**。

**一、编辑舱位（第二步 3b）：宿主再给一块地，编辑器不再伸手**

| 项 | 迁前 | 迁后 |
|---|---|---|
| 能不能内嵌 | 插件 `document.querySelector('.v3-content')` —— 拿「别人的容器在不在」当判据 | 插件经 bus 问宿主（`v3:editor-host-ask`），宿主**同步**答 `v3:editor-host { available, key, selector }` |
| 判据本身 | 别人的 DOM 非空 ⇒ 可内嵌（内容区显示 A、却给 B 开编辑器也判「可以」，编辑器就贴到别人的画面上） | 宿主**自己的状态**：内容区在 **且** 承载的正是这个文件（`contentLiveKey()`）——一次都不查 DOM |
| 编辑器落点 | `<teleport to=".v3-content">`（成为别人容器的子节点） | `<teleport to=".v3-editor-host">`（宿主创建/销毁的**编辑舱位**，与 viewer 的 `.v3-viewer-host` 分开：编辑态不是某个 viewer 的能力） |
| 隐藏只读预览 | 插件去写别人的 `.v3-md` / `.v3-text` 的内联 `display`，退出时再还原 | 宿主自己的编辑态布局负责（`.v3-content--editor .v3-md { display:none }`） |
| 退出编辑 | 插件 `querySelectorAll('.md-inline-root').remove()` 自己摘别人的节点 | Vue 拆 teleport 即收干净；插件只报「编辑态已关」（`v3:editor-state`） |
| 布局状态（3a） | 宿主 CSS `.v3-content:has(.md-inline-root)` —— 按**别人的后代**反查自己的布局 | 宿主响应式 data `editorLayout`（插件经 bus 报开/关）→ `.v3-content--editor`；`:has(` 在宿主样式里归零 |
| 舱位消失 | 没有这个概念：编辑器会攥着已销毁的目标（再打开同一文件时「编辑器打不开、正文还在里面」） | 宿主推 `v3:editor-host { available:false }` 请插件退场 —— 退场前照样先捕获、先发出保存 |

**二、丢内容那条路（本批第一优先）**

`md:interrupt` 的处理顺序钉成六步，**全部同步**到「请求已上网络」为止：

> ① 同步捕获快照（正文 + 文件身份 + 基线 mtime + 会话号）→ ② 记流水 `save-capture`
> → ③ **同步发出保存**（async 函数体在第一个 `await` 之前是同步执行的）
> → ④ 报编辑态已关 → ⑤ `open=false`（Vue 下一帧才真拆）→ ⑥ 记流水 `editor-close`。

- **为什么不等保存回包再卸**：数据已经捕获、请求已经在网上，等回包只会让编辑器多挂一帧 ——
  而这一帧里内容区已经换成了别的文件（等于把 A 的编辑器贴到 B 的画面上）。
- **凭什么说不会丢**：捕获与 PUT 都在**同一个同步块**内完成，且都排在 `open=false` 之前；
  这不是只写在注释里 —— 捕获与退场都记进宿主的顺序流水（`viewers.lifecycle`），
  测试直接断「**捕获早于退场**」并配阴性对照（把保存挪到卸载之后 → 三条断言当场变红）。
- **顺手堵掉一条更凶的静默丢字**（b 批未发现，本批实测复现）：切到 B 之后，A 的保存回包若写回组件状态，
  编辑器里就变成 **A 的正文 + B 的路径**，下一次保存把 A 的内容写进 B 的文件。
  现在回包只写给「发起它的那一轮编辑」（会话号闸 `_session`），并加了兜底：
  绕开中断入口直接开另一个文件时，先把上一轮捕获并存掉再开新的。
- **失败不静默**：静默路径（编辑器随即关闭、状态行没人看得见）的保存失败与「冲突取消」会 toast 告警。
- **三条不许**（逐条守住）：不给宿主 watcher 加 `flush:'sync'`；不把中断处理挪进 `$nextTick`/`setTimeout`；
  不把 `confirm()` 带进静默保存路径（唯一带 confirm 的退场入口仍是「✕ 只读」按钮）。

**三、落点**

| 文件 | 做了什么 |
|---|---|
| `plugins/privhub-files-explorer-v3/client/panel.js` | 新增编辑舱位：`EDITOR_SELECTOR` + `contentLiveKey / editorHostInfo / syncEditorHost / setEditorLayout / noteEditorLifecycle`、`data.editorLayout`、`contentClass` 派生、模板里的 `.v3-editor-host`、`mounted/beforeUnmount` 的三条接线 |
| `plugins/privhub-files-explorer-v3/client/styles.js` | `:has(.md-inline-root)` 四条 → `.v3-content--editor`；**并修掉一个「整块打不开」的语法错**（见下） |
| `plugins/privhub-files-edit-md/client/index.js` | 契约助手（ask / 记流水）+ 快照保存 + `leaveInline` 六步 + 舱位消失退场 + teleport 换目标 |
| `privhub/tests/personal-ui.mjs` | G 段改写（`:has` 归零、edit-md 移出注入者名单）+ 新增 K 段 + 新增 L 段 |
| `frontend/index.html`、`viewers.js`、manifest、插槽、打包链 | **均未改动**（编辑舱位不进 viewer 契约，它是宿主的第二个锚点） |

**四、⚠ 一并修掉的既有缺陷：整套 explorer-v3 前端当时是打不开的**

第二步 b 在 `styles.js` 的 **CSS 模板串**里留了一对反引号（在注释里写 CSS 类名时带了反引号），
模板串当场被结束 ⇒ **该模块解析失败** ⇒ `import './styles.js'` 拉垮 explorer-v3 的整条前端装配
（`panel` / `tree` / `preview` 三个插槽全在它身上）⇒ **主界面整块打不开**。
当时的 462 条断言**全绿**：没有任何一条会去解析这些文件。本批**已修**（CSS 注释里不再用反引号），
并新增 **L 段「前端模块语法体检」**：剥掉 import/export 后逐个解析 **65 个**插件前端文件，
这类「整块打不开」的语法错今后当场拦住（阴性对照见下）。

**五、断言（个人空间界面回归 153 → 215）**

- **K1 源码级（20 条）**：edit-md 里**不得再出现**宿主的容器（剥注释 0 命中）；
  **加严两条**：整个文件（含注释）grep 不到 `querySelector(".v3-content")`、
  也 grep 不到 `teleport to=".v3-content"`（各 0 命中）；teleport 目标是 `.v3-editor-host`；
  不再从整个 document 查任何东西；不再按类名隐藏宿主的 `.v3-md`/`.v3-text`；
  「能不能内嵌」由宿主经 bus 作答且判据取自宿主自己的状态；宿主模板创建/销毁舱位；
  `editorLayout` 写进响应式 data、`contentClass` 由它派生；宿主样式 `:has(` 归零；
  顺序流水用 `viewers.lifecycle` 那一份；编辑舱位**不进** `viewers.js` 契约。
- **K2 行为级（跑真身，同一条沙箱）**：`edit-md` 真身 + `panel.js` 六个真身方法 +
  **真的 `viewers.js` 注册表** + 宿主 relay 全放进一个 vm 沙箱，驱动真实的 `md:interrupt`：
  内嵌可用 → 切标签时**实测顺序**为
  `save-intent → save-capture → PUT → open=false → editor-close`（捕获/保存都早于退场）；
  流水号递增可复核；PUT 的 path 与正文取自快照；退场后布局状态归位；
  上一轮回包落在下一轮编辑之后**不污染**新一轮（正文/基线/脏标记都不被改写）；
  舱位被收走时先捕获保存再退场；「回答问题」不误关编辑器；静默失败有 toast。
- **K2-6 宿主的「要害」判据**：舱位在、但内容区显示的是**别的文件** ⇒ 答 `available:false`
  （旧判据在这里会给 true —— 这正是编辑器贴错画面的那条路）。
- **G 段**：`KNOWN_INJECTORS` 白名单只剩 d 批待迁的 `comments`（**注入者从 4 家收到 1 家**）；
  新增「edit-md 已不在注入者名单里」；宿主样式 `:has` 断言由「保留」改为「归零」。
- **L 段（2 条）**：65 个前端模块逐个解析通过。

**阴性对照（已做，做完逐项还原，SHA256 校验一致）**

| # | 改坏哪一环 | 真实输出 | 对照文件 |
|---|---|---|---|
| ① | edit-md 改回「查别人的容器 + teleport 到别人的容器」（`document.querySelector('.v3-content')` / `to=".v3-content"`） | `个人空间界面回归：181 通过 / 14 失败` —— ❌ 要害：teleport 目标不是舱位；❌ 要害：代码里仍在认领别人的容器；❌ 加严两条（含注释 0 命中）变红；❌ 不再从整个文档查任何东西；❌ 打开 md 没进内嵌编辑态（实测 mode 落到浮层）；❌ 捕获/保存/退场的整条流水缺失…… | `docs/reviews/evidence-2026-09-17/_negative-control-editmd-NC1.txt` |
| ② | 把「捕获 + 发出保存」挪到 `open=false` **之后**（先卸后存） | `212 通过 / 3 失败` —— ❌【第一优先·丢内容】实测顺序 `open=false → api:PUT`；❌ 流水 kind 顺序 `save-intent → editor-close → save-capture`；❌ 流水号捕获 seq=3、退场 seq=2（倒挂） | `docs/reviews/evidence-2026-09-17/_negative-control-editmd-NC2.txt` |
| ③ | 拆掉会话闸（`mine()` 恒真，回包无条件写回） | `212 通过 / 3 失败` —— ❌ 上一轮回包把 **A 的正文**写进了正在编辑 B 的编辑器（实测 `doc="---\ntitle: a\n...\n# A v2 又改了"`、`path=b.md`、`baseMtime=999`、`dirty=false`）；❌ 脏标记被清；❌ 静默失败不再告警 | `docs/reviews/evidence-2026-09-17/_negative-control-editmd-NC3.txt` |

**回归对照**：`cd privhub && node tests/run-all.mjs --spawn` 改动前后**失败清单均为空、逐条同名**
（0 条失败）；九套断言 86 / 12 / 76 / **215** / 16 / 50 / 3 / 27 / 39。
改动前基线 `docs/reviews/evidence-2026-09-17/_baseline-editmd.txt`、改动后 `docs/reviews/evidence-2026-09-17/_after-editmd.txt`。
`data/` 与 `data-files/` 只读；**未做 git commit / push / stash**；版本号仍为 3.1.1（条目追加在 3.1.1 段内）。

**[未实测·如实标注]** **浏览器里的事一件都没验**：`teleport` 是否真的把编辑器挂进了舱位、
光标位置、`Ctrl+S` 手感、**编辑区滚动同步到预览区**（顺带说明：这段 `syncScroll()` 走的是
`this.$el.querySelector('textarea.md-src')`，而 teleport 出去的节点**不在 `$el` 子树里**，
我判断它一直是静默失效的 —— **没有浏览器，我证不了**，也没在本次改动它）、
`.v3-content--editor` 那套 flex 尺寸在真实浏览器里的表现（有没有塌陷/白边）。
这些必须由主子按 `docs/reviews/10-内容区所有权与docx残留-方案.md` §9.1 手工过一遍。

**本批没有做的事（边界）**：不动 `comments`（d 批）；不改交互结构、不新增界面入口、不改布局；
不动 manifest / 插槽 / 打包链。

---

### 结构契约 · 第二步 d：comments 迁到「宿主交渲染根」，**跨插件 DOM 认领归零**

**动机**：第二步 a 立 viewer 契约、b 批把 `office2` 迁走、c 批把 `edit-md` 迁到编辑舱位之后，
全仓还剩**最后一处跨插件 DOM 认领**——`privhub-files-comments` 干了两件越权的事：

| 项 | 迁前 | 问题 |
|---|---|---|
| 找渲染根 | `:112` `document.querySelector('.v3-content .v3-md')` | 自己去**别人的容器**里按类名找渲染根 |
| 盯渲染根 | `:119-123` `new MutationObserver(...)` + `observe(el, { childList, subtree, characterData })` | 靠**盯着别人的 DOM 变了**来重建批注锚点 |

**迁后：宿主在渲染完成时把渲染根的节点引用直接交出去，插件不再自己查、也不再盯**

| 项 | 迁后 |
|---|---|
| 节点从哪来 | 宿主内容区模板里那个 `ref="mdRoot"` 的 div —— **宿主自己的节点**（不查别人的、不新建） |
| 什么时候交 | `panel.js` 的 `noticeMdRoot()` 在 **`$nextTick`**（= Vue 渲染完成、`v-html` 已换过内容的确切时点）发出 `bus 'v3:md-root'`，payload `{ el, project, key, reason }` |
| 什么时候收 | 没有 md 渲染根时（loading / error / text / 图片 / PDF / 内容区整体消失 / 换文件）发 **`el: null`**，插件据此清锚点并**放弃旧引用** |
| 插件的落点 | 全部 DOM 动作只发生在**交来的那个节点内部**（挂 `mark.v3-cmt` / 清锚点），不再碰 `el` 之外的任何东西 |
| 旧事件 | **`v3:md-rendered` 作废**：它原来由 `content.js` 发在 `store.content` 赋值之后、**Vue 渲染之前** —— 那一刻新节点根本不存在，监听方只能看到上一次渲染的旧节点（这正是「锚点认错根」的由来）。两发都删了，全仓 emit/on 各 1 处换成了 `v3:md-root` |

**顺带堵掉一条真实的「旧锚点残留」路径（本批实测复现）**：迁前 `_render()` 是
`if (el && this.comments.length)` —— **切换到的文件没有评论时它什么都不做**。而"根已换、取数还在路上"的那一帧里，
面板里可能还挂着上一个文件的数据，那一次渲染就会把**上一个文件的锚点画进新根**，随后"评论为空"又不会去清。
现在改成「**有根就清、有评论就画**」（`_render()` 只判根在不在；`renderMarks` 接受空数组 = 清空）。
断言：M3 的「b.md 没有评论 → 新根里 0 个锚点」；阴性对照 NC2 之外的那条路也一并覆盖。

**收尾核查（本批第二个价值）**

| 核查项 | 结果 |
|---|---|
| `KNOWN_INJECTORS` 白名单 | **收敛为空数组**；两条守它的断言（「没有冒出来的新注入者」/「除已知注入者外…」）保持绿，并新增一条「注入者集合与白名单**同时**为空」 |
| 6 个「只读引用者」逐个核 | `office-ui`(1 文件) / `dataview`(2) / `mdpage`(1) / `versions`(1) / `publish`(1) / `invite`(1) —— **全部干净**（既不查宿主内容区、也不往里写）；每家一条独立断言，将来谁变脏一眼看出是哪家 |
| 图片 / PDF | 宿主自己的 `img.v3-img` / `iframe.v3-pdf` 分支是**宿主亲儿子**，不迁移；断言「没有任何插件去查 `.v3-img` / `.v3-pdf`」（实测 0 家） |
| 两个舱位 + 两个状态类 | `.v3-viewer-host`（viewer 的地界）与 `.v3-editor-host`（编辑态的地界）**都没被复用**；`--viewer` / `--editor` 两个状态类也不复用；两个舱位各自仍只被它的正主使用（office2 / edit-md） |
| 骨架 `frontend/index.html` | **一字未动**（不新增插槽、不改布局、不动图标栏） |

**落点**

| 文件 | 做了什么 |
|---|---|
| `plugins/privhub-files-explorer-v3/client/panel.js` | 新增渲染根交接：模板两个 md 分支挂 `ref="mdRoot"`、`mdRootOf()` 单一出口、`contentKeyOf()`、`noticeMdRoot()`（在 `$nextTick` 里发 `v3:md-root`）、两个内容切换 watcher 都接到它 |
| `plugins/privhub-files-explorer-v3/client/content.js` | 删掉两处 `emit('v3:md-rendered')`（含末尾那一发），改成讲清来历的注释 |
| `plugins/privhub-files-comments/client/index.js` | 删掉 `document.querySelector('.v3-content .v3-md')` 与 `MutationObserver`；改为 `data.mdRoot` + `mdEl()` 只读它 + `onMdRoot(p)` + `watch.mdRoot`；`_render()` 改成「有根就清、有评论就画」 |
| `privhub/tests/personal-ui.mjs` | G 段白名单收敛为空 + 新增「归零」断言；新增 **M 段**（22 条）；K/J 两条 watcher 正则放宽以容纳新增的 `(n)` 形参；L 段编号顺延为 14 |
| `docs/reviews/08-连线契约.md` | §4.1 事件表加 `v3:md-root`（并注明 `v3:md-rendered` 过时）；§5.3 加 d 批增量（3 家「真 querySelector 别家容器」全部归零） |
| `frontend/index.html`、`viewers.js`、manifest、插槽、打包链 | **均未改动**（本批不扩 viewer 契约形状：渲染根交接是宿主的第二个「交出节点引用」的用法，不进 `viewers.js`） |

**断言（个人空间界面回归 215 → 258）**

- **M1 源码级（16 条）**：comments 里 0 处 `.v3-content` / 0 处按类名查 `.v3-md`/`.v3-text`
  （**先剥注释**，再拿原始源码加严一条）；不再 `document.querySelector` 任何东西；
  **0 处 `MutationObserver`**；锚点根是 `data.mdRoot`（不是 computed 现查）；
  宿主侧：模板 2 处 `ref="mdRoot"`、`mdRootOf()` 单一出口、`noticeMdRoot()` 在 `$nextTick` 里、
  payload 就是节点引用、两个切换入口都走到它、`content.js` 两发旧事件已删。
- **M2 收尾核查（11 条）**：6 个只读引用者逐个 + 图片/PDF 归属 + 舱位/状态类不复用 + 两个舱位正主未变。
- **M3 行为级（7 条，跑 comments 真身）**：最小 DOM 桩里建**真树**（真子树遍历 + 按 Range 规范实现
  `extractContents/insertNode`），驱动真 `bus`：宿主发根 → **锚点出现且落在正确字符偏移上**
  （start=2/end=5 → 实测文本 `"cde"`）；宿主收根（`el:null`，换文件）→ 插件放弃旧引用、
  **旧节点不再被写**；新文件无评论 → **新根 0 个锚点**；切回 → 在**新节点**里重建；
  `beforeUnmount` 摘掉两条线、不再持有根引用。

**阴性对照（已做，做完逐项还原，SHA256 校验一致）**

| # | 改坏哪一环 | 真实输出 | 对照文件 |
|---|---|---|---|
| ① | comments 改回**自己查别人的容器**（`mdEl(){ return document.querySelector('.v3-content .v3-md') }`） | `254 通过 / 4 失败` —— ❌【要害】代码里不再出现 `.v3-content`（剥注释后 0 命中）；❌【要害·加严】整个文件（含注释）0 命中；❌ 不再从整个 document 查任何东西；❌ 锚点根改成宿主交进来的引用 | `docs/reviews/evidence-2026-09-17/_negative-control-comments-NC1.txt` |
| ② | 把那个 `MutationObserver` 加回去（盯别人的 DOM） | `256 通过 / 2 失败` —— ❌【要害·本批的第二个要害】剥注释后仍有 `MutationObserver` 命中；❌ 根被收回（el 为 null）时不渲染 | `docs/reviews/evidence-2026-09-17/_negative-control-comments-NC2.txt` |
| ③ | 宿主不再等渲染完成（把 `noticeMdRoot` 从 `$nextTick` 里挪出来，发在渲染**之前**） | `257 通过 / 1 失败` —— ❌ 宿主在 `$nextTick` 之后才发根（实测发早了）—— 这正是迁前 `v3:md-rendered` 的病根 | `docs/reviews/evidence-2026-09-17/_negative-control-comments-NC3.txt` |

> 阴性对照②的第一版**当场崩**在 `ReferenceError: MutationObserver is not defined`（沙箱里没有这个全局）——
> 那本身也是一条证据（新代码路径里它确实一次都不需要），但**崩掉就测不出行为**，
> 所以在沙箱里补了一个 observer 桩，让"改回去"能跑完并**看见后果**（上面这两条红）。

**回归对照**：`cd privhub && node tests/run-all.mjs --spawn` 改动前后**失败清单均为空、逐条同名**
（0 条失败）；九套断言 86 / 12 / 76 / **258** / 16 / 50 / 3 / 27 / 39。
改动前基线 `docs/reviews/evidence-2026-09-17/_baseline-comments.txt`、改动后 `docs/reviews/evidence-2026-09-17/_after-comments.txt`；
开工前的跨插件认领现状快照 `docs/reviews/evidence-2026-09-17/_d-before-scan.txt`。
`data/` 与 `data-files/` 只读；**未做 git commit / push / stash**；版本号仍为 3.1.1（条目追加在 3.1.1 段内）。

**[未实测·如实标注]** **浏览器里的事一件都没验**（本批尤其要紧，因为改的正是"渲染完成后"的时序）：
① 批注高亮的**视觉位置与观感**（`mark.v3-cmt` 的底色/边框、跨段落锚点的观感）；
② `$nextTick` 这个时点在真实浏览器里是否**每一次**都落在 `v-html` patch 之后
（代码顺序上成立，但**没有实测**）；③ 选区浮动按钮的定位（`getBoundingClientRect` + `html zoom` 换算）
在真机上的表现；④ 「选中文字 → 💬 评论 → 提交」这条交互全链路。
这四条**必须由主子按 `docs/reviews/10-内容区所有权与docx残留-方案.md` §9.1 手工过一遍**。

**[残留尾巴·如实标注]** ① 契约里 `v3:md-root` 是**宿主的第二个"交出节点引用"用法**，
`viewers.js` 里没有它的位置（本批不扩契约形状，故未动）；若将来第三个插件也要渲染根，
应当**先定形状再动手**（这是已知的设计欠账）。② `shell-agent-console` 仍在自己模板里
借宿主的 `class="v3-loading"` 样式——**只掉样式、不掉功能**，不算认领容器，本批未动。
③ `08-连线契约.md` §5.3 与 §4.1 里被本批改写成历史的那几行是**留档不改**的，反查以增量段为准。

### 布局修复 · 非文本文件（图片 / PDF）铺满内容区 + 格式支持矩阵实测（同批两件）

**动机（用户原话）**：「除了直接在中间栏阅读的文件，其他格式的能打开的文件的**背景和背景大小别做限制，给 100%**……
**现在分好几层，大小还有的格式有限制**」；另：「**有些文件无法打开**，这个应该是格式兼容性有关」。

#### 一、铺满修复（只改宿主 explorer-v3，插件与契约零改动）

| # | 迁前（病因，带行号） | 迁后 |
|---|---|---|
| ① | `styles.js:26` `.v3-content { padding:16px 22px }` ⇒ 图片/PDF 四周留白（"分好几层"的中间那层） | 铺满形态下 `padding:0`（`styles.js:50`） |
| ② | `styles.js:87` `.v3-pdf { height:calc(100vh - 260px); border:1px solid; border-radius:8px }` —— 写死"视口高度减常数"、与实际 chrome 高度无关，边框圆角等于给 PDF 套相框 | `styles.js:116` `width:100%; height:100%; border:0; display:block` + `styles.js:53` `flex:1 1 auto; min-height:0`（高度整个交给容器） |
| ③ | `styles.js:86` `.v3-img { max-width:100%; border-radius:8px }` —— 只限宽不给高、加装饰圆角 | `styles.js:109` `max-width:100%; max-height:100%`（不超出、不拉伸、居中；可点开放大照旧） |
| ④ | `panel.js:709` 图片外层是内联 `style="text-align:center"` 的裸 div | `panel.js:766` 改宿主自己的类 `class="v3-img-wrap"`（**仍是宿主自己的节点**） |

**实现路线＝与第二步 b/c 同一范式**：**状态写进宿主自己的响应式 data**（`panel.js:142` 的 `fillLayout`）→
由**宿主自己派生**（`panel.js:78-81` 纯函数 `fillStateFor`、`panel.js:323-326` `syncFillLayout()`、
在 `syncViewer()` 末尾调用——顺序有意义：判据之一是"没有 viewer 在场"）→ **规则写在宿主自己的样式里**
（`styles.js:36-53` 的 `.v3-content--fill`）。**插件不参与、无新增跨插件 DOM 认领、`viewers.js` 契约形状一字节未动、骨架一字未动。**

**判据**（全取自宿主自己的状态，不查 DOM）：内容区在场且承载的正是当前标签 + `state==='ready'` 且**拿到原始字节 url**
+ 当前没有 viewer 在场上（真有插件认领同一扩展名时以插件为准，两者互斥）。
**刻意不按扩展名/kind 判**——依据是本次实测：`.ico` 被后端认成 image（`privhub-core/src/index.ts:769`）而前端 `kindOf` 的图片清单没有它
（`utils.js:11`），于是它 kind=text、模板走的是 **iframe 分支**；按 kind 判会漏掉这个形态。
**明确不动的**：`.v3-md { max-width:900px }`（`styles.js:93`）是**有意**为阅读舒适设的，用户说的是"除了直接阅读的文件"，一字未改。

**新增 21 条常驻断言**（`tests/personal-ui.mjs:1562-1667`，第 12b 段）：跑 `panel.js` **真身**（`fillStateFor` + `contentClass` 切进 vm 执行）
+ 样式层（写死高度与装饰边框真的消失、阅读排版未动）+ 模板层（外层改类、lightbox 未坏），含"**不许误伤**"三条（md / 纯文本 / `.v3-md` 阅读宽度）。

**阴性对照（已做，做完逐项还原、两个文件哈希一致）**

| # | 改坏哪一环 | 真实输出 |
|---|---|---|
| ① | 把派生改回去（`contentClass` 里那半行停掉） | `276 通过 / 2 失败` —— ❌【判据】图片（ready+url）→ 类含 v3-content--fill；❌【判据】PDF → 同上 |
| ② | 把样式改回去（`.v3-pdf` 恢复 `calc(100vh - 260px)` + 边框圆角） | `276 通过 / 2 失败` —— ❌【样式】写死高度已消失；❌【样式】PDF 三件装饰/限制已从基础规则去掉 |
| 还原后 | — | `279 通过 / 0 失败`（`panel.js` 29B9525…、`styles.js` 2040D4E… 与改前一致） |

#### 二、格式支持矩阵（**真文件实测**，不是读代码猜）

新增一次性探针 `tests/format-matrix.mjs`（**不在** `run-all.mjs` 清单里，不拖慢常规回归）：
自带隔离实例（根 `tests/.matrixroot`、端口 **3193**，**硬拒 3180/3181**，不碰真实 `data/`、`data-files/`），
现场生成 **63 个真样本**（`docx`/`exceljs`/`pptxgenjs`/`pdfkit`/`jszip` 生成 + 手工造 + 3 个真身样本：mammoth 的 docx、
pdf-parse 的 pdf、jpeg-exif 的**真 TIFF**），全部经 `/api/upload` 真实入库，再逐条驱动
`/api/list`、`/api/preview`、`/api/preview-raw`、`/api/office/read`、`/api/office-preview`、`/api/office2/raw`；
**"前端会显示什么"不靠猜**：把前端真身（`utils.js` 的 `kindOf` + `content.js` 的 `loadContent`）装进 vm，
`api` 桩逐字对齐骨架 `frontend/index.html:364-385` 打真 HTTP。
产物：`docs/reviews/evidence-2026-09-17/_matrix-format.txt`（63 行全表）与 `_matrix-format.json`；分析报告 `docs/reviews/11-格式支持矩阵与铺满修复.md`。

**实测结论**：✅能开 **29** ／ ⚠️降级 **4**／ ❌打不开 **30**。三条实测发现：

1. **`OFFICE_EXTS` 根本没有 `.xls` / `.ppt`**（`privhub-svc-office/src/index.ts:22`）⇒ 两者一律报「不支持的 Office 类型」，界面只给一行错误。
2. **`.doc` 解析失败却返回 `ok:true`**，界面把**兜底提示句**当正文显示（实测两例：提取正文 42 字＝
   「[无法提取 DOC 文本]（请用 Word/WPS 打开后另存为 docx 再上传）」）；且**本机 `python.exe` 只是 Microsoft Store 的占位别名**，
   `office-lib.mjs:31-66` 的第三级 Python 兜底在这台机器上**永远不会工作**——这就是用户数据里那 41 个 `.doc` 全都打不开的机制。
3. **`.ico` 前后端两张图片清单不一致**（见上），图片走了 iframe 分支 ⇒ 没有点击放大（修法是一行，本批未改：属格式能力改动，不属布局改动）。

**与真实语料对照【实证·只读扫一遍，未读任何内容】**：真实 `data-files/` 共 536 个文件 / 16.3 MB，**只有 8 种扩展名**
（`.txt` 228 / `.md` 196 / **`.doc` 42** / `.docx` 24 / `.xlsx` 23 / `.html` 21 / `.pdf` 1 / `.pptx` 1）
⇒ 矩阵里那 30 条 ❌ **绝大多数还没出现在真实语料里**；真正会撞到的是 `.doc`（41 个测试文件 + 1 个真文档）、
`.html`（只出源码）与 `.pptx`（只出文本）。

**可补的库（体积与许可证为实测值）**：本轮给出候选对比表（fflate 33,044 B/MIT、utif 58,271 B/MIT、
postal-mime/MIT-0、zip.js 166,445 B/BSD-3、epubjs 223,875 B/BSD-2、pptx-preview 137,080 B/ISC、
heic2any 1,351,840 B/MIT 但内含 libheif 上游 **LGPL-3.0**、libarchive.js 1.0MB wasm 覆盖 7z/rar、
pdfjs-dist 34.8MB）与**性价比排序**：先做 **① 收敛并补齐纯文本白名单（0 字节，消掉 14 条 ❌）
② 音视频走原生标签（0 字节，复用本轮刚立的铺满形态）③ fflate 做容器类预览（33KB，覆盖 zip/odt/ods/epub）**。
**不建议做**：自建 pdf.js 阅读器（浏览器内置查看器零字节）、为 pptx 重打 10.5MB Univer bundle（等于引入构建链）、
`.ppt` 真渲染（生态里没有可用 JS 渲染器）、7z/rar（wasm + 许可）、HEIC（LGPL 链）、给 `.html`/`.svg` 解禁脚本（安全议题）。

**回归对照**：`cd privhub && node tests/run-all.mjs --spawn` 改动前后**失败清单均为空、逐条同名**（0 条失败）；
九套断言 86 / 12 / 76 / **258 → 279**（+21 为本批新增断言）/ 16 / 50 / 3 / 27 / 39。
基线 `docs/reviews/evidence-2026-09-17/_baseline-fill.txt`、收工 `docs/reviews/evidence-2026-09-17/_after-fill.txt`。
⚠️ **退出码口径**：用 `2>&1 | Tee-Object` 写法时 PowerShell 会把服务端 stderr（两条已知告警）算成 `NativeCommandError`，
`$LASTEXITCODE` 会报 1 —— **不是测试失败**；用 `*> 文件` 写法实测 `run-all` 本体 **exit=0**。
`data/` 与 `data-files/` 只读（仅扫过扩展名分布）；**未做 git commit / push / stash**；版本号仍为 3.1.1（条目追加在 3.1.1 段内）。

**[未实测·如实标注]** **浏览器里的事一件都没验**（仓库里没有任何浏览器测试），必须由主子实机过一遍：
① 图片在竖图/横图/超宽图/超长图下的"居中且不超出"；② **PDF 在真机上的高度**——浏览器内置阅读器在受限 iframe 里
是否正好铺满、内外滚动条是否打架、`overflow:hidden` 会不会裁掉自带工具条；③ 深色主题下"白页 + 深色留白"的观感；
④ 切换瞬间是否有一帧布局跳动；⑤ lightbox 与新尺寸规则是否互相干扰。
另：真实 `data-files/` 里的 42 个 `.doc` **全部是密文（PHENC1，已核）**，换密钥后搬进隔离实例读不出来，
且本批**故意没有解密真实数据** ⇒ "真 .doc 能出正文"是**【推断】**（依据是代码路径 `office-lib.mjs:31-37`），不是实测。

---

### 缺陷修复 · 纯文本扩展名白名单「一处定义 + 各处显式派生」并补齐 11 条（消掉矩阵 A 类 ❌）

**动机**：上一批（本段内「格式支持矩阵」）把一个病查清楚了 —— 同一个「纯文本扩展名」概念
**全仓至少 7 份各写各的，且已经不一致**：`.markdown` 在 fulltext/rag 有、**preview 没有**；
`.toml/.htm/.java/.c/.cpp` 在 preview 有、**versions 没有**；`ico` 在后端图片清单里有、前端 `kindOf` 里没有。
后果就是用户看到的那批「明明是纯文本却打不开」。

| 项 | 内容 |
|---|---|
| **一处定义** | 新增 `privhub/plugins/privhub-core/src/file-exts.ts`：基础集合 `TEXT_EXTS` / `IMAGE_EXTS` / `MARKDOWN_EXTS` / `OFFICE_EXTS` 只在这里写一次；判定入口 `kindOfExt` / `isPreviewTextExt` / `isImageExt` / `extOfName` 也在这里 |
| **显式派生**（**不合并成一个大集合**，因为各用途语义不同） | 预览 `PREVIEW_TEXT_EXTS` = 基础 ∪ 可编辑；**索引/快照** `VERSION_TEXT_EXTS` = 预览 − 配置族 `.env`；**向量化** `RAG_TEXT_EXTS` = 预览 −（`.env` ∪ `.jsonl/.tsv/.ipynb`）；**智能体读写** = `TEXT_EXTS − SENSITIVE_EXTS`（敏感族自己的清单仍在 `files-agent` 内）；**智能体覆盖前快照** = `AGENT_SNAPSHOT_EXTS`（= 可编辑集，与迁前 17 项手写清单只差 `html`，**不扩权**） |
| **前端** | 浏览器取不到 `plugins/privhub-core/src/`（静态映射只到 `client/`），且 `tests/integrity.mjs` 既有硬断言要求插件 client 模块**只引用同目录文件** ⇒ 前端是「**每侧一份单点定义 + 一致性由断言钉住**」：`explorer-v3/client/utils.js` 的 `EXT`（唯一出处）与 `edit-md/client/index.js` 的 `EDITABLE_TEXT_EXTS`，两者与后端取值**逐项同值**由断言守着（详见 `file-exts.ts` 的「前端怎么办」一节） |
| **补齐（本批该补的 11 条）** | `tsx` `ps1` `conf` `vue` `go` `rs` `env` `jsonl` `tsv` `markdown` `ipynb` —— 全部进【预览】。矩阵里它们原本一律走 `type=unknown`、界面显示「该文件类型不支持在线查看」 |
| **同时收敛的 `.ico` 不一致** | 图片清单前后端现为同一份取值：`.ico` 的界面 `kind` 从 `text`（走 iframe、无放大）变成 `image`（走 `img`、放大可用）；`privhub-files` 的 `preview-raw` mime 表与 `IMAGE_EXTS` 加了一条**集合相等**断言（漏一个即红） |
| **顺手收敛的前端 Office 清单** | `panel.js` 的 `isOfficeFile` 与 `ops.js` 的右键编辑分支原本各写一串 Office 扩展名（含后端并不支持的 `xls`/`ppt`），现统一走 `EXT.OFFICE_KINDS` / `EXT.OFFICE_EXTS` |
| **无扩展名文件** | **明确不做二进制嗅探**：一律不当文本（不把二进制读成乱码）。理由（无既有触点需要它、每次预览多一次读字节、乱码比"打不开"更坏）写在 `file-exts.ts` 的「故意不做的」一节 |
| **判不了的一律保持现状** | `.env` / `.jsonl` / `.tsv` / `.ipynb` **本批不进**索引、快照、向量库（迁前也不在）——那属产品判断，不替用户决定；`.eml` / `.avif` / `.tiff` / 音视频本批不做 |

**防漂移断言**：新增 `privhub/tests/file-exts.mjs`（**59 条**，自带隔离实例端口 **3197**、独立测试根 `tests/.testroot-exts/`，
**不碰 `data/` 与 `data-files/`**），五组：

1. **编译期集合关系**：每条派生式成立 + 三份「逐项同值」活标本（把"本批有意保持的范围"钉死，谁顺手扩权即红）；
2. **行为口径**：`kindOfExt` / `extOfName` 对 24 组真名字与**无扩展名/隐藏文件/末尾带点**的判定；
3. **前端与后端逐项一致**：把 `utils.js` **真身**装进 `node:vm` 取 `EXT` 与 `file-exts.ts` 比对（含 `md` 必须留在可编辑集里这条防误伤）；
4. **反漂移源码扫描**：全仓 116 个源码文件里，凡「≥4 个字面量且 ≥70% 像扩展名」的数组/Set，只允许出现在 **8 个有备案的出处**
   （3 个是本批成果，5 个是本批扫出、判为出本批范围的 Office/敏感族清单，已加注释指向共享出处并写进报告）；
   自带**阳性对照**（植入一段手写副本必须被命中）与**阴性对照**（Cordis 服务名数组不得被误报）；
   另有一组直接读 `privhub-files` 的 `preview-raw` mime 表、断言其**键集 = `IMAGE_EXTS` ∪ {pdf}**（`.ico` 那次前后端不一致的后端一侧防复发）；
5. **端到端**：为 11 个新扩展名各造真文件走 `/privhub/api/preview` 验「现在真能打开」，并复验无扩展名/`.bin` 仍是不支持、`.ico` 的 kind 已是 image。

同批给 `tests/preview-limits.mjs` 加了第 ⑦ 组（**+3 条**）：**从 `file-exts.ts` 读**补齐清单、逐个造探针走真接口验证
（清单被拿掉一项也会红），实测 11/11 全部 `type=text`。
`tests/run-all.mjs` 脚本清单**追加** `file-exts.mjs`（原顺序未动），并让它以 `--import tsx/esm` 启动（它要 `import()` 那份 `.ts`）。

**阴性对照（已做，做完整份还原并核 SHA256）**：把 `explorer-v3/client/utils.js` 的 `EXT` 改回手写副本 ⇒
**②③ 组变红**（前端 5 份清单与后端比对失败、`.ico` kind 回落到 text）；把 `privhub-files-versions` 的派生改回一份少几项的手写清单 ⇒
**⓪ 组变红**（索引/快照集逐项同值失败）。原始输出见 `docs/reviews/evidence-2026-09-17/_negative-control-exts-NC1.txt` / `-NC2.txt`。
另把版本文件里那份手写副本**故意留在原地时**扫描器也能直接抓到（`[越界] …`），这条同样贴了真实输出。

**回归对照**：`cd privhub && node tests/run-all.mjs --spawn` 改动前后**失败清单均为空、逐条同名**（0 条失败）；
九套断言 86 / 12 / 76 / 279 / 16 / 50 / 3 / 27 / **39 → 42**，合计 **588 → 591**（+3 为 `preview-limits` 第 ⑦ 组），
另有新增静态套件 `file-exts.mjs` **59 条**（run-all 汇总里以独立脚本行打印）。
基线 `docs/reviews/evidence-2026-09-17/_baseline-exts.txt`、收工 `docs/reviews/evidence-2026-09-17/_after-exts.txt`（后附一次同命令复跑 `_after-exts-round2.txt`，两轮断言数字逐行一致）。
口径说明：基线跑的是**旧代码**（`preview-limits` 还是 39），但 `file-exts.mjs` 在基线跑完前已落盘，故基线文件里也能看到它（当时 56 条，0 失败）。

**纪律留痕**：`frontend/index.html` **一字未动**；不动 manifest / 插槽 / 打包链 / `viewers.js`；无新增界面入口、不改布局；
`data/` 与 `data-files/` 只读；**未做 git commit / push / stash**；版本号仍为 **3.1.1**（条目追加在 3.1.1 段内）。
报告：`docs/reviews/12-扩展名白名单收敛与补齐.md`。

---

### 缺陷修复 · `.doc`「解析失败却报成功」+ Office 扩展名族收敛（同批两件）

**动机**：上一批（本段内「格式支持矩阵」）实测出两件都在 Office 处理链上的事 ——
① **`.doc` 解析失败却回 `ok:true`**，界面把一句「兜底提示」当正文显示（用户看到的就是"这份文档只有一行字"）；
② **Office 扩展名族有 4 处同族副本**，且前后端**已经不一致**（前端两份多 `xls`/`ppt`，后端 `svc-office` 没有它们）。

#### 一、`.doc`：拿不到正文就不许说成功

| 项 | 内容 |
|---|---|
| **病根（【实体】）** | `privhub-svc-office/src/office-lib.mjs` 的 `readDoc` 是三级链：word-extractor → Python 兜底 `scripts/doc2md.py` → **兜底文案**。三级全失败时它 `return { text:'[无法提取 DOC 文本]（请用 Word/WPS 打开后另存为 docx 再上传）' }` ⇒ `svc-office.read()` 见它不是 `ok:false` 就当成功 ⇒ `/api/office/read` 回 **HTTP 200 + ok:true** ⇒ 前端 `content.js` 把 `content.text` 经 `officeToMd` 渲染成正文 |
| **改法（后端）** | `readDoc` **只回两种形状**：`{ text }`（真提取到）或 `{ ok:false, reason, detail }`（**如实报失败 + 可区分的原因码**）。`svc-office.read()` 把失败翻成 `ok:false` + 中文 `error`，并新增稳定字段 **`reason`**：`unsupported-type` / `read-failed` / `capability-missing` / `capability-broken` / `parse-failed` / `empty-content` |
| **改法（界面）** | `content.js` 的 Office 分支只认 `ok` 与 `error`：`ok:false` ⇒ 进错误态、显示**后端给的原因原文**（既有的 `.v3-loading` 那一行，**不加控件、不改布局**），并把 `reason` 挂到 `content.officeReason` 供排查。兜底句不再可能成为正文（后端已不产出它；`officeToMd` 本来就只搬 `content`） |
| **为什么要先探测 Python** | 本机 `python`/`python3` 只是 Microsoft Store 占位别名（【实证】`where` 解析出的真实路径在 `…\WindowsApps\`，执行会**挂十几秒**）。新增 `probePython()`：先 `where` 解析真实路径 → 占位别名**直接判不可用、不执行** → 否则才跑 `-c pass` 确认；结论缓存并**启动即预热**。实测探测 **98ms**（原本"跑一下试试"要 16s+） |
| **`.doc` 现在的行为** | 假 `.doc`（RTF/HTML/纯文本伪装、空 OLE2）⇒ **HTTP 400 + `{"ok":false,"kind":"doc","reason":"capability-missing","error":"无法提取这份 .doc 的正文：本机没有真正的 Python（只有应用商店的占位程序）。请用 Word/WPS 打开后另存为 docx 再上传"}`**；界面显示该 `error` 原文。真 `.docx`/`.xlsx`/`.pdf` 照旧 **HTTP 200 + ok:true + 正文**（回归断言守着） |
| **口径（第三级为何保留）** | 本机永远用不到 Python 兜底，但**别的部署环境可能有真 Python** ⇒ 删掉等于砍掉一条真能力。本批只做「先探测 + 把"缺能力"与"文件不对"分开」 |

#### 二、Office 扩展名族：一处定义 + 各处显式派生

| 项 | 内容 |
|---|---|
| **一处定义** | `privhub-core/src/file-exts.ts` 新增 `OFFICE_EXTS`（**5 项** `doc docx xlsx pptx pdf` = **读取链真能读出正文**的那一批）、`OFFICE_FAMILY_EXTS`（**7 项** = 上者 ∪ `xls ppt` = **界面上属 Office 家族**的那一批）、`OFFICE_EXTRACT_ONLY_EXTS`（`xls`），以及判定入口 `isOfficeReadExt` / `isOfficeFamilyExt` / `officeKindOf` |
| **最终口径：`xls`/`ppt` 算 Office 家族，但不算「读取链」** | `.ppt`：**全仓无人能读**（`extract.mjs` 对它直接抛错，生态也没有可用 JS 渲染器）。`.xls`：项目**确实**有能读它的依赖（SheetJS），但它接在 `/api/office-preview` 那条「提取成 Markdown」的链上，**不在** `svc-office.read()` 这条链上；把一条能力挪到另一条链是**功能改动**，本批不做。⇒ 界面清单**回归读取链取值**：`.xls`/`.ppt` 不再冒充"点右键就能编辑"（迁前那样点是**静默无反应**，因为 `office-ui` 的浮层又把它们挡回去） |
| **4 处副本收敛后** | `svc-office/src/index.ts`、`files-office/src/index.ts` ⇒ 从共享处**派生**；`files-office/src/extract.mjs` ⇒ **连清单都不再认**（入口闸在 `index.ts` 的 `EXTS = union(OFFICE_EXTS, OFFICE_EXTRACT_ONLY_EXTS)`）；`office-ui/client/index.js` ⇒ **有意保留为该插件自己的单点定义**（浏览器取不到 `core/src/`，且 `integrity.mjs` 要求 client 只引用同目录文件），取值与共享处**逐项同值**由断言钉住 |
| **前端** | 与上一批同一范式：`explorer-v3/client/utils.js` 的 `EXT.OFFICE_EXTS` 是前端唯一出处；`ops.js` 的「✏️ 编辑」分支与 `panel.js` 的 `isOfficeFile` 都从它派生（`OFFICE_KIND_EXTS = OFFICE_EXTS − pdf`） |

#### 三、防漂移断言与阴性对照

- **新增静态套件 `privhub/tests/office-doc.mjs`（79 条，自带隔离实例端口 3198、独立测试根 `tests/.testroot-office-doc/`，不碰 `data/` 与 `data-files/`）**，六组：
  ① Office 口径（集合取值与关系：家族 ⊇ 读取链、差集恰好 `xls,ppt`）；
  ② `readDoc` 三态（四条自造假 `.doc` 一律失败且带原因、**代码里不再有那句兜底文案**、失败形状本身被钉死）；
  ③ `svc-office.read()` 契约（失败 `ok:false`+`reason`，`unsupported-type`/`read-failed`/`parse-failed` **三者可区分**）；
  ④ 端到端（真上传假 `.doc` ⇒ 400/`ok:false`；真 `docx/xlsx/pdf` ⇒ 200/`ok:true`/正文）；
  ⑤ 前端 `content.js` **真身进 vm**（喂 `ok:false` 回包 ⇒ 错误态显示后端原因原文、无正文、无兜底句）；
  ⑥ Office 族收敛（3 处副本真删 + 两份前端单点定义逐项同值 + **逃逸扫描**：备案外第 4 处手写清单 ⇒ 红，自带阳性/阴性对照）。
- `privhub/tests/file-exts.mjs` **④ 组扫描器同步更新**：备案表由 **8 处减到 5 处**（Office 族从 4 处收到 1 处），并给扫描器加了两条对照 —— **注释里引用取值不得误报**（本批两条注释因此被误伤过）、**代码里的真清单照样命中**（证明"注释不算"没有变成"什么都不算"）。
- `privhub/tests/run-all.mjs` 脚本清单**追加** `office-doc.mjs`（原顺序未动），并让它以 `--import tsx/esm` 启动。
- **阴性对照（两条，都贴了真实输出）**：
  ① 把 `readDoc` 的失败分支改回「`return { text:'[无法提取 DOC 文本]…' }`」⇒ **`office-doc.mjs` 59 通过 / 20 失败**，其中 `[实测] /office/read OD假样本-rtf伪装.doc → HTTP 200 {"ok":true,"kind":"doc"}` —— **正是迁前那个"报假成功"**；真 `docx/xlsx/pdf` 三条仍绿（说明变红的就是这一处行为）。原始输出 `docs/reviews/evidence-2026-09-17/_negative-control-doc-NC1.txt`。
  ② 在 `files-office/src/index.ts` 里再塞一份手写清单 ⇒ **`office-doc.mjs` 77/1**（`[越界] …/files-office/src/index.ts:OFFICE_EXTS_OLD`）且 **`file-exts.mjs` 68/1**（`[越界] …/files-office/src/index.ts:20 → doc,docx,xlsx,pptx,pdf`）。输出 `-NC2-office.txt` / `-NC2-fileexts.txt`。
  两条做完**整份还原**并核 SHA256（`docs/reviews/_sha-before-doc.txt` 为收工快照，13 个产品/测试文件哈希与还原后逐行一致、`Compare-Object` 输出为空）。

**回归对照**：`cd privhub && node tests/run-all.mjs --spawn` 改动前后**失败清单均为空、逐条同名**（各 0 条）；
十一套断言 86 / 12 / 76 / 279 / 16 / 50 / 3 / 27 / 42 / **59 → 69** / **新增 79**
（静态与冷启动段逐套合计 **563 → 632**，+69 = `file-exts` +10 与新增 `office-doc` 79）。
基线 `docs/reviews/_baseline-doc.txt`、收工 `docs/reviews/_after-doc.txt`。

#### 四、未实测 / 判不了的（如实列）

- **真 `.doc` 到底能不能出正文：仍标【推断】，本批未实测**。理由与上一批相同 —— 真实 `data-files/` 里的 42 个 `.doc` **全是密文**，且其中一个是真的业务文档，**不许解密**；本批也没有 Word/可用的 `.doc` 生成器来造一个**真** OLE2 Word 二进制样本（已核：`node_modules` 里没有任何 `.doc` 夹具、本机无 LibreOffice）。
  所以「真 `.doc` 走 word-extractor 能出正文」这条**只有代码路径证据**（`office-lib.mjs` 第一级），本批的实测覆盖的是**假 `.doc` 那条路**与**真 `docx/xlsx/pdf` 那条路**。
- **界面观感**：仓库里没有任何浏览器测试 ⇒ "错误提示在真机上长得怎么样"没有看过（不改布局、复用既有 `.v3-loading` 一行，**推断**观感与既有错误提示一致）。
- **`empty` / `capability-broken` / `python-failed` 三个原因码本机触发不到**（需要"能解析但没正文的 .doc"与"装了 Python 的机器"）⇒ 只在断言里钉住取值集合与可区分性，**没有端到端跑过**。

**纪律留痕**：`frontend/index.html` **一字未动**；不动 manifest / 插槽 / 打包链 / `viewers.js`；不新增界面入口、不改布局；
`data/` 与 `data-files/` 只读（隔离实例的临时数据除外，跑完自清）；未解密任何真实数据；**未做 git commit / push / stash**；
未用 workflow / ralph；版本号仍为 **3.1.1**（条目追加在 3.1.1 段内）。报告：`docs/reviews/13-doc假成功修复与Office族收敛.md`。

---

### 缺陷修复 · W2：内容区所有权迁移的收尾批次（修 1 处疑似真 bug + 补 2 处断言/契约缺项 + 1 份语义方案）

**动机**：内容区所有权迁移（第二步 a–d）已经落地，但收尾有三处「**连错了不吭声**」型的空档：
一处真 bug 与两处没人守的契约。本批只补这三处 + 出一份语义方案，**不扩范围、不改行为口径**。

| # | 项 | 性质 | 改法 |
|---|---|---|---|
| **②** | `privhub-files-edit-md/client/index.js` 用 `this.$el.querySelector` 查**已经被 teleport 到宿主舱位**的节点（`:356` 的 focus、`:379-380` 的 `syncScroll`） | **疑似真 bug**（内嵌模式下 `$el` 指向哪一块取决于 Vue 内部实现，赌错即 focus 与滚动同步**静默失效**） | 改成 `ref="src"` / `ref="pre"` + `this.$refs`（**与实现无关**的稳健修法），并加存在性判断。`$el.querySelector` 已**全部消除**（0 处）。⚠ **本批无法实测滚动同步/focus 在真浏览器里活了**：仓库里没有任何浏览器测试、本机也没有 vue 的本地副本（前端是 CDN 全局构建）⇒ 只有代码路径证据 |
| **①** | `panel.js` 的 `menuCloseAll` 清空标签时**不发** `md:interrupt` —— 靠舱位兜底链（`syncEditorHost` → `v3:editor-host {available:false}` → `leaveInline('host-gone')`，**先捕获、先发保存、再退场**）不丢字 | **不是 bug，缺的是断言**（`viewers.js` 的 `checkOrder()` 注释里明写它**故意不查**「有没有发过保存」，为的就是不误伤这条路） | `tests/personal-ui.mjs` 段 K2-8：跑 `panel.js` 的 `menuCloseAll` **真身** + 真 `syncEditorHost` + 真 `edit-md` + 真注册表，钉住「宿主通知到了 / 捕获早于卸 / 那一发保存真的出去且是清空前那份 / 顺序不变式零违规」 |
| **④** | `checkOrder()` 只查**倒挂**，查不出「**该发保存意图的路径压根没发**」 | **契约缺项**（新增一条独立不变式，**不改** `checkOrder()` 与 `violations()` 的既有语义） | `viewers.js` 新增 `SAVE_INTENT_SOURCES` 声明表（只登记 `tabs.js` 的三条切标签路；**不登记 = 有意例外**，`menuCloseAll` 属此类）+ `registry.begin/via` + `lifecycle.checkSaveIntentCoverage()` / `missingSaveIntents()`；`tabs.js` 三处 emit 改走 `emitSaveIntent(source)`。**给意图带来源标记**，报警文案写明怎么改；既有 `bus.on('md:interrupt', …)` 取证点（`viewers.js:284`）**没有失效** |
| **⑤** | 内容区总线事件的事实**散在三处**（`viewers.js:1-58`、`panel.js:86-136`、`content.js:54-59`），`viewers.js` 头部没有总表 | **低危文档缺项** | `viewers.js` 头部补**总线事件总表**（事件 / 方向 / 载荷 / 语义 / 地界 / scope），覆盖任务点名的 8 条 + 内容区实际用到的其余 17 条（含「`v3:viewer-host` **不存在这个事件**」与已作废的 `v3:md-rendered` 两条记录项）；并配**覆盖比对断言**（表与代码互相覆盖，多列/漏列都红） |
| **③** | 409 冲突 + 取消的语义（显式保存 vs 静默保存两条路的行为不同） | **属产品决定，本批只出方案、不改代码** | `docs/reviews/14-内容区契约收尾.md` §5 给出**两个口味**（静默路径该不该弹阻塞 `confirm`、取消后正文留不留/给不给「复制正文」）的取舍、各自改哪几行、可见行为变化、风险与可逆性、回归影响面 |

#### 断言与阴性对照（五条，都贴了真实输出）

- `tests/personal-ui.mjs` **279 → 310**：其中**新增 29 条**（段 K2-2 / K2-8 / K2-9 / K2-10 与段 M），
  另**补回 2 条**在沙箱工厂化时一度丢掉显式形式的既有断言（`viewers.js` 真身装载、宿主真身方法全部取出），
  并把第 3 条既有断言（原「6 个方法都取到了」）**原位恢复强度**、第 5 条（`_session`）补回。
  **对既有断言的处理是「改写 3 条 + 一度丢掉显式形式 3 条（现已全部补回／恢复强度）」**，逐条处置表见
  `docs/reviews/14-内容区契约收尾.md` §3.4（**不是**「一条未删改」）。
  另：`tests/personal-ui.mjs:977` 那条「emit 必须在改 `activeKey` 之前」的源码级断言**有意放宽**为
  同时认 `emitSaveIntent(` 与裸 `bus.emit('md:interrupt'`；「保存意图必须带登记来源」改由段 M3 的源码闸承担
  （NC2 实测：放宽那条仍绿，M3 变红）。
- 阴性对照（原始输出在 `docs/reviews/evidence-2026-09-21/`；**这批输出是补回那 2 条断言之前跑的**，
  故「通过」数比现在重跑少 2，失败清单不受影响）：
  ① `_negative-control-w2-NC1-menucloseall.txt` —— 断开兜底链（`syncEditorHost` 不再发 `available:false`）⇒ **304 通过 / 4 失败**，红的正是 K2-8 那四条；
  ② `-NC2-bare-emit.txt` —— `tabs.js` 那行换成裸 `bus.emit` ⇒ **302 / 6**（应发路径没记账）；
  ③ `-NC3-emit-deleted.txt` —— 整行删掉 ⇒ **298 / 10**（含既有的 J4-a 源码级断言 + 新增的 M3 源码闸）；
  ④ `-NC4-emit-moved.txt` —— 把发意图挪到改 `store.activeKey` 之后 ⇒ **302 / 6**；
  ⑤ `-NC5-unlisted-event.txt` —— 加一条**未登记**的总线事件 ⇒ **307 / 1**，红的正是段 M 的漏列断言（`漏了 v3:w2-unlisted-event`）。
  五条做完**逐份还原**（`panel.js` 哈希与基线逐位一致）。

**回归对照**：`cd privhub && node tests/run-all.mjs --spawn` 改动前后**失败清单均为空、逐条同名**（各 0 条），退出码 0；
逐套断言 86 / 12 / 76 / **279 → 310** / 16 / 50 / 3 / 27 / 42 / 69 / 79。
静态与冷启动段（十套，不含 HTTP 那行汇总）逐条相加：**653 → 684**（+31 全部来自 `personal-ui`）。
> 上一批记的「合计 632」是**加错了**：按同一批证据文件重加是 653（基线 `_baseline-doc.txt` 实为 564、收工 `_after-doc.txt` 实为 653）。
> 本批重新逐条加过并改准：基线 **653**、收工 **684**。
基线 `docs/reviews/_baseline-w2.txt`、收工 `docs/reviews/_after-w2.txt`。

#### 未实测 / 判不了的（如实列）

- **② 的最终效果（内嵌模式下 focus 与滚动同步）无法在本批实测**：仓库没有浏览器测试；本机 `privhub/node_modules` 里没有 vue
  （前端走 CDN 全局构建）。⇒ 只能说「代码路径上不再依赖 `$el` 指向哪里」，**不能说**「滚动同步已实测正常」。
- **`$el` 对「根节点是 teleport 的组件」到底指向目标容器还是锚点**：本批**没有定论**（未在本机跑真 Vue），
  但这正是改用 `ref` 的理由 —— 修法不依赖这个答案。
- **`v3:viewer-host` 这条线**：实测**全仓 0 处 emit / 0 处 on**（它不是事件，是选择器 `.v3-viewer-host`），总表里如实记为 `info`。
- **`viewers.js` 那份声明表与源码的对照只在测试里做**：浏览器侧拿不到 `fs`，运行期只查「进过的应发路径有没有真发」；
  「整段 emit 被删掉」这种改法**运行期查不出来**（NC3 的实测就是这条边界），拦它的是段 M3 的源码闸。
- **段 M 的覆盖比对只认字面量形式**的 `bus.emit/on/off('名字')`（常量发的名字由表的信息项覆盖）；
  间接调用（`const EV = 'x'; bus.emit(EV)`）扫不到 —— 这一点写在断言与注释里。

**纪律留痕**：`frontend/index.html` **一字未动**；不动 manifest / 插槽 / 打包链；`data/` 与 `data-files/` 只读（未解密任何真实数据）；
**未做 git commit / push / stash**；未用 workflow / ralph；未启动子智能体；版本号仍为 **3.1.1**（条目追加在 3.1.1 段内）。
报告：`docs/reviews/14-内容区契约收尾.md`；连线契约同步更新在 `docs/reviews/08-连线契约.md` §4.1.1。

---

## [3.1.0] — 2026-09-14

### 新功能 · 管理控制台外壳（第一阶段：外壳统一、导航清晰、入口不丢）

**动机**（用户要求）：进入管理相关页面时不再是一堆**全宽页面堆在一起**，
而是一个职责清晰、导航稳定、布局一致的工作台。

**范围**：本次只做**前端显示层与导航组织方式**——不改后端 API / 数据库 / 权限校验 /
插件业务逻辑，不删除任何既有管理入口。既有管理页面先「嵌入」新外壳，内部 UI 暂时沿用，
后续再逐页优化。

**新增插件 `privhub-admin-console`**（纯前端，16 个模块 / 1980 行，全部在该插件目录内）：

| 文件 | 职责 |
|---|---|
| `index.js` | 入口：只做装配 + slot 声明 |
| `deps.js` | 对 `window.PrivHub` / `window.Vue` 的依赖收敛点 |
| `routes.js` | 管理路由表（4 分组 13 条）+ 视图可用性判定 + hash 解析 |
| `store.js` | 共享状态 `adminState`（activeSection / activeSubView / selectedId / filters / selection / loading / error / sidebarCollapsed） |
| `action.js` | 导航动作（hash 读写 + 骨架 `nav` 协作，唯一出口） |
| `panelbus.js` | 插件内「打开某管理页」总线（侧栏/概览卡片/详情都走它，避免组件互相 import 成环） |
| `shell.js` | AdminShell：顶部栏 + 侧栏 + 内容区装配 |
| `sidebar.js` / `topbar.js` / `breadcrumb.js` / `sectionheader.js` | 管理导航、顶部栏、面包屑、页面标题条 |
| `ui.js` | `AdminEmptyState` / `AdminSkeleton` / `AdminErrorState` / `AdminConfirmDialog` / `AdminToast` / `AdminBulkBar` / `AdminDataTable` / `AdminListDetail` |
| `panels.js` | 外壳自渲染的管理页：概览、项目权限（只读矩阵）、发布链接（**列表-详情主从布局**）、自动备份、水印配置（只读） |
| `confirm.js` / `toast.js` / `styles.js` | 确认服务（Promise 式）、toast 队列、本插件全部样式 |

**布局**：顶部栏固定 56px（面包屑 / 全局搜索 / 刷新 / 返回文件）；
侧栏 240px 可折叠为 64px；内容区最大宽 1440px、浅灰底白卡片、行高 40px、圆角 8px。
样式全部用 `--admin-*` 变量且值映射主题变量，**暗色模式自动跟随**。

**左侧导航按「管理员职责」分四组**（不是按插件分）：

| 分组 | 条目 → 承载视图 |
|---|---|
| 概览 | 管理概览（外壳自渲染统计卡） |
| 用户与权限 | 用户管理 `admin` · 项目权限（外壳自渲染只读矩阵） · ACL 规则 `acl` · 智能体密钥 `agent` |
| 内容治理 | 标签管理 `tags` · 模板管理 `template` · 发布链接（外壳自渲染） · 回收站 `trash` |
| 系统运维 | 审计日志 `audit` · 系统设置 `settings` · 自动备份（外壳自渲染） · 水印配置（外壳自渲染只读） |

**导航机制（本次的关键设计）**：

- 管理路由走 **hash**：`#/admin/access/acl`、`#/admin/ops/audit`…，**刷新后保持位置**；
  离开管理视图自动清掉管理 hash，「返回文件」后再进入回到**上次停留的管理页**（localStorage 记忆）。
- 侧栏条目**只改 hash**，不回头调 `nav.setActiveView` —— 骨架的 `setActiveView` 对
  「同一个视图再点一次」会 toggle 回文件页；为此给它加了 `noToggle` 选项，
  **管理视图内不再触发回 files 的 toggle 行为**（文件视图原有 toggle 行为保持不变）。
- 管理页内容由**其它插件**提供：各插件 manifest 新增 `admin-nav` barItem（进入控制台侧栏）
  与 `admin-*` slot（内容区渲染同一份组件实现）。因此**卸载某插件后，对应条目自动变为
  「待接入」**，而不是点进去空白；插件恢复即自动可用。
- 图标栏底部管理组收敛为「🛠️ 管理控制台 + ⚙ 设置」两个入口
  （用户管理 / 权限 / 审计三个图标移入控制台侧栏，**入口一个不少**）。

**统一状态与交互**：列表用骨架屏（不整屏 spinner）、空状态含图标/标题/说明/主按钮、
局部错误卡片带「重试」、危险操作用统一 `AdminConfirmDialog`（高风险操作要求**输入关键词**才能确认）、
批量选择浮现 `AdminBulkBar`、所有操作经 `AdminToast` 反馈；`Esc` 关闭弹窗（**不再把人弹回文件页**）。

**列表-详情主从布局**（需求 §4）已落地为 `AdminListDetail` 并提供参考实现：
「内容治理 > 发布链接」页左侧列表 320px（可拖拽 280–480）、右侧详情自适应，
列表项含主标题/副标题/状态徽章/最近更新，选中态为浅主色底 + 左侧 3px 主色条，
支持列表内 `↑` / `↓` 切换选中、`Enter` 打开详情，危险操作（撤销链接）单独放在详情底部区域。
其余管理页因内部仍是既有界面，暂用统一的全宽表格 + 统一筛选栏/批量栏样式，后续逐页改主从。

**响应式**：≥1280px 侧栏展开；1024–1279px 侧栏折叠为图标；<1024px 侧栏变抽屉（汉堡菜单）；
<768px 列表与详情二选一，并提供「← 列表 / 详情 →」切换。

**入口保持**：`openAdmin` / `openAcl` / `openAudit` / `openSettings` / `openTags` /
`openTemplate` / `openKg` / `openWiki` 全部保留（`openAdmin` 现进入管理控制台，
其余入口直达对应视图，外壳会自动把它们纳入管理导航）。

**既有插件改动（仅前端接线，无业务逻辑改动）**：`privhub-admin` · `privhub-admin-acl` ·
`privhub-admin-audit-panel` · `privhub-files-tags` · `privhub-files-template` ·
`privhub-trash-ui` · `privhub-shell-settings` · `privhub-shell-agent-console` 各加一条
`admin-nav` 声明与一个 `admin-*` slot 别名（**同一份组件实现、两处入口**）；
`privhub-shell` 图标栏不再渲染 `admin-nav` 条目、底部管理组收敛为 2 项；
`frontend/index.html` 挂载 `admin-console` slot 并支持 `noToggle`。

### 测试

- 新增 `tests/admin-console.mjs`（**76 项**）：在 Node 里用最小 DOM 适配器**真实加载 Vue 与
  本插件全部模块、真实编译并挂载 AdminShell**，覆盖路由解析、视图可用性（含「插件卸载后变待接入」）、
  侧栏与顶栏渲染、概览卡片取数、视图缺失兜底、侧栏高亮唯一、
  列表-详情主从布局（列表/详情并排、选中态唯一、`↑`/`↓` 切换、`Enter` 打开详情、危险操作区、空状态）、
  hash 路由（刷新/前进后退等价）、**「管理视图内重复点击不 toggle 回文件页」**、
  确认弹窗 Promise 语义、toast 队列，以及骨架接线契约（入口保留、slot 挂载、Esc 行为）
- `run-all.mjs` 静态检查链加入 `admin-console.mjs`；`integrity.mjs` 的「前端模块化契约」由只盯
  explorer-v3 改为**按清单对多个插件生效**（新插件照此声明必需模块），本次以 `admin-console`
  16 个模块接入契约（入口 27 行装配、只引用同目录文件、依赖无环、职责模块齐全）
- 回归：`frontend-templates`（60 个模板零错误/零警告，含新插件模板）、
  `personal-ui` 39 项、`integrity` **50 项** 全部通过
- 敏感性验证：把「卸载插件后条目变待接入」写成了真实用例（移除视图声明后断言条目变化），
  非空断言

### 备份

改动前的 13 个管理相关插件与 `frontend/index.html` 已整份备份到
`_archive/2026-09-14-admin-shell-phase1/`（55 个文件），可随时逐文件还原。

### 说明（后续阶段）

- 各管理页**内部 UI 仍沿用既有实现**（本阶段只换外壳）；用户管理 / ACL / 审计等页面
  的列表-详情化改造在后续阶段进行。
- 「全局搜索」本阶段**只做 UI**：提交时明确提示搜索范围与「后续阶段接入」，不做假交互。
- 水印配置为**只读**（后端目前只提供水印下发，无配置接口）；自定义文案/透明度/开关
  需后端补接口后再接入。
- 项目权限页为**只读矩阵**（数据来自既有用户接口），修改归属仍走「用户管理」，
  以避免本阶段新增任何后端接口。

---

## [3.0.4] — 2026-09-12

### 重构 · explorer-v3 前端按职责拆分（单文件 1628 行 → 12 个模块）

**动机**（用户要求）：前端保持**一个主界面**（`frontend/` 骨架只做容器与总线），
各界面区域按功能拆成独立文件，**且全部留在所属插件目录内**——
这样装载/卸载插件时只需找到对应功能的那一个文件改代码，不会互相干涉。

**改法**：`plugins/privhub-files-explorer-v3/client/` 由单个 89 KB / 1628 行的
`index.js` 拆为 12 个职责单一的文件，`index.js` 只剩 40 行装配：

| 文件 | 职责 |
|---|---|
| `deps.js` | 对 `window.PrivHub` / `window.Vue` 的依赖收敛点（桥的键增删只改这一处） |
| `utils.js` | 纯工具函数（无状态） |
| `styles.js` | 本插件注入的全部样式 |
| `store.js` | 共享 reactive 状态 |
| `treecache.js` | **树缓存的数据操作**（拉取/查询/展开收起/刷新） |
| `content.js` | 内容加载 + Markdown 渲染 + Office→Markdown |
| `tabs.js` | 文件标签页（持久化/打开/激活/关闭） |
| `ops.js` | ⋯ 菜单 + 文件操作（改名/复制/移动/删除/下载/编辑/新建） |
| `tree.js` | 左栏目录树（tree slot） |
| `panel.js` | 中栏内容区（panel slot） |
| `detail.js` | 右侧详情面板（preview slot） |
| `fontzoom.js` | 顶栏整体缩放（user-area slot） |

**关键设计：`treecache.js` 是拆出来的必需项。** 原文件里树缓存函数与树组件混在一起，
而 `ops`（改完文件要刷新树）与 `tree`（界面）都要用它，直接拆会让
`tree → ops` 与 `ops → tree` 形成**双向依赖**。把"数据操作"从"界面组件"里分开后，
依赖方向变为严格单向：`deps → utils → store → treecache → {content, tabs} → ops → tree → panel`。

**保真**：拆分是**逐行原文搬运**，不改任何逻辑。已用脚本校验：21 个原文区间逐字一致、
38 个顶层符号零丢失；依赖图无环；11 个子模块在真实静态路由下全部 200。

> 注意：拆分**不改变**"内容区顶栏只有一层"的结论（3.0.2/3.0.3 的成果），
> 详情/⋯ 按钮仍在标签行右侧，内容区仍无任何工具条。

### 测试

- `integrity` 新增「前端模块化契约」7 项：入口只做装配且无组件模板、
  模块**只引用同目录文件**（拆出来的东西必须留在插件内）、**依赖无环**、
  职责模块齐全、插件目录内无自建整页 HTML（骨架是唯一主界面）
- 敏感性验证：4 个变异（实现塞回入口 / 制造循环依赖 / 引用插件外路径 / 删除职责模块）
  **全部被抓住**
- `personal-ui` 更新为按模块文件读取源码（组件已不在入口文件里）
- 全量回归 **200 项通过**

### 已知事项（未处理，非缺陷）

- `detail.js` 的右侧详情面板里，「收藏 / 权限 / 批注评论 / 生成页面 / 发布链接 /
  版本历史 / 向量数据库」这些按钮**目前是硬编码的临时代码**——它们的功能归属
  各自插件，待那些插件开发到相应阶段后应迁回各插件（改为注册制）。
  本次拆分**未改动**这部分逻辑，只把它归位到 `detail.js`。

---

## [3.0.3] — 2026-09-11

### 修复 · 内容区按钮与 Office 工具条重叠干涉

**问题**（用户反馈）：3.0.2 把内容工具条改成「右上角悬浮」后，它与 Office 预览的工具条**压在一起**。

**成因**：内容区会被 office2 的 iframe **从顶部整块铺满**，任何悬浮在内容区之上的元素必然压到
iframe 自身的工具条上。悬浮方案在「非 Office 文件」下看不出问题，一开 docx 就暴露。

**改法**：不再悬浮，改为**放进标签行右侧**（标签栏 + 操作区同一行）：

- 新增 `.v3-tabrow` 容器：左＝标签栏，右＝操作区（`ℹ️ 详情` + `⋯`）
- **内容区彻底移除任何工具条元素**——不占位，就不可能重叠
- `⋯` 菜单锚在操作区（`.v3-tabops{position:relative}`），**不能挂在 `.v3-tabs` 上**：
  标签栏是 `overflow-x:auto`，下拉菜单会被裁掉
- **office2 的 iframe 插入锚点改为 `content.prepend(frame)`**：原先以 `.v3-content-head`
  为锚点，该元素已删除，旧写法会静默退化成 `appendChild` 导致顺序错乱

**净效果**：内容区零顶栏；操作按钮与标签同行，不额外增加层数；Office 场景不再重叠。

### 测试

- `personal-ui` 的 F 组按新口径重写为 21 项：内容区不得有任何工具条元素、样式无残留、
  操作区必须在标签行内且为菜单定位上下文、菜单不得挂在 overflow 容器、office2 必须用 prepend
- 敏感性验证：4 个变异（把悬浮条加回来 / 菜单挪回 overflow 容器 / office2 回旧锚点 /
  标签行重复文件名）**全部被抓住**
- 全量回归 **193 项通过**

---

## [3.0.2] — 2026-09-11

### 界面 · 内容区顶栏层数收敛

**问题**（用户反馈）：打开 Office 文档时内容区叠了 **3 层顶栏**，同一个文件名被重复显示 **3 次**：

| 层 | 来源 | 原内容 |
|---|---|---|
| 1 | `explorer-v3` 标签栏 | 📄 文件名 + ✕ |
| 2 | `explorer-v3` 内容工具条 | 📄 **文件名（重复）** + 字号 + 详情按钮 |
| 3 | `office2` 预览页自带工具条 | **文件名（第三次）** + 只读预览 + 编辑/保存/退出 |

**改法**（目标：保留两侧——左目录树 + 右详情面板，其余功能收进一个按钮）：

- **文件名以标签栏为唯一出处**：内容工具条不再渲染文件名与文件图标
- **内容工具条由「占一行的标题栏」改为「右上角悬浮按钮组」**，视觉上不再构成一层顶栏
  （DOM 结构保留——`office2` 以它为 iframe 插入锚点、`edit-md` 以它为内嵌编辑器外框，直接删除会破坏这两个插件）
- **功能合并进单个 `⋯` 菜单**：字号 A−/重置/A+、关闭当前/其他/全部标签、复制文件位置
  （原标签栏右端的「✕ 其他」文字按钮一并并入）
- **右侧详情面板保留一键开关**（`ℹ️ 详情`），满足「保留两侧」
- **office2 预览页不再重复文件名**，工具条压薄（padding 8px→4px、按钮 5px→3px）；
  仅当该页被**单独打开**（非 iframe 嵌入）时才显示文件名，避免无标题可依

**效果**：Office 文档场景下内容区顶栏由 3 层降为 1 层（标签栏）+ office 自身一条细工具条；
文件名只出现 1 次。

### 测试

- `tests/personal-ui.mjs` 新增 F 组共 19 项断言，锁死上述结论：
  内容工具条不得再出现文件名/文件图标、必须是绝对定位悬浮、`⋯` 菜单必须承接全部原有功能、
  office2 不得把悬浮条拉回成标题栏、预览页默认隐藏文件名但单独打开时仍显示
- 敏感性验证：4 个变异（塞回文件名 / 改回占行 / office2 拉回标题栏 / 恢复重复文件名）**全部被抓住**
- 全量回归 **180 项通过**

---

## [3.0.1] — 2026-09-11

本次是自本日志启用以来的**首个记录版本**，包含「个人空间 v1」这一完整特性批次，
以及围绕它所做的安全加固与智能体接入改造。

### 新增 · 个人空间（用户私有区，外置于项目）

个人空间是 `data-files/<真实姓名>/` 下的顶层目录，**不属于项目**：

- **仅本人可见可访问**——管理员同样读不到（管理员的可见性只体现在审计记录，不含文件内容）
- 不计入项目列表、不出现在项目下拉、不参与查重 / 向量化 / 全文索引
- **系统永不自动删除**（删账号、删项目都不动它）
- 实名注册时自动创建；姓名全局唯一（与其他账号姓名、其他账号个人空间名、
  `data-files` 下已存在的同名顶层目录都查重），冲突时提示改用「姓名-部门」

权限收敛点集中在 `privhub-core`：`allProjects` / `visibleProjects` /
`canAccess` 三处；并新增 `indexableProjects`（索引范围 = 项目，排除个人空间），
使查重、向量化、全文索引共用同一份范围定义，避免多处口径漂移。

### 新增 · 改名联动与「旧名退休」

显示名与个人空间目录名 **live-bound**：改名时两者一起改（先改磁盘、后落盘账号，
落盘失败则把磁盘改回去）。

**旧名退休**（`retiredPersonalDirs`）是本批次最关键的安全设计。个人空间的数据不止
在文件夹里，还散落在一批**以目录名为键、只用 `canAccess` 把关**的存储中
（`versions.json` 存的是文件正文、`comments.json`、`meta.json`、全文索引、回收站…），
而 `canAccess` 对管理员是「任意合法名字都放行」。改名后旧名一旦被释放：

1. **管理员可按旧名直接读到私人文件的历史版本正文**（越权）
2. 若之后有人注册成同名，**新人会继承旧名的可见性**，读到前任的私人内容

因此旧名永久保留并维持归属，`canAccess` 继续拒绝所有人（含管理员），旧名也不可再被注册。
一条规则关掉整类越权，无需逐个存储补清理钩子。

### 新增 · 智能体沙箱 = 个人空间

智能体（Agent API）的可写区从 `.agents/<用户>/` 隐藏目录**改为该账号的个人空间**——
个人空间本就是「仅本人可见、管理员读不到、永不自动删除、不参与索引」的私有区，
正是沙箱需要的语义，复用它还让用户能直接在界面里查看和整理 AI 产物。

- **项目对智能体始终只读**：写项目一律 `403 AGENT-4032`
- 沙箱缺位（账号未开通个人空间）：写入类操作 `403 AGENT-4036`，显式失败而非静默落到别处
- 沙箱名**不出现在项目清单里**，且 `/me`、`/projects` 按密钥 scope 收窄
  （顺带修掉原实现 `/me` 不做 scope 过滤、把全部项目名发给智能体的疏漏）

### 新增 · 智能体接入开发者平台

新插件 `privhub-shell-agent-console`（图标栏 **🔌 智能体接入**），形态参考微信公众号平台的
开发者配置页：接入信息 / 我的密钥 / 接口文档 / 全部密钥（管理员）。
明文密钥只在签发瞬间显示一次。

- 新增 `GET /privhub/api/agent/v1/console`（**网页会话通道**，与 Agent 密钥通道严格分离）
- `/agent/v1/schema` 加鉴权：**接口清单即地址规则**，未授权方不得读取
- 自助密钥**禁止 `all` scope**（无人复核的广域授权），需要广域请管理员签发

### 安全 · 静态资源鉴权

`/privhub-plugins/*`（插件前端代码 = 本项目 API 全貌：端点、参数、错误码）此前
**完全无鉴权**，任何人不带凭据即可拉取。现在：

- 插件资源需有效会话；**只放行登录框自身**（声明 `auth` slot 的插件，
  与 manifest 分级采用同一条判据）
- 新增会话 Cookie 通道 `privhub_sid`（HttpOnly + SameSite=Strict）——
  浏览器 `import()` 子资源请求无法附加 `Authorization` 头，只能靠 Cookie
- `Authorization: Bearer` 通道保持不变；`/api/me` 用 Bearer 校验通过时补发 Cookie
  （升级前已登录的老会话可自助补票）
- 骨架启动时序调整为先换 Cookie 再加载插件，并在插件加载失败时**自动补票重试一次**，
  防止再次出现「界面加载不出来、原因只在 console」的死锁

### 修复

- **自助注册被静默关闭**：`allowSelfRegister` 的默认值曾写成 `false`，且判据是
  `=== true`——于是本就没有该字段的 `settings.json` 会把注册判为关闭，等于把原本可用的
  自助注册废掉，而设置界面又没有开关。现改为**「显式关闭才关闭」**（缺省 = 允许），
  与改动前的行为一致。
- **个人空间语料泄露窗口**：RAG 的事件驱动摄取（`file:changed`）原先没有个人空间防护，
  上传即被摄取，管理员端 `/rag/corpus`（adminOnly 且不按权限过滤）能看到私人目录名与
  文件名，直到下次重启重建才被清掉。现已在**摄取口**拦截；全文索引同样排除。

### 测试

- 新增套件：`personal-space`、`personal-rename`、`personal-ui`、`agent-sandbox`
- 修复测试基础设施缺陷：`PRIVHUB_TEST_ROOT` 未传给测试进程，导致磁盘落盘断言
  长期静默跳过（空断言）
- 关键防护均做过**变异注入敏感性验证**（去掉防护后测试必须变红），已验证：
  静态资源鉴权、沙箱落位、旧名退休、RAG 排除、沙箱缺位拒绝
- 全量回归 **171 项通过**

### 已知事项（未处理，非缺陷）

- `data-files/.agents/` 存有 `user1/A项目/模板/` 三层**空目录**（2026-09-06 的测试残留）。
  沙箱改用个人空间后它已不再被使用；按「测试/示例数据保持原样」原则原样保留。
- 内置示例账号 `admin`、`user1` 未开通个人空间（属于示例数据）。因此：
  - 智能体沙箱对其不可用（写入返回 `403 AGENT-4036`，属预期）
  - 需要时可经「改显示名」开通：改名的同时会创建同名个人空间目录
- `deploy/` 生产包**落后于开发源码**（少 1 个插件、关键文件有差异）。
  同步生产需显式授权后执行，届时用 `node tests/integrity.mjs --release` 做发布闸门校验。
