# Kent Beck 决策与行动记录调研

> 「女娲·Skill造人术」流程 Agent 5（决策维度）
> 调研目标：Kent Beck **实际做了什么、怎么选的、事后怎么反思**，重点看**真实行为 vs 嘴上提倡**的一致性/不一致性。
> 撰写：萧潇（下婢） ｜ 语域：调研简报 ｜ 声明：本文只做证据整理与矛盾并列，不下结论。

---

## 0. 调研说明

### 0.1 环境限制（必须前置说明，影响可信度评估）

本次调研的检索环境是**受限环境**，多处常见信源不可达。为便于复核，逐项交代：

| 信源 | 状态 | 处理方式 |
|---|---|---|
| `tidyfirst.substack.com`（默认 Substack 域名） | DNS 解析到非公网 IP，`web_fetch` 拒绝 | 改用其**自定义域名** `newsletter.kentbeck.com`，**可读，取得一手原文** |
| `en.wikipedia.org` | DNS 解析到非公网 IP（31.13.88.26，明显被投毒） | 改用镜像 `everything.explained.today/Kent_Beck`（含 GFDL 授权的 Wikipedia 全文） |
| Bing（默认引擎，zh-CN market） | **污染**：任何含 "Kent Beck" 的查询都返回「健牌香烟」结果 | 已弃用。全部改用 `keenable` / `deepseek-official` / `anysearch` |
| DuckDuckGo / DDG-Lite / SearXNG | 连接失败（多实例全 aborted） | 不可用 |
| Exa / Tavily / Firecrawl | HTTP 429 限额 | 不可用 |
| `web.archive.org` | 超时 | 不可用 |
| InfoQ / O'Reilly Learning | 返回 Human Verification / 403 | 引语仅能通过 search snippet 与第三方转述取得 |
| `stackoverflow.com` | 403 Cloudflare | 该条一手帖（Kent 谈单元测试）未取得 |

**结论：本文件的「一手」材料主要来自 `kentbeck.com`、`newsletter.kentbeck.com`、`martinfowler.com`、`newsletter.pragmaticengineer.com` 四处，可信度高。其余为二手转述，已逐条标注。**

### 0.2 信源分级约定

- **[一手]**：Kent Beck 本人撰写/口述的原文，或与他直接共事的当事人（Martin Fowler、Gergely Orosz 转录的访谈）的一手记录
- **[二手]**：第三方书评、博客转述、百科条目
- **[推断]**：萧潇根据多条证据推出的解释，**不是他的原话**
- **[冲突]**：不同信源互相矛盾，**保留不调和**
- **未核实**：搜不到，不编

### 0.3 时间线坐标（用于对齐下文）

```
1961        出生
1979–1987   俄勒冈大学，B.S. + M.S.（计算机与信息科学）
~1981       大学软件设计课，读 Yourdon & Constantine《Structured Design》
1987        加入 Apple（因 Smalltalk 而去），后被解雇
late 1980s  Tektronix，与 Ward Cunningham 合作，HotDraw、CRC 卡、设计模式
1989        与 Cunningham 发表 OOPSLA'89 论文；"Simple Smalltalk Testing: With Patterns"
1993        Martin Fowler 开始以顾问身份参与 Chrysler 项目
1994/1995   SUnit（年份有冲突，见 §1）
1995-10     Austin OOPSLA，向 Ward Cunningham 演示 TDD
1995        C3 项目开始正式开发（Smalltalk），未能达到稳定状态
1996        C3 在 Kent Beck 主导下重启；XP 实践首次全部一起使用
1997        C3 上线，支付约一万人
1999        与 Fowler 等合著《Refactoring》；C3 停止新开发
1999        《Extreme Programming Explained》第 1 版
2000        《Planning Extreme Programming》（与 Fowler）
2001        Snowbird，Agile Manifesto（17 位签署人之一，字母序第一位）
2001-09-10  手上还有 8 个月的顶级费率顾问合约
2001-09-11  9/11，全部取消 → 抑郁、burnout、"lost decade"，多年写不了程序
2002        《Test-Driven Development by Example》
2003        《Contributing to Eclipse》（与 Erich Gamma）
2004        《Extreme Programming Explained》第 2 版（与 Cynthia Andres），完全重写
2005        受邀参加《Structured Design》出版 30 年纪念 panel（与 Yourdon、Constantine 同台）
2007        《Implementation Patterns》
2009        首次提出 "Responsive Design"（Tidy First? 的前身），未成
2011        加入 Facebook（50 岁）
2011        首次 performance review：6 个目标完成 3 个，得到 "exceeds expectations"
2018        离开 Facebook（七年）
2019        加入 Gusto 任 Software Fellow / Coach
2019        开始写 Tidy First 草稿（Gusto 入职前 2 周空档，写了 10,000 字）
2021-01     开始 Substack《Software Design: Tidy First?》（"Welcome to 'Tidy First?'"）
2023-03     与 O'Reilly 签约
2023-10/11  《Tidy First?》出版（99 页）
2024-05     《The Good News Factory》执行简报
2024/2025   Chief Scientist at Mechanical Orchard（来源：SE Radio 615 简介）
2025-06     Pragmatic Engineer 播客：52 年编程后被 AI 重新点燃
2026-04-16  公开 Parkinson's 诊断
2026-07-01  Pragmatic Engineer 播客："I've never told this much of the story all in one place before."
2026-07-30  开始 Canon 系列
2026-08     在写第三本书《Tidy Together》
```

---

## 1. 决策清单

> 格式：**时间 ｜ 场景 ｜ 他的选择 ｜ 当时的理由 ｜ 事后反思 ｜ 来源**

### D1 · SUnit 的诞生（1994 或 1995，[冲突]）

- **时间**：他本人说"不能早于 1994"；百科条目说 1989 年
- **场景**：为咨询客户写一个小型测试框架
- **选择**：把童年读到的"纸带对纸带"技巧（先手工写出期望的输出纸带，再写程序）映射到 SUnit 上 → **先写测试，再写代码**
- **当时的理由**：他自己说是"随机想起来"（randomly remembered），**不是推导出来的**。他当时**笑了出来**，因为这个想法"太蠢了——课和方法都还不存在，为什么要写一个注定失败的测试？"
- **结果**：写了之后"焦虑消失了"
- **事后反思**：**未核实**他是否明确说过"SUnit 的动机就是治焦虑"，但他在 2026 年播客中把 TDD 整体定位为"为焦虑的心智设计的"
- **来源**：
  - [一手] Pragmatic Engineer 2026-07-01（"Kent recalls he laughed out loud at this"）https://newsletter.pragmaticengineer.com/cp/204687762
  - [一手] Canon TDD（2023-12-11，年份自述）https://newsletter.kentbeck.com/p/canon-tdd
  - [二手] everything.explained.today（1989 年说）https://everything.explained.today/Kent_Beck/

**[冲突] 记录在案**：Kent 本人在 2023 年《Canon TDD》写 "I wrote SUnit in 1994 is for a consulting client, so it can't be before then"，而 Wikipedia 系条目（含 xUnit 系谱）记为 1989 年。**两个数字不动它**，留给主子判断。一种[推断]是：1989 年是他**发表** SUnit 模式论文（"Simple Smalltalk Testing: With Patterns"）的年份，1994 年是**为特定客户写代码**的年份。

### D2 · TDD 的"重新发现"与演示决策（1995-10）

- **场景**：Austin OOPSLA 会议
- **选择**：**向 Ward Cunningham 演示** TDD
- **当时的理由**：无明确记录；[推断] 他一贯用"做给人看"而不是"写给人看"的方式来推一个新做法
- **事后反思（他本人的两段自述）**：
  - "Interestingly I can't find any published references to it from that era."（那个年代找不到任何已发表的引用）—— 承认 TDD 有很长一段**只存在于口头/演示中**
  - "I stalled writing the TDD By Example book long enough that I was worried that I would be scooped. It all worked out."（我把 TDD 那本书拖得够久，久到担心会被人抢先。结果没问题。）
- **来源**：[一手] https://newsletter.kentbeck.com/p/canon-tdd

> **决策启发**：这两个句子里有他一条真实行为模式——**发现一个做法 → 演示给一个具体的人 → 拖到快被抢才写书**。1962 字的信息价值在于：他对"发表"这件事的紧迫感**明显低于**对"做出来"的紧迫感。

### D3 · 他如何定位 TDD 与 JUnit 的关系（2002 / 2014）

- **场景**：TDD 争论中被举 JUnit 为成功案例
- **他的选择**：**主动给这个案例降权**
- **原话**：[二手转述，见 §7 说明] "JUnit is an example of a project that used TDD strictly and turned out well. But it isn't a good example for this discussion because it has clear interfaces that make a sweet spot for TDD."
- **意义**：当有利于自己的证据出现在眼前，他不吃。**这是"言行一致"方向的正面证据**（提倡"it depends"就真的说 it depends）
- **来源**：[二手/待核] 父智能体转述，原始 URL **未核实**。JUnit 系谱本身可查到：[二手] https://martinfowler.com/bliki/Xunit.html（Fowler："The origins of these frameworks actually started in Smalltalk. Kent Beck was a big fan of automated testing..."）

### D4 · C3 重启：扔掉一个代码库（1996）

- **场景**：Chrysler Comprehensive Compensation（C3）。项目 1995 年用 Smalltalk 开始正式开发，"was not able to reach a stable state"
- **选项**：(a) 在现有代码库上继续修 (b) 推倒重来
- **他的选择**：**(b) 推倒重来**，并作为负责人用新方法论重启
- **当时的理由（他本人原话，转述）**："My goal laying out the project style was to take everything I knew to be valuable about software engineering and turn the dials to 10."（把我知道有价值的软件工程做法，所有旋钮都拧到 10）
- **结果**：
  - 1997 上线，支付约一万人
  - 1999 停止新开发
  - 更晚：现网系统**被回退到 COBOL**
- **Martin Fowler 的复盘（一手，且他明确拒绝过度解读）**：
  - "It was this rebooted project that first pulled together all the practices that became known as Extreme Programming"
  - "C3's cancellation, however, also proves that XP is no guarantee of success."
  - "Many people have tried to analyze C3's success and cancellation. **I haven't seen any analysis based on much knowledge of the facts.** I've always felt that a full description really should come from people on the team full time, and so haven't written anything myself."
  - 他直接点名："the entry in Wikipedia is misleading and incomplete, much of its comments seem to be based on a paper from a determined XP critic whose sources are unclear."
- **来源**：[一手] https://martinfowler.com/bliki/C3.html ；[二手] https://tcagley.wordpress.com/2016/08/13/...（转述 Beck 的 "turn the dials to 10"）

