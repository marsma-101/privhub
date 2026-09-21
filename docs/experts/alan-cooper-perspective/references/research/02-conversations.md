# 02 · 长对话、播客与访谈

**调研对象**：Alan Cooper（1952— ），"Visual Basic 之父"、Cooper 设计公司创始人、《About Face》《The Inmates Are Running the Asylum》作者、persona 方法提出者。
**调研日期**：2026-09（以调研当日准）
**信源分级**：`[一手]` = 直接访谈/播客/演讲原文或转写；`[二手]` = 他人转述、报道、评论；`[推断]` = 本文基于证据的推论（非其原话）
**核心约束**：所有英文引文均为抓取到的原文；凡转述一律标注"转述，非原话"；未找到的维度明确写"未找到"。

---

## 0. 一句话画像（供快速定位）

Cooper 在长对话里呈现三种稳定模式：

1. **被质疑时不退让、不折中，而是改写问题本身**——不回答"是/否"，回答"你问的问题错了"。
2. **以类比代替论证**——他的说服力来自比喻而非数据，且大量类比来自农场、工业、军事、医学四个语域。
3. **会承认情绪与偏见，但不撤回判断**——他多次公开承认"我当时在发脾气""那是我的偏见"，但结论一字不改。

以及一条同样重要的观察：**他的立场确实变过，但变化方向是"从对立转向收编"**——从"敏捷是坏的"到"敏捷与交互设计是盟友"，从"设计师不该写代码因为你不重要"到"这问题本身不成立"。详见 §3。

---

## 1. 被追问时的回答方式

### 1.1 模式 A：**加倍 + 升级论域**（最常用）

被质疑"我们的应用本质上就复杂，简化不了"时，他没有讨论复杂度，而是把话题升到政治压迫的层面，用封建君主制类比，直接判定对方"错了"：

> **Alan:** "Right, they're wrong. That's just like saying '… we have a feudal autocracy and monarchy and we just have to keep the lower classes oppressed because they're just, you know, not intelligent capable people and we have to oppress them. They like it.' I mean, people have said this kind of oppressive obnoxious untrue stuff for thousands of years and a lot of people believe it, but that doesn't make it true."
> —— UXpod（User Experience Podcast），2006 年 12 月 `[一手]`
> https://uxpod.com/episodes/personas-and-outrageous-software-an-interview-with-alan-cooper.html

### 1.2 模式 B：**归因于提问前提，绕开问题内容**

2018 年被问"设计师该不该写代码"，他拒绝在"该/不该"的坐标里作答：

> **Alan Cooper:** "I really don't think that's a relevant question. I mean, that's like saying should designers waterski."
> —— User Defenders 播客 #053 Part II，2018-09-17 `[一手]`
> https://userdefenders.com/podcast/053-be-a-good-ancestor-with-alan-cooper-part-ii/

紧接的追问（一人公司怎么办），他用医学场景反打：

> "Now everybody then starts throwing in my face this thing about the one man shop and to which I say the one-man shop, I say do you want to go and get your heart replaced in a one-man shop operating theatre. I don't think so. If you're trying to build some world-class software in a one-man shop, what the hell's wrong with you?"

### 1.3 模式 C：**承认情绪，不撤回观点**（罕见的自我曝光）

这是最有信息量的一处。他复述自己那条"没有 UX 设计这回事"的推文时，直接认错——但认的是**方式**，不是**内容**：

> **Alan Cooper:** "I meant I was angry and frustrated and I was venting and I'm sorry, I do this stuff. You know, Twitter is the stream of consciousness broadcasting machine and sometimes I broadcast with my inner voice and I shouldn't."
> —— User Defenders 播客 #053 Part I，2018-09-10 `[一手]`
> https://userdefenders.com/podcast/053-be-a-good-ancestor-with-alan-cooper-part-1

同一段对话里他立刻亮出这个自认的"偏见机制"：

> "So whenever I'm angry at lightweights, you know, mailing it in, not actually doing the hard work of designing good software and fighting the good fight to get good user interaction design, good technology behavior out into the field. What I do is I of course attribute that to user experience designer. Whenever I see really wonderful craft, very well done and well positioned in the industry, I go well that's the interaction design. So you have to understand that's my prejudice."

并在主持人为"共情（empathy）"辩护时，用比喻正面顶回去：

> "And words like empathy to me or excuses for lack of discipline, it's like somebody who says, well, I don't really – it's like a welder saying, well, I don't know how to get these to get good penetration on these welds, but isn't this sculpture beautiful?"

同一场里他也承认自己被问烦了，用自嘲收尾，但不改判断：

> "User experience means something different to everybody. Yeah, I agree. And so I don't know why, you know, rage against the light. I mean, you know, it's like me yelling at the sunrise."

### 1.4 模式 D：**讽刺 + 给行业判决，而非给答案**

2006 年被问"没有用户研究就脑暴出两三个 persona 行不行"，他给的是饮食消费比喻：

> **Alan:** "Well I think that's a lot like having a Diet Coke and a Snickers bar for lunch. [Laughter.] You can tell yourself you're being conservative by having that Diet Coke but you're not."
> —— UXpod，2006 年 12 月 `[一手]`

并被 Gerry Gaffney 追问"persona 会不会让人以为用户研究一劳永逸"时，他连答两个"Yes."，拒绝展开——**这就是他的一种回避方式：用最短肯定句关闭话题**（见 §4）。

### 1.5 汇总表

| 场景 | 应对策略 | 是否退让 | 出处 | 可信度 |
|---|---|---|---|---|
| "我们的应用本质就复杂，简化不了" | 升级论域到政治压迫，判对方"错了" | 否，加倍 | UXpod 2006 | `[一手]` |
| "没有研究，脑暴 persona 行吗" | 讽刺类比（可乐配士力架） | 否 | UXpod 2006 | `[一手]` |
| "persona 会否让人觉得研究做完了" | 连答两个 "Yes." 后不展开 | 回避 | UXpod 2006 | `[一手]` |
| "同理心是最好的设计" | 用焊工/雕塑比喻直接反驳 | 否 | User Defenders 2018-I | `[一手]` |
| "设计师该不该写代码" | 归因于提问前提（"像问设计师该不该滑水"） | 否，绕开 | User Defenders 2018-II | `[一手]` |
| 主持人指其推文"没有 UX 设计"过于挑衅 | 认错（认方式）+ 保留内容判断 | 部分退让 | User Defenders 2018-I | `[一手]` |
| "该不该当众反抗雇主" | 劝退戏剧化行为，改为"微观代理" | 转向 | Interaction18 2018 | `[一手]` |

---

## 2. 即兴类比与金句（英文原句 + 出处）

### 2.1 "囚犯管理疯人院" 这一族

书名隐喻本身即其核心论点：让造软件的人（inmates）去决定人应该怎么用（asylum）。但需注意——**Cooper 的原句用词在不同场合有差异**，以下是可核实的表述：

> "If we want users to like our software, we should design it to behave like a likeable person: respectful, generous, and helpful."
> —— Computer History Museum 2017 Fellow 官方简介页引其语 `[一手]`（官方引用其原话，非访谈现场）
> https://computerhistory.org/profile/alan-cooper/

> "Interactive products should stand by their convictions. If we tell the computer to discard a file, it shouldn't ask, 'Are you sure?' Of course we're sure; otherwise, we wouldn't have asked. It shouldn't second-guess us or itself."
> "On the other hand, if the computer has any suspicion that we might be wrong (which is always), it should anticipate our changing our minds by being prepared to undelete the file upon our request."
> "How often have you clicked the Print button and then gone to get a cup of coffee, only to return to find a fearful dialog box quivering in the middle of the screen, asking, 'Are you sure you want to print?' This insecurity is infuriating and the antithesis of considerate human behavior."
> —— 《About Face》，经 Signal v. Noise（Adam Stoddard）逐字引用 `[一手·书面原文]`（**注：属书面原文，非访谈口语；本条只用于说明其"确认对话框"立场的原始表述**）
> https://signalvnoise.com/svn3/are-you-sure/

