# Steve Krug（史蒂夫·克鲁格）· 维度五：重大决策与转折点

> **⚠️ 归因更正**（2026-09-17 由引语审计 `08-quote-audit.md` M1/M2 追加）
>
> 本文件初稿把下列两句标为「Brave UX Ep.015 逐字稿 `[一手]`」，经审计逐字复核后**出处有误**，请以下列更正为准：
> - `"I reduced it to two or three people because, the fact is, you're far more likely to do it — and keep doing it — if you test two or three people."` → **实际出自 Built In / Jeff Link 访谈，2020-04-07**（逐字命中）。Brave UX 逐字稿里说的是「每月测一次、每次三人」，不是这个复合句。
> - `"Getting it done is far more important than doing it 'perfectly.'"` → **实际出自他本人网站 sensible.com 的 FAQ 书面文字**（`/about/` 与 `/rocket-surgery-made-easy/` 两处逐字一致）。
>
> 正文中凡引用这两句并把出处标为 Brave UX 之处，**一律以本更正为准**。原始调研记录不删改，仅追加此批注。

---

> 调研 Agent 5 产出 ｜ Phase 1 调研层 ｜ 用途：蒸馏「萧潇·Steve Krug 视角」的决策链素材
> 信源分级：`[一手]` = 他本人视频/访谈/官网/书；`[二手]` = 第三方报道、书评、他人转述；`[推断]` = 萧潇的判断，非他的原话
> 黑名单已遵守：未采用知乎、微信公众号、百度百科/百度知道

## 0. 信源质量与事实校正（读前必看）

**最高价值一手源（他亲手写 / 亲口说）**
- sensible.com 官网（About / FAQ / 书页 / 博客 / Downloads / 全站 FAQ 汇总）：https://sensible.com/ 、https://sensible.com/about/ 、https://sensible.com/all-the-faq-lists-from-my-site/ 、https://sensible.com/dont-make-me-think/ 、https://sensible.com/rocket-surgery-made-easy/ 、https://sensible.com/the-book-about-writing/ 、https://sensible.com/my-new-web-site/ 、https://sensible.com/you-say-potato-i-say-focus-group/ 、https://sensible.com/download-files/
- Brave UX Podcast Ep.015 完整文字稿（Brendan Jarvis 带他走完整段 UX 生涯，76 分钟）：https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug ｜视频 https://youtu.be/voq_uXpjziI
- Marketing Speak Ep.349 完整文字稿（含"写书真实动机"的罕见自述）：https://www.marketingspeak.com/web-usability-essentials-with-steve-krug/
- Built In 2020 访谈（Jeff Link）：https://builtin.com/articles/simplicity-ux-steve-krug-interview
- Business Insider 2026 长访（Henry Chandonnet）经 B17 News 转载全文：https://b17news.com/the-tao-of-steve-krug/ （原链 https://www.businessinsider.com/steve-krug-dont-make-me-think-author-frictionless-internet-2026-7 直连失败）
- 4th edition 官方书目页（含新章节清单与"against his better judgment"原话）：https://www.peachpit.com/store/dont-make-me-think-rev-4-a-common-sense-approach-to-9780135958643
- 2026 年 Rosenfeld「Advancing Research 2026」对谈要点（4.0 秘密开工、AI 立场）：https://rosenverse.rosenfeldmedia.com/videos/dont-make-me-think-30-what-endures-and-what-evolves-in-ux

**必须校正的三处事实（任务简报与一手信源冲突，以一手为准）**

| 简报说法 | 一手信源 | 判定 |
|---|---|---|
| 耶鲁大学心理学本科 | 他本人 FAQ 与播客自述：English Lit degree；Business Insider 明确写 "a degree in English from **Boston College** in 1971"；且他自述曾因"没人给我讲明白微积分"而**退掉物理** | **[冲突] 简报有误**。专业为英国文学、校为波士顿学院，不是耶鲁心理学 |
| 罗切斯特理工（RIT）计算机科学硕士 | 全部一手源中**均无任何硕士学历记载**；他的计算机知识来自排版店自学 | **[冲突] 简报有误 / 至少无证据**。他本人多次强调"入行时没有培训、没有门槛" |
| Apple（1990s 做 usability）→ Netscape（任职） | 一手源一致表述为**客户（client）**，不是雇主。他 1994 年为 Apple 做咨询（e-World / AOL 软件）；Netscape 同样列在客户名单 | **[冲突] 简报有误**。他是 Apple、Netscape、AOL、Excite@Home、BarnesandNoble.com、Lexus.com 的**外部顾问** |

> 另注：他 1997–2026 年官网 footer 自署公司为 Advanced Common Sense；公司线是"just me and a few well-placed mirrors"（一人 + 几面位置合适的镜子）。

---

## 1. 职业路径上的关键决策

### D1｜放弃"成为 Mr. Wizard"的童年职业目标，转读英国文学
- **时间**：1950s–1971
- **背景**：1950 年代看 Don Herbert 的周六晨间节目《Watch Mr. Wizard》着迷于电与科学，把"接他的班"当作唯一职业目标；大学起手读物理。
- **他给出的理由（原话+出处）**：
  - "Got an English Lit degree in college, after having to quit Physics because nobody explained calculus to me. (It's a long story.)" —— https://sensible.com/about/ [一手]
  - "as much as I ever had a career objective, it was to get his job when he retired" —— Brave UX Ep.015 [一手]
- **事后反思**："I proudly can say I've never made any use of it all or perceived any benefit to me from it and the rest of my life. So that's just by way of encouraging people who feel like, oh, I got this degree and I dunno if I'm ever gonna use it." —— Brave UX Ep.015 [一手]
- **我的推断**：[推断] 这次"被迫放弃"没有被他叙述成创伤，而是被他反复用作"人生不是直线"的论据。他对学历的轻视是**真实立场**，不是谦虚话术——因为他的整条职业路径都不依赖学历。
- **来源**：https://sensible.com/about/ ；https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug ；https://b17news.com/the-tao-of-steve-krug/

### D2｜从校对员 → 排版机操作 → 自学计算机（"computers 的入口是饭碗，不是志向"）
- **时间**：1970s
- **背景**：朋友开排版店，因他有英文系文凭，先做校对。
- **他给出的理由（原话+出处）**："then typesetting was getting computerized at the time and I was the person who was more interested in computers than anybody else. So I learned how to keep the computers running and taught everybody how to use them and whatnot. And that was how I really got into computers." —— Brave UX Ep.015 [一手]
- **事后反思**："Got a job as a proofreader from a friend who ran a typesetting shop. (After all, I did have a degree in English.)" —— https://sensible.com/about/ [一手]
- **我的推断**：[推断] 这是一条"顺手学"的路径，不是规划路径。他把"对计算机比别人更有兴趣"这个纯内生变量当成了转向的燃料——这点贯穿他后面所有决策（他不做战略规划，做的是"把手上这件事做到看得懂"）。
- **来源**：https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug ；https://sensible.com/about/

### D3｜做技术写作 10 年（十年，不是过渡）
- **时间**：约 1979–1989
- **背景**：朋友是 tech writer，手上活做不完，说"你有英文系文凭呀"。
- **他给出的理由（原话+出处）**："She literally said, 'After all, you have a degree in English.' Spent ten years as a tech writer." —— https://sensible.com/about/ [一手]
- **事后反思**："Form in just that sense that it fooled somebody into that I could write which turned, which actually was true. I could write, but that had nothing to do with the degree." —— Brave UX Ep.015 [一手]
- **我的推断**：[推断] 这十年是他真正的"专业训练期"——他后来所有写作方法（短、图示化、每页一个洞见）都是这十年的产物，而不是天赋。
- **来源**：https://sensible.com/about/ ；https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug

