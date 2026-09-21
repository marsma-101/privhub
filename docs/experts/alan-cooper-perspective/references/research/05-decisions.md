# 05 · 重大决策与转折点

> 本文件梳理 Alan Cooper（1952- ）一生中可考的重大决策与转折点，共 **10 条**，每条统一按「背景 / 他的逻辑 / 行动 / 结果 / 事后反思 / 来源」六段结构。
> 可信度标注：**[一手]**＝Cooper 本人自述、原话、访谈原文、其本人署名文章；**[二手]**＝他人记述、机构条目、新闻报道、史书式整理；**[推断]**＝本文件依据已有材料作出的推论，非任何来源原话。
> **矛盾保留原则**：同一事件存在多种说法时全部列出，并注明哪一方来源更可靠，不擅自择一定论。
>
> 检索环境说明：本次调研中 `en.wikipedia.org`、`web.archive.org`、`mralancooper.medium.com`（Cooper 本人 Medium 博客正文页）、`academia.edu`、`infoq.com` 正文页均**无法抓取**（DNS 解析至非公网地址 / 连接失败 / Cloudflare 拦截）。凡是引用这些站点内容的条目，一律依赖**可抓取的镜像、转载全文、检索索引残留文本**或**已公开的其他站点转引**，并在该条下逐条注明。「未找到一手来源」处绝不补空。

---

## 0. 时间线速览（用于定位，非结论）

| 年份 | 事件 | 本文件条目 |
|---|---|---|
| 1952 | 生于旧金山，Marin County 长大，高三辍学 | — |
| 1976 | 与合伙人创办 Structured Systems Group（SSG） | — |
| 1981 | 因与合伙人分歧离开 SSG，创办 Access Software | — |
| 1981–1982 | 加入 Gary Kildall 的 Digital Research，任 R&D 主管，约一年半后离职 | — |
| 1983 | 独立开发 SuperProject（后成为 Computer Associates 产品），卖给出版商 | 决策 4（前史） |
| 1985 | 看到 Xerox Star 演示，开始研究替代 Windows GUI shell | 决策 1 |
| 1985/86 | 在微软技术大会看到 Windows 的 DLL 机制，认定「市场机会」 | 决策 1 |
| 1987 末 | 随友人在 Bank of America 销售拜访中顿悟「shell construction set」 | 决策 1 |
| 1987 末 | 向 Adobe、Lotus 等出版商兜售 Tripod，均被告知「去找微软」 | 决策 1 |
| 1988.3 | 在 Redmond 向 Bill Gates 演示 Tripod；Gabe Newell 做初筛 | 决策 1 |
| 1988 | 微软买下 Tripod，项目代号 Ruby；Cooper 团队以 Cooper Software 名义承接重写 | 决策 1 |
| 1989.8 | Ruby 与 Embedded Basic 合流，项目代号 Thunder | 决策 1 |
| 1990 初 | 重写版交付微软 golden master；同一时期 Ruby 被踢出 Windows 3.0 构建 | 决策 1、决策 2 |
| 1991.5 | Visual Basic 1.0 正式发布 | 决策 1 |
| 1991–1992 | Ruby 合约期结束；尝试第四次独立软件产品失败；决定彻底停止写代码 | 决策 2、决策 3 |
| 1992 | 与妻子 Sue 共同创办 Cooper（初名 Cooper Software，后简称 Cooper） | 决策 3 |
| 1995 | 《About Face》首版出版；在 Sagent Technologies 项目中创造 Chuck / Cynthia / Rob | 决策 3、决策 4 |
| 1995 | Bill Gates 授予首批 Windows Pioneer 奖（共七人） | 决策 1 |
| 1998 | 获 Silicon Valley Forum Visionary Award | — |
| 1999 | 《The Inmates Are Running the Asylum》出版 | 决策 5 |
| 2000 | 互联网泡沫破裂，Cooper 从约 70 人裁到 7 人，Sue 接手救回公司 | 决策 7 |
| 2002.1 | 与 Kent Beck 就 XP vs 交互设计公开对谈 | 决策 6 |
| 2002 | 创办 Cooper U 培训（口径见决策 7 的矛盾说明） | 决策 7 |
| 2008.3 | ESRI Developer Summit 主题演讲，公开抨击敏捷与开源 | 决策 6 |
| 2011 | 迁居 Petaluma 的 50 英亩旧奶牛场「Monkey Ranch」 | 决策 9 |
| 2015.9 | 收购纽约 Catalyst Group，形成旧金山 45 人＋纽约 15 人 | 决策 7 |
| 2017.3 | 接受 Computer History Museum 口述史访谈（Hansen Hsu 主持） | 决策 1、决策 2 |
| 2017.4 | 获 CHM Fellow（表彰 Visual Basic 与交互设计开创性工作） | — |
| 2017.10 | Cooper 被 Wipro Digital 收购，并入 Designit（约 850 万美元） | 决策 7 |
| 2018.9 | 《Be a Good Ancestor》播客访谈，系统回应「设计师该不该写代码」 | 决策 8 |
| 2019.8.16 | 发表《A new chapter》宣布退休 | 决策 9 |
| 2020.5.29 | Cooper Professional Education 宣布关闭 | 决策 7 |
| 2022.11 | 接受 Wipro 采访，谈「为坏的技术与设计行为建立分类学」 | 决策 9 |
| 2026.9 | 仍在 Hachyderm（Mastodon）高频发帖 | 决策 9 |

---

## 决策 1 · 创造 Tripod／Ruby 并把它卖给微软，而非自己推向市场（1985–1991）

### 背景

1985 年前后，Cooper 的营生是「写软件、卖给出版商」。他此前已做出 SuperProject（关键路径项目管理工具）和 Microphone II（Windows 上第一个串口通信程序）。

1985 年他看了 Xerox Star 工作站的演示，随后发现 Windows 的 shell（用户见到的图形界面外壳）是 MS-DOS Executive——用他自己的话说：

> "It was a program called MSDOS.exe and it was very clear that somebody had written it in a weekend."
> 「那程序叫 MSDOS.exe，一眼就看得出来是有人用一个周末写出来的。」——**[一手]**（Retool 长篇史《Something Pretty Right》引 Cooper 访谈原话）

他同时看中了 Windows 的 **DLL**（动态链接库）机制：

> "Might as well have had a neon sign saying, 'Market Opportunity.' And it just really intrigued me. So I started saying, 'Okay, I'm going to build a shell.'"
> 「那简直像挂了块霓虹灯招牌写着『市场机会』。它真的勾住了我。于是我对自己说：好，我来做一个 shell。」——**[一手]**

真正的转折点是 1987 年末。一位在微软的朋友带他参加对 Bank of America 某 IT 经理的销售拜访，对方说：他要让银行全员都能用 Windows——从高度技术化的系统管理员、半技术化的分析师，到完全不懂电脑的出纳。

> "In an instant, I perceived the solution to the shell design problem: it would be a shell construction set—a tool where each user would be able to construct exactly the shell that they needed for their unique mix of applications and training. Instead of me telling the users what the ideal shell was, they could design their own, personalized ideal shell."
> 「一瞬间，我看清了 shell 设计难题的解法：它应该是一套 shell 建构套件——一个让每个用户为自己那一堆独特应用和不同训练水平，造出恰好所需 shell 的工具。不是我告诉用户理想 shell 是什么，而是用户自己设计出个性化的理想 shell。」——**[一手]**

### 他的逻辑

- **产品定位是「外壳」，不是「编程语言」**。Tripod 是 "shell construction set"（shell 建构套件），核心比喻是「用户自己造自己的外壳」。表单设计器只是实现手段。
- **卖给微软而不是自己发**，是因为他判断微软有他够不到的渠道。这句权衡是他自己在回顾里给出的：

> "Had Ruby gone to the market as a shell construction set it would have made millions of people happier, but then Visual Basic made hundreds of millions of people happier."
> 「如果 Ruby 当初以 shell 建构套件的形态上市，它会让几百万人更快乐；但 Visual Basic 让几亿人更快乐。」——**[一手]**（Cooper 本人回顾，转引见 EvilGeniusLabs 整理）

### 行动

1. 用 C 写了约 **25,000 行** Tripod，目标平台是 Windows 2.x 的 Win16 API。表单上拖放按钮、列表等控件，靠事件模型驱动（`Form_Load` / `Button_Click` 这套模式在微软见到它之前就已经存在）。
2. 他给这些控件起名 "waldos"（取自海因莱因的远程机械臂）；程序员 Michael Geary 觉得没道理，改叫 "gizmos"；微软后来改称 "controls"，沿用至今。
3. 1987 年末先找 Adobe、Lotus 等出版商，每家都说「这很酷，你为什么不拿给微软看」。他起初抗拒（微软自己在做同类东西），最终让步。
4. 初筛演示由 **Gabe Newell**（1988 年仍在微软，1996 年离职创办 Valve）看。原定半小时，五分钟后 Newell 把椅子往后一推："Bill's got to see this."
5. Cooper 回家「像一只发狂的编程黄鼠狼」（"like a crazed coding weasel"，**[一手]** 自述）猛写一个月，补足功能。
6. 1988 年 3 月，Redmond 董事会会议室，Gates 与十来个微软人。Cooper 演示拖控件、连行为、跑出真正的 Windows 程序。名场面两处：

> Gates: "How did you do that?" Cooper: "It's magic, Bill."
> Gates 转头对随行团队："Why can't we do stuff like this?"——**[一手]**（多份 Cooper 回顾中共有的两处对白）

7. Gates 不要第二次会，直接要报价。微软买下 Tripod，项目改名 **Ruby**。交易结构是让 Cooper 团队保持完整、以 **Cooper Software** 名义做外部承包商重写，而非并入微软正式员工。
8. 重写耗时 **18 个月**，1990 年初交付 golden master。**微软并未发布 Tripod**：原 25,000 行 Tripod 代码被整体丢弃，1991 年 5 月面世的是 Ruby 与另一条内部线 Embedded Basic 合流后的 Thunder，即 Visual Basic 1.0。

### 结果

- **商业与声誉**：Visual Basic 成为有史以来最成功、使用最广的编程环境之一；Cooper 因此得到「Visual Basic 之父」称号。冠名权是他**主动争来的**：CHM 记载，他与 Gates 谈的合同里要求微软宣传他是 VB 的创造者；微软中层一度想抹掉他的存在，最终 `About Box` 里写进了 "Cooper Software, Inc."（不写 Alan 本人），之后又被删掉。写第一本 VB 书的 Mitchell Waite 看到了这行署名，联系上 Cooper，书中称他为 "Father of Visual Basic"。Cooper 后来直接打电话给 Gates 要求履约，微软随后给了他一个贡献奖。
- **技术遗产的归属**：VBX 自定义控件接口（Geary 设计）、事件模型概念、表单设计器范式都源自 Tripod/Ruby 血脉，但**没有一行 Tripod 代码直接进入 VB 1.0**。VB 团队当时的开发负责人 Scott Ferguson 就「代码占比是否达到 15%」这一署名门槛的说法值得完整引用：

> "Given that the forms engine was roughly a third of the product and the recognizable parts of Ruby remaining there were surely less than half of that I might have said 'no.' But I offered that rounding up seemed fair, given that VB would likely not have happened at all if it were not for Ruby being thrust upon us."
> 「考虑到表单引擎约占产品三分之一，其中可辨认的 Ruby 残留肯定不到一半，我本可以说『没有』。但我提出，向上取整是公平的——因为若没有 Ruby 被塞到我们手上，VB 很可能根本不会发生。」——**[一手]**（Scott Ferguson, "The Birth of Visual Basic"，VB 团队开发主管自述）

- 随后 Ruby 转任 VB，与微软内部就「Ruby 是否应作为 Windows 3.0 的 shell」的失败博弈有关（见决策 2）。

### 事后反思

1. **他反复讲的是取舍，不是后悔**：卖出换来了百倍规模的用户触达。
2. **他的批判对象是行业与资本结构，不是 VB 这个产品**。任务书提到的「给不会编程的人一把枪」这一框架，**本次调研未找到可核验的一手原话**。Cooper 公开材料中最接近的表述是 2016 年他对 Atomic Object 说的「我们给这些不是我们朋友的人递上了上了膛的武器」——但那句话说的是**大型科技公司**，不是 VB（见决策 10 引用）。
3. **一个必须点明的落差**：大众印象里 Cooper 对 VB 感情复杂，但本次可核验材料中**没有任何一处**显示他公开表达过对 VB 本身的悔意或羞耻。他讲的一直是「卖掉换来了更大的用户规模」这笔账。**不代他立论，也不替他补一句他没说过的话。**

### 来源

