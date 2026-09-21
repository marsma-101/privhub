# 一手摘录：Shape Up 的 2025–2026 演进与 AI 时代立场

> 抓取时间：2026-09-17（依据主机时钟）
> 本文件存放**对下游场景（非程序员 + AI 生成代码 + 无产品团队）最直接相关**的一手材料。
> 与 `shapeup-official-fulltext-notes.md`（2019 原书）互补：那份是「书里写的」，这份是「他们后来怎么改了」。

---

## 一、Ryan Singer《End-To-End with Shape Up: A Real-World Case Study》（2025-11-18）

**来源**：https://www.ryansinger.co/end-to-end-with-shape-up-a-real-world-case-study/ ｜ **[一手]**（作者本人发布的 30 分钟视频 + 完整 transcript）

**为什么这份材料对下游最关键**：书是 2019 年描述 Basecamp 的，而这份是 Singer **以 fractional CPO（兼职首席产品官）身份，带一个「结构更典型」的真实团队**跑完全程的复盘。他**亲口承认书描述的是家不寻常的公司**，并给出了转译版本。这正是「非程序员 + 无产品团队」场景的官方转译依据。

### 1.1 他亲口承认「书描述的是特例」

> 「if you pick up the book, what you'll see is it's describing, you know, **not how all companies should work or what works at all companies. It's actually very specifically describing what we did at Basecamp at that time. And Basecamp is an unusual company.** I mean, very senior people all across the board, very small, everybody very technical, **every designer was hands-on coding themselves**, founders very hands-on and close, lots of people wearing multiple hats with a big overlap of skills. I mean, there was a lot of unusual things there.」

> 「So what I'm going to show you now is a case study from a different company. ... That team has **a little bit more of a typical structure** that you'd see on teams today, where there's separate backend, frontend, designer, QA, different marketing, sales. There's a little bit more of this separation of responsibility.」

**→ 对下游的意义**：「书里那套需要资深全栈多面手」这个前提，是作者本人承认的**特例**，不是方法的要求。

### 1.2 三段检查点：Framing → Shaping → Building（2025 版的新说法）

> 「in order for building to go well, we're going to have to be clear about what is it that we're actually building from a technical standpoint. So we're going to call that **shaping**. And in order to understand what to shape, like what is it that we need to figure out how to build, **we need to have clarity around the problem that we're solving.** So what's the business problem? Where is the value to the customer? And so on. And we can call that **framing**.」

> 「upstream from that are broader pressures or strategic things that are pushing us to say this is the project we want to frame and shape now as opposed to that project.」

**→ 三段式**：战略压力 → **framing（框住问题与价值）** → **shaping（框住技术做法）** → building。**Framing 是书里没有、2025 才明确独立出来的一段。** 这恰好补上了「没有产品团队时谁来定义问题」的空缺。

### 1.3 轻量 Kanban：candidate → frame → shape 三段闸门

> 「the first thing I had to solve is how am I going to get us through these different phases of framing, shaping, and building in a way where everybody understands what we're doing and I can communicate it, but it's still lightweight. **So I just hacked together this Kanban board in Notion.**」

> 「these are different checkpoints. And **a candidate** is like, what's the thing that leadership thinks they want next that seems to be important that we might turn into the project that we're going to frame and shape?」

> 「my task now ... is, **how do I get this to the point where I can say the frame is go**, where I reach a frame checkpoint, where I would say, I actually understand the problem and outcome here.」

> 「where I want to get to next is this **shape checkpoint** where I can say very clearly, I understand what is it going to take to build this?」

**→ 可落地**：三个格子（candidate / framed / shaped），卡片只能按顺序右移。**这就是「一个人也能跑」的最小 Shape Up。**

### 1.4 从模糊需求到具体问题：一次「框架」实操

用户（CTO）给的原始需求是「improve the dashboard（改进仪表盘）」——正是典型的 grab-bag。

> 「when I hear improve the dashboard, this is something that happens a lot ... **it's very blurry. I don't really know what this means. What does it mean to like, what's wrong with the dashboard? What would it mean to make it better? How would we know that we're making it better? How would we make trade-offs? All these questions are kind of unanswered.**」

> 「**It doesn't mean that it's a bad candidate. Actually, it just means that there's some detective work to be done.**」

他的做法：不问「你想要什么样的仪表盘」，而是找**亲历过这个问题的领域专家（SME）**，问「你自己跑健身房时，真正必须盯的是什么」。

> 「So instead of just asking, you know, what would be a better dashboard? **I asked him, look, when you were running a gym and you know firsthand, what were the things that you had to track that were really important for you to stay on top of?** And he opens up his spreadsheet from when he ran his gym.」

结果：真实需求是「**missed payments（漏付的会员费）**」和「class utilization（课程上座率）」，而不是「更好的仪表盘」。

