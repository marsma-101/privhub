# 01 · 著作与系统性长文

> 对象：Alan Cooper（1952 年生，美国交互设计先驱，"Visual Basic 之父"，Cooper 公司创始人，persona 方法提出者）
> 调研日期：本轮调研
> 撰写方式：英文原词保留，关键处附英文原句；每条信息标注来源 URL 与可信度标签。

## 信源分级约定

| 标签 | 含义 |
|---|---|
| **[一手]** | Cooper 本人署名撰写／口述的作品（含合著章节）、公开信函、演讲、访谈录音整理稿 |
| **[一手·转引]** | 确属 Cooper 原文，但本次未能读取原始载体，只能通过第三方页面的逐字转录取得 |
| **[一手·未抓全文]** | 已确认署名与出处存在，但正文未抓取，仅见标题／摘要 |
| **[二手]** | 他人总结、书评、产品页、书目记录、百科、课程讲义、他人笔记 |
| **[推断]** | 萧潇根据已核实材料所作的推论，非 Cooper 原话 |

**重要前置说明**：本轮调研中，`web_fetch` 工具**无法解析 PDF**，而《About Face》第 4 版（2014）、第 3 版（2007）、《The Inmates Are Running the Asylum》的**完整正文均只以 PDF 形式可及**。因此：
- **概念原文定义以《About Face 3》(2007) 第 5 章逐字文本 + Cooper 本人的 1995／1996 年期刊文章为主**（这两条是真正的原文）；
- 第 4 版（2014）只能核对到**目录片段**，无法逐字核对正文——凡涉及第 4 版正文的表述，本文件一律标注为不确定；
- 凡未抓到一手原文之处，一律写明「未找到一手来源」，**不代拟引文**。

---

## 一、《About Face》版本谱系

### 1.1 版本列表（[二手] 书目记录 + [一手] 序言自述）

| 版次 | 年份 | 书名 | 署名 | 依据 |
|---|---|---|---|---|
| 第 1 版 | 1995 | *About Face: The Essentials of User Interface Design* | Alan Cooper 独著，IDG Books | [一手] Cooper 自述：《Goal-Directed Software Design》作者小传原文 —— "author of *About Face: The Essentials of User Interface Design* (IDG Books, 1995)"（https://jacobfilipp.com/DrDobbs/articles/DDJ/1996/9609/9609a/9609a.htm ） |
| 第 2 版 | 2003 | *About Face 2.0: The Essentials of Interaction Design* | Alan Cooper、Robert Reimann | [二手] ACM DL / 出版社书目：https://dl.acm.org/doi/10.5555/862232 |
| 第 3 版 | 2007 | *About Face 3: The Essentials of Interaction Design* | Alan Cooper、Robert Reimann、Dave Cronin，Wiley，ISBN 978-0-470-08411-3 | [一手] 版权页原文（见下） |
| 第 4 版 | 2014 | *About Face: The Essentials of Interaction Design, 4th Edition* | 上述三人 + Christopher Noessel，Wiley，ISBN 978-1-118-76657-6 | [二手] 出版社/零售商书目：https://www.wiley.com/en-us/About+Face%3A+The+Essentials+of+Interaction+Design%2C+4th+Edition-p-9781118766576 |

**版本性质的关键变化（[一手] 可证 + [推断]）**：
- 1995 第 1 版书名是 **User Interface Design**（界面设计）；2003 起改为 **Interaction Design**（交互设计）。这不是换标题——Cooper 在《Inmates》第 2 章里明确区分「界面设计 interface design」与「交互设计 interaction design」，并称前者只是给既有行为「穿衣打扮」。
  [一手·转引] Inmates 第 2 章要点转述："Interface design isn't enough. It is dressing up existing behaviour, and implies that the product stops at the interface."（https://andrewclark.co.uk/product-book-summaries/inmates-running-the-asylum ）
- [推断] 书名由 UI → Interaction 的迁移，与他「设计行为、不只是设计界面」的主张同向。

### 1.2 第 3 版（2007）结构与章节主题

来源：[一手] 版权页与目录原文，经 docslib 转录：https://docslib.org/doc/2449528/about-face-3-the-essentials-of-interaction-design-third-edition

**作者自述（[一手] 原文）**：
> "Alan Cooper is a pioneering software inventor, programmer, designer, and theorist. He is credited with having produced 'probably the first serious business software for microcomputers' and is well known as the 'Father of Visual Basic.' ... At Cooper, Alan led the development of a new methodology for creating successful software that he calls the Goal-Directed process. Part of that effort was the invention of personas, a practice that has been widely adopted since he first published the technique in his second book, The Inmates are Running the Asylum, in 1998."

**Part I —— Understanding Goal-Directed Design（目录原文，页码为原书页码）**

- Chapter 1 **Goal-Directed Design**（p.3）
  - 小节：Digital Products Need Better Design Methods / The creation of digital products today / Why are these products so bad? / The Evolution of Design in Manufacturing / Planning and Designing Behavior / Recognizing User Goals / **Goals versus tasks and activities** / Designing to meet goals in context / **The Goal-Directed Design Process** / Bridging the gap / **A process overview** / Goals, not features, are the key to product success
- Chapter 2 **Implementation Models and Mental Models**（p.27）★重点
  - 小节：**Implementation Models**（27）/ **User Mental Models**（28）/ **Represented Models**（29）/ **Most Software Conforms to Implementation Models**（32）/ User interfaces designed by engineers follow the implementation model（32）/ Mathematical thinking leads to implementation model interfaces（34）/ **Mechanical-Age versus Information-Age Represented Models**（35）/ Mechanical-Age representations / New technology demands new representations / Mechanical-Age representations degrade user interaction / Improving on Mechanical-Age representations: An example
- Chapter 3 **Beginners, Experts, and Intermediates**（p.41）★重点
  - 小节：**Perpetual Intermediates**（42）/ Designing for Different Experience Levels（44）/ What beginners need（45）/ Getting beginners on board（46）/ What experts need（47）/ What perpetual intermediates need（47）
- Chapter 4 **Understanding Users: Qualitative Research**（p.49）
  - 小节：Qualitative versus Quantitative Research / The value of qualitative research / Types of qualitative research / **Ethnographic Interviews: Interviewing and Observing Users** / **Contextual inquiry** / Improving on contextual inquiry / Preparing for ethnographic interviews / Conducting ethnographic interviews / Other Types of Research / Focus groups / Market demographics and market segments / Usability and user testing / Card sorting / Task analysis
- Chapter 5 **Modeling Users: Personas and Goals**（p.75）★重点
  - 小节：Why Model? / **Personas**（77）/ Strengths of personas as a design tool（78）/ **Personas are based on research**（80）/ **Personas are represented as individual people**（81）/ **Personas represent groups of users**（82）…

> 注：docslib 转录页在 Ch5 的 p.82 处截断，**Part II / III / IV 的完整目录未能取得**。这是一处明确的信息缺口。

**其他已确认的章标题（[二手] 搜索引擎索引到的 About Face 2.0 目录页标题，与 3/4 版高度重合）**：
- Ch 10 **Eliminating Excise**；其子页 **GUI Excise**（https://flylib.com/books/en/2.153.1.48/1/ 、 https://flylib.com/books/en/2.153.1.49/1/ ）
- Ch 20 **Metaphors, Idioms, and Affordances**（https://flylib.com/books/en/2.153.1.99/1/ ）
- Ch 21 **Direct Manipulation and Pointing Devices**（https://flylib.com/books/en/2.153.1.104/1/ ）
- 桌面端姿态章：**Postures for the Desktop**（https://flylib.com/books/en/2.153.1.43/1/ ）

> ⚠️ 上述 flylib 页面本次访问返回 **HTTP 403**，仅取得搜索引擎索引摘要，**未能打开原页核对全文**。引用时按「索引摘要」对待。

### 1.3 第 4 版（2014）结构与章节主题 —— **资料不足，仅片段**

- [二手] 零售商目录片段（https://www.booktopia.com.au/about-face-alan-cooper/ebook/9781118766583.html ，本次访问 403，仅见搜索索引）：
  > "CH 12: Reducing Work and Eliminating Excise 271 / Goal-Directed Tasks versus Excise Tasks 272 / Types of Excise 273"
  以及 "Implementation Models and Mental Models 16 … 3: … and Goals 61"
- [二手] Perlego 目录片段（https://perlego.com/book/998060/about-face-the-essentials-of-interaction-design-pdf ）：
  > "Part I Goal-Directed Design — CH 1 A Design Process for Digital Products — CH 2 Understanding the Problem: Design Research — C…"（转录在此截断）
  [推断] CH3 疑为 "Modeling Users: Personas and Goals"（与第 3 版 Ch5 同名），但**未被证实**。

**⚠️ 矛盾待核（不调和）**：两份零售商目录片段对第 4 版第 2 章的说法不一致——
- Perlego 片段：**CH 2 = Understanding the Problem: Design Research**
- Booktopia 片段：出现 **"Implementation Models and Mental Models 16"**，暗示 Ch2 可能是该章
- 第 3 版中，*Implementation Models and Mental Models* 是 **Ch 2（p.27）**，而 *Understanding Users: Qualitative Research* 是 **Ch 4（p.49）**。
两者必有一处是转录/解析错误。**未取得第 4 版正式目录，此处存疑，不做调和。**

### 1.4 第 2 版（2003）与第 1 版（1995）—— **未取得目录**

