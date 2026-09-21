# Kent Beck 他者视角与批评调研

> 女娲·Skill造人术 — Agent 4（他者视角维度）
> 调研对象：Kent Beck（1961 年生，XP 创始人、TDD 提出者、JUnit/SUnit 作者、敏捷宣言 17 位署名人之一、《Tidy First?》作者）
> 本维度专责：**负面评价、批评、分歧、误读**。赞美仅作为对照保留。
> 调研日期：2026-09（以检索时可得的最新页面为准）

---

## 0. 调研说明

### 0.1 本次调研的检索环境与限制（必须如实标注）

本次调研的搜索引擎可用性经实测（free_search_test），结果如下：

| 引擎 | 状态 | 说明 |
|---|---|---|
| bing | OK（质量极差） | 对英文技术查询返回中文烟草/百科类噪声结果，几乎不可用，本轮基本弃用 |
| anysearch | 部分可用 | 中途返回 `AnySearch API error (HTTP 402)`，后自动降级到 keenable |
| keenable | OK | 本轮实际主力引擎（多数结果检索自它） |
| deepseek-official | OK（未作为主用） | 测试通过，未深度使用 |
| ddg / ddg-lite | FAIL | connection error: fetch failed |
| searxng | FAIL | 全部实例 aborted |
| exa | FAIL | HTTP 429 |
| tavily | FAIL | hourly_cap_reached |
| firecrawl | FAIL | HTTP 429 |
| parallel / perplexity | FAIL | 未配置 API key |

**结论**：主力检索实际由 **keenable** 承担，部分由 **anysearch** 承担。所有未能换引擎取得的内容，本文标注「未核实」。凡涉及引擎切换或降级的检索，在对应条目下以 `[引擎：keenable]` 之类标注。

### 0.2 访问限制（影响取证）

以下站点在本环境下**无法访问**，因此相关引文只能依赖二手转述或寄存于其他站点的镜像，本文逐条标注：

- `en.wikipedia.org`、`medium.com`、`www.reddit.com`、`news.ycombinator.com`、`www.facebook.com`、`goodreads.com`、`app.thestorygraph.com` —— 域名解析到非公网 IP 或被拒（`URL hostname resolves to a non-public IP address` / `fetch failed`）。
- `infoq.com` —— 返回 HTTP 405 + Human Verification 页，正文不可得。
- `david.heinemeierhansson.com` —— **域名已失效**（`getaddrinfo ENOTFOUND`）。DHH 2014 年两篇原始文章（《TDD is dead. Long live testing》《Test-induced design damage》）现无法直接取证，只能通过 Fowler 纪要中的 URL 引用与其转述、以及 Uncle Bob 的引用来还原。这一点很重要：**DHH 那两篇原文的完整措辞，本次未核实，仅有转述与摘句。**
- `dl.acm.org`、`ieeexplore.ieee.org`、`doi.org`（Springer 跳转 idp.springer.com）—— 付费墙/跨域重定向，正文不可得。
- Reddit、HN 的讨论帖无法直接读取，相关观点只能通过二手博客转述，标注为 [二手]。

### 0.3 信源分级约定

- `[一手]`：当事人本人撰写/发表的原文（博客、通讯、官方纪要、本人讲话转录）。
- `[二手]`：他人转述、评论、书评、媒体报道、研究者的综述。
- `[推断]`：萧潇基于已有材料做的推理，**明确不是材料原话**。
- 所有无法证实的说法一律写「未核实」，不做补全。

### 0.4 一个重要的事实更正（请主子先看这条）

任务简报中把 **《The Worst Programmer I Know》列为 Kent Beck 的作品**。**这是误记。** 经核实：

- 《The Worst Programmer I Know》作者是 **Dan North**（BDD 提出者），发表于 **2023 年 9 月 2 日**，URL：<https://dannorth.net/blog/the-worst-programmer/>。文中主角是 **Tim Mackinnon**（不是 Beck），文章主旨是反对个人生产力度量（story points 归零的"最差程序员"其实是团队最有效的粘合剂）。[一手]

这一点在本维度里很关键：**这篇文章是"别人怎么看 Beck 式价值观"的旁证，而不是 Beck 自己的文字。** 若把它当作 Beck 的著作蒸馏进 Skill，会直接污染人格基线。本文按事实归位，并把它放到「第 6 章：与其他同行对比表」与「第 7 章：行为模式」中作为对照材料使用。

---

## 1. 主要批评清单

按批评者归类。每条给出：批评者 / 原话或转述 / 出处 / 是否成立与 Beck 如何回应。

### 1.1 David Heinemeier Hansson（DHH，Ruby on Rails 作者、37signals 创始人）

**批评 1：TDD 已经死了，且是被"教条化"杀死的**

DHH 于 2014 年 RailsConf 主题演讲中公开表达对 TDD 与单元测试的不满，随后写博客宣告「TDD is dead」。Fowler 纪要中的记述：