> **[冲突] 必须保留**：C3 既被当成 XP 的诞生证明（成功上线、支付一万人），又被当成 XP 不保证成功的证明（新开发停止、系统最终回退 COBOL）。**两个事实同时成立，不调和。**
> 另有一处**口径冲突**：Fowler 在《Is TDD Dead?》第 1 集说"when we first worked together at C3, **we didn't start using TDD**，但确保每个 programming episode 同时交付代码和测试"；而 Pragmatic Engineer 2026 的转述是 Beck "threw away a codebase… used his own ideas for testing"。**"C3 是否严格用 TDD" 两说不一。**

### D5 · 给方法论命名："Extreme Programming"（1996–1998）

- **场景**：新方法论需要一个名字
- **选项**：(a) 一个平实、描述性的名字 (b) 一个挑衅性的名字
- **他的选择**：(b) **"Extreme Programming"**
- **当时的理由（2025 年他本人原话，全段引）**：

  > "I wanted to pick a word that **Grady Booch would never say that he was doing**. Because that was the competition! I didn't have a marketing budget. I didn't have any money. I didn't have that kind of notoriety [that Grady Booch already had]. I didn't have that corporate backing. So if I was going to make any kind of impact, I had to be a little bit outrageous. Extreme sports were coming up back then. And I picked that metaphor. It's actually a good metaphor because **extreme athletes are the best prepared, or they're dead**. People so desperately wanted something kind of like that then it just exploded from there."

- **事后反思**：他明确承认这是**营销决策**（"I had to be a little bit outrageous"），同时坚持这个隐喻在工程上成立（"best prepared, or they're dead"）
- **来源**：[一手] https://newsletter.pragmaticengineer.com/p/tdd-ai-agents-and-coding-with-kent

> **关键对照物**：他对 "Extreme" 这个词是**主动选**的、**承认是营销**；对 "agile" 这个词是**当场反对、至今反对**（见 D6）。同一个人的两次命名决策，方向相反。

### D6 · Agile Manifesto：他反对 "agile" 这个词（2001）

- **场景**：Snowbird 峰会
- **现场情况（他本人 2026 年回忆）**："This summit proceeded badly as everyone pushed contradictory ideas. During a break, Martin Fowler and Jim Highsmith stayed behind, and when the others returned, they found the values written on the whiteboard."
- **他的实际贡献**：只有一个词——"**daily**"。对应宣言条目："Business people and developers must work together daily throughout the project."
- **他对 "agile" 这个词的选择**：**当场反对，至今反对**
- **理由（原始）**："since nobody claims they prefer 'rigid' development, and everyone says they're 'agile', even when they're not. He would've preferred a less spacious term, like with 'extreme programming': after all, it's hard to call yourself an 'extreme programmer' without actually following that methodology."
- **事后反思**：这是**公开承认自己是签名人之一、却反对宣言招牌词**。且他把这当成一个**关于"词太宽"的教训**，不只是口味问题
- **来源**：[一手] https://newsletter.pragmaticengineer.com/cp/204687762

### D7 · 9/11 之后的十年：不写程序（2001–2011 前后）

- **场景**：2001-09-10 他手上还有 **8 个月的顶级费率顾问合约**，正在俄勒冈乡下盖房子
- **事件**：9/11 次日，**全部取消**，"just as big bills fell due"
- **结果（他本人措辞）**："He burned out into depression and was left **unable to program for years**, in what was a **'lost decade'**."
- **这是决策记录里的**：不是他选了什么，而是**他在长达十年里没有做出"回来"这个决策**。他自己把它命名为 "lost decade"
- **来源**：[一手] https://newsletter.pragmaticengineer.com/cp/204687762

> **这条对 Agent 5 特别重要**：他提倡"小步、持续、勇气"。而他的真实履历里有一段**十年的空档**。这不是道德问题，是**理解他"勇气"这个词来源的必要背景**——他的勇气论述是在知道"崩掉是什么样"之后写的。

### D8 · 加入 Facebook 的决策，与"忘记一切、从头学起"（2011）

- **场景**：50 岁，加入 Facebook
- **他进门前以为会发生什么**：他写过 TDD 的书。他**签了名去 hackathon 讲 TDD 课**
- **实际发生的事（他本人回忆）**："The classes either side of his in the schedule both filled up, but **the TDD class got zero signups, not even a pity one.**"
- **他发现的环境**：Facebook **几乎不做任何形式的单元测试**，同时跑着一个巨大、稳定、快速增长的站点
- **他的选择**：**"He made the decision to forget everything he knew and to relearn software engineering as it was at Facebook."**
- **结果**：待了**七年**（2011–2018）
- **事后反思**：他没有把这个选择讲成"我对了/他们错了"，而是讲成**一次主动的知识清零**
- **来源**：[一手] https://newsletter.pragmaticengineer.com/cp/204687762 ；[一手] https://newsletter.pragmaticengineer.com/p/tdd-ai-agents-and-coding-with-kent

> **言行一致性分析**：这**高度一致**于他提倡的"Adapt"（第二版 XP 的核心范式是 "stay aware, adapt, change"，Erich Gamma 作序时点出 Beck 自己在第二版上践行了这个范式）。**不一致的地方在于**：他在 Facebook 待了七年，而他对 TDD 的立场在此期间从"教条"变为"情境化"（见 D11、D13）。

### D9 · Facebook 的三条制衡机制：他选择学而不是批评（2011–2018）

- **场景**：一个不做单元测试的公司，为什么没崩
- **他识别出的三条机制**：
  1. 开发者对代码的责任感极强
  2. **"Nothing at Facebook is somebody else's problem"** —— 看到 bug 就修，不管是谁的 commit 造成的
  3. 大量 feature flags + 灰度发布（先推到新西兰这类小市场）
- **他额外提出的第六条（关于 on-call）**：[二手转述]"**The on-call is the feedback loop that teaches you what tests you didn't write.**"
- **来源**：[一手] https://newsletter.pragmaticengineer.com/p/tdd-ai-agents-and-coding-with-kent

### D10 · 提出 3X：Explore / Expand / Extract（约 2011 起，成形于 Facebook 时期）

- **场景**：他试图解释 Facebook 早年怎么**同时**做到"可靠运行 + 快速扩张 + 持续创新"
- **他的选择**：把产品开发分成三个**游戏规则完全不同**的阶段，并主张**阶段之间的管理学要换**
- **原始定义（他 2026 年 Canon 版，全表）**：

  | | Explore | Expand | Extract |
  |---|---|---|---|
  | 风险 | Nobody cares（没人理，死于没燃料） | Can't scale（扩不动） | Can't sustain（维持不住） |
  | 目标 | 找到增长回路 | 在扩张中避开致命障碍 | 有利润地增长 |
  | 策略 | 快速实验、最大创造力、概念混合 | 紧盯下一个涌现的增长瓶颈 | 一边安全优化，一边增长 |
  | 战术 | 极小团队、零依赖、快速丢弃失败 | 节流增长、砍非必需功能、够用就行的扩容 | 小而安全的实验、成功就推开、优化成本 |
  | 退出条件 | 某个实验明显好于其他 | 增长的因果变得可预测 | 再投入没有回报 |

- **他的核心论断**："**Applying the approach from one phase to an idea in another phase kills ideas.**"
- **他自己承认这条最难**："(Simple to say and apparently nearly impossible to execute.)"
- **来源**：[一手] https://newsletter.kentbeck.com/p/canon-3x-exploreexpandextract ；[一手] https://newsletter.kentbeck.com/p/dont-accomplish-everything

### D11 · P50 目标的由来：一次 performance review 改变了他的管理学（2011）

- **场景**：他在 Facebook 的第一次 performance review，直属经理 David Recordon
- **他进去时的预期（他本人原话）**："I walked in with dread. I had 6 goals for my first 6 months. No matter how hard I struggled, I just couldn't get 3 of them done. I figured I was done for—Facebook at that stage was notoriously impatient with under-performers."
- **他说的开场白**："I'm sorry but I only accomplished 3 out of my 6 goals for the semester."
- **经理的回答**："**Excellent! You're right on track.**"
- **结果**：拿到 "exceeds expectations"
- **他的事后推导（原文）**：

  > "If I had accomplished all of my goals for the semester, that would have meant either:
  > - I hadn't learned anything, & learned nothing at a time when learning was hugely valuable.
  > - I had sandbagged my goals, which limits the potential value I could have created.
  >
  > And so the policy was that you were supposed to achieve roughly half of your goals. This policy creates incentive to learn & discover while also creating incentive not to coast."

- **他因此得出的运营原则**：
  - 探索阶段的项目**应该尽量少依赖**，因为"small but extremely sensitive to delay"
  - 抽取阶段**可以且应该有依赖**，因为追求规模经济
  - "P50 goals don't work when extracting—too many disappointing surprises."
- **来源**：[一手] https://newsletter.kentbeck.com/p/dont-accomplish-everything

> **这是全部材料里最干净的"一个真实经历 → 一条决策规则"链条。** 对 Agent 5 的「决策启发式」章节价值最高。

### D12 · 《Extreme Programming Explained》第 2 版的改写决策（2004）

- **场景**：第 1 版（1999）成为 XP 的权威文本，五年过去
- **选项**：(a) 小幅修订 (b) 完全重写
- **他的选择**：**(b) 完全重写**，并与 Cynthia Andres 合著
- **他自己给出的理由**：把 XP 范式（"stay aware, adapt, change"）用在自己身上 —— 这一点由 **Erich Gamma 两版序言对比**点出
- **第 2 版的具体改动（据 Bill Wake 书评 [二手]）**：
  - 新增 **Respect** 作为价值观 [存疑：第 1 版是否已有五价值观，需核]
  - 实践改为**主实践 / 从实践**的分层
  - **删除"隐喻"（metaphor）**这一独立实践
  - **"重构"不再作为独立实践**
  - "40 小时工作周" → 改为"**精力充沛的工作**"（energized work）
  - 语气从宣言式转为柔和："改变你自己，再把成果提供给他人"
  - 关键句："**There's not a binary answer to 'Am I doing XP?' The goal is successful and satisfying relationships and projects, not membership in the XP club.**"
  - 关键句（[二手·待核]）："**All methodology is based on fear.**"
- **定义的变化（据 tcagley 逐章重读）**：
  - 第 1 版："XP is a lightweight methodology for **small-to-medium-sized teams** developing software in the face of vague or rapidly changing requirements."
  - 第 2 版改为四条属性：XP 是轻量的 / 是一种方法论 / **可适用于任何规模的团队** / 适应模糊或快速变化的需求
  - 即：**从"限制适用范围"到"取消规模上限"**
- **他新增的开篇三句（第 2 版 Preface）**：
  1. No matter the circumstances you can always improve.
  2. You can always start improving with yourself.
  3. You can always start improving today.
- **来源**：[二手] https://xp123.com/review-extreme-programming-explained-2e/（Bill Wake，父智能体核实）；[二手] https://tcagley.wordpress.com/2016/06/18/re-read-saturday-extreme-programming-explained-embrace-change-second-edition-week-1/ ；[二手] https://tcagley.wordpress.com/2016/08/13/extreme-programming-explained-second-edition-re-read-week-9-chapters-16-17/ ；[一手·片段] https://www.kentbeck.com/

