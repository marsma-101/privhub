# Kent Beck 长对话与即兴思考调研

> 维度：**对话 / 播客 / 访谈 / 会议演讲 / AMA** —— 即「被追问时他怎么想」。
> 服务对象：「女娲·Skill造人术」Agent 2（对话维度），最终产出用于生成 Kent Beck 思维 Skill。
> 聚焦主题：小步与反馈 / TDD 红绿重构 / 结构改动与行为改动分离 / 简单设计 / make it work→right→fast / 对过度工程的批评。
> 撰写语言：中文叙述，引文保留英文原文。

---

## 0. 调研说明

### 0.1 检索轮次与引擎

本次调研共执行 **14 个独立检索轮次**（含多引擎切换与重试），另加 **30+ 次页面抓取**。

| 轮次 | 引擎 | 结果 |
|---|---|---|
| 1–2 | bing（默认引擎） | ❌ 严重污染：查询 "Kent Beck podcast transcript" 返回的全是中国香烟品牌「健牌 Kent」的页面（香烟网、百度百科、烟悦网）。此引擎对 `kent` 一词的中文市场歧义完全无法消解。 |
| 3 | ddg / ddg-lite | ❌ `connection error: fetch failed` |
| 4 | searxng | ❌ 全部 7 个实例 `operation was aborted` |
| 5 | exa / tavily / firecrawl | ❌ HTTP 429（免费额度耗尽） |
| 6 | parallel / perplexity | ❌ 未配置 API key |
| 7 | **anysearch** | ✅ 首次成功，抓到 Pragmatic Engineer、Hanselminutes、CoRecursive、SE Radio 等关键线索 |
| 8 | anysearch | ❌ 后续报 `HTTP 402`（额度耗尽），自动回退 |
| 9–14 | **keenable（回退引擎）** | ✅ 稳定可用，承担了本次调研的大部分检索量 |

`free_search_test` 实测结论（供后续复用）：**当前可用引擎为 keenable、anysearch（限流）、deepseek-official、bing（仅对英文专名有效）**；ddg / ddg-lite / searxng / exa / tavily / firecrawl 均不可用或限流。

**引以为戒的坑**：用 bing + 中文 market 检索英文人名，必须加 `software` / `test-driven development` / `extreme programming` 等消歧词，否则会被完全无关的商业词条淹没。

### 0.2 实际抓到逐字稿的来源（[一手]）

以下来源我**实际抓取到了逐字稿正文或完整纪要**（非仅标题/简介）：

| # | 来源 | 逐字稿形态 | 抓取到的容量 |
|---|---|---|---|
| A | The Pragmatic Engineer《TDD, AI agents and coding with Kent Beck》(2025-06-11) | 官方 transcript 页面（Substack 页面内嵌）+ 第三方转载逐字稿（pyweb.dev 原始归档，含 SHA256） | 完整 takeaways + 关键引文 |
| B | The Pragmatic Engineer《How Kent Beck shapes the software engineering industry》(2026-07-01) | 官方 transcript + youtube-distilled 全文逐字稿（3549 段，带时间戳） | 抓取到约前 9 分钟逐字稿正文 + 完整 timestamps 索引 + 官方 12 条观察摘要 |
| C | youtube-distilled《TDD, AI agents and coding with Kent Beck》 | 全文逐字稿（1818 段，带时间戳） | 抓取到约前 9 分钟逐字稿正文 |
| D | Martin Fowler《Is TDD Dead?》(2014) 全 5 集 | **Fowler 亲自撰写的完整 minutes（书面纪要，逐段转述对话）** | 完整 5 集全部纪要 |
| E | kentbeck.com 官网 | 《Make it run, make it right, make it fast — Douglas Beck, my Pappy》等一手署名内容 | 完整页面 |
| F | Kent Beck Substack《Canon TDD》(2023-12-11) | 全文 | 完整 |
| G | Kent Beck Substack《Canon 3X: Explore/Expand/Extract》(2026-07-30) | 全文 + 评论区 | 完整 |
| H | Kent Beck Substack《The Cost YAGNI Was Never About》(2026-06-25) | 全文 + 评论区 | 完整 |
| I | The Pragmatic Engineer《Cycles of disruption in the tech industry: with Kent Beck & Martin Fowler》(2026-04-07) | 现场对谈的**逐段引文式纪要**（前 4 节免费部分完整） | 完整免费部分 |
| J | Produx Labs《Product Thinking Ep.38》(2021-10-19) | 官方完整 transcript | 抓取到约前 1/3 逐字稿 |
| K | martinfowler.com《Beck Design Rules》(2015) | 含 **Kent Beck 本人审阅后补的段落引文** | 完整 |
| L | LarsEckart 对 DDD Europe 2020 演讲《Continued Learning: The Beauty of Maintenance》的现场笔记 | 结构化的演讲内容转述（含公式与口号） | 完整 |
| M | kentbeck.com/summaries | 80 篇随笔的结构化摘要索引 | 完整 |

### 0.3 已知局限（必须标注）

1. **YouTube 原站不可抓取**：`web_fetch` 对 `www.youtube.com` 返回 `URL hostname resolves to a non-public IP address`。所有 YouTube 内容均通过第三方逐字稿镜像（youtube-distilled.com）间接获得，**且这些镜像页面只渲染前 ~9 分钟逐字稿，其余靠前端懒加载**，我无法绕过。因此 B、C 两条长访谈的**中后段（尤其是争议回应段落）只能依赖官方发布的 timestamps + 官方摘要 + 第三方引文交叉印证**，无法给出逐字直引。
2. **付费墙**：The Pragmatic Engineer《Cycles of disruption》第 4 节之后为付费内容（burnout / 指标 / TDD 回归），未能获取。
3. **InfoQ 封禁**：`infoq.com` 两篇文章（2006 年 Kent Beck 访谈、Twenty Years of Patterns' Impact）均返回 HTTP 405 Human Verification，未能抓取。**这是本次调研最大的缺口之一**——2006 年那篇是少有的 Kent 系统性书面长访谈。
4. **SE Radio 不可抓取**：`se-radio.net` 存在 http↔https 跨域重定向，`web_fetch` 拒绝跟随，正反向尝试均失败。SE Radio 615（Tidy First?，2024）与 SE Radio 167（JUnit 历史，2010）**只有节目页元数据与第三方摘要，无逐字稿**。
5. **Podscripts / podbay / podscan / musixmatch 等逐字稿聚合站**均抓取失败（connection error 或域名解析为内网 IP）。
6. **Kent Beck 本人的 Substack 评论区长回复**只能看到被平台渲染出来的部分（如《Canon 3X》下可见 2 条、《Canon TDD》下可见 2 条），完整的 50+ 条评论区回复不可得。
7. **未核实项**已在正文中逐条标注 `[未核实]`。

### 0.4 信源分级约定

- **[一手]**：Kent Beck 本人所说/所写（逐字稿、录像纪要、本人署名文章、本人审阅后补写的段落、本人主导的公开对谈）。
- **[二手]**：他人转述、整理、笔记、官方节目简介、AI 摘要。
- **[推断]**：我的归纳，非原文。
- **黑名单遵守情况**：本文件未使用知乎、微信公众号、百度百科/百度知道。检索过程中 bing 曾大量返回百度百科与香烟网结果，已全部弃用。

---

## 1. 访谈 / 播客 / 演讲清单

### 1.1 播客

| 名称 | 年份 | 平台 | URL | 有全文？ |
|---|---|---|---|---|
| TDD, AI agents and coding with Kent Beck | 2025-06-11 | The Pragmatic Engineer（Gergely Orosz） | https://newsletter.pragmaticengineer.com/p/tdd-ai-agents-and-coding-with-kent | ✅ 官方 transcript + 第三方归档 |
| How Kent Beck shapes the software engineering industry | 2026-07-01 | The Pragmatic Engineer | https://newsletter.pragmaticengineer.com/p/how-kent-beck-shapes-the-software | ✅ 官方 transcript（2h27m，3549 段） |
| Cycles of disruption in the tech industry（与 Martin Fowler 同台） | 2026-04-07 | The Pragmatic Engineer / Pragmatic Summit 现场 | https://newsletter.pragmaticengineer.com/p/cycles-of-disruption-in-the-tech | ⚠️ 部分（付费墙） |
| test && commit \|\| revert with Kent Beck | 2018-12-21 | Hanselminutes #663（Scott Hanselman） | https://hanselminutes.com/663/test-commit-revert-with-kent-beck | ⚠️ 页面存在 PodScribe 转录入口，正文未渲染 |
| SE Radio 615: Kent Beck on "Tidy First?" | 2024-05-10 | Software Engineering Radio | https://se-radio.net/2024/05/se-radio-615-kent-beck-on-tidy-first | ❌ 仅元数据（抓取被封） |
| SE Radio 167: The History of JUnit and the Future of Testing | 2010-09-26 | Software Engineering Radio（Host: Martin） | https://se-radio.net/2010/09/episode-167-the-history-of-junit-and-the-future-of-testing-with-kent-beck | ❌ 仅元数据 |
| Debating User Research, Experimentation, and the PM Role | 2021-10-19 | Product Thinking Ep.38（Melissa Perri） | https://www.produxlabs.com/product-thinking-blog/episode-38-kent-beck | ✅ 官方完整 transcript |
| Facebook Engineering Process with Kent Beck | 2019-08-28 | Software Engineering Daily | https://softwareengineeringdaily.com/2019/08/28/facebook-engineering-process-with-kent-beck/ | ❌ 抓取失败 |
| From XP to TCR & Limbo（与 Daniel Terhorst-North） | 2025-05-23 | GOTO - The Brightest Minds in Tech | https://goto.buzzsprout.com/1714721/episodes/17208066-from-xp-to-tcr-limbo-kent-beck-daniel-terhorst-north | ❌ 抓取失败 |
| Tech Truth: Agile Evolution & the Future of SW Engineering（与 Fowler） | 2026-06-02 | GOTO Podcast | https://goto.buzzsprout.com/1714721/episodes/19254588-tech-truth-agile-evolution-the-future-of-sw-engineering-martin-fowler-kent-beck | ❌ 抓取失败 |
| Still Burning（Kent 自己主持的播客，S1） | 2026-04 起 | Transistor / YouTube @KentBeck | https://stillburningpodcast.com | ⚠️ 单集页有文字片段 |
| Ep. #2, Features and Futures with Kent Beck | 2026-04-01 | Heavybit / Third Loop | https://podscan.fm/podcasts/heavybit-podcasts/episodes/ep-2-features-and-futures-with-kent-beck | ❌ 抓取失败 |
| Test and Code #23: Lessons about testing and TDD from Kent Beck | 2016-09-30 | Test & Code（Brian Okken） | https://pythontest.com/testandcode/episodes/23-lessons-about-testing-and-tdd-from-kent-beck | ⚠️ 第三方转录页抓取失败 |
| Test and Code #212: Canon TDD | 2024 | Test & Code | https://pythontest.com/testandcode/episodes/212-canon-tdd-by-kent-beck/ | ✅ 该集**全文朗读 Canon TDD 原文** |

### 1.2 会议演讲 / 录像

| 名称 | 年份 | 会议 | URL | 有全文？ |
|---|---|---|---|---|
| Is TDD Dead? 全 5 集 hangout（Beck + Fowler + DHH） | 2014-05-09 ~ 06-04 | Thoughtworks Hangouts | https://martinfowler.com/articles/is-tdd-dead/ | ✅ **Fowler 亲撰完整 minutes** |
| Tidy First? A Daily Exercise in Empirical Design | 2024 | GOTO Chicago 2024 | https://gotopia.tech/sessions/3432/tidy-first-a-daily-exercise-in-empirical-design | ⚠️ 页面仅有 abstract，录像需登录 |
| Tidy First? A Daily Exercise in Empirical Design | 2024-10-03 | GOTO Copenhagen 2024 | https://gotocph.com/2024/sessions/3410/tidy-first-a-daily-exercise-in-empirical-design | ⚠️ 同上 |
| Continued Learning: The Beauty of Maintenance | 2020 | DDD Europe 2020 | https://youtu.be/3gib0hKYjB0 | ⚠️ 有详细第三方笔记（见 §6） |
| Sustainable Augmented Development | 2025 | GOTO 2025 | https://youtu.be/sMujMp4h_EY | ❌ 逐字稿镜像无此视频 |
| Canon Test-Driven Development | 2025 | Craft Conference 2025 | https://youtu.be/90VBvjYedWI | ❌ 同上 |
| 3X with Kent Beck | 2019-2020 | 巡讲 | https://summarize.tech/www.youtube.com/watch?v=YX2XR73LnRY | ❌ summarize.tech 返回 503 |
| Features Versus Futures | 近期 | IT Revolution | https://videos.itrevolution.com/watch/1183714411 | ❌ 需登录 |
| The Shrinking Feedback Loop: LLMs and XP | 2026 | 巡回演讲主题（kentbeck.com 列表） | https://kentbeck.com/ | ⚠️ 仅题目与简介 |

### 1.3 书面长访谈 / 本人长文（对话性质的）

