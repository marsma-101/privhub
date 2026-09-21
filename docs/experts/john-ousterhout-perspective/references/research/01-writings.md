# John Ousterhout 著作与系统性长文调研

> 调研对象：John K. Ousterhout（斯坦福大学计算机科学系 Bosack Lerner 教授，Tcl/Tk 作者，Raft 共同作者，《A Philosophy of Software Design》作者）
> 调研日期：本文件生成时
> 调研范围：书籍（两版）、公开课程材料、论文与演讲、核心论点、自创术语、思想渊源、版本差异
> 撰写：萧潇（研究助理）｜本文件为情报整理，不做结论

---

## 0. 调研方法与信源分级说明

### 0.1 信源分级定义（全文统一）

| 标记 | 含义 |
|---|---|
| **[一手]** | Ousterhout 本人撰写 / 讲授 / 亲口所述的材料：斯坦福个人主页、APOSD 勘误与书籍页面、课程讲义原文、论文原文、访谈逐字稿中他本人的发言、他维护的 GitHub 仓库 |
| **[二手]** | 他人整理、总结、书评、笔记、二手转述 |
| **[推断]** | 萧潇的推测，未获直接证据支持 |
| **[未核实]** | 检索不到可靠证据，不作断言 |
| **[冲突]** | 不同来源互相矛盾，两说并列保留，不调和 |

### 0.2 本次调研的工程性限制（重要，影响可信度判断）

1. **PDF 无法直读**：本次会话的 `web_fetch` 工具不支持 `application/pdf` 内容类型（明确报错 `unsupported content type "application/pdf"`）；`pwsh` 中 `Invoke-WebRequest` / `curl.exe` 因 `SEC_E_NO_CREDENTIALS` 无法建立 TLS 连接。因此**斯坦福官网上的原始 PDF（Raft 论文全文、`scripting.pdf`、`threads.pdf`、`aposd2ndEdExtract.pdf`）本次未能逐页读取**。文中凡涉及这些 PDF 的内容，均以官方页面摘要或二手来源标注，不含编造的原文引用。
2. **搜索引擎后端异常**：默认 Bing 引擎对本课题的长查询返回完全无关结果（"philosophy" 一词被泛化解释）；DuckDuckGo、SearXNG、Firecrawl 连接失败；Exa / Tavily / Firecrawl 触发配额限制。实际可用引擎为 anysearch、keenable、tavily（间歇）、deepseek-official。部分检索结论受此影响。
3. **黑名单遵守**：全文未使用知乎、微信公众号、百度百科/百度知道。检索结果中出现的此类链接一律剔除，未作为任何结论的依据。
4. **维基百科不可达**：`en.wikipedia.org` 被解析为非公网地址，被工具拒绝抓取。

### 0.3 本次调研实际抓取到的一手来源清单

| # | 来源 | URL | 性质 |
|---|---|---|---|
| P1 | 斯坦福个人主页（含教学时间表、退休声明、论文列表） | https://web.stanford.edu/~ouster/cgi-bin/home.php | 一手 |
| P2 | APOSD 书籍专页（含第二版改动说明） | https://web.stanford.edu/~ouster/cgi-bin/aposd.php | 一手 |
| P3 | "My Favorite Sayings"（个人箴言集） | https://web.stanford.edu/~ouster/cgi-bin/sayings.php | 一手 |
| P4 | 完整论文列表 | https://web.stanford.edu/~ouster/cgi-bin/publications.php | 一手 |
| P5 | "Odds & Ends"（杂项文档索引） | https://web.stanford.edu/~ouster/cgi-bin/misc.php | 一手 |
| P6 | "History of Tcl" | https://web.stanford.edu/~ouster/cgi-bin/tclHistory.php | 一手 |
| P7 | FAQ | https://web.stanford.edu/~ouster/cgi-bin/faq.php | 一手 |
| P8 | CS 190 (Winter 2024) 课程首页 | https://web.stanford.edu/~ouster/cs190-winter24/ | 一手 |
| P9 | CS 190 (Winter 2024) Class Info | https://web.stanford.edu/~ouster/cs190-winter24/info | 一手 |
| P10 | CS 190 (Winter 2024) 课程日程（Class Meetings） | https://web.stanford.edu/~ouster/cs190-winter24/all_lectures | 一手 |
| P11 | CS 190 (Winter 2024) 项目列表 | https://web.stanford.edu/~ouster/cs190-winter24/all_projects | 一手 |
| P12 | CS 190 Project 1 规格书（Raft Leader Election） | https://web.stanford.edu/~ouster/cs190-winter24/proj_raft1 | 一手 |
| P13 | CS 190 Project 2 规格书（Raft Log Replication） | https://web.stanford.edu/~ouster/cs190-winter24/proj_raft2 | 一手 |
| P14 | CS 190 Code Review 1 讲义（评审方法、红牌、评审问题清单） | https://web.stanford.edu/~ouster/cs190-winter24/lectures/codeReview1 | 一手 |
| P15 | CS 190 APOSD 讨论课讲义 | https://web.stanford.edu/~ouster/cs190-winter24/lectures/aposd | 一手 |
| P16 | CS 190 Raft 讲义 | https://web.stanford.edu/~ouster/cs190-winter24/lectures/raft | 一手 |
| P17 | CS 190 UNIX 讲义 | https://web.stanford.edu/~ouster/cs190-winter24/lectures/unix | 一手 |
| P18 | CS 190 (Winter 2023) Introduction 讲义 | https://web.stanford.edu/~ouster/cs190-winter23/lectures/intro | 一手 |
| P19 | Code Review 会议说明（一对一评审流程） | https://web.stanford.edu/~ouster/cs190-winter24/review_meeting | 一手 |
| P20 | APOSD vs Clean Code 辩论全文（与 Robert Martin） | https://github.com/johnousterhout/aposd-vs-clean-code/blob/main/README.md | 一手 |
| P21 | SE Radio 第 520 期访谈逐字稿（含他本人发言） | https://se-radio.net/2022/07/episode-520-john-ousterhout-on-a-philosophy-of-software-design/ | 一手（逐字稿） |
| P22 | USENIX ATC '14 Raft 论文官方页（含摘要与 BibTeX） | https://www.usenix.org/conference/atc14/technical-sessions/presentation/ongaro | 一手 |
| P23 | The Pragmatic Engineer 播客（2025-04-09）：The Philosophy of Software Design – with John Ousterhout（含节目页逐字稿与要点） | https://newsletter.pragmaticengineer.com/p/the-philosophy-of-software-design | 一手（节目页/逐字稿）+ 二手（主持人要点整理） |

### 0.4 本次抓取到的二手来源清单

| # | 来源 | URL | 性质 |
|---|---|---|---|
| S1 | 2nd Edition 官方英文正文镜像（第三方维护，含 22 章全文与 Summary） | https://yingang.github.io/aposd2e-zh/en/ | 二手（内容为一手文本） |
| S2 | alysivji 的 APOSD 第一版读书笔记（含逐章目录与小节） | https://github.com/alysivji/notes/blob/master/software-engineering/philosophy_of_software_design.md | 二手 |
| S3 | Gergely Orosz（The Pragmatic Engineer）书评 | https://blog.pragmaticengineer.com/a-philosophy-of-software-design-review/ | 二手 |
| S4 | Mark Adel 逐章摘要（AI 辅助整理） | https://markadel.me/blog/a-philosophy-of-software-design-summary | 二手 |
| S5 | Pengyu Wang 读书笔记 | https://pengyuwa.ng/posts/aposd | 二手 |
| S6 | 第一版书籍扫描页（dandelon 目录 PDF 引文） | https://external.dandelon.com/download/attachments/dandelon/ids/DE0012CB5DBB06A590C33C12582B900391C1B.pdf | 二手（出版社目录） |
| S7 | 第二版英文正文源仓库（含各章 markdown 原文与小节标题） | https://github.com/yingang/aposd2e-zh | 二手（承载一手文本） |

---

## 1. 《A Philosophy of Software Design》：版本、目录与核心论点

### 1.1 版本基本信息 **[一手：P2 / P4]**

- 第一版：Yaknyam Press，2018 年 4 月，178 页。**[一手：P4]**
- 第二版：2021 年 7 月发布（他本人表述为 "In July of 2021 I released the Second Edition"）。**[一手：P2]**
- 德译本：O'Reilly，2021 年 10 月，书名 *Prinzipien des Softwaredesigns*。**[一手：P2]**
- 中译本：人民邮电出版社，2024 年 11 月（他本人页面表述为 "Posts and Telecommunications Press"，京东有售）。**[一手：P2]**
  - 注：他写的是 "Posts and Telecommunications Press"，中文通常作"人民邮电出版社"。**[推断]**

### 1.1.1 书序（Preface）中的关键一手信息 **[一手文本：S1]**

书序是理解他"为什么写这本书"的最直接材料，包含几条本次调研中**最重要的一手证据**：

**（1）他明确把自己的思想谱系接到 David Parnas 上，并给出年份判断**：
> "David Parnas' classic paper 'On the Criteria to be used in Decomposing Systems into Modules' appeared in 1971, but the state of the art in software design has not progressed much beyond that paper in the ensuing 45 years."

**（2）"deep / shallow"这套核心术语不是他原创的命名，而是同事提供的改称**——这一点极其重要，涉及他理论的表述来源：
> "Christos Kozyrakis suggested the terms 'deep' and 'shallow' for classes and interfaces, replacing previous terms 'thick' and 'thin', which were somewhat ambiguous."
   即：**他最初用的是 thick/thin，Christos Kozyrakis 建议改为 deep/shallow。** **[一手文本：S1]**

**（3）书的起点是"验证软件设计能否被教授"，且这个假设建立在"练习优于天赋"的证据上**：
> "I have wondered whether software design can be taught, and I have hypothesized that design skill is what separates great programmers from average ones. I finally decided that the only way to answer these questions was to attempt to teach a course on software design. The result is CS 190 at Stanford University."
   他引用的依据是 Geoff Colvin 的 *Talent is Overrated*：出色表现与"高质量练习"的关系大于与天赋的关系。**这解释了 CS 190 为什么采用"写作课式"的迭代评审法**——因为他的研究对象就是"能不能练出来"。

**（4）他对自己经验基数的量化**：
> "Over my career I have written about 250,000 lines of code in a variety of languages."
   并列出亲历的项目类型：三套从零构建的操作系统、多个文件与存储系统、调试器/构建系统/GUI 工具包等基础设施、一门脚本语言、文本/绘图/演示/集成电路的交互式编辑器。

**（5）本书的自我定位是"观点之作"（opinion piece），并主动邀请反驳**：
> "This book is an opinion piece, so some readers will disagree with some of my suggestions."
> "I don't expect this book to be the final word on software design; I'm sure there are valuable techniques that I've missed, and some of my suggestions may turn out to be bad ideas in the long run."
> "I recommend that you take the suggestions in this book with a grain of salt. The overall goal is to reduce complexity; this is more important than any particular principle or idea you read here. If you try an idea from this book and find that it doesn't actually reduce complexity, then don't feel obligated to keep using it"

  ⚠️ **这三段话是他理论体系最重要的"元声明"**：他把"降低复杂度"设为唯一的最终判据，并明确允许读者放弃任何具体原则。**与他在访谈中说"存在 absolute principles"形成了张力**（见 §8.5）。他不是在主张"绝对正确的规则"，而是在主张"绝对正确的**目标**"。**[推断，基于 P21 与 S1 的对读]**

**（6）致谢名单同时是一份隐性的智识圈层证据** **[一手文本：S1]**：
> "Abutalib Aghayev, Jeff Dean, Will Duquette, Sanjay Ghemawat, John Hartman, Brian Kernighan, James Koppel, Amy Ousterhout, Kay Ousterhout, Rob Pike, Partha Ranganathan, Daniel Rey, Keith Schwartz, and Alex Snaps."
  其中 **Brian Kernighan、Rob Pike、Jeff Dean、Sanjay Ghemawat** 是重量级的系统与工程界人物。**注意：这些人提供了评论，不等于他们认同书中全部主张**，只能作为"该书经过高水平同行阅读"的证据。

他另外留下了公开反馈渠道：`software-design-book@googlegroups.com` 与 Google Group `software-design-book`，并说明他"particularly interested in compelling examples that I can use in future editions"——**即这本书在他心里是持续迭代的活文档。**

---

### 1.2 第二版相对第一版的真实改动（**以作者本人说明为准**）**[一手：P2]**

他在书籍专页上明确写道，第二版与第一版相比 **"There are only a few significant changes from the First Edition"**，并逐条列出：

1. **新增一章 "Decide What Matters"**（即第二版第 21 章）。他的原话：该章 "talks about how good software design is about separating what's important from what's not important and focusing on what's important"。
2. **重写并扩充第 6 章 "General-Purpose Modules are Deeper"**。原话："Since the First Edition was published, the importance of choosing general-purpose approaches has become even more clear to me. I have reworked and expanded Chapter 6 ... and I've moved some material from other chapters to Chapter 6."
3. **在两章中新增小节，比较本书设计哲学与 Robert Martin《Clean Code》**。原话指出两者在 "the length of methods and the role of comments" 上 "have significant differences of opinion"。
4. 他另外说明：为照顾已购第一版的读者，把新增章节与 Clean Code 对比部分做成了一份 **book extract**（`aposd2ndEdExtract.pdf`），并直言 "It may not be worth buying the Second Edition if you already own the First Edition."