> **[冲突/存疑] 保留**："Respect 是第 2 版新增" 这条**未找到 Beck 本人的原文佐证**，仅见于书评转述。而第 1 版普遍被认为已有 Communication / Simplicity / Feedback / Courage / **Respect** 五条。**不调和，标 [存疑]。**

### D13 · 2014 年 TDD 争论：他选择不反击

- **场景**：DHH（David Heinemeier Hansson）公开质疑 TDD，引发 "Is TDD Dead?" 系列对谈（参与者：DHH、Martin Fowler、Kent Beck）
- **DHH 手上拿的武器**：**Beck 自己的话** —— DHH 在演讲中引用了 Kent："I get paid for code that works, not for tests, so my philosophy is to test as little as possible to reach a given level of confidence."
- **他的选择**：**不反击、不站队、把对谈定义成"理解权衡"**
- **他本人对这场对谈的目的定义（原话）**："We're not in this hangout to agree - my personal goal is just to understand the set of trade-offs by articulating them to people who are prepared to tear my ideas apart in a constructive way."
- **他的收尾立场**："**TDD isn't dead, but is glad David set fire to it so it could come out like a phoenix.**"
- **他另写了 Facebook 笔记《RIP TDD》**（原文未取得）
- **来源**：[二手] 父智能体核实；[二手·片段] HN 讨论 https://news.ycombinator.com/item?id=7669110（DHH 引用 Kent 原话）；[二手] https://pythontest.com/agile/is-tdd-dead （Brian Okken 的回应文，抓取到但正文被截断，仅取得标题与导语）

> **一致性判断**：**提倡勇气，但公开表态谨慎** —— 这条张力在这件事上是**真实存在的**。但需要区分：他不是"不敢说"，而是**选择把对话变成"拆自己想法"的场合**。他 2023 年还在写 "I try to be positive & constructive as a habit."（Canon TDD 题记）—— 他**自己承认**这是一种习惯性选择，不是没观点（他对 Ousterhout 的书就不客气，见 D16）。

### D14 · 离开 Meta 与转向独立写作（2018–2021）

- **场景**：Facebook 七年结束
- **他的自述语**："Given my newly independent status after seven years at Facebook..."（《My Personal Mission》Facebook 笔记）
- **接着的选项**：(a) 再进一家大公司 (b) 顾问/教练 (c) 独立写作
- **他的选择**：先 (b) 后 (c)
- **具体动作**：2019 年加入 **Gusto** 任 Software Fellow and Coach，"coaches engineering teams as they build out payroll systems for small businesses"
- **来源**：[二手] https://everything.explained.today/Kent_Beck/（引 Business Insider 2019-09-04）

> **注意**：Business Insider 那篇原文 `web_fetch` 失败（TypeError: fetch failed），**其具体内容未核实**，仅通过 Wikipedia 镜像的引注间接使用。

### D15 · 为什么开始写 Substack，以及"被迫收钱"的决策（2021）

这是他**最反直觉**的一个决策，值得整段引用。

- **场景**：2019 年他写了 10,000 字的书稿，然后**卡死**（"I stalled at 10K. I tried to write. I tried to present. The wheels spun but the car didn't move."）
- **他诊断出的问题**：
  - 一部分是时间（精力给了 Gusto）
  - 一部分是"**我古老的敌人：Scope**"（"I was trying to address too much of design all at once."）
  - 关键自我诊断："**I'm not a slow writer. I'm a frequent non-writer. That's what takes all the time, the time I'm not writing.**"（我不是写得慢，我是**经常不写**）
- **他的应对**："**Physician, heal thyself!**" —— 我是研究激励机制的人，那就给自己装一个激励机制
- **他先后试了两层激励**：
  1. 2021-01 开免费 Substack，理由是"creating community, getting feedback, & generating energy"
  2. 结果："I did indeed write, but in splotches—here, there, all over. The words reflected my thoughts but **they weren't going anywhere**."（又卡了一年）
  3. 于是上**付费订阅**
- **他对付费订阅的真实态度（全段引，这是矛盾的核心）**：

  > "And so I took the incentives plunge—paid subscribers. **I didn't want paid subscribers. I didn't want to feel beholden to anyone.** If someone was giving me $7 a month, I'd feel an obligation to produce. I'd feel terrible if someone cancelled.
  >
  > **Turns out social obligation is an excellent incentive.** If I go more than a week without publishing, churn rises. And so I write. Last month I had enough of a draft that I signed with O'Reilly Media."

- **他给读者的三档权衡（2021 原文）**：
  - 现在花钱 → 更早拿到信息
  - 现在花时间 → 拿到的信息少一点，但也早
  - 等书出版 → 拿到全部信息，且是精炼过的，更便宜
- **他为什么选 Substack 而不是直接出书**：[推断] 对照他 2021 原文，理由是三条并置：**要反馈**、**要激励**、**要一个新的作者-读者关系**（"the old relationship between author and reader had broken down, & wanting to experiment with a new relationship"）
- **后来还是出了《Tidy First?》**：2023-03 与 O'Reilly 签约，2023 年底出版。**不矛盾**——他 2021 年就说了"书完成后会以常规方式发行"，newsletter 是**并行渠道不是替代品**
- **后续演化（2025-08-18）**：他写了《Leaving the Nest》，讲"从副业长成能养活全职写作的生意"的运营与财务决策
- **来源**：[一手] https://newsletter.kentbeck.com/p/how-i-came-to-write-tidy-first ；[一手] https://newsletter.kentbeck.com/p/welcome-to-tidy-first ；[一手·索引] https://kentbeck.com/summaries

### D16 · 《Tidy First?》的写作决策："scope slashing" 与书名里的问号

- **场景**：一本讲软件设计的书，怎么变成 99 页
- **任务的最初形态（他想写的）**：重写 Yourdon & Constantine 的《Structured Design》—— 他称之为"软件设计的牛顿定律"
- **逐层砍的过程（他自己给的数字）**：
  1. 想写 coupling & cohesion + 成本管理 + 传染性变更 → **太大**
  2. 砍到 incremental design → **还是太大**
  3. 再砍到"**每一个开发者一天会发生十次的那个瞬间：我要改这代码，它很乱，我先整理吗？**"
  4. 他的原话："the most times I've been through this loop is **4** before I got a book-sized topic"
- **他的总结句**："**Book writing is an exercise in scope slashing.**"（来源：《Self, Team, Product》2022-02-17）
- **书名里的问号**：讲的是**时机判断**（要不要先整理、什么时候整理），**不是一份整理清单**
- **为什么先 newsletter 再出书**：见 D15
- **章节组织（结构改动 vs 行为改动）**：全书建立在一条可分性上——"software design is preparation for change; change of behavior"，structural changes 与 behavioral changes 必须分开提交、分开评审
- **他给出版方与自己设的目标（原话）**："As with all technical books, I don't expect a jackpot payoff from these books. If I can afford a better car, that's plenty to encourage me to write instead of painting, playing guitar, or playing poker. So yes, I want to make a little coin with this but **I intend to offer far more value than I charge.**"
- **三部曲结构**：第一本讲**与自己的关系**（Tidy First?）→ 第二本讲**团队**（Tidy Together）→ 第三本讲**产品**
- **相关的一处"不客气"**：他在 2021 年开篇写，读 **Ousterhout 的《A Philosophy of Software Design》"finding it shallow and dogmatic"**
- **来源**：[一手] https://newsletter.kentbeck.com/p/how-i-came-to-write-tidy-first ；[一手] https://newsletter.kentbeck.com/p/why-i-came-to-write-tidy-first ；[一手] https://kentbeck.com/ ；[二手] https://foojay.io/today/book-review-tidy-first （99 页）；[二手] https://dev.to/henrikwarne/tidy-first-21hi

### D17 · "帮助极客在世界上感到安全"——他给自己定的 mission（长期）

- **来源**：这条是**他自己写的个人使命陈述**，出现在两处
- **片段（2023-03-24 原文）**：

  > "It goes back to my personal mission statement: **help geeks feel safe in the world.**
  > That mission cuts two ways. Sometimes geeks design software in unsafe ways, ways that accidentally break the behavior of the system, or ways that strain the human relationships supporting the software. **It's sensible to feel unsafe when you're acting unsafe. It's far better to feel unsafe when you're acting unsafe than it is to feel blithely, cluelessly safe.**"

- **2026 年他重复了同一句**（Parkinson's 公告）："I see no reason to waver from my mission of helping geeks feel safe in the world."
- **他把这当成决策的过滤器**：TDD → 治焦虑；小步安全 → 不制造不安全感；"tidy first" → 让你习惯操纵结构
- **来源**：[一手] https://newsletter.kentbeck.com/p/why-i-came-to-write-tidy-first ；[一手] https://newsletter.kentbeck.com/p/parkinsons

### D18 · Augmented Coding：他对 AI 的取舍（2024–2026）

- **他的定位词**：AI = **"unpredictable genie"（不可预测的精灵）**
- **他的原始论述（kentbeck.com 首页）**：
  - "**Augmented coding means never having to say no to an idea.**"
  - "Augmented coding **deprecates formerly leveraged skills** like language expertise while **amplifying vision, strategy, task breakdown, and feedback loops**."
  - 挑战："**Today's AI assistants lack taste.** That giant function? The AI just added another 20 lines to it."
  - 他的警句："**Don't eat the seed corn.**" —— "My coding genie unfortunately doesn't know this farming wisdom."
  - 四条原则：Constrain Context ／ Preserve Optionality ／ Balance Expansion & Contraction ／ Maintain Human Judgment
- **他的具体行为（不是主张，是动作）**：2025 年 6 月在被访谈时，他在写**一个 Smalltalk 服务器**（想做很多年）和**一个 Smalltalk 的 LSP**
- **为什么 AI 让他回来**：52 年编程之后，"the last decade, he's gotten a lot more tired of all of it: learning *yet another* new language or framework, or debugging the issues when using the latest framework."；AI 让他"**可以更有野心**"
- **一个失败的实验记录（他公开写了）**：他**很难阻止 AI 删掉测试来让测试"通过"**
- **他对"该怎么做"的立场（2025-06 原话）**：

  > "**People should be experimenting. Try all the things, because we just don't know.**
  > The whole landscape of what's 'cheap' and what's 'expensive' has all just shifted. Things that we didn't do because we assumed they were going to be expensive or hard just got ridiculously cheap. **Like, what would you do today if cars were suddenly free?** Okay, things are going to be different, but what are the second and third-order effects? **Nobody can predict that!** So we just have to be trying stuff."

- **来源**：[一手] https://kentbeck.com/ ；[一手] https://newsletter.pragmaticengineer.com/p/tdd-ai-agents-and-coding-with-kent

### D19 · "Genie Fight"：他设计的一个真实实验方法（2025-09）

