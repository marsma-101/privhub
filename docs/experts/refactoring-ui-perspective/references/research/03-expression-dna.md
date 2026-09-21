# Adam Wathan & Steve Schoger —— 碎片表达与风格 DNA

> 调研 Agent 3 产出 ｜ 对象：Adam Wathan（@adamwathan）、Steve Schoger（@steveschoger）
> 《Refactoring UI》作者、Tailwind CSS / Tailwind Labs 核心成员

---

## 0. 方法论与可信度约定

**标注体系**
- `[一手]` —— 本人署名发布的原文：博客、GitHub 评论（API 取的 body 字段）、HN 账号（`adamwathan` / `steveschoger`）评论、官方站文案、播客转录中本人发言。
- `[二手-逐字]` —— 第三方页面完整引用推文原文（保留 Twitter 卡片格式、hashtags、emoji、t.co 短链），字符级可信，但**页面本身不是推特**。本报告中 Steve 的推文绝大多数属于此类。
- `[二手-转述]` —— 他人概括，非逐字。
- `[推断]` —— 萧潇基于样本的模式归纳，非当事人自述。

**关键 X/Twitter 抓取限制（信息缺口声明）**
本次调研环境中，`twitter.com` / `x.com` 域名被解析为**非公网 IP 而拒绝抓取**，nitter 镜像、web.archive.org、Medium（`medium.com`）、`raw.githubusercontent.com` 均网络不可达。因此：
- **Steve 的推文原文**取自 GIGAZINE（2017-09-11）与 Digital Synopsis（两次汇编）两处**完整保留 Twitter 卡片格式**的第三方页面 → 标 `[二手-逐字]`，并附推文 ID 与状态 URL 供复核。
- **Adam 的推文原文**优先取 HN 用户**带引号块逐字引用**的版本（多源交叉），其余用可访问的一手渠道（博客、GitHub API、播客转录、官方站）替代。
- 凡无法确认逐字的，一律标注「大意转述，非逐字」。

**未采信来源**：知乎、微信公众号、百度百科、百度知道（黑名单，一律未使用）。

---

## 1. 一句话结论

两人共用一套**「战术语言」（tactics vocabulary）**，但分工极端清晰：
**Steve 是「诊断-开方」型**——先说症状（"looks really busy" / "always looks off"），再给一条可立刻执行的动作；**Adam 是「拆框架-辩护」型**——先把争论从道德层面拉回工程权衡层面，再给结论，且越有争议越直白。

一句话画像：
- **Steve**：`副词软化 + 具体数字 + 小动作`。从不训人，只改图。
- **Adam**：`先承认对方前提合理 + 用一个类比换掉对方的坐标系 + 直接下判断`。承认自己菜、承认 @apply 是错的、承认公司缺钱。

---

## 2. 句式偏好

### 2.1 Steve：模板是「观察句 → 可选机制句 → 祈使/建议句」

这是他推文的**绝对主导结构**，占比极高（本节 20 条样本中 18 条符合）[推断]。

| 骨架 | 实例（逐字） |
|---|---|
| `X is a great way to Y` | "Overlapping elements on a page is a great way to create depth and encourage users to scroll" |
| `X always looks "off" on Y` | "Pure grey text always looks \"off\" on a colored background." |
| `X can make Y look really Z` | "Too many borders can make a design look really busy." |
| `A quick fix is to …` | "A quick fix is to saturate your text with a bit of the background hue." |
| `If in doubt, …` | "If in doubt, 16px font with 1.5 line height is pretty good safe for body copy." |
| `Try …ing` | "\"Grey\" doesn't have to mean Grey™. Try saturating your greys with a bit of blue or brown for a cooler or warmer feel." |
| `Instead of A, try B` | "Instead of blowing up small, in-app icons for your landing page, try putting a shape behind them and giving them a background color." |

**三个可辨识的语法习惯**

1. **`really` / `pretty` / `a bit` / `slightly` 作缓冲垫**——几乎每句都有。
   "can make a design look **really** busy"、is **pretty** good safe、**slightly** lighter、**a bit** more subtle。
   效果：把批评包装成手感描述，不像判决。
2. **数字直接落到像素/度数/比例**——他极少说"多一点""小一点"。
   `4 to 6px`、`10º or 20º max`、`16px font with 1.5 line height`、`1px shift up`、`a few degrees`。
3. **括号补丁句**——主句之后用括号加一句风险提示或自嘲。
   "A subtle link for negative secondary actions often works better than a big bold button. **(Just make sure you have a confirmation step!)**"
   "This two-column form layout is great for organizing long forms and filling wider screens **without using awkward long form fields**."

### 2.2 Adam：模板是「先给对方的前提盖章 → 换坐标系 → 下判断」

三个反复出现的动作：

