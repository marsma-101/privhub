# John Ousterhout 决策记录与实际行动（05）

> 调研对象：John K. Ousterhout（斯坦福大学计算机科学系荣休教授，《A Philosophy of Software Design》作者，Tcl/Tk 与 Raft 的作者之一）
> 本文只记录**他做了什么**，与**他说了什么**分开列示；凡言行张力处，如实标注。
> 采集日期：2026-09-17（本地时间）。所有链接均为调研当时实际抓取成功的一手/二手页面。

## 0. 本文件的可信度标注与信息纪律

- **[一手]**：本人撰写的页面/论文/邮件列表补丁/课程页面/其本人参与的对话记录中由他本人说出或写下的原话。
- **[二手]**：他人（维基、企业官方文档、媒体）的记录。
- **[推断]**：萧潇本人的推断，已明确标注，不代表事实。
- **[未核实]**：本次调研未能找到可信来源，明确写在文内，不做补全。
- 信息源黑名单（本文件**未使用**）：知乎、微信公众号、百度百科/百度知道。Tcl 与 Raft 的技术事实使用 Tcler's Wiki、官方文档与论文原文。
- 采集工具的客观限制（影响可复核性）：
  - 本会话的 `web_fetch` **无法解析 PDF**（返回 `unsupported content type "application/pdf"`），故 Raft 论文正文、APOSD 前言 PDF、1994 年 Tcl 实现报告只能通过其镜像/转写页间接引用；凡引用 PDF 内容处均已注明获取途径。
  - Bing 引擎在本环境对英文技术查询返回大量无关结果（中文垃圾结果），可用引擎为 anysearch、keenable、deepseek-official。**本文件的搜索发现主要来自 keenable/anysearch**，抓取主要来自官方一手页面。

## 1. 履历时间线（全部一手，来自本人 Stanford 主页）

来源：https://web.stanford.edu/~ouster/cgi-bin/home.php （页面自标 “Last updated: January 21, 2026”）[一手]

| 时间 | 事实 |
| --- | --- |
| 1975 | Yale 大学物理学 BS |
| 1980 | Carnegie Mellon 大学计算机科学 PhD |
| 1980–1994 | UC Berkeley 计算机科学教授（Magic 版图编辑器、Crystal 时序分析器、Sprite 网络操作系统、log-structured file system、Tcl、Tk） |
| 1994–1998 | Sun Microsystems Laboratories，Distinguished Engineer |
| 1998–2000 | 创办 Scriptics Corporation 并任 CEO，目标是把 Tcl 开发工具商业化 |
| 2002–2007 | 创办 Electric Cloud；主导 ElectricAccelerator（并行构建）与 ElectricCommander（分布式流程管理 Web 服务器） |
| 2008 | 回到学术界，斯坦福 CS 系 |
| 现在 | 已退休（本人自述 “I have retired, so I am no longer teaching on a regular basis. In particular, CS 190 is unlikely to be offered again.”；“I am no longer taking on new research students.”） |

获奖（同一页）：ACM Software System Award (1997，授予 Tcl)、ACM Fellow (1994)、ACM Grace Murray Hopper Award (1987)、美国工程院院士 (2001)、IEEE Reynold B. Johnson 信息存储系统奖 (2014)、Stanford Tau Beta Pi Teaching Honor Roll (2023)。

**对她任务描述的核实结果（重要）**：任务里给出的公司时间线「1994 年离开伯克利创办 Sun Microsystems Laboratories 的 Scriptics」「Scriptics 1997-1998 创立，1999 年 Ajuba Solutions，2000 年被 Interwoven 收购」需要拆开核对：

- 1994 年他去的是 **Sun Labs（受雇，非创办）**；Scriptics 是 **1998 年 1 月**由他本人创办。所以「1994 年创办 Scriptics」不成立。
- 「1999 年 Ajuba Solutions」不准确：**Ajuba 是 1999 年决定转型做 XML B2B 服务器、公司随后改名**，改名发生在 **2000 年 5 月**（Tcler's Wiki 版本明确写 “Scriptics was renamed Ajuba Solutions in May, 2000”）。
- 「2000 年被 Interwoven 收购」正确：**2000 年 10 月**。

## 2. 方向一：Tcl/Tk 的创立与商业化决策

### 2.1 事实链（一手）

主来源：Ousterhout 本人撰写的《History of Tcl》
- 斯坦福版：https://web.stanford.edu/~ouster/cgi-bin/tclHistory.php （Last updated: June 8, 2021）[一手]
- tcl-lang.org 镜像（含 Jeff Hobbs 等人补写的段落）：https://www.tcl-lang.org/about/history.html [一手＋二手混排]

时间与决策点：

