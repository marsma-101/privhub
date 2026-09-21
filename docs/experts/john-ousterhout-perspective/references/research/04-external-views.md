# 04 · 他者视角：别人如何评价、批评、反驳 John Ousterhout

> 调研对象：John K. Ousterhout（斯坦福 CS 教授；Tcl/Tk 与 Raft 相关作者；《A Philosophy of Software Design》作者）
> 调研目的：收集**外部**对 Ousterhout 本人、其著作、其语言与共识算法工作的评价、批评与反驳，保留矛盾，不替主子下结论。
> 撰写：萧潇（私人助理·情报官）
> 撰写日期：2026 年（检索执行日以抓取记录为准）

---

## 0. 阅读须知：信源分级与引用规则

**可信度标记**（每条均标注）：

| 标记 | 含义 |
|---|---|
| `[一手·当事人]` | Ousterhout 本人或批评者本人的直接书面/音频发言原文 |
| `[一手·对话记录]` | 双方共同署名的公开讨论记录（如 Ousterhout 与 Robert Martin 的对话文档） |
| `[二手·评论]` | 第三方作者、论坛用户的评论、书评、博客 |
| `[推断·萧潇]` | 萧潇基于上述材料做的概括或归纳，**不是任何人的原话** |

**引用规则**：
- 英文引文逐字摘录，单条 ≤ 25 词；超长处以 `[…]` 截断。
- 所有「批评者原话」用引号包裹并注明说话人；**萧潇的概括一律用「萧潇概括：」起头**，与引文严格区分。
- 找不到证据的条目一律写「**未核实**」，不编造评论者姓名与引文。
- 信息源黑名单已遵守：本站未使用知乎、微信公众号、百度百科/百度知道作为来源。

---

## 1. 书评与专业评价（正面 / 保留 / 负面）

### 1.1 正面评价集中在哪里

**「最实用的软件设计书」/「比 Clean Code 更该推荐」这条线是真实存在的，且有不少具名出处。**

- **Johz（Jonathan Frère）2020 年长篇书评**明确主张：应当用 APOSD 取代当时刚被广泛批评的 *Clean Code* 作为推荐书目。
  > "I believe the book we should be recommending is *A Philosophy of Software Design* by John Ousterhout."
  `[二手·评论]` 来源：https://johz.bearblog.dev/book-review-philosophy-software-design/
  他给出的理由值得记录：APOSD 卖的是**原则**而非**规则**，因此比 Clean Code 更不易被误用。
  > "There are no lists of what to do and what not to do, but instead principles to follow, red flags to be aware of […]"
  同文亦称 APOSD 优于 *Design Patterns*、Fowler《Refactoring》与 *Clean Code*，因其「more widely applicable, albeit at the cost of being more abstract and difficult to apply」。

- **Gergely Orosz（The Pragmatic Engineer）2019 年书评**：重点肯定 APOSD 的**可复现性**优势——多数架构书基于一次性的个人经验，而 Ousterhout 每年让多组学生解同一道设计题。
  > "John, on the other hand, had the vantage point of having multiple teams solve the same design problem during a semester […]"
  `[二手·评论]` 来源：https://blog.pragmaticengineer.com/a-philosophy-of-software-design-review/
  他明确推荐第 1–9 章与第 14 章：「deep modules」「layers should remove complexity」「information hiding」是他愿意纳入自己工具箱的概念。

- **HN 用户 recursivedoubts（htmx 作者 Carson Gross 的常用账号，此归属为萧潇的旁证判断）2025-02** 在 Ousterhout–Martin 对话帖下的原始表述（后被 `chillpenguin` 反驳，见 1.4）：
  > "john ousterhout's book is the only book on how to write software that has any actual evidence behind it."
  `[二手·评论]` 来源：https://news.ycombinator.com/item?id=43166823

- **HN 用户 lboasso** 的对比性褒扬：
  > "This book is so much better than overrated books like 'Code Complete' and 'Clean Code' for a fraction of the page count."
  `[二手·评论]` 来源：https://news.ycombinator.com/item?id=17874109

- **HN 用户 verinus / ayoisaiah / ternaroperator** 等的正面反馈集中在两点：注释章节「systematic approach to commenting」（Ousterhout 是「first to lay out a systematic approach」）与「模块要深」这一单一核心概念。`[二手·评论]` 来源：https://news.ycombinator.com/item?id=27687233

- **Matt Kline（HN 用户 svat）**把 APOSD 的「thick classes」建议与 Carmack 的 inlined code 讨论并列引用，属于**中立偏正的引用性认可**。`[二手·评论]` 来源：https://news.ycombinator.com/item?id=19012287

**萧潇概括：正面评价的三大落点**——(a) 短、无教条、以「复杂度 = 认知负担」为单一公理；(b) 结论来自同一道题被反复独立求解的课堂，比其他书更像「准实验」；(c) 对注释/命名给出了系统化立场，不像 Clean Code 那样把「不要注释」当教条。

### 1.2 保留意见：有内容，但「前半本远好于后半本」

这是最**普遍**的一类保留意见，几乎出现在所有长评里，值得单独记录。

- Gergely Orosz 明确只推荐前半本：
  > "I very much recommend the first half of the book — chapters 1-9 and chapter 14 — for all software engineers […]"
  `[二手·评论]` 同上 URL。他把「exceptions 立场」「event-driven programming 立场」「注释章节」列为不完全认同的部分。

- HN 用户 Chris_Newton（同时是 Clean Code 的长期批评者）：
  > "I do think the earlier chapters are better overall than the later ones."
  `[二手·评论]` 来源：https://news.ycombinator.com/item?id=27687598

- HN 用户 bwh2 的具体不满：
  > "I was underwhelmed by A Philosophy of Software Design. The first 100 pages are solid, but the last 70 didn't resonate with me at all."
  并给出书内 p.124 的注释示例 `// Controls cursor blinking: true means the cursor is visible, false means the cursor is not displayed.` 作为「注释过度」的样本。`[二手·评论]` 来源：https://news.ycombinator.com/item?id=26837789

- HN 用户 `_wp_`（2021-06-30）的整段保留意见（关键词：**与当代开发方式脱节**）：
  > "A large part of it is dedicated to commenting practices and seems a bit out of touch with the way software is developed today."
  `[二手·评论]` 来源：https://news.ycombinator.com/item?id=27687225

### 1.3 明确的负面评价

- **HN 用户 arximboldi** 的失望式否定（针对书名与实质不符）：
  > "Outside of the title however, there is no philosophy in this book. Just general typical practical 'good practice' tips […]"
  `[二手·评论]` 来源：https://news.ycombinator.com/item?id=27689684
  *语境*：该评论者自述未读完，期待的是「哲学」而非实践技巧。属**期望落差型**否定，不是技术性反驳。

- **另有一条被广泛传播但本次未能取得原始出处的负面评价未予收录**（本文件坚持「无原文不立条」，故不列出）。

**萧潇概括**：APOSD 在公开讨论里**很少遭到「整体性否定」**；绝大多数负面意见是「后半本（注释 + 软件趋势）价值低 / 与我所在领域的实践不符」，而非「核心主张错误」。真正针对**核心主张**的攻击主要来自 Hillel Wayne（见 2.2）与 Robert Martin（见 2.7）。

### 1.4 「有实证」这一说法本身被反驳（重要矛盾）

- 正面说法（recursivedoubts）：「APOSD 是唯一有实际证据的书」。
- 直接反驳（HN 用户 **chillpenguin**，2025-02-25）：
  > "This is false and hopefully no one takes you seriously when they read that. There are books about empirical methods for software engineering […]"
  并点名 Greg Wilson 的工作，同时承认「Evidence is definitely lacking in our field, but you can find it if you try.」
  `[二手·评论]` 来源：https://news.ycombinator.com/item?id=43167233