- Retool, *Something Pretty Right: A History of Visual Basic*, https://retool.com/visual-basic —— **[一手]**（大段直接引用 Cooper 访谈原话，2019 年成文）
- EvilGeniusLabs, *Alan Cooper and Tripod (1985–1988)*, https://evilgeniuslabs.ca/books/visual-basic-history/origins/vb-history-alan-cooper-and-tripod —— **[二手]**（系统性史书式整理，逐条标注其一手出处；文中明确大量引用 IEEE Annals 2020 口述史）
- Computer History Museum, *2017 CHM Fellow Alan Cooper: Father of Visual Basic*, https://computerhistory.org/blog/2017-chm-fellow-alan-cooper-father-of-visual-basic/ —— **[二手]**（机构史述，作者 Hansen Hsu 为 CHM 软件史中心策展人，即 Cooper 口述史的访谈者）
- Computer History Museum, *Alan Cooper* 个人页, https://computerhistory.org/profile/alan-cooper/ —— **[二手]**
- Scott Ferguson, *The Birth of Visual Basic*, http://www.forestmoon.com/birthofvb/birthofvb.html —— **[一手]**（VB 团队一号开发主管的第一人称记述，与 Cooper 视角互补且部分冲突，见下）
- Cooper 本人《Why I am called "the Father of Visual Basic"》（原 cooper.com/alan/father_of_vb.html 已下线，仅存 web.archive.org 副本，本环境不可抓取）——**[一手]**，**本次未能直接读取原文**，内容仅通过二手转引间接使用

---

## 决策 2 · 离开微软／彻底停止写代码（1988–1992）

> **本条目是全文矛盾最集中的一处。至少四种说法并存，本文件全部保留，不选一个当定论。**

### 背景

1988 年交易后，Ruby 的定位是「Windows 3.0 的 shell」，若成立，将直接被数千万人开机即见。但 Windows 团队最终否决了它。

### 他的逻辑／事实经过（Cooper 版本，含矛盾点）

**说法 A：产品被内部政治扼杀，他因此出局（Cooper 2020 年口述史版本）**

Cooper 在 2017 年 3 月 13 日接受 CHM 的 Hansen Hsu 口述史访谈（发表于 *IEEE Annals of the History of Computing* 2020 年 10–12 月号），首次把「扼杀机制」放到自己视角的公开记录里：

> "Microsoft was fighting with IBM, who was their big patron at the time. And Windows was actually not a strategic product for Microsoft. OS/2 was the strategic product... and it was the B-team was working on Windows. ... so the shell construction set, they said, 'Look, you have to be able to be identical to the OS/2 shell.' And I said, 'Well, look, you can build the OS/2 shell from scratch in about ten minutes using Ruby.' They said, 'Is it keystroke for keystroke identical, and pixel for pixel identical?' And I said, 'Well, it's close!' Well, okay, that was just enough of a beachhead that they could point to it and say, 'This won't work.' And so they kicked it out of the build."
> 「微软当时在和 IBM 打仗，IBM 是他们的大金主。而 Windows 对微软来说其实不是战略产品。OS/2 才是战略产品……Windows 是 B 队在做的。……于是他们说：『这个 shell 建构套件必须能和 OS/2 shell 一模一样。』我说：『用 Ruby 从零搭一个 OS/2 shell 大概十分钟就够了。』他们说：『是逐键一致、逐像素一致吗？』我说：『呃，很接近！』好——这就足够给他们一个立足点说『这不行』。于是他们把它踢出了构建。」——**[一手]**（IEEE Annals 口述史，p.107）

他还进一步解释 Gates 那句「Why can't we do stuff like this?」的真实效果：

> "I had no idea how wrong that was, but I learned later. ... what he was doing was he was making all those guys at the table hate me. You know? Because, you know, I showed them up really badly."
> 「我当时完全不知道那句话有多糟，后来才明白。……他做的是让桌边那帮人全都恨我。因为我让他们当众非常难堪。」——**[一手]**（同上，p.107）

并记录了赎回尝试：

> "I flew back up to Seattle and met with Bill and I said, 'Will you sell it back to me? 'Cause I'll release it myself. I'll publish it myself as a shell construction set for Windows.' And he thought about it and he said, 'No.' I had no leverage, and he figured he could do something with it. So I came back home and I tried to start a company, and of course, I was seriously nondisclowered."
> 「我飞回西雅图见 Bill，说：『你能卖回给我吗？我自己发行，作为 Windows 的 shell 建构套件自己出版。』他想了想说：『不。』我没有筹码，他估计自己能拿它做点什么。于是我回家试着创业——当然，我被 NDA 捆得死死的。」——**[一手]**（同上）

**说法 B：合约到期，合作自然结束（合同事实版本）**

- Cooper Software 承接 Ruby 重写的合约期是 **1988–1990**。CHM 明确写：「Cooper 与 Visual Basic 的关系在他 1988 年把 Ruby 原型交付微软后就结束了，比产品发布早了两年。」
- 重写的开发主管 Scott Ferguson 也从微软一侧确认了时间边界：Ruby 与 EB 在 1989 年 8 月合流为 Thunder，1990 年 5 月 Windows 3.0 发布（Ruby 不在其中），1991 年 5 月 VB 1.0 发布。
- **这一条与说法 A 不冲突**：合约到期是事实层面，产品被踢出构建是原因层面，两者可以并存。

**说法 C：他主动选择放弃编程（CHM 的叙事版本）**

> "Although his attempt to do this at Digital Research failed, after successfully selling Visual Basic, but failing to sell a fourth independent software product, Alan decided to give up programming for good, starting the Cooper design consultancy with his wife Sue in 1992."
> 「尽管他在 Digital Research 试图『只做设计不写代码』的尝试失败了，但在成功卖出 Visual Basic、又没能卖出第四个独立软件产品之后，Alan 决定永远放弃编程，并于 1992 年与妻子 Sue 一起创办了 Cooper 设计顾问公司。」——**[二手]**（CHM 博文）

**说法 D：他不满微软对待设计／程序员的方式（理念版本）**

- 他从未以「对微软不满」为离开的公开理由。相反，他把矛头指向**整个行业把设计与实现混为一谈**这件事。2016 年他对 Graphic Mint 说的是「砖瓦匠 vs 画线的人」的比喻（见决策 3），而不是「微软对我不好」。
- **[推断]** 「因不满微软对待设计的方式而离开」这一流传说法，是本文件在中文与英文二手材料中**反复见到但找不到一手支撑**的一条。Cooper 的一手叙述里，微软内部政治的直接后果是**Ruby 这个产品**被毁，不是他本人「愤而离职」。二者常被混为一谈。

### 行动

1. 1988–1990 以 Cooper Software 名义完成 Ruby 重写并交付。
2. 尝试赎回 Ruby 被 Gates 拒绝，随后被 NDA 挡住两年。
3. 1991 年 VB 1.0 发布时，他仍受原合约约束，**无法公开讲话**（EvilGeniusLabs 整理）。
4. 放弃第四个独立软件产品，1992 年与 Sue 共同创办设计顾问公司。

### 结果

- **他没有成为 VB 的持续参与者**：VB 1.0 的工程实现由微软的 Thunder 团队完成，Cooper 的名字靠合同条款与 Mitchell Waite 的书才被行业记住。
- 他转入了当时**尚不存在的职业**——交互设计顾问。这个转身的规模，比「离开微软」这一个动作大得多。

### 事后反思

- 他对这段最著名的一句反思是关于**自己演示的方式**，而非微软的背叛：

> **[推断]** 口述史里那句「他做的是让桌边那帮人全都恨我」，性质上是**对自身行为后果的承认**，不是对微软的控诉。这是他公开材料里少见的自省段落。

- 他从未公开说过「我后悔卖了 VB」。能找到的最接近的表述是那句**权衡句**（见决策 1）："if Ruby had gone to the market as a shell construction set it would have made millions of people happier, but then Visual Basic made hundreds of millions of people happier."——**这是一句取舍，不是一句悔恨。**

### 来源

- **IEEE Annals of the History of Computing, "Oral History of Alan Cooper"**, 访谈人 Hansen Hsu，2017-03-13 于 Petaluma，2020 年 10–12 月号，19 页，DOI 10.1109/MAHC.2020.3033744 —— **[一手]**（全库最关键的单一文献）。**本次未能直接抓取**（academia.edu 403、DOI 页不可达），所有引文通过 EvilGeniusLabs 的系统性转引获得，页码标注（p.107）沿用其转引。**引用时请注意这一层间接性。**
- CHM 博文（同决策 1）——**[二手]**，提供说法 B 与说法 C
- Scott Ferguson, *The Birth of Visual Basic* —— **[一手]**（微软一方的技术时间线）
- EvilGeniusLabs, *Alan Cooper and Tripod (1985–1988)* —— **[二手]**（一手引文的整理者）
- **未找到一手来源**：Cooper 本人明确说「我因为不满微软对待设计的方式而离开」的原话。该说法在二手材料中流传，本文件不予采信为事实。

---

## 决策 3 · 1992 年创办 Cooper：从写代码转向做设计咨询

### 背景

1990 年代初，软件行业快速整合。**当时不存在「交互设计师」这个职业**——没有职位、没有课程、没有会议、没有职称。

Cooper 自己的说法是：

> "In the 1980s, I stopped programming. There was no such thing as a software designer or an interaction designer. So in 1992, I put myself out there as a 'designer for hire.' I had only ever created and sold software. Now I was saying I was a designer who you could hire as a consultant and pay by the hour. And to my surprise, a few companies actually took me on."
> 「1980 年代我停止了编程。那时候没有软件设计师或交互设计师这种东西。所以 1992 年，我把自己投出去，做『按小时雇的设计师』。我此前只做过一件事：创造软件并把它卖掉。现在我说自己是设计师，你可以按顾问时薪雇我。让我惊讶的是，真有几家公司要了我。」——**[一手]**（Graphic Mint 访谈，2016-06-30）

关于创办公司的具体触发，夫妻二人有两个互补版本，都保留：

**Cooper 版本**（同一访谈）：

> "One day, the workload got too much. I suggested to my wife Sue that she join me at work for a day. She did. After work, we shared a glass of wine, and I asked her what she thought. She said, 'this is a business.'"
> 「有一天工作量太大了。我建议妻子 Sue 跟我上一天班。她来了。下班后我们喝了杯酒，我问她怎么看。她说：『这是一门生意。』」

**Sue 版本**（Narrative《Cashing Out》访谈）：

> "Alan: Because I couldn't get a job (laughs).
> Sue: He couldn't get a job. And then I stepped in, 'Okay, well, I guess we're going to have to do this on our own.' Alan had this passion for separating design from building it. He hung his shingle out saying, 'I'm going to do this consulting thing for design consulting, no programming,' and got three clients right away."
> 「Alan：（笑）因为我找不到工作。
> Sue：他找不到工作。然后我介入了：『好吧，那我们只好自己干了。』Alan 对『把设计从建造中分离出来』这件事有强烈的执念。他把招牌挂出去说：『我要做设计咨询，不写程序』，马上就有了三个客户。」——**[一手]**（两人共同受访）

### 他的逻辑

核心比喻是建筑：

> "In college, I wanted to be an architect. An architect takes a pen and draws a line on a page. The builder does the hard work of placing the bricks. And programming got to the point where it felt like brick laying. I wanted to draw the line."
> 「大学时我想当建筑师。建筑师拿笔在纸上画一条线。施工方去做搬砖的苦活。而编程慢慢变成了搬砖。我想画那条线。」——**[一手]**（Graphic Mint，2016）

他更早就有过这个念头。CHM 记载，1982 年他在 Digital Research 时曾要求「脱离编程，只做设计、规格与产品规划」，但被 DR 总裁推翻，18 个月后离职。**1992 年是他第二次尝试同一件事，这次他自己当老板。**

方法论动机来自一个自我追问：

> "I asked myself a fundamental question, which is 'how did I invent that software, did I do it because I was just a clever guy having clever ideas or was I actually using a system, and if I was using a system, what is it, what was it and can it be systematised and understood and taught, transferred to other people?'"
> 「我问自己一个根本问题：我当初是怎么发明那些软件的？是因为我只是个有点子的聪明人，还是我其实在用一套系统？如果在用系统，那系统是什么？能被系统化、被理解、被教会、被传给其他人吗？」——**[一手]**（UXpod 访谈，2006-12）

### 行动

1. 挂出「只做设计咨询、不写程序」的招牌，开张即得三个客户。
2. Sue 负责后端（公司设立、合同），他说「我负责前面，她负责后面」。
3. 雇第一位设计师。人第一天到**家里**上班，孩子跑来跑去，夫妻俩对看一眼：「哦，我们得有个办公室。」
4. 之后的路径（Sue 自述）：咨询 + 写书 + 教学「三件事绑在一起」，于是有了 Cooper U。
5. 1995 年出版《About Face: The Essentials of User Interface Design》，把公司方法论固化下来。

### 结果

- **公司存在 25 年**（1992–2017），成为第一家交互设计咨询公司，员工规模峰值约 70 人（Sue 口径）／50 人左右（2017 年出售时口径：旧金山 45 人＋纽约 15 人）。
- **职业被创造出来**：

> "Over the first few months, something shifted in my head, and I saw a viable profession. I knew that this was something that kids in the future would call themselves. I didn't know what it was going to be called, but I knew it was going to be a thing. I knew it would be a discipline with rules, and best practices, and conferences."
> 「头几个月里我脑子里发生了转变，我看到了一门可成立的职业。我知道未来的孩子们会用这个称呼自己。我不知道它会被叫作什么，但我知道它会成为一件事，会成为一门有规矩、有最佳实践、有会议的学科。」——**[一手]**（Graphic Mint，2016）

