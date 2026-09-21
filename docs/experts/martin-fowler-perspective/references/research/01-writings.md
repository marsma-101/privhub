# Martin Fowler 著作与系统性长文 · 一手素材

> 调研范围：martinfowler.com 站内一手材料（bliki / articles / books / aboutMe / 全站内容索引）。
> 标注约定：`[一手]` = Fowler 本人撰写；`[一手·合著]` = 他署名合著；`[站内·他人]` = 发在他站上但**不是他写的**；`[二手]` = 他人总结；`[推断]` = 本调研的推断。
> 检索日期：见文末「调研方法与工具限制」。所有 URL 均为实测可访问，除非明确标注「未核实」。
> **未核实的内容一律标注，未虚构任何 bliki 标题或 URL。**

---

## 一手来源清单

### A. 书籍（来源：他本人的书目页 <https://martinfowler.com/books/>）[一手]

| 书名 | 作者 | 年份 | 备注 |
|---|---|---|---|
| *Refactoring: Improving the Design of Existing Code* | Martin Fowler, with Kent Beck | 2018（2nd ed） | 1st ed 1999，见 <https://martinfowler.com/books/refactoring.html> |
| *NoSQL Distilled* | Pramod J. Sadalage and Martin Fowler | 2012 | |
| *Domain Specific Languages* | Martin Fowler, with Rebecca Parsons | 2010 | |
| *Refactoring Ruby Edition* | Jay Fields, Shane Harvie, Martin Fowler, with Kent Beck | 2009 | |
| *UML Distilled* | Martin Fowler | 2003 | 书目页只标 2003（该书为第三版年份，首版年份**未核实**） |
| *Patterns of Enterprise Application Architecture* | Martin Fowler, with Dave Rice, Matthew Foemmel, Edward Hieatt, Robert Mee, Randy Stafford | 2002 | |
| *Planning Extreme Programming* | Kent Beck and Martin Fowler | 2000 | |
| *Analysis Patterns* | Martin Fowler | 1996 | |

**他自任主编的 Signature Series（Addison-Wesley，2002 起）**，共 10 本，非他本人著作 —— 含 *Patterns of Distributed Systems*（Unmesh Joshi, 2023）、*Continuous Delivery*（Humble & Farley, 2010）、*xUnit Test Patterns*（Meszaros, 2007）、*Refactoring Databases*（Ambler & Sadalage, 2006）、*Refactoring to Patterns*（Kerievsky, 2004）等。他自述选书标准是「长期有效的基础知识，不随技术变化而过时」，该系列获 7 次 Jolt 奖。[一手]

### B. 关键长文与 bliki（全部实测 200，URL 与标题按站内原文）

**重构本体**
- 定义与边界
  - <https://martinfowler.com/bliki/DefinitionOfRefactoring.html> — "Definition Of Refactoring"（2004-09-01）
  - <https://martinfowler.com/bliki/RefactoringBoundary.html> — "Refactoring Boundary"（2004-09-01）
  - <https://martinfowler.com/bliki/RefactoringMalapropism.html> — "Refactoring Malapropism"（2004-01-03）
  - <https://martinfowler.com/bliki/IsChangingInterfacesRefactoring.html> — "Is Changing Interfaces Refactoring"（2007-09-02）
  - <https://martinfowler.com/bliki/EtymologyOfRefactoring.html> — "Etymology Of Refactoring"（2003-09-10）
- 工作方式
  - <https://martinfowler.com/bliki/OpportunisticRefactoring.html> — "Opportunistic Refactoring"（2011-11-01）
  - <https://martinfowler.com/articles/workflowsOfRefactoring/> — "Workflows of Refactoring"（2014-01-08，infodeck；目录含 `#2hats`、`#tdd-hats`、`#litter-pickup`、`#comprehension`、`#preparatory`、`#planned`、`#long-term`）
- 书与版本史
  - <https://martinfowler.com/books/refactoring.html> — 书目页（2nd ed 2018）
  - <https://martinfowler.com/articles/refactoring-2nd-ed.html> — "The Second Edition of 'Refactoring'"（含 2018 全年写作备忘录）
  - <https://martinfowler.com/articles/refactoring-2nd-changes.html> — "Changes for the 2nd Edition of Refactoring"（存在，未逐字抓取）
  - <https://refactoring.com> / <https://refactoring.com/catalog> — 他维护的重构目录

**演化式设计与架构**
- <https://martinfowler.com/bliki/Yagni.html> — "Yagni"（2015-05-26）
- <https://martinfowler.com/bliki/TechnicalDebt.html> — "Technical Debt"（2019-05-21；原 2003-10-01，2019-04 重写）
- <https://martinfowler.com/bliki/SacrificialArchitecture.html> — "Sacrificial Architecture"（2014-10-20）
- <https://martinfowler.com/bliki/StranglerFigApplication.html> — "Strangler Fig"（2024-08-22）
- <https://martinfowler.com/bliki/InternalReprogrammability.html> — "Internal Reprogrammability"（2013-01-10，2020-02-24 修订）
- <https://martinfowler.com/bliki/ArchitectureDecisionRecord.html> — "Architecture Decision Record"（2026-03-24）
- <https://martinfowler.com/bliki/MythicalManMonth.html> — "Mythical Man Month"（2026-05-05）
- <https://martinfowler.com/bliki/ParacelsusMaxim.html> — "Paracelsus Maxim"（2026-09-02，站内最新 bliki）

**交付与测试**
- <https://martinfowler.com/articles/continuousIntegration.html> — "Continuous Integration"（2024-01-18；原文 2001，2006 更新，2023 重写）
- <https://martinfowler.com/bliki/SelfTestingCode.html> — "Self Testing Code"（2014-05-01；简短版原发 2005-05-05）

**接口与术语演化（版本号议题相关）**
- <https://martinfowler.com/bliki/TolerantReader.html> — "Tolerant Reader"（2011-05-09）
- <https://martinfowler.com/bliki/PervasiveVersioning.html> — "Pervasive Versioning"（2006-08-21）
- <https://martinfowler.com/bliki/SemanticDiff.html> — "Semantic Diff"（2004-12-06）
- 站内存在但本次未逐字抓取：`SemanticConflict.html`、`SemanticDiffusion.html`、`TwoHardThings.html`、`CodeSmell.html`、`TestDrivenDevelopment.html`、`UnitTest.html`、`TechnicalDebtQuadrant.html`、`DesignStaminaHypothesis.html`、`ContinuousDelivery.html`、`MicroserviceTradeOffs`（`articles/microservice-trade-offs.html`）

**架构长文**
- <https://martinfowler.com/articles/microservices.html> — "Microservices"（2014-03-25）[一手·合著：James Lewis & Martin Fowler]
- <https://martinfowler.com/articles/designDead.html> — "Is Design Dead?"（存在，Yagni 一文称其为演化式设计的使能实践论述处；本次未逐字抓取）

**站点自身**
- <https://martinfowler.com/aboutMe.html> — 自述
- <https://martinfowler.com/tags/> — 全站内容索引，页首自述 "This site contains some 934 items of content"（本次抓取时）；本次调研据此核实 bliki 标题与 URL 的真实性

### C. 站内但**非他署名**的重要长文（极易误当归于他，务必区分）[站内·他人]