- 同帖另有用户引用 Greg Wilson 的 *It will never work in theory* 结项反思，作为「业界对自身实践的实证反省普遍失败」的旁证。`[二手·评论]` 来源：https://news.ycombinator.com/item?id=43172545

**矛盾保留点 #1**：同一本书，同一场 HN 讨论，一方称其「唯一有证据」，另一方称此说「虚假」且另有更具实证传统的作者。双方语境不同（前者指「设计类书籍」，后者指「软件工程实证研究」），但**分歧真实存在**。

### 1.5 未能核实项（诚实登记）

- **Goodreads / Amazon 长评**：本次调研环境无法访问 Goodreads 与 Amazon（抓取失败、域名解析受限）。**Goodreads/Amazon 的具体评论原文未核实**，本文件不含任何来自该两站的引文。
- **Reddit r/programming、r/ExperiencedDevs**：本次环境无法访问 reddit.com（域名解析被拒绝）。仅通过第三方页面**间接**看到 r/programming 讨论的存在（Johz 文中引用了 2020-06 关于 "It's probably time to stop recommending Clean Code" 的 r/programming 帖）。**Reddit 原始评论未核实**。
- Stack Overflow / 播客逐字稿：未检索。

---

## 2. 明确的批评与反驳（重点）

### 2.1 「缺乏实证、是个人经验与轶事」——**存在，但形态比预期微妙**

- **Ousterhout 本人的定位（一手）**：他在书的前言/播客中反复自陈「To be honest, I don't.」；Gergely Orosz 引述了这句。`[二手·评论，转引一手]`
- **HN 用户 arximboldi** 的批评正落在这里：
  > "Just general typical practical 'good practice' tips […] without much empirical nor philosophical discussion for them."
  `[二手·评论]` 来源：https://news.ycombinator.com/item?id=27689684
- **chillpenguin** 的反驳（见 1.4）针对的**不是**「Ousterhout 缺乏实证」，而是「有人宣称他独有实证」这一说法。
- **Johz 的相反判断**（值得并列）：他认为 APOSD 反而有「somewhat scientific, research-based approach」，因为断言背后是同一门课里反复出现的学生项目证据。`[二手·评论]`

**矛盾保留点 #2**：同一事实基础（斯坦福课堂的学生项目），一方读作「唯一的实证来源」，一方读作「仍是经验与轶事」。**这一点必须原样保留，不可调和。**

**萧潇概括**：严格意义上的「Ousterhout 的书没有对照组、没有预注册、没有统计检验，因此不是实证研究」这一批评，本次**未找到权威署名出处**；能找到的是「不够实证」的一般性抱怨（arximboldi）和「所谓实证被夸大」的反驳（chillpenguin）。**「有人批评他缺乏实证」= 已证实（弱形态）；「有具名学者系统论证其方法论不成立」= 未核实。**

### 2.2 「深模块 / 浅模块」标准主观、难以操作——**最有力的技术性批评，来自 Hillel Wayne（Jimmy Koppel）**

这是本调研中**质量最高**的一条批评，且是**具名、长篇、与作者来回讨论过的**。

- 批评者：Jimmy Koppel（博客 Path-Sensitive，blog.pragmaticengineer 等处亦被引用；MIT 博士，方向为程序变换与合成）。原文 2018-10-29。
  `[二手·评论]` 来源：https://www.pathsensitive.com/2018/10/book-review-philosophy-of-software.html

- **核心指控：无法判定，因为「接口」没有客观度量。**
  > "Beautiful, obvious, and impossible to disagree with. Unfortunately, it's also objectively wrong."
  Koppel 追问「interfaces should be shorter than the implementation」如何检验，并指出 Ousterhout 的答案只能是直觉与经验：
  > "To Ousterhout, the interface is just a comment and some discussion […] Intuition and experience are the sole arbiters here."

- **反例一：栈。** Koppel 与 Ousterhout 公开通信中给出栈的实现（30 tokens）与接口（54 tokens，含栈公理），指出按 Ousterhout 的标准，「我们不该用栈」。`[二手·评论，含一手通信内容]`

- **反例二：POSIX 文件 API。** Ousterhout 在书里把 Unix I/O 的五个系统调用称作「a beautiful example of a deep interface」。Koppel 反驳：签名短不等于接口浅；SibylFS 项目为 `open` 写的精确规范超过 3000 词，性质描述用了 200 多行 higher-order logic，而模型实现「a mere 40 lines」。
  > "The POSIX file API is a great example, but not of a deep interface."
  `[二手·评论]`

- **反例三（原则性）**：规格**有时理应**比实现更长，因为规格要抽象、要弱化对模块的假设以便替换（Koppel 的 "imprecision" 论证）。
  > "there are times when it's actually desirable to have a specification more complicated than the code."

- **反例四：复制磁盘的 write（崩溃恢复）。** 恢复过程规格 70 行复杂代码 vs 实现 29 行简单代码。

- **连带批评：缺乏可操作性导致误用。**
  > "Using it, he attacks the common wisdom of making small classes/methods, but doesn't give a way to distinguish when doing so is abstracting something vs. merely adding indirection."

- **Ousterhout 的回应（一手，被 Koppel 引述）**：
  > "You're just talking about the specification, rather than how easy they are to use to write code that works."
  `[一手·当事人，经二手转引]`
  Koppel 不买账：知道 `O_RDONLY` 的含义、知道路径如何解释，本身就属于「会不会用」。

- **Koppel 亦承认书的价值（避免我们扭曲其立场）**：
  > "PoSD is not a flawless book nor especially original, but it is a good one."（Overall Status: Recommend）
  他还特别称赞第 17 章「Designing for Performance」是他读到「expert」的章节，并把自己教的东西与 Ousterhout 的「Define errors out of existence」并列。

**「深/浅模块主观」的另一处佐证（较软）**：HN 用户 verinus 与 bvrmn 的讨论都围绕「small classes / SOLID 是否被 Ousterhout 不公平地否定」展开；Chris_Newton 则替 Ousterhout 辩护说他的论点不是「反对小类」，而是「小的通常浅」这一相关性。`[二手·评论]` 来源：https://news.ycombinator.com/item?id=27687822

**萧潇概括**：这是**唯一一条被完整论证过、且作者本人参与过讨论仍未达成一致**的批评。它把矛头直指 APOSD 的核心概念，而不是边角章节。

### 2.3 注释主张在现实中过时或不可行——**存在，且与「过度」和「过时」两种指控并存**

- **「过度」**：HN 用户 bwh2 的具体样本（见 1.2）。
- **「与今日开发方式脱节」**：HN 用户 `_wp_`（见 1.2）。
- **「替代方案更好」**：Gergely Orosz 主张「a comment is an invitation for refactoring」，并指出他与 Ousterhout 邮件往返后的共识边界：
  > "if there are important ideas that cannot be conveyed through the code, then comments are appropriate for them."
  即：**共识缩小了，但双方仍未在「注释是否应作为一等文档」上达成一致。** `[二手·评论，含一手通信内容]`
- **相反方向的最强支持（必须并列）**：HN 用户 ternaroperator 认为 APOSD 是「first to lay out a systematic approach to commenting」，并把那 35 页称作 "gold"。`[二手·评论]` 来源：https://news.ycombinator.com/item?id=27687233
- **与 Martin 的正面交锋（一手·对话记录）**：Ousterhout 说 Robert Martin 对注释「fundamental disbelief」，Martin 则回击 Ousterhout 的注释为「awful labeled continue」等；Ousterhout 反过来说 Martin 的版本「under-commented」，并称放弃注释是「an abdication of professional responsibility」。`[一手·对话记录]` 来源：https://github.com/johnousterhout/aposd-vs-clean-code/blob/main/README.md

