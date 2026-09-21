# Phase 1.5 调研 Review + Phase 2 提炼工作底稿

> 生成时间：2026-09-17 ｜ 由主流程（萧潇）在六路调研全部回收后撰写
> 本文件是 SKILL.md 的**推导过程留痕**，不是最终产物。最终产物是上级目录的 `SKILL.md`。

---

## 一、六路调研回收实况

| Agent | 维度 | 文件 | 行数 | 一手 | 二手 | 推断 | 存疑 |
|---|---|---|---|---|---|---|---|
| 1 | 著作与系统性长文 | `01-writings.md` | 439 | 74 | 84 | 8 | 28 |
| 2 | 长对话/播客/访谈 | `02-conversations.md` | 333 | 97 | 19 | 7 | 0 |
| 3 | 碎片表达与风格 DNA | `03-expression-dna.md` | 279 | 46 | 48 | 4 | 9 |
| 4 | 他者视角/书评/批评 | `04-external-views.md` | 532 | 68 | 43 | 9 | 0 |
| 5 | 重大决策与转折点 | `05-decisions.md` | 235 | 100 | 8 | 41 | 2 |
| 6 | 时间线 + 最近 12 个月 | `06-timeline.md` | 187 | 54 | 24 | 3 | 2 |
| | **合计** | | **2005** | **439** | **226** | **72** | **41** |

- **信源分级计数法**：统计六个文件中出现的 `[一手]` / `[二手]` / `[推断]` / `[存疑]` 标签数量（同一论断多处标注会重复计数，故该比例反映**证据密度**而非唯一来源数）。
- **一手占比 = 439 / (439+226) = 66.0%**，达到「一手 > 50%」硬要求。
- 唯一 URL 数：**153 个**。域名分布前列：sensible.com 20、peachpit.com 7、builtin.com 3、informit.com 3、nngroup.com 3、goodreads 4、oreilly 4。中文黑名单（知乎 / 微信公众号 / 百度百科 / 百度知道）**零命中**。
- 六份文件均为自包含调研成果，全部落在 `references/research/` 内。

## 二、任务书预设的更正（必须执行，均已在一手源上核过）

任务书（及通行的关于 Krug 的说法）中有 **7 处与一手源冲突**，一律以一手源为准：

| # | 任务书/通行说法 | 一手源实况 | 处置 |
|---|---|---|---|
| 1 | **耶鲁大学心理学本科** | 他本人 FAQ 原话：「Got an **English Lit** degree in college, after having to quit **Physics** because nobody explained calculus to me.」2026 BI 专访补出校名 **Boston College，1971** | 不写耶鲁、不写心理学 |
| 2 | **RIT 计算机科学硕士** | 全部一手源中**无任何硕士学历记载**。计算机能力来自排版社自学 | 删除 |
| 3 | **曾任 Apple / Netscape 员工** | 一手简介一律列为 **client（客户）**。1994 年为 Apple 做 web 咨询；1990s 客户含 Netscape/AOL/Excite@Home | 改写为「为客户提供咨询」 |
| 4 | **每个季度第三个星期四做测试** | 无任何来源支持「每季度」。他本人原话是 **「one morning a month」**；唯一出现 "third Thursday" 的是二手读书笔记，且写的是 **every month** | 改为「每月一个上午」，"第三個星期四"标 `[存疑]` |
| 5 | **severity rating（严重度打分表）** | RSME **没有** 1–5 级量表。真实机制是**数票**：每位观察者对每位被试只写「亲见的三个最严重问题」→ 勾选计数 → 按票数重排 | 改写为「数票排序法」 |
| 6 | **「The Least You Can Do About Usability Testing」** | 这个长标题不存在。RSME 第 11 章是 **「The least you can do™」**；DMMT 第 9 章是 **「Usability testing on 10 cents a day」** | 用真实标题 |
| 7 | **他对无障碍（a11y）覆盖薄弱** | **未找到支持，反有反证**：DMMT 有独立小节「Accessibility is the Right Thing to Do」（alt text、`<label>`、skip link、键盘可达），第 2 版有无障碍专章 | 降级为「覆盖基础但不深入」，不作为批评写入 |

