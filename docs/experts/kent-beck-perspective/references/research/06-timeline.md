# Kent Beck 人物时间线调研

> 女娲·Skill造人术 / Agent 6（时间线维度）
> 目标人物：Kent Beck（XP 创始人、TDD 提出者、JUnit 作者、《Tidy First?》作者）
> 调研执行：萧潇（调研员）

---

## 0. 调研说明

### 0.1 检索日期

**本次全部检索完成于 2026-09-17（北京时间，系统时钟核对值 `2026-09-17 13:58 +08:00`）。**

这一点对本报告的「最近 12 个月」章节至关重要，请读者先接受这个时间基准再往下读。本文中：

- 「最近 12 个月」= **2025-09-17 至 2026-09-17**；
- 「当下」= **2026 年 9 月中旬**；
- 凡是 2026 年的内容，都是**已经发生**的事实，不是预测。

### 0.2 检索过程与引擎状况（如实记录）

第一轮检索时，配置的默认引擎为 Bing（市场 `zh-CN`）。在中文市场语境下，查询词 "Kent Beck" 被大量误匹配为**香烟品牌 Kent（健牌）**与**肯特大学**，返回结果几乎全部无关。这是本次调研最主要的工具障碍。

随后执行 `free_search_test` 实测各引擎，结果如下（2026-09-17）：

| 引擎 | 状态 | 说明 |
|---|---|---|
| bing | OK（但结果偏题） | 中文市场导致 "Kent" 语义漂移 |
| anysearch | OK | 有效，后期出现 HTTP 402 |
| keenable | OK | **本次主力引擎**，结果质量最好 |
| deepseek-official | OK | 少量结果 |
| ddg / ddg-lite | FAIL | connection error: fetch failed |
| searxng | FAIL | 全部实例 aborted |
| exa | FAIL | MCP error HTTP 429 |
| tavily | FAIL | hourly keyless limit（429） |
| firecrawl | FAIL | rate limit 429 |
| parallel / perplexity | FAIL | 未配置 API Key |

**换引擎策略**：主力改为 `keenable`，辅以 `anysearch`、`tavily`（可用时）、`deepseek-official`。引擎失败或替换情况已在各章节来源标注中注明。

### 0.3 web_fetch 的可达性限制（重要）

本次 `web_fetch` 工具出现大面积域名不可达，错误分两类：

1. `URL hostname "..." resolves to a non-public IP address` —— 命中 `en.wikipedia.org`、`tidyfirst.substack.com`、`fparkinsons.substack.com`；
2. `TypeError: fetch failed` —— 命中 `wikiwand.com`、`wikimili.com`、`grokipedia.com`、`handwiki.org`。

**因此本报告无法直接引用英文 Wikipedia 正文**。替代路径：

- 用 **镜像/转载站**（`everything.explained.today`、`owiki.org`）读取 Wikipedia 正文内容，这两站均明确标注其内容来自 Wikipedia 且遵循 GFDL/CC 授权；
- 用 **Substack 自定义域名镜像** `newsletter.kentbeck.com` 读取 `tidyfirst.substack.com` 的正文与归档（两者内容一致，前者可访问）；
- 用 **本人官网** `kentbeck.com`（可达）读取其自述的「Right Now」项目状态。

另有两类失败已记录并规避：`oreilly.com` 返回 403 Access Denied；`infoq.com`、`adtmag.com`、`webpronews.com`、`awesomebooks.com` 返回 403/405 人机验证。这些站点的信息本报告改用二手转述来源替代，并已降级可信度。

### 0.4 局限与免责

- 本报告**未使用**知乎、微信公众号、百度百科/百度知道，也未采用任何以「AI 生成」自述的聚合站（如 `sonto.tech`，其页面明确写着 "Written by AI from the sources below"，且该站当时返回 522 不可达）。
- `grokipedia.com`、`yespress.io`、`notablepeopleproject.org`、`self.md`、`stackforce.co` 等站点为聚合/生成型内容站，本报告**仅在它们与其他来源互相印证时**采用，一律标 [二手] 并注明「弱」。
- 私人生活（婚姻、子女、居住细节）不属于本次调研范围。仅在**公开自述且与专业轨迹直接相关**处引用（如其 2026 年公开的帕金森诊断，因其直接改变了其工作节奏与选题，属于专业轨迹的一部分）。
- 所有条目均标注来源 URL 与可信度标签：[一手] = 当事人自述/机构原始页面；[二手] = 第三方报道/百科/访谈转述；[推断] = 由一手材料推导，非直接陈述。

### 0.5 哪些年份存疑（速览）

详细对照见第 5 章。三处最主要的存疑点：

1. **出生日期**：仅知 1961 年；具体日期 3 月 31 日只见于单一生成型站点。
2. **AI 编程转折的触发时间**：本人两处自述分别指向「2025 年 3 月（o11ycast）」与「四月（IT Revolution 演讲）」，另有第三方站点把这年写作 2024。
3. **离开 Gusto 的确切时间**与**加入 Mechanical Orchard 的确切时间**：仅有「2023 年 1 月已以 Chief Scientist 身份发文」这一锚点。
4. **SUnit 的写作年份**：Wikipedia 说 1989，另有 1994 一说，而他本人在《Canon TDD》里说 1995-10 才在 Austin OOPSLA 演给 Ward Cunningham 看（详见 §5.10）。
5. **离开 Facebook 的方式**：本人文本是主动离开的口吻，另有二手来源称「被解雇」（详见 §5.11）。

---

## 1. 关键节点表格

可信度标签：一手 = 当事人/机构原始页面；二手 = 第三方转述；推断 = 由一手材料推导。

### 1.1 出生、教育与早年（1961–1986）

| 年份 | 事件 | 意义 | 来源 URL | 可信度 |
|---|---|---|---|---|
| 1961 | Kent Beck 出生于美国 | 全部生涯的起点；维基只给年份，未给月日 | https://everything.explained.today/Kent_Beck/ | [二手] |
| 1961-03-31 | 生日（存疑） | 仅单一生成型站点给出月日，未见权威来源 | https://grokipedia.com/page/Kent_Beck | [二手]（弱，存疑） |
| 1969 | 母亲为他报 Mrs. Card 的吉他班；祖父（Pappy）把 Blue Chip Stamp 商店买的吉他传给他 | 自述中的音乐起点；他后来把音乐、图案（patterns）与软件并置思考 | https://kentbeck.com/ | [一手] |
| 1970s 初 | 六、七岁起画「傻乎乎的房子平面图」 | 自述称这是他接触 Christopher Alexander 与「模式」的远因 | https://c2.com/ppr/about/author/kent.html | [一手] |
| 1979–1987 | 就读 University of Oregon，获计算机与信息科学 B.S. 与 M.S. | 学历锚点；注意这是**八年跨度**，非四年 | https://everything.explained.today/Kent_Beck/ ・ https://owiki.org/wiki/Kent_Beck | [二手] |
| 本科期间 | 在 University of Oregon 书店站着读完 Christopher Alexander《The Timeless Way of Building》 | 自述：「我最初发现模式，是在俄勒冈大学读本科时」 | https://c2.com/ppr/about/author/kent.html | [一手] |
| 约 1982 前后 | 进入 Tektronix 工作 | 第一份可考的工业界工作；他自述「在 Tektronix 工作了一年半时，又遇到 Alexander」 | https://c2.com/ppr/about/author/kent.html ・ https://api.finexus.net/api/news/events/89f5d982-90aa-48c1-bd97-a0b0869cd83e/html | [一手]+[二手] |
| 1980s 中期 | 加入 Apple，动机是被 Smalltalk 吸引 | 进入 Smalltalk 世界的关键跳板 | https://api.finexus.net/api/news/events/89f5d982-90aa-48c1-bd97-a0b0869cd83e/html | [二手] |

> **关于 Tektronix → Apple 的先后顺序**：[一手] 的 c2.com 自述页面确认 Tektronix 在其本科生阶段之后、且在 Smalltalk 咨询生涯之前；[二手] 的 Finexus 页面称其「1980 年代中期加入 Apple」。两段可并存。惟**各自的确切起止年份，本次检索未能取得权威一手材料**（详见第 5 章）。

### 1.2 Smalltalk 时代与模式运动（1987–1995）

| 年份 | 事件 | 意义 | 来源 URL | 可信度 |
|---|---|---|---|---|
| 1987 | 与 Ward Cunningham 合著 "Using Pattern Languages for Object-Oriented Programs"，发表于 OOPSLA'87 | 软件模式运动的奠基论文之一；两人在 Ward 的 VW Vanagon 车上决定做这个实验 | https://everything.explained.today/Kent_Beck/ ・ https://c2.com/ppr/about/author/kent.html | [一手]+[二手] |
| 1987 | 在 OOPSLA'87（Orlando）报告五人模式语言实验 | 自述：「我们讲模式讲到嘴唇发白，但没有更具体的模式，没人愿意加入」 | https://c2.com/ppr/about/author/kent.html | [一手] |
| 1988 前后 | 移居加州 Santa Cruz 县乡间（Boulder Creek），与妻子、四个孩子、十只鸡、两只鹌鹑、一条狗同住 | 自述；解释其为何选择自雇 | https://c2.com/ppr/about/author/kent.html | [一手] |
| 1989 | 与 Ward Cunningham 合著 "A Laboratory For Teaching Object-Oriented Thinking"，OOPSLA'89 | CRC 卡方法的经典文献 | https://everything.explained.today/Kent_Beck/ | [二手] |
| 1989 | 为 Smalltalk 写出 **SUnit** 单元测试框架，论文 "Simple Smalltalk Testing: With Patterns" | **整个 xUnit 家族（含 JUnit）的源头**；这是他「测试框架作者」身份的起点 | https://everything.explained.today/Kent_Beck/ | [二手] |
| 1994 | 写 SUnit（**另一说**） | 上游核实事实，与 1989 说法冲突；见 §5.10 | 上游核实（本报告未能独立取到原始出处） | [一手]（经上游转述） |
| 1995-10 | 在 Austin 的 OOPSLA 上把 SUnit 演给 Ward Cunningham 看 | 他本人在《Canon TDD》中的自述 | https://newsletter.kentbeck.com/p/canon-tdd | [一手]（经上游转述） |
| 1991 | OOPSLA'91（Phoenix）参加 Bruce Anderson 的 "Towards an Architecture Handbook" 工作坊 | 自述在此首次得知 Erich Gamma 的 Design Patterns、Wolfgang Pree 的工作，并与 Ralph Johnson 一起提出 HotDraw 的使用模式 | https://c2.com/ppr/about/author/kent.html | [一手] |
| 1993-08 | 与 Grady Booch 在落基山（海拔约 9000 英尺）合办模式工作坊，三天研讨「generativity」 | 直接导致 **Hillside Group** 成立 | https://c2.com/ppr/about/author/kent.html | [一手] |
| 1993 前后 | 经营 First Class Software, Inc.（自雇） | 自述：「我为自己工作，好更好地平衡职业、个人与家庭」；主营 Smalltalk 咨询，并开发/发行 Profile/V 与 Object Explorer for VisualWorks | https://c2.com/ppr/about/author/kent.html | [一手] |
| 1996 | 出版《Kent Beck's Guide to Better Smalltalk: A Sorted Collection》（Cambridge University Press） | 第一本书 | https://everything.explained.today/Kent_Beck/ | [二手] |
| 1997 | 出版《Smalltalk Best Practice Patterns》（Prentice Hall） | Smalltalk 时代的思想总结；c2.com 自述中当时正写的正是这本「Smalltalk Best Practices Pattern Language」 | https://everything.explained.today/Kent_Beck/ ・ https://c2.com/ppr/about/author/kent.html | [一手]+[二手] |

### 1.3 XP 诞生与 Chrysler C3（1996–2001）

| 年份 | 事件 | 意义 | 来源 URL | 可信度 |
|---|---|---|---|---|
| 1996 | 受雇参与 **Chrysler Comprehensive Compensation System（C3）** 项目 | XP 的实战孵化场 | https://everything.explained.today/Kent_Beck/ | [二手] |
| 1996-03 | C3 团队估计系统约一年后可上生产 | 后来「只晚了几周」交付，被视为 XP 有效的证据 | https://everything.explained.today/Kent_Beck/ | [二手] |
| 1996 | 他把 **Ron Jeffries** 拉进 C3 项目 | Ron Jeffries 后来成为 XP 三位创始人之一 | https://everything.explained.today/Kent_Beck/ | [二手] |
| 1997 | C3 团队采用一套后来被正式命名为 **Extreme Programming** 的工作方式 | XP 的正式诞生点 | https://everything.explained.today/Kent_Beck/ | [二手] |
| 1998 前后 | 将 XP 主要应用于银行与保险项目 | 其 2011 年自述原文：「我当时一直在做 extreme programming，主要自己应用在银行和保险的项目上」 | https://sdtimes.com/agile/ten-years-after-snowbird-kent-beck-looks-down-the-path-for-agile/ | [一手] |
| 1999 | 《Refactoring: Improving the Design of Existing Code》（Addison-Wesley），与 Martin Fowler、John Brant、William Opdyke、Don Roberts 合著 | 重构从「手艺」变成有目录可查的工程学科 | https://everything.explained.today/Kent_Beck/ | [二手] |
| 1999 | 《Extreme Programming Explained: Embrace Change》（Addison-Wesley） | **XP 的圣经**；获 Jolt Productivity Award | https://everything.explained.today/Kent_Beck/ | [二手] |
| 2000 | 《Planning Extreme Programming》，与 Martin Fowler 合著 | 把 XP 的计划与估算部分单独成书 | https://everything.explained.today/Kent_Beck/ | [二手] |
| 2001-02 | 在 Utah Snowbird 参与敏捷宣言（Agile Manifesto）起草，为 **17 位原始签署人之一** | 从「一种方法论」跃升为「一场运动」；他自称是按字母序的**第一位签署人** | https://everything.explained.today/Kent_Beck/ ・ https://www.mechanical-orchard.com/insights/mechanical-orchard-a-new-company-with-a-long-history | [二手]+[一手] |
| 2002 | 《Test-Driven Development by Example》（Addison-Wesley） | **TDD 的定型文本**；获 Jolt Productivity Award；书中两条铁律：未先写失败的自动化测试前不写一行代码；消除重复 | https://everything.explained.today/Kent_Beck/ | [二手] |

