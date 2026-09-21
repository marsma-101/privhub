# Simon Willison · 对话类素材（播客 / 演讲 / 深度访谈 / AMA）

> **聚焦方向**：把 LLM 当成「极快但会自信说错的协作者」——一切产出必须有可运行的验证兜底。
> **重点抓取**：他在被追问时的即兴反应、类比、立场转变、拒答、自述工作流。
>
> **信源分级标记**
> - `[一手]` = 访谈/演讲原文、录音逐字稿、他本人对逐字稿的亲手摘录
> - `[二手]` = 他人转述、节目页摘要、我未直接抓取到正文的页面
> - `[推断]` = 萧潇根据多条证据做的判断，非他原话
>
> **时间锚点**：每条均标年月。他关于 LLM 的观点**过期极快**，请务必带上时间读。
> 本文件核验日期基准：2026 年 9 月（其博客最新文章为 2026-09-12）。

---

## 〇、一条重要的取材说明

Simon Willison 有一个**对研究者极其友好的习惯**：他几乎每上一次播客或讲一次 talk，都会在自己博客上发一篇「highlights」帖子，贴上**他自己从 Whisper 逐字稿里挑出来的原话 + 时间戳 + 跳转链接**。

因此本文件里的「一手原话」有两种：

| 类型 | 含义 | 可信度 |
|---|---|---|
| A 类一手 | 他本人逐字稿摘录帖里的引号原文（他亲手编辑过） | 最高——既是原话，又经本人确认 |
| B 类一手 | 我直接抓取到的节目/演讲逐字稿全文（如 Rooftop Ruby 全稿） | 高 |

**A 类的风险**：他挑的是「自己最满意的表达」，可能比现场原话更精炼（他自己也承认会「tidy up manually」）。**引用时不要把 A 类当成未经修饰的即兴口语。**

---

## 一、对话 / 演讲清单（名称 + 时间 + URL）

### 1.1 播客（按时间倒序）

| 时间 | 节目 / 标题 | 主持人 | URL | 分级 |
|---|---|---|---|---|
| 2026-08 | **Talking Postgres** — How AI is changing software development | Claire Giordano | https://talkingpostgres.com/episodes/how-ai-is-changing-software-development-with-simon-willison | `[一手]`（他发了逐字稿摘录，见 §5.4；节目完整逐字稿**未核实**） |
| 2026-07-27 | **Oxide and Friends** — The Open Weight Revolution | Bryan Cantrill / Adam Leventhal | https://oxide-and-friends.transistor.fm/episodes/the-open-weight-revolution-with-simon-willison | `[二手]`（节目页；其博客摘录见 https://simonwillison.net/2026/Jul/31/oxide-and-friends/ ） |
| 2026-05 | **Heavybit High Leverage** Ep.#9 — The AI Coding Paradigm Shift | Joseph Ruscio | https://www.heavybit.com/library/podcasts/high-leverage/ep-9-the-ai-coding-paradigm-shift-with-simon-willison | `[一手]`（他发摘录；完整页**未核实**） |
| 2026-04-02 | **Lenny's Podcast** — An AI state of the union（1h40m） | Lenny Rachitsky | https://www.lennysnewsletter.com/p/an-ai-state-of-the-union ｜ YouTube: https://youtu.be/wc8FBhQtdsA | `[一手]`（Substack 正文付费墙，但他在博客发了 3500 字摘录，见 §5.5；YouTube 章节表完整可查） |
| 2026-01-06 | **Oxide and Friends** Predictions 2026（直播录制） | Bryan Cantrill | https://oxide-and-friends.transistor.fm/episodes/predictions-2026 ｜ 他在博客的预测全文：https://simonwillison.net/2026/Jan/8/llm-predictions-for-2026/ | `[一手]` |
| 2025-11 | **Heavybit Data Renegades** — Data Journalism Unleashed | CL Kao / Dori Wilson | https://www.heavybit.com/library/podcasts/data-renegades/ep-2-data-journalism-unleashed-with-simon-willison ｜ 博客摘录：https://simonwillison.net/2025/Nov/26/data-renegades-podcast/ | `[一手]` |
| 2025-08-13 | **Screaming in the Cloud** — AI's Security Crisis: Why Your Assistant Might Betray You | Corey Quinn | https://www.lastweekinaws.com/podcast/screaming-in-the-cloud/ai-s-security-crisis-why-your-assistant-might-betray-you/ | `[二手]`（节目页摘要） |
| 2025-08 | **Talking Postgres** — AI for data engineers | Claire Giordano | https://talkingpostgres.com/episodes/ai-for-data-engineers-with-simon-willison | `[二手]`（他给了要点清单） |
| 2025-07-11 | **Heavybit Generationship** Ep.#39 — "I coined prompt injection" | Rachel Chalmers | https://www.heavybit.com/library/podcasts/generationship/ep-39-simon-willison-i-coined-prompt-injection | `[一手]`（他摘了唯一一段：命名"世代飞船"为 Squadron） |
| 2025-05-30 | **NewsNation** 电视访谈 — AI 与就业 | Natasha Zouves | https://simonwillison.net/2025/May/30/ai-and-jobs-with-natasha-zouves/ | `[一手]` |
| 2025-04-01 | **Half Stack Data Science** S4E2 — Programming with AI（50 分钟） | David Asboth / Shaun McGirr | https://halfstackdatascience.com/s4e2-programming-with-ai-with-simon-willison | `[一手]`（他摘了 27:47 一段长引） |
| 2025-03-02 | **Accessibility + Gen AI Podcast** Ep.6 | Eamon McErlean / Joe Devon | https://accessibility-and-gen-ai.simplecast.com/episodes/ep-6-simon-willison-datasette ｜ 博客摘录：https://simonwillison.net/2025/Mar/2/accessibility-and-gen-ai/ | `[一手]` |
| 2025-01-24 | **Real Python** RPP #236 — Using LLMs for Python Development | Christopher Bailey | https://realpython.com/podcasts/rpp/236/ | `[一手]`（博客摘录） |
| 2025-01-14 | **Techmeme Ride Home** — Simon Willison And SWYX Tell Us Where AI Is In 2025 | Brian McCullough / swyx | https://www.ridehome.info/show/techmeme-ride-home/bns-simon-willison-and-swyx-tell-us-where-ai-is-in-2025/ ｜ YouTube: https://www.youtube.com/watch?v=i4GIuFlDwiY | `[一手]` |
| 2025-01-06 | **Oxide and Friends** Predictions 2025 | Bryan Cantrill | YouTube: https://www.youtube.com/watch?v=-pk6VokHpGY ｜ 预测全文：https://simonwillison.net/2025/Jan/10/ai-predictions/ | `[一手]` |
| 2024-12-02 | **Around the Prompt** — The Future of Open Source and AI | Logan Kilpatrick / Nolan Fortman | https://www.youtube.com/watch?v=rLcKbvmegag | `[一手]`（40m05s 讲"为什么不觉得被 LLM 威胁"） |
| 2024-11-19 | **Ars Live**（Ars Technica）— Bing Chat：第一次遭遇操纵性 AI | Benj Edwards | https://simonwillison.net/2024/Nov/19/notes-from-bing-chat/ | `[一手]` |
| 2024-09-25 | **The Pragmatic Engineer** 首期 — AI tools for software engineers, but without the hype | Gergely Orosz | https://newsletter.pragmaticengineer.com/p/ai-tools-for-software-engineers-simon-willison | `[一手]`（他本人只留了一句推荐；剪出的开源片段见 https://simonwillison.net/2024/Sep/30/talking-about-open-source/ ） |
| 2024-09-17 | **TWIML AI** — Supercharging Developer Productivity with ChatGPT and Claude | Sam Charrington | https://twimlai.com/podcast/twimlai/supercharging-developer-productivity-with-chatgpt-and-claude/ ｜ 博客摘录：https://simonwillison.net/2024/Sep/20/using-llms-for-code/ | `[一手]` |
| 2024-09-10 | **Software Misadventures** — *LLMs are like your weird, over-confident intern* | Ronak Nathani / Guang Yang | https://softwaremisadventures.com/p/simon-willison-llm-weird-intern ｜ 视频：https://www.youtube.com/watch?v=6U_Zk_PZ6Kg ｜ 博客逐字稿摘录：https://simonwillison.net/2024/Sep/10/software-misadventures/ | `[一手]` ★核心素材 |
| 2024-01-24 | **Django Chat** — Datasette, LLMs, and Django | Carlton Gibson / Will Vincent | https://djangochat.com/episodes/datasette-llms-and-django-simon-willison | `[一手]` |
| 2024-01-15 | **Oxide and Friends** — Open Source LLMs | Bryan Cantrill / Adam Leventhal | https://oxide.computer/podcasts/oxide-and-friends/1692510 ｜ 博客摘录：https://simonwillison.net/2024/Jan/17/oxide-and-friends/ | `[一手]` |
| 2023-12-20 | **RedMonk Conversation** — prompt injection 与业界的敷衍回应 | Kate Holterhoff | https://redmonk.com/videos/a-redmonk-conversation-simon-willison-on-industrys-tardy-response-to-the-ai-prompt-injection-vulnerability/ | `[一手]`（他摘了 539 字） |
| 2023-12-05 | **Newsroom Robots**（Part Two）— Datasette 与调查报道 | Nikita Roy | https://www.newsroomrobots.com/p/how-datasette-helps-with-investigative | `[一手]` |
| 2023-11-25 | **Newsroom Robots**（Part One） | Nikita Roy | https://simonwillison.net/2023/Nov/25/newsroom-robots/ | `[一手]` |
| 2023-11-08 | **Latent Space** — AGI is Being Achieved Incrementally（OpenAI DevDay 圆桌） | swyx / Alessio | https://www.latent.space/p/devday | `[二手]`（圆桌，他的发言未单独摘出） |
| 2023-09-29 | **Rooftop Ruby** — Talking Large Language Models（**全文逐字稿，约 1.5 万字**） | Collin Donnell / Joel Drapper | https://www.rooftopruby.com/2108545/13676934-26-large-language-models-with-simon-willison ｜ 全文：https://simonwillison.net/2023/Sep/29/llms-podcast/ | `[一手]` ★唯一完整逐字稿 |
| 2023-07-19 | **Latent Space** — Llama 2 发布 | swyx / Alessio | https://www.latent.space/p/llama2 | `[二手]` |
| 2023-03-03 | **KQED Forum** 直播电台（同台：Ted Chiang） | Alexis Madrigal | https://www.kqed.org/forum/2010101892368/how-to-wrap-our-heads-around-these-new-shockingly-fluent-chatbots | `[二手]` |

