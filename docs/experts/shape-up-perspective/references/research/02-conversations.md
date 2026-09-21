# 02 · 长对话、播客与深度访谈：即兴思考的过程

调研对象：Jason Fried、David Heinemeier Hansson（DHH）、Ryan Singer
调研目的：提取三人在**未被脚本化的对话现场**如何推理、如何类比、如何被追问、如何改口——即「即兴思考的过程」，而非其成文方法论。
调研日期：2026-09-17

**信源分级**：`[一手]` = 原始音频 / 官方视频 / 完整逐字稿（本文件中的引号内容均来自实际抓取到的页面文本）；`[二手]` = 他人转述、聚合站、show notes 摘要；`[推断]` = 本文件的归纳。

---

## 1. 来源清单

| # | 节目 / 来源 | 主持人 | 嘉宾 | 日期 | URL | Transcript | 分级 |
|---|---|---|---|---|---|---|---|
| 1 | REWORK #0047 "Shape Up" | Wailin Wong / Shaun Hildner | Ryan Singer | 2019-07-23 | https://37signals.com/podcast/shape-up/ | 完整逐字 | [一手] |
| 2 | REWORK #0048 "Shape Up Roundtable" | Wailin Wong | Ryan Singer, Conor Muirhead, Jeff Hardy | 2019-07-23 | https://37signals.com/podcast/shape-up-roundtable/ | 完整逐字 | [一手] |
| 3 | Bright & Early | Brian Rhea | Ryan Singer | 约 2019（页面标 2026-03-28 重新发布） | https://brianrhea.com/podcast/shape-up-with-ryan-singer-of-basecamp/ | 完整逐字（未编辑版） | [一手] |
| 4 | Shapers & Builders E1 "Getting to Shape Up 2.0" | David Arens | Ryan Singer | 2023-05-01 | https://shapersbuilders.transistor.fm/episodes/getting-to-shape-up-2-0-ryan-singer-author-of-shape-up-founder-at-felt-presence/transcript | 完整逐字（自动转写） | [一手] |
| 5 | Lenny's Podcast "A better way to plan, build, and ship" | Lenny Rachitsky | Ryan Singer | 2025-03-30 | https://www.lennysnewsletter.com/p/shape-up-ryan-singer | 仅有 show notes，**未获取到逐字** | [二手] |
| 6 | Lenny's Podcast "Jason Fried challenges your thinking" | Lenny Rachitsky | Jason Fried | 2023-12-17 | https://www.lennysnewsletter.com/p/jason-fried-challenges-your-thinking | 仅有 show notes + 章节表，**未获取到逐字** | [二手] |
| 7 | REWORK S2E150 "Picking Priorities" | Kimberly Rhodes | Jason Fried + DHH | 2025-04-16 | https://37signals.com/podcast/picking-priorities/ | 完整逐字 | [一手] |
| 8 | REWORK S2E127 "Say No by Default" | Kimberly Rhodes | Jason Fried + DHH | 2024-10-16 | https://37signals.com/podcast/say-no-by-default/ | 完整逐字 | [一手] |
| 9 | REWORK S2E157 "Managing chaos, feature bloat…" | Kimberly Rhodes | Jason Fried + DHH | 2025-06-18 | https://37signals.com/podcast/managing-chaos-listener-qs/ | 完整逐字 | [一手] |
| 10 | REWORK S2E154 "Ignoring the competition…" | Kimberly Rhodes | Jason Fried + DHH | 2025-05-28 | https://37signals.com/podcast/ignore-the-competition-listener-qs/ | 完整逐字 | [一手] |
| 11 | REWORK S2E161 "Titles, tenure, and paths don't matter" | Kimberly Rhodes | Jason Fried + DHH | 2025-08-13 | https://37signals.com/podcast/titles-tenure-dont-matter/ | 完整逐字 | [一手] |
| 12 | REWORK S2E162 "Building with LLMs…" | Kimberly Rhodes | Jason Fried + DHH | 2025-08-20 | https://37signals.com/podcast/building-with-llms-listener-qs/ | 完整逐字 | [一手] |
| 13 | REWORK S2E194 "AI challenges in software development" | Kimberly Rhodes | Jason Fried + DHH | 2026-07-01 | https://37signals.com/podcast/ai-challenges-in-software/ | 完整逐字 | [一手] |
| 14 | REWORK S2E195 "Don't write it down" | Kimberly Rhodes | Jason Fried + DHH | 2026-07-15 | https://37signals.com/podcast/dont-write-it-down/ | 完整逐字 | [一手] |
| 15 | REWORK S2E0091 "This again, Apple?" | Kimberly Rhodes | DHH | 2024-01-09 | https://37signals.com/podcast/this-again-apple/ | 完整逐字 | [一手] |
| 16 | REWORK S2E0034 "Good Enough is Fine" | Shaun Hildner | Jason Fried + DHH | 2022-09-13 | https://37signals.com/podcast/good-enough-is-fine/ | 完整逐字 | [一手] |
| 17 | Lex Fridman Podcast #474 | Lex Fridman | DHH | 2025-07-12 | https://lexfridman.com/dhh-david-heinemeier-hansson-transcript/ | 完整逐字（**页面抓取被截断**，仅取前约 1/10） | [一手，部分] |
| 18 | Lex Fridman Podcast #501 "Future of Programming, AI, Agentic Engineering, Vibe Coding & Linux" | Lex Fridman | DHH | 2026 | https://lexfridman.com/dhh-2-transcript/ | 完整逐字（**抓取被截断**，约前 40 分钟） | [一手，部分] |
| 19 | DHH HEY World《Coding should be a vibe!》 | —（书面） | DHH | 2025-05-13 | https://world.hey.com/dhh/coding-should-be-a-vibe-50908f49 | 全文 | [一手·书面，非对话] |
| 20 | The Tim Ferriss Show #329 | Tim Ferriss | Jason Fried | 2018-07-23 | https://tim.blog/2018/07/23/jason-fried/ | 官方逐字页存在但**抓取被截断** | [二手]（引语来自 https://wisdomsparks.com/tim-ferriss-show/jason-fried-329/ 转述，**未获取到官方逐字原话**） |
| 21 | Shape Up 原书（网页版） | —（书面） | Ryan Singer | 2019 | https://basecamp.com/shapeup | 全文 | [一手·书面] |

**未找到的方向**（本轮未获取到任何可用材料）：

- **How I Built This（NPR / Guy Raz）× Jason Fried**：检索未命中，怀疑该期不存在或未被收录。
- **The Knowledge Project × Jason Fried**：未核实。
- **Indie Hackers × 三人**：未核实。
- **37signals YouTube「Foundations / REWORK 系列视频」独立条目**：只找到与播客同源的视频版（YouTube 与 37signals.com/podcast 内容一致），未找到独立的「Foundations」系列。
- **HEY 无免费版 / 定价哲学的长对话**：只找到 `Say No by Default` 里关于 freemium 与定价分层的追悔段落，未找到专门的「为什么不做免费版」长访谈。
- **bootstrapping vs VC 的完整长访谈（DHH）**：只找到播客内的片段式论述。