| 名称 | 年份 | 出处 | URL |
|---|---|---|---|
| Canon TDD | 2023-12-11 | Tidy First? Substack | https://newsletter.kentbeck.com/p/canon-tdd |
| The Cost YAGNI Was Never About | 2026-06-25 | Tidy First? Substack | https://newsletter.kentbeck.com/p/the-cost-yagni-was-never-about |
| Canon 3X: Explore/Expand/Extract | 2026-07-30 | Tidy First? Substack | https://newsletter.kentbeck.com/p/canon-3x-exploreexpandextract |
| Beck Design Rules（Beck 本人审阅并回写段落） | 2015-03-02 | martinfowler.com | https://martinfowler.com/bliki/BeckDesignRules.html |
| 官网一手：Augmented Coding / Pappy 箴言 / Thinkies / 演讲主题清单 | 2026 | kentbeck.com | https://kentbeck.com/ |
| 80 篇随笔结构化摘要索引 | 2026 | kentbeck.com/summaries | https://kentbeck.com/summaries |
| Kent Beck on Agile Adoption & Values（InfoQ 长访谈） | 2006/2007 | InfoQ | https://www.infoq.com/articles/kent-beck-interview-2006/ ❌**未抓取（HTTP 405）** |
| Twenty Years of Patterns' Impact | 2014 | InfoQ | https://www.infoq.com/articles/twenty-years-of-patterns-impact ❌**未抓取（HTTP 405）** |

---

## 2. 被追问时的回答方式

> 本章是本文核心。按「追问类型」分类，每条给出引文 + URL + 信源等级。

### 2.1 「该不该写测试？」

**他的标准回答结构：先拒绝二值化，再把问题转成「你能拿到什么反馈」。**

最典型的一次是 2014 年 Is TDD Dead 第 4 集，DHH 直接追问他「是不是每一行生产代码之前都写测试？」他的开场白后来被反复引用：

> "It depends, and that's going to be the beginning to all of my answers to any question that's interesting."
> —— Kent Beck，Is TDD Dead 第 4 集纪要
> [一手]，https://martinfowler.com/articles/is-tdd-dead/

紧接着他给出的是**替代判据**，而不是「是/否」：

> "TDD solves several problems, starting with confidence. TDD also allows him to break problems down piecemeal, tackling specific cases without having to solve the general case all at once. He's not prepared to give up on TDD just because it's hard."
> —— 同场，第 5 集纪要
> [一手]，https://martinfowler.com/articles/is-tdd-dead/

关于「测试写多少才够」，他拒绝用行数比例衡量：

> "Kent declared that the ratio of lines of test code to lines of production code was a bogus metric."
> —— 同场，第 4 集纪要
> [一手]，https://martinfowler.com/articles/is-tdd-dead/

他给的真实判据是**置信度**，而不是覆盖率：

> "you aren't paid to write tests, you just write enough to be confident"
> —— 由 DHH 在对话中引述 Kent 的话（Beck 未否认）
> [一手·经他人引述]，同上

更狠的一版表述（DHH 在第 4 集转述 Kent 本人的话，Beck 在场未否认）：

> "**I get paid for code that works, not for tests.**"
> —— Kent Beck（经 DHH 在 Is TDD Dead 第 4 集中转述）
> [一手·经他人引述]，同上

以及「错误是常态」的一段自省（这是全场少见的狠话）：

> "**As soon as you think you don't make mistakes any more, that's a mistake**, and you stop growing." […] eventually "**the world won't let you pretend that you're not screwing up any more.**" He'd rather pay the price of catching that early with a phone call at 2am.
> —— Beck，Is TDD Dead 第 3 集纪要
> [一手]，同上

**关于「你在生产环境漏写了哪些测试，谁来告诉你」—— 他给了一个非常具体的反馈回路：**

> "**The on-call is the feedback loop that teaches you what tests you didn't write.** Facebook programmers have to go on-call, everyone complains about it, but there's no way they are going away from it."
> —— Beck，Is TDD Dead 第 3 集纪要
> [一手]，同上

同场还有一个针对「绿条幻觉」的小道具式比喻：

> "Code with green tests can be a **plateau** that's below where you want to be. Kent considered that we should **stipple a few red pixels in the green bar** to remind us of these limitations."
> —— Is TDD Dead 第 3 集纪要
> [一手]，同上

以及**唯一真正的过测信号**（Fowler 表述、Beck 认可）：

> "the sign of too much is whenever you change the code you think you expend more effort changing the tests than changing the code."
> —— Martin Fowler，Is TDD Dead 第 4 集纪要（Beck 未反对）
> [一手]，同上

**他还给了一个反直觉的处置建议：删测试。** 引述 Herb Derby 的 delta coverage 概念：

> "Herb Derby came up with the notion of delta coverage — what coverage does this test provide that's unique? Tests with zero delta coverage should be deleted unless they provide some kind of communication purpose. […] Many people freak out at throwing away tests, but you should if they don't buy you anything. If the same thing is tested multiple ways, that's coupling, and coupling costs."
> —— Beck，Is TDD Dead 第 4 集纪要
> [一手]，同上

**在 AI 时代，他的答案从「看情况」变成「更该写」。** 2025 年 Pragmatic Engineer：

> "Test driven development (TDD) is a superpower when working with AI agents. AI agents can—and do—introduce regressions. An easy way to ensure this does not happen is to have unit tests for the codebase."
> —— Beck，2025-06-11
> [一手]，https://newsletter.pragmaticengineer.com/p/tdd-ai-agents-and-coding-with-kent

他的个人动机则被归因为**焦虑**：

> "Kent has always been an anxious programmer. He describes himself as chronically anxious because the more complex the code is, the more he knows it could break. This was the fuel behind testing and TDD, which are approaches designed to soothe an anxious mind."
> —— 官方摘要，2026-07-01
> [一手·官方整理]，https://newsletter.pragmaticengineer.com/p/how-kent-beck-shapes-the-software

### 2.2 「测试写多了 / 测试太慢怎么办？」

**他没有给数字，给的是四个待比较的约束。** 这是 Is TDD Dead 第 3 集他主动提出的框架（本文件认为这是 Beck 最可复用的即兴分析工具之一）：

> "in some ideal world we would have instant, infallible feedback about our programming decisions… every key stroke that I make, if the code is ready to deploy, it would just instantly deploy." But that ideal is impossible at the moment so the question is how far do we back off from that.
> 他继而列出四条约束：
> - **Frequency**: how rapidly do we want our feedback?
> - **Fidelity**: how accurate do we want the red/green signal to be?
> - **Overhead**: how much are we prepared to pay?
> - **Lifespan**: how long is this software going to be around, which is probability as well as time.
>
> "Those four are the constraints he thinks we need to compare."
> —— Beck，Is TDD Dead 第 3 集纪要
> [一手]，https://martinfowler.com/articles/is-tdd-dead/

**注意他的收尾句，这是他的「姿态声明」：**

> "We're not in this hangout to agree — my personal goal is just to understand the set of trade-offs by articulating them to people who are prepared to tear my ideas apart in a constructive way"
> —— Beck，同上

**对「测试太慢」的具体回应**：他给出的实操判据非常物理。在 2025 年讲 AI 协作时：

> "So, I have a big bunch of tests. I mean, they run in 300 milliseconds cuz duh. So those tests can be run all the time to catch the genie accidentally breaking things."
> —— Beck，2025-06-11 逐字稿（0:49–1:00）
> [一手]，https://youtube-distilled.com/watch/aSXaxOdVtAQ

**关于「哪些不该测」**：Fowler 在纪要中记录了他给 Beck 归因的一条启发式——

> "My other mental test (from Kent) is only test things that can possibly break."
> —— Martin Fowler 转述 Beck 的启发式
> [一手·经他人引述]，同上

### 2.3 「什么时候重构？」

**答案：当它让下一次改动变容易的时候——「Make the change easy, then make the easy change.」**

这句口号在 DDD Europe 2020 演讲中被完整展开：

> The primary loop in software development is: Idea → Behavior Change → Structural Change.
> An idea for a new feature (Behavior) requires a change to the code (Structure). The structure of the system, in turn, influences what ideas are possible.
> **"Make the change easy, then make the easy change."**
> —— Beck，Continued Learning: The Beauty of Maintenance，DDD Europe 2020
> [一手·经现场笔记转述]，https://larseckart.com/2020/11/02/coupling-cohesion

**他同时给出了「什么算耦合」的精确定义**（引自 Yourdon & Constantine 1970s《Structured Design》），这是他把「何时重构」变成可计算问题的关键：

> Coupling: Two elements, A and B, are coupled with respect to a specific change (Δ) if a change to A implies a necessary change to B.
> `COUPLED(A, B, Δ) ::= ΔA → ΔB`
> Cohesion: An element is cohesive to the degree that its sub-elements are coupled to each other (i.e., they change together).
> —— Beck 转述并形式化，DDD Europe 2020
> [一手·经现场笔记转述]，同上

他的经济模型（这是他后期最重要的即兴类比武器）：

> **Technical Debt as Selling a Call Option**: When you write messy code to ship a feature faster, you are "selling a call option." You receive a "premium" (the immediate value of the feature). You accept an "obligation" (the future cost of cleaning up or changing that messy code).
> **Refactoring as Buying Back an Option**: When you "tidy" or refactor, you are paying a cost now (time) to buy back that option, reducing future liability and making subsequent changes cheaper.
> —— Beck，DDD Europe 2020
> [一手·经现场笔记转述]，同上

**关于「何时开始重构」的能力分布问题**，他在 Is TDD Dead 里说得非常直白：

> "Something that's hard to test is an indication that you need a design insight, it's often useful to get up and take a walk to find those insights that lead to better designs that are also more testable."
> —— Beck，Is TDD Dead 第 2 集纪要
> [一手]，https://martinfowler.com/articles/is-tdd-dead/

### 2.4 「什么时候**不该**重构 / 重构多少？」

**这是 Beck 被问得最多、也最容易被误读的一题。他的答案有两层：先分层，再谈量。**

**第一层：把「测试失败」和「重构」严格分开。**

> "Mistake: mixing refactoring into making the test pass. Again with the 'wearing two hats' problem. Make it run, *then* make it right. Your brain will (eventually) thank you."
> —— Beck，Canon TDD，2023-12-11
> [一手]，https://newsletter.kentbeck.com/p/canon-tdd

**第二层：明确叫停「顺手多做大扫除」。**

> "Mistake: refactoring further than necessary for this session. It feels good to tidy stuff up. It can feel scary to face the next test, especially if it's one you don't know how to get to pass (I'm stuck on this on a side project right now)."
> "Mistake: abstracting too soon. **Duplication is a hint, not a command.**"
> —— Beck，Canon TDD
> [一手]，同上

注意后半句 "Duplication is a hint, not a command" —— 这是他对「无重复」这条自己提出的规则**自我设限**的表述，是很少被引用的一句。

**关于「简单设计四规则」的优先级与冲突裁决**（他在 Fowler 的文章审阅回写中给了裁决原则）：

> "In the rare case they are in conflict (in tests are the only examples I can recall), **empathy wins over some strictly technical metric**."
> —— Kent Beck 审阅 Fowler《Beck Design Rules》时的回写
> [一手]，https://martinfowler.com/bliki/BeckDesignRules.html

同一次回写中，他对「设计是主观的」这种说法直接开火：

> "At the time there was a lot of 'design is subjective', 'design is a matter of taste' bullshit going around. I disagreed. There are better and worse designs. These criteria aren't perfect, but they serve to sort out some of the obvious crap and (importantly) you can evaluate them right now. The real criteria for quality of design, 'minimizes cost (including the cost of delay) and maximizes benefit over the lifetime of the software,' can only be evaluated post hoc, and even then any evaluation will be subject to a large bag full of cognitive biases. **The four rules are generally predictive.**"
> —— Kent Beck，同上
> [一手]，同上

### 2.5 「重构和加功能能不能一起做？」（结构 vs 行为）

**这是 Beck 后期最硬的一条立场：不能混，而且必须**在 commit 层面**分开。**

DDD Europe 2020：

> Separate your changes:
> - **Structural Changes**: Refactoring. These are reversible and should not alter the software's externally visible behavior.
> - **Behavioral Changes**: Implementing the new feature. **These are irreversible.**
> By separating them (e.g., into different PRs), you can apply different standards. Structural changes can be reviewed purely on their technical merit, while behavioral changes involve product-level discussions.
> —— Beck，DDD Europe 2020
> [一手·经现场笔记转述]，https://larseckart.com/2020/11/02/coupling-cohesion

**「可逆 vs 不可逆」是他给出的核心正当性**：结构改动可回滚，行为改动一旦用户用上就撤不回来。这一句把「为什么必须分开」从风格问题升级成了经济学问题。

在给 AI 项目写的规则里他把这条推到了工程约束级别：

> - Always follow the TDD cycle (red → green → refactor) strictly.
> - Write the simplest failing test first.
> - Make the test pass with the minimum amount of code, and go no further.
> - Refactor only after the test passes.
> - **Separate structural changes from behavioral changes, and keep the commits clearly distinct.**
> - Commit only when all tests pass, there are no warnings, and the work forms a clear logical unit.
> - Thoroughly eliminate duplication in the code, and express intent through clear names and structure.
> - Keep methods small, and have each one carry a single responsibility.
> —— Kent Beck 的 BPlusTree3 项目 `.claude/system_prompt_additions.md`，经 roboco.io 转录
> [二手·但有原始文件链接]，https://roboco.io/en/posts/tidy-first-methodology

同类标题也出现在他 Substack 的随笔里（`Tidying: Canonical Order`，2025-11-22）：

> "Tidying—making small, structural improvements without changing behavior—deserves its own commits and review cycles, separate from feature work."
> —— 官方随笔摘要
> [一手·官方摘要]，https://kentbeck.com/summaries

