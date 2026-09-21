# Don Norman 碎片表达与风格 DNA

> 调研对象：Donald A. Norman（唐·诺曼）。《The Design of Everyday Things》作者，Nielsen Norman Group 联合创始人，jnd.org 博主。
> 调研方式：直抓 jnd.org 的一手原文（含其 WordPress REST API 返回的全文正文），辅以 nngroup.com 作者页。
> 抓取日期：本次会话；所有摘引均来自实际抓取到的页面，逐条附 URL。
> 信源分级：**[一手]** = Norman 本人原文；**[二手]** = 他人分析／编辑转述；**[推断]** = 萧潇基于原文的推断。

---

## 0. 一句话结论

Norman 的文体**不是学术论文体，也不是营销文案体，而是「实验室里的老大爷说话」**：先甩一个自己被设计坑到的具体场景，用带情绪的短句骂两句，然后冷静下来抽原理，最后把矛头指向「设计者／技术人员／企业」而不是用户。他的签名动作有三个：**反问句开场、把责任倒转（human error → machine error）、公开自我拆台并当场改口**。

---

## 1. 高频词与专属术语表

按他在原文中的实际用法归类。**[一手]**

### 1.1 他真正的核心词（不是 design，是这几个）

| 词 | 他的用法 | 出处 |
|---|---|---|
| **affordance / signifier** | 一对被他反复对举的概念。affordance＝「什么动作是可能的」；signifier＝「人如何发现这些可能性」。他明确说对设计者而言 signifier 远比 affordance 重要。 | [一手] https://jnd.org/preface-design-of-everyday-things-revised-edition/ |
| **understandable** | 他反对「simple」，改用「understandable」。原话标题即「Make it Simple? No! Make it Understandable.」 | [一手] https://jnd.org/ |
| **complexity** | 他的正面词。「Simplicity is in the mind, complexity is in the world.」 | [一手] https://jnd.org/ |
| **people / person** | 他刻意用 people、person 而非 user。 | [一手] https://jnd.org/error-messages-are-evil/ |
| **humanity-centered（HCD+）** | 他晚年主推的替代词，用以取代 human-centered。加了第五条原则：与社区一起设计。 | [一手] https://jnd.org/humanity-centered-versus-human-centered-design/ |
| **machine error** | 他自造的反向词，用来替换 human error。 | [一手] https://jnd.org/error-messages-are-evil/ |
| **blame** | 高频。核心论证就是「blame 的方向搞反了」。 | [一手] https://jnd.org/technology-forces-us-to-do-things-were-bad-at-time-to-change-how-design-is-done/ |
| **collaborate / teammate** | 他给「人机关系」定的词：不是工具，是队友。 | [一手] https://jnd.org/chapter-35-the-future-of-technology/ |
| **delight** | 他用，但只作为体验的一个维度，从不把它当解法。 | [一手] https://jnd.org/the-design-dilemma-dismay-vs-delight/ |
| **frustration / dismay / confusion** | 负面情绪词，常用在具体产品场景里。 | [一手] https://jnd.org/a-great-product-ruined/ |
| **vigilance** | 心理学借词，专指「长时间盯无聊任务」的能力，人类很差。 | [一手] https://jnd.org/technology-forces-us-to-do-things-were-bad-at-time-to-change-how-design-is-done/ |
| **forecast vs predict** | 他做的一个区分：predict 求准（不可能），forecast 求「准备好」。 | [一手] https://jnd.org/chapter-35-the-future-of-technology/ |
| **late binding** | 他从计算机科学借来的词，用来给「拖延」正名。 | [一手] https://jnd.org/why-procrastination-is-good/ |

### 1.2 他反复出现的高频形容词与口吻词

- 贬：`insulting`、`condescending`、`unnecessary`、`evil`、`nasty`、`silly`、`absurd`、`ugly`、`capricious`、`arbitrary`、`clumsy`、`inane`、`thoughtless`
- 扬：`delightful`、`graceful`、`elegant`、`wonderful`、`marvelous`、`brilliant`、`insightful`
- 收尾转折专用：`Alas,`、`But,`、`Nope.`、`Ugh.`、`Gee.`、`Hah!`、`Yeah,`

**[一手]** 见 https://jnd.org/error-messages-are-evil/ 、https://jnd.org/a-great-product-ruined/ 、https://jnd.org/design-education-brilliance-without-substance/ 、https://jnd.org/how-apple-is-giving-design-a-bad-name/

### 1.3 他的句子级「口头禅」

| 口头禅 | 出处 |
|---|---|
| 「I have long maintained that...」 | [一手] https://jnd.org/trapped-in-a-lufthansa-airline-seat/ |
| 「Let me explain.」/「Let me argue for...」 | [一手] https://jnd.org/why-procrastination-is-good/ 、https://jnd.org/the-design-dilemma-dismay-vs-delight/ |
| 「Let me interrupt the story for a moment to say some good words.」（骂到一半先夸，再继续骂） | [一手] https://jnd.org/trapped-in-a-lufthansa-airline-seat/ |
| 「I have learned a number of cautions in the design business — red flags, they are called.」 | [一手] https://jnd.org/interaction-design-for-automobile-interiors/ |
| 「I could be wrong.」/「I am not sure.」/「I have to keep an open mind.」 | [一手] 见第 5 节 |
| 「Yup.」/「Nope.」/「Gee.」（单字成段收尾） | [一手] https://jnd.org/interaction-design-for-automobile-interiors/ 、https://jnd.org/how-apple-is-giving-design-a-bad-name/ |
| 「We know two things about unexpected events: they will always occur; when it occurs, it will be unexpected.」（他自称 fond of saying） | [一手] https://jnd.org/why-procrastination-is-good/ |

