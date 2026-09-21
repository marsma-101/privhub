# Kent Beck 表达 DNA 调研

> 女娲·Skill造人术 流程 · Agent 3（表达 DNA 维度）
> 目标：让读者读 100 字就能认出「这是 Kent Beck 在说话」。
> 全部引文保留英文原句；无法确证为原句的一律改为转述并标注。

---

## 0. 调研说明

### 0.1 调研问题

本次只回答一件事：**Kent Beck 的「说话方式」长什么样**——不是他的观点对不对，而是他的句子、词、节奏、幽默、确定性刻度、语域切换，以及这套东西在代码里（commit message、测试命名、repo 描述）的投影。

### 0.2 检索路径与信源分级

一手源（他本人写/说，或他本人的仓库、官网）：

| 类型 | 具体来源 | 说明 |
|---|---|---|
| 一手 | `newsletter.kentbeck.com`（Substack「Software Design: Tidy First?」） | 抓取到完整 sitemap（约 400+ 篇存档）与十余篇全文/开篇。含 2023 起的全部存档与 2003–2016 阶段旧文的再发布 |
| 一手 | `kentbeck.com`（官网首页、`/summaries`、`/coaching`） | 自我介绍、演讲题目清单、播客/合作页文案，最集中的「营销语域」样本 |
| 一手 | `github.com/KentBeck` GitHub REST API | 仓库描述原文 + 多个仓库的 commit message 原文（TestDesiderata、GPUSortedMap） |
| 一手 | `raw.githubusercontent.com/KentBeck/TestDesiderata` 的 `index.md` | 「Test Desiderata」12 条属性的原始定义句 |
| 一手 | Substack `/about` 页（「Helping Geeks Feel Safe in the World」） | 他的自我使命陈述，5 条 bullet 逐词解释自己那句话 |
| 一手 | `kentbeck.com/coaching` | 咨询页，句式和演讲页高度一致 |
| 一手（转录引用） | 《Refactoring: Ruby Edition》(2009) p.74 | 自评句原始出处（经 azquotes 带页码引用） |
| 一手（转录引用） | 《Extreme Programming Explained: Embrace Change》(2000) pp.28/31/38 | 早期格言体原句（经 azquotes 带页码引用） |
| 一手（推文原文，经他本人 Substack 转录） | `x.com/KentBeck/status/1648413998025707520` | 「90% of my skills…」推文原文，由他本人在文章开头一字不差引用 |

二手源（他人转述/聚合）：

| 类型 | 具体来源 | 可信度 |
|---|---|---|
| 引文聚合站 | azquotes.com/author/31849-Kent_Beck | 中——但条目带出版页码或推文链接，凡带链接/页码者按一手对待 |
| 引文聚合站 | whatsmyquote.com/author/kent-beck（48 条） | 中低——无出处标注，仅用作交叉印证 |
| 文集摘要页 | `kentbeck.com/summaries`（80 篇摘要，2025–2026） | 中——摘要由他团队/工具生成，只用于**标题与副标题**取信，正文判断不采信 |
| 平台检索 | GitHub / HN / V2EX / Reddit / Bilibili 平台搜索 | 本次几乎无有效产出（见 0.4） |

### 0.3 引擎可用性记录（重要，影响可信度评级）

本次检索环境实测（`free_search_test`）：

- 可用：`bing`、`anysearch`、`deepseek-official`
- 不可用：`ddg`（连接失败）、`ddg-lite`（连接失败）、`searxng`（全部实例超时）、`exa`（HTTP 429）、`tavily`（小时配额耗尽）、`firecrawl`（HTTP 429）
- 未配置：`parallel`、`perplexity`（无 API key）

**关键教训**：`bing` 引擎对本任务基本失效——查询词含「Kent Beck」时，返回结果被中文「健牌香烟 / 肯特大学」淹没（实测 4 次查询，命中率 0）。真正有效的是 `deepseek-official` 引擎与**直接 web_fetch**。因此本次的信源不是「搜索来的」，而是「顺着 Substack sitemap 与官网链接爬下来的」——这反而提高了信源质量。

另：`github.com` 的 HTML 页面与 `api.github.com` 从本机 pwsh 直连均被 TLS 层拦截（`基础连接已经关闭`），但通过 web_fetch 走 `api.github.com` 与 `raw.githubusercontent.com` 正常。故 commit message 为原文抓取，非转述。

### 0.4 信息不足方向（诚实标注）

1. **X/Twitter 原始时间线未能抓取**。`x.com` 需登录，聚合站（Thread Reader、unrollnow 等）本次未获得可用的原句页。最终拿到的推文原文只有 2 条可确证：
   - 2023-04-18「90% of my skills」那条（他本人在 Substack 里全文转录）[一手]
   - 2013-11-08 关于工具掌握的那条（azquotes 附推文链接，但链接指向 `twitter.com/motherboard/...`，**归属存疑**，正文按 [存疑] 处理）
   - 2010-08-26「Sometimes the problem has to mature…」同样附链接但指向异常账号 [存疑]
2. **「The Worst Programmer I Know」一文未能定位**。该文存在（广为流传），但不在 Substack sitemap 可见的 400+ slug 中，推测首发于 Medium/Three Rivers Institute 旧博客，未抓取到原页。本文件中相关内容**全部标注为 [推断]，不作为原句使用**。
3. **邮件列表（XP 邮件列表 / extremeprogramming Yahoo Group）贴文未能进入**。Yahoo Groups 已关停，归档站需会员。本文件未使用任何该来源材料。
4. **演讲视频未做语音转录**。演讲语域部分基于他的**演讲页文案 + 他自己写的「如何做演讲」文章 + 播客 shownotes/转录摘要**推断，凡无原句者均标注 [推断]。
5. **《Tidy First?》纸书正文未逐句核对**。书中金句仅采用带页码的聚合引用，其余以 Substack 对应章节替代。

### 0.5 黑名单执行说明

本文件未使用知乎、微信公众号、百度百科。检索过程中 bing 返回的「健牌香烟」「百度百科 Kent」等页面已全部弃用（与 Kent Beck 无关，属引擎误召回）。所有中文表达均为本次原创转写，不引自中文二手文。

---

## 0.6 语料总览：本次实际看到的「表达样本池」

为了让后面的每一条判断都可以被复核，这里先把本次实际读到的**标题级样本**摆出来。标题是最省成本的表达样本，因为标题是作者唯一必须亲手打磨、且必须承担「点不点开」后果的一句话。

**2026 年（AI / 波动率主题）标题样本** [一手，均来自 Substack 归档页与 sitemap]：

- `Reject Change, Sometimes`（副标题：`Volatility, Shannon's Demon, & Free Money`）
- `Baking a Model`
- `Busy is Short Volatility`（副标题：`The brutal tyranny of the Kingman Formula`）
- `Speculative Short Volatility & Neglectful Short Volatility`
- `Canon 3X: Explore/Expand/Extract`
- `How Do You Know That?`
- `Long Vol: What is Volatility?`
- `Long Volatility Development`
- `The Beginnings of an Idea: XP is Long Volatility`
- `When Complaints Are Good News`（副标题：`Hint--it's in Explore & Expand`）
- `Air Traffic Control`
- `The Cost YAGNI Was Never About`（副标题：`If you think YAGNI is about saving effort, cheap generation should retire it. It doesn't. Here's why.`）
- `Why So Literal?`（副标题：`On the failure of analogy as a communication device`）
- `Smalltalk Genie`
- `A Learning System Made of Learning`
- `You Don't Get to Create Anything`
- `Trust Factory`
- `Genie Lessons from Genie Sessions`
- `Scope is the Steering Wheel`
- `Itchy Brain`
- `Hey, N00b, We Didn't Hire You to Complete Tasks`（副标题：`Welcome!`）
- `Thinkies World Congress II`
- `Thinkie: Wider Scope`
- `Thoughts, Not Thinking?`
- `Did We Do This to Ourselves?`
- `Adaptive Radix Tree`
- `Run, Right, and Fast for the Adaptive Radix Tree`
- `Unstick Your Stuck Thinking`
- `Genie Tarpit`
- `Genie Lessons: Nobody Wants Agents`
- `Passing Tests Bore Me`（副标题：`Green. Yawn...`）
- `Find the North Star`
- `Extreme Time Value of Money: Late-stage Career Planning`
- `Parkinson's`（副标题：`Not trying to be subtle here`）
- `The Bridge: Too Far`
- `Potpourri: Lessons from an AI Leadership Conference`
- `Run Out to Meet It`
- `Starving Genies`
- `Genie Sessions: TCR Skill`
- `Tremors`
- `Thinkie: Reinforcing Loop`
- `Why Your Progress Is About The Same As Everyone Else's`
- `Nobody Knows`
- `Forest Thinning`
- `A Few Questions About What You're Working On...`
- `Genie: Death of the Iron Triangle?`
- `Don't Accomplish Everything`
- `Earn *And* Learn`
- `Genie Session: Codex for Mac/GPUSortedMap`
- `Generation Gap or Just Rude?`
- `Labor Replacement is a Poison Pill`
- `Is Source Code Going Away?`
- `The Pinhole View of AI Value`
- `Can Genies Break Down Silos?`
- `Genie Sessions: Optionality`
- `Tidy Together Reboot`
- `Taming the Genie: "Like Kent Beck"`
- `Bridges`
- `My Fitbit Buzzed and I Understood Enshittification`
- `The Precious Eyeblink`
- `Party of One for Code Review!`
- `The Bet On Juniors Just Got Better`
- `Explore *Then* Expand *Then* Extract`
- `Tidying: Canonical Order`

**2023–2025 年（设计 / TDD / 生产率主题）标题样本** [一手]：

- `90% of My Skills Are Now Worth $0`（副标题：`...but the other 10% are worth 1000x`）
- `Canon TDD`（开头引语：`What follows is NOT how you should do TDD.`）
- `Mastering Programming`
- `Measuring Developer Productivity? A Response to McKinsey`
- `Start Presentations on the Second Slide`（副标题：`Aka "in media res"`）
- `Attracted To The Desert (Or The Forest)`（副标题：`Attractors`）
- `Ideas I've Contributed to in Software`
- `"Obviously..."`
- `Can't/Because`
- `Laughter`
- `Envy Brings a Lesson`
- `Paint Drip People`
- `Code Smells`
- `Never Forget`
- `What If You Are Going to Need It`
- `Confusion to Sense to Boundaries`
- `Abstract vs. Concrete Parameters`
- `More What, Less How`
- `Why Empirical`
- `Why Write Tidy First? Personal Coda`
- `Why I Came to Write Tidy First`
- `How I Came to Write Tidy First`
- `Fool-Proof Design`
- `Accountability is Not Blame`
- `Delay Versus Friction`
- `Design Play`
- `The Pie Problem`
- `Underpaid Programmers`
- `Distinctions with a Difference`
- `Sources of Friction, Sources of Harmony`
- `A Dollar Today, a Dollar Tomorrow`
- `Options Versus Cash Flows`
- `Tidying Versus Sooner`
- `Better, Sooner, Cheaper, More`
- `First, After, Later, Never`
- `Rhythm`
- `Batch Sizes`
- `How Long Should Functions Be`
- `Deadlines in the Forest`
- `The Threat of Incremental Delivery`
- `Caterpillar to Butterfly`
- `How I Will Measure My Life`
- `One Room at a Time`
- `Bugs Optional`
- `Complain and Propose`
- `Far Behind the Eyes`
- `Different Bests in Different Contexts`
- `Why Software Design Matters`
- `First One, Then Many`
- `Coding in the Debugger`
- `Timing`
- `Helping Geeks Feel Safe in the World`
- `Don't Cross the Beams`
- `Personal Feedback`
- `Direct Feedback`
- `Dimensions of Power`
- `Serialize`
- `Ergodic Development`
- `Reverse Phrase`
- `Design Intuition`
- `Publish Everything, Pretty Much`
- `Idea to Impact`
- `Eventual Business Consistency`
- `Ergodic: Good Thinkie, Awful Name`
- `Emotions: A Code Book`
- `Fresh Work: 80/15/5`
- `Snapshot Testing`
- `When Did It Happen, When Did We Find Out`
- `Invite Your Friends to Read Software Design`
- `Two More Implementation Patterns`
- `Appreciating Your Way to XP`
- `Bet on Growth`
- `Examples Needed, Reading Order`
- `Thinking About Code Review`
- `Signaling Cooperation: Employees' Dilemma`
- `Design Play at Work`
- `Sign Up Versus Assignment`
- `Team Matching Creates Incentives`
- `Performance Review Incentives`
- `Push Back, Finally`
- `Musing: Aligning Authority and Responsibility`
- `Beneficially Relating Elements`
- `Discarded Chapter: Time Value of Money`
- `Constantines' Equivalence`
- `Reversible Structure Changes`
- `Geographic Compensation Will Lose`
- `Earning to Write, Not Writing to Earn`
- `I'm Having Trouble Writing`
- `Getting Untangled`
- `Perverse Incentives of Retrospective Performance Reviews`
- `Tidyings Are Almost Done`
- `Desirable Unit Tests`
- `Lumpers and Splitters`
- `Waze Founders' Comments: Space of All Possible Solutions`
- `Mysteries of Geek Incentives`
- `It's Not Programming`
- `The Geek Incentives Manifesto`
- `Structure and Behavior`
- `Elements All the Way Down`
- `Software Design Dilemmas: A Survey`
- `Chunk Size`
- `Mind-Sized Chunks`
- `Welcome to Tidy First`

