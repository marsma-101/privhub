# jnd.org REST API 抓取的一手原文摘录（第二批）

> 抓取方式（可复用）：jnd.org 是 WordPress，公开 REST API 可绕过页面截断拿未截断全文。
> - 按 slug 批量取：`https://jnd.org/wp-json/wp/v2/posts?slug=<slug1>,<slug2>&_fields=link,title,date,content`
> - 关键词搜索：`https://jnd.org/wp-json/wp/v2/posts?search=<kw>&per_page=20&_fields=link,title,date,content`
> 抓取日期：2026-09-17

---

## A. 《Error Messages Are Evil》——2014-05-10（原发 LinkedIn）

URL: https://jnd.org/error-messages-are-evil/

**⭐ 这篇文章对「文件管理器」这一下游用途几乎是量身定做的：他的核心案例就是改文件名。**

### 核心宣言（原文）
> "Error messages punish people for not behaving like machines. It is time we let people behave like people. When a problem arises, we should call it **machine error, not human error**: the machine was designed wrong, demanding that we conform to its peculiar requirements. It is time to design and build machines that conform to our requirements. **Stop confronting us: Collaborate with us.**"

### 对错误提示的态度
> "I hate error messages. They are **insulting, condescending**, and worst of all, **completely unnecessary**. Evil, nasty little things. They **cause us to do unneeded work, and often destroy the work we have already done**."

### 对「user」一词
> "'But,' programmers will ask, 'how can we eliminate error messages, especially when **the user** has actually made an error?'  The 'user'? **Stop calling me that: I'm a person, a living breathing person, with feelings. Get rid of, the word 'user.' Hey, we are people.** So people make errors? Whose fault is that? Usually its the computer's, the system's, or, in actuality **the people who designed or programmed it**."

### 对「human error」一词
> "Force us to do those things, to act like machines, and of course we will fail. **You call it human error: I call it machine error, or if you prefer, bad design.**"

### ⭐ 完整案例（改文件名被吞掉，直接对应文件管理器场景）
> "I had a file name that I wished to change. Moreover, I decided I wanted it to appear at the top of the alphabetical listing of files, so I decided to make the first character a period (which Apple calls a 'dot'). I carefully typed a long new file name, '. Template for working documents' starting it with a period, believing that this would force the machine to order the file names the way I wanted them to be, not the way it wanted to do it."
>
> "'**Bad, bad**,' says Apple, don't you know better? Starting a file with a dot is our **secret** way of marking system files. You can't do that: start all over again.' And then it **rudely discarded all my work**."
>
> "That's not very helpful, Apple. And here I thought you were the company that understood people. **How am I supposed to know your secrets?** And even if I did do it wrong by your obscure standards, **why did you discard my work? Why not let me fix it?**"

### ⭐ 他给出的「协作式消息」范本（可当写作模板用）
> "Sorry, but you started the file name with 'dot' and files that start with a dot are restricted for system use. You may start with any alphanumeric character or symbol except for dot: **please edit the file name and hit 'save.'**"
>
> 他追加的要求：**"And the stuff I so carefully typed would be there, allowing me to get rid of the offending 'dot' and make any other modification I wished, Right there in the message!"**（即：消息里直接可编辑，不要把用户输入清空）

### ⭐ 更强的要求：前置告知，而不是事后指责
> "That's still not the best way to do things. **A truly collaborative system would tell me the requirements before I did the work. If there are special ways you want stuff entered, tell me before I enter it, not afterwards.** How many times must we endure the indignity of typing in a long string only to be told afterwards that it doesn't fit the machine's whims?"
> （原网页此处 is a typo: "long strong" — 保留原文不改）

### 同类问题清单（他列举的）
- 密码：输入半天才被告知长度不够／缺大小写／缺数字／某字符不允许
- 电话号码与日期：「you are only told the proper format after you have entered it the way the entire world understands except for this computer program, whose programmers wanted it in a way that was the least amount of work for them」

### 行动号召
> "**Cast shame on systems that scold rather than collaborate.** Insist on a people-centered design philosophy."
> "Force people to do inhuman things and they will make errors. (Like not telling them how to do something the way you want until after they do it the way you don't want, so you can scold them.)"

---

## B. 《Humanity-Centered versus Human-Centered Design》——2022-02-26（《Design for a Better World》第 22 章节选）

