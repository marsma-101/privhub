# PrivHub-需求文件

用途：需求基线。所有功能决策、选型结论以此为准。  
配套：PrivHub-架构与功能说明.md（架构/功能全景）、PrivHub-插件实现规则.md（插件治理）、功能完成度盘点（docs/v2/，状态追踪）。

## 1. 项目定位

名称：私域枢纽（PrivHub）— 公司专用文件管理系统
目标：局域网内所有终端通过浏览器访问宿主机共享文件夹，实现文件浏览、上传、下载与管理。
形态：Cordis 底座，仿 DSH 的插件挂载形式，完全独立于 DSH 原程序。
宿主机：Windows 原生环境，低配置，仅作服务器。

## 2. 权限模型（方案C）

三层维度：角色（admin/user）、范围（项目/目录）、操作（看/传/下/改/删）。
当前落地：角色 + 项目级范围（目录树继承），细粒度权限暂缓。
磁盘结构：data-files/ 下按项目分文件夹（如 A项目/），权限绑定在项目文件夹上。

## 3. 知识库演进方向（规划）

路线：不另部署独立产品，在 PrivHub 上扩展（复用账号/权限/目录树）。
能力顺序：Markdown 在线编辑 → 全文搜索 → 版本历史 → 知识关联 → AI 问答（后话）。
参考约束：nashsu/llm\_wiki 等开源项目仅参考功能设计，不拷贝源码（GPL-3.0 限制）。

## 4. 功能选型清单（2026-08-28 三轮回合确认 + 补充调整）

分四档：🟢 本轮重构期实施 · 🟠 阶段三优先 · 🟡 阶段三后话 · ⚪ 不做

### 🟢 第一梯队 — 本轮重构期实施（低成本·高感知）

| 编号 | 功能 | 说明 |
| --- | --- | --- |
| A1 | 工作区图标栏 | 窄条图标 + hover 气泡 + 角标计数（桌面 wiki 式） |
| A2 | 面板可拖拽/可折叠 | 左/右面板拖动调宽、折叠收起 |
| A3 | 内容区多标签页 | 同时打开多个文件（✅ 2026-08-31 V3：文件级标签栏，VS Code 式，中央主区渲染，除非关闭否则常驻；按用户隔离 + 权限过滤 + 刷新恢复） |
| B6 | 目录树 + 文件面板 | 已有，重构迁移至 client 插件（✅ 2026-08-31 V3：privhub-files-explorer-v3 新插件——树同时显示文件夹与文件，每节点 ⋯ 操作菜单：详情/权限/收藏/下载/编辑/重命名/新建子文件夹/上传到该文件夹/删除；中间栏仅列表视图且只显示文件（文件夹在左侧树管理）；排序移入表头点击；功能按钮迁入侧边栏（新建文件夹/添加文件/上传文件夹）与 ⋯ 菜单；旧 explorer/preview/shell-tabs 移入 _retired-v2 作退路，tag v2） |
| B7 | 文件预览 | 图片/文本/PDF/Office（docx/xlsx/pptx → Markdown）已有；全格式预览已列入本轮（✅ 2026-08-30）；✅ 2026-08-31 新增右侧详情面板（选中/打开文件即显示：类型/大小/修改时间/项目/完整路径 + 标签增删 + 功能按钮：收藏/复制路径/下载/编辑/权限；向量数据库/分享链接/版本历史 标记开发中；详情弹窗取消） |
| B8 | 搜索 | 先做文件名搜索；内容全文搜索与 C15 合并 |
| B9 | 回收站 | 已有（30天清除/恢复），迁移至 client 插件 |
| B10 | 批量操作 | 多选 + 批量移动/删除/下载 |
| 新增 | 项目内查重 | （✅ 2026-08-31 初版：交互置于搜索页（🔁 查重页签），递归扫描当前项目，文件名+大小均相同判重，分组展示；每组单选保留（默认第一个）、勾选其余移入回收站；删除后自动重扫；无权限项目 403。**✅ 2026-09-05 M2.6 迁移合并**：搜索页查重移除，规则并入 AI 工具「🔁 查重」项目查重页——同名同大小（文件层，全类型）+ 内容一字不差（语料层）双规则并列，文件夹页顶栏 🔁 查重 按钮直达，全员可用） |
| B11 | 拖拽上传 + 整文件夹递归上传 | 已有拖拽；✅ 2026-08-31 增加文件夹上传入口：侧边栏「📁⬆」按钮（上传到当前目录）+ 文件夹 ⋯ 菜单「📁 上传到该文件夹」（指定目标目录）；子目录自动创建、同名覆盖；修复拖拽子目录时目录建到项目根的 bug |
| B11 | 拖拽上传 + 整文件夹递归上传 | — |
| B12 | 上传进度队列 | 进度条/失败重试 |
| B13 | 审计日志 | JSONL + 导出 CSV，保存 60 天 |
| D25 | 系统设置面板 | 主题/默认视图/上传限制等 |
| 新增 | 字体大小调节 | （✅ 2026-08-31：两档独立——顶栏「A−/100%/A+」页面整体缩放（html.zoom，80%~140%），内容区「A−/13.5px/A+」预览内容字体（10~24px，md/文本/Office 渲染共用变量）；均 localStorage 持久化） |
| 新增 | 借鉴 WorkBuddy 无 AI 功能集 | （✅ 2026-08-31：① 侧边栏「+」聚合菜单：新建文档/数据表/页面/数据看板/上传；② 行内重命名（⋯ 菜单，回车/Esc）；③ 复制副本「原名（副本）」；④ 移动：目录树选择器；⑤ 空状态引导；⑥ 删除确认写明后果；⑦ 图片 lightbox；⑧ 邀请链接（privhub-files-invite：永久/限时邀请码、用码加入、撤销）；⑨ 通用版本历史（privhub-files-versions：文本文件快照 20 版、预览、恢复自动生成新版本）；⑩ md→HTML 一键生成页面（privhub-files-mdpage）；⑪ HTML 内网发布（privhub-files-publish：免登录只读链接、有效期、撤销）；⑫ md 选区批注评论（privhub-files-comments：锚点高亮、回复线程、状态流转）；⑬ 数据看板页面模板（privhub-files-dataview：HTML+ph-table 组件双向编辑 xlsx）。多人协同暂缓（svc-collab 服务端已备） |
| 新增 | 文件/文件夹收藏（星标） | 标记常用文件，左侧栏快捷入口 |
| 新增 | 最近打开文件列表 | 工作区首页/顶栏下拉显示最近访问文件 |
| 新增 | 数字水印 | 预览时叠加用户名 + 时间，防截屏外泄 |

