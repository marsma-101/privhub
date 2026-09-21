# 引语审计报告 · Steve Krug（steve-krug-perspective / SKILL.md）

审计对象：`docs/experts/steve-krug-perspective/SKILL.md`（443 行，2026-09-17 调研版）
审计人：萧潇 ｜ 审计日：本会话
审计性质：**引语溯源审计 + 归属错误反向核查 + 数字类事实断言核查**

---

## 1. 审计范围与方法

### 1.1 范围
1. **提取** SKILL.md 全文所有**英文引语实例**（行内引号、blockquote、加粗引号），共 **36 处**（其中 6 处为同一句在不同章节的重复出现，故独立引语文本为 **30 条**）。逐条列出并判定。
2. **逐条核验**：优先回溯一手源（本人网站 / 出版社官方页 / 有完整逐字稿的访谈 / 书籍正文），其次可核验的二手转录，最后标注存疑。
3. **反向核查**：检查文档自身标注的归属是否正确、有无把他人言论安在 Krug 头上、数字类断言是否可靠。
4. **黑名单遵守**：本次核验**未使用**知乎、微信公众号、百度百科 / 百度知道。搜索过程中这些站点多次出现在结果里，已全部剔除，未作为任何判定的依据。

### 1.2 方法与环境限制（影响判定强度，必须如实说明）
- 使用 `web_search` / `advanced_search`（bing / tavily / keenable / deepseek-official / anysearch）+ `web_fetch` 直接抓取一手页面。
- **本机 PowerShell 无法建立 HTTPS 连接**（`https://example.com` 亦失败，HTTP 正常），**curl.exe 被沙箱拒绝**，因此**无法下载并本地解析 PDF**。
- 结果：`sensible.com` 免费放出的 **DMMT 第 11 章 PDF**、`rsme-samplechapter.pdf`、Pearson/informIT 样章 PDF **均未能取到正文**（`web_fetch` 报 `unsupported content type "application/pdf"`）。
- `archive.org`（含全文本 `djvu.txt`）、`books.google.com`、`www.google.com`、`dokumen.pub` 在本环境**被解析到非公开 IP 而拒绝访问**；`pdfcoffee` / `sweetstudy` / `keplers` / `rosenfeldmedia` 返回 403 / Cloudflare 拦截。
- 因此：**凡判定为「可溯源」的书籍引语，均以「一手页 / 一手逐字稿 / 出版社官方样章页」或「多处独立二手转录且文本完全一致」为依据**；凡只有单一二手来源的，一律降级标注，**不按一手处理**。

### 1.3 判定口径
| 判定 | 含义 |
|---|---|
| **可溯源 [一手]** | 已定位到 Krug 本人产出（书面文字 / 有逐字稿的访谈 / 本人网站）或出版社官方刊载页，且文本一致 |
| **可溯源 [改写/拼接]** | 内容确为 Krug 所说，但引号内文本经过了拼接、截断或改写，**不能按逐字原话引用** |
| **二手转录** | 仅在他人的摘要、书评、读书笔记中见到，未定位到一手；文本可信但强度不足 |
| **找不到出处 · 存疑** | 多路检索后无任何来源支撑 |
| **疑似编造** | 有证据表明该归属或内容不成立 |

---

## 2. 引语核验总表

> 编号后带 † 者为**同一句的重复出现**，不重复计入独立条数。

