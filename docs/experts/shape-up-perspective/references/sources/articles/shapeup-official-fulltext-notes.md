# 《Shape Up》官方全文 · 一手摘录笔记

> 抓取方式：web_fetch 直接抓取 basecamp.com/shapeup 官方免费全文
> 抓取时间：2026-09-17（依据主机时钟）
> 性质：**[一手]** —— 37signals 官方在线全文，作者 Ryan Singer，前言 Jason Fried
> 版权页显示 `Copyright ©1999-2026 37signals LLC`，说明该书仍在官方渠道维护

本文件是 Phase 2 提炼的**举证底稿**：凡 SKILL.md 中带引号的英文原句，均可在此文件或各 research 文件中找到出处。此文件不重复 01-writings.md 的分析，只存原文。

---

## 已抓取章节清单

| 章节 | URL | 状态 |
|------|-----|------|
| 全书目录 + 完整 Glossary | https://basecamp.com/shapeup | ✅ 已抓 |
| Ch.2 Principles of Shaping | https://basecamp.com/shapeup/1.1-chapter-02 | ✅ 已抓 |
| Ch.3 Set Boundaries（Appetite / Fixed time variable scope） | https://basecamp.com/shapeup/1.2-chapter-03 | ✅ 已抓 |
| Ch.6 Write the Pitch（五个配料 / No-gos） | https://basecamp.com/shapeup/1.5-chapter-06 | ✅ 已抓 |
| Ch.7 Bets, Not Backlogs | https://basecamp.com/shapeup/2.1-chapter-07 | ✅ 已抓 |
| Ch.8 The Betting Table（Circuit breaker / 六周由来 / bug） | https://basecamp.com/shapeup/2.2-chapter-08 | ✅ 已抓 |
| Ch.14 Decide When to Stop（Scope hammering） | https://basecamp.com/shapeup/3.5-chapter-14 | ✅ 已抓 |
| Appendix 2 Adjust to Your Size | https://basecamp.com/shapeup/4.1-appendix-02 | ✅ 已抓 |
| Appendix 3 How to Begin to Shape Up | https://basecamp.com/shapeup/4.2-appendix-03 | ✅ 已抓 |
| 其余章节（Ch.1/4/5/9/10/11/12/13/15 + 附录1） | 同域名 | ⬜ 本次未逐章抓取，仅有目录级信息 |

---

## 1. 官方术语表（Glossary）全文 —— 最硬的一手定义

以下为 basecamp.com/shapeup 页面 Glossary 部分**逐条原文复制**（英文为官方原文）：

| 术语 | 官方定义（原文） |
|------|------------------|
| **Appetite** | The amount of time we want to spend on a project, as opposed to an estimate. |
| **Baseline** | What customers are doing without the thing we're currently building. |
| **Bet** | The decision to commit a team to a project for one cycle with no interruptions and an expectation to finish. |
| **Betting table** | A meeting during cool-down when stakeholders decide which pitches to bet on in the next cycle. |
| **Big batch** | One project that occupies a team for a whole cycle and ships at the end. |
| **Breadboard** | A UI concept that defines affordances and their connections without visual styling. |
| **Circuit breaker** | A risk management technique: Cancel projects that don't ship in one cycle by default instead of extending them by default. |
| **Cleanup mode** | The last phase of building a new product, where we don't shape or bet on any particular projects but instead allocate unstructured time to fix whatever is needed before launch. |
| **Cool-down** | A two-week break between cycles to do ad-hoc tasks, fix bugs, and hold a betting table. |
| **Cycle** | A six week period of time where teams work uninterruptedly on shaped projects. |
| **De-risk** | Improve the odds of shipping within one cycle by shaping and removing rabbit holes. |
| **Discovered tasks** | Tasks the team discovers they need to do after they start getting involved in the real work. |
| **Downhill** | The phase of a task, scope or project where all unknowns are solved and only execution is left. |
| **Fat marker sketch** | A sketch of a UI concept at very low fidelity drawn with a thick line. |
| **Hill chart** | A diagram showing the status of work on a spectrum from unknown to known to done. |
| **Iceberg** | A scope of work where the back-end work is much more complex than the UI or vice versa. |
| **Imagined tasks** | Work the teams decide they need to do after just thinking about the project. See discovered tasks. |
| **Layer cake** | A scope of work you can estimate by looking at the surface area of the UI. |
| **Level of abstraction** | The amount of detail we leave in or out when describing a problem or solution. |
| **Must-haves** | Tasks that must be completed for a scope to be considered done. |
| **Nice-to-haves** | Task left for the end of the cycle. If there isn't time to do them, they get cut. Marked with a '~' at the beginning. |
| **Pitch** | A document that presents a shaped project idea for consideration at the betting table. |
| **Production mode** | A phase of building a new product where the core architecture is settled and we apply the standard Shape Up process. |
| **Rabbit hole** | Part of a project that is too unknown, complex, or open-ended to bet on. |
| **R&D mode** | A phase of building a new product where a senior team spikes the core features to define the core architecture. |
| **Raw ideas** | Requests or feature ideas that are expressed in words and haven't been shaped. |
| **Scopes** | Parts of a project that can be built, integrated, and finished independently of the rest of the project. |
| **Scope hammering** | Forcefully questioning a design, implementation, or use case to cut scope and finish inside the fixed time box. |
| **Shape** | Make an abstract project idea more concrete by defining key elements of the solution before betting on it. |
| **Six weeks** | The length of our cycles. Six weeks is long enough to finish something meaningful and short enough to feel the deadline from the beginning. |
| **Small batch** | A set of 1-2 week projects that a single team ships by the end of a six week cycle. |
| **Time horizon** | The longest period of time where we can feel a deadline pushing on us from the beginning. Six weeks. |
| **Uphill** | The phase of a task, scope or project where there are still unknowns or unsolved problems. See downhill. |

