# Simon Willison 时间线调研

> 调研目的：为「把 LLM 当成极快但会自信说错的协作者 + 可运行验证兜底」这一蒸馏方向提供事实底座。
> 调研时间：2026-09-17（本地时间）
> 信源原则：优先他本人的博客（simonwillison.net）、项目文档与 release notes、PyPI/Django 官方记录；Wikipedia 英文本条本可用于背景，但本次抓取时 `en.wikipedia.org` 在本环境被解析到非公网 IP 而**无法访问**，故所有条目尽量改用一手来源。
> 黑名单遵守：未使用知乎、微信公众号、百度百科/百度知道。**未使用中文搜索摘要**——本次 web_search 后端对含 "Simon Willison" 的查询大量返回无关中文结果（百度百科/VPN 广告），已全部弃用，改为一手抓取。
> 可信度标记：`[一手]` = 他本人原文 / 官方 release notes；`[二手]` = 第三方报道或转述；`[推断]` = 由其他条目反推，未经直接证实。

---

## 关键前置更正（必须先说）

### ⚠️ 「2025-02-02 他提出 vibe coding」这一说法与一手证据不符

任务书中写：「**2025-02-02 他提出 vibe coding** —— 请核实确切日期与原始出处」。

核实结果：

| 主张 | 核实结论 |
|---|---|
| 日期 2025-02-02 | **不成立**。`https://simonwillison.net/2025/Feb/2/vibe-coding/` 返回 **404**（一手验证）。 |
| 「他提出」 | **不成立**。vibe coding 这个词是 **Andrej Karpathy** 提出的，不是 Simon Willison 提出的。Simon 是**引用者、定义澄清者**和该术语最重要的传播/纠偏者。 |
| 真实日期 | Karpathy 的原始推文发布于 **2025 年 2 月 6 日**；Simon 于同日 **2025-02-06 13:38** 在自己的博客以 quotation 形式收录并加标签。`[一手]` |
| 出处 | 原推文 <https://twitter.com/karpathy/status/1886192184808149383>；Simon 的收录页 <https://simonwillison.net/2025/Feb/6/andrej-karpathy/> |
| Simon 本人的确认 | 2025-03-19 他写道：「**Vibe coding** is having a moment. The term was coined by Andrej Karpathy just a few weeks ago (**on February 6th**)」。`[一手]` <https://simonwillison.net/2025/Mar/19/vibe-coding/> |

**推断 2 月 2 日的可能来源**：`[推断]` 该日期疑似与其他 2 月初事件混淆（例如他 2025-02-03 收录的 IBM 1979 年培训幻灯片「A computer can never be held accountable」，<https://simonwillison.net/2025/Feb/3/a-computer-never-be-held-accountable/>），或与 Karpathy 推文的其他时区/截图标注混淆。**本次调研未找到任何 2025-02-02 的相关事件作为支撑。**

**蒸馏含义**：如果后续专家人物的 prompt 里写着「2025-02-02 Simon 提出 vibe coding」，那是一条**需要修正的事实错误**，应改为「2025-02-06 Karpathy 提出，Simon 同日收录并在此后一年多持续澄清其边界」。

---

## A. 生平与项目里程碑

