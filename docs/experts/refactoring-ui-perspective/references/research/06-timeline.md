# Adam Wathan & Steve Schoger —— 时间线调研（Agent 6）

> 调研对象：《Refactoring UI》作者、Tailwind CSS 团队核心成员 Adam Wathan 与 Steve Schoger
> 调研截止日：**2026-09-17**（本地日期已确认）
> 可信度标记：`[一手]` = 官方博客 / 本人文章 / GitHub API / 官方产品页 / 播客原始页面；`[二手]` = 媒体、会议页、好友播客、社区通讯；`[推断]` = 由一手材料推导，非直接陈述；`[存疑]` = 时间或事实不确定。

---

## 一、人物小传

### Adam Wathan

Adam Wathan，加拿大安大略省人（GitHub 资料页 location 字段为 "Ontario, Canada"，LinkedIn 显示 Cambridge, Ontario）`[一手]`（来源：<https://api.github.com/users/adamwathan>、<https://www.linkedin.com/in/adam-wathan-9418984a>）。他在 Laravel 社区起家：2013 年做了第一场会议演讲`[一手]`（来源：<https://adamwathan.me/talks/>），2014-10-18 开播 Full Stack Radio（第一期嘉宾 Matt Stauffer，聊 OOCSS/BEM/SMACSS）`[一手]`（来源：<https://fullstackradio.com/1>）。2015 年他独立开发静态站生成器 Jigsaw；2016 年 5 月与 Taylor Otwell 用几个通宵做出 Laravel Valet，同年出版第一本书（Test-Driven Laravel）并辞掉工作开始全职做自己的产品`[一手]`（来源：<https://adamwathan.me/projects/>、<https://adamwathan.me/>）。2015 年他与 Steve Schoger 合作做 side project「Digest」，又做结账 SaaS「KiteTail」——Tailwind CSS 就是从 KiteTail 的样式表里长出来的`[一手]`（来源：<https://adamwathan.me/tailwindcss-from-side-project-byproduct-to-multi-mullion-dollar-business>）。他把自己的身份描述为「Tailwind CSS 的创造者、Refactoring UI 的作者、Full Stack Radio 的主播」，在公司里是实际负责人（他自己说 on paper 是 CEO，但从不喜欢这个头衔，公司只有五个人量级）`[一手]`（来源：<https://github.com/adamwathan>、<https://tighten.com/insights/pragmatic-ai-ep2-adam-wathan-ai-impact-on-open-source-funding/>）。

### Steve Schoger

Steve Schoger，加拿大安大略省的视觉设计师，常在社交资料里写自己是「Designer @tailwindlabs」`[二手]`；播客中自述来自安大略省，另有资料称其为 Kitchener, Ontario`[二手]`（来源：<https://raw.githubusercontent.com/ladybug-podcast/ladybug-website/master/transcripts/24-design-for-developers.md>、<https://smashnotes.com/p/yo-podcast/e/005-steve-schoger-designer-refactoring-ui-co-author>）。**他不是传统意义上的科班设计师**：小时候爱画画，高中沉迷音乐与乐队 logo，之后在安大略省 London 的 Fanshawe College 读了当时新开的 Multimedia Design and Production（约 2004 年入学，学 Flash、Photoshop、视频与网页），又读了同校的音乐产业与广告文案方向，长期自认「什么都懂一点、什么都不精」，在 2009 年经济衰退期靠作品集自我训练、做虚假广告和假网站练设计，之后才敢找设计工作`[一手-口述]`（来源：同上 Ladybug Podcast 逐字稿）。职业路径是：多伦多市中心一家小型网页设计公司 → 创业公司 → 一家在线教育公司（做到倦怠离职）→ 一家保险公司（八小时下班、不加班，业余做 side hustle 与 Twitter 受众）。他先做免费 SVG 图标集 Zondicons 与 Hero Patterns 攒受众，再把 Heroicons 做成付费产品（首周约 1 万美元，截至 2020 年 1 月累计约 3 万美元）`[一手-口述]`。他靠 Adam Wathan 引荐进入 Laravel 生态：Taylor Otwell 与芝加哥的 Tighten 各自只需要半个设计师，于是谈成「一周给 Taylor、一周给 Tighten、一周自由」的安排，这段时间成为他做 Refactoring UI 的孵化期`[一手-口述]`（来源：同上 Ladybug Podcast 逐字稿）。

---

## 二、完整时间线（2012 → 2026-09-17）