**注意**：术语表明确写了 `Appetite = "as opposed to an estimate"`，`Six weeks = "short enough to feel the deadline from the beginning"`。这两句是「Appetite 不是 Estimate」的最直接一手证据。

---

## 2. Ch.3 Set Boundaries —— Appetite 与 Fixed Time / Variable Scope

URL: https://basecamp.com/shapeup/1.2-chapter-03 ｜ **[一手]**

### 2.1 Appetite 的定义与两档

> 「We call this the `appetite`. You can think of the appetite as a time budget for a standard team size. We usually set the appetite in two sizes:
> - `Small Batch`: This is a project that a team of one designer and one or two programmers can build in one or two weeks. We batch these together into a `six week` cycle (more on that later).
> - `Big Batch`: This project takes the same-size team a full six-weeks.」

> 「In rare cases where the scope is so big that a six-week project isn't conceivable, we'll try to hammer it down by narrowing the problem definition. If we still can't shrink the scope, we'll break off a meaningful part of the project that we can shape to a six-week appetite.」

### 2.2 Fixed time, variable scope —— 最关键的一段

> 「An appetite is completely different from an estimate. **Estimates start with a design and end with a number. Appetites start with a number and end with a design.** We use the appetite as a creative constraint on the design process.」

> 「This principle, called "fixed time, variable scope," is key to successfully defining and shipping projects. Take this book for an example. It's hard to ship a book when you can always add more, explain more, or improve what's already there. **When you have a deadline, all of a sudden you have to make decisions.** With one week left, I can choose between fixing typos or adding a new section to a chapter. That's the tension between time, quality, and scope. I don't want to release a book with embarrassing typos, so I'll choose to reduce the scope by leaving out the extra section. **Without the pressure of the fixed deadline, I wouldn't make the trade-off. If the scope wasn't variable, I'd _have_ to include the extra section. Then there'd be no time to fix the quality issues.**」

### 2.3 「Good」 is relative —— 反「完美解」的论证

> 「There's no absolute definition of "the best" solution. **The best is relative to your constraints. Without a time limit, there's always a better version. The ultimate meal might be a ten course dinner. But when you're hungry and in a hurry, a hot dog is perfect.**」

> 「We could model a whole set of database columns in the fancy version, or just provide a flat textarea in the simple version. We could redesign the main landing page to accommodate a new feature, or we could push it back to a screen with fewer design constraints. **We can only judge what is a "good" solution in the context of how much time we want to spend and how important it is.**」

### 2.4 Responding to raw ideas —— 「软性拒绝」的原文

> 「Our default response to any idea that comes up should be: **"Interesting. Maybe some day."** In other words, **a very soft "no" that leaves all our options open.** We don't put it in a backlog. We give it space so we can learn whether it's really important and what it might entail.」

> 「It's too early to say "yes" or "no" on first contact. Even if we're excited about it, we shouldn't make a commitment that we don't yet understand. We need to do work on the idea before it's shaped enough to bet resources on. **If we always say "yes" to incoming requests we'll end up with a giant pile of work that only grows.**」

> 「It's important to keep a cool manner and a bit of a poker face. We don't want to shut down an idea that we don't understand. ... **showing too much enthusiasm right away can set expectations that this thing is going to happen.**」

### 2.5 Narrow down the problem —— 两个关键案例（可直接类比）

**案例 A：复杂权限规则 → 一天改动的警告文案**