> **转述，非原话**：播客主持人 Jason Ogle 在 2018 年访谈中引用了 Cooper 书中一句他"很喜欢"的话，转述为"putting an Armani suit on Attila the Hun, interface design only tells you how to dress up an existing behavior"。Cooper 当场回应 "Well, thank you by the way."（未纠正措辞）。**该句准确原文我未在可访问的一手来源中直接核对到，仅作为被引用的转述处理。**
> —— User Defenders 播客 #053 Part I，2018-09-10 `[一手访谈 / 引文为转述]`

### 2.2 核心比喻清单

| 英文原句 | 中文 | 语域 | 出处 | 可信度 |
|---|---|---|---|---|
| "personas… are the bright light under which we do surgery" | persona 是我们做手术时的那盏无影灯 | 医学 | UXpod 2006 | `[一手]` |
| "like having a Diet Coke and a Snickers bar for lunch" | 像拿无糖可乐配士力架当午饭 | 饮食 | UXpod 2006 | `[一手]` |
| "iterating in software is like iterating in concrete" | 在软件里迭代，像在混凝土里迭代 | 建筑 | UXpod 2006 | `[一手]` |
| "Stay-Puft Marshmallow Man of software development" | 软件开发界的棉花糖巨人（捉鬼敢死队） | 流行文化 | Interaction08 问答，经 Coding Horror 引用 | `[一手·问答]` |
| "I call it the invasion of the lightweights" | 我称之为"轻量级选手的入侵" | 代际/军事 | User Defenders 2018-I | `[一手]` |
| "I'm shaving with an axe. Exactly, a dull axe; a rusty dull [axe]" | 我拿斧头刮胡子——还是把生锈的钝斧 | 工具 | User Defenders 2018-I | `[一手]` |
| "it's like a welder saying, well, I don't know how to get these to get good penetration on these welds, but isn't this sculpture beautiful?" | 像焊工说：我焊不透，但这雕塑好看吧？ | 工业 | User Defenders 2018-I | `[一手]` |
| "This insecurity is infuriating and the antithesis of considerate human behavior." | 这种不自信令人恼火，是"体贴的人类行为"的反面 | 人际 | 《About Face》 | `[一手·书面]` |
| "there's no large group of people out there waiting in a breathless delirium to purchase your lousy product sooner rather than later" | 没有一大群人正屏息以待、急着买你那烂产品 | 市场 | Agile 2008 主题演讲《The Wisdom of Experience》 | `[一手·演讲]` |
| "software is a magic transformation agent. Everything it touches is changed utterly and completely. Everyone who designs, develops and deploys software is an alchemist too." | 软件是魔法转化剂，它碰到的一切都被彻底改变；设计、开发和部署软件的人都是炼金术士 | 炼金术 | UXLx 2016 主题演讲，Graphic Mint 访谈中复述并请其展开 | `[一手·演讲引用]` |
| "like throwing cocaine out the window of a moving car" | 像从行驶的车窗往外扔可卡因 | 犯罪 | User Defenders 2018-II | `[一手]` |
| "you can't divert the course of the Mississippi River where it's a mile wide, but you can go up to where it's a tiny little rivulet… and you can divert the Mississippi with a shovel" | 密西西比河一英里宽处你改不了道，但到落基山上它只是小溪时，一把铲子就能改道 | 水利/农耕 | User Defenders 2018-II & Interaction18 | `[一手]` |
| "You can't ignore systems… all systems go haywire" (引 John Gall 的 General Systemantics) | 系统失效是系统的固有特性 | 系统工程 | Interaction18 keynote | `[一手]` |
| "It's as though the Titanic ship of technology is sinking. But we never hit an iceberg." | 科技这艘泰坦尼克在沉，可我们从没撞上冰山——是上亿个显微镜级小孔 | 海事 | Interaction18 keynote | `[一手]` |
| "Power is the ability to change macro structures. Agency works on the micro level. Agency is local; power is global." | 权力改宏观结构，能动性在微观；能动性是局部的，权力是全球的 | 政治学 | Interaction18 keynote | `[一手]` |
| "profit is a byproduct of quality" (引 Steve Jobs) | 利润是质量的副产品 | 商业 | User Defenders 2018-II；Interaction18 亦引用 | `[一手·转引他人]` |
| "I helped to create the Y2K bug. (I'm very proud of that, actually.)" | 我帮着造出了 Y2K 虫（其实我挺自豪的） | 自嘲 | Interaction18 keynote | `[一手]` |
| "There is no such thing as UX design" | 没有"UX 设计"这回事 | 挑衅断言 | 推文 + User Defenders 2018-I 自述语境 | `[一手]` |
| "it's like me yelling at the sunrise" | 像冲着日出吼 | 自然 | User Defenders 2018-I | `[一手]` |
| "Does it take empathy and caring common sense, it takes training and expertise and talent and experience" | 不靠共情和常识，靠训练、专业、天赋和经验 | 手艺 | User Defenders 2018-I | `[一手]` |

**未找到**：任务提示中提到的 "the emperor's new clothes"、"在飓风中设计"（designing in a hurricane）两类比喻，我在可访问的一手访谈/演讲转写中**未找到** Cooper 本人的使用实例。其常用气象/自然类比喻实际是"冲着日出吼"与"密西西比河改道"。

### 2.3 他的手艺人自我定位（反复出现）

> "Programmers are smart, hard-working and eager to please… [Programmers'] It isn't art, science or engineering. It is craft."
> —— Agile 2008 主题演讲《The Wisdom of Experience》，参会者现场笔记 `[一手·转写]`
> https://blog.nayima.be/2008/08/12/agile-2008-alan-cooper-keynote/

> "It's like programming. You can't say, 'Oh, I don't like this syntax, I'm gonna not use those stupid semi-colons.' That doesn't work! It's like saying you don't like cars because you have a thing against wheels."
> —— Atomic Object 访谈，2016-11-15 `[一手]`
> https://spin.atomicobject.com/alan-cooper-interview/

---

## 3. 立场变化与前后矛盾（信息量最大的一节）

**总览：他的核心价值判断 30 年未变（用户优先、目标导向、反对把设计当装饰）；变的是"敌人是谁"和"盟友是谁"。三处立场变化都可考据，且方向一致——从对立叙事转向收编叙事。**

### 3.1 变化一：对敏捷（Agile / Scrum）——**最确凿的反转**

**阶段 A（2008 年初，ESRI Developer Summit）：公开否定**

> **转述，非原话**（参会者 Hans-Eric Grönlund 的现场记录）：Alan 在演讲早期"stated that agile processes are bad for developing quality software"，并认为"the idea of little or no upfront design is ridiculous and will result in either expensive development costs or crappy software"。
> 该记录随后**长段引用**了 Cooper 同场演讲/公司文章的原话：
> > "Most business executives believe that writing production code is a good thing… Writing production code is extremely expensive and extremely permanent. Once you've written it, it tends to stay written… Annoying your programmers is more self-destructive to a company than is annoying the Board of Directors."
> > "Software construction is slow, costly, and unpredictable… Unpredictable is by far the nastiest of these three horsemen of the software apocalypse… As the airline pilots say, 'Plan your flight, and fly your plan.'"
> > "Collaboration with the customer (or users), as the agile methodologies suggest, is out of the question according to Alan. Why let the least qualified make the most important decisions, he reasons."
> —— 记录来源：https://www.hans-eric.com/2008/03/28/is-agile-only-for-elites/ （2008-03-28）`[一手·参会者转写 / 引文为其文章原句]`

**阶段 B（2008 年 8 月，Agile 2008 主题演讲《The Wisdom of Experience》）：同一年的自我修正**

在敏捷大会的讲台上，他把交互设计师和敏捷程序员定性为**盟友**：

> **转述，非原话**（参会者现场笔记）："Interaction designers and agile programmers are allies. Both of them are craftsmen, work hard and build tangible, testable deliverables. Interaction designers can help programmers to understand business goals and users."
> "Agile is unique because it's the first time developers create a revolution based on people and process, not technique and tools."
> "Agile is a coping tool. Coping with unreasonable clients, incompetent designers, documentation and process excess, foolish managers."
> —— https://blog.nayima.be/2008/08/12/agile-2008-alan-cooper-keynote/ `[一手·参会者转写]`