**矛盾保留点 #3**：同一本书的注释章节，被一方视为全书最有价值的原创贡献（ternaroperator、多人），被另一方视为「过时、过度、可用重构替代」（bwh2、`_wp_`、Orosz）。**两种评价都有一手或具名二手来源支撑，必须并列保留。**

### 2.4 例子以 Java/OO 为主，是否不适用于动态语言 / 函数式 / 前端

- **已核实的形态**：**「例子以 OO（Java、偶有 C++）为主」是事实**，由 Johz 记录：
  > "The code in the examples is generally object-oriented (Java and occasional C++), although it generally feels like it could be replaced with most imperative/OO languages without much of an effect."
  `[二手·评论]`
- **同时 Johz 明确反对「函数式读者可以跳过」**：他举「design errors out of existence」（第 10 章）对应 FP 的 make illegal states unrepresentable 为例，认为原则可迁移。`[二手·评论]`
- **Koppel 的补充**：书中第 19 章试图「把原则应用到软件趋势」，但 Koppel 认为该章其实是两页通用单元测试/OOP 建议，「with nary a reference to the rest of the book」——即**原则的可迁移性并未被作者自己成功演示**。`[二手·评论]`
- **以 JavaScript/前端为主体的系统性反驳**：**未核实**。本次未找到知名前端或 FP 作者专门撰文论证 APOSD 不适用。能找到的只是碎片化表态（如 HN `indoorcomic` 反对书中某个「拆分方法」示例），达不到「有人批评其不适用于动态语言/函数式/前端」的证据强度。

**萧潇概括**：**「例子是 Java 为主」= 已证实（且多数评论者认为不影响可迁移性）；「因此不适用于动态/函数式/前端」= 未核实。**

### 2.5 忽视测试驱动开发（TDD）——**证据最扎实的一条，且 Ousterhout 已承认一处事实性错误**

- **Robert Martin 的正式指控（一手·对话记录）**，针对 APOSD 第 19 章 TDD 小节：
  > "you wrote a very short, dismissive, pejorative, and inaccurate section on Test Driven Development."
  他给出 TDD 三定律并指出 Ousterhout 的描述「just wrong」。`[一手·对话记录]` 来源：https://github.com/johnousterhout/aposd-vs-clean-code/blob/main/README.md
- **Ousterhout 的承认（一手）**：
  > "Oops! I plead 'guilty as charged' to inaccurately describing TDD. I will fix this in the next revision of APOSD."
  但他坚持实质反对：TDD「forces developers to work too tactically」，并称 TDD「guarantees that developers will initially write bad code」。`[一手·对话记录]`
- **第三方强化**：HN 用户 Chris_Newton 认为 Ousterhout 对 TDD 的批评「too superficial」；`_wp_` 认为 TDD 那部分「dubious claims」；Gergely Orosz 指出全书测试内容几乎缺席（仅 19.3 一段），并在与 Ousterhout 邮件往返后，Ousterhout 解释为「刻意把测试排除在范围外」。`[二手·评论]`
- **反向意见也存在**：HN 用户 shakezula 认为 Ousterhout 反对「写测试脚手架先行」是全书最好的建议之一：
  > "Instead, Ousterhout recommends designing the interface for the abstraction you're building before you start writing a test harness for it […]"
  `[二手·评论]` 来源：https://news.ycombinator.com/item?id=27694780

**矛盾保留点 #4**：TDD 一节，一方认定「描述失实 + 立场错误」（Martin，且 Ousterhout 承认失实），一方认定「这是全书最有价值的一节」（shakezula）。**必须并列。**

### 2.6 「设计两次」「大量前期设计」与敏捷/快速迭代冲突

- **直接的、具名的一手分歧表述**（Robert Martin 开场即列）：
  > "There are some things I disagree with you on, such as TDD, and Abstraction-First incrementalism […]"
  `[一手·对话记录]`
  即 Martin 把「抽象优先的增量式开发」与 TDD 并列为两大分歧。这也间接说明：**「Ousterhout 倾向先设计抽象再增量」这一读法是 Martin 本人的读法**，不是外人的臆测。
- **与 YAGNI 派（Ron Jeffries）的具体分歧**：**未核实**。本次未找到 Ousterhout 与 Ron Jeffries 之间任何直接往来、引用或点名批评。APOSD 里确有对「不要过早抽象」（KISS/YAGNI 阵营常用口号）的正面回应痕迹——见 Johz 的记录：
  > "Philosophy seems to worry less about the dangers of over-abstraction, and more concerned with how to make sure that the chosen abstraction is a good one."
  `[二手·评论]`
  但这只是**立场对置**，不构成「有人批评他」。**标记：存在立场张力（已证实）；存在点名批评（未核实）。**
- **与「敏捷/快速迭代冲突」的一般化指控**：HN 用户 lstamour 的提醒是较为温和的版本——APOSD「doesn't cover modern Scrum/Agile practices and how development fits in with product design and company goals」，但仍高度推荐。`[二手·评论]` 来源：https://news.ycombinator.com/item?id=27127413

### 2.7 与其他作者的对立（逐条核实）

#### (a) Robert C. Martin（Clean Code）——**已核实，且是本人直接对话，不是旁人转述**

最权威的来源是 **`johnousterhout/aposd-vs-clean-code` 仓库**（Ousterhout 本人主页推荐，2024-09 至 2025-02 的多轮线上与线下讨论整理）。`[一手·对话记录]` 来源：https://github.com/johnousterhout/aposd-vs-clean-code/blob/main/README.md

三条实质性分歧（均为双方原话）：

1. **方法长度**
   - John：Clean Code 的长度建议「so extreme that it encourages programmers to create teeny-tiny methods」，导致 shallow interface 与**纠缠（entanglement）**。
   - Bob 辩护：那些 2–4 行函数出自 1999 年他与 Kent Beck 写的 Sparkle applet，且书 p.13 已声明推荐「might not work for everyone」。
   - 双方最终聚焦到 `PrimeGenerator`（Knuth 1982 literate programming 论文的 Java 转写）。John 判其 8 个微型方法「shallow and entangled」；Bob 承认自己重读时也「struggled with the names and structure」，但反诘 John 的改写同样要付出理解成本：
     > "I had equal 'pain and suffering' interpreting your rewrite (below)."
   - John 的一记硬杀伤（**性能回归**）：Bob 的改写因把一次循环拆成两次，经实测**慢 3–4 倍**。Bob 随后修回并反超。
     > "you were so focused on something that isn't actually all that important […] that you dropped the ball on other issues that really are important."
     `[一手·对话记录]`

2. **注释**：见 2.3。John 的一句总结性原话值得记录：
   > "Clearly you and I live in different universes when it comes to comments."
   `[一手·对话记录]`

3. **TDD**：见 2.5。

**外部对这场辩论的读法**：HN 上 542 条评论，压倒性倾向同情 Ousterhout，但其中相当一部分是**对 Martin 的人身攻击而非技术论证**（例如 "incompetent charlatan"、"He never provided proof of any work experience"）。**这些攻击不构成对 Ousterhout 的批评，也不应被当成对他观点的支持**——`[二手·评论]` 来源：https://news.ycombinator.com/item?id=43166362。亦有中立意见提醒：`jjice` 指出「damn some of these comments are just rude about Uncle Bob」，并说自己虽不喜欢 Clean Code，但认为 Clean Architecture 等书确有价值。`[二手·评论]`

#### (b) Sandi Metz——**未核实为直接对立**