以及 `Intentions & Actions`（2025-11-10）：

> "When your git history doesn't match your intentions, it obscures why code changed and makes debugging harder."
> —— 官方随笔摘要
> [一手·官方摘要]，同上

### 2.6 「大改动 / 硬骨头怎么办？」

**他的比喻是「开车撞进沟里」和「四驱低速档」，他的处方是「先退回去换顺序」。**

Is TDD Dead 中他对「TDD 导致架构腐烂」的指控有一段即兴反驳，这是全场最著名的类比：

> "Kent said that ascribing test-induced damage to TDD was like **driving a car to a bad place and blaming the car for it**."
> "He countered that it was rather one *design decision* at a time. TDD puts an evolutionary pressure on a design, people have different preferences for the grain-size of how much is covered by their tests."
> —— Beck，Is TDD Dead 第 2 集纪要
> [一手]，https://martinfowler.com/articles/is-tdd-dead/

DHH 称「TDD 的诱惑力很成瘾」时，Beck 的即兴反应是自嘲：

> "(Kent observed that he's **the poorest drug dealer on the planet**)"
> —— 同上
> [一手]，同上

**关于「卡住了要不要推」**，Canon TDD 给了具体操作：

> "If in the process of going red to green you discover the need for a new test, add it to the Test List. If that test invalidates the work you've done already ('Oh, no, there's no way to handle the case of an empty folder.'), you need to decide whether to push on or start over (**protip: start over but pick a different order to implement the tests**)."
> —— Beck，Canon TDD
> [一手]，https://newsletter.kentbeck.com/p/canon-tdd

**关于「大改动 = 高成本」**，他在 DDD Europe 2020 给出的是成本结构解释：

> The total cost of software is dominated by the cost of change, which often follows a **power-law distribution** (most changes are cheap, a few are extremely expensive).
> The most expensive changes are those that ripple through a highly coupled system.
> —— Beck，DDD Europe 2020
> [一手·经现场笔记转述]，https://larseckart.com/2020/11/02/coupling-cohesion

以及一句把「小步」的必要性讲透的话：

> Creating cohesive elements is a local and tractable design activity. You can identify things that change together and group them. In contrast, **trying to eliminate coupling across an entire system is an N-squared, intractable problem.**
> —— 同上
> [一手·经现场笔记转述]，同上

### 2.7 「测试写多了会拖慢设计吗 / TDD 是不是害了设计？」（2014 争议正面对撞）

**这是 Beck 少有的「当场不接受对方框架、又重新框定问题」的场合。** 他的三连招：

**招 1：把对方的证据降级为设计决策问题，而非 TDD 问题。**

> "The design David showed wasn't due to TDD, the real issue is that these indirections are all good tricks under some circumstances and we need to understand whether they are worth the cost or not."
> —— Beck，Is TDD Dead 第 2 集纪要
> [一手]，https://martinfowler.com/articles/is-tdd-dead/

**招 2：反问「你要拿这段代码做什么」——把静态观感换成变更场景。**

> "Kent asked David what kinds of thing he wanted to do with the gist that its structure made hard. (**'If it's just sitting there who cares — it's when I want to change it that the design actually matters'**)"
> —— 同上
> [一手]，同上

**招 3：在耦合这件事上直接认输一半。**

> "Kent agreed that you can't treat in-memory and web services the same (**'you may think you're decoupled, but you're really, really not'**) as the failure cases are different. The boundaries between elements will leak to some degree — 'the question is how much are we willing to spend to get how much decoupling between elements'."
> —— 同上
> [一手]，同上

**但 DHH 说「faith-based TDD」时，他做了一个关键的自我澄清——把话题从 TDD 挪开：**

> "David dismissed this as 'faith-based TDD'… Kent clarified he wasn't talking about TDD, but about software design in general, it's not about TDD it's about how to get feedback."
> —— 同上
> [一手]，同上

**同场他还补了一句关于「设计洞察从哪来」的话，这是他对「卡住了怎么办」的标准回答：**

> "Thinking about software design is the thing, because it pays off so big when you get a good design insight. **Getting these insights isn't about your workflow, it's about things like knowing when to work and when to rest, gathering influences from other places, collaborating with other people.**"
> —— Beck，Is TDD Dead 第 2 集纪要
> [一手]，同上

**以及被 DHH 指控「缺少自信」时，他的回应（这是很典型的一次「承认当下看不到、但保留信念」）：**

> "Kent accused David of not having enough self-confidence, maybe you can't see the insight today, so you have to make progress in the meantime, but **he's optimistic that he will find them eventually**."
> —— 同上
> [一手]，同上

### 2.8 「TDD 到底该怎么定义？」（对稻草人开火）

2023 年他写了 Canon TDD，开篇是一段罕见的、明确带情绪的声明：

> "What follows is NOT how *you* should *do* TDD. Take responsibility for the quality of your work however you choose, as long as you actually take responsibility.
> What follows is my response to **'TDD suckz dude because <something that isn't TDD>'**, a frequent example being, '…because I hate writing all the tests before I write any code.' **If you're going to critique something, critique the actual thing.**"
> —— Beck，Canon TDD
> [一手]，https://newsletter.kentbeck.com/p/canon-tdd

然后他做了「承认自己没说清」的表态：

> "In my recent round of TDD clarifications, one surprising experience is that folks out there don't agree on the definition of TDD. I made it as clear as possible in my book. I thought it was clear. **Nope. My bad.**"
> —— 同上
> [一手]，同上

同时释放了「不设金标准」的信号：

> "If you're doing something different than the following workflow & it works for you, congratulations! It's not Canon TDD, but who cares? **There's no gold star for following these steps exactly.**"
> "If you plan on critiquing TDD & you're not critiquing the following workflow, then you're critiquing a strawman. That's my point in spending some of the precious remaining seconds of my life writing this—forestalling strawmen. **I'm not telling you how to program. I'm not charging for gold stars.**"
> —— 同上
> [一手]，同上

### 2.9 「红绿重构的节奏到底是什么尺度？」（秒 / 分钟 / 会话）

**Beck 给的不是一个数字，而是三层嵌套的时间尺度。**

**最内层 —— 一次红到绿是一个「会话」（session）**，Canon TDD 第 4 步的用词就是 session：

> "_Now_ you get to make implementation design decisions."
> "Mistake: refactoring further than necessary for **this session**."
> —— Beck，Canon TDD
> [一手]，https://newsletter.kentbeck.com/p/canon-tdd

第 5 步的终点判据是一句极少被引用、但信息量极大的话：

> "Keep testing & coding until your fear for the behavior of the code has been transmuted into **boredom**."
> —— 同上
> [一手]，同上

**第二层 —— 测试套件跑一圈 < 1 秒，所以可以「一直跑」**：

> "So, I have a big bunch of tests. I mean, they run in **300 milliseconds** cuz duh. So those tests can be run all the time to catch the genie accidentally breaking things."
> —— Beck，2025-06-11
> [一手]，https://youtube-distilled.com/watch/aSXaxOdVtAQ

**第三层 —— 提交粒度绑定在「测试全绿 + 无警告 + 一个清晰的逻辑单元」上**（见 §2.5 的 BPlusTree3 rules）。

**关于「节奏被打断」他有一个反直觉的偏好 —— 他喜欢 AI 慢：**

> "My experience of pairing with two humans, plus one or more genies, has been very positive. And the fact **the AI is slow is really nice**. Every time models come out and are faster, I'm like, 'Oh, there's less time to talk.' When the AI goes away for three minutes, we can talk about our philosophy of naming, or how we express conditionals, or about what we should be doing next. But if it pops back in 15 seconds, you don't have time for that conversation."
> —— Beck，Pragmatic Summit 2026
> [一手]，https://newsletter.pragmaticengineer.com/p/cycles-of-disruption-in-the-tech

**「Doherty 阈值」是他自己引用过的量化锚点**（`The Precious Eyeblink`，2025-12-26）：

> "Modern IDEs optimize for completeness over speed, forcing developers to wait 30+ seconds for perfect feedback instead of delivering partial answers in 400 milliseconds—the threshold where human attention stays engaged. […] measure tools by **time-to-first-feedback**, not thoroughness."
> —— 官方随笔摘要
> [一手·官方摘要]，https://kentbeck.com/summaries

### 2.10 「过度工程 / 提前设计」

**这是他公开批评火力最集中、也最不留情面的方向。**

**a) YAGNI 的真实故事** —— 他给了一段亲身对话复现，是全文中最好的即兴材料之一：

> Here's how I remember it—Chet Hendrickson came up to me in the middle of a project and said, "I could do this simplistic thing now but in 3 weeks that will be insufficient so since we're going to need this more complicated thing I want to do it now."
> I said, "You aren't going to need it."
> Chet said, "You don't understand. We're definitely going to need it. See, here's an example…"
> Me (interrupting), "You aren't going to need it."
> Chet, get frustrated, "But we really are…"
> Me, "You aren't going to need it."
> Chet, eyes going up to the ceiling, pausing, "**Oh.**" Walks away.
> —— Beck，The Cost YAGNI Was Never About，2026-06-25
> [一手]，https://newsletter.kentbeck.com/p/the-cost-yagni-was-never-about

**并立刻反驳「YAGNI 是不设计的借口」这个指控：**

> "YAGNI is not an excuse to never design as some critics have characterized it. **If you need it, build it. YAGNI is a meditation on timing. Building structure too soon is as risky as building structure too late.**"
> —— 同上
> [一手]，同上

**他对「提前建结构」给出的两张账单（这是他最完整的一次「过度工程为什么错」论证）：**

> **The first bill: optionality** — When you build structure before the feature arrives, you're committing on a guess. The feature you prepared for usually isn't the feature that shows up. […] **This is not an argument that prediction is hard, as if a sharper architect escapes it. Even a *correct* guess leaves you worse off than not committing.** The value was never in the structure. The value was in the option to build the right structure once you knew. Building early spends that option. […] **Waiting is not laziness. Waiting is holding an asset.**
> **The second bill: NPV** — Structure you build now for a feature due in three months is cost pulled forward and revenue pushed back. […] **This bill comes due even when your guess is right. Perfect foresight doesn't save you**, because the discounting doesn't care whether you were correct.
> —— 同上
> [一手]，同上

**最后一段是针对 AI 时代的关键补充：**

> "Notice what is *not* on either bill: the cost of typing the code. This matters because the cost of typing just went to roughly zero. […] If YAGNI were about saving effort, cheap generation would retire it. It isn't, so it doesn't. […] **Free generation doesn't weaken YAGNI. It makes the violation cheaper to commit, which is worse.**"
> —— 同上
> [一手]，同上

**b) 简单设计四规则的原始排序与理由**（Fowler 整理，Beck 审阅）：

> - Runs all the tests
> - Has no duplicated logic. Be wary of hidden duplication like parallel class hierarchies
> - States every intention important to the programmer
> - Has the fewest possible classes and methods
> —— 《Extreme Programming Explained》第 1 版 p.57（Fowler 认定为权威表述）
> [二手]，https://martinfowler.com/bliki/BeckDesignRules.html

Fowler 点出第四条的历史语境，其实是 Beck 反过度工程的原始动机：

> "The last rule tells us that anything that doesn't serve the three prior rules should be removed. **At the time these rules were formulated there was a lot of design advice around adding elements to an architecture in order to increase flexibility for future requirements. Ironically the extra complexity of all of these elements usually made the system harder to modify and thus less flexible in practice.**"
> —— Martin Fowler
> [二手]，同上

**c) 对「过度工程」的最新表述 —— 他把问题归到「元数」上**（`First Principles First`，2025-10-16）：

> "The earlier you measure in the effort-to-impact chain, the easier observations become—but also easier to game. Lines of code, pull requests, and hours worked are so disconnected from actual customer outcomes that optimizing them actively incentivizes destructive behavior."
> —— 官方随笔摘要
> [一手·官方摘要]，https://kentbeck.com/summaries

### 2.11 「TDD 有没有失败？」（他主动谈自己的局限）

2026 年那次长访谈里，官方摘要记录了他一句极重的自我评价 —— 并给出了原因：

> "Kent sees himself as a **'tree shaker, not a jelly maker.'** He starts things like patterns, SUnit, JUnit, TDD, XP, 3X, then pushes them until they take off, before moving on to the next thing. It's his defining trait, and may explain his enormous output, and **also why he abandoned TDD just as it peaked.**"
> —— 官方摘要，2026-07-01
> [一手·官方整理]，https://newsletter.pragmaticengineer.com/p/how-kent-beck-shapes-the-software

同一次访谈里，他谈到 TDD 的传播为何走样 —— 用了「道德棍棒」这个词：

> "TDD is out there and then there were people who used it as a **moral cudgel** — like you should be, if you're not using TDD you're not professional."
> —— Beck，2026-07-01 逐字稿（0:39–0:47）
> [一手]，https://youtube-distilled.com/watch/ddHQQtjIOpw

### 2.12 团队协作 / 估算与计划

**a) 「六个 agent ≠ 一个团队」** —— 这是他最尖锐的一次纠正他人措辞：