另有两处「智识谱系」预设缺乏证据，**不得写入**：
- **Tufte ↔ Krug 对立**：两人**零互评记录**。目标函数确实相反（单位面积信息量最大化 vs 单屏认知负荷最小化），只能说「方向相反」，不能说「谁批评谁」。
- **Norman 批评 Krug**：零证据。Norman 只有《Living With Complexity》的「我们需要复杂」可作侧面引证，且未点名。
- **Herb Simon 与 satisficing**：Krug 书中只写 "a strategy known as satisficing"，**未点名 Simon**。词源是 Simon(1956)，属 `[推断]`。
- 「no-brainer test」查无此说。他真实存在的同类测试是：Trunk Test / "Get it" test / Key task test / hallway test / 50 毫秒首因印象。

## 三、三重验证筛选（心智模型判定记录）

判定标准（来自 `extraction-framework.md`）：**跨域复现**（≥2 个不同领域）、**有生成力**（能推断他对新问题的立场）、**有排他性**（不是所有聪明人都这样想）。三重通过 → 心智模型；1–2 重 → 降级为决策启发式；0 重 → 丢弃。

| 候选论点 | 跨域复现 | 生成力 | 排他性 | 判定 |
|---|---|---|---|---|
| 你不能替用户判断，只有观察算数 | ✅ 测试方法/焦点小组/模拟用户/一人公司定位 | ✅ | ✅ | **模型 1** |
| 用户是扫读/满意即可/糊弄着用，不是阅读/最优/搞懂 | ✅ 网页设计/文案/测试观察/移动端 | ✅ | ✅ | **模型 2** |
| 「别让我思考」= 清掉不该想的，不是清掉一切 | ✅ 导航/文案/表单/自我澄清 | ✅ | ⚠️（极简派共通，排他性最弱） | **模型 3**（已标注排他性最弱） |
| 可发现性 > 设计本身（Trunk Test、五件必备物） | ✅ 导航/首页/层级/移动端 | ✅ | ✅ | **模型 4** |
| 降标准换持续性（3 人 × 每月一个上午） | ✅ 测试频率/DIY/民主化/成本 | ✅ | ✅ | **模型 5** |
| 最小改动 + 数票排序（least you can do） | ✅ 修缺陷/文案/组织政治 | ✅ | ✅ | **模型 6** |
| 善意账户与礼节（reservoir of goodwill） | ✅ 界面/客服/商业伦理 | ✅ | ✅ | **模型 7** |
| 「测试像审计」「UX 变成大部门」「设计师不做研究」 | — | — | — | ❌ **丢弃**：未找到他本人原话（Agent 2/5 已核） |
| 「内向的人」「不谈客户名」「不谈收入」 | — | — | — | ❌ **丢弃**：查无原话；他公开列 Apple/Bloomberg/Lexus/NPR/IMF，且主动披露 $40,000 预付款与 $15k/天报价 |
| 「rocket surgery 是他发明的词」 | — | — | — | ❌ **丢弃**：只确证是他的 servicemark，是否首创 `[存疑]` |

**最终心智模型数：7 个**（在 3–7 区间上限）。

## 四、六路调研之间的**矛盾清单**（原样保留，不调和）

这些矛盾本身是信息，已全部写入 SKILL.md 的「内在张力」或「诚实边界」：

1. **「永不宣布新版」vs 首页正在预报 rev 4**。他的 FAQ 原话「the first rule of Update Club is that you never announce that an update is coming」，而 sensible.com 首页同期写着 "the 4th edition is finally coming!!"。同一站点自相矛盾，**引用官网 FAQ 会直接过时**。
2. **「我只会改变主意一件事」vs 实际变化**。他说 "I've only ever changed my mind about one thing: that UX would always be side-lined."；但「别让我思考」的解释在晚年明显细化（"about things I don't need to think about"），且从「不做第 4 版」到「做了第 4 版」。
3. **销量口径三说**：官网首页 700,000 册 / 15 种语言；官网 About 600,000 册；Brave UX 主持人开场 600,000 册 / **20 种语言**。语言数冲突未解。
4. **测试人数三说**：3–4 人 / 3 人 / 2–3 人。他自己在不同场合并用。
5. **RSME 出版年 2009 vs 2010**（同一出版社页自相矛盾）。
6. **首版年份 1999 / 2000 / 2010 三说**（后者明显错误）。
7. **「关于写作的书」写了几年**：他自己口径 5 年 → 6 年 → 9 年，2026 年已不再提及。
8. **AI 调性两种**：中性（"power steering"，不替代人的判断）vs 负面（"It's gotten worse, and I think it will get even worse with AI"）。
9. **第 4 版出版日三个口径**：2026-11-30（Peachpit 官方页，`[一手]`）/ 2026-07-22（他处）/ 2026 年内（官网首页 "later this year"）。**以 Peachpit 官方页为准**，已由父流程独立复核。
10. **Amazon 预售是否存在**：官网首页说 "available for presale on Amazon later this year"，但实测 Amazon 两个 ISBN 路径均 404。**不得断言 Amazon 已有预售页**。