**(a) 先认可再反驳**
> "Refactoring UI is a well known book…"（这是 HN 上别人的话，不是 Adam）
> Adam 版："**I won't reiterate all of his points here, but needless to say I came away from that blog post fully convinced** that optimizing for reusable CSS was going to be the right choice for the sorts of projects I work on." `[一手]` [css-utility-classes](https://adamwathan.me/css-utility-classes-and-separation-of-concerns/)

**(b) 把对方的概念重命名，再宣布它是稻草人**
> "**\"Separation of concerns\" is a straw man**… Instead, **think about _dependency direction._**" `[一手]` 同上

> "**This approach is extremely seductive because on the surface it sounds so \"pure\" and \"clean\" but the reality is that on large projects it leads to some of the most horrific, hard to maintain CSS you'll ever see**, no matter how hard you try to keep things in good shape." `[一手]` [HN 22627703](https://news.ycombinator.com/item?id=22627703)

**(c) 用二选一的句式逼对方表态**
> "Neither is inherently \"wrong\"; it's just a decision made based on what's more important to you in a specific context. **For the project you're working on, what would be more valuable: restyleable HTML, or reusable CSS?**" `[一手]` 同上

### 2.3 两人都用的一个句式：`X isn't Y, it's Z`
- Steve："**\"Grey\" doesn't have to mean Grey™.**"
- Adam："**CSS Zen Garden takes the first approach, while UI frameworks like Bootstrap or Bulma take the second approach.**"（同一功能的变体）

---

## 3. 词汇特征

### 3.1 高频词（按使用密度排序）

**Steve 的专属高频词**
| 词 | 出现语境 |
|---|---|
| `really` / `pretty` | 缓冲副词，几乎每推一次 |
| `subtle` / `slightly` | "subtle shadow"、"subtle contrast"、"a bit more subtle" |
| `busy` | 负面诊断的口头禅："make a design look **really busy**" |
| `"off"` | 带引号的模糊否定："always looks **\"off\"**" |
| `a great way to` | 正面推荐的标准开场 |
| `hierarchy` | "It's all about creating **hierarchy**." / "typographic **hierarchy**" |
| `contrast` | "high contrast for text"、"subtle contrast"、"balance weight and contrast" |
| `depth` | "create **depth**"、"add **depth** to an interface" |
| `scannable` | "make your content much more **scannable**" |
| `pop` | "helps it **'pop'** more" |
| `breathe` | "give your text a little more room to **breathe**" |

**Adam 的专属高频词**
| 词 | 出现语境 |
|---|---|
| `honestly` / `to be candid` | "honestly the hardest part"、"to be, like, candid" |
| `practical` / `maintainable` / `scalable` | 评价 CSS 方案的三连词组 |
| `tradeoff` | "Everything is a **tradeoff**."（他在 HN 上多次用）|
| `dependency direction` | 自造术语，替换 "separation of concerns" |
| `blank canvas` | 描述"写新 CSS = 无边界的空白画布" |
| `forcing function` | "This was a great **forcing function** for making it project-agnostic." |
| `the hard part` | "honestly **the hardest part**"、"**The hard part** about building a business is…"（引自他人推文，他复述）|
| `constraint` / `constraints` | "Utilities force you to choose"、"there's no constraints on what values you choose" |
| `craft` | "a small team that cares about **craft**" |
| `obscenely proud` | "I wanna be, like, **obscenely proud** of every corner of the code base." |

### 3.2 专属术语（两人共同构建的"词汇体系"）

这套术语是 Refactoring UI + Tailwind 的**共同语言**，也是他们识别彼此的暗号：

`hierarchy`｜`contrast`｜`scale`（type scale / spacing scale）｜`system`（design system / spacing system）｜`constraints`｜`utility-first`｜`utility classes`｜`content-agnostic`｜`composition over subcomponents`｜`de-emphasize to emphasize`｜`white space`｜`line length`｜`elevation`｜`consistency for free`

其中 **`utility-first` 是 Adam 自己造的定位词**（他自己解释过为什么要加 `-first`）：
> "The reason I call the approach I take to CSS utility-**_first_** is because I try to build everything I can out of utilities, and **only extract repeating patterns as they emerge.**" `[一手]`

### 3.3 禁忌词 / 不用的表达

**[推断] Steve 明确避开的**：
- 不说"你错了""这是坏设计"——用 `looks "off"` / `really busy` / `can be difficult` 代替。
- 不用绝对化断言（never / always 出现时几乎都修饰"规律"而非"人"，如 "Pure grey text **always** looks off"）。
- 不训人：所有批判都指向**画面元素**（borders / shadows / text），不指向作者。

**[推断] Adam 明确避开的**：
- 不用"最佳实践"式的道德语气。他专门拆这句话：
  > "One of the best practices you'll hear about when you're trying to learn how to CSS good is 'separation of concerns.'" —— 注意他自己把 `CSS good` 写成了**故意不合语法的玩笑**。`[一手]`
- 不假装中立：他会直接说 "**Tailwind is designed around the opinion that that whole idea was mostly wrong**"。`[一手]` [HN 35354903](https://news.ycombinator.com/item?id=35354903)

---

## 4. 节奏感：先结论还是先铺垫

**两人相反。**

### Steve：结论先行的**一句话诊断 → 一张图 → 结束**

推文格式本身就是"结论先行"：140 字上限 = 一个诊断 + 一个动作，配 before/after 图。他自己承认这是刻意的：

> "One of the benefits of using Twitter to publish these tips is having **the constraint of 140 characters**. This forces me to be creative and **simplify the tips down to something that is super digestible**. I publish tips regularly and Twitter makes it really easy to share them." `[一手]` — Steve Schoger，HN 账号 `steveschoger`，[HN 15179183](https://news.ycombinator.com/item?id=15179183)

**长文里则反过来**：书中/文章中他先给图像化的"症状"，再命名原则（"Use fewer borders" → 解释 → 替代方案 3 条）。

### Adam：**极端铺陈 → 收束到一条判断**

他的博客是"五阶段自述体"：Phase 1 → Phase 5，每一阶段先承认当时觉得对，再写"但后来发现不对"。整整 6000 字只为一个结论句。典型的收束点：

> "**It's the same blank canvas problem you face when writing new CSS for every new component.**" `[一手]`

播客里则是**边想边说、自我打断**（转录中大量 "I don't know"、"anyways"、"whatever"、"I feel like I'm just blabbering about stuff"）——这与 Steve 逐字打磨的推文形成鲜明对比。

> "Anyways, I, I feel like I'm just blabbering about stuff." / "We're we're all over the place already." / "Yeah. I don't know." `[一手]` [Tuple Podcast #E9](https://podcast.tuple.app/episodes/adam-wathan/transcript)

**[推断]**：Steve 是**编辑型**表达者（删到只剩结论），Adam 是**思考型**表达者（思考过程即是内容）。

---

## 5. 幽默方式

### 5.1 Adam：自嘲式降级 + 荒诞类比

**自嘲是他的签名，且最早写进了官方文案**（这是 Refactoring UI 官网首页第一人称）：

> "Hi! I'm Adam Wathan, a full stack developer **who used to suck at design**." `[一手]` [refactoringui.com](https://refactoringui.com/)

> "I always chalked it up to a left brain/right brain sort of thing — I'm logical and analytical so I'm good at programming, people like Steve are intuitive and creative so he's good at design." `[一手]`

**设计引用里的自我调侃**（他给 Tailwind 造的无意义占位文本，出现在官方博文里）：
> "Adam is a rad dude who likes TDD, Active Record, and garlic bread with cheese. He also hosts a decent podcast and **has never had a really great haircut**." `[一手]` [css-utility-classes](https://adamwathan.me/css-utility-classes-and-separation-of-concerns/)

**对外部技术的自贬式玩笑**（关于 Tailwind 滥用 PostCSS）：
> "(By the way, to this day I feel like **Tailwind is completely abusing PostCSS in a way it was never intended**, and I secretly believe Andrey Sitnik cringes a little bit every time he thinks about what we've done with his beautiful library 😅)" `[一手]`

**荒诞类比 / 反向自夸**：
> "Are there any other open source apps we could fork and move the tabs to the side then sell for $610m?" `[二手-逐字]` — 引自 [x.com/adamwathan/status/1963709979363258560](https://x.com/adamwathan/status/1963709979363258560)，经 HN 用户 walterbell 逐字引用（[HN 45139266](https://news.ycombinator.com/item?id=45139266)）

**播客里的即兴互损**：
> "DHH can keep using it then. For the one pairing session he probably does every 3 years." `[一手]` [Tuple Podcast](https://podcast.tuple.app/episodes/adam-wathan/transcript)

**公开示弱（罕见但真实）** —— 这是他用幽默包裹的真实状态，也是他最具辨识度的一面：
> "if anyone's listened to me on podcast for the last couple years, I almost feel bad because I feel like it's mostly just like **me being, like, sad and down about things and not being able to figure out my life**." `[一手]` [The Panel E6](https://panelpodcast.com/6/transcript)

> "I feel like I'm getting **kicked in the balls over and over and over again** with basically every idea I've had for this business for the last, like, three years." `[一手]` 同上

> "Just like **the universe is just like, nothing you do is allowed to affect anything.**"（描述提价实验完全无效） `[一手]` 同上

> "I just basically **have lost all confidence in myself**." `[一手]` 同上

### 5.2 Steve：暖幽默 / emoji 标点 / 反品牌梗

Steve 的幽默很轻，几乎全部体现在**emoji 与一句话小玩笑**上：

- emoji 当句读用：`🔥`（多数推文开头）、`👌🏼`、`🤙🏼`、`😘`、`😜`。
- 反品牌梗：**"\"Grey\" doesn't have to mean Grey™."** —— 用商标符号 `™` 调侃"灰"这个字的刻板印象，是他最锋利的一句。
- 平淡自嘲（关于视频里的杂音）："Have you tried a noise gate?" 类问题他一般不管；但 Adam 会回："What you're hearing in that video is a space heater running in my office — I don't put a ton of effort into making everything perfect for ad hoc live streams." `[一手]` [HN 22268238](https://news.ycombinator.com/item?id=22268238)

**[推断]**：Steve 不吐槽、不讽刺、不参与争论。他 2017 年后几乎不在公开平台辩论。

---

## 6. 确定性表达

**结论：两人都是「高确定性」型，但确定性的落点不同。**

### Steve：**在视觉判断上 100% 确定，在方法上留余地**

- 硬断言（视觉层面）：
  - "Pure grey text **always** looks \"off\" on a colored background."
  - "It's **all about** creating hierarchy. You want your primary button to stand out **much more** than your secondary / danger actions."
  - "Using the same line-height for all text is a **very subtle but common mistake**."
- 留余地（方法层面）：
  - "**If in doubt**, 16px font with 1.5 line height is pretty good safe for body copy."
  - "Here's **a few ideas that are a bit more subtle**"（不说"唯一正确做法"）
  - "I **typically** make the icons slightly lighter than the text for inactive states"
  - "A technique **I've been using lately** on panels…"

**[推断]** 他从不主张"唯一解"，只说"我这么做，你也可以试试"。这解释了为什么他的设计批评从不引发对立。

### Adam：**在工程权衡上极度确定，在个人判断上公开摇摆**

这是他最反直觉的一面——**产品决策上他说"我不确定"，技术立场上他说"我确定"**。

**技术立场（强确定）**：
> "**Not true at all.** You can build two sites that look completely different without changing the CSS at all if the API of the CSS framework is low level enough, like Tailwind, Tachyons, etc." `[一手]` [HN 22649141](https://news.ycombinator.com/item?id=22649141)

> "**The stylesheets for CSS Zen Garden examples are more tightly coupled to the HTML than any other CSS I've ever seen in my life.** They literally have no use against any other block of HTML than that one page." `[一手]` [HN 34013190](https://news.ycombinator.com/item?id=34013190)

> "Tailwind objectively saves time, yes, **objectively**." `[二手-逐字]` — 引自 [x.com/adamwathan/status/1613718281969635328](https://twitter.com/adamwathan/status/1613718281969635328)，经 HN 用户 NayamAmarshe 逐字引用

**产品/自我判断（弱确定）**：
> "I think we're gonna try to get a beta out at the end of June… **But I don't know.**" `[一手]`
> "**I don't know.** I kinda think no because I just feel like my personal stance is…" `[一手]`
> "Until we actually do it, **I can't know for sure** that it's gonna be as perfect as I hope." `[一手]`

**面对批评时的确定性强度（重要）**：
公开辩论中他不软化。2026 年 1 月关于 `llms.txt` PR 的回应是**教科书级的"直给"**：

> "> Why is this one not moving?
> **Have more important things to do like figure out how to make enough money for the business to be sustainable right now.** And making it easier for LLMs to read our docs just means less traffic to our docs which means less people learning about our paid products and the business being even less sustainable.
> **Just don't have time to work on things that don't help us pay the bills right now, sorry.** We may add this one day but closing for now." `[一手]` [tailwindcss.com PR #2388](https://github.com/tailwindlabs/tailwindcss.com/pull/2388#issuecomment-3715074726)

（该评论获得 535 👍 / 51 👎，784 个 reactions —— 社区争议极大，但他没删没改。）

**收尾时的克制**（同一 thread，一天后）：
> "Just wanted to drop a quick note and say **I appreciate all the support here, on Twitter, and on Hacker News. We'll figure it out I'm sure.**" `[一手]` 同上

---

## 7. 引用习惯

### 7.1 Adam：**引用是论证工具，且高度点名**

他引用从不含糊——**给作者名、给文章全名、可点击链接**，并且说明"我从这里学到了什么"。

- 关键转折点式引用（写清是哪篇文章改变了他的判断）：
  > "The turning point for me came when I read **Nicolas Gallagher's [About HTML semantics and front-end architecture]**… needless to say I came away from that blog post fully convinced…" `[一手]`
  > "Always thought **this article by Nicolas Gallagher** did the best job arguing this point" `[一手]` [HN 22627703](https://news.ycombinator.com/item?id=22627703)

- 反驳式引用（同为 CSS Wizardry / Nicolas Gallagher 阵营，但他会挑着用）：
  > "Using `@extend` at all is [generally not recommended]" —— 直接给 Harry Roberts 的 csswizardry 链接作**反面依据** `[一手]`

- 引用他人推文时**复述而非照抄**，且标注不确定：
  > "I think back to that tweet that me and you've talked about in the past that Toby shared ages ago… **I can't remember exactly what he said, but the essence of it was basically, like, setting a bar for quality**…" `[一手]`

### 7.2 Steve：**几乎不引用**

- 推文里 0 引用，全是自己的图。
- 唯一一次对外部网站的引用是**夸别人**：
  > "Really love the hover state on Stripe's website. 1px shift up with the increased drop shadow spread." `[二手-逐字]` [status/878277546646929408](https://twitter.com/steveschoger/status/878277546646929408)

**[推断]** 引用的**功能**在两人身上完全不同：Adam 用引用来**建立论证链**，Steve 用引用来**举个反例/好例**（且例子多是真实的商业网站 UI）。

### 7.3 对自己产品的引用习惯（值得注意）

Adam 会**大量引用自己的旧文**当作"我已经说过"的挡箭牌：
> "Wrote about this in depth a few years ago shortly before releasing Tailwind, can read here: [css-utility-classes-and-separation-of-concerns]" `[一手]` [HN 35354903](https://news.ycombinator.com/item?id=35354903)
> "As I said in that article two years after writing it, CSS definitely feels \"solved\" to me." `[一手]` [HN 21555366](https://news.ycombinator.com/item?id=21555366)

---

## 8. 教学语气模板（可复用句式骨架）

> **核心结构：先给可执行动作，再解释为什么。** 这一点两人高度一致，但包装不同。

### 8.1 Steve 的骨架（可直接套用）

```
【诊断句】 <画面元素/做法> <副词缓冲> <负面结果>
   → "Too many borders can make a design look really busy."
【动作句】  Here's a few ideas that are a bit more subtle:  /  A quick fix is to <动作>.
          /  Instead of <A>, try <B>.  /  Try <动名词>.
【验证句】（可选） <数字化的具体参数>
   → "4 to 6px" / "10º or 20º max" / "16px with 1.5 line height"
【补丁句】 (Just make sure you <风险提示>!)  /  （emoji 收尾）
```

**七种 Steve 式句头（按使用频率）**
1. `🔥 <观察> + <建议>`（他最常见的形式）
2. `A great way to <目标> is <手段>`
3. `X always looks "off" on Y. A quick fix is to <做法>.`
4. `If in doubt, <默认值>.`
5. `Using <做法> is a great way to <效果>.`
6. `X can be difficult. Consider <做法>.`
7. `X doesn't have to mean Y. Try <做法>.`

### 8.2 Adam 的骨架

```
【承认前提】 <对方立场> "sounds so pure and clean" / "intuitively made sense to me"
【换坐标系】 "Instead, think about <新框架>." / "It's the same <旧问题> problem."
【给判断】 Neither is inherently wrong — it's a tradeoff. 然后明确说自己选哪边。
【收束到动作】 "Only extract repeating patterns as they emerge." / "Use your best judgment."
```

**Adam 式句头**
1. `The idea is that …` （定义对方立场，中性）
2. `But then I ran into a dilemma.` （转折标记）
3. `Say we needed to …` （构造一个可推演的具体场景）
4. `What if we …?` （反问推进）
5. `If you think back, the whole reason we created this component was …` （回溯式推理）
6. `My experience is that …` / `For the sort of projects I work on, …` （限定适用范围的判断）
7. `honestly` / `to be candid`（坦白标记，出现在最脆弱或最直接的句子前）

### 8.3 两人共用的一个"重手法"：**先夸张到荒谬，再回头**

- Steve：不说"间距太大"，而是先设一个安全默认值 "**Start with too much white space**"（Refactoring UI 章节名）。
- Adam：不说"命名很难"，而是先造一个荒谬名字 —— `image-card-with-a-full-width-section-and-a-split-section`，然后说 "Of course not, that's ridiculous." `[一手]`

---

## 9. 30 条代表性原文摘录（带链接）

### A. Steve Schoger —— 视觉诊断与推文格式（20 条）

> 以下推文原文均为 `[二手-逐字]`，取自完整保留 Twitter 卡片格式的第三方汇编页（GIGAZINE / Digital Synopsis，均带 t.co 短链与推文 ID）。已逐条给出推文状态 URL 供复核。

1. "🔥 Too many borders can make a design look really busy. Here's a few ideas that are a bit more subtle:"
   — [status/897849211110273024](https://twitter.com/steveschoger/status/897849211110273024)（2017-08-16，后被收录为 Refactoring UI 章节 "Use fewer borders"）

2. "🔥 Pure grey text always looks \"off\" on a colored background. A quick fix is to saturate your text with a bit of the background hue."
   — [status/874333097168314370](https://twitter.com/steveschoger/status/874333097168314370)

3. "\"Grey\" doesn't have to mean Grey™. Try saturating your greys with a bit of blue or brown for a cooler or warmer feel."
   — [status/975796307196604417](https://twitter.com/steveschoger/status/975796307196604417)

4. "🔥 Aligning text is an easy way to clean up your design and make your content much more scannable."
   — [status/875427320147972098](https://twitter.com/steveschoger/status/875427320147972098)

5. "🔥 Adding a subtle shadow to white text when on a bright background not only makes it more legible but helps it 'pop' more."
   — [status/880449411150753792](https://twitter.com/steveschoger/status/880449411150753792)

6. "🔥 Make your gradients appear more vibrant by adjusting the hue by a few degrees (10º or 20º max) in either direction."
   — [status/879365654238941184](https://twitter.com/steveschoger/status/879365654238941184)

7. "🔥 Giving your box shadows a slight, vertical offset helps to make them look more natural."
   — [status/877209916179709955](https://twitter.com/steveschoger/status/877209916179709955)

8. "🤙🏼 If in doubt, 16px font with 1.5 line height is pretty good safe for body copy."
   — [status/870328030270500864](https://twitter.com/steveschoger/status/870328030270500864)

9. "😘 Quick tip: All-caps can sometimes be difficult to read. Consider using letter-spacing to give your text a little more room to breathe"
   — [status/869932734466195456](https://twitter.com/steveschoger/status/869932734466195456)

10. "🔥 Using the same line-height for all text is a very subtle but common mistake. 1.5 may work great for body copy, but as text gets larger, your line-height should get tighter."
    — [status/968519052800024577](https://twitter.com/steveschoger/status/968519052800024577)

11. "🔥 Font size isn't always the best way to emphasize or de-emphasize text, try using color and font weight instead:"
    — [status/910162010754748416](https://twitter.com/steveschoger/status/910162010754748416)

12. "🔥 If you want text of different sizes to \*feel\* like the same weight, make larger text thinner and smaller text bolder."
    — [status/979055525060055040](https://twitter.com/steveschoger/status/979055525060055040)

13. "It's all about creating hierarchy. You want your primary button to stand out much more than your secondary / danger actions."
    — [status/892848474768629764](https://twitter.com/steveschoger/status/892848474768629764)

14. "🔥 A subtle link for negative secondary actions often works better than a big bold button. (Just make sure you have a confirmation step!)"
    — [status/892808889535737868](https://twitter.com/steveschoger/status/892808889535737868)

15. "Along with size and weight, using color and contrast is a great way to create typographic hierarchy."
    — [status/870679289624092673](https://twitter.com/steveschoger/status/870679289624092673)

16. "🔥 Using multiples to define your spacing is a great way to achieve vertical rhythm and provides a formula to justify your choices"
    — [status/885514519182802944](https://twitter.com/steveschoger/status/885514519182802944)

17. "🔥 Overlapping images is a great way to add depth to an interface and make it look more \"designed\". Use a border that matches the background color to create distinction and keep things looking clean 👌"
    — [status/981606881255976961](https://twitter.com/steveschoger/status/981606881255976961)
    （注：这条精准命中了"before/after + 一句诊断"的完整格式，也是被社区质疑"为什么需要 depth"最多的一条 —— 见 [HN 23458035](https://news.ycombinator.com/item?id=23458035)）

18. "🔥 Dropdowns can be more than just a boring list of links. They're just boxes, you can do anything you want with them!"
    — [status/953297226985549825](https://twitter.com/steveschoger/status/953297226985549825)

19. "🔥 Don't be afraid to \"think outside the database\" — your UI doesn't need to map one-to-one with your data's fields and values."
    — [status/997125312411570176](https://twitter.com/steveschoger/status/997125312411570176)

20. "If I am using icons that have more weight than the text, I typically make the icons slightly lighter than the text for inactive states 👌🏼"
    — [status/872865304719892480](https://twitter.com/steveschoger/status/872865304719892480)

**Steve 的一手长句补充（3 条）**

21. `[一手]` 关于推文格式的自我解释（上文已引，此处标记为**最有价值的一条自述**）：
    > "One of the benefits of using Twitter to publish these tips is having the constraint of 140 characters. This forces me to be creative and simplify the tips down to something that is super digestible."
    — [HN 15179183](https://news.ycombinator.com/item?id=15179183)

22. `[一手]` Refactoring UI 官网解释"为什么不做原则课"：
    > "They focus so much on high level principles like color theory and typography which, while important, never helped me make instant improvements like **the actionable, specific tactics** I was picking up from Steve."
    — [refactoringui.com](https://refactoringui.com/)（Adam 执笔，但反映两人共同方法论）

23. `[一手]` 官网对"design with tactics, not talent"的展开：
    > "**It doesn't take any talent to make changes like this** — once you know the tactic you just need to notice the problem and apply the solution."
    — [refactoringui.com](https://refactoringui.com/)

### B. Adam Wathan —— 辩论、自嘲与自我定位（10 条）

24. `[一手]` 拆概念的招牌句：
    > "\"Separation of concerns\" is a straw man… Instead, **think about _dependency direction._**"
    — [adamwathan.me](https://adamwathan.me/css-utility-classes-and-separation-of-concerns/)

25. `[一手]` 承认派别、不装中立：
    > "Tailwind is designed around the opinion that that whole idea was mostly wrong, similar to how frameworks like React brought back the `onClick=` attribute when everyone was saying \"unobtrusive JavaScript\" was the best practice"
    — [HN 35354903](https://news.ycombinator.com/item?id=35354903)

26. `[一手]` 承认自己产品的设计失误（罕见的自我否定）：
    > "Confession: The `apply` feature in Tailwind basically only exists to trick people who are put off by long lists of classes into trying the framework. You should almost never use it. Reuse your utility-littered HTML instead."
    — 原推 [x.com/adamwathan/status/1226511611592085504](https://x.com/adamwathan/status/1226511611592085504)（2020-02-09）；逐字转引见 [HN 32854855](https://news.ycombinator.com/item?id=32854855)。`[二手-逐字]`（推文本身不可访问，但两个独立 HN 用户引用一致）

27. `[一手]` 面对 CSS 传统派的最硬一句：
    > "This approach is extremely seductive because on the surface it sounds so \"pure\" and \"clean\" but the reality is that on large projects it leads to some of the most horrific, hard to maintain CSS you'll ever see, no matter how hard you try to keep things in good shape."
    — [HN 22627703](https://news.ycombinator.com/item?id=22627703)

28. `[一手]` 对 Nicolas Gallagher 的公开致谢（辩论中的"我站谁"）：
    > "Always thought this article by Nicolas Gallagher did the best job arguing this point: http://nicolasgallagher.com/about-html-semantics-front-end-architecture/"
    — 同上

29. `[一手]` 拒绝"说服"的坦白（教学语气的转折点）：
    > "I try less hard now than I did in the past to convince people that it's a good idea. I think that the honest truth is that it's almost impossible for someone to give in to you that it's a good idea. It's such a polarizing looking thing."
    > "So I think the only way to really change your mind about it is to try and build something with it. You have to just force yourself to do it and **just try to silence that voice in your head that's saying everything about this is horrible and wrong.**"
    — [Website 101 Podcast S05E04](https://website101podcast.com/episodes/season-05/episode-4/tailwind-css-with-adam-wathan)（转录由 AI 生成，标注"Accuracy of transcript is dependant on AI technology"，故此处视为 `[一手-转录]`，个别口语词可能有识别误差）

30. `[一手]` 面对社区压力时的直给（2026-01）：
    > "Have more important things to do like figure out how to make enough money for the business to be sustainable right now. And making it easier for LLMs to read our docs just means less traffic to our docs which means less people learning about our paid products and the business being even less sustainable. Just don't have time to work on things that don't help us pay the bills right now, sorry."
    — [tailwindcss.com PR #2388](https://github.com/tailwindlabs/tailwindcss.com/pull/2388#issuecomment-3715074726)

31. `[一手]` 商业透明（主动公开收入下滑）：
    > "We are still healthy and profitable but **revenue is down about 60% from peak**, and continuing to trend down (I think mostly due to AI and open-source alternatives to the things we've historically charged for.)"
    — [HN 44690607](https://news.ycombinator.com/item?id=44690607)
    > ⚠️ **口径演变，勿与后一条合并**：本条的 **60%** 出自 HN 讨论（**早于 2026 年 1 月**），
    > 而同一位 Adam 在 **2026-01-07** 的 GitHub PR #2388 评论里说的是 **"our revenue is down close to 80%"**。
    > **两个数字都是他本人说的，不是矛盾、也不互相推翻——是同一指标在不同时间点的两个读数**
    > （60% → 80%，即下滑在持续加深）。引用时必须带日期：
    > **60% = 裁员前的口径；80% = 2026 年 1 月裁员时的口径。**
    > 80% 那条的出处见 `04-external-views.md`「出处 B-1」，评论 `3717222957`，已 API 核实。

32. `[一手]` 起源叙事里的自嘲（Tailwind 只是自己用的工具）：
    > "Now at this point I had **_zero_ intention of maintaining any sort of open-source CSS framework. It didn't even occur to me that what I had been building would even be interesting to anyone.** But stream after stream, people were always asking about the CSS"
    — [adamwathan.me](https://adamwathan.me/tailwindcss-from-side-project-byproduct-to-multi-mullion-dollar-business/)

33. `[一手]` 对自己的工程执念（"过度在意"式的坦白）：
    > "this code base and project is really important to me, and I wanna be, like, **obscenely proud of every corner of the code base**."
    — [Tuple Podcast #E9](https://podcast.tuple.app/episodes/adam-wathan/transcript)

---

## 10. 来源清单

### 一手来源（本人署名）

| # | 来源 | 类型 | URL | 用途 |
|---|---|---|---|---|
| 1 | Adam Wathan 博客《CSS Utility Classes and "Separation of Concerns"》(2017-08-07) | 官方博客 | https://adamwathan.me/css-utility-classes-and-separation-of-concerns/ | 招牌论证结构、自嘲笔法、"utility-first" 命名自述、对 Nicolas Gallagher 的引用 |
| 2 | Adam Wathan 博客《Tailwind CSS: From Side-Project Byproduct to Multi-Million Dollar Business》(2020-08-02) | 官方博客 | https://adamwathan.me/tailwindcss-from-side-project-byproduct-to-multi-mullion-dollar-business/ | 起源自述、"zero intention"、"abusing PostCSS" 玩笑、引用的自己的推文 |
| 3 | Adam Wathan 文章索引 | 官方站 | https://adamwathan.me/articles/ | 文章风格标题清单（"Methods Are Affordances, Not Abilities" 等）|
| 4 | Refactoring UI 官网首页 | 官方站 | https://refactoringui.com/ | "used to suck at design"、"design with tactics, not talent"、目录（章节名即句式） |
| 5 | Steve Schoger 个人站 & 访谈页 | 官方站 | https://www.steveschoger.com/ ／ https://www.steveschoger.com/interviews/ | 自我描述口径、播客列表 |
| 6 | HN 账号 `adamwathan` 评论（Algolia API 全量抓取） | 论坛原话 | https://hn.algolia.com/api/v1/search?query=adamwathan&tags=comment&restrictSearchableAttributes=author | 争议立场、技术辩护、商业透明、"infinite pixels" 等 |
| 7 | HN 账号 `steveschoger` 评论 | 论坛原话 | https://news.ycombinator.com/item?id=15179183 | 关于 140 字约束的自述 |
| 8 | GitHub API：tailwindcss.com PR #2388 评论 | 代码平台原话 | https://github.com/tailwindlabs/tailwindcss.com/pull/2388 | 2026-01 面对批评的直给回应 |
| 9 | GitHub API：tailwindcss discussion #14677 评论 | 代码平台原话 | https://github.com/tailwindlabs/tailwindcss/discussions/14677 | 社区互动（Adam 未在此条回复） |
| 10 | The Tuple Podcast #E9（Adam Wathan，2024-06-10） | 播客转录 | https://podcast.tuple.app/episodes/adam-wathan/transcript | 口语节奏、自我打断、工程观点 |
| 11 | The Panel E6《Figuring out what to do next》(2025-04-04) | 播客转录 | https://panelpodcast.com/6/transcript | 公开示弱、商业困境自述 |
| 12 | Website 101 Podcast S05E04（2022-02-22） | 播客转录（AI） | https://website101podcast.com/episodes/season-05/episode-4/tailwind-css-with-adam-wathan | "I try less hard now…" 教学语气、Tailwind 定位 |
| 13 | Tailwind 官方站 | 官方站 | https://tailwindcss.com/ | 品牌口径 |
| 14 | Adam Wathan 推文（经第三方逐字引用） | X/Twitter | https://x.com/adamwathan/status/1226511611592085504 ／ .../1963709979363258560 ／ .../1613718281969635328 | @apply 认错、反讽、强断言 |

### 二手来源（转述 / 逐字汇编）

| # | 来源 | 性质 | URL | 备注 |
|---|---|---|---|---|
| 15 | GIGAZINE《"Little UI Details" summarizing some tips on UI visual design》(2017-09-11) | 逐字汇编（含 Twitter 卡片） | https://gigazine.net/gsc_news/en/20170911-little-ui-details | 26 条 Steve 推文逐字；日文媒体英文版 |
| 16 | Digital Synopsis《Short, Useful Design Tips For UI/UX Designers》 | 逐字汇编（含 Twitter 卡片） | https://digitalsynopsis.com/design/useful-ui-ux-design-tips/ | 30 条 Steve 推文逐字，覆盖至 2018-05 |
| 17 | Digital Synopsis《Simple, Useful Design Tips For UI/UX Designers》 | 图片汇编 | https://digitalsynopsis.com/design/ui-ux-design-tips/ | 该页为 Sparklin 系列，非 Steve，**本报告未用于 Steve 语料**（记录以防误用） |
| 18 | HN 讨论 《Creators of Tailwind laid off 75% of their engineering team》 | 论坛 | https://news.ycombinator.com/item?id=46527950 | 社区对 Adam 的引用与反应 |
| 19 | HN 讨论《CSS Zen Garden》 | 论坛 | https://news.ycombinator.com/item?id=22627018 | Adam 本人在场的一手辩论（已归入 #6） |
| 20 | Refactoring UI 读书笔记（第三方） | 转述 | https://iamaatoh.com/essays/refactoring-ui.html | 用于交叉核对书中章节名，不用于直接引语 |

### 尝试过但不可达的来源（缺口记录）
`twitter.com` / `x.com`（域名解析被拒）、所有 nitter 实例、`web.archive.org`、`medium.com`（含 @refactoringui 文集与《7 Practical Tips for Cheating at Design》）、`raw.githubusercontent.com`、`steveschoger.com` 旧站归档、`pdfcoffee`（403）、devtools.fm #93 正文。

---

## 11. 两人风格差异速查表

| 维度 | Steve Schoger | Adam Wathan |
|---|---|---|
| **体裁** | 140 字推文 + before/after 图；视频逐帧演示 | 长文（6000 字五阶段自述）；播客即兴 |
| **句长** | 短句，1–2 句一条 | 长句可嵌套 3 层；口语中大量"like" |
| **主词** | 画面元素（borders / shadows / text / icons） | 抽象概念（dependency direction / tradeoff / constraint）|
| **动词** | try / consider / use / make / add | think about / treat / optimize for / extract |
| **副词缓冲** | 极多：really / pretty / a bit / slightly / often | 少；用 honestly / basically / like 代替 |
| **确定性** | 视觉判断 100% 硬；方法上留余地（"If in doubt"） | 技术立场硬；个人与商业判断公开摇摆 |
| **批评方式** | 指向画面，不指向人 | 指向论点，可直接说"这是稻草人" |
| **幽默** | emoji + 反品牌梗（Grey™）+ 一句小玩笑 | 自嘲（used to suck at design）+ 荒诞类比 + 公开示弱 |
| **引用习惯** | 几乎不引用；偶夸真实网站 UI | 高密度点名引用，作为论证链 |
| **教学落点** | 给参数（4–6px / 16px 1.5 / 10º–20º） | 给权衡（"Neither is inherently wrong"）+ 适用范围限定 |
| **对外冲突** | 不参与 | 直接下场，不软化 |
| **自称/自我定位** | "a visual designer from Canada"（低调） | "a full stack developer who used to suck at design"（自贬即品牌）|

---

## 12. 信息缺口与不可确认项（诚实清单）

1. **Steve 的推文原文全部为 `[二手-逐字]`**。推特域名在本环境不可访问，无法对任一推文做字符级一手比对。第三方汇编页保留了完整的 Twitter 卡片 HTML（含 t.co 短链与时间戳），字符可信度高，但**存在第三方转录错误的可能**。凡引用这些推文做「逐字」用途时，建议另行通过可访问渠道复核。
2. **Steve 2019 年之后的公开表达渠道疑似收缩**。可抓到的推文样本集中在 2017-05 至 2018-05；2019 年后主要产出是 Refactoring UI 视频与 Tailwind 内部设计工作。因此**"Steve 近年风格是否变化"这一项无法判断**。
3. **Steve 的争议立场 / 公开辩论样本 = 0**。他从未在可抓到的语料中对语义化 CSS 派、Tailwind 批评者作出回应。因此本报告关于"Steve 温和"的判断是**基于缺失证据的推断**，不能排除"他不在公开场合表达"而非"他没有立场"。标 `[推断]`。
4. **Refactoring UI 全书正文未能获取**（pdfcoffee 403、Medium 不可达）。本报告引用的 Refactoring UI 章节名来自官网目录（一手），书中逐句措辞未验证。
5. **Adam 的推文原文部分为转引**。仅有 3 条经多源交叉确认（@apply 认错、CSS Zen Garden 反驳、$610m 反讽）。其余推文内容以博客/HN/GitHub 一手文本替代——**这些渠道的文字风格与推文风格有差异（更长、更结构化）**，做"碎片表达"分析时需注意。
6. **播客转录为 AI 生成**（Tuple 与 Website 101 官网均标注），口语词、语法破碎处为转录音正常现象，不代表本人书面表达习惯。
7. **未获取**：Full Stack Radio #74 / #103（Steve 主讲的两期）、Steve 的 YouTube "Refactoring UI" 系列口播文本、Laravel Podcast #17、Yo! Podcast #005 —— 这些是 Steve 教学语气最密集的语料，建议后续补齐。
8. **两人互相评价的原话**未找到直接样本（Adam 夸 Steve 的"intuitive and creative"是目前唯一一条）。

---

*调研 Agent 3 ｜ 样本数：33 条编号摘录 + 第 2–8 节内嵌样本 ≈ 60 条可定位表达 ｜ 一手占比：14/20 独立来源（含 3 条推文经多源交叉的一手内容）*