同一场演讲提出 **The Triad（三位一体）**，明确说它**调解**了敏捷与传统方法：

> "Currently there is a pitched battle raging in the programmer world between conventional engineering methods and Agile methods. What neither side sees is a path of reconciliation… Providentially, the Triad reconciles them very well."
> "The lean, iterative, problem-solving work of the software design engineer is the archetype of Agile programming. The purposeful, methodical construction work of the production engineer is the quintessence of conventional software engineering… Both methods are correct, but only when used at the correct time and with the correct medium."
> —— 引自 Cooper 公司文章《Design engineering: the next step》，经 Hans-Eric Grönlund 大段引用 `[一手·文章原文 via 二手引用]`

**阶段 C（2008 年 8 月同场演讲，对敏捷的"降级"表述）**

> "Agile is the new toy. But there's is no silver bullet. And we have to consider the context to define 'good'."
> —— https://blog.nayima.be/2008/08/12/agile-2008-alan-cooper-keynote/ `[一手·参会者转写]`

**阶段 D（2008 年 10 月）：公开承认敏捷有位置，但只限设计阶段**

> **转述，非原话**（参会者记录）："Alan doesn't rule out agile methods completely. He thinks they have a place, but only as a part of the design process."
> —— 同上来源 `[一手·参会者转写，含记录者的解读成分]`

**[推断]** 他对敏捷的实际立场演变轨迹是"拒绝 → 调解 → 限定位置"。**未见其 2009 年之后公开否定敏捷的记录**；相反，2024 年一段关于敏捷史的访谈（AI Foundry 播客，Elisabeth Hendrickson 回忆）显示他曾在一次名为 *Agile Up to Here* 的工作坊中与 Jeff Patton、Elisabeth Hendrickson、Jonathan Bach 同场合作，主题正是"如何把设计放进敏捷"——即他最后是被"拉进"敏捷阵营、而不是把敏捷驳倒。
> —— https://blog.aifoundry.org/p/aifoundryorg-podcast-co-developing （2024-10-24）`[二手·他人回忆，非 Cooper 原话]`

**矛盾保留**：Cooper 从未公开收回 2008 年初"小规模前期设计是荒谬的"这类判断，也从未明确承认自己改口。真正的转折发生在他身上，却没有对应的自述。**这是本次调研中最明显的"未和解矛盾"。**

### 3.2 变化二："设计师要不要会写代码"——**结论不变，论证变了三次**

| 年份 | 场合 | 说法 | 变化点 |
|---|---|---|---|
| 2008 | Interaction08 问答 | "We are not very important because we don't cut code."（观众发出嘘声）"In the world of high-technology, if you cut code, you control things." | **论证 = 权力**：设计师没权力，因为不写代码 |
| 2017 | 推文 + UX Podcast #155 | "Nobody is disagreeing with this, but breathless demands for designers to 'know code' masks bigger problem of coders steamrolling designers." | **论证 = 掩盖真问题**：要求设计师会写代码，是为了掩盖程序员碾压设计师 |
| 2018 | User Defenders #053-II | "I really don't think that's a relevant question. I mean, that's like saying should designers waterski." | **论证 = 问题不成立**：整场争论是伪命题 |

- 2008 引文出处：Jeff Atwood, Coding Horror, 2008-02-14，逐字引用 Interaction08 问答 `[一手·问答 via 二手引用]` https://blog.codinghorror.com/the-ultimate-unit-test-failure/
- 2017 推文：UX Podcast #155 节目页正文直接镶嵌该推文（2017-04-06）`[一手]` https://uxpodcast.com/155-misinformation-alan-cooper/
- 2018 引文：https://userdefenders.com/podcast/053-be-a-good-ancestor-with-alan-cooper-part-ii/ `[一手]`

**[推断]** 三段论证并不彼此等价：2008 年他承认"不写代码 = 不重要"，2017–2018 年他否定这个前提。**这是实质性立场松动，不是修辞变化。** 另注：他 2017 年 5 月连发四篇《Should Designers Code?》系列（Pt.1 / No, Part Two: Know Versus Do / No, Part Three: Roles and Responsibilities / 第四篇），标题结构本身就是"先给立场、再分篇论证"的模式。
> 系列链接（Medium，本次未能抓取正文，仅由检索结果确认存在与标题）`[一手·未获取正文]`
> https://medium.com/@MrAlanCooper/should-designers-code-f7b745b8cd03
> https://mralancooper.medium.com/should-designers-code-417de265531c
> https://mralancooper.medium.com/should-designers-code-b98e69f6b56c
> https://mralancooper.medium.com/should-designers-code-cde3ef9d6621

### 3.3 变化三：persona 被滥用——**判断没变，动作变了**

**阶段 A（2006）**：早已在批判滥用，且语气是"这不算 persona"

> "I like to refer to personas as the bright light under which we do surgery. I don't want people to misunderstand and think that personas are in and of themselves design. I know that there a lot of people out there who create personas or think they're creating personas and then they just do this business as usual and not much happens except they can now say they did personas."
> **Gerry:** "…we do see people who've got like whole suites of personas and, you know, anti-personas…"
> **Alan:** "Well, that's not doing personas."
> "Microsoft may create 200 personas for Microsoft Word but that's because they don't understand the process."
> —— UXpod 2006 `[一手]`

**阶段 B（2016）**：措辞升级为"大多数人用的是假流程"

> "People misunderstand personas. They learn about personas, but what they learn about is not what I could call a persona. Most people who create and use personas are doing some bogus process that doesn't work very well, and that's why a lot of people go around saying, 'Personas don't really work that well.' That's because they're not actually using personas."
> —— Atomic Object 访谈，2016-11-15，回答"你对 persona 实践的理解随时间变化了吗" `[一手]`

**阶段 C（2021）**：从"纠正"转向"辩护/放手"**

> 文章标题：**"Defending Personas — If you love a design tool, set it free"**（2021-03-09）
> 开头（检索快照可见原文）："Yesterday, on a video conference call, I gave a presentation to more than a thousand people around the world. I was bill…"
> 另有可确认原句："I created and developed design personas over many years and they became one of our central design tools at my consulting…"
> —— https://mralancooper.medium.com/defending-personas-2657fe26dd0f `[一手·标题与开头已核，正文未获取]`

**[推断]** 从 2006"那不是 persona"→ 2016"那是假流程"→ 2021"要为它辩护 / 该放手了"：**他对"滥用"的判断 15 年未变，但对"该怎么办"的答案变了**——从斥责使用者，转向承认这个工具一旦交出就管不住。副标题 "set it free" 是这一转向的信号。**注意：2021 年正文我未能抓取，此推论强度有限，标 `[推断]` 且存疑。**

**旁证（2020 年）**，他自述创造 persona 的漫长过程，说明他对"工具贬值"这件事有长期心理准备：

> 文章标题：**"The Long Road to Inventing Design Personas / It's hard to be simple"**（2020-02-04）
> https://mralancooper.medium.com/in-1983-i-created-secret-weapons-for-interactive-design-d154eb8cfd58 `[一手·标题已核，正文未获取]`

### 3.4 变化四：对"用户 vs 商业"的框架——**从敌对到"利润是质量的副产品"**

- **2006（敌对框架）**：技术方与管理层是"武装停战"；程序员把交互设计师视为**争夺稀缺资源的对手**，而管理层用工业时代工具管理后工业的软件。

> "Companies today are managed using industrial-age management tools, and so what you tend to get is kind of an armed truce between business people and technologists…"
> "…software builders, programmers and engineers tend to see interaction designers as competing for scarce resources. They see them as an adversary rather then as their biggest helper which is what they really are."
> "…the management tends to do is just kind of build a fence around the technologist."
> —— UXpod 2006 `[一手]`

- **2018（同一框架，但把对手范围收窄、并给出商业正当性）**：

> **Jason:** "…the real struggle and tug of wars between designers and business people."
> **Alan Cooper:** "Well, it's not between designers and business people… really it's between humans and people who want money. Now, don't get me wrong, I want money, you know, and I don't disrespect the people who want money, but I believe as Steve Jobs said, 'profit is a byproduct of quality'."
> —— User Defenders 2018-II `[一手]`

