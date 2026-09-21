# Don Norman（唐·诺曼）他者视角、书评、批评与学术争议

> 调研范围：HCI / 交互设计学术界批评、同行对比、书评正反两面、行业争议、外部观察到的思维模式、辩护与回应。
> 信源分级：**[一手]** = 批评者原文 / 论文 / 书评原文 / 采访转录；**[二手]** = 他人转述或聚合；**[推断]** = 萧潇的判断，非任何来源的立场。
> 采集方式：全部经联网检索与原文抓取，未使用训练语料推断观点。
> 黑名单执行：未采用知乎、微信公众号、百度百科、百度知道。

---

## 一、学术批评（按论点分组）

### 1.1 affordance 挪用之争：Gibson 的原义 vs Norman 的通俗化

**批评要点**：Norman 把 J.J. Gibson 的 affordance 从「独立于感知者存在的行动可能性」改写成「被感知到的属性」，这个改写是整个 UCD / UX 范式的基石之一，也被认为是此后三十年术语混乱的源头。

- Olia Lialina 在 2018 年 Akademie Schloss Solitude「Rethinking Affordance」研讨会的主题演讲《Once Again, The Doorknob: On Affordance, Forgiveness and Ambiguity in Human Computer and Human Robot Interaction》中，用一张对照表把两者并列 —— **Gibson's Affordances**：环境中的给予 / 行动可能性，独立于行动者的经验、知识、文化或感知能力，存在是二元的（有或没有）；**Norman's Affordances**：被感知的属性（可能实际并不存在）、关于如何使用的线索与暗示、可依赖行动者的经验文化、可使动作变难或变易。 —— [一手] https://contemporary-home-computing.org/affordance/ ；期刊版 https://mediatheoryjournal.org/2019/07/17/olia-lialina-once-again-the-doorknob/
- Lialina 明确写道，Norman 后来「承认误读了这个词，修正为 'perceived affordances'，并为引发这场混乱和术语贬值而致歉」。她引 Norman 1999 年原文作证：「Far too often I hear graphic designers claim that they have added an affordance to the screen design when they have done nothing of the sort… It is a symbolic communication, one that works only if it follows a convention understood by the user.」 —— [一手]（Norman 原文，经 Lialina 转引）https://jnd.org/affordance-conventions-and-design-part-2
- Lialina 的引申批评更重：她认为「对 affordance 的追问并不无辜」，因为 affordance 是 UCD 范式的基石，而 UCD 与 UX 都是 Norman 在 1980 年代中期到 1993 年（他出任 Apple 研究负责人）之间推起来的，「UX 吞掉了其他理解界面是什么、可以是什么的方式」。她并引 Bruno Latour 1992《Where Are the Missing Masses?》的「门」一节、以及 Brenda Laurel 关于门把手「beaming complexity, control and power」「谁对谁做什么」的论述，来拆解 Norman「门把手应当简单、明显、直觉」的预设。 —— [一手]
- 术语后果：Lialina 记录 2018 年 uxplanet 一篇《How to use affordances in UX》把 affordance 当成菜单、按钮、插图、Logo、照片的同义词，并沿引一篇列出「explicit / hidden / pattern / metaphorical / false / negative」六种 affordance 的文章，称之为「affordance clownery」（affordance 小丑戏）。 —— [一手]

**同期学术文献（真实存在，已核验题录）**：

- Joanna McGrenere & Wayne Ho (2000)《Affordances: Clarifying and Evolving a Concept》，Graphics Interface 2000。DOI 已核验：https://doi.org/10.20380/gi2000.24 ；PDF：https://www.cs.ubc.ca/labs/edapt/papers/mcGrenere2000_3.pdf 。核心区分（经 Lialina 转引原话）：「Norman […] is specifically interested in manipulating or designing the environment」；「Unlike Norman's inclusion of an object's perceived properties… a Gibsonian affordance is independent of the actor's ability to perceive it.」 —— [一手·论文存在已核验，引文经 Lialina 转引；PDF 为 application/pdf，本轮未能直读全文]
- Rex Hartson (2003)《Cognitive, physical, sensory, and functional affordances in interaction design》，*Behaviour & Information Technology* 22(5): 315–338。题录核验：https://www.semanticscholar.org/paper/0e693b0dcac042d1845e848ecb45a93324524672 ；摘要页 http://www.worldcat.org/oclc/362929251 明确写「In reaction to Norman's (1999) essay on misuse of the term affordance in human-computer interaction literature」。 —— [一手·期刊]
  - **Hartson 与 Norman 的实质分歧**：Norman 认为 GUI 中不存在 real/physical affordance ——「Sure, you can click on the object, but you can click anywhere」(p. 40)；Hartson 则「treating active interface objects on the screen, for example, as real physical objects」(p. 319)，并主张 physical affordance 必须带上「utility / purposeful action」这一强制成分。 —— [一手·经 murb 书评转引原话] https://murb.nl/articles/52-affordances
- Maarten Brouwers (murb) 的评述进一步主张：「cognitive affordance」本身是 **contradictio in terminis**（术语自相矛盾）—— affordance 概念建立在知觉与行动的直连、绕过意识加工之上，而 cognitive affordance 恰恰要求意识加工。 —— [一手·个人博客，非同行评议，权威性低]
- Norman 本人 1999 年的收尾文章：《Affordance, Conventions and Design》，*Interactions*，1999 年 5–6 月号，pp. 38–43。 —— [一手] https://interactions.acm.org/archive/view/may-june-1999/affordance-conventions-and-design1