URL: https://jnd.org/humanity-centered-versus-human-centered-design/
出处：DBW, MIT Press (2023), Chapter 22 "Moving from Humans to Humanity", pp. 181-186

### 为什么要改名
> "The term 'Human-Centered' was developed in the late 1980s and at that time, the focus was primarily on **the individual people** for whom the design was intended. This has many virtues, and it is the dominant approach today. But now, four decades later, we have developed an increased sensitivity to the biases and prejudices against societal groups plus increased concern about the impact that people have had on the environment. The phrase 'Humanity-Centered' emphasizes **the rights of all of humanity and addresses the entire ecosystem** (the term ecosystem includes all living creatures plus the earth's environment)."

### HCD 的四条原则（他的原始表述）
1. Solve the core, root issues, not just the problem as presented (which is often the symptom, not the cause).
2. Focus on the people.
3. Take a systems point of view, realizing that most complications result from the interdependencies of the multiple parts.
4. Continually test and refine the proposed designs to ensure they truly meet the needs of the concerns of the people for whom they are intended.

他对此的批评：
> "These are important principles, but they **ignore the problems of sustainability, inequity, and bias**. In addition, the emphasis is usually on the **immediate issues, not the long-term impact**. In other words, they describe the way we did things in the past, not the issues in this book, and not the way we need to do things in the future."

### HCD+（Humanity-Centered）的五条原则
1. Solve the core, root issues, not just the problem as presented
2. Focus on **the entire ecosystem** of people, all living things, and the physical environment
3. Take a **long-term**, systems point of view — "many of the most damaging implications upon society and the ecostructure only reveal themselves years or even decades later"
4. Continually test and refine to meet the concerns of the intended people
5. **Design with the community, and as much as possible support designs by the community.** The professional designer community should serve as **enablers, facilitators, and resources**

他给 IxDF 的定义（自引）：
> "Humanity-centered design represents the ultimate challenge for designers to help people improve their lives. Where 'human-centered' puts a face to a user, 'humanity-centered' expands this view far beyond: to the societal level of world populations who face hordes of highly complex and interrelated issues that are most often tangled up in large, sophisticated, 'human-caused' systems."

---

## C. 《The Four Fundamental Principles of Human-Centered Design and Application》——2019-07-23

URL: https://jnd.org/the-four-fundamental-principles-ofhuman-centered-design-and-application/
（部分内容取自 DOET 2013 第 6 章；另与 Norman & Spencer 2019 世界政府峰会演讲重合）

### 原则 1：Understand and Address the Core Problems
> "Solve the fundamental, underlying issues, not the symptoms... Ask 'why?' at each issue. **When the answer is 'human error,' keep going: why did the error occur, what could have prevented it?**"
>
> 他列出的「核心问题」常见来源：**人们对整个系统的复杂性缺乏理解**、资源与激励结构错配、**工作环境的干扰**——「frequent interruptions, conflicting requirements, overly-complex technology, and the need for multiple transitions among technologies systems, and people leading to continual interruptions as well as lack of complete communication between elements.」

### 原则 3：Use an Activity-Centered Systems Approach（**对密集界面最关键的一节**）
> "Design must focus upon **the entire activity** under consideration, not just isolated components. Moreover, activities do not exist in isolation: They are components of complex sociotechnical systems. **Fixing or improving a small, local issue is often beneficial, but local optimization can result in sub-optimal global results.** Focusing upon support of the activities is more important than optimization of the individual components."
>
> "Systems involve multiple complex feedback and feed-forward loops, some with time delays measured in days or months."

### ⭐ 关于「理解」与「误解」的区分（对 AI/自动化界面的核心洞见）
> "Modern automated technology can provide powerful answers, but its operations is often **impenetrable (opaque)** to both experts and affected citizens. This reduces faith and trust in the results. **We need systems that provide understandable explanations.**"
>
> "Note that **over-trust can be more dangerous than under-trust.**"
>
> ⭐ "An important component of explanation is the existence of an easy to understand and interpret **conceptual model** of the system, for without a good model, there is apt to be misunderstanding or incomprehension. (**A misunderstanding can be worse than a lack of understanding, because in the first case, people do not recognize that their view is erroneous, whereas in the second case, they know that they do not know.**)"
>
> ⭐ "**Conceptual models do not have to be completely accurate. The models simply have to be 'good enough' to guide appropriate behavior, even if oversimplified.** In similar fashion, complex systems do not need a single, comprehensive model: **there can be different conceptual models for different aspects of the system.**"