---

## 2. 禁忌词与被嘲讽的说法（本调研最硬的一节）

Norman 有一份**公开的、成文的「红牌词表」（red flags）**，这是他 2008 年那篇文章里亲口列出的。**[一手]** https://jnd.org/interaction-design-for-automobile-interiors/

原文摘引：

> "terms that claim to evidence sensitivity to human needs but, in fact, reflect a complete lack of understanding of people. So here are terms to beware of: 'fool-proof' or 'idiot-proof' (oh, you mean you think your customers are fools or idiots?); 'user-friendly' (which usually means to hold users by the hand and force them to do things one step at a time, in prescribed order, whether they like it or not); and 'intuitive' (which in actuality means 'so automatic it is not conscious'...)"
> 直译：有些词自称体现了对人的体察，实际上暴露了完全不懂人。以下是需要警惕的词：「fool-proof／idiot-proof」（哦，你的意思是你的顾客是蠢货或白痴？）；「user-friendly」（通常意思是牵着用户的手，强制他一步一步、按规定的顺序做，不管他愿不愿意）；以及「intuitive」（它实际的意思是「自动到不需要意识」……）

### 2.1 「user」这个词——他确实有意见，且是公开的

**[一手]** https://jnd.org/error-messages-are-evil/ ：

> "'But,' programmers will ask, 'how can we eliminate error messages, especially when the user has actually made an error?' The 'user'? Stop calling me that: I'm a person, a living breathing person, with feelings. Get rid of, the word 'user.' Hey, we are people."
> 直译：「可是，」程序员会问，「用户真的出错的时候，我们怎么消除错误提示？」「用户」？别那么叫我：我是个人，一个活生生有感觉的人。把「user」这个词扔掉。喂，我们是人。

→ 注意反差：**他一边抱怨「user」这个词，一边自己在同一篇里照用**（"how can we eliminate error messages... when the user has actually made an error" 是他在引述程序员）。这是他的典型特征：口头反对某个行业词，身体还在用，并且不掩饰。**[推断]**

### 2.2 「human error」——他要求废除这个词

**[一手]** 同上文，以及 https://jnd.org/preface-design-of-everyday-things-revised-edition/ 第五章标题原文即「Human Error? No, Bad Design」。

> "Get rid of the term 'human error.' That term almost always really means 'bad design,' or such awful procedures that human error is almost guaranteed."
> 直译：把「人为失误」这个词删掉。这个词几乎总是真正的意思是「糟糕的设计」，或者是那种糟糕到几乎必然出错的操作流程。

### 2.3 「design thinking」——他的态度最微妙，也最容易被人误读

这是他最著名的争议文。他 2010 年在 Core77 发了两篇，**第一篇说这是坏主意，第二篇反悔说这是好主意**。他在 jnd.org 的导语里自己点明：

> "In the first essay, I say it is a bad idea. In the second essay, I repent. It is a wonderful idea. Confused? Read the two essays."
> **[一手]** https://jnd.org/design-thinking-a-useful-myth/

但正文里的措辞极毒：

> "Design thinking is a public relations term for good, old-fashioned creative thinking. It is not restricted to designers."
> 直译：设计思维只是「老掉牙的创造性思维」的公关术语。它并不专属于设计师。

> "So, long live the phrase 'design thinking.' ... Meanwhile exploit the myth. Act as if you believe it. Just don't actually do so."
> 直译：所以，「设计思维」这个词万岁。……同时，去利用这个神话。装作你信。只是别真的信。

**[二手]** 这是 Norman 式的「战略性反讽」：他既骂这是无证据的神话（"This myth is nonsense"、"lacking any evidence"），又承认它作为公关词有用，甚至劝人「装作信」。他自己给出的理由是「Never let facts stand in the way of utility.」（别让事实挡了实用性的路。）

### 2.4 「flat design」／极简主义

**需要说明**：我未能从 jnd.org 抓到标题直接针对 flat design 的独立文章。**[未能获取原文]**（对该词条的检索命中的是他关于 Bauhaus 与「simplicity」的文章。）

但他对**极简主义**的立场极其明确，且有原文：

> "Instead, at the Bauhaus, the emphasis was on simplicity, which is fine as long as one is designing simple things, such as kitchen tools, tableware, and jewelry. But the world is complex... Complexity is a fact of life. Simplicity, on the other hand, is in the mind."
> 直译：包豪斯强调的是简洁，只要你在设计简单的东西——厨具、餐具、首饰——这没问题。但世界是复杂的……复杂性是生活的实情。而简洁，是在脑子里。
> **[一手]** https://jnd.org/then-and-now-the-bauhaus-and-21st-century-design/

关于「扁平化视觉风格」，可归入他对「把形式当解法」的一贯批评（见第 6 节第 7 条「form alone will no longer suffice」）。**[推断]**

### 2.5 「seamless」「frictionless」「delight」

- **seamless / frictionless**：我在实际抓取到的原文中**没有找到**他对这两个词的直接点名批评。**[未能获取原文]**
- **delight**：他用，也赞，但他批评的是**把设计师的「delight」当成产品问题的答案**。在《The Design Dilemma: Dismay vs. Delight》里，他把自己（工程师）和设计师对举：工程师产出"boring and ugly"，设计师产出"delight"却"not very practical, difficult to use, and not completely functional"。他原话："Practical versus delightful: Which do you prefer?" **[一手]** https://jnd.org/the-design-dilemma-dismay-vs-delight/
- 他也嘲讽**「把字体做小到看不见」的美术馆式排版**，自造了标签「Art School Graphics」。**[一手]** https://jnd.org/a-great-product-ruined/