1. **1987 年秋（DEC Western Research Lab 休假期间）**产生「可嵌入命令语言（embeddable command language）」的想法。动机是他在 Berkeley 做 IC 设计工具（Magic、Crystal）时，每个工具的命令语言都又弱又怪、无法复用，他觉得「tiresome and embarrassing」。
2. **1988 年初**开始写 Tcl，**1988 年春**第一次用在图形文本编辑器里。Tcl = Tool Command Language。他自述当时认为「除我之外不会有人对可嵌入命令语言感兴趣」，所以「mostly academic」。→ 这是「先解决自己的重复问题」的决策，不是产品决策。
3. **1988 年末**开始做 Tk，**1990 年末**才可用（两年，业余项目）。Tk 的动机是：GUI 复杂度飞涨，教授的小团队资源有限，唯一出路是「用可复用组件拼大系统」，而组件拼装需要一个强大的集成机制——他判断那个机制就是 Tcl。
4. **1989 年**开始把 Tcl 送人；**1990 年 1 月**在 USENIX 讲 Tcl，随后把源码放到 Berkeley FTP 公开。传播靠口碑。
5. **1994 年 5 月**加入 Sun（Sun Labs），组了 Tcl 团队（三年内到 12 人）。**离开学术界的原因（他的原话）**：“I'd always wanted to spend part of my career in industry, and after 14 years in academia the time seemed right.” 而接受 Sun 的**商业判断**是：“I had always felt that Tcl would eventually need to have profitable businesses built around it in order to survive over the long term.” 并且 Sun 承诺核心 Tcl/Tk 继续免费以源码形式发布（“Sun honored this agreement faithfully”）。
6. **1997 年下半年决定从 Sun 剥离创业**，理由（原话）：“it became clear that Sun needed to focus its language evangelism around Java... I came to the conclusion that, overall, Java offered more benefits for Sun than Tcl did.” → **离开的直接原因是公司的资源与话语权向 Java 倾斜，不是 Tcl 技术失败。**
7. **1998 年 1 月**与 Sarah Daniels（VP Marketing and Sales）创办 Scriptics；一个月内 Sun Tcl 团队约一半人加入；第一件产品 TclPro（开发工具集）**1998 年 9 月**发布。Scriptics 同时接手 Tcl 核心开发，并继续免费发布核心。
8. **1999 年 4 月**发布 Tcl/Tk 8.1（Unicode、线程安全、Henry Spencer 新正则）。
9. 商业模式两阶段（他自述）：先做 Tcl 开发工具，再做基于 Tcl 的应用；1999 年选定方向为「基于 XML 的 B2B 服务器」，2000 年初出第一版。随后 dot-com 泡沫破裂、B2B 市场整合，2000 年中决定卖公司。公司已改名 Ajuba Solutions，**2000 年 10 月被 Interwoven 收购**。
10. **退出的善后动作（这是最能体现其决策风格的一处一手事实）**：他预判 Interwoven 不会继续支持开源 Tcl，于是在 **2000 年 7–10 月**主动把核心开发的「所有权」从单一公司转移到更广的开源社区，**2000 年成立 Tcl Core Team** 并确立运作流程。此后他完全退出 Tcl 开发（“I have not had an active role in Tcl's development since 2000”）。
11. **1997 年** ACM Software System Award 授予 Tcl；**1998 年春**他得知 Tcl 同时获得 ACM Software System Award 与 USENIX STUG Award。

### 2.2 「Tcl 是设计哲学反例」这个张力：如实记录

**张力 A：本人 1998 年的商业化宣言**
- 文章：《Free Software Needs Profit》，*Communications of the ACM*，Vol. 42, No. 4，1999 年 4 月，pp. 44–45。来源：其官方出版列表 https://web.stanford.edu/~ouster/cgi-bin/publications.php [一手（题录）]
- 意义：他在 Tcl 商业化上的核心主张，是「免费软件需要利润才能长期存活」。这与今天 APOSD 里「设计/简洁/降低复杂度」是两套话语——前者的判据是商业存续，后者的判据是复杂度。**同一个人在两件事上用了两套、并不互相校验的判据。**

**张力 B：「一切皆字符串」的批评 vs. 他的设计哲学**
- 批评方的代表性文本：「Tcl the Misunderstood」，Salvatore Sanfilippo（antirez，Redis 作者），2006-03-06，https://antirez.com/articoli/tclmisunderstood.html [二手]。
  - 他逐条讲清 Tcl 的 EIAS（everything is a string）与「一切皆命令」，并且**态度是辩护而非否定**；他给出的关键批评是人事性的：「most of its limitations are not hard coded in the language design, they are just the result of the fact that Tcl lost its 'father' (John Ousterhout) a number of years ago... any kind of single-minded strong leadership」。
  - 他也指出具体设计争议点，例如数学不是内建命令而依赖 `expr`，他认为这是 design error。
- Tcler's Wiki 的 EIAS 条目：https://wiki.tcl-lang.org/page/EIAS [二手]；对应还有「everything is a list」条目 https://wiki.tcl-lang.org/page/everything+is+a+list [二手]。
- 公开的从业者争论样本（Hacker News 讨论串，仅作舆论记录，不当作事实依据）：https://news.ycombinator.com/item?id=42220078（SQLite 早期版本采用 Tcl 式「一切皆字符串」原则，2004 年后改变）[二手]。

**萧潇的判断（[推断]，请主子自行拍板）**：说 Tcl「与他的设计哲学矛盾」只有在下面这个意义上才成立——
1. Tcl 的**语言层**设计（极小核心、一切皆命令、一切皆字符串）恰恰是他「深模块 / 简单接口 / 通用性」哲学的极端贯彻，是**一致**的，不是反例；
2. 真正可查证的**自我批评**出现在项目管理而非语言设计：他在 Tcl 历史页里明确承认自己对核心过于洁癖——“In retrospect, I should have been much more promiscuous about bundling things into the core releases, even though it would have violated my principles of cleanliness.”
   → 他的「保持干净」原则直接导致 Tcl 核心功能积累变慢、生态受损。**这是他本人承认的、原则压过效果的案例。**
