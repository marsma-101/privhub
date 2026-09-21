# John Ousterhout 一手来源摘录（主 agent 亲取）

> 采集者：萧潇（主 agent）｜采集日期：2026-09-17
> 采集方式：直接抓取他的斯坦福官方主页与官方 GitHub 公开仓库
> 全部内容为 **[一手]**：他本人撰写并署名的页面 / 由他与 Robert Martin 共同署名的公开讨论文档
> 用途：本 Skill 的核心心智模型与表达 DNA **必须**从本文件可核验，不得转引二手

---

## 来源清单

| # | URL | 性质 | 抓取状态 |
|---|---|---|---|
| S1 | `https://web.stanford.edu/~ouster/cgi-bin/aposd.php` | 官方书籍页（含第二版变更说明、推荐书目） | ✅ HTTP 200，页面自述最后更新 2025-02-26 |
| S2 | `https://web.stanford.edu/~ouster/cgi-bin/book.php` | 同上内容的另一路由（book.php） | ✅ HTTP 200 |
| S3 | `https://web.stanford.edu/~ouster/cgi-bin/sayings.php` | **"My Favorite Sayings"** —— 他自选的 8 条格言，带长篇自述 | ✅ HTTP 200，页面自述最后更新 2021-06-08 |
| S4 | `https://web.stanford.edu/~ouster/cgi-bin/faq.php` | 官方 FAQ | ✅ HTTP 200，页面自述最后更新 2021-06-08 |
| S5 | `https://raw.githubusercontent.com/johnousterhout/aposd-vs-clean-code/main/README.md` | **他与 Robert C. Martin 的公开书面辩论全文**（2024-09 至 2025-02 往来，双方署名） | ✅ HTTP 200，**内容超长，本次抓到约前 60%**，完整件已落盘至本机临时文件 |

---

## S1/S2 · 第二版（2021-07）到底改了什么 —— 他本人的原话

来源：`aposd.php` / `book.php` `[一手]`

> "In July of 2021 I released the Second Edition of *A Philosophy of Software Design*. There are only a few significant changes from the First Edition:"

1. > "There is a new chapter **'Decide What Matters'** that talks about how good software design is about separating what's important from what's not important and focusing on what's important."
2. > "Since the First Edition was published, the importance of choosing general-purpose approaches has become even more clear to me. I have reworked and expanded **Chapter 6 ('General-Purpose Modules are Deeper')** to reflect this, and I've moved some material from other chapters to Chapter 6."
3. > "I have added subsections in two chapters to compare the book's design philosophy with that of Robert Martin's *Clean Code* (we have significant differences of opinion on topics such as **the length of methods and the role of comments**)."

**他明确说第二版不必买（这条很能说明他的性格）**：

> "For the benefit of people who already purchased the First Edition, I have made the two new chapters and the comparisons with *Clean Code* available in a book extract. **It may not be worth buying the Second Edition if you already own the First Edition.**"

**他的推荐书目（揭示智识谱系，`[一手]`）**——他亲自列出的"其他关于软件设计的书与文档"：

| 推荐物 | 他的原话理由 |
|---|---|
| 他与 Robert Martin 的公开讨论（即 S5） | （作为分歧的公开记录） |
| Dustin Boswell & Trevor Foucher, *The Art of Readable Code* | > "written at a lower level than APOSD (more about coding than design), but **it is compatible with APOSD in philosophy**" |
| Carson Gross, *The Grug Brained Developer* | > "will make you laugh so hard you will fall out of your chair; **it also contains some big grains of truth**" |
| Salvatore Sanfilippo (antirez), *Writing system software: code comments* | （Redis 作者谈注释——与他的注释主张同向） |

**两个可用的中文/外文版本事实（`[一手]`，防过时用）**：
- 德译本：O'Reilly，2021 年 10 月，《Prinzipien des Softwaredesigns》
- **中译本：人民邮电出版社，2024 年 11 月**（他主页给出京东链接 `item.jd.com/14328323.html`）

---

## S3 · "My Favorite Sayings" —— 8 条，每条都有他的长篇自述 `[一手]`

> ⚠️ **本文件是本 Skill 最有价值的一手材料**：它由他本人挑选，因此"他认为自己最重要的想法是什么"这件事**不需要我来推断**。

### 格言 1 · "The greatest performance improvement of all is when a system goes from not-working to working"