| 年份/日期 | 人物 | 事件 | 来源 | 可信度 |
|---|---|---|---|---|
| 2012 | Adam | **未找到**可核实的公开活动记录。可确认的最早公开节点是 2013 年的首场会议演讲 | <https://adamwathan.me/talks/> | 未找到 |
| 2013 | Adam | 做了**第一场会议演讲**，此后每年若干场（自述） | <https://adamwathan.me/talks/> | `[一手]` |
| 2013-05-02 | Adam | GitHub 账号 `adamwathan` 创建 | <https://api.github.com/users/adamwathan> | `[一手]` |
| 2014-10-18 | Adam | **Full Stack Radio 第 1 期**上线，嘉宾 Matt Stauffer，主题 CSS 语义/BEM/SMACSS | <https://fullstackradio.com/1> | `[一手]` |
| 2015 | Adam | 独立开发 **Jigsaw**（静态站生成器），后移交 Tighten 维护 | <https://adamwathan.me/projects/> | `[一手]` |
| 2015 | 两人 | 合作 side project「**Digest**」（团队链接分享站），Adam 首次从零写 Less 工具类样式系统，成为 utility-first 思想起点 | <https://adamwathan.me/tailwindcss-from-side-project-byproduct-to-multi-mullion-dollar-business> | `[一手]` |
| 2015 / 2016 | Steve | Zondicons（免费 SVG 图标）→ **Hero Patterns**（可重复 SVG 背景图案）上线，用于攒受众 | <https://www.steveschoger.com/projects/>、Ladybug 逐字稿 | `[一手]` |
| 2016 | Adam | 出版第一本书 **Test-Driven Laravel**，并**辞职全职做自己的产品** | <https://adamwathan.me/>、<https://adamwathan.me/going-full-time-on-tailwind-css> | `[一手]` |
| 2016-05 | Adam | 与 Taylor Otwell 用几个通宵做出 **Laravel Valet** | <https://adamwathan.me/projects/> | `[一手]` |
| 2017-03-02 | Adam | **KiteTail** 公告文发布。需更正：KiteTail **不是用户调研工具**，而是「webhook 驱动的结账即服务（checkout-as-a-service）SaaS」 | <https://adamwathan.me/projects/>、<https://adamwathan.me/2017/03/02/whats-kitetail/> | `[一手]` |
| 2017-06-18 | Adam | 发推「正在打磨 KiteTail 的 Less 框架，想把它开源」——开源念头公开 | <https://adamwathan.me/tailwindcss-from-side-project-byproduct-to-multi-mullion-dollar-business>（内嵌推文） | `[一手]` |
| 2017-06/07 | Adam + Jonathan Reinink | 联手把框架做成「项目无关」；响应式前缀 `sm:font-bold` 的形态由 Stefan Bauer 建议 | 同上 | `[一手]` |
| 2017-08（中旬） | Adam | 经 David Hemphill 建议改用 **PostCSS + JS** 重写框架 | 同上 | `[一手]` |
| 2017-08-30 | Adam | Full Stack Radio **第 71 期「Building a CSS Framework with PostCSS」** | <https://fullstackradio.com/71> | `[一手]` |
| 2017-10-12 | Adam + Steve | Full Stack Radio **第 74 期「Tactical Design Advice for Developers」**（两人首次同台播客，Steve 讲 5 条开发者设计技巧） | <https://fullstackradio.com/74> | `[一手]` |
| 2017-10-31 | Adam | 万圣节夜赶 Tailwind v0.1 首发与文档（推文为证） | 同 backstory 文章 | `[一手]` |
| 2017-11-01 | Adam | **Tailwind CSS v0.1.0 发布** | 同 backstory 文章（内嵌 0.1.0 发布推文） | `[一手]` |
| 2018-09-22/23 | Steve | Fluxible（Waterloo, CA）演讲「15 Practical Tips for Cheating at Design」 | <https://www.steveschoger.com/speaking/> | `[一手]` |
| 2018-10-17/18 | Steve | Laracon AU（悉尼）演讲「Refactoring UI」 | 同上 | `[一手]` |
| 2018-12-05 | 两人 | Full Stack Radio **第 103 期**：设计 Q&A + 预告《Refactoring UI》 | <https://fullstackradio.com/103> | `[一手]` |
| **2018-12** | 两人 | **《Refactoring UI》正式发售**（电子书 + 3 段视频教程 + 组件画廊 + 配色板 + 字体清单；Adam 自述「2018 年 12 月发布」） | <https://adamwathan.me/tailwindcss-from-side-project-byproduct-to-multi-mullion-dollar-business>、<https://refactoringui.com/> | `[一手]`（具体日未找到） |
| 2018-12-28 | Adam | 发布「**Going Full-Time on Tailwind CSS**」，宣布 2019 年起全职做 Tailwind | <https://adamwathan.me/going-full-time-on-tailwind-css/> | `[一手]` |
| 2019 | 两人 | Steve 从兼职设计协作转为全职与 Adam 一起做 Tailwind（口述：「past year」全职投入） | Ladybug 逐字稿 | `[一手-口述]` |
| 2019-02-02 | Steve | Laracon Online「The Little Details of UI Design」 | <https://www.steveschoger.com/speaking/> | `[一手]`（页面日期与另一处 2019-03-06 冲突，标 `[存疑]`） |
| 2019-02-08 | Steve | The Laravel Podcast 专访 | <https://laravelpodcast.com/episodes/89e3758b> | `[一手]` |
| 2019-04-21/22 | Steve | SmashingConf San Francisco | <https://www.steveschoger.com/speaking/> | `[一手]` |
| 2019-06-13/14 | Steve | CSS Day（阿姆斯特丹）「Practical Solutions to Common UI Design Problems」 | 同上 | `[一手]` |
| **2019-05-13** | Adam | **Tailwind CSS v1.0 发布** | backstory 文章内嵌发布推文 | `[一手]` |
| 2019-07-24/25 | Steve | Laracon US（纽约）「How to Think Like a Visual Designer」 | <https://www.steveschoger.com/speaking/> | `[一手]` |
| 2019-09-11 | Adam | Full Stack Radio 第 123 期：与 Ian Landsman 讨论「与 Steve Schoger 一起做的 Tailwind CSS 组件目录项目」的营销定位 —— Tailwind UI 的前身 | <https://fullstackradio.com/123> | `[一手]` |
| 2020-01-11 | 两人 | UI Breakfast 第 154 期「Refactoring UI」 | <https://uibreakfast.com/154-refactoring-ui-with-adam-wathan-and-steve-schoger/> | `[二手]` |
| 2020-01-20 | Steve | Ladybug Podcast「Design for Developers」，自述职业与项目史（本文件人物小传主要依据） | Ladybug 逐字稿 | `[一手-口述]` |
| **2020-02-26** | 两人 | **Tailwind UI 早鸟版上线**（首个商业产品） | backstory 文章内嵌发布推文 | `[一手]` |
| 2020-08-02 | Adam | 复盘长文「**Tailwind CSS: From Side-Project Byproduct to Multi-Million Dollar Business**」：Tailwind 累计安装破 1000 万、Tailwind UI 收入将破 200 万美元 | <https://adamwathan.me/tailwindcss-from-side-project-byproduct-to-multi-mullion-dollar-business> | `[一手]` |
| 2020（秋季） | Tailwind Labs | **Headless UI 首次发布**（无样式、可访问的 React/Vue 组件库）。具体日期未找到 | <https://tailwindcss.com/blog/headless-ui-v1>（称「Last fall we announced Headless UI」） | `[一手]`（日期未找到） |
| 2020-09-23 / 09-29 | Tailwind Labs | Full Stack Radio 第 147、148 期提及 Headless UI 品牌问题、Tailwind Labs YouTube 频道上线 —— 可见「Tailwind Labs」作为团队/公司名在 2020 年 9 月已公开使用 | <https://fullstackradio.com/147>、<https://fullstackradio.com/148> | `[一手]` |
| 2020-11-18 | Adam | **Tailwind CSS v2.0**（全新配色、暗色模式、2xl 断点、ring 工具类） | <https://tailwindcss.com/blog/tailwindcss-v2> | `[一手]` |
| 2020-12-29 | Adam | 工作日志「2020 Year in Review」（日志更新止于此，此后再无新条目） | <https://adamwathan.me/journal> | `[一手]` |
| 2021-04-14 | Adam | **Headless UI v1.0**（React/Vue 组件数量翻倍） | <https://tailwindcss.com/blog/headless-ui-v1> | `[一手]` |
| 2021-12-09 | Adam | **Tailwind CSS v3.0**（JIT 引擎转正、全色板默认开启、任意值、Play CDN） | <https://tailwindcss.com/blog/tailwindcss-v3> | `[一手]` |
| 2022-10-10/13 | Steve | SmashingConf New York 讲师，简介称其为「Tailwind Labs 的设计师与合伙人」 | <https://smashingconf.com/ny-2022/speakers/steve-schoger> | `[二手]` |
| 2023-06-20 | Tailwind Labs | **Tailwind Connect 2023**，首次线下活动主题演讲 | <https://www.youtube.com/watch?v=CLkxRnRQtDE> | `[二手]` |
| 2025-01-22 | Adam | **Tailwind CSS v4.0**（引擎重写、CSS-first 配置、OKLCH 色板、容器查询内建） | <https://tailwindcss.com/blog/tailwindcss-v4> | `[一手]` |
| 2025-03-04 | Adam | **Tailwind UI 更名为 Tailwind Plus**（一次性买断不变、老客户自动升级、不加价） | <https://tailwindcss.com/blog/tailwind-plus> | `[一手]` |
| 2025-04-01 / 04-03 | Adam + Dan Hollick | Tailwind CSS **v4.1.0**：GitHub 标签发布于 2025-04-01，官方博客发文 2025-04-03（text-shadow、mask、旧浏览器降级） | <https://api.github.com/repos/tailwindlabs/tailwindcss/releases/tags/v4.1.0>、<https://tailwindcss.com/blog/tailwindcss-v4-1> | `[一手]` |
| 2025-08-21 | Adam | Full Stack Radio **第 153 期**（嘉宾 DHH，聊 Omarchy）—— 该播客自 2021-01-28 停更后首次复更 | <https://fullstackradio.com/153> | `[一手]` |
| 2025 秋 | Adam | 开办个人播客 **Adam's Morning Walk**（边遛狗边独白式记录，第 5 期即下述裁员那期） | <https://adams-morning-walk.transistor.fm/episodes/we-had-six-months-left>（页面标注「Episode 5」） | `[一手]` |
| 2025-12-18 | Tailwind Labs | **Oatmeal** 上线 —— Tailwind Plus 首个多主题 SaaS 营销站套件（也催生了 v4.2 的 mauve/olive/mist/taupe 色板） | <https://tailwindcss.com/blog/tailwindcss-v4-3>（原文链接 `plus/changelog#2025-12-18`）、<https://tailwindweekly.com/issue-201/> | `[一手]`+`[二手]` |
| **2026-01-06** | Tailwind Labs | **裁员：工程团队裁掉 75%**（4 名工程师裁 3 人）。同日 Adam 关闭社区提交的 `llms.txt` PR（该 PR 2025-11-18 开启，2026-01-06 关闭，2026-01-08 被锁） | <https://api.github.com/repos/tailwindlabs/tailwindcss.com/issues/2388> | `[一手]` |
| **2026-01-07** | Adam | 在 GitHub PR #2388 评论区**首次公开披露裁员与财务数据**（详见 4.6 节原文引用）；同日 Adam's Morning Walk 第 5 期「We had six months left」上线 | <https://github.com/tailwindlabs/tailwindcss.com/pull/2388#issuecomment-3717222957>、<https://adams-morning-walk.transistor.fm/episodes/we-had-six-months-left> | `[一手]` |
| 2026-02-18 | Adam + Robin Malfait | Tailwind CSS **v4.2.0** 发布（新中性色板、首个官方 webpack 插件、逻辑属性工具类、`font-features-*`）。注意：v4.2 **没有单独发博客** | <https://api.github.com/repos/tailwindlabs/tailwindcss/releases/tags/v4.2.0>、<https://tailwindcss.com/blog/tailwindcss-v4-3> | `[一手]` |
| 2026-02-18 | Adam | Pragmatic AI（Matt Stauffer）第 2 期：谈 AI 对开源资助的冲击、营收转折与裁员 | <https://tighten.com/insights/pragmatic-ai-ep2-adam-wathan-ai-impact-on-open-source-funding/> | `[一手]` |
| **2026-03-05** | 两人 | **ui.sh 首次产品化发布**（面向编码智能体的「界面构建技能包」，MCP server + UI Designer skill） | <https://ui.sh/changelog>、<https://ui.sh/> | `[一手]` |
| 2026-03-24 | Adam | Startups For the Rest of Us 第 825 期「Talking Tailwind CSS and Founder Fitness」（主持 Rob Walling），谈一次性买断模式的经营教训、为何没及早看到下滑 | <https://startupsfortherestofus.com/episodes/episode-825-talking-tailwind-css-and-founder-fitness-with-adam-wathan> | `[一手]`（节目页）/`[二手]`（feed 平台） |
| 2026-04-15 | Steve | Pragmatic AI 第 11 期「Creating AI Workflows for Designers」，节目页称其为「**designer and partner at Tailwind Labs**」 | <https://pragmaticai.fm/episodes/creating-ai-workflows-for-designers> | `[一手]` |
| 2026-05-08 | Adam + Robin Malfait | Tailwind CSS **v4.3.0** 发布；官方博客一篇同时覆盖 v4.2 与 v4.3（滚动条工具类、`@container-size`、`zoom-*`、`tab-*`） | <https://tailwindcss.com/blog/tailwindcss-v4-3>、<https://api.github.com/repos/tailwindlabs/tailwindcss/releases/tags/v4.3.0> | `[一手]` |
| 2026-06-10 | 两人 | ui.sh 重构：从单个 `/ui` 技能拆成 9 个本地安装技能（`/design`、`/ideas`、`/brand-kit`、`/componentize`、`/canonicalize-tailwind`、`/add-dark-mode`、`/dark-mode-image`、`/make-responsive`、`/markup-from-image`） | <https://ui.sh/changelog> | `[一手]` |
| 2026-07-16 | Tailwind Labs | Tailwind CSS **v4.3.3** 发布（截至调研日为最新补丁） | <https://api.github.com/repos/tailwindlabs/tailwindcss/releases?per_page=100> | `[一手]` |
| **2026-09-09** | Tailwind Labs | **Tailwind Labs 加入 Shopify**。官方公告：Tailwind CSS 及所有开源项目**永久维持 MIT 许可**、团队继续主导维护；商业侧不再追求增长，**Tailwind Plus 与 ui.sh 关闭新用户注册**，老客户保留访问权；Insiders 计划逐步收尾 | <https://tailwindcss.com/blog/tailwind-is-joining-shopify> | `[一手]` |
| 2026-09-09 前后 | Steve | 在 X 上转述「Tailwind is joining Shopify」（推文文本经搜索快照确认，X 原文未能直接抓取） | <https://x.com/steveschoger>（经 tavily 搜索摘要） | `[二手]` |
| 2026-09-12 | 生态 | Tailwind Weekly 第 230 期确认：Insiders 订阅取消、Discord 保留至计费周期末；ui.sh 本地技能归用户所有、远程 MCP server 将下线 | <https://tailwindweekly.com/issue-230/> | `[二手]` |