- Cooper 公司的设计师后来散入 Apple、Google、Facebook 等公司，成为 UX 领域的种子（CHM 语）。

### 事后反思

- 他对「第一个做这件事」的评价是罕见的自我克制：

> "People think I'm a great interaction designer. The truth is, I'm okay. Others are much better than me. One thing I did do was realise that the practice of interaction design needed to exist. I saw that ten years before other people did."
> 「人们以为我是很棒的交互设计师。事实是，我还行，很多人比我好得多。我确实做了一件事：我意识到交互设计这门实践必须存在。这一点我比其他人早看到十年。」——**[一手]**（Graphic Mint，2016）

- 2016 年他对公司规模化的评价转向批判：一旦公司超过 100–150 人就会变质，职业经理人进来，只在乎赢而不是双赢（见决策 7）。

### 来源

- Graphic Mint, *UX Leadership – The Alan Cooper Interview*, https://graphicmint.com/ux-leadership-the-alan-cooper-interview （2016-06-30，UX Lisbon 主题演讲后一对一访谈）—— **[一手]**
- Narrative, *Cashing Out* · *Conversations: Sue and Alan Cooper*, https://www.wonderfulnarrative.com/books/cashing-out/a-conversation-with-sue-and-alan-cooper —— **[一手]**（夫妻共同受访，2022 年前后）
- UXpod, *Personas and outrageous software: an interview with Alan Cooper*, https://uxpod.com/episodes/personas-and-outrageous-software-an-interview-with-alan-cooper.html （2006-12）—— **[一手]**
- CHM 博文与个人页 —— **[二手]**
- UXmatters, *Cooper and Cooper U, Part 1*（2015-09-21）—— **[二手]**（确认 1992 年共同创办、Cooper U 于 2002 年成立）

---

## 决策 4 · 发明 persona：从「自言自语」到方法论（1983 / 1995）

> **本条目需处理一个常见混淆：「Kathy」与「Chuck/Cynthia/Rob」的关系。两套时间线并存，本文件全部列出。**

### 背景

**前史（1983）**：Cooper 独立开发 SuperProject（当时的项目名 Plan\*It）。编译一次要一个多小时，他每天午饭后到办公室旁的 Old Del Monte 高尔夫球场散步，在散步中做设计。他自己的记述：

> "As I walked, I would engage myself in a dialogue, play-acting a project manager, loosely based on Kathy, requesting functions and behavior from my program. I often found myself deep in those dialogues, speaking aloud, and gesturing with my arms. Some of the golfers were taken aback by my unexpected presence and unusual behavior, but that didn't bother me because I found that this play-acting technique was remarkably effective for cutting through complex design questions."
> 「我一边走一边和自己对话，扮演一位项目经理——大致以 Kathy 为原型——向我的程序提出功能和行为要求。我常常陷得很深，大声说话，手臂比划。有些球手被我的突然出现和古怪举止吓到，但那不困扰我，因为我发现这种扮演技巧在切开复杂设计问题上极其有效。」——**[一手]**（Cooper, "The origin of personas"，2008-05-15）

**真正的转折（1995）**：他在 Sagent Technologies 做交互设计。这家公司三位创始人都是做 BI（商业智能）的，产品尚未发布。Cooper 让他们举一个「某人会如何使用这个程序」的具体例子，得到的回答永远是同一套：

> "'Well, someone could create a crosstab of sales information… but it could be a chart, or if it were marketing data they could present it as a table. They could do anything!' It was almost impossible for those brilliant, logical programmers to conceive of a single use of their product when it was obviously capable of so many uses. In frustration I demanded to be introduced to their customers."
> 「『嗯，有人可以做一个销售信息的交叉表……但它也可以是图表，如果是营销数据还可以做成表格。他们什么都能做！』对那几位聪明、逻辑极强的程序员来说，几乎不可能设想出产品的任何一个具体用法——而这产品显然能支持极多用法。我被逼急了，要求他们把我引见给他们的客户。」——**[一手]**（同上）

### 他的逻辑

**为什么用具体人名，而不是「用户」？**

1. **「用户」这个词是空洞的，且天然偏向工程师的自我投射**。他在 2006 年把三种错误路径列得很清楚：

> "One is to say, 'well I'm a user, so I'll just do what I want'. Well that doesn't work – that just gives you what works for engineers, because that's called self-referential design and it doesn't work.
> The other one is to say 'well, we'll go out and we'll ask all of our potential users what they want and we'll just put it all in the product' and I call this the sum of all desired features... that doesn't work either. It can create competent software but it always creates unloved software.
> The third way is to say 'well, we'll just go out and we'll get one person and give them what they want'... And none of those approaches work very well."
> 「一是说『我自己就是用户，我就照我想要的做』——不行，那只会得到对工程师好用的东西，这叫自指设计。
> 二是说『去问所有潜在用户想要什么，全塞进产品』——我叫它『所有期望功能之和』，这也不行。它能造出合格的软件，但永远造不出被人喜爱的软件。
> 三是说『找一个人，把他要的给他』……这三种都不太行。」——**[一手]**（UXpod，2006）

2. **具体人名是为了让设计团队「换掉自己的眼睛」**：

> "It's a hypothetical archetype, it's a distillation of what you've learned based on your field research of actual users, it's a way to express what those users' actual goals are... and then personas become a very powerful malleable tool for being able to look through the eyes of your users and get out of the eyes of the engineers and the various stakeholders and constituents."
> 「它是一个假设性的原型，是你在实地研究真实用户之后所得认识的蒸馏，是一种表达那些用户真实目标的方式……然后 persona 就成为一个极强、可塑性极高的工具，让你能用用户的眼睛看，从工程师和各种利益相关方的眼睛里出来。」——**[一手]**（UXpod，2006）

3. **persona 是「发现」不是「捏造」**：

> "The thing about personas is they're not so much things you make as they are things you discover and so if you go out and discover that there's seven personas it means you do not have appropriate focus."
> 「persona 与其说是你做出来的东西，不如说是你发现的东西。所以如果你发现存在七个 persona，那说明你的焦点不对。」——**[一手]**（UXpod，2006）

4. **它是「手术台上的无影灯」，本身不是设计**：

> "I like to refer to personas as the bright light under which we do surgery. I don't want people to misunderstand and think that personas are in and of themselves design."
> 「我喜欢把 persona 称作我们动手术时头顶那盏无影灯。我不想让人误会，以为 persona 本身就是设计。」——**[一手]**（UXpod，2006）

### 行动

1. 1983 年：私下用「Kathy」这一角色扮演法做 SuperProject 设计（**无方法论意识**）。
2. 1993–1995 年间（时间口径见矛盾说明）：在 Sagent 项目中访谈了约六七家意向客户，快速识别出三类目标、任务与技术能力显著不同的用户群。
3. 命名为 **Chuck、Cynthia、Rob**：

> "Chuck was an analyst who used ready-built templates and reports. Cynthia was an analyst, too, and she used similar ready-built templates. But Cynthia also wrote her own templates, which she gave to Chuck to use. Rob was the IT manager who supported both Rob [sic] and Cynthia. He could optimize Cynthia's templates, but he would never originate or use them."
> 「Chuck 是用现成模板和报表的分析师。Cynthia 也是分析师，也用类似的现成模板，但 Cynthia 还会自己写模板，并给 Chuck 用。Rob 是支持他们两人的 IT 经理，他能优化 Cynthia 的模板，但从不发起也不使用模板。」——**[一手]**
> ——注：Cooper 原文此处「supported both Rob and Cynthia」应为笔误（应是 Chuck and Cynthia），本文件照抄以存真。

4. **分享而非保密**——这是他明说的一次关键决策：

> "Personas are a fairly simple concept. They are not rocket science... I thought to myself, somebody else is going to think of this... So I told the world about personas. Maybe I didn't make money from it straight away — it's a concept, you don't make money selling a concept. But, I got credit for my invention, and that credit turned into attention, and attention turns into money."
> 「persona 是个相当简单的概念，不是火箭科学……我想，总会有人想到这个的……所以我把 persona 告诉了全世界。也许我没有马上靠它赚钱——它是个概念，卖概念不赚钱。但我拿到了『这是我的发明』的信用，信用变成注意力，注意力变成钱。」——**[一手]**（Graphic Mint，2016）

5. 1998–1999 年通过《The Inmates Are Running the Asylum》把它公开出版。

### 结果

- persona 成为 UX 行业几乎普遍使用的方法（User Defenders 语："almost universally used in the field"）。
- 也被大规模误用。Cooper 的态度是「那不是 persona」：2016 年他说「大多数人做的 persona 是某种冒牌流程，所以才有人说 persona 不好用」；2006 年他用了一句刻薄的比喻：

> "I think that's a lot like having a Diet Coke and a Snickers bar for lunch. You can tell yourself you're being conservative by having that Diet Coke but you're not."
> 「那就像午饭吃一罐健怡可乐加一条士力架。你可以告诉自己『我喝的是健怡，我很克制』——但你不是。」——**[一手]**（UXpod，2006，谈「没做研究、闭门编 personae」）

- **他本人对「营销式 persona」的挪用持反对态度**。他明确区分：营销细分是「怎么卖出去」的工具，persona 是「为什么会被满意地使用」的工具，两者目的截然不同。

### 事后反思（含矛盾保留）

**矛盾：哪个才是「第一个 persona」？**

| 说法 | 出处 | 可信度 |
|---|---|---|
| **Kathy**（约 1983，SuperProject 时期）是第一人称角色扮演对象 | Cooper 本人《The origin of personas》原文：「play-acting a project manager, loosely based on Kathy」 | **[一手]** |
| **Kathy 是第一代 persona**，且「Kathy 基于一个真实的人」 | Out of My Gord（2015-06-02）转引 Cooper 2008 年 cooper.com 旧文：「Kathy was based on a real person that Cooper had talked to during his research for a new project management program」；「Alan Cooper – the father of usability personas – had no particular methodology in mind when he created 'Kathy,' his first persona」 | **[二手]**（转引自 Cooper 本人原文，但转引片段与现存 2008 年版本措辞不完全一致） |
| **Chuck、Cynthia、Rob 是「第一批真正的、目标导向的 persona」** | Cooper 本人原文：「So I created Chuck, Cynthia, and Rob. These three were the first true, Goal-Directed, personas.」 | **[一手]**（最可靠） |

**本文件的判断**：Cooper 自己的措辞已经解决了这个矛盾——Kathy 是**方法论诞生前的雏形**（无意识、私人的、角色扮演式），Chuck/Cynthia/Rob 是**第一批真正的目标导向 persona**（自觉的、有实地研究支撑的、面向团队交付的）。把「第一个 persona」这个头衔给谁，取决于定义，Cooper 本人用的定义给后者。

**矛盾：Sagent 项目是 1993 年还是 1995 年？**

- Cooper 2008 年原文：**"In 1995 I was working with the three founders of Sagent Technologies"**——**[一手]**
- Out of My Gord（2015）称 Kathy 出自「his early 80's computer」时代——与 1983 年吻合。
- UXmatters 称 Cooper U 培训始于约 14 年前（即 2001 年左右）；Sagent 年份未见其他一手说法。
- **本文件的判断**：以 Cooper 原文的 **1995 年**为准。

### 来源

- Alan Cooper, *The origin of personas*, 2008-05-15（原 https://www.cooper.com/journal/2008/05/the_origin_of_personas 已下线；**本次未取得原页，也未取得 web.archive.org 副本**）—— **[一手]**，引文经两处独立转引互校：
  - Win-Loss Agency（2019-08-28）长段逐字转引：https://win-loss.agency/post/using-qualitative-interviews-to-refine-personas/
  - Tim Strehle（2003-10-20）节选转引：https://www.strehle.de/tim/weblog/archives/2003/10/20/197/
  - 两处转引内容一致，**可信度较高**
- UXpod 访谈（2006-12）—— **[一手]**
- Graphic Mint 访谈（2016-06）—— **[一手]**
- Atomic Object, *Industry Viewpoints: An Interview with Alan Cooper*（2016-11-15），https://spin.atomicobject.com/alan-cooper-interview/ —— **[一手]**
- Out of My Gord, *An Eulogy for "Kathy" – The First Persona*（2015-06-02），https://outofmygord.com/2015/06/02/an-eulogy-for-kathy-the-first-persona/ —— **[二手]**
- CHM 博文（注：该文把《Inmates》出版年误写为 1995，实为 1999，本文件不采其年份）—— **[二手]**

---

## 决策 5 · 《The Inmates Are Running the Asylum》的写作与「猛烈攻击」路线（1998–1999）

### 背景

1990 年代末，软件质量问题是行业共识，但讨论方式是技术性的（bug 率、可用性测试、HCI 学术）。Cooper 认为这些讨论都绕开了真正的病灶。

### 他的逻辑

**1. 病灶不在执行层，在决策层。**

> "That book was directed at middle level..."（残句，见来源说明）
> 「那本书是冲着中层去的……」——**[一手]**（Cooper, *Defending Personas*, 2021，正文页不可抓取，仅取到索引残段）

**2. 用猛攻而不是劝说的理由：温和劝说是无效的，因为对手不是不懂，是不在乎。**

他在 2006 年给出的替代性表达是这一段：