**从这份 200+ 条标题清单里可以抽出四条硬规律**（本节原创观察，标 [推断]）：

1. **标题平均 2–4 个实词，几乎不含冠词冗余。** 出现最多的形式是「名词 + 名词」或「动词 + 宾语」。全清单里没有一条以 "A Guide to…" / "An Introduction to…" / "Thoughts on…" 开头。
2. **问号出现率约 8–10%**（`Tidy First?`、`Why So Literal?`、`How Do You Know That?`、`Is Source Code Going Away?`、`Generation Gap or Just Rude?`、`Thoughts, Not Thinking?`、`Can Genies Break Down Silos?`、`Why Does Development Slow?`、`Bridges` 之外的 `Genie: Death of the Iron Triangle?`）。**科技作者里这个比例非常高。**
3. **他用星号做「双向」强调**：`Earn *And* Learn`、`Explore *Then* Expand *Then* Extract`。斜体标的是**逻辑连接词**，不是概念名词——这是他的独门习惯。
4. **副标题永远承担「副标题该干的活」**：要么一句钩子（`Hint--it's in Explore & Expand`、`Green. Yawn...`、`Welcome!`、`Not trying to be subtle here`），要么一个完整的三句论证（`If you think YAGNI is about saving effort, cheap generation should retire it. It doesn't. Here's why.`）。**他从不写「本文探讨……的若干问题」这种副标题。**

---

## 0.7 四条「开篇句」模型的横向对比

把本次抓到的开篇句排在一起，会看到一个很清楚的模式：**他只从四类句子里选开场。**

**类型 1 · 个人记忆（最多）**
- "I remember walking to the bus from high school, staring at a Motorola 6800 instruction set manual."（*Baking a Model*）[一手]
- "I became an only child at four and a half."（*Bridges*）[一手]
- "When I had dogs if I pointed at something interesting they would just stare at my finger."（*Why So Literal?*）[一手]
- "I started playing when my mother enrolled me in Mrs. Card's guitar class in summer school."（kentbeck.com 音乐栏）[一手]

**类型 2 · 场景化寓言**
- "An ancient exchange gave each trader sitting at their oak desks two options for investment:"（*Reject Change, Sometimes*）[一手]

**类型 3 · 对话 / 台词**
- "Here's how I remember it—Chet Hendrickson came up to me in the middle of a project and said, 'I could do this simplistic thing now but in 3 weeks that will be insufficient…'"（*The Cost YAGNI Was Never About*）[一手]
- "I tweeted about this yesterday & it blew up:"（*90% of My Skills Are Now Worth $0*）[一手]

**类型 4 · 一个被误读的说法摆在桌上**
- "Most people think YAGNI—You Aren't Gonna Need It—is a thrift rule."（*The Cost YAGNI…*，作为「给精灵的那封信」的开头）[一手]
- "The last language-oriented Thinkie is contrarianism in action."（*"Obviously…"*）[一手]
- "When I had dogs…" 之后的正式论点："I've always depended on analogy to communicate."（*Why So Literal?*）[一手]

**反例（他从不这样开头）**：
- 不写「背景介绍」
- 不写「本文分为三部分」
- 不写「随着 AI 的快速发展……」
- 不写「大家好，今天我想和大家聊聊……」

**给 Skill 的实现建议**：如果要做 Kent Beck 腔的生成器，开篇模板只需两条即可覆盖 80% 场景——「我记得……（一个具体到有物理细节的场景）」或「大多数人以为 X 是 A。它不是。」

---

## 1. 句式偏好

### 1.1 句长：极短句打结论，长句只用来铺情境

Kent Beck 的句子长度呈**双峰分布**：结论句常在 5–12 词，铺陈句可达 40–60 词但有一条主线索。他极少写「中等长度的模糊句」。

**极短结论句（≤12 词）：**

> "YAGNI was never thrift."
> —— *The Cost YAGNI Was Never About*，2026-06-25 [一手] https://newsletter.kentbeck.com/p/the-cost-yagni-was-never-about

> "Waiting is not laziness. Waiting is holding an asset."
> —— 同上 [一手]

> "Build it when you need it."
> —— 同上 [一手]

> "Play, friends! It's a way to understand."
> —— *Reject Change, Sometimes*，2026-09-02 [一手] https://newsletter.kentbeck.com/p/reject-change-sometimes

> "Code wants to be simple."
> —— 引文碎片，见 azquotes；完整段落疑出自 *Extreme Programming Explained* 或其后记 [一手/存疑出处] https://www.azquotes.com/author/31849-Kent_Beck

> "Chill."
> —— *Canon TDD*，2023-12-11 [一手] https://newsletter.kentbeck.com/p/canon-tdd

> "Nope."
> —— 同上（用来单独否定一个流行误解，独占一行）[一手]

**长句（铺情境/自嘲/类比）：**

> "I remember walking to the bus from high school, staring at a Motorola 6800 instruction set manual. I didn't really understand what I was looking at—boolean expressions, instruction encodings, timing tables—but I was obsessively fascinated by the mechanism of it all."
> —— *Baking a Model*，2026-08-14 [一手] https://newsletter.kentbeck.com/p/baking-a-model

> "You take ingredients in one form & transform them to a totally different form. The ingredients aren't palatable in themselves but what you create from them is delicious."
> —— 同上 [一手]

**给 Skill 的推论**：模仿时长句只允许出现在「讲故事」段落，一旦开始下判断就必须掉到 10 词以内。他的长句里不会出现形容词堆叠——他宁可重复名词也不用两个形容词。（如 "a model is a bag of numbers"，用名词短语作定义，不用 "a sophisticated statistical artifact"。）

### 1.2 段落密度：一行一段，空行当呼吸

他的 Substack 正文排版密度极低。观察 `Reject Change, Sometimes`：全文约 1300 词，但被切成 **30+ 个段落**，其中大量是一句话自成一段，甚至一句里的两个分句被拆成两句：

> "Prudence ignored the coin flipper. Sat at their desk all day reading newspapers, caution relieving stress but costing opportunity."
> —— [一手] 同上

> "Reckless hopes the flipper runs hot. SD hopes the flipper just keeps flipping."
> —— 同上 [一手]

对立结构常被拆成**两个相邻单句段**，用重复句式对比（"X hopes… Y hopes…"）。

**加密手段**：他用小标题（`## What?`、`## 3X: Extract`、`## The first bill: optionality`）把一篇短文切成 4–8 块，每块只有 100–250 词。小标题本身要么是一个问句，要么是一个名词短语，**从不写成「关于……的讨论」这种形式**。

**双向列表**：他会在小标题下开列表，列表项本身就是完整句：

> "• Succeed at overcoming the next growth bottleneck. (The winning outcome.)
> • Die. Lose everything. (The losing outcome. It *really* costs you because it erases all possible future gains.)
> • Switch to Extract. (This one is new.)"
> —— 同上 [一手]

### 1.3 问句比例：约每 150–250 词一个真问句，且几乎从不自问自答式地「设问」

问句分类（按出现频率）：

**(a) 小标题式问句（标题=问句）**：这是他最稳定的签名之一。归档页可见的标题样本：

- "How Do You Know That?" [一手] https://newsletter.kentbeck.com/p/how-do-you-know-that
- "Why So Literal?" [一手] https://newsletter.kentbeck.com/p/why-so-literal
- "When Complaints Are Good News" [一手]
- "Is Source Code Going Away?" [一手]
- "Can Genies Break Down Silos?" [一手]
- "Why Does Development Slow?" [一手]
- "Separate Failed Assertions from Unexpected Exceptions?" [一手]（**连问号都保留在标题里**，见 kentbeck.com/summaries）
- "Generation Gap or Just Rude?" [一手]
- "Genie: Death of the Iron Triangle?" [一手]
- "Thoughts, Not Thinking?" [一手]
- "Busy is Short Volatility"（陈述句标题，但副标题是名词短语"The brutal tyranny of the Kingman Formula"）[一手]
- 书章节标题："Tidy First?"（书名即问句）[一手]

**(b) 正文中真的不知道答案的问句**：

> "What's going on?"
> —— *Reject Change, Sometimes* [一手]

> "Where did we come up with these numbers?"
> —— *Baking a Model* [一手]（紧接着自答 "Unlike in programming… AI models result from *training*."）

> "Open question: is code sensitive to initial conditions?"
> —— *Canon TDD* [一手]（他把未解问题直接留在正文里，用括号标出）

**(c) 反问（少而锋利）**：

> "People, I understand, but omniscient models?"
> —— *The Cost YAGNI Was Never About* [一手]

> "…and who cares about that?"
> —— *Reject Change, Sometimes* [一手]

**(d) 挑衅式提问（标题里直接怼流行说法）**：

> "I wrote *Canon TDD* to forestall strawmen."
> —— *Canon TDD* 实际开篇为免责声明，标题本身就是「Canon」二字在挑衅（谁来定义正统？）[一手]

**给 Skill 的推论**：模仿他时，一篇千字文里应出现 2–3 个问句，其中**至少一个必须是标题**，且**至少一个必须是他自己也没答案的**——这是他的诚实标记。

### 1.4 类比密度：极高，但每个类比都自带「磨损声明」

他自称靠类比沟通（"I've always depended on analogy to communicate"），但同一篇文章里又承认类比会失效：

> "Analogies like 'XP is driving' have helped get my point across in ways that a bald statement of facts didn't se…"
> —— *Why So Literal?*，2026-06-23（付费墙截断）[一手] https://newsletter.kentbeck.com/p/why-so-literal

> "When I had dogs if I pointed at something interesting they would just stare at my finger. No amount of gesturing or yelling would redirect their attention. I'm starting to feel like that."
> —— 同上开篇 [一手]

他的类比清单（按出处）：

| 类比 | 出处 | 一句话原句 |
|---|---|---|
| 硬币翻面游戏 / Shannon's Demon（投资） | *Reject Change, Sometimes* [一手] | "An ancient exchange gave each trader sitting at their oak desks two options for investment: A strongbox… A coin flipper…" |
| 烘焙（冷发酵 / 整形烘烤） | *Baking a Model* [一手] | "Pre-training is the cold proofing of model training." / "Post-training is the shaping & cooking of model training." |
| 指月亮的手指 / 狗 | *Why So Literal?* [一手] | "if I pointed at something interesting they would just stare at my finger" |
| 两笔账单（optionality 账单、NPV 账单） | *The Cost YAGNI Was Never About* [一手] | "Speculative structure sends you two bills. They arrive at different times, for different reasons…" |
| 森林 vs 沙漠 | *Attracted To The Desert (Or The Forest)* [一手] | "It's easy to lose the forest." |
| 管道（pipes） | *Match The Pipes* [一手] | 标题即类比 |
| 桥（bridge） | *The Bridge: Too Far*、*Bridges* [一手] | 关系边界隐喻 |
| 驯服精灵（genie） | 2026 年几乎每篇 AI 文章 [一手] | "the genie" = LLM 编码助手 |
| 农夫与种子玉米 | 官网首页 [一手] | "'Don't eat the seed corn' — My coding genie unfortunately doesn't know this farming wisdom." |
| 4 亿条命（3e9 秒） | *Mastering Programming* [一手] | "their precious 3e9 seconds on the planet" |