- 第 1 版（1995）目录：**未找到可靠一手或二手来源**。loc.gov 的 catdir 目录页（http://catdir.loc.gov/catdir/toc/wiley041/2002114842.html ，实为 2.0 版）本次返回 **HTTP 403**。
- 第 2 版（2003）目录：同上 403，未取得。

---

## 二、核心概念的原文定义（重点）

### 2.1 Implementation Model / Mental Model / Represented Model（实现模型 / 心智模型 / 表现模型）★重点

**背景说明**：本次**未能取得《About Face》正文中这一节（AF3 Ch2, p.27–36）的逐字原文**（PDF 无法解析、flylib 403）。以下分层处理，绝不代拟。

**(a) 结构关系——[二手] 读者笔记，标注了原书页码**

来源：https://oleksii.shmalko.com/biblio/cooper2014-about-face/ （2014 第 4 版读书笔记）
> "Implementation model (System model) <— Represented model (Designer's model) —> Mental model (Conceptual model) (p.17)
> - Implementation model—how system works
> - Conceptual model—how user thinks system works
> - Represented model—what model designer wants to show"

来源：https://www.gregbulla.com/TechStuff/Docs/NotesFromAboutFace3.htm （第 3 版笔记）
> "User interfaces should be based on user mental models rather than implementation models. The closer the represented model comes to the user's mental model, the better."（**该书笔记作者的转述，非 Cooper 原句**）

**(b) 「实现模型」的一句原文式表述——[一手·经搜索引擎索引摘要，未核对全文]**

来源：flylib《About Face 2.0》Chapter 2 索引摘要
> "Software has a behavioral face it shows to the world that is created by the programmer or designer. This representation …"（https://flylib.com/books/en/2.153.1.22/1/ ，403，仅见摘要）

**(c) 术语归属的区分（[推断]，基于已核实材料）**
- **Mental Model（心智模型）** 是 Donald Norman 在 *The Design of Everyday Things* 中系统化推广的术语，Cooper 在 About Face 中是**沿用并改造**为「用户认为系统如何运作」。
- **Implementation Model / Represented Model** 这一对概念，通常被归功于 Cooper 的阐述框架。[推断] 他做的是**引入「表现模型」这第三项**，以此把「设计者应该站在哪一侧」变成一个可操作的设计变量——**这是他的贡献所在，而非「心智模型」一词本身**。
- ⚠️ **未找到 Cooper 本人对 Norman 的直接评述**（参见第六节）。

**(d) 二手转述中反复出现的因果命题（[二手]，非原话）**
- "Most Software Conforms to Implementation Models"（flylib 索引摘要，同书名章节标题）
- 第 3 版目录中该章子节明确写有 "**User interfaces designed by engineers follow the implementation model**"（[一手] 目录原文）——**这是 Cooper 的正式标题，可安全引用**。

### 2.2 Goal-Directed Design（目标导向设计）★重点

**(a) Cooper 本人最早的公开表述：[一手]**

来源：《Goal-Directed Software Design》，Alan Cooper，*Dr. Dobb's Journal*，1996 年 9 月
https://jacobfilipp.com/DrDobbs/articles/DDJ/1996/9609/9609a/9609a.htm

> "By assuring that your software moves users inexorably toward their goals, you can design programs that are deeply satisfying and effective. In this article, I'll present a methodology called 'Goal-Directed Design' that makes this possible…"

该文作者小传确认命名与商标（[一手]）：
> "Alan developed the method of designing software described in this article, naming it 'Goal-Directed Design.(tm)' Cooper Software, his design consulting company, uses it exclusively."

**(b) 目标 vs 任务（[一手] 原文）**
> "It is easy to confuse goals with tasks, but the two are very different and are often in direct opposition to each other. For example, doctors—whose goal it is to keep you healthy—spend all of their time and energy curing your illnesses."

> "It is certainly beneficial to maintain an unsullied database, but not at the expense of employees who interact with the database or a client who is rebuffed."

> "Mostly, it's a matter of trusting in goals and ignoring the hegemony of tasks."

**(c) 目标四分栈（[一手] 原文，含原文表格内容）**

Cooper 1996 年把目标分为四类：**false / corporate / practical / personal**。

> "I divide goals into four basic categories: false, corporate, practical, and personal."
> "These goals are false because they apply only to the task of software creation, while ignoring the software's use."

原文表格（**逐字**）：
```
False       Save memory. Save keystrokes. Be easy to learn. Safeguard data integrity.
            Speed up data entry. Increase program execution efficiency.
            Use cool technology or features. Increase graphic beauty.
            Maintain consistency across platforms.
Corporate   Increase our profit. Increase our market share. Defeat our competition.
            Hire more people. Offer more products or services. Go public.
Practical   Avoid meetings. Handle client's demands. Record client's order.
            Create a paper model of the business.
Personal    Not feel stupid. Not make mistakes. Get an adequate amount of work done.
            Have fun (or at least not be too bored).
```

**(d) 「卫生目标 hygienic goals」（[一手] 原文，Cooper 自称改写自心理学）**
> "Psychologists who study the workplace have a term, 'hygienic factors,' which Saul Gellerman (*Motivation and Productivity*, New York, N.Y.: Amacom, 1963) defines as 'prerequisites for effective motivation but powerless to motivate by themselves.' … I have adapted this term as 'hygienic goals,' which I define as goals that are prerequisites for effective functioning, but powerless to achieve success by themselves."

**(e) 流程阶段（Goal-Directed Design Process）**

- [一手] About Face 3 目录确认 Ch1 内含 "**The Goal-Directed Design Process**"、"Bridging the gap"、"**A process overview**" 三个子节。
- [一手·转引] 第 3 版第 5 章原文（见 2.3）明确把流程命名为 **Research phase → Modeling phase →（后续）设计框架**：
  > "We discover our personas during the course of the **Research** phase and formalize them in the **Modeling** phase."
- [二手] Dubberly（2001）记录的 Cooper 版本只有 5 条"流程变革"，而非阶段表：
  > 1. Design first; program second. 2. Separate responsibility for design from responsibility for programming. 3. Hold designers responsible for product quality and user satisfaction. 4. Define one specific user for your product; then invent a persona… 5. Work in teams of two: designer and design communicator.
  来源：https://docslib.org/doc/526085/alan-cooper-and-the-goal-directed-design-process
- [二手] 现代二手资料普遍描述为 **Research → Modeling → Requirements → Framework → Refinement** 五阶段（见 https://bakoindustries.com/goal-directed-design-process 等）。**⚠️ 这一五阶段命名未能在 Cooper 署名文本中逐字核实**，[推断] 它来自 About Face 第 3/4 版的章序（Part I 的 Ch1/Ch4/Ch5 与后续 Part），但**不要把"五阶段"当作 Cooper 的原话引用**。

### 2.3 Personas（人物角色）★重点

**最强的原文在《About Face 3》第 5 章**（[一手] 逐字文本）：https://docslib.org/doc/3311070/modelling-users-personas-and-goals-scenarios

**(a) 定义（[一手] 逐字）**
> "The most powerful interaction design tool used by the authors is simple on the surface: a precise descriptive model of the user, what he wishes to accomplish, and why. … **These user models, which we call personas, are not real people, but they are based on the behaviors and motivations of real people and represent them throughout the design process. They are composite archetypes based on behavioral data gathered from many actual users through ethnographic interviews.** We discover our personas during the course of the Research phase and formalize them in the Modeling phase."

**(b) 为什么不能「为所有人设计」（[一手] 逐字，即 "design for one person" 的原文根据）**
> "**To create a product that must satisfy a broad audience of users, logic tells you to make it as broad in its functionality as possible to accommodate the most people. This logic, however, is flawed. The best way to successfully accommodate a variety of users is to design for specific types of individuals with specific needs.** When you broadly and arbitrarily extend a product's functionality to include many constituencies, you increase the cognitive load and navigational overhead for all users. Facilities that may please some users will likely interfere with the satisfaction of others."

> "The key is in choosing the right individuals to design for, ones whose needs represent the needs of a larger set of key constituents … and knowing how to prioritize design elements to address the needs of the most important users without significantly inconveniencing secondary users."

**(c) 「弹性用户」elastic user（[一手] 逐字）**
> "Its imprecision makes it unusable as a design tool—every person on a product team has his own conceptions of the user and what the user needs. When it comes time to make product decisions, **this 'user' becomes elastic, bending and stretching to fit the opinions and presuppositions of whoever has the floor.**"

> "Designing for the elastic user gives the developer license to code as he pleases while still apparently serving 'the user.' … **Real users—and the personas representing them—are not elastic**, but rather have specific requirements based on their goals, capabilities, and contexts."

**(d) 自我参照设计 self-referential design（[一手] 逐字）**
> "**Self-referential design occurs when designers or developers project their own goals, motivations, skills, and mental models onto a product's design.** Most 'cool' product designs fall into this category… Similarly, programmers apply self-referential design when they create implementation-model products."

**(e) 边界情况 design edge cases（[一手] 逐字）**
> "Another syndrome that personas help prevent is designing for edge cases—those situations that might possibly happen, but usually won't for the target personas. Naturally, edge cases must be programmed for, but they should never be the design focus."

**(f) persona 必须基于研究（[一手] 逐字）**
> "Personas must, like any model, be based on real-world observation. … **the primary source of data used to synthesize personas must be from ethnographic interviews, contextual inquiry, or other similar dialogues with and observation of actual and potential users.** … However, none of this supplemental data can take the place of direct interaction with and observation of users in their native environments."

