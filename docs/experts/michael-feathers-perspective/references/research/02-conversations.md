# 02 长对话与即兴思考：Michael C. Feathers

> 调研 Agent 2（长对话维度）产出 · 数据截至 2026-09
> 标注规则：**[一手]** = Feathers 本人发言的 transcript / 本人署名文字；**[二手]** = 他人总结转述；**[推断]** = 笔者据多条证据的推论。
> **本文只收录我真正 fetch 到内容的页面**。拿不到 transcript 的节目，只登记元数据并明确标注"未获取正文"。

---

## 〇、先纠一个关键前提（重要，会影响后续所有分析）

任务书里假设存在一条「2004 年 legacy code 主张 → 2025 年 **Brutal Refactoring** 主题演讲」的立场转变轨迹。

**这个前提不成立。**

`Brutal Refactoring: More Working Effectively with Legacy Code`（ISBN 978-0-321-79320-1）是 Addison-Wesley 早在 **2011 年前后**就挂出预告的书，**从未出版**：

- InformIT 官方商品页（Addison-Wesley 自营）标注：`Published Dec 31, 2040`、`This product currently is not for sale.`、`Copyright 2041`——这是**占位符日期**，不是真实出版日。页面已被下线，我实测返回 404/占位页。**[一手]**
- Goodreads / AbeBooks / Amazon / Dymocks 等站点仍在展示该书封面与简介，造成"这是一本已存在的书"的假象，实际全部是当年预告文案的镜像。**[二手]**
- 该书确有一份真实目录（17 章：Sensing Variables and Vise、In Vitro Test Harnesses、Runtime Mining with Hypothesis Logging、The Twist Method for Class Extraction 等），但内容从未成书。**[一手]**（转录自 InformIT 预告页，现已不可访）

真正存在的，是 **2011 年 5 月 XP2011 前后的一场四小时同名工作坊**，有人留下了笔记（见 §七）。也就是说：**"Brutal Refactoring" 是 2011 年的工作坊与幽灵书，不是 2025–2026 年的新主题演讲。**

Feathers 2025–2026 的真实新主题是 **"Re-Skilling rather than De-Skilling"**（DDD Europe 2026 / Data Mesh Live 2026 keynote）。**[一手]**

> **结论**：任何把它写成"2025 年新主张"的资料都是**错的**。本报告不采用该叙事，改以真实可查的时间线（§四）替代。

---

## 一、访谈清单（节目 / 日期 / URL / 正文是否拿到）

### A. 拿到完整或大段 transcript 的（可引用原话）

| # | 节目 / 场合 | 日期 | URL | 正文 | 信源级别 |
|---|---|---|---|---|---|
| 1 | **Tech Lead Journal #195** — Working Effectively with Legacy Code and AI Coding Assistant | 2024-10-14 | https://techleadjournal.dev/episodes/195/ | ✅ 全文 transcript（含时间轴） | **[一手]** |
| 2 | **GOTO Book Club** — Working Effectively with Legacy Code（对谈人 Christian Clausen） | 2023-03-20 录制 / 2023-04 发布 / 音频版 2023-05-19 | https://gotopia.tech/episodes/228/working-effectively-with-legacy-code | ✅ 全文 transcript | **[一手]** |
| 3 | **Tech Done Right #11**（Noel Rappin，Table XI）— Avoiding Legacy Code with Michael Feathers | 约 2018（RailsConf 后一周录制） | https://noelrappin.com/audio/tdr-011/transcript | ✅ 全文 transcript | **[一手]** |
| 4 | **Avanscoperta 书面访谈**（Matteo Baglini）— "I don't like complicated code." | 2018-08-21 | https://blog.avanscoperta.it/2018/08/21/i-dont-like-complicated-code-michael-feathers-refactoring-legacy-code-technical-debt/ | ✅ 全文问答 | **[一手]** |

### B. 只有元数据 / 节目摘要，逐字稿未拿到

| # | 节目 / 场合 | 日期 | URL | 状态 |
|---|---|---|---|---|
| 5 | **Hard Boiled Software Ep.001**（Dave Laribee）— "The Skills That Survive AI" | 2026-01-14 | https://newsletter.nerdnoir.com/p/hbs-001-michael-feathers | 官方分节摘要完整，**Substack 内嵌 transcript 需登录，未取得逐字稿** |
| 6 | **Hard Boiled Software** — Engineering Conversations with Michael Feathers | 2025-04-09 | https://newsletter.nerdnoir.com/p/engineering-conversations-with-michael | 只有话题清单 |
| 7 | **DDD Europe 2026 Keynote** — Re-Skilling rather than De-Skilling（Antwerp） | 2026（会议页 2025-12-15 公告） | https://2026.dddeurope.com/program/re-skilling-rather-than-de-skilling | 官方 abstract 全文，**录像未发布** |
| 8 | **Data Mesh Live 2026** — 同题 keynote | 2026-06-11~12 | https://2026.datameshlive.com/program/re-skilling-rather-than-de-skilling | 同 abstract |
| 9 | **DDD Europe 2024 Talk** — Design Discovery in Existing Systems | 2024 | https://youtu.be/bbTYs9c_Dyk | 有录像；**[注意] 我未能取得 YouTube 自动字幕**，仅有两篇二手转述 |
| 10 | **GOTO Chicago 2024 Talk** — Where AI Meets Code | 2024 | https://www.youtube.com/watch?v=g9m3R0NMJ1Y | 有录像，字幕未取得 |
| 11 | **SE Radio Episode 295**（Felienne Hermans 主持）— Michael Feathers on Legacy Code | 2017-06-27 | https://se-radio.net/2017/06/se-radio-episode-295-michael-feathers-on-legacy-code/ | 该节目**不发布逐字稿**，仅 show notes |
| 12 | **InfoQ Podcast** — Looking Back at Working Effectively with Legacy Code | 2021-03-15 | https://www.infoq.com/podcasts/working-effectively-legacy-code/ | InfoQ 全站返回 405 人机验证，**正文未取得** |
| 13 | **Legacy Code Rocks** — Working Effectively with Legacy Code with Michael Feathers | 2021-10-20 | https://stitcher.com/show/legacy-code-rocks/episode/working-effectively-with-legacy-code-with-michael-feathers-49079938 | 仅元数据 |
| 14 | **Book Overflow Ep.15** — Michael Feathers Reflects on WELC（Carter Morgan / Nathan Toups） | 2024-08-01 | https://bookoverflow.io/episodes/ep_z4zkfctg6w53zhxcmzvr7mbd | 仅元数据，正片在 YouTube |
| 15 | **The Mob Mentality Show** — Seeing Sociotechnical Systems with Michael Feathers | 2026 | https://mobmentalityshow.podbean.com/e/seeing-sociotechnical-systems-with-michael-feathers | 站点拒绝直连，**正文未取得** |
| 16 | **.NET Rocks! #397** — Michael Feathers talks Legacy Code | 约 2009 | https://www.dotnetrocks.com/details/0397 | 页面无正文 |
| 17 | **Software Engineering Unlocked** — How to work with legacy code with Michael Feathers | 约 2020 | https://www.software-engineering-unlocked.com/legacy-code-michael-feathers/ | 声称有 transcript，页面实际返回空 body，**未取得**；`/transcript-.../` 变体 404 |
| 18 | **GOTO Berlin 2017 / GOTO Chicago 2013** — Unconditional Code / Software Mechanics / Health and Hygiene in the Modern Code Base | 2013 / 2017 / 2018 | https://gotopia.tech/sessions/260/unconditional-code | 官方 abstract 全文；[一手] 逐字稿未取得 |

> **[存疑] 关于"R7K Research & Conveyance 创始人"**：多篇 2023 年资料显示他同期挂 **Globant Chief Architect** 头衔（GOTO Book Club 原话："I'm a chief architect of Globant, but I also do training and consulting independently as well."）。他自己解释这个头衔**更多是信号性的**，不是真实的直线架构师岗（见 §三·Q11）。**[一手]**

---

## 二、被追问时的思考方式

### 2.1 他最典型的四招

**① 先把问题重新定义成「一个定义/一个词，它服务的目的是什么」**

被问到"legacy code 的定义还成立吗"这类贴身追问时，他几乎从不为定义本身辩护，而是回答"这个定义**想让人做什么**"：