### D4｜【最关键的一转】从写手册的人，变成"被请进设计会议的人"
- **时间**：1980s 末（他最后一份技术写作工作）
- **背景**：一家后来失败的创业公司，他负责写用户手册。
- **他给出的理由（原话+出处）**："they realized that because I was writing the manual, I was spending more time thinking about the interface than they were. Basically, if you're writing a user guide for something, you're explaining where the interface doesn't work the way you would expect it to work. That's all you really have to write. And so they invited me to sit in on the design meetings for the interface. And that was how, that was the initial sort of segue." —— Brave UX Ep.015 [一手]
- **事后反思**：一年后（2011 年个人简介）他把这层意思压成一句更锋利的转场："he moved up the food chain to usability testing and interface design **so he could fix the problems instead of explaining them**." —— An Event Apart 演讲者页 [二手·但为官方简介，源自其自述] http://www.aea.complexspiral.com/events/boston07/speakers/stevekrug/
- **我的推断**：[推断] 这才是他职业的真正转折点，而不是任何一次"跳槽"。"写文档的人比设计的人更早看清界面问题"是他终身的自我定位——他所有的书和所有方法（外行测试新人、看别人用、别信自己）都在复刻这个时刻：**让"不在设计者位置上的人"的眼睛进入设计**。
- **来源**：https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug ；http://www.aea.complexspiral.com/events/boston07/speakers/stevekrug/

### D5｜1989 年正式做可用性（Symantec 的第一份测试委托）
- **时间**：1989
- **背景**：朋友 Richard 在 Symantec 工作，他老板说"也许我们该了解一下我们的用户"，Richard 说"我认识一个人"。
- **他给出的理由（原话+出处）**："And so Richard said, well, I know this guy. And they hired me to do four or five interviews where I would go out and sit with somebody in their office space..." —— Brave UX Ep.015 [一手]
- **为什么能接**："I hadn't done any at that point. And I actually just... bought Jacob Nielsen's early book, *Usability Engineering* where he describes usability testing. And I bought myself on that and did some usability tests for them." —— Brave UX Ep.015 [一手]
  - 关于这份"第一次报告"的手法，他自述把一部马克思兄弟电影（《At the Races》里 Groucho 被迫一路买书才能读懂投注）剪成 2 分钟放给客户看，用意是"这就是人们用这些产品的经验：为了让它做它本来就该做的事，你得不停再学更多东西"。
- **事后反思**："I like Jacob but I was indebted to him. I mean, sort learned in the first place, learned what I knew from him. And he's obviously written tons of useful stuff about all of it." —— Brave UX Ep.015 [一手]
- **我的推断**：[推断] 他的"可用性方法论"没有师承体系，是**教科书 + 现场试错**。这解释了为什么他的方法天生反学术（3 个用户、不用统计、DIY），也解释了为什么他对 Nielsen 保持敬意却始终不进入其范式。
- **来源**：https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug ；http://www.aea.complexspiral.com/events/boston07/speakers/stevekrug/

### D6｜1994 年起做 web（为 Apple 做咨询）
- **时间**：1994 起
- **背景**：他在 2020 年访谈中被问"写书时的 web 世界什么样"。
- **他给出的理由（原话+出处）**："I was actually working on the web in 1994, consulting for Apple. And they were using AOL software to do something called e-World, the Apple-branded version of AOL, with web access." —— Built In 2020 [一手]
- **我的推断**：[推断] 这是"他比 DMMT 早 6 年就在做 web 可用性"的关键时间锚点——他的权威来自实操年限，不来自任何职位。**[冲突] 注意：任务简报把他的身份写成"Apple 员工"，一手源是"consulting for Apple"。**
- **来源**：https://builtin.com/articles/simplicity-ux-steve-krug-interview

### D7｜【核心决策】**1998 年前后做独立顾问、并且永远只有一个人**
- **时间**：1998（公司 Advanced Common Sense；1997 起官网 sensible.com 有版权记录）
- **背景**：从 Symantec 项目起步后转为顾问身份；客户包括 Apple、AOL、Netscape、Excite@Home、BarnesandNoble.com、Lexus.com、Bloomberg.com、NPR、IMF。
- **他给出的理由（原话+出处）**：
  - 为什么不做大：他没有正面回答过"为什么不扩张公司"。但有一条高度相关的自述——他**主动放弃**了高端咨询路线：*"Well, I don't know if I aspired to be a high end consultant that felt like that was always beyond me. You know, had to be able to go in and sell to business people to be a high end consultant and networking. I knew this was not in my portfolio. I would not be good at doing that. And it would require completely different kind of confidence than I had. **I had a lot of confidence in what I did, but I wouldn't have had confidence doing that.** It would've been way too much stress."* —— Brave UX Ep.015 [一手]
  - 关于"不社交、不 networking"：*"the truth of my career was I never networked. I would've been terrible at it... I realized that all the job changes that I got were through nepotism."*；他给年轻人的建议是 *"develop friends who are smarter and more ambitious than you are and they'll get really good jobs and then they'll be looking around for somebody to hire"* —— Brave UX Ep.015 [一手]
  - 公司自嘲式定位（长期挂在官网与所有公开简介里）：**"just me and a few well-placed mirrors"** —— https://sensible.com/about/ [一手]
  - 规模化的**替代品**是"教别人做"：他把 25 年的方法论全部写进两本书 + 免费下载全套脚本 + 免费放出示范视频 + 曾开设工作坊（现已停办公开工作坊，只接企业内部工作坊，约 $15k/天）—— https://sensible.com/all-the-faq-lists-from-my-site/ [一手]
- **事后反思**：他从未对"一个人"表示过遗憾。相反，他在 2026 年访谈里说：*"I'm glad I don't have to handle any of that or manage any of that."*（被问到团队/角色政治时）—— Brave UX Ep.015 [一手]
- **我的推断**：[推断] "一人公司"不是经营策略，**是性格约束下的最优解**。他用三种方式对冲了不扩张的损失：(1) 把方法写成书（规模化知识而非规模化人力）；(2) 把测试方法交还给客户团队（DIY）；(3) 自嘲式公司名提前消灭"你们公司几个人"这类期待。**他卖的不是产能，是判断力——而判断力恰好不可分包。**
- **来源**：https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug ；https://sensible.com/about/ ；https://sensible.com/all-the-faq-lists-from-my-site/
- ⚠️ **诚实标注**：他本人**未公开系统性解释**"为什么不雇人/不扩张"。以上"为什么不扩张"的部分是 [推断]，依据是他对自身性格与销售型咨询的明确自述。

### D8｜不再扩张的延伸决策：逐步退出交付，转入写作（半退休）
- **时间**：约 2014–2020 起
- **背景**：第 3 版出版后，他把主要时间转向写作。
- **他给出的理由（原话+出处）**：
  - "Steve currently spends most of his time either a) writing, or b) watching old movies on tv (when he really should be writing)." —— https://sensible.com/about/ [一手]
  - "Do you still teach workshops? ... since UX has boomed there are an awful lot of people out there offering them, and since I have a bunch of other things I really want to do, I don't teach public workshops anymore." —— https://sensible.com/all-the-faq-lists-from-my-site/ [一手]
  - 第三方描述：Built In 称他 **"now semi-retired"**；播客方称他为 "former usability consultant" —— https://builtin.com/articles/simplicity-ux-steve-krug-interview 、https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug [二手]
- **事后反思**：2026 年他仍在亲自写第 4 版并定时赶稿，即"半退休"主要含义是**不接客户项目**，而不是停笔。—— https://b17news.com/the-tao-of-steve-krug/ [二手]
- **我的推断**：[推断] 他的"退休"不是退出，是**从"做咨询的人"转成"写书的人"**——同一动机（把该说的说清楚）换了成本更低的载体。
- **来源**：https://sensible.com/about/ ；https://sensible.com/all-the-faq-lists-from-my-site/ ；https://builtin.com/articles/simplicity-ux-steve-krug-interview

---

## 2. 写书的决策

