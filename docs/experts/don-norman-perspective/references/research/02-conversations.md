# Don Norman 长对话 / 播客 / 演讲调研：即兴思维过程

> 调研对象：Donald Arthur Norman（1935-12-25 生，前 Apple VP of Advanced Technology、Nielsen Norman Group 联合创始人、UC San Diego Design Lab 创始主任）
> 调研目标：**即兴与口述材料**（播客、深度访谈、演讲 Q&A、讨论会），而非其预写文章与书籍
> 调研日期：本次会话
> 可信度标注：[一手]＝访谈/演讲原文（文字实录或官方视频页）；[二手]＝他人转述/摘要/媒体整理；[推断]＝本报告基于已抓取材料的推断

---

## 0. 调研方法与覆盖度说明（先读这段）

**实际联网检索过的引擎**：bing、anysearch、exa、keenable、firecrawl、deepseek-official。
其中 **exa 多次返回 HTTP 429（限流）**，**ddg / ddg-lite / searxng 全部连接失败**，**tavily 撞到 keyless 小时配额**，**perplexity / parallel 无 API key**。因此长尾播客清单（Tim Ferriss / Lex Fridman / The Futur / Design Better 等）的**逐条核实覆盖率不足**，凡未核实的一律标注「未核实」，不做存在性断言。

**已核实到位的关键一手实录（本报告主要引用来源）**：

| # | 场景 | 平台/主办 | 年份 | URL | 等级 |
|---|---|---|---|---|---|
| 1 | 关于 AI 与人机交互的即兴对谈（含大量插话、口误、跑题） | Product Powwow（Kevin McCullagh），Part 1 | 2024-09-10 | https://productpowwow.transistor.fm/2/transcript | [一手] |
| 2 | 同上，Part 2（AI 专章：LLM 机制、overtrust、生产力影响） | Product Powwow，Part 2 | 2024-09-10 | https://productpowwow.transistor.fm/3/transcript | [一手] |
| 3 | 关于 Apple 时期、Three Mile Island、失败产品、数字相机的长篇回忆 | Chats with Kent（Kent C. Dodds）第 6 集 | 页面标注 2026-04-22（内容与 URL 指向 2021 年前后，见 §7 矛盾点） | https://kentcdodds.com/chats/07/06/watch-users-fix-systems-and-design-for-humanity-product-engineering-with-don-norman | [一手] |
| 4 | 设计教育必须重做（两集连播的文字实录） | UX Podcast Ep.263 + 264（James Royal-Lawson / Per Axbom） | 2021-05-21 | https://uxpodcast.com/creating-a-better-society/ | [一手] |
| 5 | 「Affordance / 约定 / 设计」自我更正文（原为 1999 年 Interactions 文，2023 年重挂；含他自述 CHI-Web 上「我吼了出来」的经过） | jnd.org（Norman 官网） | 原文 1999，页面 2008/2023 | https://jnd.org/affordance-conventions-and-design-part-2/ | [一手] |
| 6 | 关于「不再演讲、只做讨论」的自我规范（**他如何对待提问**的关键文本） | jnd.org | 未标注（2023 站点版本） | https://jnd.org/about-don-norman/discussions-not-talks/ | [一手] |
| 7 | TED 演讲《3 ways good design makes you happy》（Emotional Design 三条情绪层级） | TED2003 | 2003-02 | https://www.ted.com/talks/don_norman_3_ways_good_design_makes_you_happy | [一手]（**仅抓到官方页面摘要，未抓到逐句 transcript，故不引其原句**） |
| 8 | 视频清单页（自述「视频播客太多，我自己都记不住」） | jnd.org | 2023 | https://jnd.org/videos/ | [一手] |
| 9 | 播客/文章索引页（他本人推荐 McKinsey Author Talks） | jnd.org | 2023-04-19 | https://jnd.org/podcasts-and-articles | [一手] |
| 10 | Want Magazine 长访谈（iPod 系统论、厨具、微波炉上网、与营销人的斗嘴） | Want Magazine（采访者 Ken Grobe），由采访者重挂 | 原刊 2010-05-14，重挂 2012-03-12 | https://ideaczar.com/ken-grobe-idea-czar/2012/03/12/don-norman-the-want-magazine-interview | [一手]（经采访者整理，非逐字实录，标注为「半一手」） |