| URL | 标题 | 作者 | 日期 |
|---|---|---|---|
| <https://martinfowler.com/articles/consumerDrivenContracts.html> | Consumer-Driven Contracts: A Service Evolution Pattern | **Ian Robinson** | 2006-06-12 |
| <https://martinfowler.com/articles/enterpriseREST.html> | Enterprise Integration Using REST | **Brandon Byars** | 2013-11-18 |

- Consumer-Driven Contracts 致谢名单含 Martin Fowler（审阅/讨论角色）。
- Enterprise Integration Using REST 致谢写 "Special thanks to Martin Fowler, … for early feedback on this article."
- **这两篇是站内讨论「服务版本化 / 扩展点 / breaking change / semver」最详尽的两篇，但作者不是 Fowler。**（详见「版本号与变更日志主张」一节）

---

## 核心论点（按重复次数排序）

次数为本次调研在其站内一手文本中检索到的出现频次，属 [推断]（基于本次取样，非全文语料统计）。

### 1. 重构 = 在不改变**可观察行为**的前提下改进内部结构；由一串「小到不值得做」的行为保持变换组成（出现 ≥7 次）

书籍定义（他直接引用自己的书）：

> **Refactoring (noun):** a change made to the internal structure of software to make it easier to understand and cheaper to modify without changing its observable behavior.
> **Refactoring (verb):** to restructure software by applying a series of refactorings without changing its observable behavior.
>
> — <https://martinfowler.com/bliki/DefinitionOfRefactoring.html> [一手]

中译：重构（名词）——在不改变可观察行为的前提下，对软件内部结构所做的改动，目的是让它更易理解、更易修改。重构（动词）——通过施加一系列重构手法，在不改变可观察行为的前提下重构软件结构。

书目页：「Refactoring is a controlled technique for improving the design of an existing code base. Its essence is applying a series of small behavior-preserving transformations, each of which 'too small to be worth doing'.」（<https://martinfowler.com/books/refactoring.html>）[一手]
中译：重构是一种受控的技术，用于改进既有代码库的设计。其本质是施加一系列微小的、保持行为的变换，每一个都「小到不值得单独去做」。

他明确承认这个定义是**故意不严谨**的，争议点在于两个短语（<https://martinfowler.com/bliki/RefactoringBoundary.html>）[一手]：

> The informality rests on a couple of phrases that are distinctly open to interpretation: *without changing its observable behavior* … *to make it easier to understand and cheaper to modify*: this gets at the purpose of refactoring. … The same changes made with a different purpose aren't refactoring as I see it.

中译：这份定义的不严谨建立在两个明显可多重解读的短语上：「不改变其可观察行为」……「让它更易理解、更易修改」——这指向重构的**目的**。同样的改动，若出于别的目的，在我看来就不是重构。

### 2. 重构必须有测试/回归套件托底；测试是绿的才动手（出现 ≥6 次）

> But do remember that you should only refactor when your tests are green.
>
> — <https://martinfowler.com/bliki/OpportunisticRefactoring.html> [一手]

中译：但请记住，只有当你的测试是绿的，你才应该重构。

> Refactoring does depend on having a good regression suite and it's wise to be wary if you think you're about to touch part of an application that's weaker on its tests than it should be.
>
> — 同上 [一手]

中译：重构确实依赖一套好的回归测试；如果你即将改动的部分测试比应有的水平弱，那就要当心。

> This is another area where tests are essential even in environments that have refactoring tools.
>
> — <https://martinfowler.com/bliki/IsChangingInterfacesRefactoring.html> [一手]

中译：这又是一个即使有重构工具、测试也不可或缺的领域。

> …as well as building your software system, you simultaneously build a bug detector that's able to detect any faults inside the system.
>
> — <https://martinfowler.com/bliki/SelfTestingCode.html> [一手]

中译：在构建软件系统的同时，你也构建了一个「缺陷探测器」，能探测系统内部的任何故障。

### 3. 重构应是持续的机会主义行为，不该被排进 backlog / 做成阶段（出现 ≥4 次）

> Although there are places for some scheduled refactoring efforts, I prefer to encourage refactoring as an opportunistic activity, done whenever and wherever code needs to cleaned up - by whoever.
> …a team that's using refactoring well should hardly ever need to plan refactoring…
>
> — <https://martinfowler.com/bliki/OpportunisticRefactoring.html> [一手]

中译：尽管在有些场合需要安排专门的重构工作，我更倾向于把重构当作一种机会主义活动——任何时候、任何地方需要清理代码，就由任何人去做。……用好重构的团队，几乎不需要去「计划重构」。

> If somebody talks about a system being broken for a couple of days while they are refactoring, you can be pretty sure they are not refactoring.
>
> — <https://martinfowler.com/bliki/RefactoringMalapropism.html> [一手]

中译：如果有人跟你说系统因为他们在重构而坏了几天，你基本可以确定他们不是在重构。

他还把「重构」与更宽泛的「restructuring」严格分开：「I see refactoring as a very specific technique to do the more general activity of restructuring.」（同上）
并否认自己发明了重构：「Important point, I'm not the father or the inventor of refactoring - just a documenter.」（同上）[一手]

### 4. 演化式设计（evolutionary design）：Yagni + 自测试代码 + 持续交付是**使能实践**，缺一不可（出现 ≥4 次）

> Yagni only applies to capabilities built into the software to support a presumptive feature, it does not apply to effort to make the software easier to modify. Yagni is only a viable strategy if the code is easy to change, so expending effort on refactoring isn't a violation of yagni… These are enabling practices for evolutionary design, without them yagni turns from a beneficial practice into a curse.
>
> — <https://martinfowler.com/bliki/Yagni.html> [一手]

中译：Yagni 只适用于「为某个假定功能而写进软件里的能力」，不适用于「让软件更易修改的努力」。只有当代码易于修改时，Yagni 才是可行策略，所以在重构上花力气并不违反 Yagni。……这些是演化式设计的使能实践，没有它们，Yagni 就从有益实践变成诅咒。

Yagni 一文的四类成本模型（他的原创分析）：**cost of build / cost of delay / cost of carry / cost of repair**；三类假定功能：成功、失败、以及「对的功能够做错了（the right feature built wrong）」。[一手]
他引用 Kohavi 等人的数据称，即便做足前期分析，也只有 ⅓ 的功能真的改善了它本要改善的指标 —— 「for which your odds are at least ⅔」（你至少有 2/3 的概率在做无用功能）。[一手，数据源自 Kohavi et al.]

### 5. 持续集成 = 每人至少每天合并进主线 + 每次推送触发自动化构建（含测试）（出现 ≥3 次）

> Continuous Integration is a software development practice where each member of a team merges their changes into a codebase together with their colleagues changes at least daily. Each of these integrations is verified by an automated build (including test) to detect integration errors as quickly as possible.
>
> — <https://martinfowler.com/articles/continuousIntegration.html> [一手]

中译：持续集成是一种软件开发实践：团队每个成员至少每天把自己的改动与同事的改动一起合并进同一个代码库。每次集成都由一次自动化构建（含测试）来验证，以便尽快发现集成错误。