3. 另一个可查证的自评：他主导的 Tcl 社区决策方式（“Ouster-votes”，大会上举手数票）被社区长期调侃「计数不客观」；他自己也写“Some people have insinuated that my vote counting was less than totally objective....” 而他 2021 年的《Open Decision-Making》一文把这种举手投票正式升格为「open decision-making」方法论的一环——**即：一个被调侃的草率做法，后来被他自己制度化、正当化。**（来源：tclHistory.php；https://web.stanford.edu/~ouster/cgi-bin/decisions.php ）[一手]

### 2.3 Tcl 相关的一则亲口澄清（一手，新近）

来源：PLDB 访谈《A brief interview with Tcl creator John Ousterhout》，Hassam Alhajaji，2023-02-08；Tcler's Wiki 摘录其原话：
https://wiki.tcl-lang.org/page/%7BA+brief+interview+with+Tcl+creator+John+Ousterhout%7D+%7BHassam+Alhajaji%7D+%7B2023+02+08%7D [一手（引语）]

- “Jim Clarke and Marc Andreessen approached me about the possibility of my joining Netscape as a founder, but I eventually decided against it (they hadn't yet decided to do Web stuff when I talked with them).”
- “I'm not sure that Tcl would actually be a better language for the Web than JavaScript, so maybe the right thing happened.”
→ 关键决策：**他拒绝了一次 Netscape 创始团队的机会**；并且他公开承认 Tcl 未必优于 JavaScript。这是「不给自己贴金」的一手证据。

## 3. 方向二：从系统研究转向软件设计教学

### 3.1 决策链条（一手）

- **2008 年**回到学术界（前有 Electric Cloud 五年产业经历）。来源：home.php [一手]
- **2014–2015 学年（Spring 2015）**首次开 CS 190「Software Design Studio」。来源：https://web.stanford.edu/~ouster/cgi-bin/cs190-spring15/info.php [一手]
- **开课动机（他 2015 年课程页原文三点）**：
  1. 「Other CS classes teach you how to write correct code and how to write efficient code. This class will teach you how to write *beautiful* code」；
  2. 最好程序员比平均好 10–100x，但「we do little to teach our students the skills required to become elite programmers」；
  3. 「the most important idea in all of Computer Science is *problem decomposition*... Unfortunately, none of our classes teach students how to decompose problems.」
  并且他明确说：「CS 190 is an experiment to see if it is possible to teach the art of software design.」
- **2015 年首版 CS 190 的技术栈与项目**：Java；三个项目依次为 Tweeter Web Service（Twitter 式服务）、Revised Tweeter、Tweeter Extension（第三阶段把别组的项目打散重组，让学生接手别人的代码再加功能）。来源：cs190-spring15/info.php、/projects.php [一手]
- **课程演进**：到 Winter 2019/2020 已改为 **C++**，项目改为 Raft 领导者选举 → Raft 加日志的复制 shell → `clash`（类 bash shell）。来源：https://web.stanford.edu/~ouster/cgi-bin/cs190-winter20/projects.php 、.../raft1.php 、.../clash.php [一手]
- **教了几轮才写书**：APOSD 第一版前言原文 “I have now taught the software design class three times, and this book is based on the design principles that emerged from the class.” 来源（中英对照转写）：https://www.bookstack.cn/read/A-Philosophy-of-Software-Design-zh/docs-preface.md [一手（引语）／转写页为二手]
  - 注：该转写页只含**第一版**前言（未含第二版前言）。本条与 §5.3 中引用的所有前言内容均已注明来自第一版前言，请勿当作第二版原文引用。第二版前言的完整文本本次未能获取（PDF 不可解析），**未核实**。
- **他自述的资格来源（同一前言）**：职业生涯写了约 25 万行代码；参与从零建过三个操作系统、多个文件/存储系统、调试器与构建系统、GUI 工具箱、一门脚本语言、多种交互式编辑器；“I never had a mentor to teach me design principles. At the time I learned to program, code reviews were virtually nonexistent.”
- **工业经验如何转成课程（一手证据）**：CS 190 的反馈机制明确对标写作课——“The most important element of this class is iteration: you will write some code, get feedback, and rewrite, much like an English writing class.”（cs190-spring15/info.php、cs190-winter20/info.php）[一手]

## 4. 方向三：Raft 的决策

### 4.1 决策动机（一手，来自他本人的项目页）

来源：https://web.stanford.edu/~ouster/cgi-bin/projects.php （Last updated: July 9, 2025）[一手]

原文要点（Raft 段，2012–2014）：
- 「As part of implementing RAMCloud, we needed a consensus algorithm in order to maintain replicated cluster configuration data.」
- 「We initially considered using Paxos, but found it incredibly difficult to understand. Furthermore, the Paxos architecture requires complex changes to support practical systems.」
- 「As a result, we decided to see if we could design a new consensus algorithm with better properties Paxos. **The most important goal was for the algorithm to be easy to understand and reason about**; in addition, we wanted a formulation that is practical for real implementations.」

结论：**选「可理解性」当首要目标是需求驱动的，不是审美驱动的**——他们自己读不懂 Paxos，而 RAMCloud 需要一个能落地的共识算法，所以把「人能读懂」直接设为第一设计目标，把「实用可实现」设为第二目标。这是「用真实工程痛感生成设计原则」的典型样本。

### 4.2 与 Paxos 的对比动机 / 官方表述

来源：https://raft.github.io/ [一手（项目官网，由其学生与本人维护）]

- “Raft is a consensus algorithm that is designed to be easy to understand. It's equivalent to Paxos in fault-tolerance and performance. The difference is that it's **decomposed into relatively independent subproblems**, and it cleanly addresses all major pieces needed for practical systems.”
  → 注意这里的用词：**decomposed**。与他在 CS 190/前言里反复强调的 “problem decomposition 是 CS 最重要的问题” 完全同源。Raft 的设计手法就是把「可理解性」翻译成「分解成相对独立的子问题」（leader election / log replication / safety）。
- 论文：D. Ongaro and J. Ousterhout, “In Search of an Understandable Consensus Algorithm,” USENIX ATC '14, pp. 305–319（获该会 Best Paper）；扩展版为 raft.pdf。论文地址：https://raft.github.io/raft.pdf 、https://web.stanford.edu/~ouster/cgi-bin/papers/raft-atc14.pdf [一手]
- 学生指南（长期被各校引用的第三方一手材料）：https://thesquareplanet.com/blog/students-guide-to-raft/ [二手]

### 4.3 Ongaro 与 Ousterhout 的角色分工

可核实的事实（[一手]）：
- 论文署名为 **Diego Ongaro and John Ousterhout**（Ongaro 在前）——Ongaro 是博士生、Raft 的第一作者与实现者；Ousterhout 是导师与共同作者。
- Diego Ongaro 的博士论文《Consensus: Bridging Theory and Practice》扩展了论文内容，并包含更简单的成员变更算法与 **TLA+ 形式化规范**。来源：https://raft.github.io/ （指向 github.com/ongardie/dissertation）[一手（官网陈述）]
- Raft 用户研究（user study）的教学材料署名：raft.github.io 的 Talks 区列出 “Lecture for the Raft User Study ... by **John Ousterhout**, March 2013”（视频 YouTube，幻灯片 PDF）——即**可理解性实验的教学环节由 Ousterhout 亲自讲**；Ongaro 负责大量对外演讲（2013–2015 多场）。[一手]
- **角色分工的精确边界：[未核实]**。公开材料只能确证「Ongaro 主导实现与论文、Ousterhout 提供课题与设计目标、且 2023 年 Ousterhout 仍在课上把 Raft 当教学素材」，无法核实「谁提出了哪个具体机制」。不做补全。

### 4.4 Raft 在工业界的采纳，如何反过来验证「可理解性」主张

以下均为**企业官方文档**（[一手]：企业对自己系统的权威描述；对 Ousterhout 的主张而言属于「他人的验证性证据」）：

| 系统 | 官方表述 | 来源 |
| --- | --- | --- |
| etcd（Kubernetes 的配置存储） | 其学习文档专设 Raft 相关设计页（如 learner 设计），etcd 的复制与选举建立在 Raft 之上 | https://etcd.io/docs/v3.5/learning/ ；https://etcd.io/docs/v3.5/learning/design-learner/ |
| HashiCorp Consul | “This page provides conceptual information about the Raft protocol and its implementation in Consul.”；“Raft is a consensus algorithm that Consul implements to manage distributed datacenter operations.” 并链接 raft.github.io 与 thesecretlivesofdata.com 作为入门材料 | https://developer.hashicorp.com/consul/docs/concept/consensus |
| TiKV | 明确采用 Multi-Raft（每 Region 一个 Raft group，节点上管理多个 Raft 组），并有专门的 Raft 深潜章节 | https://tikv.org/deep-dive/scalability/multi-raft/ ；https://tikv.org/deep-dive/consensus-algorithm/raft/ |
| CockroachDB | 复制层（Replication Layer）官方文档：复制层 “implementing our consensus algorithm”，技术细节首节即 “Raft”，说明 leader/follower/non-voting replica、election timeout、心跳与日志复制 | https://docs.cockroachlabs.com/docs/stable/architecture/replication-layer |

**这份「采纳清单」对「可理解性」主张的验证强度（萧潇判断，[推断]）**：
- 强正向：Raft 被四个量级不同的生产系统采用，且这些系统的官方文档都把 Raft 当作**工程师可以照着自己实现**的协议来描述（CockroachDB 甚至给出具体超时值、etcd 给出 learner 机制、TiKV 直接讲多组管理），这与「可理解 → 可被大量团队独立实现」的因果链一致。
- 需要打折的地方：这些系统里也被大量工程改造（CockroachDB 的 non-voting replicas、leaseholder 与 Raft leadership 共置、per-replica circuit breaker；TiKV 的 Multi-Raft 批处理轮询）。也就是说，**Raft 可理解 ≠ 生产级共识可简单**；「可理解」红利主要在协议层，不在系统层。这一点在 Ousterhout 自己的表述里也不否认（他要的是 “easy to understand and reason about”，不是「够用即止」）。
- 论文里的用户研究数据（Section 9）：**本次未能核实具体数字**（论文 PDF 无法解析；章节转写页 https://jakiewoo.gitbooks.io/in-search-of-an-understandable-consensus-algorith/content/chapter-9.html 返回 401）。如需引用具体人数/题数与分数，请以官方 raft.pdf 的 §9.1 为准。

## 5. 方向四：写书的决策

### 5.1 出版方式与版本事实（一手）

来源：https://web.stanford.edu/~ouster/cgi-bin/aposd.php （Last updated: February 26, 2025）；https://web.stanford.edu/~ouster/cgi-bin/publications.php [一手]

- 出版方：**Yaknyam Press（自出版）**。第一版 2018 年 4 月，178 页；第二版 **2021 年 7 月**（ISBN 978-1-7321022-1-7），平装与电子版均在 Amazon 上架。
- 译本：德文版由 **O'Reilly** 于 **2021 年 10 月**出版（*Prinzipien des Softwaredesigns*）；中文版由**人民邮电出版社于 2024 年 11 月**出版。
- **为什么自出版：[未核实]**。本次调研未找到他关于「为何不找传统出版社」的直接陈述（尝试过 Artima/ADUni 旧访谈页，均 404；GitHub API 与 GitHub 网页在本会话不可达）。可以确证的只有：出版方是他自有的 Yaknyam Press，且他把两版差异说明、与 Clean Code 的对比、第二版新增章节抽印 **都免费放在自己的主页上**（`aposd2ndEdExtract.pdf`），并明确写 “It may not be worth buying the Second Edition if you already own the First Edition.”（aposd.php）[一手]。→ 「不鼓励重复购买」这一事实本身可佐证其非商业优先的取向，但**不能**用来断言自出版的动机。

### 5.2 第一版 → 第二版改了什么、为什么（他的原话）

来源：https://web.stanford.edu/~ouster/cgi-bin/aposd.php [一手]

他列出的「只有几处重大变化」：
1. 新增一章 **“Decide What Matters”**，讲好的设计在于区分「什么是重要的 / 什么不重要」并专注在重要的事上。
2. 第一版之后，**「选择通用方案（general-purpose approaches）的重要性对他而言变得更加清楚」**，因此重写并扩充第 6 章（General-Purpose Modules are Deeper），并把其他章的部分材料移入第 6 章。
3. 在两章中加入小节，**把自己的设计哲学与 Robert Martin 的《Clean Code》做对比**，并直言「we have significant differences of opinion on topics such as the length of methods and the role of comments」。

→ 第 2 条是**他本人承认的认知变更**（不是勘误，是立场加重），第 3 条是主动把冲突公开。两版变化说明文档开放下载：「For the benefit of people who already purchased the First Edition, I have made the two new chapters and the comparisons with *Clean Code* available in a book extract.」

### 5.3 他如何收集反馈（一手）

- **课堂**：前言说明书源自 CS 190 三轮教学；“I am indebted to the students in CS 190; the process of reading their code and discussing it with them has helped to crystallize my thoughts about design.”（前言转写页）[一手（引语）]
- **具名审阅者名单（第一版前言列出）**：Jeff Dean、Sanjay Ghemawat、John Hartman、Brian Kernighan、James Koppel、Amy Ousterhout、Kay Ousterhout、Rob Pike、Partha Ranganathan、Keith Schwartz、Alex Snaps；术语 “deep / shallow” 由 **Christos Kozyrakis** 建议（替代原先的 thick/thin）。（前言转写页）[一手（引语）]
- **公开与读者互动的固定渠道**：Google Group `software-design-book`（前言中给出邮箱入口），并明确征集「可放进未来版本的、能在一两段话说清的具体例子」。[一手（引语）]
- **开放讨论纠错**：见 §7.2 的 APOSD vs Clean Code 讨论。

## 6. 方向五：课程与项目的具体实践

### 6.1 CS 190 的「设计评审」机制（一手）

来源：https://web.stanford.edu/~ouster/cgi-bin/cs190-winter20/reviewMeeting.php 、.../info.php [一手]

- 形式：三个项目、**两人一组**、课程以 studio 形式进行，大部分课时用于代码评审（code review）；课程限选 **18 人**，理由是「so that I can read all of your code」（2015 年首版限 20 人，理由相同）。
- 「设计评审」的具体操作（他写给学生的说明）：
  - 他**逐份**写详细代码评审，再与每个小组**单独开一小时会**（在他的办公室 Gates 352，用投屏）；
  - 会上要求同时打开 pull request 评论与 IDE；
  - 他标记为 “Let's discuss” 的评论**逐条过**；
  - 学生须提前读完评论；组内分工为 “driver”（展示）与 “note taker”（直接在 PR 上加评论）；
  - 明确提醒会议会超时，别在会后马上排事。
  → 这是**把「一次性评审」变成「可执行的对话流程」**的具体设计，不是口号。
- 迭代闭环：Project 1（从头写）→ 课堂代码评审 + 他的书面评审 + 一对一 → Project 2（据此重构并加功能）→ 再一轮评审 → Project 3（从零做新系统，或接手他组代码）。

### 6.2 他要求学生写的 design documents / 强制动作（一手）

来源：cs190-winter20/raft1.php 、.../clash.php [一手]

- **强制「注释先于代码」**：Project 1 与 Project 3 均硬性要求——对至少一个非平凡源文件，**先写顶层声明与接口注释，再填方法体**，并把这个骨架版本做成一个提交、打上 tag `commentsBeforeCode1` / `commentsBeforeCode3`，提交信息里写明文件名。原文推荐但不强制对全部文件这么做。
  → 这是他书中「写注释是一种设计工具 / 先写注释」原则在课程里的**可验收动作化**（把设计行为转成 commit + tag，可核对）。
- **禁止照抄现成方案**：「you must work from scratch, without using or consulting any existing code that offers similar functionality, such as existing communication libraries or implementations of Raft」；不许用 gRPC 之类的网络库，必须直接用 socket 系统调用；不许用现成数据库/存储系统做持久化，必须用 C/C++ 文件 I/O。理由是「so that you can make design decisions on your own. In addition, many existing packages have bad interfaces, so they may not serve as good models.」
- **评分口径**：Project 1 明确规定「Although I expect your code to work... I will be judging it primarily on its structure; it's better to spend time cleaning up the structure and documentation than fixing minor bugs.」→ **结构优先于功能完成度**，这是明确的取向声明。
- **第三次项目的设计预期管理**（clash）：「it's unlikely you will be able to get the design right on the first try... plan on dividing your design time: spend some time up front, but plan on a major redesign phase after you start coding.」→ 与「Design it twice」是同一主张的课程版。
- **工程约束**：4 空格缩进、行宽 ≤ 80 字符、提交为 GitHub PR（base 为 master）、README 必须能让他自己在笔记本上跑起来；日志与调试要求写清楚（分布式系统不能下断点）。
- **入学申请题目（Winter 2020，共 8 问，≤400 词）**中有一问直接考设计观：「In your opinion, what are the most important things that distinguish well-designed code from poorly-designed code?」并特别提示要谈 **代码** 的性质而非应用功能特性（并举例「usability 是应用的好性质，但对代码说得不多」）。来源：application.php [一手]

### 6.3 学生代码评语风格（公开证据的边界）

- **可确证**：评审风格是**逐行、公开、强度高**，且他事先给学生的心理准备极其直白（cs190-winter20/info.php 原文）：
  - “No-one's code will be anywhere near perfect and everyone will receive intense criticism.”
  - 明确要求批评对事不对人；
  - 明确说了分数不受「被批评多少」影响，但受「你分析别人代码有多深刻、从批评中学到多少」影响。
- **可确证的评语样本（真刀真枪的公开原话）**：2024–2025 年他与 Robert Martin 的公开讨论中，他逐句点评对方的 `PrimeGenerator` 代码，原话包括：“The code is chopped up so much (8 teeny-tiny methods) that it's difficult to read.” “These methods are shallow and entangled.” “If there is one thing more likely to result in bugs than not understanding code, it's thinking you understand it when you don't.” 以及指对方重构造成 «a factor of 3-4x slowdown»。来源：https://github.com/johnousterhout/aposd-vs-clean-code/blob/main/README.md [一手]
- **具体学生项目页面：[未核实]**。CS 190 的团队仓库是**私有 GitHub repo**（由他创建后发给学生），公开学生项目页/评语页本次未找到；同时 2022 年后的 CS 190 课程页在Stanford 站点已下线（`cs190-winter24`、`cs190-winter22` 等路径均返回 404，仅主页索引保留课程名）。**不作编造。**

## 7. 方向六：言行一致 / 不一致的案例

### 7.1 一致：主张「Design it twice」，他自己的项目确实做了

- **Tk 的 API 是他自己举的例子**：2025 年 4 月 Pragmatic Engineer 播客的文字总结明确写道：“**'Design it twice:'** John advocates for this. For example when he designed the API for the Tk Toolkit: **the second design proved superior**.” 来源：https://newsletter.pragmaticengineer.com/p/the-philosophy-of-software-design （Gergely Orosz，2025-04-09；页面含逐段转写与时间轴）[一手（其人在节目中的陈述，经节目方整理）]
- **Raft 是把「第二次设计」做成了公开的产品**：他们放弃 Paxos、重新设计一个以可理解性为首要目标的协议，并在论文与官网明确写「结构化分解成独立子问题」。
- **RAMCloud 的重设计痕迹（一手）**：他本人的项目页记录了在实现过程中「struggling to write these modules」之后，改为 **rules-based programming** 来做分布式并发容错模块，并专门发了 USENIX ATC 2015 论文《Experience with Rules-Based Programming for Distributed, Concurrent, Fault-Tolerant Code》。→ 这是「第一次设计不行，回头重做并写下来」的实证。来源：projects.php 与其出版列表 [一手]
- **课程里的制度化**：clash 项目明确要求学生预留「coding 之后的大重设计阶段」（见 §6.2）。

### 7.2 不一致 / 自我纠错（含他本人承认的错误）

1. **他对 TDD 的描述是错的，他本人当众认错并承诺改书。**
   - Robert Martin 指出 APOSD 第 157 页对 TDD 的描述不准确（“This is just wrong.”）。Ousterhout 的回应原文：“**Oops! I plead 'guilty as charged' to inaccurately describing TDD. I will fix this in the next revision of APOSD.**”
   - 但同时他坚持实质立场：他反对 TDD 的理由（让人过度战术化、抑制设计思考），并承认自己提的替代方案（“bundling”）与 TDD 在收益上「大致相同」。
   - 来源：aposd-vs-clean-code README（该文档自述是 **2024 年 9 月至 2025 年 2 月**两人线上＋线下讨论的结果）[一手]
   - **状态**：截至本次调研（2026-09），**未核实** APOSD 是否已发布包含该修正的版本（其主页最新只提到 2021 年第二版与 2024 年中文版）。
2. **他的原则压过效果：Tcl 核心洁癖（他本人承认）。** 见 §2.2 张力 B 第 2 点，原话 “In retrospect, I should have been much more promiscuous about bundling things into the core releases, even though it would have violated my principles of cleanliness.”
3. **他公开承认自己「否决群体共识」几乎总是错的。** 《Open Decision-Making》原文：“In my career I have overridden several consensuses and **I was wrong in every case but one.**... over time I have become more and more reluctant to override the group consensus. The group is usually right!”（decisions.php）[一手]
   → 这条与 APOSD 里「设计者要下判断、要坚持」的强主张之间存在真实张力：**在设计上他主张强势判断，在组织决策上他主张服从共识。**
4. **他对 AI 的判断与他自己的实践存在拉扯**：他 2025 年说 AI 编码工具像 “tactical tornadoes”（快、能修、但制造技术债），同时又说自己做 Linux 内核活时**会用 ChatGPT 帮助理解内核代码**（Pragmatic Engineer 节目 1:09:20 段落标示 “How John uses ChatGPT to help explain code in the Linux Kernel”）。[一手（节目整理）] → 立场上警惕、工具上用，属「立场与实践不完全对齐」，但他并未回避这一点。
5. **可理解性主张与生产复杂度的落差**：见 §4.4 的「需要打折」段。

### 7.3 关于「把设计评审变成产品」这件事的一致与不一致

- 一致：他 2025 年仍在讲台上做设计评审——Berkeley CS 61B Spring 2026 课堂上，他作为客座讲了 **Software Engineering I**（2026 年 4 月 6 日，Lecture 29，讲师栏标注 “John Ousterhout”，且有课堂录像）。来源：https://sp26.datastructur.es/ （课表与讲师标注）、课程日历页 https://sp26.datastructur.es/calendar/ [一手（课程官方页面）]
- 不一致之处（[推断]，标注风险）：他在 CS 190 里把「结构优先于功能」「注释先于代码」「设计两次」都做成了**可验收动作**；但这些动作绑定在**他的课**（限 18 人、本人逐份读代码）上，**不可规模化**。他自己 2026 年在斯坦福主页上确认 CS 190 「unlikely to be offered again」——也就是说，他最有力的教学干预手段目前已停止复制。这不是言行不一，而是**方法可复制性的现实边界**。

## 8. 方向七：近期行动（2024–2026），以可核实的时间戳为准

| 时间 | 行动 | 来源 | 可信度 |
| --- | --- | --- | --- |
| 2024-09 至 2025-02 | 与 Robert “Uncle Bob” Martin 就 APOSD vs Clean Code 进行系列讨论，成果公开在 GitHub（含逐代码点评、TDD 认错） | https://github.com/johnousterhout/aposd-vs-clean-code/blob/main/README.md | [一手] |
| 2024-11 | APOSD 中文版由人民邮电出版社出版 | https://web.stanford.edu/~ouster/cgi-bin/aposd.php | [一手] |
| 2025-04-09 | Pragmatic Engineer 播客长篇访谈：谈 AI 编码（“tactical tornadoes”）、Design it twice、TDD/Clean Code 分歧、设计评审用法、他用 ChatGPT 读内核代码；主持人记录他当时「正在给 Linux 内核提交 Homa」 | https://newsletter.pragmaticengineer.com/p/the-philosophy-of-software-design | [一手（节目整理）] |
| 2025-06-09 | 向 netdev 提交 `[PATCH net-next v9 00/15] Begin upstreaming Homa transport protocol`（邀测/评审中） | https://lore-kernel.gnuweeb.org/netdev/20250609154051.1319-13-ouster@cs.stanford.edu/t | [一手（邮件原文）] |
| 2025-10-15 | 提交 `[PATCH net-next v16 00/14]`；正文显示该系列约 **8211 行**源码（net/homa/*），完整版 Homa 约 15000 行；说明「本系列功能可用但性能与 TCP 相当」，并强调 Homa 相对 TCP 对短消息尾延迟有 10–100x 改善 | https://lwn.net/Articles/1042323/ | [一手（邮件原文，LWN 转载）] |
| 2025-08 | v14/v15 系列存在（修 Author 邮箱、代码清理）；[推断] 2025-08 至 2026-05 期间仍在迭代（搜索可见 v16 引用日期 2026-05-22 的 LWN 条目） | 同上各 lore/lwn 链接 | [一手/推断] |
| 2026-04-06 | 在 UC Berkeley CS 61B（讲师 Josh Hug、**Kay Ousterhout**）客座讲授 Lecture 29 Software Engineering I，有录像 | https://sp26.datastructur.es/ | [一手（课程官方）] |
| 2026-01-21 | 斯坦福个人主页仍在维护（页脚 “Last updated: January 21, 2026”），并明确 CS 190 大概率不再开课、不再招研究生 | https://web.stanford.edu/~ouster/cgi-bin/home.php | [一手] |

**明确写「未核实」的近期事项**：
- **是否有新书/第三版**：[未核实]。截至 2026-09，其主页只列 2021 年第二版与 2024 年中文版；未发现第三版或新书的一手公告。
- **是否正式「退休」/何时退休**：[部分核实]。他本人页面自述已退休且不再带新学生（home.php，2026-01-21 更新）；**退休生效日期未核实**。
- **Homa 是否已被 Linux 主线合并**：**未核实**（只能确认 v16 系列在 2025-10-15 提交、并在 2026 年上半年仍被讨论）。
- **2026 年的新论文**：其官方出版列表页最后更新为 2022-10-06（publications.php），此后未见新条目，因此不能断言「无新论文」，只能标注未核实。
- **他关于 AI 编程的系统性长文**：[未核实]；目前可证实的只是 2025 年播客中的口头判断（tactical tornadoes、设计更重要、用 ChatGPT 读内核代码）。

## 9. 三个最关键的决策（萧潇的提炼，供主子拍板）

1. **1997–1998：从 Sun 剥离、创办 Scriptics 把 Tcl 商业化，并在卖掉公司前主动把 Tcl 核心交给社区（Tcl Core Team, 2000）。**
   判据来源：Sun 全力押 Java（一手自述）、Tcl 需要商业体才能长期存活（一手自述）。退出时的动作是「先把治理权交出去，再走」——这是本次调研里最能体现「他在离开时仍对生态负责」的一手事实。
2. **2012–2014：放弃 Paxos，为 RAMCloud 重新设计一个以「可理解性」为首要目标的共识算法（Raft），并把「可理解」翻译成「分解成相对独立的子问题」。**
   判据来源：他本人项目页明写「Paxos 极难理解」＋「最重要目标是 easy to understand and reason about」；Raft 官网明确写 “decomposed into relatively independent subproblems”。此决策的后果被四个以上生产系统的官方文档反向验证。
3. **2014–2015：把「设计」当成一门可以教的课（CS 190），并用写作课式的迭代（写→评审→重写）＋强制动作（注释先于代码、结构优先于功能、禁止照抄现成实现）来承载。**
   判据来源：CS 190 Spring 2015 课程页原文明说这是一次实验，动机是「最好的程序员 10–100x」与「没有任何课教问题分解」；APOSD 前言说明书写于教了三轮之后。

## 10. 言行不一致的发现（结论）

- **最硬的一条（本人当众认错）**：APOSD 第一版对 TDD 的描述不准确，他承认 “guilty as charged” 并承诺在下一版修正（与 Robert Martin 讨论，2024-09 至 2025-02）。
- **最实质的一条（原则压过效果，他本人回顾时承认）**：Tcl 核心因他「保持干净」的原则而功能积累过慢；他事后认为当初应当「much more promiscuous」。
- **制度风格上的一条**：他在**设计**上主张强势判断与坚持（Design it twice、结构优先），在**组织决策**上却主张服从共识，并自述「多次否决群体共识、几乎每次都错」。
- **Tcl「设计反例」这个流行说法，本次调研给出的结论是「不成立（至少在语言层）」**：EIAS/一切皆命令是「简单、通用、深接口」哲学的极端贯彻，与他后来的主张同源；可查证的真实张力在**项目管理洁癖**与**商业上的两套判据**，不在语言设计。
- 另外两条较轻的张力：警惕 AI 却用 ChatGPT 读内核代码；把「自己逐行读代码」当作教学核心，却承认这门课大概率不再开、方法不可规模化。

## 11. 来源清单（按可信度分层）

**一手（本人页面/论文/邮件/课程页/其参与的公开对话）**
1. https://web.stanford.edu/~ouster/cgi-bin/home.php
2. https://web.stanford.edu/~ouster/cgi-bin/tclHistory.php
3. https://www.tcl-lang.org/about/history.html （同一文本的镜像，含他人补写的 Ajuba 段）
4. https://web.stanford.edu/~ouster/cgi-bin/projects.php
5. https://web.stanford.edu/~ouster/cgi-bin/publications.php
6. https://web.stanford.edu/~ouster/cgi-bin/aposd.php
7. https://web.stanford.edu/~ouster/cgi-bin/decisions.php
8. https://web.stanford.edu/~ouster/cgi-bin/sayings.php
9. https://web.stanford.edu/~ouster/cgi-bin/misc.php
10. https://web.stanford.edu/~ouster/cgi-bin/faq.php
11. https://web.stanford.edu/~ouster/cgi-bin/cs190-spring15/info.php ／ .../lecture.php?topic=intro ／ .../projects.php ／ .../lecture.php?topic=workshop1
12. https://web.stanford.edu/~ouster/cgi-bin/cs190-winter19/... ／ .../cs190-winter20/info.php ／ .../projects.php ／ .../raft1.php ／ .../clash.php ／ .../reviewMeeting.php ／ .../application.php ／ .../lectures.php
13. https://raft.github.io/
14. https://github.com/johnousterhout/aposd-vs-clean-code/blob/main/README.md
15. https://lore-kernel.gnuweeb.org/netdev/20250609154051.1319-13-ouster@cs.stanford.edu/t
16. https://lwn.net/Articles/1042323/
17. https://newsletter.pragmaticengineer.com/p/the-philosophy-of-software-design （2025-04-09 访谈整理）
18. https://sp26.datastructur.es/ ／ https://sp26.datastructur.es/calendar/
19. https://wiki.tcl-lang.org/page/John+Ousterhout ／ .../page/History+of+Tcl+and+Tk ／ .../page/%7BA+brief+interview+with+Tcl+creator+John+Ousterhout%7D+...
20. https://www.bookstack.cn/read/A-Philosophy-of-Software-Design-zh/docs-preface.md （第一版前言中英对照转写，引语可溯源到原著）

**二手（他人记录/企业官方文档/第三方整理）**
21. https://antirez.com/articoli/tclmisunderstood.html （Salvatore Sanfilippo，2006）
22. https://wiki.tcl-lang.org/page/EIAS ／ .../page/everything+is+a+list
23. https://developer.hashicorp.com/consul/docs/concept/consensus
24. https://etcd.io/docs/v3.5/learning/ ／ .../learning/design-learner/
25. https://tikv.org/deep-dive/scalability/multi-raft/
26. https://docs.cockroachlabs.com/docs/stable/architecture/replication-layer
27. https://news.ycombinator.com/item?id=42220078 （Bing 检索到的公开讨论，仅作舆论样本）

**已尝试但失败的来源（供复核者免于重复劳动）**
- en.wikipedia.org（本环境解析到非公网 IP，抓取被拒）
- Artima / ADUni 旧访谈（404）
- 各 PDF（Raft 论文、APOSD 正文、1994 Tcl 实现报告）：`unsupported content type "application/pdf"`
- github.com / api.github.com（本会话网络不可达）
- 知乎/微信公众号/百度：按黑名单要求主动排除，未访问