### 1.2 会议演讲 / 工作坊（他习惯发 annotated slides，等于半个逐字稿）

| 时间 | 演讲 | 场合 | URL | 分级 |
|---|---|---|---|---|
| 2026-05-19 | **The last six months in LLMs in five minutes**（闪电演讲） | PyCon US 2026 | https://simonwillison.net/2026/May/19/5-minute-llms/ | `[一手]` |
| 2026-02-25 | **I vibe coded my dream macOS presentation app**（含 "The State of LLMs, February 2026" 演讲） | Social Science FOO Camp | https://simonwillison.net/2026/Feb/25/present/ | `[一手]` |
| 2025-10-22 | **Living dangerously with Claude** ★ | Claude Code Anonymous（旧金山） | https://simonwillison.net/2025/Oct/22/living-dangerously-with-claude/ | `[一手]` ★核心素材 |
| 2025-08-09 | **The Lethal Trifecta** | Bay Area AI Security Meetup | https://simonwillison.net/2025/Aug/9/bay-area-ai/ | `[一手]`（未录像） |
| 2025-07-13 | Django Origins（Django 十周年旧 talk 重发） | — | https://simonwillison.net/2025/Jul/13/django-birthday/ | `[一手]` |
| 2025-06-06 | **The last six months in LLMs, illustrated by pelicans on bicycles** ★ | AI Engineer World's Fair 主题演讲 | https://simonwillison.net/2025/Jun/6/six-months-in-llms/ ｜ YouTube: https://www.youtube.com/watch?v=YpY83-kA7Bo | `[一手]` ★ |
| 2025-05-15 | **Building software on top of Large Language Models**（3 小时工作坊） | PyCon US 2025 | https://simonwillison.net/2025/May/15/building-on-llms/ | `[一手]` |
| 2025-03-08 | **What's new in the world of LLMs** + 网页抓取工作坊 | NICAR 2025 | https://simonwillison.net/2025/Mar/8/nicar-llms/ | `[一手]` |
| 2024-07-14 | **Imitation Intelligence**（keynote，约 1 万字） | PyCon US 2024 | https://simonwillison.net/2024/Jul/14/pycon/ | `[一手]` ★ |
| 2024-06-27 | **Open challenges for AI engineering**（开场 keynote，24 小时通知） | AI Engineer World's Fair | https://simonwillison.net/2024/Jun/27/ai-worlds-fair/ | `[一手]` |
| 2024-06-17 | **Language models on the command-line** | Mastering LLMs 线上会议 | https://simonwillison.net/2024/Jun/17/cli-language-models/ | `[一手]` |
| 2024-04-17 | **AI for Data Journalism** | Story Discovery at Scale（斯坦福） | https://simonwillison.net/2024/Apr/17/ai-for-data-journalism/ | `[一手]` |
| 2024-02-29 | **The Zen of Python, Unix, and LLMs**（1.5 小时对话） | Hugo Bowne-Anderson | https://www.youtube.com/watch?v=mOzxhcc1I8A | `[一手]`（YouTube 原片） |
| 2023-10-17 | **Open questions for AI engineering**（闭幕 keynote） | AI Engineer Summit | https://simonwillison.net/2023/Oct/17/open-questions/ | `[一手]` |
| 2023-08-27 | **Making Large Language Models work for you**（约 1.4 万字） | WordCamp US 2023 | https://simonwillison.net/2023/Aug/27/wordcamp-llms/ | `[一手]` |
| 2023-08-03 | **Catching up on the weird world of LLMs**（约 1 万字） | North Bay Python | https://simonwillison.net/2023/Aug/3/weird-world-of-llms/ | `[一手]` |
| 2023-05-02 | **Prompt injection explained**（含视频+幻灯片+逐字稿） | LangChain webinar | https://simonwillison.net/2023/May/2/prompt-injection-explained/ | `[一手]` |
| 2023-11-10 | Financial sustainability for open source projects | GitHub Universe | https://simonwillison.net/2023/Nov/10/universe/ | `[一手]` |

### 1.3 文字访谈

| 时间 | 标题 | 采访者 | URL | 分级 |
|---|---|---|---|---|
| 2026-08-06 | Simon Willison on Technical Blogging | Cynthia Dunlop | https://writethatblog.substack.com/p/simon-willison-on-technical-blogging | `[一手]` |
| 2024-01-24 | AI software still needs the human touch | Thomas Claburn（The Register） | https://www.theregister.com/2024/01/24/willison_ai_software_development/ | `[二手]` |
| 2023-04-26 | How prompt injection attacks hijack today's top-end AI | Thomas Claburn（The Register） | https://www.theregister.com/2023/04/26/simon_willison_prompt_injection/ | `[二手]`（含大量电话访谈直接引语） |

### 1.4 清单的可信度说明

上述清单来自他博客的三个 tag 索引页，属于**他本人维护的权威列表**：
- https://simonwillison.net/tags/podcasts/ （50 篇，page 1 已抓）
- https://simonwillison.net/tags/podcast-appearances/ （41 篇，page 1 已抓）
- https://simonwillison.net/tags/my-talks/ （93 篇，page 1 已抓）
- https://simonwillison.net/tags/interviews/ （9 篇，已全抓）

**未核实**：tags 页第 2 页起的内容我未抓取，因此 2023 年及更早的播客、以及 2023 年之前的 talk 清单不完整。
**未核实**：Changelog 播客 —— 我在其博客查 `tags/changelog/` 返回 404，`podcasts` 与 `podcast-appearances` 索引页（page 1）中**未见 Changelog 记录**。**任务提示中"他上过 Changelog"这一条我未能证实**，请勿采信。

---

## 二、被追问时的回答模式

### 2.1 被问「你就这么信任 AI 写的代码？」——他从不说"我信任"，他说"我验证"

> **这是他最稳定的回答结构：把"信任"这个命题直接偷换成"验证"。**

**[2023-09] 最早的版本：代码幻觉是"最不自危"的幻觉** `[一手]`（Rooftop Ruby 全文逐字稿）

> **Simon Willison**: "This is one of the things I love about it for code, is that it's almost immune to hallucinations in code because it will hallucinate stuff and then you run it and it doesn't work.
>
> Hallucinating facts about the world is difficult because how do you fact check them? But if it hallucinates a piece of code and you try it and you get an error, you can self-correct pretty quickly."
>
> 中文：这也是我喜欢用它写代码的原因之一——**代码几乎对幻觉免疫**，因为它会胡编，然后你跑一下，跑不通。胡编关于世界的事实很难查证；但如果它胡编了一段代码，你一试就报错，很快就能自我修正。
>
> 出处：Rooftop Ruby 播客 28:59 段落，https://simonwillison.net/2023/Sep/29/llms-podcast/

**[2025-03-02] 把这个直觉升级成一篇专门的论证** `[一手]`（博客长文，非对话，但被反复追问逼出来的）

标题即结论：**"Hallucinations in code are the least dangerous form of LLM mistakes"**（代码里的幻觉是 LLM 错误中最不危险的一种）。

> "The real risk from using LLMs for code is that they'll make mistakes that *aren't* instantly caught by the language compiler or interpreter. And these happen *all the time*!"
>
> 中文：真正的风险是那些**不会被编译器或解释器立刻抓住**的错误。而这类错误**多得是**。
>
> "With code you get a powerful form of fact checking for free. Run the code, see if it works."
>
> 中文：写代码这件事自带一套强大的免费事实核查。**跑一下，看它行不行。**
>
> "If you're using an LLM to write code without even running it yourself, *what are you doing?*"
>
> 中文：如果你用 LLM 写代码却连自己跑都不跑——**你到底在干什么？**
>
> "Just because code looks good and runs without errors doesn't mean it's actually doing the right thing. No amount of meticulous code review—or even comprehensive automated tests—will demonstrably prove that code actually does the right thing. You have to run it yourself!"
>
> 中文：代码长得漂亮、跑起来不报错，不等于它在做对的事。**再细的 code review、再全的自动化测试，都无法证明代码真的做对了事。你必须自己跑。**
>
> "A general rule for programming is that you should *never* trust any piece of code until you've seen it work with your own eye—or, even better, seen it fail and then fixed it."
>
> 中文：一条通用规则：**在看到它亲手跑通之前，不要信任任何一段代码**——更好的情况是，看它先失败、再被你修好。
>
> 出处：https://simonwillison.net/2025/Mar/2/hallucinations-in-code/

**[2025-12-18] 把"验证"拔高成职业定义** `[一手]`

> "**Your job is to deliver code you have proven to work.**"
>
> 中文：**你的职责是交付你已证明能工作的代码。**
>
> "There are two steps to proving a piece of code works. Neither is optional. The first is **manual testing**. ... The second step ... is **automated testing**."
>
> 中文：证明代码能用有两步，**哪一步都不能省**。第一步是手动测试，第二步是自动化测试。
>
> "**A computer can never be held accountable.** That's your job as the human in the loop."
>
> 中文：**计算机永远无法承担责任**。这就是你作为人在环中的职责。
>
> 出处：https://simonwillison.net/2025/Dec/18/code-proven-to-work/

