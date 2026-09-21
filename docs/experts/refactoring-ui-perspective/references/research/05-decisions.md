# 05 · 重大决策与转折点

**调研对象**：Adam Wathan、Steve Schoger —— 《Refactoring UI》作者，Tailwind Labs 核心成员
**调研日期**：2026-09-17
**信源分级**：`[一手]` = 本人博客／官方博客／官方发布说明／GitHub 原文／原始访谈转录；`[二手]` = 技术媒体报道，已尽量交叉验证；`[推断]` = 无一手自述理由，由上下文推断
**统一格式**：决策 → 时间 → 背景 → 他们的理由（引原话） → 代价／结果 → 事后反思

> **写作纪律声明**：本文档所有"理由"字段均来自可追溯的一手引述。凡未找到一手自述理由者，明确标注"未找到一手自述理由，以下为[推断]"。

---

## 一、关键决策表

| # | 决策 | 时间 | 决策类型 | 结果评价 |
|---|---|---|---|---|
| D1 | 放弃"语义化 CSS"，转向 utility-first | 2014-11 → 2017-08 | 认知转向 | 成功，成为全部后续的地基 |
| D2 | 把内部样式表开源为 Tailwind CSS（v0.1） | 2017-06 → 2017-11-01 | 开源 / 公开 | 成功，但当时"零意图做框架" |
| D3 | 用 PostCSS + JS 重写，弃用 Less | 2017-08 | 技术选型 | 成功，但自认"滥用 PostCSS" |
| D4 | 不做组件库，只做工具类（utility-**FIRST** 而非 utility-ONLY） | 2017-11 起 | 架构定位 | 成功，是差异化核心 |
| D5 | 配置设计：默认值优先，否决"一切皆插件" | 2019-02 | 产品架构 | 成功，配置从 500 行变可选 |
| D6 | 全职投入 Tailwind，放弃 SaaS 路线 | 2018-12-28 | 人生级押注 | 成功（当时看） |
| D7 | 《Refactoring UI》自建站直卖 + 高价 + 双档定价 | 2018-12 | 分发 / 定价 | 成功，毛利 $1.35M+ |
| D8 | Tailwind UI：卖 HTML 片段而非 npm 组件库 | 2019-03 → 2020-02-26 | 商业化 | 成功，2 年 $4M+ |
| D9 | Tailwind UI 加 React/Vue + 自研 Headless UI | 2020 夏 → 2021-04-14 | 技术 / 商业 | 成功 |
| D10 | v2 明确放弃 IE11 | 2020-11-18 | 兼容性取舍 | 成功，代价可控 |
| D11 | v2 重做 220 色 palette（50–900） | 2020-11-18 | 设计系统 | 成功，成为行业默认 |
| D12 | JIT 引擎 → v3 默认引擎 | 2021-03-15 → 2021-12-09 | 内核重写 | 成功，解锁 arbitrary values |
| D13 | 开放 arbitrary values（任意值） | 2021-03 / v3 正式 | 哲学让步 | **争议转折点**，与"约束驱动"张力 |
| D14 | 官方否定 `@apply`：只应"几乎从不"使用 | 2020-02-09 | 立场表态 | 与其起源（Less classes-as-mixins）矛盾 |
| D15 | Catalyst：官方推出成套 React 组件库 | 2023-12-20 | 产品 | 与 utility-first 立场张力；商业上未成支柱 |
| D16 | v4 Oxide：Rust 重写 + CSS-first 配置 | 2023 夏 → 2025-01-22 | 内核重写 | 技术成功，商业未救回 |
| D17 | v4 有意不做 JS 配置兼容层 | 2024-03 → 2024-06 | 架构洁癖取舍 | 后加回兼容层，社区有摩擦 |
| D18 | v4 只支持现代浏览器（Safari 16.4+） | 2025-01-22 | 平台押注 | v4.1 被迫补兼容层，部分回调 |
| D19 | 拒绝 llms.txt PR | 2026-01-07 | 拒绝 | 引爆舆论，成为"AI 摧毁开源商业模式"标志事件 |
| D20 | 裁员 3/4 工程师 | 2026-01-06 | 生存决策 | 被迫，创始人自述"糟透了" |
| D21 | 加入 Shopify，关闭 Tailwind Plus / ui.sh 新注册 | 2026-09-09 | 退出 / 终局 | 商业业务线终结，框架保留 MIT |

---

## 二、每项决策详述

### D1 · 放弃"语义化 CSS"，转向 utility-first

- **时间**：2014-11-10（早期文章《"Semantic" CSS》）→ 2017-08-07（长文《CSS Utility Classes and "Separation of Concerns"》）
- **背景**：Adam 是 Bootstrap 重度用户。Bootstrap 4 alpha 弃 Less 改 Sass，而他"hated Sass"。他自述教条式地相信"关注点分离"：HTML 只放内容，样式全在 CSS。
- **理由（引原话）**：
  - 关键转折点的触发源不是他自己想出来的，而是读到 Nicolas Gallagher 的文章：「The turning point for me came when I read Nicolas Gallagher's *About HTML semantics and front-end architecture*… I came away from that blog post fully convinced that optimizing for reusable CSS was going to be the right choice for the sorts of projects I work on.」`[一手]`
  - 他把"关注点分离"整个重新定义为"依赖方向"问题：「**"Separation of concerns" is a straw man**… Instead, **think about _dependency direction._**」`[一手]`
  - 量化痛点：他在同一篇文章里列出 GitLab 有 **402 种文字颜色、239 种背景色、59 种字号**；Buffer 124/86/54；Stripe 189/90/35；GitHub 163/147/56。「This is because every new chunk of CSS you write is a blank canvas; there's nothing stopping you from using whatever values you want.」`[一手]`
  - 「**every line of new CSS is still an opportunity for new complexity**; adding more CSS will never make your CSS simpler.」`[一手]`
  - 关于他自己初始的抵触，2018 年在 HN 亲口承认：「I promise your gut reaction will be "holy hell this is the worst thing I've ever seen" (**it was my reaction too!**)」，并自嘲自己的身份转变是「from a "semantic classes"-loving HTML/CSS purist to a **utility-loving heathen**」`[一手]`
- **代价／结果**：这篇 2017 年的长文成为 Tailwind 的思想宣言，也是大量开发者"被说服"的入口（HN 上有读者留言「Adam, your "Separation of Concerns" article was what sold me on utility-first CSS」）。代价是他长期承受"这看起来糟透了"的第一印象成本。
- **事后反思**：他并不认为语义化 CSS 是"错的"，而是**场景取舍**：「Neither is inherently "wrong"; it's just a decision made based on what's more important to you in a specific context.」他明确承认这是为"可复用 CSS"牺牲"可重样式化 HTML"。`[一手]`

---

### D2 · 把内部样式表开源为 Tailwind CSS

- **时间**：2015 年雏形（Digest）→ 2017 春（KiteTail）→ 2017-06-18 发推考虑开源 → **2017-11-01 发布 v0.1.0**
- **背景**：样式表的最初起源是一个失败产品。2015 年 Adam 和 Steve 做"Reddit meets Pinterest meets Twitter"的链接分享站 **Digest**，Adam 请了一周假写原型，结果前六天全花在技术选型上，最后一天才写业务。因为 Bootstrap 4 弃 Less，他决定"从零手写全部样式"。Digest 死了，但样式表被搬运到之后 4–5 个项目。
- **理由（引原话）**：
  - 「I noticed something as I copied the styles across though: the utilities (which started as simple padding and margin utilities) kept growing and evolving… while the components files kept getting shorter and shorter. The utilities were the only things that were truly "portable", while the component styles were always too opinionated to reuse on another design.」`[一手]`
  - 「Now at this point I had **_zero_ intention of maintaining any sort of open-source CSS framework.** It didn't even occur to me that what I had been building would even be interesting to anyone.」`[一手]`
  - 开源的真实触发是**直播**：「stream after stream, people were always asking about the CSS」。他把这个抽象成一条方法论：「**This is the benefit of working in public**」。`[一手]`
  - 名字的来历也不是"营销"：「the name Tailwind? It came from me wanting the name to be tied back to **KiteTail** in some way」。他用 onelook.com 搜 `tail*` 找出来的。`[一手]`
  - 命名约定的一个具体贡献来自社区：Stefan Bauer 提议响应式前缀用 `sm:font-bold` 而非 `sm-font-bold`。`[一手]`
- **代价／结果**：v0.1 反响远超预期。一个月后（2018-01）Andrew Del Prete 的 PurgeCSS 文章被 Adam 称为「one of the most important blog posts in the history of the framework」——因为解决了"生成的 CSS 太大"这个致命问题。`[一手]`
- **事后反思**：Adam 在 2020 年明确复盘："副产品比主产品活得久"这件事他无法事先预见。「Steve and I would have never built this Tailwind Labs business… if I hadn't been live-streaming my work on yet-another-abandoned-side-project.」`[一手]`

---

### D3 · 用 PostCSS + JavaScript 重写，弃用 Less

