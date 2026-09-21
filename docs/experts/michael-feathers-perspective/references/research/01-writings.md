# 01 著作与系统性思考：Michael Feathers

> 调研范围：著作、书籍章节、系统性长文、自创术语、智识谱系。
> 调研时间：本次会话。信源分级：**[一手]** 他本人写的 / 书章节原文 / 出版社官方书页；**[二手]** 他人总结、书评、笔记；**[推断]** 萧潇的判断。
> 写作纪律：只写真正 fetch 到的页面内容；未找到的显式写「未找到」。英文短句直接引自 fetch 到的页面。

---

## 一、总体定位

### 1.1 官方身份陈述（一手）

InformIT（Pearson 自家零售站）作者页对他的官方简介：

> "**Michael Feathers** is the Founder and Director of R7K Research & Conveyance, a company specializing in software and organization design. Prior to forming R7K, Michael was the Chief Scientist of Obtiva and a consultant with Object Mentor International. Over the past 20 years he has consulted with hundreds of organizations, supporting them with general software design issues, process change and code revitalization."
> —— [informit.com/authors/bio/16f6a5b2...](https://www.informit.com/authors/bio/16f6a5b2-9838-4bec-88db-263b29a7b74c) **[一手]**

他的自述博客 Bio 更短，只保留两条事实：R7K 创始人兼总监；《Working Effectively with Legacy Code》(Prentice Hall, 2004) 作者。
> —— [michaelfeathers.silvrback.com/bio](https://michaelfeathers.silvrback.com/bio) **[一手]**

### 1.2 一个需要先纠正的定位偏差

任务书把 2025 年 Pearson/Addison-Wesley 的《Brutal Refactoring》当作已出版著作。**本次调研的证据不支持这一点**，详见第三章。简言之：

- 该书在 Addison-Wesley/InformIT 官方页面上标注 **"Published Dec 31, 2040"**、**"This product currently is not for sale."**
- Pearson 德国站把它标成 **"2040 / Auflage:1"**
- 该书唯一可考的公开形态是 **2011 年 XP 2011 大会上的一场 4 小时同名教程/工作坊**，以及 2011 年 3 月他 TypePad 博客上的一篇同名文章。

**[推断]** 因此，本份调研中「著作维度」的真实重心是：**一本书（WELC 2004）+ 一本半成品（AI Assisted Programming, Leanpub 连载中 30%）+ 一场未成书的长期讲座主题（Brutal Refactoring）+ 一个跨越 2007–2023 的博客体系**。若下游流程按「两本已出版著作」来提炼，会提炼到不存在的东西。

### 1.3 著作清单（可复核）

| 书名 | 年份 | 出版社 | 状态 | 来源 |
|---|---|---|---|---|
| Working Effectively with Legacy Code | 2004（2004-09-22 出版，版权页 2005） | Prentice Hall / Pearson，属 Robert C. Martin Series | 已出版，464 页，ISBN-13 978-0-13-117705-5 | [InformIT 书页](https://www.informit.com/store/working-effectively-with-legacy-code-9780131177055) **[一手]** |
| Brutal Refactoring: More Working Effectively with Legacy Code | 标注 2040-12-31 | Addison-Wesley Professional | **未出版 / 不销售** | [InformIT 书页](https://www.informit.com/store/brutal-refactoring-more-working-effectively-with-legacy-9780321793201) **[一手]** |
| AI Assisted Programming | 2024 起连载，最后更新 2025-05-26，完成度 30% | Leanpub（自出版） | 连载中，73 页，最低 $19 | [leanpub.com/ai-assisted-programming](https://leanpub.com/ai-assisted-programming) **[一手]** |

---

## 二、《Working Effectively with Legacy Code》(2004)

### 2.1 书的骨架（章节地图）

**官方出版信息（一手）**
> Copyright 2005 · Dimensions: 7" x 9-1/4" · Pages: 464 · Edition: 1st · ISBN-10: 0-13-117705-2 · ISBN-13: 978-0-13-117705-5
> —— [InformIT 书页](https://www.informit.com/store/working-effectively-with-legacy-code-9780131177055) **[一手]**

**全书三部分结构 + 25 章。** 以下章节名以三处独立来源交叉核对：① 书评人（2007 年逐章列举 Part II/III）② 个人读书笔记站（完整章名）③ Pearson 官方目录 PDF 的检索摘要。

- **Part I: The Mechanics of Change（第 1–5 章）**
  1. Changing Software
  2. Working with Feedback
  3. Sensing and Separation
  4. The Seam Model
  5. Tools
- **Part II: Changing Software（第 6–24 章）**——以「一句开发者哀叹」为章名
  6. I Don't Have Much Time and I Have to Change It
  7. It Takes Forever to Make a Change
  8. How Do I Add a Feature?
  9. I Can't Get This Class into a Test Harness
  10. I Can't Run This Method in a Test Harness
  11. I Need to Make a Change. What Methods Should I Test?
  12. I Need to Make Many Changes in One Area
  13. I Need to Make a Change, but I Don't Know What Tests to Write
  14. Dependencies on Libraries Are Killing Me
  15. My Application Is All API Calls
  16. I Don't Understand the Code Well Enough to Change It
  17. My Application Has No Structure
  18. My Test Code Is in the Way
  19. My Project Is Not Object Oriented. How Do I Make Safe Changes?
  20. This Class Is Too Big and I Don't Want It to Get Any Bigger
  21. I'm Changing the Same Code All Over the Place
  22. I Need to Change a Monster Method and I Can't Write Tests for It
  23. How Do I Know That I'm Not Breaking Anything?
  24. We Feel Overwhelmed. It Isn't Going to Get Any Better
- **Part III: Dependency-Breaking Techniques（第 25 章）**
  25. Dependency-Breaking Techniques——**整部分只有一章**，是一本 24 条技法的目录式手册。

来源：
- [paulbatchelor.github.io/brain/WEWLC](https://paulbatchelor.github.io/brain/WEWLC) **[二手]**（完整章名，含 Part 划分）
- [legalizeadulthood.wordpress.com 书评](https://legalizeadulthood.wordpress.com/2007/04/11/working-effectively-with-legacy-code-by-michael-c-feathers/) **[二手]**（Part II 与 Part III 逐项列举）
- [pearson.de 官方目录 PDF（检索摘要可见）](https://pearson.de/media/muster/toc/toc_9780132931748.pdf) **[一手]**（PDF 本体 web_fetch 不支持 `application/pdf`，仅取得检索摘要片段，如 "4: The Seam Model / A Huge Sheet of Text / Seams / Seam Types / Chapter 5: Tools"）

**[推断]** Part I 讲「为什么」，Part II 讲「遇到这类问题翻哪几页」，Part III 讲「具体用哪把螺丝刀」。这是**问题索引型工具书**结构，不是论证型专著——这解释了它为什么 20 年不过时（下节引证）。

#### 2.1.1 与任务书假设的三处出入

| 任务书假设 | 实际情况 | 证据 |
|---|---|---|
| Chapter 13 = characterization test（特征测试） | ✅ 成立。Ch.13 标题即「I Need to Make a Change, but I Don't Know What Tests to Write」，写不出测试时用特征测试 | 章名来源同上；内容见 Ch.13 相关描述 [二手] |
| Chapter 25 = 依赖破除技术（dependency breaking techniques） | ✅ 成立，且 **Part III 只有这一章** | [paulbatchelor](https://paulbatchelor.github.io/brain/WEWLC) **[二手]** |
| Chapter 4 = seam 接缝模型 | ✅ 成立，且**该书第 4 章有官方免费样章**（InformIT 以三页 article 形式全文放出） | [InformIT article 359417](https://www.informit.com/articles/article.aspx?p=359417) **[一手]** |

### 2.2 核心定义与论点（含原文引文）

#### 2.2.1 legacy code 的定义

**最广为人知的版本（预印本/前言）：**
> "**Code without tests is bad code.** It doesn't matter how well written it is; it doesn't matter how pretty or object-oriented or well encapsulated it is."
> "With tests, we can change the behavior of our code quickly and verifiably. Without them, we really don't know if our code is getting better or worse."
> —— 转引，[jeremiahflaga.github.io](https://jeremiahflaga.github.io/2019/08/06/what-michael-feathers-said-about-welc-7-years-later) **[一手引文，二手载体]**

**短句版：**
> "To me, legacy code is simply code without tests."
> —— 转引，[understandlegacycode.com](https://understandlegacycode.com/blog/what-is-legacy-code-is-it-code-without-tests/) **[一手引文，二手载体]**

**他 2024 年自己复述这个定义的来历（一手访谈原话）：**
> "I've got many definitions, but the one I'm kind of known for is basically that legacy code is code without tests. And it's funny about this because this happened when I was working with a team and I had another consultant with me. And I got frustrated at one moment and somebody asked a question. I said, legacy code is code without tests. That's just what you need to know."
> —— Tech Lead Journal #195 转录 **[一手]** [techleadjournal.dev/episodes/195](https://techleadjournal.dev/episodes/195/)

**[推断]** 这句话是**现场情绪发言被同伴要求「你得把这句话写出去」**才成为定义的——不是精心推演出的理论命题。这一点对理解他后来「往回退」很关键。

#### 2.2.2 单位测试的判定标准（不是「快」就够）

> "Here are the qualities of good unit tests:
> 1. They run fast. A unit test that takes 1/10th of a second to run is a slow unit test.
> 2. They help us localize problems."
> —— 转引，[legalizeadulthood 书评](https://legalizeadulthood.wordpress.com/2007/04/11/working-effectively-with-legacy-code-by-michael-c-feathers/) **[一手引文，二手载体]**

二手方把它归纳成「**不是** unit test 的两条」：跑得不快（< 100ms/test）；跟基础设施打交道（数据库、网络、文件系统、环境变量）。
> —— [understandlegacycode.com](https://understandlegacycode.com/blog/key-points-of-working-effectively-with-legacy-code/) **[二手]**

#### 2.2.3 sensing 与 separation（第 3 章）

> "1. **Sensing**—We break dependencies to *sense* when we can't access values our code computes.
> 2. **Separation**—We break dependencies to *separate* when we can't even get a piece of code into a test harness to run."
> —— 转引，[legalizeadulthood 书评](https://legalizeadulthood.wordpress.com/2007/04/11/working-effectively-with-legacy-code-by-michael-c-feathers/) **[一手引文，二手载体]**

#### 2.2.4 为什么必须改：四个改动理由与风险三问（第 1 章原文）

InformIT 放出了第 1 章的官方全文（Sample Chapter）。核心结构：

> "For simplicity's sake, let's look at four primary reasons to change software.
> 1. Adding a feature
> 2. Fixing a bug
> 3. Improving the design
> 4. Optimizing resource usage"

> "Behavior is the most important thing about software. It is what users depend on. Users like it when we add behavior (provided it is what they really wanted), but if we change or remove behavior they depend on (introduce bugs), they stop trusting us."

> "The act of improving design without changing its behavior is called *refactoring*."

> "To mitigate risk, we have to ask three questions:
> 1. What changes do we have to make?
> 2. How will we know that we've done them correctly?
> 3. How will we know that we haven't broken anything?"

> "It's tempting to think that we can minimize software problems by avoiding them, but, unfortunately, it always catches up with us. When we avoid creating new classes and methods, the existing ones grow larger and harder to understand."

> "The difference between good systems and bad ones is that, in the good ones, you feel pretty calm after you've done that learning, and you are confident in the change you are about to make. In poorly structured code, the move from figuring things out to making changes feels like **jumping off a cliff to avoid a tiger**. You hesitate and hesitate."

> "The last consequence of avoiding change is fear. Unfortunately, many teams live with incredible fear of change and it gets worse every day."

—— 以上均出自 [InformIT article 359418 打印版](https://www.informit.com/articles/printerfriendly/359418) **[一手]**（原载 *Changing Software and Legacy Code*, Jan 14, 2005）

该章还有一张被反复引用的三×四对照表（structure / functionality / resource usage × 加功能/修 bug/重构/优化），以及「把新功能单列」后的第二张表。表的核心结论：**加功能、重构、优化三者都保持既有功能不变**。

#### 2.2.5 第 4 章《The Seam Model》原文（seam 概念的正典出处）

这是全书最关键的一章，InformIT 以三页 article 免费全文放出。

**开篇视角（"A Huge Sheet of Text"）：**
> "One of the things that nearly everyone notices when they try to write tests for existing code is just how poorly suited code is to testing. It isn't just particular programs or languages. In general, programming languages just don't seem to support testing very well."

> "A program can seem like a large sheet of text. Changing a little text can cause the meaning of the whole document to change, so people make those changes carefully to avoid mistakes."

**seam 的定义（原文方框）：**
> "## Seam
> A seam is a place where you can alter behavior in your program without editing in that place."

**enabling point 的定义（原文方框）：**
> "## Enabling Point
> Every seam has an enabling point, a place where you can make the decision to use one behavior or another."

**object seam 的命名时刻（原文原话）：**
> "This seam is what I call an *object seam*. We were able to change the method that is called without changing the method that calls it. *Object seams* are available in object-oriented languages, and they are only one of many different kinds of seams."

**为什么需要 seam（原文的动机陈述）：**
> "One of the biggest challenges in getting legacy code under test is breaking dependencies. When we are lucky, the dependencies that we have are small and localized; but in pathological cases, they are numerous and spread out throughout a code base. The seam view of software helps us see the opportunities that are already in the code base."

**seam 类型的划分原则（原文）：**
> "The types of seams available to us vary among programming languages. The best way to explore them is to look at all of the steps involved in turning the text of a program into running code on a machine. **Each identifiable step exposes different kinds of seams.**"

原文在该章明确展开了 **preprocessing seam（预处理接缝）** 与 **link seam（链接接缝）**，并给出完整代码示例：
- preprocessing seam 示例：C 语言用 `localdefs.h` + `#ifdef TESTING` + `#define db_update(...)` 替换数据库调用，enabling point 就是宏 `TESTING` 是否被定义。
- link seam 示例：Java 的 `FitFilter` 通过 classpath 替换 `fit.Parse` / `fit.Fixture`。
- **[存疑]** 该章第三页在 link seam 的 Java 例子处被 fetch 截断（"Alth…"），因此 **object seam / preprocessing seam / link seam 三者之外，同章是否还列出了第四类接缝名（例如编译期/反射类），本次未能从一手原文确认。** 二手源普遍把 seam 类型概括为「按构建管线各阶段区分」，与原文方法一致。

来源：[InformIT article 359417 第 1 页](https://www.informit.com/articles/article.aspx?p=359417)、[第 2 页](https://www.informit.com/articles/article.aspx?p=359417&seqNum=2)、[第 3 页](https://www.informit.com/articles/article.aspx?p=359417&seqNum=3)、[打印版](https://www.informit.com/articles/printerfriendly/359417) **[一手]**

#### 2.2.6 第 25 章：24 条依赖破除技术（全清单）

书评人 2007 年逐条抄录，是本调研能找到的**最完整的技术清单**：

Adapt Parameter · Break Out Method Object · Definition Completion · Encapsulate Global References · Expose Static Method · Extract and Override Call · Extract and Override Factory Method · Extract and Override Getter · Extract Implementer · Extract Interface · Introduce Instance Delegator · Introduce Static Setter · Link Substitution · Parameterize Constructor · Parameterize Method · Primitivize Parameter · Pull Up Feature · Push Down Dependency · Replace Function with Function Pointer · Replace Global Reference with Getter · Subclass and Override Method · Supersede Instance Variable · Template Redefinition · Text Redefinition

> —— [legalizeadulthood 书评](https://legalizeadulthood.wordpress.com/2007/04/11/working-effectively-with-legacy-code-by-michael-c-feathers/) **[二手]**（明确说「按 Fowler《Refactoring》那种目录方式编目」）

一个 2025 年后出现的第三方 skill 文件给出**同一目录的 19 条子集 + 决策树**，与上表高度重合但缺 Definition Completion / Link Substitution / Replace Function with Function Pointer / Template Redefinition / Text Redefinition 等：
> —— [github.com/ryanthedev/code-foundations SKILL.md](https://raw.githubusercontent.com/ryanthedev/code-foundations/main/skills/welc-legacy-code/SKILL.md) **[二手]**

**[推断]** 两处清单不一致（24 vs 19）。差异项恰好全是 **C/C++ 专属技法**（Link Substitution、Template Redefinition、Text Redefinition 等），推测是后来的总结者按「现代 OO 语言可用」做了裁剪。**这不构成矛盾，但说明任何「WELC 技术清单」都要注明版本与语言假设。**

#### 2.2.7 Legacy Code Change Algorithm（五步法）

书中的操作算法，被多个二手源一致复述：

```
1. IDENTIFY change points（找出要改哪里）
2. FIND test points（找出能写测试的地方）
3. BREAK dependencies（破除依赖）
4. WRITE characterization tests（写特征测试）
5. MAKE changes and refactor（改动 + 重构）
```

来源：[github.com/ryanthedev/code-foundations](https://raw.githubusercontent.com/ryanthedev/code-foundations/main/skills/welc-legacy-code/SKILL.md) **[二手]**、[understandlegacycode.com](https://understandlegacycode.com/blog/key-points-of-working-effectively-with-legacy-code/) **[二手]**

**他 2024 年自己口述的版本（更口语，注意顺序不同）**：
> "The main thing is to go and figure out exactly where you need to make changes and you move outward from there. … And then what you do is basically you think about what would be involved in getting tests in place for each one of those places. And you kind of like crawl the tree upward and see if there's a common place for those changes. And you try to pragmatically figure out where you want to go and have your tests."
> —— Tech Lead Journal #195 **[一手]**

**[推断]** 口述版里「向上爬树找共同测试点」其实就是 pinch point 思想的自然语言版。

#### 2.2.8 书里被广泛引用的其他立场

**「不要直接调库」：**
> "Avoid littering direct calls to library classes in your code. You might think that you'll never change them, but that can become a self-fulfilling prophecy."
> —— 转引，[understandlegacycode.com](https://understandlegacycode.com/blog/key-points-of-working-effectively-with-legacy-code/) **[一手引文，二手载体]**

**「不要指望全库都有测试」：**
> "you're never going to go and have complete tests on a code base unless you started that way. And that it's okay to live in this limbo space, and you probably will for a long period of time, where you're going to have some areas of great coverage and other areas of not so good coverage. And it's just normal."
> —— Tech Lead Journal #195 **[一手]**

---

## 三、《Brutal Refactoring》：一个 15 年未落地的书名

### 3.1 出版社官方状态（一手，决定性证据）

**InformIT/Addison-Wesley 官方产品页原文：**
> "**Brutal Refactoring: More Working Effectively with Legacy Code**
> By Michael Feathers
> **Published Dec 31, 2040** by Addison-Wesley Professional.
> Book — **This product currently is not for sale.** Not for Sale
> Description — Copyright **2041**, Edition: 1st, ISBN-10: 0-321-79320-X, ISBN-13: 978-0-321-79320-1"
> —— [informit.com/store/brutal-refactoring-...-9780321793201](https://www.informit.com/store/brutal-refactoring-more-working-effectively-with-legacy-9780321793201) **[一手]**

**[推断]** `2040-12-31` / `Copyright 2041` 是 Pearson 系统对「**无确定出版日期、长期挂起**」条目的占位值（业界惯用的 far-future placeholder）。「currently is not for sale」+ 占位日期 = **未出版**。Pearson 德国站同书页标注 "2040 / Auflage:1"，与之一致。

**旁证（二手，但来自可靠观察者）：**
> "**Update, October 9, 2023: There is no upcoming book named Brutal Refactoring.**"
> —— [jeremiahflaga.github.io](https://jeremiahflaga.github.io/2019/08/06/what-michael-feathers-said-about-welc-7-years-later) **[二手]**

**该书公开可见的宣传文案（一手，因为挂在出版社/零售页上）：**
> "Most software professionals spend much of their time working with someone else's brutally imperfect code. When you consider the serious constraints that legacy code was created under, it's no surprise it looks so bad. The question is: now what? In **Brutal Refactoring**, Michael Feathers starts with code bases "as they are," not as "we pretend them to be" - and shows how to aggressively reshape them to make them maintainable and amenable to further development."
> "**Brutal Refactoring** takes the next steps beyond all previous refactoring books, including Feathers' own highly-praised *Working Effectively with Legacy Code*. Feathers shares new insights reflecting all he's learned in **the eleven years since that book**, and offers the first detailed practical advice on the unique nuances of system-wide refactoring."
> —— [InformIT 产品页](https://www.informit.com/store/brutal-refactoring-more-working-effectively-with-legacy-9780321793201) **[一手]**

注意文案里的「**the eleven years since that book**」：2004 + 11 = 2015，说明**这段文案写于约 2015 年前后并长期未更新**，这也解释了为什么书号是 2011 年就分配好的 `032179320X`。

### 3.2 官方公布的 17 章目录（一手，极重要）

InformIT 产品页 "Sample Content → Table of Contents" 完整列出：

| # | 章节 |
|---|---|
| 1 | Goal of Work in Legacy Code: Make the Intractable Understandable |
| 2 | Componentizing Software Factory and Repository Hubs |
| 3 | Sensing Variables and Vise |
| 4 | In Vitro Test Harnesses |
| 5 | Production Toggles for Aggressive Refactoring |
| 6 | Runtime Mining with Hypothesis Logging |
| 7 | The Strangler Pattern |
| 8 | Testing Fenestras |
| 9 | Types of Bad Methods |
| 10 | Decomposition of Heavily Conditional Code |
| 11 | Scratch Refactoring Techniques |
| 12 | Metric Profiles of Good and Bad Code Bases |
| 13 | Hotspot Detection and Management |
| 14 | Finding Patterns in Duplication |
| 15 | Domain Discovery |
| 16 | Managing the OO/Procedural Boundary |
| 17 | The Twist Method for Class Extraction |

同页 Coverage 要点还包括：Sensing variables / In vitro test harnesses and production toggles / Mining runtimes / Profiling good and bad code bases / Detecting and managing code hotspots / Performing domain discovery / Using the **Twist method** to extract classes。
> —— [InformIT 产品页](https://www.informit.com/store/brutal-refactoring-more-working-effectively-with-legacy-9780321793201) **[一手]**

**术语观察：**
- "Sensing variables" 与 WELC 第 3 章的 **sensing** 概念同源——他要把一个诊断概念升级成一套探查机制。
- "Testing **Fenestras**" —— *fenestra* 是拉丁语「窗」，解剖学里指开窗。**[推断]** 指在不可测系统上人为开出的观察窗口，与 seam 同族但更强硬。
- "**The Twist method**" —— 该术语在旧目录中未见，也与 2011 年工作坊笔记里的 "**Twisting Classes**" 对应（见 3.4），是他把 2011 年教学材料沉淀成章的结果。
- "Hotspot Detection" 与 "Metric Profiles" —— 对应他 2011 年做的代码仓库存档/变更率数据分析（见 3.4）。
- "The Strangler Pattern" 单列成章 —— 与他在 2024 年访谈中「最爱平行替换」的表态呼应（见 5.3）。

### 3.3 与 WELC 的关系：官方定性

按官方文案，是「**takes the next steps beyond**」，并明确写入「reflecting all he's learned in the eleven years since that book」，且目标是「**system-wide refactoring**」——即从「单类/单方法可测化」升级到「系统级改造」。

### 3.4 该书唯一可考的实际内容来源：2011 年 XP 工作坊

因为书未出版，能确认的**实际主张**只能来自 2011 年 XP 2011 那场 4 小时教程。两位与会者的独立笔记（互不引用，但内容高度一致，构成本节的双源交叉验证）：

**Mark Needham 的笔记 [二手]** —— [markhneedham.com](https://www.markhneedham.com/blog/2011/05/11/xp-2011-michael-feathers-brutal-refactoring/)
- **Clean code vs Understandable code**：他把 clean code 定义为「simple and has no hidden surprises」，并说这是"quite a high bar"；understandable code 讲的是「理解一段代码需要花多少思考」，是"a more achievable goal"。
- 他直言：**「it would be very rare for us to take a code base and refactor the whole thing」**，以及**「we should get used to having our code bases in a state where not every part of it is perfect.」**
- **行为经济学解释坏代码**：写代码的激励机制是错的——「It's much easier/less time consuming for people to add code to an existing method or to an existing class rather than creating a new method or class」，主因不是编辑器操作麻烦，而是**「the difficulty in choosing a name」**。
- **代码的形状**：多数代码库服从幂律——大部分文件几乎不改，极少数文件被反复改。用 churn × complexity 双轴图定位，**重构火力应集中在「改得频繁且复杂」的代码上**。
- **Rapid scratch refactoring**：他会**在记事本（notepad）而不是 IDE 里做**——理由是「the IDE's compile warnings were distracting from the goal of the exercise which is to understand how we could improve the code」。
- **架构规则**：接手团队时先让人讲系统怎么工作，讲的过程本身就会暴露简化点；进而定下譬如「receivers will never talk to repositories」这类可执行规则。
- **硬边界周围最脏**：某上游团队用 Java `final` 锁死服务方法，下游团队干脆包了一层新类绕过——**用语言强制的边界，人会绕过去，而且边界周围的代码往往最乱。**

**Patrick Kua 的笔记 [二手]** —— [thekua.com](https://thekua.com/atwork/2011/05/notes-from-michael-feathers-brutal-refactoring/)
- 同一场 4 小时工作坊。原话引述：「**We should't be surprised by very large methods. incentives are set up wrongly. Though not sure what we can do about it.**」，以及「**It's the result of the system between us and the code.**」——注意这里他**明确把大方法归因于系统性因素，而非「烂程序员」**。
- 「**Code has a particular shape**」。
- **Feature Clustering**：把功能列出来找共性（共同参数、数据团块 Data Clumps、信息局部性/封装）。
- **Rapid Scratch Refactoring**：Kua 记录他**「a bit of regret not focusing more of it in his book」**——即他亲口承认 WELC 里这块写少了。
- **Twisting Classes**：**按用途（use）而非按增量来拆类**；步骤是「创建一个新角色（接口或超类），让消费者依赖新角色而不是原类」；他推荐「a very rigorous command query separation」。
- 推文式要点：「Branches often biggest impediment to refactoring in large orgs.」「Narrowing scopes: often we gain leverage by moving temporary variables closer to their points of first use」

**[推断]** 2011 年这场工作坊的骨架——**understandable > clean、重构火力对准热点、scratch refactoring 要在脑内/纯文本里做、按用途扭类、系统性问题归因**——与 17 章目录里的 Ch.9/11/12/13/17 高度吻合。**因此对「Brutal Refactoring 的核心主张」这个问题，本次调研能给的最诚实答案是：17 章目录 + 2011 工作坊笔记，而不是一本书的内容摘要。**

### 3.5 「brutal」到底指什么

- **官方文案口径 [一手]**：「**aggressively** reshape」「Production Toggles for **Aggressive** Refactoring」「Feathers' **aggressive** refactoring techniques」。
- **第三方聚合站口径 [二手，可信度低]**：Forage 的 AI 摘要把 "brutal" 解释为「making decisive, sometimes dramatic changes to code structure, rather than incremental improvements that may preserve problematic patterns」——**这句是对书名的解读，不是 Feathers 原话**，且同一页面还错误宣称「Michael Feathers coined the term 'legacy code'」（他没造这个词，见第八章）。**该站不可作为证据，仅作「坊间如何理解 brutal」的样本。**

### 3.6 一句话总结本章

**「Brutal Refactoring」是一个 2011 年诞生、被 Pearson 分配了 ISBN、写了目录、但到 2023 年仍未出版、出版社页面被迫标 2040 年的书名。它承载的是他「WELC 太保守」的自我修正意图（见第八章矛盾 1），但从未以书的形式交付。**

---

## 四、自创术语词典（含原文定义 + URL）

分级说明：**A=一手原文有明确定义**；**B=他一手使用但定义分散**；**C=他人转述/总结**；**D=流传但未证实为他所造**。

| 术语 | 原文/权威定义 | 首次或关键出处 | 级别 |
|---|---|---|---|
| **seam**（接缝） | "A seam is a place where you can alter behavior in your program without editing in that place." | WELC Ch.4，[InformIT 359417](https://www.informit.com/articles/article.aspx?p=359417&seqNum=2) | A |
| **enabling point**（使能点） | "Every seam has an enabling point, a place where you can make the decision to use one behavior or another." | 同上 | A |
| **object seam**（对象接缝） | "We were able to change the method that is called without changing the method that calls it." 他原话："This seam is what I call an *object seam*." | 同上 | A |
| **preprocessing seam**（预处理接缝） | 借 C/C++ 预处理器在编译前替换文本；enabling point = 宏 `TESTING` | 同上（含 `localdefs.h` 完整示例） | A |
| **link seam**（链接接缝） | 借 linker/classpath 在链接期替换实现；Java 例：`FitFilter` 换掉 `fit.Parse`/`fit.Fixture` | 同上 | A |
| **characterization test**（特征测试） | "A characterization test is a test that characterizes the actual behavior of a piece of code."（二手载体转述）；他本人在 2016 长文中给了完整方法论 | WELC Ch.13；[silvrback: Characterization Testing](https://michaelfeathers.silvrback.com/characterization-testing) | A |
| **sensing / separation** | "Sensing—We break dependencies to *sense* when we can't access values our code computes." / "Separation—…when we can't even get a piece of code into a test harness to run." | WELC Ch.3 | A（引文经二手载体） |
| **sprout method** | 在别处新建方法并单独测试，再从旧代码里调用它（insertion point 插入点） | WELC Ch.6 | A（定义经二手载体） |
| **sprout class** | 同思路做成新类 | WELC Ch.6 | A（同上） |
| **wrap method** | 把旧方法改名，用原名新建方法，调用旧方法，在前后加新逻辑 | WELC Ch.6 | A（同上） |
| **wrap class** | 装饰者：加一层包住旧类 | WELC Ch.6 | C（[github skill 文件](https://raw.githubusercontent.com/ryanthedev/code-foundations/main/skills/welc-legacy-code/SKILL.md) 明列，书中章节同页声称有 Wrap Class p.94） |
| **effect sketch**（效果草图） | 从每个改动点向外追效果：返回值、被改参数、被改字段、全局/静态数据 | WELC Ch.16/20 附近 | C（[github skill 文件](https://raw.githubusercontent.com/ryanthedev/code-foundations/main/skills/welc-legacy-code/SKILL.md)；**本次未取得书中原文**） |
| **pinch point**（收束点） | 多个改动点的效果汇聚之处，先在那里写测试；这类测试是**脚手架**，有了正规单测就删掉 | 同上 | C（同上，**未取得书中原文**） |
| **scratch refactoring**（草稿重构） | 只为熟悉代码而重构，**唯一规则是做完回退**；因为要回退，所以可以放心做不安全改动 | WELC Ch.16；他 2011 工作坊亲口承认「书里写少了」 | A/B |
| **legacy code == code without tests** | "To me, legacy code is simply code without tests." | WELC 前言/Ch.1 | A |
| **Legacy Code Change Algorithm** | 五步：identify change points → find test points → break dependencies → write characterization tests → make changes/refactor | WELC Ch.2 附近（"The Legacy Code Change Algorithm"，页码 41） | A/C |
| **dependency-breaking techniques** | 24 条编目技法，Part III 全部内容（Ch.25） | WELC Ch.25 | A/C |
| **Sensing variables** / **Vise** | Brutal Refactoring 目录 Ch.3 | [InformIT BR 页](https://www.informit.com/store/brutal-refactoring-more-working-effectively-with-legacy-9780321793201) | A（仅目录级） |
| **In Vitro Test Harnesses** | 同上 Ch.4 | 同上 | A（仅目录级） |
| **Testing Fenestras** | 同上 Ch.8 | 同上 | A（仅目录级） |
| **The Twist method**（扭类法） | 同上 Ch.17；2011 工作坊叫 **Twisting Classes**：按用途拆类，先立新角色（接口/超类）再让消费者改依赖 | 同上 + [thekua.com](https://thekua.com/atwork/2011/05/notes-from-michael-feathers-brutal-refactoring/) | A/B |
| **Prompt-Hoisting**（提示上提） | 把 prompt 当测试用：prompt 既是生成输入，又是输出校验器，从而消掉一次人工 review | [silvrback 2023-07-11](https://michaelfeathers.silvrback.com/prompt-hoisting-for-gpt-based-code-generation) | A |
| **Negative Architecture**（负向架构） | "These guarantees form a *negative architecture* - a set of things that you know can't happen in various pieces of your system." | [silvrback 2018-01-02](https://michaelfeathers.silvrback.com/negative-architecture) | A |
| **Orange Code**（橙子代码/表面积比喻） | 用表面积/体积比（surface area to volume）看可测性：方法数越多、平均方法越短，相对表面积越大，不可仪器化的复杂度越无处藏身 | [silvrback 2018-08-28](https://michaelfeathers.silvrback.com/orange-code) | A |
| **Honest code**（诚实的代码） | "Programming without side effects is really about making signatures honest in that way. If you want to know whether IO is possible, look at the signature. It should tell you." | [silvrback 2020-06-11](https://michaelfeathers.silvrback.com/functional-code-is-honest-code) | A |
| **Gateway Teams**（门户团队） | 新人第一段工作经历放在做得好的团队，用「最早的经历最有决定性」来塑造组织实践 | [silvrback 2021-08-23](https://michaelfeathers.silvrback.com/gateway-teams) | A |
| **"the maid service"** | — | — | **未找到** |
| **"cover and modify" / "edit and pray"** | — | — | **未找到（详见 4.1）** |
| **Legacy Code Retreat** | — | — | **D：见 4.2，很可能不是他的东西** |

### 4.1 关于「cover and modify」vs「edit and pray」

**本次调研未能在一手来源中定位到这两个短语。** 具体查证过程与结果：

- 多引擎定向检索（keenable / deepseek-official / anysearch / bing）返回的命中里，唯一把两者并列的是 [senior-stack.uz 的「Interview Q&A Bank」](https://senior-stack.uz/Roadmap/Programming/code-craft/working-with-legacy-code/01-what-is-legacy-code/junior)，其栏目名包含 "Q3 — Edit and pray vs. cover and modify"——但该站整体是自动生成的学习库/题库形态，**不可作为一级证据**。
- 在真正读到的一手文本中，出现的是**另一个近义短语**：「Without the unit tests, refactoring is just "**code and pray**" style programming」——出自 2007 年书评人对 WELC 立场的转述（[legalizeadulthood](https://legalizeadulthood.wordpress.com/2007/04/11/working-effectively-with-legacy-code-by-michael-c-feathers/)）**[一手引文，二手载体]**。
- Archive.org 上的全书 OCR 文本页存在（[archive.org/stream/working-effectively-with-legacy-code](https://archive.org/stream/working-effectively-with-legacy-code/Working.Effectively.with.Legacy.Code_djvu.txt)），但**本会话的网络出口无法抓取该文本**（archive.org 主站与 ia*.us.archive.org 均返回 400；web_fetch 抓取该 URL 报 fetch failed）。因此**无法对全书做全文取证**。

**结论（写给下游）**：「cover and modify / edit and pray」这两个词在社区语境里几乎必然与 WELC 绑定，但**本次调研只能确认「类似说法在书评转述中存在（code and pray），不能确认 Feathers 本人是否用过 cover and modify / edit and pray 这两个确切措辞**。标 **[存疑]**，需后续以纸书或可访问的电子全文核对。

### 4.2 关于「Legacy Code Retreat」

- 检索能确认的是：**Legacy Code Retreat（遗留代码静修营）是社区活动形式**，有专门的练习代码库（Trivia Game）、有 Open Hub 项目、有 Agile India 2017 的提案。
- 但**没有任何一手来源显示 Feathers 是本活动的发起人或命名者**。Agile India 的提案只提到「practice the classic **Michael Feathers dance** of Identify change points / Find an inflection point / Cover…」——即把他书中的五步法称为「那段经典舞步」，而非说他是 retreat 的作者。
- **Grenoble 2011 / 2012 / 2015 的多个 retreat 记录**（[github.com/caradojo/trivia](https://github.com/caradojo/trivia)、[functional.computer](https://functional.computer/blog/legacy-code-retreat-part-one-get-it-under-test)、[jvaneyck.wordpress.com](https://jvaneyck.wordpress.com/2015/07/27/legacy-code-retreat/)）均由他人主持（如 Erik Talboom 等）。

**[推断]** 「Legacy Code Retreat」应记为**以他的 WELC 方法为内核的社区活动形式**，不是他的创作。任务书把它列在「自创术语」下，属归属偏差。

### 4.3 关于「the maid service」

多轮定向检索（含精确短语组合）**均未返回任何相关结果**，只得到家政公司、羽毛工艺品、Met Gala 服装等噪声。**判定：未找到。** 既未找到他使用过该说法，也未找到他人说这是他造的说法。建议下游不要采用该术语，除非另有一手来源。

---

## 五、反复出现 ≥3 次的核心论点（真信念）

判定方法：只收录在**至少 3 个互相独立的场合**（不同年份、不同载体）出现的立场。

### 5.1 「legacy code 的判据是测试的有无，而不是年龄或作者」

出现场合：
1. WELC 前言（2004）："Code without tests is bad code."
2. 2020 年书评站转引的短句："To me, legacy code is simply code without tests."
3. 2024 年 Tech Lead Journal #195：完整复述这句定义的来历，并说 "if you have code and it has lots of tests and it's relatively easy to change; if you don't have the tests, you're really in serious trouble."

**但请同时读第八章矛盾 1**——这个立场他自己在 2011 年就公开松动过。**出现次数多 ≠ 未被修正。**

### 5.2 「改变坏代码之前，先让系统变得可理解」

出现场合：
1. WELC Ch.1："Understanding is the key thing that we need to make changes safely."
2. 2011 XP 工作坊：提出 **understandable code** 优先于 **clean code**，因为 clean code 标准太高。
3. 2016 长文《Characterization Testing》："I think that the most confusing thing about testing is the word *testing*. … Instead of trying to figure out whether code is correct or not, we can try to characterize its behavior to understand what it actually does."
4. 2020 长文《Functional Code is Honest Code》："The biggest issue in legacy code (all code really) is understandability. It's hard to change things that you don't understand — you can try, but you'll often fail."
5. 2024 访谈："legacy code is code we don't understand"（他主动提出的**第二个定义**）。
6. Brutal Refactoring 目录 Ch.1 标题："Goal of Work in Legacy Code: **Make the Intractable Understandable**"

**[推断]** 这是比「code without tests」更稳固的真信念——**测试是手段，可理解性才是目的**。他 20 年里每次重述都在往「可理解性」方向漂移。

### 5.3 「重构、优化、加功能，本质都是保持大部分行为不变、只改一小块」

出现场合：
1. WELC Ch.1 的两张对照表（structure / functionality / resource usage）。
2. WELC Ch.1 原话："Adding features, refactoring, and optimizing all hold existing functionality invariant."
3. WELC Ch.1 风险三问（三问的第 3 问就是「怎么知道没弄坏别的」）。
4. 2024 访谈论 rewrite："you don't have to rewrite an entire system most of the time… **Doing spot rewrites of a particular thing is really pretty powerful.** And quite often for people, it's like an all-or-nothing proposition, and that's really a horrible position to approach these things from."

### 5.4 「重构 ≠ 重写；反对全有全无的重写决策」

出现场合：
1. WELC Ch.1："Refactoring differs from general cleanup in that we aren't just doing low-risk things such as reformatting source code, or invasive and risky things such as **rewriting chunks of it**."
2. 2011 工作坊："it would be very rare for us to take a code base and refactor the whole thing"；"we should get used to having our code bases in a state where not every part of it is perfect."
3. 2024 访谈：「你不需要重写整个系统」「spot rewrites 很强」「all-or-nothing 是很糟的处境」「重写的前提是有测试；没测试就变成两个问题」。
4. Brutal Refactoring 目录 Ch.7 单列 "The Strangler Pattern"——用平行替换而不是重写。
5. 2024 访谈讲 strangler fig：他更愿意叫它**平行替换**（"parallel replacement is a term that people use in other engineering disciplines"），并拿佛州七英里桥新旧并行、再拆旧桥作比喻。

### 5.5 「大方法/坏结构是系统性激励的产物，不是个人素质问题」

出现场合：
1. 2011 工作坊（双源）："We shouldn't be surprised by very large methods. incentives are set up wrongly."；"It's the result of the system between us and the code."；主因是**给方法/类起名字太难**。
2. WELC Ch.1："When we avoid creating new classes and methods, the existing ones grow larger and harder to understand."；"many teams live with incredible fear of change"。
3. 2021 长文《Gateway Teams》：实践改变失败是因为**周围工件与系统的「磁力」**（"it is almost like they have a magnetic pull"）；"What we believe is possible depends upon what we've experienced"。
4. 2024 访谈：「they're in pain, but they don't know they're in pain. And that's really a tragic situation to be.」

### 5.6 「重构火力应该对准改得最频繁的地方，而不是最丑的地方」

出现场合：
1. 2011 工作坊：churn × complexity 双轴图；多数代码库服从幂律；"we really need to focus our refactoring efforts on code which is changed frequently and is complex!"
2. 2024 访谈："where do we have the most bugs…? Turns out the answer is really the ones that you touch the most often."
3. Brutal Refactoring 目录 Ch.12 "Metric Profiles of Good and Bad Code Bases" + Ch.13 "Hotspot Detection and Management"。
4. 2024 访谈论微服务与重写："you concentrate on the things which basically are going to have growth in the future and also are presenting difficulty to you in the meantime."

### 5.7 「测试是让人对自己的理解落地的方式，不是正确性声明」

出现场合：
1. WELC Ch.13 / 2016 长文：特征测试「不是检查你希望系统有的行为，而是记录系统实际的行为」。
2. 2016 长文的核心命题："**When a system goes into production, in a way, it becomes its own specification.**"
3. 2024 访谈关于自动化测试："it's kind of like the system has its own idea about what it does. It's not an idea. It's what it does."
4. 2024 访谈："The test is a way of grounding our knowledge of a system."

### 5.8 关于「seam」的元立场（自我怀疑型信念）

- 2024 访谈里他亲口说：seam 那一章「**came very close [to] going and pulling it out**」，因为他以为那只是自己看软件的怪癖、对别人没用。
- 但 seam 后来成了他留给行业最持久的概念，Fowler 的 bliki 专门为它立词条。
**[推断]** 这是他「低估自己某个想法」的典型案例，对造人格时很有价值：**他对话语影响力的预判偏保守。**

---

## 六、长文/博客/文章（时间、URL、要点）

### 6.1 一手：他本人的博客体系

#### 6.1.1 Silvrback 主站（现役，michaelfeathers.silvrback.com）

站点有 Blog Home / Archive / Bio / RSS 四个入口。Archive 页按时间列出：

| 日期 | 标题 | 副标题 | URL |
|---|---|---|---|
| 2023-07-11 | Generate from Constraints | Using Prompt-Hoisting for GPT-based Code Generation | [链接](https://michaelfeathers.silvrback.com/prompt-hoisting-for-gpt-based-code-generation) |
| 2023-04-06 | (Possible) AI Impacts on Development Practice | The View from April 2023 | [链接](https://michaelfeathers.silvrback.com/possible-ai-impacts-on-development-practice) |
| 2021-08-23 | Gateway Teams | First experiences of your organization matter | [链接](https://michaelfeathers.silvrback.com/gateway-teams) |
| 2021-03-13 | System Personas and Design Integrity | — | [链接](https://michaelfeathers.silvrback.com/system-personas-and-design-integrity) |
| 2020-09-22 | Unit Conversations | Writing characterization tests interactively | [链接](https://michaelfeathers.silvrback.com/unit-conversations) |
| 2020-06-16 | Testing Warranties | Managing API use across an organization | [链接](https://michaelfeathers.silvrback.com/testing-warranties) |
| 2020-06-11 | Functional Code is Honest Code | — | [链接](https://michaelfeathers.silvrback.com/functional-code-is-honest-code) |
| 2019-12-03 | Scaling and the Friction of Dimension | — | [链接](https://michaelfeathers.silvrback.com/scaling-and-the-friction-of-dimension) |
| 2019-11-24 | The Simulation Argument and the Simulation Barrier | — | [链接](https://michaelfeathers.silvrback.com/the-simulation-argument-and-the-simulation-barrier) |
| 2019-09-11 | Socio-Technical Seeing | — | [链接](https://michaelfeathers.silvrback.com/socio-technical-seeing) |
| 2019-07-16 | Toward a Book of Form | — | [链接](https://michaelfeathers.silvrback.com/a-book-of-form) |
| 2019-06-20 | Groups Are About The Other | — | [链接](https://michaelfeathers.silvrback.com/groups-are-about-the-other) |
| 2019-02-28 | The Cognitive Tech of Technical Discussions | — | [链接](https://michaelfeathers.silvrback.com/the-cognitive-tech-of-technical-discussions) |
| 2018-12-06 | Testing Yourself | — | [链接](https://michaelfeathers.silvrback.com/testing-yourself) |
| 2018-08-28 | Orange Code | What humble citrus fruit can tell us about software | [链接](https://michaelfeathers.silvrback.com/orange-code) |
| 2018-07-28 | Does Software Understand Complexity? | — | [链接](https://michaelfeathers.silvrback.com/does-software-understand-complexity) |
| 2018-03-27 | The Loss of Locality | — | （Archive 页链接指向 `/the-death-of-locality`；**该 slug 实测 404**） |
| 2018-02-22 | Breaking and Mending Compatibility | — | [链接](https://michaelfeathers.silvrback.com/breaking-and-mending-compatibility) |
| 2018-01-02 | Negative Architecture | Guiding software by flipping figure and ground | [链接](https://michaelfeathers.silvrback.com/negative-architecture) |
| 2017-11-15 | 10 Papers Every Developer Should Read | (At Least Twice) | [链接](https://michaelfeathers.silvrback.com/10-papers-every-developer-should-read-at-least-twice) |
| 2016-08-08 | Characterization Testing | Writing tests to describe and fix existing code | [链接](https://michaelfeathers.silvrback.com/characterization-testing) |

来源：[michaelfeathers.silvrback.com/archive](https://michaelfeathers.silvrback.com/archive) **[一手]**

**逐篇要点（只写真正读到的全文）：**

**① Characterization Testing（2016-08-08）** —— [全文](https://michaelfeathers.silvrback.com/characterization-testing)
特征测试的**权威方法论原文**。核心操作：
> "I'm going to write a test and give it the name 'x.' I'm calling it 'x' because I don't know what the formatText function is going to do. I won't even put in a real expected value either because, at this point, we don't know what the behavior will be."

跑测试 → 失败信息告诉你真实输出 → 把真实值填回去 → 给测试改个好名字。他称这是「**Start with a test named 'x'**」。
核心命题：
> "*When a system goes into production, in a way, it becomes its own specification. We need to know when we are changing existing behavior regardless of whether we think it's right or not.*"

还讲了那个著名的开场事故：「Once, when I first started programming, I was asked to fix a bug. After I had, users complained. It turned out that they depended upon the behavior I'd removed. They didn't think it was a bug, they thought it was a feature.」
并明确特征测试**与「测试=正确性」的分野**：「The purpose of characterization testing is to document your system's actual behavior, not check for the behavior you wish your system had.」

**② Negative Architecture（2018-01-02）** —— [全文](https://michaelfeathers.silvrback.com/negative-architecture)
用格式塔心理学的**figure/ground**（图形/背景）翻转来表达：一个模块「做了什么」是 figure，「**确定不会做什么**」是 ground。
> "These guarantees form a *negative architecture* - a set of things that you know can't happen in various pieces of your system."
拿 Haskell 的 IO Monad 作正例：在纯的那一侧，你有「不会做 IO」的保证，那个保证本身就有用。

**③ Orange Code（2018-08-28）** —— [全文](https://michaelfeathers.silvrback.com/orange-code)
用**橙子 vs 苹果**讲「表面积/体积比」：橙子有瓣、有白色筋膜（fascia），苹果是一坨无差别质量。
> "Refactoring that breaks code down into smaller pieces increases the surface area of the system relative to its volume."
> "When your ratio of surface area to volume is high you have more interfaces for testing. Less relative volume means that there are fewer places where non-instrumentable complexity can hide."
并给出可算的代理指标：函数的「表面积」由语言固定（1 或 2 行），「体积」是所有方法体行数之和 → **体积/表面积 ≈ 平均方法长度**。
收尾金句："Look at some code and imagine saying 'that code needs to be more like an orange.'"

**④ Functional Code is Honest Code（2020-06-11）** —— [全文](https://michaelfeathers.silvrback.com/functional-code-is-honest-code)
把函数式编程重新定义为**「让签名诚实」**：
> "The biggest issue in legacy code (all code really) is understandability."
> "Programming without side effects is really about making signatures honest in that way. If you want to know whether IO is possible, look at the signature. It should tell you."
**关键自嘲与自我修正（对第八章很重要）：**
> "Sometimes I joke that **if I were to rewrite *Working Effectively with Legacy Code* I'd call it *Working Effectively with Object-Oriented Code*.** So many of the techniques around gaining testability involve parameterizing classes and methods so that *all* of the inputs and outputs are explicit and mockable under test."

**⑤ Unit Conversations（2020-09-22）** —— [全文](https://michaelfeathers.silvrback.com/unit-conversations)
把单元测试看作「**给没有 REPL 的语言造一个 REPL**」。他写了个 Ruby 原型 **C11R**（Characterizer 的 numeronym），交互式地把「问代码 → 得到答案 → 满意就 push 成测试」流程化，命令有 `ask` / `push` / `fix` / `fix add` / `fix new`。并说惊讶于没人把它做成 IDE 插件。

**⑥ Gateway Teams（2021-08-23）** —— [全文](https://michaelfeathers.silvrback.com/gateway-teams)
组织实践变革论：最早的经历最有决定性，所以**让新人从「做得好的团队」入门**，把好团队做成组织门户。
> "When we are surrounded by artifacts and systems that represent an earlier way of doing things, it is almost like they have a magnetic pull."
> "What we believe is possible depends upon what we've experienced…"
警示：从门户团队出来的人若分到差产品会失落——「Support them and help them make it all better.」

**⑦ Generate from Constraints / Prompt-Hoisting（2023-07-11）** —— [全文](https://michaelfeathers.silvrback.com/prompt-hoisting-for-gpt-based-code-generation)
**生成式 AI 时代的核心方法论长文。** 反对「用 AI 写单元测试」这一流行建议：
> "Asking an AI-based tool to write tests of correctness for our code seems like a good idea, but how do we know whether those tests check the behavior we intended? The situation is worse when we are using AI to generate the code that it is testing."
提出 **prompt-hoisting**：把 prompt 写成可执行的测试，于是 prompt 同时是**生成输入**和**输出校验器**，把流程从「两轮 review」压到「一轮 review（只管风格与设计，不管正确性）」。
> "When we use one indeterminacy to check another we could be compounding any errors we miss in review."
> "Generative AI leads us to a 'generate and check' paradigm."
现实限制也写了：工具常常「给的比要的多」；「If a tool 'misses' too often… development becomes more like debugging — far more exhausting than just writing the code.」

**⑧ (Possible) AI Impacts on Development Practice（2023-04-06）** —— [全文](https://michaelfeathers.silvrback.com/possible-ai-impacts-on-development-practice)
分 Source Code / Modularity / Closing Thoughts 三节。可抓的一手新术语：
- **"escape hatch" problem**（逃生舱问题）：生成器总有做不到的事，于是要留「洞」。
- **"parametric control"**（他自定）："a system behavior is parametrically controllable to the degree that it can be changed concisely and deterministically with specificity."
- 第三条组合方式：**用 AI 读一个大模块，只保留需要的子集重写**——"This is like an **automated private fork**."
- 引用智识来源：Baldwin & Clark《Design Rules: The Power of Modularity》，以及 Conway's Law。
- 自嘲式落款："No AI were harmed in the writing of this article."

**⑨ 10 Papers Every Developer Should Read (At Least Twice)（2017-11-15，2009 年旧文的 repost）** —— [全文](https://michaelfeathers.silvrback.com/10-papers-every-developer-should-read-at-least-twice)
**智识谱系的最强一手证据**，见第七章。

#### 6.1.2 TypePad 时代旧博客（2007–2016，已失效）

- 域 `michaelfeathers.typepad.com/michael_feathers_blog/` 现已被 Networksolutions 停放页接管（fetch 时发生跨域重定向到 networksolutions.com）。
- 2011 年那篇《Brutal Refactoring》原文**本会话未能直接抓取**（原站已死；web.archive.org 与 archive.ph 均因 DNS/网络策略不可达）。
- 但其**关键段落被第三方逐字转引**：
  > "These days, I'm much more aggressive in my approach to old code. WELC was fully ingrained in that "if we don't have tests, we can't do much" attitude. **I think that part of that was a sign of the times, and part of it was a reflection of my natural fear as a consultant.** You walk in and you don't know anything about the code base so you can't even come close to accurately assessing risk. Nicely, though, people who are embedded in teams often can, and I've learned a lot from people who've tried things out long term in their code and have lived to tell the tale."
  > —— 转引，[jeremiahflaga.github.io](https://jeremiahflaga.github.io/2019/08/06/what-michael-feathers-said-about-welc-7-years-later) **[一手引文，二手载体]**
- **[推断]** TypePad 时代的博文（含 2007–2016 大量 WELC 后续思考）**目前只存在于 Wayback Machine 与零星转引中**。若下游需要这段历史，需要一台能访问 web.archive.org 的机器。

#### 6.1.3 Substack

- 2024 年的 Leanpub 播客页与 Tech Lead Journal 嘉宾页**都指向** `michaelfeathers.substack.com` / `substack.com/@michaelfeathers`。
- **本次调研无法抓取**：`michaelfeathers.substack.com` 在本会话中 DNS 解析到非公网 IP（被工具拒绝），多次尝试均失败。
- **[存疑]** 无法确认该 Substack 是否仍在更新，或是否只是 2023–2024 年间的阶段性渠道。**未找到**可读内容。

#### 6.1.4 InformIT / Pearson 官方放出的样章（两篇，一手原文）

这是本次调研**质量最高的一手来源**——出版社官方免费放出的原书章节：

| 文章 | 日期 | 内容 | URL |
|---|---|---|---|
| Changing Software and Legacy Code | 2005-01-14 | 第 1 章全文：四个改动理由、三张对照表、风险三问、恐惧论 | [printerfriendly/359418](https://www.informit.com/articles/printerfriendly/359418) |
| Testing Effectively With Legacy Code | 2005-01-21 | 第 4 章全文（3 页）：A Huge Sheet of Text / Seams / Seam Types | [article 359417](https://www.informit.com/articles/article.aspx?p=359417) |

**[推断]** 下游若要引用 WELC 原文，**优先用这两个 URL**，因为它们是出版社自己放出的、可点、可复核的原文，而不是二手转述。

### 6.2 一手：AI Assisted Programming（2024，Leanpub 连载中）

- 状态：**30% 完成，最后更新 2025-05-26，73 页**，最低 $19 / 建议 $29，DRM-free。
- 作者页链接：Twitter @mfeathers、LinkedIn michaelfeathers。
- **完整目录（一手）**：
  - Introduction
  - Understanding Assistants Through Their Behavior：Surfacing / Attention / Dissipation / Pattern Preference
  - Concepts：Eagerness / Batch Mentality / Clamping / Roughouts / Ownership
  - Techniques（28 条）：Make Projections / Use **Waywords** / Notice Names / Generate From Tests / Test-Driven Development / Ask For N / **Pidgin Specification** / Step Check / Understand the Generated / Generate Reference Model / **Go Rogue** / Reduce Step Size / Ask What's Unnecessary / Ask For Reflection / Vary Resolution / Generate And Deploy / Stabilize Iteratively / Completion Check / Solve Then Ask / Ask For Review / Let It Drive / Ask For Summary Prompt / Generate Tests / Ask For Standards Check / Ask Again / Approach Obliquely / Interrupt Flow
  - Resources
- 来源：[leanpub.com/ai-assisted-programming](https://leanpub.com/ai-assisted-programming) **[一手]**

**旁证（2024 年访谈 [一手]）**：他在 Tech Lead Journal 里明确说这本书正在写，并讨论了 **Waywords**（"Waywords" 出现在节目提纲 [00:47:14]）、**SudoLang**（[00:40:59]）、**Context Window**（[00:45:19]）、**Managing AI Sessions**（[00:48:53]）等话题。节目提纲还列了 **"AI Churning More Legacy Code" [00:30:06]** 和 **"Best Use Case for AI" [00:37:29]** 两节——**[推断]** 即他关心的核心问题：**AI 会不会生产出更多遗留代码**。

**[推断]** 从目录的语言风格看（Waywords、Pidgin Specification、Go Rogue、Roughouts），他造概念的习惯从「软件结构」平移到了「人机协作行为」。**这是他 2023 年之后的主要注意力所在，也是「著作维度」里唯一还在生长的东西。**

### 6.3 二手但高价值的系统性长文

| 标题 | 作者/站点 | 日期 | 价值 |
|---|---|---|---|
| The key points of Working Effectively with Legacy Code | Nicolas Carlo, understandlegacycode.com | — | WELC 最结构化的全书要点提炼：五步法、seam、特征测试、sprout/wrap、scratch refactoring、库依赖警告。[链接](https://understandlegacycode.com/blog/key-points-of-working-effectively-with-legacy-code/) |
| What is Legacy Code? Is it code without tests? | 同上 | — | 对 Feathers 定义的**明确不服从**：提出「Legacy Code is valuable code that you're afraid to change」。是外部批评的代表样本。[链接](https://understandlegacycode.com/blog/what-is-legacy-code-is-it-code-without-tests/) |
| XP 2011: Michael Feathers - Brutal Refactoring | Mark Needham | 2011-05-11 | 2011 工作坊笔记（A 源）。[链接](https://www.markhneedham.com/blog/2011/05/11/xp-2011-michael-feathers-brutal-refactoring/) |
| Notes from Michael Feathers' Brutal Refactoring | Patrick Kua | 2011-05-11 | 2011 工作坊笔记（B 源，独立于 A）。[链接](https://thekua.com/atwork/2011/05/notes-from-michael-feathers-brutal-refactoring/) |
| Book review of WELC | legalizeadulthood.wordpress.com | 2007-04-11 | 唯一找到的、逐条抄录 Part II 章名 + Part III 全部 24 条技术的书评。[链接](https://legalizeadulthood.wordpress.com/2007/04/11/working-effectively-with-legacy-code-by-michael-c-feathers/) |
| Working Effectively With Legacy Code 章名笔记 | paulbatchelor.github.io | — | 完整三部分 25 章名单。[链接](https://paulbatchelor.github.io/brain/WEWLC) |
| Is Michael Feathers backing out from his "Code without tests is bad code" statement? | Jeremiah M. Flaga | 2019-08-06（2023-10-09 更新） | 存证 2011 年原文关键段落 + "There is no upcoming book named Brutal Refactoring"。[链接](https://jeremiahflaga.github.io/2019/08/06/what-michael-feathers-said-about-welc-7-years-later) |
| #195 - Working Effectively with Legacy Code and AI Coding Assistant | Tech Lead Journal（Henry Suryawirawan 主持） | 2024-10-14 | **56 分钟完整转录 + 分节引文 + 节目提纲**。本调研中价值最高的一手访谈材料。[链接](https://techleadjournal.dev/episodes/195/) |
| The Leanpub Podcast Feat. Michael Feathers | Leanpub | 2024-09-04 | 确认 AI Assisted Programming 与 Substack 渠道；注意此处把他的所在地写成 Miami。[链接](https://leanpub.com/blog/the-leanpub-frontmatter-podcast-feat-4) |

---

## 七、智识谱系线索（他引用谁、推荐什么）

### 7.1 决定性的一手材料：《10 Papers Every Developer Should Read (At Least Twice)》

2017-11-15 repost（原写于 2009 年）。他自己写的推荐语（原文）：
> "It's a rather personal list of foundational papers and papers with deep ideas."

**他列出的 10 篇（一手，逐字）：**
1. **On the criteria to be used in decomposing systems into modules** – David Parnas
2. **A Note On Distributed Computing** – Jim Waldo, Geoff Wyant, Ann Wollrath, Sam Kendall
3. **The Next 700 Programming Languages** – P. J. Landin
4. **Can Programming Be Liberated from the von Neumann Style?** – John Backus
5. **Reflections on Trusting Trust** – Ken Thompson
6. **Lisp: Good News, Bad News, How to Win Big** – Richard Gabriel
7. **An experimental evaluation of the assumption of independence in multiversion programming** – John Knight and Nancy Leveson
8. **Arguments and Results** – James Noble
9. **A Laboratory For Teaching Object-Oriented Thinking** – **Kent Beck, Ward Cunningham**
10. **Programming as an Experience: the inspiration for Self** – David Ungar, Randall B. Smith

**他给出的、最能暴露思想根的三条注解（一手）：**
- 论 Parnas：「In it, Parnas introduces a forerunner to the **Single Responsibility Principle**. He introduces the idea that we should use modularity to **hide design decisions** – things which could change.」——**这是 SOLID 之 S 的源头。** 也是他被外界称为「SOLID 命名者」时，他自己会回溯到的起点。
- 论 Gabriel：「hidden deep within it is the Gabriel's description of the '**Worse is Better**' philosophy – an idea with profound implications for the acceptance and spread of technology.」
- 论 Beck & Cunningham：「This paper hits upon key ideas which many people don't talk about much any more: **anthropomorphism and dropping the top/down perspective**.」
- 论 Knight & Leveson：「one of the avenues that engineers in other disciplines take to make their products stronger – **redundancy** – doesn't really work in software.」——他从 **Ralph Johnson** 在一个 newsgroup 讨论里听说这篇。**Ralph Johnson 因此是可确认的间接影响源。**

**他自己的元判断（一手）：**
> "It's hard to find deeply technical books and articles which stand the test of time in software: they are all Latin within 20 years."

来源：[全文](https://michaelfeathers.silvrback.com/10-papers-every-developer-should-read-at-least-twice) **[一手]**

### 7.2 人名级谱系（按证据强度分级）

| 人物 | 证据 | 强度 |
|---|---|---|
| **Kent Beck** | ① 10 Papers 收录 Beck & Cunningham 的 OO 教学论文并盛赞；② 2024 访谈原话："I went to a conference and I met **Kent Beck and Ron Jeffries** back in like 1999 or so… they had really thought deeply about how to become better programmers… And they were also saying things like, you should write your tests first." | **强（一手明确致谢）** |
| **Ron Jeffries** | 同上，1999 年会议上与 Beck 一并结识 | **强** |
| **Martin Fowler** | ① 2024 访谈大段推荐《Refactoring》；② 书评人指出 WELC 是 Fowler《Refactoring》的「excellent partner」——Fowler 讲「有测试后怎么改」，Feathers 讲「怎么先有测试」；③ **Fowler 的 bliki 专门为 Feathers 的 seam 立词条 "Legacy Seam"**，并给出书中定义原文 | **强（双向引用）** |
| **Ralph Johnson** | 2024 访谈两次点名：一次是转述他关于「教好设计就是教该避免什么」的话；一次是 10 Papers 里说从他那听说 Knight & Leveson 论文 | **强** |
| **David Parnas** | 10 Papers 第 1 篇，且称其为 SRP 的前身 | **强** |
| **Ward Cunningham** | 与 Beck 合作的论文被他收录 | **中强** |
| **Robert C. Martin** | **[间接]** WELC 属 "Robert C. Martin Series"（出版社官方标注）；书评人把 SOLID 的 S 与 Parnas 挂钩。**但本次调研未找到 Feathers 本人直接谈论 Uncle Bob 的一手文字。** | **弱（仅出版物从属关系）** |
| **Michael Jackson** | — | **未找到**（本次调研未在任何他一手文本中见到此名） |
| **Bertrand Meyer** | — | **未找到**（设计契约在 10 Papers 名单中缺席；未见一手引用） |
| **John Gall** | — | **未找到**（未见一手引用） |
| **Edsger W. Dijkstra** | 博客《System Personas and Design Integrity》(2021-03-13) 开篇即谈 Dijkstra，自述「It's taken me a while to appreciate Edsger W. Dijkstra」，并提到大学教授曾戏称他为 "fearless leader" | **中（一手，但仅在摘要层面读到）** |
| **Baldwin & Clark** | 2023 年 AI 长文的脚注 [2]，引《Design Rules: The Power of Modularity》，用于论证「模块化不只是软件概念，是几乎所有规模系统的策略」 | **中** |
| **Paul Erdős** | 2024 访谈讲职业选择时的自述：「I read about this mathematician named Paul Erdős and it was like, he lived with a suitcase and would go from place to place and sort of work with other mathematicians… I thought, wow, that's really an interesting thing」 | **中（人格榜样，非技术谱系）** |
| **Llewellyn Falco** | Tech Lead Journal #195 的 Mentions & Links 列出 | **弱（一次性提及，可能只是本期节目提到）** |

### 7.3 关于「SOLID 原则命名者」这个头衔

- 任务书称他为 "SOLID 原则命名者"。**本次调研未找到他自己的任何一手文本宣称或解释此事。**
- 能确认的间接链条是：他在 10 Papers 里把 Parnas 的模块化论文称为「**Single Responsibility Principle 的前身**」——这说明他与 SOLID 的话语体系有明确接触，但**不等于他命名了 SOLID**。
- **[推断]** 该头衔在社区流传（Bob Martin 本人多次在公开场合提到 SOLID 缩写是 Michael Feathers 的建议），但本次调研未取得可引一手来源。**建议下游标 [存疑]，或由研究 Agent 2/4 从访谈维度补证。**

### 7.4 谱系小结（写给下游）

**他的思想根不在设计模式传统，也不在形式方法传统，而在三个地方：**
1. **模块化/信息隐藏**（Parnas）——seam 是「在既有代码里找可替换点」，本质是逆向使用信息隐藏。
2. **XP 社群的人与对话**（Beck、Jeffries、Ralph Johnson）——测试优先、结对、以及「教设计就是教坏味道」。
3. **经验主义与经验数据**（Knight & Leveson 的冗余失效实验、幂律代码变更分布、"Worse is Better"）——他反复用「实测代码库的形态」而不是「设计原则」来支撑主张。

**注意：任务书假设的 Michael Jackson / Bertrand Meyer / John Gall 三人在本次调研的一手文本中完全未出现。** 这三个人或许是别人归纳出的影响，但**不是他自己点名的影响源**，不宜进入「他说过的」一栏。

---

## 八、矛盾与存疑（**只记录，不调和**）

### 矛盾 1（核心）：「code without tests is bad code」——他自己 2011 年就公开退让，2024 年又部分回守

**立场 A（2004，书本身）：**
> "Code without tests is bad code. It doesn't matter how well written it is; it doesn't matter how pretty or object-oriented or well encapsulated it is."

**立场 B（2011，TypePad 博客《Brutal Refactoring》，逐字转引）：**
> "These days, I'm much more aggressive in my approach to old code. **WELC was fully ingrained in that "if we don't have tests, we can't do much" attitude. I think that part of that was a sign of the times, and part of it was a reflection of my natural fear as a consultant.** … Nicely, though, people who are embedded in teams often can, and I've learned a lot from people who've tried things out long term in their code and have lived to tell the tale."

**立场 C（2024，Tech Lead Journal）：**
> "Well, if you don't have any tests, I think it's appropriate for you, okay? … But I think, you know, we might end up in a place where life is just a reverse. And I think it has to some degree through basically the thing that we don't understand, right? And I think that's another definition is like **legacy code is code we don't understand**."
> "But occasionally, people will say, you know, who are you to make the definition of legacy, and it's like, it's just one. There's many pick whichever one you want. **Pick the one that helps you.**"

**矛盾的具体形状（不调和）：**
- 2011 年他把旧立场归因于「**时代因素 + 自己作为顾问的天然恐惧**」——这是**自我否定的措辞**，不是补充说明。
- 但 2024 年他又说「如果你没有测试，这个定义对你就是合适的」，同时**追加**了第二个定义（「不理解」），并用「随便挑一个有用的」来消解定义的权威性。
- **[冲突]** 第三方观察者（Jeremiah Flaga）直接把它读成「backing out」；第三方实践者（Nicolas Carlo）则既承认「This is an insight from years of experience」「I like this definition. It works」又明确说「**I don't think it's the best definition**」，并列出两条反例（有测试也可能是遗留代码；没测试也可能很好改）。
- **另有一条被 Mark Needham 记录的工作坊立场与他早期书评口径相冲突**：2011 年他说「take a code base and refactor the whole thing 非常罕见」「要习惯代码库不是每处都完美」；而 WELC 前言的口吻是「code without tests is bad code」的绝对判定。**从「判定」到「接受不完美」，是他自己走过的距离。**

### 矛盾 2：《Brutal Refactoring》到底存不存在

- **来源说「有」**：Amazon（含 .be/.co.za 多站点）、Goodreads、AbeBooks、MIT Press Bookstore、Thriftbooks、Barnes&Noble 系独立书店、knetbooks、brownsbfs、kriso.ee、AU Digital Library——**大量零售/聚合站有 ISBN 9780321793201 的条目，日期从 2021-12 到 2026-08**。
- **来源说「没有」**：出版商自己的 InformIT 页面写 **"Published Dec 31, 2040"**、**"This product currently is not for sale."**、Copyright 2041；第三方观察者 2023 年明确写 "**There is no upcoming book named Brutal Refactoring.**"
- **[推断]** 零售站的条目是从 Pearson 的分销元数据自动同步来的幽灵条目，会随元数据反复「重新上架」。**权威判定应以出版商自己的页面为准：未出版。**
- **同时注意**：Pearson 德国站的条目显示 "2040 / Auflage:1 / 2022-10-01"，说明这个幽灵条目至少在 2022 年还在被分发给德国渠道。

### 矛盾 3：「brutal」的语义在官方文案内部就不稳定

- 官方文案一边说 "aggressively reshape them"（**强硬/激进**），一边把内容写成 "In Vitro Test Harnesses"、"Production Toggles"、"Metric Profiles"（**这些其实是相当审慎、有度量的做法**）。
- **[推断]** 标题里的 brutal 更像营销张力，内容骨架（度量、热点、剖面、体外测试台）反而是**数据驱动的稳健路线**。这与他在 2011 年工作坊里强调「重构火力对准高 churn 高复杂度」的务实姿态一致，而与「野蛮」的字面意思不一致。

### 矛盾 4：测试地位的两处表态张力

- 2016 年长文《Characterization Testing》：明确把特征测试与「正确性测试」区分开，说特征测试「serves like a poor practice」，是权宜。
- 2024 年访谈：**把特征测试提到了方法论正典的位置**——"The test is a way of grounding our knowledge of a system"，并说它「现在常被叫作 pinning tests」。
- **[推断]** 8 年间他从「这是没测试时的权宜之计」转向「这是一切测试的本质功能」。**这与他「可理解性优先于正确性」的漂移方向一致，但表述上前后张力明显。**

### 矛盾 5：WELC 到底是什么书——他自己的两个说法

- 书的外观：技术手册，464 页，24 条技法，C++/Java/C# 代码。
- 2024 年他自己的评价：
  > "as much as it's very technical and has a lot of code in it, **I'm only realizing now how much it was really about going and helping people keep their morale up and have a positive outlook to what they can do**"
  > "I'm only realizing now" 是他 20 年后才给出的自我解读。
- 同一访谈里他还说：
  > "Sometimes I joke that if I were to rewrite *Working Effectively with Legacy Code* I'd call it *Working Effectively with Object-Oriented Code*."
- **[冲突/张力]** 这三个自我描述（技术手册 / 士气书 / 其实是 OO 书）互不兼容，且都由他本人在相近时期给出。**不调和——这正是「一个人对自己代表作的理解会随用途而变」的样本。**

### 存疑清单（明确「未找到」）

| 事项 | 状态 |
|---|---|
| "cover and modify" / "edit and pray" 是否为他所用 | **未找到一手来源**。仅见 AI 生成的学习站并列这两个短语；一手文本里出现的是 "code and pray"（书评转述）。 |
| "the maid service" | **未找到**。多轮精确检索零命中。 |
| Legacy Code Retreat 是否为他首创 | **未找到支持**。证据显示是以他的方法为内核的社区活动，由他人（如 Erik Talboom）主持。 |
| 他是否命名了 SOLID | **未找到一手来源**。仅能确认他把 Parnas 论文称为 SRP 前身。 |
| Michael Jackson / Bertrand Meyer / John Gall 与他的关联 | **未找到一手来源**。他本人的 10 篇论文清单和人名致谢中均无此三人。 |
| WELC 第 4 章是否有第 4 类 seam（除 preprocessing / object / link 外） | **未能确认**。fetch 到的原文在 link seam 处被截断。 |
| 全书全文取证（核对 cover and modify、effect sketch、pinch point 的书内原文） | **未能完成**。Archive.org 全文页在本会话网络下不可达（400 / fetch failed）；`docs\experts` 环境无 PDF 文本提取能力。 |
| michaelfeathers.substack.com 的内容与活跃度 | **未找到**。DNS 解析到非公网 IP，工具拒绝访问。 |
| Michael Feathers 的确切出生年份（任务书称 1971）与现居地 | **未在一手来源中确认**。InformIT/Silvrback 的官方简介均不含生年；Leanpub 播客页 2024 年称他 "Based in **Miami**"，与任务书「现居新奥尔良」**不一致**。 |

**关于现居地的不一致值得单列**：Leanpub 2024 年播客页原话为 "Based in Miami, Michael is the Founder and Director of R7K Research & Conveyance"。任务书称其现居新奥尔良。二者冲突，**本次调研无法裁定**（一处是出版方 2024 年的说法，一处是任务书输入）。注意他在 2024 年访谈里提到「I used to live in Miami, Florida」——**用过去时**，暗示 2024 年时他可能已不住迈阿密。

### 一处需要提醒下游的第三方错误

[forage.com](https://forage.com/book/1382395)（AI 内容聚合站）在其 "Interesting facts" 里写：「Michael Feathers **coined the term "legacy code"**」。**这是错的**——"legacy code" 是行业既有词汇，他做的是**重新定义**它（并且他本人在 2024 年访谈里明确说这个定义「really was at odds with traditional definition」）。同页还称其技法「developed through the author's extensive consulting work with companies like **Google, Microsoft, and Oracle**」——**本次调研在任何一手来源中均未见到这三家公司名**，应视为该站的臆造。**该站不可引用。**

---

## 九、来源清单（分一手/二手）

### 一手（他本人写的 / 出版社官方书页 / 官方放出的章节原文 / 他本人的访谈原话）

1. **Working Effectively with Legacy Code 官方书页**（出版信息、ISBN、页数、系列）—— https://www.informit.com/store/working-effectively-with-legacy-code-9780131177055
2. **WELC 第 1 章全文**（Changing Software and Legacy Code，2005-01-14，Prentice Hall 官方样章）—— https://www.informit.com/articles/printerfriendly/359418
3. **WELC 第 4 章全文**（Testing Effectively With Legacy Code，2005-01-21，3 页）—— https://www.informit.com/articles/article.aspx?p=359417
4. **WELC 第 4 章第 2 页**（Seam / Enabling Point / object seam 定义原文）—— https://www.informit.com/articles/article.aspx?p=359417&seqNum=2
5. **WELC 第 4 章第 3 页**（Seam Types / Preprocessing Seams / Link Seams）—— https://www.informit.com/articles/article.aspx?p=359417&seqNum=3
6. **WELC 第 4 章打印版（全文单页）** —— https://www.informit.com/articles/printerfriendly/359417
7. **InformIT 作者页**（R7K / Obtiva / Object Mentor International 官方简介）—— https://www.informit.com/authors/bio/16f6a5b2-9838-4bec-88db-263b29a7b74c
8. **InformIT 作者文章索引页**（他的两篇官方样章条目）—— https://www.informit.com/authors/bio/19ba76db-ff60-41db-b047-670befde09a6
9. **Brutal Refactoring 官方产品页**（"Published Dec 31, 2040" / "not for sale" / 17 章目录 / 官方文案）—— https://www.informit.com/store/brutal-refactoring-more-working-effectively-with-legacy-9780321793201
10. **AI Assisted Programming（Leanpub 连载）**（状态、页数、完整目录）—— https://leanpub.com/ai-assisted-programming
11. **Silvrback 博客首页** —— https://michaelfeathers.silvrback.com/
12. **Silvrback 文章总览（带日期）** —— https://michaelfeathers.silvrback.com/archive
13. **Silvrback Bio** —— https://michaelfeathers.silvrback.com/bio
14. **Silvrback RSS（含全文正文）** —— https://michaelfeathers.silvrback.com/feed
15. **Characterization Testing（2016-08-08，特征测试方法论原文）** —— https://michaelfeathers.silvrback.com/characterization-testing
16. **Negative Architecture（2018-01-02）** —— https://michaelfeathers.silvrback.com/negative-architecture
17. **Orange Code（2018-08-28）** —— https://michaelfeathers.silvrback.com/orange-code
18. **Functional Code is Honest Code（2020-06-11）** —— https://michaelfeathers.silvrback.com/functional-code-is-honest-code
19. **Unit Conversations（2020-09-22，C11R 工具）** —— https://michaelfeathers.silvrback.com/unit-conversations
20. **Gateway Teams（2021-08-23）** —— https://michaelfeathers.silvrback.com/gateway-teams
21. **Generate from Constraints / Prompt-Hoisting（2023-07-11）** —— https://michaelfeathers.silvrback.com/prompt-hoisting-for-gpt-based-code-generation
22. **(Possible) AI Impacts on Development Practice（2023-04-06）** —— https://michaelfeathers.silvrback.com/possible-ai-impacts-on-development-practice
23. **10 Papers Every Developer Should Read (At Least Twice)（2017-11-15 / 原 2009）** —— https://michaelfeathers.silvrback.com/10-papers-every-developer-should-read-at-least-twice
24. **Tech Lead Journal #195 全文转录 + 分节引文 + 节目提纲（2024-10-14，56 分钟）** —— https://techleadjournal.dev/episodes/195/
25. **Leanpub Frontmatter 播客页（2024-09-04，作者自述与书籍信息）** —— https://leanpub.com/blog/the-leanpub-frontmatter-podcast-feat-4
26. **Pearson 官方 WELC 目录 PDF（检索摘要可见章名，PDF 本体未取）** —— https://pearson.de/media/muster/toc/toc_9780132931748.pdf
27. **Martin Fowler bliki: Legacy Seam（转引 Feathers 定义原文，并由 Fowler 本人定性其概念归属）** —— https://martinfowler.com/bliki/LegacySeam.html

### 二手（他人总结、书评、笔记、聚合）

28. **The key points of Working Effectively with Legacy Code** — Nicolas Carlo — https://understandlegacycode.com/blog/key-points-of-working-effectively-with-legacy-code/
29. **What is Legacy Code? Is it code without tests?** — Nicolas Carlo（**明确的异议者**）— https://understandlegacycode.com/blog/what-is-legacy-code-is-it-code-without-tests/
30. **WELC 书评（2007-04-11，含 Part III 全部 24 条技术）** — legalizeadulthood.wordpress.com — https://legalizeadulthood.wordpress.com/2007/04/11/working-effectively-with-legacy-code-by-michael-c-feathers/
31. **WELC 章名笔记（完整三部分 25 章）** — paulbatchelor.github.io — https://paulbatchelor.github.io/brain/WEWLC
32. **XP 2011: Michael Feathers - Brutal Refactoring（2011 工作坊笔记 A）** — Mark Needham — https://www.markhneedham.com/blog/2011/05/11/xp-2011-michael-feathers-brutal-refactoring/
33. **Notes from Michael Feathers' Brutal Refactoring（2011 工作坊笔记 B）** — Patrick Kua — https://thekua.com/atwork/2011/05/notes-from-michael-feathers-brutal-refactoring/
34. **Is Michael Feathers backing out from his "Code without tests is bad code" statement?（2019，含 2011 原文段落与 2023 更新）** — Jeremiah M. Flaga — https://jeremiahflaga.github.io/2019/08/06/what-michael-feathers-said-about-welc-7-years-later
35. **code-foundations / welc-legacy-code SKILL.md（19 条技法子集 + 决策树 + effect sketch / pinch point 表述）** — https://raw.githubusercontent.com/ryanthedev/code-foundations/main/skills/welc-legacy-code/SKILL.md
36. **Brutal Refactoring 聚合条目（含 AI 生成的错误事实，**不可引用**，仅作坊间理解样本）** — https://forage.com/book/1382395
37. **Legacy Code Retreat 相关（社区活动，非 Feathers 首创之证据）** — https://github.com/caradojo/trivia · https://functional.computer/blog/legacy-code-retreat-part-one-get-it-under-test · https://jvaneyck.wordpress.com/2015/07/27/legacy-code-retreat/
38. **WELC 全书 OCR 全文页（**本会话网络不可达**，记录以备后续取证）** — https://archive.org/stream/working-effectively-with-legacy-code/Working.Effectively.with.Legacy.Code_djvu.txt

**来源计数：一手 27 条 + 二手 11 条 = 38 条可点击 URL。一手占比约 71%。**

### 本次调研的方法学限制（供下游评估置信度）

1. **搜索引擎严重降级**：本会话配置的 Bing 对英文技术查询返回中文词典/娱乐噪声（大量结果与 Michael Jackson、Michael Kors 混同）。ddg / ddg-lite / searxng 连接失败；exa / tavily / firecrawl 触及配额（HTTP 429）；parallel / perplexity 无 key。实际可用的是 **keenable、deepseek-official、anysearch（后转为 keenable）、bing**。**对策：主要依赖「已知权威 URL 直取」而非检索。**
2. **PDF 无法解析**：web_fetch 返回 "unsupported content type application/pdf"。因此 Pearson 官方目录 PDF、Pearson 样章 PDF 只能取到检索摘要片段。
3. **shell 无网络出口**：`Invoke-WebRequest` 对 archive.org / pearson.de / copieto.com 全部失败（TLS 层中断或 HTTP 400）。**所有取证只能经 web_fetch。**
4. **域名黑名单/解析限制**：openlibrary.org、dokumen.pub、perlego.com、reddit.com、thriftbooks.com、michaelfeathers.substack.com 被解析到非公网 IP 而遭工具拒绝；web.archive.org 同样。**这直接导致 2007–2016 的 TypePad 博客与 WELC 全书全文无法取证。**
5. **因此**：本文件对「书内原文」的引用，除**第 1 章与第 4 章（出版社官方免费样章，一手，可点可复核）**外，其余均标为「一手引文，二手载体」或「二手」。**凡涉及 effect sketch / pinch point / sprout / wrap / cover and modify 的书内原文，本次均未取得一手凭证，请勿在后续蒸馏中当作已核实事实使用。**

---

*本文件为「女娲·Skill 造人术」蒸馏流程·调研 Agent 1（著作维度）产出。只读 privhub\，未修改 docs\experts\ 下任何已存在文件。*