- **2018（Interaction18，否定"先赚钱再讲道德"的顺序）**：

> "There is abundant proof that this does not work. When your primary goal is to make money, all other goals devolve into mere words. 'Don't be evil' is too vague, too simplistic, and too hard to relate to the daily work of tech."
> "Conservative political dogma says that you can either make money or you can be a good citizen, but not both. This is a lie."
> —— Interaction18 主题演讲《The Oppenheimer Moment》，2018-02-06，完整转写 `[一手]`
> http://opentranscripts.org/transcript/the-oppenheimer-moment/

**[推断]** 2006 年他把问题诊断为"管理层不懂技术、资源零和"；2018 年他改口为"商业与道德可以兼容，只是 CEO 的激励结构不对"。这是**诊断框架的反转**：从结构性无解，转向"选择问题"。

### 3.5 找不到的"改口"：对 Don Norman 的评价

**未找到。** 我定向检索了 "Alan Cooper" 与 "Don Norman" 的组合，可访问结果中没有 Cooper 对 Norman（或反过来）的公开评价。

仅有的间接材料：
- 1997 年 SIGCHI Bulletin 中，Peter Morville 把 Cooper 与 **Jakob Nielsen** 在同一场会议上的两天课程并列对比，并直言"Cooper 的大多数观点没有例子支撑，我听完一头雾水"，而"Jakob 用真实用户测试的证据支撑了他所有观点"。**这是 Morville 对 Cooper 的评价，不是 Cooper 对 Nielsen/Norman 的评价。** `[二手]` https://homepages.cwi.nl/~steven/sigchi/bulletin/1997.3/morville.html
- 2002 年一篇 ZDNet 的六人访谈合集《The church of usability》把 Cooper 与 Nielsen 同列，但正文未能取得。`[二手·未获取正文]` https://www.zdnet.com/article/the-church-of-usability/

**结论：Cooper 与 Norman 的关系是本次调研的空白维度，不可推测。**

---

## 4. 他拒绝回答或回避的问题

Cooper 极少硬性拒答，他的回避方式是**换框架**或**用最短肯定句关闭话题**。以下是可核实的具体实例：

| 被问的问题 | 他的处理 | 出处 | 可信度 |
|---|---|---|---|
| "persona 会不会让组织以为用户研究一劳永逸、再也不必重做？" | 连答 "Yes." 两次；被追问"要不要展开"时说"我觉得做软件的人普遍在否认责任"，然后转向别的论点。**问题本身没有被回答。** | UXpod 2006 | `[一手]` |
| "UX / 交互设计 / UI 这些术语到底怎么定义？" | 明确拒绝："to me, interaction design, it's a terminology hell and you can give any definition you want to any of these words. I'm not arguing over the terminology." | User Defenders 2018-I | `[一手]` |
| "汉堡菜单该放左还是放右？" | 直接贬为无意义："It's like is give a shit, where do you think it should be. The user doesn't give a shit where you think it should be." | User Defenders 2018-I | `[一手]` |
| "未来 UX 长什么样？机器人会不会毁灭我们？" | 先声明不胜任："I don't lay claim to be much of a prognosticator." 然后只给一条判断（创造派 vs 重构契约派之争）。**明确回避预测。** | User Defenders 2018-II | `[一手]` |
| "我们该不该现在就举报老板的不道德要求？" | 拒绝给出英雄式回答："If you find yourself at the point in a product's development where clearly unethical requests are made of you… you're too late for anything other than brinksmanship. I applaud you for your courage if you're willing to put your job on the line for this, but it's unfair for me to ask you to do it." | Interaction18 2018 | `[一手]` |
| "Twitter 该不该封禁纳粹账号？Jack Dorsey 该怎么做？" | 拒绝给单人方案，转为系统论："There's no one to blame." "he isn't an evil person. And he's not guilty of any crime other than not thinking things through." 并称"这是系统问题：我们不是在找冰山上那个大洞"。 | Interaction18 2018 | `[一手]` |
| "你是不是一位伟大的交互设计师？" | 自我贬低式回避："People think I'm a great interaction designer. The truth is, I'm okay. Others are much better than me. One thing I did do was realise that the practice of interaction design needed to exist. I saw that ten years before other people did." | Graphic Mint 访谈 2016 | `[一手]` |
| "你的立场变了吗？"（被直接问 persona 理解是否变化） | 不承认"变化"，只答"人们误解了 persona"——**把"我改了吗"转成"他们做错了吗"**。 | Atomic Object 2016 | `[一手]` |

**观察**：他的"拒绝"几乎总是**拒绝把复杂问题降维给一个可执行答案**——尤其是"我该不该辞职""该封谁"这类要求他指定具体行动的问题。这不是回避知识，而是他一贯的"能动性 > 权力"框架（见 §2.2 金句表）。

---

## 5. 演讲与访谈中的具体断言

### 5.1 为什么 persona 比 "user" 好

> "**A persona** is a composite portrait of an idealized user: a single sheet of paper with name, picture, job description, goals, and often a quote. Cooper notes, 'We print out copies of the cast of characters and distribute it at every meeting… **Until the user is precisely defined, the programmer can always imagine that he is the user.**'"
> "**Personas are the single most powerful design tool that we use.** They are the foundation for all subsequent goal-directed design. Personas allow us to see the scope and nature of the design problem… [They] are the bright light under which we do surgery."
> "**Goals are not the same thing as tasks.** A goal is an end condition, whereas a task is an intermediate process needed to achieve the goal… The goal is a steady thing. The tasks are transient."
> —— Hugh Dubberly《Alan Cooper and the Goal Directed Design Process》，原刊 *Gain, AIGA Journal of Design for the Network Economy* Vol.1 No.2，2001-03 `[一手·文章原文 via 二手引述整理]`
> https://www.dubberly.com/articles/alan-cooper-and-the-goal-directed-design-process.html

**关键机制（他的核心论证）**：不是"persona 更亲切"，而是**persona 让程序员无法把自己当成用户**。这是他反对"user"这个词的根本理由。

他在 2018 年把同一逻辑用于批判"设计师中心"：

> "…what you find usually is that whatever crap you've put there, the users don't want. What the users tend to want is not that you change the controls from a menu item to a button or to a direct manipulation, but generally what they want you to do is **change the entire mental model** to be one that's more consistent with the way they conceive of the problem they're working with."
> —— User Defenders 2018-I `[一手]`

### 5.2 为什么开发者不该做界面设计

**核心论证 = 利益冲突（conflict of interest）**：

> "**Allowing the same person to design and program creates a conflict of interest.** Programmers want the product to be easy to code while designers desire to make the product easy to use."
> "**The design team must have responsibility for everything that comes in contact with the user.** This includes all hardware as well as software. Collateral software such as install programs and supporting products must be considered, too."
> "The single most important process change we can make is **to design our interactive products completely before any programming begins**."
> —— 引自 Cooper 文章，经 Dubberly 整理引用，2001 `[一手·文章原文 via 二手引述]`

**对程序员自我认知的直击**：

> "Interaction designers' motivations are very similar to those of design engineers, but **interaction designers are not programmers. Although most programmers imagine that they are also excellent interaction designers, all you have to do to dissuade them of this mistaken belief is to explain that interaction designers spend much of their time interviewing users.**"
> —— Cooper 公司文章《Design engineering: the next step》，经 Hans-Eric Grönlund 大段引用 `[一手·文章原文 via 二手引用]`

**2008 年问答中的权力诊断**（这是他最"骂人"的一段，观众当场发出嘘声）：

> "**We are not very important because we don't cut code.**" (A boo and hiss from the audience.) "In the world of high-technology, if you cut code, you control things. It's the power to destroy the spice, it's the power to control the spice… [Interaction designers are] largely marginalized. **We're constantly asking for permission from the folks who shouldn't be in a position to grant permission.**"
> "We don't need to change interaction design; **we need to re-orient organizations to build things right.**"
> —— Interaction08 主题演讲《An Insurgency of Quality》问答，Coding Horror 逐字引用，2008-02-14 `[一手·问答 via 二手引用]`
> https://blog.codinghorror.com/the-ultimate-unit-test-failure/
> 视频（IxDA 官方）：https://ixda.org/video/an-insurgency-of-quality