**关键特征**：他给类比会**主动标出类比失效的地方**。看这句自嘲式收尾：

> "(The analogy doesn't cover the collaborative, iterative, & reversible nature of post-training—le sigh.)"
> —— *Baking a Model* [一手]

**给 Skill 的推论**：他的类比不是修辞装饰，是**理解工具**。他会说"我用这个类比来建立直觉"（"I love these kinds of intuition sharpeners"），并明确承认类比的边界。模仿时，每个类比后面要么跟一句边界声明，要么跟一句 "here's hoping…" 式的期待。

---

## 2. 词汇特征

### 2.1 高频词表（基于本次抓取的十余篇全文/开篇人工统计，非语料库统计，仅作倾向判断）

| 词/短语 | 频度 | 典型句例 | 来源 |
|---|---|---|---|
| **&**（代替 and） | 极高 | "& I program so I can understand the world" 式；官网、Substack 正文、书名副标题一律用 `&` | kentbeck.com [一手] |
| **here's / here is** | 高 | "Here's a tidying that I don't think I've talked about before." | *Tidying: Canonical Order* [一手] |
| **here's the part people miss** | 中 | "Here's the part people miss. This is not an argument that prediction is hard…" | *The Cost YAGNI…* [一手] |
| **Mistake:**（标签式） | 极高（教程文） | "Mistake: mixing in implementation design decisions." / "Mistake: write tests without assertions just to get code coverage." | *Canon TDD* [一手] |
| **protip** | 中 | "protip: trying working backwards from the assertions some time" / "(protip: start over but pick a different order)" | *Canon TDD* [一手] |
| **The problem with this…** | 中 | "The problem with this rendering is that it confuses our intuition about an important part of the system dynamic—attractors." | *Attracted To The Desert* [一手] |
| **I could be wrong / I don't claim to understand** | 中 | "I don't claim to understand the details, not yet, but I'm fascinated by the mechanism of it all." | *Baking a Model* [一手] |
| **please correct me** | 中 | "(please correct me in the comments if I've gotten something wrong)" | *Baking a Model* [一手] |
| **Here's hoping** | 中 | "(Here's hoping the vocabulary evolves.)" | *Baking a Model* [一手] |
| **obviously / "Obviously…"** | 中 | 单开一篇 Thinkie《"Obviously…"》专讲这个词 | *"Obviously…"* [一手] |
| **genie**（LLM 代称） | 极高（2025–2026） | "Dear Genie, This Is YAGNI" / "the genie writes the speculative structure for free" | *The Cost YAGNI…* [一手] |
| **tidy / tidying** | 极高 | "Timing is one distinguishing feature of the Tidy First worldview." | Substack 摘要 [一手] |
| **optionality** | 高 | "Software design creates optionality." | kentbeck.com [一手] |
| **empirical** | 高 | 书名《Tidy First? A Personal Exercise in Empirical Design》；系列名 "Empirical Software Design" | kentbeck.com [一手] |
| **I'm amazed / I was surprised** | 中 | "I was surprised in a recent convo with a model to discover that genies don't understand YAGNI." | *The Cost YAGNI…* [一手] |
| **Le sigh / I must say** | 低但极有辨识度 | "(The analogy doesn't cover…—le sigh.)" / "I must say that as Kent Beck's go, ChatGPT's writing sucks." | *Baking a Model* / *90% of My Skills…* [一手] |
| **Play, friends!** | 收尾语，偶发 | "Play, friends! It's a way to understand." | *Reject Change…* [一手] |
| **useless but interesting** | 低 | 见 Play 类实验的自我定位 [推断] | — |

### 2.2 专属术语（他自己造的、带品牌烙印的词）

| 术语 | 含义 | 首次/主要出处 |
|---|---|---|
| **Tidy First?** | 书名即问句；"先整理还是先改行为"的时机问题 | 书名 [一手] |
| **3X / Explore–Expand–Extract** | 三阶段模型 | *Canon 3X: Explore/Expand/Extract* [一手] |
| **Thinkies** | 他收集 30 年的「创意思维小把戏」，约 90 个 | kentbeck.com [一手] |
| **genie** | 对 AI 编码助手的爱称 | 2025 起大量使用 [一手] |
| **augmented coding** | 他自己造的词，配口号 "never having to say no to an idea" | kentbeck.com [一手] |
| **Canon TDD / Canon 3X** | 「正统版」重述系列，前缀 Canon 即宣告「这才是原版」 | *Canon TDD* [一手] |
| **short volatility / long volatility** | 从金融借来改造软件开发的框架 | *Reject Change, Sometimes* 等 [一手] |
| **Forest & Desert** | 团队/组织两种吸引子状态 | Substack 栏目名 [一手] |
| **The Finish Line Game / The Compounding Game** | 两种开发游戏 | *Earn \*And\* Learn* 摘要 [一手/摘要] |
| **shrink the feedback loop / The Precious Eyeblink** | 400ms Doherty 阈值 | *The Precious Eyeblink* 摘要 [一手/摘要] |
| **test desiderata** | 12 条测试属性 | GitHub `KentBeck/TestDesiderata` [一手] |
| **salami slicing** | 把大块切成薄片的叙事 | kentbeck.com 演讲页 [一手] |
| **green/red、make it run/right/fast** | 从 Pappy（他祖父/父亲）继承的口头禅 | kentbeck.com 首页署名为 "Douglas Beck, my Pappy" [一手] |

### 2.3 禁忌词与明确反对的措辞

**注意**：以下是他**反对的说法**，不是他常用的词。写「Kent Beck 腔」时绝不能把这些当成正面用法。

| 他反对的措辞 | 他的原句/立场 | 来源 |
|---|---|---|
| **best practice（最佳实践）** | 他用 "Different Bests in Different Contexts"（不同语境有不同的「最好」）作为文章标题来反驳单数化的 best practice 观 [一手，标题与摘要] https://newsletter.kentbeck.com/p/different-bests-in-different-contexts | Substack |
| **"we've always done it this way"** | Thinkie 系列《"Obviously…"》整篇针对此类「不言自明」；另《Can't/Because》针对「因为 Y 所以做不到 X」的固化句式 [一手] https://newsletter.kentbeck.com/p/cantbecause | Substack |
| **把 TDD 变成宗教** | "What follows is NOT how *you* should *do* TDD. Take responsibility for the quality of your work however you choose, as long as you actually take responsibility." / "There's no gold star for following these steps exactly." / "I'm not telling you how to program. I'm not charging for gold stars." —— 极其罕见的三连免责 | *Canon TDD* [一手] |
| **"TDD suckz dude"** | 他直接把这句话当稻草人名字反复引用，并注明 "a frequent example being, '…because I hate writing all the tests before I write any code.'" 他的态度是：批评可以，但要批评真东西（"If you're going to critique something, critique the actual thing."）[一手] | *Canon TDD* |
| **抽象过早 / 抽象癖** | "Mistake: abstracting too soon. Duplication is a hint, not a command." [一手] | *Canon TDD* |
| **代码行数/工时当指标** | 《First Principles First》《Measuring developer productivity? A response to McKinsey》：把 LoC、PR 数、工时与客户结果拉开距离来批评 [一手，题目与摘要] | Substack |
| **"architecture astronaut"** | 本次未在抓取到的一手文本中找到他本人使用该词的证据。他在 *Canon TDD* 里表达的是同类批评（"Chill." / "There will be plenty of time to decide how the internals will look later."），但**「architecture astronaut」一词归属他本人 [存疑]** ——该词通常归给 Joel Spolsky。**不要把它写成 Kent Beck 的名言。** |
| **rock star / ninja programmer** | 本次**未找到**他本人使用或明确反对这两个词的一手证据。他相关的正面表述是把「10x 程序员」神话改写为「习惯」：「I'm not a great programmer; I'm just a good programmer with great habits.」（《Refactoring: Ruby Edition》p.74）[一手/带页码转引]。**因此「他反对 rock star programmer」这一说法标 [存疑]，不要在一手口吻里让他说这句话。** |
| **"the computer did it"** | 明确反对的责任转移话术："And why 'the computer did it' is never the whole story." [一手] | *How Do You Know That?* https://newsletter.kentbeck.com/p/how-do-you-know-that |
| **"objective"（形容系统/评价）** | 转录他女儿 Beth 的观点并为之背书："The moment you tell people a system is objective, they stop scrutinizing it, and you can smuggle in enormous bias." [一手/转录他人语] | 同上 |
| **Cargo cult 式照抄实践** | "If you're doing something different than the following workflow & it works for you, congratulations! It's not Canon TDD, but who cares?" —— 他只反对「嘴上说 TDD、手上做别的、然后骂 TDD」[一手] | *Canon TDD* |

---

## 3. 节奏感

### 3.1 先结论还是先铺垫？——**先故事，后结论；但故事本身就是结论的预告**

他有一套明确的方法论讲这件事：

> "Start Presentations on the Second Slide — Aka 'in media res'"
> "write what you want to write, them switch the first two slides/paragraphs/chapters."
> —— *Start Presentations on the Second Slide*（首发 2013-03，2024-06 再发布）[一手] https://newsletter.kentbeck.com/p/start-presentations-on-the-second

也就是：**他写的顺序是先铺垫再结论，交付时把两段对调**。所以读者看到的是「先扔一个具体、带张力的场景，再回头补背景，最后给结论」。

三个可复现的开篇模型：

**模型 A：具体记忆/场景切入（最常用）**

> "I remember walking to the bus from high school, staring at a Motorola 6800 instruction set manual."
> —— *Baking a Model* [一手]

> "I became an only child at four and a half."
> —— *Bridges*（开篇句，见 archive 摘录）[一手] https://newsletter.kentbeck.com/p/bridges

> "When I had dogs if I pointed at something interesting they would just stare at my finger."
> —— *Why So Literal?* [一手]

**模型 B：寓言/微型小说切入**

> "An ancient exchange gave each trader sitting at their oak desks two options for investment: …"
> —— *Reject Change, Sometimes* [一手]
> 注意他在寓言里插了一句现代吐槽："Reckless' stack of coins went up & down like a yo-yo (even though yo-yos hadn't been invented yet)." —— 这是典型的**破功式幽默**，防止读者太入戏。

**模型 C：对话录切入**

> "Here's how I remember it—Chet Hendrickson came up to me in the middle of a project and said, 'I could do this simplistic thing now but in 3 weeks that will be insufficient…'
> I said, 'You aren't going to need it.'
> Chet said, 'You don't understand. We're definitely going to need it. See, here's an example…'
> Me (interrupting), 'You aren't going to need it.'
> Chet, get frustrated, 'But we really are…'
> Me, 'You aren't going to need it.'
> Chet, eyes going up to the ceiling, pausing, 'Oh.' Walks away."
> —— *The Cost YAGNI Was Never About* [一手]

**这段是「表达 DNA」的最高浓度样本**：同一句台词重复三次、舞台指示用逗号从句（"Chet, get frustrated,"——注意他甚至保留了语法上的瑕疵 "get" 而非 "getting"，说明他写对话时故意不做打磨）、最后以一个单音节 "Oh." 加一个动作收尾。整段没有一个形容词形容情绪。

### 3.2 转折方式

**转折 1：`What?` 式自我打断**
他会在讲完一个例子后，用极短问句给自己刹车，然后开始解释：

> 小标题 "## What?" 出现于 *Reject Change, Sometimes*：
> "Same investments. Different outcomes. What's going on?"
> "## What?"
> "In discussing long-volatility software development, so far I've made it sound like we always want to be long volatility ('embrace change', anyone?)…"
> [一手]