### 🟠 第二梯队 — 阶段三优先（中等投入·显著增强管理能力）

| 编号 | 功能 | 说明 |
| --- | --- | --- |
| C14 | Markdown 在线编辑 | frontmatter + 双链 + 历史版本（知识库入口） |
| C15 | 内容全文搜索 | BM25 + CJK bigram（与 B8 合并） |
| C17 | 知识图谱 | 关联图 + 社区发现 + 洞察 |
| 新增 | 细粒度 ACL | 扩展至文件/目录级权限（继承/覆盖），当前项目级权限的上位扩展 |
| 新增 | 文件标签/自定义元数据 | 用户打标签（如"合同""设计稿"），支持按标签筛选 |
| 新增 | 页面模板 + 富文本编辑器增强 | 新建文档可选模板（会议记录/产品需求等），编辑器升级（Milkdown/TipTap → 实际落地 EasyMDE ✅ 2026-08-30） |
| 新增 | Office 文档编辑 | 用户能直接修改 docx/xlsx 内容（✅ 2026-08-30：三插件架构 svc-office 能力库 + office-ui 人工编辑 + office-ai 智能体 API Key 入口；pptx/pdf 只读）；智能体经鉴权读写（C22 已落地基础版 ✅） |
| 新增 | 审计日志可视化面板 | 在 60 天存储基础上，增加前端"操作日志"筛选/查看界面 |
| 新增 | 页面导出 | Markdown 导出 PDF/Word/HTML |
| 新增 | 知识库视图 | 在文件面板上方切换"知识库视图"，将当前目录下的 README.md / index.md 渲染为 Wiki 页面（复用现有目录树 + 权限，零新增存储） |

### 🟡 第三梯队 — 后话（分前后）

优先部分（阶段三后半段可启动） ：