> "I knew at the moment that it really was at odds with traditional definition. … With all these definitions, they're pragmatic in a way because they're used to highlight something that you basically want to change."
> 「我当下就知道它和传统定义冲突。……这些定义都是实用主义的，因为它们被用来**突出某个你想改变的东西**。」
> — Tech Lead Journal #195，2024-10-14 **[一手]**
> https://techleadjournal.dev/episodes/195/

> "But occasionally, people will say, you know, who are you to make the definition of legacy, and it's like, it's just one. There's many pick whichever one you want. Pick the one that helps you."
> 「偶尔有人说，你凭什么定义 legacy？——它就是一个定义而已。有很多个，随便挑。**挑那个对你有用的。**」
> — 同上 **[一手]**

这是他的**核心防御动作**：把"这是否正确"偷换成"这对你有没有用"。注意 GOTO 版本里他还加了一层自我消解——"Who am I to go and actually change the definition of legacy code?"（我凭什么去改 legacy code 的定义？）

**② 用「被追问者自己的经验」反打——把抽象争论降到一个具体故事**

几乎每次遇到"动态语言 vs 静态语言"的死结，他就切故事。GOTO 2023 里 Christian Clausen 说自己在动态语言里缺乏测试纪律，他立刻：

> "Well, can I tell you a little story about this? Because it's a little story I like to repeat."
> 「我能讲个小故事吗？这是我爱反复讲的一个。」
> — GOTO Book Club，2023 **[一手]**

然后讲大学机房、Pascal、隔壁女生屏幕上"array subscript out of bounds"、自己因为从 C 入门所以从没见过。**故事落点总是一句方法论**："starting with unforgiving tools to go and build your discipline"（从苛刻的工具起步能养出纪律），紧接着自嘲式地承认这个建议的危险性："it's a terrible thing to advocate … it's almost like going in and saying, 'Go out there and march in the woods barefoot for 12 hours and you'll be a better person.'"（这建议很糟糕，就像说"去林子里光脚走 12 小时你就会变成更好的人"）。

**③ 承认对方的框架，但加上一个限定条件——不是驳倒，是"fair enough + 但"**

这是他面对不同意见最稳定的句式。Christian Clausen 主张"我不让人读代码，人读代码太慢"，Feathers：

> "Fair enough. I think in the book, I kind of like nodded to that a bit … So, fair. I think it is the quality of the code base rather than our understanding. So I agree."
> 「说得对。书里我其实点到过这一点……所以，对。**我认为那是代码库的质量，而不是我们的理解**。我同意。」
> — GOTO Book Club，2023 **[一手]**

**注意结尾那句**：表面上"我同意"，实际上他**把 Clausen 的"靠信任而非理解"重新装进了自己的"代码质量/可预测性"框架**。先让步，再换坐标轴。

**④ 拒绝给"硬线"，改成给"判断依据"**

被问"什么时候该重写""多大的 class 该重构""多少测试算够"，他的回答结构恒定为：**承认没有阈值 → 给出他实际看的那个变量**。

> "I don't think there's any hard line with it. I think legacy is a subjective judgment that we make quite often based on the difficulty and the hardness to understand something that we're working with."
> 「我不认为有什么硬线。legacy 是我们**经常做出的主观判断**，依据是我们手上这个东西有多难理解。」
> — GOTO Book Club，2023 **[一手]**

> "I remember reading through some research years ago about how big does a class need to be before you actually go and refactor? … Turns out the answer is really **the ones that you touch the most often**. … there's no set point. It's kind of like a subjective sense in that way."
> 「我记得多年前读过一些研究，关于 class 要多大才该重构……结果是：**真正出问题的是你动得最频繁的那些**。……没有设定值，某种程度上是主观感觉。」
> — Tech Lead Journal #195，2024 **[一手]**

### 2.2 他会主动"扣分"自己的立场

一个很少被注意但反复出现的模式：**他会在陈述主张后立刻自曝该主张的失效条件或利益冲突。**

- 讲 characterization test 时先说它"serves like a poor practice"（看起来像坏实践），再讲它为什么在无测试遗留代码里正当。**[一手]**（Tech Lead Journal #195）
- 聊 hotspot 工具 CodeScene，他**主动声明**："I'm actually on the advisory board of CodeScene, right?"（我其实是 CodeScene 顾问委员会的）——然后才继续推荐。**[一手]**（GOTO Book Club）
- 讲用 C 起步养成纪律，主动说"it's a terrible thing to advocate"。

> **[推断]** 这个习惯是他长期做顾问的副产品：他知道自己一推荐，客户就会照做，所以先标边界。对做"可复核交付"的人有参考价值——**先给失效条件，再给建议**。

### 2.3 他会把"提问"本身当成一种技术，并命名它

他把与 AI 的交互、与代码的交互、与团队的交互统一在"提问"这个动作上：

> "To me writing a test is asking a question of the code base. And if you're curious about stuff, then you should be, because you're working on it, writing those tests."
> 「对我来说，**写一个测试就是向代码库提一个问题**。如果你对它有好奇，你就该写——因为你正在动它。」
> — GOTO Book Club，2023（收尾语） **[一手]**

> "The other thing as well is that basically it makes us better question askers."
> 「（和 AI 交互）还有一点：它让我们变成**更好的提问者**。」
> — Tech Lead Journal #195，2024 **[一手]**

---

## 三、即兴类比与金句（原文 + 翻译 + URL）

### Q1 · "Edit and Pray" / "Cover and Modify" —— 他最著名的标签句

> "Changes in a system can be made in two primary ways. I like to call them **Edit and Pray** and **Cover and Modify**. Unfortunately, Edit and Pray is pretty much the industry standard."
> 「系统变更主要有两种做法。我把它们叫做**『改完就祈祷』**和**『先覆盖再改』**。不幸的是，『改完就祈祷』基本就是行业现状。」
> — *Working Effectively with Legacy Code* 第 2 章，转引自 Kohei Yoshida 2007-02-13 引文页 **[一手原文 / 二手转录]**（我 fetch 到的是引文页，非书本身）
> https://kohei.us/2007/02/13/quote-of-the-day/

**用法**：Feathers 用它**不给具体公司/项目点名**，只给一个可传播的名称。这是他最有效的命名式类比——它把一种说不出口的行为变成了可以说出来的东西。

### Q2 · 比"重写 vs 不重写"更狠的一刀："你会有两个问题"

> "The thing with rewrites is that it's great if you have tests. If you have tests, you're really in a golden space. And if you don't, then you're kind of like dealing with the situation of oh, I need to write this thing and I don't understand what it does. And it's like, well, now **you've got two problems**, right?"
> 「重写这件事，有测试就很棒——有测试你就是处在黄金地带。没有测试，你就是在面对『我要写出这个东西，可我根本不懂它在干什么』。那就是，嗯，**你现在有两个问题了**。」
> — Tech Lead Journal #195，2024 **[一手]**
> https://techleadjournal.dev/episodes/195/

**结构**：不是论证重写好坏，而是指出**在没有测试的前提下，重写会让问题数量翻倍**。这是他从"决策"退回到"条件"的典型动作。

### Q3 · Seam = 衣服上的接缝

> "It's kind of like **a seam on your shirt**. It's a natural breaking point where you can actually go and replace one thing with another, replace one behavior with another. It's an opportunistic way of looking at software."
> 「就像**你衬衫上的接缝**。那是一个天然的断点，让你能把一个东西换成另一个，把一种行为换成另一种。这是一种**机会主义地看软件**的方式。」
> — Tech Lead Journal #195，2024 **[一手]**

同段他还自曝这个概念的来历：

> "It was kind of funny, because I thought of this and I actually wrote a chapter in my book that came very close from going and pulling it out, because I thought it was **just a peculiar way that I've been seeing software** and it wouldn't be beneficial to anybody."
> 「挺好笑，我想到这个的时候，**书里那一章差点被我抽掉**——我以为这只是我看软件的一种怪癖，对谁都不会有用。」
> — 同上 **[一手]**

> **[推断]** 这条几乎是最有"人格信息量"的一句：他**不确定自己最有影响的概念是否有价值**。可以当作"他承认不确定"的一手证据（§五）。

### Q4 · Strangler Fig = 佛州七哩桥