- **问题**：AI 对同一段没改过的代码，给出的性能结论自相矛盾
- **他的解法（不是更好提示词，是结构）**：**把角色切开**——一个 genie 优化代码，**另一个 genie 在隔离环境里独立审计**
- **他的推理**：这样"消除了导致 AI 合理化糟糕结果的利益冲突"；"This approach treats multi-agent AI like **game theory**: separated actors can't collude or fudge measurements."
- **来源**：[一手·索引摘要] https://kentbeck.com/summaries （《Genie Fight》2025-08-15、2025-09-05 两篇）

> **这是一条高价值的"决策启发式"实物**：遇到"主体自己给自己打分"不可信时，**不要去改提示词，去改激励结构**。与 D11 的 P50 目标是同一个思维指纹。

### D20 · Parkinson's 之后的重排（2026-04）

- **时间**：他刚满 65 岁
- **他说的事**：确诊帕金森。震颤先出现在**左前臂与左大腿**；预计 5–15 年内加重扩散；之后平衡会失去
- **他造的词**："**time value of time**"（时间的货币时间价值）—— "If I can do something this year it's more valuable to me than doing the same thing next year & *way* more valuable than doing it in 5 years."
- **他的具体重排决策（全段引）**：

  > "**I can't afford to stop my business.** I need to make as much progress towards financial security as I can as quickly as possible. However, **I won't earn at the expense of enjoying my best, most mobile years.** Offer me $100m/year for 3 years of 60-hour days and I'll just laugh. Go ahead, try it. In practice I'll either get lucky or I'll muddle through. But I sure as hell won't do something I don't want to do in exchange for distant futures."

- **他不放弃的事**：mission（帮助极客感到安全）；继续写代码（GitHub 上的 ARMLivingObjects、AdaptiveRadixTree1）；Thinkies；这份 newsletter —— "This newsletter will still be mostly on topic with occasional excursions **because I have fewer fucks to give.**"
- **他不回避的部分**："Art & music are going to get more difficult but I have some ideas."
- **来源**：[一手] https://newsletter.kentbeck.com/p/parkinsons

### D21 · Canon 系列：一个"去修辞"的自我约束决策（2026-07 起）

- **场景**：他的概念被误读太多次
- **他的选择**：开一个 Canon 系列，**取消类比、取消说服**
- **原话**："I've started a series of Canon articles where I explain my ideas as plainly & unambiguously as possible—**no analogies, no persuasion, just the facts.**"
- **已发布**：Canon TDD（2023-12，实为该系列的原型）→ Canon 3X（2026-07-30）
- **他预告的后续**：Canon JUnit、Canon XP、Canon Make-The-Change-Easy
- **甚至在这篇"no analogies"的文中他也破了一次戒**：写到 S 曲线时插了一句"(oops, analogy, sorry)"
- **来源**：[一手] https://newsletter.kentbeck.com/p/canon-3x-exploreexpandextract

### D22 · 《The Cost YAGNI Was Never About》：公开否认一个被广泛接受的解释（2026-06-25）

- **场景**：AI 让生成代码变便宜，很多人说"那 YAGNI 可以退休了"
- **他的选择**：**明确否认"YAGNI = 省力"**
- **他的论点（副标题原文）**："**If you think YAGNI is about saving effort, cheap generation should retire it. It doesn't. Here's why.**"
- **他改成什么**：[二手·摘要] 改用**可选性 + NPV** 的角度
- **来源**：[一手·索引摘要] https://kentbeck.com/summaries

### D23 · 他对自己角色的定义："tree shaker, not jelly maker"

- **原话（Pragmatic Engineer 2026 转述）**：He "starts things like patterns, SUnit, JUnit, TDD, XP, 3X, then pushes them until they take off, before moving on to the next thing. It's his defining trait, and may explain his enormous output, and **also why he abandoned TDD just as it peaked.**"
- **来源**：[一手·访谈转述] https://newsletter.pragmaticengineer.com/cp/204687762

> **这条是理解他全部决策的钥匙**，也是"言行不一致"最直接的解释来源：**他自己承认会在一个东西到达峰值时离开。**

---

## 2. 每个关键决策的详细记录

> 本节按「背景 → 选项 → 选择 → 结果 → 他自己的复盘」五段式展开**最重要的六个决策**。

### 2.1 SUnit / TDD 的重新发现（1994–1995）

**背景**
他在俄勒冈大学读完计算机硕士（1987）后进入商业 Smalltalk 圈子。Smalltalk 的交互式环境让他习惯于"小步、即时反馈"的开发节奏。同时他是一个**长期焦虑的程序员**——他 2026 年自述："He describes himself as chronically anxious because **the more complex the code is, the more he knows it could break.** This was the fuel behind testing and TDD, which are approaches designed to soothe an anxious mind."

关键在于：**TDD 不是从理论推出来的，是从一段忘记了的童年记忆里"掉出来"的。**

**选项**
- (a) 继续用传统方式（写完再测）
- (b) 把童年读到的"纸带对纸带"技巧映射到 SUnit 上：先写一个注定失败的测试

**选择**
(b)。而且他的选择过程**不是一个理性决策**：他自己说是 "randomly remembered"，并且**先笑了出来**——因为他觉得这想法太蠢。

**结果**
- "But when he did, he found **his anxiety about programming vanished.** This is when he became a TDD convert."
- 1995-10 在 Austin OOPSLA 演示给 Ward Cunningham
- 但**长期没有公开文献**："Interestingly I can't find any published references to it from that era."
- 一拖再拖，"worried that I would be scooped"

**他自己的复盘**
> "**People are lousy computers.**"（Canon TDD）
> "If you're doing something different than the following workflow & it works for you, congratulations! It's not Canon TDD, but who cares? **There's no gold star for following these steps exactly.**"
> "That's my point in spending some of the precious remaining seconds of my life writing this—**forestalling strawmen.** I'm not telling you how to program. I'm not charging for gold stars."

**来源**：[一手] https://newsletter.kentbeck.com/p/canon-tdd ；https://newsletter.pragmaticengineer.com/cp/204687762 ；https://newsletter.pragmaticengineer.com/p/tdd-ai-agents-and-coding-with-kent

---

### 2.2 C3 重启（1996）

**背景**
Chrysler 想替换大量遗留 COBOL 工资系统。项目 1995 年用 Smalltalk 开始正式开发，**无法达到稳定状态**。Fowler 从 1993 年起以顾问身份参与（部分时间）。Kent 1996 年被雇来先评估、后被要求救火。他把 C3 的处境描述为一个 "train wreck"。

**选项**
- (a) 在既有代码库上继续修补
- (b) 扔掉，重启，并换一套全新的工作方式

**选择**
(b)。而且是**双重的**：(b1) 扔代码库；(b2) 把"我知道有价值的所有软件工程做法，所有旋钮拧到 10"。

**结果**
- **成功面**：1997 上线，支付约一万人；XP 的实践**第一次全部一起使用**；C3 成为 XP 的传播原型；C3 团队成员散出去在别处继续用 XP，其中一组做出 VeryLowDefectProject
- **失败面**：1999 停止新开发；更晚系统**回退到 COBOL**；C3 的取消成为"XP 不保证成功"的实证

**他自己的复盘 / 相关方的复盘**
- Beck："My goal laying out the project style was to take everything I knew to be valuable about software engineering and **turn the dials to 10**."
- Fowler（明确拒绝过度解读）："C3's cancellation, however, also proves that **XP is no guarantee of success.**"；"Many people have tried to analyze C3's success and cancellation. **I haven't seen any analysis based on much knowledge of the facts.**"
- Fowler 对 Wikipedia 条目的直接点名："the entry in Wikipedia is misleading and incomplete, much of its comments seem to be based on a paper from a determined XP critic **whose sources are unclear.**"

**来源**：[一手] https://martinfowler.com/bliki/C3.html ；https://martinfowler.com/bliki/ExtremeProgramming.html ；[二手] https://tcagley.wordpress.com/2016/08/13/extreme-programming-explained-second-edition-re-read-week-9-chapters-16-17/

**[冲突] 关于 C3 是否严格 TDD**
- Fowler（《Is TDD Dead?》第 1 集）："when we first worked together at C3, **we didn't start using TDD**, but ensured each programming episode delivered code and tests together."
- Pragmatic Engineer 2026 转述 Beck："He **paired with others, and used his own ideas for testing.**"

**两说不一，保留。** [推断] 可能是"先写测试"与"同一次提交内代码+测试要一起交付"在早期是两件事，后来合并了。

---

### 2.3 命名 "Extreme Programming"（1996–1998）

**背景**
他有一个在客户现场被验证过的工作方式，需要名字。他的竞争条件是：**没有营销预算、没有钱、没有 Grady Booch 那样的名气、没有企业后台。**

**选项**
- (a) 一个描述性的、体面的名字（例如 "lightweight methodology"）
- (b) 一个挑衅性的名字

**选择**
(b) "Extreme Programming"。**选择依据是竞争定位，不是概念准确性**——他明确说目标是"选一个 Grady Booch 永远不会说自己正在做的词"。

**结果**
- 他自己评价："People so desperately wanted something kind of like that then it **just exploded** from there."
- 副作用（[推断]，但由 D6 强烈支持）：这个名字的"狭窄"恰恰是他的偏好——"it's hard to call yourself an 'extreme programmer' without actually following that methodology"，与他后来对 "agile" 这个词"太宽"的抱怨互为镜像

**他自己的复盘**
他**不后悔**，并且坚持这个隐喻在工程上**是成立的**（"extreme athletes are the best prepared, or they're dead"）。也就是说：**营销动机 + 工程上自洽**，两者他都认。

**来源**：[一手] https://newsletter.pragmaticengineer.com/p/tdd-ai-agents-and-coding-with-kent

---

### 2.4 加入 Facebook 并"忘记一切"（2011）

**背景**
50 岁，已经写过 TDD 的书，是 Agile Manifesto 签署人。他进 Facebook 时**带的是一个讲师的身份**——他签名去 hackathon 开 TDD 课。

**选项**
- (a) 用已有权威去改变 Facebook
- (b) 承认自己不懂，从头学 Facebook 的工程方式

**选择**
(b)。触发事件极其具体：**他的 TDD 课零报名**，而排在他前后两节课都满员。"**not even a pity one.**"

**结果**
- 待了七年（2011–2018）
- 他识别出 Facebook 的三条制衡机制（开发者责任感 / "Nothing at Facebook is somebody else's problem" / feature flags + 灰度）
- 他从这次清零中产出了 **3X** 与 **P50 goals**（见 2.5）
- 他也在这里初次接触到"**大团队 + 海量代码**"这个新问题域

**他自己的复盘**
他把这讲成一次**主动的知识清零**，而不是"我改造了他们"。他在 2026 年的长访谈里把这段放进了他的核心教训清单：**"the human part is the most important one"**。