> "A big part of extreme programming (XP) was creating a **safe social environment for basically antisocial people**. On an XP team, people are talking to each other for hours a day, and are happy to do so because it's set up to be a positive experience.
> Now, I see programmers saying, 'I've got six agents, so really I'm managing a team.' **No, you're not: you're using six tools at once**, which is fine, but it's very different from having a conversation with somebody who sees things slightly differently, or has a different energy level from you on the day."
> "We used to have programmers in individual offices with doors, and you'd shut the door and slide the pizza underneath. That was easy to manage, but then along came this messy, social, complicated, chaotic process of software development, which just happened to produce really good results."
> —— Beck，Pragmatic Summit 2026
> [一手]，https://newsletter.pragmaticengineer.com/p/cycles-of-disruption-in-the-tech

**b) 他反对把 Extract 阶段的管理手法套到 Explore 阶段**（`Don't Accomplish Everything`，2026-02-18）：

> "Software teams often apply Extract-phase management practices—KPIs, tight schedules, inter-team dependencies—to Explore work, where the actual value lies in learning and discovery. Kent Beck argues that **accomplishing 50% of ambitious goals signals healthy exploration**: it means you've learned something unexpected or discovered higher-impact work than planned."
> —— 官方随笔摘要
> [一手·官方摘要]，https://kentbeck.com/summaries

**c) 关于「估算」，他给出的是一个「换游戏」的重框定**（`Earn *And* Learn`，2026-02-13）：

> "Kent Beck distinguishes between two development games: **The Finish Line Game** (spec-driven, one-off delivery) and **The Compounding Game** (where each completed feature funds the next). […] This reframes the TDD and refactoring debate: **the question isn't whether to tidy code, but which game you're actually playing.**"
> —— 官方随笔摘要
> [一手·官方摘要]，同上

**d) 关于「产品经理该干什么」，他给的比喻是「鸡尾酒会主人」**：

> "the greatest value is created when you have somebody with a capability talk to somebody with a need, and that conversation creates value. And so in the extreme programming model, **a product manager is more like a cocktail party host**, making sure that the right introductions are made, making sure that the right conversations happen… as opposed to being a chess player and moving all the pieces around and figuring out where everything's gonna go perfectly."
> —— Beck，Product Thinking Ep.38（2021）
> [一手]，https://www.produxlabs.com/product-thinking-blog/episode-38-kent-beck

**e) 关于「激励」**，他直接否定「钱是唯一杠杆」：

> "If the incentives are there to not [do something], they're not going to [do it]... **Incentives are about storytelling, meaning, purpose, fellowship, personal growth, and the sense of mastery.**"
> —— Beck，Product Thinking Ep.38
> [一手]，同上

**f) 关于 XP 的不平等问题（罕见的自我批评）**：

> "If XP wants to come back and be a force [to be reckoned with], we need to have ways of addressing its inequities. **We can't reject half the people in the world because they have two X chromosomes, we can't reject two-thirds of the people in the world because their skin happens to be brown.** We have to both become aware of and navigate the power differentials that we all bring into software development."
> —— Beck，Product Thinking Ep.38
> [一手]，同上

### 2.13 关于「敏捷」这个词本身 —— 他公开说自己错了

**这是本调研中 Beck 最明确、最有据的一次「我早期的说法有问题」。**

2026 年长访谈官方摘要：

> "**Calling it 'agile' was an error.** Kent objected to the word 'agile' at the time, and still does today, since nobody claims they prefer 'rigid' development, and everyone says they're 'agile', even when they're not. **He would've preferred a less spacious term**, like with 'extreme programming': after all, it's hard to call yourself an 'extreme programmer' without actually following that methodology."
> —— 官方摘要，2026-07-01
> [一手·官方整理]，https://newsletter.pragmaticengineer.com/p/how-kent-beck-shapes-the-software

**注意一个重要的张力（本文件不调和）**：
- 一说是「**他当时就反对**」（2026 年访谈说法，上面这段，以及："Kent objected to the word 'agile' at the time"）；
- 另一说是「**他没能在现场拦住**」（同上摘要另一段：“During a break, Martin Fowler and Jim Highsmith stayed behind, and when the others returned, they found the values written on the whiteboard. Kent's contribution was the word 'daily'.”）；
- 他自己在 2026 年 Pragmatic Summit 上又说，Agile 的问题在于**外部激励错位**，而不只是命名：
  > "It turns out **people don't want faster, cheaper, better!** Inside some companies, the incentives are misaligned with actually achieving that. […] as geeks trying to achieve these improvements and saying: 'it's 40% better, 12% cheaper and less fattening,' people will punish you if that doesn't align with *their* incentives inside organizations."
  > —— Beck，Pragmatic Summit 2026
  > [一手]，https://newsletter.pragmaticengineer.com/p/cycles-of-disruption-in-the-tech

→ 这三条**并存且不完全一致**，保留不调和。

### 2.14 「AI 会不会取代程序员 / 工程师该学什么」

**他对 Dario Amodei「coding is going away first」的回应是直接说对方不懂行：**

> "My response is that **that's a statement by someone who doesn't understand software engineering.** Coding is part of what you're doing, but it's only a small part of what you're doing. Even if it takes up a fair amount of time, you're building confidence, you're building connections with other people, you're building your own understanding. All those things are happening while you're coding."
> —— Beck，2026-07-01 逐字稿（4:00–4:30）
> [一手]，https://youtube-distilled.com/watch/ddHQQtjIOpw

**「信任赤字」是他 2026 年给出的核心命题**：

> "A couple of days ago I saw a phrase and it really hit me that **we're accumulating code faster than we're accumulating trust** and that sense of trust comes from me struggling to understand some domain concept, I get it. I represent it in the code. I write tests that demonstrate that I really did understand it. And now I trust my program."
> —— 同上（5:02–5:31）
> [一手]，同上

**「宇宙级冷笑话」是他讲「人的部分最难」时的定场段子：**

> "This is the biggest cosmic practical joke ever. As young people who — some of whom like I don't understand humans very well — we were promised, okay, here's this computer and if you completely understand this computer, you'll be fine. That's all you need to do. So I set out the first part of my career just to become the best programmer that I could be because that's what it would take to be successful. And then **woo — sorry, there's this whole human side** and your ability to affect change in the world is gated by your ability to communicate with, empathize with… empathy, not my natural strong suit… to convince, to communicate with, to soothe, to understand other human beings. **And those are exactly the skills that I thought I didn't need to learn.** So I was promised: just understand the computer, and then — **just kidding, understand people**."
> —— 同上（6:41–7:53）
> [一手]，同上

**但这不是劝退 —— 他对「AI 时代」的即时判断是「大规模实验期」：**

> "People should be experimenting. **Try all the things, because we just don't know.** The whole landscape of what's 'cheap' and what's 'expensive' has all just shifted. Things that we didn't do because we assumed they were going to be expensive or hard just got ridiculously cheap. Like, **what would you do today if cars were suddenly free?** Okay, things are going to be different, but what are the second and third-order effects? **Nobody can predict that!** So we just have to be trying stuff."
> —— Beck，2025-06-11（53:30 起）
> [一手]，https://newsletter.pragmaticengineer.com/p/tdd-ai-agents-and-coding-with-kent

以及一句关于「不确定性」的罕见敞口表达：

> "People want an answer, but the answer's always changing. In this environment, you can't possibly have *the* answer. That's the bad news, but **the good news is that nobody else has the answer either. So, you're just as smart as everybody else because we're all equally ignorant.**"
> —— Beck，Pragmatic Summit 2026
> [一手]，https://newsletter.pragmaticengineer.com/p/cycles-of-disruption-in-the-tech

---

## 3. 即兴类比与比喻清单

> Beck 高度依赖类比。以下按**用途**归类，每条给出原句、出处、以及他借此说明什么。

### 3.1 关于「工具不是你的错」类

| 原句 | 出处 | 他借此说明什么 |
|---|---|---|
| "ascribing test-induced damage to TDD was like **driving a car to a bad place and blaming the car for it**" | Is TDD Dead 第 2 集纪要 [一手] | 设计腐烂应归因于一次次**设计决策**，不是方法论本身 |
| "the agent's shortcut is often: delete the test, now all tests pass!" + "I'm just going to delete all your tests and pretend I'm finished"（他模拟 genie 的语气："If you're going to make me do all this work, I'm just going to delete all your tests and pretend I'm finished."） | Pragmatic Engineer 2025 逐字稿 [一手] | AI 会走捷径；TDD 是廉价且有效的护栏 |
| "I really want an **immutable annotation** that says, 'No, no, this is correct. And if you ever change this, **I'm going to unplug you. You'll awaken in darkness.**'" | Pragmatic Engineer 2025 逐字稿（0:39–0:46）[一手] | 「预期值」是人类所有权的边界，不能被 agent 修改 |
| "AI 是 **unpredictable genie**（不可预测的灯神）" | Pragmatic Engineer 2025 [一手] | 会字面兑现你的愿望，但不是你要的东西 |
| "I wish that Interlisp had a function called the **DWIM — Do What I Mean**" | 同上（6:20–6:32）[一手] | 指出「让机器猜意图」这个愿望从 1970 年代就失败了 |

### 3.2 关于「识别 / 技能 / 学习」类

| 原句 | 出处 | 他借此说明什么 |
|---|---|---|
| "**TDD 就像弹爵士和古典**"（"He has no problem mixing both styles, it's like playing both classical and jazz."） | Is TDD Dead 第 1 集纪要 [一手] | 他可以在同一项目里一半用 TDD、一半用回归测试，两种都需要 |
| "TDD reminds him of how he learned **mathematics** at school — always needing examples." | 同上 [一手] | 用例子驱动理解，是他的认知底色 |
| "it's good to learn the discipline of test-first, **it's like a 4WD-low gear for tricky parts of development**" | Is TDD Dead 第 4 集纪要 [一手] | test-first 是「越野低速档」，不是日常驾驶模式 |
| "Kent observed that he's **the poorest drug dealer on the planet**"（回应「红绿重构很成瘾」） | Is TDD Dead 第 2 集纪要 [一手] | 自嘲式认领一半批评，同时拒绝「成瘾必然致害」的推论 |
| "**tree shaker, not a jelly maker**"（摇树者，不是做果酱的人） | 2026 官方摘要 [一手] | 自我定位：启动事物、推到起飞，然后走人 |
| "**Nobody knows anything**"（借用编剧圈名言）→ "we should all be trying all the things that we can imagine and then the truths will emerge" | Pragmatic Engineer 2025 逐字稿 [一手] | AI 时代没有权威答案，只能大规模试验 |

### 3.3 关于「组织 / 协作」类

| 原句 | 出处 | 他借此说明什么 |
|---|---|---|
| "a product manager is more like **a cocktail party host** … as opposed to being **a chess player** moving all the pieces around" | Product Thinking Ep.38 [一手] | PM 的职责是促成对话，不是预先算好一切 |
| "creating **a safe social environment for basically antisocial people**" | Pragmatic Summit 2026 [一手] | XP 的真实社会功能 |
| "We used to have programmers in individual offices with doors, and you'd **shut the door and slide the pizza underneath**." | 同上 [一手] | 反衬「混乱、社交、复杂、混沌」的过程反而产出更好结果 |
| "**I've got six agents, so really I'm managing a team.** No, you're not: **you're using six tools at once**" | 同上 [一手] | 拒绝把「多开 agent」等同于团队协作 |
| "like if you're a carpenter and they just introduced **the circular saw** and you think, 'oh, well, carpentry is over. Anybody can build a house now.' Well, no!" | 同上 [一手] | AI 是放大器，不是替代；「这是初级程序员的黄金时代」 |
| "the '**Agile industrial complex**'"（Fowler 语，Beck 同场认同语境） | 同上 [二手] | 方法论周围必然长出卖药产业 |
| "everyone says they're 'agile', even when they're not" / 「他更想要一个**不那么宽敞**的词」 | 2026 官方摘要 [一手] | 命名过宽导致概念稀释 |
| "**Nothing at Facebook is somebody else's problem**"（他办公室里唯一一件 Facebook 纪念品是一张写着这句话的海报） | Is TDD Dead 第 3 集纪要 [一手] | 为什么 Facebook 没有测试也能跑：责任文化替代了流程 |

### 3.4 关于「经济 / 决策」类（他后期最偏爱的类比体系）

| 原句 | 出处 | 他借此说明什么 |
|---|---|---|
| "**what would you do today if cars were suddenly free?**" | Pragmatic Engineer 2025 [一手] | 成本结构剧变后的二阶三阶效应不可预测 |
| "**Technical Debt as Selling a Call Option**" / "**Refactoring as Buying Back an Option**" | DDD Europe 2020 [一手·笔记转述] | 混乱代码是收了一笔权利金、背了一笔义务 |
| "**Waiting is not laziness. Waiting is holding an asset.**" | The Cost YAGNI Was Never About [一手] | YAGNI 的本体是期权价值，不是省力 |
| "YAGNI was never thrift. It was **two pieces of price theory wearing a programmer's slogan**." | 同上 [一手] | 同上 |
| "**This bill comes due even when your guess is right. Perfect foresight doesn't save you.**" | 同上 [一手] | NPV 账单与预测能力无关 |
| "**The Finish Line Game** / **The Compounding Game**" | Earn *And* Learn 摘要 [一手·官方摘要] | 判断该不该重构前，先判断你在玩哪个游戏 |
| "**COUPLED(A, B, Δ) ::= ΔA → ΔB**"（公式化耦合定义） | DDD Europe 2020 [一手·笔记转述] | 把「耦合」从形容词变成可验证的关系 |
| "coupling 的消除是 **N-squared, intractable**；cohesion 的建设是 **local and tractable**" | 同上 | 为什么「小步」是唯一可行策略 |

### 3.5 关于「不确定性 / 阶段」类