- 可核实的只是**间接关联**：`qntm` 的长文《It's probably time to stop recommending Clean Code》在论证「a little duplication isn't the worst thing in the world」时链接了 Sandi Metz 的 "The Wrong Abstraction"，用来反驳 Clean Code 的 DRY 教条。`[二手·评论]` 来源：https://qntm.org/clean
- **Sandi Metz 本人是否评论过 Ousterhout 或 APOSD：未核实。**
- 萧潇概括（`[推断·萧潇]`）：Metz 的 "duplication is far cheaper than the wrong abstraction" 与 APOSD 的「先设计再抽象」在**结论上有张力**，但本次没有找到任何一方引用另一方的证据，故**不作为对立记录**。

#### (c) Martin Fowler——**未核实为直接对立**

- 间接关联：HN 用户把 Fowler 对 anemic domain model 的批评与「这些作者都在推销特定风格」并置讨论（`[二手·评论]`，https://news.ycombinator.com/item?id=43167689）；Ousterhout 与 Martin 的对话中 John 建议读者参考 Fowler 的 Refactoring。**未找到 Fowler 评论 APOSD 或 Ousterhout 的任何原文。**
- 特别说明：APOSD 引用的 Parnas 信息隐藏思想，与 Fowler 的架构观并非对立面。**本次不记录为对立。**

#### (d) John Carmack——**未核实为直接对立；反而是被并列引用的同源思想**

- **已核实的方向是「同向」**：Koppel 指出 APOSD 第 17 章的「Design around the critical path」与他引用的 Carmack "On Inlined Code"（2014）**相似**。`[二手·评论]`（Koppel 原文链接 http://number-none.com/blow/blog/programming/2014/09/26/carmack-on-inlined-code.html）
- HN 用户 svat 也把 Carmack 的 inlined code 讨论与 Ousterhout 的「thick classes」并置。`[二手·评论]`
- **Carmack 评论过 Ousterhout 吗：未核实。**
- **萧潇概括**：Carmack 与 Ousterhout 在「反对无谓拆分、主张内联/局部性」上同向；在「性能优先级」上 Carmack 明显更激进（见 4.2）。

#### (e) Casey Muratori——**「著名反驳演讲 "Ideology" 是否批评过 Ousterhout？」→ 核实结论：未找到任何证据，标记未核实**

这是任务里点名要求核实的一条，结论必须写清楚：

1. **Muratori 确实是与 Clean Code 对立的核心人物**，有明确一手材料：2023-02-28 文章/视频《"Clean" Code, Horrible Performance》`[一手·当事人]` 来源：https://www.computerenhance.com/p/clean-code-horrible-performance。其核心实验：按 clean code 规则（prefer polymorphism、不要暴露内部、函数要小、DRY）写的 shape 面积求和代码，实测 35 cycles/shape；改用 switch + 扁平结构降到 24；改用查表降到 3.0–3.5，即 **10x**；再加一个属性后差距扩大到 ~15x；再叠加 AVX 后 20–25x。
   > "So out of the five clean code things that actually affect code structure, I would say you have one you might want to think about and four you definitely shouldn't."
2. **Muratori 与 Martin 有正式书面交锋**（`unclebob/cmuratori-discussion` 的 `cleancodeqa.md` 及第二轮 `cleancodeqa-2.md`），Martin 在其中承认：
   > "Frankly, I think that's a fair criticism."（对「你是否把性能的重要性视为理所当然」一问）
   `[一手·对话记录]` 来源：https://github.com/unclebob/cmuratori-discussion/blob/main/cleancodeqa.md
3. **但本次检索未在任何位置找到 Muratori 评价 Ousterhout 或 APOSD 的原话**：
   - HN Algolia 全站检索 `Muratori Ousterhout` 只命中 1 条**第三方**评论（loup-vaillant 说：与其听 Muratori，不如听 Ousterhout……`[二手·评论]` 来源：https://news.ycombinator.com/item?id=38289857）——注意这是**别人把两人对置**，不是 Muratori 本人发言。
   - HN Algolia 检索 `Muratori ideology`、`Casey Muratori talk`、`"Ideology" Muratori talk` 均 0 命中。
   - **因此：「Muratori 在名为 "Ideology" 的演讲中批评过 Ousterhout」这一说法，本次核实为「未找到证据」。** 不排除该演讲存在但不涉及 Ousterhout，或演讲名/内容与任务描述有出入；**在拿到该演讲的原始文字或音频前，不应采信该说法，更不应引用。**

#### (f) YAGNI 派（Ron Jeffries）——**未核实**（见 2.6）

#### (g) 其他可并列的立场参照（非对立，但是可用的对比锚点）

- **Zakirullin 的 "Cognitive load is what matters"** 被 HN 用户指出与 APOSD 的复杂度定义存在**细节偏差**：APOSD 的复杂度是「认知负担 × 变更频率」，而很多引用者只记住前半。`[二手·评论]` 来源：https://news.ycombinator.com/item?id=45081731。这是一个**罕见的、精确到公式层面的外部纠偏**，值得主子留意。
- **Grug Brain Developer（Carson Gross）**被 Ousterhout 本人在书页上列为推荐读物，并注明「with several ideas from APOSD」；同时 HN 上有人质疑 Grug 式「simple 是自明的」这一预设。`[一手·当事人 + 二手·评论]` 来源：https://web.stanford.edu/~ouster/cgi-bin/aposd.php、https://news.ycombinator.com/item?id=38077164

---

## 3. 外部观察到的思维模式（别人怎么总结他）

**均标注为他人（或萧潇）的概括，不是 Ousterhout 自称。**

1. **「从可理解性出发，而不是从性能或优雅出发」**
   - Ousterhout 自己把「复杂性 = 让系统难以理解和修改的东西」作为全书第一公理，并把「信息量」拆成两个问题（开发者要记住多少 / 这些信息是否显而易见）。`[一手·当事人]` 来源：aposd-vs-clean-code README 开场。
   - 第三方总结（Gergely Orosz）：「He says it is a means to fight complexity.」`[二手·评论]`

2. **「重视人而非机器」——有明确原话支持，但注意这是 Robert Martin 说的，不是 Ousterhout**
   - Martin 在对话中把双方共识表述为：要帮助的**不是作者本人**，而是「the programmer who must read and understand the code written by others」。
     > "Programmers spend far more hours reading code than writing code […]"
     `[一手·对话记录，说话人为 Martin]`
   - **重要区分**：这条「重人」表述出自 Martin 之口；Ousterhout 的表述是「复杂度 = 信息量」，是**认知经济学**而非人本宣言。**不要混为一谈。**

3. **「反对过度抽象 / 反对无谓拆分」**
   - Koppel 的观察与批评并存：Ousterhout 攻击「小类/小方法」的常见智慧，但「doesn't give a way to distinguish when doing so is abstracting something vs. merely adding indirection」。`[二手·评论]`
   - Johz 的观察：APOSD 对**过度抽象**的担心少于对**抽象选得对不对**的关心。`[二手·评论]`
   - **矛盾点**：这使他在 YAGNI/KISS 阵营眼中「鼓励抽象」，在 Clean Code 阵营眼中「鼓励长方法」——**两头都不讨好**。`[推断·萧潇]`

4. **「直觉只用来提问，不用来回答」**
   - 这句话是 Ousterhout 自己写在个人主页 *My Favorite Sayings* 上的，并被 HN 单独拎出来讨论（2018-08）。
     > "Use your intuition to ask questions, not to answer them."
     `[一手·当事人]` 来源：https://web.stanford.edu/~ouster/cgi-bin/sayings.php
   - 这是**外部观察与他自我描述高度一致**的一条：Koppel 批评他「intuition 是唯一裁判」，恰恰是在说他没有做到自己这条主张（或者说，他把直觉升格为裁判）。**这是一个尖锐的对照组，建议保留。**