**(g) persona 的用途清单（[一手] 逐字，5 条）**
> "Personas help designers: Determine what a product should do and how it should behave. / Communicate with stakeholders, developers, and other designers. / Build consensus and commitment to the design. / Measure the design's effectiveness. / Contribute to other product-related efforts such as marketing and sales plans."

**(h) primary persona / secondary / negative persona**

- [一手] About Face 3 目录确认 Ch5 下有 "Personas represent groups of users"（p.82），后续小节名未取得。
- [二手] Alison J. Head, "Personas: Setting the Stage for Building Usable Information Sites", *Online* 27(4), July/Aug 2003 — 明确标注引自 Inmates，并**自行注明"措辞经压缩与改写"**：
  > "One persona needs to become the **primary persona**, or the primary focus of the design. The other key personas are **secondary personas**, archetypes who are important for the design but not as 'high maintenance' as the primary persona. On some projects, there may even be a '**negative persona**.' This anti-persona represents a group of users the site is intended to never really satisfy."
  > "Regardless of how many different secondary personas are identified for a project, it is the primary persona who dictates key design decisions. **The primary persona is someone who requires a unique interface to be satisfied.** In other words, the primary persona's needs cannot be met by an interface that may indeed satisfy a secondary persona."
  来源：https://www.infotoday.com/online/jul03/head.shtml
  ⚠️ **这不是 Cooper 的原话**，是 Head 转述并改写过的 Inmates pp.123-24。**不可当作 Cooper 原句引用。**
- [二手] 同页 Head 把 Inmates 的 persona 定义压缩为 7 条（原页注明 "Wording condensed and modified"）：personas 是 hypothetical archetypes / 不是真人但代表真人 / 不是"编出来"的而是调研发现的 / 定义极为严谨精确 / 名字与个人细节是虚构的 / 由目标定义 / 界面为满足其需求与目标而建。**同为转述。**

**(i) persona 起源的自述（[一手·转引]）**

来源：《The Origin of Personas》，Alan Cooper，Cooper Journal（BibSonomy 记为 2003-08-01；cooper.com 另有 2008-05-15 版本 URL）。原文载体已失效，以下逐字引文经第三方页面转录：
- https://www.strehle.de/tim/weblog/archives/2003/10/20/197/
- https://www.noisebetweenstations.com/personal/weblogs/tinderbox/design/process/personas/therealo.shtml

> "[…] Even though the variation among the users was dramatic, a clear pattern emerged after just a few interviews. The users fell into three distinct groups, clearly differentiated by their goals, tasks, and skill levels. […] So I created Chuck, Cynthia, and Rob. **These three were the first true, Goal-Directed, personas.**"
> "Chuck was an analyst who used ready-built templates and reports. Cynthia was an analyst, too, and she used similar ready-built templates. But Cynthia also wrote her own templates, which she gave to Chuck to use. Rob was the IT manager who supported both Rob and Cynthia. He could optimize Cynthia's templates, but he would never originate or use them."
> "At the next group meeting, I presented my designs from the points of view of Chuck, Cynthia, and Rob instead of from my own. The results were dramatic. While there was still resistance to this unfamiliar method, the programmers could clearly see the sense in my designs because they could identify with these hypothetical archetypes. From then on, I always presented design work using one of the personas, and eventually even the Sagent engineers began to talk about 'what Cynthia would do' or 'whether Chuck could understand' some dialog box."

（Sagent 是 Cooper 当时承接的客户公司名，出自上文。）

> "Personas, like all powerful tools, can be grasped in an instant but can take months or years to master. **Interaction designers at Cooper spend weeks of study and months of practice before we consider them to be capable of creating and using personas at a professional level. Many practicing designers have used the brief 25-page description of personas in Inmates as a 'Persona How-to' manual, but a complete 'How-to' on personas has yet to be written.**"

**(j) persona 的其他类型（[二手] 读者笔记，引用 2014 第 4 版页码）**
> "Other personas: customer (buyer) / served persona (e.g., in medical) / anti-persona (malicious user)"（p.68 附近）
来源：https://oleksii.shmalko.com/biblio/cooper2014-about-face/

### 2.4 Perpetual Intermediates（永久中间用户）★重点

- [一手] About Face 3 目录：Ch3 章名 *Beginners, Experts, and Intermediates*，首个子节即 **Perpetual Intermediates**（p.42）。**这是 Cooper 的正式标题。**
- [一手·经搜索引擎索引摘要] flylib《About Face 2.0》Ch3 索引摘要：
  > "**Most users are neither beginners nor experts; instead, they are intermediates.** The experience level of people performing …"
  （https://flylib.com/books/en/2.153.1.25/1/ ，403，仅见摘要）
- [二手] 多处引作 "Most users are neither beginners nor experts; instead, they are intermediates." —— Cooper, *About Face 2.0*, p. 33（例：https://www.sambuz.com/doc/requirements-interaction-styles-9-17-2012-ppt-presentation-894507 ）
- [二手] 2014 第 4 版笔记给出的推论链（**该作者的转述，非原句**）：
  > "Most users are intermediates (p.238): beginners quickly become competent; experts tend to gravitate to intermediates with time; most intermediates remain intermediates. Programmers tend to produce expert interfaces (for they are expert users of the product). Marketers/sales tend to overemphasize beginners (for they mostly deal with first-time users)."
  来源：https://oleksii.shmalko.com/biblio/cooper2014-about-face/
- [二手] Kim Goodwin（Cooper 公司，后被 Head 访谈）对 primary persona 与中间用户关系的说法：
  > "With productivity tools, whether they're for consumers or businesses, **the primary persona is more often what we call a 'perpetual intermediate,'** which means someone who has a grasp on the critical tasks and domain knowledge but is not—and never will be—an expert."
  来源：https://www.infotoday.com/online/jul03/head.shtml

### 2.5 Eliminating Excise（消除附加工作）★重点

**定义来自 Cooper 本人，且是真正的原话（[一手]）**——《Goal-Directed Software Design》，DDJ 1996 年 9 月：

> "Each bit of interface adds overhead, **what I call 'excise,' or extra work that users must perform merely to manage the idiom, with no benefit to the user or the business.** This includes things like moving windows around or pressing OK buttons. Lots of interface elements means lots of added excise. After a while, users spend as much time flipping between views, scrolling down lists, and summoning dialogs as doing their work."

> "In addition, because most business tasks are reasonably complex and have many variants, the feature count climbs rapidly. With it, the interface-element count also climbs, and the difficulty of navigation is added to the burden of excise. … **The twin burdens of excise and navigation conspire to make many users feel trapped in an unproductive maze.** This feeling is directly contradictory to their personal goals."

（同文中的整段日历案例，是他用 excise/navigation 分析 Microsoft Schedule+ 的示范。）

- [一手·索引摘要] About Face 2.0 Ch10 *Eliminating Excise* 摘要：
  > "Software too often contains interactions that are top-heavy with extra work for the user. Programmers typically focus so…"（https://flylib.com/books/en/2.153.1.48/1/ ，403）
- [一手·索引摘要] About Face 4 目录片段确认 Ch12 名为 *Reducing Work and Eliminating Excise*，下含 *Goal-Directed Tasks versus Excise Tasks*、*Types of Excise*（[二手] 零售商目录索引，见 1.3）。

### 2.6 礼貌的错误信息、确认对话框、undo（[一手] 部分）

**Cooper 本人 1996 年的原文（[一手]）**：

> "When a program continually badgers users with **confirmation dialog boxes**, users begin to feel like the program isn't all that eager to help out. Imagine if you had an assistant who continually asked, 'Are you sure you wanted me to file this report?' or 'Are you sure you wanted to throw away this old paper?'"

> "**Probably the worst violator of personal goals are error messages. These obnoxious little idioms serve no purpose that couldn't better be served another way. They blame users for the software's shortcomings.**"

- [二手] Inmates 摘要转述「软件不愿承担责任」一条，含 undo 的主张：
  > "Software won't take responsibility — **Stop asking people if they're sure — start allowing them to undo actions.**"
  来源：https://andrewclark.co.uk/product-book-summaries/inmates-running-the-asylum （**转述，非原句**）
- [二手] 同一摘要记录 Inmates 中「礼貌软件的四条原则」：
  > "4 principles for polite software → **quality, quantity, relevance and clarity**"（同上，**转述**）
- [二手·页码] 2014 第 4 版笔记："> Undo supports exploration. p.364"（https://oleksii.shmalko.com/biblio/cooper2014-about-face/ ）
- ⚠️ **"polite error messages" 作为成对术语的 Cooper 原文定义，本轮未取得**。可以确认的是：他把**错误信息**与**确认对话框**都归为「违反用户个人目标的典型」（1996 原文），并与 undo 的主张配套。

### 2.7 Posture（软件姿态：sovereign / transient / daemonic / auxiliary）★

**⚠️ 资料不足**：本轮**未取得 Cooper 关于 posture 的逐字原文**（PDF 不可解析、flylib 403、en.wikipedia.org 在本环境 DNS 解析被拒）。

可核实的层级如下：

- [一手·索引摘要] About Face 2.0 章名 *Postures for the Desktop*，摘要原文：
  > "Desktop applications fit into four categories of posture: **sovereign, transient, daemonic, and auxiliary.** Because each de…"
  （https://flylib.com/books/en/2.153.1.43/1/ ，403，仅见摘要）——**这是最接近原文的一条，仍属摘要。**
