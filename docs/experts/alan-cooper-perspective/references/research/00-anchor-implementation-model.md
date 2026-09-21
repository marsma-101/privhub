# 00 · 主智能体锚点核查：实现模型 / 心智模型 / 表现模型

> 本文件不是六路调研之一，是主智能体为「反实现模型」这条主轴亲自核查的一手锚点。
> 用途：SKILL.md 中「实现模型 vs 心智模型 vs 表现模型」这一心智模型的核心证据链，必须落在**原文级**证据上，不能靠二手总结。
> 核查时间：2026 年（本次调研窗口）

---

## 1. 关键发现：术语本身在不同版本间变过

**[冲突 · 必须保留]**

| 版本 | 中间那一层模型叫什么 | 来源 |
|------|---------------------|------|
| About Face 1（1995，副标题 *The Essentials of User Interface Design*）| **manifest model**（表现模型 / 显现模型）| 二手转引 About Face 1 原文，见下 §2 |
| About Face 2 / 3 / 4（2003/2007/2014，副标题 *The Essentials of Interaction Design*）| **represented model**（表现模型 / 表征模型）| 一手原文，见 §3 |

**这个矛盾有价值**：下游若引用「Cooper 的三模型」，必须说清用的是哪一版术语。若只说 `represented model` 而不说明版本，会与 1995 年版读者对不上。SKILL.md 中两种叫法并列标注。

---

## 2. About Face 1（1995）的三模型原文转述

来源：*Designing Effective Database Systems*（Addison-Wesley, 0321290933）第 15 章第 2 节「Interface Models」，作者在该节中**逐段转引并解释** Cooper 的三模型。
URL: http://icodeguru.com/design/Designing-Effective-Database-Systems/0321290933/ch15lev1sec2.html
可信度：**[二手]**（转引 Cooper 的观点，非 Cooper 本人文字；但转引明确、术语一致）

原文转引要点（英文原句）：

- "Alan Cooper, in his groundbreaking book *About Face: The Essentials of User Interface Design*, describes the way users think about systems (and the way systems think about users) in terms of three models: the **mental model**, the **manifest model**, and the **implementation model**."
- "A user's **mental model** describes what the user *thinks* is happening. This doesn't often match what's really happening, but that's OK."
- "What *actually* happens is the **implementation model**. All that behind-the-scenes stuff about pulling levers or running code is part of the implementation. **Users don't care, and shouldn't be forced to.**"
- "The user interface is the **manifest model** that sits between a user's mental model and the developer's implementation model. It is, if you will, the model of the process that the system reveals (manifests) to the user."
- "**Your goal in designing an interface is to hide as many details of the implementation model as possible.** The ideal system interface exactly matches the users' mental model."
- 关于设计者诅咒（designer's curse）的原始警告："This is the great danger of designing interfaces: Even if you aren't directly involved in the implementation, you almost certainly will know something about it. You have to either develop a knack for temporarily forgetting the implementation details or ask a user guinea pig to provide you with his mental model."
- 关于词汇：「Always use the words the users use.」以及那个极其对症的例子：**"Are you forcing users to think about 'editing records' when what they want to think about is 'changing addresses'?"**

---

## 3. About Face 3（2007）的三模型原文（带页码）

来源：COOPER, A., REIMANN, R., CRONIN, D. (2007) *About Face 3: The Essentials of Interaction Design*. Indianapolis: Wiley.
转载页（带页码标注的直接引文）：https://phdproject01.wordpress.com/2009/05/06/about-face-3-the-essentials-of-interaction-design-cooper-mental-models-research/
可信度：**[一手]**（Cooper 等原著直接引文，含页码；转载页为搬运，但引文连续且页码连贯）

**为什么人们会形成心智模型**（pp.28-29）：
> "People don't need to know all the details of how a complex mechanism actually works in order to use it, so they create a cognitive shorthand for explaining it, one that is powerful enough to cover their interactions with it, but that doesn't necessarily reflect its actual inner mechanics. (…) In the digital world, however, the differences between a user's **mental model** and the _implementation model_ are quite distinct. The discrepancy between _implementation_ and **mental models** is particularly stark in the case of software applications, where the complexity of implementations can make it nearly impossible for the user to see the mechanistic connections between his actions and the program's reactions."