**明确「未核实 / 抓取失败」的候选源**（不要当作已存在）：
- Tim Ferriss Show、Lex Fridman Podcast、Design Better (InVision)、High Resolution、HBR IdeaCast、Reasonable People、The Observatory、Adobe 99U、UXR Conversations、Wise Design、Intercom、Product Thinking、Lenny's Podcast —— **均未找到可验证页面，未核实**。
- The Futur with Chris Do —— 未核实。
- 99% Invisible / Vox《The Norman Door》视频（YouTube `yY96hTb8WgI`，他本人在 jnd.org 页面确认 Vox 曾登门拍摄，播放量超 1100 万）—— **视频存在已由他本人页面确认 [一手]，但逐字稿抓取失败**。
- Design Matters with Debbie Millman（2023-03-20，`designmattersmedia.com/podcast/don-norman/`）—— 页面抓取成功但正文被截断，**仅确认档期与标题，未取到原句**。
- McKinsey Author Talks（2023-04）—— 他官网确认存在并推荐，正文抓取连接失败。
- UserTesting「Insights Unlocked」Ep.116（2024-05-06）—— **页面抓取到的是导航壳，无正文**。
- Fast Company《Jony Ive's real legacy…》（2019-07-03，含 Norman 表态）—— **HTTP 403 抓取失败**。
- Business Standard 访谈《Good design, bad design and the Apple problem》（2024-09-30）—— **两次抓取均失败**。
- 中文源：按要求只接受权威媒体或播客原始页；**本次未检索到符合门槛的中文一手源**（Bing 对中文查询返回词典/百科噪声，知乎与百度系已按黑名单排除）。

---

## 1. 访谈 / 播客 / 演讲清单表

| 场景 | 平台 | 年份 | URL | 等级 | 备注 |
|---|---|---|---|---|---|
| 设计教育必须重做（上/下两集） | UX Podcast Ep.263 & 264 | 2021 | https://uxpodcast.com/creating-a-better-society/ | [一手] | 有机器转写＋人工校对全文，信息密度最高的一篇 |
| 设计实务（上/下两集） | UX Podcast Ep.125 & 126 | 2016 | https://medium.com/@uxpodcast/design-doing-with-don-norman-6434b022831b | [一手·**未抓取成功**] | Medium 抓取失败；集号与年份由 Ep.263 开场白交叉确认 [二手] |
| AI 时代的 UX（上） | Product Powwow Ep.2 | 2024 | https://productpowwow.transistor.fm/2/transcript | [一手] | 含「HCD 本身是错的」完整自陈 |
| AI 时代的 UX（下） | Product Powwow Ep.3 | 2024 | https://productpowwow.transistor.fm/3/transcript | [一手] | LLM 机制解释、overtrust、Luddite 类比、机器人展望 |
| 产品工程、观察用户、Apple 往事 | Chats with Kent Ep.6 | 2021（页面标 2026） | https://kentcdodds.com/chats/07/06/... | [一手] | 最长的职业自述；含数字相机失败、护士与电子病历 |
| 情绪与设计三层次 | TED2003 | 2003 | https://www.ted.com/talks/don_norman_3_ways_good_design_makes_you_happy | [一手] | 官方页面＋摘要已获取；**逐字稿未获取** |
| Emotional Design 相关 TEDx | TEDxHogeschoolUtrecht（《Persuasion》） | 未标注 | https://designlab.ucsd.edu/about-the-design-lab/designlabtv | [二手] | 由 UCSD Design Lab 页面列出，未抓原视频 |
| 通识式长访谈 | Want Magazine | 2010 | https://ideaczar.com/ken-grobe-idea-czar/2012/03/12/don-norman-the-want-magazine-interview | [一手·半] | 采访者整理版 |
| 关于乔纳森·艾夫的遗产 | Fast Company | 2019 | https://www.fastcompany.com/90371707/... | [二手·**抓取 403**] | 存在性由 keenable 索引与 iPhone in Canada 转载确认 [二手] |
| Apple 与设计话语权 | Business Standard | 2024 | https://www.business-standard.com/companies/interviews/...124093000996_1.html | [二手·**抓取失败**] | 标题已含论点「the Apple problem」 |
| 人性中心设计 | UserTesting Insights Unlocked Ep.116 | 2024 | https://www.usertesting.com/resources/podcast/what-is-humanity-centered-design | [二手·**仅取到壳**] | 仅确认档期与主题 |
| 新书对谈 | McKinsey Author Talks | 2023 | https://www.mckinsey.com/featured-insights/mckinsey-on-books/author-talks-don-norman-designs-a-better-world | [一手·**抓取失败**] | 他官网亲自推荐 |
| 设计书作者对谈 | Design Matters（Debbie Millman） | 2023 | https://designmattersmedia.com/podcast/don-norman/ | [一手·**正文截断**] | 仅确认 2023-03-20、时长约 1 小时 |
| 《Design for a Better World》长对话 | The Design Psychologist S1 Finale | 2025/2026 | https://designpsychologist.buzzsprout.com/2395044/episodes/17913097-... | [二手] | 有档期与简介，未抓实录 |
| 视频/播客总索引 | jnd.org（他本人维护） | 2023 | https://jnd.org/videos/ | [一手] | **他自述不想维护清单**，见 §5 |
| 讨论而非演讲的方法论 | jnd.org | — | https://jnd.org/about-don-norman/discussions-not-talks/ | [一手] | 见 §5、§6 |