### 1.4 敏捷年代与 Three Rivers Institute（2002–2010）

| 年份 | 事件 | 意义 | 来源 URL | 可信度 |
|---|---|---|---|---|
| 2003 | 《Contributing to Eclipse: Principles, Patterns, and Plugins》，与 Erich Gamma 合著 | JUnit 之后两人再度合作 | https://everything.explained.today/Kent_Beck/ | [二手] |
| 2004 | 《JUnit Pocket Guide》（O'Reilly） | JUnit 生态的手册化 | https://everything.explained.today/Kent_Beck/ | [二手] |
| 2004 | 《Extreme Programming Explained: Embrace Change, 2nd Edition》，与 Cynthia Andres 合著，「完全重写」 | XP 的第一次自我修订 | https://everything.explained.today/Kent_Beck/ | [二手] |
| 2005 | 受邀与 Ed Yourdon、Larry Constantine 同台 panel；研读《Structured Design》 | 他自述此刻意识到：这两位先驱早已写下软件设计的「牛顿运动定律」——即 coupling（耦合）与 cohesion（内聚） | https://kentbeck.com/ | [一手] |
| 2007 | 《Implementation Patterns》（Addison-Wesley） | 把模式下沉到代码级实现约定 | https://everything.explained.today/Kent_Beck/ | [二手] |
| 2010-11 | Three Rivers Institute 博客最后一篇文章（《Minimum Viable Product revisited》自述为该站最后一篇） | 独立顾问时代的收尾 | https://newsletter.kentbeck.com/p/minimum-viable-product-revisited | [一手] |
| 2000s 全程 | 以 Three Rivers Institute 名义做独立顾问、写作、演讲 | 「咨询与写作的十年」；其文章存档仍在 threeriversinstitute.org（部分经 web.archive.org 保存） | https://web.archive.org/web/20150223055844/www.threeriversinstitute.org/JustShip.html | [一手]（存档） |
| 2011-05 | 接受 SD Times「Agile at 10」访谈 | 自述技术焦点已转向**软件设计**——「如何比大批量设计更高效、更安全地增量设计软件」；社会层面关注「如何在自己的工作中展示问责与责任」 | https://sdtimes.com/agile/ten-years-after-snowbird-kent-beck-looks-down-the-path-for-agile/ | [一手] |
| 2011-08 | 12 位敏捷宣言作者在 Salt Lake City 的 Agile Alliance 大会重聚 | 敏捷运动的仪式性时刻 | https://sdtimes.com/agile/ten-years-after-snowbird-kent-beck-looks-down-the-path-for-agile/ | [二手] |

### 1.5 Meta / Facebook 与 3X（2011–2018）

| 年份 | 事件 | 意义 | 来源 URL | 可信度 |
|---|---|---|---|---|
| 2011–2018 | 在 Facebook 任 **Technical Coach（技术教练）** | 从「方法论作者」变成大厂内部工程师 | https://podcasts.musixmatch.com/podcast/product-thinking-01h1ngdz40h1jbjfx464wgnvpc/episode/debating-user-research-experimentation-and-the-pm-01hjz7abr0d8wfhwfxz9m7wtgs | [二手] |
| 约 2011 | 首次绩效面谈（manager: David Recordon），他带着「我要完成一切」的清单走进会议室 | 这次经历催生了 **Explore / Expand / Extract（3X）** 与「P50 目标」观点 | https://newsletter.kentbeck.com/p/dont-accomplish-everything | [一手] |
| 2014-05 至 06 | **《Is TDD Dead?》**：与 Martin Fowler、DHH（David Heinemeier Hansson）进行五集连线对谈 | 本时间线上 TDD 相关的最大一次公开争论（起因是 DHH 在 RailsConf 主题演讲称 TDD 造成伤害）；2025 年后他「TDD 没死、反而更重要」的表述可视为对此的迟到回应 | https://martinfowler.com/articles/is-tdd-dead ・ https://blog.cleancoder.com/uncle-bob/2014/06/17/IsTddDeadFinalThoughts.html | [一手]（Fowler 官方页，发布日 2014-05-09） |
| 2015 | 与 Erich Gamma 同获 ACM SIGPLAN **Programming Languages Achievement Award** | 与 JUnit / xUnit 生态的学术认可相关；注意该奖项维基条目常只列 Gamma，Beck 的名字见于 c2 wiki 记录 | https://wiki.c2.com/?ErichGamma ・ https://sigplan-pages.sigplan.hosting.acm.org/Awards | [二手]（**存疑**，见第 5 章） |
| 2018 前后 | 在 Facebook 内部写下 "My Personal Mission"：「在我离开 Facebook 之后的七年里，我成了独立的人……」（原文 "after seven years at Facebook"） | 七年任期的一手旁证；同时抛出他后来的使命句「帮极客在世界上感到安全」 | https://www.facebook.com/notes/kent-beck/my-personal-mission/1811782322187957/ | [一手] |
| 2019-06 | 发表《Maybe Agile Is the Problem》 | 对「敏捷工业复合体（Agile Industrial Complex）」的公开批评；标志与主流敏捷产业的疏离 | https://infoq.com/articles/agile-agile-blah-blah | [一手]（页面当时返回 405，经搜索索引确认标题、日期与要点） |
| 2019-10 | 公开访谈确认已离开 Facebook | 结束 8 年大厂时期 | https://rackandstack-tech.blog/2019/10/15/kent-beck-fired-from-facebook | [二手] |

### 1.6 Gusto 与 Mechanical Orchard（2019–2023）

| 年份 | 事件 | 意义 | 来源 URL | 可信度 |
|---|---|---|---|---|
| 2019 | 加入 **Gusto**，任 software fellow / coach | 回到「教练 + 工程师」角色，辅导 payroll 系统团队 | https://everything.explained.today/Kent_Beck/ ・ https://www.businessinsider.com/kent-beck-gusto-agile-manifesto-chrysler-2019-8 | [二手] |
| 2020-08 | Built In 报道：「Kent Beck 认为科技业有共情赤字（compassion deficit）」 | 其公开叙事明确转向「软件是人之间的关系」 | https://builtin.com/software-engineering-perspectives/kent-beck-geeks-gusto-globalization | [二手] |
| 2023-01-10 | 以 **Chief Scientist at Mechanical Orchard** 身份发表《Mechanical Orchard: A New Company With a Long History》 | 加入这家由 Pivotal 创始人 Rob Mee 领导、做遗留系统现代化（AI 加速）的公司；他与 Rob Mee 的合作可追溯到 1996 年 Smalltalk 时代 | https://www.mechanical-orchard.com/insights/mechanical-orchard-a-new-company-with-a-long-history | [一手] |
| 2023-11 前后 | 《Tidy First?: A Personal Exercise in Empirical Software Design》（O'Reilly）出版，Larry Constantine 作序 | **Empirical Software Design 系列第一本**；从 2005 年那次 panel 算起，他自称「花了 18 年才写出来」 | https://kentbeck.com/ ・ https://everything.explained.today/Kent_Beck/ ・ https://dokumen.pub/tidy-first-a-personal-exercise-in-empirical-software-design-1nbsped-1098151240-9781098151249-i-6847419.html | [一手]+[二手] |

### 1.7 Augmented Coding 与当下（2024–2026）