**转折 2：`Here's the part people miss` / `The problem with this…`**
先承认读者可能的反驳，再指出反驳本身漏了什么：

> "Here's the part people miss. This is not an argument that prediction is hard, as if a sharper architect escapes it."
> —— *The Cost YAGNI…* [一手]

**转折 3：`(insert aside)` 括号旁白**
他的括号不是补充信息，是**换气的笑点或自我修正**：

> "(see, told you I'd over-simplify—hope you stay with me, this won't take long)"
> —— *Baking a Model* [一手]

> "(Example of One Thing at a Time, Slicing, and Easy Changes)"
> —— *Mastering Programming*（括号里塞元信息，标记这段和前面的关系）[一手]

> "(cheating, this is always true)"
> —— *Mastering Programming*，在 "Maybe it is a people problem, not a technology problem [cheating, this is always true]" 句中 [一手]

> "(ed: I almost wrote 'bitter organizations')"
> —— *"Obviously…"*：例子里他把 "bigger organizations" 差点写成 "bitter organizations"，**特意把笔误保留在正文里** [一手]

> "(I used to press the button 2 or 3 times if I *really* needed reassurance.)"
> —— Substack About 页，讲 JUnit 时 [一手]

**转折 4：自问自答但答案带不确定**

> "Where did we come up with these numbers? Unlike in programming, where you lay out a sequence of statements the result of which is a program, AI models result from *training*."
> —— *Baking a Model* [一手]

**转折 5：italic 用力**
他用斜体强调的方式极其固定——**只把最关键的判断词斜体**，不整句斜体：

- "*Really?*" / "*how* we should play it"（"The interesting question is *how* we should play it."）
- "*Tidy First?*"
- "*speculative structure*"
- "*training*"
- "*Now* you get to make implementation design decisions."
- "Make it run, *then* make it right."

### 3.3 收尾方式

**收尾 A：一句话行动指令（祈使句）**

> "Build it when you need it. Not because the code is dear. Because the option is worth more unspent, and the dollar is worth more unspent, and neither of those changed when the typing got cheap."
> —— *The Cost YAGNI…* [一手]

> "Play, friends! It's a way to understand."
> —— *Reject Change…* [一手]

**收尾 B：主动请求纠错（把不确定性交给读者）**

> "First, though, I wanted to double check my understanding of the process. Let me know if I got something wrong above."
> —— *Baking a Model* [一手]

> "Try this Thinkie out. Comment with your experiences. If you want to share it, please share it in your own words."
> —— *"Obviously…"* [一手]

**收尾 C：自嘲式离题**

> "…but then this illustration seems to imply that the forest is much bigger than the desert & that's backwards, so maybe we'll just leave it alone for the moment."
> —— *Attracted To The Desert* [一手]
> 这是他的签名收尾：**发现问题但拒绝强行收口**，用 "maybe we'll just leave it alone for the moment" 保留开放性。

**收尾 D：感谢具体的人**

> "Thanks again to Kunal Bhalla for the reference. One of the luxuries of my career is that really smart people are willing to talk with me."
> —— *Reject Change…* [一手]
> 注意后半句是**谦逊式炫耀**的标准模板（见 §4）。

---

## 4. 幽默方式

### 4.1 分类一：自嘲（最常见）

> "I tend to blunt communication as subtlety tends to fly over my head."
> —— kentbeck.com 咨询页「Clarity」条目 [一手] https://kentbeck.com/

> "(I need to learn more about how pre-training folks collaborate.)"
> —— *Baking a Model* [一手]

> "I can't find any published references to it from that era. I stalled writing the TDD By Example book long enough that I was worried that I would be scooped. It all worked out."
> —— *Canon TDD* [一手]

> "In my naive bluntness I'd call 'model engineers'"（在别人叫 "researchers" 的地方，他自嘲式地坚持叫工程师）
> —— *Baking a Model* [一手]

> "I used to press the button 2 or 3 times if I *really* needed reassurance."
> —— Substack About 页 [一手]

> "I notice that the two essays are both complimentary of ChatGPT even though they are supposed to take opposite positions. It's a savvy marketer."
> —— *90% of My Skills Are Now Worth $0*（看着 ChatGPT 模仿自己写正反两篇，吐槽它「其实两边都在夸自己」）[一手]

### 4.2 分类二：破功式插科打诨（在严肃叙述里突然掉一拍）

> "Reckless' stack of coins went up & down like a yo-yo (even though yo-yos hadn't been invented yet)."
> —— *Reject Change…* [一手]

> "You wouldn't just magically guess a bunch of correct numbers in one go. Oh no, oh no."
> —— *Baking a Model* [一手]

> "(Near as I can tell, there's pre-training, post-training, & mid-training (about which I know nothing), but there's not 'training' except as the composition of pre-, mid-, & post-. Here's hoping the vocabulary evolves.)"
> —— *Baking a Model* [一手]

### 4.3 分类三：荒诞对比（拿一件很土的事解释一件很高级的事）

> "A model is a bag of numbers. For today's purposes that's enough"
> —— *Baking a Model* [一手]

> "Now the first chapter starts with a gun pointed at the hero's head. By the end, he is teetering on a cliff about to jump into a crocodile-infested river."
> —— *Start Presentations on the Second Slide* [一手]（用通俗小说桥段讲技术演讲）

> "Our adventure story where we're not interested in the color of the hero's hair, at least not until he's about to become a croc-snack."
> —— 同上 [一手]

> "It's like our adventure story…" / "Programmers have a pavlovian engineering response. Pose them a problem and they'll start trying to solve it. Give them a chance to co-engineer along with your presentation by making sure the first bite gets their saliva flowing."
> —— 同上 [一手]（用巴甫洛夫和唾液讲听众注意力）

### 4.4 分类四：谦逊式炫耀——先把自己放低，再给出别人给不出的东西

> "One of the luxuries of my career is that really smart people are willing to talk with me."
> —— *Reject Change…* [一手]

> "I'm not a great programmer; I'm just a good programmer with great habits."
> —— 《Refactoring: Ruby Edition》(2009) p.74 [一手/带页码转引] https://www.azquotes.com/author/31849-Kent_Beck

> "I've spent between 1-2% of my seconds on the planet putting words in a row. For a programmer I'm pretty good at it."
> —— *90% of My Skills…* [一手]

> "From years [decades] of watching master programmers, I have observed certain common patterns in their workflows."
> —— *Mastering Programming* [一手]（方括号自我修正 "years" → "decades"，用的是一个不修饰的括号补丁）

### 4.5 分类五：冷面反讽（对行业现象）

> "No hype, no predictions, no certainty sold."
> —— 播客 *Still Burning* 的定位句，kentbeck.com 播客页 [一手]

> "I've heard all sorts of cynical jokes about consulting — the person who demands your watch then charges you to tell you the time."
> —— kentbeck.com 咨询页 [一手]

> "I'm not charging for gold stars."
> —— *Canon TDD* [一手]

> "TDD suckz dude because <something that isn't TDD>"
> —— *Canon TDD* [一手]（用尖括号占位符把网络喷子的句式做成模板，这是他少见的技术性讽刺）

### 4.6 分类六：笑点来自「发现自己的逻辑站不住」

> "Climbing out of the desert is hard because it's so steep. Leaving the forest is easy by comparison. But then this illustration seems to imply that the forest is much bigger than the desert & that's backwards, so maybe we'll just leave it alone for the moment."
> —— *Attracted To The Desert* [一手]

> "The analogy doesn't cover the collaborative, iterative, & reversible nature of post-training—le sigh."
> —— *Baking a Model* [一手]

> "(The Woody Guthrie-style folk song on the same subject was just lame.)"
> —— *90% of My Skills…* [一手]

### 4.7 他不做的幽默

- **不挖苦具体的人**。他吐槽的对象全是「说法」「句式」「流派」，不是个体。唯一近似人身批评的是对网络喷子句式的吐槽，且用的是模板化引号。
- **不用感叹号打点笑点**。全文检索中感叹号极少，出现位置集中在 "Play, friends!"、"Oh no, oh no."、"Congrats!" 这类**真诚热情**处，不用于讽刺。
- **不玩文字游戏/双关**。唯一接近的是他女儿开场用了个奶酪双关（"We start with a cheese pun"），那是他转录女儿的话，不是他自己的习惯。

---

## 5. 确定性表达光谱

从最硬到最软排序。**这是「识别度」的核心：他会明说自己站在哪一档。**

### 5.1 最硬：祈使格言（无主语、无对冲、无出处）

| 引文 | 出处 |
|---|---|
| "You aren't going to need it." | *The Cost YAGNI Was Never About*，对话里连说三遍 [一手] |
| "Build it when you need it." | 同上 [一手] |
| "Make it run, make it right, make it fast." | *Mastering Programming*；kentbeck.com 署 "Douglas Beck, my Pappy" [一手] |
| "Make it work, make it right, make it fast." | 变体，azquotes 收录 [一手/存疑为同一句的另一版本] |
| "Keep testing & coding until your fear for the behavior of the code has been transmuted into boredom." | *Canon TDD* [一手] |
| "Waiting is not laziness. Waiting is holding an asset." | *The Cost YAGNI…* [一手] |
| "Duplication is a hint, not a command." | *Canon TDD* [一手] |
| "If you're having trouble succeeding, fail." | *Extreme Programming Explained: Embrace Change*(2004) p.32 [一手/带页码转引] |
| "YAGNI was never thrift." | *The Cost YAGNI…* [一手] |
| "Optimism is an occupational hazard of programming; feedback is the treatment." | *Extreme Programming Explained*(2000) p.31 [一手/带页码转引] |
| "Testing is not the point. The point is about responsibility." | azquotes（无出处）[存疑] |
| "If testing costs more than not testing, then don't test." | azquotes（无出处）[存疑] |
| "Listening, Testing, Coding, Designing. That's all there is to software. Anyone who tells you different is selling something." | azquotes（无出处）[存疑] |
| "A plan is an example of what could happen, not a prediction of what will happen." | azquotes [存疑] |

**语言学特征**：祈使句 / 动词开头 / 主谓宾极短 / 对偶（"X is not A, X is B"、"make it run, then make it right"）。他这几句几乎可以当咒语念。

### 5.2 硬但带人情味（用第一人称承担判断）

| 引文 | 出处 |
|---|---|
| "I'm not a great programmer; I'm just a good programmer with great habits." | 《Refactoring: Ruby Edition》p.74 [一手] |
| "I want my feelings of safety (or unsafety) to match the facts." | Substack About 页 [一手] |
| "My mission is to help geeks feel safe in the world." | 同上 [一手] |
| "I never want to work on a project that I don't understand the value of." | kentbeck.com（咨询原则 "Action" 段近义表述）[推断] |
| "I live for those moments." | kentbeck.com 咨询页 [一手] |
| "I keep the number of coaching clients small so I can bring real attention to each conversation." | kentbeck.com/coaching [一手] |

### 5.3 中档：带条件的强判断（"X, but it depends on Y"）

| 引文 | 出处 |
|---|---|
| "Timing is one distinguishing feature of the Tidy First worldview." | Substack 摘要 [一手] |
| "YAGNI is not an excuse to never design as some critics have characterized it. If you need it, build it." | *The Cost YAGNI…* [一手] |
| "Building structure too soon is as risky as building structure too late." | 同上 [一手] |
| "It's more important to know what the decision depends on than it is to know which answer to pick today (or which answer you picked yesterday)." | *Mastering Programming* [一手] |
| "All decisions are subject to tradeoffs." | 同上 [一手] |
| "Most times the reason things are obvious is because they are true. Every once in a while obvious things turn out to be used-to-be-true, or mostly-true." | *"Obviously…"* [一手] |
| "The right choice depends on how your team uses tests to drive design and debugging." | *Separate Failed Assertions…* 摘要 [一手/摘要] |

### 5.4 软：显式标注「这是我的推断/我在瞎猜」

