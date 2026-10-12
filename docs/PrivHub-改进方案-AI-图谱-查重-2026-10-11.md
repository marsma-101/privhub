# PrivHub 改进方案 · AI 接入 / 知识图谱 / 查重

- 日期：2026-10-11
- 状态：**方案（待评审）**——§一~§五不含实现，只给改哪里、怎么改、怎么验收；**实施进展另见 §六**。
- 触发：用户要求「看一下其他功能菜单——AI 接入、知识图谱、查重，先出改进方案；nowen-note 有对应功能的就照 nowen 改，没有的单独出方案」。

## 体例

- 每条改动都标 **来源**：
  - `照 nowen-note 改` —— nowen-note 有对应实现，按其设计对齐；
  - `自定` —— nowen-note 没有（或它自己也没做好），由本方案给出设计。
- 优先级：
  - **P0** = 现在是坏的 / 是死的，或是安全缺口；
  - **P1** = 能力或体验明显欠缺；
  - **P2** = 锦上添花 / 改动大、可后置。
- 每条尽量给 `file:line` 证据（本轮已实测核过的标 ✅，来自只读调查未亲验的标 ⚠️）。
- 参照对象：`G:\program\nowen-note-src`（下称 nowen）。

---

## 零、先说三条"现在就是坏的"（跨模块，优先修）

### 0.1 语料治理的「近似重复」是死代码 ✅ P0

- 证据：`privhub/plugins/privhub-svc-rag/src/index.ts:253` 把相似度**写死** `const score = 0.25`（注释说"至少 1 band 命中，保守标记"），而 `:261` 的过滤条件是 `score >= NEAR_THRESHOLD * 0.5`，`NEAR_THRESHOLD = 0.55`（`:62`）⇒ 门槛 0.275。
- **0.25 < 0.275 ⇒ `nearCandidates()` 永远返回空数组**，MinHash 那套（16 特征 / 4 band / 4 rows，`:59-61`）实际一次都没生效。注释声称的"相似度 = 共享 band 数 / 总 band"从未被计算。
- 后果：「语料治理 → 待裁决」里的 **near 类永不出现**，管理员看到的"待裁决（N）"少算了一整类。
- 改法：真正按 `共享 band 数 / MINHASH_BANDS` 计算 score，再与阈值比较；阈值与是否**只报告不自动删**（注释里 L1 的口径）保持不变。
- 验收：造两个"高度相似但非一字不差"的 md，待裁决须出现 1 组 near；再放假阳性用例（完全不相似）确认不误报。

### 0.2 文件级 ACL 缺口：图谱 / 全文检索 / 查重三处会漏出不该看的文件 ⚠️ P0（安全）

- 证据（三处，同一形态）：
  - KG：只做项目级 `canAccess(u, project)`（`privhub-files-kg/src/index.ts:255`）；
  - 全文检索：只按 `visibleProjects` 过滤（`privhub-files-fulltext/src/index.ts:156`）；
  - 查重：只做项目级 `canAccess`（`privhub-svc-rag/src/index.ts:1310`），`dupCheckProject` 把项目内**全部文件名与路径**列出，不过 `acl.can(view)`（同文件的 `ragSearch` 在 `:916` 是做了的）。
- 为什么守卫补不上：ACL 守卫（`privhub-admin-acl/src/index.ts:110-112` 已登记 `/api/kg`、`/api/fulltext/search`）在 GET 上只从 query 取 `project`/`path`，而这三条路由**只传 project 不传 path** ⇒ 守卫按项目根判定；`privhub-svc-acl/src/index.ts:159-171` 对子路径规则返回 depth `-3`。
- 后果：**项目内被文件级 ACL 拒绝的文档，仍会以节点/边/摘要片段/文件路径出现在图谱、检索与查重结果里**。这是数据泄漏面，不是体验问题。
- 改法（二选一，建议前者）：
  1. 服务端在出结果前逐文件走 `acl.can(u, project, path, 'view')` 过滤（与 RAG 检索链 `privhub-svc-rag/src/index.ts:916-919` 已有的写法同源，照抄即可）；
  2. 让守卫能拿到 path——工作量更大且要改契约，不推荐。
- 验收：给某文件配一条 deny 规则，确认它从图谱节点、图谱边、全文命中三处**同时**消失。

### 0.3 Wiki 与 KG 的口径不一致 + 一条恒等死分支 ✅ P1

- 证据：
  - 死分支：`privhub-files-wiki/client/index.js:116` 写作 `if (!r.ok || !r.ok && !r.status)` ⇒ 等价于 `!r.ok`（`&&` 优先级高于 `||`）。是笔误，删掉后半句。
  - 口径不一致：Wiki 的 `[[x]]` 只在**同目录**解析（`:149-166`），KG 的 `[[x]]` 在**全项目按文件名**解析（`privhub-files-kg/src/index.ts:123-131`）⇒ 同一条链接两边结果不同；KG 遇同名还取第一个匹配（`:127`）。
  - 交互断裂：Wiki 里点双链经 `nav.openDir` 会把 `activeView` 切回 files（`frontend/index.html:581`），**点一下就退出 Wiki**，多页浏览实际不可用。
- 改法：先定"Wiki 与 KG 是否合并"（见 §2.10 的 Q3），再统一解析器；无论怎么定，死分支先删。

---

## 一、AI 接入

> nowen 的结论：**有，而且相当完整**。这一节以 `照 nowen-note 改` 为主。
> 但要明确：PrivHub 有两块**比 nowen 强**，不要被"照 nowen 改"带退步——见 §1.9。

### 1.1 现状（PrivHub）

- 协议只认 OpenAI 兼容，无厂商 SDK（`privhub-svc-model/src/index.ts:1-19`）。
- 配置 = 两个端点 + 重试数：`ModelEndpoint{ baseURL, apiKey?, model, timeoutMs }` × {llm, embedding} + `maxRetries`（`svc-model/src/index.ts:28-38`）。
- 落盘 `data/model.json`，走 `ctx.storage.writeText`（AES-256-GCM）；GET 回打码 key（`rag/src/index.ts:1252`），提交带 `…` 视为"不修改"（`svc-model/src/index.ts:233-234`）。
- **请求体只发 `{ model, messages, stream }`**（`svc-model/src/index.ts:411`）——temperature / max_tokens / top_p 一律不可配。
- **全局单份配置**：没有"多套模型 / 按用户自选"的概念。
- 自检：`GET {base}/v1/models`，六种状态，缓存 60s（`svc-model/src/index.ts:261-290`）。
- 自动发现局域网模型：**有**，11 个固定端口 + CIDR 扫描，仅私网（`rag/src/index.ts:981-1110`）。
- Agent Key 体系：`pha_` + 只存 sha256、scope 三档（all/project/directory）、自然月末过期、到期前 7 天预警、`X-Agent-Key` 鉴权、文件锁串行写入（`files-agent/src/index.ts:45-46,142,218-219,1015-1023,107-110,256-258`）。
- 问答：BM25 + 向量 RRF 融合（`rag/src/index.ts:860-910`）、SSE 流式（`:1422-1451`）、引用来源 `RagSource`（`:841-847`）、检索后逐篇 `canAccess + acl.can(view)`（`:916-919`）。
- **单轮**：每次只组 `[system, user]` 两条消息，无历史（`rag/src/index.ts:959-968`）。

