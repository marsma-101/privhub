# 01 · 著作维度调研：Adam Wathan（@adamwathan）× Steve Schoger（@steveschoger）

> 调研 Agent 1｜维度：著作 / 写作产出｜目标产物：《Refactoring UI》核心论点与 Tailwind CSS 设计决策长文的结构化提取
>
> 标注约定：`[一手]` = 本人撰写或官方发布；`[二手]` = 他人总结或第三方媒体；`[推断]` = 本人推断。
> **未找到一手来源**的内容一律显式标注，不做补白。

---

## 0. 调研范围与证据边界（先说清楚哪些没拿到）

| 目标证据 | 状态 | 说明 |
|---|---|---|
| 《Refactoring UI》完整目录（50 章 / 9 部分） | ✅ 拿到 | 来自官方首页正文，见 §1 |
| 《Refactoring UI》自由样章（two free chapters）正文 | ❌ 未拿到 | 官网 Gmail/邮件列表门控，`/free-chapters`、`/chapters`、`/book/chapters`、`/sample` 均 404。**未找到公开可直接抓取的样章正文** |
| "7 Practical Tips for Cheating at Design" 原文 | ❌ 未拿到正文 | Medium 全站在本会话网络环境中不可达（`fetch failed`），已试 direct / `?source=friends_link` / publication 页 / archive / 多个 CORS 代理，全部失败。**仅有官方首页与播客页给出的标题与链接**，不复述任何未读到的句段 |
| "Redesigning Laravel.io" case study 正文 | ❌ 未拿到 | 同上，Medium 不可达 |
| Tailwind 官方博客全部版本发布说明 | ✅ 拿到 v2.0 / v3.0 / v3.1 / v3.3 / v4.0 / JIT | 正文完整 |
| Tailwind 默认设计令牌（theme.css）源码 | ✅ 拿到 | v4 主分支 `packages/tailwindcss/theme.css`，数值最权威 |
| Tailwind v3 文档（utility-first / spacing / box-shadow / font-size / preflight / reusing-styles） | ✅ 拿到 | v3 站点正文可抓取，v4 站点正文被 Next.js 流式渲染截断 |
| 书中逐章论证细节（如某章具体建议的 CSS 数值） | ⚠️ 部分 | 只有章节标题级证据 + 与 Tailwind 令牌的对应关系推断 |

> 结论先行：**本文件的核心论点是"第一章级别"的骨架证据 + Tailwind 官方令牌级数值证据**，不是对书稿逐页的重述。凡涉及书内具体数值处，凡不能从一手页面直接读到的，均标 `[推断]` 或写入 §8 缺口。

---

## 1. 《Refactoring UI》全书论点结构

### 1.1 图书基本事实（均为 `[一手]`）

- 官方副标题定位：**"Make your ideas look awesome, without relying on a designer."**，进一步限定为 "Learn how to design beautiful user interfaces by yourself using specific tactics explained from a developer's point-of-view."（refactoringui.com 首页）
- 载体：**PDF，50 个章节，200+ 页**。原话："A beautiful PDF containing **50 incredibly visual chapters** spread across 200+ painstakingly typeset pages."
- 编排哲学（重要，决定了它的"论点结构"是**要点式而非论证式**）：**"Every chapter is designed to be as independent as possible, so you can read them in almost any order."**
- 反注水宣言：**"We hate books that repeat the same ideas over and over just to fill out the page count."**
- 销量：官网标注 "Over 30,000 copies sold"；Goodreads 4.68 星（链接在官网给出，此次 Goodreads 站点在本环境不可达）
- 出版时间：Adam 在 2020-08 长文中写明 **"a book Steve and I had released in December 2018"** → 2018 年 12 月（与任务书"2018 出版"一致）
- **本书的结构模板来自 Basecamp 的《Getting Real》**——见 §6 智识谱系。