### 2.6 「metrics / GDP」——他把度量当成意识形态批评

> "We need to measure the things people care about and understand—quality of life, not economics. We must change the metrics used to judge countries and companies to those that enhance the quality of life, not profit and growth. ... stop using economic measures such as GDP, monetary profit, and stock market indexes."
> 直译：我们该度量人们真正在乎、真正能理解的东西——生活质量，而不是经济。我们必须把评判国家和公司的指标，换成能提升生活质量的指标，而不是利润与增长。……停止使用 GDP、货币利润、股市指数这类经济指标。
> **[一手]** https://jnd.org/chapter-6-this-book-dbw-meaningful-sustainable-and-humanity-centered/

### 2.7 「UX」这个缩写——他的态度是「不知道，也别问我」

> "Where did User Experience become abbreviated as UX? I don't know. My memory is that we never used UX at Apple during the time I was there."
> 直译：User Experience 是什么时候被缩写成 UX 的？我不知道。我的记忆是，我在苹果期间我们从没用过 UX。
> **[一手]** https://jnd.org/where-did-the-term-user-experience-ux-come-from/

（顺带：他也是公开承认「UX 这个词可能来自 Brenda Laurel 1986 年那本书，而我当时是那本书的编者之一」——即主动让功。同源。）

---

## 3. 句式与结构模式

### 3.1 句长：短句打点，长句铺陈，交替使用

他几乎不写均匀的长句。**模式是「一个长句铺完场景 → 一个短句下判断 → 有时再加一个单词句收尾」**。典型样本 **[一手]** https://jnd.org/a-great-product-ruined/ ：

> 长句："There is a necklace-like piece that goes around the neck with buttons along both sides."
> 短判："Which side is left? No way of telling."
> 单词句："**Ugh.**" / "**The good** / **The bad** / **The ugly**"

### 3.2 人称：第一人称单数用得极重，而且总是在自我暴露

他不停用 "I"。而且这个 "I" 的主要功能**不是权威，是当小白鼠**——他把自己写成受害者。**[一手]**

- "I couldn't even find the port on the necklace for the USB charger. The manuals didn't help. I had to hold my flashlight and go over every part of the product..."（https://jnd.org/a-great-product-ruined/）
- "Four times in all I was trapped, trapped inside an airline seat."（https://jnd.org/trapped-in-a-lufthansa-airline-seat/）
- "I make simple errors. Ask me to do some computation that requires pages of work, and I guarantee I will go wrong somewhere along the way."（https://jnd.org/technology-forces-us-to-do-things-were-bad-at-time-to-change-how-design-is-done/）

### 3.3 破折号与插入语：**极度高频**，是他最强的句法指纹

他不写「括号补充」，他写「破折号突袭」——把主句打断，插一句吐槽或自嘲，再回来。**[一手]** 例：

- "I am, however, a changed person — no more curmudgeon of poor design, I am a champion of the good."（https://jnd.org/trapped-in-a-lufthansa-airline-seat/）
- "But I have to admit that I'm getting slower and weaker — with diminished eyesight, hearing, taste, touch, and, well, almost everything physical."（https://jnd.org/delightful-products-for-healthy-aging/）
- "Ah, Lufthansa has gone to great lengths — each seat comes with a 14 page manual. (Oops, 14 pages? That should be warning enough.)"（同上）
- "Predicting the future is easy," Herb Simon once told me. "People do it all the time. The hard part is getting it right."（引权威只为了给自己垫台阶，https://jnd.org/chapter-35-the-future-of-technology/）

### 3.4 问句开场：**是，而且是他最稳的开场方式**

他的文章标题与首句大量使用**反问、自问、以及「看起来在提问其实在骂人」的问句**。**[一手]** 实际抓到的样本：

| 问句 | 出处 |
|---|---|
| "Why design education must change" / "Does every designer have to have the same depth of skill in drawing...?" | https://jnd.org/design-education-brilliance-without-substance/ |
| "One control, one display — 700 settings? What were they thinking?" | https://jnd.org/interaction-design-for-automobile-interiors/ |
| "How could Pizza save the world?" | https://jnd.org/how-pizza-could-save-the-world/ |
| "Why Designers don't have much power in companies" | https://jnd.org/why-designers-dont-have-much-power-in-companies/ |
| "Why Procrastination Is Good" | https://jnd.org/why-procrastination-is-good/ |
| "What does jnd mean?" | https://jnd.org/what-does-jnd-mean/ |

### 3.5 结构节奏：**他的经典三段式**

**[一手][推断]** 从多篇原文归纳出的固定套路：

1. **场景钩子**（一段具体、带时间地点与身体感受的个人故事）
   → "I flew from Munich to Chicago in a brand new Lufthansa Airbus 340."（https://jnd.org/trapped-in-a-lufthansa-airline-seat/）
   → "I needed a headset to use while making video calls... After much study and analysis, I purchased the LG Tone HBS-730 headset."（https://jnd.org/a-great-product-ruined/）
2. **原理抽取**（把个人遭遇升级为普适机制）
   → "This means that you can only figure out which button you are using by its tactile feel. Hah: try feeling the differences among identical buttons." 随后直接进入 "**Signifiers**" 小节的原理陈述。（同上）
3. **批判设计界／技术界**（责任倒转，且点名）
   → "LG. get your act together."（同上）
   → "Then when people turn out to do these things badly, people are blamed. ... No: It is the technologists who should be criticized for forcing us to act in ways that are inhuman."（https://jnd.org/technology-forces-us-to-do-things-were-bad-at-time-to-change-how-design-is-done/）