> "Programmers tend to worry too much and too soon about performance. … but in real life performance rarely matters. … Thus the primary design criterion for software should be **simplicity**, not speed."

> "Occasionally there will be parts of a program where performance matters, but **you probably won't be able to predict where** the performance issues will occur. If you try to optimize the performance of an application during the initial construction you will add complexity that will impact the timely delivery and quality of the application and probably won't help performance at all"

> "**I've found that in most situations the simplest code is also the fastest.** So, don't worry about performance until the application is running; if it isn't fast enough, then go in and carefully **measure** to figure out where the performance bottlenecks are (**they are likely to be in places you wouldn't have guessed**). **Tune only the places where you have measured that there is an issue.**"

**可复用判据**：「只优化你测过的那个点」——这条直接可用于判断"某处性能优化值不值得做"。

### 格言 2 · "Use your intuition to ask questions, not to answer them"

> "So, I try to treat **intuition as a hypothesis to be verified, not an edict to be followed blindly**."

> "For more abstract tasks such as design I find that intuition can also be valuable (I get a vague sense that a particular approach is good or bad), but the intuition needs to be followed up with **a lot of additional analysis** to expose all the underlying factors and verify whether the intuition was correct. **The intuition helps me to focus my analysis, but it doesn't eliminate the need for analysis.**"

> "One area where people frequently misuse their intuition is **performance analysis**. Developers often jump to conclusions about the source of a performance problem and run off to make changes without making measurements … ('Of course it's the xyz that is slow'). **More often than not they are wrong**, and the change ends up making the system more complicated without fixing the problem."

> "Ironically, **people who are most dogmatic about their intuitions often seem to have least well-developed intuitions.** If they would challenge their intuitions more, they would find that their intuitions become more accurate."

**注意这里的张力**：他把直觉降级为"待验证的假设"，**同时**又说直觉有用、且越质疑越准。**这不是含糊，这是他的一贯结构：强断言 + 承认权衡。**

### 格言 3 · "The most important component of evolution is death"

> "it's easier to create a new organism than to change an existing one."

> "Computer software is a **counter-example** to this rule, with ironic results. … **To a first approximation, software doesn't die** … At the same time, **it is difficult to make major structural improvements to software once it has been shipped, so mistakes in early versions of the program often live forever.** As a result, software tends to live too long: **just good enough to discourage replacement, but slowly rotting away** with more and more problems that are hard to fix."

> "I wonder if the overall quality of computer software would improve if there were a way of **forcing all software to be replaced after some period of time**."

**这条极重要**：它给"重写 vs 改造"提供了一个他本人会给的判断角度，而且**他自己承认这是个开放问题（"I wonder"）**，不是结论。**引用时必须保留"他在自问而非断言"这一点。**

### 格言 4 · "Facts precede concepts"

> "A fact is a piece of information that can be observed or measured; a concept is a general rule that can be used to predict many facts or a solution to many problems. Concepts are powerful and valuable … **However, before you can appreciate or develop a concept you need to observe a large number of facts related to the concept.**"

> 教学法：Edward Tufte 的 **"general-specific-general"** —— "start by explaining the concept, then give several specific examples to show where the concept does and does not apply, then reiterate the concept"

> **他自述的实际做法（对"接口优于实现"的可操作注解）**：
> "a few years ago I started working on my first large Web application. My goal was to develop a library of reusable classes on which to base the application, but being new to Web development I had no idea what those classes should be. So, **I built the first simple version of the application without any shared code, creating each page separately. Once I had developed a dozen pages I was able to identify areas of functionality that were repeated over and over in different pages**, and from this I was able to develop a set of classes that implemented the shared functionality."

**⚠️ 这段是本 Skill 里最有操作价值的一手材料之一**：它给出了他本人对"什么时候该抽象出共享层"的**具体门槛——先做十几次重复的实例，再抽象**。这与"设计两次"并不矛盾，而是后者的时间尺度版本。

### 格言 5 · "If you don't know what the problem was, you haven't fixed it"

他给出的完整场景（原文列举）：

> - A developer is tracking down a difficult problem, often one that is not completely reproducible.
> - In a status meeting the developer announces that the problem has been fixed.
> - I ask "what was the cause of the problem?".
> - The developer responds "**I'm not really sure what the problem was, but I changed xyz and the problem went away.**"