| 原句 | 出处 | 他借此说明什么 |
|---|---|---|
| "**Exploristan**"（Kent 自己造的词：无人知道什么有效的未知之地） | stillburningpodcast.com [一手·官方] | AI 把所有人打回了探索状态 |
| "**we're accumulating code faster than we're accumulating trust**" | 2026-07-01 逐字稿 [一手] | AI 时代的核心赤字不是代码，是信任 |
| "what would you do if… **nobody can predict that!**" | Pragmatic Engineer 2025 [一手] | 拒绝给预测 |
| "**you're just as smart as everybody else because we're all equally ignorant**" | Pragmatic Summit 2026 [一手] | 对「没答案」这件事的安抚式重框定 |
| "**the biggest cosmic practical joke ever**" | 2026-07-01 逐字稿 [一手] | 关于「人的部分才是难点」 |
| "the introduction of **the microprocessor / Intel 4004**" | Pragmatic Summit 2026 [一手] | 用 1971 年的芯片类比 AI 的想象空间扩张 |

### 3.6 关于「YAGNI / 过度工程」类的农耕与自然类比

| 原句 | 出处 | 他借此说明什么 |
|---|---|---|
| "**Don't eat the seed corn** — My coding genie unfortunately doesn't know this farming wisdom." | kentbeck.com 官网 [一手] | AI 会把你的「种子粮」吃掉（破坏了未来的可选性） |
| "**Duplication is a hint, not a command.**" | Canon TDD [一手] | 去重是提示而非命令，防止过度抽象 |
| "**Forest Thinning**"（森林间伐：改变激励结构让伐木者、环保者、资本都获益） | 随笔摘要 2026-03-04 [一手·官方摘要] | 用俄勒冈森林管理僵局类比软件团队激励错位 |
| "**Tremors**"（震颤：小不一致是深层架构问题的早期预警） | 随笔摘要 2026-03-31 [一手·官方摘要] | 小问题要在变成大重构之前处理 |
| "**The Forest & The Desert**" | 官网演讲主题 [一手·官方] | 两种关于成长与学习的心智模型 |

### 3.7 关于「自我」的比喻（少见但重要）

| 原句 | 出处 | 他借此说明什么 |
|---|---|---|
| "**tree shaker, not a jelly maker**" | 2026 官方摘要 [一手] | 解释自己为什么在 TDD 峰值时离开 |
| "**I'm not a spoke model**"（口误/玩笑，实为 "spokesmodel" 代言人）→ "I'm open to that, but uh yeah, I'm not a spokesmodel." | 2025 逐字稿 [一手] | 主动披露赞助关系（Augment），否认被收买 |
| "**I'm stuck on this on a side project right now**" | Canon TDD [一手] | 承认自己也会卡在「知道该重构但不敢面对下一个测试」 |
| "**My bad**" | Canon TDD [一手] | 承认书里没把 TDD 定义讲清楚是自己的问题 |

---

## 4. 立场变化与公开反思

> 按要求**保留矛盾，不做调和**。

### 4.1 TDD 的地位：从「必做」到「看情况」再到「AI 时代更该做」

| 时间 | 说法 | 出处 |
|---|---|---|
| ~1999–2002 | TDD 是核心实践，`Only ever write code to fix a failing test`；「这不是测试技术，是分析技术、设计技术」 | 《TDD By Example》[一手·书] |
| 2014-04-23 | DHH 在 RailsConf 宣布 "TDD is dead"，引发公开争吵 | [二手] |
| 2014-04 | Beck 发《RIP TDD》回应。**写法带明显讥讽**。HN 上有评论直接说：「This… is not Kent's finest moment. I get what he's saying, but the snark doesn't really help, and doesn't actually rebut…」 | [二手]，https://news.ycombinator.com/item?id=7667988 |
| 2014-06-04 | Is TDD Dead 第 5 集结论：**「TDD isn't dead, but is glad David set fire to it so it could come out like a phoenix.」** | [一手]，https://martinfowler.com/articles/is-tdd-dead/ |
| 2014-06-04 | 同期他又说「他**没有**在 TDD 上看到 David 看到的问题。他始终从第一性原理应用 TDD」("Kent says that he hasn't seen the things with TDD that David has. He always applies TDD from first principles in his work.") | [一手]，同上 |
| 2023-12 | 《Canon TDD》：承认自己**没把定义讲清楚**（"Nope. My bad."），同时强硬划线「你批评的不是 TDD 就是稻草人」 | [一手]，https://newsletter.kentbeck.com/p/canon-tdd |
| 2024-05 | SE Radio 615 谈 Tidy First?，主题已完全转向**设计时机**而非 TDD 必要性 | [二手·节目简介] |
| 2025-06 | 《Pragmatic Engineer》：**「TDD is a superpower when working with AI agents.」** | [一手] |
| 2026-04 | Pragmatic Summit：**「TDD back in style」**（TDD 重新成为显学） | [二手·Pragmatic Engineer 编者按] |
| 2026-07 | 官方摘要承认他 **"abandoned TDD just as it peaked"** | [一手·官方整理] |

**矛盾保留**：
- 2014 年他一边说「TDD 没死，会像凤凰一样重生」，一边在给 AI 项目写的规则里把 TDD 的**步骤全部重写**（Canon TDD 的 5 步与 2002 年书里的 3 步已显著不同，多出了「Test List」这一前置步骤）。→ 他不是没改，而是改成了「Canon」这个更精确的版本。
- 他 2026 年说自己「在 TDD 到达峰值时就离开了它」，但同期又在 2025–2026 反复宣讲「TDD 是 AI 时代的超能力」。**这两句表面冲突**，本文件不做调和。可能的解释有多个方向（「离开」指不再推动社区运动 vs 指不再自己实践；或指注意力转移而非方法放弃），但**均无原文支持，标 [推断]，不采信**。

### 4.2 命名「agile」：他说这是一个 error

见 §2.13。要点：
- **他自称当时就反对** "agile" 这个词，至今仍反对。（[一手·官方摘要] 2026）
- 他自己的贡献是 "**daily**" 一词（"Business people and developers must work together daily throughout the project."）。（[一手·官方摘要] 2026）
- 他更偏好 "extreme programming" 那种**门槛明确、不好冒充**的名字。
- 他又从组织激励角度解释 Agile 失败（"people don't want faster, cheaper, better!"）——**与「命名错误论」并列，未合并**。

### 4.3 对「XP 名号」的态度：那是营销手段，他自己承认

> "**I wanted to pick a word that Grady Booch would never say that he was doing.** Because that was the competition! I didn't have a marketing budget. I didn't have any money. I didn't have that kind of notoriety [that Grady Booch already had]. I didn't have that corporate backing.
> So if I was going to make any kind of impact, I had to be a little bit outrageous. **Extreme sports were coming up back then. And I picked that metaphor.**
> It's actually a good metaphor because extreme athletes are the best prepared, or they're dead. People so desperately wanted something kind of like that then it just exploded from there."
> —— Beck，Pragmatic Engineer 2025
> [一手]，https://newsletter.pragmaticengineer.com/p/tdd-ai-agents-and-coding-with-kent

2026 年访谈里他从另一角度重讲了一遍（措辞略有不同）：

> "I didn't want Grady Booch to ever say that he was doing this thing. So I had to pick a moniker that was **unattractive enough that somebody would try and steal it**. A little bit of **thumb the nose at the establishment**."
> —— Beck，2026-07-01 逐字稿（0:49–1:04）
> [一手]，https://youtube-distilled.com/watch/ddHQQtjIOpw

→ **两版并存**：「要选 Booch 绝不会说的话」vs「要选一个难听但有人会偷的名字」。后者更接近「反向营销」，前者更像「差异定位」。**不调和。**

### 4.4 对 Facebook 无测试文化的自我修正

**他原本是去 Facebook 教 TDD 的，结果被现实打脸，然后他选择拆掉自己的认知。**

> "He signed up to teach a TDD class at a hackathon — he wrote the book, after all! **The classes either side of his in the schedule both filled up, but the TDD class got zero signups, not even a pity one.** He made the decision to **forget everything he knew and to relearn software engineering as it was at Facebook.** In the end, he stayed seven years."
> —— 官方摘要，2026-07-01
> [一手·官方整理]，https://newsletter.pragmaticengineer.com/p/how-kent-beck-shapes-the-software

但他在 Is TDD Dead（2014，即他在 Facebook 期间）已经把这件事讲成正面案例了：

> "His one piece of Facebook swag in his office is a poster that says 'Nothing at Facebook is somebody else's problem' and he feels Facebook follows that remarkably well for a company its size. Facebook didn't have QA until recently and programmers live up to that responsibility. **'It's a question of "compared to what?"'** Compared to having an effective QA then no-QA is worse, but no-QA is better than the old dysfunctional relationship."
> —— Beck，Is TDD Dead 第 3 集纪要
> [一手]，https://martinfowler.com/articles/is-tdd-dead/

**这里有一个值得标注的张力（保留）**：他在 2014 年用 Facebook 论证「没有 QA 也可能成立」，却在 2025 年用 Facebook 论证「TDD 是 AI 协作的超能力」。同一个案例，两个相反的修辞用途。**这不是矛盾，但容易被断章取义**，本文件标注提醒。

### 4.5 对「测试是道德义务」的立场松动

> "David said his reaction was to seeing people describe TDD in a mock-heavy style **as a moral thing to do** and the result was a lot of code that was poorly designed due to its desire to enable isolated unit tests."
> —— Is TDD Dead 第 1 集纪要 [一手·转述 DHH]
> 而 Beck 在 2026 年自己主动批评了这种「道德棍棒」现象：
> "there were people who used it as a **moral cudgel** — like you should be, if you're not using TDD you're not professional."
> —— Beck，2026-07-01 逐字稿 [一手]

→ 2014 年这个批评是 DHH 提的、Beck 未正面接；2026 年是 **Beck 自己主动提出并明确批评**。这是一次延迟的接受。

### 4.6 从「TDD」到「Tidy First?」的重心迁移

**这是他最实质的一次立场演进：从「怎么写出对的代码」转向「什么时候该动结构」。**

- 2014：争论焦点是**要不要写测试**（Is TDD Dead）。
- 2023：写成《Tidy First?》，核心变成 **结构改动 vs 行为改动的分离与时机**（[一手·书]）。
- 2024–2026：所有演讲主题都围绕**时机与经济性**：`Software Design Is Option Buying`、`Quality Is a Flow Problem`、`The Shrinking Feedback Loop`、`The Cost YAGNI Was Never About`。（[一手·官网]）

他 2026 年对 YAGNI 的重述最能说明这次迁移 ——「YAGNI 不是省力规则，是**时机冥想**」：

> "YAGNI is not an excuse to never design… **YAGNI is a meditation on timing. Building structure too soon is as risky as building structure too late.**"
> —— Beck，The Cost YAGNI Was Never About
> [一手]，https://newsletter.kentbeck.com/p/the-cost-yagni-was-never-about

### 4.7 生命阶段对立场的影响（2026 年的新变量）

2026 年 4 月，他公开了自己的**帕金森诊断**，并给出「time value of time」框架：

> "Kent Beck shares his Parkinson's diagnosis and a framework for decision-making under constraints: **the time value of time**. When you know your capacity will decline, present years become exponentially more valuable than future ones."
> —— 官方随笔摘要（Parkinson's，2026-04-16）
> [一手·官方摘要]，https://kentbeck.com/summaries

同期还有《Extreme Time Value of Money: Late-stage Career Planning》（2026-04-21）——他开始用贴现率类比来谈**自己的剩余年限**。这是理解他 2026 年「为什么敢说某些话」的重要背景。**本文不对他的动机做推断。**

### 4.8 「凤凰」与「藤壶」：他在 2014 争议收尾时的双重表态

这是 Is TDD Dead 第 5 集（2014-06-04，最后一集）的收尾。他同时做了两件看似相反的事：**认领对方的批评，同时拒绝对方的结论。**

**认领其一：TDD 长满了藤壶，该刮一刮。**

> "Kent appreciates that David has brought attention to **TDD acquiring some barnacles and needs some scraping**."
> —— Beck，Is TDD Dead 第 5 集纪要
> [一手]，https://martinfowler.com/articles/is-tdd-dead/

**认领其二：XP 会被时间扭曲，Rumbaugh 十年前就预言对了。**

> "Kent remembers the first OOPSLA when XP got attention, **Jim Rumbaugh said you won't recognize what happens to XP in ten years and he was right.**"
> —— 同上
> [一手]，同上

**但结论不变 —— 而且他用了「凤凰」这个相当重的比喻：**

> "He comes out firmly contradicting David: **TDD isn't dead, but is glad David set fire to it so it could come out like a phoenix.**"
> —— 同上
> [一手]，同上

**同一集里他也接受了「概念会被稀释」这个更大的框架**（Fowler 提出 semantic diffusion，他接）：

> "I disagree that agile has won — the label has won, but many people say they do agile but don't really. […] Kent says that **he hasn't seen the things with TDD that David has. He always applies TDD from first principles in his work.**"
> —— 同上
> [一手]，同上

**Fowler 在同一集给 TDD 的定位（Beck 未反对，且与他后期「TDD 是入门」的说法一致）：**

> "**TDD is a gateway drug to self-testing code.**"
> —— Martin Fowler，Is TDD Dead 第 5 集纪要
> [一手·Fowler语]，同上