> "People in the software construction business in general are in denial about the responsibilities they have and they find lots and lots of different ways to not do what they need to do, and that's why I'm outraged... because the people who build software empowered products kid themselves."
> 「软件建造业的人普遍在否认自己承担的责任，他们想出无数种办法不去做该做的事。这就是我愤怒的原因……因为做软件产品的人在自欺。」——**[一手]**（UXpod，2006）

**3. 他的核心诊断是「囚犯管理疯人院」式的错位：做产品的人不是用产品的人。**

> "Putting an Armani suit on Attila the Hun — interface design only tells you how to dress up an existing behavior."
> 「给阿提拉穿阿玛尼西装——界面设计只能教你怎么把已有的行为打扮漂亮。」——**[一手]**（《Inmates》书中原句，经 User Defenders 主持人引述）

**4. 他选择的对手是程序员群体，且是直呼其名地打。**

CHM 转述：他得出「**UI 设计与软件实现不应由同一个人做**」这一结论，而这也是他终身主张的根。

### 行动

1. 1998 年写成，1999 年由 Macmillan（后属 Pearson）出版。副标题 *Why High-Tech Products Drive Us Crazy and How to Restore the Sanity* 本身就是攻击性的。
2. 书中首次系统公开 persona 方法（"introduced the use of personas as a practical interaction design tool"，见 Cooper 官方日志语）。
3. 书名与通篇比喻把程序员／工程师置于「囚犯」位置。

### 结果

**正面：**

- 成为 UX 领域的必读书（CHM 语："required reading for practitioners"）。
- 让 persona 方法获得了行业级的传播渠道。
- 让他成为「交互设计」这个职业最响亮的公开代言人。

**负面（树敌与精英主义指控）：**

- **对程序员的整体化描写是批评最集中的落点。** 有书评直接指其把程序员「几乎当作另一个物种」，把这本书视为「糟糕的建议」、主张「基本忽略」（见 04-external-views.md 第 3 条，Brikman 书评）。
- **「精英主义」指控有实质来源**：Cooper 在 2002 年 Beck 对谈中说过一句被反复引用的判断：

> "It's my experience that neither users nor customers can articulate what it is they want, nor can they evaluate it when they see it. Neither the people who buy software nor the people who use it have the capability of visualizing something as complex as the behavior of software."
> 「以我的经验，用户和客户都无法说清自己想要什么，也无法在看到时评估它。买软件的人和用软件的人，都没有能力去想象像软件行为这么复杂的东西。」——**[一手]**（Fawcette's 对谈，2002-01-15）

这句话是「Cooper 是精英主义者」这一指控的**最硬的证据**，也是 Beck 那句「我不明白为什么这位新专家必须先做完他/她的工作，施工才能开始」的直接前因。

- **另有一个方向上的批评**：他 2008 年在 ESRI Developer Summit 的演讲还说了「开源本质上是管理失败的征兆」，进一步扩大了树敌范围。

### 事后反思

- **他没有收回立场，但承认了攻击风格的代价**。2018 年他对 Twitter 上的一个类似问题（「根本没有 UX 设计这回事」）自评：

> "I meant I was angry and frustrated and I was venting and I'm sorry, I do this stuff. You know, Twitter is the stream of consciousness broadcasting machine and sometimes I broadcast with my inner voice and I shouldn't."
> 「我的意思是，我当时既愤怒又受挫，我在发泄，我很抱歉，我老干这种事。Twitter 是意识流广播机，有时候我把内心独白播出去了，我不该这样。」——**[一手]**（User Defenders, Part I, 2018）

- **他对书本身的态度是「不用改」**：

> "the publisher has said, 'don't you want to update it?' I look at it and I go, you know, the examples are pretty old, but the points are the same."
> 「出版社说『你不想更新一下吗？』我看着它说：例子确实很旧了，但论点没变。」——**[一手]**（同上）

- **2008 年之后，他的攻击对象从「程序员」转向了「资本结构」**。2018 年他的表述是：「这不是设计师和商人的冲突，是人与想要钱的人之间的冲突。」（"it's between humans and people who want money."）——他并未变得温和，只是换了靶子。

### 来源

- Alan Cooper, *The Inmates Are Running the Asylum*, Macmillan/Pearson, 1999 —— **[一手]**（**本次未取得全书正文**，仅通过书评、转引、官方摘要使用）
- Fawcette's（后由 Neil on Software 完整转载），*Extreme Programming vs. Interaction Design*, 2002-01-15，https://neilonsoftware.com/2020/01/24/agile-history-kent-beck-vs-alan-cooper/ —— **[一手]**（对谈全文）
- User Defenders #053 Part I（2018-09-10），https://userdefenders.com/podcast/053-be-a-good-ancestor-with-alan-cooper-part-1/ —— **[一手]**
- UXpod（2006-12）—— **[一手]**
- Cooper, *Defending Personas*（2021-03-09），https://mralancooper.medium.com/defending-personas-2657fe26dd0f —— **[一手]**，**正文页不可抓取**，仅取到索引残段
- 04-external-views.md 已收录的他人批评（Brikman 书评等）—— **[一手]**（批评者原话）
- **未找到一手来源**：Cooper 本人对「你说程序员是另一个物种」这一具体指控的系统回应。

---

## 决策 6 · 与敏捷社区的公开争论（2002–2018）

### 背景

2001 年敏捷宣言发表。XP（极限编程）与 Scrum 迅速成为主流。Cooper 的立场是「设计必须在编码之前完成」，与敏捷「迭代、无前置大设计、客户协作」的核心前提正面冲突。

### 他的逻辑

**1. XP 的深层假设是「组织问题改不了，所以程序员自建防御工事」——而他要改组织。**

> "I think XP has some really deep, deep tacit assumptions going on, and I think the deepest tacit assumption is that we have a significant organizational problem, but we can't fix the organization. Essentially, the crap rolls downhill and ends up rolling right into the programmer's lap... XP says, 'OK, so, I can't change the organizational failings, so, I'm going to build my own internal defenses.' I suppose this is probably better than nothing, but I'm interested in changing the way organizations are constructed."
> 「我认为 XP 有一些非常深的隐含假设，其中最深的那个是：我们有一个严重的组织问题，但我们改不了组织。本质上，垃圾顺坡滚，最后滚到程序员腿上……XP 说：『好吧，我改不了组织的失败，那我就自建内部防御。』我猜这总比什么都没有强，但我感兴趣的是改变组织的构造方式。」——**[一手]**（2002 对谈）

**2. 设计必须前置，因为代码是「浇混凝土」。**

> "It has to happen first because programming is so hellishly expensive... There's enormous cost in writing code, but the real cost in writing code is that code never dies. If you can think this stuff through before you start pouring the concrete of code, you get significantly better results."
> 「它必须先发生，因为编程贵得要命……写代码的巨大成本在于：代码永远不会死。如果你能在开始浇代码这层混凝土之前把这些想透，你会得到好得多的结果。」——**[一手]**（2002 对谈）

**3. 「用户能告诉你正确答案」这个前提本身是错的。**

> "You're positing that your customer can tell you the correct answer... What I'm saying is, number one, if your customer could give you a correct answer, which I absolutely believe they can't..."
> 「你在假设你的客户能告诉你正确答案……我说的是：第一，你的客户能给出正确答案这件事，我绝对不相信。」——**[一手]**（2002 对谈）

**4. 软件有两面，需要两种不同的人：**

> "there's the side that touches the hardware... it's fast and error-free and deterministic. Then on the other side, there's the human side, and humans are slow and error-prone and they're inferential and judgmental and emotional... the skills that make you good at one of those things are no help at all on the other thing."
> 「一面接触硬件……快、无错、确定性。另一面是人的一面，人慢、易错、靠推断、靠判断、有情绪……让你擅长其中一面的技能，在另一面上一点用都没有。」——**[一手]**（同上）

### 行动

1. **2002 年 1 月**：由 Elden Nelson 主持，与 Kent Beck 进行正式对谈，标题 *Extreme Programming vs. Interaction Design*，发表于 Fawcette's（该站已不存在，现由 Neil on Software 完整转载）。
2. **2008 年 3 月**：在 ESRI Developer Summit 发表主题演讲，公开说敏捷流程对做出高质量软件是有害的，并同时抛出「开源本质上是管理失败的征兆」。会后技术博客圈大规模反弹（Hans-Eric Grönlund 的《Is agile only for elites?》是其中记录最完整的）。
3. 提出 **The Triad（三元结构）**：交互设计（为人的设计）／设计工程（为计算机的设计）／生产工程（实现）。主张敏捷适合「设计工程」，传统工程适合「生产工程」，两者不冲突——冲突在于放错了位置。

> "Both methods are correct, but only when used at the correct time and with the correct medium."
> 「两种方法都是对的，但只在用在对的时间、对的介质上时才对。」——**[一手]**（Cooper, *Design Engineering: The Next Step*, cooper.com 原始文章，经 Hans-Eric 转引）

4. **2008 年 Agile 大会**：做开幕主题演讲 *The Wisdom of Experience*（从 Cooper 2018 年《How Far Have We Come?》的追述中可知）。
5. **2018 年**：发表《How Far Have We Come?》，回顾十年。

### 结果

**敏捷圈的回应（具体、有记录）：**

- **Kent Beck 在 2002 年对谈中的三条反驳**（**[一手]**）：
  1. 「我不明白为什么这位新专家必须先做完他/她的工作，施工才能开始？」（"I don't see why this new specialist has to do his or her job before construction begins?"）
  2. 「交互设计师会变成瓶颈，因为所有决策都汇聚到这一个中心点。这造成层级化的沟通结构，而我的哲学更偏向复杂系统那一侧——软件开发不该由阶段构成。」
  3. 「在我合作过的 XP 团队里，系统随时间变得**更**有能力，而不是更差。」（直接反驳 Cooper 的「瘢痕组织 / scar tissue」论）
- **Beck 也给了正面回应**：「你说的关于找到更大图景的事，我基本都接受」（"I think I can grant you pretty much everything that you said about finding that larger picture"），并设想合作：「我想找一个团队，你带客户那边，我带工程师那边。我觉得我们能狠踢一顿。」
- **中立观察者的总结**（UX Magazine, 2014）："their disagreements were strong and by the end, they had found precious little common ground."
- **UX Magazine 进而把这场争论定性为劳资冲突而非方法论分歧**（Mike Bulajewski, *Crossing the Great UX–Agile Divide*, 2014）：敏捷宣言的五条原则实质是软件工程师的「劳动保护条款」（自主权、同地办公、工时上限），UX 作为新的专业化角色，客观上「把构思从执行中剥离」，威胁到程序员的自主性。**[推断]** 这是对 Cooper–Beck 争论实质最锋利的一种第三方解读，也是**对 Cooper 立场最不利的一种解读**——因为它把 UX 的介入说成是让程序员被去技能化（deskilling）。
- **Hans-Eric Grönlund 的框架**：他认为 Cooper 的主张「等于要求我们回到瀑布模型」，但即便如此仍值得认真对待，因为传统流程是为解决真实问题而生的。他最后承认：「也许敏捷只适合精英团队？」——**注意：这个标题是提问，不是结论。**

### 事后反思

- **Cooper 在 2002 年对谈里已经让了一步**（很少被引用）：

> "you and I are very close on this... while I don't think there's anything wrong with phases *per se*, I think it's wrong when phases are abused, namely when phases have arbitrary boundaries and when there's no recourse and the people who are participating in the various phases are not working together."
> 「你和我在这点上非常接近……我并不认为阶段本身有什么错，错的是阶段被滥用的时候：边界武断、没有回旋余地、各阶段的人不在一起工作。」

- **他也承认了交互设计师这个群体的弱点**：「坦白说，能干合格的交互设计师并不多，组织形态健康的更少。」（"there aren't a lot of competent interaction designers out there, and there are even fewer well-formed organizations."）
- **2018 年他给敏捷留了位置**（从《How Far Have We Come?》的存在与内容方向可推断，**原文未取得，此处标 [推断]**）：他把敏捷称为「程序员中第一个关于流程的本土运动」（"It is the first indigenous movement among programmers that is about process"）——措辞里含有尊重。

### 来源

- Fawcette's / Neil on Software, *Extreme Programming vs. Interaction Design*（2002-01-15 发表），https://neilonsoftware.com/2020/01/24/agile-history-kent-beck-vs-alan-cooper/ —— **[一手]**（对谈全文，本文件核心来源之一）
- Hans-Eric Grönlund, *Is agile only for elites?*（2008-03-28），https://www.hans-eric.com/2008/03/28/is-agile-only-for-elites/ —— **[一手]**（现场听众记述 + 大段转引 Cooper 演讲与 cooper.com 原文）
- Hans-Eric Grönlund, *Alan Cooper: Open-Source is a Sign of Failure*（2008-04-28），https://www.hans-eric.com/2008/04/28/alan-cooper-open-source-is-a-sign-of-failure/ —— **[二手]**
- UX Magazine, Mike Bulajewski, *Crossing the Great UX–Agile Divide*（2014-06-23），https://uxmag.com/articles/crossing-the-great-ux-agile-divide —— **[二手]**（第三方分析，立场偏劳动社会学）
- Alan Cooper, *How Far Have We Come?*（2018-01-24），https://mralancooper.medium.com/how-far-have-we-come-792a80625c94 —— **[一手]**，**正文页不可抓取**，仅取到索引残段
- Alan Cooper, *Smooth is Fast. The agile conundrum*（2019-12-13）—— **[一手]**，**正文页不可抓取**，仅取到索引残段
- **未找到一手来源**：Alistair Cockburn 本人对 Cooper 的公开回应；Scrum 官方（Schwaber/Sutherland）对 Cooper 的直接回应。本次检索到的「敏捷圈回应」以 **Kent Beck** 与 **一线敏捷开发者博客** 为主。