> 「We once had a customer ask us for more complex permission rules. **It could easily have taken six weeks to build the change she wanted.** Instead of taking the request at face value, we dug deeper. It turned out that someone had archived a file without knowing the file would disappear for everyone else using the system. **Instead of creating a rule to prevent some people from archiving, we realized we could put a warning on the archive action itself that explains the impact. That's a one-day change instead of a six-week project.**」

**案例 B：要一个日历 → 真实需求是「看见空闲时段」**

> 「In that case we flip from asking **"What could we build?"** to **"What's really going wrong?"** Sure, a calendar sounds nice. But what is driving the request? **At what point specifically does someone's current workflow break down without this thing they're asking for?**」

> 「we asked her _when_ she wanted a calendar. What was she doing when the thought occurred to ask for it?」
> 「The insight wasn't "computerize the calendar"—that's obvious. **What we learned was that "see free spaces" was the important thing for this use case, not "do everything a calendar does."**」
> 「We narrowed down the need from "do everything a calendar does" to **"help me see free spaces so I can figure out when to schedule something."**」

> 「What if we can't figure out a specific pain point or use case? **Our appetite can also tell us how much research is worthwhile. If it's not critical now and we can't get our hands around the problem, we'll walk away from it and work on something else.**」

### 2.6 Watch out for grab-bags —— 反「重构 / 2.0」项目

> 「When it comes to unclear ideas, the worst offenders are **"redesigns" or "refactorings" that aren't driven by a single problem or use case.** When someone proposes something like "redesign the Files section," that's **a grab-bag, not a project.** It's going to be very hard to figure out what it means, where it starts, and where it ends.」

> 「Here's a more productive starting point: "We need to rethink the Files section because sharing multiple files takes too many steps." Now we can start asking: What's not working? In what context are there too many steps? What parts of the existing design can stay the same and what parts need to change?」

> 「**A tell-tale sign of a grab-bag is the "2.0" label.** We made the mistake in the past of kicking off a "Files 2.0" project without really considering what that meant. Our excitement about improving a huge part of our app got the better of us. We know there were a lot of problems with our Files feature, but we didn't ask ourselves what specifically we were going to do. **The project turned out to be a mess because we didn't know what "done" looked like.** We recovered by splitting the project into smaller projects, like "Better file previews" and "Custom folder colors." We set appetites and clear expectations on each project and shipped them successfully.」

> **下游相关性极高**：作者本人承认「我们犯过这个错」，且给出恢复方式 = 拆成小项目 + 各自设 appetite。

---

## 3. Ch.7 Bets, Not Backlogs —— 反 backlog 的完整论证

URL: https://basecamp.com/shapeup/2.1-chapter-07 ｜ **[一手]**

> 「Now that we've written a pitch, where does it go? **It doesn't go onto a backlog.**」

> 「**Backlogs are a big weight we don't need to carry.** Dozens and eventually hundreds of tasks pile up that we all know we'll never have time for. **The growing pile gives us a feeling like we're always behind even though we're not.** Just because somebody thought some idea was important a quarter ago doesn't mean we need to keep looking at it again and again.」

> 「Backlogs are big time wasters too. **The time spent constantly reviewing, grooming and organizing old ideas prevents everyone from moving forward on the timely projects that really matter right now.**」

> 「Before each six-week cycle, we hold a `betting table` where stakeholders decide what to do in the next cycle. At the betting table, they look at pitches from the last six weeks — or any pitches that somebody purposefully revived and lobbied for again.」

> 「**Nothing else is on the table.** There's no giant list of ideas to review. There's no time spent grooming a backlog of old ideas. **There are just a few well-shaped, risk-reduced options to review.** The pitches are potential bets.」

> 「If we decide to bet on a pitch, it goes into the next cycle to build. **If we don't, we let it go. There's nothing we need to track or hold on to.**」

> 「What if the pitch was great, but the time just wasn't right? **Anyone who wants to advocate for it again simply tracks it independently—their own way—and then lobbies for it six weeks later.**」

> 「**Decentralized lists** ... Support can keep a list of requests or issues that come up more often than others. Product tracks ideas they hope to be able to shape in a future cycle. Programmers maintain a list of bugs they'd like to fix when they have some time. **There's no one backlog or central list and none of these lists are direct inputs to the betting process.**」

> 「This way the conversation is always fresh. **Anything brought back is brought back with a context, by a person, with a purpose. Everything is relevant, timely, and of the moment.**」

> 「**It's easy to overvalue ideas. The truth is, ideas are cheap.** They come up all the time and accumulate into big piles.」

> 「**Really important ideas will come back to you. When's the last time you forgot a really great, inspiring idea?** And if it's not that interesting—maybe a bug that customers are running into from time to time—it'll come back to your attention when a customer complains again or a new customer hits it. **If you hear it once and never again, maybe it wasn't really a problem. And if you keep hearing about it, you'll be motivated to shape a solution and pitch betting time on it in the next cycle.**」