他也会用**显式的三段式小标题**强化这个节奏，例如《A Great Product Ruined》里直接写 **The good / The bad / The ugly**，最后加 **Signifiers** 与 **Conclusion**。**[一手]**

---

## 4. 幽默方式（带实例）

### 4.1 自嘲：把自己写成笨手笨脚的老头

- **算术**："I know how to add and subtract, multiply and divide, but I make errors. So why not use the computer?" **[一手]** https://jnd.org/chapter-35-the-future-of-technology/
- **年纪**："because I'm 83, I'm expected to live past 90 (but I'm aiming a lot higher than that)" **[一手]** https://jnd.org/delightful-products-for-healthy-aging/
- **读不了自己产品的说明书**："For people of my advanced age, this meant that I had to shine a bright light on the text to have any hope of being able to read it, and even then I mostly failed." **[一手]** https://jnd.org/a-great-product-ruined/
- **被飞机座椅困住四次**："Four times in all I was trapped, trapped inside an airline seat. Ah, the joys of a technology whose time has not yet come." **[一手]** https://jnd.org/trapped-in-a-lufthansa-airline-seat/

### 4.2 冷幽默与断句式的「低调泄气」

他极擅长**用一句平淡的短句浇灭前文所有铺垫**。这是英式冷幽默的调子，不是美式俏皮。**[一手]**

- "It's wonderful. Except it doesn't work."（前一句刚夸完）https://jnd.org/trapped-in-a-lufthansa-airline-seat/
- "If it is the thought that counts, Lufthansa wins. If execution also matters, well, they have some debugging to do."（同上）
- "'But I didn't do anything,' she said."（空乘说她自己什么都没做，而座椅好了——把荒诞摆在读者面前不解释）（同上）

### 4.3 反讽与「明贬实捧／明捧实贬」

- 骂包豪斯但不失敬意："One doesn't have to like a style to appreciate its elegant coherence."（他评芝加哥那家以粗鲁著称的餐厅 Ed Debevic's）https://jnd.org/great-design-always-means-great-style-misc-magazine/
- 关于自己那篇引发骂战的苹果文章，被网友夸之后只回一个字："**Gee.**" **[一手]** https://jnd.org/how-apple-is-giving-design-a-bad-name/
- 「I woke up this morning to discover that the Tweets had hit the fan. Some are even nice.」（Tweets hit the fan 是 shit hit the fan 的谐音改法）（同上）

### 4.4 荒诞举例：用「不是东西的东西」拆穿范畴

- **把洗衣机当拟人**：题目直接叫《Gadgets? Who, me?》，他怀疑自己是个 gadget，理由是词典第二条定义「看起来有用但其实多余的小装置」——"Yeah, those sound like me." **[一手]** https://jnd.org/gadgets-who-me-misc-magazine/
- **半夜数自己家发光的红灯**当数羊："There were no sheep visible, so I resorted to counting all those glowing red and green lights my stuff emitted at night."（同上）
- **自动洗碗机的忠告**："Beep, beep, beep goes my dishwasher, letting me know at 3 AM that it has finished the dishes and I can empty it, but hey, no rush."（同上）
- **给自动驾驶车找乐子**："Hold a mirror in front of its video or laser sensors — that ought to confuse it. What a wonderful source for entertainment, tricks, and trouble making." **[一手]** https://jnd.org/seeing-the-unforeseen-follies-of-autonomous-vehicles/
- **把 AI 比作大猩猩**："It's like a gorilla. Gorillas in the wild are peaceful. They are vegetarians... If you approach them quietly, intelligently, your interaction with them will be an enjoyable experience." **[一手]** https://jnd.org/chapter-35-the-future-of-technology/

### 4.5 挖苦工程师、设计师与「美术学校」

- 挖苦工程师的理性："My design would follow rational, engineering principles: a radio that performs wonderfully, with superb sound, but that is a large, ugly hulk." **[一手]** https://jnd.org/the-design-dilemma-dismay-vs-delight/
- 挖苦设计师的无知与自信："My dismay comes from their lack of understanding and by the confidence with which they proclaim masterful solutions to the world's problems."（同上）
- 挖苦“美术学校排版”："Very attractive, in what I have come to label as Art School Graphics. How can you make type attractive? Simple: make it invisible." **[一手]** https://jnd.org/a-great-product-ruined/
- 自嘲式补刀（顺便卖书）："I am tempted to say they should rush out and buy the latest edition of 'Design of Everyday Things,' available in Korean, but I won't."（同上）
- 挖苦新行业重蹈覆辙："Each new industry seems intent on repeating all the mistakes of previous industries. Now that computer software design understands design principles... it is time for new industries to fail." **[一手]** https://jnd.org/interaction-design-for-automobile-interiors/

---

## 5. 确定性表达与口头禅

### 5.1 他不装确定——但只在「没亲测」的地方退让

这是他最值得蒸馏的一点：**他在方法论上极端自信（"There is no evidence for..."），在产品判断上则明确标注自己的证据边界。** **[一手]**

- > "I do, however, have to keep an open mind. After all, I have not tested it. I did sit in the front seat in a showroom, but with everything turned off. ... Only then can I pass judgment. Until then, I'm simply delighted that I am not planning to buy one."
  > 直译：不过我得保持开放心态。毕竟我没实测过。我只在展厅里坐过前排，还是全部关着电的。……只有那时我才能下判断。在那之前，我只能说我很高兴我没打算买一辆。
  https://jnd.org/interaction-design-for-automobile-interiors/