> 「So, okay, we're already making progress, right? **This is not just about improve the dashboard. It's actually about surfacing failed member payments.**」

**→ 与书里 Ch.3 的「要日历 → 真实需求是看见空闲时段」是同一招，但这是在新场景下的复现。跨域复现 = 真信念。**

### 1.5 为什么必须先 shape：怕的是第三周被未知打脸

> 「**why not just go build this?** Sounds simple enough, right? We already have the data. We're just surfacing it. **Well, I know from painful experience that everything is harder than it seems. There's always hidden details. And I don't want those hidden complexities that we don't see yet popping up in week three of a six-week project** or week two of a four-week project where we thought we knew what we were doing and then all of a sudden it's like, oh, this model is more complicated or there's a dependency we didn't know about or there's extra scope here that we can't avoid.」

**→ 这是「为什么不直接让 AI 写出来」的最直接回答：不是不能做，是会把未知推到中途爆炸。**

### 1.6 Shape 会话的形态：2 小时、白板、和懂代码的人一起

> 「to do the shaping, I generally do this in **live sessions with the people who have the right knowledge.** ... **This was about a two-hour session where we're working together on the whiteboard.**」

> 「there's contracts, there's invoices, there's sales, there's customers, there's members. How does this, where does the data of a missed payment live, you know? **And we dug into technical things like that, started to get acquainted with how the current system works.**」

发现的 rabbit hole：详情页是收购来的遗留「hairball」，多 sale 类型 + 多 tab，**「the code is, let's say, not very friendly for a quick change」**。

**→ 「不需要会写代码，但需要懂技术」——书里 Ch.2「You don't need to be a programmer to shape, but you need to be technically literate」在这份案例里被实操化了。**

### 1.7 范围被砍的完整过程（**下游最该学的一段**）

第二轮 shaping 后，发现事情不只是「展示漏付」，而是「**解决漏付**」（要新做重试流程、请求换卡流程）。Singer 于是提出可能做不完 class utilization。

> 「I said to him, I said, you know, **I'm not sure we have time for all of this.** And he said, look, **I only told you about the class utilization thing. Don't get me wrong. The class utilization thing would be very useful, but I only told you about it because you said you needed more.**」

> 「So we were able to **reframe this to be 100% about missed payments. We actually don't need to do class utilization right now, just solving missed payments is a huge win.** We're fully aligned with kind of the original intent, we don't have to go back and change anything, but we have really found kind of that nugget of where the value is.」

**→ 关键机制：需求方自己承认「那条需求只是因为你问我要更多我才说的」。这证明「砍掉一半后还成不成立」是可验证的——去问需求方，而不是自己猜。**

### 1.8 垂直切片：**上限 9 个**

> 「What I find works really well is to **break the work up into at maximum nine separate scopes**, different things that we can actually build and demo independent of the rest.」

> 「**A vertical slice is we've got the back end and the front end wiring, you know, and we can click on this and demo it for this particular subset of the functionality.**」（对比 horizontal slice：全部后端做完但没东西可点，或 Figma 画完全部但都不能跑）

> 「we actually looked at the breadboard together and we found the places where we could make these slices, and gave those names ... **So we have a kind of plan of attack of what we're going to build and how this is going to come together.**」

**→ 「最多 9 个」是一个罕见的、可量化的硬上限。对「50 个插件」的场景，这是最直接可用的数字。**

### 1.9 先接线，后上漆（Wiring first, high fidelity last）

> 「**We didn't need to create Figma or high fidelity artifacts first. We actually did those last.** Starting at the breadboard, understanding what it is that we need to wire, then back end and front end working together to get to **an ugly but working prototype** that we can actually test. ... And then after everything was wired up and working then we applied the paint and polished it」

> 「you think of it like if you're building a house, you know, **we don't have to decide on the paint color first. What we need first is to understand where is the sink going to go, where are the pipes going to go, the walls, the electricity**, and then later on, you know, we can move the furniture and decide on the paint color」

**→ 对「AI 生成代码」场景：先让 AI 产出一个丑但能跑的完整竖切，再谈打磨。这是把「AI 出代码」纳入 Shape Up 的接口。**

### 1.10 他明确纠正了对「pitch」的误解（**与 2019 原书的区别**）

> 「If you read Shape Up, you'll see this word pitch ... And you can get **a kind of a misunderstanding that you're supposed to create a bunch of pitches, right? And then choose one pitch** because what do you do with a pitch, right? You're kind of selling something, right?」

> 「So you see something different here. **It's not that we're shaping many, many things and then choosing at the last minute, we're actually narrowing down before we even shape.** So we chose a candidate, got into framing. Then after the frame checkpoint said, this is something we actually want. **If we could do one thing, it would be this.** ... And then when we got to the checkpoint that this was shaped, it was basically a green light. **We didn't need to bet again.** We already had the alignment.」