**核心设计原则**（p31，书中以 DESIGN PRINCIPLE 排版标出）：
> "**User interfaces should be based on user mental models rather than implementation models.**"

**为什么这样更好**（pp.30-32）：
> "User interfaces that are consistent with the user's **mental models** are vastly superior to those that are merely reflections of the _implementation model_. If the represented model for software closely follows users' mental models, it **eliminates needless complexity from the user interface by providing a cognitive framework that makes it evident to the user how his goals and needs can be met.**"

**心智模型定义**（p118）：
> "A person's **mental model** is their own internal representation of reality – the way they think about or explain something to themselves. **Mental models are deeply ingrained and are often the result of a lifetime of experience.** People's expectations about a product and the way it works are highly informed by their mental model."

**首因效应：概念结构必须对**（p46）：
> "A new user must grasp the concepts and scope of the product quickly or he will abandon it. Thus, the first order of business of the designer is to ensure that the product adequately reflects the user's mental model of his tasks. He may not recall from use to use exactly which command is needed to act on a particular object, but he will definitely remember the relationships between objects and actions – the important concepts – if the interface's _conceptual structure_ is consistent with his **mental model**."

**最重要的一条：用户不会犯错**（p336）：
> "Users generally don't believe, or at least don't want to believe, that they make mistakes. (…) Following a [user's] **mental model** means absolving him of blame. (…) the user-interface designer [must] **completely abandon the idea that the user can make a mistake** – meaning that everything the user does is something he or she considers to be valid and reasonable."

---

## 4. 一手长文：《Goal-Directed Software Design》(Dr. Dobb's Journal, 1996-09)

URL: https://jacobfilipp.com/DrDobbs/articles/DDJ/1996/9609/9609a/9609a.htm
可信度：**[一手]**（署名 Alan Cooper，署名栏写 "Alan developed the method of designing software described in this article, naming it 'Goal-Directed Design.™'"）

这篇是 Goal-Directed Design（目标导向设计）的**最早公开系统表述**（早于 1999 年《Inmates》成书），对本次下游用途（文件管理器插件摊实现细节）极其对症。以下为可直引的英文原句：

**目标 vs 任务**：
> "It is easy to confuse goals with tasks, but the two are very different and are often in direct opposition to each other."

**开发者把自己的目标强加给用户**：
> "the author of the software has mistakenly imposed his goals on the user, instead of making the code work to achieve the user's goals."

**excise 的定义（原文级）**：
> "Each bit of interface adds overhead, what I call 'excise,' or **extra work that users must perform merely to manage the idiom, with no benefit to the user or the business.** This includes things like moving windows around or pressing OK buttons. Lots of interface elements means lots of added excise."

**excise + navigation 双负担 → 直接摧毁个人目标**：
> "In addition, because most business tasks are reasonably complex and have many variants, the feature count climbs rapidly. With it, the interface-element count also climbs, and the difficulty of navigation is added to the burden of excise."
> "The twin burdens of excise and navigation conspire to make many users feel **trapped in an unproductive maze**. This feeling is directly contradictory to their personal goals."

**"软件是一堆功能，每个任务一个功能"（对插件式堆砌的直接判词）**：
> "Most software is a collection of features, one per task. **Each separate feature has a corresponding user-interface element.**"

**确认框之害**（对应下游「无意义确认框」维度）：
> "When a program continually badgers users with confirmation dialog boxes, users begin to feel like the program isn't all that eager to help out. Imagine if you had an assistant who continually asked, 'Are you sure you wanted me to file this report?' or 'Are you sure you wanted to throw away this old paper?'"

**错误信息之害**：
> "Probably the worst violator of personal goals are error messages. These obnoxious little idioms serve no purpose that couldn't better be served another way. **They blame users for the software's shortcomings.**"

