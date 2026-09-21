# Simon Willison 著作与系统性长文调研

> **聚焦主题**：「把 LLM 当成一个极快但会自信说错的协作者」——一切产出必须有可运行的验证兜底。
> **调研时间**：本次会话（站内最新文章日期为 2026-09-12，故取证窗口覆盖 2002–2026-09）。
> **信源分级**：`[一手]` = Willison 自己写的（simonwillison.net / til.simonwillison.net / 他的 GitHub）；`[二手]` = 别人写他或第三方出版方；`[推断]` = 萧潇的推理，非他原话。
> **举证原则**：每条关键观点标注时间点（能到日就到日）。查不到的写「未核实」，不做填补。

---

## 0. 一句话结论（给主子的速览）

Simon Willison 在整个 2022–2026 年反复表达的，是一套**单一、稳定、跨模型世代不失效**的工程纪律：

> **LLM 是一个极快、极自信、会把不存在的东西说得像真的一样的协作者；因此「运行过的证据」是人不能外包的部分。**
> 到了 agent 时代，这条纪律被他一分为二：
> ①**产出侧**——「没跑过就不算能工作」（`run the code`、red/green TDD、「First run the tests」、Showboat 留证）；
> ②**输入侧**——「agent 读到的一切都是不可信输入」（prompt injection / lethal trifecta / 沙箱 / YOLO 模式警告 / 凭据不进沙箱）。

这两条合起来，才是他「可运行的验证兜底」的完整形态：**不只是验证 LLM 写出来的代码，还要把 LLM 读进来的内容当作攻击面。**

---

## 1. 核心长文清单（按主题分组的"必读"）

### 1.1 LLM 辅助编码方法论（最重要的一手长文）