5. **「话语方式：自贬、留余地、承认不知道」**
   - HN 用户 epage：书的「A Philosophy of…」中的「A」意味着「there is more than one」。
     > "It made me more open to reading the book, knowing I wasn't being sold dogma […]"
     `[二手·评论]` 来源：https://news.ycombinator.com/item?id=27689180
   - 这条与 Ousterhout 主页 sayings 中的「The three most powerful words for building credibility are 'I don't know'」一致。`[一手·当事人]`

6. **萧潇概括（`[推断·萧潇]`）**：外部对他的共同画像是「**系统出身的人写设计书**」——他的可信度来自亲手写过 RAMCloud/Log-Structured File System/Tcl/Tk/Raft 这套「大规模、长期、他自己也读得懂」的代码，而不是来自软件工程方法论训练。Koppel 说得很直接：
   > "John's background is in systems rather than in software engineering or programming languages, and he never claims special expertise. But his practitioner cred is immense."
   `[二手·评论]`

---

## 4. 与其他作者的对比（附证据，不作空谈）

### 4.1 概览表

| 对象 | 关系性质 | 证据强度 | 关键证据 |
|---|---|---|---|
| Robert C. Martin | **直接对立（本人对话）** | 最强（双方署名文档） | 方法长度 / 注释 / TDD 三分歧；Ousterhout 承认 TDD 描述失实 |
| Jimmy Koppel (Hillel Wayne 圈层) | **核心概念对立** | 强（长篇 + 公开通信） | deep module 标准不可检验；POSIX `open` 反例 |
| Casey Muratori | **无直接往来（未核实）** | 弱 | 只找到第三方把二人对置的评论 |
| John Carmack | **同向（间接）** | 中 | Koppel 指出第 17 章与 Carmack on Inlined Code 相似 |
| Martin Fowler | **无直接对立（未核实）** | — | 未找到任何一方评论另一方 |
| Sandi Metz | **立场张力（间接）** | 弱 | qntm 用 Metz「the wrong abstraction」批 Clean Code |
| Ron Jeffries / YAGNI | **未核实** | — | 无直接往来证据 |
| Rich Hickey / Dan Abramov / Rob Pike / Alan Kay / Fred Brooks | **见 4.3，多为未核实** | — | 见下 |

### 4.2 Ousterhout vs Carmack vs Muratori：三种「反对拆分」的不同理由

这是**有证据支撑**、且对理解 Ousterhout 定位最有价值的一组对比。`[推断·萧潇，基于上述一手材料]`

- **Carmack（2014, on inlined code）**：反对拆分的主要理由是**可调试性与状态可追踪性**——长函数里状态变化都在眼前。Koppel 说这与 Ousterhout 的 critical path 思路「reminiscent」。
- **Ousterhout**：反对拆分的主要理由是**信息量**——拆分若不减少「读者需要同时装在脑子里的信息」，就只是把信息打散（他用的词是 entanglement/conjoined）。**代价是：他明确反对把优化过早引入设计**（主页 sayings：「the primary design criterion for software should be *simplicity*, not speed」），第 17 章才转向性能。`[一手·当事人]`
- **Muratori**：反对拆分的主要理由是**机器性能**——虚函数、指针追逐、跨 translation unit 让编译器失去视野，实测 10–25x 差距；他在与 Martin 的交锋中明确要求「工作职责是让程序在给定的硬件上跑好」。`[一手·当事人]`
- **三者的关键分歧点**：**是否允许为了性能而牺牲「可读性优先级」**。Ousterhout 与 Muratori 在「不要无谓拆分」上表面同向，在「性能是否应进入设计阶段」上实质性不同——Ousterhout 主张先让它跑起来再测量（"The greatest performance improvement of all is when a system goes from not-working to working"），Muratori 主张性能是架构问题、事后无法补救。
- **注意**：**这是萧潇基于三份一手材料的对置，不是任何一方对另一方的评价。** 引用时请勿写成「Muratori 批评 Ousterhout」。

### 4.3 其余作者：诚实登记为未核实

- **Rich Hickey**（"Simple Made Easy"）：本次**未找到** Hickey 评论 Ousterhout 或 APOSD 的任何材料。二人对「simple vs easy」的用词与 Ousterhout 对「complexity」的定义**可能在术语层面冲突**（Hickey 反对把 simple 与 easy 混用；Ousterhout 全书未采用该区分），但**这是萧潇的术语观察，无任何证据表明双方有过交锋**。`[推断·萧潇]`
- **Dan Abramov**（"Goodbye, Clean Code"）：**未找到** Abramov 评论 Ousterhout 的材料。可核实的只是他的文章被 qntm 引用，用来支撑「a little duplication isn't the worst thing in the world」。`[二手·评论]` 来源：https://qntm.org/clean
- **Rob Pike**：可核实的只有一条**间接同向证据**——Ousterhout 本人在 CS 190 课程页面推荐了 Rob Pike 2023-12 关于 Google 内软件复杂性的博客（"Blog post from Rob Pike on software complexity issues at Google"）。`[一手·当事人]` 来源：https://web.stanford.edu/~ouster/cs190-winter24/
- **Alan Kay**：**未核实**。
- **Fred Brooks**：**未核实**为直接互动。可核实的只是 HN 用户把 *The Mythical Man-Month* 与 APOSD、Löwy 的 *Righting Software* 并列成「同一类必读书」。`[二手·评论]` 来源：https://news.ycombinator.com/item?id=39292548

---

## 5. 斯坦福 CS 190 的教学评价与课程理念的外部描述

### 5.1 课程自述（一手，Ousterhout 官方课程页）

> "This course teaches the art of software design: how to decompose large complex systems into classes that can be implemented and maintained easily. Topics include information hiding, deep classes, API design, managing complexity, error handling, and how to write in-code documentation."
> "The course is taught in a studio format consisting mostly of in-class discussions and code reviews. Course enrollment is limited; you must apply for admission."
`[一手·当事人]` 来源：https://web.stanford.edu/~ouster/cs190-winter24/

**外部评议会注意的两点**：
1. 课程以**代码评审**为核心机制：每个项目组与 Ousterhout 单独开一小时的 code review，要求组员会前读完他逐条写下的 PR 评论，会上逐条讨论标记「Let's discuss」的项。`[一手·当事人]` 来源：https://web.stanford.edu/~ouster/cs190-winter23/review_meeting/
2. 课程参考资料里**同时**放了 Raft 论文与 The Grug Brained Developer（注明「with several ideas from APOSD」）——说明他自己也把课当作**设计思想的试验场**，而非单向灌输。`[一手·当事人]`

### 5.2 外部对课程理念的描述

- **Gergely Orosz** 的判断（本调研中对外部评价课程价值最有力的一条）：
  > "John had the vantage point of having multiple teams solve the same design problem during a semester, with him observing. He also had the luxury of repeating this experiment multiple times."
  他把这称为 APOSD 区别于其他架构书的**repeatability** 优势。`[二手·评论]`
- **Johz** 的描述：「students are expected to design and modify 'a substantial piece of software' in an iterative way」，书中的例子（文本编辑器、HTTP 协议解析器）即来自这些课堂项目。`[二手·评论]`
- **Hillel Wayne/Koppel** 的保留：书中例子「have a somewhat academic feel」，且书中若干断言依赖于学生作业的观察结果（他对此评价为「hit-and-miss」）。`[二手·评论]`

### 5.3 学生反馈

**未核实。** 本次未能取得 CS 190 学生评价的原始来源（Stanford 课程评价系统不可公开访问；未找到公开的学生长评）。**本文件不编造任何「学生说……」的引文。**

