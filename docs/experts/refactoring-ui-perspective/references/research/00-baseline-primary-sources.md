# 00 · 基线一手来源与下游落点证据（主研究员直接抓取）

> 本文件由主研究员（非子 Agent）亲自抓取，作为 01–06 六路调研的地基与交叉校验基准。
> 抓取时间：2026-04（见 SKILL.md 结尾的调研时间标注）。

---

## A. 《Refactoring UI》官方完整目录（一手，最高权重）

来源：<https://refactoringui.com/>（HTTP 200 直接抓取）｜可信度：**[一手]**

官方口径确认：作者自述定位为"From the creators of Tailwind CSS"，"Over 30,000 copies sold"，
Goodreads 4.68 星。书的形态：**PDF，50 章，200+ 页**，每章尽量独立（"as independent as possible, so you can read them in almost any order"）。
配套物：3 个视频教程（设计复杂表单 11:13 / 数据仪表盘 17:20 / 文本型落地页 12:08）、
Component Gallery（20+ 组件类别、200+ 组件样式）、色板（12+ 套完整色板，每色 10 个色阶）、
字体推荐（30+ 字体，分 UI / 标题 / 正文三类）。

章节目录（官方原文，共 9 部分 50 章）：

| 部 | 章 |
|---|---|
| 1 Starting from Scratch | Start with a feature, not a layout / Detail comes later / Don't design too much / Choose a personality / Limit your choices |
| 2 Hierarchy is Everything | Not all elements are equal / Size isn't everything / Don't use grey text on colored backgrounds / De-emphasize to emphasize / Labels are a last resort / Separate visual hierarchy from document hierarchy / Balance weight and contrast / Semantics are secondary |
| 3 Layout and Spacing | Start with too much white space / Establish a spacing and sizing system / You don't have to fill the whole screen / Grids are overrated / Relative sizing doesn't scale / Avoid ambiguous spacing |
| 4 Designing Text | Establish a type scale / Use good fonts / Keep your line length in check / Baseline, not center / Line-height is proportional / Not every link needs a color / Align with readability in mind / Use letter-spacing effectively |
| 5 Working with Color | Ditch hex for HSL / You need more colors than you think / Define your shades up front / Don't let lightness kill your saturation / Greys don't have to be grey / Accessible doesn't have to mean ugly / Don't rely on color alone |
| 6 Creating Depth | Emulate a light source / Use shadows to convey elevation / Shadows can have two parts / Even flat designs can have depth / Overlap elements to create layers |
| 7 Working with Images | Use good photos / Text needs consistent contrast / Everything has an intended size / Beware user-uploaded content |
| 8 Finishing Touches | Supercharge the defaults / Add color with accent borders / Decorate your backgrounds / Don't overlook empty states / Use fewer borders / Think outside the box |
| 9 Leveling Up | Leveling up |

**官方首页直接给的一个完整战术样例（一手原文）**：

> "**Use fewer borders.** Borders are a great way to distinguish two elements from one another, but using too many of them can make your design feel busy and cluttered. Instead, try adding a box shadow, using contrasting background colors, or simply adding more space between elements."

以及全书的元主张（一手原文）：

> "**Design with tactics, not talent.**"
> "It doesn't take any talent to make changes like this — once you know the tactic you just need to notice the problem and apply the solution."
> 对主流设计课程的批评："They focus so much on high level principles like color theory and typography which, while important, never helped me make instant improvements like the actionable, specific tactics I was picking up from Steve."

**对下游最有价值的结构性事实**：书的组织方式本身就是"可执行规则清单"，不是理论体系。
第 3 章（Layout and Spacing）、第 4 章（Designing Text）、第 5 章（Working with Color）、
第 6 章（Creating Depth）、第 8 章（Finishing Touches）几乎全部可以一对一映射到 CSS 变量与组件规则。

---

## B. Adam Wathan《CSS Utility Classes and "Separation of Concerns"》（一手长文）

来源：<https://adamwathan.me/css-utility-classes-and-separation-of-concerns/>，2017-08-07｜**[一手]**

这是 Tailwind 诞生前夜的纲领性文章，且**是他本人从"语义化派"转向"原子化派"的自述**，
是理解「内在张力」最关键的单一文本。五阶段叙事：

- **Phase 1 语义化 CSS**：类名按内容命名（`.author-bio`）当"钩子"。他发现的问题：
  > "My markup wasn't concerned with styling decisions, but my CSS was very concerned with my markup structure. Maybe my concerns weren't so separated after all."
- **Phase 2 解耦样式与结构**：BEM，`.author-bio__image`，低特异性。
- **Phase 3 内容无关组件**：`.card` / `.btn--primary` / `.media-card`。
  关键洞察："**The more a component does, or the more specific a component is, the harder it is to reuse.**"
- **Phase 4 内容无关组件 + 工具类**：`.align-left`、`.mar-r-sm`。
- **Phase 5 工具类优先**：他明确说自己**偏好组合而非复制**（"We prefer composition to duplication."），
  并把 `.actions-list` 这类组件**直接删掉**（"Deleting useless abstractions"）。