---

## 2. 直接引语库（英文原文摘引）

> 规则：每条 ≤30 词，全部来自本次**实际抓取到的页面**，附出处 URL 与场景。抓不到原文的一律不写。

**A. 设计 ≠ 艺术（教育主张的出发点）**

1. “traditional design training comes from art schools… That's not appropriate for design, design is not art.”
   —— UX Podcast Ep.263（2021），回应「为什么要重做设计教育」。`https://uxpodcast.com/creating-a-better-society/` [一手]

2. “a stupid question is the most powerful question, because quite often is asking something that everybody knows.”
   —— 同上，讲设计师「因为什么都不懂所以要快速学习」。 [一手]

3. “I always tell people, it's like, some of my friends get angry with me when I say everybody's a designer.”
   —— 同上，评 design thinking 短课的副作用。 [一手]

**B. 关于失败、时机与产品**

4. “if you don't fail every so often, you're not trying hard enough.”
   —— Chats with Kent Ep.6，总结自己在 Apple 主导的操作系统重做被高管否决。 [一手]

5. “Apple produced it and she went out and it failed… I was right, absolutely right. But I was about 10 or 15 years off.”
   —— 同上，讲他在 Apple 力挺的无胶片相机（QuickTake 一类）。 [一手]

6. “Don't call it a failure, call it a learning experience.”
   —— 同上，讲科学家与创业者的说法差异。 [一手]

**C. 用户研究的核心动作（他反复回到的一句）**

7. “And don't ask them. Don't ask somebody what's the problem, because they'll tell you the symptoms.”
   —— Chats with Kent Ep.6，讲「看人干活」而非做访谈。 [一手]

8. “They just assume it's required. So they will never tell you. They'll never complain about doing that.”
   —— 同上，讲用户对绕路操作的麻木。 [一手]

**D. Affordance 的自我更正（最著名的一次公开改口）**

9. “My fault: I was really talking about perceived affordances, which are not at all the same as real ones.”
   —— jnd.org《Affordance, Conventions and Design (Part 2)》，原文 1999。`https://jnd.org/affordance-conventions-and-design-part-2/` [一手]

10. “Those displays are not affordances: they are visual feedback that advertise the affordances: they are the perceived affordances.”
    —— 同上。 [一手]

11. “Far too often I hear graphical designers claim that they have added an affordance to the screen design when they have done nothing of the sort.”
    —— 同上。 [一手]

12. “But it brought the CHI-Web discussion to a halt… Hope it doesn't stop the discussion again.”
    —— 同上，开篇自述他当年在邮件列表里「吼出来」的经过与后果。 [一手]

**E. Three Mile Island 与「人因」立场**

13. “they were pretty intelligent. They did the best thing possible. It was the design that was so crappy.”
    —— Chats with Kent Ep.6，讲调查委员会结论。 [一手]

14. “We decided they were very intelligent and they did the best job they could, but the design of that plant led to the errors.”
    —— Product Powwow Ep.2（2024），同一件事的第二次讲述（措辞更收敛）。 [一手]

**F. 对 AI / 大模型的当场判断**

15. “today's AI has no understanding. It's not, it's, I keep telling people it's artificial.”
    —— Product Powwow Ep.3，解释 LLM 逐词接龙机制之后。 [一手]

16. “sometimes it's great insight, sometimes we call it hallucination, but no, it's not hallucination, that's the way it works.”
    —— 同上。 [一手]

17. “that's what we need in AI, is trust but verify.”
    —— 同上，回应「overtrust（过度信任）」的提问。 [一手]

18. “I think in the early days of a new technology, most of what is said is nonsense.”
    —— 同上，评 AI 叙事泡沫。 [一手]

19. “And why aren't designers, instead of complaining about it… that's an opportunity for you to help solve those problems.”
    —— 同上，回应「设计师该怎么应对 AI」。 [一手]

**G. 边界与自嘲**

20. “I don't know the solution is… I'm not sure where it comes from, probably from politicians over the last 50,000 years who make promises.”
    —— Product Powwow Ep.3，被追问 overtrust 的根源时的**当场卸力**（先承认不知道，再转移归因）。 [一手]