**四类目标（false / corporate / practical / personal）**——false goals 的清单里直接点名了工程侧目标：
> False: Save memory. Save keystrokes. Be easy to learn. Safeguard data integrity. Speed up data entry. Increase program execution efficiency. **Use cool technology or features.** Increase graphic beauty. Maintain consistency across platforms.
> Personal: **Not feel stupid.** Not make mistakes. Get an adequate amount of work done. Have fun (or at least not be too bored).

**关于「用户说的不算，设计从设计师开始」**：
> "If you ask users how to design their software, they will ignore their own goals and describe tasks to you with the same alacrity as programmers. **The process of designing for users' goals is one that begins with you, the software designer, and not with the user.**"

**关于「计算机素养」是个托词**：
> "The other historical ball and chain is the annoyingly persistent falsehood that to use a computer you must become 'computer literate.' **This is just an excuse we in the industry use to salve the guilt caused by our inability to create adequate design.** Instead of making software easy to use, we blame users."

### 4.1 补录：两段曾被质检标为「查无出处」的原文（2026-09 复核）

⚠️ **背景**：Phase 4 独立验证方在本 Skill 的调研文件（00–07）中检索 `agenda` 与 `shrinking the feature list` 时**零命中**，据此判定 `SKILL.md` 中对应的两条引文「疑似编造」。

**复核结论：两条引文均真实存在，指控不成立。** 根因是**本锚点文件当初只摘录了 DDJ 原文的一部分**，未收录这两段，导致"引文真实但工作区内无法自证"。这是本工作区的一处真实缺陷，现补录如下，使 SKILL.md 的每一条英文引文都能在工作区内被核验。

以下两段均出自同一篇一手长文：Alan Cooper, *Goal-Directed Software Design*, **Dr. Dobb's Journal, 1996 年 9 月**，URL: https://jacobfilipp.com/DrDobbs/articles/DDJ/1996/9609/9609a/9609a.htm
可信度：**[一手]**（本文件作者于 Phase 1 亲自抓取该页全文，逐字核对）

**(a) 群组日历案例的解法原文**

> "What is remarkable about this solution is that most existing group-calendaring systems have **agenda features already built into them**. **It wouldn't take much programming effort to disconnect agendas from meetings.** Designing for the user's goals is easier than you think. Mostly, it's a matter of trusting in goals and ignoring the hegemony of tasks."

上下文（同文，紧接其前）：他设想的用法是——让用户**创建一个不挂在任何会议上的议程**，直接发给同一批人。如果回复从"十块"到"一万块"都有，那确实得开会；如果大家回的是"一块五"、"你定就行"，**这个会议就已经被避免了**。

同文另有一句支撑同一案例：
> "However, the number one goal of almost all users of group-calendaring software is to **avoid meetings**—at least to avoid needless, unproductive meetings."

**(b) 关于削减功能清单的那句**

> "You can create dramatically different and more-powerful software by letting the user's goals be your guide. Comparing features to the goal yardstick gives you the ability to make clear decisions about their efficacy. Sometimes you will even find that eliminating costly features improves programs, as I showed in the Schedule+ example. **You don't have to feel guilty about shrinking the feature list if you know that you are reducing excise and navigation.**"

**(c) 一并补录：对「计算机素养」的完整判词**（SKILL.md 中引用该句时曾出现截断）

> "The other historical ball and chain is the annoyingly persistent falsehood that to use a computer you must become 'computer literate.' This is just an excuse we in the industry use to salve the guilt caused by our inability to create adequate design. **Instead of making software easy to use, we blame users.**"

---

## 5. persona 起源的一手叙述（Cooper 自述，2003）

来源：Alan Cooper, "The Origin of Personas"，cooper.com 2003-08 通讯，经 Tim Strehle 博客 2003-10-20 转引（含成段原文）。
URL: https://www.strehle.de/tim/weblog/archives/2003/10/20/197/
原文 PDF 镜像：https://urbanmobilitycourses.eu/wp-content/uploads/2020/08/cooper.com-The-origin-of-personas.pdf（PDF 无法直接抓取，仅在检索结果中确认存在）
可信度：**[一手]**（Cooper 亲笔自述的成段引文；载体为第三方博客，引文完整）