- [二手] Jenifer Tidwell 的 HCI 设计模式语言明确标注 "**Adapted from *About Face*, by Alan Cooper**"，给出 sovereign posture 的情境、问题、解法全文，并说：
  > "**_Context:_** The artifact will be heavily used, occupying the user's full attention, and the user is willing to invest time and effort to learn it."
  > "**_Solution:_** Allow the artifact to take up all the space it needs to get the job done efficiently and gracefully. However, don't take up too much space or time explaining what things are and what needs to be done…"
  来源：https://www.mit.edu/~jtidwell/language/sovereign_posture.html
  ⚠️ Tidwell 自称"改编自 About Face"，**这是她重写的模式描述，不是 Cooper 原文**。
- [二手] TWiki 词条："Transient Posture — This is a term **invented by Alan Cooper** in his seminal work *About Face - The Essentials of Interaction*…"（https://twiki.org/cgi-bin/view/Codev/TransientPosture ，搜索索引摘要）
- [二手·仅见摘要] Wikipedia "Application posture"："The term application posture characterizes the nature of a software application's interaction with its user."（本次 en.wikipedia.org 无法解析，未读到正文）

**[推断]** 四类姿态的直觉含义（**不是 Cooper 原话**）：sovereign＝长期独占屏幕、用户愿投入学习（如 Excel/Photoshop）；transient＝短暂出现、用完即走（如对话框、取色器）；daemonic＝后台常驻、不占界面（如打印队列、备份进程）；auxiliary＝共生辅助、依附于主程序（如工具面板）。

### 2.8 Idiomatic vs Metaphoric Design（习惯用法优于隐喻）★

**这是本次证据最扎实的一组：Cooper 本人的原始长文《The Myth of Metaphor》（[一手]）**，1995 年 6 月通讯，原载 *Visual Basic Programmer's Journal*，cooper.com/articles/art_myth_of_metaphor.htm，经 docslib 逐字转录：https://docslib.org/doc/1121594/cooper-interaction-design

**(a) 主张（[一手] 逐字）**
> "**The idea that good user interface design is based on metaphors is one of the most insidious of the many myths that permeate the software community. Metaphors offer a tiny boost in learnability to first time users at tremendous cost.** The biggest problem is that by representing old technology, metaphors firmly nail our conceptual feet to the ground, forever limiting the power of our software."

> "Searching for that guiding metaphor is like searching for the correct steam engine to power your airplane, or searching for a good dinosaur on which to ride to work."

**(b) 三大范式（[一手] 逐字，术语出自本文）**
> "I think that there are three dominant paradigms in software user interfaces. I call these three the **technology paradigm**, the **metaphor paradigm**, and the **idiomatic paradigm**. **The technology paradigm is based on understanding how things work, a difficult proposition. The metaphor paradigm is based on intuiting how things work, a problematic method. The idiomatic paradigm is based on learning how to accomplish things, a natural, human process.**"

**(c) idiomatic 的定义（[一手] 逐字）**
> "I call it idiomatic because it is based on the way we learn and use idioms, or figures of speech, like 'beat around the bush' or 'cool.' They are easily understood but not in the same way metaphors are. There is no bush and nobody is beating anything. We understand the idiom because we have learned it and because it is distinctive."

> "**Most of the controls on a GUI interface are idioms. Splitters, winders, comboboxes and scrollbars are things we learn idiomatically rather than intuit metaphorically.**"

**(d) 关于 Macintosh 的著名论断（[一手] 逐字）**
> "The success of the Mac wasn't because of these metaphors but because it was the first computer that defined a tightly restricted vocabulary for communicating with users based on a very small set of mouse actions. **The metaphors were just nice paintings on the walls of a well-designed house.**"

**(e) 隐喻不可扩展（[一手] 逐字）**
> "Metaphors don't scale very well. A metaphor that works well for a simple process in a simple program will often fail to work well as that process grows in size or complexity. Icons for files was a good idea when computers had floppies or 10 megabyte hard disks. In the days of gigabyte hard disks and thousands of files, icons can get pretty clumsy."

**(f) 学术界对他的复述（[二手]，用作交叉印证）**
Michael Swaine, "The Kitten's Spreadsheet", *Dr. Dobb's Journal*, July 2004：
> "Alan Cooper says to forget about reality, or anyway realism; **he pushes for designing with idioms rather than metaphors.**"
来源：https://jacobfilipp.com/DrDobbs/articles/DDJ/2004/0407/0407o/0407o.html

### 2.9 Direct Manipulation 与 "don't make the user do the computer's job"

- [一手·索引摘要] About Face 2.0 章名 *Direct Manipulation and Pointing Devices*，摘要：
  > "A less-rigorous definition would say that direct manipulation is clicking and dragging things; and although this is true…"
  （https://flylib.com/books/en/2.153.1.104/1/ ，403，仅见摘要）
- **"don't make the user do the computer's job" —— 本轮未找到一手来源**。
  在 Inmates 的二手摘要中，最接近的表述是一条**转述**：
  > "Software blames users — Programs push their problems onto users — and blame the users for it."
  来源：https://andrewclark.co.uk/product-book-summaries/inmates-running-the-asylum
  **[推断]** 该说法与该书「scarcity thinking / 用户过劳而 CPU 空转」一段同源：
  > "**Scarcity thinking** → Software products don't work hard to serve the user - often the user is overworked and the CPU is idle. **'Being kind to chips and cruel to users'**"（同上，**转述**）
- [一手·关键词] 2014 第 4 版笔记记录该书包含一段 GUI 成功原因的论述（**笔记作者转述**）：
  > "GUI success might be caused now by richer input, but by input being more restricted. i.e., command line allows you to enter any string, most of which are invalid commands, but gui only allows mouse interaction at specific points (p. 310)"
  来源：https://oleksii.shmalko.com/biblio/cooper2014-about-face/

---

## 三、《The Inmates Are Running the Asylum》(1999)

**书目（[二手] 书目记录）**：Alan Cooper, *The Inmates Are Running the Asylum: Why High-Tech Products Drive Us Crazy and How to Restore the Sanity*, Sams/Pearson。
- 第 1 版 1999（Sams），ISBN 0-672-31649-8（[二手] ACM DL：https://dl.acm.org/doi/10.5555/553473 ）
- 第 2 版 2004-03，ISBN 0-672-32614-0（[一手] 版权页：docslib 转录的该书版权页显示 "First Printing: March 2004"、"ISBN: 0-672-32614-0"、"Copyright © 2004 by Sams Publishing"）
- [一手] 该书版权页同时载明：**"Goal-Directed design is a trademark of Cooper Interaction Design."** —— 这是品牌归属的直接书证。
- 前言之— **Paul Saffo 撰序**（[二手] archive.org 书目信息：https://archive.org/details/inmatesarerunni000coop ）

### 3.1 核心论点

**（[一手] 最佳单条证据：About Face 3 作者小传的自述）**
> "…the invention of personas, a practice that has been widely adopted since he first published the technique in his second book, *The Inmates are Running the Asylum*, in 1998."

**（[二手] Dubberly 2001 对该书论点的概括——被行业广泛沿用，但仍是他人总结）**
> "The heart of the problem, he concludes, is that the people responsible for developing software products don't know precisely what constitutes a good product. It follows that they also do not know what processes lead to a good product. **In short, they are operating by trial and error, with outcomes like customer satisfaction achieved by little more than blind luck.**"
> "Cooper advocates five significant changes to the conventional methods of software development in his goal-directed design process: 1. Design first; program second. 2. Separate responsibility for design from responsibility for programming. 3. Hold designers responsible for product quality and user satisfaction. 4. Define one specific user for your product; then invent a persona… 5. Work in teams of two: designer and design communicator."
来源：https://docslib.org/doc/526085/alan-cooper-and-the-goal-directed-design-process

**Dubberly 文中直接引用的 Cooper 原话（[一手·转引]，可信度较高，因为是同期访谈直引）**：
> "The single most important process change we can make," Cooper says, "**is to design our interactive products completely before any programming begins.**"
> "**Personas are the single most powerful design tool that we use. They are the foundation for all subsequent goal-directed design. Personas allow us to see the scope and nature of the design problem . [They] are the bright light under which we do surgery.**"
> "**Goals are not the same thing as tasks. A goal is an end condition, whereas a task is an intermediate process needed to achieve the goal…. The goal is a steady thing. The tasks are transient.**"
> "**We print out copies of the cast of characters and distribute it at every meeting. Until the user is precisely defined, the programmer can always imagine that he is the user.**"
> "**The design team must have responsibility for everything that comes in contact with the user.** This includes all hardware as well as software. Collateral software such as install programs and supporting products must be considered, too."

**Dubberly 对 Cooper 性格与核心命题的描写（[二手]）**：
> "Cooper is not one to say things softly. He's outgoing, quick to offer an opinion or an aphorism, and seems to like nothing better than a healthy debate. **His favorite topic: what's wrong with the software that increasingly fills our lives.**"
> "software does not reveal itself through external form — something mechanical devices tend to do. And in software, the cost of adding one more new feature is almost nothing, whereas adding features to mechanical devices almost always increases their cost. Cooper argues that software is thus less constrained by negative feedback acting to limit complexity than mechanical devices have been. **The result is pure Rube Goldberg: software with feature piled upon feature.**"

**关于程序员统治设计的批评（[二手] 详细章节摘要，含大量转述句，不可当原话）**
来源：https://andrewclark.co.uk/product-book-summaries/inmates-running-the-asylum