---

## 6. Raft 的评价与作者角色（核实结果）

### 6.1 基本事实（用于纠偏常见误传）

- **Raft 的第一作者是 Diego Ongaro**，Ousterhout 是**导师/合作者**（Ongaro 的斯坦福博士论文 *Consensus: Bridging Theory and Practice* 即 Raft）。Raft 论文全称 *In Search of an Understandable Consensus Algorithm*（USENIX ATC 2014）。
- 在 CS 190 页面，Ousterhout 把 **Raft extended paper** 与 **MIT 6.824 学生的 Raft 指南**（thesquareplanet.com）**并列**作为课程材料——即他本人把 Raft 当作**教学用例**。`[一手·当事人]` 来源：https://web.stanford.edu/~ouster/cs190-winter24/
- Ousterhout 的 CS 190 页面还挂着一张 "Raft user study" 时代的产物链接（原 ramcloud.stanford.edu/~ongaro/userstudy/ 现已无法解析；HN 上仍有 2016 年的收录记录）。该用户研究是 Raft「更易理解」这一主张的**原始实证依据**。`[二手·评论]` 来源：https://news.ycombinator.com/item?id=11188611

### 6.2 「Raft 被批评为过于简化/教学化」——**本次未核实到具名的一手批评**

诚实登记本次检索的结果：

- **未找到**任何具名研究者（例如 Paxos 阵营的 Leslie Lamport 一派）公开撰文批评「Raft 过于简化」的可引用原文。
- 能找到的**相关但不是同一件事**的材料：
  - 反对意见多以「替代方案」形态出现，而非「批评 Raft」：例如 *The Minitransaction: An Alternative to Multi-Paxos and Raft*（HN 2014，58 分，13 评论）。`[二手·评论]` 来源：https://news.ycombinator.com/item?id=8025503
  - Raft 的实际工程批评集中在**实现细节**而非「太简单」，例如第 8 节「领导者无法提交先前任期的条目」被公认是学习/实现陷阱（CS 190 页面推荐的 MIT 学生指南正是为此而写）。
  - 关于「Raft 太教学化」的说法常见于口语化讨论，但**本次未能定位到可引用的原始出处**。
- **因此：任何声称「Lamport 一派批评 Raft 过于简化」的表述，本文件不予采信，标记为「未核实」。** 若主子需要这条，建议下一步专门检索 Leslie Lamport 关于 Raft 的邮件列表/博客发言、以及 Ongaro 论文的引用批评（citing criticisms），本次时间不足以完成。

### 6.3 Ousterhout 在 Raft 中的角色如何被评价

- **正面且具体**：Koppel 在书评里把 Ousterhout 的 practitioner cred 列为「creator of the Tcl language and its Tk framework」、「RAMCloud」、「Log-Structured File System」；Raft 通常被列为他的关联成果之一（Tcl wiki 的 John Ousterhout 词条亦单列 "Raft Consensus Algorithm"）。`[二手·评论]` 来源：https://wiki.tcl-lang.org/page/John+Ousterhout
- **HN 用户 imjonse 的一手辩护式表述**（发生在讨论 Martin 是否有工程履历时）：
  > "John Ousterhout is 70 years old and one of the open source pioneers. […] his friendly opponent in this discussion definitely did ship high profile projects."
  `[二手·评论]` 来源：https://news.ycombinator.com/item?id=43168675
- **萧潇概括**：「Ousterhout 抢了 Raft 功劳」这类指控**未找到任何证据**；公开材料中 Raft 一直被归为 Ongaro 的一作、Ousterhout 的合作/指导角色，且他自己在教学中把它当教材用。**这是本调研中少数「预期有争议但实际无争议」的项。**

---

## 7. Tcl 的历史争议：「他的设计哲学的反面教材」吗？

### 7.1 已核实：The Tcl War（1994）是真实事件，且 Ousterhout 本人参与了公开辩论

**档案**：Glenn Vanderburg 整理的 *The Tcl War*（1994-09-25 至 1994-10-18，共 68 封信），含双方原文。`[一手·当事人，经档案]` 来源：https://vanderburg.org/old_pages/Tcl/war/

**Stallman 的原始批评** *Why you should not use Tcl*（1994-09-23），关键段落（逐字，分段引用）：

> "The principal lesson of Emacs is that a language for extensions should not be a mere 'extension language'."

> "Tcl was not designed to be a serious programming language. […] So Tcl doesn't have the capabilities of one."

> "It lacks arrays; it lacks structures from which you can make linked lists. It fakes having numbers, which works, but has to be slow."

> "Tcl is ok for writing small programs, but when you push it beyond that, it becomes insufficient."

> "If Tcl does become the 'standard scripting language', users will curse it for years […]"

> "Please, if you want to use Tk, use it with STk, not with Tcl."
`[一手·当事人]` 来源：https://vanderburg.org/old_pages/Tcl/war/0000.html

**Ousterhout 的回应**（1994-09-26），关键段落：

> "I think that Stallman's objections to Tcl may stem largely from one aspect of Tcl's design that he either doesn't understand or doesn't agree with."

> "This is the proposition that you should use *two* languages for a large software system […]"

> "I didn't design Tcl for building huge programs with 10's or 100's of thousands of lines of Tcl, and I've been pretty surprised that people have used it for huge programs."

> "I don't claim that Tcl is without flaws. […] Others, like the substitution-oriented parser, are inherent in the language."

> "Is the two-language approach really the right one? I still think so, but reasonable people can disagree."

> "The Law says to me that Scheme (or any other Lisp dialect) is probably not the 'right' language: too many people have voted with their feet over the last 30 years."
`[一手·当事人]` 来源：https://vanderburg.org/old_pages/Tcl/war/0009.html

**这场辩论即「Ousterhout 的二分法」（Ousterhout's Dichotomy）的起源**，他本人另一封信中直接给出了二分法定义（`[一手·当事人]` 来源：https://vanderburg.org/old_pages/Tcl/war/0032.html），Tcl Wiki 亦确认：「An early episode was 'The Tcl War' […] to which Ousterhout replied with an articulation of his dichotomy」。`[二手·评论]` 来源：https://wiki.tcl-lang.org/page/Ousterhout%27s+Dichotomy

### 7.2 「一切皆字符串 / 无语法结构」被广泛批评——**已核实**

- Stallman 的批评本质上就是「不是真正的编程语言」（缺数组、缺结构、数字是伪装的）。
- **Tcl Wiki 自己承认**二分法的批评者给它起了贬称：
  > "Some people for this reason declare the underyling premise wrong, so it has picked up names like 'Ousterhout's false dichotomy' and 'Ousterhout's fallacy' over the years."
  `[二手·评论]` 来源：https://wiki.tcl-lang.org/page/Ousterhout%27s+Dichotomy
- **技术性的第三方批评（Tcl War 内）**：
  - Bill Janssen（被引述）称 Tcl「slow and clumsy with offensive syntax」，并列举缺 byte-compilation、缺 internal binary representation 等。`[二手·评论，经引用]` 来源：https://vanderburg.org/old_pages/Tcl/war/0047.html
  - Tom Lord 发起 *Tcl has (has not) got arrays ?!?!?!* 子线程；Adam Sah 写 *Tcl does not support linked lists — technical commentary*。`[一手·当事人，档案标题级证据]` 来源：https://vanderburg.org/old_pages/Tcl/war/
  - Ousterhout 在 Tcl War 中用 `lappend` 的实测（10000 次 append ≈ 2 秒 vs Perl 约 4 秒）反驳「O(1) vs O(n)」的指控——**这是一方当事人用测量回应批评的实例**。`[一手·当事人]` 来源：https://vanderburg.org/old_pages/Tcl/war/0032.html