---

## 2. 关键原话摘录（48 条）

### 2.1 Ryan Singer｜Shape Up 的推理过程

**Q1｜appetite 与 estimate 的关系——「把顺序倒过来」**
> "an estimate is where you start with a design and then you say, 'How long is it going to take to do that?' So you start with the design and then you get to a number. And appetite is where you flip that around; you start with a number and then you go to a design."

要点：appetite 不是「不要估算」，而是**把估算挪到设计之后**——先定时间和价值，再去设计。
来源：[一手] https://brianrhea.com/podcast/shape-up-with-ryan-singer-of-basecamp/

**Q2｜约束改变「好」的定义——牛排与热狗**
> "a steak might be better than a hotdog in terms of a quality meal, right? But if you only have five minutes, a hotdog is better than a steak, right? … So, the constraints totally change the definition of value and what's good and what's bad."

要点：这是他解释 appetite 时**即兴生成的类比**，用来回应「appetite 会不会导致交付不足」的质疑。
来源：[一手] 同上

**Q3｜「宇宙的基本事实」——煎蛋**
> "If you want to make an omelet, an omelet starts with raw eggs. And there's a million ways to make an omelet, but that's just a fact, right."

要点：他把 Shape Up 分成两层——**可变的「具体做法」 vs 不可变的「基本事实」**。这是他 2023 年之后的思考主轴的雏形。
来源：[一手] 同上

**Q4｜bet 的核心是「损失有上限」**
> "When you make a bet, a bet has a capped downside. If you say, 'I am going to bet a 100 bucks that this thing happens.' The most you lose is $100, right?"

要点：他强调「bet」这个词是**故意选的**——为了把风险感重新注入「计划」这个词里。
来源：[一手] 同上

**Q5｜circuit breaker 的类比——碎纸机**
> "you put the project through a paper shredder. Now, you have to hope that all of the little strands glue together again and makes sense in the end"

要点：用来描述「把项目拆成 ticket 分派下去」的伤害。注意：**2023 年他反过来承认，即使仍然经过这台碎纸机，先做 shaping 依然有效**（见 Q20、Q21）。
来源：[一手] 同上

**Q6｜hill chart 的具身类比——宜家家具**
> "it's a little bit like that point when you're assembling the IKEA furniture. And there is, you look down and there's six pieces of wood around and there's exactly eight holes in there. And you look in your hand and there's eight screws in your hand and you are like, 'Okay, I know I am gonna be okay.'"

要点：他把「爬到山顶」翻译成**一种身体感觉**（知道够了），而不是一个度量。
来源：[一手] 同上

**Q7｜对小团队主动放弃方法本身**
> "I would even say that even the six-week cycle might not be a good idea when you're just three people starting off. I would say throw away everything that is a sort of strict process … and, instead, look at the facts of the universe."

要点：**当场承认**自己书里最标志性的数字对小团队可能是错的。这是本次调研中他第一次松口。
来源：[一手] 同上

**Q8｜「soft no」的机制——短期的不是长期的 yes**
> "in a way, a short-term no can be a really meaningful long-term yes. Because you're allowing your understanding of that thing to really unfold to the point where you can make a more meaningful response to it."

来源：[一手] https://37signals.com/podcast/shape-up/

**Q9｜backlog 是一种持续性的坏心情**
> "Everybody creates this big backlog of stuff and there's more things in the backlog than you'll ever be able to do, but you're somehow supposed—you feel like you're supposed to do it all of it. So you always have this bad feeling of like, we're not there yet, or we didn't do what we supposed to do … It just sucks. You know what I mean?"

来源：[一手] 同上

**Q10｜「功能问题其实是情绪问题」**
> "So much of these problems that we frame as functional problems, the thing didn't get shipped, we didn't hit the deadline, like the tool, the feature doesn't do what it's supposed to do … These functional things are issues, but the real issue is always how it makes us feel."

来源：[一手] 同上

**Q11｜要「塑造」但不要「指定」**
> "And they can see the solution at this very sketchy level. If you have that, if you've done that pre-work, you can give that to a team and say, here's the rough solution. There's a million details for you to work out within that. I'm going to give you six weeks to do that. And if it doesn't happen, there's no second chances. So take it seriously. And at the same time, I promise to never interrupt you."

要点：这段话是 Shape Up 的**双向承诺结构**（团队担全责 ↔ 管理层不打断）在口语里的最完整一次表述。
来源：[一手] 同上

**Q12｜方法的边界——「如果你不知道要什么，任何方法都帮不了你」**
> "But if you don't know what you want, no method can help you."

来源：[一手] 同上

**Q13｜circuit breaker 被他自己称为「严厉政策」**
> "In the book, I call it the circuit breaker, which is a very severe policy, a very effective, but severe policy, which is that if the thing doesn't get done in the time we give it, it's automatically canceled."

来源：[一手] 同上

**Q14｜betting table 是「四件事」而不是「一百件事」**
> "instead of having this long list of a hundred things that we haven't done yet, there's like four things on the table. There's four things that are timely."

来源：[一手] 同上

**Q15｜六周的官方定义（书面）**
> "Six weeks — The length of our cycles. Six weeks is long enough to finish something meaningful and short enough to feel the deadline from the beginning."
> "Time horizon — The longest period of time where we can feel a deadline pushing on us from the beginning. Six weeks."

要点：**注意**——书里的六周理由不是「两周太短/八周太长」的经验比较，而是**「时间地平线」这个概念**：能从一开始就感到截止日压迫的最长时段。
来源：[一手·书面] https://basecamp.com/shapeup （术语表）

### 2.2 团队视角｜Conor Muirhead & Jeff Hardy（2019 圆桌）

**Q16｜亲手把六个月的工作扔进垃圾桶是什么感觉**
> "with this Clients project, the first version, it was clear that it wasn't just going to need two more weeks or three more weeks. Like it just wasn't there. And deciding to can it was hard. It was hard."

要点：Jeff Hardy 谈 Clients 2.0 被砍。他补了一句关键的：**「只浪费六到八周其实不算什么」**——这是 circuit breaker 唯一一次被一线执行者用亲身经历背书。
来源：[一手] https://37signals.com/podcast/shape-up-roundtable/

**Q17｜「2.0」这个词本身就是范围失控的信号**
> "That's when we learned that just labeling something with 2.0 is a [inaudible]. It's too big. It's too wide of a scope."

来源：[一手] 同上

**Q18｜做错了顺序而不自知的现场自白**
> "I was spending a lot of time on things that weren't that important that were really downhill tasks and I was covering them up front instead of working on the uphill tasks. And I'm pretty sure that … we could have totally shipped it within the six weeks if I had known how to do hill charts"

来源：[一手] 同上（Conor Muirhead）

### 2.3 Ryan Singer｜2023 年「Shape Up 2.0」——最重要的自我修正现场