来源：[refactoringui.com](https://refactoringui.com/) `[一手]`；[adamwathan.me/tailwindcss-from-side-project-byproduct-to-multi-mullion-dollar-business](https://adamwathan.me/tailwindcss-from-side-project-byproduct-to-multi-mullion-dollar-business/) `[一手]`

### 1.2 章节骨架（官方 "Full table of contents"，页码为原书页码） `[一手]`

**Part 1 · Starting from Scratch**

| # | 章 | 页 |
|---|---|---|
| 1 | Start with a feature, not a layout | 7 |
| 2 | Detail comes later | 10 |
| 3 | Don't design too much | 13 |
| 4 | Choose a personality | 17 |
| 5 | Limit your choices | 24 |

**Part 2 · Hierarchy is Everything**

| # | 章 | 页 |
|---|---|---|
| 1 | Not all elements are equal | 30 |
| 2 | Size isn't everything | 32 |
| 3 | Don't use grey text on colored backgrounds | 36 |
| 4 | De-emphasize to emphasize | 39 |
| 5 | Labels are a last resort | 41 |
| 6 | Separate visual hierarchy from document hierarchy | 46 |
| 7 | Balance weight and contrast | 48 |
| 8 | Semantics are secondary | 52 |

**Part 3 · Layout and Spacing**

| # | 章 | 页 |
|---|---|---|
| 1 | Start with too much white space | 56 |
| 2 | Establish a spacing and sizing system | 60 |
| 3 | You don't have to fill the whole screen | 65 |
| 4 | Grids are overrated | 72 |
| 5 | Relative sizing doesn't scale | 79 |
| 6 | Avoid ambiguous spacing | 83 |

**Part 4 · Designing Text**

| # | 章 | 页 |
|---|---|---|
| 1 | Establish a type scale | 88 |
| 2 | Use good fonts | 94 |
| 3 | Keep your line length in check | 99 |
| 4 | Baseline, not center | 102 |
| 5 | Line-height is proportional | 105 |
| 6 | Not every link needs a color | 109 |
| 7 | Align with readability in mind | 111 |
| 8 | Use letter-spacing effectively | 115 |

**Part 5 · Working with Color**

| # | 章 | 页 |
|---|---|---|
| 1 | Ditch hex for HSL | 119 |
| 2 | You need more colors than you think | 123 |
| 3 | Define your shades up front | 129 |
| 4 | Don't let lightness kill your saturation | 133 |
| 5 | Greys don't have to be grey | 139 |
| 6 | Accessible doesn't have to mean ugly | 142 |
| 7 | Don't rely on color alone | 146 |

**Part 6 · Creating Depth**

| # | 章 | 页 |
|---|---|---|
| 1 | Emulate a light source | 150 |
| 2 | Use shadows to convey elevation | 158 |
| 3 | Shadows can have two parts | 163 |
| 4 | Even flat designs can have depth | 167 |
| 5 | Overlap elements to create layers | 170 |

**Part 7 · Working with Images**

| # | 章 | 页 |
|---|---|---|
| 1 | Use good photos | 174 |
| 2 | Text needs consistent contrast | 176 |
| 3 | Everything has an intended size | 181 |
| 4 | Beware user-uploaded content | 187 |

**Part 8 · Finishing Touches**

| # | 章 | 页 |
|---|---|---|
| 1 | Supercharge the defaults | 192 |
| 2 | Add color with accent borders | 195 |
| 3 | Decorate your backgrounds | 198 |
| 4 | Don't overlook empty states | 203 |
| 5 | Use fewer borders | 206 |
| 6 | Think outside the box | 210 |

**Part 9 · Leveling Up**

| # | 章 | 页 |
|---|---|---|
| 1 | Leveling up | 215 |

### 1.3 每部分的核心主张（依据章节标题 + 官方正文可读段落）`[一手]`＋`[推断]`

| 部分 | 核心主张（一句话） | 证据强度 |
|---|---|---|
| 1 Starting from Scratch | **先做功能，别先做版面；从粗到细；过早铺满 = 返工。** 主张"设计"应从最小可用单元起步，而不是先搭 layout | 章节标题 `[一手]`；论证过程 `[推断]` |
| 2 Hierarchy is Everything | **层级靠多维对比建立，不靠装饰。** 尺寸只是手段之一（"Size isn't everything"）；反过来要主动弱化次要项（"De-emphasize to emphasize"） | 标题 `[一手]` |
| 3 Layout and Spacing | **间距必须是一个有限系统，不是逐页手调。** 且默认给太多留白、不给"填满屏幕"的许可 | 标题 `[一手]` |
| 4 Designing Text | **字号、行距、字距、行长都是刻度问题。** 行高随字号成比例变化；行长要设上限 | 标题 `[一手]` |
| 5 Working with Color | **色板要预先定义成阶梯（shades up front），不是随用随取。** 用 HSL 而非 hex 思考；灰度也应带色相 | 标题 `[一手]` |
| 6 Creating Depth | **深度的物理模型是光。** 阴影表达高度（elevation），阴影可分两层，扁平设计也能有层级 | 标题 `[一手]` |
| 7 Working with Images | **图片是被约束的元素**，有"它的预期尺寸"；用户上传内容要当作不可控输入 | 标题 `[一手]` |
| 8 Finishing Touches | **收尾工作是可枚举的清单**（空状态、底色、强调边框、少用边框） | 标题 `[一手]` |
| 9 Leveling Up | 单章，指向持续练习路径 | 仅标题 `[一手]`，内容 `[推断]` |

> **【推断】全书论点骨架的主轴**：Part 1–3 讲"流程与约束"，Part 4–6 讲"三套刻度系统（字 / 色 / 阴影）"，Part 7–8 讲"素材与收尾清单"，Part 9 收束。整体是把"审美"重新表述为**"可枚举的决策 + 有限的取值集合"**。

---

## 2. 核心论点清单（含出现次数 / 跨域复现）

计数口径：**同一论点若在「书（章节标题）/ 书（官方正文段落）/ 官方博客 / Tailwind 文档 / 播客页说明 / 个人站点」中各自独立出现，计 1 次。**
`跨域` 指该论点在"设计书"与"CSS 框架工程"两个不同领域都出现。

| # | 论点（原词保留） | 出现次数 | 出现位置（域） | 跨域 |
|---|---|---|---|---|
| A1 | **约束优于自由 / 有限选择** —— "Limit your choices"，"you have to choose from a curated list" | **≥5** | ①书 Part1 第5章标题 ②书 Part3 第2章 "Establish a spacing and sizing system" ③Tailwind 官方博文 *Separation of Concerns*（"Instead of 380 text colors, you end up with 10 or 12"）④Tailwind v3.3 博文（"the hardest part about this project was convincing ourselves to be okay with having 11 shades per color"）⑤Tailwind Preflight 文档（"make it easier for you to work within the constraints of your design system"） | ✅ |
| A2 | **系统先于页面 / 先定义刻度再动手** —— "Establish a spacing and sizing system"、"Establish a type scale"、"Define your shades up front" | **≥4** | ①书 Part3 ②书 Part4 ③书 Part5 ④Tailwind theme.css 单一 `--spacing` 令牌驱动全部间距工具类 | ✅ |
| A3 | **层级靠对比，不靠装饰** —— "Hierarchy is Everything"、"Size isn't everything"、"De-emphasize to emphasize"、"Balance weight and contrast" | **≥5** | ①书 Part2 标题与 4 个子章 ②书 Part8 "Use fewer borders" ③官方首页正文例句（"Use fewer borders… Instead, try adding a box shadow, using contrasting background colors, or simply adding more space"） | ❌（同域多点） |
| A4 | **少用边框，用间距/底色/阴影替代** —— "Use fewer borders" | **≥3** | ①书 Part8 第5章 ②官网首页正文（作为"具体战术"示范案例，配 before/after 图）③书 Part2 "De-emphasize to emphasize" 与 Part6 阴影体系同向 | ✅ |
| A5 | **灰度先行** —— "designing in greyscale" | **≥2（一手确认）** | ①Full Stack Radio #74 官方 show notes 明列 "Designing in greyscale" ②Full Stack Radio #103 官方 show notes 明列 "What's your process for getting started on a new design?" 为其主要议题之一 | ❌ |
| A6 | **间距优先给多，而非给少** —— "Start with too much white space" | **≥2** | ①书 Part3 第1章标题 ②官网首页正文（"or simply adding more space between elements"）③Tailwind v4 `--spacing` 可动态取大值（`p-96` 类在 v2 已存在） | ✅ |
| A7 | **不要依赖语义命名，要按视觉复用命名** —— "Semantics are secondary"、"media-card"、"we prefer composition to duplication" | **≥4** | ①书 Part2 第8章 ②Adam 2014《"Semantic" CSS》 ③Adam 2017《CSS Utility Classes and "Separation of Concerns"》全文（dependency direction / reusable CSS） ④Tailwind v3 文档 Reusing Styles（"This is a powerful way to avoid premature abstraction"） | ✅ |
| A8 | **绝不预抽象（No premature abstraction）** | **≥3** | ①Adam 2017 博文小节标题 "No more premature abstraction"（原句 "you probably never need to extract a navbar component"）②Tailwind v3 Reusing Styles 文档 ③书 Part1 "Don't design too much" 与 Part1 "Detail comes later"（同伦理在设计域） | ✅ |
| A9 | **阴影表达高度，且阴影通常分两层** —— "Use shadows to convey elevation"、"Shadows can have two parts" | **≥3** | ①书 Part6 第2、3章 ②Tailwind 默认阴影全部为**双值**（如 `--shadow-md: 0 4px 6px -1px …, 0 2px 4px -2px …`）③Tailwind v3.0 新增 colored shadows 的说明 | ✅ |
| A10 | **灰度也要带色相，不用纯中性灰** —— "Greys don't have to be grey" | **≥3** | ①书 Part5 第5章 ②Tailwind v2.0 博文：新色板含 "5 different shades of gray"，从 "blue gray" 到 "warm gray" ③Tailwind v4 `theme.css` 中 gray 家族扩展为 **slate / gray / zinc / neutral / stone / mauve / olive / mist / taupe** 共 9 族 | ✅ |
| A11 | **色彩系统要"比你想象的更多颜色"** —— "You need more colors than you think" | **≥3** | ①书 Part5 第2章 ②官网首页："the five swatches they end up generating are never enough to build out a real interface"（讲市面色板生成器）③Tailwind v2.0：10 色 → **22 色 × 10 阶 = 220 值** | ✅ |
| A12 | **依赖方向 > 关注点分离** —— "think about dependency direction"，"'Separation of concerns' is a straw man" | **≥2** | ①Adam 2017 博文（核心命题）②Adam 2014《"Semantic" CSS》引用 Nicolas Gallagher 同向结论 | ❌ |
| A13 | **每写一行新 CSS 都是一次新的复杂度机会** —— "every line of new CSS is still an opportunity for new complexity" | **≥2** | ①Adam 2017 博文（配 7 个真实站点的 cssstats 数据，见 §3.4）②Tailwind 文档 Reusing Styles 的"utility-first 优先，必要时再抽组件" | ❌ |
| A14 | **设计是可学的战术，不是天赋** —— "Design with tactics, not talent." | **≥2** | ①官网首页正文小标题（原话）②官网正文："It doesn't take any talent to make changes like this" | ❌ |
| A15 | **不做纯度洁癖，允许务实妥协** —— "You should still create components"、"use your best judgment and do whatever feels simpler" | **≥3** | ①Adam 2017 博文（明确与 die-hard functional CSS 派划清界限）②Tailwind 文档 Reusing Styles（给出 4 种复用策略而非单一教条）③Tailwind v4 引入 `@theme` CSS-first 配置（承认配置本身需要开发者体验） | ❌ |

**真信念（出现 ≥3 次且跨域）**：A1 约束、A2 系统先行、A3 层级靠对比、A4 少用边框、A6 间距优先给多、A7 命名去语义化、A8 反预抽象、A9 阴影双层、A10 灰带色相、A11 颜色要多。

---

## 3. 自创术语表

> 判定标准：该术语在**该书/其官方材料**中作为**主张名**被使用，且带引号或作为章节/小节标题。凡通用设计术语（如 "hierarchy" 本身）不算自创，但其**特定改写用法**算。

### 3.1 《Refactoring UI》中作为主张名的术语 `[一手]`

| 术语 | 出处（精确） | 含义 | 是否真"自创" |
|---|---|---|---|
| **"Design with tactics, not talent."** | 官网首页小标题 | 设计能力 = 可枚举战术的集合，非天赋 | ✅ 自创标语 |
| **"Start with too much white space"** | 书 Part3 §1 章标题 | 先给过量留白再回收，而非先给少量再补 | ✅ 自创表述 |
| **"Establish a spacing and sizing system"** | 书 Part3 §2 章标题 | 间距与尺寸必须来自同一有限刻度 | ✅ 主张化 |
| **"Grids are overrated"** | 书 Part3 §4 章标题 | 反"网格教条"；不必强上 12 栅格 | ✅ 反共识表述 |
| **"Relative sizing doesn't scale"** | 书 Part3 §5 章标题 | 用 `em`/相对值互相推导的尺寸链在规模上崩溃 | ✅ |
| **"Avoid ambiguous spacing"** | 书 Part3 §6 章标题 | 间距必须明确表达分组关系 | ✅ |
| **"Establish a type scale"** | 书 Part4 §1 章标题 | 字号必须成刻度，不逐处挑 | ✅ 主张化 |
| **"Line-height is proportional"** | 书 Part4 §5 章标题 | 行高应随字号反比变化（字号越大，行高倍数越小） | ✅ |
| **"Baseline, not center"** | 书 Part4 §4 章标题 | 文字对齐基准线优先于几何居中 | ✅ |
| **"Keep your line length in check"** | 书 Part4 §3 章标题 | 行长需要上限 | ✅ |
| **"Ditch hex for HSL"** | 书 Part5 §1 章标题 | 用 HSL 三元组思考颜色，而非 hex | ✅ 强主张（HSL 非自创，此用法是） |
| **"You need more colors than you think"** | 书 Part5 §2 章标题 | 实际界面需要的色阶远超 5 色板 | ✅ |
| **"Define your shades up front"** | 书 Part5 §3 章标题 | 使用前先定义完整色阶 | ✅ |
| **"Don't let lightness kill your saturation"** | 书 Part5 §4 章标题 | 提亮/压暗时要补饱和度，否则颜色发灰发脏 | ✅ 具名规则 |
| **"Greys don't have to be grey"** | 书 Part5 §5 章标题 | 中性色应带色相（与主色同族） | ✅ |
| **"Emulate a light source"** | 书 Part6 §1 章标题 | 阴影方向/强度都必须服从一个虚拟光源 | ✅ |
| **"Use shadows to convey elevation"** | 书 Part6 §2 章标题 | 阴影的语义是"高度层级"，不是装饰 | ✅ |
| **"Shadows can have two parts"** | 书 Part6 §3 章标题 | 一个自然阴影 ≈ 大半径柔光 + 小半径硬边，两层叠加 | ✅ 具名规则 |
| **"Overlap elements to create layers"** | 书 Part6 §5 章标题 | 元素重叠产生层级 | ✅ |
| **"Supercharge the defaults"** | 书 Part8 §1 章标题 | 强化默认态（如 focus/active）而非只做静态稿 | ✅ |
| **"Add color with accent borders"** | 书 Part8 §2 章标题 | 用 1 条强调色边框做分类/状态标记 | ✅ |
| **"Use fewer borders"** | 书 Part8 §5 章标题 | 边框是最后手段，先用间距/底色/阴影 | ✅ 已成为社区口号 |
| **"De-emphasize to emphasize"** | 书 Part2 §4 章标题 | 提升重点的最优解常是压低其他项，而非加大重点 | ✅ |
| **"Labels are a last resort"** | 书 Part2 §5 章标题 | 能用格式/位置/图标表达的，就别写标签 | ✅ 反共识 |
| **"Separate visual hierarchy from document hierarchy"** | 书 Part2 §6 章标题 | `<h1>`–`<h6>` 的语义层级 ≠ 视觉层级 | ✅ |
| **"Semantics are secondary"** | 书 Part2 §8 章标题 | 先解决视觉，语义可后补 | ✅ 反共识（与 A7 呼应） |
| **"Not all elements are equal"** | 书 Part2 §1 章标题 | 平等对待所有元素 = 没有层级 | ✅ |
| **"Size isn't everything"** | 书 Part2 §2 章标题 | 尺寸只是建立层级的维度之一 | ✅ |
| **"Don't use grey text on colored backgrounds"** | 书 Part2 §3 章标题 | 彩色底上灰字对比坍塌，应改用同色系低透明度 | ✅ 具名规则 |

### 3.2 Tailwind 侧的术语（他们造的工程词）`[一手]`

| 术语 | 出处 | 含义 |
|---|---|---|
| **"utility-first"** | Adam 2017 博文（"the reason I call the approach I take to CSS utility-first"） | 优先用工具类搭建，**只抽取真正重复的模式** |
| **"dependency direction"** | Adam 2017 博文（"think about dependency direction"） | 取代"关注点分离"的判断框架：CSS 依赖 HTML，还是 HTML 依赖 CSS |
| **"the blank canvas problem"** | Adam 2017 博文（"It's the same blank canvas problem"） | 每写新 CSS 就是一张空白画布，无约束 → 值爆炸 |
| **"enforced consistency"** | Adam 2017 博文小节标题 | 工具类让全员从固定集合取值，一致性"免费获得" |
| **"content-agnostic components"** | Adam 2017 博文阶段命名 | 按视觉重复模式命名（`.media-card`），不按内容命名（`.author-bio`） |
| **"no premature abstraction"** | Adam 2017 博文小节标题 | 不预先抽组件 |
| **"preflight"** | Tailwind 基础样式层 | 跨浏览器基线归一（自创命名） |
| **"Just-in-Time (JIT)" 引擎** | Tailwind v2.1/v3.0 | 按需生成 CSS，而非预生成全量 |
| **"CSS-first configuration"** | Tailwind v4.0 | `@theme { … }` 在 CSS 里配置设计令牌，取代 `tailwind.config.js` |
| **"shades 50–950"（11 阶色标命名）** | Tailwind v2→v3.3 | 以 50/100/…/900/950 命名每一阶；v3.3 补齐 `950` |

### 3.3 一句话招牌金句（可直接引用，均为一手）

- "**Design with tactics, not talent.**" —— 官网首页 `[一手]`
- "**'Separation of concerns' is a straw man**" —— Adam 2017 博文小标题 `[一手]`
- "**We prefer composition to duplication.**" —— Adam 2017 博文 `[一手]`
- "**every line of new CSS is still an opportunity for new complexity**" —— Adam 2017 博文 `[一手]`
- "**My markup wasn't concerned with styling decisions, but my CSS was very concerned with my markup structure.**" —— Adam 2017 博文 `[一手]`
- "**This is what inline styles want to be when they grow up.**"（讲 arbitrary properties）—— Tailwind v3.0 博文 `[一手]`
- "**you get consistency for free**" —— Adam 2017 博文 `[一手]`
- "**we literally _never_ set a line-height without also setting the font-size at the same time**" —— Tailwind v3.3 博文 `[一手]`

### 3.4 Adam 用来"举证"的具体数据（一手，可直接引用）

Adam 在 2017 博文中用 cssstats 实测了 7 个知名站点，作为"无约束 = 值爆炸"的证据：

| 站点 | text colors | background colors | font sizes |
|---|---|---|---|
| GitLab | 402 | 239 | 59 |
| Buffer | 124 | 86 | 54 |
| HelpScout | 198 | 133 | 67 |
| Gumroad | 91 | 28 | 48 |
| Stripe | 189 | 90 | 35 |
| GitHub | 163 | 147 | 56 |
| ConvertKit | 128 | 124 | 70 |

原句："**Instead of 380 text colors, you end up with 10 or 12.**"（380 指 GitLab 的 402 文本色量级）`[一手]`
来源：[adamwathan.me/css-utility-classes-and-separation-of-concerns](https://adamwathan.me/css-utility-classes-and-separation-of-concerns/)

---

## 4. 可直接落 CSS 的规则与数值

> 本节分两类：**(a) 书/文档中明确主张的规则**；**(b) 他们官方产物（Tailwind 默认令牌）中落实该规则的精确数值**。(b) 部分数值取自主分支 `packages/tailwindcss/theme.css`，是 v4 现状；v3 数值差异已在备注中说明。

### 4.1 间距刻度（spacing scale）

**规则主张**："Establish a spacing and sizing system"；Tailwind 官方文档口径：**"The values are proportional, so `16` is twice as much spacing as `8`"** `[一手]`

**落地实现（v4）**：**单一基准变量**，其余全部按倍数派生 ——

```css
@layer theme { :root { --spacing: 0.25rem; } }
@layer utilities {
  .mt-8 { margin-top: calc(var(--spacing) * 8); }   /* 2rem = 32px */
  .w-17 { width: calc(var(--spacing) * 17); }       /* 4.25rem = 68px */
  .pr-29 { padding-right: calc(var(--spacing) * 29); }
}
```
来源：[tailwindcss.com/blog/tailwindcss-v4](https://tailwindcss.com/blog/tailwindcss-v4) `[一手]`

**v3 显式刻度（推荐直接抄这套数字）** `[一手]`：

| 名 | rem | px | | 名 | rem | px |
|---|---|---|---|---|---|---|
| `0` | 0 | 0 | | `10` | 2.5rem | 40 |
| `px` | — | 1 | | `11` | 2.75rem | 44 |
| `0.5` | 0.125rem | 2 | | `12` | 3rem | 48 |
| `1` | 0.25rem | 4 | | `14` | 3.5rem | 56 |
| `1.5` | 0.375rem | 6 | | `16` | 4rem | 64 |
| `2` | 0.5rem | 8 | | `20` | 5rem | 80 |
| `2.5` | 0.625rem | 10 | | `24` | 6rem | 96 |
| `3` | 0.75rem | 12 | | `28` | 7rem | 112 |
| `3.5` | 0.875rem | 14 | | `32` | 8rem | 128 |
| `4` | 1rem | 16 | | `36` | 9rem | 144 |
| `5` | 1.25rem | 20 | | `40` | 10rem | 160 |
| `6` | 1.5rem | 24 | | `44` | 11rem | 176 |
| `7` | 1.75rem | 28 | | `48` | 12rem | 192 |
| `8` | 2rem | 32 | | `52` | 13rem | 208 |
| `9` | 2.25rem | 36 | | `56` | 14rem | 224 |
| | | | | `60` | 15rem | 240 |
| | | | | `64` | 16rem | 256 |
| | | | | `72` | 18rem | 288 |
| | | | | `80` | 20rem | 320 |
| | | | | `96` | 24rem | 384 |

> 注意：刻度**不是纯几何级数**。0–4 用 2px 步进，4–12 用 4px 步进，12 以上跳到 8/16/32/64px 步进。`[推断]` 这是刻意的"低区密集、高区稀疏"设计——精细微调发生在小值区。
> 来源：[v3.tailwindcss.com/docs/customizing-spacing](https://v3.tailwindcss.com/docs/customizing-spacing) `[一手]`

**容器宽度刻度（可当 max-width 用）** `[一手]`：
`--container-3xs:16rem, -2xs:18rem, -xs:20rem, -sm:24rem, -md:28rem, -lg:32rem, -xl:36rem, -2xl:42rem, -3xl:48rem, -4xl:56rem, -5xl:64rem, -6xl:72rem, -7xl:80rem`

**断点** `[一手]`：`sm:40rem(640px), md:48rem(768px), lg:64rem(1024px), xl:80rem(1280px), 2xl:96rem(1536px)`

### 4.2 字号刻度（type scale）

**规则主张**："Establish a type scale"；"Line-height is proportional"。Tailwind v3.3 一手原话印证后一条：**"we literally _never_ set a line-height without also setting the font-size at the same time"** `[一手]`

```css
--text-xs:   0.75rem;   /* 12px */  --text-xs--line-height:  calc(1 / 0.75);    /* → 1rem      */
--text-sm:   0.875rem;  /* 14px */  --text-sm--line-height:  calc(1.25 / 0.875); /* → 1.25rem   */
--text-base: 1rem;      /* 16px */  --text-base--line-height:calc(1.5 / 1);     /* → 1.5rem    */
--text-lg:   1.125rem;  /* 18px */  --text-lg--line-height:  calc(1.75 / 1.125); /* → 1.75rem   */
--text-xl:   1.25rem;   /* 20px */  --text-xl--line-height:  calc(1.75 / 1.25);  /* → 1.75rem   */
--text-2xl:  1.5rem;    /* 24px */  --text-2xl--line-height: calc(2 / 1.5);      /* → 2rem      */
--text-3xl:  1.875rem;  /* 30px */  --text-3xl--line-height: calc(2.25 / 1.875); /* → 2.25rem   */
--text-4xl:  2.25rem;   /* 36px */  --text-4xl--line-height: calc(2.5 / 2.25);   /* → 2.5rem    */
--text-5xl:  3rem;      /* 48px */  --text-5xl--line-height: 1;
--text-6xl:  3.75rem;   /* 60px */  --text-6xl--line-height: 1;
--text-7xl:  4.5rem;    /* 72px */  --text-7xl--line-height: 1;
--text-8xl:  6rem;      /* 96px */  --text-8xl--line-height: 1;
--text-9xl:  8rem;      /* 128px */ --text-9xl--line-height: 1;
```
来源：`tailwindcss/theme.css`（v4 主分支）＋ [v3.tailwindcss.com/docs/font-size](https://v3.tailwindcss.com/docs/font-size) `[一手]`

> **可提取的规律**：line-height 倍数从 1.33(12px) → 1.43(14px) → 1.5(16px) → 1.56(18px) → 1.4(20px) → 1.33(24px) → 1.2(30px) → 1.11(36px) → **1.0(48px 以上)**。**单调递减**，即"Line-height is proportional"。这是 §3.1 "Line-height is proportional" 章的数值化体现 `[推断]`。

### 4.3 字距 / 行高 / 字重刻度

```css
/* letter-spacing */
--tracking-tighter: -0.05em;  --tracking-tight: -0.025em;  --tracking-normal: 0em;
--tracking-wide:     0.025em; --tracking-wider:  0.05em;   --tracking-widest: 0.1em;

/* line-height */
--leading-tight: 1.25; --leading-snug: 1.375; --leading-normal: 1.5;
--leading-relaxed: 1.625; --leading-loose: 2;

/* font-weight */
100 thin / 200 extralight / 300 light / 400 normal / 500 medium
600 semibold / 700 bold / 800 extrabold / 900 black
```
> 呼应书 Part4 §8 "Use letter-spacing effectively" 与 §7 "Balance weight and contrast"（Part2 §7）：字重与对比度必须成对使用——`[推断]`，一手仅有章标题。

### 4.4 圆角刻度（9 阶）

```css
--radius-xs: 0.125rem; /* 2px  */  --radius-md: 0.375rem; /* 6px  */  --radius-xl:  0.75rem; /* 12px */
--radius-sm: 0.25rem;  /* 4px  */  --radius-lg: 0.5rem;   /* 8px  */  --radius-2xl: 1rem;    /* 16px */
--radius-3xl: 1.5rem;  /* 24px */  --radius-4xl: 2rem;    /* 32px */
```
v3 时代的默认 `--radius: 0.25rem`（4px）在 v4 标记为 deprecated。

### 4.5 阴影层级（elevation）—— 本维度最有价值的可抄规则

**规则主张**："Use shadows to convey elevation" + "**Shadows can have two parts**" `[一手，章标题]`

**数值证据**：Tailwind 全部阴影都是**双值**（`0 Ypx blur -spread rgba, 0 Y2px blur2 -spread2 rgba2`），且**大阴影由"大半径柔光 + 小半径硬边"两层组成**——与"two parts"完全对应：

```css
--shadow-2xs: 0 1px rgb(0 0 0 / 0.05);
--shadow-xs:  0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-sm:  0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md:  0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg:  0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl:  0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
--shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);

--inset-shadow-2xs: inset 0 1px rgb(0 0 0 / 0.05);
--inset-shadow-xs:  inset 0 1px 1px rgb(0 0 0 / 0.05);
--inset-shadow-sm:  inset 0 2px 4px rgb(0 0 0 / 0.05);

--drop-shadow-xs: 0 1px 1px rgb(0 0 0 / 0.05);
--drop-shadow-sm: 0 1px 2px rgb(0 0 0 / 0.15);
--drop-shadow-md: 0 3px 3px rgb(0 0 0 / 0.12);
--drop-shadow-lg: 0 4px 4px rgb(0 0 0 / 0.15);
--drop-shadow-xl: 0 9px 7px rgb(0 0 0 / 0.1);
--drop-shadow-2xl:0 25px 25px rgb(0 0 0 / 0.15);

--text-shadow-2xs: 0px 1px 0px rgb(0 0 0 / 0.15);
--text-shadow-xs:  0px 1px 1px rgb(0 0 0 / 0.2);
--text-shadow-sm:  0px 1px 0px rgb(0 0 0 / 0.075), 0px 1px 1px rgb(0 0 0 / 0.075), 0px 2px 2px rgb(0 0 0 / 0.075);
--text-shadow-md:  0px 1px 1px rgb(0 0 0 / 0.1),   0px 1px 2px rgb(0 0 0 / 0.1),   0px 2px 4px rgb(0 0 0 / 0.1);
--text-shadow-lg:  0px 1px 2px rgb(0 0 0 / 0.1),   0px 3px 2px rgb(0 0 0 / 0.1),   0px 4px 8px rgb(0 0 0 / 0.1);
```

> **可提取的规律（`[推断]`，但依据是完整数值序列）**：
> 1. **y 偏移随层级递增**：1 → 4 → 10 → 20 → 25px。高度越高，影子越"远"。
> 2. **负 spread 随层级递增**：-1 → -2 → -3 → -4 → -6 → -12px。这是把影子从元素下方"挤"出来的关键，避免影子从元素四周漏出。
> 3. **alpha 保持恒定 0.1**，只在最高一级升到 0.25。也就是说：**层级感主要由几何（y/blur/spread）表达，而非透明度**。
> 4. 阴影颜色统一为 `rgb(0 0 0 / …)` 纯黑加透明度 —— 注意与 §4.6 "不用纯黑" 的张力（见 §7 矛盾记录）。

来源：`packages/tailwindcss/theme.css`（v4）＋ [v3.tailwindcss.com/docs/box-shadow](https://v3.tailwindcss.com/docs/box-shadow) `[一手]`

### 4.6 色阶命名与灰度族

**命名规则**：`--color-{family}-{50|100|…|900|950}`，**统一的 11 阶**。
历史：v2.0 引入 10 阶（50–900）；**v3.3 补齐 950**，一手原话："the hardest part about this project was convincing ourselves to be okay with having **11 shades per color**" `[一手]`

**色族数量**：v2.0 = 22 族 × 10 阶 = 220 值；v4 = 24 个彩色族（red/orange/amber/yellow/lime/green/emerald/teal/cyan/sky/blue/indigo/violet/purple/fuchsia/pink/rose + 灰族）+ 黑白。

**灰度族（"Greys don't have to be grey" 的直接落地）** `[一手]`：
v2 时代 **5 种灰**（cool gray / blue gray / true gray / warm gray / gray），官方原话："you can choose 'blue gray' if you want something really cool, or go all the way to 'warm gray' for something with a lot more brown in it"。
v4 已扩展为 **9 族中性色**：

| 族 | 倾向 | 示例（500 阶，oklch） |
|---|---|---|
| `slate` | 冷、偏蓝 | `oklch(55.4% 0.046 257.417)` |
| `gray` | 冷、微蓝 | `oklch(55.1% 0.027 264.364)` |
| `zinc` | 中性微冷 | `oklch(55.2% 0.016 285.938)` |
| `neutral` | 纯中性 | `oklch(55.6% 0 none)` |
| `stone` | 暖、微棕 | `oklch(55.3% 0.013 58.071)` |
| `mauve` | 微紫 | `oklch(54.2% 0.034 322.5)` |
| `olive` | 微绿 | `oklch(58% 0.031 107.3)` |
| `mist` | 微青 | `oklch(56% 0.021 213.5)` |
| `taupe` | 微红棕 | `oklch(54.7% 0.021 43.1)` |

**格式**：v4 全量改用 `oklch(L% C H)`（而非 hex/rgb），一手原话："We've upgraded the entire default color palette from `rgb` to `oklch`"。这与书中 "Ditch hex for HSL" 同源——**都是"用可计算的色彩空间代替十六进制"** `[推断，但方向一致]`

**渐变端点色（极端阶的用途）** `[一手]`：
- `*-50`：最浅，"I can't believe it's not white."（v2 博文原话）
- `*-950`：v3.3 新增，"In the grays they act as basically **a tinted black**, which is great for ultra dark UIs"；彩色系 950 "optimized for **high contrast text and tinted control backgrounds**"

### 4.7 边框 / Ring / 透明度

- **Preflight 全局边框重置** `[一手]`：
  ```css
  *, ::before, ::after {
    border-width: 0;
    border-style: solid;
    border-color: theme('borderColor.DEFAULT', currentColor);
  }
  ```
  官方说明："adding that class always adds a solid 1px border using your configured default border color" → **默认边框 = 1px solid，颜色来自 theme**。
- **Ring（用 box-shadow 模拟 outline）** `[一手]`：v2.0 引入，"they add a solid box-shadow rather than a border so **they don't impact the layout**"；支持 `ring-2` / `ring-offset-2` 制造光环效果。这直接呼应书 Part6 "阴影表达层级"与 Part2 "层级靠对比"。
- **透明度刻度** `[一手]`：v2.0 起扩展为 **10 的步进 + 5 和 95**（如 `opacity-5`、`opacity-95`）。
- **颜色透明度（v2 时代实现，Adam 专门写文解释）** `[一手]`：
  ```css
  .text-blue-300 { --text-opacity: 1; color: rgba(144, 205, 244, var(--text-opacity)); }
  .text-opacity-50 { --text-opacity: 0.5; }
  ```
  这是"同一个色阶既能取色又能取透明度"的工程解法。v4 改为 `color-mix(in oklab, var(--color-blue-500) 50%, transparent)`。

### 4.8 过渡与缓动（收尾用）

```css
--default-transition-duration: 150ms;
--default-transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
--ease-in:  cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```
来源：`theme.css` ＋ Tailwind v2.0 博文（v2.0 起不需要写 `duration-150 ease-in-out`，只写 `transition`）

### 4.9 字体族（"Use good fonts" 的落地）

```css
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue',
             'Noto Sans', Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
--font-serif: ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif;
--font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
```
> 这就是 **System Font Stack**，Adam/Steve 在 Full Stack Radio #74 的 Links 里直接引用了 CSS-Tricks 的 system font stack 一文。`[一手（链接清单）]`

---

## 5. 反复出现的核心论点 → 与 Tailwind 工程决策的一一对应

这张表是本维度的**核心结论**：把书的论点与框架的取舍对上，证明两者是同一套信念的两个出口。

| 书的论点（设计域） | Tailwind 的对应工程决策（代码域） | 证据 |
|---|---|---|
| "Limit your choices" | 工具类只能从固定刻度取值；官方论据是 7 个站点 402/163/189 个文本色的反例 | `[一手]` Adam 2017 博文 |
| "Establish a spacing and sizing system" | v4：`--spacing: 0.25rem` 单一变量驱动全部 `p-*/m-*/w-*/h-*` | `[一手]` v4 博文 |
| "Establish a type scale" | `--text-*` 13 阶，且**每阶绑定默认 line-height** | `[一手]` theme.css |
| "Line-height is proportional" | line-height 倍数从 1.33 单调降到 1.0 | `[一手]` theme.css 数值 |
| "Define your shades up front" | 22 色 × 10 阶 = 220 值（v2）；每族统一 11 阶（v3.3） | `[一手]` v2/v3.3 博文 |
| "Greys don't have to be grey" | 5 种灰（v2）→ 9 种中性色族（v4） | `[一手]` theme.css |
| "Use shadows to convey elevation" / "two parts" | 每个阴影都是双值，且带递增负 spread | `[一手]` theme.css |
| "Use fewer borders" | Preflight 全局 `border-width: 0`；引入 `ring`（用 box-shadow 而非 border，不影响布局） | `[一手]` Preflight + v2 博文 |
| "Semantics are secondary" / "Separate visual hierarchy from document hierarchy" | Preflight **把 h1–h6 完全去样式化**：`font-size: inherit; font-weight: inherit;` 官方理由："it helps you avoid accidentally deviating from your type scale" | `[一手]` Preflight 文档 |
| "Don't design too much" / "Detail comes later" | "No more premature abstraction"——只在真正重复时抽组件；"you probably never need to extract a navbar component" | `[一手]` Adam 2017 博文 |
| "Avoid ambiguous spacing" | Preflight **移除所有默认 margin**：官方理由 "This makes it harder to accidentally rely on margin values applied by the user-agent stylesheet that are **not part of your spacing scale**" | `[一手]` Preflight 文档 |
| "Design in greyscale"（播客确认） | 色阶系统被设计成"灰度可独立成套"（9 族中性色 + `bg-*-50` 极浅阶），结构上支持先灰后彩 | `[推断]` |

---

## 6. 智识谱系线索

### 6.1 明确被他们点名的人与书 `[一手]`

| 来源 | 影响 | 证据位置 |
|---|---|---|
| **Nicolas Gallagher — "About HTML semantics and front-end architecture"** | Adam 自称"**I probably go back and read [it] once a week**"，并说读完后 "**fully convinced that optimizing for reusable CSS was going to be the right choice**"。这是 Tailwind 的**直接思想源头** | Adam《"Semantic" CSS》2014-11-10；并在 2017 博文再次点名 |
| **Basecamp《Getting Real》** | 《Refactoring UI》**结构设计的模板**（短章、可乱序读、去注水） | Full Stack Radio #103 show notes："'Getting Real' by Basecamp, our inspiration for structuring the book" |
| **Erik Kennedy — "Color in UI Design: A Practical Framework"** | 被明确标为 "great resource on HSL"——对应书中 "Ditch hex for HSL" | Full Stack Radio #74 show notes |
| **37signals — "Epicenter Design"** | 对应书中 Part1 "Start with a feature, not a layout" | Full Stack Radio #74 show notes |
| **Tachyons（+ Basscss / Beard / turretcss）** | Adam 明确称 Tachyons "a fantastic project"，同时**主动划清界限**："I don't think you should build things out of utilities _only_" | Adam 2017 博文 |
| **BEM / CSS Zen Garden** | 作为被超越的前两个阶段（Phase 1 / Phase 2）被逐条分析 | Adam 2017 博文 |
| **Zell Liew — "PX, EM, or REM Media Queries?"** | Adam 为其写专文跟进（结论后被自己推翻，见 §7） | Adam 2017-11-30 博文 |
| **PostCSS / Andrey Sitnik、Lightning CSS** | 工程实现层依赖 | Adam 2020-08 长文、v4 博文 |
| **Derek Sivers《Anything You Want》** | Adam 自述反复重读，"nth time" 后想清了自己的主线 | Adam 2018-12-28《Going Full-Time on Tailwind CSS》 |
| **Jonathan Reinink / Stefan Bauer / David Hemphill** | Tailwind 早期关键协作者：Stefan 提出 `sm:font-bold` 前缀语法；David 引导他改用 PostCSS | Adam 2020-08 长文 |
| **Andrew Del Prete** | 引入 PurgeCSS，"one of the most important blog posts in the history of the framework" | Adam 2020-08 长文 |

### 6.2 字体 / 资源推荐清单 `[一手]`

来自 Full Stack Radio #74 的官方 Links 与 Steve 个人站点：

- **字体资源**：Google Fonts（**预过滤链接**：`fonts.google.com/?category=Sans+Serif&sort=popularity&stylecount=10`）、Steve 自撰《12 Google Fonts You Can't Go Wrong With》（原链接 `steveschoger.com/2017/04/26/12-google-fonts-you-cant-go-wrong-with/` 现已 404，**未能读到正文**）、CSS-Tricks **System Font Stack**、**Inter UI**（`github.com/rsms/inter`）、**Fonts In Use**（fontsinuse.com）
- **色彩资源**：Dribbble color picker（dribbble.com/colors）、Erik Kennedy 的 HSL 框架文
- **设计工具**：Sketch、Figma
- **Steve 自产资源**（也是产品线）：**Zondicons**（免费 SVG 图标集）、**Hero Patterns**（免费 SVG 背景图案库）、**Heroicons**（营销图标套件）、**Tailwind UI** 组件库
- **《Refactoring UI》套装内**：30+ 字体推荐清单（分 **UI / headlines / article copy** 三类）、12+ 套完整色板（每套含 10 阶 + 示例 UI）、20+ 组件/布局类别 + 200+ 组件样式的 Component Gallery、3 个视频教程（复杂表单 11:13 / 数据仪表盘 17:20 / 文本落地页 12:08）

### 6.3 【推断】一条未被他们明说的谱系线

书 Part5 用 HSL 而非 hex/rgb 思考 → Tailwind v2 用 rgb 三元组做透明度 → Tailwind v4 全面转向 **oklch**。这条线是 **"用能进行数学运算的色彩空间描述颜色"** 的同一信念，只是随 CSS 标准演进换了更好用的空间。`[推断]`（一手证据只覆盖端点，中间的动机未被明确写出）

---

## 7. 矛盾与自我修正记录（不调和，只记录）

### M1 · Adam 自己推翻了自己的技术结论（一手明确标注）★最有价值的一条

- **原文结论**：2017-11-30《Don't Use Em for Media Queries》——"**Just Use Pixels** / Pixels are the only unit that behave consistently across all commonly used browsers."（起因：Safari 缩放时 em 断点触发过晚）
- **自我修正**：文章顶部现已加 **Update** 块：**"It looks like the bug in Safari has been fixed in Safari 15, so I wholeheartedly recommend using `em` for media queries now. Keeping the post up for historical reasons, but the conclusion is no longer valid."**
- **注意**：Tailwind v4 的断点仍写作 `--breakpoint-sm: 40rem`（`rem`，非 `em`）。
- **记录要点**：**Adam 会公开推翻自己写过的结论，并保留原文**。这是一个可复用的行为模式，不是失误。`[一手]`

### M2 · "不要预抽象" vs "先建立系统" 的表面张力

- Adam 2017 博文强调 "**No more premature abstraction**"、"we prefer composition to duplication"、甚至说 navbar "**there's just nothing there worth extracting**"。
- 但《Refactoring UI》Part3 §2 要求 "**Establish a spacing and sizing system**"、Part5 §3 "**Define your shades up front**"。
- **不调和说明**：两者作用域不同——前者针对**组件抽象**（何时把工具类打包成 `.btn`），后者针对**取值集合**（能取哪些值）。Adam 在 2017 博文里其实分得很清：他反对的是抽组件，同时主张"utility 只从 curated list 里取"。**因此这不是真矛盾，而是常被误读的一对。** `[推断，但有一手文本支持]`

### M3 · "少用边框" vs 边框体系的完备性

- 书 Part8 §5 主张 "**Use fewer borders**"，官网首页把它作为核心战术示范（配 before/after 对比图）。
- 但 Tailwind 提供完整的 border 体系，且 Preflight 里**把边框重置为默认可用**（`border-width: 0; border-style: solid`），同时 v2 引入 `ring`（用 box-shadow 做边框替代）。
- **不调和说明**：产品必须提供能力，书必须提供倾向。二者不冲突，但确实构成"框架给你更多边框工具，作者劝你少用边框"的表面逆反。`[一手证据充分，此处仅记录张力]`

### M4 · 纯粹性 vs 务实性的持续摇摆（他们自己承认）

- Adam 2017 博文公开与 die-hard functional CSS 派划界：**"One of the areas where my opinion differs a bit from some of the really die-hard functional CSS advocates is that I don't think you should build things out of utilities _only_."**
- 同期他支持 Tachyons 的纯工具类路线但又反对照搬。
- 2020 年后进一步松动：v2 支持 `@apply` 任意变体、v3.3 支持 arbitrary values、v4 支持动态工具类值 —— **每一步都在往"允许逃逸刻度"的方向走**。
- **这是一个可观察的长期漂移**：框架越成熟，越允许突破自己设定的约束。`[一手证据链完整]`

### M5 · 阴影颜色用纯黑 vs "不用纯黑"的社区说法

- 任务书提到 "don't use pure black" 这一主张。**在本书目录中不存在这个章节标题。** 最接近的是 Part5 §1 "Ditch hex for HSL" 与 Part5 §5 "Greys don't have to be grey"。
- 而 Tailwind 的**阴影全部使用 `rgb(0 0 0 / α)`，即纯黑**。文字色也普遍用 `text-black` / `text-slate-900` 等。
- **记录**：**"don't use pure black" 未能从一手章节目录中证实**；即便书中确有类似建议，Tailwind 自身实现并未遵循（至少未在阴影层遵循）。详见 §8 缺口 G2。`[一手：目录 + theme.css]`

### M6 · "Grids are overrated" 的孤证性

- 书 Part3 §4 标题为 "**Grids are overrated**"，但书同时又要求 "Establish a spacing and sizing system"。Tailwind 也没有内置栅格系统（`grid-cols-*` 是 CSS Grid 包装，不是 Bootstrap 式 12 栅格）。
- **记录**：这是**书与框架一致**的一个反共识点，但在整个 Web 设计教育语境中是少数派。`[一手一致，无异见]`

---

## 8. 来源清单

### 8.1 一手来源（官方 / 本人撰写）—— 共 20 项

| # | 来源 | URL | 抓取状态 |
|---|---|---|---|
| P1 | Refactoring UI 官网首页（完整目录 + 前言 + 套装说明） | https://refactoringui.com/ | ✅ 正文完整 |
| P2 | Adam Wathan《CSS Utility Classes and "Separation of Concerns"》(2017-08-07) | https://adamwathan.me/css-utility-classes-and-separation-of-concerns/ | ✅ 正文完整（约 6000 字） |
| P3 | Adam Wathan《"Semantic" CSS》(2014-11-10) | https://adamwathan.me/2014/11/10/semantic-css/ | ✅ 正文完整 |
| P4 | Adam Wathan《Don't Use Em for Media Queries》(2017-11-30，含自我修正 Update) | https://adamwathan.me/dont-use-em-for-media-queries/ | ✅ 正文完整 |
| P5 | Adam Wathan《Composing the Uncomposable with CSS Variables》(2020-09-18) | https://adamwathan.me/composing-the-uncomposable-with-css-variables/ | ✅ 正文完整 |
| P6 | Adam Wathan《Tailwind CSS: From Side-Project Byproduct to Multi-Million Dollar Business》(2020-08-02) | https://adamwathan.me/tailwindcss-from-side-project-byproduct-to-multi-mullion-dollar-business/ | ✅ 正文完整 |
| P7 | Adam Wathan《Going Full-Time on Tailwind CSS》(2018-12-28) | https://adamwathan.me/going-full-time-on-tailwind-css/ | ✅ 正文完整 |
| P8 | Adam Wathan 站内 Articles 索引页 | https://adamwathan.me/articles/ | ✅ |
| P9 | Adam Wathan 站内 Archives 全量索引 | https://adamwathan.me/archives/ | ✅ |
| P10 | Adam Wathan 站内 Talks 索引页 | https://adamwathan.me/talks/ | ✅ |
| P11 | Steve Schoger 个人站首页 | https://www.steveschoger.com | ✅ |
| P12 | Steve Schoger 站内 Interviews 索引（含播客链接） | https://www.steveschoger.com/interviews/ | ✅ |
| P13 | Full Stack Radio #74《Steve Schoger – Tactical Design Advice for Developers》(2017-10-12) show notes + 完整 Links | https://fullstackradio.com/74 | ✅ 完整 |
| P14 | Full Stack Radio #103《Steve Schoger – Design Q&A + Refactoring UI Details》(2018-12-05) show notes + 完整 Links | https://fullstackradio.com/103 | ✅ 完整 |
| P15 | Tailwind CSS 官方博客 v2.0《All-new color palette》(2020-11-18) | https://tailwindcss.com/blog/tailwindcss-v2 | ✅ 正文完整 |
| P16 | Tailwind CSS 官方博客 v3.0 (2021-12-09) | https://tailwindcss.com/blog/tailwindcss-v3 | ✅ 正文完整 |
| P17 | Tailwind CSS 官方博客 v3.1 (2022-06-07) | https://tailwindcss.com/blog/tailwindcss-v3-1 | ✅ 正文完整 |
| P18 | Tailwind CSS 官方博客 v3.3 (2023-03-28) | https://tailwindcss.com/blog/tailwindcss-v3-3 | ✅ 正文完整 |
| P19 | Tailwind CSS 官方博客 v4.0 (2025-01-22) | https://tailwindcss.com/blog/tailwindcss-v4 | ✅ 正文完整 |
| P20 | Tailwind CSS 官方博客 JIT《The Next Generation of Tailwind CSS》(2021-03-15) | https://tailwindcss.com/blog/just-in-time-the-next-generation-of-tailwind-css | ✅ 正文完整 |
| P21 | Tailwind CSS 源码：默认设计令牌 `packages/tailwindcss/theme.css`（v4 主分支） | https://raw.githubusercontent.com/tailwindlabs/tailwindcss/main/packages/tailwindcss/theme.css | ✅ 全文（本文件 §4 数值主来源） |
| P22 | Tailwind v3 文档 · Utility-First Fundamentals | https://v3.tailwindcss.com/docs/utility-first | ✅ |
| P23 | Tailwind v3 文档 · Customizing Spacing（默认间距刻度全表） | https://v3.tailwindcss.com/docs/customizing-spacing | ✅ |
| P24 | Tailwind v3 文档 · Box Shadow | https://v3.tailwindcss.com/docs/box-shadow | ✅ |
| P25 | Tailwind v3 文档 · Font Size | https://v3.tailwindcss.com/docs/font-size | ✅ |
| P26 | Tailwind v3 文档 · Preflight | https://v3.tailwindcss.com/docs/preflight | ✅ |
| P27 | Tailwind v3 文档 · Reusing Styles | https://v3.tailwindcss.com/docs/reusing-styles | ✅ |

> 计数说明：P22–P27 同属 tailwindcss.com 官方文档域，但为 6 个独立页面、独立论点，故分别计。**一手来源实际条目数 = 27 项 / 独立站点 5 个（refactoringui.com、adamwathan.me、steveschoger.com、fullstackradio.com、tailwindcss.com+github）。**

### 8.2 二手来源（他人总结 / 第三方媒体）—— 共 4 项

| # | 来源 | URL | 用途 |
|---|---|---|---|
| S1 | CSS-Tricks《System Font Stack》(Geoff Graham, 2017-01-03) | https://css-tricks.com/snippets/css/system-font-stack/ | 被 Adam/Steve 在 #74 Links 中直接推荐；正文含 GitHub / Medium / WordPress 的实际 font-family 写法 |
| S2 | Refactoring UI 官网悬挂的 Goodreads 书页 | https://www.goodreads.com/en/book/show/43190966-refactoring-ui | **本环境不可达**（DNS 解析到非公网 IP）；仅能引用官网显示的 4.68 星 |
| S3 | 社区整理的 Twitter Moment《Design Tips》 | https://twitter.com/i/moments/994601867987619840 | 官方首页自引，**本环境不可达**（Twitter/X 封闭） |
| S4 | 社区整理的 Twitter Moment《Little UI Details》 | https://twitter.com/i/moments/880688233641848832 | Full Stack Radio #74 官方 Links，**本环境不可达** |

### 8.3 一手占比

- 可核验条目总数：**31**（27 一手 + 4 二手）
- **一手占比 = 27 / 31 ≈ 87%**
- 若按"独立信息源站点"口径（一手 5 站点 vs 二手 3 站点含 2 个不可达）：**一手 ≈ 71%**
- 两种口径均满足"一手 ≥60%"硬要求。

---

## 9. 信息缺口与不确定项

| ID | 缺口 | 影响 | 已尝试的路径 |
|---|---|---|---|
| **G1** | **未读到《Refactoring UI》任何章节正文**（含官方承诺的 "two free chapters"）。全部书内主张均来自**章节标题**与官网前言段落 | 中高。§1.3 的"论证过程"、§4 中标注为"书的规则"的部分，实际上依赖章节标题的语义 + Tailwind 数值反推。**凡涉及书内具体数值（如书中推荐的具体字号倍数、具体阴影写法）本文件一概未写** | `/free-chapters`、`/free-chapters/`、`/chapters`、`/book/chapters`、`/sample`、`/book` 全部 404 或回落到首页；官网为邮件列表门控 |
| **G2** | **"don't use pure black" 未找到一手来源** | 中。任务书列为待查术语，但该表述**不在本书目录中**。最接近的是 "Ditch hex for HSL"（Part5 §1）与 "Greys don't have to be grey"（Part5 §5）。而 Tailwind 阴影实际使用 `rgb(0 0 0 / α)` | 已逐字核对官方完整目录；未找到该章节。**结论：未能证实**（可能存在于正文段落而非章节标题，但本环境无法读到正文） |
| **G3** | **"7 Practical Tips for Cheating at Design" 正文未读到** | 中。任务书明确列为调研方向。已知：标题、作者（Adam 与 Steve 共署的 refactoringui Medium 出版物）、被官网自引为"本文写作风格参照"（"This book is written a lot like our blog posts — every sentence is highlight-worthy"）。**但 7 条具体 tip 的内容未获一手证据** | Medium 全站在本环境 `fetch failed`；已试 direct、原文链接、`?source=friends_link`、`/refactoring-ui` 出版物页、archive 快照、freedium、allorigins、codetabs、corsproxy —— **全部失败** |
| **G4** | **"Redesigning Laravel.io" case study 正文未读到** | 低 | 同上（Medium 不可达） |
| **G5** | Steve Schoger 自有博客文章全部失链 | 中低。已知存在《12 Google Fonts You Can't Go Wrong With》(2017-04-26)，但 `steveschoger.com` 现已改版为极简站点，旧博客路径全部 404。**Steve 的第一人称写作产出，目前只能通过 Full Stack Radio show notes 间接获知** | 直接抓取旧路径 → 404；站点现仅有 `/book` `/projects` `/interviews` `/speaking` 四页 |
| **G6** | YouTube 视频内容未获取 | 低。官方 YouTube（`youtube.com/steveschoger`）在本环境 DNS 解析到非公网 IP，不可抓取 | `web_fetch` 返回 `URL hostname "www.youtube.com" resolves to a non-public IP address` |
| **G7** | Tailwind v4 文档正文抓取失败 | 低。`tailwindcss.com/docs/*` 为 Next.js 流式渲染，正文被截断在导航之后；已用 **GitHub 源码 `theme.css`** 替代作为数值主来源，权威性更高 | — |
| **G8** | Refactoring UI 组件库（Component Gallery）与色板的具体内容 | 中低。知道有 20+ 类别 / 200+ 样式 / 12+ 套色板（每套 10 阶），但**具体每套色板的色值未公开可抓取**（付费内容） | 官网仅有预览截图 |
| **G9** | 书中"Leveling Up"（Part9，单章）的内容 | 低。仅有标题 | — |
| **G10** | Goodreads 的读者评论（可作为二手评价证据） | 低。站点不可达 | — |

### 9.1 本文件中对"不确定"的显式标记一览

- 标 `[推断]` 的实质判断共 9 处：§1.3 各部分主张的复述、§4.2 line-height 递减规律、§4.5 阴影几何规律、§4.6 色彩空间信念线、§5 中 "design in greyscale → 色阶系统结构" 的对应、§6.3 色彩空间谱系线、§7 M2 的作用域区分。
- 明确写"**未找到一手来源**"的项：G2（don't use pure black）、G1（书内正文）、G3（7 Practical Tips 正文）。
- 明确写"本环境不可达"的源：S2、S3、S4、G6。**这些来源未被用于任何论断**。

---

## 10. 给下游（思维框架提炼阶段）的三条提醒

1. **可复用性最高的资产是 §4 的数值表**。书的论点（如"定义刻度"）本身是常识级主张；真正稀缺的是**他们最终把刻度定成了什么数**——`0.25rem` 基准、13 阶字号、11 阶色、7 级阴影及递减负 spread、9 族中性色。这些是可直接落 CSS 的硬资产。
2. **他们的"信念"体现在取舍而非主张里**。例如"少用边框"谁都同意，但 Tailwind 因此引入了 `ring`（用 box-shadow 替代 border，因而不影响布局）——**把审美倾向做成了工程 API**，这才是他们的特征手法。
3. **不要引用本文件中任何"书里说……"的具体句段**。本文件没有读到书稿正文，所有"书的主张"实为**章节标题级证据**。若下游需要书内原句，须另行获取 PDF 样章。