### 1.2 改法 A：Provider 预设 + 多 Profile（`照 nowen-note 改`）P1

- nowen 参照：`frontend/src/components/AISettingsPanel.tsx` 的 `PROVIDER_PRESETS`（通义千问 / OpenAI / Google Gemini / DeepSeek / 豆包(火山) / Ollama(needsKey=false, localhost:11434/v1) / 自定义），多 profile 保存、切换、设为当前、删除；凭据存 `ai_profiles_v1` JSON（`backend/src/services/user-ai-settings.ts`、`embedding-config.ts`）。
- PrivHub 改法：把 `data/model.json` 从"单份 llm/embedding"升级为 `{ profiles: [...], activeId, maxRetries }`；**读取时兼容旧结构**（旧文件当单 profile 迁移）。UI 换成预设下拉 + profile 列表。
- 验收：新建两个 profile 来回切，问答与 embedding 各走各的；旧 `model.json` 无需手工迁移即可用。

### 1.3 改法 B：baseURL 一变就防抖拉模型列表（`照 nowen-note 改`）P1

- nowen 参照：URL+Key 就绪后 **700ms 防抖**自动拉 `/models`，下拉选模型名；`/embeddings/models` 单独发现 embedding 模型。
- PrivHub 现状：模型名要**手打**（`rag/client/index.js:893-903`），打错只在自检时以 `model-missing` 暴露。
- 改法：填完 baseURL/apiKey → 防抖调 `GET {base}/v1/models` → 下拉；embedding 单独一个"发现模型"按钮。
- 验收：填 `http://127.0.0.1:11434` 后能在下拉里选到本机 Ollama 的模型名。

### 1.4 改法 C：测试按钮升级为"保存并测试"，embedding 测试回维数/耗时（`照 nowen-note 改`）P1

- nowen 参照：`POST /test` 发 "Hi"、max_tokens=10、15s 超时，且对 Ollama 405 回退 `GET /api/tags` 并提示升级；`POST /embeddings/test` 返回**维数 + 耗时**。
- PrivHub 现状：`/api/model/status` 只回状态串（ok/unreachable/…），没有维数、没有耗时。
- 改法：自检结果补 `dims` / `latencyMs`；按钮文案改"保存并测试"。
- 验收：mock 与真实 embedding 都能显示维数；Ollama 老版本给出升级提示而不是裸 405。

### 1.5 改法 D：剥离推理段 + 错误掩码（`照 nowen-note 改`）P0/P1

- nowen 参照：`backend/src/services/ai-client.ts` 的 `stripAiReasoning()` / `extractFinalAnswer()` 显式剥离 ` thinking` 段、丢弃 DeepSeek/MiMo 的 `reasoning_content`；`sanitizeError` 把 `sk-*` 掩码。
- PrivHub 现状：直接把模型返回塞进正文与错误提示——接推理型模型时**思考过程会进答案/引用**，API 报错可能把 key 片段带进 toast/日志。⚠️ 需实测确认（拿一个会输出 reasoning 的模型跑一次问答）。
- 改法：在 `svc-model` 的响应解析处统一剥离；错误信息统一掩码。
- 验收：对会输出 `reasoning_content` 的模型问答，答案里不出现思考段；错误 toast 里不出现完整 key。

### 1.6 改法 E：多轮对话（`照 nowen-note 改`）P1

- nowen 参照：`AIChatPanel.tsx` + conversations/chat-history CRUD，问题带上下文。
- PrivHub 现状：单轮（`rag/src/index.ts:959-968`；路由 body 只读 `question/collection`，`:1407-1409`）。
- 改法：`AskMessage` 增 `history`；服务端按轮数截断；前端保留会话气泡与"新会话"。历史**只存前端**（或按需落 `data/`），避免把对话写进加密语料库。
- 验收：连续问"它多少钱"→"那保修呢"，第二问能命中第一问的上下文。

### 1.7 改法 F：检索阶梯兜底 + 前端展示"检索方式"（`照 nowen-note 改`）P1

- nowen 参照：`POST /ask` 的检索阶梯 = 向量 → FTS5(前缀通配 OR) → LIKE → 最近笔记兜底；SSE 先发 `references` 与 `retrieval`(mode) 事件。
- PrivHub 现状：BM25 + 向量 **RRF 融合**（其实比 nowen 的阶梯更高级），但**没有逐级降级**，也没告诉用户"这次是靠什么检索到的"。
- 改法：**保留 RRF**（不要退回阶梯），只补两件事：① 无向量库/向量失败时明确降级到纯 BM25 并在 UI 标注；② SSE 增 `retrieval` 事件，前端显示"检索方式：混合/关键词"。
- 验收：删掉 `vectors.db` 后问答仍可用且界面标注"仅关键词检索"。

### 1.8 改法 G：写作助手动作组（`照 nowen-note 改`）P2

- nowen 参照：`AIWritingAssistant.tsx`——续写 / 改写 / 润色 / 精简 / 扩写 / 修语法 / 中译英 / 英译中 / 总结 / 解释 / Markdown 排版 / 代码格式化 / 自定义，分组 write/edit/translate/format/other，支持持久化自定义指令。
- PrivHub 现状：无。
- 改法：作为 `privhub-files-edit-md` 编辑器工具栏的一个"AI"下拉，复用已有 `/api/model` 通道；不新建后端端点（除非要 action→prompt 映射，那就放 `svc-model` 里一处常量表）。
- 验收：选中一段文字点"润色"，替换为模型输出且可撤销。

### 1.9 **不要照 nowen 改**的两块（PrivHub 更强）

- **局域网模型自动发现**：nowen 没有（它的 `discovery.ts` 是 mDNS 找 note 服务器，不是找 AI 服务）。PrivHub 的 CIDR + 端口扫描保留并可选加强（见 1.10）。
- **Agent Key 体系**：nowen 的 `TokenManagement.tsx` 只是给 MCP/CLI/Agent 发个人令牌（scopes + 笔记本 restricted）；PrivHub 的 per-project scope、月度到期、7 天预警、暂停/续期、审计链路更完整。保留。
- 唯一可借 nowen 的点：nowen 有**面向 MCP 客户端的接入文案**（"可直接配给 Claude Desktop/Cursor"），PrivHub 的"如何交给 AI"教程（`rag/client/index.js:310-323`）可以吸收它的 mcp.json 片段示例。

### 1.10 需你拍板的 AI 口径问题

| # | 问题 | nowen 的做法 | PrivHub 现状 | 影响 |
|---|---|---|---|---|
| Q1 | 模型配置**全局管理员配**，还是**每用户自配**？ | 每用户（`user-ai-settings.ts`，provider/url/key/model 全是 per-user） | 全局一份（管理员在 RAG 界面填） | 决定了 1.2 的 profile 是"全局多套"还是"每人多套"，数据模型与权限都不同 |
| Q2 | 模型参数（temperature 等）要不要放开？ | 未确认（⚠️） | 完全不可配（`:411`） | 影响答案稳定性；放开就要防"每用户填坏参数" |

---

## 二、知识图谱

> nowen 的结论：**有**——但和 PrivHub 一样是**手写 SVG**，没有缩放/拖拽/力导向，大图同样不可用。
> 所以这一节是「**反向链接 / 边分型 / ID 化链接照 nowen 改；布局与交互自定**」。