> 「this is more what you see in real life teams is this kind of one-to-one. There's a window of time coming. ... **Let's figure out what are the top candidates for what we might want to do. What can we frame? ... Then let's just take those one or two things into shaping and into build.**」

**→ ⚠️ 重要修正**：书里的 betting table（多个 pitch 竞争、赢家进周期）在**小团队/单人场景下被 Singer 自己简化掉了**。2025 版的流程是**串行漏斗**（candidate → frame → shape → build，一次一个），不是**并行竞标**。这与附录 2「Small enough to wing it」一致，且更彻底。**下游若只有一个人，应当采用这个漏斗版，而不是 betting table 版。**

### 1.11 节奏：长段异步 + 稀疏的高强度同步

> 「**You see long stretches of asynchronous work. We don't have to have regular sync ups, regular status meetings.** ... Then contrast that with what the work looked like upstream of that. **We have very spiky, intense live work sessions, also with, you know, expensive people, right?** ... **The asynchronous, the long stretches of asynchronous time actually mean that there is this kind of slack and margin in our day, where if we need to go and have a session like this, we can go in for two hours, go really deep** ... and then get back into work where we were.」

> 「**We're progressively investing. We're gradually narrowing in. We're getting warmer and warmer** from, you know, it has something to do with improving the dashboard to specifically it's about missed payments to failed payments to shaping exactly what that looks like」

### 1.12 产出物清单（可复制的模板）

| 阶段 | 产出物 | 内容 |
|---|---|---|
| Framing | frame 检查点（口头/白板即可） | 问题、业务价值、成功标准 |
| Shaping | 白板 + breadboard（**不是文档**） | 技术做法、rabbit hole、切片位置 |
| Kickoff 前 | **shaping 文档（即 pitch）** | frame 摘要 + shape 走查 + 最终 breadboard。**「the frame 可以当作整个 shape 的 acceptance test」** |
| Kickoff | 2 小时会议 | 第 1 小时过文档答疑；第 2 小时**一起切竖切（≤9）+ 排顺序** |
| 交付 | **launch brief** | 前后对比 + 真实截图 + 各状态流程 |

> 「**So I actually created the write-up, the document, what's called the pitch in the book.** I created that document so that we could have a reference and a source of truth for kickoff」
> 「you can think of **this frame as like kind of the acceptance test for the whole shape**」

---

## 二、DHH《Promoting AI agents》（2026-01-07）—— AI 立场的公开反转

**来源**：https://world.hey.com/dhh/promoting-ai-agents-3ee04945 ｜ **[一手]**

**背景**：2025 年夏他在 Lex Fridman 播客说自己**不用 AI 写代码**，受不了编辑器内自动补全。此文是反转节点。

> 「See, **I never really cared much for the in-editor experience of having AI autocomplete your code** as you were writing it. That was the original format pioneered by GitHub's Copilot and Cursor, but **it left me cold. When I code, I want to finish my own thoughts and sentences.** ... But with these autonomous agents, **the experience is very different. It's more like working on a team** and less like working with an overly-zealous pair programmer who can't stop stealing the keyboard」

> 「**Yes, I'm ready to give the current crop of AI agents a promotion.** They're no longer just here to help me learn, answer my questions, or check my work. **They're fully capable of producing production-grade contributions to real-life code bases.**」

> 「**pure vibe coding remains an aspirational dream for professional work for me, for now. Supervised collaboration, though, is here today.** I've worked alongside agents to fix small bugs, finish substantial features, and get several drafts on major new initiatives.」

> 「**I'm nowhere close to the claims of having agents write 90%+ of the code**, as I see some boast about online. I don't know what code they're writing to hit those rates, **but that's way off what I'm able to achieve, if I hold the line on quality and cohesion.**」

> 「Download OpenCode, throw some real work at Opus or the others ...」

**→ 对下游的三条意义**：
1. **「非程序员 + AI 生成代码」在 37signals 的世界观里不是禁忌**——DHH 本人已把 agent 当团队用。
2. 但他划了线：**Supervised collaboration 可以，「pure vibe coding」不行**（「aspirational dream」）。
3. 他明确否认「90%+ 代码由 AI 写」的说法——**下游若宣称「全部代码由 AI 生成」，恰好落在 DHH 明确不背书的那一档**。

---

## 三、37signals 官方「Signals」—— 公司层面的信念目录

**来源**：https://37signals.com/ （37signals.com/NN 共 38 条）｜ **[一手]**

这是 37signals 官网首页，自称 **「A catalog of ideas — signals — that drive us.」** 每条一句话，**是这家公司最浓缩的价值观清单**，也是「表达 DNA」的极端样本（每条基本 ≤2 句）。

### 已抓取原文的信号