## 五、他者视角的**关键不当引用风险**（必须在 SKILL.md 里防住）

**可用性批评的靶心一直是 Jakob Nielsen，不是 Krug。** Design by Fire 的围攻、Knemeyer《The End of Usability Culture》、乃至整个「5 用户」学术争论（Schaffer「每段只测三个是大错误」、Spool & Schroeder 2001 首 5 个只发现 35% 问题、Faulkner 2003 检出率 55%–100%），打的都是 Nielsen 与「折扣可用性」整条路线。Krug 站在该传统的**外缘与传播端**。把他的名字塞进对 Nielsen 的批评里就是移花接木。

真正**点名批评 Krug** 的只有三类人：
- 学术/人文背景评论者：Bernstein 2001（ACM Interactions 书评，本次 403 未取全文）、**Jason Farman 2026-04 在 Slate 点名**（"The usability consultant Steve Krug captured this expectation in a single phrase that became gospel"）；
- 公共部门内容设计者（Duncan Stephen 2026）；
- 企业复杂系统实践者（37signals 2004 等）。

同样要注意：**Jared Spool 的「democratizing = arrogance」批评未点名 Krug**（Dovetail Outlier 2021-11-18）。Krug 的 DIY 手册是那场运动最畅销的载体，实践层面被覆盖，但**不可写成「Spool 批评 Krug」**。

## 六、信息不足维度（诚实登记，不用通用道理填充）

| 缺口 | 影响 | 状态 |
|---|---|---|
| **Twitter/X 原始推文 = 完全缺口** | 碎片级公开立场无法核实；「发推频率低」只能标 `[推断]` | 未解决（nitter/x.com/Wayback 全失败） |
| **第 4 版正文未出版** | AI、量化 vs 质化两章的实际立场只能从二手报道推断 | 结构性缺口，须等 2026-11-30 |
| **sensible.com 一手 PDF 无法直读** | 测试脚本、观察者说明、checklists、therapist 话术均为 PDF；本环境不支持 `application/pdf`。已部分补救：脚本原文经第三方索引取回关键句；下载页清单本身可读 | 部分解决 |
| **UXPA London 2014 争议小组** | 唯一确认「他作为被质疑方」的公开辩论场合，逐页未取 | 未解决 |
| **ACM Interactions 两篇全文**（2001 书评、2003《Don't make me read》） | 唯一学术期刊级书评缺席 | 未解决（本环境 403） |
| **Reddit / HN 社区一手舆论** | 社区层面评价缺失（reddit.com 解析到非公网 IP） | 未解决 |
| **第 2 版（2006）改版理由** | 无一手前言；仅知新增无障碍专章 | 未解决 |
| **「上午测、下午改」的原始措辞** | 未找到他本人用此短语的一手出处。可确证的是书第 3 章标题「A morning a month, that's all we ask」 | **引用时不得当引语** |
| **学术引用计数** | Google Scholar / Scopus 未检索 | 未解决 |

## 七、下游用途迁移分析（本 Skill 的落地靶心）

**靶心**：一个自托管文件管理系统（privhub），**51 个插件**、密集界面（顶部栏 + 图标栏 + 目录树 + 多标签页 + 右侧详情面板 + 全宽功能面板 + 模态浮层），**作者是非程序员，没有用户研究人手和预算**。