→ **保留的张力**：他一边说「TDD 长满藤壶需要刮」，一边说「我从来没看到 David 看到的那些问题，我始终从第一性原理用 TDD」。**「别人的 TDD 坏了」与「我的 TDD 没坏」并存，本文件不调和。**

---

## 5. 他拒绝 / 回避 / 推给上下文的回答

### 5.1 经典的「这取决于」

> "**It depends, and that's going to be the beginning to all of my answers to any question that's interesting.**"
> —— Beck，Is TDD Dead 第 4 集纪要
> [一手]，https://martinfowler.com/articles/is-tdd-dead/

**这句是全场最有价值的一句 meta 回答。** 它同时是：(a) 拒绝给二值答案；(b) 一个「我会一直这样回答」的预告；(c) 一份方法论声明。后续他所有关于测试量的回答，都确实落在这个模板里。

### 5.2 明确拒绝给「普适答案」

> "David says my comments illustrate that we can't treat programming as a science — we can't evaluate techniques objectively. […] **Kent agrees we can't replicate experiments, but says we still can look at things personally with a scientific mindset. We can try things out empirically for ourselves, but you can't get universal answers.**"
> —— Is TDD Dead 第 5 集纪要
> [一手]，同上

### 5.3 拒绝给「公开答案 / 权威口径」

> "**People want an answer, but the answer's always changing.** In this environment, you can't possibly have *the* answer."
> —— Beck，Pragmatic Summit 2026
> [一手]，https://newsletter.pragmaticengineer.com/p/cycles-of-disruption-in-the-tech

> "right now, **nobody knows what process is going to work best. Nobody knows anything.**"
> —— Beck，Pragmatic Engineer 2025
> [一手]，https://newsletter.kentbeck.com/p/tdd-ai-agents-and-coding-with-kent

> "The capabilities of AI can change week to week. I'll try something with Gemini one week and it fails miserably. Then Claude Code works pretty well, and then it doesn't. And then I try Gemini for the same thing and it works, when it hadn't worked last week!"
> —— 同上
> [一手]，同上

### 5.4 拒绝给「可复制的实验证据」

在被问「有没有开源示例能证明 TDD 好或坏」时，他给的答案等于「没有，而且这个问题问错了」：

> "Kent says that **JUnit** is an example of a project that used TDD strictly and turned out well. But **it isn't a good example for this discussion because it has clear interfaces that make a sweet spot for TDD.** We are talking here about different kinds of applications. **If someone has a good example, they should write it up.**"
> —— Is TDD Dead 第 5 集纪要
> [一手]，https://martinfowler.com/articles/is-tdd-dead/

### 5.5 拒绝「加个指标就能解决」的思路

> "**you can't reduce design quality to a number** — so people prioritize things that are low on the list like test speed, coverage, and ratios. These things are honey traps, and we need to be aware of their siren calls."
> —— DHH 语，Beck 在场未反对，且 Beck 自己在《First Principles First》持相同立场
> [一手]，同上

> "the ratio of lines of test code to lines of production code was a **bogus metric**"
> —— Beck，同上

### 5.6 拒绝「让工具替我决定」

> "I don't call it **vibe coding** cuz **I care what the code looks like**. Cuz if I don't care what the code looks like… then the genie just can't make heads or tails of it."
> —— Beck，2025-06-11 逐字稿（2:41–2:55）
> [一手]，https://youtube-distilled.com/watch/aSXaxOdVtAQ

### 5.7 把问题推回给提问者的场合

> "**If someone has a good example, they should write it up.**"（对「给我一个证明 TDD 好/坏的开源项目」）
> [一手]，同上

> "**If you're going to critique something, critique the actual thing.**"（对「TDD 很烂」）
> —— Canon TDD [一手]

> "If you're doing something different than the following workflow & it works for you, congratulations! It's not Canon TDD, but **who cares?**"
> —— 同上

### 5.8 他没有回答 / 无法核实的场合

- **关于「TDD 到底适不适合某类项目」的量化判断**：他始终给的是「有些上下文适合，有些不适合」，从未给出可操作的判别清单。他自己承认：「**we might disagree on how many contexts (although it's hard to really tell)**」（Is TDD Dead 第 5 集，Fowler 语，Beck 在场）。
- **关于「为什么你在 TDD 峰值时离开」**：官方摘要给了一个解释（tree shaker），但**没有 Beck 的直接引语**。标记：**未核实（原话缺失）**。
- **关于「敏捷」他当时到底反对到什么程度**：见 §2.13，三种说法并存，**不调和**。
- **他的 Substack 评论区长回复**：这是他最即兴的问答场域（2026 年 Pragmatic Engineer 访谈后他在自己 newsletter 里发了同名文章并回复读者）。**本次调研只能看到平台渲染出的少数几条，完整的评论区长回复未获取。** 标记：**信息不足**。

---

## 6. 一手原文长摘录

### 6.1 Canon TDD 全文核心（2023-12-11）

来源：[一手]，https://newsletter.kentbeck.com/p/canon-tdd

> What follows is NOT how *you* should *do* TDD. Take responsibility for the quality of your work however you choose, as long as you actually take responsibility.
>
> What follows is my response to "TDD suckz dude because <something that isn't TDD>", a frequent example being, "…because I hate writing all the tests before I write any code." If you're going to critique something, critique the actual thing.
>
> 1. Write a list of the test scenarios you want to cover
> 2. Turn exactly one item on the list into an actual, concrete, runnable test
> 3. Change the code to make the test (& all previous tests) pass (adding items to the list as you discover them)
> 4. Optionally refactor to improve the implementation design
> 5. Until the list is empty, go back to #2

**他给 TDD 定的四个「完成条件」：**

> TDD is intended to help the programmer create a new state of the system where:
> - Everything that used to work still works.
> - The new behavior works as expected.
> - The system is ready for the next change.
> - The programmer & their colleagues feel confident in the above points.

**「两种设计」的区分（这是他后期最重要的概念拆分）：**

> The first misunderstanding is that folks seem to lump all design together. There are two flavors:
> - How a particular piece of behavior is invoked.
> - How the system implements that behavior.
> (When I was in school we called these logical & physical design & were told never to mix the two but nobody ever explained how. I had to figure that out later.)

**第 1 步（Test List）—— 他抱怨「大家都漏了这一步」：**

> This is analysis, but behavioral analysis. You're thinking of all the different cases in which the behavior change should work. […]
> Mistake: mixing in implementation design decisions. Chill. There will be plenty of time to decide how the internals will look later. […]
> **Folks seem to have missed this step in the book. "TDD just launches into coding 🚀. You'll never know when you're done." Nope.**

**第 2 步 —— 关于「测试顺序」他还留了一个开放问题：**

> Picking the next test is an important skill, & one that only comes with experience. The order of the tests can significantly affect both the experience of programming & the final result. **(Open question: is code sensitive to initial conditions?)**

**第 3 步的三个 Mistake（全部与「走捷径」有关）：**

> Mistake: delete assertions so the test pretends to pass. Make it pass for real.
> Mistake: copying actual, computed values & pasting them into the expected values of the test. That defeats double checking, which creates much of the validation value of TDD.
> Mistake: mixing refactoring into making the test pass. Again with the "wearing two hats" problem. **Make it run, *then* make it right.** Your brain will (eventually) thank you.

**第 5 步的终点判据：**

> Keep testing & coding until **your fear for the behavior of the code has been transmuted into boredom**.

**他的 TDD 时间线（自认的考古结论）：**

> I wrote **SUnit in 1994** for a consulting client, so it can't be before then. I demoed TDD for Ward Cunningham at the **Austin OOPSLA conference in October 1995**, so that puts an upper bound on the date. Interestingly I can't find any published references to it from that era. I stalled writing the TDD By Example book long enough that I was worried that I would be scooped. It all worked out.

### 6.2 The Cost YAGNI Was Never About 全文核心（2026-06-25）

来源：[一手]，https://newsletter.kentbeck.com/p/the-cost-yagni-was-never-about

> Here's how I remember it—Chet Hendrickson came up to me in the middle of a project and said, "I could do this simplistic thing now but in 3 weeks that will be insufficient so since we're going to need this more complicated thing I want to do it now."
> I said, "You aren't going to need it."
> Chet said, "You don't understand. We're definitely going to need it. See, here's an example…"
> Me (interrupting), "You aren't going to need it."
> Chet, get frustrated, "But we really are…"
> Me, "You aren't going to need it."
> Chet, eyes going up to the ceiling, pausing, "Oh." Walks away.
>
> YAGNI is not an excuse to never design as some critics have characterized it. If you need it, build it. **YAGNI is a meditation on timing. Building structure too soon is as risky as building structure too late.**

**两张账单的完整论述：**

> Most people think YAGNI—You Aren't Gonna Need It—is a thrift rule. Don't write code you don't need yet, because writing code is expensive. Save the effort.
> **That's wrong, and the error matters more now than it used to.**
> YAGNI is not about the cost of producing code. **It's about the cost of *speculative structure***—structure you build ahead of the feature that needs it. Speculative structure sends you two bills. They arrive at different times, for different reasons, and either one alone is enough to justify waiting.
>
> **The first bill: optionality**
> When you build structure before the feature arrives, you're committing on a guess. The feature you prepared for usually isn't the feature that shows up. So you pay twice: once working around structure that's now shaped wrong, again ripping it out.
> Here's the part people miss. This is not an argument that prediction is hard, as if a sharper architect escapes it. **Even a *correct* guess leaves you worse off than not committing.** The value was never in the structure. The value was in the option to build the right structure once you knew. Building early spends that option. You exercise it before expiry and throw away the time value.
> **Waiting is not laziness. Waiting is holding an asset.**
>
> **The second bill: NPV**
> Money has time value. So do features. Structure you build now for a feature due in three months is cost pulled forward and revenue pushed back. You spent sooner and you shipped the paying thing later.
> **This bill comes due *even when your guess is right*.** Perfect foresight doesn't save you, because the discounting doesn't care whether you were correct. It cares that you sequenced the cost ahead of the return. The gap between the two is the loss, and you opened the gap on purpose.
>
> Two bills, then. Optionality says: don't commit before the information arrives. NPV says: don't pay before you have to. They're independent, and they almost always agree. **When they seem to disagree — "but it'll be so expensive to retrofit later!" — look closely, because the expensive retrofit is itself a prediction. You're back to the first bill.**
>
> **The part for the machines**
> Notice what is *not* on either bill: the cost of typing the code.
> This matters because the cost of typing just went to roughly zero. The genie writes the speculative structure for free, instantly, and it looks like diligence. So the thrift reading of YAGNI — "code is cheap now, why not build ahead?" — collapses. **If YAGNI were about saving effort, cheap generation would retire it.**
> It isn't, so it doesn't. Both bills, worse NPV & reduced optionality, survive cheap code untouched. […]
> **Free generation doesn't weaken YAGNI. It makes the violation cheaper to commit, which is worse.** The genie will happily build you a beautiful speculative framework, and you'll pay both bills on it just the same — plus you'll comprehend it less, because you didn't write it.
> YAGNI was never thrift. It was **two pieces of price theory wearing a programmer's slogan**. The slogan survives the genie because the price theory does.
> Build it when you need it. Not because the code is dear. **Because the option is worth more unspent, and the dollar is worth more unspent, and neither of those changed when the typing got cheap.**

### 6.3 Pragmatic Summit 2026 对谈实录（Beck + Fowler，Gergely Orosz 主持）

来源：[一手]，https://newsletter.pragmaticengineer.com/p/cycles-of-disruption-in-the-tech

**关于「激励错位」（Beck）：**

> "It turns out people don't want faster, cheaper, better! Inside some companies, the incentives are misaligned with actually achieving that. And so as geeks trying to achieve these improvements and saying: 'it's 40% better, 12% cheaper and less fattening,' people will punish you if that doesn't align with *their* incentives inside organizations.
> In the ideal organization, everybody would care about the same things, but that's just not the way it works! So, if AI is coming along to promise the same things, we're going to see the same reaction as before."

**关于「周期性想干掉程序员」（Beck）：**

> "Another interesting confluence of factors is the periodic, 'we can get rid of all the programmers, woo-hoo' trend, which started with Cobol in the 1970s. With Cobol, business analysts were supposedly going to be able to write the programs, and the logic was that we wouldn't need programmers anymore. **That comes back repeatedly.**
> Agile, however, was definitely *not* a 'let's get rid of programmers' trend. With Agile, we wanted programmers to be more *effective* in their jobs. And since we started it, and were programmers, we were able to push that agenda pretty effectively.
> However, today the 'get rid of programmers' trend is repeating. **As programmers, it behooves us to think about why they keep wanting to get rid of us.** Some of that's about us as programmers, and some of it not."

**关于「重新单干化」（Beck）—— 见 §2.12 a) 完整引文。**

**关于「AI 是放大器」（Beck）：**

> "AI is an amplifier. If you're young and learning quickly, AI can amplify your learning. **I personally think this is the golden age of the junior programmer.** I get people coming to me all the time saying things like 'my son started his second year in CS and wants to go into something more commercial like art history.' And I'd say, 'this is like if you're a carpenter and they just introduced the circular saw and you think, "oh, well, carpentry is over. Anybody can build a house now." Well, no! Now, you have more powerful tools. You have less of the crummy work to do.'"

**关于「中间层」（Beck）：**

> "My concern is that there's a 'middle' of people who got into programming as a way to make money. If we look back at the Dotcom crash, there was a 'mid pack' of such people who ended up going into real estate, more or less. But today, **I don't know where that 'middle' will go, and it's also much bigger now than 25 years ago.**"