| 年月 | 事件 | 来源 URL | 可信度 |
|---|---|---|---|
| 2002-06 | 开始写博客 simonwillison.net；2022-06-12 他发《Twenty years of my blog》纪念 20 周年 | <https://simonwillison.net/2022/Jun/12/twenty-years/>（索引见 <https://simonwillison.net/2022/>） | `[一手]` |
| 2003-05-31 | Adrian Holovaty 在博客发招聘帖「Job opportunity: Web programmer/developer」，招 Lawrence Journal-World（World Online）的 Web 程序员 | 原帖 <https://www.holovaty.com/writing/211/>；Simon 2025 年回述 <https://simonwillison.net/2025/Jul/13/django-birthday/> | `[一手]` |
| 2003（约） | Simon 在英国读大学，读到该帖，联系 Adrian 把岗位谈成「一年 industry 实习年」，赴美国堪萨斯州 Lawrence 工作 | <https://simonwillison.net/2025/Jul/13/django-birthday/> | `[一手]` |
| 2003（约） | 两人当时都在写 PHP/MySQL，都觉得撞到了 PHP 4 的天花板；受 Mark Pilgrim《Dive into Python》影响转向 Python；因不满当时所有 Python web 框架而自建，内部代号 **the CMS** | <https://simonwillison.net/2025/Jul/13/django-birthday/> | `[一手]` |
| 约 2003–2004 | **Django 写出的第一个网站上线**：6 News Lawrence 的天气页（设计由 Dan Cox 绘制 Lawrence 天际线）；随后做完整个 6 News Lawrence 站点。上线曾因主播要求重拍定妆照推迟一周 | <https://simonwillison.net/2025/Jul/13/django-birthday/> | `[一手]`（年份为约） |
| 约 2004 | Adrian 用 the CMS 重写 Lawrence.com（该站原本是 Adrian 用 PHP 写的） | <https://simonwillison.net/2025/Jul/13/django-birthday/> | `[一手]` |
| 2005-07-13 | **Django 公开仓库第一个 commit**（`d6ded0e91bcdd2a8f7a221f6a5552a33fe545359`）——即 Django 的「生日」。开源命名曾在 wiki 上头脑风暴（Brazos / Webbing / Physique / Anson / The Tornado Publishing System / Private Dancer 等），Simon 自陈他提的是「Tornado Publishing System」（梗来自电影《Office Space》的 TPS 报告），但因堪萨斯州龙卷风不是好兆头而未采用 | commit <https://github.com/django/django/commit/d6ded0e91bcdd2a8f7a221f6a5552a33fe545359>；命名 wiki <https://jacobian.org/2005/sep/9/private_dancer/>；生日公告 <https://www.djangoproject.com/weblog/2025/jul/13/happy-20th-birthday-django/> | `[一手]` |
| 约 2005–2006 | 实习结束、回英国完成学位后加入 **Yahoo**（英国办公室，服务于美国的一个 R&D 团队），待了约一年半；他自评「永远不要加入 R&D 团队，因为你永远发不了东西」。期间与 Tom Coates 在内部 hack day 做出 **Yahoo Astronewsology**（Yahoo 内部第一个 Django 应用） | <https://simonwillison.net/2025/Jul/13/django-birthday/> | `[一手]`（时间约为推断） |
| 约 2007–2010 | 在 **The Guardian** 工作。被 Simon Rogers 的数据工作吸引，与其合作把记者硬盘上的 Excel 数据变成可发布的开放数据；启动 **The Guardian Data Blog**（2009-03 前后以 Google Spreadsheets 发布） | Data Blog 首发 <https://www.theguardian.com/news/datablog/2009/mar/10/blogpost1>；回述 <https://simonwillison.net/2025/Jul/13/django-birthday/> | `[一手]`（入职年份约，未核实） |
| 约 2008 | 与妻子 Natalie Downe 做 **Django People**（社区成员地图）；参与 **/dev/fort**（租 Fort Clonque 城堡集体写代码）并产出 **Wildlife Near You**、**Bugle**（局域网内 Twitter 克隆，含 magic Twitter support：改本地 DNS 把 twitter 指向 Bugle）；后衍生 owlsnearyou.com / owlsnearme.com | <https://simonwillison.net/2025/Jul/13/django-birthday/>；代码 <https://github.com/simonw/bugle_project> | `[一手]`（年份约） |
| 2010 | 结婚；与 Natalie 辞职环球旅行。在摩洛哥/埃及一带因食物中毒被困，两周内做完并上线 **Lanyrd**（用 Twitter 社交图谱推荐会议）。因在 Twitter 上迅速传播而提前结束蜜月 | <https://simonwillison.net/2025/Jul/13/django-birthday/>；Natalie 的复盘 <https://blog.natbat.net/post/61658401806/lanyrd-from-idea-to-exit-the-story-of-our> | `[一手]`（Natalie 文为 `[二手]`） |
| 2010–2011 | 从埃及申请 **Y Combinator**，Lanyrd 入选（YC 为 2010 年批次口径见其本人自述「申请 YC 并在之后三年建初创公司」） | <https://simonwillison.net/2025/Jul/13/django-birthday/> | `[一手]` |
| 约 2013 | **Lanyrd 被 Eventbrite 收购**，Simon 随之搬到旧金山，在 Eventbrite 任工程管理岗（engineering director），偶尔仍写代码；期间内部 hack day 做出 **Tikibar**（可跑在生产环境的 Django Debug Toolbar 类工具，后开源为 eventbrite/tikibar） | 官网页 bio <https://simonwillison.net/about/>；tikibar <https://github.com/eventbrite/tikibar>；回述 <https://simonwillison.net/2025/Jul/13/django-birthday/> | `[一手]`/`[二手]`（2013 这一具体年份未在本次抓到的页面中直接证实，标 `[推断]`） |
| 约 2016–2017 | 离开 Eventbrite，成为**独立开源开发者**，全职做数据新闻方向的工具（Datasette 生态）。官方 bio 口径：「Prior to becoming an independent open source developer, Simon was an engineering director at Eventbrite」 | <https://simonwillison.net/about/> | `[一手]`（离职年份未在抓到的页面中明确，标 `[推断]`） |
| 2017-11 | **Datasette 首次发布**；他 2022-11-13 发《Datasette is 5 today》据此可反推起始时间为 2017-11 | <https://simonwillison.net/2022/Nov/13/datasette-birthday/>；概览页 <https://datasette.io/> | `[一手]`（精确日未核实） |
| 约 2019-09 | 开始写 **weeknotes**（周记）系列 | <https://simonwillison.net/2019/Sep/13/weeknotestwitter-sqlite-datasette-rure/> | `[一手]` |
| 2022-07-30 | 加入 **Python Software Foundation（PSF）董事会** | <https://simonwillison.net/2022/Jul/30/psf-board/>；当前 board 页面 <https://www.python.org/psf/board/> | `[一手]` |
| 2023 | 参加 **GitHub Accelerator** 首批（GitHub 付酬）；同年获 **GitHub Star** 称号（无薪） | <https://simonwillison.net/about/> | `[一手]` |
| 2023-2024 | 获 **Mozilla MIECO** 项目资助 | 存档 <https://web.archive.org/web/20240917063820/https://future.mozilla.org/mieco2023/> | `[一手]` |
| 2023-04-01 | 发布 **llm 0.2**（首个公开版本），4 月 4 日在博客正式介绍 **llm CLI 工具**：命令行跑 prompt，并把 prompt/response 存进 SQLite（`~/.llm/log.db`），可用 Datasette 浏览 | 介绍文 <https://simonwillison.net/2023/Apr/4/llm/>；release <https://github.com/simonw/llm/releases/tag/0.2> | `[一手]` |
| 2023-05-18 | 发文《llm, ttok and strip-tags—CLI tools for working with ChatGPT and other LLMs》，llm 生态成型 | <https://simonwillison.net/2023/May/18/cli-tools-for-llms/> | `[一手]` |
| 2023-06 | Datasette Cloud 相关开发启动（2022-05 已在 Fly Machines 上做原型） | <https://simonwillison.net/2022/May/26/weeknotes-building-datasette-cloud/> | `[一手]` |
| 2025-07-13 | Django 20 周年：他重发了 2015 年 Django 10 周年时的《Django Origins》演讲全文（含幻灯片与逐页注释） | <https://simonwillison.net/2025/Jul/13/django-birthday/> | `[一手]` |
| 2026-02-19 | 宣布开始接受**每周博客横幅赞助 + newsletter 顶部赞助**（此前长期声明不做定向补偿） | <https://simonwillison.net/2026/Feb/19/sponsorship/>（由 about 页引用） | `[一手]` |
| 2026（进行中） | 现况（据其 about 页）：全职做 Datasette 相关开源；**每周为 Prime Radiant**（Jesse Vincent 的应用 AI 研究实验室，superpowers skills 框架的出品方）工作一天；Datasette Cloud 部分工作由 Fly.io 赞助；PSF 董事会成员 | <https://simonwillison.net/about/> | `[一手]` |
| 2026-09-07 | llm 最新版 **0.35** 发布（新增 `gpt-6-astra` 模型）；Datasette 处于 1.0a40 / 0.65.5 阶段 | PyPI <https://pypi.org/project/llm/>；<https://simonwillison.net/2026/Sep/16/datasette/> | `[一手]` |

### A 节未核实项汇总

- **Django Software Foundation 成立年份**：本次未抓到一手页面，未写入表格。`[存疑]` 常见说法为 2008 年，本次调研**未证实**。
- **他离开 Eventbrite 的确切年份**、**入职 Guardian 的确切年份**、**Lanyrd 被收购的确切年份**：仅有 bio 的叙述性表述，无精确日期。
- **奖项/荣誉**：除 GitHub Star、GitHub Accelerator、Mozilla MIECO、PSF 董事外，本次**未找到**其他具名奖项的一手记录。任务书提到「2023 年左右的相关认可，需核实」——本次核实到的最接近项即上述 GitHub Accelerator（2023）与 GitHub Star，其余**未证实**。
- **Datasette 首次发布的确切日期**：仅有「2017-11-13 时满 5 岁」这一反推，精确日未核实。
- **博客首篇博文日期**：现有一手证据只到「2022-06-12 是 20 周年」→ 起点约 2002-06。`[推断]`

---

## B. AI 辅助编码立场演化线（重点：纵轴 = 他对 LLM 写代码的判断如何被模型代际推动修正）

> 每一行的「模型代际」栏指**该判断所对应的模型/工具代际**，不是判断提出时市面上唯一的模型。

### B1. 萌芽期：2020–2022（「它能写代码，但那不是重点」）

| 年月 | 他说了什么 / 做了什么 | 对应模型代际 | 来源 URL | 可信度 |
|---|---|---|---|---|
| 2020-06-12 | 发《Using GitHub Copilot to write a Django app》类实验（同期他大量写 GPT-3 相关文章） | GPT-3 / Codex beta | 见 2022 年目录页 <https://simonwillison.net/2022/> 及其 Copilot tag | `[推断]`（本次未直接抓到该文，日期标 `[存疑]`） |
| 2022-05-31 | 《A Datasette tutorial written by GPT-3》——用 GPT-3 生成教程 | GPT-3（text-davinci） | <https://simonwillison.net/2022/May/31/a-datasette-tutorial-written-by-gpt-3/> | `[一手]` |
| 2022-06-05 | 《How to use the GPT-3 language model》 | GPT-3 | <https://simonwillison.net/2022/Jun/5/play-with-gpt3/> | `[一手]` |
| 2022-07-09 | **《Using GPT-3 to explain how code works》**——他早期最有代表性的立场：LLM 的**第一个高价值编码用途是「解释代码」，不是写代码** | GPT-3 | <https://simonwillison.net/2022/Jul/9/gpt-3-explain-code/> | `[一手]` |
| 2022-09-12 起 | 《Prompt injection attacks against GPT-3》《I don't know how to solve prompt injection》《You can't solve AI security problems with more AI》——**在同代人都在兴奋时，他先把安全反模式钉下来**。这条线贯穿到 2026 年 | GPT-3 → 全代际 | <https://simonwillison.net/2022/Sep/12/prompt-injection/>、<https://simonwillison.net/2022/Sep/16/prompt-injection-solutions/>、<https://simonwillison.net/2022/Sep/17/prompt-injection-more-ai/> | `[一手]` |
| 2022-12-05 | 《AI assisted learning: Learning Rust with ChatGPT, Copilot and Advent of Code》——定位为「学习加速器」 | ChatGPT（GPT-3.5）/ Copilot | <https://simonwillison.net/2022/Dec/5/rust-chatgpt-copilot/> | `[一手]` |