### 2.1 现状（PrivHub）

- 节点 = 所有 `.md` + 被打了标签的任意文件（`privhub-files-kg/src/index.ts:140-149`）。
- 边两类：`[[名]]` 双链（正则 `:61`，按**文件名精确匹配**同项目 .md，`:123-131`）；同标签文件两两成团（`:165-177`）。
- **标签只来自 sidecar `data/meta.json`**（`privhub-svc-meta/src/index.ts:162-163`），唯一写入方是标签插件（`privhub-files-tags/src/index.ts:54-56`）。
- 无持久化，内存 `Map` 惰性缓存 + 事件失效 + 60s TTL（`:70-91,134-136,244`）。
- 前端自研内联 SVG，确定性"社区圆环"布局（union-find + 双圆环，`:179-198`；`client/index.js:69-95`）；画布写死 `W=860 / H=520`（`client:30-31`）。
- 交互：滚轮/按钮缩放 0.4–2.5x（`:96-102`）、hover 高亮邻接、点节点跳回文件视图（`:109-116`）。**无拖拽、无过滤、无图内搜索、无方向、无分型**。
- 入口：图标栏 🕸️，`frontend/index.html:1149`，快捷 `openKg`（`:1068`）。

### 2.2 改法 A：frontmatter 的 `tags:` 同步进 meta（`自定`——PrivHub 独有 bug）P0

- 问题：模板生成的文档 frontmatter 里有 `tags:`，但**没有任何地方把它同步进 `meta.json`** ⇒ 对 KG 完全无效，用户"明明打了标签却不出现在图谱里"。
- ✅ 实测确认：全仓 `setTags` **只有标签插件 HTTP 路由一个调用方**（`privhub-files-tags/src/index.ts:54`）；RAG 虽然解析 frontmatter（`privhub-svc-rag/src/index.ts:137-139,300-304`）但只读 `rag` / `type`，**从不读 `tags`**；`svc-meta` 也没有任何 frontmatter 导入路径。
- 改法：在 `file:saved` / `file:changed` 的处理里，解析 frontmatter `tags` 并 `merge` 进 `svc-meta`（与标签插件 `setTags` 同一条写路径，避免两个写入方打架）。要定优先级：sidecar 为准还是 frontmatter 为准（建议 frontmatter 变更时覆盖同名项，sidecar 独占项保留）。
- 验收：手写 frontmatter `tags: [合同]` 保存后，图谱里该文件立刻连到该标签团。

### 2.3 改法 B：文件级 ACL 过滤（`自定`，安全）P0

- 见 §0.2。KG 尤其危险——节点、边、标签团三处都会带出被拒绝的文件名。

### 2.4 改法 C：反向链接面板（`照 nowen-note 改`）P1

- nowen 参照：`BacklinksPanel.tsx`——编辑器工具栏打开的**右侧抽屉**，两个 Tab：「反向链接 N」（按来源笔记分组折叠，条目带摘要，点击跳转）+「关系图谱」。
- PrivHub 现状：**完全没有反链概念**。
- 改法：新增"某文件的引用者"查询（KG 已有 `[[x]]` 解析能力，反向索引即可），挂到右侧详情面板（`privhub-files-explorer-v3/client/detail.js`）或 KG 视图侧栏。
- 验收：A.md 写 `[[B]]`，打开 B 的反链面板能看到 A。

### 2.5 改法 D：边分型 + 局部/全局切换 + 图例（`照 nowen-note 改`）P1

- nowen 参照：边过滤"全部 / 笔记链接 / 块链接"，图例实线=笔记、虚线=块；下拉切"当前笔记局部图 / 全局关系图"；底部"N 节点 / M 边"。
- PrivHub 现状：只有一种无向边，无图例、无局部图。
- 改法：把 KG 的两类边（双链 / 标签共现）分型着色 + 图例 + 过滤开关；加"聚焦当前文件"的局部图模式。
- 验收：切换过滤只留双链边；聚焦某文件时只显示其一跳邻域。

### 2.6 改法 E：ID 化链接（`照 nowen-note 改`）P2（改动较大）

- nowen 参照：链接基于 **noteId** 而非标题——`[[note:<uuid>]]`、`[[note:<uuid>|别名]]`、`[[note:<uuid>#blk:<blockId>]]`，输入 `[[`/`【【` 触发自动补全（`noteLinkSyntax.ts` / `NoteLinkExtension.tsx` / `NoteLinkPreview.tsx`），**改名不断链**；存储表 `note_links`，**每条写入路径都自动重建**（`routes/notes.ts:732,1218` 等）。
- PrivHub 现状：按文件名匹配 ⇒ 改名断链；同名不同目录取第一个（`kg/src/index.ts:127`）。
- 改法：md 里引入稳定 ID（frontmatter `id:` 或 sidecar 映射），`[[名]]` 保留为兼容语法、解析时经"名→ID"表白名单；新增块锚点可后置。
- 验收：把被引用的文件重命名，图谱边与反链不断。

### 2.7 改法 F：布局与交互（`自定`——**nowen 也没有，需要单独方案**）P1

- 问题：nowen 与 PrivHub **都是手写环形 SVG**，固定画布、节点一多必重叠；nowen 也没有缩放/拖拽/力导。照 it 改没有出路。
- 建议方案：
  1. **力导向布局**：引 `d3-force`（体积小、无渲染绑定，只算坐标）或自研简单 force；节点/边过千时降级为聚类视图。
  2. **平移缩放**：滚轮缩放 + 拖拽平移 + 双击复位（现在只有缩放按钮）。
  3. **图内搜索**：输入即高亮命中节点并聚焦。
  4. **过滤**：按标签 / 按目录 / 按度数阈值 / "只看孤立节点"。
  5. **画布自适应**：`W/H` 改为读容器尺寸，不用写死 860×520。
- 验收：50+ 节点不再重叠成球；能拖能缩能搜。

### 2.8 改法 G：规模与性能保护（`自定`）P1

- 问题：标签团是 O(k²)（`:173-177`），热点标签会炸边；构建**串行** `await meta.getTags` + 逐 md `readMd`（`:143-163`），大项目慢；无节点/边上限；md 读取上限 512KB（`:118`）。
- 改法：① 节点/边上限 + 超出提示"仅显示 Top-N（按度数）"；② `getTags`/`readMd` 并发化（含并发上限）；③ 增量重建（只重算变更文件涉及的边）。
- 验收：在标称规模的样例项目上，图谱接口响应 < 1s 且有上限保护。

### 2.9 改法 H：Wiki 的处置（`自定`）P2

- 三条路，建议二选一（见需决策项 Q3）：
  - **合并**：Wiki 作为 KG 的"单页阅读态"，共用一套链接解析；
  - **降级**：Wiki 只保留"渲染当前目录 README"这一件事，明确它**不是**知识库，双链交给 KG；
  - **砍掉**。
- 无论选哪条：先删 `:116` 恒等死分支，先修"点链接即退出视图"。

### 2.10 需你拍板的图谱口径问题

