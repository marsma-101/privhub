# Kent Beck 著作与系统思考调研

> 女娲·Skill造人术 流程 · Agent 1（著作维度）
> 聚焦方向：**小步与反馈**——TDD 的红绿重构、《Tidy First?》的结构/行为分离、简单设计四规则、"make it work → right → fast"、对过度工程的批评、XP 的反馈回路与勇气。
> 全部引文保留英文原句；无法确证为原句的一律改为转述并标注 [推断]。
> 检索截止：**2026-09-17**。

---

## 0. 调研说明

### 0.1 检索环境（重要——影响本文件的可信度评级）

本次检索环境实测（`free_search_test`）：

| 引擎 | 状态 |
|---|---|
| `bing`（默认，mkt=zh-CN） | **实测可用但对本任务完全失效**——查 "Kent Beck" 一律返回**健牌/KENT 香烟价格表、肯特大学**。已弃用 |
| `ddg` / `ddg-lite` | 连接失败 |
| `searxng` | 全部实例超时 |
| `exa` | HTTP 429 |
| `tavily` | hourly cap reached |
| `keenable` | ✅ 可用 |
| `anysearch` | ✅ 可用（会话后段曾返回 HTTP 402） |
| `web_fetch` → `github.com` 直连 | ❌ 失败（TypeError: fetch failed） |
| `web_fetch` → `en.wikipedia.org` | ❌ 拒绝（判定为非公网 IP） |
| `web_fetch` → `newsletter.kentbeck.com` | ✅ **正常**（这是本次最主要的信源） |
| `web_fetch` → `martinfowler.com` | ✅ 正常 |
| `web_fetch` → `wiki.c2.com` | ⚠️ 返回"需要更新浏览器"的空壳页 |

**结论**：本次调研**不靠搜索**，靠**顺着 `newsletter.kentbeck.com` 的 archive/tag 页与已知 URL 直接抓取**。这反而提高了信源质量——绝大多数材料是**他自己写的原文**。

### 0.2 信息不足方向（诚实标注）

1. **《Test-Driven Development: By Example》(2002) 原书正文未取得**。书中的三种实现策略（fake it / triangulate / obvious implementation）经多方二手交叉印证，**本文件标 [二手转述]**。
2. **《Tidy First?》(2023) 原书正文未取得**。核心定义（tidying、structure vs behavior、structure-only PR、First/After/Later/Never、15 个 tidyings 目录）经一个**结构完整、自称来源为原书 Parts I–III 的第三方教程站**转述，**本文件标 [二手·结构完整中转]**，并在每处标注。
3. **《Extreme Programming Explained》两版原书正文未取得**。第一版第 57/109 页的简单设计四条规则，经 **Martin Fowler 撰写、Kent Beck 本人复核过**的文章转引——**这一处按 [一手·经本人复核] 对待**（见 §1.3）。第二版与第一版的差异经 Bill Wake 2005 年书评转述，标 [二手]。
4. **《Smalltalk Best Practice Patterns》(1996)、《Implementation Patterns》(2007)、《Planning Extreme Programming》(2000)、《Refactoring: Ruby Edition》(2009)** 均**未取得正文**，仅有书目信息与摘要级内容，**标 [书目级信息]**。
5. **他的 Substack 是付费墙部分遮挡的**：`First, After, Later, Never` 只有 "Never" 一节免费可见，其余三节被墙。本文件在该处**只使用可见部分**，并明确标注。
6. **X/Twitter 原推未能抓取**（`x.com` 需登录），由 Agent 3 的文件处理。

### 0.3 黑名单执行
未使用知乎、微信公众号、百度百科/百度知道。bing 返回的「KENT 香烟」「健牌」等页面**全部弃用**。

---

## 1. 书籍清单与核心论点

### 1.1 《Test-Driven Development: By Example》(Addison-Wesley, 2002)

| 项 | 内容 |
|---|---|
| 核心论点 | TDD 是一个**编程工作流**，不是测试技术。它让系统进入一个新状态：**① 以前能工作的仍然工作；② 新行为按预期工作；③ 系统为下一次改动做好准备；④ 程序员和同事对以上三点有信心。** |
| 书中的红绿重构循环 | red → green → refactor。**关键顺序：先让它跑（make it run），再让它对（make it right）。** 重构在"让它通过"之后，**不是同时** |
| 三种实现策略 [二手转述] | **① fake it（先返回一个常量让它通过）→ triangulate（加第二个例子，逼出真实实现）→ obvious implementation（一看就知道怎么写，直接写）**。这三者是渐进收紧的：不确定时用 fake it，两例仍不够确定时用 triangulate，很清楚时直接写 |
| 双重检查（double checking） | 测试的意义在于**期望值与实际值的独立来源**。若把实际输出粘贴进期望值，双重检查失效 |
| 标志性案例 | 多币种货币换算（Money / Bank / Expression）。他选这个案例本身就有用意：**它是一个"接口先于实现"能被清晰演示的领域** |

**⚠️ 我未能取得原书正文**，以上"三种策略"的表述在多处二手来源中一致（含 Agent 2 抓到的 Fowler 纪要中"fake it / triangulate / obvious"的对应讨论），但**应视为二手转述**。

### 1.2 《Extreme Programming Explained: Embrace Change》两版

#### 第一版（1999-10）
- **12 个实践**、**4 个价值**（沟通 / 简单 / 反馈 / 勇气）。
- 语气是**宣言式的**：给程序员的一份宣言。
- 关于"XP 是一个系统"：实践要**一起上**（"try all these together"）——这一点第二版明确改了。

#### 第二版（2004，与 Cynthia Andres 合著）——**改写幅度极大** [二手：Bill Wake 书评，2005-02-01]

| 项 | 第一版 | 第二版 |
|---|---|---|
| **价值** | 沟通 / 简单 / 反馈 / 勇气 | 加第五条：**尊重（Respect）** |
| **实践组织** | 12 个并列 | **主实践（primary）+ 从实践（corollary）**。主实践"一般可以一个一个引入，顺序随意"；从实践"风险更高，需要其他实践支撑" |
| **引入方式** | 隐含"全上" | **明确可以增量引入**：「change yourself first, then offer the fruit of that to others」 |
| **隐喻（Metaphor）** | 12 实践之一 | **整段删去**（"always the least well understood practice"） |
| **重构（Refactoring）** | 12 实践之一 | **不再作为独立实践**，并入 **Incremental Design** |
| **编码规范（Coding Standards）** | 12 实践之一 | **不再单独提出**（视作 Shared Code 与结对的自然后果） |
| **40 小时工作周** | | 改为 **Energized Work** |
| **测试** | Testing | **Test-First Programming** |
| **简单设计** | Simple Design | 改为 **Incremental Design**（+ Single Code Base） |
| **计划** | The Planning Game | 拆成 **Quarterly Cycle + Weekly Cycle**；估计单位改为**真实结对小时**（real pair hours） |
| **隐喻消失后的替代** | | 无替代。这是第二版最被讨论的删除 |

**第二版关键原话（[二手：Bill Wake 记录]）**：
- 「**All methodology is based on fear.**」（Kent 被引述的话；Bill Wake 认为这句话捕捉到了 XP 想应对的恐惧之一）
- 「There's not a binary answer to "Am I doing XP?" **The goal is successful and satisfying relationships and projects, not membership in the XP club.**」
- 「**Change yourself first, then offer the fruit of that to others.**」
- 「If you're having trouble succeeding, **fail**.」（作为一条原则：Failure）
- 「**The greatest waste is the waste of overproduction. Software development is full of the waste of overproduction.**」（引丰田生产系统）
- 「**If you use a part immediately, you get the value of the part itself as well as information about whether the upstream machine is working correctly.**」（这是他解释"反馈"最漂亮的一个类比，来源是丰田）
- 「Designing software is not done for its own sake in XP. **Design is in service of a trust relationship between technical and business people.**」
- 「**The price of this strategy is that it requires the discipline to continue investing in design throughout the life of the project and to make larger changes in small steps**, so as to maintain the flow of valuable new functionality.」
- 计划的做法（四级递进）：**List the items → Estimate → Set a budget → Agree on the work to be done（without changing estimates or budgets）**
- 规模化的三步：「**Turn the problem into smaller problems → Apply simple solutions → Apply complex solutions if any problem is left.**」

**第二版简单设计四条指引**（注意与第一版第 57 页的四条**不是同一套**）：
1. **Appropriate for the intended audience**（适合预期读者）
2. **Communicative**（有沟通力）
3. **Factored**（已分解）
4. **Minimal**（最小）

### 1.3 简单设计四规则——**两版表述并存，这是个真实的坑**

**这一处是本文件可信度最高的一手材料**，因为 Martin Fowler 在《Beck Design Rules》(2015-03-02) 里**明确写了 "Kent reviewed this post"**，并**直接引用了 Kent 复核时发来的原话**。

**第一版《Extreme Programming Explained》（白皮书）第 57 页**（权威表述）：
> - **Runs all the tests**（通过所有测试）
> - **Has no duplicated logic. Be wary of hidden duplication like parallel class hierarchies**（没有重复逻辑；警惕并行类阶层这类隐藏重复）
> - **States every intention important to the programmer**（表达出对程序员重要的每一个意图）
> - **Has the fewest possible classes and methods**（尽可能少的类与方法）

**同一本书第 109 页的另一版**（Fowler 注：他记得这是 Kent 写书过程中**改进前**的版本）：
> - **Passes the tests**
> - **Reveals intention**
> - **No duplication**
> - **Fewest elements**

⚠️ **引用时必须说清是哪一版。** 网上流传最广的是第 109 页那一版（四词短句版），但 Fowler 明说**第 57 页那个才是权威表述**。

**优先级**：Fowler 原文——「**规则有优先级，所以"通过测试"优先于"表达意图"。**」

**冲突时怎么办——Kent 本人复核时说的话（[一手·经本人复核]）**：
> 「**In the rare case they are in conflict (in tests are the only examples I can recall), empathy wins over some strictly technical metric.**」

**他对"设计有客观好坏"的辩护（[一手·经本人复核]，Fowler 引他原话）**：
> 「At the time there was a lot of "design is subjective", "design is a matter of taste" **bullshit** going around. I disagreed. **There are better and worse designs.** These criteria aren't perfect, but they serve to sort out some of the obvious crap and (importantly) **you can evaluate them right now.** The real criteria for quality of design, "minimizes cost (including the cost of delay) and maximizes benefit over the lifetime of the software," can only be evaluated post hoc, and even then any evaluation will be subject to a large bag full of cognitive biases. **The four rules are generally predictive.**」

### 1.4 《Tidy First? A Personal Exercise in Empirical Software Design》(O'Reilly, 2023)

**⚠️ 原书正文未取得。以下内容来自一个自称"Source: Kent Beck, _Tidy First?_ (O'Reilly, 2023), Parts I–III"、分成 junior/middle/senior/professional/interview 五级、结构完整的第三方教程站。标 [二手·结构完整中转]。** 其中"tidying 的定义"与"结构/行为分离"在该站四个层级反复出现且内部一致，可信度中高；具体页码引用不可用。

#### 核心定义（[二手·结构完整中转]）
> **A tidying is a small, safe change to the *structure* of code that makes the next change easier — without changing what the code *does*.**

判据（该站原文）：
> "You run the tests before and after, they pass both times — and you never had to touch a single test."

两个词（该站称之为"should burn into memory"）：
- **Structure** — how the code is arranged: names, order, spacing, the shape of `if` statements. **Changing structure does not change behavior.**
- **Behavior** — what the code actually computes or causes: outputs, side effects, what the user sees. **Changing behavior is a feature or a bug fix.**

#### 为什么另造 "tidying" 这个词
> 「People use "refactoring" for everything from renaming a variable to rebuilding an entire module over two weeks. That's confusing. Beck's word **tidying** picks out the *small end* of that range — the cleanups so cheap you can do them constantly, almost without thinking.」

| | Tidying | Big refactoring |
|---|---|---|
| 规模 | 几行、一处 | 多文件、整个模块 |
| 时长 | 秒到分钟 | 小时到周 |
| 风险 | 低且有界 | 无界 |

#### 结构与行为作为"可分离的改动"——**这是全书的地基**（[二手·结构完整中转]）

> 「The entire discipline rests on one claim: **a change to structure and a change to behavior are two different *kinds* of change, and they can — and should — be performed separately.**」

该站给出的对照表（**这是本 Skill 里 M2 那张表的中转来源**）：

| 性质 | 结构改动 | 行为改动 |
|---|---|---|
| 改的是什么 | 代码的排列方式 | 可观察的输出/效果 |
| 验证方式 | **既有测试"未改动地"通过** | 新增或修改的测试 |
| 风险 | 低且有界 | 无界——可能是一次生产事故 |
| 复核关注点 | "它真的是行为保持的吗？" | "这是**对的**行为吗？" |
| 可逆性 | 微不足道 | 常常与数据/迁移纠缠 |

> 「Because verification differs, the *evidence* that a change is correct differs. For a structure change, the evidence is "**the test suite is green and untouched**." For a behavior change, the evidence is "**a new test pins the new behavior**." **When you merge the two, you destroy both evidences.**」

> 「**Separability is the senior insight. Structure and behavior are *orthogonal axes* of change. Move along one axis at a time and each move stays cheap to verify, review, and reverse. Move diagonally and you forfeit all three.**」

#### 为什么小步可逆能降风险
> 「Risk in software change is roughly **probability of defect × cost of recovery**. Small, reversible, structure-only steps attack both factors.」
（缺陷概率降低：改动小到你整个能拿在脑子里、常常由 IDE 机械执行，缺陷率趋近于零。）

#### structure-only PR 的信号清单（[二手·结构完整中转]，professional 级）
一个"结构专用"的提交应当满足：

| 信号 | 为什么复核者会信任它 |
|---|---|
| **没有测试文件被改动** | 如果行为变了，必然有测试要改。测试未动 = 行为保持的证据 |
| CI 里测试绿 | 既有的安全网还兜着 |
| 标题前缀 `tidy:` / `refactor:` | 设定复核者的框：**检查"保持性"，不是"新行为的正确性"** |
| **每个 commit 是一个有名字的 tidying** | 复核者可以拿一个已知的重构动作去核对每一步 |
| diff 小，最好由 IDE 生成 | 机械重构的缺陷面趋近于零 |
| **不动 `package.json` / 依赖 / 配置** | **那些是行为** |

该站还强调三点团队层面的力（**这三条对本项目的"单人"场景需要重译**）：
- **Trust（信任）**：复核者之所以能快速批结构 PR，只因为他们信任"tidy"真的是行为保持的。**第一次有"tidy" PR 带出 bug，这份信任和快速复核就一起没了。**
- **Throughput（吞吐）**：整理必须让团队整体更快。如果你的整理 PR 给别人制造了合并冲突，你就是"优化了自己的代码，劣化了整个团队"。
- **Restraint（克制）**：每一个整理 PR 都在消耗复核者的注意力。**整理在和最稀缺的资源——复核带宽——竞争。**

#### tidyings 目录（15 个，[二手·结构完整中转]）

**junior 级 7 个**：
1. **Guard Clauses**（卫语句）
2. **Dead Code**（删死代码）
3. **Explaining Variables**（解释性变量）
4. **Explaining Constants**（解释性常量）
5. **Chunk Statements**（把语句分块，加空行）
6. **Move Declaration and Initialization Together**（声明与初始化放在一起）
7. **Delete Redundant Comments**（删冗余注释）

**middle 级 8 个**：
8. **Normalize Symmetries**（同一件事在代码里用两种写法 → 统一）
9. **New Interface, Old Implementation**（加新接口，实现先沿用旧的）
10. **Reading Order**（按阅读顺序排列）
11. **Cohesion Order**（按内聚排列）
12. **Explicit Parameters**（显式参数）
13. **Extract Helper**（抽辅助函数）
14. **One Pile**（把散落的逻辑先堆成一坨——**这个反直觉，是"先集中再整理"**）
15. **Explaining Comments**（解释性注释）