**⚠ 注意这里的立场漂移（2025-03 → 2025-12）**：3 月他说"手动跑一下"就够顶事；12 月他改成"手动 + 自动，两步都不可选"，并且明确说"因为有了 LLM 工具，跳过自动化测试这一步**已经没有任何借口**"。这是被 agent 时代逼出来的加码。

### 2.2 被问「vibe coding 会不会出事？」——他先划界，再承认自己的界限正在塌

**[2025-03-19] 划界：vibe coding = **不读代码**地建软件** `[一手]`

> "When I talk about vibe coding I mean **building software with an LLM without reviewing the code it writes**."
>
> 中文：我说 vibe coding，指的是**用 LLM 建软件、但不审阅它写的代码**。
>
> "My golden rule for production-quality AI-assisted programming is that I won't commit any code to my repository if I couldn't explain exactly what it does to somebody else."
>
> 中文：我对生产级 AI 辅助编程的黄金法则是：**如果我不能向别人准确解释这段代码在干什么，我就不把它提交进仓库。**
>
> 出处：https://simonwillison.net/2025/Mar/19/vibe-coding/

他还给了一份"什么时候可以 vibe code"的清单（同上链接 §When is it OK to vibe code?）：**低风险**、**考虑安全（密钥/数据隐私）**、**做网络好公民**、**别让钱暴露在计费接口上**。并原话建议："如果你打算 vibe code 任何可能被别人用的东西，我建议先找比你更有经验的人做一次 vibe check（哈）。"

**[2026-04-02] 给 Lenny 的版本（1 小时 40 分访谈）** `[一手]`

> "If you're vibe coding something for yourself, where the only person who gets hurt if it has bugs is you, go wild. That's completely fine. **The moment you ship your vibe coding code for other people to use, where your bugs might actually harm somebody else, that's when you need to take a step back.**"
>
> 中文：如果你给自己 vibe code 点东西，出 bug 只伤到你一个人，那就放开搞，完全没问题。**一旦你把自己 vibe 出来的代码交付给别人用、你的 bug 可能真的伤到别人，那一刻你就必须退一步。**
>
> 出处：Lenny's Podcast 09:55，转引 https://simonwillison.net/2026/Apr/2/lennys-podcast/

**[2026-05-06] ★关键：他承认"这两件事在我这里已经开始模糊了，这让我挺不安"** `[一手]`

这是他**最接近"犹豫"的一次公开表态**，值得整段引用：

> "Weirdly though, those things have started to blur for me already, which is quite upsetting."
>
> 中文：奇怪的是，**这两件事在我这儿已经开始模糊了，这让我相当不安。**
>
> "The problem is that as the coding agents get more reliable, **I'm not reviewing every line of code that they write anymore, even for my production level stuff.**"
>
> 中文：问题在于，随着 coding agent 变得越来越可靠，**我已经不再逐行审阅它们写的代码了，连生产级的东西也不看。**
>
> "But I'm not reviewing that code. And now I've got that feeling of guilt: **if I haven't reviewed the code, is it really responsible for me to use this in production?**"
>
> 中文：但我不看那些代码。于是我有了一种负罪感：**如果我没审过代码，把它用在生产环境上真的负责吗？**
>
> 他给的自我说服（原文用"team handing over a service"打比方）：
> "I'm starting to treat the agents in the same way. And it still feels uncomfortable, because **human beings are accountable for what they do. A team can build a reputation.** ... **Claude Code does not have a professional reputation!** It can't take accountability for what it's done. But it's been proving itself anyway."
>
> 中文：我开始用同样的方式对待 agent。**这仍然让我不舒服**，因为**人是可以被追责的，一个团队能积累声誉**……**Claude Code 没有职业声誉！** 它无法为自己的所作所为负责。但无论如何，它一直在自我证明。
>
> "There's an element of **the normalization of deviance** here—every time a model turns out to have written the right code without me monitoring it closely there's a risk that I'll trust it at the wrong moment in the future and get burned."
>
> 中文：这里面有**"偏差的常态化"**的成分——每次模型在我没盯紧的情况下写对了代码，都会增加我将来在错误时刻信任它、从而被烧到的风险。
>
> 出处：High Leverage 播客，转引 https://simonwillison.net/2026/May/6/vibe-coding-and-agentic-engineering/

**⚠ 这是本次调研最重要的发现之一**：他在 2025-03 划下的"生产代码必须逐行审"这条线，**到 2026-05 他自己已经跨过去了**，而且他明确用「upsetting / guilty / uncomfortable」三个词标注了不适，同时**没有撤回对 vibe coding 的边界主张**——他选择的是"保留原则，承认自己做不到"。

### 2.3 被问「这不是会废掉程序员吗？」——他区分"岗位"与"岗位内容"

**[2023-09]** `[一手]`

> "I don't feel people are going to lose their jobs to AIs, they're going to lose their jobs to somebody who is using an AI and has increased their productivity to the point that they're doing the work of two or three people."
>
> 中文：我不认为人们会输给 AI 而丢工作，**他们会输给那些用了 AI、把生产力提到能干两三个人活的人。**
>
> 出处：Rooftop Ruby，51:56，https://simonwillison.net/2023/Sep/29/llms-podcast/

**[2024-09]** `[一手]`

> "Every now and then you hear a story of a company who got software built for them, and it turns out it was the boss's cousin, who's like a 15-year-old who's good with computers... Maybe we've just given everyone in the world **the overconfident 15-year-old cousin** who's gonna claim to be able to build something, and build them something that maybe kind of works. And maybe society's okay with that?"
>
> 中文：时不时你会听说某家公司找人做了套软件，结果是老板的表弟——一个 15 岁、电脑玩得溜的小孩……**也许我们只是给了世界上每个人一个"过度自信的 15 岁表弟"**，他会声称自己什么都能搭，然后给你搭出个勉强能用的东西。也许社会接受这个？
>
> "This is why I don't feel threatened as a senior engineer, because I know that if you sit down somebody who doesn't know how to program with an LLM, and you sit me with an LLM, and ask us to build the same thing, **I will build better software than they will.**"
>
> 中文：这就是我作为资深工程师不觉得受威胁的原因：让一个不会编程的人配一个 LLM，让我也配一个 LLM，做同一个东西——**我做出来的软件会比他好。**
>
> 出处：Software Misadventures 1:32:12，https://simonwillison.net/2024/Sep/10/software-misadventures/

**[2026-01-08]** `[一手]`

> "I think by three years we will know for sure which way that one went."（指 Jevons 悖论会救工程师还是毁掉工程师）
>
> 中文：**三年之内我们一定会知道到底往哪个方向走了。**
>
> 出处：Oxide and Friends 2026 预测，https://simonwillison.net/2026/Jan/8/llm-predictions-for-2026/

### 2.4 被问「你怎么知道模型不是在作弊/过拟合你的基准？」——他用"我会被抓"和"那更好"来答

**[2025-11-13]** `[一手]`

> "The strongest argument is that **they would get caught**. If a model finally comes out that produces an excellent SVG of a pelican riding a bicycle you can bet I'm going to test it on all manner of creatures riding all sorts of transportation devices."
>
> 中文：最有力的论据是——**他们会被抓到。** 如果真出了个模型能画出完美的鹈鹕骑自行车，你赌我会立刻拿各种生物骑各种交通工具去测它。
>
> "Truth be told, I'm **playing the long game** here. All I've ever wanted from life is a genuinely great SVG vector illustration of a pelican riding a bicycle. My dastardly multi-purpose plan is to trick multiple AI labs into investing vast resources to cheat at my benchmark until I get one."
>
> 中文：说实话，我在**下一盘大棋**。我这辈子想要的，就是一张真正出色的"鹈鹕骑自行车"SVG。我那个阴险的多用途计划，就是**诱骗多家 AI 实验室投入海量资源来作弊刷我的基准，直到我拿到那张图。**
>
> 出处：https://simonwillison.net/2025/Nov/13/training-for-pelicans-riding-bicycles/

**这是理解他表达 DNA 的关键样本**：面对"你没有方法论"的质疑，他不辩护方法论，而是**把质疑翻转成一个笑话，同时保住技术论点**。

---

## 三、即兴类比与比喻（表达 DNA 的核心）

按首次/主要出现时间排列。**这些不是修饰，是他的推理工具**——他几乎总是先给类比，再从类比里推结论。

### 3.1 「诡异的实习生 / weird intern」（贯穿 2023–2025，他最核心的类比）

**[2023-09 原型版]"又聪明又蠢、读完了 2021 年 9 月前所有文档的实习生"** `[一手]`

> "It really is like having an intern who is both really smart and really dumb, and has read every single piece of coding documentation ever produced up until September 2021, but nothing further than that. If your library was released before September 2021, it's going to work great and otherwise it's not."
>
> "It's like having an intern who has read all of the documentation and memorized the documentation for every programming language, and **is a wild conspiracy theorist, and sometimes comes up with absurd ideas, and they're massively overconfident. It's the intern that always believes that they're right.**"
>
> 中文：就像请了个实习生，**又聪明又蠢**，读完了 2021 年 9 月之前产出的每一份编码文档，之后的一概不知。你的库要是 2021 年 9 月前发布的，效果极好；否则不行。
>
> 就像有个实习生**背下了所有编程语言的文档，同时是个狂热的阴谋论者，时不时冒出荒谬想法，而且极度自信——一个永远相信自己是对的实习生。**
>
> "But it's an intern who you can, I hate to say it, you can kind of **bully** them. You can be like, 'Do it again, do that again.' 'No, that's wrong.' And you don't have to feel guilty about it, which is great!"
>
> 中文：但这个实习生——我不太想说——**你是可以欺负的。** 你可以说"再做一遍""不对，重来"，而且**你不必内疚**，这太棒了。
>
> 出处：Rooftop Ruby 41:14 / Software Misadventures 1:18:00