### 1.2 对 user-centered design 的批评

- **Liam Bannon《From Human Factors to Human Actors: The Role of Psychology and Human-Computer Interaction Studies in System Design》**（收于 *Human-Computer Interaction*，1995；ACM DL 记录 1995-06-01）。核心批评：user-centered design 仍然把人当作「因素 / 环境变量」来调节，而非把人当作有意图、会重新设计自己工作方式的「行动者（actors）」。题录：https://dl.acm.org/doi/10.5555/212925.212945 ；https://www.semanticscholar.org/paper/82dc71e514eb6331e5c8c60535048d4012b4d973 —— [一手·论文，题录与摘要已核验；正文原句未直读]
- Bannon 2011《Reimagining HCI: Toward a More Human-Centered Perspective》，*Interactions* 18(4): 50–57，DOI 10.1145/1978822.1978833。 —— [一手·论文，经 Gorichanaz (2024) 参考文献核验]
- **Tim Gorichanaz (2024)《Toward Humanity-Centered Design without Hubris》**，CHI 2024，DOI 10.1145/3613905.3644060，预印本 arXiv:2402.11576。这是本轮找到的**最直接、最系统的学术批评**，关键词自列包含「Don Norman, critique」。其梳理的既有 HCD 批评谱系如下（均出自该文第 2 节，Gorichanaz 原文转述）：
  - HCD「may be superficially or incorrectly applied, for instance by focusing on narrowly-defined user tasks rather than more contextualized human activities」—— 出处自列：Gasson (2003)、Norman (2005)、Bannon (2011)。 —— [一手]
  - HCD「creates products for the marketplace, serving short-term desires rather than long-term human futures, meaning or connection」—— 出处自列：Chapman (2021)、**Dunne and Raby (2013)《Speculative Everything》**。 —— [一手]
  - 「innovation itself is considered progress, disincentivizing systemic change」—— 出处自列：Harris (2021)《Innovation is the New Black Box: A Critical Review of Human-centered Design》（硕士论文，Texas State University）。 —— [一手]
  - HCD「overly anthropocentric, not attending to the needs of our planet and other species」—— 出处自列：Wakkary (2021)。 —— [一手]
  - 普遍主义作为设计取向「has been even called harmful, as it erases the meaningful distinctions across certain groups」—— 出处自列：Costanza-Chock (2020)《Design Justice》(MIT Press)。 —— [一手]
  **来源**：https://arxiv.org/html/2402.11576
- **批判性设计（critical / speculative design）路线对 HCD 的批评**（Dunne & Raby 一线）：把设计区分为「affirmative design（强化现状）」与「critical design」。Lialina 与 Gorichanaz 均将其作为对 HCD「服务市场、短期欲望、而非长期人类未来」的批评来源。原典：Anthony Dunne & Fiona Raby《Speculative Everything: Design, Fiction, and Social Dreaming》(MIT Press, 2013)；Anthony Dunne《Hertzian Tales》(1998)。 —— [一手·专著] https://readings.design/PDF/speculative-everything.pdf ；出版物说明 https://dunneandraby.co.uk/content/bydandr/13/0
- **对 design thinking 的保守性批评**：Natasha Iskander（NYU 城市规划与公共服务副教授），《Design Thinking Is Fundamentally Conservative and Preserves the Status Quo》，*Harvard Business Review*，2018-09-05。原文摘要句：「Design thinking is, at its core, a strategy to preserve and defend the status-quo – and an old strategy at that. Design thinking privileges the designer above the people she serves.」文中并指出对 design thinking 的怀疑已渗入商业媒体与教育刊物。 —— [一手] https://hbr.org/2018/09/design-thinking-is-fundamentally-conservative-and-preserves-the-status-quo
  - 注：此批评的靶心是「design thinking」这一运动（含 IDEO 路线），不是 Norman 个人；Norman 对该词的立场见 §4。 —— [推断]

### 1.3 《Human-Centered Design Considered Harmful》一文引发的争论

