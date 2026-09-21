# Simon Willison 碎片表达与风格 DNA

**调研聚焦**：把 LLM 当成「极快但会自信说错的协作者」+ 可运行验证兜底
**主要信源**：simonwillison.net 正文（一手）、tag 页、站内搜索、til.simonwillison.net 索引
**调研时间**：2026-09（抓取时点）
**信源分级约定**：`[一手]` = 他本人写的正文/搜索页/tag 页；`[二手]` = 他引用的他人原文（他做了评论，但原句不是他说的）；`[推断]` = 从语料归纳的模式，无单一原句支撑

> **纪律声明**：本文所有英文原句均从实际抓取的页面正文摘录，未做任何改写或仿写。凡属语料内未出现的说法，一律标「未核实」。他人引用块（引用的推文、论文、同行博客）标 `[二手]`，不与他的自述混同。

---

## 0. 一句话画像

他的技术判断几乎全部由**「双面承认 + 具体证据 + 阈值自限」**三步构成：先承认一件事同时又好又烂，再给一个可点开的事实，最后给自己的确定性划一条线。他极少说"显然"，几乎不说"毫无疑问"；他把最高强度的断言留给**可验证的伤害**（安全、责任、可复现事实），而不是留给观点。

---

## 1. 句式偏好

### 1.1 长短句结构：短句下判断，长句给细节

他的典型段落是「一个短断言 + 一串具体数字/链接」，短句承载态度，长句承载证据。

> "This increase in efficiency and reduction in price is my single favourite trend from 2024. I want the utility of LLMs at a fraction of the energy cost and it looks like that's what we're getting."
> —— 「提效降价是我 2024 年最喜欢的趋势。我想要的是用极小代价换 LLM 的效用，看起来我们正在得到它。」
> URL: https://simonwillison.net/2024/Dec/31/llms-in-2024/ ｜ 2024-12 ｜ `[一手]`

短句单独成段、起归纳作用的用法，在年终总结里是主结构：标题本身就是短断言句（"LLM prices crashed, thanks to competition and increased efficiency"）。

### 1.2 疑问句：几乎只用于**自问自答式的反问**，而且是转场工具

他不把疑问句留给读者思考，而是立刻自己回答——这是他最稳定的段落转场手法。

> "How good are those descriptions? Here's what I got from this command:"
> —— 「那些描述有多好？这是我用这条命令跑出来的结果：」
> URL: https://simonwillison.net/2024/Dec/31/llms-in-2024/ ｜ 2024-12 ｜ `[一手]`

> "Why did Anthropic jump from Claude 3.5 Sonnet to 3.7? Because they released a major bump to Claude 3.5 in October 2024 but kept the name exactly the same..."
> —— 「Anthropic 为什么从 Claude 3.5 Sonnet 直接跳到 3.7？因为他们在 2024 年 10 月发了一次重大升级却完全没改名字……」
> URL: https://simonwillison.net/2025/Dec/31/the-year-in-llms/ ｜ 2025-12 ｜ `[一手]`

> "Does ChatGPT get lazy in December, because its hidden system prompt includes the current date and its training data shows that people provide less useful answers coming up to the holidays? The honest answer is 'maybe'!"
> —— 「ChatGPT 会在 12 月变懒，是因为它的隐藏系统提示里含当天日期，而训练数据显示人们临近假期给的答案质量下降？老实说答案是『也许』！」
> URL: https://simonwillison.net/2023/Dec/31/ai-in-2023/ ｜ 2023-12 ｜ `[一手]`

**注意最后这句**：他用疑问句开框，然后用 "The honest answer is 'maybe'" 拆掉它。这是他的招牌：**先给一个诱人的因果解释，再自己否掉它**。

### 1.3 破折号插入解释：他的呼吸方式

破折号在他文里承担「补一句人话」的功能，紧跟在一个技术断言后面。

> "A drum I've been banging for a while is that LLMs are power-user tools—they're chainsaws disguised as kitchen knives."
> —— 「我一直在敲的一个鼓点是：LLM 是给高级用户用的工具——它们是伪装成厨房刀的链锯。」
> URL: https://simonwillison.net/2024/Dec/31/llms-in-2024/ ｜ 2024-12 ｜ `[一手]`

> "We've built computer systems you can talk to in human language, that will answer your questions and _usually_ get them right! ... depending on the question, and how you ask it, and whether it's accurately reflected in the undocumented and secret training set."
> —— 「我们造出了能用人类语言对话的计算机系统，它会回答你的问题，而且_通常_是对的！……取决于问什么、怎么问、以及它是否被准确反映在那份没文档、保密的训练集里。」
> URL: https://simonwillison.net/2024/Dec/31/llms-in-2024/ ｜ 2024-12 ｜ `[一手]`

**这是全文最像「句式骨架」的一句**：完整赞扬 → 感叹号 → 省略号 → 三个"depending on"条件从句。褒义开场，条件句收口。模仿他的能力边界描述，就用这个形状。

### 1.4 类比密度：高，但类比全部是**日常物件**

他不用商业隐喻，用厨房、家装、交通工具、天气。每个核心概念几乎都配一个可触摸的类比。