| # | 问题 | 影响 |
|---|---|---|
| Q3 | **Wiki 与 KG 合并 / 降级 / 砍掉？** | 决定 §2.9、§0.3 的改法；也决定是否要投工做统一链接解析 |
| Q4 | 双链要不要 ID 化（§2.6）？ | 不做则"改名断链"长期存在；做则要动 md 写入链（edit-md / 模板 / 导入），是这三个模块里最大的一次结构改动 |
| Q5 | 图谱要不要引第三方力导向库？ | 引库 vs 自研；本项目"无构建步骤"，引库要评估以 ES module 形式直接 `<script>`/`import` 的可用性 |

---

## 三、查重

> nowen 的结论：**部分有，而且比 PrivHub 少**——它只有「上传时 SHA-256 去重（引用计数）」+「新建笔记时标题碰撞提示」，**没有**独立的查重扫描页。
> 所以这一节：**扫描页的改进是 `自定`；上传期去重与标题提示可以 `照 nowen-note 改`。**

### 3.1 现状（PrivHub）

- 入口：文件页顶栏「🔁 查重」（`privhub-files-explorer-v3/client/panel.js:869`）→ `openRagDup`（`privhub-svc-rag/client/index.js:1088-1095`）→ AI 工具 → 🔁 查重页签（`RagView`，`:1100-1126`）。
- 面板：`RagDupPanel`（`privhub-svc-rag/client/index.js:366-573`）。
- 数据：`GET /privhub/api/rag/dup?project=`（`:412`）→ `{ fileGroups, contentGroups }`；每组 `{ name, sizeText, count, files:[{ path, mtime | updated }] }`（模板 `:514-551`）。
- 两类：📄 同名同大小（所有文件类型）、🧬 内容一字不差（语料内可解析文档）。
- 删除：逐条 `POST /privhub/api/delete { project, path }`（`:479`）→ 进回收站；结束后 `trash:changed` + 自动重扫（`:486-487`）。
- 交互：每组"保留 1 个"（radio）+ 勾选要删的（checkbox）；底部**常驻**操作栏（`:556-569`，注释记录过"按钮随内容滚出屏幕"的老 bug 已修）。

### 3.1.1 后端判定口径（补测）

- 路由：`GET /privhub/api/rag/dup?project=`（`privhub-svc-rag/src/index.ts:1305-1318`），算法 `dupCheckProject`（`:586-638`）；权限只到项目级（`requireUser` → `canAccess` → 403 → 个人空间 400）。
- 返回结构（`:586-589`）：
  - `fileGroups[]` = `{ name, size, sizeText, count, files:[{ path, mtime }] }`，按 size 降序（`:615`）；`mtime` 格式化 `YYYY-MM-DD HH:mm`（`:612`）。
  - `contentGroups[]` = `{ count, files:[{ path, size, updated }] }`，按份数降序（`:635`）。
- **「同名同大小」的分组键是 `name + '\u0000' + size`（`:595`）——纯文件名 + 字节大小，完全不读内容**。即"同名的两个空文件"或"同名同大小但内容不同"都会被判成重复（**误报**，见 §3.2-A2）。
- **「内容一字不差」用 sha256**：`dupHash = sha256(normalizeText(text))`（`:379`），在**语料摄取时**算好存进 manifest（`:343-399`），查重时**直接复用 `d.dupHash`**，不重算、不复用 minHash（`:618-628`）。`normalizeText` 先去 BOM/零宽、CRLF 归一、压缩空行（`:129-135`）。
- **缓存**：manifest 即缓存，**没有查重结果缓存**；每次请求都重新 `walkProjectFiles` + `loadManifest` + 逐条 `resolveReal`/`existsSync`（`:592,618-624`）。
- 范围：内容层只对**语料内可解析文档**生效，跳过 `scanOnly`（扫描件 PDF）与未入语料文件（`:620-621`）；**已在 fileGroups 命中的路径不重复列出**（`inFileDup :601,622`）。
- **无分组上限、无分页、无并发上限、无超时**（`:586-638`）；前端切项目即全量重扫（`rag/client/index.js:387-389,406-423`）。
- 删除：逐条 `POST /privhub/api/delete`（`rag/client/index.js:477-483`，非批量、无事务、单条失败仅 toast 继续）；后端 `privhub-files/src/index.ts:296-307`——项目级 `canAccess` → `svc.moveToTrash` 软删进回收站 → 审计 + `file:changed`。该路由**在 ACL 守卫表内**且 `fromBody` 取 path（`privhub-admin-acl/src/index.ts:65`），所以删除动作过 `acl.can('delete')`。

### 3.2 改法 A：查重判定口径修正（`自定`）P0/P1

**A1 — near 死代码（P0）**：见 §0.1。已确认 `nearCandidates` 是 near 的**唯一生产者**、`scanPending`（`:520`）是**唯一调用点**、`kind:'near'` 只有一处（`:531`）⇒ 去掉过滤也仍是空：`score` 写死 0.25 且并非真实相似度（注释里的"共享 band 数 / 总 band"从未实现），连排序都做不到。**near 在整系统（查重页 + 待裁决）都是死的。**

**A2 — 「同名同大小」误报（P1）**：分组键 `name+size`（`:595`）不读内容 ⇒ 同名同大小的**非**重复文件也会被判重复，用户照着一删就删错了。改法：命中同键的组，再比一次内容哈希（正好可复用同一条路径上的 `dupHash`；对不在语料里的文件退化为读文件算 sha256），**相同才归入"重复"，不同则单列为"同名同大小但内容不同"**并明确标注、默认不勾选。

**A3 — 近似 / 版本族进查重页（P1）**：现在查重页只有"一字不差"；**版本族（`scanPending` 的 version 逻辑 `:504-518`）与近似（near）只活在"语料治理 → 待裁决"**，查重页拿不到（`:586-589` 只回两类）。而这恰是"看起来像重复但内容不同"的主力。改法：查重页增设第三类「🧬≈ 近似 / 版本族」，与语料治理**共用同一次计算**（别算两遍）；表格给出相似度百分比与差异提示（行数/字符数差）。

**验收**：① `方案_v1.md` / `方案_v2.md`（改名 + 改两行）出现在近似/版本类，相似度接近 100%，而不是恒 25%；② 造两个同名同大小但内容不同的文件，出现在"同名但内容不同"一栏且默认不勾选；③ 高度相似的非重复文件不误报。

### 3.2.1 改法 A′：删前**预览影响面**、可导出（`自定`）P2

- 现在结果只在前端内存里（无导出、无历史留存）；删除逐条 confirm、逐条请求（`rag/client/index.js:459-488`），删完整页重扫（`:487`）。
- 改法：删前给"将删除 N 项、涉及 K 个目录、进回收站"的确认摘要；结果支持导出 CSV/JSON 清单，便于线下复核后再删。

### 3.3 改法 B：上传期 SHA-256 去重 + 引用计数（`照 nowen-note 改`）P2

- nowen 参照：上传时算 sha256，在同一 `(userId, workspaceId)` 内查同 hash 附件；命中则**复用物理文件 + 克隆一条元数据行**（`backend/src/routes/attachments-core.ts:324-360,640-690`），删除靠 **path 引用计数**，最后一个引用消失才 `unlink`。
- PrivHub 现状：上传不去重（`privhub-files-upload`），所以"同一份文件传两次"是查重页最常见的一类来源。
- 改法注意：PrivHub 是**加密存储**，且 `isEncrypted` 的 size 记账依赖文件长度——做物理复用必须同时处理"两处引用同一份密文"的记账与回收站语义，**风险不低**。
- 建议：先做**只提示不落盘**的轻量版（上传完回一句"与 X 内容相同"），是否做物理复用等 Q6 决策。
- 验收：同一文件传两次，第二次给出"内容重复"提示。