> **下游相关性极高**：「重要的事会自己回来」这一条，正是把 50 个插件待办清单换成「让需求自己复现」的直接依据。

---

## 4. Ch.14 Decide When to Stop —— 砍范围的方法论（最可直接落地的一章）

URL: https://basecamp.com/shapeup/3.5-chapter-14 ｜ **[一手]**

### 4.1 Compare to baseline —— 与什么比

> 「Still, there's always more work than time. **Shipping on time means shipping something imperfect.** There's always some queasiness in the stomach as you look at your work and ask yourself: Is it good enough? Is this ready to release?」

> 「It helps to shift the point of comparison. **Instead of comparing up against the ideal, compare down to `baseline`—the current reality for customers.** How do customers solve this problem today, without this feature? What's the frustrating workaround that this feature eliminates? How much longer should customers put up with something that doesn't work or wait for a solution because we aren't sure if design A might be better than design B?」

> 「It's less about us and more about value for the customer. **It's the difference between "never good enough" and "better than what they have now."**」

### 4.2 Scope grows like grass —— 范围蔓延是自然现象，不是道德问题

> 「**Scope grows naturally. Scope creep isn't the fault of bad clients, bad managers, or bad programmers.** Projects are opaque at the macro scale. You can't see all the little micro-details of a project until you get down into the work. Then you discover not only complexities you didn't anticipate, but all kinds of things that could be fixed or made better than they are.」

> 「**Every project is full of scope we don't need. Every part of a product doesn't need to be equally prominent, equally fast, and equally polished. Every use case isn't equally common, equally critical, or equally aligned with the market we're trying to sell to.**」

> 「This is how it is. **Rather than trying to stop scope from growing, give teams the tools, authority, and responsibility to constantly cut it down.**」

### 4.3 Cutting scope isn't lowering quality —— 关键辩驳

> 「**Picking and choosing which things to execute and how far to execute on them doesn't leave holes in the product. Making choices makes the product better. It makes the product better _at some things_ instead of others. Being picky about scope _differentiates_ the product.** Differentiating what is core from what is peripheral moves us in competitive space, making us more alike or more different than other products that made different choices.」

> 「Variable scope is not about sacrificing quality. **We are extremely picky about the quality of our code, our visual design, the copy in our interfaces, and the performance of our interactions. The trick is asking ourselves which things actually matter, which things move the needle, and which things make a difference for the core use cases we're trying to solve.**」

### 4.4 Scope hammering —— 官方给出的八连问（可直接做成检查清单）

> 「People often talk about "cutting" scope. **We use an even stronger word—`hammering`—to reflect the power and force it takes to repeatedly bang the scope so it fits in the time box.**」

> 「As we come up with things to fix, add, improve, or redesign during a project, we ask ourselves:
> - Is this a "must-have" for the new feature?
> - Could we ship without this?
> - What happens if we don't do this?
> - Is this a new problem or a pre-existing one that customers already live with?
> - How likely is this case or condition to occur?
> - When this case occurs, which customers see it? Is it core—used by everyone—or more of an edge case?
> - What's the actual impact of this case or condition in the event it does happen?
> - When something doesn't work well for a particular use case, how aligned is that use case with our intended audience?」

> 「**The fixed deadline motivates us to ask these questions. Variable scope enables us to act on them.**」

### 4.5 must-have / nice-to-have 的操作细节

> 「Throughout the cycle, you'll hear our teams talking about `must-haves` and `nice-to-haves` as they discover work. **The must-haves are captured as tasks on the scope. The scope isn't considered "done" until those tasks are finished. Nice-to-haves can linger on a scope after it's considered done. They're marked with a tilde (~) in front.** Those tasks are things to do if the team has extra time at the end and things to cut if they don't. **Usually they never get built. The act of marking them as a nice-to-have is the scope hammering.**」

> **注意这句**：「Usually they never get built.」——这是官方承认 nice-to-have 基本等于砍掉。

### 4.6 QA 不是关卡

> 「we think of QA as **a level-up, not a gate or a check-point that all work must go through.** We're much better off with QA than without it. But **we don't depend on QA to ship quality features that work as they should.**」

> 「QA generates `discovered tasks` that are all `nice-to-haves` by default.」

> 「We treat code review the same way. **The team can ship without waiting for a code review. There's no formal check-point.** ... It's more about taking advantage of a teaching opportunity than creating a step in our process that must happen every time.」

### 4.7 什么时候才允许延期（唯一出口）