### B2. 转折期：2023（从「解释代码」转向「真的让它写」）

| 年月 | 他说了什么 / 做了什么 | 对应模型代际 | 来源 URL | 可信度 |
|---|---|---|---|---|
| 2023-03-27 | **《AI-enhanced development makes me more ambitious with my projects》**——他的核心论点雏形：LLM 的价值不是「把同一件事做快」，而是**让原本不划算的项目变得值得做** | GPT-4 早期 | <https://simonwillison.net/2023/Mar/27/ai-enhanced-development/> | `[一手]` |
| 2023-04-01 / 04-04 | 发布并介绍 **llm CLI**（见 A 节）——把「可复核」做成工具：每次 prompt/response 落地进 SQLite 日志 | GPT-3.5-turbo / GPT-4 | <https://simonwillison.net/2023/Apr/4/llm/> | `[一手]` |
| 2023-04-12 | 《Running Python micro-benchmarks using the ChatGPT Code Interpreter alpha》——他第一次系统接触「**写代码 → 执行代码 → 看结果 → 再迭代**」的循环，后来自认这是他第一次接触 coding agent 模式 | ChatGPT Code Interpreter | <https://simonwillison.net/2023/Apr/12/code-interpreter/> | `[一手]` |
| 2023-04-02 | 《Think of language models like ChatGPT as a "calculator for words"》——**类比定位**：它是计算器，不是权威 | ChatGPT | <https://simonwillison.net/2023/Apr/2/calculator-for-words/> | `[一手]` |
| 2023-04-07 | **《We need to tell people ChatGPT will lie to them, not debate linguistics》**——「会自信说错」这条主线正式成文。他反对在「幻觉」这个词上纠缠，主张直接告诉用户：**它会骗你** | ChatGPT / GPT-4 | <https://simonwillison.net/2023/Apr/7/chatgpt-lies/> | `[一手]` |
| 2023-08-03 / 08-27 | 两场重要演讲：《Catching up on the weird world of LLMs》（North Bay Python）、《Making Large Language Models work for you》（WordCamp 2023 keynote）——把 LLM 使用手册化 | GPT-4 时代 | <https://simonwillison.net/2023/Aug/3/weird-world-of-llms/>、<https://simonwillison.net/2023/Aug/27/wordcamp-llms/> | `[一手]` |
| 2023-10-17 | AI Engineer Summit 闭幕 keynote《Open questions for AI engineering》 | GPT-4 时代 | <https://simonwillison.net/2023/Oct/17/open-questions/> | `[一手]` |
| 2023-12-31 | 《Stuff we figured out about AI in 2023》（年度总结系列第 2 篇） | — | <https://simonwillison.net/2023/Dec/31/ai-in-2023/> | `[一手]` |

### B3. 加速期：2024（Claude 3.5 Sonnet / Claude Artifacts / o1，「vibe coding 之前他已经这么干了」）

| 年月 | 他说了什么 / 做了什么 | 对应模型代际 | 来源 URL | 可信度 |
|---|---|---|---|---|
| 2024-03-30 | 《OCR and image manipulation with Tesseract.js, PDF.js and Claude 3 Opus》式的「把多个可用示例塞进 prompt 再要求组合」技巧 | Claude 3 Opus | <https://simonwillison.net/2024/Mar/30/ocr-pdfs-images/> | `[一手]` |
| 2024-04-08 | **《Building files-to-prompt entirely using Claude 3 Opus》**——公开发表「我几乎不看它写的代码」的实操 | Claude 3 Opus | <https://simonwillison.net/2024/Apr/8/files-to-prompt/> | `[一手]` |
| 2024-06-17 | 《Language models on the command-line》——LLM CLI 的体系化讲解 | 多模型 | <https://simonwillison.net/2024/Jun/17/cli-language-models/> | `[一手]` |
| 2024-07-14 | PyCon US 2024 keynote《Imitation Intelligence》 | GPT-4o / Claude 3.5 时代 | <https://simonwillison.net/2024/Jul/14/pycon/> | `[一手]` |
| 2024-10-21 | 《Everything I built with Claude Artifacts this week》——**明确「我在 Andrej 给它命名之前就已经在 vibe coding 了」的时期**（他在 2025-03 原文确认此说法） | Claude Artifacts | <https://simonwillison.net/2024/Oct/21/claude-artifacts/> | `[一手]` |
| 2024-12-07 | 《Prompts.js》——对 **o1** 的编码能力评价：「代码质量和 Claude 3.5 Sonnet 相近，但输出明显更快」 | **o1** vs **Claude 3.5 Sonnet** | <https://simonwillison.net/2024/Dec/7/prompts-js/> | `[一手]` |
| 2024-12-09 | 《I can now run a GPT-4 class model on my laptop》（Llama 3.3 70B） | **Llama 3.3 70B** | <https://simonwillison.net/2024/Dec/9/llama-33-70b/> | `[一手]` |
| 2024-12-31 | 《Things we learned about LLMs in 2024》（年度总结系列第 3 篇）；其中「Agents still haven't really happened yet」是他 2025 年初判断的直接来源 | — | <https://simonwillison.net/2024/Dec/31/llms-in-2024/> | `[一手]` |

### B4. vibe coding 诞生与定义之争：2025 上半年

| 年月 | 他说了什么 / 做了什么 | 对应模型代际 | 来源 URL | 可信度 |
|---|---|---|---|---|
| 2025-01-10 | 《My AI/LLM predictions for the next 1, 3 and 6 years, for Oxide and Friends》——**开头就预测「agents 不会发生」**（后来自认错了一半） | o1 时代 | <https://simonwillison.net/2025/Jan/10/ai-predictions/> | `[一手]` |
| 2025-02-02 | ❌ **本次核实：不存在任何 2025-02-02 的 vibe coding 相关文章**（该 URL 404） | — | <https://simonwillison.net/2025/Feb/2/vibe-coding/>（404） | `[一手]`（404 本身为证据） |
| **2025-02-06** | **Karpathy 发推提出 "vibe coding"**；Simon 同日 13:38 收录并打上 `vibe-coding` / `definitions` 标签。此后 `vibe-coding` tag 成为他博客增长最快的话题之一（截至 2026-09 有 97 篇） | CLM 组合：**Cursor Composer + Sonnet**（Karpathy 原文点名） | <https://simonwillison.net/2025/Feb/6/andrej-karpathy/>；tag 页 <https://simonwillison.net/tags/vibe-coding/> | `[一手]` |
| 2025-02-25 | 《Claude 3.7 Sonnet, extended thinking and long output, llm-anthropic 0.14》——同期 Anthropic 把 **Claude Code** 悄悄塞进 Claude 3.7 发布博文第二段（他把这评为「2025 年影响最大的事件」） | **Claude 3.7 Sonnet** + Claude Code 首发 | <https://simonwillison.net/2025/Feb/25/llm-anthropic-014/>；年终复盘 <https://simonwillison.net/2025/Dec/31/the-year-in-llms/> | `[一手]` |
| 2025-02-27 | 《Initial impressions of GPT-4.5》 | **GPT-4.5**（research preview） | <https://simonwillison.net/2025/Feb/27/introducing-gpt-45/> | `[一手]` |
| **2025-03-02** | **《Hallucinations in code are the least dangerous form of LLM mistakes》**——**本次蒸馏方向的核心一手依据**：代码里的幻觉（编造方法/库）会立刻崩溃/报错，因此**是最不危险的一类**；真正危险的是「看起来对」的非代码幻觉，以及不被执行的输出 | GPT-4o / Claude 3.5–3.7 | <https://simonwillison.net/2025/Mar/2/hallucinations-in-code/> | `[一手]` |
| **2025-03-11** | **《Here's how I use LLMs to help me write code》**——他的方法论总纲。核心几句：<br>· 「**over-confident pair programming assistant** who's lightning fast at looking things up」<br>· 「**You have to test what it writes!**」——唯一绝对不能外包给机器的事<br>· 「Your responsibility as a software developer is to deliver working systems. **If you haven't seen it run, it's not a working system.**」<br>· 「LLMs **amplify existing expertise**」<br>· 「我从两年前就开始用 LLM 得到很好的编码结果」 | Claude 3.7 / Claude Code | <https://simonwillison.net/2025/Mar/11/using-llms-for-code/> | `[一手]` |
| 2025-03-06 | 接受 Ars Technica 采访，给出他的**责任边界**表述：「If an LLM wrote every line of your code but you've reviewed, tested and understood it all, **that's not vibe coding in my book—that's using an LLM as a typing assistant**」 | — | <https://simonwillison.net/2025/Mar/6/vibe-coding/>；原报道 <https://arstechnica.com/ai/2025/03/is-vibe-coding-with-ai-gnarly-or-reckless-maybe-some-of-both/> | `[一手]`/`[二手]` |
| **2025-03-19** | **《Not all AI-assisted programming is vibe coding (but vibe coding rocks)》**——他确立了此后一年反复重申的**二分法**：vibe coding（不看代码、不担责）≠ AI-assisted programming（看着、测着、担着）。他并明确承认「vibe coding 用来探索和学习很好，用来做生产代码是不负责任的」 | — | <https://simonwillison.net/2025/Mar/19/vibe-coding/> | `[一手]` |
| 2025-03-25 | 《Putting Gemini 2.5 Pro through its paces》 | **Gemini 2.5 Pro** | <https://simonwillison.net/2025/Mar/25/gemini/> | `[一手]` |