关键原文：
> "Even though the variation among the users was dramatic, a clear pattern emerged after just a few interviews. The users fell into three distinct groups, clearly differentiated by their goals, tasks, and skill levels. (…) So I created **Chuck, Cynthia, and Rob**. These three were the **first true, Goal-Directed, personas.**"

> "Chuck was an analyst who used ready-built templates and reports. Cynthia was an analyst, too, and she used similar ready-built templates. But Cynthia also wrote her own templates, which she gave to Chuck to use. Rob was the IT manager who supported both Rob and Cynthia. He could optimize Cynthia's templates, but he would never originate or use them."

> "At the next group meeting, I presented my designs from the points of view of Chuck, Cynthia, and Rob instead of from my own. **The results were dramatic.** While there was still resistance to this unfamiliar method, the programmers could clearly see the sense in my designs because they could identify with these hypothetical archetypes. From then on, I always presented design work using one of the personas, and eventually even the **Sagent** engineers began to talk about 'what Cynthia would do' or 'whether Chuck could understand' some dialog box."

**注意**：项目名 **Sagent**（1990 年代中期客户项目）。这一点与「persona 诞生于何时」的另一常见说法（1995 年前后）需与 Agent 5/6 的时间线交叉核对。**此处标注 [待核]**：首次使用 persona 的具体年份，Cooper 自述未在本文给出明确年份。

---

## 6. 一条对下游直接可用的判断（主智能体推断）

**[推断]** 把 Cooper 的三模型套到「50 个插件各自把按钮塞进 21 个插槽」的架构上：

- 插件的边界 = **实现模型**的边界（谁写的代码、谁提供的功能）。
- 用户想干什么 = **心智模型**（"我要把这张照片归档到去年的项目里"），与插件边界毫无关系。
- 因此「按插件组织入口」等价于「把实现模型的边界直接画在界面上」——正是 Cooper 说的 "merely reflections of the implementation model"。
- 他还给了具体的判据：**"Are you forcing users to think about 'editing records' when what they want to think about is 'changing addresses'?"** —— 换成文件管理语境就是：你是不是在逼用户想「这是哪个插件提供的能力」，而他想的是「我要把这个文件挪走」？

**这一条是 [推断]，不是 Cooper 的原话**，SKILL.md 中不得写成他的原话。

---

## 6.5 一手长引文：文件系统本身就是实现模型的暴政（对下游最对症的一段）

来源：About Face 1（1995）关于文件系统的成段原文，经 derivadow 博客 2007-01-13 成段转引。
URL: https://derivadow.com/2007/01/13/the-beginning-of-the-end-of-the-counter-intuitive-filesystem/
可信度：**[混合]** —— 引文本身是 **Cooper 原著原文**，但载体是第三方博客转载，**未能回溯到 1995 年原书页码**。用于论证时标「Cooper, *About Face* (1995)，转引」。

关键原文（长引文，完整保留，因为这是 Cooper 把"文件"这件事讲得最透的一段）：

> "**Disks are a hack, not a design feature.**"（Cooper 原话，同页转引）

> "The **implementation model of the file system runs contrary to the mental model almost all users bring to it.** Most users picture electronic files like printed documents in the real world, and they imbue them with the behavioural characteristics of these real objects. Users visualise two salient facts about all documents: **First, there is only one document; and second, it belongs to them. The file system's implementation model violates both of these rules. There are always two copies of the document, and they both belong to the program.**"

> "Let's say it is a journal. Occasionally, it comes down off the shelf to have something added to it. There is only one journal, and it either resides on the shelf or it resides in the user's hands. On the computer, the disk drive is the shelf, and main memory is the place where editing takes place, equivalent to the user's hands. But in the computer world, the journal doesn't come off the shelf. **Instead a copy is made**, and that copy is what resides in computer memory. (…) When the user is done and closes the document, the program is faced with a decision: whether to replace the original on disk with the changed copy from memory, or to discard the altered copy. **From the programmer's point of view, equally concerned with all possibilities, this choice could go either way. (…) However, from the user's point of view, there is no decision to be made at all.** He just made his changes and now he is just putting the document away. (…) **It's as if the shelf were to speak up, asking him if he really wants to keep those changes!**"