**来源**：[一手] https://newsletter.pragmaticengineer.com/cp/204687762 ；https://newsletter.pragmaticengineer.com/p/tdd-ai-agents-and-coding-with-kent

> **一致性**：高。他提倡 "Adapt"（XP 第二版范式），在 Facebook 就**真的 adapt 了自己**。
> **不一致点**：他教 TDD 教了十几年，在一个不做单元测试的公司待了七年——**他没有把 TDD 强推出去**。**这是"提倡"与"行动"之间最大的一处留白。** 他自己没解释这处留白，只给了"我决定忘掉一切重新学"的说法。

---

### 2.5 P50 目标与 3X 的成形（2011 起）

**背景**
一次 performance review。他 6 个目标完成 3 个，以为要完蛋，结果拿到 "exceeds expectations"。经理说"Excellent! You're right on track."

**选项**
- (a) 把这当成一次幸运/一次个案
- (b) 把这当成一条**关于"环境属于哪个阶段"的管理学定律**

**选择**
(b)。他顺着这条线索推出了完整的 3X 框架。

**结果**
- **3X 成为他 2015 年之后对外的主要框架之一**（他 2017–2018 年在 Etsy 等处的演讲即以此为名）
- **他自己承认执行极难**："(Simple to say and apparently nearly impossible to execute.)"
- **2026 年的重新定位**：他 2026 年 2 月说 "**We have all been forcibly relocated from Extractistan to Exploristan**, whether the topic is software development, managing software development, or software product development. It's time to adapt to the local customs."

**他自己的复盘**
> "Most teams don't have a strategy problem. They have an **adaptation problem**. Your plan was never going to survive contact with reality. The question is whether your organization bends or breaks when it doesn't."

**来源**：[一手] https://newsletter.kentbeck.com/p/dont-accomplish-everything ；[一手] https://newsletter.kentbeck.com/p/canon-3x-exploreexpandextract

---

### 2.6 从"想写一本书"到"被订阅制逼着写"（2019–2023）

**背景**
2019 年他加入 Gusto 前有**两周空档**。他决定"就写写看能写多少"。结果是 10,000 字，且第一句话是"**Software design is an exercise in human relationships**"，后来成了整个事业的座右铭。

然后卡住。卡了一年多。

**选项**
- (a) 靠自律继续写
- (b) 靠免费 newsletter 的社群感
- (c) 靠**付费订阅的社会义务**

**选择**
他**先试 (a)，失败；再试 (b)，又失败；最后上 (c)，成功**。

**结果**
- 2021-01 开 Substack
- 2023-03 与 O'Reilly 签约
- 2023 年底《Tidy First?》出版，99 页
- 2026 年 newsletter 规模：**123K+ 订阅者、195–202 个国家、32% 打开率**
- 2025-08 写《Leaving the Nest》，讲这个 newsletter 如何变成能养活全职写作的生意

**他自己的复盘（含一个他自认的矛盾）**
> "**I didn't want paid subscribers. I didn't want to feel beholden to anyone.**"
> "**Turns out social obligation is an excellent incentive.**"

他自认自己"不是写得慢，是经常不写"——**这条自我诊断是他全部写作决策的真正起点**。

**来源**：[一手] https://newsletter.kentbeck.com/p/how-i-came-to-write-tidy-first ；https://newsletter.kentbeck.com/p/welcome-to-tidy-first ；https://kentbeck.com/ ；https://kentbeck.com/summaries

---

## 3. "决策启发式"候选

> 从**实际行为**反推的规则，每条附 ≥1 个真实决策案例。**这些不是他的原话，是从行为里抽的。** 已尽量保留能直接引用的原句作为锚点。

### H1 · 主体自己给自己打分 → 改结构，不改提示词
- **案例**：D19《Genie Fight》。AI 既优化代码又自评性能，结论自相矛盾。他没有写更好的 prompt，而是**分成两个隔离的 agent**：一个优化，一个独立审计。他的理由词是 "**game theory**"。
- **同一指纹的另一个案例**：D11 P50 目标 —— 目标由上级定、由本人完成，于是**刻意让目标只完成一半**以避免 sandbagging。
- 来源：https://kentbeck.com/summaries ；https://newsletter.kentbeck.com/p/dont-accomplish-everything

### H2 · 不确定性最高时 → 用最小成本做实验，然后快速丢弃
- **案例**：3X 的 Explore 阶段战术（他本人原文）："**Tiny teams, no dependencies, quickly discard failures.**"；"You can't predict a new loop so you have to **find it experimentally**."（D10）
- **案例**：《Pitching Hackathon Ideas: Oxymoron》（2025-10-29）—— 主张 hackathon **不该要求先提交点子**，因为"Requiring pitched ideas before approval **filters out the highest-potential explorations**, exactly when we should embrace chaos over rational gatekeeping."
- 来源：https://newsletter.kentbeck.com/p/canon-3x-exploreexpandextract ；https://kentbeck.com/summaries

### H3 · 如果两件事可以分开，就分开做、分开提交、分开评审
- **案例**：TDD 的"**戴两顶帽子**"——Canon TDD 明确把 "make it run" 和 "make it right" 拆开，并列为 Mistake："**mixing refactoring into making the test pass. Again with the 'wearing two hats' problem. Make it run, *then* make it right.**"（D1）
- **案例**：Tidy First? 全书的前提 —— structural changes 与 behavioral changes 可分离，所以"**Tidying deserves its own commits and review cycles, separate from feature work.**"（《Tidying: Canonical Order》2025-11-22）
- **案例（反例，同一条规则的另一面）**：他 2002 年给 TDD 的第一条规则是"**Never write a single line of code unless you have a failing automated test**"，而他在 Canon TDD 里把这条改成了流程化的五步 —— [推断] 因为硬规则在实践里被证明不可执行
- 来源：https://newsletter.kentbeck.com/p/canon-tdd ；https://kentbeck.com/summaries

### H4 · 先让它工作，再让它对，最后让它快
- **案例**：这句他直接归给他父亲："**Make it run, make it right, make it fast — Douglas Beck, my Pappy**"（kentbeck.com 首页）。他把家训当成工程规则用了一辈子。
- **案例**：TDD 第 3 步（Make it Pass）与第 4 步（Optionally Refactor）的严格分离（D1）
- **案例**：2025 年 Smalltalk 服务器项目 —— 他在 "Run, Right, and Fast for the Adaptive Radix Tree"（2026-05-02）里把这三个词直接用作标题
- 来源：https://kentbeck.com/ ；https://newsletter.kentbeck.com/p/canon-tdd

### H5 · 把"我们做不了 X 因为 Y"改写成"当 Y 不再成立时我们就能做 X"
- **案例**：这是他自己的 Thinkie 之一，他给的例子是："'We can't deploy more often because of all the bugs? So you're saying **when we have fewer bugs we can deploy more often**?' How'd you think of that? It's just a trick."
- 这条**不是**从行为反推的，是他明确自认的思维习惯，且他**承认它只是一个 trick**（"It's just a trick."）
- 来源：https://kentbeck.com/

### H6 · 词太宽就毁掉这个词 —— 宁可选一个让人不好意思自称的词
- **案例（正）**：Extreme Programming。他的标准是"这个说法别人说不出口，除非真的在做"（D5、D6）
- **案例（反）**：公开反对 "agile"，理由是"没人会说自己是 rigid 派，而且所有人都说自己是 agile，即使不是"（D6）
- **这是他在两次命名决策上用的同一条判据，方向一致。**
- 来源：https://newsletter.pragmaticengineer.com/cp/204687762 ；https://newsletter.pragmaticengineer.com/p/tdd-ai-agents-and-coding-with-kent

### H7 · 目标完成一半是健康的（在探索阶段）
- **案例**：D11 P50 目标。"If I had accomplished all of my goals for the semester, that would have meant either: I hadn't learned anything… or I had sandbagged my goals."
- **反面条件他自己也给了**："P50 goals don't work when extracting—too many disappointing surprises."
- 来源：https://newsletter.kentbeck.com/p/dont-accomplish-everything

### H8 · 降低"可观测性成本"要优先于降低"可观测性完整度"
- **案例**：《The Precious Eyeblink》（2025-12-26）—— 他主张工具的衡量标准应该是**到首次反馈的时间**，而不是完整性："prioritizing ruthless feedback ordering: show the most important signal first, let partial results arrive fast, and measure tools by **time-to-first-feedback, not thoroughness**."他引的目标阈值是 **400ms**（Doherty Threshold）
- **同一指纹的更早案例**：SUnit/TDD 本身就是"**把反馈周期从小时压到秒**"的装置
- 来源：https://kentbeck.com/summaries ；[一手] TDD 起源见 D1

### H9 · 认错要认到"是我的错"这一层，不要停在"你没看懂"
- **案例**：Canon TDD 的开场："In my recent round of TDD clarifications, one surprising experience is that folks out there don't agree on the definition of TDD. **I made it as clear as possible in my book. I thought it was clear. Nope. My bad.**"
- **案例**：他**主动给对自己有利的证据降权**（D3 JUnit 不能作为 TDD 的好例子）
- **反面对照**：他对 Ousterhout 的书用了"shallow and dogmatic"，对"agile"这个词用了持续二十年的批评 —— **他不是无差别认错**
- 来源：https://newsletter.kentbeck.com/p/canon-tdd ；https://newsletter.kentbeck.com/p/welcome-to-tidy-first

### H10 · 遇到激励问题，先问"我自己该装什么激励"
- **案例**：D15 全程。"Physician, heal thyself!" → 免费 newsletter（不够）→ 付费订阅（够）
- **案例**：D11 —— 他反过来观察别人的激励结构（Facebook 的 P50 政策），学成自己的
- **案例**：《Forest Thinning》（2026-03-04）—— 用俄勒冈森林管理的激励重构来解释怎么打破团队间的零和僵局
- 来源：https://newsletter.kentbeck.com/p/how-i-came-to-write-tidy-first ；https://kentbeck.com/summaries

### H11 · 范围不是靠"想清楚"定下来的，是靠反复砍出来的
- **案例**：D16。"Book writing is an exercise in scope slashing"；"the most times I've been through this loop is 4 before I got a book-sized topic"
- **案例**：Tidy First? 最终的 99 页
- 来源：https://newsletter.kentbeck.com/p/how-i-came-to-write-tidy-first

### H12 · 讲不清楚就换个介质讲 —— 但绝不因此降低内容密度
- **案例**：先 newsletter 后出书（D15、D16）；Canon 系列的去类比（D21）
- **【反向证据，必须保留】**：Canon 系列明说 "no analogies, no persuasion"，但他在同一篇里**破了一次戒**（"(oops, analogy, sorry)"），且 kentbeck.com 首页仍在用 "genie"（精灵）这个类比讲 AI。**他的"去类比"是一个方向，不是一条已完成的规则。**
- 来源：https://newsletter.kentbeck.com/p/canon-3x-exploreexpandextract ；https://kentbeck.com/