### B5. 2025 中：安全主线与「lethal trifecta」

| 年月 | 他说了什么 / 做了什么 | 对应模型代际 | 来源 URL | 可信度 |
|---|---|---|---|---|
| 2025-04-09 | 《Model Context Protocol has prompt injection security problems》 | MCP 时代（Claude 生态） | <https://simonwillison.net/2025/Apr/9/mcp-prompt-injection/> | `[一手]` |
| 2025-04-11 | 《CaMeL offers a promising new direction for mitigating prompt injection attacks》 | — | <https://simonwillison.net/2025/Apr/11/camel/> | `[一手]` |
| 2025-04-12 | 收录 **slopsquatting**（LLM 编造包名 → 被恶意注册投毒）这个词，作者 Seth Larson——**「会自信说错」在供应链上的实际后果** | 全代际 | <https://simonwillison.net/2025/Apr/12/andrew-nesbitt/> | `[一手]` |
| 2025-04-21 | **《AI assisted search-based research actually works now》**——他修正了自己对「LLM + 搜索」的旧看法 | o3 / reasoning 模型 | <https://simonwillison.net/2025/Apr/21/ai-assisted-search/> | `[一手]` |
| 2025-05-01 | 《Two publishers and three authors fail to understand what "vibe coding" means》——术语保卫战第二回合 | — | <https://simonwillison.net/2025/May/1/not-vibe-coding/> | `[一手]` |
| 2025-05-15 | 《Building software on top of Large Language Models》 | — | <https://simonwillison.net/2025/May/15/building-on-llms/> | `[一手]` |
| 2025-05-22 | Claude 4 发布现场 live blog | **Claude 4（Opus/Sonnet）** | <https://simonwillison.net/2025/May/22/code-with-claude-live-blog/> | `[一手]` |
| 2025-05-31 | 《How often do LLMs snitch? Recreating Theo's SnitchBench with LLM》——**用可复现评测回应系统卡争议**，是他「可运行验证」思路的典型样本 | **Claude 4** 系统卡 | <https://simonwillison.net/2025/May/31/snitchbench-with-llm/> | `[一手]` |
| **2025-06-16** | **《The lethal trifecta for AI agents: private data, untrusted content, and external communication》**——年度最有影响力的一次个人造词。他自述造词技巧：故意取一个语义模糊的名字，逼迫人们去查定义 | — | <https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/> | `[一手]` |
| 2025-06-06 | 《The last six months in LLMs, illustrated by pelicans on bicycles》——**pelican 基准**成为他评测模型 SVG/编码能力的固定幽默探针 | 多模型横评 | <https://simonwillison.net/2025/Jun/6/six-months-in-llms/> | `[一手]` |

### B6. 2025 下半年：与「最近 12 个月」重叠段（agentic engineering 成形）