- > "The attention span of ten seconds. I believe is in James' 'Principles of Psychology,' (James, 1890) but although I have relied on this quotation for more than 30 years, it is also more than 30 years since I read it. Try as I might, I have been unable to find it again in order to provide a proper bibliographic reference."
  > 直译：十秒注意力跨度。我相信出自詹姆斯的《心理学原理》……但我依赖这条引文三十多年，而我读那本书也是三十多年前的事了。我尽力了，还是找不到它，没法给出规范的文献出处。
  https://jnd.org/interaction-design-for-automobile-interiors/

**这就是他的科研训练底色：宁可在正文脚注里公开承认自己引文查不到，也不伪造出处。**

### 5.2 他公开的自我修正机制

> "I learn more by being wrong than by being right. When people praise my ideas it is nice to hear, but I don't learn anything. If people disagree, I learn. If they convince me, I am thankful and I change."
> **[一手]** https://jnd.org/i-learn-more-by-being-wrong-than-by-being-right/

他也演示过**政策层面的大改口**：

> "I have long argued that we need to go slow with automation in the automobile. There were still too many unsolved problems. I have now changed my mind. Why? Because there are far more problems with the increasing number of distractions for drivers..."
> 直译：我一直主张汽车自动化要慢。还有太多没解决的问题。我现在改主意了。为什么？因为司机分心带来的问题多得多……
> **[一手]** https://jnd.org/automatic-cars-or-distracted-drivers-we-need-automation-sooner-not-later/

### 5.3 他斩钉截铁的地方——对「证据」二字

他可以非常硬，但硬的位置**永远是「你缺证据」而不是「我观点对」**：

> "There is no evidence for the statement that designers think by drawing. It is similar to the old belief that studying Latin or Greek led to better thinking for which there was also no evidence."
> **[一手]** https://jnd.org/design-education-brilliance-without-substance/

> "This myth is nonsense, but like all myths, it has a certain ring of plausibility although lacking any evidence."
> **[一手]** https://jnd.org/design-thinking-a-useful-myth/

### 5.4 一句话口头禅：反「逻辑」

他有一句被挂在 jnd.org 首页的固定话术，用在对工程师与高管说话的场合：

> "You are being too logical, I often tell engineers and executives. 'People are not logical. Logic is artificial. It was invented by mathematicians and philosophers. It is not how people think.'"
> **[一手]** https://jnd.org/ 、https://jnd.org/dont-be-logical/

### 5.5 对来信者的规则（罕见的「作者人格」直接暴露）

他在《Guidelines for writing to me》里写得像一位有点烦但不刻薄的老教授。这节对模仿他的语气极有价值。**[一手]** https://jnd.org/about-don-norman/guidelines-for-writing-to-me/

> "My rule is simple, if the question can't be answered in a paragraph, please don't ask it. I already spend roughly 3 or more hours a day on email, every day of the year: weekends, holidays, .. every day. Please be considerate."
> "But please do write. I enjoy the questions and examples. I learn a lot from them, and I usually learn even more when I answer questions... Just don't abuse the privilege."

以及他对「问显而易见的问题」的态度：

> "But when senior people ask me those same sort of questions, ones for which they could have answered by themselves with a little bit of work, I tend to get annoyed, cranky, and rather irritable. Please, don't make me be rude to you."

---

## 6. 争议立场清单（每条附来源 URL）