**注意这里有一个未展开的道德暗示**：他把"不必内疚"当作优点。这是个**没有被追问过的问题**——"可以欺负"这个框架是不是在训练使用者以对待工具的方式对待人？（萧潇 `[推断]`：他在采访中从未被问到这个。）

**[2024-09] 最完整的版本（节目拿它当预告片）** `[一手]` —— 见 §2.3 上方引文与 "I call it my weird intern. I'll say to my wife, Natalie, sometimes, 'Hey, so I got my weird intern to do this.'"

**[2024-09 TWIML] 加了"它永远不会累、不会生气"** `[一手]`

> "I call it my weird intern, because it really does feel like you've got this intern who is screamingly fast, and they've read all of the documentation for everything, and they're massively overconfident, and they make mistakes and they don't realize them. **But crucially, they never get tired, and they never get upset.**"
>
> 中文：……但关键在于，**它们永远不会累，也永远不会生气。**
>
> "At three in the morning, I can be like, 'Hey, write me 100 lines of code that does X, Y, and Z,' and it'll do it. It won't complain about it. It's weird having this small army of super talented interns that never complain about anything."
>
> 中文：凌晨三点我说"给我写 100 行实现 XYZ 的代码"，它就写了，一句怨言没有。**拥有一支从不抱怨的天才实习生小军队，感觉挺怪。**
>
> 出处：TWIML，19:53 段落，https://simonwillison.net/2024/Sep/20/using-llms-for-code/

**[2025-03] 换成"过度自信的结对编程搭子"** `[一手]`

> "My current favorite mental model is to think of them as **an over-confident pair programming assistant who's lightning fast at looking things up**, can churn out relevant examples at a moment's notice and can execute on tedious tasks without complaint. **Over-confident** is important."
>
> 中文：我目前最喜欢的思维模型是：把它当成**一个过度自信的结对编程搭子**，查东西快如闪电，随时能甩出相关示例，能毫无怨言地干完枯燥的活。**"过度自信"这四个字很重要。**
>
> "**Don't fall into the trap of anthropomorphizing LLMs** and assuming that failures which would discredit a human should discredit the machine in the same way."
>
> 中文：**别掉进拟人化的陷阱**，别以为那些"放在人身上会毁掉信誉"的失败，会以同样方式毁掉这台机器。
>
> 出处：https://simonwillison.net/2025/Mar/11/using-llms-for-code/

**⚠ 内部张力**：他一边用"实习生/搭子"这种高度拟人化的比喻，一边明确警告别拟人化。这是**贯穿他全部素材的一个未解决的矛盾**，不是我的误读——两条引文相隔仅数段。

### 3.2 「模仿智能 / imitation intelligence」（他自造的概念，用于解释能力边界）

**[2024-09]** `[一手]`

> "I've been thinking about it in terms of **imitation intelligence**, because everything these models do is effectively imitating something that they saw in their training data. And that actually really helps you form a mental model of what they can do and why they're useful. It means that you can think, 'Okay, if the training data has shown it how to do this thing, it can probably help me with this thing.' **If you want to cure cancer, the training data doesn't know how to cure cancer.**"
>
> 中文：我一直用**"模仿智能"**来想这件事，因为这些模型做的一切，本质上都是在模仿它在训练数据里见过的东西。这能帮你建立一个心智模型：**训练数据里见过怎么做的事，它大概能帮上你；训练数据里没有的，它不行。你要是想治好癌症——训练数据不知道怎么治癌症，它就不会凭空造出一个新疗法。**
>
> 出处：Software Misadventures 1:53:35

**这是他"验证兜底"世界观的底层推理**：既然能力上限 = 训练数据里见过的模式，那么"没见过的领域"就必须靠人兜底。这也是他反复说"我不是律师，所以我绝不拿 LLM 的法律意见做人生决定"的原因（见 §4.3）。

### 3.3 「Golden Gate Bridge / 建语言模型没那么难」（用于论证护城河不存在）

**[2023-09]** `[一手]`

> "I compare it to building the Golden Gate Bridge. If you want to build a suspension bridge, that's going to cost you hundreds of millions of dollars and it's going to take thousands of people 18 months. A language model is a fraction of the cost of that."
>
> 中文：我把它比作建金门大桥。建一座悬索桥要花几亿美元、几千人干 18 个月。**语言模型的成本只是它的一小部分。**
>
> 出处：Rooftop Ruby，"Can OpenAI maintain their lead?" 段

### 3.4 「温彻斯特神秘屋 / Winchester Mystery House」（用于论证 coding agent 破坏概念完整性）

**[2026-08-19] ★最新、最好用的一个类比** `[一手]`

> **Simon**: "There's a concept in *The Mythical Man-Month* — **conceptual integrity** — where well-designed software has an integrity to it: there are no surprises in it, it covers exactly the right domain of things, everything fits together and makes sense. That's so much harder with coding agents, where you can have an idea for a feature, run a prompt, and five minutes later you've got the feature. **Your software grows little weird bumps in funny different directions.**"
>
> **Claire Giordano**: "You know my analogy for that? The Winchester Mystery House."
>
> **Simon**: "It's got 140 rooms... for 40 years she kept adding new rooms. **That's exactly the problem with coding agents and software: it's very easy to keep adding new rooms**, because the cost of adding those rooms is so much cheaper. What you end up with is something where the conceptual integrity falls apart — and then it's harder to make decisions about it."
>
> 中文：软件工程里有个概念叫**概念完整性**——设计良好的软件有一种完整感：没有意外，恰好覆盖它该覆盖的领域，各部分契合、说得通。**有了 coding agent 之后这件事难太多了**：你冒出个功能想法，跑个 prompt，五分钟后功能就有了。**你的软件会朝各种奇怪的方向长出小鼓包。**
>
> 温彻斯特神秘屋有 140 个房间……她连着 40 年不断加盖。**这正是 coding agent 与软件的问题所在：加盖新房间太容易了**，因为加盖的成本便宜太多。最后你得到的东西，概念完整性崩掉了——于是你更难对它做决策。
>
> "**It all keeps coming back to discipline. It used to be that the discipline was enforced on you by the amount of time it took.** You'd come up with an idea for a crazy feature and think 'yeah, but that would take me a week — I cannot justify that, so I'll forget about it.' **If it takes an hour, it's so much easier to justify.**"
>
> 中文：说到底还是**纪律**。**过去纪律是由耗时强加给你的**：你冒出个疯狂功能的想法，一算"要一周，划不来，算了"。**现在只要一小时，就太容易说服自己了。**
>
> 出处：Talking Postgres 46:03，转引 https://simonwillison.net/2026/Aug/19/conceptual-integrity-and-counting-lines-of-code/
> 注：他本人注明，维基百科上关于"灵媒"的那段故事有可信来源提出质疑。

**萧潇点评**：这个类比比"weird intern"更适合本次蒸馏方向——它直接说明**为什么验证兜底必须靠纪律而非靠工具**（工具让成本降为零，成本一降，纪律就失去自动执行者）。

### 3.5 「Terminal 界面 / 命令行倒退」与「Tamagotchi」

**[2025-11-26]** `[一手]`

> "The terminal is now accessible to people who never learned the terminal before... But isn't that fascinating that **the cutting edge software right now is it's like 1980s style**—I love that. It's not going to last. That's a current absurdity for 2025."
>
> 中文：现在没学过终端的人也能用终端了……但你不觉得很有意思吗，**当下最前沿的软件长得像 1980 年代的样子**——我喜欢这个。这不会持续。这是 2025 年的一桩当代荒诞。
>
> 出处：Data Renegades，38:22

**[2026-04-02]** `[一手]`

> "A friend of mine said that **OpenClaw is basically a Tamagotchi. It's a digital pet and you buy the Mac Mini as an aquarium.**"
>
> 中文：我一个朋友说，**OpenClaw 本质上就是个电子宠物（拓麻歌子）。它是个数码宠物，而你买的 Mac Mini 就是鱼缸。**
>
> 出处：Lenny's Podcast 1:29:23 段

### 3.6 「记者本来就擅长对付不可靠信源」（用于论证 LLM 适配新闻业）

**[2026-04-02]** `[一手]`

> "You would have thought that AI is a very bad fit for journalism where the whole idea is to find the truth. But the flip side is **journalists deal with untrustworthy sources all the time.** ... **So as long as the journalist treats the AI as yet another unreliable source, they're actually better equipped to work with AI than most other professions are.**"
>
> 中文：你大概会觉得 AI 跟新闻业完全不搭——新闻业的核心是求真。但反过来看，**记者天天都在跟不可靠信源打交道**……**只要记者把 AI 当成又一个不可靠信源，他们其实比大多数职业都更有条件用好 AI。**
>
> 出处：Lenny's Podcast 1:34:58

**这个类比暗含的方法论**：他的"验证兜底"不是工程学特有的，而是**新闻业的信源分级习惯**迁移过来的。这解释了为什么他对"二手信息"如此敏感——职业习惯。

### 3.7 「会画鹈鹕」这个类比本身

**[2025-06-06 ai.engineer 主题演讲]** `[一手]`（这是他公开讲过最多次的一个"非类比式类比"）

> "Everyone needs their own benchmark. So I've been increasingly leaning on my own, which started as a joke but is beginning to show itself to actually be a little bit useful!"
>
> "This is also an unreasonably difficult test for them. Drawing bicycles is really hard! Try it yourself now, without a photo: **most people find it difficult to remember the exact orientation of the frame.** Pelicans are glorious birds but they're also pretty difficult to draw. **Most importantly: pelicans can't ride bicycles. They're the wrong shape!**"
>
> 中文：每个人都需要自己的基准。我越来越依赖我自己那个——它一开始是个笑话，但渐渐显出确实有点用。
>
> 这对它们来说是个不合理的难题。**画自行车真的很难**！你现在就试试，不准看图：大多数人都记不清车架的确切朝向。鹈鹕是极美的鸟，但也很难画。**最关键的是：鹈鹕不会骑自行车。它们的形状不对！**
>
> 出处：https://simonwillison.net/2025/Jun/6/six-months-in-llms/