> ⚠️ **对任务书中假设的修正（重要，请勿沿用错误前提）**
> 任务书列出了若干"第二版新增"章节名，例如 "Designing for Performance"、"Designing for Testability"、"Designing for Error Handling"、"Why Comments Matter" / "Comments Revisited"、"Modular Design"。**本次调研未能证实这些是第二版新增内容**：
> - **"Designing for Performance"**：在第一版目录中即已存在（第一版第 20 章）**[二手：S2]**，第二版仍为第 20 章 **[一手文本：S1]**。**它不是第二版新增。**
> - **"Modular Design"**：是第一版第 4 章 "Modules Should Be Deep" 下的**小节**，不是独立章节 **[二手：S2]**。
> - **"Why Write Comments? The Four Excuses"**：第一版即为第 12 章 **[二手：S2]**，第二版同 **[一手文本：S1]**。**不是第二版新增。**
> - **"Designing for Testability"、"Designing for Error Handling"、"Comments Revisited"**：在两版目录中**均未找到**。**[未核实]** 这三者可能来自其他作者的书或是对本书内容的误记。
> - 结论：**第二版真正的新增只有 1 个新章节（第 21 章 "Decide What Matters"）+ 第 6 章重写扩充 + 2 处与 Clean Code 的对比小节**。第二版总章数为 22 章（第一版 20 章）。**[一手：P2 + 一手文本：S1]**

### 1.3 第二版完整目录（22 章）**[一手文本：S1；章节名与 P2 的新增章说明吻合]**

| 章 | 英文标题 | 中文 |
|---|---|---|
| Preface | — | 前言 |
| 1 | Introduction | 引言（副题：It's All About Complexity） |
| 2 | The Nature of Complexity | 复杂度的本质 |
| 3 | Working Code Isn't Enough（副题：Strategic vs. Tactical Programming） | 能跑通还不够 |
| 4 | Modules Should Be Deep | 模块应当"深" |
| 5 | Information Hiding (and Leakage) | 信息隐藏（与信息泄漏） |
| 6 | General-Purpose Modules are Deeper | 通用模块更深 |
| 7 | Different Layer, Different Abstraction | 不同层次，不同抽象 |
| 8 | Pull Complexity Downwards | 把复杂度往下拉 |
| 9 | Better Together Or Better Apart? | 合并还是分开？ |
| 10 | Define Errors Out Of Existence | 让错误不存在 |
| 11 | Design it Twice | 设计两次 |
| 12 | Why Write Comments? The Four Excuses | 为什么要写注释：四个借口 |
| 13 | Comments Should Describe Things that Aren't Obvious from the Code | 注释应描述代码看不出来的东西 |
| 14 | Choosing Names | 命名 |
| 15 | Write The Comments First | 先写注释 |
| 16 | Modifying Existing Code | 修改既有代码 |
| 17 | Consistency | 一致性 |
| 18 | Code Should be Obvious | 代码应当显而易见 |
| 19 | Software Trends | 软件潮流 |
| 20 | Designing for Performance | 面向性能设计 |
| 21 | **Decide What Matters** | **决定什么才重要（第二版新增）** |
| 22 | Conclusion | 结论 |

书末另附：**Summary of Design Principles**（16 条）与 **Summary of Red Flags**（14 条）。**[一手文本：S1]**

### 1.3.1 第二版完整小节结构（逐章核实）

> 来源：第二版英文正文（**[一手文本：S1]** 的 GitHub 源仓库 `yingang/aposd2e-zh` 中 `docs/en/chNN.md`）。小节标题为**抓取所得原文**，未做改写。**带 ⚑ 标记的小节疑似第二版新增或与第一版不同**（依据：第一版小节结构见 §1.4，两者对比得出；作者本人只承认 3 处改动，因此 ⚑ 项需谨慎对待，见下）。

**Ch1 Introduction**：1.1 How to use this book
**Ch2 The Nature of Complexity**：2.1 Complexity defined｜2.2 Symptoms of complexity｜2.3 Causes of complexity｜2.4 Complexity is incremental｜2.5 Conclusion
**Ch3 Working Code Isn't Enough**：（章名旁注 Strategic vs. Tactical Programming）
**Ch4 Modules Should Be Deep**：4.1 Modular design｜4.2 What's in an interface?｜4.3 Abstractions｜4.4 Deep modules｜4.5 Shallow modules｜4.6 Classitis｜⚑ 4.7 Examples: Java and Unix I/O｜4.8 Conclusion
**Ch5 Information Hiding (and Leakage)**：5.1 Information hiding｜5.2 Information leakage｜5.3 Temporal decomposition｜5.4 Conclusion（推测编号，本章未逐条抓取小节列表）
**Ch6 General-Purpose Modules are Deeper**（**第二版重写扩充，最能看出改动幅度的一章**）：
- 6.1 Make classes somewhat general-purpose
- 6.2 Example: storing text for an editor
- 6.3 A more general-purpose API
- 6.4 Generality leads to better information hiding
- 6.5 Questions to ask yourself
- 6.6 Push specialization upwards (and downwards!)
- 6.7 Example: editor undo mechanism
- 6.8 Eliminate special cases in code
- 6.9 Conclusion
**Ch7 Different Layer, Different Abstraction**：7.1 Pass-through methods｜7.2 When is interface duplication OK?｜7.3 Decorators｜7.4 Interface versus implementation｜7.5 Pass-through variables｜7.6 Conclusion
**Ch8 Pull Complexity Downwards**：8.1 Configuration parameters｜8.2 Conclusion（推测）
**Ch9 Better Together Or Better Apart?**：多个小节（未逐条抓取）
**Ch10 Define Errors Out Of Existence**：10.1 Why exceptions add complexity｜10.2 Too many exceptions｜10.3 Define errors out of existence｜10.4 Example: file deletion in Windows｜10.5 Example: Java substring method｜10.6 Mask exceptions｜10.7 Exception aggregation｜10.8 Just crash?｜10.9 Taking it too far｜10.10 Conclusion
**Ch11 Design it Twice**：（无编号小节，正文含"设计文本类接口"完整案例 + Ego 论述）
**Ch12 Why Write Comments? The Four Excuses**：四类借口 + 好处
**Ch13 Comments Should Describe Things that Aren't Obvious from the Code**：13.1 Pick conventions｜13.2 Don't repeat the code｜13.3 Lower-level comments add precision｜13.4 Higher-level comments enhance intuition｜13.5 Interface documentation｜13.6 Implementation comments: what and why, not how｜13.7 Cross-module design decisions｜13.8 Conclusion｜⚑ 13.9 Answers to questions from Section 13.5
**Ch14 Choosing Names**：（未逐条抓取）
**Ch15 Write The Comments First**：（未逐条抓取）
**Ch16 Modifying Existing Code**：（未逐条抓取）
**Ch17 Consistency**：（未逐条抓取）
**Ch18 Code Should be Obvious**：（未逐条抓取）
**Ch19 Software Trends**：19.1 Object-oriented programming and inheritance｜19.2 Agile development｜19.3 Unit tests｜19.4 Test-driven development｜19.5 Design patterns｜⚑ **19.6 Getters and setters**｜19.7 Conclusion
**Ch20 Designing for Performance**：（未逐条抓取）
**Ch21 Decide What Matters**：21.1 How to decide what matters?｜21.2 Minimize what matters｜21.3 How to emphasize things that matter｜21.4 Mistakes｜21.5 Thinking more broadly
**Ch22 Conclusion**：（无小节）

**关于新增小节的判断（重要说明）**：作者本人在书籍页面只列出 **3 处**重大改动（新章 21、第 6 章重写扩充、两处 Clean Code 对比小节）**[一手：P2]**。因此上表中 Ch4 的 "Examples: Java and Unix I/O"、Ch13 的 "Answers to questions"、Ch19 的 "Getters and setters" **是否绝对为第二版新增，本次无法确证**——第一版的小节清单来自第三方笔记（**[二手：S2]**），可能不完整。**保守表述：这三处小节在第二版中确实存在（一手核实）；是否为第二版新增，标 [未核实]。**

**从第二版正文可直接读出的几个重要新增论据（一手文本：S1）**：

1. **第 6 章里他公开承认自己的立场反转**：
> "When I first started teaching my software design course I leaned towards the second approach (make it special-purpose to begin with), but after teaching the course a few times I changed my mind."（Ch6）
   这是**全书唯一一处他明确写出"我原来主张 A，教了几轮课后改成 B"的自我修正**，也解释了为什么第二版要重写第 6 章。
2. **他把第 6 章的结论提到很高的位置**：
> "I now think that over-specialization may be the single greatest cause of complexity in software."（Ch6）
3. **第 6 章给出了全文最长的工程案例**：GUI 文本编辑器的文本类接口演进（`backspace`/`delete`/`deleteSelection` → `insert`/`delete`/`changePosition`），以及 undo 机制中抽出通用 `History` 类 + `History.Action` 的具体代码。**这个案例同时横跨第 6 章（通用性）、第 9 章（合并/分离）、第 11 章（设计两次）三处，是全书最可复用的实例。**
4. **第 10 章把"定义掉错误"的两个范例提升为独立小节**：`10.4 Example: file deletion in Windows`、`10.5 Example: Java substring method`——即 JS/Windows-删除行为 与 Java `substring` 越界，是他心中的两个标准范例。
5. **第 13 章末尾附了一节"答案"**：`13.9 Answers to questions from Section 13.5`——**接口文档一节他配了练习题并给出答案**，说明他认真对待"接口注释怎么写"这件事的可训练性。

### 1.4 第一版目录（20 章）**[二手：S2，逐章含小节]**

第一版章节顺序与第二版 1–20 章基本一致（第 20 章均为 "Designing for Performance"），差异是**没有第 21 章 "Decide What Matters"**、**第 22 章 "Conclusion" 的位置/形式在本次调研中未获第一版原文确认**。第一版明确列出的**小节级**结构如下（用于后续引用核验）：

- Ch1 Introduction：1.1 How to use this book
- Ch2 The Nature of Complexity：Symptoms of Complexity（Change Amplification / Cognitive Load / Unknown Unknowns）；Causes of Complexity（Dependencies / Obscurity）；Complexity is Incremental
- Ch3 Working Code Isn't Enough
- Ch4 Modules Should Be Deep：Modular Design；Interface；Abstractions；Deep Modules；Classitis
- Ch5 Information Hiding (and Leakage)：Information Hiding；Information Leakage；Temporal Decomposition；Other Topics
- Ch6 General-Purpose Modules are Deeper：Questions to Ask
- Ch7 Different Layer, Different Abstraction：Pass-through Methods；When is interface duplication OK?；Decorators；Interface versus Implementation；Pass-through Variables
- Ch8 Pull Complexity Downwards：Configuration Parameters；Rule of Thumb
- Ch9 Better Together Or Better Apart?：Bring Together: Simplify the Interface；Bring Together: Eliminate Duplication；Separate General-Purpose and Special-Purpose Code；Splitting and Joining Methods
- Ch10 Define Errors Out of Existence：Why exceptions add complexity；Too many exceptions；Define errors out of existence；Mask Exceptions；Exception aggregation；Crash Application；Design special cases out of existence；Taking it too far
- Ch11 Design it Twice：Ego
- Ch12 Why Write Comments? The Four Excuses：Good code is self-documenting；I don't have time to write comments；Comments get out of date and become misleading；Benefits of well-written comments
- Ch13 Comments Should Describe Things that Aren't Obvious from the Code：Pick conventions；Don't repeat the code；Lower-level comments add precision；Higher-level comments enhance intuition；Interface documentation；Implementation comments: what and why, not how；Cross-module design decisions
- Ch14 Choosing Names：Create an image；Names should be precise；Use names consistently；More Thoughts
- Ch15 Write The Comments First：Delayed comments are bad comments；Write the comments first
- Ch16 Modifying Existing Code：Stay Strategic；Maintaining comments: keep the comments near the code；Comments belong in the code, not the commit log；Maintaining comments: avoid duplication；Maintaining comments: check the diffs；Higher-level comments are easier to maintain
- Ch17 Consistency：Ensuring Consistency
- Ch18 Code Should be Obvious：Things that make code more obvious；Things that make code less obvious
- Ch19 Software Trends：Object-oriented programming and inheritance；Agile Development；Unit Tests；Test-driven Development；Design Pattern
- Ch20 Designing for Performance

第二版新增章的小节（**一手文本：S1**）：
- Ch21 Decide What Matters：21.1 How to decide what matters?；21.2 Minimize what matters；21.3 How to emphasize things that matter；21.4 Mistakes；21.5 Thinking more broadly

> ➡️ **本节的用途**：作为 §1.3.2 版次差异对照表的对照基准。

### 1.5 逐章核心论点

> 说明：本节论点主要依据 **[一手文本：S1]**（第二版正文）与 **[二手：S2][S4][S5]** 的逐章摘要交叉得出。带引号者为**英文原文短句**（全部 ≤25 词），标注章节便于核验。

#### Ch1 Introduction（It's All About Complexity）
核心：软件写作最大的限制是"我们理解自己所创造系统的能力"；对抗复杂度只有两条路——**消除**（让代码更简单更显然）与**封装**（模块化设计）；软件设计是贯穿生命周期的持续过程，瀑布模型为何失效、增量式（敏捷）为何奏效。
> "This means that the greatest limitation in writing software is our ability to understand the systems we are creating."（Ch1）**[一手文本：S1]**
> "Because software is so malleable, software design is a continuous process that spans the entire lifecycle of a software system"（Ch1）**[一手文本：S1]**
> "Beautiful designs reflect a balance between competing ideas and approaches."（Ch1）**[一手文本：S1]**

**红牌机制的引入**：他建议把"识别红牌"（red flags）当作可训练的核心技能，书末汇总。
> "One of the best ways to improve your design skills is to learn to recognize red flags"（Ch1）**[一手文本：S1]**

#### Ch2 The Nature of Complexity
核心：给出 complexity 的定义、三个症状、两个根源。
> "Complexity is anything related to the structure of a software system that makes it hard to understand and modify the system."（Ch2）**[一手文本：S1]**
- **症状三件套**：Change Amplification（改一处要动多处）、Cognitive Load（要装进脑子里的信息量）、Unknown Unknowns（不知道该改哪里/需要什么信息——最坏）。
- **根源两条**：Dependencies（一段代码无法孤立理解/修改）、Obscurity（重要信息不显然）。
- **复杂度的增量性**：复杂度由成百上千个小块累积，无单一病根可拔除。
> "It's easy to convince yourself that a little bit of complexity introduced by your current change is no big deal."（Ch2）**[二手转引：S2]**
- **反例提醒**：读者比作者更容易看出复杂度——"Complexity is more apparent to readers than writers."（Ch2）**[二手转引：S2]**