**Cooper 给出的解法**（同上转引）：隐藏文件系统——**自动保存而不弹提示**，同时**自动版本化**。
**对照**：Jef Raskin 在 *The Humane Interface* 中更激进——干脆废掉文件系统，用全文检索取代文件名。

**[推断]** 对下游（自托管文件管理系统）的意义：这段是"文件管理器该长什么样"的原始宪章。Cooper 的立场不是"把文件管理器做好用"，而是"文件系统这套实现模型本身就在跟用户的心智模型打仗，设计者的任务是把这场仗藏起来"。凡是把"版本"、"回收站"、"权限"、"标签"、"插件"当成并列的顶层功能摆出来的设计，在 Cooper 的坐标里都是**把实现模型的抽屉直接当成了导航栏**。

---

## 7. 主智能体对下游系统（privhub）的只读核查证据

> 这一节是为了让 SKILL.md 的「库珀式研究维度」落在**真实可查的坐标**上，而不是空谈理论。
> 核查方式：只读（grep / read / PowerShell 统计），**未修改 privhub 下任何文件**。
> 核查对象：`G:\program\dsh-SQL\privhub`
> 所有结论标 **[一手]**（代码与清单原文）。

### 7.1 「入口按提供者组织」是可量化的，不是修辞

**[一手]** 统计 `privhub\plugins\**\manifest.json`（排除 `_retired-v2`）：

- 带 manifest 的插件：**32 个**
- 声明的 **插槽（slot）注册总数：41 次，分布在 31 个不同 slot 名上**
- 其中 **27 个 slot 只被 1 个插件注册**（tree / panel / preview / kg / wiki / tags / template / search-view / trash-view / agent-view / rag-view / settings / acl / audit / upload / upload-queue / watermark / md-editor / welcome / project-tabs / app-iconbar / fav-view / admin / admin-console / admin-tags / admin-template / admin-trash / admin-settings）

**Cooper 式判读**：`tree`、`preview`、`kg`、`tags` 这些 slot 名，是**实现模型的词汇**——它们描述的是"代码结构里的位置"，不是"用户想做什么"。27 个 slot 与插件近乎 1:1，说明**插槽边界 = 插件边界**。

### 7.2 顶层图标栏 = 插件清单的直接投影

**[一手]** 统计全部插件的 `barItems`：**共 20 条**，来自 12 个插件。其中与「同一个功能」重复出现于两处导航的至少有 4 组：

| 功能 | 业务位（app-iconbar/panel） | 管理位（admin-nav） | 提供插件 |
|------|---------------------------|-------------------|---------|
| 标签 | 标签（view=tags） | 标签管理（view=tags） | privhub-files-tags |
| 模板 | 新建文档（view=template） | 模板管理（view=template） | privhub-files-template |
| 设置 | 设置（view=settings） | 系统设置（view=settings） | privhub-shell-settings |
| 回收站 | 回收站（view=trash） | 回收站（view=trash） | privhub-trash-ui |
| 智能体 | 智能体接入（view=agent） | 智能体密钥（view=agent） | privhub-shell-agent-console |

**[一手]** `privhub\plugins\privhub-shell\client\index.js` 中 `topItems()` 的实现：

```js
topItems() {
  const bottom = new Set(['settings', 'admin', 'acl', 'audit'])
  return this.barItems.filter((bi) => !bottom.has(bi.view || bi.slot) && bi.slot !== 'admin-nav')
}
```

**Cooper 式判读**：排序来自 **manifest 返回顺序**（`index.html` 里直接 `for (const m of manifests) for (const bi of m.barItems) items.push(bi)`），排序依据是"谁被先加载"——这是纯粹的**实现顺序**，与用户的使用频率、任务流程毫无关系。

### 7.3 一次「同一个 slot 被 8 个插件抢」的实证

**[一手]** `office-editor` 这一个 slot 被 **8 个不同插件**注册（全系统最多）：

