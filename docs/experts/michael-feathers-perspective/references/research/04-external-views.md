# 04 他者视角与批评：Michael Feathers

> 调研 Agent 4 产出｜维度：他者视角（别人如何看他、如何批评他）
> 撰写日期：本文件生成于本次调研会话
> 信源分级：**[一手]** = Feathers 本人原话 / 当事人现场记录；**[二手]** = 第三方评论、书评、聚合数据；**[推断]** = 萧潇基于前两者的推理，非原文
> 黑名单遵守：未使用知乎、微信公众号、百度百科

---

## 〇、本文件的一句话结论

**Michael Feathers 在社区里的地位是「被广泛引用、极少被正面攻击」的那种作者。**
对他 2004 年那本书的攻击几乎都不是针对他的判断，而是针对三件事：**时效性**（Java/C++ 例子、Mock 工具、"数据库是外部单例"的假设）、**篇幅**（400+ 页、重复、后半本像菜谱）、**以及他被别人误读出来的教条化版本**。
最有价值的发现是：**对他最严厉的批评者之一，是他自己**（见第三节 3.1、3.2、3.3）。

---

## 一、社区定位与称号

### 1.1 实际流通的称号

| 称号 | 流通度 | 具体说法与出处 |
|---|---|---|
| "legacy code 之父" / 该领域权威 | 高 | 各种播客介绍语："renowned software expert and author of the classic *Working Effectively with Legacy Code*"（[Tech Lead Journal #195](https://techleadjournal.dev/episodes/195/)）**[二手]** |
| "定义 legacy code 的人" | 极高 | 定义被反复当作既成事实引用："Michael Feathers coined the now-industry-standard definition of 'legacy code' as code without tests"（[Forage](https://forage.com/book/605495)）**[二手，且为 AI 聚合页面，慎用]** |
| "SOLID 的命名者" | 高但常被模糊化 | 见第四节 |
| "测试界的某派" | 中 | 常被归入 TDD / 单元测试原教旨阵营，但**他本人多次否认这个归类**（见第三节 3.3）**[一手]** |

### 1.2 他在书籍谱系中的坐标

多个来源把他放进同一张"必读书单"，且常与 Fowler / Martin / Beck 并列但**位置不同**：

- Nicolas Carlo（understandlegacycode.com）："You might have read (or listed) other books such as Clean Code and Refactoring. These are must-reads too. But I'd recommend **starting with** Working Effectively with Legacy Code."（[来源](https://understandlegacycode.com/blog/key-points-of-working-effectively-with-legacy-code/)）**[二手]**
- r/programming 的历史投票帖把他排在 Fowler《Refactoring》附近，但**低于** Pragmatic Programmer 与 Clean Code（[BooksReddit 聚合](https://booksreddit.com/book/working-effectively-with-legacy-code/)）**[二手/推断：聚合页自称基于 Reddit 语料，方法不可完全复核]**
- BooksReddit 的措辞值得注意："**nobody argues the book is wrong, they argue about sequencing**"——争论的是阅读顺序，不是内容对错。**[二手/推断]**

### 1.3 "老派"标签

- 他被视为**2000 年代敏捷/XP 黄金一代的成员**，其书"clearly from the early, excited days of agile and extreme programming"（Russ Allbery，[eyrie.org](https://www.eyrie.org/~eagle/reviews/books/0-13-117705-2.html)）**[二手]**
- 但**"老派"很少被用作贬义针对他个人**；批评集中在其书的技术时效与例证语言，而非其方法论立场。
- 反面证据（他在主动更新自己）：2024 年仍在谈 AI coding assistant 与 legacy code（[Tech Lead Journal #195](https://techleadjournal.dev/episodes/195/)）；2025 年仍在 YOW! 演讲（[YOW! Brisbane 2025](https://yowcon.com/brisbane-2025/speakers/3864/michael-feathers)）。**[二手]**

---

## 二、正面评价（附来源）

### 2.1 "救命的实用手册"

- **Oren Eini (Ayende Rahien)**，RavenDB CEO："I read Working Effectively with Legacy Code for the first time in 2005 or thereabout. It left a **massive** impression on me and on the industry at large. The book is one of the reasons I started rigorously writing tests for my code, it got me interested in mocking and eventually led me to **writing Rhino Mocks**."（[来源](https://www.ayende.net/Blog/201537-a/legacy-code-with-really-good-tests-is-still-legacy-code)）**[一手——当事人自述其技术路线受影响]**
- 同一作者在同文中仍推荐："If you are in that situation, **go read Working Effectively with Legacy Code, it will be a lifesaver**." **[一手]**

### 2.2 "无可替代的参照物"

- Nicolas Carlo："This book is a reference. **Probably THE reference.** When there's a thread about Legacy Code, it doesn't take long for someone to drop a comment suggesting you read it."（[来源](https://understandlegacycode.com/blog/key-points-of-working-effectively-with-legacy-code/)）**[二手]**
- 同文用一个 CommitStrip 梗总结其生命力："Working Effectively with Legacy Code is like a good wine: it gets better with age." **[二手]**

### 2.3 概念命名的持久力（正面但带批评前提）

- **Dan North**（BDD 提出者，SOLID 的公开批评者）在把 SOLID 逐条拆解后，仍然写："…along with building a suite of **characterization tests** and all of the other advice in Mike Feathers' **brilliant** Working Effectively With Legacy Code."（[来源](https://dannorth.net/blog/cupid-the-back-story/)）**[一手——当事人语，且此人是 SOLID 批评者]**
  → 注意这个组合：**同一个人可以既否定 SOLID 原理，又推荐 Feathers 的书**。这说明 Feathers 的口碑并未随 SOLID 的争议受损。

### 2.4 "不可替代性"式评价

- Eli Bendersky（Google 工程师，知名博客作者）："get this book if you have to work with old balls of mud; it will be **effort well spent**."（[来源](https://eli.thegreenplace.net/2017/book-review-working-effectively-with-legacy-code-by-michael-c-feathers)）**[二手]**——但同一句里带强条件，见第三节。

### 2.5 读者评分（作为背景，不作为论证）

据 [Forage 聚合页](https://forage.com/book/605495)（**AI 生成的聚合内容，仅作量级参考，不可作为独立证据**）**[二手，可信度低]**：
- Goodreads ≈ 4.2/5（5,800+ 评分）
- Amazon ≈ 4.5/5（460+ 评价）

[Forage 的 Brutal Refactoring 页](https://forage.com/book/1382395) 给出的另一组数字与之不一致（Goodreads 4.16/5，3,800+ 评分；Amazon 4.5/5，500+ 评价）。**两组数字互相矛盾，均不可采信为精确值**（见第九节）。

---

## 三、批评与争议（逐条，附说话人与上下文）

> 排序：由"最具实质技术含量"到"最泛泛"。

### 3.1 【最重】Russ Allbery：全书隐藏核心是"单元测试"，而这个是可质疑的

**说话人身份**：Russ Allbery，Debian 开发者、长期技术书评人（eyrie.org 书评库）
**上下文**：2019-04-06 发布的书评，打 7/10，被 Lobsters 收录并引发讨论
**来源**：[eyrie.org 全文](https://www.eyrie.org/~eagle/reviews/books/0-13-117705-2.html)｜[Lobsters 讨论串](https://lobste.rs/s/laqm8q) **[二手]**

其批评的完整逻辑链（值得完整引用）：

> "There are two, closely-related problems with this pure unit-testing approach: one starts testing the behavior of classes in isolation instead of the user-visible behavior of the application (which is what actually matters), and one starts encoding the internal structure of those classes in the test suite."

> "**…if every jot and tittle of the internal code structure is encoded in the test suite via all the mocks and fakes, a simple half hour of work refactoring the code as part of adding new functionality turns into hours of tedious work restructuring the tests to match. The result is to paradoxically discourage refactoring because of the painful changes then required to the tests, defeating one of the purposes of having tests.**"

> "Feathers, as is typical of books from the early days of agile, **doesn't even mention this problem**, and takes it as nearly a tautology that unit testing and mocking out of dependencies is desirable."

他还点出了本书的**书名过度承诺**与**主题窄化**：

> "The title arguably overpromises, since there are many aspects of working with legacy code that are not covered in this book." … "a rather **idiosyncratic** definition of legacy: code without unit tests."

以及**数据库部分最显老**：

> "One of his repeated themes is finding a way to mock out database layers. I think this is the place where this book shows its age the most… **This already wasn't the case in 2004 when one could spin up a local instance of MySQL**; now, with SQLite readily available for fast, temporary databases, it's trivial to write tests without mocking the storage layer."

### 3.2 【关键】Feathers 本人对上面那条批评的回应

**这是本次调研最重要的单条材料。**
**来源**：[Lobsters 讨论串，用户 `mfeathers` 的评论](https://lobste.rs/s/laqm8q)（2019-04-08） **[一手——他本人账号，公开讨论区]**

他的原话：

> "Very thoughtful review. **The book is 15 years old now and it does show its age a bit, but I am proud of it.**"

> "I don't know whether responding to the author here works, but the two big issues he mentions: (unit testing > integration testing) and database isolation **are two things I still emphasize**."

他对单元测试优先的辩护（含一个生动的比喻）：

> "The thing about integration testing is that you lucky if you have seams that allow it… **writing tests at a high level to get coverage at a low level is like dropping a pebble down a hole in the earth and trying to get it to land on a particular ledge.**"

数据库一节他也认账但坚持立场：

> "Re databases, it's the slow down and the distance of used values from expected values that bothers me… I once worked with a team that had tests that took **three hours** to run on 24 cores because of ActiveRecord."

**同时**，同一串里另一位评论者（`briankung`）把 3.1 的"测试反而阻碍重构"问题直接抛给他本人，并在 [joshka 的回复](https://lobste.rs/s/laqm8q) 中被引向 Mark Seemann 的"Mocks for commands, stubs for queries"作为解法。**[二手]**

### 3.3 【关键】Feathers 本人：书的立场是"时代产物 + 咨询顾问的恐惧"

**来源**：Feathers 2011 年博客《Brutal Refactoring》，经 Jeremiah Flaga 引用并做标题式质问
- 原文（typepad，现已失效）：`michaelfeathers.typepad.com/michael_feathers_blog/2011/03/brutal-refactoring.html` **[一手，但需经转载验证]**
- 二手引述与解读：[Jeremiah M. Flaga, "Is Michael Feathers backing out from his 'Code without tests is bad code' statement?"（2019-08-06）](https://jeremiahflaga.github.io/2019/08/06/what-michael-feathers-said-about-welc-7-years-later) **[二手（引一手原话）]**

Feathers 原话（Flaga 引）：

> "These days, I'm much more aggressive in my approach to old code. WELC was fully ingrained in that 'if we don't have tests, we can't do much' attitude. **I think that part of that was a sign of the times, and part of it was a reflection of my natural fear as a consultant.** You walk in and you don't know anything about the code base so you can't even come close to accurately assessing risk. Nicely, though, people who are embedded in teams often can, and I've learned a lot from people who've tried things out long term in their code and have lived to tell the tale."

**Flaga 的追问（保留其语气）**：

> "It seems to me like Michael Feathers is **backing out** from the 'Code without tests is bad code' statement from his book… since 2011! *Is he?*"

Flaga 自己随后给了一个更温和的解读（这本身也是一条值得保留的"另一种读法"）：

> "(To me, after reading the book, that statement meant 'you should not do much refactoring if you do not have tests in place to show that your refactorings did not break anything')"

**另有一位实践者的公开反对**：Matthias Noback 的演讲标题即为 《Brutal refactoring, lying code, the Churn, and other emotional stories from Legacy Land》，其摘要是：

> "Working effectively with legacy code isn't all about creating test harnesses before refactoring algorithms. **The 'safety first' strategy doesn't always apply. Not if the code you're looking at is LYING IN YOUR FACE anyway.**"

（经 Flaga 引述，[来源](https://jeremiahflaga.github.io/2019/08/06/what-michael-feathers-said-about-welc-7-years-later)）**[二手]**

### 3.4 【技术细节】Sven Woltmann：逐页指出"照做会写出更差的代码"

**说话人身份**：Sven Woltmann，HappyCoders.eu 创办人，Java 培训师
**来源**：[happycoders.eu 书评](https://www.happycoders.eu/books/working-effectively-with-legacy-code/) **[二手，但给出了页码级证据]**

- 总体定性："Unfortunately, the book has not been updated in 15 years. In particular, **inexperienced programmers should take care not to implement every strategy dogmatically. For some mechanisms, there are better alternatives nowadays; some practices lead to worse, instead of better code**; and the issue of **thread safety** — a core issue in most enterprise applications today — is **entirely left out**."
- 具体反例一（工具过时）："these days, you don't need an interface for every class you want to mock. **Mockito can easily mock classes**."
- 具体反例二（自相矛盾）："The author's statement, '**it's nice to have an interface that covers all of the public methods of a class**' (p. 366), is unfortunately **in stark contradiction** to [the Interface Segregation Principle]."
- 具体反例三（有风险的技法）："Invoking abstract methods from a constructor ('Extract and override factory method') is better avoided if you don't want to suddenly be faced with an object that is only partially initialized. It is for good reason that **C++ forbids this practice. Fifty-five pages after the introduction of this strategy, the author finally advises against its use in Java.**"

### 3.5 【可读性】Eli Bendersky：技法与敌人一样丑陋，且书里有大量重复

**说话人身份**：Eli Bendersky，Google 工程师，知名技术博客作者
**来源**：[eli.thegreenplace.net 书评（2017-07-20）](https://eli.thegreenplace.net/2017/book-review-working-effectively-with-legacy-code-by-michael-c-feathers) **[二手]**

> "**If the above strikes no chord for you - I suggest to skip it.** The book will just seem horrible to you - proposing all kinds of **ungodly hacks** to break up dependencies… The hacks are a good match to the foe - they're about as awful as the code itself, so **young and innocent developers may find themselves (rightfully) horrified**. It's only the unhealed scars of old battles that will make this book palatable."

> "**There's quite a bit of repetition in the book, which makes it even more tedious to read.**"

> "The techniques described by the author are **as terrible as the code they're up against.** Horrible abuses of the preprocessor in C/C++, abuses of inheritance in C++ and Java, and so on. Particularly the latter is quite sobering. **If you love OOP beware - this book may leave you disenchanted, if not full of hate.**"

⚠️ 注意：这段话表面是批评，实际是**"针对性辩护式的认可"**——他认为丑陋是问题的性质决定的。**这条应同时计入"批评"与"理解性正评"。**

### 3.6 【篇幅】Ugur/okigiveup.net：500 页里有大量可删内容

**来源**：[okigiveup.net 书评](https://okigiveup.net/book-reviews/working-effectively-with-legacy-code) **[二手]**

> "At 500 pages, it doesn't count as a lightweight, and to be perfectly honest, **there are many pages that could have been left out, or banished to the appendix because they concern details of how C++ compilers work.**"

> 作为 Python 开发者，其阅读体验："I felt myself **a bit lost at times as a Python developer, and skipped pages**."

### 3.7 【语言/生态偏置】多位读者一致：Java + C++ 例子，动态语言读者自行翻译

- okigiveup.net："The book is directed mainly at **Java and C++ programmers**… the case studies are tailored to the difficulties faced by developers working in large projects with these languages." **[二手]**
- Russ Allbery："Code examples are in Java, C++, and C… **his analysis of pluses and drawbacks seemed largely accurate in each case, although he's far too willing to just throw a C++ compiler willy-nilly at a large C code base**." **[二手]**
- Koterpillar（俄/英/中三语书评）："大约百分之70是具体的方法，带 Java 的例子。所以必须知道 Java，或至少面向对象设计，最好还有 C 和 C++… **C++ 的例子我直接跳过，因为它们都是偏编译器和连接器。**"（[来源](https://koterpillar.com/2016-12-08/working-effectively-with-legacy-code)）**[二手]**
- Nicolas Carlo 对此批评的公开反驳（保留对立方）："But the code examples are in Java and C++ and I do python/JavaScript/ruby… **Legacy Code is not always easy to read, so that's actually relevant. It's a skill you need to practice.**"（[来源](https://understandlegacycode.com/blog/key-points-of-working-effectively-with-legacy-code/)）**[二手]**
- ⚠️ **重要存疑**：本次调研**未找到 C# 版**的任何证据。任务书中的假设"C# 版才有"**未获证实**，标记为[存疑]（见第九节）。

### 3.8 【工具时效】Koterpillar：强类型/宏/`null` 的依赖是时代的

> "一方面，用静态类型、比较严格的 Java 在复杂的情况让人创造很多接口、重定义方法和包装类。据我所知，现在有让测试情况下躲避继承、访问权限的工具，可是结果不一定值得这种方式。"
> "反过来说，作者使用 `null`，不能创造需要的对象时推荐代替它，**靠运气**。"
> "书里没有讲高阶函数——也许那时 Java 还没有委托。"
> （[来源](https://koterpillar.com/2016-12-08/working-effectively-with-legacy-code)）**[二手]**

### 3.9 【风格】"干货但接近常识"

- Frederik Banke（写了 24 分钟逐章精读）："But all in all the book contains good pointers on how to approach legacy code. **Much of the advice borders to common sense**, but I still think it is a good idea to have the concepts in mind because it is easy to forget and just edit and pray."（[来源](https://frederikbanke.com/book-review-working-effectively-with-legacy-code/)）**[二手]**
- Forage 聚合归纳的"常见批评"含："Writing style can be dry and academic"、"First few chapters cover similar ground repeatedly"、"Some techniques described as **overly complex for simple problems**"（[来源](https://forage.com/book/605495)）**[二手，AI 聚合，可信度低，仅记录为存在这类说法]**

### 3.10 【社区实用主义的两条"负评"】

来自 [BooksReddit 对 119 条 Reddit 提及的结构化分析](https://booksreddit.com/book/working-effectively-with-legacy-code/) **[二手/推断]**：

- **"Nobody in the displayed excerpts describes actually applying a technique from it, only recommending the book itself."** —— 这是一条**关于该社区而非关于书**的批评，但很有信息量：它的地位是"推荐货币"。
- r/learnprogramming 的高票回答（↑197）在"如何接手一个烂摊子"问题下的**首要建议不是读书，而是"find a new job"**，书是退而求其次的备选。
- 另一条不含理由的排序批评：某书单把它排在 Pragmatic Programmer 与 Clean Code **之后**，且未说明理由（↑655）。

### 3.11 【方法论争论】"prohibitive code" vs Feathers 定义

**说话人身份**：J.B. Rainsberger（《JUnit Recipes》作者，Surviving Legacy Code 培训作者）
**来源**：经 Jo Van Eyck 转述并对比 Feathers 定义（[jvaneyck, 2015-07-27](https://jvaneyck.wordpress.com/2015/07/27/legacy-code-retreat/)）**[二手]**

> "Other people have a more relaxed definition of the term, namely **'profitable code that we're afraid to change'**."

这条与 Feathers 的"code without tests"定义**直接构成竞品定义**——不是攻击，但是**替代方案**，说明其定义从未成为唯一标准。

---

## 四、SOLID 命名者这件事的来龙去脉

### 4.1 事实层

- 原理**不是**他提出的：SRP/OCP/DIP 出自 Robert C. Martin，LSP 出自 Barbara Liskov，ISP 出自 Martin 在 Xerox 处理 God class 的经验（Dan North 详述了这段来历：[来源](https://dannorth.net/blog/cupid-the-back-story/)）。**[一手——North 称其为此专门做过考证]**
- **首字母缩略词是 Feathers 凑的**：多来源一致指向"around 2004"。
  - [HandWiki 镜像的 Wikipedia 条目](https://handwiki.org/wiki/SOLID)："The SOLID acronym was coined around 2004 by **Michael Feathers**." **[二手]**
  - [lawsofsoftwareengineering.com](https://lawsofsoftwareengineering.com/laws/solid-principles/)："The acronym SOLID was coined around 2004 by **Michael Feathers**, who noticed the initial letters spelled…" **[二手]**
  - [Wikiwand](https://wikiwand.com/en/SOLID)、[ipfs 维基镜像](https://ipfs.io/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/wiki/SOLID_(object-oriented_design).html) 同表述 **[二手]**
- 机制上，这个命名最早随 Martin 2000 年论文《Design Principles and Design Patterns》所集结的五条原理传播（[Baeldung 述其源流](https://www.baeldung.com/solid-principles)）**[二手]**

### 4.2 争议层：命名者 ≠ 认同者，也不该被追责

- Dan North 的整篇 [CUPID: the back story](https://dannorth.net/blog/cupid-the-back-story/) 就是对 SOLID 的**逐条拆解**：
  - SRP → "the **Pointlessly Vague Principle**"（"What is one thing anyway? Is ETL one thing or three things?"）
  - OCP → 只在"代码昂贵、危险、且主要靠追加"的 1990 年代成立；"Nowadays, the equivalent advice… is: **Change the code to make it do something else!**"；"**All code is cost.**"
  - LSP → "just the Principle of Least Surprise applied to code substitution"（唯一一条他认可"pretty sensible"的）
  - ISP → "**it isn't a principle, it is a pattern**"；"if this were a principle at all, it was the '**Stable Door Principle**'"
  - DIP → "our obsession with dependency inversion has **single-handedly caused billions of dollars in irretrievable sunk cost and waste** over the last couple of decades… In the wild, there are entire **shadow codebases where each class is backed by exactly one interface**, which only exists to satisfy a wiring framework or to inject a mock or stub for **automated testing theatre**."
- ⚠️ **关键张力**：North 拆的是**原理本身**，不是**命名者**。他从未把 SOLID 的问题归给 Feathers，反而在同文中称 Feathers 的书 "brilliant"。
- **未见任何来源批评 Feathers "给 SOLID 起了这个名字"**。**[推断]**：这在本调研覆盖的语料中不构成争议点。

### 4.3 反例：中文与部分英文科普把命名者张冠李戴

- [IONOS 数字指南](https://www.ionos.com/digitalguide/websites/web-development/solid-principles/)："The SOLID principles were **coined by Robert C. Martin**, Bertrand Meyer and Barbara Liskov. The catchy acronym was popularized…" **[二手]**
  → 这是**混淆"提出原理"与"命名缩写"**的典型写法。可作为"命名者身份在实际传播中被稀释"的证据。
- 另有若干科普页把 SOLID 直接归给 Martin 一人（如 [thepower.education](https://thepower.education/en/blog/what-are-the-solid-principles)、[thinkinsights.net](https://thinkinsights.net/consulting/solid-design-principles)）。**[二手]**

### 4.4 存疑

- **本次调研未能取得 Feathers 本人关于"我是怎么想出来的 / 我有没有告诉 Bob"的第一手叙述**。他的博客、播客访谈（GOTO 2023 转录）在这些段落里**完全没提 SOLID**。**[一手证据缺失]**
- 因此本文件不采信任何"Feathers 本人说……"的 SOLID 相关转述，只记录**第三方归属**。

---

## 五、与同行的对比（Fowler / Beck / Martin）

### 5.1 已有的硬事实（职业关系）

- Feathers 曾在 **Object Mentor International** 做顾问——该公司由 **Robert C. Martin** 创办，Martin Fowler 亦与之关联。**[一手（当事人履历）]**，出处：Developer on Fire #102 节目介绍（[dev.to 转载](https://dev.to/developeronfire/episode-102--michael-feathers--providing-options)）
- 此后任 **Obtiva** 首席科学家（Chief Scientist），再创办 **R7K Research & Conveyance**（Founder & Director），业务为"software and organization design"。**[一手（履历页）]**，出处：[R7K 官网 bio](https://www.r7krecon.com/michael-feathers-bio)（注意：本次抓取时该域名 DNS 失败，内容经 [GOTO Chicago 2024 讲者页](https://gotochgo.com/2024/speakers/3528/michael-feathers)、[Engineers.SG 讲者页](https://engineers.sg/s/mfeathers) 等多处转载确认一致）**[一手，但为转载副本]**
- 2023 年起任 **Globant 首席架构师（Chief Architect）**——他在 GOTO Book Club 对谈中亲口说的："I'm a chief architect of Globant, but I also do training and consulting independently as well."（[一手，GOTO 2023 完整转录](https://castro.fm/episode/XRtpuA)）
- 他的书属 **Robert C. Martin Series**（Prentice Hall）。**[一手（书籍版权页信息）]**，出处：[WorldCat 书目](https://search.worldcat.org/isbn/9780131177055)、[Dokumen.pub 翻印版](https://dokumen.pub/working-effectively-with-legacy-code-14th-printingnbsped-0131177052-0076092025986-9780131177055.html)
  → **这是理解"他为什么被归入那一派"的结构性原因：他的书就长在 Martin 的书系里。**

### 5.2 分工差异（社区共识，含推断）

| 人 | 被赋予的领地 | 与其关系 |
|---|---|---|
| **Martin Fowler** | 重构的**目录化与命名**（《Refactoring》）、模式语言 | Feathers 反复引 Fowler；GOTO 对谈中 Feathers 提到"The tests are over here, but they cover a larger space"时主动说"**I think Martin Fowler talked about this years ago**"（[一手](https://castro.fm/episode/XRtpuA)） |
| **Kent Beck** | TDD、极限编程、设计四规则 | Feathers 自认处在 Beck 传统内（他的 6 步 TDD 清单、对 Kent Beck 的推荐书单）；同时指出"the way that TDD kind of spread across the industry"产生了**错误的类-测试一对一映射**（[一手](https://castro.fm/episode/XRtpuA)） |
| **Robert C. Martin** | Clean Code、SOLID 原理、书系主编 | Feathers 是**书系作者 + 命名者但非原理提出者**；North 把两人明确分开评价 |
| **Michael Feathers** | **"存量代码/无测试代码"这块专属地形** | 他的差异化不在"新代码应该怎么写"，而在"**你手上这坨已经写坏的怎么办**" |

### 5.3 一条高价值的边界勾勒

okigiveup.net 的观察把四人放进同一传统里再区分：

> "The books on object-oriented programming written or edited by **one of the signatories of the Agile manifesto** (Robert Martin, Martin Fowler or Kent Beck, to name a few) tend to have some common characteristics. They use Smalltalk or Java as the language for the code samples, pack a lot of wisdom and interesting examples, and unfortunately tend to be **long**. This book, **from the Robert C. Martin series**…"（[来源](https://okigiveup.net/book-reviews/working-effectively-with-legacy-code)）**[二手]**

**萧潇的归纳 [推断]**：Feathers 不属于敏捷宣言签署人（该站把他描述为"系列作者"而非"签署人"），他的坐标是**"Martin 书系里专治存量代码的那位"**——这既解释了他的口碑来源，也解释了他为什么常被与"老派敏捷"一起打包批评。

### 5.4 一个未被证实的说法

任务书提到"他和 Fowler 的关系（他曾在 Object Mentor、后来 Fowler 引他）"。本调研**只证实了 Object Mentor 履历**；**未找到 Fowler 公开"引荐"或"背书"他的直接文本**。标记[存疑]。

---

## 六、影响链（谁引用他、谁受他启发）

### 6.1 直接承认受其影响的人（一手自述）

| 人物 | 身份 | 原话/事实 | 来源 |
|---|---|---|---|
| **Oren Eini (Ayende)** | RavenDB 创始人/CEO | 因为他而"开始严格写测试"，并最终写出 **Rhino Mocks** | [ayende.net](https://www.ayende.net/Blog/201537-a/legacy-code-with-really-good-tests-is-still-legacy-code) **[一手]** |
| **Dan North** | BDD 提出者 | 把 characterization tests 列为拆解 God class 的正规武器之一，并称其书 "brilliant" | [dannorth.net](https://dannorth.net/blog/cupid-the-back-story/) **[一手]** |
| **Erik Talboom** | Legacy Code Retreat 主要传播者 | 主持 Legacy Code Retreat（使用 J.B. Rainsberger 的 trivia 代码库） | [jvaneyck](https://jvaneyck.wordpress.com/2015/07/27/legacy-code-retreat/) **[二手]** |
| **Nicolas Carlo** | understandlegacycode.com 作者、Software Crafters Montreal 创办人 | 整个站点建立在其概念之上；"Probably THE reference" | [understandlegacycode.com](https://understandlegacycode.com/blog/key-points-of-working-effectively-with-legacy-code/) **[一手（本人站点的立场表达）]** |
| **Adam Tornhill** | CodeScene 创始人，《Your Code as a Crime Scene》作者 | Feathers 现身推荐其书；**Feathers 本人是 CodeScene 顾问委员会成员** | [一手，Feathers 在 GOTO 对谈中自述](https://castro.fm/episode/XRtpuA) |
| **Chris Wanstrath 等** | — | 本次未取得可核证据 | — |

### 6.2 概念层的影响（持久度比书本身更高）

- **"seam"（接缝）** 已被当作通用词汇使用，出现在非 Feathers 语境的写作中（[Nicolas Carlo 用它讲 JS 例子](https://understandlegacycode.com/blog/key-points-of-working-effectively-with-legacy-code/)）。**[二手]**
- **"characterization test"** 成为标准术语，并衍生出一个**名字之争**——Nicolas Carlo 的记录很有价值：
  > "the technique of capturing existing code behavior into tests has different names: **Characterization Tests / Approval Tests / Golden Master / Snapshot Tests / Locking Tests / Regression Tests**"（[来源](https://understandlegacycode.com/blog/characterization-tests-or-approval-tests/)）**[一手（作者立场）+ 二手（术语清单）]**
  - Carlo 的**明确表态**：'I recommend referring to it as "Approval Tests"'——**即他公开主张用另一个名字取代 Feathers 的名字**。这是最直接的一条"术语层面的挑战"。
  - 他引用的 Feathers 定义原文（**一手**，经 Carlo 转引）："The purpose of characterization testing is to **document your system's actual behavior; not to check for the behavior you wish your system had**."
- **"code without tests" 定义**被当作行业既有标准反复套用，但**同时有竞品定义**（Rainsberger 的 "profitable code that we're afraid to change"，见 3.11）。**[二手]**
- **"effect sketch"（效果草图）** 是其书中较少被采纳的概念，Frederik Banke 观察到："Eventhough the book is more than a decade old there does not seem to be much material on effect sketches… **the idea has not caught on it seems.**"（[来源](https://frederikbanke.com/book-review-working-effectively-with-legacy-code/)）**[二手]** → 影响链的**边界**：并非书中所有概念都被采纳。

### 6.3 教育化与工业化传播

- **学术课程**：有论文明确采用其格式——"We use the format of a **legacy code retreat**, where students are given an existing codebase. We primarily focus on refactoring…"（[An Experience Report on a Boot-Camp Style Programming Course, ACM](https://dl.acm.org/doi/pdf/10.1145/3159450.3159541)）**[二手]**
- **企业内训**：Last Conference Melbourne 2018 的 Agile Developer Immersion 明确说"We will be following a variation of the **Legacy Code Retreat** format. Working with legacy code (provided!)"（[confengine](https://confengine.com/conferences/last-conference-melbourne-2018/proposal/6611/agile-developer-immersion-refactoring)）**[二手]**
- **SAP 社区**：`Legacy Code Retreat` 被列为 SAP 社区活动形式之一（[SAP Community 博文](https://community.sap.com/t5/application-development-and-automation-blog-posts/review-of-abapgit-bunkai-a-sap-community-event/ba-p/13416823)）**[二手]**

---

## 七、Legacy Code Retreat 与社区运动

### 7.1 它是什么、和常规 code retreat 的差别

**来源**：[Florian Hopf 的第一次德国 Legacy Code Retreat 现场记录（2012-02-20）](http://blog.florian-hopf.de/2012/02/legacy-code-retreat.html) **[一手——参与者现场记录]**

> "A legacy code retreat doesn't work like a common code retreat where you implement a certain functionality again and again. It instead starts with some **really flawed code** and the participants apply different refactoring steps to make it more testable and maintainable. There are **six iterations of 45 minutes** with different tasks or aims. For each iteration you work with a different partner and after a short retrospective with all participants you mostly **start again from the original code**."

代码库来源：**J.B. Rainsberger 的 `trivia`**（[github.com/jbrains/trivia](https://github.com/jbrains/trivia)），含 Java/C++/C#/Ruby 多语言版本。**[一手]**

### 7.2 组织形式（与 Feathers 思想的接口）

[Jo Van Eyck（2015-07-27）](https://jvaneyck.wordpress.com/2015/07/27/legacy-code-retreat/) **[一手——参与者现场记录]**：
- 由 **Erik Talboom** 主持
- 开场是**代码阅读**练习："One person acted as the **reader** and narrated the other through his train of thought… The other half of the pair listened intently and took notes."
- 主体是 **golden master + ApprovalTests + NCover** 建立安全网，再做最小步重构
- 明确指出它**偏离**了 Feathers 的偏好：
  > "I prefer **fine-grained unit tests** over these high-level integrated tests myself… But as you may have experienced yourself: getting legacy code unit tested **sometimes requires invasive changes to the code**."
  > "We did not touch on some legacy-code classics such as **extract-and-override**… Instead, we went directly for full-on dependency inversion through constructor injection."

**这里有一个结构性张力值得记录 [推断]**：Retreat 运动的**技术核心（golden master 黑盒测试）恰恰是 Russ Allbery 批评 Feathers 时主张的方向**（"I prefer to save the mocks and fakes for dependencies that are truly impossible to use in a test environment"）。也就是说，**围绕 Feathers 形成的社区实践，在方法上部分修正了 Feathers 的偏向**。

### 7.3 批评与代价（含"没有想象中好用"）

**来自 Florian Hopf 的逐轮记录，含三条负面观察** **[一手]**：

1. **第三轮技法在真实代码上不适用**："It turned out that the original code is **not suited well for this approach**. There are only few methods that really rely on other methods. Most of the methods are accessing the state via the fields directly."（Subclass to Test 被迫改为 initializer block 变通）
2. **结果不可维护**："The approach worked quite fine for the given code but it's probably true that **the tests won't stay maintainable**."
3. **第六轮目标不明、时间被浪费**："To be honest, **I don't know what the goal of the sixth iteration really was.** I was pairing with a developer that was still fighting with the failing tests from the previous iteration. Most of the iteration we tried to get these running again."

**来自 Jo Van Eyck 的"性价比"自问** **[一手]**：

> "Is it worth sacrificing an entire saturday to refactor an unknown tangled codebase with total strangers?"

以及一条**"练完就改写"的失败**："We even had a session where we combined TDD as if you meant it with the extract pure function refactoring. This was an interesting exercise but **we just ended up rewriting part of the codebase**."

**来自 Alastair Smith / Cambridge 社区**：[codebork 的 2012 纪要](https://codebork.com/2012/07/04/cambridge-software-craftsmanship-community.html) 把 Legacy Code Retreat 列为**"以后再说"的远期计划项**——说明这类活动在社区里是"想要但难落地"的状态。**[一手——组织者本人记录]**

### 7.4 与 Coderetreat 运动的关系（澄清一条常见混淆）

- **Coderetreat** 由 **Corey Haines** 发起（Conway's Game of Life 反复重写），**Legacy Code Retreat** 是它的**变体**（换成烂代码 + 反模式练习），由 **Erik Talboom** 等在欧洲主推。**[二手]**，出处：[Corey Haines《Understanding the Four Rules of Simple Design》序言](https://apprize.best/programming/simple/1.html)、[Mozaic Works 的第一次欧洲 Code Retreat 记述](https://mozaicworks.com/blog/the-story-of-the-first-european-code-retreat)、[Global Day of Code Retreat 2014 报道](https://ivangrigoryev.com/en/global-day-of-code-retreat/)
- **没有证据表明 Feathers 组织了 Legacy Code Retreat 运动**；他提供的是**书名与技法**，运动由他人（Talboom、Rainsberger 的代码库、当地 craftsmanship 社群）执行。**[推断——基于"未发现任何 Feathers 主持 LCR 的记录"这一否定证据]**

---

## 八、2025《Brutal Refactoring》的读者反应

### 8.1 ⚠️ 首先必须澄清一个事实问题：这本书的出版状态本身就是矛盾的

**任务书称"2025 年新书"，但本调研发现该书的实际状态高度混乱，必须标注[冲突]：**

| 来源 | 说法 | 可信度 |
|---|---|---|
| [Jeremiah Flaga 2023-10-09 更新](https://jeremiahflaga.github.io/2019/08/06/what-michael-feathers-said-about-welc-7-years-later) | "**There is no upcoming book named Brutal Refactoring.** See InfoQ podcast" | **[二手——作者主动撤回了自己的旧认知，可信度较高]** |
| [Goodreads 书目页](https://www.goodreads.com/book/show/25544117-brutal-refactoring) | 存在书目条目 | **[二手，本次抓取失败（HTTP 连接错误），仅见检索摘要]** |
| [Amazon 商品页](https://amazon.com/Brutal-Refactoring-Working-Effectively-Legacy/dp/032179320X) | 存在 ISBN 9780321793201、有描述文案 | **[二手]** |
| [InformIT（Pearson 官方商店）](https://informit.com/store/brutal-refactoring-more-working-effectively-with-legacy-9780321793201) | 显示 "Copyright **2041**"、有完整描述 | **[二手——注意 2041 显然是占位符/数据错误]** |
| [pearson.de](https://pearson.de/brutal-refactoring-more-working-effectively-with-legacy-code-9780321793201) | 显示日期 "2040" | **[二手，占位符]** |
| [forage.com](https://forage.com/book/1382395) | 给出"综述与评价"，但自承 "**There are not enough internet reviews to create a summary of this book.**" | **[二手，AI 聚合页，可信度低]** |
| [Forage 有趣的"事实"段](https://forage.com/book/1382395) | "Michael Feathers **coined the term 'legacy code'**" —— **这是错的**，他给出的是一个定义，不是术语本身 | **[二手，已证伪]** |

**萧潇的判断 [推断]**：
1. 该书**长期处于"已宣布、未出版"状态**（最早可见的会议宣传可追到 2011 年的同名 tutorial，见 8.2）。ISBN 与商店页面存在，但多年无实际发货证据。
2. **没有可采信的"读者反应/书评"**。任何声称"读者如何评价这本书"的说法，在当前证据下都不可信。
3. 因此本节的诚实结论是：**《Brutal Refactoring》的读者反应 = 不可获得 / 尚不存在**。任务书中的假设（"与 2004 那本的差异被如何评价"）**无法回答**。

### 8.2 可采信的相关材料：他"如果想改写会怎么改"

这部分是**真实的、有信息量的替代素材**。

**(a) 2011 年 XP 大会 tutorial "Brutal Refactoring" 现场笔记**
**来源**：[Mark Needham, 2011-05-11](https://www.markhneedham.com/blog/2011/05/11/xp-2011-michael-feathers-brutal-refactoring/) **[一手——与会者实时笔记]**；同场另有 [Pat Kua 的笔记](http://www.thekua.com/atwork/2011/05/notes-from-michael-feathers-brutal-refactoring/)

他讲的**与 2004 书里不一样**的东西：
- **clean code vs understandable code 的区分**："He gave a definition of clean code as code which is simple and has no hidden surprises and suggested that this is quite a **high bar**. **Understandable** code on the other hand is about the amount of thinking that we need to do… and can be a **more achievable goal**."
- **明确承认全书重构是不现实的**："it would be **very rare** us to take a code base and refactor the whole thing and that we should **get used to having our code bases in a state where not every part of it is perfect**."
- **行为经济学解释坏代码**：坏代码的成因是"**the difficulty in choosing a name** rather than the mechanical complexity"——即命名成本驱动了往旧方法里塞代码。
- **数据驱动选靶**：code churn × complexity 二维图，"we really need to focus our refactoring efforts on code which is **changed frequently and is complex**"。这与后来 Adam Tornhill/CodeScene 的 hotspot 方法同源——**且 Feathers 是 CodeScene 顾问**（[一手](https://castro.fm/episode/XRtpuA)）。
- **硬边界的代价**："the code around hard boundaries is likely to be **very messy**."

**(b) 2023 年 GOTO Book Club 对谈（最接近"作者亲自修订"的材料）**
**来源**：[完整转录](https://castro.fm/episode/XRtpuA)｜官方页 [gotopia.tech](https://gotopia.tech/bookclub/episodes/228/working-effectively-with-legacy-code) **[一手——逐字转录]**

被直接问到"如果今天重写会改什么"，他答：

> "I almost feel like the core of the book, the core ideas, are kind of like a **little bit timeless** in a way, and that's why I guess it still continues to sell very well now. But I think it would **make more nods to current technology**… It's more like how do you sort of approach the reader?"
> "**There's a lot more now that I would say about how legacy code happens** because that's been almost like the sideline pursuit I've had over the past 10, 15 years… understanding the real mechanics of how it happens and really how you can avoid them **at an organizational and individual level**. I think I would go and add to the book. That and **functional programming**, because there wasn't very much at that point."

**他对自己的核心定义做了柔性化处理（这是最重要的一段）：**

> Christian Clausen 问：如何判定一个 legacy code base？
> **Feathers**："Well, I don't think there's any **hard line** with it. I think legacy is a **subjective judgment** that we make quite often based on the difficulty and the hardness to understand something that we're working with. A traditional definition is it is code you got from somebody else… And at one point, I started throwing around the idea. It's like, well, maybe it's **code without tests** because the way that you work in code without tests is qualitatively different from when you have the test to kind of like serve as, like, a safety net…"
> "**It's really a subjective judgment.** I think the main thing I keep coming back to more and more is **to what degree you actually understand what you're working on**."

→ **与书上那句断言（"Legacy code is simply code without tests."）相比，这是明显的软化和重心转移。**

**他对"测试被过度神圣化"的批评（罕见地站到了他自己追随者的对面）：**

> "I think we can **overly valorize the tests** sometimes and think, 'Oh my God, we can't get rid of any tests at all.' Then you're in a situation where you're just so scared that you can't change anything."
> "sometimes… I feel much more comfortable than many people **putting some of the tests in the parking lot for a minute** and saying, 'Okay, I'm gonna go and change the system.'… I'll rewrite tests that will cover the new structure that I have."

**他承认 TDD 的行业传播跑偏了（这条直接回应了 3.1 的批评）：**

> "in the way that TDD kind of spread across the industry, it's like some people just basically took it to be, like, okay, **you write one unit test harness for each class of your system and you're good**… I think that's the key message that needs to get across to people rather than this **one-to-one mapping of test classes to production classes**. I think that's a way where people kind of… **paint themselves into a corner** to some degree."

**他给"破坏封装"划了界（回应另一条常见误读）：**

> "it's not saying, 'Hey, I'm a fan of breaking encapsulation,' but **selectively in particular places** to go and give you the affordance to go and test things… And you do it **reluctantly**."

**他明确反对把重构无差别地铺满整个代码库（与 2011 年一致）：**

> "The thing I'm always looking at with a system is like, okay, well **what are the high-value areas**… It's not an easy thing necessarily, but I think the thing we need to recognize is that **value is not uniformly distributed across systems. It simply isn't, and we should behave differently in different areas of the system because of that.**"

**AI 与 legacy code（他 2023 年的判断）：**

> "I sense that we're **safe for a little while**… **prompting is just gonna become another form of programming**… We need to understand code well enough to be able to… gauge the correctness of solutions."
> "I've used it to generate test cases. I've just been kind of happy with what it's produced in many cases. I think if nothing else, you get, like, **enhanced ideation**."

### 8.3 另一本"替代品"

他名下另有一本 [*AI Assisted Programming*（Leanpub）](https://leanpub.com/ai-assisted-programming/email_author/new)，2025 年可见其作者页。**[二手]** 若需要"2025 年的 Feathers 新作"，这可能是比《Brutal Refactoring》更实的落点——但**本次未取得其内容与读者反应**。

---

## 九、矛盾与存疑

### 9.1 必须保留的矛盾

| # | 矛盾 | A 方 | B 方 |
|---|---|---|---|
| 1 | 这本书是"必读经典"还是"只是技巧手册" | Nicolas Carlo："This book is a reference. **Probably THE reference.**" | Eli Bendersky："get this book **if** you have to work with old balls of mud… **Otherwise… feel free to skip it.**" |
| 2 | 他的核心定义是权威还是自说自话 | 被行业当作既有标准大量套用（Forage 甚至误称他"coined the term"） | Russ Allbery 称其定义 "**idiosyncratic**"；Rainsberger 给出**竞品定义** |
| 3 | 他是"测试原教旨"还是"反教条" | 他书里"takes it as nearly a tautology that unit testing and mocking out of dependencies is desirable"（Allbery） | 他本人："we can **overly valorize the tests**"、"putting some of the tests in the parking lot for a minute"（GOTO 2023） |
| 4 | "code without tests is bad code" 是否被他本人撤回 | Flaga 直接质问"Is he **backing out**?"，并引 2011 年原话 | Feathers 2011 年称那是"**a sign of the times**"与"**my natural fear as a consultant**"——**这更像承认修订，而非完全撤回** |
| 5 | 数据库要不要 mock | Feathers 全书反复主张 mock 掉数据库层 | Allbery：SQLite 时代"it's trivial to write tests without mocking the storage layer"；Van Eyck 的 LCR 实践走黑盒 golden master |
| 6 | Retreat 练习是否有效 | 参与者普遍表示学到了工具（ApprovalTests/NCover/NCrunch）、值得牺牲一个周六 | 同一批记录里出现"技法不适用""测试不可维护""第六轮不知道在干嘛""最后变成了重写" |
| 7 | 《Brutal Refactoring》是否存在 | Amazon / InformIT / Goodreads / 多家书店有 ISBN 与描述 | Flaga 2023 年更新明确说"There is no upcoming book named Brutal Refactoring"；Forage 自承评论不足；InformIT 版权年写 2041 |
| 8 | 他属于哪一派 | 常被归入 Martin 书系 / 敏捷早期阵营 | okigiveup.net 明确把他与"敏捷宣言签署人"区分开；他自己说"我的范围已经扩展到 legacy code 之外" |

### 9.2 明确的存疑清单

1. **[存疑] "C# 版才有"** —— 任务书假设该书有 C# 专版或需读 C# 版。**本次调研零证据**。相反，多个来源说例子是 Java / C++ / C（Allbery 明确列这三种；Hop 的记录里 C# 只出现在**练习代码库**的多语言版本中，不是书）。
2. **[存疑] Fowler "引他"** —— 只证实 Object Mentor 履历，未见 Fowler 公开引荐文本。
3. **[存疑] Feathers 本人对 SOLID 命名过程的叙述** —— 完全缺失第一手材料。
4. **[存疑] 两处评分数据** —— Forage 同站两个页面给出互相冲突的 Goodreads 评分（4.2/5, 5800+ vs 4.16/5, 3800+）。该站为 AI 聚合，**所有数字不予采信**。
5. **[存疑] "老派"是否构成负面标签** —— 未见任何来源以"老派"为由贬低他个人；该标签主要落在其书的技术时效上。
6. **[存疑] Goodreads / Amazon 原始评论正文** —— Goodreads 多次抓取失败（连接被重置）；Amazon 历史评论页经 web.archive 亦失败。本文件的评分与"常见批评"转述自二级聚合，**未取得原始评论者身份**（3.10 的 Reddit 引用则取得了具体线程与票数）。
7. **[存疑] 2025 年"新书"** —— 见 8.1。任务书前提可能与事实不符。

### 9.3 本次调研的方法学限制（供下游置信度校准）

- **搜索引擎严重受限**：本次会话中 ddg / ddg-lite / searxng / exa / tavily / firecrawl 全部失败（连接错误、429 限流或未配置 key），可用引擎仅 Bing（且对英文技术查询返回中文词典噪声）、anysearch、keenable、deepseek-official。**这意味着覆盖度不完整，可能存在未被检索到的重要批评。**
- **Reddit 平台检索失败**（"fetch failed"），改用 BooksReddit 的结构化聚合替代——该站为第三方分析，非原始语料。
- **Goodreads、Wikipedia（en）、Medium 均无法直接抓取**（连接错误 / 非公网 IP 解析），改用 HandWiki、Wikiwand、IPFS 等镜像 —— 镜像可能滞后。
- **HN 讨论串（id=45138695）抓取失败**，社区对"key points 摘要文"的反应未能纳入。

---

## 十、来源清单

> 共 **41** 条 URL。标注：**[一手]** = 当事人原话/现场记录；**[二手]** = 第三方评论/聚合；可信度另附说明。

### A. 一手：Feathers 本人

| # | URL | 类型 | 说明 |
|---|---|---|---|
| 1 | https://lobste.rs/s/laqm8q | [一手] | **他自己在 Lobsters 回应 Russ Allbery 的批评**（账号 `mfeathers`）。最高价值一手材料 |
| 2 | https://castro.fm/episode/XRtpuA | [一手] | GOTO Book Club 2023 完整逐字转录。他柔性化"legacy=无测试"定义、批评测试被过度神圣化 |
| 3 | https://gotopia.tech/bookclub/episodes/228/working-effectively-with-legacy-code | [一手] | 同上对谈官方页 |
| 4 | https://jeremiahflaga.github.io/2019/08/06/what-michael-feathers-said-about-welc-7-years-later | [二手·引一手] | 引其 2011 博客原话"a sign of the times / my natural fear as a consultant" |
| 5 | https://michaelfeathers.typepad.com/michael_feathers_blog/2011/03/brutal-refactoring.html | [一手·已失效] | 2011 原文，本次抓取重定向失败，仅存于他人引述 |
| 6 | https://michaelfeathers.silvrback.com/characterization-testing | [一手] | 其 characterization testing 的原始定义页 |
| 7 | https://michaelfeathers.silvrback.com/functional-code-is-honest-code | [一手] | 其博客另一篇 |
| 8 | https://www.r7krecon.com/michael-feathers-bio | [一手·DNS 失败] | 公司官网 bio；内容经 #9 #10 转载确认 |
| 9 | https://gotochgo.com/2024/speakers/3528/michael-feathers | [一手·转载] | 履历副本（R7K Founder & Director） |
| 10 | https://engineers.sg/s/mfeathers | [一手·转载] | 履历副本 |
| 11 | https://dev.to/developeronfire/episode-102--michael-feathers--providing-options | [一手·转载] | Developer on Fire #102 节目页；含 **Object Mentor International / Obtiva** 履历 |
| 12 | https://yowcon.com/brisbane-2025/speakers/3864/michael-feathers | [一手·转载] | 2025 年仍活跃演讲 |

### B. 一手：他人现场记录

| # | URL | 类型 | 说明 |
|---|---|---|---|
| 13 | https://www.markhneedham.com/blog/2011/05/11/xp-2011-michael-feathers-brutal-refactoring/ | [一手] | XP2011 "Brutal Refactoring" tutorial 与会者笔记（clean vs understandable code） |
| 14 | http://blog.florian-hopf.de/2012/02/legacy-code-retreat.html | [一手] | 首次德国 Legacy Code Retreat 六轮逐轮记录，含三条负面观察 |
| 15 | https://jvaneyck.wordpress.com/2015/07/27/legacy-code-retreat/ | [一手] | Erik Talboom 主持的 LCR 记录；引 Rainsberger 竞品定义 |
| 16 | https://codebork.com/2012/07/04/cambridge-software-craftsmanship-community.html | [一手] | Cambridge 软件工艺社区创立纪要 |
| 17 | https://www.ayende.net/Blog/201537-a/legacy-code-with-really-good-tests-is-still-legacy-code | [一手] | Oren Eini 自述受其影响；同时**反对**其 legacy 定义（"about the state of the team"） |
| 18 | https://dannorth.net/blog/cupid-the-back-story/ | [一手] | Dan North 逐条拆解 SOLID；同时称 Feathers 的书 "brilliant" |
| 19 | https://understandlegacycode.com/blog/characterization-tests-or-approval-tests/ | [一手] | Nicolas Carlo 主张**换掉** Feathers 的术语名 |
| 20 | https://understandlegacycode.com/blog/key-points-of-working-effectively-with-legacy-code/ | [一手] | 同作者对其书的方法论总结与辩护 |

### C. 二手：书评（有具体批评）

| # | URL | 类型 | 说明 |
|---|---|---|---|
| 21 | https://www.eyrie.org/~eagle/reviews/books/0-13-117705-2.html | [二手] | **Russ Allbery 7/10 长评**，最实质的技术批评 |
| 22 | https://www.happycoders.eu/books/working-effectively-with-legacy-code/ | [二手] | Sven Woltmann，含页码级反例（p.366 与 ISP 冲突） |
| 23 | https://eli.thegreenplace.net/2017/book-review-working-effectively-with-legacy-code-by-michael-c-feathers | [二手] | Eli Bendersky，技法丑陋论 + 重复冗长 |
| 24 | https://okigiveup.net/book-reviews/working-effectively-with-legacy-code | [二手] | 500 页可删、C++ 编译细节、Python 读者迷失 |
| 25 | https://koterpillar.com/2016-12-08/working-effectively-with-legacy-code | [二手] | 多语言书评；强类型/宏/null 的时代性 |
| 26 | https://frederikbanke.com/book-review-working-effectively-with-legacy-code/ | [二手] | 24 分钟逐章精读；"接近常识"评价；指出 effect sketch 未流行 |
| 27 | https://forage.com/book/605495 | [二手·AI 聚合，低可信] | 评分与常见批评归纳；含明显错误（"coined the term legacy code"） |
| 28 | https://forage.com/book/1382395 | [二手·AI 聚合，低可信] | Brutal Refactoring 页；自承评论不足 |
| 29 | https://booksreddit.com/book/working-effectively-with-legacy-code/ | [二手/推断] | 119 条 Reddit 提及的结构化分析；含具体线程与票数 |

### D. 二手：SOLID 命名与争议

| # | URL | 类型 | 说明 |
|---|---|---|---|
| 30 | https://handwiki.org/wiki/SOLID | [二手·镜像] | "coined around 2004 by Michael Feathers" |
| 31 | https://wikiwand.com/en/SOLID | [二手·镜像] | 同表述 |
| 32 | https://ipfs.io/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/wiki/SOLID_(object-oriented_design).html | [二手·镜像] | 同表述 |
| 33 | https://lawsofsoftwareengineering.com/laws/solid-principles/ | [二手] | 同表述 + 原理归属拆分 |
| 34 | https://www.baeldung.com/solid-principles | [二手] | Martin 2000 论文源流 |
| 35 | https://www.ionos.com/digitalguide/websites/web-development/solid-principles/ | [二手·反例] | **张冠李戴**："coined by Robert C. Martin" —— 证明确有混淆 |

### E. 二手：Retreat 运动与影响链

| # | URL | 类型 | 说明 |
|---|---|---|---|
| 36 | https://github.com/jbrains/trivia | [一手·代码库] | LCR 使用的 legacy 代码库（多语言） |
| 37 | https://confengine.com/conferences/last-conference-melbourne-2018/proposal/6611/agile-developer-immersion-refactoring | [二手] | 企业训练采用 LCR 变体 |
| 38 | https://dl.acm.org/doi/pdf/10.1145/3159450.3159541 | [二手·学术] | 学术课程正式采用 LCR 格式 |
| 39 | https://community.sap.com/t5/application-development-and-automation-blog-posts/review-of-abapgit-bunkai-a-sap-community-event/ba-p/13416823 | [二手] | SAP 社区活动采用 LCR |
| 40 | https://mozaicworks.com/blog/the-story-of-the-first-european-code-retreat | [二手] | Coderetreat 与 LCR 的源流区分 |
| 41 | https://search.worldcat.org/isbn/9780131177055 | [一手·书目] | 确认其书属 **Robert C. Martin Series** |

### F. 提及但抓取失败（记录以证明覆盖尝试）

- https://www.goodreads.com/book/show/44919.Working_Effectively_with_Legacy_Code —— 多次连接失败
- https://www.goodreads.com/book/show/25544117-brutal-refactoring —— 连接失败
- https://en.wikipedia.org/wiki/SOLID —— "resolves to a non-public IP address"
- https://news.ycombinator.com/item?id=45138695 —— HN 讨论串，抓取失败
- https://www.infoq.com/podcasts/working-effectively-legacy-code/ —— HTTP 405（人机验证）
- https://pozorvlak.dreamwidth.org/181129.html / https://pozorvlak.livejournal.com/181129.html —— HTTP 403
- http://web.archive.org/web/20160511024852/http://www.amazon.com/Working-Effectively-Legacy-Michael-Feathers/product-reviews/0131177052 —— 连接失败
- https://medium.com/@ajayjnv02/... —— 非公网 IP 解析

---

## 附：给下游蒸馏的一句话提示

**如果要从"他者视角"里提炼一条对 Feathers 本人最不利、也最有价值的证据，是这一条：**
他 2004 年写下的最具传播力的一句话，在 2011 年被他本人描述为 **"a sign of the times" 和 "my natural fear as a consultant"**，到 2023 年他把那个定义重新定义为 **"a subjective judgment"**，并公开反对**"overly valorize the tests"**。
——**最激烈地反对"Feathers 教条"的人，是后来的 Feathers 自己。**
（出处：[Jeremiah Flaga 引 2011 原文](https://jeremiahflaga.github.io/2019/08/06/what-michael-feathers-said-about-welc-7-years-later)｜[GOTO 2023 转录](https://castro.fm/episode/XRtpuA)）