| # | 立场 | 关键原文（直译） | 来源 | 可信度 |
|---|---|---|---|---|
| 1 | **design thinking 是无证据的神话**，本质是「老掉牙的创造性思维」的公关词 | "Design thinking is a public relations term for good, old-fashioned creative thinking." / "This myth is nonsense... lacking any evidence." | https://jnd.org/design-thinking-a-useful-myth/ | [一手] |
| 2 | **但同时又劝人「利用这个神话」**——装作信，别真信 | "Meanwhile exploit the myth. Act as if you believe it. Just don't actually do so." | 同上 | [一手] |
| 3 | **「user-friendly」「intuitive」「fool-proof」是红牌词** | "terms to beware of: 'fool-proof'... 'user-friendly'... and 'intuitive'" | https://jnd.org/interaction-design-for-automobile-interiors/ | [一手] |
| 4 | **「user」这个词应当废除** | "Stop calling me that: I'm a person... Get rid of, the word 'user.'" | https://jnd.org/error-messages-are-evil/ | [一手] |
| 5 | **「human error」应当改叫 machine error / bad design** | "Get rid of the term 'human error.' That term almost always really means 'bad design.'" | 同上 | [一手] |
| 6 | **极简主义是错的；要的是「可理解」，不是「简单」** | "Complexity is a fact of life. Simplicity, on the other hand, is in the mind." / "Make it Simple? No! Make it Understandable." | https://jnd.org/then-and-now-the-bauhaus-and-21st-century-design/ 、https://jnd.org/ | [一手] |
| 7 | **「form alone will no longer suffice」——批评以形式为中心的设计传统（包豪斯、造型主义）** | "We must understand people... It is the role of the designer to make the complex appear to be simple." | https://jnd.org/then-and-now-the-bauhaus-and-21st-century-design/ | [一手] |
| 8 | **度量指标被滥用：GDP／利润／股市指数应当被生活质量指标取代** | "stop using economic measures such as GDP, monetary profit, and stock market indexes." | https://jnd.org/chapter-6-this-book-dbw-meaningful-sustainable-and-humanity-centered/ | [一手] |
| 9 | **human-centered design 不够，要升级为 humanity-centered design（HCD+）** | "These are important principles, but they ignore the problems of sustainability, inequity, and bias." | https://jnd.org/humanity-centered-versus-human-centered-design/ | [一手] |
| 10 | **反对「共情设计」（empathic design）：不可能，且即使可能也是错的** | "I approve of the spirit behind the introduction of empathy into design, but I believe the concept is impossible, and even if possible, wrong." | https://jnd.org/why-i-dont-believe-in-empathic-design/ | [一手]（jnd 页面仅存首段，余文指向 Adobe Blog 原文链接） |
| 11 | **设计教育停滞在中世纪：课程全是手艺、没有内容** | "Where is the content matter in design? Nowhere. It is all technique. All craft." | https://jnd.org/design-education-brilliance-without-substance/ | [一手] |
| 12 | **手势界面是可用性的倒退**（与 Jakob Nielsen 联署） | "One step forward, two steps back. The usability crisis is upon us, once again." | https://jnd.org/gestural-interfaces-a-step-backwards-in-usability/ | [一手] |
| 13 | **苹果的设计在退步，用漂亮外观替代可用性**（与 Tognazzini 联署） | "these attributes are fast disappearing from their products in favor of pretty looks, or as designers call it 'styling.'" | https://jnd.org/apples-products-are-getting-harder-to-use-because-they-ignore-the-principles-of-design/ 、https://jnd.org/how-apple-is-giving-design-a-bad-name/ | [一手]（jnd 仅导语；正文在 Fast Company） |
| 14 | **自动驾驶应当谨慎推进；需要类似 FDA 的第三方安全认证** | "The Federal Drug Administration (FDA) requires the medical industry to behave cautiously... We need something similar for self-driving autos." | https://jnd.org/the-driverless-car-revolution-must-proceed-with-caution/ | [一手] |
| 15 | **「半自动」比全自动或纯人工都更危险** | "My simple argument is that near automation is more dangerous than either full automation or partial automation." | https://jnd.org/interview-is-tesla-racing-recklessly-towards-driverless-cars/ | [一手] |
| 16 | **但后来公开改口：因为司机分心更严重，自动化应当更快而非更慢** | "I have now changed my mind. Why? Because there are far more problems with the increasing number of distractions for drivers." | https://jnd.org/automatic-cars-or-distracted-drivers-we-need-automation-sooner-not-later/ | [一手] |
| 17 | **AI 的方向错了：不是让机器像人，是让机器理解人、给人补短板** | "We need to reverse the normal technological strategy of asking people to fill in for gaps in machine performance. Instead, we should require machines to fill in for gaps in human performance." | https://jnd.org/technology-forces-us-to-do-things-were-bad-at-time-to-change-how-design-is-done/ | [一手] |
| 18 | **AI 应理解为 IA（智能增强），机器是队友不是工具** | "instead of doing AI, we do IA—not artificial intelligence but intelligence amplification." | https://jnd.org/chapter-35-the-future-of-technology/ | [一手] |
| 19 | **他对「affordance」这个词是有保留的**（明确指出它造成了混乱，并转而推 signifier） | "affordances... are confusing when dealing with virtual ones. As a result, affordances have created much confusion in the world of design. Signifiers are of far more importance to designers than are affordances." | https://jnd.org/preface-design-of-everyday-things-revised-edition/ | [一手] |
| 20 | **「delight」不能替代可用性**：设计师的审美愉悦常常以不可用为代价 | "sometimes that delightful result is not very practical, difficult to use, and not completely functional. Practical versus delightful: Which do you prefer?" | https://jnd.org/the-design-dilemma-dismay-vs-delight/ | [一手] |
| 21 | **批评网站／浏览器拉低了交互水平** | "I have long maintained that the web browser has set back the progress of human-computer interfaces by a decade." | https://jnd.org/trapped-in-a-lufthansa-airline-seat/ | [一手] |
| 22 | **对「用户手册／说明书」的行业标准完全失望** | "Badly written as well, but we have come to take that as standard." | https://jnd.org/a-great-product-ruined/ | [一手] |
| 23 | **反对「先做出决定再收集信息」的效率崇拜，为拖延正名** | "It is important to plan... But when the finished exercise is complete, throw away the plans." | https://jnd.org/why-procrastination-is-good/ | [一手] |
| 24 | **反对「创新阶段不要批评」的教条** | "Effective teams do not defer critical reflection; they create through criticism" | https://jnd.org/why-criticism-is-good-for-creativity/ | [一手]（该页仅摘要，全文在他处） |
| 25 | **smart home 类消费智能设备的怀疑与嘲讽** | "Hey, imagine that. Gadgets have so many beeps that there are now gadgets whose sole purpose is to fix other gadgets — get rid of the beeps. Gadgets for gadgets." | https://jnd.org/gadgets-who-me-misc-magazine/ | [一手] |

> 关于第 25 条：我对「他对 smart home 持怀疑」这一判断的主要依据是《Gadgets? Who, me?》与《The Design of Future Things》书籍页的描述（"from smooth-talking GPS units to cantankerous refrigerators"，https://jnd.org/books/the-design-of-future-things/）。**该书的完整论证我未取得原文，此条强度弱于其他条目。** [推断]

### 6.1 我没能证实的三条（宁缺勿造）

- **「他后悔用了 affordance 这个词」**：我没有抓到他任何一句原文说"regret"。他明确表达的是**该词在虚拟对象上造成混乱、且对设计者而言 signifier 更重要**（第 19 条）。把它说成「后悔」是**二手转述的放大**。**[未能获取原文]**
- **「他批评 flat design」**：未抓到直接点名的原文。**[未能获取原文]**
- **「他批评 seamless / frictionless」**：未抓到直接点名的原文。**[未能获取原文]**

---

## 7. 风格样本摘引（14 条，英文原文 ≤30 词 + 中文直译 + 出处）