- 原文：Donald A. Norman，《Human-Centered Design Considered Harmful》，*Interactions* 12(4)，2005 年 7–8 月，pp. 14–19，DOI 10.1145/1070960.1070976。作者授权全文：https://jnd.org/human-centered-design-considered-harmful/ —— [一手]
- **争论规模有 Norman 自述为证**：「Many have had difficulty with my article… *(Hah, that's an understatement! There must be 500 comments and blogs posted about it.)*」他并描述了三类反应：有人认为他「完全推翻了过去所说的一切」，有人认为他「有点疯了（gone quite loony）」，还有人抢着替他解释他「一定是什么意思」。 —— [一手] https://jnd.org/hcd-harmful-a-clarification/
- **争议中的实质主张**（Norman 原话，均出自原文）：
  - 「None of this 'tools adapt to the people' nonsense — people adapt to the tools.」
  - 「Paradoxically, the best way to satisfy users is sometimes to ignore them.」
  - 「Sometimes what is needed is a design dictator who says, 'Ignore what users say: I know what's best for them.'」
  - 对 personas 与 scenarios 的正面攻击：「Look at those detailed scenarios and personas: honestly, now, did they really inform your design?」「I believe that we should increase our focus upon the tasks and activities to be accomplished and reduce the focus on these cute but design-empty scenarios and personas.」 —— [一手]
  - **这直接冲撞 Alan Cooper 的 goal-directed design / personas 路线**（Cooper《The Inmates Are Running the Asylum》1999；Cooper, Reimann & Cronin《About Face 3》2007, pp. 284–285，后者并被 Lialina 引作「forgiveness」术语来源）。 —— [一手·双方文本均可核验]
- **我未能核验到**署名公开反驳此文的独立文章（除 Norman 自己的澄清文）。因此「有哪些人如何反驳」这一项标注 **[未能验证]**，不代为填补。 —— [未能验证]

### 1.4 认知主义 vs 具身 / 现象学交互

- **Paul Dourish《Where the Action Is: The Foundations of Embodied Interaction》**（MIT Press, 2001，ISBN 9780262260619；预印本《Embodied Interaction: Exploring the Foundations of a New Approach to HCI》）。其框架把 HCI 区分为「信息处理 / 认知主义」传统与「具身 / 现象学」传统，批评前者把交互理解为表征（representations）的操纵。 —— [一手·专著] https://www.dourish.com/publications/misc/embodied.pdf ；https://mitpress.mit.edu/9780262260619/where-the-action-is/
- **Marshall & Hornecker《Theories of embodiment in HCI》**：明确写出认知主义范式的核心主张是「thinking is information-processing」。 —— [一手·章节] http://www.ehornecker.de/Papers/embodimentChapterSage.pdf
- **Harrison, Tatar & Sengers《The Three Paradigms of HCI》**（alt.CHI 2007；期刊扩写版《Making epistemological trouble: Third-paradigm HCI as successor science》，*Interacting with Computers* 23(5): 385–392, 2011，DOI 10.1145/1182475.1182476 为 Bødker 相关篇目）。该文把 HCI 划为三范式：Human-Factors、Classical Cognitivism / Information Processing、以及现象学取向的第三范式，并主张第三范式是「successor science」。 —— [一手·论文] https://people.cs.vt.edu/srh/Downloads/TheThreeParadigmsofHCI.pdf
  - **注意区分**：Norman 所代表的正是其中的认知主义 / 信息处理范式，这是结构性定位；**我未核验该论文是否直接点名批评 Norman**，故「点名」一说标 **[推断]**，不当作该文原意。
- **Lucy Suchman《Plans and Situated Actions》(1987)** 常被列为对认知主义计划模型的经典批评。**本轮未能联网核验 Suchman 对 Norman 的直接批评原文或引文**，故不写入作为证据。 —— [未能验证]

### 1.5 对 Norman「humanity-centered design」转向的批评（最直接的当代学术批评）

**Tim Gorichanaz (2024)《Toward Humanity-Centered Design without Hubris》**（CHI 2024，arXiv:2402.11576）。批评要点（均出自原文）：

- 总判断：humanity-centered design（由 Norman 2023《Design for a Better World》系统化）虽动机可嘉，但「current articulations… are incoherent in a number of ways」，而这些不一致「can be boiled down to a tendency toward hubris（一种自大 / 僭越的倾向）」。
- 四组悖论：
  1. **普遍主义 vs 地方主义**：Norman 一方面用「humanity」指「世界人口层级」，隐含单一方案适用全人类；另一方面又「calls for local solutions rather than universal ones」——「the call for both universalism and localism may be an impossible circle to square」。
  2. **革命 vs 渐进**：这一条被认为**可以化解**——Norman 自己写「We can address large issues through a multitude of small, flexible projects」(p. 54)。
  3. **长期主义 vs 当下**：批评 longtermism 的假设（技术进步即好、停滞即坏、可用单一人类福祉指标），并指出「Future people are hypothetical, but people alive today are real」。
  4. **参与的不可行性**：humanity-centered design 要求「entire populations and ecosystems」参与设计，Gorichanaz 判定「It is simply intractable.」且「considering fewer participants… returns us to human-centered design as already understood」。
- 修辞类比：把此种设计抱负与 Elon Musk、Sam Bankman-Fried 的「messiah complex」并列，并引《经济学人》2023 年 12 月「Saving humanity is in vogue right now」。
- 替代方案：以 Christopher Alexander《The Oregon Experiment》(1975) 的 organic order / participation / piecemeal growth / patterns / diagnosis / coordination 六原则，提出「humble」版本 —— 分片、增量、模式驱动、对自己能控制的范围保持诚实。
- 该文关键词自列：`human-centered design, humanity-centered design, Don Norman, critique, Christopher Alexander`。 —— [一手] https://arxiv.org/html/2402.11576

**附带材料（书评侧，非学术期刊）**：
- Shriyash Shete（Design Research Society 书评，2023-11-08）对《Design for a Better World》整体高度正面，但承认：「Some critics may argue that Norman's principles, though well-intentioned, could be seen as overly idealistic, particularly when confronting entrenched corporate and political interests.」以及「certain areas could benefit from deeper exploration, particularly regarding the practical implementation of these design principles in resistant industries and governments.」 —— [一手] https://www.designresearchsociety.org/articles/book-review-design-for-a-better-world-by-don-norman-review-by-shriyash-shete
- *Issues in Science and Technology* 刊有书评《Design for a "Mess"》（Dhebar 撰）—— 题录与链接存在，**本轮抓取失败，正文未核验**。 —— [未能验证] https://issues.org/design-better-world-norman-review-dhebar

---

## 二、同行对比表

| 对象 | 关系性质 | 可核验的具体内容 | 来源与分级 |
|---|---|---|---|
| **Jakob Nielsen** | 合作者，共同创办 NN/g（1998） | 1998 年两人联署 UX 定义「'User experience' encompasses all aspects of the end-user's interaction with the company, its services, and its products.」；Norman 2013 修订版《DOET》仍以「my associate, Jakob Nielsen」引证五人可用性测试法 | [一手] https://www.nngroup.com/articles/definition-user-experience/ ；[一手·引文转引] https://books.max-nova.com/the-design-of-everyday-things/ |
| **Jakob Nielsen（分歧面）** | 侧重不同：Nielsen = usability engineering / 10 条启发式 / discount usability；Norman = 情感设计 → 系统与人类议题 | **本轮未找到两人相互公开批评的文本**。仅能确认分工与侧重差异 | [未能验证] 分歧；[推断] 侧重差异 |
| **Steve Krug**（《Don't Make Me Think》） | 实践层 vs 理论层 | r/webdev 一条获 57 赞的评论把 Krug 定位为网页 UX 思维的「practical genesis」，Norman 提供其下的「theoretical layer」；汇总站点总结为「If you're building web products now, start with Krug」 | [二手·Reddit 聚合] https://booksreddit.com/book/design-of-everyday-things |
| **Alan Cooper** | **有可核验的公开分歧** | Norman 2005 直接批 personas 为「cute but design-empty」且「potentially harmful」；Cooper 路线（《The Inmates Are Running the Asylum》1999、goal-directed design、personas）以 personas 为核心方法 | [一手·Norman 原文] https://jnd.org/human-centered-design-considered-harmful/ ；[一手·Cooper 著作] https://pne.people.si.umich.edu/kellogg/033b.html |
| **Bruce Tognazzini（Tog）** | **合作而非分歧** | 2015 年两人联署《How Apple Is Giving Design A Bad Name》，共同批评 Apple iOS 指南删除了「forgiveness（可撤销性）」原则；Tog 自 1978 年起写过八个版本的 Apple Human Interface Guidelines | [一手] https://www.fastcompany.com/3053406/how-apple-is-giving-design-a-bad-name ；[一手·Lialina 转引] |
| **Jared Spool** | — | 本轮**未找到** Spool 对 Norman 的直接批评或对比文本 | [未能验证] |
| **Kim Goodwin** | — | 本轮**未找到** Goodwin 对 Norman 的直接批评文本；仅见其与 Spool 讨论 scenarios 的播客（2011），主题非批评 Norman | [未能验证] |
| **「只是把常识包装成理论」这一批评** | — | 本轮**未找到可溯源的署名批评原文**。语义最接近的、有出处的等价表述见：Max Nova 书评「a snail's-pace tour through excruciatingly obvious aspects of design」「very obvious and derivative」 | [未能验证] 该指控的原始出处；[一手] 等价表述 https://books.max-nova.com/the-design-of-everyday-things/ |

---

## 三、书评正反两面

### 3.1 正面

- **UXmatters，D. Ben Woods（2021-03-22）**：「*The Design of Everyday Things* is required reading for anyone who is interested in the user experience. I personally like to reread it every year or two.」并强调其原则跨行业可迁移：「If you know the basics of design better than anyone else, you can apply them flawlessly anywhere.」文中还记录 Norman 去三平岛时「was not a nuclear engineer… 正因为他没有泡在核电站建造的细节里，才更容易摆脱导致该厂设计的那些假设」。 —— [一手] https://www.uxmatters.com/mt/archives/2021/03/book-review-the-design-of-everyday-things.php
- **Cosma Shalizi，The Bactra Review（1995 / 1997）**：评初版《The Psychology of Everyday Things》：「if he is sometimes meandering, if he sometimes sounds like a man holding forth over a beer or two, he is unfailingly clear, easy, and worth listening to.（我怀疑他是个快乐的醉汉。）」同时指出一个关键保留：「The one really important question he does not consider is whether they will be [applied].」— 拦路的是设计师的虚荣、用户从众，以及「the imperatives of consumer capitalism」。 —— [一手] https://bactra.org/reviews/everyday-things/
- **社区聚合（BooksReddit）**：46 次提及、8 个子版、1,803 累计赞；情绪均值为 **+0.55**（−1…+1 区间），30 条有立场摘录中 18 正 1 负。r/programming 贡献最多实质讨论（一条 183 赞评论称此书把 NTSB 事故从「用户错误」重构为「设计失败」）。 —— [二手·自建聚合站，方法论页自述] https://booksreddit.com/book/design-of-everyday-things
- Askeladden Capital（2025）：「Absolutely brilliant from start to finish, eminently readable.」 —— [一手] https://askeladdencapital.com/don-normans-the-design-of-everyday-things-book-review-notes-analysis
- *Wired* 1993 年对 Norman 的报道，引其原话：「I am delivering a message of warning, but accompanied by hope, not despair.」属报道而非批评。 —— [一手] https://www.wired.com/1993/03/press-3-if-you-want-this-response-system-to-self-destruct/

### 3.2 负面

- **Max Nova（2016-04-24，评 2013 修订版）**：「*The Design of Everyday Things: Revised and Expanded Edition* is a disappointment.」「for the most part, this book reads like an snail's-pace tour through excruciatingly obvious aspects of design.」「Overall though, the book felt very obvious and derivative. Maybe it was original when it was first published, but I doubt it's worth reading today.」 —— [一手] https://books.max-nova.com/the-design-of-everyday-things/
- **Russ Allbery（2016-10-23，评分 6/10）**：多条独立批评 ——
  - 「Norman hammers on the unacceptability of bad design to the point of tedium」；
  - 「**Norman acknowledges this, writes about it at some length, and then seems to ignore the point entirely**」—— 即他承认「购买者 ≠ 使用者」这一激励错配，随后完全绕开，回到「ranting about the deficiencies of obviously poor design」；Allbery 称这是他读到的「this foundational of a book 里最怪异、最肤浅的地方」；
  - 「Throughout, Norman is remarkably high-handed in his dismissal of bad design… still left me with the impression that **he believes most design failures stem from laziness and stupidity**. The negativity and frustration got a bit tedious by the middle of the book.」
  - 结论：「I found it a bit tedious, a bit too arrogant, and weirdly unconcerned with feasible solutions to the challenge of mismatched incentives.」 —— [一手] https://www.eyrie.org/~eagle/reviews/books/0-465-05065-4.html
- **Ben Nguyen，Compulsive Reader（2026-09-03，评分 3/5「three Norman doors」）** —— 本轮找到的**结构最细的负面书评**，抓两条：
  - **框架崩塌**：前五章用 affordance / signifier / mapping / conceptual model 建立连贯系统，但「in the last two chapters, which shift to design thinking and the world of business, the core vocabulary disappears… It breaks down the framework he has built over the first five chapters.」他判断这本书「承诺写给所有人，实际写给设计行业」；引原文「It is the duty of machines and those who design them to understand people」(p. 6)，指出这句话只给了设计师可执行的动作，普通读者只获得情绪上的「被看见」。
  - **语气自相矛盾**：第 1 章以「taught helplessness」把问题抬到伦理与心理伤害层面，第 7 章却退回到「markets are complicated, companies face pressure… be patient」；并引「The realities of the world impose severe constraints… Compromises must be made by all involved」(p. 258)，认为这句「quietly undercuts the framework he has spent the book building」。 —— [一手] https://compulsivereader.com/2026/09/03/a-review-of-the-design-of-everyday-things-by-don-norman/
- **Reddit r/userexperience（2022-04-27）**：帖子标题即结论——《Review of The Design of Everyday Things: there are better sources nowadays》。摘要：「I find Norman's writing lengthy and tedious; too many pages were wasted explaining boring personal anecdotes.」 —— [一手·帖子标题与检索摘要；正文因 reddit 域名解析受限未获全文] https://www.reddit.com/r/userexperience/comments/ud8ni6/review_of_the_design_of_everyday_things_there_are/
- **社区聚合中的负向信号（BooksReddit）**：r/webdev 有 ↑68 的敌意评论（原文：「If someone says the design of everyday things I will track them down and shove that book up their bums」）；r/gamedev 与 r/webdev 情绪中性，判断为「too abstract to change daily workflow」；提及量 2021（11 次）、2022（10 次）见顶，2023 年跌到 1 次后未恢复，「which is not the trajectory of a living reference」。 —— [二手] https://booksreddit.com/book/design-of-everyday-things
- **对《Design for a Better World》的读者负评**：Goodreads 一条被检索摘出的评论开头为「In my opinion, *Design for a Better World* is not as good a book as the ones I have just quoted. It is simplistic to the p…」—— **仅获检索摘要片段，正文未能抓取（goodreads 域名解析为内网 IP）**。 —— [未能验证·仅片段] https://goodreads.com/book/show/61354734-design-for-a-better-world
- **「啰嗦 / 重复 / 案例老 / 说教 / 对复杂性过于乐观 / 2013 修订版只是加了新例子」这些常见差评点**：本轮**分别核验到**「tedious、too arrogant」（Allbery）、「obvious and derivative，疑不值得今天再读」（Nova）、「冗长、浪费篇幅讲私人轶事」（Reddit）、「最后两章框架崩塌 + 承诺读者与实际读者不符」（Nguyen）；但**没有找到**一条同时覆盖「案例老」「说教」「对复杂性处理过于乐观」的可溯源公开书评原文。后三点标 **[未能验证]**，不代为填充。
- **主要媒体书评（NYT / Guardian / Wired / The Atlantic）**：本轮**未能核验到**这些媒体对 Norman 的负面书评。核验到的媒体侧只有：*Wired* 1993 年报道（中性偏正）、Fast Company 2013 年（Norman 与 Tog 合写）、Fast Company 2023 年（见 §4）。Technology and Culture 2015 年书评题录存在（DOI 10.1353/tech.2015.0104），**正文未获取**。 —— [未能验证]

---

## 四、行业争议

### 4.1 design thinking：Norman 的自我翻转本身就是争议

- 《Design Thinking: A Useful Myth》（Core77 / jnd.org，2010-06-28）：Norman 说这个神话「pervasive and persuasive… although it is relatively harmless, it is false」，因为设计思维「is what creative people in all disciplines have always done」，并直指咨询公司的商业动机：「Because it serves the design consultancies well. Hire us, they say, and we will bring the magic of design companies to you.」「There is value in claiming to have a secret, powerful weapon.」
  文末是**最被引用的争议句**：「So, long live the phrase 'design thinking.' … Meanwhile **exploit the myth. Act as if you believe it. Just don't actually do so.**」 —— [一手] https://jnd.org/design-thinking-a-useful-myth/ ；NN/g 版 https://www.nngroup.com/articles/design-thinking-useful-myth
- 紧接着的第二篇《Rethinking Design Thinking》**正面翻转**：「The 'Design Thinking' label is **not** a myth. It is a description of the application of well-tried design process to new challenges.」Norman 自己在第一篇下方就预告：「In the first essay, I say it is a bad idea. In the second essay, I repent. It is a wonderful idea. Confused? Read the two essays.」 —— [一手] https://jnd.org/rethinking-design-thinking
- 外部对这一路线的批评见 §1.2 的 Iskander / HBR 一文。 —— [一手]

### 4.2 与 IDEO 路线的关系

- Norman 对「design thinking」的批评明确指向**设计咨询公司**整体（「Are design consultancies especially good at this effort?… Nope.」，但承认「they are outsiders」这一优势），未在《A Useful Myth》中逐一点名 IDEO。批评者（Punya Mishra 收录的版本注释）注意到 Norman 所指的 design thinking 就是「the IDEO style of design thinking」。 —— [一手·Norman 原文]；[二手·注释] https://www.punyamishra.com/wp-content/uploads/2017/09/02.-Norman-Design-Thinking_-A-Useful-Myth-.pdf

### 4.3 「UX 已死 / UX 行业出问题」及其反弹

- **重要澄清**：本轮**未核验到 Norman 本人说过「UX 已死」**。可核验的是：NN/g 发布《UX Is Dead, Long Live UX》（针对「设计系统成熟 + AI 自动化让部分商业领袖认为 UX 投入不再必要」这一论调）；LinkedIn 上 Jeff Bryant（2024-09-27）以「UX is dead. At least the UX defined by the one who coined the term, Don Norman.」为题发文。 —— [一手·NN/g] https://www.nngroup.com/ ；[二手·LinkedIn 帖子] https://www.linkedin.com/posts/leadbydesign_activity-7245482634288488448-YRdZ
- 反弹侧的署名文章：UX Magazine《Design Isn't Dead. You Sound Dumb》（2025-05-15），指「Every few months, someone declares that design is dead — but the real issue is a deep misunderstanding of what design actually does.」 —— [一手] https://uxmag.com/articles/design-isnt-dead-you-sound-dumb
- 相关争议：Norman 名言「95% of design schools train people for jobs that won't exist」，导向「设计教育应与工程、商业、心理学联姻」及四类设计师（performance / systemic / contextual / global）的分类。 —— [二手·Zurb Radar 2026-08-18 转述 ixd.org 采访] https://radar.zurb.com/article/norman-95-of-design-schools-train-people-for-jobs-that-wont-exist

### 4.4 Fast Company 2023《The problem with Don Norman》——行业争议的顶点

- 文章：Fast Company，2023-03-21，https://www.fastcompany.com/90868431/the-problem-with-don-norman 。**本轮正文抓取被 403 拦截**（页面要求启用 JS 并关闭广告拦截；archive 与文本代理均失败）。
- 可核验的部分仅限**标题与导语**（经检索摘要与 HN 条目双重确认）：标题《The problem with Don Norman's new book》；导语「Don Norman has built a career by writing about things he didn't understand.」以及「With the release of his latest book, *Design for a Better World*, Norman champions plenty of the right ideas. So why can…」。 —— [一手·仅标题与导语]
- **正文论点不可核验 → [未能验证]。不代为展开，不虚构其论证。**
- **HN 讨论（story id 35266547，4 points）只有一条评论，且该评论反过来批评这篇文章**（用户 taeric，2023-03-22）：
  - 「As someone that is not a huge fan of *The Design of Everyday Things*, I went in to this article expecting substance. Instead, I seem to have just read a rehash of many grievances against Don Norman?」
  - 「this is literally saying that the problem with the book is the author. Without giving many examples of where it is bad? Examples of it being inaccurate anywhere?」
  - 唯一认可的一点是文风批评「his insights can feel more like a summary of discrete problems than a unified blueprint for progress」，但认为文章随后「the entire rest of the article is… not about the book, but about the author」。
  - 结论：应改题为《My problem with Don Norman's new book》。 —— [一手·HN 评论] https://news.ycombinator.com/item?id=35266849
- Reddit r/userexperience 转载贴下的一条反应：「I feel like I wasted a lot of time reading his books. Extremely boring to read, and always out of…」 —— [二手·检索摘要，正文未抓取] https://www.reddit.com/r/userexperience/comments/11xpkx0/the_problem_with_don_norman_fast_company_article/

### 4.5 「理论被简化成 checklist」

- **可核验的相关事实**：Norman 与 Nielsen 同属 Nielsen Norman Group 谱系，而 Nielsen 的「10 条可用性启发式」（1994）与启发式评估法长期受到学术批评本身 —— 例如 Petrie & Findlater (2012)《What do users really care about?: a comparison of usability problems found by users and experts on highly interactive websites》（CHI 2012，DOI 10.1145/2207676.2208363）开门见山写「Expert evaluation methods, such as heuristic evaluation, are still popular **in spite of numerous criticisms** of them」；另有 e-learning 启发式比较研究指出「heuristic evaluation does not provide a systematic way to generate solutions to the usability problems」（DOI 10.1108/10650741211192046）。 —— [一手·论文题录与摘要]
- **我的推断**：把上述对「启发式清单化」的批评**归因到 Norman 个人**，缺乏直接文本证据 —— Norman 本人的七项原则（discoverability / feedback / conceptual model / affordances / signifiers / mappings / constraints）与 Nielsen 的十条启发式是两套不同清单。因此「批评者认为他的理论在实践中被简化成 checklist」这一条，我只能标注为 **[推断]**，不宣称存在这样的署名批评者。 —— [推断]

### 4.6 「对密集信息界面、企业级软件、复杂系统指导不足」

- **本轮未找到**直接这样批评的署名来源 → **[未能验证]**。
- 但找到一条**Norman 本人的自认**，方向一致：「The problem, however, is that HCD has developed as a limited view of design. Instead of looking at a person's entire activity, it has primarily focused upon **page-by-page analysis, screen-by-screen**. As a result, sequences, interruptions, ill-defined goals — all the aspects of real activities, have been ignored.」 —— [一手] https://jnd.org/hcd-harmful-a-clarification/
- 一条相关的实践侧观察（非批评 Norman 本人，但同向）：Lialina 记录她的前学生、后来的 SAP 高级 UX 设计师 Johannes Osterhoff 对 UX 的定义 —— 面对「complicated tools that take a long time to develop and refine」，UX 是一整套跨学科的长周期措施，而非「漂亮的界面」。 —— [一手]

---

## 五、被外部观察到的思维模式

以下每条均有可溯源的他人描述或 Norman 自述转录；标注区分「他人观察」与「Norman 自述」。

1. **从具体事故 / 灾难案例出发，且从「错在哪」而非「谁错了」入手**
   - Norman 自述三平岛调查的转折点（Kent C. Dodds《Chats with Kent》第 7 季第 6 集转录，2026-04-22）：「I was called in with a committee to look at why the operators made so many errors… And the committee, we looked at it and we said, **they were pretty intelligent. They did the best thing possible. It was the design that was so crappy.** And I had never really heard of design as a field.」 —— [一手·采访转录] https://kentcdodds.com/chats/07/06/watch-users-fix-systems-and-design-for-humanity-product-engineering-with-don-norman
   - 他人观察（UXmatters）：他之所以能看清三平岛问题，恰恰因为他「不是核工程师」。 —— [一手]
   - 他人分析（Blake Crosley）：他的方法是**取证式的（forensic）**：「the error is evidence, and the evidence points to the design.」 —— [二手·分析文章] https://blakecrosley.com/blog/design-philosophy-don-norman
2. **系统归因而非个人归因** —— 核心句式「Human error? No, bad design.」「mode error is really design error.」Norman 原文（《DOET》修订版，经 Max Nova 书评逐条转录）：「Most industrial accidents are caused by human error: estimates range between 75 and 95 percent. How is it that so many people are so incompetent? Answer: They aren't. It's a design problem.」 —— [一手·引文转引] https://books.max-nova.com/the-design-of-everyday-things/
3. **反对责怪用户** —— 「Do not blame people when they fail to use your products properly. Take people's difficulties as signifiers of where the product can be improved.」 —— [一手·引文转引]
4. **方法上强调「观察而不询问」** —— Norman 自述：「don't ask them. Don't ask somebody what's the problem, because they'll tell you the symptoms… Usually, when we watch and we discover things that we can do, what we find is they're doing a whole bunch of other stuff… they just assume it's required. So they will never tell you.」（Kent 播客） —— [一手]
5. **跨领域移植式创新（自述方法论）** —— 「I like to work in an area, in a new area, bring in my outlandish crazy ideas, which are simply taken from another field. That's all. They were everyday ideas in one field and novel in this new one… And then I say, okay, time for me to leave.」（Kent 播客） —— [一手]
   - 这条自述解释了他职业生涯里反复的「换赛道」：心理学 → 认知科学 → Apple → NN/g → 线上 MBA → 西北大学 → Design Lab → humanity-centered。 —— [推断]
6. **反精英主义 / 拒绝权威姿态（但方式常被误读为傲慢）** —— 他给企业高管讲课时拒绝提供考试范围和讲义，学生投诉「We're not paying all this money to hear from our stupid students」，第二年却邀请他进顾问委员会。 —— [一手·采访转录]
7. **公开的自我修正倾向** —— 「I learn more by being wrong than by being right. When people praise my ideas it is nice to hear, but I don't learn anything. If people disagree, I learn.」（转引 jnd.org） —— [二手·转引]
8. **拒绝预测未来，偏好「多试错 + 记学习账」** —— 「there's a famous saying that's been said now for hundreds of years, the best way to predict the future is to create it. But the problem is, **no, that's false.** Lots of people create what they think is the future and doesn't go any place.」（Kent 播客） —— [一手]

---

## 六、辩护与回应

### 6.1 Norman 本人的回应

- **对 affordance 之争**：1999 年收尾，区分 real affordance 与 perceived affordance，并预警术语贬值：「He would regret it when the term affordances was to be dropped for being too ill defined.」2013 年修订版改推「signifier」以区分「对象允许什么」与「什么在传达这件事」。 —— [一手·经 Lialina 与 murb 转引] https://murb.nl/articles/52-affordances
- **对 HCD harmful 之争**（2008-11-17 澄清文）：核心辩护是**连续性**而非转向 ——「I do not think this to be any change in what I have advocated. Rather, I see all my work as part of a coherent pattern, moving toward products and services that truly fit human needs.」同时他**让步**：「There has been far too much emphasis on individual people… I think much of this work misplaced, irrelevant, and potentially harmful」。 —— [一手] https://jnd.org/hcd-harmful-a-clarification/
- **对「忽略用户」的辩护逻辑**：他给的是「listen to customers, but don't always do what they say」，并以西南航空无视其乘客最热门的两项投诉（保留座位、跨航司行李转运）仍获成功为例；并援引 Apple 撤掉 HCI 团队、由单一「独裁式」负责人主导后产品「被认为是大设计的样板」。 —— [一手]
- **对 design thinking 的两篇立场**：见 §4.1。**两篇并存，未被 Norman 收回，矛盾保留。** —— [一手]

### 6.2 他人的辩护

- **HN 用户 taeric 对 Fast Company 那篇批评文章的**方法论反驳（详见 §4.4）：指出文章「literally saying that the problem with the book is the author」，未给出书中任何不准确的实例，属人身化的批评。 —— [一手·HN 评论]
- **Lialina 的「反向辩护」**：她明确说自己「显然在讽刺且不同意 Norman 提出的每一点」，却仍把《Why Interfaces Don't Work》列为她 interface design 课程的第一篇必读，理由是紧接在「The computer of the future should be invisible」之后的那一句 —— 「**The computer really is special: it is not just another mechanical device.**」她称之为 Norman 的「moment of weakness」，并指出「No one ever wants to refer to this moment of weakness」。 —— [一手] https://contemporary-home-computing.org/affordance/
- **实践者的辩护（社区侧）**：BooksReddit 语义聚类显示，该书在 r/programming、r/ExperiencedDevs、r/learnprogramming 被当作软件工程师的底层语汇来源（「affordances, signifiers, feedback」提供了「I don't like it」之外可辩论的语言）。 —— [二手]
- **跨域可迁移性的辩护**：UXmatters 与 Blake Crosley 均强调其五原则（affordances / signifiers / mapping / feedback / conceptual models）构成整个 UX 职业的词汇表，且该词汇表比生成它的团队更长寿（Norman 的 ATG 在 1997 年被 Jobs 关停，但他主张的 HCD 原则贯穿到 iPhone 时代）。 —— [一手] / [二手·分析]

### 6.3 矛盾点清单（保留不作调和）

1. **design thinking：神话 vs 不是神话。** Norman 第一篇说它「false」，并劝人「exploit the myth, act as if you believe it」；第二篇说它「is not a myth」。作者自己宣布「I repent」，两篇同时在线。 —— [一手·矛盾]
2. **术语自认误用 vs 术语继续以他的版本流行。** Norman 1999 年承认误读 Gibson 并推「signifier」，但据 Lialina 观察，2018 年 UX 圈仍把 affordance 用成「菜单 / 按钮 / 图片」的同义词，且他在 2014 年还说出「We can design in affordances of experiences」这样的话。 —— [一手·Lialina 引用 Norman 2014 原话]
3. **「别责怪用户」vs 「有时候必须无视用户」。** 同一作者：一方面写「Do not blame people when they fail to use your products properly」；另一方面写「Paradoxically, the best way to satisfy users is sometimes to ignore them」，并主张需要「a design dictator」。 —— [一手·矛盾]
4. **「设计应对糟糕设计零容忍」vs 「妥协是必须的」。** Nguyen 指出：第 1 章以「duty」「taught helplessness」把问题抬到伦理高度，第 7 章引「Compromises must be made by all involved」(p. 258) 自行降格。Allbery 也从另一角度指出同一裂缝：Norman 详述了「购买者≠使用者」的激励错配，然后「似乎完全忽略这一点」。 —— [一手·两位书评人独立指出同一处]
5. **「我只是把常识说出来」vs 「我有独创框架」。** Norman 自己说 design thinking 只是「good, old-fashioned creative thinking」，设计师「hardly unique」；但 Max Nova 从读者端看到的是反面结果 —— 因为常识被讲成理论，所以「obvious and derivative」。这两条并不互斥，但合起来构成一个可观察的循环。 —— [一手 + 一手，[推断] 关联]

---

## 附：本轮采集统计

- 引用 URL 条目：约 45 条（含 DOI 与题录页）
- [一手]：约 34 条（含学术论文题录/摘要、批评者原文、书评原文、采访转录、HN/Reddit 评论）
- [二手]：约 6 条（Reddit 聚合站、Zurb Radar 转述、LinkedIn 帖、播客论述转述、第三方分析文）
- [未能验证]：8 项，已在正文逐条标注（Suchman 对 Norman 的直接批评、NYT/Guardian/Atlantic 书评、Fast Company 2023 正文、Goodreads 正文、Technology and Culture 书评正文、Spool/Goodwin 对 Norman 的批评、「只是把常识包装成理论」的原始出处、「对密集信息界面指导不足」的署名来源、Norman 本人是否说过「UX 已死」）
- [推断]：4 处，均已在正文明确标为推断（Harrison et al. 是否点名 Norman、design thinking 批评与 Norman 个人的关联、启发式清单化批评归因、跨领域移植与职业换赛道的关系）