**Q19｜他说这本书里他最得意的部分，其实不是关键**
> "when I wrote the book I thought that the way that the team does delivery was really important like from the moment the cycle starts until the moment of shipping … all this stuff about breaking the work into Scopes and using Hill charts and all of this I really thought that that stuff was essential for doing shape up because it was actually kind of the area where I was digging deeper in my own well … and what I found out is that for 90[%] of teams once you establish a time box at the beginning of the time box is just a starting gun and then once you fire that starting gun it's just like Off to the Races and you cannot influence anything you cannot control anything"

> "what I've found is that … most of the Leverage is actually in the shaping and bringing the experienced technical people into the shaping and having that push and pull between the design concept and what is technically feasible in the shaping"

要点：**这是三人所有公开材料里最清楚的一次立场移动。** 他把方法的重心从「交付期的 scope / hill chart 技术」搬到「塑造期的产品-技术拉扯」。
来源：[一手] https://shapersbuilders.transistor.fm/episodes/getting-to-shape-up-2-0-ryan-singer-author-of-shape-up-founder-at-felt-presence/transcript

**Q20｜hill chart 变成「进阶技巧」而非入门必需**
> "introducing these new techniques inside of the delivery phase like breaking things into Scopes and … dealing with the unknowns … that stuff is actually all kind of like advanced level … once you really have shaped work and you have the folks who are in the delivery phase are feeling really engaged and they want to kind of take it to the next level like then these things come in but they're actually not at all necessary to start"

来源：[一手] 同上

**Q21｜为 VC 背景的团队临时造了个新词：ramp up**
> "there's no way that we can have something called cool down … so what we ended up doing was created something called ramp up"

> "the idea that you're going to ship a major effort on a Friday and then kick off a major new effort … on Monday it's just not going to happen that's just not how life is"

来源：[一手] 同上

**Q22｜主动说「这种情况下不要用 Shape Up」**
> "this is why I literally am telling people you know don't use Shape[Up] for that a ticket-based process is way more suited for that kind of work a kanban is way more appropriate for that kind of work"

要点：他区分**策略性工作 vs 反应性工作**：反应性工作的定义不是「小」，而是**「带紧迫性」**。他还把「依赖第三方排期的集成项目」也划出 Shape Up 之外，因为「你不控制时间盒」。
来源：[一手] 同上

**Q23｜承认书里说得不够**
> "I said that the shaper needs to be technically literate and I think that that didn't go far enough"

来源：[一手] 同上

**Q24｜他把被追问当成产品迭代手段**
> "I am in the lucky position that when I get invited on to podcasts like this, I get these really great questions and then I get to discover things that are missing in the book. So I am absolutely going to go back to the book and add something"

要点：**这一条本身就是「即兴思考」的直接证据**——他把播客问答当作 shaping 的一种。
来源：[一手] https://brianrhea.com/podcast/shape-up-with-ryan-singer-of-basecamp/

**Q25｜正面回应「依赖高度信任的团队」这一批评**
> "I actually think it's the opposite, and let me say why. When you have a centralized backlog … Everybody else in the company, who is not in a betting position, looks at that backlog and sees failure because, to them, all of this stuff is supposed to happen."
> "having a public, centralized backlog that everybody can see creates all of these bad feelings."

要点：Brian Rhea 的原始质疑是「This just works on a well-functioning team but would require processes and politics in low-trust teams」。Ryan **没有让步**，而是反过来把「公开 backlog」定义为低信任的成因。
来源：[一手] 同上

### 2.4 Jason Fried & DHH｜关于优先级、roadmap、说「不」

**Q26｜「优先级不是永久的」**
> "Priorities are not permanent. That's the important thing here. But again, you don't want to just keep flipping back and forth, then people freak out."

来源：[一手] https://37signals.com/podcast/picking-priorities/

**Q27｜对 roadmap 的直接拒绝**
> "We've occasionally gotten, so what does your roadmap look like? Do you have a 12, 18, 24 month roadmap that we could take a look at? And we always go like, no, we don't. We have what we're going to work on next cycle."

来源：[一手] 同上

**Q28｜「承诺过的事，全都后悔了」**
> "every single time Jason and I have promised to customers that we're going to deliver something X amount of time from now, we have regretted it with capital R."

来源：[一手] 同上

**Q29｜故意不装专业**
> "We have no intention of seeming professional. We're not trying to impress anyone. Neither Jason nor I is sitting here in a suit. … so we're free to just go with, do you know, what works best?"
> "Screw what looks professional, screw what customers sometimes ask for."

来源：[一手] 同上

**Q30｜把「实时决定」拆穿成「你也一直在做，只是分批做」**
> "people are always like, well, how can you just make it up as you go? … Well, we sit down and think about what we're going to do, and I'm like, that's what we do too. You guys just do it all at once. And you think because you do it all at once that it's magical, but actually you just do it along the way."

来源：[一手] 同上

**Q31｜六周的数字不重要，边界才重要**
> "I wouldn't get too hung up on the six number. People get hung up on that all the time. Six work weeks works for us. It feels like the right amount of time. … maybe it's eight weeks for you, maybe it's 11, I don't even know. The point is is that you want to time box this, you want to have an end and you usually want to be able to see the end from the beginning."

> "If you use other methods where it's like two week sprints in perpetuity, that's not very useful because there's no end. Perpetuity is not helpful."

要点：**这是「为什么不是两周」的直接答案**——不是两周太短，是**「永续的两周」没有终点**。
来源：[一手] https://37signals.com/podcast/managing-chaos-listener-qs/

**Q32｜Shape Up 对创始人的真实作用是「约束自己」**
> "Shape Up to me is as much for everyone else as it is for Jason and I to protect the company and what we want long-term from ourselves and from our own impulses."
> "there's basically two months where you don't really get to interrupt most of the time"

来源：[一手] 同上（DHH）

**Q33｜软件不会物理性地「推回来」**
> "If software was a physical object, there'd be a point in which you'd go, this is too big, I can't carry this anymore. There's too many spikes on it. … You don't get that in software. Software can ever expand and that's why it typically does."

要点：他解释功能膨胀为什么是必然的——**缺少物理反馈**。这是他在 feature bloat 问题上的核心即兴推理。
来源：[一手] 同上（Jason）

**Q34｜「资源诅咒」与「inshittification」**
> "I guarantee you Basecamp would turn to shit in exactly the same way as every other piece of enterprise software that has ever attracted 2000 people to work on it has turned to shit, because this is a resource curse."
> "it requires that discipline to at least slow down the rate of inshittification because it's a universal law. It is simply the law of entropy restated."

来源：[一手] 同上（DHH）

**Q35｜他给产品经理的定义**
> "I think that is actually one of the finest jobs that a product manager can have is to be the voice of customers who are never going to talk to you."

> "No one's going to ask like, hey, could you please remove some features? … It's always, can I have some more please"

来源：[一手] 同上（DHH）

**Q36｜「yes 现在很便宜，以后很贵」**
> "yes is very cheap now, but very expensive later."
> "because it's so cheap now, it's so easy to say, it's so easy to spend yes, it doesn't cost anything right now."

来源：[一手] https://37signals.com/podcast/say-no-by-default/（Jason）

**Q37｜把未来的承诺拉到现在检验**
> "would you say yes now if you had to do it tomorrow? … It's easier to say yes to something that's four months down the road because you don't incur any costs right now."