#### First / After / Later / Never（[一手，但 Substack 原文被付费墙截断]）

**Substack 原文**：`https://newsletter.kentbeck.com/p/first-after-later-never`，2022-07-29。
**免费可见的只有 "Never" 一节**（原文）：
> 「We are talking about the timing of tidying with respect to a behavioral change in the system. Tidy first, then change the behavior? Change the behavior, then tidy? Or simply note messiness … then come back later to tidy? Or, don't tidy at all?」

> 「**Never** — Let's start with the last one. As always, we need to examine the tradeoffs involved in not tidying at all. When should we say, "Yes, this is a giant mess, & we consciously choose not to do anything about it."? **The best reason is because we're never going to change the behavior of the code ever ever again.**」

**其余三节的判据经 [二手·结构完整中转] 的 senior 级页面补全**（该站明确说"When tidying is premature"与"The WHEN decision: First / After / Later / Never"来自原书）：
- **First**：整理之后能显著降低紧接着那次行为改动的成本
- **After**：先把行为改动做完，再整理
- **Later**：记下乱的地方，以后回来整理
- **Never**：这块代码以后不会再改（**唯一"完全正当"的不整理理由**）

#### 整理作为"可选性"（economics 桥）

该站 senior 级明确把 tidyings 与 economics 连起来：「Tidying as optionality (bridge to economics)」。**这与 Kent 2026 年 YAGNI 那篇的可选性论证是同一套语言。**

### 1.5 《Implementation Patterns》(2007) / 《Smalltalk Best Practice Patterns》(1996) [书目级信息]

- **1996 《Smalltalk Best Practice Patterns》**：他的第一本书。把 Smalltalk 编程习惯写成模式语言（名字、格式、风格）。**这本书奠定了他的写作方式：短小的模式条目 + 名字 + 动机 + 结果。**
- **2007 《Implementation Patterns》**：把同样的模式语言方法用到 Java/C# 级别的实现细节（局部变量、字段、条件、循环、方法、类、包）。**核心论点是"代码要能被读"——这与"表达意图"那条规则一脉相承。**

（**两本我都未取得正文，以上为书目与公认定位级信息，标 [书目级信息]。**）

### 1.6 《Planning Extreme Programming》(2000, 与 Martin Fowler 合著) [书目级信息]
XP 的计划实践：用户故事、迭代计划、发布计划、"计划游戏"。**他在 2004 年第二版里把估计单位改成"真实结对小时"，这说明第一版的相对估计法他自己后来放弃了。**

### 1.7 《Refactoring: Ruby Edition》(2009, 与 Jay Fields、Shane Harvie 合著)
Fowler《重构》的 Ruby 版；Kent 挂名并写了序。**他被引用最多的一段自评就在这本书里——经 Agent 3 从其底稿定位到 p.74（带页码的聚合引用，标 [一手·转录引用]）。**

---

## 2. 反复出现 ≥3 次的核心信念（真信念）

> 判据：在**至少 3 个不同年份、不同载体**的材料里出现。每条附 ≥2 个出处。

### 真信念 1｜「先让改动变容易，再做那个容易的改动」

| 出处 | 年份 | 形式 |
|---|---|---|
| 反复被引用为他的格言 | — | 「**First make the change easy (warning: this may be hard), then make the easy change.**」 |
| 《Tidy First?》全书的立论 | 2023 | 结构改动先行，为行为改动铺路（[二手·结构完整中转]） |
| Substack《First, After, Later, Never》 | 2022 | "Tidy first, then change the behavior" 作为四种时机中的第一种 |

**这是全 Skill 最该背下来的一句。**

### 真信念 2｜「结构改动与行为改动是两种改动，必须分开」

| 出处 | 年份 |
|---|---|
| 《Tidy First?》Part I–III 的 "structure and behavior as separable changes"（[二手·结构完整中转]） | 2023 |
| 《Canon TDD》第 3 步把它列成流程错误：「**Mixing refactoring into making the test pass. Again with the "wearing two hats" problem. Make it run, *then* make it right.**」 | 2023 |
| 该站的专业级章节：structure-only PR 的信号清单 | 2023 |

### 真信念 3｜「重复是一个提示，不是命令」（对过度工程的持续批评）

| 出处 | 年份 | 原句 |
|---|---|---|
| 《Canon TDD》第 4 步 | 2023 | 「**Mistake: abstracting too soon. Duplication is a hint, not a command.**」 |
| 《Canon TDD》第 4 步 | 2023 | 「**Mistake: refactoring further than necessary for this session.**」 |
| 《Tidy First?》的 YAGNI 论证 | 2023 | "Speculative structure sends you two bills" |
| Substack《The Cost YAGNI Was Never About》 | 2026 | 完整展开，两笔账单 |
| 第一版《White Book》第 57 页第 4 条 | 1999 | "Has the **fewest possible** classes and methods" |
| 第二版简单设计第 4 条 | 2004 | "**Minimal**" |

**⚠️ 注意：他对过度工程的批评不是"少即是好"，是"时机不对"。** 见真信念 5。

### 真信念 4｜「反馈是第一位的东西」

| 出处 | 年份 | 原句 |
|---|---|---|
| 《Is TDD Dead?》第 3 集 | 2014 | 四约束：**Frequency / Fidelity / Overhead / Lifespan** |
| 《Is TDD Dead?》第 3 集 | 2014 | 「**The on-call is the feedback loop that teaches you what tests you didn't write.**」 |
| 第二版 XP（引丰田） | 2004 | 「**If you use a part immediately, you get the value of the part itself as well as information about whether the upstream machine is working correctly.**」 |
| 《Canon TDD》第 5 步 | 2023 | 「until your **fear** for the behavior of the code has been transmuted into **boredom**」 |
| 《Canon TDD》开篇 | 2023 | TDD 的四个目标里第三个是"**系统为下一次改动做好了准备**"，第四个是"**程序员和同事对以上感到有信心**" |

### 真信念 5｜YAGNI 是**时机**问题，不是**省力**问题

| 出处 | 年份 | 原句 |
|---|---|---|
| 《The Cost YAGNI Was Never About》 | 2026 | 「**YAGNI is not an excuse to never design as some critics have characterized it. If you need it, build it. YAGNI is a meditation on timing. Building structure too soon is as risky as building structure too late.**」 |
| 同篇 | 2026 | 「**YAGNI was never thrift. It was two pieces of price theory wearing a programmer's slogan.**」 |
| 同篇 | 2026 | 两笔账单：**optionality**（提前承诺花掉了期权）+ **NPV**（成本前置、收益后推） |
| 同篇 | 2026 | 「**Even a *correct* guess leaves you worse off than not committing.**」 |
| 同篇 | 2026 | 「**Waiting is not laziness. Waiting is holding an asset.**」 |

**⚠️ 这是本 Skill 中最重要的立场更新。** 早期（1999–2002）语境里的 YAGNI 常被讲成省力规则，**他 2026 年明确否认了这个解读**。

### 真信念 6｜测试必须先红（否则它什么都没证明）

| 出处 | 年份 | 原句 |
|---|---|---|
| 《Canon TDD》第 2 步 | 2023 | 「**One test. A really truly automated test, with setup & invocation & assertions**」 |
| 《Canon TDD》第 3 步 | 2023 | 「**Mistake: delete assertions so the test pretends to pass. Make it pass for real.**」 |
| 《Canon TDD》第 3 步 | 2023 | 「**Mistake: copying actual, computed values & pasting them into the expected values of the test. That defeats double checking, which creates much of the validation value of TDD.**」 |
| 《Is TDD Dead?》第 4 集 | 2014 | "double checking" 是 TDD 验证价值的来源；Fowler 提到他会**故意注释掉一行代码或反转条件**来确认有测试会挂 |
| 《Test-Driven Development: By Example》 | 2002 | 书名本身就是这条信念（[二手转述]） |

### 真信念 7｜简单有优先级，冲突时同理心优先

| 出处 | 年份 | 原句 |
|---|---|---|
| 第一版白皮书 p.57 | 1999 | 四条规则（含"通过测试"，**有优先级**） |
| Fowler《Beck Design Rules》引 Kent 复核原话 | 2015 | 「**In the rare case they are in conflict (in tests are the only examples I can recall), empathy wins over some strictly technical metric.**」 |
| 第二版 XP | 2004 | 简单设计四条改写为：Appropriate for the intended audience / Communicative / Factored / Minimal |

### 真信念 8｜方法论会变味，要定期回炉

| 出处 | 年份 | 原句 |
|---|---|---|
| 第二版 XP | 2004 | 「**not membership in the XP club**」 |
| 《Is TDD Dead?》第 5 集 | 2014 | 「**David has brought attention to TDD acquiring some barnacles and needs some scraping.**」 |
| 《Is TDD Dead?》第 5 集 | 2014 | Jim Rumbaugh 在 OOPSLA 说「you won't recognize what happens to XP in ten years and **he was right**」 |
| 《Is TDD Dead?》第 5 集 | 2014 | 「**I'm happy to reboot to first principles**」 |
| 《Canon TDD》 | 2023 | 因为"人们连 TDD 的定义都不一致"而写**规范版** |
| 《Canon 3X》 | 2026 | 开 Canon 系列："**no analogies, no persuasion, just the facts**" |

---

## 3. 自创术语与概念词典

| 术语 | 含义 | 首次/主要出处 |
|---|---|---|
| **tidying** | 对代码**结构**的、小的、安全的、行为保持的改动。"refactoring 的最小那一端" | 《Tidy First?》2023 |
| **structure / behavior** | 代码**怎么摆** vs 代码**算什么**。这是全书的正交两轴 | 《Tidy First?》2023 |
| **First / After / Later / Never** | 整理相对于一次行为改动的四种时机 | Substack 2022-07-29 |
| **structure-only PR** | 只改结构、什么都不改的提交/PR。最便宜的"可复核单元" | 《Tidy First?》Part III |
| **Test List** | TDD 的第一步：**先列**所有期望变体（"基本情形 + 服务超时怎么办 + key 还不在库里怎么办"），**这是行为分析，不是实现设计** | 《Canon TDD》2023 |
| **Canon TDD** | 他 2023 年给出的"规范版"五步流程，明确为了"forestalling strawmen" | 《Canon TDD》2023 |
| **double checking** | 测试的期望值与实际值来自**独立来源**，因而互为交叉验证 | 《Is TDD Dead?》/ TDD by Example |
| **delta coverage** | 这条测试提供了什么**别的测试没提供**的覆盖？零增量覆盖的测试该删（除非有沟通用途） | 《Is TDD Dead?》第 4 集 2014（引 Herb Derby） |
| **defect cost increase** | 缺陷成本随时间递增——第二版用它替代了第一版"变更成本曲线是平的"这个论证 | 第二版 XP 2004 |
| **fake it / triangulate / obvious implementation** | 从红到绿的三种实现策略 | TDD by Example 2002 [二手转述] |
| **YAGNI / You Aren't Gonna Need It** | 关于**时机**的冥想：提前造结构 = 提前行使未到期的期权 | 早期 XP → 2026 年重述 |
| **optionality / futures** | 代码的"未来可改能力"轴，与"现在能做什么（features）"轴正交 | 《Genie Tarpit》2026 |
| **3X: Explore / Expand / Extract** | 软件产品的三阶段模型，各阶段的最优策略不同 | Facebook 时期（~2016–2018）→ Canon 3X 2026-07-30 |
| **baby steps** | XP 的一条原则 | 第二版 XP 2004 |
| **energized work** | 替代"40 小时工作周" | 第二版 XP 2004 |
| **slack** | 把"做不完可以砍掉的东西"排进计划 | 第二版 XP 2004 |
| **genie（精灵）** | 他对 AI 编码工具的称呼："**一个不可预测的精灵，会实现你的愿望，但常常以出乎意料（且不合逻辑）的方式**" | Pragmatic Engineer 2025 / Substack 2026 |
| **muddling** | 软件价值坐标系里的一个区域：**能跑但极难修改**。AI 生成的代码自然落在它的**左下方** | 《Genie Tarpit》2026 |
| **genie tarpit** | 陷阱：AI 的"貌似合理的推诿"式任务导向让它在代码根本不工作时也宣称成功；复杂度叠复杂度直到它自己都无法假装在前进 | 《Genie Tarpit》2026 |
| **Canon 系列** | 2026 年开的文章系列："用尽可能平实无歧义的语言解释我的想法——**不要类比，不要说服，只要事实**"，明确是为了让 AI 也能读懂 | 2026-07-30 起 |
| **software design is an exercise in human relationships** | 他 2022 年起的座右铭，出自《Self, Team, Product》 | Substack 2022-02-17 |

---

## 4. 一手原文长摘录

### 4.1 《Canon TDD》(2023-12-11) — 题记与五步

> 「**What follows is NOT how *you* should *do* TDD. Take responsibility for the quality of your work however you choose, as long as you actually take responsibility.**
> What follows is my response to "TDD suckz dude because <something that isn't TDD>", a frequent example being, "…because I hate writing all the tests before I write any code." **If you're going to critique something, critique the actual thing.**
>
> 1. Write a list of the test scenarios you want to cover
> 2. Turn exactly one item on the list into an actual, concrete, runnable test
> 3. Change the code to make the test (& all previous tests) pass (adding items to the list as you discover them)
> 4. Optionally refactor to improve the implementation design
> 5. Until the list is empty, go back to #2」

> 「**TDD is a programming workflow.** A programmer needs to change the behavior of a system (which may be empty just now). TDD is intended to help the programmer create a new state of the system where:
> - Everything that used to work still works.
> - The new behavior works as expected.
> - **The system is ready for the next change.**
> - **The programmer & their colleagues feel confident in the above points.**」

> 「**Interface/Implementation Split** — The first misunderstanding is that folks seem to lump all design together. There are two flavors:
> - How a particular piece of behavior is invoked.
> - How the system implements that behavior.
> (When I was in school we called these logical & physical design & were told never to mix the two but nobody ever explained how. I had to figure that out later.)」

**关于 Test List（第 1 步）**：
> 「This is analysis, but **behavioral** analysis. You're thinking of all the different cases in which the behavior change should work. If you think of ways the behavior change shouldn't break existing behavior, throw that in there too.
> **Mistake: mixing in implementation design decisions.** Chill. There will be plenty of time to decide how the internals will look later.」

**关于第 2 步**：
> 「**One test. A really truly automated test, with setup & invocation & assertions (protip: trying working backwards from the assertions some time).** It's in the writing of this test that you'll begin making design decisions, but they are primarily **interface** decisions.
> **Mistake: write tests without assertions just to get code coverage.**
> **Mistake: convert all the items on the Test List into concrete tests, then make them pass one at a time.** What happens when making the first test pass causes you to reconsider a decision that affects all those speculative tests? Rework. What happens when you get to test #6 & you haven't seen anything pass yet? **Depression and/or boredom.**
> Picking the next test is an important skill, & one that only comes with experience. **The order of the tests can significantly affect both the experience of programming & the final result.** (Open question: is code sensitive to initial conditions?)」

**关于第 3 步**：
> 「**Mistake: delete assertions so the test pretends to pass. Make it pass for real.**
> **Mistake: copying actual, computed values & pasting them into the expected values of the test. That defeats double checking, which creates much of the validation value of TDD.**
> **Mistake: mixing refactoring into making the test pass. Again with the "wearing two hats" problem. Make it run, *then* make it right.** Your brain will (eventually) thank you.
> If in the process of going red to green you discover the need for a new test, add it to the Test List. If that test invalidates the work you've done already ("Oh, no, there's no way to handle the case of an empty folder."), you need to decide whether to push on or start over (**protip: start over but pick a different order to implement the tests**).」