#### Ch3 Working Code Isn't Enough（Tactical vs. Strategic Programming）
核心：战术编程（先把功能做出来）vs 战略编程（投资心态，持续花时间改进设计）。他把技术债等同于战术编程（见 CS 190 讲义 P15 的明确对应）。
> "Many organizations encourage a tactical mindset, focused on getting features working as quickly as possible."（Ch3）**[二手转引：S2]**
- 量化建议：把总开发时间的 **10–20%** 持续投入设计改进。**[二手：S2][S4]**
- 如果代码库是烂摊子，会影响招人。**[二手：S2]**
- **注意 "tactical tornado" 这个词**：本次调研**未在第二版正文抓取片段中直接命中该词**，但在 2025 年播客中，主持人用它来描述 AI 编码工具，并明确把它与他的框架挂钩（**[P23]**）。**[推断]**：该词属他第 3 章的概念体系（战术编程的极端形态），但**本次未能取到书中该词的确切定义句，故不引用原文**。

#### Ch4 Modules Should Be Deep
核心：模块 = interface + implementation；**最好的模块是接口远简单于实现**（deep）。深度 = 收益（功能）/ 成本（接口）。反义词 shallow。提出 **classitis**。
> "The best modules are deep: they have a lot of functionality behind a simple interface"（Ch4）**[二手转引：S2]**
> "Design systems so that developers only need to face a small fraction of the overall complexity at any given time"（Ch4）**[二手转引：S2]**
- 接口含**形式部分**（语言可强制的签名等）与**非形式部分**（只能靠注释描述的约束/高层行为）。
- 经典深模块例子：Unix I/O（`open/read/write/lseek/close` 五个调用隐藏海量实现）、垃圾回收器。**[二手：S4]**

#### Ch5 Information Hiding (and Leakage)
核心：源自 Parnas 的信息隐藏是造出深模块的技术；隐藏减少复杂度有两条机制（接口更简单 = 认知负荷低；设计变化只影响一个模块 = 易演进）。
> "Same knowledge used in multiple places"（Ch5，定义 information leakage）**[二手转引：S2]**
- **Information Leakage**：同一个设计决策反映在多个模块中，即使不在接口里也可能泄漏（例如两个函数约定同一文件格式）。
- **Temporal Decomposition**：按操作的时间顺序切分结构，而不是按所需知识切分——被列为明确的红牌。
- **注意**："`private` declarations are not hiding anything"（Ch5）——私有声明本身不等于信息隐藏。**[二手转引：S2]**
- **Taking it too far**：隐藏只有在"外部确实不需要该信息"时才有益。

#### Ch6 General-Purpose Modules are Deeper（第二版被重写扩充）
核心：略微通用的模块（"somewhat general-purpose"）比专用模块接口更简单、更深、更少认知负荷；通用性带来更好的信息隐藏。三个自问：
1. 覆盖当前所有需求的最简接口是什么？
2. 这个方法会在多少场景被用到？
3. 这个 API 对我的当前需求好不好用？
> "Specialization leads to complexity"（Ch6 主旨，**[二手：S4]**）
> 他第二版的自我说明："the importance of choosing general-purpose approaches has become even more clear to me"（P2）**[一手：P2]**

#### Ch7 Different Layer, Different Abstraction
核心：层与层之间抽象必须不同；相邻层抽象相似 = 分解有问题的红牌。
- **Pass-through Methods**：只把参数转给另一个签名相近的方法，使类更浅、接口更复杂、制造依赖、暴露职责划分混乱。消除办法：直接暴露下层类 / 移除高层职责 / 重新分配功能 / 合并类。
- **Pass-through Variables**：沿长调用链一路下传的变量；替代方案是 context object（可并存多实例、便于测试、做成不可变以线程安全）。
- **Decorators**：倾向于浅；使用前先自问四个问题（能否直接加到原类？能否与使用场景合并？能否与已有 decorator 合并？是否真的需要包装？）。
- **Interface vs Implementation**：接口通常**应当**不同于实现。
> "The interface of a class should normally be different from its implementation"（Ch7）**[二手转引：S2]**

#### Ch8 Pull Complexity Downwards
核心：模块作者应让使用者尽量轻松，哪怕自己多干活。这是全书最"伦理化"的一章。
> "More important for a module to have a simple interface than a simple implementation"（Ch8）**[二手转引：S2]**
- **Configuration Parameters**：不要为了省事把参数甩给用户；先自问"用户真的比我们更能确定这个值吗"，必须暴露时给合理默认值。
- **Rule of Thumb**：满足以下之一才下拉复杂度——与类现有功能紧密相关 / 能让系统其他多处显著简化 / 简化本类接口。
- 他在访谈中把这条原则的原名说出来过（见 §3.4）。

#### Ch9 Better Together Or Better Apart?
核心：合并还是分开，判断标准是"整体复杂度是否下降"。分开的代价：更多接口、更多管理代码、组件之间存在感变弱、可能重复。
- **应当合并的信号**：共享信息 / 总是一起被使用 / 概念上重叠 / 不看另一段就读不懂这一段。
- **通用与专用代码必须分离**（对应红牌 special-general mixture）：下层偏通用，上层偏专用。
- **Splitting and Joining Methods**：方法长度本身**很少**是拆分的正当理由。
> "length by itself is rarely a good reason for splitting up a method"（Ch9，**[二手转引：S2]**）

#### Ch10 Define Errors Out Of Existence
核心：异常处理是软件复杂度最大的来源之一。全书最具争议的一章。
- 异常的复杂度来源：调用方参数错、被调方法无法完成、分布式下丢包/超时/对端行为异常、代码内部不一致；异常处理代码本身就比正常路径难写；恢复过程中可能产生**二次异常**；异常路径很少被执行因而很少被测试。
- 手法四种：
  1. **Define errors out of existence**：改 API 语义，让原本的错误情形不再算错误。例：Java `substring` 越界应自动裁剪而非抛 `IndexOutOfBoundsException`；Windows 禁止删除已打开文件 vs Unix 标记删除、最后一个引用关闭时才真正删除。**[二手：S4]**
  2. **Mask Exceptions**：在低层吸收。例：TCP 内部重传丢包；NFS 重试服务器崩溃。**[二手：S4]**
  3. **Exception Aggregation**：用一处代码处理一整类异常（如 Web 服务器在请求分发循环顶部统一处理参数错误）。
  4. **Crash Application**：不值得处理、极少发生的错误，打印诊断后终止。
- **Design special cases out of existence**：把特殊情况设计掉，而不是加 `if`。
- **Taking it too far**（他自己明确划的边界）：只有当异常信息在模块外确实不需要时，才该定义掉或屏蔽掉。
- ⚠️ **[冲突/张力] 他在 CS 190 讲义中对学生明确加了限制语**：
> "Define errors out of existence — Note: use this idea judiciously: it's easy to take it too far"（P15）**[一手：P15]**
  即：**书里书外他都在给这条原则加"别过头"的刹车**，而 The Pragmatic Engineer 的书评则明确表示不认同该章的整体立场（见 §8.2）。

#### Ch11 Design it Twice
核心：第一次想到的设计几乎不可能是最好的；对每个重要决策都考虑多个方案，素描级别即可，尽量选**激进不同**的方案；列出各方案优劣再定。
> "designing software is hard, so it's unlikely that your first thought about how to structure a module or system will produce the best design"（Ch11）**[二手转引：S2]**
- 比较维度：哪个接口更简单？哪个更通用？哪个能带来更高效的实现？
- **Ego** 小节：聪明人有"第一次就做对"的压力，但难题的第一版设计几乎总是失败品。
- 他在 SE Radio 访谈中把它与个人经验挂钩（见 §3.4）。

#### Ch12 Why Write Comments? The Four Excuses
核心：注释是抽象的必要条件——"没有注释，你无法隐藏复杂度"。
四个借口与反驳：① 好代码自解释（反驳：用户若必须读实现才能用，就没有抽象）；② 没时间写（反驳：好注释不超过开发时间的 10%）；③ 注释会过期误导（反驳：可管理，代码评审是修正机制）；④ 我见过的注释都没用（反驳：那是"怎么写"的问题）。
> "If users must read the code of a method in order to use it, then there is no abstraction"（Ch12）**[二手转引：S2]**
> "Comments capture information that was in the mind of the designer but couldn't be represented in the code"（Ch12）**[二手转引：S2]**

#### Ch13 Comments Should Describe Things that Aren't Obvious from the Code
核心：注释写"代码表达不出来的东西"。
- 四类注释：interface / data structure member / implementation / cross-module。
- 判断标准（可操作）：
> "Could someone who has never seen the code write the comments just by looking at the code next to the comment?"（Ch13）**[二手转引：S2]**
- 低层注释提供**精度**（单位、边界条件、空值、副作用、不变量）；高层注释提供**直觉**（这段代码想干什么、最简的一句话概括、最重要的是什么、"我们是怎么走到这里的"）。
- **Implementation comments: what and why, not how**。
- **接口注释与实现注释必须分开**；跨模块设计决策放到中心化的 `design_notes` 并留引用。
- 第二版新增了与 Martin 的对比小节（Martin 认为"注释是失败"）。

#### Ch14 Choosing Names
核心：命名是最被低估的设计环节；好名字本身就是文档。两个属性：**precision** 与 **consistency**。
> "Selecting names for variables, methods, and other entities is one of the most underrated aspects of software design."（Ch14）**[二手转引：S2]**
- 名字要"在读者脑中形成图像"，且要说明它**不是**什么。
- 名字超过 2–3 个词就笨重。
- **红牌**：想不出精确又直观的名字 → 说明这个变量/实体定义不清（Hard to Pick Name）。
- 布尔量用谓语式命名（如 `cursorVisible`）；循环里 `i/j` 可接受。
- 第二版新增与 Go 风格指南（主张极短名）的对比。

#### Ch15 Write The Comments First
核心：把写注释当作**设计工具**，而不是事后文书。
- 顺序：先写类接口注释 → 再写重要公有方法的接口注释与签名（方法体留空）→ 迭代到结构感觉对了 → 写重要实例变量的声明与注释 → 最后填方法体并补实现注释。
- 三大收益：注释质量更高（设计意图还热乎）；注释即抽象，能在写码前暴露设计问题；过程更有趣。
- **红牌**：如果一个变量/方法的注释写得很长很绕（Hard to Describe），说明抽象没做好。
> "Delayed comments are bad comments"（Ch15 小节名）**[二手转引：S2]**

#### Ch16 Modifying Existing Code
核心：成熟系统的设计，更多由演化中的修改决定，而非最初构想。
- **Stay Strategic**：改动既有代码时不要问"我能做的最小改动是什么"，而要问"如果一开始就考虑到这个需求，结构该是什么样"；每次修改都顺手改进一点点。
- 注释维护四原则：贴近代码 / 放在代码里而不是 commit log / 避免重复记录 / 看 diff 时同步检查。
- 高层注释更容易维护（不随细节变动而失效）。

#### Ch17 Consistency
核心：相似的事用相似方式做，不同的事用不同方式做；一致性让读者可以安全地作假设。
- 落实手段：写文档列约定；写工具强制检查（提交前拦截）；代码评审即教育场。
- **"When in Rome"**：跟随所在文件/项目的既有约定。
- **不要为了"更好的做法"而改变既有约定**——不一致几乎总比"稍微次优但一致"更糟。
> "a better idea is not a sufficient excuse to introduce inconsistencies"（Ch17）**[二手转引：S2]**
- **Taking it too far**：把一致性用到**不相似**的事物上，反而制造复杂度。

#### Ch18 Code Should be Obvious
核心：为**阅读**而设计，不是为**书写**而设计。显然 = 读者能快速抓住行为与含义，且初步猜测就是对的。
> "Software should be designed for ease of reading, not ease of writing"（Ch18）**[二手转引：S2]**
- **让代码更显然的东西**：好的抽象、让读者始终拥有所需信息、好名字、一致性、留白、注释。
- **让代码更不显然的东西**：**事件驱动编程**（控制流难以追踪）、把一组元素塞进通用容器（应改用具名结构，如 namedtuple）、违反读者预期的东西。
- 这个"事件驱动不显然"的判断被 The Pragmatic Engineer 明确反对（见 §8.2）。
- 第二版在本章/其他章插入了 Clean Code 对比。

#### Ch19 Software Trends
核心：用复杂度标准审视每一个新范式。
- **OOP 与继承**：接口继承（复用接口、让接口更深）vs 实现继承（减少代码但父子间产生依赖与信息泄漏）；用实现继承前先考虑组合。结论："机制能帮助实现好设计，但不保证好设计"。
- **敏捷开发**：主要是**过程**方法而非设计方法；他认可增量与迭代，但批评敏捷让开发者盯着**功能**而不是**抽象**，并倾向于推迟设计决策。
- **单元测试**：极大价值在于**支撑无惧重构**。
- **TDD**：他不喜欢——"TDD focuses attention on getting specific features working rather than finding the best design"；唯一的适用场景是**修 bug**（先写复现测试）。
- **设计模式**：不是每个问题都能被已有模式干净地解决；硬套模式会带来更多复杂度。
- **第二版新增论点**（出现在书末 16 条原则中）：
> "The increments of software development should be abstractions, not features"（Summary, p.156）**[一手文本：S1]**