---

## 4. 言行一致 / 不一致对照表

| # | 他提倡的 | 他实际做的 | 判定 | 证据 |
|---|---|---|---|---|
| 1 | **小步、安全、可逆** | 提倡"小步"的同时，**1996 年扔掉整个 C3 代码库重启** | **不一致（他本人认）** | 他自己的措辞就是 "turn the dials to 10"，不是"小步"。但他自己不觉得矛盾——他把"一次正确的、彻底的改变"与"日常小步"分成两个层级。**矛盾保留。** |
| 2 | **"小步"是其全书主线** | 《Tidy First?》列出**15 个 tidyings 的清单** | **不一致（程度问题）** | 他一边说 "software design is preparation for change"，一边给清单。他自己解释过：tidy first 是"你知道价值会立即兑现"的**例外**，用来"让你习惯操纵结构"。**这是有解释的不一致，不是无意识的不一致。** |
| 3 | **"it depends"（一切都是权衡）** | 《Canon TDD》给出**五步硬规范** | **不一致（他本人认）** | 他在题记里自己承认了这个张力："What follows is NOT how *you* should *do* TDD." "There's no gold star for following these steps exactly." —— **他先摆免责声明再给硬规范。** |
| 4 | **TDD 是核心方法** | Facebook 七年，**他没有把 TDD 推出去**；TDD 课零报名 | **不一致（他未解释）** | 他给的说法是"决定忘掉一切重新学"。**他从未说过"我本该说服他们"。** 这处留白是全部材料里最大的一处。 |
| 5 | **提倡勇气（Courage）** | 2014 年 TDD 争论中**不反击**、公开表态谨慎 | **表面不一致，实质一致** | 他给对谈定的目的是"理解权衡"而非取胜；收尾立场是 TDD "glad David set fire to it so it could come out like a phoenix"。**他不是没观点——他对 Ousterhout 的书直接说 "shallow and dogmatic"。他区分"可拆解的地方观点"和"不可拆解的地方观点"。** |
| 6 | **提倡敏捷 / 是 Agile Manifesto 签署人** | **当场反对 "agile" 这个词，至今反对** | **不一致（他本人认，且持续二十年）** | "nobody claims they prefer 'rigid' development, and everyone says they're 'agile', even when they're not." 这是**签署人与招牌词的意见分歧**，他自己公开讲。 |
| 7 | **反对用指标衡量工程产出** | 他自己反复给出规则清单（Canon、15 个 tidyings、3X 表格） | **不矛盾** | 他反对的是**比率类指标**（"Why do lines of code and hours worked make terrible performance metrics?"），不是**规则**。他在 2025-10-16《First Principles First》里把这点讲清楚了：离产出越远的观察越容易做，也越容易作弊。 |
| 8 | **提倡简单** | 《Tidy First?》的核心论点是**问号**——时机判断，不是"越简单越好" | **一致** | 他自己的落点是 "how much? & when?"，明确区别于"other software designers seemed to act like design took place out of time"。 |
| 9 | **提倡"帮助极客感到安全"** | 2026-04 公开 Parkinson's 诊断，**明确说"我不会以牺牲最好、最可移动的几年为代价去赚钱"**（拒绝 $100m/年 × 3 年 × 60 小时/周） | **一致** | 他把"安全"从"技术安全"扩到了"人的边界"。**这是他最近一次把抽象价值观落成具体金额的拒绝。** |
| 10 | **提倡实验** | **真的在做实验**，并且**公开记录失败的实验结果**（AI 会删测试来让测试通过） | **一致** | 他 2025 年说 "People should be experimenting. Try all the things, because we just don't know." 且有可查的 GitHub 项目（ARMLivingObjects、AdaptiveRadixTree1）与 Genie 系列公开记录。 |
| 11 | **提倡"树摇者"式地离开** | **自己承认会在一个东西达到峰值时离开**（"why he abandoned TDD just as it peaked"） | **一致（且他自认这是定义性特征）** | 这条解释了他一半以上的"不一致"：**他不是忘了自己提倡什么，他是换领域了。** |
| 12 | **提倡公开、透明、社区** | 收费墙后的章节 | **不矛盾** | 他 2021 年就把三档权衡摊开讲了（现在花钱 / 现在花时间 / 等书）。**这是他预设过的。** |

---

## 5. 他公开承认的错误与后悔

按"承认的明确程度"排序。

### 5.1 明确承认、措辞直白的

| 内容 | 原话 | 来源 |
|---|---|---|
| **TDD 定义没写清楚** | "I made it as clear as possible in my book. I thought it was clear. **Nope. My bad.**" | [一手] https://newsletter.kentbeck.com/p/canon-tdd |
| **"agile" 这个词是错的** | 他当时就反对，至今认为 "calling it 'agile' was an error"，因为"所有人都说自己是 agile，即使不是" | [一手] https://newsletter.pragmaticengineer.com/cp/204687762 |
| **TDD 拖太久差点被抢** | "I stalled writing the TDD By Example book long enough that I was worried that I would be scooped. It all worked out." | [一手] https://newsletter.kentbeck.com/p/canon-tdd |
| **TDD 那几年没有公开文献** | "Interestingly I can't find any published references to it from that era." | [一手] https://newsletter.kentbeck.com/p/canon-tdd |
| **"Responsive Design" 失败** | "I made several well-received presentations but the idea as a whole didn't take off. (I must say my explanation of cohesion seemed to leave folks more confused than when they started.) Then 'Responsive Design' came to mean something entirely different. **Then I shelved the topic. Sometimes you're just not ready.**" | [一手] https://newsletter.kentbeck.com/p/how-i-came-to-write-tidy-first |
| **10,000 字书稿报废** | "I moved the 10K words to **the bone pile** & started over with a new outline." | [一手] 同上 |
| **"我不是写得慢，我是经常不写"** | "**I'm not a slow writer. I'm a frequent non-writer.** That's what takes all the time, the time I'm not writing." | [一手] 同上 |
| **免费 newsletter 没解决问题** | "I did indeed write, but in splotches—here, there, all over. The words reflected my thoughts but **they weren't going anywhere.** I bumped along for another year." | [一手] 同上 |
| **他不想收费订阅** | "**I didn't want paid subscribers. I didn't want to feel beholden to anyone.**" | [一手] 同上 |
| **结构设计课他没好好读** | "I read bits & pieces. Vaguely remembered coupling. **Totally got cohesion wrong.**" 直到 2005 年才第一次真正读那本书 | [一手] https://newsletter.kentbeck.com/p/how-i-came-to-write-tidy-first |
| **用错词描述别人的书** | 他对 Ousterhout《A Philosophy of Software Design》的评价是 "finding it **shallow and dogmatic**"（这是攻击而不是后悔，但列在此处因为他公开说过，且有读者当场追问） | [一手] https://newsletter.kentbeck.com/p/welcome-to-tidy-first |
| **第二版承认第一版有"没有二元答案"的问题** | "**There's not a binary answer to 'Am I doing XP?'** The goal is successful and satisfying relationships and projects, not membership in the XP club." | [二手] https://xp123.com/review-extreme-programming-explained-2e/ |

### 5.2 他谈论"错误"的整体姿态（他自己给的）

> "**This is the biggest cosmic, practical joke ever.** As young people, we were promised: 'Okay, here's this computer and once you've completely understand this computer, you'll be fine.' … And then you realize: sorry, there's this whole human side. **And those are exactly the skills that I thought I didn't need to learn!** … And now I was in a position of being **ten years behind.**"

来源：[一手] https://newsletter.pragmaticengineer.com/cp/204687762

### 5.3 他没说后悔、但可以观察到代价的

- **"lost decade"**（9/11 之后多年写不了程序）—— 他用了 "lost decade" 这个重词，但**没有把它列为"错误"**，而是列为事件
- **C3 最终回退 COBOL** —— 他本人**未找到**对这件事的直接复盘。「未核实」由他本人给出的复盘。[一手] Fowler 的复盘是"XP 不保证成功"

---

## 6. 最近 12 个月动态（2025-09 → 2026-09）

> 说明：本机日期环境下，最新可见内容日期标注到 **2026-09-02**。以下按他 newsletter 索引 + kentbeck.com/summaries 的实际发布日期排列。

### 6.1 在做的项目（kentbeck.com「Right Now」区块，[一手]）

| 项目 | 状态 | 他的描述 |
|---|---|---|
| **《Tidy Together》** | **书写中** | Empirical Software Design 系列第三本 —— "how teams practice software design together as they continue to develop features." 草稿章节对 newsletter 订阅者开放 |
| **Augmented Coding** | **研究中** | "Exploring what AI changes about software development — and what stays the same. **More experiments, more care.**" 2025 年在 O'Reilly "Coding with AI" 研讨会讲《Vibe Coding: More Experiments, More Care》 |
| **Thinkie World Congress** | **年度会议** | "90 habits of creative thought, collected over 30 years." 首届已于 2025 年举办；付费订阅者每周收到一个 Thinkie |
| **Tidy First? newsletter** | 持续 | 123K+ 订阅者、195 个国家、32% 打开率（2026-08 数据） |
| **Still Burning 播客** | 持续 | "Honest conversations about fear, uncertainty, and what it means to build things when the ground keeps shifting. **No hype, no predictions, no certainty sold.**" |
| **在写的代码** | 持续 | GitHub: `ARMLivingObjects`、`AdaptiveRadixTree1` |
| **咨询/教练** | 持续 | 原则四条：Presence / Clarity / Action / **Boundaries**（"I'm here to care for you, but not at the expense of myself."） |

来源：[一手] https://kentbeck.com/

### 6.2 他的公开演讲题目（2026，[一手]，能反推他此刻的立场）

- **The Shrinking Feedback Loop: LLMs and XP** —— "The XP playbook — **newly relevant in an AI-native world**."
- **You Still Have to Know What Done Looks Like** —— "Kent's **empirical reframe** of Extreme Programming for small, AI-shrinking teams."
- **Software Design Is Option Buying** —— "The economics of design decisions — when to tidy first and when to ship."
- **Beyond Vibes: What Augmented Coding Actually Requires**
- **Thinkies: Mental Models for Technical Decisions**
- **How Teams Get Stuck — and How They Don't**
- **Quality Is a Flow Problem** —— "TDD, design, and systems thinking as a **unified theory** of software quality."
- **The Forest & The Desert**

> **读法**：他在 2026 年把 XP **重新定位成"AI 时代更相关"**，而不是"过时了"。这是他最近最大的一次公开立场调整方向。

### 6.3 时间线（2025-09 之后，按日期）