> "It's like I used to live in Miami, Florida. And there's like this giant bridge, a seven mile bridge that goes from South Florida to Key West. … what they did is they're kind of like, okay, we've got the old one. We're going to build a new one next to it. And then we're going to go and tear down the old one, right?"
> 「我以前住佛州迈阿密。有一座巨大的桥，七哩桥，从南佛州通到 Key West。……他们的做法是：好，我们有一座旧的，我们在旁边建一座新的，然后**再拆掉旧的**。」
> — Tech Lead Journal #195，2024 **[一手]**

他随即补了跨学科术语："**parallel replacement** is a term that people use in other engineering disciplines."（平行替换——其他工程学科的用语。）

**注意这里的反问互动**：主持人问"seam 是不是就是 strangler fig"，他直接说 **"Not really."** 然后才开始解释。他不为了顺滑而接受一个近似正确的问题。**[一手]**

### Q5 · 技术债 ≈ 熵，而非"借来的债"

> "I think the people that use that term technical debt quite often to go and describe something which is **more like entropy** in a way, that as you make changes, the code tends to get a little bit messed up and tests become harder to deal with over time."
> 「我觉得很多人用『技术债』这个词，描述的其实是**更像熵**的东西——你每改一次，代码就乱一点，测试随着时间越来越难维护。」
> — Tech Done Right #11，约 2018 **[一手]**
> https://noelrappin.com/audio/tdr-011/transcript

紧接 Ward Cunningham 的原始出处，并给出他偏好的表述：

> "I like to put things this way: **it's easier to add code to an existing method or to create a new method.**"
> 「我喜欢这么说：**往已有方法里加代码，或者新建一个方法，哪个更容易（是错的问法）**。」
> — 同上 **[一手]**

### Q6 · 期望决定体验（Zen 故事）

> "The thing which really affects whether we feel good today or not is **what our expectations were**. … our expectations set our experience to a strong degree."
> 「真正影响我们今天感觉好不好的，是**我们原本的期望**。……期望在很强程度上设定了我们的体验。」
> — Tech Lead Journal #195，2024 **[一手]**

**背景故事（他主动讲的）**：早年在一个 startup 做了四五个月，客户拿图表证明质量大幅改善，但他的自我感觉是"我是个失败者"。原因是 dot-com 泡沫破了，"所有人都以为自己要成百万富翁，然后发现自己不会成"。

> **[推断]** 这条对"legacy code 为什么让人痛苦"的解释，比技术解释更接近他的底层模型：**痛苦来自预期错配，不是来自代码本身**。所以他的处方是"cultivate the curiosity / approach it as an adventure"（培养好奇、把它当作一场冒险）。

### Q7 · 衬衫/鸡蛋/森林/考古 —— 他的类比库偏好

同一场访谈里密集出现的类比（均 **[一手]**，Tech Done Right #11 或 GOTO 2023）：

| 类比 | 原话 | 支撑的观点 |
|---|---|---|
| 生物学 / 肺 | "software becomes **like biology** over time … you can look at like a sprawling forest and jungle" | 遗留代码是**自然生长**的结果，不是无能 |
| 考古挖掘 | "It's like **an archaeological dig**. You go back and it's like, 'People invented fire here. Oh no, they discovered the wheel here'" | 一个代码库能承受多少种方向 |
| 打鸡蛋做煎蛋 | "**cracking the eggs to make the omelet** a little bit" | 为可测试性牺牲设计美观是必要成本 |
| 鱼缸 | "it's hard to step outside the bowl and half of the time **we don't know that we're in that particular fishbowl**" | 静态/动态语言阵营互踩 |
| 就诊 | "I used to call this as **'consultants' disease'** … Medical doctors probably walk around just like, 'Oh, everybody is sick and dying.'" | 他见过的代码都是坏的，所以他的样本有偏 |
| 浏览器标签页 | "It's almost like **managing tabs in a browser**. And you have to kind of know when to get rid of them" | 如何管理 AI 会话 |
| 咖啡馆 | "do you care about **coffee** or **caffeine**?"（Starbucks analogy） | 设计 vs 交付（Hard Boiled Software 2026）**[二手]** |
| 巨网 | "imagine you have this **giant net**. If you ask a question, it pulls some of those things towards you" | 提示词如何"拉取"模型的潜在记忆 |
| 高中老师 | "there's one secret for getting an A to this course … **Do your homework**" | AI 用法：小步前进 |

**规律**：他几乎不用软件业内部的比喻（不用"技术债"当比喻用，反而拆解它）。他的类比来源是**物理工程（七哩桥）、生物、日常生活（衬衫、鸡蛋、浏览器标签）**。这是他"跨域取证"习惯的语言表现——他 2024 年自己把这条上升为方法论："**Learn as many domains as you can** … This is almost like how an LLM works in a way."（尽可能多学领域……这某种意义上就像 LLM 的工作原理。）**[一手]**

### Q8 · "复杂性搬到了接线里"

> "…creating many tiny things means **the complexity moves into the wiring**."
> 「……造出一堆小东西，意味着**复杂性搬到了接线里**。」
> — SE Radio #295，2017；引自节目评论区听众 Greg 的转述 **[二手]**（该节目无官方逐字稿，此句为听众记录，可信度打折）
> https://se-radio.net/2017/06/se-radio-episode-295-michael-feathers-on-legacy-code/

Feathers 自己在别处有几乎等价的表述（**[一手]**）：

> "**When we break up big things into small pieces we invariably push the complexity to their interaction.**"
> 「当我们把大东西拆成小块，我们**必然把复杂性推到它们的交互上**。」
> — 引自他 2014 博客 *Microservices Until Macro Complexity*，经 Avanscoperta 访谈引用 **[一手原文 / 二手转引]**

### Q9 · "I don't like complicated code"（但他爱听复杂的音乐）

> "I'm a fan of complicated music and very skilled musicians, which is a bit odd since **I don't like complicated code**."
> 「我是复杂音乐和高超乐手的爱好者——这有点怪，因为**我不喜欢复杂的代码**。」
> — Avanscoperta，2018-08-21 **[一手]**
> https://blog.avanscoperta.it/2018/08/21/i-dont-like-complicated-code-michael-feathers-refactoring-legacy-code-technical-debt/

同场他还推荐了意大利前卫摇滚乐队 **Arti E Mestieri** 的《Gravita 9.81》作为工作坊配乐。**[一手]** —— 这类"非技术细节"是判断他即兴风格的好材料：**他乐于在正式访谈里跑题，并且跑得很有准备。**

### Q10 · "有些痛苦的人不知道自己在痛苦"

> "quite often I run into people that have … not used to working a good code base at all. And so **they're in pain, but they don't know they're in pain**. And that's really a tragic situation to be."
> 「我经常遇到的人……根本没在好代码库里工作过。于是**他们在痛，但他们不知道自己痛**。那真是一种悲剧处境。」
> — Tech Lead Journal #195，2024 **[一手]**

同类表述（**[一手]**，GOTO 2023）：

> "It's always been troubling to me to find developers that are doing very painful things. **They don't think about it as pain, they think about it as normal.**"
> 「一直让我不安的是，看到开发者做极其痛苦的事——**他们不把这当成痛苦，他们把这当成正常**。」

> **[推断]** 这是他关于"如何让组织改变"的全部策略的支点：不是给方案，而是**先让人重新能感到痛**。

### Q11 · "Chief architect 更多是个信号"

> "I think the chief architect is kind of like a bit of a moniker in a way. I think I kind of chose that title within the organization in Globant just because I wanted to highlight to my friends outside of the industry … that **architecture is important**. … it's not a direct architect role in that way. I think it was more of **a signaling thing on my part**."
> 「chief architect 某种意义上只是个名号。我在 Globant 选这个头衔，是为了向组织外的朋友强调**架构是重要的**。……它不是一个直线架构师角色，更多是**我这边的信号动作**。」
> — GOTO Book Club，2023 **[一手]**

**这是他拒绝被头衔定义的一个明确案例**，也是理解"他不接实职、只做前端判断"的旁证。

### Q12 · "先看到『不在场』的东西"

> "**Looking for things that aren't there is very valuable.** … The legacy code book came about because I realized this is a tough problem and **nobody's going to touch it. Nobody wants to touch on this problem.** So it's like, okay, might as well do this."
> 「**寻找『不在场』的东西非常有价值。**……legacy code 那本书之所以存在，是因为我意识到这是个难题，而**没人会碰它，没人想碰这个问题**。所以就想，好吧，那不如我来。」
> — Tech Lead Journal #195 "3 Tech Lead Wisdom"，2024 **[一手]**