- **时间**：2017-08
- **背景**：为了让框架足够可配置，Adam 把 Less 推到了极限：「I had to seriously push the boundaries of what was possible with Less, and write some truly cryptic and horrific shit.」`[一手]`
- **理由（引原话）**：
  - 决定性证据是他自己无法理解自己的系统：「Writing a test suite for this sort of thing was not really practical as far as I could figure out, and it was getting to the point where **I didn't even understand the system anymore** and just had to hope and pray that solving one problem didn't introduce another.」`[一手]`
  - 触发者：朋友 David Hemphill 建议他试 PostCSS 用 JS 写框架。Adam 当时的认知是「I thought it was limited to the sort of things autoprefixer uses it for」。`[一手]`
  - 切换后的直接反馈：「I started messing around with it and was **immediately amazed by how much more confident I felt in the code**, and the amazing things I could do given a proper programming language.」`[一手]`
  - 他保留了 Less 的一个杀手级特性作为设计遗产：Less 里"任何 class 都能当 mixin"，这就是后来 `@apply` 的前身。「If you've used `@apply` in Tailwind, this will probably look familiar…」`[一手]`
- **代价／结果**：框架得以用 JS 做配置生成。"可配置的设计刻度用 JS 配置生成 CSS"这个架构决策，本质上是 D3 的直接产物——只有把配置当代码，才能让 `theme.spacing` 参与 `calc()` 与插件系统。
- **事后反思**：他自嘲式地承认技术债：「By the way, to this day I feel like **Tailwind is completely abusing PostCSS in a way it was never intended**, and I secretly believe Andrey Sitnik cringes a little bit every time he thinks about what we've done with his beautiful library 😅」`[一手]`

---

### D4 · 不做组件库，只做工具类

- **时间**：2017-11 起持续表态；2018-09-27 HN 系统阐述
- **背景**：当时最主流的 CSS 框架（Bootstrap、Bulma、Semantic UI）都是组件库。Tailwind 完全反其道而行。
- **理由（引原话）**：
  - **本人在 HN 的原话**：「This is a totally real problem and **one of the things that put me off of using some of the existing utility frameworks before creating Tailwind.**」`[一手]`
  - 核心区分（这句话是整个框架的设计纲领）：「**The key with Tailwind is that it encourages a "utility-FIRST" workflow, not a "utility-ONLY" workflow.** Build your UI with small primitive utility classes, and extract components only when you start to experience painful duplication problems.」`[一手]`
  - 他明确不假装工具类能消灭 CSS：「With Tailwind, we **don't try to pretend that you will never need to write any CSS**, and instead embrace that fact and give you as much tooling and guidance as possible on how to extend the framework the way it was intended to be extended.」`[一手]`
  - 2017 长文里的对应论证：「I don't think you should build things out of utilities _only_.」他拿 Tachyons 纯工具类的按钮举例（`f6 br3 ph3 pv2 white bg-purple hover-bg-light-purple`），说自己"仍认为很多场景下写一个 CSS 组件比做一个模板组件更实际"：「it's usually simpler to create a new `.btn-purple` class that bundles up those 7 utilities than it is to commit to templatizing every tiny widget on the site.」`[一手]`
  - 关于"为什么不直接内联样式"的回答：「utilities force you to choose… You can't just pick any value want; you have to choose from a curated list. **Instead of 380 text colors, you end up with 10 or 12.**」`[一手]`
- **代价／结果**：HTML 变丑是明确接受的代价。Adam 从未为此辩解，而是直接承认第一印象就是「holy hell this is the worst thing I've ever seen」。换来的是"团队所有人从固定选项里选值 → 一致性免费获得"。
- **事后反思**：这条纲领在 2023 年推出 Catalyst（D15）时被自己的产品线部分打破，见"言行不一致案例"章节。

---

### D5 · 配置设计：默认值优先，否决"一切皆插件"

- **时间**：2019-02（v1.0 前的三周煎熬）
- **背景**：v1.0 需要重构配置文件结构。Adam 一度想走极端：把 Tailwind 变成"一个把插件转成 class 的引擎"，所有内置 utility 都变成插件。写出来后他的评价是：「it was truly offensive」。`[一手]`
- **理由（引原话）**：
  - 他做了用户调研并**被结果打脸**：「I was really surprised when **54% of respondents chose the default styles**. I knew the defaults were important… but I really expected that to be everyone's second-favorite feature, with customization coming first. **I thought it would be maybe 85%/15%, favoring customization over the default styles.**」`[一手]`
  - 朋友 Jason McCreary 说服了他：「Jason convinced me that exposing everything as a plugin was a bad idea, and that he believed one of Tailwind's core value propositions was **providing a great starting point** for most projects.」`[一手]`
  - 由此确立的配置哲学（v1 到 v4 一以贯之）：「I took the opinion that your config file should be where you look to see **what you've changed**, not what the entire design system looks like, defaults and all.」`[一手]`
  - 三个具体否决理由：① 无意义的文件（大量插件配置完全一样）；② 脚手架过载（用户会「immediately `git reset --hard`」）；③ 无法区分"默认"与"自定义"。`[一手]`
- **代价／结果**：v1.0 的配置从"500 行脚手架"变成"默认值内建、配置文件可选、只写 diff"。这套"extend 而非 replace"的心智模型一直沿用到 v4 的 `@theme`（`--color-*: initial` 才是清空重置）。
- **事后反思**：无专门事后反思记录，但这条决策在 v4 的 `@theme` 设计里被再次执行——`@theme` 的行为"像旧版的 extend"。`[一手]`

---

### D6 · 全职投入 Tailwind，放弃 SaaS 路线

- **时间**：2018-12-28（公告）→ 2019 全年
- **背景**：Adam 当时靠课程/书赚钱（Test-Driven Laravel、Advanced Vue Component Design、Refactoring UI）。他本来要和一个朋友开始新的 SaaS 项目。
- **理由（引原话）**：
  - 触发点是重读 Derek Sivers 的《Anything You Want》：「I realized there actually _was_ a common thread between everything I spend my time on: **_I like to help people build awesome software, and have more fun doing it._**」`[一手]`
  - 关于"为什么不是别的"：「Tailwind CSS is by far the highest impact project I've ever worked on — it felt like it was _this close_ to being my "**dent in the universe**", and the idea of not putting in the work to push it over that hump **made me sick**.」`[一手]`
  - 资金来源被如实交代：「I was lucky enough to have a big bankroll from **Refactoring UI**」——即"书养框架"。`[一手]`
  - 他对可持续性的公开规划当时包含三条：继续写书/课程、**企业赞助**、**付费产品（主题与 UI kit）**。`[一手]`
  - 他在同文中明确引用 Bootstrap 的主题商店（themes.getbootstrap.com）作为先例。
- **代价／结果**：v1.0 于 2019-05-13 发布。当年底 Steve 和 Adam 开始做 Tailwind UI，2020 年 2 月上线。
- **事后反思**：这条决策的"事后反思"要等到 2026 年才写下（见 D20/D21）——他当年规划的三条腿（书、赞助、付费产品），前两条在 AI 时代失效，第三条被 AI 直接替代。

---

### D7 · 《Refactoring UI》的分发与定价

- **时间**：2018-12 发布；定价策略在发布前已定型
- **背景**：两人计划"把 Twitter 上的设计技巧打包成一份资源"。Adam 自述初衷很朴素：「take all of the tips and tricks we've shared on Twitter, bundle them up into one resource, and put it out into the world.」但计划过程中野心变大：「Something that wasn't just a book, but more like **a complete survival kit** for designing for the web.」`[一手]`
- **理由（引原话）**：
  - **不走传统出版社**：Adam 在 Indie Hackers 访谈中讲了方法论的来源——他的录音室导师教他先做 **"trip wire product"**（诱饵产品），先做能卖 10 块钱的小东西，练手 + 练营销；他随后系统学习了 Nathan Barry 的自出版内容。`[一手]`
  - **定价理由（来自 Adam 本人在 The Art of Product Podcast Ep.70 的原话，经二手转引）**：「**The format commands the price.** No matter what the content is. And it speaks nothing to the value of the content or the effort that was put into creating it.」以及关于双档折扣：「If you want people to buy the more valuable package **why not make the discount more compelling**.」`[二手：marketingexamples 转引播客原话，转引链完整]`
  - **为什么先做书而不是先做视频**：视频教程从一开始就是"包"的一部分，不是前置。官网描述的顺序是：书（50 章 / 200+ 页 PDF）→ 3 段视频教程 → 组件画廊（20+ 类目 / 200+ 组件样式）→ 十余套完整配色（每色 10 阶）→ 字体建议（30+ 款）。Adam 的表述是「It's not just a book — it's everything you need to start producing better designs today.」`[一手]`
  - **Steve 与 Adam 的分工**：官网亲述「him handling the UI design and me taking care of development」，且 Adam 明说自己"以前设计很烂"，他的收获是**从 Steve 那里学到不依赖艺术天赋的具体战术**（tactic），而非提高审美。`[一手]`
- **代价／结果**：定价 $79 / $149 双档；高阶档在版式上占两倍空间、字号更大、按钮为主色、折扣比例更狠（$100 减免 = 40%，低档仅 $20 = 25%），命名用"Complete Package"制造缺失感。截至 2019-01-10，**78% 的购买（6765 单）选择了高价档**；累计毛收入超过 $1.35M。`[二手：marketingexamples 引 Adam 原话与销售数据]`
- **事后反思**：Adam 在 Indie Hackers 访谈中把这类成功归因于"注意到的机会 + 做到位"，并且反复强调**先攒免费内容**是定价能力的前提。该文作者也点出：「The price you can charge is equal to the value you've already created.」`[二手]`

> ⚠️ **信息缺口**：Refactoring UI 官网当前标注"Over 30,000 copies sold"，但官网的完整价目表与**学生折扣**具体规则在本次抓取中因页面过长被截断，未能取得一手原文。见"信息缺口"章节。