他把集成分为三种风格：**Pre-Release Integration / Feature Branches / Continuous Integration**，并明确「Semi-Integration isn't Continuous Integration」——特性分支下的日常 pull 只是「半集成」（<https://martinfowler.com/articles/continuousIntegration.html>）。[一手]
> This is only semi-integration because each developer combines the changes on mainline to their own local branch. … Even if Rebecca and I both pull the same changes from mainline, we've only integrated with those changes, not with each other's branches.

中译：这只是半集成，因为每个开发者只是把主线上的改动合并到自己的本地分支。……即使 Rebecca 和我都从主线拉了同样的改动，我们也只是与那些改动集成了，而**没有**与彼此的分支集成。

该文列出的 11 条实践（原文小标题）：Put everything in a version controlled mainline / Automate the Build / Make the Build Self-Testing / Everyone Pushes Commits To the Mainline Every Day / Every Push to Mainline Should Trigger a Build / Fix Broken Builds Immediately / Keep the Build Fast / Hide Work-in-Progress / Test in a Clone of the Production Environment / Everyone can see what's happening / Automate Deployment。[一手]

### 6. 内部质量不是成本，而是加速器（Design Stamina Hypothesis / 技术债隐喻）（出现 ≥3 次）

> The extra effort that it takes to add new features is the interest paid on the debt.
> …crufty but stable areas of code can be left alone. In contrast, areas of high activity need a zero-tolerance attitude to cruft…
>
> — <https://martinfowler.com/bliki/TechnicalDebt.html> [一手]

中译：为增加新功能而多花的力气，就是为这笔债支付的利息。……腐坏但稳定的代码区可以放着不管；相反，高频改动区需要对腐坏零容忍。

> if you don't spend time on taking your opportunities to refactor, then the code base gradually degrades and you're faced with slower progress…
>
> — <https://martinfowler.com/bliki/OpportunisticRefactoring.html> [一手]

特别值得注意：他明确点出**技术债隐喻常被用来为忽视内部质量辩护，而且这种分析通常做得很糟**：
> The danger here is that most of the time this analysis isn't done well. Cruft has a quick impact, slowing down the very new features that are needed quickly. Teams who do this end up maxing out all their credit cards, but still delivering later than they would have done had they put the effort into higher internal quality.
>
> — <https://martinfowler.com/bliki/TechnicalDebt.html> [一手]

中译：危险在于，这种分析多数时候做得很差。腐坏会很快产生冲击，恰恰拖慢那些被急需的新功能。这么干的团队最后刷爆了所有信用卡，却仍比当初肯在内部质量上投入时交付得更晚。

### 7. 可替换性优先于长寿；丢掉代码不等于失败（出现 ≥3 次）

> But often the best code you can write now is code you'll discard in a couple of years time.
> …Knowing your architecture is sacrificial doesn't mean abandoning the internal quality of the software.
>
> — <https://martinfowler.com/bliki/SacrificialArchitecture.html> [一手]

中译：但很多时候，你现在能写的最好的代码，就是两年后会被你丢掉的代码。……知道自己的架构是可牺牲的，并不意味着放弃软件的内部质量。

> The team that writes the sacrificial architecture is the team that decides it's time to sacrifice it. … It's easy to hate code you didn't write, without an understanding of the context in which it was written.
>
> — 同上 [一手]

中译：写这套「献祭架构」的团队，才是决定何时该献祭它的团队。……人很容易讨厌不是自己写的代码，因为不了解它当初写就的语境。

Microservices 一文同调：「many microservice groups take this further by explicitly expecting many services to be scrapped rather than evolved in the longer term.」（<https://martinfowler.com/articles/microservices.html>）[一手·合著]
中译：许多微服务团队更进一步，明确预期大量服务在长期会被丢弃而不是被演化。

### 8. 概念完整性（conceptual integrity）是其职业生涯的贯穿线索（出现 ≥2 次，但自述影响最深）

> I will contend that conceptual integrity is the most important consideration in system design. … This point of view has been a strong influence upon my career, the pursuit of conceptual integrity underpins much of my work.
>
> — <https://martinfowler.com/bliki/MythicalManMonth.html> [一手]（引言出自 Fred Brooks）

中译：（Brooks：）我认为概念完整性是系统设计中最重要的考量。……（Fowler：）这一观点对我的职业生涯影响至深，对概念完整性的追求支撑了我大部分工作。

### 9. 术语精确性是一种执念（出现 ≥7 次）

从 `RefactoringMalapropism`（2004）、`RefactoringBoundary`（2004）、`EtymologyOfRefactoring`（2003）到 `SemanticDiff`（2004）、`SemanticDiffusion`、`InternalReprogrammability`（2013）、`Yagni`（2015）、`RefactoringMalapropism` 对「重构」被滥用的持续抗议：

> I realize I may be fighting a losing game here, but I do want to preserve the precision of the DefinitionOfRefactoring.
>
> — <https://martinfowler.com/bliki/RefactoringMalapropism.html> [一手]

中译：我意识到这可能是一场注定要输的仗，但我确实想保住建构定义的精确性。

**这可能是最该写进「思维 Skill」的一条**：他对**词**的用法有近乎洁癖的坚持，且愿意为此反复写文章、哪怕明知会输。

### 10. 自我定位：不是原创者，是识别者与打包者（出现 ≥2 次，直击人设）

> I don't come up with original ideas, but do a pretty good job of recognizing and packaging the ideas of others, or as Brian Foote describes me: **"an intellectual jackal with good taste in carrion"**.
>
> — <https://martinfowler.com/aboutMe.html> [一手]

中译：我提不出原创想法，但我很擅长识别并打包别人的想法——或者用 Brian Foote 形容我的话：「一只口味考究的、吃腐肉的学术胡狼。」

同页：[一手]
> I work for Thoughtworks … where I have the exceedingly inappropriate title of "Chief Scientist". … I enjoy the irony of my title, as I'm not chief of anybody and don't do any science.

中译：我在 Thoughtworks 工作……挂着那个极不合适的头衔「首席科学家」。……我很享受这个头衔的反讽，因为我既不统领任何人，也不做任何科学。

---

## 自创术语表

严格的「自创」极少 —— 多数是**记录、命名、或推广**。以下逐条区分。

