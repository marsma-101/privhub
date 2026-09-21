# Steve Krug（史蒂夫·克鲁格）· 维度一：著作与系统性长文

> 女娲·Skill造人术 Phase 1 · 调研 Agent 1 · 维度「著作与系统性长文」
> 撰写语言：中文；凡涉及他的核心表述，一律保留英文原话。
> 黑名单已遵守：全篇未使用知乎、微信公众号、百度百科/百度知道。

---

## 0. 调研方法与信源分级说明

**分级标准**

| 标签 | 含义 |
|---|---|
| `[一手]` | Krug 本人撰写/署名，或本人受访原话（含 podcast 逐字稿），或出版社官方书摘、出版社官方书目页 |
| `[二手]` | 他人总结、读书笔记、书评、零售商转载的出版社书目数据（ONIX）、世界书目（WorldCat）目录字段 |
| `[推断]` | 本调研基于证据所做的推论，Krug 本人未如此表述 |
| `[存疑]` | 来源单一或来源本身有误，未能交叉验证 |
| `[冲突]` | 不同来源说法互相矛盾，**保留矛盾，不做调和** |

**本次实际抓取成功的来源（共 36 个）**

- 一手（16）：sensible.com 首页 / Don't Make Me Think 页 / Rocket Surgery Made Easy 页 / All the FAQ lists 页 / Downloads 页 / About 页 / Blog 索引 / You say "potato" 博文 / Contact 页 / How to get a job in UX 博文 / FAQs 分类页；Built In 专访（Jeff Link, 2020-04-07）；Brave UX Podcast 逐字稿（Brendan Jarvis, 2021-03-23）；Peachpit 官方书摘（第 4 章）；Peachpit 书目页；InformIT 书目页。
- 一手（间接获取，1）：官方测试脚本 test-script-web.pdf 的两句原话（经搜索索引取回）。
- 二手（19）：francis.so 读书笔记（含目录与成段引文）；blas.com/The Rabbit Hole 读书摘要（含 40+ 条成段引文）；mgp/book-notes 的 DMMT 与 RSME 两册笔记；books.verg.es 的 RSME 思维导图；anantjain.xyz RSME 笔记；Coding Horror《Happy Talk Must Die》（Jeff Atwood，含成段引文）；dokumen.pub RSME 目录片段（4 次检索累加）；WebDevStudents 教学讨论题（含逐章目录）；Pearson 澳洲站样章 PDF 的检索片段；WorldCat 两条书目记录片段（2 次检索累加）；O'Reilly 在线书库章节页片段；Pearson 美国站 rev 4 书目页；Amazon RSME 商品页；beck-shop.de rev 4 书目页（目录区被截断）；backstory.london RSME 商品页；knihydobrovsky.cz RSME 商品页；faculty.washington.edu 课程资料目录（发现 RSME 第 7、8 章 accessible PDF 镜像）；YouTube 官方演示测试视频页面。
- 失败或受限：O'Reilly 章节正文页（403）；Archive.org 全文（连接失败）；Amazon 正文（截断）；kriso.ee / caprichosbooks / ecampus（两处）/ pdfcoffee / sweetstudy / keplers / dokumen.pub 正文页（403 或连接失败）；WorldCat 直连（DNS 解析到非公网地址）；r.jina.ai 文本代理（网络失败）；sensible.com 的全部 PDF 与 .doc 下载（工具不支持 application/pdf 与 application/msword）。

**一手占比**：本文件中带 `[一手]` / `[一手/间接获取]` 标签的论断约占全部论断的 **约 55%**；另有约 25% 为「二手来源中成段引用的原文」——这类引文本身是 Krug 的文字，但**经过第三方转录**，本文件对其一律标注 `[二手]` 并注明「引文转自」，以便下游按需降权。

---

## 1. 三本书概况与目录结构

### 1.1 出版事实（按官方书目页）

| 项 | Don't Make Me Think, Revisited | Rocket Surgery Made Easy | Don't Make Me Think, rev 4 |
|---|---|---|---|
| 出版方 | New Riders（Voices That Matter 系列） | New Riders（Voices That Matter 系列） | New Riders（Voices That Matter 系列） |
| 版本/年份 | 3rd edition，Peachpit 页记 Published Dec 24, 2013；书页记 2014 | InformIT/Peachpit 记 Published Dec 8, 2009；sensible.com 标 2010 | 预告，出版日 2026-11-30 |
| ISBN-13 | 978-0-321-96551-6（ISBN-10 0-321-96551-5） | 978-0-321-65729-9（ISBN-10 0-321-65729-2） | 978-0-13-595872-8 |
| 页数 | sensible.com 记 212 页；Peachpit 记 216 页 `[冲突]` | 168 页 | 未公布 |
| 副标题 | *A Common Sense Approach to Web (and Mobile) Usability*（sensible.com 书页写法） | *The Do-It-Yourself Guide to Finding and Fixing Usability Problems* | *A Common Sense Approach to UX Research and Design* |
| 来源 | https://sensible.com/dont-make-me-think/ ；https://www.peachpit.com/store/dont-make-me-think-revisited-a-common-sense-approach-to-web-9780321965516 | https://sensible.com/rocket-surgery-made-easy/ ；https://www.informit.com/store/rocket-surgery-made-easy-the-do-it-yourself-guide-to-9780321657299 | https://www.pearson.com/en-us/subject-catalog/p/dont-make-me-think-rev-4-a-common-sense-approach-to-user-experience-design/P200000016545/9780135958728 |

**三版销量与语言数的自相矛盾 `[冲突]`（均出自他自己，全部保留）**

- sensible.com 首页与 DMMT 书页：「over **700,000** copies sold in **15** languages」（https://sensible.com/ ；https://sensible.com/dont-make-me-think/ ）`[一手]`
- sensible.com About 页：「now in its third edition with over **600,000** copies in print」（https://sensible.com/about/ ）`[一手]`
- Brave UX Podcast 主持人开场白：「over 600,000 copies in **20** languages」（https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug ）`[一手]`

### 1.2 各书解决什么问题、面向谁（他自己说的 `[一手]`）

**《Don't Make Me Think》**

- 写作动机（原文）：
  > "After years as a usability consultant helping my clients make their products easier to use, I knew that what I did was valuable. But I also knew that some of it **wasn't really very hard to do.** I figured that if I could explain how I did it more people could do it, and the products we all use would become less frustrating."
  > —— https://sensible.com/dont-make-me-think/ `[一手]`
- 为什么畅销（他自己的归因）：短（几小时可读完）、插图多、几乎每页一个洞见、适合入门、不像技术书。
- 读者对象（原文列举）："Developers, designers (visual, interaction, and UI), product managers, Agile team leaders, writers, editors, marketers, and CEOs." 加上 "Anyone with 'UX' in their job title, people considering a UX career, and students learning about design." 结论句："**anyone involved in creating digital products** will probably be glad they read it."

**《Rocket Surgery Made Easy》**

- 定位（原文）：
  > "It's a **how-to book** for **doing your own usability tests**. In 168 pages, it explains everything you need to know to conduct tests."
  > —— https://sensible.com/rocket-surgery-made-easy/ `[一手]`
- 两书分工（他自己在 FAQ 里划的界限，原文）：
  > "*Don't Make Me Think* is a book about how to **think about** usability. It's an introduction to usability/UX/user-centered design principles.
  > *Rocket Surgery* is about how to **do** usability. It's a how-to book that shows you how to do your own simple, fast, effective usability tests."
  > —— https://sensible.com/rocket-surgery-made-easy/ `[一手]`
- 写作缘由（原文）：
  > "But even though almost everyone now understands that improved user experience (UX) can increase sales (thanks, Steve Jobs!), **usability testing still doesn't happen often enough**."
  > "That's easy: They think usability testing requires a lot of **time, effort, and expertise**. But they're wrong."
- 读者对象：从没做过可用性测试想开始的人；想用非正式测试改进自己作品的开发与设计；想做更轻量测试的 UX 从业者；想让团队多做测试的产品经理。

**《Don't Make Me Think, rev 4》**

- 仅有的可靠信息来自 Pearson 书目页与零售转载：全新副标题改为 *A Common Sense Approach to UX Research and Design*，第 4 版，New Riders，出版日 2026-11-30。`[二手]`
- 新增章节（Quant vs. Qual / UX say hello to AI / Doing the right thing）来自本次调研任务书所给信息与零售页标题，**本次调研未能抓到出版商对该书目录的官方列表**，故一律标 `[二手]`/`[存疑]`，不作为心智模型提炼的硬证据。
- 他自己的表态（时间点更早）`[一手]`，与「即将出版 rev 4」形成 **`[冲突]`**：
  > "Ouch! Sorry. I'm afraid there are few things more likely to make an author crazy than the prospect of updating a book. … So I guess the answer is 'We'll see.' (And of course, the first rule of Update Club is that you never announce that an update is coming, for the purely selfish reason that while you're killing yourself working on it, nobody is buying the soon-to-be-outdated current edition.)"
  > —— https://sensible.com/ `[一手]`
  注：该 FAQ 与首页「the 4th edition is finally coming!!」同时存在，说明前者是旧文本未撤下。矛盾保留。

### 1.3 《Don't Make Me Think, Revisited》(3rd ed.) 完整目录