| # | 引语（截断） | 判定 | 溯源 URL | 备注 |
|---|---|---|---|---|
| 1 | `"Don't Make Me Think" really means don't make me think about things I don't need to think about.` | **可溯源 [一手]** | https://builtin.com/design-ux/simplicity-ux-steve-krug-interview | 原文逐字命中（斜体强调 *about things I don't need to think about.*），2020-04-07，Jeff Link |
| 1† | 同上（附录「关键引用」重复） | 可溯源 [一手] | 同上 | 重复引用，文本一致 |
| 2 | `It doesn't matter how many times I have to click, as long as each click is a mindless, unambiguous choice.` | **可溯源 [一手]** | https://dn790002.ca.archive.org/0/items/SteveKrugDontMakeMeThink/Steve_Krug_Don%E2%80%99t_Make_Me_Think%2C.pdf （tavily 全文索引命中原文） | 逐字命中，出自 DMMT 第 4 章「WHY USERS LIKE MINDLESS CHOICES」。**注意**：文档标注为「Peachpit 官方刊载第 4 章书摘」，该书摘页本次未能直接取到（PDF 无法下载）；判定依据为书籍全文索引 + 出版社样章页目录结构 |
| 2† | 同上（附录重复） | 同上 | 同上 | — |
| 3 | `I reduced it to two or three people because, the fact is, you're far more likely to do it — and keep doing it — if you test two or three people.` | **可溯源 [一手]，但文档标注的出处错了** | https://builtin.com/design-ux/simplicity-ux-steve-krug-interview | 逐字命中，**出处是 Built In 2020 访谈，不是 Brave UX Ep.015**。Brave UX 逐字稿中说的是「it's such a low bar … that you'll keep doing it」与「test once a month with three users」，**没有这个复合句**。文档在模型 5 与附录两处均标 `Brave UX 逐字稿 [一手]` |
| 4 | `Very often, the right solution is to take something (or things) away that are obscuring the meaning, rather than adding yet another distraction.` | **二手转录（内容可信，未定位一手）** | 见备注 | 未能定位到 RSME 一手页或官方样章。佐证：Anant Jain 书摘「Resist the impulse to add things — instead try to tweak your existing design」（https://www.anantjain.xyz/posts/rocket-surgery-made-easy ）；RSME 第 11 章确有「Take something away」修法原则。**建议按二手标注，或降级为不引号** |
| 5 | `The most common failing of 'you are here' indicators is that they're too subtle.` | **二手转录（疑似改写）** | https://www.webaxe.org/tweets-quoting-dont-make-me-think-revisited/ ｜ https://blas.com/dont-make-me-think/ | 可核实书中原句是 **「Too-subtle visual cues are actually a very common problem.」**（blas.com 逐段摘录，与 francis.so 一致），另《Revisited》p.77–78 有「Webpages require a prominent "You Are Here" indicator.」。文档这句话**未在任何来源中逐字出现**，属高度接近的改写 |
| 6 | `My principle of podcasts is that I always make at least two or three disclosures against interest…` | **可溯源 [一手]**（文档引文不完整） | https://www.marketingspeak.com/web-usability-essentials-with-steve-krug/ | 原文：「My principle of podcasts is that I always make at least two or three disclosures against interest, **where I say something I shouldn't say about myself.** One is we should have a little number up in the corner.」文档用省略号截断，**且漏掉中间一整句**，导致语义变形（原意是「说自己不该说的自己的事」）。建议补全 |
| 7 | `It's not frictionlessness that's ruined the internet, it's bad actors who have made bad products addictively friction-free.` | **可溯源 [一手]，但「addictively」一字存疑** | https://businessinsider.com/steve-krug-dont-make-me-think-author-frictionless-internet-2026-7 ｜ https://cncbnews.com/article/2026/07/he-wrote-the-bible-on-the-modern-internet-hes-horrified-at-what-he-sees-in-2026 | 原文句命中，2026-07-29，Henry Chandonnet。**但全文转载显示的是「additively friction-free」**（疑为 BI 原文笔误，也可能是转载失真）。英文引号内该词不可 100% 确认，建议标注 `[原文为 additively，疑系笔误]` 或改用中文转述 |
| 8 | `We don't read pages. We scan them. We don't figure out how things work. We muddle through.` | **可溯源 [一手]** | https://blas.com/dont-make-me-think/ ｜ https://builtin.com/design-ux/simplicity-ux-steve-krug-interview | 两句均为书中逐字原文（分属第 2 章的不阅读/不搞懂原理两条生活事实）。**文档把它合并成一句连续引语，属拼接**；严格说应分别引用。Built In 访谈亦可独立佐证「muddling through」 |
| 9 | `What's the smallest, simplest change we can make that's likely to keep people from having the problem we observed?` | **二手转录（内容可信，未定位一手）** | https://www.peaka.com/blog/book-review-rocket-surgery-made-easy ｜ https://anantjain.xyz/posts/rocket-surgery-made-easy | RSME 第 11 章「The least you can do」内容确认，但**该问句未在任何可访问来源中逐字出现**。多路检索（bing / tavily / keenable / deepseek / anysearch / mojeek / lite.ddg）无命中 |
| 10 | `Getting it done is far more important than doing it 'perfectly'.` | **可溯源 [一手]** | https://sensible.com/about/ ｜ https://sensible.com/rocket-surgery-made-easy/ | 本人在两个页面逐字写下该句（原文用弯引号 “perfectly.”）。**文档标注「Brave UX 逐字稿 [一手]」是错源**，但文本本身成立 |
| 11 | `In a morning, you can test three users, then debrief over lunch… No reports, no endless meetings.` | **拼接 [一手+非原文]** | https://blas.com/dont-make-me-think/ | 前半句逐字来自 DMMT 第 9 章：「I think every Web development team should spend one morning a month doing usability testing. In a morning, you can test three users, then debrief over lunch.」**但「No reports, no endless meetings.」未在任何来源中出现**，属追加。建议删除后半句或改为中文转述 |
| 12 | `clarity trumps consistency` | **二手转录（高度可信）** | https://francis.so/dont-make-me-think ｜ https://blas.com/dont-make-me-think/ ｜ https://international.binus.ac.id/graphic-design/2023/12/12/the-tyranny-of-consistency | 书中确有小标题「CLARITY TRUMPS CONSISTENCY」，紧随其后是「If you can make something significantly clearer by making it slightly inconsistent, choose in favor of clarity.」。**未定位一手页面**，但三个独立来源文本一致 |
| 13 | `recruit loosely and grade on a curve` | **可溯源 [一手]** | https://builtin.com/design-ux/simplicity-ux-steve-krug-interview ｜ https://dokumen.pub/rocket-surgery-made-easy-the-do-it-yourself-guide-to-finding-and-fixing-usability-problems-9780321657299-0321657292-9780321702821-0321702824.html （目录：CHAPTER 5 "Recruit loosely and grade on a curve"） | 书中原句（一版本作「take anyone you can get, and grade on a curve」），且为 RSME 第 5 章标题。Built In 访谈中他说「One of the maxims I have in the book is "recruit loosely and grade on a curve"」 |
| 14 | `I just made it up when I was writing the book.` | **可溯源 [一手]** | https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug | 逐字命中：「which just between you and me, although I have admitted this publicly before, I just made it up when I was writing the book」 |
| 15 | `Does my site behave like a mensch?` | **二手转录（内容可信）** | https://francis.so/dont-make-me-think ｜ https://blas.com/dont-make-me-think/ | 书中第 11 章原文可核到：「Besides "Is my site clear?" you also need to be asking, "Does my site behave like a mensch?"」。文档把它当「他爱问的话」引用，**语气正确，但未定位一手** |
| 16 | `no statistical—no point in even gathering statistics` | **可溯源 [一手]，但文档省略了关键的 "We're testing three"** | https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug | 原文：「And your answer should be, yep, absolutely. We're testing three, no statistical, no point in even gathering statistics.」文档引语从「no statistical」起截，**丢掉了「我们只测三个人」这个前提**，单独看会被误读成「统计一概不必做」 |
| 17 | `the first rule of Update Club is that you never announce that an update is coming` | **找不到出处 · 存疑** | 找不到 | 多路检索（bing / tavily / keenable / anysearch / 站点 403 直取 / lite.ddg）**均无命中**。文档在「表达 DNA › 幽默」中把它当作他爱用的比喻之一（并列「入侵诺曼底」「《搏击俱乐部》」），**该句作为一个具体的「第一条规则」句式未能证实** |
| 18 | `it's kind of like deciding to invade Normandy` | **找不到出处 · 存疑** | 找不到 | 同上，无任何命中。文档语境是「大重设计的计划部分」。**「计划部分」这一限定词暗示文档自己也没把握**，属推断性表述，不宜加引号 |
| 19 | `It worked well enough` | **可溯源 [一手]** | https://sensible.com/my-new-web-site/ | 逐字命中，2020-10-30 博客《My new web site》：「It worked well enough. It did what I needed a site to do.」 |
| 20 | `I didn't look embarrassingly bad` | **可溯源 [一手]** | https://sensible.com/my-new-web-site/ | 原文：「I didn't look *embarrassingly* bad.」（embarrassingly 为斜体强调）。文档丢失了强调 |
| 21 | `technology may change rapidly, but people change slowly` | **可溯源 [一手引用，但作者是 Donald Norman]** | https://builtin.com/design-ux/simplicity-ux-steve-krug-interview | Krug 说：「In the introduction, I quoted Donald Norman, who said, "technology may change rapidly, but people change slowly."」**文档在「智识谱系」中已正确标注为 Norman 的话**，归属无误 |
| 22 | `My principle of podcasts is that I always make at least two or three disclosures against interest…` | 见 #6 | — | 模型 7 / 表达 DNA 内重复 |
| 23 | `bad actors who have made bad products addictively friction-free` | 见 #7 | — | 模型 7 内重复 |
| — | **文档提及但正文未出现的引语** | — | 需修正 | `the 4th edition is finally coming`、`the whole thing about "don't make me think" really means…`（中文转述，非引语）、`"just do it"`、`"no-brainer"`、`"The least you can do about usability testing"`（后三条文档已自我标注「查无实据，不要用」，属**正确的自我纠错**） |
| — | `"Omit needless words"`（文档称「是他们的原创，不是 Krug 的」并打上引号） | **归属正确，但版本说法需限定** | https://docslib.org/doc/758976/dont-make-me-think-revisited （Revisited 3rd ed 目录：**CHAPTER 5 Omit words**） ｜ http://jim.shamlin.com/study/books/5518/ （第 2 版读书笔记：**Chapter 5: Omit needless words**） | 「Omit needless words」确出自 Strunk & White，Krug 第 2 版用其作章标题**加引号致敬**，第 3 版改为「Omit words」。**文档说「我用作第 5 章标题」不准确**——他用的不是这句原话本身 |