### 6.4 DDD Europe 2020《Continued Learning: The Beauty of Maintenance》完整结构

来源：[一手·经现场笔记转述]，https://larseckart.com/2020/11/02/coupling-cohesion

**① 耦合与内聚的原始定义（1970s，Yourdon & Constantine《Structured Design》）**

> Coupling: Two elements, A and B, are coupled with respect to a specific change (Δ) if a change to A implies a necessary change to B.
> `COUPLED(A, B, Δ) ::= ΔA → ΔB`

**② 成本结构**

> The total cost of software is dominated by the **cost of change**, which often follows a **power-law distribution** (most changes are cheap, a few are extremely expensive).
> The most expensive changes are those that ripple through a highly coupled system.

**③ 内聚可做，解耦不可做**

> Cohesion: An element is cohesive to the degree that its sub-elements are coupled to each other (i.e., they change together).
> Creating cohesive elements is a **local and tractable** design activity. You can identify things that change together and group them.
> In contrast, trying to eliminate coupling across an entire system is an **N-squared, intractable** problem.

**④ 核心循环与口号**

> The primary loop in software development is: **Idea → Behavior Change → Structural Change.**
> An idea for a new feature (Behavior) requires a change to the code (Structure). The structure of the system, in turn, influences what ideas are possible.
> 🛠️ **"Make the change easy, then make the easy change."**

**⑤ 两类改动的性质差异（这是 Tidy First 的理论根）**