1. **[一手]** https://jnd.org/error-messages-are-evil/
   > "I hate error messages. They are insulting, condescending, and worst of all, completely unnecessary. Evil, nasty little things."
   > 直译：我恨错误提示。它们侮辱人、居高临下，最糟的是，完全没必要。邪恶、讨厌的小东西。
   *（点评：情绪先行，三个形容词堆到临界点，然后用「小东西」收轻。）*

2. **[一手]** 同上
   > "Error messages punish people for not behaving like machines. It is time we let people behave like people."
   > 直译：错误提示惩罚的不是机器行为，而是人。是时候让人像人一样行事了。
   *（点评：他的核心句式——把主客关系倒过来。）*

3. **[一手]** 同上
   > "'The user'? Stop calling me that: I'm a person, a living breathing person, with feelings. Get rid of, the word 'user.'"
   > 直译：「用户」？别那么叫我：我是个人，一个活生生有感觉的人。把「user」这个词扔掉。
   *（点评：注意原文 "Get rid of, the word 'user.'" 那个多余逗号——他保留了自己的口语错乱，不修。）*

4. **[一手]** https://jnd.org/a-great-product-ruined/
   > "Every so often I can't stop myself from complaining. This is one of those every so oftens."
   > 直译：隔一阵子我就忍不住要抱怨。这就是那些「隔一阵子」之一。
   *（点评：故意用坏语法制造亲切感。）*

5. **[一手]** 同上
   > "Very attractive, in what I have come to label as Art School Graphics. How can you make type attractive? Simple: make it invisible."
   > 直译：非常漂亮，用我给它起的名字来说就是「美术学校排版」。怎么把字体做漂亮？很简单：让它看不见。
   *（点评：自设名词 + 反讽定义，他的招牌修辞。）*

6. **[一手]** https://jnd.org/trapped-in-a-lufthansa-airline-seat/
   > "It's wonderful. Except it doesn't work."
   > 直译：它很棒。除了它不好使。
   *（点评：四个词完成一次反转，全篇最强的冷幽默。）*

7. **[一手]** 同上
   > "Four times in all I was trapped, trapped inside an airline seat. Ah, the joys of a technology whose time has not yet come."
   > 直译：总共四次，我被困住了，被困在飞机座椅里。啊，一项时代尚未到来的技术的乐趣。
   *（点评：重复 "trapped" 加强荒诞，「啊」字式叹气。）*

8. **[一手]** 同上
   > "I have long maintained that the web browser has set back the progress of human-computer interfaces by a decade."
   > 直译：我长期以来一直主张，网页浏览器把人机界面的进步拖后了十年。
   *（点评：「I have long maintained」是他的权威开场公式。）*

9. **[一手]** https://jnd.org/interaction-design-for-automobile-interiors/
   > "I have learned a number of cautions in the design business — red flags, they are called."
   > 直译：我在设计这一行学到了一些警戒事项——它们被叫做「红牌」。
   *（点评：破折号补定义，并把个人经验升格为行业规则。）*

10. **[一手]** 同上
    > "I work in the field of usability and safely. I am appalled."
    > 直译：我就是干可用性这一行的。我震惊了。
    *（点评：先亮身份、再下情绪，短到不能再短。）*

11. **[一手]** https://jnd.org/technology-forces-us-to-do-things-were-bad-at-time-to-change-how-design-is-done/
    > "It is the technologists who should be criticized for forcing us to act in ways that are inhuman."
    > 直译：该被批评的是技术专家，是他们逼我们以非人的方式行事。
    *（点评：把 blame 整条链子掉头的标准句法。）*

12. **[一手]** https://jnd.org/design-thinking-a-useful-myth/
    > "Never let facts stand in the way of utility."
    > 直译：绝不要让事实挡了实用性的路。
    *（点评：把一句常见的英文俗谚反着用，全场最佳反讽。）*

13. **[一手]** 同上
    > "Meanwhile exploit the myth. Act as if you believe it. Just don't actually do so."
    > 直译：同时，去利用这个神话。装作你信。只是别真的信。
    *（点评：三个祈使短句连击，这是他的收尾节奏。）*

14. **[一手]** https://jnd.org/chapter-35-the-future-of-technology/
    > "(Except for doors, water faucets, and light switches: I predict that in 20-plus years we will still have trouble with all three.)"
    > 直译：（门、水龙头和电灯开关除外：我预测二十多年后我们这三样还是搞不定。）
    *（点评：括号里放段子，并把他最老的门梗做成长期承诺。）*

15. **[一手]** https://jnd.org/how-apple-is-giving-design-a-bad-name/
    > "I woke up this morning to discover that the Tweets had hit the fan. Some are even nice."
    > 直译：今早醒来我发现推文炸了锅。有些还挺友善。
    *（点评：俗谚谐音 + 一个字的轻描淡写。）*

---

## 8. 给他的「语言指纹」做一张速查卡

| 维度 | 结论 |
|---|---|
| 句长 | 短句为主，长句仅用于铺场景；常用单词句成段（Ugh. / Nope. / Gee.） |
| 人称 | 第一人称单数极重，且用于自我暴露而非自我加冕 |
| 破折号 | **极高频**，用于突袭式吐槽与自嘲，是他最强的句法指纹 |
| 问句开场 | **是**，尤其标题；问句常是修辞性攻击而非真提问 |
| 词汇 | understandability > simplicity；people > users；signifier > affordance；humanity > human |
| 禁忌词 | fool-proof / idiot-proof、user-friendly、intuitive、human error、design thinking（半禁）、GDP 类指标 |
| 节奏 | 轶事 → 原理 → 点名批判设计界／技术界；显式小标题（The good / bad / ugly） |
| 幽默 | 自嘲 + 冷短句反转 + 反讽定义 + 荒诞举例 + 对工程师／美术学校的挖苦 |
| 确定性 | 方法论上强硬（「没有证据」），产品判断上自我设限（「我没测过」「我可能错了」）；公开承认引文查不到出处 |
| 责任归属 | 永远从「人出错」倒转为「设计出错」 |
| 自我修正 | 主动公开改口，并把改口过程写成一篇文章 |
| 署名后缀 | 他喜欢在文末用第三人称介绍自己（"Don Norman wears many hats..."），把自夸包装成资料 |