> **[推断]** 这条给出他选题的标准动作：**找"所有人都在承受但没人愿意命名"的问题，然后给它起个名字。** "Legacy code = code without tests"、"seam"、"Edit and Pray"、"waywords" 都是同一个模板的产物。

### Q13 · "把这些年份标上"

GOTO 2023 里聊到 AI 未来时，出现了一段罕见的**现场自我记录**：

> Clausen: "When Copilot took over the world tomorrow or in a month."
> Feathers: "**Date stamp here? What's today's date?** Today's the 20th or 21st?"
> Clausen: "20th of March."
> Feathers: "**Date stamps for our options here.**"
> — GOTO Book Club，2023-03-20 录制 **[一手]**

同段还有：

> "I'm supposing that years from now, you or I can take a look back at this and sort of say, 'Ah, those guys, they didn't quite know.' You know. **It's hard to predict the future.**"
> 「我猜很多年以后，你我可以回头看这段说：『啊，那帮人，他们当时也没搞清楚。』**未来很难预测。**」

> ****[推断]** 这可能是整份材料里最有价值的一段。它不是谦辞，是**主动为未来的证伪留时间戳**。做判断的人很少主动给自己的判断打日期。**

---

## 四、立场变化轨迹（真实可查的时间线）

### 4.1 我可以确证的几条变化

**变化 1 · 关注半径：从"如何改遗留代码"扩到"遗留代码如何产生"，再扩到"设计如何被发现"**

| 时间 | 主张 | 证据 |
|---|---|---|
| 2004 | 遗留代码 = 没有测试的代码；书是**技术手册**（24 种依赖打破技法） | 书本身（未直接 fetch，通过多处引用确认）|
| 约 2013–2018 | "**how we get in the situation in the first place**, what are the things that lead to technical debt within organizations and how do we avoid those" | Tech Done Right #11 **[一手]**："I have two other interests that I'm digging into quite a bit now." |
| 2018 | "everything comes down to the socio-technical" + **symbiotic design practice**（共生式设计实践） | 同上 **[一手]** |
| 2023 | "I think my scope **has expanded** … broadened my focus beyond legacy code in the past five or six years" | GOTO Book Club **[一手]** |
| 2024 | "I would add a lot more now about **how legacy code happens** … at an organizational and individual level" | 同上 **[一手]** |

**这是他自己明确承认的第一条立场变化**，而且是**加宽而非推翻**：他没放弃"code without tests"，只是说书里**少了一整个"为什么会这样"的维度**。

**变化 2 · "重写"的表述从谨慎中立 → 明确反对 all-or-nothing**

- 早期（书中立场）：重写风险高，应先建立测试。
- 2024（**[一手]**，Tech Lead Journal #195）：

> "**Doing spot rewrites of a particular thing is really pretty powerful.** And quite often for people, it's like an all-or-nothing proposition, and that's really **a horrible position** to approach these things from."
> 「**对某个具体的东西做局部重写，其实非常有力。**而很多人把它当成全有或全无的选择，那**真是一个糟糕的出发点**。」

同时他把决策权完全推给业务：

> "**a lot of it comes down to business reason rather than technical reason**, because at the end of the day, the technical thing is just kind of like, we can deal with anything. … the business case needs to be made."
> 「**这很大程度上取决于商业理由，而不是技术理由**——说到底，技术上的事，什么都能处理。……商业论证必须做出来。」

**注意矛盾点**：他一边说"技术上什么都能处理"（几乎等于说技术层面没有硬约束），一边强烈反对整体重写。这两句并不自洽——**我保留这个矛盾，不做调和**（见 §八）。

**变化 3 · 对 AI：从"没有立场"到"有立场，但带时间戳"**

| 时间 | 表述 | 来源 |
|---|---|---|
| 2023-03 | "I sense that we're **safe for a little while**" — 同时反复说 "I don't know"、"It's hard to predict the future" | GOTO Book Club **[一手]** |
| 2024-08 | "the results have been **mixed**" + 预言"我们该迎来一波反弹了" | Tech Lead Journal #195 **[一手]** |
| 2024-10 | 有明确立场：AI 用于**低风险区**、**characterization test**、**探索备选方案**是正解；用于"帮你把所有测试写了"是"oh my God, no" | 同上 **[一手]** |
| 2026-01 | "**Availability Bias & Path Dependency**" 被他列为"biggest AI concern"；"the real risk: generating code you don't understand at unprecedented speed" | Hard Boiled Software Ep.001 官方摘要 **[二手]** |
| 2026-06 | 主题升级为 **"Re-Skilling rather than De-Skilling"**（不用"防 AI"，用"重新配置能力"） | DDD Europe 2026 / Data Mesh Live 2026 abstract **[一手]** |

**这是他三年内最明显的一次立场收敛**：2023 年还是"我不知道、我们暂时安全"，2026 年已经变成一套可交付的实践主张（结构化 AI 交互、保护特定的心智习惯）。**他没有说"AI 会取代"或"AI 会失败"，他一直在换问题的坐标轴。**

### 4.2 我可以确证的"没变"

- **"code without tests"**：从 2004 到 2024，一字未改。2024 年他说 "Well, if you don't have any tests, I think it's appropriate for you"（如果你没有测试，我认为这个定义对你适用），但同一段又给出**第二个定义**："I think that's another definition is like **legacy code is code we don't understand**." **[一手]** —— 他**同时持有两个定义并承认**，不做选择。
- **TDD 仍然是他的默认**：2024 年 "I think **TDD is still going to be around**."
- **反对"为指标而指标"**：从 2017 的 Strategic Code Deletion 到 2024 的 Testing Pyramid，态度一致。

### 4.3 常见误读（需要警惕的"伪立场变化"）

| 误读 | 真相 |
|---|---|
| "他在 2025 年提出 Brutal Refactoring" | **Brutal Refactoring 是 2011 年工作坊 + 幽灵书**，ISBN 占位日期 2040，从未出版。**[一手验证]** |
| "他加入了某个 AI 工具公司" | 只确证：CodeScene **顾问委员会**成员（他主动披露）。**[一手]** |
| "他不再做遗留代码了" | 他自己纠正过这个提问："**No, no, no. I mean, people keep writing it all the time, right? So it's like, that's impossible.**" **[一手]** |

---

## 五、他承认的不确定与回避

### 5.1 明确说"我不知道 / 我不确定"

1. **对自己的核心概念不确定**（seam 那一章差点删掉）——见 §三·Q3。**[一手]**
2. **对 AI 的未来不确定**（2023）：

> "I don't know. I sense that we're safe for a little while in a way. … **It's hard to predict the future.**"
> 「我不知道。我的感觉是我们暂时是安全的。……**未来很难预测。**」

3. **对"团队流失率到多少会崩"明确说不知道，并说不确定能否实证**：

> "I think there must be – and **I don't know how we would actually determine empirically** – some turnover rate past which it just gets ridiculous."
> 「我觉得一定存在某个流失率，超过它就会荒谬——**但我不知道我们实际怎么能靠实证确定它**。」
> — Tech Done Right #11 **[一手]**

4. **对"60 人年"这类经验规则不确定**（微服务"一天内可重写"）：

> "I think that's a great goal, **hard to see it in practice though**."
> 「这是个很好的目标，**虽然实践中很难见到**。」

5. **对"哪种语言更好"主动弃权**：

> "I do like to just kind of sidestep the whole thing off, like, is dynamic better or static better? **I like 'em both for different reasons.** … That whole area is **hanging on my part** in a way."
> 「我倾向于把『动态好还是静态好』整个绕过去。**我出于不同理由喜欢两者。**……整个那个领域我算是**悬置的**。」
> — GOTO Book Club，2023 **[一手]**

6. **对"组织应该怎么配"只给力而不给答案**（对 Team Topologies 的批评）：

> "I think if I had any little criticism at all, it's kind of like it arrives at a very normative … 'this is the way you should organize.' … But **I always tend to want people to go and think about what are the forces that lead you into trouble**, and how can you actually sort of move them in a way where basically, the problem disappears."
> 「要说有一点批评，就是它得出一个非常规范性的结论……『你就该这样组织』。但我**总是希望人们去想：把你带进麻烦的那些力是什么**，你怎么移动它们，让问题干脆消失。」
> — GOTO Book Club，2023 **[一手]**

   **注意**：他在这里又做了一次"换坐标轴"——把"应该怎么组织"换成"力在哪里"。这是同一招的第二十次出现。