| 年份 | 事件 | 意义 | 来源 URL | 可信度 |
|---|---|---|---|---|
| 2022-02-17 | 发表《Self, Team, Product》 | Substack 时期早期的框架性文章；三层分析单位 | https://tidyfirst.substack.com/ | [一手]（经上游核实） |
| 2022-07-29 | 发表《First, After, Later, Never》 | 时序决策框架（先做 / 之后做 / 稍后做 / 永不做） | https://tidyfirst.substack.com/ | [一手]（经上游核实） |
| **2023-12-11** | 发表《Canon TDD》 | TDD 的**规范化重述**；开篇即声明「以下不是你该怎么做 TDD……请为你自己工作的质量负责」；文中自述 1995-10 在 Austin OOPSLA 把 SUnit 演给 Ward Cunningham 看 | https://newsletter.kentbeck.com/p/canon-tdd ・ https://raysinnema.blog/2023/12/12/canon-tdd-example-roman-numerals | [一手] |
| 2024-05 | SE Radio 615 访谈，署名仍为「Chief Scientist at Mechanical Orchard」 | 确认 2024 年他仍在 Mechanical Orchard | https://se-radio.net/2024/05/se-radio-615-kent-beck-on-tidy-first | [一手] |
| 2024 秋（**存疑**，见第 5 章） | 参加一场工作坊，**第一次见到 Steve Yegge**，被其 vibe coding 热情「传染」 | **AI 编程转折点的触发事件**；自述「我抓住了它（I caught it）」、随后「消失」在项目里 | https://videos.itrevolution.com/watch/1122001849 ・ https://www.heavybit.com/library/podcasts/o11ycast/ep-80-augmented-coding-with-kent-beck | [一手] |
| 2024 | 出版《The Good News Factory》（O'Reilly 高管简报），讲软件设计为何值得 C-suite 关注 | 系列第二本，面向高管而非工程师 | https://oreilly.com/library/view/the-good-news/9781098170158/preface01.html | [一手] |
| 2025（YOW! 2025 / DevOps Enterprise Summit Las Vegas 2025） | 演讲《Kudzu to Garden: Sustainable Augmented Development》 | 提出 **feature drunk（功能醉）**、**going solid（凝固）**、features vs options 双轴图 | https://videos.itrevolution.com/watch/1122001849 | [一手] |
| 2025-04-30 | O11ycast #80《Augmented Coding with Kent Beck》播出 | 首次系统公开「augmented coding」；说出金句「Augmented coding means never having to say no to an idea」；并明确表态**不喜欢 "vibe coding" 这个词** | https://www.heavybit.com/library/podcasts/o11ycast/ep-80-augmented-coding-with-kent-beck | [一手] |
| 2025-05 | O'Reilly "Coding with AI" 研讨会，讲《Vibe Coding: More Experiments, More Care》 | 把主张带进主流出版方舞台 | https://kentbeck.com/ ・ https://self.md/people/kent-beck-augmented-coding | [一手]+[二手] |
| 2025-05-13 | 宣布 **Thinkie World Congress 1**，定于 6 月 4 日，征集 facilitator | 「Thinkies」（约 90 个创造性思考习惯）从个人清单变成社群活动 | https://tidyfirst.substack.com/p/thinkie-world-congress-1-june-4 | [一手] |
| 2025-06-04 | Thinkie World Congress I 举办 | 其官网确认「第一届 Thinkie World Congress 于 2025 年举办」 | https://kentbeck.com/ ・ https://tidyfirst.substack.com/s/thinkies/archive?sort=new | [一手] |
| 2025-06-11 | The Pragmatic Engineer 播客《TDD, AI agents and coding with Kent Beck》 | 与 Gergely Orosz 对谈；核心论点：TDD 没死，反而更相关 | https://newsletter.pragmaticengineer.com/p/tdd-ai-agents-and-coding-with-kent | [一手] |
| 2025-06-25 | 发表长文《Augmented Coding: Beyond the Vibes》 | 用 Rust 与 Python 写了一个**有生产竞争力的 B+ Tree 库**，以此论证 augmented coding ≠ vibe coding | https://kentbeck.com/summaries/augmented-coding-beyond-the-vibes ・ https://tidyfirst.substack.com/p/augmented-coding-beyond-the-vibes | [一手] |
| 2025-08-12 起 | 开始聚焦「可持续性」系列：《Match The Pipes》《Kent's Going Home》《New Is The New Black》《Cloud Development Environments…》 | 主题从工具转向「人怎么撑得住」 | https://kentbeck.com/summaries | [一手] |
| 2025-08-18 | 发表《Leaving the Nest》 | 公开讲述把 newsletter 从副业做成「支撑全职写作的生意」的运营与财务决策 | https://tidyfirst.substack.com/p/leaving-the-nest | [一手] |
| 2025-08-27 | 发表《Beyond the IDE》 | 主张随 AI 生成代码，IDE 应围绕「审阅」而非「敲键」重新设计 | https://tidyfirst.substack.com/p/beyond-the-ide | [一手] |
| 2025-09-05 / 09-11 / 09-15 | 《Genie Fight》《Programming Deflation》《Teaching Augmented Coding》 | 提出「编程通缩」；把多智能体当作博弈论问题（分离职责以防自评作弊）；开始教 augmented coding | https://kentbeck.com/summaries | [一手] |
| 2025-10-08 | 发表《Separate Failed Assertions from Unexpected Exceptions?》 | 回到测试框架设计的老问题，但语境已变成 AI 生成测试 | https://tidyfirst.substack.com/p/separate-failed-assertions-from-unexpected | [一手] |
| 2025-11-10 / 11-11 | 《Intentions & Actions》《Why Does Development Slow?》 | 提出「每加一个功能都在烧掉 optionality」；把 AI 提速导致的加速崩溃点显式化 | https://tidyfirst.substack.com/p/intentions-and-actions-1aa ・ https://tidyfirst.substack.com/p/why-does-development-slow | [一手] |
| 2025-11-19 | 《If You've Been Thinking About Subscribing to Premium…》 | 宣布付费层要探讨「当 AI 是结对伙伴时，心理安全与责任意味着什么」 | https://tidyfirst.substack.com/p/if-youve-been-thinking-about-subscribing | [一手] |
| 2025-11-28 | 《Monday - Last Call on $180/Year》 | 定价锚点：**年费 180 美元**（原价约 24% 折扣） | https://tidyfirst.substack.com/p/monday-last-call-on-180year | [一手] |
| 2025-12-04 | 《Explore *Then* Expand *Then* Extract》 | 把 3X 拆成**顺序三段**，比原版更强调时序 | https://tidyfirst.substack.com/p/explore-then-expand-then-extract | [一手] |
| 2025-12-12 | 《Party of One for Code Review!》 | 直击「AI 生成速度快过人类审阅速度」后的 code review 意义 | https://tidyfirst.substack.com/p/party-of-one-for-code-review | [一手] |
| 2025-12-26 / 12-29 | 《The Precious Eyeblink》《My Fitbit Buzzed and I Understood Enshittification》 | 前者提出以 **400ms（Doherty Threshold）** 衡量工具；后者批评指标驱动的产品劣化 | https://kentbeck.com/summaries | [一手] |
| 2026-01-20 起 | 《Tidy Together Reboot》《Genie Sessions: Optionality》等 | 开始把「团队一起 tidy」当成正式命题 | https://tidyfirst.substack.com/p/tidy-together-reboot | [一手] |
| 2026-02-03 / 02-04 / 02-06 | 《The Pinhole View of AI Value》《Is Source Code Going Away?》《Labor Replacement is a Poison Pill》 | 三连击反对「AI 只为替代人力」的叙事 | https://kentbeck.com/summaries | [一手] |
| 2026-02-13 / 02-18 | 《Earn *And* Learn》《Don't Accomplish Everything》 | 提出 **Finish Line Game vs Compounding Game**；重述 Facebook 首次绩效面谈与 P50 目标 | https://tidyfirst.substack.com/p/earn-and-learn ・ https://newsletter.kentbeck.com/p/dont-accomplish-everything | [一手] |
| 2026-02-23 | 《Genie: Death of the Iron Triangle?》 | 质疑「快 / 便宜 / 好」三角是否已可同时满足 | https://tidyfirst.substack.com/p/genie-death-of-the-iron-triangle | [一手] |
| 2026-03 起 | 《Forest Thinning》《Why Your Progress Is About The Same As Everyone Else's》《Tremors》 | 用俄勒冈森林疏伐讲「改激励而非逼妥协」；并提出识别设计退化的「震动」信号 | https://kentbeck.com/summaries | [一手] |
| **2026-04-16** | 发表《Parkinson's——Not trying to be subtle here》 | **公开确诊帕金森病**（当时刚满 65 岁，症状仅在左前臂与左大腿）；提出 **time value of time（时间的时值）**；宣布不放弃「帮极客在世界上感到安全」的使命，会继续写代码、写 newsletter，并建议有合作意向者尽早联系其 business manager | https://newsletter.kentbeck.com/p/parkinsons | [一手] |
| 2026-04-16 | 《Extreme Time Value of Money: Late-stage Career Planning》 | 把确诊带来的决策框架应用到职业生涯财务规划 | https://tidyfirst.substack.com/p/extreme-time-value-of-money-late | [一手] |
| 2026-04-01 / 04-03 | 《Genie Sessions: TCR Skill》《Starving Genies》 | TCR（test && commit || revert）与 AI 的兼容实验；以及对 AI 限流的经济学解读 | https://tidyfirst.substack.com/p/genie-sessions-tcr-skill ・ https://tidyfirst.substack.com/p/starving-genies | [一手] |
| 2026-04-21 / 04-22 / 04-23 | 《Passing Tests Bore Me》《Genie Lessons: Nobody Wants Agents》《Genie Tarpit》 | **明确唱衰 multi-agent 编排**：「问题不是蜂群，是结果导向」；并提出 AI 生成代码的 **complexity tarpit** | https://tidyfirst.substack.com/p/genie-lessons-nobody-wants-agents ・ https://tidyfirst.substack.com/p/genie-tarpit | [一手] |
| 2026-04-29 / 05-02 / 05-04 | 《Adaptive Radix Tree》《Run, Right, and Fast…》《Genie Sessions: Run, Right, and Fast…》 | 用 ART（自适应基数树）做 augmented coding 的数据结构案例 | https://tidyfirst.substack.com/p/adaptive-radix-tree | [一手] |
| 2026-05-08 | 《Thoughts, Not Thinking?》 | 讨论 AI 快速原型如何改变 build / buy / customize 的取舍 | https://tidyfirst.substack.com/p/thoughts-not-thinking | [一手] |
| 2026-06-10 | O11ycast 相关内容再传播（Ep. #80 与后续讨论） | 显示其 2025 年提出的框架仍在被引用 | https://iheart.com/podcast/256-o11ycast-31093426/episode/ep-80-augmented-coding-with-kent-273766192 | [二手] |
| 2026-06-25 | 发表《The Cost YAGNI Was Never About》 | 论点：YAGNI 从来不是为了省力气，所以「生成变便宜」并不能让它退休 | https://newsletter.kentbeck.com/p/the-cost-yagni-was-never-about | [一手] |
| 2026-07-01 | The Pragmatic Engineer 第二次长访谈《How Kent Beck shapes the software engineering industry》（约 2 小时 27 分） | 核心表述：**信任（trust）而非代码产量**将定义 AI 时代的软件工程 | https://newsletter.pragmaticengineer.com/p/how-kent-beck-shapes-the-software | [一手] |
| 2026-07-14 / 07-15 / 07-22 | 《The Beginnings of an Idea: XP is Long Volatility》《Long Volatility Development》《Long Vol: What is Volatility?》 | **把 XP 重新解释为「做多波动率（long volatility）」**——他晚年最系统的一次理论重构 | https://newsletter.kentbeck.com/p/the-beginnings-of-an-idea-xp-is-long ・ https://newsletter.kentbeck.com/p/long-volatility-development | [一手] |
| 2026-07-30 | 发表《Canon 3X: Explore/Expand/Extract》，开启 **Canon 系列** | 自述：「我开始写 Canon 系列文章，用尽可能平实、无歧义的方式解释我的想法——不用类比、不劝说，只讲事实」 | https://newsletter.kentbeck.com/p/canon-3x-exploreexpandextract | [一手] |
| 2026-08-05 / 08-13 / 08-14 | 《Speculative Short Volatility & Neglectful Short Volatility》《Busy is Short Volatility》《Baking a Model》 | 把波动率框架推到「忙碌＝做空波动率」；《Baking a Model》回忆高中时盯着 Motorola 6800 指令集手册等公交 | https://newsletter.kentbeck.com/archive | [一手] |
| 2026-08-中 | Still Burning 第二季开播，合作伙伴为 WorkOS 与 Augment Code | 播客进入第二季 | https://share.transistor.fm/s/398e4760 | [一手] |
| 2026-08-21 | Still Burning 特辑《How Do You Know That?》，对谈其长女 **Beth Andres-Beck**（软件工程师） | 罕见的家庭同台，主题是「工程师如何知道自己知道」 | https://podcasts.apple.com/pk/podcast/how-do-you-know-that/id1887873329?i=1000777887869&l=ur | [二手] |
| 2026-09-02 | 发表《Reject Change, Sometimes》 | 与《Volatility, Shannon's Demon, & Free Money》同批；最新一期 | https://newsletter.kentbeck.com/p/reject-change-sometimes | [一手] |
| **2026-09-30（预定）** | 《Tidy Together: A Team Exercise in Empirical Software Design》出版（O'Reilly，ISBN 9781098178765 / 9781098178758） | Empirical Software Design 系列第三本；官网确认其仍在写作中，草稿章节对付费订阅者开放 | https://awesomebooks.com/book/9781098178765/tidy-together ・ https://www.oreilly.com/library/view/tidy-together/9781098178758/ ・ https://kentbeck.com/ | [二手]（出版日）/[一手]（进度） |

---

## 2. 分阶段详述

### 2.1 Smalltalk 时代：一个「用 Alexander 读软件」的年轻人

Kent Beck 的起点不是测试，也不是方法论，而是**建筑学的类比**。

他自述，本科在 University of Oregon 读书时，宿舍里的建筑学院同学把他指向 Christopher Alexander；他「花了几个月，站在大学书店里读完了整本《The Timeless Way of Building》」。这是一个极其重要的细节：他后来的所有工作——模式、XP、TDD、Tidy First——都可以看成「把 Alexander 关于建筑的主张，搬到软件上」的不同尝试。

在 Tektronix 工作一年半后，他在 Powell's 书店淘到一本破旧的《Notes on the Synthesis of Form》。Alexander 在第二版导言里对「方法学家（methodologists）」的痛骂，让他产生了强烈共鸣：**「他不喜欢建筑师的那些东西，恰好就是我不喜欢软件工程师的那些东西。」** 他随即说服 Ward Cunningham：「我们发现了一件大事。」

于是有了 1987 年 OOPSLA 那篇 "Using Pattern Languages for Object-Oriented Programs"，以及一个很能说明他行事风格的小故事：他和 Ward 在一家客户那里做 UI 设计咨询，两人在 Ward 的 VW Vanagon 车上临时决定「试试我们一直在研究的那套模式东西」。Alexander 说建筑的使用者应该参与设计，所以他们让**系统的使用者**来设计界面。Ward 提出了一套五条目的模式语言（Window per Task / Few Panes / Standard Panes / Nouns and Verbs / Short Menus），结果他们「为这个（坦白说很朴素的）界面的优雅而感到惊讶」。

1989 年的 **SUnit** 是另一个关键点。它不是从理论出发的，而是从**工具需求**出发的：Smalltalk 程序员需要一个能跑单元测试的框架。这篇 "Simple Smalltalk Testing: With Patterns" 直接生出了后来的 xUnit 家族，并在十年后由他与 Erich Gamma 一起变成 Java 世界的 **JUnit**。注意这个顺序——**他先是测试框架的作者，很久以后才成为 TDD 的提出者。**

同时代的另一条线是 **CRC 卡**（Class-Responsibility-Collaboration card），他与 Ward Cunningham 一起推广。这是「把设计从个人脑中搬到可以被人围观的物理对象上」的最早尝试，也是他后来「软件设计是人的关系」这一主张的技术原型。

这一时期的经济形态是**自雇**。他在 c2.com 的自述页面写得很直白：「我拥有并经营 First Class Software, Inc.。我为自己工作，好更好地平衡职业、个人与家庭三个方面。」他在 Santa Cruz 县乡间（Boulder Creek）与妻子、四个孩子、十只鸡、两只鹌鹑和一条狗住在一起，同时梦想着在俄勒冈南部 Merlin 镇附近的一处 20 英亩牧场上工作——「现在那里只有一辆拖车和一口井。」

这段自述还留下一个观察：**「模式作为一种收入来源，当时仍在发育中。」** 他当时主要的收入来自 Smalltalk 咨询，以及开发并发行两个 Smalltalk 工具：Profile/V 与 Object Explorer for VisualWorks。这解释了他后来为何能在「思想输出」与「养活自己」之间保持一种很特别的坦率——他一直是一个**必须自己付账的思想家**。

### 2.2 XP 的诞生：从 Chrysler C3 到《Extreme Programming Explained》

1996 年，Chrysler 的 **C3（Comprehensive Compensation System）** 项目把 Kent Beck 从「Smalltalk 咨询顾问」变成了「方法论作者」。

合同本身由几个人签下：Parc Place Systems 总裁 **Adele Goldberg**，以及 Arbor Intelligent Systems 总裁 **Ron Suarez**。Beck 被请进来做设计，而他立刻把 **Ron Jeffries** 拉了进来。1996 年 3 月，团队估计系统约一年后可以上生产。1997 年，团队采用了一套后来被正式命名为 **Extreme Programming** 的工作方式。实际的交付「只晚了几周」——这个结果后来被反复引用为 XP 有效性的证据。

这里有一个容易被忽略的细节：**XP 不是先在会议室里想出来的，而是先在一群人身上跑出来的。** Beck 在 2023 年的一篇回顾里把这段关系讲得更清楚：当时 Rob Mee 是一个「学 Smalltalk 很快、而且有本事让程序员克服恐惧去试新东西」的年轻程序员。Beck 自称是个「摇树的人（tree shaker）」，需要有人替他做日常带团队的活。两人一起做过几个项目：**一个集装箱航运调度器、一个在线寿险系统、以及一次当时最大电商网站之一的重构。**

这一段经历后来分裂成两条支流：

- Beck 从中提炼出 **Extreme Programming**；
- Rob Mee 从中提炼出 **Pivotal** 的商业模式——「不是开发完丢给客户，而是**和**客户一起开发，教他们可持续且有效的方法」。Pivotal 最终做到 3000 多名工程师、设计师与产品人员，孵化 Pivotal Cloud Foundry 与 Pivotal Tracker，被 EMC 收购、分拆、IPO，市值超过十亿美元。

二十多年后，这两条支流又汇合了——这就是 Mechanical Orchard 的由来。

1999 年《Extreme Programming Explained: Embrace Change》出版，获 Jolt Productivity Award。同一年，他与 Martin Fowler 等人合著了《Refactoring》。2002 年《Test-Driven Development by Example》出版，也拿了 Jolt Productivity Award。

TDD 的表述极其简洁，值得原样保留——他给出的两条规则是：

1. **没有失败的自动化测试，就不写哪怕一行代码**（Never write a single line of code unless you have a failing automated test）。
2. **消除重复**（Eliminate duplication）。

这个简洁性是他的力量，也是后来争议的来源：规则太简单，以至于不同的人能在其中读出完全不同的东西（关于这一点，可对照其 Canon 系列的意图——**「不用类比、不劝说，只讲事实」**，正是为了压缩解读空间；该系列始于 2023-12-11 的《Canon TDD》）。

### 2.3 敏捷年代：从 Snowbird 到「敏捷工业复合体」

2001 年 2 月，Utah Snowbird。17 位方法论作者聚在一起，产出《敏捷宣言》。Kent Beck 是原始签署人之一，并乐于强调自己是**按字母序的第一位签署人**。