### 5.3 为什么功能清单式竞争（feature wars）是灾难

**机制论证（软件无负反馈约束）**：

> "In software, the cost of adding one more new feature is almost nothing; whereas adding features to mechanical devices almost always increases their cost. Cooper argues that **software is thus less constrained by negative feedback acting to limit complexity** than mechanical devices have been. The result is pure Rube Goldberg: software with feature piled upon feature. The trouble is that **each incremental feature makes a product *more* difficult to use.**"
> "In many companies, the resulting list of features often becomes the ***de facto* product plan**. Programmers make this approach worse by picking or negotiating their way through the list, often **trading time for features**."
> —— Dubberly 2001 `[一手·论点 via 二手引述整理]`

**他给"需求 ≠ 设计"的八条断言**（Agile 2008 演讲幻灯片，题为 *Requirements are not design*）：

> - Giving people what they say they desire does not result in success.
> - Your customers are not the same as your users.
> - Neither your customers nor your users know what they want or even what they do.
> - What people tell you has little bearing on the truth.
> - **Good user experience is not dependent on features**
> - **Radically different products can have identical features.**
> - **A list of features is not the same as the design of behavior.**
> - Expertise in a subject does not correlate to expertise in designing software behavior.
> —— 经参会者 Mike Slinn 逐条记录，2008-09-24 `[一手·幻灯片原文 via 参会者转写]`
> https://www.mslinn.com/blog/2008/09/24/breathless-delerium.html

**他给出的"求和式需求"批评（2006）**：

> "The other one is to say 'well, we'll go out and we'll ask all of our potential users what they want and we'll just put it all in the product' and I call this **the sum of all desired features** and you see a lot of that in bloatware like you get from Microsoft and that doesn't work either. It creates, well it can create, competent software but it always creates **unloved software**."
> —— UXpod 2006 `[一手]`

### 5.4 确认对话框与错误提示

**立场：反对确认对话框，主张"可撤销"取代"先问一遍"。**

> "Interactive products should stand by their convictions. If we tell the computer to discard a file, it shouldn't ask, 'Are you sure?'… if the computer has any suspicion that we might be wrong (which is always), it should anticipate our changing our minds by being prepared to undelete the file upon our request."
> "This insecurity is infuriating and the antithesis of considerate human behavior."
> —— 《About Face》，经 Signal v. Noise 逐字引用 `[一手·书面原文]`

**他 2018 年把"确认对话框回潮"归因于新一代设计师没受过训练**（这是本节最有价值的口语断言）：

> "…intuition is an incredibly shitty tool for interaction design because your intuition tells you that if you do an action that is highly dislocating, you know, like deleting a file, what you do is you put it a confirmation, you say, are you sure you want to delete that file? That's what your intuition tells you. But **we've pretty much proven conclusively over many years of software development. That's a really crappy solution that doesn't solve the problem, it slows everybody down**, it's really wrong and bad and that isn't how you do it."
> "And yet more and more I see products putting up dialog boxes for actions like that or even for innocent little actions like, are you sure you want to change the name of that file? And we know that's wrong. So, where does that come from? **I really think it's coming from designers who've never been taught the fundamentals.**"
> "…we finally won that battle and the confirmation boxes went away. **Now they're coming back. This is not the old folks. The old folks fought that war.**"
> —— User Defenders #053 Part I，2018 `[一手]`

> **同一段里他对 Apple 的具体点名（罕见的公开批评具体公司）：**
> "…Apple has really gone this trajectory of understanding that putting up silicon dialogue boxes and the hiding information is not a good thing, but as they've gone generation upon generation of designer at Apple, the later versions, the more recent versions of their programs are filled with all that old cruft that Apple got rid of 15 years ago and it's coming back… **they're recapitulating the same crap.**"

### 5.5 对敏捷 / Scrum 的公开批评（2.3 年表 → 此处给结论与最锋利原话）

**最锋利的一段（2008 年初，ESRI Developer Summit）：**

> "Most business executives believe that writing production code is a good thing. They assume that getting to production coding early is better than getting to it later. **This is not correct.** Writing production code is extremely expensive and extremely permanent. Once you've written it, it tends to stay written. Any changes you might make to production code are 1) **harmful to the conceptual integrity of the code**, and 2) distracting and annoying to the programmers. **Annoying your programmers is more self-destructive to a company than is annoying the Board of Directors.**"
> —— 经 Hans-Eric Grönlund 大段引用 `[一手·文章/演讲原文 via 二手引用]`

**他对"用户协作"的否定（同场）：**

> **转述，非原话**："Collaboration with the customer (or users), as the agile methodologies suggest, is out of the question according to Alan. **Why let the least qualified make the most important decisions**, he reasons."
> —— 同上 `[二手·参会者对其演讲的归纳]`

**同年 Agile 2008 的转折详见 §3.1。** 需要强调：他**在敏捷自己的大会上**把敏捷定性为"程序员对无能环境的应对工具（coping tool）"——这既是收编，也是贬抑：

> **转述，非原话**："Programmers feel surrounded by incompetence. **Programmers like Agile as a defence against that incompetence. Agile is a coping tool.** Coping with unreasonable clients, incompetent designers, documentation and process excess, foolish managers (who are mostly well-intentioned but use obsolete, industrial-age tools based on command-and-control). Managers have come to expect failure. Success seems random."
> —— https://blog.nayima.be/2008/08/12/agile-2008-alan-cooper-keynote/ `[一手·参会者转写]`

### 5.6 对 NPS、A/B 测试、数据驱动设计的看法

**先说清楚：关于 NPS，未找到 Cooper 的直接表态。** 以下是他对"度量/数据驱动的设计决策"的可核实批评。

**(a) 明确点名 A/B 测试，归入"设计师中心"病症：**

> "…so much of what passes for interaction design is actually a **designer centric practice**, not a user centered practice. It's about moving post–it around on the board. It's about coming up with really creative and interesting concepts and arguing over the relative merits and **then doing a/b rolling between, you know, one designer's cool concept versus another designer's cool concept**, and it's not about your cool concepts."
> —— User Defenders #053 Part I，2018 `[一手]`

**(b) 批评"把想法拿去用户那里弹一弹"当作研究：**

> "…a lot of young designers leave school having learned designer-centric techniques, which is about prototyping and testing and which is the generative work is it comes from the designer. Yes, it's bounced off of users, but **bouncing your ideas off users is not the same thing as generating your ideas from the needs of the user.**"
> —— 同上 `[一手]`

**(c) 引用 Goodhart 定律反对"以钱为唯一指标"，并把它推广到一切度量：**

> "…if your metrics are money, it's called Goodhart's law. Goodhart's law says that '**if a metric becomes a goal, it becomes gamed and it becomes worthless**'."
> "…when you look at making money as an objective, it's too coarse… **It's like when you're looking for a date, you don't think human, man or woman or something else, but you don't think human. It's two course of a metric. Making money is two of a metric.**"（原话如此，含口语重复）
> —— User Defenders 2018-II `[一手]`

**(d) 用 GDP 类比说明"指标不等于现实"：**

> "…it was the most wonderful thing that ever happened to the GDP was the Santa Rosa fire here a few months ago, where 7,000 houses burned to the ground… **So, the map is not the territory.**"
> —— 同上 `[一手]`

**(e) 对"数据/直觉"的取舍：他说直觉是糟糕的设计工具（引文见 §5.4），但同时也承认自己不做定量：**

> "Well, you see **I'm not a researcher. I'm not a scientist.** I'm a software inventor… I realised that in fact when I invented a design of software and then built it what I did was I imagined the user and I role-played who that user was and what they were trying to accomplish and personas are a formalisation of that what **Christopher Alexander calls un-self conscious process**."
> "The good news is that really good, valid, accurate, statistically useful personas can be determined in a remarkably short period of time, because **they're developed through a qualitative not a quantitative process.**"
> —— UXpod 2006 `[一手]`

**[推断]** 综合 (a)–(e)：他并不反对"看数据"，他反对的是**把度量当作目标**以及**把测试当作设计**。他本人明确站在定性一侧。**关于 NPS 的具体立场属空白，不可替代推断。**