**最重要的一段重新定义（一手原文，直接推翻"关注点分离"）**：

> "**'Separation of concerns' is a straw man.** ... Instead, **think about _dependency direction._**"
> 两种写法：① CSS 依赖 HTML（HTML 可重新换皮，但 CSS 不可复用）；② HTML 依赖 CSS（CSS 可复用，但 HTML 不可重新换皮）。
> "Neither is inherently 'wrong'; it's just a decision made based on what's more important to you in a specific context."
> "For the project you're working on, what would be more valuable: restyleable HTML, or reusable CSS?"

**约束驱动的核心论证（一手原文 + 具体数据）**——这是"系统化约束"心智模型最强的证据：

> "This is because every new chunk of CSS you write is a blank canvas; there's nothing stopping you from using whatever values you want. You could try and enforce consistency through variables or mixins, but **every line of new CSS is still an opportunity for new complexity**; adding more CSS will never make your CSS simpler."

他给出的实证统计（同一篇文章，2017 年实测）：

| 站点 | 文字颜色数 | 背景色数 | 字号数 |
|---|---|---|---|
| GitLab | 402 | 239 | 59 |
| HelpScout | 198 | 133 | 67 |
| Stripe | 189 | 90 | 35 |
| GitHub | 163 | 147 | 56 |
| ConvertKit | 128 | 124 | 70 |
| Buffer | 124 | 86 | 54 |
| Gumroad | 91 | 28 | 48 |

**为什么不是 inline style（一手原文）**：

> "With inline styles, there are no constraints on what values you choose. ... Utilities force you to choose: Is this `text-sm` or `text-xs`? Should I use `py-3` or `py-4`? ... Instead of 380 text colors, you end up with 10 or 12."

**他明确保留的分歧（重要的自我边界，反"教条原子化"证据）**：

> "One of the areas where my opinion differs a bit from some of the really die-hard functional CSS advocates is that I don't think you should build things out of utilities _only_."
> 对 Tachyons 把按钮也用纯工具类拼的做法，他说更实际的是抽一个 `.btn-purple` 组件类。
> 而他给出的方法论名字解释了"utility-first"里"first"的含义：
> "The reason I call the approach I take to CSS utility-_first_ is because I try to build everything I can out of utilities, and **only extract repeating patterns as they emerge.**"
> 以及反过早抽象："Taking a component-first approach to CSS means you create components for things even if they will never get reused. **This premature abstraction is the source of a lot of bloat and complexity in stylesheets.**"

**智识谱系一手线索**：他自述转折点来自 Nicolas Gallagher 的
*About HTML semantics and front-end architecture*：
> "The turning point for me came when I read Nicolas Gallagher's [About HTML semantics and front-end architecture]. ... I came away from this blog post fully convinced that optimizing for reusable CSS was going to be the right choice for the sorts of projects I work on."
> （即：他接受的是**批评语义化派的那个人**的论证 —— 而 Gallagher 本人恰恰是后来被引用为反 Tailwind 一方的资源，此处构成后续争议的核心。）

---

## C. Tailwind CSS v4 官方设计令牌全表（一手，可直接落 CSS 的数值）

来源：<https://tailwindcss.com/docs/theme> 的 "Default theme variable reference" 段，版本 v4.3｜**[一手]**

这是"系统化约束"落地成具体数字的唯一权威来源。下游（Vue 单页 + 手写 CSS + CSS 变量）可直接照抄其刻度。

**间距（唯一基数）**：
```css
--spacing: 0.25rem;   /* 所有 px-* / mt-* / w-* / h-* 都是 calc(var(--spacing) * N) */
```
官方生成示例：`.mt-8 { margin-top: calc(var(--spacing) * 8); }`、`.w-17 { width: calc(var(--spacing) * 17); }`

**字号刻度（含配套行高）**：
```css
--text-xs: 0.75rem;   --text-xs--line-height: calc(1 / 0.75);
--text-sm: 0.875rem;  --text-sm--line-height: calc(1.25 / 0.875);
--text-base: 1rem;    --text-base--line-height: calc(1.5 / 1);
--text-lg: 1.125rem;  --text-lg--line-height: calc(1.75 / 1.125);
--text-xl: 1.25rem;   --text-xl--line-height: calc(1.75 / 1.25);
--text-2xl: 1.5rem;   --text-2xl--line-height: calc(2 / 1.5);
--text-3xl: 1.875rem; --text-3xl--line-height: calc(2.25 / 1.875);
--text-4xl: 2.25rem;  --text-4xl--line-height: calc(2.5 / 2.25);
--text-5xl: 3rem;     --text-5xl--line-height: 1;
```
注意 `--text-*--line-height` 是**比值形式**，对应书中 "Line-height is proportional" 一章。

