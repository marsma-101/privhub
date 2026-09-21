# 01 · 著作与系统性长文

> 调研者：子智能体 01｜调研时间：2026-09-17｜一手占比：约 88%（34 个引用来源中 30 个为他本人署名文章 / 他主持的官方文档 / 他名下仓库原文）

## 信源分级约定

- **[一手]** = 他本人署名写作、他创建的官方文档站（cube.fyi）、他名下或他工作室名下仓库原文、他站点的官方分类页
- **[二手]** = 别人写他的介绍 / 平台方撰写的作者简介
- **[推断]** = 我据此推的，本文中标明

**黑名单执行情况**：知乎、微信公众号、百度百科/百度知道 —— 全程未使用，亦未作为检索线索。

---

## 一、核心著作与长文清单

### 1.1 方法论与官方文档

| 标题 | 类型 | 年份 | URL | 可信度 | 核心论点一句话 |
|---|---|---|---|---|---|
| CUBE CSS（方法论首发长文） | 奠基长文 | 2020-05-26 | https://piccalil.li/blog/cube-css/ | [一手] | 用 CSS 自身的层叠与继承 + 少量控制结构来组织样式，而不是绕开 CSS；目标是「发尽量少的 CSS」 |
| CUBE CSS 官方文档站（首页 + 8 个子页） | 官方文档 | 2020 起持续 | https://cube.fyi/ ｜ /principles ｜ /css ｜ /composition ｜ /utility ｜ /block ｜ /exception ｜ /grouping ｜ /examples ｜ /resources | [一手] | CUBE = Composition / Utility / Block / Exception，是对 CSS 的「扩展」而非「重造」 |
| Build a dashboard with CUBE CSS | 长篇教程 | 2020-07-29 | https://piccalil.li/blog/build-a-dashboard-with-cube-css/ | [一手] | 用一套完整银行 dashboard 走一遍 CUBE 全流程，含 Gorko 令牌生成与 modern-css-reset |
| A CSS project boilerplate | 工程落地长文 | 2024-02-12 | https://piccalil.li/blog/a-css-project-boilerplate/ | [一手] | Set Studio 2024 年的 CSS 系统骨架：CUBE + 设计令牌 JSON + PostCSS + Tailwind **仅作 utility 生成器** |
| cube-boilerplate（仓库） | 官方 starter | 2024-01 创建 | https://github.com/Set-Creative-Studio/cube-boilerplate ｜ README: https://raw.githubusercontent.com/Set-Creative-Studio/cube-boilerplate/main/README.md | [一手] | 「这是一个**对我们**有效的 boilerplate，请不要提改动建议」；MIT，265★，已设为 template |

### 1.2 课程

| 标题 | 类型 | 年份 | URL | 可信度 | 核心论点一句话 |
|---|---|---|---|---|---|
| Complete CSS | 付费课程（51 课 / 8 模块） | 2024-11 上线 | https://piccalil.li/complete-css/ | [一手] | CSS 之外的核心：沟通、规划、反馈 —— 「软技能」才是资深前端的门槛 |
| Complete CSS · 免费试读课 #6 | 课程正文 | 2024 | https://piccalil.li/complete-css/lessons/6 | [一手] | 「做浏览器的导师，不要做它的微观管理者」；理想视口不存在 |
| Complete CSS · 免费试读课 #9 | 课程正文 | 2024 | https://piccalil.li/complete-css/lessons/9 | [一手] | BEM 的 Modifier 是类名制 → 不保证谁赢；CUBE 的 Exception 用 data attribute → 状态**有限**、唯一 |
| Complete CSS · 免费试读课 #10 | 课程正文 | 2024 | https://piccalil.li/complete-css/lessons/10 | [一手] | 渐进增强靠 CSS 的「宽容的声明式语言」特性天然成立；不要用 `@supports` 兜底新特性 |
| Learn CSS（Google / web.dev） | 免费课程（他写第一版的主体） | 2021 | https://web.dev/learn/css/ | [二手/官方描述] | 见 §11 —— **web.dev 本会话抓取失败，未能取到一手页面** |
| Learn Eleventy From Scratch | 免费课程（已开源） | 2021-10 开源 | https://learneleventyfromscratch.com/ ｜ https://github.com/Andy-set-studio/learneleventyfromscratch.com | [一手] | 前端构建部分约 1/3 围绕 CUBE CSS 展开（cube.fyi/examples 自述） |

### 1.3 CSS 基础 / 系统性长文（他本人署名）

| 标题 | 年份 | URL | 可信度 | 核心论点一句话 |
|---|---|---|---|---|
| Managing Flow and Rhythm with CSS Custom Properties（24 ways） | 2018-12-07 | https://24ways.org/2018/managing-flow-and-rhythm-with-css-custom-properties/ | [一手] | `.flow > * + *` + `--flow-space`：用自定义属性做「上下文可覆盖的节奏」，替代 modifier 类 |
| CSS Logical Properties | 2020-03-13 | https://piccalil.li/blog/css-logical-properties/ | [一手] | 用 `margin-inline-start` 替代 `margin-left`，把方向控制权交还给文档/用户 |
| Visually hide an element with CSS | 2020-08-04 | https://piccalil.li/blog/visually-hidden/ | [一手] | `display:none` 会连辅助技术一起藏掉；`.visually-hidden` 两者兼顾 |
| Load all focusable elements with JavaScript | 2021-01-13 | https://piccalil.li/blog/load-all-focusable-elements-with-javascript/ | [一手] | 焦点管理的实用工具函数 |
| Use transparent borders and outlines to assist with high contrast mode | 2021-03-11 | https://piccalil.li/blog/use-transparent-borders-and-outlines-to-assist-with-high-contrast-mode/ | [一手] | 用透明边框/轮廓同时满足「去默认焦点环」与 Windows 高对比度模式 |
| CSS Frameworks, hype and dogmatism | 2021-01-25 | https://piccalil.li/blog/css-frameworks-hype-and-dogmatism/ | [一手] | 反教条：**「如果它能用，它就是对」**；同时点名 Tailwind 首页文案「完全且几乎可笑地错误」 |
| My favourite 3 lines of CSS | 2023-02-06 | https://piccalil.li/blog/my-favourite-3-lines-of-css/ | [一手] | `.flow > * + * { margin-block-start: var(--flow-space, 1em) }` —— 「我做完这个就可以退休了」 |
| A (more) Modern CSS Reset | 2023-09-18 | https://piccalil.li/blog/a-more-modern-css-reset/ | [一手] | 旧版归档，新版更克制；结尾反过来说：「浏览器这么好了，你大概根本不需要 reset」 |
| How we're approaching theming with modern CSS | 2024-04-02 | https://piccalil.li/blog/how-were-approaching-theming-with-modern-css/ | [一手] | 三层：Foundations（语义 HTML）→ Skeletal（全局 CSS + 自定义属性）→ Flair（主题）；**「语义 CSS 才是长期成功的关键，不是原子样式表（ASS）」** |
| It's about time I tried to explain what progressive enhancement actually is | 2024-07-03 | https://piccalil.li/blog/its-about-time-i-tried-to-explain-what-progressive-enhancement-actually-is/ | [一手] | 渐进增强是「为一层一层的浏览器能力自动开关」而设计；不是反 JS，是把 JS 降级为「nice to have」 |
| A handful of reasons JavaScript won't be available | 2024-07-31 | https://piccalil.li/blog/a-handful-of-reasons-javascript-wont-be-available/ | [一手] | 15 条 JS 不可用的现实理由（隧道、广告拦截、IT 策略、Opera Mini…） |
| How I build a button component | 2024-09-18 | https://piccalil.li/blog/how-i-build-a-button-component/ | [一手] | 整个组件由 `--button-*` 自定义属性驱动；**「我偏好用 data attribute 取得更有限的状态变化，而不是冒元素挂多个互相冲突的类的风险」** |
| Technologies and frameworks we use in our design studio | 2025-01-13 | https://piccalil.li/blog/technologies-and-frameworks-we-use-in-our-design-studio/ | [一手] | 自曝「被贴 Tailwind hater 标签」的误读；明确 Tailwind **只**当 utility 生成器用；CUBE 是唯一不变量 |
| If it works, it's right | 2025-03-27 | https://piccalil.li/blog/if-it-works-its-right/ | [一手] | 公开不同意 Alex Riviere 的 grid-first 路线，但不判定对方错；「不要接受绝对答案」 |
| The interpolate-size property is a great example of progressive enhancement | 2025-08-26 | https://piccalil.li/blog/the-interpolate-size-property-is-a-great-example-of-progressive-enhancement/ | [一手] | 浏览器支持差 ≠ 不能用，靠渐进增强覆盖大多数情况 |
| While you're fixing the fun stuff, fix the important stuff too | 2025-09-09 | https://piccalil.li/blog/while-youre-fixing-the-fun-stuff-fix-the-important-stuff-too/ | [一手] | 修 hover 的活里顺手修语义与无障碍卡片；引 Heydon《Inclusive Components》 |