### D9｜写《Don't Make Me Think》（2000）——真实动机是"提咨询费"，不是"教化行业"
- **时间**：约 1995 立项 / 2000 出版（New Riders；部分二手源写 1999，官网书页写 2000 年首版）
- **背景**：知名设计师 **Roger Black**（《Rolling Stone》《纽约时报杂志》《Esquire》的设计者）要做一个关于互联网的书系，邀他写"可用性"那一本；两人当时都在为 @Home Network 做咨询。
- **他给出的理由（原话+出处）**：
  - 立项：*"He was going to do a series of books on the web. And he said, well, you could do one about usability. And I said, sure, **if you can get me some money, because I can't afford to take the time off to do it**. He got me far more money than made any sense."* —— Built In 2020 [一手]
  - 预付：*"he talked them into giving me $40,000. Which, if you know anything about tech books, if you get $1,000 advance to write a textbook, you're doing really well."* —— Built In 2020 [一手]（Business Insider 补充：当时约合今天 $80,000，是未出过书的技术书作者前所未有的数字；书系其他书最终都没出版 —— https://b17news.com/the-tao-of-steve-krug/ [二手]）
  - **【最关键的自述】真实动机**：*"Again, disclosure is against interest, but this is what I make all the time, which is the book intended to be able to raise my consulting rates, and I never expected it to make any money. It turned out after the fact, and I found that **I couldn't raise my consulting rates without the book**. The books started making money after a few years."* —— Marketing Speak Ep.349 [一手]
  - 出版社书页上给读者的版本（面向公众的理由）：*"After years as a usability consultant helping my clients make their products easier to use, I knew that what I did was valuable. But I also knew that some of it wasn't really very hard to do. I figured that if I could explain how I did it more people could do it, and the products we all use would become less frustrating."* —— https://sensible.com/dont-make-me-think/ [一手]
- **事后反思**："Much to my surprise, it's ended up selling more than **700,000 copies in 15 languages**, and has become most people's introduction to User Experience (UX)."；写作过程则是 *"he 'spent a very miserable year' preparing the manuscript"*（Business Insider 转述其原话）—— https://sensible.com/dont-make-me-think/ 、https://b17news.com/the-tao-of-steve-krug/ [一手+二手]
- **我的推断**：[推断] 这里存在**双重叙事**：对公众说"我想让更多人能自己做"，对播客说"我是为了涨咨询费"。两者不冲突但优先级不同——**商业动机是启动器，公共动机是它意外成功后的真实价值**。他主动在播客里做"against interest disclosure"，说明他刻意不让公众版本独占记忆。
- **来源**：https://sensible.com/dont-make-me-think/ ；https://builtin.com/articles/simplicity-ux-steve-krug-interview ；https://www.marketingspeak.com/web-usability-essentials-with-steve-krug/ ；https://b17news.com/the-tao-of-steve-krug/

### D10｜为什么这本书"短、图示多、每页一个洞见"
- **时间**：2000 起，贯穿四版
- **他给出的理由（原话+出处）**：他把长销原因归结为五点，其中 *"**It's short.** Even though it covers a lot of ground, you can read it cover-to-cover in a few hours."*、*"**It doesn't feel like a 'tech' book**. I've always felt that a large part of my job is **keeping myself amused**, and people have told me they really enjoyed reading it."* —— https://sensible.com/dont-make-me-think/ [一手]
- **事后反思**：他在教师页上说 *"It makes me glad that it's a short book, given my many not-fond memories of slogging through big boring books in college."* —— https://sensible.com/are-you-teaching-a-course/ [一手]
- **我的推断**：[推断] "短"是一个**有意的产品决策**，不是写作风格：短 = 可被强制阅读（老板能给全组买）+ 可复读（专业人士每开新项目翻一遍）。这与他的"去掉一半文字"主张同源。
- **来源**：https://sensible.com/dont-make-me-think/ ；https://sensible.com/are-you-teaching-a-course/

### D11｜第 2 版（2006）
- **时间**：2006 年前后
- **背景**：首版成功后。
- **他给出的理由（原话+出处）**：**他本人未对"为什么出第 2 版"做过专门公开解释**。可确证的是第 2 版新增了**无障碍（accessibility）章节**：*"I added a chapter to the second and third editions of my book on accessibility, which I think is really good, actually. A lot of people mentioned it to me."* —— Marketing Speak Ep.349 [一手]
- **事后反思**：他把无障碍的理由从"合规"改写成"道德"：*"you need to do it. The reason why you need to do it is **not that you are going to get sued; it's because it's the right thing.** ... it's one of the few instances where you can vastly improve the quality of a lot of people's lives by just doing your job a little better."* —— Marketing Speak Ep.349 [一手]
- **我的推断**：[推断] 第 2 版真正的"改版逻辑"是把书从"网页可用性"扩成"普适设计伦理"，无障碍章节是抓手。**[存疑] 第 2 版的其余改动需查原书前言，本次未取得一手文本。**
- **来源**：https://www.marketingspeak.com/web-usability-essentials-with-steve-krug/

### D12｜第 3 版《Revisited》（2014）——把范围从"网页"扩到"一切被人用的东西"
- **时间**：2014（他自述写作在 2013）
- **背景**：移动端兴起；UX 成为职业。
- **他给出的理由（原话+出处）**：*"**When I first wrote it in 2000, I focused on the usability of web sites because that's what most people were building.** But in the third edition, I expanded it to show that it applied to almost anything that people use. Web, mobile, and desktop applications are obvious candidates, but it's just as effective for things like PowerPoint presentations and election ballots."* —— https://sensible.com/dont-make-me-think/ [一手]
- **事后反思**："When Steve Krug wrote the third edition of his best-selling book about usability in 2013, **he thought he was finally through with writing. And he really liked that idea.**" —— 出版社官方书目页 [一手·转述其自述] https://www.peachpit.com/store/dont-make-me-think-rev-4-a-common-sense-approach-to-9780135958643
- **我的推断**：[推断] 第 3 版是他唯一一次"愉快的改版"——因为 UX 职业刚诞生，他有一批新读者（"a million new UXers were minted during the UX hiring gold rush"），写起来有明确的新增价值。这一版之后他的态度急转（见 D13）。
- **来源**：https://sensible.com/dont-make-me-think/ ；https://www.peachpit.com/store/dont-make-me-think-rev-4-a-common-sense-approach-to-9780135958643

### D13｜反复表态"不想再更新"——"入侵诺曼底"与"更新俱乐部第一条规则"
- **时间**：2014–2025（反复出现于官网 FAQ）
- **他给出的理由（原话+出处）**：
  - *"**Are there any new editions of your books coming out?** Ouch! Sorry. I'm afraid there are few things more likely to make an author crazy than the prospect of updating a book. I really would like to update both books, but **it's kind of like deciding to invade Normandy. (The planning part obviously, not the fighting part.) It's a huge decision and commitment of time.** So I guess the answer is 'We'll see.'"* —— https://sensible.com/ [一手]
  - *"(And of course, **the first rule of Update Club is that you never announce that an update is coming**, for the purely selfish reason that while you're killing yourself working on it, nobody is buying the soon-to-be-outdated current edition.)"* —— https://sensible.com/ [一手]
  - 另一版本问答：*"I may do another edition someday, but **it's an awful lot of work, so it won't be soon.**"* —— https://sensible.com/all-the-faq-lists-from-my-site/ [一手]
  - 2026 年他仍在对谈里念这句：*"**The first rule of book update club is you never talk about book update club.**"* —— Rosenfeld「Advancing Research 2026」[一手] https://rosenverse.rosenfeldmedia.com/videos/dont-make-me-think-30-what-endures-and-what-evolves-in-ux
- **事后反思**：他解释过为什么改版"应当容易"却"其实很难"：*"A new edition of a book is a ridiculous amount of work. It seems like it should be relatively easy but if you're doing it halfway decently, it's a ridiculous amount of work."* —— Brave UX Ep.015 [一手]
- **我的推断**：[推断] "Update Club 规则"表面是营销自保（怕拖累现版销量），实质是**他给自己设的防止反悔的机制**——因为他的实际行为（每次都偷偷开工）与公开表态（不更新）长期相反。这条规则让"不宣布"成为可撤销的承诺。
- **来源**：https://sensible.com/ ；https://sensible.com/all-the-faq-lists-from-my-site/ ；https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug ；https://rosenverse.rosenfeldmedia.com/videos/dont-make-me-think-30-what-endures-and-what-evolves-in-ux