这里需要留意一个常被误传的点：**XP（1997 正式命名）早于敏捷宣言（2001）**，而 TDD 的系统化文本（2002）晚于两者。也就是说，把他的思想史排成一条直线是错的；更准确的说法是：**XP 是他的产物，敏捷运动是他的产物所参与塑造的公共容器，而 TDD 是他在 XP 内部提炼出来、后来独立成书的技术核心。**

2005 年有一个他自己反复提及的转折。他受邀与 Ed Yourdon、Larry Constantine 同台 panel——这两位是《Structured Design》的作者，也就是 **coupling（耦合）与 cohesion（内聚）** 这两个术语的引入者。为准备这次 panel，他回去读了这本书，然后意识到：

> 「这些先驱很久以前就已经写出了软件设计领域的『牛顿运动定律』。」

这是他**转向软件设计**的正式起点。他后来在官网写道：「在我职业生涯的第 25 年，2005 年……」「十八年后，我终于出版了《Tidy First?》。」——**从 2005 到 2023，整整 18 年。**

2000 年代他经营 **Three Rivers Institute**，做独立顾问、写作、演讲。2010 年 11 月，该站发布最后一篇文章（《Minimum Viable Product revisited》），其本人后来在 Substack 上注明这是「Three Rivers Institute 的最后一篇」。他在这段时期的文章（如《Just Ship, Baby》）今天只能通过 web.archive.org 访问。

2011 年，他在 SD Times 的访谈里已经把焦点说得很清楚了：

> 「我仍在做 extreme programming。我的**技术焦点已经转向软件设计**——如何比大批量设计更高效、更安全地增量设计软件。**社会层面**，我感兴趣的是如何在自己的工作中展示问责与责任。」

这句话几乎提前预告了他此后十五年的全部工作方向，包括 2020 年那篇「科技业有共情赤字」的报道，以及 2026 年那本书的书名《Tidy Together》。

2019 年 6 月，他发表《Maybe Agile Is the Problem》。要点包括：**许多组织已「敏捷疲劳」；「敏捷工业复合体（Agile Industrial Complex）」本身就是问题的一部分。** 这篇文章的标题之所以重要，是因为它出自**敏捷宣言的原始签署人**之手——他站到了自己所参与创建的运动的对立面。

### 2.4 Meta / Facebook 年代：3X 与「完成 50% 才对」

2011 至 2018 年，Kent Beck 在 Facebook（后为 Meta）任 **Technical Coach**。这是他生涯中唯一一段长期的大厂全职经历。

这段经历最重要的产出不是代码，而是 **3X 模型：Explore / Expand / Extract**，以及配套的「P50 目标」观点。其来源，他自己讲过：**第一次绩效面谈。** 他的经理是 David Recordon，他带着一份「我要完成一切」的清单走进会议室。

他的结论是：软件团队经常把 **Extract 阶段的管理实践**（KPI、紧排期、跨团队依赖）套用到 **Explore 阶段**的工作上，而 Explore 的价值恰恰在于学习和发现。因此在 Explore 阶段，**完成 50% 的雄心目标反而是健康信号**——它意味着你学到了意料之外的东西，或者发现了比原计划更高价值的工作。

这段在大厂的经历还给了他一套后来被反复引用的观察工具。他在 2026 年 7 月的长访谈里把结论收敛成一句话：**能最快受益于 AI 编程工具的，是那些在工具到来之前就已经有强设计直觉和测试习惯的开发者。** 这个判断的底色，正是他 2011–2018 年在 Meta 内部看到的工程师成长曲线。

另有一个常被转述但需要小心的说法：一些中文与英文二手来源称他「被 Facebook 解雇」（如 2019 年 10 月的 rackandstack-tech 博文标题）。他自己的表述（2018 年前后的 Facebook Note）只说「在我离开 Facebook 之后的七年里……」，是主动离开的口吻。**本报告保留两种说法，不选边**（见第 5 章）。

### 2.5 Gusto 与 Mechanical Orchard：回到「教练」，再回到「Smalltalk 时代的老朋友」

2019 年，Kent Beck 加入 **Gusto**，头衔是 software fellow / coach，辅导工程团队构建面向小企业的薪酬系统。Business Insider 在 2019 年 9 月 4 日报道了此事。

2020 年 8 月，Built In 的报道标题是「Kent Beck Says Tech Has a Compassion Problem（科技业有共情问题）」。这是理解他晚期思想的关键文本：**他的叙事重心从「技术实践」移向「人与人之间的关系」。**

2023 年 1 月 10 日，他以 **Chief Scientist at Mechanical Orchard** 的身份发表《Mechanical Orchard: A New Company With a Long History》。这篇文章值得细读，因为它把时间线闭环了：

- 1996 年，Beck 是 Smalltalk 程序员，Rob Mee 是「学得很快的年轻程序员」；
- 他们一起做了调度器、在线寿险、电商重构；
- Beck 提炼出 XP，Rob Mee 创立 Pivotal；
- COVID 期间，Rob 的团队替一个州卫生部门替换了摇摇欲坠的遗留系统，客户不想自己运维，于是团队接管了运维与演进——**Mechanical Orchard 的商业模式由此诞生**；
- 于是 Beck 与 Rob Mee 在 27 年后再度合流。

Beck 在这篇文章里的自我定位也值得记录：他把自己写成了「敏捷宣言的原始签署人（按字母序是第一位）、与 Ward Cunningham 一起开创软件模式、与 Erich Gamma 一起写出 JUnit 并启发当今以程序员为中心的测试工具、重新发现 TDD、发明 XP 并写了两本获奖书」——这是他自己认可的一份**自我履历**，对本报告的排序有直接参考价值。

2023 年 11 月前后，《Tidy First?: A Personal Exercise in Empirical Software Design》出版，Larry Constantine 作序。这本书开启了他自己定义的 **Empirical Software Design 系列**，其核心断言是：

> 软件创造价值有两种方式——今天的现金流，以及**为新的现金流保留的 optionality（可选项）**。**软件设计创造的就是 optionality。**

2024 年 5 月，SE Radio 615 期的署名仍是「Chief Scientist at Mechanical Orchard」，可确认他在该年度仍于此任职。

### 2.6 Augmented Coding 与当下：65 岁重新「复活」的编程生涯

这是整条时间线上最戏剧性的一段，它有明确的自述起点。

在 DevOps Enterprise Summit Las Vegas 2025 的演讲《Kudzu to Garden: Sustainable Augmented Development》中，他开场就说：

> 「我必须亲自感谢 Gene，他在**四月**复活了我的编程生涯。我被邀请参加一个工作坊，当时完全不知道事情即将剧烈变化。我看着 Gene 和 Yagi 那场关于 vibe coding、关于他们有多享受它的对谈。**我抓住了它（I caught it）。**」

在那之前，他对 AI 的态度是「自动补全还不错，但不改变我的人生」。转折之后，他「消失」在了项目里——在 O11ycast #80 里他描述：周五工作坊结束，周六早上他想「好，让我试试这东西」，然后就「一头扎进去」，凌晨两点醒来想着「啊，我应该这样指示我的 agent」，起来干两小时，再睡一会儿。

**请注意这一段对理解其晚年思想的重要性**：他说自己「作为一个 boomer geek，大约 20 年前就不再有耐心处理那些细枝末节了」，「最喜欢的编程语言正在消失，要处理依赖地狱，呃」。他形容那种状态是「作为一个极客，当你意识到『我再也实现不了东西了』时，你身体的一部分死掉了」。

然后他给出了那句被反复引用的金句：

> **「Augmented coding means never having to say no to an idea.」**（增强式编程意味着你再也不用对一个想法说不。）

他的技术论点在 2025 年 6 月 25 日的长文《Augmented Coding: Beyond the Vibes》中成型：他把 AI 编码分成两种——

- **vibe coding**：接受 AI 生成的任何东西；
- **augmented coding**：把 AI 当作**资深结对程序员**，强制 TDD 纪律，及早发现设计漂移，拒绝「禁用测试」「未经要求的功能」这类捷径。

为了证明这不是嘴上功夫，他用这种方式写出了一个**有生产竞争力的 B+ Tree 库**（Rust 与 Python）。这也解释了他 2026 年上半年大量涉及数据结构的长文（Adaptive Radix Tree、GPUSortedMap 等）——他在用真实项目做实验田。

他的框架可以概括为三组：

**第一组：呼吸（breathing）。**
加功能＝吸气（inhale complexity），重构＝呼气（exhale）。AI 极擅长吸气，**但不会呼气**——「那个巨型函数？AI 又往里加了 20 行。」「AI 假定它那颗行星级的大脑能处理任何复杂度，从不需要降低复杂度。它是对的，直到它不是。」

**第二组：feature drunk 与 going solid。**
他用 Tufte《The Visual Display of Quantitative Information》里的技巧（**消掉时间轴**）画了一张图：横轴 features，纵轴 options。用 genie（他给模型起的绰号——「它实现愿望，但不是你真正想要的东西」）实现一个功能，必然烧掉一些 optionality；如果接着要下一个功能，就再烧掉一些；很快进度变慢，最后**going solid**——他借用了核电行业的说法：「going solid 不是好事，意思是完全失去了对系统的控制能力。」

他还给「刚上手那种『我什么都能实现』的眩晕感」起了名字：**feature drunk（功能醉）**。他 GitHub 上一串 `bitbl`、`bitbl2`、`bitbl3`、`bitbl4`、`bplus3`、`bplus3-2`、`bplus3-3` 的仓库，就是这个现象的化石层。

**第三组：结果导向，而非流程编排。**
2026 年 4 月，他连续发了两篇唱衰 multi-agent 的文章：《Genie Lessons: Nobody Wants Agents》——「问题不是蜂群，是结果导向。你应该描述你想要的代码做什么，让系统自己判断可行性与成本，而不是靠 prompt 工程在 agent 之间协调。」以及《Genie Tarpit》——AI 生成的代码以超过人类管理速度积累复杂度，团队卡在「勉强能用、但改不动」的泥沼区。

**他的解法是把 XP 的老手艺搬回来**：约束上下文（只告诉 AI 下一步所需的信息）、保留 optionality（别让 AI 吃掉「种子玉米」）、扩张与收缩平衡、保留人类判断。他在 2025 年 11 月到 12 月的文章把这件事讲得更狠：《Why Does Development Slow?》（每加一个功能都在烧 optionality）、《Party of One for Code Review!》（AI 生成速度超过人类审阅速度后，code review 到底要保证什么）、《The Precious Eyeblink》（用 400 毫秒的 Doherty Threshold 重新衡量工具，而不是用「完整性」）。

**2026 年的两条新线。**

第一条是 **long volatility（做多波动率）**。2026 年 7 月，他连发《The Beginnings of an Idea: XP is Long Volatility》《Long Volatility Development》《Long Vol: What is Volatility?》。这是他晚年最系统的一次理论重构：**把 XP 重新解释为一种「做多波动率」的策略**——XP 的短周期、持续反馈、随时可改，本质上是在为一个高波动的未来买期权。到 2026 年 8 月，他把这个框架推到「Busy is Short Volatility（忙碌是做空波动率）」。

第二条是 **Canon 系列**。需要修正一个常见误解：**Canon 系列的起点是 2023-12-11 的《Canon TDD》，不是 2026 年 7 月。** 2026-07-30 的《Canon 3X: Explore/Expand/Extract》只是把这条线延伸到 3X。该系列宗旨：**用平实、无歧义的方式重述自己的核心想法——不用类比、不劝说，只讲事实。** 这是对自己思想被误读（尤其是被「敏捷工业复合体」误读）的一次清理。同期他在 Craft 等会议讲《Canon TDD》，并把经典的 TDD 表述重新整理。

**最后是 2026 年 4 月 16 日那篇文章。** 标题是《Parkinson's》，副标题是「不打算委婉」。他公开了自己的帕金森诊断，解释直接原因是「很多人在看《Still Burning》时看到我的手在抖，然后来问我」。他给出一组医学事实（α-突触核蛋白错误折叠、黑质被破坏 60–80%），描述了自己的情绪反应（「我刚满 65 岁，一直很清楚时间的推移。我想，我新的处境中令人不安的一点是，我对晚年最好的设想一下子差了很多」）。

然后是那个成为他 2026 年核心决策框架的词：**time value of time（时间的时值）**——「如果一件事我今年能做，它对我比明年做更有价值，比五年后做**远远**更有价值。」

商业上他给出的结论非常明确：「我负担不起停掉我的生意。我需要尽可能快地朝财务安全推进。但是，我不会以牺牲享受我最好、最可活动的这几年为代价去挣钱。如果有人出 1 亿美元一年买我三年每周 60 小时，我只会笑。」

后续的行动他列了：不放弃「帮极客在世界上感到安全」的使命；继续写代码（点名了 `ARMLivingObjects` 与 `AdaptiveRadixTree1` 两个 GitHub 项目）；艺术与音乐将变得更困难但他有想法；Thinkies 正在「有自己的生命」；newsletter 仍将大体不离题，「因为我可给的操心的东西更少了」；并建议有意约其 coaching / consulting / 演讲的团队**尽早联系他的 business manager**。

**这就是 2026 年 9 月此刻的 Kent Beck 的状态：65 岁，确诊帕金森，仍在写代码、写 newsletter、做播客、开 Canon 系列，同时明确按「时间的时值」重新排序了自己愿意做的事情。**

---

## 3. 思想转折点专章

本章按时间顺序列出每一次转折，每条给出**转折前 → 转折后**的对照，并附时间与依据。

### 转折 1｜从「Smalltalk 咨询顾问」到「模式语言的布道者」

- **时间**：1987（OOPSLA'87），思想酝酿始于本科阶段。
- **转折前**：一个会做 UI、会写 Smalltalk 工具的自由顾问。
- **转折后**：一个试图把 Christopher Alexander 的建筑理论搬到软件上的人，并说服了 Ward Cunningham 一起做。
- **依据**：c2.com 自述页（[一手]）明确写出「我最初发现模式，是在俄勒冈大学读本科时」，以及 1987 年那次「在 Ward 的 VW Vanagon 上决定试试」的实验。

### 转折 2｜从「模式布道者」到「测试框架作者」