### 5.2 明确回避的

**① 拒绝讲最坏的代码（NDA）**：

> Noel: "I'm trying to decide whether to give into the temptation to ask you what the worst thing you've ever seen is or to not."
> Michael: "**I can't. Because of NDA**, I can't really sort of broadcast the domain but **I've seen some crazy things**."
> — Tech Done Right #11 **[一手]**

  他在别处也沿用同一策略："I won't mention the countries involved because it might betray the client in a way"（我不提涉及的国家，因为那可能会暴露客户）。

**② 拒绝为"哪个才是真 legacy 定义"背书**：见 §二·2.1① —— "who are you to make the definition" 的回应是**退到"定义是工具"**，等于不回答本体论问题。

**③ 对 SOLID 的命名权 / 细节，在我拿到的全部一手 transcript 中：【未找到】**
本报告覆盖的 4 份完整 transcript（2018 / 2023 / 2024）中，**没有任何一处提到 SOLID**。任何关于他"SOLID 命名者"的第一人称叙述，需要另找信源，**不能从本批材料推断**。**[未找到]**

**④ 对 mock / mockist 的明确立场：在我拿到的一手 transcript 中【未找到】**
搜索命中的相关页面（InfoQ 2009 *Classic versus Mockist TDD*、Jeremy Miller 2021 等）**都不是 Feathers 本人的发言**，他的态度只能从间接记录推断（他讲 stub、讲"不改变行为时才写 characterization test"），**不足以断言**。任务书中"他对 mock 的态度"这一项标记为 **未找到**，不编。

**⑤ 拒绝把话说成"测试越多越好"**——这是他主动切断的一个追问方向：

> "I think we can **overly valorize the tests** sometimes and think, 'Oh my God, we can't get rid of any tests at all.' Then you're in a situation where you're just so scared that you can't change anything."
> 「我觉得我们有时**把测试过度神圣化**了——『天哪，一个测试都不能删』。那样你就落到一个被吓到什么都改不了的状态。」
> — GOTO Book Club，2023 **[一手]**

---

## 六、关于 AI / LLM / 现代语言的观点

> 这是 2023 年后他公开表达最密集、也最容易被误读的领域。以下按主题归类，**保留他前后不一致之处**。

### 6.1 他对 AI 的三条硬判断

**判断 1 · 幻觉问题存在，但不构成放弃的理由**

> "The thing that people are most concerned with right now is the hallucination problem … **And I want to take that as a given.** It's going to get better over time, but I think the thing that's important is really to go and understand that **if you can't trust what's being generated, there still is value there**."
> 「现在大家最担心的是幻觉问题……**我倾向于把它当作既定条件接受**。它会随时间变好，但重要的是：**即使你不能信任生成物，那里仍然有价值。**」
> — Tech Lead Journal #195，2024 **[一手]**

**判断 2 · 最大的风险不是"AI 写错代码"，而是"接受第一个答案"**

> "**One of the sections I have in the book talks about the loss potential if basically you ask a question of AI and you accept the first answer.** Because quite often, you just ask this prompt again, you get a different answer and a different answer and a different answer. And I find that so valuable because it sort of **opens the possibility space**."
> 「书里有一节专门讲：**如果你问 AI 一个问题，然后接受第一个答案，你会损失什么。**因为经常你重问同一个提示，会得到不同的答案、不同的答案、不同的答案。我觉得这极有价值，因为它**打开了可能性空间**。」
> — 同上 **[一手]**

  2026-01 他把这条升格为"**biggest AI concern**"，命名为 **Availability Bias & Path Dependency**（可得性偏差 + 路径依赖）。**[二手]**（Hard Boiled Software 官方摘要）
> https://newsletter.nerdnoir.com/p/hbs-001-michael-feathers

**判断 3 · 责任不可能外包给模型**

> "At the end of the day, in the legal system, you can't go and say, oh, the algorithm did it. It's like, no! A person who works at a company did this. At the end of the day, **we are responsible for what we do**. That's really important … **there has to be somebody in the seat of responsibility.** You have to understand what you're creating as well."
> 「说到底，在法律体系里你不能说『是算法干的』。不行——是公司里的某个人干的。**我们要为自己做的事负责**。……**必须有人在责任席上。** 你也必须理解自己在创造什么。」
> — Tech Lead Journal #195，2024 **[一手]**

### 6.2 他实际怎么用 AI（一手工作流细节）

| 用法 | 原话 | 我的注解 |
|---|---|---|
| **Lensing（透镜法）** | "you drop in a giant area of code and you're kind of like, this giant class that I have here, **what responsibilities does it have?** … And usually, it's kind of like eh, so-so. And you start to interrogate" | 命名了他自己的交互模式 |
| **追问收敛** | "you gave me 10 responsibilities. **Just give me six.** … by scaling back and forth with this, you start to go and understand where **perception can change of a class** in terms of what the responsibilities are, **depending upon the level that you're looking at it**" | 用 AI 做"多分辨率观察"，比单次总结更有信息量 |
| **要三个备选** | "let me go ahead and ask for **three different ways** of doing this and just compare them side by side … quite often get ideas I wouldn't have gotten otherwise" | 对应判断 2 |
| **低风险优先** | "It's really for the areas which are **low risk**. … developing boilerplate code. It's like creating a Chrome extension. … where you have some confidence that somebody's going to find a problem **before it causes loss of life or money**" | 明确的边界语言：life / money |
| **Shell 脚本是最佳场景** | "**shell is perfect for AI generation** in the sense that you're basically building from these bigger components, the commands, and it's **very easy to find out exactly what a command does**" | 判据是"可立即验证" |
| **Characterization test 例外** | "But for **characterization testing**, it's really kind of powerful, because … **if you're not changing the code, it is a document of what the behavior currently is.** And if they pass, then they are actually showing you real behavior" | 这是他认为 AI 写测试唯一正当的场景 |
| **测试可抛弃** | "The thing we have to get used to with this is the idea that **tests can be disposable and temporary** sometimes, and just use them to get insight or to facilitate change." | **这是一条不太被引用的立场**，与"测试是资产"的通行说法有张力 |
| **Waywords（命名提示词）** | "Suppose that you're asking the tool to go and refactor something … you probably want to **name this thing**. … it's just like **introducing a method name or a variable**" | 他自创术语；核心是"给反复出现的提示词命名" |
| **会话管理像标签页** | "It's almost like managing tabs in a browser. And you have to kind of know when to get rid of them" | |

**其中"Waywords"和"pidgin specification"是他正在写的新书里的原创新词**：

> "In the book I'm writing right now, I basically talk about something I call **pidgin specification**. A pidgin language is a language that people from different languages adopt. … I can write like a test case using just a very brief `test:` … `this asserts that` … And it just gives it to me [in JUnit]. **And sometimes it's wrong**, but I'm dealing with something small enough I can actually see what the results are."
> — Tech Lead Journal #195，2024 **[一手]**

### 6.3 他对 AI 写测试的"人格分裂"

**强烈反对**：

> "An area that I think is really kind of interesting is the entire thing about going and writing tests. Because I was kind of shocked in the beginning to see **vendors basically go and say, hey, we're going to write all your tests for you.** As a TDD guy, you're looking at this and you're saying, **oh my God, no**, right?"
> — Tech Lead Journal #195，2024 **[一手]**

**同段又大力推荐**：

> "But for characterization testing, it's really kind of powerful … And you can go and have tests written for this. **And if they pass, then they are actually showing you real behavior.** And so that's useful."
> — 同上 **[一手]**

> **[推断] 矛盾的解法在他自己的定义里，但他没明说**：他区分的是"**测试是不是用来驱动理解的**"。测试先行（驱动设计）→ AI 代劳等于抽掉思考；测试后写（给现状建档）→ AI 代劳只是省打字。这是本报告里**最有解释力、也最容易被误引的一条**。

### 6.4 关于"AI 与遗留代码"的因果方向

他给了一个反直觉的担心——**AI 会加速遗留代码的产生**：

> "There's the GitClear report. One of the things that they were mentioning there is it seems like there's **a lot more churn of code**. Code's being put in public repos much faster, but there's much more churn and change after it has been."
> "**It's easier to write code. And it's a bit hard to understand it.**"
> — 同上 **[一手]**