| 编号 | 功能 | 说明 |
| --- | --- | --- |
| C22 | 智能体外部 API/MCP | AI 智能体（Claude Code/Codex 等）经鉴权后读写数据 |
| 新增 | 全文检索引擎 | 引入 Meilisearch / SQLite FTS5，替代纯前端 BM25，支撑更大规模文档检索 |

靠后部分（需评估架构/外部依赖） ：

| 编号 | 功能 | 说明 |
| --- | --- | --- |
| — | 多人实时协同编辑 | CRDT/OT（Yjs/ShareDB），工程复杂度高，与低配 Windows 环境冲突风险大 |
| — | 防病毒扫描 | 依赖 ClamAV 外部进程，可做成可选插件 |
| — | 外链分享 | 生成链接（密码/有效期/只读），功能讨论待定，暂不实施 |
| — | 页面间引用关系图 | 双向链接/反向链接可视化（Obsidian/Logseq 风格） |
| — | 全局键盘快捷键 | 等所有核心功能完成后，再统一补充（备忘） |

### ⚪ 不做

| 编号 | 功能 | 说明 |
| --- | --- | --- |
| A5 | 更新/通知横幅 | 已确认不做 |

## 5. 端口与环境

| 场景 | 端口 |
| --- | --- |
| 开发环境 | 3180 |
| 生产环境（宿主机） | 3181 |

版本：2026-08-28 确认，基于原始需求 + 功能全景调研补充。

这次更新后，需求记录.md 的功能清单更加立体：

第一梯队保障本轮重构的"好用"底线；
第二梯队聚焦知识库融合与管理增强；
第三梯队分出"可先行"与"需观望"两部分，方便未来决策。

## 7. 迭代记录

### 2026-09 迭代（txt 内嵌编辑 + 新建文档向导三步化）
- txt 等文本文件（md/txt/json/csv/log/yaml/ini/py/sh/bat/sql/xml/js/ts/css）现支持内嵌编辑（Trae 式）：
  打开即自动进入编辑（纯文本默认单栏，无 md 预览）；Ctrl+S 保存（/api/text/save）；✕ 只读 恢复只读预览；
  「✏️ 编辑」入口在内容区头部、文件 ⋯/右键菜单、右侧详情面板全部可用（md/Office 不再独占编辑能力）。
- /api/text/save 支持目标不存在时新建（父目录须存在，realpath 防穿越），并补 file:saved 事件 + 审计（与 doc 保存一致）。
- 保存/切换标签/关闭标签后，右侧详情面板保持打开并重新选中当前文件。
- 新建文档向导重做为三步：① 选择格式（Markdown/纯文本/Word/Excel/HTML）→ ② 命名（自动补扩展名、同名检测、非法字符提示）→ ③ 选择保存目录（项目内文件夹树，默认当前目录）；md 可选模板或空白（frontmatter 自动补齐）；创建后回到文件视图并定位新文件。

### 2026-09 Agent API 智能体接口（C22 完整版 · 方案已确认）
- 新建 L3 插件 `privhub-files-agent`（对齐 C22「智能体外部 API/MCP」，已落地基础版 office-ai 的完整版）。
- 已确认决策（详见 `docs/PrivHub-AgentAPI-智能体接口方案.md`）：
  1. 权限模型：**专属空间（.agents/<用户>/<项目>/，隐藏目录，按 key 项目 scope 分区）= 读/写/删/改全能力；项目文件夹 = 只读**（智能体 API 层面硬隔离，写/删/改项目一律 403）。
  2. key 体系：`X-Agent-Key` 与用户绑定（data/agent-api.json，S7 加密），**一项目一 key**（project scope，空=全部可见项目含风险提示）；**用户登录后自助申请**（my-keys）+ admin 代生成（keys）；明文仅创建时返回一次，列表只回 mask；支持可选有效期。
  3. office-ai 一并改造：旧 X-Office-Key 作废统一到 X-Agent-Key，**修复 role:'admin' 硬编码缺陷**（原持 key 者可读写任意项目），office read 遵循项目只读 + ACL，office write 仅限专属空间。
  4. 写语义：专属空间 upsert（同名默认覆盖）+ 覆盖前自动 `.bak-<时间戳>` 备份（保留 5 份轮换）。
  5. 删除：专属空间删除**进回收站**（复用 .trash 机制，TrashRecord.project='.agents/<用户>'），admin 管理页「专属空间回收站」区块可恢复/彻底删除；用户可见入口（AI 收件箱）二期。
  6. 限额：read text ≤4MB / base64 ≤20MB；write text ≤4MB / 二进制 ≤200MB；fork ≤200MB 流式；每 key 限流 180 req/min（写类 40/min）；全量审计（user=ai:<label>，detail 附 via username + project scope）。