---

### D8 · Tailwind UI：卖 HTML 片段，而不是 npm 组件库

- **时间**：2019-03-30 首次原型曝光 → **2020-02-26 上线**（自设截止日期前连续工作 36 小时）
- **背景**：开源框架的变现路径。Adam 当时明确参考 Bootstrap theme store 与 ThemeForest 的先例。`[一手]`
- **理由（引原话）**：
  - 首次曝光时的定义：「Think hundreds and hundreds of fully responsive professionally designed components, pre-built so you can just **copy the HTML and tweak to taste**」`[一手，2019-03-30 推文]`
  - 为什么是 HTML 而不是组件包（2021 年官方博客原文）：「all of the examples in Tailwind UI have been **pure HTML which is sort of the lowest common denominator for all web developers**, and makes it possible to adapt them to any templating language or JavaScript framework.」`[一手]`
  - 商业逻辑的自述：「at the end of the day **we're definitely selling design more than anything else**」——因为他和 Steve 的差异化是"有一个设计联合创始人，不是每个开源工具都有"。`[一手，JS Party #155]`
- **代价／结果**：约 5 个月后接近 **$2M 收入**；2020-08 时 Tailwind Labs「done over $4m in revenue in under 2 years」。`[一手]`
- **事后反思**：他在 2020 年就把这条线总结为"开源是最好的营销"：「investing just in growing the framework has been the most effective thing we've been able to do for growing the business, too.」——**这句话在 2023 年后被现实推翻**，见 D19/D20。`[一手]`

---

### D9 · Tailwind UI 加 React/Vue 支持，并自研 Headless UI

- **时间**：2020 夏（Headless UI v1）→ 2021-04-14（Tailwind UI 支持 React/Vue 3）
- **背景**：纯 HTML 片段无法覆盖下拉菜单、模态框这类需要 JS 行为的组件——写这些"复杂 JS"是用户的主要摩擦点。
- **理由（引原话）**：
  - 解耦思路：「a library of components we developed to **decouple all of the complicated JS behavior** you need to build complex components like modals and dropdowns **from the actual styles and markup**.」`[一手]`
  - 保留控制权：「we've managed to abstract away all of the complicated JS functionality **without taking away any control over the actual markup**. That means that the entire design is still in entirely under your control.」`[一手]`
  - 这直接催生了一个架构原则：**行为归 node_modules，样式归你的代码**。
- **代价／结果**：Adam 自评这是一段「long journey」；`[一手]` Headless UI 后来成为 Catalyst 的技术底座（D15）。
- **事后反思**：无专门事后反思。但从 2023 年 Catalyst 发布文可看出其价值被再次确认：Catalyst 是「the perfect excuse to get our hands dirty with Headless UI again」。`[一手]`

---

### D10 · v2 明确放弃 IE11

- **时间**：2020-11-18
- **背景**：v2 是 Tailwind 第一个 major 版本。
- **理由（引原话）**：官方博客把它列在发布亮点里，并直接给了对用户的话术：「**Incompatibility with IE11** — so you can tell the person in charge _"sorry boss it's out of my hands, blame Tailwind"_」`[一手]`
  - **这是罕见的"把政治成本外包给框架"的显式设计**：Adam 知道真正的阻力不是技术，而是组织里的反对者需要一个借口。
- **代价／结果**：v2 的主要破坏性变更被压到极小：「we've renamed two classes, removed three that are no longer relevant in modern browsers, and replaced two with more powerful alternatives」；升级预计「shouldn't take more than about 30 minutes」。`[一手]`
- **事后反思**：这条"小步破坏 + 官方话术"的做法，在 v4 的复盘中被 Adam 提炼成一条通用策略（见 D17）。

---

### D11 · v2 重做 220 色 palette（50–900）

- **时间**：2020-11-18
- **背景**：v0.1 时代的调色板只有 10 个颜色、每个 9 阶（90 值），且每个项目都要自己配。
- **理由（引原话）**：「We've learned a lot about color since the first time we tried to design a general purpose color palette back in the Tailwind CSS v0.1.0 days, and **v2.0 represents our best attempt so far**.」`[一手]`
- **具体设计决策（一手）**：
  - 从 10 色 × 9 阶 → **22 色 × 10 阶 = 220 值**。
  - **新增最浅的 `50` 阶**，使色阶变成 `50–900`：「We've added an extra light `50` shade for every color, so they go from 50–900 now.」
  - **5 种灰**：「so you can choose "blue gray" if you want something really cool, or go all the way to "warm gray" for something with a lot more brown in it.」
  - **默认只启用 8 色**，完整调色板移到 `tailwindcss/colors` 模块按需引入。**理由是一手明说的**：`[推断]` 文中未给显式理由，但紧接在"完整调色板放独立模块"的说明前，并列于"生成文件体积"这一长期约束语境中——见 D12 的背景（v2 时期生成 CSS 可达 10MB+）。
  - 同时引入了**"每个字号自带默认行高"**的设计决策，理由原文很直白：「because **if we can't make using a 1.5 line-height with a 48px font illegal we should at least make it not the default**」。`[一手]`
- **代价／结果**：v3 里"全部颜色默认启用"（因为 JIT 解决了体积问题）。这套 50–900 命名成了整个前端行业的通用词汇。
- **事后反思**：见 D18（v4 全面转 OKLCH）。

---

### D12 · JIT 引擎 → v3 默认引擎

- **时间**：2021-03-15 实验包 `@tailwindcss/jit` → v2.1 并入主包 → **v3.0 成为默认并移除旧引擎（2021-12-09）**
- **背景**：这是被 Adam 称为"最难的长期约束"：「One of the hardest constraints we've had to deal with as we've improved Tailwind CSS over the years is the **generated file size in development**. With enough customizations to your config file, the generated CSS can reach **10mb or more**.」`[一手]`
- **理由（引原话）**：
  - 旧模式是"先生成全部，再按 class 名单删除"；JIT 反过来"按需生成"。用 Adam 在 2024 年的回溯说法：「Tailwind used to generate a giant style sheet, and then it would look at all your class names in your template files and delete all the classes you didn't use. Tailwind 3 kinda does the opposite… **which ends up just working out a lot better**。」`[一手]`
  - 四个一手列出的收益：构建从 3–8s（webpack 下 30–45s）降到约 800ms；**所有 variant 默认可用**；**无需写自定义 CSS 就能生成任意值**；开发与生产的 CSS 完全一致。`[一手]`
- **代价／结果**：v3 中「every single color in the extended color palette is enabled by default, including lime, cyan, sky, fuchsia, rose, and fifty shades of gray」`[一手]`；生成了 Play CDN（因为「There's no way to make a sensible CSS-based CDN build for Tailwind CSS v3.0 so we had to do something different — we built a JavaScript library」）`[一手]`。
- **事后反思**：JIT 是**arbitrary values 的技术前提**，而 arbitrary values 反过来削弱了"约束驱动设计"的核心主张（见 D13）。

---

### D13 · 开放 arbitrary values（争议转折点）

- **时间**：2021-03-15 随 JIT 首次出现；2021-12-09 v3.0 正式化；2025-01-22 v4 进一步升级为"动态 utility 值"
- **背景**：JIT 使得"按需生成任意值"在成本上不再有障碍。
- **理由（引原话）**：
  - v3 官方博客的措辞几乎是**炫耀式**的：「This might be illegal but we've made it possible to add totally arbitrary CSS that you can combine with modifiers like `hover`, `lg`, and whatever else… **This is what inline styles want to be when they grow up.**」`[一手]`
  - v4 进一步放开：`grid-cols-15`、`data-*` 直接可用，**spacing 全部动态化**：「stop guessing what values exist in your spacing scale」`[一手]`
- **代价／结果（这是本文档最关键的张力点）**：
  - D1 的原始论证是"utility 强制你从**有限的策划列表**中选值，所以不会出现 380 种文字色"。arbitrary values **把这个约束重新打开了**。
  - 官方给出的缓释手段是**升级工具自动收敛**：「The upgrade tool we released alongside v4.0 will even **simplify most of these utilities for you automatically if it notices you using an arbitrary value that's no longer needed**.」`[一手]`——即承认"用户会滥用任意值"，且用工具去回退。
  - v3.4 的官方措辞则直接承认尺度在摇摆：「**Hopefully that means a few less arbitrary values in your markup. I'm coming for you next 2.5%.**」`[一手]`（在扩展 opacity 刻度到每 5 一档时）
- **事后反思**：未找到 Adam 就"arbitrary values 是否违背约束驱动"的一手自述反思。`[推断]` 从 v4 升级工具的设计意图看，团队的立场是"承认任意值必要，但持续用更好的默认刻度把它挤出去"——这是**用供给侧的丰富化代替需求侧的纪律**。

---

### D14 · 官方否定 `@apply`

- **时间**：2020-02-09
- **背景**：`@apply` 的技术祖先是 Less 的 classes-as-mixins，也是 Adam 当年离开 Sass 的直接原因之一。它被大量用户当作"既能用 Tailwind 又能写语义 class"的桥梁。
- **理由（引原话）**：
  > 「Confession: The `apply` feature in Tailwind **basically only exists to trick people who are put off by long lists of classes into trying the framework.** You should almost never use it 😬 Reuse your utility-littered HTML instead.」
  > —— Adam Wathan, 2020-02-09, X/Twitter `[一手]`