来源：[一手] 同上（Jason）

**Q38｜「好产品不是靠说是做出来的」**
> "You don't get a great product by saying yes to everyone all the time. You get a great product by saying no to almost everything almost all the time."

来源：[一手] 同上（DHH）

**Q39｜他承认现在比早期更难说「不」**
> "It's harder to say no now because we know we can. We know we can say yes, we can say yes to almost everything and find a way to make it work because we have enough productive capacity at the company to do it. It is so much easier to say no when there literally is no other choice. That's the real benefit of constraints."
> "It is very difficult for a Microsoft or even an Apple … to successfully say no to some of these things … because there's no back pressure."

来源：[一手] 同上（DHH）。**注意这是对主持人假设的直接反驳**——主持人问「是不是现在比早期更容易说不？」，他答「No.」

**Q40｜对客户请求的标准动作**
> "don't tell 'em either way. Say thank you. That's it. Under no circumstances should you allow yourself in a customer interaction to get drawn into on the spot a commitment."

> "As software developers and designers, we have to work on people's behalf. We cannot work on their request."
> "Oftentimes what customers will request is like, can you just put a toggle on the side of the thing? … but I can't put on a thousand toggles and I have a thousand feature requests."

来源：[一手] 同上（DHH）

**Q41｜当场的自我拆穿**
> David: "That to me is the essence of why saying no to that level of complication in the business and in the product takes courage because you literally have to say, here's something…"
> Jason: "We're cowards, we're cowards."
> David: "We are, to some extent, some of the time."

要点：这是两人对话里**即兴相互拆台**的典型样本——刚论证完「需要勇气」，Jason 立刻自嘲认怂。
来源：[一手] 同上

**Q42｜「不要按个案设计」**
> "you have to be careful not to design by anecdote or fix by anecdote or change by anecdote"
> "So our point of view is listen for sure. And for the most part, forget."

来源：[一手] https://37signals.com/podcast/dont-write-it-down/（Jason）

**Q43｜roadmap 制造「一致的幻觉」**
> "I think the other problem is that roadmaps are breeding ground for illusions of agreement, that you think because there's a bullet point on some roadmap that vaguely sounds like it's addressing a desire you have for the product, that it's actually going to fulfill that desire."
> "you're promising this in the future because you don't want to work on it now. And there is actually the tell. If this was truly so important, you just work on it now."

来源：[一手] 同上（DHH）

**Q44｜「一丁点微光」不能出货**
> "we've occasionally, well, often found like, oh yeah, there's a glimmer. I can't ship a glimmer. It's got to have a final solid shape. Otherwise, I'm just shipping gas."

来源：[一手] 同上（DHH）

### 2.5 Jason Fried & DHH｜HEY 与 Apple

**Q45｜App Store 审核「全部是随意的」**
> "The process is entirely capricious. There's a fig leaf of guidelines that you can look at and try to read the tea leaves and what it takes to get in, but it doesn't actually govern what gets in and what doesn't get in."

来源：[一手] https://37signals.com/podcast/this-again-apple/（DHH）

**Q46｜为什么不能「带着弹珠去别的院子玩」**
> "85% of the people who use our HEY email and calendar service and pay for it, they use Apple devices. We have to be on the iPhone. It is not optional. … There are no other yards."

来源：[一手] 同上

**Q47｜自己解释为什么最后过审了**
> "It went through in large part because we are loud and obnoxious wasps and if you stick your goddamn paw into our hive, we will sting and we try to do the best stinging we can."

来源：[一手] 同上

### 2.6 Jason Fried｜Tim Ferriss #329

**Q48｜刻意无知**
> "I'm pretty oblivious to a lot of things intentionally. I don't want to be influenced that much."

来源：**[二手]** https://wisdomsparks.com/tim-ferriss-show/jason-fried-329/（聚合站转述，标注出自 Tim Ferriss Show #329）。**未获取到官方逐字原话**——官方 transcript 页 https://tim.blog/2018/07/25/the-tim-ferriss-show-transcripts-jason-fried/ 抓取被截断。

---

## 3. 被追问时的回答方式

这一节按「对方怎么问 → 他当场怎么接」记录。**注意三人的反应模式差异很大。**

### 3.1 Ryan Singer：先认同质疑的一部分，再把问题重新定位

| 追问 | 他的当场反应 | 来源 |
|---|---|---|
| Brian Rhea：appetite 优先会导致「交付得比客户真正需要的少」——「我房子颜色不喜欢，总不能只刷三分之一就说刷完了」 | 先承认：「that's a really good question」「you can't ever really escape estimation」。然后**重新定位问题**：不是「要不要估算」，而是「估算排在流程的哪个位置」。落点是设计要有腾挪余地（calendar 的例子）。 | [一手] brianrhea |
| Brian Rhea：「这套东西只在高效互信的团队里管用，低信任团队需要流程和政治」 | **不让步，直接反转**：「I actually think it's the opposite, and let me say why.」把「公开 backlog」重新定义为低信任与坏政治的**成因**。 | [一手] brianrhea |
| Shapers & Builders：列出五条最尖锐的批评（孤胆天才塑造者 / 团队被削弱 / 只因为 Basecamp 稳定才成立 / cooldown 浪费 25% 时间 / 这是迷你瀑布） | 逐条接。对第 1 条直接说「that's a very good criticism」；对第 3 条说「there's truth to that」「stagnation isn't fair but they are completely related to the fact that basecamp was bootstrapped」；对第 5 条用「什么才叫 iteration」重新框定（真正的迭代要**先出货拿到真实反馈**，Scrum 语境里的 iteration「其实是永不结束的项目」）。 | [一手] shapersbuilders |
| 被问「这本书最核心的收获」 | 把「被追问」本身宣布为方法：「I get to discover things that are missing in the book」 | [一手] brianrhea |

**模式**：`先给质疑一个真实的让步 → 指出质疑预设了一个错误前提 → 重新定位问题 → 用具体案例收尾`。他很少硬顶，但也很少整体认输。

### 3.2 DHH：先给一个斩钉截铁的判断句，再用一大段话把它撑起来

| 追问 | 他的当场反应 | 来源 |
|---|---|---|
| 主持人套话：「听起来现在比早期**更容易**说不了？」 | 一个字：「**No.**」然后展开：「It's harder to say no now because we know we can.」 | [一手] say-no-by-default |
| 网络批评者：「团队周末加班，这不符合 37signals 的作风」 | 先去**读自家书里那一章**（"I actually went through to read the chapter that addresses this in the book yesterday"），引用其中「偶尔会有危机，你应该到场」，然后对批评者开火：「this kind of overly precious bullshit that people who make hundreds of thousands of dollars a year can lull their little brains into believing is actually right」 | [一手] this-again-apple |
| 「是不是你精心设计让 Apple 拒绝你、做了一波营销？」 | 「First of all, what 4D chess strategic vision do you think we have here that we can just maneuver the largest most valuable company in the world to just play our little tune? … What are you on about?」——用**嘲讽反问**替代论证 | [一手] this-again-apple |
| 「Apple 是不是只是低层员工搞错了？」 | 拆证据链：Apple 是「Bill」打电话来、走了 app review board、花了三周 deliberation、周五下午 4:55 才发书面拒绝。「This was not a low level mistake.」 | [一手] this-again-apple |
| Lex：「你变了，13 个月前你还怀疑 AI」 | 不承认自己变了：「I don't actually have different opinions. I have the same opinions.」——把变化归因于**工具换代**（autocomplete/chatbot → agents），而不是自己转向 | [一手] lexfridman #501 |