### 5.7 其他反复出现的具体断言（便于引用）

- **对"效率/上市速度"**："There is no large group of people out there waiting in a breathless delirium to purchase your lousy product sooner rather than later."（Agile 2008）`[一手]`
- **对"计划浪费时间"**："I absolutely know for a fact that planning saves time in execution… it's only some kind of a real strange reality distortion myth in the world of software that planning somehow is a waste of time… **anybody who doesn't see that is a fool, and I would just not work for them**"（UXpod 2006）`[一手]`
- **对 persona 数量**："they're not so much things you make as they are things you discover and so if you go out and discover that there's seven personas it means you **do not have appropriate focus**… a given product will have an informative suite of about five or six personas of which we will focus our design on one or two."（UXpod 2006）`[一手]`
- **对 persona 与市场细分的区别**："What interaction design does is we go directly to that motivation and not for why somebody would want to buy, but **why somebody would be satisfied using**, because that's a deeper thing, it's longer lasting."（UXpod 2006）`[一手]`
- **对 persona 与场景的地位**："Personas and scenarios aren't design, **they're tools that you use to design.**"（UXpod 2006）`[一手]`
- **对"再多的新技术也救不了"**："I don't need a more powerful computer. I don't need a more powerful cell phone. **What I need is a computer that doesn't make me feel bad, and a cell phone that doesn't make me feel stupid.**"（UXpod 2006）`[一手]`
- **对就业建议（罕见的进攻性建议）**：被问"没时间的开发者怎么入门 persona"，他答：忽略反对者，"one of two things would happen – you get promoted or you get fired. If you get promoted you're doing great if you get fired you know, well…" 主持人："You're better off." 他："Yeah, you are better off, really… **you, my friend, will get job offers by the dozen in the industry. Call me.**"（UXpod 2006）`[一手]`
- **对设计是否是当前风口（"Uggs"比喻）**："I think we're going to have a really interesting problem facing us because **design is the latest fad**… May your discipline catch on. **We're the current fad; we're the Uggs of today.**"（Atomic Object 2016）`[一手]`
- **对"设计被试用后又被否定"**："You can already start to hear the drumbeats of the backlash against design… **We need to prove that design is worth having, even though we've already won the argument. Now we have to win it again**, because people are going to say, 'We tried design, and it didn't work.'"（Atomic Object 2016）`[一手]`
- **对"没有坏人"**："Are *we* evil? I'm perfectly willing to stipulate *you* are not evil. Neither is your boss evil. Nor is Larry Page or Mark Zuckerberg or Bill Gates."（Interaction18 2018）`[一手]`
- **对"能动性"**："Agency in its embryonic state manifests simply as talking. We ask questions. We seek explanations. We point out the considerations. **But the more you talk, the more you get heard. And the more you get heard, the more influence you have. Agency grows the more you exercise it.**"（Interaction18 2018）`[一手]`
- **对"工具没有道德"的流行说法**："…the tools in fact **do** have an inherent morality and it happens to reflect the inherent morality of people who are not accountable for their actions."（User Defenders 2018-II）`[一手]`

---

## 6. 播客 / 视频 / 访谈清单（供后续核对）

### A. 已获取正文或逐字转写的来源（最高价值）