21. “I never know what I'm going, I never know what I'm doing. And so I just sort of stumble around here and there.”
    —— Product Powwow Ep.2，自述职业路径。 [一手]

22. “Even this, I said, what I'm doing now is a charity… Well, not quite.”
    —— 同上，当场推翻自己刚说的话（Don Norman Design Award 的真实起源是前 Apple 同事提议）。 [一手]

23. “I have far too many Videos and Podcasts to post. In fact, so many, that I can't even remember them all.”
    —— jnd.org《Videos》页面。`https://jnd.org/videos/` [一手]

**H. 关于「设计能不能被市场化」的当场斗嘴（Want Magazine）**

24. “Gee. You really are a marketing person, aren't you?”
    —— Want Magazine 访谈（2010），采访者追问「情绪依恋能否被用来引诱消费者」时，Norman 的**当面拆台式反问**。 [一手·半]

25. “The user experience community thinks they're pure… Every six months, though, we provide new wants.”
    —— 同上，他反手批评 UX 圈自我道德化。 [一手·半]

26. “People think the opposite of complexity is simplicity, but it's not.”
    —— 同上，讲《Living with Complexity》。 [一手·半]

---

## 3. 即兴类比模式（Pattern Analysis）

**3.1 他讲抽象定义时，先找一个「身体能碰到」的物：门 / 水龙头 / 电灯开关**
这是他的**根类比（root metaphor）**，且他明确自述其起源：1988 年在英国访学，「开不了英国的门、拧不动英国的水龙头和电灯开关」直接催生了《The Psychology of Everyday Things》。
- 引语（Chats with Kent Ep.6）：“I published it in 1988 because I was spending a year in England and I couldn't work the doors and I couldn't work the faucets, tap and light switches.”
- 在 Product Powwow Ep.1 中他把这个梗讲得更细（屋顶水箱 vs 直供热水→两套龙头→「在英格兰学洗手要来回蹭手」），说明**同一段子他会按听众文化重新展开**。
- [推断] 他的类比偏好不是装饰性的，而是「把不可见的抽象（affordance、signifier、conceptual model）强行落到可见的机械动作上」。

**3.2 讲系统与生态时用「iPod / 一整套系统」而非产品本身**
- Want Magazine：iPod 成功的答案不是播放器，是「合法化 + 合理定价 + 可用的曲库（SAP 数据库→iTunes）+ 第三方配件生态」，他的总结是「表面极复杂，所有触点都轻松」。
- [一手·半] 这与 §7 他后来「设计要有话语权」的立场是同一条线的两端。

**3.3 讲复杂度时用「厨房 / 做饭 / 刀」**
- “You learn cooking slowly, over time… Every little tool that we use in cooking is pretty simple. Cooking itself is made up of many simple steps.”（Want Magazine）
- 同一场访谈他把「微波炉能上网」当作反面教材：“they don't want to stand in front of their microwave looking for recipes.”
- 厨房是他少见的**正面类比场**（与门/开关的负面类比相对）。

**3.4 讲自动化与人因时用「医院 / 护士 / 电子病历」**
- Chats with Kent Ep.6 里最生动的一段：护士把信息写在手上，因为「30 秒不用机器就为隐私锁屏」，回来必须重新陈述上下文。**这是教科书之外、只在即兴对话里出现的例子。**
- 他由此引出他在 Apple 想做的「中断可恢复」操作系统，并当场承认被高管否决、而且「他们是对的」。

**3.5 讲管理/政治时用「荷兰交通工程师 + 环岛」与「muddling through」**
- UX Podcast Ep.263：他记不住那位荷兰交通工程师的名字，但仍完整复述「拆掉红绿灯与斑马线、把街道做窄、让环岛取代信号灯」的故事，结论是「人以为危险所以开得慢，但通过更快」。
- 同上，他给出自己唯一承认的「方法论」：“incrementalism… find some very small, simple place where you can make a difference”，并援引政治学者 Lindblom 的经典论文 *muddling through*。**注意：他自己说这是他一辈子遵循的一篇论文，但整篇访谈里他没给出作者全名与年份——典型的即兴记忆状态。**