- **时间**：1989（SUnit）。
- **转折前**：关注设计表达（模式、CRC 卡）。
- **转折后**：开始关心「怎么知道自己写的东西是对的」——工具化路径。
- **意义**：这是**TDD 的技术前提**，但早了整整十三年。**不要把 SUnit 与 TDD 混为一谈**：SUnit 是框架，TDD 是工作流。
- **依据**：everything.explained.today 与 owiki.org 均记载 1989 年 SUnit 与论文 "Simple Smalltalk Testing: With Patterns"（[二手]，内容源自 Wikipedia）。

### 转折 3｜从「独立顾问」到「XP 创始人」

- **时间**：1996（进入 C3）→ 1997（正式命名 XP）→ 1999（成书）。
- **转折前**：一人公司老板，同时做咨询、工具、写作。
- **转折后**：一个要为大团队设计工作方式的人；必须解决「怎么让 12 个人一起写代码还不崩」。
- **依据**：Wikipedia 正文（[二手]）的 C3 段落；以及 Beck 2023 年在 Mechanical Orchard 的回顾（[一手]）中关于 Rob Mee 与「树摇者」的自述。

### 转折 4｜从「XP 作者」到「敏捷运动核心人物」

- **时间**：2001 年 2 月，Snowbird。
- **转折前**：一种特定方法论（XP）的作者。
- **转折后**：一个公共运动（Agile）的共同奠基者。
- **注意**：这是**向上抽象**的一步，也是他后来最想与之保持距离的一步。
- **依据**：everything.explained.today（[二手]）；Beck 自称按字母序第一位签署人（[一手]，Mechanical Orchard 文章）。

### 转折 5｜从「方法论」到「软件设计」

- **时间**：2005（与 Yourdon、Constantine 同台 panel）。
- **转折前**：关注过程——怎么组织一群人写代码。
- **转折后**：关注结构——怎么**增量地、安全地**设计软件，而不是大批量设计。
- **依据**：kentbeck.com 官网自述（[一手]）：「二十五年前，2005 年，我受邀与 Ed Yourdon 与 Larry Constantine 同台……」；2011 年 SD Times 访谈（[一手]）确认「我的技术焦点已经转向软件设计」。
- **代价**：从 2005 到《Tidy First?》出版（2023），**18 年**。他自己用「ridiculous（荒唐的）」形容这个时长。

### 转折 6｜对大厂现实与敏捷工业化的双重失望

- **时间**：2011–2018（Facebook 内部）→ 2019（公开化）。
- **转折前**：相信方法论可以改造组织。
- **转折后**：
  - 认识到**阶段错配**是组织失效的主因（3X：Explore 阶段用 Extract 的管理手段必然失败）；
  - 认识到**运动本身已被产业化**——「敏捷工业复合体是问题的一部分」。
- **依据**：3X 的首次绩效面谈自述（[一手]，2026-02-23 的《Don't Accomplish Everything》）；《Maybe Agile Is the Problem》（2019-06-13，InfoQ，[一手]，页面当时返回 405 故以搜索索引确认标题与日期）。
- **对照句**：2011 年他还在说「我的希望是敏捷开发进入本科课程、技术栈以及商人的预期」；2019 年他说「也许敏捷才是问题」。

### 转折 7｜从「技术实践者」到「软件设计是人的关系」

- **时间**：约 2019–2023。
- **转折前**：设计是耦合与内聚、是 optionality。
- **转折后**：设计是**一群人怎么一起做决定**。
- **依据**：2020 年 8 月 Built In 的「共情赤字」报道（[二手]）；2026 年他正在写的《Tidy Together》（[一手]，官网）副标题直译即「一个团队式的经验性软件设计练习」；2026 年 7 月他对 Pragmatic Engineer 的表述「软件工程是社会性活动」（[一手]）。
- **意义**：这是他 2026 年仍在推进的方向，也是他自认 AI **无法自动化**的那一部分。

### 转折 8｜从「AI 怀疑者」到「augmented coding 的实验者」

- **时间**：触发于一次工作坊（自述为「四月」），公开表达自 2025-04-30 的 O11ycast #80 起。
- **转折前**：自述「我一直是那种，嗯，自动补全还不错，但它不改变我的人生。而对我来说这就够了。」
- **转折后**：一天开五六个项目、凌晨两点醒来改 prompt、每周用没听过的语言实现东西。
- **触发机制**：他明确归因于**社交传染**——他看到 Gene Kim 与 Steve Yegge 谈论 vibe coding 时的兴奋，然后「我抓住了它」。
- **依据**：IT Revolution 演讲全文逐字稿（[一手]，https://videos.itrevolution.com/watch/1122001849 ）；O11ycast #80 全文逐字稿（[一手]）。
- **关键表述**：「Augmented coding means never having to say no to an idea.」以及「他 20 年来的核心困境——『我有想法，但没有精力推过那些细节』——被解除了。」

### 转折 9｜「TDD 没死，反而更重要」——把老手艺重新定价

- **时间**：2025 年中至今。
- **转折前**：TDD 被广泛视为「AI 时代的过时仪式」。
- **转折后**：TDD 被重新定义为**信任机制（trust mechanism）**——当 AI 生成代码时，测试是判断输出能否上线的合约。
- **依据**：2026-07-01 Pragmatic Engineer 访谈及其转述（[一手]+[二手]，https://prompts.ninja/news/kent-beck-software-engineering-ai-era ）；2025-06-11《TDD, AI agents and coding with Kent Beck》（[一手]）。
- **金句**：「AI 放大已有的工程纪律。没有纪律，你只是更快地生成 bug。」

### 转折 10｜从「AI 编排」退回到「结果导向」，并唱衰 multi-agent

- **时间**：2026 年 4 月（《Genie Lessons: Nobody Wants Agents》《Genie Tarpit》）。
- **转折前**：一度尝试多 agent 分工（他甚至提出过「本我 / 自我 / 超我」三个 agent 的架构幻想，见 O11ycast #80）。
- **转折后**：
  - **明确表态「没有人想要 agent」**——多 agent 把认知负担移给了你，而不是消除它；
  - 主张**结果导向**：描述你想要的代码要做什么，让系统自行判断可行性与成本；
  - 提出 **genie tarpit**：AI 生成代码的复杂度积累速度超过人类管理速度。
- **依据**：https://tidyfirst.substack.com/p/genie-lessons-nobody-wants-agents ・ https://tidyfirst.substack.com/p/genie-tarpit （均为 [一手]）。
- **意义**：这是他与当时主流「agentic 编排」热度的一次**逆向表态**，且发生在 2026 年 4 月——相对较早。

### 转折 11｜把 XP 重述为「做多波动率」（long volatility）

- **时间**：2026 年 7 月。
- **转折前**：XP = 一组实践（结对、TDD、小版本、持续集成、现场客户……）。
- **转折后**：XP = **一种做多波动率的策略**；短周期与持续反馈是在为一个高波动的未来**买期权**。延伸到 2026 年 8 月：「Busy is Short Volatility」（忙碌是做空波动率——你用确定性换掉了应对变化的余地）。
- **依据**：https://newsletter.kentbeck.com/p/the-beginnings-of-an-idea-xp-is-long ・ https://newsletter.kentbeck.com/p/long-volatility-development ・ https://newsletter.kentbeck.com/p/long-vol-what-is-volatility ・ https://newsletter.kentbeck.com/p/busy-is-short-volatility （均为 [一手]）。
- **意义**：**这是他晚年最系统的一次理论重构**——把 1997 年的方法论用 2026 年的金融直觉重新说了一遍。对 Skill 蒸馏而言，这可能是「他的思维操作系统」最完整的自述版本。

### 转折 12｜从「Canon 重述」到「时间的时值」（2026 年 4–7 月的双重收敛）

- **时间**：2026-04-16（帕金森公开）与 **2023-12-11 / 2026-07-30（Canon 系列，起点为《Canon TDD》，延伸至《Canon 3X》）**。
- **转折前**：持续对外输出新框架（genie、long vol、3X 变体）。
- **转折后**：
  - **向内收敛**：Canon 系列——「不用类比、不劝说，只讲事实」地重述已有的核心想法；
  - **向人生收敛**：time value of time——按剩余可活动年限重新排序一切决策。
- **依据**：https://newsletter.kentbeck.com/p/parkinsons ・ https://newsletter.kentbeck.com/p/canon-3x-exploreexpandextract （均为 [一手]）。
- **对 Skill 蒸馏的关键提示**：**2026 年 4 月之后，Kent Beck 的判断标准明确加入了「生命剩余时间」这一权重。** 任何模拟他决策的 Skill，如果忽略这一点，会失真。

---

## 4. 最近 12 个月动态（2025-09-17 → 2026-09-17）

**检索日期：2026-09-17。** 以下逐条列出，按时间正序。凡 Substack 文章，正文镜像统一使用可访问域名 `newsletter.kentbeck.com`（与 `tidyfirst.substack.com` 内容一致）。

### 4.1 Substack 文章（Software Design: Tidy First?）