#### Ch20 Designing for Performance（**第一版即有**）
核心：干净设计与高性能**是兼容的**；简单代码往往更快。
> "Clean design and high performance are compatible"（Ch20）**[二手转引：S2]**
- 结论级口号（他挂在个人"名言集"里）：
> "The greatest performance improvement of all is when a system goes from not-working to working"（P3）**[一手：P3]**
- 不要一开始就优化；不要完全不优化（"death by a thousand cuts"）；先用基础知识识别**本质昂贵操作**（网络通信、二级存储 I/O、动态内存分配、缓存未命中）。
- **必须先测量**：找出瓶颈、建立基线；改完再测，没有可测提升就回退。
- 关键设计手段：让关键路径上的方法调用与特例判断尽可能少（牺牲部分通用性换性能，见 Ch21 的呼应）。
- 他另有专文《Always Measure One Level Deeper》（CACM 2018）为该章提供方法学 **[一手：P1/P4]**。

#### Ch21 Decide What Matters（**第二版新增**）
核心：好设计的关键是**把重要的与不重要的分开**；围绕重要的构建结构，把不重要的影响降到最低。
- 怎么判断什么重要：找**杠杆点**（解决一个问题顺带解决很多问题；知道一条信息就理解很多东西）；不变量是杠杆点；有多个选项可选时更容易判断（呼应 design it twice）。
- 需要**最小化"重要的东西"的数量**：减少构造参数、给默认值、把信息藏进模块、把异常在低层处理掉、让配置参数可自动推导。
- 强调重要的三种手段：**prominence**（出现在更容易被看到的地方：接口文档、名字、高频方法的参数）、**repetition**（反复出现）、**centrality**（位于系统核心，决定周边结构——例：操作系统设备驱动接口）。
- **两类错误**：把太多东西当作重要（设计被杂物塞满、认知负荷上升、浅类常由此产生——例：方法参数对多数调用者无关；Java I/O 强迫开发者区分缓冲/非缓冲）；**没认出真正重要的东西**（关键信息被藏、功能缺失导致开发者反复重造、产生 unknown unknowns）。
- 面向年轻开发者的建议：**先立假设**——"我认为最重要的是这个"——照此构建，然后复盘对错与线索。
- 超出软件：同样适用于技术写作与人生。
> "The phrase 'good taste' describes the ability to distinguish what is important from what isn't important."（Ch21）**[一手文本：S1]**

#### Ch22 Conclusion
核心：这本书只讲一件事——复杂度。
> "This book is about one thing: complexity."（Ch22）**[一手文本：S1]**
- 承认这些建议在项目早期会带来额外工作；如果不关心设计，会觉得是负担。
- 但设计投资的回报来得很快（可复用模块、半年前写的文档、设计能力本身的复利）。
> "Good design doesn't really take much longer than quick-and-dirty design, once you know how."（Ch22）**[一手文本：S1]**
- 好设计者的回报是：能花更大比例的时间在有趣的设计阶段；差设计者大部分时间在给复杂脆弱的代码追 bug。

### 1.6 书末 16 条设计原则（第二版，含页码）**[一手文本：S1]**

1. Complexity is incremental: you have to sweat the small stuff (p. 11)
2. Working code isn't enough (p. 14)
3. Make continual small investments to improve system design (p. 15)
4. Modules should be deep (p. 23)
5. Interfaces should be designed to make the most common usage as simple as possible (p. 27)
6. It's more important for a module to have a simple interface than a simple implementation (pp. 61, 74)
7. General-purpose modules are deeper (p. 39)
8. Separate general-purpose and special-purpose code (pp. 45, 68)
9. Different layers should have different abstractions (p. 51)
10. Pull complexity downward (p. 61)
11. Define errors out of existence (p. 81)
12. Design it twice (p. 91)
13. Comments should describe things that are not obvious from the code (p. 101)
14. Software should be designed for ease of reading, not ease of writing (p. 151)
15. The increments of software development should be abstractions, not features (p. 156)
16. Separate what matters from what doesn't matter and emphasize the things that matter (p. 171)

### 1.7 书末 14 条红牌（第二版，含页码）**[一手文本：S1]**

| 红牌 | 含义 | 页码 |
|---|---|---|
| Shallow Module | 接口并不比实现简单多少 | pp. 25, 110 |
| Information Leakage | 同一设计决策反映在多个模块 | p. 31 |
| Temporal Decomposition | 代码结构按执行顺序而非信息隐藏划分 | p. 32 |
| Overexposure | API 强迫调用者为了用常用功能而了解罕用功能 | p. 36 |
| Pass-Through Method | 方法几乎只把参数转给签名相近的另一个方法 | p. 52 |
| Repetition | 非平凡代码被反复重复 | p. 68 |
| Special-General Mixture | 专用代码没有与通用代码干净分离 | p. 71 |
| Conjoined Methods | 两个方法依赖过深，不懂一个就看不懂另一个 | p. 75 |
| Comment Repeats Code | 注释里的信息从旁边代码一眼可知 | p. 104 |
| Implementation Documentation Contaminates Interface | 接口注释混入使用者不需要的实现细节 | p. 114 |
| Vague Name | 名字过于模糊，信息量不足 | p. 123 |
| Hard to Pick Name | 难以找到一个精确直观的名字 | p. 125 |
| Hard to Describe | 要把变量/方法写清楚，注释必须很长 | p. 133 |
| Nonobvious Code | 代码行为或含义不易理解 | p. 150 |

---

### 1.3.2 第一版 vs 第二版：小节级差异对照（**本次调研的核心发现之一**）

> 说明：本节需要先有第一版目录（§1.4）作为对照基础。**建议与 §1.4 连读。** 方法：把第一版小节结构（**[二手：S2]**，第三方逐章笔记，第一版共 20 章）与第二版小节结构（**[一手文本：S1]**）逐章比对；所有差异均用作者本人自述（**[一手：P2]**）交叉验证。

| 章 | 第一版小节（S2） | 第二版小节（S1） | 判定 |
|---|---|---|---|
| Ch4 | Modular Design / Interface / Abstractions / Deep Modules / Classitis | 4.1 Modular design｜4.2 What's in an interface?｜4.3 Abstractions｜4.4 Deep modules｜4.5 **Shallow modules**｜4.6 Classitis｜**4.7 Examples: Java and Unix I/O**｜4.8 Conclusion | **第二版新增 "Shallow modules" 独立小节与 "Examples: Java and Unix I/O" 小节**；"Interface" 改名为 "What's in an interface?"。即：**深/浅模块的对举在第二版被显式展开**（第一版笔记中只有 Deep Modules，浅模块散在正文） |
| Ch6 | 仅 **Questions to Ask** 一个小节 | **9 个小节**：6.1 Make classes somewhat general-purpose｜6.2 Example: storing text for an editor｜6.3 A more general-purpose API｜6.4 Generality leads to better information hiding｜6.5 Questions to ask yourself｜6.6 Push specialization upwards (and downwards!)｜6.7 Example: editor undo mechanism｜6.8 Eliminate special cases in code｜6.9 Conclusion | **改动最大的一章**，与作者自述"reworked and expanded Chapter 6"完全吻合。第二版把"编辑器文本类"与"undo 机制"两个完整案例搬进本章（作者自述 "I've moved some material from other chapters to Chapter 6"——**推测原属第 9 章"合并/分离"的材料被上移**）**[推断]** |
| Ch10 | Why exceptions add complexity / Too many exceptions / Define errors out of existence / Mask Exceptions / Exception aggregation / **Crash Application** / Design special cases out of existence / Taking it too far | 10.1 Why exceptions add complexity｜10.2 Too many exceptions｜10.3 Define errors out of existence｜**10.4 Example: file deletion in Windows**｜**10.5 Example: Java substring method**｜10.6 Mask exceptions｜10.7 Exception aggregation｜**10.8 Just crash?**｜10.9 Taking it too far｜10.10 Conclusion | **两个范例被提升为独立小节**（Windows 删除文件、Java `substring`）；"Crash Application" 改名为 "Just crash?"。**"Design special cases out of existence" 小节在第二版 Ch10 中消失——已移至 Ch6.8 "Eliminate special cases in code"**（与作者"把某些章的材料搬到第 6 章"自述吻合）|
| Ch13 | Pick conventions / Don't repeat the code / Lower-level comments add precision / Higher-level comments enhance intuition / Interface documentation / Implementation comments: what and why, not how / Cross-module design decisions | 同上 + **13.9 Answers to questions from Section 13.5** + 13.8 Conclusion | 第二版**为接口文档一节配了练习题并附答案** |
| Ch19 | OOP and inheritance / Agile Development / Unit Tests / Test-driven Development / Design Pattern | 19.1 OOP and inheritance｜19.2 Agile development｜19.3 Unit tests｜19.4 Test-driven development｜19.5 Design patterns｜**19.6 Getters and setters**｜19.7 Conclusion | **第二版新增 "Getters and setters" 小节**（第一版无双列小节） |
| Ch21 | — | Decide What Matters（5 小节） | **第二版新增章**（作者自述） |
| Ch22 | — | Conclusion | 第一版的小节清单中无 Conclusion；**[未核实]** 第一版是否有对应收尾内容（笔记可能不完整） |

**结论**：作者自述"只有少数几处重大改动"是**诚实的但偏保守**。小节级的比对显示第二版至少做了：**1 个新章 + 1 章彻底重写（Ch6：1 节 → 9 节）+ 3 处小节新增（Ch4 浅模块与范例、Ch13 练习答案、Ch19 getters/setters）+ 若干小节改名与材料跨章搬迁**。他之所以说"改动不多"，判断标准应该是**核心论点层面未变**，而不是文本层面未变。**[推断]**

⚠️ **本节证据强度的自我限定**：第一版小节清单来自第三方笔记（S2），**可能不完整**。因此上表中标为"第二版新增"的小节，**严格来说只能确认"第二版中存在"**；"是否为第二版新增"存在被笔记缺漏误导的可能。§1.3.1 中已对同一点做过同样标注。

---

## 2. 斯坦福课程：CS 190（Software Design Studio）

### 2.1 课程存在性与教学历史 **[一手：P1]**

- 他本人页面声明：**"I have retired, so I am no longer teaching on a regular basis. In particular, CS 190 is unlikely to be offered again."**（个人主页，页面最后更新 2026-01-21）
- 可查的 CS 190 开设学期（他的主页"Recent Courses"列表）：Winter 2018、Winter 2019、Winter 2020、Winter 2021、Winter 2022、Winter 2023、Winter 2024。另可查 Spring 2015、Spring 2016。
- 同期他还教 CS 111 / CS 140（操作系统）。
- ⚠️ 这意味着：**CS 190 的公开材料是"已归档"状态**，本次抓取到的 Winter 2024 / Winter 2023 页面仍在线上可用。

### 2.2 课程定位与基本信息 **[一手：P8 / P9 / P18]**

课程描述（原文）：
> "This course teaches the art of software design: how to decompose large complex systems into classes that can be implemented and maintained easily."
> 主题包括："information hiding, deep classes, API design, managing complexity, error handling, and how to write in-code documentation."

- **形式**：studio 制（以课堂讨论与代码评审为主），"iterative approach consisting of implementation, review, and revision"。
- **规模**：限 18 人（"Course enrollment will be limited to 18 students"），理由是"so that I can read all of your code"。
- **语言**：全部 C++，"prior C++ experience is essential"。**[一手：P9]**
- **工作量**：每个项目都是重活，"15-20 hours per week or more"。**[一手：P9]**
- **课时**：每周三个 80 分钟时段；他的原话是"my goal is keep these classes shorter than 80 minutes (ideally, 50 minutes)"——即课堂时间主要用于 studio 活动而非讲授。**[一手：P9]**
- **成绩**：无考试；"Grades based on project work and class participation"；他明确说成绩不受"你被批评得多惨"影响，而受"你分析他人代码多有洞见、你从批评中学到多少"影响。**[一手：P9]**
- **课程自我定位（很自信的一句话）**：
> "This may be the only course in the world dedicated entirely to software design"（P18）**[一手：P18]**

### 2.3 阅读书目 **[一手：P9 / P18]**

- 教材：*A Philosophy of Software Design* **第二版**（"be sure to get the Second Edition"）。
- 阅读范围原文：**"You should read the entire book except for Chapters 19-20, which are optional, and familiarize yourself with the material by the end of the first week of classes."**
  - 即：**第 19 章（Software Trends）与第 20 章（Designing for Performance）在课程中被列为可选**。**[推断]** 这暗示他本人认为这两章不是课程核心（第 19 章是"潮流评论"，第 20 章相对独立）。
- 其他指定读物：
  - Raft 论文**扩展版**全文（`raft-extended.pdf`），课程要求理解 Section 1–5 与 Section 8 前半。
  - Ritchie & Thompson 1974 年 Unix 论文（"only accessible on campus"，经 ACM DL）。
  - Protocol Buffers 文档与入门页。
  - 第三方链接：MIT 学生写的 *Students' Guide to Raft*、Raft 可视化站、Rob Pike 关于 Google 内部软件复杂度的博客、*The Grug Brained Developer*（他评价该文"will make you laugh so hard you will fall out of your chair; it also contains some big grains of truth"——见 P2）。
- ⚠️ 值得注意：**课程不把《设计模式》《Clean Code》《人月神话》列为核心阅读**，但**在 APOSD 第二版中专门增设了与《Clean Code》的对比小节**。**[一手：P2 + P9]**

### 2.4 作业设计：三个项目 **[一手：P11 / P12 / P13]**

| 项目 | 内容 | 备注 |
|---|---|---|
| **Project 1: Raft Leader Election** | 从零实现 Raft 的领导者选举 + 一个简单远程 shell | 团队 2 人；禁止使用 gRPC 等现成通信库，必须直接用 socket 系统调用；禁止使用现成数据库/存储系统，必须用基本 C/C++ 文件 I/O |
| **Project 2: Raft Log Replication** | **基于代码评审反馈修改 Project 1**，并加日志复制，做成能执行 shell 命令的复制状态机 | 必须提交一个 `changes` 文件（10–20 行）描述最重大的改动及原因 |
| **Project 3: Tiny Make** | 实现简化版 `make` 工具 | 从零设计新系统 |