### 关于大型复杂系统（DesignX）
> "Complex systems cannot be treated in the same way as traditional design projects, which tend to be small and self-contained (e.g., **a device, an interface, a procedure**)."
>
> DesignX（Norman & Stappers 2016, *She Ji*）结论："the major challenges did not come from a lack of understanding of the issues, but rather **the complexity of implementation**, when political, economic, cultural, organizational, and structural problems overwhelm all else."
>
> 方法：small, incremental steps；"**These designs satisfice rather than optimize**"；与 Lindblom 的 "muddling through"（渐进主义）相关。
>
> ⭐ "This approach requires **tolerance for existing constraints and trade-offs**, and a **modularity that allows for measures that do not compromise the whole**."
> （**对插件化架构的模块化设计，这是他能给出的最接近的原始依据。**）

---

## D. 《Gestural Control: The Good, the Bad, and the Ugly》——2014-03-20

URL: https://jnd.org/gestural-control-the-good-the-bad-and-the-ugly/ （LinkedIn 专栏摘录）

> "**gestures are the new form of command-line interfaces. They have to be memorized.** Worse, they lack the power of the old command lines. We went from far too many alternatives and commands of menu-based systems to the **highly oversimplified capabilities** of today's gesture systems."
> （**可直接映射到「快捷键 / 隐藏手势 / 图标栏无文字标签」的评审。**）

> "Yes gestures are fun. I enjoy them. And yes, some gestures are natural. But **how many? I would say a handful — around five.** How learnable are the non-natural gestures? More importantly, **how many different gestures can you easily learn, retain, and use appropriately.**"

> "every method of controlling devices has strengths and weaknesses. Good old-fashioned **levers, knobs, and buttons are often the best way to control physical devices. Mice, menus, and keyboards have their virtues**, as do pen-based and gestural systems. **In the ideal world we would have a choice of methods.**"

> "The most powerful systems will give us the choice to use whatever is best suited for the job."

关键结构性小节标题：**The Good / The Bad / The Ugly / The Future**（他的招牌结构）

---

## E. 《Stupid Smart Stuff: Watches and Automation》——2014-03-08

URL: https://jnd.org/stupid-smart-stuff-watches-and-automation/

### ★ 一句可直接引用的判据
> "**Whenever you see something labeled 'smart' or 'intelligent,' be assured that it is actually rather stupid.**"

### ⭐ 关于「通知不该打扰」与「同一信号表达不同含义」（对通知/状态设计极关键）
手表半夜 4:30 震动，只为告知电量耗尽：
> "If the watch was so smart, why didn't it tell me at 9 PM that it was low on energy and that I should put it on the charger overnight."
>
> "the Sony designers, bless them, thought that it was important to tell me every time the watch connected or lost the connection. As a result my wrist was always being vibrated. A single powerful vibration, whether for connecting or losing the connection. First of all, **why did I need to know?** Second, **if I really needed to know, wouldn't it have been better to signify whether the connection was being made or broken instead of using the same signal for both?**"
> （**同一条：一个信号不能同时表达两种状态——正是 signifier 的判定标准。**）

### ⭐ 关于自动化的失效方式（可映射到「自动保存 / 自动同步 / 后台任务」）
> "In commercial aviation, the smart automated systems are also stupid... Something goes wrong with the airplane, but the intelligent, automatic systems compensate. **No need to bother the pilots. But the wrong thing gets worse and worse until the automation reaches the limit of its compensatory abilities. 'OK, I give up,' it says, and lets the plane start to crash.**"
> （**这就是「静默自动纠错 → 突然崩盘」模式；对文件管理器的自动同步/冲突解决、插件自动行为是直接适用的警告。**）

### 关于「人不能长时间监视」（vigilance）
> "It is a myth that people can maintain control when they have nothing to do for a long period. This myth is well understood in the military and in commercial aviation: **it has been studied for well-over 50 years in the field of vigilance.**"
>
> "In the airplane, the pilots are not attending, but when trouble does arise, the extremely well-trained pilots have **several minutes** to respond. In the automobile, when trouble arises, the ill-trained drivers will have **one or two seconds**."

### 收尾（他的典型收束）
> "We now have very smart devices, stupidly done. I fear the consequences will be a lot worse than waking people up at 4:30 in the morning. **Pay attention, engineers: pay attention, designers. Pay attention or people will be killed.**"

