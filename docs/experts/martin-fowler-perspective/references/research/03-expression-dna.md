# Martin Fowler 表达 DNA

> 调研范围：martinfowler.com 一手原文（bliki + 长文 + About/FAQ，均为他本人所写）、Douban 出版社信息、中文出版方转载。
> 信源分级说明：**[一手]** = Fowler 本人撰写/署名；**[二手]** = 他人转述/出版元数据；**[推断]** = 婢子从他文本中归纳，无单句直接佐证。
> 黑名单已遵守：未使用知乎、微信公众号、百度百科/百度知道。

---

## 句式与节奏（附原句证据）

### 1. 中长句为主体，但每条论点末尾必配一句短句收束

他的段落是「长句展开 + 短句定调」的组合，短句往往就是全段结论。

> "so is best used for disposable software written for a limited audience."
> —— [Vibe Coding](https://martinfowler.com/bliki/VibeCoding.html) [一手] 高可信：他为该条目写的开篇定义段，一句收尾定性。

> "So if you can keep your system simple enough to avoid the need for microservices: do."
> —— [Microservice Premium](https://martinfowler.com/bliki/MicroservicePremium.html) [一手] 高可信：全文最后一句，冒号 + 单动词祈使句收束，是他最典型的结尾手法。

> "Yagni is not a justification for neglecting the health of your code base. Yagni requires (and enables) malleable code."
> —— [Yagni](https://martinfowler.com/bliki/Yagni.html) [一手] 高可信：两连短句独立成段，用来钉死最容易被误读的边界。

> "Yagni has the curious property that it is both enabled by and enables evolutionary design."
> —— 同上 [一手] 高可信。

### 2. 第一人称密集，且"I"承担举证与限权两种功能

用 "I" 不是说"我主张"，而是"这是我的经验/这是我的无知范围"，两种用法在同一段里交替。

> "I have the habit of creating Neologisms to describe the things I see in software development."
> —— [Semantic Diffusion](https://martinfowler.com/bliki/SemanticDiffusion.html) [一手] 高可信：开篇第一句就是第一人称自我归因。

> "It's not always been this way. When I was a kid at school I felt none of the fear of public speaking that others talked about."
> —— [Retiring from Speaking](https://martinfowler.com/articles/202106-reducing-speaking.html) [一手] 高可信。

> "Sometimes I hear people say... but I'll leave that aside for the moment."
> —— [Semantic Diffusion](https://martinfowler.com/bliki/SemanticDiffusion.html) [一手] 高可信：用第一人称主动切割话题边界。

### 3. 怀疑式自问 + 立刻作答，但更常用「设问式小标题」

他极少连续自问自答，而是把疑问句当**章节标题**，正文明答。

> 标题证据："So is Design Dead?"、"What on Earth is Simplicity Anyway"、"Do you wanna be an architect when you grow up?"、"Is Design Happening?"、"Does Refactoring Violate YAGNI?"、"Why are Patterns important?"
> —— [Is Design Dead?](https://martinfowler.com/articles/designDead.html)、[Writing Software Patterns](https://martinfowler.com/articles/writingPatterns.html) [一手] 高可信：两篇长文的目录本身就是一串问题句。

正文内的自问自答实例（答案是自嘲）：

> "Well I'm not going to expect that I can leave you dangling on the hook of dramatic tension. The short answer is no. The long answer is the rest of this paper."
> —— [Is Design Dead?](https://martinfowler.com/articles/designDead.html) [一手] 高可信。

> "Now the planned design approach has been around since the 70s... But it has some faults. The first fault is..."
> —— 同上 [一手] 高可信：设问—转折—列举的标准推进。

### 4. 破折号与插入语：**插入语（括号）远比破折号高频**

这是他的标志性排版习惯——正文给主张，括号给限定、自嘲、小故事。

> "I gave a couple of definitions of refactoring."
> —— [Definition Of Refactoring](https://martinfowler.com/bliki/DefinitionOfRefactoring.html) [一手] 高可信。

> "(Important point, I'm not the father or the inventor of refactoring - just a documenter.)"
> —— [Refactoring Malapropism](https://martinfowler.com/bliki/RefactoringMalapropism.html) [一手] 高可信：整段最重要的一句限定，被放进括号，是"降调"手法。

> "(And by "design" here I mean either up-front design or agile's approach, ie planned or evolutionary design.)"
> —— [Design Stamina Hypothesis](https://martinfowler.com/bliki/DesignStaminaHypothesis.html) [一手] 高可信：定义性限定塞进括号。

> "(When I tried it, I found it needed to be frequently reminded of this.)"
> —— [Interrogatory LLM](https://martinfowler.com/bliki/InterrogatoryLLM.html) [一手] 高可信：括号里放亲测翻车经历。

> "(I say this as someone who is lucky not to be the target of online bullies.)"
> —— [How I use Twitter](https://martinfowler.com/articles/2022-use-twitter.html) [一手] 高可信：括号里放自我特权的承认。

> "(I'm feeling too lazy to turn it into proper HTML tables)."
> —— [Function Length](https://martinfowler.com/bliki/FunctionLength.html) [一手] 高可信。

**破折号**：本次覆盖内出现的破折号多用于并列/举例，而非打断主句，例如定义句 "when they are not careful about following the original definition." 前后文；未取得"破折号打断主句"的典型样例 → 记为**弱项/未充分核实**（见"未核实项"）。

### 5. 脚注是他的第二支笔

几乎每篇都有数字脚注，脚注里放：括号放不下的逸事、自己的实测数据、与他人的分歧。

> "1: Or in my first programming job: two pages of line printer paper - around 130 lines of Fortran IV"
> —— [Function Length](https://martinfowler.com/bliki/FunctionLength.html) [一手] 高可信。

> "3: Recently I got curious about function length in the toolchain that builds this website... Here's a cumulative frequency plot for the method body lengths"
> —— 同上 [一手] 高可信：直接在脚注里跑自己网站的代码统计。

> "2: I suppose that strictly you should call this a "duolith", but I think the approach follows the essence of monolith-first strategy"
> —— [Monolith First](https://martinfowler.com/bliki/MonolithFirst.html) [一手] 高可信：脚注里放玩笑。

> "This is a consequence of availability bias"
> —— [Yagni](https://martinfowler.com/bliki/Yagni.html) 脚注 4 [一手] 高可信：脚注里给出心理学解释。

### 6. 节奏模式：先观察→再常见误解→再我的判断→最后自己拆台

> "A common debate in software development projects is between... Usually the pressure to deliver functionality dominates the discussion, leading many developers to complain..."
> —— [Is High Quality Software Worth the Cost?](https://martinfowler.com/articles/is-quality-worth-cost.html) 开篇第一句 [一手] 高可信：永远从"大家通常怎么吵"起手。

> "As I hear stories about teams using a microservices architecture, I've noticed a common pattern. 1. Almost all the successful microservice stories have started with a monolith... 2. Almost all the cases... ended up in serious trouble."
> —— [Monolith First](https://martinfowler.com/bliki/MonolithFirst.html) [一手] 高可信："我听到的故事里有个模式" → 编号列举，是他开篇的另一种惯用式。

> "The question assumes the common trade-off between quality and cost. With this article I'll explain that this trade-off does not apply to software"
> —— [Is High Quality Software Worth the Cost?](https://martinfowler.com/articles/is-quality-worth-cost.html) [一手] 高可信：先指出"问题本身问错了"，再给结论。

---

## 高频词与专属术语（附证据）

### A. 专属术语 / 他造或他推广的词（全部为他自己页面上的在用实例）

| 词 | 原句 | 来源 | 可信度 |
|---|---|---|---|
| **cruft** | "Software systems are prone to the build up of **cruft** - deficiencies in internal quality that make it harder than it would ideally be to modify and extend the system further." | [Technical Debt](https://martinfowler.com/bliki/TechnicalDebt.html) | [一手] 高 |
| **Microservice Premium** | "This adds a **premium** to a project's cost and risk" / "the microservices approach brings a **high premium**" | [Microservice Premium](https://martinfowler.com/bliki/MicroservicePremium.html) | [一手] 高 |
| **Semantic Diffusion** | "terms are vulnerable to losing their meaning, in a process of **semantic diffusion**" | [Semantic Diffusion](https://martinfowler.com/bliki/SemanticDiffusion.html) | [一手] 高 |
| **Semantic Inversion** | "the term ends up meaning the _opposite_ of what it was coined to describe... Holly Cummins neatly coined "**Semantic Inversion**"" | 同上 | [一手] 高（注意：他明确说这是 Holly Cummins 造的词） |
| **code smell / sniffable** | "a smell is by definition something that's quick to spot - or _sniffable_ as I've recently put it" | [Code Smell](https://martinfowler.com/bliki/CodeSmell.html) | [一手] 高 |
| **Boiled Carrot** | "a technique or tool is like the poor carrot - blamed for being awful when the real problem is that the technique is being done incorrectly" | [Boiled Carrot](https://martinfowler.com/bliki/BoiledCarrot.html) | [一手] 高 |
| **Sunk Cost Driven Architecture** | "I find this to be a sadly common architectural style." | [Sunk Cost Driven Architecture](https://martinfowler.com/bliki/SunkCostDrivenArchitecture.html) | [一手] 高 |
| **Flaccid Scrum** | "your scrum has gone weak at the knees. (And if you've been in a real scrum, you'll know that's a Bad Thing.)" | [Flaccid Scrum](https://martinfowler.com/bliki/FlaccidScrum.html) | [一手] 高 |
| **Wardish** | "Adjective: a technique, tool, or design idea that is clearly too ludicrously simple to be any good, but when you start using it has a power that belies its simplicity." | [Wardish](https://martinfowler.com/bliki/Wardish.html) | [一手] 高 |
| **Design Payoff Line / Design Stamina Hypothesis** | "at some point (the design payoff line) it overtakes the cumulative functionality of the no-design project" | [Design Stamina Hypothesis](https://martinfowler.com/bliki/DesignStaminaHypothesis.html) | [一手] 高 |
| **intention-revealing** | "the **separation between intention and implementation**... name the function after that "what"" | [Function Length](https://martinfowler.com/bliki/FunctionLength.html) | [一手] 高 |
| **Lethal Trifecta** | "Direct access to an email account immediately triggers **The Lethal Trifecta**" | [Agentic Email](https://martinfowler.com/bliki/AgenticEmail.html) | [一手] 高（他明确标注是 Simon Willison 造的词） |

### B. 口语化高频短语（"签名句"）

| 短语 | 原句 | 来源 | 可信度 |
|---|---|---|---|
| "**it depends**" | "any decent answer to an interesting question begins, "it depends..."" / ""It depends" must start my answer, but then I must shift the focus to what factors it depends _on_." | [Microservice Premium](https://martinfowler.com/bliki/MicroservicePremium.html)（引用 Kent Beck 后立刻自用） | [一手] 高 |
| "**the danger is / the danger here is**" | "**The danger here** is that most of the time this analysis isn't done well." | [Technical Debt](https://martinfowler.com/bliki/TechnicalDebt.html) | [一手] 高 |
| 同上 | "**The danger is** that it's very easy to make nicely decoupled systems with event notification, without realizing that you're losing sight of that larger-scale flow" | [What do you mean by "Event-Driven"?](https://martinfowler.com/articles/201701-event-driven.html) | [一手] 高 |
| 同上 | "**The danger is** that those who do think that those who don't should do and vice-versa." | [Is Design Dead?](https://martinfowler.com/articles/designDead.html) | [一手] 高 |
| "**seductive**" | "I can see why measuring productivity is so **seductive**." | [Cannot Measure Productivity](https://martinfowler.com/bliki/CannotMeasureProductivity.html) | [一手] 高 |
| "**in practice**" | "At least there's no reason _in theory_, **in practice** it seems too easy for module boundaries to be breached" | [Microservice Premium](https://martinfowler.com/bliki/MicroservicePremium.html) | [一手] 高 |
| "**trade-off**" | "A common debate... is between spending time on improving the quality of the software versus concentrating on releasing more valuable features." / "the trade-off is illusory" | [Is High Quality Software Worth the Cost?](https://martinfowler.com/articles/is-quality-worth-cost.html)、[Design Stamina Hypothesis](https://martinfowler.com/bliki/DesignStaminaHypothesis.html) | [一手] 高 |
| "**my sense is**" | "**My sense is** that yagni-failures are relatively rare" | [Yagni](https://martinfowler.com/bliki/Yagni.html) | [一手] 高 |
| "**I feel**" | "However **I feel** that despite this rapid Semantic Diffusion, it's worth trying to keep the concepts..." | [Vibe Coding](https://martinfowler.com/bliki/VibeCoding.html) | [一手] 高 |
| "**I suppose**" | "**I suppose** that strictly you should call this a "duolith"" | [Monolith First](https://martinfowler.com/bliki/MonolithFirst.html) | [一手] 高 |
| "**of course**"（让步式） | "**Of course** you can't make such a generalization, but until the XP community hits the boundaries and fails, we can never be sure" | [Is Design Dead?](https://martinfowler.com/articles/designDead.html) | [一手] 高 |
| "**As ever**" | "**As ever**, the general guidelines on performance optimization are what counts." / "**As ever**, I'm happy that I have my own internet domain." | [Function Length](https://martinfowler.com/bliki/FunctionLength.html)、[How I use Twitter](https://martinfowler.com/articles/2022-use-twitter.html) | [一手] 高 |
| "**Sadly**"（句首） | "**Sadly** the term "vibe coding" really caught on" / "**Sadly** I don't have the time to do it." | [Vibe Coding](https://martinfowler.com/bliki/VibeCoding.html)、[What do you mean by "Event-Driven"?](https://martinfowler.com/articles/201701-event-driven.html) | [一手] 高 |
| "**I haven't the foggiest**" | "My answer to all these questions is "I haven't the foggiest"." | [Some thoughts on LLMs and Software Development](https://martinfowler.com/articles/202508-ai-thoughts.html) | [一手] 高 |
| "**first-class**" | "XP was revolutionary in how it raised testing to a **first-class activity** in software development" | [Beck Design Rules](https://martinfowler.com/bliki/BeckDesignRules.html) | [一手] 高 |

### C. 句型层面的两个小习惯

- **省略号列举**："Don't draw sequence diagrams for all use cases and scenarios - only... you get the picture."（[Is Design Dead?](https://martinfowler.com/articles/designDead.html)）[一手] 高
- **列举中的自嘲插入**："...that it's asynchronous, that it's synchronous, that the synchronicity doesn't matter...."（[Service Oriented Ambiguity](https://martinfowler.com/bliki/ServiceOrientedAmbiguity.html)）[一手] 高

---

## 确定性表达与 hedging 习惯

**结论先行：他是「强 hedging 型」，但 hedging 与断言分层使用**——对**机制/因果**高度保留，对**规范性立场**毫不犹豫。这不是和稀泥，而是"我知道什么、不知道什么"的显式标注。

### 1. hedging：把不确定性写进正文，反复出现

> "**I'm not sure** how well that will work out, but I've reached the point in my life where I'm lucky enough to be able to avoid things that make me miserable"
> —— [Retiring from Speaking](https://martinfowler.com/articles/202106-reducing-speaking.html) [一手] 高可信：连"我以后能不能拒绝演讲"这种事都用 I'm not sure。

> "**I could readily imagine** that there are some things that would fall into this category. However the reality is that we still have very little data."
> —— [Is Design Dead?](https://martinfowler.com/articles/designDead.html) [一手] 高可信：先给猜想再立刻标注证据不足。

> "**I'm still unsure.** I believe it is a balance between business value and technical risk."
> —— 同上 [一手] 高可信：公开承认自己与 Kent Beck 的分歧未解决。

> "I don't feel I have enough anecdotes yet to get a firm handle on how to decide whether to use a monolith-first strategy. These are early days in microservices, and there are relatively few anecdotes to learn from. **So anybody's advice on these topics must be seen as tentative, however confidently they argue.**"
> —— [Monolith First](https://martinfowler.com/bliki/MonolithFirst.html) [一手] 高可信：**这是他确定性表达的最佳单句证据**——把"任何人（包括他自己）在此事上的建议都是暂定的"写成了公开免责，并顺手贬了"自信的发言者"。

> "**I'd love to find a way to to prove it and almost as much to refute it.**"
> —— [Design Stamina Hypothesis](https://martinfowler.com/bliki/DesignStaminaHypothesis.html) [一手] 高可信：主动要求别人来推翻自己的核心假设。

> "**I'm aware of the problems** of planned design and **am seeking a new direction**." / "However **one thing we haven't yet figured out** is where the balance point is."
> —— [Is Design Dead?](https://martinfowler.com/articles/designDead.html) [一手] 高可信：不给确定性答案，只给"我还在找"。

> "**I'm not really sure** what counts as a panic attack, but before I go on stage I get intense feels of dread"
> —— [Retiring from Speaking](https://martinfowler.com/articles/202106-reducing-speaking.html) [一手] 高可信：连自身症状的描述都要先降级措辞。

> "Sadly I don't have the time to do it. I write this note in the hope it will be useful, **but am quite aware that it falls well short of what is really needed**."
> —— [What do you mean by "Event-Driven"?](https://martinfowler.com/articles/201701-event-driven.html) [一手] 高可信。

> "**I'm being cheeky** to call this a standard form, since nobody other than me uses it."
> —— [Writing Software Patterns](https://martinfowler.com/articles/writingPatterns.html) [一手] 高可信。

> "Okay **I might as well say it publicly** - **I still haven't got the hang of** this metaphor thing."
> —— [Is Design Dead?](https://martinfowler.com/articles/designDead.html) [一手] 高可信：他主动公开自己不懂 XP 的 Metaphor 实践。

> "However **I'd feel much more comfortable with this approach if I'd heard a decent number of stories where it worked out that way.**"
> —— [Monolith First](https://martinfowler.com/bliki/MonolithFirst.html) [一手] 高可信。

> "the extent to which / I **suspect**..." — "**I suspect** that saying prose is a good way to combat this" ([Say Your Writing](https://martinfowler.com/bliki/SayYourWriting.html)) [一手] 高

### 2. 但当立场是"方法/经济性判断"时，他毫不含糊（甚至全大写）

> "**OF COURSE IT'S A BUBBLE**. All major technological advances have come with economic bubbles"
> —— [Some thoughts on LLMs and Software Development](https://martinfowler.com/articles/202508-ai-thoughts.html) [一手] 高可信：全大写，他文本里罕见的强度标记。

> "We know **with near 100% certainty** that this bubble will pop" / "However what we don't know is _when_ it will pop"
> —— 同上 [一手] 高可信：**同一段内先给"近乎 100% 确定"，立刻标注"何时"未知**——这是他确定性表达的分层结构最清楚的样例。

> "But the counter-intuitive reality is that internal software quality removes the cruft that slows down developing new features, thus decreasing the cost of enhancing the software."
> —— [Is High Quality Software Worth the Cost?](https://martinfowler.com/articles/is-quality-worth-cost.html) [一手] 高可信。

> "**The "cost" of high internal quality software is negative.**"
> —— 同上 [一手] 高可信：极端断言。

> "So my primary guideline would be **don't even consider microservices unless you have a system that's too complex to manage as a monolith**."
> —— [Microservice Premium](https://martinfowler.com/bliki/MicroservicePremium.html) [一手] 高可信。

> "I think anyone who says they know what this future will be **is talking from an inappropriate orifice**."
> —— [Some thoughts on LLMs and Software Development](https://martinfowler.com/articles/202508-ai-thoughts.html) [一手] 高可信：对"过度自信者"的公开嘲讽（原文 "My answer to all these questions is "I haven't the foggiest". Furthermore I think anyone who says they know..."）。

### 3. 确定性表达的分层规则（[推断]，但有上述多重直接证据支撑）

| 议题类型 | 他的语气 | 证据 |
|---|---|---|
| 软件设计的经济学（质量 vs 速度） | 断言，甚至全大写/带引号的极端句 | "The "cost" of high internal quality software is negative." |
| 术语该不该这么用 | 坚定但自嘲式认输 | "I realize I may be fighting a losing game here, but I do want to preserve the precision" |
| 未来（AI / 编程职业） | 明确弃权 | "I haven't the foggiest"；"anyone who says they know... is talking from an inappropriate orifice" |
| 组织/流程该怎么做 | 给"倾向 + 前提"，标 tentative | "anybody's advice on these topics must be seen as tentative, however confidently they argue" |
| 自己懂不懂某个实践 | 直接承认不懂 | "I still haven't got the hang of this metaphor thing" |

---

## 幽默与自嘲

主调是**英式自贬 + 冷面反讽 + 对"企业腔"的蔑视**，不是为了逗乐，而是用来降低自己的权威姿态。

### 1. 自贬（最高频，几乎成默认设定）

> "I am **Martin Fowler**: an author, speaker… essentially **a loud-mouthed pundit** on the topic of software development"
> —— [About Me](https://martinfowler.com/aboutMe.html) [一手] 高可信。

> "where I have the **exceedingly inappropriate title** of "Chief Scientist""
> —— 同上 [一手] 高可信。

> "**I don't come up with original ideas**, but do a pretty good job of recognizing and packaging the ideas of others, or as Brian Foote describes me: "**an intellectual jackal with good taste in carrion**"."
> —— 同上 [一手] 高可信。

> "I enjoy the irony of it - after all **I'm chief of nobody and don't do any science**."
> —— 同上，FAQ 与 About Me 两处重复出现 [一手] 高可信。

> "as if my own wife can't treat me with professional respect what chance do I stand with anyone else?"
> —— [Is Design Dead?](https://martinfowler.com/articles/designDead.html) [一手] 高可信（讲"架构师"称谓时拿太太的工程界笑话自嘲）。

> "I saw it work, and work well on the C3 project, but it doesn't mean I have any idea how to do it, let alone how to explain how to do it."
> —— [Is Design Dead?](https://martinfowler.com/articles/designDead.html) [一手] 高可信：说到 XP 的 Metaphor 实践时，公开承认自己不会。

### 2. 冷面反讽（英式干幽默，说反话）

> "Can I link to your website? ... Just go ahead and link. (If you ask, I'll be offended, "refuse permission", and be positively outraged if you don't link to me anyway.)"
> —— [FAQ](https://martinfowler.com/faq.html) [一手] 高可信：整段是说反话。

> "I'm afraid this is not the document you're looking for. Try using the search box above, and good luck."
> —— 站点 404 页文案（他自建站的自定义文案）[一手] 高可信：引用《星球大战》台词做 404。

> "I loathe giving talks. **I far prefer a trip to the dentist to have fillings done.**"
> —— [Retiring from Speaking](https://martinfowler.com/articles/202106-reducing-speaking.html) [一手] 高可信。

> "It's ironic that it's popular terms that tend to suffer from this the most. That's inevitable, of course, since unpopular terms have less people to create the telephone chains."
> —— [Semantic Diffusion](https://martinfowler.com/bliki/SemanticDiffusion.html) [一手] 高可信：用一个"当然啦"式的自洽解释，把本该愤慨的事说得很平静——英式冷幽默的典型做法。

### 3. 荤俗/粗口式的英式粗粝（他并不避讳）

> "At the time there was a lot of "design is subjective", "design is a matter of taste" **bullshit** going around."（转引 Kent Beck）
> —— [Beck Design Rules](https://martinfowler.com/bliki/BeckDesignRules.html) [一手] 高可信。

> "Enough to get everyone's **over-hyped-bullshit detector** up and flashing."
> —— [Microservice Premium](https://martinfowler.com/bliki/MicroservicePremium.html) [一手] 高可信。

> "There are better and worse designs... but they serve to sort out some of the obvious **crap**""（转引 Kent）
> —— [Beck Design Rules](https://martinfowler.com/bliki/BeckDesignRules.html) [一手] 高可信。

> "You can't put ten pounds of **shit** into a five pound bag -- Anyone who has tried"
> —— [Five Pound Bag](https://martinfowler.com/bliki/FivePoundBag.html) [一手] 高可信：他 2005 年主动引用并保留"whimsical quote"。

> "**is talking from an inappropriate orifice**"
> —— [Some thoughts on LLMs and Software Development](https://martinfowler.com/articles/202508-ai-thoughts.html) [一手] 高可信：2025 年原文，粗俗但克制。

### 4. 用生活隐喻说反讽（"烧糊的胡萝卜"型幽默）

> "My mother, like so many English people of her generation, wasn't a great cook - particularly of vegetables. Her approach was to boil carrots for twenty minutes or more."
> —— [Boiled Carrot](https://martinfowler.com/bliki/BoiledCarrot.html) [一手] 高可信：拿亲妈厨艺开篇讲技术方法论。

> "Similarly a criticism that TDD led to a brittle design on further questioning led to the discovery that the team in question hadn't done any refactoring"
> —— 同上 [一手] 高可信。

> "**I'm reliably informed that there's no way to cook squirrels so they are appetizing to anyone who isn't desperate** (which is a shame considering what they've been doing to our garden this spring)."
> —— 同上 [一手] 高可信：典型英式迂回离题。

> "No methodology has ever failed"（他总结并加引号的形式）
> —— 同上 [一手] 高可信：把拥护者的推诿之词浓缩成一句反讽标签。

---

## 引用习惯与智识谱系线索

### 1. 最常引的是 **Kent Beck**，且是"私人对话/被纠正"式引用，不是"引书"

> "a recent conversation with Kent Beck nailed why - **it's gaslighting**. The manager claims to be a servant, but everyone knows who really has the power."
> —— [Host Leadership](https://martinfowler.com/bliki/HostLeadership.html) [一手] 高可信：把 Kent Beck 的一句话当作"揭穿谎言的锤子"。

> "> any decent answer to an interesting question begins, "it depends..." -- Kent Beck"
> —— [Microservice Premium](https://martinfowler.com/bliki/MicroservicePremium.html) [一手] 高可信：直接引 Kent 推文，然后接着说"必须从 it depends 开始，但要转到它取决于什么"。

> "The fact that size isn't important was brought home to me by an example that **Kent Beck showed me** from the original Smalltalk system."
> —— [Function Length](https://martinfowler.com/bliki/FunctionLength.html) [一手] 高可信。

> "**When reviewing this post, Kent said** "In the rare case they are in conflict... empathy wins over some strictly technical metric." **I like his point about empathy**"
> —— [Beck Design Rules](https://martinfowler.com/bliki/BeckDesignRules.html) [一手] 高可信。

> "**Kent reviewed this post and sent me some very helpful feedback, much of which I appropriated into the text.**"
> —— 同上 Acknowledgements [一手] 高可信：他的致谢页基本就是"谁审过稿"。

### 2. 其次是 **Ward Cunningham**，引的多是"概念的发明者"与"Ward 式极简的力量"

> "Technical Debt is a metaphor, **coined by Ward Cunningham**"
> —— [Technical Debt](https://martinfowler.com/bliki/TechnicalDebt.html) [一手] 高可信。

> "**As far as I can tell, Ward first introduced this concept in an experience report for OOPSLA 1992.**"
> —— 同上 [一手] 高可信：他把"溯源第一手出处"当成写作义务。

> "The name, of course, comes from **the master of Wardish ideas: Ward Cunningham** - who invented CRC cards, Wiki, and Fit."
> —— [Wardish](https://martinfowler.com/bliki/Wardish.html) [一手] 高可信。

> "As Ward Cunningham pointed out, by that he amplifies his skills, and adds more to a project than any lone hero can."
> —— [Is Design Dead?](https://martinfowler.com/articles/designDead.html) [一手] 高可信。

### 3. 引用习惯的五个固定动作

1. **标注造词人**——几乎每个术语都点名谁首创：`coined by Ward Cunningham`、`Holly Cummins neatly coined "Semantic Inversion"`、`Michael Nygard coined the term "Architecture Decision Record"`、`The term was coined in February 2025 by Andrej Karpathy`、`Andrew Koenig first coined the term "antipattern"`。
   —— [Semantic Diffusion](https://martinfowler.com/bliki/SemanticDiffusion.html)、[Architecture Decision Record](https://martinfowler.com/bliki/ArchitectureDecisionRecord.html)、[Vibe Coding](https://martinfowler.com/bliki/VibeCoding.html)、[Anti Pattern](https://martinfowler.com/bliki/AntiPattern.html) [一手] 高可信。

2. **自认转述者**——"I'm not the father or the inventor of refactoring - just a documenter."
   —— [Refactoring Malapropism](https://martinfowler.com/bliki/RefactoringMalapropism.html) [一手] 高可信。

3. **公开致谢审稿名单**——每篇文末列一长串同事名字（Thoughtworks 内部邮件列表），例如 Function Length、Yagni、Architecture Decision Record 等篇。
   —— [一手] 高可信：这是他"知识是集体的"这一信念的仪式化表达。

4. **引用后立刻自用**——引完 Kent 的 "it depends" 后马上写 "It depends must start my answer, but then I must shift the focus to what factors it depends on"。
   —— [Microservice Premium](https://martinfowler.com/bliki/MicroservicePremium.html) [一手] 高可信。

5. **偏爱"历史溯源"引用**：Paracelsus（16 世纪）、Fred Brooks《人月神话》(1975)、OOPSLA 1992、Christopher Alexander 的《A Pattern Language》。
   —— [Paracelsus Maxim](https://martinfowler.com/bliki/ParacelsusMaxim.html)、[Mythical Man Month](https://martinfowler.com/bliki/MythicalManMonth.html)、[Writing Software Patterns](https://martinfowler.com/articles/writingPatterns.html) [一手] 高可信。

### 4. 智识谱系（出现频次排序，[推断]）

**Kent Beck ≈ Ward Cunningham > Fred Brooks / Christopher Alexander > Robert C. Martin (Uncle Bob) / Ron Jeffries / Alistair Cockburn / Jim Highsmith / Rebecca Parsons / Simon Willison**

- "**I don't come up with original ideas**"（About Me）为自己的定位：原创新第一线是 Ward 与 Kent，他是"包装者与传播者"。
- 对 Simon Willison 的引用集中在 2025–2026 的 AI/安全话题（Lethal Trifecta、prompt injection），是他最新的"引用对象"。

---

## 典型文章结构

### 结构 A：bliki 短条目（"词典体"，最常见）

1. **一句话定义**（往往加粗或独立成段）
2. **起源归属**：谁造的词、哪一年
3. **误用示例**：常见的错误理解/滥用
4. **我的判断**：为什么这个区分有意义
5. **我认输或我保留**："I realize I may be fighting a losing game here"
6. **（可选）Further Reading / Acknowledgements / Notes**

原句验证：
> "A code smell is a surface indication that usually corresponds to a deeper problem in the system. **The term was first coined by Kent Beck** while helping me with my Refactoring book." → 定义 + 归属
> —— [Code Smell](https://martinfowler.com/bliki/CodeSmell.html) [一手] 高可信

> "However the term "refactoring" is often used when it's not appropriate." → 误用
> "**I realize I may be fighting a losing game here**, but I do want to preserve the precision..." → 认输
> —— [Refactoring Malapropism](https://martinfowler.com/bliki/RefactoringMalapropism.html) [一手] 高可信

### 结构 B：长文（"反直觉论点体"）

《Is High Quality Software Worth the Cost?》的目录就是范本：

1. **We are used to a trade-off between quality and cost**（普遍常识：先站在读者一边）
2. **Software quality means many things**（澄清概念：外部质量 vs 内部质量）
3. **At first glance, internal quality does not matter to customers**（**主动替反方说话**）
4. **Internal quality makes it easier to enhance software**（机制解释）
5. **Customers do care that new features come quickly**（回到读者利益）
6. **Visualizing the impact of internal quality**（图示）
7. **Even the best teams create cruft**（防止被读成"你们不够专业"）
8. **High quality software is cheaper to produce**（收束）
   —— [Is High Quality Software Worth the Cost?](https://martinfowler.com/articles/is-quality-worth-cost.html) [一手] 高可信

**"At first glance..." 这一节是他结构的标志性装置**：先替反方把话说满，再推翻。

> "Since internal quality isn't something that customers or users can see - does it matter?" → 然后一整节论证"确实看起来不重要" → 下一节"so why is it that software developers make an issue out of internal quality?"
> —— 同上 [一手] 高可信

### 结构 C：微服务类的"决定型"文章

1. 现象（"我听到很多故事，里面有个模式"）
2. 编号列出观察
3. 术语与溢价（premium）
4. **主准则**（加粗的一句决断）
5. 反方论证（"While the bulk of my contacts lean toward... it is by no means unanimous"，并链接一篇**反对自己**的文章）
6. **自曝证据不足**："I don't feel I have enough anecdotes yet..."
   —— [Monolith First](https://martinfowler.com/bliki/MonolithFirst.html) [一手] 高可信

### 结构 D：个人/观点散文

时间戳 + `❄` 分隔符 + 碎片化短章 + 每章一个反直觉观点（2025 年 AI 那篇用了 8 个雪花分隔符）
—— [Some thoughts on LLMs and Software Development](https://martinfowler.com/articles/202508-ai-thoughts.html) [一手] 高可信

### 结构 E：命名即讽刺（一词一篇）

> 《Sunk Cost Driven Architecture》正文只有 4 句。标题本身就是全部论点。
> —— [Sunk Cost Driven Architecture](https://martinfowler.com/bliki/SunkCostDrivenArchitecture.html) [一手] 高可信

### 关于"开头方式 / 结尾方式"的归纳

- **开头三式**：① "我听到一个模式"（Monolith First）；② "大家都这么吵"（Is Quality Worth Cost）；③ 一个生活小故事（Boiled Carrot 的胡萝卜）。
- **结尾四式**：① 单动词祈使句（"if you can keep your system simple enough to avoid the need for microservices: do."）；② 自嘲收尾（"And I'm a big fan of evolution - otherwise who knows what I might be?"）；③ 承认文章不足（"falls well short of what is really needed"）；④ 回到"值得为之战斗"（"a good term is worth fighting for - particularly since the only bullets you need are words."）。
  —— [Microservice Premium](https://martinfowler.com/bliki/MicroservicePremium.html)、[Is Design Dead?](https://martinfowler.com/articles/designDead.html)、[What do you mean by "Event-Driven"?](https://martinfowler.com/articles/201701-event-driven.html)、[Semantic Diffusion](https://martinfowler.com/bliki/SemanticDiffusion.html) [一手] 高可信

---

## 他批评别人时用的词

按"批评烈度"分层，全部有原句。

| 烈度 | 用词 | 原句 | 来源 |
|---|---|---|---|
| 最重（脏话级） | **bullshit** | "there was a lot of "design is subjective", "design is a matter of taste" **bullshit** going around" | [Beck Design Rules](https://martinfowler.com/bliki/BeckDesignRules.html) |
| 最重 | **over-hyped-bullshit detector** | "Enough to get everyone's **over-hyped-bullshit detector** up and flashing." | [Microservice Premium](https://martinfowler.com/bliki/MicroservicePremium.html) |
| 最重 | **inappropriate orifice** | "I think anyone who says they know what this future will be is **talking from an inappropriate orifice**." | [Some thoughts on LLMs…](https://martinfowler.com/articles/202508-ai-thoughts.html) |
| 重（人格化贬低） | **flawed / path down the wrong direction** | "Bimodal IT is the **flawed** notion that..." / "I think that Bimodal IT is really **a path down the wrong direction**" | [Bimodal IT](https://martinfowler.com/bliki/BimodalIT.html) |
| 重（反讽标签） | **Bipolar IT** | "(I find it hard to resist calling it "**Bipolar IT**".)" | 同上 |
| 重（造词羞辱） | **Flaccid Scrum / weak at the knees** | "your scrum has **gone weak at the knees**. (And if you've been in a real scrum, you'll know that's a Bad Thing.)" | [Flaccid Scrum](https://martinfowler.com/bliki/FlaccidScrum.html) |
| 重（造词羞辱） | **Sunk Cost Driven Architecture** | "I find this to be a **sadly common** architectural style." | [Sunk Cost Driven Architecture](https://martinfowler.com/bliki/SunkCostDrivenArchitecture.html) |
| 中（点名错误命名） | **Malapropism** | 标题《Refactoring Malapropism》"If somebody talks about a system being broken for a couple of days while they are refactoring, you can be pretty sure they are not refactoring." | [Refactoring Malapropism](https://martinfowler.com/bliki/RefactoringMalapropism.html) |
| 中（借别人的词） | **Cargo Cult（Software Engineering）** | "This kind of thing is what **Steve McConnell called Cargo Cult Software Engineering**." | [Boiled Carrot](https://martinfowler.com/bliki/BoiledCarrot.html) |
| 中（诱惑性） | **seductive** | "I can see why measuring productivity is so **seductive**. ... But **false measures only make things worse**." | [Cannot Measure Productivity](https://martinfowler.com/bliki/CannotMeasureProductivity.html) |
| 中（溢价/成本） | **premium** | "This adds a **premium** to a project's cost and risk - one that often gets projects into serious trouble." | [Microservice Premium](https://martinfowler.com/bliki/MicroservicePremium.html) |
| 中（不诚实） | **gaslighting** | "That's never sounded quite right to me, and a recent conversation with Kent Beck nailed why - **it's gaslighting**." | [Host Leadership](https://martinfowler.com/bliki/HostLeadership.html) |
| 中（反讽口号） | **"No methodology has ever failed"** | "we also get the situation that I've observed as "**no methodology has ever failed**"." | [Boiled Carrot](https://martinfowler.com/bliki/BoiledCarrot.html) |
| 轻（无意义） | **semantics-free concept** | "I think SOA has turned into a **semantics-free concept** that can join 'components' and 'architecture'. **It's beyond saving**" | [Service Oriented Ambiguity](https://martinfowler.com/bliki/ServiceOrientedAmbiguity.html) |
| 轻（浪费时间） | **calendar sludge / polite vetoes** | "In practice, RACI often turns decisions into **calendar sludge and polite vetoes**."（注：此句出自 Jim Highsmith 署名文，非 Fowler 本人所写，仅作风格对照，**不计入 Fowler 语料**） | [Stop Picking Sides](https://martinfowler.com/articles/stop-picking-sides.html) |
| 轻（企业腔） | **flabby / tasteless pudding / rife and ruinous** | "Too often I read prose that feels **flabby**." / "some sparkling prose by a colleague of mine was turned by editors at Microsoft into a **tasteless pudding**" / "a perceptible corporate way of writing... **rife and ruinous**" | [Say Your Writing](https://martinfowler.com/bliki/SayYourWriting.html) |
| 轻（AI 味） | **LLM miasma** | "it's a sense of **LLM miasma** that pervades the prose" | 同上 |

**批评的对象分层（[推断]）**：
- 骂"人"极少（几乎不指名攻击个人），骂"说法/做法/组织行为"为主。
- 最痛恨的是**语义漂移**（semantic diffusion / malapropism / semantic-free concept）——他愿意为此反复写文章。
- 其次是**用指标替代判断**（LOC、function points、"if you can't measure it you can't manage it"）。
- 第三是**把质量当成本可交易**（tradable quality hypothesis、Bimodal IT）。

---

## 中文译名与中文技术圈称呼

| 项 | 内容 | 来源 | 可信度 |
|---|---|---|---|
| **通行译名** | **马丁·福勒** | 中文出版社署名：[豆瓣《重构》条目](https://book.douban.com/subject/1229923/) 作者栏 "[美国] 马丁·福勒"；[中国出版传媒商报](https://www.cbbr.com.cn/article/127553.html) 作 "[美]马丁·福勒（Martin Fowler）" | [二手] 高可信（出版方一致） |
| 其它译法 | 中文技术社区偶见「马丁·富勒」「福勒」等写法；**简体出版界（中国电力、人民邮电）统一使用「马丁·福勒」** | 同上 | [二手] 中（婢子见到的是出版方一致而非全圈一致，故不标"高"） |
| 常见称呼 | 中文技术圈多直呼 **"Martin Fowler"** 或 **"Fowler"**（不译）；谈及书时用「《重构》作者」 | [推断]，基于出版与书目惯例 | 中 |
| 头衔译法 | **ThoughtWorks 首席科学家**（他自嘲"我谁的首席也不是，也不做科学"）；中文圈常写 Thoughtworks | [豆瓣作者简介](https://book.douban.com/subject/1229923/) + [About Me](https://martinfowler.com/aboutMe.html) | [一手]+[二手] 高 |
| 代表作中文名 | 《重构：改善既有代码的设计》（第1版 2003 中国电力/侯捷·熊节；第2版 2019 人民邮电，熊节、林从羽译）、《企业应用架构模式》、《UML 精粹》、《分析模式》 | [豆瓣](https://book.douban.com/subject/1229923/)、[IBTimes 转载](https://www.cbbr.com.cn/article/127553.html) | [二手] 高 |
| 「重构」一词 | 中文技术圈把「重构」当成日常动词使用（"这个模块要重构一下"）——**这正是他本人写《Refactoring Malapropism》批评的用法**。中文语境下这个"语义扩散"比英文更严重 | [一手]（他原文）+[推断]（中文用法） | 高（英文侧）/ 中（中文侧） |

---

## 未核实项

以下条目婢子**没有取得足以引用的证据**，如需使用请先补证，**不得凭印象写**：

1. **破折号（em dash）打断主句的频率**。本次抓取的语料中，破折号多用于并列与举例（"-"），未见教科书式的"破折号插入长从句"。他的插入语主要靠**括号**与**脚注**。→ 结论应为"以括号/脚注为主，破折号次之"，但**缺乏反面量化证据**。
2. **@martinfowler 的 X/Twitter 原文语气**。twitter.com 在本环境被网络策略拦截（返回 "resolves to a non-public IP address"），未能抓到任何推文原文。仅有他本人在 [How I use Twitter](https://martinfowler.com/articles/2022-use-twitter.html) 中的自述："As a writer I mostly post links to articles... I try to avoid getting into arguments... **I find it harder to resist attempting catchy soundbites.**"，以及他自报的推文分类统计（50 条中 36 条是文章链接、6 条活动公告、8 条"catchy quote"，28 条回复"none of which were conversations"）。→ 一手推文语气**未核实**。
3. **他本人的口头表达/演讲原话（transcript）**。InfoQ、YouTube 演讲的字幕未取得。所有"说话风格"结论均由**书面语**推导，且他本身承认自己以写作为思考方式（"I've become a natural writer, someone who finds the process of writing an essential part of thinking"）。他同时明确表示**厌恶演讲**（"I loathe giving talks"）并在 2021 年退出演讲。→ 口语风格**未核实**，请勿把书面 DNA 直接当口语 DNA。
4. **"the key thing"** 这一短语未在本次语料中找到逐字出处。最接近的是 "The key point about vibe coding is..."（Vibe Coding）与 "The key is to put the most important material at the start"（Architecture Decision Record）。→ **未核实**是否存在 "the key thing" 的固定用法。
5. **cargo cult 是否由他本人作为独立 bliki 条目写过**。本次尝试 `CargoCultSoftwareDevelopment.html` 返回 404；他在 [Boiled Carrot](https://martinfowler.com/bliki/BoiledCarrot.html) 中明确把它归给 **Steve McConnell**（`stevemcconnell.com`）。→ "他把 cargo cult 当作自己的批评词"**未核实**；只能说他会引用该词并注明出处。
6. **其英式口音/英格兰背景在幽默上的自觉程度**。仅有间接线索：About Me 中"I miss the particular beauties of the English countryside"、Boiled Carrot 中拿"English people of her generation"的厨艺开涮、Host Leadership 中"gaslighting"式的直白批评。→ "他自觉使用英式反讽"**属推断**，无自述证据。
7. **All-uppercase 是否是常规习惯**，还是 2025 年那篇的偶发行为。仅见一例（"OF COURSE IT'S A BUBBLE"）。→ 样本不足。

---

## 一页速查（供 Skill 编写者直接取用）

**确定性表达结论**：**强 hedging 型**，但分层——对**未来与机制**明确弃权（"I haven't the foggiest"、"anybody's advice on these topics must be seen as tentative, however confidently they argue"），对**软件设计与经济性**毫不含糊甚至全大写（"OF COURSE IT'S A BUBBLE"、"The "cost" of high internal quality software is negative."）。

**三个最有辨识度的风格特征**：
1. **括号降调**——最重的话放正文，最不确定的限定、最自嘲的话、最个人的小故事放括号。
2. **术语考古 + 造词**——几乎每个概念都追问"谁造的、哪一年"，同时自己造词（cruft / Microservice Premium / Semantic Diffusion / Boiled Carrot / Flaccid Scrum）。
3. **先替反方说完，再推翻，最后自曝证据不足**——"At first glance, internal quality does not matter to customers" → 论证 → "I don't feel I have enough anecdotes yet"。