- **代价／结果**：
  - `@apply` 从未被移除，反而在 v2 里被**增强**（「Use @apply with anything」，支持 `hover:` 等 variants）。`[一手]` 即：官方一边劝退、一边继续投入工程资源支持它。
  - 社区困惑至今存在。CSS-Tricks 2025 年的文章评论区仍有人问：「I'd love some clarification on why `@apply` is dissuaded; the TW people are very insistent on this, but the rationale… I don't understand.」`[二手]`
- **事后反思**：官方从未公开撤回这句话。`[推断]` 从 v2 的工程投入看，实际立场比那句推文温和得多。

---

### D15 · Catalyst：官方推出成套 React 组件库

- **时间**：2023-12-20（development preview）→ 2024-05-24（首个大版本更新）
- **背景**：Tailwind UI 一直卖的是"片段"。Catalyst 是「**our first fully-componentized, batteries-included application UI kit**」——真 React 组件、有成套 API、互相组合成架构。`[一手]`
- **理由（引原话）**：
  - 目标客群定义得很清楚：「tomorrow's Stripe or Linear… design-obsessed teams who want to **own their UI components, and would never choose an off-the-shelf library**.」`[一手]`
  - **关键手法：它不是依赖，是源码**。「it's not a dependency you install, instead you **download the source and copy the components into your own project** where they become the starting point for your own component system… Catalyst is a "**disappearing UI kit**" — six months after you've installed it, you should almost forget it wasn't you who built the original components.」`[一手]`
  - API 设计也回到"模仿 HTML"：「it's rare that a single component renders more than one element」；理由是「with all the props living on the same component, it starts to get difficult to do things like add a class just to the `<input>` element itself.」`[一手]`
  - 三个设计目标原文：**Be competitive / Be timeless / Be productive**；且明确「we didn't want to design something that would look dated in 6 months because it leaned too hard into specific trends」、「used unopinionated blue focus rings to avoid picking a treatment that might soon look out of fashion」。`[一手]`
- **代价／结果**：
  - 官方立场上并不矛盾：Catalyst 是**源码分发**（可删、可改、非依赖），这与"不做组件库依赖"不一致性低于表面印象。
  - 但商业上，`[二手]` ppc.land 在 2026 年的复盘里引述开发者批评 Tailwind Plus「lacking coherent direction, attempting to serve multiple markets with snippets, components, and templates without integrating them into a unified design system」，并指出 Catalyst 要正面对抗免费的 shadcn/ui、Radix UI、Headless UI。`[二手]`
- **事后反思**：无一手反思。`[推断]` Catalyst 未成为商业支柱，其"源码下载"模式反而与 shadcn/ui 后来的注册表模式趋同，差异化不足。

---

### D16 · v4 Oxide：Rust 重写 + CSS-first 配置

- **时间**：2023 夏 Tailwind Connect 预览 → **2024-03-06 开源 alpha** → **2025-01-22 正式版**
- **背景**：这不是需求驱动的重写，而是**创始人动机驱动的重写**。Adam 在 2024-06 的 Tuple 播客里说得非常坦白。
- **理由（引原话，Tuple Podcast 2024-06-10）** `[一手]`：
  - **首要动机是"好玩"**：「the original motivation for it was sort of 2 things… The one thing is **it sounded fun**.」
  - **第二动机是自尊心**：「this code base and project is really important to me, and I wanna be, like, **obscenely proud of every corner of the code base**. And that's just not the state that it was in up until now.」他还引用了"破窗理论"：「we did something fucking gross there. So the code base is already done for. So what does it matter if I do a nice implementation here or a dirty implementation here?」
  - **第三是设定一个不可辩驳的目标**：「let's just make it **the fastest possible version of Tailwind ever**. Let's make it insanely fast, basically **at the expense of anything**. I don't really care, like, what it takes, if the code is harder to understand but it's faster, I don't care. I just want it to be faster.」
  - **"不要缓存"是显式目标**：「we had this goal, like, **how can we make 10x faster than v3 with no caching**」——因为 v3 的性能大量来自"非常激进的缓存"，带来概念负担。
  - **为什么用 Rust（且不是全用 Rust）**：Rust 只用于"扫描文件抽 class 名"这一步，因为它可并行且不需要进浏览器：「**Rust has concurrency and JavaScript does not.**」同时有一个硬约束：「we wanna ship a browser based version… **anything we did in Rust was work that didn't ever need to happen in the browser**」——否则要付出 WASM 体积代价（「Now we're gonna ship, like, a **7 megabyte** JavaScript file to the browser. That's horrible.」）。CSS 生成的主体部分**仍在 Node**。他还说「We did try a parser generator, and it was **much slower** than writing it by hand.」
  - **官方博客的对外表述**：把 v3.x 升级为 v4.0 的理由是「even though we're committed to backwards compatibility, this feels so clearly like a **new generation of the framework** that it deserves to be v4.0」。`[一手]`
- **代价／结果（官方公布数据）** `[一手]`：
  | | v3.4 | v4.0 | 提升 |
  |---|---|---|---|
  | Full build | 378ms | 100ms | 3.78x |
  | 增量（有新 CSS） | 44ms | 5ms | 8.8x |
  | 增量（无新 CSS） | 35ms | 192µs | **182x** |
  安装体积缩小 >35%，唯一依赖只剩 Lightning CSS；自写 CSS parser 比 PostCSS 快 2 倍以上。
- **事后反思**：Adam 在播客里提前预告了风险：「Don't rewrite anything ever — my experience has been, like, **rewriting things is awesome**」。但同年他也承认"最难的（兼容性）部分还没做完"。**技术目标全部达成，商业目标未达成**——见 D19/D20。

---

### D17 · v4 有意不做 JS 配置兼容层

- **时间**：2024-01-03 开工 → 2024-03-06 alpha（明确不含兼容层）→ 2024-06 播客解释 → 最终加回
- **背景**：Tailwind 历史上一直有 `tailwind.config.js`。v4 改成 CSS-first 的 `@theme {}`，alpha 阶段**完全不支持 JS 配置文件**。
- **理由（引原话，2024-06 Tuple Podcast）** `[一手]`：
  - 「we were very explicit about what was going to be in the alpha and what was not. So there's some big pieces that are not in there like backwards compatibility.」
  - **核心方法论证**：「we really wanted to write this v4 code base **as if we were just gonna do, say this was the first version knowing everything that we know now and there was no baggage**… So anything that we kinda wish we didn't have, **we just didn't build**. And did it intentionally because I wanna make sure that when we add support for that stuff, it's **layered on to the clean core and not just mixed in with it**.」
  - **被删除的成本要最小化**：「Like, when v5 comes around… I want that to be like **deleting a file**. I don't want that to be like hunting around for all the places that cared about this backwards compatibility thing.」
  - **他明确反驳"major 版本可以随意破坏"**：「my personal stance is that **open source maintainers generally underappreciate the importance of backwards compatibility even with major version increases**. I'd rather make, like, very small breaking changes that affect barely anybody than use major versions as an opportunity to do that.」
  - **他的三步法**：「do a major version, reintroduce a new way to do something, **stop documenting the old way**, wait a few years, then make the old thing no longer work **when it basically affects nobody because everyone's forgotten that that was even a way to do things**.」
  - **替代兼容层的另一条路是代码模（codemod）**：「one of the ways we've been talking about dealing with some backwards compatibility stuff is **not to make the old thing work, but to just make it in possibly easy to upgrade to the new thing**… I feel like **if you let an old deprecated thing work, people will use it** and be content in a way that they've been able to upgrade.」
  - 官方博客确认最终路线：「**Support for JavaScript configuration files** — reintroducing compatibility with the classic `tailwind.config.js` file to make migrating to v4 easy.」`[一手]`
- **代价／结果**：v4 同时发布了自动升级工具。但 v4 上线后仍有大量用户卡在配置迁移上，GitHub 上长期存在关于 legacy JS 配置的讨论与补丁。`[二手]`
- **事后反思**：Adam 的"洋葱式分层"类比来自 Stripe API 的版本升级层（他明确提到 Michelle Bu 与 Stripe 的做法）。`[一手]`

---

### D18 · v4 只支持现代浏览器

- **时间**：2025-01-22（v4.0）→ 2025-04-03（v4.1 补兼容）
- **背景**：v4 全面押注现代 CSS：原生 `@layer`、`@property`、`color-mix()`、`oklch()`、逻辑属性。
- **理由（引原话）**：
  - v4.0 官方定位：「Tailwind CSS v4 is **designed for and tested on modern browsers**」；升级指南明确列出 **Safari 16.4+ / Chrome 111+ / Firefox 128+**。`[一手]`
  - v4.1 的回头修正理由写得很实在：「we went all-in on modern platform features with Tailwind CSS v4.0 to make the best framework we could, and give this version the **longest shelf-life** possible. Unfortunately some of those features **degrade really poorly in older browsers, to the point where even basic things like colors and shadows might not render at all** for someone visiting from an old iPhone or iPad that's stuck on Safari 15.」`[一手]`
- **代价／结果**：v4.1 专门开发了"框架专属降级方案"：`oklab` 颜色可在旧 Safari 渲染；依赖 `@property` 的特性（阴影、变换、渐变）在旧 Safari/Firefox 可用；带透明度修饰符的颜色内联降级；渐变插值模式回退。官方措辞仍保留立场：「Tailwind CSS v4 is still _designed_ for modern browsers like Safari 16.4 and up」。`[一手]`
- **事后反思**：这是一次**典型的"押注平台未来、被存量用户拉回半步"的决策**。值得注意的是：**他们没有放弃立场，只是补齐了"能渲染"的底线**——属于部分回调而非立场反转。

