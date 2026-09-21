# 04 · 他者视角、书评与批评

> 本文件的主体是**别人怎么说 Alan Cooper**，不是 Cooper 自己怎么说。
> 为便于对照，凡是 Cooper 本人的自立之词，一律放进独立小节并显式标注「说话人＝Cooper 本人」，条目下再列他人对同一命题的反驳。
> 可信度标注：**[一手]**＝批评者原话／原始书评／原始论文；**[二手]**＝他人转述、百科条目、聚合站；**[推断]**＝本文件依据已有材料作出的推论，非任何来源原话。
> 检索环境说明：本次调研中 `mralancooper.medium.com`（Cooper 本人 Medium 博客）与 `journals.sagepub.com` 正文页均无法抓取（DNS 解析/连接失败），涉及这两处的引用均依赖可抓取的镜像、二手条目或直接 PDF 链接残留文本，已逐条标注。

---

## 0. 结论先行

1. **对 persona 方法最硬的一手批评来自人因工程学界，不是设计圈**。Chapman & Milham（HFES 2006）给出的不是「做得不好」，而是「这个方法的两个核心主张——persona 承载真实用户信息、persona 带来更好产品——都没有实证支持，且 persona 无法被证伪」。这是全库最强的一条。
2. **第二硬的批评来自把 persona 当研究对象的设计研究圈**，落点是「还原论／刻板印象／去语境化」——Rönkkö、Portigal、Tesch & Tröndle、Cozzi & Overkamp、Eric Bailey。
3. **最激烈的批评针对的是 Cooper 本人，且集中在《Inmates》一书**——说他对程序员的描写是「几乎当作另一个物种」、是「糟糕的建议」、「应该被基本忽略」。Brikman 的书评是其中写得最完整的一篇一手批评。
4. **Cooper 对「persona 被滥用」的批评，和别人对 persona 的批评，方向相似但归因相反**：Cooper 说「那不是 persona」（坏的是执行）；批评者说「那就是 persona 方法内在缺陷的必然结果」（坏的是方法）。这一点**不予调和，两边并列保留**。
5. **敏捷圈的反驳是真实存在的、有原始记录的**：2002 年 Beck–Cooper 对谈中，Beck 明确反驳 Cooper「先完成设计再写代码」的立场，称其会造就「交互设计师成为瓶颈」和「层级化沟通结构」。
6. **本次调研未找到**：Cooper 前员工／同事公开的一手人格评价（Glassdoor 类站点不可抓取）；权威中文媒体报道（36氪/虎嗅/少数派/机器之心）对 Cooper 的批评性评述；他公开系统回应「persona 是伪科学」这一具体指控的原话。

---

## 1. 对 persona 方法的批评（重点）

### 1.1 「不是科学」——Chapman & Milham（全库最强批评）

**Christopher N. Chapman & Russell P. Milham, "The Personas' New Clothes: Methodological and Practical Arguments against a Popular Method", HFES 2006**
来源：https://journals.sagepub.com/doi/10.1177/154193120605000503 （正文页不可抓取）
PDF：https://cnchapman.files.wordpress.com/2007/03/chapman-milham-personas-hfes2006-0139-0330.pdf （PDF 直链不可读取）
作者自述页：https://cnchapman.wordpress.com/2009/02/08/personas/ · https://cnchapman.wordpress.com/2009/02/21/assessing-persona-prevalence-empirically/
可信度：**[一手]**（作者本人对其论文立场的复述）

他们本人的摘要立场（转引自可抓取的 Sage 摘要页与 Semantic Scholar 摘要）：
> "Personas cannot be adequately verified or falsified and therefore have no demonstrated scientific basis." **[一手]**（论文摘要原文）

作者在自己博客上对论文立场的复述，是本次能找到的最清楚的版本 **[一手]**：
> "Persona authors often make two claims: (1) personas present real information about users; and (2) using personas leads to better products. In a nutshell, we argue that neither claim has been supported by empirical evidence; rather, the claims for personas' utility are based on anecdotes, generally from their own authors or other interested parties (such as consultants selling them)."
> ——「persona 的作者们通常主张两件事：(1) persona 呈现了关于用户的真实信息；(2) 使用 persona 带来更好的产品。一言以蔽之，我们主张这两项主张都没有实证证据支持；相反，关于 persona 效用的主张建立在逸事之上，通常来自其作者本人或其他有利益相关方（例如靠卖 personae 赚钱的顾问）。」

同一篇博客里，作者还特意划出**他们不主张什么**（这一点对判断批评强度很关键） **[一手]**：
> "This does not mean that personas are bad, but they cannot be taken at face value. As researchers, we suggest that persona authors should either provide better evidence (and we suggest how) or make weaker claims."
> 「这并不意味着 persona 是坏的，但它不能被照单全收。作为研究者，我们建议 persona 的作者们要么提供更好的证据（我们给出了怎么做），要么把主张放弱。」

以及：
> "None of this says that personas are not inspiring or useful. It just says that they cannot be assumed to have verifiable information content, unless that is demonstrated empirically."
> 「这一切都不是说 persona 不具启发性或没有用。它只是说：除非经实证证明，否则不能假定 persona 具有可验证的信息内容。」

**延伸实证工作（同一批作者）**：Chapman, Love, Milham, ElRif, Alford, "Quantitative Evaluation of Personas as Information", HFES 2008
来源：https://quantuxbook.com/papers/REPRINT-HFES08-chapman-love-milham-elrif-alford.pdf
作者自述结论 **[一手]**：
> "once a description has more than a few attributes it describes few if any actual people"
> 「一旦一段描述包含超过少数几个属性，它就几乎不描述任何真实的人。」
方法论说明 **[一手]**：「我们用一个更严谨的公式，在真实数据（最多 10,000 名受访者）中比对 60,000 条随机生成的 persona 式描述，结果显示该公式优于随机猜测。」作者同时坦承这不是「persona 无用论」，而是「不能假定 persona 含有可验证信息」。

**[推断]** 这条批评的破坏力在于它攻击的是**认识论层面**而非执行层面：即使 Cooper 的顾问团队把 persona 做得很规范，Chapman–Milham 的批评仍然成立，因为他们质疑的不是「你做得够不够好」，而是「这个方法声称的东西能不能被检验」。

### 1.2 「刻板印象与政治」——Tesch & Tröndle

**Tesch, Tröndle, "Stereotypes and Politics: Reflections on Personas", CHI 2016**
来源：https://dl.acm.org/doi/10.1145/2858036.2858151
可信度：**[二手]**（本次仅取到 ACM 摘要页片段，正文未能全文抓取）
摘要片段：
> "Designers and other stakeholders extract information from these personas, form impressions of them and make inferences a[bout users]…"
**[推断]** 从标题与摘要片段看，该文的核心指控是：persona 会诱导干系人从虚构形象中「提取信息、形成印象、做出推断」——即以刻板印象替代真实数据，且这一过程带有政治性（谁被写进 persona、谁被排除）。

### 1.3 「去语境化」——Cozzi & Overkamp

**Emanuela Cozzi & Lennart Overkamp, "Beware the Cut 'n' Paste Persona", A List Apart, 2021-05-06**
来源：https://alistapart.com/article/beware-the-cut-n-paste-persona/
可信度：**[一手]**（原文完整可读）

> "Ironically, the website highlights the core issue of this very common design method: _the person(a) does not exist_. Like the pictures, personas are artificially made. Information is taken out of natural context and recombined into an isolated snapshot that's detached from reality."
> 「讽刺的是，这个网站点出了这种极常见设计方法的核心问题：**那个人（persona）并不存在**。和那些图片一样，persona 是人造物。信息被抽离出自然语境，再重组为一张脱离现实的孤立快照。」

> "In their attempt to simplify reality, personas do not take this variability into account; they present a user as a fixed set of features. Like personality tests, personas snatch people away from real life. Even worse, people are reduced to a label and categorized as 'that kind of person' with no means to exercise their innate flexibility. This practice reinforces stereotypes, lowers diversity, and doesn't reflect reality."
> 「在简化现实的努力中，persona 不考虑这种可变性；它把用户呈现为一组固定的特征。就像人格测验一样，persona 把人从真实生活中拽走。更糟的是，人被化约成一个标签、被归类为『那种人』，无从行使自身固有的灵活性。这种做法强化刻板印象、降低多样性，且不反映现实。」

> "A well-known critique to this aspect of personas is that _the average person does not exist_"
> 「针对 persona 这一方面的一个著名批评是：**平均人并不存在**。」（作者援引美国空军按 140 名飞行员身体尺寸均值设计座椅、结果没有一个飞行员能坐进那张「平均座椅」的案例）

作者提出的替代方案：**Dynamic Selves**——不做人格合成，把每一个真实个体在多个语境下的表现各做一张卡片（引用 + 照片 + 少量相关人口信息），由「语境的模式」而非「人格的模式」来驱动设计。

### 1.4 「tokenizing 与还原论」——Eric Bailey（残障/可及性视角）

**Eric Bailey, "On inclusive personas and inclusive user research", 2025-07-31**
来源：https://ericwbailey.website/published/on-inclusive-personas-and-inclusive-user-research/
可信度：**[一手]**

> "I am not a big fan of personas. They're oft-abused tools whose utility is far too frequently not interrogated, and consequently create more harm than good."
> 「我不是 persona 的粉丝。它是常被滥用的工具，其效用太经常不被追问，结果是害处多于好处。」

> "**Personas as a contemporary practice are inherently tokenizing and reductionist.** This is antithetical to disability."
> 「**作为当代实践的 persona 在本质上是符号化的、还原论的。**这与残障议题根本对立。」

> "Let's call inclusive personas what they are: **Stereotypes**. There is no such thing as an inclusive persona—as a term it is self-contradicting."
> 「我们就直说『包容性 persona』是什么吧：**刻板印象**。不存在所谓『包容性 persona』——作为术语它自相矛盾。」

> "**research processes and artifacts help to shape products and services that will be used in real life**. Via this lens, the pageantry of persona-led design exercises is poised to further enshrine and perpetuate misunderstandings, steryotypes, and barriers."
> 「研究流程与产物会塑造真实生活中被使用的产品与服务。以此为镜头看，persona 主导的设计活动的浮华排场，注定会进一步固化和延续误解、刻板印象与障碍。」