---

## F. 《Why Criticism Is Good for Creativity》——2019-07-22（与 Roberto Verganti 合著，原发 HBR）

URL: https://jnd.org/why-criticism-is-good-for-creativity/
原出处：Verganti, R., & Norman, D. (2019, July 16). *Harvard Business Review*.

### ⭐ 对「设计评审该怎么开」的直接可用规则：Yes, but, and
> "One of the most popular mantras for innovation is 'avoid criticism.' ... Aversion to criticism has significantly spread in the last 20 years, especially through the advocates of design thinking. (In 1999, in the ABC Nightline video 'The Deep Dive,' which ignited the design thinking movement, criticism was stigmatized as negative.) **In IDEO's online teaching platform, the first rule of brainstorming is 'defer judgment.'**"
>
> "We challenge this approach. It encourages **design by committee** and infuses a superficial sense of collaboration that leads to **compromises and weakens ideas**. Our view... is that **effective teams do not defer critical reflection; they create through criticism.**"
>
> **"We therefore propose a different approach: the rule of 'Yes, but, and.'"**
> - "Yes, but" 单独不行：创新点子常有重大缺陷，用缺陷杀掉点子会错过伟大创新
> - "Yes, and" 单独不行："without critical feedback, you would hardly understand why your original idea did not work... **It's moving forward without progress.**"
> - "Yes, but, and"：先指出缺陷并给建设性反馈（but），再给出改进后的方案（and）
> - ⭐ "**Note that the 'but' anticipating the 'and' is essential.**"

### 具体评审话术规范（可直接当团队规约）
> - "When you see a weakness in the idea, don't simply say, 'This does not work.' Rather, **first explain the problem and then propose an improvement that would make it work.**"
> - "When you do not understand the idea, don't simply say, 'That's unclear to me.' Instead, **first point to the specific spot that is unclear and then propose possible alternative interpretations: 'Do you mean X or Y?'**"
> - "When you like the idea, do not just take it as it is. Instead, **search for possible improvements** and then push forward to make it even better."

### 被批评方（作者方）的规范
> "when you listen to someone's critique of your idea, you should try to learn from it... wonder, 'Why is my colleague suggesting this contrasting view that is not in line with what I see? **Perhaps there is an even more powerful idea hidden behind our two perspectives.**'"

### 理论依据
> 引 Charlan Nemeth 关于 dissent 的研究："debate and criticism do not inhibit ideas; rather, they stimulate them. **Progress requires clashing and fusing — not compromising or postponing — different perspectives.**"
> 引 Francesca Gino：批评只有在导向改进时才有效；关键在于 "respectful listening and acknowledgment of the talent and abilities of colleagues"。⭐ "**When the 'but' becomes an attack on the other idea (or even worse, on the other person), then the result is detrimental.**"

收尾：
> "When conducted with curiosity and respect, **criticism becomes the most advanced form of creativity**. It can be fascinating, passionate, fun, and always inspiring."

---

## G. 《Design for real people》——2018-11-11（极短，但句子核心）

URL: https://jnd.org/design-for-real-people/

全文核心：
> "**We must design for people the way they are, not the way we wish them to be.**"
> 关联链接：「Don't be logical」；以及一句补充：**"Half the people in the world are below average."**

---

## H. 《Where did the term User Experience (UX) come from?》——2023-04-15

URL: https://jnd.org/where-did-the-term-user-experience-ux-come-from/

### 他在 Apple 的实际作为（一手，价值高）
> "When I joined Apple in 1993, my first title was 'Apple Fellow,' which was a very high position that gave me absolute freedom to do anything I wished."
>
> "I realized that **Apple's great reputation for ease of use and understanding was slowly eroding.** So I proposed to my boss, the Vice President of the *Advanced Product Group* (ATG) that I try to do something about this. I asked two people from ATG to join me — **Tom Erickson and Harry Saddler**. After considerable discussion, we named ourselves **The User Experience Architect's Office**, and I took the title of **Apple's User Experience Architect**."
>
> ⭐ "We actually did make a difference. Harry helped restructure the design process, I got the already existing user interface design group several large increases in head count, and eventually **the three of us changed Apple's product process so that User Experience was put on an equal status with Engineering and Marketing.**"
>
> "**No product could be approved without approval of all three requirements documents: User experience, marketing, and engineering.** And the final specification, in similar fashions, had three different documents. All had to be approved, with equal weight to all."
>
> "That was easier than it might sound, because all three groups worked collaboratively. I was delighted that when I visited the working groups, **I could not tell who was a programmer, a marketing person, or a user experience person** because they all worked together in harmony."
>
> "Somewhat later, the VP of ATG was promoted, and so I moved into that position. And because all Apple Fellow's reported to the VP of ATG, **I reported to myself**, along with **Gary Starkweather, Alan Kay, Guy Kawasaki, and even Steve Wozniak.**"