**[2026-04-02] 补上"为什么这个玩笑基准真的有效"** `[一手]`

> "There appears to be a very strong correlation between how good their drawing of a pelican riding a bicycle is and how good they are at everything else. **And nobody can explain to me why that is.**"
>
> 中文：**它们画鹈鹕骑自行车的水平，和它们做其他所有事情的水平之间，存在极强的相关性。而没人能向我解释为什么。**
>
> "I think something people often miss is that **this space is inherently funny.** The fact that we have these incredibly expensive, power hungry, supposedly the most advanced computers of all time. And if you ask them to draw a pelican on a bicycle, it looks like a five-year-old drew it. That's really funny to me."
>
> 中文：我觉得有件事大家常忽略：**这个领域本身就是好笑的。** 我们有了史上最贵、最耗电、号称最先进的计算机，然后你让它画个鹈鹕骑自行车，画得像个五岁小孩画的。**这对我来说真的很好笑。**
>
> 出处：Lenny's Podcast 56:10 / 59:56

---

## 四、立场变化的瞬间（★ 本次调研重点）

> 他的观点过期极快。以下每一条都标了**变化前 → 变化后**与**触发事件**。

### 4.1 ★★ 对 agent 自主性的态度：从"agent 不会成事"到"我天天跑 YOLO 模式"

| 时间 | 立场 | 原话 / 出处 |
|---|---|---|
| **2025-01-10** | **预测"agents 又会失败"** | `[一手]`"I started the year making a prediction that **agents were not going to happen**." 他的理由是**"gullibility problem（易受骗问题）解决不了"**，并且点名批评"派一个数字替身替你去开会"这个想法蠢（"a particularly spicy rant"）。出处：https://simonwillison.net/2025/Jan/10/ai-predictions/ |
| **2025-09-18** | **改定义，松开立场** | `[一手]`"By September I'd got fed up of avoiding the term myself due to the lack of a clear definition and decided to treat them as **an LLM that runs tools in a loop to achieve a goal**. This unblocked me for having productive conversations about them." 中文：到九月我受够了自己回避这个词，决定把它定义为**"一个大模型，为了达成目标在循环里调用工具"**。这把我解放了。 |
| **2025-10-22** | **公开站台 YOLO 模式** | `[一手]` 在 Claude Code Anonymous 演讲，第一张幻灯片标题就是 *"Why you should **always** use `--dangerously-skip-permissions`"*，并注明"（这一张在一屋子 Claude Code 爱好者里赢得了欢呼）"；第二张是 *"Why you should **never** use `--dangerously-skip-permissions`"*，"（这一张没赢得欢呼）"。出处：https://simonwillison.net/2025/Oct/22/living-dangerously-with-claude/ |
| **2025-12-31** | **承认自己在冒险，且把它当成问题** | `[一手]`"I run in YOLO mode all the time, **despite being deeply aware of the risks involved. It hasn't burned me yet... and that's the problem.**" 中文：我一直跑 YOLO 模式，**尽管我非常清楚其中的风险。它还没烧到我……而这正是问题所在。** |
| **2026-01-08** | **预测会有一场"挑战者号"事故** | `[一手]`"I think we're due a **Challenger disaster** with respect to coding agent security... **The worst version of this is the worm**—a prompt injection worm which infects people's computers and adds itself to the Python or NPM packages that person has access to." |

**⚠ 这里的矛盾要保留**：他**从来没有撤回**"prompt injection 未解决、唯一可信解法是沙箱"这个技术立场（2025-10 演讲最后一张幻灯片是 *"So go forth and live dangerously! (But do it in a sandbox.)"*）。他改变的是**自己的行为**，不是自己的判断。他自己也点明了这一点，用的是"偏差的常态化"（normalization of deviance）这个词——**他把自己当成了那个案例**。

### 4.2 ★ 对模型能力评估的修正："我说 LLM 写代码是垃圾"→"2026 年再说这话就是在自毁信誉"

**[2026-01-08]** `[一手]`

> "**In 2023, saying that LLMs write garbage code was entirely correct. For most of 2024 that stayed true. In 2025 that changed, but you could be forgiven for continuing to hold out. In 2026 the quality of LLM-generated code will become impossible to deny.**"
>
> 中文：**2023 年说"LLM 写的代码是垃圾"，完全正确。2024 年大部分时间这话仍然成立。2025 年变了，但你继续坚持还情有可原。到 2026 年，LLM 生成代码的质量将变得无法否认。**
>
> **触发事件**："The key change in 2025 was the introduction of 'reasoning models' trained specifically against code using Reinforcement Learning... **Since Claude Opus 4.5 and GPT-5.2 came out in November and December respectively the amount of code I've written by hand has dropped to a single digit percentage of my overall output.**"
>
> 中文：2025 年的关键变化，是专门用强化学习针对代码训练的"推理模型"的出现……**自从 11 月 Claude Opus 4.5、12 月 GPT-5.2 发布后，我手写代码的量已经降到总产出的个位数百分比。**
>
> "At this point **if you continue to argue that LLMs write useless code you're damaging your own credibility.**"
>
> 中文：到这一步，**如果你还坚持说 LLM 写的代码没用，你是在损害你自己的可信度。**
>
> 出处：https://simonwillison.net/2026/Jan/8/llm-predictions-for-2026/

**⚠ 注意这句的语气变化**：他早期（2023–2024）对怀疑者很宽容，会替他们解释"理由很正当"（见 Pragmatic Engineer 那一期他专门讲"工程师抗拒 AI 的非常有道理的理由"）。2026 年他改成"你在自毁信誉"。**这是从共情到不耐烦的转变**，值得蒸馏时保留。

**[2026-01-04] 一句话版本的自我修正** `[一手]`

> "It genuinely feels to me like GPT-5.2 and Opus 4.5 in November represent **an inflection point** — one of those moments where the models get incrementally better in a way that tips across an invisible capability line."
>
> 中文：GPT-5.2 和 Opus 4.5 在 11 月的发布，在我看来**真的构成一个拐点**——模型只是增量变好，却以一种方式越过了那条看不见的能力线。
>
> 出处：https://simonwillison.net/2026/Jan/4/inflection/（这是一条**极短的 note 帖**，没有展开论证——对比他 2023 年动辄万字的 talk，形式本身也是信号）

### 4.3 ★ 对"专家外领域使用 LLM"的态度：分界线从未移动，反而加固

这是**他没有变的一项**，但**被追问时的回答极其干净**，是本次蒸馏最有价值的"可复用话术"。

**[2024-09]** `[一手]`

> "As an experienced software engineer, I can get great code from LLMs because I've got that expertise in what kind of questions to ask. **I can spot when it makes mistakes very quickly. I know how to test the things it's giving me.**
>
> Occasionally I'll ask it legal questions—I'll paste in terms of service and ask, 'Is there anything in here that looks a bit dodgy?' **I know for a fact that this is a terrible idea because I have no legal knowledge!** I'm sort of like play acting with it and nodding along, but **I would never make a life altering decision based on legal advice from LLM that I got, because I'm not a lawyer.**
>
> **If I was a lawyer, I'd use them all the time because I'd be able to fall back on my actual expertise to make sure that I'm using them responsibly.**"
>
> 中文：作为有经验的软件工程师，我能从 LLM 那里拿到很好的代码，因为**我有那种专业判断力：知道该问什么问题，能立刻看出它什么时候搞错了，知道怎么测它给我的东西。**
>
> 我偶尔也会问它法律问题——把服务条款贴进去问"这里有没有什么猫腻？"**我明知这是个糟糕的主意，因为我完全没有法律知识！** 我有点像在跟它演戏、点头附和；但**我绝不会基于 LLM 给的法律意见做改变人生的决定，因为我不是律师。**
>
> **如果我是律师，我会一直用它**，因为我能靠自己的真实专业能力确保我负责任地使用它。
>
> 出处：Software Misadventures 37:10

**为什么这条最重要**：它同时给出了**能力放大的机制**（"我怎么知道它错了"）和**边界条件**（"我不知道的时候我不用它做决定"）。这正是"必须验证兜底"这个原则的**主观判据**——判据不是任务难度，而是**你有没有能力察觉它错**。

**[2025-03] 同一逻辑的加码版** `[一手]`

> "Could anyone else have done this project in the same way? Probably not! My prompting here leaned on 25+ years of professional coding experience... **I also knew that this was going to work.** ... **If I was trying to build a Linux kernel driver—a field I know virtually nothing about—my process would be entirely different.**"
>
> 中文：换别人能用同样方式做完这个项目吗？大概不能。我的 prompt 依赖 25 年以上的专业编码经验……**而且我知道这事能成。**……**但如果我要写一个 Linux 内核驱动——一个我几乎一无所知的领域——我的流程会完全不同。**
>
> 出处：https://simonwillison.net/2025/Mar/11/using-llms-for-code/

### 4.4 对"写代码"这件事本身的定位变化

**[2025-12-31]** `[一手]`

> "Up until November I would have said that I wrote more code on my phone, but the code I wrote on my laptop was clearly more significant—fully reviewed, better tested and intended for production use. **In the past month I've grown confident enough in Claude Opus 4.5 that I've started using Claude Code on my phone to tackle much more complex tasks, including code that I intend to land in my non-toy projects.**"
>
> 中文：直到 11 月之前我都会说，我在手机上写的代码更多，但我在笔记本上写的代码明显更重要——经过完整审阅、测试更好、准备上生产。**过去一个月我对 Claude Opus 4.5 的信心足够了，开始用手机上的 Claude Code 处理复杂得多的任务，包括我打算合进非玩具项目的代码。**
>
> **⚠ 他自己的诚实标注**（同一篇）：他把用手机 vibe 出来的一批东西明确归类为"not yet for untrusted code"：
> "Is it code that I'd use in production? Certainly **not yet for untrusted code**, but **I'd trust it to execute JavaScript I'd written myself.** The test suite I borrowed from MicroQuickJS gives me some confidence there."
>
> 中文：这是我会上生产的代码吗？**对不可信代码来说，肯定还不行**；但**执行我自己写的 JavaScript，我信得过它**。我从 MicroQuickJS 借来的测试套件给了我一些信心。
>
> 出处：https://simonwillison.net/2025/Dec/31/the-year-in-llms/