| 术语 | 状态 | 关键出处与说明 |
|---|---|---|
| **refactoring** | **非他自创**，他是记录者 | 「I'm not the father or the inventor of refactoring - just a documenter.」<https://martinfowler.com/bliki/RefactoringMalapropism.html> [一手]。词源：Bill Opdyke 回忆与 Ralph Johnson 散步时的对话（把 Software Factory 改为 Software *Re*factory）；最早印刷出现是 Leo Brodie《Thinking Forth》(1984)，由 Bill Wake 挖出；Forth 与 Smalltalk 社区各自独立发展。见 <https://martinfowler.com/bliki/EtymologyOfRefactoring.html> [一手] |
| **code smell** | 由他与 Beck 在《Refactoring》书中系统化（「a survey of 'code smells'」） | <https://martinfowler.com/books/refactoring.html>；站内另有 `bliki/CodeSmell.html`（未逐字抓取）。是否为其「自创」**未核实**。[推断] 更准确的说法是「他使之流行」 |
| **two hats（两顶帽子）** | **Kent Beck 的隐喻**，由 Fowler 记录 | 「Kent Beck came up with a metaphor of the two hats.」——出自《Refactoring》2nd ed 第 2 章 [一手·书，原文措辞经网络流传的 2nd ed 电子版片段核对，**官方页码未核实**]。站内讲授处：<https://martinfowler.com/articles/workflowsOfRefactoring/> 的 `#2hats` 与 `#tdd-hats` 两节（该 infodeck 正文由 JS 渲染，**本次未能抓取正文**，仅确认锚点存在）[推断：锚点存在即他讲过该主题] |
| **strangler fig（绞杀榕）** | 他命名并推广 | 2001 年昆士兰雨林度假时的观察，几年后发短帖，原题 "Strangler Application"，后改名 "Strangler Fig Application" 以强调其植物学来源、淡化「strangling」的暴力联想。见 <https://martinfowler.com/bliki/StranglerFigApplication.html> [一手]；原帖见 `bliki/OriginalStranglerFigApplication.html` |
| **sacrificial architecture（献祭式架构）** | 他命名 | <https://martinfowler.com/bliki/SacrificialArchitecture.html>（2014-10-20）[一手]。文中引 Jeff Dean：「design for ~10X growth, but plan to rewrite before ~100X」 |
| **semantic diff（语义 diff）** | 他命名，自称不确定是否已有通用词 | 「A semantic diff would understand the purpose of the change, rather than just the effect.」+「(There may be a generally accepted term for this, if so please let me know.)」<https://martinfowler.com/bliki/SemanticDiff.html>（2004-12-06）[一手] |
| **semantic conflict** | 站内条目存在 | `bliki/SemanticConflict.html`（未逐字抓取）。CI 文中的定义：「The harder problem are Semantic Conflicts. If my colleague changes the name of a function and I call that function in my newly added code, the version-control system can't help us.」[一手] |
| **semantic diffusion（词义扩散）** | 站内条目存在 | `bliki/SemanticDiffusion.html`（未逐字抓取）。Vibe Coding 一文中用作动词：「despite this rapid Semantic Diffusion」[一手] |
| **internal reprogrammability（内部可重编程性）** | 他命名 | <https://martinfowler.com/bliki/InternalReprogrammability.html>（2013-01-10）[一手]。指的是 Emacs / Smalltalk / Lisp / shell 那种「在环境内部、用与核心相同的语言即时改造工具」的能力。**注意：不是 "InternalReprogramming"** |
| **yagni** | XP 口号，他记录并系统化论证 | 起源：Kent Beck 与 Chet Hendrickson 在 C3 项目上的对话，Chet 逐条列举系统很快会需要的能力，Kent 逐条回答 "you aren't going to need it"。详见 <https://martinfowler.com/bliki/Yagni.html> [一手]。他主张该词已从缩略语变成普通词，故「forego the capital letters」 |
| **microservices** | **非他自创**，他与 James Lewis 给的定义文 | 术语 2011-05 威尼斯某架构师工作坊上被讨论，2012-05 同一批人定名；James Lewis 2012-03 在 33rd Degree 演讲；Fred George 同期；Adrian Cockcroft 在 Netflix 称之为 "fine grained SOA"。Fowler & Lewis 于 2014-03-25 发表定义文章 —— 这是该术语的**权威定义来源**。见 <https://martinfowler.com/articles/microservices.html> [一手·合著] |
| **self-testing code** | 他在《Refactoring》书中的用词 | <https://martinfowler.com/bliki/SelfTestingCode.html> [一手]。灵感来源：OOPSLA 会议上 "Beddara" Dave Thomas 说「每个对象都应能测试自己」 |
| **Technical Debt（技术债）** | **Ward Cunningham 造词**，Fowler 系统化 | 「Technical Debt is a metaphor, coined by Ward Cunningham」；Ward 首次提出于 OOPSLA 1992 经验报告。见 <https://martinfowler.com/bliki/TechnicalDebt.html> [一手] |
| **Technical Debt Quadrant / Design Stamina Hypothesis / Diff Debugging / Parallel Change (expand-contract) / Keystone Interface / Branch By Abstraction / Feature Flag / Test Double / Contract Test / Deployment Pipeline / Refactoring Malapropism / Refactoring Boundary / Design Payoff Line** | 站内条目均存在 | 标题已由 <https://martinfowler.com/tags/> 全站索引核实；未逐条抓取正文 |
| **Architecture Decision Record（ADR）** | **Michael Nygard 造词**，Fowler 补充 | 「Michael Nygard coined the term 'Architecture Decision Record'」<https://martinfowler.com/bliki/ArchitectureDecisionRecord.html> [一手] |
| **Lethal Trifecta** | **Simon Willison 造词**，Fowler 引用 | <https://martinfowler.com/bliki/AgenticEmail.html> [一手] |
| **vibe coding** | **Andrej Karpathy 造词（2025-02）**，Fowler 引用并区分出 Agentic Programming | <https://martinfowler.com/bliki/VibeCoding.html> [一手] |

---

## 版本号与变更日志主张

**这一节是本调研最重要的发现，且与任务前提存在冲突，故先给结论再给证据。**

### 结论 [推断，基于全站索引实测]

**在 martinfowler.com 的 934 条内容索引中，不存在任何标题为 "Semantic Versioning" 或 "Changelog" 的条目；`/bliki/SemanticVersioning.html` 实测返回 HTTP 404。**
因此：**「Fowler 批评 Semantic Versioning」这一说法，在本次调研范围内无法用一手材料证实。** 按「不得编造」的要求，本文件**不声称**他有过该表态，也**不虚构**任何相关 bliki 标题或 URL。

他对「版本号 / 变更记录」的真实主张，散落在以下五处，且主题**不是** semver 的 MAJOR.MINOR.PATCH 语义承诺，而是「可追溯、可比较、表达意图、能不用就不用」。

### 1. 版本信息必须可见、必须能追回版本控制系统 [一手]

> When deploying software like this, remember to ensure that version information is visible. An about screen should contain a build id that ties back to version control, logs should make it easy to see which version of the software is running, there should be some API endpoint that will give version information.
>
> — <https://martinfowler.com/articles/continuousIntegration.html> [一手]

中译：这样部署软件时，记得确保版本信息是可见的。关于页面应包含一个能追回版本控制系统的 build id；日志应能让人一眼看出在跑的是哪个版本；还应有某个 API 端点给出版本信息。

> **My test for full version control** is that I should be able to walk up with a very minimally configured environment - say a laptop with no more than the vanilla operating system installed - and be able to easily build, and run the product after cloning the repository.
>
> — 同上 [一手]

中译：我对「是否真的做全了版本控制」的检验标准是：我拿来一台几乎没配置的机器——比如一台只装了原版操作系统的笔记本——克隆仓库后就应当能轻松构建并运行这个产品。
（他给出的清单：源码、测试、数据库 schema、测试数据、配置文件、IDE 配置、安装脚本、第三方库、构建所需工具，**全部**应能从仓库取回。「store in source control everything we need to build anything, but nothing that we actually build.」）[一手]

### 2. 依赖必须钉住**具体版本**，绝不引用「最新版本」 [一手]

> I can also do this with library code, providing I both trust the asset storage and always reference a particular version, never "the latest version".
>
> — <https://martinfowler.com/articles/continuousIntegration.html> [一手]