来源：francis.so 读书笔记转录的官方目录（https://francis.so/dont-make-me-think ）`[二手]`；与 Pearson 样章 PDF 检索片段、Peachpit/InformIT 书目页片段、WebDevStudents 教案逐章列表三方交叉一致 `[二手]`。

```
INTRODUCTION  Read me first — Throat clearing and disclaimers

GUIDING PRINCIPLES
  CHAPTER 1  Don't make me think! — Krug's First Law of Usability            (p.10)
  CHAPTER 2  How we really use the Web — Scanning, satisficing, and muddling through (p.20)
  CHAPTER 3  Billboard Design 101 — Designing for scanning, not reading
  CHAPTER 4  Animal, Vegetable, or Mineral? — Why users like mindless choices
  CHAPTER 5  Omit needless words — The art of not writing for the Web        (p.48)

THINGS YOU NEED TO GET RIGHT
  CHAPTER 6  Street signs and Breadcrumbs — Designing navigation             (p.54)
  CHAPTER 7  The Big Bang Theory of Web Design — The importance of getting people off on the right foot (p.84)

MAKING SURE YOU GOT THEM RIGHT
  CHAPTER 8  "The Farmer and the Cowman Should Be Friends" — Why most arguments about usability are a waste of time, and how to avoid them
  CHAPTER 9  Usability testing on 10 cents a day — Keeping testing simple—so you do enough of it

LARGER CONCERNS AND OUTSIDE INFLUENCES
  CHAPTER 10 Mobile: It's not just a city in Alabama anymore — Welcome to the 21st Century. You may experience a slight sense of vertigo
  CHAPTER 11 Usability as common courtesy — Why your Web site should be a mensch
  CHAPTER 12 Accessibility and you — Just when you think you're done, a cat floats by with buttered toast strapped to its back
  CHAPTER 13 Guide for the perplexed — Making usability happen where you live
```

**版本差异（务必保留）**

- 第 5 章标题在部分电子版目录里被缩为「**Omit words**」（O'Reilly 电子版章节页、francis.so 转录），官方印刷目录与 Pearson 样章写「**Omit needless words**」。`[冲突]`
- 第 7 章在 **第 1 版（2000）** 里叫 "**The first step to recovery is admitting that the Home page is beyond your control**"，在 2/3 版改名为 "**The Big Bang Theory of Web Design**"。证据：mgp/book-notes 记录的是第 1 版章名（其 notes 覆盖 12 章、含第 11 章 "Accessibility, Cascading Style Sheets, and You"、第 12 章 "Help! My boss wants me to ___."），而 3 版目录为 13 章。`[二手]`
- 第 1 版共 12 章；3 版共 13 章（新增 Mobile 章并拆分 Accessibility）。`[二手]`
- 有一篇教学博客（St Andrews 数字通讯团队）写道「the book consists of 11 chapters」——与官方目录不符，属二手来源错误，仅记录不采用。`[二手/存疑]`

### 1.4 《Rocket Surgery Made Easy》目录

拼接自四个来源：WorldCat 499491845 的目录字段片段、dokumen.pub 的目录页片段、O'Reilly 在线书库章节页标题、verg.es 思维导图（逐章页码）。前两者为书目字段（近一手），后两者为二手。

**章名格式已确认**：RSME 每章标题为「**主短语: 描述句**」两段式（如 "Mind reading made easy: Conducting the test session"）。以下表内凡标 `[确认]` 的，至少有两个独立来源逐字一致；标 `[存疑]` 的仅有单一来源或来源措辞不一。

```
OPENING REMARKS  Call me Ishmael — How this book came to be, some disclaimers, and a bit of housekeeping (p.2)

FINDING USABILITY PROBLEMS
  CHAPTER 1  You don't see any elephants around here, do you?: What do-it-yourself usability testing is, why it always works, and why so little of it gets done (p.12–19)  [确认]
  CHAPTER 2  [主短语未知]: What a do-it-yourself test looks like (p.20)  [存疑]
             └ WorldCat 片段残留 "…saw my [lovely] assistant in half"，方括号为 WorldCat 自己的省略标记，不能确认是章名
  CHAPTER 3  A morning a month, that's all we ask: A plan you can actually follow (p.27 起)  [确认]
  CHAPTER 4  What do you test, and when do you test it?: Why the hardest part is starting early enough (p.30–37)  [确认]
  CHAPTER 5  Recruit loosely and grade on a curve: Who to test with and how to find them (p.38–49)  [确认]
  CHAPTER 6  [主短语未知]: Picking tasks and writing scenarios for them (p.50–55)  [存疑]
  CHAPTER 7  [主短语不清，但以 "…like me, you don't really like checklists" 收尾]: Why you should use boring checklists (p.56–61)  [存疑]
  CHAPTER 8  Mind reading made easy: Conducting the test session (p.62–89)  [确认]
  CHAPTER 9  [主短语可能为] Make it a spectator sport: Getting everyone to watch and telling them what to watch for (p.90–101)  [存疑]
  CHAPTER 10 Debriefing 101: Comparing notes and deciding what to fix (p.102–109)  [确认]
  CHAPTER 11 The least you can do™: [副题两说，见下] (p.110–119)  [冲突]
  CHAPTER 12 The usual suspects: Some problems you're likely to find, and how to fix them (p.120–127)  [部分确认]
  CHAPTER 13 [主短语未知]: Getting fixes to happen (p.128–132)  [存疑]
  CHAPTER 14 [主短语未知]: Remote testing (p.134–139)  [存疑]
  CHAPTER 15 [主短语未知]: Reading list for overachievers (p.140–143)  [存疑]
```

**第 11 章副标题的两说（保留冲突）** 🚩

- 世界书目（WorldCat 499491845）字段：「…you can do™ **The best ways to fix usability problems**」
- verg.es 思维导图（第 11 章逐页笔记）：「**Why doing less is often the best way to fix things**」
- 两者语义相近但措辞不同，且 WorldCat 片段前后被截断（"The least" 被吞掉）。**不调和。**

**章节编号与页码在各来源间完全一致**，可放心用于定位。

**重要细节**：第 11 章标题带 **™**（"The least you can do™"），说明这是他自己当作标识语用的短语，不只是章节名。来源：https://www.oreilly.com/library/view/rocket-surgery-made/9780321702821/ch11.html （检索片段）`[二手]`

**「Call me Ishmael」**：全书 Opening Remarks 的标题，典出《白鲸》。`[二手，来自 WorldCat 目录片段]`

---

## 2. 反复出现 ≥3 次的核心论点（真信念）

> 判定标准：在同一本书内多处出现，或跨「书 + 网站 + 访谈」出现 ≥3 次。

### ★ 论点 1：「Don't make me think」是可用性第一法则，且它的意思是「别让我想**不该想的事**」

**出现次数**：≥5（DMMT 第 1 章；DMMT 全书书名与首尾呼应；Built In 专访；sensible.com 首页；第 3 版 Introduction 引用 Norman）。

- 原话（他解释这句被误读的地方）`[一手]`：
  > "'Don't Make Me Think' really means don't make me think *about things I don't need to think about.* And pretty much everybody has understood that. I've seen a handful of people writing articles in the last couple of years expressing some skepticism regarding the premise, suggesting there are sites where you want to make people think. And I'm like: 'Right, of course. We all want that.'"
  > "You do want them to think about the meaning of your content. You want them to think about *what's in it for them.* … What you don't want them to think about is: 'What is that thing on the screen? What is it for? What's going to happen if I click that?'"
  > —— https://builtin.com/articles/simplicity-ux-steve-krug-interview `[一手]`
- 原话（书中定义）`[二手，引文转自]`：
  > "'Don't make me think!' For as long [as] I can remember, I've been telling people that this is my first law of usability. It's the overriding principle—the ultimate tie breaker when deciding whether a design works or it doesn't. The point is that every question mark adds to our cognitive workload, distracting our attention from the task at hand."
  > —— 转引自 https://blas.com/dont-make-me-think （引文属 DMMT 正文）
- 配套的次级规则 `[二手，引文转自]`：「**If you can't make something self-evident, you at least need to make it self-explanatory.**」（同上）

### ★ 论点 2：用户不阅读，只扫读（"We don't read pages. We scan them."）

**出现次数**：≥4（DMMT 第 2 章；第 3 章「Billboard Design 101」；第 9 章测试观察；访谈）。

- 原话 `[二手，引文转自，blas.com 转录]`：
  > "When we're creating sites, we act as though people are going to pore over each page, reading all of our carefully crafted text, figuring out how we've organized things, and weighing their options before deciding which link to click. What they actually do most of the time (if we're lucky) is glance at each new page, scan some of the text, and click on the first link that catches their interest or vaguely resembles the thing they're looking for. There are almost always large parts of the page that they don't even look at. We're thinking 'great literature' (or at least 'product brochure'), while the user's reality is much closer to 'billboard going by at 60 miles an hour.' **We don't read pages. We scan them. We don't figure out how things work. We muddle through.**"
- 由扫读推出的设计守则 `[二手，引文转自]`：「Design for scanning, not reading」——具体六条：Take advantage of conventions / Create effective visual hierarchies / Break pages up into clearly defined areas / Make it obvious what's clickable / Eliminate distractions / Format content to support scanning。

### ★ 论点 3：满意即可（satisficing），不挑最优

**出现次数**：≥3（DMMT 第 2 章标题与正文；第 4 章「mindless choices」；访谈中反复引用）。