该书章节结构（**该摘要所载，[二手]**）：
1. **Riddles for the Information Age** —— "The tech industry is in denial - our products are too hard to use"；"When you cross a computer with a product or service → the behaviour of the computer dominates completely."
2. **Cognitive Friction** —— 提出 **cognitive friction**："resistance encountered by human intellect when it engages with a complex system of rules that change as the problem changes."
3. **Wasting Money** —— 反对"上市时间至上"与 feature-list bargaining；"**Users don't care about features → they only care about their goals**"
4. **The Dancing Bear** —— "**the dancing bear**" 寓言；软件五宗罪（忘事、吝于信息、不灵活、怪罪用户、不担责）
5. **Customer Disloyalty** —— 引 Larry Keeley（Doblin）三要素：Capability（工程师）/ Viability（商人）/ **Desirability（设计师）**
6. **The Inmates are Running the Asylum** —— "**Programmers have a conflict of interest: serve users or make their lives easier.**"；General Magic 案例；"**You get what you measure and reward.**"
7. **Homo Logicus** —— 提出 **homo logicus**："a species slightly - but distinctly different from *Homo sapiens*"，四点差异：为控制牺牲简单 / 为理解牺牲成功 / 关注可能而排除概率 / 表现得像运动员
（该摘要页在 Ch7 处被截断，后续章节未取得。）

**该摘要中标注为 Cooper 观点的若干关键转述（[二手]，非原句）**：
- "**Anyone untrained in interaction-design tends toward self-referential design** (when you imagine yourself as the user)."
- "I'm not saying that a programmer can't become a designer, I'm just saying that **it is nearly impossible to do either task well - while attempting to do both simultaneously.**"
- "When programmers implemented Jeff Bezos' 1-click button, they did so with a confirming question! Jeff pointed out the extra click was 100% inflation."
- "**Designing for a single user is the most effective way to satisfy a broad population.**"
- "**It is more important to be precise than accurate** … because you don't want the persona to wiggle under the pressure of development."
- "**A persona without a name is not useful** — they will never be a concrete person."
- "**Personas → Goals → Scenarios**"；场景分 **daily use scenarios** 与 **necessary use scenarios**
- "**Inflecting the interface** → The interface can be simplified by placing only the controls and data needed for the daily-use scenarios prominently in the interface and moving all others to secondary locations out of normal sight"
- "**Product managers are weak if they cannot articulate with precision and conviction exactly what it is they are building.**"

### 3.2 "interaction design is the missing discipline" / "halo of the digital age"

- [二手] Vu（Virtual University of Pakistan）HCI 课程讲义目录含 "**3.1 AN INDUSTRY IN DENIAL**"、"**3.2 TECHNO-RAGE**" 等节，属对 Inmates 的课程化转述：
  https://www.academia.edu/32964602/HUMAN_COMPUTER_INTERACTION_CS408
- **"the missing discipline" 与 "halo of the digital age" 这两个具体措辞，本轮未找到一手来源**。
  - [推断] "interaction design is the missing discipline" 与 Dubberly 转述的 Cooper 立场一致（"The key to solving the problem is interaction design before programming. We need a new class of professional interaction designers"），但**这只是同义转述，不是他的话**。
  - "halo of the digital age" **完全不确认**；未在任何已抓取页面中找到，**不代为还原**。

### 3.3 「行业在否认」的原话线索（[一手] 间接）

Cooper 1996 年 DDJ 原文已出现同一母题（[一手]）：
> "The other historical ball and chain is the annoyingly persistent falsehood that to use a computer you must become 'computer literate.' **This is just an excuse we in the industry use to salve the guilt caused by our inability to create adequate design. Instead of making software easy to use, we blame users.**"
> "**Even a target like 'being easy to learn' isn't a primary goal for the software in a jet-fighter cockpit** … I'm not giving license to make software that's hard to learn, I'm just pointing out that a fighter pilot who found weapons systems easy to learn—but slow and cumbersome to operate—would be at a distinct disadvantage in an aerial dogfight."

---

## 四、cooper.com / Cooper Journal 的博客与系统性文章

**⚠️ 关键限制**：`www.cooper.com` 现已不提供旧内容（本次访问 `/journal/` 返回 **404**，根域重定向至 `atom.com`）；`web.archive.org` 在本环境**无法解析域名**，因此 Cooper Journal 的完整归档**无法读取**。以下为可核实的片段，并明确标注缺口。

### 4.1 已确认存在的 Cooper Journal / cooper.com 文章

| 标题 | 署名/日期 | 状态 | 来源 |
|---|---|---|---|
| **The Origin of Personas** | Alan Cooper，2003-08-01（另见 2008-05-15 的 cooper.com/journal/2008/05 URL） | **[一手·转引]** 已取得大段逐字引文 | 转录页：https://www.strehle.de/tim/weblog/archives/2003/10/20/197/ ；书目：https://www.bibsonomy.org/url/ee9af986021b86129a7b07c02176e52a ；PDF 存本（未解析）：https://urbanmobilitycourses.eu/wp-content/uploads/2020/08/cooper.com-The-origin-of-personas.pdf |
| **The Myth of Metaphor** | Alan Cooper，1995 年 6 月通讯，原载 *Visual Basic Programmer's Journal*，网址 cooper.com/articles/art_myth_of_metaphor.htm | **[一手]** 已取得全文 | https://docslib.org/doc/1121594/cooper-interaction-design |
| **Getting from Research to Personas: Harnessing the Power of Data** | Kim Goodwin（Cooper 公司），Cooper Journal，2008 | **[二手]**（非 Cooper 署名） | 转载：https://marketingprofs.com/2/goodwin1.asp |
| **UX Design in 14 Simple Steps** | Jonathan Korman（Cooper 公司），后由 Cooper 转述于 theuxblog | **[一手·未抓全文]** Cooper 亲撰导语提到该同事 | https://medium.com/theuxblog/ux-design-in-14-simple-steps-b8a0f2780769 |
| **Cooper Journal 其他文章** | — | **未能取得**（归档不可达） | — |

### 4.2 Cooper 的个人 Medium 博客：`mralancooper.medium.com`（★这是他 2015 年后的主要写作阵地）

**⚠️ 说明**：Medium 域名在本环境 `web_fetch` 全部失败（fetch failed），仅从搜索引擎索引取得标题、日期与首句。以下全部为 **[一手·未抓全文]**——**署名与存在性可信，正文未核对**。

| 标题 | 日期 | 索引首句 |
|---|---|---|
| The Software Alchemist | 2015-12-20 | "I've been a software professional since…" |
| Conducting an Effective Field Study | 2016-01-10 | "There's always good, practical stuff to read on Cooper's b…" |
| Alexandrian Design | 2016-06-21 | "My kind of design." |
| Should Designers Code?? — No, Part Two: Know Versus Do | 2017-05-16 | — |
| Should Designers Code? (Pt. 1) | 2017-05-12 | "There's a recurring debate in our industry over whether or not designers should write cod…" |
| Should Designers Code?? — No, Part Three: Roles and… | 2017-05-19 | — |
| Research versus Research | 2017-08-30 | "There's a craft of research and a…" |
| Know whiteboards, know design | 2018-07-13 | "The best tool for visual thinking." |
| Worthy Goals | 2020-04-02 | "Tech practice in a post-capitalist…" |
| The Myth of Metaphor（重刊） | 2020-05-11 | "I think that there are three dominant paradigms in software user interfaces. I call these three the technology paradigm…" |
| Origami in a house aflame | 2020-10-21 | "Why your company's actions seem…" |
| The Pipeline To Your Corporate Soul | 2021-12-22 | — |

（索引来源：Exa/Keenable 检索结果；Medium 页址形如 https://mralancooper.medium.com/should-designers-code-b98e69f6b56c ）

### 4.3 「Should Designers Code?」以外的一条**已取得逐字的近期原话**（[一手]）

User Defenders 播客 #053《Be a Good Ancestor with Alan Cooper (Part II)》，录制于 2018-07-11，站点页附逐字稿：
https://userdefenders.com/podcast/053-be-a-good-ancestor-with-alan-cooper-part-ii

> **Jason Ogle:** Should designers code?
> **Alan Cooper:** "**I really don't think that's a relevant question. I mean, that's like saying should designers waterski. I don't know if it makes them a better designer.** … in order to be a good designer in the tech field, you have to understand what your boss motivations are… And you have to understand what your user's motivations are, and you have to understand the motivations of the people who implement your product. … So if you get that understanding by coding, go for it. … but I don't think that coding in and of itself is necessarily."

> "Now everybody then starts throwing in my face this thing about the one man shop and to which I say the one-man shop, I say **do you want to go and get your heart replaced in a one-man shop operating theatre. I don't think so.**"

> "**I bitch all the time about visual design as a stand in for interaction design … it's not interaction design.** Visual design is not about reconceptualizing electronic health records out of the possession of the health provider to the possession of the health consumer. … **It's reconceptualizing what the product does, who it does it for and why, which is what interaction design means to me.**"

> "it's not between designers and business people, it's between, … **it's between humans and people who want money.** … **I believe as Steve Jobs said, 'profit is a byproduct of quality'.**"

> "**if your metrics are money, it's called Goodhart's law.** Goodhart's law says that 'if a metric becomes a goal, it becomes gamed and it becomes worthless'."

> "**I believe that people are inherently good when they're accountable for their actions, but I believe that people are inherently bad when they're not accountable for their actions. And software is a giant blind.**"