**字重**：100/200/300/400/500/600/700/800/900（`--font-weight-*`）
**字距**：`-0.05em / -0.025em / 0 / 0.025em / 0.05em / 0.1em`（`--tracking-*`）
**行高**：`1.25 / 1.375 / 1.5 / 1.625 / 2`（`--leading-*`）
**圆角**：`0.125 / 0.25 / 0.375 / 0.5 / 0.75 / 1 / 1.5 / 2 rem`（`--radius-xs . . . --radius-4xl`）
**阴影（六档，全部是"两段阴影"）**：
```css
--shadow-2xs: 0 1px rgb(0 0 0 / 0.05);
--shadow-xs:  0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-sm:  0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md:  0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg:  0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl:  0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
--shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
```
→ **直接对应书中 "Shadows can have two parts" 一章**：每档都是「大模糊低透明度 + 小模糊高透明度」两段叠加。
**断点**：`40rem / 48rem / 64rem / 80rem / 96rem`
**容器宽度**：`16/18/20/24/28/32/36/42/48/56/64/72/80 rem`

**色阶（v4 用 oklch；每色 11 阶 50→950）**，官方灰阶族完整取值（下游最常用，因为它决定层级与边界）：

```css
/* slate（偏蓝冷灰） */
--color-slate-50:  oklch(98.4% 0.003 247.858);
--color-slate-100: oklch(96.8% 0.007 247.896);
--color-slate-200: oklch(92.9% 0.013 255.508);
--color-slate-300: oklch(86.9% 0.022 252.894);
--color-slate-400: oklch(70.4% 0.04 256.788);
--color-slate-500: oklch(55.4% 0.046 257.417);
--color-slate-600: oklch(44.6% 0.043 257.281);
--color-slate-700: oklch(37.2% 0.044 257.287);
--color-slate-800: oklch(27.9% 0.041 260.031);
--color-slate-900: oklch(20.8% 0.042 265.755);
--color-slate-950: oklch(12.9% 0.042 264.695);

/* gray（中性偏冷） */
--color-gray-50:  oklch(98.5% 0.002 247.839);
--color-gray-100: oklch(96.7% 0.003 264.542);
--color-gray-200: oklch(92.8% 0.006 264.531);
--color-gray-300: oklch(87.2% 0.01 258.338);
--color-gray-400: oklch(70.7% 0.022 261.325);
--color-gray-500: oklch(55.1% 0.027 264.364);
--color-gray-600: oklch(44.6% 0.03 256.802);
--color-gray-700: oklch(37.3% 0.034 259.733);
--color-gray-800: oklch(27.8% 0.033 256.848);
--color-gray-900: oklch(21% 0.034 264.665);
--color-gray-950: oklch(13% 0.028 261.692);

/* zinc / neutral / stone / mauve / olive / mist / taupe —— v4 新增多种偏色灰 */
--color-zinc-500:    oklch(55.2% 0.016 285.938);   /* 微紫 */
--color-neutral-500: oklch(55.6% 0 0);             /* 真中性 */
--color-stone-500:   oklch(55.3% 0.013 58.071);    /* 偏暖 */
--color-mauve-500:   oklch(54.2% 0.034 322.5);
--color-olive-500:   oklch(58% 0.031 107.3);
--color-mist-500:    oklch(56% 0.021 213.5);
--color-taupe-500:   oklch(54.7% 0.021 43.1);

--color-black: #000;
--color-white: #fff;
```

→ **"Greys don't have to be grey" 一章的官方实现证据**：v4 提供了 8 种带色相的灰族，
且没有任何一种是真的 `#808080`（`--color-neutral` 系列 chroma=0 是唯一例外，也是唯一"真灰"）。
**注意 `--color-black` 仍是 `#000`** —— 官方令牌里**保留了纯黑**，而书中主张 "Don't use pure black"。
这是一处**真实存在的张力**（书中建议 ≠ 框架默认令牌），不可调和，已在 SKILL.md 的「内在张力」中保留。

**强调色完整一例（red，展示 50→950 的明度/饱和度走法）**：
```css
--color-red-50:  oklch(97.1% 0.013 17.38);
--color-red-100: oklch(93.6% 0.032 17.717);
--color-red-200: oklch(88.5% 0.062 18.334);
--color-red-300: oklch(80.8% 0.114 19.571);
--color-red-400: oklch(70.4% 0.191 22.216);
--color-red-500: oklch(63.7% 0.237 25.331);
--color-red-600: oklch(57.7% 0.245 27.325);
--color-red-700: oklch(50.5% 0.213 27.518);
--color-red-800: oklch(44.4% 0.177 26.899);
--color-red-900: oklch(39.6% 0.141 25.723);
--color-red-950: oklch(25.8% 0.092 26.042);
```
→ 观察：**chroma 在 500–600 达到峰值后向两端回落**，这正是书中
"Don't let lightness kill your saturation" 的数值化体现。

---

## D. Tailwind v4.0 官方发布说明（一手，决策与转折点）

来源：<https://tailwindcss.com/blog/tailwindcss-v4>，2025-01-22，作者署名 Adam Wathan｜**[一手]**

开篇原话（**直接证明其表达 DNA：口语、脏话、不装**）：
> "Holy shit it's actually done — we just tagged Tailwind CSS v4.0."