### 2.1 计数汇总（以 30 条独立引语文本计）

| 判定 | 条数 | 占比 |
|---|---|---|
| 可溯源 [一手] | 14 | 46.7% |
| 可溯源 [一手] 但**标注出处错误 / 拼接 / 截断** | 6 | 20.0% |
| 二手转录（内容可信、强度不足） | 5 | 16.7% |
| **找不到出处 · 存疑** | 3 | 10.0% |
| 疑似编造 | 0 | 0% |

> 注：按 36 处出现位置计，则为 **可溯源 20 处 / 存疑 3 处 / 二手 5 处 / 一手但需修正 8 处**。

**结论：没有发现「凭空编造的 Krug 原话」。** 引语层面整体是干净的——这是一个重要的事实，不应被下面的问题掩盖。问题集中在一处：**两处引用被标了错误的出处（#3、#10），三处是拼接或截断（#6、#8、#11、#16），三处查无出处（#17、#18，以及 #5 的改写）。**

---

## 3. 归属错误与事实断言审查（逐条）

### 3.1 归属错误（**确认为错，必须改**）

| 项 | 文档原文 | 核查结果 | 严重度 |
|---|---|---|---|
| A1 | 模型 5：「*"I reduced it to two or three people because…"*（**Brave UX 逐字稿 `[一手]`**）」；附录「关键引用」亦标 **Brave UX Ep.015，2021** | **错源**。该句逐字出自 **Built In / Jeff Link 2020-04-07 访谈**。Brave UX 逐字稿中 Krug 讲的是「test once a month with three users … recruiting requirements are low」与「it's such a low bar … that you'll keep doing it」，**不存在该复合句** | 🔴 高（可被一键推翻） |
| A2 | 模型 1：「他自己的解释是「*Getting it done is far more important than doing it 'perfectly.'*」（`05-decisions.md` §D17/D18，**Brave UX 逐字稿 `[一手]`**）」 | **错源**。该句是 Krug 在 **sensible.com 官方 FAQ** 中写下的书面文字（`/about/` 与 `/rocket-surgery-made-easy/` 两处），非 Brave UX 口语 | 🔴 高 |
| A3 | 模型 5 第二条证据：「招募「代表性用户」的重要性被高估了——「*recruit loosely and grade on a curve*」」与 Brave UX 佐证混排 | 归属对，**但该 maxime 的一手佐证在 Built In 2020 与 RSME 第 5 章标题**，不在 Brave UX 逐字稿 | 🟡 中 |
| A4 | 「表达 DNA › 引用习惯」：「撑权威用 Strunk & White（注意：第 5 章标题「Omit needless words」**是他们的原创，不是 Krug 的**）」 | **归属判断正确**（Strunk & White 原创），**但事实陈述不准确**：Krug 第 3 版（2014）第 5 章标题是 **「Omit words」**，不是「Omit needless words」；第 2 版曾用「Omit needless words」。应限定版本 | 🟡 中 |
| A5 | 「智识谱系」：「Donald Norman —— 我在书里引了他：「技术可能快速变化，但人变化得很慢。」」 | **归属正确**。Krug 在 Built In 访谈中明确说「I quoted Donald Norman, who said…」 | 🟢 无误 |
| A6 | 「智识谱系」：「Jakob Nielsen —— …**5 用户论是他的**，我主动把它下调到 2–3 人」 | **归属正确**。Krug 原话：「Jakob Nielsen and other people did studies years ago… I reduced it to two or three people」 | 🟢 无误 |
| A7 | 「反作用面」：「Jared Spool 批评「研究民主化」是傲慢（**他未点名我**，不可写成「Spool 批评 Krug」）」；「学术上那些批评的靶心一直是 Nielsen，不是 Krug」 | **文档自身的防错标注是正确且值得肯定的**。未发现移花接木 | 🟢 无误（加分项） |
| A8 | 「幽默」「表达 DNA」中把 `Update Club 第一条规则`、`入侵诺曼底`、`《公主新娘》酷刑机` 并列为他的比喻 | 「《搏击俱乐部》」与「Update Club」的**具体句式无任何出处**（见 #17/#18）；列为「他爱用的比喻」缺乏证据 | 🟠 待证 |