> "**Nine times out of ten this approach doesn't really fix the problem; it just submerges it** … In a few weeks or months the problem will reappear. **Don't ever assume that a problem has been fixed until you can identify the exact lines of code that caused it** and convince yourself that the particular code really explains the behavior you have seen. Ideally you should create a test case that reliably reproduces the problem, make your fix, and then use that test case to verify that the problem is gone."

> "If you do end up in a situation where you make a change and the problem mysteriously goes away, **don't stop there. Undo the change and see if the problem recurs.** If it doesn't, then the change is probably unrelated to the problem."

**可复用判据（可直接用于验收）**：**"你说修好了——那你能指出是哪几行造成的吗？"** 指不出来 = 没修好。

### 格言 6 · "If it hasn't been used, it doesn't work"

> "You design and implement a new feature or application, you test it carefully, and you think you are done. **Unfortunately you aren't.** … Either there will be bugs that you missed, or some of the features will be clumsy, or additional features will be needed. **Sometimes the entire architecture turns out to be wrong.**"

> "**My rule of thumb is that when you think you are finished with a software project (coded, tested, and documented, and ready for QA or production use) you are really only 50-75% done.** In other words, if you spent 3 months in initial construction, plan on spending another 4-8 weeks in follow-up work."

> "One way to minimize this problem is to **get your new software in use as soon as possible**. If you can create a skeletal version that is still useful, get people trying it out so you can find out about problems before you think you're finished. **This is one of the ideas behind Agile Development.**"

> "**There are 2 kinds of software in the world: software that starts out crappy and eventually becomes great, and software that starts out crappy and stays that way.**"

**⚠️ 这条修正了一个常见的对他的误读**：他**不是**敏捷的反对者——他明确说 "skeletal version … as soon as possible … is one of the ideas behind Agile Development"。他反对的是**战术编程**（为赶工而持续牺牲设计），不是**早交付**。**引用时不能把两者混为一谈。**

### 格言 7 · "The only thing worse than a problem that happens all the time is a problem that doesn't happen all the time"

> "it's painful to debug a problem that isn't reproducible. **I have spent as long as 6 months tracking down a single nondeterministic bug.**"

**这一条与 Project 的「静默失效」问题直接对应**：不可复现/不报错的问题，在他看来比稳定复现的问题更糟。

### 格言 8 · "The three most powerful words for building credibility are 'I don't know'"

> "Many people worry that not knowing something is a sign of weakness … Such people try to pretend they have the answer in every situation, **making things up if necessary** … However, this approach ultimately backfires. … **When this happens the person loses all credibility**: no-one can tell whether the person is speaking from authority or making something up, so it isn't safe to trust anything they say."

> "if you admit that you don't know the answer, or that you made a mistake, **you build credibility**."

### 格言 9（页面末条）· "Coherent systems are inherently unstable"

> "A coherent system is one where everything is the same in some respect; the more things that are uniform or shared, **the more coherent** the system is."

> "Unfortunately, **coherent systems are unstable**: if a problem arises it can wipe out the whole system very quickly. … Computer viruses are another example."

> "The incoherency of natural systems give them greater stability."

**⚠️ 这条是重要的反直觉材料，且与"统一/收敛/一致化"类重构建议**直接相关：**他在说"越统一越脆"**。引用时必须与他的"减少重复"主张并置——**这是他自己的一对内在张力，不是我拼出来的。**

---

## S5 · Ousterhout vs Robert C. Martin 的公开辩论 `[一手·双方署名]`

来源：`github.com/johnousterhout/aposd-vs-clean-code`（README，2024-09 至 2025-02 往来）
**本次抓取到约前 60%**（完整约 50 KB，已截断存盘）。以下为他**逐字**原话。

### A. 他对"复杂度的定义"——**这是他本人给出的最精确版本，应作为本 Skill 的核心定义**

> "For me, **the fundamental goal of software design is to make it easy to understand and modify the system.** I use the term **'complexity'** to refer to things that make it hard to understand and modify a system. The most important contributors to complexity relate to **information**:
> - **How much information must a developer have in their head in order to carry out a task?**
> - **How accessible and obvious is the information that the developer needs?**
>
> The more information a developer needs to have, the harder it will be for them to work on the system. **Things get even worse if the required information isn't obvious. The worst case is when there is a crucial piece of information hidden in some far-away piece of code that the developer has never heard of.**"