### 1.4 他站长文（第三方平台）

| 平台 | 内容 | 年份 | URL | 可信度 |
|---|---|---|---|---|
| Smashing Magazine | Things You Can Do With CSS Today（1/2 篇） | 2021-02-01 | https://www.smashingmagazine.com/2021/02/things-you-can-do-with-css-today/ | [一手] |
| Smashing Magazine | What Can Be Learned From The Gutenberg Accessibility Situation?（2/2 篇） | 2018-12-07 | https://www.smashingmagazine.com/2018/12/gutenberg-accessibility-situation/ | [一手] |
| CSS-Tricks | 多篇（含 Consistent, Fluidly Scaling Type and Spacing 2021-12-16；Learning to Simplify 2020-12-16；The Importance of Investing in Soft Skills in the Age of AI 2025-01-06） | 2018–2025 | https://css-tricks.com/author/andybell/ | [一手]（作者页本身为 [二手]） |
| 24 ways | Managing Flow and Rhythm（唯一一篇） | 2018 | 同上 | [一手] |
| Bell.bz（个人站） | I used Tailwind for the U in CUBE CSS and I liked it ｜ I don't hate it, though | — | https://bell.bz/i-dont-hate-it-though/ （被 piccalil.li 两篇文章引用） | [一手]（**未能直接抓取：cross-origin redirect 循环**） |

### 1.5 仓库与开源资产

| 名称 | 归属 | 年份 | URL | 可信度 | 状态 |
|---|---|---|---|---|---|
| cube-boilerplate | Set-Creative-Studio | 2024-01 | https://github.com/Set-Creative-Studio/cube-boilerplate | [一手] | 265★ / 57 fork / MIT / template / 2024-04 后未再 push |
| modern-css-reset | Andy-set-studio | 2019-10 | https://github.com/Andy-set-studio/modern-css-reset | [一手] | 2960★ / 419 fork / MIT / **已 archived** |
| gorko | Andy-set-studio | 2020-05 | https://github.com/Andy-set-studio/gorko | [一手] | Sass 令牌类生成器，454★ |
| goron | Andy-set-studio | 2019-12 | https://github.com/Andy-set-studio/goron | [一手] | JSON+Node 版令牌类生成器，134★ |
| hylia | Andy-set-studio | 2019 | https://github.com/Andy-set-studio/hylia | [一手] | 轻量 Eleventy starter |
| learneleventyfromscratch.com | Andy-set-studio | 2021 | 见上 | [一手] | 129★ |
| cube-css-dashboard | piccalil-li | 2020 | https://github.com/piccalil-li/cube-css-dashboard | [一手] | 教程配套 starter |
| Every Layout | Heydon Pickering & Andy Bell | 2019（现第 3 版） | https://every-layout.dev/ | [一手/官方] | **商业产品**（$69，EPUB + custom elements），未找到公开源码仓库 |

> 说明：任务里点名的 `cube-css`「官方 starter」与 `a-modern-css-reset` 仓库名，经 GitHub API 全量核对后与事实有出入，见 §11。

---

## 二、反复出现的核心论点（≥3 次出现 = 真信念）

### 2.1 「给浏览器规则，不要微观管理它」（出现 ≥7 次 —— 最核心）

| 出现场景 | URL | 原文摘录 |
|---|---|---|
| CUBE 官方文档 · Principles | https://cube.fyi/principles | "The browser is **hinted**, rather **micro-managed** to do what **it knows best** in the context that it finds itself in." |
| CUBE 官方文档 · Composition | https://cube.fyi/composition | "the browser should be hinted with flexible CSS rules, rather than micro-managed with strict CSS rules … we are _suggesting_ layout rules and **allowing the browser to make the right judgements**" |
| CUBE 官方文档 · Block | https://cube.fyi/block | "This all ties-back to **hinting the browser with flexible rules, rather than micro-managing it**." |
| Complete CSS 课程 · 第 6 课（标题即此语） | https://piccalil.li/complete-css/lessons/6 | "This is the key: instead of **forcing the browser to do what** _**you**_ **want**, give it a sensible ruleset and let it determine what's best for the user based on their actual circumstances." |
| Complete CSS 课程主页 | https://piccalil.li/complete-css/ | "You'll gain a deep understanding of how to [be the browser's mentor rather than its micromanager]" |
| piccalil.li 作者页（他本人撰写的自我介绍） | https://piccalil.li/author/andy-bell | "…being [the browser's mentor, not its micromanager](https://buildexcellentwebsit.es/)" |
| If it works, it's right | https://piccalil.li/blog/if-it-works-its-right/ | "I know **being the browser's mentor, not its micromanager** isn't for everyone" |

**性质**：这是他的**总纲**，CUBE 四层与渐进增强都由它派生。

---

### 2.2 「我们为所有人构建，不只为自己和同类」（出现 ≥4 次）

| 出现场景 | URL | 原文摘录 |
|---|---|---|
| 渐进增强长文 | https://piccalil.li/blog/its-about-time-i-tried-to-explain-what-progressive-enhancement-actually-is/ | "**We build for everyone**. Not just for ourselves or our peer groups." |
| Complete CSS 第 10 课（同句出现两次） | https://piccalil.li/complete-css/lessons/10 | "The most important thing to remember is: > We build for everyone. Not just for ourselves or our peer groups." |
| Every Layout 官方作者简介 | https://every-layout.dev/ | "Andy is a designer and front-end developer who founded Set Studio: an agency who specialise in producing stunning websites that work for _everyone_." |
| CUBE 官方文档 · Principles | https://cube.fyi/principles | "By creating a **minimum viable experience**, we account for very old browsers by default." |

---

### 2.3 「如果它能用，它就是对」（Rachel Andrew 语，他反复引用 ≥4 次）

| 出现场景 | URL | 原文摘录 |
|---|---|---|
| CSS Frameworks, hype and dogmatism（2021） | https://piccalil.li/blog/css-frameworks-hype-and-dogmatism/ | "to paraphrase the great Rachel Andrew: **if it works, it is right**" |
| Technologies and frameworks we use in our design studio（2025） | https://piccalil.li/blog/technologies-and-frameworks-we-use-in-our-design-studio/ | "To paraphrase Rachel Andrew: > **If it works, it's right**" |
| If it works, it's right（2025，标题即此语） | https://piccalil.li/blog/if-it-works-its-right/ | "Heck, I even titled this article as **if it works, it's right**! I can't for the life of me remember when or where I heard Rachel say that — I feel like it might have been when we were working on Learn CSS together" |
| CUBE CSS 首发长文结尾 | https://piccalil.li/blog/cube-css/ | "**Any method is extremely valid for your context** and if this is how you write your CSS, **keep doing what works for you and your team**." |
| CUBE 官方文档 · Principles | https://cube.fyi/principles | "**Any technology will do** … the principles and methodology of CUBE CSS remain" |

**注**：这条与 §10.4 记录的反教条/教条张力并存，原样保留。

---

### 2.4 「发尽可能少的 CSS」（出现 ≥4 次）

| 出现场景 | URL | 原文摘录 |
|---|---|---|
| CUBE CSS 首发长文 | https://piccalil.li/blog/cube-css/ | "The end-goal is **shipping as little CSS as possible**—leaning heavily into progressive enhancement and modern techniques." |
| CUBE 官方文档 · Principles | https://cube.fyi/principles | "Without polyfills and hacks, we **produce much less CSS** by using the progressive core of the CUBE CSS methodology." |
| CUBE 官方文档 · CSS | https://cube.fyi/css | "It's **progressive enhancement in action** and enables us to write as little CSS as possible." |
| 主题化长文 | https://piccalil.li/blog/how-were-approaching-theming-with-modern-css/ | "This should by far, be the **lightest layer** too. All the hard work has already been done at this point!" |
| Build a dashboard with CUBE CSS | https://piccalil.li/blog/build-a-dashboard-with-cube-css/ | "This is the magic of CUBE CSS: **we can do a lot with very little**." |

---

### 2.5 「大部分工作交给全局样式，剩下的只做局部偏离」（出现 ≥5 次）

| 出现场景 | URL | 原文摘录 |
|---|---|---|
| CUBE CSS 首发长文 | https://piccalil.li/blog/cube-css/ | "The core of this methodology is that **most of the work is already done for you with global and high-level styles**." |
| CUBE 官方文档 · Principles | https://cube.fyi/principles | "we assign **most of the style rules at a higher level**, which are supported by composition styles, utilities, then finally, blocks and exceptions." |
| CUBE 官方文档 · Block | https://cube.fyi/block | "by the time you get to the block-level in CUBE CSS, **most of the work has already been done**"（该页出现 2 次） |
| CUBE 官方文档 · Utility | https://cube.fyi/utility | "Applying our design tokens like this allows us to **define things once and apply them everywhere**" |
| Build a dashboard 教程 | https://piccalil.li/blog/build-a-dashboard-with-cube-css/ | "So much of the design implementation is already done." |