关键决策与自述理由：
- **从 JS 配置转向 CSS 配置（`@theme`）**："Instead of a `tailwind.config.js` file, you can configure all of your customizations directly in the CSS file where you import Tailwind, giving you one less file to worry about in your project."
- **设计令牌全部暴露为原生 CSS 变量**："Tailwind CSS v4.0 takes all of your design tokens and makes them available as CSS variables by default, so you can reference any value you need at run-time using just CSS."
  → 官方给出的 `@layer components` 手写组件示例，**几乎就是下游工程的解法**：
  ```css
  @layer components {
    .btn-primary {
      border-radius: calc(infinity * 1px);
      background-color: var(--color-violet-500);
      padding-inline: --spacing(5);
      padding-block: --spacing(2);
      font-weight: var(--font-weight-semibold);
      color: var(--color-white);
      box-shadow: var(--shadow-md);
      &:hover { @media (hover: hover) { background-color: var(--color-violet-700); } }
    }
  }
  ```
- **动态工具值（放开刻度约束）**："Even spacing utilities like `px-*`, `mt-*`, `w-*`, `h-*`, and more are now dynamically derived from a single spacing scale variable and accept any value out of the box"，例如 `.w-17`、`.pr-29`。
  → **这是"约束派"立场的一次自我松动**，与 2017 年"你必须选 text-sm 还是 text-xs"的论证形成张力，已保留。
- **色彩从 rgb 升级到 oklch / P3**："We've upgraded the entire default color palette from `rgb` to `oklch`, taking advantage of the wider gamut to make the colors more vivid in places where we were previously limited by the sRGB color space. We've tried to keep the balance between all the colors the same as it was in v3, so ... it shouldn't feel like a breaking change."
- **性能数字（自称）**：全量构建 378ms→100ms（3.78x），增量重建（有新 CSS）44ms→5ms（8.8x），
  增量重建（无新 CSS）35ms→192µs（182x）。基准项目是他们自己的 Catalyst 模板。
  （注明：这是官方自测数据，非第三方验证。）

---

## E. Tailwind 官方文档中"约束"的表述（一手）

来源：<https://tailwindcss.com/docs/styling-with-utility-classes>（raw MDX 抓取）｜**[一手]**

针对"这不就是 inline style 吗"的官方回答，第一条就是约束：

> "**Designing with constraints** — using inline styles, every value is a magic number. With utilities, you're choosing styles from a predefined design system, which makes it much easier to build visually consistent UIs."

官方列出的五条收益（原话）：
- "You get things done faster" — 不用起类名、不用在 HTML/CSS 间切换
- "Making changes feels safer" — 只影响那一个元素
- "Maintaining old projects is easier"
- "Your code is more portable"
- "**Your CSS stops growing**"

官方对组件与手写 CSS 的立场（**对抗教条，很重要**）：
> "**You should still create components**"
> "While it's highly recommended that you create proper template partials for more complex components, writing some custom CSS is totally fine when a template partial feels heavy-handed."
> "for anything that's more complicated than just a single HTML element, we highly recommend using template partials"
> 去重优先级：**循环渲染 > 多光标编辑 > 抽组件/模板片段 > 写自定义 CSS**。
> "You'd be surprised at how often this ends up being the simplest solution."
> （→ 对下游无打包链的 Vue 单页，这条优先级序号极有指导价值：**先用 v-for，再谈抽组件，最后才写 CSS**。）

---

## F. 下游落点：privhub 前端现状实测（本机实测，一手）

被检查文件（**只读，未做任何修改**）：`G:\program\dsh-SQL\privhub\frontend\index.html`（1084 行，67694 字节）

形态确认：单个 `<style>` 块、手写 CSS、CSS 变量做主题。**与任务描述完全一致。**

现有设计令牌全貌（**全文只有 10 个颜色变量 + 1 个缩放变量**）：

```css
/* 亮色 */
--bg:#eef1f5; --panel:#f7f9fb; --panel2:#ffffff; --line:#d8dee6;
--text:#2e3440; --muted:#7a8699; --accent:#4a7bd6; --danger:#d05a5a; --warn:#c07a2b;
/* 暗色 */
--bg:#232834; --panel:#2a3040; --panel2:#333a4a; --line:#414a5c;
--text:#d7dde8; --muted:#8a94a6; --accent:#5d8de0; --danger:#e07171; --warn:#e0a34a;
:root { --ui-zoom: 1; }
```

**已实测的"刻度失控"证据（这就是《Refactoring UI》要解决的病）**：

| 指标 | 实测值 |
|---|---|
| `font-size` 声明数 | 69 |
| `padding*` 声明数 | 50 |
| `border-radius` 声明数 | 34 |
| `box-shadow` 声明数 | **4**（深度体系几乎不存在） |
| 出现过的 px 值（去重） | **45 个**：1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,18,20,22,24,26,30,32,34,36,38,40,44,50,52,90,92,108,110,120,150,200,240,340,360,380,460,480,520,1100 |
| 间距刻度变量 | **无** |
| 字号刻度变量 | **无** |