- 实施：M1 agent 后端 API → M2 office-ai 改造 + 前端管理页 → M3 测试 + 接入文档 + 本日志；M4 二期（/search、MCP、AI 收件箱）。
- **2026-09-03 升级：方案重制为企业级 v3**（`docs/PrivHub-AgentAPI-智能体接口方案.md` 当前内容 = v3，v2 决策全部保留）：
  - 密钥治理：哈希存储（sha256，明文永不落盘）、状态机（active/suspended/revoked/expired + 轮换宽限期）、IP 条件访问、审批流开关、到期强制（可配）、mask 展示、明文一次性返回。
  - 授权：scope 矩阵（project/directory/all）+ 敏感文件扩展名豁免（.key/.pem/.env 等禁止经 API 读写）。
  - 可靠：X-Idempotency-Key 幂等写（24h 记录）+ If-Match/ETag 乐观并发 + per-path 写锁 + 版本快照（对接 versions 格式，替代 .bak 5 份）+ dryRun 预览。
  - 配额与限流：持久化多维（key/用户/IP，重启不清零）、标准限流头 + Retry-After、专属空间存量配额（默认 500MB/用户）+ 日写次数（500）。
  - 可观测：调用日志（运维 60 天）与审计（合规 180 天哈希链防篡改）分离、Prometheus 指标端点、/healthz、异常自动挂起事件。
  - 契约：OpenAPI 3.1（/openapi.json）、结构化错误码 AGENT-4xxx/5xxx、cursor 分页、请求 ID 贯穿、/v1 稳定 + Sunset 演进。
  - 智能体接入：一期含 MCP(SSE) 端点（满足 C22 原文）+ LLM 工具模板 + 接入/运维手册。
  - 约束声明：零外部依赖（低配宿主机）；单实例 per-path 锁；TLS 建议前置反代、二期内置 https。
- **2026-09-03 v3.1 四修订**（企业级方案定稿）：
  1. 专属空间配额提至 **1GB/用户**（可配）；**日写次数不限额**。
  2. **写并发排队闸门**（§6.3）：写类并发上限 8（可配），超限进有界 FIFO 队列（≤100，满即 429 AGENT-4293），排队超时 30s（429 AGENT-4294）；幂等前置（入队前查幂等键，重试不占队位）；透明头 X-Queue-Position/Wait-Ms/Limit；dryRun 不占队列。读类仍多维限流（写类不再限流）。
  3. **密钥自然月周期**（§3.4）：key 有效期=当月自然月末；无永久选项；到期前 7 天所有响应带 X-Key-Expires 预警头；到期即失效不设宽限；控制台/自助「一键续期」签发同用户同 scope 新 key，新旧并跑至旧 key 到期自然消除；**正规创建路径**：智能体无登录态无法自举 key，首次接入必须人工经控制台签发，接入指南含「首次接入 Skill」（步骤化：人工签发→注入环境变量→/me 验证→/schema 学边界→月度续期纪律→红线重申）。
  4. **网页通道隔离**（§11.1，默认开启）：Agent API 仅认 X-Agent-Key 且拒绝浏览器 UA；网页 API 会话仅接受浏览器 UA，非浏览器 UA 持 session token 调用=通道违规→事件+会话自动停用+审计；管理端点同理（防 AI agent 借网页/会话通道操作服务端文件）；uaAllowlist 豁免登记；控制台「活跃会话与通道」区块。