---

### D19 · 拒绝 llms.txt PR（押注失败的关键事件）

- **时间**：2025-11-19 社区提交 PR → **2026-01-07 Adam 回复并拒绝**
- **背景**：社区反复要求提供 LLM 友好的文档（`llms.txt` 端点或 markdown 版文档），便于 agent 抓取。该 PR 已挂了约 6 个月。而在 Adam 回复的前一天（2026-01-06），公司刚裁掉了 3/4 的工程师。
- **理由（引原话，GitHub 原文，`tailwindlabs/tailwindcss.com` PR #2388，comment 3717222957）** `[一手]`：
  > 「I totally see the value in the feature and I would like to find a way to add it.
  >
  > But the reality is that **75% of the people on our engineering team lost their jobs here yesterday because of the brutal impact AI has had on our business.** And every second I spend trying to do fun free things for the community like this is a second I'm not spending trying to turn the business around and make sure the people who are still here are getting their paychecks every month.
  >
  > **Traffic to our docs is down about 40% from early 2023 despite Tailwind being more popular than ever. The docs are the only way people find out about our commercial products, and without customers we can't afford to maintain the framework.** I really want to figure out a way to offer LLM-optimized docs that don't make that situation even worse… but I can't prioritize it right now unfortunately, and **I'm nervous to offer them without solving that problem first.**」
  >
  > 「Tailwind is growing faster than it ever has and is bigger than it ever has been, and **our revenue is down close to 80%**. Right now there's just **no correlation between making Tailwind easier to use and making development of the framework more sustainable**. I need to fix that before making Tailwind easier to use benefits anyone, because if I can't fix that **this project is going to become unmaintained abandonware** when there is no one left employed to work on it.」
  - 他还针对"是不是藏着商业动机"的质疑做了辩护：「I don't see the AGENTS.md stuff we offer as part of the sponsorship program as anything similar to this at all — that's just a short markdown file with a bunch of my own personal opinions… **and I resent the accusation that I am not disclosing my "true intentions" here.**」`[一手]`
- **代价／结果（结构性的，比事件本身更重要）**：
  - 该回复获 **2749 个 reaction**（+1 = 1014，❤ = 1515，confused = 216），随后被 HN 收录，讨论超 **1100 points / 635 comments**，GitHub 评论区被管理员锁定。`[二手：ppc.land + GitHub API 数据（reaction 数为一手）]`
  - **商业机制的完整因果链**（这是本条决策的分析核心）：
    1. 收入来自卖模板/组件（Tailwind UI → Tailwind Plus）；
    2. 获客入口是**文档站的流量**；
    3. AI agent 代替人类读文档 → 文档流量自 2023 初下降约 40%；
    4. 同时 AI 直接生成 UI，替代了对付费模板的需求；
    5. **两条线同时收紧**，收入降约 80%。
  - Adam 对这套机制的表述（一手）：「**there are two problems that kind of stack on top of each other**」——「fewer people are just even finding out about it in the first place because they're not going to the docs」。`[一手，Tighten 播客 2026-02-18]`
  - `[二手]` 编辑侧对同一机制有一句广为传播的概括：「As AI agents read the docs developers no longer do, and the docs were selling the templates that funded the framework.」（Figmalion #260 对官方公告的转述）。**该句式本身为二手概括，但其机制已被上述一手原话直接证实**，故不标 [存疑]。
- **事后反思（他本人的原话，非常完整）** `[一手，Tighten 播客 2026-02-18]`：
  - **关于"没早点发现"**：「the thing about revenue going down, especially really slowly, is like you just kind of every month is lower than the month before, but **it doesn't really feel like lower because it's so slow**… It's like **a boiling the frog sort of situation**… I basically realized that **we only had about like six months of time left before our expenses would exceed our revenue**.」
  - **关于"与用户为敌"**：「the things that would be good for users are bad for business. And that's just like a really frustrating spot to be because now it's like **you against your customers**… we need to figure out how to **swim downstream instead of upstream**.」
  - **关于怨恨的对象（他明确指向结构而非技术）**：「any resentment I have is more towards the fact that, fuck this project, Tailwind is taking over the world, it's used by everyone, and somehow we can't support eight people working on it full-time… **how do you build something that has such an impact and is so huge and not figure out a way to capture any of that value?**」同时强调「**I don't have any resentment towards AI as a technology.** I love using it… it's the most transformative thing I've used for building things in my whole programming career.」
  - **关于赞助模式的根本缺陷**：「**I've always been a little kind of leery of depending on like charity as a business.** It just doesn't feel like it's the first line item for someone to cut from the budget if things get tough for them… **I can't just bet the business on that working.**」并且他很清醒地指出救火式赞助的 PR 属性：「as much as I appreciate all the support… at the same time, **it was like a really good PR opportunity for a lot of companies** to sort of jump out… I don't know how long all these companies are going to be able to justify sticking around.」
  - **关于能力本身的贬值（对"方法论专家"最刺痛的一段）**：「I think I've spent a long time honing this craft of API design… It's hard not to lament the fact a little bit that **that work is almost like counterproductive now in an AI-dominated world** because a method like `chaperone` in Laravel is not intuitive, what that even means to like an AI. So it's better to name it some boring descriptive thing that is self-documenting for AIs… **I'm not typing code anymore as much**… You almost wanna **optimize for reviewability of code**.」
- **给"约束驱动设计"叙事的位置**：这是整套体系里**唯一一次"押注失败"被创始人用一手原话完整承认**的案例。关键教训不是"他不该拒绝那个 PR"，而是：**把商业变现的入口放在文档站，等于把商业模式绑在"人类会去读文档"这个会被技术迭代直接抹掉的假设上。**

---

### D20 · 裁员 3/4 工程师