2026-01 版本（**[二手]**，官方摘要）："The real risk: **generating code you don't understand at unprecedented speed**" + "**Metrics creep**—lines of code (or token usage) returning; **Goodhart's Law** incoming."

> **[推断]** 这是他最连贯的一条线：**AI 直接攻击的正是他 2004 年那个定义的支点（理解）。** 他 2023 年就说过 "legacy code is code we don't understand"，而 AI 的生产方式**批量制造"不理解"**。从这条线看，"Re-Skilling rather than De-Skilling" 不是话题转向，是原命题的延续。

### 6.5 关于现代语言（JS / TS / Python / 动态 vs 静态）

**只有一条可引用的直接表述（2023，[一手]）**：

> "What's kind of funny for me is quite often, working with people on dynamically-typed languages. **I actually prefer dynamically-typed languages in many circumstances**, but it's also like there's this thing of, like, **you have way more affordances with compiled languages**, different ways of interrogating the code base. So **it's a trade-off**."
> — GOTO Book Club，2023 **[一手]**

**关于 JS / TS / Python 具体生态：【未找到】**
本批材料中他**没有**对 JavaScript、TypeScript 或 Python 这三门语言发表过任何具体评价。相关讨论全部停留在"动态 vs 静态"的抽象层面（且他明确对此"悬置"）。

> **[推断]** 可确证的只有一点：他**在动态语言里会改用"探针"而非靠类型系统**——
> "I find in dynamically-typed languages, I'm **more often putting probes in the code** to understand what's happening with it, as opposed to going and just relying upon certain constraints that are forced by the type system."
> — Tech Done Right #11，约 2018 **[一手]**

### 6.6 关于"程序员会被取代吗"

> "Many developers now have had enough experience with AI that they realize **it's not going to replace them anytime soon**."
> "This guy basically made the case ages ago that we just need to **see ourselves as problem solvers**. And programming is one tool to solve a problem. **Sometimes we can solve problems without writing code at all.** And that's great!"
> — Tech Lead Journal #195，2024 **[一手]**

2026-01 他把这条命名为 "**Evolution from 'problem solvers' to 'problem articulators'**"（从"问题解决者"到"问题表述者"）。**[二手]**

**关于"初级开发者被取代"他持否定态度**：2026-01 摘要明确写 "**Junior dev displacement may be overstated**"，并引 Dan Shipper 的 senior/junior + agent 配对模型。**[二手]**

### 6.7 关于测试覆盖率数字（重点项）

**我拿到的直接证据有限，且是"转述"而非原话**：

> "Test coverage can be misleading. Ask yourself: **What is your test coverage for the code that is used in production?**"
> "There is not only unused code but also **code that gets executed but has no influence at the result at all**."
> — Markus（feststelltaste）对 Feathers 2017 InfoQ 演讲 *Strategic Code Deletion* 的笔记 **[二手]**
> https://www.feststelltaste.de/video-michael-feathers-strategic-code-deletion/

同一笔记记录的他的处方：**"Don't rewrite code because you don't understand the code anymore. Identify the main line of execution for most use cases and improve the code base by creating a Strangler Application."** **[二手]**

**他本人关于覆盖率的一手表述（间接）**：Tech Done Right #11 中他把话题引向**生产环境覆盖率**而非测试覆盖率——他为此做了一个叫 **Scythe** 的工具（在代码里放标记调用，记录某段代码最近一次被执行是什么时候），

> "it doesn't necessarily tell you that an area code is dead but it gives you a hint about whether it might be"
> "I think that we really need more, in the way of **coverage in production** to be able to make assessments like that."
> — **[一手]**

> **[存疑] 明确结论**：我没有拿到他直接说"测试覆盖率百分比没有意义/是坏指标"的一手原话。可确证的只有两点：(a) 他关心的是**生产环境实际执行覆盖率**；(b) 他对 characterization test 的定位是"**记录行为**，不是正确性"（"The goal of these tests is to document behavior, not the correctness of the code" —— **[二手]**，feststelltaste 笔记）。**不要把他写成"反覆盖率"派。**

### 6.8 关于 TDD 教条（重点项）

这是本批材料里他**最连贯、最反复、最不留情**的一条立场。核心是一句话：

> "I think that in the way that TDD kind of spread across the industry, it's like **some people just basically took it to be, like, okay, you write one unit test harness for each class of your system and you're good.** … but then like BDD came along … Particularly when you look at what Kent has done … **I like Ian Cooper's take on this as well. You start out growing tests from a particular point, and then you're refactoring outward.** … I think that's the key message that needs to get across to people **rather than this one-to-one mapping of test classes to production classes**. I think that's a way where people kind of **paint themselves into a corner**."
> — GOTO Book Club，2023 **[一手]**

**他给这个教条起了一个名字**：**"one-to-one mapping of test classes to production classes"**（测试类与生产类一一对应）。这是**对整个行业 TDD 实践普及方式的直接批评**，而且是对"教条"层面的批评，不是技术细节。

**他还反对把测试神圣化**（§5.2⑤），并明确说自己会：

> "sometimes, I think **I feel much more comfortable than many people putting some of the tests in the parking lot for a minute** … I'm going to go ahead and do a structural refactoring, but I know the tests aren't gonna cover it completely. **If I can develop confidence in another way** to do that refactoring, then I'll run the tests and find out … **And I'll rewrite tests that will cover the new structure that I have.**"
> 「有时候，**我比很多人更能接受把一部分测试先扔到停车场**……我要做结构性重构，我知道测试覆盖不全。**如果我能在别的地方获得信心**，那就先重构，跑测试看结果，然后**重写适配新结构的测试**。」
> — GOTO Book Club，2023 **[一手]**

> **[推断]** 这段是"反 TDD 教条"立场最有力的一段一手证据，通常被引用得很少。注意他说"在别的地方获得信心"——不是"不要测试"，是**测试不是唯一的信心来源**（他同时把"编译器/类型系统"和"故意引入错误来探索"也算作信心来源）。

**TDD 的长期判断（2024）**：**"I think TDD is still going to be around."** **[一手]**

---

## 七、演讲与工作坊（Legacy Code Retreat 等）

### 7.1 已确证的演讲 / 工作坊时间线

| 时间 | 场合 | 题目 | 状态 |
|---|---|---|---|
| 2013-10 | GOTO Chicago | **Software Mechanics**；工作坊 **Health and Hygiene in the Modern Code Base** | 官网页面存在 |
| 2017-05 | 独立演讲（InfoQ 发布） | **Strategic Code Deletion** | 演讲视频存在；我取到的是他人笔记 |
| 2017 | GOTO Berlin | **Unconditional Code** | 官网 abstract 全文 **[一手]** |
| 2018-05 | GOTO Chicago | **Unconditional Code** | YouTube 录像存在 |
| 约 2007/2009 | — | **The Deep Synergy of Testability and Good Design**（他自称"我最喜欢的演讲之一"） | 他本人在 2023 访谈中提及 **[一手]**；YouTube 有 2013 版（youtu.be/4cVZvoFGJTU） |
| 2014 | itakeunconf | **Moving Toward Symbiotic Design** | 页面存在，正文未取 |
| 2024 | DDD Europe | **Design Discovery in Existing Systems** | youtu.be/bbTYs9c_Dyk |
| 2024 | GOTO Chicago | **Where AI Meets Code** | youtube.com/watch?v=g9m3R0NMJ1Y |
| 2026-06-09 | DDD Europe 2026（Antwerp） | **Masterclass: Forces in Software — Understanding the Physics of Software Evolution**（一天工作坊） | 公告确认 **[一手]** |
| 2026 | DDD Europe 2026 + Data Mesh Live 2026 | **Keynote: Re-Skilling rather than De-Skilling**（50 min） | abstract 全文 **[一手]** |

> **[未找到] "Legacy Code Retreat"**：本批材料中**没有**查到 Feathers 本人主办或署名的 Legacy Code Retreat 活动。（Legacy Code Retreat 通常与 **Llewellyn Falco / JB Rainsberger** 等人关联；Feathers 2024 年访谈里提到 Llewellyn Falco 做的 AI-测试生成视频，但那是技术引用，不是活动主办。）**不要把他写成 Legacy Code Retreat 的主办者。**