中译：对库代码我也可以这么做，前提是我既信任该资产存储，又始终引用**某个特定版本**，而绝不是「最新版本」。

配套主张：**依赖升级要自动、每日做**，当作「另一个团队成员」而不是靠版本号承诺来回避：
> A team should thus automatically check for new versions of dependencies and integrate them into the build, essentially as if they were another team member. This should be done frequently, usually at least daily, depending on the rate of change of the dependencies.
>
> — 同上 [一手]

中译：团队应自动检查依赖的新版本并集成进构建，基本上就像它是另一个团队成员。这件事要频繁做，通常至少每天一次，取决于依赖的变更速率。

### 3. 变更记录应表达**意图**，而非只是文本差异（semantic diff） [一手]

> Most version control systems rely on using and understanding the changes between versions of artifacts - often referred to as diffs… The trouble with these diffs is that they are rather dumb. All they do is look at the two artifact versions and generate a simple way of getting from one to another.
> **A semantic diff would understand the purpose of the change, rather than just the effect.**
>
> — <https://martinfowler.com/bliki/SemanticDiff.html> [一手]

中译：多数版本控制系统依赖对版本间差异的理解——通常叫 diff……问题在于这些 diff 相当笨：它们只是看着两个版本，生成一条从 A 到 B 的简单路径。**语义 diff 会理解变更的意图，而不只是变更的效果。**

他举的例子：如果两个版本之间唯一的改动是执行了一次 Extract Method 重构，现有工具只能看到程序文本变了，**不知道这是一次重构**，因此 diff 无法高亮「这是重构」，merge 也变得比本可以做到的更笨拙。[一手]

### 4. 服务演化：能不版本化就不版本化，用**容错读取**代替版本号 [一手 / 一手·合著]

Microservices（与 James Lewis 合著）明确写出偏好：
> The traditional integration approach is to try to deal with this problem using versioning, but **the preference in the microservice world is to only use versioning as a last resort**. We can avoid a lot of versioning by designing services to be as tolerant as possible to changes in their suppliers.
>
> — <https://martinfowler.com/articles/microservices.html> [一手·合著]

中译：传统的集成做法是试图用版本化来解决这个问题，但微服务世界的偏好是**只把版本化当作最后手段**。我们可以通过把服务设计得尽可能容忍供应方的变化，来避免大量版本化。

Tolerant Reader 给出机制（Postel's Law / 鲁棒性原则）：
> be conservative in what you do, be liberal in what you accept from others. -- Jon Postel
> …My recommendation is to be as tolerant as possible when reading data from a service. If you're consuming an XML file, then only take the elements you need, ignore anything you don't. …Rather than use an XPath search like `/order-history/order-list/order` use `//order`. Your aim should be to allow the provider to make any change that ought not to break your code.
> …Adding field to an interface like this shouldn't be a breaking change for anyone - but often does break these schemes.
>
> — <https://martinfowler.com/bliki/TolerantReader.html> [一手]

中译：（Postel）发送时保守，接收时宽容。……我的建议是读取服务数据时尽可能宽容：消费 XML 就只取你需要的元素，忽略其余；别用 `/order-history/order-list/order` 这种 XPath，用 `//order`。你的目标是让提供方能做任何「本不该打断你代码」的改动。……像这样给接口加一个字段，对谁都不该是破坏性变更——但在这些方案里往往就是会断。

**他对「接口变更算不算重构」的判定，直接决定了版本号的必要性** [一手]：
> The answer to this question is pretty simple - changing an interface is a refactoring providing you change all the callers too. … Interface changing refactorings do assume that you can get hold of all the callers, which is why you have to be much more careful with PublishedInterfaces. **With a published interface, the interface itself is part of the observable behavior of the system.**
>
> — <https://martinfowler.com/bliki/IsChangingInterfacesRefactoring.html>

中译：答案很简单——只要你把所有调用方一并改掉，改接口就是重构。……改接口类重构的前提是你抓得到全部调用方，所以对**已发布接口（published interface）**必须谨慎得多。**对于已发布接口，接口本身就是系统可观察行为的一部分。**

→ [推断] 这就是他版本号问题的**真正的分界线**：只要调用方全在你手里，接口变更=重构，不需要版本号；一旦接口已发布给不受你控制的消费方，它就进入「可观察行为」，才可能被迫引入版本化。这与 Microservices 一文「把版本化当最后手段」一致。

### 5. 「记录」不可改写，只能被取代；编号单调递增 [一手]

这是他关于变更记录最接近的一条正面主张，出现在 ADR（架构决策记录）条目：
> They should not be modified if the decision is changed, but linked to a superseding decision. … Each ADR has a status. "proposed" … "accepted" … "superseded" once it is significantly modified or replaced - with a link to the superseding ADR. **Once an ADR is accepted, it should never be reopened or changed - instead it should be superseded. That way we have a clear log of decisions and how long they governed the work.**
> …Each record should be its own file, and should be numbered in a **monotonic sequence** as part of their file name… (for example: "`0001-HTMX-for-active-web-pages`")
> The most important thing to bear in mind here is brevity.
>
> — <https://martinfowler.com/bliki/ArchitectureDecisionRecord.html>（2026-03-24）[一手]

中译：决策若改变，不应修改原记录，而应链接到取代它的新决策。……每条 ADR 都有状态：讨论中为 "proposed"，团队接受并生效为 "accepted"，被重大修改或替换后为 "superseded" 并链到取代者。**一旦 ADR 被接受，就绝不应重开或修改——只能被取代。**这样我们才有清晰的决策日志，以及每个决策统治了多久。……每条记录一个文件，文件名中带**单调递增**编号。

同时他明确注意**简短的强制性**：「Keep the ADR short and to the point - typically a single page. If there's supporting material, link to it.」（同上）[一手]

### 6. 他自己的网站实践：每篇文章带 "Significant Revisions" 段 [一手，观察所得]

站内长文（如 `consumerDrivenContracts`、`enterpriseREST`、`microservices`）末尾均有 "Significant Revisions" 区块，逐条列出日期＋改了什么（例：`24 October 2013: added section on versioning`）。bliki 条目则用 "Revisions" 段（例：TechnicalDebt 条目注明「I originally published this post on October 1 2003. I gave it a thorough rewrite in April 2019.」）。[一手，本调研直接观察]

另外他在 Refactoring 2nd ed 备忘录中描述了**用 git 管理写作**的实践：把重构序列存成一系列 commit，正文通过 tag 引用 commit ref 与代码片段名；改序时用 cherry-pick（「I do a lot of cherry picking, where I make a change to commit master~7, then cherry pick all the refactoring changes I did since onto the changed commit.」）。见 <https://martinfowler.com/articles/refactoring-2nd-ed.html> [一手]

### 7. ⚠️ 绝对不能误归给他的两篇 [站内·他人]

站内关于「服务版本化」讲得最系统的两篇，**作者不是 Fowler**，但常被当成他的观点：

**Ian Robinson, "Consumer-Driven Contracts: A Service Evolution Pattern"（2006-06-12）**
— <https://martinfowler.com/articles/consumerDrivenContracts.html> [站内·他人]
- 引 W3C TAG 的版本化策略光谱：从过度宽松的 `none`（服务不得区分 schema 版本、必须容忍一切变化）到过度保守的 `big bang`（收到非预期版本就中止）。
- 关键论断言（**Robinson 的**，非 Fowler）：「Contracts enable service independence; paradoxically, they can also couple service providers and consumers in undesirable ways.」
- 提出 provider contract / consumer contract / consumer-driven contract 三类契约的特征表。
- 「a breaking change is still a breaking change」——不宣称该模式能消除破坏性变更。