> 「First, the outstanding tasks must be **true `must-haves` that withstood every attempt to `scope hammer` them.**」
> 「Second, the outstanding work must be **all `downhill`. No unsolved problems; no open questions.** Any `uphill` work at the end of the cycle points to an oversight in the shaping or a hole in the concept. **Unknowns are too risky to bet on.**」
> 「Even if the conditions are met to consider extending the project, we **still prefer to be disciplined and enforce the `appetite` for most projects.** ... But this **shouldn't become a habit. Running into cool-down either points back to a problem in the shaping process or a performance problem with the team.**」

---

## 5. Appendix 2 Adjust to Your Size —— 「不要照抄，要转译」的官方背书

URL: https://basecamp.com/shapeup/4.1-appendix-02 ｜ **[一手]**

**这一节是下游「个人开发者 + AI 生成代码」场景最重要的合法性依据。**

> 「To apply Shape Up to your company, it helps to **separate out the basic truths from the specific practices.**」

> 「Work has to come from somewhere, and it takes work to figure out what the right work is. This is shaping. Shaping the work sets clearer boundaries and expectations for whoever does the work—**whether that's a separate team or just your future self.** **If we don't make trade-offs up front by shaping, the universe will force us to make trade-offs later in a mad rush when we're confronted by deadlines, technical limitations, or resource constraints.**」

> 「The same is true with betting. **Six weeks might not be the exact time frame for your team. But the consequences of making unclear or open-ended commitments are the same for everyone.** Regardless of the specific time frame we bet on, we should be deliberate about what we bet on and **cap our downside with a circuit breaker.**」

> 「In the building phase, there will be unknowns to deal with **whether you track them on a hill chart or not.** We need to distinguish the knowns from the unknowns so we can sequence the work in the right order and reserve capacity for the unknowns.」

> 「**These truths apply regardless of the size of your organization. The specific practices, on the other hand, are scale-dependent.**」

### 5.1 「Small enough to wing it」—— 直接对应「小团队/单人」

> 「When your team is just two or three people, everybody does a bit of everything. Since a few people are wearing many hats and performing many roles, **it's difficult to commit long chunks of uninterrupted time to specific projects.** The person doing the programming might also be answering customer requests and dealing with an infrastructure issue all at the same time.」

> 「It's also easier to communicate and change course when you're small. ... **a tiny team can throw out most of the structure. You don't need to work six weeks at a time. You don't need a cool-down period, formal pitches or a betting table. Instead of parallel tracks with dedicated shapers and builders, the same people can alternate back and forth. Be deliberate about which hat you're wearing and what phase you're in. Set an appetite, shape what to do next, build it, then shape the next thing. Your bets might be different sizes each time: maybe two weeks here, three weeks there. You're still shaping, betting, and building, but you're doing it more fluidly without the rigid structure of cycles and cool-downs.**」

> 「**The phases of the work still hold true even if you don't work in cycles or have dedicated people to do the shaping and building**」（图注原文）

### 5.2 Basecamp 自身规模（用于判断可迁移性）

> 「At Basecamp's current size (**about 50 people in the whole company, roughly a dozen in the product team**) we've been able to specialize roles so teams of designers and programmers can work without any interruption in the cycles. A dedicated team called SIP (Security, Infrastructure, and Performance) handles technical work that's lower in the stack and more structural. ...」

---

## 6. 全书目录（章节级结构，用于判断覆盖面）