**模式**：`短判断句 → 硬证据或自身文本 → 攻击质疑者的动机/预设`。遇到被指控「言行不一」，他会**回去翻自己的原文**再回应。

### 3.3 Jason Fried：用生活经验把抽象问题落地，或者干脆说「我不知道」

| 追问 | 他的当场反应 | 来源 |
|---|---|---|
| 「你怎么管理组织的混乱？」 | 开场就交底：「There's probably a lot of ways to answer this. … I dunno where the chaos is coming from」「I don't know really where to go with that, but that's kind of a couple of things that come to mind.」——**公开承认思路没走完** | [一手] managing-chaos |
| 「六周周期对非软件公司（如营销公司）适用吗？」 | 先**拆掉数字**：「I wouldn't get too hung up on the six number.」再给原则：要能从头看到尾。 | [一手] managing-chaos |
| 「Basecamp 有没有后悔做过的产品决策？」 | 不挑软柿子：直接点名 ONCE「hasn't panned out financially」，再点名 client access 的多种方案「backing out of that was very, very hard」，最后点名自家定价分层「it bugs me」「I wish we could just be like, there's two prices. You get the damn same thing.」 | [一手] say-no-by-default |
| 「16 岁的人来问建议怎么办？」 | 情绪外露：「And I'm like, fuck. First of all, you don't need any advice. You're 16, don't listen to anybody.」 | [一手] ignore-the-competition |
| 「一个中层 PM 面对老板天天改主意，能怎么办？」 | 不装解决：**先替提问者把反驳说出来**（「if she could rebut, she would be like, yeah, yeah, I agree. But the directions continue to come down from management…」），然后承认「there's not a lot you can do in that situation」 | [一手] good-enough-is-fine |

**模式**：`替对方把反驳先说出来 → 承认处境 → 给一个他真用过的具体动作（如「问老板：你对我们做的活满意吗？」）`。

---

## 4. 即兴类比清单

按使用频率与辨识度排列。**加粗**者为反复出现、可视为其思维工具的一部分。

### Ryan Singer

| 类比 | 用来解释什么 | 出处 |
|---|---|---|
| **碎纸机 paper shredder** | 把项目拆成 ticket 再分派——「你得指望这些纸条自己粘回去」 | brianrhea / 37signals shape-up |
| **宜家家具（8 个孔 8 颗螺丝）** | 爬到山顶的感觉——「我知道我没事了」 | brianrhea |
| **煎蛋总得先有生鸡蛋** | 「宇宙的基本事实」不可绕过 | brianrhea |
| **牛排 vs 热狗** | 约束改变「好」的定义 | brianrhea |
| **面包板 breadboard**（Radio Shack / Forrest Mims III 手绘电路书） | 比 wireframe 更粗的设计表达；附带一句自述：「those books gave me the confidence that things don't have to be this polished professional looking thing」 | 37signals shape-up |
| **乐高积木** | 「有人替你把乐高都做好了，你的活只是让它们咔哒拼上」——批评 ticket 分派剥夺了整合责任 | shapersbuilders |
| **自行车辅助轮 / 起跑枪**（"just a starting gun"） | 时间盒开始后你就控制不了任何东西 | shapersbuilders |
| **弹珠与院子**（"There are no other yards"） | 其实这是 DHH 的说法（见下） | — |
| **没有说明书的宜家纸箱** | 全新产品的 R&D 阶段：拿到一整箱没有说明书的家具 | brianrhea（访谈者提出、Ryan 确认） |

### Jason Fried

| 类比 | 用来解释什么 | 出处 |
|---|---|---|
| **把东西塞进床底下打扫房间** | AI 隐藏语法/样板代码的恶心感——「它并没有让脏东西消失」 | HEY World 2025 |
| **软件缺少物理反馈**（「如果是实物，你会觉得这上面刺太多，我拿不动了」） | 功能膨胀为什么停不下来 | managing-chaos |
| **要过期的灵感**（"the inspiration in them is perishable and they'll go out a date"） | 想法在货架上放不了太久（DHH 说的，Jason 同场） | managing-chaos |
| **看别人家的院子** | 相对于「看着竞争对手」的焦虑 | ignore-the-competition |
| **一把捉住你的钩子**（"you almost want to get snagged"「我身上好像到处是钩子」） | 产品想法从哪来——不是空想，是被现实绊住 | building-with-llms |
| **乐队不能换人** | 创始人离开后公司该结束：「你干嘛要替换乐队成员」 | building-with-llms |
| **两罐同品牌花生酱，一大一小** | 理想的定价：「买软件应该像买花生酱一样容易」 | say-no-by-default |
| **父母学说年轻人的词** | 老创业者硬要装年轻 | ignore-the-competition |
| **《推销员之死》/ 草原修复 / 玻璃屋的园丁** | 关于「创造条件而非强行促成」 | Tim Ferriss #329（[二手]，仅见话题列表，**未获取到逐字论证**） |

### DHH

| 类比 | 用来解释什么 | 出处 |
|---|---|---|
| **猴子手 / 三个愿望**（monkey hand） | AI 会给你要的一切，但不会对你说「不」——「你要一百万，结果奶奶死了」 | ai-challenges-in-software |
| **GPS 开进港口** | 早期 GPS 大家还得盯着；现在车自己会开——说明 agent 已经可信 | lexfridman #501 |
| **曲棍球棒诅咒 / 资源诅咒 / 熵增定律** | VC 融资 → 招人 → 产品烂掉 | managing-chaos |
| **粉色蛋白霜 Pinkberry 只卖两种口味** | 「审美上令人愉悦的商业模式」的极致 | say-no-by-default |
| **Apple 的四象限** | Steve Jobs 回来砍产品线的「勇气」对照当下 iPad / Pencil 产品线的失控 | say-no-by-default |
| **风化的脸 vs 青春的张扬** | 老产品（heritage products）的裂纹 vs 新产品可以做最激进的决定 | say-no-by-default |
| **鲸鱼浮出水面换气** | 深度工作后上来吸收信息（"four hours later like a whale, I come up"） | managing-chaos |
| **胶带 vs 铆钉扭矩与气流** | 客户想要的是在翘起的地方贴胶带；真问题是铆钉/气流 | dont-write-it-down |
| **「我的牛排太多汁、龙虾太黄油」** | 嘲讽抱怨 AI 贡献太多的开源维护者 | lexfridman #501 |
| **新教改革 / 路德钉 95 条论纲** | AI 把「程序员」这个中间层去中介化 | lexfridman #501 |
| **敲代码的凿子**（"I was still chiseling code"） | 前 agent 时代：AI 只是让原有动作更有效率 | lexfridman #501 |
| **Overton 窗口不会自己打开** | 需要有人一点点冒险推动 | lexfridman #501 |
| **David Goggins** | 「现在成为伟大的人前所未有的容易，因为没人认真到场」 | titles-tenure |
| **海明威：要成为好作家，你得活一活** | 商业想法来自暴露在真实问题中，不是天赋 | building-with-llms |