> 关于「Oppenheimer 时刻」：**"I use this metaphor all the time of Robert Oppenheimer… And when you saw that bomb go off, he went, oh shit. Because all of a sudden he realized that while arguably he shortened the war, he also unleashed a new world order that was not necessarily a good thing for the human race. And that's exactly what's happened here in Silicon Valley in the last 20 years."**

> 关于 **Ancestry Thinking（祖先思维）**："**you can't divert the course of the Mississippi River, you know, where it's a mile wide, but you can go up to where it's a tiny little rivulet where it starts up in the Rocky Mountains and you can divert the Mississippi with a shovel.** … these are practical methods for understanding how bad behavior creeps into products when they're tiny little babies."

> "**questioning assumptions is an ongoing process.** It's not something you do once and then move on."

同页传记信息（**属站点编辑撰写，[二手]**）：Cooper 与妻子 Sue 于 **2017 年把 Cooper 公司卖给 Designit（Wipro 旗下）**；2017 年当选 **Computer History Museum Fellow**；1998 年获 Silicon Valley Forum "Visionary"；1995 年 Bill Gates 授予他首位 "Windows Pioneer"；2011 年离开硅谷，迁居旧金山以北的一座 50 英亩旧奶牛场。他与 Renato Verdugo 合办 **Ancestry Thinking Lab**（ancestrythinking.com），并在 UC Berkeley Jacobs Center for Design Innovation 开课。

### 4.4 Computer History Museum 口述史（[一手] 访谈，2017-03-13）

来源：https://docslib.org/doc/6976918/oral-history-of-alan-cooper
> "Hsu: The date is March 13th, 2017, and I'm Hansen Hsu, curator, Center for Software History, and today we are here with Alan Cooper. We're honoring Alan Cooper as one of our latest fellows."
> "Cooper: … Probably the most important one is that **people will tell you [that] you can't do something and you have to ignore them because you can, and most people have more power than they think** and I remember being told the things I couldn't do and it was important to learn to ignore those. … **When I wrote my first book my agent said to me words I'll never forget; he said, 'Alan, it's your first book. It's not your best book'** and I found that that was very useful in so many things, is you have to forgive yourself as you're learning."

### 4.5 BayCHI 演讲记录（[一手] 演讲存在性；正文未取得）

《Humanizing Technology》，2002-04-09，BayCHI 月度会，PARC Auditorium：
> "Alan Cooper in conversation with Richard Anderson on **Humanizing Technology** & **Bridging the Gap Between Research and Design** — Robert Reimann, Cooper Interaction Design"
来源：https://docslib.org/doc/2987290/humanizing-technology
（同页注明：BayCHI 演讲**不做音视频录制，也禁止现场录音**，故该场内容恐无公开一手记录。）

---

## 五、反复出现 ≥3 次的核心论点（= 他的真信念）

判定标准：同一命题在**不同年份、不同载体**中出现 ≥3 次，且至少有 1 次可追溯到 Cooper 署名文本。

### 论点 1：**设计必须先于编程；程序员兼任设计存在结构性利益冲突**
出现次数：**≥6**
1. [一手] 1996 DDJ："the author of the software has mistakenly imposed his goals on the user, instead of making the code work to achieve the user's goals."
2. [一手·转引] 2001 Dubberly："The single most important process change we can make … is to design our interactive products completely before any programming begins."；"Allowing the same person to design and program creates a conflict of interest."
3. [二手] Inmates Ch6："Programmers have a conflict of interest: serve users or make their lives easier."
4. [一手] 2014 第 4 版笔记（**转述**）："When developers do design, a conflict of interest arises. (Because they are judged to code fast.) p.9"
5. [一手·未抓全文] 2017 Medium 三连文《Should Designers Code?》Pt.1/2/3
6. [一手] 2018 User Defenders："I really don't think that's a relevant question. I mean, that's like saying should designers waterski."

### 论点 2：**目标（goals）≠ 任务（tasks）；软件要为前者设计**
出现次数：**≥4**
1. [一手] 1996 DDJ："It is easy to confuse goals with tasks, but the two are very different and are often in direct opposition to each other."
2. [一手·转引] 2001 Dubberly："A goal is an end condition, whereas a task is an intermediate process needed to achieve the goal…. The goal is a steady thing. The tasks are transient."
3. [二手] Inmates："**Goals are the reasons why we perform tasks. Tasks change as technology changes, but goals remain stable.**"（转述）
4. [一手] About Face 3 Ch5：整个 "Modeling Users: Personas and Goals" 章建立在 goals 优先之上

### 论点 3：**为「一个具体的假想人」设计，是满足广泛人群的唯一有效办法；「用户」是个弹性空洞**
出现次数：**≥5**
1. [一手·转引] 2001 Dubberly："Define one specific user for your product; then invent a persona…"；"Until the user is precisely defined, the programmer can always imagine that he is the user."
2. [一手·转引] 2003 Origin of Personas（Chuck/Cynthia/Rob 案例）
3. [一手] About Face 3 Ch5："The best way to successfully accommodate a variety of users is to design for specific types of individuals with specific needs."
4. [一手] About Face 3 Ch5："this 'user' becomes elastic, bending and stretching to fit the opinions and presuppositions of whoever has the floor."
5. [二手] Inmates："Designing for a single user is the most effective way to satisfy a broad population."（转述）

### 论点 4：**不要让人觉得自己蠢；软件的错不该由用户承担**
出现次数：**≥4**
1. [一手] 1996 DDJ 目标表 Personal 行第一条："**Not feel stupid.**"
2. [一手] 1996 DDJ："Probably the worst violator of personal goals are error messages. … They blame users for the software's shortcomings."
3. [一手] 1996 DDJ："This is just an excuse we in the industry use to salve the guilt caused by our inability to create adequate design. Instead of making software easy to use, we blame users."
4. [二手] Inmates Ch2："Don't make a user feel stupid. Avoid presenting them with ejection-seat levers intermingles with controls for everyday functions."（转述）
5. [一手] About Face 3 目录：Ch3 "Beginners, Experts, and Intermediates" 整章即此命题的操作化

### 论点 5：**隐喻不如习惯用法；界面应以「学得会」而非「猜得到」为基础**
出现次数：**≥3**
1. [一手] 1995《The Myth of Metaphor》全文
2. [一手] About Face 2.0/3 Ch20 *Metaphors, Idioms, and Affordances*（[一手·索引摘要]）
3. [二手] Michael Swaine, DDJ 2004："he pushes for designing with idioms rather than metaphors."
4. [一手·未抓全文] 2020 Medium 重刊《The Myth of Metaphor》

### 论点 6：**功能堆砌（bloat）是软件之癌；功能价值与使用成本成反比**
出现次数：**≥4**
1. [一手] 1996 DDJ："the feature count climbs rapidly. With it, the interface-element count also climbs, and the difficulty of navigation is added to the burden of excise."
2. [一手·转引] 2001 Dubberly："The result is pure Rube Goldberg: software with feature piled upon feature."
3. [二手] Inmates："**The use of a feature is inversely proportional to the amount of interaction needed to control it!**"（转述）
4. [一手] About Face Ch12 *Reducing Work and Eliminating Excise*（[一手·索引摘要] 目录）

### 论点 7：**别用确认对话框代替责任；应该让用户能撤销**
出现次数：**≥3**
1. [一手] 1996 DDJ（确认对话框"badger"段）
2. [二手] Inmates Ch4："Software won't take responsibility — Stop asking people if they're sure — start allowing them to undo actions."（转述）
3. [一手·页码] About Face 4："Undo supports exploration. p.364"（笔记转述）

### 论点 8：**软件行业长期在自欺（industry in denial）**
出现次数：**≥3**
1. [一手] 1996 DDJ："the annoyingly persistent falsehood that to use a computer you must become 'computer literate.'"
2. [二手] Inmates Ch1（章节名 *Riddles for the Information Age*）："The tech industry is in denial — our products are too hard to use."（转述）
3. [二手] Vu HCI 讲义目录："3.1 AN INDUSTRY IN DENIAL"
4. [一手] 2018 User Defenders：Goodhart's law 段——"if a metric becomes a goal, it becomes gamed and it becomes worthless."

### 论点 9（2015 年后新支线）：**技术的伦理责任 = 祖先思维**
出现次数：**≥2**（尚未达 3，但已形成体系）
1. [一手] 2018 User Defenders：Ancestry Thinking 全套论述（假设、外部性、时间尺度三条路径）
2. [二手] 站点传记：Ancestry Thinking Lab、UC Berkeley 课程
3. [二手] 2018 演讲《The Oppenheimer Moment》：https://www.designative.info/2018/07/09/technology-products-should-not-be-evil/ （**页面本次仅取得导航，正文未抓到**）

---

## 六、自创或推广的术语表