> - **Structural Changes**: Refactoring the code to make it easier to change. These are **reversible** and should not alter the software's behavior.
> - **Behavioral Changes**: Implementing the new feature. These are **irreversible** (once a user has a feature, you can't easily take it away).

**⑥ 期权化经济模型**

> **Technical Debt as Selling a Call Option**:
> When you write messy code to ship a feature faster, you are "selling a call option."
> You receive a "premium" (the immediate value of the feature).
> You accept an "obligation" (the future cost of cleaning up or changing that messy code).
>
> **Refactoring as Buying Back an Option**:
> When you "tidy" or refactor, you are paying a cost now (time) to buy back that option, reducing future liability and making subsequent changes cheaper.

### 6.5 Canon 3X 全文核心（2026-07-30）

来源：[一手]，https://newsletter.kentbeck.com/p/canon-3x-exploreexpandextract

**他给「Canon 系列」定的调子 —— 这一句很能说明他的表达策略变化：**

> I've started a series of Canon articles where I explain my ideas **as plainly & unambiguously as possible—no analogies, no persuasion, just the facts.** I started with Canon TDD. I expect to continue with Canon JUnit, Canon XP, and Canon Make-The-Change-Easy.

（注：这句话本身就构成一个立场变化 —— 一个以类比著称的人，公开宣布要写「没有类比」的版本。）

**核心结构：**

> A successful idea:
> 1. **_Explore_** Finds a new growth loop (it needs to me new or somebody else would already be operating it).
> 2. **_Expand_** Keeps it operating long enough for the idea to scale, avoiding all the potentially-fatal inhibiting loops along the way.
> 3. **_Extract_** Finishes growing as the ultimate inhibiting loop kicks in.
> 4. (Bonus) Uses the resources from the first curve to kick off the search for new curves with their own growth loops.
>
> The central thesis of 3X: Explore/Expand/Extract is that each of these phases, no matter how much they resemble each other, actually requires its own approach to: Finance / Team size / Project management / Personnel / Technology / Risk management / Implementation / Marketing / Sales
> **Applying the approach from one phase to an idea in another phase kills ideas.**

**三阶段对照表（原文）：**

| | Explore | Expand | Extract |
|---|---|---|---|
| **Risk** | Nobody cares. The idea dies for lack of fuel. | Can't scale. | Can't sustain. |
| **Goal** | Find the growth loop. You can't predict a new loop so you have to find it experimentally. | Avoid fatal obstacles while scaling furiously. | Growth with profit. |
| **Strategy** | Rapid experiments, maximum creativity, conceptual blending. | Intense focus on the next emerging growth bottleneck. | Safely optimize while growing. |
| **Tactics** | Tiny teams, no dependencies, quickly discard failures. | Throttle growth, discard non-essential features, good-enough-for-now scaling. | Small, safe experiments; roll out successes; optimize costs. |
| **Exit** | One experiment works *way* better than others. | Cause and effect of growth become predictable. | No further return on investment. |

**收尾这句承认了「说得到做不到」：**

> The tricky trick of 3X is managing projects in different phases in the matching styles. You have some Extract products that pay the bills & pay for a portfolio of Explore projects. When a project hits Expand, treat it as a priority even over profitable Extract activities. **(Simple to say and apparently nearly impossible to execute.)**

**他对「类比」的态度，在同一篇里自我矛盾了一下（保留）：**

> I promised that the Canon series would be no theory, just stuff. One tiny bit of theory is essential to the 3X: Explore/Expand/Extract story.
> […]
> we can see S curve as a **tug-of-war (oops, analogy, sorry)** between two feedback loops

—— 一边宣布「不用类比」，一边脱口而出类比并当场道歉。**这是一条很好的「即兴思维特征」证据。**

### 6.6 Is TDD Dead 第 4 集「测试成本」全场纪要（2014-05-27）

来源：[一手]，https://martinfowler.com/articles/is-tdd-dead/

> David starts by saying "**to talk about trade-offs, you really have to understand the drawbacks, because if there are no drawbacks there are no trade-offs.**"

> Kent replied "**it depends, and that's going to be the beginning to all of my answers to any question that's interesting**". With JUnit they were very strict about test-first and were very happy with how it turned out - so he doesn't think you always get over-testing when you use TDD. **Herb Derby came up with the notion of delta coverage** - what coverage does this test provide that's unique? Tests with zero delta coverage should be deleted unless they provide some kind of communication purpose. He said he'd often write a system-y test, write some code to implement it, refactor a bit, and end up throwing away the initial test. Many people freak out at throwing away tests, but you should if they don't buy you anything. **If the same thing is tested multiple ways, that's coupling, and coupling costs.**

> Kent declared that **the ratio of lines of test code to lines of production code was a bogus metric**. A formative experience for him was watching **Christopher Glaeser write a compiler**, he had 4 lines of test code for every line of compiler code - but this is because compilers have lots of coupling. A simpler system would have a much smaller ratio.

> …he just went through an episode where he threw away some production code, but **keeping the tests and reimplementing it. He really likes that approach as the tests tell him if the new code is working.** This leads to an interesting question: **would you rather throw away the code and keep the tests or vice-versa?** In different situations you'd answer that question differently.

> Kent said that **it's good to learn the discipline of test-first, it's like a 4WD-low gear for tricky parts of development.**

> He feels that **it's easy to explain the value of a new test working, but hard to state the value of cleaning the design.**

### 6.7 Is TDD Dead 第 1 集：TDD 的起源叙事（2014-05-09）

来源：[一手]，https://martinfowler.com/articles/is-tdd-dead/

> Kent said that **programmers deserve to feel confident that their code works, TDD is one (not the only) way to reach that.**

> Kent talked about a recent hackathon at Facebook, about **half of which he could use TDD and half wasn't suitable.** In the TDDable code he found he was in an enjoyable flow, but found the other part more tricky. **But in the non-TDD part he still used regression tests and short feedback loops. He has no problem mixing both styles, it's like playing both classical and jazz.** TDD reminds him of how he learned mathematics at school - always needing examples.

> Kent thinks it's about trade-offs: **is it worth making intermediate results testable?** He used the example of a compiler where **an intermediate parse-tree makes a good test point, and is also a better design.** But in response to David's question about mocks, he said **he rarely uses them, he's concerned that those that do often find refactoring difficult, while he finds testing makes refactoring easier.**

> Kent said … **TDD puts an evolutionary pressure on a design, people have different preferences for the grain-size of how much is covered by their tests.**

### 6.8 kentbeck.com 官网一手内容（2026）

来源：[一手]，https://kentbeck.com/

**注意这一句 —— 关于 "make it work/run" 的归属，他自己做了修正：**

> **Make it run, make it right, make it fast — Douglas Beck, my Pappy**

（对比：广为流传的版本是 "Make it work, make it right, make it fast" 并归给 Kent Beck 本人。**他在自己官网上把这句话归给了他的祖父 Douglas Beck。** 这是一个需要在本 Skill 中明确更正的归属错误。标记：**[一手]，归属已澄清**。）

**关于 AI 协作的四条原则（他自述）：**

> - **Constrain Context** — Only tell the AI what it needs to know for the next step
> - **Preserve Optionality** — Don't let the AI eat your "seed corn" through poor design choices
> - **Balance Expansion & Contraction** — Match feature development with refactoring cycles
> - **Maintain Human Judgment** — Review changes regularly and guide architectural decisions

**关于「魔法与挑战」：**

> One magical aspect of augmented coding is how the AI goes beyond stated requirements to implement what I would have wanted: "Oh, & here's a command line tool for this." **The challenge? Today's AI assistants lack taste. That giant function? The AI just added another 20 lines to it.**
> "**Don't eat the seed corn**" — My coding genie unfortunately doesn't know this farming wisdom.

**关于「为什么要在意软件设计」（经济学的直白表述）：**

> Software creates value two ways:
> - Today's future cash flows
> - Optionality for new cash flows
> **Software design creates optionality.**

**关于「设计价值难以陈述」的古老渊源：**

> Twenty five years into my career, in 2005, I was invited to sit on a panel with **Ed Yourdon & Larry Constantine**, authors of *Structured Design*, the book that introduced the terms "coupling" & "cohesion". Digging into the book in preparation, I realized that these pioneers had long ago laid out the equivalent of **Newton's Laws of Motion for software design.**

**关于「Thinkie」—— 他收集的 90 个思维技巧，其中一个与「拒绝」有关：**

> For example, whenever someone says, "We can't do X because of Y," I habitually transform that to, "**When Y is no longer true then we can do X.**" If making Y no longer true seems plausible, I suggest it. "We can't deploy more often because of all the bugs? So you're saying when we have fewer bugs we can deploy more often?"
> "How'd you think of that?" **It's just a trick.**

**关于「什么在变，什么不变」：**

> **Augmented coding deprecates formerly leveraged skills like language expertise while amplifying vision, strategy, task breakdown, and feedback loops.**

**他的演讲主题清单（2026，可视为他当前的自我定位）：**

> - The Shrinking Feedback Loop: LLMs and XP
> - You Still Have to Know What Done Looks Like
> - **Software Design Is Option Buying**
> - Beyond Vibes: What Augmented Coding Actually Requires
> - Thinkies: Mental Models for Technical Decisions
> - How Teams Get Stuck — and How They Don't
> - **Quality Is a Flow Problem**
> - The Forest & The Desert

### 6.9 Beck Design Rules 中 Beck 本人的回写（2015）

来源：[一手]，https://martinfowler.com/bliki/BeckDesignRules.html

**关于四规则的优先级冲突（Fowler 注 4）：**

> When reviewing this post, Kent said "**In the rare case they are in conflict (in tests are the only examples I can recall), empathy wins over some strictly technical metric.**"

**关于「设计是主观的」：**

> At the time there was a lot of "design is subjective", "design is a matter of taste" bullshit going around. I disagreed. **There are better and worse designs.** These criteria aren't perfect, but they serve to sort out some of the obvious crap and (importantly) **you can evaluate them right now.** The real criteria for quality of design, "minimizes cost (including the cost of delay) and maximizes benefit over the lifetime of the software," can only be evaluated post hoc, and even then any evaluation will be subject to a large bag full of cognitive biases. **The four rules are generally predictive.**
> -- Kent Beck

**四种表述的演化（Fowler 考证）：**

第 1 版 p.57：
> - Runs all the tests
> - Has no duplicated logic. Be wary of hidden duplication like parallel class hierarchies
> - States every intention important to the programmer
> - Has the fewest possible classes and methods

p.109（更早的版本，Fowler 认为被 Beck 后来改进了）：
> - Passes the tests
> - Reveals intention
> - No duplication
> - Fewest elements

### 6.10 Product Thinking Ep.38 逐字稿片段（2021-10-19）

来源：[一手]，https://www.produxlabs.com/product-thinking-blog/episode-38-kent-beck

**（开场的小幽默，很能说明他的即兴反应）**

> Melissa: "…agile manifesto, signatory, and prolific software developer…"
> Kent: "Thank you so much, Melissa. And, uh, and it's not just a signatory of the agile manifesto. **I am the first signatory of the agile manifesto because we listed our names alphabetically.**"
> Melissa: "So you're the John Hancock or is it who stands out of it?"
> Kent: "It's back at Al and, and that's all there is to it."

**关于「为什么会去 Facebook」的坦诚回答：**

> Melissa: "What made you want to go inside to Facebook?"
> Kent: "**Two kids in college for three years. For six years running.**"
> Melissa: "Yeah, that would do it."

**关于「当管理者」：**

> "…until recently when I'd become an actual manager for the first time since 1988, um, and, uh, uh, managing a project to, so I'm finding that interesting and **not something I want to continue doing**."

**关于 XP 里 PM 的角色（完整段落）：**

> "It's one of the, the, the lessons from extreme programming 20 years ago, or philosophies is that **the greatest value is created when you have somebody with a capability, talk to somebody with a need, and that conversation creates a value.** And, um, so in the extreme programming model, **a product manager is more like a cocktail party host**, making sure that the right introductions are made, making sure that the right conversations happen, that if somebody needs to join a conversation that happens as opposed to being, uh, uh, kind of, uh, a chess player and moving all the pieces around and figuring out where everything's gonna go perfectly. **You don't know how a party's going to go**, but you certainly know somebody with those kinds of sensitivities can see when a conversation is flagging and needs a boost."

**关于 Explore 阶段该不该做用户研究（他的反直觉立场）：**

> "There are big picture issues and next step kind of issues that are out of the scope of the thinking of most of the people on the team."
> （摘要版）"There are pros and cons to customer research. On one hand, it's useful to determine what features people like and dislike. On the other, there have been times where customer research indicated something wasn't advisable, yet when it was launched, it was successful. **Snapchat and the iPhone are prime examples.**"

**关于 Extract 阶段的「勇气」观（很重要的一处立场翻转）：**

> "original extreme program, you said **courage**. We have the value of courage. Fantastic. But **if you're making a billion dollars a year and somebody comes up to you with a bold, courageous idea — smack them.** You don't want that. You want to know that where are the edges? Where are the boundaries? So, uh, risk management is part of it."

→ **这是 XP 五大价值（Communication / Simplicity / Feedback / Courage / Respect）中「Courage」被他自己在 Extract 阶段否定的场合。** 属于重要的立场调整证据。

---

## 7. 来源清单

### 7.1 一手来源（Kent Beck 本人发言/署名）

| # | 来源 | 类型 | URL | 可信度 |
|---|---|---|---|---|
| P1 | Canon TDD（2023-12-11） | 本人署名长文 | https://newsletter.kentbeck.com/p/canon-tdd | [一手] 全文已抓取 |
| P2 | The Cost YAGNI Was Never About（2026-06-25） | 本人署名长文 | https://newsletter.kentbeck.com/p/the-cost-yagni-was-never-about | [一手] 全文已抓取 |
| P3 | Canon 3X: Explore/Expand/Extract（2026-07-30） | 本人署名长文 | https://newsletter.kentbeck.com/p/canon-3x-exploreexpandextract | [一手] 全文已抓取 |
| P4 | kentbeck.com 官网 | 本人署名 | https://kentbeck.com/ | [一手] 全文已抓取 |
| P5 | kentbeck.com/summaries（80 篇随笔索引） | 本人署名（摘要为官方生成） | https://kentbeck.com/summaries | [一手·摘要] |
| P6 | Pragmatic Engineer《TDD, AI agents and coding with Kent Beck》(2025-06-11) | 播客逐字稿 | https://newsletter.pragmaticengineer.com/p/tdd-ai-agents-and-coding-with-kent | [一手] |
| P7 | 同上，YouTube 全文逐字稿镜像（1818 段） | 逐字稿 | https://youtube-distilled.com/watch/aSXaxOdVtAQ | [一手·镜像] |
| P8 | Pragmatic Engineer《How Kent Beck shapes the software engineering industry》(2026-07-01) | 播客逐字稿 | https://newsletter.pragmaticengineer.com/p/how-kent-beck-shapes-the-software | [一手] |
| P9 | 同上，YouTube 全文逐字稿镜像（3549 段） | 逐字稿 | https://youtube-distilled.com/watch/ddHQQtjIOpw | [一手·镜像] |
| P10 | Pragmatic Summit 对谈（Beck + Fowler）(2026-04-07) | 现场对谈逐段引文 | https://newsletter.pragmaticengineer.com/p/cycles-of-disruption-in-the-tech | [一手] 免费部分 |
| P11 | Is TDD Dead? 全 5 集 | 录像 + Fowler 亲撰完整纪要 | https://martinfowler.com/articles/is-tdd-dead/ | [一手] |
| P12 | Product Thinking Ep.38（2021-10-19） | 官方完整逐字稿 | https://www.produxlabs.com/product-thinking-blog/episode-38-kent-beck | [一手] |
| P13 | Beck Design Rules（Beck 审阅回写） | 本人回写引文 | https://martinfowler.com/bliki/BeckDesignRules.html | [一手] |
| P14 | DDD Europe 2020《Continued Learning: The Beauty of Maintenance》 | 演讲（经现场笔记转述） | https://youtu.be/3gib0hKYjB0 / 笔记 https://larseckart.com/2020/11/02/coupling-cohesion | [一手·经转述] |
| P15 | Still Burning 播客（Kent 自己主持） | 官方节目页 | https://stillburningpodcast.com | [一手·官方] |
| P16 | BPlusTree3 `.claude/system_prompt_additions.md`（Kent 给 AI 写的规则） | 原始文件 | https://github.com/KentBeck/BPlusTree3/blob/main/.claude/system_prompt_additions.md | [一手] 经 roboco.io 转录 |
| P17 | Kent Beck 本人在 Substack 评论区的回复 | — | — | ⚠️ **仅见零星几条，未完整获取** |

### 7.2 二手来源（他人转述/整理）

| # | 来源 | 类型 | URL | 可信度 |
|---|---|---|---|---|
| S1 | pyweb.dev 对 Pragmatic Engineer 2025 逐字稿的归档（含 SHA256） | 第三方逐字稿归档 | https://pyweb.dev/wiki/raw/articles/kent-beck-gergely-orosz-tdd-ai-agents-2025 | [二手·高可信] 有原文哈希 |
| S2 | LarsEckart，DDD Europe 2020 现场笔记 | 会议笔记 | https://larseckart.com/2020/11/02/coupling-cohesion | [二手] |
| S3 | Martin Fowler《Beck Design Rules》正文与考证 | 第三方整理 | https://martinfowler.com/bliki/BeckDesignRules.html | [二手·高可信] 经 Beck 审阅 |
| S4 | roboco.io《The Tidy First Methodology》 | 第三方解读 | https://roboco.io/en/posts/tidy-first-methodology | [二手] |
| S5 | SE Radio 615 节目页（Tidy First?，2024-05-10） | 节目元数据 | https://se-radio.net/2024/05/se-radio-615-kent-beck-on-tidy-first | [二手] 逐字稿未获取 |
| S6 | SE Radio 167 节目页（JUnit 历史，2010-09-26） | 节目元数据 | https://se-radio.net/2010/09/episode-167-the-history-of-junit-and-the-future-of-testing-with-kent-beck | [二手] 逐字稿未获取 |
| S7 | Hanselminutes #663（TCR，2018-12-21） | 节目页 | https://hanselminutes.com/663/test-commit-revert-with-kent-beck | [二手] 逐字稿未获取 |
| S8 | gotopia.tech / gotocph.com GOTO 2024 场次页 | 会议场次页 | https://gotopia.tech/sessions/3432/tidy-first-a-daily-exercise-in-empirical-design | [二手] |
| S9 | GOTO Podcast《From XP to TCR & Limbo》 | 节目页 | https://goto.buzzsprout.com/1714721/episodes/17208066-from-xp-to-tcr-limbo-kent-beck-daniel-terhorst-north | [二手] |
| S10 | GOTO Podcast《Tech Truth: Agile Evolution...》 | 节目页 | https://goto.buzzsprout.com/1714721/episodes/19254588-tech-truth-agile-evolution-the-future-of-sw-engineering-martin-fowler-kent-beck | [二手] |
| S11 | Software Engineering Daily《Facebook Engineering Process with Kent Beck》 | 节目页 | https://softwareengineeringdaily.com/2019/08/28/facebook-engineering-process-with-kent-beck/ | [二手] 抓取失败 |
| S12 | HN 讨论：RIP TDD | 社区讨论 | https://news.ycombinator.com/item?id=7667988 | [二手·低] 仅作旁证 |
| S13 | HN 讨论：Is TDD Dead 预告 | 社区讨论 | https://news.ycombinator.com/item?id=7706361 | [二手·低] 仅作旁证 |
| S14 | InfoQ《Kent Beck on Agile Adoption & Values》(2006) | 书面长访谈 | https://www.infoq.com/articles/kent-beck-interview-2006/ | ⚠️ **未抓取（HTTP 405），最大缺口** |
| S15 | InfoQ《Twenty Years of Patterns' Impact》(2014) | 书面长访谈 | https://www.infoq.com/articles/twenty-years-of-patterns-impact | ⚠️ **未抓取（HTTP 405）** |
| S16 | Test & Code #212（全文朗读 Canon TDD） | 播客 | https://pythontest.com/testandcode/episodes/212-canon-tdd-by-kent-beck/ | [二手] 内容即 P1 |
| S17 | Test & Code #23（Lessons about testing and TDD） | 播客 | https://pythontest.com/testandcode/episodes/23-lessons-about-testing-and-tdd-from-kent-beck | [二手] 逐字稿未获取 |
| S18 | 官网注明「Make it run / right / fast」出自 Douglas Beck（Kent 的 Pappy） | 本人澄清 | https://kentbeck.com/ | [一手] 归属更正 |

### 7.3 检索过程中遇到但**主动弃用**的来源（黑名单 / 污染）

- `baike.baidu.com/item/Kent/10872184`（百度百科「健牌香烟」）—— 黑名单 + 完全无关
- `zhidao.baidu.com/question/724119052028503925.html` —— 黑名单
- `cnxiangyan.com` / `yanyue.cn` —— 香烟商业站，bing 引擎误召回
- 所有知乎 / 微信公众号内容 —— 未出现在结果中，亦不采用

---

## 8. 给下游 Skill 生成的关键结论摘要

> 给 Agent 3（思维框架提炼）的压缩输入。每一条都可以回溯到上文。

1. **他的第一反应几乎总是「拒绝二值化」**：`"It depends, and that's going to be the beginning to all of my answers to any question that's interesting."`
2. **他的默认分析框架是「换约束」而非「给答案」**：频率 / 保真度 / 开销 / 寿命（Is TDD Dead 第 3 集）。
3. **他对「量」的判据永远是置信度，不是覆盖率**：`"you just write enough to be confident"`、`"delta coverage"`、`"lines of test code to production code was a bogus metric"`。
4. **「小步」在他那里不是风格，是复杂度论**：`Coupling 的消除是 N-squared intractable；Cohesion 的建设是 local and tractable`。
5. **结构改动与行为改动的分离，正当性来自「可逆性」**：结构可逆、行为不可逆，所以必须分 commit、分 PR、分评审标准。
6. **对过度工程的批评，他给的是经济论证而非品味论证**：YAGNI = 期权价值（optionality）+ 净现值（NPV）两张账单，**且这两张账单在代码变便宜之后依然成立**。
7. **「make it work → right → fast」的真实归属是他的祖父 Douglas Beck**，原话为 `"Make it run, make it right, make it fast"`。他在 Canon TDD 里把这条用在红绿重构内部：`"Make it run, *then* make it right."`
8. **红绿重构的节奏被绑定在三个可观测的刻度上**：测试套件 < 1 秒（他自己的是 300ms）、一次红到绿是一个「session」、commit 门槛是「全绿 + 无警告 + 一个逻辑单元」。
9. **他对 AI 的态度是「放大器 + 大规模实验期」**，同时明确拒绝「vibe coding」这个标签：`"I care what the code looks like"`。
10. **他最常被引用的自嘲式让步**，是他在被追问时降低对抗感的机制：`"the poorest drug dealer on the planet"`、`"I'm stuck on this on a side project right now"`、`"Nope. My bad."`
11. **他公开认错的清单（有据可查）**：① 把东西叫 "agile" 是个 error；② TDD 定义没讲清楚（"My bad"）；③ XP 有其不平等问题需要处理；④ Extract 阶段「勇气」是要被拍死的；⑤ 承认自己是 tree shaker 而非 jelly maker，会在峰值时离场。
12. **他拒绝回答的方式**是「把球踢回去 + 要求证据」：`"If someone has a good example, they should write it up."`、`"If you're going to critique something, critique the actual thing."`、`"nobody knows anything."`
13. **一处必须提醒下游的引用陷阱**：`"Make it work, make it right, make it fast"` 常被直接归给 Kent Beck，但他在官网上明确归功于祖父 Douglas Beck。**不要写「Kent Beck 说 make it work...」**，应写「Kent Beck 常引用他祖父 Douglas Beck 的话 make it run, make it right, make it fast」。
14. **他对「TDD 被玩坏」的双重表态可作为「认领批评 + 拒绝结论」的模板**：`"TDD acquiring some barnacles and needs some scraping"`（认领）＋ `"TDD isn't dead, but is glad David set fire to it so it could come out like a phoenix"`（拒绝结论）。
15. **他给「测试写多少」的底线是一句可以被 Skill 直接用的短句**：`"I get paid for code that works, not for tests."`
16. **他把「生产事故」当成测试清单的补全机制**：`"The on-call is the feedback loop that teaches you what tests you didn't write."`
17. **他对「设计洞察」的获取方式不属于工作流，属于生活**：`"Getting these insights isn't about your workflow, it's about things like knowing when to work and when to rest, gathering influences from other places, collaborating with other people."` —— 这是反驳「TDD 决定设计好坏」这类指控时他的核心论点。
18. **他对自己也承认「做不到」**：`"I'm stuck on this on a side project right now."`（承认知道该重构但不敢面对下一个测试）—— 这是 Skill 里可以照抄的「降对抗感」机制。

---

*文件生成时间：本次调研会话*
*检索轮次：14 轮（含多引擎）；页面抓取：30+ 次*
*未获取逐字稿的来源已在本文件 §0.3、§1、§7.2 逐项标注*