对照诊断（按书中章节）：
1. **颜色层级严重不足**：每个语义色只有一个取值（`--text`、`--muted`），
   命中 "You need more colors than you think"（书中建议：需要 8–10 个灰阶，而非 2 个）。
2. **间距无系统**：45 个离散 px 值、相邻值差 1–2px（5/6/7/8/9/10/11/12/13/14/15/16/18/20/22/24/26）
   —— 典型 "Establish a spacing and sizing system" 缺失，且正是 Adam 文中
   "every line of new CSS is an opportunity for new complexity" 的活体样本。
3. **`--muted:#7a8699` / `#8a94a6` 是纯正灰（无色相偏移）**，命中 "Greys don't have to be grey"。
4. **只有 4 处 box-shadow**，深度层级基本未建立，命中 "Use shadows to convey elevation" / "Emulate a light source"。
5. **`--line` 单一取值**用于所有边框，命中 "Use fewer borders" / "Balance weight and contrast"。
6. **`--bg:#eef1f5` 与 `--panel:#f7f9fb` 与 `--panel2:#ffffff` 三级背景亮度差过小**，
   命中 "Not all elements are equal" / "De-emphasize to emphasize"（层级靠对比度，而不是靠加边框）。

> 结论：该前端**不需要引入 Tailwind**。它需要的是把《Refactoring UI》的**刻度系统**注入现有 CSS 变量层
> —— 即"用约束替换自由"，这与两人在 Adam 那篇长文里的论证是同一条路径。

---

## F2. 《Refactoring UI》各章细则的高保真转述（二手精读，逐章对照用）

来源：<https://maibuith.com/notes/refactoring-ui>（2024-09 发布 / 2024-10 更新，22 分钟阅读量级的逐章精读笔记）｜可信度：**[二手]**（他人对全书的逐章转述，非官方原文；但细节密度高、与官方目录结构逐章对得上，可用作**章节级检索索引**，引用具体数字时需注意这是"读者笔记"而非"作者原话"）

> 说明：本节的措辞是笔记作者的转述，**不是 Adam / Steve 的原话**。凡本文件其他段落加了引号的才是原文。
> 本节的价值在于它是**唯一一份按官方 9 部分 50 章逐章对应、且带具体数值的索引**，可直接用于写 CSS 规则。

### 1 Starting from Scratch
- **Start with a feature, not a layout**：先想界面上要放什么，再想导航栏放哪。
- **Detail comes later**：早期不要纠结字体、阴影、图标。一个办法是**用 Sharpie 马克笔在纸上画**。
  **"Design in grayscale so spacing, contrast, and size can do the heavy lifting."**（灰度设计，让间距/对比/尺寸承担主要工作）
  低保证度设计的目的就是快速推进并**尽快开始构建真东西**。
- **Don't design too much**：不要一次设计完所有交互和边界情况。短周期迭代，先做最小可用版本。
- **Choose a personality**：个性由多处共同体现——字体（衬线=优雅经典／圆体无衬线=活泼／中性无衬线=朴素）、
  颜色（蓝=安全熟悉、金=贵气、粉=有趣不严肃）、**圆角（小=中性、大=活泼、无=严肃正式，且要一致）**、文案语气。
  "Look at other sites & businesses, but don't borrow too much. You don't want to look like a second-rate version of something else."
- **Limit your choices → Define systems in advance**：**每个颜色选 8–10 个色阶，定义一套字号刻度**。
  "More work up front, but once, instead of every time you design."
  需要系统化的维度清单（**这份清单就是下游该建立的 CSS 变量分组**）：
  字号 / 字重 / 行高 / 颜色 / margin / padding / 宽 / 高 / 盒阴影 / 圆角 / 边框宽度 / 透明度
  > "You don't have to define all of this stuff ahead of time, just make sure you're approaching design with a system-focused mindset. Look for opportunities to introduce new systems as you make new decisions, and try to avoid having to make the same minor decision twice."
  （→ **"避免把同一个微小决定做第二次"是整套方法论的操作性定义**。）

### 2 Hierarchy is Everything
- **Size isn't everything**：用**字重**或**颜色**也能造层级。正文用深色，辅助文字用灰，三级用更浅的灰
  ——**坚持 2–3 种文字颜色**（dark primary / grey secondary / lighter grey tertiary）。
  **UI 里通常 2 种字重就够**：normal(400–500) 用于大部分文本，heavier(600–700) 用于强调。
- **Don't use grey text on colored backgrounds**：灰字在白底上是"降低对比度"，
  但在**彩色背景上要改为把文字颜色向背景色靠拢**（同色相，调饱和度与亮度），而不是简单加灰。
- **De-emphasize to emphasize**：主体不够突出又无法再加东西时，**去弱化与它竞争的元素**（例如给其他项更柔和的颜色）。
- **Labels are a last resort**：`Jane Doe` 而非 `Name: Jane Doe`；`12 left in stock` 而非 `In stock: 12`。
  当**数据是主体、标签只是澄清**时，把标签做小、降对比、变细（如 `Heart rate **82 BPM**`）；
  但在**信息密集页**（如产品技术规格）用户是**扫标签**找（找 `Battery` 而不是 `8 hours`），此时**强调标签**。