### 2026-09-05 Agent API M1 网关核心交付
- 新建 `privhub/plugins/privhub-files-agent/`（L3 自动装配，零改 main.ts）：
  - Key 治理：sha256 哈希存储（明文永不落盘）、状态机（active/suspended/revoked/expired 惰性）、自然月周期（X-Key-Expires 到期前 7 天预警头）、IPv4 CIDR 白名单、mask 展示、明文仅创建时一次返回
  - scope 矩阵：project / directory / all（∩ 绑定用户可见项目）+ 项目路径逐请求 ACL view 裁决；项目写/删/改 403 硬隔离（AGENT-4032）
  - 专属空间 `.agents/<用户>/<项目>/` 分区隔离（resolveReal 防穿越）、upsert + .bak 过渡备份、自动建子目录、敏感扩展名豁免（AGENT-4033）
  - 端点：schema / me / projects / list(cursor) / read(text+ETag|base64) / write / fork / rename / delete(进回收站) / keys(admin: CRUD+suspend/resume/rotate) / my-keys(用户自助) / trash(admin: 恢复/彻底删除)
  - 契约：envelope + 结构化错误码 AGENT-4xxx/5xxx + X-Request-Id 贯穿 + 审计双写 S1（user=ai:<label>）
- 测试：`tests/_archive/project-tests/check-agent-api.mjs` **47/47 全绿**（含权限隔离 / 跨项目 / 跨分区 / 回收站恢复 / 状态机 / 月度周期 / 审计）。
- **顺带修复既有 bug（svc-audit）**：`ensureBlockFormat` 用 7 字符 'PHAUD1\0' 比较 8 字节块头 → 永远误判「非块格式」→ 把加密审计文件当明文二次加密，导致 **data/audit.jsonl 损坏**（发现时已 0 条可查，历史约 87 万块多层加密不可恢复）。修复：比较改为 8 字节 'PHAUD1\0\0'（与 storage 写入格式一致）；损坏文件已归档 `audit.jsonl*.damaged-20260905-060718` 并重建，审计自当日起正常写入/查询（注：历史审计记录因此丢失，损坏备件保留待专家恢复）。
- M2 待办：幂等键 + ETag/If-Match + per-path 写锁 + 并发排队(§6.3) + 配额账本 1GB + 持久化限流 + 版本快照。

### 2026-09-05 Agent API M2 可靠与治理交付
- 新增 `privhub/plugins/privhub-files-agent/src/m2.ts`（闸门/幂等/配额/限流/快照纯逻辑模块）+ index.ts 改造：
  - **幂等写入**：X-Idempotency-Key（write/fork 必填，缺省 400 提示）；同键同体重放返回首次结果（replayed:true，不重复写/不重复审计）；同键不同体 409 AGENT-4092；记录存 data/agent-idem/（TTL 24h 定期清理）
  - **乐观并发**：read 带 ETag（size+前64KB 哈希）；write 可选 If-Match，不匹配 409 AGENT-4091
  - **写并发排队**（§6.3 落地）：并发上限 8、队列 100（满 429 AGENT-4293）、超时 30s（429 AGENT-4294，提示可带同幂等键安全重试）；响应头 X-Queue-Limit/Position/Wait-Ms；同路径 per-path 锁串行化；10 并发实测全成功且入队者带排队头
  - **配额账本**：专属空间存量 1GB/用户，写前预检（超限 429 AGENT-4292 附用量/限额）；write/fork/delete 增量记账，trash restore/purge 全量重算；dryRun 返回 usage/quota 水位；账本存 data/agent-quota.json（S7 加密，周期落盘）
  - **版本快照**：覆盖前快照复用 versions.json 格式（key=`.agents/<user>|<scope>/<path>`），文本类滚动 20 版；二进制覆盖保留 .bak 兜底；新增 `/agent/v1/versions`（专属空间版本列表）+ `/agent/v1/versions/restore`（写回 + 恢复后生成新版本）闭环
  - **持久化限流**：读类（list/read）三维限流 key 600 / user 1200 / IP 3000 每分钟，滑动窗口 + data/agent-ratelimit.json 周期落盘（重启恢复）；响应头 X-RateLimit-Limit/Remaining/Reset + 429 附 Retry-After；601 并发实测触发
  - schema 错误码清单补齐（4091/4291/4292/4295 等 20 项）
- 测试：`check-agent-api-m2.mjs` **23/23 全绿**；M1 回归 47/47 全绿（write/fork 幂等键语义同步更新）。
- 备注：versions.json 当前为明文存储（既有插件行为，S7 未覆盖）——M3 提请评估加密；快照/恢复经 Agent API 走专属空间权限体系（网页 versions 接口因 project 名含 '/' 不适用 .agents 空间）。