---

## 5. 改变立场或松口的瞬间

按重要性排序。**这些是本文件最有价值的部分。**

### 5.1 DHH 对 AI 的态度：从「宁可退休也不交出键盘」到「一行代码都不是我手写的」

这是本次调研中**唯一一次有清晰时间戳、有明确前后原话、当事人还专门解释过原因**的立场反转。

**阶段一（2025-05-13，HEY World 书面）**：
> "I have no interest in giving up writing code. That's not the unpleasant part that I want AI to take off my hands."
> "AI is a superb pair programmer, but I'd retire before permanently handing it the keyboard to drive the code."
> "Programming *should* be a vibe! It should be fun!"

**阶段二（2025-07-12，Lex #474）**：仍保持怀疑，但已承认 AI 是「superb pair programmer」；同一期里他谈 cookie banner、CRUD monkey、JavaScript 黑暗十年。

**阶段三（2026，Lex #501）**：
> "I am incredibly excited."
> "There is none of the existential threat. That doesn't exist for me as an emotional component."
> On Omarchy Quattro: "I have not written any of the code that's shipped in Quattro by hand."

**他自己对「你是不是变卦了」的处理**：
> "I don't actually have different opinions. I have the same opinions. A year ago, I did not like the mode of AI we were offered. It was the autocomplete mode, or it was the AI chatbot mode. … But then we get the agents."

**他给出的时间点**：
> "November 24. That's the exact moment."（Opus 4.5）
> "There are decades where nothing happens and weeks where decades happen."

**同一条时间线上，37signals 公司层面在 2026-07 的说法（Jason + DHH）**：
> "Basecamp 5 was the first fully AI accelerated development process that we've had."
> "we let them vibe. And we ended up with a lot of PRs that individually perhaps could have been justified for a hot moment, but taken all together, destroyed the architecture of the system. And we actually had to clean up manually."

**要点**：**公司实践先撞墙（2026 年 2 月的「vibe 事故」），公开叙事随后才调整。** 这一点很重要——它说明 DHH 的转向不是舆论驱动的，而是被 Codebase 的实际情况逼出来的。

### 5.2 Ryan Singer 对 Shape Up 重心的迁移（2019 → 2023）

见 Q19–Q23。用他自己的话说，这个发现「violated my sensibilities」。**他公开承认书里最硬核的那部分（scopes + hill charts 的交付期纪律）对绝大多数团队不是必需的**，真正的杠杆在塑造期。

### 5.3 Ryan Singer 承认赌桌上的「奢侈」

> "that actually presumes that there's enough time to prepare and meaningfully shape multiple pitches right which very often isn't the case at a lot of companies this was a luxury That Base Camp had"

要点：**承认 betting table 的运作前提是 Basecamp 独有的资源结构**，不是普适方法。于是他把「一次 shaping 一个 pitch」也纳入可接受变体。

### 5.4 Jason Fried 对 freemium 的追悔

> "I'm not going to take credit here, but we kind of invented the freemium tier stuff 20 years ago and in some ways I regret that and we've gone back and forth."
> "We actually for a long time with Basecamp had one thing. A hundred bucks a month flat out that was it. I kind of missed those days to be honest"

来源：[一手] say-no-by-default

### 5.5 Jason Fried 对自家定价分层失控的公开不满

> "I got to be honest, I am not happy with it. And it's not the design, it's the fact that we've gotten complicated with our pricing. … I wish we could just be like, there's two prices. You get the damn same thing."
> "this is simply mirroring the internal complexity that we've injected into the app. And it bugs me. It bugs me."

来源：[一手] say-no-by-default

### 5.6 关于「六周」的松口

- Jason（2025）：「I wouldn't get too hung up on the six number.」（Q31）
- Ryan（2023）：「even the six-week cycle might not be a good idea when you're just three people starting off.」（Q7）
- 对照：书的术语表把 "Six weeks" 与 "Cycle" 定义为固定术语（Q15）。

**这是一个被保留的矛盾**（见第 8 节）。

### 5.7 未获取到的「改口」清单

- Jason Fried 在 Lenny's Podcast（2023-12-17）有明确章节“What Jason has changed his mind about”（01:00:06）以及“Adopting a new way of working”（39:56）——**逐字内容未获取**，页面仅有章节表。
- Ryan Singer 在 Lenny's Podcast（2025-03-30）有“The second edition of the book”（01:35:55）章节，**逐字内容未获取**。

---

## 6. 拒绝回答或回避的问题

**重要发现：本轮抓取到的所有逐字稿中，三人几乎没有「拒绝回答」的实例。** 他们的回避方式不是拒答，而是：

### 6.1 主动声明可以拒答，但实际上还是答了
主持人 Kimberly 在 `Building with LLMs` 里，问到继任 / 接班问题时先递台阶：「You can tell me you don't want to answer it, 'cause we've had a lot of people ask similar things」。Jason 仍然完整回答了，并给出明确结论：
> "I think we'll sell the business and that'll be that. … I think it would be unfair to another team frankly, to have us anywhere in the ballpark around"

来源：[一手] building-with-llms

### 6.2 把「不给承诺」制度化为对外部的标准回复
这不是回避主持人，而是**系统性地回避对客户做承诺**——三人一致：
> "we don't have a roadmap."（DHH, picking-priorities）
> "don't tell 'em either way. Say thank you. That's it."（DHH, say-no-by-default）
> "It always ends in regret always."（Jason，谈 forward promise, dont-write-it-down）

来源：[一手] 三处

### 6.3 把问题转给另一个人
Kimberly 在 `AI challenges` 里追问 token 花费预算（「It might be none of my business, but I'm curious」）。Jason 未接，全程由 DHH 回答技术成本问题。

来源：[一手] ai-challenges-in-software

### 6.4 用「我不知道」代替回答（Jason 特有）
- "I dunno where the chaos is coming from"
- "I don't know really where to go with that"
- "I don't know what I'm talking about in your world"

来源：[一手] managing-chaos / ignore-the-competition

### 6.5 明确被跳过的提问
`Titles, tenure` 那期，Jason 被问到「如果我有多几天，你会怎么改」时他**反过来考候选人**，没有回答自己会怎么做。属于话题转移而非回避。

**结论 [推断]**：三人的公开对话中几乎不存在「被问倒了就拒答」的场景，主要因为 (a) 节目由自家团队主持（37signals 播客 2018 年后的主持人 Kimberly/Shaun/Wailin 均为公司员工或合作者）；(b) 外部长访谈（Lex）里提问者是友好立场。**独立调研中若需要「压力测试」材料，现有素材不足。**

---

## 7. 近年（2023–2026）关于 AI / 独立开发者 / 小团队的观点