- 原话 `[二手，引文转自]`：
  > "In reality, though, most of the time we don't choose the best option—we choose the first reasonable option, a strategy known as satisficing."
  > —— 转引自 https://francis.so/dont-make-me-think
- 概念来源：**本调研未能找到 Krug 本人把 satisficing 归功于 Herbert Simon 的原文**。学术上该词源出 Herbert A. Simon（1956）。→ 见 §8「信息不足」。

### ★ 论点 4：用户是「muddling through」，从不读说明书

**出现次数**：≥4（DMMT 第 2 章；第 1 章「self-explanatory」；第 5 章「instructions 没人读」；Built In）。

- 原话 `[一手，访谈]`：
  > "So I described it in the book as they're '**muddling through**,' which is one of my favorite phrases. I think it's the best description of how most people use things."
  > —— https://builtin.com/articles/simplicity-ux-steve-krug-interview
- 书中原话 `[二手，引文转自]`：
  > "Another major source of needless words is instructions. The main thing you need to know about instructions is that no one is going to read them—at least not until after repeated attempts at 'muddling through' have failed."

### ★ 论点 5：Krug 第二法则 ——「点几次不重要，重要的是每次点击都不费脑」

**出现次数**：≥3（DMMT 第 4 章；第 6 章导航推论；多篇二手转述）。

- **官方出版社书摘原文（最高可信度）** `[一手]`：
  > "*It doesn't matter how many times I have to click, as long as each click is a mindless, unambiguous choice.*
  > —KRUG'S SECOND LAW OF USABILITY"
  > "I think the rule of thumb might be something like '**three mindless, unambiguous clicks equal one click that requires thought**.'"
  > —— https://www.peachpit.com/articles/article.aspx?p=2170656 （Peachpit 官方刊载的第 4 章书摘）
- 附带论断：他明确反对「任何页面不能超过 N 次点击」的硬规则（原文：nobody should set a fixed number like three/four/five），主张真正决定体验的是「每次点击有多难」。

### ★ 论点 6：Krug 第三法则 ——「每页删掉一半文字，再删掉剩下的一半」

**出现次数**：≥3（DMMT 第 5 章标题句；happy talk 一节；instructions 一节）。

- 原话 `[二手，引文转自，blas.com + O'Reilly 章节页片段双证]`：
  > "**Get rid of half the words on each page, then get rid of half of what's left.** —KRUG'S THIRD LAW OF USABILITY"
- O'Reilly 第 5 章页面标题片段亦为「Omit words / THE ART OF NOT WRITING FOR THE WEB / Get rid of half the words on each page, then get rid of half of what's left…」（https://www.oreilly.com/library/view/dont-make-me/9780133597271/ch05.xhtml ，检索片段）`[二手]`
- 注意：**第一法则 = Don't make me think；第二法则 = 点击次数论；第三法则 = 删字论**。三者均被他自己明确编号。

### ★ 论点 7：导航是网站的命根子（"Navigation isn't just a feature of a Web site; it is the Web site"）

**出现次数**：≥3（DMMT 第 6 章；Trunk Test；第 7 章首页；RSME 第 12 章「getting off on the wrong foot」）。

- 原话 `[二手，引文转自]`：
  > "Navigation isn't just a feature of a Web site; it is the Web site, in the same way that the building, the shelves, and the cash registers are Sears. Without it, there's no there there."
- 为什么重要（原文）`[二手，引文转自]`：
  > "It gives us confidence in the people who built it. Every moment we're in a Web site, we're keeping a mental running tally: 'Do these guys know what they're doing?' … Clear, well-thought-out navigation is one of the best opportunities a site has to create a good impression."

### ★ 论点 8：测试要廉价、要常态化——「一个月一个上午，三个用户」

**出现次数**：≥6（DMMT 第 9 章；RSME 全书主线，第 3、5 章；sensible.com 两页 FAQ；Built In；Brave UX）。

- 原话 `[二手，引文转自，blas.com]`：
  > "I think every Web development team should spend one morning a month doing usability testing. In a morning, you can test three users, then debrief over lunch. That's it. When you leave the debriefing, the team will have decided what you're going to fix before the next round of testing, and you'll be done with testing for the month."
  > "If you're doing Agile development, you'll be doing testing more frequently, but the principles are still the same. For instance, you might be testing with two users every two weeks. **Creating a fixed schedule and sticking to it is what's important.**"
- 原话（为什么是 3 个人，本人访谈）`[一手]`：
  > "Jakob Nielsen and other people did studies years ago. Nielsen, in particular, came out with an article 20 years ago. It found that, after five people, you reached diminishing returns and started to see the same problems repeating, in most cases. **I reduced it to two or three people because, the fact is, you're far more likely to do it — and keep doing it — if you test two or three people.** My recommendation is that you test once a month with three people."
  > —— https://builtin.com/articles/simplicity-ux-steve-krug-interview
- 原话（为什么 3 个够，podcast）`[一手]`，见 §4.1。

### ★ 论点 9：「你无法替用户判断」——这是全书结论

**出现次数**：≥4（DMMT 第 8、9 章；RSME 第 1 章；Built In；Brave UX）。

- 原话 `[一手，访谈]`：
  > "As a designer or developer, you can't judge for yourself whether people are going to be able to use what you're creating. You know how it's supposed to work, which they don't. And so you can't self-edit… What you're more likely to say is, 'Well, everybody's going to understand that.' **That's the book's conclusion: You need to watch other people try to use your website.** And that's why I appreciate usability testing."
  > —— https://builtin.com/articles/simplicity-ux-steve-krug-interview

### ★ 论点 10：可用性是常识，不是火箭科学

**出现次数**：≥3（DMMT 的副标题 "A Common Sense Approach"；公司名 Advanced Common Sense；RSME 书名与服务标记；sensible.com 页脚）。

- 服务标记（原文，网站每一页页脚）`[一手]`：
  > ""Advanced Common Sense" and "It's not rocket surgery" are servicemarks of Steve Krug"
  > —— https://sensible.com/ （全站页脚）
- 他在访谈里用同一句式批评糟糕的疫苗预约系统 `[一手]`：
  > "This is not rocket surgery, that those systems should have been storing that information."
  > —— https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug

### ★ 论点 11：焦点小组 ≠ 可用性测试（他反复纠正的一件事）

**出现次数**：≥4（DMMT 第 9 章；RSME；2022 年专门写博文；FAQ）。

- 原话（2022 博文，45 秒电梯话术）`[一手]`：
  > "Usability tests are about watching people actually **_try to use_** what we're building, so we can detect and fix the parts that confuse or frustrate them. Focus groups are about having people **_talk about_** things… So the main difference is that in usability tests, you watch people actually use things, instead of just talk about them."
  > —— https://sensible.com/you-say-potato-i-say-focus-group/
- 书中原话 `[二手，引文转自]`：
  > "Repeat after me: Focus groups are not usability tests. … The kinds of things you learn from focus groups—like whether you're building the right product—are things you should know before you begin designing or building anything, so focus groups are best used in the planning stages of a project."

### ★ 论点 12：先修最严重的问题，修得越少越好

**出现次数**：≥4（DMMT 第 9 章；RSME 第 10、11 章；podcast；Built In 谈「过度重设计」）。

- 原话 `[一手，podcast]`：
  > "When fixing problems always do the least that you can do. … Cuz you've seen people get sucked into redesigns when yes, the redesign would be nice, but you're not gonna end up doing it. But on the other hand, there is a tweak you could make. There's a simple change that you could make that would make things a lot better, wouldn't fix them, wouldn't be perfect, but would [improve] the situation…"
  > —— https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug
- 原话（反对大重设计）`[一手]`：
  > "They tend to be overambitious. … people often think the solution is to do a major redesign instead of going in, doing triage and repairing the worst problems. The thinking is these issues can be tolerated until a redesign. Basically, they're saying, 'We're going to allow these major problems that are costing us money and causing headaches for users to persist for another year while we work on this redesign.'"
  > —— https://builtin.com/articles/simplicity-ux-steve-krug-interview

### ★ 论点 13：要让人**来看**测试，而不是听你讲道理

**出现次数**：≥4（DMMT 第 9 章；RSME 第 9、13 章；podcast；Built In）。

- 原话 `[一手，podcast]`：
  > "one thing you need to do is to get everybody to at least come to some—you'll make a certain number of converts, some unexpected, based on the fact that they've seen. My favorite recommendation was always, if you're starting out introducing it to the team, then **do a test of your competitors** because everybody's interested in their competitors. And also you're not gonna make anybody look bad in house…"
  > "Great snacks, I recommend spend as much money as you can on snacks and lunch and whatever and just make it easy."
- 书中原话 `[二手，引文转自 mgp/book-notes]`：「If you need buy-in from key stakeholders, ROI arguments are weak; make them observers in a live usability test.」（第 13 章）
- 书中原话 `[二手，引文转自 verg.es]`：「execs — ROI: often convincing, time-consuming, cannot compete with passion to do the right thing!」

---

## 3. 自创术语与概念（逐条：定义 + 出处）