```
Preface: Foreword by Jason Fried / Acknowledgements
Ch.1  Introduction（Growing pains / Six-week cycles / Shaping the work /
      Making teams responsible / Targeting risk / How this book is organized）
Part 1: Shaping
  Ch.2  Principles of Shaping（Wireframes are too concrete / Words are too abstract /
        Case study: The Dot Grid Calendar / Property 1 Rough / 2 Solved / 3 Bounded /
        Who shapes / Two tracks / Steps to shaping）
  Ch.3  Set Boundaries
  Ch.4  Find the Elements（Move at the right speed / Breadboarding / Fat marker sketches /
        Elements are the output / Room for designers / Not deliverable yet / No conveyor belt）
  Ch.5  Risks and Rabbit Holes（Different categories of risk / Look for rabbit holes /
        Case study: Patching a hole / Declare out of bounds / Cut back /
        Present to technical experts / De-risked and ready to write up）
  Ch.6  Write the Pitch（Ingredient 1 Problem / 2 Appetite / 3 Solution / Help them see it /
        Embedded sketches / Annotated fat marker sketches / Ingredient 4 Rabbit Holes /
        Ingredient 5 No Gos / Examples / Ready to present / How we do it in Basecamp）
Part 2: Betting
  Ch.7  Bets, Not Backlogs
  Ch.8  The Betting Table（Six-week cycles / Cool-down / Team and project size /
        The betting table / The meaning of a bet / Uninterrupted time / The circuit breaker /
        What about bugs? / Keep the slate clean）
  Ch.9  Place Your Bets（Look where you are / Existing products / New products /
        R&D mode / Production mode / Cleanup mode / Examples /
        Questions to ask：Does the problem matter? Is the appetite right?
        Is the solution attractive? Is this the right time? Are the right people available? /
        Post the kick-off message）
Part 3: Building
  Ch.10 Hand Over Responsibility（Assign projects, not tasks / Done means deployed /
        Getting oriented / Imagined vs discovered tasks）
  Ch.11 Get One Piece Done（Integrate one slice / ... / Programmers don't need to wait /
        Affordances before pixel-perfect screens / Program just enough for the next step /
        Start in the middle）
  Ch.12 Map the Scopes（Organize by structure, not by person / The scope map /
        The language of the project / Case study: Message drafts / Discovering scopes /
        How to know if the scopes are right / Layer cakes / Icebergs / Chowder /
        Mark nice-to-haves with ~）
  Ch.13 Show Progress（The tasks that aren't there / Estimates don't show uncertainty /
        Work is like a hill / Scopes on the hill / Status without asking /
        Nobody says "I don't know" / Prompts to refactor the scopes /
        Build your way uphill / Solve in the right sequence）
  Ch.14 Decide When to Stop
  Ch.15 Move On（Let the storm pass / Stay debt-free / Feedback needs to be shaped）
  Conclusion（Key concepts）
Appendices
  A1 How to Implement Shape Up in Basecamp（A Basecamp Team for shaping /
     Basecamp Projects for cycle projects / To-Do Lists for scopes / Track scopes on the Hill Chart）
  A2 Adjust to Your Size（Basic truths vs. specific practices / Small enough to wing it /
     Big enough to specialize）
  A3 How to Begin to Shape Up（Option A: One six-week experiment / Option B: Start with shaping /
     Option C: Start with cycles / Fix shipping first / Focus on the end result）
  Glossary
  About the Author
```

**Ch.9 的五个下注前问题**（目录级可见，正文未抓）——下游可直接借用为判定清单：
- Does the problem matter?
- Is the appetite right?
- Is the solution attractive?
- Is this the right time?
- Are the right people available?

---

## 6b. Ch.6 Write the Pitch —— 五个配料（可直接做成 Pitch 模板）

URL: https://basecamp.com/shapeup/1.5-chapter-06 ｜ **[一手]**

> 「There are five ingredients that we always want to include in a pitch:
> 1. **Problem** — The raw idea, a use case, or something we've seen that motivates us to work on this
> 2. **Appetite** — How much time we want to spend and how that constrains the solution
> 3. **Solution** — The core elements we came up with, presented in a form that's easy for people to immediately understand
> 4. **Rabbit holes** — Details about the solution worth calling out to avoid problems
> 5. **No-gos** — Anything specifically excluded from the concept: functionality or use cases we intentionally aren't covering to fit the appetite or make the problem tractable」

**Ingredient 1 · Problem —— 问题与方案必须成对出现**

> 「**It's critical to always present both a problem and a solution together.** It sounds like an obvious point but it's surprising how often teams, our own included, jump to a solution with the assumption that it's obvious why it's a good idea to build this thing.」

> 「**Diving straight into "what to build"—the solution—is dangerous.** You don't establish any basis for discussing whether this solution is good or bad without a problem. "Add tabs to the iPad app" might be attractive to UI designers, but what's to prevent the discussion from devolving into a long debate about different UI approaches? **Without a specific problem, there's no test of fitness to judge whether one solution is better than the other.**」

> 「The solution might be perfect, but what if the problem only happens to customers who are known to be a poor fit to the product? We could spend six weeks on an ingenious solution that only benefits a small percentage of customers known to have low retention.」

> 「**The best problem definition consists of a single specific story that shows why the status quo doesn't work.** This gives you a `baseline` to test fitness against.」

**Ingredient 2 · Appetite —— appetite 是问题定义的一部分**

> 「**You can think of the appetite as another part of the problem definition.** Not only do we want to solve this use case, we want to come up with a way to do it in six weeks, not three months, or—in the case of a `small batch` project—two weeks, not the whole six weeks.」

> 「Stating the appetite in the pitch prevents unproductive conversations. **There's always a better solution.** The question is, if we only care enough to spend two weeks on this now, how does _this specific solution_ look?」

> 「**Anybody can suggest expensive and complicated solutions. It takes work and design insight to get to a simple idea that fits in a small time box.**」

**Ingredient 3 · Solution —— 有方案无问题 / 有问题无方案都不行**