- **Separate visual hierarchy from document hierarchy**：应用 UI 里 `h1`（如 "Manage Account"）**不需要大**，
  它更像标签而不是标题；可以在标记里保留标题以满足可访问性，但**视觉上隐藏**。
- **Balance weight and contrast**：
  用对比度补偿字重（实心图标挨着文字会显得过重 → 给它更柔的颜色降对比）；
  用字重补偿对比度（**1px 细边框既太弱又太硬的死局 → 改成 2px**）。
- **Action buttons：层级第一，语义第二**：
  主操作=实心高对比；次操作=描边或低对比背景；第三级=链接样式；
  **危险操作不等于自动变大变红变粗**——如果它不是页面主操作，可以是次级甚至三级。

### 3 Layout and Spacing（**下游最直接可用**）
- **Start with too much white space**，再按需削减。
- **Dense UIs have their place**：仪表盘把大量信息压在一屏可能显得拥挤，但**值得**。
- **Establish a spacing and sizing system**：
  - **线性刻度不行**。系统要考虑**相邻值的相对差异**：12px vs 16px 差别很大，但 500px vs 520px 没差别。
  - **"Make sure no two values in your scale are ever closer than about 25%."**（刻度中任意两值差距不小于约 25%）
  - 从一个**基准值**出发，用它的倍数构建刻度；**16px 是好起点**（能被整除，且是浏览器默认字号）。
- **You don't have to fill the whole screen**：铺满或过宽会让界面更难解读。先设计移动端布局再放到大屏调整；拆成多列。
- **Grids are overrated**：**不要用百分比去定尺寸，除非你真的想让它跟着缩放。**
  侧边栏在宽屏占太多、窄屏又被压太小 → **给固定宽度**。
  登录卡片 → **给 max-width**，不到那个宽度就让它缩。
  "Give your components the space they need and don't make any compromises until it's actually necessary."
- **Relative sizing doesn't scale**：**"Let go of the idea that everything needs to scale proportionately"**。
  大屏上大的元素要**缩得更快**：桌面 45px 标题配 18px 正文，移动端可能是 24px 配 14px
  ——把标题尺寸定义成正文的相对值会导致手机上标题过大。
  组件内部属性同理：**按钮内边距如果基于字号，按钮就不好看**。
- **Avoid ambiguous spacing**：**用间距做分组时，组外的空间必须大于组内的空间。**

### 4 Designing Text
- **Establish a type scale**：线性刻度不行（46px vs 48px 浪费决策时间）；
  模数刻度（4:5、2:3、黄金比）会产生 31.25px / 48.828px 这类小数值，各家浏览器舍入不同，且**往往不够用**
  → **手作刻度（handcrafted）最好**：约束到足以加速决策，但不至于让你觉得缺尺寸。
- **Avoid `em` units**（因为 `em` 相对父级，同一个值在不同位置结果不同）→ **用 px 或 rem**。
  （注意：这条与"限制行长用 em"看似矛盾，书中在行长一节推荐的正是 em 宽度区间——**保留这个内部张力**。）
- **Use good fonts**：安全选择是中性无衬线或系统字体栈
  `-apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue;`
  **忽略字重少于 5 档的字体**；**"If a font is popular, it's probably a good font."**；
  **"Steal from people who care"**（去查你喜欢的网站用的什么字体）。
  易读性：标题字体通常字距更紧、x-height 更矮；小字号字体字距更宽、x-height 更高。
  **主 UI 文本避免用 x-height 矮的压缩字体**。
- **Keep your line length in check**：**每行 45–75 字符**；Web 上最容易的做法是用 em 宽度，**20–35em** 基本落在区间内。
- **Baseline, not center**：同一行混用多个字号时，**按基线对齐**。
- **Line-height is proportional**：**与行长成正比**（窄内容 1.5，宽内容可能要 2）；
  **与字号成反比**（小字用更高行高，大字用更短行高）。
- **Not every link needs a color**：全站都是链接时颜色会淹没界面 → 改用更重的字重或更深的颜色；
  很边缘的链接可以只在 hover 时变色或加下划线。
- **Align with readability in mind**：
  **不要居中长文本**（超过两三行就几乎总是左对齐更好看；实在想居中，最简单的修法是**把文案改短**）；
  **表格数字右对齐**；两端对齐要连字符化；全大写文本应**增加字距**。
  **Use letter-spacing effectively**：标题字体想模仿紧凑感可以**减小字距**，
  但**反过来不成立**——标题字体放到小字号，即便加字距也通常不好看。

### 5 Working with Color（**下游最直接可用**）
- **Ditch hex for HSL**：Hue 0°红/120°绿/240°蓝；Saturation 0%=灰；Lightness 0%=纯黑、100%=纯白、50%=该色相的纯色。
  **HSB ≠ HSL**：设计软件多用 HSB，但**浏览器只认 HSL**，所以做 Web 就用 HSL。