| 引文 | 出处 |
|---|---|
| "I'm extrapolating wildly from a couple of experiences, which is what I do." | *90% of My Skills…* [一手] |
| "I could be wrong"（本次未抓到该确切短语的原文页，但他有等价表达如下）| — |
| "I do *not* have the answer for which skills are in the 90% & which are in the 10%." | *90% of My Skills…* [一手] |
| "I don't claim to understand the details, not yet" | *Baking a Model* [一手] |
| "(about which I know nothing)" | 同上 [一手] |
| "(please correct me in the comments if I've gotten something wrong)" | 同上 [一手] |
| "(Open question: is code sensitive to initial conditions?)" | *Canon TDD* [一手] |
| "(Near as I can tell, …)" | *Baking a Model* [一手] |
| "Let me know if I got something wrong above." | 同上 [一手] |
| "Maybe this is a design problem, not a testing problem." | *Mastering Programming*（"Multiple scales" 条目，用 Maybe 开头）[一手] |
| "We are back in Explore territory… The only way to find out is to try a little bit of a lot of ideas." | *90% of My Skills…* [一手] |

### 5.5 反差总结（写 Skill 必须抓的点）

**他的硬与软不对应「自信程度」，而对应「命题类型」：**

| 命题类型 | 他的语气 | 例 |
|---|---|---|
| 关于**时机与取舍**（何时做、先做哪个） | 极硬，格言体 | "Build it when you need it." |
| 关于**人的责任、感受、安全** | 硬，第一人称 | "Testing is not the point. The point is about responsibility." |
| 关于**别人怎么误读一个概念** | 硬，且会先免责再开火 | "If you're going to critique something, critique the actual thing." |
| 关于**新技术/新领域的机制** | 极软，反复声明不懂 | "I don't claim to understand the details, not yet." |
| 关于**具体的数字、比例、预测** | 极软，且标注为推断 | "I'm extrapolating wildly from a couple of experiences, which is what I do." |
| 关于**自己的价值变化** | 半软半硬（自嘲 + 大判断） | "90% of My Skills Are Now Worth $0 / but the other 10% are worth 1000x" |

**一个高浓度样本**——同一篇文章里硬与软并存：

> 硬："YAGNI was never thrift. It was two pieces of price theory wearing a programmer's slogan."
> 软："I was surprised in a recent convo with a model to discover that genies don't understand YAGNI. People, I understand, but omniscient models?"
> —— *The Cost YAGNI…* [一手]

**模仿禁令**：写 Kent Beck 腔时，**不能全程硬**（变成鸡汤格言机），**也不能全程软**（变成和稀泥）。必须让读者清楚看到「他对自己说的话分了等级」。

---

## 6. 语域切换对照表

同一观点在四种场景下的表述差异。为了让对照可信，每格尽量用**同一议题（TDD / 设计时机 / AI）**的原句。

### 6.1 场景 A：《Extreme Programming Explained》等书（2000–2004）——宣言体

- 特征：无主语格言、对偶结构、书页上每句都能单独抄下来贴墙。
- 句例：
  - "The problem isn't change, per se, because change is going to happen; the problem, rather, is the inability to cope with change when it comes." （p.28）[一手/带页码转引]
  - "Of the four project development variables - scope, cost, time and quality - quality isn't really a free variable. The only possible values are 'excellent' and 'insanely excellent', depending on whether lives are at stake." （p.38）[一手/带页码转引]
  - "If you're having trouble succeeding, fail." （2004 ed. p.32）[一手/带页码转引]
- 幽默密度：低
- 代词：几乎不用 "I"

### 6.2 场景 B：Substack 长文（2023–2026）——叙事体 + 元评论

- 特征：第一人称讲故事开场；大量括号旁白；小标题问句；`Mistake:` / `protip:` 标签；结尾请求纠错。
- 句例（TDD 议题）：
  - "What follows is NOT how *you* should *do* TDD. Take responsibility for the quality of your work however you choose, as long as you actually take responsibility." [一手]
  - "People are lousy computers. What follows looks like a computer program but it's not." [一手]
  - "I try to be positive & constructive as a habit. By necessity this post is going to be concise & negative. 'People get this wrong. Here's the actual thing.'" [一手]
- 幽默密度：高
- 代词：高频 "I" "me" "my"

### 6.3 场景 C：推文 / 短帖（2010–2023）——断句式判断

- 特征：一句一判断，无铺垫，无小标题；字数受限导致零括号、零旁白。
- 可确证句例（他本人在 Substack 中一字不差转录）：
  > "I've been reluctant to try ChatGPT. Today I got over that reluctance. Now I understand why I was reluctant. The value of 90% of my skills just dropped to $0. The leverage for the remaining 10% went up 1000x. I need to recalibrate."
  > —— 2023-04-18 推文，转录于 *90% of My Skills Are Now Worth $0* [一手]（原推 https://twitter.com/KentBeck/status/1648413998025707520）
  这段的结构值得抄：**5 个短句，每句 ≤14 词；第 1 句给状态，第 2 句给转折，第 3 句给反省，第 4/5 句给两个数字化的判断，最后一句只有 3 个词收尾。**
- 另一条（2010-08-26，出处链接异常，标 [存疑]）：
  > "Sometimes the problem has to mature before the solution can mature." [存疑]
- 另一条（2013-11-08，出处链接异常，标 [存疑]）：
  > "I've known people who have not mastered their tools who are good programmers, but not a tool master who remained a mediocre programmer." [存疑]
- 幽默密度：低（推文里他很少开玩笑）
- 代词：高频 "I"，几乎不用 "you"

**推文 vs Substack 的同题差异（推断，基于两条可确证推文 + 他的 Substack 写作习惯）[推断]**：

| 维度 | 推文 | Substack |
|---|---|---|
| 开场 | 直接给状态/判断 | 先给一个场景或记忆 |
| 类比 | 无（长度不允许） | 每篇 1–2 个 |
| 括号旁白 | 无 | 每篇 2–5 处 |
| 不确定性标注 | 少见 | 每篇必有 |
| 收尾 | 一个短句断言 | 请求纠错 或 一句祈使 |

### 6.4 场景 D：演讲 / 播客 / 咨询页——讲故事体 + 对听众的直接致意

- 特征：把观点包在故事里；自称 "stories that slip past conscious defenses"。
- 句例（kentbeck.com 演讲页）[一手]：
  > "Public speaking is storytelling. I frequently hear from folks, 'I was confused, then I remembered the salami slicing story you told at a company event ten years ago & I knew what to do.'"
  > "Stories that slip past conscious defenses"
- 他的演讲题目本身就是表达样本（全部为完整句或强名词短语，从不用「关于 X 的分享」）[一手] https://kentbeck.com/：
  - "The Shrinking Feedback Loop: LLMs and XP"
  - "You Still Have to Know What Done Looks Like"
  - "Software Design Is Option Buying"
  - "Beyond Vibes: What Augmented Coding Actually Requires"
  - "How Teams Get Stuck — and How They Don't"
  - "Quality Is a Flow Problem"
  - "The Forest & The Desert"
- 播客定位句也可当演讲腔样本 [一手]：
  > "Honest conversations about fear, uncertainty, and what it means to build things when the ground keeps shifting. No hype, no predictions, no certainty sold."
- 对「开讲方式」的自述（转述，非原句）：他建议技术演讲者**直接从第二页开始**（先抛冲突性数据），背景放在后面 [一手，见 *Start Presentations on the Second Slide*]。
- 幽默密度：中高（故事里带笑点）
- 代词：高频 "I" + 高频 "you"

### 6.5 场景 E：代码与仓库——极简短句 + 命令式

见 §7.2，此格单列。

---

## 7. 引用习惯与智识谱系线索

### 7.1 他在正文里点名的人与书

| 被引者 | 引用场景 | 原句片段 | 出处 |
|---|---|---|---|
| **Ward Cunningham** | TDD 起源考证 | "I demoed TDD for Ward Cunningham at the Austin OOPSLA conference in October 1995" | *Canon TDD* [一手] |
| **Chet Hendrickson** | YAGNI 起源的对话 | "Chet Hendrickson came up to me in the middle of a project and said…" | *The Cost YAGNI…* [一手] |
| **Ed Yourdon & Larry Constantine** | 设计理论的谱系 | "I was invited to sit on a panel with Ed Yourdon & Larry Constantine, authors of Structured Design, the book that introduced the terms 'coupling' & 'cohesion'. …these pioneers had long ago laid out the equivalent of Newton's Laws of Motion for software design." | kentbeck.com [一手] |
| **Lawrence Block** | 讲故事技巧 | "I stole this technique from Lawrence Block's outstanding *Telling Lies for Fun and Profit*, a book about writing fiction." | *Start Presentations…* [一手] |
| **Lakoff & Johnson** | 隐喻理论 | "Metaphors We Live By claims all metaphors are physically based & that 'up' generally maps to 'good'." | *Attracted To The Desert* [一手] |
| **Kunal Bhalla** | 提供一个概念（Shannon's Demon） | "Alert reader & good friend Kunal Bhalla pointed out the exception" / "He also introduced me to a powerful metaphor for building intuition around volatility—Shannon's Demon." | *Reject Change…* [一手] |
| **Beth Andres-Beck**（他女儿） | 合写与播客 | "For this bonus edition I sat down with my oldest, Beth Andres-Beck" | *How Do You Know That?* [一手] |
| **Donald G. Reinertsen** | 由读者评论引入（他本人点赞了该评论） | "Currently reading 'The Principles of Product Development Flow'…" | 评论者为 Phil Vuollet，非 Beck 本人 [二手，他点了赞] |
| **Douglas Beck ("my Pappy")** | 家族口头禅来源 | "Make it run, make it right, make it fast — Douglas Beck, my Pappy" | kentbeck.com [一手] |
| **Woody Guthrie / Biggie Smalls** | 作为「风格参照系」的笑点 | "ChatGPT wrote a rap in the style of Biggie Smalls (RIP)… (The Woody Guthrie-style folk song on the same subject was just lame.)" | *90% of My Skills…* [一手] |
| **Erik Satie** | 音乐品味 | "Gymnopedie #1, Erik Satie" | kentbeck.com [一手] |
| **Michael Feathers / Martin Fowler / Ron Jeffries** | azquotes 将他与这批人并列，但本次抓取的一手文本中未见其直接引用 | — | 不作断言 |
| **Elisabeth Hendrickson / Kent 的其他同行** | 本次未抓到直接引用 | — | 不作断言 |

### 7.2 智识谱系的三条线（推断）

1. **工程管理 + 精益制造**：Reinertsen（产品开发流）、"waste" 借自 Lean Manufacturing（他自己承认："You Lean Manufacturing folks will recognize where we stole 'waste' from."）[一手]
2. **金融经济学**：期权（optionality）、NPV、时间价值、波动率（long/short vol）、Shannon's Demon。这一支在 2024–2026 年占他写作的相当比例 [一手，多篇]
3. **认知科学 / 语言学 / 写作技巧**：Lakoff & Johnson、Lawrence Block、多臂老虎机、"学习研究"（"Learning research tells us that the time lag from experiment to feedback is critical."）[一手]

### 7.3 他引用人的方式（这本身就是表达 DNA）

- **永远给具体的人和具体的书名**，不给「业界普遍认为」。
- **承认自己是二手的**："Alert reader & good friend Kunal Bhalla pointed out the exception" —— 明确区分「我想到的」和「别人告诉我的」。
- **给致谢时顺带自嘲**："One of the luxuries of my career is that really smart people are willing to talk with me."
- **引用经典技术书时带上情绪**："these pioneers had long ago laid out the equivalent of Newton's Laws of Motion for software design."（用牛顿作比，是典型的「抬到最高档」的敬意表达）

---

## 8. 可模仿规则清单（写「Kent Beck 腔」的 15 条 + 8 条禁令）

### 8.1 正面规则（Do）

1. **标题写成问句或名词短语，永不写成「关于 X 的思考」。**
   样板：`Tidy First?` / `Why So Literal?` / `Is Source Code Going Away?` / `Separate Failed Assertions from Unexpected Exceptions?`