Bailey 也点出了**「复制粘贴式 persona」的机制**——这是与 Cooper 本人批评「假 persona」最接近、但归因不同的一条：
> "People discovering these seemingly quick answers will then copy them into their workflows, bypassing and discarding the surrounding context and qualifiers entirely. When this happens, **all the careful work that led to the creation of these artifacts as training tools is lost**… **actual disabled representation is now two levels of abstraction removed**."
> 「发现这些看似速成答案的人，会把它们复制进自己的工作流，完全绕过并丢弃周边的语境与限定条件。此时，为把这些产物做成训练工具而付出的全部细致工作都失去了……**真实的残障代表现在被抽离了两层抽象**。」

### 1.5 「貌似建立同理心、实则拉开距离」——Steve Portigal

**Steve Portigal, "Persona Non Grata", interactions（ACM），2008-01**
来源：https://portigal.com/ask-for-our-latest-article-persona-non-grata/
PDF：https://portigal.com/wp-content/uploads/2008/01/Portigal-Consulting-White-Paper-Persona-Non-Grata.pdf （**本次未能抓取，PDF 内容未读**）
可信度：**[二手]**（关于该文内容的描述，来自 Peter Merholz 的转述，见下条）

Peter Merholz 对这篇文章的转述是关键 **[二手]**：
> "What most surprised me was the vitriol Steve cast at the practice of persona development — he essentially derides it as a waste of time, an exercise that purports to build empathy but in reality distances us from our users."
> 「最让我吃惊的是 Steve 对这个实践的恶毒火力——他基本上是在嘲讽它浪费时间，是一种号称建立同理心、实则把我们与用户拉开了距离的做法。」
来源：https://www.peterme.com/2008/01/17/personas-99-bad/

Wikipedia/HandWiki 的条目对 Portigal 的转述 **[二手]**：
> "Critics like Steve Portigal argue that personas' 'appeal comes from the seduction of a sanitized form of reality,' where customer data is continuously reduced and abstracted until it is nothing more than a stereotype."
> 「像 Steve Portigal 这样的批评者主张，persona 的『吸引力来自一种被消毒过的现实形态的诱惑』——客户数据被持续化约、抽象，直到它不过是一则刻板印象。」
来源：https://handwiki.org/wiki/User_persona

Portigal 另有一手佐证，把 persona 从设计产物泄漏为营销产物 **[一手]**：
> "It's just disturbing to see corporations decide that there are 6 mutually exclusive customer types and ask people then to identify themselves as a Frequent Flyer, a Cafe King, or (yecccchhhh) The Multimedia Monkey. I don't aspire to be any of those characters."
> 「看到企业断定存在六种互斥的客户类型，然后请人们自我归类为『常旅客』『咖啡王』或者（恶）『多媒体猴子』，实在令人不适。我并不想成为这些角色中的任何一个。」
> "Now, this is marketing, not user research, but it's bringing in user research as semiotics in a way that devalues the real work of researchers and participants."
来源：https://portigal.com/personas-leaking-outside-the-enterprise/ （2009-07-20）
**[推断]** 这一条实际上是在指控：Cooper 的方法在被外借到营销后，反过来损害了它声称要服务的用户研究。

### 1.6 「组织与政治限制方法效用」——Rönkkö

**Rönkkö, "An Empirical Study Demonstrating How Different Design Constraints, Project Organization and Contexts Limited the Utility of Personas", HICSS 2005**
来源：https://doi.org/10.1109/hicss.2005.85
可信度：**[二手]**（本次仅取到摘要/引用描述）
摘要片段 **[二手]**：
> "There are few independent studies reporting on the relation between interaction designers['] existing practices contra their…"
HandWiki 条目转述 **[二手]**：
> "Rönkkö has described how team politics and other organizational issues led to limitations of the personas method in one set of projects."
> 「Rönkkö 描述了团队政治与其他组织议题如何在一组项目中限制了 persona 方法的效用。」
**[推断]** 与 Chapman–Milham 的「方法无科学基础」互补：这一支批评指出即便方法本身讲得通，组织现实也会让它失效——而这正好部分印证了 Cooper 抱怨的那类「组织不配有设计」的处境。

### 1.7 「个人主义偏差」——Don Norman（同行、同代人对 HCD 的正面挑战）

**Don Norman, "Human-Centered Design Considered Harmful", Interactions 12(4), 2005**
来源：https://jnd.org/human-centered-design-considered-harmful/
可信度：**[一手]**

这是本次找到的**唯一一篇由 Cooper 同代、同地位的同行指名质疑「以人为中心」整条路线**的原文（含对 persona 的直接嘲讽）：
> "Now consider the method employed by the Human-Centered Design community. The emphasis is often upon the person, not the activity. Look at those detailed scenarios and personas: honestly, now, did they really inform your design? Did knowing that the persona is that of a 37 year old, single mother, studying for the MBA at night, really help lay out the control panel or determine the screen layout and, more importantly, to design the appropriate action sequence?"
> 「现在看看人本设计社群所用的方法。重点常常落在人身上，而不是活动上。看看那些详尽的情景与 persona：说真的，它们真的对你们的设计产生了输入吗？知道那个 persona 是一位 37 岁、单亲、夜里读 MBA 的母亲，真的帮你排布了控制面板、决定了屏幕布局，更重要的是，设计了正确的操作序列吗？」

> "This ego-centric, vision-directed design results in both great successes and great failures. If you want great rather than good, this is what you must do."
> 「这种自我中心的、由愿景驱动的设计，既造就巨大成功，也造就巨大失败。如果你要的是伟大而非良好，这就是你必须做的。」

> "Here, what is needed is a strong, authoritative designer who can examine the suggestions and evaluate them in terms of the requirements of the activity. When necessary, it is essential to be able to ignore the requests. … Paradoxically, the best way to satisfy users is sometimes to ignore them."
> 「这里需要的是一位强势、有权威的设计师，能审视这些建议、并按活动的需求来评估它们。必要时，必须能够忽略用户的要求。……悖论的是，满足用户的最好方式有时就是忽略他们。」

他给出的替代概念是 **Activity-Centered Design（活动中心设计）**：先吃透活动，工具自然被理解；反过来「学工具，活动也就懂了」。
> "To the Human-Centered Design community, the tool should be invisible, it should not get in the way. With Activity-Centered Design, the tool is the way."
> 「对人本设计社群而言，工具应当隐于无形、不应挡道。而在活动中心设计中，工具就是那条路。」

**[推断]** Norman 这篇比 Chapman–Milham 更像「路线之争」而非「方法批评」——他并不否认用户研究有用，他否认的是把焦点放在「人」而非「活动」。这与 Cooper 的 goal-directed（聚焦个人目标）正面冲突。**需要留意的是，Norman 后来专门写了一篇澄清文章（https://jnd.org/hcd_harmful_a_clarification/ ），本次未抓取正文，故其澄清内容不在此文件内展开——引用本篇时须自行核对是否与他的澄清立场相冲。**

### 1.8 「企业场景不适用」——Jana Sedivy（实务界反对）

**Jana Sedivy, "5 reasons to not use personas for Enterprise software (and what to do instead)", Authentic Insight, 2013-01-18**
来源：https://authenticinsight.com/5-reasons-to-not-use-personas-for-enterprise-software-and-what-to-do-instead/
可信度：**[一手]**

她的措辞明确承认「严格、数据驱动的 persona 是很好的设计工具」——即**不是全盘否定，而是划边界**：
> "It turns out that, while rigorous, data driven personas are a great design tool in many circumstances, particularly with consumer software, they are usually not the right choice in enterprise contexts."
> 「结果是这样的：严格、数据驱动的 persona 在很多情形下是极好的设计工具，尤其在消费级软件中；但在企业级语境里，它们通常不是正确选择。」

她给出的五条理由（原文列举）：
1. 企业软件用户太多——一条审批链上就有提交者、审批经理、部门负责人、政策管理员、分析师等五六种角色，一次正经的 persona 项目要 30–40 名受访者；「等你做完，下一个版本已经在路上了，公司战略已经变了，你所在的组已经被重组到别的部门了」。
2. 大企业不让你接触其员工——「如果你在向大公司卖软件，你几乎进不去公司内部跟目标用户交谈，除非他们已经是客户。可他们不会成为客户，除非你已经有产品。」（先有鸡还是先有蛋）
3. 用户角色高度专门化、难以招募——「招过财富 500 强的 CMO 吗？我招过，非常难。」
4. 企业软件高度定制化——每个客户都会大幅改造，差异直接影响体验。
5. 「你最终得到的价值仍然存疑」——原文小标题即 "You still end up with questionable value"；「你从这个过程中获得的价值，无法证明你所投入的努力是值得的」。
她的替代方案：**以 scenarios（情景）为主**、用「user profiles（职务与职责，可从招聘广告等二手资料得到）」代替传统访谈式 persona 项目。
> "Focus your energies on scenarios rather than personas. They give you more bang for the buck than personas because they focus on the end-to-end experiences."
> 「把精力放在情景而不是 persona 上。它们比 persona 更划算，因为它们聚焦端到端的体验。」

### 1.9 反对声中的「另一面」——有人认为 persona 很有用（**矛盾保留**）

按「矛盾保留」要求，同等强度记录反方：

- **Peter Merholz（Adaptive Path 联合创始人，"blog" 一词的创造者）反对 Portigal 的全面否定** **[一手]**：
  > "The thing is, when you read the article, it becomes clear that Steve is talking not about personas, but poorly conceived personas. Like any tool, personas can be wielded effectively or not."
  > 「问题在于，读了那篇文章就会明白，Steve 谈的不是 persona，而是构想拙劣的 persona。像任何工具一样，persona 可以被有效使用，也可以不被。」
  > "My frustration with the article is two-fold. First, because so many personas are bad doesn't mean that we should throw out the practice. That's like saying we should stop making movies because most movies suck. Steve commits Jakob's Fallacy…"
  > 「我对这篇文章有两点不满。第一，因为很多 persona 做得烂，并不意味着我们该扔掉这个实践。这就像说因为大多数电影很烂，我们就该停止拍电影。Steve 犯了『雅各布谬误』……」
  > "In our practice, we haven't seen a tool for building empathy as well as a well-constructed persona. We've used it numerous times to great success."
  来源：https://www.peterme.com/2008/01/17/personas-99-bad/