---

### 2.6 「设计系统是外交工作，不是组件库」（出现 ≥3 次）

| 出现场景 | URL | 原文摘录 |
|---|---|---|
| CUBE CSS 首发长文 · Composition 章 | https://piccalil.li/blog/cube-css/ | "**Design system work is actually diplomacy work**, a lot of the time." ／ "these approaches are less design systems, but more **component libraries** that solve a much narrower cohort of problems" |
| CUBE CSS 首发长文（同上） | 同上 | "the **LEGO blocks analogy isn't that relevant** in the wider context of design systems" |
| CUBE 官方文档 · Composition | https://cube.fyi/composition | "Even when you are working with tiny, reusable components, you have to, at some point, **consider how they will be applied in a larger context**" |
| 渐进增强长文 | https://piccalil.li/blog/its-about-time-i-tried-to-explain-what-progressive-enhancement-actually-is/ | "My recommendation was almost never to embrace a certain framework to 'fix problems', but instead to **build better production processes between designers and developers** … **The tech choices simply are not important until that is sorted.**" |
| Complete CSS 第 6 课 | https://piccalil.li/complete-css/lessons/6 | "whatever you see in Figma, Sketch etc, is an **impression of a website**. It is **not a source of truth**." |

---

### 2.7 「CSS 的自定义属性是配置层，不只是变量」（出现 ≥4 次）

| 出现场景 | URL | 原文摘录 |
|---|---|---|
| 24 ways（2018，最早） | https://24ways.org/2018/managing-flow-and-rhythm-with-css-custom-properties/ | "custom properties also **participate in the cascade**, so we can utilise specificity to change it if we need it" |
| My favourite 3 lines of CSS | https://piccalil.li/blog/my-favourite-3-lines-of-css/ | "I hope you've seen how damn powerful CSS Custom Properties are. **They're certainly more than just CSS variables**, that's for sure." |
| 主题化长文 · Progressive Custom Properties 章 | https://piccalil.li/blog/how-were-approaching-theming-with-modern-css/ | "The power behind this system is in Custom Properties. **They do two things that are magical**: 1. They are affected by the cascade and specificity … 2. You can pass a default value to the `var` function" |
| How I build a button component | https://piccalil.li/blog/how-i-build-a-button-component/ | 整个组件「配置块」：`--button-padding` / `--button-bg` / `--button-hover-color` / `--button-radius` …；"we should instead power those properties with variables" |
| While you're fixing the fun stuff（2025） | https://piccalil.li/blog/while-youre-fixing-the-fun-stuff-fix-the-important-stuff-too/ | "We have a `--transform-size` custom property and by multiplying that by `-1` — using `calc()` — it becomes a negative value" |

---

## 三、CUBE CSS 四层的确切定义与边界

**命名结构**：CUBE = **C**omposition · **U**tility · **B**lock · **E**xception；**CSS** = Cascading Style Sheets（就是这门语言本身）。

- "The name of this methodology gives the game away straight away; it's an **extension of CSS** rather than a reinvention of CSS."（https://cube.fyi/ ，[一手]）
- 与 BEM 的关系："CUBE CSS takes most of its inspiration from BEM … a step back from BEM's principles. This is because the core of BEM is **blocks**, whereas with CUBE CSS, **the core is CSS**."（https://cube.fyi/ ，[一手]）
- **应用顺序**（从宽到窄）：global CSS → Composition → Utility → Block → Exception。

### 3.1 C — Composition（构图 / 骨架）

| 项 | 内容 |
|---|---|
| **定义** | "the composition layer **extends CSS** and is very much a **high level macro view**—even when applied in smaller, component-level contexts." |
| **职责** | "create flexible, component-agnostic layout systems that support as many variants of content as possible" |
| **边界（该做）** | ① 提供高层、灵活的布局 ② 决定元素之间如何互动 ③ 创造一致的 flow 与 rhythm |
| **边界（不该做）** | ① 提供视觉处理（颜色、字体样式）② 提供装饰样式（阴影、图案）③ 强迫浏览器生成像素级完美布局而非灵活/渐进布局 |
| **为什么这么分** | 因为「微观优化」常常输给「更宽的构图」："I've found over many approaches, within many projects over the years, that **wider composition often trumps micro-optimisations**"。组件总会落到更大的上下文里 |
| **他给的例子** | ① 经典 hero + 3 列卡片骨架 —— 把任意组件塞进骨架都不会违和；② `.flow > * + * { margin-top: var(--flow-space, 1em) }`，在组件**内部**也当 composition 用（与 Every Layout 的 The Stack 几乎一致） |
| **出处** | https://cube.fyi/composition ｜ https://piccalil.li/blog/cube-css/ |

### 3.2 U — Utility（工具类）

| 项 | 内容 |
|---|---|
| **定义** | "a **CSS class that does one job and does that one job well**"。通常只声明一个属性，也可以是一小组**相关**属性 |
| **职责** | ① 施加单一属性或一小组相关属性，形成可复用的 helper ② **扩展设计令牌**以维持单一真源 ③ 把重复性从 CSS 抽象到 HTML 里 |
| **边界（不该做）** | ① 定义一大组**不相关**属性 —— 例如同时定义 `color`、`font-size`、`padding` 的「utility」应该是 Block；② 当**特异性 hack** 用 —— 例如全 `!important` 长期必出问题 |
| **为什么这么分** | "If utilising the cascade is the backbone of this methodology, then **utilities are the shoes that help it to walk comfortably**."（这是 CUBE 四层里**唯一允许把表现搬进 HTML** 的层，也是与原子类路线的交界处） |
| **他给的例子** | `.wrapper { margin-inline: auto; padding-inline: 1rem; max-width: 60rem; }`；令牌类 `.bg-primary` / `.color-base`；`.visually-hidden`；`.radius` |
| **出处** | https://cube.fyi/utility ｜ https://piccalil.li/blog/cube-css/ ｜ https://piccalil.li/blog/build-a-dashboard-with-cube-css/ |

### 3.3 B — Block（块 / 组件）

| 项 | 内容 |
|---|---|
| **定义** | "a **skeletal component or organisational structure**"。对应常见 UI：卡片、按钮 |
| **为什么是「骨架」** | 到了 block 这一层，全局 CSS / composition / utility **已经做完大部分工作**；block 的职责因此"less like BEM, where _everything_ is styled inside a block, but instead … a mechanism of **running against the grain** of the global CSS, composition and utility layers"，产生一小撮**只在该上下文生效**的规则 |
| **元素语法** | **没有强制语法**。BEM 的 `.block__element` 不是必须的；block 内部是 **open season**（"Inside a block, you can **do whatever you want**"），因为父 block 类给了你一个额外的特异性点。可直接打 HTML 标签（`.my-block img`），唯一要求是"**consistency**" |
| **边界（该做）** | ① 扩展 global/composition/utility 已完成的工作 ② 在一小组内应用一组设计令牌 ③ 创建命名空间或特异性提升，控制特定上下文 |
| **边界（不该做）** | ① 长到超过「一小撮规则」（**最多 80–100 行**）② 解决一个以上的上下文问题（例如把 card 和 button 塞同一个文件） |
| **他给的例子** | `.site-head`（自动换行 flex + 给 `h1` 加 margin 做力场）；`.user`（`inline-grid` + `max-content`） |
| **出处** | https://cube.fyi/block ｜ https://piccalil.li/blog/cube-css/ |

### 3.4 E — Exception（例外）

| 项 | 内容 |
|---|---|
| **定义** | "An exception is **a deviation from the rules outlined in a block**." 通常是**状态变化**（例如 "reversed"、"inactive"） |
| **实现手段（硬性）** | **data attribute**，例如 `<article class="card" data-state="reversed">`，CSS 写作 `.card[data-state='reversed'] { display: flex; flex-direction: column-reverse; }` |
| **为什么用 data attribute** | ① 例外应当只在**例外情况下**出现（"the clue is in the name"）② 例外常由**外部因素（例如 JavaScript）**触发，需要一个 **CSS 与 JS 都能高效使用**的机制 ③ 便于把例外放进**有限状态机（finite state machine）**的语境里考虑（文档指向 XState）④ 目标是 **clarity**，把例外分离到 data attribute 正好做到这点 |
| **边界（该做）** | ① 提供一个**简洁**的 block 变体 ② 使用 data attribute |
| **边界（不该做）** | ① 把 block 变到**认不出来** —— 那就该新建一个 block ② **使用 CSS 类** |
| **他给的例子** | 卡片 `data-state="reversed"`（图片翻到底部）；按钮 `data-button-variant="primary"` / `data-button-variant="positive"` / `data-button-variant="negative"` / `data-ghost-button` / `data-button-radius="hard"` |
| **出处** | https://cube.fyi/exception ｜ https://piccalil.li/blog/cube-css/ ｜ https://piccalil.li/blog/how-i-build-a-button-component/ |