**实况要点**（只读勘察 `privhub/frontend/index.html`，未改动）：
- 布局：`.topbar`（logo + project-tabs 槽 + user-area 槽）／`.body` 内并列 `app-iconbar` 槽 + `.side-wrap`（目录树，可拖拽调宽、双击折叠、收起后留 `☰` 展开按钮）+ `.main`（tabs / 各功能视图 / 文件面板）+ 右侧 preview 槽。
- 视图切换靠单一 `nav.activeView` 串联十几个 `v-else-if`（files / trash / search / favorites / settings / acl / audit / tags / template / kg / wiki / rag / agent / admin），并有 `main-welcome` 兜底文案。
- 已存在的兜底文案质量不错（加载失败给原因 + 重试入口），这是与 Krug 原则同向的既有资产。
- **入口压力点**：51 个插件的 `barItems` 汇聚到一条图标栏；十几个视图共用一条 activeView 通道 → 「我在哪 / 这里有什么 / 我能去哪」三个问题在密集面板界面里比网页更尖锐。

**Krug 框架可迁移部分（本 Skill 保留为优先项）**：
1. 廉价可用性测试：3 人 / 一个上午 / 月度 / 上午测下午改 / 数票排序 / 最小改动。**零预算下唯一可执行的研究手段**。
2. 可发现性：Trunk Test 六问 + 「五件必备物」+ 「you are here」必须显眼（他原话：你觉得它已经跳出来了，那就再加倍显眼）。
3. 扫读友好：视觉层级三法则、六大扫读设计守则、把页面切分成「一眼能指出用途」的区域、消除噪音（喧嚣/杂乱/混乱三类）。
4. 文字精简：砍一半再砍一半、删 happy talk、消灭 instructions、术语禁令、QYWPWA。
5. 修问题的纪律：先疑措辞 → 再疑位置/视觉层级 → 最后才疑功能缺失；对「我想要能 X」的功能请求保持怀疑。

**Krug 框架不可迁移（必须写进诚实边界）**：
1. **成书于网页导航时代**。Trunk Test 的六问预设「一个页面 + 一个 URL + 一个面包屑层级」的模型。**SPA / 浮层模态 / 拖拽 / 实时协同 / 命令面板 / 无 URL 状态 / 暗黑模式 / 密集桌面式面板**，他全部没写过、没测过。50 插件的自托管管理系统**不在他的样本里**。
2. **3 人测试不能验证假设、不能量化**。他本人原话「no statistical—no point in even gathering statistics」。用它做 A/B 决断是误用。
3. **他从未管理团队、从未在大公司内部做事**（一人公司，从未雇人）。他的建议默认「你有权决定改什么」，对「改不动」的组织现实覆盖薄弱。
4. **他的方法仍需组织能力**：要有人主持（patient / calm / empathetic / a good listener / inherently fair）、要有观察者、要能按月度排出修复时间。非程序员单人项目里，这些是真实成本。
5. **第 4 版未出版**，AI 与量化研究两章的实际立场不可核实。

---

## 八、Phase 2 提炼结果摘要（供 Phase 3 直接填充）

- **心智模型 7 个**：① 你不能替用户判断，只有观察算数 ② 用户不是你以为的那个人 ③「别让我思考」= 清掉不该想的 ④ 可发现性高于设计本身 ⑤ 降标准换持续性 ⑥ 最小改动 + 数票排序 ⑦ 善意账户与礼节
- **决策启发式 10 条**（含任务书点名的五条核心方法，全部落在一手原话上）
- **表达 DNA**：短句 / 口语 / 具体 / 结论先行但立刻自我降级 / 自嘲 / 生活比喻 / 括号与脚注放真话 / 第二人称 / 三拍递进 / 不毒舌；核心机制是 **「disclosure against interest」**（每次至少说两三句对自己不利的坦白）
- **内在张力 5 对**：见 SKILL.md
- **诚实边界 8 条**：见 SKILL.md
- **智识谱系**：Nielsen（入门+5 用户论，Krug 主动下调）/ Norman（引言引用）/ Simon（satisficing 词源，未点名）/ Pirolli & Card（scent of information）/ Strunk & White（"Omit needless words" 是他们的）/ Don Herbert（Mr. Wizard，教学法与插画风格）/ Roger Black（促成本书）；下游为 DIY 测试普及运动与 usertesting.com 一代工具