### 7.1 AI：三条同时成立的判断（他们反复强调要「同时持有」）

**① 这是真的，不是泡沫**（DHH, 2026-07）：
> "this is absolutely real. This is not a fad. This is as strong of a signals as I've gotten from our industry literally since the internet."
> "Literally when we were just talking about how AI was being used to make Basecamp, we're talking about what happened the last six months, the last nine months, the last year at the very most."

**② 但客户并不都想要它当门面**（Jason, 2026-07）：
> "I invite everybody to go to basecamp.com and open a few different browser tabs. … You can go to clickup.com, monday.com, notion.com, Asana.com. If you look at all of those products, how they're presented today, it's AI first. It's AI is everything. And I will tell you, having just interacted with literally thousands of customers over the past handful of weeks here, a lot of people don't want that."
> "These are words that have been lost. This used to be how everyone actually talked about their product, easy to use. We still have that in our homepage. I actually don't think I've seen that phrase kind of anywhere else in the last few years."

**③ 而「什么都不做」也是错的**（DHH, 2026-07）：
> "if you are a software developer and you've decided that AI is just not for you at all, you don't care about it, it's all just a fad, it's all just hype. I don't think that's a good place to be."
> "And I remember the internet very [faintly] and very vividly. And I also remember in like 95, 96, 97, how many people were just determined to tune out all the hype there was for the internet in those days and go like, 'This is nothing more than an advanced fax machine.'"

来源：[一手] ai-challenges-in-software

### 7.2 AI 对「说不」这件事的破坏——这是他们最原创的论点

> "what happens to product management when suddenly there's not this great constraint of, I only have so many programmers, they can only work so many hours and therefore they can only produce so many features? What if you suddenly double that, triple that, 10X that? Do you actually trust yourself and your product managers to say like, 'No, we're not going to do these things'…?"（DHH）

> "There's about 20 things that we have listed as things we might be working on over the next six weeks. That would normally be maybe six things like a year ago"（Jason）

来源：[一手] ai-challenges-in-software

**要点**：他们**没有**把 AI 描述成「让小团队更强」，而是描述成**「原本靠产能稀缺维持的纪律正在失效」**。这是 AI 时代对 Shape Up 最直接的威胁，由他们自己提出。

### 7.3 AI 会毁掉 codebase，需要人工闸门

> "if you like what you have, we should not think that that's something you can just hit merge on. … We did that a couple of times and we ended up with some technical debt, which is the polite word for crappy code that needs to be swept up after the fact"
> "the final rule was if you're making changes to the Ruby code or to the JavaScript code and you're on the design side or a junior programmer, you should just have someone look it over."

来源：[一手] ai-challenges-in-software

**对照 Lex #501 更狠的版本**：
> "we let them vibe. And we ended up with a lot of PRs that individually perhaps could have been justified for a hot moment, but taken all together, destroyed the architecture of the system."
> 被 Lex 追问「是不是说明现在 vibe code 还得先是程序员」：**「To be able to vibe code on existing substantial code bases … 是的。」**

### 7.4 独立开发者：LLM 让「一个人的设计+开发」变得可行，但有前提

一位独立 iOS 开发者问：能否用「一个设计师 + Claude Code」替代「一设计师 + 一程序员」的团队配置。

DHH：
> "I think this is one of the most amazing things about the LLMs … At our scale, the number of customers we have and the criticality that we're dealing with, we can't usually ship a bunch of LLM code into production. It's still just not good enough for that yet."
> "if you are working on say, a game or something just fun and frivolous, maybe something that doesn't collect user data at all, who cares? Use LLMs all the way."
> "half the enjoyment with LLMs is not necessarily that you're going to ship it, but that you get to see your idea actually work."

Jason（同场，给出判据）：
> "My question with all this stuff is always that like, then what, now what? You can get yourself in a position where you're overextended too far out, you built this thing, you don't really understand how it works. You're the only one around and now something goes wrong and you ask the LLM to fix it and it can't."
> "I think that's the threshold for me is, how far can you take this? … are you comfortable putting this out there for real people to use? And what happens if something goes wrong?"

来源：[一手] building-with-llms（2025-08）

### 7.5 小团队：什么时候需要流程

**Ryan Singer（Lenny's，2025）**[二手，仅 show notes]：
> “Shape Up provides the most value when companies reach 30 to 50 people in product and engineering, especially when the founders can no longer be directly involved in everything.”

**Ryan Singer（Shapers & Builders，2023）**[一手]：
> "for 90[%] of teams once you establish a time box … you cannot influence anything"
> "reactive work … has that urgency and that's why it's a problem for project-based work"

**DHH（Lex #501，2026）**[一手]——关于小团队与 AI 加速的真实瓶颈：
> "As soon as you're having human teams work together on something, the bottleneck is rarely implementation. It's human bandwidth and communication. When you have a product manager and a couple of designers and a VP above them and a CTO above them, and everyone wants to be part of the shaping process because we're all justifying why we're here, that's where all the productivity goes to die."
> "to get that magical 10X, 100X … productivity boost, you have to interact with the agents directly, and you cannot intermediate that bandwidth with another human because it's simply too slow."
> "most organizations don't know what they want. They don't know how to make it better. They're not bottlenecked on implementation. They're bottlenecked on ideas. They're bottlenecked on vision. They're bottlenecked on taste."

**要点**：**「shaping 是瓶颈」这个判断在 2026 年被 DHH 用来解释 AI 为什么没能让大公司提速**——这跟 Ryan Singer 2023 年说的「杠杆全在 shaping」是同一条思路的延伸，只是方向相反（Ryan 说 shaping 是解药，DHH 说 shaping 是卡点）。

### 7.6 招人与小团队规模
- 2025 年一次招 5 人（2 名初级 + 2 名高级程序员 + 1 名设计师），公司约 60 人，等于扩员近 10%：
> "It's okay. At our stage in the lifecycle of this business, 25 years in to have a little healthy fat on the bones, right? We don't need this 5% body fat margin."（DHH）
> "we were hiring juniors at all in a time when everyone's going like, AI's going to take over everything in five minutes from now. Well, first of all, I love AI, but it hasn't taken over everything, right? We are still going to need human programmers for some time still, and if you need human programmers for some time still, you also need to hire juniors"（DHH）

来源：[一手] titles-tenure-dont-matter（2025-08）

### 7.7 对独立开发者 / 求职者的建议（DHH，2025-08）
> "There is an infinite amount of work available in the world's open source projects. You can literally just show up in almost any project, pick any bug or offer suggestion for a feature and just do it. Just do it. Don't ask anyone for permission."
> "It is such a hack. It almost feels like a cheat coat [code]."
> "It's never been easier to be great because no one fucking shows up"（引 David Goggins）

来源：[一手] titles-tenure-dont-matter

---

## 8. 矛盾与不确定

### 8.1 保留的矛盾（不做调和）