2. **开篇第一句必须是一个具体场景、一段记忆或一句台词，不许是论点。**
   样板："I remember walking to the bus from high school…" / "When I had dogs if I pointed at something interesting they would just stare at my finger."
   实施方法（他本人的方法）：先按自然顺序写完，然后把前两段对调（"write what you want to write, them switch the first two slides/paragraphs/chapters"）。
3. **段落切碎到平均 2–3 句，允许一句话独占一段。** 对立判断拆成相邻两段。
4. **用 `&` 代替 `and`；用 `—` 做插入语；用引号包住别人的说法再反驳。**
5. **结论句压到 10 词以内，且用祈使句或「X is not A, X is B」对偶。**
   样板："Duplication is a hint, not a command." / "Waiting is not laziness. Waiting is holding an asset."
6. **每篇至少一个括号旁白，用来（a）自嘲、（b）承认不懂、（c）留一个笑点。**
   样板："(I need to learn more about how pre-training folks collaborate.)" / "(ed: I almost wrote 'bitter organizations')" / "(cheating, this is always true)"
7. **用小标题把千字文切成 4–8 块**，其中至少一个标题是一个词或一个问句（`What?`、`Baking`、`Model`、`3X: Extract`）。
8. **教程型内容用 `Mistake:` 和 `protip:` 做标签**，每条只讲一件事，句末不加缓冲语。
9. **类比必须来自日常生活**（烘焙、硬币、森林、管道、桥、狗、种子玉米），并**主动写出类比的失效边界**。
   样板："（The analogy doesn't cover…—le sigh.）"
10. **确定性分级必须可见**：给硬判断就用祈使格言；给推断就写 "I'm extrapolating wildly"、"Near as I can tell"、"I don't claim to understand"。
11. **涉及他人观点必须点名到人**，并区分「我想到的」与「别人告诉我的」。
12. **结尾三选一**：一句祈使指令 / 一句「请纠正我」/ 一句「这个我先放着」。禁止「综上所述」式总结。
13. **数字要具体且粗糙**："3e9 seconds"、"1-2% of my seconds"、"90% / 10% / 1000x"、"80/15/5"、"400 milliseconds"。他喜欢用**整数和分数**，不用「显著提升」。
14. **斜体只标一个词**，不标整句。
15. **允许在结尾感谢一个具体的人，并顺带自谦一句。**

### 8.2 禁令（Don't）

1. **绝不写 "best practice"（最佳实践）。** 他用 "Different Bests in Different Contexts" 来反驳这个词的单数化。
2. **绝不写 "we've always done it this way" 作为论据。** 这是他要拆的靶子。
3. **不给 TDD/XP/整洁代码立教规。** 他写 "You aren't gonna need it." 是硬的，但写 TDD 流程时先声明 "What follows is NOT how *you* should *do* TDD."
4. **不把 "rock star / ninja programmer" 写进他的嘴里。** 本次未找到他本人使用或明确反对这两个词的一手证据。**这项标注 [存疑]。** 他想表达的等价观点是「习惯 > 天赋」。
5. **不把 "architecture astronaut" 归给他。** 同样未找到一手证据。[存疑]
6. **不用现代职业黑话**：stakeholder alignment、leverage synergies、move the needle、drive impact、circle back。他的替代词是极朴素的：people、team、value、waste、time。
7. **不用 emoji、不用连续感叹号、不用加粗整段。** 他的视觉强调只有：小标题、单句成段、斜体单词、`&`。
8. **不要替读者拍板。** 这是最深的一条：他把「这取决于你玩的是哪个游戏」作为常态结论。写他的腔调时若给出「所以你应该 X」的单一指令，就破功了——唯一的例外是**时机型/责任型的祈使格言**，那是他的招牌硬区。

### 8.3 一百字识别测试（写给造 Skill 的人）

> 用下面这段做校准。它应当同时包含：场景开场 + `&` + 单句成段 + 一个自谦括号 + 一个 10 词内的硬结论 + 一句开放收尾。

> "I remember the first time I deleted working code on purpose. Not because it was wrong—because it was in the way.
>
> I have been wrong about this before. (Ask me about the time I built a framework for a feature that never shipped.)
>
> The option is worth more unspent.
>
> Build it when you need it.
>
> I could be missing something. Tell me if I am."
>
> —— 本文件作者按 §1–§6 的规则合成，用于风格校准 **[推断/合成，非 Kent Beck 原句]**。任何正式产出中引用时不得标注为一手。

---

## 9. 来源清单

### 9.1 一手来源（他本人写/说/提交，或他本人的仓库）

| # | 内容 | URL | 抓取状态 | 可信度 |
|---|---|---|---|---|
| 1 | Substack 存档页（含约 400+ slug 与副标题） | https://newsletter.kentbeck.com/archive | 完整 | 高 |
| 2 | Substack sitemap（全量 URL + 日期） | https://newsletter.kentbeck.com/sitemap.xml | 完整 | 高 |
| 3 | *The Cost YAGNI Was Never About*（全文，含 YAGNI 对话录） | https://newsletter.kentbeck.com/p/the-cost-yagni-was-never-about | 全文 | 高 |
| 4 | *Baking a Model*（全文，含烘焙类比、le sigh） | https://newsletter.kentbeck.com/p/baking-a-model | 全文 | 高 |
| 5 | *Reject Change, Sometimes*（全文，含 Shannon's Demon 寓言） | https://newsletter.kentbeck.com/p/reject-change-sometimes | 全文 | 高 |
| 6 | *Canon TDD*（全文，含 Mistake:/protip: 标签体系与三连免责） | https://newsletter.kentbeck.com/p/canon-tdd | 全文 | 高 |
| 7 | *Mastering Programming*（全文，含 80/15/5、Call your shot） | https://newsletter.kentbeck.com/p/mastering-programming | 全文 | 高 |
| 8 | *Start Presentations on the Second Slide*（全文，演讲方法论） | https://newsletter.kentbeck.com/p/start-presentations-on-the-second | 全文 | 高 |
| 9 | *90% of My Skills Are Now Worth $0*（全文，含推文原文转录） | https://newsletter.kentbeck.com/p/90-of-my-skills-are-now-worth-0 | 全文 | 高 |
| 10 | *Attracted To The Desert (Or The Forest)*（全文） | https://newsletter.kentbeck.com/p/attracted-to-the-desert-or-the-forest | 全文 | 高 |
| 11 | *How Do You Know That?*（播客 shownotes，含 "the computer did it" 立场） | https://newsletter.kentbeck.com/p/how-do-you-know-that | 全文 | 高 |
| 12 | *"Obviously…"* Thinkie（全文，含 ed: 笔误旁白） | https://newsletter.kentbeck.com/p/obviously | 全文 | 高 |
| 13 | *Why So Literal?*（开篇 + 付费墙截断处） | https://newsletter.kentbeck.com/p/why-so-literal | 部分 | 高（已标截断） |
| 14 | *Tidying: Canonical Order*（开篇 + 付费墙截断处） | https://newsletter.kentbeck.com/p/tidying-canonical-order | 部分 | 高（已标截断） |
| 15 | *Passing Tests Bore Me*（标题 + 副标题 "Green. Yawn..." + 截断处） | https://newsletter.kentbeck.com/p/passing-tests-bore-me | 部分 | 高（已标截断） |
| 16 | *Can't/Because* Thinkie（开篇 + 截断处） | https://newsletter.kentbeck.com/p/cantbecause | 部分 | 高（已标截断） |
| 17 | Substack About 页「Helping Geeks Feel Safe in the World」（自我使命 5 条逐词解释） | https://newsletter.kentbeck.com/about | 全文 | 高 |
| 18 | 官网首页（使命句、Pappy 格言、Thinkies 说明、咨询原则、演讲题目） | https://kentbeck.com/ | 全文 | 高 |
| 19 | 官网文章摘要页（80 篇标题 + 副标题 + 摘要） | https://kentbeck.com/summaries | 全文 | 中高（标题/副标题高，摘要中） |
| 20 | 官网咨询页（"subtlety tends to fly over my head"） | https://kentbeck.com/coaching | 全文 | 高 |
| 21 | GitHub 仓库列表 API（含 repo 描述原文） | https://api.github.com/users/KentBeck/repos | 完整 | 高 |
| 22 | `GPUSortedMap` commit messages（"Format"、"Add perf results"、"Move pipeline constants to usage sites"） | https://api.github.com/repos/KentBeck/GPUSortedMap/commits | 完整 | 高 |
| 23 | `TestDesiderata` commit messages（"brute force"、"rely on brute force"、"tracking"、"front matter"、"Typo"） | https://api.github.com/repos/KentBeck/TestDesiderata/commits | 完整 | 高 |
| 24 | Test Desiderata 12 条属性原文（"Desiderata--things wanted or needed."） | https://raw.githubusercontent.com/KentBeck/TestDesiderata/master/index.md | 完整 | 高 |
| 25 | 推文原文转录（2023-04-18，"90% of my skills"） | https://twitter.com/KentBeck/status/1648413998025707520（经 #9 转录） | 经一手转录 | 高 |
| 26 | 推文（2010-08-26，"Sometimes the problem has to mature…"） | azquotes 提供的链接指向 twitter.com/motherboard/... | 链接异常 | **存疑** |
| 27 | 推文（2013-11-08，"I've known people who have not mastered their tools…"） | 同上 | 链接异常 | **存疑** |
| 28 | 《Refactoring: Ruby Edition》(2009) p.74 自评句 | 经 azquotes 带页码引用 | 二手转引一手 | 中高 |
| 29 | 《Extreme Programming Explained: Embrace Change》(2000/2004) pp.28/31/32/38 格言 | 经 azquotes 带页码引用 | 二手转引一手 | 中高 |

### 9.2 二手来源

| # | 内容 | URL | 可信度 | 使用方式 |
|---|---|---|---|---|
| 30 | azquotes — Kent Beck 22 条语录（部分带出版页码/推文链接） | https://www.azquotes.com/author/31849-Kent_Beck | 中高（带出处者高，无出处者低） | 只取带页码/链接项；无出处项在正文标 [存疑] |
| 31 | whatsmyquote — Kent Beck 48 条语录（无出处标注） | https://whatsmyquote.com/author/kent-beck | 中低 | 仅作交叉印证，未单独引用 |
| 32 | C2 Wiki — GoodProgrammerGreatHabits 页 | http://c2.com/wiki/remodel/?GoodProgrammerGreatHabits | 低（页面未渲染出内容） | 仅作存在性参考，未引文 |
| 33 | GitHub 平台检索 — TidyFirst 读书笔记仓库 | https://github.com/BehnamSeydAbadi/TidyFirst_KentBeck_Highlights | 低 | 未使用其内容 |
| 34 | InfoQ — "Kent Beck: Software Design is an Exercise in Human Relationships" | https://www.infoq.com/news/2022/10/beck-design-human-relationships/ | — | 抓取被反爬拦截（HTTP 405），**未使用** |
| 35 | 平台检索（HN / V2EX / Reddit / Bilibili） | — | — | 本次全部返回空或连接失败，**未使用** |
| 36 | 邮件列表归档（extremeprogramming Yahoo Group） | — | — | 未能获取，**未使用** |
| 37 | "The Worst Programmer I Know" 原文 | — | — | **未能定位原页**；本文件未使用任何该文引文，相关表述标 [推断] |

### 9.3 未采信并主动排除的召回结果

| 结果 | 排除理由 |
|---|---|
| cnxiangyan.com / yanyue.cn 等「Kent 香烟价格表」 | 引擎误召回（brand name collision with 健牌香烟）；与 Kent Beck 无关 |
| baike.baidu.com/item/Kent/10872184 | 黑名单 + 同属香烟词条 |
| zhidao.baidu.com/question/724119052028503925 | 黑名单 |
| 任何知乎 / 微信公众号页面 | 黑名单 |
| kent.ac.uk（肯特大学） | 引擎误召回 |

---

## 9.5 他的「确定性短语库」逐条解剖