**Brandon Byars, "Enterprise Integration Using REST"（2013-11-18）**
— <https://martinfowler.com/articles/enterpriseREST.html> [站内·他人]
- 有小节标题直接是 **"Use versioning only as a last resort"**。
- 有对 semver 的正面引用：「Producers can also signal when they need to make a breaking change using **semantic versioning** (semver.org). This is a simple scheme to add well known meanings to the MAJOR.MINOR.PATCH portions of a version, including incrementing the MAJOR version for breaking changes.」以及「according to semantic versioning etiquette, they should have incremented their MAJOR number if it was intentional.」
- 还借用 JWZ 的玩笑改写：「Some people, when confronted with a problem, think 'I know, I'll use versioning.' Now they have 2.1.0 problems.」
- **Byars 是引用 semver 作为工具，不是批评 semver。** 且这不是 Fowler 的话。
- ⚠️ 注意：Microservices 一文（Fowler & Lewis）**链接到**该文 `#versioning` 锚点来支撑「只把版本化当最后手段」的偏好 —— 这是 Fowler 对该观点的**背书**，但正文仍非他所写。[推断：背书成立，署名不成立]

---

## 测试相关主张

### 定义：self-testing code [一手]
> Self-Testing Code is the name I used in *Refactoring* to refer to the practice of writing comprehensive automated tests in conjunction with the functional software. When done well this allows you to invoke a single command that executes the tests - and you are confident that these tests will illuminate any bugs hiding in your code.
> **Our attitude is to assume that any non-trivial code without tests is broken.**
>
> — <https://martinfowler.com/bliki/SelfTestingCode.html>

中译：Self-Testing Code 是我在《重构》一书里用的说法，指与功能代码同时编写全面自动化测试的实践。做得好时，你能用一条命令跑完全部测试，并有信心这些测试会照亮代码里藏着的任何 bug。……我们的态度是：**假定任何没有测试的非平凡代码都是坏的。**

### TDD 与 self-testing code 是**两个概念** [一手]
> These kinds of benefits are often talked about with respect to TestDrivenDevelopment (TDD), but it's useful to separate the concepts of TDD and self-testing code. I think of TDD as a particular practice whose benefits include producing self-testing code. It's a great way to do it, and TDD is a technique I'm a big fan of. But you can also produce self-testing code by writing tests after writing code - although you can't consider your work to be done until you have the tests (and they pass). **The important point of self-testing code is that you have the tests, not how you got to them.**
>
> — 同上

中译：这类好处常被挂在 TDD 名下讲，但把 TDD 和 self-testing code 两个概念分开是有用的。我把 TDD 看作一种具体实践，其收益之一是产出 self-testing code。它是很好的做法，我也是 TDD 的忠实拥护者。但你也可以在写完代码后再写测试来产出自测试代码——只是在没有测试（且通过）之前，你不能认为工作做完了。**self-testing code 的关键在于你**有**测试，而不在于你怎么得到它们。**

### self-testing code 是持续集成/持续交付的**前置条件** [一手]
> Self-testing code is a key part of Continuous Integration, indeed I say that you aren't really doing continuous integration unless you have self-testing code. As a pillar of Continuous Integration, it is also a necessary part of Continuous Delivery.
>
> — 同上

中译：自测试代码是持续集成的关键部分——我甚至说，**除非你有自测试代码，否则你并不真的在做持续集成**。作为持续集成的支柱，它也是持续交付的必要条件。

### 生产 bug 的处理纪律：先写暴露 bug 的测试，再修 [一手]
> The usual reaction of a team using self-testing code is to first write a test that exposes the bug, and only then to try to fix it. … **The attitude should be that any bug isn't just a failure in the code, it's equally a failure in the testing screen.**
>
> — 同上

中译：采用自测试代码的团队，通常反应是先写一个暴露该 bug 的测试，然后才去修它。……**态度应该是：任何 bug 都不只是代码的失败，它同样是测试网（testing screen）的失败。**

### 自测试代码的真正收益是「敢改」[一手]
> But the biggest benefit isn't about merely avoiding production bugs, it's about the confidence that you get to make changes to the system. Old codebases are often terrifying places, where developers fear to change working code. …With that safety net, you can spend time keeping the code in good shape, and end up in a virtuous spiral where you get steadily faster at adding new features.
>
> — 同上

中译：但最大的收益不只是少出生产 bug，而是**你获得了对系统做改动的信心**。老代码库常常是可怕的地方，开发者不敢碰能跑的代码。……有了这张安全网，你能花时间让代码保持良好状态，从而进入一个良性循环：加新功能越来越快。

### 测试与重构的绑定 [一手]
- 「you should only refactor when your tests are green.」（OpportunisticRefactoring）
- 「Refactoring does depend on having a good regression suite…」（同上）
- 「This is another area where tests are essential even in environments that have refactoring tools.」（IsChangingInterfacesRefactoring）
- 一个朴素的自查手法：「I also find that making a deliberate error to see if a test catches it can be a way to get a feel for how good your safety net is.」（OpportunisticRefactoring）[一手]
- 书籍结构：「There are then some introductory chapters that discuss … the 'code smells' that suggest refactoring, **and the role of testing.**」（<https://martinfowler.com/books/refactoring.html>）[一手]
- 2nd ed 备忘录：「an opening example, a chapter of principles, a survey of 'code smells', and an introduction to testing」（<https://martinfowler.com/articles/refactoring-2nd-ed.html>）[一手]

### 语义冲突只能靠自测试代码兜住 [一手]
> The harder problem are Semantic Conflicts. If my colleague changes the name of a function and I call that function in my newly added code, the version-control system can't help us. … **This is why it's so important to have self-testing code.**
>
> — <https://martinfowler.com/articles/continuousIntegration.html>

中译：更难的问题是语义冲突。如果同事改了某个函数的名字，而我在新加的代码里调用了它，版本控制系统帮不上忙。……**这就是为什么拥有自测试代码如此重要。**

### CI 中的量化经验值 [一手]
- 提交构建（commit build）时间以「十分钟准则」（ten minute guideline）为经验尺度。
- 两阶段部署流水线：第一阶段跑用 Test Double 替换慢服务的单元测试；第二阶段跑真实数据库的端到端测试（可能跑几小时）。
- 「If the secondary build detects a bug, that's a sign that the commit build could do with another test.」——后续阶段的失败都应回填为提交阶段的测试。
- 测试环境要尽量克隆生产环境：「Use the same database software, with the same versions, use the same version of the operating system.」（同上）[一手]
- 红绿文化：「green build」「red-bar」，以及红/绿熔岩灯、红绿贴纸日历的团队实践。[一手]

---

## 智识谱系