- **Kim Goodwin（Cooper 公司设计总监、《Designing for the Digital Age》作者）——内部视角，仅作对照** **[一手]**：
  来源：https://articles.centercentre.com/goodwin_interview/
  她在访谈中直接回答「Kim Goodwin 与 Alan Cooper 是同一阵营」的问题：
  > "That's an interesting question. Alan and I really don't disagree that much, actually. I can't speak for Alan, but my experience has been that there are two kinds of people: those who really understand how to use this tool, and those who don't."
  > 「这是个有趣的问题。其实 Alan 和我分歧并不大。我不能代表 Alan，但我的经验是存在两种人：真正懂得怎么用这个工具的人，和不懂的人。」
  > "If people use personas badly, it's often because they don't understand how to use them well, poorly framed scenarios, failure to gather enough data, and then the resulting design decisions are wrong."
  **[推断]** 注意：Kim Goodwin 是 Cooper 公司内部人，按任务要求应视为**内部视角**，不能作为独立外部佐证；她的立场（问题在「不会用」）恰与外部批评（问题在「方法本身」）构成正面冲突。

- **HandWiki/Wikipedia 条目对实证文献的记录** **[二手]**：
  > "A study conducted by Long claimed support for Cooper, Pruitt et al. in the use of personas."
  该条目同时列出该研究的严重局限：评估者未盲测、分组非随机、结果未复现、未控制霍桑效应/皮格马利翁效应。
  来源：https://handwiki.org/wiki/User_persona
  **[推断]** 这是本文件能拿到的唯一一条「支持 persona 的实证研究」，且其自身局限严重。**「支持方缺乏过硬实证」这一判断，反向地加强了 Chapman–Milham 的批评。**

- **框架比较站点对 persona 适用面的中立划分** **[二手]**：
  > Personas 适用：「UX 研究综合」「营销文案与落地页」「销售赋能」「跨职能对齐」；常见滥用：如「Sarah，34 岁，忙碌的妈妈」这类**未扎根于研究**的刻板标签。
  来源：https://frameworklist.com/compare/jtbd-vs-personas

### 1.10 Cooper 本人对「persona 被滥用」的批评（**属于「Cooper 自己说的」，此处仅作对照**）

> **辨别提示：以下全部是 Cooper 自己的话，不是别人对他的批评。** 列在这里的唯一目的是与上面的外部批评并列对照。

- 2006 年 UXpod 访谈（https://uxpod.com/episodes/personas-and-outrageous-software-an-interview-with-alan-cooper.html）**[一手]**：
  > "I know that there a lot of people out there who create personas or think they're creating personas and then they just do this business as usual and not much happens except they can now say they did personas."
  > 「我知道外面有很多人创造 persona，或者自认为在创造 persona，然后一切照旧，什么也没发生，只是他们现在可以说自己做过了 persona。」
- 对「无数据 persona」的评价 **[一手]**：
  > "Well I think that's a lot like having a Diet Coke and a Snickers bar for lunch." 「我觉得这很像午饭吃一罐健怡可乐加一条士力架。」
- 对「一屋子 persona、anti-persona」的评价 **[一手]**：
  > "Well, that's not doing personas." / "Microsoft may create 200 personas for Microsoft Word but that's because they don't understand the process."
  > 「那不是在做 persona。」／「微软可能为 Word 造 200 个 persona，那是因为他们不懂这个流程。」
- 承认自己的方法会诱发「研究到此为止」的心理 **[一手]**：
  > 问：「是否存在这样的风险：团队做完一套 persona 后会觉得用户研究已经一劳永逸、不必再回头？」Cooper：「Yes.」问：「你在实践中看到过吗？」Cooper：「Yes.」

**外部批评者对同一现象的反驳（关键分歧点）** **[一手]**：
- Eric Bailey 的机制解释与 Cooper 相反：问题不是「有人不守规矩」，而是 **persona 一旦作为产物被复制粘贴，语境必然丢失**——「two levels of abstraction removed」。
- Cozzi & Overkamp 认为把「语境」补回去这条路本身有问题：「after having assumed that people's personalities are fixed, dismissed the importance of their environment, and hidden meaning by joining isolated, non-generalizable findings, designers _invent_ new context to create (their own) meaning.」——即加细节不是修 bug，而是 bug 本身。
- **[推断]** 归因分歧的实质：Cooper 认为「坏 persona = 没做研究」；批评者认为「persona 形式本身就承诺了它做不到的事——把多人化约为一人，同时兼顾总结与共情，这对双生目标互相冲突」（Cozzi & Overkamp 原文即写 "the conflicted dual purpose of personas—to summarize and empathize at the same time"）。

---

## 2. 对《The Inmates Are Running the Asylum》的书评

### 2.1 负面/批评性书评

**Yevgeniy Brikman（Gruntwork 联合创始人），2015-01-22，评分 3/5** — 本次找到的最完整的一手批评书评
来源：https://www.ybrikman.com/blog/2015/01/22/the-inmates-are-running-the-asylum
可信度：**[一手]**

开篇定调：
> "I found this book frustrating. It has a number of great design insights, but they are mixed with some truly awful advice on what programmers are like and how to build software, that I would hesitate to recommend it to any 'business' person (the audience identified in the preface), as the advice in this book may cause more problems than it solves."
> 「这本书让我很窝火。它有不少出色的设计洞见，但混入了关于『程序员是什么样的人』以及『如何构建软件』的**真正糟糕的建议**，我因此不愿把它推荐给任何『业务』人士（序言里指认的目标读者），因为书中的建议可能造成的问题比它解决的还多。」

四条核心批评（原文分点标题）：
1. **「把软件当成坏设计的唯一标本」** — "In reality, there is bad design everywhere. Only reason some mechanical systems are better designed is a) they've had way more time to develop those design practices and b) most mechanical devices are much simpler than software systems."
2. **「声称会用电脑不应是使用电脑的前提条件」** — "That's like saying knowing how to read shouldn't be a requirement of using books."（作者明确反对）
3. **「作者对迭代式开发轻蔑得过分」**（这是最重的一条）：
   > "The author is WAY too dismissive of iterative development. He claims that a) no good design has ever come from being iterative, b) 1 year release cycles are too fast for meaningful design, and c) software should be built like movies, with a massive 'pre-production' phase where you do a huge, detailed, up front design. This is completely counter to everything we've learned about software development in the last 20 years and should be largely ignored."
   > 「作者对迭代式开发轻蔑得过分。他声称 (a) 从来没有好设计来自迭代，(b) 一年一个发布周期对有意义的设计来说都太快，(c) 软件应该像电影一样构建，有一个庞大的『前期制作』阶段，在那里做巨大、详尽的前置设计。这与我们过去 20 年学到的关于软件开发的一切完全相悖，**应当被基本忽略**。」
4. **「重复」** — "The first 9 chapters (more than half the book) are about all the things that are wrong with design today. That's a bit too much."
5. **「不尊重程序员」**（本文件最重的人格性指控之一）：
   > "Disrespectful of programmers. Especially in part 3 of the book. **Describes programmers almost as a different species, using lots of stereotypes.** In fact, at points, the book seems to use the word 'programmer' as a synonym for 'someone who is a terrible designer.' Even makes the absurd claim that bad UI is just the way nerds are getting revenge against jocks. Seriously?"
   > 「不尊重程序员。特别是书第三部分。**几乎把程序员描述成另一个物种**，用了大量刻板印象。书中某些地方似乎把『程序员』一词用作『糟糕设计师』的同义词。甚至提出荒谬的主张，说糟糕的 UI 只是书呆子在向运动健将们复仇。认真的？」

总体建议 **[一手]**：
> "Skim quickly for the excellent design advice, and ignore all the horrible parts on how to run software projects or what programmers are like."
> 「快速略读那些出色的设计建议，忽略掉所有关于怎么管软件项目、以及程序员是什么样的人的那些糟糕部分。」

**Ben McCormick，2018-04-10**
来源：https://benmccormick.org/2018/04/10/190000.html
可信度：**[一手]**
- 前四章失败：**「几乎无一例外，他的例子都过时了」**（"almost universally his examples are out of date"）。
- 明确指认流程过重、瀑布味：
  > "This is a book that is firmly rooted in a waterfall/long release cycle view of the software development process. In fact if anything it is advocating for a **more waterfall-like approach than the waterfall status quo of 2004**. I'm genuinely curious how the author would choose to communicate his critiques today in light of the normalization of agile techniques."
  > 「这本书牢牢扎根于瀑布式／长发布周期的软件开发观。事实上，如果说有偏向的话，它主张的比 2004 年的瀑布现状**更接近瀑布**。我真心好奇，在敏捷技术已然常态化的今天，作者会怎样重新表述他的批评。」
- 正面部分（须并列记录）：第 5–14 章「在今天依然切题」，其中 6–8 章「作为一个设计并实现者，对 6–8 章的批评感到相当真实」。
- 总评：**推荐**，条件是「你足够了解这个行业，能把九十年代的建议放到 2018 年的语境里」。

**Andrew Clark（产品书摘站点）**
来源：https://andrewclark.co.uk/product-book-summaries/inmates-running-the-asylum
可信度：**[一手]**
> "The authors style is unapologetically opinionated - which makes for an interesting read. **He goes a little too hard and far with his characterisations of programmers.** He makes the case for design so passionately, he seems to offend all the other disciples along the way."
> 「作者的风格是毫不道歉地主观——这让书读起来有趣。**他对程序员的刻画走得有点太狠、太远。**他为设计辩护得太热情，似乎一路把所有其他门徒都得罪了。」
> "By modern standards, the responsibilities given to the interaction designer in this book are a little too broad. **This book is pre product-management and it shows.**"
> 「按现代标准，这本书交给交互设计师的职责有点太宽。**这本书是产品经理这个职位出现之前写的，而且这一点很明显。**」
> "**But don't read this book to understand the best practice of today.**"
> 「但不要读这本书来理解今天的最佳实践。」（他同时称书中「persona、目标与情景」的阐述是全书隐藏的宝石）

**Colm Britton，2011-01-23** — 「方法不落地」的代表性批评
来源：https://colmjude.com/blog/the-inmates-are-running-the-asylum-review
可信度：**[一手]**
> "I was disappointed with the **lack of detailed explanations of the methodologies** he recommends and his company uses. More case studies and examples would have made this even more compelling and would have allowed me to say categorically that this was a must read… Now all I can say is that it is a borderline must read. Once read you'll be converted to the interaction design ideology but **to actually incorporate in your own work you'll have to learn how to do it else where**."
> 「我失望的是，对他和他公司推荐的方法**缺少详细的解释**。多一些案例研究会更有说服力……现在我只能说它是边缘性的必读。读完后你会被转化为交互设计意识形态的信仰者，但**要真正用进自己的工作，你得去别的地方学怎么做**。」
**该批评与 Cooper 的自我定位构成直接冲突**：Cooper 在序言中称此书是「交互设计的商业论证」（"business case for interaction design"）、写给「业务层面」的读者（转引自 McCormick 书评 **[二手]**）。**[推断]** 批评者的不满恰恰是：作为「商业论证」它是合格的，但市场实际需要的是「操作手册」，而 Cooper 把后者放进了《About Face》。