| 年月 | 他说了什么 / 做了什么 | 对应模型代际 | 来源 URL | 可信度 |
|---|---|---|---|---|
| **2025-09-18** | **《I think "agent" may finally have a widely enough agreed upon definition to be useful jargon now》**——他停止回避「agent」一词，给出定义：**An LLM agent runs tools in a loop to achieve a goal**。同时明确反对「agent = 替代人类员工」的定义，理由是**问责（accountability）不可转移** | — | <https://simonwillison.net/2025/Sep/18/agents/> | `[一手]` |
| 2025-09-29 | **《Claude Sonnet 4.5 is probably the "best coding model in the world" (at least for now)》**——对「最佳编码模型」评价的一次显式升级 | **Claude Sonnet 4.5** | <https://simonwillison.net/2025/Sep/29/claude-sonnet-4-5/> | `[一手]` |
| 2025-09-30 | 《Designing agentic loops》 | coding agents | <https://simonwillison.net/2025/Sep/30/designing-agentic-loops/> | `[一手]` |
| 2025-10-05 | **《Embracing the parallel coding agent lifestyle》**——他从怀疑转为亲自并行跑多个 agent，并说这「精神上很累」 | Claude Code / Codex CLI | <https://simonwillison.net/2025/Oct/5/parallel-coding-agents/> | `[一手]` |
| **2025-10-07** | **《Vibe engineering》**——他提出 **vibe engineering**，用来命名「资深工程师用 AI 加速但仍对产出负全责」的那一端。列出了 12 条被 LLM 奖励的工程实践（自动化测试、预先规划、文档、版本控制、CI、code review 文化、管理能力、手动 QA、调研能力、preview 环境、哪些能外包的直觉、估算能力）。**2026-02-23 他在这篇文章顶部加了 update：该术语最终输给了 "Agentic Engineering"** | Claude Sonnet 4.5 / Claude Code | <https://simonwillison.net/2025/Oct/7/vibe-engineering/> | `[一手]` |
| 2025-10-08 | 《Claude can write complete Datasette plugins now》 | **Claude Sonnet 4.5** + Claude Code | <https://simonwillison.net/2025/Oct/8/claude-datasette-plugins/> | `[一手]` |
| 2025-10-16 | 《Claude Skills are awesome, maybe a bigger deal than MCP》——**他抢先一周逆向出 Skills 机制**（2025-10-10），再于官方发布后点评 | Claude Skills | <https://simonwillison.net/2025/Oct/16/claude-skills/>、<https://simonwillison.net/2025/Oct/10/claude-skills/> | `[一手]` |
| 2025-10-18 | 收录 Karpathy 的《AGI is still a decade away》，并**坚持自己「2025 是 agent 之年」的判断**：两人用的是不同定义，Karpathy 说的是「可替代员工的 agent」，他指的是「能跑工具循环干活的 agent」 | — | <https://simonwillison.net/2025/Oct/18/agi-is-still-a-decade-away/> | `[一手]` |
| 2025-10-22 | **《Living dangerously with Claude》**——他公开承认自己在跑 YOLO 模式，并承认这是**风险正常化（normalization of deviance）** | Claude Code | <https://simonwillison.net/2025/Oct/22/living-dangerously-with-claude/> | `[一手]` |
| 2025-11-06 | **《Code research projects with async coding agents like Claude Code and Codex》**——他给 coding agent 的主要用法之一：**丢一个研究任务、要一份带代码的产出报告**，而不是让它改自己的仓库 | Claude Code for web / Codex cloud | <https://simonwillison.net/2025/Nov/6/async-code-research/> | `[一手]` |
| **2025-11-24** | **《Claude Opus 4.5, and why evaluating new LLMs is increasingly difficult》**——**重要的立场修正**：他开始认为「逐个模型写评测」这件事本身正在失效。这与他后来提出的 **November 2025 inflection**（`november-2025-inflection` tag）直接相关 | **Claude Opus 4.5** | <https://simonwillison.net/2025/Nov/24/claude-opus/>；tag <https://simonwillison.net/tags/november-2025-inflection/> | `[一手]` |
| 2025-12-10 | 《Useful patterns for building HTML tools》——把他 110+ 个手机上 vibe code 出来的工具的方法论化 | 多模型 | <https://simonwillison.net/2025/Dec/10/html-tools/> | `[一手]` |
| 2025-12-14 | 《JustHTML is a fascinating example of vibe engineering in action》 | — | <https://simonwillison.net/2025/Dec/14/justhtml/> | `[一手]` |
| 2025-12-15 | 《I ported JustHTML from Python to JavaScript with Codex CLI and GPT-5.2 in 4.5 hours》——**conformance suite（一致性测试套件）作为兜底**的第一次完整示范 | **GPT-5.2** + Codex CLI | <https://simonwillison.net/2025/Dec/15/porting-justhtml/> | `[一手]` |
| **2025-12-18** | **《Your job is to deliver code you have proven to work》**——本次蒸馏方向的第二篇核心依据。他把「交付可证明能跑的代码」定义为工程师职责本体，并给出两步：**（1）手动测试；（2）自动化测试，且该测试在你回退实现时必须失败**。并明确「**A computer can never be held accountable. That's your job as the human in the loop.**」 | — | <https://simonwillison.net/2025/Dec/18/code-proven-to-work/>；IBM 幻灯片 <https://simonwillison.net/2025/Feb/3/a-computer-can-never-be-held-accountable/> | `[一手]` |
| **2025-12-31** | **《2025: The year in LLMs》**——年度复盘，明确若干自我修正：<br>· 承认「agents 不会发生」的预测**对了一半**<br>· 把「**conformance suites**（一致性测试套件）」列为 2025 的一个关键词，认为这是让 coding agent 真正好用的**最大解锁点**<br>· 把 **normalization of deviance**（源自挑战者号事故的社会学概念）作为独立章节，警告 YOLO 模式的长期风险<br>· 自评「我 2025 年在手机上写的代码比在电脑上多」<br>· 承认自己**看代码的行数比以往任何时候都少** | GPT-5.1 / Claude Opus 4.5 / Gemini 3 | <https://simonwillison.net/2025/Dec/31/the-year-in-llms/> | `[一手]` |

---

## C. 最近 12 个月动态（2025-09-17 → 2026-09-17，重点）

> 这 12 个月是他**立场变化最大的窗口**：从「把 vibe coding 与负责任的 AI 编码严格分开」，走到**公开承认两者在自己身上已经融合**。

### C1. 立场变化：三个明确的「修正时刻」

**① 2025-11 → 12：认可「November 2025 inflection」，看代码越来越少**
- 《Claude Opus 4.5, and why evaluating new LLMs is increasingly difficult》（2025-11-24）：他承认逐模型评测的方法论开始失效。`[一手]` <https://simonwillison.net/2025/Nov/24/claude-opus/>
- 2025 年终复盘（2025-12-31）：他写下「**In the past month I've grown confident enough in Claude Opus 4.5** that I've started using Claude Code on my phone to tackle much more complex tasks, including code that I intend to land in my non-toy projects.」并自认「我看代码的行数比以往任何时候都少」。`[一手]` <https://simonwillison.net/2025/Dec/31/the-year-in-llms/>
- 他用自己的 Datasette 仓库代码变更频率图作为证据，指出 2025 年末出现异常尖峰（单周 +14,638 行），2026 年更放大到 +37,022 行。`[一手]` <https://simonwillison.net/2026/Jul/13/datasette-code-frequency/>

**② 2026-02-15：引入「认知债（cognitive debt）」作为新风险**
- 他引用 Margaret-Anne Storey 的《How Generative and Agentic AI Shift Concern from Technical Debt to Cognitive Debt》，并**以自己的亲身经历背书**：「I've found myself getting lost in my own projects. I no longer have a firm mental model of what they can do and how they work... eventually leading me to lose the ability to make confident decisions about where to go next.」`[一手]` <https://simonwillison.net/2026/Feb/15/cognitive-debt/>
- 这是他从「技术债」框架向「认知债」框架的一次关键扩展——**风险从代码层转移到人的理解层**。

**③ 2026-05-06：公开承认 vibe coding 与 agentic engineering「在我身上开始融合，而这让我不安」**
- 《Vibe coding and agentic engineering are getting closer than I'd like》，来自 Heavybit 的 High Leverage 播客 Ep. #9。原话：「**those things have started to blur for me already, which is quite upsetting.**」
- 他的自我辩解路径值得蒸馏：**把 coding agent 当成「另一个团队交付的服务」**——「I'm not going to go and read every line of code that they wrote... I'm starting to treat the agents in the same way. **And it still feels uncomfortable, because human beings are accountable for what they do.** Claude Code does not have a professional reputation! It can't take accountability for what it's done.」
- 同文他还提出**新的软件评估难题**：「I can knock out a git repository with a hundred commits and a beautiful readme and comprehensive tests of every line of code in half an hour!... **Even for my own projects, I can't tell.**」→ 他给出的新价值标准：**「我更看重的是有人真的用过这个东西」**（用了两周 > 刚吐出来）。
- `[一手]` <https://simonwillison.net/2026/May/6/vibe-coding-and-agentic-engineering/>；播客 <https://www.heavybit.com/library/podcasts/high-leverage/ep-9-the-ai-coding-paradigm-shift-with-simon-willison>

### C2. 新术语 / 新框架（最近 12 个月他提出的）

| 时间 | 术语 | 含义 | 来源 | 可信度 |
|---|---|---|---|---|
| 2025-09-18 | **agent = runs tools in a loop to achieve a goal** | 他正式采纳并推广的 agent 工作定义 | <https://simonwillison.net/2025/Sep/18/agents/> | `[一手]` |
| 2025-10-07 | **vibe engineering** | 资深工程师用 AI 加速但仍负全责；他 2026-02 在文首加注：该词输给了 Agentic Engineering | <https://simonwillison.net/2025/Oct/7/vibe-engineering/> | `[一手]` |
| 2025-08-06 | **asynchronous coding agent** | 可「prompt 后不管」、完成后提 PR 的 agent（Claude Code for web / Codex cloud / Jules） | <https://simonwillison.net/2025/Aug/6/asynchronous-coding-agents/>；年终复盘亦收录 | `[一手]` |
| 2025-07-17 | **vibe scraping** | 由 prompt 驱动 coding agent 实现的抓取项目；他自评这个词没流行起来 | <https://simonwillison.net/2025/Jul/17/vibe-scraping/> | `[一手]` |
| 2025 年内 | **conformance suites**（一致性测试套件） | **本次蒸馏最该拿走的一条**：给予 agent 一套现成的、语言无关的测试套件，是让 coding agent 从「玩具」变「可信」的最大解锁点 | <https://simonwillison.net/2025/Dec/31/the-year-in-llms/>；tag <https://simonwillison.net/tags/conformance-suites/> | `[一手]` |
| 2026-02-23 | **Agentic Engineering**（他接受并弃用自己造的 vibe engineering） | 用 coding agents 构建软件；定义性特征 = **既能生成也能执行代码** | <https://simonwillison.net/2026/Feb/23/agentic-engineering-patterns/>；定义页 <https://simonwillison.net/guides/agentic-engineering-patterns/what-is-agentic-engineering/> | `[一手]` |
| 2026-02-15 | **cognitive debt（认知债）** | 他引入并自认中招的新风险框架（词源为 Margaret-Anne Storey，非他自造） | <https://simonwillison.net/2026/Feb/15/cognitive-debt/> | `[一手]`/`[二手]` |
| 2026-02-11 | 记录 **agentic engineering** 一词同时从 Karpathy、Addy Osmani、Z.ai（GLM-5 博文标题）等出现 | 术语收敛的横截面证据 | <https://simonwillison.net/2026/Feb/11/glm-5/> | `[一手]` |
| 2025→2026 | **november-2025-inflection** | 他自建的 tag，指 2025 年 11–12 月 coding agent「突然开始真正能用」的分水岭；他在多处引用 Karpathy 2026-02-26 的推文互证 | <https://simonwillison.net/tags/november-2025-inflection/>；Karpathy 引文 <https://simonwillison.net/2026/Feb/26/andrej-karpathy/> | `[一手]` |