**核心圈（自述影响最直接）**[一手]
- **Kent Beck** — 最有分量的一位。Fowler 在 C3 项目上与他共事，从那里学到重构与 XP；两人合著 *Planning Extreme Programming* (2000)；*Refactoring* 两版均为 "with Kent Beck"；JUnit 由 Beck 与 Erich Gamma 写成，是自测试代码的支点；two hats 隐喻出自 Beck；microservices 文中引 Beck《Implementation Patterns》的「按变更模式驱动模块化」原则。
  > I was lucky enough to work with Kent Beck on the C3 project that birthed Extreme Programming. There was a great deal I learned (and am still learning) from Kent…
  > — <https://martinfowler.com/articles/refactoring-2nd-ed.html>
- **Ward Cunningham** — 重构词源讨论的受访者之一；Technical Debt 隐喻的创造者（OOPSLA 1992）；Yagni 最早在 Ward's Wiki 上被讨论成形。
- **Fred Brooks** — 概念完整性与《人月神话》，Fowler 自述「a strong influence upon my career」。

**重构的技术源头**[一手，EtymologyOfRefactoring]
- **Bill Opdyke** — 第一篇重构博士论文作者；「Software Re*factory**」命名的对话来源。
- **Ralph Johnson** — 同一次散步对话的另一方；Refactory 咨询公司。
- **John Brant、Don Roberts** — 被他列入「重构这个词从哪来」的访谈对象名单；Don Roberts 亦在 *Refactoring* 2nd ed 的顾问致谢名单中（Smalltalk 自动重构工具研究，**具体研究内容本次未核实**）。
- **Leo Brodie** — 《Thinking Forth》(1984)，目前已知最早印刷使用 "refactoring" 一词；由 Bill Wake 挖出。Forth 与 Smalltalk 两个社区**独立**发展出该词。

**测试与交付**
- **"Beddara" Dave Thomas** — self-testing 思想的直接启发者（「every object should be able to test itself」）。[一手，SelfTestingCode]
- **Erich Gamma** — JUnit（与 Beck）、GoF。
- **Jez Humble & Dave Farley** — *Continuous Delivery*（Fowler 的 Signature Series 之一）。
- **Michael Nygard** — *Release It!*（Circuit Breaker 等）、ADR 一词首创者。
- **Gerard Meszaros** — *xUnit Test Patterns*（Signature Series）。

**架构与领域**
- **Eric Evans** — Domain-Driven Design、bounded context（microservices 与 enterpriseREST 均引）。
- **Sam Newman** — *Building Microservices*（「Our colleague Sam Newman…」）。
- **James Lewis** — microservices 定义文合著者。
- **Pramod J. Sadalage** — *NoSQL Distilled* 合著者、Evolutionary Database Design 合著者。
- **Rebecca Parsons** — *Domain Specific Languages* 合著者。
- **Melvin Conway** — Conway's Law。
- **Jon Postel** — Postel's Law / 鲁棒性原则（Tolerant Reader 的立法依据）。
- **Jeff Dean / Google** — 「design for ~10X growth, but plan to rewrite before ~100X」。

**务实合作者与思想对手**
- **Ron Jeffries** — 「Refactoring — not on the backlog」可视化（Fowler 在 OpportunisticRefactoring 中主动引为支持）。
- **Ian Robinson** — Consumer-Driven Contracts 作者；「Be of the web, not behind the web」被 Fowler & Lewis 引用。
- **Jim Webber** — ESB = "Erroneous Spaghetti Box"（被 Fowler & Lewis 引用）。

**近期（AI 议题）**
- **Simon Willison** — Lethal Trifecta、dual-LLM pattern。
- **Andrej Karpathy** — vibe coding 造词者。
- **Harper Reed** — interrogatory LLM 工作流。