### 2026-09-05 插件系统治理三项（按架构脑图改进点实施）
1. **versions.json 加密（改进①）**：privhub-files-versions 与 Agent 快照改走 ctx.storage（S7 加密，旧明文自动识别兼容）；版本快照内容不再明文落盘。
2. **事件总线治理（改进②）**：
   - 新增 L2 `privhub-svc-events`（ctx.eventBus 注册表：declareEmit/declareListen/snapshot/warnIfNoListener；⚠️ 命名规避：cordis 内置 mixin 占用 ctx.events，故用 eventBus）。
   - **语义拆分**：新增专用事件 `file:changed`（payload {project,path,action: created|saved|deleted|renamed|moved|restored|purged|clean, newPath?}），files/trash/edit-md/office-ui 全量广播；`audit:logged` 回归纯审计语义（面版/admin-audit）；fulltext 改监听 file:changed（删除对 audit:logged 的索引耦合），保留 file:saved（doc 直用）+ 跳过 .agents 空间索引。
   - 事件契约：audit:logged（8 emit / 1 listen）、file:changed（4 emit / 1 listen）、file:saved（2 emit / 2 listen）、meta:changed（1 emit / 1 listen）——11 个插件全部声明并计入 inject（eventBus）。
   - 移除的耦合：fulltext 不再从审计记录解析 target/reason（避免了审计 action 拼写与索引语义的隐式依赖）。
3. **ACL 守卫扩展（改进③）**：adminAcl 重构为 per-method 裁决（GET/PUT/POST 可不同动作），守卫从 files 9 路由扩展至 **31 个路由**（doc GET=view/PUT=edit、text/save、doc/versions、doc/restore、versions(插件)三路由、trash-list/restore/purge（id resolver 定位原路径）、comments GET、office 域 6 路由、export、fulltext/search、search、kg、meta/tags GET+POST、meta/tagged、mdpage/generate、dataview/new、publish(+list)）；trash-purge=delete、trash-restore=edit、versions/snapshot=view（快照不改文件）。
4. 测试：`check-acl-guard-ext.mjs` **21/21**（deny 全拒 / read 放行视图 / doc PUT·text/save·打标签 403 / trash id resolver 403 / 无规则语义不受破坏）；回归：M1 47/47、M2 23/23、check-acl、check-trash-perm、check-md、check-fulltext、check-office 全绿。
5. 已知边界：comments 写类（reply/status 按评论 id 定位）暂不纳入文件级 ACL（记录后续治理）；trash-clean 为 adminOnly；agent 路由自带完整裁决（不入守卫避免双判）。