- **You need more colors than you think**：**"You can't build anything with five hex codes."**
  复杂 UI 常见需要**多达 10 种颜色、每种 5–10 个色阶**。调色板分三类：
  - **灰（Greys）**：文字、背景、面板、表单控件——界面里几乎一切。**实践中要 8–10 个色阶**。
    **"True black tends to look pretty unnatural, so start with a really dark grey and work your way up to white in steady increments."**
  - **主色（Primary）**：主操作、当前导航项等。
  - **强调色（Accent）**：抢眼的黄/粉/青（如标记新功能）；以及语义状态色（红=破坏性确认、黄=警告、绿=正向趋势）。
- **Define your shades up front**：
  - **先选基色**：经验法则是**选那个适合做按钮背景的色阶**作为 500。
  - **找两端**：最深色通常留给文字，最浅色用来给元素背景染色；**一个 alert 组件正好同时用到这两端，是选两端色的好场景**。
  - **补中间**：**9 个色阶是好数字**（好分）。命名 **最深 900 / 基准 500 / 最浅 100**。
    先定 **700 和 300**（各自落在空隙正中，"feels like the perfect compromise between the shades on either side"），
    再补 800/600/400/200。**注意：这与 Tailwind 令牌实际用 11 阶（50–950）不一致——保留此差异。**
  - **"It's not a science"**：真用起来一定会想微调某个色阶的饱和度 → **"Trust your eyes, not the numbers."**
- **Don't let lightness kill your saturation**：HSL 里颜色越靠近 0% 或 100% 亮度，饱和度越被削弱
  → **亮度越偏离 50%，就越要提高饱和度**，否则亮/暗两端会发灰。
- **Greys don't have to be grey**：真灰饱和度 0%，但实践中的灰**大多是带饱和的**，
  偏蓝叫冷灰，偏黄/橙叫暖灰；**浅端和深端要把饱和度提上去**，否则会显得发灰。
- **Accessible doesn't have to mean ugly**：WCAG 要求正文（约 18px 以下）**对比度至少 4.5:1**，大字**至少 3:1**。
  - **翻转对比**：与其浅字配深彩底，不如**深色字配浅色底**，颜色仍在，但不那么抢。
  - **旋转色相**：彩色背景上的次要文字很难在不接近纯白的情况下达标，
    而主文字已经是白色 → **把色相往更亮的颜色转（青、品红、黄）**。
- **Don't rely on color alone**：色盲用户会读不懂 → **加图标，或用对比度而非颜色来区分**。

### 6 Creating Depth（**下游只有 4 处 box-shadow，这一章最缺**）
- **Emulate a light source**：**光从上方来**。人看屏幕略微俯视 →
  - **凸起元素**：露出顶边、藏住底边。顶边朝上 → **比正面略亮**，用一个**顶部边框**或**带轻微垂直偏移的 inset 阴影**。
    **"Choose the lighter color by hand instead of using a semi-transparent white"**——叠白色会把底色的饱和度抽掉。
    凸起会挡光 → 元素下方**加一个小的、带轻微垂直偏移的深色阴影**。
  - **凹陷元素**：俯视只看得到**下唇** → 用底边框或**负垂直偏移的 inset 阴影**做略亮的色；
    上方挡光 → 顶部加一个**正垂直偏移的小深色 inset 阴影**。
  - **Don't get carried away**：过度会做出忙乱不清的界面，"there's no need to try and make things look photo-realistic"。
- **Use shadows to convey elevation**：**模糊半径越大、阴影越大 → 元素离用户越近 → 越吸引注意力**（适合模态框）；
  按钮用小阴影（要让人注意到，但不该主导页面）；下拉菜单用中等阴影。**建立升降系统：5 档通常够用。**
  阴影还能配合交互：拖动时加阴影让它浮起来；按下时变小或去掉。
- **Shadows can have 2 parts**：**大而柔的阴影**（好看、够淡）+ **小而深的阴影**（贴近边缘、让轮廓清晰）。
  **考虑高度**：物体离表面越远，环境光缺失造成的**那个小的深色阴影会逐渐消失**
  → **低高度时清晰，高高度时几乎或完全不可见**。
  （→ 官方令牌 `--shadow-*` 全部是两段式，与此章一一对应。）
- **Flat designs can have depth**：**用颜色造深度**——**浅的显得更近，深的显得更远**；
  比背景亮 = 浮起，比背景暗 = 凹陷。扁平风格用**无模糊、短垂直偏移的实色阴影**。
- **Overlap elements to create layers**：让卡片跨过两块背景的交界；让元素比父容器高、两侧都溢出；
  轮播控件互相重叠；重叠图片时给图片一个**与背景同色的"隐形边框"**。

### 7 Working with Images
- **Use good photos**；**Text needs consistent contrast**：照片明暗多变，压字会看不清 →
  加半透明遮罩 / 降低图片对比度 / **单色化（降对比 → 去饱和 → 用 multiply 混合模式叠纯色）** / 加**大模糊半径、无偏移**的文字阴影。