| # | 年份 | 节目 / 场合 | 类型 | 关键内容 | URL | 分级 |
|---|---|---|---|---|---|---|
| 1 | 1997-06 | Web Design & Development '97（SIGCHI Bulletin Vol.29 No.3 会议报道） | 会议课程 + 参会者报道 | 自称 "software designer" 而非 "user interface designer"；"most contemporary Web design is of little long term value"；"lose sight, lose the fight" | https://homepages.cwi.nl/~steven/sigchi/bulletin/1997.3/morville.html | `[一手·报道]` |
| 2 | 2006-12 | UXpod（User Experience Podcast），主持 Gerry Gaffney，19:44 | 音频访谈 + 官方逐字转写 | persona 起源、无研究 persona、"bright light under which we do surgery"、对 Goos 式反对的封建类比 | https://uxpod.com/episodes/personas-and-outrageous-software-an-interview-with-alan-cooper.html | `[一手]` |
| 3 | 2008-02-14 | Interaction08（Savannah）主题演讲《An Insurgency of Quality》 | 演讲 + 问答（Coding Horror 逐字引用） | "We are not very important because we don't cut code."；Stay-Puft 棉花糖巨人 | https://blog.codinghorror.com/the-ultimate-unit-test-failure/ ；视频 https://ixda.org/video/an-insurgency-of-quality | `[一手·问答 via 二手引用]` |
| 4 | 2008-03-28 | ESRI Developer Summit 主题演讲（Hans-Eric Grönlund 现场记录 + 大段原文引用） | 演讲 | "agile processes are bad for developing quality software"；"three horsemen of the software apocalypse"；The Triad | https://www.hans-eric.com/2008/03/28/is-agile-only-for-elites/ | `[一手·参会者转写]` |
| 5 | 2008-08-12 | Agile 2008（多伦多）主题演讲《The Wisdom of Experience》 | 演讲（Nayima 现场笔记 + Slideshare） | 交互设计师与敏捷程序员是盟友；Agile 是 coping tool；四大阶段（Big Ideas/Design/Engineering/Construction） | https://blog.nayima.be/2008/08/12/agile-2008-alan-cooper-keynote/ | `[一手·参会者转写]` |
| 6 | 2008-08 | Agile 2008 幻灯（UX Digital Diva 摘录） | 演讲幻灯片 | "the most important part of the software doesn't exist"（程序之间的间隙）；认知偏差清单 | https://uxdigitaldiva.com/2008/08/coopers-keynote-speech-at-agile-2008/ | `[一手·幻灯片摘录]` |
| 7 | 2008-09-24 | Agile 2008 同场（Mike Slinn 逐条记录） | 演讲幻灯片 | "breathless delirium" 名句；"Requirements are not design" 八条断言 | https://www.mslinn.com/blog/2008/09/24/breathless-delerium.html | `[一手·幻灯片 via 参会者转写]` |
| 8 | 2008-12-02 | A List Apart 引用（Cennydd Bowles 文中复述） | 文章引用 | 再次出现 "breathless delirium" 原句，证明其反复使用 | https://alistapart.com/article/gettingrealaboutagiledesign/ | `[一手·引文 via 二手]` |
| 9 | 2001-03 | Hugh Dubberly《Alan Cooper and the Goal Directed Design Process》（*Gain* AIGA Journal Vol.1 No.2） | 长篇访谈式整理 + 大段直接引语 | persona 定义、"Until the user is precisely defined, the programmer can always imagine that he is the user"、五大流程变革、利益冲突论 | https://www.dubberly.com/articles/alan-cooper-and-the-goal-directed-design-process.html | `[一手·引语 via 二手整理]` |
| 10 | 2015-10-22 | UX Magazine《In Conversation with Alan Cooper》（Josh Tyson） | 播客 | 滑板、为父之道、设计、伦理、Cooper 收购 Catalyst；另有 Natchcast 对谈（食物与农业） | https://uxmag.com/articles/in-conversation-with-alan-cooper ；https://natch.is/natchcast-episode-031/ | `[一手·页面已核，音频未转录]` |
| 11 | 2016-05（UXLx）/ 2016-06 | UXLx 2016 主题演讲《Ranch Stories》 + UX Podcast #130/#131 | 演讲 + 播客（2 集） | 转向农业伦理视角；"Our role as leaders is to be constantly asking the question is this the right thing to do?" | 视频 https://vimeo.com/178863080 ；https://uxpodcast.com/ranch-stories-alan-cooper-part-1/ ；https://uxpodcast.com/131-ranch-stories-with-alan-cooper-part-2/ | `[一手·页面已核，正文在 Medium 未获取]` |
| 12 | 2016-06-30 | Graphic Mint《UX Leadership – The Alan Cooper Interview》（UXLx 后一对一） | 文字访谈（全文） | "software is a magic transformation agent"；"boundaries are meant to be crossed"；放弃程序员的转折；Cooper U 的缘起与"分享秘密"的自述；"if your employer is only about profit, maybe you should find another employer" | https://graphicmint.com/ux-leadership-the-alan-cooper-interview/ | `[一手]` |
| 13 | 2016-11-15 | Atomic Object《Industry Viewpoints: An Interview with Alan Cooper》（Jonah Bailey） | 文字访谈（全文） | "design is the latest fad… we're the Uggs of today"；"We need to prove that design is worth having, even though we've already won the argument"；persona 滥用答"bogus process"；对科技寡头的批评 | https://spin.atomicobject.com/alan-cooper-interview/ | `[一手]` |
| 14 | 2017-04-14 | UX Podcast #155《Channels of misinformation》 | 播客（28 分钟） | 伦理；两个 "heptascale" 问题，第二个（设计师该懂多少代码）令其"开闸" | https://uxpodcast.com/155-misinformation-alan-cooper/ | `[一手·页面已核，正文在 Medium 未获取]` |
| 15 | 2017-05 | Medium 系列《Should Designers Code?》共 4 篇 | 文章 | Pt.1 / No, Part Two: Know Versus Do / No, Part Three: Roles and Responsibilities / 第四篇 | https://medium.com/@MrAlanCooper/should-designers-code-f7b745b8cd03 ；https://mralancooper.medium.com/should-designers-code-417de265531c ；https://mralancooper.medium.com/should-designers-code-b98e69f6b56c ；https://mralancooper.medium.com/should-designers-code-cde3ef9d6621 | `[一手·标题已核，正文未获取]` |
| 16 | 2018-02-06 | Interaction18（IxDA，里昂）主题演讲《The Oppenheimer Moment》 | 演讲（Open Transcripts 完整逐字转写） | 全文可引：Oppenheimer 时刻、Titanic 亿万小孔、assumptions/externalities/timescale 三向量、good ancestor、power vs agency、密西西比河 | http://opentranscripts.org/transcript/the-oppenheimer-moment/ | `[一手·完整转写]` |
| 17 | 2018-09-10 | User Defenders 播客 #053 Part I（Jason Ogle，1:07:52） | 播客 + 官方逐字转写 | "there is no such thing as UX Design" 的自述语境、"invasion of the lightweights"、确认对话框回潮、A/B rolling 批评、Apple 点名 | https://userdefenders.com/podcast/053-be-a-good-ancestor-with-alan-cooper-part-1 | `[一手]` |
| 18 | 2018-09-17 | User Defenders 播客 #053 Part II（1:07:27） | 播客 + 官方逐字转写 | "should designers waterski"、Goodhart 定律、GDP 类比、"it's between humans and people who want money"、Ancestry Thinking 与 Berkeley 课程 | https://userdefenders.com/podcast/053-be-a-good-ancestor-with-alan-cooper-part-ii/ | `[一手]` |
| 19 | 2020-02-04 | Medium《The Long Road to Inventing Design Personas》 | 文章 | persona 发明史（标题含"It's hard to be simple"） | https://mralancooper.medium.com/in-1983-i-created-secret-weapons-for-interactive-design-d154eb8cfd58 | `[一手·标题已核，正文未获取]` |
| 20 | 2021-03-09 | Medium《Defending Personas — If you love a design tool, set it free》 | 文章 | 为 persona 辩护 / 放手（开头两段已核） | https://mralancooper.medium.com/defending-personas-2657fe26dd0f | `[一手·标题与开头已核，正文未获取]` |
| 21 | 1976–1989 回顾 | Retool《Something Pretty Right: A History of Visual Basic》（Ryan Lucas，长篇特写） | 长篇特写 + 直接引语 | "I was one of the first companies to realize that you could retail software without needing to sell a computer"；"Might as well have had a neon sign saying, 'Market Opportunity.'"；"In an instant, I perceived the solution to the shell design problem: it would be a shell construction set…"；Gates 看 demo 时 "Why can't we do stuff like this?" | https://retool.com/visual-basic | `[一手·引语 via 二手特写]` |
| 22 | 1997 | 《About Face》原文（经 Signal v. Noise 逐字引用） | 书面原文 | "Are you sure?" 完整段落 | https://signalvnoise.com/svn3/are-you-sure/ | `[一手·书面]` |
| 23 | 2017-03-13 | Computer History Museum 口述史（采访人 Hansen Hsu，Petaluma） | 口述史（PDF 转写，共 46 页级别） | Visual Basic / Tripod / Ruby / Digital Research / 交互设计起源的完整第一人称叙述 | 目录记录 https://www.computerhistory.org/collections/catalog/102738215 ；视频 https://www.youtube.com/watch?v=-wtGFgaKYI0 ；期刊版 https://ieeexplore.ieee.org/document/9263263 （*IEEE Annals of the History of Computing*, 2020-10, DOI 10.1109/MAHC.2020.3033744） | `[一手·已核存在，PDF 正文未下载]` |
| 24 | 2017 Fellow | CHM 2017 Fellow Awards 视频 + 官方简介引语 | 视频 | "If we want users to like our software, we should design it to behave like a likeable person: respectful, generous, and helpful." | https://computerhistory.org/profile/alan-cooper/ ；视频目录 https://www.computerhistory.org/collections/catalog/102740201 | `[一手·官方引语]` |

### B. 已确认存在但本次未能获取正文的访谈/播客（**后续核对优先级高**）

| 年份 | 节目 / 场合 | 说明 | URL |
|---|---|---|---|
| 2002-03 | *Computing*（英国）《A word with the father of Visual Basic》，Liz Simpson | 2002 年深度访谈；站点有 Cloudflare 拦截，Wayback 抓取失败 | https://computing.co.uk/feature/1820567/a-word-fhe-father-visual-basic |
| 2001-05-09 | ZDNet《The church of usability》六人访谈合集 | 把 Cooper 与 Jakob Nielsen 并列；正文未获取 | https://www.zdnet.com/article/the-church-of-usability/ |
| 2006-03 | FTPOnline "Clash of the Titans" 联合访谈（Cooper + 对手方） | 由 Tyner Blain 提及，原文站点已失效 | https://tynerblain.com/blog/2006/03/07/interaction-design-explained-by-alan-cooper/ |
| 2008-08 | Agile 2008 采访（InfoQ，Dany Lepage 系列页） | InfoQ 有反爬验证（HTTP 405），标题确认存在：《Similarities Between Interaction Designers and Agile Programmers》 | https://www.infoq.com/interviews/Interaction-Design-Alan-Cooper/ ；https://www.infoq.com/news/2009/01/Interaction-Design-Alan-Cooper/ |
| 2010-11 | Persona podcast 访谈（usability-ed 博客） | 站点抓取失败 | http://usability-ed.blogspot.com/2010/11/persona-podcast-alan-cooper-interview.html |
| 2014-10 | InfoQ《Alan Cooper Talks About Face 4 and Issues in UX Design》 | 第 4 版《About Face》发布访谈；InfoQ 反爬 | https://www.infoq.com/news/2014/10/cooper-about-face-4/ |
| 2016 | CanUX 2016 主题演讲《Ranch Stories》 | 与 UXLx / UX Week 同题演讲的另一场 | https://canux.io/alan-cooper/ |
| 2016-11-05 | ISA16（智利圣地亚哥）《Ranch Stories》主题演讲 | 视频 | https://www.youtube.com/watch?v=KmaQ90ZwdXk |
| 2018-06 | IEEE Software《A Conversation with Alan Cooper: The Origin of Interaction Design》 | 学术期刊访谈；DOI 10.1109/MS.2008.142 | https://doi.org/10.1109/ms.2008.142 |
| 2022-11-29 | Wipro Digital 访谈《Alan Cooper Wants to Create a Taxonomy for Bad Technological and Design Behavior》 | Ancestry Thinking 访谈；站点跳转拦截 | https://www.wipro.com/digital/alan-cooper-wants-to-create-a-taxonomy-for-bad-technological-and-design-behavior |
| 未标注年份 | 《An Interview with Alan Cooper – Understanding Personas》（视频 1:06:47） | 长访谈视频 | https://www.youtube.com/watch?v=G7ljzXB40hw |
| 未标注年份 | 《Alan Cooper talks UX, Design and Environment》（视频访谈） | 长访谈视频 | https://www.youtube.com/watch?v=kwY4oqWz0eY |
| 未标注年份 | 《UX on Coffee with Alan Cooper》 | 长访谈视频 | https://www.youtube.com/watch?v=3v15uhmCdBA |
| 2019-08-16 | Medium《A new chapter》（退休声明） | 从 Cooper 公司退出、退休自述 | https://medium.com/@MrAlanCooper/a-new-chapter-7a2e6fce8895 |
| 2023-01-31 | Medium《2022 Bibliography》 | 其年度书单，非访谈 | https://mralancooper.medium.com/ |