**3.6 类比清单核对（按用户指定清单逐项打勾）**
| 用户预设的类比 | 本次实录中的实际证据 |
|---|---|
| 门 | ✅ 高频，且被他称作自己最出名的事（Norman doors） |
| 电灯开关 / 水龙头 | ✅ 1988 年英国访学叙事，Product Powwow + Chats with Kent 两处 |
| 厨房 / 做饭 | ✅ Want Magazine |
| 医院设备 / 护士 | ✅ Chats with Kent（电子病历＋写在手上）；Product Powwow Ep.3（哺乳期分诊 App、手机测血压） |
| 飞机驾驶舱 | ⚠️ 他提到与 NASA 合作航空安全、提到「aviation safety」，但**本次抓到的实录中未见完整驾驶舱类比** |
| 汽车 | ✅ 早期电动车（GM EV1 的朋友故事）、汽车年度改款驱动的计划性过时（Want Magazine） |
| 恒温器 | ❌ 本次实录中未出现 |
| 核电站控制室 | ✅ 但是以 **Three Mile Island 事故调查**形式出现（两处），不是作为类比 |
| 手术室 | ❌ 未出现（出现的近似项是放射科医生读片） |
| 微波炉 | ✅ Want Magazine（作为反面教材） |
| 遥控器 | ❌ 本次实录中未出现 |
| 飞机 / 737 MAX | ❌ **本次未找到他谈 737 MAX 的可验证原始材料**；他谈过的是航空安全合作与自动化反馈问题（见 §6） |

---

## 4. 他「被追问时的回答方式」（对话手法拆解）

从 Product Powwow 与 UX Podcast 的实录看，他的第一反应顺序**不是**「给定义 → 举例」，而是：

**手法 1｜先否认问题的前提，再重建问题**
- UX Podcast Ep.263，问「你为什么开始这场设计教育改革？」→ 他的第一句是 “Well there are two different issues.”，然后先纠正「设计=艺术」这个前提，再进入回答。
- Product Powwow Ep.2，问「你做慈善是怎么规划的？」→ “Well, not quite.” 他当场推翻自己前一句的叙事。

**手法 2｜先反驳访谈者刚说的话，而不是先回答**
- UX Podcast，Per Axbom 说「co-design 是一种共创」→ 他立刻接 “But what's the difference?”，反驳斯堪的纳维亚式 co-design 仍是「设计师主导」，主张把主导权交给当事人，设计师做「助手/导师/促成者」。

**手法 3｜用「我不知道」当挡箭牌 + 立刻转移归因层级**
- Product Powwow Ep.3 的 overtrust 问题：他先答 “I don't know the solution is”，接着把归因从技术抬到「过去五万年许诺的政治家」，最后落到一句可复述的箴言 “trust but verify”。**这是典型的 Norman 三段式：卸力 → 升维 → 给一句可带走的句子。**

**手法 4｜先给定义，再举一例，再补一个自我否定的脚注**（长回答的定式）
- 讲 design：定义（“design is a method… there's no content in design”）→ 举例（Philips 医疗的首席设计官）→ 脚注（“this doesn't mean that every designer must master all of these topics”）。

**手法 5｜给听众一套「问题质量筛选法」，而不是答案**
- jnd.org《Discussions, Not Talks》：他明确宣布**不再做演讲，只做与听众的问答**，并要求现场提问者**不要坐下**、他可能反问 “Why did you ask this question?”，且期待对方继续追问。他还点名批评两种糟糕的现场：学生被教授逼着提问、以及职业主持人「读完问题就走开」。
- 这条对「如何问他问题」的实操意义最大：他喜欢的是**可继续对话的问题**，不是一次性索取金句式提问。

---

## 5. 立场变化记录（矛盾不调和，原样并列）

**5.1 affordance 用词：三次位移，且他承认是自己造成的**
- **1970s–80s（早期）**：他自述 “I originally hated the idea: it didn't make sense.”（对 Gibson 的 affordance 概念最初是排斥的，还在 La Jolla 与 Gibson 长时间争论）。
- **1988（POET / 设计心理学）**：他写下的是「perceived affordance（感知可供性）」，但书里用的是「affordance」一词 → 设计界把「affordance」当成了「屏幕上那个提示你可以点/可以拖的图形」。
- **1999（正式更正）**：“My fault: I was really talking about perceived affordances, which are not at all the same as real ones.”，并宣称修订时要把所有 “affordance” 全局替换为 “perceived affordance”。
- **2013（修订版《The Design of Everyday Things》）**：转用 **signifier（意符）** 这一术语体系。
- **矛盾点 A（他未调和）**：他在 1999 年断言的「用户界面里 affordance 角色次要、文化约定才是关键」，与他后来在设计圈被广泛引用的「affordance 是交互设计第一概念」并存。他没有公开收回后者在业界的流通。
- **矛盾点 B（他未调和，甚至自嘲）**：他在 Product Powwow Ep.2 里说 “What I've been teaching, human centered design, is wrong. And I've been teaching it for 20 or 30 years, and it's the book, Design of Everyday Things.”，但紧接着又说 “there's nothing wrong in the book. I still believe everything that's in there.” —— **同一次访谈内，他先宣布「我教的是错的」，再宣布「书里没有错」**，他的自洽方式是「错在书里没写的东西（可持续、殖民、成瘾设计），不在写了的」。