---

## 三、思想转折点标注

### 转折点 1：Adam 从「组件类信徒」到「utility-first 代言人」（2015 → 2017）

- **起点（2015）**：做 Digest 时 Adam 是 Bootstrap 拥护者，因为 Bootstrap 4 alpha 弃 Less 转 Sass（他讨厌 Sass）而被迫手写样式。他写的是**组件类为主**（`btn`、`card-list`、`radio-box`）+ 少量工具类`[一手]`。
- **觉醒**：他在 4~5 个项目之间反复复制这套 Less 文件时发现——**工具类越用越通用，组件类越用越短命**；只有工具类是真正「可移植」的。他自述此时才把 utility-first 认作一种**架构哲学**，而非一堆顺手的小技巧`[一手]`。
- **落地**：2017 年在 KiteTail 上直播写代码，观众反复追问 CSS，才萌生开源念头；随后与 Jonathan Reinink 用两个设计完全不同的真实项目当「强制函数」（forcing function），逼迫框架做到项目无关`[一手]`。
- **来源**：<https://adamwathan.me/tailwindcss-from-side-project-byproduct-to-multi-mullion-dollar-business>

> **注**：任务书提到「Adam 从反对 utility classes 到 utility-first 代言人」。**一手材料中未找到他公开「反对 utility classes」的言论**；可核实的是他从「组件类 + 无意识工具类」转向「有意识地把 utility-first 当作架构」。这一「反对论」标 `[存疑]`，建议不要写进结论。