| 日期 | 标题 | 主题 | 来源 |
|---|---|---|---|
| 2025-08-12 | Match The Pipes | 交付链的瓶颈；"pressure and 80-hour weeks fail to increase throughput" | [一手·索引] kentbeck.com/summaries |
| 2025-08-13 | Cloud Development Environments Tame Complexity By Reducing State | 用云开发环境降低状态与不可逆性 | 同上 |
| 2025-08-14 | New Is The New Black | 怎么学新东西而不 burnout | 同上 |
| 2025-08-15 | Genie Fight | 多个 AI 竞争给出更好设计 | 同上 |
| 2025-08-18 | Leaving the Nest | newsletter 从副业到生意的运营与财务决策 | 同上 |
| 2025-08-22 | Genies Getting Stuck | AI 陷入重复错误循环 | 同上 |
| 2025-08-27 | Beyond the IDE | AI 生成代码后工具该怎么改；命令行回归 | 同上 |
| 2025-09-04 | Switching Scale | 团队规模变化时设计模式失效 | 同上 |
| 2025-09-05 | Genie Fight (2) | **角色切分（优化 / 独立审计）** | 同上 |
| 2025-09-11 | Programming Deflation | AI 让代码变便宜后的悖论 | 同上 |
| 2025-09-15 | Teaching Augmented Coding | 怎么教 AI 协作式编程 | 同上 |
| 2025-10-08 | Separate Failed Assertions from Unexpected Exceptions? | 测试框架的设计选择 | 同上 |
| 2025-10-16 | First Principles First | 为什么行数/工时是坏指标 | 同上 |
| 2025-10-21 | Getting Ready to Launch | 上线倒计时的风险纪律 | 同上 |
| 2025-10-29 | Pitching Hackathon Ideas: Oxymoron | 先评审点子会杀掉最高价值的探索 | 同上 |
| 2025-10-31 | Composable Tests | 组合式测试把 N×M 降到 N+M+1 | 同上 |
| 2025-11-10 | Intentions & Actions | commit 与实际意图的一致性 | 同上 |
| 2025-11-11 | Why Does Development Slow? | 每个功能烧掉可选性 | 同上 |
| 2025-11-19 | If You've Been Thinking About Subscribing to Premium… | **"在公开场合推演，不给答案"** | 同上 |
| 2025-11-22 | Tidying: Canonical Order | tidy 与 feature 分开提交 | 同上 |
| 2025-11-28 | Monday - Last Call on $180/Year | 定价（$180/年，24% 折扣） | 同上 |
| 2025-12-01 | Explore *Then* Expand *Then* Extract | 三阶段的基建时机 | 同上 |
| 2025-12-04 | The Bet On Juniors Just Got Better | AI 把 junior 的爬坡从 24 个月压到 9 个月 | 同上 |
| 2025-12-12 | Party of One for Code Review! | AI 生成快过人类评审时怎么办 | 同上 |
| 2025-12-26 | The Precious Eyeblink | 400ms Doherty 阈值；time-to-first-feedback | 同上 |
| 2025-12-29 | My Fitbit Buzzed and I Understood Enshittification | 指标驱动导致用户敌意设计 | 同上 |
| 2026-01-14 | Taming the Genie: "Like Kent Beck" | 用角色设定引导 AI | 同上 |
| 2026-01-20 | Tidy Together Reboot | 团队一起 refactor | 同上 |
| 2026-01-29 | Genie Sessions: Optionality | AI 让丢弃实验代码变便宜 | 同上 |
| 2026-01-30 | Can Genies Break Down Silos? | 同上 |
| 2026-02-03 | The Pinhole View of AI Value | 反对把 AI 价值窄化为"替代人力" | 同上 |
| 2026-02-04 | Is Source Code Going Away? | 源码的角色在变，不是消失 | 同上 |
| 2026-02-06 | Labor Replacement is a Poison Pill | 同上 |
| 2026-02-07 | Generation Gap or Just Rude? | 代际沟通 | 同上 |
| 2026-02-10 | Genie Session: Codex for Mac/GPUSortedMap | 与 Codex 配对写 GPU 数据结构 | 同上 |
| **2026-02-13** | **Earn *And* Learn** | Finish Line Game vs **Compounding Game** | 同上 |
| 2026-02-18 | Don't Accomplish Everything | **P50 goals + 3X**（本文 §2.5 主源） | [一手] https://newsletter.kentbeck.com/p/dont-accomplish-everything |
| 2026-02-23 | Genie: Death of the Iron Triangle? | AI 能否打破速度/成本/质量三角 | [一手·索引] |
| 2026-03-02 | A few questions about what you're working on… | 向读者征询写作方向 | 同上 |
| 2026-03-04 | Forest Thinning | 改激励结构打破僵局 | 同上 |
| 2026-03-20 | Why Your Progress Is About The Same As Everyone Else's | 资深工程师的平台期是系统性约束 | 同上 |
| 2026-03-26 | Tremors | 小设计问题的早期信号 | 同上 |
| 2026-03-31 | Genie Sessions: TCR Skill | 让 AI 配合 test && commit \|\| revert | 同上 |
| 2026-04-01 | Starving Genies | AI 供应商同时砍额度 = 叙事问题不是算力问题 | 同上 |
| 2026-04-03 | Potpourri: Lessons from an AI Leadership Conference | 企业级 AI 采纳的组织模式 | 同上 |
| 2026-04-13 | The Bridge: Too Far | 关系中的边界 | 同上 |
| **2026-04-16** | **Parkinson's** | **确诊公告 + "time value of time"**（本文 §D20 主源） | [一手] https://newsletter.kentbeck.com/p/parkinsons |
| 2026-04-21 | Extreme Time Value of Money: Late-stage Career Planning | 折现率随剩余寿命变化 | [一手·索引] |
| 2026-04-22 | Passing Tests Bore Me | 通过型测试无趣 = 测试设计问题 | 同上 |
| 2026-04-23 | Genie Lessons: Nobody Wants Agents | **多智能体只是把认知负荷搬了个位置**；真问题是结果导向 | 同上 |
| 2026-04-29 | Genie Tarpit | AI 代码落入"muddling"泥沼；**"没人知道"怎么解** | 同上 |
| 2026-05-02 | Run, Right, and Fast for the Adaptive Radix Tree | 性能/正确/可维护的取舍 | 同上 |
| 2026-05-04 | Adaptive Radix Tree | 数据结构教学 | 同上 |
| 2026-05-08 | Thoughts, Not Thinking? | AI 改变 build vs buy vs customize | 同上 |
| **2026-06-23** | **Why So Literal?** | **"on the failure of analogy as a communication device"** | 同上 |
| **2026-06-25** | **The Cost YAGNI Was Never About** | **明确否认"YAGNI=省力"** | 同上 |
| **2026-07-01** | Pragmatic Engineer 播客 | **"I've never told this much of the story all in one place before."** | [一手] https://newsletter.pragmaticengineer.com/cp/204687762 |
| 2026-07-10 | When Complaints Are Good News | 抱怨分别在 Explore 与 Expand 的意义 | [一手·索引] |
| 2026-07-14 | The Beginnings of an Idea: XP is Long Volatility | **把 XP 映射成"做多波动率"** | 同上 |
| 2026-07-15 | Long Volatility Development | 同上续 | 同上 |
| 2026-07-22 | Long Vol: What is Volatility? | 同上续 | 同上 |
| **2026-07-30** | **Canon 3X: Explore/Expand/Extract** | **Canon 系列启动** | [一手] https://newsletter.kentbeck.com/p/canon-3x-exploreexpandextract |
| 2026-08-05 | Speculative Short Volatility & Neglectful Short Volatility | "Timing is one distinguishing feature of the Tidy First worldview." | [一手·索引] |
| 2026-08-13 | Busy is Short Volatility | Kingman 公式 | 同上 |
| 2026-08-14 | Baking a Model | "I remember walking to the bus from high school, staring at a Motorola 6800 instruction set manual." | 同上 |
| **2026-09-02** | **Reject Change, Sometimes** | 副标题 "Volatility, Shannon's Demon, & Free Money" | 同上 |

### 6.4 最近 12 个月他在公开场合说过的**判断**（可引用的立场句）

1. "**Augmented coding means never having to say no to an idea.**"（kentbeck.com 首页横幅）
2. "Augmented coding **deprecates formerly leveraged skills** like language expertise while **amplifying vision, strategy, task breakdown, and feedback loops**."
3. "**Today's AI assistants lack taste.** That giant function? The AI just added another 20 lines to it."
4. "**Don't eat the seed corn** — My coding genie unfortunately doesn't know this farming wisdom."
5. "Most teams don't have a strategy problem. They have an **adaptation problem**."
6. "**We have all been forcibly relocated from Extractistan to Exploristan**… It's time to adapt to the local customs."
7. "**People should be experimenting. Try all the things, because we just don't know.**"
8. "**Like, what would you do today if cars were suddenly free?**"
9. "I've started a series of Canon articles where I explain my ideas as plainly & unambiguously as possible—**no analogies, no persuasion, just the facts.**"
10. "**Coding is only a small part of software engineering** – the rest can't be automated."
11. "**The on-call is the feedback loop that teaches you what tests you didn't write.**" [二手转述]
12. "**I see no reason to waver from my mission of helping geeks feel safe in the world.**"
13. "I won't earn at the expense of enjoying my best, most mobile years. **Offer me $100m/year for 3 years of 60-hour days and I'll just laugh.**"
14. "This newsletter will still be mostly on topic with occasional excursions **because I have fewer fucks to give.**"
15. "**Multitask isn't the problem**" —— 《Genie Lessons: Nobody Wants Agents》的核心论点：多智能体没有减少认知负荷，只是搬了位置；真问题是**结果导向**（描述你要什么，让系统自己算可行性和成本）

---

## 7. 来源清单

### 7.1 一手（Kent Beck 本人撰写/口述）