### 3.5 附：Grouping（分组，非字母但成体系）

- 用方括号分组：`class="[ card ] [ section box ] [ bg-base color-primary ]"`
- 推荐顺序：① 主 block 类 ② 后续 block 类 ③ 标准 utility 类 ④ 设计令牌 utility 类
- "It doesn't have to be square brackets"（可用竖线 `card | section box | bg-base`）
- 目的："Whether you choose square brackets, pipes or even unicorns: the priority is **consistency and ease-of-reading**."
- 出处：https://cube.fyi/grouping ，[一手]

---

## 四、Exception「必须显式命名」规则

### 4.1 先说结论

我**没有找到**英文原文里与「必须显式命名」逐字对应的表述。他实际写下来的是一条**更硬、也更窄**的规则组合：

> **规则组：**「（1）Exception 必须用 data attribute 承载；（2）Exception 不得使用 CSS 类。」

中文语境里的「必须显式命名」，我判断是对下面这套逻辑的概括 —— **状态必须被"点名"在属性值里，而不是靠往 class 列表里再挂一个类来暗示**。属于 [推断]，但推断依据充分（三条一手证据链，见下）。

### 4.2 三条一手证据（他本人所写）

**证据 A —— cube.fyi 官方文档 · Exception 页（最硬的规则表述）** [一手]
URL: https://cube.fyi/exception

> "The last part of CUBE CSS is exceptions. An exception is **a deviation from the rules outlined in a block**."
>
> "We use data attributes because an exception should only occur in **exceptional circumstances** (the clue is in the name). Because the exception is often caused by **outside influence, such as JavaScript**, a mechanism that **both CSS and JavaScript** can use efficiently makes sense, too. It's also useful to consider exceptions in the context of a **finite state machine** too."
>
> "**What should an exception do?** 1. Provide a concise variation to a block 2. **Use data attributes**"
>
> "**What shouldn't an exception do?** 1. Variate a block to the point where it isn't recognisable anymore. This is where a new block should be created 2. **Use CSS classes**"

**证据 B —— Complete CSS 第 9 课（给出「为什么」的完整推理）** [一手]
URL: https://piccalil.li/complete-css/lessons/9

> "There's a weakness to BEM that is not often talked about, and that weakness is **modifiers**. … The downfall to this is that **modifiers are CSS class-based**, and you can add **as many CSS classes — including modifiers — to your HTML elements, meaning you can't guarantee which modifier will win**. It's not an ideal situation, because **I personally treat modifiers as state changes**. JavaScript usually determines state changes and **JavaScript is very flaky and unpredictable**."
>
> 反例（他明确标为「预期会发生的行为」，即坏行为）：
> `<div class="my-component my-component--light my-component--success my-component--error">`
>
> 正解：
> `<div class="my-component" data-state="error">`
>
> "…Modifiers — known as **Exceptions** in CUBE — are **finite** because we use **data attributes** in markup."

**证据 C —— How I build a button component（2024，实操层面重申）** [一手]
URL: https://piccalil.li/blog/how-i-build-a-button-component/

> "If you're wondering why I'm using data attributes, head over to the CUBE CSS Exception documentation. In short, **I prefer to use data attributes to achieve a more finite state change than risk that my element has multiple, conflicting classes**."

### 4.3 规则的确切含义（拆开讲）

| 维度 | 含义 |
|---|---|
| **承载方式** | 状态写在 HTML **属性**上（`data-*`），不写在 class 上 |
| **「显式」在哪里** | `data-state="reversed"` 的**值**是显式的、自解释的字符串；读 HTML 就知道当前是什么状态 |
| **「有限性（finite）」** | 同一个 data attribute 只能有**一个值** —— 不可能同时是 `error` 又是 `success`。这正是他反对 BEM modifier 的根本原因：class 可以无限叠加 |
| **联动面** | data attribute 是 CSS **和** JS 共用的 hook（JS 改属性即可驱动视觉状态），也便于纳入有限状态机 |
| **红线** | ① 变到认不出来 → 建新 block，不要硬做 Exception ② 不能用 class 做 Exception |

### 4.4 与该规则并存的不一致（原样保留，不调和）

在证据 C 同一篇文章里，他自己写出了 **`[data-ghost-button]`** —— 一个**没有值**的布尔式 data attribute，与 `[data-button-variant="primary"]`（有值、显式命名）并存：

```css
.button[data-ghost-button] { /* 无值 */ }
.button[data-button-variant="primary"] { /* 有值 */ }
.button[data-button-radius="hard"] { /* 有值 */ }
```

同时，`data-button-variant` 承载的是**视觉变体**而非严格意义上的「状态变化」——这与他本人在第 9 课里把 Exception 定义为「state changes」的表述存在**范围扩张**。

**结论（[推断]）**：「必须显式命名」在实践中是**倾向性规则**而非绝对律；他真正不可让渡的部分是「**不得用 class 做 Exception**」与「**同一维度只能有一个值**」。

---

## 五、自创术语表

| 术语 | 出处 | 含义 | 是否他原创 |
|---|---|---|---|
| **CUBE CSS** | cube.fyi | Composition / Utility / Block / Exception + CSS 的合称 | 是，他原创 |
| **Composition / Utility / Block / Exception** | cube.fyi | 见 §3 | 是（Composition 作为独立层的命名是他原创；Block 借自 BEM） |
| **ASS / Atomic Style Sheets** | https://piccalil.li/blog/how-were-approaching-theming-with-modern-css/ ｜ https://piccalil.li/complete-css/lessons/9 | 「**不写 CSS，而是往 HTML 里撒单一用途类名**」的做法。**贬义**，且刻意用 ASS 这个缩写 | 是，他原创（至少是他的固定用法） |
| **Skeletal CSS / 「骨架层」** | 主题化长文 | 主题三层里的中间层：写尽可能多的全局 CSS + 自定义属性默认值，像低保真线框，等着被「上色」 | 是 |
| **Flair / Flair pass（「上色」层 / 花活阶段）** | 主题化长文 ｜ Complete CSS 课程大纲第 41–44 课（"Flair pass build"） | 最上、最轻的一层：只定义自定义属性 + 少量 block，把设计「涂」上去 | 是 |
| **Core build vs Flair pass** | Complete CSS 第 23 课标题 | 构建分成「打骨架」和「上花活」两个 pass | 是 |
| **Sketch-up / Sketch-up document** | Complete CSS 第 13–16 课 | 把设计稿拆解成布局与可复用组件的规划文档 | 是 |
| **Minimum Viable Experience（MVE，最小可用体验）** | https://cube.fyi/principles ｜ 渐进增强长文 | 渐进增强的基线：用最少的技术能力给用户最多的价值 | 是（他反复使用并定义） |
| **Be the browser's mentor, not its micromanager** | Complete CSS 第 6 课 ｜ buildexcellentwebsit.es | 总纲口号 | 是 |
| **Flow and rhythm / `.flow` / `--flow-space`** | 24 ways 2018 ｜ My favourite 3 lines | 用「脑叶切除猫头鹰选择器」+ 自定义属性做上下文可覆盖的垂直节奏 | `.flow` 是他；选择器借自 Heydon Pickering |
| **Progressive Custom Properties** | 主题化长文小标题 | 给 `var()` 传 fallback，让默认值可被按需覆盖 | 是 |
| **Design tokens（设计令牌）** | cube.fyi/utility ｜ CUBE CSS 2020 | 存储视觉设计属性的具名实体 | **否** —— 他明确归功于 Jina Anne，并直接引用其定义 |
| **Grouping（方括号分组）** | cube.fyi/grouping | 用 `[ ]` 给 class 属性分区 | 是 |
| **"Tailwind hater"** | https://piccalil.li/blog/technologies-and-frameworks-we-use-in-our-design-studio/ | 别人贴给他的标签，他明确否认 | 否（他人所贴，他引用以辟谣） |

---

## 六、对原子类 / Tailwind 的立场（重点）

### 6.1 一句话定位

**他反的不是 Tailwind，反的是「把 utility-first 当架构」。** 他自己在工作室项目里**正在用 Tailwind** —— 用的是它的 utility 生成器，而架构仍然是 CUBE。

他本人的辟谣（[一手]）：
> "I feel like this one needs a massive **'please listen to what I say vs what you've heard my opinion is'** because I'm often labelled as a **'Tailwind hater'**."
> —— https://piccalil.li/blog/technologies-and-frameworks-we-use-in-our-design-studio/

### 6.2 他反的是什么