| 日期 | 标题 | 内容要点 | URL |
|---|---|---|---|
| 2025-09-05 | Genie Fight | 让一个 genie 优化代码、另一个在隔离环境独立审计，用**结构激励**而非更好的 prompt 来消除自评偏差 | https://tidyfirst.substack.com/p/genie-fight-8e3 |
| 2025-09-11 | Programming Deflation | 「编程通缩」：AI 让代码变便宜，出现悖论——工具越好越想推迟动手，但实验成本趋零往往压倒等待 | https://tidyfirst.substack.com/p/programming-deflation |
| 2025-09-15 | Teaching Augmented Coding | 如何教工程师与 LLM 协作；框架是「协作技法」而非「要避开的工具」 | https://tidyfirst.substack.com/p/teaching-augmented-coding |
| 2025-09-17 前后 | Switching Scale | 设计模式随团队规模增长的失效点；从 10 人到 100 人要改的是沟通、所有权与决策结构，不只是加流程 | https://tidyfirst.substack.com/p/switching-scale |
| 2025-10-08 | Separate Failed Assertions from Unexpected Exceptions? | 测试框架该不该把「断言失败」与「意外异常」分成两种失败模式 | https://tidyfirst.substack.com/p/separate-failed-assertions-from-unexpected |
| 2025-10-16 | First Principles First | 越靠近「努力」一端测量越好观测，也越容易被钻空子；代码行数、PR 数、工时是负向指标 | https://tidyfirst.substack.com/p/first-principles-first |
| 2025-10-21 | Getting Ready to Launch | 发布倒计时的工程约束：下行风险远大于上行收益、时间固定、疲劳累积风险；目标是「安全地发布可用的产品」而非「发布所有功能」 | https://tidyfirst.substack.com/p/getting-ready-to-launch |
| 2025-10-29 | Pitching Hackathon Ideas: Oxymoron | 要求黑客松先提想法获批，会过滤掉期望值最高的探索 | https://tidyfirst.substack.com/p/pitching-hackathon-ideas-oxymoron |
| 2025-10-31 | Composable Tests | 把正交关注点分开测，测试数从 N×M 降到 N+M+1 而不损失特异性 | https://tidyfirst.substack.com/p/composable-tests |
| 2025-11-10 | Intentions & Actions | 让 git 历史与真实意图对齐 | https://tidyfirst.substack.com/p/intentions-and-actions-1aa |
| 2025-11-11 | Why Does Development Slow? | 每个功能都在烧掉 optionality；解法是在功能之间**有意投资于恢复 optionality** | https://tidyfirst.substack.com/p/why-does-development-slow |
| 2025-11-19 | If You've Been Thinking About Subscribing to Premium… | 付费层主题：AI 作为结对伙伴时，**心理安全与责任归属**意味着什么 | https://tidyfirst.substack.com/p/if-youve-been-thinking-about-subscribing |
| 2025-11-22 | Tidying: Canonical Order | tidy 提交应与功能提交分离；讨论「先 tidy 还是后 tidy」的规范顺序 | https://tidyfirst.substack.com/p/tidying-canonical-order |
| 2025-11-28 | Monday - Last Call on $180/Year | 年费 180 美元的最后一天促销 | https://tidyfirst.substack.com/p/monday-last-call-on-180year |
| 2025-12-01 | Explore *Then* Expand *Then* Extract | 3X 的阶段顺序化（比原版更强调时序） | https://tidyfirst.substack.com/p/explore-then-expand-then-extract |
| 2025-12-04 | The Bet On Juniors Just Got Better | **量化主张**：AI 助手把初级工程师的上手期从 24 个月压到 9 个月，越过盈亏平衡点的存活率从 64% 提升到 85% | https://tidyfirst.substack.com/p/the-bet-on-juniors-just-got-better |
| 2025-12-12 | Party of One for Code Review! | AI 生成速度超过人类审阅速度后，code review 的目标从「抓 bug」转向「保住结构完整性」 | https://tidyfirst.substack.com/p/party-of-one-for-code-review |
| 2025-12-26 | The Precious Eyeblink | 用 **400 毫秒（Doherty Threshold）** 重新定义工具质量；现代 IDE 为「完整」牺牲了「快」 | https://tidyfirst.substack.com/p/the-precious-eyeblink |
| 2025-12-29 | My Fitbit Buzzed and I Understood Enshittification | 指标驱动的产品开发如何系统性产出用户厌恶的功能 | https://tidyfirst.substack.com/p/my-fitbit-buzzed-and-i-understood |
| 2026-01-14 | （Bridges 相关条目） | 同期发布；索引中位置在 Taming the Genie 之后 | https://tidyfirst.substack.com/p/bridges |
| 2026-01-20 | Tidy Together Reboot | 「一起 tidy」作为团队惯例：把重构变成团队仪式，而非个人行为 | https://tidyfirst.substack.com/p/tidy-together-reboot |
| 2026-01-20 | Taming the Genie: "Like Kent Beck" | 用 persona 与架构约束引导 AI 走向更好的架构 | https://tidyfirst.substack.com/p/taming-the-genie-like-kent-beck |
| 2026-01-29 | Genie Sessions: Optionality | AI 让「探索多方案并丢弃失败品」的成本降到可忽略，改变 optionality 的经济学 | https://tidyfirst.substack.com/p/genie-sessions-optionality |
| 2026-01-30 | Can Genies Break Down Silos? | AI 工具能否在不增加流程负担的前提下减少组织孤岛 | https://tidyfirst.substack.com/p/can-genies-break-down-silos |
| 2026-02-03 | The Pinhole View of AI Value | 反对把 AI 价值窄化为「裁员」；四个杠杆：每工程师收入、上市时间、推迟资本支出、新商业模式 | https://tidyfirst.substack.com/p/the-pinhole-view-of-ai-value |
| 2026-02-04 | Is Source Code Going Away? | 源码不会消失，但角色在变 | https://tidyfirst.substack.com/p/is-source-code-going-away |
| 2026-02-06 | Labor Replacement is a Poison Pill | 「AI 替代人力」的框架会限制其经济与创造潜力 | https://tidyfirst.substack.com/p/labor-replacement-is-a-poison-pill |
| 2026-02-07 | Generation Gap or Just Rude? | 技术团队中的代际沟通 | https://tidyfirst.substack.com/p/generation-gap-or-just-rude |
| 2026-02-10 | Genie Session: Codex for Mac/GPUSortedMap | 用 Codex 实时构建 macOS GPU 加速有序映射 | https://tidyfirst.substack.com/p/genie-session-codex-for-macgpusortedmap |
| 2026-02-13 | Earn *And* Learn | **Finish Line Game vs Compounding Game**：规格驱动的交付 vs 每个完成的功能为下一个出资 | https://tidyfirst.substack.com/p/earn-and-learn |
| 2026-02-18 | Don't Accomplish Everything | Explore 阶段应瞄准 P50；附带 Facebook 首次绩效面谈的一手回忆 | https://tidyfirst.substack.com/p/dont-accomplish-everything |
| 2026-02-23 | Genie: Death of the Iron Triangle? | AI 是否让「快 / 便宜 / 好」不再互斥 | https://tidyfirst.substack.com/p/genie-death-of-the-iron-triangle |
| 2026-03-02 | A few questions about what you're working on… | 面向读者征集写作方向 | https://tidyfirst.substack.com/p/a-few-questions-about-what-youre |
| 2026-03-04 | Forest Thinning | 用俄勒冈森林疏伐讲「改激励结构比逼妥协更能解开僵局」 | https://tidyfirst.substack.com/p/forest-thinning |
| 2026-03-20 | Why Your Progress Is About The Same As Everyone Else's | 资深工程师为何停止变快：局部最优 vs 系统约束（沟通、测试基建、团队协调） | https://tidyfirst.substack.com/p/why-your-progress-is-about-the-same |
| 2026-03-26 | Tremors | 把代码中的小不一致当作深层架构问题的早期信号 | https://tidyfirst.substack.com/p/tremors |
| 2026-03-31 | Genie Sessions: TCR Skill | TCR（test && commit \|\| revert）与 AI 助手的持续上下文能否兼容 | https://tidyfirst.substack.com/p/genie-sessions-tcr-skill |
| 2026-04-01 | Starving Genies | 解读为何 OpenAI / Google / Anthropic 同期下调用量上限：不是算力危机，是叙事危机 | https://tidyfirst.substack.com/p/starving-genies |
| 2026-04-13 | The Bridge: Too Far | 关系中的越界信号与「过度给予」 | https://tidyfirst.substack.com/p/the-bridge-too-far |
| **2026-04-16** | **Parkinson's** | **确诊公开**；time value of time；使命不变 | https://newsletter.kentbeck.com/p/parkinsons |
| 2026-04-16 | Extreme Time Value of Money: Late-stage Career Planning | 把「时间的时值」用于晚期职业财务决策 | https://tidyfirst.substack.com/p/extreme-time-value-of-money-late |
| 2026-04-21 | Passing Tests Bore Me | 通过了的测试让人觉得无聊，说明测试太浅或耦合了实现细节 | https://tidyfirst.substack.com/p/passing-tests-bore-me |
| 2026-04-22 | Genie Lessons: Nobody Wants Agents | **唱衰多 agent**：问题是结果导向，不是蜂群 | https://tidyfirst.substack.com/p/genie-lessons-nobody-wants-agents |
| 2026-04-23 / **04-29**（两说，见 §5.13） | Genie Tarpit | AI 生成代码的复杂度泥沼 | https://tidyfirst.substack.com/p/genie-tarpit |
| 2026-04-29 | Adaptive Radix Tree | ART 的数据结构讲解 | https://tidyfirst.substack.com/p/adaptive-radix-tree |
| 2026-05-02 | Run, Right, and Fast for the Adaptive Radix Tree | 速度 / 正确性 / 可读性的取舍顺序 | https://tidyfirst.substack.com/p/run-right-and-fast-for-the-adaptive |
| 2026-05-04 | Adaptive Radix Tree（正文） | 同上 | https://tidyfirst.substack.com/p/adaptive-radix-tree |
| 2026-05-08 | Thoughts, Not Thinking? | AI 如何改变 build / buy / customize 的取舍 | https://tidyfirst.substack.com/p/thoughts-not-thinking |
| 2026-06-23 | Why So Literal? | 论类比作为沟通手段的失败 | https://newsletter.kentbeck.com/p/why-so-literal |
| 2026-06-25 | The Cost YAGNI Was Never About | YAGNI 从来不是为了省力气，所以「生成变便宜」不能让它退休 | https://newsletter.kentbeck.com/p/the-cost-yagni-was-never-about |
| 2026-07-10 | When Complaints Are Good News | 抱怨在 Explore 与 Expand 阶段是好消息 | https://newsletter.kentbeck.com/p/when-complaints-are-good-news |
| 2026-07-14 | The Beginnings of an Idea: XP is Long Volatility | **XP = 做多波动率**（理论重构起点） | https://newsletter.kentbeck.com/p/the-beginnings-of-an-idea-xp-is-long |
| 2026-07-15 | Long Volatility Development | 同上，展开 | https://newsletter.kentbeck.com/p/long-volatility-development |
| 2026-07-22 | Long Vol: What is Volatility? | 波动率的基本假设 | https://newsletter.kentbeck.com/p/long-vol-what-is-volatility |
| 2026-07-22 | How Do You Know That?（newsletter 版） | 与长女 Beth Andres-Beck 的对谈文字版 | https://newsletter.kentbeck.com/p/how-do-you-know-that |
| 2026-07-30 | Canon 3X: Explore/Expand/Extract | **Canon 系列启动**：不用类比、不劝说、只讲事实 | https://newsletter.kentbeck.com/p/canon-3x-exploreexpandextract |
| 2026-08-05 | Speculative Short Volatility & Neglectful Short Volatility | 两类「做空波动率」 | https://newsletter.kentbeck.com/p/speculative-short-volatility-and |
| 2026-08-13 | Busy is Short Volatility | 「忙碌」是做空波动率；引 Kingman 公式 | https://newsletter.kentbeck.com/p/busy-is-short-volatility |
| 2026-08-14 | Baking a Model | 回忆高中时盯着 Motorola 6800 指令集手册等公交 | https://newsletter.kentbeck.com/p/baking-a-model |
| **2026-09-02** | **Reject Change, Sometimes** | **目前可查到的最新一期** | https://newsletter.kentbeck.com/p/reject-change-sometimes |

> 注：`kentbeck.com/summaries` 页面自报 **80 篇 essay、123K+ 订阅者、覆盖 202 个国家**（该页缓存时间戳 2026-05-08T13:31:32Z）。其官网首页另标 **123K 订阅、32% 平均打开率、195 个国家**。两组数字略有出入，同属其自报口径，一并保留。

### 4.2 播客：《Still Burning》

| 时间 | 内容 | URL |
|---|---|---|
| 2026-07-23 | Episode 9《How Do You Know That?》 | https://share.transistor.fm/s/54f0099a |
| 2026-08-06 | Episode 1（重发/首季条目）《Nobody Knows》 | https://share.transistor.fm/s/32f34c78 |
| 2026-08-21 | 《How Do You Know That?》特辑重发（对谈 Beth Andres-Beck） | https://podcasts.apple.com/pk/podcast/how-do-you-know-that/id1887873329?i=1000777887869&l=ur |
| 2026-08-29 | 《Run Out to Meet It》 | https://share.transistor.fm/s/398e4760 |
| 2026-08-中至今 | **第二季**，赞助方 WorkOS 与 Augment Code；每两周周三更新 | https://stillburningpodcast.com |

节目定位（官网原文）：「关于恐惧、不确定，以及当地面不断移动时建造东西意味着什么的诚实对话。没有炒作，没有预测，不卖确定性。」其核心追问是三句：**什么仍然为真（what stays true）、什么在变（what's changing）、人们实际在做什么（what people are doing about it）。** 他给当下这个状态起的名字是 **Exploristan（探索斯坦）**——「没人知道什么行得通的未绘图地带」。

### 4.3 播客与访谈（非自家节目）

| 日期 | 节目 | 要点 | URL |
|---|---|---|---|
| 2025-09-16 前后 | 《Augmented Coding: Beyond the Vibes》被广泛转载（aktagon signals 等） | 其 6 月的长文在秋季被二次传播 | https://signals.aktagon.com/articles/2025/09/augmented-coding-beyond-the-vibes |
| 2026-04-01 | Heavybit《Third Loop》Ep.2《Features and Futures with Kent Beck》 | 关键词：pricing、genie、undo、autosave、"deploy on Fridays"、reversibility | https://podscan.fm/podcasts/heavybit-podcasts/episodes/ep-2-features-and-futures-with-kent-beck |
| 2026-06-10 | O11ycast Ep.#80 后续传播 | 2025-04-30 首播内容在 2026 年仍在被引用 | https://iheart.com/podcast/256-o11ycast-31093426/episode/ep-80-augmented-coding-with-kent-273766192 |
| **2026-07-01** | **The Pragmatic Engineer《How Kent Beck shapes the software engineering industry》**（约 2h27m） | 「信任而非产量将定义 AI 时代的软件工程」；回顾 Agile、TDD；谈人的因素 | https://newsletter.pragmaticengineer.com/p/how-kent-beck-shapes-the-software |
| 2026-05-09 前后 | The Pragmatic Engineer：Martin Fowler & Kent Beck《Frameworks for reinventing software, again and again》 | 两位老搭档对比 AI 与历次范式转移 | https://finance.biggo.com/podcast/3d9ceba8fcddbb3c |
| 2026-07-11 | 《Thus Spake Beck》（第三方评述） | 「他自己的历史显示了信任积累得有多慢」 | https://sprintanddrift.substack.com/p/thus-spake-beck |

### 4.4 演讲与公开活动

| 日期/场合 | 标题 | 要点 | URL |
|---|---|---|---|
| 2025（YOW! 2025 / DevOps Enterprise Summit Las Vegas 2025） | Kudzu to Garden: Sustainable Augmented Development | **有完整逐字稿**；feature drunk、going solid、features vs options 双轴 | https://videos.itrevolution.com/watch/1122001849 |
| 2025-05 | O'Reilly "Coding with AI" 研讨会 | 《Vibe Coding: More Experiments, More Care》 | https://kentbeck.com/ |
| 2025-06-04 | Thinkie World Congress I | 第一届 | https://tidyfirst.substack.com/p/thinkie-world-congress-1-june-4 |
| 2025 年内 | Craft Conference | 《Canon TDD》 | https://youtu.be/90VBvjYedWI |
| 2026-06-24 | IT Revolution 《Features Versus Futures》 | 「挑战软件业对……的执念」 | https://videos.itrevolution.com/watch/1183714411 |
| 2026-08-09 | 《Kudzu to Garden》在 IT Revolution 视频库的再发布 | 与 2025 演讲同源 | https://videos.itrevolution.com/watch/1122001849 |
| 待定（2026-10-07/08） | IT Revolution Enterprise AI Summit（Charlotte, NC） | 其站内相关的后续活动 | https://events.itrevolution.com/2026-charlotte/ |

### 4.5 新书与出版计划（已确认）

| 书名 | 状态 | 依据 |
|---|---|---|
| **Tidy Together: A Team Exercise in Empirical Software Design** | **预定 2026-09-30 出版**（O'Reilly，ISBN 9781098178765 / 9781098178758）。官网确认其为「Empirical Software Design 系列第三本」，「草稿章节对 newsletter 订阅者开放」 | https://awesomebooks.com/book/9781098178765/tidy-together ・ https://www.oreilly.com/library/view/tidy-together/9781098178758/ ・ https://kentbeck.com/ |
| Augmented Software Design: Taming the Genie | 与上条共用 ISBN 9781098178765 出现在 Amazon/Target 页面上，疑为同一本书的**曾用名/副标题变更** | https://amazon.com/Tidy-Together-Exercise-Empirical-Software/dp/1098178769 ・ https://target.com/p/tidy-together-by-kent-beck-paperback/-/A-1002542855 |
| The Good News Factory（高管简报，2024） | 已出版，Empirical Software Design 系列第二本 | https://oreilly.com/library/view/the-good-news/9781098170158/preface01.html |
| Live with Tim O'Reilly: A Conversation with Author and Programmer Kent Beck | 已出版/已举办（可查至普林斯顿大学图书馆编目） | https://catalog.princeton.edu/catalog/99131681584206421 |

### 4.6 关于 AI 编程的公开表态（最近 12 个月，摘引）