| # | 标题 | 原文 | URL |
|---|---|---|---|
| 05 | Err on the side of do | 「The tendency to put off, push away, or otherwise delay is strong. No. Act and move on. And act again if you have to — **most decisions are temporary, anyway.**」 | [37signals.com/05](https://37signals.com/05) |
| 06 | Shape Up every six | 「**Shape Up is a methodology we invented** to help software teams design, develop, and ship excellent software every six weeks without burning out. **Why six? It's long enough to make meaningful progress, but short enough that you can see the end from the beginning. Plus it gives you about eight chances a year to recalibrate and decide what to work on next.**」 | [37signals.com/06](https://37signals.com/06) |
| 16 | The trap of marginal thinking | 引 Henry Ford（经 Clayton Christensen）：「If you need a machine and don't buy it, then you will ultimately find that you have paid for it and don't have it.」 | [37signals.com/16](https://37signals.com/16) |
| 21 | Know no | 「**"No" is no to one thing. "Yes" is no to a lot of things.**」 | [37signals.com/21](https://37signals.com/21) |

### 全部 38 条标题（**未逐条抓正文，标题本身即信号**）

```
00 Start here            01 An obligation to independence   02 Work isn't war
03 Small teams           04 Profit motive                   05 Err on the side of do
06 Shape Up every six    07 We don't sell you               08 8/8/8
09 NOTASAP               10 The Fortune 5,000,000           11 Don't emulate the office
12 Hours aren't equal    13 On repeat                       14 Meetings aren't free
15 Bury the hustle       16 The trap of marginal thinking    17 Politicking
18 Two tokens of customer service  19 Pay people, not addresses  20 Small tech
21 Know no               22 Stayups                         23 Thoughting vs. thinking
24 Fixed                 25 Disagree and commit              26 Kick in the face, kick in the ass
27 Broadly speaking      28 Shots on goals                   29 JOMO not FOMO
30 Miscommunication problems  31 Easy?                       32 Ruby on Rails
33 Planning is guessing  34 Sleep on it                      35 Companies aren't families
36 Context > consistency 37 What's in a name?
```

**→ 直接与「功能取舍」相关的标题**：`03 Small teams`、`05 Err on the side of do`、`06 Shape Up every six`、`09 NOTASAP`、`14 Meetings aren't free`、`16 The trap of marginal thinking`、`21 Know no`、`23 Thoughting vs. thinking`、`24 Fixed`、`33 Planning is guessing`。
（正文未抓，引用时应只引标题或另行抓取；本文件不代拟正文。）

### ⚠️ 需要注意的一个内在张力（重要）

- **Signal 21「Know no」**：「"No" is no to one thing. "Yes" is no to a lot of things.」——**说不是主要工作。**
- **Signal 05「Err on the side of do」**：「Act and move on. And act again if you have to — most decisions are temporary, anyway.」——**别拖，先做，做错了再改。**

**这两条在「一个功能到底该不该做」上方向相反。** 官方把两条并列挂在首页，说明这不是失误，而是他们真实的操作区分——**推测**其分界线在于「决策是否可逆」：可逆的（做一下试试）就做，不可逆的（承诺一整周期、占掉他人时间）就说「不」。但**这条分界线是我 [推断] 的，官方 Signals 页没有给出解释**。下游使用时须注意。

---

## 五、Basecamp 官方 Guides —— 两篇与「功能取舍」直接相关的操作准则

**来源**：https://basecamp.com/guides/ ｜ **[一手]**（37signals 官方发布并经维护，页脚 © 37signals LLC）

Basecamp 站内有一组官方 Guides，其中两篇与下游场景高度相关，且**不在《Shape Up》书内**。

### 5.1《Seven Shipping Principles》 https://basecamp.com/guides/seven-shipping-principles

七条原则标题：
1. We only ship good work
2. We ship when we're confident
3. We ship when the work is finished
4. We own the issues after we ship
5. We don't ship if it isn't right
6. We ship our collective best effort
7. **We ship to our appetite**

**最关键的两段（原文）**：

> 「This is not a general license to gold-plate everything. **We intentionally constrain ourselves through the cycles in Shape Up, such that we don't end up spending 2 months on stuff that warranted 2 weeks worth of work. Not every batch of work is going to be a 10/10. But if it's less than 8/10, it probably shouldn't go out the door. If it's less than a 7/10, there's no way it should go out the door**, except as an emergency patch you immediately return to cleanup.」

> 「The time constraint imposed by the appetite is meant to **force trade-offs and concessions. To curb the ambition that naturally turns every idea into a project that drags on forever by people drawn to perfection.**」

> 「You'll nearly always hit the time constraint with more ideas, more minor issues, and more polish to do. That might feel frustrating in the moment. _If only I had two more weeks!_ **But if you had two more weeks, chances are you'd just expand your ambitions accordingly, and you'd wish for two more weeks in addition to that at the end.**」

> 「**Constraints force us to make choices and rank what we'd rather have if it's "or" not "and".** They serve as an objective way to force other stakeholders to accept the art of the possible. **Everyone can come up with ideas for more, but it's much harder to decide on what would you rather if you can't have both. What we usually need are substitutions, not additions.**」

> 「**Feature creep and blown estimates are the industry standard. Our standard is that we ship the best work within the time we've given it, and we hold our heads proud to the compromises that entail.**」

同时给出**质量刻度**（罕见的可量化标准）：

> 「if it's less than **8/10**, it probably shouldn't go out the door. If it's less than a **7/10**, there's no way it should go out the door」

以及**关键性分级**（决定要不要多花时间验证）：

> 「High criticality work involves **anything that mutates or munges data. If you can lose data, it's high criticality.** ... Lower criticality work is anything that merely changes the presentation of existing data, or works on entirely new sets of data, or deals with screens or features off the critical path.」

> **→ 对下游的意义**：文件管理系统天然涉及「mutates or munges data」（上传/移动/删除/去重/索引），按 37signals 自己的标准属于 **high criticality**。这正好触到本 Skill 的诚实边界——**该场景不能照抄「先上线再修」的轻量做法**。

### 5.2《The 37signals Guide to Making Decisions》 https://basecamp.com/guides/how-we-make-decisions

官方原话开场：

> 「A company is essentially two things: **a group of people and a collection of decisions.** How those people make these decisions is the art of running a business.」

正文是 **38 条决策自问**。其中与「一个功能到底做不做」最直接相关的（原文逐条摘）：

> 1. 「**Why are we deciding anything at all? Does a decision actually need to be made here?**」
> 2. 「Is the right person making this decision? Not the right role, but **the right person with the right information, context, and insight**? Who's merely chiming in?」
> 3. 「**If we remove the immediate impact, how do we think we'll feel about this decision a year from now?**」
> 7. 「**Can we make this decision smaller? Can we take one big decision and turn it into three smaller ones?**」
> 8. 「**How easily can we reverse the decision?**」
> 10. 「**What would happen if we just didn't make the decision?**」
> 14. 「**Is there even a wrong decision?**」
> 18. 「**Will this decision eliminate the need to make other decisions, or will it create the necessity to make even more decisions?**」
> 20. 「**Will this decision make more work for people that don't have extra time for that work? Or will it eliminate work?**」
> 24. 「Is anyone outside the company depending on this, or **is this a decision of our own making?**」
> 25. 「**How does this decision impact customers vs. impact us?**」
> 32. 「**When and how will we know whether the decision was the right one, or if it even mattered?**」
> 33. 「When the consequences of our decision appear, are they **likely to be visible with the naked eye or do they require a microscope to detect? If the latter, does it even matter?**」
> 37. 「**What gets easier if we make this decision? What gets harder? Will easier remain easier in the long term, or is it short-term easy but long-term hard? And vice versa.**」

> **→ 第 33 条是「50 个插件」场景的精确手术刀**：一个插件带来的问题，是肉眼可见的，还是得拿显微镜才看得见？如果是后者，就根本不用管它。

### 5.3《The 37signals Guide to Internal Communication》 https://basecamp.com/guides/how-we-communicate

**30 条沟通原则**，其中对「单人 / 无团队」场景仍然成立的（原文）：

> 5. 「**Meetings are the last resort, not the first option.**」
> 6. 「**Writing solidifies, chat dissolves. Substantial decisions start and end with an exchange of complete thoughts, not one-line-at-a-time jousts. If it's important, critical, or fundamental, write it up, don't chat it down.**」
> 9. 「**Never expect or require someone to get back to you immediately unless it's a true emergency. The expectation of immediate response is toxic.**」
> 12. 「**Companies don't have communication problems, they have miscommunication problems. The smaller the company, group, or team, the fewer opportunities for miscommunication.**」
> 16. 「**"Now" is often the wrong time to say what just popped into your head. It's better to let it filter it through the sieve of time. What's left is the part worth saying.**」
> 18. 「**The end of the day has a way of convincing you what you've done is good, but the next morning has a way of telling you the truth. If you aren't sure, sleep on it before saying it.**」
> 20. 「**Occasionally pick random words, sentences, or paragraphs and hit delete. Did it matter?**」
> 21. 「**Urgency is overrated, ASAP is poison.**」

**更有价值的是「节奏装置」一节**——两个按六周循环的官方实践，**单人也完全可执行**：

> **Heartbeats（← 每 6 周回顾）**：「Heartbeats summarize the last ~6-weeks of work for a given team, department, or individual (**if that person is a department of one**). They're written by the lead of the group... They summarize the big picture accomplishments, they detail the little things that mattered ... **They'll also shine a light on challenges and difficulties along the way. They're a good reminder that it's not all sunshine all the time.**」

> **Kickoffs（→ 每 6 周前瞻）**：「Kickoffs are essentially the opposites of Heartbeats. **Rather than reflect, they project.** They're all about what the team plans on taking on over the next 6 weeks.」

> **→ 对下游的意义**：官方原文里明确写了 **「if that person is a department of one」**——**37signals 自己承认这套装置对「一个人」也适用。** 这是「单人版 Shape Up」最硬的一手背书之一。

---

## 六、血统：这三套观点的 2006 年祖先（《Getting Real》）

**来源**：https://basecamp.com/gettingreal ｜ **[一手]**（37signals 官方免费全文，页脚 © 37signals LLC）
**意义**：《Getting Real》（2006）是《Rework》（2010）与《Shape Up》（2019）的前作。**「功能取舍」这套主张在本公司已有 20 年历史，且用词比《Shape Up》更狠。** 这决定了它不是一时观点，而是组织级信条。

### 6.1 Ch.23《Start With No》 https://basecamp.com/gettingreal/05.3-start-with-no

> 「**Make features work hard to be implemented.**」

> 「The secret to building half a product instead of a half-ass product is **saying no**.」

> 「**Each time you say yes to a feature, you're adopting a child.** You have to take your baby through a whole chain of events (e.g. design, implementation, testing, etc.). **And once that feature's out there, you're stuck with it. Just try to take a released feature away from customers and see how pissed off they get.**」

> 「**Make each feature prove itself and show that it's a survivor.** It's like "Fight Club." **You should only consider features if they're willing to stand on the porch for three days waiting to be let in.**」

> 「**That's why you start with no. Every new feature request that comes to us — or from us — meets a no. We listen but don't act. The initial response is "not now." If a request for a feature keeps coming back, that's when we know it's time to take a deeper look. Then, and only then, do we start considering the feature for real.**」

> 「And what do you say to people who complain when you won't adopt their feature idea? **Remind them why they like the app in the first place. "You like it because we say no. You like it because it doesn't do 100 other things. You like it because it doesn't try to please everyone all the time."**」

同章还引用了 Derek Sivers（CD Baby）记述的 Steve Jobs 原话（**注意：这是转引，[二手]，非 37signals 本人所说**）：

> 「I know you have a thousand ideas for all the cool features iTunes could have. So do we. **But we don't want a thousand features. That would be ugly. Innovation is not about saying yes to everything. It's about saying NO to all but the most crucial features.**」

**→ 对下游最关键的一条**：「**once that feature's out there, you're stuck with it**」——这正是「50 个插件的功能蔓延」的病因诊断：**问题不在当初为什么加，而在加了之后拿不掉。** 官方给的解药是「**not now**」（不是「永不」，是「现在不」），并且**看它会不会自己回来**。

### 6.2 同书其他相关章节（标题级，正文本次未抓）

| 章 | 标题 | URL |
|---|---|---|
| Ch.7 | **Fix Time and Budget, Flex Scope** ←「Fixed time, variable scope」的 2006 年原型 | [/gettingreal/02.4](https://basecamp.com/gettingreal/02.4-fix-time-and-budget-flex-scope) |
| Ch.17 | **It's a Problem When It's a Problem** ←「先别修，等它真成问题」 | [/gettingreal/04.3](https://basecamp.com/gettingreal/04.3-its-a-problem-when-its-a-problem) |
| Ch.21 | **Half, Not Half-Assed** | [/gettingreal/05.1](https://basecamp.com/gettingreal/05.1-half-not-half-assed) |
| Ch.22 | **It Just Doesn't Matter** ←「这件事根本不重要」 | [/gettingreal/05.2](https://basecamp.com/gettingreal/05.2-it-just-doesnt-matter) |
| Ch.24 | **Hidden Costs** ← 加功能的隐性代价 | [/gettingreal/05.4](https://basecamp.com/gettingreal/05.4-hidden-costs) |
| Ch.25 | **Can You Handle It?** | [/gettingreal/05.5](https://basecamp.com/gettingreal/05.5-can-you-handle-it) |
| Ch.27 | **Forget Feature Requests** | [/gettingreal/05.7](https://basecamp.com/gettingreal/05.7-forget-feature-requests) |
| Ch.28 | **Hold the Mayo** | [/gettingreal/05.8](https://basecamp.com/gettingreal/05.8-hold-the-mayo) |
| Ch.89 | **Beware the Bloat Monster** ← 直接对应「功能蔓延」 | [/gettingreal/15.7](https://basecamp.com/gettingreal/15.7-beware-the-bloat-monster) |
| Ch.13 | **Embrace Constraints** | [/gettingreal/03.4](https://basecamp.com/gettingreal/03.4-embrace-constraints) |
| Ch.37 | **Alone Time** ← 不被打断的时间 | [/gettingreal/07.2](https://basecamp.com/gettingreal/07.2-alone-time) |
| Ch.35 | **Shrink Your Time** | [/gettingreal/06.7](https://basecamp.com/gettingreal/06.7-shrink-your-time) |

> **整本书 91 章的目录清单**已由 01-writings.md 记录，此处不重复。

---

## 七、Ryan Singer《Common Pitfalls When Adopting Shape Up》（2025-10-28）—— 作者本人列出的三大失败模式

**来源**：https://www.ryansinger.co/pitfalls-when-adopting-shape-up/ ｜ **[一手]**（作者本人）

**这篇是回答「Shape Up 在真实团队为什么失败」的**最权威一手材料**——不是外人的批评，是作者自己说的。**

> 「I see some common pitfalls when people try to do Shape Up "by the book." **There are things in the book that are Basecamp-specific or often misunderstood**, and teams who successfully adopt Shape Up all find ways around them. **It'll save you a lot of headache if you can call these out and formalize them up front, instead of hoping that your teams will independently figure them out.**」

### Pitfall #1：Shaping without technical depth（**第一号失败模式**）

> 「**The book says shaping is primarily design work. But everyone at Basecamp — including designers — was very technical!** If you try to shape with only PMs and non-technical designers, **projects will churn because of the unanswered questions that blow up during build. The #1 failure mode of attempted Shape Up adoptions is "undershaped" work.**」

> 「**Shaping sessions should involve senior technical people who know the realities of the code.** Designers who shape should be of the "interaction" type vs. the stylist type. **The main output is the wiring of how it works.** Think the blueprint of the house, the walls and electrical wires, not the 3D rendering of the kitchen interior.」

> 「**Rabbit holes are commonly misunderstood. Any rabbit hole that isn't solved during shaping is a time bomb that can churn the project.**」

> 「**High fidelity design done too early will blow up. Build something raw and ugly that meets the functional and interaction requirements first, and style it last** — literally in the late stages of the build cycle.」

> **⚠️ 这一条直接命中下游场景**：「shaping 需要懂代码的资深者参与」。而下游是**非程序员 + 全部代码由 AI 生成 + 没有产品团队**——按 Singer 本人的判定，这**正是最容易产生 "undershaped" work 的配置**。这是本 Skill 必须写明的第一号诚实边界。

### Pitfall #2：Blurred framing and shaping

> 「You will find that the recommendation to shape with technical people makes shaping harder to coordinate and more "expensive". Therefore, you will want **clearer problem definition and more alignment up front** to justify the sessions and make them productive.」

> 「**There is a distinct work step to nail down the actual problem and outcome before shaping. We didn't have a word for it when I wrote the book. Now it's called Framing. (It's implicit in the book. Ch. 3 "Set boundaries" is actually framing. Ch. 4-5 is shaping.)**」

> **→ 这是作者本人对 2019 原书的直接修正**：书的 Ch.3 其实是 framing，Ch.4–5 才是 shaping。原书把两件事混在「shaping」一个词里了。

> 「**When framing isn't tight, the shaping and build phases will go in circles or spiral out in scope. Fuzzy framing also leads to "shiny object syndrome" — when projects get canceled or swapped for other projects midway because there wasn't enough clarity about the outcome to create conviction.**」

> 「**Framing is about the problem, the business value, the outcome, etc. Shaping is about the technical solution. Framing is what we solve, shaping is what we build.**」

> 「In terms of documents, I recommend referring to the "frame" and the "shape." **This avoids misunderstandings about "pitch."** Be careful with terms like "one pager" where it's not clear what work step they belong to.」

**官方给的三段状态词（可直接做成看板三列）**：

> - 「**Candidate** — A request or idea that hasn't been framed yet.」
> - 「**Frame Go** — Approved to shape. Problem/outcome are tight enough and it seems there is an idea worth shaping from both a technical and product POV.」
> - 「**Shape Go** — Ready to build. **No material unknowns from both a technical and interaction standpoint.**」

> 「Have checkpoints (in terms of approval) for the framing and shaping steps. **Framed means "we are aligned on the problem and outcome, and we understand this enough to shape it." Shaped means "we can give this to someone to build and they will know what to do."**」

### Pitfall #3：Mixing in non-project work（**对「一个人」场景尤其关键**）

> 「**If you don't separate out the shaped project work from incidents, urgent issues, etc, the team won't be able to focus. There will be too much WIP all the time and it will be hard to understand what is priority and what the real capacity of the team is.**」

> 「**Create separate capacity (time, team, rotation schedule...) for reactive / on call work.** Communicate this clearly so everyone knows what work they are doing and not doing. **Make the allocation/capacity explicit so you can measure when you have too much or too little.**」

> 「**Track urgent work with tickets. Put them in a different place or tool from the shaped project work so that they don't mix together.**」

> 「**Separate small things from urgent things. A bug that is not on fire should be batched for a rainy day. A bug that is on fire with an upset stakeholder needs attention.**」

> 「**Project work that relies on third parties is technically reactive work. If you are waiting for a response from someone else, you don't control the cycle schedule. Better to do that work on a kanban than Shape Up style.**」

> **→ 对下游最重要的一条**：**「不依赖第三方的才适合 Shape Up，依赖别人的（等上游合并、等别人回复）应走看板。」** 对自托管项目，凡是「等上游依赖更新」「等用户反馈」的功能，都不该放进固定周期。

---

## 九、37signals 官方「What Influenced Us」——智识谱系的一手自述

**来源**：https://37signals.com/what-influenced-us ｜ **[一手]**（官方页面，抓取于 2026-09-17）

**为什么重要**：这份页面**把「影响过 37signals 的人与书」直接列出来了**，不再需要外部推断。原话开场：

> 「If you want to learn the 37signals view of the world, it helps to know the influences that helped form it. We've been around since 1999. Since then there's been a number of key influencers that have marked the company culture.」

### 9.1 书籍（官方逐条附了「为什么」）

| 书 | 作者 | 官方原话（为什么影响我们） |
|---|---|---|
| **Turn The Ship Around** | David Marquet | 「_Leadership should mean giving control rather than taking control and creating leaders rather than forging followers_」……**37signals employs great people and they deserve the freedom and autonomy to act on their own. Don't wait for permission, just state what you're going to do, and then do it.** |
| **Finding Flow** | Mihaly Csikszentmihalyi | 「True happiness is found in optimal moments of engagement when we stretch just beyond our abilities and lose track of time and space in the process. **Protecting the flow by limiting interruptions has been a driving principle of 37signals.**」 |
| **Punished by Rewards** | Alfie Kohn | 「**We don't strive for trophies, swoon for trinkets, gameify our apps with badges, or push any other form of extrinsic motivation** for neither ourselves nor our customers. Working at 37signals should be about the intrinsic motivation of doing a good job, not because you're trying to impress someone else.」 |
| **The Manual** | Epictetus | 「_Do not wish that all things will go well with you, but that you will go well with all things_」. Core lessons on **keeping calm and carrying on** that have inspired and guided us. |
| **Maverick** | Ricardo Semler | 「**Ricardo Semler helped us find the confidence to promote and push for weird and different ways of working** by showing just how weird and different you can work at even a place as stodgy as a 8,000-person industrial company in Brazil.」 |

### 9.2 人物（官方只列名字，未附理由）

**Kent Beck**（极限编程 / TDD）· **Martin Fowler**（重构 / 敏捷）· **Kathy Sierra**（创造热情用户）· **Christopher Alexander**（《建筑模式语言》，软件设计模式的思想源头）· **Bob Moesta**（Jobs-to-be-Done）· **Charles Munger**（《穷查理宝典》，多元思维模型）

### 9.3 这份清单解释了三个此前的疑问

1. **为什么「不被打断」是他们的核心信条？** → 官方明说来自 **Finding Flow（心流理论）**。这解释了书 Ch.8 那句「**Losing the wrong hour can kill a day. Losing a day can kill a week.**」——**它不是流程偏好，是心流理论的直接推论。**
2. **为什么「不能中途加人」在他们那里是常识？** → 清单里没有 Brooke 的书，但 **Kent Beck / Martin Fowler** 与 **Christopher Alexander** 的存在说明他们的软件工程观来自 XP/重构传统，而非自创。（《Getting Real》收录 Fred Brooks 与 Ganssle 的论证，见 01-writings.md。）
3. **为什么 Shape Up 的智识底座与本 Skill 的「心智模型」写法契合？** → **Charles Munger 在官方影响者名单里。** 这为「用多元模型看问题」提供了官方的谱系依据（**[推断]**：官方未说明 Munger 具体影响了什么，此处属合理推断，不可当作官方声明）。

**⚠️ 注意**：官方此页**没有提到 Eric Ries / 精益创业**，也没有提 JTBD 的 Christensen。**「Shape Up 受精益创业影响」这类说法在本 Skill 中一律标 [推断]、且不得与官方清单并列。**

---

## 十、本文件未覆盖

- DHH《Endless execution》（2026-08-09）、REWORK Ep.194《AI challenges in software development》（2026-07-01）中「Basecamp 5 是第一个全面 AI 加速的开发过程」「设计师可直接实现」「设计师/junior 改 Ruby/JS 必须由资深者 review」等表述 —— **本文件未直接抓取原文，仅有 06-timeline.md 的转述**。引用时应回到 `06-timeline.md` 的 URL 并标注来源等级。
- Ryan Singer《What's the right level of detail when shaping?》（2026-02-06，提出 frame 与 shape 目的分离）—— **未直接抓取**，仅见 06-timeline.md 转述。
- 37signals Signals 其余 33 条的正文 —— **未抓取**。