**M1｜六周到底是「方法」还是「不重要」？**
- 书里：`Six weeks` 是术语表词条，「能从一开始感到截止日压迫的最长时段」（[一手·书面]）
- Jason 2025：「I wouldn't get too hung up on the six number.」
- Ryan 2019：「even the six-week cycle might not be a good idea when you're just three people starting off.」
- Ryan 2023：「the length of the Cycles」被列为**可以灵活调整的**「people thought were sacred」的东西之一。

**Ryan 自己给的解释**：practices 是 scale-dependent，facts 不是。但**这个解释本身是事后补的**——2019 年书里没有这一层。

**M2｜「不要写下来」 vs 自家在写**
- Jason 2026-07：「listen for sure. And for the most part, forget.」
- 同一期他自己说：客户服务团队维护一个叫 `Support: Voice of the Customer` 的项目在记录客户原话。
- 同月（2026-07-01，早两周）他说 Basecamp 5 有一个 `Cycle 3` 的 card table，列了约 20 项待办。

**Jason 的处理**：他区分「不写进 public backlog」和「记录有意思的语言」。但这个区分的边界在对话中没有被严格给出。

**M3｜「不追竞争对手」 vs 「我们做过 37better」**
Jason 2026 前后说「ignore the competition」，但 DHH 在 2025-08 主动讲 37better——1999 年未经许可重做别人网站（FedEx、银行）作为招揽客户的手段。DHH 对此的定性是「unconventional approach」，不是竞争分析。

**M4｜「保持小」 vs 一次扩员 10%**
DHH：2000 人做 Basecamp「它会烂掉」「这是资源诅咒」。
DHH 同时：25 年了，「可以有 15%、17% 的脂肪」。
两人自洽的说法是「不超过 3 个团队（6 人）做 Basecamp」，但扩员发生在公司层面而非 Basecamp 团队层面——**这个边界在对话里没有被明确划出来**。

**M5｜Shape Up 到底是「普适事实」还是「bootstrapped 公司的特例」？**
- Ryan 2019 书：写成普适方法。
- Ryan 2023：明说「六周 + 两周一 cooldown + 并行塑造多个 pitch + 完全无 roadmap」这些具体做法「**completely are related to the fact that basecamp was bootstrapped**」。
- 他又说 facts 不 scale-dependent。
- 他为此发明了 `ramp up` 作为 `cool down` 的替代——这是**为适配 VC 团队而新增的补丁**，书里没有。

**M6｜DHH 的「我没有改变观点」 vs 事实上的观点改变**
他坚持「same opinions，变的是工具」。但 2025-05 他写「I'd retire before permanently handing it the keyboard」，2026 年他在 Omarchy Quattro 上「没有一行代码是手写的」。**是工具变了，也是判断变了**——「工具变了」这个说法无法解释「宁可退休」到「完全不写」的跨度。**保留这个矛盾。**

**M7｜「不要按客户请求做」 vs 「我们就是给客户做工具」**
DHH：「we have to work on people's behalf. We cannot work on their request.」
同一期他批评 Microsoft 式「把客户请求排序」的做法。
但 37signals 的商业模式完全依赖客户订阅。他给的解法是「代表那些永远不会跟你说话的客户」——**这是一个立场，不是一个可验证的机制**。

### 8.2 明确的不确定 / 未获取

| 项 | 状态 |
|---|---|
| **六周为什么恰好是六周**（而不是四周/八周）的**一手即兴原话** | **未获取到**。最接近的是术语表的「time horizon」定义与 Jason 的「六周对我们合适」。**没有找到任何人解释过这个数字的具体来历。** [存疑] |
| **「appetite」这个词是怎么想出来的** | **未获取到**任何一手叙事。只找到他解释「appetite 与 estimate 是反过来的」。 |
| **对 velocity 这个具体指标的批评原话** | **未获取到**。他们批评的是 backlog / roadmap / estimate / sprint，没有抓到直接谈 velocity 的原话。 |
| **Tim Ferriss #329 官方逐字** | 页面存在但抓取被截断，**未获取到官方原话**，仅一条 [二手] 引语。 |
| **Lenny's × Jason Fried（2023-12）/ × Ryan Singer（2025-03）逐字** | 页面仅有 show notes 与章节表，**未获取到逐字**。已知存在相关章节：「What Jason has changed his mind about」「The second edition of the book」。 |
| **Lex #474 后半段**（managers are useless / small teams / meetings are toxic / Apple 部分） | 抓取被截断，**仅有前半段（编程史、JavaScript、Chrome DOJ、Ruby）**。 |
| **Lex #501 后半段**（vibe coding vs agentic engineering 完整对谈、advice for programmers、future of programming） | 抓取被截断。已获取的核心集中在「Programming with AI agents」「How software will change」「AI impact on open source」三节。 |
| **How I Built This × Jason Fried** | **未找到该期**，怀疑不存在。 |
| **The Knowledge Project × Jason Fried** | **未核实**。 |
| **「HEY 为什么不做免费版」的专门长访谈** | **未找到**。只有 `Say No by Default` 里对 freemium 与定价分层的追悔。 |
| **三位同时出镜的长对话** | **未找到**。Ryan Singer 2019 后基本退出 37signals 的播客（2023 年已离开 Basecamp，见 Shapers & Builders 的「former Head of Strategy」）。 |

### 8.3 跨来源的表述冲突 [冲突]

**C1｜公开论坛为什么失败**
Ryan 2023 回忆：书刚出时他们开了个公开 Shape Up 论坛，「it was just silent」，他当时很失望；后来理解到「book 处理的是公司最高层的难题，C-level 不会公开讨论自己团队多没效率」。

**同一期主持人 David Arens 反驳**：「I have observed some posts of that, you know, I know the firm you're talking about and there have been people sharing their struggles.」Ryan 部分接受：「there's been some of that … especially those bootstrappers who were really close fit」。

——**两人对「是否真的没人谈」有分歧，双方都保留。**

**C2｜Shape Up 的适用边界，主持人与嘉宾不完全一致**
主持人把常见批评总结为「it works because of the stability slash stagnation at base camp」；Ryan 回应「stagnation isn't fair but they are completely related to the fact that basecamp was bootstrapped」——**承认一半，拒绝另一半（"stagnation" 这个词）**。他没有解释为什么「bootstrapped」不算「stagnation」的另一种表述。

---

## 9. 一句话总结每个信源的「即兴价值」

- **REWORK 播客（37signals 官方）**：Jason 与 DHH 大量即时互怼、自嘲、跑题；**最有价值的是他们被听众提问逼出的即时判断**（尤其 mailbag 类集数）。但主持人是自家员工，**不存在真正的对抗性提问**。
- **Ryan Singer 的一对一访谈（Brian Rhea 2019 / Shapers & Builders 2023）**：**三人中唯一会在被质疑时明确认错并当场重画框架的人**。2023 年那期是他公开修正 Shape Up 的唯一一手来源。
- **Lex Fridman #501（DHH, 2026）**：DHH 观点变化最完整的一手记录，且他自己给出了「变化发生在 2025-11-24」这个可核查的锚点。
- **DHH HEY World**：唯一能拿到**未被播客氛围软化过的**原始措辞的地方（2025 年那篇与 2026 年 Lex 的说法形成最强对照）。