| 术语 | 归属 | 原文定义 / 依据 |
|---|---|---|
| **Goal-Directed Design™** | **他创** | [一手] "naming it 'Goal-Directed Design.(tm)'"（1996 DDJ）；[一手] Inmates 版权页："Goal-Directed design is a trademark of Cooper Interaction Design." |
| **persona / personas** | **他创（有争议，见第八节）** | [一手] "These three were the first true, Goal-Directed, personas."（2003 Origin of Personas） |
| **primary persona / secondary persona / negative persona (anti-persona)** | **他创** | [二手·转引 Inmates pp.123-24，措辞经改写]（Head 2003）；[二手] "anti-persona (malicious user)"（2014 版笔记） |
| **customer persona / served persona** | 他列出 | [二手] 2014 版笔记 p.68 附近 |
| **elastic user（弹性用户）** | **他创** | [一手] "this 'user' becomes elastic, bending and stretching to fit the opinions and presuppositions of whoever has the floor."（About Face 3 Ch5） |
| **perpetual intermediates（永久中间用户）** | **他创** | [一手] About Face 3 目录章内首节名，p.42；[一手·索引摘要] "Most users are neither beginners nor experts; instead, they are intermediates." |
| **excise（附加工作）** | **他创（UI 语义）** | [一手] "what I call 'excise,' or extra work that users must perform merely to manage the idiom, with no benefit to the user or the business."（1996 DDJ） |
| **cognitive friction（认知摩擦）** | **他创** | [二手] Inmates Ch2："resistance encountered by human intellect when it engages with a complex system of rules that change as the problem changes."（**章节摘要转述，未核对原书原句**） |
| **homo logicus** | **他创** | [二手] Inmates Ch7："a species slightly - but distinctly different from Homo sapiens."（转述） |
| **the dancing bear（跳舞的熊）** | **他创（作为寓言）** | [二手] Inmates："The wonder isn't that the bear dances well, but that the bear dances at all."（转述） |
| **technology / metaphor / idiomatic paradigm（三大范式）** | **他创** | [一手]《The Myth of Metaphor》逐字："I call these three the technology paradigm, the metaphor paradigm, and the idiomatic paradigm." |
| **represented model（表现模型）** | **他引入并推广** | [二手] 笔记转述 p.17 关系图；原书正文未取得 |
| **implementation model / mental model** | **沿用/改造** | mental model 源出 Donald Norman；Cooper 的贡献是加入第三项 represented model 并把三者排成一个设计可操作的坐标系 [推断] |
| **posture：sovereign / transient / daemonic / auxiliary** | **他创** | [一手·索引摘要] "Desktop applications fit into four categories of posture: sovereign, transient, daemonic, and auxiliary."；[二手] TWiki："This is a term invented by Alan Cooper" |
| **hygienic goals（卫生目标）** | **他改写自心理学** | [一手] "I have adapted this term as 'hygienic goals,' which I define as goals that are prerequisites for effective functioning, but powerless to achieve success by themselves."（源自 Saul Gellerman 的 "hygienic factors"） |
| **self-referential design（自我参照设计）** | **他创** | [一手] "Self-referential design occurs when designers or developers project their own goals, motivations, skills, and mental models onto a product's design."（About Face 3 Ch5） |
| **design edge cases** | **他提出** | [一手] "designing for edge cases—those situations that might possibly happen, but usually won't for the target personas"（About Face 3 Ch5） |
| **inflecting the interface（界面屈折/变格）** | **他创** | [二手] Inmates 摘要："placing only the controls and data needed for the daily-use scenarios prominently in the interface and moving all others to secondary locations"（转述） |
| **scarcity thinking / "being kind to chips and cruel to users"** | **他创（措辞）** | [二手] Inmates 摘要（转述，"being kind to chips and cruel to users" 疑为原文句式，但**未能核对原书**） |
| **design communicator（设计沟通者）** | **他创（角色名）** | [一手·转引] 2001 Dubberly："a design communicator (very like a writer) to be responsible for the description of the product" |
| **Ancestry Thinking（祖先思维）** | **他创（晚年）** | [一手] 2018 User Defenders 全套论述；[二手] Ancestry Thinking Lab |
| **"The Inmates Are Running the Asylum"（书名即术语）** | **他用** | 化用习语；[二手] "CTO told a development manager his spec was a waste of time … **The inmates are truly running the asylum.**"（转述） |

---

## 七、智识谱系：他称赞过或批评过的人

### 7.1 Donald Norman
- **无一手直接评述**。本轮**未找到** Cooper 公开称赞或批评 Norman 的原文。
- 可确认的只是**概念关系**：[推断] Cooper 的 "User Mental Models"（About Face 3 Ch2 小节名，[一手] 目录）直接沿用 Norman 的心智模型语汇，并加入 "Represented Models" 作为设计者的可介入项。
- ⚠️ **不要替 Cooper 表态**无论是对 Norman 的褒贬。

### 7.2 Jef Raskin —— **有明确、可查的正面冲突**（★）
来源：Christina Wodtke 记录并链向原始讨论串，https://eleganthack.com/battle-of-the-titans （2001-04-09）
> **Cooper:** "We believe that good design is self-evident."
> **Raskin:** "If you believe that, then you are stuck in a rut, because the value of deep improvements are rarely self-evident, and even when a better design — if unfamiliar — is shown to developers or experienced users, they tend to reject it."

同页 Cooper 公司员工 Elan Freydenson 的澄清（[二手]）：
> "When Alan wrote that he believes good design to be self-evident, **he was speaking in the context of designers**. Good designers know when they or others have created a good design. Developers and experienced users, most often, do not (at least not at first impression)."

[推断] 两人的分歧点是**「好设计能否自证」**：Raskin 认为深度改进往往反直觉、需教育；Cooper 认为设计师之间能直觉判别，只是开发者与资深用户不能。这条冲突也解释了 Cooper 为何坚持**给设计者权力、而非给用户投票权**。

### 7.3 Alan Kay
- **未找到 Cooper 对 Alan Kay 的任何直接评述**。
- 唯一相关材料：BayCHI 的 Richard Anderson 曾访谈过 Alan Kay、Donald Norman、Bill Moggridge、Jef Raskin、Doug Engelbart 等人（见 BayCHI 页面对 Anderson 的介绍），**与 Cooper 的立场无关**。**不构成谱系证据。**

### 7.4 敏捷 / 迭代社区
- **无直接点名"敏捷"的原文**（Inmates 1999 早于 Agile Manifesto 2001）。
- 可核实的相近批评（[二手] Inmates 摘要转述）：
  > "The web has encouraged us to iterate until something works. Programmers don't like it, because it means extra work."
  > "**Be wary of iterating to a good design. The attrition strategy is expensive and time-consuming.** Only works with a rock solid brand, lots of time, nerves of steel, and vast amounts of money."
  > "**If you keep shipping sketchy versions, you'll iterate based on the feedback of only those that have the stamina to return to it — skewing your feedback.**"
  来源：https://andrewclark.co.uk/product-book-summaries/inmates-running-the-asylum
- [一手·转引] 2001 Dubberly 记录的更早版本："Old way: programming began as soon as possible… Or, in more progressive environments, programming and design happened concurrently." → Cooper 反对并行，主张**串行前置**。

### 7.5 他称赞／引用的作者与书

| 对象 | 性质 | 依据 |
|---|---|---|
| **Frederick Brooks**（*The Mythical Man-Month*，"Plan to throw one away"） | 引用其观点支持"原型即弃" | [二手] Inmates 摘要："**Plan to throw one away** — Frederick Brooks (author of mythical man month)" |
| **Edward Tufte**（*The Visual Display of Quantitative Information*） | 作为延伸阅读推荐 | [二手] 2014 版笔记："The Visual Design of Quantitative Information by Tufte (p.425)"（标题有笔误，疑为 *The Visual Display of Quantitative Information*） |
| **Dan Saffer**（*Microinteractions*） | 作为延伸阅读推荐 | [二手] 2014 版笔记："'Microinteractions' by Dan Saffer (p.267)" |
| **Steve Jobs** | 引用其"利润是质量的副产品" | [一手] 2018 User Defenders："I believe as Steve Jobs said, 'profit is a byproduct of quality'." |
| **Larry Keeley（Doblin Group）** | 引用其 Capability/Viability/Desirability 三要素 | [二手] Inmates Ch5 摘要 |
| **Jerry Weinberg** | 引用 "Once you eliminate your number one problem, you promote number two" | [二手] Inmates Ch6 摘要 |
| **Saul Gellerman** | 借用 "hygienic factors" | [一手] 1996 DDJ 原文 |
| **Ted Nelson** | 转引"软件开发是电影制作的一个分支" | [二手] Dubberly："(The parallels … computer visionary Ted Nelson has gone so far as to suggest that software development is a branch of movie making)" |
| **Bill Gates** | 调侃 | [二手] Inmates 摘要："Bill Gates observed → the way you make software user friendly, is to stamp each box with 'USER FRIENDLY'"（**转述，且疑为反讽，不应作为 Gates 原话使用**） |

---

## 八、矛盾与存疑记录（**直接记录，不做调和**）

### 矛盾 1：persona 的首创权 —— Cooper 自述 vs 同期同行质疑 ★
- **Cooper 方**：[一手·转引]《The Origin of Personas》(2003) 称 "These three were the first true, Goal-Directed, personas"，并把首次公开出版定在 1998 年的 *Inmates*。
- **质疑方**：[二手] Victor Lombardi, "The Real Origin of Personas"（2003-08-25），https://www.noisebetweenstations.com/personal/weblogs/tinderbox/design/process/personas/therealo.shtml
  > "Alan Cooper, in his new column The Origin of Personas, **claims to have developed personas as an original idea**. While he qualifies his words ('introduced the use of personas as a *practical* interaction design tool', 'the history of *Cooper* personas'), he cites the first published mention of them was 1998's The Inmates Are Running the Asylum."
  > "**I learned them from Tog**, who discusses their use in his 1992 book *Tog on Interface*. Tog focuses on the scenario aspect of personas, but the same technique of selecting a small set of prototypical users is there. **He in turn cites Laurie Vertelney's 1989 CHI paper** on Drama and Personality in User Interface Design…"
  > "So perhaps there were parallel efforts, or maybe some cross-fertilization took place in the Bay Area interaction design scene."