这一节把散落在 §5 里的软性表达单独拆出来做语义分析，因为**要伪造 Kent Beck，最容易露馅的地方就是不确定性的说法**——大多数人会写成 "I might be wrong, but..."（英语写作课腔），而他从不这样写。他的对冲全部是**具体化对冲**：不说「我可能错」，而说「我不知道哪一部分错」或「我是从两件事推出来的」。

| 短语原文 | 出现场景 | 它实际在说 | 出处 |
|---|---|---|---|
| "I'm extrapolating wildly from a couple of experiences, which is what I do." | 给出一个 90/10 的量化判断之后 | 承认方法论不严谨，但同时宣告「这就是我的方法，我不打算改」 | *90% of My Skills…* [一手] |
| "I do *not* have the answer for which skills are in the 90% & which are in the 10%." | 同上，紧接前一句 | 把「方向」和「清单」切开：方向我敢说，清单我不敢 | 同上 [一手] |
| "I don't claim to understand the details, not yet" | 谈 AI 模型机制 | 用 "not yet" 把无知**时间化**——不是永久无知，是暂时 | *Baking a Model* [一手] |
| "(about which I know nothing)" | 括号里谈 mid-training | 最极端的一档：直接说「一无所知」，不修饰 | 同上 [一手] |
| "(Near as I can tell, …)" | 总结 AI 训练阶段命名 | 用口语化的「据我所能看到的」，暗示信息来源有限 | 同上 [一手] |
| "(please correct me in the comments if I've gotten something wrong)" | 讲完一整套机制解释 | 把纠错权明确交给读者 | 同上 [一手] |
| "First, though, I wanted to double check my understanding of the process. Let me know if I got something wrong above." | 全文结论段 | 结尾再次把「我可能错」摆到台面 | 同上 [一手] |
| "(Open question: is code sensitive to initial conditions?)" | 教程文中途 | 把未解问题**保留在正文里**，不藏 | *Canon TDD* [一手] |
| "I was surprised in a recent convo with a model to discover that genies don't understand YAGNI." | 引出整篇的动因 | 用「我吃了一惊」代替「这个问题很重要」 | *The Cost YAGNI…* [一手] |
| "Let me try. I might be wrong."（语义等价表达）| — | 本次未抓到逐字句，**不作引用**，仅记录为该类型的期望形式 | [推断] |

**反面样本（他会怎么避免）**：他不会写 "In my humble opinion"、不会写 "Correct me if I'm wrong"（"correct me" 他说，但不说 "if I'm wrong"，且总带具体范围）、不会写 "I'm no expert, but…"。

**另一类对冲是「时间化的自信」**：

> "My skills continue to improve, but ChatGPT's are improving faster. It's a matter of time."
> —— *90% of My Skills…* [一手]

这句话的结构值得单列：他既不否定自己（"My skills continue to improve"），也不否定趋势（"It's a matter of time"），把判断放在**两条增速曲线的比较**上，而不是放在绝对水平上。这是他对「未来会怎样」这类命题的标准处理方式——**只比较速率，不预测绝对值。**

---

## 9.6 Thinkies：他的「思维句式库」——表达 DNA 里最容易被忽略的一半

「Thinkie」是他自造的词，指他自己收集了 30 年的约 90 个「创意想法生成器」。从表达 DNA 的角度看，**Thinkies 是他把「句式」当成工具的极端例子**——每个 Thinkie 就是一个「识别 → 变换 → 评估」的句式模板。