- **Everything has an intended size**：**不要放大图标**（小尺寸画的图标缺细节、显笨重；非要放大就套个带背景色的形状）；
  **不要缩小截图**（70% 缩放的整屏截图，用户得眯眼看字；要么用更小屏幕尺寸截，要么只截局部，
  要么**画一个去细节、小字替换成简单线条的简化版 UI**）；**不要缩小图标**（会毛糙发虚，如 favicon →
  **在目标尺寸上重画一个超简版，把妥协掌握在自己手里**）。
- **Beware user-uploaded content**：**控制形状与尺寸**（居中放进固定容器、裁掉多余部分；
  CSS 用背景图 + `background-size: cover` 最省事）；
  **防止背景渗色**（用户图上背景色与界面背景接近时会粘在一起失去轮廓 → **别用边框，用细微的内阴影**，
  或者半透明的内边框）。

### 8 Finishing Touches（**空态在官方目录里独立成章**）
- **Supercharge the defaults**：项目符号换成图标、用与内容相关的图标（安全功能用锁）、
  引用块放大变色、链接改色+字重+**部分压住文字的粗彩色自定义下划线**、用品牌色做自定义 checkbox / radio。
- **Add color with accent borders**：卡片顶部、导航项、alert 消息、标题下方短线、整个布局顶部。
- **Decorate backgrounds**：换背景色区分页面区块；**渐变用两个色相相距不超过约 30° 的颜色**；
  重复图案；加简单形状或插画。
- **Don't overlook empty states**：**"the empty state should be a priority, not an afterthought."**
  加插画抓注意力 + 强调 CTA；**隐藏标签页/筛选器这类辅助 UI**——"There's no point in presenting a bunch of actions when there's no content."
- **Use fewer borders**：三个替代手段——**盒阴影**（元素与背景不同色时效果最好，如模态框）、
  **相邻元素用两个略有差异的背景色**、**加更多间距**。
- **Think outside the box**：下拉菜单可以分区、分栏、加辅助文字或彩色图标；
  表格可以合并数据、加图片和颜色；单选按钮可以做成**可选卡片**。
  > 本部分收尾原文（章节结论）：**"Don't let your existing beliefs hold back your designs — constraints are powerful but sometimes a bit of freedom is just what you need to take an interface to the next level."**（注意：这句话本身就给"约束"划了边界，是「失效条件」的官方依据。）

### 9 Leveling Up（**学习方法论，非设计规则**）
- **Look for decisions you wouldn't have made**：看喜欢的设计时问自己
  **"Did the designer do anything here that I never would have thought to do?"**
- **Rebuild your favorite interfaces**：从零重做，**不许偷看开发者工具**。
- 收尾：**"By continually studying the work that inspires you with a careful eye, you'll be picking up design tricks for years to come."**

---

## F3. 语境校正（来自 Agent 6 的一手核查，**推翻了任务书中的两处表述**）

来源：`06-timeline.md` 的一手核查结论｜可信度：**[一手]**（Agent 6 找到 Adam 本人来源）

| 任务书原文 | 核查结论 | 处置 |
|---|---|---|
| "KiteTail（用户调研工具？需核实）" | **KiteTail 是 webhook 驱动的「结账即服务」（checkout-as-a-service）SaaS**，2017 年启动、**未上线即停止**，但 **Tailwind 诞生于此项目** | 已更正，勿再写"用户调研工具" |
| "Laravel 相关开源项目（如 Vessel）" | **Laravel Vessel 作者是 Chris Fidao（fideloper），不是 Adam**。Adam 在 Laravel 生态的实际作品是 **Laravel Valet（2016-05，与 Taylor Otwell）** 与 **Jigsaw（2015）** | 已更正，勿再写 Vessel |
| "Adam 起初反对 utility classes" | **在一手材料中找不到依据**，标 `[存疑]` | **不写入结论**。可核实的是他从"组件类为主"转向"utility-first 作为架构哲学"，且**这个转折有清晰一手证据链**（见本文件 B 节的 2017 长文，全文就是他自述的转向过程） |

> 教训（供后续同类调研复用）：任务书里带问号的"事实"往往来自二手泛读，**必须回到一手**。
> 本次 6 路调研中，3 条预设事实有 2 条错误、1 条无据。

---

## G. 本文件的一手/二手统计

| 来源 | 类型 | 链接 |
|---|---|---|
| refactoringui.com 官方首页 + 完整目录 | 一手 | https://refactoringui.com/ |
| Adam Wathan 长文（2017-08-07） | 一手 | https://adamwathan.me/css-utility-classes-and-separation-of-concerns/ |
| Tailwind 官方主题/令牌参考（v4.3） | 一手 | https://tailwindcss.com/docs/theme |
| Tailwind v4.0 官方发布说明（2025-01-22） | 一手 | https://tailwindcss.com/blog/tailwindcss-v4 |
| Tailwind 官方文档 styling-with-utility-classes | 一手 | https://tailwindcss.com/docs/styling-with-utility-classes |
| privhub 前端实测 | 一手（本机） | `privhub/frontend/index.html` |

一手占比：**6/6 = 100%**（本文件仅收录直接抓到原文的来源，未引用任何二手转述）。