- **Cooper 自己的措辞本来就是有限定的**（Lombardi 明确指出）：他说的是"作为**实用的**交互设计工具引入"，说的是"**Cooper 式** persona 的历史"。**两方并不完全在同一点上对撞**，但**公开记录确实存在争议**。本文件并列记录，不裁决。

### 矛盾 2：《The Inmates Are Running the Asylum》的出版年份
- [一手] Cooper 本人在 About Face 3 作者小传中写：**"in 1998"**。
- [一手] 该书版权页显示第一版 1999（Sams），第二版第一次印刷 **2004 年 3 月**。
- [二手] Alison Head 引注为 **"Indianapolis: Sams, 1999, pp. 123-24"**。
- [一手·转引]《The Origin of Personas》又写 "published in 1998"。
**记录：作者自述与版权页不一致，疑为完稿年（1998）与出版年（1999）之别。不强行统一。**

### 矛盾 3：persona 是「发现」还是「发明」
- [一手] About Face 3 Ch5：**"We discover our personas during the course of the Research phase"**；"Personas must, like any model, be based on real-world observation."
- [一手·转引] 2001 Dubberly 转述 Cooper 的第 4 条变革：**"Define one specific user for your product; then invent a persona"**（用 invent）。
- [二手] Head 引 Inmates：**"Personas are not 'made up'; they are discovered as a by-product of the investigative process."**
**记录：「发现」是方法论主张，「发明/invent」是流程动作描述；两者在文献中混用。保留矛盾。**

### 矛盾 4：《About Face》第 4 版第 2 章究竟是哪一章
见 1.3 节：Perlego 片段（CH2 = Understanding the Problem: Design Research）与 Booktopia 片段（出现 "Implementation Models and Mental Models 16"）冲突。**未取得正式目录，不调和。**

### 矛盾 5：Cooper 与 Raskin 关于「好设计是否自明」
见 7.2。**双方立场直接对立，保留原样。**

### 矛盾 6：persona 起源文章的日期与 URL
- BibSonomy 记录：**2003-08-01**，cooper.com/journal/2003/08/the_origin_of_personas.html
- 现存的 cooper.com PDF 存本标注：**May 15, 2008**，cooper.com/journal/2008/05/the_origin_of_personas
- Tim Strehle 的转引日期：2003-10-20
**记录：疑为 Cooper Journal 改版后 URL 迁移导致的重复日期，但无法在后端核实。**

### 矛盾 7：Inmates 里 persona 描述的篇幅
- [一手·转引] Cooper 自称："the brief **25-page** description of personas in Inmates"。
- [二手] Head 的引注只指到 **pp. 123-24** 两页。
**推断（标明为推断）**：25 页可能指第九章整章，pp.123-24 是 Head 摘取的定义性段落。**未核对原书，存疑。**

---

## 九、信息不足与明确留白（**未找到一手来源，不造引文**）

| 缺口 | 状态 |
|---|---|
| 《About Face》第 1 版（1995）目录与章节 | **未取得任何可靠目录**（loc.gov 403，无其他镜像） |
| 《About Face》第 2 版（2003）完整目录 | **未取得**（loc.gov 403） |
| 《About Face》第 3 版 Part II 之后完整目录 | **未取得**（docslib 转录页在 Ch5 p.82 截断） |
| 《About Face》第 4 版（2014）完整目录与正文 | **未取得**（仅两个互相冲突的零售商片段） |
| **Implementation / Mental / Represented Model 的 Cooper 逐字定义** | **未取得**。仅有：①第 3 版目录的正式小节名；②读者笔记的三行转述；③flylib 一条被 403 拦截的摘要 |
| **Posture 四类姿态的 Cooper 逐字定义** | **未取得**。仅有 flylib 摘要一句 + Tidwell 自称"改编"的模式描述 + TWiki 归属声明 |
| **"polite error messages" 的 Cooper 逐字定义** | **未取得**。可确认他确有"礼貌软件"讨论（[二手] 摘要："quality, quantity, relevance and clarity"），以及 1996 年原始批评 |
| **"don't make the user do the computer's job"** | **未找到任何一手来源**，连二手逐字引用也未找到 |
| **"interaction design is the missing discipline"** | **未找到一手来源**；仅有同义转述 |
| **"halo of the digital age"** | **完全未找到**，任何语料中均未见 |
| **Cooper 对 Don Norman 的公开评价** | **未找到** |
| **Cooper 对 Alan Kay 的公开评价** | **未找到** |
| **Cooper 对"敏捷/Scrum"的具名评价** | **未找到**；仅有对"迭代直到成功"的一般性批评（[二手] 转述） |
| **Cooper Journal 完整文章归档** | **不可达**（cooper.com 已 404，web.archive.org 在本环境 DNS 被拒） |
| **Cooper 个人 Medium 全部正文** | **不可达**（Medium 域名 fetch 失败）；仅确认 12 篇标题与日期 |
| **《The Inmates》完整正文** | **不可达**（PDF；docslib 转录页本次 fetch 失败）；章节结构来自 [二手] 摘要（Ch1–Ch7，后续被截断） |
| **InfoQ 2014 年访谈《Alan Cooper Talks About Face 4》** | **不可达**（HTTP 405 人机校验）——这本应是核对第 4 版改动的最佳一手材料 |
| **BayCHI 2002《Humanizing Technology》内容** | **永久不可得**（该系列明确不录制、禁止录音） |

---

## 来源统计

| 类别 | 条数 | 说明 |
|---|---|---|
| **[一手]** | **14** | ① Goal-Directed Software Design, DDJ 1996/09（全文）；② The Myth of Metaphor, 1995（全文）；③ About Face 3 Ch5 逐字文本；④ About Face 3 版权页+Part I 目录；⑤ About Face 3 作者小传（含 Inmates 年份自述）；⑥ Inmates 版权页＋"Goal-Directed design"商标声明；⑦ Inmates 目录/前言信息（archive.org 书目）；⑧ User Defenders #053 逐字稿（2018）；⑨ CHM 口述史（2017）；⑩ BayCHI《Humanizing Technology》演讲页（2002）；⑪ 1996 DDJ 作者小传（AF 1st ed. 1995 书目证据）；⑫ mralancooper.medium.com 12 篇署名文章（标题/日期核实，正文未抓）；⑬ designprinciplesftw 收录的 Cooper 原则集（未抓条目）；⑭ The Origin of Personas 逐字引文（**经第三方转录取得**，计为一手但已标注转录风险） |
| **[二手]** | **18** | ① oleksii.shmalko 2014 版笔记；② greg bulla 第 3 版笔记；③ charlie deck 第 3 版笔记；④ Dubberly《Alan Cooper and the Goal Directed Design Process》2001；⑤ andrewclark.co.uk《Inmates》章节摘要；⑥ Alison J. Head《Personas: Setting the Stage…》2003（含 Kim Goodwin 访谈）；⑦ Victor Lombardi《The Real Origin of Personas》2003；⑧ Tim Strehle 博客（Origin of Personas 转引）；⑨ Christina Wodtke《battle of the titans》2001；⑩ Jenifer Tidwell《Sovereign Posture》模式（Adapted from About Face）；⑪ cse.taylor.edu Posture/Platform 讲义；⑫ TWiki Transient Posture 词条；⑬ Michael Swaine, DDJ 2004/07《The Kitten's Spreadsheet》；⑭ Booktopia 第 4 版目录片段；⑮ Perlego 第 4 版目录片段；⑯ ACM DL / Wiley 书目记录（三版）；⑰ Xin Wang《Personas in the User Interface Design》(U Calgary)；⑱ Vu（VU Pakistan）CS408 HCI 讲义（Inmates 的课程化转述） |
| **[推断]** | **7** | ① 书名 UI→Interaction 迁移与其主张同向；② mental model 源出 Norman / represented model 为 Cooper 所加；③ 四类 posture 的直觉含义；④ "don't make the user do the computer's job" 与 scarcity thinking 同源；⑤ Goal-Directed Design 五阶段的来源归因；⑥ Cooper 与 Raskin 分歧的实质是「设计者权威 vs 用户投票」；⑦ Inmates 中"25 页"= 第九章、"pp.123-24" = Head 摘取段的猜测 |

**统计口径说明**：
- 同一 URL 若同时提供了一手正文与二手评论，只计入其中更贴近原文的一类；
- "一手·索引摘要"（flylib 等被 403 拦截、仅取得搜索引擎摘要的条目）**不计入一手**，统一归入二手，并在正文中逐条标注；
- 全部引文均来自本次实际抓取的页面文本；**凡未抓到原文的表述，一律以「未找到一手来源」标注，未做任何补写。**

---

## 附：本文件的写作纪律自述

1. **凡引号内的英文，均为本次从页面上实际读到的字符**；凡属他人转述而非 Cooper 原话的，一律在紧邻处标注「（转述）」「（非原句）」「（措辞经改写）」。
2. **凡未抓到的原文，宁留空白**。本文件在 Implementation/Represented Model、Posture、polite error messages、"don't make the user do the computer's job" 等处均明确留白，未使用任何记忆中的疑似原文充数。
3. **凡矛盾，并列记录不调和**（第八节共 7 条）。
4. 信息源黑名单（知乎、微信公众号、百度百科、百度知道）**未使用**；需说明的是，本轮默认搜索引擎（Bing zh-CN）对这些域名的返回率极高，因此几乎全部检索改由 Exa / Keenable / Tavily 完成。