### 「UX」缩写的来源（他承认自己不知道，并主动让功）
> "Where did User Experience become abbreviated as UX? **I don't know. My memory is that we never used UX at Apple during the time I was there.**"
>
> 他引 Bing ChatGPT 找到的更早来源：Brenda Laurel, "Interface as Mimesis", in *User Centered System Design* (eds. Norman & Draper, 1986), ch.4, p.69：
> *"But in seeking design principles for good interfaces, we must, it seems to me, concern ourselves with the best case, and ask, not what the users are willing to endure, but what the ideal **user experience** might be, and what sort of interface might provide it."*
>
> ⭐ "**I clearly was aware of Brenda's insightful work and writing.**... Did the phrase 'User Experience' come from Brenda, and then resonate in my mind until being resurrected at Apple? That sounds very plausible to me. **I am delighted to give Brenda credit.**... Others have pointed out that although Brenda used the phrase, to describe an important attribute, **our group at Apple was the first to use it as a title of an activity. True, but still.**"
>
> 另注：⭐ 《User Centered System Design》书名是**为了缩写凑成 UCSD** 而起的——"The title of the book was invented so that its acronym (UCSD) matched the acronym formed by the name of the university (UCSD)."

---

## I. 其他已定位但未抓全的 jnd.org 文章（按相关性排序，供后续增量更新用）

| 标题 | slug / URL | 日期 | 为什么值得抓 |
|---|---|---|---|
| Then and Now: The Bauhaus and 21st century design | /then-and-now-the-bauhaus-and-21st-century-design/ | 2017-12-24 | 他对「简洁 vs 复杂」最集中一次论述，含对包豪斯极简主义的批评 |
| Systems Theory | /systems-theory/ | 2023-03-31 | 系统思维（DBW 相关） |
| Power of Incrementalism | /power-of-incrementalism/ | 2022-09-07 | 渐进主义 |
| Why Procrastination Is Good | /why-procrastination-is-good/ | — | late binding；反效率崇拜 |
| How Apple is Giving Design a Bad Name | /how-apple-is-giving-design-a-bad-name/ | 2015-11-10 | 与 Tognazzini 联署，苹果可用性退步论 |
| Apple's products are getting harder to use… | /apples-products-are-getting-harder-to-use-because-they-ignore-the-principles-of-design/ | 2015-08-10 | 同上 |
| Design, business models, and human-technology teamwork | /design-business-models-and-human-technology-teamwork/ | 2017-01-17 | 人机协作（IA 而非 AI） |
| The Future of Design | /the-future-of-design-when-you-come-to-a-fork-in-the-road-take-it/ | 2016-04-23 | 设计未来 |
| People-Centered (Not Tech-Driven) Design | /people-centered-not-tech-driven-design/ | 2019-07-26 | |
| Interaction Design for Automobile Interiors | /interaction-design-for-automobile-interiors/ | 2008 | **「红牌词表」原文出处（fool-proof / user-friendly / intuitive）** |
| Design Thinking: A Useful Myth | /design-thinking-a-useful-myth/ | 2010 | design thinking 双层反讽 |
| A Great Product Ruined | /a-great-product-ruined/ | — | 「Art School Graphics」；signifier 案例 |
| Trapped in a Lufthansa Airline Seat | /trapped-in-a-lufthansa-airline-seat/ | — | 最精彩的冷幽默样本 |
| Design Education: Brilliance Without Substance | /design-education-brilliance-without-substance/ | — | 设计教育批评 |
| Why I Don't Believe in Empathic Design | /why-i-dont-believe-in-empathic-design/ | — | 反对共情设计 |
| Automatic Cars or Distracted Drivers | /automatic-cars-or-distracted-drivers-we-need-automation-sooner-not-later/ | — | 公开改口样本 |
| I Learn More by Being Wrong Than by Being Right | /i-learn-more-by-being-wrong-than-by-being-right/ | — | 自我修正机制 |