> "When I'm evaluating an idea related to software design, **I ask whether it will reduce complexity. This usually means either reducing the amount of information a developer has to know, or making the required information more obvious.**"

**→ 这就是本 Skill 的心智模型 1 的一手依据，且它给出了一个可操作的度量方向（"要装在脑子里的信息量"+"信息是否显眼"）。**

### B. 他对 deep / shallow 的一手定义

> "The idea, of course, is to take a complex chunk of functionality and encapsulate it in a separate method with a simple interface. Developers can then harness the functionality of the method … **without learning the details of how the method is implemented; they only need to learn its interface.** The best methods are those that **provide a lot of functionality but have a very simple interface**: they **replace a large cognitive load (reading the detailed implementation) with a much smaller cognitive load (learning the interface). I call these methods 'deep'.**"

> "like most ideas in software design, **decomposition can be taken too far**. As methods get smaller and smaller there is less and less benefit to further subdivision. **The amount of functionality hidden behind each interface drops, while the interfaces often become more complex. I call these interfaces 'shallow'**: they don't help much in terms of reducing what the programmer needs to know. Eventually, the point is reached where someone using the method needs to understand every aspect of its implementation. **Such methods are usually pointless.**"

> "**entanglement**": "Two methods are entangled (or **'conjoined'** in APOSD terminology) if, **in order to understand how one of them works internally, you also need to read the code of the other.** If you've ever found yourself **flipping back and forth** between the implementations of two methods as you read code, **that's a red flag** that the methods might be entangled. … **Entangled methods can usually be improved by combining them so that all the code is in one place.**"

**→ 给出了"深/浅"的**判据**（不是形容词）：接口的认知负荷 vs 实现的认知负荷。也给出了"conjoined/entangled"的**可观察信号**（来回翻）。

### C. 他对 Clean Code 方法长度主张的批评（逐字）

> "I agree that dividing up code into relatively small units ('modular design') is one of the most important ways to reduce the amount of information a programmer has to keep in their mind at once."

> "The advice in *Clean Code* on method length is so extreme that it encourages programmers to create teeny-tiny methods that **suffer from both shallow interfaces and entanglement**. Setting arbitrary numerical limits such as 2-4 lines in a method and a single line in the body of an `if` or `while` statement exacerbates this problem."

> 关于"One Thing 规则"的三点反驳（他原文编号）：
> 1. "The term **'one thing' is vague and easy to abuse**. For example, if a method has two lines of code, isn't it doing two things?"
> 2. "**You haven't provided any useful guardrails** to prevent over-decomposition. … the 'can it be named' qualification doesn't help: **anything can be named.**"
> 3. "**The One Thing approach is simply wrong in many cases.** If two things are closely related, it might well make sense to implement them in a single method."

> "the *Clean Code* arguments about decomposition, including the One Thing Rule, are **one-sided**. They give **strong, concrete, quantitative advice about when to chop things up, with virtually no guidance for how to tell you've gone too far.**"

> "**One of the reasons I use the deep/shallow characterization is that it captures both sides of the tradeoff**: it will tell you when a decomposition is good **and also when decomposition makes things worse.**"

**→ 这是本 Skill 里最重要的"如何识别浅模块"的一手依据，也是"深/浅"这个工具的**存在理由**（它自带双向判据）。**

### D. 关于 PrimeGenerator 的关键判据（对他人的代码，逐字）

> "The code is chopped up so much (8 teeny-tiny methods) that it's difficult to read. … `isNotMultipleOfAnyPreviousPrimeFactor` … invokes … `isMultipleOfNthPrimeFactor` … which invokes … `smallestOddNthMultipleNotLessThanCandidate`. **These methods are shallow and entangled**: in order to understand `isNot...` you have to read the other two methods and load all of that code into your mind at once. For example, **`isNot...` has side effects (it modifies `multiplesOfPrimeFactors`) but you can't see that unless you read all three methods.**"

> "**splitting up `isNot...` into three methods doesn't reduce the amount of information you have to keep in your mind. It just spreads it out**, so it isn't as obvious that you need to read all three methods together."

> "if code no longer makes sense to the writer when the writer returns to the code later, that means the code is problematic. **The fact that code can eventually be understood (with great pain and suffering) does not excuse its entanglement.**"