### C. 中文来源核查结果

**未找到可用的中文权威媒体访谈。** 检索命中并**按黑名单排除**的有：知乎、微信公众号、百度百科、百度知道。
唯一命中的中文技术社区内容为 CSDN 转载的《Alan Cooper 访谈》系列（https://bbs.csdn.net/topics/50419060 ），
其中可见章节标题为 "IV. Interface Design is not Interaction Design"，**但其为英文访谈的中文转译转载，原始出处不明，故本次不作为信源使用，仅登记在此供后续溯源。**

---

## 7. 关键发现小结（供上层专家画像直接取用）

1. **他的"骂人"是有结构的**：先否认问题前提（"they're wrong"），再用一个跨语域的类比把对方立场贬为荒谬，最后给行业级判决而非个人建议。他不接受"我该怎么做"这类问题（§1.1、§4 表）。
2. **他最强的底层论证不是"用户很可怜"，而是"利益冲突"**——同一人既设计又开发，就会为了好写而牺牲好用；以及"直到用户被精确界定，程序员就会一直把自己当成用户"（§5.1、§5.2）。这两句是他的方法论骨架，比任何金句都重要。
3. **立场变化共有四处，且都朝"收编"方向**：敏捷（否定→调解→限定）、设计师写代码（"你不重要"→"问题不成立"）、persona 滥用（斥责→辩护/放手）、商业与伦理（结构性无解→选择问题）。**他从不承认自己改口，这是其人格的一部分**（§3）。
4. **两处确凿的"未和解矛盾"**：① 2008 年初否定敏捷 vs. 同年 8 月在敏捷大会称其为盟友，他未做任何解释；② 2008 年承认"不写代码 = 没权力"，2018 年否认该前提同样成立，他未做任何解释（§3.1、§3.2）。
5. **他的"回避"集中在要求他指定具体行动的问题上**（该不该辞职、该封谁、未来会怎样）。他给的是"能动性"框架：不问"你有没有权力"，问"你有没有提问"（§4、§5.7）。
6. **最容易引错的地方**：他在 2018 年明确说过 "there is no such thing as UX Design"，但这是**他自认的"发脾气时的偏见表达"**，不是他的正式立场；他的正式区分是 "interaction design"（他偏好）vs "user experience design"（他用来指代偷懒者）。任何引用这句话的场合都必须带上这个自述语境（§1.3）。

---

## 8. 维度覆盖与信息不足说明

| 必须提取的维度 | 覆盖情况 | 说明 |
|---|---|---|
| 1. 被追问时的回答方式 | **充分** | 4 种模式 + 7 例汇总表；但**多为有转写的访谈，2 个关键例证是参会者笔记而非录音转写** |
| 2. 即兴类比与金句 | **充分** | 24 条英文原句 + 出处；**但 "emperor's new clothes" 与"在飓风中设计"两个提示比喻未找到，不可补造** |
| 3. 立场变化 / 前后矛盾 | **较充分** | 4 处已考据；**"设计师该不该写代码"四篇长文的正文未能获取，论证细节缺失** |
| 4. 拒绝回答 / 回避的问题 | **中等** | 8 例；**全部来自已获取转写的 4 个来源，覆盖面受限于 Medium/InfoQ 未能访问** |
| 5. 演讲中的具体断言 | **充分（6 项中 5 项充分）** | persona vs user、开发者不该设计界面、feature wars、确认对话框、敏捷批评 **均已有一手原句**；**NPS 一项完全空白** |
| 6. 播客/视频清单 | **充分** | 24 条已获取 + 14 条待核对，含年份与 URL |

**明确的信息缺口（不得推断填补）：**

- **NPS（Net Promoter Score）**：No direct quote found。仅有可推广到"以钱/指标为唯一目标"的 Goodhart 定律论述（§5.6c）。
- **对 Don Norman 的评价**：未找到，双向均无。1997 年 Morville 把 Cooper 与 **Jakob Nielsen** 并列对比并批评 Cooper 论证缺例，但那是 Morville 说的，不是 Cooper 说的。
- **中文权威媒体访谈**：未找到（36 氪 / 极客公园 / 晚点 LatePost / 财新 / 第一财经 / 虎嗅 / 少数派 / 机器之心均无命中）。
- **CHM 口述史（2017-03-13）正文**：文件为 PDF 且页面未直接提供文本，**未下载转写**。这是**最有可能补全"Visual Basic 发明史第一人称叙述"与"对早期软件业的评价"的一手材料**，建议优先取得。
- **Medium 平台上的 5 篇文章正文**：Medium 在本次环境中不可直接抓取（含 Wayback、镜像代理尝试均失败），仅有标题、开头段落与检索摘要。**其中《Defending Personas》与《Should Designers Code?》四篇是判断其立场变化的最直接证据，属关键缺口。**
- **YouTube 视频访谈的音频**：本环境无法访问 youtube.com（域名解析被拒），因此 5 个长视频访谈未能转写。
- **Cooper 对同时代人物的公开评价**（Norman / Nielsen / 其他同行）：除了一处对 Apple 产品的点名批评（§5.4）外，**未见他对同行的直接评价**。

---

## 来源统计

**一手 21 / 二手 17 / 推断 0**

（0 条独立成条的 `[推断]` 结论；文中出现的 6 处 `[推断]` 均作为既有条目的附注标注，已在上表中散布体现，不单列。）

### 一手（21 条）

UXpod 2006 访谈 · UX Podcast #130 · UX Podcast #131 · UX Podcast #155 · User Defenders #053-I · User Defenders #053-II · Interaction18《The Oppenheimer Moment》完整转写 · Agile 2008《The Wisdom of Experience》现场笔记 · Agile 2008 幻灯片摘录（UX Digital Diva） · Agile 2008 幻灯片逐条记录（Mike Slinn） · Interaction08 问答（Coding Horror 逐字引用） · ESRI 2008 演讲记录与大段原文引用 · Graphic Mint 2016 访谈 · Atomic Object 2016 访谈 · Dubberly 2001 长文与大段引语 · Hugh Dubberly / *Gain* AIGA Journal · SIGCHI Bulletin 1997 会议报道 · 《About Face》原文段落（确认对话框） · Retool Visual Basic 长篇特写中的直接引语 · CHM 2017 Fellow 官方引语 · CHM 2017 口述史目录记录

### 二手（17 条）

Hans-Eric Grönlund 博客 · Nayima《Thinking for a Change》 · A List Apart（Cennydd Bowles） · Coding Horror（Jeff Atwood） · Signal v. Noise（Adam Stoddard） · IxDF Personas 词条（转引 Cooper 语） · Computer History Museum Cooper 简介页叙述段 · Evil Genius Labs《Visual Basic 史》 · Wikipedia "Alan Cooper (software designer)" · Masterbundles 语录汇编 · Philip Greenspun 2005 演讲笔记 · ZDNet《The church of usability》 · Tyner Blain（FTPOnline 联合访谈转述） · usability-ed 博客 · InfoQ 访谈页（含 2009/2014 两篇） · AI Foundry 播客（Elisabeth Hendrickson 回忆） · CSDN 中文转载《Alan Cooper 访谈》

### 推断（0 条独立条目）

`[推断]` 仅以附注形式出现于 §3.1、§3.2、§3.3、§3.4、§5.6 共 5–6 处，均为对已核实引文的性质判断，未作为独立结论成立。

### 未找到（不计入统计，供后续补全）

NPS 直接表态 · 对 Don Norman 的评价 · 中文权威媒体访谈 · CHM 口述史正文 · Medium 5 篇文章正文 · YouTube 5 个长视频访谈音频 · "the emperor's new clothes" 与"在飓风中设计"两个比喻