| 术语 | 定义 | 出处 / 原话 | 级别 |
|---|---|---|---|
| **Don't Make Me Think** | 可用性第一法则；指不要迫使使用者思考「这是什么、能干什么、点了会怎样」这类本不该思考的事 | 书名；第 1 章；他本人在 Built In 释疑：「don't make me think *about things I don't need to think about*」 | `[一手]`（访谈原话） |
| **Krug's First Law of Usability** | 即「Don't make me think」 | 第 1 章标题即「Krug's First Law of Usability」 | `[一手]`（官方目录页） |
| **Krug's Second Law of Usability** | 「It doesn't matter how many times I have to click, as long as each click is a mindless, unambiguous choice.」 | Peachpit 官方书摘（第 4 章） | `[一手]` |
| **Krug's Third Law of Usability** | 「Get rid of half the words on each page, then get rid of half of what's left.」 | 第 5 章；blas.com / O'Reilly 双证 | `[二手，引文转自]` |
| **Satisficing**（满意即可） | 用户不选最优，选第一个「看起来还行」的选项 | 第 2 章：「we choose the first reasonable option, a strategy known as satisficing」 | `[二手，引文转自]` |
| **Muddling through**（糊弄着用） | 用户不搞懂原理，硬试硬撞，不读说明书 | 第 2 章；他自称「one of my favorite phrases」 | `[一手]`（访谈）+ `[二手]`（书中） |
| **The Big Bang Theory of Web Design** | 首页/首屏的最初几秒决定一切：若开头就建立起正确理解，后面全部受益；否则一切都被误读 | 第 7 章标题。原话：「the first few seconds you spend on a new Web site or Web page are critical」，并引用 50 毫秒首因印象实验 | `[二手，引文转自]` |
| **Happy talk**（废话寒暄） | 网站上的「欢迎来到本站」「我们很棒」式自我介绍文本，社交性但零信息量 | 第 5 章。原话：「if you're not sure whether something is happy talk, there's one sure-fire test: if you listen very closely while you're reading it, you can actually hear a tiny voice in the back of your head saying 'Blah blah blah blah blah…'」；「Happy talk is like small talk – content free… **You can – and should – eliminate as much happy talk as possible.**」 | `[二手，引文转自]`（Coding Horror 转录）。该短语本身已被业界当作他的术语使用 |
| **Reservoir of goodwill**（善意水库） | 用户进站时带着一罐「善意」，每个问题都在抽水；耗尽就离开，且可能永不回来 | 第 11 章。原话：「I've always found it useful to imagine that every time we enter a Web site, we start out with a reservoir of goodwill. Each problem we encounter on the site lowers the level of that reservoir」 | `[二手，引文转自]` |
| **Mensch**（正派人） | 网站该有的品格；「Does my site behave like a mensch?」——第 11 章副标题「Why your Web site should be a mensch」 | 第 11 章 | `[二手，引文转自]` + 官方目录 `[一手]` |
| **The Trunk Test**（行李箱测试） | 把页面当成「你被蒙眼塞进车后备箱、随便扔在某个网站某页」，看能否立刻答出：Site ID / Page Name / Sections（主导航）/ Local navigation / "You are here" 指示器 / Search。逐项找得出来，导航就算合格 | 第 6 章。二手教学材料复述其六项检查表：「Where is the Site Id? The Page Name? The Sections (Primary Navigation)? The local navigation? The 'You are here' navigators? The Search?」（https://webdevstudents.com/dont-make-me-think-discussion-questions ） | `[二手]`；**本次未抓到 Krug 逐字原文**，标 `[存疑]` |
| **"Get it" test** | 只给用户看首页，不接受任何导航，检查他能否说清这个站的价值主张 | DMMT 第 9 章；mgp 笔记：「'Get it' testing checks if the user understands the site's value proposition from the home page without further navigation.」 | `[二手]` |
| **Key task test** | 给用户一个任务让他做，观察步骤；并鼓励让他自己选择任务细节（"Find a book you want to buy, or a book you bought recently" 而非 "Find a cookbook for under $14"） | DMMT 第 9 章 | `[二手]` + `[二手，引文转自]` |
| **"Recruit loosely and grade on a curve"** | 招募测试者别苛刻，按「此人离目标用户有多远」打折校正结果即可 | RSME 第 5 章。原话（本人访谈）："One of the maxims I have in the book is '**recruit loosely and grade on a curve**'" | `[一手]`（访谈）+ `[二手]`（书中） |
| **Three most significant problems（观察者三问题法）** | 每位观察者对每位被试只写「他亲眼看到的三个最严重问题」，会后汇总勾选，按勾数排序 | RSME 第 9、10 章。见 §4.5 | `[一手]`（podcast 详细自述） |
| **"The least you can do"™** | 修问题时的第一问：「能阻止这个问题发生的最小、最简单的改动是什么？」 | RSME 第 11 章标题（带 ™） | `[二手]`（O'Reilly 章节页片段）+ `[一手]`（podcast 复述） |
| **Rocket surgery** | 「It's not rocket surgery」= rocket science + brain surgery 的混成，意为「没那么难」。**他自己的网站把它注册为 servicemark**，并用作书名 | 页脚 servicemark 声明 `[一手]`；混成来源解释本次**未找到 Krug 本人文字**，属通用词源 → `[推断]` | `[一手]` + `[推断]` |
| **FAQ 哲学** | 每页都放 FAQ，且只放真正的常见问题，不放「你希望别人问的问题」 | 原话：「I happen to think that making it easy to find the answers to frequently asked questions is a good thing—as long as they're really Frequently Asked Questions, and not QYWPWA's (Questions You Wish People Would Ask).」—— https://sensible.com/ | `[一手]` |
| **QYWPWA** | Questions You Wish People Would Ask（你希望别人问的问题）—— 贬义，指企业 FAQ 里那些自我宣传式的伪问题 | 同上；另见 https://sensible.com/all-the-faq-lists-from-my-site/ | `[一手]` |
| **Do-It-Yourself Usability Testing / discount usability testing** | 小规模、非正式、自己做、一个上午搞定的可用性测试 | RSME 全书；mgp 笔记记「Small, informal, do-it-yourself usability testing is also called discount usability testing.」（p.8） | `[二手]` |
| **The Big Honkin' Test**（对照概念） | 传统大手笔测试：租实验室、单向镜、5–10 人、一周写报告、每轮 5–15K 美元 | RSME 第 3 章的对照表；verg.es 转录 | `[二手]` |
| **"Rules of thumb"** | 他偏好给启发式规则而非规范 | 例：三法则、三下无脑点击 = 一下费脑点击 | `[二手，引文转自]` |
| **"Things a therapist would say"** | 他给主持人准备的「中立话术清单」（网站上可下载） | https://sensible.com/download-files/ | `[一手]` |
| **"Hall Monitor's Guide"** | 观察室看门人职责说明（网站上可下载） | 同上 | `[一手]` |
| **"No-brainer test"** | 任务书里提到的一个说法 | **本次调研未找到任何 Krug 原文或二手来源使用该术语** → 见 §8 | `[存疑]` |
| **"Kayak problems"** | 用户一度迷路但立刻自己纠正的问题——分诊时直接忽略 | DMMT 第 9 章；mgp 笔记 p.157 | `[二手]` |
| **"Failure to shout"** | 网站把重要信息用过于含蓄的视觉手法表达；印刷里成立的微妙差别在网页上失效 | RSME 第 12 章的三个常见问题之一 | `[二手]` |
| **"Kitchen sink syndrome"** | 首页被各利益方塞满所有东西 | RSME 第 12 章 | `[二手]` |

---

## 4. 《Rocket Surgery Made Easy》完整方法论

> 本章信息密度最高。凡 podcast 里他自述流程的段落，标 `[一手]`；书中流程细节来自 verg.es 的逐页思维导图、mgp/book-notes、anantjain.xyz 三份二手笔记，三者互相一致时可信度较高，但仍标 `[二手]`。

### 4.1 为什么 3 个用户就够——他的论证逻辑

**四层论证，全部出自他本人**：

1. **学理层**`[一手]`：「Jakob Nielsen and other people did studies years ago… after five people, you reached diminishing returns and started to see the same problems repeating, in most cases. **I reduced it to two or three people**…」
2. **行为层（最关键）**`[一手]`：「because, the fact is, **you're far more likely to do it — and keep doing it — if you test two or three people**.」
3. **机制层**`[一手，podcast]`：「That was part of the notion of rocket surgery was test once a month with three users because **it's such a low bar for recruiting and the effort required to produce the tests that you'll keep doing it**. Cuz the trick is, the problem is you won't keep doing it, that's the problem. The problem is there's a tendency to have enthusiasm for it at first and then it gradually drifts off.」
4. **反驳统计质疑（他自设的问题）**`[一手，podcast]`：
   > "one of them was basically 'you're only testing three people, so it's not statistically significant.' And my answer was… '**yep, absolutely. We're testing three, no statistical—no point in even gathering statistics. But the fact is people have been doing this for years and it works.** It gets you the insights that you need.'"
5. **书中论证（二手）**：RSME 第 5 章「You need three participants; any more yields diminishing returns, increases tedium, and surfaces more nits that make triaging difficult.」（mgp 笔记 p.43）；第 1 章「all sites have problems / the most serious problems tend to be easy to find / watching users makes you a better designer」（verg.es）。

**数字上的自相矛盾（保留）**：DMMT 第 1 版第 9 章写「test with three or four users each round」；RSME 定案为 **3**；访谈里说「two or three」。三处数字不同。`[冲突]`