### 2026-09-05 RAG 方案定稿（docs/PrivHub-RAG-方案.md）
- 已确认决策：① **数据不出网红线**（语料与模型调用限定内网）；② **模型接入=运维配置式**（不选型，只认 OpenAI 兼容 baseURL+模型名，新增 L2 privhub-svc-model，LLM 与 embedding 可分离指向）；③ **数据质量优先**（P1 语料治理先行：解析/清洗/去重/策展/人工裁决）；④ 原文不动，派生语料可重建可审计；⑤ 人工裁决闭环（保留 canonical/合并/剔除/过期，全自动不做破坏性决策）；⑥ 内容不预整合、元数据规范化（编目卡原则）；⑦ Key 管理 UI 并入 RAG 界面第一期；⑧ 向量库 P2 定（推荐 sqlite-vec）。
- 实施：M0 模型接入 → M1 语料治理 → M2 RAG 界面一期（含 Key 管理）/ AI 接入区块 → M3 检索问答 → M4 评估闭环。
- **2026-09-05 M0+M1 交付**：新增 `privhub-svc-model`（L2，OpenAI 兼容接入层：配置经 /api/model/config 动态写入、/v1/models 自检、embedding 批处理、chat 流式、mock 离线模式、错误映射 MODEL_TIMEOUT/AUTH/NOT_FOUND/UNREACHABLE）与 `privhub-svc-rag`（L3，P1 语料治理：file:changed/file:saved 事件驱动摄取、解析矩阵 md/txt/office/pdf/html、frontmatter 策展元数据（rag:false 自声明不进语料）、精确重复(内容哈希)+版本族+MinHash 近似候选 → 待裁决、策展台账 rag-curation.json（keep-canonical/exclude/expire/merge 及反操作）、结构感知分块（标题优先+CJK 重叠窗）、语料 rag-corpus jsonl（S7）、全量重建幂等、user 视图项目权限过滤）。测试 `check-rag-m1.mjs` **26/26 全绿**；实测基线 176 文档/511 块（公共项目存量数据全量入语料）。
- **2026-09-05 M2 RAG 界面一期交付**：`privhub-svc-rag/client` 两个视图——🤖「AI 语料」（全员：语料目录按项目浏览+状态标记、我的 AI 密钥自助申请/吊销）与 🧰「AI 治理」（admin：语料总览卡片/待裁决工作台（完全重复/近似/版本族 多选+保留首选/剔除/过期/合并）/模型接入表单（LLM+embedding 可分离，apiKey 打码回显与保留）/Key 管理（生成绑定用户+单项目 scope、续期/挂起/恢复/吊销）/专属空间回收站）。数据组织确认：**单库多 collection（项目=柜子），类型/目录/标签=metadata 抽屉，个人专属空间=个人 collection**。测试 `check-rag-ui.mjs` **17/17 全绿**。骨架视图登记三件套：渲染行 + barItems + openBarItem 白名单。
- **2026-09-05 M2 补充：界面引导体系**：每个区块标题旁 ⓘ 问号（点击弹右下角帮助卡：这是什么/使用流程/提示）+ 每个页签顶部「💡 快速上手」引导条。覆盖 7+2 区块（含 M3 向量化/问答）。UI 测试更新至全绿。
- **2026-09-05 M3 修正三连**：① 静态资源响应加 `cache-control: no-cache`（修复浏览器缓存旧前端 JS 导致图标点击无反应）；② RAG 界面全部颜色改为骨架 CSS 变量（var(--bg/panel/panel2/line/text/muted/accent)，自动适配明暗主题，88 处 token 统一）；③「我的 AI 密钥」页新增「如何配置给 AI 智能体软件」三步教程卡（申请→配置请求头/接口前缀→curl 验证，指向接入指南文档）。UI 测试补充教程块断言，全绿。
- **2026-09-05 M3.1 模型服务自动发现**：`POST /api/rag/discover`（adminOnly）扫描常见本地模型服务端口（Ollama 11434 / LM Studio 1234 / vLLM 8000 / llama.cpp 8080 / LocalAI 等 10 端口），默认本机（127.0.0.1 + localhost + 本机局域网 IP），支持填私网 CIDR 网段（192.168.x.0/24，私网安全校验）；探测 `/v1/models`（OpenAI 兼容）+ `/api/tags`（Ollama 判定，模型更全）→ 返回服务清单（kind/latency/models）。前端模型页新增「🔍 自动发现」卡片：结果卡片选模型 → 「设为 LLM / 设为 embedding」一键填入表单。实测：本机 Ollama 3 秒发现 8 模型（含 qwen3-embedding:8b）。UI 全绿。
- **2026-09-05 M3 检索问答交付**：新增依赖 `better-sqlite3 + sqlite-vec`（向量库 data/rag-corpus/vectors.db，vec0 虚拟表，仅存 chunk_id→向量；原文始终 S7 加密 jsonl，向量明文+隐私说明：向量不可逆、检索命中后回查加密文本）。能力：① **向量化**（用户界面按钮触发，非自动）：状态端点（idle/running/done/partial + done/total 进度 + failed + 错误）、任务句柄串行防并发、**幂等续跑**（已入库块跳过，删除重建可随时再来）；② **混合检索** `/api/rag/search`：BM25（svc-search）+ 向量 TopK RRF 融合 → 文档级排序 → **可见项目∩ACL view 逐条过滤 → 命中块附相邻 1 块（父上下文扩展，回应用户切分讨论）**；③ **问答** `/api/rag/ask`：TopK 6 块组装带 [n] 来源的上下文 → LLM（svc-model，mock 可测）→ 返回 answer + sources（项目/路径/片段）；无资料时兜底「未找到」不编造。前端治理视图新增「⚡向量化」「💬问答」tab（引导条+ⓘ 齐全）。测试 `check-rag-m3.mjs` **19/19 全绿**（含 user1 越权检索/问答/触发全部隔离）。UI 全绿。备注：mock 向量无语义，语义召回待用户接真实 embedding 后重跑向量化实测。
- **2026-09-05 M2 安全收紧：语料库仅管理员可见**：普通用户不再能看到跨项目语料条目——`/api/rag/corpus` 改 adminOnly（后端 403 兜底），前端「AI 语料」视图对普通用户只显示「我的 AI 密钥」tab（语料目录 tab 仅 admin 渲染）；模型配置/待裁决/Key 管理/回收站本就是 adminOnly。协作边界确认：**系统框架/按钮由开发搭建并自测；向量化等业务动作由用户在界面手动触发执行**（如「开始向量化」按钮），框架不代跑业务操作。UI 测试更新至 **24/24 全绿**。
- **2026-09-05 M2.5 UI 三改：AI 视图合并 + 空闲语义 + 按钮反馈**：① 原两个图标（🤖 AI 语料 / 🧰 AI 治理）合并为单一入口 **🤖「AI 工具」**（全员可见，无 adminOnly）——admin 打开即治理总台，页签含 **语料仓库 / 语料总览 / 待裁决 / 模型接入 / 向量化 / 问答 / Key 管理 / 专属回收站 / 我的 AI 密钥**；普通用户打开只有「我的 AI 密钥」整页（含「如何把密钥交给 AI 智能体软件」三步教程：①对话直接粘贴 X-Agent-Key 语句 ②环境变量 PRIVHUB_AGENT_KEY（Claude Code 等工具配置文件） ③看 docs/接入指南 ③ curl /me 验证）。Key 管理（admin 代发）与对外对接（我的 AI 密钥教程）由此归拢于同一视图内。骨架三件套同步收敛：渲染行/barItems/openBarItem 白名单只留 `rag`/`rag-view`，`rag-admin` 下线。② 向量化页空闲语义：无任务运行时显示「⚪ 空闲（当前没有正在执行的向量化任务）」+ 上次结果历史行，进度条仅在忙碌时渲染（不再出现「已完成」满进度条的误导）；③ 按钮统一 `.rag-btn` hover 提亮/active 压暗/disabled 半透明反馈。UI 测试 `check-rag-ui.mjs` 重写为合并版断言，**34/34 全绿**（补充脚本另验空闲/按钮反馈 6/6 全绿）。
- **2026-09-05 M2.6 查重功能合并**：用户确认三条规则（**只查当前打开的项目 · 所有登录用户可用 · 每组保留 1 个、其余移入回收站**）后落地：① 原「搜索页 🔁 查重」（文件名+大小判重、项目内）从搜索视图整体移除，其规则并入 **AI 工具 → 🔁 查重** 新页（服务端 `GET /api/rag/dup`，权限=项目可读即可；文件层=同名同大小覆盖所有文件类型；内容层=语料内"名字或大小不同但正文一字不差"的可解析文档，命中文件层的成员不重复列）；版本族/近似类仍留在「语料治理 → 待裁决」（管理员，全球跨项目）；② 文件夹页（文件视图）顶栏新增 **🔁 查重** 按钮（有项目时显示），点击直达 AI 工具查重页并自动选中当前项目（window.PrivHub.ragIntent 跳转钩子）；③ AI 工具视图改为外层双页签：`[🔁 查重 | 🧰 语料治理]`（admin，默认治理）/ `[🔁 查重 | 🔑 我的 AI 密钥]`（普通用户，默认查重）。删除经既有 `/api/delete` 进回收站、语料自动同步，可恢复。测试：`check-rag-ui.mjs` 合并版 v2 34/34、`check-rag-dup.mjs` 端到端 19/19（建项目→两类重复组→删重→清理）、m1/m3/ACL/Agent API 全回归绿。

### 规划（暂缓排产，已记录）
- 移动端竖屏适配：界面需适应手机竖屏显示。要点（未来排产时核对）：
  1) 左侧边栏默认收起（可点 ☰ 展开），宽度自适或抽屉式；
  2) 右侧详情面板改为底部抽屉或可关闭；
  3) 编辑器/工具栏按钮收进溢出菜单，字号按钮加大点击区；
  4) 标签栏横向滚动、文件列表列（大小/类型/时间）在小屏隐藏或压缩；
  5) viewport 与安全区（刘海）适配；触控长按已支持呼出菜单。
- 桌面端已就位：侧边栏 ⏴ 收起 / ☰ 展开、内容头仅字号+详情开关、编辑区撑满中间栏。