**Project 1 的关键硬性约束（体现了课程价值取向）** **[一手：P12]**：
- **"Your most important goal is to create a clean, simple, and elegant code structure."**
  原话继续："Although I expect your code to work... **I will be judging it primarily on its structure**; it's better to spend time cleaning up the structure and documentation than fixing minor bugs."
- **"Design from scratch"**：不得参考任何提供类似功能的现成代码（"many existing packages have bad interfaces, so they may not serve as good models"）——这是刻意的设计训练。
- **注释先于代码的强制要求**：至少一个非平凡源文件必须先写顶层声明与接口注释、方法体留空，单独提交并打 tag `commentsBeforeCode1`（Project 2 对应 `commentsBeforeCode2`）。
- 强制编译选项 `-Wall -Werror`；4 空格缩进、不用 tab；行长 ≤80 字符（理由是"tab 和 8 空格缩进会让我的评审工具里每行变得很长"）。
- 选举超时建议 5–10 秒。
- **Figure 2 必须"religious 地"遵循**："Even small deviations are likely to result in bugs."
- 他**主动指出论文的一处不准确**：Section 5.1 说"服务器在未及时收到响应时会重试 RPC"，但他说明 Raft 其实有别的重试机制使这一层重试没有必要。
- 日志（logging）被视为关键工具："Debugging distributed systems like this one is hard... Good logging is crucial."

### 2.5 课程节奏与讲义大纲（Winter 2024，10 周）**[一手：P10]**

| 周 | 内容 |
|---|---|
| 1 | Introduction；Raft 共识算法（两讲，附 pptx/pdf 幻灯片） |
| 2 | **讨论《A Philosophy of Software Design》（三讲）** |
| 3 | **PrimeGenerator 练习**（三讲） |
| 4 | Code Review 1（三讲） |
| 5 | Code Review 1 续；Project 1 评审讨论 |
| 6 | Project 1 评审讨论续；**Message-Passing 练习** |
| 7 | **Sockets Redesign 练习**（两讲） |
| 8 | Sockets 展示与讨论；Code Review 2（两讲） |
| 9 | Project 2 评审讨论；**The UNIX Timesharing System** |
| 10 | Open Discussion/Q&A；Course Wrapup |
| 期末周 | Code Review 3 |

要点：**设计讨论（第 2 周）之后立刻用 PrimeGenerator 做"好代码/坏代码"实战**，第 3 周就进 Code Review，第 4 周起进入"评审—修改—再评审"的循环。

### 2.6 课堂练习：PrimeGenerator（来自《Clean Code》）**[一手：P15 / P20]**

- CS 190 第 3 周的练习直接拿《Clean Code》里的 `PrimeGenerator` 类（该书 Listing 10-8，pp. 145–146）当**反面教材**。
- 他在与 Martin 的公开辩论中给出的判词：
  - 原文代码用了 8 个极小方法，`isNotMultipleOfAnyPreviousPrimeFactor` → `isMultipleOfNthPrimeFactor` → `smallestOddNthMultipleNotLessThanCandidate` 一路下钻；
  - 他指出这些方法是 **shallow and entangled**："in order to understand `isNot...` you have to read the other two methods and load all of that code into your mind at once"；
  - 而且有隐蔽副作用（修改 `multiplesOfPrimeFactors`），不读完三个方法看不出来。
- 他还指出 Martin 的改写版出现了**性能回归**（3–4 倍变慢），原因是把一次循环拆成两次循环导致迭代次数增加 5–10 倍，并直言这反映了一个更大的问题：
> "you were so focused on something that isn't actually all that important (creating the tiniest possible methods) that you dropped the ball on other issues that really are important."（P20）**[一手：P20]**
- 这场辩论的结论性张力值得记录：Martin 承认原文自己回头看也吃力（"I struggled with the names and structure"），但也反过来说 Ousterhout 的改写同样让他"equal pain and suffering"——**双方都未能说服对方**。**[一手：P20]**

### 2.7 代码评审（Code Review）的具体做法 **[一手：P14 / P19]**

这是 CS 190 最独特、最可复用的部分，也是"复杂度评分"真正的载体。

**A. 评审形式**
- 每个项目由**另外 4 名学生**评审，在 GitHub Pull Request 里写行级评论。
- **他本人给出完整书面评审**，并与每个小组**一对一开会 1 小时**逐条过。
- 学生评审在课堂上做 5 分钟口头陈述；他要求每人提交 10–20 条评论，并明确："don't invent issues if you can't find 10 meaningful things to comment on"。

**B. 评审的"红牌优先"方法论** **[一手：P14]**
> "If you're not sure what to think about while reviewing code, **focus on red flags**: aspects of the design that suggest problems. **Use the list of red flags in APOSD for starters**, but feel free to add your own as well."
> "Documentation problems are particularly easy to spot (and they are also common); APIs that are unnecessarily specialized are also good things to look for. **Once you have found red flags, see if you can identify design changes that would eliminate them.**"