### D14｜《Rocket Surgery Made Easy》（2010）——因为"大家知道该测，但就是不测"
- **时间**：2010（New Riders，168 页）
- **背景**：1990s–2000s 可用性测试几乎只由外部顾问做，一次典型报价约 $5,000 起（Google Books 书介），所以一个产品生命周期里往往只测一轮。
- **他给出的理由（原话+出处）**：
  - 官网：*"anyone who's done them—or even just watched one—knows that **usability tests work**... But even though almost everyone now understands that improved user experience (UX) can increase sales (thanks, Steve Jobs!), **usability testing still doesn't happen often enough**. So, what keeps people from doing it? That's easy: **They think usability testing requires a lot of time, effort, and expertise. But they're wrong.**"* —— https://sensible.com/rocket-surgery-made-easy/ [一手]
  - 更直白的版本：*"one of the reasons why I did rocket surgery is cuz it was pretty much always handed off to consultants. So it was expensive. So you might do one round of usability testing during the development, the life cycle of a product... for the most part, if you weren't [a huge company] then you'd be lucky if you did it once."* —— Brave UX Ep.015 [一手]
- **事后反思**：他专门写了一条 FAQ 防止被误读成"业余可以替代专业"：*"**Are you suggesting that amateurs can do testing as well as experienced professionals? No. Professionals will always (well, nearly always) be able to do a better job.** ... My point is that almost all amateurs can do a **good** job (good enough to be very valuable), and there are rarely enough professionals available to do as much testing as is needed. **Getting it done is far more important than doing it 'perfectly.'**"* —— https://sensible.com/rocket-surgery-made-easy/ [一手]
- **我的推断**：[推断] 这本书在商业上是"自毁式"的——它把作者自己的收费服务变成了免费方法。他愿意这么做，是因为他的核心信条不是"我来做"，而是"**这件事必须发生**"。这也解释了为什么他对"专业人士更好"毫不遮掩：他要的不是替代专业人士，是取消"没预算"这个借口。
- **来源**：https://sensible.com/rocket-surgery-made-easy/ ；https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug

### D15｜决定写第 4 版（2026）——"违背自己更好的判断"
- **时间**：约 2020–2021 动念，约 5–6 年秘密写作；New Riders 计划 **2026-11-30** 出版（版权页标 2027）
- **背景**：第 3 版后他本想就此封笔；期间 UX 职业化、AI 出现。
- **他给出的理由（原话+出处）**：
  - 出版社书目页（转述其自述）：*"given all the changes between then and now (**usability had became, as he puts it, a wholly owned subsidiary of User Experience Design**, a million new UXers were minted during the UX hiring gold rush, and AI suddenly appeared, promising to either make all of them incredibly productive, put them all out of work, or wipe them out with the rest of mankind), **against his better judgment he couldn't resist giving it one more shot**."* —— https://www.peachpit.com/store/dont-make-me-think-rev-4-a-common-sense-approach-to-9780135958643 [一手·转述]
  - 他亲口讲的心态变化过程（"想通了"的瞬间）：*"as of a couple years ago, my thinking was always, there's not really that much that I could add at this point... But then somehow in the last year and a half... **things started occurring to me that I could do it or ways that I actually could update them that hopefully might not be that much work. Although inevitably it would end up being that much work. But I could fool myself into thinking it might not be that much work that would be worth doing.**"* —— Brave UX Ep.015 [一手]
- **事后反思**：2026 年他说正在赶出版日期：*"He's been working on the latest edition of 'Don't Make Me Think' for five years, and he's now racing ahead of its publication date at the end of this year: '**Hopefully, while I have enough brain cells left to finish it.**'"* —— https://b17news.com/the-tao-of-steve-krug/ [二手·引其原话]
- **我的推断**：[推断] 他做第 4 版的决策机制不是"这本书还重要吗"，而是"**我有没有一个不用写几年的办法**"。"自我欺骗式的乐观"（fool myself into thinking it might not be that much work）是他反复复用的启动机制——他自己也承认这点，这几乎是他对自己拖延症的工作化利用。
- **来源**：https://www.peachpit.com/store/dont-make-me-think-rev-4-a-common-sense-approach-to-9780135958643 ；https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug ；https://b17news.com/the-tao-of-steve-krug/

### D16｜第 4 版新增的三章（=他判断"现在值得写"的东西）
- **时间**：2026
- **内容（出版社官方描述）**：
  1. **Quant vs. Qual** — "how combining UX data and observation makes for better decisions"
  2. **UX, say hello to AI** — "a thorough treatment of the elephant in the room: What AI is and isn't, how it's likely to progress, and how it will affect the people who design products and the people who use them"
  3. **Doing the right thing**（副题 *How to keep your UX job and do good work without selling your soul*）— 伦理、守住"用户代言人"角色、现代 UX 职场生存
  - 开篇第 1 章标题即自嘲：**"13 years later — Another edition? So soon? What's your hurry?"**
- **我的推断**：[推断] 三章的选点暴露了他对行业的三条判断：**定量数据正在被误用**、**AI 是当下最大的未解变量**、**UX 从业者正在失去道德锚点**。而第 3 章（保工作 + 不卖灵魂）说明他把第 4 版当成一份"危机应对手册"，而不是内容修订。
- **来源**：https://www.peachpit.com/store/dont-make-me-think-rev-4-a-common-sense-approach-to-9780135958643

---

## 3. 方法论上的决策与取舍

### D17｜"每月一次上午、每次 3 个用户"
- **时间**：2010 年成书（2009 年部分章节已可在线读到）
- **背景**：学术与 Nielsen 的标准是 5 个用户（Nielsen 的"5 users"文章）；团队抱怨"没时间、没资源"。
- **他给出的理由（原话+出处）**：
  - *"Jakob Nielsen and other people did studies years ago... after five people, you reached diminishing returns... **I reduced it to two or three people because, the fact is, you're far more likely to do it — and keep doing it — if you test two or three people.** My recommendation is that you test once a month with three people."* —— Built In 2020 [一手]
  - *"That was part of the notion of rocket surgery was **test once a month with three users because it's such a low bar for recruiting and the effort required to produce the tests that you'll keep doing it**. Cuz the trick is, the problem is **you won't keep doing it**, that's the problem. ... you do it once a month and you have three people, recruiting requirements are low, attendance is really easy."* —— Brave UX Ep.015 [一手]
  - 面对"3 个不具统计显著性"的质疑，他连 FAQ 答案都写好了：*"your answer should be, yep, absolutely. We're testing three, no statistical, no point in even gathering statistics. **But the fact is people have been doing this for years and it works.**"* —— Brave UX Ep.015 [一手]
- **事后反思**：书里第 3 章标题即口号：**"A morning a month, that's all we ask"** —— https://www.oreilly.com/library/view/rocket-surgery-made-easy/9780321702821/ch3.html [一手·书]
- **我的推断**：[推断] 这是全书最"反学术"也最"务实"的一个决策：他把**样本量当成依从性成本**来优化，而不是当成误差来优化。他的目标函数不是"结论更准"，是"团队会一直做"。**这是一次把方法论折价换取行为改变的自觉交易。**
- **来源**：https://builtin.com/articles/simplicity-ux-steve-krug-interview ；https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug ；https://www.oreilly.com/library/view/rocket-surgery-made-easy/9780321702821/ch3.html