### 3.4 改法 C：标题碰撞即时提示（`照 nowen-note 改`）P2

- nowen 参照：`frontend/src/lib/titleDuplicateAssist.ts`——同笔记本内完全相同、或**公共前缀 ≥ 8 字**时，用红色前缀覆盖层即提示（`TitleDuplicateAssistBridge.tsx`）。
- PrivHub 适用点：新建文档 / 重命名 / 上传（上传另有"文件已存在"的既有逻辑，需对齐口径，别两套提示打架）。
- 验收：同目录输入与已有文件前缀 ≥8 字的名字时，出现红字提示。

### 3.5 改法 D：查重页功能补齐（`自定`）P1/P2

- 跨项目查重（现在只查单项目，`RagDupPanel` 顶栏就是项目下拉）。
- **一键"保留策略"**：每组默认保留最新 / 最旧 / 路径最短，避免逐组手点。
- 大项目：分组数上限 + 进度提示（现在是"正在扫描…"一句）；后端无上限、无分页、无超时（`rag/src/index.ts:586-638`）。
- 导出与删前影响面预览见 §3.2.1，不在此重复。
- 验收：50 组重复的项目，一次点击完成"保留最新、其余全选"。

### 3.6 改法 E：权限与安全（`自定`）P1

- **查重结果同样漏文件级 ACL**：`/rag/dup` 只做项目级 `canAccess`（`privhub-svc-rag/src/index.ts:1310`），`dupCheckProject` 把项目内**全部文件名与路径**列出，**未过 `acl.can(view)`**（对比同一文件的 `ragSearch` 在 `:916` 是做了的）。⇒ 同项目内被文件级 ACL 限制的文件，其路径仍会出现在查重列表里（只读泄漏；真正删除时才被 ACL 拦下）。与 §0.2 同源，**一并修**。
- 只读用户能查能看、删除报无权限（`HELP.dup` 步骤⑤ 的承诺，`:81`）——需实测确认前端是否**提前禁用**删除按钮（当前按钮只看 `delCount/deleting`，`rag/client/index.js:562`，无权限态），否则只读用户会点了才被拒。
- 验收：① 只读账号进查重页，删除按钮置灰并给出原因；② 给某文件配 deny 后，它不再出现在查重结果里。

### 3.7 需你拍板的查重口径问题

| # | 问题 | 影响 |
|---|---|---|
| Q6 | 上传期要不要做**物理去重**（复用密文 + 引用计数）？ | 改动触及加密存储与回收站，风险高；不做则只做"提示" |
| Q7 | 近似/版本族允许**一键删除**吗？ | nowen 的近似只"报告"（L1 不删）；建议查重页对近似类也**默认不勾选**、只提示 |
| Q8 | 查重范围要不要**跨项目**？ | 现在单项目；跨项目意味着可能删到别的项目的文件，权限与文案都要重做 |

---

## 四、建议分批（按"先修坏的、再补能力"）

| 批次 | 内容 | 预估性质 |
|---|---|---|
| **W-A（P0 修复批）** | §0.1 near 死代码；§0.2 图谱/全文/查重三处 ACL 文件级过滤；§2.2 frontmatter tags 同步；§0.3 死分支 | 小改 + 安全，先做 |
| **W-B（AI 对齐批）** | §1.2 profile/预设 → §1.3 模型列表 → §1.4 测试升级 → §1.5 推理段剥离 → §1.6 多轮 | 以 nowen 为蓝本，逐项 |
| **W-C（图谱体验批）** | §2.4 反链 → §2.5 边分型/局部图 → §2.7 布局交互 → §2.8 规模保护 | 前端为主 |
| **W-D（查重完善批）** | §3.2 近似类 → §3.5 补齐 → §3.4/§3.6 提示与权限 | |
| **暂缓** | §2.6 ID 化链接、§3.3 物理去重、§2.9 Wiki 处置 | 等 Q4/Q6/Q3 决策 |

每批沿用仓内规矩：测试只上 3190+（`node tests/run-all.mjs --spawn`），不改既有断言，改动逐条记 `file:line` 并补回归。

---

## 五、证据索引（本轮实测 ✅ / 调查 ⚠️）

- ✅ `privhub/plugins/privhub-svc-rag/src/index.ts:253,261,62` —— near 恒空
- ✅ `privhub/plugins/privhub-files-wiki/client/index.js:116` —— 恒等死分支
- ✅ `privhub/plugins/privhub-files-tags/src/index.ts:54` 是 `setTags` 全仓唯一调用方；`privhub-svc-rag/src/index.ts:137-139,300-304` 解析 frontmatter 但不读 `tags` —— frontmatter 标签对 KG 无效
- ⚠️ `privhub/plugins/privhub-svc-rag/src/index.ts:586-638,595,1305-1318` —— 查重算法：同名同大小只比 name+size（`:595`）、sha256 复用语料 `dupHash`（`:379,618-628`）、无上限无分页、结果漏文件级 ACL（`:1310`）
- ⚠️ `privhub/plugins/privhub-files/src/index.ts:296-307` —— 删除路由（软删进回收站 + 审计），`privhub-admin-acl/src/index.ts:65` 守卫 `fromBody` 取 path
- ✅ `privhub/plugins/privhub-svc-rag/src/index.ts:237,253,261,520,531` —— near 的唯一生产者/唯一调用点/唯一 kind，score 写死、阈值恒空
- ⚠️ `privhub/plugins/privhub-files-kg/src/index.ts:127,140-149,165-177,255` —— 同名取首个 / 标签来源 / O(k²) / 无文件级 ACL
- ⚠️ `privhub/plugins/privhub-files-fulltext/src/index.ts:156` —— 全文只按项目过滤
- ⚠️ `privhub/plugins/privhub-admin-acl/src/index.ts:110-112,167-174`、`privhub-svc-acl/src/index.ts:159-171` —— 守卫只拿 project
- ⚠️ `privhub/plugins/privhub-svc-model/src/index.ts:28-38,233-234,261-290,411`
- ⚠️ `privhub/plugins/privhub-svc-rag/src/index.ts:841-847,860-910,916-919,959-968,981-1110,1422-1451`
- ⚠️ `privhub/plugins/privhub-files-agent/src/index.ts:45-46,107-110,142,218-219,256-258,1015-1023`
- nowen 参照：`backend/src/services/ai-client.ts`、`user-ai-settings.ts`、`backend/src/routes/ai.ts`、`frontend/src/components/AISettingsPanel.tsx`、`EmbeddingSettingsPanel.tsx`、`AIChatPanel.tsx`、`AIWritingAssistant.tsx`、`BacklinksPanel.tsx`、`frontend/src/lib/noteLinkSyntax.ts`、`backend/src/repositories/noteLinksRepository.ts`、`backend/src/routes/attachments-core.ts`、`frontend/src/lib/titleDuplicateAssist.ts`

---

## 六、实施进展

### W-A（P0 修复批）· 已落地（2026-10-11）