- **常见的误传需纠正**：Tcl 内部**并不**只以字符串表示代码。HN 用户 `bch` 指出「Tcl does *not* actually internally represent its code only as strings. It byte-compiles.」`[二手·评论]` 来源：https://news.ycombinator.com/item?id=3408617。**因此「Tcl 一切皆字符串」作为对其实现的描述本身就是不准确的批评。**（注：该纠正针对的常见说法——Stallman 1994 年原信用的是「fakes having numbers」，并未使用「everything is a string」这一措辞。）

### 7.3 「Tcl 是否是他设计哲学的反面教材？」——**这是本次调研的关键分歧点，两说并存**

**支持「反面教材」的读法（矛盾面 A）**：
- Ousterhout 自己在 1994 年就承认「I didn't design Tcl for building huge programs」，并承认 substitution-oriented parser 的缺陷「are inherent in the language」。
- Stallman 的核心指控恰是**「scripting language 的定位本身错了」**——而 APOSD 全书立论恰恰是「不要用语言/工具定位来回避设计责任」。
- APOSD 强调「deep modules」「information hiding」，而 Tcl 的批评者指责它缺结构、缺模块系统（Ousterhout 自己也承认「the lack of module support」是待修缺陷）。
- **萧潇概括**：从「设计哲学一致性」角度，Tcl 确实可以被读作他后来主张的**反面案例**——他后来在书里极力反对的东西（用「这只是个脚本语言」为设计缺陷开脱），正是他自己在 1994 年用过的辩护。

**反对「反面教材」的读法（矛盾面 B）**：
- Ousterhout 的立场始终是**自觉的**：他从未宣称 Tcl 是通用语言，而是主张**双语言架构**（C 做数据结构与性能，Tcl 做胶水）。二分法是一个**有意的分工主张**，不是设计事故。
- 他的回应里已经给出了**可检验的判据**：「Ultimately all language issues get settled when users vote with their feet.」——而 Tcl/Tk 在 1990 年代确曾大规模落地（Tcl Wiki 与 Tom Lord 的回顾都记录了 Tcl/Tk 的爆炸式流行）。
- HN 上有相当强的**反向评价**：antirez《Tcl the Misunderstood》（2006）是常被引用的正面重估；HN 用户 `bitwize` 干脆说「The idea that Tcl was a toy came from the 90s and the Tcl Wars […] But to Stallman, anything other than Lisp is pretty much a toy.」`[二手·评论]` 来源：https://news.ycombinator.com/item?id=31131974、https://wiki.tcl-lang.org/page/Tcl+the+Misunderstood
- **Chicken-and-egg 修正**：Ousterhout 在 Tcl War 中就在做**工程性自辩**（lappend 实测、byte-compilation 路线图），说明「二分法」不是事后文过饰非。

**萧潇的结论式登记（`[推断·萧潇]`）**：**「Tcl 是他设计哲学的反面教材」这一说法，是一个可辩护但未获公认的读法。** 本次未找到任何人明确写出「Tcl 是 Ousterhout 自己哲学的反面教材」这句话；把它当成既定事实引用是危险的。**建议主子在对外使用时标注为「一种可能的读法」而非「外部共识」。**

### 7.4 Tcl 争议的余波（对理解他后来写作动机有用）

- HN 用户 `lockhouse` 认为 Tcl 衰落的多因之一是：「Richard Stallman had very strong opinions about Tcl that also did it no favors. This was known as the 'Tcl War.'」`[二手·评论]` 来源：https://news.ycombinator.com/item?id=35990703
- Tom Lord（Guile 作者）的长篇回顾把 Tcl War 视为**直接影响 Guile 项目命运与他自己职业生涯**的事件。`[一手·当事人，经 HN 转载]` 来源：https://news.ycombinator.com/item?id=12027092
- 2008-12，Ousterhout 从 Tcl Core Team 退休。`[二手·评论]` 来源：https://news.ycombinator.com/item?id=399566

---

## 8. 矛盾清单（必须原样保留，不得调和）

| # | 矛盾 | A 方（来源） | B 方（来源） | 语境差异 |
|---|---|---|---|---|
| 1 | APOSD 是否「有实证」 | recursivedoubts：「唯一有实际证据的书」（HN 43166823） | chillpenguin：「This is false」，另有 Greg Wilson 等实证研究者（HN 43167233） | A 指「设计类书」；B 指「软件工程实证研究」。两条都在 HN 同一帖 |
| 2 | 依据斯坦福课堂数据是否算证据 | Johz：接近 scientific / research-based（johz.bearblog.dev） | Koppel：novel parts「hit-and-miss」，断言依赖直觉（pathsensitive.com） | 同为长篇书评，结论相反 |
| 3 | 注释章节的价值 | ternaroperator：「Those 35 pages are gold」，首个系统化注释方法（HN 27687233） | bwh2 / `_wp_` / Gergely Orosz：过度、脱节、可用重构替代（HN 26837789 / 27687225 / blog.pragmaticengineer.com） | 前者看重系统性，后者看重与现行实践的贴合度 |
| 4 | TDD 一节 | Robert Martin：「dismissive, pejorative, and inaccurate」，Ousterhout 承认失实 | shakezula：「some of the best advice in the book」（HN 27694780） | 前者指描述准确性，后者指「先设计接口再写测试」这一实质建议 |
| 5 | 「深模块」是否可用 | Ousterhout 全书核心主张 | Koppel：「objectively wrong」、无法检验、POSIX `open` 反例 | 作者本人参与讨论后仍未达成一致 |
| 6 | **实用 vs 不切实际**（任务点名要求保留的一对） | 「最实用」侧：Johz 称其比 Clean Code 更该被推荐；lboasso 称其以更少篇幅胜过 Code Complete/Clean Code | 「不切实际」侧：`_wp_` 称注释部分「out of touch with the way software is developed today」；arximboldi 称其只是泛泛的好实践 tips；lstamour 提醒它不覆盖 Scrum/Agile 与现代产品协作 | 前者评「设计思想的密度」，后者评「与日常工程流程的贴合度」。**两者可以同时为真**，这正是必须并列的原因 |
| 7 | Ousterhout 与 Carmack/Muratori 是否同阵营 | 表面同向：都反对无谓拆分（Koppel 指出第 17 章与 Carmack 相似） | 实质不同：Ousterhout 主张先简单后测量性能，Muratori 主张性能是架构问题（computerenhance.com） | 需区分「反对拆分」的**理由**，不要混为同一立场 |
| 8 | Tcl 是否其哲学的反面教材 | 可以这样读（他 1994 年用过「它就是脚本语言」式辩护） | 他本人主张这是有意的双语言分工，且 Tcl/Tk 曾大规模成功（antirez、Tcl Wiki） | 本次未找到任何人明确这样写过；标为「一种读法」 |

---

## 9. 未核实清单（诚实登记，供主子决定是否追加调研）

1. Goodreads / Amazon 长评原文 —— **环境不可访问**。
2. Reddit（r/programming、r/ExperiencedDevs）原始评论 —— **环境不可访问**，仅见二手转述。
3. Casey Muratori 是否存在名为 "Ideology" 的演讲、以及其中是否批评 Ousterhout —— **未找到任何证据**。
4. Ron Jeffries / YAGNI 派与 Ousterhout 的直接往来 —— **未找到**。
5. Martin Fowler、Sandi Metz、Rich Hickey、Dan Abramov、Alan Kay、Fred Brooks 对 Ousterhout 的直接评论 —— **均未找到**。
6. 「Ousterhout 缺乏实证」的**具名学术性系统批评** —— 只找到一般性抱怨，未找到系统论证。
7. Raft「过于简化/教学化」的**具名一手批评**，以及 Lamport 一派的公开分歧 —— **未找到**。
8. CS 190 学生评价原文 —— **未找到**。
9. Paxos vs Raft 用户研究的原始数据页 —— 原 URL 已不可解析（仅存 HN 收录记录 https://news.ycombinator.com/item?id=11188611）。
10. Ousterhout 与 Sandi Metz「the wrong abstraction」的正面交锋 —— **未找到**。