**5.2 对「产品」还是「系统」的侧重**
- 2010（Want Magazine）：强调 iPod 的成功**不在产品**而在系统（授权、曲库、配件生态）。
- 2024（Product Powwow Ep.3）：强调 “systems”，主张设计要处理的是系统性问题而非单品。
- [推断] 方向一致，不是矛盾；但 2010 年那篇里他给 UX 行业的建议是「best practices 已经清楚了，用完就往前走」，而 2021–2024 他主张「整个设计教育是坏的、HCD 是错的」。**行业诊断的严厉程度有显著升高。**

**5.3 「人人都是设计师」与他同时批评 design thinking**
- 他对朋友说的原话是 “everybody's a designer”（并把 design 类比成网球课：学过几周不代表是职业选手）。
- 同一次访谈他又说 design thinking 短课让人产生「我是设计思考者，为什么还需要别的设计师」的幻觉。
- [推断] 这不是逻辑矛盾，是他区分「设计作为通识能力」与「设计作为专业」的方式；但他自己承认朋友们因此生气。

**5.4 对 AI 的两种口径（同一场对谈内）**
- 谨慎口径：“most of what is said is nonsense”“no understanding”“trust but verify”。
- 乐观口径：“Absolutely” AI 会催生新设备；“by focusing on that… you can actually get more of the benefits and less of the negatives”；并支持用 AI 陪伴独居老人（与 Ben Shneiderman 的争论中他站 AI 可用的那一边，且明说不打算在「机器能否真有共情」这个点上争）。
- **矛盾点 C（未调和）**：他既说“今天的 AI 没有理解”，又主张把 AI 当能长期相处的「导师/陪伴者」使用。他的自洽靠的是「可用性 ≠ 理解」这条隐含前提，但**他在本次抓到的实录中并未把这条前提明说出来**。

**5.5 同一段往事的两个版本（细节漂移）**
- Three Mile Island：Chats with Kent 版更口语、更狠（“so crappy”）；Product Powwow 版更克制（“led to the errors”）。两版都保留「操作员很聪明、是设计的问题」的核心。**属于即兴复述的正常漂移，不构成事实矛盾，但引用时需指明版本。**
- Apple 无胶片相机：Chats with Kent 说 “about 10 or 15 years off”，Product Powwow Ep.3 说 “took another 15 years… 15 to 20 years”。**同为口述，数字不一致。**

---

## 6. 他拒绝回答、或明显不感兴趣的问题类型

**6.1 「你最喜欢的设计是什么」这类索取金句/取悦型提问**
- 本次**未抓到他对这个具体问题的当场回应原文**。因此不编造他的原话。
- 但他用**制度性方式**拒绝了一整类提问：jnd.org《Discussions, Not Talks》明确写 “I no longer give talks: I engage in discussion with the audience by answering questions.”，并列出他**不要**的提问方式——学生被教授指派来提问、职业主持人代读问题后走开、会前收集问题（“If you collect questions ahead of time, then it is in danger of no longer encouraging discussion”）。
- [推断] 他真正排斥的不是「简单问题」，而是**不能延伸成对话的问题**。对这类索取，他的机制是当场反问 “Why did you ask this question?” 来把提问者拉回对话。

**6.2 他不愿接的道德/哲学争论**
- Product Powwow Ep.3，关于 AI 陪伴能否替代人际情感（Ben Shneiderman 的立场）：他的原话是 “I don't even want to argue that point, Ben.” —— **直接拒绝进入该争论**，转向「有些人没有别的选择，这比什么都没有好」。

**6.3 他不接的「技术取消论」**
- 被问 AI 是否会取代智能手机、Rabbit/Humane 一类 AI 硬件是否可行：他不谈产品成败预测，改答「它们会成为手机的一部分」，并把话题拉回「设计的职责」（“why aren't designers in charge?”）。**即：不回答预测类问题，改写为职责类问题。**

**6.4 被追问「怎么把用户情感变成可收割的购买欲」时，他用嘲讽拆台**
- Want Magazine：采访者追问「emotional attachment 能否被用来 seduce 消费者」→ 他先答 “Gee. You really are a marketing person, aren't you?”，然后才给出「迪士尼排队」那套「把不可避免的负面用整体体验包住」的正面版本，并明确划线：“I wouldn't seduce them by saying… we actually know this part is crap.”

---