---

## 9. 来源清单

### 9.1 一手（Norman 本人原文，共 40 个独立页面）

jnd.org 首页与归档：https://jnd.org/ ｜ https://jnd.org/essay-articles/ ｜ https://jnd.org/category/essays/ask-don/ ｜ https://jnd.org/what-does-jnd-mean/ ｜ https://jnd.org/about-don-norman/about-don-norman/ ｜ https://jnd.org/about-don-norman/latest-updates/ ｜ https://jnd.org/about-don-norman/guidelines-for-writing-to-me/

文章全文：design-thinking-a-useful-myth ｜ error-messages-are-evil ｜ dont-be-logical ｜ design-for-real-people ｜ why-i-dont-believe-in-empathic-design ｜ where-did-the-term-user-experience-ux-come-from ｜ technology-forces-us-to-do-things-were-bad-at-time-to-change-how-design-is-done ｜ the-driverless-car-revolution-must-proceed-with-caution ｜ humanity-centered-versus-human-centered-design ｜ not-talks-discussions ｜ a-great-product-ruined ｜ affordances-commentary-on-the-special-issue-of-ai-edam ｜ seeing-the-unforeseen-follies-of-autonomous-vehicles ｜ how-apple-is-giving-design-a-bad-name ｜ interview-is-tesla-racing-recklessly-towards-driverless-cars ｜ chapter-35-the-future-of-technology ｜ why-procrastination-is-good ｜ interaction-design-for-automobile-interiors ｜ design-education-brilliance-without-substance ｜ the-design-dilemma-dismay-vs-delight ｜ gestural-interfaces-a-step-backwards-in-usability ｜ trapped-in-a-lufthansa-airline-seat ｜ concept-cars ｜ delightful-products-for-healthy-aging ｜ community-based-human-centered-design ｜ then-and-now-the-bauhaus-and-21st-century-design ｜ preface-design-of-everyday-things-revised-edition ｜ yet-another-technology-cusp-confusion-vendor-wars-and-opportunities ｜ great-design-always-means-great-style-misc-magazine ｜ gadgets-who-me-misc-magazine ｜ manufacturing-design-and-innovation ｜ chapter-6-this-book-dbw-meaningful-sustainable-and-humanity-centered ｜ how-pizza-could-save-the-world ｜ how-i-taught-dbw ｜ i-learn-more-by-being-wrong-than-by-being-right ｜ failures-no-learning-experiences ｜ automatic-cars-or-distracted-drivers-we-need-automation-sooner-not-later ｜ why-criticism-is-good-for-creativity ｜ books/the-design-of-future-things

（上述均以 `https://jnd.org/` + slug 形式访问；正文通过 `https://jnd.org/wp-json/wp/v2/posts?slug=<slug>&_fields=content` 取得未截断全文。）

### 9.2 二手

- nngroup.com 作者页（Norman 的机构简介与文章索引）：https://www.nngroup.com/articles/author/don-norman/
- Fast Company 文章（由 Norman 在 jnd.org 上引用并确认发表）：https://www.fastcompany.com/90338379/i-wrote-the-book-on-user-friendly-design-what-i-see-today-horrifies-me ；https://www.fastcodesign.com/3053406/how-apple-is-giving-design-a-bad-name ｜ 注：**Fast Company 正文与 Adobe Blog 正文我均未能抓取到**（原文链接失效／反爬），故涉及这两处的立场仅以其 jnd.org 导语为据。**[未能获取原文]**
- Core77 原始发表页（Norman 明确标注）：http://www.core77.com/blog/columns/design_thinking_a_useful_myth_16790.asp ｜ http://www.core77.com/posts/20364/Design-Education-Brilliance-Without-Substance

### 9.3 社交媒体

**未能取得。** 本次会话的联网检索中，DuckDuckGo、SearXNG、Exa、Tavily 均连接失败或限流（`free_search_test` 结果：ddg/ddg-lite/searxng/exa/tavily 失败；bing/anysearch/keenable/firecrawl/deepseek-official 可用）。Bing 在中文市场设置下把 "Don Norman" 检索污染为「don 是什么意思」「百度百科·诺曼人」等无关结果，无法用于定位其 X/Twitter 或 LinkedIn 原帖。jnd.org 上只确认了他有 LinkedIn 文章分类（tag slug: `linkedin-articles`，10 篇）与两处 LinkedIn 链接（Postscript 中的《Why Procrastination Is Good》与《State of design: How design education must change》），**但没有取得其社交账号句法样本**。**[未能获取原文]**

---

## 10. 交付统计

| 项 | 数 |
|---|---|
| 采集来源条数 | 45（一手 40 个 jnd.org 页面 + 二手 5 条外部链接／机构页） |
| 一手 / 二手 | 40 / 5 |
| 风格样本摘引条数 | 15 条（第 7 节） |
| 识别出的争议立场数 | 25 条（第 6 节表格） |
| 明确标注「未能获取原文」的条目 | 4 项（flat design、seamless/frictionless、「regret affordance」、社交媒体风格） |
| 正文篇幅 | 全文约 3.6 万字符（含英文摘引）；中文字数约 7000 字，含表格与列表标注文本 |