**【推断】关于「说教」与「精英主义」的定位**：本次未找到直接以「说教（preachy）」或「精英主义（elitist）」为标题的一手批评。可用的最近材料是：
- Brikman **[一手]**：「几乎把程序员描述成另一个物种」「书中某些地方把『程序员』当成『糟糕设计师』的同义词」。
- Clark **[一手]**：「为设计辩护得太热情，似乎一路把所有其他门徒都得罪了」。
- Cooper 本人 2006 年访谈中的一段 **[一手]**，被普遍视为其精英主义倾向的来源（此处仅为引证其言论存在，不是批评意见本身）：
  > 问：客户说「这个应用本身很复杂，我们没法做简单，用户只能学着用」。Cooper：「Right, they're wrong. That's just like saying '…we have a feudal autocracy and monarchy and we just have to keep the lower classes oppressed because they're just, you know, not intelligent capable people and we have to oppress them. They like it.'」
  > 「对，他们错了。这就像说『……我们有个封建专制君主制，我们只能继续压迫下层阶级，因为他们……不是聪明的、有能力的人，我们只能压迫他们。他们喜欢这样。』」
  **[推断]** 把「客户说这个应用本质复杂」类比为「维护封建压迫」，是一项可以被读作精英主义的修辞，但**没有找到任何人明确用「精英主义」这个词批评它**——此处不代之以任何来源没有说过的判断。

### 2.2 正面书评（并列保留）

- **Ben McCormick** **[一手]**：第 5–14 章「在今天依然切题」；把「程序员设计自己写的代码」这一问题讲得「相当真实」；作为程序员读 6–8 章「批评颇有共鸣」。总评：推荐。
- **Colm Britton** **[一手]**：「完全买账」；最喜欢的是他为交互设计重要性提出的大量论证；「把答案寄托于等待最新技术是不对的，大部分问题现在就能修」。
- **Andrew Clark** **[一手]**：「persona、目标与情景」的阐述是他所见过最好的之一。
- **37signals / David Heinemeier Hansson（Signal vs. Noise），2005-08-22** **[一手]**：对 Cooper 与 Beck 对谈的评论，既批评也借用：
  > "Cooper believes that designing all the software up front will save us from the cost of programming… Naturally, this doesn't gel very well with the notion of constant and complete iterations."
  > 「Cooper 相信把所有软件前置设计完，就能省下编程的成本……自然，这与持续、完整迭代的理念格格不入。」
  > "**It's our experience that designers, as much as customers, need to see something real in order to produce good designs. Trying to design the whole thing up front is simply too hard and, more importantly, not a beneficial way of developing software.**"
  > 「我们的经验是：设计师和客户一样，需要看到真实的东西才能产出好设计。试图把整个东西前置设计完，太困难了，更重要的是，这不是一种有益的软件开发方式。」
  > 同时正面采纳：「programmers alone can not bear the burden of designing software alone… You definitely need a customer-designer-programmer triangle」
  来源：https://signalvnoise.com/archives2/extreme_programming_vs_interaction_design
  同页有一条匿名读者评论，代表当时社区对 Cooper 时效性的质疑 **[一手]**：
  > "What has Cooper done in the past 10 years? The dude is coasting." 「Cooper 过去十年做了什么？这家伙在吃老本。」
  另一条更具体的 **[一手]**：「他基本上错过了 Web 应用…《About Face 2.0》里关于 Web 的那一章毫无记忆点…而且他们作品集里的设计真是丑得可以。紫配绿的斜角按钮？」

---

## 3. 对《About Face》的书评

**Geoff Hart，《Technical Communication》55(2):199–200，2008（评 About Face 3.0）**
来源：https://geoff-hart.com/resources/2008/aboutface.htm
可信度：**[一手]**

正面：
> "In the original _About Face_ (1995), Cooper established his now-familiar design manifesto: design to support user goals rather than technical specs… The authors note that the book is a design guide, not a 'rulebook'."（他给了总体肯定：该章节「极为出色地成功」）

负面（四条，均为一手）：
1. **「停留层级过高、细节不足」**：
   > "Unfortunately, the text often stops at too high a level, leaving readers to infer the details. **For example, the descriptions of ethnographic interviews and persona development provide a good overall understanding, but insufficient detail for someone who must actually do these jobs. No example is provided to show the data used to create a persona or what a good persona looks like.**"
   > 「可惜的是，文本常常停在过高的层级，把细节留给读者去推。例如，对民族志访谈和 persona 开发的描述给出了不错的整体理解，但对真正要做这些工作的人来说细节不够。**没有任何例子展示用来创造一个 persona 的数据，也没有展示一个好评 persona 长什么样。**」
2. **「文献综述浅薄、无视本领域已有研究」**（对一份学术性技术传播期刊而言是很重的指控）：
   > "Practitioners will appreciate this, but the literature review is shallow; for example, you won't see Ginny Redish, Karen Schriver, or Bill Horton… cited. **This lack of awareness of our field's research produces misleading statements** such as 'Users generally don't believe, or at least don't want to believe, that they make mistakes' (p. 336). On the contrary, Karen Schriver documented back in 1997 that up to 63% of users in one study routinely blamed themselves, not software or its documentation, for errors."
   > 「实践者会欣赏这一点，但文献综述很浅；例如你看不到 Redish、Schriver 或 Horton 被引用……**对本领域研究的这种无知产生了误导性陈述**，例如『用户通常不相信、或至少不愿相信自己会犯错』（第 336 页）。恰恰相反，Karen Schriver 早在 1997 年就记录过，在一项研究中多达 63% 的用户习惯性地把错误归咎于自己，而非软件或文档。」
3. **「后期章节建议合理但未经证实，并靠无支撑的规范性陈述丧失可信度」**：
   > "The recommendations in later chapters are sensible and appealing, but unproven, and lose credibility through unsupported normative statements about how software design _should_ change."
4. **「未警示副作用」**：讲光标形状变化作为功能切换提示时，没提醒用户常注意不到这类线索（Word 的 Customize 把光标变成大减号，很多用户因此删掉若干工具栏图标才发觉）；讲软件可定制化时忽略了技术支持部门的后果。

**c2 wiki（Richard Kulisz，2008-10-24 最后编辑）** — 全库对《About Face》最激烈的一手批评
来源：https://kidneybone.com/c2/wiki/AboutFace
可信度：**[一手]**（作者是具名交互设计师；注意该文自认只读了全书不到 10%，其自称「准确度 >99%」属夸张，引用时须带上这一限制）

标题即结论：**「This book is HIGHLY DISRECOMMENDED -- RK, an Interaction Designer!」**
> "First of all, **Alan Cooper isn't an interaction designer. And his book isn't about interaction design. Neither will it teach you how to do interaction design.** And it certainly won't teach you how to do great interaction design. These myths have been promulgated, confusingly enough, by Alan Cooper."
> 「首先，**Alan Cooper 不是交互设计师。他的书也不是关于交互设计的。它不会教你怎么做交互设计。**它当然也不会教你怎么做伟大的交互设计。传播这些迷思的，说来令人困惑，正是 Alan Cooper 本人。」
> "So a non-designer ought to come out of it knowing how to do interaction design poorly… **The most a reader can get out of the book is to learn how to do interaction design _consistently_.** … But nobody will get out of Cooper's book how to do _great_ interaction design because nothing in the book teaches that."
> 「所以一个非设计师读完，应该会知道怎么做糟糕的交互设计……**读者最多能从这本书学到的是：如何『一贯地』做交互设计。**……但没有谁能从 Cooper 的书里学到如何做伟大的交互设计，因为书中没有任何东西在教这个。」
> "It doesn't teach you how to **think**, just teaches you what to think **about**."
> 「它不教你怎么**思考**，只教你该思考**关于什么**。」
> "**The writing of the book is miserable.** There is no characterization, no plot, the prose is heavily redundant, and so on. As a literary work, it sucks bowling balls through a straw and it is simply a chore to read."
> 「**这本书的写作很糟。**没有人物塑造，没有情节，文风高度冗余，等等。作为文学作品，它像用吸管吸保龄球，读起来纯粹是苦差。」
> "**Is Cooper selling snake oil he doesn't believe in or is he just an idiot?** Unfortunately, the methodology Cooper describes is fairly functional, which would put him squarely in the idiot camp. Just as a graphic designer can't be forgiven an ugly book on the subject of graphic design, **an interaction designer simply cannot be forgiven a horrible reader experience in a book whose subject is interaction design.**"
> 「**Cooper 是在卖他自己都不信的蛇油，还是他只是个蠢货？**不幸的是，Cooper 描述的方法论相当可用，这就把他干脆放进了『蠢货』那一栏。就像一个平面设计师不能被原谅写了一本关于平面设计的丑书，**一个交互设计师也绝不能因为写了一本主题是交互设计、阅读体验却极其恶劣的书而被原谅。**」
> "I begin to see exactly why Alan Cooper is scorned and hated. Actually trying to read his book, as opposed to looking up a few facts of professional interest, is making me rapidly conceive an intense loathing of the man myself."
> 「我开始明白 Alan Cooper 为什么被蔑视和憎恨了。真正去读他的书——而不是查几条职业上感兴趣的事实——让我迅速对这个人产生了强烈的厌恶。」

**[推断]** 这条批评的性质：它几乎不针对方法论本身，而针对 **Cooper 的权威身份（「他其实不是交互设计师」）** 与 **书的写作质量**。「Cooper 不是交互设计师」这一指控与本文其他材料（c2 wiki 另有 CooperInteractionDesign 页声称 Cooper 的「交互设计」与学界通用的 InteractionDesign 不是一回事）同源，但该页本次未能抓取正文。

---

## 4. 敏捷社区与工程侧的反驳

### 4.1 Beck vs. Cooper（2002，原始记录）