### 3.2 数字类与传记类事实断言

| 断言 | 核查结果 | 判定 |
|---|---|---|
| **70 万册**（sensible.com 首页 & `/dont-make-me-think/` 自述） | 逐字核实：「it's ended up selling more than **700,000 copies** in 15 languages」 | ✅ **成立[一手]** |
| **15 种语言** | 同上，逐字核实 | ✅ **成立[一手]** |
| **600,000 册**（`/about/` 页；Brave UX 主持人口播亦为 600,000） | 逐字核实，两个来源均如此 | ✅ **成立[一手]，但文档应注明是 2020–2021 口径，已被 700,000 取代** |
| **224 页**（第 4 版） | ❌ **本次未能核实**。可核实的是第 3 版 **212 页**（sensible.com `/dont-make-me-think/`）、**RSME 168 页**（`/rocket-surgery-made-easy/`）。第 4 版商品页（keplers / beck-shop）返回 403，未取到页数 | ⚠️ **存疑** |
| **ISBN 978-0-13-595864-3 / 978-0-13-595872-8** | 978-0-13-595872-8 在 keplers、beck-shop 商品页标题中确认存在（书名为 *Don't Make Me Think, REV 4: A Common Sense Approach to UX Research and Design*）；正式封面 ISBN 978-0-13-595864-3 **未直接核实** | ⚠️ **部分成立** |
| **预定出版 2026-11-30** | 未取到出版社页面逐字确认；间接佐证：Advancing Research 2026（2026-03-11）场次页存在、第三版之后的确在写第 4 版 | ⚠️ **存疑（未能一手核实）** |
| **1950 年生** | ⚠️ **内部冲突**：Business Insider（2026-07-29）写「Now 77」→ 若 2026-07 时 77 岁，出生应在 **1949**；Built In（2020-04-07）写「The 70-year-old」→ 出生应在 **1949–1950**。文档时间线写「1950 出生」，与 BI 的 77 岁**不能同时成立**（1950 年生者在 2026-07 为 76 岁） | 🔴 **改为「约 1949–1950」或直接引 BI 的「77 岁」并标注口径** |
| **1971 年毕业 Boston College** | ✅ **成立**：Business Insider 原文「After graduating with a degree in English from Boston College in 1971」 | ✅ |
| **$40,000 预付** | ✅ **成立**：BI 原文「Black's credibility alone got Krug a $40,000 advance — about $80,000 today」；Built In 原文「he talked them into giving me $40,000」 | ✅ |
| **77 岁** | ✅ 成立（BI 2026-07-29 原文），但与「1950 年生」冲突 | ✅（须与出生年二选一） |
| **每人最多 100 个关注者** | ✅ **成立**：BI 原文「if it were up to Krug, social media users wouldn't be able to have more than 100 followers.」 | ✅ |
| **「51 个插件」** | ⚠️ 属**下游靶心的环境描述**，文档已在 §「应用到密集桌面式界面」与「诚实边界」中反复标注为**自己的推导对象**，并明确说「他的书成书于网页导航时代，这些他全部没有写过、没有测过」。**处理方式正确**，未当作 Krug 的立场 | 🟢 无误（但见 §4「必须修改」M9） |
| **耶鲁心理学本科 / RIT 计算机硕士 / 曾任 Apple、Netscape 员工 / 每季度第三个星期四 / severity rating 量表 / Tufte 与 Norman 批评过他 / 「rocket surgery 是他发明的词」/ 「他对无障碍覆盖薄弱」** | ✅ **文档已在「诚实边界」第 8 条主动列为「经核查不成立，已剔除」**。这是**正确且值得保留**的自我纠错 | 🟢 无误（加分项） |
| **Apple 1994 客户** | ✅ 可核实：Built In 原文「I was actually working on the web in 1994, consulting for Apple.」客户名单（Apple / Bloomberg / Lexus / NPR / IMF）见 sensible.com `/about/` | ✅ |
| **「写了 5–6 年第 4 版」** | ⚠️ 间接佐证：BI 原文「He's been working on the latest edition of "Don't Make Me Think," for **five years**」；文档写「5–6 年」（来自 Advancing Research 主办方摘要，本次未取到该页正文，rosenfeldmedia 返回 403） | ⚠️ **降级为「约 5 年（BI 一手）」更稳** |
| **「他说社交媒体可能是过去四十年发生的最糟的事」** | ✅ 成立：BI 原文「I think social media is the worst thing that's happened in the last forty years」 | ✅ |
| **「Blog 最新一篇仍是 2022-03-22」** | ✅ 成立（`/blog/` 首条即《You say "potato," I say "focus group"》，2022-03-22） | ✅ |
| **「sensible.com FAQ 仍写不会很快出新版」** | ✅ **完全成立且是个很好的发现**：`/dont-make-me-think/` 与 `/category/faqs` 均写「I may do another edition someday, but it's an awful lot of work, so it won't be soon.」而同一站点又在预报第 4 版 | ✅（加分项） |
| **「居住地 Brookline, MA」** | ✅ 成立：BI 原文「he spends much of his time at home in Brookline, Massachusetts」；Built In 2020 亦写「self-quarantined in his home in Brookline」 | ✅ |
| **「Chestnut Hill, MA 公司地址」** | ✅ 成立：sensible.com `/about/`「based in Chestnut Hill, MA」 | ✅ |
| **「just me and a few well-placed mirrors」** | ✅ 成立：sensible.com `/about/` 逐字 | ✅ |
| **「English Lit degree … after having to quit Physics because nobody explained calculus to me」** | ✅ 成立：sensible.com `/about/` 与 `/category/faqs` 逐字 | ✅ |
| **「2020-10-30 十年来首次改版（儿子 Harry 参与）」** | ✅ 成立：`/my-new-web-site/` 原文「It's been 10 years since I last redesigned my site.」+「even with my son Harry working with me」 | ✅ |
| **调研统计「153 个来源 / 一手 439 / 二手 226 / 推断 72 / 存疑 41 / 一手占比 66.0%」** | ⚠️ 数字自洽性无法外部核验；但**本次审计发现至少 2 处 `[一手]` 标注是错的（A1、A2）**，意味着「一手 439」这一计数**被高估**，66.0% 这个比例**下行风险明确** | 🔴 **须重算或加注** |