---

## 决策 7 · Cooper 公司的商业转型与出售（2000–2020）

> 本条目实际包含**四次性质不同的决策**，按时间顺序排列，因为它们构成同一条商业路线。

### 背景

Cooper 是「咨询服务 + 培训 + 出版」三位一体的模式。Sue 的原话是：

> "So then we had to write the books. We knew that consulting, books, and teaching all went together. And so we started Cooper U and did all of the wonderful things that had to happen in order to have a viable business. We grew to about 70 people."
> 「然后我们必须写书。我们知道咨询、书、教学是一体的。于是我们做了 Cooper U，做了一切为了让生意成立该做的事。我们长到了大约 70 人。」——**[一手]**（Sue Cooper，《Cashing Out》）

### 决策 7a · 2000 年拒绝第一次收购（互联网泡沫前）

**背景**：公司成立约 10 年时，有公司上门要买，时点在互联网泡沫破裂前。

**Sue 的逻辑与反思**：

> "we were approached by a company who wanted to buy us, right before the dot com bust (2000), but we weren't ready. We didn't have an investment banker or anything. So one of the key stories for me is that I often look back to what they were offering then—and we could have sold out then for probably more than we eventually got—but we didn't feel ready."
> 「在互联网泡沫破裂前（2000），有公司来谈收购，但我们没准备好，连投资银行都没有。对我来说一个关键故事是：我常回头看他们当时出的价——我们那时卖掉可能会比最终拿到的还多——但我们当时感觉没准备好。」——**[一手]**

**Alan 的补充（同一访谈）**：

> "We would've gotten a lot of worthless stock. We would've gotten a much bigger number that was not backed by real money, I think. The dot com bubble popped and we just got destroyed, so we dropped down. Sue took over because I couldn't handle it, I was losing my shit. And Sue came in and basically rescued the company and she pared it down to, I think there were 7 people, 7 employees besides us."
> 「我们本来会拿到一大堆废纸股票。数字大得多，但没有真钱撑着。泡沫一破，我们被彻底打垮，规模掉下去。Sue 接手了，因为我扛不住，我当时在崩溃。Sue 进来基本上救了公司，把它砍到——我想是 7 个员工，除我们俩之外 7 个人。」——**[一手]**

**结果**：拒绝了「看起来更划算」的出售；随后泡沫破裂，公司从约 70 人跌到 7 人；Sue 接管救回。

**事后反思**：Sue 明确说这是「回头看」的复盘，语气上是遗憾但不后悔（"we weren't ready"）。

### 决策 7b · 2002 年起把内部培训变成对外生意（Cooper U）

**背景**：Cooper 内部有一套训练自家设计师的课程。

**他的逻辑（一个明确的自我纠正）**：

> "Years ago, I had this client, a big company, that had worked with us for years. They asked us to teach them how to do what we do. I initially made the wrong choice: I said 'no.' Within a few months, they were no longer our client. And I realised that decision was selfish, and wrong. From a business perspective, I made the right choice. I kept a tight control on our secret sauce. Through this experience, I learned that sometimes the right business decision isn't the best decision for the world. The right thing is to shout your secret from the rooftops."
> 「多年前有个大客户，跟我们合作多年，他们要求我们教他们怎么做我们做的事。我最初做了错误的选择：我说『不』。几个月内他们就不再是我们的客户了。我意识到那个决定是自私的、错的。从生意角度看我是对的——我牢牢控制着自己的秘方。但通过这件事我学到：有时候正确的商业决定并不是对世界最好的决定。正确做法是站到屋顶上把你的秘密喊出来。」——**[一手]**（Graphic Mint，2016）

**行动**：把内部课程压缩成四天制基础课（原本两周→一周→四天，因为要求学员连续两个周末飞来飞去不现实），开放对外。

**结果**：Cooper U 迅速成功（"It was an instant hit"）；工作坊从 1 门扩到 11 门，覆盖服务设计、领导力发展、客户体验策略、产品定义、品牌策略等；2015 年才开设纽约课程。Cooper U 与咨询业务高度交织：设计师既做项目也教课。

**事后反思**：

> "We aren't making a huge amount of money from Cooper U, but we do just fine. If you look at many of our competitors, they are not innovators sharing their innovations. They are cash extraction engines."
> 「Cooper U 没让我们赚大钱，但我们过得不错。你看很多竞争对手，他们不是分享创新的创新者，他们是抽钞机。」——**[一手]**（Graphic Mint，2016）

**矛盾说明（Cooper U 起始年份）**：

| 说法 | 出处 | 可信度 |
|---|---|---|
| **2002 年**成立 Cooper U | UXmatters（2015-09-21）：「In 2002, Cooper established Cooper U」 | **[二手]** |
| 培训项目「约 14 年前」开始（即约 2001 年） | Cooper 设计教育策略师 Teresa Brazen，UXmatters 同文 | **[二手]**（当事人，但与同文的 2002 年说法相差一年） |
| 「We've offered both private and public training for a long time」 | 同上 | **[二手]** |
| 1990 年代中期即开始有教学要素 | Sue：「我们知道咨询、书、教学是一体的」 | **[一手]**，但未给年份 |

**本文件判断**：以 **2002 年**为 Cooper U 正式成立年，因为它是唯一有明确年份的说法。约 2001 年的说法可能指内部培训项目的起点。

### 决策 7c · 2015 年收购 Catalyst Group，为出售做准备

**背景**：2015–2016 年 Sue 决定要卖公司。她先雇了一家投行，结果是一场灾难。

> "I hired a company to help sell Cooper—an investment firm that didn't have any experience in our area, but they were really good salespeople. I hadn't done any research. I hadn't asked anybody else. Adaptive Path had just been purchased, and I should have asked them... this one company that we hired was absolutely a disaster, they hadn't done any deals in our area. They didn't know the segment, they didn't understand the value of design."
> 「我雇了一家公司帮我们卖 Cooper——一家在这个领域毫无经验的投资公司，但他们是很棒的销售员。我没做调研，没问过别人。Adaptive Path 刚被收购，我本该去问他们……我们雇的这家公司简直是场灾难，他们没在这个领域做成过一笔交易。他们不懂这个细分市场，也不理解设计的价值。」——**[一手]**（Sue）

随后她雇了顾问 Ken Trush（Maria Giudice 推荐），得到建议：需要更广的覆盖面和更强的执行团队。于是：

> "So we acquired a design company called Catalyst based in New York. Their company had about 15 people. The merger gave us a New York office in addition to our 45-person San Francisco office."
> 「于是我们收购了纽约一家叫 Catalyst 的设计公司，约 15 人。这次合并让我们在 45 人的旧金山办公室之外，有了一个纽约办公室。」——**[一手]**（Sue）

**Alan 对「合并 vs 收购」的处理，是他在这条线上最清楚的一个判断**：

> "In order for any kind of a merger or acquisition to be a success, the two companies involved have to be the same size... We stressed from the very beginning that we were not acquiring Catalyst, we were merging with them. And that's, let me just say, that kind of humility is not to be found when a big company buys a little company."
> 「任何合并或收购要成功，参与的两家公司必须体量相当……我们从一开始就强调：我们不是收购 Catalyst，我们是在与他们合并。我这么说吧——这种谦逊，在大公司买小公司的时候是见不到的。」——**[一手]**（Alan）

### 决策 7d · 2017 年 10 月把 Cooper 卖给 Wipro Digital / Designit

**背景**：Wipro（5000 人）通过 2016 年收购的 Designit 接触 Cooper（约 50 人）。Cooper 刚完成与 Catalyst 的合并，账面规模与「有纽约办公室、有更强执行团队」这两条投行建议都对上了。

**他的逻辑（三个明确的决策点）**：

1. **两人完全退出，不参与整合**：

> "Alan and I knew we wanted out. We didn't want to be part of the buyout terms. So we kept out of the inner workings of the deal negotiations because we wanted to show that our company can stand on its own without us there."
> 「Alan 和我都知道我们想退出。我们不想成为收购条款的一部分。所以我们不介入交易谈判的内部运作，因为我们想证明这家公司没有我们也能独立站着。」——**[一手]**（Sue）

2. **接受三年「随叫随到」义务，但拒绝 earnout**：

> "They held me to a three-year commitment to come at their beck and call. They could say, 'We need Alan Cooper here now,' and I had to show up. They never once asked."
> 「他们要我承诺三年内随叫随到。他们可以说『我们现在需要 Alan Cooper 到场』，我就得出现。他们一次也没叫过。」——**[一手]**（Alan）

> "This is why you don't want to accept an earnout. If you accept an earnout as part of your compensation for an acquisition, what you're doing is you're saying, 'My compensation will be for running the company the way I always run it, except I no longer have the control to run it that way.' It's just a suicide pact. So you never ever want an earnout. An employment contract is okay. Even a modest non-compete is okay. But an earnout is ridiculous."
> 「这就是为什么你绝不该接受 earnout（业绩对赌）。如果你接受 earnout 作为收购对价的一部分，你实际上是在说：『我的报酬取决于我像过去那样经营公司，但我不再拥有那样经营它的控制权。』这就是一份自杀协议。所以永远不要 earnout。雇佣合同可以，适度竞业限制也可以，但 earnout 是荒谬的。」——**[一手]**（Alan）

3. **不与任何其他买家接触（他后来明确称这是个错误）**：

> "The biggest gotcha was that Wipro didn't want us talking to other firms... And so we agreed to that, stupidly... It was a mistake to agree to not talk to anybody else because we lost any sort of leverage that we had at that point."
> 「最大的坑是 Wipro 不希望我们和其他公司谈……而我们愚蠢地答应了……同意不跟别人谈是个错误，因为那一刻我们失去了所有筹码。」——**[一手]**（Sue）

**行动与价格（含一处口径冲突）**：

- 2017-10-05 公布签约；2017-10-25 完成交割（Reuters）。价格约 **850 万美元**（The Hindu BusinessLine、VCCircle）。[二手]
- **人员规模口径冲突**：Sue 说「45 人旧金山 + 15 人纽约」（≈60）；Designit CEO Hallstrup 对 diginomica 说「only 35 people in San Francisco and New York」。**两说并列，本文件不做取舍**（可能分别对应合并前后、或含不含全职设计师/行政的不同口径）。
- 2018 年 9 月 User Defenders 播客介绍页确认：「In 2017, Alan and his wife, Sue, sold Cooper, the company they had founded 25 years earlier.」

**结果（恶化的部分，Cooper 讲得很直白）**：

> "When the acquisition is completed, your organization is now in the bloodstream of a larger company that has antibodies against who you are and what you do. And in my humble opinion, there are very few acquisitions that actually work."
> 「收购完成时，你的组织进入了一家更大公司的血液里，而那家公司有抗体，专门针对你是谁和你做什么。以我浅见，真正成功的收购极少。」——**[一手]**（Alan）

> "The Wipro guys wanted the Cooper people to behave like Wipro employees... And our guys said, 'No, that's not how we do things, and the reason why we're successful at what we do is because of the way we do things.' And the management up and down in Wipro, they were just unsympathetic to that. They said, 'No, no, no, you can do your magic, but you have to do it our way.' Well, that's just a way of saying, 'We're going to destroy you and everything you stand for.'"
> ——**[一手]**（Alan）

> "At the last minute they decided to change our name from Cooper to Designit, which is a grossly bad business decision."
> Sue 的回应："But that's their right. They bought the company..."
> Alan："I'm not saying that they didn't have the right to do that. I'm saying that it was a grotesquely poor business decision. If you're selling your company, you've got to let go, and you can't run a company from the grave."
> ——**[一手]**

**名称与网址一并消失（事实与反思合并，因为 Sue 是当成自己的失误在讲）**：

> "We sold the Cooper name, the Cooper URL, everything. The Cooper website, it's gone. And so now there's no way to find any information about Cooper on the net... It's like we didn't exist, it's erased. And I wish there was a way, for our employees who are looking for jobs... I think we should have thought that through a little bit better."
> 「我们把 Cooper 这个名字、Cooper 的网址、所有东西都卖了。Cooper 的网站没了，现在网上找不到关于 Cooper 的任何信息……就像我们不曾存在，被抹掉了。我希望有办法——为了我们那些找工作的员工……我觉得这件事我们本该想得更周全一点。」——**[一手]**（Sue）

**长尾成本**：交易完成五年后，加州与纽约双重征税问题仍在处理，「花了五年和几十万美元律师费」（Sue）。这是 Cooper 双方都明确标注为「没预料到」的一项。

**事后反思（7d 部分）**：