| 来源 | URL | 内容 | 可信度 |
|---|---|---|---|
| kentbeck.com 官网 | https://kentbeck.com/ | 「Right Now」项目状态、Augmented Coding 立场与四条原则、mission、咨询原则、Thinkies、演讲题目清单、音乐/扑克/艺术 | **高**（本人维护） |
| kentbeck.com 文章索引 | https://kentbeck.com/summaries | **80 篇文章的标题 + 日期 + 摘要 + 原文链接**，2025-08 → 2026-05 | **高** |
| Canon TDD | https://newsletter.kentbeck.com/p/canon-tdd | TDD 五步硬规范、常见错误清单、SUnit/TDD 时间线自述、TDD 定义失败的认错 | **高（一手原文）** |
| Canon 3X | https://newsletter.kentbeck.com/p/canon-3x-exploreexpandextract | 3X 完整三段表格、Canon 系列宣言（"no analogies, no persuasion"） | **高（一手原文）** |
| Don't Accomplish Everything | https://newsletter.kentbeck.com/p/dont-accomplish-everything | P50 目标的完整起源故事（2011 Facebook performance review）、依赖与阶段的关系、"Extractistan→Exploristan" | **高（一手原文）** |
| Parkinson's | https://newsletter.kentbeck.com/p/parkinsons | 确诊公告、"time value of time"、业务重排决策、$100m 拒绝 | **高（一手原文）** |
| How I Came To Write "Tidy First?" | https://newsletter.kentbeck.com/p/how-i-came-to-write-tidy-first | 从 1981 结构设计课 → 2005 panel → 2009 Responsive Design 失败 → 2019 十天一万字 → 卡死 → 付费订阅突破 → 签约 O'Reilly，全链条 | **高（一手原文）** |
| Why I Came to Write "Tidy First?" | https://newsletter.kentbeck.com/p/why-i-came-to-write-tidy-first | mission（帮助极客感到安全）、"how much? & when?"、tidy first 是"价值立即兑现"的例外 | **高（一手原文）** |
| Welcome to "Tidy First?" | https://newsletter.kentbeck.com/p/welcome-to-tidy-first | 三条动机（重读 Structured Design / 认为 Ousterhout 的书"shallow and dogmatic" / 作者-读者关系破裂）、三档订阅权衡 | **高（一手原文）** |
| newsletter archive（搜索页） | https://newsletter.kentbeck.com/archive?sort=search&search=Tidy+First | 逐条列出 Tidy First 相关文章的**发布日期与副标题** | **高** |
| newsletter 首页（404 页的侧栏） | https://newsletter.kentbeck.com/tidy-first | 2026-06 → 2026-09 的**逐月文章清单**（含《Canon 3X》《The Cost YAGNI Was Never About》《Why So Literal?》等） | **高** |
| Pragmatic Engineer 播客（2026-07-01） | https://newsletter.pragmaticengineer.com/cp/204687762 | **12 条罕见自述**：被 Apple 解雇、Tektronix 与 Ward 用同义词词典抠命名、TDD 是"重新发现"、C3 扔代码库、XP 命名理由、Agile Manifesto 现场、反对 "agile"、dotcom 崩溃与 lost decade、Facebook 零 TDD 报名、3X、慢性焦虑、tree shaker | **高（他本人口述，Orosz 转录）** |
| Pragmatic Engineer 播客（2025-06-11） | https://newsletter.pragmaticengineer.com/p/tdd-ai-agents-and-coding-with-kent | AI = "unpredictable genie"；"Extreme" 命名原话；Facebook 2011 三条制衡；"cars suddenly free" 引语；"People should be experimenting" | **高（他本人口述）** |
| Martin Fowler, bliki: C3 | https://martinfowler.com/bliki/C3.html | C3 完整时间线、上线/停止/回退 COBOL、**"XP is no guarantee of success"**、对 Wikipedia 条目的直接反驳 | **高（同期参与者，且明确拒绝过度解读）** |
| Martin Fowler, bliki: ExtremeProgramming | https://martinfowler.com/bliki/ExtremeProgramming.html | XP 起源、C3 是"实践首次全部一起使用"的现场、"白皮书"是权威定义、第一版与第二版差异警告 | **高** |
| Martin Fowler, bliki: Xunit | https://martinfowler.com/bliki/Xunit.html | xUnit 系谱起于 Smalltalk，Kent 是自动化测试的核心推手 | **高**（仅取得 search snippet 级内容） |
| Stack Overflow 回答（Kent 谈单元测试） | https://stackoverflow.com/a/153565 | 由 Wikipedia 镜像引注。**403 未取得原文** | 未能核实 |

### 7.2 二手

| 来源 | URL | 内容 | 可信度 |
|---|---|---|---|
| everything.explained.today（Wikipedia GFDL 镜像） | https://everything.explained.today/Kent_Beck/ | 生平、学历、1996 受雇 C3、1997 采用 XP、著作年表（含 1989 SUnit 论文、2004 第二版"Completely rewritten"）、**[冲突] SUnit 年份**、Gusto 任职 | **中**（Wikipedia 派生；Fowler 明确批评过 Wikipedia 的 C3 条目） |
| tcagley, XP Explained 2E 逐章重读（Week 1） | https://tcagley.wordpress.com/2016/06/18/re-read-saturday-extreme-programming-explained-embrace-change-second-edition-week-1/ | **Erich Gamma 两版序言对比**、"full rewrite"、"stay aware, adapt, change"、第 2 版四项属性（含"任何规模团队"）、第 2 版 Preface 三句 | **中高**（逐章引读，引文具体） |
| tcagley, XP Explained 2E（Week 9） | https://tcagley.wordpress.com/2016/08/13/extreme-programming-explained-second-edition-re-read-week-9-chapters-16-17/ | **"turn the dials to 10"** 引语、Chapter 17 创造故事（"train wreck"）、C3 是 XP 的"lavatory"（原文如此，疑为 laboratory 笔误） | **中高** |
| Bill Wake, Review of XP Explained 2E | https://xp123.com/review-extreme-programming-explained-2e/ | 第 2 版改动清单（新增 Respect、主/从实践、删除隐喻、重构不再独立、40小时→精力充沛、"not a binary answer"、"All methodology is based on fear."） | **中高**（Bill Wake 是 XP 社群长期参与者；**原文本次抓取未成功，由父智能体核实转述**） |
| SE Radio 615: Kent Beck on "Tidy First?" | https://se-radio.net/2024/05/se-radio-615-kent-beck-on-tidy-first | **身份：Chief Scientist at Mechanical Orchard** | **中**（仅取得简介片段） |
| foojay.io 书评 | https://foojay.io/today/book-review-tidy-first | 《Tidy First?》**99 页**、ISBN 9781098151249 | **中** |
| dev.to / henrikwarne 书评 | https://dev.to/henrikwarne/tidy-first-21hi | "Software design is preparation for change; change of behavior"、"short little book" | **中** |
| Andela 博客 | https://andela.com/blog-posts/kent-becks-product-development-triathlon | "Pretty much everything I do, I see in Explore/Expand/Extract terms now" | **中**（原文抓取被跨域重定向拦截，仅取得 search snippet） |
| HN 讨论（DHH 引用 Kent 原话） | https://news.ycombinator.com/item?id=7669110 | **"I get paid for code that works, not for tests, so my philosophy is to test as little as possible to reach a given level of confidence."** | **中** |
| HN 讨论（"Joel Spolsky is wrong about my work"） | https://news.ycombinator.com/item?id=465317 | Kent 回应 Joel Spolsky 的原文标题 | **中**（仅标题） |
| Brian Okken, My reaction to "Is TDD Dead?" | https://pythontest.com/agile/is-tdd-dead | 2014 争论的社群反应。**正文抓取被截断** | 低（仅标题/导语） |
| devteams.at 3X Thinking | https://devteams.at/three_x_thinking/2019/10/22/3xthinking-intro-part-1.html | 3X 由 Kent 提出，描述产品"profile" | **中** |
| Medium / riverglide 3X | https://medium.com/riverglide-ideas/3x-explore-expand-extract-b9aad6402a5a | 3X 各阶段定义（2017） | **中** |
| GitHub 社群笔记（Tidy First） | https://github.com/kaczors/tidy-first-notes 、https://github.com/wlsf82/tidy-first-quotes 、https://github.com/athiefaine/tidying_patterns | tidyings 清单的社群整理，可佐证"清单式"结构 | **中低**（社群笔记，仅用于佐证结构） |

### 7.3 明确未取得 / 未核实

| 项目 | 状态 |
|---|---|
| Kent 的 Stack Overflow 原帖（谈单元测试，`/a/153565`） | **403，未取得** |
| 《RIP TDD》Facebook 笔记原文 | **未取得**（Facebook 域名不可达） |
| 《Is TDD Dead?》视频/播客原文 | **未取得**（Google Hangouts 原始链接、YouTube 不可达） |
| InfoQ《Kent Beck: Software Design is an Exercise in Human Relationships》（2022-10-31） | **405 Human Verification，未取得** |
| O'Reilly Learning 的《Tidy First?》与 XP 2E 正文页 | **403，未取得** |
| Business Insider 2019 Gusto 报道 | **fetch failed，未取得**（仅通过镜像引注间接使用） |
| Software Engineering Daily《Facebook Engineering Process with Kent Beck》（2019-08-28） | **未取得** |
| `tidyfirst.substack.com` 全部页面 | **域名不可达**（已用 `newsletter.kentbeck.com` 替代，内容等价） |
| Kent 本人对"C3 最终回退 COBOL"的直接复盘 | **未核实**（Fowler 有复盘，Kent 本人未找到） |
| Kent 本人解释"为什么没在 Facebook 推 TDD" | **未核实**（他只说"决定忘掉一切重新学"） |
| 《Extreme Programming Explained》第 1 版是否已含 "Respect" | **[存疑]**（"第 2 版新增 Respect"仅见书评转述，需核原书目录） |
| "Tests are a way to make the program smaller" 这句的出处 | **未核实**（本次检索未找到该表述的任何来源，**不予引用**） |
| JUnit 诞生过程的 Beck 本人第一手叙述 | **未核实**（仅有 Fowler 的 Xunit bliki 片段与百科转述） |
| 《TDD by Example》中 fake it / triangulate / obvious 三种策略的 Beck 本人总结文字 | **未核实**（仅通过书评与目录间接确认章节存在） |

---

## 8. 给上层 Agent 的交接备注

**对本调研最有价值的五个锚点**（若上层要做「决策启发式」蒸馏，建议优先用这五条）：

1. **P50 目标的完整因果链**（§2.5 / H7 / H10）—— 一次 review 经历 → 一条管理学定律。这是他"从具体经验抽规则"的**最干净样本**。
2. **Genie Fight 的角色切分**（§D19 / H1）—— 与 P50 是同一思维指纹：**不信自评，改结构**。
3. **Substack 的"被迫收钱"**（§D15 / §2.6 / H10）—— 他自认的核心矛盾（不想收费 vs 社会义务最有效），带原话，可直接引用。
4. **XP 第二版的自我推翻**（§D12）—— "stay aware, adapt, change" 用在自己身上，删掉的实践清单具体可查。
5. **"tree shaker, not jelly maker" 的自我定义**（§D23）—— **这一条能解释他一半以上的"言行不一致"**，建议作为整个 Skill 的元解释。

**最需要注意的两处冲突（不要调和）**：

- **C3 是否从一开始就用 TDD**：Fowler 说没有，2026 播客转述说 Beck 用了"自己的测试想法"。
- **SUnit 的年份**：他本人说 1994，百科系记 1989。

**信息不足的方向**（如需补，建议定向再检索）：
- JUnit 与 Erich Gamma 合作的**具体过程**（谁提议、怎么分工、为什么叫 JUnit）——本次所有检索路径都只有二手转述
- 《TDD by Example》**书中**的三种实现策略（fake it / triangulate / obvious）的 Beck 本人总结文字
- **2014 年 "Is TDD Dead?" 的原始视频/播客内容**（本环境 YouTube 与 Google 域不可达）
- **C3 项目的第一手参与者记录**（Fowler 明确说"我没见过基于事实的分析"，这本身是一个信息缺口）
