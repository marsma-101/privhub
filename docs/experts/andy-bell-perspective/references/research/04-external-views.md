# 04 · 他者视角与批评

> 调研者：子智能体 04｜调研时间：2026-09-17｜来源数：40（独立信源；含 5 个平台：HN 官方 API、Reddit 归档原文、技术博客/媒体、GitHub API、会议讲者页）

**方法说明**：本文件只记录"别人怎么说他"。凡属 Andy Bell 自述（含他为回应批评而写的文章）一律标注 `[他说的]`；凡属第三方直接评价标注 `[别人说他的]`；凡属调研者从证据推出的判断标注 `[我推断的]`。

**检索受限说明（重要）**：本次调研环境对 `www.reddit.com` / `www.facebook.com` / `en.wikipedia.org` 域名解析被拦（返回非公网 IP），**无法直连 Reddit 页面**。Reddit 原帖与评论通过 PullPush 归档 API（`api.pullpush.io`）取得原文，属**二手归档**，但内容是 Reddit 评论原文逐字，非转述。HN 通过 Algolia 官方 API 取得原文。

---

## 一、别人对他的总体定位与描述

### 1.1 身份与资历（外部来源的描述）

| 描述 | 来源 | 可信度 |
|---|---|---|
| 「designer, front-end developer and the founder of Set Studio and Piccalilli」，英国，从业 15 年以上，服务过 Google、NHS、Harley-Davidson、Oracle、BSkyB、Unilever、V&A 级机构 | [bell.bz/about](https://bell.bz/about/) `[他说的]`；[SmashingConf Freiburg 2022 讲者页](https://smashingconf.com/freiburg-2022/speakers/andy-bell)、[beyond tellerrand Berlin 2025 讲者页](https://beyondtellerrand.com/events/berlin-2025/speakers/andy-bell)、[Front End North 讲者页](https://frontendnorth.com/speakers/andy-bell/) `[别人说他的]` | 高（多个独立会议方独立撰写） |
| 前 Clearleft 背景：他在文章中自引 Clearleft 的"Design Engineering"定义，并在 2020 年以 Clearleft 时期身份谈 Sass/设计令牌 | [bell.bz · I used Tailwind for the U in CUBE CSS](https://bell.bz/i-used-tailwind-for-the-u-in-cube-css-and-i-liked-it/) `[他说的]` | 中（**未找到 Clearleft 官方为他撰写的雇员介绍页**，见第十节缺口） |
| Smashing Podcast 主持人 Drew McLellan 的介绍词：「educator and freelance web designer based in the U.K. … worked with some of the largest organizations in the world … Alongside Heydon Pickering, he's the co-author of Every Layout」 | [Smashing Podcast Ep.19 文字稿](https://www.smashingmagazine.com/2020/06/smashing-podcast-episode-19/) `[别人说他的]` | 高（一手播客文字稿） |
| Google `web.dev/learn/css` 内容作者之一。web.dev 内容负责人 kaycebasques 在 HN 亲口说明分工：「Andy Bell wrote all of the content (and demos, I think). Rachel Andrew edited all the content.」 | [HN 27233652](https://news.ycombinator.com/item?id=27233652) `[别人说他的]` | 高（HN 实名、web.dev 官方人员） |
| 国际 keynote 讲者；CSS-Tricks 作者页、SmashingConf 讲者 | [CSS-Tricks 作者页](https://css-tricks.com/author/andybell/)、[smashingconf.com](https://smashingconf.com/freiburg-2022/speakers/andy-bell/) | 高 |

### 1.2 社区对他的能力评价（正面口径居多）

- HN 用户 qingcharles：「**Andy Bell is absolute top tier when it comes to CSS + HTML**, so when even the best are struggling you know it's starting to get hard out there.」— [HN 46104470](https://news.ycombinator.com/item?id=46104470) `[别人说他的]` 可信度：中（HN 匿名用户主观评价）
- HN 用户 couchand：「Strong recommendation for Every Layout, and any other project from creators Andy Bell and Heydon Pickering… It's really quite elegant!」— [HN 38595104](https://news.ycombinator.com/item?id=38595104)
- HN 用户 t0t4l：「Heydon Pickering and Andy Bell know what they're talking about, and they explain the 'how and why'」— [HN 26953092](https://news.ycombinator.com/item?id=26953092)
- HN 用户 colbyfayock：「Andy Bell is fantastic, great rec」— [HN 24493360](https://news.ycombinator.com/item?id=24493360)
- HN 用户 youngtaff（本次调研中**出现频率最高的正面外部声音**，至少 6 次在 HN 主动推荐他的方法）：「Far better to adopt approaches like those recommended by Andy Bell that dramatically reduces stylesheet size」「There are far better ways of writing CSS than Tailwind… take a look at Stephanie Eckles, Andy Bell and others work on how little CSS you actually need」— [HN 43913461](https://news.ycombinator.com/item?id=43913461)、[HN 37144222](https://news.ycombinator.com/item?id=37144222)

### 1.3 与 Heydon Pickering 的绑定

外部多次把两人并列作为"CUBE/Every Layout 共同体"来推荐（HN 38595104、26953092、35671252；Reddit r/webdev 推荐列表 mzvt8d6）。`[别人说他的]`

---

## 二、对 CUBE CSS 的具体批评（逐条）

> 这是本次调研的核心产出。**共找到 8 条实质批评**，全部有原文出处。按力度排序：1 > 5 > 2 > 3 > 4 > 6 > 6b > 7。

### 批评 1 ★最有力★：文档难读、绕弯、前面不给例子，与他自称的"简单"自相矛盾

2020 年 6 月 CUBE CSS 文章发布后，r/css 讨论帖 `[CUBE CSS - A new CSS methodology]`（17 分，**upvote ratio 仅 0.73**）里最集中的批评是**表达与结构**，不是方法论本身：

| 批评原文 | 提出者 | URL | 是否成立 |
|---|---|---|---|
| 「Same. **I'm four pages in and I haven't seen a single example.** If you're trying to sell me on simplicity but you can't provide an example up front, I'm probably not buying what you're selling.」（+11 分，该帖最高分评论） | u/thatgibbyguy | [r/css/hiktz9 fwh955l](https://www.reddit.com/r/css/comments/hiktz9/cube_css_a_new_css_methodology/fwh955l/) | **成立**。我实测当前 piccalil.li 版文章仍是长铺垫在前（Podcast 文字稿中他本人也承认「I'll write this post that's really long and really detailed」）。这条批评 6 年后仍未失效 |
| 「I read through this for about fifteen minutes and **I'm none the wiser about what is happening here. How is this different to any of the other stuff that's out there?**」（+17 分，**全帖最高分**） | u/fuckmywetsocks | [fwh0t0j](https://www.reddit.com/r/css/comments/hiktz9/cube_css_a_new_css_methodology/fwh0t0j/) | **成立**。"与其他方法论有何不同"这个核心问题，文章开头确实没答 |
| 「It reads like some dry manifesto on the best way to do something. Tailwind took off the way it did because it's incredibly simple with immediate information on how to pick it up and use it. Hopefully the author sees this and adjusts. I'm sure the concept is sound but **my attention span isn't long enough for this**」 | u/fuckmywetsocks | [fwh9d8w](https://www.reddit.com/r/css/comments/hiktz9/cube_css_a_new_css_methodology/fwh9d8w/) | 部分成立（属受众耐受度差异，但"干巴巴的宣言"是具体可复核的文体判断） |
| 「This guy need to be more straightforward. **Hell it's not a academic article, it's supposed to be a simple css methodology**」 | u/chorus_zet4 | [fx6r1o8](https://www.reddit.com/r/css/comments/hiktz9/cube_css_a_new_css_methodology/fx6r1o8/) | 成立（同样指向文体） |
| 「It's painful. We all have that friend who explains board games from the bottom up… **This documentation reads like it is trying to hide something from you.**」 | u/albedoa | [fwhoqsq](https://www.reddit.com/r/css/comments/hiktz9/cube_css_a_new_css_methodology/fwhoqsq/) | 部分成立（"hide something"是主观揣测，但"自底向上讲不通"的结构判断可复核） |

**6 年后的回声**：2026 年 3 月，r/Frontend 用户 iamanoriginalname 在问"有没有能跨大团队扩展的 vanilla CSS 体系"时说：「a lot of the things I found are **very methodology heavy with few working examples, such as SMACSS and CUBE CSS**.」— [r/Frontend/1ratpwj o6mafmq](https://www.reddit.com/r/Frontend/comments/1ratpwj/something_between_tailwind_and_bootstrap/o6mafmq/) `[别人说他的]`
→ **说明这不是一次性的首帖印象问题，而是持续存在的采用障碍。** `[我推断的]`

---

### 批评 2 ★有力★：术语"Composition"被挪用，与业界既有含义冲突；命名服从缩写而非清晰

- u/albedoa：「Also, it took me a minute to realize **he is overloading the term "composition" to mean "layout"**. When many modern frameworks are tackling composition in the sense of building up from elemental pieces, "composition" is effectively a reserved word. **No cost is too high for a pretty acronym though!**」— [fwhoqsq](https://www.reddit.com/r/css/comments/hiktz9/cube_css_a_new_css_methodology/fwhoqsq/) `[别人说他的]`

**是否成立**：**成立且有独立旁证**。2021 年 Mark W. Jacobs 在专文《My Approach to Scaling CSS》里采用了 CUBE，但明确做了替换：「No disrespect to Mr. Bell, whose recent book Every Layout I consider essential, but **I have swapped his term "Composition" for "Components," which I find a bit clearer.**」— [mwja.co](https://mwja.co/css/css-approach/) `[别人说他的]`
→ 两个互不相识的从业者（Reddit 匿名用户 + 独立博客作者）各自独立指出同一个术语问题，这是**较强的旁证**。`[我推断的]`

---

### 批评 3 ★有力★：CUBE 不过是 ITCSS 换名（"换皮"指控确实存在，但方向不是 BEM）

用户提问的五个假设中有一条是"有人说它本质是 BEM 换皮"。**实际查证结果：未找到"BEM 换皮"这种说法**。Reddit 上真正出现的等价指控是**"ITCSS 换名"**：

> 「**It's not. It's just ITCSS (inverted triangle CSS) by a different name.**」— u/Disgruntled__Goat，+5 分 — [fwha5v7](https://www.reddit.com/r/css/comments/hiktz9/cube_css_a_new_css_methodology/fwha5v7/) `[别人说他的]`

**是否成立**：**部分成立**。
- 支持方证据：Frontend Mastery 的《The evolution of scalable CSS》把两者并列，措辞高度雷同：「Similar to ITCSS, it's an influential "meta CSS framework", compatible with various approaches.」— [frontendmastery.com](https://frontendmastery.com/posts/the-evolution-of-scalable-css/) `[别人说他的]`；utilitybend 作者 Brecht De Ruyte 也写「If you've ever seen Andy Bell's CUBE CSS or Harry Roberts' ITCSS, this will look familiar. I'm not strictly following either methodology…」— [utilitybend.com](https://utilitybend.com/blog/under-the-hood-a-closer-look-at-the-css-architecture-behind-the-redesign) `[别人说他的]`
- 反对方证据：CUBE 的 C 与 ITCSS 的 layering 目标不同（CUBE 的 C 是**布局骨架可复用**，ITCSS 是**控制特异性递增**）；且 CUBE 显式提出 Exception 层（data-attribute 状态），ITCSS 无对应物。
- 结论：**"高度重叠、非全等"**。指责者抓到了实质相似处，但也忽略了二者的差别。`[我推断的]`

**另一条相关指控**：「**Isn't cube CSS basically tailwind css?**」— u/Filipsys，+1 — [la9d7s3](https://www.reddit.com/r/css/comments/1doepb1/which_css_naming_convention_do_you_typically_use/la9d7s3/) `[别人说他的]`。这条**不成立**：CUBE 只是把 utility 作为四层之一，且 Bell 本人写有专文说明他只把 Tailwind 当成"utility 生成器"用。但这条指控的存在本身说明：**外行看他，容易把 CUBE 误读为"允许 utility = 类似 Tailwind"**，这是他的对外表达没能防住的误读。`[我推断的]`

---

### 批评 4 ★有力★：class 属性里塞方括号分组是"无意义分隔符"

- u/BoffinBrain（自己读完 CUBE 与 BEM 后写的评估）：「I really *don't* like how CUBE wants people to put **square brackets** or other **meaningless dividers into the class attribute**. If it's not clear which classes are related, then you need to take another look at your naming scheme. Fortunately, you're free to completely ignore this convention and use the other parts of CUBE.」— [r/css/1pv087c nvtmge4](https://www.reddit.com/r/css/comments/1pv087c/half_ranting_half_questions_about_these_css/nvtmge4/) `[别人说他的]`

同帖他还对 Exception 用 data-attribute 提出异见：「I don't agree with CUBE's rationale for **using data attributes in exceptions**, but that's a minor quibble - it's just as easy to set/get these states in JS using an attribute or a class.」— 同上

**是否成立**：**成立**。`class="[ card ] [ section box ] [ bg-case color-primary ]"` 是 CUBE 文档明确推荐的写法（见 [cube.fyi/grouping](https://cube.fyi/grouping.html)），方括号在 HTML 中无语义、仅作人眼分隔。这条批评是技术性的、可复核的。

---

### 批评 5 ★有力，性质不同（方法论之外）★：花 150 英镑买他的课，认为"内容无法用于真实项目"，且他"脱离现代 SPA 的写法"

> 「**I bought this guys course for 150£ solely based on his reputation. The content on his site or his course can't be used effectively in a real world project.** He is also creator of CUBE css methodology and **if you go read its docs you will be even more confused**. He sounds like a smart guy but **he is really out of touch with how modern SPAs are being written.**」
> — u/One-Initiative-3229，评论于 2025-02-14，位于 r/css 讨论帖《CSS nesting: use with caution》下 — 原 permalink [mcmpdtl](https://www.reddit.com/r/css/comments/1iohbnq/css_nesting_use_with_caution/mcmpdtl/) `[别人说他的]`

**证据强度标注**：该评论所在账号后来被删除（PullPush 记录 `was_deleted_later: true`，score 1）。**单条匿名且已删号的差评，不能当作代表性证据**。但它是本次调研中**唯一一条对"教学产品实效性"的负面反馈**，且提出了一个具体可检验的指控（"脱离以组件为中心的现代 SPA 写法"），故如实保留。

**是否成立**：**无法判定**（[存疑]）。反证同时存在：r/Frontend 用户在 2026 年仍主动推荐他的 Complete CSS 课用于解决具体问题（「Recently I came across Andy Bell's Complete CSS course, which emphasises "defensive" CSS to deal with situations like this. You might find it interesting」，+5 分 — [oh9ijk4](https://www.reddit.com/r/Frontend/comments/1sqpo7r/localized_ui_is_basically_the_final_boss_of/oh9ijk4/)）。**两方证据都保留。**

---

### 批评 6：对其具体论证的逐条反驳（技术性，含反问"这是不是稻草人"）

2025 年 2 月 r/css 用户 Miragecraft（+7 分）逐条反驳了 Andy Bell 在《CSS nesting: use with caution》一文中的两个论据：

| 被反驳的 Bell 原话 | 反驳 | 是否成立 |
|---|---|---|
| 「It's one of the primary reasons I eschew Atomic CSS because while working as a freelancer for an agency, I watched their junior developer panic at the prospect of modifying a utility class-ridden component」 | 「That's a rather strange take, Atomic CSS's raison d'être is to let you fearlessly change styles while confident that you won't break things elsewhere. **If a junior developer panics at Atomic CSS, the solution should be reassurance and education rather than "let's throw the whole thing out".** There are certainly legitimate criticisms you can level against Atomic CSS, but this isn't it.」 | **成立**：用一个初级开发者的恐慌情绪来否定一整套方法论，属**以个案情绪代替系统性论据** |
| 「Nesting was a solution to a developer problem, not an end-user problem. **Nesting had no business being a native feature of the browser.**」 | 「That makes no sense, most language features are solution to developer problems… I think **Andy's problem is that he doesn't like the fact that native CSS nesting doesn't behave the same as SASS nesting**, and has its own quirks such as the implied use of `:is()` under the hood.」 | **成立**：这个反驳精准指出 Bell 的立场可能源于**对 Sass 习惯的路径依赖**，而非客观技术判断 |

来源：Miragecraft，[mckdubz](https://www.reddit.com/r/css/comments/1iohbnq/css_nesting_use_with_caution/mckdubz/)、[mckdubz 编辑版](https://www.reddit.com/r/css/comments/1iohbnq/css_nesting_use_with_caution/mckdubz/) `[别人说他的]`

**附注**：有人贴出他的原段落作靶子来反驳他，说明**业内确实有人在直接读他的文章并逐条驳**，而非只是无视。这对"他是否被视为值得反驳的权威"是个正向信号。`[我推断的]`

---

### 批评 6b：r/webdev 首发帖的"跑题式反感"——vote ratio 低，但部分低分与内容无关

同一篇文章同时发在 r/webdev（[hiktzq9](https://www.reddit.com/r/webdev/comments/hiktq9/cube_css_a_new_css_methodology/)，21 分，**upvote ratio 0.78**）。该帖 4 条评论中，**有 2 条是围绕文章中一段被读作"政治表态"的内容互相争吵，与 CSS 方法论无关**：

- u/ShiftyCZ（0 分，controversiality=1）：「"Code is always political" — **No it is fucking not...**」
- u/tetractys_gnosys（1 分）：「**This self-righteous extreme politics is obnoxious.** Be careful, your morning oatmeal might be a sign of white privilege and that div you just created is not politically correct!」

同帖另两条是正面或轻微保留：
- u/tallstructure8：「Saw this a couple weeks ago on css-tricks, it's pretty solid. Some of my projects were getting chunky and this helped cut em down a lot. Idk about the data-attributes for exceptions but that's a pretty minor quibble」（+2）
- u/tetractys_gnosys：「Read through most of the docs, and the article. Very neat idea… I'm a many-years long BEM user」（+2）

**是否成立**：**与 CUBE 方法论无关，但作为"他者反应"确凿存在**。`[我推断的]` r/css 帖 0.73、r/webdev 帖 0.78 的低 vote ratio，**可能部分来自对文章附带立场表述的反感，而非对方法论的否定**——即"CUBE 的社区负面第一印象里，混入了非技术因素"。

**未核实**：被引述的那句原话具体出自何处。我尝试访问 `piccalil.li/blog/code-is-political/` 返回 **404**，未能在当前站点找到对应文章（可能已迁移、改名或删除）。因此**"Andy Bell 主张 code is political"这一点标记为 [未核实]**，仅保留"Reddit 上有人这样反应"这一事实。见第十节缺口 11。

---

### 批评 7 ★最尖锐的一条★：「他缺乏 CSS 知识」——2019 年 Every Layout 发布帖

2019 年 6 月 HN 讨论 Every Layout（[story 20196061](https://news.ycombinator.com/item?id=20196061)）时，用户 codedokode 连续发难：

- 「Poor quality articles. They use flexbox and provide no fallback for older browsers. They could use at least non-responsive layout for desktop resolution for older browsers. **Probably the reason why they didn't do it is lack of knowledge of CSS.**」— [HN 20196387](https://news.ycombinator.com/item?id=20196387) `[别人说他的]`
- 他还批评用 rem 而非 px（「I recommend using pixels for projects that are going to be maintained and developed in the long term」）、批评不用 CSS 变量。

**社区反应（同帖）**：
- chiefalchemist：「**Andy Bell? Lacks CSS knowledge? That's a bit over the top.**」— [HN 20196494](https://news.ycombinator.com/item?id=20196494)
- Tomte 长文反斥 codedokode：「Your insult against front-end developers (in both your comments!) is simply childish, and frankly, **it seems you just have an axe to grind with the author(s)**.」— [HN 20196771](https://news.ycombinator.com/item?id=20196771)
- proyb2 提醒 codedokode 不知道共同作者 Heydon Pickering 是谁 — [HN 20196696](https://news.ycombinator.com/item?id=20196696)

**是否成立**：**基本不成立**（当时的即时反驳与后续 6 年他持续被 Google/web.dev 邀请、被 Smashing 请上讲台，均与"缺乏 CSS 知识"矛盾）。**但值得记录**：这印证了**他早期确实因"不留 fallback / 用新特性 / 用 rem"而被现实主义派视为"从业余角度不懂世事"**——这与"他对现代浏览器能力过度乐观"的长期模式指控是同一个方向。`[我推断的]`

---

## 三、对他的批评（方法论之外：教学、态度、立场）

### 3.1 立场先行？——**查证结果与假设相反，需要修正**

用户提问的假设之一是"有人批评他反 Tailwind 是立场先行"。**查证结果：未找到此类批评。相反，找到的是他反复被指控"反 Tailwind"，而他本人多次澄清，并且他公开承认自己"经常被指控是 Tailwind hater"。**

- `[他说的]`：「**I'm very often accused of being a "Tailwind hater"**, but the reality is that I see flaws in using it for *everything* and people don't like that. I also vehemently dislike how it is marketed… which is often mistaken for "hate" of the whole project.」— [bell.bz](https://bell.bz/i-used-tailwind-for-the-u-in-cube-css-and-i-liked-it/)
- `[他说的]` 同文：「For the record: I think Tailwind is a great framework.」
- `[他说的]` 他明确否认 CUBE 是"正道"：「Let me tell you right now, as the creator of CUBE CSS, that it is **categorically not the right way** to do things.」— [CSS Frameworks, hype and dogmatism](https://piccalil.li/blog/css-frameworks-hype-and-dogmatism/)
- **但他同时承认自己有被'支持者'武器化的问题**：`[他说的]`「My Twitter mentions are filled with "**CUBE CSS is the right way to do things, not X**", as a reply to the same ol' sort of thread.」— 同上

→ **这是他者视角里一个真正值得记的盲点**：`[我推断的]` **CUBE 在社区中的"教条化使用"不是他主张的，但由他而起，且他意识到了却无力控制。** 批评者拿"用 CUBE 的人很教条"来指摘他，与他本人的公开立场是错位的。这是"作者 vs. 追随者"的经典错配。

→ 另外 `[他说的]` 他确实主动向反对阵营索取论据：LinkedIn 帖「I'm looking for articles about why you chose to *not* use semantic CSS and instead chose atomic/css-in-js. I'm not too i[interested]…」— [LinkedIn](https://www.linkedin.com/posts/andy-bell-347971255_im-looking-for-articles-about-why-you-chose-activity-7169052057260257280-2epF)。**这与"立场先行"的指控方向相反。** `[我推断的]`

### 3.2 教学权威性是否受过质疑？

- **未找到**对其 CSS 教学权威性的大规模质疑。唯一一条"教学实效性"负面反馈是第二节批评 5（£150 课程差评，匿名已删号）。
- 反证充分：Google 请他为 `web.dev/learn/css` 写全部内容（[HN 27233652](https://news.ycombinator.com/item?id=27233652)）、Rachel Andrew 担任编辑、Smashing 请他做播客与工作坊、2025 年 Complete CSS 课程上线并有用户主动好评。
- `[我推断的]`：**他的教学权威性基本未被撼动，被挑战的是"方法论的可读性"和"对大型 SPA 场景的适用性"。**

### 3.3 无障碍方面的权威性是否受过质疑？

- **未找到任何对其无障碍资历的直接质疑。** 他持相反方向的声誉：外部把他与 Heydon Pickering（《Inclusive Components》作者）并列推荐；他自己写有《Use transparent borders and outlines to assist with high contrast mode》等无障碍主题文章；HN 用户推荐资源清单时把他放在"现代 CSS 最佳实践"一栏，把无障碍单独归给 W3C/Sara Soueidan（[ksaub1j](https://www.reddit.com/r/tailwindcss/comments/1b0fv9h/my_new_prototype_for_all_the_haters_that_say_all/ksaub1j/)）——即**外部并不把他当作 a11y 权威，也不否定他**。
- `[我推断的]`：他更像"关注 a11y 的 CSS 专家"，而非 a11y 权威。这是定位差异，不是批评。

### 3.4 AI 立场（2025 年后的争议面）

- `[他说的]` CSS-Tricks 作者页签名：「**I am still an AI skeptic.**」；Piccalilli 发布于 2025-08-18 的《Our principles on AI》明确表态。
- `[别人说他的]` 他的文章《Are people's bosses really making them use AI tools?》在 HN 获 125 分 / 104 评论（[HN 45079911](https://news.ycombinator.com/item?id=45079911)），说明其观点有实际影响力。
- **未找到**据此指责他"AI 立场先行/教条"的具体公开批评。`[我推断的]`：这是一个**潜在但尚未成型**的争议面。

### 3.5 ★值得单独记录★：为立场付出商业代价——2025 年"很难的一年"

这是本次调研中**唯一一条"他的立场带来可验证的实际代价"的证据**，且由他本人主动公开：

`[他说的]`「Landing projects for Set Studio has been extremely difficult, especially as **we _won't_ work on product marketing for AI stuff, from a moral standpoint**, but the _vast_ majority of enquiries have been for exactly that. Our reputation is everything, so being associated with that technology… would be a terrible move for the long term. I wouldn't personally be able to sleep knowing I've contributed to all of that, too.」
`[他说的]`「It's taken a lot of pride-swallowing to write this… I'm always transparent — maybe _too_ transparent at times.」
—— 发布于 2025-11-27，[bell.bz/its-been-a-very-hard-year](https://bell.bz/its-been-a-very-hard-year/)

`[别人说他的]` HN 用户 qingcharles 在该帖下的反应，恰好构成了"他者对他处境的评价"：
> 「Andy Bell is absolute top tier when it comes to CSS + HTML, so **when even the best are struggling you know it's starting to get hard out there.**」— [HN 46104470](https://news.ycombinator.com/item?id=46104470)

`[我推断的]`：这一条对"他在社区处于什么位置"的判断很关键——**他不是一个靠方法论变现的 KOL，而是一个拒绝接 AI 营销单、因此真实受损的独立经营者。** 这与"他是否教条"的争论是两件不同的事，但会互相影响外界对他的观感。

---

## 四、与同行路线的差异（别人怎么描述）

### 4.1 与 Adam Wathan（Tailwind）：被描述为"方向相反"，而非"敌对"

- u/fumbzuk：**「It's basically the opposite of Tailwind. Top-down/outside-in instead of bottom-up/inside-out, components emerge from your layout decisions, with Tailwind layouts emerge from your component decisions.」**— [fwimvx7](https://www.reddit.com/r/css/comments/hiktz9/cube_css_a_new_css_methodology/fwimvx7/) `[别人说他的]`
  → 这是本次调研中**对 CUBE 与 Tailwind 差异最精准的一句外部总结**，出自 Reddit 匿名用户，非任何一方自述。
- Frontend Mastery 的路线图把两者放在同一连续谱的两端：OOCSS → SMACSS → BEM → ITCSS → **CUBE** ←→ Atomic CSS → Tailwind，并称 CUBE「works with the global namespace and cascade **rather than trying to work around it**」— [frontendmastery.com](https://frontendmastery.com/posts/the-evolution-of-scalable-css/) `[别人说他的]`
- 实际使用中并非互斥。r/tailwindcss 用户观察：「There are also existing design systems that use tailwind for a part, for reasons, mixed with other methods, **like CUBE css**」— [msuh989](https://www.reddit.com/r/tailwindcss/comments/1koydyw/how_to_get_team_to_get_over_readability_concerns/msuh989/)；HN 用户 jake_robins：「It uses **Tailwind's class generator code** to build a design system but instead of just dumping all the utility classes on you, it lets you actually use vanilla CSS and the cascade. I've found it very scalable」（+11 分）— [lo6z64d](https://www.reddit.com/r/webdev/comments/1flybj8/struggling_with_bootstrap_and_tailwind_is_there_a/lo6z64d/)
- `[别人说他的]` 他也被列为"反 Tailwind 阵营"的代表声音之一：localghost（Sophie Koonin）在链接综述里描述他推荐的文章时说「this post is pretty clearly biased towards semantic CSS **but** I think it's pretty evident from this that bare-bones HTML with "plain old CSS" is a lot more performant」— [localghost.dev](https://localghost.dev/blog/good-links-2024-03-03/)（**注意：她先标了"有偏向"，再说数据本身有说服力——这是一个"承认偏好、但仍认账证据"的中间立场，值得原样保留**）

### 4.2 与 Harry Roberts（ITCSS）：被描述为"看起来一样"

见第二节批评 3。utilitybend、Frontend Mastery 两处独立来源都做了并列类比。`[别人说他的]`

### 4.3 与 Heydon Pickering：被描述为"合著搭档 + 同一套价值观"

外部几乎总是成对提及（HN 38595104、26953092、35671252；Reddit mzvt8d6）。`[别人说他的]`

### 4.4 与 Nicole Sullivan（OOCSS）：CUBE 被明确溯源到她

- Mark W. Jacobs：「Our style of writing CSS draws on a key insight **Nicole Sullivan first theorized with OOCSS** nearly a decade ago.」并且在"CUBE 的优缺点"中把 OOCSS 列为 CUBE 的专业来源之一 — [mwja.co](https://mwja.co/css/css-approach/) `[别人说他的]`
- Bell 本人也主动认账：`[他说的]`「Heck, Nicole Sullivan has been teaching us all to split out CSS like this **since around 2009 with OOCSS**」— [bell.bz](https://bell.bz/i-used-tailwind-for-the-u-in-cube-css-and-i-liked-it/)
- `[我推断的]`：**在"CUBE 是不是原创"这个问题上，外部并未指控他抄 OOCSS**——因为他自己先说了。

### 4.5 与 Vitaly Friedman / Smashing Magazine：**无对立，是合作关系**

- Smashing Magazine 请他做 Podcast Ep.19 专门讲 CUBE CSS（[smashingmagazine.com](https://www.smashingmagazine.com/2020/06/smashing-podcast-episode-19/)），SmashingConf 请他做讲者与"Building A Design System With CSS"工作坊（[smashingconf.com](https://smashingconf.com/online-workshops/workshops/design-system-css-andy-bell)）。
- `[我推断的]`：**未找到 Vitaly Friedman 对他方法论提出批评的任何记录**。用户提问中把 Vitaly Friedman 列为"同行对比"对象，但检索结果显示二者是**平台—作者关系**，不是路线竞争关系。如实标注。

### 4.6 与 Stephanie Eckles / Kevin Powell 等：被描述为"同一推荐清单里的并列推荐人"

HN 与 Reddit 上多条推荐把 Andy Bell、Stephanie Eckles、Kevin Powell、Josh Comeau、Ahmad Shadeed 列在同一份"现代 CSS 学习资源"清单中（HN 37144222、Reddit k67w0ys）。`[别人说他的]`

### 4.7 与 Adam Silver（MaintainableCSS）：并列学习对象，非竞争

r/rails 用户把「MaintainableCSS **by Adam Silver**」与「**Cube CSS by Andy Bells**」列为同时在看的两套方法 — [nsbmk7q](https://www.reddit.com/r/rails/comments/1pdrbc3/vanilla_css_is_all_you_need/nsbmk7q/) `[别人说他的]`

---

## 五、真实采用/弃用案例

### 5.1 采用并公开复盘

| 案例 | 内容 | 来源 | 性质 |
|---|---|---|---|
| **Adam Sedwick**（Discovery Education design systems / a11y advocate），2024-08 | 「The biggest change being **a shift away from strict BEM naming, and the adoption of the ideas from CUBE CSS and Every Layout**.」「In it's time I think BEM served my team and others incredibly well… However, in today's component-based ecosystem and with things like scoped styles, the strict structure of BEM isn't really needed.」**并已向 Discovery Education 团队推动类似做法**。复盘末尾仍有未完成迁移：「Some of the previously existing components still need to be refactored to take advantage of the new CUBE architecture.」 | [blind3y3design.com](https://www.blind3y3design.com/writing/2024/site-redesign-retro/) | **完整采用 + 团队推广 + 迁移未完成**（最接近用户要找的"我们用了 CUBE，然后……"复盘） |
| **Kevin Pennekamp**（Finaps Principal Engineer），2021-04 | 从 ITCSS 转向 CUBE，并**自行改造成框架 Feo**：保留 Layout / Utilities / Blocks，但**明确删掉 Exception 层**：「Although I love the `data-`attributes on HTML tags, **I see them as a part of the blocks**.」 | [dev.to/vyckes](https://dev.to/vyckes/css-methodology-and-architecture-3b34) ／原发于 crinkle.dev | **采用但做了削减式改造** |
| **Mark W. Jacobs**（高级前端工程师 / 顾问） | 「Of all the methodologies developed in recent years for managing CSS at scale, [CUBE CSS] resonates most with my experience of what works.」**但把 Composition 改名 Components** | [mwja.co](https://mwja.co/css/css-approach/) | **采用 + 术语改造** |
| **Harry Cresswell** | 把 CUBE CSS + Utopia 打包成轻量框架 **cu.css** 开源发布，称「To the best of my knowledge, a CSS framework built using CUBE CSS and Utopia doesn't exist」 | [harrycresswell.com](https://harrycresswell.com/writing/introducing-cu-css) | **采用并产品化** |
| **Jeremy Keith**（adactio，Clearleft 联合创始人） | 「I really, really like Andy's approach here: The focus of the methodology is utilising the power of [the cascade]… shipping as little CSS as possible」 | [adactio.com/links/16954](https://adactio.com/links/16954) | **权威人物公开背书**（注意：Jeremy Keith 是 Clearleft 联合创始人，而 Bell 曾在 Clearleft 工作——**存在同源关系，此背书非完全独立** `[我推断的]`） |
| **Reddit 批量采用证言** | 「I have **huge success** using CUBE CSS methodology and **my team also love using it**.」（Kaimaniiii）[nfyv6uq](https://www.reddit.com/r/css/comments/1np4ht8/suggestions_for_a_good_css_methodology/nfyv6uq/)；「I'm currently building a new project at work written with SCSS and CUBE CSS and it might be **my favourite way to write CSS yet**」（thesonglessbird）[ieory36](https://www.reddit.com/r/Frontend/comments/vps406/tailwind_css_or_bootstrap_5/ieory36/)；「I've been using it and in one particular project I managed to **reduce the amount of CSS from more than 1300 lines to barely 800**」（FranciscoMusic，+9）[hi7jax8](https://www.reddit.com/r/css/comments/qgh8nk/any_tips_for_more_maintainable_code/hi7jax8/)；「I use it on my blog and it's been lovely」（jake_robins，+11）[lo6z64d](https://www.reddit.com/r/webdev/comments/1flybj8/struggling_with_bootstrap_and_tailwind_is_there_a/lo6z64d/) | Reddit（PullPush 归档原文） | **零散自述，规模小、无法量化**，但方向一致 |
| **机构级：Google web.dev** | `web.dev/learn/css` 前端与设计系统由 CUBE CSS 驱动 | `[他说的]` [bell.bz](https://bell.bz/i-used-tailwind-for-the-u-in-cube-css-and-i-liked-it/)；第三方转述：「Google's web.dev uses CUBE CSS」— [m9mue1t](https://www.reddit.com/r/css/comments/1i9h0dn/how_do_you_manage_css_for_large_projects_without/m9mue1t/) | 中（**未找到 Google 官方声明**，属他自述 + 第三方转述，见第十节） |

### 5.2 弃用 / 未采用 / 被替换

- **未找到任何"我们用了 CUBE，然后弃用了"的公开复盘。**（明确声明，见第八节）
- 最接近的"半弃用"信号：
  - r/Frontend 用户观察到 **Kevin Powell "uses BEM with CUBE CSS but he is slowly changing using compound selector now"** — [nsbmk7q](https://www.reddit.com/r/rails/comments/1pdrbc3/vanilla_css_is_all_you_need/nsbmk7q/)。**这是"逐步淡化 CUBE 用法"的第三方观察，但仅是单一用户印象，弱证据。**
  - Kevin Pennekamp 的 Feo 框架**去掉了 Exception 层**（见上）。
  - Set Studio 自家 boilerplate 的社区 PR 曾提议**用 sugarcube + DTCG 令牌格式替换 Tailwind**（[cube-boilerplate PR #14/#15](https://github.com/Set-Creative-Studio/cube-boilerplate/pull/14)）——这是**工具层替换，不是方法论弃用**，但显示该 boilerplate 的 utility 层本身可被替换。
- `[我推断的]` **CUBE 的"弃用"之所以难找，很可能因为它足够松散——不满意的人往往是"改它"（改名、砍层、只取局部）而不是"弃它"。** 这既是它的优点（低迁移成本），也是它作为"方法论"难以积累清晰成败判据的原因。

---

## 六、正面的他者评价（同样标注来源）

| 评价 | 来源 | 类型 |
|---|---|---|
| 「Andy Bell is **absolute top tier** when it comes to CSS + HTML」 | [HN 46104470](https://news.ycombinator.com/item?id=46104470) | 能力评价 |
| CUBE「works **with** the global namespace and cascade rather than trying to work around it」「an influential "meta CSS framework", compatible with various approaches」 | [Frontend Mastery](https://frontendmastery.com/posts/the-evolution-of-scalable-css/) | 定位评价 |
| 「It's a middle-ground between everything-in-JS or BEM that throw out the cascade entirely and the free-for-all that can happen if you don't have any structure at all. That makes it **flexible and scalable**.」 | [theAdhocracy](https://theadhocracy.co.uk/note/cube-css) | 方法论评价 |
| 「**CUBE CSS is the most approachable methodology** for developers coming from a utility-first background」（在其方法论对比表中给 CUBE 的 Learning Curve 评为 "Low"，Cascade-Friendly 评为 "Excellent"，唯一双优项） | [dev.to/onsen](https://dev.to/onsen/moving-away-from-tailwind-learning-to-structure-css-704) | 对比评价（**注意：该文为 2026 年发布、疑似 SEO/AI 生成内容，可信度低** `[我推断的]`） |
| 「The docs do a great job explaining the principles. It's a **loose methodology** that is like a mental model for organizing CSS.」 | [Frontend Mastery](https://frontendmastery.com/posts/the-evolution-of-scalable-css/) | 文档评价 |
| Set Studio 的 cube-boilerplate 在 GitHub 上被多人采用，issue 区以"改进建议"为主（如 #3 提出用 Tailwind 层去除未用类获得 7 个 👍、#11 请求开源 license 获 2 个 👍），**零负面 issue** | [cube-boilerplate issues](https://github.com/Set-Creative-Studio/cube-boilerplate/issues) | 采用者行为证据 |
| 「CUBE CSS to the rescue, I guess… **embracing the `Cascading` in CSS instead of working around it, like BEM et al. likes to do.**」 | HN kschiffer [33789256](https://news.ycombinator.com/item?id=33789256)（在"Tailwind is a leaky abstraction"帖下作为替代方案提出） | 方法论评价 |
| 「CUBE CSS (https://cube.fyi) is **at the very least worth a squizz**.」+ 「I have huge success using CUBE CSS methodology」 | Reddit [nfy79ew](https://www.reddit.com/r/css/comments/1np4ht8/suggestions_for_a_good_css_methodology/nfy79ew/) / [nfyv6uq](https://www.reddit.com/r/css/comments/1np4ht8/suggestions_for_a_good_css_methodology/nfyv6uq/) | 使用者证言 |
| 「I'd say, **you won't need anything else** to get your CSS to a very good level」（推荐 buildexcellentwebsit.es） | Reddit redoubledit [ksaub1j](https://www.reddit.com/r/tailwindcss/comments/1b0fv9h/my_new_prototype_for_all_the_haters_that_say_all/ksaub1j/) | 教学评价 |

---

## 七、他在社区的位置评价

`[我推断的，基于以下可复核信号]`

**结论：他是"高声誉的小众意见领袖（respected niche thought leader）"，不是主流权威——但比一般小众意见领袖更靠近权威一侧。**

支持信号：

| 信号 | 证据 | 指向 |
|---|---|---|
| **被主流大厂引用为教学源** | Google 请他为 `web.dev/learn/css` 撰写全部内容（HN 27233652，web.dev 内容负责人亲述）；Rachel Andrew 任编辑 | 靠近权威 |
| **被主流媒体平台接纳** | Smashing Magazine Podcast Ep.19 专集（2020）、SmashingConf 讲者与工作坊、CSS-Tricks 作者 | 靠近权威 |
| **进入主流框架的"对照物"地位** | Frontend Mastery 的 CSS 演化史把 CUBE 与 OOCSS/SMACSS/BEM/ITCSS/Atomic 并列为"6 大影响性架构" | 靠近权威 |
| **HN 热度有限** | CUBE CSS 相关 HN 主帖**绝大多数 0-3 分、0 评论**（如 [story 42519433](https://news.ycombinator.com/item?id=42519433) 3 分 0 评论；[story 35363046](https://news.ycombinator.com/item?id=35363046) 2 分 0 评论）。他在 HN 的**真正爆款是别的话题**：《Date is out, Temporal is in》464 分/204 评论、《Are people's bosses making them use AI tools?》125 分/104 评论、《NaN...》94 分/99 评论 | **远离主流**：HN 关心他的 JS/AI/网络议题，不关心他的 CSS 方法论 |
| **CUBE 讨论量级** | r/css 原帖 17 分；r/webdev 4 分；对比 Tailwind 动辄数百上千分 | 小圈子议题 |
| **在小圈子内是"默认推荐项"** | r/css、r/webdev、r/Frontend、r/sveltejs、r/tailwindcss 上，凡有人问"不用 Tailwind 怎么写 CSS"，CUBE 与 Every Layout 几乎必然出现在前几条回答里 | **小众但稳定的话语权** |

**一句话定位** `[我推断的]`：**CUBE CSS 是"反 Tailwind 阵营"的默认答案，而非整个前端社区的默认答案。Andy Bell 是这个细分领域的头号人物，且这个细分领域被 Google/Shopify 级组织部分采纳。**

**另一个位置信号**：他的影响力更多来自**"CSS 教育者"而非"方法论作者"**身份。Every Layout、Learn CSS、Complete CSS、Piccalilli 的声誉度都高于 CUBE CSS 本身。外部推荐他时，多数推荐的是"学 CSS 的地方"，而非"用 CUBE"。`[我推断的]`

---

## 八、找不到批评的部分（如实声明）

以下项目**经尽力检索后确认未找到公开批评**，不是"没找"，而是"确实没有或极难找到"：

1. **未找到任何"我们用了 CUBE CSS 然后弃用了"的公开复盘/迁移离场记录。**（检索了 Reddit 全站、GitHub issues、dev.to、Hashable、HN、技术博客）
2. **未找到"CUBE 本质是 BEM 换皮"这一说法。** 存在的等价指控是"ITCSS 换名"（见批评 3）。
3. **未找到"他反 Tailwind 是立场先行"的批评。** 事实方向相反：他被指控的是"反 Tailwind"，而他反复澄清并公开索取对立面文章。（见 3.1）
4. **未找到"CUBE 在小项目上过度设计"的批评。** 相反找到的是"对新手太重"的批评（批评 1、5），以及"CUBE 学习曲线低"的正面评价。**这两者不是同一件事**——"对新手重"是文档门槛，"过度设计"是结构冗余，后者未被任何人提出。
5. **未找到任何对其无障碍（a11y）专业性的质疑。**
6. **未找到任何对其 coding 水平的大规模质疑。** 唯一一条（2019 年 codedokode）被同帖多人当场驳斥。
7. **未找到 Clearleft 官方为他撰写的介绍页**（详见第十节）。
8. **未找到任何针对他的行为不端、抄袭、学术不端类指控。** 相反，`[他说的]` 他主动交代 CUBE 的思想来源（OOCSS/Nicole Sullivan、BEM、Jina Anne 的设计令牌、Every Layout），透明度高。
9. **未找到任何关于 CUBE 导致实际生产事故、性能问题、可维护性灾难的具体案例报告。**

> **这九条"未找到"本身是本次调研的重要发现**：**对 Andy Bell 和 CUBE CSS 的批评，几乎全部集中在"表达层"（文档难读、术语命名）与"立场层"（对现代化的乐观、反对 utility-first 的论据是否站得住），而几乎没有落在"结果是坏的"这一层。**

---

## 九、矛盾与未解决之处（原样保留）

| # | 矛盾 | 甲方说法 | 乙方说法 | 备注 |
|---|---|---|---|---|
| 1 | **务实 vs 教条** | 正面方：CUBE 是"loose methodology"（Frontend Mastery）、"middle-ground… flexible and scalable"（theAdhocracy）、"simplicity at its core"（dev.to/vyckes）、"Learning Curve: Low"（dev.to/onsen）。`[他说的]` 他本人反复否认自己教条：「it is categorically not the right way」「if it works, it is right」 | 负面方：文档"reads like some dry manifesto"（fuckmywetsocks）；`[他说的]` **他自己承认**「My Twitter mentions are filled with "CUBE CSS is the right way to do things, not X"」；Reddit 有人反驳他具体论据是"用个案情绪代替系统论据"、"不接受原生 CSS 与 Sass 不同"（Miragecraft，+7） | **矛盾的核心不在他本人，而在"他的追随者"与"他的表达方式"之间。** 他主张务实，但他的长文写法读起来像宣言。两方都保留 |
| 2 | **是"入门友好"还是"门槛高"** | 「CUBE CSS is the most approachable methodology for developers coming from a utility-first background」（dev.to/onsen，Learning Curve "Low"）；「I'm new to frontend and this has been bothering me for a while… this is what I've needed to see for a while」（HobblingCobbler） | 「I'm four pages in and I haven't seen a single example」（+11，全帖最高）；「it's supposed to be a simple css methodology」（要求更直白）；2026 年仍有人说它"方法论重、实例少" | **可能是"读得懂的人觉得简单，读不懂的人觉得它在绕"**——两种体验都真实存在 `[我推断的]`。两方都保留 |
| 3 | **是否原创** | 指控方：「just ITCSS by a different name」（+5）。支持方：Frontend Mastery 把 CUBE 列为并列的独立架构；Kevin Pennekamp 说「It was basically describing how I felt about CSS」 | `[他说的]` 他主动溯源到 OOCSS（2009, Nicole Sullivan）、BEM、Jina Anne 的令牌 | **指控与自述错位**：他从未宣称原创，但批评者仍觉得它与 ITCSS 重叠度太高。**"是否算独立贡献"这个问题未被任何一方解决** |
| 4 | **对现代浏览器的乐观主义** | 他：「browser compatibility is stable and CSS is so much more powerful now, we can trust it to deliver truly stunning designs to everyone by writing it flexibly」 | 2019 年 HN codedokode 批评他"不留 fallback 是因为不懂 CSS"（被驳斥但方向一致）；Miragecraft 认为他对原生 nesting 的排斥源于 Sass 路径依赖 | **这是一个"未解决的技术哲学分歧"**，不是事实争议。两方都保留 |
| 5 | **Clearleft 背书是否独立** | Jeremy Keith（Clearleft 联合创始人）公开赞 CUBE | Bell 曾在 Clearleft 工作，并自引 Clearleft 的 Design Engineering 概念 | `[我推断的]` **该背书存在同源关系，独立性打折**。矛盾原样保留 |
| 6 | **课程质量** | 「Recently I came across Andy Bell's Complete CSS course… You might find it interesting」（+5，2026） | 「I bought this guys course for 150£… can't be used effectively in a real world project」（-anonymous，已删号，2025） | 单条匿名差评 vs 单条匿名好评，**双方证据强度都很低**。两方都保留，不做裁断 |

---

## 十、未核实部分（诚实标注缺口）

| # | 缺口 | 状态 | 影响 |
|---|---|---|---|
| 1 | **Reddit 直连受限** | `www.reddit.com` / `old.reddit.com` 在本机 DNS 解析被拦。所有 Reddit 内容经 PullPush 归档 API 取得原文，**未能在 reddit.com 页面上二次校验当前状态** | 中：内容为评论原文逐字，但分数/vote ratio 为归档时点数值；个别评论后续可能被删（已标注） |
| 2 | **Clearleft 官方介绍页未找到** | 检索到 Clearleft 的 Design Engineering 概念页与他 2020 年的自引，但**未找到 Clearleft 官方"我们的前端开发者 Andy Bell"介绍页** | 低：不影响主要结论，但"雇主角度的背书"这一路证据缺失 |
| 3 | **Clearleft→离开的时间线与原因未核实** | 未找到公开说明他何时、为何离开 Clearleft，以及 Set Studio 的成立时点与他离职的关系 | 中：**可能藏有叙述缺口**（为何离开、是否与理念不合） |
| 4 | **Google/web.dev 是否官方声明采用 CUBE CSS** | 只有他自述 + 一条 Reddit 用户转述（"Google's web.dev uses CUBE CSS"）。**未找到 Google 官方文档或 web.dev 团队声明** | 中：这会影响"他进入主流"这一判断的强度 |
| 5 | **2019 年 HN 那条"lack of knowledge"批评的完整语境** | 已取到原文与同帖反驳，但该帖还有 50448 字节内容未逐字读完（已存档于临时文件）；可能存在其他角度的批评未提取 | 低：主批评已取到且被反驳 |
| 6 | **r/css 原帖的 13 条评论已全部取到**；r/webdev 同帖（hiktq9，4 条评论）**未取到** | 未提取 | 低 |
| 7 | **Dave Rupert / Chris Coyier / Lea Verou / Rachel Andrew 等一线人物对他方法论的直接评价** | 未找到直接批评或旗帜鲜明的对比评价。找到的是 Rachel Andrew 作为 Learn CSS 编辑的合作关系、Chris Coyier 的 CSS-Tricks 平台关系 | 中：**缺"同侪层"的评价**，本次调研的同侪声音主要来自匿名 HN/Reddit 用户 |
| 8 | **State of CSS 调查中 CUBE 的使用率/满意度数据** | 已尝试 [2020.stateofcss.com/technologies/methodologies](https://2020.stateofcss.com/en-US/technologies/methodologies/) 与 [Trend Report](https://2020.stateofcss.com/en-US/report/)，但**该站图表为 JS 动态渲染，抓取到的文本中没有针对 CUBE / ITCSS / BEM 的具体百分比**。仅有线索：**"Technologies with less than 10% awareness not included"**（认知度低于 10% 的技术不列出） | 中：**这是最有希望量化"小众 vs 主流"的硬数据，仍未取到**。线索暗示该调查的收录门槛为 10% 认知度 |
| 9 | **r/webdev 帖子 hiktzq9 内容** | ✅ **已补齐**：21 分，ratio 0.78，4 条评论（2 条正面/轻度保留，2 条围绕"政治表态"争吵）。见第二节批评 6b | — |
| 10 | **dev.to/onsen《Moving Away from Tailwind》(2026) 的可信度** | 该文疑似 SEO/AI 生成（发布于 2026-05，作者 2026-03 注册，内容为通用方法论综述，含"[INTERNAL_LINK: ...]"占位符残留） | **已标注为低可信度，其正面评价不作为独立证据使用** |
| 11 | **"他主张 code is political" 未核实** | Reddit r/webdev 评论引用了该表述作为靶子，但 `piccalil.li/blog/code-is-political/` 返回 **404**；未找到对应文章。**该论点归属未确认** | 中：这会影响"他因立场表述招致反感"这一判断的分量 |
| 12 | **Set Studio / Piccalilli 的经营与人员情况** | 已知为 bootstrapped、无外部投资、2025 年经营困难（[bell.bz](https://bell.bz/its-been-a-very-hard-year/)）。**未核实当前是否仍在运营、是否裁员** | 中 |

---

## 附：本次调研的关键判断（一句话汇总）

`[我推断的]`

> **对 Andy Bell 的批评高度集中在"表达"与"论据"两层，几乎为零落在"结果"层。**
> 最有力的一条批评不是说他错了，而是说他**讲不清**——2020 年那篇 CUBE CSS 文章发布当天，最高分的两条评论（+17、+11）都是"读了 15 分钟没搞懂它跟别的有什么不同"、"读了 4 页还没看到例子"；6 年后，仍有人说 CUBE「methodology heavy with few working examples」。
> 第二有力的一条指向**术语污染**：他把 "Composition" 挪用来指 layout，与业界既有用法冲突——这一点被两个互不相识的从业者（Reddit 匿名用户 + 独立顾问 Mark W. Jacobs）各自独立指出，并各自做了改名。
> 而"反 Tailwind 是立场先行"、"CUBE 是 BEM 换皮"、"小项目过度设计"这三条假设**均未在公开来源中得到证实**——这本身是重要发现。