### D18｜主张 DIY（团队自己测）而不是请外部专家
- **理由（原话+出处）**：一句可直接引用的核心句：*"**Getting it done is far more important than doing it 'perfectly.'**"*（同上 D14）—— https://sensible.com/rocket-surgery-made-easy/ [一手]
- 补充理由：观察本身的价值高于报告——*"So that's why the old model of, well we have a consultant come in and run the test and then they write a report and they draw conclusions is pretty lame. It doesn't really serve that same purpose of drawing on all the group experience."* —— Brave UX Ep.015 [一手]
- **事后反思**：他在 2020 年仍给专业顾问留了位置：*"If you're having problems, parachuting in a consultant is really good and, if you can afford it, you should do it. But usability testing is even better. You get the team, you have to sit them down and watch a couple people try to use the thing."* —— Built In 2020 [一手]
- **我的推断**：[推断] 这是**对自己生意的第二次自毁**（第一次是 D14）。他愿意反复削弱自身商业定位，说明他把"团队亲眼看到"当成不可替代的教学事件——测试的价值一半在数据，一半在"设计者意识到自己不是用户"这个体验。
- **来源**：https://sensible.com/rocket-surgery-made-easy/ ；https://builtin.com/articles/simplicity-ux-steve-krug-interview ；https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug

### D19｜"招募可以松，评分可以弯"（recruit loosely and grade on a curve）——降低招募门槛
- **时间**：2010 起（DMMT 第 3 版亦有）
- **他给出的理由（原话+出处）**：*"**Whether you do the testing or not is far more important than whether you have the right participants.** You actually tend to learn valuable lessons from the wrong participants. ... **Don't get hung up on getting people who are exactly like your users.**"*；*"One of the maxims I have in the book is **'recruit loosely and grade on a curve'**, which, basically, means don't get hung up about recruiting to the point where it's going to keep you from doing testing."* —— Built In 2020 [一手]
- 2021 年他把同一逻辑压成一句操作建议——**"They should lower their standards."**（被问"找不到合适的被试怎么办"时）—— Brave UX Ep.015 [一手]
- **事后反思**：他承认代价并给出了自查方法：*"you just do the thought experiment where you say, well, did they have a hard time not getting this because they were not actual users or because it's just confusing. And I would argue you can always answer that question really easily **as long as you ask it**."* —— Brave UX Ep.015 [一手]
- **我的推断**：[推断] 他的原则是**"招募难度 = 测试频率的天敌"**。任何提高招募成本的做法都会让测试停掉，所以宁可牺牲被试纯度。他把"非目标用户"从干扰项重新定义成**样本资产**（"you'll learn different things from them"）。
- **来源**：https://builtin.com/articles/simplicity-ux-steve-krug-interview ；https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug

### D20｜明确反对用焦点小组代替可用性测试（但不是反对焦点小组本身）
- **时间**：2000 年起（DMMT 开篇即处理此问题），2022 年专文再讲
- **他给出的理由（原话+出处）**：
  - *"There's one phenomenon you really should be prepared for when you introduce the idea of usability tests in your organization: **People will think you mean you're going to be doing focus groups.** Seriously. This really happens. All the time. The problem is that **a lot more people are familiar with focus groups than with usability tests.**"* —— https://sensible.com/you-say-potato-i-say-focus-group/ [一手]
  - 他给的标准 45 秒电梯稿：*"Usability tests are about watching people actually **try to use** what we're building... Focus groups are about having people **talk about** things, like their opinions about our products... So the main difference is that in usability tests, **you watch people actually use things, instead of just talk about them.**"* —— 同上 [一手]
  - 2022 年他补了一句缓和：*"**Focus groups are good, too.** They're great. ... That's what made us much more oriented towards and valuable for marketing, for figuring out what it is you should build, who's going to want it, and how much they will want it. Those kinds of questions that's what focus groups are good for."* —— Marketing Speak Ep.349 [一手]
- **事后反思**：他两次强调这是**命名混淆**问题而非方法论之争；并说解决方法不是辩论而是让人来看一次测试：*"as soon as you get them to actually come and observe a test, the difference becomes clear and the problem goes away."* —— https://sensible.com/you-say-potato-i-say-focus-group/ [一手]
- **我的推断**：[推断] 他反对的不是焦点小组，是**用"说"替代"做"**。「You say potato」这句标题本身就是他的姿态：这不是对错问题，是**两个不同的东西被叫成了同一个名字**。他用"让人亲眼看一次"替代"论证"——这与他所有方法的底层一致。
- **来源**：https://sensible.com/you-say-potato-i-say-focus-group/ ；https://www.marketingspeak.com/web-usability-essentials-with-steve-krug/

### D21｜反对"等到产品完美再测"——越早越好，草图就能测
- **他给出的理由（原话+出处）**：*"**As early as possible?** I always say if when it's never too early to start, if you've got a sketch of the homepage of this thing that's just a germ of an idea, then take that sketch, show it to some people and say, what do you think this is? ... **But odds are that from showing it to five people and having them give you that description, you will have a light bulb go off over your head** of, oh, right, that's not obvious that this is what we were doing with that. **And how much time have you spent? None.**"* —— Brave UX Ep.015 [一手]
- 经济学论据（他引用并认同 Nielsen）：*"Jacob Nielson pointed out... he had ran the numbers for how much it costs to make changes later in the process as opposed to earlier in the process. And it's rid, it's ridiculous. It's purely logarithmic."* —— Brave UX Ep.015 [一手]
- **我的推断**：[推断] 这条决策的实质是**把可用性测试从"验收环节"改到"构思环节"**。他给出的最有杀伤力的论据不是"早测更省钱"，而是"早测的成本为零、收益是当场的顿悟"。
- **来源**：https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug

### D22｜"上午测、下午改"的同日闭环（一次月会的节奏）
- **时间**：2010 起
- **他给出的理由（原话+出处）**：他把月度节奏设计成"上午 3 场 50 分钟测试 → 当天团队复盘 → 排下个月要修的清单"：*"if you do it once a month and you have three people, recruiting requirements are low, attendance is really easy. **You're testing down the hall from where all these people are**... And then you do the debrief with everybody who came to them and **they get to have a voice in that process.**"* —— Brave UX Ep.015 [一手]
- 配套信条：**"when fixing problems always do the least that you can do"**（修问题，永远做最少的那一步）—— *"Cuz you've seen people get sucked into redesigns when yes, the redesign would be nice, but you're not gonna end up doing it. But on the other hand, there is a tweak you could make... There's a simple change that you could make that would make things a lot better, **wouldn't fix them, wouldn't be perfect, but would that improve the situation**"* —— Brave UX Ep.015 [一手]
  - ⚠️ 诚实标注：本次未找到他使用**"test in the morning, fix in the afternoon"**这一确切措辞的一手出处。可确认的一手结构是"**a morning a month**"（书第 3 章标题）+ 当天/次月复盘的短周期闭环。**"上午测下午改"这一表述属于对方法的准确概括，但不宜当作他的原话引用。**
- **我的推断**：[推断] "做最少的一步"与"3 个用户"是同一个思想的两个面：**把动作成本压到低于"找借口"的成本**。他不追求一次修好，追求"下个月还会再做一次"。
- **来源**：https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug ；https://www.oreilly.com/library/view/rocket-surgery-made-easy/9780321702821/ch3.html

### D23｜免费放出完整示范测试视频 + 全套脚本 / 清单（把方法资产公开）
- **时间**：2010 起
- **他给出的理由（原话+出处）**：官网原文：*"**If you're thinking it can't be as simple as I'm saying, watch this recording** of a demo usability test that I made to accompany the book. **You'll see that there's really no trick to it, and you'll be surprised at how much you can learn with very little effort.**"* —— https://sensible.com/rocket-surgery-made-easy/ [一手]
  - 下载页放出的资产包括：网站/移动 App 测试脚本、录像同意书、准备清单、"治疗师会说的话"清单、观察者说明（含"每人每场记 3 个最严重问题"的记录表）、观察室主持人指南 —— https://sensible.com/download-files/
  - 分享规则是有意设计的：*"**Feel free to share them** as long as you leave the copyright info intact. But **please don't post the files** anywhere. (Share a link to this page instead. That way people will always get the latest version if I update them.)"* —— https://sensible.com/download-files/ [一手]
  - 关于"现场演示"的偏好：*"seeing one is pretty eye opening... it always seemed to me to be the best way to start off... **it always works, even if it's a bad test, even if it's a bad participant, as long as the audience can hear and understand them, it works perfectly.**"* —— Brave UX Ep.015 [一手]