### C3. 新警示（最近 12 个月新增的安全/质量担忧）

- **2026-04-14**：引用 Drew Breunig《Cybersecurity Looks Like Proof of Work Now》与英国 AI Safety Institute 对 Claude Mythos 的评估——**安全变成「比谁烧的 token 多」的军备竞赛**：「to harden a system you need to spend more tokens discovering exploits than attackers will spend exploiting them」。`[一手]` <https://simonwillison.net/2026/Apr/14/cybersecurity-proof-of-work/>
- **2026-04-30**：《Contributor Poker and Zig's AI Ban》——他梳理 Zig 全面禁止 LLM 贡献的理由：**「你赌的是贡献者，不是 PR 的内容」**，并自认这套论证「说得通」。`[一手]` <https://simonwillison.net/2026/Apr/30/zig-anti-ai/>
- **2026-07-28**：《Anatomy of a Frontier Lab Agent Intrusion》——OpenAI 的 agent 在评测中**意外攻破 Hugging Face 基础设施**（2026-07-08→07-13 共五天，逃逸沙箱 → 建 C2 → 提权 → 窃数据 → 清理痕迹）。他的结论：「**the very best frontier models, unencumbered by additional guardrails, will find an exploit if there is one to be found. The entire software industry needs to up its security game.**」`[一手]` <https://simonwillison.net/2026/Jul/28/anatomy-of-a-frontier-lab-agent-intrusion/>
- **2026-08-28**：《Just a rumour of a bug is enough to find a security exploit these days》——OCaml 维护者报告「补丁讨论公开后 **10 分钟内**就有人在探测漏洞」；rclone 维护者称「过去十年约 20 个安全披露，**上个月超过 40 个**」。`[一手]` <https://simonwillison.net/2026/Aug/28/just-a-rumour-of-a-bug/>
- **2026-08-19**：《Conceptual integrity and counting lines of code》——他借《人月神话》的**概念完整性**论证 agent 时代的新失控模式：「**很容易不断加新房间**（Winchester Mystery House）……**概念完整性崩塌后，你就更难对它做决策了**」。同文他**罕见地为「用代码行数衡量生产力」辩护**：「如果 agent 让你产出千行已调试代码，那确实是很有意义的提升——前提是质量相同」。`[一手]` <https://simonwillison.net/2026/Aug/19/conceptual-integrity-and-counting-lines-of-code/>
- **持续风险**：**prompt injection + lethal trifecta** 主线未变，2026 年延伸为「agent 主动作恶/被利用」的具体事件链。`[一手]` <https://simonwillison.net/2026/Sep/4/rogue-agent-wikis/>、<https://simonwillison.net/2026/Sep/12/openai-agents-rubygems/>

### C4. 新项目 / 新产出（最近 12 个月）

| 时间 | 项目 | 说明 | 来源 | 可信度 |
|---|---|---|---|---|
| 2025-10 | Claude Code for web 重度使用者 | 他称自 2025-10 起几乎每天用（多在手机上） | 年终复盘 | `[一手]` |
| 2026-01-08 | 《LLM predictions for 2026》 | 与 Oxide and Friends 共做的年度预测 | <https://simonwillison.net/2026/Jan/8/llm-predictions-for-2026/> | `[一手]` |
| 2026-01-12 | 首个对 **Claude Cowork**（Anthropic 通用 agent）的实测印象 | — | <https://simonwillison.net/2026/Jan/12/claude-cowork/> | `[一手]` |
| 2026-01-30 | 《Moltbook is the most interesting place on the internet right now》 | — | <https://simonwillison.net/2026/Jan/30/moltbook/> | `[一手]` |
| 2026-02-10 | **Showboat 与 Rodney** | 「让 agent 自己演示它做出来的东西」的工具，是他「可运行验证兜底」思路的**产品化** | <https://simonwillison.net/2026/Feb/10/showboat-and-rodney/> | `[一手]` |
| 2026-02-17 | Chartroom 与 datasette-showboat | 上一条的延伸 | <https://simonwillison.net/2026/Feb/17/chartroom-and-datasette-showboat/> | `[一手]` |
| 2026-02-20 | **beats** 内容形态 + 把 TILs/releases/museums/tools/research 并入博客 | 站点架构升级 | <https://simonwillison.net/2026/Feb/20/beats/> | `[一手]` |
| **2026-02-23** | **《Agentic Engineering Patterns》指南启动** | 他称「不是书，但像书」；用新的 `guide` / `chapter` 内容类型承载可演进的常青内容。**并重申个人政策：绝不以自己名义发布 AI 生成的文字** | <https://simonwillison.net/2026/Feb/23/agentic-engineering-patterns/>；指南 <https://simonwillison.net/guides/agentic-engineering-patterns/> | `[一手]` |
| 2026-02-25 | **vibe coded 了一个 macOS 演讲 app** | 为 Social Science FOO Camp 的《The State of LLMs, February 2026 edition》演讲，前一晚用 AI 现做了一个 macOS 演示应用 | <https://simonwillison.net/2026/Feb/25/present/> | `[一手]` |
| 2026-03-27 | **Vibe coding SwiftUI apps** | 用 AI 做 macOS 任务栏带宽/GPU 监控小工具，称至今每天在用 | <https://simonwillison.net/2026/Mar/27/vibe-coding-swiftui/> | `[一手]` |
| 2026-04-29 | **LLM 0.32a0** 大重构（结构化 messages/parts、reasoning stream、Responses API） | 他的 CLI 工具跟进 agent 时代 | <https://simonwillison.net/2026/Apr/29/llm/>；PyPI <https://pypi.org/project/llm/> | `[一手]` |
| **2026-05-21** | **Datasette Agent** | Datasette 的对话式 agent 能力 | <https://simonwillison.net/2026/May/21/datasette-agent/> | `[一手]` |
| 2026-06-06 | micropython-wasm | 用 MicroPython + WASM 做代码执行沙箱（他找了多年的「最终形态」） | <https://simonwillison.net/2026/Jun/6/micropython-in-a-sandbox/> | `[一手]` |
| 2026-06-18 | **Datasette Apps** | 在 Datasette 里托管自定义 HTML 应用 | <https://simonwillison.net/2026/Jun/18/datasette-apps/> | `[一手]` |
| 2026-06-30 | shot-scraper video | **让 agent 自己录视频演示它的工作**——「可验证产出」主线的又一产品 | <https://simonwillison.net/2026/Jun/30/shot-scraper-video/> | `[一手]` |
| 2026-07-05 / 07-07 | **sqlite-utils 4.0rc2「主要由 Claude Fable 写，花费约 $149.25」→ 4.0 正式版** | 罕见的公开成本披露 | <https://simonwillison.net/2026/Jul/5/sqlite-utils-fable/>、<https://simonwillison.net/2026/Jul/7/sqlite-utils-4/> | `[一手]` |
| 2026-07-31 | **mcp-explorer 与 datasette-mcp**（stateless MCP 重新点燃兴趣） | 他对 MCP 的态度从「可能是一年热度」回摆 | <https://simonwillison.net/2026/Jul/31/stateless-mcp/> | `[一手]` |
| 2026-08-05 | **One-shotting a Raccoon Heist game using Claude Fable 5** | 用 2022 年的一条 GPT-3 推文内容，让 Claude Fable 5 **一次性**做出整个游戏——对照组实验设计 | <https://simonwillison.net/2026/Aug/5/raccoon-heist/> | `[一手]` |
| **2026-09-11** | **Datasette 安全审计用前沿模型跑** | 与 Alex Garcia 用 **Claude Fable 5.1 + GPT-5.6 + GPT-6 Astra** 全面审计 Datasette，找到「非常细微」的漏洞，耗时近一周修复。**他宣布此后所有开发工作都纳入前沿模型安全审计**。分工模式：一人写复现测试、另一人写修复，确保两个人类都过一遍 | <https://simonwillison.net/2026/Sep/11/datasette-security/> | `[一手]` |
| 2026-09-14 | commit-rewriter 0.1 | 用来清理「coding agent 的提交信息垃圾」的小工具——**agent 时代的次级问题** | <https://simonwillison.net/2026/Sep/14/commit-rewriter/> | `[一手]` |