### 7.2 "Re-Skilling rather than De-Skilling" 官方 abstract（2026，全文，[一手]）

> "Every wave of automation triggers the same fear: that the tools we build to assist us will, in time, make us less capable. AI-assisted development has brought this worry to the forefront. **Are we outsourcing the thinking and neglecting the learning? Are we creating systems we can't understand or couldn't have developed ourselves?**
>
> **De-skilling, however, is not a law of nature. It is a consequence of how we choose to work.** There are capabilities that become more valuable when generation is cheap — and there are **habits of mind we must deliberately protect**.
>
> In this keynote, Michael Feathers will talk about **what atrophies when we are not paying attention, what genuinely strengthens, and where the real leverage now lies.** Expect concrete practices you can take back to your team — ways to structure AI interactions and day-to-day work so that we grow sharper alongside our tools rather than duller behind them."
> — https://2026.dddeurope.com/program/re-skilling-rather-than-de-skilling

**注意措辞**：这是本批材料里他**唯一一次**使用近乎规范性的祈使句（"habits of mind we must deliberately protect"）。其余所有场合他都在避免"应该"。**[推断]**：这可能只是 keynote 类型的语言要求，也可能是立场的真实收紧——**从"我不替你做判断"到"有些能力必须主动保护"**。存疑，不下结论。

### 7.3 "Unconditional Code" / "Forces in Software" —— 两条平行的长期兴趣线

**Unconditional Code**（GOTO Berlin 2017 abstract，**[一手]**）：

> "Many systems are full of error checks and conditional logic. They introduce **discontinuities that make reasoning difficult**. … **Often by changing design and revisiting requirements we can make various error cases impossible**, and make code and architecture simpler as well as more robust."
> — https://gotopia.tech/sessions/260/unconditional-code

**这条线 2018 年时他说是一本书**：

> "I've been spending a lot of time looking into **error handling** and **the issue of excessive checking in code**. I've been writing a book about this. **The working title is 'Unconditional Code.' My plan is for it to be out next year.**"
> — Avanscoperta，2018-08-21 **[一手]**

> **[推断]**"明年出"= 2019。**截至 2026-09 我没有找到该书存在的证据。** 与他 2023 年说"我会写 legacy code 的续作"一样，这是一条**反复宣布但未落地**的线（与 Brutal Refactoring 同构）。**对蒸馏的意义：不要把"Unconditional Code"当成一本可引用的书。**
> 他的解释是**转向了更宽的主题**："what I'm discovering was a broader topic than that … what it takes to make software simpler in terms of complexity."（Tech Done Right #11，约 2018）**[一手]**

**Forces in Software**（DDD Academy 2026 一天工作坊，**[一手]**）：

> "he will explore **the fundamental forces that determine how software changes over time and why systems take the forms they do**. … practical strategies for steering long-lived systems toward **sustainable growth rather than inevitable decay**."
> — https://2026.dddeurope.com/blog/announce-michael-feathers

> **[推断]** "Forces"这个框架与他 2023 年批评 Team Topologies 时用的词完全一致（"think about what are **the forces** that lead you into trouble"）。这条线有连续性，可以视为他当前**统一框架**的雏形。

### 7.4 2011 Brutal Refactoring 工作坊的实际内容（二手笔记）

来源：Patrick Kua（时任 ThoughtWorks）2011-05-11 四小时工作坊笔记。**[二手]**
https://thekua.com/atwork/2011/05/notes-from-michael-feathers-brutal-refactoring/

可提取的要点（**注意：全部为笔记作者转述，非原话**）：

- 开场命题：**Clean Code vs Understandable Code**，二者都有成本；"we can live with understandable code, and there is a cost to having Clean Code"
- 他问的问题：**"Is it easier for people to add code to existing place than to create a new method/class/etc? Why?"**
- "We shouldn't be surprised by very large methods. **incentives are set up wrongly.** Though not sure what we can do about it."
- "It's the result of the **system between us and the code**."（不是"坏程序员"，是系统效应）
- 可视化取向：**"Code has a particular shape."**
- 四个技术模块：**Feature Clustering** / **Rapid Scratch Refactoring** / **Twisting Classes** / 严格的命令查询分离（CQS）
- 他对 scratch refactoring 的后悔：**"A bit of regret not focusing more of it in his book."**（后悔书里这部分写得不够）
- 他偏好在**纯文本编辑器**里做 scratch refactoring，因为**语法高亮会分散注意力**
- 两条他的推文（笔记作者保存）："**Branches often biggest impediment to refactoring in large orgs.**"；"**Narrowing scopes: often we gain leverage by moving temporary variables closer to their points of first use.**"

> **交叉验证**：13 年后（2023 GOTO）他仍在推 scratch refactoring，且给出了几乎相同的操作细节：

> "there's a small thing I mentioned in the book that **I wish I'd written about more.** … take the code, throw it into a file, like just a straight text file as opposed to like your program language file **so you don't have all the markup about possible errors** and stuff like that. And just start renaming things and moving things around. **Don't worry about breaking things because you're never gonna check it in.** … **That is so counter to our intuition as developers** … but when you know you're not gonna check in, things just by going in and being kind of hands-on, **you start to gain much more insight**."
> — GOTO Book Club，2023 **[一手]**

**[推断]** 这是一个**罕见的三源交叉验证点**（2011 工作坊笔记 + 2004 书 + 2023 访谈），且他本人在 2011 和 2023 两次都表达了"书里这块写得不够"的遗憾。**这是可以当作他"最想被记住但最被忽略"的技术主张。**

---

## 八、矛盾与存疑（保留，不调和）

### 8.1 需要保留的硬矛盾

**矛盾 1 · "技术上什么都能处理" vs "强烈反对整体重写"**

> "the technical thing is just kind of like, **we can deal with anything**."（Tech Lead Journal #195，2024）
> "Doing spot rewrites … is really pretty powerful. And quite often for people, it's like an all-or-nothing proposition, and that's really **a horrible position**."（同场）

**同一个回答里的两句话。** 如果技术上"什么都能处理"，那就没有技术理由反对整体重写；他反对的理由（"你会变成两个问题"）其实**恰恰是技术理由**。**我不做调和**——这可能是即兴口语的松散，也可能是他对"技术万能"的口头让步其实是修辞性的。

**矛盾 2 · "我不替人做判断" vs 2024 年后给出大量规范性建议**

他 2011–2018 年的风格是"给出力与判断依据，你自己拍"（"I always tend to want people to go and think about what are the forces"）。2024 年起，尤其 2026 年的 keynote，语气明显转为祈使："**habits of mind we must deliberately protect**"、"**there has to be somebody in the seat of responsibility**"、"**don't even think about doing that**"（关于让 AI 写全部测试时的"oh my God, no"）。

**[推断]** 这可能只是"访谈 vs keynote"的语域差异，也可能是他真的认为 AI 带来了**不能只靠判断力兜底**的东西。**证据不足，标 [存疑]。**

**矛盾 3 · 对 AI 的乐观程度在同期材料中不一致**

- 2024-10（Tech Lead Journal）：整体偏务实/中立，"results have been mixed"，强调局限与风险。
- 2026-01（Hard Boiled Software）：官方摘要的措辞明显更警惕——"The **real risk**: generating code you don't understand at unprecedented speed"、"**Metrics creep** … **Goodhart's Law** incoming"。
- 2026-06（DDD keynote）：又回到"这不是自然规律，是我们的选择"的建设性口吻。

我需要说明：**2026-01 那条是二手摘要**，我拿不到逐字稿，措辞可能被节目方强化了。**不能据此断言他在两年内"变悲观了"。** 标 [存疑]。

**矛盾 4 · 测试：资产 vs 可抛弃**

> "tests can be **disposable and temporary** sometimes"（Tech Lead Journal #195，2024，[一手]）
> "I think we can **overly valorize the tests**"（GOTO 2023，[一手]）

vs 他整个职业生涯的核心主张是"**code without tests = legacy code**"，即测试是代码能不能被安全修改的**决定性条件**。

**[推断]** 可调和的版本是：他区分"**作为理解工具的测试**"（可抛）和"**作为安全网的测试**"（不可抛）。但**他没有在任何一份我拿到的一手材料里做过这个区分**。所以这条留在"矛盾"，只把上面那句作为**我的推断**标注，不作为他的观点。