| # | 反对对象 | 原文摘录 | 来源 |
|---|---|---|---|
| 1 | **Tailwind 的营销话术** `"Best practices" don't actually work.` | "It's **completely and almost hilariously wrong** … When I see a heading like the quoted one, above: **it reads like inexperience and naivety, rather than respectful authority**." ／ "**Tailwind CSS is created by a couple of dudes**." | https://piccalil.li/blog/css-frameworks-hype-and-dogmatism/ [一手] |
| 2 | **原子样式表（ASS）本身** —— 完全不写 CSS、把 HTML 塞满单一用途类 | "I've **never personally seen the benefit** of Atomic Style Sheets (ASS) … Maintaining those sort of codebases — _in my experience_ — is often fraught with **developers too timid to make changes**, and worse, **junior level developers literally being terrified of the codebase**. **That's not acceptable for me.**" | https://piccalil.li/complete-css/lessons/9 [一手] |
| 3 | **重主题化场景下的原子路线** | "in the context of heavy theming, **semantic CSS is going to be the key for long term success, not atomic stylesheets (ASS)**." | https://piccalil.li/blog/how-were-approaching-theming-with-modern-css/ [一手] |
| 4 | **「全押注某个框架」的决策方式** | "**We _joke_ in the studio that framework-built sites have a certain _smell_ to them**" ／ "Very often, that framework was **phased out in favour of a methodology approach by the end of the project**." ／ 反例风险："your talent pool for hiring, might be shallow" | https://piccalil.li/complete-css/lessons/9 [一手] |
| 5 | **Tailwind 默认产出的「空自定义属性墙」** | "getting rid of that massive block of empty Custom Properties that Tailwind generates. It's an **unbearable amount of useless guff for _my_ CSS**, but I think it's useful if you go **all-out atomic** with Tailwind." ／ "This **tortured my soul** for a long time" | https://piccalil.li/blog/a-css-project-boilerplate/ [一手] |
| 6 | **「把 JS 重的方案 / 全 utility 方案当普适解」** | "often the context of an all-in JavaScript project, or at least a completely **greenfield project** is conveniently **left out** … a _huge_ number of projects are websites, so that advice normally doesn't work for the **vast majority** of developers."（配数据：WordPress 约 36% 网站 vs React 0.3%） | https://piccalil.li/blog/cube-css/ [一手] |

### 6.3 他认同的是什么

| # | 认同点 | 原文摘录 | 来源 |
|---|---|---|---|
| 1 | **Tailwind 作为「按需生成 utility 类」的工具** | "we find **Tailwind to be _very_ useful as a utility class generator** … and **_only_ that**. It generates utility classes **on demand** which I like a lot." | https://piccalil.li/blog/technologies-and-frameworks-we-use-in-our-design-studio/ [一手] |
| 2 | 早期原型阶段 | "There's mostly nothing wrong with these approaches—**I quite like Tailwind for early-stage prototyping**" | https://piccalil.li/blog/cube-css/ [一手] |
| 3 | 作为既有 CSS 的**补充**（尤其维护设计令牌输出） | "For the record: **I think Tailwind is a great _framework_**. I've used it very successfully **as a complement to existing CSS**—specifically maintaining design token output." | https://piccalil.li/blog/css-frameworks-hype-and-dogmatism/ [一手] |
| 4 | **官方文档把它列为 CUBE 的推荐工具** | cube.fyi「Resources → Tools」第 3 条："**Tailwind CSS** is a utility class generator and framework"（与 Gorko、Goron、Style Dictionary、Theo 并列） | https://cube.fyi/resources [一手] |
| 5 | **官方 boilerplate 里就有 `tailwind.config.js`** | 目录结构含 `tailwind.config.js`、`postcss.config.js`、`src/css-utils/tokens-to-tailwind.js`；插件把令牌同时生成 `:root` 自定义属性块**和**自定义 utility | https://github.com/Set-Creative-Studio/cube-boilerplate [一手] ／ https://piccalil.li/blog/a-css-project-boilerplate/ [一手] |
| 6 | **Complete CSS 课程项目里 U 层就是 Tailwind 供电** | "we're using CUBE CSS to build this project, but the **U in CUBE — Utility — will be mostly powered by Tailwind CSS**." | https://piccalil.li/complete-css/lessons/9 [一手] |

### 6.4 交集在哪里 —— 为什么「CUBE 有 Utility 层」与「反对原子类」不矛盾

这是本次调研最关键的一处细微差别。拆成四层来看：

**① 层级不同：utility 在 CUBE 里是「鞋」，在 ASS 里是「地基」**

- CUBE："If utilising the cascade is the backbone of this methodology, then **utilities are the shoes that help it to walk comfortably**."（https://cube.fyi/utility [一手]）
- 即：CUBE 的骨架（Composition + Block）**始终留在 CSS 里**；HTML 只承载「令牌映射」和「单一职责 helper」。
- ASS：整个 UI 的表达都搬进 HTML，Composition 与 Block 这两层实质消失。

**② 职责边界不同：官方给 Utility 划了「不做」清单**

cube.fyi/utility 明确 [一手]：

> **What shouldn't utilities do?**
> 1. Define a large group of **unrelated** CSS properties. For example, a utility that defined `color`, `font-size` and `padding` would make more sense to be a **block**.
> 2. Be used as a **specificity hack**. For example, setting all properties with `!important` will undoubtedly cause problems in the long-run.

→ 原子类路线恰恰**同时踩中这两条**：它让任意一串类名组合出任意一组不相关属性，并靠 `!important`/层序强行取胜。

**③ 意图不同：CUBE 的 Utility 是「令牌的延伸」，不是「样式的替代」**

cube.fyi/utility 三条「该做」里的第 2、3 条 [一手]：

> 2. **Extend design tokens** to maintain a single source of truth
> 3. **Abstract repeatability** away from the CSS and apply it in the HTML instead

→ CUBE 允许"类名做视觉"这件事，但限定在 **单一职责 + 令牌映射 + 消除重复** 的范围内。超过这个范围，官方文档直接让你改写成 Block。

**④ 数量不同：CUBE 是「轻量使用」，ASS 是「全量铺开」**

- "We use those utilities as part of the CUBE CSS methodology, **in the lightest way possible**."（https://piccalil.li/blog/technologies-and-frameworks-we-use-in-our-studio/ [一手]，2025）
- 他在主题化文章里更直接：「there's probably going to have to be a **muted use of the U: utilities**」（重主题化时**更要**少用 U 层）
- 工程上也在做减法：boilerplate 里 `corePlugins.preflight = false`、`blocklist: ['container']`、`experimental.optimizeUniversalDefaults = true`，并显式只保留一组**收窄过的** theme 键（colors/spacing/fontSize/fontLeading/fontFamily/fontWeight）—— 一手的 config 原文见 https://piccalil.li/blog/a-css-project-boilerplate/ [一手]
- 官方文档自陈的取向也一致："CUBE CSS has a very **flat, inclusive** structure"、"a reduction in abstraction"

**⑤ 汇总判断**

| 问题 | CUBE 的答案 |
|---|---|
| 能不能用类名表达视觉？ | 能，但仅限**单一职责**或**一小撮相关属性** |
| 能不能把令牌映射成类名？ | 能，而且**推荐** —— 这是 Utility 的核心职责之一 |
| 能不能用 Tailwind 生成这些类？ | 能，Set Studio 就这么干，官方文档也把 Tailwind 列进工具清单 |
| 能不能让 HTML 承载整个 UI 的表达？ | **不能** —— 那是 ASS；会毁掉 Composition 与 Block 层 |
| 能不能用 utility 去压特异性？ | **不能** —— 官方明确列为「不该做」|

> **他反对的对象从来不是「utility 类」，而是「**utility 类作为架构的底座**」。**

### 6.5 时间线（原样保留，不做调和）

| 时间 | 立场表述 |
|---|---|
| 2020-05 | "I quite like Tailwind for early-stage prototyping"，但指出「全押注」建议刻意省略了上下文 | 
| 2021-01 | "It's completely and almost hilariously wrong" ／ "Tailwind CSS is created by a couple of dudes" ／ "I think Tailwind is a great framework … as a complement to existing CSS" ／ "For proper client work, though, I personally prefer to lean into **Sass** and actual CSS best practices." |
| 2024-02 | 官方 boilerplate 引入 `tailwind.config.js`（**已无 Sass**） |
| 2024-04 | "semantic CSS is going to be the key for long term success, **not atomic stylesheets (ASS)**" |
| 2024 课程 | "**I've never personally seen the benefit of Atomic Style Sheets (ASS)**" ／ "the U in CUBE will be **mostly powered by Tailwind CSS**" |
| 2025-01 | "I'm often labelled as a **'Tailwind hater'**" ／ "we find Tailwind to be very useful as a utility class generator and **only that**" |

---

## 七、自定义属性与设计令牌的用法

### 7.1 令牌的来源与归属（[一手]）

- 概念非他原创。他在 CUBE CSS 首发长文中**明确归功于 Jina Anne**，并直接引用其定义：
  > "Design Tokens are the visual atoms of the design system – specifically, they are named entities that store visual design attributes. We use them in place of hard–coded values in order to maintain a scalable and consistent visual system."
  > —— https://piccalil.li/blog/cube-css/ ／ https://cube.fyi/utility