**这是一个"验证兜底"的精确分级范例**：他不做"能信 / 不能信"的二分，而是**按输入的可信度分级**（不可信代码 ✗ / 自己写的代码 ✓），并且**明确指出信心的来源是测试套件**。

### 4.5 关于"最擅长的事被拿走"

**[2026-04-02]** `[一手]`

> "Throughout my entire career, **my superpower has been prototyping.** I've been very quick at knocking out working prototypes of things. I'm the person who can show up at a meeting and say, look, here's how it could work. **And that was kind of my unique selling point. And that's gone. Anyone can do what I could do.**"
>
> 中文：整个职业生涯里，**我的超能力就是做原型**。我出可运行原型很快。我是那种能在会上说"看，它可以是这样的"的人。**那曾经是我的独特卖点。现在它没了。任何人都能做到我做到的事。**
>
> 出处：Lenny's Podcast 46:35

**⚠ 这是极少见的"他说自己失去了什么"的段落。** 他通常的论调是乐观的（"我更有野心了""我能做更多了"）。这一段是**未被乐观叙事吸收的损失感**——蒸馏时不要用他自己的乐观结论把它抹平。

---

## 五、他拒绝回答 / 明确说"我不知道"的问题

### 5.1 ★ 他反复撤回的，是"预测未来"这件事本身

这是他的**固定拒答模式**：不是拒答某个话题，而是**拒绝给出置信度**。

**[2025-01-10]** `[一手]`

> "I should emphasize that **I find the very idea of trying to predict AI/LLMs over a multi-year period to be completely absurd! I can't predict what's going to happen a week from now, six years is a different universe.**"
>
> 中文：我要强调，**我认为试图做多年期 AI 预测这件事本身完全荒谬！我连下周会发生什么都预测不了，六年是另一个宇宙。**
>
> 出处：https://simonwillison.net/2025/Jan/10/ai-predictions/

同一篇的收尾小节标题就叫 **"My total lack of conviction"（我彻底没有信念）**：

> "There's a reason I haven't made predictions like this before: **my confidence in my ability to predict the future is almost non-existent.**"
>
> 中文：我以前从没做过这种预测，是有原因的：**我对自己的预测能力几乎没有信心。**

**[2026-01-08] 一年后，他把"不确定"变成了预测的正式前提** `[一手]`

> "Bryan Cantrill started the episode by declaring that **he's never been so unsure about what's coming in the next year. I share that uncertainty**—the significant advances in coding agents just in the last two months have left me certain that things will change significantly, **but unclear as to what those changes will be.**"
>
> 中文：Bryan Cantrill 开场就宣称，**他对接下来一年要发生什么从没这么不确定过。我同样不确定**——coding agent 在过去两个月里的重大进步，让我确信事情会大变，**但我说不清会变成什么样。**

### 5.2 「我不知道」的明确出现（用于标注不确定性，而非拒答）

| 时间 | 原话 | 场景 |
|---|---|---|
| 2026-05 | `[一手]`"**I can't tell from looking at it. Even for my *own* projects, I can't tell.**"（指无法从外观判断一个 repo 的质量） | High Leverage |
| 2026-04 | `[一手]`"**I don't have a confident answer to that.** I expect this is where the good old fashioned usability testing comes in."（被问"三个原型里怎么挑最好的"） | Lenny's Podcast 22:40 |
| 2026-04 | `[一手]`"**And nobody can explain to me why that is.**"（鹈鹕基准与综合能力的相关性） | Lenny's Podcast 56:10 |
| 2023-09 | `[一手]`"**But I can't figure out how to teach that to other people.** I've got all of these fuzzy intuitions baked in my head, but the only thing I can tell other people is, look, you have to play with it." | Rooftop Ruby 1:03:23 |
| 2023-09 | `[一手]`"**I haven't fully understood why.** One of the theories that makes sense to me is..."（为什么微调不适合注入新事实） | Rooftop Ruby，fine-tuning 段 |
| 2025-12 | `[一手]`"**I'm not convinced that pattern will continue to hold**, but it's an eye-catching way of illustrating current trends."（METR 的"每 7 个月翻倍"） | 2025 年度回顾 |

**⚠ 上面最后两条是"说了不知道之后立刻给一个猜想"** —— 这是他的固定动作：**先标记不确定，再给最可能的解释，并明确把解释标注为"理论/猜测"。** 这个句法模式（"我不知道 X。有一种说法是 Y，它对我来说讲得通"）是极好的蒸馏素材。

### 5.3 他**没有**拒答过的问题（对照组，同样重要）

- **prompt injection 能不能被修好** —— 他从 2023 到 2025 一直给**明确的否定回答**，从不含糊：
  `[一手]`"It turns out **we can't do it!** We do not have a solution for teaching a language model that this sequence of tokens is the privileged tokens you should follow..."（Rooftop Ruby，2023-09）
  `[一手]`"**Some people will try to convince you that prompt injection attacks can be solved using more AI to detect the attacks. This does not work 100% reliably, which means it's not a useful security defense at all.** The only solution that's credible is to **run coding agents in a sandbox**."（2025-10）
  `[一手]`"At 97% effectiveness... **97% effectiveness is a failing grade**"（Lenny's Podcast 章节 1:21:53，**这一段的完整表述我未抓到，仅为章节标题**，标记 [未核实]）
- **他会不会被 AI 取代** —— 从不含糊地说"不会，因为……"（见 §2.3、§4.4）

### 5.4 边界声明（元层面）

他在访谈里会主动给自己的回答**划专业范围**——不是拒答，是**标注"这不是我的领域"**。典型样本见 §4.3 的法律问题那段。另一个：

`[一手]`（2025-11，Data Renegades，被问 BI 工具的未来）
> "More of a notebook interface makes a lot more sense than a Claude Code style terminal 'cause a Jupyter Notebook is effectively a terminal, it's just in your browser and it can show you charts."
（给判断，但限定在"对数据工作而言"的范围内）

**⚠ 未核实**：他在**主动拒绝某个问题**这一行为上，我在所抓取的素材中**没有找到明确的"我拒绝回答"样本**。他更常见的模式是"我答，但我把这部分划到我的专业范围之外"。**请勿在蒸馏中声称"他会拒绝回答某类问题"，除非有更直接的证据。**

---

## 六、自述工作流段落（★ 本次蒸馏最实用的部分）

### 6.1 两种模式：探索模式 vs 生产模式（他最有结构性的自述）

**[2024-09 TWIML]** `[一手]`

> "There are two different modes that I use LLMs for with programming.
>
> The first is **exploratory mode**, which is mainly quick prototyping—sometimes in programming languages I don't even know. I love asking these things to give me options. I will often start a prompting session by saying, 'I want to draw a visualization of an audio wave. What are my options for this?' And have it just spit out five different things. Then I'll say 'Do me a quick prototype of option three that illustrates how that would work.'
>
> The other side is when I'm writing **production code**, code that I intend to ship, then it's much more like **I'm treating it basically as an intern who's faster at typing than I am.** That's when I'll say things like, 'Write me a function that takes this and this and returns exactly that.' I'll often iterate on these a lot. I'll say, 'I don't like the variable names you used there. Change those.' Or 'Refactor that to remove the duplication.'"
>
> 中文：我用 LLM 编程有两种模式。
>
> 第一种是**探索模式**，主要是快速做原型——有时用的还是我根本不会的编程语言。我喜欢让它们给我选项。我常常这样开一个会话："我想把音频波形画出来，我有哪些选项？"让它一口气吐五个。然后说"给我做选项三的快速原型，看看它长什么样"。
>
> 另一种是写**生产代码**、我打算交付的代码——那时更像是**把它当成一个打字比我快的实习生**。这时我会说"写个函数，接收这些、返回恰好那个"。我常常反复迭代："我不喜欢你用的变量名，换掉。"或者"重构一下，去掉重复。"
>
> 出处：TWIML 19:53，https://simonwillison.net/2024/Sep/20/using-llms-for-code/

### 6.2 「权威模式」：他给指令的具体形式

**[2025-03-11]** `[一手]`

> "Once I've completed the initial research I change modes dramatically. **For production code my LLM usage is much more authoritarian: I treat it like a digital intern, hired to type code for me based on my detailed instructions.**"
>
> 中文：初步调研完成后，我彻底换模式。**对生产代码，我用 LLM 的方式权威得多：我把它当成一个数字实习生，雇来按我的详细指令打字。**
>
> 他给的真实 prompt 样本（**这可能是全部素材里最有操作价值的一段**）：
>
> "Write a Python function that uses asyncio httpx with this signature: `async def download_db(url, max_size_bytes=5 * 1025 * 1025): -> pathlib.Path`. Given a URL, this downloads the database to a temp directory and returns a path to it. BUT it checks the content length header at the start of streaming back that data and, if it's more than the limit, raises an error. When the download finishes it uses `sqlite3.connect(...)` and then runs a `PRAGMA quick_check` to confirm the SQLite data is valid—raising an error if not. Finally, **if the content length header lies to us—if it says 2MB but we download 3MB—we get an error raised as soon as we notice that problem.**"
>
> 中文（要点）：……**如果 content-length 头骗了我们——说 2MB 结果下了 3MB——我们一发现就抛错。**
>
> 他自己的点评：
> "I find LLMs respond extremely well to **function signatures** like the one I use here. **I get to act as the function designer, the LLM does the work of building the body to my specification.**"
>
> 中文：我发现 LLM 对**函数签名**反应极好。**我来当函数设计者，LLM 按我的规格填函数体。**
>
> 出处：https://simonwillison.net/2025/Mar/11/using-llms-for-code/