> "At the last minute they decided to change our name from Cooper to Designit, which is a grossly bad business decision."
> Sue 的回应："But that's their right. They bought the company..."
> Alan："I'm not saying that they didn't have the right to do that. I'm saying that it was a grotesquely poor business decision. If you're selling your company, you've got to let go, and you can't run a company from the grave. You can't have these strings attached."
> 「他们在最后一刻决定把我们的名字从 Cooper 改成 Designit，这是个烂透了的商业决定。」
> Sue：「但那是他们的权利。他们买了公司……」
> Alan：「我没说他们没这个权利。我说的是这是个难看透顶的商业决定。你在卖公司，你就得放手，你不能从坟墓里经营一家公司。不能带这些附加条件。」——**[一手]**

### 决策 7e · Cooper Professional Education 关闭（2020）

这是一条**他本人没有做的决策**，但它是决策 7 这条路线的终点，因此单列。

**背景**：2017 年出售后，Cooper 的培训业务被重组为 **Cooper Professional Education（CPE）**，成为 Designit 的教育分支，继续对外开课（LeadIQ、Vimeo 频道、Karalyte 网站均可佐证其 2018–2020 年在运营，Karalyte 2020-03 的项目描述明确写「Cooper had recently been acquired by Designit... and were reorganizing their team」）。

**他的逻辑**：**未找到一手来源。** Cooper 本人未对 CPE 的关闭公开发表过立场。

**行动（由他人执行）**：

- **2020-05-29**：Cooper 设计教育策略师 Teresa Brazen 在 LinkedIn 公布：

> "Friends, I'm sad to share that Cooper Professional Education is closing its doors. Here is the story of the impact we had, the many amazing people who contributed to our mission..."
> 「朋友们，我很难过地告诉大家，Cooper Professional Education 要关门了。这是我们曾经产生的影响、以及许多为我们的使命做出贡献的了不起的人的故事……」——**[一手]**（当事人首发，**页面不可直接抓取**，内容经检索索引取得）

**结果**：一家成立于 2002 年、把「为什么要把秘方喊出来」当作信念的培训业务，在售出后约两年半结束。**[推断]** 时点与新冠疫情高度重合，但**本次调研未找到任何一手材料说明关闭的具体原因**（疫情、母公司战略调整、或两者叠加），故不作因果断言。

**事后反思**：**未找到一手来源。** 唯一的追忆来自当初推动这件事的 Cooper 本人，但讲的是 2016 年以前的历史，不是这次关闭：

> "It was very successful from the very beginning."
> 「它从一开始就非常成功。」——**[一手]**（Cooper，Atomic Object 访谈，2016）

### 事后反思（总）

- **Alan 的整体判断是悲观的**：

> "It's commonly accepted wisdom that you cannot sell a service company... I think that also the odds are against a successful sale of a small company to a big company. Because the entrepreneurial mindset is very different from the corporate mindset... if you can sell your modestly sized consulting company, you are fucking awesome."
> 「普遍接受的智慧是：服务型公司卖不掉……我也认为把小公司成功卖给大公司，概率是低的。因为创业者的心态和企业的心态完全是两回事……如果你能把你那家中等规模的咨询公司卖掉，你他妈太厉害了。」——**[一手]**（Alan）

- **Sue 的结论是「值得」**：

> "Oh, yeah. Yeah, I was done. It was time... We were in our sixties when we sold the business. When we were approached the first time we were in our forties and we were not ready for it. We had the energy to keep going. But it was really an easy decision for us the second time because we both wanted to retire."
> 「当然值得。我干完了，时候到了……我们卖公司时六十多岁。第一次有人上门时我们四十多岁，那时没准备好，还有精力继续。第二次对我们来说是个很容易的决定，因为我们俩都想退休了。」——**[一手]**（Sue）

- **Alan 对「过了 100–150 人就变质」的判断（对整条路线的一个总结）**：

> "But once a company passes 100 or 150 people, it kind of stops doing that. You get professional management in, and their job is to make money and they don't care about win-win. They care about winning and that's a very different thing."
> ——**[一手]**（Alan）

### 来源

- Narrative, *Cashing Out* · Cooper 夫妻访谈—— **[一手]**（本条目主干）
- Wipro 新闻稿, *Wipro Digital to acquire Cooper...*（2017-10-05），https://www.wipro.com/newsroom/press-releases/2017/wipro-digital-to-acquire-cooper-a-leader-in-ux-and-interaction-design-and-expand-designits-capabilities/ —— **[二手]**
- diginomica, *Designit CEO on buying Visual Basic creator's consulting firm*（2017-10-08），https://diginomica.com/designit-ceo-buying-visual-basic-creator-consultancy-firm —— **[一手]**（Designit CEO Mikal Hallstrup 访谈；含「Cooper 约 35 人（旧金山+纽约）」的口径，与 Sue 的 45+15=60 口径**冲突**，两说并列）
- The Hindu BusinessLine / VCCircle / LiveMint（2017-10-05）—— **[二手]**（850 万美元价格）
- Reuters, *Wipro completes acquisition of Cooper Software*（2017-10-25），https://www.reuters.com/article/technology/wipro-completes-acquisition-of-cooper-software-idUSFWN1N00XI/ —— **[二手]**
- UXmatters, *Cooper and Cooper U, Part 1*（2015-09-21），https://www.uxmatters.com/mt/archives/2015/09/cooper-and-cooper-u-part-1.php —— **[二手]**（Cooper U 2002 年、11 门工作坊、咨询/培训交织）
- Graphic Mint 访谈（2016-06-30）—— **[一手]**（Cooper U 决策动机）
- Sue Cooper LinkedIn 简介（"I founded Cooper in 1992 with my husband Alan Cooper. We sold the company to Designit in October 2017."）—— **[一手]**，**页面不可直接抓取**，内容经检索索引取得
- Teresa Brazen LinkedIn 帖（2020-05-29）—— **[一手]**，**页面不可直接抓取**，内容经检索索引取得
- Karalyte, *Elevating the Digital Presence of Cooper Professional Education*（2020-03-23），https://karalyte.com/cooper/ —— **[二手]**（佐证 CPE 在 2020 年 3 月仍在运营，且是 Designit 的重组对象）
- LeadIQ / Owler / Vimeo / Pragmatic Institute 等公司条目 —— **[二手]**（佐证 CPE 的「Designit 教育分支」身份与 2020 年 5 月 29 日的关闭时点）

---

## 决策 8 · 「设计师该不该写代码」：他明确说「不」

### 背景

「设计师该不该会写代码」是设计行业十几年来的常规辩论。Cooper 的立场之所以特别，是因为**他自己是程序员出身**——他在 C 语言里做了大半辈子的产品，还因此赚到了钱。

### 他的逻辑

**1. 他认为这个问题本身问错了。**

> "I really don't think that's a relevant question. I mean, that's like saying should designers waterski. I don't know if it makes them a better designer. Yeah, they should all. But should I draw up and say, hey, you designer go waterski, it's good for you. You know, like what the hell, where does that come from?"
> 「我真觉得这不是个相关的问题。那就好比问『设计师该不该滑水』。我不知道滑水能不能让设计师变得更好。行吧，他们都该去。但我该不该站出来说：嘿，设计师，去滑水，对你有好处？这算哪门子事，这说法是哪来的？」——**[一手]**（User Defenders #053 Part II，2018-09-17，此段为 Cooper 原话）

**2. 真正的需要是「理解动机」，而理解动机的路径不止写代码一条。**

> "But in order to be a good designer in the tech field, you have to understand what your boss motivations are. And you have to understand what your user's motivations are, and you have to understand the motivations of the people who implement your product... So if you get that understanding by coding, go for it. But that's how I got it, you know, but I don't think that coding in and of itself is necessarily [necessary]."
> 「但要在科技领域做个好设计师，你必须理解你老板的动机，必须理解你用户的动机，必须理解实现你产品的人的动机……如果你是通过写代码获得这些理解的，那去做。我就是这么获得的。但我不认为写代码本身是必要的。」——**[一手]**

**3. 他反对的是「一人公司」这个前提，不是反对技能。**

> "everybody then starts throwing in my face this thing about the one man shop and to which I say the one-man shop, I say do you want to go and get your heart replaced in a one-man shop operating theater. I don't think so. If you're trying to build some world-class software in a one-man shop, what the hell's wrong with you?"
> 「然后所有人就把『一人公司』这件事甩到我脸上。我回答说：你愿意在一个一人公司的外科手术室里做心脏置换吗？我不觉得。如果你打算在一人公司里造世界级软件，你到底哪里有问题？」——**[一手]**

**4. 分工是他毕生的主张。**

他在 1982 年（Digital Research）就要求「不写代码只做设计」被拒；1992 年创业时招牌就是「只做设计咨询，不写程序」；CHM 明确说他的核心结论是「UI 设计与软件实现不应由同一个人做」。**(一以贯之，非转向)**

**5. 早年他已经用过一个更粗的说法**（2018）：「我不在乎设计师的愿景，就像我不在乎工程师的愿景一样。」（"I don't give a rat's ass about the designer's vision, the same way I don't give a rat's ass about the engineers."）——这句话在「设计师该不该写代码」这个语境里，作用是把**两边都按住**，而不是偏向任何一边。

### 行动

- 2017 年 5–6 月，在 Medium 上连发一个系列文章，标题直接是 **《Should Designers Code??》**，副题「**No**」：
  - *Should Designers Code?? — No, Part Two: Know Versus Do*（2017-05-16）
  - *Should Designers Code??? — No, Part Three: Roles and…*（2017-05-19）
  - *Should Designers Code???? — No, Part Four: A few other reasons*（2017-06-19）
  - 同期由 Modus 转载的 *Should Designers Code? (Pt. 1)*（2017-05-12）
  - **四篇正文本次全部未能抓取**（Medium 域名连接失败）。判断依据是标题与索引摘要中一致出现的 "No" 与各篇副题。
- 2018 年 9 月在 User Defenders 播客上当面回答该问题，给出了上面那句「滑水」比喻。

### 结果

- **他站在了少数派一侧，并且是有影响力的少数派**。搜索结果至今仍能看到 2025 年专门写来反驳他的文章（"why Alan Cooper might be wrong in 2025"，theuicodex.org）。
- **他的公司（Cooper）在商业上并未因此受损**：Cooper 从未要求员工写代码，反而靠「不写代码的设计师」这一差异化，把公司做成了可出售的资产。

### 事后反思（有无转变？）

- **没有发现立场转变。** 从 1982 年（要求脱离编程）→ 1992 年（不写程序的招牌）→ 2002 年（交互设计与实现的分离）→ 2016 年（Cooper U 教方法论而非教代码）→ 2017 年（系列文章说 No）→ 2018 年（播客说「不该问这个」），是一条直线。
- **一个细节值得记下**：他在 2018 年同一场对话里承认，写代码正是**他自己**获得「理解动机」的路径（"But that's how I got it, you know"）。这个自我承认减少了「饱汉不知饿汉饥」的指责空间，也是他能站得住脚的原因。
- **但批评者仍然可以指出一个张力**：他本人在 1980 年代靠写代码卖软件赚到了创立咨询公司的资本，然后告诉后来者不必学这件事。这在逻辑上不是矛盾（他反对的是「必不必须」，不是「可不可以」），在观感上却是。**本文件把这个张力原样留下，不替他辩护也不替批评者定论。**

### 来源

- User Defenders #053 Part II（2018-09-17），https://userdefenders.com/podcast/053-be-a-good-ancestor-with-alan-cooper-part-ii/ —— **[一手]**（含「滑水」段完整原话与文字稿）
- User Defenders #053 Part I（2018-09-10），https://userdefenders.com/podcast/053-be-a-good-ancestor-with-alan-cooper-part-1/ —— **[一手]**
- Alan Cooper, *Should Designers Code??* 系列（2017-05 至 2017-06），https://mralancooper.medium.com/should-designers-code-417de265531c 等 —— **[一手]**，**正文页面全部不可抓取**，仅有标题与索引摘要
- CHM 博文（Digital Research 时期的分工诉求）—— **[二手]**
- Graphic Mint（2016）—— **[一手]**

---

## 决策 9 · 退休、迁居与「做点别的」（2009–2026）

### 背景

Cooper 出生于 1952 年。2009 年他买下 Petaluma 西边一块 50 英亩的旧奶牛场；2011 年夏天搬入，命名「Monkey Ranch」。他自己的命名理由（**[一手]**，Monkey Ranch 官网《The Story》）：

> "We named our new home Monkey Ranch for three reasons: One, the name makes us laugh. Two, we like to monkey around and have fun. And three, we have a cat named Monkey who is the mascot of our spread."

同一页里有一句能说明他搬到农场后的问题意识：

> "When people ask, 'What do you grow on Monkey Ranch?' my answer is, 'Young people.'"
> 「有人问『你们在 Monkey Ranch 种什么？』我回答：『种年轻人。』」

他把土地和工具提供给独立经营的年轻农人，自己不是他们的雇主。

### 他的逻辑

**1. 迁居是为了从「设计的规则里」退后一步，看更大的东西。**（2016 年访谈）：