- **时间**：2026-01-06
- **背景**：2024 年公司有 8 人，工程岗总包 $250k–$300k。`[二手]` Adam 在 2025 圣诞假期首次认真做财务预测。
- **理由（引原话）** `[一手]`：
  - 「I did some real forecasting and just went and looked at, okay, how much are we down every month? And it became clear that… actually they are [continuing to go down]… And I basically realized that **we only had about like six months of time left before our expenses would exceed our revenue**.」
  - 「we're like a bootstrapped small company… we **don't have cash in the bank that we raised from venture capitalists**… the only thing we could really do was basically make some big changes, and **we had to lay off three of the four engineers on the team**.」
  - 在他的个人播客里的原话（标题即态度）：「I just had to lay off some of the most talented people I've ever worked with and **it fucking sucks**.」`[一手，Adam's Morning Walk Ep.5 "We had six months left"，2026-01-07]`
  - 关于为什么用百分比而非绝对数公布（二次传播中的细节，`[二手]`）：「I wanted to state it like that because I thought just saying "3 people" undersold the impact.」
- **代价／结果**：
  - 团队只剩 3 位联合创始人 + 1 名工程师。`[二手]`
  - **反向收益**：事件引爆后，大量公司加入赞助计划，「we added a lot of partner program revenue」。`[一手]` 但 Adam 同时贬低其可持续性（见 D19 反思）。
  - 官方赞助页显示赞助年收入约 **$100 万**。`[二手]`
- **事后反思**：见 D19「事后反思」全段——他把这次失败主要归因于**自己没有持续做 CFO 该做的事**（"if you're not really making it a priority to be a CFO, which that's not what I do all day, every day"），而非归因于外部环境。`[一手]`

---

### D21 · 加入 Shopify，关闭商业业务线

- **时间**：**2026-09-09**（官方博客公告）
- **背景**：裁员后仍在寻找可规模化的变现路径，未果。
- **理由（引原话，官方公告《Tailwind Labs is joining Shopify》）** `[一手]`：
  - **关于为什么是 Shopify**：「We built a great little website template business around Tailwind over the years, but **deep down I've always wanted the framework to be developed in service of a real product.** A complex application solving important problems for real people, where we'd face the same challenges as our users, and could invent solutions that make the framework better for everyone.」
  - **关于为什么 Shopify 合适**：「**Shopify provides an incredible surface area for us to do this work.** Merchants need to be able to design and host beautiful custom storefronts… Shopify was also **one of the very first companies operating at scale to see the potential in Tailwind CSS** and start building with it… Tailwind is a ~~load-bearing~~ very important part of the stack at Shopify.」
  - **价值观层面的理由**：「**entrepreneurship has completely changed my life.** We are not doing enough as a society to produce and empower more entrepreneurs, and I believe deeply in Shopify's mission.」
  - **承诺与终止（同一段内给出）**：「**Nothing changes with Tailwind CSS or any of our other open-source projects.** Everything will always be MIT-licensed, and **our team will continue to lead and maintain these projects** for the community with the support of Shopify. On the commercial side, **we'll no longer be trying to grow the business around Tailwind.** All existing customers will of course maintain their access to products like Tailwind Plus and [ui.sh](http://ui.sh/), but **we're closing sign ups for new customers** to focus on Tailwind CSS at Shopify.」
  - 规模数据（一手）：提交当日，「the framework is installed **over 110 million times per week**」；Adam 起始于「over nine years ago」。
- **代价／结果**：
  - **商业线终结**：Tailwind Plus 与 ui.sh 对新用户关门，但已购用户保留访问权。
  - **开源线保留**：MIT 许可不变，原班人马继续主导维护。
  - 这是 D6（2018 全职投入 + 三条腿变现规划）的**终点**：书 + 框架自养的模式，最终以被一家大公司收养收场。
- **事后反思**：公告本身即为反思文本。`[推断]` 对照 2018 年"dent in the universe"的表述与 2026 年"framework developed in service of a real product"的表述，可以看出**优先级从"影响力"转向"可持续性与作品感"**——他不再试图靠框架本身赚钱，而是把框架放到一个能长期供血的真实产品组织里。

---

## 三、版本演进与取舍

| 版本 | 时间 | 核心取舍 | 一手理由关键词 |
|---|---|---|---|
| v0.1 | 2017-11-01 | Less → PostCSS/JS 之后的首个公开版 | 「推上有人问这是什么框架」 |
| v1.0 | 2019-05-13 | 配置从 500 行脚手架 → 可选 diff 文件 | 「配置是你改了什么，而不是整个设计系统长什么样」 |
| v2.0 | 2020-11-18 | 220 色 50–900；暗色模式；**放弃 IE11**；`@apply` 支持 variants | 「blame Tailwind」；「不该让 48px 字体配 1.5 行高成为默认」 |
| v2.1 | 2021-03 | JIT 并入主包 | 开发体积 10MB+ 不可持续 |
| v3.0 | 2021-12-09 | JIT 成默认并移除旧引擎；全色默认启用；**arbitrary values 正式化**；Play CDN | 「inline styles 长大后的样子」 |
| v3.4 | 2023-12-19 | `:has()` / `*` variant / `size-*` / `text-balance` / subgrid；扩展 opacity 至每 5 一档 | 「Hopefully that means a few less arbitrary values」 |
| v4.0 | 2025-01-22 | **Rust 重写（Oxide）**；CSS-first `@theme`；CSS 变量全量暴露；spacing 动态化；OKLCH 调色板；container queries 进核心；**Safari 16.4+** | 「it sounded fun」；「obscenely proud of every corner」；「fastest at the expense of anything」 |
| v4.1 | 2025-04-03 | 补旧浏览器降级层；text-shadow；mask API；`@source not` / `@source inline()` | 「degrade really poorly… even colors and shadows might not render at all」 |

---

## 四、言行一致 / 不一致案例

### 一致（言行相符）

1. **"utility-first 不是 utility-only"**——从 2017 长文到 2018 HN 回复到 2019 配置设计，一贯主张"先工具类、重复了再抽取组件"。`@apply` 与后续 `@utility` 指令都是这条主张的实现。
2. **"第一印象会很糟"的坦诚**——他从不美化 HTML 变丑这件事，反而主动前置承认（「holy hell this is the worst thing I've ever seen」），并把它当作"必须试用才能理解"的设计属性。
3. **大版本的克制**——v2/v3/v4 都把破坏性变更压到最小，且都配套了升级指南 + 升级工具。v2 自述"改名 2 个、移除 3 个、替换 2 个，30 分钟能升完"。
4. **"公开构建"的长期一致性**——从 2017 年 YouTube 直播 KiteTail、到 2024 年公开 v4 alpha、到 2026 年个人播客谈裁员，**透明度是他从未动摇过的策略**，且被验证为有效（赞助暴涨）。

### 不一致（值得记录的张力）

| 张力 | 一侧言行 | 另一侧言行 | 我的判定 |
|---|---|---|---|
| **约束驱动 vs 任意值** | D1：「Instead of 380 text colors, you end up with 10 or 12」——工具类的价值在于**逼你从策划列表选值** | v3 开放 arbitrary values 并称其为「inline styles 长大后的样子」；v4 进一步让 spacing 全动态化「stop guessing what values exist in your spacing scale」 | **真张力**。缓释手段是"升级工具自动把多余任意值收敛回刻度"，即承认会滥用但用工具治。`[推断]` 立场从"靠纪律约束"变成"靠供给丰富化挤出任意值" |
| **不做组件库 vs 官方卖组件** | D4：明确不做组件库依赖，主张"重复了再抽取" | D15：Catalyst 是「first fully-componentized, batteries-included」UI kit | **张力小于表面印象**。Catalyst 以**源码下载**方式分发（非依赖），并自称"disappearing UI kit"，与"组件是你自己的"主张一致。但"官方提供成套组件架构"仍与早期"组件库是反面教材"的姿态有距离 |
| **反对 `@apply` vs 持续投入 `@apply`** | 2020 推文：「basically only exists to trick people… You should almost never use it」 | v2 用大量工程量让 `@apply` 支持 variants；v4 新增 `@utility` 指令并让 `@apply` 可用 | **明确不一致**。官方劝退与官方增强同时进行 |
| **开源可持续 vs 商业线最终关闭** | D6（2018）：「I like to help people build awesome software」+ 三条变现路径规划；多次公开主张"开源要靠周边商业养活" | D21（2026）：关闭 Tailwind Plus / ui.sh 新注册，「we'll no longer be trying to grow the business around Tailwind」 | **最沉重的不一致，但成因是外部条件失效而非立场动摇**。需要区分：他从未说"商业化必然成功"，只说过"这是唯一可持续的路"——而这条路被 AI 削掉了 |
| **"免费内容养出定价权" vs 文档站成了单点故障** | D7：定价能力来自两年免费内容积累 | D19：文档站既是免费内容的载体，也是唯一的商业入口 → AI 掐断入口即全盘受损 | **系统性风险未被识别**。免费内容=获客=变现，三者全绑在一个会被 AI 绕过的页面上 |

---

## 五、明确拒绝清单

| # | 拒绝的事 | 时间 | 一手理由 |
|---|---|---|---|
| R1 | 拒绝把 Tailwind 做成**组件库**（含"一切皆插件"的极端方案） | 2017-11 / 2019-02 | 「utility-FIRST, not utility-ONLY」；「exposing everything as a plugin was a bad idea」 |
| R2 | 拒绝**语义化 class 命名**路线 | 2017-08 | 「CSS Zen Garden 走的是第一条路，Bootstrap/Bulma 走第二条。没有谁本质上"错"，取决于你更看重什么」 |
| R3 | 拒绝**为兼容而放弃现代 CSS**（v4 只支持 Safari 16.4+） | 2025-01 | 「designed for and tested on modern browsers」；「give this version the longest shelf-life possible」 |
| R4 | 拒绝**IE11** | 2020-11 | 「so you can tell the person in charge "sorry boss it's out of my hands, blame Tailwind"」 |
| R5 | 拒绝**推荐的 `@apply` 用法** | 2020-02 | 「You should almost never use it. Reuse your utility-littered HTML instead.」 |
| R6 | 拒绝**在 v4 核心代码里内建 JS 配置兼容层**（先拒后加，但拒绝"混进核心"） | 2024-03 | 「layered on to the clean core and not just mixed in with it」；「when v5 comes around I want that to be like deleting a file」 |
| R7 | 拒绝**"major 版本就可以随意破坏"** | 2024-06 | 「open source maintainers generally underappreciate the importance of backwards compatibility even with major version increases」 |
| R8 | 拒绝**merge llms.txt PR** | 2026-01 | 「I'm nervous to offer them without solving that problem first」——因为会加剧文档流量流失 |
| R9 | 拒绝**继续做 Tailwind 周边的商业增长** | 2026-09 | 「we'll no longer be trying to grow the business around Tailwind」 |
| R10 | 拒绝把**框架本身商业化 / 改许可** | 2026-09 | 「Everything will always be MIT-licensed」 |

> **没有找到的拒绝记录**（避免过度推断）：未检索到 Adam/Steve 明确拒绝**某次具体合作、收购或赞助**的一手声明。`[推断]` 2026 年初有社区建议"卖给 Vercel"，但 Wathan 未公开表态；他最终选择了 Shopify。

---

## 六、可直接落 CSS 的决策映射

> 本节把"设计决策"翻译成"具体 CSS 值"，供下游直接使用。
> **来源**：v4 官方主题文件 [`packages/tailwindcss/theme.css`](https://github.com/tailwindlabs/tailwindcss/blob/main/packages/tailwindcss/theme.css)（一手，本次已完整抓取）+ v2/v3/v4 官方博客（一手）。

### 6.1 Spacing：从"枚举刻度"到"单一变量 × 整数"

**v3 及以前**：spacing 是一个**枚举字典**（`0, px, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96`），key 与值都是手写映射。v2 之前甚至没有半像素档，`0.5/1.5/2.5/3.5` 是 v2 才加的「micro values」。

**v4**：只存一个基数，其余全部用 `calc()` 派生。`[一手]`

```css
@layer theme {
  :root { --spacing: 0.25rem; }   /* = 4px */
}
@layer utilities {
  .mt-8  { margin-top:    calc(var(--spacing) * 8); }   /* 2rem  = 32px */
  .w-17  { width:         calc(var(--spacing) * 17); }  /* 4.25rem = 68px */
  .pr-29 { padding-right: calc(var(--spacing) * 29); }  /* 7.25rem = 116px */
}
```

**给下游写 CSS 的结论**：
- 想对齐 Tailwind 的间距体系，只需记住 **`1 单位 = 0.25rem = 4px`**，任意整数可用。
- 自定义 `--spacing: 0.3rem` 即可整体缩放全站间距，**不需要改任何 class**。
- 这套"单一基数 × 整数"的做法，正是 D13（放开任意值）落地后的最直观产物：**v4 不再有"这个值不在刻度里"这个概念**。

### 6.2 Color：50–900 → 950，sRGB hex → OKLCH

**命名逻辑（v2 确立，v4 沿用）**`[一手]`：
- 色阶**从 50 到 950，共 11 阶**。v2 新增最浅的 `50`，v4 新增最深的 `950`。
- 数字大致对应**亮度递减**：`50` 近白、`500` 为基色、`900/950` 近黑。
- 灰色系有**多个色相变体**，v2 起提供 5 种；v4 共 **7 种中性色**：`slate`（蓝灰）、`gray`、`zinc`、`neutral`（纯灰）、`stone`（暖灰）、`mauve`、`olive`、`mist`、`taupe`。
- 彩色系齐全度为 **22 色**（red / orange / amber / yellow / lime / green / emerald / teal / cyan / sky / blue / indigo / violet / purple / fuchsia / pink / rose + 中性色）。

**v4 官方默认色阶（OKLCH 原值，一手，可直接复制）**：

```css
/* 蓝 —— 最常被引用的基色 */
--color-blue-50:  oklch(97.0% 0.014 254.604);
--color-blue-100: oklch(93.2% 0.032 255.585);
--color-blue-200: oklch(88.2% 0.059 254.128);
--color-blue-300: oklch(80.9% 0.105 251.813);
--color-blue-400: oklch(70.7% 0.165 254.624);
--color-blue-500: oklch(62.3% 0.214 259.815);
--color-blue-600: oklch(54.6% 0.245 262.881);
--color-blue-700: oklch(48.8% 0.243 264.376);
--color-blue-800: oklch(42.4% 0.199 265.638);
--color-blue-900: oklch(37.9% 0.146 265.522);
--color-blue-950: oklch(28.2% 0.091 267.935);