- 他把这套概念接到 CUBE 的方式是：**令牌 → 生成 utility 类 → 在 HTML 上应用**，从而「定义一次、处处应用」，并降低**打包体积**。

### 7.2 两条并行的用法（这是理解他体系的关键）

**用法 A · 令牌 → utility 类（面向设计系统 / 全站统一）**
- `colors.json` → `tokensToTailwind()` → Tailwind 生成 `.bg-primary` / `.color-base`
- 同时用自定义插件生成 `:root` 上的 `--color-*` / `--space-*` / `--size-*` / `--leading-*` / `--font-*`
- 出处：https://piccalil.li/blog/a-css-project-boilerplate/ [一手]（含完整 config 原文）＋ https://github.com/Set-Creative-Studio/cube-boilerplate [一手]

**用法 B · 自定义属性 → 组件配置 / 上下文覆盖（面向单点控制）**
- 组件内自曝配置块（button 组件原文）[一手]：
  ```css
  .button {
    --button-padding: 0.7em 1.2em;
    --button-bg: #342a21;
    --button-hover-bg: #4b4b4a;
    --button-border-color: var(--button-bg);
    --button-radius: 0.5em;
    gap: var(--button-gap);
    padding: var(--button-padding);
    font-weight: var(--button-font-weight, 700);
  }
  ```
- 上下文覆盖（flow）[一手]：
  ```css
  .flow > * + * { margin-block-start: var(--flow-space, 1em); }
  .card__content { --flow-space: 1.4rem; }
  ```

### 7.3 「Progressive Custom Properties」（他自己的命名）

主题化长文里的小标题 [一手]，理由：
1. 自定义属性**受层叠与特异性影响**，主题层可以轻易改它们
2. `var()` 可以传**默认值**，于是「合理的默认」可以按需被关掉

> "The only thing that's not configurable is the `display` property. With the default values, the CSS translates to this … **As soon as one of those Custom Properties is defined though, those defaults are discarded.**"

### 7.4 三层变量结构（他在主题化文章里给的原型）

| 层 | 例子 | 作用 |
|---|---|---|
| ① 原始令牌 | `--size-step--2`…`--size-step-7`、`--space-3xs`…`--space-3xl`、`--color-midnight` | 从 JSON 令牌输出，纯数值/色值 |
| ② **语义变量** | `--text-size-base: var(--size-step-0)`、`--color-global-bg: var(--color-light)`、`--space-gutter: var(--space-m)`、`--leading: 1.5` | **CSS 实际只用这一层**；主题层只改这一层就能翻盘 |
| ③ 组件变量 | `--button-bg`、`--grid-min-item-size`、`--flow-space`、`--sidebar-target-width` | 组件级配置，通常带组件名前缀 |

**他明说的硬规则** [一手]：
> "The really important thing about theming though is you **need to abstract into more specific, semantic variables** when applying to your CSS styles."

**命名约定** [一手]：
> "This is also why I like to prefix custom property names with the component name, even though they're technically scoped to `.button`. It makes things easier to understand!"

**何时写进"配置块"、何时用 fallback** [一手]：
> "I tend to add to the big ol' block if there's a **100% chance that the variable is going to change per variant** because surfacing them up there makes it easier to see what is configurable for my colleagues."

**失效陷阱（他引 Matthias Ott）** [一手]：
> "if the Custom Property is invalid and you don't provide a fallback, **it'll fail**"

**效果量级** [一手]：dark 主题整站翻盘只用 43 行 CSS（"43 lines of CSS and the whole UI is transformed"）。

**其他用法**：用 PostCSS 插件把设计令牌里的 hex 自动转成 **P3 色彩**（https://piccalil.li/blog/applying-p3-colours-on-an-existing-project/ ，2024-05-06）；`calc()` + 自定义属性做数学（`calc(var(--transform-size) * -1)`）。

---

## 八、渐进增强 / 无障碍 在他体系中的位置

### 8.1 渐进增强 = CUBE 的**前置条件**，不是第五层

- CUBE 官方文档 Principles 页第一条就是 Progressive Enhancement [一手]：
  > "Has the user got an old browser? That's not a problem with CUBE CSS because **Progressive Enhancement is its core**."
- CUBE 官方文档 CSS 页给了它一个独立小节标题：**"Progressive first methodology"** [一手]
- CUBE 首发长文原话 [一手]：
  > "CUBE CSS in essence, is **a progressive enhancement approach**, vs a fight against the grain of CSS or a pixel-pushing your project to within an inch of its life approach."

**机制（他反复讲的两件事）**：
1. **CSS 是声明式语言 → 天生宽容**：同一条规则里写两次即可做出「默认值 + 增强值」
   ```css
   .my-element { height: 1.5em; height: 1cap; }
   .my-element { font-size: 2rem; font-size: clamp(1rem, calc(5vi + 1rem), 4rem); }
   ```
2. **Minimum Viable Experience（MVE）**：先做能用的基线，再往上叠最新能力 —— "provide the most possible value to a user with the least amount of technical capability"

**他对 `@supports` 的立场（明确的少数派意见）** [一手]：
> "The problem I personally see with this is, you're **working against the grain of the browser** … CSS moves _so fast_ now that your `@supports` query will be **technical debt before you know it**."
> "By **accepting an end experience that's not quite perfect** you're going to provide a much better experience for _everyone_."

**JS 的位置** [一手]：不是敌人，是「nice to have」；同时逐条列出 JS 不可用的 15 个现实理由。

### 8.2 无障碍：从"重要的事"到代码里的硬规则

**他的自我定位**：
- Smashing Magazine 作者页（平台撰写）[二手]：
  > "An independent designer and front-end developer who's trying to make everyone's experience on the web better with a **focus on progressive enhancement and accessibility**."
- 24 ways 作者简介（平台撰写，同句式）[二手]

**piccalil.li 上的实际分布（[一手]，我逐条核对过分类页）**：

| 无障碍主题下的文章 | 作者 | 年份 |
|---|---|---|
| Visually hide an element with CSS | **Andy Bell** | 2020-08-04 |
| Load all focusable elements with JavaScript | **Andy Bell** | 2021-01-13 |
| Use transparent borders and outlines to assist with high contrast mode | **Andy Bell** | 2021-03-11 |
| You might not need role="presentation" | Steve Frenzel | 2026-02-12 |
| Finding an accessibility-first culture in npmx | Abbey Perini | 2026-03-03 |
| Applying accessibility fixes with stealth for the greater good | Steve Frenzel | 2026-03-26 |
| A guide to creating accessible PDFs using free tools | Steve Frenzel | 2025-10-02 |
| Three stoic principles for better web accessibility | Steve Frenzel | 2026-04-30 |
| Use cases for aria-expanded | Steve Frenzel | 2026-07-16 |

来源：https://piccalil.li/category/accessibility/ [一手]

**⚠️ 需要修正任务前提**：任务描述里的「他在 piccalil.li 教 accessibility」**偏强**。核对结果：
- piccalil.li **确实有** Accessibility 主题分类，但 2021 年之后该分类主要由 **Steve Frenzel / Abbey Perini** 供稿；
- **Andy 本人署名**的无障碍内容只有 2020–2021 年的 3 篇短篇（quick tip 级别，非课程）；
- 当前 piccalil.li 的 3 门付费课程是 **Complete CSS（他）/ Mindful Design（Scott Riley）/ JavaScript for Everyone（Mat Marquis）** —— **没有他主讲的无障碍课程**（https://piccalil.li/courses/ [一手]）。
- 是否由他撰写了 Google 的 Learn Accessibility 课程：**未核实**（web.dev 抓取失败，见 §11）。

**代码层面的无障碍硬规则（散见于他的长文，均为 [一手]）**：

| 规则 | 出处 |
|---|---|
| 装饰性 SVG 加 `aria-hidden="true"`，让读屏聚焦在「这是按钮/链接 + 标签是什么」 | How I build a button component |
| **"You _must_ provide a focus style for interactive elements. There's no excuse to remove `outline`"** | 同上 |
| hover 颜色必须显式设定，保证变体下文字与背景**对比度充足** | 同上 |
| `ul[role='list'] / ol[role='list']` 去列表样式 —— 因为 Safari 去样式会**连带移除 VoiceOver 语义** | A (more) Modern CSS Reset |
| 行高 1.1 用在标题/交互元素上时，要检查字体升降部是否**撞出无障碍问题** | 同上 |
| 用 `.visually-hidden` 而不是 `display:none`，否则辅助技术也被藏掉 | Visually hide an element with CSS |
| 用透明 border/outline 兼顾「去默认焦点环」与 **Windows 高对比度模式** | 对应文章 |
| 用**逻辑属性**（`margin-inline-start`）保证 RTL / 竖排语言的可用性 | CSS Logical Properties |
| 卡片整体可点要用「break-out pseudo-element」而不是把整张卡包进 `<a>`（引 Heydon《Inclusive Components》），避免读屏把整卡内容当链接标签朗读 | While you're fixing the fun stuff… |
| 可样式化 alt 文本（把 alt 当普通文本处理） | You can style alt text like any other text（2025-05-22） |