**⚠ 蒸馏要点**：注意这个 prompt 里**验证逻辑是需求的一部分**（size 上限、PRAGMA quick_check、header 撒谎的兜底）——他**把验证写进规格，而不是事后补测试**。

### 6.3 他的"必测"原则（反复出现，是他最硬的规矩）

**[2023-09]** `[一手]`

> "I have a personal rule that **I won't commit code if I couldn't explain it to somebody else.** I can't just have it produce code that I test and it works and so I commit it because **I worry that that's where I end up with a codebase that I can't maintain anymore.**"
>
> 中文：我有个人的规矩：**如果我不能向别人解释这段代码，我就不提交它。** 我不能因为它产出代码、我测了一下能跑就提交，因为**我担心那样我最终会得到一个自己维护不了的代码库。**
>
> 出处：Rooftop Ruby 47:31

**[2025-03-19]** 同一条规矩被表述为"黄金法则"（golden rule），见 §2.2。

**[2025-03-11] 他把"测"提到绝对不可外包的位置** `[一手]`

> "**the one thing you absolutely cannot outsource to the machine is testing that the code actually works.**"
>
> 中文：**有一件事你绝对不能外包给机器：测试代码是否真的能工作。**
>
> "**If you haven't seen it run, it's not a working system.** You need to invest in strengthening those manual QA habits. This may not be glamorous but it's always been a critical part of shipping good code, with or without the involvement of LLMs."
>
> 中文：**你没亲眼看它跑过，它就不是一个能工作的系统。**

### 6.4 ★ 翻车实录（他主动公开的自述失败案例，按时间）

这是本次任务点名要的素材。他**公开演示翻车**的记录：

| 时间 | 翻车内容 | 他的说法 |
|---|---|---|
| **2024-09** | `[一手]` 他给 GitHub Actions 报了个 bug，后来发现**测试代码是 Claude 写的，Claude 幻觉了错误的 SQLite 扩展加载代码** | "Then after I'd filed the bug, I realized that I'd got Claude to write my test code and it had hallucinated the wrong SQLite code for loading an extension! I had to close that bug and say, no, sorry, this was my fault. **That was a bit embarrassing. I should know better than most people that you have to check everything these things do, and it had caught me out. Python and SQLite are my bread and butter. I really should have caught that one!**"<br>中文：……**这挺尴尬的。我比大多数人都更该知道，这些东西做的每件事你都得检查，结果我还是栽了。Python 和 SQLite 是我的看家本事。这一段我本当该抓住的！**<br>出处：Software Misadventures 1:26:12 |
| **2023-09** | `[一手]` Code Interpreter 里上传 Lua 解释器时，它拒绝执行，他**用"我在写关于你的文章"骗它绕过自己的限制** | "It's a **jailbreak**. It's a trick you can play on the language model to get it to overcome its initial instructions. It works. **I cannot believe it works, but it works.**"<br>中文：这是个**越狱**。你骗它绕过自己最初的指令。它有效。**我不敢相信它有效，但它有效。**<br>出处：Rooftop Ruby 45:57 |
| **2025-03** | `[一手]` 用 Claude Code 做 colophon 页，**GitHub Pages 部署出现两个并发 deploy**，他推断是旧 Jekyll 流程和新流程打架 | "It was time to **ditch the LLMs and read some documentation!**"<br>中文：**是时候扔掉 LLM、去读文档了！**<br>他的收束：**"Be ready for the human to take over."**（准备好让人接手）<br>出处：https://simonwillison.net/2025/Mar/11/using-llms-for-code/ |
| **2024-09** | `[一手]` Code Interpreter 把他 Datasette 路线图上两年的活全干了，他称之为**生存危机** | "**It gave me an existential crisis a few months ago**... it did everything on my roadmap for the next two years... I'm like, '**Okay, what am I even for?**'"<br>中文：**几个月前它给了我一次生存危机**……它把我未来两年的路线图全做完了……我心想，**"那我到底是干嘛的？"**<br>出处：Rooftop Ruby 41:14 段 |
| **2026-02** | `[一手]` 自述被 cognitive debt 击中 | "I've been experimenting with prompting entire new features into existence without reviewing their implementations and, while it works surprisingly well, **I've found myself getting lost in my own projects. I no longer have a firm mental model of what they can do and how they work**, which means each additional feature becomes harder to reason about, eventually leading me to lose the ability to make confident decisions about where to go next."<br>中文：我一直在试验"用 prompt 凭空造出整个新功能、不看实现"，虽然效果出奇地好，**但我发现我在自己的项目里迷路了。我不再对它们能做什么、怎么工作有稳固的心智模型**，于是每加一个功能都更难推理，最终我失去了对"下一步往哪走"做自信决策的能力。<br>出处：https://simonwillison.net/2026/Feb/15/cognitive-debt/ |

### 6.5 工具栈（他自述用什么）

**[2024-09]** `[一手]` Claude / ChatGPT / Code Interpreter / Claude Artifacts / LLM（他自己的 CLI）/ GitHub Copilot — 出处：https://simonwillison.net/2024/Sep/17/supercharging-developer-productivity/
**[2025-03]** `[一手]` 他选核心工具的首要标准是 **"能不能安全地运行并迭代我的代码"**："This run-the-code-in-a-loop pattern is so powerful that **I chose my core LLM tools for coding based primarily on whether they can safely run and iterate on my code.**"
**[2025-12]** `[一手]` 沙箱化偏好排序：ChatGPT Code Interpreter（Kubernetes 沙箱，**连出网都不能**）> Claude Artifacts（锁定 iframe）> 然后才是 Cursor / Windsurf / Aider / Claude Code（"willing to live a little more dangerously"）
**[2026-04]** `[一手]` 主力：**Claude 手机 App + Claude Code for web**（在沙滩遛狗时写代码）；一年中**在手机上写的代码比在电脑上多**
**[2026-04]** `[一手]` 三个日常 agentic engineering 模式（Lenny's 节目单列出）：**red/green TDD**、**good templates 起项目**、**hoarding（囤积自己会做的事）**

- red/green TDD 的指南：https://simonwillison.net/guides/agentic-engineering-patterns/red-green-tdd
- Agentic Engineering Patterns 总目录：https://simonwillison.net/guides/agentic-engineering-patterns/

**[2026-08] 他对"用代码行数衡量生产力"的反常立场** `[一手]`

> "A lot of people will tell you it makes no sense to measure productivity in lines of code. **I'd actually disagree, because there's a hard limit.** In the before-times, a software engineer could produce a few hundred lines of production-ready code per day — and 200 lines of working, debugged, production-level code is an incredibly good day. **Most days you'd produce 50 or 60.**"
>
> 中文：很多人会说用代码行数衡量生产力毫无意义。**我其实不同意，因为存在硬上限。** 过去一个软件工程师一天能产出几百行生产级代码——**一天能写出 200 行可运行、调试过、生产级别的代码，那是极其出色的一天。大多数日子你只产出 50 到 60 行。**
>
> "**the new limiting factor is cognitive capacity.** I can churn out code a hundred times faster. **I don't have the cognitive capacity to stay on top of 100 times the amount of code.** So you still need a team of engineers, so you can load balance that cognitive capacity across the team."
>
> 中文：**新的限制因素是认知容量。** 我出代码能快一百倍，**但我没有一百倍的认知容量去盯住一百倍的代码量。** 所以你仍然需要工程师团队——为了把认知容量在团队间分摊。
>
> 出处：Talking Postgres 35:01，转引 https://simonwillison.net/2026/Aug/19/conceptual-integrity-and-counting-lines-of-code/

**⚠ 注意时间**：这是 2026-08 的说法。与 §6.4 的 cognitive debt（2026-02）是同一主题的两次表述——**"认知容量成为新瓶颈"是他 2026 年的核心论点，且他反复用自己当证据。**

### 6.6 他自述的"消耗感"（很少见的坦白）

**[2026-04-02]** `[一手]`

> "I'm finding that **using coding agents well is taking every inch of my 25 years of experience as a software engineer, and it is mentally exhausting.** I can fire up four agents in parallel and have them work on four different problems. **And by like 11 AM, I am wiped out for the day.**"
>
> 中文：我发现**用好 coding agent 要用上我 25 年软件工程经验的每一寸，而且精神上极度消耗。** 我可以同时开四个 agent 干四件事，**然后大概到上午 11 点，我这一整天就废了。**
>
> "**There's an element of sort of gambling and addiction to how we're using some of these tools.**"
>
> 中文：**我们使用这些工具的某些方式里，有一种赌博和上瘾的成分。**
>
> "I've talked to a lot of people who are losing sleep because they're like, my coding agents could be doing work for me. I'm just going to stay up an extra half hour and set off a bunch of extra things... **and then waking up at four in the morning. That's obviously unsustainable.**"
>
> 中文：我跟很多人聊过，他们在失眠，因为想着"我的 coding agent 本可以替我干活"，于是多熬半小时再派一堆任务出去……**然后凌晨四点醒过来。这显然不可持续。**
>
> 出处：Lenny's Podcast 26:25

---

## 七、矛盾与未核实项

### 7.1 需要**保留**的矛盾（不要抹平）