| 项 | 改动（`file:line`） | 验收 |
|---|---|---|
| §0.1 near 死代码 | `privhub-svc-rag/src/index.ts`：删掉写死的 `score = 0.25`；新增 `minHashSimilarity()`（签名逐位一致比例）+ 重写 `nearCandidates()`（LSH 分桶出候选 → 估计相似度 → 阈值过滤 → 同一对只在首次撞桶时计算） | 新增套件 near 用例：40 行共享正文的两篇判为同组，内容无关的第三篇不误报 |
| §0.2a 图谱 | `privhub-files-kg/src/index.ts`：`inject` 加 `acl`；抽出 `deriveStructure(nodes, edges)`；新增 `restrictGraph(graph, user, project)` —— 逐文件 `acl.can(view)` 过滤，**先摘节点/边、再重算**社区与洞察（只摘不重算时 `hubs` / `topTags` 仍会带出被拒文件名） | 用例：被拒文件名从 `JSON.stringify(graph)` 整包里消失 |
| §0.2b 全文检索 | `privhub-files-fulltext/src/index.ts`：`inject` 加 `acl`，命中逐条 `acl.can(view)` 过滤 | 用例：被拒文件的片段不再出现在 `hits` |
| §0.2c 查重 | `privhub-svc-rag/src/index.ts`：新增 `aclAllows()`；`dupCheckProject(ctx, project, user)` 在 `walkProjectFiles` 与 manifest 两处过滤 | 用例：被拒文件从 fileGroups + contentGroups 双双消失；另设**对照组**证明不是把结果整片清空 |
| §0.3 死分支 | `privhub-files-wiki/client/index.js:118`：`if (!r.ok \|\| !r.ok && !r.status)` → `if (!r.ok)`（语义不变） | 前端模板静态套件 |
| §2.2 frontmatter tags | `privhub-files-kg/src/index.ts`：新增 `frontmatterTags()`（支持 `tags: [a, b]`、`tags: a, b`、YAML 列表三种写法）+ `mergeTags()`；节点标签 = sidecar ∪ frontmatter。顺带把 `file:changed` 也纳入缓存失效（此前上传的新文件要等 60s TTL 才上图） | 用例：两种写法的 frontmatter 标签都进节点，且两篇共享标签时**生成 tag 共现边**（= 原文验收「立刻连到该标签团」） |

**两处偏离原文，需知会：**

1. **§0.1 的相似度算法**：原文写"共享 band 数 / 总 band"。该式只有 5 个离散档（0 / 0.25 / 0.5 / 0.75 / 1），阈值 0.55 正落在 0.5→0.75 的缝里 ⇒ 实际等价于"必须 3/4 band 命中"，且永远给不出 §3.2-A3 想要的"相似度接近 100%"。改为标准 MinHash 估计量（签名逐位一致比例），阈值 `NEAR_THRESHOLD = 0.55` 与"只报告不自动删"的口径均未动。
2. **§2.2 采用读侧合并**，未做写侧同步进 `data/meta.json`。写侧会引入第二个 meta.json 写入方，且必须给 meta 增加**来源字段**才能避免"界面删掉 frontmatter 标签、下次保存又回来"。读侧合并零写入、零迁移、可逆，先让图谱正确；标签云 / 筛选口径的统一随 W-C 一起做。

**回归**：新增 HTTP 套件 `privhub/tests/acl-file-filter.mjs`（8 条，已登记进 `tests/run-all.mjs`）。`node tests/run-all.mjs --spawn` ⇒ **总计 1216 通过 / 0 失败**（HTTP 批 128 / 静态批 1088），逐套件数与改动前基线一致，无既有断言被改动。

### W-B（AI 对齐批）· 已落地（2026-10-11）

| 项 | 改动（`file:line`） | 验收 |
|---|---|---|
| §1.5 密钥外泄 + 错误脱敏 | `privhub-svc-model/src/index.ts`：`endpointLabel()` 追加 query 脱敏（`:175-180` 的 `.replace(/\?[^#]*/, '?…')`）；`call()` 的网络错误、`probe()` 的 catch 一律过 `sanitizeError`（`:328`）。`privhub-svc-rag/src/index.ts:32` 引入 `sanitizeError` 并加注释「用户可见文本的最后一道边界」；三处出口脱敏 —— search 500 `:1503`、ask SSE `error` 帧 `:1560`、ask 非流式 400 `:1572` | `tests/model-parsing.mjs` §5b：带 `?api_key=…` 的死端点，错误文案既不含密钥、又仍点名 host:port |
| §1.4 自检升级（深检） | `svc-model`：`ModelHealth.ok` 增 `dims?/latencyMs?`、新增 `embed-error`（`:42-50`）；`check(ctx, force, deep)` `:274`，新增 `deepCheckEmbedding()` `:298`（真调一次 embedding；回维数+耗时；失败 ⇒ `embed-error`；不吃 60s 缓存）。`svc-rag` `/api/model/status` 认 `?deep=1`（`:1378-1379`）。`client`：`checkModel(deep)` `:835`、`saveAndTest()` `:848`，按钮改为**保存并测试 / 连通自检 / 仅保存** `:972-973`；`privhub-shell-home/client/index.js:36,45` 补 `embed-error` 文案与颜色 | `model-parsing.mjs` §7（浅检不打向量接口且回模型清单；深检回 `dims=8`+耗时；端点通但向量形状不对 ⇒ `embed-error` 而 `llm` 仍 `ok`）；`frontend-templates.mjs` 模型状态数为 7 |
| §1.3 模型名可填 | `privhub-svc-rag/client/index.js`：`modelNames()` computed `:590` 取自检回包已有的 `models[]`；两个 `<datalist>` `:980-981` 接给输入框 | `model-parsing.mjs` §7 断言浅检确实带回 `models`（`qwen3:8b`） |
| §1.6 多轮对话 | `svc-rag`：`HISTORY_MAX_MSGS/HISTORY_MAX_CHARS` + `sanitizeHistory()` `:1027-1043`；`ragPrepare/ragAsk` 增 `history`（只拼进 messages、**不进 ragSearch**）；路由读 `body.history` 并传给两条分支 `:1519/:1548/:1570`。`client`：`qaTurns` 气泡 + `qaRounds` computed `:595` + `🆕 新会话` `newChat()` `:646` + `qaHistoryPayload()` `:643`；模板 `:1151-1175` | `rag-resilience.mjs` §1.6（15 条）：假上游抓到「历史确实进了 messages」「system 仍在首、本轮问题仍在尾」「超量截到最近 6 条」「`system` 角色/非字符串/空白条目被丢弃，只留一条 system」 |
| §1.7 检索方式标注 | `svc-rag`：`RetrievalMode` / `RagSearchResult` `:897-907`；`ragSearch` 按「向量通道是否真的跑了」定 mode `:942`（未建索引 / 调用失败 / 维数不符 ⇒ `keyword` + 人话原因）；新增 `retrieval` SSE 帧 `:1548`，并在 `done`、非流式、`/rag/search` 三处回带 mode。`client`：`modeText(t)` 徽标 `:635` + 气泡内展示 `:1158` | `rag-resilience.mjs` §1.7（11 条）：无索引 ⇒ `keyword` + 原因且关键词仍命中；`retrieval` 帧落在 sources 与 delta 之间；建索引后如实改口 `hybrid` 且不带降级原因 |