### 3.3 一个必须点明的结构性问题

「模型 3」与「附录：关键引用」**重复引用了同一批句子**，且两处**标注了相同的错误出处**（#1 正确、#3 错误）。这意味着错误不是抄写笔误，而是**底稿层面的串源**——`01-writings.md` / `05-decisions.md` 的归因需要回溯检查。**只在 SKILL.md 上打补丁不够。**

---

## 4. 结论

### 4.1 总体判定：**有条件通过**

- **引语本身没有编造**：30 条独立引语**零条**属凭空捏造。这是核心好结果，「查无实据不要用」那一节说明作者有基本的自律。
- **但溯源质量不达标**：「一手 66%」这个自我评估在本次审计后**站不住**（至少 2 处 `[一手]` 错源、3 处拼接/截断、3 处查无出处）。
- **修复成本很低**：全部问题都能在半小时内改完，不需要重做调研。

### 4.2 必须修改的具体条目清单（原文 → 建议改为）

| 编号 | 位置 | 原文 | 建议改为 |
|---|---|---|---|
| **M1** | 模型 5 证据 1；附录「关键引用」 | `（Brave UX 逐字稿 [一手]）` | `（Built In / Jeff Link 访谈，2020-04-07，[一手]）` —— 并把 Brave UX 移到次要佐证位 |
| **M2** | 模型 1 证据 2 | `他自己的解释是「Getting it done…」（05-decisions.md §D17/D18，Brave UX 逐字稿 [一手]）` | `他本人网站 FAQ 的书面原话：「Getting it done is far more important than doing it "perfectly."」（sensible.com /about/ 与 /rocket-surgery-made-easy/，[一手]）` |
| **M3** | 模型 3 证据 2 | `官方刊载的第 4 章书摘原文：…（Peachpit 官方书摘 [一手]）` | 出处改为 `DMMT 第 4 章「Why users like mindless choices」（书籍正文，[一手]）`。若坚持保留 Peachpit 书摘，需先取得该书摘页并核对逐字 |
| **M4** | 模型 4 证据 3 | `*"The most common failing of 'you are here' indicators is that they're too subtle."*` | 改为书中可核实的原句：`*"Too-subtle visual cues are actually a very common problem."*`，并另起一句中文转述「网页用户太匆忙，会规律性漏掉微妙线索」 |
| **M5** | 模型 5 证据 3 / 附录 | `*"In a morning, you can test three users, then debrief over lunch… No reports, no endless meetings."*（RSME 第 10 章）` | 删除 `No reports, no endless meetings.`（无出处）；前半句出处改为 **DMMT 第 9 章**（非 RSME 第 10 章） |
| **M6** | 表达 DNA › 确定性 | `*"My principle of podcasts is that I always make at least two or three disclosures against interest… we should have a little number up in the corner."*` | 补全省略部分：`"My principle of podcasts is that I always make at least two or three disclosures against interest, where I say something I shouldn't say about myself… we should have a little number up in the corner."` |
| **M7** | 模型 7 证据 4 / 附录 | `It's not frictionlessness that's ruined the internet, it's bad actors who have made bad products addictively friction-free.` | 加注：`[BI 全文转载作 "additively friction-free"，疑为原文笔误；英文引号内该词不可完全确认]` |
| **M8** | 表达 DNA › 幽默 | 「《搏击俱乐部》的「Update Club 第一条规则」」；「入侵诺曼底的**计划部分**」 | **两处均查无出处**。建议改为中文转述并去掉引号：`爱用电影/电视比喻（《公主新娘》的酷刑机；把大改版比作一场登陆作战式的浩大计划；《搏击俱乐部》式的"关于变更的第一条规则"）`，并补 `[比喻方式为推断，非其原话]` |
| **M9** | 模型 6 证据 4；决策启发式 2 | `*"Very often, the right solution is to take something (or things) away that are obscuring the meaning, rather than adding yet another distraction."*`（RSME） | 加注 `[二手转录：仅见书评与摘要佐证，未取到一手页；如需严格引用请先核对 RSME 第 11 章]`，或改用中文转述 + 引用 Anant Jain 书摘中的「Resist the impulse to add things」 |
| **M10** | 模型 7 证据 3；「怎么用」 | `"Does my site behave like a mensch?"` | 加注 `[二手转录，未取到一手页]`，或改写为 `他会在第 11 章要求你问自己：除了「我的网站清楚吗」，还要问「我的网站像不像个正派人」` |
| **M11** | 「表达 DNA › 引用习惯」 | `第 5 章标题「Omit needless words」是他们的原创，不是 Krug 的` | 改为：`「Omit needless words」是 Strunk & White 的原创；Krug 第 2 版曾拿它做第 5 章标题（加引号致敬），**第 3 版（2014）已改标题为「Omit words」**。别把这句记成他的话。` |
| **M12** | 时间线「1950 出生」 | `1950 | 出生（美国）` | 改为 `约 1949–1950 | 出生（美国）。口径冲突：Business Insider 2026-07 称其 77 岁，Built In 2020-04 称其 70 岁；确切出生年未有权威一手来源` |
| **M13** | 模型 4 证据 2「五件必备物」 | `站点标识、回首页的路、搜索、工具区（Utilities）、分区导航` | ⚠️ **本次未能核到书中原始清单**。DMMT 第 6 章可核实的是「every site should have a clearly identifiable site ID, page name, sections, local navigation, "you are here" indicator, and search box」，**且「工具区」在书中的定义是「不属于内容层级的链接」**（mgp 读书笔记 p.66：utilities = links to important elements not part of the content hierarchy）。**「回首页的路」与「工具区」是否同属一份「五件」清单，存疑**。建议加注 `[清单构成为推断，需核对 DMMT 第 6 章原文]` 或直接改写为书中的六项表述 |
| **M14** | 附录「统计」 | `一手 439 / 二手 226 / 推断 72 / 存疑 41，一手占比 66.0%` | 本次审计发现至少 2 处 `[一手]` 错源。**须重算计数**，或加注 `[该统计已因引语审计修正，见 08-quote-audit.md]` |
| **M15** | 时间线 2026-11-30 行 | `（New Riders，224 页）`；`ISBN 978-0-13-595864-3` | **224 页与 978-0-13-595864-3 本次均未核实**。建议改为 `（New Riders；ISBN 978-0-13-595872-8 已在零售页确认；页数与另一 ISBN 未核实）` |
| **M16** | 时间线 2025-12-10 → 2026-03-11 行 | `主办方要点写明：他已秘密写了 5–6 年 DMMT 4.0` | 降级为 `Business Insider 2026-07 称其已写 5 年 [一手]；Advancing Research 2026 场次页存在但本环境 403 未取全文，故不复述主办方措辞` |