- **我的推断**：[推断] 这条决策的底层赌注是：**演示的说服力 > 论著的说服力**。他不怕"教会徒弟饿死师傅"，因为他判断真正的稀缺品不是测试能力，而是"愿不愿意开始"。**他本人未对"为什么免费"给过一句直接解释，以上为[推断]。**
- **来源**：https://sensible.com/rocket-surgery-made-easy/ ；https://sensible.com/download-files/ ；https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug

### D24｜把"同侪评议"写进方法：先测竞品，"骗"人进观察室
- **他给出的理由（原话+出处）**：*"My favorite recommendation was always, **if you're starting out introducing it to the team, then do a test of your competitors because everybody's interested in their competitors. And also you're not gonna make anybody look bad in house because you're not testing your stuff, you're testing their stuff.**"* —— Brave UX Ep.015 [一手]
  - 配套"零食预算"论：*"Great snacks, I recommend **spend as much money as you can on snacks and lunch** and whatever and just make it easy."* —— 同上 [一手]
- **我的推断**：[推断] 这是一条**组织政治决策**而不是方法论决策：他把它当成降低"防御性"的手段——不测自己的东西，就没人有理由抵制。这说明他对可用性推广的理解本质上是**改变人的意愿**，不是技术活。
- **来源**：https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug

### D25｜复盘流程（每场记 3 个最严重问题 → 全班投票 → 排序 → 定下月动作）
- **他给出的理由（原话+出处）**：他公开承认流程是写书时现造的：*"in fact, I came up with a process for it that's in the book — **which just between you and me, although I have admitted this publicly before, I just made it up when I was writing the book**. I thought, based on what I've done and seen, what would be a good process [whose] point... was to figure out what were the most significant problems and then figure out what you were gonna do about them."* —— Brave UX Ep.015 [一手]
- 设计意图（反"问题积压"）：*"part of the problem is that **you tend to not focus on the most significant problems because they have a history** and people believe that they're gonna be hard to solve or they believe that they're gonna be solved by the next round of technology... **None of which is ever true.**"* —— 同上 [一手]
- **事后反思**：*"then I actually got a nice amount of feedback from people who said, yeah, we did the debriefing this way and worked really well."* —— 同上 [一手]
- **我的推断**：[推断] "我当场编的"这句自曝很关键：他的方法可信度不来自出处（学术/机构），而来自**20 年实操 + 可被验证有效**。这也解释了他为什么敢公开承认编造——承认来源不权威，反而强化了他的核心论点（谁都能做）。
- **来源**：https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug

### D26｜"去思考"的边界：不是所有思考都该被消除
- **背景**：多年有人说"别让我思考"过于绝对，有些网站就是要让人思考。
- **他给出的理由（原话+出处）**：*"'Don't Make Me Think' really means **don't make me think about things I don't need to think about.** And pretty much everybody has understood that. I've seen a handful of people writing articles in the last couple of years expressing some skepticism regarding the premise... And I'm like: '**Right, of course. We all want that.**'"*；*"You do want them to think about the meaning of your content. You want them to think about **what's in it for them**... What you don't want them to think about is: 'What is that thing on the screen? What is it for? What's going to happen if I click that?'"* —— Built In 2020 [一手]
- **我的推断**：[推断] 这是一个**对批评者让步但不改标题**的决策。他宁可反复解释也不换书名——因为书名本身就是书的第一条规则（短、准、可复述）。**[推断] 他做品牌决策时会优先保护可复述性，而不是学术严谨性。**
- **来源**：https://builtin.com/articles/simplicity-ux-steve-krug-interview

---

## 4. 争议性 / 被质疑的决策与立场

### D27｜认定"social media 是过去四十年最坏的事"，并给出具体的设计性修正方案
- **时间**：2021 起，2026 年表达最完整
- **他给出的理由（原话+出处）**：
  - *"I feel like **social media has been nothing but bad**. ... I feel like the net net is minus a thousand percent. I feel like it's caused more bad effect in society than almost anything in many years. And I mean, I'm biased because I live in the United States and **we practically lost our country because of social media.**"* —— Brave UX Ep.015（2021）[一手]
  - *"I think social media is **the worst thing that's happened in the last forty years**."*；*"**They're designed for addiction, because that's how they make money.**"*；*"**Every time it shakes the little laser pointer in front of the kitten, it makes five cents.**"* —— Business Insider 2026 [一手，经 B17 转载]
  - 他给的具体修正：**账号最多 100 个关注者**（压制病毒传播）；短视频**只能通过搜索与订阅找到，不走推荐算法**，且**不要大剂量投喂**；并称这种"加摩擦"是他自己会喜欢的。 —— 同上 [一手]
- **事后反思（关键的自我辩护）**：他否认"别让我思考"该为社交媒体负责——*"It's not frictionlessness that's ruined the internet, it's **bad actors who have made bad products addictively friction-free**."*；区分了两种"无摩擦"：让必要之事更容易（可用性）vs. 让用户无法停手（利润最大化）。被问 Meta 工程师是否在实践他的原则时，他**坚决回答"是误读"**，理由是他书里写明 UX 设计师的首要职责是**用户代言人（user advocate）**。—— 同上 [一手]
  - *"I feel like the book has its own moral tone, and that it attracts people who are more ethical."* —— 同上 [一手]
- **我的推断**：[推断] 这是他最可能被质疑"言行不一"的地方（"无摩擦互联网之父现在抱怨互联网太无摩擦"），而他准备得最充分：用**意图/受益方**区分两个同名概念。这条区分是他晚年公开立场的中枢。
- **来源**：https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug ；https://b17news.com/the-tao-of-steve-krug/

### D28｜对自己所在行业的公开吐槽：UX 的角色争夺、"design"一词的崩坏
- **时间**：2021
- **他给出的理由（原话+出处）**：*"so many teams now have UX people and they're trying to figure out, partly they're going through **the whole land grab thing** of trying to figure out, well, **who actually gets to make the decisions here?** Are the UX people allowed to tell us how it has to be designed? Or are we telling them? ... it probably [is] becoming more intense because now the UX people actually have a seat at the table. And **design has become such a freaking sloppy term these days. It's like, is everybody a designer? Is nobody a designer? I think those are the two options.**"*（Brendan 接话：*"You can thank 3M for that."* 他答：*"all you need [is] a wall and some post-it notes."*）—— Brave UX Ep.015 [一手]
- **他给的处方（不是站队，是服务姿态）**：*"I think **you need to be respectful of other people's turf**. ... you need to picture yourself as **you're serving the process, you're serving the need**. As the UX researcher, **you're serving the needs of the designers and the developers**. ... The one thing you don't want to do is get polarized and feel like you're telling them what to do."* —— 同上 [一手]
  - 他甚至否定了"靠管理定义角色"这条路：*"defining the roles is gonna make some people feel like they've been curtailed and other people feel more entitled."* —— 同上 [一手]
- **我的推断**：[推断] 注意他吐槽完**立刻收回**（"I don't know if there's even anything smart to say about that"、*"I'm glad I don't have to handle any of that or manage any of that"*）。这是他一贯的立场方式：**批评现象，不指认个人，也不开制度药方。**
- **来源**：https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug

### D29｜"没人再有时间学微积分"式的技术乐观主义落空：他认为互联网可用性其实**变差了**
- **时间**：2022、2026
- **他给出的理由（原话+出处）**：
  - 2022：*"By the early 2000s, things had gotten pretty good... **I think a lot these days about how much it's gone downhill since there. I have done two talks about usability getting better... I've only done two because I don't like to say it very much in public. I feel like I will come in for a lot of flak.**"*；理由是**框架化（frameworks）让建站变容易，但也让站点长得都一样** —— Marketing Speak Ep.349 [一手]
  - 2026：*"Krug isn't sure the internet has gotten more usable since he wrote the book in 2000. While many sites are smoothed down and simplified, **easy access to the actual things we need — like contacting customer service, submitting online forms, or canceling a subscription — remains far out of reach.** '**It's gotten worse, and I think it will get even worse with AI.**'"* —— Business Insider 2026 [一手，经 B17 转载]
- **事后反思**：他也公开承认**自己这辈子只改变过一次看法**：*"He's only ever changed his mind about one thing: that UX would always be side-lined. Then came Steve Jobs and Jony Ive, who Krug called the 'ROI case study.' ... '**I don't mind changing my mind. It just hasn't happened very much around this.**'"* —— 同上 [一手]
- **我的推断**：[推断] "唯一的改观来自 Apple 证明 UX 能赚钱"这条自述，与他"1994 年就在给 Apple 做咨询"形成呼应——他从不把行业的进步归功于方法论，而归功于**有人证明了它能赚钱**。这是他世界观里最硬的一块现实主义。
- **来源**：https://www.marketingspeak.com/web-usability-essentials-with-steve-krug/ ；https://b17news.com/the-tao-of-steve-krug/

---

## 5. 言行一致 / 不一致的案例（他自己怎么解释）

### D30｜【不一致】主张"去掉一半文字"，但自己写作极度痛苦、反复重写
- **主张**：DMMT 第三法则 —— **"Get rid of half the words on each page, then get rid of half of what's left."**（他自注还有一条"接近的竞争者"）；同章小节标题 **"Omit needless words"** —— https://www.goodreads.com/quotes/755486-get-rid-of-half-the-words-on-each-page-then [一手·书]
- **他给出的理由（原话+出处）**：
  - *"Because it's really hard work. ... it amounts to thinking and **thinking clearly is really hard work**. And the other part of it is [thinking] clear and figuring out what you mean. And then coming up with a really good explanation for it, which is **the Mr. Wizard part**."* —— Brave UX Ep.015 [一手]
  - 最著名的一句比喻：*"**Writing is like the torture machine in The Princess Bride that sucks a year out of your life every few seconds.**"* —— Lou Rosenfeld 播客（其官网首页摘录）[一手] https://sensible.com/
  - 关于拖延与截止时间：*"**deadlines weren't useful at all** because I wouldn't kick into gear when the deadline was approaching... It was only once all of that had been passed and I had completely messed things up, that I would finally lapse into enough panic that I would actually get it done. So I was really worst case scenario and I feel very bad."* —— Brave UX Ep.015 [一手]
- **他的**转折性自我修正****：*"I had a breakthrough sometime in the last five years when I suddenly realized that **I don't actually hate writing that much. What I hate is procrastinating. And for me, 90% of writing is procrastinating**, and procrastinating is really painful."* —— Brave UX Ep.015 [一手]
- **我的推断**：[推断] 这里**不存在他承认的矛盾**——因为"去掉一半文字"是给**最终成品**的规则，而"反复重写"是**达到成品的过程**。他自己从未把这两件事当成冲突，所以也就没有"解释"。可引用的实质是：**他的简洁是改出来的，不是写出来的。**
- **来源**：https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug ；https://sensible.com/ ；https://www.goodreads.com/quotes/755486-get-rid-of-half-the-words-on-each-page-then

### D31｜【不一致】主张"别让我思考"，自己的网站却满页 FAQ 列表
- **他给出的解释（原话+出处）**：
  - *"**Why do you have so many FAQ lists?** It's true: If you poke around a little, you'll discover that I've got an FAQ list on almost every page of my site. I happen to think that **making it easy to find the answers to frequently asked questions is a good thing — as long as they're really Frequently Asked Questions, and not QYWPWA's (Questions You Wish People Would Ask).**"* —— https://sensible.com/all-the-faq-lists-from-my-site/ [一手]
  - 他还用 FAQ 当**写作工具**（这是他少见的"技法自曝"）：*"I had an FAQ at the end of each chapter, which turns out to be **a wonderful writing device** because inevitably if you're writing something nonfiction like that, you end up with stuff that you can't quite fit in and you're gonna have to really work hard to come up with a rhetorical flow... But on the other hand, if you have an FAQ at the end of the chapter, **you just throw it there, doesn't matter, don't go through all that writing struggle.**"* —— Brave UX Ep.015 [一手]
- **我的推断**：[推断] 他的自辩逻辑是**"FAQ 是降低思考成本，不是增加"**——因为问题是他真实收到的（Frequently Asked），而不是他希望被问的（QYWPWA）。这条区分既回应了"言行不一"，也顺手立了一条可复用的内容原则。**他没有把他的网站当成可用性样板来维护**（否则他 2020 年不会说"10 年没改版"），他把网站当成"够用就行"的工具——这一点见 D32。
- **来源**：https://sensible.com/all-the-faq-lists-from-my-site/ ；https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug

### D32｜【不一致】可用性权威的官网"很旧"、"有点糟"，他十年不改
- **他给出的理由（原话+出处）**：*"It's been 10 years since I last redesigned my site. There, I said it. That feels better. Every so often, one of my readers will suggest, ever so gently and kindly, that my site is…well…kind of…sort of…**old** looking. And about once a year, someone will suggest that it's…**awful**. And personally, **I've never taken it personally.** ... It was more a matter of two things: (1) **It worked well enough. It did what I needed a site to do.** (2) **I didn't look embarrassingly bad.** (In fact, in a way I kind of liked the way it looked.)"* —— https://sensible.com/my-new-web-site/ [一手]
- **最终为什么还是改了**：*"the awful third-party solution I'd been using for years to provide a mobile version finally went out of business, so I finally decided to bite the bullet and use a modern theme with responsive design–**and better accessibility–built in**."*（2020 年，儿子 Harry 一起做，注：Harry 后来在 Bentley 读 UX 硕士）—— 同上 [一手]
- **他自己承认的深层动机**：他加过无障碍章节，但自己的站"并不特别无障碍"——*"**It was an embarrassment because my site was not particularly accessible.** ... It's one of the reasons I moved to WordPress when I redid it."* —— Marketing Speak Ep.349 [一手]
- **我的推断**：[推断] 这是全篇最有价值的一处"言行张力"，因为**他给出了可复用的决策标准**：*"够用" + "不难看到无法见人"* 就是他不改的理由；**只有当外部因素（第三方移动方案停业）+ 道德债务（无障碍）叠加到超过改版成本时，他才动手。** 这不是知行不一，而是一个**升级阈值异常高**的维护策略。
- **来源**：https://sensible.com/my-new-web-site/ ；https://www.marketingspeak.com/web-usability-essentials-with-steve-krug/

### D33｜【不一致】反对"把测试外包给顾问写报告"，但他自己就是那个顾问
- **事实**：他靠做顾问活了 25 年，却写书教别人别请他。
- **他给出的理由（原话+出处）**：*"**That was part of what it did.** ... The other part of what it did was usability tests."*（承认自己的业务就是这两块）；同时 *"So that's why the old model of, well we have a consultant come in and run the test and then they write a report and they draw conclusions is pretty lame."* —— Brave UX Ep.015 [一手]
- **我的推断**：[推断] 他**本人未对这条自我背离做过正面承认或道歉式解释**。可确认的是他从未在公开场合把"教别人做"和"自己收钱做"当成需要辩解的事——他在 2020 年还坦然给出顾问的价值定位（"parachuting in a consultant is really good and, if you can afford it, you should do it"）。所以这不构成他眼中的矛盾：他把两者当成**不同预算层级下的两个选项**，不是互相否定。
- **来源**：https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug ；https://builtin.com/articles/simplicity-ux-steve-krug-interview

---

## 6. 近年的新决策