1. **「Augmented coding means never having to say no to an idea.」**（[一手]，其官网首页主标语，2026-08/09 仍在）
2. **「AI 放大已有的工程纪律。没有纪律，你只是更快地生成 bug。」**（[二手]转述其 2026-07 Pragmatic Engineer 访谈，https://prompts.ninja/news/kent-beck-software-engineering-ai-era ）
3. **「没有人想要 agent。」**（[一手]，2026-04-22）
4. **「genie 会吃掉你的种子玉米。」**（[一手]，《Tidy First?》系列与演讲反复出现）
5. **「约束上下文：只告诉 AI 下一步所需的信息。」**（[一手]，其官网 Principles for Augmented Development 第一条）
6. **「编程通缩会重新分配价值——流向集成、判断，以及理解该造什么。」**（[一手]，2025-09-11）
7. **「AI 时代的信任不是靠生成速度建立的。」**（[二手]转述，2026-07-01）
8. **「忙碌是做空波动率。」**（[一手]，2026-08-13）

### 4.7 更早的 Substack 锚点（补记，便于 Skill 追溯思想脉络）

| 日期 | 标题 | 要点 | URL |
|---|---|---|---|
| 2022-02-17 | **Self, Team, Product** | 分析单位的三层：自我 / 团队 / 产品。这是他后期「软件工程是社会性活动」主张的早期文本形态 | https://tidyfirst.substack.com/ |
| 2022-07-29 | **First, After, Later, Never** | 时序决策框架：先做 / 之后做 / 稍后做 / 永不做。是其「Tidy First」时序观的直接前身 | https://tidyfirst.substack.com/ |
| **2023-12-11** | **Canon TDD** | **TDD 的规范化重述**。开篇原文：「What follows is NOT how you should do TDD. Take responsibility for the quality of your work however you choose」——即「以下不是你该怎么做 TDD。无论你怎么选，请为你自己工作的质量负责」。文中另自述 **1995-10 在 Austin 的 OOPSLA 把 SUnit 演给 Ward Cunningham 看** | https://newsletter.kentbeck.com/p/canon-tdd |

> **补记说明**：这三篇由上游核实提供，本报告未能逐字打开原文正文（`tidyfirst.substack.com` 域名本次 `web_fetch` 不可达）。`newsletter.kentbeck.com/p/canon-tdd` 可访问，其存在性与日期已由检索结果确认（多条独立来源均标注 2023-12-11）。**《Canon TDD》（2023-12）比《Canon 3X》（2026-07）早两年半——因此 Canon 系列的起点应定在 2023 年 12 月，而非 2026 年 7 月。** 这是本报告对 §2.6 与 §3 转折 12 的一处修正。

---

## 5. 存疑 / 冲突的时间点

**本节保留冲突、列出各来源、不做取舍。**

### 5.1 出生日期

| 说法 | 来源 | 可信度 |
|---|---|---|
| 1961 年（仅年份） | Wikipedia 正文（经 everything.explained.today、owiki.org 两个镜像读取） | [二手] 高 |
| **1961-03-31** | grokipedia.com/page/Kent_Beck | [二手] 弱（生成型站点，未见权威佐证） |

**处理**：本报告采信「1961 年」，**生日 3 月 31 日标注为存疑**。注意有旁证支持 1961：他在 2026-04-16 的文章里写「我刚满 65 岁」，与 1961 年出生且在 3–4 月前后生日一致——但这句话不能反过来证明具体日期。

### 5.2 AI 编程转折的触发时间（**最重要的冲突**）

| 说法 | 原话/来源 | 可信度 |
|---|---|---|
| **2025 年 3 月前后** | O11ycast #80（录制于 2025-04-14，发布于 2025-04-30）中他说：「**两周前**我去了一个工作坊，第一次亲眼见到 Steve Yegge」，随后「周六早上我想，好，让我试试这东西」 | [一手] |
| **「四月」** | IT Revolution 演讲（DevOps Enterprise Summit Las Vegas 2025）逐字稿：「我必须亲自感谢 Gene，他在**四月**复活了我的编程生涯」 | [一手] |
| **2024 年** | api.finexus.net 的一篇事件页面（`Kent Beck's Enduring Influence…`）把相关叙述放在 2024 语境 | [二手] 弱 |

**分析（[推断]，不是结论）**：O11ycast 的录制时间（2025-04-14）与「两周前」互证，指向 **2025 年 3 月下旬～4 月初**。IT Revolution 演讲文本中的「四月」若指同一件事，则与该推断一致；但他同时说「Thank you Gene for reviving my programming career **in April**」，也可能是记混了年份。**本报告建议：以「2025 年春季（约 3–4 月）」为主要区间，同时保留「可能更早至 2024 年」的不确定性。**

### 5.3 Facebook 任期：7 年还是 8 年？

| 说法 | 来源 | 可信度 |
|---|---|---|
| **2011–2018（约 7–8 年）** | Product Thinking 播客节目介绍：「a role as Technical Coach at Facebook from 2011-2018」 | [二手] |
| **七年** | 其本人 Facebook Note：「Given my newly independent status after **seven years** at Facebook…」 | [一手] |
| **已离开，具体时间未明** | 2019-10 的访谈博客标题称其「已被 Facebook 解雇」 | [二手] 弱 |

**处理**：保留「2011–2018」区间与其自述的「七年」；**「被解雇」的说法仅作记录**，本报告不采信也不否定——其本人文本是主动离开的口吻，但该文本的时间戳与具体措辞无法在本次工具条件下完整核验。

### 5.4 Gusto → Mechanical Orchard 的交接时间

| 说法 | 来源 | 可信度 |
|---|---|---|
| 2019 年加入 Gusto（software fellow / coach） | Wikipedia 正文（镜像）＋ Business Insider 2019-09-04 | [二手] |
| **2023-01-10 已以「Chief Scientist at Mechanical Orchard」身份发文** | Mechanical Orchard 官网博客 | [一手] |
| 2024-05 仍署名 Mechanical Orchard Chief Scientist | SE Radio 615 | [一手] |
| 「Institutions: Gusto」 | HandWiki 的 Scientific career 字段 | [二手]，**已过时** |

**处理**：**离开 Gusto 的确切时间未找到权威来源**。可确定的是：2019 年入职 Gusto，2023 年 1 月已在 Mechanical Orchard。中间的交接（是否并行、是否先离开 Gusto 再入职）**存疑**。

### 5.5 SIGPLAN Programming Languages Achievement Award

| 说法 | 来源 | 可信度 |
|---|---|---|
| Erich Gamma 获 2005 年 SIGPLAN Programming Languages Achievement Award | c2 wiki 的 ErichGamma 页面 | [二手] |
| **Beck 与 Gamma 同获（2015）** | 本次检索未取得一手确认 | [二手] 弱 |
| SIGPLAN 官方奖项页 | 只列了近期获奖者（如 2025 年 Martin Odersky），未检回 2005 年完整名单 | [一手]（但对本问题无结论） |

**处理**：**不确定 Kent Beck 是否获此奖。** 可以确认的是他因 JUnit 与 xUnit 生态与 Erich Gamma 有公认的共同贡献。**Skill 使用时应避免把该奖项写成既定事实。**

### 5.6 Jolt Award 的次数

| 说法 | 来源 | 可信度 |
|---|---|---|
| 2 次 Jolt Productivity Award（1999《Extreme Programming Explained》、2002《Test-Driven Development by Example》） | Wikipedia 正文（镜像） | [二手] 高 |
| 「2x Jolt Award Winner」 | yespress.io（生成型站点） | [二手] 弱，但与上条一致 |

**处理**：**两条互证，可采信 2 次。** 本条不构成冲突，列出以备核。

### 5.7 演讲年份标注混乱

- IT Revolution 视频库把《Kudzu to Garden: Sustainable Augmented Development》归入 **Las Vegas 2025**；
- 但第三方站点（waylonwalker.com）在 2026-06-14 的笔记里把它标为 **YOW! 2025**；
- 另有搜索结果显示该视频在 2026-08-09 被重新索引。

**处理**：**同一篇演讲在不同平台被归到不同会议/年份。** 内容相同（feature drunk、going solid、双轴图），本报告以 IT Revolution 视频库的归类为准，但**保留「YOW! 2025」这一说法**。

### 5.8 「Tidy Together」的书名与 ISBN 冲突

- awesomebooks 与 O'Reilly 库页面：**Tidy Together: A Team Exercise in Empirical Software Design**，ISBN **9781098178765**（awesomebooks，预定 2026-09-30）/ **9781098178758**（O'Reilly 库）；
- Amazon 与 Target 页面：同一 ISBN **9781098178765** 下出现标题 **Augmented Software Design: Taming the Genie**；
- Target 页面另标「Augmented Software Design」为系列名。

**处理**：**保留冲突。** 可能是「系列名 Augmented Software Design ＋ 书名 Tidy Together ＋ 副标题 A Team Exercise…」的组合，也可能是改题。**建议：Skill 中只写「Empirical Software Design 系列第三本，2026 年出版」，避免锁死书名。**

### 5.9 订阅者与覆盖国家的数字

| 数字 | 来源 |
|---|---|
| 123K+ 订阅者 / 202 个国家 | kentbeck.com/summaries（页面缓存 2026-05-08） |
| 123K 订阅者 / 195 个国家 / 32% 打开率 | kentbeck.com 首页（2026-08～09） |
| 123,500+ 订阅者 | yespress.io（[二手] 弱） |
| 122,000+ 订阅者 | self.md（[二手] 弱，2026-01 发布） |

**处理**：整体在 12.2 万–12.35 万区间，**国家数 195 vs 202 存在冲突**。本报告统一写「12 万+」，不锁死国家数。

### 5.10 SUnit 的写作年份：1989 还是 1994？

| 说法 | 来源 | 可信度 |
|---|---|---|
| **1989**：为 Smalltalk 写出 SUnit，论文 "Simple Smalltalk Testing: With Patterns" | Wikipedia 正文（经 everything.explained.today 与 owiki.org 两个镜像读取） | [二手] |
| **1994**：写 SUnit | 上游核实事实（本次调研未独立取到原始出处） | [一手]（经上游转述） |
| **1995-10**：在 Austin 的 OOPSLA 上把 SUnit 演给 Ward Cunningham 看 | 他本人在《Canon TDD》中自述 | [一手] |

**分析（[推断]）**：三者可能并不真冲突，而是**三个不同事件**——1989 年可能已有最初的实验版本，1994 年是成形/重写版本，1995-10 是首次公开展示。也可能 Wikipedia 的 1989 系早年误植。**本报告保留全部三种说法，不做取舍。** 下游 Skill 若需引用 SUnit 年份，建议表述为「1990 年代中期（一说 1989 年）」。

### 5.11 离开 Facebook 的方式

| 说法 | 来源 | 可信度 |
|---|---|---|
| 主动离开 | 其本人 Facebook Note：「Given my newly independent status after seven years at Facebook…」 | [一手]（经 Wikipedia 引用转述） |
| 「被 Facebook 解雇」 | rackandstack-tech.blog 2019-10-15 博文标题 | [二手] 弱 |

**处理**：**保留冲突。** 其本人文本为主动口吻，但该 Note 的具体时间戳本次未能直接核验（facebook.com 不可达）。

### 5.12 奖项的完整性

本次检索**未能取得** Kent Beck 完整的奖项清单。已确认的只有：

- 1999《Extreme Programming Explained》获 **Jolt Productivity Award**；
- 2002《Test-Driven Development by Example》获 **Jolt Productivity Award**；
- 与 Erich Gamma 因 JUnit / xUnit 生态的贡献关系（**是否同获 2005 SIGPLAN Programming Languages Achievement Award 存疑**，见 §5.5）。

**Agile Alliance 相关奖项**：本次检索**未发现** Kent Beck 获 Agile Alliance 专项奖项的记录。检索该方向时返回的是敏捷宣言原文页、Agile Alliance 的一般资源页，与其个人获奖无关。**建议下游不要把「获 Agile Alliance 奖」写成事实。**

### 5.13 《Genie Tarpit》的日期：2026-04-23 还是 2026-04-29？

| 说法 | 来源 | 可信度 |
|---|---|---|
| **2026-04-23** | kentbeck.com/summaries 的 ISO 时间戳 `2026-04-23T15:02:04.968Z` | [一手] |
| **2026-04-29** | 上游核实事实 | [一手]（经上游转述） |

**处理**：**两说并存。** 该页在摘要索引中的时间戳为 04-23（UTC，对应北京时间 04-23 深夜），上游核实为 04-29。差异可能来自初稿/定稿或时区，保留两者。

### 5.14 本报告已知的自身不确定项

为免下游误用，此处主动声明：

- §1.7 中 2022-02-17《Self, Team, Product》、2022-07-29《First, After, Later, Never》、2023-12-11《Canon TDD》、1995-10 Austin OOPSLA 演示 SUnit —— **这四条来自上游核实，本报告未能逐字打开原文**，已在相应处标注。
- §2.4 中 2014 年《Is TDD Dead?》的**参与者与起因**已由 Martin Fowler 官方页确认，但**五集的具体播出日期**未逐集核验。
- 2019-06-13《Maybe Agile Is the Problem》的正文本次未能打开（InfoQ 返回 405），**仅确认标题、日期与「敏捷工业复合体」这一要点**。

---

## 6. 来源清单

### 6.1 一手来源（当事人自述 / 机构原始页面）