**与 Nielsen 的关系**：Built In 访谈里他明确把 5 人论归功于 Nielsen，并说「I reduced it to two or three people」——**他的 3 人是主动下调，不是对 Nielsen 的误读**。`[一手]`

### 4.2 「一个月一个上午」的具体做法

- **节奏**`[一手，本人 FAQ]`：一个月一个上午，测 3 人，午饭时复盘（debrief），散会前定下「下轮之前修什么」，本月测试结束。
- **「第三个星期四」**：`[存疑]`。唯一来源是 Anant Jain 的读书笔记：「Reserve one morning a month (**say the third Thursday every month**) for a round of testing, debriefing, and deciding what to fix.」（https://anantjain.xyz/posts/rocket-surgery-made-easy ）——**这是二手转述，本次未在 Krug 原文或访谈中核实到 "third Thursday"**。任务书里的「每个季度第三个星期四」在本次调研中**无任何来源支持**，疑为记忆偏差；他的原意是**每月**（a morning a month），不是每季度。
- **为什么要连着做**`[二手，mgp 笔记 p.28]`：「Do all the tests back-to-back in a half day so the debrief can be conducted with details still fresh in everyone's mind.」
- **为什么短**`[二手，mgp 笔记 p.24]`：「the shortness simplifies recruiting, while the recurrence eliminates having to decide when to test as you just test whatever you have.」

**DIY 测试 vs「The Big Honkin' Test」对照表**（RSME 第 3 章，verg.es 转录 `[二手]`，与官方章节主题一致）

| 维度 | The Big Honkin' Test | Do-It-Yourself Testing |
|---|---|---|
| 每轮时间 | 1–2 天测试 + 1 周准备简报 + 定夺修什么 | 一个上午：测试 + 复盘 + 定夺 |
| 何时测 | 网站接近完成时 | 开发全程持续 |
| 轮次 | 1–2 轮（受时间金钱限制） | 每月一轮 |
| 参与人数 | 5–10 | 3 |
| 找谁 | 精心招募、贴近目标用户 | Recruit loosely |
| 在哪 | 租场地 + 单向镜 | 就在公司，用屏幕共享 |
| 谁来看 | 没多少人能脱产 2–3 天 | 来的人多得多 |
| 报告 | 专人花至少一周写报告 | 1–2 页邮件总结复盘结论 |
| 谁判定问题 | 跑测试的人分析并给建议 | 全体开发团队 + 相关利益方一起对笔记 |
| 首要产出 | 一份分类排序的、很长的问题清单 | 一份很短的、最严重问题清单 |
| 录人脸？ | 要，观察者需要看反应 | 不要，有声就够了 |
| 成本 | 每轮 $5–15K | 每轮 $500 |

### 4.3 测什么、何时测（第 4 章）

- **核心悖论** `[二手，mgp 笔记 p.32]`：「The worse shape something is in, the less you want to show it, but the more you can benefit if you do.」
- **测早期素材**：napkin sketch（问「你觉得这是什么？」，**只要描述，不要意见**）→ wireframes → page comps → 可运行原型。
- **测别人的网站** `[二手，mgp 笔记 p.33]`：「Usability test on other sites with the same kind of content or features you'll implement, and then learn from their mistakes.」——这也是他向团队推销测试的「钓鱼」话术（同 §2 论点 13）。
- **测现有网站**：重设计前的第一步。

### 4.4 测试脚本、任务设计与主持人的行为

**一个一小时测试的七段结构** `[二手，verg.es + anantjain.xyz 两处一致]`

| 段 | 时长 | 内容 |
|---|---|---|
| Welcome | 4 min | 照脚本念（**禁止即兴**）；要有眼神接触；不单调、不唱歌式、不赶、不含糊 |
| The questions | 2 min | 问几个关于他自己的问题——目的是让他开口、让他知道你在听、以及让你能「grade on a curve」 |
| Home page tour | 3 min | 让他自己描述首页是什么（**要描述，不要意见**） |
| The tasks | 35 min | 逐条给场景、念出来、让他做、think aloud |
| Probing | 5 min | 任务全部结束后再问「为什么」；追问他刚才提过的建议 |
| Wrapping up | 5 min | 问他有没有问题、付款、致谢「thanks, that was exactly what we needed」 |
| Prepare for next test | 10 min | 关录制、存文件、清缓存/history/visited links、恢复中性浏览器页、记几条笔记 |

**主持人的两个角色** `[二手]`：**tour guide**（带着走、让他保持愉快）+ **therapist**（让他把脑子里的东西说出来）。

**「话疗」话术（他给的清单）** `[二手，verg.es + 网站可下载清单]`：

- What are you thinking?
- What are you looking at?
- What are you doing now?
- Is that what you expected to happen?
- What would you do if I wasn't here?
- Was there something in particular that made you think that?

**主持人的纪律（他反复强调的「怎么闭嘴」）** `[二手 + 一手访谈]`

- 保持中立：**忍住不帮、忍住不答、不赞同他的意见、也不表达自己的意见**；扑克脸。
- think aloud 只在**不确定他在想什么**时打断，不要定时打断，不要在他阅读或推进时打断（mgp 笔记 p.82）。
- 任务途中只问**小澄清**；实质性「为什么」留到最后 5 分钟（mgp 笔记 p.78）。
- 他崩溃/任务拖太久/你学不到新东西 → 立刻进下一个任务，并给他台阶：「That's great. Very helpful. I want to move us along, since we've got more to do.」
- 「你可以坚持、可以有点狠」`[二手，mgp 笔记 p.86]`：「you're paying the participant for their time, and if you don't get what you need, you're wasting everyone's time.」
- **被试不是设计师**`[二手，mgp 笔记 p.79]`：「Users aren't designers, and they usually don't always know what they need, or even what they really want.」→ 对「加个新功能吧」这类建议要打折。
- **伦理责任**`[二手，verg.es]`：参与者离开房间时的状态不能比进来时更差；他有权随时中止并离场**而且照样拿钱**；保护隐私。

**官方测试脚本的片段（来自搜索引擎对官方 PDF 的索引，非直读）** 🚩

`web_fetch` 不支持 `application/pdf`，因此 `https://sensible.com/downloads/test-script-web.pdf` 的正文**未能直读**。但搜索引擎已索引该 PDF 正文，从中可确认以下原句：

- 开头立意句（脚本 "THE INSTRUCTIONS" 段）：
  > "…briefly. We're asking people to try using a Web site that we're working on so we can see whether it works as intended."
  > —— https://sensible.com/downloads/test-script-web.pdf （搜索索引片段）
- 免责句（这句是他方法论气质所在，被无数从业者引用）：
  > "I want to make it clear right away that we're testing the site, not you. You can't do anything wrong here."
  > —— 同一脚本；另见配套演示视频 https://youtu.be/1UCDUOB_aS8 中他本人念出的版本：「…session today should take about 20 minutes. The first thing I want to make clear right away is that we're testing the si[te]…」

**级别判定**：文字内容属 `[一手]`（他自己发布的官方文档），但**获取途径是第三方搜索索引片段而非直读**，故标注为 `[一手/间接获取]`；下游若需逐字精度，请自行复核 PDF 原文。

**任务/场景设计（第 6 章）** `[二手，mgp 笔记 p.52/p.55 + verg.es]`

- 先列出「人们需要在这个东西上完成的最重要任务」。
- 一小时里约 35 分钟做任务；为手快的人准备「filler task」（比如去竞品网站做同类任务）。
- 优先级判据：最关键的？让你半夜睡不着的？客服/数据分析暗示难用的？
- 场景 = 角色 + 动机 + 要做什么 + 少量细节；**修剪掉一切不贡献的细节**；**绝不给出线索**（不要用屏幕上出现的独特词汇，否则变成找词游戏）。
- 可以设限制：「不要用搜索」「别离开这个站」。
- 场景要**试跑（pilot）**，并打印出来。

**观察者的行为（第 9 章）** `[二手 + 一手]`

- 观察者也记笔记，每位被试写**三个**最重要的问题（不是「我想到了什么」，而是「我亲眼看到他遇到的」）。
- 观察者可以向主持人**递交问题建议**，但不能直接对主持人喊话。
- 观察室与测试室之间**必须听不到声音**。
- 指定一位「hall monitor」守着观察室。
- 尽量让人**现场看**而非事后看录像 `[二手，mgp 笔记 p.92]`。
- 主办方小技巧：挑不忙的日子、广而告之、说清「你来有什么好处」、**把高管「骗」进来**、备好零食。

### 4.5 复盘与优先级排序——他的「severity rating」实际上是**数票**，不是打分量表

**这是他本人的逐字自述，是整个方法里最有价值的一段** `[一手]`：

> "that's what I think of as the debriefing… I came up with a process for it that's in the book, which just between you and me, although I have admitted this publicly before, **I just made it up when I was writing the book**… what would be a good process the point of which was to figure out what were the most significant problems and then figure out what you were gonna do about them.
>
> … what they write down for each participant that they observe is **the three most significant problems that they actually observed that … person run into. Not things that they thought about while that session was going on, but actual problems that they observed that that person had.** And so you write down your three most significant, and so you end up with a sheet that's a handout that basically you end up writing down nine problems if you watch three tests. And then you bring that into the debriefing session and you go around and everybody… picked the three that they thought were most significant and they contribute that. And **you keep running tally on the board** and you end up with some that have 20 check[s], 10 check boxes… cuz everybody thought that was a serious problem.
>
> And then based on that, you then **reorder the list** for what came across as the most serious problems. And then you work your way down that list saying, okay, what are we gonna do about this in the next month to take this out of the category of being a really serious problem into either being a problem that not many people have… or that people still have, but it's not a serious problem for them anymore."
> —— https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug

**书中版本的排序依据**（两条粗筛判据）`[二手，verg.es 转录第 10 章`：

1. Will a lot of people experience this problem?（会有很多人遇到吗？）
2. Is it just an inconvenience, or will it cause a serious problem?（是「不方便」还是「造成严重后果」？）

**复盘的其它规矩** `[二手]`：

- 只有观察者能进复盘会。
- 「**It's not a democracy**」——不要民主表决到失焦，但票数用来排序。
- 只挑最严重的 10 个（或更少），逐条过，**不许跳项**。
- 另开一张「low-hanging fruit」清单：不严重但一个人一小时内能改完、且不需要复盘会上没到场的人批准的。
- 会中随时可调出录像。
- 产出：测了什么 / 排序后的问题清单 / 本轮要修什么。
- **复盘报告 = 1–2 页邮件**（不是一周的报告）。

**结论**：RSME **没有**给出 1–5 级的 severity rating 量表。他的优先级机制是「观察者三问题 → 会上勾选计数 → 按票数排序」。任务书里提到的「severity rating」，在 RSME 中应理解为这套社会化的计数法，而不是数值量表。`[推断]`

### 4.6 「The Least You Can Do About Usability Testing」/ 最小可行版本

- 第 11 章标题为「**The least you can do™**」，副题「Why doing less is often the best way to fix things」。核心问句 `[二手，verg.es]`：
  > "**What's the smallest, simplest change we can make that's likely to keep people from having the problem we observed?**"
- 两条修法原则 `[二手，verg.es]`：**Tweak, don't redesign**（改尺寸/位置/外观/措辞，或挪位置）；**Take something away**。
- 他预先驳回了五类反对意见 `[二手，verg.es 第 11 章]`：
  1. 「要做就做对」→ 引巴顿：「A good plan implemented today is better than a perfect plan implemented tomorrow.」
  2. 「这是核心问题，没法简单修」→ 先涂口红，再涂一层（lipstick on the pig）。
  3. 「反正马上要大改，先忍忍」→「soon」可能是几年甚至永不；把改动做小，就不怕白做。
  4. 「这看起来像补丁」→ 补丁也比原来的问题强。
  5. 「现在没时间」→ 没时间做完美方案，那就腾出时间做个简单优雅的。
- 修完要不要重测 `[二手]`：通常一眼能看出修好了；不放心就做**走廊测试（hallway test）**、A/B 测试或用 usertesting.com。
- **注意**：本次调研**未找到**以「The Least You Can Do About Usability Testing」为标题的独立章节或文章；该书第 11 章标题是「The least you can do™」。任务书中的这个长标题 `[存疑]`，可能来自 DMMT 第 9 章「Usability testing on 10 cents a day」的混记。

**最小化外推**：DMMT 第 9 章标题即「**Usability testing on 10 cents a day — Keeping testing simple—so you do enough of it**」`[一手，官方目录]`。这才是「最小可行测试」在他体系里的位置。

### 4.7 他不推荐做的事

| 不推荐 | 他的理由 / 原话 | 级别 |
|---|---|---|
| **用焦点小组代替可用性测试** | 「in usability tests, you watch people actually use things, instead of just talk about them」；焦点小组该用在项目规划阶段 | `[一手]` |
| **等「做得差不多」再测** | 「The worse shape something is in, the less you want to show it, but the more you can benefit if you do.」他主张**越早越好**：「it's never too early to start, if you've got a sketch of the homepage… take that sketch, show it to some people and say 'what do you think this is?'」 | `[一手]`（podcast） |
| **追求统计显著性** | 「no statistical—no point in even gathering statistics」 | `[一手]` |
| **先做远程测试** | RSME 第 14 章：「Don't try any form of remote testing until you have some in-person tests under your belt.」 | `[二手]` |
| **重复使用同一批被试** | 「Don't use participants again at a later round, as they know too much already.」（mgp 笔记 p.49） | `[二手]` |
| **过度重设计** | 见 §2 论点 12 | `[一手]` |
| **靠 ROI 说服高管** | mgp 笔记 p.132：「If you need buy-in from key stakeholders, ROI arguments are weak; make them observers in a live usability test.」 | `[二手]` |
| **测试时给人线索/帮忙** | 「avoid giving clues!!」；「resist temptation to help」 | `[二手]` |
| **不处理「kayak problems」** | 用户短暂迷路但自己回来了 → 不列入待修 | `[二手]` |
| **把可用性测试当品味之争** | 第 8 章：测试把讨论从「谁对谁错」变成「什么有效什么无效」 | `[二手]` |

### 4.8 远程测试（第 14 章）`[二手]` + `[一手，访谈]`

- 好处：招募容易、不用出差、排期容易、暴露的问题基本一样。
- 坏处：无法控制节奏、易被打断、误解概率高。
- 建议：**能共享屏幕就共享屏幕**。工具举例 GoToMeeting；非主持式（unmoderated）如 usertesting.com（书里记 $29/人）。
- 他本人在 2020 年访谈里的补充 `[一手]`：「Remote testing makes recruiting much easier because your recruiting pool goes from people who are… within 20 minutes of your office to pretty much anybody.」

---

## 5. 推荐书单与智识谱系

### 5.1 RSME 第 15 章「Reading list for overachievers」`[二手，verg.es 逐条转录]`

| 主题 | 书 | 备注 |
|---|---|---|
| 测试通论 | *Handbook of Usability Testing* | |
| 测试通论 | *A Practical Guide to Usability Testing* | |
| 测试通论 | *Usability Testing Essentials: Ready, Set, Test!* | |
| 相关主题 | *Moderating Usability Tests: Principles and Practices for Interacting* | |
| 相关主题 | *Paper Prototyping: The Fast and Easy Way to Design and Refine User Interfaces* | 作者为 Carolyn Snyder `[推断]`——verg.es 未记作者，本次未能核到 Krug 亲手点名 Snyder |
| 相关主题 | *Measuring the User Experience* | |
| 修东西 | *Letting Go of the Words: Writing Web Content that Works* | 作者 Ginny Redish |
| 修东西 | *Forms that Work: Designing Web Forms for Usability* | 作者 Caroline Jarrett |

**DMMT 正文里点名推荐的书/人** `[一手，Peachpit 官方第 4 章书摘]`：

> "Caroline Jarrett has an entire chapter about it ('Making Questions Easy to Answer') in her book *Forms that Work*… As with Ginny Redish's book about writing for the Web, anyone who works on forms should have a well-worn copy sitting on their desk."

### 5.2 智识谱系（谁影响了他 / 他引用谁）

| 人物 | 关系 | 证据 | 级别 |
|---|---|---|---|
| **Jakob Nielsen** | 他的入门来源。他自述「I bought Jakob Nielsen's early book, *Usability Engineering*, where he describes usability testing. And I bought myself on that and did some usability tests」；5 用户论归功于 Nielsen；成本随阶段递增曲线也引用 Nielsen | https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug ；https://builtin.com/articles/simplicity-ux-steve-krug-interview | `[一手]` |
| **Jakob Nielsen（自我定位对照）** | 「the biggest difference was he was a high end consultant. And I [was not]」；他明确说自己不擅长、也不适合做高端咨询的销售与社交 | 同上 podcast | `[一手]` |
| **Donald Norman** | DMMT 引言中引用：「technology may change rapidly, but people change slowly」 | https://builtin.com/articles/simplicity-ux-steve-krug-interview | `[一手]`（Krug 自述他引用了 Norman） |
| **Peter Pirolli & Stuart Card（Xerox PARC）** | 「scent of information」/ information foraging 概念的出处；DMMT 第 4 章以脚注形式引用 | 第 4 章正文有脚注标记；blas.com 明确写「This term comes from Peter Pirolli and Stuart Card's 'information foraging' research at Xerox PARC」 | `[二手]` |
| **Herb Simon** | satisficing 概念来源 | **本次未找到 Krug 本人点名 Simon 的原文** → §8 | `[存疑]` |
| **Steve Jobs / Apple** | 他 1994 年为 Apple 做咨询（当时 Apple 在做 e-World）；他认为「UX」作为职业是因为 iPhone/Jobs 证明了 UX 能赚钱才出现的 | https://builtin.com/articles/simplicity-ux-steve-krug-interview | `[一手]` |
| **Lou Rosenfeld** | 「my old friend Lou Rosenfeld」，一起做了一期 42 分钟关于写作的播客 | https://sensible.com/ | `[一手]` |
| **Brendan Jarvis** | 新西兰 UX 从业者，给他做了 76 分钟的生涯访谈 | https://sensible.com/ ；https://thespaceinbetween.co.nz/ | `[一手]` |
| **Roger Black** | 促成他写第一本书的人：1990 年代中期 Roger Black 为 Macmillan 策划一套 Web 书系，邀他写其中一本，并谈下 $40,000 预付款 | https://builtin.com/articles/simplicity-ux-steve-krug-interview | `[一手]` |
| **Don Herbert（Mr. Wizard）** | 童年职业偶像；他认为自己的「live demo 教学法」和插图风格与此有关 | podcast + https://sensible.com/about/ | `[一手]` |
| **Edward Tufte** | 任务书列为可能的影响源。**本次调研未发现任何 Krug 引用、推荐或提及 Tufte 的证据** → §8 | — | `[存疑]` |
| **Carolyn Snyder** | 其 *Paper Prototyping* 被列入 RSME 推荐书单（Krug 未在可查文本中提及其名字） | RSME 第 15 章（verg.es 转录） | `[二手]` |
| **Caroline Jarrett / Ginny Redish** | DMMT 正文明确推荐 | Peachpit 官方第 4 章书摘 | `[一手]` |
| **Jeff Atwood（Coding Horror）** | 反向影响：Atwood 是 Krug 的推崇者，把 "Happy Talk Must Die" 推成口号 | https://blog.codinghorror.com/happy-talk-must-die/ | `[二手]` |