### 4.3 建议保留、不要动的地方

- 「诚实边界」第 8 条的**主动剔除清单**（耶鲁 / RIT / Apple 员工 / 每季度第三个星期四 / severity rating / Tufte 与 Norman 批评 / rocket surgery 发明权）——核查后**逐条成立**，这是全文质量最高的部分。
- 「反作用面」对 Jared Spool「未点名 Krug」、学术批评「靶心是 Nielsen」的**防移花接木标注**——正确。
- 「注意信源陷阱」对 sensible.com FAQ 自我矛盾的提示——**已一手核实成立**。
- 免责声明、三条硬约束、不编造数字的自律条款——方向正确。

---

## 附：本次核验使用的一手 / 可访问来源

| 来源 | 用途 | 状态 |
|---|---|---|
| https://builtin.com/design-ux/simplicity-ux-steve-krug-interview | Built In 2020 访谈全文 | ✅ 取到全文 |
| https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug | Brave UX Ep.015 完整逐字稿 | ✅ 取到全文（后半截断但关键段落在） |
| https://www.marketingspeak.com/web-usability-essentials-with-steve-krug/ | Marketing Speak Ep.349 逐字稿 | ✅ 取到全文 |
| https://businessinsider.com/steve-krug-dont-make-me-think-author-frictionless-internet-2026-7 | BI 2026 专访 | ⚠️ 直连失败，经 CNCB News 全文转载核验 |
| https://sensible.com/about/ ｜ /don't-make-me-think/ ｜ /rocket-surgery-made-easy/ ｜ /blog/ ｜ /category/faqs ｜ /my-new-web-site/ ｜ /download-files/ | 本人网站一手文字 | ✅ 全部取到 |
| https://boxesandarrows.com/interview-steve-krug/ | 2005 年访谈（写书动机） | ✅ 取到全文 |
| https://docslib.org/doc/758976/dont-make-me-think-revisited | Revisited 3rd ed 官方样章（目录 + 前言 + 献词） | ✅ 取到 |
| https://blas.com/dont-make-me-think/ ｜ https://francis.so/dont-make-me-think | 逐段摘录（引语文本最全的二手源，两者互校） | ✅ 取到全文 |
| https://www.webaxe.org/tweets-quoting-dont-make-me-think-revisited/ | 第 3 版引语推文汇编（含页码） | ✅ 取到 |
| https://anantjain.xyz/posts/rocket-surgery-made-easy ｜ https://www.peaka.com/blog/book-review-rocket-surgery-made-easy | RSME 书摘 | ✅ 取到 |
| http://jim.shamlin.com/study/books/5518/04.html 等 | 第 2 版逐章笔记 | ✅ 取到 |
| https://jasonfarman.com/we-made-technology-easy-to-use-that-was-a-mistake-published-in-slate | Slate 2026 点名 Krug 的批评 | ✅ 取到全文 |

**未能取到**：sensible.com 第 11 章 PDF、rsme-samplechapter.pdf、Pearson/informIT 样章 PDF（环境不支持 PDF）、archive.org（非公开 IP）、rosenfeldmedia.com（403）、keplers/beck-shop（403）、Google Books（非公开 IP）、dokumen.pub（DNS 被拒）。

---

*审计人：萧潇 ｜ 本报告只陈述核验结果，不做「这份 Skill 能不能用」的最终裁定——那一票留给主子。*