### 转折点 2：从「个人工具」到「商业公司」（2018 → 2020）

- **2018-12**：先有《Refactoring UI》带来的现金（Adam 自述「big bankroll from Refactoring UI」），才有底气全职做 Tailwind`[一手]`。
- **2018-12-28 → 2019**：宣布全职；2019 全年与 Steve「埋头想 Tailwind 这门生意到底是什么」，推翻大量原型`[一手]`。
- **2019-03-30**：首次公开组件画廊/工作室原型（即后来的 Tailwind UI）`[一手]`（推文内嵌于 backstory 文章）。
- **2020-02-26**：Tailwind UI 早鸟上线；2020-08 时累计收入将破 200 万美元；公司开始扩编（Brad Cornes、Simon Vrachliotis 等）`[一手]`。
- **意义**：Tailwind 从「开源副作用品」变成「以开源为核心资产的商业公司（Tailwind Labs Inc.）」。「Tailwind Labs」作为团队名在 2020 年 9 月的播客中已公开使用；**公司注册日期未找到**。

### 转折点 3：从「增长」到「收缩与退出」（2023 → 2026）

- Adam 自述：自 **2023 年初 ChatGPT 出现起**，营收曲线开始持续下滑；两条腿同时被砍——① 用户改用 AI 直接生成组件/设计，不再购买预制模板；② 用户不再访问文档站，而文档站是商业产品**唯一的曝光渠道**`[一手]`（来源：Pragmatic AI 第 2 期逐字稿 + GitHub PR #2388 评论）。
- **2026-01-06**：裁员，工程团队裁掉 **75%**（4 人裁 3 人）；**2026-01-07** Adam 在 GitHub PR #2388 评论区首次公开披露，并给出财务口径：**文档流量较 2023 年初下降约 40%、营收下降接近 80%**；同期因拒绝合并 `llms.txt` PR 引发 Hacker News 争议（讨论超 1100 分）`[一手]`（详见 4.6 节原文引用）。
  > ⚠️ **营收口径有两个时间点，勿合并（2026-09-17 补充）**：**约 −60%** 见 HN 讨论 [44690607](https://news.ycombinator.com/item?id=44690607)（早于 2026-01，Adam 原话 "We are still healthy and profitable but revenue is down about 60% from peak"）；**约 −80%** 见 2026-01 裁员时的 GitHub [评论 `3717222957`](https://github.com/tailwindlabs/tailwindcss.com/pull/2388#issuecomment-3717222957)。**两者均为 Adam 本人所述，是下滑持续加深的两个读数，不是矛盾。**
- 后续自救：**合作伙伴（Partners）计划**成为主要资金来源（Cursor、Vercel、Supabase、Shopify 等）`[一手]`（来源：<https://tailwindcss.com/partners>）。
- **2026-09-09**：选择被 Shopify 收购，**主动终止商业增长路线**（关闭 Tailwind Plus / ui.sh 新注册），换取框架的长期维护`[一手]`。
- **意义**：这是整条时间线上最重的一次价值取向切换——从「靠商业产品养活开源」转向「靠大厂宿主养活开源」。

---

## 四、最新 12 个月动态（2025-09-17 → 2026-09-17）

**结论：动态非常密集，且含两条重大事件（2026-01 裁员 75%、2026-09-09 Tailwind Labs 加入 Shopify）。**

### 4.1 产品与版本迭代

| 日期 | 动态 | 来源 | 可信度 |
|---|---|---|---|
| 2025-12-18 | **Oatmeal** 上线，Tailwind Plus 首个多主题 SaaS 营销站套件；顺带产出 v4.2 的 mauve / olive / mist / taupe 四套中性色板 | <https://tailwindcss.com/blog/tailwindcss-v4-3>、<https://tailwindweekly.com/issue-201/> | `[一手]`+`[二手]` |
| 2026-02-18 | **Tailwind CSS v4.2.0**（无专文博客，仅在 v4.3 博文里补述） | <https://api.github.com/repos/tailwindlabs/tailwindcss/releases/tags/v4.2.0> | `[一手]` |
| 2026-03-05 | **ui.sh 首次发布**（Adam + Steve 联名，面向 Claude Code / Cursor / Codex 等编码智能体的界面技能包） | <https://ui.sh/changelog> | `[一手]` |
| 2026-05-08 | **Tailwind CSS v4.3.0**（滚动条工具类、`@container-size`、`zoom-*`、`tab-*`；v4.2 的逻辑属性等能力部分来自 **Netflix 与 Vercel** 的 Partners 合作） | <https://tailwindcss.com/blog/tailwindcss-v4-3> | `[一手]` |
| 2026-06-10 | **ui.sh 重组**为 9 个本地技能，去掉远程 MCP 单点依赖；新增用户账号体系 | <https://ui.sh/changelog> | `[一手]` |
| 2026-07-16 | **Tailwind CSS v4.3.3**（截至调研日最新版本） | <https://api.github.com/repos/tailwindlabs/tailwindcss/releases?per_page=100> | `[一手]` |
| 2026-09-09 | **Tailwind Labs 加入 Shopify**；Tailwind Plus / ui.sh 关闭新注册；Insiders 计划收尾 | <https://tailwindcss.com/blog/tailwind-is-joining-shopify> | `[一手]` |

> 补充：调研当日 tailwindcss.com 顶部文档版本号显示为 **v4.3**，与 GitHub 最新标签 v4.3.3 一致`[一手]`。

### 4.2 Adam Wathan 的公开演讲 / 播客

| 日期 | 动态 | 来源 | 可信度 |
|---|---|---|---|
| 2025 秋（起） | 开办个人播客 **Adam's Morning Walk**（独白式，遛狗时录制） | <https://adams-morning-walk.transistor.fm/episodes/we-had-six-months-left> | `[一手]` |
| 2026-01-07 | 第 5 期「We had six months left」公开裁员，引发广泛讨论；同期在 GitHub PR #2388 评论区给出完整财务口径；随后在 X 上澄清「不是危机求援，只是规模变小、更稳」 | <https://adams-morning-walk.transistor.fm/episodes/we-had-six-months-left>、<https://github.com/tailwindlabs/tailwindcss.com/pull/2388#issuecomment-3717222957>、<https://tailwindweekly.com/issue-201/> | `[一手]`+`[二手]` |
| 2026-02-18 | Pragmatic AI 第 2 期：AI 对开源资助的冲击、营收下滑与裁员决策的完整复盘 | <https://tighten.com/insights/pragmatic-ai-ep2-adam-wathan-ai-impact-on-open-source-funding/> | `[一手]` |
| 2026-03-24 | Startups For the Rest of Us 第 825 期「Talking Tailwind CSS and Founder Fitness」（主持 Rob Walling）：谈一次性买断模式的经营教训、为何没及早看到下滑 | <https://startupsfortherestofus.com/episodes/episode-825-talking-tailwind-css-and-founder-fitness-with-adam-wathan> | `[一手]`（节目页）/`[二手]`（feed 平台） |
| 2026-09-09 | X 发布「Big one today — Tailwind is joining Shopify」 | <https://x.com/adamwathan/status/2097683633645482130>（经搜索快照确认，X 原文未能直接抓取） | `[二手]` |

> 注：Full Stack Radio 最后一期为 **2025-08-21 第 153 期**，落在最近 12 个月窗口外（约 13 个月前）；窗口内**未找到新的 Full Stack Radio 集数**。

### 4.3 Steve Schoger 的最新公开活动

| 日期 | 动态 | 来源 | 可信度 |
|---|---|---|---|
| 2026-03-05 起 | 与 Adam 共同发布并迭代 **ui.sh**（官网署名区同时挂两人头像与「By the people who made Tailwind CSS & Refactoring UI」） | <https://ui.sh/>、<https://ui.sh/changelog> | `[一手]` |
| 2026-04-15 | Pragmatic AI 第 11 期嘉宾：「Creating AI Workflows for Designers」，节目页身份为「designer and partner at Tailwind Labs」，内容涉及 Claude 在设计工作流中的使用 | <https://pragmaticai.fm/episodes/creating-ai-workflows-for-designers> | `[一手]` |
| 2026-09-09 | 在 X 上发布/转述 Tailwind 加入 Shopify | <https://x.com/steveschoger>（搜索快照） | `[二手]` |
| 2026 年内 | Tailwind Weekly 第 230 期提到 Adam 在播客中提「我们在做一个模板，**Steve 设计了一个带 SVG 图表的 feature section**」——说明两人在 2026 年仍在共同做 Tailwind Plus 模板 | <https://tighten.com/insights/pragmatic-ai-ep2-adam-wathan-ai-impact-on-open-source-funding/> | `[一手]` |
| — | **未找到**：Steve 在窗口内的会议演讲记录、新 YouTube 教学视频、新个人付费产品 | — | 未找到 |

### 4.4 专项核实：Steve Schoger 是否已离开 Tailwind Labs？

**结论：未找到任何「离开」的一手证据；相反，多项证据指向他仍在 Tailwind Labs。**

- 支持「仍在 / 一并进入 Shopify」的证据：
  1. **2026-09-13 设计周报 Figmalion 第 260 期**明确写：「**Adam Wathan and Steve Schoger are taking the Tailwind Labs to Shopify.** Tailwind CSS stays MIT-licensed and the same people keep leading it, but the business around it ends – both Tailwind Plus and ui.sh are closed to new signups.」——这是目前唯一把**两个名字并列**写进 Shopify 事件的来源 `[二手]`（来源：<https://figmalion.com/issue/260>）。
  2. 2026-04-15 Pragmatic AI 节目页明确写「Steve Schoger — Designer and Partner at **Tailwind Labs**」`[一手]`。
  3. 2026 年他与 Adam 联名发布 **ui.sh**，这是 Tailwind Labs 的商业产品（Shopify 公告中与 Tailwind Plus 并列点名）`[一手]`。
  4. 2026-09-09 他在 X 上发布了 Tailwind 加入 Shopify 的消息`[二手]`。
  5. 其 X 资料简介为「Designer @tailwindlabs」`[二手]`。
- 需要注意的干扰信息：
  - 其个人站 **steveschoger.com** 的文案（「Currently I'm working with my friend Adam Wathan to help improve and grow TailwindCSS」）与内容（Interviews 只更新到 2019，Speaking 只到 2022）**明显长期未维护**，不能作为当前状态的证据 `[推断]`。
  - GitHub 上 `github.com/steveschoger` 现在是 **Organization 类型**（创建于 2021-08-27，0 个公开仓库，最后更新 2024-05-29），并非他的个人账号；其个人仓库不在该 handle 下 `[一手]`（来源：<https://api.github.com/users/steveschoger>）。这属于账号结构变化，**不构成离职证据**。
- 结论边界：**官方公告由 Adam 署名，通篇未出现 Steve 的名字，也未出现任何团队成员名单**。因此：
  - 「Steve 没有离开 Tailwind Labs」→ **可判定**（多项证据支持）。
  - 「Steve 随团队一并加入 Shopify」→ 有 Figmalion 一条二手明确表述，但**无官方一手确认**，标 `[存疑]`。建议下游只写「据 Figmalion 报道，两人一同将 Tailwind Labs 带往 Shopify；官方公告未点名」。

### 4.5 两人是否仍有合作？

**是。** 2026 年两人共同署名发布并持续迭代 ui.sh（3 月首发、4 月、5 月、6 月均有更新日志）`[一手]`；Adam 在 2026 年 2 月的播客中仍在描述「Steve 设计、我实现」的 Tailwind Plus 模板协作模式`[一手]`。

### 4.6 专项核实：2026-01 裁员 75% —— Adam Wathan 的一手原话

**来源：Adam 本人在 GitHub PR #2388 评论区的两条留言**（GitHub REST API 原始记录，非媒体转述）`[一手]`。

**事件坐标（GitHub API 原始字段）**：
- PR #2388「feat: add llms.txt endpoint for LLM-optimized documentation」，作者 `quantizor`
- 创建：2025-11-18T23:19:21Z ｜ 关闭：2026-01-06T15:11:56Z（关闭人 `adamwathan`）｜ 锁定：2026-01-08 ｜ 共 93 条评论
- 来源：<https://api.github.com/repos/tailwindlabs/tailwindcss.com/issues/2388>

**留言一 — 2026-01-06T15:11:56Z（关闭该 PR 时）** `[一手]`
> "Have more important things to do like figure out how to make enough money for the business to be sustainable right now. And making it easier for LLMs to read our docs just means less traffic to our docs which means less people learning about our paid products and the business being even less sustainable.
> Just don't have time to work on things that don't help us pay the bills right now, sorry. We may add this one day but closing for now."

来源：<https://github.com/tailwindlabs/tailwindcss.com/pull/2388#issuecomment-3715074726>

**留言二 — 2026-01-07T03:55:17Z（首次公开披露裁员，核心一手证据）** `[一手]`
> "I totally see the value in the feature and I would like to find a way to add it.
> **But the reality is that 75% of the people on our engineering team lost their jobs here yesterday because of the brutal impact AI has had on our business.** And every second I spend trying to do fun free things for the community like this is a second I'm not spending trying to turn the business around and make sure the people who are still here are getting their paychecks every month.
> **Traffic to our docs is down about 40% from early 2023 despite Tailwind being more popular than ever. The docs are the only way people find out about our commercial products, and without customers we can't afford to maintain the framework.** I really want to figure out a way to offer LLM-optimized docs that don't make that situation even worse (again we literally had to lay off 75% of the team yesterday), but I can't prioritize it right now unfortunately, and I'm nervous to offer them without solving that problem first.
> @PaulRBerg I don't see the AGENTS.md stuff we offer as part of the sponsorship program as anything similar to this at all — that's just a short markdown file with a bunch of my own personal opinions and what I consider best practices to nudge LLMs into writing their Tailwind stuff in a specific way. It's not the docs at all, and I resent the accusation that I am not disclosing my 'true intentions' here or something.
> @mtsears4 **Tailwind is growing faster than it ever has and is bigger than it ever has been, and our revenue is down close to 80%.** Right now there's just no correlation between making Tailwind easier to use and making development of the framework more sustainable. I need to fix that before making Tailwind easier to use benefits anyone, because **if I can't fix that this project is going to become unmaintained abandonware when there is no one left employed to work on it.** I appreciate the sentiment and agree in spirit, it's just more complicated than that in reality right now."

来源：<https://github.com/tailwindlabs/tailwindcss.com/pull/2388#issuecomment-3717222957>

**由此可确定的一手事实清单**：
| 事实 | 数值/表述 | 出处 |
|---|---|---|
| 裁员时点 | 2026-01-06（「lost their jobs here **yesterday**」，留言发布于 01-07） | Adam 一手留言 |
| 裁员比例 | **工程团队 75%**（4 名工程师裁 3 名） | Adam 一手留言 |
| 文档流量 | 相对 2023 年初 **下降约 40%** | Adam 一手留言 |
| 营收 | **下降接近 80%** | Adam 一手留言 |
| 因果链 | AI 让用户不再访问文档 → 文档是商业产品唯一曝光渠道 → 商业收入崩塌 → 无钱维护框架 | Adam 一手留言 |
| 公司剩余规模 | 二手来源称仅剩 3 位联合创始人与 1 名工程师（裁员前为 8 人） | `[二手]` <https://ppc.land/tailwind-css-lays-off-75-of-engineering-team-as-ai-impacts-revenue/> |

**同期其他一手表达**：
- Adam's Morning Walk 第 5 期「We had six months left」，2026-01-07，开场即「I just had to lay off some of the most talented people I've ever worked with and it fucking sucks.」`[一手]`（来源：<https://adams-morning-walk.transistor.fm/episodes/we-had-six-months-left>）
- 2026-02-18 Pragmatic AI 第 2 期逐字稿，Adam 补充：营收自 2023 年初 ChatGPT 出现起持续下滑；做完预测后发现只剩约六个月；「we had to lay off three of the four engineers on the team」`[一手]`（来源：<https://tighten.com/insights/pragmatic-ai-ep2-adam-wathan-ai-impact-on-open-source-funding/>）
- 2026-03-24 Startups For the Rest of Us 第 825 期，主题为「一次性买断模式」的经营教训与创始人状态 `[一手]`（来源：<https://startupsfortherestofus.com/episodes/episode-825-talking-tailwind-css-and-founder-fitness-with-adam-wathan>）

> **可交叉引用的维度**：本节内容同时支撑「公司经营」「开源可持续性」「AI 对创作者经济的冲击」三条线，建议与 02 维度（经营/商业模式）互为引用。

---

## 五、未核实项与存疑清单

| # | 事项 | 状态 | 说明 |
|---|---|---|---|
| 1 | Adam Wathan 的**出生年份 / 出生地** | **未找到** | 官方与一手来源均无。可确认的只是居住地：Ontario / Cambridge, Ontario, Canada。仅有第三方人物页称其「从小自学编程」，但无一提供出生年份，且第三方来源质量不足，不采纳 |
| 2 | Adam 2012 年及更早的公开活动 | **未找到** | 可追溯到的最早节点是 2013 年首场会议演讲 |
| 3 | 「Adam 早年反对 utility classes」这一说法 | **`[存疑]`** | 一手材料中**没有**他公开反对 utility classes 的言论。有据可查的是他从「组件类为主」转向「utility-first 作为架构哲学」。建议不写入结论 |
| 4 | **KiteTail 的定位** | **已更正** | 任务书猜测「用户调研工具」不准确。KiteTail 是 **webhook 驱动的结账即服务（checkout-as-a-service）SaaS**，2017 年启动，未上线即停，但 Tailwind 诞生于此 |
| 5 | **「Laravel Vessel」是 Adam 的项目** | **已更正** | Vessel 由 **Chris Fidao（fideloper）** 开发，属 shipping-docker 组织，与 Adam Wathan 无关 `[一手]`（来源：<https://github.com/shipping-docker/vessel/>）。Adam 在 Laravel 生态的实际开源作品是 **Laravel Valet**（2016-05，与 Taylor Otwell）与 **Jigsaw**（2015） |
| 6 | 《Refactoring UI》的**具体发售日** | 部分未找到 | 可确认月份为 **2018 年 12 月**（Adam 自述 + FSR 第 103 期 12-05 仍在预告「upcoming book」），具体日期未找到 |
| 7 | **Tailwind Labs Inc. 的注册/成立日期** | **未找到** | 「Tailwind Labs」作为团队名在 2020-09 播客中已使用；页脚版权为「Tailwind Labs Inc.」，但无公开注册日期 |
| 8 | **Headless UI 首次发布的准确日期** | 未找到 | 官方 v1.0 博文只说「Last fall（2020 年秋）」，无具体日 |
| 9 | Tailwind CSS **v1.0 的官方博客 URL** | 未找到 | tailwindcss.com 上 `/blog/tailwindcss-v1` 与 `/blog/tailwindcss-v1-0` 均返回 404；v1.0 的 2019-05-13 发布日以 Adam 复盘文章中引用的官方推文为准 |
| 10 | Steve Schoger 在 **2019-02-02 与 2019-03-06** 的 Laracon Online 演讲日期 | **`[存疑]`** | 其个人 Speaking 页同一场演讲出现两个日期，页面自身即存在不一致 |
| 11 | Steve 是否**随团队进入 Shopify** | **`[存疑]`（方向已明确）** | 官方公告由 Adam 署名、通篇未点名任何团队成员；Figmalion 第 260 期（2026-09-13）明确写「Adam Wathan **and Steve Schoger** are taking the Tailwind Labs to Shopify」。可判定「Steve 未离开 Tailwind Labs」，但「随团队加入 Shopify」只有一条二手表述，无官方一手确认 |
| 11b | 2026-01 裁员的**精确人数与被裁者身份** | 部分未找到 | Adam 一手只说「工程团队 75%」。ppc.land 称裁员前公司 8 人、裁员后剩 3 位联合创始人与 1 名工程师；**官方未公布名单，具体被裁者未找到**。另注意「8 人」与「3 位联合创始人」均为二手口径 |
| 12 | Steve 在最近 12 个月的**会议演讲 / YouTube 新视频** | **未找到** | 其 YouTube 频道与个人站均未检索到窗口内新内容；Ladybug 播客（2020）中他本人即表示「那些视频让我倦怠，我停更了」 |
| 13 | Steve 的**个人 GitHub 账号** | **`[存疑]`** | `github.com/steveschoger` 现为 Organization，非个人账号；其个人账号 handle 未定位 |
| 14 | Tailwind Plus **changelog 的公开访问** | 受限 | `tailwindcss.com/plus/changelog` 未登录会跳转登录页；Oatmeal 的 2025-12-18 日期来自 v4.3 博文的锚点链接与 Tailwind Weekly 的转述 |
| 15 | Adam 的**子女数** | 仅供参考 | 2026-02 播客中他自述「有三个孩子，第四个在肚子里，都在 8 岁以下」，属播客口述，随时间会变化，不建议作为稳定事实 |
| 16 | Tailwind CSS **v4.2 的公告博客** | 不存在 | 官方 v4.3 博文自述「apparently shipping v4.2 was easier than remembering to blog about it」。v4.2 的唯一一手日期来源是 GitHub release |

---

## 六、来源清单

### 一手来源（官方 / 本人 / API）

1. Tailwind CSS 官方博客 —「Tailwind Labs is joining Shopify」（2026-09-09）
   <https://tailwindcss.com/blog/tailwind-is-joining-shopify>
2. Tailwind CSS 官方博客 —「Tailwind CSS v4.0」（2025-01-22）
   <https://tailwindcss.com/blog/tailwindcss-v4>
3. Tailwind CSS 官方博客 —「Tailwind CSS v4.1」（2025-04-03）
   <https://tailwindcss.com/blog/tailwindcss-v4-1>
4. Tailwind CSS 官方博客 —「Tailwind CSS v4.3」（2026-05-08，含 v4.2 内容）
   <https://tailwindcss.com/blog/tailwindcss-v4-3>
5. Tailwind CSS 官方博客 —「Tailwind CSS v3.0」（2021-12-09）
   <https://tailwindcss.com/blog/tailwindcss-v3>
6. Tailwind CSS 官方博客 —「Tailwind CSS v2.0」（2020-11-18）
   <https://tailwindcss.com/blog/tailwindcss-v2>
7. Tailwind CSS 官方博客 —「Tailwind UI is now Tailwind Plus」（2025-03-04）
   <https://tailwindcss.com/blog/tailwind-plus>
8. Tailwind CSS 官方博客 —「Headless UI v1.0」（2021-04-14）
   <https://tailwindcss.com/blog/headless-ui-v1>
9. Tailwind CSS 官方 Partners 页（合作伙伴计划与名单）
   <https://tailwindcss.com/partners>
10. GitHub Releases API — tailwindlabs/tailwindcss（v4.1.0 / v4.2.0 / v4.3.0 / v4.3.3 日期）
    <https://api.github.com/repos/tailwindlabs/tailwindcss/releases/tags/v4.2.0>、<https://api.github.com/repos/tailwindlabs/tailwindcss/releases/tags/v4.3.0>
11. Adam Wathan 个人站首页 / Projects / Talks / Journal
    <https://adamwathan.me/>、<https://adamwathan.me/projects/>、<https://adamwathan.me/talks/>、<https://adamwathan.me/journal>
12. Adam Wathan —「Tailwind CSS: From Side-Project Byproduct to Multi-Million Dollar Business」（2020-08-02）
    <https://adamwathan.me/tailwindcss-from-side-project-byproduct-to-multi-mullion-dollar-business>
13. Adam Wathan —「Going Full-Time on Tailwind CSS」（2018-12-28）
    <https://adamwathan.me/going-full-time-on-tailwind-css/>
14. GitHub API — 用户资料
    <https://api.github.com/users/adamwathan>、<https://api.github.com/users/steveschoger>
15. Full Stack Radio（官方播客站）
    <https://fullstackradio.com/>、<https://fullstackradio.com/1>、<https://fullstackradio.com/74>、<https://fullstackradio.com/103>、<https://fullstackradio.com/123>、<https://fullstackradio.com/147>、<https://fullstackradio.com/148>、<https://fullstackradio.com/153>
16. Refactoring UI 官方网站
    <https://refactoringui.com/>
17. Steve Schoger 个人站（首页 / Projects / Speaking / Interviews）
    <https://www.steveschoger.com/>、<https://www.steveschoger.com/projects/>、<https://www.steveschoger.com/speaking/>、<https://www.steveschoger.com/interviews/>
18. ui.sh 官方网站与 Changelog（2026-03-05 首发、2026-06-10 重组）
    <https://ui.sh/>、<https://ui.sh/changelog>
19. Adam's Morning Walk —「We had six months left」（2026-01-07）
    <https://adams-morning-walk.transistor.fm/episodes/we-had-six-months-left>
20. Pragmatic AI（Matt Stauffer）第 11 期 — Steve Schoger（2026-04-15）
    <https://pragmaticai.fm/episodes/creating-ai-workflows-for-designers>
21. **GitHub PR #2388 及其评论 API（2026-01 裁员一手证据）** — 含 Adam Wathan 本人两条留言原文
    <https://api.github.com/repos/tailwindlabs/tailwindcss.com/issues/2388>、<https://github.com/tailwindlabs/tailwindcss.com/pull/2388#issuecomment-3717222957>、<https://github.com/tailwindlabs/tailwindcss.com/pull/2388#issuecomment-3715074726>
22. Startups For the Rest of Us 第 825 期官方节目页 — Adam Wathan（2026-03-24）
    <https://startupsfortherestofus.com/episodes/episode-825-talking-tailwind-css-and-founder-fitness-with-adam-wathan>

### 二手来源（媒体 / 会议页 / 播客 / 社区通讯）

23. Pragmatic AI 第 2 期逐字稿 — Adam Wathan 谈 AI 与开源资助（Tighten，2026-02-18）
    <https://tighten.com/insights/pragmatic-ai-ep2-adam-wathan-ai-impact-on-open-source-funding/>
24. Ladybug Podcast 第 24 期逐字稿 — Steve Schoger「Design for Developers」（2020-01-20，职业史主要依据）
    <https://raw.githubusercontent.com/ladybug-podcast/ladybug-website/master/transcripts/24-design-for-developers.md>
25. The Laravel Podcast 第 17 期 — Steve Schoger 专访（2019-02-08）
    <https://laravelpodcast.com/episodes/89e3758b>
26. SmashingConf New York 2022 讲师页 — Steve Schoger（「designer and partner at Tailwind Labs」）
    <https://smashingconf.com/ny-2022/speakers/steve-schoger>
27. Tailwind Weekly 第 201 期（2026-01-10）— 裁员与 Oatmeal
    <https://tailwindweekly.com/issue-201/>
28. Tailwind Weekly 第 230 期（2026-09-12）— Tailwind 加入 Shopify 后的商业侧变化
    <https://tailwindweekly.com/issue-230/>
29. **Figmalion 第 260 期（2026-09-13）** — 唯一将 Adam 与 Steve 并列写入 Shopify 事件的来源
    <https://figmalion.com/issue/260>
30. PPC Land（2026-01-08）— 裁员与营收数据的媒体侧整理（用于对照，非一手）
    <https://ppc.land/tailwind-css-lays-off-75-of-engineering-team-as-ai-impacts-revenue/>
31. shipping-docker/vessel — 用于**更正**「Vessel 是 Adam Wathan 项目」的说法
    <https://github.com/shipping-docker/vessel/>
32. Yo! Podcast 第 005 期（Steve Schoger，2019-05-15）— 籍贯 Kitchener, Ontario
    <https://smashnotes.com/p/yo-podcast/e/005-steve-schoger-designer-refactoring-ui-co-author>
33. LinkedIn — Adam Wathan（CEO at Tailwind Labs；Cambridge, Ontario）
    <https://www.linkedin.com/in/adam-wathan-9418984a>
34. Startups For the Rest of Us 第 825 期（feed 平台镜像，用于交叉验证日期）
    <https://www.listennotes.com/podcasts/startups-for-the/episode-825-talking-tailwind-OUAwvmjMB-0/>

### 未采用来源（黑名单，已规避）

知乎、微信公众号、百度百科、百度知道 —— 本次调研全程未采用。

---

## 七、可信度自评与建议

- **高置信区间（可直接引用）**：Tailwind CSS 各版本发布日期、Tailwind UI → Tailwind Plus 更名、Tailwind Labs 加入 Shopify、**2026-01-06 裁员 75% 及配套财务数据（Adam 在 GitHub PR #2388 的一手留言）**、ui.sh 三次关键节点、Refactoring UI 的 2018-12 发布、《Going Full-Time on Tailwind CSS》2018-12-28、Full Stack Radio 首期 2014-10-18。
- **中等置信区间（建议注明）**：Steve 的早年经历（来自其本人口述播客，细节准确但无书面一手材料）、两人合作的具体分工模式（来自口述）、Steve 随团队加入 Shopify（仅 Figmalion 一条二手）。
- **不建议采用**：Adam 的出生年份、2012 年及更早活动、「Adam 曾反对 utility classes」、「Vessel 是 Adam 的项目」、Steve 已离开 Tailwind 的任何说法。
- **最大的防过时价值点（两条，务必写进下游结论）**：
  1. **2026-01-06 Tailwind Labs 裁员 75%**，一手原因是 AI 让文档流量较 2023 年初下降约 40%、营收下降接近 80%。这推翻了「Tailwind 很成功所以公司很赚钱」的直觉叙事。
  2. **2026-09-09 Tailwind Labs 加入 Shopify，并主动终止商业产品新注册**。这推翻了绝大多数 2026 年 9 月之前写成的「Tailwind 商业化」叙述。
  任何引用旧资料的专家视角蒸馏，都必须以这两条为准。