### 5.3 个人背景（构成他思想底色的部分）`[一手]`

- 大学英语文学学位（先读物理，因没人给他讲微积分而放弃）。
- 排版店校对 → 学计算机 → 十年技术写作（tech writer）。
- 「if you're writing a user guide for something, you're explaining where the interface doesn't work the way you would expect it to work. That's all you really have to write.」→ 被开发团队请进界面设计会。
- 1989 年进 Symantec 做 contextual inquiry（他的第一份 UX 工作）。
- 咨询客户：Apple、Bloomberg.com、Lexus.com、NPR、International Monetary Fund。
- 公司名 Advanced Common Sense，在马萨诸塞州 Chestnut Hill；自称「just me and a few well-placed mirrors」。
- 他自己的职业建议是反常识的：「develop friends who are smarter and more ambitious than you are.」

---

## 6. 他的立场：可用性 vs UX、研究者 vs 设计师、量化 vs 观察

### 6.1 量化 vs 观察（Qual vs Quant）——立场极清晰

**RSME 第 1 章的对照**`[二手，verg.es + mgp 笔记 p.13 双证]`：

| | Qualitative（他做的那种） | Quantitative |
|---|---|---|
| 目的 | 获得洞见（get insights）「to improve what you're building」 | 证明某件事（prove something） |
| 严谨度 | 不科学：协议可改、人少、不采集数据、主持人与被试有互动 | 严格：协议一致、样本量有统计意义、采集数据、最小化与被试互动 |

**他对数据分析的态度** `[二手，mgp 笔记 p.19]`：

> "Web analytics can tell you **what** people are doing on your site, but they can't tell you **why**."

verg.es 记为「vs analytics — why vs what」。这是他的核心量化／质化分界：**数字回答「什么」，观察回答「为什么」。**

**他反对的东西**：把统计显著性当作做测试的前置条件（见 §4.1 第 4 层）。

**关于「量化型 UX 研究」的边界**：Rev 4 新增章节名为「Quant vs. Qual」，说明他晚年把这一对立提升为独立议题——但**本次未能取得该章内容**，`[存疑]`。

### 6.2 可用性 vs UX

- 他认为 **UX 作为一个职业是 iPhone 之后才出现的** `[一手]`：
  > "at the time I wrote it, UX didn't exist. It only really came into being with the iPhone. Because Steve Jobs proved that you could actually make money by doing user experience work and paying attention to users. And that made UX into a profession."
- 他把自己的书定位为「most people's introduction to UX」，但书名里用的仍然是 **usability**。
- 他拒绝把「可用性」拆成太多属性，只认三条 `[二手，引文转自]`：
  > "Personally, my focus has always been on the three that are central to my definition of usability: A person of average (or even below average) ability and experience can figure out how to use the thing [i.e., it's learnable] to accomplish something [effective] without it being more trouble than it's worth [efficient]. **I don't spend much time thinking about whether things are useful because it strikes me as more of a marketing question**, something that should be established before any project starts."
- 他也提到学术界定义的七属性（Useful / Learnable / Memorable / Effective / Efficient / Desirable / Delightful）并逐一批注，且说 memoability 也重要。

### 6.3 UX 研究者 vs 设计师——他明确表态「别抢地盘」

**最直接的一段（podcast，他的原话）** `[一手]`：

> "I think you need to be respectful of other people's turf. … **picture yourself as you're serving the process, you're serving the need. As the UX researcher, you're serving the needs of the designers and the developers.** And it's best to view it that way. **The one thing you don't want to do is get polarized and feel like you're telling them what to do**…
>
> But I think the way you assert that you have value is by supporting these other people and by making it clear that what you're there to do is to provide them with insights that make their work better.
>
> … **defining the roles is gonna make some people feel like they've been curtailed and other people feel more entitled.** And I feel like you need to create an atmosphere in which people understand that everybody's making contributions and that the UX researchers are not there to cut off the designers at the knees."

他同时吐槽「design」这个词的贬值 `[一手]`：

> "**design has become such a freaking sloppy term these days. It's like, is everybody a designer? Is nobody a designer? I think those are the two options.**"

### 6.4 无障碍（accessibility）——「这是道德问题，不是说服问题」

**他的原话（这是他最有情绪的一段，值得完整保留）** `[一手]`：

> "In a later edition of the book, I also added a chapter on accessibility, because it's important and it felt like the responsible thing to do. **I think the arguments that are usually made for making things accessible aren't very convincing — particularly to young able-bodied people** — and a lot of sites aren't very accessible as a result.
>
> **People overstate the case. They say, like, you know, 60 percent of people have some disability. That's sort of a strange count. But what matters is: You should do this because it's the right thing. It improves people's lives.** And how often do you get a chance in your job to dramatically improve other people's lives by just doing your work a little better?"
> —— https://builtin.com/articles/simplicity-ux-steve-krug-interview

书中原话 `[二手，引文转自]`：「It's the right thing to do. And not just the right thing; it's **profoundly** the right thing to do…」

无障碍的核心设计洞见 `[二手，引文转自]`：「Screen-reader users scan with their ears.」——盲人用户和明眼人一样没耐心，只是用耳朵扫读。

### 6.5 他对「可用性测试是不是被高估」的态度

- 「professionals will always (well, nearly always) be able to do a better job」——**他不主张业余取代专业**，理由是专业者有：搭建与主持经验、见过同样问题上百次所以知道怎么修、以及「may be in a better position to spell out unpleasant truths」。
- 但他坚持「**Getting it done is far more important than doing it 'perfectly.'**」`[一手]`

---

## 7. 矛盾、版本差异与自我修正（**全部保留，不调和**）

1. **第一版年份**：sensible.com DMMT 书页 FAQ 写「When I first wrote it in **2000**」；同一个 FAQ 在 All-the-FAQ-lists 页上写成「When I first wrote it in **2010**」（明显是站内笔误）；Brave UX 主持人开场说「First published in **1999**」。`[冲突]`
2. **销量/语言数**：700,000/15 语 vs 600,000（About 页）vs 600,000/20 语（podcast 主持词）。`[冲突]`
3. **第三册是否在写**：sensible.com 首页 FAQ 明确说「the first rule of Update Club is that you never announce that an update is coming」，而首页正文正在宣传 rev 4。旧 FAQ 未撤，两个文本并存。`[冲突]`
4. **测试人数**：DMMT 1 版说 3–4（mgp 笔记为 1 版）；RSME 定 3；访谈说 2–3；Nielsen 说 5。`[冲突]`
5. **页数**：DMMT 3 版 212 页（sensible.com）vs 216 页（Peachpit 官方书目）。`[冲突]`
6. **出版社年份**：RSME 官方书目页写 Dec 8, 2009；sensible.com 书页写 2010；封面版权页为 2010。`[冲突]`
7. **第 5 章标题**："Omit needless words"（官方目录）vs "Omit words"（部分电子版与二手转录）。`[冲突]`
8. **第 7 章标题**：1 版为 "The first step to recovery is admitting that the Home page is beyond your control"，2/3 版改为 "The Big Bang Theory of Web Design"。**这是真实的改名，不是错误。**`[版本差异]`
9. **「UX 研究者的定位」**：他一方面说研究者「serving the needs of the designers and developers」，一方面在别处（Built In）强调「you can't self-edit… you need to watch other people try to use your website」，即研究者拥有设计师不具备的认识论优势。**两者不完全一致，保留。**`[冲突]`
10. **关于 test 的严谨性**：他自称方法「unscientific」，又说「people have been doing this for years and **it works**」——**以经验有效性替代统计有效性**，这是他方法论的已知软肋；他本人不回避，而是用「come and watch and you'll see」来回应。`[推断]`
11. **FAQ 的两面性**：他既鼓吹「每页都放 FAQ」，又立了 QYWPWA 这条禁令。他给的分界线是「真的常被问」——但这条线由他自己判定，没有外部校验机制。`[推断]`

---

## 8. 信息不足 / 未能证实的部分（明确列出，不用通用道理填充）