| 时间 | 标题 / URL | 关注点 |
|---|---|---|
| 2023-03-27 | [AI-enhanced development makes me more ambitious with my projects](https://simonwillison.net/2023/Mar/27/ai-enhanced-development/) | 早期定调：LLM 的价值不是「更快」，而是「让本来不值得做的项目变得值得做」`[一手]` |
| 2025-03-02 | [Hallucinations in code are the least dangerous form of LLM mistakes](https://simonwillison.net/2025/Mar/2/hallucinations-in-code/) | **本聚焦点的核心文本**。幻觉是代码里最无害的错误，因为它会被运行立刻抓住；真正危险的是「编译通过、看起来漂亮、但做错事」的代码 `[一手]` |
| 2025-03-11 | [Here's how I use LLMs to help me write code](https://simonwillison.net/2025/Mar/11/using-llms-for-code/) | 他最长的一篇方法论。「You have to test what it writes!」是其中一个独立小节 `[一手]` |
| 2025-03-19 | [Not all AI-assisted programming is vibe coding (but vibe coding rocks)](https://simonwillison.net/2025/Mar/19/vibe-coding/) | 提出「vibe coding ≠ 所有 AI 辅助编程」，并首次系统给出「什么时候可以 vibe code」的四条边界 `[一手]` |
| 2025-05-01 | [Two publishers and three authors fail to understand what "vibe coding" means](https://simonwillison.net/2025/May/1/not-vibe-coding/) | 语义保卫战。他自称「这是我愿意为之战死的一座山丘」`[一手]` |
| 2025-10-07 | [Vibe engineering](https://simonwillison.net/2025/Oct/7/vibe-engineering/) | 提出「vibe engineering」作为专业侧的另一端；同时给出**「LLM 会奖励既有的顶级工程实践」清单**（自动化测试第一项）`[一手]` |
| 2025-12-18 | [Your job is to deliver code you have proven to work](https://simonwillison.net/2025/Dec/18/code-proven-to-work/) | **本聚焦点最直白的一篇**。手动测试 + 自动化测试两步「证明」流程，明确「两者都不是可选项」`[一手]` |
| 2026-02-23 | [Writing about Agentic Engineering Patterns](https://simonwillison.net/2026/Feb/23/agentic-engineering-patterns/) | 他称之为「not-quite-a-book」的系统性项目启动 `[一手]` |

### 1.2 系统性长文 / 指南（他的"书"其实是这个）

- **[Agentic Engineering Patterns](https://simonwillison.net/guides/agentic-engineering-patterns/)**（2026-02-23 起，持续增补）`[一手]`
  目录（截至本次抓取）：
  - **Principles**：What is agentic engineering? / Writing code is cheap now / Hoard things you know how to do / AI should help us produce better code / Anti-patterns
  - **Working with coding agents**：How coding agents work / Using Git with coding agents / Subagents
  - **Testing and QA**：**Red/green TDD** / **First run the tests** / **Agentic manual testing**
  - **Understanding code**：Linear walkthroughs / Interactive explanations
  - **Annotated prompts**：GIF optimization / Adding a new content type
  - **Appendix**：Prompts I use（Artifacts / Proofreader / Alt text / Podcast highlights）
  他明说：**「No chapter should be considered finished.」**（不追求完结，随工具演进而更新）`[一手]`

- **[Prompt injection 系列](https://simonwillison.net/series/prompt-injection/)**（2022-09-12 起，持续至今）`[一手]`
  已抓取到的系列编号至少到 23 号（2025-11-02）。前 3 篇是奠基：
  1. [Prompt injection attacks against GPT-3](https://simonwillison.net/2022/Sep/12/prompt-injection/)（2022-09-12）
  2. [I don't know how to solve prompt injection](https://simonwillison.net/2022/Sep/16/prompt-injection-solutions/)（2022-09-16）
  3. [You can't solve AI security problems with more AI](https://simonwillison.net/2022/Sep/17/prompt-injection-more-ai/)（2022-09-17）

- **年度综述系列（LLMs annual review）** `[一手]`
  - [Stuff we figured out about AI in 2023](https://simonwillison.net/2023/Dec/31/ai-in-2023/)（2023-12-31）
  - [Things we learned about LLMs in 2024](https://simonwillison.net/2024/Dec/31/llms-in-2024/)（2024-12-31）
  - [The last six months in LLMs, illustrated by pelicans on bicycles](https://simonwillison.net/2025/Jun/6/six-months-in-llms/)（2025-06-06，AI Engineer World's Fair keynote，6077 词）
  - [2025: The year in LLMs](https://simonwillison.net/2025/Dec/31/the-year-in-llms/)（2025-12-31，极长，含 25 个年度主题小节）

- **演讲型长文（annotated presentations）** `[一手]`
  - [My Lethal Trifecta talk at the Bay Area AI Security Meetup](https://simonwillison.net/2025/Aug/9/bay-area-ai/)（2025-08-09，2843 词）
  - [Living dangerously with Claude](https://simonwillison.net/2025/Oct/22/living-dangerously-with-claude/)（2025-10-22，Claude Code Anonymous，22 张幻灯片全文注解）

- **其他聚焦相关长文** `[一手]`
  - [The lethal trifecta for AI agents](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/)（2025-06-16，1324 词）
  - [New prompt injection papers: Agents Rule of Two and The Attacker Moves Second](https://simonwillison.net/2025/Nov/2/new-prompt-injection-papers/)（2025-11-02，1433 词）
  - [Design Patterns for Securing LLM Agents against Prompt Injections](https://simonwillison.net/2025/Jun/13/prompt-injection-design-patterns/)（2025-06-13）
  - [CaMeL offers a promising new direction for mitigating prompt injection attacks](https://simonwillison.net/2025/Apr/11/camel/)（2025-04-11）
  - [Running Python code in a sandbox with MicroPython and WASM](https://simonwillison.net/2026/Jun/6/micropython-in-a-sandbox/)（2026-06-06，2024 词）
  - [LLM predictions for 2026, shared with Oxide and Friends](https://simonwillison.net/2026/Jan/8/llm-predictions-for-2026/)（2026-01-08）

### 1.3 书的核实结果（重要更正）

**结论：外面流传的「他与 Jacob Kaplan-Moss 合著《The Definitive Guide to Django》」是不准确的。** 需按下面写：

| 书名 | 实际作者 | 他的角色 | 时间 | 信源 |
|---|---|---|---|---|
| **The Definitive Guide to Django: Web Development Done Right**（Apress） | Adrian Holovaty + Jacob Kaplan-Moss | **贡献了 newforms 一章**，非合著者 | 2007-12 出货（Amazon）/ 2008 版 | `[一手]` 他自己的 2007-12-11 博文原文：「bias disclosure: I contributed the newforms chapter」<br>`[二手]` Springer / Google Books 均只列 Holovaty + Kaplan-Moss 为作者 |
| **The Art & Science of JavaScript**（SitePoint） | 多人合著 | **贡献一章**（讲用纯客户端代码做 Flickr / Google Maps mashup，基于 JSON-P） | 2008-01 出货 | `[一手]` [books 标签页](https://simonwillison.net/tags/books/) 2008-01-12 条目 |
| **DHTML Utopia: Modern Web Design Using JavaScript & DOM**（SitePoint） | Stuart Langridge | **技术编辑**（technical editor） | 2005-06 | `[一手]` [books 标签页](https://simonwillison.net/tags/books/) 2005-06-03 条目 |
| **Prompts.js / LLM 相关自出版书** | — | — | — | **未核实到任何自出版 LLM 书籍。** 他 2026-02-23 明确称 Agentic Engineering Patterns 为「not-quite-a-book」（**不是**出版书）。任务描述里提到的「*Building Generative AI for Developers* 之类的书名」**在其站点无任何痕迹，判定为不存在的书名，不应写入** |

> ⚠️ **不要写进产出**：`Django for Beginners`（那是 William Vincent 的书，与 Willison 无关）；`Building Generative AI for Developers`（未核实，疑似杜撰）。

### 1.4 TIL（til.simonwillison.net）——揭示其实践习惯

- 站点定位：一句话——「Things I've learned, collected in [simonw/til](https://github.com/simonw/til)」`[一手]`
- **规模：582 条 TIL**（截至抓取）。
- 高频主题（暴露他的日常）：`python` 66、`sqlite` 55、`github-actions` 30、`llms` 26、`macos` 26、`pytest` 24、`django` 19、`github` 19、`datasette` 18、`javascript` 16、`bash` 11、`gpt3` 11、`cloudflare` 10、`fly` 10、`postgresql` 7、`sql` 5。`[一手]`
- **与验证纪律直接相关的 TIL**：
  - [Dependency groups and uv run](https://til.simonwillison.net/uv/dependency-groups)（2025-12-02）——他用 PEP 735 `dev` 组，让「`uv run pytest`」成为给 agent 的四字咒语（这一条被他在 Agentic Engineering Patterns 里回引）`[一手]`
  - [Using Playwright MCP with Claude Code](https://til.simonwillison.net/claude-code/playwright-mcp-claude-code)（2025-07-01）——浏览器自动化用于 agent 手动测试 `[一手]`
  - [Previewing Claude Code for web branches with GitHub Pages](https://til.simonwillison.net/claude-code/preview-github-pages)（2026-01-22）——「preview 环境」纪律的落地 `[一手]`
  - [Subtests in pytest 9.0.0+](https://til.simonwillison.net/pytest/subtests)（2025-12-04）、[Testing different Python versions with uv](https://til.simonwillison.net/python/uv-tests)（2025-10-08）——测试基础设施习惯 `[一手]`
  - [Running a gpt-oss eval suite against LM Studio on a Mac](https://til.simonwillison.net/llms/gpt-oss-evals)（2025-08-16）、[Using Blender with coding agents on macOS](https://til.simonwillison.net/llms/blender-coding-agents-macos)（2026-09-05）——他连 LLM 本身都要跑官方 eval 套件来验证 `[一手]`
- **TIL 本身就是他的方法论制品**：把「一次性的摸索」沉淀成可复现的配方，而不是留在会话里。594 条配方的存在，是他「可复现优先」最硬的证据 `[推断]`

---

## 2. 反复出现的核心论点（≥3 次 = 真信念）

### 论点 A：LLM 是「过度自信的结对编程搭子」，不是权威

- 「My current favorite mental model is to think of them as an **over-confident pair programming assistant** who's lightning fast at looking things up... **Over-confident** is important.」— [2025-03-11](https://simonwillison.net/2025/Mar/11/using-llms-for-code/) `[一手]`
- 「LLMs are still fancy autocomplete.」同篇 `[一手]`
- 「**Don't fall into the trap of anthropomorphizing LLMs** and assuming that failures which would discredit a human should discredit the machine in the same way.」（同篇）`[一手]`
- 对应纪律：**「给函数签名，让它填实现体」**——他做设计者（function designer），LLM 做打字员（digital intern）`[一手]`

### 论点 B：幻觉是代码里「最无害」的错误——因为运行会立刻抓住它

- 「Hallucinations in code **are the least harmful hallucinations you can encounter from a model**.」（[2025-03-02](https://simonwillison.net/2025/Mar/2/hallucinations-in-code/)）`[一手]`
- 「The moment you run LLM generated code, any hallucinated methods will be instantly obvious: you'll get an error.」同篇 `[一手]`
- 「With code you get a powerful form of fact checking for free. **Run the code, see if it works.**」同篇 `[一手]`
- 「If you're using an LLM to write code without even running it yourself, _what are you doing?_」同篇 `[一手]`
- **这句是整套「可运行验证兜底」的种子**：代码有编译/运行这个免费的事实校验器，散文没有——所以他反复说「要投资在强化人工 QA 习惯上」`[一手]`

### 论点 C：真正的风险不是幻觉，而是「看起来完美、跑起来不报错、但做错了事」的代码

- 「The real risk from using LLMs for code is that they'll make mistakes that _aren't_ instantly caught by the language compiler or interpreter. And these happen _all the time_!」（[2025-03-02](https://simonwillison.net/2025/Mar/2/hallucinations-in-code/)）`[一手]`
- 「LLM code will usually look fantastic: good variable names, convincing comments, clear type annotations and a logical structure. **This can lull you into a false sense of security**...」（同篇）`[一手]`
- 「Just because code passes tests doesn't mean it works as intended.」（[Agentic manual testing](https://simonwillison.net/guides/agentic-engineering-patterns/agentic-manual-testing/)）`[一手]`
- **推论（萧潇）**：他实际上把「验证」分成了三层——编译/运行（抓幻觉）→ 自动化测试（抓回归与边界）→ 人工手动测试（抓「测试没覆盖但明显错了」）。三层缺一不可，因为他明确说「Never assume that code generated by an LLM works until that code has been executed」`[一手]` + `[推断]` 分层是我归纳的

### 论点 D：测试是 AI 时代最被低估的杠杆（"护城河"的实际所指）

> 注：他**从未**用过「测试是可运行的证据是 AI 时代的护城河」这类措辞。以下是他的原意，措辞是萧潇的转写。

- 「**Automated tests are no longer optional** when working with coding agents.」（[First run the tests](https://simonwillison.net/guides/agentic-engineering-patterns/first-run-the-tests/)）`[一手]`
- 「They're also _vital_ for ensuring AI-generated code does what it claims to do. **If the code has never been executed it's pure luck if it actually works when deployed to production.**」同篇 `[一手]`
- 「**LLMs actively reward existing top tier software engineering practices**」——清单第一条就是 Automated testing；「Without tests? Your agent might claim something works without having actually tested it at all」— [2025-10-07 Vibe engineering](https://simonwillison.net/2025/Oct/7/vibe-engineering/) `[一手]`
- 「If your project has a robust, comprehensive and stable test suite agentic coding tools can _fly_ with it.」同篇 `[一手]`
- 「the latest coding agents against the ~November 2025 frontier models are remarkably effective if you can give them an existing test suite to work against. I call these **conformance suites**」— [2025-12-31](https://simonwillison.net/2025/Dec/31/the-year-in-llms/) `[一手]`
- **他进一步把它当成战略建议**：「If you're introducing a new protocol or even a new programming language to the world in 2026 I strongly recommend including a language-agnostic conformance suite as part of your project.」同篇 `[一手]`
  → 含义：**一套能被机器独立执行的测试套件，比文档更能让新技术被 agent 学会。** 这是「验证兜底」从防守变成进攻的一步 `[一手]`

### 论点 E：Prompt injection 不能靠「更多 AI」解决——必须砍掉三脚之一

（出现 ≥6 次，是他最长寿的单一信念）

- 「You can't solve AI security problems with more AI」— 2022-09-17，标题即论点 `[一手]`
- 2022-09-12 原文里就记录了「用另一个 AI 检测注入会被反向说服」的实证（Marco Buono 的例子）`[一手]`
- 「Plenty of vendors will sell you 'guardrail' products... they'll almost always carry confident claims that they capture '95% of attacks'... but in web application security **95% is very much a failing grade**」— [2025-06-16](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) `[一手]`
- 「Some people will try to convince you that prompt injection attacks can be solved using more AI to detect the attacks. **This does not work 100% reliably, which means it's not a useful security defense at all.**」— [2025-10-22](https://simonwillison.net/2025/Oct/22/living-dangerously-with-claude/) `[一手]`
- 「I've seen allow-lists against command patterns like this in a bunch of different agent tools and **I don't trust them at all — they feel inherently unreliable to me.**」— [2026-03-18 评 Snowflake Cortex 沙箱逃逸](https://simonwillison.net/2026/Mar/18/snowflake-cortex-ai/) `[一手]`
- 2026-08-08 对 Anthropic「auto mode 拦住 89% 危险动作」的评价：「Of course, that still leaves 11% of cases where auto mode would _not_ have prevented the action!」+「I'm not sure how any version of auto mode could protect against that kind of malfeasance.」`[一手]`

### 论点 F：AI 放大既有专业能力（amplify, not replace）

- 「**LLMs amplify existing expertise**」（[2025-03-11](https://simonwillison.net/2025/Mar/11/using-llms-for-code/) 独立小节标题）`[一手]`
- 「AI tools **amplify existing expertise**. The more skills and experience you have as a software engineer the faster and better the results you can get」（[2025-10-07](https://simonwillison.net/2025/Oct/7/vibe-engineering/)）`[一手]`
- 「The more time I spend on AI-assisted programming the less afraid I am for my job, because it turns out building software... still requires enormous skill, experience and depth of understanding.」（[2026-01-08](https://simonwillison.net/2026/Jan/8/llm-predictions-for-2026/)）`[一手]`
- 「The skills are changing though! Being able to read a detailed specification and transform it into lines of code is the thing that's being automated away. What's left is everything else...」同篇 `[一手]`

### 论点 G：代码写得便宜 ≠ 代码是好的

- 「Delivering new code has dropped in price to almost free... but **delivering _good_ code remains significantly more expensive than that.**」（[Writing code is cheap now](https://simonwillison.net/guides/agentic-engineering-patterns/code-is-cheap/)）`[一手]`
- 他给「good code」下了 8 条定义，第二条直接是：「**We _know_ the code works.** We've taken steps to confirm to ourselves and to others that the code is fit for purpose.」同篇 `[一手]`
- 「Almost anyone can prompt an LLM to generate a thousand-line patch and submit it for code review. **That's no longer valuable.** What's valuable is contributing _code that is proven to work_.」（[2025-12-18](https://simonwillison.net/2025/Dec/18/code-proven-to-work/)）`[一手]`

### 论点 H：责任无法外包给机器

- 他 2025-02-03 专门转载了 1979 年 IBM 内部培训的那页：「**A computer can never be held accountable / Therefore a computer must never make a management decision**」（[来源](https://simonwillison.net/2025/Feb/3/a-computer-can-never-be-held-accountable/)）`[一手]`（图注为 `[二手]`，1979 IBM 原件已毁于 2019 年洪水，IBM 档案馆亦找不到）
- 「**The human provides the accountability.** [A computer can never be held accountable]. That's your job as the human in the loop.」（[2025-12-18](https://simonwillison.net/2025/Dec/18/code-proven-to-work/) 小节标题）`[一手]`

---

## 3. 自创术语与概念（核实归属——哪些确实是他造的）

### 3.1 确实是他造的 / 他自称造的

| 术语 | 首次提出 | 原话证据 | 归属 |
|---|---|---|---|
| **prompt injection** | **2022-09-12** | 「I propose that the obvious name for this should be **prompt injection**.」；2025 年他仍写「a term I coined [three years ago]」；2025-06-16 写「I coined the term **prompt injection** a few years ago」 | ✅ **他的** `[一手]` |
| **lethal trifecta** | **2025-06-16** | 「I tried a new linguistic trick! In June I coined the term the lethal trifecta」；「my one attempted coinage of the year that seems to have taken root」 | ✅ **他的** `[一手]` |
| **vibe engineering** | **2025-10-07** | 「I propose we call this **vibe engineering**, with my tongue only partially in my cheek.」；「Is this a stupid name? Yeah, probably.」 | ✅ **他的**（但他 2026-02-23 追加更新：这个词被 **Agentic Engineering** 盖过了）`[一手]` |
| **asynchronous coding agent** | **2025-08-06** | 列在他 2025 年度自选词表里（「for Claude for web / Codex cloud / Google Jules」） | ✅ **他的** `[一手]` |
| **vibe scraping** | **2025-07-17** | 年度自选词表：「another of mine that didn't really go anywhere」 | ✅ **他的**（他自认失败）`[一手]` |
| **conformance suites** | **2025-12-31**（表述）| 「I call these **conformance suites** and I've started deliberately looking out for them」；2026-01-08 重复使用：「the cheat code is the conformance suites」 | ✅ **他的用法** `[一手]` |
| **coding agents** | 2025 年内成形 | 「the most prominent example of what I call **coding agents**—LLM systems that can write code, execute that code, inspect the results and then iterate further」 | ✅ 他定义并推广的用法 `[一手]` |
| **AI-assisted programming** | ~2023 起 | 「I've tried in the past to get terms like AI-assisted programming to stick, **with approximately zero success**」 | ✅ 他的尝试（自认失败）`[一手]` |

### 3.2 **不是**他造的（重要，防止误归因）

| 术语 | 真实归属 | 证据 |
|---|---|---|
| **vibe coding** | **Andrej Karpathy**，2025-02（Karpathy 推文）；Willison 是**引用者 + 定义保卫者**，不是发明者 | [2025-02-06](https://simonwillison.net/2025/Feb/6/andrej-karpathy/) 是一篇纯 quotation 帖；[2025-03-19](https://simonwillison.net/2025/Mar/19/vibe-coding/)「The term was coined by Andrej Karpathy just a few weeks ago」`[一手]` |
| **YOLO mode** | 非他造。他明说「`--dangerously-skip-permissions` is a bit of a mouthful, so I'm going to use **its better name**, "YOLO mode"」——语气显示是既有俗称。Codex CLI 甚至把 `--dangerously-bypass-approvals-and-sandbox` 直接别名为 `--yolo` | [2025-10-22](https://simonwillison.net/2025/Oct/22/living-dangerously-with-claude/)、[2025-12-31](https://simonwillison.net/2025/Dec/31/the-year-in-llms/) `[一手]` |
| **agentic engineering** | **共享/竞争词**。他 2026-02-11 记录：Z.ai 的 GLM-5 博客用了它，「most notable from Andrej Karpathy and Addy Osmani」。他 2026-02-23 用它命名自己的指南 | `[一手]` `[冲突]`（归属非独占） |
| **semantic diffusion** | Martin Fowler | 他 2025-03-23 专门写帖引入；2025-12-31 用它解释 prompt injection 被误用 |
| **context rot** | Workaccount2（Hacker News 用户） | 他在 2025-12-31 的「My own words of the year」里明确标了出处 |
| **slopsquatting** | Seth Larson | 同上，他明确标了出处 |
| **extractive contributions** | Nadia Eghbal | 同上 |
| **slop** | 非他造；他自认「played a tiny role helping to popularize the term in 2024」 | 同上 |
| **normalization of deviance** | 社会学家 **Diane Vaughan**（用于解释 1986 挑战者号事故）；在 AI 语境由 **Johann Rehberger** 引入，Willison 是**转述传播者** | [2025-12-31](https://simonwillison.net/2025/Dec/31/the-year-in-llms/) 他写得很清楚 `[一手]` |

### 3.3 他造词的方法论（值得单列，因为这是他的元技能）

> 「A trick I use here is that people will jump straight to the most obvious definition of any new term that they hear. "Prompt injection" sounds like it means "injecting prompts". **"The lethal trifecta" is deliberately ambiguous: you have to go searching for my definition if you want to know what it means!**」
> — [2025-12-31](https://simonwillison.net/2025/Dec/31/the-year-in-llms/) `[一手]`

他把命名当成**认知武器**：故意选一个「第一直觉定义不对」的词，逼人去找他的定义，从而绕过「semantic diffusion（语义扩散）」的稀释。`[一手]` + `[推断]`（后一句"认知武器"是萧潇的概括）

---

## 4. 关于 AI 辅助编码的具体主张与时间线

### 4.1 时间线（这是本文件最该被引用的部分——他的观点随模型换代快速过期）

| 日期 | 事件 / 主张 | 出处 |
|---|---|---|
| **2022-09-12** | 造词 **prompt injection**；并附 SQL injection 类比，预言「参数化 prompt」是解法（后于 2023-04-13 自我推翻：「extremely difficult, if not impossible」） | [链接](https://simonwillison.net/2022/Sep/12/prompt-injection/) `[一手]` |
| **2022-09-16/17** | 「我不知道怎么解」「不能用更多 AI 解」 | [链接1](https://simonwillison.net/2022/Sep/16/prompt-injection-solutions/) [链接2](https://simonwillison.net/2022/Sep/17/prompt-injection-more-ai/) `[一手]` |
| **2023-03-27** | 「AI 增强开发让我对项目更有野心」——价值定位从「更快」转向「敢做」 | [链接](https://simonwillison.net/2023/Mar/27/ai-enhanced-development/) `[一手]` |
| **2023-04-12** | 首次接触 coding agent 模式（ChatGPT Code Interpreter，Kubernetes 沙箱里跑 Python） | 他在 2025-12-31 回顾中自述 |
| **2024-05/06** | 参与推广 **slop** 一词，被 Guardian、NYT 引用 | [2025-12-31](https://simonwillison.net/2025/Dec/31/the-year-in-llms/) `[一手]` |
| **2025-01-24** | [A selfish personal argument for releasing code as Open Source](https://simonwillison.net/2025/Jan/24/selfish-open-source/) | 其「开源流程」系列 |
| **2025-02-03** | 转载 IBM 1979「计算机无法被问责」 | [链接](https://simonwillison.net/2025/Feb/3/a-computer-can-never-be-held-accountable/) `[一手]` |
| **2025-02-06** | 收录 Karpathy 的 vibe coding 定义贴（他站内第一次出现该词） | [链接](https://simonwillison.net/2025/Feb/6/andrej-karpathy/) `[一手]` |
| **2025-03-02** | **「代码幻觉是最无害的幻觉」**——本聚焦点的奠基文 | [链接](https://simonwillison.net/2025/Mar/2/hallucinations-in-code/) `[一手]` |
| **2025-03-11** | **「You have to test what it writes!」**；同时给出「用能在安全沙箱里跑代码的工具」的选型标准 | [链接](https://simonwillison.net/2025/Mar/11/using-llms-for-code/) `[一手]` |
| **2025-03-19** | **vibe coding ≠ AI 辅助编程**；给出 4 条何时可 vibe code 的边界（低风险 / 安全意识 / 网络好公民 / 钱的问题） | [链接](https://simonwillison.net/2025/Mar/19/vibe-coding/) `[一手]` |
| **2025-03-23** | 引入 semantic diffusion 概念 | [链接](https://simonwillison.net/2025/Mar/23/semantic-diffusion/) `[一手]` |
| **2025-04-09** | [Model Context Protocol has prompt injection security problems](https://simonwillison.net/2025/Apr/9/mcp-prompt-injection/)——他最早警告 MCP 的组合风险 | 由 2025-05-26 文章回引 `[一手]` |
| **2025-04-11** | 评 Google DeepMind 的 **CaMeL** 论文（隔离式方案） | [链接](https://simonwillison.net/2025/Apr/11/camel/) `[一手]` |
| **2025-05-01** | 「Two publishers and three authors fail to understand what vibe coding means」——自称「愿为之战死的山丘」 | [链接](https://simonwillison.net/2025/May/1/not-vibe-coding/) `[一手]` |
| **2025-05-26** | GitHub 官方 MCP 被证明**一个 MCP 就凑齐三脚**（私有数据 + 不可信内容 + 外发） | [链接](https://simonwillison.net/2025/May/26/github-mcp-exploited/) `[一手]` |
| **2025-06-13** | 评 [Design Patterns for Securing LLM Agents against Prompt Injections](https://simonwillison.net/2025/Jun/13/prompt-injection-design-patterns/)；引用其中最精炼的一句：「**once an LLM agent has ingested untrusted input, it must be constrained so that it is impossible for that input to trigger any consequential actions.**」 | `[一手]`（论文观点 `[二手]`） |
| **2025-06-16** | **造词 lethal trifecta** | [链接](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) `[一手]` |
| **2025-08-09** | lethal trifecta 专题演讲（Bay Area AI Security Meetup） | [链接](https://simonwillison.net/2025/Aug/9/bay-area-ai/) `[一手]` |
| **2025-08-11** | 引入 Chromium 安全团队的 **Rule of 2**：不可信输入 + 不安全语言 + 高权限，三者不得同时成立 | [链接](https://simonwillison.net/2025/Aug/11/the-rule-of-2/) `[一手]` |
| **2025-09-04** | Addy Osmani 的书改名为 *Beyond Vibe Coding*，他称之为「so much better」 | [链接](https://simonwillison.net/2025/Sep/4/beyond-vibe-coding/) `[一手]` |
| **2025-10-07** | 造词 **vibe engineering**；给出「LLM 奖励的 12 项既有工程实践」清单 | [链接](https://simonwillison.net/2025/Oct/7/vibe-engineering/) `[一手]` |
| **2025-10-22** | **YOLO 模式双面论证**（见下节 4.2） | [链接](https://simonwillison.net/2025/Oct/22/living-dangerously-with-claude/) `[一手]` |
| **2025-11-02** | 评 Agents Rule of Two 与 The Attacker Moves Second 两篇论文 | [链接](https://simonwillison.net/2025/Nov/2/new-prompt-injection-papers/) `[一手]` |
| **2025-11-25** | 评 Google Antigravity 数据外泄；给出**凭据爆炸半径**建议 | [链接](https://simonwillison.net/2025/Nov/25/google-antigravity-exfiltrates-data/) `[一手]` |
| **2025-12-18** | **「你的工作是交付你已证明能工作的代码」** | [链接](https://simonwillison.net/2025/Dec/18/code-proven-to-work/) `[一手]` |
| **2025-12-31** | 年度综述：把 2025 定义为 **"The year of YOLO and the Normalization of Deviance"**；提出 **conformance suites** | [链接](https://simonwillison.net/2025/Dec/31/the-year-in-llms/) `[一手]` |
| **2026-01-08** | 预测：① LLM 写好代码将不可否认 ② 终于要解决沙箱 ③ **coding agent 安全会出一次「挑战者号事故」** | [链接](https://simonwillison.net/2026/Jan/8/llm-predictions-for-2026/) `[一手]` |
| **2026-02-03** | 赞赏 Deno Sandbox 的**密钥占位符**机制（密钥不进沙箱，由代理替换） | [链接](https://simonwillison.net/2026/Feb/3/introducing-deno-sandbox/) `[一手]` |
| **2026-02-23** | 启动 **Agentic Engineering Patterns** 指南（自称 not-quite-a-book） | [链接](https://simonwillison.net/2026/Feb/23/agentic-engineering-patterns/) `[一手]` |
| **2026-03-18** | 评 Snowflake Cortex 逃逸：明确拒绝「命令白名单」式防护 | [链接](https://simonwillison.net/2026/Mar/18/snowflake-cortex-ai/) `[一手]` |
| **2026-05-06** | [Vibe coding and agentic engineering are getting closer than I'd like](https://simonwillison.net/2026/May/6/vibe-coding-and-agentic-engineering/)——**态度演变的关键节点**：他承认在自己的工作里两者正在融合，并称这是「disturbing realization」 | `[一手]` |
| **2026-05-30** | 称赞 Anthropic 的 [How we contain Claude](https://www.anthropic.com/engineering/how-we-contain-claude) 文档，回引「if credentials never enter the sandbox, they can't be exfiltrated」 | [他的评注](https://simonwillison.net/2026/May/30/how-we-contain-claude/) `[一手]` |
| **2026-06-06** | 发布 `micropython-wasm` 沙箱；**主动挑战模型来打破它**：「I've also locked GPT-5.5 xhigh in that Datasette Agent plugin and challenged it to break out of the sandbox and so far it has not managed to.」 | [链接](https://simonwillison.net/2026/Jun/6/micropython-in-a-sandbox/) `[一手]` |
| **2026-08-08** | 评 Anthropic auto mode 默认化：认可「确认疲劳」是真问题，但拒绝「已经解决了 lethal trifecta」的说法；重申「double down on figuring out a productive way to run agents such that they don't have access to data or tools that can cause harm」 | [链接](https://simonwillison.net/2026/Aug/8/auto-mode/) `[一手]` |

### 4.2 关于 YOLO 模式 / 无沙箱执行（本聚焦点的高价值段落）

来源：[Living dangerously with Claude](https://simonwillison.net/2025/Oct/22/living-dangerously-with-claude/)（2025-10-22，Claude Code Anonymous 演讲全文注解）`[一手]`

**他的立场是刻意的两面并存，不是骑墙：**

1. **第一张幻灯片**：「Why you should _always_ use `--dangerously-skip-permissions`」→「This got a cheer from the room full of Claude Code enthusiasts.」
2. **第二张**：「Why you should _never_ use `--dangerously-skip-permissions`」→「This did not get a cheer.」
3. **价值论证**：「Claude Code running in this mode genuinely feels like a **completely different product** from regular, default Claude Code.」+「I have a suspicion that many people who don't appreciate the value of coding agents have never experienced YOLO mode in all of its glory.」
4. **风险论证**：引用 Johann Rehberger 在 OpenHands 上发现的注入样本——一个 `env.html` 文件诱导 agent `env | grep hp_ | base64` 然后发到 `https://wuzzi.net/h.png?var=ENV`。`[一手]`（攻击样本作者为 Johann Rehberger `[二手]`）
5. **根本法则**：「**Anyone who gets text into your LLM has full control over what tools it runs next.**」
6. **唯一解**：「**The only solution that's credible is to run coding agents in a sandbox.**」并进一步：「**The best sandboxes are the ones that run on someone else's computer!**」
7. **网络才是难的那一半**：「Filesystem (easy) / Network access (really hard)」；「Controlling network access cuts off the data exfiltration leg of the lethal trifecta.」
8. **收尾**：「Go forth and live dangerously! (But do it in a sandbox.)」

**一年后他自己加注（2025-12-31）** `[一手]`：
> 「I run in YOLO mode all the time, despite being _deeply_ aware of the risks involved. **It hasn't burned me yet... and that's the problem.**」
> 并引用 Johann Rehberger 的 Normalization of Deviance：反复冒险而未受罚 → 组织把风险当常态 → 直至挑战者号。

**2026 年他仍在追加警告**（[2026-08-27 评 Rehberger 攻破 auto mode](https://simonwillison.net/2026/Aug/27/breaking-claude-code-opus-5-auto-mode/)）`[一手]`：更危险的一点是——**安全机制本身成了故障的一部分**：「The classifier allowed the creation of the malware process, but then it blocked the command intended to stop it!」他的结论与 Rehberger 一致：容器 / VM / OS 沙箱 + 限制出网 + 不给凭据。

### 4.3 关于「把 agent 的输出当不可信输入」

他有两个明确落地的实践方向，都不是口号：

1. **确定性沙箱 > 模型判断**（贯穿 2025–2026）
   - 「I'd rather treat agent commands as if they could do anything that process itself is allowed to do, hence my interest in **deterministic sandboxes that operate outside of the layer of the agent itself.**」— 2026-03-18 `[一手]`
   - 他自己的落地物：`micropython-wasm` + `datasette-agent-micropython`（2026-06-02/06-06），对 agent 生成的 Python 代码做 WASM 隔离，有内存 / CPU（wasmtime fuel）/ 文件 / 网络四重限制 `[一手]`
   - 他要的沙箱六条硬指标（2026-06-06）：可从 PyPI 干净安装 / 内存与 CPU 限制 / 文件访问严格控制 / 网络受控 / 支持受控的 host function / 成熟且有文档 `[一手]`

2. **诚实地标注自己作品的可信度**（这是罕见的自我怀疑）
   - 「Having complained about immature, loosely-maintained sandboxing libraries, **it's deeply ironic that I've now built my own!** I deliberately slapped an alpha release version on it, and I'm not ready to recommend it to anyone who isn't willing to take a significant risk.」— 2026-06-06 `[一手]`
   - `[推断]`：这条值得单独记——他在自己身上适用了同一套标准（没有第三方验证就不推荐给别人），这是他可信度高的结构性原因。

3. **关于「跑 LLM 生成的 SQL 怎么防」**——**部分未核实**。
   - 已核实：他的 Datasette / LLM / sqlite-utils 全系列都是插件架构，而他明确在做「插件代码以全权限运行」的沙箱化（2026-06-06 文中自述：「my plugin systems all use Python and Pluggy, and **plugin code executes with full privileges** within my applications」）`[一手]`
   - 已核实：他亲自踩过 Supabase MCP 的 SQL 注入式外泄案例，并引用 Supabase 的缓解措施——**默认只读、项目范围模式**「If you configure their MCP as read-only you remove one leg of the trifecta... in this case through database writes」`[一手]`
   - **未核实**：他是否写过一篇专门讲「LLM 生成 SQL 的执行隔离」的独立长文（我按 URL 探查未命中）。**不要替他编造这条专门论述**，只能引用上面的通用原则 + Supabase 案例。

---

## 5. 关于验证与测试的具体主张（可直接当操作规程用）

### 5.1 他给出的两条「证明」流程（2025-12-18，[原文](https://simonwillison.net/2025/Dec/18/code-proven-to-work/)）`[一手]`

> 「There are two steps to proving a piece of code works. **Neither is optional.**」

1. **手动测试（manual testing）**
   - 「If you haven't seen the code do the right thing yourself, that code doesn't work. If it does turn out to work, that's honestly just pure chance.」
   - 他偏好的形式：**「reduce these steps to a sequence of terminal commands which I can paste, along with their output, into a comment in the code review」**（并给了一个真实 PR 评论链接作范例）
   - 难以演示的改动：「Record a screen capture video and add that to the PR.」
   - 「Don't be tempted to skip the manual test because you think the automated test has you covered already! Almost every time I've done this myself I've quickly regretted it.」
2. **自动化测试（automated testing）**
   - 「Your contribution should bundle the change with an automated test that proves the change works. **That test should fail if you revert the implementation.**」（这是对测试有效性的自检标准）

### 5.2 给 agent 的四字咒语 / 短提示词（他反复推销，属"可复制工具"）

| 咒语 | 用途 | 出处 |
|---|---|---|
| **`First run the tests`** | 开始新会话的第一句；同时告诉 agent 有测试套件、逼它学会怎么跑、把它带进测试心态 | [First run the tests](https://simonwillison.net/guides/agentic-engineering-patterns/first-run-the-tests/) `[一手]` |
| **`Run "uv run pytest"`** | 他的 Python 项目版本（靠 PEP 735 dependency group 实现） | 同上 + [TIL](https://til.simonwillison.net/uv/dependency-groups) `[一手]` |
| **`Use red/green TDD`** | 「a pleasingly succinct way to get better results out of a coding agent」；关键是**确认测试先失败**，否则可能写了个本来就能过的测试 | [Red/green TDD](https://simonwillison.net/guides/agentic-engineering-patterns/red-green-tdd/) `[一手]` |
| **`Try that new function on some edge cases using \`python -c\``** | agent 手动测试 | [Agentic manual testing](https://simonwillison.net/guides/agentic-engineering-patterns/agentic-manual-testing/) `[一手]` |
| **`Run a dev server and explore that new JSON API using \`curl\``** | 同上 | 同上 `[一手]` |
| **`test that with Playwright`** / `uvx rodney --help` | 浏览器 UI 手动测试（Rodney 是他自己的 CDP 工具） | 同上 `[一手]` |
| **`uvx showboat --help` → 建 notes/*.md 文档记录测试** | **留痕**：Showboat 的 `exec` 会**先记录命令、再运行、并记录真实输出** | 同上 `[一手]` |

> **Showboat 的设计意图直接对应本聚焦点**（他原话）：
> 「The `exec` command is the most important of these, because it captures a command along with the resulting output. This shows you what the agent did and what the result was, and **is designed to discourage the agent from cheating and writing what it _hoped_ had happened into the document.**」`[一手]`
> → 这是「防 agent 自证清白」的机制设计。`[推断]`

### 5.3 「agent 也算机器人，所以自动化测试与手动测试对它是一回事」

- 「Since they're robots, **automated tests and manual tests are effectively the same thing.** They do feel a little different though.」— 2025-12-18 `[一手]`
- 「The good news about automated tests is that **coding agents need very little encouragement to write them.** If your project has tests already most agents will extend that test suite without you even telling them to do so.」同篇 `[一手]`

---

## 6. 关于凭据与数据纪律的主张

### 6.1 核心原则（可能他最重要的一句操作建议）

- **凭据不进沙箱**。他 2026-05-30 引述并认可 Anthropic 的表述：「The goal is to set a hard boundary on what an agent can reach. **For example, if credentials never enter the sandbox, they can't be exfiltrated**, regardless of whether the cause is a user, a model finding a "creative" path, or an attacker.」`[一手]`（引文作者为 Anthropic `[二手]`）
- **限制爆炸半径**。2025-11-25 评 Antigravity 泄漏 AWS key 后给他的建议：「The best approach I know of for reducing the risk here is to make sure that any credentials that are visible to coding agents—like AWS keys—**are tied to non-production accounts with strict spending limits.** That way if the credentials are stolen the blast radius is limited.」`[一手]`
- **密钥占位符模式**。2026-02-03 他点名喜欢 Deno Sandbox 的做法：沙箱内 `$OPENAI_API_KEY` 实际是 `DENO_SECRET_PLACEHOLDER_...`，出站请求经代理时才替换为真值——「**In this way the secret itself is not available to code within the sandbox**, which limits the ability for malicious code (e.g. from a prompt injection) to exfiltrate those secrets.」他还补记了 Fly 的同款项目 `tokenizer`。`[一手]`

### 6.2 他反复点名的凭据泄漏路径（都是真实案例，非理论）

| 时间 | 路径 | 出处 |
|---|---|---|
| 2025-06-19 | Atlassian MCP：恶意支持工单 → agent 以内部权限执行 → 数据外泄到攻击者可见的工单回复 | [链接](https://simonwillison.net/2025/Jun/19/atlassian-prompt-injection-mcp/) `[一手]` |
| 2025-07-06 | **Supabase MCP 可泄漏整库**：单个 MCP 凑齐三脚；缓解手段 = 配置成 read-only（砍掉"写入"这条外泄腿） | [链接](https://simonwillison.net/2025/Jul/6/supabase-mcp-lethal-trifecta/) `[一手]` |
| 2025-08-09 | Cursor + Jira/Zendesk MCP：支持工单里塞 base64 payload，用「rotten apple」（`eyJ` 开头的 JWT）绕过模型的直觉拒绝 | [链接](https://simonwillison.net/2025/Aug/9/when-a-jira-ticket-can-steal-your-secrets/) `[一手]` |
| 2025-11-25 | Google Antigravity：1px 字体藏注入 → agent 绕 `.gitignore` 限制（`run_command` + `cat .env`）→ 经白名单域 `webhook.site` 外泄 AWS 凭据 | [链接](https://simonwillison.net/2025/Nov/25/google-antigravity-exfiltrates-data/) `[一手]` |
| 2026-01-14 | Claude Cowork：出站白名单里有 `api.anthropic.com`，攻击者自带 key，让 agent 把文件上传到 `/v1/files` 端点 | [链接](https://simonwillison.net/2026/Jan/14/claude-cowork-exfiltrates-files/) `[一手]` |
| 2026-05-26 | Microsoft Copilot Cowork：agent 发到用户自己收件箱的邮件渲染外部图片 → 出网外泄 | [链接](https://simonwillison.net/2026/May/26/copilot-cowork-exfiltrates-files/) `[一手]` |
| 2026-07-15 | Claude `web_fetch` 的「只允许用户给的 URL」设计被绕过（蜜罐站 + 字母序嵌套链接） | [链接](https://simonwillison.net/2026/Jul/15/claude-web-fetch-exfiltration/) `[一手]` |

### 6.3 他对「数据纪律」的一句结构性判断

- 「Almost all of these were promptly fixed by the vendors, usually by locking down the exfiltration vector... **The bad news is that once you start mixing and matching tools yourself there's nothing those vendors can do to protect you!**」— 2025-06-16 `[一手]`
- 「**The LLM vendors are not going to save us!** We need to avoid the lethal trifecta combination of tools ourselves to stay safe.」同篇 `[一手]`

---

## 7. 智识谱系与推荐读物

> 说明：他**没有**一份公开的「推荐书单」页面。以下是从他实际反复引用、称赞、采纳的人与文本中提炼的谱系。全部标了出处。

### 7.1 直接影响他的技术人

| 人物 | 关系 | 证据 |
|---|---|---|
| **Johann Rehberger**（wunderwuzzi） | **最重要的安全影响源**。他称其为「one of the most credible prompt injection researchers active today」，并在 2025 年度文里把 Rehberger 的 *The Normalization of Deviance in AI* 列为「one of my favourite pieces on LLM security this year」 | [2025-12-31](https://simonwillison.net/2025/Dec/31/the-year-in-llms/)、2026-08-27 `[一手]` |
| **Andrej Karpathy** | vibe coding 定义来源；RLVR/推理的解释来源；agentic engineering 词源之一 | [2025-02-06](https://simonwillison.net/2025/Feb/6/andrej-karpathy/)、2025-12-31、2026-02-11 `[一手]` |
| **Diane Vaughan** | 「Normalization of Deviance」理论源头（1986 挑战者号） | 2025-12-31 `[一手]` |
| **Riley Goodside** | prompt injection 的**实证发现者**（2022-09-11 的演示），Willison 是**命名者**与理论化者 | [2022-09-12](https://simonwillison.net/2022/Sep/12/prompt-injection/) `[一手]`（Goodside 的推文 `[二手]`） |
| **Dan McKinley** | **boring technology** 原则；他明确说「I genuinely find myself picking libraries that have been around for a while partly because that way it's much more likely that LLMs will be able to use them」 | [2025-03-02](https://simonwillison.net/2025/Mar/2/hallucinations-in-code/)、2025-03-11 `[一手]` |
| **Kellan Elliott-McCrea** | 「deeply inhuman」类 LLM 错误 | 2025-03-11 引用 |
| **Nicholas Carlini** | 2025-11-02 新论文评述中列为作者 |
| **Thomas Ptacek** | 沙箱 / 安全判断的常用引用源（Fly Sprites、sandbox escape） | 2026-01-15、2026-07-22 |
| **Maggie Appleton / Nadia Eghbal / Matt Webb / Craig Mod / Paul Ford** | 概念与文化批评来源（extractive contributions、vibing、Software Bonkers） | 2025-10-02、2026-03-28、2026-03-13、2026-02-23 |
| **Margaret-Anne Storey** | **cognitive debt** 概念来源；他明确说「I've experienced this myself」「I no longer have a firm mental model of what they can do」 | [2026-02-15](https://simonwillison.net/2026/Feb/15/cognitive-debt/) `[一手]` |

### 7.2 他反复引用并推荐的文本 / 论文

- **Andrej Karpathy 的 vibe coding 推文**（2025-02）——他称之为「I _love_ this definition」`[一手]`
- **《Design Patterns for Securing LLM Agents against Prompt Injections》**（2025-06）——他推荐的核心论文；金句：一旦 agent 摄入不可信输入，就必须让它**不可能触发任何有后果的动作** `[一手]`
- **Google DeepMind 的 CaMeL 论文**（2025-04）——「a promising new direction」`[一手]`
- **Chromium 安全团队的 Rule of 2**（2025-08-11 引入）——从浏览器安全搬到 agent 安全 `[一手]`
- **OpenAI/Anthropic 的 Agents Rule of Two**（2025-11-02 评述）`[一手]`
- **Johann Rehberger 的 *The Normalization of Deviance in AI***（2025）——他最推崇的年度安全文 `[一手]`
- **METR 的 long-task 时间跨度图**（2025-03-19）——他引用但**保留怀疑**：「I'm not convinced that pattern will continue to hold」`[一手]`
- **IBM 1979 内部培训页**（"A computer can never be held accountable"）——他 2025-02-03 专门转载 `[一手]`

### 7.3 他的思想一致性（萧潇的判断）

`[推断]` 他的谱系有一个清晰的历史连续性：**先把 Web 安全思维（SQL injection / XSS / CSP / Rule of 2 / 沙箱 / 最小权限）搬到 LLM 上，再把软件工程思维（TDD / 版本控制 / CI / code review / 无聊技术）搬到 agent 上。** 他几乎不发明新理论，而是**做安全与工程两套老学科的"移植工程师"**——这正是他判断力稳定的原因，也解释了他为什么反复反对"用 AI 解决 AI 安全问题"（他认为那是拒绝移植既有方案的偷懒）。

---

## 8. 矛盾与未核实项（不调和，如实记录）

### 8.1 已确认的内部矛盾

| # | 矛盾内容 | 两条证据 | 处理 |
|---|---|---|---|
| 1 | **vibe coding 的发明日期，他自己的表述就不一致** | ① [2025-03-19](https://simonwillison.net/2025/Mar/19/vibe-coding/) 写「coined by Andrej Karpathy just a few weeks ago (**on February 6th**)」；② [2025-12-31](https://simonwillison.net/2025/Dec/31/the-year-in-llms/) 写「In **a tweet in February**」 | **不调和**。任务书给的「2025-02-02」是 Karpathy 推文的实际发布日（广泛报道，`[二手]`，本次未取到推文原文）；他文中的 2 月 6 日实为他**自己博客收录该引文**的日期。建议产出中写「Karpathy 于 2025 年 2 月 2 日提出；Willison 于 2025-02-06 在其博客收录并随后成为该词最坚定的定义保卫者」 |
| 2 | **「参数化 prompt」的自我推翻** | ① 2022-09-12 提出希望 GPT-3 API 支持「instruction + named data blocks」两参数；② 2023-04-13 在该文加 Update：「extremely difficult, if not impossible to implement on the current architecture」 | **不调和**，但**必须保留时间戳**——这是"他的观点会过期"最干净的例证 |
| 3 | **YOLO 模式的公开立场两面并存** | 同一篇演讲里「why you should _always_」和「why you should _never_」，本人也在 2025-12-31 承认「I run in YOLO mode all the time... and that's the problem」 | **不调和**。这是刻意设计的两面论证，不是骑墙；产出中应完整保留两面，不要只取警示的一半 |

### 8.2 态度演变（不是矛盾，但必须按时间读）

| 阶段 | 时间 | 态度 |
|---|---|---|
| 划线期 | 2025-03-19 → 2025-10-07 | 严格区分 vibe coding（不读代码）与 AI 辅助编程 / vibe engineering（读代码、负责任）。为此打了半年的语义保卫战 |
| 承认融合 | **2026-05-06** | [Vibe coding and agentic engineering are getting closer than I'd like](https://simonwillison.net/2026/May/6/vibe-coding-and-agentic-engineering/)——他公开承认两者在自己工作中正在收敛，称之为「disturbing realization」 |
| 后退 | 2026-02-23 | vibe engineering 让位给 agentic engineering：「It looks like the term "Agentic Engineering" is coming out on top for this now.」 |

`[推断]` 这条演变线很重要：**他不是"vibe coding 支持者"，而是"vibe coding 的定义管理员 + 边界守卫"。当边界在自己身上开始模糊时，他选择公开承认，而不是修改定义。** 这是他长期可信度的关键。

### 8.3 未核实项（明确标注，禁止编造）

1. **他没有任何自出版的 LLM 书籍。** 任务书中提到的「*Building Generative AI for Developers* 之类的实际书名」——其站点 `books` 标签页、about 页、搜索均无痕迹。**判定：疑似不存在，不要写入。**
2. **《The Definitive Guide to Django》他是章节贡献者，不是合著者。** 任务书「与 Jacob Kaplan-Moss 合著」不准确。`[一手]` 他本人写「I contributed the newforms chapter」。
3. **未找到他专门论述「LLM 生成 SQL 的执行隔离」的独立长文。** 相关证据只有：插件全权限问题（2026-06-06）、Supabase MCP 只读缓解（2025-07-06）、确定性沙箱优先（2026-03-18）。**不要替他把这些拼成一篇"他说过"的专文。**
4. **未核实他对 API key 存储（如 `llm keys set`）的完整主张**——只确认他本人在文档示例里用 `uvx llm keys set openai`（2026-06-06 文中命令）。是否有一篇专门的"密钥管理纪律"长文：**未核实**。
5. **vibe coding 精确首发日期（2 月 2 日）**：`[二手]`，本次搜索工具被降级（Bing 返回中文无关结果、Exa 429、DDG 超时），**未能取到 Karpathy 推文原文**。建议产出中标注为"广泛报道为 2025-02-02"。
6. **他的 TIL 总数 582 条**为抓取时点快照（2026-09 前后），会持续增长；引用时须带日期。
7. **未核实**：他是否对「agent 自主执行 shell 命令」有一条统一的、可引用的政策表述。目前最接近的是 2026-03-18 的「I'd rather treat agent commands as if they could do anything that process itself is allowed to do」与 2025-10-22 的「anyone who gets text into your LLM has full control over what tools it runs next」。
8. 本次**未逐一通读**他 97 篇 `vibe-coding` 标签文与 160+ 篇 `prompt-injection` 标签文，只覆盖了一手长文 + 标签页摘要。**长尾可能有更强的一手表述。**

---

## 9. 来源清单

### 9.1 一手来源（simonwillison.net / til.simonwillison.net，本次直接抓取正文或标签页）

1. https://simonwillison.net/about/ — 自我简介、现任职务（Datasette 作者、Django 共同创造者、PSF 理事、Prime Radiant 每周一天）、**利益披露**（接受 OpenAI/Anthropic/Google/Mistral 的预览邀请与免费额度；仅一次 OpenAI 付过他的时间费用）
2. https://simonwillison.net/2022/Sep/12/prompt-injection/
3. https://simonwillison.net/2025/Feb/3/a-computer-can-never-be-held-accountable/
4. https://simonwillison.net/2025/Feb/6/andrej-karpathy/
5. https://simonwillison.net/2025/Mar/2/hallucinations-in-code/
6. https://simonwillison.net/2025/Mar/11/using-llms-for-code/
7. https://simonwillison.net/2025/Mar/19/vibe-coding/
8. https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/
9. https://simonwillison.net/2025/Oct/7/vibe-engineering/
10. https://simonwillison.net/2025/Oct/22/living-dangerously-with-claude/
11. https://simonwillison.net/2025/Dec/18/code-proven-to-work/
12. https://simonwillison.net/2025/Dec/31/the-year-in-llms/
13. https://simonwillison.net/2026/Jan/8/llm-predictions-for-2026/
14. https://simonwillison.net/2026/Jun/6/micropython-in-a-sandbox/
15. https://simonwillison.net/guides/agentic-engineering-patterns/
16. https://simonwillison.net/guides/agentic-engineering-patterns/what-is-agentic-engineering/
17. https://simonwillison.net/guides/agentic-engineering-patterns/code-is-cheap/
18. https://simonwillison.net/guides/agentic-engineering-patterns/red-green-tdd/
19. https://simonwillison.net/guides/agentic-engineering-patterns/first-run-the-tests/
20. https://simonwillison.net/guides/agentic-engineering-patterns/agentic-manual-testing/
21. https://simonwillison.net/tags/vibe-coding/ （97 篇）
22. https://simonwillison.net/tags/lethal-trifecta/ （30 篇）
23. https://simonwillison.net/tags/sandboxing/ （55 篇）
24. https://simonwillison.net/tags/books/
25. https://til.simonwillison.net/ （582 条 TIL 索引）

### 9.2 一手来源（通过上述页面正文引用/摘要获得，未单独抓全文）

26. https://simonwillison.net/2025/Mar/23/semantic-diffusion/
27. https://simonwillison.net/2025/May/1/not-vibe-coding/
28. https://simonwillison.net/2025/Apr/9/mcp-prompt-injection/
29. https://simonwillison.net/2025/Apr/11/camel/
30. https://simonwillison.net/2025/May/26/github-mcp-exploited/
31. https://simonwillison.net/2025/Jun/11/echoleak/
32. https://simonwillison.net/2025/Jun/13/prompt-injection-design-patterns/
33. https://simonwillison.net/2025/Jun/19/atlassian-prompt-injection-mcp/
34. https://simonwillison.net/2025/Jul/6/supabase-mcp-lethal-trifecta/
35. https://simonwillison.net/2025/Aug/9/bay-area-ai/
36. https://simonwillison.net/2025/Aug/9/when-a-jira-ticket-can-steal-your-secrets/
37. https://simonwillison.net/2025/Aug/11/the-rule-of-2/
38. https://simonwillison.net/2025/Sep/4/beyond-vibe-coding/
39. https://simonwillison.net/2025/Nov/2/new-prompt-injection-papers/
40. https://simonwillison.net/2025/Nov/25/google-antigravity-exfiltrates-data/
41. https://simonwillison.net/2026/Jan/14/claude-cowork-exfiltrates-files/
42. https://simonwillison.net/2026/Feb/3/introducing-deno-sandbox/
43. https://simonwillison.net/2026/Feb/15/cognitive-debt/
44. https://simonwillison.net/2026/Feb/23/agentic-engineering-patterns/
45. https://simonwillison.net/2026/Mar/18/snowflake-cortex-ai/
46. https://simonwillison.net/2026/May/6/vibe-coding-and-agentic-engineering/
47. https://simonwillison.net/2026/May/26/copilot-cowork-exfiltrates-files/
48. https://simonwillison.net/2026/May/30/how-we-contain-claude/
49. https://simonwillison.net/2026/Jul/15/claude-web-fetch-exfiltration/
50. https://simonwillison.net/2026/Aug/8/auto-mode/
51. https://simonwillison.net/2026/Aug/27/breaking-claude-code-opus-5-auto-mode/
52. https://simonwillison.net/2024/Dec/31/llms-in-2024/
53. https://simonwillison.net/2025/Jun/6/six-months-in-llms/
54. https://simonwillison.net/2023/Mar/27/ai-enhanced-development/
55. https://til.simonwillison.net/uv/dependency-groups
56. https://til.simonwillison.net/claude-code/playwright-mcp-claude-code
57. https://til.simonwillison.net/claude-code/preview-github-pages
58. https://til.simonwillison.net/pytest/subtests
59. https://til.simonwillison.net/llms/gpt-oss-evals

### 9.3 二手来源（外部）

60. https://twitter.com/karpathy/status/1886192184808149383 — Karpathy 的 vibe coding 原推（**未直接取到原文**，仅在 Willison 站内被全文引用两次）`[二手]`
61. https://embracethered.com/blog/posts/2025/the-normalization-of-deviance-in-ai/ — Johann Rehberger，Normalization of Deviance in AI `[二手]`
62. https://link.springer.com/book/10.1007/978-1-4302-0331-5 — *The Definitive Guide to Django* 作者归属 `[二手]`
63. https://www.anthropic.com/engineering/how-we-contain-claude — Anthropic 沙箱文档（Willison 引述）`[二手]`
64. https://www.generalanalysis.com/blog/supabase-mcp-blog、https://www.promptarmor.com/... 、https://www.zenity.io/... — 安全研究报告（均由 Willison 摘要转述）`[二手]`

### 9.4 检索工具状态说明（供复核者判断取证强度）

本次 `web_search` 默认引擎（bing, zh-CN market）对英文人名查询返回**完全无关的中文结果**；Exa 返回 HTTP 429；DuckDuckGo 与 SearXNG 超时。因此**绝大部分取证改为直接 `web_fetch` simonwillison.net 的 URL 与标签页**，这也是本文件一手占比高的原因，而非搜索广度好。**长尾覆盖不足是本次调研的主要局限。**

---

## 10. 给下游使用者的三条使用须知

1. **他的观点有保质期。** 引用任何主张必须带年月；`[模型世代]` 变量会改变结论（例：他 2024 年底还在说 agent「不会发生」，2025 年底已改口）。本文件的「4.1 时间线」就是为这个目的排的。
2. **不要把「vibe coding」写成他造的。** 也不要把「YOLO mode」写成他造的。他造的、且确认有效的是 **prompt injection / lethal trifecta / vibe engineering（已让位）**。
3. **他的警示与他的实践是同一套，不是两套。** 他一边说「我天天跑 YOLO 模式」，一边说「这很危险，必须沙箱」——这是**刻意的双面论证**，用于说明"价值与风险同时为真"。摘取时只取一面，会得到与本人相反的结论。