> **他要求对方自证设计方法论的可靠性（这条极有特征）**：
> "**if you are unable to predict whether your code will be easy to understand, there are problems with your design methodology.**"

> **他的杀手判据（对"名字看起来对"的陷阱）**：
> "This code does appear to be simple and obvious. **Unfortunately, this appearance is deceiving.** If a reader trusts the name `isMultipleOfNthPrimeFactor` (which suggests a predicate **with no side effects**) and doesn't bother to read its code, they will not realize that it has side effects … **The current decomposition hides this important information from the reader.**"

> "**If there is one thing more likely to result in bugs than not understanding code, it's thinking you understand it when you don't.**"

**→ 最后一句是本 Skill 里可引用性最强的一句，且它精确描述了**"静默失效"**这类问题的危险本质：不是"看不懂"，而是"以为看懂了"。**

### E. 关于注释（逐字，他与 Martin 的核心分歧）

> "The goal here was to say ***what* the code is doing in a logical sense, not *how* it does it.**"

> "**if a comment causes confusion in the reader, then it is not a good comment.**"（注：这是他对 Martin 的唯一实质让步）

> 他对自己注释里一个 bug 的回应（**他当场认错并保留全部信息**）：
> "There is a bug in this comment that you exposed (the first entry is not odd); **good catch!** You then argued that most of the information in the comment is unnecessary and proposed this as an alternative: `// multiples of corresponding prime.` **You have left out too much useful information here.** For example, **I don't think it is safe to assume that readers will figure out that the motivation is avoiding divisions. It's always better to state these assumptions and motivations clearly so that there will be no confusion.**"

> "**it is our responsibility as programmers** to [explain something to someone who is not intimate with the details]"

> "**Giving up on this is an abdication of professional responsibility.**"

> "Clearly **you and I live in different universes when it comes to comments.**"

**⚠️ 同时保留 Martin 的有效反驳（避免单声道）**：
> **UB**: "As for comments being better, **if that were true then no one would publish example code.**"
> **UB**: "it is very difficult to explain something to someone who is not intimate with the details you are trying to explain."（John 回应："I agree with your assertion"）

### F. 关于 TDD（逐字）——这是他的重要立场，且有明确的认错记录

> "**I am a huge fan of unit testing.** I believe that unit tests are an indispensable part of the software development process and pay for themselves over and over. … **However, I am not a fan of Test-Driven Development (TDD)**, which dictates that tests must be written before code and that code must be written and tested in tiny increments. This approach has serious problems without any compensating advantages that I have been able to identify."

> **他公开认错（重要的一手材料）**：
> "**Oops! I plead 'guilty as charged' to inaccurately describing TDD. I will fix this in the next revision of APOSD.** That said, your definition of TDD does not change my concerns."

> **他偏好的替代做法（Martin 命名为 "bundling"）**：
> "The approach I prefer is one where the developer works in somewhat **larger units** than in TDD, perhaps a few methods or a class. The developer first writes some code (**anywhere from a few tens of lines to a few hundred lines**), then writes unit tests for that code. As with TDD, the code isn't considered to be 'working' until it has comprehensive unit tests."

> "The reason for working in larger units is to **encourage design thinking** … so that a developer can think about **a collection of related tasks** and do a bit of planning … the goal is to **center the development process around design, not tests.**"

> **他对 TDD 的四点逐一回应（结构极清楚，可作示范）**：
> - 调试少？→ "**I think any form of unit testing can reduce debugging work, but not for the reason you suggested.** The benefit comes because unit tests **expose bugs earlier and in an environment where they are easier to track down.**"
> - 当文档？→ "**I disagree: unit tests are a poor form of documentation. Comments are a much more effective form of documentation** … Trying to learn a method's interface by reading a bunch of unit tests seems much more difficult than just reading a couple of sentences of English text."
> - 耦合更少？→ "**Possibly, but I haven't experienced this myself.** … In my experience, **mocking virtually never changes interfaces**; it just provides replacements for existing (typically immovable) interfaces."
> - 无惧重构？→ "**BINGO! This is the where almost all of the benefits from unit testing come from, and it is a really really big deal.**"