/* 中性色对比：slate（偏蓝）vs zinc（偏中性微紫）vs stone（偏暖） */
--color-slate-50:  oklch(98.4% 0.003 247.858);
--color-slate-500: oklch(55.4% 0.046 257.417);
--color-slate-950: oklch(12.9% 0.042 264.695);

--color-zinc-50:   oklch(98.5% 0 none);
--color-zinc-500:  oklch(55.2% 0.016 285.938);
--color-zinc-950:  oklch(14.1% 0.005 285.823);

--color-stone-50:  oklch(98.5% 0.001 106.423);
--color-stone-500: oklch(55.3% 0.013 58.071);
--color-stone-950: oklch(14.7% 0.004 49.25);
```

**观众最常用的红/绿/琥珀，供对照** `[一手]`：

```css
--color-red-500:   oklch(63.7% 0.237 25.331);
--color-red-600:   oklch(57.7% 0.245 27.325);
--color-green-500: oklch(72.3% 0.219 149.579);
--color-green-600: oklch(62.7% 0.194 149.214);
--color-amber-500: oklch(76.9% 0.188 70.08);
--color-amber-600: oklch(66.6% 0.179 58.318);
```

**透明度修饰符的底层实现（v4 决策直接映射到一行 CSS）** `[一手]`：

```css
.bg-blue-500\/50 {
  background-color: color-mix(in oklab, var(--color-blue-500) 50%, transparent);
}
```

> 这是 D16「用现代 CSS 特性简化内部实现」的一个具体兑现：v2/v3 时代每个透明度档要预生成独立的 `rgba()` 规则；v4 用 `color-mix()` 动态算，**因此可以支持任意百分比**。副作用是旧浏览器不认 `color-mix()`，于是有了 v4.1 的内联降级（D18）。

**为什么从 hex 转 OKLCH**（一手理由）：「We've upgraded the entire default color palette from `rgb` to `oklch`, taking advantage of the wider gamut to make the colors more vivid in places where we were previously limited by the sRGB color space.」并且明确**刻意保持视觉平衡不变**：「We've tried to keep the balance between all the colors the same as it was in v3, so even though we've refreshed things across the board, **it shouldn't feel like a breaking change** when upgrading.」`[一手]`

**《Refactoring UI》与色阶的对应**：书的第 5 章《Working with Color》给出三条与本映射直接相关的规则——「**Ditch hex for HSL**」「**You need more colors than you think**」「**Define your shades up front**」「你不该依赖在线调色板生成器给的 5 个色块」。官网明确写了这套逻辑：「the five swatches they end up giving you are **never enough** to build out a real interface」——所以 Tailwind 的 11 阶是**书里观点的代码化**。`[一手，refactoringui.com]`

### 6.3 字号 / 行高：成对出现

**v2 确立的设计决策（一手，官方博客给出完整表）**：每个 `text-*` 自带默认行高，覆盖不生效则用 `leading-*`。

```js
fontSize: {
  xs:   ["0.75rem",  { lineHeight: "1rem" }],
  sm:   ["0.875rem", { lineHeight: "1.25rem" }],
  base: ["1rem",     { lineHeight: "1.5rem" }],
  lg:   ["1.125rem", { lineHeight: "1.75rem" }],
  xl:   ["1.25rem",  { lineHeight: "1.75rem" }],
  "2xl":["1.5rem",   { lineHeight: "2rem" }],
  "3xl":["1.875rem", { lineHeight: "2.25rem" }],
  "4xl":["2.25rem",  { lineHeight: "2.5rem" }],
  "5xl":["3rem",     { lineHeight: "1" }],
  "6xl":["3.75rem",  { lineHeight: "1" }],
  "7xl":["4.5rem",   { lineHeight: "1" }],
  "8xl":["6rem",     { lineHeight: "1" }],
  "9xl":["8rem",     { lineHeight: "1" }],
}
```

**v4 改为用比例表达**（一手）——行高不再是硬编码值，而是 `calc(目标行高 / 字号)`：

```css
--text-xs: 0.75rem;   --text-xs--line-height: calc(1 / 0.75);      /* 16px / 12px */
--text-sm: 0.875rem;  --text-sm--line-height: calc(1.25 / 0.875);  /* 20px / 14px */
--text-base: 1rem;    --text-base--line-height: calc(1.5 / 1);     /* 24px / 16px */
--text-5xl: 3rem;     --text-5xl--line-height: 1;                  /* 大字号全用 1.0 */
```

对应《Refactoring UI》第 4 章的两条规则：「**Establish a type scale**」与「**Line-height is proportional**」——v4 的 `calc()` 写法是这句"行高是成比例的"的**字面实现**。

### 6.4 其他可直接抄的刻度（v4 一手值）

```css
/* 断点 */
--breakpoint-sm: 40rem;  /* 640px */
--breakpoint-md: 48rem;  /* 768px */
--breakpoint-lg: 64rem;  /* 1024px */
--breakpoint-xl: 80rem;  /* 1280px */
--breakpoint-2xl: 96rem; /* 1536px — v2 新增 */

/* 容器宽度（max-w-* 语义） */
--container-xs: 20rem; --container-sm: 24rem; --container-md: 28rem;
--container-lg: 32rem; --container-xl: 36rem; --container-2xl: 42rem;
--container-3xl: 48rem; --container-4xl: 56rem; --container-5xl: 64rem;
--container-6xl: 72rem; --container-7xl: 80rem;

/* 圆角 */
--radius-xs: 0.125rem; --radius-sm: 0.25rem; --radius-md: 0.375rem;
--radius-lg: 0.5rem;   --radius-xl: 0.75rem; --radius-2xl: 1rem;
--radius-3xl: 1.5rem;  --radius-4xl: 2rem;

/* 阴影：双层结构（对应《Refactoring UI》第 6 章 "Shadows can have two parts"） */
--shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);