| # | 来源 | 类型 | URL | 用于 | 可信度 |
|---|---|---|---|---|---|
| 1 | Kent Beck 官网 kentbeck.com | 个人官网 | https://kentbeck.com/ | 项目现状、Thinkies、音乐、演讲主题、Augmented Coding 原则、2005 年 panel 自述 | **高** |
| 2 | kentbeck.com/summaries | 官网文章摘要索引 | https://kentbeck.com/summaries | 2025-08 至 2026-05 的文章标题、日期、摘要 | **高** |
| 3 | newsletter.kentbeck.com/p/parkinsons | Substack 正文（镜像域） | https://newsletter.kentbeck.com/p/parkinsons | 帕金森公开、time value of time、业务安排 | **高** |
| 4 | newsletter.kentbeck.com/archive | Substack 归档 | https://newsletter.kentbeck.com/archive | 2026-06 至 2026-09 文章列表 | **高** |
| 5 | newsletter.kentbeck.com/p/canon-3x-exploreexpandextract | Substack 正文 | https://newsletter.kentbeck.com/p/canon-3x-exploreexpandextract | Canon 系列延伸至 3X | **高** |
| 5b | newsletter.kentbeck.com/p/canon-tdd | Substack 正文（2023-12-11） | https://newsletter.kentbeck.com/p/canon-tdd | **Canon 系列真正的起点**；自述 1995-10 Austin OOPSLA 演示 SUnit | **高**（存在性与日期经检索确认，正文未逐字打开） |
| 6 | newsletter.kentbeck.com/p/dont-accomplish-everything | Substack 正文 | https://newsletter.kentbeck.com/p/dont-accomplish-everything | Facebook 首次绩效面谈、P50 目标 | **高** |
| 7 | newsletter.kentbeck.com/p/minimum-viable-product-revisited | Substack 正文 | https://newsletter.kentbeck.com/p/minimum-viable-product-revisited | Three Rivers Institute 最后一篇 | **高** |
| 8 | c2.com/ppr/about/author/kent.html | WikiWikiWeb 个人页 | https://c2.com/ppr/about/author/kent.html | Tektronix、Alexander、OOPSLA 87/89/91、1993 Hillside、First Class Software、居住 | **高（本人撰写）** |
| 9 | Mechanical Orchard 官网博客（Kent Beck 署名） | 雇主官网 | https://www.mechanical-orchard.com/insights/mechanical-orchard-a-new-company-with-a-long-history | Chief Scientist 身份、1996 与 Rob Mee 合作、Pivotal 沿革 | **高** |
| 10 | IT Revolution 视频库（含完整逐字稿） | 会议主办方 | https://videos.itrevolution.com/watch/1122001849 | Kudzu to Garden 全文逐字稿 | **高** |
| 11 | Heavybit O11ycast #80 | 播客主办方 | https://www.heavybit.com/library/podcasts/o11ycast/ep-80-augmented-coding-with-kent-beck | 2025-04-30 播出；augmented coding 首次系统表述 | **高** |
| 12 | Still Burning 官网 | 播客官网 | https://stillburningpodcast.com | 播客定位、Exploristan | **高** |
| 13 | transistor.fm 单集页 | 播客托管 | https://share.transistor.fm/s/398e4760 ・ https://share.transistor.fm/s/54f0099a ・ https://share.transistor.fm/s/32f34c78 | 第二季单集时间 | **高** |
| 14 | The Pragmatic Engineer（Substack） | 访谈 | https://newsletter.pragmaticengineer.com/p/tdd-ai-agents-and-coding-with-kent（2025-06-11）・ https://newsletter.pragmaticengineer.com/p/how-kent-beck-shapes-the-software（2026-07-01） | 两次长访谈 | **高** |
| 15 | SD Times（2011-05-24 访谈） | 一手访谈 | https://sdtimes.com/agile/ten-years-after-snowbird-kent-beck-looks-down-the-path-for-agile/ | 自述技术焦点转向软件设计 | **高** |
| 16 | O'Reilly 库页（The Good News Factory） | 出版方 | https://oreilly.com/library/view/the-good-news/9781098170158/preface01.html | 系列第二本 | **中高** |
| 17 | O'Reilly 库页（Tidy Together） | 出版方 | https://www.oreilly.com/library/view/tidy-together/9781098178758/ | 第三本存在与 ISBN | **中高** |
| 18 | InfoQ《Maybe Agile Is the Problem》 | 一手文章 | https://infoq.com/articles/agile-agile-blah-blah | 2019-06-13；敏捷工业复合体 | **中（页面 405，经搜索索引确认）** |
| 19 | threeriversinstitute.org（web.archive.org 存档） | 一手文章存档 | https://web.archive.org/web/20150223055844/www.threeriversinstitute.org/JustShip.html | Three Rivers 时代文章 | **中高** |
| 20 | Facebook Note "My Personal Mission" | 一手自述 | https://www.facebook.com/notes/kent-beck/my-personal-mission/1811782322187957/ | 「seven years at Facebook」 | **中（未直接打开，经 Wikipedia 引用转述）** |
| 21 | SIGPLAN 奖项页 | 机构页面 | https://sigplan-pages.sigplan.hosting.acm.org/Awards | SIGPLAN 奖项存在性 | **高（但未解决 5.5）** |
| 22 | agilemanifesto.org | 原始文档 | https://agilemanifesto.org/ | 敏捷宣言 | **高** |

### 6.2 二手来源

| # | 来源 | 类型 | URL | 用于 | 可信度 |
|---|---|---|---|---|---|
| 23 | everything.explained.today/Kent_Beck | Wikipedia 正文镜像（GFDL） | https://everything.explained.today/Kent_Beck/ | 教育、C3、书目、论文、Gusto、Facebook、Jolt | **中高** |
| 24 | owiki.org/wiki/Kent_Beck | Wikipedia 镜像（CC BY-SA） | https://owiki.org/wiki/Kent_Beck | 同上（交叉验证） | **中高** |
| 25 | wikiwand.com / wikimili.com | Wikipedia 镜像 | https://wikiwand.com/en/Kent_Beck ・ https://wikimili.com/en/Kent_Beck | 出生年、母校（**本次 web_fetch 不可达，仅用搜索摘要**） | **中** |
| 26 | en.wikipedia.org（搜索摘要） | 百科 | https://en.wikipedia.org/wiki/Kent_Beck | 出生年 1961、母校 University of Oregon（**web_fetch 被拒，仅用摘要**） | **中** |
| 27 | handwiki.org | 百科转载 | https://handwiki.org/wiki/Biography:Kent_Beck | Institutions: Gusto（已过时） | **中低** |
| 28 | api.finexus.net | 新闻聚合 | https://api.finexus.net/api/news/events/89f5d982-90aa-48c1-bd97-a0b0869cd83e/html | Apple / Smalltalk 时点 | **低** |
| 29 | builtin.com（2020-08-18） | 媒体报道 | https://builtin.com/software-engineering-perspectives/kent-beck-geeks-gusto-globalization | Gusto 时期、共情赤字 | **中高** |
| 30 | businessinsider.com（2019-09-04） | 媒体报道 | https://www.businessinsider.com/kent-beck-gusto-agile-manifesto-chrysler-2019-8 | Gusto 入职 | **中高** |
| 31 | se-radio.net（2024-05） | 播客 | https://se-radio.net/2024/05/se-radio-615-kent-beck-on-tidy-first | 2024 年仍任 Mechanical Orchard CS | **中高** |
| 32 | podcast 索引（Product Thinking） | 播客介绍 | https://podcasts.musixmatch.com/podcast/product-thinking-01h1ngdz40h1jbjfx464wgnvpc/episode/debating-user-research-experimentation-and-the-pm-01hjz7abr0d8wfhwfxz9m7wtgs | Facebook Technical Coach 2011–2018 | **中** |
| 33 | prompts.ninja | 新闻聚合（AI 辅助，有链接源） | https://prompts.ninja/news/kent-beck-software-engineering-ai-era | 2026-07 访谈要点转述 | **中低（引用了 Pragmatic Engineer 原文）** |
| 34 | self.md | 汇编站 | https://self.md/people/kent-beck-augmented-coding | augmented coding 原则汇编 | **中低** |
| 35 | thekb.eu | 卡片式摘要 | https://thekb.eu/en/fiches/augmented-coding-beyond-vibes-kent-beck-2025-06-25 ・ https://thekb.eu/en/fiches/beck-starving-genies-usage-limits-ai-coding-2026-04-03 | 文章摘要 | **中低** |
| 36 | 5whys.com | 访谈存档 | https://5whys.com/archived-interviews | Implementation Patterns 时期访谈 | **中** |
| 37 | sprintsanddrift.substack.com | 评述 | https://sprintanddrift.substack.com/p/thus-spake-beck | 对 2026-07 访谈的评论 | **低** |
| 38 | awesomebooks.com | 书商 | https://awesomebooks.com/book/9781098178765/tidy-together | Tidy Together 预定出版日 2026-09-30 | **中低** |
| 39 | amazon.com / target.com | 书商 | https://amazon.com/Tidy-Together-Exercise-Empirical-Software/dp/1098178769 ・ https://target.com/p/tidy-together-by-kent-beck-paperback/-/A-1002542855 | 书名冲突证据 | **低** |
| 40 | dokumen.pub | 电子书索引 | https://dokumen.pub/tidy-first-a-personal-exercise-empirical-software-design-1nbsped-1098151240-9781098151249-i-6847419.html | Tidy First? 序作者 Larry Constantine | **中低** |
| 41 | finance.biggo.com | 播客摘要 | https://finance.biggo.com/podcast/3d9ceba8fcddbb3c ・ https://finance.biggo.com/podcast/9097cf7df0ff00c3 | Fowler & Beck 对谈；2026-07 访谈 | **低（不可直接打开）** |
| 42 | podscan.fm | 播客索引 | https://podscan.fm/podcasts/heavybit-podcasts/episodes/ep-2-features-and-futures-with-kent-beck | Third Loop Ep.2（2026-04-01） | **中** |
| 43 | signals.aktagon.com | 转载 | https://signals.aktagon.com/articles/2025/09/augmented-coding-beyond-the-vibes | 2025-09-16 二次传播 | **低** |
| 44 | grokipedia.com | 生成型百科 | https://grokipedia.com/page/Kent_Beck | 生日 3 月 31 日（**存疑**） | **低** |
| 45 | yespress.io | 生成型人物页 | https://yespress.io/kent-beck | 订阅数、Jolt 2 次（与 #23 互证） | **低** |
| 46 | notablepeopleproject.org | 生成型人物页 | https://notablepeopleproject.org/kent_beck | 未取到正文 | **低** |
| 47 | rackandstack-tech.blog（2019-10-15） | 博客 | https://rackandstack-tech.blog/2019/10/15/kent-beck-fired-from-facebook | 「被 Facebook 解雇」说法（**存疑**） | **低** |
| 48 | wiki.c2.com/?ErichGamma | Wiki | https://wiki.c2.com/?ErichGamma | 2005 SIGPLAN 奖（**存疑**） | **中低** |
| 49 | toolshero.com | 人物页 | https://www.toolshero.com/toolsheroes/kent-beck/ | 1979–1987 学历区间（与 #23 互证） | **中低** |
| 50 | devteams.at | 技术博客 | https://devteams.at/three_x_thinking/2019/10/22/3xthinking-intro-part-1.html | 3X 由 Beck 提出（2019-10） | **中低** |
| 51 | andela.com | 企业博客 | https://andela.com/blog-posts/kent-becks-product-development-triathlon | 「Pretty much everything I do, I see in Explore/Expand/Extract terms now」（**页面已重定向，正文未取到**） | **低** |
| 52 | oopsla / Craft 会议页与视频 | 会议 | https://youtu.be/90VBvjYedWI ・ https://tonytvo.github.io/code-craft-2026/canon-tdd-kent-beck-craft-2025/ | Canon TDD 演讲 | **中** |
| 53 | catalog.princeton.edu | 图书馆编目 | https://catalog.princeton.edu/catalog/99131681584206421 | Live with Tim O'Reilly 存在性 | **中高** |
| 54 | 官方事件页 | 机构 | https://events.itrevolution.com/2026-charlotte/ | Enterprise AI Summit 2026-10-07/08 | **中高** |

### 6.3 明确排除的来源（黑名单与低质源，记录以示合规）

- **zhihu.com（知乎）**：未使用。
- **微信公众号（mp.weixin.qq.com）**：未使用。
- **baike.baidu.com / zhidao.baidu.com（百度百科、百度知道）**：未使用。第一轮 Bing 检索返回了百度百科的「Kent（英美烟草公司旗下的混合型卷烟品牌）」条目，**已识别为同名误匹配并整体弃用**。
- **sonto.tech**：其页面自述「Written by AI from the sources below」，且本次不可达，未采用。
- **mattphilip.wordpress.com、agileway.substack.com、isthisit.nz、hadleylab.org** 等：出现在检索结果中但与本时间线无直接关系，未采用。

### 6.4 检索方法记录

- **主力引擎**：keenable（本次最稳定、结果最相关）。
- **辅助引擎**：anysearch（后期 HTTP 402）、tavily（限额后回落）、deepseek-official、bing（中文市场语义漂移，仅用于发现镜像域）。
- **失败引擎**：ddg、ddg-lite、searxng、exa、firecrawl、parallel、perplexity —— 失败原因已在 §0.2 逐条记录；**每次失败均已换引擎重试**。
- **检索轮次**：共 17 组 web_search / advanced_search 调用（其中最后 2 次为按上游指令做的补充核实），20 次 web_fetch 调用（成功 11 次、失败 9 次）。
- **歧义消解策略**：因 "Kent" 在中文引擎下被香烟品牌占据，后续查询全部加上 `"Kent Beck"` 引号限定或加入 `Extreme Programming`、`TDD`、`Substack` 等共现词。

---

## 附：给下游 Skill 蒸馏的三条提示

1. **他的思考有一条 30 年不变量**：1987 年从 Christopher Alexander 拿来的「模式／generativity」，到 2023 年的「optionality」，到 2026 年的「long volatility」，是**同一个东西的三种语言**。蒸馏时不要当成三个独立概念。

2. **他的转折都是「先做再说」型，不是「先想再说」型**：SUnit 出自工具需求、XP 出自 C3 现场、TDD 出自 XP 内部、augmented coding 出自一次工作坊的社交传染。**他反复在讲一个方法论：先跳进去，再从中提炼。** 他 2026 年 7 月的 Canon 系列，恰恰是对这套方法的一次反向补救（把已经提炼过的东西重新说清楚）。

3. **2026 年 4 月之后必须加上时间权重**：`time value of time` 已经是他所有决策的显式参数。任何模拟其判断的 Skill，如果只复刻他 2020–2025 年的框架而不含这一项，会产出他本人现在**不会做**的建议。

---

*本报告由萧潇整理，检索日期 2026-09-17。所有冲突均予保留，未做取舍；所有推断均已标 [推断]。*