> **他对 TDD 的核心反对（这是"战术编程"的一手定义来源）**：
> "**The fundamental problem with TDD is that it forces developers to work too tactically, in units of development that are too small; it discourages design thinking.** … **the natural units for design are larger than this: a class or method** … These units correspond to multiple test cases. If a developer thinks only about the next test, they are only considering part of a design problem at any given time. **It's hard to design something well if you don't think about the whole design problem at once.**"

> "**TDD is similar to the One Thing Rule** … in that it is **biased**: it provides very strong and clear instructions pushing developers in one direction … **with only vague guidance in the other direction** … As a result, developers are likely to err on the side of being too tactical."

> "**TDD guarantees that developers will initially write bad code.** … **Design only happens after a bunch of bad code has accumulated.** … With TDD, that bad code will actually work (there are tests to prove it!) and **it's human nature not to want to change something that works.**"

> "**It's easy for a developer to believe they are doing TDD correctly while working entirely tactically, layering on hack after hack** with an occasional minor refactor, **without ever thinking about the overall design.**"

> "I believe that the bundling approach is superior to TDD because it **focuses the development process around design: design first, then code, then write unit tests.** … **It is possible to produce equally good designs with TDD; it's just harder and requires a lot more discipline.**"

### G. 他对性能回归的实测（体现"先测量"原则）

> "Unfortunately, this revision of the code creates a **serious performance regression: I measured a factor of 3-4x slowdown** compared to either of the earlier revisions. … **The two methods must be combined.**"

> **他的归因（这句是"Decide What Matters"的现场示范）**：
> "I think what happened here is that **you were so focused on something that isn't actually all that important** (creating the tiniest possible methods) **that you dropped the ball on other issues that really do matter.**"

> "**One of the most important things in software design is to identify what is important and focus on that; if you focus on things that are unimportant, you're likely to mess up the things that are important.**"

> 关于 `continue` 语句（能看出他的语言品味）："I don't understand why you are offended by the labeled `continue` statement in my code. **This is a clean and elegant solution** to the problem of escaping from nested loops. **I wish more languages had this feature.**"

### H. 他从对方那里接受的让步（保留，避免单声道）

| 对方的论点 | 他的回应（逐字） |
|---|---|
| 你没法预判读者会觉得难读 | "**Fair enough.**"（并补一句反驳：你也一样） |
| 你的注释里有个 bug | "**good catch!**"（并保留全部信息、只修 bug） |
| 注释会引起困惑 | "**if a comment causes confusion in the reader, then it is not a good comment.**"（据此改写了自己的注释） |
| 你说我关于 TDD 的描述是错的 | "**I plead 'guilty as charged'**" |
| 你的版本也有性能问题等我发现 | "**Yep, that fixes the problem.**" |

**⚠️ 这份辩论说明他有一条比"我对你错"更高的规则：说得对就认。** 这一点在角色扮演时**必须保留**——只学到他的犀利、没学到他的认错，是把这个 Skill 做成了一个骂人机器。

---

## S4 · FAQ（低信息量，仅记录）`[一手]`

- 他**不在研究生录取过程中与申请人互动**（"time limitations prevent me from interacting with candidates during the application process (and talking to me ahead of time will not affect your chances of admission)"）
- 他**拒绝做法务专家证人**："No thanks; I don't have the time or interest for litigation."
- 他仍在教 **CS 142**（页面自述 2021 年）。**注：CS 190 / CS 340 未在本次抓取的页面中出现，其课程材料本轮未核实。**

---

## 本次未核实（不代笔）

- ❌ S5 完整辩论的**后 40%**（已落盘临时文件，本轮未通读；其中包含 Martin 对 TDD 的逐条回应、Closing Remarks、"A Tale of Two Programmers"，以及两人各自的 `PrimeGenerator` 重写全文对比）
- ❌ **CS 190 / CS 340 的课程大纲与作业设计** —— 本轮未打开任何课程页面
- ❌ **Raft 论文原文** —— 本轮未抓取（第二个调研维度负责）
- ❌ **2022–2026 年的新动态**（新论文、新课程、退休与否、对 AI 编程的表态）—— 本轮未核实
- ❌ 他的**出生年份、教育经历、Scriptics 年份**等生平事实 —— 本轮未核实
- ❌ 他**对前端 / UI 的任何公开表态** —— 本轮未找到，**推测他没有系统论述**（标 `[推断]`，不可写成事实）