### 8.2 明确标注的存疑项

| 事项 | 状态 |
|---|---|
| 他为 SOLID 命名 | 本批 4 份完整一手 transcript 中 **0 次提到 SOLID**。**未找到**他本人的第一人称叙述 |
| 他对 mock / mockist TDD 的立场 | **未找到**任何他本人的发言。相关搜索结果全是别人的文章 |
| 他对测试覆盖率百分比的具体态度 | 只有间接证据（转述）。**不能写成"反覆盖率"** |
| 他对 JS / TS / Python 的具体看法 | **未找到**。只有"动态 vs 静态"的抽象讨论，且他对此悬置 |
| "Legacy Code Retreat" | **未找到**他与该活动的关联 |
| Brutal Refactoring 是"2025 年主题" | **已证伪**（2011 工作坊 + 幽灵书，ISBN 占位日期 2040） |
| Unconditional Code 一书 | 2018 年他说"明年出"；**截至 2026-09 未见出版证据** |
| AI Assisted Programming 一书 | 2024 年说 LeanPub WIP；**未确证已出版** |
| R7K 的"创始人"身份 vs Globant Chief Architect | 两者同时存在，他自称后者是"信号性"头衔。**[一手]** |
| 2011 工作坊笔记中的一切 | 全部为**[二手]**转述，**不可当作原话引用** |

### 8.3 我拿不到但影响判断的空白

1. **YouTube 自动字幕全线拿不到**（403 / 反爬）。因此 DDD Europe 2024 *Design Discovery*、GOTO 2024 *Where AI Meets Code*、GOTO 2018 *Unconditional Code* 的**逐字稿都在，但我没拿到**。这是本报告最大的空白——**2024 年那两场是他 AI 立场的核心现场**，我只能依赖 Tech Lead Journal #195（同期）间接覆盖。
2. **InfoQ 全站 405**（人机验证），2021 年那期"回头看 WELC"的重要内容缺失。
3. **Substack 直连失败**（域名解析到非公网 IP）。他自己的博客/Newsletter 是**最重要的一手源**，但本报告对他本人文字的引用**全部来自二手转引**（Avanscoperta 引他的 2014 博客、feststelltaste 引他的 2017 演讲）。**这是本报告最弱的环节。**
4. **SE Radio #295 无官方逐字稿**，唯一的引文来自节目评论区的听众。
5. **Legacy Code Rocks（2021）与 Software Engineering Unlocked（约 2020）**页面存在但正文取不到。

---

## 九、来源清单

### 一手（Feathers 本人发言的 transcript / 本人署名文字）

1. https://techleadjournal.dev/episodes/195/ — Tech Lead Journal #195，2024-10-14，**全文逐字稿**（本报告最主要来源）
2. https://gotopia.tech/episodes/228/working-effectively-with-legacy-code — GOTO Book Club，2023-03-20 录制，**全文逐字稿**
3. https://noelrappin.com/audio/tdr-011/transcript — Tech Done Right #11，约 2018，**全文逐字稿**
4. https://blog.avanscoperta.it/2018/08/21/i-dont-like-complicated-code-michael-feathers-refactoring-legacy-code-technical-debt/ — Avanscoperta 书面访谈，2018-08-21，**全文问答**
5. https://castro.fm/episode/XRtpuA — GOTO Book Club 音频版镜像，2023-05-19（含同一逐字稿）
6. https://2026.dddeurope.com/program/re-skilling-rather-than-de-skilling — DDD Europe 2026 keynote 官方 abstract
7. https://2026.datameshlive.com/program/re-skilling-rather-than-de-skilling — Data Mesh Live 2026 同题 keynote
8. https://2026.dddeurope.com/blog/announce-michael-feathers — DDD Europe 2026 公告（含 2024 演讲回顾 + 2026 Masterclass）
9. https://gotopia.tech/sessions/260/unconditional-code — GOTO Berlin 2017 *Unconditional Code* abstract
10. https://www.informit.com/store/brutal-refactoring-more-working-effectively-with-legacy-9780321793201 — Addison-Wesley 官方页（**Brutal Refactoring 未出版 + 完整目录**）
11. https://kohei.us/2007/02/13/quote-of-the-day/ — *Working Effectively with Legacy Code* 第 2 章 "Edit and Pray" 原文引用页

### 二手（他人总结转述）

12. https://newsletter.nerdnoir.com/p/hbs-001-michael-feathers — Hard Boiled Software Ep.001，2026-01-14，**官方分节摘要（逐字稿需登录）**
13. https://newsletter.nerdnoir.com/p/engineering-conversations-with-michael — Hard Boiled Software，2025-04-09，话题清单
14. https://thekua.com/atwork/2011/05/notes-from-michael-feathers-brutal-refactoring/ — Patrick Kua，2011 Brutal Refactoring 四小时工作坊笔记
15. https://www.feststelltaste.de/video-michael-feathers-strategic-code-deletion/ — Markus，2017 *Strategic Code Deletion* 演讲笔记
16. https://se-radio.net/2017/06/se-radio-episode-295-michael-feathers-on-legacy-code/ — SE Radio #295 show notes（**含评论区听众转述的一句引文**）
17. https://www.goodreads.com/book/show/25544117-brutal-refactoring — Brutal Refactoring 预告文案镜像（用于交叉确认该书状态）
18. https://www.abebooks.com/9780321793201/Brutal-Refactoring-Working-Effectively-Legacy-032179320X/plp — 同上

### 仅用于定位/元数据（未取得正文）

19. https://www.infoq.com/podcasts/working-effectively-legacy-code/ — InfoQ Podcast，2021-03-15（**405 人机验证**）
20. https://bookoverflow.io/episodes/ep_z4zkfctg6w53zhxcmzvr7mbd — Book Overflow Ep.15，2024-08-01
21. https://www.dotnetrocks.com/details/0397 — .NET Rocks! #397
22. https://www.software-engineering-unlocked.com/legacy-code-michael-feathers/ — Software Engineering Unlocked（**正文空**）
23. https://stitcher.com/show/legacy-code-rocks/episode/working-effectively-with-legacy-code-with-michael-feathers-49079938 — Legacy Code Rocks，2021-10-20
24. https://mobmentalityshow.podbean.com/e/seeing-sociotechnical-systems-with-michael-feathers — The Mob Mentality Show，2026（**拒绝直连**）
25. https://gotoradio.buzzsprout.com / https://gotopia.tech/bookclub — GOTO 播客索引
26. https://youtu.be/bbTYs9c_Dyk — DDD Europe 2024 *Design Discovery in Existing Systems*（**字幕未取得**）
27. https://www.youtube.com/watch?v=g9m3R0NMJ1Y — GOTO Chicago 2024 *Where AI Meets Code*（**字幕未取得**）
28. https://youtu.be/AnZ0uTOerUI — GOTO 2018 *Unconditional Code*（**字幕未取得**）
29. https://youtube.com/watch?v=4cVZvoFGJTU — *The Deep Synergy of Testability and Good Design*（2013 版）

### 提及但未采用的域名

- 知乎、微信公众号、百度百科 —— **未使用**（按黑名单要求）
- medium.com、dev.to、linkedin.com、facebook.com 等 UGC 平台 —— 出现在搜索结果中但**未采用**

---

## 十、给下游蒸馏的三条提醒

1. **不要相信"Brutal Refactoring"叙事。** 它是 2011 年的工作坊和一本从未出版的书。任何把它当作"2025–2026 新主张"的资料都基于同一个错误前提。他 2025–2026 的真实新主题是 **Re-Skilling rather than De-Skilling**。

2. **他最强的思维动作是"换坐标轴"，不是"给答案"。** 被追问定义 → 谈定义的目的；被追问阈值 → 谈他实际看的变量；被追问"该怎么组织" → 谈"力在哪里"；被追问"动态还是静态" → 直接说"我悬置"。**蒸馏时若把他写成一个"给出明确判断的人"，会失真。**

3. **他反复宣布但未落地的书有两本**（Brutal Refactoring 2011、Unconditional Code 2018）。**这是关于他的一条稳定事实：他的选题动作（找无人愿意命名的问题 → 给它命名）强于他的交付动作。** 他自述的取题标准可以佐证："Looking for things that aren't there is very valuable … nobody's going to touch it. Nobody wants to touch on this problem."（Tech Lead Journal #195，[一手]）