> "This conversation began as a consequence to **David's RailsConf keynote** where he expressed his unhappiness with TDD and Unit Testing in the Rails community. He shortly followed this with some blog posts, the first of which declared that **"TDD is dead"**." [一手，Martin Fowler 纪要，<https://martinfowler.com/articles/is-tdd-dead/>]

**批评 2：测试诱发的设计损伤（Test-Induced Design Damage）**

> "David feels that using TDD leads to approaches such as hexagonal rails that is **test-induced design damage** due to the complexity of excessive indirection." [一手，Fowler 纪要第 2 集]

> "But in response to David's question about mocks, he said he rarely uses them, he's concerned that those that do often find refactoring difficult, while he finds testing makes refactoring easier." [一手，同上，第 1 集 —— 注意这是 Fowler 描述 Beck 的回应]

Fowler 转述 DHH 的核心担忧：

> "What matters to David isn't the specific example, so much as **the unnecessary indirection and complexity required to make it easier to test in isolation**." [一手，Fowler 纪要第 2 集]

**批评 3：TDD 的成功导致 QA 被忽视**

> "David introduced the topic that **TDD's success had led to a neglect of QA**. Many shops took on TDD and got rid of QA... He thinks TDD got programmers to where **"they got so over-confident that they felt they didn't need QA"**... **"I don't think you can work on anything of material quality and produce great software without having somebody who's not _you_ test it."**" [一手，Fowler 纪要第 3 集]

**批评 4：测试的成本被系统性忽略**

> "David starts by saying **"to talk about trade-offs, you really have to understand the drawbacks, because if there are no drawbacks there are no trade-offs."** ... **The other issue is that to understand trade-offs you have to understand the costs, all the talk of TDD has been on the benefits. This neglect of costs is why people cannot comprehend that there is such a thing as test-induced damage.**" [一手，Fowler 纪要第 3 集]

**批评 5：过度测试（over-testing）与测试代码的维护负担**

> "The first issue he wanted to raise was over-testing. It's often said you shouldn't write a line of code without a failing test, at first this seems reasonable but it can lead to over-testing, such as **where there are four lines of test code for every line of production code**. This means that when you need to change behavior, **you have more code to change**." [一手，Fowler 纪要第 4 集]

**批评 6：测试被抬高到高于生产代码的地位**

> "Now he's concerned that **people think tests are more important than functional code**. Connected with this is an under-emphasis on the refactor part of the TDD cycle. All this leads to insufficient energy to refactoring and keeping the code clear." [一手，Fowler 纪要第 4 集]

DHH 还在第 4 集点出「量化陷阱」：

> "David said we often focus on things we can quantify, but **you can't reduce design quality to a number** — so people prioritize things that are low on the list like test speed, coverage, and ratios. **These things are honey traps, and we need to be aware of their siren calls.**" [一手，Fowler 纪要第 4 集]

他对 Cucumber 的态度也很尖锐：

> "**Cucumber really gets his goat** - glorification of a testing environment rather than production code. Only useful in the largely imaginary sweetspot of writing tests with non-technical stakeholders." [一手，Fowler 纪要第 4 集]

**批评 7（关键，且被广泛引用）："faith-based TDD"**

这是这场争论中最锋利的一句，出自第 2 集：

> "Kent accused David of not having enough self-confidence, maybe you can't see the insight today, so you have to make progress in the meantime, but he's optimistic that he will find them eventually. **David dismissed this as "faith-based TDD"** - he used to feel this but got stuck in a depressing loop when he wasn't finding an ideal solution that wasn't there." [一手，Fowler 纪要第 2 集]

**批评 8：所谓"TDD 是死的"指的是被变异后的 TDD，不是 TDD 本身**

> "**When he says TDD is dead, he's referring to this current mutation** - we have to get back to first principles." [一手，Fowler 纪要第 5 集]

> "David said he started this discussion because **people wouldn't talk about cases where TDD wasn't effective**. They weren't feeling good or confident, but were told they must use TDD. **He wants to open the sphere of acceptable reactions** so we can discuss when TDD is and isn't appropriate." [一手，Fowler 纪要第 5 集]

**Beck 如何回应（DHH 线）**

Beck 的回应不是反驳，而是把它收进"权衡"框架。第 4 集开篇，Fowler 记下了 Beck 那句后来被反复引用的口头禅：

> "Kent replied **"it depends, and that's going to be the beginning to all of my answers to any question that's interesting"**." [一手，Fowler 纪要第 4 集]

第 1 集 Beck 的定位：

> "Kent said that programmers deserve to feel confident that their code works, TDD is **one (not the only) way** to reach that." [一手，Fowler 纪要第 1 集]

第 2 集 Beck 的比喻（很能代表他的性格）：

> "Kent said that ascribing test-induced damage to TDD was **like driving a car to a bad place and blaming the car for it**." [一手，Fowler 纪要第 2 集]

> "Kent countered that it was rather **one _design decision_ at a time**. TDD puts an evolutionary pressure on a design, people have different preferences for the grain-size of how much is covered by their tests." [一手，Fowler 纪要第 2 集]

第 2 集里 Beck 也自嘲了一句（针对"红绿重构上瘾"）：

> "David continued by saying that TDD's red/green/refactor flow was **very addictive** (**Kent observed that he's the poorest drug dealer on the planet**)." [一手，Fowler 纪要第 2 集]

第 5 集的最终立场：

> "He comes out **firmly contradicting David: TDD isn't dead**, but is glad David set fire to it so it could come out like a phoenix." [一手，Fowler 纪要第 5 集]

关于 2014 年那场争论里 Beck 自己的困惑，Harry Percival（《Test-Driven Development with Python》作者）在同期的博客里引了他的 Facebook 帖子：

> "I'm puzzled by the limits of TDD--it works so well for algorithm-y, data-structure-y code. I love the feeling of confidence I get when I use TDD. I love the sense that I have a series of achievable steps in front of me--can't imagine the implementation? no problem, you can always write a test. **I recognize that TDD loses value as tests take longer to run, as the number of possible faults per test failure increases, as tests become coupled to the implementation, and as tests lose fidelity with the production environment.** How far out can TDD be pushed? Are there special cases where TDD works surprisingly well? Poorly? **At what point is the cure worse than the disease?**" [一手转引，Beck 的 Facebook note，经 <http://www.obeythetestinggoat.com/kent-beck-on-the-limits-of-tdd.html> 转录；原始 Facebook URL 本环境无法访问]

**判断：批评是否成立？** 见第 2 章的"谁对谁错"小节。这里先给一个分档：[推断] DHH 的三条硬批评中，"TDD 常与重度 mock 绑定"这一条被 Fowler 认定为**前提错误**；"测试诱发设计损伤"这一条**部分成立但在归因上被 Beck 反驳**；"TDD 挤走 QA"这一条**Beck 基本承认**，只是争议在"跟什么比"。

### 1.2 John Ousterhout（斯坦福教授、《A Philosophy of Software Design》作者）

这是对 Beck 最"学术化"也最系统的一条批评线，而且 Beck **专门写文章回应**，材料质量很高。

**批评：TDD 与良好设计相冲突**

Ousterhout 在 The Pragmatic Engineer 播客（Gergely Orosz 访谈）中说：

> "Yeah, **I'm not a fan of TDD because I think it works against design**. So again, to me, tests are important. I love unit tests. I write them for everything I do. They're essential. If you're a responsible developer, you write unit tests with very high coverage. So let's agree on that.
>
> But we want the development process to be **focused on design**. I think that should be the center of everything we do in development should be organized towards getting the best possible design. And I think **TDD works against that because it encourages you to do a little tiny increment of design**." [一手转引，Ousterhout 播客原话，由 Beck 在 <https://newsletter.kentbeck.com/p/design-in-tdd> 中全文引用；播客原文 <https://newsletter.pragmaticengineer.com/p/the-philosophy-of-software-design>]

Ousterhout 书中的相关概念是"战术性编程（tactical programming）"——即只顾眼前让功能跑起来、不做设计投资。HN 上有读者转述：

> "In Philosophy of Software Design, J. Ousterhout says that this TDD practice encourages **"tactical programming"**, i.e. tryi[ng]..." [二手，HN 帖摘要，本环境 HN 不可直接访问，转引自搜索结果片段；**完整原句未核实**]

**Beck 如何回应（Ousterhout 线）—— 这是全文最完整的 Beck 式反驳**

Beck 2025 年 4 月 23 日写《Design in TDD》专文回应。要点：

(1) 承认"小步设计"这项指控成立，但反问为什么不行：

> "**Guilty as charged.** Why wouldn't you grow the structure like a tree grows? Reasons I can think of:
> - Local maxima. You grow to a design that turns out to be undesirable & you can't find a walkable path to the design you need.
> - Pressure. Once you have a running system, the pressure for the next feature & the next feature may prove so great that you begin to skimp on design.
> - Vision. Once you have behavior in place, the complexity may prevent you from seeing a more-desirable design.
>
> **Those are just my reasons. Prof. Ousterhout doesn't explain further.**" [一手，<https://newsletter.kentbeck.com/p/design-in-tdd>]

(2) 他主张增量风格自身的三个好处：

> "- Learning. The earlier you make design decisions, the less informed you are when you make those decisions. **The more you need to learn, the later you should design.**
> - Adaptation. Early decisions necessarily rest on assumptions about what features, what form of optionality, will be important. **The more the features flex from your original vision, the later you should design.**
> - Timing. The sooner you see features, the sooner you can validate the value & desirability of those features. **The greater the cost of delay, the later you should design.**
>
> Notice that I say **"later"**. The question is about _when_, not _whether_." [一手，同上]

(3) 直接顶回 Ousterhout 的核心命题——"设计最好"不是最高目标：

> "> the center of everything we do in development should be organized towards getting the best possible design
>
> **Disagree. And this is probably approaching the heart of our disagreement.** As an engineer I love love love when a design clicks into place... However…
>
> **I know that I can go too far. The structure world is a world of possibility. Of options. Some of those options need to be exercised or the project will die, run out of money, of energy, of runway.**
>
> And the alternative, designing like a tree designs, growing like a tree grows, is not so bad." [一手，同上]

(4) 他也指出 Ousterhout 忽视了"接口设计 vs 实现设计"的区分：

> "When I go to write a new test, I necessarily make **API design decisions**. (**Prof. Ousterhout doesn't talk much about the distinction between interface & implementation design that I've seen.**) If the existing API proves awkward, I can refine it now." [一手，同上]

**读者的反驳（对批评者的反批评）** —— 这条也值得记，因为它本身就是"他者视角"：

> "Note, **John does confess that he himself has not tried TDD flow**, he's only seen some examples of people/students who think they have tried TDD. **If my implementation of a practice is flawed, it's not to be taken as a reflection of the practice itself.**" —— 评论者 Aman [一手评论，同上]

> "One must use a single, consistent paradigm or technique for design. **That feels like a faulty assumption to me.** ... I love TDD for core domains, not so much for writing front-end code. ... Or when I encounter a codebase that wasn't built with TDD, I like using the C4 model to capture the current state ... before introducing behaviors, likely using TDD. So, **top-down until I can get to a place where emergent design works.**" —— 评论者 Dave Laribee [一手评论，同上]

### 1.3 Robert C. Martin（Uncle Bob）

Uncle Bob 与 Beck 不是敌对关系（他 2013 年写过《Extreme Programming, a Reflection》致谢 Beck），但在 TDD 的**强度**上分歧明显，且他自己承认过他教出来的东西出了问题。

**Uncle Bob 的立场（比 Beck 强硬得多）：**

> "TDD is important. TDD works. **TDD is a professional discipline that all programmers should learn and practice.** But it is not TDD that causes good or bad designs. _You_ do that." [一手，<http://blog.cleancoder.com/uncle-bob/2017/03/03/TDD-Harms-Architecture.html>]

**他明确承认 TDD 会伤害架构：**

> "**Can TDD harm your design and architecture? _Yes!_** If you don't employ design principles to evolve your production code, if you don't evolve the tests and code in opposite directions, if you don't treat the tests as part of your system, if you don't think about decoupling, separation and isolation, you will damage your design and architecture – TDD or no TDD." [一手，同上]

**他对自己早期实践的检讨（很罕见，也是对本维度有用的材料）：**

> "It, frankly, **took me many years to realize this**. If you look at the structure of FitNesse, which we began writing in 2001, you will see a **strong one-to-one correspondence between the test classes and the production code classes**. Indeed, I used to tout this as an advantage... And, of course, we experienced some of the problems that you would expect with such a sinister design. **We had fragile tests. We had structures made rigid by the tests. We felt the pain of TDD.**" [一手，同上]

**他与 Beck 在"架构是否从 TDD 涌现"上的分歧：**

> "The idea that the high level design and architecture of a system **emerge** from TDD is, frankly, **absurd**. Before you begin to code any software project, you need to have some architectural vision in place. **TDD will not, and can not, provide this vision.** That is not TDD's role." [一手，同上]

另据 Uncle Bob 自述，他 2013 年在与 James Coplien 的访谈中，对"架构从 TDD 涌现"这一说法的用词是：

> "The term I used, in that interview was, I believe – **Horse shit**." [一手，同上]

**⚠️ 归因风险提示**：[推断] Uncle Bob 说的"架构不从 TDD 涌现"其实**并不与 Beck 冲突**——Beck 自己从不主张高层架构靠 TDD 长出来（《Tidy First?》里他讲的是"小的结构改动"，以及 Canon TDD 里明确说第 1 步就是列 Test List、第 4 步才 refactor）。真正冲突的是**语气**：Uncle Bob 说"所有程序员都应该学并且实践"（三大定律、professional discipline），Beck 说"这是 strawman 防御，不是金科玉律，没有金星奖章"：

> "**What follows is NOT how _you_ should _do_ TDD. Take responsibility for the quality of your work however you choose, as long as you actually take responsibility.**
> What follows is my response to "TDD suckz dude because <something that isn't TDD>"... **If you're going to critique something, critique the actual thing.**"
>
> "If you're doing something different than the following workflow & it works for you, congratulations! **It's not Canon TDD, but who cares? There's no gold star for following these steps exactly.**
> ... **I'm not telling you how to program. I'm not charging for gold stars.**" [一手，Kent Beck《Canon TDD》，2023-12-11，<https://newsletter.kentbeck.com/p/canon-tdd>]

这就是"**Uncle Bob 的 TDD 教条 vs Beck 的宽松**"最直接的原文对照。

### 1.4 James O. Coplien

**批评：《为什么大部分单元测试是浪费》**

原文标题《Why Most Unit Testing is Waste》，2014 年首发于 rbcs-us.com（该域名现不可访问），全文被多方转载。最广为引用的一句（HN 讨论串标题引用）：

> "**Throw away tests that haven't failed in a year.**" [一手转引；HN 讨论 <https://news.ycombinator.com/item?id=13815779> 本环境不可直访，引文来自搜索片段与转载全文；**完整上下文未核实**]

原文全文可在 gist 镜像读到：<https://gist.github.com/ktzar/596ee5aae7c41f2e585331e4b71d1e2c> [二手镜像，未逐字核验全文]

Coplien 也是"架构不从 TDD 涌现"这句话的共同持有者（见上面 Uncle Bob 引用的那场 InfoQ 访谈）。该访谈 URL 为 <https://www.infoq.com/interviews/coplien-martin-tdd>，**本环境不可访问，未核实全文**。

**业界的反驳（对批评的反驳）**：Dave Nicolette（NeoPragma）写了长文《Against TDD》，逐条拆解了同类的"反 TDD"论证（他引用的是 Quora 上 Steven Grimm 的四点）：[一手，<https://neopragma.com/2019/09/against-tdd/>]

> "Test-Driven Development (TDD) is a tool. To get value from a tool, it's necessary to: 1. choose the right tool for the job; and 2. use the tool properly. ... **In a nutshell, the logic goes like this: I once hit my thumb with a hammer; therefore, hammers don't work.**"

> "**When people _use_ TDD in that manner, they end up in whatever ditch they dig for themselves; but they would end up in that ditch regardless of what kind of shovel they used to dig it. TDD doesn't "cause" good or bad design. Neither do any other tools or techniques. That's on us.**" [一手，同上]

Nicolette 还直接攻击了"要证据"这一诉求本身，这对承接第 3 章的实证研究会话很关键：

> "**If you are in favor of TDD, you can find studies to support your view; if you are opposed to TDD, you can find studies to support your view.**"
>
> "The quality of academic research in the field of application software development is open to question. ... Nearly all of them fall into one of three categories: **The researchers did not understand what they were observing...; The experiment was set up poorly...; The number of observations was insufficient to draw any conclusions (but the authors drew conclusions anyway).**" [一手，<https://neopragma.com/2019/09/against-tdd/>]

**⚠️ 保留矛盾**：Nicolette 的这段话是**明确否认学术证据可用性的**；而第 3 章引用的学者（Rafique & Mišić、Ghafari 等）恰恰是**认为学术证据可用、只是需要更严谨设计**。这两种立场在本维度中**不调和**，并列呈上，请主子自行判断权重。

### 1.5 对 XP（极限编程）本身的批评

XP 是被批评得最多的一套，攻击点主要集中在四类：**过于理想化 / 结对编程的成本 / 对"勇气"的依赖 / 被 Scrum 与"敏捷工业"稀释**。

#### 1.5.1 "过于理想化 / 只在理想条件下可行"

Coplien、以及大量敏捷圈外的工程师长期主张 XP 的实践包（结对、集体代码所有权、现场客户、可持续节奏）需要一种多数组织不具备的前提条件。这条批评**本次未找到 Beck 本人正面回应的原文**，标注「未核实 Beck 的针对性回应」。但可以从 Beck 自己在 2020 年接受 Built In 采访时的表态看出他并不认为 XP 被完好继承：

> "**It's a devastated wasteland. The life has been sucked out of it. It's a few religious rituals carried out by people who don't understand the purpose that those rituals were intended to serve in the first place.**"

（问：你差不多 20 年前签了敏捷宣言，现在怎么看敏捷？）[一手，Built In 采访，Tatum Hunter 撰，2020-08-18，<https://builtin.com/articles/kent-beck-programmers-compassion>]

这条对"被 Scrum/敏捷工业化的偏离"这条批评线是**决定性的一手材料**：**Beck 本人比批评者更激烈。** 他不是被批评后才松口，而是自己用了 quite 重的词。

#### 1.5.2 结对编程的成本

XP 要求两人一机，直觉上人力成本翻倍。学术侧最常被引用的是 Alistair Cockburn（敏捷宣言署名人之一）与 Laurie Williams 的成本收益研究。Anthony Sciamanna 的综述文章标题直指这一点，并引了该研究：

> "**The Costs and Benefits of Pair Programming** — Agile Manifesto co-author Alistair Cockburn and Laurie Williams (from the Uni[versity of Utah])" [二手，<https://anthonysciamanna.com/2017/11/30/misconceptions-of-pair-programming.html>；该论文原始 PDF 本环境两次抓取失败（`fetch failed`），**未核实原文数字**]

微软体系内的调查研究（University of Auckland 的 David Parsons 等）标题就把结论写在了脸上：

> "**Better, Not More Expensive, Faster? The Perceived Effects of Pair Programming in Survey Data**" [一手论文标题，<https://aisel.aisnet.org/cgi/viewcontent.cgi?article=1020&context=acis2008>；论文正文未逐字核验]

另有从实践者角度的直接质疑：

> "One of the mantras of agile is that **Pair Programming is universally good**; some teams even [require it]" —— cdegroot.com，2018-01-25 [二手，<http://cdegroot.com/programming/agile/2018/01/25/pair-programming.html>；该文正文本次未抓取，仅有搜索片段，**完整论证未核实**]

以及一份 2025 年的批评文（把结对编程列在"听起来好但与人性冲突的实践"第一位）：

> "Pair Programming is a core rule of eXtreme Progr[amming]..." [二手，<https://agileway.substack.com/p/software-practices-that-sound-good>；**正文未抓取，未核实**]

**⚠️ 事实缺口声明**：关于结对编程**成本翻倍是否被研究证实**这一点，本次检索**未能取得可靠的一手数据来源**（Cockburn/Williams 原论文、Williams 的后续 meta 分析均未成功抓取）。**标注「未核实」。不得在 Skill 中把它写成确定结论。**

#### 1.5.3 对"勇气（Courage）"这一价值观的依赖

XP 的五条价值观是 Communication / Simplicity / Feedback / Courage / Respect。批评者认为把"勇气"写进方法论等于把成败推给个体性格——**组织不给安全空间，就没有勇气，方法就塌了**。

本次检索**未找到针对"勇气"这一条的系统性批评原文**。标注「未核实」。但有一条强相关的一手侧证，来自 Uncle Bob 对 Scrum 的批评（同样的问题结构）：

> "**Successful use of Scrum depends on people becoming more proficient in living five values: Commitment, Focus, Openness, Respect, and Courage.** ... **If I were to encounter a so-called Scrum effort where people were not living those values, I'd be inclined to blow my whistle and flag a serious problem.**" [一手转引，Ron Jeffries 文中引用 Scrum 官方说法，<https://ronjeffries.com/articles/-z022/0222ff/probably-wrong>]

[推断] "把价值观写进方法论"这一结构性问题，Beck 的 XP 与 Scrum 共享；但**本次没有找到有人专门就 XP 的 Courage 展开长篇批评**，因此这条在本维度里标为**存疑，不构成已证批评**。

#### 1.5.4 被 Scrum 与"敏捷工业"稀释（含 Beck 自己的判断）

Ron Jeffries（XP 三位创始人之一，与 Beck、Ward Cunningham 并列）在 2014 年写过一篇被反复引用的文章《Language of Hatred: Must We?》，专门驳斥"用仇恨语言谈敏捷"的风气：

> "Many people – or maybe it's just a few loud people – use the language of hatred to discuss topics around Agile, Scrum, XP, TDD... Here are a few paraphrased examples:
> - Scrum is a religion
> - **TDD doesn't work**
> - Unit tests are a bad idea
> - Scrum meetings are bullshit
> - Everyone in Agile is just in it for the money
>
> And not only is it irritating, it's not helpful. **Literally not helpful.** These statements do not help anyone in any way."

> "**TDD is a tool, and like all tools, it does not fit every situation. In addition, like every tool, it needs to be used with some skill.**" [一手，Ron Jeffries，2014-11-22，<https://ronjeffries.com/articles/language-of-hatred>]

**这是一个极其重要的对照点**：Ron Jeffries 与 Beck 在"TDD 是工具、不是戒律"上是**一致**的，站在 DHH 的对立面（但方法上是"别用仇恨语言"，而非"你说错了"）。

Fowler 对"敏捷标签赢了但敏捷没赢"的判断（第 5 集）：

> "I disagree that agile has won - **the label has won, but many people say they do agile but don't really. This is typical for things like this, a process I call semantic diffusion.**" [一手，Fowler 纪要第 5 集]

DHH 的观察：

> "**most people can't leave good ideas the fuck alone.** TDD and Agile are very broad tents now. People who say they are doing agile do opposite things." [一手，Fowler 纪要第 5 集]

Beck 的记录：

> "Kent remembers the first OOPSLA when XP got attention, **Jim Rumbaugh said you won't recognize what happens to XP in ten years and he was right.**" [一手，Fowler 纪要第 5 集]

Beck 对"敏捷"这个词本身的不认同（2026 年播客，比 2020 年的 "devastated wasteland" 更系统）：

> "**Calling it "agile" was an error.** Kent objected to the word "agile" at the time, and still does today, since **nobody claims they prefer "rigid" development, and everyone says they're "agile", even when they're not.** He would've preferred a less spacious term, like with "extreme programming": after all, it's hard to call yourself an "extreme programmer" without actually following that methodology." [一手转述，Gergely Orosz，《How Kent Beck shapes the software engineering industry》，2026-07-01，<https://newsletter.pragmaticengineer.com/p/how-kent-beck-shapes-the-software>]

### 1.6 《Tidy First?》的批评

**总体氛围**：《Tidy First?》在开发者社区的口碑**以正面为主**，因此"批评清单"这一节必须如实说明：**本维度没有找到对这本书的严厉批评，找到的负面意见集中在"太短/太贵/像博客合集/想要更多"这四点上。**

#### 1.6.1 "太短、留白太多"

> "Tidy First? is a new book by Kent Beck. **It is a short little book, only about 100 pages (and lots of white space on them)**, but it contains some deep insights about software development." —— Henrik Warne [二手，<https://henrikwarne.com/2024/01/10/tidy-first/>]

> "**92 pages divided into 33 Chapters** with some code examples and explanatory schemas." —— Alex Ragalie [二手，<https://www.aragalie.com/tidy-first-by-kent-beck/>]

参差的数据：Goodreads/出版信息里出现 99 页（itenium 的读书笔记写"Pages: 99 ISBN: 9781098151249"），Ragalie 写 92 页，Warne 写"约 100 页"。**页数口径不一致，标记为 [冲突]，不强行统一。**

#### 1.6.2 "太贵（性价比）"

[Ragalie 的书评配图里专门拍了一张"书的厚度"照片](https://www.aragalie.com/tidy-first-by-kent-beck/)，并在"I would have really loved a longer book"下隐含了厚度-价格不成比例的抱怨（配图说明为 "Cover and Spread of the book" / "Book thickness"）。**这是间接证据，不是明确的价格批评。** 本次检索**未找到直接且完整的"太贵"批评原文**，标注「部分未核实」。

有一条来自读者侧的明确"我知道它短，而且是好事"的表态，可作为反证：

> "I read through "Tidy First?" a couple times this weekend (**it's short, thank you Kent Beck!**)" —— Ethan Schlenker，LinkedIn [二手，<https://www.linkedin.com/posts/ethanschlenker_book-club-tidy-first-free-tools-ethan-activity-7163637989082849280-aVky>]

#### 1.6.3 "像博客合集"

StoryGraph 的读者评论页在搜索结果摘要里留下了这样一句（**注意：该页面本环境返回 403 Cloudflare 拦截，正文未核实，仅摘到搜索片段**）：

> "The ideas were solid but **the blog posts** ..." —— StoryGraph《Tidy First?》读者评论聚合页 [二手片段，<https://app.thestorygraph.com/book_reviews/cdfb0243-decf-45ef-811a-0a221dff4332?sort=latest&page=2>；**完整句子未核实，不得补全**]

[Ragalie 的书评直接点出了这本书的形式问题但把它转成优点](https://www.aragalie.com/tidy-first-by-kent-beck/)：

> "I realize I'm being particularly abstract in my review so far, and this is on purpose: **this is a very small book that you can definitely read in a long evening**, but packed with incredibly smart advice... **It's something that must be experienced, and it's very hard in my view to describe and pick apart the concepts Kent exposes here without basically copy/pasting the book.**" [二手，同上]

以及：

> "**It really is a fantastic little tome!**" / "I would have really loved a longer book, but in today's attention span of people I think that Kent is onto something with his current approach of **writing more, and smaller, books on very narrow topics**." [二手，同上]

**⚠️ 值得注意的一个"形式 vs 实质"细节**：本书的章节结构确实是**极度微博化**的——Warne 的读书笔记描述：

> "There are 15 tidyings, and they are **presented in very short, almost tweet-like, chapters**." [二手，<https://henrikwarne.com/2024/01/10/tidy-first/>]

[推断] "像博客合集"这个批评的**事实基础是成立的**（书的体裁确实接近结集式短文），但**把它当作贬义则见仁见智**——即 Beck 在书中保留了大量"未定论 / 看情况"的语气（书名带问号本身就是这个意思）。**这条批评的方向应当标为"体裁批评"，不是"内容批评"。**

#### 1.6.4 "tidy first 在实践中难落地"

Warne 的读书笔记提出了最具体的一条落地困难——**行为改动与结构改动会缠在一起**：

> "**A problem I often encounter is that once you start making behavior changes, you see structural changes that should be done. This results in a mix of B and S changes. Separating them out can be hard.** There is a good discussion on how to handle this in the chapter _Getting Untangled_. Either you ship it as it is (tangled), or you untangle the different changes (I have been doing this using git's interactive rebase), or you discard all the changes and re-implement the changes. **The last option sounds a bit crazy**, but the author thinks that this may lead to even better code in the end." [二手，<https://henrikwarne.com/2024/01/10/tidy-first/>]

Warne 还点出了组织层面的真实阻力：

> "In many work places, there are high fixed costs (in time and effort) associated with PR reviews. The ideal solution for this, according to the author, is to **not require PR reviews for only tidyings**. If this is not feasible, then at least keep the changes in separate commits." [二手，同上]

还有一条文化层面的落地难题（Warne 提出但 Beck 书里只给了方向）：

> "**I have noticed that many developers are reluctant to introduce explaining variables/constants.**" [二手，同上]

**这一节的核心结论** [推断]：所谓"难落地"的批评，实质是**协作成本与提交纪律**问题（PR 评审成本、commit 拆分、团队是否接受"只 tidy 的 PR 免评审"），而不是 tidy first 这个想法本身不成立。Beck 在书里给了方案（分开 commit / 分开 PR），但**解决方案依赖团队制度配合**——这是批评成立的部分。

#### 1.6.5 "与 Fowler 的重构有何区别？"

这条批评（质疑 tidyings 与 refactoring 是不是同一件事换个名字）**本次检索未找到明确的、可引用的批评原文**。标注「未核实批评」。

但**可以给出事实性的区分**（[推断]，基于两边的一手材料）：

| 维度 | Fowler 的重构（Refactoring） | Beck 的 tidyings（Tidy First?） |
|---|---|---|
| 定位 | 一整套"行为不变的结构调整"技术目录（含命名、机械化步骤、坏味道目录） | 15 个"几乎平凡简单"的小结构动作 |
| 粒度 | 可大可小，Lint 到大规模（Extract Class、Introduce Parameter Object…） | 故意极小（空行分块、guard clause、死代码、解释变量…） |
| 核心问题 | "怎么做"（手法） | "什么时候做"（时机）与"做多少"（权衡） |
| 理论基座 | 演化式设计、坏味道 | **货币时间价值 + 期权（optionality）** |
| 两者关系 | 被 《Tidy First?》 视为**上游/并列**的工具箱；Beck 的书在 Part III 用的是经济学框架，而非重构手法目录 | 见下 |

Beck 自己的理论表达（Warne 转述）：

> "**How do we balance keeping the program well-structured with the need to add behavior?** Now we get to perhaps my favorite part of the book – relating software development to the concepts of **_time value of money_ and _optionality_**. **These are in tension with each other, and explain the question mark in the title.**" [二手转述，<https://henrikwarne.com/2024/01/10/tidy-first/>]

> "**Constantine's Equivalence** states that the cost of software is roughly equal to the cost of changing it. This cost of change is dominated by the cost of the big, cascading changes. Therefore, **the cost of software is approximately equal to the coupling.**" [二手转述，同上]

而 Fowler 那边提供的是**边界条件**（哪类行为不违反 YAGNI）：

> "**Yagni only applies to capabilities built into the software to support a presumptive feature, it does not apply to effort to make the software easier to modify.** ... expending effort on refactoring isn't a violation of yagni because refactoring makes the code more malleable." [一手，Fowler《Yagni》，2015-05-26，<https://martinfowler.com/bliki/Yagni.html>]

**⚠️ 注意一个事实**：Fowler 的 bliki 里**没有** "TidyFirst" 条目（本次检索未发现）；Fowler 与 Beck 在 Tidy First 上的"分工"**主要是读者与评论者的划分，不是两人公开的分工宣言**。[推断]

### 1.7 Simple Design / YAGNI 被滥用的批评，以及 Beck 的回应

这是**Beck 主动承认"被误读"并专文澄清**的一条线，材料质量最高。

**批评：YAGNI 被当成"不做设计的借口"**

Beck 在 2026 年 6 月 25 日的通讯里明确点名了这条批评：

> "**YAGNI is not an excuse to never design as some critics have characterized it. If you need it, build it. YAGNI is a meditation on timing. Building structure too soon is as risky as building structure too late.**" [一手，<https://newsletter.kentbeck.com/p/the-cost-yagni-was-never-about>]

**他对 YAGNI 起源的第一手记忆（与 Fowler 的版本可对照）：**

> "Here's how I remember it—**Chet Hendrickson** came up to me in the middle of a project and said, "I could do this simplistic thing now but in 3 weeks that will be insufficient so since we're going to need this more complicated thing I want to do it now."
> I said, "You aren't going to need it."
> Chet said, "You don't understand. We're definitely going to need it. See, here's an example…"
> Me (interrupting), "You aren't going to need it."
> Chet, get frustrated, "But we really are…"
> Me, "You aren't going to need it."
> Chet, eyes going up to the ceiling, pausing, "Oh." Walks away." [一手，同上]

Fowler 的版本（可交叉验证，两者一致）：

> "The origin of the phrase is an early conversation between Kent Beck and Chet Hendrickson on the **C3** project. Chet came up to Kent with a series of capabilities that the system would soon need, to each one Kent replied "you aren't going to need it"." [一手，Fowler《Yagni》]

**Beck 对"YAGNI 被误解为省钱规则"的核心纠正（很有理论含量）：**

> "Most people think YAGNI—You Aren't Gonna Need It—is **a thrift rule**. Don't write code you don't need yet, because writing code is expensive. Save the effort.
> **That's wrong, and the error matters more now than it used to.**
> YAGNI is not about the cost of producing code. **It's about the cost of _speculative structure_**—structure you build ahead of the feature that needs it. Speculative structure sends you two bills. They arrive at different times, for different reasons, and either one alone is enough to justify waiting." [一手，同上]

两张"账单"：

> "**The first bill: optionality.** When you build structure before the feature arrives, you're committing on a guess. ... **Even a _correct_ guess leaves you worse off than not committing.** The value was never in the structure. The value was in the option to build the right structure once you knew. **Building early spends that option.** ... **Waiting is not laziness. Waiting is holding an asset.**"
>
> "**The second bill: NPV.** Money has time value. So do features. ... **This bill comes due _even when your guess is right_.** Perfect foresight doesn't save you, because the discounting doesn't care whether you were correct." [一手，同上]

**他的 AI 时代补充（针对"现在生成代码很便宜，YAGNI 过时了"这一新批评）：**

> "**If YAGNI were about saving effort, cheap generation would retire it. It isn't, so it doesn't.** Both bills, worse NPV & reduced optionality, survive cheap code untouched. ... **Free generation doesn't weaken YAGNI. It makes the violation cheaper to commit, which is worse.** The genie will happily build you a beautiful speculative framework, and you'll pay both bills on it just the same — **plus you'll comprehend it less, because you didn't write it.**" [一手，同上]

**Fowler 那边的补充（同一问题的另一面，可视为分工）：**

> "Yagni is not a justification for neglecting the health of your code base. **Yagni requires (and enables) malleable code.**"
>
> "**Yagni only applies when you introduce extra complexity now that you won't take advantage of until later. If you do something for a future need that doesn't actually increase the complexity of the software, then there's no reason to invoke yagni.**"
>
> "Having said all this, **there are times when applying yagni does cause a problem**, and you are faced with an expensive change when an earlier change would have been much cheaper. The tricky thing here is that **these cases are hard to spot in advance, and much easier to remember than the cases where yagni saved effort**." [一手，Fowler《Yagni》]

**Fowler 引用的经验数据（对"猜错的概率"给出了量化）：**

> "the **cost of delay** due to the presumptive feature ... preferably factoring in the probability that you're building an unnecessary feature, **for which your odds are at least ⅔**."
> 脚注："The ⅔ number is suggested by Kohavi et al, who analyzed the value of features built and deployed on products at microsoft and found that, **even with careful up-front analysis, only ⅓ of them improved the metrics they were designed to improve**." [一手，Fowler《Yagni》，引 Kohavi et al 的 Microsoft 实验数据]

**⚠️ 与 Beck 的微妙差异（本维度要点之一）**：Beck 说 YAGNI **不是**关于"写代码的成本"，而是关于"投机性结构的成本"；Fowler 的表述里**同时**讨论了 cost of build / cost of delay / cost of carry / cost of repair 四类成本，其中**明确包含 cost of build**。两人**不冲突但侧重不同**：Beck 更"纯粹"地剥离了打字成本，Fowler 保留了它作为整体成本账的一行。**这里保留双方原文，不调和。**

### 1.8 "The Worst Programmer I Know" 与 "1000x programmer" 引发的讨论与误读

#### 1.8.1 归因更正（已在 §0.4 说明）

《The Worst Programmer I Know》= **Dan North** 2023-09-02，<https://dannorth.net/blog/the-worst-programmer/>。主角 **Tim Mackinnon**。原文核心：

> "The great thing about measuring developer productivity is that **you can quickly identify the bad programmers**. I want to tell you about the worst programmer I know, and why I fought to keep him in the team."

> "**Tim's score was consistently zero. Zero! Not just low, or trending downwards, but literally zero.** ... Well Tim clearly had to go. This was the manager's conclusion... And **I flatly refused. It wasn't even a hard decision for me, I just said no.**"

> "You see, the reason that Tim's productivity score was zero, was that **_he never signed up for any stories_**. Instead he would spend his day pairing with different teammates. With less experienced developers he would patiently let them drive whilst nudging them towards a solution. ... often as **Socratic questions**, what ifs, how elses."

> "**Tim wasn't delivering software; Tim was delivering a team that was delivering software.** The entire team became more effective, more productive, more aligned, more idiomatic, more _fun_, because Tim was in the team."

> "**Just don't try to measure the individual contribution of a unit in a complex adaptive system, because the premise of the question is flawed.**"

> "**DORA metrics, for example, are about how the system of work works... They measure the engine, not the contribution of individual pistons**, because that makes no sense." [全部一手，Dan North，如上 URL]

**引发的讨论与误读**（本次 HN 原文不可访问，只能用可得的二手转述）：

- Hacker News 讨论串 id `43452649`，标题记为 "The Worst Programmer I Know (2023)"，时间 2025-03-23。**该帖本环境不可直访。**
- InfoWorld 转载了此文（<https://www.infoworld.com/article/3542246/the-worst-programmer-i-know.html>），**页面正文抓取被截断，仅有标题与首段可证**。
- Pointer 通讯把它列为 "Free" 推荐文章，摘要：**"Dan introduces us to Tim Mackinnon, a programmer whose p[roductivity metrics were zero]"** [二手，<https://pointerio.substack.com/p/issue-445>]
- Dev Interrupted 的通讯把它放进"世界上最差的程序员之一"、"被引用为反对个人开发者度量理由"的语境 [二手，<https://devinterrupted.substack.com/p/career-journey-2-essentials-skills>]
- 该文与 **McKinsey 开发者生产力度量报告**引发的反弹是同一波讨论 [二手，<https://mozaicworks.com/blog/reactions-to-mckinseys-dev-productivity-metrics-kent-beck-gergely-orosz-and-dan-north>]

#### 1.8.2 误读方向（[推断]，基于上述材料的共性）

[推断] 这篇文章最常见的两种误读是：

1. **把它读成"结对编程万能"** —— 但 North 讲的是**团队级系统效应不可归因到个人**，而不是"每个人都要整天结对"。
2. **把它读成反度量** —— North 明确说 "Measure productivity by all means—I'm all for accountability—ideally as tangible business impact expressed in dollars saved, generated, or protected."

#### 1.8.3 "1000x / 10x programmer"

**⚠️ 本次检索未找到 Kent Beck 本人关于 "1000x programmer" 的原始文章或言论。** 标注「**未核实**」。

得到的相关材料是**非 Beck 的一手/二手**：

- Dan North 在同一篇《Programming is not a craft》里给出了他自己的倍数判断（这是他个人经验，不是 Beck 的观点）：

> "**The oft-quoted figures of tenfold increase in productivity of expert versus novice programmers are wrong by orders of magnitude in my experience.** A really great programmer (and I've been lucky enough to work with a handful over the years) can out-perform a doing-it-for-the-money programmer by **orders of literally hundreds**, delivering in hours or days what would take an average developer weeks or months." [一手，<https://dannorth.net/blog/programming-is-not-a-craft/>]

- HN 上对 "10x" 概念的持续争论（多帖，本环境不可直访）：`item?id=9295659`（10X Programmer and Other Software Engineering Myths）、`item?id=6464261`（The Myth of the Rockstar Programmer）、`item?id=28802555`。
- Gergely Orosz 与 Beck 合写过《Measuring developer productivity? A response to McKinsey》，这是 Beck 关于"度量"立场的**可核实出处**（本次未抓取正文，标注「未核实正文」）[一手合著，<https://newsletter.pragmaticengineer.com/p/measuring-developer-productivity>]

**关于"Beck abandoned TDD just as it peaked"这一说法**（Gergely Orosz 在 2026 年的转述）：

> "**Kent sees himself as a "tree shaker, not a jelly maker."** He starts things like patterns, SUnit, JUnit, TDD, XP, 3X, then pushes them until they take off, before moving on to the next thing. **It's his defining trait, and may explain his enormous output, and also why he abandoned TDD just as it peaked.**" [一手转述，Gergely Orosz，2026-07-01，<https://newsletter.pragmaticengineer.com/p/how-kent-beck-shapes-the-software>]

**⚠️ 注意冲突**：这条"he abandoned TDD"与 Beck 2025–2026 年**仍在写 Canon TDD、仍在用 TDD**（见下面的播客记录）**表面矛盾**。两种材料并列保留：

> "**Test driven development (TDD) is a "superpower" when working with AI agents.** AI agents can (and do!) introduce regressions. An easy way to ensure this does not happen is to have unit tests for the codebase. ... What _is_ surprising is **how he's having trouble stopping AI agents from deleting tests in order to make them "pass!"**" [一手转述，Gergely Orosz，2025-06-11，<https://newsletter.pragmaticengineer.com/p/tdd-ai-agents-and-coding-with-kent>]

[推断] "abandoned TDD"很可能是指**他不再以 TDD 布道者身份推动它**（tree shaker 走了），而不是"他本人不再用 TDD"。但这个推断**未经 Beck 本人确认**，保留为 [推断]。

---

## 2. 2014 TDD 争论专章

### 2.1 起因与时间线（全部以 Fowler 一手纪要为准）

| 时间 | 事件 | 出处 |
|---|---|---|
| 2014-04（RailsConf） | DHH 做主题演讲，表达对 Rails 社区 TDD 与单元测试的不满。视频：<https://www.youtube.com/watch?v=9LfmrkyP81M> | Fowler 纪要概述 |
| 演讲后不久 | DHH 发博客《TDD is dead. Long live testing》（原文 URL 现已失效） | 同上 |
| 随后 | DHH 发《Test-induced design damage》（原文 URL 现已失效） | 同上 |
| 之后几天 | Fowler 给 DHH 的后续文章提交了一个拼写修正，DHH 表示欢迎 Fowler 对他演讲与博文的看法；两人 Skype 聊了一小时 | 同上 |
| 同期 | DHH 也与 Kent Beck 进行了类似的一小时讨论 | 同上 |
| 随后 | **Beck 提议三人一起继续讨论，并把对话公开**。DHH 在推特上征集意见，反响积极 | 同上 |
| 2014-05-09 | 第 1 集《TDD and Confidence》 <https://www.youtube.com/watch?v=z9quxZsLcfo> | 同上 |
| 2014-05-16 | 第 2 集《Test-induced design damage》 <https://www.youtube.com/watch?v=JoTB2mcjU7w> | 同上 |
| 2014-05-20 | 第 3 集《Feedback and QA》 <https://www.youtube.com/watch?v=YNw4baDz6WA> | 同上 |
| 2014-05-27 | 第 4 集《Costs of Testing》 <https://www.youtube.com/watch?v=dGtasFJnUxI> | 同上 |
| 2014-06-04 | 第 5 集《Answering Questions》 <https://www.youtube.com/watch?v=gWD6REVeKW4> | 同上 |
| 同期 | Beck 在 Facebook 发《Learning about TDD: the purpose of #isTDDDead》与《RIP TDD》 | 由 Fowler 纪要（链接 RIP TDD）与 obeythetestinggoat 转引证实存在 |
| 2014-06（同期） | Uncle Bob 连发数篇：*Test Induced Design Damage?*（5/1）、*When TDD doesn't work.*（4/30）、*Professionalism and TDD (Reprise)*（5/2）、*Is TDD Dead? Final Thoughts about Teams.*（6/17） | <http://blog.cleancoder.com/> 目录页 |

**关键：这场争论的发起者不是 Beck，而是 DHH；把三人拉到一起公开对话的是 Beck。** [一手，Fowler 纪要："David had a similar discussion with Kent, and **Kent suggested that we continue the discussion with all three of us, and make the conversation public**."]

### 2.2 五集的实质内容与各方原话

#### 第 1 集：TDD and Confidence（2014-05-09）

DHH 开场提出**三大异议**：

> "David opened the discussion by raising **his three major issues** with TDD and Unit Testing:
> 1. **confusion over the definition of TDD and unit testing**,
> 2. **test-induced damage through using mocks to drive architecture**, and
> 3. **how the red/green/refactor cycle of TDD never worked for him**." [一手，Fowler 纪要第 1 集]

Fowler 的两个术语澄清（这条极其重要，是对 DHH 前提的直接否定）：

> "I comment that there are **two problems with terminology where different things get conflated**: first that **DHH's critique of TDD was based on an assumption that you had to use heavy mocking in TDD, which isn't the case**; second that **there is a difference between self-testing code and TDD. TDD is one way to achieve self-testing code.**" [一手，Fowler 纪要第 1 集]

DHH 的回应：

> "David said his reaction was to seeing people describe **TDD in a mock-heavy style as a moral thing to do** and the result was a lot of code that was poorly designed due to its desire to enable isolated unit tests." [一手，Fowler 纪要第 1 集]

Beck 的个人史与两种风格共存论：

> "He began by trying things out in Smalltalk, **finding that TDD worked well for his personality**."

> "Kent talked about a recent hackathon at Facebook, **about half of which he could use TDD and half wasn't suitable**. ... But in the non-TDD part he still used regression tests and short feedback loops. **He has no problem mixing both styles, it's like playing both classical and jazz.**" [一手，Fowler 纪要第 1 集]

DHH 的"代价"问题：

> "David has been in situations where TDD flowed well, but most of his work isn't like that - **his question is what are you willing to sacrifice to get that flow? Many people make bad trade-offs, especially with heavy mocking.**" [一手，同上]

Beck 关于 mock 的罕见坦白：

> "But in response to David's question about mocks, he said **he rarely uses them**, he's concerned that those that do often find refactoring difficult, while he finds testing makes refactoring easier." [一手，同上]

**⚠️ 极具价值的一手事实**：**Beck 本人"很少用 mock"。** 而 DHH 的核心指控（测试诱发设计损伤）恰恰是针对**重度 mock 驱动的架构**。这在很大程度上把两人从"对立"变成了"攻击不同的东西"。

#### 第 2 集：Test-induced design damage（2014-05-16）

DHH 提出的具体证据：他贴了一个 gist 展示"hexagonal Rails"那一类架构（<https://gist.github.com/dhh/4849a20d2ba89b34b201>，本环境未抓取），并引 Jim Weirich 的相关演讲（<https://www.youtube.com/watch?v=tg5RFeSfBM4>）作为对照物。

Beck 的核心反驳（比喻 + 归因）：

> "Kent said that **ascribing test-induced damage to TDD was like driving a car to a bad place and blaming the car for it**. The design David showed wasn't due to TDD, **the real issue is that these indirections are all good tricks under some circumstances and we need to understand whether they are worth the cost or not**."

> "Kent countered that it was rather **one _design decision_ at a time**."

> "Kent asked David **what kinds of thing he wanted to do with the gist that its structure made hard.** ("**If it's just sitting there who cares - it's when I want to change it that the design actually matters**")." [一手，Fowler 纪要第 2 集]

DHH 的反驳（规模与间接层的成本）：

> "David replied that **there's a direct correlation between the size of code and how easy it is to change it**. All these indirections have to be kept in sync, something that's 10 lines of code is easier to understand and change than something that's 60 lines of code. **Every layer of indirection introduces a high cost.**"

> "David continued by saying that TDD's red/green/refactor flow was **very addictive** (Kent observed that he's the poorest drug dealer on the planet) and **this addiction led people to these poor decisions**." [一手，同上]

双方的收敛点（这段是全场最实质的共识）：

> "Kent agreed that **you can't treat in-memory and web services the same** ("**you may think you're decoupled, but you're really, really not**") as the failure cases are different. **The boundaries between elements will leak to some degree "the question is how much are we willing to spend to get how much decoupling between elements".**"

> "David agreed that **testing can lead to better designs**, but said his experience often was also the opposite, that there wasn't a good testable design."

**焦点分裂点**：

> "Kent accused David of not having enough self-confidence, maybe you can't see the insight today, so you have to make progress in the meantime, but he's optimistic that he will find them eventually. **David dismissed this as "faith-based TDD"** - he used to feel this but got stuck in a depressing loop when he wasn't finding an ideal solution that wasn't there."

> "Kent clarified **he wasn't talking about TDD, but about software design in general**, it's not about TDD it's about how to get feedback. ... **Getting these insights isn't about your workflow, it's about things like knowing when to work and when to rest, gathering influences from other places, collaborating with other people.**" [一手，同上]

#### 第 3 集：Feedback and QA（2014-05-20）

**Beck 提出了全场最有理论价值的一个框架——反馈的四维权衡**：

> "Kent opened by saying that decisions involving TDD were about **trade-offs**: "**in some ideal world we would have instant, infallible feedback about our programming decisions**"… "every key stroke that I make, if the code is ready to deploy, it would just instantly deploy." But that ideal is impossible at the moment so **the question is how far do we back off from that**. He went to enumerate several constraints in the trade-off:
> - **_Frequency:_** how rapidly do we want our feedback?
> - **_Fidelity:_** how accurate do we want the red/green signal to be?
> - **_Overhead:_** how much are we prepared to pay?
> - **_Lifespan:_** how long is this software going to be around, which is probability as well as time.
>
> Those four are the constraints he thinks we need to compare. "**We're not in this hangout to agree - my personal goal is just to understand the set of trade-offs by articulating them to people who are prepared to tear my ideas apart in a constructive way**"" [一手，Fowler 纪要第 3 集]

**Fowler 提出了反馈的三类目的**：

> "- **_Is the software doing something useful for the user of the software?_**...
> - **_Have I broken anything?_** "This is where self testing code… is such a lifesaver." I want to see every test fail at least once.
> - **_Is my code-base healthy?_**..." [一手，同上]

**DHH 的 QA 批评**（已在 §1.1 引用，此处补全上下文：他把 TDD 的胜利视为**代价之一**）：

> "The other issue is that **to understand trade-offs you have to understand the costs, all the talk of TDD has been on the benefits.** This neglect of costs is why people cannot comprehend that there is such a thing as test-induced damage. ... Consider the cost of reliability: **going from 99% to 99.999% is exponentially more expensive than getting to 99%.** We must also consider criticality. High reliability is important for space shuttles and pacemakers, but wrong for an exploratory web site. **The rule of not writing a line of production code without a test doesn't fit in with trade-offs around criticality.**" [一手，同上]

**Beck 关于 Facebook 的一手说法（重要，与后文 Meta 章节呼应）**：

> "His one piece of Facebook swag in his office is a poster that says "**Nothing at Facebook is somebody else's problem**" and he feels Facebook follows that remarkably well for a company its size. **Facebook didn't have QA until recently and programmers live up to that responsibility.**"
>
> "**"It's a question of 'compared to what?'"** Compared to having an effective QA then no-QA is worse, but **no-QA is better than the old dysfunctional relationship.**" [一手，同上]

**Beck 关于 on-call 的著名提法**：

> "Kent considered that **we should stipple a few red pixels in the green bar to remind us of these limitations**. "**The on-call is the feedback loop that teaches you what tests you didn't write.**" ... As soon as you think you don't make mistakes any more, that's a mistake, and you stop growing. Eventually "**the world won't let you pretend that you're not screwing up any more.**" He'd rather pay the price of catching that early with a phone call at 2am." [一手，同上]

#### 第 4 集：Costs of Testing（2014-05-27）

**DHH 关于"trade-off 必须包含缺点"的方法论开场**：

> "David starts by saying "**to talk about trade-offs, you really have to understand the drawbacks, because if there are no drawbacks there are no trade-offs.**" He continued by saying that **TDD doesn't force you to do things, but it does nudge you in certain directions.**" [一手，Fowler 纪要第 4 集]

**Beck 的"delta coverage"概念 + 删测试的勇气**：

> "Herb Derby came up with the notion of **delta coverage** - what coverage does this test provide that's unique? **Tests with zero delta coverage should be deleted unless they provide some kind of communication purpose.** He said he'd often write a system-y test, write some code to implement it, refactor a bit, and **end up throwing away the initial test**. **Many people freak out at throwing away tests, but you should if they don't buy you anything.** If the same thing is tested multiple ways, that's coupling, and coupling costs." [一手，同上]

**Beck 否定"测试行数/生产代码行数"这个指标**：

> "Kent declared that **the ratio of lines of test code to lines of production code was a bogus metric**. A formative experience for him was watching **Christopher Glaeser** write a compiler, he had 4 lines of test code for every line of compiler code - **but this is because compilers have lots of coupling. A simpler system would have a much smaller ratio.**" [一手，同上]

**Fowler 给出的两条可操作判据（被广泛引用）**：

> "I replied that "**you don't have enough tests (or good enough tests) if you can't confidently change the code**," and "**the sign of too much is whenever you change the code you think you expend more effort changing the tests than changing the code.**"" [一手，同上]

**Beck 关于"测试先行是一种低档位四驱"的比喻**：

> "Kent said that **it's good to learn the discipline of test-first, it's like a 4WD-low gear for tricky parts of development.**" [一手，同上]

**DHH 关于"测试比功能代码更重要"的错位**：

> "David introduced the next issue: **many people used to think that documentation was more important than code. Now he's concerned that people think tests are more important than functional code.** Connected with this is an under-emphasis on **the refactor part of the TDD cycle**. All this leads to insufficient energy to refactoring and keeping the code clear." [一手，同上]

**Beck 的反向操作（throw away code, keep tests）**：

> "Kent described that he just went through an episode where **he threw away some production code, but keeping the tests and reimplementing it**. He really likes that approach as the tests tell him if the new code is working. This leads to an interesting question: **would you rather throw away the code and keep the tests or vice-versa? In different situations you'd answer that question differently.**" [一手，同上]

**关于"清洁代码的快感 vs 新测试通过的快感"**：

> "I find I get a dopamine shot when I clarify code, but my biggest thrill is when I have to add a feature, think it will be tricky, but it turns out easy. That happens due to clean code, but **there is a distance between cleaning the code and getting the dopamine shot.** ... He got his rush from **big design simplifications**. He feels that **it's easy to explain the value of a new test working, but hard to state the value of cleaning the design.**" [一手，同上]

**Fowler 对"TDD 是否已主导"的异议（重要，反驳"TDD 已经征服一切"）：

> "I disagreed that TDD was dominant, **hearing many places where it's yet to gain traction**." [一手，同上]

#### 第 5 集：Answering Questions（2014-06-04）

三个观众提问：

**[Q1，Mike Harris] 有没有开源项目是 TDD 做得好或产生了设计损伤的好例子？**

> "David responds by saying **there aren't good examples and this is one of the problems of debates like this**. We don't have good application examples in general... **As a result we go into these discussions with different contexts, which often makes it look like there is more disagreement than there really is. People come together when you have real code rather than philosophical principles.**"

> "Kent says that **JUnit** is an example of a project that used TDD strictly and turned out well. **But it isn't a good example for this discussion because it has clear interfaces that make a sweet spot for TDD.**" [一手，Fowler 纪要第 5 集]

**DHH 由此提出的"软件工程不是科学"论断**：

> "David says ... we can't treat programming as a science - **we can't evaluate techniques objectively**. This doesn't mean it isn't worth debating. **We can't get a definitive answer, it's your job to figure out what makes sense.** Kent agrees **we can't replicate experiments, but says we still can look at things personally with a scientific mindset.**" [一手，同上]

**[Q2，Graham Lee] 什么改变会让 TDD 变得多余？**

> "Kent replied by saying his **RIP TDD post** points out his position (**if rather sarcastically**). TDD solves several problems, starting with confidence. TDD also allows him to **break problems down piecemeal**, tackling specific cases without having to solve the general case all at once. **He's not prepared to give up on TDD just because it's hard.**"

> "I've experienced following TDD in a mechanical way with **a calm "rapid unhurriedness"** where I've blundered into good designs... **"Some contexts are very suitable for TDD, some contexts less so". And people bring their personality into that context.**" [一手，同上]

**Fowler 的"入门毒品"妙喻**：

> "I say that this is exactly how someone should take on TDD (or any technique). **Try it out, overuse it, settle into a mode that works for you.** Then also look a bit deeper: "**tdd is gateway drug to self-testing code**"." [一手，同上]

**DHH 对"给新人必须讲得斩钉截铁"的反感**：

> "He's skeptical when people say **you must give simple, direct, bombastic advice to new people otherwise they won't do it. That shows a lack of confidence in what you're teaching.** I agreed with that dislike for dogmatic statements. **I get suspicious if I can't find arguments against something I'm describing.**" [一手，同上]

**[Q3，Tudor Pavel] TDD 对经验不足的开发者效果如何？**

> "I reply by saying that TDD forces people to do small pieces and helps them separate interface from implementation. **It doesn't guarantee great results, because you can't do good design without experience. When less experienced people do TDD they typically don't refactor enough, leading to sub-optimal designs.** You can't compare an inexperienced developer's output to an experienced developer's output, **you have to compare it to what that inexperienced developer would have done without tdd**." [一手，同上]

**DHH 关于"重启到第一性原理"的诉求，以及 Beck 的"phoenix"结论**：

> "**You need to hit the reset button, an approach that's crude but effective. When he says TDD is dead, he's referring to this current mutation - we have to get back to first principles.**"

> "Kent said his gut reaction to David's original keynote was at that level. **Programmers will often do the same thing many times, make things too complicated, and stick with dysfunctional systems at work. He's happy to reboot to first principles, but doesn't want to lose the evolution of people's expectations about programming in the last ten years.** You should be able to feel confident, point to progress, have productive technical collaborations. **He feels he can be his whole self at work now in a way that he couldn't when he started his career.**"

> "**He comes out firmly contradicting David: TDD isn't dead, but is glad David set fire to it so it could come out like a phoenix.**" [一手，同上]

**Pinkberry 比喻**（DHH 用来解释"好点子被加料毁掉"）：

> "He used the example of **Pinkberry** which started with just two flavors, but then got a complicated range of flavors just like other ice-creams - "**most people can't leave good ideas the fuck alone.**"" [一手，同上]

**"你要么以英雄身份死去，要么变成反派"**：

> "David agreed: "**you either die a hero or become the villan.**" ... **He's impressed by how long Rails and TDD have lasted.**" [一手，同上]

### 2.3 Fowler 的收尾总结（这场争论"有无共识"的官方答案）

> "I concluded by saying that (as I suspected before we started) **there is lots we agree on. We all value self-testing code a lot, we all agree TDD is valuable in some contexts, we might disagree on how many contexts (although it's hard to really tell).** Everything still boils down to the point that **if you're involved in software development you have to be thoughtful about it, you have to build up what practices work for you and your team, you can't take any technique blindly. You need to try it, use it, overuse it, and find what works for you and your team. We're not in a codified science, so we have to work with our own experience.**" [一手，Fowler 纪要第 5 集]

### 2.4 这场争论后来如何被回顾（谁对谁错）

**（a）"未有定论"是主流判断。** 2020 年 ESEM 论文《Why Research on Test-Driven Development is Inconclusive?》开篇即以此争论为背景：

> "Recent investigations into the effects of Test-Driven Development (TDD) have been **contradictory and inconclusive**. This hinders development teams to use research results as the basis for deciding whether and how to apply TDD." [一手，Ghafari, Gross, Fucci & Felderer，ESEM '20，<https://arxiv.org/html/2007.09863v1>]

**（b）有人直接论证"这场争论本身是伪命题"。** 2014 年 5 月 21 日的一篇博文标题就是《There is NO TDD debate》：

> "I've been watching the TDD debates with Martin Fowler, Kent Beck and David Hansson. There is some good material in there" [二手，<https://def246.com/2014/05/2014-05-21_there-is-no-tdd-debate>；**正文本次未抓取，只有搜索片段，未核实**]

**（c）有人从"信仰不可证"角度总结。** 2017 年的一篇长文把这场争论定性为"经验主义 vs 证据主义"，并给出自己的结论：

> "**It is clear that all the discussion is based on their experiences. However, even though they are experienced and well-known, this does _not_ represent evidence of TDD.** That is, their observations were accumulated from a long period of time and thus **are certainly subject to bias. For this reason, these opinions cannot be taken as evidence for either benefits or drawbacks of TDD.**" [一手，Paulo Sérgio Medeiros dos Santos，<https://pasemes.github.io/blog/was-tdd-ever-alive>]

同一篇给出的最终判断：

> "**Not dead but definitely not super alive, either.**"
> "Given the results, we can conclude that **TDD favors the external quality to the detriment of productivity.**" [一手，同上]

**（d）2025–2026 年的新回顾：AI 把 TDD 重新"接回"了。**

> "TDD is dead. DHH declared it so back in 2014. If it ever had life, the constraints it placed on developers suffocated it..." —— Momentic 博客，2025-04-20 [二手，<https://momentic.ai/blog/test-driven-development>；**正文未全文核验**]

而 Beck 自己的立场是 AI 时代 TDD 反而更重要（见 §1.8.3 引述的 2025 年播客）。

**（e）Uncle Bob 在 2014 年 6 月 17 日写过一篇收尾文《Is TDD Dead? Final Thoughts about Teams.》**（<http://blog.cleancoder.com/uncle-bob/2014/06/17/IsTddDeadFinalThoughts.html>），**本次未抓取正文，标注「未核实」**。

### 2.5 本维度对"谁对谁错"的处理原则

**不替主子下结论。** 但把已有的判断摆清楚：

| 主张 | 提出者 | 现状 |
|---|---|---|
| "TDD 强制重度 mock" | DHH 的隐含前提 | **Fowler 明确否定**（"isn't the case"）[一手] |
| "TDD 诱发设计损伤" | DHH | **部分成立但归因有争议**：Beck 认为是个体设计决策问题（"blaming the car"），Uncle Bob 认为"是你会不会设计的问题，不是 TDD"[一手多方] |
| "TDD 挤走 QA" | DHH | **Beck 基本承认**，但主张"和什么比"（"compared to what?"）[一手] |
| "过度测试是真实成本" | DHH | **Fowler 与 Beck 都承认存在**，Fowler 给出 Goldilocks 判据 [一手] |
| "测试/生产代码行数是废指标" | Beck | **Beck 与 DHH 在此一致**（DHH：量化是 honey trap）[一手] |
| "TDD 提升外部质量、降低生产率" | 学术 meta 分析 | **工业环境成立，学术环境不成立**（见第 3 章）[一手研究] |
| "TDD 是死的" | DHH | **Beck 明确否定**（"TDD isn't dead"），DHH 自己也说指的是"当前的变异" [一手] |

**结论（[推断]，仅供参考，不做决断）**：这场争论**从未被"判出胜负"**，其历史作用更像**把 TDD 从"戒律"降格为"情境工具"**。Beck 本人对此的用词最准确：不是"对"，而是"**one (not the only) way**"。

---

## 3. TDD / XP 的实证研究证据

本章是本次调研中**证据密度最高**的一章。为避免误导，先说明一条方法论警告：**本章所有数字都来自研究人员对已有研究的二次聚合，而"二次聚合"本身有验证威胁（threats to validity）。** 引用时必须带上这句话，不得把数字当成定论。

### 3.1 证据地图（先看全景，再看数字）

| 研究 | 类型 | 年份 | 核心结论 | 可信度评估 |
|---|---|---|---|---|
| Rafique & Mišić《The Effects of TDD on External Quality and Productivity: A Meta-analysis》 | **元分析，27 项研究** | 2013（IEEE） | 外部质量工业环境 +52%、生产率工业环境 −22% | **较高**（元分析，但样本工业侧极小） |
| Munir et al.《Considering rigor and relevance when evaluating TDD: A systematic review》 | 系统综述 | 2014 | 质量提升**不显著**；声称的质量收益在"低严谨/低相关性"研究中更夸张 | **较高**（直接质疑研究质量） |
| Shull et al.《What Do We Know about TDD?》 | 综述（IEEE Software） | 2010 | **结论混杂**：部分研究测到内部质量更好，部分更差 | 高（综述） |
| Karac & Turhan《What Do We (Really) Know about TDD?》 | 元-元研究 | 2018 | 已有综述互相矛盾 | 较高 |
| Bissi et al.《The effects of TDD on internal quality, external quality and productivity: A systematic review》 | 系统综述 | 2016 | 既有研究**不具决定性**；学术实验与工业实验不同 | 较高 |
| Kollanus《TDD - Still a Promising Approach?》 | 综述 | 2010 | **质量提升以生产率为代价** | 中等 |
| Ghafari, Gross, Fucci & Felderer《Why Research on TDD is Inconclusive?》 | 方法论剖析，10 项一手研究 + 9 项二次研究 | 2020（ESEM） | **识别出 5 类导致结论矛盾的因素** | **很高**（专门解释为什么吵不出结论） |
| Fucci et al.《A Dissection of the TDD Process: Does It Really Matter to Test-First or to Test-Last?》 | 对照实验 | 2017 | **迭代程度比"测试先写"更重要** | 高（直接挑战 TDD 的因果归因） |
| Tosun et al.《On the Effectiveness of Unit Tests in TDD》 | 工业实验，24 名专业人员 | 2018 | TDD 的单元测试 **mutation score 与分支覆盖率更高，但方法覆盖率更低** | 中高（样本小） |
| Fucci et al.《A longitudinal cohort study on the retainment of TDD》 | 纵向队列，5 个月 | 2018 | **采用 TDD 只导致写了更多测试**；对外部质量与生产率**均无统计显著影响** | 中高 |
| Borle et al.《Analyzing the effects of TDD in GitHub》 | 大规模实证 | 2018 | **256,572 个含测试文件的公开 GitHub 项目中，只有 0.8% 实践 TDD** | **高（数据量大）** |
| Beller et al.《Developer Testing in The IDE: Patterns, Beliefs, And Behavior》 | 行为观测，2,443 名开发者，2.5 年 | 2019 | **自称做 TDD 的人既不严格遵守也不是对所有改动都做；只有 2.2% 含测试执行的会话是严格 TDD 模式** | **很高（观测数据，非自述）** |
| Santos et al.《Does the Performance of TDD Hold Across Software Companies and Premises?》 | 4 个工业实验，2 家公司 | 2018 | **单元测试与测试工具经验越丰富，在 ITL（迭代式测试后行）中的外部质量表现越好于 TDD** | 中高 |
| Latorre《A replicated experiment on the effectiveness of test-first development》相关 | 复制实验 | 2014 | **初级开发者无法通过 TDD 发现最佳设计**，需要比熟练开发者更频繁地返工设计 | 中 |
| Romano et al.《An Empirical Assessment on Affective Reactions of Novice Developers》 | 情感反应研究 | 2019 | **新手更喜欢非 TDD 方式；TDD 的测试阶段让使用者更不快乐** | 中 |
| Suleman et al. | 早期试点 | 2017 | **学生不一定体验到 TDD 的即时好处；觉得 TDD 更像阻碍而非帮助** | 低-中（试点） |
| Sundelin et al.《Test-Driving FinTech Product Development》 | 8 年经验报告 | 2018 | **测试规模增长远快于生产代码**，必须清理/重构/排优先级 | 中（单一案例） |
| Marchenko et al.（Nokia-Siemens Network，8 人团队，3 年） | 访谈 | 2009 | 团队信心提升、生产率提升；但 **TDD 不适合修 bug**，尤其难复现的 bug 或快速 hack，因测试开销 | 中（访谈） |
| Karac et al.《Task Description Granularity on Software Quality in TDD》 | 对照实验（研究生） | 2019 | **任务描述粒度越细，TDD 下的质量显著越好** | 中高 |

**以上全部条目的一手依据**：Ghafari et al. 2020 ESEM 论文 <https://arxiv.org/html/2007.09863v1>（该文系统整理了其中大部分研究并给出二次研究的表格）；Rafique & Mišić 数字来自 <https://raidoninc.com/assets/research/tddMetaAnalysis.pdf> 的转述（见下 §3.2），由 <https://pasemes.github.io/blog/was-tdd-ever-alive> 逐条解读。

### 3.2 Rafique & Mišić 元分析的具体数字（最常被两边引用的一份）

**这篇是整个争论里被引用最多的定量证据。** 其方法：27 项研究，用 Hedges' g 做标准化分析（需要均值和标准差），不满足时用非标准化的百分比比较。

#### 3.2.1 外部质量（external quality）

> "The data for the **standardized analysis shows that there is no difference regarding TDD and the compared groups with an effect size of -0.010**. However, among the eleven standardized effect sizes, **only one study was from industrial settings, which had an effect size of 0.309**. The remaining ten studies were conducted in the academic settings and had a combined effect size of **-0.049**."

> "There were more effect sizes from industrial settings in the case of the **unstandardized analysis** – a total of 8 from the 24. The results show an **improvement of 52% in favor of TDD in industrial settings.** This value drops to **10% in the case of academic studies**. **An overall improvement of 24% is obtained** when all effect sizes are considered together."

**作者解读**：

> "In summary, **TDD is _moderately superior_ to the compared tested strategies (iterative testing or test last) regarding external quality in industrial settings. However, when it is isolated from other agile practices or used by inexperienced developers no difference was found.**" [一手解读，<https://pasemes.github.io/blog/was-tdd-ever-alive>]

#### 3.2.2 生产率（productivity）

> "The data for the **standardized analysis shows that there is no difference regarding TDD and the compared groups with an effect size of 0.048**. Again, repeating the pattern found in the external quality, **only one study was from industrial settings, however, in this case, it favors the compared approach with an effect size of -1.111**. The remaining nine studies were conducted in the academic settings and had a combined effect size of **0.187**."

> "The results of the **unstandardized analysis show a decrease of -22% in productivity when using TDD in industrial settings**, represented by eight effect sizes. This value increases to **19% when considering the remaining 15 effect sizes of the academic studies**. **Combining all effect sizes, there is practically no difference between TDD and the compared approaches – an increase of 4% was found.**"

**作者解读**：

> "In summary, **TDD is _moderately inferior_ to the compared tested strategies (iterative testing or test last) regarding productivity in industrial settings. However, when it is isolated from other agile practices no difference was found. And when it is used by inexperienced developers it tends to favor the productivity.**" [一手解读，同上]

#### 3.2.3 ⚠️ 关于"−22%"这个数字的诚实说明

搜索结果中有第三方文章把这个数字做成标题：

> "**TDD Productivity Paradox: Test-First Costs 22% More Time** — The Data Doesn't Lie – It Just Disagrees With Itself The productivity paradox is stark. In industrial environments, rese[arch]..." [二手，<https://byteiota.com/tdd-productivity-paradox-test-first-costs-22-more-time>，2026-01-19]

**必须注意三点，否则会被这个标题误导：**

1. 这 **−22% 来自"非标准化分析"**，即**只是百分比比较**，不考虑均值、标准差和组大小。论文作者自己注明：非标准化分析"does not consider, for instance, the mean, the standard deviation, and the groups' size"。
2. 这 **−22% 只来自 8 个工业侧效应量**（样本极小）。
3. 同一个非标准化分析在**学术环境是 +19%**（对 TDD 有利），合并后**只有 +4% 的差异**，作者原话是"**practically no difference**"。

**所以"TDD 慢 22%"是一个被过度简化的说法。** [推断] 严谨的表述应当是：「在工业环境的小样本、非标准化比较中，TDD 侧生产率中位数偏低 22%；但标准化分析无差异，学术环境方向相反，整体差异可忽略。」

### 3.3 支持 TDD 的证据（不能只收集负面）

**（a）工业环境的真实收益（Nokia-Siemens Network，3 年 8 人团队）：**

> "[Marchenko et al. (2009)] interviewed eight participants who used TDD at Nokia-Siemens Network for three years. **The participants stated that the team confidence with the code base is improved, which is associated with improved productivity.**" [一手转引，Ghafari et al. 2020]

**（b）TDD 产出的测试质量更高（24 名专业人员的工业实验）：**

> "[Tosun et al. (2018)] conducted an experiment with **24 professionals** and found that **unit-test cases developed in TDD have a higher mutation score and branch coverage, but less method coverage than those developed in ITL**. Their findings contradicts earlier findings that were mostly conducted with students." [一手转引，同上]

**（c）任务粒度细分会放大 TDD 的效果（因果机制的关键证据）：**

> "[Karac et al. (2019)] investigated the effect of task description granularity on the quality ... and reported that **more granular task descriptions significantly improve quality**." [一手转引，同上]

**（d）"迭代程度"比"测试先行"更关键（这条同时是支持也是打击）：**

> "research has shown that, **when measuring quality, the degree of iteration of the process is more important than the order in which the test cases are written** ([Fucci et al., 2017])." [一手转引，同上]

**（e）TDD 在工业环境 8 年项目中被证实有长期运维价值（但带副作用）：**

> "[Sundelin et al. (2018)] studied a financial software under development for **eight years**, and found that **the size of tests grows much faster than of production code. Therefore, it is necessary to clean, refactor, and prioritize tests to manage this grow[th].**" [一手转引，同上]

**（f）微软内部的功能价值数据（用于支撑 YAGNI，间接支持小步迭代）：** 见 §1.7，Kohavi et al. 在微软的发现是"即使经过仔细的前期分析，**只有 1/3 的功能改善了它想要改善的指标**"。

### 3.4 不使用/反驳 TDD 的证据

**（a）"TDD 根本没被真正实践过"——两条最硬的行为数据：**

> "[Beller et al. (2019)] observed the work of **2,443 software developers over 2.5 years** and discovered that **developers who claim to do TDD, neither follow it strictly nor for all their modifications. They found that only 2.2% of sessions with test executions contain strict TDD patterns.**"

> "[Borle et al. (2018)] showed that **TDD is practiced in only 0.8% of the 256,572 investigated public GitHub projects which contain test files.**" [一手转引，Ghafari et al. 2020]

**[推断] 这两条对双方都是重击**：对 TDD 拥护者——"无法规模落地"；对 TDD 批评者——"你批评的那个东西，多数人根本没在实践，你批评的是什么？"这也正是 Beck 在《Canon TDD》里说"你批评的是稻草人"的行为学依据。

**（b）新手体验为负：**

> "[Romano et al. (2019)] investigated the affective reactions of novice developers to the development approach and reported that **novices seem to like a non-TDD development approach more than TDD, and that the testing phase makes developers using TDD less happy.**"

> "[Suleman et al. (2017)] conducted an early pilot study with students who experienced TDD in an introductory programming course. They found that **students do not necessarily experience the immediate benefits of TDD, and that this TDD is perceived to be more of a hindrance than a help to them.**" [一手转引，同上]

**（c）设计能力门槛：**

> "[Latorre (2014)] found that **in unit test-driven development, junior developers are not able to discover the best design, and this translates into a performance penalty since they need to revise their design choices more frequently than skilled developers.**" [一手转引，同上]

**（d）TDD 对修 bug 不适用（Nokia-Siemens 的负面结论）：**

> "[Marchenko et al. (2009)] interviewed a team of eight developers who adopted TDD at Nokia-Siemens Network for three years. **The team reported that TDD was not suitable for bug fixing, especially for bugs that are difficult to reproduce or for quick "hacks" due to the testing overhead.**" [一手转引，同上]

**（e）最根本的一条：外部质量收益在"严谨研究"中蒸发：**

> "Although it is often claimed that TDD improves code quality (e.g., results in fewer bugs and defects), **one of the largest systematic studies in this domain ([Munir et al., 2014]) shows that improvement in some studies is not significant, and that the claimed code quality gains are much more pronounced in "low-rigor" and "low-relevance" studies** ([Ivarsson and Gorschek, 2011])." [一手，Ghafari et al. 2020]

**（f）TDD 的收益可能是"比较对象选错了"造成的：**

> "Previous research has shown that **a lot of the superiority of TDD in existing studies is the result of a comparison with a coarse-grained waterfall process** ([Pančur and Ciglaric, 2011]). Nevertheless, TDD is an agile technique and **should be compared with fine-grained iterative techniques, such as iterative test last (ITL), that share similar characteristics. This means not only we do not know what exactly is responsible for the observed benefits of TDD, but also that the benefits we measure depend on what we compare TDD against.**" [一手，同上]

### 3.5 Ghafari et al. 的核心贡献：为什么这个领域吵不出结论

这篇 2020 年的 ESEM 论文是本次调研中**方法论价值最高**的一份材料。它识别出 **5 类**导致结论矛盾的因素：

#### 因素 1：TDD 的定义不统一

> "**There is a variety of TDD definitions. Its exact meaning, the underlying assumptions, and how strictly one follows it are not well-explained in previous studies.**"
>
> "There are two common TDD styles: one is **classical TDD**, where there is almost no design upfront and developers just drive the entire implementation from the tests; and the other one is where **developers know the design before developing**... However, we noted that **a commonly shared definition of TDD is missing. What TDD means is mostly boiled down to writing tests prior to production code**, and its other characteristics have not received similar attention. For example, **some studies measure refactoring explicitly and even use it to assess how much participants adhere to TDD, while others are not concerned with refactoring, even though it is supposed to be a key part of TDD.**" [一手，Ghafari et al. 2020]

**这条直接印证了 Beck 写《Canon TDD》的动机**——他自己也发现"folks out there don't agree on the definition of TDD"：

> "In my recent round of TDD clarifications, one surprising experience is that **folks out there don't agree on the definition of TDD. I made it as clear as possible in my book. I thought it was clear. Nope. My bad.**" [一手，<https://newsletter.kentbeck.com/p/canon-tdd>]

#### 因素 2：参与者几乎都是 TDD 新手

> "**Studies participants (i.e., students and professionals) have little prior TDD experience, ranging generally from a couple of days to a couple of months.**"
>
> "we observed that **studies with participants who are proficient in TDD prior to the start of experiments, for example ([Buchan et al., 2011]), are in the minority. We even observed studies, for example ([Tosun et al., 2019]), where participants were asked to follow TDD right after only a short introduction.**"
>
> "Nevertheless, **anecdotal as well as empirical evidence suggest that when introducing TDD to developers, the benefits manifest themselves only after an initial investment and a ramp-up time.**"

**样本量偏小的结构性原因**：

> "studies with professionals usually have **a maximum of 20 participants**, whereas studies with students have in several cases **40+ participants**." [一手，同上]

#### 因素 3：任务几乎都是合成的（kodings kata），不是真实任务

> "We observed that **most studies were concerned with one and up to four synthetic tasks, such as coding katas.** ... **Surprisingly, synthetic tasks are dominant in experiments conducted in industrial settings.**"
>
> "**Synthetic, non-real world tasks are dominant. Research does not cover the variety of tasks to which TDD can be applied.**"
>
> "Finally, **previous literature is mostly concerned with code generation, and exploring how TDD performs during bug-fixing or large-scale refactoring has not received enough attention.**" [一手，同上]

#### 因素 4：几乎只研究绿地（greenfield）项目，不研究棕地（brownfield）

> "**Research mostly focuses on greenfield projects rather than brownfield projects. Accordingly, the opportunity to apply TDD in an existing codebase is unclear.**"
>
> "**Brownfield projects are arguably closer to the daily work of a developer, and generalizing the results gathered from greenfield projects to brownfield projects may not be valid. Nevertheless, brownfield projects are under-represented in existing research.**"
>
> "**In legacy systems that lack unit test cases, TDD may not be applicable as developers are deprived of the quick feedback from tests on changes.** However, understanding how TDD performs in brownfield projects that comprise regression test suites is a research opportunity that needs to be explored." [一手，同上]

**⚠️ 这段是连接第 5 章（Feathers）的关键**：学术界自己承认"**在缺测试的遗留系统里 TDD 可能不适用**"——这正是 Michael Feathers 那条路线的立足点。

#### 因素 5：对照组选得不公平

见 §3.4(f)。核心是：**拿 TDD 跟瀑布比，当然赢；跟 ITL 比，差异就没了。**

#### 论文给实践者的四条建议（原文）

> "**Implications for practitioners**"
（原文在此处被截断；本次抓取到的是论文前部，`## 4. Discussion` 之后的正文**未核实**。）

#### 论文对长期效应的呼吁

> "**Research often deals with short-term impact of TDD rather than its long-term benefits and drawbacks, which manifest themselves once the software is in use. This is especially the case for quality of test suites.**" [一手，Ghafari et al. 2020]

### 3.6 "TDD 不提质量只提粒度"这类批评的证据定位

任务简报里点名要的"TDD 不提质量只提粒度"批评，其**最接近的可核实证据**是两条：

1. **Fucci et al. 2017 的发现**："the degree of iteration of the process is more important than the order in which the test cases are written" [一手转引，Ghafari et al. 2020]。
2. **Karac et al. 2019 的发现**："The success of TDD is correlated with **the sub-division of a requirement into smaller tasks**, leading to an increase in iterations." [一手转引，同上]

[推断] 这两条合起来意味着：**TDD 的收益很可能来自"任务被切细 + 迭代次数变多"，而不是来自"测试写在代码前面"这个顺序本身。** 换句话说，**TDD 可能只是"小步迭代"的一个代理变量（proxy）**。这是对 Beck 方法论最本质的一击，而且**Beck 没有直接回应过这个具体研究**（本次检索未发现他的回应，标注「未核实」）。

**⚠️ 但同时要记录反方向的证据**：Beck 自己的《Canon TDD》第一步就是"列 Test List"，第 2 步才是把**恰好一条**变成可运行测试，并在文中明确警告：

> "**Mistake: convert all the items on the Test List into concrete tests, then make them pass one at a time.** What happens when making the first test pass causes you to reconsider a decision that affects all those speculative tests? Rework. What happens when you get to test #6 & you haven't seen anything pass yet? Depression and/or boredom."
>
> "**Picking the next test is an important skill**, & one that only comes with experience. **The order of the tests can significantly affect both the experience of programming & the final result.** (**Open question: is code sensitive to initial conditions?**)" [一手，<https://newsletter.kentbeck.com/p/canon-tdd>]

[推断] Beck 自己承认"测试的顺序会显著影响结果"并把"代码是否对初始条件敏感"列为**开放问题**——这实际上承认了 Fucci/Karac 那条路线的部分合理性。**Beck 与实证研究在这里不是对立，而是"他也在问同一个问题"。** 这是本维度一个很有价值的观察。

### 3.7 关于 XP 整体的实证证据

**⚠️ 事实缺口声明**：本次检索**未能取得 XP 整体（而非 TDD 单项）的可靠 meta 分析**。搜索引擎对"Extreme Programming empirical study meta-analysis"这类查询返回的多是 2004–2018 年的零散论文与教学经验报告（如《Being Extreme in the classroom: Experiences teaching XP》，DOI 10.1007/bf03192356，**正文未抓取**）。标注「**XP 整体证据未核实**」。

**可得的相关材料**：

- 一份 2008 年的调查数据研究，专门测结对编程的感知效果，标题《Better, Not More Expensive, Faster? The Perceived Effects of Pair Programming in Survey Data》（ACIS 2008，<https://aisel.aisnet.org/cgi/viewcontent.cgi?article=1020&context=acis2008>）——**正文未逐字核验，仅标题可证**。
- 一份 Umich 课程存档的结对编程研究 PDF（可能是 Cockburn & Williams 的早期工作，<https://web.eecs.umich.edu/~xwangsd/courses/w23/readings/pairprogramming.pdf>）——**本环境两次抓取失败（fetch failed），未核实**。
- Cockburn 是该研究的共同作者这一点，由第三方博客确认：**"Agile Manifesto co-author Alistair Cockburn and Laurie Williams (from the Uni[versity of Utah])"** [二手，<https://anthonysciamanna.com/2017/11/30/misconceptions-of-pair-programming.html>]

### 3.8 本节结论（不做决断，只摆事实）

| 问题 | 证据现状 |
|---|---|
| TDD 提升外部质量吗？ | **工业环境倾向于是（+52%，非标准化）；学术环境否；标准化分析无差异；严谨研究显示收益不显著。** 四个方向都有材料 |
| TDD 降低生产率吗？ | **工业环境倾向于是（−22%，非标准化）；学术环境相反（+19%）；标准化分析无差异。** |
| TDD 提升测试质量吗？ | **部分成立**（mutation score、分支覆盖率更高，但方法覆盖率更低，仅 24 人样本） |
| TDD 在真实世界被采用了吗？ | **几乎没有**：GitHub 0.8%，IDE 观测中的严格 TDD 会话占 2.2% |
| TDD 的收益来自"测试先行"还是"小步迭代"？ | **当前证据倾向于后者**（Fucci 2017、Karac 2019），但 Beck 把"顺序敏感性问题"列为开放问题 |
| TDD 有长期代价吗？ | **有材料支持**：测试代码增速远超生产代码（Sundelin 2018，8 年项目），必须持续治理 |

---

## 4. 与 Martin Fowler 的对比

### 4.1 两人的关系史（决定"分歧"性质的前提）

关键事实（**都要记住这一条，否则会把两人写成对立**）：

> "I commented that **when we first worked together at C3**, we didn't start using TDD, but ensured each programming episode delivered code and tests together." —— Fowler 在第 1 集回忆 [一手，Fowler 纪要第 1 集]

> "**The Agile Manifesto came together in a messy way.** ... **During a break, Martin Fowler and Jim Highsmith stayed behind, and when the others returned, they found the values written on the whiteboard.**" [一手转述，Gergely Orosz 转述 Beck，<https://newsletter.pragmaticengineer.com/p/how-kent-beck-shapes-the-software>]

**结论：[推断] Beck 与 Fowler 是"共事 20 年以上 + 共同起草敏捷宣言 + 合写 YAGNI 语源"的关系，不是学术对手。** 他们的分歧是**分工与侧重**上的分歧，不是立场对抗。这是与 DHH/Ousterhout/Uncle Bob 那三条线的根本区别。

### 4.2 重构（Refactoring）vs Tidy First：真实分工在哪

**结论先说**（[推断]，基于双方一手材料）：**Fowler 提供的是"重构的技术目录与方法学"；Beck 在《Tidy First?》里提供的是"什么时候做、做多少的决策理论"。** 两者不是竞争关系，是**"怎么做"与"何时做"**的分工。

#### 4.2.1 Fowler 侧的定位

Fowler 的 bliki《Yagni》把 refactoring 放在**使能实践（enabling practices）**的位置上：

> "**Yagni only applies to capabilities built into the software to support a presumptive feature, it does not apply to effort to make the software easier to modify.** Yagni is only a viable strategy if the code is easy to change, **so expending effort on refactoring isn't a violation of yagni because refactoring makes the code more malleable.** Similar reasoning applies for practices like SelfTestingCode and ContinuousDelivery. **These are enabling practices for evolutionary design, without them yagni turns from a beneficial practice into a curse.**"

> "**Yagni has the curious property that it is both enabled by and enables evolutionary design.**" [一手，<https://martinfowler.com/bliki/Yagni.html>]

Fowler 给出的**心理可操作技巧**（这条与 Beck 的"期权"框架互补）：

> "One approach I use when mentoring developers in this situation is to ask them to **imagine the refactoring** they would have to do later to introduce the capability when it's needed. Often that thought experiment is enough to convince them that it won't be significantly more expensive to add it later." [一手，同上]

Fowler 引 Jeremy Miller 的话，把"未被使用的扩展点"定性为负资产：

> "**Reminder, any extensibility point that's never used isn't just wasted effort, it's likely to also get in your way as well** -- Jeremy Miller" [一手转引，同上]

**⚠️ 注意 Fowler 与 Beck 在"成本分类"上的可见差异**：

Fowler 明确列出了**四类成本**：cost of build、cost of delay、cost of carry、cost of repair。而 Beck 在 2026 年**明确否认**写代码的成本是 YAGNI 的核心：

> "**YAGNI is not about the cost of producing code.** ... **Notice what is _not_ on either bill: the cost of typing the code.**" [一手，Beck，<https://newsletter.kentbeck.com/p/the-cost-yagni-was-never-about>]

**[冲突保留]**：Beck 说打字成本不在账上；Fowler 的 "cost of build" 是账上的一行。两人的结论一致（都主张 YAGNI），但**成本模型的构成不同**。这不是错误，是两人关注的时代变了——Beck 在他的文章里也明说了这一点：

> "**This matters because the cost of typing just went to roughly zero.** ... **So the thrift reading of YAGNI — "code is cheap now, why not build ahead?" — collapses.**" [一手，同上]

[推断] 也就是说：**Fowler 2015 年的成本模型包含打字成本，Beck 2026 年的模型把它剔除** —— 这是**时间差**，不必然是**分歧**。但两人都没有公开承认对方模型（本次检索未发现），所以标为「未核实是否为公开分歧」。

#### 4.2.2 Beck 侧的定位（《Tidy First?》的三层结构）

Henrik Warne 的读书笔记（目前最完整的公开结构化摘录之一）给出的结构：

> "The book has **three parts**, going from concrete to abstract. First there is **a list of 15 _tidyings_, which are small refactorings**. The next part, **_Managing_**, discusses **how and when** to perform the tidyings. The final part, **_Theory_**, presents a great framework for how to think about software development, using the concepts of **_time value of money_ and _optionality_**." [二手，<https://henrikwarne.com/2024/01/10/tidy-first/>]

> "A key idea in the book is that **before you implement a behavior change (B) in the code, it may be beneficial to first perform one or more structural changes (S). These changes do not alter the program behavior, and are almost trivially simple. These changes are called tidyings.**" [二手，同上]

**Beck 自己的定义（Warne 逐字引用书里的话）：**

> "**Software design is _beneficially relating elements_**." [一手转引，同上]

> "**The mere presence of a system behaving a certain way changes the desire for how the system should behave**" [一手转引，同上]

> "**In this tidying, you are taking your hard-won understanding and putting it back into the code**" [一手转引，同上]

> "**Interfaces become tools for thinking about problems**" [一手转引，同上]

**Constantine's Equivalence（Beck 用来把设计问题转成成本问题）：**

> "**Constantine's Equivalence** states that **the cost of software is roughly equal to the cost of changing it.** This cost of change is dominated by the cost of the big, cascading changes. Therefore, **the cost of software is approximately equal to the coupling.**" [一手转引，同上]

**四步工作流（Warne 提炼的"要记住的"）：**

> "- What structural change(s) (S) will make the next behavioral change (B) easier to implement?
> - Keep S and B in separate commits (or even separate PRs).
> - Create future behavior options by keeping a structure that supports change.
> - **Constantine's Equivalence: cost(software) ~= coupling**" [二手，同上]

#### 4.2.3 分工表（本维度核心产出）

| 维度 | Fowler | Beck |
|---|---|---|
| **主战场** | 重构手法目录、坏味道、演化式设计、微服务与架构 | 时机决策、小结构动作、经济学模型（期权/NPV） |
| **代表作品** | 《Refactoring》（与 Opdyke、Roberts 合著后独立）、bliki 系列 | 《Tidy First?》 |
| **对 YAGNI 的贡献** | 写词条、给四类成本、给"想象重构"的技巧、给 ⅔ 猜错率数据 | 造词（与 Chet Hendrickson 的对话）、2026 年重新定义 YAGNI 为"期权问题" |
| **对 TDD 的贡献** | 术语区分（self-testing code vs TDD）、写纪要、做"time cop" | 提出者、写 Canon TDD、写 Trade-off 四维度框架 |
| **风格** | 系统化、著录式、有耐心做定义澄清 | 语录式、比喻密集、明确说"it depends" |
| **对"设计"的定性** | 演化的、有使能实践的 | **beneficially relating elements + 期权** |

**⚠️ 关于"Tidy First 与 Refactoring 有何区别"的质疑**：本次检索**未找到公开的、指名道姓提出这个质疑的文章**（未核实）。但可以从格式差异上给出事实回应：Fowler 的《Refactoring》是**目录式技术手册**（每个手法有名称、动机、机械步骤、示例）；《Tidy First?》是**决策小册**（15 个动作 + 何时做 + 经济学理论，92–100 页）。**这是体裁差异，不是内容冲突。** [推断]

### 4.3 两人在具体问题上的"不同说法"（任务点名要的）

**（a）TDD 与自测试代码的区分 —— Fowler 提出，Beck 接受并沿用**

> "I comment that there are two problems with terminology where different things get conflated: first that **DHH's critique of TDD was based on an assumption that you had to use heavy mocking in TDD, which isn't the case**; second that **there is a difference between self-testing code and TDD. TDD is one way to achieve self-testing code.**" [一手，Fowler 纪要第 1 集]

> "**tdd is gateway drug to self-testing code**" [一手，Fowler 纪要第 5 集]

**（b）对 mock 的态度 —— Beck 说"我很少用"，Fowler 说"隔离的欲望不等于 TDD"**

> "Kent ... said **he rarely uses them**, he's concerned that those that do often find refactoring difficult" [一手，Fowler 纪要第 1 集]

> "I disagreed with this, saying **it wasn't due to TDD but due to a desire for isolation**, the essence of a hexagonal architecture being isolation from its environment (in this case Rails)." [一手，Fowler 纪要第 2 集]

> "**we still have to consider whether it is worth making intermediate results testable**"（Fowler 转述 Beck 在第 1 集中的说法）[一手，同上]

**（c）对"测试多少才够"的判据 —— 这是 Fowler 的独创贡献，Beck 没有给出同等简洁的判据**

Fowler 的两条判据（已在 §2.2 第 4 集引用，此处作为**两人分工的证据**）：

> "you don't have enough tests (or good enough tests) **if you can't confidently change the code**"
> "the sign of too much is **whenever you change the code you think you expend more effort changing the tests than changing the code**" [一手]

而 Beck 在同期给出的判据更偏**直觉/经验**：

> "**Kent declared that the ratio of lines of test code to lines of production code was a bogus metric.**" [一手]

> "He said he'd often write a system-y test, write some code to implement it, refactor a bit, and **end up throwing away the initial test**." [一手]

[推断] **Fowler 给"可操作的判据"，Beck 给"否定坏指标 + 经验判断"**。这是两人风格差异的直接体现，也是"分工"最具体的一处。

**（d）对"敏捷是否已经赢了"的判断 —— Fowler 更精确，DHH 更情绪，Beck 更个人**

> "I disagree that agile has won - **the label has won, but many people say they do agile but don't really. This is typical for things like this, a process I call semantic diffusion.**" —— Fowler [一手，第 5 集]

> "Kent says that **he hasn't seen the things with TDD that David has. He always applies TDD from first principles in his work.**" [一手，第 5 集]

**（e）对"AI 时代"的立场 —— 目前只见 Beck，Fowler 未见对应表态**（本次检索未发现，标注「未核实」）

> "**The whole landscape of what's 'cheap' and what's 'expensive' has all just shifted.** Things that we didn't do because we assumed they were going to be expensive or hard just got ridiculously cheap. **Like, what would you do today if cars were suddenly free?** Okay, things are going to be different, but what are the second and third-order effects? **Nobody can predict that! So we just have to be trying stuff.**" —— Kent Beck [一手转述，<https://newsletter.pragmaticengineer.com/p/tdd-ai-agents-and-coding-with-kent>]

---

## 5. 与 Michael Feathers 的对比

### 5.1 Feathers 的立足点：无测试的遗留代码怎么办

Feathers 最著名的定义（多次被引用，本次通过多个二手来源交叉确认）：

> "**Legacy code is code without tests. Code without tests is bad code. It doesn't matter how well [written it is]**"

出处之一：senior-stack.uz 的 legacy code 教程页 [二手，<https://senior-stack.uz/Roadmap/Programming/code-craft/working-with-legacy-code>]
出处之二：Feathers 本人在 itemis 访谈中重述：

> "**Legacy Code is a term so we can define it in many ways. I am known for this definition of legacy code where I said: "Leg[acy code is code without tests]..."**" [一手转引，<https://blogs.itemis.com/en/going-fast-is-making-things-worse-interview-with-michael-feathers>；**该页面经 itemis.com 跨域重定向，本次未取得完整正文**]

**⚠️ 本条引文标注为「二手 + 部分未核实」**：原书 Preface 的完整原句，本次未从《Working Effectively with Legacy Code》（2005，ISBN 978-0131177055）原书或出版商页面直接取证。多个二手来源（senior-stack、LobeHub skill 页、agent-skills.md）引用的措辞一致，交叉一致性较高，但**不能算作已核实的一手原文**。

**Feathers 的定义本身就已经是一个立场宣示**：他的整本书是**为"没有测试的代码"写的**。

### 5.2 与 Beck 的核心分歧：前提不同

这是本维度里最干净的一组对比。**不是观点对立，是问题域不同。**

| | **Beck（TDD）** | **Feathers（Working Effectively with Legacy Code）** |
|---|---|---|
| **起点** | 你可以**先写测试** | 你**手上没有测试**，而且代码可能极难测 |
| **隐含前提** | 存在（或可以建立）快速反馈回路 | 反馈回路**尚不存在**，需要先造出来 |
| **核心问题** | "下一步写哪个测试" | "**怎么在不破坏行为的前提下，先给这段代码套上测试**" |
| **关键技术** | Test List、Red-Green-Refactor | **Seam（接缝）**、Characterization Test（特征测试）、Sprout Method/Class、Wrap Method |
| **对"设计"的态度** | 设计从测试压力中演化 | 设计在**既有结构**的约束下逐步撬动 |
| **失败模式** | 被试为"戒律"（Uncle Bob 式） | 被误用为"什么都不改就写测试" |

**关键交叉点：学术界自己承认了这条分歧是真实存在的**（见 §3.5 因素 4）：

> "**In legacy systems that lack unit test cases, TDD may not be applicable as developers are deprived of the quick feedback from tests on changes.**" [一手，Ghafari et al. 2020]

**[推断] 这句是 Feathers 立足点的最强外部背书。** 它意味着：Beck 的 TDD 在遗留系统里**可能直接不适用**，而 Feathers 的方法恰恰是为这个区间设计的。**两者不是竞争，是覆盖不同区间的两套方法。**

### 5.3 Beck 本人对 Feathers 路线的间接表态

Beck 在《Tidy First?》里承认"结构改动（S）"本身是有独立价值的一类动作（15 个 tidyings），而 tidyings 的定位是**"不影响行为、几乎平凡简单"**——这实际上是 **Feathers 式"在小步中安全推进"的现代版本**：[推断]

> "**These changes do not alter the program behavior, and are almost trivially simple.**" [一手转引，Warne，<https://henrikwarne.com/2024/01/10/tidy-first/>]

而 Beck 在 2014 年争论里也承认了"没有测试的代码"的处境：

> "**I recognize that TDD loses value ... as tests become coupled to the implementation, and as tests lose fidelity with the production environment.**" [一手，Beck 的 Facebook note，经 <http://www.obeythetestinggoat.com/kent-beck-on-the-limits-of-tdd.html> 转引]

**⚠️ 事实缺口**：本次检索**未找到 Beck 与 Feathers 就"无测试代码怎么办"的公开直接对话或互相引用**。标注「**两人直接交锋的材料未核实**」。上面所有对比均为**基于两人各自立场的并列**，不是两人之间的实际争论。

### 5.4 Feathers 对"TDD 的代价"的另一条视角

Feathers 在 2024 年的访谈里有一个与 DHH 呼应的判断（标题即观点）：

> "**Going fast is making things worse** - Interview with Michael Feathers" [一手标题，<https://blogs.itemis.com/en/going-fast-is-making-things-worse-interview-with-michael-feathers>；**正文未取得，仅有标题，论点细节未核实**]

同一访谈系列的播客描述（techleadjournal.dev 第 195 期，2024-10-14）：

> "**Michael Feathers, renowned software expert and author of the classic "Working Effectively with Legacy Code," joins the [show]**" [二手，<https://techleadjournal.dev/episodes/195>；**正文未抓取**]

**另一条常被作为 TDD 支持论据引用的 Feathers 语录**（注意：这是 Feathers 说的，不是 Beck 说的）：

> "**Confidence to refactor comes from test coverage**" —— Michael Feathers（Working Effectively with Legacy Code）[二手转引，<https://lobehub.com/zh/skills/llllimbo-skills-tdd> 与 <https://agent-skills.md/skills/LLLLimbo/Skills/tdd>；**原书页码未核实**]

**[推断] 这条语录非常关键**：它说明 Feathers 与 Beck 在"测试是重构的前提"上**完全一致**，分歧只在"测试还不存在时怎么办"。这也意味着**把 Feathers 写成 Beck 的批评者是不准确的**——他们是**问题域的邻居**，不是对手。

---