**结构性判断（[推断]）**：在他的体系里，无障碍**不是一个独立模块，而是渐进增强与「为所有人构建」的必然产物** —— HTML 语义是基线（Foundations 层），CSS 只是增强，因此读屏用户至少拿到"能懂、能用"的页面。

---

## 九、推荐书单 / 引用的影响源（智识谱系线索）

> **前置说明**：我**没有找到** Andy Bell 发布过的成体系「推荐书单」页面。以下是他全部长文中反复引用、具名致谢或用作论证支点的来源，按出现频次与分量排序。

### 9.1 高分量影响源（被他当作论证基石）

| 人物 / 作品 | 角色 | 他如何引用 | 出处 |
|---|---|---|---|
| **Rachel Andrew** | 「如果它能用，它就是对」的原作者 | 至少 3 篇文章直接引用；他推测是在合作 Learn CSS 时听她说的 | css-frameworks-hype-and-dogmatism ／ technologies-and-frameworks ／ if-it-works-its-right |
| **Heydon Pickering** | Every Layout 合著者；无障碍与组件思想来源 | ① Lobotomised Owl 选择器（ALA《Axiomatic CSS and Lobotomized Owls》）② 合著 Every Layout ③ 《Inclusive Components》被引为卡片无障碍的权威 | My favourite 3 lines ／ Every Layout ／ While you're fixing the fun stuff |
| **Jeremy Keith** · *Resilient Web Design* | 「像素完美是集体幻觉」的出处 | 直接引用 chapter 3："a shared consensual hallucination" | Complete CSS 第 6 课 ／ 渐进增强长文 |
| **Jina Anne** | Design Tokens 概念创始人 | 明示归属并引用其定义原文 | CUBE CSS 首发 ／ cube.fyi/utility |
| **Ethan Marcotte** · *Responsive Web Design*（ALA, 2010） | 响应式设计的起点 | 作为「响应式设计史」的锚点 | Complete CSS 第 6 课 |
| **Trys Mudford** · Utopia (utopia.fyi) | 流体字号/间距的数学 | 明示致谢："thank you to Trys for the Utopia logic"；boilerplate 的 `clamp-generator.js` 即其逻辑 | a-css-project-boilerplate ／ My favourite 3 lines ／ A (more) Modern CSS Reset |
| **Adam Silver**? | — | 未发现引用 | — |

### 9.2 被引为技术/方法依据的来源

| 来源 | 用途 | 出处 |
|---|---|---|
| BEM（`bem.info` ／ CSS-Tricks《BEM 101》） | CUBE 的前身与对照物 | CUBE CSS 首发 ／ cube.fyi |
| Harry Roberts（csswizardry）·《Shame CSS》 | 反面参照（他方案要消灭的东西） | 24 ways 2018 |
| Dave Rupert · "CSS wants to be a system"（2024-12） | 支撑「布局应是系统」 | If it works, it's right |
| Alex Riviere · "Grid First, Flex Third"（2025-03-23） | **公开不同意但不判定对方错**的对手文本 | If it works, it's right |
| Kilian Valkhof · `text-size-adjust` 解释 | reset 规则依据 | A (more) Modern CSS Reset |
| Ahmad Shadeed · 新视口单位 | `dvh` 的风险依据 | A (more) Modern CSS Reset |
| Matthias Ott · custom properties 无 fallback 会失败 | 自定义属性安全依据 | My favourite 3 lines |
| Ben Myers · "clickable divs" | 反 `<div>` 按钮的依据 | How I build a button component |
| Stuart Langridge · everyonehasjs.com | 「JS 有多可能不可用」的可视化 | A handful of reasons JavaScript won't be available |
| Paul Irish | `box-sizing: border-box` 的原始出处（他有"国际 box-sizing 意识日"的玩笑传统） | international-box-sizing-awareness-day（2024-02-01） |
| WebKit Bug 170179 | Safari 去列表样式会毁 VoiceOver 语义 | A (more) Modern CSS Reset |
| XState | 把 Exception 放进有限状态机去思考 | cube.fyi/exception |
| Roman Komarov · `@property` 驱动的 fit text | 被他把玩并改造 | Riffing on the latest CSS fit text approach（2024-08-07） |
| Chris Coyier / CSS-Tricks | 出版路径与行业对话对象；CSS-Tricks 是他长时间供稿处 | the-path-to-becoming-a-publisher（2024-03-01） |

### 9.3 他反复推荐（≥2 次）的自家/自建资源

- **Every Layout**（every-layout.dev）—— 在 ≥8 篇文章里被推荐
- **buildexcellentwebsit.es**（他 2022 演讲配套站）—— 作为「mentor not micromanager」的常驻链接
- **viewports.fyi** —— 用 12 万+ 视口数据论证「理想视口不存在」
- **utopia.fyi** —— 流体字号/空间计算器
- **learneleventyfromscratch.com** —— 已开源

### 9.4 反面参照（构成他的"反对清单"）

- Tailwind 的营销文案（"Best practices don't work"）
- Atomic Style Sheets（ASS）社区
- 「Figma 交接 → 追像素完美」的生产流程
- 用 `<div>` + JS 处理器做按钮
- 用 polyfill / `@supports` 硬追新特性

---

## 十、矛盾与未解决之处（原样保留，不调和）

### 10.1 工具无关 vs 工作室技术栈高度统一
- **A 面**（https://cube.fyi/principles [一手]）："CUBE CSS is **completely tool agnostic** … **Any technology will do** … Whether you like to author your CSS with Sass, Less, PostCSS, or even CSS-in-JS: the principles and methodology of CUBE CSS remain."
- **B 面**（https://piccalil.li/blog/technologies-and-frameworks-we-use-in-our-design-studio/ [一手]）：工作室栈被明确固定为「Semantic HTML → CUBE CSS → Astro → JSX（常 React）→ Storybook」，并说 "**CUBE CSS is the one constant in every project we work on**"。
- **原样保留**：方法论层声称无关，工程层有强偏好。二者可共存，但他没有正面处理这个落差。

### 10.2 Sass 立场随时间反转为「移除 Sass」
- 2021（[一手]）："For proper client work, though, **I personally prefer to lean into Sass** and actual CSS best practices."
- 2024 -02（[一手]）：boilerplate 文章的措辞是「For the many folks who ask **how I write CSS since removing Sass**」，工程上换成 PostCSS + Tailwind + 原生嵌套。
- **原样保留**：两条表述都还在 piccalil.li 上，未加任何"我改主意了"的说明。

### 10.3 Tailwind 立场的时间矛盾（见 §6.5 时间线）
- 2021 骂其文案"naive"、"created by a couple of dudes"，2024–2025 在生产里用它并把官方文档工具清单里加了它。
- 他**自己承认**被贴「Tailwind hater」标签并否认，但**没有撤回** 2021 文章里的原话。
- **原样保留**。

### 10.4 「反教条」与自身教条并存
- 他反复说「如果它能用，它就是对」「不要接受绝对答案」「you do you」；
- 同时又说 Tailwind 的文案"**completely and almost hilariously wrong**"，对 ASS 说"**That's not acceptable for me**"，对框架全押注说会"phased out by the end of the project"。
- 而且**他自己**正是这类强判断的受害者（"My Twitter mentions are filled with 'CUBE CSS is the right way to do things, not X'"），他明确说 CUBE「**categorically not the right way**」。
- **原样保留**：他反对的是「别人的绝对化」，但保留了自己对营销话术与 ASS 的绝对化评价。

### 10.5 CSS Reset：发布 vs 否定
- 他发布了两版 reset（2019 归档版 + 2023 新版），并归档了旧仓库；
- 2023 文章结尾却说：「with browsers being so bloody good now, **you probably don't even need one in the first place**」。
- **原样保留**。

### 10.6 Exception 规则自身的不一致（见 §4.4）
- 规则说 Exception 用 data attribute 且是「state change」；
- 实操里他用了无值的 `[data-ghost-button]`，还把视觉变体（`data-button-variant`、`data-button-radius`）也塞进 Exception 机制。
- **原样保留**。

### 10.7 Block 内部「open season」vs 全局「减少抽象、保持扁平」
- cube.fyi/block 说 block 内「you can **do whatever you want**」，可以直接打标签选择器；
- cube.fyi/principles 说「Abstraction only when necessary」「CUBE CSS has a very **flat, inclusive** structure」。
- 张力在于：block 内的自由恰恰依赖"父类提供的那一个特异性点"。他给了理由（safety net + 一个额外特异性点），但没有量化"多自由算过界"——唯一的量化是 **80–100 行**上限。
- **原样保留**。