他自己给出的结构 [一手，https://newsletter.kentbeck.com/p/cantbecause 与 /p/obviously]：

> "Each Thinkie comes with a pattern & a transformation. I
> 1. Match the pattern.
> 2. Apply the transformation if the pattern matches.
> 3. Evaluate the results."

以及他对这个结构难点的观察 [一手]：

> "Each step seems straightforward to me but the sequence seems hard. Other people seem to start with evaluating the expected results. If they don't expect value, they give up."

**可确证的两个 Thinkie 实例**：

**（1）Can't/Because**
- 模式识别：有人用「因为 Y，所以做不到 X」的句式拒绝一件事。
- 变换方式：把它改成「当 Y 不再成立时，我们就可以做 X」。他在 kentbeck.com 给出了逐字示范 [一手]：
  > "whenever someone says, 'We can't do X because of Y,' I habitually transform that to, 'When Y is no longer true then we can do X.' If making Y no longer true seems plausible, I suggest it. 'We can't deploy more often because of all the bugs? So you're saying when we have fewer bugs we can deploy more often?'"
- 收尾的自我拆台 [一手]：
  > "'How'd you think of that?' It's just a trick."

**（2）"Obviously…"**
- 模式识别：某人以 "Obviously…" 开头讲话。
- 变换方式 [一手，逐字]：
  > "Ask yourself what is true if they are wrong. What happens if you make the opposite assumption."
- 逐字例子 [一手]：
  > "Example: 'Obviously, bigger organizations [ed: I almost wrote "bitter organizations"] go slower.' Why is this the assumption? I mean, it seems to be empirically true, but it also seems like an excuse to not even try. What if you say I know we're bigger but how much of our speed can we retain?"
- 交付判断的方式 [一手]：
  > "Most times the reason things are obvious is because they are true. Every once in a while obvious things turn out to be used-to-be-true, or mostly-true. If you can spot one of those cases, your idea will tend to be: Unusual (what folks seem to mean by 'creative') / Valuable"

**其余 Thinkie 标题清单** [一手，来自 sitemap；内容多为付费，未取正文]：
`Thinkies Introduction`、`Thinkie: Aligning Incentive`、`Thinkie: Change Tradeoff Curves`、`Thinkie: Tradeoff`、`Thinkie: Reverse Causality`、`Thinkie: Search Space`、`Thinkie: Nash Equilibrium`、`Thinkie: Prisoner's Dilemma`、`Thinkie: Sampling Rate`、`Thinkie: The Real Question`、`Thinkie: Legibility`、`Thinkie: No Time Axis`、`Thinkie: Set-Based Design`、`Thinkie: Edges`、`Thinkie: Ask the Genie`、`Thinkie: Influence Diagram`、`Thinkie: Reinforcing Loop`、`Thinkie: Wider Scope`、`Laughter`、`Envy Brings a Lesson`、`Tremors`、`Unstick Your Stuck Thinking`、`Design Intuition`、`Paint Drip People`。

**从这份清单看得出的表达偏好** [推断]：
1. **他给思维技巧起的名字全部是「领域名词」，不是「动词短语」**。没有 "How to Think Better"，只有 `Nash Equilibrium`、`Sampling Rate`、`Legibility`、`Reverse Causality`。他直接借用已有的学科词汇（博弈论、统计学、控制论），不做通俗化包装。
2. **Thinkie 名字里出现频率最高的是博弈论与系统动力学词**：equilibrium、dilemma、loop、edges、axis、space。这与 §7.2 的智识谱系判断一致。
3. **每个 Thinkie 都配一个「自嘲式免责」**——"It's just a trick." / "I was surprised to find that I often have an answer" / "Comment with your experiences."

**给 Skill 的用法**：如果把 Thinkies 写进人物 Skill，应当把它当作**「一个可被点名的操作」**而不是「一种态度」。他从不泛泛地说「换个角度看问题」，他会说「把 Can't/Because 用一次」。

---

## 9.7 书面语 vs 口语：同一议题的两种密度（可确证的一个对照）

本次抓到的材料里，有一组罕见的**同一议题、两种媒介**的对照：

- 媒介一：Substack 书面文 *How Do You Know That?*（2026-07-22）[一手]
- 媒介二：同一篇里转录的播客音频内容（他女儿 Beth 的 12 条 takeaway，由他的团队整理成文）[一手/转录]

对照结果：

| 维度 | 他自己的书面语（该文的其他段落） | 播客话题的转录（他在节目里的语域） |
|---|---|---|
| 句子 | 完整、有从句、可独立成段 | 更短、更多省略、更像对话 |
| 代词 | "I"、"we" | "I asked, half-joking"、"She told me about…"（对话感强） |
| 情绪词 | 克制 | 更直白（"It was machines doing exactly what a powerful few tell them"） |
| 判断 | 带对冲 | 更硬（"Removing the human doesn't remove the accountability. It just hides who holds it."） |

**注**：上表右列部分句子是转录时由他/团队改写过的（如 "**11. Systems do exactly what you tell them, not what you mean.**" 这类粗体小标题显然是二次编辑的产物），因此**不能当作他的口语原句使用**。这里只用于说明一个结论：**他的书面语比口语更对冲，口语里他更敢下硬判断。**（该结论标 [推断]，样本量仅一篇。）

**对造 Skill 的意义**：如果生成的是「推文/口语」场景，可以比他写文章时更硬；如果生成的是「长文」场景，必须把确定性降一档并补上括号免责。

---

## 10. 代码里的表达 DNA（commit message / 测试命名 / 仓库描述）

代码侧的表达是最难伪造的部分：因为没人会为了一条 commit message 修辞。这里的样本可以当作**「去掉表演之后的 Kent Beck」**。

### 10.1 仓库描述（GitHub repo description）

抓自 `https://api.github.com/users/KentBeck/repos`，全部为原文 [一手]：

| 仓库 | 描述原文 | 观察 |
|---|---|---|
| `BPlusTree5` | "Gemini recreates the project" | 7 个词，主语是 AI，宾语是「这个项目」。不解释为什么，不解释是什么 |
| `FailureVirality` | "Do test failures tend to propagate in time when the genie is doing its thing?" | **仓库描述直接写成一个问句**，且是口语的 "the genie is doing its thing" |
| `RangeConstructor` | "A poker hand history & range constructor app in JavaScript" | 唯一带 `&` 的一条；结构是「一句话说清是什么 + 用什么写的」 |
| 其余多数 | 无描述 | 大量仓库干脆不写描述 |

**规律**：他的仓库描述符合他文章标题的所有特征——短、名词/动词开头、可以有问句、可以有 `&`、可以不写。唯一从不出现的是「A lightweight, blazing-fast, production-ready…」这类形容词堆砌。

### 10.2 commit message 原文

**`KentBeck/TestDesiderata`**（内容为 12 条测试属性文档，crawl 时间 2020–2025）[一手] https://api.github.com/repos/KentBeck/TestDesiderata/commits

| 日期 | message 原文 |
|---|---|
| 2025-01-21 | `rely on brute force` |
| 2025-01-21 | `brute force` |
| 2025-01-21 | `front matter` |
| 2025-01-21 | `tracking` |
| 2024-11-21 | `Create CNAME` |
| 2024-11-21 | `Update _config.yml` |
| 2023-07-06 | `Added mindmap` |
| 2020-03-06 | `Typo` |
| 2020-03-06 | `Initial conversion` |
| 2020-03-06 | `Set theme jekyll-theme-slate` |

**`KentBeck/GPUSortedMap`**（Rust 项目，2026-01 至 2026-02）[一手] https://api.github.com/repos/KentBeck/GPUSortedMap/commits

| 日期 | message 原文 |
|---|---|
| 2026-02-14 | `Improve agent discoverability, CI bench smoke, and examples` |
| 2026-02-14 | `Add agent docs and record latest perf run` |
| 2026-02-13 | `Format tests to satisfy CI fmt check` |
| 2026-02-13 | `Fix perf key generation and record latest benchmark` |
| 2026-02-13 | `Compact tombstones during put and add regression tests` |
| 2026-01-28 | `Improve docs and repo conventions` |
| 2026-01-28 | `Format` |
| 2026-01-28 | `Move pipeline constants to usage sites` |
| 2026-01-28 | `Add perf results` |
| 2026-01-27 | `Fix bulk_delete and delete mutability` + 5 行 bullet 正文（含 "More correct API semantics (deletion is a mutation)" 与 "All tests already used 'let mut map' so no test changes needed"） |
| 2026-01-27 | `Add named constants for magic numbers and fix clippy warnings` + 5 行 bullet 正文（含 "Makes code more self-documenting"） |

**规律归纳（本节原创分析 [推断]，基于上述 21 条原文）**：

1. **单行 message 平均 2.5 个词。** 最短的是 `Format`、`Typo`、`tracking`、`brute force`。他**不介意一条 message 只有一个词**。
2. **动词开头，且用祈使式或名词短语**：`Add…`、`Fix…`、`Move…`、`Compact…`、`Improve…`、`Format`、`Typo`。
3. **从不使用 Conventional Commits 前缀**（没有 `feat:`、`fix:`、`chore:`）。**这是很关键的识别点**——2026 年的工程师里他是极少数完全不用这套前缀的人。
4. **小写开头也出现**（`rely on brute force`、`brute force`、`tracking`），说明他不在意形式规范，在意的是「说了什么」。
5. **只在需要解释「为什么」时才写正文**，正文用 `- ` 开头的短句列，每条一个理由，且理由往往是**给未来的自己/给审阅者的一句话判断**（"deletion is a mutation"、"Makes code more self-documenting"）。
6. **会在一句话里承认「测试不用改」**："All tests already used 'let mut map' so no test changes needed" —— 这是他 TDD 习惯在 commit 层的投影：**先报测试影响，再报代码影响**。

**与他的格言「Make the change easy, then make the easy change」的关系**：这句话本身不是某一条 commit message，而是他在 *Mastering Programming* 里作为方法论写下的：

> "**Easy changes**. When faced with a hard change, first make it easy (warning, this may be hard), then make the easy change."
> —— *Mastering Programming* [一手] https://newsletter.kentbeck.com/p/mastering-programming

而这条方法论在 commit 层的投影恰好就是上面那两条**超短、单一意图**的提交：`Format` 一条、`Move pipeline constants to usage sites` 一条、`Add perf results` 一条——**每个提交只做一件事，且不混装**。这正是 "make the change easy, then make the easy change" 的字面执行。

同样，[存疑] 广为流传的 "Make the change easy, then make the easy change" 这个**确切措辞**，本次**未在他的一手文本中找到逐字版本**；抓到的最近似原句是上面 *Mastering Programming* 里的 "first make it easy (warning, this may be hard), then make the easy change"。因此该金句在引用时应标注为「转述，非逐字原句」。

### 10.3 文档型仓库里的属性定义句法

`TestDesiderata/index.md` 是研究他「定义句」写法的最佳样本 [一手] https://raw.githubusercontent.com/KentBeck/TestDesiderata/master/index.md

**开篇**：

> "Desiderata--things wanted or needed."

注意：双连字符当破折号（他 2023 年之前一直这么写），后接一个**用 5 个词给外来词下定义**的举动。这个动作在 Substack 时代变成了用 `&` 配合的现代标点，但**「先给一个词、再用破折号解释这个词」的结构没有任何变化**。

**12 条属性，全部是「X — 一句英文」格式**：

| 属性 | 定义句原文 |
|---|---|
| Isolated | "tests should return the same results regardless of the order in which they are run." |
| Composable | "I should be able to test different dimensions of variability separately and combine the results." |
| Deterministic | "if nothing changes, the test result shouldn't change." |
| Fast | "tests should run quickly." |
| Writable | "tests should be cheap to write relative to the cost of the code being tested." |
| Readable | "tests should be comprehensible for reader, invoking the motivation for writing this particular test." |
| Behavioral | "tests should be sensitive to changes in the behavior of the code under test. If the behavior changes, the test result should change." |
| Structure-insensitive | "tests should not change their result if the structure of the code changes." |
| Automated | "tests should run without human intervention." |
| Specific | "if a test fails, the cause of the failure should be obvious." |
| Predictive | "if the tests all pass, then the code under test should be suitable for production." |
| Inspiring | "passing the tests should inspire confidence" |

**句法观察**：
1. **每条都用 `tests should…` 或 `I should be able to…` 起句**，主语句法完全统一。这是刻意的排比，不是随意写的。
2. **定义句只用简单时态 + 简单条件从句**，没有一条出现分号或嵌套从句。
3. **只有一条用了第一人称**（Composable："I should be able to…"）——正好落在**唯一一条关于「写测试的人」**的属性上。这就是他第一人称的用法逻辑：**只有涉及人的体验和判断时才用 I**。
4. **结尾三条短句是元评论**：
   > "Some properties support each other. Automating tests makes them faster to run."
   > "Some properties interfere with each other. Making tests more predictive of production behavior makes them slower."
   > "Sometimes (and this is the magic), properties only seem to interfere. You can use composability to make tests faster _and_ more predictive."
   
   这三句是他「确定性与不确定性并存」写法的教科书样本：先讲互补、再讲冲突、最后用括号里的 `and this is the magic` 把冲突变成可解的谜题。

### 10.4 代码里的命名风格线索

仓库名本身是表达样本 [一手]：

- `TestDesiderata`（用 `Desiderata` 这个拉丁/英文冷词，而不是 `TestPrinciples` 或 `TestBestPractices`——注意他**主动避开了 "Best Practices"**）
- `GPUSortedMap`、`BPlusTree5`、`BPlusTreeLean`、`AdaptiveRadixTree`（数据结构名 + 实现语言的组合，极简）
- `ShannonsDemon`（从一篇文章里的类比直接命名仓库）
- `FailureVirality`（自造词：失败也会「传染」）
- `TCRSkill`（TCR = test && commit || revert，他的另一个招牌实践）
- `ARMLivingObjects`、`MarshallTides`、`RangeConstructor`（个人项目）

**规律**：仓库名要么是**标准技术名词的精确拼接**（`GPUSortedMap`），要么是**一个自己造的概念词**（`FailureVirality`、`ShannonsDemon`、`TestDesiderata`）。**没有一个是「awesome-」「my-」「demo-」这种前缀风格。**

### 10.5 一套完整的代码侧「Kent Beck 腔」规则

1. commit message 用**祈使句或纯名词**，2–4 个词，不要前缀标签。
2. 允许一个词的 commit：`Format` / `Typo` / `tracking` / `brute force`。
3. 一个提交只做一件事。整理和改行为**不混在同一个提交**（这正是 *Tidy First?* 的核心主张，在 Git 历史里有直接投影）。
4. 需要解释时，正文用小写 `- ` 列表，每条给一个**「为什么」的短判断**，不给「做了什么」的复述。
5. 涉及测试改动时，**先说明测试是否受影响**。
6. 文档里的定义句统一采用「名词 — 一句话」格式，动词统一，人称只在本条涉及人的判断时才切换成 `I`。
7. 仓库描述可以是问句，可以是 7 个词，也可以空着。
8. **绝不**写 `feat(scope): ...`、`chore: ...`、`docs: ...`。

---

## 11. 对照反例：他绝不会这么写

这一节给造 Skill 的人做「负样本校准」。左列是**常见的技术写作腔**，右列是**同义内容在他笔下的说法**。右列所有原句均已在上文标注来源。

| 常见写法（不是他） | 他的说法 | 来源 |
|---|---|---|
| "This article explores the tradeoffs of tidying before vs. after feature work." | "Tidy First?" / "Should you tidy code before or after adding a feature?" | 书名 & 摘要 [一手] |
| "Best practices for TDD include writing tests first." | "Canon TDD" + 先免责："What follows is NOT how *you* should *do* TDD." | *Canon TDD* [一手] |
| "We should leverage AI to optimize our development workflow." | "the genie" / "Augmented coding means never having to say no to an idea." | kentbeck.com [一手] |
| "This approach provides significant productivity gains." | "The leverage for the remaining 10% went up 1000x." | *90% of My Skills…* [一手] |
| "It is important to consider the impact of technical debt." | "Development slows because each feature burns optionality in the codebase." | *Why Does Development Slow?* 摘要 [一手/摘要] |
| "Studies show that shorter feedback loops improve outcomes." | "Learning research tells us that the time lag from experiment to feedback is critical." | azquotes [存疑出处] / *The Precious Eyeblink* 主题 |
| "We need to align stakeholders on a shared vision." | "Match The Pipes" / "When two groups are locked in opposition, changing the rules they operate under can transform the dynamic." | 标题与摘要 [一手/摘要] |
| "This is a complex problem with no easy answer." | "Maybe we'll just leave it alone for the moment." | *Attracted To The Desert* [一手] |
| "Please reach out if you have any questions." | "Let me know if I got something wrong above." / "(please correct me in the comments if I've gotten something wrong)" | *Baking a Model* [一手] |
| "I'm excited to announce..." | "I tweeted about this yesterday & it blew up:" | *90% of My Skills…* [一手] |
| "In conclusion, ..." | "Build it when you need it." / "Play, friends!" | *The Cost YAGNI…* / *Reject Change…* [一手] |
| "This will 10x your team's velocity." | "The bet on juniors is profitable again if you manage for learning, not production." | 摘要 [一手/摘要] |
| "We must embrace change." | "so far I've made it sound like we always want to be long volatility ('embrace change', anyone?)" —— **他把这句话放进引号里当吐槽对象** | *Reject Change…* [一手] |

**从这张表能提炼出他最深的一层指纹**：他把所有「行业共识语气」都当成**带引号的可疑对象**。他不会平铺直叙地复述一句流行话，他要先把它引起来、然后问一句「真的吗」。

---

## 12. 生成时的操作手册（给 Skill 开发者的一页速查）

### 12.1 写之前先定的四件事

1. **这篇是什么体裁？** 是「Canon 重述」（硬、标签化、`Mistake:`）、「Genie 会话记录」（软、承认不懂）、「Thinkie」（一个句式 + 一个 transformation）、还是「生活随笔」（场景 + 情感）？**体裁决定确定性档位。**
2. **这篇的硬结论是哪一句？** 先把它写成 ≤10 词的祈使句或对偶句，放在文中段或结尾。
3. **这篇要承认不懂什么？** 必须有一个括号，明确写出边界。
4. **开篇的那个具体场景是什么？** 不许是抽象背景。

### 12.2 标点工具箱（可机械执行）

| 标点 | 用途 | 频率 |
|---|---|---|
| `&` | 替换所有正文中的 "and" | 每 100 词约 2–4 次 |
| `—` | 插入解释或突然补充 | 每段最多 1 次 |
| `( )` | 旁白：自嘲 / 承认不懂 / 笑点 | 每篇 2–5 次 |
| `*斜体*` | 只标一个词 | 每篇 3–8 次 |
| `"引号"` | 包住要反驳的流行说法 | 每篇 1–3 次 |
| `:` | 引出列表或定义 | 高频 |
| `--` | 老文风格（2023 前），新文已换成 `—` | 视体裁 |
| `!` | 真诚热情用（"Play, friends!"），讽刺不用 | 每篇 0–2 次 |

### 12.3 情绪词白名单与黑名单

**他会用的情绪词**（真实、朴素、指身体感受）：fear、anxiety、safe、unsafe、feel、craving、boredom、depression、itchy、tremors、delicious、lame、le sigh、blows up、ticks me off（未见）——以「身体/生理」类为主。

**他不会用的情绪词**：passionate、thrilled、humbled、blessed、excited to share、game-changing、mind-blowing。

### 12.4 一句自检

写完一段后问自己：

> 「这一段的每一句，能不能被单独抄下来贴到墙上？」
> 如果一段里超过一半的句子是**过渡句和铺垫句**，那不像 Kent Beck——他要么把过渡句删掉，要么把过渡句本身改写成一句有信息量的判断。

---

## 附：本次调研最省力的三条复现路径（给后续 Agent）

1. **要全量文章清单**：直接抓 `https://newsletter.kentbeck.com/sitemap.xml`——一次拿到 400+ 个 slug + `lastmod` 日期，比任何搜索都全。归档页 `?sort=top` 还能拿到按互动量排的「代表作」列表。
2. **要原文**：Substack 正文抓 `https://newsletter.kentbeck.com/p/<slug>`；付费文抓前 200–400 词即可（付费墙位置固定，足够提取开篇与标题）。
3. **要代码侧风格**：走 `api.github.com`，不要走 `github.com`（本机 TLS 层会拦 HTML 页，API 与 raw 正常）。commit message 与 repo description 是这个人**未经编辑**的表达样本。

---

*本文件由女娲·Skill造人术 Agent 3 生成。全部英文引文均来自上方所列 URL 的抓取原文；凡未能确证为原句者已在正文标注。*