**C. 评审必须回答的三组问题** **[一手：P14]**
1. 找到并理解相关代码有多容易？接口与算法清晰吗？文档是否提供了做修改所需的全部信息？
2. 类分解有效吗？类的接口是否简单且有效隐藏信息？API 是否通用？哪些功能属于/不属于这个类是否显然？有没有更好的分解（类是否**太浅**/**太深**）？
3. 代码是否简单且显然？指出最复杂的部分。

**D. 学生陈述的强制要求（很能说明他关心什么）** **[一手：P14]**
每位评审者的陈述**必须包含以下二者之一**：
- 找一个**坏文档**的例子：展示原文与相关代码，再展示你改写后的文档；
- 或者，找一个**命名不好**的变量：说明为什么不好，并给出更好的名字。

**E. 被评审项目本身要讲什么** **[一手：P14]**
- 描述每个类背后的**关键想法**，特别是"这个类里隐藏了哪些信息和设计决策"；
- 如果考虑过替代设计，说明是什么、如何取舍；
- 走一个使用示例（如一次 RPC 的生命周期）；
- 说说什么难、什么容易；
- 最满意的部分与最弱的部分。
> 他给的目标是一句话："the overall goal is *abstraction*: finding a simple way to think about something that is internally complicated."（P14）**[一手：P14]**

**F. 一对一评审会议的流程细节** **[一手：P19]**
- 在 GitHub PR 底部看他的评论，**只讨论标了 "Let's discuss" 的那些**；
- 提醒学生 GitHub 默认只显示部分评论，要反复点 "Load more..."；
- 一人当"driver"（展示代码与评论）、一人当"note taker"；
- 会前必须读完他的评论；会议可能超时，别在会后立刻安排别的事。

**G. 关于"复杂度评分"的核实结论** **[未核实]**
任务书提到课程含"复杂度评分（complexity scoring）"。**本次调研未在 CS 190 任何公开页面中找到名为 complexity score / 复杂度评分 的量化评分机制。** 他公开的成绩口径是"代码最终质量 + 课堂参与"，并且他明说"material in the class is highly subjective, which makes it hard to assign grades objectively"，并"不打算在评分上花很多时间"。**因此推测：CS 190 不使用量化复杂度评分，而是用红牌清单 + 一对一评审 + 迭代修改来驱动。** 若有原始的评分表，需进一步的内部材料才能证实。**[推断]**

### 2.8 CS 340 的核实结论 **[一手：P1]**

- 任务书提到"CS 340（Advanced Topics in Software Design）"。
- **核实结果：在他本人主页的完整教学记录中，从未出现任何 CS 340 课程。** 他近年教的是 CS 111、CS 140、CS 142、CS 190。
- 斯坦福**确实存在** CS 340 这个课号（"Topics in Computer Systems"），但**与 Ousterhout、与软件设计无关**，且他本人不在授课教师之列。**[推断，基于课号检索与他的教学记录缺位]**
- 结论：**"CS 340 (Advanced Topics in Software Design)" 这个课程描述无法证实，应视为误记。** 他的软件设计教学只有 CS 190 一门。**[一手：P1]**（斯坦福课程目录页本次抓取时返回 404 / 超时，未能取得最终确认文本。）

---

## 3. 重要论文、演讲与长文

### 3.1 Raft：《In Search of an Understandable Consensus Algorithm》 **[一手：P4 / P22]**

- 作者：Diego Ongaro、John Ousterhout（Stanford University）
- 发表：2014 USENIX Annual Technical Conference (USENIX ATC '14)，2014 年 6 月，pp. 305–319。**获评 Best Paper。**
- 论文地址（官方）：https://www.usenix.org/conference/atc14/technical-sessions/presentation/ongaro
- PDF：https://www.usenix.org/system/files/conference/atc14/atc14-paper-ongaro.pdf ；扩展版：https://web.stanford.edu/~ouster/cgi-bin/papers/raft-extended.pdf
- 官方摘要原文（USENIX 页面，**[一手：P22]**）：
> "Raft is a consensus algorithm for managing a replicated log. It produces a result equivalent to (multi-)Paxos, and it is as efficient as Paxos, but its structure is different from Paxos; this makes Raft more understandable than Paxos and also provides a better foundation for building practical systems."
- 为实现"可理解性"，Raft 把共识拆成 leader election、log replication、safety 三块，并**强化日志一致性以减少必须考虑的状态数**。论文还包含用户研究，显示 Raft 比 Paxos 更易学。
- **这篇文章与 APOSD 的关系（关键，属"同一信念的工程验证"）**：论文的核心动机不是性能，而是**可理解性**。这与 APOSD 以"复杂度/可理解性"为唯一目的函数完全同构。CS 190 里他要求学生"religiously"遵循论文 Figure 2，本身就是把"精确规范>聪明发挥"落到教学。**[推断，基于 P12/P22 的交叉]**

### 3.2 Tcl：《Scripting: Higher-Level Programming for the 21st Century》 **[一手：P4]**

- 出处：*IEEE Computer*，Vol. 31, No. 3, 1998 年 3 月，pp. 23–30。
- 官方 PDF：https://web.stanford.edu/~ouster/cgi-bin/papers/scripting.pdf （本次无法解析 PDF 正文）
- **配套数据页**：他另维护了一页 "Additional data" 作为该论文的补充材料 → https://web.stanford.edu/~ouster/cgi-bin/scriptextra.php（**一手：P5**）
- Tcl 的历史叙述见下文 §3.7。

### 3.3 《Why Threads Are A Bad Idea (for most purposes)》 **[一手：P5]**

- 1996 USENIX Technical Conference 特邀演讲（1996 年 1 月 25 日）。**没有对应的书面论文，只有 slides**。
- 论点：把 threads 风格与 events（单线程控制）对比；两者各有弱点，但 events 产生更简单、更可管理的代码，效率通常也不差；许多被推荐使用线程的应用（包括几乎全部 UI 应用）用事件驱动实现更好。
- 这条与 APOSD 第 18 章"事件驱动让代码更不显然"形成了**明显张力**（见 §8.1）——他一边主张事件驱动让代码不显然，一边在 1996 年主张事件驱动比线程更简单。**[冲突，见 §8.1]**

### 3.4 SE Radio 第 520 期访谈（2022-07-12）——他亲口说的几个关键点 **[一手逐字稿：P21]**

这一期逐字稿是本次调研中**信息密度最高的一手长文本**，含大量书中没有的坦白：

1. **他写作此书的目的是"插旗"以求被证伪**：
> "one of the reasons for writing the book was to plant a flag out there and see how many people disagreed with me."（P21）
   他至今的结论是：还没听到有人能拿出"另一套同样有效的体系"。
2. **他自认"设计定理"是普适的（仍在假设阶段）**：
> "my current hypothesis — my working hypothesis — is that in fact there are these absolute principles."（P21）
3. **一个设计通常要三次才做对**：
> "when I design something, it typically takes about three tries before I get the design, right?"（P21）
   第一版很快在实现中崩掉；第二版看起来不错但仍需微调；第三次是细化，然后就比较耐久了。
4. **设计何时做**：他拒绝两端极端（全 upfront 的瀑布 vs 完全不做设计的"设计即调试"），主张"设计一点点 → 实现看后果 → 重新设计"，且**设计永不结束**。
5. **量化投资比例的困难他自己承认**：5–10% 的进度延后是可测量的，但换来的收益无法量化——"no one's ever been able to quantify how much you get back from the good design"。这是他本人对核心论证的一块软肋的坦白。
6. **"Pull complexity downwards" 的原名是 martyr principle**：
> "I originally had a different name for that. I called it the martyr principle."（P21）
   他因为名字太刺激而改掉了，但说他仍然喜欢这个比喻（"martyr"定义为"自己承担痛苦以让别人过得更好"）。
7. **配置参数是"把复杂度往上推"的典型**：他认为人们导出参数常常是因为**自己也不知道该怎么设**，寄望用户比设计者更懂——而现实中用户懂的更少。
8. **"Define errors out of existence" 的原型故事：Tcl 的 `unset`**。他当年认为"删除一个不存在的变量"必然该报错，结果发现用户经常这么做（中断流程后清理变量时并不知道哪些变量存在过），因此这条原则来自他自己踩的坑。
9. ⚠️ **他反复强调这条原则会被误用**：访谈中他先声明"let me first talk about how you kind of apply it, then we can talk about how it was misapplied"。与 CS 190 讲义中"use this idea judiciously: it's easy to take it too far"完全一致。**这是他自己给自己理论装的最明显的一道刹车。**

### 3.4.1 The Pragmatic Engineer 播客（2025-04-09，1h21m）——他对 AI 时代的最新立场 **[一手：P23，含节目页与逐字稿；下引要点由主持人整理，属[二手转述]，但他的直接立场见节目页描述]**

来源：https://newsletter.pragmaticengineer.com/p/the-philosophy-of-software-design
（视频：https://youtu.be/lz451zUlF-k；Spotify / Apple 另有分发）

**这是目前可查的他关于 AI 与软件设计关系最完整的公开表态。核心结论：**

> 节目页原文（**[一手：P23]**）："Stanford professor John Ousterhout thinks not much. In fact, **he believes that great software design is becoming even *more* important as AI tools become more capable in generating code**."

**主持人的要点整理（**[二手转述：P23]**）**：

1. **AI 编码工具 = "tactical tornadoes"（战术龙卷风）**：写得快、修得快，同时**制造新问题、累积技术债**。这是他书中第 3 章的术语被直接用于评价 AI 工具——**这是他把自己的框架外推到 AI 时代的最直接证据**。
2. 他不认为当前工具能取代高层设计；因此**因为代码总量会变多，软件设计反而更重要**。
3. **软件设计本质是分解问题（decomposition）**：他认为"分解"是整个计算机科学最重要的思想——"If you can break up complicated problems into smaller parts: you can solve so many problems!"
4. **TDD 仍被他反对**：理由是"it forces thinking about the small details before thinking about the high-level design"。唯一例外仍是**修 bug 时先写测试**。
5. **他对注释的立场在 AI 时代没有软化**：即便 AI 能帮助理解无注释代码，"they don't eliminate the need for clear, informative comments"。
6. **他本人用 ChatGPT 读 Linux 内核代码**——注意这是**他作为使用者的实践**，而非对 AI 设计的 endorsement。
7. **"Design it twice" 有一个具体出处**：Tk 工具包的 API——"the second design proved superior"。
8. **教学方法被再次确认**：课程模仿英语写作课（写—反馈—重写）；他**亲自逐行评审每个学生的代码**；鼓励学生比较同题的不同解法。
9. 2025 年时他**正在做 Linux 内核的上游贡献**（Homa 传输协议的内核实现），要面对内核社区的评审流程——即**他本人仍在亲身经历"红牌与评审"的现实**。

---

### 3.5 其他重要文章（都在斯坦福主页，可直取） **[一手：P1 / P4 / P5]**

| 文章 | 出处 | 与 APOSD 的关系 |
|---|---|---|
| *Always Measure One Level Deeper* | *Communications of the ACM*, Vol. 61, No. 7, July 2018, pp. 74–83 | 性能章节的方法论基础；主张"测量要再深一层" |
| *A Linux Kernel Implementation of the Homa Transport Protocol* | USENIX ATC '21, pp. 773–787 | 近期系统工作 |
| *It's Time to Replace TCP in the Datacenter* | arXiv 2210.00714 | 近期立场性长文 |
| *The RAMCloud Storage System* | ACM TOCS, Vol. 33, No. 3, Aug 2015, pp. 7:1–7:55 | 早期一手 |
| *Scheduling Techniques for Concurrent Systems* | Proc. 3rd ICDCS, Oct 1982, pp. 22–30 | 获 IEEE TCDP High Impact Paper Award (2020) |
| *The Design and Implementation of a Log-Structured File System* | ACM TOCS, Vol. 10, No. 1, Feb 1992, pp. 26–52 | 与 Rosenblum 合著 |
| *The Role of Distributed State* | *CMU Computer Science: A 25th Anniversary Perspective*, ACM Press, 1991, pp. 199–217 | **注：这是"Role of ..."系列中可查的一篇** |
| *Managing State for Ajax-Driven Web Components* | USENIX WebApps 2010, pp. 73–85 | 与 Stratmann 合著 |
| *Integrating Long Polling with an MVC Web Framework* | USENIX WebApps 2011, pp. 113–124 | 同上 |
| *Fiz: A Component Framework for Web Applications* | Stanford CS Tech Report, Jan 2009 | 组件化/框架设计 |

⚠️ **关于《The Role of Structure in Software Design》的核实结论 [未核实]**
任务书提到他一篇名为 *The Role of Structure in Software Design* 的论文。**在本次抓取到的完整论文列表（P4，Books / Refereed Journals / Refereed Conference Proceedings / Technical Reports 四类，共 90+ 条）中，没有这个标题。** 列表中存在的是 1991 年的 *The Role of Distributed State*。**因此该文标题无法证实**，可能是与他文混淆、或来自未收录的演讲。**不做任何内容推断。**

### 3.6 斯坦福主页上的"非学术"长文（被忽视但很能反映其信念） **[一手：P5]**

"Odds & Ends" 页索引了以下他自己写的文档，它们不属于论文但属于"系统性长文"：

| 文档 | 内容 |
|---|---|
| *Page limits* | 主张会议论文的页数限制应在 camera-ready 版本中取消 |
| *Quals information* | 操作系统与分布式系统博士资格考试信息 |
| *Startup company culture* | 为 Electric Cloud 写的文化文档 |
| *How to make decisions* | 一套"包容、共识驱动"的决策方法 |
| *Fortnight milestones* | 一种简单的软件项目管理法（双周里程碑），Electric Cloud 用过 |
| *Tcl history* | Tcl 发明与 Tcl/Tk 演进史（见 §3.7） |
| *RSI problems* | 他自己的重复性劳损经历与应对 |
| *Survivor Budgeting* | 关于加州州议会财政规划的非常规提案 |
| *Aeolus critique* | 对一篇 Homa 相关论文的公开批评 |

其中 **《How to make decisions》** 与 APOSD 的方法论有直接共鸣：两者都主张"先摆选项再决策"（对应 Design it twice）。**[推断]**

### 3.7《History of Tcl》中的设计思想 **[一手：P6]**

这篇长文表面是语言史，实际是他设计哲学的早期现场记录：

- **三种目标**：语言必须**可扩展**（应用能把自己的特性加进去，且看起来像原生设计）；必须**简单通用**（不限制应用能提供什么）；主要用途是**粘合**（因此集成能力必须强）。
- **组件化动机来自对复杂度失控的恐惧**：他看到交互式软件复杂度快速上升、"最有趣的新发展似乎都需要大投入的大项目"，作为资源有限的教授他担心小团队再也做不出创新的交互系统；结论是"把系统的大部分复杂度放进可复用组件，并把组件跨系统带过去"。
- **诚实承认失误（罕见的自我批评）**：他对自己控制开源项目的方式表示后悔——"In retrospect, I should have been much more promiscuous about bundling things into the core releases, even though it would have violated my principles of cleanliness."（P6）**[一手：P6]**
  这是**"干净"原则与"生态采纳"之间的真实冲突**，且他自己承认当年选错了。
- **"Ouster-votes"**：他在 Tcl 大会上当场举手表决功能优先级，计数方式被社区调侃不客观。他自己在文中也半自嘲地记下了这件事（"Some people have insinuated that my vote counting was less than totally objective...."）。

### 3.8 演讲与视频（存在但本次未能抓取内容）

- "Talks at Google"：*A Philosophy of Software Design | John Ousterhout* → https://www.youtube.com/watch?v=bmSAYlu0NcY（**YouTube 域名被工具解析为非公网地址，本次无法抓取**）
- The Pragmatic Engineer 播客：*The Philosophy of Software Design – with John Ousterhout* → https://www.youtube.com/watch?v=lz451zUlF-k（同上，未能抓取）
- Book Overflow 播客：与 Robert Martin 的后续讨论 → https://www.youtube.com/watch?v=3Vlk6hCWBw0（由 P20 链接）
- **Stanford 官方 "Thoughts For The Weekend" 播放列表**（他教 CS 111 时做的一系列短讲，关于一般人生哲学，已上传 YouTube）→ https://www.youtube.com/playlist?list=PLcs1ZorNr2uTGPZPZnBa408qLVHjbMTzT **[一手：P1]**
- CS 190 幻灯片直链（pptx/pdf，可下载）：`/~ouster/cs190-winter24/slides/` 下含 `raft.*`、`aposd.*`、`raftReview1-2024.*`、`wrapup.*` **[一手：P10]**

---

## 4. 反复出现的核心论点（真信念）

> 判定标准：**在 ≥3 个相互独立的场合出现**（书 / 课程讲义 / 访谈 / 论文 / 个人页面 / 公开辩论）。
> 计数仅统计本次实际核实的来源，实际出现频率应更高。

### 4.1 复杂度是软件系统最大的敌人 ⭐️ 出现 ≥8 次
- 书：第 1 章标题副题即 "It's All About Complexity"；第 22 章 "This book is about one thing: complexity."
- 书末原则 1；第 2 章全章定义。
- CS 190 Class Info："the primary focus is on complexity"。
- CS 190 Intro 讲义："Most important overall goal for design: reduce *apparent complexity*"。
- SE Radio：他自述这**是** uber principle（"the one principle to rule them all, is complexity"）。
- 他甚至给出优先级裁决规则：**若原则与"管理复杂度"冲突，以管理复杂度为准，那条原则在此情形下就是坏原则**（P21）。
- **书序里同一规则被写成一条对读者的授权**："The overall goal is to reduce complexity; this is more important than any particular principle or idea you read here. If you try an idea from this book and find that it doesn't actually reduce complexity, then don't feel obligated to keep using it"（**[一手文本：S1]** Preface）。
- **[一手：P2/P9/P18/S1 + 逐字稿 P21]**

### 4.2 依赖 + 晦涩 = 复杂度的两个根源 ⭐️ 出现 ≥5 次
- 书第 2 章明确："Causes of Complexity: Dependencies / Obscurity"。
- 第 22 章回顾："the root causes that lead to complexity, such as dependencies and obscurity"。
- CS 190 Intro 讲义：列出 dependencies、inconsistencies、special cases 为复杂度来源。
- 他在辩论中把复杂度重新表述为信息问题（见下）。
- **[一手：S1 + P18]**

### 4.3 深模块 vs 浅模块 ⭐️ 出现 ≥7 次
- 书第 4 章整章；书末原则 4 与红牌第一、二条。
- CS 190 APOSD 讨论课讲义列为讨论要点（"Deep and shallow classes"）。
- CS 190 Code Review 讲义列为评审必问（"are the classes too shallow? too deep?"）。
- 辩论中他用 deep/shallow 作为**唯一能同时捕捉两侧权衡**的工具（他认为 Clean Code 的 "One Thing Rule" 只有单边指引）。
- **[一手：P15/P14/P20 + S1]**

### 4.4 接口应比实现简单（the interface should be simpler than the implementation） ⭐️ 出现 ≥6 次
- 书第 4 章（deep 定义）、第 8 章（原则）、书末原则 6。
- CS 190 Project 1："refactor your abstractions to provide the simplest possible interfaces to your classes"。
- 辩论中反复出现。
- **[一手：S1/P12/P20]**

### 4.5 注释描述代码表达不出来的东西（design intent, not implementation） ⭐️ 出现 ≥7 次
- 书第 12、13、15 章（三章！）；书末原则 13；红牌 Comment Repeats Code / Implementation Documentation Contaminates Interface。
- CS 190 讲义讨论要点含 "Comments / Writing comments before code"。
- CS 190 Project 1 **强制**先写接口注释并打 tag。
- 与 Martin 的辩论中他用整整一节为该立场辩护，并现场逐条改写被批评的注释。
- 与 Gergely Orosz 的交流结论："if there are important ideas that cannot be conveyed through the code, then comments are appropriate for them"。
- **[一手：S1/P15/P12/P20]**

### 4.6 战术编程 vs 战略编程 ⭐️ 出现 ≥5 次
- 书第 3 章、第 16 章（改代码时也要 Stay Strategic）；书末原则 2、3。
- CS 190 讲义对应："Tactical programming vs. strategic programming — *Technical debt* is another term for tactical programming"。
- 辩论中他把 TDD 的核心问题归结为"逼人过于战术化"。
- **[一手：S1/P15/P20]**

### 4.7 Design it twice ⭐️ 出现 ≥5 次
- 书第 11 章；书末原则 12；第 21 章再次引用它来判断"什么重要"。
- CS 190 讲义讨论要点（"Design it twice"）。
- 访谈中与个人经验绑定（"typically takes about three tries"）。
- Code Review 讲义要求展示"if you considered alternate designs, say what the alternatives were"。
- **[一手：S1/P15/P14/P21]**

### 4.8 投资心态 / 持续小幅投入设计（"invest in design"） ⭐️ 出现 ≥5 次
- 书第 3 章（10–20%）、第 16 章（每次修改都改进一点点）、书末原则 3。
- CS 190 强制"评审—修改"迭代（Project 2 本质就是投资式的返工）。
- 访谈中他给出"能否让进度慢 5–10%"的可操作说法。
- **[一手：S1/P11/P21]**

### 4.9 不同层，不同抽象 ⭐️ 出现 ≥4 次
- 书第 7 章整章；书末原则 9；红牌 Pass-Through Method。
- CS 190 Project 1 关于"客户端与服务器对网络通信的需求不同，但请找一个对两者都好的 API"（就是这条原则的应用题）。
- **[一手：S1/P12]**

### 4.10 Pull complexity downwards ⭐️ 出现 ≥5 次
- 书第 8 章整章；书末原则 10；第 10 章的 Mask Exceptions 被明确称为"an example of pulling complexity downward"。
- CS 190 讲义讨论要点（"Dependencies / General-purpose vs. special-purpose / ..."）。
- 访谈中给出原名 martyr principle 与配置参数的实例。
- **[一手：S1/P15/P21]**

### 4.11 Pass-through methods / pass-through variables / conjoined methods ⭐️ 出现 ≥4 次
- 书第 7 章两个专节；书末原则 9 + 红牌 Pass-Through Method、Conjoined Methods。
- 辩论中他用 "entangled"/"conjoined" 作为反对过度拆分的核心论据。
- CS 190 明确用红牌清单评审，含这些条目。
- **[一手：S1/P20/P14]**

### 4.12 异常处理破坏封装 / Define errors out of existence ⭐️ 出现 ≥5 次
- 书第 10 章整章；书末原则 11。
- CS 190 讲义讨论要点，**并附限制语**。
- 访谈中给出 Tcl `unset` 的起源故事，并声明会被误用。
- 课程描述里 "error handling" 被列为主题之一。
- **[一手：S1/P15/P21/P8]**

### 4.13 "Always make sure the complexity you add buys you something" ⭐️ 出现 ≥4 次
- 第 7 章末尾结论（"Every design element adds complexity; it must eliminate more complexity than it introduces to be worthwhile"）。
- 第 21 章（"separating what matters from what doesn't"）。
- 性能章：若效率提升只带来微小且隐藏的复杂度则可能值得，否则先做简单设计。
- 访谈中"go with managing complexity"的裁决规则。
- **[一手：S1/P21]**

### 4.14 "Different opinions, stated plainly"——他习惯公开点名分歧 ⭐️ 出现 ≥3 次
- 与 Robert Martin 的整篇公开辩论（2024-09 至 2025-02）。
- 第二版专门插两个小节与《Clean Code》对比。
- 与 Go 风格指南、与 TDD 的对比小节。
- 对 Homa 相关论文的公开批评（P1 的 "Homa Note"：他直言"most of these papers have serious flaws"，并因社区缺少质疑机制而自己在 wiki 里写批评）。
- **[一手：P2/P1/P20]**

---

## 5. 自创术语清单（含定义与出处）

> 术语的英文为他本人的用法；定义尽量用他自己的表述。

| 术语 | 定义 / 用法 | 出处 |
|---|---|---|
| **complexity** | 任何与软件系统结构相关、使系统难以理解和修改的东西 | 书 Ch2；CS 190 Intro |
| **dependencies** | 一段代码无法被孤立地理解与修改时的状态 | 书 Ch2 |
| **obscurity** | 重要信息不显然 | 书 Ch2 |
| **deep module** | 功能多、接口简单的模块 | 书 Ch4 |
| **shallow module** | 接口相对实现而言不够简单的模块（红牌） | 书 Ch4 / 红牌 |
| **information hiding** | 把设计决策封装在模块实现中，不出现在接口里（承自 Parnas） | 书 Ch5 |
| **information leakage** | 同一设计决策反映在多个模块中（红牌） | 书 Ch5 / 红牌 |
| **temporal decomposition** | 按操作执行的时间顺序而非所需知识来划分结构（红牌） | 书 Ch5 / 红牌 |
| **pass-through method** | 几乎只把参数转给另一个签名相近方法的方法（红牌） | 书 Ch7 / 红牌 |
| **pass-through variable** | 沿长调用链一路向下传递的变量 | 书 Ch7 |
| **conjoined method** | 两个方法依赖过深，不懂一个就读不懂另一个（红牌；辩论中他亦用 entangled） | 书 Ch9 / 红牌 / P20 |
| **entanglement / entangled** | 与 conjoined 同义，他在与 Martin 的辩论中反复使用 | P20 |
| **special-general mixture** | 专用代码与通用代码没有干净分离（红牌） | 书 Ch9 / 红牌 |
| **comment repeats code** | 注释信息完全可以从旁边代码看出（红牌） | 书 Ch13 / 红牌 |
| **overexposure** | API 迫使调用者为了用常用功能而了解罕用功能（红牌；Java I/O 为典型） | 书 Ch4 / 红牌 |
| **classitis** | "类越多越好"的误信导致大量极小的浅类 | 书 Ch4 |
| **tactical programming / tactical tornado** | 只求尽快把功能做出来的短视编程；技术债的同义词 | 书 Ch3 |
| **strategic programming** | 投资心态：花时间做出干净设计并修问题 | 书 Ch3 |
| **the increments of software development** | 增量应当是**抽象**，而不是功能（书末原则 15） | 书 Summary p.156 |
| **design it twice** | 对每个重要决策考虑多套（尽量迥异的）方案再定 | 书 Ch11 |
| **pull complexity downward** | 模块作者自己承担复杂度，让使用者轻松（原称 martyr principle） | 书 Ch8；P21 |
| **exception aggregation** | 用一处代码处理一整类异常 | 书 Ch10 |
| **masking (mask exceptions)** | 在低层把异常情形处理掉，高层无需知道 | 书 Ch10 |
| **define errors out of existence** | 改 API 语义使原本的错误情形不再算错误 | 书 Ch10 |
| **design special cases out of existence** | 把特殊情况设计掉，而不是加 `if` 分支 | 书 Ch10 |
| **red flags** | 提示设计有问题的征兆清单（书末 14 条，CS 190 用作评审起手式） | 书 Summary；CS 190 讲义 |
| **apparent complexity** | 设计要降低的是"表面的复杂度" | CS 190 Intro 讲义 |
| **somewhat general-purpose** | 接口通用但功能只满足当前需求——他推荐的甜点区 | 书 Ch6 |
| **the one principle to rule them all** | 他自称的"统领一切的唯一原则"= 复杂度 | SE Radio |
| **martyr principle** | "Pull complexity downwards" 的原名，他因名字过于刺激而改 | SE Radio |
| **Hard to Describe / Hard to Pick Name / Vague Name** | 三条与命名/文档相关的红牌 | 书 Summary |

---

## 6. 推荐书单与思想渊源

### 6.1 他本人公开推荐的书与文档 **[一手：P2]**

他在 APOSD 页面明确列出：

1. **与 Robert Martin 的公开辩论文档** *A Philosophy of Software Design vs Clean Code*（GitHub，含 Method Length / Comments / PrimeGenerator 重写 / TDD 等主题）。他的评价是这是一场坦率的求同存异。
2. **《The Art of Readable Code》** by Dustin Boswell & Trevor Foucher。他的评语："written at a lower level than APOSD (more about coding than design), but it is compatible with APOSD in philosophy has a bunch of good ideas."（原文如此，含语法小瑕疵）
3. **《The Grug Brained Developer》** by Carson Gross（grugbrain.dev）。评语："will make you laugh so hard you will fall out of your chair; it also contains some big grains of truth."
4. **《Writing system software: code comments》** by Salvatore Sanfilippo（antirez，Redis 作者）。——选这篇显然是为了支撑他的"注释"立场。
5. 课程层面还推荐：Ritchie & Thompson 的 Unix 论文、Rob Pike 关于 Google 软件复杂度的博客、*Students' Guide to Raft*、Raft 可视化站、Protocol Buffers 文档。**[一手：P9/P8]**

### 6.2 明确的思想渊源（有证据的）

| 渊源 | 证据 | 强度 |
|---|---|---|
| **David Parnas — 信息隐藏** | **最强证据：书序直接点名并给出年份判断**——"David Parnas' classic paper 'On the Criteria to be used in Decomposing Systems into Modules' appeared in 1971, but the state of the art in software design has not progressed much beyond that paper in the ensuing 45 years."（**[一手文本：S1]** 的 Preface）。另有 SE Radio 节目笔记单独列出 Parnas 论文与 *Software Fundamentals: Collected Papers by David L. Parnas*（**[一手：P21]**）。**这不是"影响"，是他对自身理论位置的自认：他的书就是在 Parnas 之后 45 年把这条线往前推。** | **极强** |
| **Christos Kozyrakis — "deep/shallow" 术语** | 书序致谢原文："Christos Kozyrakis suggested the terms 'deep' and 'shallow' for classes and interfaces, replacing previous terms 'thick' and 'thin'."（**[一手文本：S1]**）**即：他全书最核心的术语对，最初是 thick/thin，由同事改成 deep/shallow。** | **极强（有明文）** |
| **Geoff Colvin —《Talent is Overrated》** | 书序原文引用该书作为"高质量练习 > 天赋"的科学依据，用以支撑"软件设计可否被教授"的假设（**[一手文本：S1]**）。这是**他教学法的理论支点**。 | **强（有明文）** |
| **Ritchie & Thompson（Unix）** | 书序把他亲历的项目列出（"I've worked on teams that created three operating systems from scratch..."）；CS 190 有专门一讲《The UNIX Time-Sharing System》，整讲是"用最少机制消灭区别"的案例教学（"Eliminate distinctions: power comes from making everything look the same; find the least common denominator"，**[一手：P17]**） | **强** |
| **书稿评审者名单（隐性智识圈层）** | 书序致谢 15 人，含 **Brian Kernighan、Rob Pike、Jeff Dean、Sanjay Ghemawat**（**[一手文本：S1]**）。注意：**提供评论 ≠ 认同全部主张**，仅可作"经高水平同行阅读"的证据。 | 中（有限度证据） |
| **Robert C. Martin（Clean Code）** | **最主要的公开对话者/论战对象**。第二版专设对比小节；2024-09 至 2025-02 有一场系统性书面辩论。**这是"分歧型渊源"而非"继承型渊源"。** **[一手：P2/P20]** | 强（对立） |
| **Edward Tufte** | 他在"Facts precede concepts"箴言中引用 Tufte 的 **"general-specific-general"** 教学法。**[一手：P3]** | 中 |
| **Rob Pike** | 由他本人推荐在 CS 190 课程页上（"Blog post from Rob Pike on software complexity issues at Google"）。**课程推荐阅读，可视为同调。** **[一手：P8]** | 中 |
| **Kent Beck / XP** | 与 Kent Beck 有间接交集：Martin 在辩论中说明 `Clean Code` 第 34 页那个"2–4 行函数"的例子是"the *Sparkle* applet that Kent Beck and I wrote together in 1999 as an exercise for learning TDD"（**[一手：P20]**）。但这是 **Martin** 的叙述，**Ousterhout 本人未表达对 Beck/XP 的师承**；他对 XP 的近亲 TDD 明确批评。 | 间接 |
| **Erich Gamma — 设计模式** | 书第 19 章设 "Design patterns" 一节，立场是**"不是每个问题都能被已有模式干净解决；硬套模式会带来更多复杂度"**。他**引用该概念但持保留态度**，未表达师承。 | 中（作为批判对象） |
| **John Bransford & Barry Stein — The Ideal Problem Solver** | **仍未核实。** 已补检书序（Preface）与致谢名单，**均未出现**。该书"IDEAL 五步解题法"与 Design it twice 思路有相似性，但**相似不等于引用，不做断言**。 | **未核实** |
| **Fred Brooks —《人月神话》** | **仍未核实。** 书序与致谢中**未出现**；二手页面（senior-stack.uz）把 Brooks 的 essential/accidental 之分之一与其并列，但那是**他人对比**，不是他本人的引用。 | **未核实** |
| **John Gall — 系统论（Systemantics）** | **未找到任何直接引用证据。** [未核实] | 未核实 |

> **诚实结论**：任务书列出的四项渊源中，**Parnas 已获极强证据（书序明文）**；Bransford & Stein、Brooks、Gall **三项在本次已抓取的全部一手材料（含书序与致谢名单）中仍未出现**。这三项若存在，只能位于**书末参考文献或正文脚注**中，而本次无法读取 PDF 正文。**建议后续用可读 PDF 的工具复核，不要凭推测填充。**

---

## 7. 自我修正、版本差异与立场变化

### 7.1 第二版的三处显式改动 **[一手：P2]**

1. **新增 Ch21 "Decide What Matters"**。这是从"具体设计技巧"上升到"价值判断方法论"的一步：他开始回答"该怎么决定哪些才重要"这个更上位的问题，并把全书各章都重新解释为这条原则的实例（"Many of the ideas in the preceding chapters have at their heart the notion of separating what matters from what doesn't"）。
2. **第 6 章（General-Purpose Modules are Deeper）重写并扩充**，且从其他章搬来材料。他的自述是：**"the importance of choosing general-purpose approaches has become even more clear to me"**——即在"专用 vs 通用"这个具体分歧上，他的立场**变得更硬**，而不是软化。
3. **新增与《Clean Code》的对比小节（两章）**。这等于把原本隐含的立场显式化，并公开点名分歧（方法长度、注释角色）。

### 7.2 他在访谈与辩论中承认的自我修正

| 事项 | 具体内容 | 出处 |
|---|---|---|
| **TDD 描述错误（明确认错并承诺修订）** | Martin 指出他书中第 157 页对 TDD 的描述不准确（他写的版本漏掉了 TDD 的"三条法则"与红-绿-重构循环）。他的回应是："**Oops! I plead 'guilty as charged' to inaccurately describing TDD. I will fix this in the next revision of APOSD.**"——但**他强调这会修正描述，不会改变他对 TDD 的实质批评** | **[一手：P20]** |
| **"Pull complexity downwards" 改名** | 原名 martyr principle，因"a little bit too inflammatory"而改掉，但他仍喜欢这个比喻 | **[一手：P21]** |
| **Tcl 核心采纳策略（承认当年过严）** | "In retrospect, I should have been much more promiscuous about bundling things into the core releases, even though it would have violated my principles of cleanliness."——**这是"干净原则"与"生态现实"冲突时他自己承认判断失误的案例** | **[一手：P6]** |
| **"define errors out of existence" 需要刹车** | 书里他已写了 "Taking it too far" 一节；CS 190 讲义上另加提醒；访谈里他专门先讲"会被误用"。属于**三重自我约束** | **[一手：S1/P15/P21]** |
| **对"是否只有一套正确设计哲学"保持假设状态** | "my current hypothesis — my working hypothesis — is that in fact there are these absolute principles"（用词是 hypothesis，不是结论） | **[一手：P21]** |

### 7.3 与 Martin 辩论后的实际让步与不让步（逐条，保留张力） **[一手：P20]**

| 议题 | Martin 的立场 | Ousterhout 的立场 | 是否让步 |
|---|---|---|---|
| 方法长度 | "The first rule of functions is that they should be small. The second rule is that they should be *smaller than that*." | 过度分解制造 shallow + entangled 方法；deep/shallow 才能捕捉两侧权衡 | **未让步**（但 Martin 承认自己书里确实缺少"何时算过头"的指引） |
| One Thing Rule | 一个方法做"一件事"即可 | 该规则模糊、易滥用，且在很多情况下就是错的（如加锁 + 临界区本就该在同一方法里） | 未让步 |
| 注释 | 注释是"失败"的补偿；用方法名替代注释 | 注释承载代码**无法表达**的信息（抽象、意图），是必需品 | **未让步，立场极硬**（"Clearly you and I live in different universes when it comes to comments."） |
| TDD | 三条法则 + 红绿重构 | 过于战术化、抑制设计思考；适用于修 bug，不适合主导开发 | 未让步（但**承认书中描述有误**） |
| 代码示例 | 指出 Ousterhout 的改写同样让他费力 | 承认 Martin 的改写"a considerable improvement over the version in Clean Code" | **双向让步**（各自承认对方版本也有价值） |
| 性能 | （未主动提） | **他主动指出 Martin 的改写带来 3–4 倍性能回归** | Ousterhout 得分（Martin 承认："Good catch! I would have caught that too had I thought to profile."） |

**结论性观察**：这场辩论的结局是**分歧未消解**——Martin 最终说"apparently, neither of our methodologies were sufficient to rescue our readers from such struggles"，Ousterhout 说"Clearly you and I live in different universes when it comes to comments"。**这本身是重要的证据：他的核心信念（注释、深模块、反对过度分解）不是未被检验，而是经过强对手的正面检验后仍未改变。**

### 7.4 需要保留的矛盾点

见 §8。

---

## 8. 矛盾与张力（不做调和）

### 8.1 事件驱动/线程：他 1996 年的立场与 APOSD 第 18 章存在张力 **[冲突]**

- 1996 年演讲《Why Threads Are A Bad Idea》：他认为 **events（单线程）产生更简单、更可管理的代码**，并主张"许多被推荐使用线程的应用（包括几乎全部 UI 应用）用事件驱动实现更好"。
- APOSD 第 18 章把 **"event driven programming where application responds to external occurrences; hard to follow flow of control"** 列为**让代码更不显然**的因素。
- 两说并列：可以解释为"相对于线程，事件更简单；但事件本身仍不如顺序代码显然"——**但这是他本人在不同年代给出的两种不同侧重，本次调研不替他调和。** **[一手：P5 + S2]**

### 8.2 他的"异常"立场遭到实践者系统性反对 **[冲突]**

- Ousterhout：异常处理是软件复杂度最大的来源之一，应尽量"定义掉"。
- Gergely Orosz（The Pragmatic Engineer，2019 书评）：**明确不认同**。他认为后端系统里异常是好事（"as long as they are thoroughly monitored and alerted on"），只有客户端软件（移动/桌面）才适用屏蔽异常；而"崩溃应用"在移动端根本不可行。**[二手：S3]**
- 同一篇书评还反对他把"事件驱动"列为不显然，理由是分布式与多线程下"没有别的选择"。**[二手：S3]**

### 8.3 他对测试的态度被批评为书中的最大缺口 **[冲突]**

- 他的书只在第 19 章"软件潮流"里讨论单元测试与 TDD，且对 TDD 评价负面；第 16 章"修改既有代码"花了大量篇幅讲"保持战略 + 维护注释"，**几乎没有把测试作为修改代码的安全网**。
- Gergely Orosz：**"Testing was absent from the book"**；他认为"好的架构与可测试性相伴而行"，并直言他修改既有代码的方法与自己的现实不符——"The surest and safest way I know to modify existing code is to have tests."**[二手：S3]**
- Orosz 补充说：他为此与 Ousterhout 邮件往来，Ousterhout 的回应是**这本书聚焦于架构，其他主题被有意排除在范围外**。**[二手：S3]**
- 两说并列保留：作者说"有意划界"，批评者说"这是缺口"。

### 8.4 "干净/严格"与"生态采纳"的矛盾（他自己承认过） **[冲突，他自己承认]**

- Tcl 早期他严格把关核心（"I was fairly picky about which extensions I included in the core"），结果拖慢了功能积累。
- 他的事后判断："In retrospect, I should have been much more promiscuous about bundling things into the core releases, even though it would have violated my principles of cleanliness."
- **矛盾点**：他的设计哲学（干净、深模块、少接口）在真实生态竞争中曾被他自己判定为"过于严格"。这是他自己提供的最有力的反例。**[一手：P6]**

### 8.5 关于"是否只有一套正确的设计哲学" **[张力]，他本人保持假设状态**

- 一方面他主张存在"absolute principles"；另一方面他明确用 hypothesis 的措辞，并说"**I'd be delighted to hear if anybody else thinks they have a different universe that also works well.**"
- 与 Martin 的辩论持续半年、双方均未改变核心立场——**这既是"他的原则经得起对撞"的证据，也是"原则确实存在流派之争"的证据**。不替他裁决。

### 8.6 关于 CS 190 的"复杂度评分" **[未核实]**

- 任务书假设课程含复杂度评分机制。公开材料中只有红牌清单 + 一对一评审 + 迭代返工，没有量化评分表。**如后续需要，应索取课程原始评分 material 才能确认。**

---

## 9. 未核实 / 无法核实的清单（诚实交代）

| 事项 | 状态 | 原因 |
|---|---|---|
| 《The Role of Structure in Software Design》 | **[未核实]** | 完整论文列表（90+ 条）中无此标题；仅有 1991 年 *The Role of Distributed State* |
| CS 340 "Advanced Topics in Software Design" | **[未核实 / 倾向否定]** | 他的教学记录中从无 CS 340；斯坦福 CS340 课号存在但为 "Topics in Computer Systems" |
| "Designing for Testability"、"Designing for Error Handling"、"Comments Revisited" 为第二版新增章 | **[未核实 / 倾向否定]** | 两版目录均无这些章名；作者本人列出第二版仅 3 处改动 |
| Bransford & Stein《The Ideal Problem Solver》为其援引来源 | **[未核实]** | 已补检书序（Preface）全文与致谢名单，均未出现；可能位于书末参考文献（无法读取 PDF） |
| Brooks《人月神话》、John Gall 系统论为其渊源 | **[未核实]** | 同上，书序与致谢中均未出现 |
| CS 190 的"复杂度评分（complexity scoring）"机制 | **[未核实 / 倾向否定]** | 公开材料中不存在量化评分；只有红牌清单 + 一对一评审 + 迭代返工（见 §2.7 G） |
| "tactical tornado" 一词的确切书中定义与页码 | **[部分核实]** | 概念确属其体系（2025 播客以该词评 AI 工具），但本次未取到书中原文定义句 |
| 第一版是否有 Conclusion 章 / 第一版小节清单是否完整 | **[部分核实]** | 第一版小节来自第三方笔记（S2），可能存在缺漏；故 §1.3.2 中"第二版新增"的判定已标注不确定性 |
| 第二版相比第一版在**具体措辞层面的所有**差异 | **[部分核实]** | 稿本对比需要两版全文（PDF 不可读）；目前只能采信作者自述 + 二手逐章笔记 |
| YouTube 演讲正文内容（Talks at Google、Pragmatic Engineer 播客、Book Overflow） | **[未抓取]** | YouTube 域名被工具解析为非公网地址，无法抓取；仅能确认其存在与链接 |
| Raft 论文、scripting 论文、threads slides 的**原文引用** | **[未抓取]** | PDF 内容类型不受支持 + shell 无 TLS 凭证 |

---

## 10. 供后续引用核验的原文短句汇编（全部 ≤25 词）

> 用途：便于他人引用时逐条核对。默认来自第二版正文（**[一手文本：S1]**）。

| # | 原文 | 出处 |
|---|---|---|
| 1 | "Complexity is anything related to the structure of a software system that makes it hard to understand and modify the system." | Ch2 |
| 2 | "This means that the greatest limitation in writing software is our ability to understand the systems we are creating." | Ch1 |
| 3 | "Because software is so malleable, software design is a continuous process that spans the entire lifecycle of a software system" | Ch1 |
| 4 | "Beautiful designs reflect a balance between competing ideas and approaches." | Ch1 |
| 5 | "One of the best ways to improve your design skills is to learn to recognize red flags" | Ch1 |
| 6 | "This book is about one thing: complexity." | Ch22 |
| 7 | "Good design doesn't really take much longer than quick-and-dirty design, once you know how." | Ch22 |
| 8 | "The phrase 'good taste' describes the ability to distinguish what is important from what isn't important." | Ch21 |
| 9 | "One of the most important elements of good software design is separating what matters from what doesn't matter." | Ch21 |
| 10 | "Separate what matters from what doesn't matter and emphasize the things that matter." | Summary, p.171 |
| 11 | "The increments of software development should be abstractions, not features." | Summary, p.156 |
| 12 | "Software should be designed for ease of reading, not ease of writing." | Ch18 / Summary p.151 |
| 13 | "Comments should describe things that are not obvious from the code." | Summary, p.101 |
| 14 | "Design it twice." | Summary, p.91 |
| 15 | "Define errors out of existence." | Summary, p.81 |
| 16 | "Pull complexity downward." | Summary, p.61 |
| 17 | "Different layers should have different abstractions." | Summary, p.51 |
| 18 | "General-purpose modules are deeper." | Summary, p.39 |
| 19 | "Modules should be deep." | Summary, p.23 |
| 20 | "Working code isn't enough." | Summary, p.14 |
| 21 | "Complexity is incremental: you have to sweat the small stuff." | Summary, p.11 |
| 22 | "It's more important for a module to have a simple interface than a simple implementation." | Summary, pp.61, 74 |
| 23 | "Interfaces should be designed to make the most common usage as simple as possible." | Summary, p.27 |

**来自他本人其他一手材料的原文短句**：

| # | 原文 | 出处 |
|---|---|---|
| 24 | "In July of 2021 I released the Second Edition of *A Philosophy of Software Design*." | [P2] |
| 25 | "There are only a few significant changes from the First Edition" | [P2] |
| 26 | "It may not be worth buying the Second Edition if you already own the First Edition." | [P2] |
| 27 | "the importance of choosing general-purpose approaches has become even more clear to me" | [P2] |
| 28 | "I have retired, so I am no longer teaching on a regular basis. In particular, CS 190 is unlikely to be offered again." | [P1] |
| 29 | "the primary focus is on complexity" | [P9] |
| 30 | "Your most important goal is to create a clean, simple, and elegant code structure." | [P12] |
| 31 | "I will be judging it primarily on its structure" | [P12] |
| 32 | "Focus on red flags: aspects of the design that suggest problems." | [P14] |
| 33 | "Could someone who has never seen the code write the comments just by looking at the code next to the comment?" | Ch13 |
| 34 | "Define errors out of existence — Note: use this idea judiciously: it's easy to take it too far" | [P15] |
| 35 | "Technical debt is another term for tactical programming" | [P15] |
| 36 | "The greatest performance improvement of all is when a system goes from not-working to working" | [P3] |
| 37 | "Use your intuition to ask questions, not to answer them" | [P3] |
| 38 | "If you don't know what the problem was, you haven't fixed it" | [P3] |
| 39 | "If it hasn't been used, it doesn't work" | [P3] |
| 40 | "The three most powerful words for building credibility are 'I don't know'" | [P3] |
| 41 | "Coherent systems are inherently unstable" | [P3] |
| 42 | "The most important component of evolution is death" | [P3] |
| 43 | "Facts precede concepts" | [P3] |
| 44 | "one of the reasons for writing the book was to plant a flag out there and see how many people disagreed with me" | [P21] |
| 46 | "my current hypothesis — my working hypothesis — is that in fact there are these absolute principles" | [P21] |
| 47 | "when I design something, it typically takes about three tries before I get the design, right?" | [P21] |
| 48 | "I originally had a different name for that. I called it the martyr principle." | [P21] |
| 49 | "Oops! I plead 'guilty as charged' to inaccurately describing TDD. I will fix this in the next revision of APOSD." | [P20] |
| 50 | "Clearly you and I live in different universes when it comes to comments." | [P20] |
| 51 | "In retrospect, I should have been much more promiscuous about bundling things into the core releases" | [P6] |
| 52 | "This may be the only course in the world dedicated entirely to software design" | [P18] |
| 53 | "I now think that over-specialization may be the single greatest cause of complexity in software." | Ch6（第二版） |
| 54 | "When I first started teaching my software design course I leaned towards the second approach..., but after teaching the course a few times I changed my mind." | Ch6（第二版，立场反转自述） |
| 55 | "the sweet spot is to implement new modules in a somewhat general-purpose fashion" | Ch6 |
| 56 | "In order for an element to provide a net gain against complexity, it must eliminate some complexity that would be present in the absence of the design element." | Ch7 |
| 57 | "Exception handling is one of the worst sources of complexity in software systems." | Ch10 |
| 58 | "if a reader thinks it's not obvious, then it's not obvious" | Ch13 |
| 59 | "The design of large software systems falls in this category: no-one is good enough to get it right with their first try." | Ch11 |
| 60 | "when I design something, it typically takes about three tries before I get the design, right?" | [P21] |
| 61 | "It isn't that you aren't smart; it's that the problems are really hard!" | Ch11 |
| 62 | "the design of a mature system is determined more by changes made during the system's evolution than by any initial conception" | Ch16 |
| 63 | "Whenever you encounter a proposal for a new software development paradigm, challenge it from the standpoint of complexity" | Ch19 |

> 说明：本表条目均来自本次实际抓取到的文本，未做任何补写。凡本次无法读取的载体（PDF 正文、YouTube 视频）一律不在此表内。

---

## 11. 一句话总结（供上层判断，不下结论）

他真正的信念体系只有一个内核：**软件的唯一根本约束是人类的理智力，因此设计的唯一目标是压低"表观复杂度"**；其余所有术语（deep module、information hiding、pull complexity downwards、define errors out of existence、design it twice、comments-first）都是这一个内核在不同场景下的投影；而他的**教学法**（CS 190：三个项目 + 红牌清单 + 一对一评审 + 强制返工 + 注释先于代码）才是这套信念真正被反复验证的地方——这也许是他对"软件设计可否被教授"给出的最实质的回答。

---

*文件结束。全部来源 URL 见 §0.3 / §0.4。*