| 项 | 状态 |
|---|---|
| **「no-brainer test」** | 未找到任何 Krug 原文或二手来源使用该说法。他实际有的类似测试是：Trunk Test、"Get it" test、Key task test、hallway test、50 毫秒首因印象实验。`[存疑]` |
| **Herb Simon 与 satisficing 的关联** | 学术上 satisficing 出自 Herbert Simon，但**未找到 Krug 本人点名 Simon 的原文**（DMMT 第 2 章只写「a strategy known as satisficing」，未见致谢）。`[存疑]` |
| **Edward Tufte** | 未找到任何 Krug 提及、引用或推荐 Tufte 的证据。任务书假设的这条智识线**在本维度无支撑**。`[存疑]` |
| **「每个季度第三个星期四」** | 任何来源都没有「每季度」。唯一相关来源是 Anant Jain 的二手转述「say the third Thursday every month」（**每月**）。他本人的原话只有「one morning a month」。任务书表述疑为记忆偏差。`[存疑]` |
| **「The Least You Can Do About Usability Testing」** | 未找到以此为名的章节或文章。RSME 第 11 章为「The least you can do™」；DMMT 第 9 章为「Usability testing on 10 cents a day」。`[存疑]` |
| **Trunk Test 的逐字原文** | 只拿到二手复述的六项清单，未拿到 Krug 的逐字段落。`[存疑]` |
| **Rev 4 的目录与新增章节内容** | 只拿到出版事实（Pearson 书目页）与任务书给定的章节名。出版商目录列表未取得。`[存疑]` |
| **RSME 第 2 章主标题** | WorldCat 片段为「[I] saw my [lovely] assistant in half」，方括号为 WorldCat 的省略标注，非原文标点。`[存疑]` |
| **RSME 各章完整副标题** | O'Reilly 与 verg.es 措辞不一；仅章号与页码可信。`[存疑]` |
| **测试脚本（test-script-web.pdf）、"Things a therapist would say" PDF、观察者说明 PDF、checklists PDF 的正文** | `web_fetch` 不支持 application/pdf，**未能直读**。**这是本次调研最大的缺口。** 已部分补救：test-script-web.pdf 由搜索引擎索引，取回两句原话（见 §4.4）。其余三份仍为空白。建议 Phase 2 用能读 PDF 的工具补抓：见 https://sensible.com/download-files/ |
| **RSME 第 7、8 章全文（华盛顿大学课程页有可访问版 PDF）** | 存在公开镜像 `http://faculty.washington.edu/jtenenbg/courses/hci/readings/`（该目录下有 RSME 第 7 章与第 8 章的 accessible PDF），但同样因 PDF 未读取。**这是补抓的最佳入口** |
| **sensible.com 官方样章 PDF（DMMT ch.? 与 RSME sample chapter）** | 同上，PDF 未读取。 |
| **他的亚马逊书评页（Krug's reviews at amazon.com）** | 任务书提到的智识谱系线索（他给别人的书写的书评）；本次未抓取成功。 |
| **「Doing the right thing」章的实质内容** | 只有章名。`[存疑]` |
| **「UX say hello to AI」章的实质内容** | 只有章名。他本人在 2020 年的态度是「Personally, I think talking to your computer is going to be one of the next big things… Someone who's seriously working on the problems should give me a call; I've been using speech recognition software for 15 years」，但这是 2020 年的说法，不能当作 rev 4 的内容。`[存疑]` |

---

## 9. 来源清单（按分级）

### `[一手]`（16）

1. https://sensible.com/ — 首页；含 rev 4 预告、FAQ、播客链接、页脚 servicemark
2. https://sensible.com/dont-make-me-think/ — 书页；写作动机、销量、读者、FAQ
3. https://sensible.com/rocket-surgery-made-easy/ — 书页；定位、两书分工、FAQ
4. https://sensible.com/all-the-faq-lists-from-my-site/ — 全站 FAQ 汇总；QYWPWA
5. https://sensible.com/download-files/ — 官方下载清单（脚本、清单、观察者说明、hall monitor guide）
6. https://sensible.com/about/ — 个人与公司介绍
7. https://sensible.com/blog/ — 博文索引
8. https://sensible.com/you-say-potato-i-say-focus-group/ — 2022-03-22 博文；焦点小组 vs 可用性测试
9. https://sensible.com/contact/ — FAQ 哲学
10. https://sensible.com/how-to-get-a-job-in-ux/ — 2020-09-06 博文
11. https://sensible.com/category/faqs/ — FAQ 分类页
12. https://builtin.com/articles/simplicity-ux-steve-krug-interview — Jeff Link 专访，2020-04-07（他的大量原话）
13. https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug — Brendan Jarvis 访谈逐字稿，2021-03-23（复盘流程自述）
14. https://www.peachpit.com/articles/article.aspx?p=2170656 — 出版社官方刊载的 DMMT 第 4 章书摘（第二法则原文）
15. https://www.peachpit.com/store/dont-make-me-think-revisited-a-common-sense-approach-to-web-9780321965516 — 出版社书目页
16. https://www.informit.com/store/rocket-surgery-made-easy-the-do-it-yourself-guide-to-9780321657299 — 出版社书目页

### `[二手]`（15）

17. https://francis.so/dont-make-me-think — 3 版目录 + 成段引文
18. https://blas.com/dont-make-me-think — 40+ 条成段引文（The Rabbit Hole）
19. https://cdn.jsdelivr.net/gh/mgp/book-notes@master/dont-make-me-think.markdown — DMMT **1 版**逐页笔记
20. https://cdn.jsdelivr.net/gh/mgp/book-notes@master/rocket-surgery-made-easy.markdown — RSME 逐页笔记
21. http://books.verg.es/rocket_surgery.html — RSME 逐章思维导图（含 Big Honkin' Test 对照表）
22. https://anantjain.xyz/posts/rocket-surgery-made-easy — RSME 笔记（"third Thursday" 唯一来源）
23. https://blog.codinghorror.com/happy-talk-must-die/ — Jeff Atwood 转录的 happy talk 原文
24. https://dokumen.pub/rocket-surgery-made-easy-the-do-it-yourself-guide-to-finding-and-fixing-usability-problems-9780321657299-0321657292-9780321702821-0321702824.html — RSME 目录片段
25. https://webdevstudents.com/dont-make-me-think-discussion-questions — 逐章教学讨论题（Trunk Test 六项）
26. https://www.pearson.com/en-au/media/zollwzef/9780321965516.pdf — Pearson 官方样章（检索片段）
27. https://search.worldcat.org/title/499491845 — RSME 目录字段
28. https://www.oreilly.com/library/view/rocket-surgery-made/9780321702821/ch11.html — 章节标题片段
29. https://www.pearson.com/en-us/subject-catalog/p/dont-make-me-think-rev-4-a-common-sense-approach-to-user-experience-design/P200000016545/9780135958728 — rev 4 出版事实
30. https://www.amazon.com/Rocket-Surgery-Made-Easy-Yourself/dp/0321657292 — 商品页（正文截断）
31. https://fr.wikipedia.org 之外的通用词源线索（rocket surgery 混成）——**未采用为证据**，仅记为 `[推断]`
32. https://sensible.com/downloads/test-script-web.pdf — 官方测试脚本（正文经搜索索引间接取得两句）
33. https://youtu.be/1UCDUOB_aS8 — 官方演示可用性测试视频（他本人念脚本）
34. http://faculty.washington.edu/jtenenbg/courses/hci/readings/ — 华盛顿大学课程资料目录，含 RSME 第 7、8 章 accessible PDF（Phase 2 补抓入口）
35. https://backstory.london/products/rocket-surgery-made-easy — RSME 商品页
36. https://beck-shop.de/krug-dont-make-me-think-rev-4/product/41667999 — rev 4 德文书商页（目录区被页面模板截断）

> 另有以下来源被抓取但**未采用**（云防护拦截、内容截断或无有效信息）：kriso.ee、caprichosbooks.com、ecampus.com（两处）、pdfcoffee.com、sweetstudy.com、keplers.com、dokumen.pub 正文页、knihydobrovsky.cz、Archive.org、O'Reilly 章节正文页、worldcat.org 直连。

---

## 10. 给下游（心智模型提炼）的提示

**若要用一句话概括这一维度的发现**：Krug 的全部著作可以还原为**一条认识论 + 一条方法论**。

- 认识论：**你不能替用户判断**（你已知太多），用户是扫读的、满意即可的、糊弄着用的，所以设计的第一法则是「别让我想不该想的事」。
- 方法论：**因为不能替用户判断，所以必须看真人用；因为必须持续看，所以必须把成本压到一个月一个上午、三个人；因为压到这么低还看不完，所以只修最严重的、只用最小改动。**

**三条最有心理模型价值的「反直觉」结构**：

1. **降低标准是为了持续**：他刻意把「质量」降到 3 人、一上午、不作统计，换来的是「你会继续做」——用**长期频率**换**单次严谨**。
2. **减少认知负荷是分层的**：不是「一切都要简单」，而是明确切分「该想的」（内容意义、对我有什么用）与「不该想的」（这是什么、点了会怎样）。这一层切分是他对「Don't make me think 被误读」的正面回应。
3. **修复的最小化与优先级的社会化**：问题排序不是专家打分量表，而是把观察者的个人判断变成一张可计数的票板；修复不是重设计，而是「能阻止这个问题发生的最小改动是什么」。

**最需要注意的证据强度**：书中逐字引文多经第三方转录（`[二手]`）；他本人在 2020–2021 两场长篇访谈里的原话（`[一手]`）与书中体系高度一致，故核心论点可信度较高。**真正的缺口是那几份 PDF 一手文档**（测试脚本、观察者说明、checklists、therapist 话术），建议 Phase 2 用支持 PDF 的工具补齐。