| 插件 | 塞进 office-editor 的东西 |
|------|--------------------------|
| privhub-files-office-ui | OfficeEditor（真正的编辑器） |
| privhub-files-dataview | DataViewCtrl |
| privhub-files-versions | VersionsPanel（版本历史浮层） |
| privhub-files-comments | CommentsCtrl（评论面板） |
| privhub-files-publish | PublishPanel（HTML 发布浮层） |
| privhub-files-invite | InvitePanel（邀请成员浮层） |
| privhub-files-mdpage | MdPageCtrl |
| privhub-files-office2 | Office2Replace |

**Cooper 式判读**：slot 名叫 `office-editor`（实现模型的词汇：一个编辑器容器），实际承载的是**版本、评论、发布、邀请、数据视图**——五个完全不同的用户目标。这是"实现模型的边界被画在界面上"的教科书样本：容器按代码归属命名，内容按用户目标分属五个互不相干的领域。

### 7.4 硬编码的视图白名单：插件扩展点在核心文件里

**[一手]** `privhub\frontend\index.html` 第 748-764 行 `window.PrivHub.openBarItem`：

```js
const view = bi.view || bi.slot
if (view === 'trash') { nav.openTrash() }
else if (view === 'search') { nav.openSearch() }
else if (view === 'favorites') { nav.openFavorites() }
else if (view === 'files') { ... }
else if (view === 'admin') { ... }
else if (view === 'settings' || view === 'acl' || view === 'audit' ||
         view === 'tags' || view === 'template' || view === 'kg' || view === 'wiki' ||
         view === 'rag' || view === 'agent') {
  nav.setActiveView(view)
}
```

**[推断]** 这是本系统**最锋利的一处矛盾**：口号是"50 个插件自动装配"，但**新增一个顶层视图必须回来改这个 if-else 链**。插件化架构在这里被一个中心化的字符串白名单反噬——插件能"塞按钮"，但"按钮点了干什么"由核心文件决定。这也解释了为什么 27 个 slot 只能服务 1 个插件：**slot 可以横向加，顶层导航不能竖着加**。

**这条是 [推断]，是基于代码的推论，不是 Cooper 的观点，也不是任何人的原话。**

### 7.5 其余可作库珀式提问的观察点（[一手] 坐标，[推断] 判读）

| 坐标 | 事实 | Cooper 式提问 |
|------|------|--------------|
| `index.html` 第 788-790 行 `crumbs()` | 面包屑由 `nav.path.split('/')` 生成 | 这是**文件路径的实现模型**。用户想的是"去年那个项目的方案"，不是"a/b/c/文件名"。 |
| `office-editor` 里 `CommentsCtrl`、`VersionsPanel` 都叫 "Ctrl" / "Panel" | 组件命名沿用工程词 | 界面文案里还有多少工程词（Ctrl / Panel / Ctrl）没被翻译成用户词？ |
| manifest `description` 字段 | 例如 `"细粒度 ACL（F14）：文件/目录级权限规则（继承/覆盖），仅管理员"` | **F14** 是内部需求编号，直接写进了用户可见描述。 |
| `_retired-v2` 目录 | 存在已退役插件目录 | 退役插件的 slot 是否还在渲染链上？ |

---

## 8. 来源统计

| 类型 | 条数 |
|------|------|
| 一手（Cooper 署名原文 / 原著直接引文带页码） | 4 组（About Face 3 引文组、DDJ 1996 全文、Origin of Personas 成段自述、About Face 1 经转引的原文句式） |
| 二手（转引、读书笔记、复述） | 3 条（Designing Effective Database Systems 转引页、Simon Li 读书笔记、PhD 研究笔记转载页） |
| 推断（主智能体推论） | 已在 §6 明确标注 |

## 9. 抓取失败、未能核实的项（诚实标注）

- About Face 4（2014）**PDF 原书无法抓取**（web_fetch 不支持 application/pdf），因此第 4 版的页码级引文**未能亲自核实**，仅有检索结果显示其存在与目录结构。
- flylib 的 *About Face 2.0* 「Represented Models」章节页返回 **403 Forbidden**，未能核对第 2 版措辞。
- O'Reilly 的《Inmates》第 2 章「Cognitive Friction」**返回 403**，未能亲自核对 cognitive friction 的定义原文（交由 Agent 1 / Agent 3 补）。