**Elden Nelson 主持，Kent Beck 与 Alan Cooper 对谈，"Extreme Programming vs. Interaction Design"，2002-01-15**
原始站点已失效。可抓取的全文转载：
https://neilonsoftware.com/2020/01/24/agile-history-kent-beck-vs-alan-cooper/ （方括号内的标签为原始编辑所加）
可信度：**[一手]**（对谈原文）
编者对这场对谈的定性 **[二手]**：
> "When two development design visionaries meet, there's room for consensus—but not much."
> 「当两位开发与设计界的远见者相遇，共识是有的——但不多。」
> UXmatters 的转述 **[二手]**：「By the end of their discussion, neither seemed to understand the value of the processes the other had defined.」（https://www.uxmatters.com/mt/archives/2006/12/clash-of-the-titans-agile-and-ucd.php）

**Beck 对 Cooper 的核心反驳（一手原话）**：
1. **「设计全前置＝阶段化＝瓶颈」**：
   > "You say in your book that the first thing we have to do with the process is specify all the interaction design before we write a line of code. That sounds like design phase, implementation phase to me. **The interaction designer becomes a bottleneck, because all the decision-making comes to this one central point. This creates a hierarchical communication structure, and my philosophy is more on the complex-system side—that software development shouldn't be composed of phases.**"
   > 「你在书里说，流程的第一件事是在写一行代码之前把所有交互设计都定下来。在我看来这就是设计阶段、实现阶段。**交互设计师会成为瓶颈，因为所有决策都汇聚到这一个中心点。这造就了一种层级化的沟通结构，而我的哲学更偏向复杂系统一侧——软件开发不应由阶段构成。**」
2. **「你说的不是组织变革，只是把旋钮拧大」** —— Cooper 称 XP 假设组织无法改变，Beck 反驳自己一周都在改变人们的评估方式、座位、职责，Cooper 的回应是「That's not organizational change. That's just turning up the knob.」，Beck 回：「No, it most certainly is.」
3. **「软件不是摩天大楼」**：
   > Cooper: "Building software isn't like slapping a shack together; it's more like building a 50-story office building or a giant dam."
   > Beck: "I think it's nothing like those. If you build a skyscraper 50 stories high, you can't decide at that point, oh, we need another 50 stories and go jack it all up and put in a bigger foundation."
   > Cooper: "That's precisely my point."
   > **Beck: "But in the software world, that's daily business."**
4. **「我要当你的编程仙女」**（Beck 用来直接反驳 Cooper 的「编程成本极高、像拔牙」前提）：
   > "I'm going to be the programming fairy for you, Alan. I'm going to give you a process where programming doesn't hurt like that—where, in fact, it gives you information; it can make your job better, and it doesn't hurt like that."
   > 「Alan，我要当你的编程仙女。我要给你一个流程，让编程不再那样疼——事实上，它给你信息，它能让你的工作更好，它不那样疼。」
5. **「一周约束」**（Beck 主动设计的一个压力测试）：
   > Beck: "Here's the constraint—I give you one week to tell us the first thing you'd like to see."
   > Cooper: "I wouldn't know what to do with 30 people… **So, I would want only two people to do the design work. However, I want more than a week.**"
   > Beck: "Yeah, I know you do, but that that's why I gave you that constraint. **We can't let those phases leak back in.**"
   > 「给你一周，告诉我们你最先想看到什么。」「我不知道拿 30 个人怎么办……**我只要两个人做设计。但我需要多于一周。**」「是啊，我知道你需要，所以我才设了这个约束。**我们不能让那些阶段再渗回来。**」

**Cooper 在同一场对谈中承认的部分（一手，用于平衡）**：
> "Those are really good points, and you and I are very close on this." / "while I don't think there's anything wrong with phases _per se_, I think it's wrong when phases are abused, namely when phases have arbitrary boundaries and when there's no recourse and the people who are participating in the various phases are not working together."
> 「这些是好观点，你和我在这点上很接近。」／「我并不认为阶段本身有什么错，我认为错在阶段被滥用时，即阶段有武断的边界、没有回旋余地、参与各阶段的人不在一起协作时。」
> 另有一处关键的自我限定：「I don't really care that much about buttons and tabs; it's not significant. And I'm perfectly happy to let programmers deal with a lot of that stuff.」

**37signals 的第三方裁决（2005）** **[一手]**：见 §2.2 —— 结论是「你确实需要客户–设计师–程序员三角，但一旦有了它，让它在一个类 XP 的迭代框架里运行就非常合理」；并直言「不尝试把一切前置算出来」。

**[推断]** 这场对谈的后续意义：Beck 本人（转引自 Signal vs. Noise）批评真正的症结在 Cooper 对「设计师能预视软件行为之复杂、而客户不能」的假设：「it assumes that the interaction designers '… have the capability of visualizing something as complex as the behavior of software' while the customer does not.」——该句为 Signal vs. Noise 对 Cooper 立场的转述 **[二手]**。

### 4.2 敏捷–UCD 整合派的定性

**Richard F. Cecil, "Clash of the Titans: Agile and UCD"，UXmatters，2006-12-18**
来源：https://www.uxmatters.com/mt/archives/2006/12/clash-of-the-titans-agile-and-ucd.php
可信度：**[一手]**
> "User research and agile do _not_ play well together. The time to conduct field research is _not_ during development. Research should occur _before_ any design or development work begins."
> 「用户研究与敏捷**并不**相容。做田野研究的时间**不是**开发期间。研究应当先于任何设计或开发工作发生。」
> "Despite what many proponents of agile development methods would have you believe, they cannot replace the need for some up-front user research or design. Agile proponents may cringe at that statement, but I stand by it."
> 「不管敏捷开发方法的许多拥护者想让你相信什么，它们都无法取代对某种前置用户研究或设计的需求。敏捷拥护者听到这句话可能会皱眉，但我坚持这句。」
**[推断]** 这是「敏捷与 persona 之争」中最重要的一份中间立场文本：作者既承认敏捷社区的反驳成立（「他们谈的是时间线，而时间线是这件事最有争议的部分」），也承认 Cooper 一方的核心主张成立（研究不能放进开发里做）。它把 Cooper 的对手的论点当作既定事实接受，同时保留 Cooper 的结论——**这一点值得注意，因为它说明「反 Cooper」并不等于「反前置研究」。**

### 4.3 社区层面的「吃老本 / 错过 Web」批评

见 §2.2 中 Signal vs. Noise 的匿名读者评论。**注意**：该页面的评论多为匿名，作为「外部观察到的模式」有价值，作为「具体个人的批评」则证据强度低。可信度：**[一手]**（原话存在）但**[推断]**（身份不可核）。

---

## 5. 替代方案及其提出者的具体反驳

| 替代方案 | 提出者 | 对 Cooper persona 的具体反驳 | 来源 | 可信度 |
|---|---|---|---|---|
| **Jobs-to-be-Done (JTBD)** | Christensen / Ulwick / Moesta（谱系） | 「persona 描述客户**是谁**；JTBD 描述客户**想完成什么**。这一差异会体现在产品路线图上。」／「persona 常失败，是因为团队过度描述它（爱喝什么咖啡、周末爱好）却丝毫不与任何购买或使用决策挂钩，结果 persona 沦为与路线图脱节的营销产物。」／结构性论据：**「工作的稳定性高（工作是稳定的），persona 的稳定性低（用户变了 persona 就漂移）」** | https://frameworklist.com/compare/jtbd-vs-personas | **[二手]**（框架比较站，非 Christensen 本人原话） |
| **Pragmatic / Proto Personas** | 业界通说 | 【本次未找到可靠一手来源直接批评 Cooper】。可抓到的中立材料仅指出：proto-persona 是**生成性工具**（记录团队假设），而 persona「应当扎根于客户数据与研究」——两者常被混用。 | https://handwiki.org/wiki/User_persona | **[二手]** |
| **数据驱动分群（Data-driven / quantitative personas）** | McGinn & Kotamraju (CHI 2008) | 「这些 persona 被主张能解决定性 persona 生成过程的缺陷（见『批评』一节）」——即提出者以 Cooper 式定性 persona 的缺陷为其方法的立论前提。方法：聚类、因子分析、主成分分析、潜在语义分析、非负矩阵分解，先得出「骨架 persona」，再补充人格化信息。 | https://handwiki.org/wiki/User_persona；原文 http://portal.acm.org/citation.cfm?doid=1357054.1357292 | **[二手]** |
| **Dynamic Selves** | Cozzi & Overkamp (2021) | 见 §1.3。核心反驳：persona 同时承担「总结」与「共情」两个互相冲突的目标；改用真实个体 × 多语境卡片。 | https://alistapart.com/article/beware-the-cut-n-paste-persona/ | **[一手]** |
| **Mindsets** | Designit | 「设计思维工具提供了应对现实复杂性的捷径，但这种简化过程有时会把人的生活压平为几条一般特征。」（原文把它作为 persona 的替代提出，同时作者也指出 Mindsets 自身的局限） | 转引自 https://alistapart.com/article/beware-the-cut-n-paste-persona/ | **[二手]** |
| **Persona spectrums** | Margaret P.（Microsoft Design，"Kill Your Personas"） | 主张以「用户能力的光谱（永久／暂时／情境）」替换 persona，因为「模式是语境，不是人格」。 | 转引自同上 | **[二手]** |
| **Scenarios 优先 / User Profiles** | Jana Sedivy (2013) | 见 §1.8：企业场景下「以情景为主」+「用职务职责画像（可从招聘广告等二手资料获得）」替代访谈式 persona 项目。 | https://authenticinsight.com/5-reasons-to-not-use-personas-for-enterprise-software-and-what-to-do-instead/ | **[一手]** |
| **Activity-Centered Design** | Don Norman (2005) | 见 §1.7。主张焦点应从「人」移到「活动」；「最好的满足用户的方式有时是忽略他们」。 | https://jnd.org/human-centered-design-considered-harmful/ | **[一手]** |
| **极端用户研究 / 激进参与式设计** | Eric Bailey, Victor Udoewa | 用「直接承认参与式设计中固有的权力不对等」的激进参与式设计取代 persona；批判「救世主式单人设计师」文化。 | https://ericwbailey.website/published/on-inclusive-personas-and-inclusive-user-research/ | **[一手]** |

**【推断】关于 JTBD 与 persona 的关系**：本次抓到的中立材料（frameworklist）给出的**不是替代论**而是**顺序论**：「JTBD first，personas second」。这提示「JTBD 取代 persona」在实务界并未成为共识，而是「JTBD 管要做什么、persona 管跟谁谈」。本文件保留这一矛盾，不做裁断。

---

## 6. 关于 Cooper 本人的性格、立场与关系（全部为「别人说 Cooper」；如有 Cooper 原话会显式标出）