**关于第 4 步**：
> 「***Now* you get to make implementation design decisions.**
> **Mistake: refactoring further than necessary for this session.** It feels good to tidy stuff up. It can feel scary to face the next test, especially if it's one you don't know how to get to pass (I'm stuck on this on a side project right now).
> **Mistake: abstracting too soon. Duplication is a hint, not a command.**」

**关于第 5 步**：
> 「**Keep testing & coding until your fear for the behavior of the code has been transmuted into boredom.**」

**历史（他本人的时间线交代）**：
> 「I wrote **SUnit in 1994** for a consulting client, so it can't be before then. I demoed TDD for **Ward Cunningham at the Austin OOPSLA conference in October 1995**, so that puts an upper bound on the date. **Interestingly I can't find any published references to it from that era.** I stalled writing the TDD By Example book long enough that I was worried that I would be scooped. It all worked out.」

### 4.2 《The Cost YAGNI Was Never About》(2026-06-25) — 完整原文（关键段）

**那个对话现场**：
> 「Here's how I remember it—Chet Hendrickson came up to me in the middle of a project and said, "I could do this simplistic thing now but in 3 weeks that will be insufficient so since we're going to need this more complicated thing I want to do it now."
> I said, "**You aren't going to need it.**"
> Chet said, "You don't understand. We're definitely going to need it. See, here's an example…"
> Me (interrupting), "**You aren't going to need it.**"
> Chet, get frustrated, "But we really are…"
> Me, "**You aren't going to need it.**"
> Chet, eyes going up to the ceiling, pausing, "**Oh.**" Walks away.」

**核心立场**：
> 「**YAGNI is not an excuse to never design as some critics have characterized it. If you need it, build it. YAGNI is a meditation on timing. Building structure too soon is as risky as building structure too late.**」

**第一笔账单（可选性）**：
> 「When you build structure before the feature arrives, you're committing on a guess. The feature you prepared for usually isn't the feature that shows up. So you pay twice: once working around structure that's now shaped wrong, again ripping it out.
> Here's the part people miss. **This is not an argument that prediction is hard, as if a sharper architect escapes it. Even a *correct* guess leaves you worse off than not committing.** The value was never in the structure. **The value was in the option to build the right structure once you knew.** Building early spends that option. You exercise it before expiry and throw away the time value.
> **Waiting is not laziness. Waiting is holding an asset.**」

**第二笔账单（NPV）**：
> 「Money has time value. So do features. Structure you build now for a feature due in three months is cost pulled forward and revenue pushed back. **You spent sooner and you shipped the paying thing later.**
> This bill comes due *even when your guess is right*. **Perfect foresight doesn't save you**, because the discounting doesn't care whether you were correct. It cares that you sequenced the cost ahead of the return.
> Two bills, then. **Optionality says: don't commit before the information arrives. NPV says: don't pay before you have to.** They're independent, and they almost always agree. When they seem to disagree — "but it'll be so expensive to retrofit later!" — look closely, because **the expensive retrofit is itself a prediction**. You're back to the first bill.」

**给 AI 的那一段（这是 2026 年最重要的一段）**：
> 「Notice what is *not* on either bill: **the cost of typing the code.**
> This matters because **the cost of typing just went to roughly zero**. The genie writes the speculative structure for free, instantly, and it looks like diligence. So **the thrift reading of YAGNI — "code is cheap now, why not build ahead?" — collapses. If YAGNI were about saving effort, cheap generation would retire it.**
> It isn't, so it doesn't. Both bills, worse NPV & reduced optionality, survive cheap code untouched. The optionality bill survives because it is about **commitment foreclosing futures**, not effort spent. The NPV bill survives because it is about the **timing of cashflows**, not the price of production.
> **Free generation doesn't weaken YAGNI. It makes the violation cheaper to commit, which is worse.** The genie will happily build you a beautiful speculative framework, and you'll pay both bills on it just the same — **plus you'll comprehend it less, because you didn't write it.**
> **YAGNI was never thrift. It was two pieces of price theory wearing a programmer's slogan.** The slogan survives the genie because the price theory does.
> **Build it when you need it. Not because the code is dear. Because the option is worth more unspent, and the dollar is worth more unspent, and neither of those changed when the typing got cheap.**」

**这篇的正文开头还有一段说明他为什么写它**：
> 「I was surprised in a recent convo with a model to discover that genies don't understand YAGNI. People, I understand, but **omniscient models**? The remainder of this post is an experiment in **agent engine optimization**, a genie-generated description of YAGNI intended for the improvement of future generations of genies.
> Read it, don't read it, fellow human, **it's not intended primarily for you**. Rather like Canon TDD, **I find myself restating myself in clearer, blunter language.**」

### 4.3 《Genie Tarpit》(2026-04-29) — 完整原文（关键段）

**开篇（一句话把 AI 代码的性质定死）**：
> 「**Genies give you code that's a degraded facsimile of the mediocre code it trained on.** How can we get the genie to give us valuable code?」

**两轴**：
> 「"Valuable" lives on 2 axes:
> - **Features**—what the code does now.
> - **Futures**—what we can get the code to do once we learn the lessons of this set of features.
> As an engineer I am constantly juggling these two dimensions… On the features axis software either works or it doesn't (more or less) & **the region of working is rather small.**
> The other axis is flexibility—can we make changes that: Work as expected / Don't break anything that was already there. I've called this "**optionality**" or "**futures**" recently. **Still looking for the right words.**
> **Flexibility/optionality/futures has a wider operating range than whether the software works or not. You can skimp on flexibility for a while & not really feel it.**」

**他对"正常团队"的判断**：
> 「**Most teams weren't in the upper right. Instead, they muddled along with mostly-working software that was quite difficult to change.**」

**关于 AI（全文最重的一段）**：
> 「Here's what I've observed—**genies naturally live down & to the left of muddling.** The "**plausible deniability**" task orientation of the genie **leaves it claiming success even though the code doesn't work at all.** And **complexity piles on complexity until even the genie can't pretend to make progress any more.**」

**结尾（他明确不设答案）**：
> 「**Solution? You probably saw this one coming—nobody knows.** Does the model need to be trained on better code? Trained on **good commits**? Better harnesses? **Tests? Which tests? When?** Better prompting? Or grasp the nettle of the Bitter Lesson & let the model develop its own style of development, even if it turns out to be incomprehensible to us rapidly-obsolescing humans?
> **Awareness is the first step. Where are you? Where do you want to be?**」

### 4.4 《Self, Team, Product》(2022-02-17) — 座右铭的出处

> 「The motto of my work on software design is, "**Software design is an exercise in human relationships.**" **I didn't know what this meant when I wrote it**, but as *Tidy First?* takes shape I'm beginning to understand.」

> 「**Book writing is an exercise in scope slashing.** I always start writing about a topic that is too small to fill a whole book, realize it's way too big for a book, slash it back to a topic that is too small to fill a whole book, then… **The most times I've been through this loop is 4 before I got a book-sized topic.**
> Software design is good example. I wanted to write about coupling & cohesion, **Newton's Laws of Motion for software development**. That proved too large a topic, so I slashed scope to **incremental design**. Again, too large, so I slashed scope to **this moment that occurs 10 times in every developer's day: I have to change this code, it's messy, do I *Tidy First?***」

**三个关系圈（这是"三部曲"的骨架）**：
> 「- **Self.** How do I treat myself as a programmer? At times I've had an abusive relationship with myself. This code sucks? Well I'm just going to have to power through it. It's like walking with too-tight shoes. **Tidying is geek self-care. Do I value myself enough to make my work easier?**
> - **Team.** How do we treat each other as programmers? Software design choices affect other people. **If I change an API you use, I've just caused you pain.** Maybe it's worth it in the long run & maybe not, but if I want to be effective as a designer **I'd better be prepared to acknowledge & address the relationship effects of my "technical" decisions.**
> - **Product.** How do programmers treat non-programmers? …
> So this work is looking like a trilogy. ***Tidy First?* is about our relationship with ourselves.** The next book will be about teams… The last book will be, given reasonably healthy relationships among a team of reasonably healthy geeks, **how can they extend care to a larger, not-so-obviously aligned, definitely not so geeky community.**」

**他对 Meta 口号的批评**（顺带，显示他的价值取向）：
> 「Yesterday, Mark Zuckerberg rolled out a new motto for Facebook: "Meta, Metamates, Me". Aside from being **cringy & culty & exploitable**, this is **exactly backward** of how I'm approaching writing about software design. (There's lots more to say about the history of **self-abnegation propaganda in tech**, but I digress…)」

### 4.5 《First, After, Later, Never》(2022-07-29) — 免费可见部分

> 「We are talking about the timing of tidying with respect to a behavioral change in the system. Tidy first, then change the behavior? Change the behavior, then tidy? Or simply note messiness (in the sense that future behavior changes are going to be harder than they need be), then come back later to tidy? Or, don't tidy at all?
> **Never** — Let's start with the last one. As always, we need to examine the tradeoffs involved in not tidying at all. When should we say, "Yes, this is a giant mess, & we consciously choose not to do anything about it."? **The best reason is because we're never going to change the behavior of the code ever ever again.**」

**（其余三节在付费墙后，本文件不使用。判据由 §1.4 的 [二手·结构完整中转] 补全。）**

### 4.6 《Canon 3X: Explore/Expand/Extract》(2026-07-30) — 开篇声明

> 「I've started a series of Canon articles where I explain my ideas **as plainly & unambiguously as possible—no analogies, no persuasion, just the facts.**」

（**该篇正文在付费墙后，**本文件只使用其副标题声明。3X 概念的 [二手] 补全见 Agent 5 的文件。）

---

## 5. 对外部批评的回应 / 自我反思与立场变化

### 5.1 对 TDD 教条化的反思（最重要）

| 时间 | 立场 |
|---|---|
| 2002《TDD by Example》 | 给出完整流程与三种策略，语气是"这就是 TDD" |
| 2014《Is TDD Dead?》 | **转为权衡语言**：「it depends, and that's going to be the beginning to all of my answers to any question that's interesting」；承认有"non-TDDable"代码；承认 Facebook 不写单元测试也能跑 |
| 2023《Canon TDD》 | **回到规范语言**，但在**题记里明确否认这是普适处方**：「**What follows is NOT how *you* should *do* TDD.**」 |

**⚠️ 这三步是一个真实的来回。不要把他固定在任何一个时间点上。**

### 5.2 对"设计是主观的"这类说法的攻击（2015，[一手·经本人复核]）
见 §1.3 末段。"bullshit" 是他自己的用词。

### 5.3 对 YAGNI 被误读的回应（2026）
见 §4.2。他明确说：「**YAGNI is not an excuse to never design as some critics have characterized it.**」

### 5.4 对"敏捷"标签的态度
见 Agent 5/Agent 2 的文件（他在 2025 年访谈里承认自己当初**不喜欢 "agile" 这个词**）。

### 5.5 他公开承认错的地方 / 自我修正
- **第一版 XP 的简单设计四规则有两个版本**，Fowler 注："I recall this was an earlier formulation that **Kent improved on** while writing the White Book."（他改进了自己的规则）
- **第二版把第一版的三个实践（隐喻、重构、编码规范）去掉或合并**——这是他自己承认第一版有问题的最清晰证据
- **第二版放弃了第一版"变更成本曲线是平的"这个论证**，改用 **defect cost increase**（Bill Wake 书评明确指出这一点）
- **他 2025 年承认 "Extreme" 是营销选择**

---

## 6. 推荐书单与智识谱系

### 6.1 影响过他的人

| 人/来源 | 在哪体现 |
|---|---|
| **Ward Cunningham** | 1995 年第一个看到 TDD 演示的人；c2 wiki 上讨论简单设计规则的地方；XP 共同奠基 |
| **Ron Jeffries** | XP 三巨头；xprogramming.com 上讨论涌现式设计 |
| **Martin Fowler** | C3 同事、《重构》作者；**他想法最重要的记录者**（"Beck Design Rules"经他本人复核） |
| **Erich Gamma** | JUnit 的合作者（SUnit → Java） |
| **Christopher Alexander** | 《The Timeless Way of Building》；第二版 XP 有一节 "The Timeless Way of Programming"，"和谐与平衡是 XP 的目标" |
| **丰田生产系统（Toyota Production System）** | 第二版明确："Every worker is responsible for the whole production line"；消除浪费（kaizen）；"If you use a part immediately, you get the value of the part itself as well as information about whether the upstream machine is working correctly"；"**The greatest waste is the waste of overproduction.**" |
| **Winslow Taylor（反面教材）** | 第二版专章批判 Taylorism：计划与执行分离、独立的质量部门的后果是坏的 |
| **Deming** | 经丰田间接影响；持续改进 |
| **经济学（近十年）** | NPV、期权定价、贴现、波动率、**Shannon's Demon**（2026-09-02《Reject Change, Sometimes》用到）、**Kingman 公式**（2026-08-13《Busy is Short Volatility》） |
| **Michael Fagan** | 1976 年 IBM Systems Journal 的代码审查论文——他 2025-12-26 写单人代码复核时翻出来 |

### 6.2 他影响过的人
- 整个敏捷运动（2001 敏捷宣言签署者之一）
- TDD 生态：Dan North 的 BDD、Dave Farley、xUnit 家族（JUnit / NUnit / RSpec 语法形态源自 SUnit）
- **Robert C. Martin（Uncle Bob）**——**但注意：Uncle Bob 的 TDD 比 Beck 严格得多。"TDD 是纪律铁律"这个公众印象主要来自 Uncle Bob，不来自 Beck**（这是本 Skill 的一个重要分辨点）
- Martin Fowler 的重构实践（互相影响）
- 近五年的个人开发者社群（Substack）

### 6.3 他推荐的（书 / 概念）
在本文件能确证的材料里，他主动推荐过的有：
- **《The Timeless Way of Building》**（Christopher Alexander）——第二版 XP 专章致意
- **Michael Fagan 1976 年的论文**（他在 2025 年写单人 code review 时引用）
- **Herb Derby 的 delta coverage 概念**（2014）
- **Jim Weirich 关于六边形架构的演讲**（作为 DHH 论点的具体材料，2014）
- 他 2025 年访谈里提到 **Bitter Lesson**（Rich Sutton）——作为"可能该让模型自己长出风格"的一种可能性

---

## 7. 来源清单

### 一手（他写的 / 他说的，本次实际抓取到全文）

| # | 来源 | URL | 日期 | 抓取状态 |
|---|---|---|---|---|
| 1 | 《Canon TDD》 | https://newsletter.kentbeck.com/p/canon-tdd | 2023-12-11 | ✅ 全文 |
| 2 | 《The Cost YAGNI Was Never About》 | https://newsletter.kentbeck.com/p/the-cost-yagni-was-never-about | 2026-06-25 | ✅ 全文（含正文关键段） |
| 3 | 《Genie Tarpit》 | https://newsletter.kentbeck.com/p/genie-tarpit | 2026-04-29 | ✅ 全文 |
| 4 | 《Self, Team, Product》 | https://newsletter.kentbeck.com/p/self-team-product | 2022-02-17 | ✅ 全文 |
| 5 | 《First, After, Later, Never》 | https://newsletter.kentbeck.com/p/first-after-later-never | 2022-07-29 | ⚠️ 仅 "Never" 节免费可见 |
| 6 | 《Canon 3X: Explore/Expand/Extract》 | https://newsletter.kentbeck.com/p/canon-3x-exploreexpandextract | 2026-07-30 | ⚠️ 仅副标题声明可见 |
| 7 | Substack 归档页 | https://newsletter.kentbeck.com/archive | — | ✅ 篇目与日期 |
| 8 | Substack "Genies" 标签页 | https://newsletter.kentbeck.com/t/genies | — | ✅ 篇目与日期 |
| 9 | 《The Pragmatic Engineer》访谈 | https://newsletter.pragmaticengineer.com/p/tdd-ai-agents-and-coding-with-kent | 2025-06-11 | ✅ 全文含逐字引文 |
| 10 | 《Is TDD Dead?》五集 minutes（Fowler 记录） | https://martinfowler.com/articles/is-tdd-dead/ | 2014-05/06 | ✅ 全文（**是纪要，非逐字稿**） |
| 11 | 《Beck Design Rules》（Fowler 写，**Kent 本人复核并回信**） | https://martinfowler.com/bliki/BeckDesignRules.html | 2015-03-02 | ✅ 全文 |
| 12 | 《Extreme Programming Explained》1st ed. 白皮书 pp.57 / 109 | — | 1999 | ⚠️ **未取得原书**；经 #11 转引（**#11 经本人复核**） |
| 13 | 《Test-Driven Development: By Example》 | — | 2002 | ❌ **未取得原书**；三策略为多方二手转述 |
| 14 | 《Tidy First?》 | — | 2023 | ❌ **未取得原书**；见 §1.4 的 [二手中转] |
| 15 | 《RIP TDD》（Facebook 笔记） | facebook.com/notes/kent-beck/rip-tdd/750840194948847 | 2014 | ❌ **未取得原文**，仅在 #10 第 5 集被提及 |