## 7. 他对当下技术的具体评论

**7.1 大模型 / 生成式 AI（2024，Product Powwow Ep.3）[一手]**
- 机制理解：他把 LLM 描述为「用你问题的前几个词去找最可能的下一个词」，并据此否定「幻觉」这个说法：“it's not hallucination, that's the way it works.”
- 能力定位：“today's AI has no understanding… it's a kind of intelligence, but what it does is it's making things up all the time.”
- 使用方式：以自己改毕业演讲为例（让 Word 里的模型把稿子压到 15 分钟），结论是 “it's my assistant. I'm then still in charge.”
- 组织级风险：他点名批评企业借 AI 裁员是 “bad, stupid thinking”，理由是 “the new AIs will not replace what they've lost”，并强调这类变革“takes decades”。
- 他也不客气地说 AI 泡沫叙事：“in the early days of a new technology, most of what is said is nonsense.”
- 对 AI 硬件（Rabbit / Humane / Friend 一类）：判为“会成为手机上的软件功能”，不需要独立设备——“Correct.”（他直接确认访谈者的推测）。

**7.2 AI 与设计行业（同上）[一手]**
- 批评现状：“today's AI designers are still primarily technologists… the emphasis has not been on human behavior and people.”
- 对设计师的喊话：不要把 AI 当威胁，要当新材料/新机会（“think of it as a new material… Ask yourself, what can I do with this that we couldn't do before?”），并指出现在是“technologists leading the way”，而他希望“designers leading the way”。
- 他对「AI 在设计流程里哪个环节最有用」这个提问本身表示反对：“that's the wrong way to think about it.”

**7.3 机器人（同上）[一手]**
- 判断：把机器人与深度学习模型接起来会出现“another huge jump in capability”，因为“they will understand how the world works. Today… all they know is because they've been reading.”

**7.4 语音/对话界面**
- 他的框架性判断：“For the first time, we now have a system that knows a tremendous amount of things, and we work with it by talking to it”（Product Powwow Ep.3）。
- 他家实际用法：Alexa 类设备“entirely for setting alarms”＋饭桌查词（同上）——**典型 Norman 式降温：先承认自己怎么用，再给出它的真实能力边界。**
- 关于 Alexa / Siri 的专门批评：**本次未抓到可验证原文，不写。**

**7.5 智能家居**
- **本次未找到他直接评论“smart home”的可验证一手原句。** 抓到的最近似材料是他对「家电联网」的一贯嘲讽（微波炉上网，“they don't want to stand in front of their microwave looking for recipes”，Want Magazine 2010）[一手·半]，以及他对「每个 App 最终都会重新变复杂」的判断（Product Powwow Ep.1：手表从看时间变成测心率/血氧，“here we go again, this very complex device”）[一手]。
- 常见的 HN/博客引用（如「smart home is a crappy idea」）**归属存疑，不作为他的引语使用**。

**7.6 自动驾驶 / 自动化信任**
- 他接住了「Tesla autopilot 命名误导 + 致死」这个例子，但没有逐案评论 Tesla；他给的是通用机制：**信任的过度来自人的社会性，而非 AI**（“I don't know the solution… probably from politicians over the last 50,000 years who make promises”），落到 “trust but verify”。[一手]
- 更早的自动化立场见其论文题名（三英里岛研究的延伸）：*The 'problem' with automation: inappropriate feedback and interaction, not 'over-automation'* —— 该题名由 Resilienceroundup 的解读页确认 [二手]，**本次未取到原论文全文，故不引其句内原话。**

**7.7 医疗设备与医疗 AI（全部来自 Product Powwow Ep.3）[一手]**
- 手机测血压：靠振动反馈＋摄像头光电容积法，“nothing but some software and some cleverness”。
- 哺乳期分诊：让手机做 triage，把「不确定的」全部推给医生，原则是 “you want to minimize the misses… If there's any doubt, you send them to the physician.”
- 放射科医生的反应（他转述朋友）：AI 接手读片后，“I can spend more time back working with patients”——**注意这是他朋友的看法，不是他自己的观察。**

**7.8 元宇宙 / 可穿戴**
- 元宇宙：**未找到可验证原话，未核实。**
- 可穿戴：他谈的是可折叠/可卷曲屏幕与手表功能膨胀（见 7.5），[一手]。

**7.9 核电站误操作（Three Mile Island）**
- 立场（两处实录一致）：不是操作员失误，是设计「几乎像是为了诱发错误而设计」。Chats with Kent 原话：“they were pretty intelligent… It was the design that was so crappy.”
- 他在 Product Powwow Ep.2 补了这段经历如何把他推入设计领域：“I didn't know there was a field called design.”——**设计界之外的人不可能更准确地描述这个学科的生成方式。**