**《Refactoring》2nd ed 的外部顾问团（他列名致谢）**[一手，<https://martinfowler.com/articles/refactoring-2nd-ed.html>]
Arlo Belshee、Avdi Grimm、Beth Anders-Beck、Bill Wake、Brian Guthrie、Brian Marick、Chad Wathington、Dave Farley、David Rice、Don Roberts、Fred George、Giles Alexander、Greg Doench、Hugo Corbucci、Ivan Moore、James Shore、Jay Fields、Jessica Kerr、Joshua Kerievsky、Kevlin Henney、Luciano Ramalho、Marcos Brizeno、Michael Feathers、Patrick Kua、Pete Hodgson、Rebecca Parsons、Trisha Gee。
最终全稿审阅：William Chargin、Michael Hunger、Bob Martin、Scott Davis、Bill Wake。JavaScript 专项：Beth Anders-Beck、James Shore、Pete Hodgson。

**他自己承认的定位**：不是原创者，而是识别者/打包者（Brian Foote 评语「intellectual jackal with good taste in carrion」）。这一点对做「思维 Skill」极关键 —— **不要把他塑造成发明家，他是一个极高质量的整理者、命名者与纪律执行者。**

---

## 矛盾与未核实项

> 以下条目直接记录冲突，不作调和。

### M1. 任务前提与事实冲突：找不到「他对 Semantic Versioning 的批评」
- 站内 934 条内容索引（<https://martinfowler.com/tags/>）中**无** `Semantic Versioning`、**无** `Changelog` 标题。
- 实测 `https://martinfowler.com/bliki/SemanticVersioning.html` → **HTTP 404**（同一批次实测 404 的还有 `/bliki/TwoHats.html`、`/bliki/ContinuousIntegration.html`）。
- semver 在站内的唯一实质引用出现在 **Brandon Byars** 的文章里，且是**正面工具性引用**，不是批评。
- **结论：该前提未获证实。** 本文件按「不得编造」原则不补写、不推测其内容。若把「Fowler 批评语义化版本」写进 Skill，属于无据。

### M2. 「Two Hats」缺少可引的一手正文
- 站内无 `TwoHats` bliki 条目（索引已核实）。
- 该隐喻他明确归给 Kent Beck（「Kent Beck came up with a metaphor of the two hats」），出自《Refactoring》2nd ed 第 2 章 [一手·书]。
- 站内讲授位置是 infodeck "Workflows of Refactoring" 的 `#2hats` / `#tdd-hats` 两节，但该页正文为 JS 渲染，`web_fetch` 只取到导览与目录，**未能取得正文**。
- **原文精确措辞与官方页码：未核实。** 本次引用的书内措辞来自网络流传的 2nd ed 电子版片段（非官方来源），仅用于核对关键词，**不作为正式引文出处**。

### M3. 重构条目数量三个数字互相打架（同一批 2018 材料）[一手，内部矛盾]
- <https://martinfowler.com/articles/refactoring-2nd-ed.html>：「of those **68** refactorings, all but 10 are still present, and I've added 17 new ones」
- 同文另一处：「I have **63** refactorings in the new book」
- <https://martinfowler.com/books/refactoring.html>：「The bulk of the book is **around seventy** refactorings」
→ 68 / 63 / 约 70，口径不一致。**直接记录，不调和。**

### M4. 页数数字在不同备忘录间不一致 [一手]
- 「The first edition clocks in at **412** pages (not including the references and index), so I set that as my target. We did an initial page proof and the new book had **440** pages, so I needed to cut at least 28 pages… it came out to **410** pages.」（refactoring-2nd-ed）
- 「the new one is **416** compared to **430** pages」（同文，12 月备忘录）
→ 412/440/410 与 430/416 是两套口径（是否含参考与索引、是否含封面等），但表面数字冲突，**记录不调和**。
另注：同文称「the paper book is a selection of material from the web site」，并删掉 5 个重构手法（19 页）与一个 Split Phase 的第二个例子（10 页）才塞进印刷版。

### M5. `Refactoring Workbook` **不是** Fowler 的书（任务清单中的错误）
- 实为 **William C. Wake** 著，2003 年 8 月，Addison-Wesley Object Technology Series，ISBN 0321109295，224 页。
- 来源：[二手] ACM Digital Library <https://dl.acm.org/doi/10.5555/945758>；[二手] O'Reilly <https://www.oreilly.com/library/view/refactoring-workbook/0321109295/>；[二手] Bill Wake 本人书评 <https://xp123.com/review-refactoring-workbook/>
- 该书**未**出现在 Fowler 的 Signature Series 书单（<https://martinfowler.com/books/>）里；它属于更早的 Addison-Wesley Object Technology Series。是否曾被 Fowler 的系列收录：[推断] 否，但**未核实**。

### M6. 书籍年份的口径差异
- *UML Distilled* 书目页只标 **2003** —— 那是第三版年份；**首版 (1997) 年份本次未核实**。
- *Refactoring* 1st ed **1999** 由书目页与 2nd ed 备忘录两处确认（「It was published just before the 20th Century ended.」/「The first edition came out in 1999.」）[一手]。
- 其余年份均取自 <https://martinfowler.com/books/> 单一来源，未做交叉核实。

### M7. 「Thoughtworks 首席科学家」的准确性与入职时间口径
- 头衔准确，且是**他自嘲式地持有**：「the exceedingly inappropriate title of 'Chief Scientist'」、「I'm not chief of anybody and don't do any science」。（<https://martinfowler.com/aboutMe.html>）[一手]
- 入职时间同页存在两种表述：「I started working with Thoughtworks in the spring of **1999**」vs「I joined Thoughtworks in **2000**」。→ 是「开始合作」与「正式加入」的区别，**非硬矛盾但需注明**。
- 另：他于 1991 年成为独立顾问，1994 年移居马萨诸塞州，2005 年入美国籍（保留英国籍）。

### M8. 站内两篇最详尽的「版本化」长文作者不是他 —— 最高的误归风险
- 见「版本号与变更日志主张」第 7 条。任何把 "Use versioning only as a last resort" 当作 Fowler 语录的做法都是**误归**（该标题出自 Byars，2013）。
- Fowler 的对等表达是 Microservices 一文那句「the preference in the microservice world is to only use versioning as a last resort」——注意它是**描述微服务社群的偏好**，不是他个人的第一人称主张。[推断：二者语气强度不同，不宜互换]

### M9. `PervasiveVersioning` 的命名极易误读 [一手]
- 该条目标题看起来像「无处不在的版本号」，实际讲的是**版本控制（VCS）**：把整个工作目录纳入版本管理、Time Machine 类备份的对比、以及「not enough applications know how to diff and merge」。
- 与 semver / 发布版本号**无关**。引用时必须说明。
- 该条目还引用了 `MultipleDesktops`、`MoreVersionControl` 两个 bliki —— 二者**未出现在**全站内容索引中，**未核实**其是否存在（索引抓取时未见）。

### M10. `InternalReprogramming` 这个词不存在
- 正确条目名是 **`InternalReprogrammability`**（<https://martinfowler.com/bliki/InternalReprogrammability.html>）。
- 且其主题是**工具/语言的内部可重编程性**（Emacs、Smalltalk、Lisp、Unix shell），与「重构」无关，与「重新编程人脑」更无关。若作为术语收进 Skill，需附此澄清。

### M11. 站内自有术语的 URL 形态陷阱（供后续调研避坑）
- Continuous Integration 的**正确路径是 `/articles/continuousIntegration.html`**；`/bliki/ContinuousIntegration.html` 实测 404。
- Strangler Fig 的**标题已改**：原 "Strangler Application" → 现 "Strangler Fig Application"，但 **URL 仍是 `StranglerFigApplication.html`**，原帖另存于 `OriginalStranglerFigApplication.html`。
- 他明确说了为什么改名：担心「strangler」的暴力联想。原话：「As the term gained popularity I became concerned about this due to its connotations of violence. … I decided to try a subtle change, replacing the title with 'Strangler Fig Application' to emphasize its metaphorical routes. Fortunately the new title strangled the old one.」[一手]

### M12. 本站持续更新，最新条目晚于常见认知锚点
- 抓取时该站自述含 **934 条内容**。
- 最新 bliki：`ParacelsusMaxim`（2026-09-02）；另有 `VibeCoding`（2026-05-21）、`InterrogatoryLLM`（2026-05-14）、`MythicalManMonth`（2026-05-05）、`ArchitectureDecisionRecord`（2026-03-24）、`AgenticEmail`（2026-02-17）、`HostLeadership`（2026-02-19）。
- 若 Skill 的知识截止日早于这些日期，需注意：**他的观点仍在生长**（尤其 AI 议题），不要把他冻结在 2018 年的《重构》2nd ed。

### M13. 本次未能完成的核实
- **Wikipedia 检索失败**（`platform_search` 返回 `fetch failed`），因此 Fowler 生平的外部二手交叉核实**未完成**。
- **Reddit 检索失败**（同上）。
- **Bing 引擎对本主题严重失效** —— 多组含 "Martin Fowler" 的查询返回的是马丁吉他、百度百科、词典页面；`ddg`/`searxng` 超时；最终可用的是 `anysearch`（回落至 `keenable`）。
- **未逐字抓取**的一手条目（存在性已由全站索引确认，正文未读）：`CodeSmell`、`TwoHardThings`、`TestDrivenDevelopment`、`UnitTest`、`TechnicalDebtQuadrant`、`DesignStaminaHypothesis`、`ContinuousDelivery`、`SemanticConflict`、`SemanticDiffusion`、`PublishInterface`、`DiffDebugging`、`ParallelChange`、`KeystoneInterface`、`BranchByAbstraction`、`FeatureFlag`、`TestDouble`、`ContractTest`、`DeploymentPipeline`、`OriginalStranglerFigApplication`、`articles/designDead.html`、`articles/refactoring-2nd-changes.html`、`articles/microservice-trade-offs.html`、`articles/branching-patterns.html`、`articles/preparatory-refactoring-example.html`、`articles/is-quality-worth-cost.html`。

---

## 调研方法与工具限制（备查）

- 主要方法：直接抓取 martinfowler.com 页面原文，并以 <https://martinfowler.com/tags/>（全站内容索引，按标题字母序）作为**URL 真伪的裁决依据** —— 本文件所有 bliki 标题均在该索引中出现，未凭记忆虚构。
- 一手/他人署名判定方法：逐页检查正文署名区（作者名 + 简介）。此方法识别出两篇被广泛误归给 Fowler 的文章（Robinson、Byars）。
- 搜索引擎状况：`bing`（会话默认）对本主题返回无关结果；`ddg`、`searxng` 超时；`anysearch` 可用（有回落至 `keenable` 的情况）。`platform_search` 的 `hn` 可用，`wikipedia` 与 `reddit` 本次失败。
- 未使用任何黑名单来源（知乎 / 微信公众号 / 百度百科 / 百度知道）。Bing 返回的百度百科结果已忽略，未采信。