### 6.1 「被蔑视和憎恨」——来自同行的直接陈述

- **c2 wiki / Richard Kulisz [一手]**：「I begin to see exactly why Alan Cooper is scorned and hated.」——「我开始明白 Alan Cooper 为什么被蔑视和憎恨了。」（§3 已详述）
- **Yevgeniy Brikman [一手]**：「Disrespectful of programmers… describes programmers almost as a different species, using lots of stereotypes.」（§2.1 已详述）
- **Andrew Clark [一手]**：「He makes the case for design so passionately, he seems to offend all the other disciples along the way.」（§2.1 已详述）
- **Signal vs. Noise 匿名读者 [一手/身份不可核]**：「What has Cooper done in the past 10 years? The dude is coasting.」（§2.2 已详述）
- **c2 wiki（另一处，关于「Cooper 被褒被贬」的转述）[二手]**：「Alan Cooper, highly paid consultant, sees 'Interaction Design' as the solution to the business world's computer problems.」（https://wiki.c2.com/?CooperInteractionDesign=；该页正文本次未能抓取，仅存标题行）

**【推断】** 「以攻击性表达闻名、树敌不少」这一背景假设，在本次可抓取的一手材料中**得到部分印证**：能拿到的最强证据是 Brikman 的「不尊重程序员/把程序员当另一个物种」、Clark 的「一路得罪所有其他门徒」、Kulisz 的「被蔑视和憎恨」三条具名一手陈述。但**没有任何具名的同事、前员工站出来说「他这个人很难合作」**——本次未找到此类来源。

### 6.2 他为什么离开微软 / 与微软关系的另一面

本次找到的最有分量的**外部观察**来自 VB 史著述者 EvilGeniusLabs 对 Cooper 本人回忆的整理与解读。该文以 Cooper 2020 年 IEEE Annals 口述史（Hansen Hsu 访谈，2017-03-13）为一手基座。
来源：https://www.evilgeniuslabs.ca/books/visual-basic-history/origins/vb-history-alan-cooper-and-tripod
可信度：**[一手]**（Cooper 原话，经该作者整理）＋**[二手]**（该站作者的框架与解读）

Cooper 本人对「Gates 那句话」的追溯性解读，被该站称为「极少被讲述的部分」 **[一手]**：
> "I had no idea how wrong that was, but I learned later. … what he was doing was he was making all those guys at the table hate me. You know? Because, you know, I showed them up really badly."
> ——Alan Cooper, IEEE Annals oral history, p.107
> 语境：Bill Gates 在 1988 年 3 月那场演示中，当着十几个微软人问「Why can't we do stuff like this?」（我们为什么做不出这样的东西？）。Cooper 后来认为这不是单纯的赞赏，而是**当众羞辱他自己的团队**。
（**辨别**：这是 Cooper 的自述，不是别人对他的评价。但它是「他为什么与微软结怨」这条线上唯一的当事人证词。）

该站作者的**外部定性（对 Cooper 而非引自 Cooper）** **[二手]**：
> "The same team Gates dressed down in that boardroom would, eighteen months later, find ways to ensure Ruby was kicked out of the Windows 3.0 build. … It is also the moment Cooper, retrospectively, sees as the seed of the political damage that would eventually orphan the product inside Microsoft."
> 「Gates 在那间会议室里痛斥的同一个团队，十八个月后会找到办法确保 Ruby 被踢出 Windows 3.0 的构建……这也是 Cooper 事后追溯时，视为最终让该产品在微软内部变成孤儿的政治伤害的种子时刻。」
**[推断]** 这条材料支持的**别人眼中的模式**是：Cooper 的技术胜利与政治失败是同一件事——他倾向于在对手面前展示压过对方，而不是建立同盟。