> "When I stopped programming, I was able to take a step back and gain new insights into the world of design. From taking a step back, I deduced that the world is in trouble. Moving to Monkey Ranch, I had never been on a farm... Since moving to the Ranch, I've immersed myself in new ways of looking at the food chain."
> 「当我停止编程时，我才能够退后一步，对设计的世界获得新认识。从退后一步中，我推断出这个世界有麻烦了。搬到 Monkey Ranch 后——我从没在农场上待过……自从搬来之后，我把自己泡在了看待食物链的新方式里。」——**[一手]**

**2. 他把软件伦理和农业伦理放在同一个框架里看。**（CHM 语：「Cooper 已成为可持续与再生农业的积极倡导者，并顺带指出农业综合企业与软件企业之间在伦理上的平行性。」）他自己说得更狠：

> "It's one thing to hand the food chain over to somebody who will earn money from it. It's another thing to hand it to somebody who will make money off of it and also create foods that kill you and destroy the planet."
> 「把食物链交给一个靠它挣钱的人是回事；把它交给一个靠它挣钱、同时还造出会杀死你、毁掉这颗行星的食物的人，是另一回事。」——**[一手]**（Graphic Mint，2016）

**3. 出售后他明确知道「下一步要造别的东西」。**（《Cashing Out》）：

- Alan：「我们有三年竞业限制，不能与其他公司合作。但现在我可以创办一家新的 UX 设计公司了。」
- Sue：「去干吧，亲爱的（笑）。」

他**没有**去创办新的设计公司。

### 行动（时间序列）

| 时间 | 动作 | 可信度 |
|---|---|---|
| 2009 | 买下 Petaluma 农场（老奶农去世后） | **[一手]**（Monkey Ranch 官网） |
| 2011 夏 | 搬入 Monkey Ranch | **[一手]**（官网自称「moved in during the summer of 2011」） |
| 2017.10 | 出售 Cooper，接受三年「随叫随到」义务（从未被呼叫） | **[一手]** |
| 2017–2018 | 与 Renato Verdugo 共同创设 **Ancestry Thinking Lab**（「祖辈思维实验室」）；在 UC Berkeley 工程学院的 Jacobs 设计创新中心开课，2017 秋与 2018 秋各一期 | **[一手]**（User Defenders，2018） |
| 2018.9 | 明确说明该 Lab 仍是「有抱负的（aspirational）」状态，在等大机构出资 | **[一手]**（同上：「hoping that some organization is going to say this is a reasonable investment... right now it's just mostly me speaking and being lonely voice in the wilderness」） |
| 2019.8.16 | 发表 Medium 文章《A new chapter》，宣布退休 | **[二手]**（文章标题与日期经检索索引确认，正文不可抓取） |
| 2020.5.29 | Cooper Professional Education 关闭（他未公开发言） | **[一手]**（当事人 Teresa Brazen 帖） |
| 2021.3.9 | 仍发表《Defending Personas》（对一次千人在线演讲的追记） | **[一手]**（标题与导读可确认，正文不可抓取） |
| 2022.11.29 | 接受 Wipro 采访：《Alan Cooper 想为坏的技术与设计行为建立一套分类学》 | **[一手]**（标题、日期、首段可确认，正文不可抓取） |
| 2023–2026 | 在 Hachyderm（Mastodon 实例）以 @mralancooper 持续发帖，议题覆盖制造衰退、AI 宿命论批判、政治评论、电影名改写小游戏 | **[一手]**（RSS 源可抓取，最后构建时间 2026-09-16） |
| 2026.7–8 | Medium 仍在更新（含《Halftime Show》等短文） | **[一手]**（索引可确认标题与摘要，正文不可抓取） |

**退休的具体口径（[一手]，2019 年《A new chapter》索引摘要）**：

> "In the Fall of 2017, Sue Cooper, my wife, co-founder, and business partner, and I sold our 25-year-old in[dustry-leading...]"
> "I expected that the new owners would want my ongoing participation and assistance in merging the companies. But the acqu[isition...]"
> ——「2017 年秋，我的妻子、共同创始人兼商业伙伴 Sue Cooper 和我卖掉了我们那家 25 年的……」
> 「我原以为新东家会希望我持续参与并协助两家公司整合。但这次收……」——**[一手]**（**首页索引残段，句子被截断，本文件不补足**）

结合《Cashing Out》里 Alan 说「他们一次也没叫过我」，可以确认：他在 2017 年就已经事实上出局，2019 年 8 月只是把这个事实写成公开声明。**[推断]**

### 结果

- **他退了，但没有消失。** 2026 年 9 月他仍在公开平台上高频发言。
- **他近年最锐利的公开立场是关于 AI 与资本**。2026 年 9 月 15 日他评论 Anthropic 一位离职员工的末日论：

> "Jacob Coxon quit his job at Anthropic and made a chilling doomsday pronunciation about the danger of AI. Hmmm, I'm really curious about Coxon's current stock portfolio. I wonder how much money he will make when Anthropic has their IPO..."
> 「Jacob Coxon 辞掉 Anthropic 的工作，就 AI 的危险发表了一篇令人胆寒的末日预言。嗯，我很好奇 Coxon 现在的股票组合。我想知道 Anthropic IPO 的时候他能赚多少……」——**[一手]**（Mastodon，2026-09-15）

同月另一条关于制造业的帖子把「profit over product」定为美国的病根，并以「I always wondered how Rome became Italy. Now I know.」（我一直好奇罗马是怎么变成意大利的，现在我知道了）收尾。

- **2022 年他仍在推进方法层面的工作**：Wipro 采访标题显示他在做「为坏的技术与设计行为建立分类学」这件事——这是 Ancestry Thinking 的延伸形态。

### 事后反思

- **他给自己的定位是「好祖辈」（good ancestor），而不是「行业教父」**。2018 年他的核心比喻：

> "you can't divert the course of the Mississippi River where it's a mile wide, but you can go up to where it's a tiny little rivulet where it starts up in the Rocky Mountains and you can divert the Mississippi with a shovel."
> 「你没法在密西西比河一英里宽的地方改它的道，但你可以往上走到它在落基山里还只是一条小溪的地方，用一把铲子就能把密西西比改道。」——**[一手]**（User Defenders Part II，2018）

- **他对「是否还在写/是否还在设计」的答案是不写设计理论了，写别的**。他 2015 年给 Developer On Fire 的博客链接是「关于书的不常更新的博客」（"Infrequent posts about books"），2016 年之后的 Medium 以随笔、农场、政治与行业评论为主，未见新的方法论著作。**未找到一手来源**说明他是否有未出版的书稿。
- **有一件他明确说不做的事**：他 2016 年说「Cooper U 让我过得不错」，2018 年说 Ancestry Thinking Lab 是个「有抱负的创造物」，2022 年仍在推分类学，2026 年仍在发帖——**贯穿其中的不是设计咨询，是伦理批评**。

### 来源

- Monkey Ranch 官网《The Story》，https://monkeyranch.com/the-story —— **[一手]**
- Narrative, *Cashing Out* · Cooper 夫妻访谈 —— **[一手]**
- Graphic Mint 访谈（2016-06-30）—— **[一手]**
- User Defenders #053 Part I & II（2018-09）—— **[一手]**
- Alan Cooper, *A new chapter*（2019-08-16），https://mralancooper.medium.com/a-new-chapter-7a2e6fce8895 —— **[一手]**，**正文不可抓取**，仅取到首页索引残段
- Alan Cooper, *Defending Personas*（2021-03-09）—— **[一手]**，**正文不可抓取**
- Wipro, *Alan Cooper Wants to Create a Taxonomy for Bad Technological and Design Behavior*（2022-11-29），https://wipro.com/digital/alan-cooper-wants-to-create-a-taxonomy-for-bad-technological-and-design-behavior —— **[一手]**，**正文仅取到首段**，域名存在跨域重定向限制
- Hachyderm Mastodon RSS：https://hachyderm.io/@mralancooper.rss —— **[一手]**（本文件撰写时最后构建时间 2026-09-16）
- CHM 个人页（农业倡导）—— **[二手]**
- Developer On Fire #038（2015-09-23），https://developeronfire.com/podcast/episode-038-alan-cooper-sustainable-innovation —— **[一手]**（章节列表与书单可确认，正文要点未逐字取得）

---

## 决策 10 · 从「设计方法论者」转向「技术伦理批评者」（2014–2026）

> 这是本文件认为**最容易被忽略、但性质最重大**的一次转向，因此单列一条。它没有明确的宣布时点，但有清晰的行为轨迹。

### 背景

2017 年出售公司、2019 年正式退休之后，一个 65 岁以上、已经功成名就、财务自由、住在农场的人，本可以停止公开发言。他没有。

### 他的逻辑

**1. 他把「做产品的人有责任」推到了「不做事也可以有影响」这一步。**

> "I don't expect you to make dramatic life or death stands and say, you know, this feature goes out of the product or I'm quitting, but I do expect you to bring to people's attention the fact that this feature and other just mental model is in fact going to be a problem later."
> 「我不指望你做出戏剧性的生死抉择，说『这个功能要么下架要么我走人』，但我确实指望你把这样一件事提请注意：这个功能以及它背后的心智模型，将来一定会成为问题。」——**[一手]**（User Defenders Part II，2018）

**2. 他的核心工具从「persona / 场景」变成了「三个检查维度」**（Ancestry Thinking 的三条轴）：

- **假设（assumptions）**：产品是在假设上盖起来的，假设必须被回头检验，不能放任漂流。他举的例子是肥皂机认不出黑皮肤的手——那家公司的假设是「我们的员工能代表用户」。**[一手]**
- **外部性（externalities）**：Uber 要求绑信用卡，就是把「没有信用卡的人」外部化了。发布期这么做可能合理，长期留着就是对社会肌理的破坏。**[一手]**
- **时间尺度（timescale）**：看事情不能只看它现在什么样，要看它将来会变成什么样。他据此指控 Zuckerberg「我们被 Facebook 的力量打了个措手不及」是谎话——拿了风投就是承诺要长大。**[一手]**

**3. 他给出的根本诊断是「问责」**：

> "I believe that people are inherently good when they're accountable for their actions, but I believe that people are inherently bad when they're not accountable for their actions. And software is a giant blind. It's a way to hide... and so the bad nature of people comes out."
> 「我相信人在为自己的行为负责时本性是善的；我也相信人在不为自己的行为负责时本性是恶的。而软件是一块巨大的遮羞布，是一种藏身方式……于是人性中坏的那面就出来了。」——**[一手]**（User Defenders Part II，2018）

**4. 他的自我隐喻是奥本海默，不是设计大师。**

> "Robert Oppenheimer... was on a mission of good and he invented the bomb. And when you saw that bomb go off, he went, oh shit... And that's exactly what's happened here in Silicon Valley in the last 20 years. We thought we were building really cool ways to dis-intermediate retail. And it turns out that we were building the next atomic bomb."
> 「奥本海默……是在执行一项善的使命，他造出了炸弹。当他看到那颗炸弹爆炸时，他说：哦，糟了……而这正是硅谷过去二十年发生的事。我们以为自己在造很酷的、去中间化零售的方式。结果我们在造下一颗原子弹。」——**[一手]**（同上）

2018 年他在 UX Australia 的闭幕主题演讲标题就是 **《The Oppenheimer Moment》**。

### 行动

- 2017–2018：共创 Ancestry Thinking Lab；在 UC Berkeley 工程学院开课两期。
- 2018.9：接受两集播客长访谈（User Defenders #053），系统阐述 Ancestry Thinking。
- 2018.8：UX Australia 闭幕主题演讲《The Oppenheimer Moment》。
- 2019.8：发表退休声明，此后不再以设计方法论为主要输出。
- 2021.3：回应 persona 的滥用争议，发表《Defending Personas》。
- 2022.11：向 Wipro 阐述「为坏的技术与设计行为建立分类学」。
- 2023–2026：Mastodon 上持续就 AI、资本、制造业、政治发言。

### 结果

- **影响力层面：明显收窄**。他已经不在设计行业的主要议程里。2018 年他在播客上就是这么自评的：

> "right now it's just mostly me speaking and trying to being lonely voice in the wilderness."
> 「现在主要就是我一个人在说，试图当一个荒野里的孤独声音。」——**[一手]**

- **一致性层面：他所说的和所做的没变过。** 从 1998 年写《Inmates》骂行业不负责，到 2026 年在 Mastodon 上骂 AI 宿命论者持有股票组合，是同一个人在做同一件事。
- **未找到一手来源**：Ancestry Thinking Lab 在 2019 年之后的命运（是否解散、是否改名、是否被资助）。2022 年 Wipro 采访的「分类学」表述提示它可能以某种形式延续，但**本次调研无法确认**。

### 事后反思

- 他在 2018 年已经预判了自己这一类人的处境：**「入侵的轻量级选手」**。

> "with each new advance of technology, more powerful tool sets that come generation by generation, what happens is the old guys... look down their noses... And so I call it the invasion of the lightweights."
> 「每一代新的技术、更强的工具出现时，会发生的是老家伙们……用鼻孔看人……我把它叫做『轻量级选手的入侵』。」——**[一手]**（User Defenders Part I，2018）

紧接着他又指出这个视角本身有问题：他年轻时用 C，看不起 BASIC 程序员——**他把自己归入了「老家伙」这一边，并承认这个立场有其可笑之处。** 这是他公开材料里极少见的、对自己位置的元层面反思。

