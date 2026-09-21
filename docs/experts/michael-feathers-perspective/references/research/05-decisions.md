# 05 决策记录与行动：Michael Feathers

> 调研对象：Michael C. Feathers（1971 年生，美国软件工程师/顾问，R7K Research & Conveyance 创始人兼 Director，原 Obtiva 首席科学家、Object Mentor International 顾问，《Working Effectively with Legacy Code》作者）。
>
> 本文件只记录**可溯源**的决策、转折点与争议点。每条给：背景 / 他的逻辑 / 结果 / 事后反思 / 来源 / 可信度。
>
> 信源分级：
> - `[一手]` = 他本人的文字、逐字访谈稿、本人演讲摘要、本人出镜的书目录
> - `[二手]` = 他人转述、他人现场笔记、活动主办方页面、出版方页面
> - `[推断]` = 由多源拼出的时间线或动机，原文没有直接说
> - `[冲突]` = 任务书前提与公开证据不一致，或来源之间互相矛盾
> - `未找到确证` = 检索后确实没有可靠证据，不编造

**一条贯穿全篇的先行发现（重要）**：Feathers 有极强的客户保密纪律，且被采访者反复试探时明确拒绝。Tech Done Right 播客里主持人问"你见过最糟的代码是什么"，他回："I can't. Because of NDA, I can't really sort of broadcast the domain but I've seen some crazy things." `[一手]`（[noelrappin.com 逐字稿](https://noelrappin.com/audio/tdr-011/transcript/)）因此第四节里他自述的"真实项目"多为**去标识化**的：行业 + 年份 + 症状 + 他的动作，很少给公司名。这不是资料缺失，而是他的行为模式本身——本文件的第四节据此组织。

---

## 一、职业决策轨迹

### 1.0 时间线（多源拼合）

| 时间 | 事件 | 证据强度 |
|---|---|---|
| ~1971 | 出生 | 任务书给定 |
| 大学 | 数学专业；自学 C 起步，后在学校学 Pascal | `[一手]` GOTO Bookclub 2023 逐字稿 |
| 入行前 9–10 年 | 纯编程岗，"worked in various roles through the technical hierarchy" | `[一手]` Tech Lead Journal #195 |
| 入 Object Mentor 之前 | 设计过一门专有编程语言并写了编译器；设计过跨平台类库；做过仪器控制框架 | `[一手]` Artima 博主简介（2005） |
| 1999 前后 | 在会议上认识 Kent Beck、Ron Jeffries，接触早期 Agile/XP | `[一手]` Tech Lead Journal #195 |
| ~2000 | **离开技术岗，转做顾问**（Object Mentor International，Senior Consultant） | `[一手]` Tech Lead Journal #195 + 多份官方 bio |
| 2004 | 《Working Effectively with Legacy Code》出版（Prentice Hall，Robert C. Martin 系列） | `[一手]` 书本身 / 出版方 |
| 2005 | OOPSLA 2005 他挂名 "Michael Feathers, Object Mentor"，主持 panel 并开 tutorial | `[二手]` OOPSLA 2005 议程页 |
| 2006 | 在 Artima 写博客（至少到 2006 年），后转 TypePad，再转 Silvrback | `[一手]` Artima 存档 |
| ~2009–2011 | Obtiva **Chief Scientist** | `[二手]` 多份会议 bio、StickyMinds |
| 2011 | Obtiva 被 Groupon 收购 | `[二手]` 行业新闻，未单独核实 |
| 2012 | Groupon **Member of the Technical Staff** | `[二手]` PyCon Canada 2012 / Strange Loop 2012 讲者页 |
| 2012–2014 之间 | **创办 R7K Research & Conveyance**，自称"one person company" | `[推断]`：2012 年 bio 仍是 Groupon，2014-11 CERN 活动页已是 R7K Founder/Director |
| 2021-01-07 | **加入 Globant 任 Chief Architect** | `[二手]` Globant/PR Newswire 官方通稿 |
| 2023-04 | GOTO Bookclub 访谈里自我介绍 "I'm a chief architect of Globant, but I also do training and consulting independently as well" | `[一手]` |
| 2024-07 起 | Leanpub 上增量写《AI Assisted Programming》 | `[一手]` |
| 2025-12 | YOW! Sydney 讲 "Conceptualisation" + masterclass "Forces in Software: Understanding the Physics of Software Evolution" | `[二手]` 主办方页面 |
| 2026-01 | 播客《Hard Boiled Software》第 1 期嘉宾："The Skills That Survive AI" | `[一手]`（节目页由其团队发布，内容为对话） |

### 决策 D1：放弃纯技术岗，转做"到处跑的顾问"

- **背景**：1999 年前后认识 Kent Beck / Ron Jeffries；他自己说当时"已经是个不错的程序员（I was a good programmer and everything）"，但发现这些人"真的深入想过怎么变得更好"。他开始在自己公司试重构，并被告知要 test first。
- **他的逻辑（原话）**：
  > "And they were also saying things like, you should write your tests first. Why would you do it any other way? I thought this was kind of like a very bold thing for them to go and say, but then I understood after I did it for a while. And it helped me realize I could reduce the stress of programming a great deal." `[一手]`（Tech Lead Journal #195）
- **同时有一条更私人化的动机线**（他主动讲出来的）：
  > "I started as like a mathematics major in school… I read about this mathematician named Paul Erdős… he lived with a suitcase and would go from place to place and sort of work with other mathematicians… Then I kind of realized… if you're doing that, you're not really helping people, right, directly. So I've had much more fun going and working with people." `[一手]`
- **结果**："So after that I was hired to be a consultant. I left the tech job that I had. And the job was to go around to different places and to help them acquire technical practices that are part of Agile."
- **事后反思**：他把这段经历直接推导成书——"invariably it's kind of like you run into a situation where people have tons and tons of code. And they just don't know quite what to do with it."
- **来源**：https://techleadjournal.dev/episodes/195/ ；https://www.artima.com/weblogs/viewpost.jsp?thread=105102
- **可信度**：高（本人逐字稿 + 同期博客简介互证）

### 决策 D2：从 Object Mentor 转 Obtiva（Chief Scientist），再被 Groupon 收编

- **背景**：Object Mentor International 是 Robert C. Martin 创办的培训/咨询公司，他在其中是 **Senior Consultant**（不是总裁，见第八节）。
- **他的逻辑**：`未找到确证`。他从未在公开访谈里详细解释这次跳槽的取舍。
- **结果**：Obtiva 给了他 "Chief Scientist" 这个头衔，并在 2011 年被 Groupon 收购后进入 Groupon 任 Member of Technical Staff。
- **事后反思**：2023 年他谈到 Globant 的 "Chief Architect" 头衔时说：
  > "I think the chief architect is kind of like a bit of a moniker in a way. I think I kind of chose that title within the organization in Globant just because I wanted to highlight… that architecture is important. I think after many, many years of Agile, there's been a thing of like architecture just kind of emerges. And I think that the kind of thinking that we do about the macro level of systems is extremely important." `[一手]`
  说明他对"头衔"是**功能化使用**的：头衔是一种对外的信号装置，不是权力层级。
- **来源**：https://2012.pycon.ca/en/learn ；https://itakeunconf.com/software-craft/meet-michael-feathers-keynote-i-t-a-k-e-unconference/ ；https://gotopia.tech/episodes/228/working-effectively-with-legacy-code
- **可信度**：中（职位事实多源一致；动机缺失）

### 决策 D3：创办 R7K Research & Conveyance —— 以及为什么是 "Conveyance" 而不是 "Consulting"

这是任务书第 1 问的核心，**有他本人的直接回答**：

- **背景**：约 2012–2014 年离开 Groupon 体系后，他成立了自己的公司。公开检索显示客户/主办方在 2014 年起就以 "Founder and Director of R7K Research & Conveyance" 介绍他。
- **他的逻辑（原文，直接解释了命名）**：
  > "R7K is my 'one person' company. Generally, I spend my time consulting and training. The name comes from the thought that **a lot of what I do is research, and I convey it to people I end up working with**." `[一手]`（Avanscoperta 访谈，2018）
- **解读（`[推断]`，标注为推断）**：
  1. **"Research"** 对应他长期在做的事：代码库演化数据、churn × complexity 图形、repository analysis、错误处理/条件逻辑、组织与代码的共生关系——这些都不是交付型咨询，是"先搞清楚再看能不能说"。
  2. **"Conveyance"** 强调的是**知识与判断的传递**，而非人力外包式的"consulting"。他在同一段访谈里把公司定位写成 "a company specializing in **software and organization design**"——注意是 design，不是 delivery。
  3. 与他的行为一致：他反复把工作描述成"教会团队自己能做"，而不是"我替你做"。Tech Done Right 访谈里被问"团队怎么才能不变烂"，他给的答案是"持续改进成为团队内的日常话题"，而不是引入某个外部方法。
- **结果**：
  - 公司名义上就他一个人（"one person company"），2004 年之后他的商业身份基本=他个人。
  - 这个命名也解释了为什么他不做"驻场交付型咨询"，而是 workshop + 培训 + 少量深度介入（他自述"consulting with hundreds of organizations"）。
- **事后反思**：
  > "…after its release I became the person to contact when you want to move past chaos in a code base. As a result, I've visited many organizations and, perhaps, **seen more difficult code than anyone alive**." `[一手]`（Avanscoperta 2018）
  他自己也承认这个身份是被书"绑定"的——见 D4/D5。
- **来源**：https://blog.avanscoperta.it/2018/08/21/i-dont-like-complicated-code-michael-feathers-refactoring-legacy-code-technical-debt/ ；https://engineers.sg/presenter/mfeathers ；https://indico.cern.ch/event/344367
- **可信度**：高（命名动机为本人原话）

### 决策 D4：2021 年加入 Globant 当 Chief Architect —— 同时保留独立身份

- **背景**：2021-01-07 Globant 官方通稿宣布他加入任 Chief Architect，官方口径是"强化 Globant 在遗留系统**战略性复用与现代化**方面的能力"。
- **他的逻辑**：他在 2023 年的访谈中把它降级解释为"信号"而非实权职位（见 D2 引文），同时强调仍在独立做培训与咨询。
- **结果**：他此后（2023、2024、2025）仍以个人身份出现在 GOTO / YOW! / Globant 两条线上。
- **事后反思**：`未找到确证`（他没有公开反思过这个决定的得失）。
- **来源**：https://www.prnewswire.com/news-releases/globant-welcomes-michael-feathers-as-chief-architect-to-continue-transforming-how-organizations-create-and-deliver-digital-products-301202799.html ；https://gotopia.tech/episodes/228/working-effectively-with-legacy-code
- **可信度**：中高（官方通稿 + 本人自述互证）

### 决策 D5（反例决策）：**持续拒绝**做"大重写"生意

这条不是一次性的职业选择，而是他 20 年一贯的商业决策，因此放在职业节里：

- 他被找来时，客户往往想要的是"帮我重写"。他的第一反应是**先听**：
  > "The first thing for me is listening. Pretty much let people do sort of a complete brain dump on me and just tell me everything that's going on… But for most part, people quite often diagnose very well where the pain points are." `[一手]`（Tech Done Right）
- 他明确把决定权交回业务方：
  > "A lot of it comes down to business reason rather than technical reason, because at the end of the day… it's a question of whether there's payback for this particular thing, but the business case needs to be made." `[一手]`（Tech Lead Journal #195）
- **结果**：他的项目形态偏向"局部外科手术 + 建测试网 + 组织对话"，而不是整包重建。
- **可信度**：高（多处访谈一致）

---

## 二、写作决策

### 决策 W1：2004 年写《Working Effectively with Legacy Code》

- **背景**：他 2000 年前后转做顾问，发现"几乎所有客户都有大量没测试的代码"，而当时市面上唯一的权威答案（Martin Fowler《Refactoring》）说的是一句让他卡住的话：重构需要测试；没有测试你就麻烦了。
- **他的逻辑（两段原话，动机非常清楚）**：
  > "I just realized that this was a problem. And I just started **collecting techniques for going and breaking dependencies and getting tests into place**." `[一手]`（Tech Lead Journal #195）

  > "What I knew in the beginning was that **it was a subject no one wanted to touch**. At the time I wrote the book, the industry seemed to be pretending that software design was something you did on new systems, that design is a 'blank-slate.' I suppose it's convenient to assume that, but the reality has always been very different. **People just didn't seem to want to explore the gulf between the real and the ideal**." `[一手]`（Avanscoperta 2018）
- **为什么是 2004 年**：不是时机判断，而是"位置判断"——他手上同时有（a）大量真实客户案例，（b）从早期 XP 圈子学来的 test-first 方法论，（c）一个没人碰的选题。他在 2024 年的"3 Tech Lead Wisdom"里把这条方法论化：
  > "**Looking for things that aren't there is very valuable.** Just generally in life, if you can detect the absence of something that should be there then you're in a good position. **The legacy code book came about because I realized this is a tough problem and nobody's going to touch it. Nobody wants to touch on this problem. So it's like, okay, might as well do this.**" `[一手]`（Tech Lead Journal #195）
- **结果**：
  - 书成为该领域事实标准，"legacy code is code without tests" 成为行业口头语。
  - 副作用（他自己承认）：身份被锁死在这一个标签上，20 年后会议介绍他的第一句仍是这本书。
- **事后反思（对书的重新定性，很关键）**：
  > "Going back to my book, as much as it's very technical and has a lot of code in it, **I'm only realizing now how much it was really about going and helping people keep their morale up** and have a positive outlook to what they can do and know what they can do within codebase." `[一手]`（Tech Lead Journal #195）
  也就是说，他后来把这本书理解为**士气/心理干预工具**，而非技术手册。这与第四节"期待值决定体验"那条形成互文。
- **来源**：https://techleadjournal.dev/episodes/195/ ；https://blog.avanscoperta.it/2018/08/21/i-dont-like-complicated-code-michael-feathers-refactoring-legacy-code-technical-debt/
- **可信度**：高

### 决策 W2：**不写**第二版的 legacy code 书，先转向别的题

- **背景**：2018 年记者直接问他是否考虑写第二版/续作。
- **他的逻辑**：
  > "That's an interesting question. I'll likely write a follow up to the legacy code book at some point, but I've been spending a lot of time looking into **error handling and the issue of excessive checking in code**. I've been writing a book about this. The working title is '**Unconditional Code**.' My plan is for it to be out next year." `[一手]`（2018）
- **结果**：**《Unconditional Code》没有出版**（截至本次调研未找到任何出版记录；只有 2017/2018 的 GOTO 同名演讲流传）。
- **他给出的**技术性理由（在 2023 年回答"如果今天重写这本书会改什么"）：
  > "There's a lot more now that I would say about **how legacy code happens** because that's been almost like the sideline pursuit I've had over the past 10, 15 years… And functional programming, because there wasn't very much at that point." `[一手]`（GOTO Bookclub 2023）
- **反思**：他把 15 年的精力投向了"legacy code 是怎么产生的"（组织、激励、Conway 定律），而不是"已经烂了怎么办"。这是他最重要的**研究重心转移**。
- **来源**：https://blog.avanscoperta.it/2018/08/21/i-dont-like-complicated-code-michael-feathers-refactoring-legacy-code-technical-debt/ ；https://gotopia.tech/sessions/260/unconditional-code ；https://gotopia.tech/episodes/228/working-effectively-with-legacy-code
- **可信度**：高（本人原话 + 无出版记录）

### 决策 W3：《Brutal Refactoring》—— 15 年没能落地的书

- **背景**：2011 年 3 月他在自己的 TypePad 博客上发了同名文章，同年 XP 2011 上开了 4 小时的同名 tutorial《Brutal Refactoring》；书号 ISBN 9780321793201（Addison-Wesley）早在 2011 年前后就被登记，零售站至今挂着预售页。
- **他的逻辑**（2011 年博文，转引原文）：
  > "These days, I'm much more aggressive in my approach to old code. WELC was fully ingrained in that 'if we don't have tests, we can't do much' attitude. **I think that part of that was a sign of the times, and part of it was a reflection of my natural fear as a consultant.** You walk in and you don't know anything about the code base so you can't even come close to accurately assessing risk. Nicely, though, people who are embedded in teams often can, and I've learned a lot from people who've tried things out long term in their code and have lived to tell the tale." `[二手转引一手博文]`（原文经 Jeremiah Flaga 2019 转引）
- **结果（`[冲突]`/`[推断]`）**：
  - 该书**至今（调研时点）未见正式出版**。零售/出版方页面的日期字段自相矛盾（InformIT 显示 "Copyright 2041"，Pearson 德国站显示 "2040"，部分书店显示 2020/2022 的预计日期），属于典型的"长期占位未出"状态。
  - 2019 年一位读者追问其出版日期时，2023-10 的更新直接写了："**There is no upcoming book named Brutal Refactoring.**"
  - `[推断]` "Brutal Refactoring" 这个概念（更激进、不迷信测试安全网）**已经散落进他的演讲、培训和后来的 Leanpub 写作里**，而不以那本书的形式出现。
- **事后反思**：他自己在 2023 年说书的核心"有点 timeless，所以至今还卖得很好"，同时承认如果要改，会加上"legacy code 是怎么产生的"和函数式编程两块——这恰恰是 《Brutal Refactoring》 如果出版本该覆盖的内容。
- **来源**：https://www.markhneedham.com/blog/2011/05/11/xp-2011-michael-feathers-brutal-refactoring/ ；https://thekua.com/atwork/2011/05/notes-from-michael-feathers-brutal-refactoring/ ；https://jeremiahflaga.github.io/2019/08/06/what-michael-feathers-said-about-welc-7-years-later/ ；https://www.informit.com/store/brutal-refactoring-more-working-effectively-with-legacy-9780321793201
- **可信度**：中（"未出版"事实清楚；发布时间线只能给区间）

### 决策 W4：2024 年起**改成公开增量写作**（Leanpub + Substack）

- **背景**：他 2021 年起在 Substack 开 newsletter "mechanisms"，2023 年发布 AI 相关博文，2024-07 起在 Leanpub 上公开写《AI Assisted Programming》。
- **他的逻辑（从书目录反推 + 本人表述，`[推断]` 部分已标注）**：
  - 书目录里是一套**可操作的行为学词汇表**，不是 prompt 技巧集："Surfacing / Attention / Dissipation / Pattern Preference / Eagerness / Batch Mentality / Clamping / Roughouts / Ownership"，然后是 30 条 techniques（Make Projections、Use Waywords、Generate From Tests、Pidgin Specification、Step Check、Reduce Step Size、Ask For Reflection、Go Rogue、Ask Again…）。`[一手]`（Leanpub 目录）
  - 他本人在 2024 年说："With my book, it's **less about prompt engineering and more about approach**." `[一手]`（Tech Lead Journal #195）
- **结果**：
  - 书至今仍是 "30% complete"，最后更新 **2025-05-26**（Leanpub 页面）——**又一次进入长期未完成状态**，与《Unconditional Code》模式相同。
  - 但内容通过 Substack/演讲/播客已大量外流。
- **来源**：https://leanpub.com/ai-assisted-programming ；https://leanpub.com/podcasts/leanpub/michael-feathers-04-09-24
- **可信度**：高（页面状态可查）

---

## 三、"Legacy Code Retreat"：归属澄清与规则背后的判断

### 3.1 关键澄清 `[冲突]`

任务书把 Legacy Code Retreat 当作 Feathers 的决策来调研。**公开证据不支持"他创办了 LCR"**：

- 活动组织者与参与者的记录一致把概念归属给 **J.B. Rainsberger（jbrains）**：
  > "Thanks also to **jbrains for coming up with this whole concept** and for helpful hints." `[二手]`（1st Darmstädter Legacy Code Retreat 复盘，2015）
- 练习用的代码库 `github.com/jbrains/trivia` 明确标注 "Legacy Code Retreat - Trivia Game codebase"，作者是 Rainsberger。`[一手]`（仓库）
- 2025 年的活动提案里，Feathers 的角色是被**当作技法来源**引用：
  > "We will learn and practice the classic **Michael Feathers dance** of: Identify change points / Find an inflection point / Cover the change points…" `[二手]`（Agile India 2017 提案页）

**结论**：Feathers 提供的是**内容（技法）与权威背书**；Rainsberger 提供的是**形式（retreat 这个容器）**。把 LCR 算作 Feathers 的直接决策是**误归因**。

- **来源**：https://letsdeveloper.com/2015/03/1st-darmstadter-legacy-code-retreat/ ；https://github.com/jbrains/trivia ；https://confengine.com/agile-india-2017/proposal/3249/legacy-code-retreat-uncovering-better-ways-of-dealing-with-legacy-software-by-doing-it-and-helping-others-do-it
- **可信度**：中高（多份独立活动记录一致）

### 3.2 规则设计，以及规则背后的判断

多份活动记录给出的事实规则（这些是 LCR / Code Retreat 体系的共同约定，不是 Feathers 单独制定的）：

| 规则 | 记录来源 | 对应的判断 |
|---|---|---|
| 一天 5–6 轮，每轮 **45 分钟**编码 + 10 分钟全员回顾 | Darmstadt 复盘（6 轮）；伦敦场（6 轮 × 45 分钟） | 时间短到逼你放弃"做完"，只留下"练动作"。参与者原话："45 minutes felt not enough time, but the focus was on practice, not on finishing!" |
| **每轮结束后代码被删除**，重新分组、换语言 | Darmstadt 复盘原文："After each session the code is deleted, all participants join for a short retrospective, and than regroup for the next session." | 删除代码 = 切断沉没成本与"舍不得"；同时强制换搭档换语言，把注意力从产物转到技法本身 |
| 起点不是空白，而是一坨 **别人写的烂代码**（trivia） | 所有记录一致 | 与 WELC 的核心命题一致：设计能力要在"现实"里练，不是在"白纸"上练 |
| 第 1 轮只允许**读代码**，不许改 | 伦敦场复盘原文："**Just read it. Don't change it. Don't start refactoring. *Please* don't start fixing it.**" | 抑制"立刻动手"的本能；先建立对系统行为的认知，再谈改动 |
| 黄金主（Golden Master）作为第一层安全网，之后逐步换成单元/刻画测试 | 伦敦场、Darmstadt 均如此 | 承认"先有测试才能重构"是个鸡生蛋问题，用端到端快照打破循环 |
| 后续轮次分别练：extract pure function、简化条件、subclass to test | 同上 | 把 WELC 的技法目录拆成可单练的"动作" |

**规则背后最关键的一条判断**（可用他本人的话直接支撑）：

> "There is a **chicken-and-egg moment** when covering a system with tests… The golden master technique allows you to get your system under test without performing too much invasive surgery." 这一整套逻辑，他在 Tech Lead Journal 里对 characterization tests（他发明的术语）的表述是：
> "You write tests that you use to **describe the current behavior** of the system. So you're not writing them first, you're writing them after the code has been written. And you're writing them to go and **ask a question of the code base**. And once you get the answer, you basically take that answer and you put it in as the expectation." `[一手]`

**注意**：任务书里的"删掉代码 + 40 分钟一轮"，准确的公开记录是 **45 分钟一轮 + 每轮删除代码**。40 分钟这个数字 `未找到确证`。

- **来源**：https://letsdeveloper.com/2015/03/1st-darmstadter-legacy-code-retreat/ ；https://octopusinvitro.gitlab.io/blog/code-and-tech/legacy-code-retreat ；https://functional.computer/blog/legacy-code-retreat-part-one-get-it-under-test ；https://techleadjournal.dev/episodes/195/
- **可信度**：中（规则为多源二手一致；Feathers 本人的"为什么办"未找到直接表述）

### 3.3 Feathers 自己办过 LCR 吗？

`未找到确证`。检索到的 LCR 记录里，facilitator 分别是 Erik Talboom、Sandro Mancuso + Samir Talwar、Joe Rainsberger 等，**没有一份记录显示 Feathers 本人主持过 LCR**。可以确认的是他长期主持 WELC 主题的 workshop/masterclass（GOTO Berlin 2017、GOTO Chicago 2018、YOW! Sydney 2025 的 "Forces in Software" 等）。

---

## 四、真实项目案例（他自述的，多为去标识化）

### 案例 1：职业生涯早期的一家 FDA 监管生物医疗公司

- **背景/场景**：
  > "One of the first companies I worked with the industry was a biomedical company, FDA-regulated. We had **extremely long product cycles** because software had to wait for hardware…" `[一手]`（Tech Done Right）
- **他的做法**：没有特别的"方法"，是环境逼出来的：
  > "…and we wrote some damn good code but **we weren't under any time pressure at all and there's deliberation over everything**. We'd sit in the room and argue about things and come up with a good structure."
- **结果**：好代码，但代价明确：
  > "…there were other things that happened that were kind of awkward because the fact that we had long development cycle it's easy to **over engineer** things."
- **他从中提炼的判断**：软件质量与"是否有时间争论结构"强相关；反过来，Agile 之后的"短周期 + 产品/开发分房"结构会系统性地吃掉这种对话——他把这归为技术债的一个**来源**，而不是"程序员不努力"。
- **来源**：https://noelrappin.com/audio/tdr-011/transcript/
- **可信度**：中高（本人自述，无第三方佐证，但细节自洽且具体）

### 案例 2：2000 年代 dot-com 崩盘期的一家创业公司（"质量提升了，我却觉得自己失败了"）

- **背景/场景**：他在该团队断续工作 4–5 个月。
  > "At the end of this, the guy who brought me in, he brought me into his office. He showed me these graphs and showed me how the quality had improved through all the time that I'd been there. We really, you know, made a big difference. And I thought, well, this is weird because **I feel like a failure. Why do I feel like a failure?**" `[一手]`（Tech Lead Journal #195）
- **他的归因（这是本节最有价值的一条）**：
  > "…this was like early days, like 2000s, like the dot com bust… I was working at a startup and **everybody thought they were going to be a millionaire. They discovered they weren't going to be a millionaire**."
  他在数年后跟朋友总结成：
  > "…the thing which really affects whether we feel good today or not is **what our expectations were**… our expectations set our experience to a strong degree."
- **结果/行动**：这条经验后来被他直接写进"如何面对遗留代码"的建议里：
  > "If you can actually cultivate the curiosity about what does this system do… or the desire to help people in that context, it can be very rewarding work. **You may just have to go and put aside your expectations a little bit.**"
- **来源**：https://techleadjournal.dev/episodes/195/
- **可信度**：高（本人自述，且与他书中的"士气论"自洽）

### 案例 3：跨国收购后被"空投"过来的代码库（无任何上下文）

- **背景/场景**：
  > "I remember going and visiting a team in one country years ago and their code base was just **dropped on them from a team in another country**. It was a recent acquisition. **There was actually nobody to help them to make any sense out of the code base at all.**" `[一手]`（Tech Done Right）
- **他的判断**：
  > "Essentially then, **everything is scary**. Your fear level is high because you have no clue, no roadmap about what's going on in the codebase."
- **他的动作/建议**：他提出一个非常具体（也很少人做）的实践——
  > "I wish I would see more teams doing this… **making short videos at the end of an iteration** or periodically and go and say, 'This is what we did and why we did it.' **The why is the most important thing.** Imagine joining a project and you can go back and look at three years' worth of videos… If you had a history like that from the beginning of a project, yeah, that can be extremely galvanizing."
- **他还把问题升级到可量化的层面**：
  > "…there's a question about **how much turnover can you have in a team and still maintain a degree of institutional memory**… I don't know how we would actually determine empirically, some turnover rate past which it just gets ridiculous. There can be some turnover that's healthy… but past a particular rate, you probably fall apart and you end up in that massive fear situation."
- **来源**：https://noelrappin.com/audio/tdr-011/transcript/
- **可信度**：中高（本人自述；刻意隐去国家与客户名）

### 案例 4：一家大公司的"越多检查、质量越差"（反馈延迟的反向案例）

- **背景/场景**（他转述）：
  > "A story I heard from someone at a very big company that I won't name… they kept adding more and more checks to the build, things beyond your typical automated test. **It actually caused quality to go down.**" `[一手]`（Tech Done Right）
- **他的因果解释（很关键的一条反直觉判断）**：
  > "They got to the point where actually a developer could check something in… and **only get notification the next day**… Imagine being a developer and you don't want to start bunching up your commits… **if you put it all in this one big commit… how do you really feel about doing a lot of refactoring?** … It's like you skimp on the refactoring because you're risking too much by going and doing it."
- **结果/结论**：**长反馈周期会主动杀死重构行为**，因为重构和功能变更被绑在同一个提交里，失败成本不对称。
- **来源**：https://noelrappin.com/audio/tdr-011/transcript/
- **可信度**：中（二手转述 + 他的推断；他自己标为"我听说"，未见数据）

### 案例 5：上游团队用 Java `final` 锁死服务，下游绕过它

- **背景/场景**（XP 2011 workshop 现场笔记）：
  > "Feathers gave an example of a place where he'd worked where an **upstream team decided to lock down a service they were providing by using the Java 'final' keyword** on their methods so that those methods couldn't be overridden." `[二手]`（Mark Needham 现场笔记）
- **结果**：
  > "…although we can use languages to enforce certain things **people will find ways around them**, which in this case meant that the downstream team **created another class wrapping the service** which did what they wanted."
- **他提炼的两条规律**：
  1. "the code around **hard boundaries** is likely to be very messy"；
  2. 用语言特性"强制"组织边界通常失败。
- **同期的书面版本**（一手，2006 年 Artima 博文）：
  > "Many people imply that 'final' in Java aids security. I don't think I buy that… **No, there's a measure of security when you use final but only if you imagine that your users aren't really writing unit tests for their code.** Isn't it ironic that we may be able to have secure software, but only if we can't be sure that it actually works?" `[一手]`
- **来源**：https://www.markhneedham.com/blog/2011/05/11/xp-2011-michael-feathers-brutal-refactoring/ ；https://www.artima.com/weblogs/viewpost.jsp?thread=161019
- **可信度**：高（现场笔记 + 他同期亲自撰写的书面版本互证）

### 案例 6：Scythe —— 他自己动手做的工具决策（"先解决我自己的重复劳动"）

- **背景/场景**：
  > "Considering all of this, I decided to create a tool that **automates something I'd been doing for a while by hand: inserting probes in areas of code that I suspect are dead** and checking periodically to see if they've been called." `[一手]`（2016-12-27 博文）
- **设计决策（这一条极能体现他的取舍风格）**：
  > "I tend to believe that **flexibility comes from what you leave out rather than what you add**, so I've made Scythe maximally flexible by giving it an extremely simple implementation. **Each probe is recorded as a zero-length file** in a directory you specify through an environment variable… This is near zero cost, and it will work for all languages and all platforms with a file system."
  - 支持 Java / Python 3 / Ruby；加语言"只是加一个函数"。
- **结果**：开源（github.com/michaelfeathers/scythe），并成为他 2016–2017 年 "Strategic Code Deletion" 演讲与 QCon London 2017 track 的技术底座。
- **来源**：https://michaelfeathers.silvrback.com/scythe-using-coverage-in-production-to-find-dead-code ；https://github.com/michaelfeathers/scythe ；https://qconlondon.com/london-2017/system/files/presentation-slides/strategic-code-deletion-qcon.pdf
- **可信度**：高（本人博文 + 代码仓库 + 会议 slides）

### 案例 7：七英里桥（非软件，但作为 strangler fig 的判断原型）

- **背景/场景**：
  > "I used to live in Miami, Florida. And there's this giant bridge, a **seven mile bridge** that goes from South Florida to Key West… **We've got the old one. We're going to build a new one next to it. And then we're going to go and tear down the old one.**" `[一手]`（Tech Lead Journal #195）
- **他的用法**：用来纠正"seam = strangler fig"的混淆——
  > "Not really… with strangler, you're building things in parallel. You're diverting flow to one area of the system so you can go build out another one… I looked this up at the time. I think it's like, **parallel replacement** is a term that people use in other engineering disciplines."
- **来源**：https://techleadjournal.dev/episodes/195/
- **可信度**：高（本人原话）

### 案例 8：Noel Rappin 提到的 JRuby + ActiveRecord + Hibernate 双写（非他的案例，但由他点评）

- 这是主持人的案例（同一课程库，一半走 Rails ActiveRecord，一半走 Java Hibernate），Feathers 的点评是他一条重要判断的落点：
  > "I think it's great with that to actually consider what would it be like if you were able to go back in time and talk to the developers who basically made the decision to do that… The most fascinating areas for me with legacy code bases is **there's this space where you make a reversible decision and then you transition into a point where it's not that it becomes irreversible, but it becomes something you would never really want to reverse because it's expensive.**" `[一手]`
- **来源**：https://noelrappin.com/audio/tdr-011/transcript/
- **可信度**：中（点评本身为他的原话，案例属他人）

---

## 五、技术判断清单（"如果 X 则 Y"，附案例/出处）

### 5.1 重写 vs 重构

| 条件 | 他的判断 | 出处 |
|---|---|---|
| 有人提议"整体重写" | 先做重构尝试 + 重构规划 + 看未来功能清单，**三者齐了再判断重写是否成立** | `[一手]` TLJ #195 |
| 决策依据 | **业务理由，不是技术理由**："the business case needs to be made" | `[一手]` TLJ #195 |
| 只有技术债、不涉及架构 | 可以重写，但**要做点状重写（spot rewrites）**；"quite often for people it's like an all-or-nothing proposition, and that's really a horrible position" | `[一手]` TLJ #195 |
| 有测试 | "you're really in a golden space" | `[一手]` TLJ #195 |
| 没测试又要重写 | "**now you've got two problems**"（既不懂它在干什么，又要重写它） | `[一手]` TLJ #195 |
| 涉及**架构**的大重写 | 单独一类决策，"a different set of considerations"，通常规模大得多 | `[一手]` TLJ #195 |
| 不知道哪些区域值得动 | 只投资"未来会增长 + 现在正在制造困难"的区域；"You don't have to rewrite an entire system most of the time" | `[一手]` TLJ #195 |
| 7 年以上老系统 | 放弃"全库修复"的念头："you're not going to go and fix the entire thing. There's always going to be code that you're not going to touch again." | `[一手]` TDR |
| 判断该动哪块 | 80/20：看**变更频率 × 复杂度**的交叉区（热点）；稳定但丑陋的区域**不值得**投重资 | `[一手]` GOTO Bookclub 2023；`[二手]` Mark Needham 现场笔记 |

### 5.2 微服务迁移

- **2014 年（QCon NY 主持架构 panel 之后）写的原文**：
  > "I strongly believe that there is a **law of conservation of complexity** in software. When we break up big things into small pieces **we invariably push the complexity to their interaction**." `[一手]`
  > "…if they ever become as easy to create as classes, people will have a freer hand to create trouble — **hulking monoliths at a different scale**. Personally, I hope we don't get to that point any time soon. Having an approach that is hard to put into practice can be a **decent bound on complexity**." `[一手]`
- **2018 年回看**：
  > "It turned out to be true. It's the nature of cohesion and coupling. **But, despite that, microservices have made quite few systems possible that weren't possible before.** I'm still looking for people to address contemporary macro issues of service and collaboration design in a deeper manner. My experience is that **cross-service refactoring is much harder**." `[一手]`
- **2024 年对"服务小到能一天重写完"的说法**：
  > "I think that's a great goal, **hard to see it in practice** though… there's this intrinsic thing about software that basically tends to grow and grow and grow." `[一手]`
  > 并且他**怀念**微服务早期的愿望清单："being able to use almost any language, be able to throw things into production almost immediately, being able to go and rewrite them when we need to. **It's a shame that we kind of fell away from some of that stuff.**"
  > 还有一条很"反直觉"的：**环境里有点压力是好事**——"we only get the resilience systems we need when we stress them a bit... So it's actually good when there's a bit of stress in the environment."（因为团队才有机会练"重写"这个动作）
- **可信度**：高（2014 原文 + 2018 自引 + 2024 口头复述，跨 10 年一致）

### 5.3 "先写测试"是铁律吗？例外在哪？

- **定义层**：他把 legacy code 定义为 "code **without tests**"，但他后来自己也承认这是 **"a definition with a purpose"**，不是本体论：
  > "Who am I to go and actually change the definition of legacy code?… **it's just one. There's many, pick whichever one you want. Pick the one that helps you.**" `[一手]`（TLJ #195）
  > "…we might end up in a place where… **that's another definition: legacy code is code we don't understand**." `[一手]`（同上）
- **例外 1：刻画测试是"测试后写"的**
  > "you're **not writing them first**, you're writing them after the code has been written." `[一手]`（TLJ #195）
- **例外 2：测试可以是临时的、一次性的**
  > "**tests can be disposable and temporary sometimes**, and just use them to [get] insight or to facilitate change." `[一手]`（TLJ #195）
- **例外 3：他会主动把测试"停到停车场"**
  > "Sometimes… **I feel much more comfortable than many people putting some of the tests in the parking lot for a minute** and saying, 'Okay, I'm going to go and change the system.' I'm going to do a structural refactoring, but I know the tests aren't going to cover it completely. **If I can develop confidence in another way** to do that refactoring, then I'll run the tests and find out, well, they aren't working against the methods they need to work against. And I'll rewrite tests that will cover the new structure." `[一手]`（GOTO Bookclub 2023）
  > 并明确反对把测试神圣化："I think that we can **overly valorize the tests** sometimes and think, 'Oh my God, we can't get rid of any tests at all.' Then you're in a situation where you're just so scared that you can't change anything."
- **例外 4：2011 年他就公开承认"没有测试就不能动"含恐惧成分**
  > "part of it was a **reflection of my natural fear as a consultant**" `[二手转引一手]`
- **不变的部分**：他一直坚持"**理解**优先于纪律"，以及"测试是获取理解的手段"——2024 年他仍在说 "The test is a way of **grounding our knowledge of a system** for the most part."

### 5.4 具体操作建议（给团队的动作清单）

按他的原话整理，按"可操作性"排序：

1. **先定位改动点，再向外扩**：
   > "figure out exactly where you need to make changes and you move outward from there… you think about what would be involved in getting tests in place for each one of those places. And you kind of **crawl the tree upward** and see if there's a common place for those changes." `[一手]`
2. **只在"即将改动"的地方补测试**（因为那些地方未来还会改，回报最快）：
   > "the things that you're about to change right now, chances are you'll be changing them in the future… you're going to start to get **very quick returns**." `[一手]`
3. **接受长期"半覆盖"状态**：
   > "you're never going to have complete tests on a code base unless you started that way. And **it's okay to live in this limbo space**, and you probably will for a long period of time… **it's just normal**." `[一手]`
4. **找 seam（接缝）而不是全量重构**：
   > "It's an **opportunistic way of looking at software** to go and say, what can I do to actually, without changing things drastically, be able to get areas where I can get understanding and coverage?" `[一手]`
5. **不要一次改太多 / 减小步长**（AI 时代他也给了同样建议）：
   > "The secret for a lot of this stuff is to **take smaller steps**. So if you are looking at generating something, generate something small. If you're trying to understand something, paste in something that is kind of small." `[一手]`（TLJ #195）
6. **先读代码、别急着改**（LCR 第 1 轮的设计原则，也是他书里 scratch refactoring 的伴随动作）
7. **做"快速草稿重构"（rapid scratch refactoring）时用纯文本编辑器，别用 IDE**：
   > "He said this was because **the IDE's compile warnings were distracting from the goal of the exercise** which is to understand how we could improve the code." `[二手]`（Mark Needham 现场笔记；Pat Kua 版本记的是"syntax highlighting 的干扰"）
8. **愿意接受"暂时的丑"**：
   > "Some of the things that you do to go start to break dependencies and get tests in place are going to **violate some preconceptions you might have about good design**, but they are there to facilitate doing the refactoring to make the design better. So, it's **cracking the eggs to make the omelet** a little bit." `[一手]`（GOTO Bookclub 2023）
   他引的是伏尔泰那句"best is the enemy of good"。
9. **选择性打破封装**（不是"喜欢破坏封装"）：
   > "it's not saying, 'Hey, I'm a fan of breaking encapsulation,' but **selectively in particular places**… you're doing it in such a way that when you're encapsulating, you should be thinking about what it is you want to encapsulate… **breaking encapsulation at the edge of a new sphere that you want to hold as your encapsulation is okay because you're creating a new boundary around something of value**." `[一手]`（同上）
10. **测试不要与实现结构一一对应**：
    > "some people just basically took it to be, like, okay, you write **one unit test harness for each class** of your system and you're good… I think that's a way where people kind of paint themselves into a corner." `[一手]`（同上）
11. **不要把测试代码排出交付物**（在他接手的糟糕场景里）：
    > "I tend to try to convince people to **ship their test code in** with that just because… I get called in to look at these really horrible situations. You don't have many other options in terms of actually easing the entry into… starting to get control of the code base short of actually going in and shipping them in parallel." `[一手]`（同上）
12. **给关键区域定"接战规则"（rules of engagement）**：
    > "you might say, well people can't just come and commit against these things. You need pull requests with particular people… In other areas, it might be just, well, anybody can go and sort of commit against this and that's okay because it's low criticality." `[一手]`（同上）
13. **让重构进入 retro 的语言**：
    > "building a culture of refactoring… to the degree that basically, the refactorings are talked about in retros, that people work on refactorings together, that people can actually speak up when they think something's bad." `[一手]`（同上）
14. **把"痛"和"解法"接上线**：
    > "It's always been troubling to me to find developers that are doing very painful things. **They don't think about it as pain, they think about it as normal.**" `[一手]`（同上）
15. **不要在团队里用"我们必须这样做"推进实践**（顾问与内部人的差别）：
    > "…people that are like, 'I find a better way of doing things in the organization,' they try to go and lead and say, 'We have to do it this way'… **They just create enemies.**" `[一手]`（同上）他的替代方案：先做出来，让结果说话；找"好奇的人"+"别人愿意听的人"，两者重合最好。
16. **换人 / 引入外部视角做体检**：
    > "I think that it is beneficial for most organizations to have **somebody else look at the code periodically**… And the other half of that too, not just novices but **getting experts to come in periodically** also." `[一手]`（TDR）

---

## 六、立场变化记录

### C1（最硬的一条）：从"没测试就别动"到"我更激进了"

- **早期立场（2004，书的前言，被多次引用）**：
  > "**Code without tests is bad code.** It doesn't matter how well written it is; it doesn't matter how pretty or object-oriented or well encapsulated it is. With tests, we can change the behavior of our code quickly and verifiably. Without them, we really don't know if our code is getting better or worse." `[一手]`（书中前言，经他人引用核对）
- **2011 年自我修正（他自己的博文）**：
  > "These days, I'm **much more aggressive** in my approach to old code. WELC was fully ingrained in that 'if we don't have tests, we can't do much' attitude. I think that part of that was **a sign of the times**, and part of it was **a reflection of my natural fear as a consultant**." `[二手转引一手]`
- **2023–2024 年的现状**：定义被降格为"有用的工作定义之一"，并补上第二个定义 "legacy code is code we don't understand"；同时他承认自己会"把测试先停到停车场"。
- **性质判断**：这不是"推翻"，而是**从规范性主张退回到工具性主张**（从 "must" 到 "helps"）。他在 2019 年被读者公开质疑是否"backing out"时，双方都没有正面回应的记录。`[推断]`
- **来源**：https://jeremiahflaga.github.io/2019/08/06/what-michael-feathers-said-about-welc-7-years-later/ ；https://techleadjournal.dev/episodes/195/ ；https://gotopia.tech/episodes/228/working-effectively-with-legacy-code

### C2：从"代码库分析（repository analysis）"转向"组织与人的系统"

- **2011 年前后**：他在做 churn × complexity 图形、代码库数据挖掘，并把这个方向带进《Brutal Refactoring》tutorial。`[二手]`（Mark Needham / Pat Kua 现场笔记）
- **2018 年**：
  > "I've **moved away from that space a bit**, not because of lack of interest but rather **lack of time**. I recommend Adam Tornhill's work… I also recommend Janelle Klein's book 'Idea Flow.' … Adam and Janelle have complimentary approaches." `[一手]`
- **2023 年**：他承认自己是 CodeScene 的 advisory board 成员——**从"自己做这个方向"变成"站台 + 推荐别人做"**。
- **结果**：他的研究重心在 2015–2021 年明显移到组织侧（symbiotic design、"Gateway Teams"、"Socio-Technical Seeing"、"Negative Architecture"）。
- **来源**：https://blog.avanscoperta.it/2018/08/21/i-dont-like-complicated-code-michael-feathers-refactoring-legacy-code-technical-debt/ ；https://gotopia.tech/episodes/228/working-effectively-with-legacy-code ；https://michaelfeathers.silvrback.com/archive

### C3：从"重构与测试"扩展到"错误处理与条件逻辑"（并由此未完成一本书）

- 见 W2。判断内容的实质变化是：他开始主张**通过改设计和重访需求，让错误情形"变得不可能发生"**，而不是写更多处理逻辑：
  > "Often by changing design and revisiting requirements we can make various error cases impossible, and make code and architecture simpler as well as more robust." `[一手]`（GOTO "Unconditional Code" 摘要，2017/2018）
- **来源**：https://gotopia.tech/sessions/260/unconditional-code

### C4：对"设计模式/复杂度"的立场——`未找到确证`

任务书假设他"早期对设计模式热情、后来批评 pattern 泛滥"。检索结果：
- 找到他对**复杂度**的长期敌意（"I don't like complicated code"），以及他偏好的方案是函数式/纯函数/负架构（Negative Architecture）。
- 找到一条**他影响设计原则命名**的旁证：是他写信给 Robert C. Martin，指出把设计原则重排后能拼成 S.O.L.I.D.。`[二手]`（InfoQ Uncle Bob 访谈）
- 但**没有找到**他公开批评"模式泛滥"或声明自己"曾经迷信设计模式后来后悔"的一手材料。**不写。**

### C5：对"微服务"的立场没有反转，只有 10 年一致的怀疑 + 惋惜

见 5.2。他从未变成"反微服务"或"挺微服务"任一阵营：2014 说复杂度守恒，2018 说"尽管这样，微服务让一些以前不可能的系统成为可能"，2023 仍说 "Microservices, as well, align very well with Conway's Law at a meta level." `[一手]`

---

## 七、关于 AI 的立场与决策（2023–2026）

### 7.1 时间线上的公开动作

| 时间 | 动作 | 立场要点 |
|---|---|---|
| 2023-04-06 | 博文《(Possible) AI Impacts on Development Practice —— The View from April 2023》 | 系统性地推演哪些环节会被改写：源码是否还被需要、模块化的动因是否还成立、prompt 会不会变成语言 `[一手]` |
| 2023-07-11 | 博文《Generate from Constraints —— Using Prompt-Hoisting for GPT-based Code Generation》 | 提出 **prompt-hoisting**：把 prompt 写成可执行的测试，让 prompt 同时充当"需求"和"验收" `[一手]` |
| 2023-03-20 | GOTO Bookclub 访谈（与 Christian Clausen） | "**we're safe for a little while**"；prompt 会成为另一种编程语言；他已用 AI 生成测试用例，认为**最大的价值是 ideation** `[一手]` |
| 2024-03 | GOTO Chicago 2024 演讲《Where AI Meets Code》 | 讲"承认 LLM 强弱项"的实践：代码/测试生成、安全重构、设计探索与构思 `[一手]` |
| 2024-08-14 录制 / 09-04 发布 | Leanpub Frontmatter Podcast（第 300 期） | 谈 AI 如何改变工作方式，强调"增强而非替代" `[一手]` |
| 2024-07 起 | Leanpub 公开写《AI Assisted Programming》 | 书目录 = 行为学词汇表 + 30 条操作 technique；"less about prompt engineering and more about approach" |
| 2024-10-14 | Tech Lead Journal #195 | 最完整的一次口述立场（见 7.2） |
| 2026-01-14 | 播客《Hard Boiled Software》第 1 期："The Skills That Survive AI" | 关注点移到**职业身份**与 AI 的二阶效应（见 7.3） |

### 7.2 他的核心 AI 判断（尽量原话）

1. **"generate and check" 范式**：
   > "Generative AI leads us to a '**generate and check**' paradigm. When we are ideating or doing free-form creative work, we can check the output manually and use our qualitative judgment. **In an engineering context, we need ways of constraining generation and making sure that it satisfies our requirements — the 'must-haves.'**" `[一手]`
2. **反对"让 AI 写测试**"这种省事做法**（他明确说被某位演讲者的建议"shocked"）：
   > "Asking an AI-based tool to write tests of correctness for our code seems like a good idea, but **how do we know whether those tests check the behavior we intended**? The situation is worse when we are using AI to generate the code that it is testing. … **when we use one indeterminacy to check another we could be compounding any errors we miss in review**." `[一手]`
3. **prompt-hoisting（他的应对方案）**：把测试写进 prompt，用测试检查生成结果，从而把两次人工 review 压缩成一次（只 review 风格与设计）：
   > "Write a prompt that is executable as a test → use the prompt to ask a tool to generate code that passes it → run the prompt as a test → **review code that passes the test to see if it passes in a way which advances your design**." `[一手]`
   他还诚实标注了粗糙处：**模型经常"给多了"**，需要明确要求"用最简单的方式通过测试、不要引入新行为"；**miss 太多会让人疲惫**，"development becomes more like debugging — far more exhausting than just writing the code"。
4. **效率增益的来源不是"替你想"，而是"扩你的可能性空间"**：
   > "One of the sections I have in the book talks about the **loss potential if you ask a question of AI and you accept the first answer**. Because quite often, you just ask this prompt again, you get a different answer and a different answer… it sort of **opens the possibility space** and gets you thinking about different things." `[一手]`
5. **低风险区才是 AI 的正确战场**：
   > "It's really for the areas which are **low risk**… boilerplate code… in-house tools… where you have some confidence that somebody's going to find a problem before it causes loss of life or money… **shell is perfect for AI generation** in the sense that you're basically building from these bigger components, the commands, and it's very easy to find out exactly what a command does." `[一手]`
6. **责任必须落在人身上**：
   > "At the end of the day, in the legal system, you can't go and say, 'oh, the algorithm did it.' It's like, no! A person who works at a company did this. **At the end of the day, we are responsible for what we do… there has to be somebody in the seat of responsibility.**" `[一手]`
7. **对"开发者会被替代"的判断**：不要恐慌，但要重新定义自己：
   > "People are getting much more realistic now… Many developers now have had enough experience with AI that they realize **it's not going to replace them anytime soon**." / "we just need to see ourselves as **problem solvers**. And programming is one tool to solve a problem. Sometimes we can solve problems without writing code at all." `[一手]`
8. **不认为 AI 会让 TDD 或重构消失**：
   > "There's so much you can learn just by going and taking a project and going and **deleting all the source code and just giving all the tests to an AI assistant** saying, write the code for me. The thing that's missing are things that you were missing in coverage… **It's going to get better, and I think TDD is still going to be around.**" `[一手]`（2024-10）
   > 2023 年他对"AI 会不会让重构过时"的回答是："**I sense that we're safe for a little while.**"
9. **AI 会制造新的 legacy code**（TLJ #195 里专门有一节 "AI Churning More Legacy Code"）：他引用 GitClear 的 Copilot 代码质量研究作为谈资。`[一手/引用数据为二手]`
10. **2026 年的最新担忧：可得性偏差与"看不懂的代码"**（《Hard Boiled Software》第 1 期）：
    - 他自称**最大的 AI 担忧**是 "**availability bias & path dependency**"：接受第一个生成的方案而不考虑替代；
    - "The real risk: **generating code you don't understand at unprecedented speed**"；
    - 预警 **metrics creep**：代码行数/ token 消耗量回归为指标 → "Goodhart's Law incoming" `[一手，节目页摘要]`
    - 他还讲了一个"咖啡因 vs 咖啡"的星巴克比喻，用来区分"要设计"还是"要交付"。

### 7.3 他自己用不用 AI？

- **用**，而且给过具体用法：
  > "What I like to do is even if I'm using Copilot or I'm using CodeScene or all these other tools, is have **my own window open in something like [Claude]**… whatever I consider to be the best LLM at the moment, and basically do my **more ideation work** in that space. Because they aren't clamped down." `[一手]`（TLJ #195，"cloud" 应为语音识别把 "Claude" 记错，`[推断]`）
- 对 Copilot：**用得不多**——"A little bit. Not as much as some of the more recent things." `[一手]`（2023）
- 承认用 AI 生成测试用例并"在很多情况下满意"；也承认做 TDD-with-AI 时"quite often get frustrated"。`[一手]`
- 他会**分离工具用途**：IDE 内插件做窄活，另开一个通用最强模型窗口做构思。他的总结建议是：
  > "**Know what the tools are good for, but always keep your most capable general tool next to you** in order to go and actually do the things that are gonna help you have high creative value." `[一手]`
- **他自己的写作是否用 AI？** `未找到确证`。他在 2023 年博文末尾留了一句玩笑："No AI were harmed in the writing of this article." 不能据此判断。

### 7.4 他造的概念：Waywords / Pidgin Specification

- **waywords**：
  > "Suppose that you're asking the tool to go and refactor something and you write a prompt to go and do this… you probably want to **name this thing**… And then basically you can just, in English or your language, go ahead and use that as a piece of new nomenclature and terminology. It's just like **introducing a method name or a variable**." `[一手]`（TLJ #195）
  配套动作："give me a summary prompt" —— 把一个调好的 prompt 固化成可复用的东西，跨 session 搬运。
- **pidgin specification**：
  > "In the book I'm writing right now, I basically talk about something I call **pidgin specification**… I can write like a test case using just a very brief [notation]… 'this asserts that'… and basically say, give me this to me in JUnit. And it just gives it to me. **And sometimes it's wrong, but I'm dealing with something small enough I can actually see what the results are.**" `[一手]`
- **来源**：https://techleadjournal.dev/episodes/195/ ；https://michaelfeathers.silvrback.com/prompt-hoisting-for-gpt-based-code-generation ；https://newsletter.nerdnoir.com/p/hbs-001-michael-feathers

---

## 八、言行不一致 / 存疑处 / 需要打叉的前提

### 8.1 `[冲突]` "Object Mentor 总裁" —— 证据不支持

任务书称他为"原 Object Mentor 总裁（president）"。公开证据指向另一个事实：

- Object Mentor 的创始人兼总裁是 **Robert C. Martin**："Robert C. Martin is the founder and president of Object Mentor." `[二手]`（objectmentor.com 官方页面）
- 他自己的多份官方 bio 一致写：**"a Senior Consultant with Object Mentor International"**（不是 president）。
- 2005 年 OOPSLA 议程把他列为 "Michael Feathers, Object Mentor"（无职衔）。
- 他自己的 Artima 简介写："**Prior to joining Object Mentor**, Michael designed a proprietary programming language and wrote a compiler for it…"（说明他是"加入"，非"创办"）。`[一手]`

**结论**：`[冲突]`，应写"Object Mentor International 高级顾问"，不是总裁。任务书这句前提需要更正。

### 8.2 `[冲突]` "Legacy Code Retreat 是他的决策" —— 归属应为 J.B. Rainsberger

见第三节。可保留的表述是：**他提供了 LCR 里被反复练习的技法集合与理论框架**。

### 8.3 `[冲突/存疑]` "40 分钟一轮" —— 公开记录是 45 分钟

见 3.2。多处独立记录写 45 分钟（Darmstadt、伦敦、Codurance），未见 40 分钟。

### 8.4 `[存疑]` 出版承诺的长期跳票（这是他的**行为模式**，不是口误）

| 书名 | 首次公开提及 | 状态 |
|---|---|---|
| 《Unconditional Code》（错误处理/条件逻辑） | 2018 年，说"计划明年出" | 未出版（调研时点） |
| 《Brutal Refactoring》 | 2011 年（同名博文 + XP 2011 tutorial + ISBN 已登记） | 未出版；2023 年他人更新为 "There is no upcoming book named Brutal Refactoring" |
| 《AI Assisted Programming》 | 2024-07 | 30% complete，最后更新 2025-05-26 |

**三种可能解释（`[推断]`，供后续验证）**：
1. 他的产出**优先流向演讲/培训/播客**（现金流来源），书面出版被持续挤压；
2. 他的研究兴趣半衰期短于写作周期（2011 的"brutal"、2018 的"unconditional"、2024 的"AI assisted"，主题每 5–7 年换一次，每本书都在主题过期前没写完）；
3. 与"Aggressive/更激进"的自我定位冲突：他可能不愿把一个还没想透的东西定稿。
**这三点都是推断，没有他自己承认的记录。**

### 8.5 `[存疑]` "我们安全一阵子" vs "AI 是关键能力" —— 时间点不同的两句话

2023 年 3 月他说 "we're safe for a little while"；2024 年 8 月他说 "it's really important for **every programmer** to learn how to use it well and understand its limitations"。两句在 18 个月内出现，措辞的温度不同。是否属于立场变化？**判断：不算矛盾**——前者谈"重构这个职业是否消失"，后者谈"个人该不该学"。但检索未找到他本人对这个衔接的解释。`[存疑]`

### 8.6 `[冲突]` 关于"TDD 铁律"的自相矛盾感

同一场 2023 访谈里，他既说 "I think TDD is still going to be around"，又说他经常"把测试停到停车场"、并批评"过度神圣化测试"。**建议解读**：他反对的是**把测试当成不可变纪律**，不反对 TDD 作为获取理解的手段。他的原话支持这个解读：
> "I always look at the test as basically **a way of understanding the thing**."
但这是**本文件的推断**，标注 `[推断]`。

### 8.7 `[存疑]` 他的"第一手"到底有多少

- 他的观点几乎总是**以个人经验为论据**（"I've run into situations…"、"the teams I visit…"），
- 同时他自认存在"**consultants' disease**"：
  > "I used to call this as 'consultants' disease.' Essentially the idea that they only call you when there's a problem… Medical doctors probably walk around just like, 'Oh, everybody is sick and dying.'" `[一手]`（TDR）
  并在同一段承认"我不是给你好代码视角的最佳人选"——因为他几乎只见到坏代码。
- **含义**：引用他的经验判断时，需要意识到他的样本是**被问题筛选过的**。这一点他本人已经承认，不是外部质疑。

### 8.8 一处表述自嘲式的"不一致"（无害，但值得记）

他说 "I don't like complicated code"，同一访谈里又说 "I'm a fan of **complicated music** and very skilled musicians, which is a bit odd since I don't like complicated code." `[一手]`（Avanscoperta 2018）——不是矛盾，是他自己的对照句。

---

## 九、来源清单

### A. 一手（本人文字 / 本人逐字访谈 / 本人出镜）

1. Tech Lead Journal #195 逐字稿（2024-10-14，主持 Henry Suryawirawan）——本次调研最密集的口述来源
   https://techleadjournal.dev/episodes/195/
2. GOTO Bookclub《Working Effectively with Legacy Code》逐字稿（2023-03-20，与 Christian Clausen 对谈）
   https://gotopia.tech/episodes/228/working-effectively-with-legacy-code
3. Avanscoperta 专访《"I don't like complicated code."》（2018-08-21，含 R7K 命名动机、书的影响力、微服务、函数式）
   https://blog.avanscoperta.it/2018/08/21/i-dont-like-complicated-code-michael-feathers-refactoring-legacy-code-technical-debt/
4. Tech Done Right #11 逐字稿《Avoiding Legacy Code》（Noel Rappin，含 FDA 生物医疗、大公司 build 检查、人员流动、Scythe）
   https://noelrappin.com/audio/tdr-011/transcript/
5. 博文《(Possible) AI Impacts on Development Practice》（2023-04-06）
   https://michaelfeathers.silvrback.com/possible-ai-impacts-on-development-practice
6. 博文《Generate from Constraints》（2023-07-11，prompt-hoisting 原始定义）
   https://michaelfeathers.silvrback.com/prompt-hoisting-for-gpt-based-code-generation
7. 博文《Microservices Until Macro Complexity》（2014-07-03，"law of conservation of complexity"）
   https://michaelfeathers.silvrback.com/microservices-until-macro-complexity
8. 博文《Scythe - Coverage in Production to Find Dead Code》（2016-12-27）
   https://michaelfeathers.silvrback.com/scythe-using-coverage-in-production-to-find-dead-code
9. 博文《Gateway Teams》（2021-08-23，组织/文化建设）
   https://michaelfeathers.silvrback.com/gateway-teams
10. 博文《Negative Architecture》（2018-01-02，负架构/保证式设计）
    https://michaelfeathers.silvrback.com/negative-architecture
11. 博客存档（2017–2023 全部文章列表，"研究重心迁移"的证据）
    https://michaelfeathers.silvrback.com/archive
12. Artima 博主博文《Security and the 'Final' Dilemma》（2006-05-21）
    https://www.artima.com/weblogs/viewpost.jsp?thread=161019
13. Artima 博主博文《The Fundamental Theorem of Project Management》（2005-04-19，含 2005 年官方简介）
    https://www.artima.com/weblogs/viewpost.jsp?thread=105102
14. Leanpub《AI Assisted Programming》书籍页（目录 + 30% 完成度 + 最后更新日期）
    https://leanpub.com/ai-assisted-programming
15. Leanpub Frontmatter Podcast 第 300 期页面（2024-09-04，AI 与遗产代码）
    https://leanpub.com/podcasts/leanpub/michael-feathers-04-09-24
16. Substack 刊名 "mechanisms" 及 2024 sitemap 条目（含《AI Assisted Programming - Release 2》等）
    https://michaelfeathers.substack.com/ ｜ https://michaelfeathers.substack.com/sitemap/2024
    （注：本次调研中 substack 域直连被 DNS 拦截，仅能读取搜索引擎返回的标题/摘要，未取得正文）
17. GOTO Chicago 2024 演讲《Where AI Meets Code》摘要
    https://gotopia.tech/sessions/3311/where-ai-meets-code
18. GOTO Berlin 2017 / Chicago 2018 演讲《Unconditional Code》摘要
    https://gotopia.tech/sessions/260/unconditional-code
19. GitHub 仓库 `michaelfeathers/scythe`
    https://github.com/michaelfeathers/scythe
20. QCon London 2017《Strategic Code Deletion》讲稿 PDF
    https://qconlondon.com/london-2017/system/files/presentation-slides/strategic-code-deletion-qcon.pdf
21. 《Hard Boiled Software》第 1 期（2026-01-14）"The Skills That Survive AI" 节目页与要点
    https://newsletter.nerdnoir.com/p/hbs-001-michael-feathers

### B. 二手（他人记录 / 主办方 / 出版方 / 官方通稿）

22. Mark Needham《XP 2011: Michael Feathers - Brutal Refactoring》现场笔记
    https://www.markhneedham.com/blog/2011/05/11/xp-2011-michael-feathers-brutal-refactoring/
23. Pat Kua《Notes from Michael Feathers' Brutal Refactoring》现场笔记
    https://thekua.com/atwork/2011/05/notes-from-michael-feathers-brutal-refactoring/
24. Jeremiah Flaga《Is Michael Feathers backing out from his "Code without tests is bad code" statement?》（2019，含 2011 博文原文转引 + 2023 更新）
    https://jeremiahflaga.github.io/2019/08/06/what-michael-feathers-said-about-welc-7-years-later/
25. 1st Darmstädter Legacy Code Retreat 完整复盘（2015-03-29，含"每轮删代码"规则原文）
    https://letsdeveloper.com/2015/03/1st-darmstadter-legacy-code-retreat/
26. Codurance 伦敦 Legacy Code Retreat 复盘（2018-04-23，6×45 分钟格式）
    https://octopusinvitro.gitlab.io/blog/code-and-tech/legacy-code-retreat
27. Samir Talwar《Legacy Code Retreat part one: get it under test》（2012-08-03，"第一轮只读代码"原文）
    https://functional.computer/blog/legacy-code-retreat-part-one-get-it-under-test
28. J.B. Rainsberger 的 Legacy Code Retreat 练习代码库（LCR 归属证据）
    https://github.com/jbrains/trivia
29. Jo Van Eyck《Legacy code retreat》（2015-07-27，技法清单与取舍讨论）
    https://jvaneyck.wordpress.com/2015/07/27/legacy-code-retreat/
30. Globant 官方通稿（2021-01-07，Chief Architect 任命）
    https://www.prnewswire.com/news-releases/globant-welcomes-michael-feathers-as-chief-architect-to-continue-transforming-how-organizations-create-and-deliver-digital-products-301202799.html
31. PyCon Canada 2012 讲者页（Groupon MTS / 原 Obtiva Chief Scientist / Object Mentor International Senior Consultant）
    https://2012.pycon.ca/en/learn
32. I T.A.K.E. Unconference 讲者介绍（同上的职位表述 + 个人自述引语）
    https://itakeunconf.com/software-craft/meet-michael-feathers-keynote-i-t-a-k-e-unconference/
33. Engineers.SG 讲者页（2016-10-17《Strategic Code Deletion》Agile Singapore）
    https://engineers.sg/presenter/mfeathers
34. Object Mentor 官方页面（"Robert C. Martin is the founder and president of Object Mentor"——用于证伪任务书前提）
    https://objectmentor.com/resources/books.html
35. InformIT《Brutal Refactoring》商品页（长期未出/日期字段异常的证据）
    https://www.informit.com/store/brutal-refactoring-more-working-effectively-with-legacy-9780321793201
36. YOW! Sydney 2025 讲者页（"Forces in Software" masterclass / "Conceptualisation" talk）
    https://yowcon.com/sydney-2025/speakers/3875/michael-feathers
37. CERN Indico 活动页（2014-11，R7K Founder/Director 的早期出处之一）
    https://indico.cern.ch/event/344367

**来源统计**：一手 21 条，二手 15 条，合计 37 条（含 2 条仅能通过搜索摘要读取的 substack 页）。一手占比约 **57%**（21/37）。

---

## 十、给下游蒸馏的三条提醒（`[推断]`，非事实）

1. **他的"决策"几乎都是"不做什么"的决策**：不整包重写、不写第二版、不批评阵营、不指名客户、不做"我们必须这样做"的推进者。他最稳定的行为模式是**拒绝在信息不足时下结论**，然后去把信息补上（Research），再把它传出去（Conveyance）。这与他公司的命名是同一件事。
2. **他的技术判断几乎全部由"理解优先"推导出来**：测试是理解手段、seam 是理解的入口、scratch refactoring 是理解的草稿、删代码是消除误解、AI 的价值是扩张可能性空间。任何与他意见相左的判断，都可以先用"这会不会让你更难理解系统"去预测他站哪边。
3. **引用他的话必须带时间戳**。同一个人 2004 说 "code without tests is bad code"，2011 说"那是我作为顾问的恐惧"，2023 说"legacy code 也可以是不理解的代码"，2026 说"真正的风险是用前所未有的速度生成你不理解的代码"。他的立场是**连续演化的**，掐头去尾任何一句都会失真。