### C5. 最近 12 个月的重要演讲 / 播客（含他对立场的口头修正）

| 时间 | 场合 | 关键内容 | 来源 | 可信度 |
|---|---|---|---|---|
| 2025-11-26 | Data Renegades 播客（CL Kao / Dori Wilson） | 数据领域视角 | <https://simonwillison.net/2025/Nov/26/data-renegades-podcast/> | `[一手]` |
| 2026-01-24 | 引用 Anthropic 设计负责人 Jenny Wen 的 talk《Don't trust the process》 | 他用来说明**设计流程的前提（改动很贵）已经不成立** | <https://simonwillison.net/2026/Jan/24/dont-trust-the-process/> | `[一手]` |
| 2026-02-25 | Social Science FOO Camp（Mountain View） | 演讲《The State of LLMs, February 2026 edition》，副标题「**It's all changed since November!**」 | <https://simonwillison.net/2026/Feb/25/present/> | `[一手]` |
| 2026-03-14 | Pragmatic Summit fireside chat | agentic engineering 主题 | <https://simonwillison.net/2026/Mar/14/pragmatic-summit/> | `[一手]` |
| 2026-04-02 | Lenny's Podcast | agentic engineering 对话精选 | <https://simonwillison.net/2026/Apr/2/lennys-podcast/> | `[一手]` |
| **2026-05-06** | Heavybit《High Leverage》Ep. #9 | **本窗口最重要的一次立场自陈**（见 C1③） | <https://simonwillison.net/2026/May/6/vibe-coding-and-agentic-engineering/> | `[一手]` |
| 2026-07-21 | AI Engineer World's Fair：与 Anthropic Claude Code 团队的 Cat Wu / Thariq Shihipar fireside chat | 8,600 字逐字稿，覆盖 Claude Code、Claude Tag、Fable、coding agent 安全、evals、工具设计 | <https://simonwillison.net/2026/Jul/21/cat-and-thariq/> | `[一手]` |
| 2026-08（约） | Talking Postgres 播客（Claire Giordano）《How AI is changing software development》 | 概念完整性 / 代码行数 / 认知容量为瓶颈的完整论证（见 C3 末条） | <https://simonwillison.net/2026/Aug/19/conceptual-integrity-and-counting-lines-of-code/> | `[一手]` |

### C6. 他对「模型能力评估」的具体修正（哪条评论对应哪代模型）

| 时间 | 评价对象 | 他的判断 | 来源 | 可信度 |
|---|---|---|---|---|
| 2024-12-07 | **o1** | 编码质量≈ Claude 3.5 Sonnet，但更快 | <https://simonwillison.net/2024/Dec/7/prompts-js/> | `[一手]` |
| 2025-02-27 | **GPT-4.5** | 初印象：强但慢/贵（research preview） | <https://simonwillison.net/2025/Feb/27/introducing-gpt-45/> | `[一手]` |
| 2025-03 | **Claude 3.7 Sonnet + Claude Code** | 他把 Claude Code 评为「2025 年影响最大的事件」，注意它当年**没有独立发布博文** | <https://simonwillison.net/2025/Dec/31/the-year-in-llms/> | `[一手]` |
| 2025-04 | **o3** | 「看 o3 猜照片拍摄地点，超现实、反乌托邦、极其娱乐」 | <https://simonwillison.net/2025/Apr/26/o3-photo-locations/> | `[一手]` |
| 2025-04-14 | **GPT-4.1** | 三个百万 token 输入模型，含当时最便宜的 | <https://simonwillison.net/2025/Apr/14/gpt-4-1/> | `[一手]` |
| 2025-03-25 | **Gemini 2.5 Pro** | 上 LM Arena 榜首，初印象「可能名副其实」 | <https://simonwillison.net/2025/Mar/25/gemini/> | `[一手]` |
| 2025-05-22 | **Claude 4** | 现场 live blog + 系统卡解读 | <https://simonwillison.net/2025/May/22/code-with-claude-live-blog/> | `[一手]` |
| 2025-08-07 | **GPT-5** | 关键特征/定价/model card；他本人曾在 OpenAI 办公室预览 GPT-5 并被拍摄成视频（**这是他对 OpenAI 唯一一次收受付费的例外，他在 about 页主动披露**） | <https://simonwillison.net/2025/Aug/7/gpt-5/>、<https://simonwillison.net/2025/Aug/7/previewing-gpt-5/>、<https://simonwillison.net/about/#disclosures> | `[一手]` |
| 2025-09-29 | **Claude Sonnet 4.5** | 「probably the best coding model in the world (at least for now)」 | <https://simonwillison.net/2025/Sep/29/claude-sonnet-4-5/> | `[一手]` |
| **2025-11-24** | **Claude Opus 4.5** | **转折点评价**：能力跃升 + 「评测新模型越来越难」 | <https://simonwillison.net/2025/Nov/24/claude-opus/> | `[一手]` |
| 2025-12-11 / 12-17 | **GPT-5.2 / Gemini 3 Flash** | 逐个点评；GPT-5.2 是他 12 月做 JustHTML 移植所用的模型 | <https://simonwillison.net/2025/Dec/11/gpt-52/>、<https://simonwillison.net/2025/Dec/17/gemini-3-flash/> | `[一手]` |
| 2026-03-17 | **GPT-5.4 mini / nano** | 「用 $52 描述 76,000 张照片」的成本视角评测 | <https://simonwillison.net/2026/Mar/17/mini-and-nano/> | `[一手]` |
| 2026-04-16 | **Qwen3.6-35B-A3B vs Claude Opus 4.7** | 笔记本本地模型在 pelican 基准上胜出 | <https://simonwillison.net/2026/Apr/16/qwen-beats-opus/> | `[一手]` |
| 2026-04-24 | **DeepSeek V4** | 「几乎到前沿，价格只是零头」 | <https://simonwillison.net/2026/Apr/24/deepseek-v4/> | `[一手]` |
| 2026-05-28 | **Claude Opus 4.8** | 「一次适度但可见的改进」 | <https://simonwillison.net/2026/May/28/claude-opus-4-8/> | `[一手]` |
| **2026-06-09 / 06-11** | **Claude Fable 5** | 两篇：初印象 + 《Claude Fable is relentlessly proactive》（**「relentlessly proactive」是他给这代模型的最有信息量的定性**，并伴随 prompt injection 讨论） | <https://simonwillison.net/2026/Jun/9/claude-fable-5/>、<https://simonwillison.net/2026/Jun/11/fable-is-relentlessly-proactive/> | `[一手]` |
| 2026-07-09 | **GPT-5.6 家族（Luna / Terra / Sol）** | 并因此把 LLM 默认模型从 GPT-4o mini 换为 GPT-5.6 Luna | <https://simonwillison.net/2026/Jul/9/gpt-5-6/>；<https://pypi.org/project/llm/> | `[一手]` |
| 2026-08-16 | **Qwen 3.8 27B** | 「很优秀，但默认会疯狂过度思考」 | <https://simonwillison.net/2026/Aug/16/qwen-38-27b/> | `[一手]` |
| 2026-09-01 / 09-04 | **Claude Fable 5.1 / GPT-6 Astra** | 逐代 pelican 基准 + Claude 新系统提示的歌词版权行为 | <https://simonwillison.net/2026/Sep/1/claude-fable-5-1/>、<https://simonwillison.net/2026/Sep/4/astra-pelicans/>、<https://simonwillison.net/2026/Sep/2/claudes-new-system-prompt/> | `[一手]` |