### 10.8 文档站的链接腐坏（[推断]，但证据确凿）
- cube.fyi 页面里大量 `/principles`、`/utility.html` 混排形式，且 examples 页链接的 `https://piccalil.li/talk/cube-vienna/` 现在是 **404**；
- 他文章里反复引用的 `https://andy-bell.co.uk/i-used-tailwind-for-the-u-in-cube-css-and-i-liked-it/`、`https://andy-bell.co.uk/getting-started-with-css-custom-properties/`、`https://andy-bell.co.uk/my-favourite-3-lines-of-css/` 等旧域名链接，在 piccalil.li ↔ andy-bell.co.uk 之间形成**交叉重定向环**，`web_fetch` 无法跟随；
- 我尝试 `https://piccalil.li/blog/getting-started-with-css-custom-properties/` 时被送到了 **"CSS Logical Properties"（2020-03-13）** 一文，即该 slug 已不再指向自定义属性文章。
- **推断**：站点多次迁移（hankchizljaw.com → andy-bell.design → andy-bell.co.uk → piccalil.li）留下了大面积链接腐坏，引用他的内容时需要按标题回查、不能按 URL 直引。

---

## 十一、未核实 / 查不到的部分

| 项 | 状态 | 说明 |
|---|---|---|
| **《Get CSS》这本书/课程** | **未找到公开来源** | 任务点名要查。在 piccalil.li 课程页、作者页、GitHub 仓库、CSS-Tricks/Smashing 作者页中均**未见此名**。他现存的自有产品名是：Complete CSS（课程）、Learn CSS（Google，他写第一版）、Every Layout（合著）、Learn Eleventy From Scratch、CUBE CSS（方法论）。**怀疑题面把名字记串了**，但我不做断定。 |
| **《Learn CSS》作者身份的一手确认** | 仅 [二手/官方描述] | web.dev 在本会话中**反复抓取失败**（`web_fetch` → `TypeError: fetch failed`，含 /learn/css、/learn/css/、/learn/accessibility/ 三次尝试）。现有两个非一手但可靠的支持：① Every Layout 官方简介「He also wrote **the majority of Learn CSS**, a CSS course by web.dev」；② Complete CSS FAQ 中他自述「wrote the **first edition** of the Learn CSS course by Google」。**注意：他自述是"第一版"，官方简介说"大部分"——口径不完全一致。** |
| **Google Learn Accessibility 的署名** | **未核实** | web.dev 抓取失败。任务中「他在 piccalil.li 教 accessibility」经核对偏强（见 §8.2）。 |
| **Andy Bell 是否有维基百科条目** | **未核实** | `platform_search(wikipedia)` 返回 `fetch failed`，无法确认。 |
| **`cube-css` 官方 starter 仓库** | **名称不确** | 遍历 `Andy-set-studio` 全部公开仓库（GitHub API，per_page=100），**没有**名为 `cube-css` 的仓库。官方 starter 实为 **`Set-Creative-Studio/cube-boilerplate`**（265★ / MIT / template）。另有 `piccalil-li/cube-css-dashboard`（2020 教程配套）。 |
| **`a-modern-css-reset` 仓库** | **名称不确** | 实际仓库名是 **`Andy-set-studio/modern-css-reset`**（2960★ / 419 fork / MIT / **已 archived**，最后 push 2023-09-26）；`a-modern-css-reset` 是他的**文章标题**。 |
| **`every-layout` 公开仓库** | **未找到** | Every Layout 是**商业产品**（$69，含 EPUB + custom elements），官网未提供源码仓库链接。他的角色是**合著者**（与 Heydon Pickering），不是 owner。 |
| **A List Apart 供稿** | **未核实** | `https://alistapart.com/author/andybell/` 返回 404。他在 ALA 上的文章可能有但未被正确索引；**已确认的是 24 ways 一篇（2018）**。任务点名 A List Apart，需降级为「未核实」。 |
| **Smashing Podcast Episode 19 访谈原文** | **未抓取** | cube.fyi/examples 列出该访谈，但我未取文本。 |
| **Kevin Powell YouTube 访谈、CSS-Tricks 直播录制、Vienna 演讲** | **未抓取** | 前两个是视频；Vienna 演讲页在 piccalil.li 已 **404**。演讲文本内容未核实。 |
| **piccalil.li 站内 repo** | **未找到公开位置** | 未找到 piccalil.li 自身的公开源码仓库；cube.fyi 文档站源码仓库亦未找到。 |
| **「必须显式命名」的英文原文** | **未找到逐字对应** | 见 §4.1。已给出三条最接近的一手规则原文。 |
| **页面上写于 2026 年的新内容** | **未逐一核** | 他的文章清单共 169 篇（作者页显示"View all 169 articles"），我完整取到了列表前 ~109 条；2026 年的项目连载（Personal website redesign 系列）未逐篇精读，主题上是 Astro + 渐进增强的工程实践，与本次"著作与系统性长文"主线关联度低。 |
| **web.dev 与 24ways 的评论/社区反应** | **未纳入** | 本简报只做「他说了什么」，未做受众反应统计。 |

### 未使用但存在的一手素材（留给后续调研）

- `https://piccalil.li/blog/a-primer-on-the-cascade-and-specificity/`（2024-04-18，CSS Fundamentals 系列）
- `https://piccalil.li/blog/css-inheritance/`（2024-04-29）
- `https://piccalil.li/blog/the-box-model-and-box-sizing/`（2024-03-20）
- `https://piccalil.li/blog/css-nesting-use-with-caution/`（2025-01-30）—— 与「少一点工具链」主题直接相关，建议下一篇补
- `https://piccalil.li/blog/redesigning-piccalilli-the-build-process/`（2024-08-21）—— 生产构建细节
- `https://piccalil.li/blog/our-principles-on-ai/`（2025-08-18）
- `https://piccalil.li/blog/a-global-documentation-platform/`（2024-02-20）—— 关于 MDN 未来的公共品论述

---

## 附：本简报引用来源总表（34 条）

**一手（30）**
1. https://piccalil.li/blog/cube-css/
2. https://cube.fyi/
3. https://cube.fyi/principles
4. https://cube.fyi/css
5. https://cube.fyi/composition
6. https://cube.fyi/utility
7. https://cube.fyi/block
8. https://cube.fyi/exception
9. https://cube.fyi/grouping
10. https://cube.fyi/resources
11. https://cube.fyi/examples
12. https://piccalil.li/blog/css-frameworks-hype-and-dogmatism/
13. https://piccalil.li/blog/a-more-modern-css-reset/
14. https://piccalil.li/blog/its-about-time-i-tried-to-explain-what-progressive-enhancement-actually-is/
15. https://piccalil.li/blog/how-were-approaching-theming-with-modern-css/
16. https://piccalil.li/blog/a-css-project-boilerplate/
17. https://piccalil.li/blog/technologies-and-frameworks-we-use-in-our-design-studio/
18. https://piccalil.li/blog/my-favourite-3-lines-of-css/
19. https://piccalil.li/blog/if-it-works-its-right/
20. https://piccalil.li/blog/how-i-build-a-button-component/
21. https://piccalil.li/blog/a-handful-of-reasons-javascript-wont-be-available/
22. https://piccalil.li/blog/while-youre-fixing-the-fun-stuff-fix-the-important-stuff-too/
23. https://piccalil.li/blog/visually-hidden/
24. https://piccalil.li/blog/css-logical-properties/
25. https://piccalil.li/blog/build-a-dashboard-with-cube-css/
26. https://piccalil.li/complete-css/ ｜ /lessons/6 ｜ /lessons/9 ｜ /lessons/10
27. https://piccalil.li/courses/
28. https://piccalil.li/author/andy-bell ｜ /author/andy-bell/all
29. https://piccalil.li/category/accessibility/
30. https://24ways.org/2018/managing-flow-and-rhythm-with-css-custom-properties/
31. https://raw.githubusercontent.com/Set-Creative-Studio/cube-boilerplate/main/README.md
32. https://api.github.com/users/Andy-set-studio/repos ｜ https://api.github.com/orgs/Set-Creative-Studio/repos
33. https://every-layout.dev/
34. https://css-tricks.com/author/andybell/（文章条目为[一手]，作者页本身为[二手]）

**二手（2）**
- https://www.smashingmagazine.com/author/andy-bell/（平台撰写的作者简介）
- Every Layout 官方简介中对 Andy 的第三人称介绍（归为一手官方页，但介绍文字为第三方撰写）

**未能抓取（1 类）**
- web.dev（/learn/css/、/learn/css、/learn/accessibility/）—— `TypeError: fetch failed`
- https://andy-bell.co.uk/* 与 bell.bz 旧文 —— 交叉重定向环，`web_fetch` 不跟随
- web.archive.org —— 被环境拒绝（"resolves to a non-public IP address"）