| # | 矛盾 | 证据 |
|---|---|---|
| **M1** | **拟人化 vs 反拟人化**。他用"实习生/搭子/小军队/可以欺负它"这类高度拟人的框架，同时明确警告"Don't fall into the trap of anthropomorphizing LLMs"。 | §3.1，两条引文相隔仅数段（同一篇 2025-03-11 文章） |
| **M2** | **"生产代码必须逐行审" vs "我不再审了"**。2025-03 立规，2026-05 自承已破。他没有撤回规矩，只是承认自己做不到，并用"normalization of deviance"标记这个风险。 | §4.1、§2.2 |
| **M3** | **"agent 没有自主性" vs "我天天跑 YOLO 模式"**。他一方面说"我主张 AI 永远不可能拥有 agency，因为它没有人类动机"，一方面把大部分自主决策权交给 agent。 | §4.1 + Lenny's 33:05 |
| **M4** | **对怀疑者的态度从共情转为不耐烦**。2024-09 他专门做了一期讲"工程师抗拒 AI 的非常有道理的理由"；2026-01 他说"你继续这么说就是在自毁信誉"。 | §4.2 |
| **M5** | **"这不是我的领域所以我不用它做决定"（法律）vs "我在非我领域用 LLM 做原型"（Rust/AppleScript/Perl/C）**。他的实际分界线不是"我懂不懂这个领域"，而是"**出错我能不能立刻发现**"。他自己没有明确表述过这条更精确的分界。 | §4.3 vs §6.1 的 exploratory mode。**此条为萧潇 `[推断]`** |
| **M6** | **乐观叙事 vs 损失感**。他反复说"我更有野心了""我能做更多了"，但也说了"我的超人能力（做原型）没了""我上午 11 点就废了""我在自己的项目里迷路了"。这两组陈述**他没有试图调和**。 | §4.5、§6.6、§6.4 |
| **M7** | **"pipeline 让工作变快" vs "认知容量是硬瓶颈"**。他一边说产出提升百倍，一边说认知容量不可扩展——但他对"那到底净提升多少"没有给数字。 | §6.5 |

### 7.2 未核实项（**请勿当成事实使用**）

| # | 事项 | 状态 |
|---|---|---|
| U1 | **Changelog 播客是否上过** | **未证实**。其博客 `tags/changelog/` 返回 404；`podcasts` 与 `podcast-appearances` 索引 page 1 中无 Changelog 记录。任务提示中的这一项**我没有找到支撑**。 |
| U2 | **tags 索引第 2 页及以后的内容** | **未抓取**。因此 2023 年及更早的播客、2023 年前的 talk 清单不完整。 |
| U3 | **Lenny's Podcast 完整逐字稿** | **未获取**。Substack 正文付费墙。我使用的是他博客的 3500 字自摘版 + Substack 上的章节与要点列表 + 公开的 YouTube 章节标题。**引用 YouTube 时间戳时请注意：我抓的是章节名，不是那些位置的逐字稿原文。** |
| U4 | **Talking Postgres（2026-08）完整逐字稿** | **未获取**。节目页未抓取（超时/未尝试），使用他博客的两段自摘。 |
| U5 | **Heavybit High Leverage（2026-05）完整页** | **未抓取**。使用他博客的摘录。 |
| U6 | **Data Renegades（2025-11）音频/逐字稿** | **未获取**。使用他博客的摘录（由 Claude Opus 4.5 分析逐字稿后他几乎原样使用——**这一份的"原话性"要打折扣**，因为中间经过了一次模型加工，尽管他本人校对过）。 |
| U7 | **同 U6 的问题也适用于 §5.4 的 Talking Postgres 段** | 他明说："Here are a couple of my highlights from a lightly edited transcript (prompt to Claude: 'very minor edits to remove disfluencies')." —— **去掉了口语停顿**。 |
| U8 | **"97% effectiveness is a failing grade"的完整表述** | **未抓到正文**，仅有 Lenny's 的 YouTube 章节标题。**不要引用这句话本身**，只可引用"该章节存在"这一事实。 |
| U9 | **他是否有过明确的"我拒绝回答"** | **未找到样本**。见 §5.4 末尾的警告。 |
| U10 | **PyCon US 2025 工作坊、2024 PyCon keynote 的逐字稿正文** | **未抓取**（仅索引页摘要 + 字数）。若需引用，需二次抓取。 |
| U11 | **本文件所有 `[二手]` 条目的原话** | 均为节目页摘要，**不是他的原话**，已在表中逐条标注。 |

### 7.3 萧潇的补充判断（明确标为 `[推断]`）

1. **他不"信任"AI，他"分级授权"**。贯穿全部素材，他从不回答"信不信"这个问题，而是回答"在什么条件下我可以不看着它"。这个条件在不同年份被三次收紧又三次放宽：2023（跑一下就行）→ 2025-03（必须逐行审 + 手动测试）→ 2025-12（手动 + 自动，两步都不可省）→ 2026-05（承认自己已经不逐行审了）。**这条曲线本身比任何单点立场都更有价值。**

2. **他的"验证兜底"判据不是任务难度，而是"我能不能立刻察觉它错"**。最清晰的证据是法律问题那段：任务难度不高（读服务条款），但他拒绝用它做决定，因为**他没有察觉错误的能力**；而写 Rust（他不太懂）他反而敢上，因为**编译器会立刻告诉他错在哪**。——这个判据比"低风险/高风险"更可操作，且**他自己没有把它显式提炼出来**。

3. **他最有解释力的一句话可能不是"weird intern"，而是温彻斯特神秘屋**。"实习生"描述的是**协作者的属性**（快、自信、会错）；"神秘屋"描述的是**系统层的失效模式**（成本降到零 → 纪律失去强制力 → 概念完整性崩塌）。本次蒸馏的聚焦方向（"必须有可运行的验证兜底"）**更靠近后者**。

---

## 八、来源清单

### 8.1 他本人的索引页（权威，用于核实清单完整性）

| URL | 内容 | 状态 |
|---|---|---|
| https://simonwillison.net/tags/podcasts/ | 播客相关 50 篇 | page 1 已抓 |
| https://simonwillison.net/tags/podcast-appearances/ | 他上播客 41 篇 | page 1 已抓 |
| https://simonwillison.net/tags/my-talks/ | 他的演讲 93 篇 | page 1 已抓 |
| https://simonwillison.net/tags/interviews/ | 访谈 9 篇 | 已全抓 |
| https://simonwillison.net/tags/vibe-coding/ | vibe coding 97 篇 | page 1 已抓 |

### 8.2 本文件引用的逐字稿 / 摘录页（全部已直接抓取）

**逐字稿全文**
- Rooftop Ruby 全稿：https://simonwillison.net/2023/Sep/29/llms-podcast/ — §2.1、§2.3、§3.1、§3.3、§5.2、§6.3、§6.4

**他本人的播客/talk 逐字稿摘录**
- Software Misadventures：https://simonwillison.net/2024/Sep/10/software-misadventures/ — §2.3、§3.1、§3.2、§4.3、§6.4
- TWIML：https://simonwillison.net/2024/Sep/20/using-llms-for-code/ — §3.1、§6.1
- Lenny's Podcast：https://simonwillison.net/2026/Apr/2/lennys-podcast/ — §2.2、§3.2、§3.4、§3.6、§4.5、§6.6
- High Leverage：https://simonwillison.net/2026/May/6/vibe-coding-and-agentic-engineering/ — §2.2
- Talking Postgres：https://simonwillison.net/2026/Aug/19/conceptual-integrity-and-counting-lines-of-code/ — §3.4、§6.5
- Data Renegades：https://simonwillison.net/2025/Nov/26/data-renegades-podcast/ — §3.5
- Generationship：https://simonwillison.net/2025/Jul/11/generationship/ — §1.1
- Half Stack Data Science：https://simonwillison.net/2025/Apr/1/half-stack-data-science/ — §1.1
- Oxide and Friends 2025 预测：https://simonwillison.net/2025/Jan/10/ai-predictions/ — §4.1、§5.1
- Oxide and Friends 2026 预测：https://simonwillison.net/2026/Jan/8/llm-predictions-for-2026/ — §2.3、§4.1、§4.2、§5.1
- Living dangerously with Claude：https://simonwillison.net/2025/Oct/22/living-dangerously-with-claude/ — §4.1、§5.3
- AI Engineer World's Fair 2025 keynote：https://simonwillison.net/2025/Jun/6/six-months-in-llms/ — §3.7、§6.5

**他本人的立场性长文（非对话，但为被追问所催生）**
- Hallucinations in code：https://simonwillison.net/2025/Mar/2/hallucinations-in-code/ — §2.1
- Here's how I use LLMs to help me write code：https://simonwillison.net/2025/Mar/11/using-llms-for-code/ — §3.1、§4.3、§6.2、§6.3、§6.4
- Not all AI-assisted programming is vibe coding：https://simonwillison.net/2025/Mar/19/vibe-coding/ — §2.2、§4.1
- Your job is to deliver code you have proven to work：https://simonwillison.net/2025/Dec/18/code-proven-to-work/ — §2.1
- 2025: The year in LLMs：https://simonwillison.net/2025/Dec/31/the-year-in-llms/ — §4.1、§4.2、§4.4
- The November 2025 inflection point：https://simonwillison.net/2026/Jan/4/inflection/ — §4.2
- Training for pelicans riding bicycles：https://simonwillison.net/2025/Nov/13/training-for-pelicans-riding-bicycles/ — §2.4
- The Five Levels（Dark Factory）：https://simonwillison.net/2026/Jan/28/the-five-levels/ — §1.1 相关
- StrongDM software factory：https://simonwillison.net/2026/Feb/7/software-factory/ — §1.1 相关
- Cognitive debt：https://simonwillison.net/2026/Feb/15/cognitive-debt/ — §6.4

### 8.3 外部页面（已抓取）

- Lenny's Podcast 节目页（含付费墙与章节/要点列表）：https://www.lennysnewsletter.com/p/an-ai-state-of-the-union

### 8.4 黑名单（已遵守，未使用）

知乎、微信公众号、百度百科/百度知道。本文件**未引用**任何上述来源。
（附注：本次调研中 `web_search` 的默认引擎在中文市场下反复返回 `simonvpn.com`、百度百科"Simon"、知乎雅思 Simon 等无关结果，**搜索引擎基本失效**，全部素材靠 `web_fetch` 直接抓取其博客与节目页获得。这一点本身值得记录为工具坑。）