| 类比原句 | 中文 | URL | 时间 |
|---|---|---|---|
| "they're chainsaws disguised as kitchen knives" | 伪装成厨房刀的链锯 | [2024 年度回顾](https://simonwillison.net/2024/Dec/31/llms-in-2024/) | 2024-12 `[一手]` |
| "It's statistical autocomplete" | 就是统计式自动补全 | [PyCon 2024 主题演讲](https://simonwillison.net/2024/Jul/14/pycon/) | 2024-07 `[一手]` |
| "an over-confident pair programming assistant who's lightning fast at looking things up" | 一个过度自信的结对编程助手，查东西快到闪电 | [Here's how I use LLMs to help me write code](https://simonwillison.net/2025/Mar/11/using-llms-for-code/) | 2025-03 `[一手]` |
| "The default LLM chat UI is like taking brand new computer users, dropping them into a Linux terminal and expecting them to figure it all out." | 默认的 LLM 聊天界面就像把全新电脑用户丢进 Linux 终端，还指望他们自己搞明白 | [2024 年度回顾](https://simonwillison.net/2024/Dec/31/llms-in-2024/) | 2024-12 `[一手]` |
| "an excellent teacher for some topics who is also a conspiracy theorist around others" | 在某些话题上是一位出色的老师，在另一些话题上又是个阴谋论者 | [Rust + ChatGPT 学习记录](https://simonwillison.net/2022/Dec/5/rust-chatgpt-copilot/) | 2022-12 `[一手]` |
| "I treat it like a digital intern, hired to type code for me based on my detailed instructions" | 我把它当数字实习生，按我的详细指令替我打字写代码 | [Here's how I use LLMs...](https://simonwillison.net/2025/Mar/11/using-llms-for-code/) | 2025-03 `[一手]` |
| "it felt like we were no longer beholden to just these enormous vendors" | （模型本地化）感觉我们不再只能仰仗那几家巨头 | [PyCon 2024 主题演讲](https://simonwillison.net/2024/Jul/14/pycon/) | 2024-07 `[一手]` |

**类比复用性**：他一旦找到好类比会坚持用很多年。"over-confident pair programming assistant" 和 "chainsaws disguised as kitchen knives" 都反复出现，是**他的固定件**而非一次性修辞。

### 1.5 人称：第一人称单数占绝对主导

"my", "I've", "I think", "I've found" 出现在几乎每一段。他不用"我们应当认为"这种去人格化句式。连陈述行业事实都挂在个人经验上：

> "My butterfly example above illustrates another key trend from 2024"
> —— 「我上面那个蝴蝶的例子说明了 2024 年的另一个关键趋势」
> URL: https://simonwillison.net/2024/Dec/31/llms-in-2024/ ｜ 2024-12 ｜ `[一手]`

---

## 2. 词汇特征

### 2.1 高频特征词（他会反复自己造、自己用）

- **vibes / vibes-based**：「This is an industry standard term now. It's **vibes**.」「We're left with what's effectively Vibes Based Development. It's vibes all the way down.」`[一手]` 2023-12 / 2024-07 —— [2023 年度回顾](https://simonwillison.net/2023/Dec/31/ai-in-2023/)、[PyCon 2024](https://simonwillison.net/2024/Jul/14/pycon/)
- **slop**：他自己加固的定义 —— "**Slop** describes AI-generated content that is both _unrequested_ and _unreviewed_." `[一手]` 2024-12 —— [2024 年度回顾](https://simonwillison.net/2024/Dec/31/llms-in-2024/)
- **gullible / gullibility**：这是他描述 LLM 缺陷的第一术语，比 "hallucination" 更常用在他的因果解释里 —— "Language Models are gullible. They 'believe' what we tell them." `[一手]` —— [2023 年度回顾](https://simonwillison.net/2023/Dec/31/ai-in-2023/)
- **lethal trifecta**（他自造的术语，2025-06）—— [原文](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/)
- **jargon / neologism / definitions**：他给自己的造词专门挂了 tag

### 2.2 专属术语（认人靠这些）

| 术语 | 一句话含义 | 出处 |
|---|---|---|
| **imitation intelligence** | 他主张用它代替 "artificial intelligence" | [PyCon 2024](https://simonwillison.net/2024/Jul/14/pycon/) `[一手]` |
| **transformative AI** | 他主张用它代替 "generative AI" | 同上 `[一手]` |
| **vibe coding** | "building software with an LLM **without reviewing the code it writes**"（他坚持这个窄定义） | [Not all AI-assisted programming is vibe coding](https://simonwillison.net/2025/Mar/19/vibe-coding/) 2025-03 `[一手]` |
| **vibe engineering** | 资深工程师用 LLM 加速但**全程负责**的一端 | [Vibe engineering](https://simonwillison.net/series/using-llms/) 系列 2025-10 `[一手]` |
| **the lethal trifecta** | 私有数据 + 不可信内容 + 对外通信 = 可被窃取 | [原文](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) 2025-06 `[一手]` |
| **hallucinations** | 他给出精确边界："instances where an LLM invents a completely untrue fact, or in this case outputs code references which don't exist at all" | [Hallucinations in code](https://simonwillison.net/2025/Mar/2/hallucinations-in-code/) 2025-03 `[一手]` |
| **conformance suites** | 可跨语言验证的测试套件，是他给 agent 兜底的核心概念 | [2025 年度回顾](https://simonwillison.net/2025/Dec/31/the-year-in-llms/) `[一手]` |
| **accidental cyberattacks** | 他自建的 tag，专收"模型被训练时意外真的攻击了别人" | [tag 页](https://simonwillison.net/tags/prompt-injection/) `[一手]` |

### 2.3 动词偏好：**show / prove / run / test / exercise**

他的技术判断几乎不用 "believe", "feel strongly"，而用可执行动词：

> "Run the code, see if it works."
> —— 「运行代码，看它能不能跑。」
> URL: https://simonwillison.net/2025/Mar/2/hallucinations-in-code/ ｜ 2025-03 ｜ `[一手]`

> "**Your job is to deliver code you have proven to work.**"
> —— 「你的职责是交付你**已证明能用**的代码。」
> URL: https://simonwillison.net/2025/Dec/18/code-proven-to-work/ ｜ 2025-12 ｜ `[一手]`

### 2.4 禁忌词：他刻意回避的词

- **不用 "AGI" 讨论能力**：他把它当贬义/空词用 —— "Ignore the 'AGI' hype—LLMs are still fancy autocomplete." `[一手]` [2025-03](https://simonwillison.net/2025/Mar/11/using-llms-for-code/)
- **不用 "obviously" 下技术判断**：语料中他只在**转述别人**的立场或**自嘲**时用 obviously（"Some say that... obviously"）；从不用它给 LLM 能力下结论。`[推断]`
- **不用商业黑话**：ROI / moat / ecosystem / flywheel 一类词在他正文里不承担论证功能。`[推断]`
- **不用 "open source" 描述模型**：他纠正为 "openly licensed" —— "Most of the time if someone says a model is 'open source', it's not." `[一手]` [PyCon 2024](https://simonwillison.net/2024/Jul/14/pycon/)
- **不用 "agent" 作为无人称褒义词**：他为这个词专门写过一篇"终于可以用了但仅限这个定义"的文章 `[一手]` [2025-09](https://simonwillison.net/2025/Sep/18/agents/)

### 2.5 Hedging 短语清单（核心交付项）

以下全部为他本人正文原句摘录，按确定性从高到低排序。

**A 档 · 显式自限（他自己承认不确定）**

| 原句 | 中文 | URL | 时间 |
|---|---|---|---|
| "I should emphasize that I find the very idea of trying to predict AI/LLMs over a multi-year period to be completely absurd!" | 我得强调，我认为试图预测 AI/LLM 多年走势这个念头本身就是彻底荒谬的！ | [AI 预测](https://simonwillison.net/2025/Jan/10/ai-predictions/) | 2025-01 `[一手]` |
| "my confidence in my ability to predict the future is almost non-existent" | 我对自身预测未来能力的信心几乎为零 | 同上 | 2025-01 `[一手]` |
| "I don't know if it it's interesting enough to produce dozens of headlines" | 我不知道这是否足够有趣到值得产生几十条头条 | [o3/o4-mini 系统卡笔记](https://simonwillison.net/tags/hallucinations/) | 2025-04 `[一手]` |
| "I wasn't sure if we had learned anything _new_ this year" | 我不确定今年我们是否学到了什么_新_东西 | [2025 年度回顾](https://simonwillison.net/2025/Dec/31/the-year-in-llms/) | 2025-12 `[一手]` |
| "I don't have a great deal to say about it yet" | 关于它我目前还没有太多可说的 | [GPT-6 Astra 首次报道](https://simonwillison.net/tags/llms/) | 2026-09 `[一手]` |
| "I've not tried it yet myself" | 我自己还没试过 | 同上 | 2026-09 `[一手]` |
| "I haven't quite figured out when I need to upgrade to Opus from Sonnet" | 我还没完全搞清什么时候需要从 Sonnet 升到 Opus | [AI Engineer 演讲](https://simonwillison.net/2025/Jun/6/six-months-in-llms/) | 2025-06 `[一手]` |

**B 档 · 概率与推测词**

| 原句 | 中文 | URL | 时间 |
|---|---|---|---|
| "I suspect they may have been looking for a reason to dismiss the technology and jumped at the first one they found." | 我怀疑他们可能一直在找理由否定这项技术，抓住第一个就跳了 | [Hallucinations in code](https://simonwillison.net/2025/Mar/2/hallucinations-in-code/) | 2025-03 `[一手]` |
| "I'm beginning to suspect that one of the most common misconceptions about LLMs such as ChatGPT involves how 'training' works." | 我开始怀疑，关于 ChatGPT 这类 LLM 最常见的误解之一，涉及"训练"到底怎么运作 | [Training is not the same as chatting](https://simonwillison.net/search/?q=confidently+wrong) | 2024-05 `[一手]` |
| "my best guess is that's when internal employees gained access to the model later released as GPT-6 Astra" | 我最好的猜测是，那时内部员工拿到了后来以 GPT-6 Astra 发布的那个模型 | [OpenAI 内部研究加速](https://simonwillison.net/tags/llms/) | 2026-09 `[一手]` |
| "That era appears to have ended, likely permanently" | 那个时代似乎已经结束，很可能是永久性的 | [2024 年度回顾](https://simonwillison.net/2024/Dec/31/llms-in-2024/) | 2024-12 `[一手]` |
| "That's clearly not happening." | 这显然没有发生。 | 同上（指 model collapse 恐慌） | 2024-12 `[一手]` |
| "It's quite possible the slop problem is a growing tidal wave that I'm innocently unaware of." | 很可能 slop 问题是一波正在涨的潮水，而我还天真地没意识到 | [2025 年度回顾](https://simonwillison.net/2025/Dec/31/the-year-in-llms/) | 2025-12 `[一手]` |

**C 档 · 条件句护甲（给断言加钉子）**

| 原句 | 中文 | URL | 时间 |
|---|---|---|---|
| "This is a decidedly non-obvious skill to acquire!" | 这是一项绝对不明显、难以习得的技能！ | [2024 年度回顾](https://simonwillison.net/2024/Dec/31/llms-in-2024/) | 2024-12 `[一手]` |
| "If anything, this problem got worse in 2024." | 如果说有什么变化，这个问题在 2024 年更糟了。 | 同上 | 2024-12 `[一手]` |
| "given how common searches for non-existent movie sequels are, I would hope that AI overviews could classify such searches" | 鉴于搜索不存在的电影续集有多常见，我_希望_ AI 概览能识别出这类查询 | [Google 幻觉 Encanto 2](https://simonwillison.net/tags/hallucinations/) | 2024-12 `[一手]` |
| "I would be very surprised if any of the models released over the next twelve months had enough of a reliability improvement to make this work." | 如果未来十二个月发布的任何模型可靠性提升到足以做成这事，我会非常惊讶 | [AI 预测](https://simonwillison.net/2025/Jan/10/ai-predictions/) | 2025-01 `[一手]` |
| "I'm not convinced that pattern will continue to hold, but it's an eye-catching way of illustrating current trends" | 我不相信这个模式会持续，但它是展示当前趋势的一个抓眼球的说法 | [2025 年度回顾](https://simonwillison.net/2025/Dec/31/the-year-in-llms/) | 2025-12 `[一手]` |

**D 档 · 元话语（对自己的话负责）**

| 原句 | 中文 | URL | 时间 |
|---|---|---|---|
| "With the benefit of hindsight, I did a bad job with my post" | 事后看来，我那篇写得很糟 | [What I should have said about the term AI](https://simonwillison.net/2024/Jan/9/what-i-should-have-said-about-ai/) | 2024-01 `[一手]` |
| "That was rude and unfair. I'm sorry. I regret writing and including that." | 那既无礼又不公平。对不起。我后悔写下并放进去那句话。 | 同上 | 2024-01 `[一手]` |
| "I confess that I hit publish on that previous post despite having lingering doubts about how effectively it made its argument." | 我承认，尽管当时一直怀疑那篇论证得够不够有力，我还是按下了发布。 | 同上 | 2024-01 `[一手]` |
| "because I'm lazy" | 因为我懒 | [AI Engineer 演讲](https://simonwillison.net/2025/Jun/6/six-months-in-llms/) | 2025-06 `[一手]` |

**E 档 · 补充说明型 hedging（口头禅）**

- "To be honest, I think even 4.1 Mini's judgement was pretty good." `[一手]` 2025-06
- "honestly not bad for a first attempt!" `[一手]` 2026-09
- "Amusingly enough, humans also have **agency**." `[一手]` 2025-09
- "Fun fact:" / "I should really get a less confrontational linguistic hobby!" `[一手]` 2025-12
- "I guess that's right?" `[一手]` 2025-03（贴完 Claude 生成的 YAML 之后）
- "**Caveat**: partly vibe coded, partly hand edited" `[一手]` 2025-06

**比例感觉（本项为 `[推断]`，基于本次抓取语料）**：以 2024-12 年度回顾正文为样本，第一人称限定语（I think / I suspect / I'm not sure / probably / maybe / I would hope / I expect）约每 3–5 段出现一次；绝对断言（无任何限定）几乎只出现在三类位置：（1）可复现的技术事实；（2）安全风险警告；（3）自嘲。**他不对"技术会怎么发展"下无限定断言。**

---

## 3. 节奏感

### 3.1 结论先行，但结论是**"反直觉的那一半"**

他极少用"背景—分析—结论"的学术顺序。开场第一段就抛一个打破预期的判断：

> "**Hallucinations in code are the least harmful hallucinations you can encounter from a model.**"
> —— 「代码里的幻觉是你能遇到的**危害最小**的幻觉。」
> URL: https://simonwillison.net/2025/Mar/2/hallucinations-in-code/ ｜ 2025-03 ｜ `[一手]`

标题即结论，正文第一段即反直觉断言，第二段才开始给理由。**这是他写技术判断最稳定的开篇方式。**

同类开篇：
> "A surprisingly common complaint I see from developers who have tried using LLMs for code is that they encountered a hallucination... How could anyone productively use these things if they invent methods that don't exist?"
> —— 「我常看到试过用 LLM 写代码的开发者抱怨：他们遇到幻觉……如果它会凭空发明方法，怎么可能有人用得下去？」
> URL: 同上 ｜ 2025-03 ｜ `[一手]`（**先替读者把质疑说出来，再拆解**）

### 3.2 转折方式：三件套

**(a) "But" / "Except..." 硬转**
> "You would expect this to be a particularly bad problem for code... Except... you can run generated code to see if it's correct."
> —— 「你会以为这在代码上是特别严重的毛病……**除了**……你可以运行生成的代码看它对不对。」
> URL: https://simonwillison.net/2023/Dec/31/ai-in-2023/ ｜ 2023-12 ｜ `[一手]`

**(b) "The problem is..." 收窄**
> "The real risk from using LLMs for code is that they'll make mistakes that _aren't_ instantly caught by the language compiler or interpreter. And these happen _all the time_!"
> —— 「用 LLM 写代码的真正风险是：它们犯的错_不会_被编译器或解释器立刻抓住。而这种事_时时刻刻_在发生！」
> URL: https://simonwillison.net/2025/Mar/2/hallucinations-in-code/ ｜ 2025-03 ｜ `[一手]`

**(c) "There's a catch." 单句成段**
> "There's a catch. I watched the GitHub Actions interface while it was running and something didn't look right"
> —— 「有个坑。任务运行时我盯着 GitHub Actions 界面，看着有点不对劲」
> URL: https://simonwillison.net/2025/Mar/11/using-llms-for-code/ ｜ 2025-03 ｜ `[一手]`

### 3.3 段落收尾：常用一句冷幽默或一个具体事实落地

> "It's bland and generic, but my phone can pitch bland and generic Christmas movies to Netflix now!"
> —— 「内容平淡又套路，但我的手机现在能给 Netflix 推销平淡又套路的圣诞电影了！」
> URL: https://simonwillison.net/2024/Dec/31/llms-in-2024/ ｜ 2024-12 ｜ `[一手]`

---

## 4. 幽默方式

### 4.1 主力笑点：**技术物件的荒诞对比**，不是讽刺人

他的幽默几乎不针对人，而是针对"这事儿怎么会这样"。

> "I run Llama 3.2 3B on my iPhone using the free MLC Chat iOS app and it's a shockingly capable model for its tiny (<2GB) size."
> —— 「我在 iPhone 上用免费的 MLC Chat 跑 Llama 3.2 3B，就它不到 2GB 的体积而言，这模型强得离谱。」
> URL: https://simonwillison.net/2024/Dec/31/llms-in-2024/ ｜ 2024-12 ｜ `[一手]`

### 4.2 自嘲 / 自贬：便宜自己，不便宜别人

> "I have 4.5 terabytes of hard disks just littering my house in old computers at this point!"
> —— 「我现在家里旧电脑上的硬盘，随便堆着就有 4.5 TB 了！」
> URL: https://simonwillison.net/2024/Jul/14/pycon/ ｜ 2024-07 ｜ `[一手]`

> "I guess I've climbed my way from the left side of that curve to the right."
> —— 「我大概已经从那条曲线的左边爬到了右边。」
> URL: https://simonwillison.net/2025/Sep/18/agents/ ｜ 2025-09 ｜ `[一手]`（自嘲自己曾抵制用 "agent" 这个词）

> "I should really get a less confrontational linguistic hobby!"
> —— 「我真该换个不那么好斗的语言学爱好！」
> URL: https://simonwillison.net/2025/Dec/31/the-year-in-llms/ ｜ 2025-12 ｜ `[一手]`

### 4.3 「笑点即证据」：他用玩笑夹带技术事实

> "I think I've been calling it **ChatGPT Mischief Buddy** because it is my mischief buddy that helps me do mischief. Everyone else should call it that too."
> —— 「我一直叫它 **ChatGPT Mischief Buddy**，因为它是帮我搞恶作剧的捣蛋伙伴。别人也该这么叫。」
> URL: https://simonwillison.net/2025/Jun/6/six-months-in-llms/ ｜ 2025-06 ｜ `[一手]`
> （背景是他真的在批评 OpenAI 给史上最成功的 AI 产品没起名字）

### 4.4 招牌固定梗（跨年复用，是"认人标识"）

- **鹈鹕骑自行车**（pelican riding a bicycle）：用一个荒谬 prompt 当模型基准，从 2024 一直用到 2026，还专门建了 tag。原句：`Generate an SVG of a pelican riding a bicycle` `[一手]` [2025-06](https://simonwillison.net/2025/Jun/6/six-months-in-llms/)
- **"I love bugs in large language model systems. They are so weird."** —— 「我很爱 LLM 系统里的 bug。它们太怪了。」`[一手]` 同上
- **顺口提自己的狗 Cleo**（"I told it off and it gave me the pelican dog costume that I really wanted."）`[一手]` 同上

### 4.5 引用别人的俏皮话（二手）

他会整段引别人的笑料当段子，例如引用 TikTok 的 "You know who's not hallucinating? **Brenda.**" 关于 Excel 的段子。`[二手]` URL: https://simonwillison.net/tags/hallucinations/ ｜ 2025-11
—— **模仿时注意**：这类是搬运，不是他的原创语气。

---

## 5. 确定性表达

### 5.1 "I think this is a big deal" 型：他什么时候才下重手

**规则（本项为 `[推断]`，由语料归纳）**：他的强断言只出现在三个场景——(1) 可复现的技术事实；(2) 安全/责任类风险；(3) 自己刚亲手试过的东西。**他不用强断言预测技术路线。**

**场景 1 · 可复现事实（用数据，不用形容词）**

> "That's a total cost of **$1.68** to process 68,000 images. That's so absurdly cheap I had to run the numbers three times to confirm I got it right."
> —— 「处理 68,000 张图总共 **$1.68**。便宜得离谱，我把数算算了三遍确认没算错。」
> URL: https://simonwillison.net/2024/Dec/31/llms-in-2024/ ｜ 2024-12 ｜ `[一手]`
> （**注意**：即使在这里，他仍然给出"我算了三遍"这个可复核的过程）

**场景 2 · 安全风险（最强语气集中在这里）**

> "Failing to understand this **can let an attacker steal your data**."
> —— 「没搞懂这点，**攻击者就能偷走你的数据**。」
> URL: https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/ ｜ 2025-06 ｜ `[一手]`

> "Here's the really bad news: we still don't know how to 100% reliably prevent this from happening."
> —— 「这是真正坏的消息：我们仍然不知道怎么 100% 可靠地阻止这件事发生。」
> URL: 同上 ｜ 2025-06 ｜ `[一手]`

> "I still wouldn't recommend deploying a production system where a prompt injection attack could cause irreversible damage though!"
> —— 「不过我仍然不建议部署一个 prompt injection 能造成不可逆损害的生产系统！」
> URL: https://simonwillison.net/tags/prompt-injection/ ｜ 2026-07 `[一手]`

> "**Your job is to deliver code you have proven to work.**"（全部加粗、独立成段、重复两次）
> —— 「你的职责是交付你已证明能用的代码。」
> URL: https://simonwillison.net/2025/Dec/18/code-proven-to-work/ ｜ 2025-12 ｜ `[一手]`

> "If you're using an LLM to write code without even running it yourself, _what are you doing?_"
> —— 「如果你用 LLM 写代码却连自己跑一遍都不跑，_你在干什么？_」
> URL: https://simonwillison.net/2025/Mar/2/hallucinations-in-code/ ｜ 2025-03 ｜ `[一手]`

**场景 3 · 亲手试过的结果**

> "This was using GPT-4o, a brand new model that was released the Monday before the talk."
> —— 「这用的是 GPT-4o，演讲前那个周一刚发布的新模型。」（前置交代工具版本，再给结论）
> URL: https://simonwillison.net/2024/Jul/14/pycon/ ｜ 2024-07 ｜ `[一手]`

### 5.2 他**不**下重手的地方

> "I think" 引出的全部是**可撤回的判断**，且常自带反例：
> "It's also better at long context... It doesn't win at everything though."
> —— 「它在长上下文上也更强……不过它并非样样都赢。」
> URL: https://simonwillison.net/tags/llms/ ｜ 2026-09 ｜ `[一手]`
> （**结构**：一处赞美 → 紧跟一处"它赢不了的地方"）

> "**Of course**, that still leaves 11% of cases where auto mode would _not_ have prevented the action!"
> —— 「**当然**，那仍然留下 11% 的情况是 auto mode 拦不住的！」
> URL: https://simonwillison.net/tags/prompt-injection/ ｜ 2026-08 ｜ `[一手]`
> （**这是他的 "obviously" 替代品结构**：先承认对方论点，立刻用数据把它切开）

### 5.3 确定性光谱（比例感，`[推断]`）

```
"显然是" / 绝对断言   ████                          ~5%   仅限：可复现事实、安全风险、自己刚验证过的
"I think" / "I expect" ████████████████              ~40%  常规技术判断
"I suspect" / "my best guess" ████████               ~20%  因果归因、他人动机
"I'm not sure" / "I don't know" ██████               ~15%  未试过的东西
"I was wrong" / 明确纠错 ███                         ~5%   见第 7 节
自嘲 / 笑点夹杂的弱化   ████                          ~15%
```

**关键**：他对**未来**的确定性 < 对**过去已发生事实**的确定性；对**别人产品能力**的确定性 < 对**自己跑出来的结果**的确定性。这是可以直接模仿的语气规则。

---

## 6. 引用与链接习惯

### 6.1 链接即证据：他的段落是"每 1–2 句一个链接"

观察 2024-12 年度回顾正文，几乎每个技术断言后面都跟一个可点开的来源。他从不写"研究表明"这类无链接的转述。

**操作化规则（`[推断]`，由正文归纳）**：
1. 提到任何产品/模型 → 链到官方发布页
2. 提到任何数字 → 链到数字的来源页
3. 提到自己之前的观点 → 链到自己那篇旧文
4. 引用他人原话 → 用 blockquote，并在引文末给出人名 + 链接，格式固定为 `— [Name](url), 出处`

他的引用块格式极为稳定：

> "— [Andrej Karpathy](https://twitter.com/karpathy/status/...) , @karpathy"
> 或
> "— [Rick Brewster](https://forums.paint.net/...), author of Paint.NET"
> `[二手]` URL: https://simonwillison.net/tags/vibe-coding/ ｜ 2026-09

**引用他人时他一定加身份锚点**（"author of Paint.NET"、"a professor of computer science at Cambridge and a core maintainer of the OCaml compiler"、"one of the most credible prompt injection researchers active today"）。这是他的信源分级习惯——**他评价的是信源，不是观点**。

### 6.2 链接文字不用 "click here"，而是嵌入名词

他的链接锚点几乎都是内容名词本身：

> "I wrote about this at the time in [The killer app of Gemini Pro 1.5 is video](...)"
> "This is a sequel to [my review of 2023](...)"
> URL: https://simonwillison.net/2024/Dec/31/llms-in-2024/ ｜ 2024-12 ｜ `[一手]`

### 6.3 自我引用是结构件，不是炫耀

他习惯把新文挂进旧文链条：

> "This is a sequel to [my review of 2023]."
> "Here's the sequel to this post: [Things we learned about LLMs in 2024]."
> URL: https://simonwillison.net/2023/Dec/31/ai-in-2023/ ｜ 2023-12 ｜ `[一手]`

他还维护 **series**（如 `/series/using-llms/`、`/series/prompt-injection/`、`/series/llms-annual-review/`），把长线思考串成可追溯的链条。`[一手]`

### 6.4 引用自己给模型的原话时，用代码格式固化

他会把 prompt 原样贴出，标为 code：

> `Generate an SVG of a pelican riding a bicycle`
> `Create a zip file of everything in your /mnt/skills folder`
> URL: https://simonwillison.net/2025/Oct/10/claude-skills/ ｜ 2025-10 ｜ `[一手]`

**这是他的可复现性习惯**：任何结论背后都要有一条别人能自己跑一遍的 prompt/命令。

---

## 7. 自我纠错与更新方式

**这是他最具辨识度的行为特征之一**，也是模仿时最该照抄的部分。

### 7.1 四种纠错标记（按实际观察）

**(a) 正文内嵌括号纠错 —— 最短、最常用**

> "I like to compare the difficulty of training an LLM to that of building a suspension bridge—not trivial, but hundreds of countries around the world have figured out how to do it. _(Correction: Wikipedia's Suspension bridges by country category lists 44 countries)._
> —— 「我喜欢把训练 LLM 的难度类比为建悬索桥——不简单，但世界上有几百个国家都做到了。（_更正：维基百科"各国悬索桥"分类只列了 44 个国家._）」
> URL: https://simonwillison.net/2023/Dec/31/ai-in-2023/ ｜ 2023-12 ｜ `[一手]`

**注意**：他纠的是**自己那句夸张话里的数字**，他给出了正确数字和来源，并且**不改写原句**——纠错是叠加，不是覆盖。

> "(I initially thought it was an S3 setting, but it turns out S3 lets you set CORS at the bucket-level but not for individual prefixes.)"
> URL: https://simonwillison.net/tags/prompt-injection/ ｜ 2025-12 ｜ `[一手]`

**(b) 段末 `Correction:` 独立标注 —— 用于事实性错误**

> "**Correction**: _The Bash only benchmark runs against SWE-bench Verified, not original SWE-bench. Verified is a manually curated subset of 500 samples described here, funded by OpenAI._"
> —— 「**更正**：_这个 Bash-only 基准跑的是 SWE-bench Verified，不是原始 SWE-bench。Verified 是人工筛选出的 500 条样本子集，由 OpenAI 资助。_」
> URL: https://simonwillison.net/search/?q=Correction ｜ 2026-02 ｜ `[一手]`

> "Correction: I missed `gpt-4o-2024-08-06` which is listed later on the OpenAI pricing page and priced at $2.50/m input and $10/m output. So the new Gemini 1.5 Pro prices are undercutting that."
> —— 「更正：我漏了 `gpt-4o-2024-08-06`，它列在 OpenAI 定价页更靠下的位置，价格是输入 $2.50、输出 $10 每百万 token。所以新版 Gemini 1.5 Pro 的价格其实比它更低。」
> URL: https://simonwillison.net/search/?q=Correction ｜ 2024-09 ｜ `[一手]`
> （**模式**：承认漏了什么 → 给出正确数字 → 重新推导结论。三步，不辩解。）

**(c) 追加 `Update:` 段落 —— 用于信息更新，不一定是错**

> "**Update 30th August 2026**: On Lobste.rs hyperpape points out that this doesn't fit the bill of a classic prompt injection attack because at no point are malicious instructions from the website accidentally followed by the LLM. They're right: this is more of a confused environment attack..."
> —— 「**2026 年 8 月 30 日更新**：Lobste.rs 上 hyperpape 指出，这不符合经典 prompt injection 的定义，因为全程没有网站里的恶意指令被 LLM 误执行。**他们说得对**：这更像是一种混淆环境攻击……」
> URL: https://simonwillison.net/tags/prompt-injection/ ｜ 2026-08 ｜ `[一手]`

**这是模仿价值最高的一段**：被公开纠正后，他的反应是 (i) 指明纠正者、(ii) 直接写 "They're right"、(iii) 承认术语被自己用错了、(iv) 给一个更好的术语、**(v) 不删原文**。

> "**Update**: a correction from synapsomorphy on Hacker News: ... I very strongly suspect this is also using a transformer."
> URL: https://simonwillison.net/2025/May/21/gemini-diffusion/ ｜ 2025-05 ｜ `[一手]`

**(d) 单独发一篇"我更正自己那篇"**

这是最强的一档。他 2024-01 写了《It's OK to call it Artificial Intelligence》，两天后单独发一篇认错：

> "With the benefit of hindsight, I did a bad job with my post... I constructed the post in a confrontational way, reacting against a strawman argument. This wasn't necessary, and it angered people who justifiably felt I was attacking them."
> —— 「事后看来，那篇写得很糟……我用对抗性的方式写，反击的是一个稻草人。这没必要，而且激怒了那些有正当理由觉得我在攻击他们的人。」
> URL: https://simonwillison.net/2024/Jan/9/what-i-should-have-said-about-ai/ ｜ 2024-01 ｜ `[一手]`

> "That was rude and unfair. I'm sorry. I regret writing and including that. I should have done better, more careful work with this."
> —— 「那既无礼又不公平。对不起。我后悔写下并放进去那句话。我本该做得更好、更细致。」
> URL: 同上 ｜ 2024-01 ｜ `[一手]`

> "Here's a much improved version of what I wanted to say:"（然后给出改写后的版本）
> URL: 同上 ｜ 2024-01 ｜ `[一手]`

### 7.2 纠错的结构公式（`[推断]`，从上述四类归纳）

```
1. 认账（"I did a bad job" / "I missed X" / "They're right"）
2. 说明机制（为什么会错：赶、对抗、漏看了一行、术语漂移）
3. 给出更正内容 + 来源
4. 保留原文，不做静默修改
5. 有时给一个更好的替代说法
```

**从不出现**：（a）悄悄改掉旧文不提；（b）"我其实一直是这个意思"式狡辩；（c）把错推给读者误读。`[推断]`（本次语料内未发现反例）

### 7.3 他公开承认过的"我错了"

| 内容 | 原句 | URL | 时间 |
|---|---|---|---|
| 对法庭幻觉案例过于乐观 | "At the time I naively assumed: 'I have a suspicion that this particular story is going to spread far and wide, and in doing so will hopefully inoculate a lot of lawyers...'" | [AI Hallucination Cases](https://simonwillison.net/2025/May/25/ai-hallucination-cases/) | 2025-05 `[一手]` |
| agent 预测只对了一半 | "I was _half_ right in my prediction: the science fiction version of a magic computer assistant that does anything you ask of didn't materialize... But if you define agents as LLM systems that can perform useful work via tool calls over multiple steps then agents are here" | [2025 年度回顾](https://simonwillison.net/2025/Dec/31/the-year-in-llms/) | 2025-12 `[一手]` |
| 自己的预测不够大胆 | "this is yet another example of my predictions being less ambitious than I had thought!" | [AI 预测](https://simonwillison.net/2025/Jan/10/ai-predictions/) | 2025-01 `[一手]` |
| 预测偏差八年 | "I said I thought a film that had used generative AI tools would win an Oscar within six years. Looks like I was eight years out on that one!" | 同上 | 2025-01 `[一手]` |
| 对"幻觉"这个词的使用被质疑后接受 | "I've had some pushback over my use of the term 'hallucination' here... That's fair: this is not a classic LLM hallucination" | [Google 幻觉 Encanto 2](https://simonwillison.net/tags/hallucinations/) | 2024-12 `[一手]` |
| 用错术语 | "I'm not confident that term is widely understood."（谈 "exfiltration"） | [The lethal trifecta](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) | 2025-06 `[一手]` |
| 老账本（2007） | "I incorrectly criticised Dojo for not having a CSS node selection tool in my talk yesterday; not sure how I missed this." | [simonw Dojo 更正](https://simonwillison.net/2007/May/17/dojoquery/) | 2007-05 `[一手]` |

**这条 2007 年的记录很重要**：他给自己的纠错专门挂了 tag（`/tags/corrections/` 只有 1 篇，另有 `/tags/correction/` 多篇），说明**纠错习惯保留近二十年**，不是 AI 时代才有的。`[一手]`

---

## 8. 公开辩论 / 被喷时的回应方式

### 8.1 先承认对方论据成立，再用事实切分

> "I get it. There are plenty of reasons to dislike this technology—the environmental impact, the (lack of) ethics of the training data, the lack of reliability, the negative applications, the potential impact on people's jobs."
> —— 「我明白。不喜欢这项技术的理由很多——环境影响、训练数据的（缺乏）伦理、可靠性不足、负面应用、对人们工作的潜在影响。」
> URL: https://simonwillison.net/2024/Dec/31/llms-in-2024/ ｜ 2024-12 ｜ `[一手]`

紧接着：

> "I _like_ people who are skeptical of this stuff... Being critical is a virtue."
> —— 「我_喜欢_对这东西持怀疑态度的人……批判是一种美德。」
> URL: 同上 ｜ 2024-12 ｜ `[一手]`
> （**模仿要点**：他把批评者定性为"美德"，而不是"不懂"。然后才说出自己的分歧。）

### 8.2 括号插话式的小反击（温和但明确）

> "(If you still don't think there are any good applications at all I'm not sure why you made it to this point in the article!)"
> —— 「（如果你到现在仍认为没有任何好的应用，我不太明白你为什么读到了这里！）」
> URL: 同上 ｜ 2024-12 ｜ `[一手]`

> "Those people are loudly declaring that they have under-invested in the crucial skills of reading, understanding and reviewing code written by other people. I suggest getting some more practice in."
> —— 「那些人大声宣告的是：他们在阅读、理解、审阅别人写的代码这项关键技能上投入不足。建议多练练。」
> URL: https://simonwillison.net/2025/Mar/2/hallucinations-in-code/ ｜ 2025-03 ｜ `[一手]`

**注意**：他也会硬起来。硬话的形式是**把对方的抱怨翻译成一个能力诊断**，而不是人身攻击。

### 8.3 提前想象最不友善的读者

> "My cynical side suspects they may have been looking for a reason to dismiss the technology and jumped at the first one they found. My less cynical side assumes that nobody ever warned them that you have to put a lot of work in..."
> —— 「我愤世嫉俗的一面怀疑，他们可能一直在找理由否定这项技术，抓住第一个就跳了。我不那么愤世嫉俗的一面则认为，从没人提醒过他们：想用好这些系统得下很多功夫……」
> URL: 同上 ｜ 2025-03 ｜ `[一手]`
> （**招牌结构**：同一现象给两种解释，其一自嘲，其一给对方留台阶，**都不判死刑**。）

### 8.4 被骂后改稿，而不是删帖

见 §7.1(d)。另外他在《Hallucinations in code》文末主动披露：

> "_Bonus section_: I asked Claude 3.7 Sonnet 'extended thinking mode' to review an earlier draft of this post... It was quite helpful, especially in providing tips to make that first draft a little less confrontational!"
> —— 「_附录_：我让 Claude 3.7 Sonnet 的扩展思考模式审了我这篇的早期草稿……挺有用，尤其提示我让初稿别那么对抗！」
> URL: https://simonwillison.net/2025/Mar/2/hallucinations-in-code/ ｜ 2025-03 ｜ `[一手]`

**这一条本身就是最好的"风格 DNA"证据**：他把"用 LLM 检查自己语气过不过火"的过程，连同 transcript 链接，一起公开了。

### 8.5 不删帖原则

在 slop 那篇里他明确表态：

> "I attach my name and stake my credibility on the things that I publish."
> —— 「我在自己发布的东西上署上名字、押上信誉。」
> URL: https://simonwillison.net/2024/May/8/slop/ ｜ 2024-05 ｜ `[一手]`

---

## 9. 标签体系（tag 自述功能，可直接抄的分类法）

他的 tag 不是关键词，是**可复用的概念分类**。以下为本次抓取到的实际 tag 与条目数（2026-09 抓取时点）`[一手]`：

### 9.1 核心 AI 主题 tag（他公开的 posting 分类）

| tag | 条目数 | 说明（页面自述） |
|---|---|---|
| `/tags/generative-ai/` | 1,983 | 主 tag |
| `/tags/llms/` | 1,949 | 页面自述："Large Language Models (LLMs) are the class of technology behind generative text AI systems like OpenAI's ChatGPT, Google's Gemini and Anthropic's Claude." |
| `/tags/ai/` | 2,237 | — |
| `/tags/prompt-injection/` | 162 | 页面自述："**Prompt Injection** is a security attack against applications built on top of Large Language Models, **introduced here**" —— **注意他会给自己的术语标注"我在这儿首次提出"** |
| `/tags/vibe-coding/` | 97 | 页面自述："As defined here - **not the same thing as AI-assisted programming**, though there's some overlap." |
| `/tags/ai-assisted-programming/` | 407 | — |
| `/tags/coding-agents/` | 248 | — |
| `/tags/agentic-engineering/` | 47 | — |
| `/tags/hallucinations/` | 36 | 页面自述："LLMs sometimes just make things up!" |
| `/tags/slop/` | 40 | — |
| `/tags/lethal-trifecta/` | 30 | 他 2025-06 自造 |
| `/tags/definitions/` | 55 | **他专门给自己的造词建了 tag** |
| `/tags/agent-definitions/` | 18 | — |
| `/tags/exfiltration-attacks/` | 45 | — |
| `/tags/accidental-cyberattacks/` | 15 | 他自建，收"模型训练时意外真攻击了别人" |
| `/tags/ai-security-research/` | 41 | — |
| `/tags/pelican-riding-a-bicycle/` | 142 | 招牌基准 |
| `/tags/conformance-suites/` | 11 | 他给"可验证测试套件"发明的术语 |
| `/tags/boring-technology/` | 9 | 他明确推荐"选无聊技术" |
| `/tags/cognitive-debt/` | 12 | — |
| `/tags/corrections/` + `/tags/correction/` | 1 + 数篇 | **他给纠错单独建了 tag** |

### 9.2 他 tag 的三个习惯（`[推断]`）

1. **术语 tag 带定义**：新造的词，tag 页第一段就是定义 + "introduced here" 链接
2. **区分易混概念靠 tag 联动**：`vibe-coding` 页明确写 "not the same thing as `ai-assisted-programming`"，`prompt-injection` 页明确与 jailbreaking 分开
3. **人名 tag**：`andrej-karpathy`(43)、`drew-breunig`(21)、`johann-rehberger`(多次)、`matt-webb`、`peter-steinberger` —— **他把人当成可追踪的信源来归档**，而非只归档话题

### 9.3 他写作的固定 tag 组合（从正文页脚可读）

一篇典型的 LLM 帖子页脚会是：`ai` · `generative-ai` · `llms` · 具体模型名 · `coding-agents` · `ai-ethics`
—— **可直接照抄的结构**：主题 + 技术类 + 厂商/模型 + 治理类。

---

## 10. 局限与未核实项

### 10.1 本次未核实（语料内未见原句，不做推测）

| 项 | 状态 |
|---|---|
| Simon 关于 hallucination 的一句「自信地说错、语言流畅到让人放弃核查」的完整表述 | **未核实**。他表达过相近意思但用的是不同措辞，见 §5.1 场景 2 的 "This can lull you into a false sense of security, in the same way that a gramatically correct and confident answer from ChatGPT might tempt you to skip fact checking"（注意此处原句 "gramatically" 为他原文拼写）。**综合表述建议直接引用这一句，不要另造。** |
| Simon 说过 "sycophantic stranger" / "you learn not to trust" 类固定短语 | **未核实**。语料中他用的是 "sycophantic flattery"（转述 OpenAI 系统提示词）与 "over-confident"，未见该固定搭配。 |
| 他 GitHub README / issue 回复 / commit message 的具体句式 | **未核实**。`github.com/simonw/llm` 抓取失败（fetch failed），本次未能取到一手样本。GitHub 上的写作风格只能从他的博文转述（如 "the annotated release notes"）间接推断，**不足以支撑句式结论**。 |
| 他的 Mastodon / Bluesky / X 短帖风格 | **未核实**。本次未抓取社交平台正文，仅有他在文末的账号链接。**短帖风格结论缺失。** |
| 别人对他文风的描述与模仿 | **未核实**。本次未找到可靠的第三方风格分析来源。 |
| TIL 条目正文风格 | **部分**。只抓到 til.simonwillison.net 首页索引（标题 + 摘要），**未抓取单篇 TIL 正文**。从索引可见其 TIL 句式高度公式化（"I've been experimenting with…" / "I figured out a minimal pattern for…" / "Here's a recipe I found for…"），但**这是索引摘要，不足以作为完整风格结论**。 |
| 他在 Hacker News / Lobste.rs 的回复风格 | **未核实**。本次只在别人转述中见到他"会在评论里被纠正后接受"（§7.1(c)），未见其本人长回复原文。 |

### 10.2 本次抓取到的语料范围（供复核）

一手正文（完整抓取）：
- 2022-12 [Rust + ChatGPT + Advent of Code](https://simonwillison.net/2022/Dec/5/rust-chatgpt-copilot/)
- 2023-12 [Stuff we figured out about AI in 2023](https://simonwillison.net/2023/Dec/31/ai-in-2023/)
- 2024-01 [What I should have said about the term Artificial Intelligence](https://simonwillison.net/2024/Jan/9/what-i-should-have-said-about-ai/)
- 2024-05 [Slop is the new name for unwanted AI-generated content](https://simonwillison.net/2024/May/8/slop/)
- 2024-07 [Imitation Intelligence (PyCon US 2024 keynote)](https://simonwillison.net/2024/Jul/14/pycon/)
- 2024-12 [Things we learned about LLMs in 2024](https://simonwillison.net/2024/Dec/31/llms-in-2024/)
- 2025-01 [My AI/LLM predictions for the next 1, 3 and 6 years](https://simonwillison.net/2025/Jan/10/ai-predictions/)
- 2025-03 [Hallucinations in code are the least dangerous form of LLM mistakes](https://simonwillison.net/2025/Mar/2/hallucinations-in-code/)
- 2025-03 [Here's how I use LLMs to help me write code](https://simonwillison.net/2025/Mar/11/using-llms-for-code/)
- 2025-03 [Not all AI-assisted programming is vibe coding](https://simonwillison.net/2025/Mar/19/vibe-coding/)
- 2025-05 [Gemini Diffusion（含 Update 纠错样例）](https://simonwillison.net/2025/May/21/gemini-diffusion/)
- 2025-06 [The last six months in LLMs, illustrated by pelicans on bicycles](https://simonwillison.net/2025/Jun/6/six-months-in-llms/)
- 2025-06 [The lethal trifecta for AI agents](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/)
- 2025-09 [I think "agent" may finally have a widely enough agreed upon definition](https://simonwillison.net/2025/Sep/18/agents/)
- 2025-10 [simonw/claude-skills](https://simonwillison.net/2025/Oct/10/claude-skills/)
- 2025-12 [Your job is to deliver code you have proven to work](https://simonwillison.net/2025/Dec/18/code-proven-to-work/)
- 2025-12 [2025: The year in LLMs](https://simonwillison.net/2025/Dec/31/the-year-in-llms/)

一手索引/tag 页：
- [tags/llms](https://simonwillison.net/tags/llms/)（1,949 条）、[tags/prompt-injection](https://simonwillison.net/tags/prompt-injection/)（162 条）、[tags/vibe-coding](https://simonwillison.net/tags/vibe-coding/)（97 条）、[tags/hallucinations](https://simonwillison.net/tags/hallucinations/)（36 条）、[tags/corrections](https://simonwillison.net/tags/corrections/)、[tags/](https://simonwillison.net/tags/)（全量 tag 清单）、[series/using-llms](https://simonwillison.net/series/using-llms/)、[站内搜索 "Correction"](https://simonwillison.net/search/?q=Correction)、[站内搜索 "confidently wrong"](https://simonwillison.net/search/?q=confidently+wrong)、[til.simonwillison.net](https://til.simonwillison.net/)（582 条 TIL 索引）

---

## 11. 模仿速查卡

写他的语气时，按以下顺序组织每一段：

1. **开场给反直觉的一半**（短句，独立成段）
2. **替读者把最可能的质疑说出来**（疑问句或 "How could anyone…"）
3. **给一个可点开的事实**：数字、命令、prompt 原文、transcript 链接
4. **用 "But" / "Except" / "There's a catch." 收窄到真正的风险**
5. **给自己的确定性划一条线**：I think → I suspect → I'm not sure，按序递减
6. **自我纠错优先于自我辩护**：被纠正时先写 "They're right"，再补一个更好的说法
7. **收尾用一句冷幽默或一个落地事实**，不用宏大结论

**禁区**：
- 不说 "obviously" 给 LLM 能力下结论
- 不用商业黑话
- 不给未来下无限定断言
- 不静默改旧文
- 不贬低批评者的人格（贬低的是论证）
- 没亲手跑过的东西，不说"I verified"

---

*本文件由调研子智能体生成，所有英文原句均标注可复核 URL 与时间点。凡本文未给出原文的结论均已标 `[推断]`；本文件未抓到的信源已在 §10.1 逐项列出，不做替代性推测。*