**W-B 三处偏离原文，需知会：**

1. **§1.3 不做「按输入框里未保存的地址实时代拉模型清单」**。那需要新增一条「用任意 baseURL 发起服务端请求」的路由 —— 一个未纳入 `GUARD_PATHS`、未审计的任意地址请求原语。改为把自检**已经拿回来**的 `models[]` 接成 `datalist`：同样能点选，且不新开权限面。
2. **§1.5 的真实待办比原文小**。原文提到的「剥离 reasoning」动工前已在 `parseChatText` 里；且 `svc-model` **本就不注册任何 HTTP 路由**（路由都在 `svc-rag`）。因此 §1.5 实际只剩「密钥外泄 + 错误脱敏」，本轮只做这部分。
3. **§1.7 保留 RRF，未退回阶梯检索**（按原文要求）；SSE 事件名用现有契约 `sources`（原文写作 `references`，为旧名），新增的是 `retrieval`。

**未动项：§1.2 多 Profile** —— 原文 Q1（模型配置「全局 vs 按用户」）尚未拍板，而它决定 `data/model.json` 的数据模型。拍板前改结构等于返工，故整项挂起。

**回归**：`node tests/run-all.mjs --spawn` ⇒ **总计 1258 通过 / 0 失败**（HTTP 批 128 / 静态批 1130）。本批新增断言：`rag-resilience.mjs` 66 → 92（+26：§1.7 的 11 条 + §1.6 的 15 条）、`model-parsing.mjs` 48 → 64（+16）。
**唯一改动的既有断言**：`tests/frontend-templates.mjs` 的「模型状态种类数 6 → 7」—— 该断言本就是为「新增状态时必须同步更新」而写的（改动已在该批注明）；其余既有断言一条未松。

### W-C（图谱体验批）· 已落地（2026-10-11）

| 项 | 改动（`file:line`） | 验收 |
|---|---|---|
| §2.4 反向链接 | `privhub-files-kg/src/index.ts`：新增 `backlinksFor(project, path, user)` `:324`（复用图缓存的 link 边方向语义，O(E) 过滤，不另建反向索引）+ 路由 `/privhub/api/kg/backlinks` `:457`。**两层 ACL**：`privhub-admin-acl/src/index.ts:115` 登记 `view` 守卫管住「被查询的那个文件」；handler 内对**引用方与目标逐条** `acl.can(view)`，否则"谁引用了它"会漏出无权文件的正文片段（这是全仓唯一返回他文件正文片段的接口）。UI：`privhub-files-explorer-v3/client/detail.js` 反链区块 `:227`（入链/出链各带一行摘要，点击定位到来源文件 `openRef` `:127`）+ 样式 `styles.js:177` | `acl-file-filter.mjs` 新增用例：A 引用 B ⇒ B 的反链能看到 A 且带摘要、B 无出链、A 的出链含 B；给 A 配 deny 后 A 从 B 的反链消失、响应体里不含 A 的路径、`/kg/backlinks?path=A` 直接 403 |
| §2.5 边分型 + 图例 + 局部图 | `privhub-files-kg/client/index.js`：`visibleGraph` `:65` 按边分型收窄；图例（实线=双链 / 虚线=标签共现）与"显示 N 节点 / M 边 / 连通分量"计数；`🎯 聚焦选中文件` → `focusPath` 局部一跳图 `:420` | `tests/kg-layout.mjs`：只留双链/只留标签的边集合全对；聚焦时"节点数 = 1 + 一跳边数"（看不到二跳） |
| §2.7 布局与交互 | `privhub-files-kg/client/index.js`：`layout()` `:219` = **自研力导向**（FR：黄金角螺旋种子 → 斥力/引力退火 → fit-to-view → **去重叠迭代** → 仅超框时等比回缩）；滚轮以指针为中心缩放 `zoomAt` `:389`、拖拽平移（window 监听，`beforeUnmount` 解绑）、双击复位 `resetView` `:383`、图内搜索高亮 + 回车聚焦 `focusHit` `:414`、按标签/目录/度数过滤 + 只看孤立节点（`dirOf` `:28`）、画布尺寸改由 `ResizeObserver` 读容器（不再写死 860×520） | `tests/kg-layout.mjs`（**新增静态套件**，53 条）：n=12/60/150/400 四档均「无重叠节点对」（圆心距 ≥ 两半径之和）、坐标有限且全在留白内、**两次布局逐位一致**（确定性，不依赖随机数）、400 节点 < 3s（实测 ~110ms） |
| §2.8 规模与性能保护 | `privhub-files-kg/src/index.ts`：`NODE_CAP=400` / `EDGE_CAP=1500` / `TAG_CLIQUE_MAX=40` / `IO_CONCURRENCY=8` 与 `mapLimit()` `:82-106`；`buildGraph` 把 `readMd`/`getTags` 由串行改并发、标签团单团截断、按度数截断节点与边并回带 `truncated` `:429`（`restrictGraph` 也透传它）。界面：`truncNote` `:155` 明说"仅显示 Top-N（节点 x/y、边 m/n）"，不静默截断 | `acl-file-filter.mjs`：小项目**不得**被截断（误伤正常项目等于故障）；`kg-layout.mjs`：未截断无提示、截断提示带"实显/总量"、仅标签团被截断也要提示 |

**W-C 三处偏离/未做，需知会：**

1. **§2.7→①不引 `d3-force`，改自研**（Q5 未拍板 + 本项目无构建步骤：引库要把一份产物 vendor 进插件目录并长期跟版本，而这里只需要"算坐标"这一件事）。代价是自己保证"不重叠"——过程里实测踩到两次真实缺陷并已修：**硬夹取导致节点沿边框叠成一条线**（n=120 最近点距只剩 3px、n=400 直接重合）、**回缩时只缩坐标不缩半径**破坏"圆心距 ≥ 两半径之和"（400 节点又冒出 32 对重叠）。这两条正是"改造前糊成一团"的复发路径，所以新增的 `kg-layout.mjs` 把"无重叠对"写成了硬断言。
2. **§2.8③ 增量重建未做**：目前仍是"事件失效 + 60s TTL 后整图重建"。增量（只重算变更文件涉及的边）要先有"边→来源文件"的反向索引与删除语义，属结构改动，本轮只做①②（上限 + 并发）。在标称规模上接口已回到百毫秒级。
3. **§2.7→④ 的"按度数阈值"判的是全图度数**（不是过滤后残余度数）。过滤会剪掉连向被滤节点的边，用残余度数回判必然对不上 —— 这不是 bug 是口径，已写进套件注释。

**未动项**：§2.6 ID 化链接（Q4）、§2.9 Wiki 处置（Q3）—— 均待拍板。

**回归**：`node tests/run-all.mjs --spawn` ⇒ **总计 1312 通过 / 0 失败**（HTTP 批 129 / 静态批 1183）。本批新增断言：`kg-layout.mjs` 53（新套件，已登记进 `tests/run-all.mjs` 的静态批）、`acl-file-filter.mjs` 8 → 9（§2.4 反链用例）。**无任何既有断言被改动**。

### W-D（查重完善批）· 已落地（2026-10-11）