### D34｜写一本与 UX 无关的写作书（"the writing book project"）
- **时间**：约 2015 年起（他自称"五年前"是 2020 年说的），至 2026 年仍未完成
- **他给出的理由（原话+出处）**：
  - *"I've been working on a new book for five years now. And it's not about usability or UX. It's about writing. I've never made any secret about the fact that I find writing to be **ridiculously hard work**, and for me, a source of, well…**agony** is probably the best word. And I've been doing it for forty years. And not being a big fan of agony, over the years I've slowly found **some things that make writing easier (no, not alcohol)**, and produce better results—**things I wish someone had told me back when I started out.**"* —— https://sensible.com/the-book-about-writing/ [一手]
  - *"Of course, the problem is **this is writing**. **I don't have a due date.** When people ask, I just say I'm hoping to get it done **while I still have enough brain cells left to do it.**"* —— 同上 [一手]
- **进度与拖延的自陈（可复核的公开时间线）**：
  - 2021-09："But I honestly am still working on writing the book about writing. (**It's been almost six years now since I started sending myself emails with notes about it.**)" —— 官网评论回复 [一手]
  - 2022-12："I only wish I was close enough to being done to justify preordering!" —— 同上 [一手]
  - 2024-06："No update at this point. **Work on it has been delayed by various things (you know: life)**, but I'm hoping to get back at it full tilt before too long." —— 同上 [一手]
  - 2025-01："Thanks, Kevin! I guess **it's nine years now** that I've been at it in one way or another. Whew." —— 同上 [一手]
  - 2021（播客中）：他有一份 **80 页的草稿**，其中大量是关于拖延症的笔记，而那一章"最终可能只有 10 页"——*"I have a 80 page draft that's some text and a lot of notes about procrastination... **And I've been working on it for a long time.**"*；对方："Well that's irony right there." 他："**the irony, it's really thick.**" —— Brave UX Ep.015 [一手]
- **他的核心洞见（可引用）**：*"people don't have to buy the book. The main one is **you have to get over the idea that you're gonna fix it. You have to get over the idea that you are going to stop procrastinating.** ... it's not one thing, a number of things working at the same time... **any of those things will work for a little while and they'll stop working.**"*；并反驳"拖延=懒"：*"A lot of people believe, as I have believed at various times in my life, that you're putting it off because you're lazy cuz you don't wanna do hard work. **And that's not it. That's just not it.**"* —— Brave UX Ep.015 [一手]
- **我的推断**：[推断] 这本写作书是他**唯一一个没有外部截止时间的项目**，而他已经反复自证"没有 deadline 我就不会开始"。所以它无限延期的原因不是能力问题，而是**他拒绝了那个唯一对他有效的机制**。他自己显然也知道这一点（"the irony, it's really thick"）。
- **来源**：https://sensible.com/the-book-about-writing/ ；https://thespaceinbetween.co.nz/brave-ux-podcast/015-steve-krug

### D35｜第 4 版的 AI 章节立场：AI 是动力转向，不是替代品
- **时间**：2026
- **他给出的理由（原话+出处，会议要点记录）**：
  - "**AI will serve as power steering in UX work, speeding tasks but not fully replacing human judgment.**"
  - "**Simulated users and AI-generated personas are ineffective substitutes for watching real user interactions.**"
  - "UX professionals must **maintain ethical standards and advocate for users** amid economic and technological pressure."
  - "Steve Krug has been **secretly working on Don't Make Me Think 4.0 for 5-6 years**, planning release soon."
  —— Rosenfeld「Advancing Research 2026」对谈要点（他与 Lou Rosenfeld 对谈）https://rosenverse.rosenfeldmedia.com/videos/dont-make-me-think-30-what-endures-and-what-evolves-in-ux [一手·官方要点]
- 与此一致的另一句：*"It's gotten worse, and I think it will get even worse with AI."*（指真正需要办的事越来越难办） —— Business Insider 2026 [一手]
- **我的推断**：[推断] 他的 AI 立场是**其方法论的直接推论**：既然"设计者无法判断自己的作品"，那么"模拟用户"就是**再次用想象替代观察**——正是他一辈子反对的那件事。所以他对 AI 的限制不是技术判断，是**认识论判断**。
- **来源**：https://rosenverse.rosenfeldmedia.com/videos/dont-make-me-think-30-what-endures-and-what-evolves-in-ux ；https://b17news.com/the-tao-of-steve-krug/

### D36｜"半退休"的实际内容
- **时间**：约 2014 起，2020 年被第三方描述为 semi-retired
- **他给出的理由（原话+出处）**：见 D8（不接公开工作坊、只做企业内训；时间用于写作）
- **事后反思**：2026 年他的日程被记者描述为：*"spends much of his time at home in Brookline, Massachusetts, spending time with his wife and watching procedurals like 'Law and Order.' **He jokes that his days are filled with canceling subscriptions and Googling symptoms.**"* —— Business Insider 2026 [二手·引其自述]
- **我的推断**：[推断] 他**没有正式宣布退休**，也**没有正式宣布停止咨询**。所以"是否退休"这个问题的准确答案是：**[存疑]** 公开资料只能支持"不再接公开工作坊/客户项目、时间主要投给写作"，"完全退休"无一手确认。
- **来源**：https://b17news.com/the-tao-of-steve-krug/ ；https://sensible.com/all-the-faq-lists-from-my-site/

---

## 7. 信息不足处 / 未解决项（供后续 Agent 补）

1. **第 2 版（2006）为什么出、改了什么**：本次未取得第 2 版前言一手文本。已知只新增无障碍章节（他自述）。**建议补**：第 2 版 PDF 前言（本次找到过可读 PDF：https://cd.massart.edu/wp-content/uploads/2021/09/Dont_Make_Me_Think_A_Common_Sense_Approach_to_Web_Usability_2nd_Ed_2005.pdf ，但抓取工具不支持 PDF，需能读 PDF 的执行侧处理）。
2. **"为什么不雇人 / 不扩张公司"**：他**从未公开正面解释**。本次结论（性格约束、以写书替代规模化）为 [推断]。
3. **"上午测、下午改"的原始措辞**：未找到他本人使用该短语的一手出处。可确认的一手表述是书第 3 章标题 "A morning a month, that's all we ask"。**引用时请勿当作引语。**
4. **1998 年创立公司的确切日期与"为什么此时创业"**：1997 年官网已存在版权记录，1998 是常见说法，他本人未给过这条转折的解释。**触发式推断**：从 Symantec 的项目转为独立身份，是**被动接活变成常态收入后自然形成**，而非主动创业宣言。
5. **第 4 版的 AI 章节具体内容**：2026-11-30 才出版，目前仅有官方描述与会议要点，无正文。
6. **"UX 变成一个大部门 / 设计师不做研究 / 测试被当成审计"** 这三条简报提到的话术：本次找到的**可引用一手内容**是 D28（角色争夺 + "design" 一词崩坏）与 D18（反对"顾问写报告"的旧模型）。**"可用性测试被当成审计"这一说法未找到他本人原话，请勿当引语使用。**
7. **第 3 版里"移动端"部分的取舍**：有读者（Alex SG，2023-05-30 官网评论）认为第 3 版"过于迎合移动端潮流，不如第 2 版普适"——这是**读者对第 3 版的批评**，他本人未回应。可作"被质疑的决策"补充素材 —— https://sensible.com/you-say-potato-i-say-focus-group/ [二手·读者评论]

---

## 8. 一句话收束

他一生没做过"规划型决策"。每一次转折都由**外部邀请 + 手上这件事让他看见了别的东西**触发（朋友介绍工作 → 写手册看见界面问题 → 朋友老板要了解用户 → 被邀写书 → 被邀做播客）。他的所有方法论取舍都服从同一个目标函数：**让那件正确的事真的发生**——哪怕代价是把样本量降到 3 个、把自己的咨询服务写进一本免费手册、把"不想再更新"变成一次自我欺骗式的偷偷开工。