> 「Sometimes companies bet on problems with no solution. "We really need to make it easier to find things on the messages section. Customers are complaining about it." **That's not ready to pitch or bet on. A problem without a solution is unshaped work.** Giving it to a team means pushing research and exploration down to the wrong level...」

**Ingredient 5 · No-gos —— 显式写入「我们不做」**

> 「Lastly if there's anything we're _not_ doing in this concept, it's good to mention it here. In the case of the Payment Form project, the team decided up front that **they wouldn't allow any kind of WYSIWYG editing of the form.** ... WYSIWYG might be better in some peoples' eyes, but **given the appetite it was important to mark this as a no-go.**」

**Present 方式 —— 默认异步**

> 「**We prefer asynchronous communication by default and escalate to real-time only when necessary.** This gives everyone the maximum amount of time under their own control for doing real work.」

> 「People comment on the pitch asynchronously. **Not to say yes or no — that happens at the betting table — but to poke holes or contribute missing information.**」

---

## 6c. Ch.8 The Betting Table —— 周期、断路器、不被打断的时间、bug 处理

URL: https://basecamp.com/shapeup/2.2-chapter-08 ｜ **[一手]**

**为什么不是两周**

> 「Some companies use two-week cycles (aka "sprints"). **We learned that two weeks is too short to get anything meaningful done. Worse than that, two-week cycles are extremely costly due to the planning overhead.** The amount of work you get out of two weeks isn't worth the collective hours around the table to "sprint plan" or the opportunity cost of breaking everyone's momentum to re-group.」

**为什么是六周**

> 「We wanted a cycle that would be **long enough to finish a whole project, start to end.** At the same time, **cycles need to be short enough to see the end from the beginning. People need to feel the deadline looming in order to make trade-offs. If the deadline is too distant and abstract at the start, teams will naturally wander and use time inefficiently** until the deadline starts to get closer and feel real.」

> 「After years of experimentation we arrived at `six weeks`. **Six weeks is long enough to finish something meaningful and still short enough to see the end from the beginning.**」

**Cool-down 的理由**

> 「If we were to run six-week cycles back to back, there wouldn't be any time to breathe and think about what's next. **The end of a cycle is the worst time to meet and plan because everybody is too busy finishing projects and making last-minute decisions in order to ship on time.**」

> 「This is a period with no scheduled work where we can breathe, meet as needed, and consider what to do next. ... **They use it to fix bugs, explore new ideas, or try out new technical possibilities.**」

**团队与批次规模**

> 「Our project teams consist of either **one designer and two programmers or one designer and one programmer.**」
> 「We call the team that spends the cycle doing one project the `big batch` team and the team working on a set of smaller projects the `small batch` team. **Small batch projects usually run one or two weeks each.**」

**The meaning of a bet —— 三条**

> 「First, **bets have a payout.** We're not just filling a time box with tasks until it's full. ... **We intentionally shape work into a six-week box so there's something meaningful finished at the end.**」
> 「Second, **bets are commitments.** If we bet six weeks, then we commit to giving the team the entire six weeks to work exclusively on that thing with no interruptions.」
> 「Third, **a smart bet has a cap on the downside. If we bet six weeks on something, the most we can lose is six weeks.**」

**Uninterrupted time —— 被打断的代价**

> 「**It's not really a bet if we say we're dedicating six weeks but then allow a team to get pulled away to work on something else.**」
> 「When people ask for "just a few hours" or "just one day," **don't be fooled. Momentum and progress are second-order things, like growth or acceleration. You can't describe them with one point. You need an uninterrupted curve of points.** When you pull someone away for one day to fix a bug or help a different team, you don't just lose a day. You lose the momentum they built up and the time it will take to gain it back. **Losing the wrong hour can kill a day. Losing a day can kill a week.**」
> 「What if something comes up during that six weeks? We still don't interrupt the team and break the commitment. **The maximum time we'd have to wait is six weeks before being able to act on the new problem or idea.** ... **This is why it's so important to only bet one cycle ahead.**」

**The circuit breaker —— 三条理由（下游最关键）**

> 「**Teams have to ship the work within the amount of time that we bet. If they don't finish, by default the project doesn't get an extension. We intentionally create a risk that the project—as pitched—won't happen.** This sounds severe but it's extremely helpful for everyone involved.」
> 「First, **it eliminates the risk of runaway projects.** We defined our `appetite` at the start when the project was shaped and pitched. **If the project was only worth six weeks, it would be foolish to spend two, three or ten times that. Very few projects are of the "at all costs" type and absolutely must happen now.**」
> 「Second, **if a project doesn't finish in the six weeks, it means we did something wrong in the shaping. Instead of investing more time in a bad approach, the circuit breaker pushes us to reframe the problem.**」
> 「Finally, **the circuit breaker motivates teams to take more ownership over their projects.** ... **A hard deadline and the chance of not shipping motivates the team to regularly question how their design and implementation decisions are affecting the scope.**」