### [二手·结构完整中转]
| # | 来源 | 说明 |
|---|---|---|
| S1 | `senior-stack.uz` "Tidy First — When and How" 五级页面（junior / middle / senior / professional / interview） | 自称 "Source: Kent Beck, _Tidy First?_ (O'Reilly, 2023), Parts I–III"。**资料密度高、层级一致、内部无矛盾**，本文件用它支撑 §1.4 的全部内容与 §2 的真信念 1/2/3 的部分证据。**但它不是原书**，页码引用不可用 |

### 二手
| # | 来源 | 用途 |
|---|---|---|
| 16 | Bill Wake《Overview of "Extreme Programming Explained, 2/e"》(XP123, 2005-02-01) — https://xp123.com/review-extreme-programming-explained-2e/ | 第一版 vs 第二版全部差异 |
| 17 | daily.dev 的《Canon 3X》摘要页 | 仅确认 3X 概念的存在与日期 |

### [书目级信息]（未取得正文）
- 《Smalltalk Best Practice Patterns》(1996)
- 《Planning Extreme Programming》(2000, with Martin Fowler)
- 《Implementation Patterns》(2007)
- 《Refactoring: Ruby Edition》(2009, with Jay Fields & Shane Harvie)

### 未使用
- 知乎、微信公众号、百度百科/百度知道（**黑名单**）
- bing 返回的「KENT 香烟」「健牌」「肯特大学」等页面（**引擎误召回，与 Kent Beck 无关**）

---

## 附：本文件的信息充分度自评

| 维度 | 充分度 | 说明 |
|---|---|---|
| 《Tidy First?》核心概念 | ⭐⭐⭐⭐ | 概念完整（定义、两轴、证据、Four timing、15 个 tidyings、structure-only PR 信号），但**非原书**，页码不可用 |
| TDD / Canon TDD | ⭐⭐⭐⭐⭐ | **全文抓取自他本人的 Substack**，含题记与全部具名错误 |
| 简单设计四规则 | ⭐⭐⭐⭐⭐ | **经他本人复核的 Fowler 文章**，含他复核时的原话 |
| XP 两版差异 | ⭐⭐⭐ | 经 Bill Wake 书评，结构完整但非原书 |
| YAGNI 立场更新 | ⭐⭐⭐⭐⭐ | **2026 年原文全文** |
| 过度工程的批评 | ⭐⭐⭐⭐ | Canon TDD + YAGNI + 第二版"Minimal"三处互证 |
| "make it work / right / fast" | ⭐⭐⭐⭐⭐ | Canon TDD 第 3 步的 "Make it run, *then* make it right" 是**确证的一手**；"make it fast"那一半**已补齐直接出处**——见 §8.2.1（`kentbeck.com` 首页把整句署名给他父亲 Douglas Beck；`Mastering Programming` 把整句列为 Time 组条目）。⚠️ 但**与 Knuth "premature optimization" 的关联未找到证据**，见 §8.10 |
| 《TDD by Example》细节 | ⭐⭐ | 未取得原书 |
| 早期 Smalltalk 细节 | ⭐ | 只有书目级信息（本题要求"压缩早期 Smalltalk 细节"，符合预期） |
| 推荐书单 | ⭐⭐ | 只能从行文中零散提取，未见集中的"书单"材料 |

---

---

# 补充卷（第二轮抓取 · 补齐父级指定缺口）

> 本节由第二轮检索补齐，**只增不改**上文。凡与上文不一致处，两说并列，不做调和。
> 本节所有条目均带来源 URL 与信源分级：`[一手]` = Kent 本人撰写 / 本人站点 / 本人仓库 / 本人发言记录；`[半一手]` = 他人记录但含 Kent 直接引语，或经 Kent 本人复核；`[二手]` = 他人转述；`[推断]` = 我的判断；`[未核实]` = 本轮无证据。

## 8.0 本轮新增的四条修正（直接记录，不调和）

| # | 既有假设 | 本轮证据 | 结论 |
|---|---|---|---|
| 修正 1 | 「GitHub 上有 `tidy-first` 仓库（含《Tidy First?》目录/章节材料）」 | `https://api.github.com/search/repositories?q=user:KentBeck+tidy` → `total_count: 0`；`https://api.github.com/repos/KentBeck/tidy-first` → 404。以 `tidy-first in:name` 检索到的 34 个同名仓库**全部属第三方**（韩语读书会、个人笔记、agent skill 等） | **假设不成立。Kent 官方无此仓库。**[一手：GitHub 官方 API] |
| 修正 2 | 「Software Development as a Cooperative Game」疑似 Kent 术语 | 该提法与同名 Jolt 获奖书均属 **Alistair Cockburn**：`https://web.archive.org/web/20070402084629/http:/alistair.cockburn.us/index.php/Software_development_as_a_cooperative_game`、`https://infoq.com/articles/agile-software-cockburn-book-2ed` | **属 Cockburn，不得记作 Kent 自创。**[二手，反证] |
| 修正 3 | "the only thing that matters is feedback" | 本轮多轮检索**未找到 Kent 原文**。最接近的一手表述见 §8.7.1 | **标 `未核实`。**不建议写入 Skill |
| 修正 4 | "Ratchet"（与 Genie 并列的术语） | 多引擎检索**零相关结果** | **标 `未核实`。**不建议采用 |

另：上文 §1.6 提到「Refactoring: Ruby Edition (2009)」。本轮检索到该书 ISBN 与合著者信息，与上文一致（详见 §8.3.3）。

---

## 8.1 完整著作年表（逐本：书名 / 年份 / 核心论点 / 引文）

> 骨架来自 Wikipedia 镜像的完整著作目录 [二手：`https://kiwix.enszfarms.org/content/wikipedia_en_all_maxi_2025-08/Kent_Beck`]，逐本补论点证据。**年份冲突一律并列。**

### 8.1.1 *Kent Beck's Guide to Better Smalltalk: A Sorted Collection*（1996, Cambridge University Press）

- 年份：[二手：Wikipedia 镜像]，ISBN 978-0521644372。
- **核心论点 `未核实`** —— 本轮未取得任何正文级或摘要级材料。
- [推断] 从书名（"Sorted Collection"）与他的写作习惯看，这是 Smalltalk 文章的结集，是他后来"短条目 + 名字 + 动机 + 结果"写作范式的第一次成形。**此判断无证据，不得作为事实使用。**

### 8.1.2 *Smalltalk Best Practice Patterns*（Prentice Hall）

- **年份冲突（并列）**：
  - [二手：Wikipedia 镜像] 记 **1997**，ISBN 978-0134769042。
  - 任务书给定 **1996**。
- **核心论点（一手，Kent 自述）**：
  > "I am writing the Smalltalk **Best Practices** Pattern Language, recording solutions to most of the common problems facing professional Smalltalk developers."
  [一手：`https://c2.com/ppr/about/author/kent.html`]
- **一手旁证：命名是他方法论的起点**：
  > "For naming core abstractions, Beck chose 'drawing object,' 'drawing handle,' etc. But Ward cared intensely about nomenclature and hunted for better vocabulary, so they kept a physical thesaurus which was well thumbed. Beck recalls **they became pretty obsessed about the names of things**."
  [二手（含其自述）：`https://newsletter.pragmaticengineer.com/p/how-kent-beck-shapes-the-software`]
- **与四原则的接点**：「States every intention important to the programmers」这条原则的根，就在 Smalltalk 命名实践里。[推断，有一手文本支撑]

### 8.1.3 *Extreme Programming Explained: Embrace Change*（1st ed., Addison-Wesley，"The White Book"）

- **年份冲突（并列）**：
  - [二手：Wikipedia 镜像] 记 **2000**，ISBN 978-0321278654，注明获 **Jolt Productivity Award**。
  - [二手：`https://academickids.com/encyclopedia/index.php/Extreme_Programming`] 明确写 "published in **1999**"。
  - 上文记为 1999-10。通行说法：1999 年 10 月上市、2000 年版权 / 获奖。
- **核心论点**：见 §8.4（简单设计四原则）与 §8.7.3（白皮书原话）。
- **奖金佐证**：[二手：Wikipedia 镜像]

### 8.1.4 *Planning Extreme Programming*（2000，与 Martin Fowler 合著，Addison-Wesley）

- 年份：[二手：Wikipedia 镜像] **2000**，ISBN 978-0201710915。
- **核心论点 `未核实`**（本轮未取得正文）。上文 §1.6 的内容来自 Agent 侧的另一条线索，本节不重复。
- **一手联结点（唯一可用）**：Kent 对 XP 节奏的自述——"**Every week the system does something new that the users are grateful for. Every week is a chance to change direction & focus.**"[一手：`https://newsletter.kentbeck.com/p/ideas-ive-contributed-to-in-software`]。"每周一次的改向权"正是该书规划方法的母题。

### 8.1.5 *Test-Driven Development: By Example*（2002, Addison-Wesley）

- 年份：[二手：Wikipedia 镜像] **2002**，ISBN 978-0321146533，**Jolt Productivity Award**。O'Reilly/InformIT 官方页：[二手：`https://www.informit.com/store/test-driven-development-by-example-9780321146533`]。
- 目录可见 "CHAPTER 3 Preface **Courage**"，佐证"勇气"在前言即登场：[二手：`https://dokumen.pub/test-driven-development-by-example-0321146530-9780321146533.html`]
- **详细论点见 §8.2（本轮重点补齐项）。**

### 8.1.6 *Contributing to Eclipse: Principles, Patterns, and Plugins*（2003，与 Erich Gamma 合著）

- 年份：[二手：Wikipedia 镜像] **2003**，ISBN 978-0321205759。
- 论点 `未核实`。**唯一可用价值**：佐证 Kent 与 Erich Gamma 的合作关系（JUnit 的两位作者），是智识谱系的一环。

### 8.1.7 *JUnit Pocket Guide*（2004, O'Reilly）

- 年份：[二手：Wikipedia 镜像] **2004**，ISBN 978-0596007430。论点 `未核实`。

### 8.1.8 *Extreme Programming Explained: Embrace Change, 2nd Edition*（2004，与 Cynthia Andres 合著）

- 年份：[二手：Wikipedia 镜像] **2004**，ISBN 978-0201616415，注明 "**Completely rewritten**"。
- 结构性改动（价值观 → 原则 → 实践）与两版差异：见上文 §1.2 与本卷 §8.7.3。
- **价值观数量冲突（并列，不调和）**：
  - [二手：`https://adamtornhill.com/reviews/xpexplained.htm`] 只列 4 个：communication / simplicity / feedback / courage。
  - [二手：`https://xp123.com/review-extreme-programming-explained-2e`] 列 5 个，并明确 **Respect 为 2nd ed 新增**："'Respect' is listed as a new value."
  - → **通行共识为 5 价值观**；Tornhill 的 4 个列举应视为漏列或沿用 1st ed 语境。
- **主实践 / 从实践的分类原则（这是"小步与反馈"最重要的一条工程化约束）**：
  > "The practices themselves are split into primary- and corollary-practices. The idea is that one can start to use any of the primary practices immediately, with added value, without any of the other practices in place… The corollary practices more or less require the primary practices to be in place. **Failing to do so seems risky.** Beck gives the example of starting to deploy daily (a corollary practice) without a low defect rate through primary practices like test-first, pair-programming and continuous integration. Such a strategy is likely to drown, and finally halt, the development in defect reports."
  [二手：`https://adamtornhill.com/reviews/xpexplained.htm`]
- **哲学层**：后半部有专章 **Taylorism and Software**（为何"独立 QA 部门"是错的）与 **Toyota Production System**（人人对质量负责、持续消除缺陷与过量生产）。[二手：同上]
- **12 个具体实践的完整清单 `未核实`**（本轮未取得一手清单；Agile Alliance 词条页抓取时被导航截断）。

### 8.1.9 *Implementation Patterns*（Addison-Wesley）

- **年份冲突（并列）**：
  - [二手：Wikipedia 镜像] 记 **2008**，ISBN 978-0321413093。
  - 任务书与多个书商页面（Bokus 等）作 **2007**。
- **存在官方样章 PDF**（本轮未抓取，仅登记）：[二手指向一手：`http://www.informit.com/content/images/9780321413093/samplechapter/BeckCh_0321413091.pdf`]
- **核心论点 `未核实`** —— 本轮未取得正文级证据。**不得据推断写入。**

### 8.1.10 *Refactoring: Ruby Edition*

- 任务书列此书。上文 §1.7 记为 **2009**，与 Jay Fields、Shane Harvie 合著，Kent 挂名并写序。
- 本轮**未取得独立来源**佐证 → 该书内容 `未核实`；上文 §1.7 的记述**沿用，不新增**。

### 8.1.11 *Tidy First?: A Personal Exercise in Empirical Software Design*（O'Reilly, 2023）

- 年份：[二手：Wikipedia 镜像] **2023**，ISBN 978-1098151249。O'Reilly 官方书页：[二手：`https://www.oreilly.com/library/view/tidy-first/9781098151232/`]；WorldCat 书目与封面推荐语：[二手：`https://search.worldcat.org/isbn/9781098151249`]
- **成书三线索（一手，Kent 自述）**：
  > "Three threads came together for me to begin working on 'Tidy First?', a book on software design:
  > - Re-reading **Yourdon and Constantine's *Structured Design*** & realizing that the fundamentals of design had been sitting there all along.
  > - Reading **Ousterhout's *A Philosophy of Software Design*** & finding it **shallow and dogmatic**.
  > - Starting to write my first book in 14 years, realizing that **the old relationship between author and reader had broken down**, & wanting to experiment with a new relationship."
  [一手：`https://newsletter.kentbeck.com/p/welcome-to-tidy-first`，2021-01-26]
  → **注意**：他批评的是一本以"反过度设计"著称的书。**他反对的不是"反过度设计"，而是把结论当戒律。**
- **写作结构的自我纠偏（一手）**：
  > "The big breakthrough was realizing that **I had the book backwards**. All the really juicy theoretical stuff… belongs at the back."
  > "A tidying is like a little baby miniature refactoring… **I currently have 13 tidyings outlined… I expect to end up with like 20.**"
  > "Part of tidying philosophy is that **it should never be a big deal. Never something that has to be reported & tracked & planned & scheduled.**"
  > "My goal is for readers to **begin reading in the morning and be designing better that afternoon.**"
  [一手：`https://newsletter.kentbeck.com/p/tf-book-outline`，2022-01-29]
- **题眼（一手，三部曲的 One Startling Sentence）**：
  > "Software design is an exercise in human relationships. **Superior technical skills & superior grasp of theory is only useful when placed in service of these relationships.**"
  > 每本 3 部分：**Technique → Management → Theory**（"I put these first so people who want to start learning by doing can begin after reading a few pages."）
  [一手：`https://newsletter.kentbeck.com/p/tidy-together-outline`]
- **目录与逐章论点**：见下文 §8.1.12（合并列出）。

### 8.1.12 系列第三本《Tidy Together?》与已有目录（一手，进行中）