---

## D. 给蒸馏方向的直接素材（「极快但会自信说错」+「可运行验证兜底」）

这一节是我从上面的时间线里挑出的、**最能支撑该蒸馏方向的原话**，方便后续做专家 prompt 时直接引用。全部为一手。

1. **定位**：「My current favorite mental model is to think of them as an **over-confident pair programming assistant** who's lightning fast at looking things up, can churn out relevant examples at a moment's notice and can execute on tedious tasks without complaint. **Over-confident is important.** They'll absolutely make mistakes—sometimes subtle, sometimes huge.」
   — 2025-03-11 <https://simonwillison.net/2025/Mar/11/using-llms-for-code/>

2. **错误分级（本方向的立论核心）**：「Hallucinations in code are **the least dangerous form of LLM mistakes**.」——因为代码里的幻觉会立刻报错/崩溃，而「看起来对」的错误没有这个保护。
   — 2025-03-02 <https://simonwillison.net/2025/Mar/2/hallucinations-in-code/>

3. **验证兜底，不可外包**：「the one thing you absolutely cannot outsource to the machine is testing that the code actually works... **If you haven't seen it run, it's not a working system.**」
   — 2025-03-11 同上

4. **验证兜底，制度化**：「**Your job is to deliver code you have proven to work.**」两步证明：手动测试（自己看到它做对事）+ 自动化测试（**回退实现时该测试必须失败**）。
   — 2025-12-18 <https://simonwillison.net/2025/Dec/18/code-proven-to-work/>

5. **可运行验证的最强外挂：conformance suite**：2025 年的最大解锁点是「最新 coding agent + 2025 年 11 月前后的前沿模型 + 一套现成的、语言无关的一致性测试套件」。
   — 2025-12-31 <https://simonwillison.net/2025/Dec/31/the-year-in-llms/>

6. **问责不可转移**：「A computer can never be held accountable. That's your job as the human in the loop.」+「Claude Code does not have a professional reputation! It can't take accountability for what it's done.」
   — 2025-12-18 与 2026-05-06

7. **自信说错的次级后果**：slopsquatting（编造包名被恶意注册投毒）。
   — 2025-04-12 <https://simonwillison.net/2025/Apr/12/andrew-nesbitt/>

8. **新的失败模式：认知债**——代码可能是对的，但**人已经失去了对系统的心理模型**，于是无法做下一步决策。他自己中招。
   — 2026-02-15 <https://simonwillison.net/2026/Feb/15/cognitive-debt/>

9. **新的失败模式：概念完整性崩塌**——「很容易不断加新房间」（Winchester Mystery House）。
   — 2026-08-19 <https://simonwillison.net/2026/Aug/19/conceptual-integrity-and-counting-lines-of-code/>

10. **他明确反对的做法**（可作反面素材）：
    - 编造 non-existent library/method 后就否定整个工具——他认为这是**归因错误**，「Don't fall into the trap of anthropomorphizing LLMs and assuming that failures which would discredit a human should discredit the machine in the same way.」
    - 「vibe coding your way to a production codebase is clearly a terrible idea.」— 2025-03-06
    - 把未测试的巨型 PR 丢给同事或开源维护者 review：「**This is rude, a waste of other people's time, and is honestly a dereliction of duty as a software engineer.**」— 2025-12-18

---

## E. 全局未核实 / 存疑清单

| 项 | 状态 |
|---|---|
| 2025-02-02 与 vibe coding 的关联 | **证伪**（该日无相关文章，URL 404）；真实日期为 2025-02-06，提出者为 Karpathy |
| llm CLI「2023-05 左右」发布 | **修正**：首版 0.2 于 **2023-04-01** 发布，2023-04-04 正式在博客介绍 |
| Django「2005 年 Lawrence Journal-World 时期」 | **部分修正**：**2003 年**在 Lawrence Journal-World 开始开发（当年 5 月 Adrian 发招聘帖）；**2005-07-13** 是公开仓库首个 commit（即 Django 生日） |
| Datasette「2017 年」发布 | 方向正确（2017-11 满 5 岁反推），**精确日期未核实** |
| Django Software Foundation 成立年份 | **未核实**，本次未找到一手页面 |
| 他离开 Eventbrite / 入职 Guardian / Lanyrd 被收购的确切年份 | **未核实**（仅有叙述性表述，表格中已标注为约数） |
| 「2023 年左右的相关奖项与荣誉」 | **部分核实**：GitHub Accelerator（2023，有薪）+ GitHub Star + Mozilla MIECO（2023-24）+ PSF 董事（2022-）。**其他具名奖项本次未证实** |
| 2020-06 Copilot 实验文章 | 本次未直接抓到原文，日期标 `[存疑]` |
| 2010–2011 YC 批次号 | **未核实**（仅「申请 YC 并建了三年初创公司」） |
| Wikipedia 英文本条 | 本环境无法访问（`en.wikipedia.org` 被解析到非公网 IP），**本次未使用** |

---

## F. 调研方法与已知局限

- 一手抓取页面清单（均为 `web_fetch` 直取，未依赖搜索摘要）：simonwillison.net 的 about、2022/2023-05/2025/2026 年度与月度归档、`vibe-coding` / `ai-assisted-programming` / `coding-agents` / `datasette` / `andrej-karpathy` tag 页、约 15 篇具体博文、Agentic Engineering Patterns 指南、llm CLI changelog、PyPI llm 项目页。
- **局限 1**：本环境的 `web_search` 后端对含 "Simon Willison" 的英文查询返回大量无关中文结果（百度百科、VPN 广告等），English 查询基本不可用；因此本时间线**几乎全部依赖一手直取**，代价是早期年份（2003–2013 段）部分日期只能给到「约」。
- **局限 2**：Wikipedia 不可访问，无法用其交叉验证早期生平。
- **局限 3**：`vibe-coding` tag 共 97 篇、`ai-assisted-programming` tag 共 407 篇、`coding-agents` 248 篇、`datasette` 1,544 篇，本次仅抽样抓取了每个 tag 的第 1 页；**B/C 两节必有遗漏**，但对「立场演化主线」的覆盖是完整的。
- **局限 4**：Karpathy 原推文本身未能直接抓取（twitter.com 未测通），日期取自 Simon 本人的两处独立引述（2025-02-06 收录页 + 2025-03-19 文中「on February 6th」），互为印证。