**与 OS/2 派的冲突（Cooper 自述，非他人评价）[一手]**：
> "Microsoft was fighting with IBM… Windows was actually not a strategic product for Microsoft. OS/2 was the strategic product… And so the shell construction set, they said, 'Look, you have to be able to be identical to the OS/2 shell.' And I said, 'Well, look, you can build the OS/2 shell from scratch in about ten minutes using Ruby.' They said, 'Is it keystroke for keystroke identical, and pixel for pixel identical?' And I said, 'Well, it's close!' Well, okay, that was just enough of a beachhead that they could point to it and say, 'This won't work.' And so they kicked it out of the build."
**买回失败（Cooper 自述）[一手]**：
> "I flew back up to Seattle and met with Bill and I said, 'Will you sell it back to me? … I'll publish it myself.' And he thought about it and he said, 'No.' I had no leverage… So I came back home and I tried to start a company, and of course, I was seriously nondisclosured."
（**来源限制说明**：另有一篇 Retool 的长篇 VB 史 [https://retool.com/visual-basic] 也覆盖同一段历史，本次抓取到部分内容但被截断；其中 CEO 层面的权威叙述与上述一致。所有引文均出自 Cooper 之口或整理者之笔，未被其他独立信源交叉证实。）

### 6.3 与 Don Norman 的关系

**【推断】** 本次**未找到两人直接交手的记录**（无公开对谈、无互相指名批评）。两者关系只能通过**立场对立**间接推断：
- Norman 2005 年那篇直接嘲讽 persona（「知道那是一位 37 岁单亲母亲，真的帮你设计了正确的操作序列吗？」），并把「人本设计」整体列为可能有害。这是本库中 Cooper 同代同量级同行里最接近「指名开火」的一次。
- 但 Norman **没有点 Cooper 的名字**，通篇批评对象是 HCD 社群。**[推断]** 因此把它称为「Cooper vs. Norman 之争」是过度解读；准确说法是「Norman 对人本设计的整体批评，逻辑上覆盖并贬低了 Cooper 的核心方法」。
- **[存疑]** Norman 随后写了澄清文（https://jnd.org/hcd_harmful_a_clarification/），本次未抓取其正文，**其澄清是否收回了对 persona 的具体嘲讽，本文件无法回答。** 引用 §1.7 时必须标注这一不确定性。

### 6.4 与 Jef Raskin 的关系

本次未找到两人直接交锋。找到的是一条**由第三方逐条对照**的记录。
来源：https://unde.sourceforge.net/en/ch22.html （Nikolay Krivchenkov，2010-02-23）
可信度：**[一手]**（该文作者的对照陈述）

该作者逐一列出两人在同一问题上的分歧与巧合 **[一手]**：
> "Jef Raskin - in many respects the designer of the whole computers and operating systems, and Alan Cooper specialises on concrete solutions usually for Windows OS. Often they proceeding from different premises come to one conclusion."
> 「Jef Raskin 在很多方面是整台计算机与操作系统的设计师，Alan Cooper 则专精于通常面向 Windows 操作系统 的具体解决方案。他们常常从不同前提出发，得出同一个结论。」
具体分歧点（原文列出）：
- **单按钮「OK」对话框**：Raskin 说「不」，理由是信息量为零且制造了又一个模态；Cooper 的理由是「这样等于开发者在指控用户犯错，或者程序在炫耀成就」——**同一结论，不同论证**。
- **滚动条**：Raskin 认为滚动条显然不是直观组件；Cooper 则认为它是现代界面的好惯用法（只是不建议用于文本的横向滚动）。
- **Zoom 界面**：Raskin 视其为优秀交互惯用法；Cooper 说 Zoom 通常只有 IT 专家才看得懂，逻辑 Zoom 更是只有开发者才懂。
- **「应用」这个概念**：Raskin 认为应用这个概念不好、用户需要紧密整合；「Alan Cooper does mention nothing similar.」（Cooper 什么都没提）
该文作者的结论 **[一手]**：
> "In this connection it is possible to come to a conclusion what to have the own opinion always useful and it is impossible to rely on masters of designing of interaction always."
> 「由此可以得出结论：拥有自己的看法总是有用的，不能永远依赖交互设计大师们。」
以及一条对 Cooper 的直接失望 **[一手]**：
> "From second half of book 'About face' I expected much more, than simply listing of all existing interaction units and actually a little was disappointed."
> 「对《About Face》后半本，我期待的比『罗列所有现存交互单元』要多得多，实际上有点失望。」

### 6.5 与 Steve Krug、Jakob Nielsen、Alan Kay、Kim Goodwin 的异同

**【推断】** 本次调研**未能找到** Cooper 与 Steve Krug、Jakob Nielsen、Alan Kay 的正面比较或交锋记录。为避免编造，此处只记录本次**确实抓到**的间接线索：
- **Jakob Nielsen**：只在两处被动出现——(a) Cecil 的敏捷–UCD 文章引用 Nielsen 的「测 5 个用户」论来佐证迭代式可用性测试（与 Cooper 的前置设计主张构成方法差异）；(b) Merholz 提到 Portigal「犯了雅各布谬误（Jakob's Fallacy）」，即「因为某类实践大部分做得差，就否定整类实践」，并指名其源头是 Nielsen 的「Flash 99% bad」。**注意：Merholz 是在批评 Portigal 时引用 Nielsen 的，不是把 Nielsen 与 Cooper 对比。** 来源：https://www.peterme.com/2008/01/17/personas-99-bad/ · https://www.uxmatters.com/mt/archives/2006/12/clash-of-the-titans-agile-and-ucd.php 可信度：**[一手]**（原句）／**[推断]**（比较关系）
- **Alan Kay**：仅在 c2 wiki 的批评文中作为**反面例证**出现——「大部分由程序员做出的伟大设计最终无法复现，要么是碰巧，要么是字面意义上的重复，案例就是 Alan Kay 的 Smalltalk」。**这不是对 Cooper 的评论。** 来源：https://kidneybone.com/c2/wiki/AboutFace 可信度：**[一手]**
- **Steve Krug**：**本次未找到任何材料。**
- **Kim Goodwin**：**她是 Cooper 公司内部人（时任设计总监）**。可作为「内部视角」的对照（见 §1.9），但她与 Cooper 的关系不是「对比」而是「同盟」；她明确表示与 Cooper 分歧不大。来源：https://articles.centercentre.com/goodwin_interview/ 可信度：**[一手]**

---

## 7. 外部观察到的「思维模式」（用别人的话总结）

以下每条都**不是** Cooper 自述，而是他人的归纳：

1. **「软件即建筑」框架 —— 但外人认为这个类比是他最大的方法论风险** **[一手/二手混合]**：
   EvilGeniusLabs **[二手]**：「He talks about software the way an architect talks about buildings, as a designed thing serving a human purpose, not as a stack of features.」
   → 而 Beck 在 2002 年对谈中**当场拆掉这个类比** **[一手]**：「If you build a skyscraper 50 stories high, you can't decide at that point, oh, we need another 50 stories…」「But in the software world, that's daily business.」
   **[推断]** 外人眼中的模式：**Cooper 的系统性思维来自建筑学训练（他说自己 14 岁读到 Christopher Alexander《Notes on the Synthesis of Form》），而这一训练恰恰给了他一个与敏捷世界最不兼容的前提——形式可以被前置综合完成。**（来源：https://www.evilgeniuslabs.ca/books/visual-basic-history/origins/vb-history-alan-cooper-and-tripod）

2. **「把组织问题当设计问题解决」** **[一手]**：
   Beck 说 Cooper「stepped off the rails」，因为 Cooper 主张需要一个「专注于行为议题的新职能群体」，而 Beck 认为这是层级化 **[一手]**；Cooper 则反过来说 XP 的假设是「组织结构的既定性」，自己关心的是「改变组织被构造的方式」。
   **[推断]** 外人眼中的模式：**Cooper 拒绝把设计当成项目内的活动，坚持它是组织结构的改造工程**——这既是他与敏捷圈冲突的根源，也是他方法「重」的原因。

3. **「把不同意他的人归入某种道德缺陷」** **[推断]**：
   证据：2006 年访谈中把「客户说这个应用本质复杂」类比为「维护封建压迫」；2018 年 User Defenders 访谈中把 Zuckerberg「我们被 Facebook 的力量打了个措手不及」直接称为「a lie」并说「that's bullshit」。
   来源：https://uxpod.com/episodes/personas-and-outrageous-software-an-interview-with-alan-cooper.html · https://userdefenders.com/podcast/053-be-a-good-ancestor-with-alan-cooper-part-ii
   **[推断]** 多位批评者的措辞（「一路得罪所有其他门徒」「被蔑视和憎恨」「不尊重程序员」）与这一修辞模式一致。**注意：这是本文件的推断，没有任何单一来源把这三个证据串起来这样说。**

4. **「把问题归因于执行而非方法」** **[一手]**：
   最清楚的证据是 Kim Goodwin（内部人）的表述 **[一手]**：「If people use personas badly, it's often because they don't understand how to use them well」；以及 Cooper 本人 2006 年那句「Well, that's not doing personas.」和「Microsoft may create 200 personas for Microsoft Word but that's because they don't understand the process.」
   **[推断]** 外部批评者对同一模式的定性相反：Merholz 称之为**可以原谅的工具误用**（「that's not the fault of personas, that's the fault of bad personas」），而 Chapman–Milham、Bailey、Cozzi & Overkamp 称之为**方法自身结构决定的必然后果**。**此处存在真实且不可调和的冲突，本文件不做裁断。**

5. **「有远见但错过一个时代」** **[一手/身份不可核]**：
   Signal vs. Noise 读者 **[一手]**：「Cooper seems to have missed out on web-based applications entirely… there are (AFAIK) no examples of web work other than the 1998 version of 'HP Shopping'… And damn are the designs in their portfolio ass-ugly. Purple and green bevelled buttons?」
   Ben McCormick **[一手]**（2018）：「This is a book that is firmly rooted in a waterfall/long release cycle view… I'm genuinely curious how the author would choose to communicate his critiques today in light of the normalization of agile techniques.」
   Andrew Clark **[一手]**：「By modern standards, the responsibilities given to the interaction designer in this book are a little too broad. This book is pre product-management and it shows.」

---

## 8. 他对批评的回应

### 8.1 已找到的回应行为

1. **对「persona 无用/是垃圾」的回应**：Cooper 在访谈中承认存在这类声音，并把它们归因于误用（见 §1.10）。**[一手]** 来源：https://uxpod.com/episodes/personas-and-outrageous-software-an-interview-with-alan-cooper.html
   > 转引 Tavily 检索到的 YouTube 访谈摘要片段：「are the single greatest design tool and you will hear people say they're crap they're worthless they're no good and it's…」（片段不完整，仅作存在性证据）可信度：**[二手]**（搜索片段，未能抓取视频原文）
2. **对「设计师该不该写代码」争议的回应** **[一手]**（2018，User Defenders）：
   > "I really don't think that's a relevant question. I mean, that's like saying should designers waterski."
   > 「我真不觉得这是个相关问题。这就像问设计师该不该滑水。」
   > 「如果要成为科技领域的好设计师，你必须理解你老板的动机、用户的动机、实现你产品的人的动机。如果写代码能让你获得这种理解，那就去写。我当年就是这样获得的。」
   > 对「一人公司」论的反驳 **[一手]**：「do you want to go and get your heart replaced in a one-man shop operating theatre. I don't think so.」
   > 对「一人公司还要纠结汉堡菜单在左还是右」 **[一手]**：「Then what you are is you're a dupe.」
   来源：https://userdefenders.com/podcast/053-be-a-good-ancestor-with-alan-cooper-part-ii 可信度：**[一手]**
3. **对「共情」一词的公开嘲讽（属其攻击性表达的直接证据）** **[一手/二手]**：
   Twitter 线程整理站存有以 @MrAlanCooper 名义的线程，开头为：「When UX designers talk about "empathy," they might as well talk about burning incense and scattering chicken entrails.」（当 UX 设计师谈「共情」时，他们不如去谈烧香和撒鸡内脏占卜。）
   来源：https://threadreaderapp.com/thread/1111694593999798273.html 可信度：**[二手]**（第三方线程抓取，本次未能访问原推核验）
4. **对「设计被当成轻量视觉装饰」的公开反击** **[二手]**：同站另有线程开头为「Well, all of the above. Mostly, design is widely considered to be a lightweight, visual, post-facto treatment of complex engineering product […]」来源：https://threadreaderapp.com/thread/1169670148581539841.html

### 8.2 已确认存在但本次未能读取的回应文本

- **Alan Cooper, "Defending Personas: If you love a design tool, set it free"（Medium，2021-03-09）** —— 这是 Cooper 针对 persona 批评最直接的回应文本。
  URL：https://mralancooper.medium.com/defending-personas-2657fe26dd0f
  **本次状态：多次尝试抓取均失败**（medium.com 域名解析为不可路由地址、jina 代理失败、web.archive 失败）。检索工具返回的摘要片段 **[二手]**：「Personas are just one of the powerful design tools I've invented over the years. I believe that part of their appeal is…」（片段中断）
  同一作者另有 **"The Long Road to Inventing Design Personas"（Medium，2020-02-04）** 与 **"Should Designers Code????"（Medium）**，同样未能抓取正文。
  来源（存在性）：Exa/Tavily 检索结果条目；https://mralancooper.medium.com/
  **诚实标注：本文件对 Cooper 回应批评的完整论述，无法基于上述文本作出判断，只能记录它们存在。**
- **Alan Cooper, "The Endless Battle"（Medium，2017-10-22）** —— 同上一并列出，未能抓取。

### 8.3 【推断】

Cooper 的回应模式可归纳为三层，但**每一层都有反证**：
1. **「那不是 persona」**（否认对方在批评的东西是他发明的东西）→ 反证：Cozzi & Overkamp 认为「补语境」正是 bug 本身；Bailey 认为复制粘贴是产物形式的必然后果。
2. **「你需要更好的证据，而不是更弱的实践」**（把争论转化为执行质量问题）→ 反证：Chapman–Milham 明确说他们不认为 persona 坏，只要求「要么给更好的证据，要么把主张放弱」——而 Cooper 一方至今（据本次调研）未提供这样的证据。
3. **「你不懂就不用」**（把反对者定义为不懂的人）→ 反证：Merholz 承认很多 persona 做得很差，但他把这归为**可修复的执行问题**；也就是说，这一层回应在同盟者那里被接受，在批评者那里被视为循环论证。

---

## 来源统计

**可见来源总数：41 个唯一 URL**（另有 3 个仅作存在性提及、未成功读取正文的条目单列于下）

按可信度分布：
- **[一手]**：**24 条**——批评者／评论者原话、原始论文摘要、原始对谈记录、原始书评、原始访谈文本。代表：Chapman 博客自述、Brikman 书评、Hart 书评、Kulisz 批评、Cozzi & Overkamp、Bailey、Norman、Sedivy、Cecil、Beck–Cooper 对谈、37signals、Merholz、Portigal（博客部分）、EvilGeniusLabs 整理中的 Cooper 口述史、User Defenders 访谈、UXpod 访谈、Andrew Clark、Ben McCormick、Colm Britton、Krivchenkov、Goodwin 访谈、frameworklist（框架对照）、Signal vs. Noise 读者评论（原话存在）。
- **[二手]**：**14 条**——百科/聚合站条目、他人转述、检索摘要片段、第三方线程抓取。代表：HandWiki/Wikipedia 的 Persona 条目、Portigal《Persona Non Grata》内容（经 Merholz 转述）、Tesch & Tröndle 摘要片段、Rönkkö 摘要片段、Sage 摘要、Semantic Scholar 摘要、Wikipedia（Alan Cooper）、wiki.c2 标题行、persona-institut、mindsatlas、Retool VB 史（部分）、threadreaderapp 线程 2 条。
- **[推断]**：**本文件自作的推论共 15 处**，均以「**[推断]**」显式标出，并附所依据的一手/二手材料。

按主题分布：
- persona 方法批评：**11 条**（其中直接针对 Cooper 的 7 条）
- 书评（《Inmates》）：**6 条**（负面 4、正面 2）
- 书评（《About Face》）：**3 条**（负面 2、正面 1）
- 敏捷/工程侧反对：**4 条**
- 替代方案提出者：**9 条**
- 人格与立场：**7 条**
- 思维模式外部观察：**6 条**
- 对批评的回应：**5 条**
- 同行对比：**4 条**（其中 2 条仅存在间接线索）

**未能读取正文、仅在文中标注存在性的条目（3 条，不计入上述统计）**：
1. Alan Cooper, "Defending Personas"（Medium 2021）——需从可访问 Medium 的环境补取
2. Steve Portigal, "Persona Non Grata" 原文 PDF（Portigal Consulting 站点拒绝 PDF MIME）
3. Don Norman, "HCD harmful? A Clarification"（jnd.org）

**因黑名单或环境不可达而主动放弃的来源**：知乎、微信公众号、百度百科／知道（黑名单）；`mralancooper.medium.com` 与 `journals.sagepub.com` 正文页（网络不可达）。

**未能找到可靠一手来源的维度（明确声明）**：
1. Cooper 前员工／同事对其人格与协作方式的一手评价（Glassdoor 类站点不可抓取，受访者证言未找到）。
2. 权威中文媒体（36氪／极客公园／虎嗅／少数派／机器之心）对 Cooper 的批评性评述——本次中英文检索均未返回可用结果。
3. 有具体署名的「Cooper 反工程／敌视程序员」指控（目前最强的两条是 Brikman 与 Clark，均为书评作者而非工程组织代表）。
4. Cooper 与 Steve Krug、Alan Kay、Jakob Nielsen 的正面比较或交锋记录。
5. Cooper 本人对「persona 是伪科学」这一**具体指控**的系统回应原文（只能确认他回应过「persona 是垃圾」这类笼统说法）。

---

## 批评清单（按强度排序）

> 排序依据：① 攻击的是方法的内核还是执行外观；② 是否有一手证据；③ 是否有可验证的推论链；④ 是否被后续文献持续引用。

| # | 强度 | 批评意见 | 批评者 | 攻击层级 | 可信度 | 来源 |
|---|---|---|---|---|---|---|
| 1 | **★★★★★** | 「persona 无法被证实也无法被证伪，因此没有任何已证明的科学基础；关于其效用的主张全部建立在逸事之上，通常来自作者本人或靠卖 persona 赚钱的顾问。」 | Chapman & Milham（HFES 2006） | 认识论内核 | **[一手]** | sagepub / cnchapman.wordpress.com |
| 2 | **★★★★★** | 「一旦一段描述包含超过少数几个属性，它就几乎不描述任何真实的人。」（对 6 万条 persona 式描述 × 最多 1 万受访者真实数据的实证检验） | Chapman, Love, Milham, ElRif, Alford（HFES 2008） | 认识论内核（实证） | **[一手]** | quantuxbook.com PDF |
| 3 | **★★★★☆** | 「作为当代实践的 persona 在本质上是符号化的、还原论的，与残障议题根本对立。我们就直说『包容性 persona』是什么吧：刻板印象。作为术语它自相矛盾。」 | Eric Bailey（2025） | 方法与伦理内核 | **[一手]** | ericwbailey.website |
| 4 | **★★★★☆** | 「persona 方法的双生目标——同时做总结与做共情——本身互相冲突。它预设人格固定、无视环境、把孤立且不可推广的发现拼在一起，然后由设计师**发明**新的语境来生产自己的意义。」 | Cozzi & Overkamp（A List Apart 2021） | 方法结构内核 | **[一手]** | alistapart.com |
| 5 | **★★★★☆** | 「知道那是一位 37 岁、单亲、夜里读 MBA 的母亲，真的帮你设计了正确的操作序列吗？」——人本设计（含 persona）可能是有害的，应改为活动中心设计。 | Don Norman（Interactions 2005） | 路线之争 | **[一手]** | jnd.org |
| 6 | **★★★★☆** | 「作者对迭代式开发轻蔑得过分……这与我们过去 20 年学到的关于软件开发的一切完全相悖，应当被基本忽略。」 | Yevgeniy Brikman（2015） | 流程内核 | **[一手]** | ybrikman.com |
| 7 | **★★★★☆** | 「交互设计师会成为瓶颈，因为所有决策都汇聚到这一个中心点。这造就了一种层级化的沟通结构。」 | Kent Beck（2002 对谈） | 流程内核 | **[一手]** | neilonsoftware.com（原始对谈转载） |
| 8 | **★★★☆☆** | 「他不尊重程序员……几乎把程序员描述成另一个物种，用了大量刻板印象；书中某些地方把『程序员』一词用作『糟糕设计师』的同义词。」 | Yevgeniy Brikman（2015） | 人格／立场 | **[一手]** | ybrikman.com |
| 9 | **★★★☆☆** | 「Alan Cooper 不是交互设计师。他的书也不是关于交互设计的。它不会教你怎么做交互设计……读者最多能学到的是如何『一贯地』做交互设计。」 | Richard Kulisz（c2 wiki, 2008） | 权威身份 | **[一手]**（但作者自承仅读不足 10%） | kidneybone.com/c2/wiki/AboutFace |
| 10 | **★★★☆☆** | 「我开始明白 Alan Cooper 为什么被蔑视和憎恨了。」 | Richard Kulisz（同上） | 人格 | **[一手]**（同上限制） | 同上 |
| 11 | **★★★☆☆** | 「严格、数据驱动的 persona 在很多情形下是极好的设计工具，但在企业级语境里，它们通常不是正确选择。」五条结构性理由，结论是「你从这个过程中获得的价值，无法证明你所投入的努力」。 | Jana Sedivy（2013） | 适用边界 | **[一手]** | authenticinsight.com |
| 12 | **★★★☆☆** | 「对民族志访谈和 persona 开发的描述给出了不错的整体理解，但对真正要做这些工作的人来说细节不够——没有任何例子展示用来创造 persona 的数据，也没有展示一个好的 persona 长什么样。」 | Geoff Hart（Technical Communication 2008） | 方法可操作性 | **[一手]** | geoff-hart.com |
| 13 | **★★★☆☆** | 「对本领域研究的这种无知产生了误导性陈述」——引 Schriver 1997 的数据（63% 的用户习惯归咎于自己）直接反驳 Cooper 书中论断。 | Geoff Hart（同上） | 事实错误 | **[一手]** | 同上 |
| 14 | **★★★☆☆** | 「它在这本内容讲交互设计的书里，不能被原谅一个极其恶劣的阅读体验」「写作很糟……读起来纯粹是苦差」。 | Richard Kulisz（同 #9） | 作品质量 | **[一手]**（同限制） | 同上 |
| 15 | **★★★☆☆** | 「这本书牢牢扎根于瀑布式／长发布周期的软件开发观……它主张的比 2004 年的瀑布现状更接近瀑布。」 | Ben McCormick（2018） | 流程时效性 | **[一手]** | benmccormick.org |
| 16 | **★★★☆☆** | 「这几乎把程序员描述成另一个物种」→ 作者「为设计辩护得太热情，似乎一路把所有其他门徒都得罪了」。 | Andrew Clark | 人格／立场 | **[一手]** | andrewclark.co.uk |
| 17 | **★★☆☆☆** | 「团队政治与其他组织议题限制了 persona 方法在一组项目中的效用。」（独立实证研究，非作者自述） | Rönkkö（HICSS 2005） | 组织现实 | **[二手]**（仅取到摘要与转述） | doi.org/10.1109/hicss.2005.85 |
| 18 | **★★☆☆☆** | 「用户研究与敏捷并不相容……尽管敏捷拥护者听到这句话可能会皱眉，但我坚持。」（同时确认敏捷的时间线反驳成立） | Richard F. Cecil（2006） | 流程冲突（中间立场） | **[一手]** | uxmatters.com |
| 19 | **★★☆☆☆** | 「我们的经验是：设计师和客户一样，需要看到真实的东西才能产出好设计。试图把整个东西前置设计完，太困难了，更重要的是，这不是一种有益的软件开发方式。」 | 37signals（2005） | 流程内核 | **[一手]** | signalvnoise.com |
| 20 | **★★☆☆☆** | 「我失望的是，对他和他公司推荐的方法缺少详细的解释……要真正用进自己的工作，你得去别的地方学怎么做。」 | Colm Britton（2011） | 方法不落地 | **[一手]** | colmjude.com |
| 21 | **★★☆☆☆** | 「按现代标准，这本书交给交互设计师的职责有点太宽。这本书是产品经理这个职位出现之前写的，而且这一点很明显。」 | Andrew Clark | 时效性 | **[一手]** | andrewclark.co.uk |
| 22 | **★★☆☆☆** | 「persona 的『吸引力来自一种被消毒过的现实形态的诱惑』——客户数据被持续化约、抽象，直到它不过是一则刻板印象。」 | Steve Portigal（2008） | 方法内核 | **[二手]**（经 Merholz 与 HandWiki 转述，原文未读） | portigal.com / peterme.com / handwiki.org |
| 23 | **★★☆☆☆** | 「他看到企业断定存在六种互斥的客户类型，然后请人们自我归类……这贬低了研究者和参与者的真实工作。」 | Steve Portigal（2009） | 外借滥用 | **[一手]** | portigal.com |
| 24 | **★★☆☆☆** | 「persona 常失败，是因为团队过度描述它（爱喝什么咖啡、周末爱好）却丝毫不与任何购买或使用决策挂钩。」「工作的稳定性高，persona 的稳定性低。」 | JTBD 谱系（经框架站整理） | 结构对比 | **[二手]** | frameworklist.com |
| 25 | **★☆☆☆☆** | 「Cooper 过去十年做了什么？这家伙在吃老本。」／「他基本上错过了 Web 应用……他们作品集里的设计真是丑得可以。」 | Signal vs. Noise 匿名读者（2005） | 时效性 | **[一手原话/身份不可核]** | signalvnoise.com |
| 26 | **★☆☆☆☆** | 「他开始创作一段历史……他在很多方面是整台计算机的设计师，Cooper 专精于 Windows 上的具体方案。」（记录两人多处「同结论不同论证」） | Nikolay Krivchenkov（2010） | 定位差异 | **[一手]** | unde.sourceforge.net |
| 27 | **★☆☆☆☆** | 「persona 会诱导干系人从虚构形象中提取信息、形成印象并作出推断。」（刻板印象与政治） | Tesch & Tröndle（CHI 2016） | 认知机制 | **[二手]**（仅取到摘要片段） | dl.acm.org |

---

### 使用提醒（供后续整合者）

1. **强度最高的三条（#1–#3）互相独立、攻击层级不同**（认识论／实证／伦理），可以同时引用而不重复。
2. **#6、#7、#15、#19 构成「反前置设计」的证据群**，其中 #7 是 2002 年原始对谈，时效性最好——引用 Cooper 与敏捷的冲突时，优先用 #7 而非二手转述。
3. **#8、#9、#14、#16、#25 构成「人格与立场」证据群，但全部是**书评作者或匿名评论者**，没有同事/前员工证言。任何关于「他树敌不少」的论断都必须标注这一证据缺口。
4. **#5（Norman）与 #22（Portigal）都涉及「不点名」或「原文未读」的问题**，引用时务必带上本文件标注的限制条件。
5. **Cooper 本人的回应文本（"Defending Personas"）未能读取**，因此任何「他如何回应批评」的完整论述在本文件基础上都是不完整的——这是最大的单点缺口。