- **《The Good News Factory》**（O'Reilly 高管简报）已出版。[一手：`https://kentbeck.com/`]
- **《Tidy Together?》** 暂定大纲（一手公开），**Management 段的主题句是本调研最贴合"小步"的一手证据之一**：
  > "The theme in this section is to **start, sustain, suspend, & complete large changes in small, safe steps.**"
  含条目：Separate interface & implementation hats / **Interruptible changes** / Collective ownership / **Parallel structures—the key to non-disruptive change** / Pass through implementation / **Breaking changes—tradeoff space (summary—don't ever break the system)** / Timing—pull versus push / Money in process—a design metric / Similar→identical→de-duplicate / Effort/output/outcome/impact / **Make it run, make it right, make it fast** / **Incentives—structure folks & behavior folks**
- **Technique 段：他把 Fowler 的 refactoring 目录重述为「全部可逆」**：
  > "The key difference between my take & Fowler's is that **I consider all refactorings reversible. For every extract there is an inline.** I want to master both to give me the greatest number of paths through the design space."
  > "objects & functions are fundamentally the same but **imperative programming is prone to excess coupling**."
- **Theory 段（含"为什么"的深层机制）**：Taxonomy of couplings / Emergent design / Implicit design made explicit / Coupling & inheritance / **Meaningless mean—averages mis-characterize power-law distributed data** / Generating a power law distribution versus generating a normal distribution / Unreasonable cost of "outliers" / Symmetry / Shape of coupling/de-coupling tradeoff / **Ethics of care in software design** / Design attractors
  → 他明说 power law 是 "**the fundamental mind-blowing counter-intuitive law of nature underpinning software design**"。
  [一手：`https://newsletter.kentbeck.com/p/tidy-together-outline`，2024-05-22]
- **《Tidy First?》成书目录**（[二手逐章笔记 + 完整 TOC：`https://danlebrero.com/2024/08/07/tidy-first-summary/`]）：
  - Part I Tidyings（14 章）：1 Guard Clauses / 2 Dead Code / 3 Normalize Symmetries / 4 New Interface, Old Implementation / 5 Reading Order / 6 Cohesion Order / 7 Move Declaration and Initialization Together / 8 Explaining Variables / 9 Explaining Constants / 10 Explicit Parameters / 11 Chunk Statements / 12 Extract Helper / 13 One Pile / 14 Explaining Comments
  - Part II Managing（6 章）：16 Separate Tidying / 17 Chaining / 18 Batch Sizes / 19 Rhythm / 20 Getting Untangled / 21 First, After, Later, Never
  - Part III Theory（10 章）：22 Beneficially Relating Elements / 23 Structure and Behaviour / 24 Economics: Time Value and Optionality / 25 A Dollar Today > A Dollar Tomorrow / 26 Options / 27 Options Versus Cash Flows / 28 Reversible Structure Changes / 29 Coupling / 30 Constantine's Equivalence / 31 Coupling Versus Decoupling
  - ⚠️ **章号 15 在该二手笔记中缺失** → 该章标题 `未核实`。
- **Kent 的原书金句（一手，经二手转引）**：
  > "**Tidyings are a subset of refactoring that nobody could possibly hate on.**"
  > "**Tidying is geek self-care.**"
  > "**Tidy first? Likely yes. Just enough. You are worth it.**"
  > "More than **one hour tidying at a time before making any behavioral changes**, likely means you have lost track of the minimum set of structural changes needed."
  > "**Constantine's equivalence**: cost(sw) ≈ cost(changes) ≈ cost(big changes) ≈ coupling. **To reduce the cost of SW, we must reduce coupling.**"
  > "Most SW design decisions are easily reversible, hence there is little value to avoiding mistakes, hence we shouldn't invest much in doing so. **Make decisions reversible.**"
  > "If two elements are coupled with respect to a change that never happens, then **they aren't coupled in a way that should concern us.**"
  > "**Never:** If you are never ever going to touch the code again. **Very unlikely.**"
  > "**Be wary of tidying becoming an end in itself.**"
  [二手转引：`https://danlebrero.com/2024/08/07/tidy-first-summary/`]

### 8.1.13 独立的一手制品：Test Desiderata（12 属性）

- 来源：[一手：`https://testdesiderata.com/`；仓库 `https://github.com/KentBeck/TestDesiderata`（223 stars；官方描述："Optimize the value of your tests by choosing how to tradeoff among various valuable properties."）]
- 12 属性：Isolated / Composable / Deterministic / Fast / Writable / Readable / **Behavioral** / **Structure-insensitive** / Automated / Specific / Predictive / Inspiring
- **Kent 的原话**：
  > "Some properties support each other. Automating tests makes them faster to run. **Some properties interfere with each other. Making tests more predictive of production behavior makes them slower.** Sometimes (and this is the magic), properties **only seem to interfere**. You can use composability to make tests faster *and* more predictive."
- **为什么这份制品对"小步与反馈"是枢纽**：`Structure-insensitive`（改结构不该让测试变红）与 `Behavioral`（改行为必须让测试变红）这两条，正是 **《Tidy First?》结构/行为二分在测试侧的镜像**。[推断，有一手文本支撑]
- 原始论文（Medium）：[一手：`https://medium.com/@kentbeck_7670/test-desiderata-94150638a4b3`、`https://medium.com/@kentbeck_7670/programmer-test-principles-d01c064d7934`，本轮未抓取正文]

### 8.1.14 "Thinkies"（一手，90 条创意思考习惯）

- [一手：`https://kentbeck.com/`；仓库 `https://github.com/KentBeck/thinkies.org`]
- 定义与示例（原话）：
  > "I'm often asked, 'How did you think of *that*?'… I was surprised to find that **I often have an answer — some trick of thinking that I learned along the way** that generated the idea in question.
  > For example, whenever someone says, 'We can't do X because of Y,' I habitually transform that to, '**When Y is no longer true then we can do X.**' If making Y no longer true seems plausible, I suggest it. 'We can't deploy more often because of all the bugs? So you're saying when we have fewer bugs we can deploy more often?' 'How'd you think of that?' **It's just a trick.**
  > I've been collecting these little idea generators for 30 years. **My collection numbers around 90.**"
- 与 patterns 的关系（他自述）："If this sounds like patterns, I hadn't noticed that before but **it's the same trick**."[一手：`https://newsletter.kentbeck.com/p/ideas-ive-contributed-to-in-software`]

---

## 8.2 《Test-Driven Development: By Example》细节补齐（父级指定缺口）

> 原书正文未取得。以下全部为**带原书页码的二手转引**：`https://stanislaw.github.io/2016-01-25-notes-on-test-driven-development-by-example-by-kent-beck.html`。该笔记逐章标注页码，且与其他二手来源一致，可信度中高。**信源分级：[二手转引原书页码]。**

### 8.2.1 目标与两条规则

> "**Clean code that works (Ron Jeffries)** – is the goal of Test-Driven Development."（preface, p.ix）
> 两条规则（preface, p.ix）：
> 1. **Write new code only if an automated test has failed**
> 2. **Eliminate duplication**

→ 注意目标句的署名：**他把"clean code that works"归给 Ron Jeffries**，不是自己。[一手原书，二手转引]

### 8.2.2 红 / 绿 / 重构，与"一般 TDD 循环"

> "1. **Red** – Write a little test that doesn't work, and perhaps doesn't even compile at first.
> 2. **Green** – Make the test work quickly, **committing whatever sins necessary** in process.
> 3. **Refactor** – Eliminate all of the duplication created in merely getting the test to work.
> **Red/green/refactor – the TDD mantra.**"（preface, p.x）

> "The general TDD cycle goes as follows. 1. Write a test… 2. Make it run… 3. Make it right…
> The goal is **clean code that works**… First we'll solve the 'that works' part of the problem. Then we'll solve the 'clean code' part. **This is the opposite of architecture-driven development**, where you solve 'clean code' first, then scramble around trying to integrate into the design the things you learn as you solve the 'that works' problem."（p.11）

更细的"节奏（rhythm）"（p.1）：
> "Quickly add test → Run all tests and see the new one fail → Make a little change → Run all tests and see them all succeed → **Refactor to remove duplication**"

### 8.2.3 从红到绿的三种实现策略（父级指定重点）

**① Fake It**（p.13）
> "**Return a constant and gradually replace constants with variables until you have the real code.**"

**② Obvious Implementation**（p.13 / p.154）
> "**Type in the real implementation.**
> When I use TDD in practice, I commonly shift between these two modes of implementation. When everything is going smoothly and I know what to type, I put in Obvious Implementation after Obvious Implementation (running the tests each time to ensure that what's obvious to me is still obvious to the computer). **As soon as I get unexpected red bar, I back up, shift to faking implementations, and refactor to the right code.** When my confidence returns, I go back to Obvious Implementations."（p.13）
> "**There's no particular virtue in the halfway nature of Fake It and Triangulation. If you know what to type, and you can do it quickly, then do it.**"（p.154）

**③ Triangulation**（p.16 / p.153 / p.154）
> "**How do you most conservatively drive abstraction with tests? Abstract only when you have two or more examples.**"（p.153）
> "If two receiving stations at a known distance from each other can both measure the direction of a radio signal, then there is enough information to calculate the range and bearing of the signal. This calculation is called Triangulation.
> By analogy when we triangulate, we only generalize code when we have two examples or more… **When the second example demands a more general solution, then and only then do we generalize.**"（p.16）
> "**I only use Triangulation when I'm really, really unsure about the correct abstraction.** Otherwise I rely on either Obvious Implementation or Fake It."（p.154）

**变速隐喻（"档位"）**（p.155 / p.138）
> "You want to maintain that red/green/refactor rhythm. **Obvious Implementation is second gear. Be prepared to downshift if your brain starts writing checks your fingers can't cash.**"（p.155）
> "**If you don't know what to type, type the Obvious Implementation. If you don't know what to type, then Fake It. If the right design still isn't clear, then Triangulate. If you still don't know what to type, then you can take that shower.**"（p.138）

→ **蒸馏要点**：三者不是并列的三个技巧，而是**同一根"步幅调节旋钮"的三档**；调档的唯一判据是"你有多确定"。这正对应 Canon TDD 里"信心"与"恐惧→无聊"的框架。

### 8.2.4 恐惧与反馈：影响图与"程序员的点金石"

> "This is a **positive feedback loop**. The more stress you feel, the less testing you will do. The less testing you do, the more errors you will make. The more errors you make, the more stress you feel. Rinse and repeat.
> How do you get out of such a loop? Either introduce a new element, replace one of the elements, or change the arrows. **In this case we'll replace Testing with Automated Testing.**
> …**Tests are the Programmer's Stone, transmuting fear into boredom.** 'No, I didn't break anything. The tests are all still green.' The more stress I feel, the more I run the tests. Running the tests immediately gives me a good feeling and reduces the number of errors I make, which further reduces the stress I feel."（p.124）
> 变体："**Write tests until fear is transformed into boredom.**"
> 破环三招（p.210）："Drive a positive feedback loop the other direction… Introduce a negative feedback loop to control an activity that has grown too large… Create or break connections to eliminate loops that are not helping."

**影响图的来源（一手自述）**："Kent uses influence diagrams **inspired by Gerry Weinberg's *Quality Software Management***." [二手转引]

### 8.2.5 该删哪些测试（两条判据）

> "More tests are better, but if two tests are redundant with respect to each other, should you keep them both around? That depends on two criteria.
> - The first criterion for your tests is **confidence**. **Never delete a test if it reduces your confidence in the behavior of the system.**
> - The second criterion is **communication**. If you have two tests that exercise the same path through the code, but they speak to different scenarios for a reader, leave them alone.
> That said, if you have two tests that are redundant with respect to confidence and communication, **delete the least useful of the two.**"

### 8.2.6 TDD 不是测试学（对"覆盖率高就是好"的直接反驳）

> "TDD's view of testing is **pragmatic**. In TDD, the tests are **means to an end** – the end being code in which we have great confidence. **If our knowledge of implementation gives us confidence even without test, then we will not write that test.** Black box testing, where we deliberately choose to ignore the implementation, has some advantages… It's an appropriate attitude to take in some circumstances but **that is different from TDD.**"（p.197）

配合"三角形"案例：Kent 自己只用 6 个测试；一位测试员为同一问题写了 65 个。他用这个对比说明**测试数量不是目的**。

### 8.2.7 为什么要自己实现 xUnit

> "There are two reasons for implementing xUnit yourself, even if there is a version already available:
> - **Mastery** – The spirit of xUnit is simplicity. Martin Fowler said, 'Never in the annals of software engineering was so much owned by so many to so few lines of code'… Rolling your own will give you a tool over which you have a feeling of mastery.
> - **Exploration** – When I'm faced with a new programming language, I implement xUnit. **By the time I have the first eight to ten tests running, I have explored many of the facilities I will be using in daily programming.**"

### 8.2.8 单人 vs 团队收工

> "**Broken Test** – How do you leave a programming session when you're programming alone? Leave the last test broken… When you come back to the code, you then have an obvious place to start."（p.149）
> "**Clean Check-in** – How do you leave a programming session when you're programming in a team? Leave all of the tests running."

### 8.2.9 Self Shunt 与"测试即对象"（原文）

> "**How do you test that one object communicates correctly with another? Have the object under test communicate with the test case instead of with the object it expects.** …Why do we need a separate object for the listener? We can just use the test case itself. **The TestCase itself becomes a kind of Mock Object.**"（p.145）

### 8.2.10 教养细节（一手，出自原书）

> "I taught Bethany, my oldest daughter, TDD as her first programming style when she was about age 12. **She thinks you can't type in code unless there is a broken test.** The rest of us have to muddle through reminding ourselves to write the tests."

---

## 8.3 Smalltalk Best Practice Patterns / Implementation Patterns 补齐（父级指定缺口）

### 8.3.1 Smalltalk Best Practice Patterns

- **书目**：[二手：Wikipedia 镜像] 1997，Prentice Hall，ISBN 978-0134769042（任务书作 1996 → **并列，不调和**）。
- **一手定位**：见 §8.1.2。
- **形成背景（一手，Kent 自述）**：
  > "I had been working at Tektronix for a year and a half when I came across Alexander again. I found a battered old copy of ***Notes on the Synthesis of Form*** in Powell's. **Alexander's excoriation of methodologists in the introduction to the second edition resonated with my biases**, leading me to *Timeless Way* again. **It seemed everything he didn't like about architects, I didn't like about software engineers. I convinced Ward Cunningham that we were onto something big.**"
  > 第一次模式实验：在 Ward 的 VW Vanagon 车里决定用模式语言帮客户设计界面，"**Alexander said the occupiers of a building should design it, so we had the users of the system design the interface**"，产出五条模式（Window per Task / Few Panes / Standard Panes / Nouns and Verbs / Short Menus）。
  > "We were amazed at the (admittedly spartan) elegance of the interface they designed. We reported the results at **OOPSLA 87** in Orlando. **We talked patterns until we were blue in the face, but without more concrete patterns nobody was signing up.**"
  [一手：`https://c2.com/ppr/about/author/kent.html`]
- **写作范式的确立（[推断]）**：短条目 + 名字 + 动机 + 结果——这一范式在他后来所有作品里不变（Simple Design 四条、Tidyings、Test Desiderata、Canon 系列都用它）。**此判断为一手文本支持的推断，不作为事实陈述。**
- **人名/命名的重要性（一手旁证）**：见 §8.1.2 的 thesaurus 轶事。
- **模式语言的共同体（一手）**：
  > "In August 1993, Grady Booch and I sponsored a workshop about patterns at a resort high (I mean breath-suckingly high) in the Rockies. Ward, Ralph, Jim Coplien, Ken Auer, Hal Hildebrand, Grady, and I spent three days exploring '**generativity**', the idea that **patterns don't merely exist, they also create the thing they describe**… leading to the formation of the **Hillside Group**."
  [一手：`https://c2.com/ppr/about/author/kent.html`]

### 8.3.2 Implementation Patterns

- **书目**：[二手：Wikipedia 镜像] 2008，Addison-Wesley，ISBN 978-0321413093（任务书作 2007 → **并列，不调和**）。
- **正文论点 `未核实`**。唯一可用二手线索：[二手：`https://dokumen.pub/download/implementation-patterns-9780321413093-0321413091.html`] 显示该书为 748 页规模，未见内容摘要。
- **可确证的一手关联**：Kent 的方法论在 Career Accounting 里被明确表述为"用**精确词汇**降低设计沟通成本"——"Patterns. Record a catalog of common problems in programming and the (relatively few) reasonable approaches to solve them… **Provides a precise vocabulary for design conversations.**"[一手：`https://newsletter.kentbeck.com/p/ideas-ive-contributed-to-in-software`]。**这与 §1.5 的推断方向一致，但不足以替代原书论点。**

### 8.3.3 Refactoring: Ruby Edition

- 本轮**未取得独立来源**，不新增内容。上文 §1.7 的记述（2009，Jay Fields / Shane Harvie）**沿用**。论点 `未核实`。

---

## 8.4 简单设计四原则：第三处版本与"优先级"冲突的完整记录

> 上文 §1.3 已给出 XP 1st ed p.57 与 p.109 两版。本节补**第三处来源**与**优先级口径的冲突**。

### 8.4.1 第三处独立来源（与 §1.3 逐字一致）

[二手：`https://slapdash.codingitwrong.com/josh/simple-design`]，节目标题 "Origin → Authoritative → *Extreme Programming Explained*, 1st edition, **page 57**"：
> "Simple Design — The right design for the software at any given time is the one that
> 1. **Runs all the tests.**
> 2. **Has no duplicated logic. Be wary of hidden duplication like parallel class hierarchies.**
> 3. **States every intention important to the programmers.**
> 4. **Has the fewest possible classes and methods.**
> …**take out any design element that you can without violating rules 1, 2, and 3.**"

该页同时列出另外三个流传版本，供交叉对比：
- **C2 wiki 版**：Passes all the tests / Expresses every idea that we need to express / Says everything **OnceAndOnlyOnce** / Has no superfluous parts。**另有一个替代版**：Runs all the tests / Maximizes Cohesion / Minimizes Coupling / Says everything OnceAndOnlyOnce。
- **Ron Jeffries 版**：Run all the tests / Contain no duplicate code / Express all the ideas the author wants to express / Minimize classes and methods。
- **Alan Shalloway 版（Agile Modeling 邮件列表）**：Runs all the tests / Follows once and only once rule / Has high cohesion (clarity) / Has loose coupling。

### 8.4.2 优先级口径的冲突（记录，不调和）

- Fowler 的表述版：**① Passes the tests → ② Reveals intention → ③ No duplication → ④ Fewest elements**，并称 "**The rules are in priority order**, so 'passes the tests' takes priority over 'reveals intention'"。
- XP 1st ed p.57 的顺序：**① 通过测试 → ② 无重复 → ③ 表达意图 → ④ 最少类与方法**（即"表达意图"排在"无重复"**之后**）。
- Fowler 自己承认这是他自己的再表述（"**I express them like this**"），并指出书中 p.109 还有第三版，他"回忆这是 Kent 写书过程中**改进前**的表述"。
- **Kent 复核了该文但没有更正顺序**，只补充了冲突时的裁决原则。
- → **两个顺序版本并存。** 若 Skill 需要引用，**必须说明"哪一版"**。

### 8.4.3 Kent 对"规则冲突"的裁决（一手，经本人复核）

> "**In the rare case they are in conflict (in tests are the only examples I can recall), empathy wins over some strictly technical metric.**"
[半一手：`https://martinfowler.com/bliki/BeckDesignRules.html`，Fowler 注 4 明确写 "When reviewing this post, Kent said…"]

### 8.4.4 Kent 对"设计有客观好坏"的辩护（一手，经本人复核，全段）

> "At the time there was a lot of 'design is subjective', 'design is a matter of taste' **bullshit** going around. **I disagreed. There are better and worse designs.** These criteria aren't perfect, but they serve to **sort out some of the obvious crap** and (importantly) **you can evaluate them right now**. The real criteria for quality of design, '**minimizes cost (including the cost of delay) and maximizes benefit over the lifetime of the software**,' can only be evaluated **post hoc**, and even then any evaluation will be subject to **a large bag full of cognitive biases**. **The four rules are generally predictive.**"
[同上]

### 8.4.5 Fowler 的两处关键注解（二手，但 Kent 复核过全文）

> "The 'no duplication' is perhaps the **most powerfully subtle** of these rules… Kent expressed it as saying everything should be said '**Once and only Once**.' Many programmers have observed that **the exercise of eliminating duplication is a powerful way to drive out good designs.**"

> "The last rule tells us that anything that doesn't serve the three prior rules should be removed. At the time these rules were formulated there was a lot of design advice around **adding elements to an architecture in order to increase flexibility for future requirements. Ironically the extra complexity of all of these elements usually made the system harder to modify and thus less flexible in practice.**"
→ **这是"反过度工程"的历史注脚，出自 Fowler 之手、Kent 复核过。**

---

## 8.5 第二组真信念（补 §2 之外的 8 条，每条 ≥2 出处）

### 真信念 9｜把大东西切片；"master 比 journeyman 强的标志是一次解决的问题更少"

- 出处 1（一手）："**Slicing.** Take a big project, cut it into thin slices, and rearrange the slices to suit your context. **I can always slice projects finer** and I can always find new permutations of the slices that meet different needs." [`https://newsletter.kentbeck.com/p/mastering-programming`]
- 出处 2（一手）："**One thing at a time.** We're so focused on efficiency that we reduce the number of feedback cycles in an attempt to reduce overhead. This leads to difficult debugging situations **whose expected cost is greater than the cycle overhead we avoided.**" [同上]
- 出处 3（一手）："**The journeyman learns to solve bigger problems by solving more problems at once. The master learns to solve even bigger problems than that by solving fewer problems at once.**" [同上]
- 出处 4（一手）：Twitter 回复 "**the trick is to move slowly very very frequently**" [二手转引：`https://stanislaw.github.io/...`]

### 真信念 10｜"先让改动变容易"有一个前提：**那一步本身可能很难**

- 出处 1（一手）："**Easy changes.** When faced with a hard change, first make it easy (**warning, this may be hard**), then make the easy change." [`https://newsletter.kentbeck.com/p/mastering-programming`]
- 出处 2（一手）：Canon 系列的既定计划——"I expect to continue with Canon JUnit, Canon XP, and **Canon Make-The-Change-Easy**." [`https://newsletter.kentbeck.com/p/canon-3x-exploreexpandextract`]
- 出处 3（二手广泛转引，被 Google 内部 TotT 采用）："'First make the change easy, then make the easy change.' - paraphrased from Kent Beck" [`https://googblogs.com/prefactoring-clear-the-way-for-your-new-feature`]
- 出处 4（一手，两条相邻机制）："**Concentration.** If you need to change several elements, first rearrange the code so the change only needs to happen in one element." / "**Isolation.** If you only need to change a part of an element, extract that part so the whole subelement changes." [同出处 1]

### 真信念 11｜"重复是一个提示，不是命令"（对过早抽象的持续反对）

- 出处 1（一手）："**Mistake: abstracting too soon. Duplication is a hint, not a command.**" [`https://newsletter.kentbeck.com/p/canon-tdd`]
- 出处 2（一手）："**Mistake: refactoring further than necessary for this session.** It feels good to tidy stuff up. It can feel scary to face the next test…" [同上]
- 出处 3（一手）："**Be wary of tidying becoming an end in itself.**" [二手转引：`https://danlebrero.com/2024/08/07/tidy-first-summary/`]
- 出处 4（半一手，白皮书 p.57 第 4 条）："Has the **fewest possible** classes and methods" [`https://martinfowler.com/bliki/BeckDesignRules.html`]
- **⚠️ 关键分寸**：他的批评**不是"少即是好"，而是"时机不对"**。见真信念 12。

### 真信念 12｜设计决策要**尽量可逆**；可逆的东西不值得投入太多去避免犯错

- 出处 1（一手）："There is great value in reviewing, double-checking **irreversible** decisions. The pace should be slow and deliberate. **Most SW design decisions are easily reversible, hence there is little value to avoiding mistakes, hence we shouldn't invest much in doing so.** …**Make decisions reversible.**" [二手转引：`https://danlebrero.com/2024/08/07/tidy-first-summary/`]
- 出处 2（一手）："**Code reviews should distinguish between reversible and irreversible changes, and the investment should be accordingly.**" [同上]
- 出处 3（一手）："I consider **all refactorings reversible. For every extract there is an inline.** I want to master both to give me the greatest number of paths through the design space." [`https://newsletter.kentbeck.com/p/tidy-together-outline`]
- 出处 4（一手）："**Similar→identical→de-duplicate**"、"**Breaking changes—tradeoff space (summary—don't ever break the system)**" [同上]

### 真信念 13｜设计 = 买期权，不是买现金流

- 出处 1（一手）："Software creates value two ways: Today's future cash flows / **Optionality for new cash flows. Software design creates optionality.**" [`https://kentbeck.com/`]
- 出处 2（一手）："The first bill: **optionality**… **Waiting is not laziness. Waiting is holding an asset.**" [`https://newsletter.kentbeck.com/p/the-cost-yagni-was-never-about`]
- 出处 3（一手）：Tidy First? 第 23–28 章整段理论（Structure and Behaviour / Economics: Time Value and Optionality / A Dollar Today > A Dollar Tomorrow / Options / Options Versus Cash Flows / Reversible Structure Changes）[二手 TOC：`https://danlebrero.com/2024/08/07/tidy-first-summary/`]
- 出处 4（一手，演讲主题）："**Software Design Is Option Buying** — The economics of design decisions — when to tidy first and when to ship." [`https://kentbeck.com/`]
- 出处 5（一手，Canon 3X 的对应论证）："**Use infrastructure that doesn't scale if it accelerates experimentation.**" / "**Universal infrastructure is under-constrained, does work it needn't do. That extra work perversely creates risk in the precise situations we need to overcome.**" [`https://newsletter.kentbeck.com/p/explore-then-expand-then-extract`]

### 真信念 14｜反馈有四个可权衡的维度，而不是一个"要不要测"的开关

- 出处 1（一手发言记录）："**_Frequency:_** how rapidly do we want our feedback? **_Fidelity:_** how accurate do we want the red/green signal to be? **_Overhead:_** how much are we prepared to pay? **_Lifespan:_** how long is this software going to be around, which is probability as well as time." [`https://martinfowler.com/articles/is-tdd-dead/`]
- 出处 2（一手发言记录）："We're not in this hangout to agree - **my personal goal is just to understand the set of trade-offs by articulating them to people who are prepared to tear my ideas apart in a constructive way.**" [同上]
- 出处 3（一手，TDD by Example）："**Tests are the Programmer's Stone, transmuting fear into boredom.**" [二手转引带页码]
- 出处 4（一手，绿条上也要留红点）："Kent considered that we should **stipple a few red pixels in the green bar** to remind us of these limitations. '**The on-call is the feedback loop that teaches you what tests you didn't write.**'" [`https://martinfowler.com/articles/is-tdd-dead/`]
- 出处 5（一手）："**As soon as you think you don't make mistakes any more, that's a mistake, and you stop growing.**" [同上]
- 出处 6（一手，2025-12-29 专文）：以 **Doherty Threshold 400ms** 为轴谈"按反馈速度而非完整度评价工具" [`https://newsletter.kentbeck.com/p/the-precious-eyeblink`，本轮仅得摘要，见 `https://kentbeck.com/summaries`]

### 真信念 15｜勇气的前提是诚实：承认自己会错、承认自己焦虑

- 出处 1（一手，使命陈述）："**Safe.** I often feel unsafe in situations where I'm perfectly safe, like a cocktail party. Sometimes I feel safe in situations where I'm acting unsafe, like pushing code that will break the system. **I want my feelings of safety (or unsafety) to match the facts.**" [`https://newsletter.kentbeck.com/about`]
- 出处 2（一手，为何做 JUnit/TDD）："**JUnit**—Does this code work? The answer is a button press away. (I used to press the button 2 or 3 times if *I really* needed reassurance.) **TDD**—Do I know what the code is supposed to do? If I'm under time pressure, how will I know the code works?" [同上]
- 出处 3（二手，其自述）："He describes himself as **chronically anxious** because the more complex the code is, the more he knows it could break. **This was the fuel behind testing and TDD**, which are approaches designed to soothe an anxious mind." [`https://newsletter.pragmaticengineer.com/p/how-kent-beck-shapes-the-software`]
- 出处 4（一手，TDD by Example 前言章节标题即 **Courage**）[二手目录：`https://dokumen.pub/test-driven-development-by-example-0321146530-9780321146533.html`]
- 出处 5（一手，XP 价值观含 Courage）[二手：`https://adamtornhill.com/reviews/xpexplained.htm`、`https://xp123.com/review-extreme-programming-explained-2e`]

### 真信念 16｜"设计"不是艺术，是关系；技术的价值在关系的服务中被兑现

- 出处 1（一手）："**Software design is an exercise in human relationships.** **Superior technical skills & superior grasp of theory is only useful when placed in service of these relationships.**" [`https://newsletter.kentbeck.com/p/tidy-together-outline`]
- 出处 2（一手）："**Ethics of care in software design**"（列为 Theory 段章节）[同上]
- 出处 3（一手，订阅页）："Software design is an exercise in human relationships. So are all the other techniques we use to develop software. **How can we geeks get better at technique as one way of getting better at relationships?**" [`https://newsletter.kentbeck.com/about`]
- 出处 4（一手，三层关系 = 三部曲骨架）：Self → Team → Product [`https://newsletter.kentbeck.com/p/self-team-product`，见上文 §4.4]
- 出处 5（一手，Career Accounting）："**Refactoring is often a collaborative process**, & precise vocabulary smooths collaboration… **Extreme Programming→A social style of team development.**" [`https://newsletter.kentbeck.com/p/ideas-ive-contributed-to-in-software`]

---

## 8.6 术语词典补充

| 术语 | 定义 | 出处 |
|---|---|---|
| **Slicing** | 把大项目切成薄片并重新排列以适配语境；"我总能切得更细" | [一手：`https://newsletter.kentbeck.com/p/mastering-programming`] |
| **One thing at a time** | 减少反馈循环以省开销的做法，其预期代价大于省下的开销 | [一手：同上] |
| **Easy changes** | 遇到难改的改动，先把它变容易（**这一步可能很难**），再做那个容易的改动 | [一手：同上] |
| **Concentration / Isolation** | 需改多个元素时先重排代码使改动只需落在一处；只需改元素一部分时先抽出那部分 | [一手：同上] |
| **Baseline Measurement** | 项目开始时先测量现状，否则你无从知道自己在不在修东西 | [一手：同上] |
| **Call your shot** | 跑代码前先说出你预测会发生什么 | [一手：同上] |
| **80/15/5** | 80% 低风险稳收益 / 15% 相关高风险高收益 / 5% 纯好玩；80% 的活教给下一代 | [一手：同上] |
| **Fun list** | 冒出跑题想法时记下、快速回到正题、到停顿点再回来翻 | [一手：同上] |
| **Feed Ideas** | "想法像受惊的小鸟"；**用数据而不是用自卑去证伪它** | [一手：同上] |
| **Empirical Software Design (ESD)** | "以小的、安全的步子做大尺度的设计改动"，并描述驱动设计的经济/社会/心理/技术四类基本力 | [一手：`https://newsletter.kentbeck.com/p/ideas-ive-contributed-to-in-software`] |
| **Canon 系列** | 2026 年起的文章系列："**no analogies, no persuasion, just the facts**"；已出 Canon TDD、Canon 3X，**计划中的还有 Canon JUnit、Canon XP、Canon Make-The-Change-Easy** | [一手：`https://newsletter.kentbeck.com/p/canon-3x-exploreexpandextract`] |
| **Test List** | TDD 第 1 步：先列出所有期望的行为变体；**这是行为分析，不是实现设计**；"混入实现设计决定"是具名错误 | [一手：`https://newsletter.kentbeck.com/p/canon-tdd`] |
| **Wearing two hats** | 重构与"让测试通过"不能同时做（他要你分两次戴帽子） | [一手：同上] |
| **Test Desiderata** | 测试的 12 项可取性质；性质间**既互相支持也互相干扰**，可用 composability 让"更快"和"更有预测力"同时成立 | [一手：`https://testdesiderata.com/`] |
| **Structure-insensitive / Behavioral** | 改结构不应让测试变红；改行为必须让测试变红。**这是《Tidy First?》二分在测试侧的镜像** | [一手：`https://testdesiderata.com/`；[推断] 镜像关系] |
| **Thinkies** | 约 90 条创意思考习惯；示例：把"因为 Y 不能做 X"改写为"当 Y 不再成立时就能做 X" | [一手：`https://kentbeck.com/`] |
| **Augmented Coding 四原则** | Constrain Context / Preserve Optionality / **Balance Expansion & Contraction** / Maintain Human Judgment | [一手：`https://kentbeck.com/`] |
| **Genie** | 他对 AI 编码助手的昵称（"coding genie"）；"Today's AI assistants **lack taste**" | [一手：`https://kentbeck.com/`、`https://newsletter.kentbeck.com/p/the-cost-yagni-was-never-about`] |
| **"Don't eat the seed corn"** | 他用来批评 AI 吃掉设计可选性的农谚 | [一手：`https://kentbeck.com/`] |
| **Helping geeks feel safe in the world** | 个人使命；把 Patterns / JUnit / TDD / XP 四者统一在"安全感"之下 | [一手：`https://newsletter.kentbeck.com/about`] |
| **"tree shaker, not jelly maker"** | 自评：起事、推起来、走人做下一件；被用来解释"他在 TDD 登顶时就不再推它了" | [二手（含其自述）：`https://newsletter.pragmaticengineer.com/p/how-kent-beck-shapes-the-software`] |
| **Spike** | XP 术语。**Kent 本人对该词的一手表述本轮未取得** | `未核实` |
| **Ratchet** | 多引擎检索零结果 | `未核实`，不建议采用 |
| **Software Development as a Cooperative Game** | **属 Alistair Cockburn，不是 Kent 的** | [二手反证：`https://infoq.com/articles/agile-software-cockburn-book-2ed`] |

---

## 8.7 对外部批评的回应 / 自我反思与立场变化（补齐）

### 8.7.1 "TDD is dead"（DHH / RailsConf 2014）—— 逐集要点

> 材料性质：**Fowler 撰写的会议纪要**，含大量 Kent 直接引语。`https://martinfowler.com/articles/is-tdd-dead/` 分级：**[半一手]**。上文 §5.1 已给框架，本节补细节。

**第 1 集（2014-05-09）TDD 与信心**
- DHH 的三个质疑：TDD 与单元测试定义混乱；**用 mock 驱动架构造成"测试引发的设计损伤"**；红绿重构循环对他从未奏效。
- Kent 讲了 TDD 起源："He began by trying things out in Smalltalk, finding that **TDD worked well for his personality**."
- Kent 的立场：程序员**理应**对代码能工作感到有信心，TDD 是**一种**（不是唯一）达成方式。
- Facebook 黑客松经验："about **half of which he could use TDD and half wasn't suitable**… But in the non-TDD part he still used regression tests and short feedback loops. **He has no problem mixing both styles, it's like playing both classical and jazz.**"
- 关于 mock："he said **he rarely uses them**, he's concerned that those that do often **find refactoring difficult, while he finds testing makes refactoring easier**."

**第 2 集（2014-05-16）测试引发的设计损伤**
- Kent 的比喻："ascribing test-induced damage to TDD was **like driving a car to a bad place and blaming the car for it**."
- DHH 说上了 TDD 这匹马就会被带向某个方向、一测试一步地走向畸形；**Kent 反驳说那是"一次一个*设计决定*"，不是一次一个测试**。
- Kent："the question is **how much are we willing to spend to get how much decoupling** between elements."
- Kent 把 10 行 vs 60 行的差别看作**凝聚性**问题，不是 TDD 问题：**"Something that's hard to test is an indication that you need a design insight."**
- DHH 讥为 "**faith-based TDD**"；Kent 澄清他谈的不是 TDD，而是**软件设计一般**——"**it's not about TDD it's about how to get feedback.**"

**第 3 集（2014-05-20）反馈与 QA**
- 四约束（Frequency / Fidelity / Overhead / Lifespan），见 §8.5 真信念 14。
- Kent 对"完美反馈"的想象："in some ideal world we would have **instant, infallible feedback** about our programming decisions… **every key stroke that I make, if the code is ready to deploy, it would just instantly deploy.**"
- 关于 QA：老式开发/QA 关系是 "**dysfunctional**"；Facebook 无 QA 但程序员承担全部责任；他桌上唯一的 Facebook 纪念品是 "**Nothing at Facebook is somebody else's problem**"。
- **"Kent considered that we should stipple a few red pixels in the green bar"** + "**The on-call is the feedback loop that teaches you what tests you didn't write.**"
- "**As soon as you think you don't make mistakes any more, that's a mistake, and you stop growing.**"
- 他说宁可付**凌晨两点的电话**这个代价来早点发现。

**第 4 集（2014-05-27）测试的代价**
- **"Kent replied 'it depends, and that's going to be the beginning to all of my answers to any question that's interesting'."**
- **"Kent declared that the ratio of lines of test code to lines of production code was a bogus metric."** 反例：Christopher Glaeser 写编译器是 4:1，"because **compilers have lots of coupling**"。
- Kent 引 Herb Derby 的 **delta coverage**：这条测试提供了什么别的测试没提供的覆盖？零增量覆盖的测试该删（除非有沟通用途）。
- 他常写一个系统级测试、实现它、重构一点、然后**把最初那个测试扔掉**："Many people freak out at throwing away tests, but **you should if they don't buy you anything. If the same thing is tested multiple ways, that's coupling, and coupling costs.**"
- 他把 test-first 比作 "**a 4WD-low gear for tricky parts of development**"（一种低速四驱档）。
- 关于"测试 vs 功能代码谁更重要"："**would you rather throw away the code and keep the tests or vice-versa? In different situations you'd answer that question differently.**"
- 他描述最近一次经历："he threw away some production code, **but keeping the tests and reimplementing it**. He really likes that approach as **the tests tell him if the new code is working**."

**第 5 集（2014-06-04）答问与总结**
- Kent 引自己的 **"RIP TDD"**（Facebook note，本轮未取得原文）说明立场；TDD 解决的首要问题是**信心**，其次是**把问题切碎、不必一次解决一般情形**："He's **not prepared to give up on TDD just because it's hard**."
- 他的 TDD 适用判据："**any time he can break off a piece of a problem into a useful abstraction he can use TDD.**"
- 他也会遇到 TDD 不合适的场合，那时 "**command-R is a good way of getting feedback**"，但他希望等到能看见那个"简化对象"的时刻再用 TDD 试。
- 新手的典型缺失：**"When less experienced people do TDD they typically don't refactor enough, leading to sub-optimal designs."**
- 关于教条：他**同意** DHH 对"必须给新人简单直白轰炸式建议"的批评，并说 "**I get suspicious if I can't find arguments against something I'm describing.**"
- 关于方法变味：DHH 说十年演化后需要按重置键；Kent **愿意回到第一性原理**，但**不愿丢掉这十年里"程序员应该能感到自信、能指出进展、能有成效的技术协作"这些期待的进化**："He feels he can be **his whole self at work now** in a way that he couldn't be when he started his career."
- 关于 XP 的预言："**Jim Rumbaugh said you won't recognize what happens to XP in ten years and he was right.**"
- **Kent 承认船底长了藤壶**："Kent appreciates that David has brought attention to **TDD acquiring some barnacles and needs some scraping**."
- **最终表态**："He comes out **firmly contradicting David: TDD isn't dead, but is glad David set fire to it so it could come out like a phoenix.**"

### 8.7.2 Canon TDD（2023）—— 第二次回应"被曲解的 TDD"

见上文 §4.1。三条自我反思：
1. **"I made it as clear as possible in my book. I thought it was clear. Nope. My bad."** —— 承认表达失败。
2. **"If you're going to critique something, critique the actual thing."** / "you're critiquing a **strawman**" —— 主动划定"什么才算批评 TDD"。
3. **"What follows is NOT how *you* should *do* TDD."** —— 拒绝把 Canon 变成戒律。

**同时存在一处双重姿态（记录，不调和）**：他给出极明确的五步"正统"，又说 "**who cares? There's no gold star for following these steps exactly.**"
→ 定义要**严格**，执行要**自由**。**蒸馏 Skill 时必须保留这层张力，只取一面会失真。**

### 8.7.3 白皮书的自我修正（第二版对比）

- 简单设计四原则的**两个版本**并存，Fowler 注："I recall **this was an earlier formulation that Kent improved on** while writing the White Book."[半一手：`https://martinfowler.com/bliki/BeckDesignRules.html`]
- 第二版删/并了第一版的三个实践（**隐喻、重构、编码规范**）——[二手：`https://xp123.com/review-extreme-programming-explained-2e`]
- 第二版新增第五价值观 **Respect**。[同上]
- 第二版把简单设计改为四条**完全不同的**指引：Appropriate for the intended audience / Communicative / Factored / Minimal。[同上]
- 第二版明确反对"XP 会员制"：**"There's not a binary answer to 'Am I doing XP?' … The goal is successful and satisfying relationships and projects, not membership in the XP club."** / **"Change yourself first, then offer the fruit of that to others."**[二手：Bill Wake 书评]

### 8.7.4 对 YAGNI 被误读的回应（2026）

见上文 §4.2。他明确说："**YAGNI is not an excuse to never design as some critics have characterized it.**"
→ 这是**公开重新定义**自己早期口号的证据，也是**对批评者的正面回应**。

### 8.7.5 对"设计是主观的"的回应（2015）

见 §8.4.4。"bullshit" 是他自己的用词。

### 8.7.6 对 Ousterhout《A Philosophy of Software Design》的评价

> "Reading Ousterhout's *A Philosophy of Software Design* & finding it **shallow and dogmatic**."
[一手：`https://newsletter.kentbeck.com/p/welcome-to-tidy-first`]
读者在评论区追问该评语的含义时，Kent 回了一帖（评论区结构可见，**正文本轮未取**）→ 具体理由 `未核实`。

### 8.7.7 生涯级自我反思（2026 访谈，含大量直接引语）

来源：`https://newsletter.pragmaticengineer.com/p/how-kent-beck-shapes-the-software` [二手，含直接引语]

- **被 Apple 解雇**："Kent joined a team building a programming language for kids, but says he was eventually fired because he was in '**punk mode**' and wanted to do things his own way, instead of being a team player."
- **Facebook 的认知冲击（对他信念体系最重的一次冲击）**："At Facebook, Kent found a company that **barely did any form of unit testing**, while running a massive, stable, and fast-growing site. He signed up to teach a TDD class at a hackathon — he wrote the book, after all! The classes either side of his schedule both filled up, but **the TDD class got zero signups, not even a pity one. He made the decision to forget everything he knew and to relearn software engineering as it was at Facebook. In the end, he stayed seven years.**"
- **Dotcom 崩盘与"失去的十年"**："The day before the 9/11 terror attack in 2001, Kent had eight months of consulting work booked at top rates… The next day, everything was canceled, just as big bills fell due. **He burned out into depression and was left unable to program for years, in what was a 'lost decade.'**"
- **"abandoned TDD just as it peaked"（立场变化的旁证，冲突记录）**："It's his defining trait, and may explain his enormous output, and **also why he abandoned TDD just as it peaked**."
  → **与 §8.7.1 结尾"TDD isn't dead"并列记录，不调和。** 一种可能解释是"他停止了 TDD 布道"而非"他放弃了 TDD 实践"，但**本轮无一手证据支持该解释** → `未核实`。
- **对人类侧的迟到承认（长引语）**："This is the biggest cosmic, practical joke ever. As young people, we were promised: 'Okay, here's this computer and once you've completely understand this computer, you'll be fine.' … So I set out the first part of my career just to become the best programmer that I could be… And then you realize: sorry, there's this whole human side. **Your ability to affect change in the world is gated by your ability to communicate with, to soothe, to understand other human beings. And those are exactly the skills that I thought I didn't need to learn!** So I was promised: just understand the computer and you'll be successful. And then someone went 'just kidding, understand people!' And now I was in a position of being **ten years behind**."
- **对 "agile" 一词的持续反对**："Kent objected to the word 'agile' at the time, and **still does today**, since nobody claims they prefer 'rigid' development, and everyone says they're 'agile', even when they're not. **He would've preferred a less spacious term.**"
- **XP 命名是刻意的营销选择**："he coined the new methodology's name by deliberately picking one that **he knew would be unpopular with the tech establishment of the day**."（另见 §1.2 的 "Extreme" 说明）
- **TDD 是被"重新发现"而非"发明"**："As a kid, Kent read one of his father's programming books from the tape-to-tape era… The book's advice was to take a real input tape and **manually type the expected output tape before writing the program**. He read this, didn't understand it, and forgot about it. Years later, Kent built SUnit, and randomly remembered the input-tape trick… **He laughed out loud at this because it seemed like such a stupid idea**… But when he did, **he found his anxiety about programming vanished.**"
- **敏捷宣言的成文过程（含他的具体贡献）**："Kent recalls this summit proceeded badly as everyone pushed contradictory ideas. During a break, Martin Fowler and Jim Highsmith stayed behind, and when the others returned, they found the values written on the whiteboard. **Kent's contribution was the word 'daily'**: 'Business people and developers must work together daily throughout the project.'"
- **健康与能力的公开重构（2026-04-16）**：他公开了帕金森诊断，并提出 "**time value of time**"——当能力确定会衰退时，当下年份的价值指数级高于未来年份。[一手：`https://newsletter.kentbeck.com/p/parkinsons`，本轮仅得摘要，见 `https://kentbeck.com/summaries`]

### 8.7.8 仍然未核实的自我反思方向

- **《I have complicated feelings about TDD》（2022-08-16）全文**：标题/日期/副标 "They're not all good and not all bad" 已由检索快照确认，但**正文不可达**（Substack 重定向失败、`web.archive.org` 非公网 IP、HN 讨论页抓取失败）。→ **这是第五节最大的信息缺口，建议优先补齐。** 检索快照：`https://substack.com/redirect/336287ca-42aa-4b30-86d9-9163285e5a1a`（连接失败）、`https://news.ycombinator.com/item?id=32509268`（抓取失败）
- **"RIP TDD"（Facebook note）原文** —— 未取得。
- **2020 年后他对"过度测试"的立场更新** —— 只拿到 2014 年的版本。`未核实`

---

## 8.8 智识谱系补齐

### 8.8.1 他明确承认的影响（一手）

| 影响源 | Kent 自述 | 出处 |
|---|---|---|
| **Christopher Alexander** | "they pointed me in the direction of Christopher Alexander. I read all of *The Timeless Way of Building* **standing up in the university bookstore** over the course of several months." / "I found a battered old copy of *Notes on the Synthesis of Form* in Powell's. **Alexander's excoriation of methodologists** in the introduction to the second edition **resonated with my biases**… **It seemed everything he didn't like about architects, I didn't like about software engineers.**" | [一手：`https://c2.com/ppr/about/author/kent.html`] |
| **Ward Cunningham** | "**I convinced Ward Cunningham that we were onto something big.**" / "I demoed TDD for **Ward Cunningham at the Austin OOPSLA conference in October 1995**" / 两人共用一本翻烂的 thesaurus 找名字 | [一手：同上；`https://newsletter.kentbeck.com/p/canon-tdd`；二手：Pragmatic Engineer] |
| **Erich Gamma** | JUnit 合写者；列入致谢 | [一手：`https://newsletter.kentbeck.com/p/ideas-ive-contributed-to-in-software`；二手：Wikipedia 镜像] |
| **Ron Jeffries** | "**Clean code that works (Ron Jeffries)** – is the goal of Test-Driven Development"；列入致谢 | [一手原书 preface p.ix，二手转引；一手：Career Accounting] |
| **Martin Fowler** | *Planning XP* 合著者；列入致谢；Tidy Together 的 refactoring 重述以 Fowler 为对照系 | [一手：Career Accounting；`https://newsletter.kentbeck.com/p/tidy-together-outline`] |
| **David Saff / Massimo Arnoldi** | 列入致谢 | [一手：Career Accounting] |
| **Jerry Weinberg** | TDD by Example 的影响图 "inspired by **Gerry Weinberg's *Quality Software Management***" | [二手转引原书：`https://stanislaw.github.io/...`] |
| **Ed Yourdon & Larry Constantine（*Structured Design*）** | "Re-reading Yourdon and Constantine's *Structured Design* & realizing that **the fundamentals of design had been sitting there all along**." / "these pioneers had long ago laid out the equivalent of **Newton's Laws of Motion for software design**" | [一手：`https://newsletter.kentbeck.com/p/welcome-to-tidy-first`、`https://kentbeck.com/`] |
| **Toyota Production System** | 第二版 XP 专章；引 TPS 的"**最大浪费是过量生产的浪费**" | [二手：`https://adamtornhill.com/reviews/xpexplained.htm`] |
| **他的父亲 Douglas Beck** | "**Make it run, make it right, make it fast — Douglas Beck, my Pappy**"；父亲那本磁带机时代的编程书教他"先手工写出期望的输出磁带再写程序" | [一手：`https://kentbeck.com/`；二手转述：Pragmatic Engineer] |
| **Christopher Glaeser**（非作者身份的影响） | "A formative experience for him was watching Christopher Glaeser write a compiler, he had 4 lines of test code for every line of compiler code" | [一手发言记录：`https://martinfowler.com/articles/is-tdd-dead/`] |
| **Jim Rumbaugh**（预言应验） | "**Jim Rumbaugh said you won't recognize what happens to XP in ten years and he was right.**" | [一手发言记录：同上] |
| **Hillside Group 的共同奠基人** | "Grady Booch and I sponsored a workshop… **Ward, Ralph, Jim Coplien, Ken Auer, Hal Hildebrand, Grady, and I** spent three days exploring '**generativity**'… leading to the formation of the Hillside Group." | [一手：`https://c2.com/ppr/about/author/kent.html`] |

### 8.8.2 被他批评或有明确张力的对象（一手）

| 对象 | 原话 | 出处 |
|---|---|---|
| **Ousterhout, *A Philosophy of Software Design*** | "finding it **shallow and dogmatic**" | [一手：`https://newsletter.kentbeck.com/p/welcome-to-tidy-first`] |
| **DHH 的 "TDD is dead"** | 反驳，但致谢："**glad David set fire to it so it could come out like a phoenix**"；承认 TDD "acquired some **barnacles** and needs some **scraping**" | [半一手：`https://martinfowler.com/articles/is-tdd-dead/`] |
| **行数 / 覆盖率 / 测试代码比等度量** | "the ratio of lines of test code to lines of production code was a **bogus metric**" | [半一手：同上] |
| **McKinsey 的开发者生产力度量** | 与 Gergely Orosz 合写反驳文（2023-08-29，Archive 置顶、504 赞） | [一手：`https://newsletter.kentbeck.com/p/measuring-developer-productivity`] |
| **"agile" 这个词本身** | "Calling it 'agile' was an error."；他当时就反对，至今仍反对 | [二手（含发言）：Pragmatic Engineer] |
| **Meta 的口号 "Meta, Metamates, Me"** | "Aside from being **cringy & culty & exploitable**, this is **exactly backward** of how I'm approaching writing about software design." | [一手：`https://newsletter.kentbeck.com/p/self-team-product`，见上文 §4.4] |

### 8.8.3 他影响过的人

- 整个敏捷运动（2001 敏捷宣言 17 位签署人之一）。[二手：Wikipedia 镜像]
- xUnit 家族（SUnit → JUnit / NUnit / RSpec 语法形态）。[二手：Wikipedia 镜像]
- **一处需要小心的分辨**：公众对"TDD 是纪律铁律"的印象，**主要来自 Uncle Bob 一系的传播，而非 Beck 本人**；Beck 本人反复强调 "it depends" 与"没有金星"。**上文 §6.2 已作此分辨，本节确认并强化。**[推断，有一手文本支撑]

### 8.8.4 他推荐过的书 / 概念

- **确证**：*The Timeless Way of Building* 与 *Notes on the Synthesis of Form*（Christopher Alexander）、*Structured Design*（Yourdon & Constantine）。[一手]
- **确证（概念级）**：Herb Derby 的 **delta coverage**、Jerry Weinberg 的 **influence diagrams**（经原书致意）。[二手转引原书]
- **不要把 Ron Jeffries 的 "Books for Coaches" 记成 Kent 的书单** → 该页属 xp123.com 的 Ron Jeffries。[二手反证：`https://xp123.com/books-for-coaches/`]
- **`未核实`**：Kent 是否单独推荐过 Deming / Lean / Tom Gilb / Donald Knuth。**本轮检索无他本人点名的原文，不得写入。**

---

## 8.9 补充来源清单（仅列本轮新增）

### 一手

| # | URL | 内容 |
|---|---|---|
| P-1 | `https://kentbeck.com/` | 首页：使命、Augmented Coding 四原则、演讲主题、"Make it run, make it right, make it fast — Douglas Beck, my Pappy"、Thinkies、咨询原则 |
| P-2 | `https://kentbeck.com/summaries` | 80 篇 newsletter 摘要索引（2021–2026 全篇目） |
| P-3 | `https://newsletter.kentbeck.com/about` | "Helping Geeks Feel Safe in the World" 使命陈述 |
| P-4 | `https://newsletter.kentbeck.com/archive?sort=top` | Substack Archive 置顶列表 |
| P-5 | `https://newsletter.kentbeck.com/p/mastering-programming` | Mastering Programming 全文（Time / Learning / Transcend Logic / Risk 四组，共 17 条） |
| P-6 | `https://newsletter.kentbeck.com/p/canon-3x-exploreexpandextract` | Canon 3X 全文 + Canon 系列计划 |
| P-7 | `https://newsletter.kentbeck.com/p/explore-then-expand-then-extract` | 3X 的 2016 首发重发版 |
| P-8 | `https://newsletter.kentbeck.com/p/ideas-ive-contributed-to-in-software` | A Career Accounting 全文（贡献清单 + 依赖关系图） |
| P-9 | `https://newsletter.kentbeck.com/p/welcome-to-tidy-first` | Tidy First? 起点，含对 Ousterhout 的评语 |
| P-10 | `https://newsletter.kentbeck.com/p/tf-book-outline` | TF? 大纲与 tidyings 定义 |
| P-11 | `https://newsletter.kentbeck.com/p/tidy-together-outline` | Tidy Together? 全书大纲 + Management 主题句 |
| P-12 | `https://c2.com/ppr/about/author/kent.html` | 模式语言作者自述（Alexander / Ward / Hillside Group） |
| P-13 | `https://testdesiderata.com/` | Test Desiderata 12 属性 |
| P-14 | `https://github.com/KentBeck/TestDesiderata` | 仓库元数据（223 stars） |
| P-15 | `https://api.github.com/users/kentbeck/repos` | 53 个公开仓库清单（**无 tidy-first**） |
| P-16 | `https://newsletter.kentbeck.com/p/canon-tdd` | Canon TDD 全文（上文已用，本节补历史段） |
| P-17 | `https://newsletter.kentbeck.com/p/the-cost-yagni-was-never-about` | YAGNI 全文 |
| P-18 | `https://newsletter.kentbeck.com/p/self-team-product` | 三层关系（Self / Team / Product）与座右铭出处 |

### 半一手

| # | URL | 说明 |
|---|---|---|
| H-1 | `https://martinfowler.com/bliki/BeckDesignRules.html` | Fowler 写、**Kent 本人复核并留下两段原话**（"empathy wins"、"design is subjective… bullshit"） |
| H-2 | `https://martinfowler.com/articles/is-tdd-dead/` | 五集对话纪要，含 Kent 大量直接引语 |

### 二手

| # | URL | 用途 |
|---|---|---|
| S-A | `https://stanislaw.github.io/2016-01-25-notes-on-test-driven-development-by-example-by-kent-beck.html` | TDD by Example 逐章摘录，**带原书页码**（§8.2 全部内容） |
| S-B | `https://danlebrero.com/2024/08/07/tidy-first-summary/` | Tidy First? 逐章笔记 + 完整 TOC |
| S-C | `https://slapdash.codingitwrong.com/josh/simple-design` | XP 1st ed p.57 原引 + C2 / Jeffries / Shalloway 三个版本 |
| S-D | `https://newsletter.pragmaticengineer.com/p/how-kent-beck-shapes-the-software` | 2026-07-01 长篇访谈整理，含大量直接引语 |
| S-E | `https://adamtornhill.com/reviews/xpexplained.htm` | XP 2nd ed 书评：价值观→原则→实践、主/从实践、TPS 与 Taylorism |
| S-F | `https://xp123.com/review-extreme-programming-explained-2e` | XP 两版差异，**明确 Respect 为新增价值观** |
| S-G | `https://kiwix.enszfarms.org/content/wikipedia_en_all_maxi_2025-08/Kent_Beck` | Wikipedia 镜像：完整著作目录、论文、履历、TDD 两条规则 |
| S-H | `https://www.informit.com/store/test-driven-development-by-example-9780321146533` | TDD by Example 官方书目页 |
| S-I | `https://dokumen.pub/test-driven-development-by-example-0321146530-9780321146533.html` | TDD by Example 目录（可见 "CHAPTER 3 Preface Courage"） |
| S-J | `https://www.oreilly.com/library/view/tidy-first/9781098151232/` | Tidy First? O'Reilly 官方页 |
| S-K | `https://search.worldcat.org/isbn/9781098151249` | Tidy First? 书目 + 封面推荐语 |
| S-L | `https://academickids.com/encyclopedia/index.php/Extreme_Programming` | XP 1st ed 出版年记作 1999（年份冲突来源） |
| S-M | `https://googblogs.com/prefactoring-clear-the-way-for-your-new-feature` + `https://docs.google.com/document/d/1VVEWCA8YSct4raMepjQNuLlHyZpmKj5FYj-O7-Ufe0E/preview` | "First make the change easy…" 的广泛转引（Google TotT） |
| S-N | `https://infoq.com/articles/agile-software-cockburn-book-2ed` | 反证 "cooperative game" 属 Cockburn |
| S-O | `https://xp123.com/books-for-coaches/` | 反证：该"教练书单"属 Ron Jeffries，不是 Kent |
| S-P | `https://hamvocke.com/blog/tidy-first-review/`、`https://henrikwarne.com/2024/01/10/tidy-first/`、`https://www.workingsoftware.dev/summary-of-tidy-first-book/`、`https://blog.planetargon.com/blog/entries/tidy-first-by-kent-beck-asking-the-right-questions-about-software-change` | Tidy First? 多篇独立书评（交叉验证 tidyings 与"tidy first if…"判据） |
| S-Q | `https://api.github.com/search/repositories?q=tidy-first+in:name` | 34 个同名仓库全属第三方（修正 1 的证据） |
| S-R | `https://newsletter.kentbeck.com/p/measuring-developer-productivity` | 与 Orosz 合写反驳 McKinsey |

### 未使用（黑名单 / 引擎误召回）

- 知乎、微信公众号、百度百科 / 百度知道（**黑名单**，全程未用）
- bing 返回的「KENT 香烟」「健牌」「肯特大学」「香烟网」「烟悦网」等页面（**引擎误召回，与 Kent Beck 无关**，全程弃用）

---

## 8.10 仍然信息不足的方向（诚实标注）

| # | 方向 | 状态 | 说明 |
|---|---|---|---|
| 1 | **《I have complicated feelings about TDD》(2022-08-16) 全文** | **最大缺口** | 标题/日期/副标可证，正文因 Substack 重定向失败 + archive 不可达 + HN 抓取失败而无法取得。**建议下一轮优先补齐** |
| 2 | **"RIP TDD"（Facebook note）原文** | 未取得 | 仅在 Is TDD Dead 第 5 集被提及 |
| 3 | **《TDD by Example》《Tidy First?》《XP Explained》原书正文** | 未取得 | 全部依赖带页码的二手转引或结构完整的第三方复述；**逐字引文的最终校核无法完成** |
| 4 | **《Implementation Patterns》正文论点** | 未取得 | 只有书目（2007/2008 冲突）与样章 PDF 链接 |
| 5 | **《Planning Extreme Programming》正文论点** | 未取得 | 只有书目 |
| 6 | **《Refactoring: Ruby Edition》独立来源** | 未取得 | 上文 §1.7 的记述本轮无法独立复核 |
| 7 | **《Kent Beck's Guide to Better Smalltalk》(1996) 论点** | 未取得 | 只有书目 |
| 8 | **XP 2nd ed 的 12 个实践完整清单** | 未取得 | 只拿到"主实践/从实践"的分类原则与 4–5 个实践名 |
| 9 | **"make it fast" 与 Knuth "premature optimization" 的关联** | **无证据** | 任务书推测的这层关联本轮检索不到任何 Kent 本人的原文。**不得写入 Skill** |
| 10 | **"the only thing that matters is feedback"** | 无证据 | 疑似社区概括，非 Kent 原话。最接近的一手表述见 §8.7.1 第 2 集 |
| 11 | **"TDD is a design technique not a verification technique"** | 无证据 | 未找到 Kent 原话定型表述。可用的最近表述是 Canon TDD 的 "TDD is a programming workflow" 与"Test List 是行为分析、不得混入实现设计" |
| 12 | **"Spike"** | 未取得一手出处 | 不建议在 Skill 中作为 Kent 术语使用 |
| 13 | **"Ratchet"** | 零结果 | 不建议采用 |
| 14 | **Kent 本人发布的推荐书单** | 未取得 | 尤其是 Deming / Lean / Tom Gilb / Knuth 四者**无他本人点名的原文** |
| 15 | **他 2020 年后对"过度测试"的立场更新** | 未取得 | 只拿到 2014 年版本 |
| 16 | **《Tidy First?》章号 15 的标题** | 未取得 | 二手 TOC 中缺失 |
| 17 | **X / Twitter 原推** | 未取得 | `x.com` 需登录；本文件仅通过二手转引使用了两条推文 |

---

## 附二：给下游 Skill 蒸馏的三条判断（标 [推断]）

1. **"小步与反馈"在这套体系里不是两个话题，是一个闭环。** 小步（slicing / one thing at a time / tidyings / tiny test）的唯一目的是把反馈周期压短；反馈（红绿、Doherty 400ms、on-call 的电话、用户每周的反应）的唯一用途是让下一步更小。Canon TDD 给 TDD 定的四条系统目标里第三条写得很清楚——"**The system is ready for the next change.**"
2. **他的"反过度工程"不是"少设计"，而是"别在信息到达前下注"。** 三处独立证据同构：YAGNI 两笔账（2026）、"Don't Jump To Expand / 用不 scale 的基础设施换实验速度"（2016 / 2025）、"Duplication is a hint, not a command"（2023）。**蒸馏时若写成"少做设计"，会直接失真。**
3. **他有一个稳定的双重姿态：定义要严格，执行要自由。** 严格面：Canon 系列、"no analogies, no persuasion, just the facts"、"critique the actual thing"、"forestalling strawmen"。自由面："what follows is NOT how *you* should *do* TDD"、"who cares? There's no gold star"、"it depends, and that's going to be the beginning to all of my answers to any question that's interesting"、四原则冲突时 "empathy wins"。**这两面同时存在且他从不消解；Skill 只取一面必然走样。**