/* 缓动与默认过渡 */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--default-transition-duration: 150ms;
--default-transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
```

> **注意**：`--default-transition-duration/function` 是 v2 的一项"减负"决策的产物——把 `transition duration-150 ease-in-out` 三件套压成一个 `transition`。官方原话：「so you only have to add **17 classes** to make a button instead of 19」。`[一手]`

### 6.5 v4 的一项"默认值纠错"，值得单独记

| 属性 | v3 默认 | v4 默认 | 一手理由 |
|---|---|---|---|
| `border` 颜色 | `gray-200` | `currentColor` | 「make it **harder to accidentally introduce a wrong gray** into your project if you're using `zinc` or `slate` or something else as your main gray」 |
| `ring` 宽度/颜色 | 3px 蓝色 | 1px `currentColor` | 「We find ourselves using the `ring-*` utilities as an alternative to borders, and using `outline-*` for focus rings」 |

`[一手，v4 alpha 公告]`

---

## 七、来源清单

### 一手来源（本人 / 官方）

1. **Adam Wathan**，《CSS Utility Classes and "Separation of Concerns"》，2017-08-07 — https://adamwathan.me/css-utility-classes-and-separation-of-concerns/
2. **Adam Wathan**，《Going Full-Time on Tailwind CSS》，2018-12-28 — https://adamwathan.me/going-full-time-on-tailwind-css/
3. **Adam Wathan**，《In Search of the Perfect Tailwind Config File Structure》，2019-02-04 — https://adamwathan.me/journal/2019/02/04/in-search-of-the-perfect-tailwind-config-file-structure/
4. **Adam Wathan**，《Tailwind CSS: From Side-Project Byproduct to Multi-Million Dollar Business》，2020-08-02 — https://adamwathan.me/tailwindcss-from-side-project-byproduct-to-multi-mullion-dollar-business/
5. **Adam Wathan**，Hacker News 评论（Tailwind 早期最完整的自述），2018-09-27 — https://news.ycombinator.com/item?id=18085071
6. **Adam Wathan**，X/Twitter 关于 `@apply` 的自白，2020-02-09 — https://twitter.com/adamwathan/status/1226511611592085504
7. **Tailwind CSS 官方博客**，《Tailwind CSS v2.0》，2020-11-18 — https://tailwindcss.com/blog/tailwindcss-v2
8. **Tailwind CSS 官方博客**，《Just-In-Time: The Next Generation of Tailwind CSS》，2021-03-15 — https://tailwindcss.com/blog/just-in-time-the-next-generation-of-tailwind-css
9. **Tailwind CSS 官方博客**，《Tailwind UI: Now with React + Vue support》，2021-04-14 — https://tailwindcss.com/blog/tailwind-ui-now-with-react-and-vue-support
10. **Tailwind CSS 官方博客**，《Tailwind CSS v3.0》，2021-12-09 — https://tailwindcss.com/blog/tailwindcss-v3
11. **Tailwind CSS 官方博客**，《Tailwind CSS v3.4》，2023-12-19 — https://tailwindcss.com/blog/tailwindcss-v3-4
12. **Tailwind CSS 官方博客**，《Introducing Catalyst: A modern UI kit for React》，2023-12-20 — https://tailwindcss.com/blog/introducing-catalyst
13. **Tailwind CSS 官方博客**，《Open-sourcing our progress on Tailwind CSS v4.0》，2024-03-06 — https://tailwindcss.com/blog/tailwindcss-v4-alpha
14. **Tailwind CSS 官方博客**，《Tailwind CSS v4.0》，2025-01-22 — https://tailwindcss.com/blog/tailwindcss-v4
15. **Tailwind CSS 官方博客**，《Tailwind CSS v4.1》，2025-04-03 — https://tailwindcss.com/blog/tailwindcss-v4-1
16. **Tailwind CSS 官方博客**，《Tailwind Labs is joining Shopify》，2026-09-09 — https://tailwindcss.com/blog/tailwind-is-joining-shopify
17. **Adam Wathan**，GitHub 评论（拒绝 llms.txt PR），2026-01-07 — https://github.com/tailwindlabs/tailwindcss.com/pull/2388#issuecomment-3717222957 （亦经 GitHub API 验证：reactions 2749）
18. **Adam Wathan**，Adam's Morning Walk Ep.5《We had six months left》，2026-01-07 — https://adams-morning-walk.transistor.fm/episodes/we-had-six-months-left
19. **Adam Wathan**，The Tuple Podcast 访谈转录，2024-06-10 — https://podcast.tuple.app/episodes/adam-wathan/transcript
20. **Adam Wathan**，JS Party #155《The Tailwind beneath my wings》转录，2020-12-11 — https://changelog.com/jsparty/155
21. **Tighten / Matt Stauffer**，Pragmatic AI Ep.2《AI's Impact on Open Source Funding》，2026-02-18 — https://tighten.com/insights/pragmatic-ai-ep2-adam-wathan-ai-impact-on-open-source-funding
22. **Indie Hackers Podcast #098**（Adam Wathan，Refactoring UI 起源与 trip-wire product 方法论），2019-06-21 — https://www.indiehackers.com/podcast/098-adam-wathan-of-refactoring-ui
23. **Refactoring UI 官网**（产品结构、分工、设计观点），访问于 2026-09-17 — https://refactoringui.com/
24. **tailwindlabs/tailwindcss**，`packages/tailwindcss/theme.css`（v4 完整设计令牌原值），访问于 2026-09-17 — https://github.com/tailwindlabs/tailwindcss/blob/main/packages/tailwindcss/theme.css
25. **Tailwind CSS 官方文档**，Compatibility / Upgrade guide（浏览器要求），访问于 2026-09-17 — https://tailwindcss.com/docs/compatibility

### 二手来源（已交叉验证，仅用于补足时间线 / 数据或转引原话）

26. **marketingexamples.com**，《Refactoring UI: A lesson in high prices》——转引 Adam/Steve 在 The Art of Product Podcast Ep.70 的原话与销售数据（$79/$149、78% 选高价档、$1.35M）— https://marketingexamples.com/landing-page/pricing
27. **PPC Land**，《Tailwind CSS lays off 75% of engineering team as AI impacts revenue》，2026-01-08（含完整时间线与 $299 定价、赞助年收入估算）— https://ppc.land/tailwind-css-lays-off-75-of-engineering-team-as-ai-impacts-revenue/
28. **CSS-Tricks / Zell Liew**，《Tailwind's @apply Feature is Better Than it Sounds》，2025-04-10（转引 2020 推文原文，并记录社区对"为什么劝退 @apply"的持续困惑）— https://css-tricks.com/tailwinds-apply-feature-is-better-than-it-sounds/
29. **UI Breakfast Podcast Ep.154**（Adam + Steve 联合访谈，发布于 2020-01-11）— https://uibreakfast.com/154-refactoring-ui-with-adam-wathan-and-steve-schoger/

**渠道数**：一手 25 个 + 二手 4 个 = **29 个不同渠道**，其中一手占比 ≈ **86%**。

---

## 八、信息缺口

| # | 缺口 | 影响 | 建议下一步 |
|---|---|---|---|
| G1 | **Refactoring UI 的完整价目与学生折扣规则** —— 官网页面过长，抓取时在第 8 节（字体建议）后被截断，未取到定价区与 FAQ 原文 | D7 的"定价策略（含学生折扣）"子项只有 $79/$149 双档的二手转引，缺一手确认 | 用浏览器直接打开 https://refactoringui.com/ 滚动至 `#get-refactoring-ui` 抓取定价区；或抓取 Gumroad 商品页 https://refactoringui.gumroad.com/l/MyQsm |
| G2 | **"先做视频课程还是先做书"的一手决策记录** —— 官网显示视频教程是"包"的一部分，但**未找到他们讨论"顺序"的自述** | 无法确认是否存在过"先视频后书"的取舍讨论 | 检索 The Art of Product Ep.70 与 UI Breakfast Ep.154 的完整音频/转录 |
| G3 | **v3 的 hex 色值表** —— 本次只成功抓到 v4 的 OKLCH 全表；v3 的 `config.full.js`（hex/sRGB）多次抓取失败（超时 / 网络错误） | 6.2 节只能给 v4 OKLCH 值与 v2 结构事实，无法做 v2→v3→v4 的逐值对比 | 抓取 https://unpkg.com/tailwindcss@3.4.17/stubs/config.full.js |
| G4 | **Adam 就"arbitrary values 是否违背约束驱动"的一手反思** —— 未找到 | D13 的"事后反思"字段只能标注 [推断] | 检索 v3.0 发布后的访谈（如 Whiskey Web and Whatnot Ep.56、devtools.fm Ep.93） |
| G5 | **Tailwind UI → Tailwind Plus 改名的准确日期与官方理由** —— 官方博客列表可见该文，但具体 URL 未猜中（多次 404） | 版本时间线缺一项 | 从 https://tailwindcss.com/blog 列表页取得准确 slug |
| G6 | **v4.0 的 GitHub release notes 原文** —— 抓取超时；已用官方博客与 alpha 公告替代 | 破坏性变更清单以官方博客为准，未含 CHANGELOG 层的细节 | 抓取 https://github.com/tailwindlabs/tailwindcss/releases/tag/v4.0.0 |
| G7 | **Startups For the Rest of Us #825（2026-03-24）的转录** —— 站点抓取失败 | 缺一份 Adam 谈"创始人心理 / 健身 / AI 竞争"的一手材料，本可充实 D20 的反思层 | 从 Apple Podcasts 或 podscan.fm 取得转录 |
| G8 | **Steve Schoger 本人的决策视角** —— 本文件几乎所有一手引述都来自 Adam。Steve 在《Refactoring UI》的设计侧决策（配色方法论、组件画廊的组织逻辑）多为官网描述而非他本人自述 | 决策主体偏向"Adam 单人视角"，Steve 的独立决策记录稀薄 | 检索 Steve Schoger 的 X/Twitter 长文、YouTube 频道与设计相关访谈 |
| G9 | **Catalyst 的实际销售表现** —— 无公开数据 | D15 的"代价/结果"只能用第三方批评替代销售数据 | 无公开渠道；标注为不可得 |
| G10 | **"未找到一手拒绝记录"的阴性结论** —— R10 之外，未见 Adam/Steve 明确拒绝具体合作/收购的一手声明 | 拒绝清单可能不完整 | 检索 2026 年 1–9 月的 X 时间线归档 |

---

## 九、一句话总纲（给下游提炼用）

> 这两人的决策链条，可以概括为**同一条信念在四个层面的四次执行**：
> **"把设计决策变成有限、可复用的选项"**——
> 在 CSS 层是 utility-first（D1/D4），在配置层是"默认值优先"（D5），在产品层是"卖设计而非卖代码"（D8/D9），在内核层是"用单一变量派生整个世界"（D16）。
>
> 而它的失效也来自同一个结构：**当"选项"的入口（文档站）被 AI 绕过，整套价值链就失去了收银台**（D19/D20/D21）。
> Adam 的诚实之处在于，他把这场失败从头到尾讲了下来——包括那句最难说的「**every second I spend trying to do fun free things for the community like this is a second I'm not spending trying to turn the business around**」。