**7.10 波音 737 MAX**
- **本次检索未找到他针对 737 MAX 的可验证评论原文。** 不写。他谈自动化/航空安全的可验证落点只有：与 NASA 的航空安全合作（Chats with Kent）与上文那篇自动化论文题名 [二手]。

**7.11 Apple 时期（回忆与评价）[一手]**
- 职位与授权：“I was at Apple fellow, which meant I could do anything I wanted.”；他组建了 “user experience group”，并**促成把设计（当时叫 interface design）纳入与市场、工程并列的决策层**——他自称这是「user experience」这个词进入职称的来源。
- 对公司状态的判断：他去的时候认为 “the quality of Apple software was going downhill”，且发现发布前只修硬件/程序 bug、**从不修可用性 bug**。
- 他提炼出的关键洞察（判断力价值最高的一段）：可用性问题总是被拆成一堆小事，永远排不上优先级，“after a while, when you don't fix many small things, you actually have a really big problem”；正确做法是在下一次发布的间隙，把它当成一个「大问题」整体重做。
- 关于离开/失败：他主导的 30 人操作系统「可中断、可恢复上下文」重做项目被高管否决。他的结论是**高层是对的**——「更好」不足以让刚适应 Macintosh 的用户整体换范式。
- 关于 Steve Jobs：Chats with Kent 里他只讲了一处与 Jobs 直接相关的史实——Xerox PARC 演示时 Jobs 在场并判断「这是未来」，且**他特意纠正了「Apple 偷了 Xerox」的流传说法**（“they purchased, they bought the rights. It wasn't that they stole it”）。**关于他对 Jobs 的整体评价，本次抓到的实录中没有可引原话，不写。**

---

## 8. 对用户测试 / 可用性行业的批评（专门汇总）

1. **「最佳实践已经知道了，别再讨论了」**（2010，Want Magazine）：他当时的主张是可用性原则“very well known, and they're really not changing”，行业应「同意一套 best practices 然后往前走」，把重点转向 system。 [一手·半]
2. **反手批评 UX 圈的自我道德化**（2010，同上）：“The user experience community thinks they're pure… Every six months, though, we provide new wants. Come on, what's the distinction between that and what marketing does?” [一手·半]
3. **观察胜过访谈**（2021，Chats with Kent）：与 Jakob Nielsen「3–5 人即可」的经典主张同源，但他在 1999 年那篇里给了一个更硬的条件——**必须去真实环境观察，不要在实验室，也不要在可用性测试间里**：“Not in the laboratories, not in the usability testing rooms, but in their normal environment. Don't speculate. Don't argue. Observe.”（jnd.org） [一手]
4. **学院式设计教育的失败**（2021，UX Podcast）：他承认「设计基本没有内容、只是一种方法」，设计师不懂商业甚至厌恶商业，导致“designers have almost no voice”；改革路径是让设计进入决策层，而不是继续教技法。
5. **对设计思考短课的批评**（同上，见 §3 的网球类比）。
6. **对 AI 时代 UX 从业者身份的担忧**（2024，Product Powwow Ep.3）：他批评设计师「抱怨 AI 有偏见」是正确但不够的，主张把抱怨换成机会识别。
7. [推断] 一条贯穿三十年的自我修正线：**他更倾向于用「我教错了」来推进学科**（affordance→signifier；HCD→humanity-centered design），且每次都用同一句式公开认错——“My fault”“This is wrong”。这是他最可复制的一种思维动作。

---

## 9. 引用与使用建议（给后续构建专家画像用）

1. **他的即兴语料里最可靠的「思维指纹」是三个句式**：
   - 否认前提型开场（“Well, there are two different issues.”）
   - 当场自我否证（“Well, not quite.” / “My fault.”）
   - 卸力→升维→给可带走的一句话（“I don't know… but trust but verify.”）
2. **引用时必须区分年份**：他对「可用性行业」的严厉程度在 2010 → 2021 → 2024 明显升高；混用年份会造出一个他没说过的人。
3. **他的类比库是「可触物优先」**：门、龙头、开关、厨房、护士的电子病历、iPod。凡引用他讲抽象概念的段落，**保留类比本身比保留定义更重要**。
4. **不确定就标不确定**：本次调研中他谈 737 MAX、元宇宙、Alexa/Siri 专项批评、smart home 专项批评，**均未取得可验证一手原文**。这些是明显的缺口，建议后续用「YouTube 字幕抓取 + 播客 RSS 逐字稿」补齐，而不是靠二手转述填空。