- 他也承认了「愤怒」这个性格特征的代价与合理性并存的判断（见决策 5）。

### 来源

- User Defenders #053 Part I & II（2018-09）—— **[一手]**（本条目主干）
- Threadreaderapp 对 @RohanIrvine 在 UX Australia 2018（#UXA18）现场直播串的归档，https://threadreaderapp.com/thread/1035413137179127808.html —— **[二手]**，**页面本次不可抓取**，标题信息经检索索引确认
- Wipro 采访（2022-11-29）—— **[一手]**，**正文仅取到首段**
- Hachyderm Mastodon（2026）—— **[一手]**
- **未找到一手来源**：Ancestry Thinking Lab 2019 年后的状态。

---

## 来源统计

### 按可信度

去重后共引用 **36 个独立来源**（同一来源在不同决策条目下重复出现时只计一次）。

| 等级 | 数量 | 清单 |
|---|---|---|
| **[一手]** | **20 个** | ① Retool《Something Pretty Right》 ② Scott Ferguson《The Birth of Visual Basic》 ③ IEEE Annals《Oral History of Alan Cooper》2020（经转引） ④ Graphic Mint 访谈 2016 ⑤ Narrative《Cashing Out》Cooper 夫妻访谈 ⑥ UXpod 访谈 2006 ⑦ Cooper《The origin of personas》2008 ⑧ Atomic Object 访谈 2016 ⑨ Fawcette's / Neil on Software 转载的 Beck–Cooper 2002 对谈全文 ⑩ User Defenders #053 Part I 2018 ⑪ User Defenders #053 Part II 2018 ⑫ Cooper《Defending Personas》2021 ⑬ Cooper《How Far Have We Come?》2018 ⑭ Cooper《Smooth is Fast》2019 ⑮ Cooper《Should Designers Code??》系列 2017 ⑯ Hans-Eric Grönlund《Is agile only for elites?》2008（现场听众记述） ⑰ diginomica · Designit CEO 访谈 2017 ⑱ Monkey Ranch 官网《The Story》 ⑲ Cooper《A new chapter》2019 ⑳ Wipro 访谈 2022；另含 Hachyderm Mastodon RSS（2026，Cooper 原创帖）、Sue Cooper LinkedIn 简介、Teresa Brazen LinkedIn 帖、Developer On Fire #038 页面 —— *注：一手类中 IEEE Annals 与 Cooper 数篇 Medium 文章正文并未直接取得，见下方「可抓取性」表* |
| **[二手]** | **15 个** | ① EvilGeniusLabs《Alan Cooper and Tripod》 ② CHM 博文《2017 CHM Fellow Alan Cooper》 ③ CHM 个人页 ④ UXmatters《Cooper and Cooper U, Part 1》 ⑤ Out of My Gord《An Eulogy for "Kathy"》 ⑥ Tim Strehle 转引 ⑦ UX Magazine《Crossing the Great UX–Agile Divide》 ⑧ Hans-Eric Grönlund《Open-Source is a Sign of Failure》 ⑨ Wipro 新闻稿 2017-10-05 ⑩ The Hindu BusinessLine / VCCircle / LiveMint / Reuters 收购报道 ⑪ Threadreaderapp 归档的 UXA18 现场串 ⑫ 04-external-views.md 已收录的他人书评（Brikman 等） ⑬ 《The Inmates Are Running the Asylum》全书（仅经书评与转引使用） ⑭ Karalyte, *Elevating the Digital Presence of Cooper Professional Education*（2020-03） ⑮ LeadIQ / Owler / Vimeo 等公司条目 |
| **[推断]** | **7 处** | 已在正文逐处标明：决策 2 两处（离开微软的流传说法、口述史自省的定性）、决策 6 两处（UX Magazine 的劳资冲突解读、2018 年对敏捷的尊重语气）、决策 7 一处（CPE 关闭的时点）、决策 9 一处（2017 年已事实出局）。均为对已有材料的推论，非任何来源原话 |

### 按可抓取性（重要限制）

| 状态 | 关键来源 | 影响 |
|---|---|---|
| **✅ 取得全文** | Retool《Something Pretty Right》、EvilGeniusLabs《Alan Cooper and Tripod》、CHM 博文、CHM 个人页、Graphic Mint 访谈（2016）、UXpod 访谈（2006）、User Defenders #053 Part I/II 全文（2018）、Neil on Software 转载的 Beck–Cooper 2002 对谈全文、UX Magazine（2014）、Hans-Eric（2008×2）、Monkey Ranch 官网、Narrative《Cashing Out》Cooper 夫妻访谈、UXmatters《Cooper and Cooper U, Part 1》、Spin/Atomic Object 访谈（2016）、Developer On Fire 页面、Hachyderm Mastodon RSS、Scott Ferguson《The Birth of Visual Basic》、Wipro 新闻稿页、diginomica、The Hindu BusinessLine | 本文件主干 |
| **⚠️ 仅取得残段/索引** | Cooper《The origin of personas》（2008，经两处转引互校后可用）、Cooper《A new chapter》（2019，仅首页残段）、Cooper《Defending Personas》（2021，仅索引）、Cooper《How Far Have We Come?》（2018，仅索引）、Cooper《Should Designers Code??》系列（2017，仅标题与索引）、Wipro 采访（2022，仅首段）、Sue Cooper LinkedIn 简介、Teresa Brazen LinkedIn 帖 | 相关内容已标注，未作超出证据的补足 |
| **❌ 完全无法取得** | **IEEE Annals《Oral History of Alan Cooper》（2020）** — 本文件最重要的一手文献，其引文全部经由 EvilGeniusLabs 系统性转引，存在一层间接性；《The Inmates Are Running the Asylum》全书正文；《About Face》全书正文；Cooper 本人《Why I am called "the Father of Visual Basic"》（仅存 web.archive.org 副本） | **使用这些引文时请勿视为直接引用原始文献** |

### 环境限制说明

本次调研中，以下域名在本执行环境中**无法抓取**（DNS 解析至非公网地址 / 连接失败 / 反爬拦截），已在正文逐处注明：

- `en.wikipedia.org`、`web.archive.org`（DNS 解析至非公网 IP）
- `mralancooper.medium.com` 及 `medium.com`（连接失败 / Cloudflare 拦截）
- `academia.edu`（403）、`infoq.com`（405 人机验证）、`researchgate.net`、`archive.ph`、`freedium.cfd`、`r.jina.ai`（不可达）
- `yourstory.com`（403）、`uxdesign.cc`（Cloudflare）、`dokumen.pub`（连接失败）
- `usmatters.com`、`wipro.com/digital/...`（跨域重定向不被跟随；Wipro 新闻稿根路径可抓）

**因此本文件中的 PDF 类一手文献（IEEE Annals 口述史、《The Inmates》原文、《About Face》原文）均未能直接读取。** 所有引用均来自可抓取的转载、转引或索引残段，可信度已在每处单独标注。

---

## 言行一致性检查

> 逐条比对「他说过的」与「实际做过的」，标注一致 / 存在张力 / 不一致。

### ✅ 高度一致的（六条）

| # | 说法 | 出处时间 | 实际做法 | 判定 |
|---|---|---|---|---|
| 1 | **设计与实现必须分离，不应由同一人完成** | 1982 年向 Digital Research 提出 → 1992 年创业招牌「只做设计咨询，不写程序」→ 2002 年 Triad → 2016 年 Cooper U → 2018 年播客 | 从 1982 到 2018 年，**36 年零转向**。他为此两次放弃写代码（DR 一次未成，1992 年自主实现） | **完全一致**，是他一生最稳定的一条 |
| 2 | **设计必须前置，代码是浇混凝土** | 2002 年 Beck 对谈 → 2008 年 ESRI 演讲 → 2019 年《Smooth is Fast》 | 他把公司建在「先出设计蓝图、客户自己实施」这个模式上，并为此拒绝了大量工程实现类业务 | **完全一致**（Hans-Eric 也注意到：「可以说他把公司押在了这上面」） |
| 3 | **方法论要公开，不该藏私** | 2006 年 UXpod → 2016 年 Graphic Mint（「站到屋顶上把秘密喊出来」）→ 2016 年 Atomic Object | persona、目标导向设计、Cooper U 课程全部对外公开；出版两本书；把内部课程变成公开课程 | **完全一致**（且他承认第一次做错了：拒绝教客户后被客户抛弃） |
| 4 | **persona 是「发现」不是「捏造」，必须基于实地研究** | 2006 年 UXpod → 2016 年 Atomic Object（「大多数人做的是冒牌流程」）→ 2021 年《Defending Personas》 | 他从未为「快速免研究 persona」背书；Cooper U 至今教的是研究驱动流程 | **完全一致** |
| 5 | **钱不是目的，质量是目的** | 2018 年（「profit is a byproduct of quality」）→ 2016 年（「竞争对手是抽钞机」） | 2000 年泡沫中裁到 7 人也未放弃公司；2002 年把最赚钱的「秘方」公开；2017 年出售时拒绝 earnout | **基本一致**，但见下方「存在张力」第 1 条 |
| 6 | **为技术伦理发声、做「好祖辈」** | 1999 年《Inmates》→ 2017 年 Ancestry Thinking → 2018 年奥本海默演讲 → 2022 年分类学 → 2026 年 Mastodon 批 AI 宿命论 | 退休后七年仍在公开批评技术与资本，无商业报酬 | **完全一致**（且这是他退休后唯一持续的主题） |

### ⚠️ 存在张力（三条，原样保留）

**张力 1 · 「钱不是目的」vs「把公司卖了」**

- 他说：质量优先，利润是副产品；批评竞争者是「抽钞机」；说「如果雇主只关心利润，也许你该换个雇主」。
- 他做：2017 年以约 850 万美元把公司卖给 Wipro，且这是 Sue 推动、他配合的主动出售行为。
- **本文件判断**：这不构成不一致。他反对的是「把赚钱当唯一目标」，不是反对退出。他明确说过出售是为了退休（"we both wanted to retire"），并明确反对 earnout——即**拒绝让报酬与后续业绩捆绑**。这恰恰符合他「不做抽钞机」的逻辑。**但这条张力会被批评者反复提起，本文件不替他消解。**

**张力 2 · 「不反对写代码」vs「系列文章的标题就是 No」**

- 他说（2018）：这不是个相关问题；如果你通过写代码获得对动机的理解，「go for it」；我自己就是这么来的。
- 他写（2017）：Medium 系列四篇，标题统一挂 "No"。
- **本文件判断**：他的完整立场是**「不必要，但可以」**，而系列文章的标题用的是**结论式**的 "No"。这是一个**修辞与论证强度的落差**，不是逻辑矛盾。但读者只看标题，就会得到「Cooper 反对设计师写代码」这个比他实际立场更硬的印象。**这个落差是他自己的选择。**

**张力 3 · 「用户无法表达需求」vs「必须研究用户」**

- 他说（2002）：用户和客户都无法说清自己想要什么，也无法在看到时评估它。
- 他说（2006、2016、2018）：必须走出去看用户真正的工作，不能只靠问卷、不能只靠实验室、不能靠自言自语。
- **本文件判断**：两者在逻辑上相容——「不能靠用户说的」和「必须研究用户」可以同时成立（研究的是**目标与动机**，不是**功能需求**）。但这个区分在他 2002 年的对谈中并未充分展开，因此当时被 Kent Beck 抓住了破口（"You're positing that your customer can tell you the correct answer"）。**这是一处他表达得不够严密、给了对手攻击位的地方。**

### ❌ 未发现明显不一致的关键项

- **「愤怒的批评者」这个公开人格 vs 私人行为**：他公开骂程序员「像另一个物种」（他人批评语），但私下与 VB 团队工程师保持联系（Michael Geary 为长期合作者，Gabe Newell 是把他引荐给 Gates 的人），2017 年接受 CHM 口述史时也未点名攻击任何微软同事。**他的攻击对象始终是「结构」和「角色」，不是具体的个人**——这一点在他 2020 年的口述史里表现得尤其明显：他把「让所有人恨我」的责任归给了 Gates 那句话的策略效果，同时也承认了自己「让他们难堪」的事实。
- **「退休」vs「继续发声」**：2019 年宣布退休，此后七年仍在高频公开发言。**这不是不一致**——他宣布的是退出商业与写作，不是退出公共生活。他 2019 年的声明恰恰是在说明「新东家不要我参与，所以我退了」这件事。

### 一处无法判断的

- **他对 Visual Basic 的真实情感**。任务书提到的「给不会编程的人一把枪」「VB 是个错误」这类框架，**本次调研找到的最接近材料是**：(1) 2016 年他对 Atomic Object 说「我们给这些不是我们朋友的人递上了上了膛的武器」——但这句话说的是**大型科技公司**，不是 VB；(2) 他反复引用 Gates 的话和那份卖出权衡，语气是务实的。**未找到任何一手材料显示他公开表达过对 VB 本身的悔意或羞耻。** 本文件对这一项**不作判断**，也不代他补一句他没说过的话。

---

*本文件撰写于 2026 年 9 月。所有事实性陈述均可由正文所列来源核验；标注「未找到一手来源」处，本文件未作任何补足或推测性填充。*