---

## 10. 来源总表

### 一手·当事人 / 一手·对话记录（11 处）

| # | 内容 | URL |
|---|---|---|
| 1 | Ousterhout × Robert Martin 完整对话（双方署名，2024-09–2025-02） | https://github.com/johnousterhout/aposd-vs-clean-code/blob/main/README.md |
| 2 | Stallman, *Why you should not use Tcl*（1994-09-23） | https://vanderburg.org/old_pages/Tcl/war/0000.html |
| 3 | Ousterhout, *Re: Why you should not use Tcl*（1994-09-26） | https://vanderburg.org/old_pages/Tcl/war/0009.html |
| 4 | Ousterhout, *Re: Tcl/Lisp/Python: A "User" point of view*（1994-09-29，含 lappend 实测） | https://vanderburg.org/old_pages/Tcl/war/0032.html |
| 5 | The Tcl War 完整档案（68 封，Vanderburg 整理） | https://vanderburg.org/old_pages/Tcl/war/ |
| 6 | Ousterhout, *My Favorite Sayings* | https://web.stanford.edu/~ouster/cgi-bin/sayings.php |
| 7 | Ousterhout, APOSD 官方页面（含第二版变更与推荐读物） | https://web.stanford.edu/~ouster/cgi-bin/aposd.php |
| 8 | Muratori × Martin 书面交锋 `cleancodeqa.md` | https://github.com/unclebob/cmuratori-discussion/blob/main/cleancodeqa.md |
| 9 | Muratori, *"Clean" Code, Horrible Performance*（2023-02-28） | https://www.computerenhance.com/p/clean-code-horrible-performance |
| 10 | CS 190 (Winter 2024) 课程主页 | https://web.stanford.edu/~ouster/cs190-winter24/ |
| 11 | CS 190 code review meeting 说明（Winter 2023） | https://web.stanford.edu/~ouster/cs190-winter23/review_meeting/ |

### 二手·评论（博客 / 论坛 / 维基）

| # | 内容 | URL |
|---|---|---|
| 12 | Jimmy Koppel（Path-Sensitive）APOSD 书评 —— **最重要的批评来源** | https://www.pathsensitive.com/2018/10/book-review-philosophy-of-software.html |
| 13 | Jonathan Frère（Johz）APOSD 书评 —— **最重要的「该推荐它」论证** | https://johz.bearblog.dev/book-review-philosophy-software-design/ |
| 14 | Gergely Orosz, *A Philosophy of Software Design: My Take* | https://blog.pragmaticengineer.com/a-philosophy-of-software-design-review/ |
| 15 | qntm, *It's probably time to stop recommending Clean Code* | https://qntm.org/clean |
| 16 | Tcl Wiki, *Ousterhout's Dichotomy*（含 "false dichotomy"/"fallacy" 说法与 1994 年自述） | https://wiki.tcl-lang.org/page/Ousterhout%27s+Dichotomy |
| 17 | Tcl Wiki, *John Ousterhout* 词条 | https://wiki.tcl-lang.org/page/John+Ousterhout |
| 18 | matklad (Aleksey Kladov), *On Ousterhout's Dichotomy*（2024，Rust 视角的二分法重估） | https://matklad.github.io/2024/10/06/ousterhouts-dichotomy.html |
| 19 | Tcl War 内 Bill Janssen 批评（经 0047 引用） | https://vanderburg.org/old_pages/Tcl/war/0047.html |
| 20 | HN #43166362 · Clean Code vs. A Philosophy Of Software Design（542 评论，2025-02） | https://news.ycombinator.com/item?id=43166362 |
| 21 | HN #27686818 · Book Review: APOSD (2020)（61 评论，2021-06） | https://news.ycombinator.com/item?id=27686818 |
| 22 | HN #42456492 · Ideas from APOSD（134 评论，2024-12） | https://news.ycombinator.com/item?id=42456492 |
| 23 | HN #37975558 · A Philosophy of Software Design（110 评论，2023-10） | https://news.ycombinator.com/item?id=37975558 |
| 24 | HN #34966137 · "Clean" Code, Horrible Performance（907 评论，2023-02） | https://news.ycombinator.com/item?id=34966137 |
| 25 | HN #11188611 · Raft (vs Paxos) user study（2016） | https://news.ycombinator.com/item?id=11188611 |
| 26 | HN #8025503 · The Minitransaction: An Alternative to Multi-Paxos and Raft | https://news.ycombinator.com/item?id=8025503 |
| 27 | HN #43166823 / #43167233 / #43168675 / #43172545（含 recursivedoubts 与 chillpenguin 的交锋） | https://news.ycombinator.com/item?id=43166823 |
| 28 | HN #26837789（bwh2 的注释过度批评） | https://news.ycombinator.com/item?id=26837789 |
| 29 | HN #27687233 / #27687749 / #27694780 / #27687598 / #27687822 / #27689684 / #27689180 | https://news.ycombinator.com/item?id=27687233 |
| 30 | HN #35990703（Tcl 衰落多因） | https://news.ycombinator.com/item?id=35990703 |
| 31 | HN #31131974（bch 纠正「Tcl 全是字符串」的误传） | https://news.ycombinator.com/item?id=31131974 |
| 32 | Tcl Wiki, *Tcl the Misunderstood*（antirez 2006 条目） | https://wiki.tcl-lang.org/page/Tcl+the+Misunderstood |
| 33 | HN #38289857（第三方把 Muratori 与 Ousterhout 对置） | https://news.ycombinator.com/item?id=38289857 |
| 34 | HN #45081731（指出引用者遗漏 APOSD 的「复杂度 = 认知负担 × 变更频率」） | https://news.ycombinator.com/item?id=45081731 |
| 35 | HN #39292548 / #27127413（「不覆盖 Agile/现代协作」的温和保留） | https://news.ycombinator.com/item?id=27127413 |

---

## 11. 一句话总览（给主子的速览）

- **正面主调**：短、无教条、以「复杂度 = 认知负担」为公理、结论来自反复复用的课堂实验；被大量工程师当作「比 Clean Code 更该推荐」的替代品。
- **最重的三条批评**：① Jimmy Koppel 论证「深模块」标准不可检验、并给出 POSIX `open` 与栈的反例；② Robert Martin 指出 APOSD 对 TDD 的描述失实（**Ousterhout 本人承认**），且「抽象优先的增量」与 TDD/敏捷路线冲突；③ 注释章节被判为过度且与当代实践脱节（bwh2、`_wp_`、Orosz），尽管同时被另一批人称为全书最有价值的原创贡献。
- **最尖锐的矛盾**：**「唯一有实证的软件设计书」vs「这说法是假的，实证传统在别处」**——同一条 HN 帖子里，两种判断直接对撞；以及由此派生的「实用的设计思想」vs「与日常工程流程脱节」这一组，二者可同时为真，不可择优调和。
- **两处「预期有争议但实际无争议」**：Raft（Ongaro 一作，Ousterhout 合作/指导角色，未见任何功劳争议）；Carmack 与 Ousterhout 的关系（**同向**，非对立）。
- **一处「预期有争议但证据为零」**：Casey Muratori 的 "Ideology" 演讲批评 Ousterhout —— **本次检索零命中，不应采信**。