| 项 | 改动（`file:line`） | 验收 |
|---|---|---|
| §3.2-A2 查重判据修正（P0） | `privhub-svc-rag/src/index.ts`：新增 `fingerprintOf()` `:677`（语料内直接复用摄取时算好的 `dupHash`；语料外现场算——文本类走**同一套 `normalizeText`**，二进制按原始字节 `sha256`，>8MB 返回 `null` 表示"未校验"）与 `canDeleteFile()` `:654`；`dupCheckProject()` `:735` 组内逐份算指纹 → `verdict: same/differ/unknown`，只有 `same` 的成员才带 `sameAs` 且只有 `same` 组进入"已覆盖"集合。界面 `client/index.js:669` 三种徽标（✅内容一致 / ⚠名字大小一样但内容不同 / ？未能校验）——`differ` 组**不显示保留/删除控件** | `tests/dup-verdict.mjs`（**新增 HTTP 套件**，6 条）：同名同大小但内容不同 ⇒ `verdict=differ` 且 `sameAs` 全为 null；内容一致 ⇒ `verdict=same`、两份指纹相同且 `sameAs` 双向成立 |
| §3.2-A3 近似/版本族进查重页 | `privhub-svc-rag/src/index.ts`：先把治理页的精确/版本/近似分析抽成 `corpusGroups(docs)` `:528`（`scanPending` `:593` 变成一行包装），查重页再以**本项目语料**喂同一段算法（`:816` 起），回带 `nearGroups`（带 `score`/`label`/`reason`）与 `nearGroupsTotal`/`caps`；已在文件层/内容层列过的路径从近似族剔除。界面 `client/index.js:714` 只读展示（相似度百分比 + 中文说明），**不参与"每组保留 1 个"的删除流程** | `dup-verdict.mjs`：40 行共享 + 1 行不同的两篇进入 `nearGroups`、`score ∈ (0,1]`、`reason` 非空、`nearGroupsTotal ≥ nearGroups.length`、不与精确重复项重复列出 |
| §3.2.1 删前预览影响面 + 可导出 | `client/index.js`：`impact()` `:548`（逐组列出"保留哪份 / 删哪几份"）与 `exportAs(fmt)` `:563`（CSV/JSON 下载，CSV 带 BOM 便于 Excel 打开）；操作栏 `:748` 起为「👁 预览影响 / ⬇ CSV / ⬇ JSON」；`doDelete` `:596` 的确认框内嵌影响摘要 | 静态 `frontend-templates.mjs` 模板编译通过；行为由 `dup-verdict.mjs` 的返回结构保证（导出/预览是纯前端派生，不新增接口） |
| §3.5 保留策略 + 上限/进度如实上报 | `client/index.js`：`applyStrategy()` `:497`（保留最新 / 最旧 / 路径最短三选一，一键套用；**跳过无权删除的项并告知数量**）；服务端 `NEAR_GROUP_CAP = 30` `:693` + `nearGroupsTotal`，界面 `:722` 明说"已显示前 N 组（共 M 组）" | `dup-verdict.mjs`：`caps.nearGroups > 0` 且 `nearGroupsTotal` 与实际组数一致 |
| §3.6 只读账号删除守卫前置（P1） | 服务端 `canDeleteFile()` `:654` 在每个返回项上回带 `canDelete`（`acl.can(user,'delete',…)`，未命中规则视为放行由项目级兜底）；界面按 `canDelete === false` 置灰删除框 + 标「🔒 只读」，`delBlocked` 计算属性 `:403` 在提交前就地拦下并点名。**真正的裁决仍在 `/privhub/api/delete` 的 ACL 守卫**（此处只是把"点了才被拒"提前成"点不了 + 说原因"） | `dup-verdict.mjs`：给某文件打 `read` 档（放行 view、拒 delete）后它**仍在结果里可见**但 `canDelete=false`，未受限的对照文件 `canDelete=true` |
| §3.4 标题碰撞即时提示（P2，子智能体实现、本批验收） | 新增纯模块 `plugins/privhub-files-explorer-v3/client/collide.js:54` `titleCollision(names, value)`（整名为主 + 基名兜底、按**码点**算前缀、阈值 8 字）；三处调用方：侧栏树 `client/tree.js:29`、文件表行内重命名 `client/panel.js:233`、新建文档向导 `plugins/privhub-files-template/client/index.js:85`。拿不到目录树缓存时**不提示**（宁可沉默，也不指出错的撞名对象） | `tests/title-collision.mjs`（**新增静态套件**，21 条）：exact/prefix/无冲突三态、大小写不敏感、中文按字符、基名包含关系、空输入与 `null` 不报错、多候选取最长前缀、与候选顺序无关 | 跨插件静态 import（template → explorer-v3 的 collide.js）已用**真实服务**验证：带会话请求 `/privhub-plugins/privhub-files-explorer-v3/collide.js` 返回 200 且正文含 `export function titleCollision`（浏览器把相对路径中的 `../` 归一化后再请求，服务端静态路由按 `plugins/<插件>/client/<文件>` 映射，任意 client 内文件都可达）。

**W-D 三处需知会：**

1. **近似/版本族在查重页只读、不带删除勾选**：§3.2-A3 的验收只要求"能在查重页看到近似/版本族"，而 Q7（近似组是否默认参与一键删除）未拍板——**未拍板的事不替用户做主**，故本轮只呈现 + 给相似度，删除仍走已有的人工勾选路径。
2. **§3.5 的适用范围仍是"单项目"**（Q8 未拍板）：查重页保持项目内自洽，治理页跨库。两处**共用 `corpusGroups` 同一段算法**，只是输入范围不同——若各写一份，两边口径迟早漂移，用户会在两个页面看到对同一批文件的不同结论。
3. **§3.3 上传期 SHA-256 物理去重未做**（Q6 未拍板）：属"改上传主链路 + 引用计数"，风险面与收益都大，等拍板。
4. **新增了本仓第一处跨插件 client import**（`privhub-files-template` 直接 import `../privhub-files-explorer-v3/client/collide.js`）。这是有意的取舍：撞名口径只能有一份实现，抄一份到 template 里迟早两边漂移（本批 §3.2-A3 抽 `corpusGroups` 正是同一个理由）。`integrity.mjs` 的「模块只引用同目录文件」契约只强制 explorer-v3 / admin-console，template 不在名单内，套件不报；**已用真实服务验证该 URL 可达**（见上表）。唯一的残留不确定性是"浏览器里是否真的加载成功"——静态套件与 curl 都只验到模块可解析 + 可服务，无浏览器可验。若日后更看重插件自包含，可改为内置等价纯函数（代价：两份口径）。

**未动项**：§2.6 ID 化链接（Q4）、§2.9 Wiki 处置（Q3）、§3.3 物理去重（Q6）、§3.5 跨项目口径（Q8）—— 均待拍板。

**回归**：`node tests/run-all.mjs --spawn` ⇒ **总计 1339 通过 / 0 失败**（HTTP 批 135 / 静态批 1204）。本批新增断言：`dup-verdict.mjs` 6（新 HTTP 套件）、`title-collision.mjs` 21（新静态套件），两者均已登记进 `tests/run-all.mjs`。**无任何既有断言被改动**（W-C 时登记的 `kg-layout.mjs` 53 仍全绿）。`node tests/rag-resilience.mjs` 单独跑 92/0；批量跑时偶发一次"向量索引前置未就绪"（端口/时序抖动），单独重跑即恢复，与本批改动无关。