**What about bugs —— 反「bug 优先」的原文**

> 「**There is nothing special about bugs that makes them automatically more important than everything else.** The mere fact that something is a bug does not give us an excuse to interrupt ourselves or other people. All software has bugs. The question is: how severe are they?」
> 「**But _crises are rare_. The vast majority of bugs can wait six weeks or longer, and many don't even need to be fixed. If we tried to eliminate every bug, we'd never be done. You can't ship anything new if you have to fix the whole world first.**」
> 三种处理法：**① 用 cool-down 修；② 把 bug 做成 pitch 拿到 betting table 竞争资源；③ 每年一个「bug smash」周期**（通常在假期，因为那时做正常项目难）。

**Keep the slate clean**

> 「The key to managing capacity is **giving ourselves a clean slate with every cycle. That means only betting one cycle at a time and never carrying scraps of old work over without first shaping and considering them as a new potential bet.**」
> 「**It is crucial to maximize our options in the future.** We don't know what will happen in the next six weeks. We don't know what brilliant idea will emerge or what urgent request might appear.」
> 「**Even if we have some kind of road map in our heads at the time scale above cycles, we keep it in our heads and in our side-channel discussions.**」
> 「What about projects that just can't be done in one cycle? **In that case we still only bet six weeks at a time.** ... **The important thing is that we always shape what the end looks like for that cycle and that we keep our options open to change course.**」

---

## 6d. Appendix 3 How to Begin to Shape Up —— 三种起步法 + 「先修发货能力」

URL: https://basecamp.com/shapeup/4.2-appendix-03 ｜ **[一手]**

**Option A：先做一次六周实验（清单原文）**

> 1. 「**Shape one significant project that can be comfortably finished within six weeks. Be conservative and allow extra time on your first run.**」
> 2. 「Carve out one designer and two programmers' time for the entire six weeks. **Guarantee that nobody will interrupt them for the length of the experiment.**」
> 3. 「Instead of a proper betting table, simply plan for the team to do the work you shaped for this one experiment.」
> 4. 「Kick off by presenting your shaped work to the team, with all the ingredients of a pitch. **Set the expectation that they will discover and track their own tasks.**」
> 5. 「Dedicate a physical space or a chat room to the cross-functional team so they can work closely together.」
> 6. 「Encourage them to Get One Piece Done by wiring UI and code together early in the project.」

> 「**You don't need to worry about Mapping the Scopes or Showing Progress right away. You should see a big leap in progress just by dedicating uninterrupted time, shaping the work in advance, and letting the team work out the details.**」

**Option B：只先做 Shaping**

> 「Sometimes it's not possible to get a team together to work for six weeks because somebody else, a CTO perhaps, controls the programmers' time. In that case, **you can start by shaping a compelling project with clearer boundaries than past projects.** ... **Better-shaped work can shine a light on the engineering team and help them open up to things like longer cycles or a more deliberate betting process.**」

**Option C：只先做 Cycles**

> 「For teams that formerly used two-week sprints, this removes the overhead of constant planning meetings and gives programmers more time to build momentum and hit their stride.」

**Fix shipping first —— 顺序很重要**

> 「**Build your shipping muscles before you worry too much about improving your research or discovery process.** You can have the best customer insight in the world, but if you can't turn it into a project and ship, it won't matter. **First get the team into a rhythm of finishing things. Once you have the capability to ship, then you can start improving the inputs to your shaping process.**」

**Focus on the end result —— 不要盯小时**

> 「Sometimes it can be scary to give the teams more free rein to set their own tasks and schedule. You might wonder: What if they don't use up all the time we dedicate for the cycle? What if one of the programmers or designers sits idle at some point in the cycle?」
> 「**To overcome these worries, shift the mindset from the micro to the macro.** Ask yourself: **How will we feel if we ship this project after six weeks? Will we feel good about what we accomplished?** When projects ship on time and everyone feels they made progress, that's the success. **It doesn't matter what exactly happened down at the scale of hours or days along the way. It's the outcome that matters.**」

---

## 7. 本文件未覆盖 / 待补

- Ch.1 引言、Ch.4-6（Shaping 具体手法）、Ch.8（Betting Table 细节）、Ch.9-13（Building）、Ch.15、附录 1/3 **本次未逐章抓取**，只有目录与目录级小节名。凡涉及这些章节的表述，其他调研文件与 SKILL.md 中标为 **[二手]** 或 **[推断]**。
- Jason Fried 的 Foreword 原文未抓取。
