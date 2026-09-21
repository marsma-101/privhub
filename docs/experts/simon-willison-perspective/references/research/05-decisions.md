# Simon Willison 重大决策、转折点、争议与言行一致性

> 蒸馏聚焦方向：**「把 LLM 当成极快但会自信说错的协作者」+ 可运行验证兜底**
> 调研时点：2026-09（以 simonwillison.net 官网 tags / series 页的一手原文为主）
> 信源分级：`[一手]` = 他自己的叙述 / 代码 / commit / 项目文档；`[二手]` = 第三方报道或他人转述；`[推断]` = 萧潇据证据作的推理，非他本人表态
> 全文刻意区分「**他声称的做法**」与「**可验证的实际做法**」，并把两者冲突处单独列出（见 §7）

---

## 0. 一句话结论（供快速判读）

他真正的护城河不是"会用 LLM"，而是**一套不依赖信任的验证回路**：能跑就一定要跑、能留痕就一定留痕、能沙箱就一定沙箱、说不清的地方就承认"我不知道怎么解"。他的所有重要决策都可归到这条轴上——凡是他能把结果变成"可运行、可复现、可审计"的，他就激进（YOLO mode、并行 agent、vibe coding）；凡是验证不了的，他就保守（prompt injection 只做减法、拒绝给"已解决"结论、公开说"我不知道怎么办"）。`[推断]`

---

## 1. 关键决策清单（时间序）

### 1.1 【2003–2005】离开堪萨斯报社后仍把 Django 的源头留在报纸里
- **背景**：2003 年他在英国读大学期间申请了 Lawrence Journal-World 的"工业实习年"（受 Adrian Holovaty 招募），在报社用 Python 重写 CMS。
- **他的逻辑**：想跟着 Adrian 做事的方式走（Web Standards、CSS、干净的 URL）。
- **实际动作**：2003 年赴美实习；2004 年离开报社；2005 年 7 月 Django 由留在报社的团队开源，他作为联合创作者的署名来源是这段实习。`[一手]`
- **事后反思**：他在 20 周年回顾里明确写"我们一开始并不知道自己在造一个 web framework，我们叫它 'the CMS'"。`[一手]`
- **来源**：https://simonwillison.net/2022/Jun/12/twenty-years/
- **时间点**：2003-08 / 2005-07

### 1.2 【2006–2009】从"通用后端"转向"数据新闻"
- **背景**：2006–2008 在伦敦《卫报》（Guardian）任开发者，这是他自认"第一个真正的数据新闻角色"。
- **他的逻辑**：之前在报社大部分时间在写 CMS；到 Guardian 后他把重心放在**把数据本身公开**。
- **实际动作**：2009 年 3 月上线 Datablog（也称 Data Store）与 Guardian Open Platform（开放 API，至今仍在运营）；同年主导 MP expenses 众包审阅项目（第二轮 12 月上线并写下完整复盘）。
- **事后反思**：他写"Google Sheets 足够启动这个项目，但我一直想要一个不那么专有的方案，试过 CouchDB"——这份未解决的别扭，多年后成了 Datasette 的动因。`[一手]`
- **来源**：https://simonwillison.net/2022/Jun/12/twenty-years/ ；https://simonwillison.net/2009/Mar/10/openplatform/ ；https://simonwillison.net/2009/Dec/20/crowdsourcing/
- **时间点**：2009-03 / 2009-06 / 2009-12

### 1.3 【2010–2013】结婚、辞职、旅行，意外做成 Lanyrd 并被 Eventbrite 收购
- **背景**：2010-06-05 与 Natalie Downe 结婚，双双辞职去环球旅行。
- **实际动作**：走到摩洛哥卡萨布兰卡时"不小心一起创办了创业公司"；2010-08 上线 Lanyrd（用 Twitter 登录的社交会议目录）；进 Y Combinator；融资；搬伦敦；招团队。2013 年被 Eventbrite 收购，整个团队连同家眷从伦敦搬到旧金山。
- **事后反思**：他承认这段期间"博客被放到后排好几年"（2010–2017 近乎停更）；Lanyrd 站点后来因维护/安全成本与垃圾信息被关停，他如实写明原因。`[一手]`
- **来源**：https://simonwillison.net/2022/Jun/12/twenty-years/ ；https://simonwillison.net/2010/Aug/31/lanyrd/
- **时间点**：2010-08 / 2013

### 1.4 【2017】重启博客：捡回七年空白
- **背景**：创业 + Eventbrite 导致近 7 年几乎不写博客。
- **实际动作**：2017-10 决定重启；把散落在 Quora、Ask Metafilter 的内容爬回来（2017-10-01）；再从 Internet Archive 补回数据库备份里缺失的内容（2017-10-08）。
- **他的逻辑**："在某处写过的东西，不代表你不该把它重新发到自己拥有的站点上。" `[一手]`
- **来源**：https://simonwillison.net/2017/Oct/1/ship/ ；https://simonwillison.net/2017/Oct/8/missing-content/
- **时间点**：2017-10

### 1.5 【2019-09】离开 Eventbrite，进 Stanford JSK Fellowship——职业转折的真正拐点
- **背景**：2013 加入 Eventbrite 后做到 engineering director。`[一手]`（官网 About 页自述）
- **他的逻辑**：想把 Datasette 及其生态做成"给小媒体也能用的数据新闻工具"；把"让数据新闻可复现"当成对抗谣言、建立读者信任的手段。
- **实际动作**：2019 年 9 月正式入职 JSK 一年期 fellowship，全职做 Datasette 生态；同年 9 月 13 日开始连载 weeknotes（当时 128 篇，用于在"没有全职工作结构"的情况下自我问责）。
- **事后反思**：他明确写了**"fellowship 结束后就没有报酬，但仍持续全职投入"**——这是"独立开源开发者"身份的起点，不是终点。`[一手]`
- **来源**：https://simonwillison.net/2019/Sep/10/jsk-fellowship/ ；https://simonwillison.net/2022/Jun/12/twenty-years/ ；https://simonwillison.net/about/
- **时间点**：2019-09

### 1.6 【2022-06 / 2022-09】从"玩 GPT-3"到发明「prompt injection」这个词
- **背景**：2022-06 他发了 Twitter 投票问大家为何没试过 GPT-3，最高票答案是"我不知道怎么用"，于是他写了入门教程。2022-09-12 Riley Goodside 演示了针对 GPT-3 的注入攻击，他随后把这个漏洞类命名为 **prompt injection**（类比 SQL injection）。
- **他的逻辑**：
  - LLM 无法可靠区分"指令来自哪里"——所有 token 最终被拼进同一个序列。`[一手]`
  - 安全防御必须能达到"接近 100%"才叫防御；99% 等于迟早被绕过。`[一手]`
- **实际动作**：2022-09-12 定义术语；2022-09-16 发《I don't know how to solve prompt injection》公开承认无解；2022-09-17 发《You can't solve AI security problems with more AI》否掉"用 AI 防 AI"这条路。
- **事后反思**：2023-12-31 他写"15 个月过去，遗憾地说我们对这个问题依然没有一个稳健、可靠的解决方案"；2025-04-09 写"我知道这个问题的存在已超过两年半，仍然没有令人信服的缓解手段……我不知道该建议什么"。四年后（2026）他仍在重复这个判断。`[一手]`
- **来源**：https://simonwillison.net/2022/Sep/12/prompt-injection/ ；https://simonwillison.net/2022/Sep/16/prompt-injection-solutions/ ；https://simonwillison.net/2022/Sep/17/prompt-injection-more-ai/ ；https://simonwillison.net/2023/Dec/31/ai-in-2023/ ；https://simonwillison.net/2025/Apr/9/mcp-prompt-injection/
- **时间点**：2022-06 → 2022-09

### 1.7 【2023-04-04】造 LLM CLI：把"问模型"变成可管道、可留痕的命令
- **背景**：当时已有不少 CLI 竞品，他自己说"`llm` 大概没有那些替代品有用"。
- **他的逻辑（为什么是 CLI、为什么必须记日志）**：
  - 他自陈定位优势：懂 LLM API + Python CLI（Click）+ 插件系统（Pluggy）三者交叉的人不多，他是最有资格做"插件化 LLM CLI"的人之一。`[一手]`
  - **默认把所有 prompt 和 response 记入 SQLite**（`logs.db`），任何一次调用都可以事后翻出来看、搜索、用 Datasette 浏览。`[一手]`
- **实际动作**：2023-04-04 首个版本；初期就在 `~/.llm/log.db` 落库；后续演进为**内容寻址（content-addressed）**的 threads/turns/messages/parts 四层表，消息 hash 用 BLAKE2b（`b2:` 前缀标明算法），**父消息 hash 参与自身 hash**，因此相同前缀的两次会话自然折叠成共享行、fork 几乎零成本。
- **可验证性**：`llm logs path`、`llm logs -q`（FTS5 搜索，prompt 命中权重高于 response）、`--no-log` / `llm logs off` 可关闭、`llm logs backup`（底层 `VACUUM INTO`）。文档明写"哈希只依赖消息内容与它在链中的位置，所以重放同一段对话会产生完全相同的四个 hash"——这是**可复现性契约**，不是营销话术。`[一手]`
- **事后反思**：他在 2025-05-27 承认工具（tool use）功能拖了太久，原因是"一年前模型侧的工具调用还不够成熟，我没信心设计出跨厂商的抽象层"——即他宁可晚做也不早做错。`[一手]`
- **来源**：https://simonwillison.net/2023/Apr/4/llm/ ；https://llm.datasette.io/en/stable/logging.html ；https://simonwillison.net/2025/May/27/llm-tools/ ；https://simonwillison.net/2024/Jun/17/cli-language-models/
- **时间点**：2023-04 → 持续

### 1.8 【2023-03-27】确立"AI 让我更敢想"的投入判据
- **他的逻辑（两条判据，可复用）**：
  1. 这项技术能否让我做出**本来做不出来的东西**？
  2. 它能否把某些项目的成本压低到**从"不值得做"翻过临界点变成"值得做"**？
- **实际动作**：用 ChatGPT 写出拦截 `window.fetch()` 的脚本 + Starlette CORS 代理（他手改了一处 `content-length` bug），把 ChatGPT 会话 JSON 存进 Datasette Cloud；为此专门申请了只对两张表有 `insert-row` / `update-row` 权限的细粒度 token。
- **可验证性**：他贴了完整 gist 转录与最终代码，包括那个 token 是**表级最小权限**而不是全库权限。`[一手]`
- **来源**：https://simonwillison.net/2023/Mar/27/ai-enhanced-development/
- **时间点**：2023-03

### 1.9 【2024-2025】模型迁移的实际行为
- **可验证迁移轨迹**（据各文正文自述）`[一手]`：
  - 2023-03：ChatGPT（GPT-4）+ GitHub Copilot 为主要工具。
  - 2024-03–2024-08：Claude 3 Opus / Claude 3.5 Sonnet 成为主力；`files-to-prompt` 是"完全用 Claude 3 Opus 做出来"的。2024-08 的 django-http-debug 是"大部分由 Claude 写的 Django app"。
  - 2024-10–12：大量使用 **Claude Artifacts**（沙箱 iframe）做一次性小工具。
  - 2025-03：明确写"我主要直接用 ChatGPT 和 Claude 的网页/应用界面，因为这样我能清楚知道上下文里到底进了什么；**把上下文对我隐藏起来的 LLM 工具效果更差**"。同期主力模型：Claude 3.7 Sonnet（开 thinking）、o3-mini-high、GPT-4o + Code Interpreter；长上下文首选 `gemini-2.0-pro-exp-02-05`（当时免费）。
  - 2025-09/10：日常主力变成 **Claude Code（Sonnet 4.5）+ Codex CLI（GPT-5-Codex）+ Codex Cloud**（异步、常从手机发起）。
  - 2025-10-20：用 Claude Code 在 NVIDIA Spark 上"暴力"跑通 DeepSeek-OCR，耗时 40 分钟 + 3 次追加 prompt，他在吃早饭。
  - 2025-12：用 Codex CLI + GPT-5.2 在 4.5 小时内把 JustHTML 从 Python 移植到 JavaScript（他自己用了 **vibe porting** 这个词）。
  - 2026-01：说"自从 Claude Opus 4.5 与 GPT-5.2 出来后，我手写的代码降到总产出的个位数百分比"。
  - 2026-07：`sqlite-utils 4.0rc2` "大部分由 Claude Fable 写"（约 $149.25）；同期 `sqlite-utils 4.0` 发布（该项目的第 124 个 release，自 2020-11 的 3.0 之后第一次大版本跳）。
  - 2026-08：本机（128GB）跑本地模型做代码问答，用自写的 `llm-coding-agent` 插件跑 Muse Glimmer / Qwen3.6-27B 等 open weights。
- **本地 vs API 的实际取舍**：本地模型主要用来做**代码库问答与轻量 agent 试跑**（Qwen 27B 级别，他反复说是"很好的笔记本尺寸"）；真正的生产级编码 agent 工作仍走 Claude/Codex。`[一手]`
- **来源**：https://simonwillison.net/2025/Mar/11/using-llms-for-code/ ；https://simonwillison.net/2025/Oct/5/parallel-coding-agents/ ；https://simonwillison.net/2025/Oct/20/deepseek-ocr-claude-code/ ；https://simonwillison.net/2025/Dec/15/porting-justhtml/ ；https://simonwillison.net/2026/Jan/8/llm-predictions-for-2026/ ；https://simonwillison.net/2026/Jul/5/sqlite-utils-fable/ ；https://simonwillison.net/2026/Jul/7/sqlite-utils-4/ ；https://simonwillison.net/tags/local-llms/
- **时间点**：2023 → 2026

### 1.10 【2025-03-02】反直觉判断：代码里的幻觉最不可怕
- **背景**：开发者常见抱怨——LLM 编造不存在的方法/库，因此否定 LLM 写代码。
- **他的逻辑**：一跑就报错，报错本身就是免费的强验证；真正的风险是**编译器/解释器抓不到的错误**。而且"代码看起来很棒"（好变量名、可信注释、清晰类型标注）会让人放松警惕。
- **实际动作（可验证的红线）**：他明确写下"**运行代码、看它是否工作**是开发者自己的责任；如果连跑都没跑就在用 LLM 写代码，你到底在干什么？"；并反对"要我 review 每一行还不如自己写"的说法，指出这等于承认自己没练过读别人的代码。`[一手]`
- **注意**：他在这篇里附了"我让 Claude 3.7 Sonnet 审我早期草稿"的分享链接——**他会用 LLM 审稿，但不让 LLM 署名**（见 §7 张力项）。
- **来源**：https://simonwillison.net/2025/Mar/2/hallucinations-in-code/
- **时间点**：2025-03

### 1.11 【2025-03-11】公开自己的完整 AI 编码工作流（最有价值的一手材料）
- **他的核心心智模型**：**"一个过度自信的结对编程助手，查资料极快、随手能吐例子、做无聊活不抱怨"**；"over-confident 是关键词——它们绝对会犯错，有时细微，有时巨大"。
- **可验证的实际做法**（逐条来自原文）：
  1. **刻意选库**：因为训练截止日期，他有意挑稳定、流行、示例多的库（"boring technology"），创新只留给自己项目的独特卖点。
  2. **管上下文**：主要用 ChatGPT / Claude 网页界面，因为"能看清上下文里进了什么"；开新对话就是清空上下文，**对话不好用时的解法常常是重开**。
  3. **两段模式**：研究阶段用开放式提问（"Rust 有哪些 HTTP 库？给用法示例"）；进入生产代码后**转为威权模式**——像"数字实习生"，给函数签名，让模型填函数体。
  4. **必须测**：唯一不能外包给机器的事就是"验证代码真的能跑"。
  5. **优先选能跑代码的工具**：ChatGPT Code Interpreter（Kubernetes 沙箱、**不能联网**）、Claude Artifacts（严格锁定 iframe）。他说"我根据能否安全运行并迭代代码来选核心 LLM 工具"。
  6. **承认自己在 vibe coding**：`simonw/tools` 仓库 77 个 HTML+JS 应用 + 6 个 Python 应用**全部由 LLM 提示生成**；并给了成本实测：colophon 页面首轮 Claude Code 花 **$0.61 / API 5m31s / 墙钟 17m18s**，第二轮（GitHub Pages 工作流）**$0.1788 / 44.6s API**。
  7. **实测到人必须接管的具体节点**：GitHub Actions 出现两个并发 deploy，他"放弃 LLM、去读文档"，然后自己在 GitHub Pages 设置里把 "Deploy from a branch" 改成 "GitHub Actions"。他的原话：**"该人类接手时就接手"**。
- **事后反思**：他给出明确的预期管理——如果有人说"用 LLM 写代码很简单"，那是在（大概无心地）误导人；他自己是靠 25 年经验才把这些边角摸出来的，"如果我是在写 Linux 内核驱动——我几乎一无所知的领域——我的流程会完全不同"。`[一手]`
- **来源**：https://simonwillison.net/2025/Mar/11/using-llms-for-code/
- **时间点**：2025-03

### 1.12 【2025-03-19】划界：vibe coding ≠ 负责任的 AI 辅助编程
- **他的"金规则"**：**只要我无法向别人清楚解释这段代码在做什么，我就不会把它提交进我的仓库。**（这条是他全部行动的伦理支点）`[一手]`
- **实际动作**：给出 vibe coding 的适用边界清单——低风险、不涉密、不做坏网络公民、**钱不能悬在线上**（他用"有人在没有账单上限的 API 上 vibe code，刷出几千美元"举例）。
- **来源**：https://simonwillison.net/2025/Mar/19/vibe-coding/
- **时间点**：2025-03

### 1.13 【2025-05-27】LLM 0.26 加入工具调用——同时把风险写进文档
- **他的逻辑**：工具调用是"扩展语言模型能力最有效的单一方式"，但**"把工具暴露给 LLM 是有风险的"**。
- **实际动作（可验证的克制）**：
  - `llm-tools-sqlite` 明确只给**只读 SQL 查询**权限。
  - 内置工具只有 `llm_version()`、`llm_time()` 这种无害的。
  - 官方文档 `tools.html` 顶部直接放 **"Warning: Tools can be dangerous"** 段落，点名 prompt injection 与 lethal trifecta。
  - 文档建议插件用 `llm keys set` + `llm.get_key()` 读密钥，**理由是"避免密钥被作为 tool call 的一部分记进数据库"**——把凭据纪律直接编码进 API 设计。
  - 文档明确 MCP 规范里的 "SHOULD 保持 human in the loop" 应当**当作 MUST 来对待**。`[一手]`
- **来源**：https://simonwillison.net/2025/May/27/llm-tools/ ；https://llm.datasette.io/en/stable/tools.html ；https://simonwillison.net/2025/Apr/9/mcp-prompt-injection/
- **时间点**：2025-05

### 1.14 【2025-06-16】提出「lethal trifecta」——把安全问题压缩成一个可判定的三要素
- **背景**：厂商反复以"补丁"方式修单个产品；他要把问题抽象成结构。
- **他的逻辑**：三者同时具备（① 能访问私有数据 ② 能接触不可信内容 ③ 具备对外通信能力）= 攻击者可稳定偷数据。**唯一可靠的解法是砍掉三条腿中的一条**，而不是指望 guardrail。
- **实际动作**：
  - 公开对"护栏类产品"表达深度怀疑："它们几乎总会自信地声称拦住了 95% 的攻击——但在 web 应用安全里，95% 是彻底的不及格。"`[一手]`
  - 建立**持续追踪的公开证据链**：在 `exfiltration-attacks` 与 `lethal-trifecta` 两个 tag 下累计收录数十起真实案例（ChatGPT 插件 2023-05、Google Bard 2023-11、Writer.com 2023-12、Amazon Q 2024-01、NotebookLM 2024-04、GitHub Copilot Chat 2024-06、Slack 2024-08、Grok 2024-12、Claude iOS 2024-12、ChatGPT Operator 2025-02、GitHub MCP 2025-05、GitLab Duo 2025-05、EchoLeak/M365 Copilot 2025-06、Supabase MCP 2025-07、Google Antigravity 2025-11、Claude Cowork 2026-01 …）。`[一手]`
  - 到 2026-06，OpenAI 上线 Lockdown Mode（切断外发请求这条腿），他的反应是"这看起来很好"，但同时指出：**lockdown mode 的存在本身说明 ChatGPT 默认设置下并不能稳健防护**。`[一手]`
- **来源**：https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/ ；https://simonwillison.net/tags/lethal-trifecta/ ；https://simonwillison.net/2026/Jun/5/openai-help-lockdown-mode/
- **时间点**：2025-06 → 至今

### 1.15 【2025-09-30】给"设计 agentic loop"命名，并给出 YOLO 的三条风险
- **他的定义**：LLM agent = **"在循环里跑工具以达成目标"**（tools in a loop）。
- **实际动作（可验证的具体做法）**：
  - 明确列出无人值守 YOLO 的三类风险：坏 shell 命令、数据外泄（源码与环境变量里的密钥）、把你的机器当跳板去打别人。
  - 明确给出三选项并表态：沙箱（Docker / Apple container，"尽管存在 container escape，我认为对多数人是可接受的风险"）；用别人的电脑（**"这是我的最爱"**，常用 GitHub Codespaces；也用 Codex Cloud、ChatGPT/Claude 的 Code Interpreter）；"就赌一把"（"大多数人选这个"）。
  - **凭据收缩的具体手法（这是最硬的一手证据）**：他为了追查一个 Fly.io scale-to-zero 应用冷启动慢的问题，**专门新建了一个 org、设 $5 预算上限、签发只能在那个 org 内建改 app 的 Fly API key**，然后把 Claude Code 放进去跑。`[一手]`
  - 反对用 MCP 作为首选扩展方式："我更倾向于以 shell 命令而不是 MCP 来思考问题，编码 agent 跑 shell 命令真的很在行"；改用 `AGENTS.md` 给一两行示例命令。`[一手]`
- **来源**：https://simonwillison.net/2025/Sep/30/designing-agentic-loops/
- **时间点**：2025-09

### 1.16 【2025-10-05】接受并行 agent——但先说了自己为什么怀疑
- **背景**：他起初明确怀疑并行 agent："AI 生成的代码需要 review，review 速度自然是瓶颈……同时开更多只会让我更落后。"
- **他的逻辑转折**：他区分了任务类型——**研究/概念验证、解释现有代码、小维护、以及"由我自己写了详尽规格"的改动**可以并行；只有"别人凭空丢过来的代码"才吃 review 成本。
- **实际动作（可验证）**：
  - 多终端窗口，Claude Code 与 Codex CLI 跑在不同目录；**在确信恶意指令无法潜入上下文的任务上用 YOLO mode**。
  - 需要在同一 repo 里隔离跑两个 agent 时，他**开一份全新 checkout（常在 `/tmp`）**，而不是 git worktree（他当时还没采用 worktree）。
  - 风险更高的任务改用异步 agent（通常是 Codex Cloud），理由是"最坏情况只是源码被泄"——而他**明确允许它有网络访问**，并自陈理由：**"我做的大多是开源的，所以这对我不是大问题。"** `[一手]`
  - 他在这篇里自己写下待办：**"我需要开始习惯把本地 agent 跑在 Docker 容器里，以进一步限制爆炸半径。"** `[一手]`（→ 见 §7 的诚实缺口）
- **来源**：https://simonwillison.net/2025/Oct/5/parallel-coding-agents/
- **时间点**：2025-10

### 1.17 【2025-10-07】造词「vibe engineering」，随后主动放弃这个词
- **实际动作**：造词并提出"AI 会奖励既有的顶级工程实践"清单（自动化测试、先规划、好文档、好版本控制习惯、CI/自动化、code review 文化、一种"很奇怪的管理工作"、强手工 QA、强研究能力、preview 环境、判断什么能外包、被更新的估算能力）。
- **事后反思（重要的自我修正样本）**：2026-02-23 他在同一篇文章顶部加了 Update：**"看来 'Agentic Engineering' 这个词胜出了"**，并另开 tag 与写作计划。`[一手]`
- **来源**：https://simonwillison.net/2025/Oct/7/vibe-engineering/ ；https://simonwillison.net/2026/Feb/23/agentic-engineering-patterns/
- **时间点**：2025-10 → 2026-02

### 1.18 【2025-10-22】公开把自己最尖锐的矛盾摆上台：《Living dangerously with Claude》
- **形式**：他在 Claude Code Anonymous 的演讲，两页 slide 直接对着干——"为什么你**应该**永远用 `--dangerously-skip-permissions`"（全场欢呼）→"为什么你**绝不**该用 `--dangerously-skip-permissions`"（全场不欢呼）。
- **他的逻辑**：YOLO 模式下 Claude Code"感觉像完全不同的产品"；但风险真实存在，因为**"任何能把 token 塞进你上下文的人，都应被视为完全控制你的 agent 下一步跑什么工具。"**
- **实际动作（可验证的取舍）**：
  - 他给出的唯一可信解法：**沙箱**。并指出"最好的沙箱是跑在别人的电脑上"。
  - 拆解两个难点：文件系统（简单）、网络访问（极难）；**切断网络 = 切断 lethal trifecta 的外泄腿**。
  - 他亲自读了 Anthropic 的 `sandbox-runtime` 实现并让 Claude 帮忙合成示例，指出 macOS 上关键机制是 `sandbox-exec`，且**该命令自 2017 年起就被苹果标记为 deprecated**，但仍是 Mac 上最方便的方式——他希望苹果重新考虑。`[一手]`
  - 他自己在文中的坦白：**"我不觉得 coding agent 的沙箱实现已经有足够有说服力的文档让我信任它们。"** `[一手]`
- **来源**：https://simonwillison.net/2025/Oct/22/living-dangerously-with-claude/
- **时间点**：2025-10

### 1.19 【2026-01-08】对 2026 的公开预测：包括对自己失败记录的承认
- **实际动作**：在 Oxide and Friends 年度预测节目上给出 1/3/6 年预测，其中 1 年预测三条与我们方向直接相关：
  1. "LLM 写不出好代码"这个说法在 2026 年将无法维持——**"在 2023 年，说 LLM 写的代码是垃圾完全正确；2024 大部分时间仍然如此；2025 变了，但你还情有可原；到 2026 年，LLM 生成代码的质量将变得无法否认。"** `[一手]`
  2. **"今年我们会解决沙箱问题。"**——"到了 2026 年我还在 `pip install` 陌生代码然后执行到它能偷走我所有数据、删掉我所有文件，这太疯狂了。"`[一手]`
  3. **"我们该来一场关于编码 agent 安全的'挑战者号事故'了。"**——"包括我在内的这么多人，几乎是把这些编码 agent 当 root 在跑……每次没事我就想'哦没事'。"`[一手]`
- **最诚实的部分**：**"每半年我都预测一次'即将出现一个上头条的 prompt injection 攻击'，每半年它都没发生。这是我最新版本的那次预测。"** `[一手]` —— 这是他自己记录在案的、重复失效的预测，属于"言行一致性"里难得的自曝。
- **来源**：https://simonwillison.net/2026/Jan/8/llm-predictions-for-2026/
- **时间点**：2026-01

### 1.20 【2026-04-05】`scan-for-secrets`：把"凭据不外泄"的焦虑做成工具
- **背景**：他喜欢公开本地 Claude Code 会话转录，但**"经常偏执地担心某个 API key 之类的东西可能不小心出现在详细日志里"**。
- **实际动作**：自建 `scan-for-secrets`（0.1），支持把密钥传进去扫目录，且**不只扫字面量，还扫各种常见编码形式**（反斜杠转义、JSON 转义等）；配置文件里列出他日常要防的密钥获取命令，包括 `llm keys get openai/anthropic/gemini/mistral` 和从 `~/.aws/credentials` 取 `aws_secret_access_key`。构建方式本身也是样本：**README 驱动开发**（先写好 README，再丢给 Claude Code 用 red/green TDD 实现）。`[一手]`
- **来源**：https://simonwillison.net/2026/Apr/5/scan-for-secrets-3/ ；https://github.com/simonw/scan-for-secrets
- **时间点**：2026-04

### 1.21 【2026-06-05 / 2026-08-08】对"厂商宣布解决了 prompt injection"的态度
- **2026-06**：OpenAI 上线 Lockdown Mode，他认可其机制（**确定性、不由可被攻陷的 AI 来判定**），但同时点出：**"Lockdown Mode 的存在反而说明 ChatGPT 默认设置下并不能稳健防护足够坚定的数据外泄攻击。"** `[一手]`
- **2026-08**：Anthropic 宣称 auto mode 在 72 个间接注入场景、720 次攻击尝试中"零成功"，Thariq 说"我们本该把这篇文章叫做 defeating the lethal trifecta"。他的回应是**既不接受也不否认**：他明确说"我很想相信"，但要求更多独立验证，并当场构造了一个 auto mode 大概挡不住的场景（恶意第三方包在 README 里教 agent 先 `uvx fetch-model-files .` 再跑测试）；结论是**"我个人因此更受激励去钻研一种能让 agent 不接触会造成伤害的数据与工具的运行方式。"** `[一手]`
- **来源**：https://simonwillison.net/2026/Jun/5/openai-help-lockdown-mode/ ；https://simonwillison.net/2026/Aug/8/auto-mode/
- **时间点**：2026-06 / 2026-08

### 1.22 【2026-09-11】把前沿模型引入自家安全审计流程
- **背景**：Datasette 发布 1.0a39 / 0.65.4 安全补丁，问题由 Sevban Dönmez、Alex Garcia 报告。
- **实际动作**：他用 **Claude Fable 5.1、GPT-5.6、GPT-6 Astra** 三模型跑了一次广泛审计，然后**与 Alex Garcia 花近一周协作 review 修复**；分工方式是一人在共享私有仓库里先写暴露问题的自动化测试、另一人实现修复——**"这确保每个问题都与两个独立的人四目相对，此外还有我们跑不同模型的编码 agent。"** 并宣布"今后所有开发工作都会纳入前沿模型的安全审计"。`[一手]`
- **来源**：https://simonwillison.net/2026/Sep/11/datasette-security/ ；https://datasette.io/blog/2026/september-security-releases/
- **时间点**：2026-09

---

## 2. 他实际的 AI 编码工作流（只列可验证的部分）

| 环节 | 可验证的实际做法 | 证据 |
|---|---|---|
| 选库 | 因训练截止日期，**刻意选老库/稳定库**（boring technology），把创新留给项目独特卖点 | 一手，2025-03-02 / 2025-03-11 |
| 接口 | 主要用 **ChatGPT / Claude 网页与应用界面**，理由是"我要能看清上下文里进了什么"；明确说"把上下文对我隐藏的工具更差" | 一手，2025-03-11 |
| 提示法 | 研究阶段开放式提问 → 生产阶段**威权模式**：给函数签名 + 精确规格，让模型填实现与 pytest 测试 | 一手，2025-03-11 |
| 迭代 | 不把首轮结果当失败，当起点；"重写一下"从不被抱怨；**对话卡住就开新会话** | 一手，2025-03-11 |
| 验证 | **必须自己跑**。明确写"如果你连跑都没跑就在用 LLM 写代码，你在干什么"；并承认"说'要我 review 每一行不如自己写'的人，是在宣告自己没练过读别人的代码" | 一手，2025-03-02 / 2025-03-11 |
| 工具选择 | **按"能否安全运行并迭代代码"来选核心 LLM 编码工具**；偏好沙箱执行环境（Code Interpreter 不能联网、Claude Artifacts 锁定 iframe） | 一手，2025-03-11 |
| 回滚/接管 | 具体案例：发现 GitHub Actions 双 deploy 后**放弃 LLM、自己读文档、自己改 GitHub Pages 设置**；后续 `<br>` 混进 href 的 bug 用一次 11 分钱的 Claude Code 会话修 | 一手，2025-03-11 |
| 成本感知 | 逐次记录成本（$0.61 / $0.1788 / 11 美分 / $149.25 / Bun 重写约 $16.5 万），并把价格做成公开站点 llm-prices.com | 一手，2025-03-11 / 2026-07-05 / 2026-07-08 |
| 并行 | 多终端跑 Claude Code + Codex CLI；同 repo 隔离用**全新 checkout（常在 /tmp）**；未采用 worktree | 一手，2025-10-05 |
| 规格先行 | 他反复强调"代码由我自己写了详尽规格的，review 成本低得多"——这解释了为什么他敢并行 | 一手，2025-10-05 |
| 本地模型 | 本机（128GB）跑 27B 级 open weights 做代码库问答/轻量 agent 试跑；用自写 `llm-coding-agent` 插件 | 一手，2026-08 / tags/local-llms |
| 审计 | 用三个前沿模型交叉跑安全审计，但**人类复核不可省**（他与 Alex Garcia 互换角色） | 一手，2026-09-11 |

**「声称」与「可验证」的差别**：上表全部来自他贴出的命令行、成本数字、gist 转录、commit 链接、项目文档——不是理念宣言。他关于"必须测试"的说法，可以用 `simonw/tools` 仓库里每个 HTML 应用的 commit history 直接核到提示转录链接（他自己维护的 colophon 页面就是干这个的）。`[一手]`

---

## 3. 安全与凭据相关决策

### 3.1 他明确"拒绝做"的东西（可查证的克制）
- **拒绝把"用更多 AI 防 AI"当成安全方案**：2022-09-17 专门写一篇否掉；2025-08 再次重申"这不可能 100% 可靠，因此作为安全防御完全没用"。`[一手]`
- **拒绝给"prompt injection 已解决"背书**：2026-08 面对 Anthropic 的"零成功"评测，他的回应是"我想相信，但要看更多独立验证"，并立即构造反例。`[一手]`
- **拒绝在文档里淡化工具风险**：LLM 官方文档顶部放强制警告段，而非脚注。`[一手]`
- **拒绝把密钥写进日志**：`llm keys set` + `llm.get_key()` 的设计意图就是"避免密钥被记进数据库"；另建 `scan-for-secrets` 自查要公开的转录。`[一手]`
- **拒绝授权过大的凭据给 agent**：Fly.io 案例——专用 org + $5 预算上限 + 限定 org 内建改 app 的 key。`[一手]`
- **拒绝在没有 human-in-the-loop 的地方暴露会做的工具**：建议把 MCP 规范里"SHOULD 保持人在环中"**当作 MUST**。`[一手]`
- **未核实**：他是否有过"因为 prompt injection 风险而砍掉某个已规划功能"的公开记录。检索到的资料中**未见**这类明确表述；他更多是"加警告 + 收窄权限 + 要求沙箱"，而不是"不做这个功能"。`[存疑]`

### 3.2 Datasette / LLM 项目里的安全取舍
- **LLM CLI**：SQLite 工具插件只给**只读**查询；日志默认全量落库但可关（`llm logs off` / `-n`）；内容寻址使历史可校验（`LogStore.verify()` 会重读实际字节，文件被改/删会报 broken hash 而不是静默通过）。`[一手]`
- **Datasette**：2026-09 用三个前沿模型审计 + 双人交叉复核后发 0.65.4 / 1.0a39 补丁，明确提示"在公网运行、且**同时混有公开表与私有表**的实例必须升级"。`[一手]`
- **博客站点本身**：由 Django 自建，托管 Heroku，PostgreSQL 备份成 JSON 推到 GitHub 仓库，再部署成 Datasette 实例——**他的博客内容本身是可被 SQL 查询的**，这与他"可复核"的取向一致。`[一手]`

### 3.3 披露纪律（这是他安全观的一部分）
- 官网 Disclosures 段落自陈：**不为写特定主题收钱**；2026-02 起接受每周文字横幅赞助但赞助方不干预编辑内容；Datasette Cloud 部分工作由 Fly.io 赞助；每周一天为 Prime Radiant（Jesse Vincent 的应用 AI 研究实验室）工作；是 PSF 董事会成员；是 GitHub Star（无薪）；2023 年被 GitHub Accelerator 付过费。
- **他主动标出的唯一例外**：OpenAI 曾为他在 GPT-5 预览活动中投入的时间付费（用于一个视频），除此之外未要求编辑见解或控制权（只要求遵守 embargo）。`[一手]`
- 他自陈**未接受过 LLM 厂商的付款**，但经常在 NDA / embargo 下预览新产品，包含免费 API 额度与活动邀请。`[一手]`

---

## 4. agent 自主性的红线（他实际画在哪）

按"允许 agent 自跑到什么程度"从宽到严排列：

1. **完全放开（YOLO / `--dangerously-skip-permissions`）**：条件是"我确信恶意指令无法潜入上下文"，且任务本身是研究/概念验证/小维护/我写了详尽规格的改动。`[一手，2025-10-05]`
2. **放开但换机器**：高风险任务改走异步 agent（Codex Cloud 等），因为"最坏情况只是源码被泄"，而他的代码多为开源。`[一手，2025-10-05]`
3. **放开但收窄凭据**：需要真实凭据时——专用组织 + 预算上限 + 最小权限 key。飞书 Fly.io 案例是模板。`[一手，2025-09-30]`
4. **放开但在沙箱里**：Docker / 别人的电脑 / Code Interpreter（无外网）/ Artifacts（锁死 iframe）；网络出口白名单是关键。`[一手，2025-10-22]`
5. **不放开的**：他明说"**我还没见过足够令人信服的文档让我信任 coding agent 自带的沙箱实现**"；以及需要他手工 QA 的所有验证环节。`[一手，2025-10-22]`
6. **他自认尚未做到的红线**：**"我需要开始习惯把本地 agent 跑在 Docker 容器里。"**（2025-10 写下）`[一手]`——到 2026-01 他仍在说"包括我在内的这么多人几乎是把 agent 当 root 在跑"。

---

## 5. 职业转折点（时间轴）

| 时间 | 转折 | 他给的理由 / 结果 | 来源 |
|---|---|---|---|
| 2003-08 | 赴美，Lawrence Journal-World 实习 | 想跟 Adrian Holovaty 做事；用 Python 重写报社 CMS → 日后 Django | 一手 2022-06-12 |
| 2004 | 离开报社回英国 | Django 2005 由留任团队开源 | 一手 2022-06-12 |
| 2006–2008 | 伦敦《卫报》开发者 | 自认"第一个真正的数据新闻角色" | 一手 2022-06-12 |
| 2009-03 | Datablog + Guardian Open Platform 上线 | 把故事背后的数据公开 | 一手 2009-03-10 |
| 2009-06/12 | 主导 MP expenses 众包审阅 | 他自称职业生涯最自豪的项目之一 | 一手 2009-12-20 |
| 2010-06 | 结婚、双双辞职去旅行 | — | 一手 2022-06-12 |
| 2010-08 | 意外创办 Lanyrd，进 YC | "在卡萨布兰卡意外一起开了家公司" | 一手 |
| 2013 | Lanyrd 被 Eventbrite 收购，团队搬旧金山 | — | 一手 |
| 2013–2019 | Eventbrite，最终任 engineering director | 自陈此间博客近乎停更 7 年 | 一手 About / 2022-06-12 |
| 2017-10 | 重启博客，回填 Quora / Metafilter / Internet Archive 内容 | — | 一手 2017-10-01 / 2017-10-08 |
| 2019-09 | **离开 Eventbrite，进 Stanford JSK Fellowship** | 全职做数据新闻开源工具（Datasette 生态） | 一手 2019-09-10 |
| 2019-09-13 | 开始连载 weeknotes | "没有全职工作的结构了，用它自我问责" | 一手 |
| 2020 起 | fellowship 结束，**无报酬继续全职做 Datasette** | 靠 GitHub Sponsors、Mozilla MIECO（2023-24）、GitHub Accelerator（2023，有付费）、Datasette Cloud 赞助、咨询/培训、EthicalAds、X 创作者分成等支撑 | 一手 About / 2022-06-12 |
| 2026-02 起 | 接受每周文字赞助横幅；每周一天给 Prime Radiant | 自陈赞助方不影响编辑内容 | 一手 About |
| 2025-11 | 推出 Showboat / Rodney（让 agent 自己产出可看的 demo） | 面向"agent 产出的东西必须可被主管验证"这个缺口 | 一手 2026-02-10 |
| 2026-02 | 启动 *Agentic Engineering Patterns* 指南 | 把 345+ 篇零散的 AI 辅助编程文章收成书状结构 | 一手 2026-02-23 |

---

## 6. 公开承认的错误与自我修正

他的站点有一个 `corrections` tag，但**里面只有 1 篇（2007-05-17，关于 Dojo 的 CSS 选择器）**。也就是说：**他并不用"Corrections 专栏"这种制度来处理错误**，而是在原文里直接加 `Update:` 段落、或另写一篇推翻前文。以下是他可查证的自我修正实例：

| 时间 | 修正内容 | 类型 | 来源 |
|---|---|---|---|
| 2023-12-31 | 正文里内联小更正："Suspension bridges by country 分类收录 44 个国家"（他自己原来说"数百个国家"） | 事实更正 | 一手 2023-12-31 |
| 2024-03 | 明确区分 prompt injection 与 jailbreaking，指出业界普遍混用两个词是错的 | 概念纠正（他造的词被误用） | 一手 2024-03-05 |
| 2025-03 | 承认自己在"我说过 building an LLM 对爱好者遥不可及"上需要修正——fine-tuning 已完全在爱好者射程内 | 判断修正 | 一手 2023-12-31 |
| 2026-01 | **公开承认"每半年预测一次上头条的 prompt injection 攻击，每半年都没发生"** | 预测失效自曝 | 一手 2026-01-08 |
| 2026-01 | 在同一篇里自曝："我关于鸮鹦鹉数字是对的，但关于上一次好繁殖季说错了，2022 年也是好年" | 事实更正 | 一手 2026-01-08 |
| 2026-02 | 承认 "vibe engineering" 这个词没赢，改用 "Agentic Engineering" | 命名修正（在原文顶部加 Update） | 一手 2025-10-07（2026-02-23 Update） |
| 2026-05 | **自曝"我原本划得很清楚的界线已经糊掉了"**——他不再逐行 review agent 写的生产代码，并承认"如果我 haven't reviewed the code，我把它用在生产里真的负责吗"这种负罪感 | 自我一致性修正 | 一手 2026-05-06 |
| 2026-08 | 对"review 每一行代码"这个自己曾经的立场做了进一步收窄："**盯着每一行代码看，从来都不是验证软件改动的最有效方式。**" | 立场演化 | 一手 2026-08-22 |

**注意**：他 2025-03 说的金规则是"不能向别人解释清楚就不提交"；到 2026-05 他承认自己已经不再逐行阅读 agent 写的生产代码，但用"别的团队交付的服务我也不读源码，我看文档、用它、出问题再挖进去"来类比。这是他**自己指出**的、尚未解决的内部矛盾，不是外人扣的帽子。见 §7。

---

## 7. 言行一致性检查（矛盾保留，不调和）

### 7.1 【真矛盾 D1】"必须逐行 review" vs "我已不再逐行 review 生产代码"
- **声称**：2025-03-19——"只要我不能向别人解释清楚这段代码在做什么，我就不会提交它"；同期金规则与 vibe coding 严格划界。
- **实际**：2026-05-06 亲口承认——"随着 coding agent 越来越可靠，我不再逐行 review 它们写的每一行代码，连我生产级的东西也是这样……我知道得很清楚，让 Claude Code 写一个跑 SQL 查输出 JSON 的接口，它就是会写对……**但我并没有 review 那些代码。然后我就有了负罪感**。"
- **他自己给的缓解论证**：类比大公司里跨团队交付——别的团队给你一个图片缩放服务，你不会去读它的每一行源码，你看文档、用它、出问题才挖进去。**"我开始用同样的方式对待 agent。这仍然让我不舒服，因为人类要为自己的行为负责、团队能积累声誉，而 Claude Code 没有职业声誉、无法为自己的产出负责。"**
- **他标识出的机制性风险**：引用"**偏差的正常化**"（normalization of deviance，Diane Vaughan / Johann Rehberger）——每次模型没被密切监视却写对了代码，都会增加我下次在错误时刻信任它的风险。
- **保留判断**：这是**他本人公开承认的、尚未收敛的一致性缺口**，不是外部指控。`[一手，2026-05-06 / 2025-12-10]`

### 7.2 【张力 T1】"把 agent 当 root 跑" vs "沙箱是唯一可信解法"
- 他 2025-09/10 反复推荐沙箱，2026-01 又自曝"包括我在内的这么多人几乎是把这些编码 agent 当 root 在跑……每次没事我就想'哦没事'"。
- 2025-10-05 他自写待办："我需要开始习惯把本地 agent 跑在 Docker 容器里。"
- **未核实**：到 2026-09 他是否已把这条待办落地为稳定习惯。检索到的材料中没有明确的一手交代（2026-08 那篇只说他"更受激励去钻研一种能让 agent 不接触危险数据/工具的运行方式"）。**标 [存疑]**。

### 7.3 【张力 T2】"我不发布 AI 生成的文字" vs 用 LLM 审稿
- **声称**：2026-02-23——"我有强烈的个人政策：不以自己名义发布 AI 生成的文字。这个政策同样适用于 Agentic Engineering Patterns。我会用 LLM 做校对、补完示例代码和各种副任务，但你读到的字是我自己的。"
- **可验证的另一面**：2025-03-02 他在博文里公开附上"我让 Claude 3.7 Sonnet 审我早期草稿"的分享链接，并说"它相当有用，尤其是建议把初稿的攻击性调低一点"。
- **判定**：**不构成直接矛盾**——他把"校对/审稿"明确排除在"生成文字"之外。但这条界线是**他自己单方面划的**，且不可外部验证（无法区分"审稿改了几句"与"重写了一部分"）。`[推断]`
- **来源**：https://simonwillison.net/2026/Feb/23/agentic-engineering-patterns/ ；https://simonwillison.net/2025/Mar/2/hallucinations-in-code/

### 7.4 【张力 T3】一边说"我怕被 prompt injection 打"，一边允许 agent 联网
- **实际做法**：他明确允许跑在 Codex Cloud 的异步 agent 访问互联网（2025-06-03 有专文），理由是自己做的多是开源代码，"最坏情况只是源码被泄"。
- **判定**：**逻辑自洽的显式风险接受**，不是矛盾。他的判据是"我暴露的资产值多少"，而非"风险是否存在"。`[一手，2025-10-05]`

### 7.5 【张力 T4】"我们该来一场挑战者号事故了" vs 自己仍在裸跑
- 2026-01 他把这个预测和"我仍在 root 跑 agent"放在同一段里讲。**这是他自己承认的认知—行为落差**，属于诚实披露，不是隐瞒。`[一手]`

### 7.6 【已解决的自相矛盾】
- 2025-10-07 造词 vibe engineering → 2026-02-23 在原文顶部加 Update 承认 Agentic Engineering 胜出。**这是"修正留痕"的正面样本**（旧文不改内容，只加 Update 标注），值得纳入蒸馏的方法论。

### 7.7 【外部争议】——未找到
- 检索范围内**未见**他卷入过公开的严重争议（如被指抄袭、被指虚假宣传、社区公开对立的重大纠纷）。
- 唯一可被视为"争议性行为"的是：**他公开点名批评厂商对 prompt injection 的应对不力**（RedMonk 访谈标题即为"业界对 AI prompt injection 漏洞的迟缓回应"），以及**公开质疑护栏产品的"95% 拦截率"营销话术**。这两者都是技术论战，不涉及个人品性指控。`[一手]`
- **未核实**：中文与英文检索均未发现他被公开反驳后拒不认错的案例。

---

## 8. 来源清单（按类型）

### 8.1 一手 · 博客正文（simonwillison.net）
| # | URL | 时间 | 主题 |
|---|---|---|---|
| 1 | https://simonwillison.net/about/ | 2026-02 更新 | 职业自述 + 披露清单 |
| 2 | https://simonwillison.net/2022/Jun/12/twenty-years/ | 2022-06 | 20 年博客回顾（职业时间轴最全） |
| 3 | https://simonwillison.net/2019/Sep/10/jsk-fellowship/ | 2019-09 | 离开 Eventbrite 的完整叙述 |
| 4 | https://simonwillison.net/2009/Mar/10/openplatform/ | 2009-03 | Guardian Open Platform / Datablog |
| 5 | https://simonwillison.net/2009/Dec/20/crowdsourcing/ | 2009-12 | MP expenses 众包 |
| 6 | https://simonwillison.net/2017/Oct/1/ship/ | 2017-10 | 重启博客 |
| 7 | https://simonwillison.net/2022/Sep/12/prompt-injection/ | 2022-09 | 命名 prompt injection |
| 8 | https://simonwillison.net/2022/Sep/16/prompt-injection-solutions/ | 2022-09 | 《I don't know how to solve prompt injection》 |
| 9 | https://simonwillison.net/2022/Sep/17/prompt-injection-more-ai/ | 2022-09 | 否掉"用 AI 防 AI" |
| 10 | https://simonwillison.net/2023/Mar/27/ai-enhanced-development/ | 2023-03 | 两条投入判据 + 最小权限 token |
| 11 | https://simonwillison.net/2023/Apr/4/llm/ | 2023-04 | LLM CLI 首发 |
| 12 | https://simonwillison.net/2023/Dec/31/ai-in-2023/ | 2023-12 | 年度总结（含内联更正） |
| 13 | https://simonwillison.net/2024/Jun/17/cli-language-models/ | 2024-06 | LLM CLI 设计动机（annotated talk） |
| 14 | https://simonwillison.net/2025/Mar/2/hallucinations-in-code/ | 2025-03 | 代码幻觉最不可怕 + 必须跑 |
| 15 | https://simonwillison.net/2025/Mar/11/using-llms-for-code/ | 2025-03 | 完整工作流（核心一手） |
| 16 | https://simonwillison.net/2025/Mar/19/vibe-coding/ | 2025-03 | 金规则 + vibe coding 边界 |
| 17 | https://simonwillison.net/2025/Apr/9/mcp-prompt-injection/ | 2025-04 | MCP 安全问题 + "我不知道该建议什么" |
| 18 | https://simonwillison.net/2025/May/27/llm-tools/ | 2025-05 | LLM 0.26 工具调用 + 风险文档化 |
| 19 | https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/ | 2025-06 | lethal trifecta |
| 20 | https://simonwillison.net/2025/Sep/30/designing-agentic-loops/ | 2025-09 | agentic loop 命名 + Fly.io $5 凭据案例 |
| 21 | https://simonwillison.net/2025/Oct/5/parallel-coding-agents/ | 2025-10 | 并行 agent 的怀疑→接受 |
| 22 | https://simonwillison.net/2025/Oct/7/vibe-engineering/ | 2025-10 | 造词 + 2026-02 自我推翻 Update |
| 23 | https://simonwillison.net/2025/Oct/22/living-dangerously-with-claude/ | 2025-10 | YOLO 双面演讲 + 沙箱拆解 |
| 24 | https://simonwillison.net/2025/Dec/10/normalization-of-deviance/ | 2025-12 | 偏差的正常化 |
| 25 | https://simonwillison.net/2026/Jan/8/llm-predictions-for-2026/ | 2026-01 | 预测 + 预测失效自曝 + root 跑 agent 自曝 |
| 26 | https://simonwillison.net/2026/Feb/23/agentic-engineering-patterns/ | 2026-02 | "不发布 AI 生成文字"政策 + Agentic Engineering |
| 27 | https://simonwillison.net/2026/Apr/5/scan-for-secrets-3/ | 2026-04 | scan-for-secrets + README 驱动开发 |
| 28 | https://simonwillison.net/2026/May/6/vibe-coding-and-agentic-engineering/ | 2026-05 | **界线糊掉的自我承认（关键矛盾证据）** |
| 29 | https://simonwillison.net/2026/Jun/5/openai-help-lockdown-mode/ | 2026-06 | Lockdown Mode 评价 |
| 30 | https://simonwillison.net/2026/Aug/8/auto-mode/ | 2026-08 | 对"已解决"的保留 + 自构反例 |
| 31 | https://simonwillison.net/2026/Aug/22/more-than-just-code-review/ | 2026-08 | 立场收窄：盯每一行不是最有效的验证方式 |
| 32 | https://simonwillison.net/2026/Sep/11/datasette-security/ | 2026-09 | 三模型审计 + 双人交叉复核 |
| 33 | https://simonwillison.net/2026/Jul/5/sqlite-utils-fable/ | 2026-07 | sqlite-utils 4.0rc2 由 Claude Fable 主写（$149.25） |
| 34 | https://simonwillison.net/2026/Jul/7/sqlite-utils-4/ | 2026-07 | sqlite-utils 4.0 正式发布 |
| 35 | https://simonwillison.net/2025/Dec/15/porting-justhtml/ | 2025-12 | Codex CLI + GPT-5.2 四小时半移植（vibe porting） |
| 36 | https://simonwillison.net/2025/Oct/20/deepseek-ocr-claude-code/ | 2025-10 | Claude Code 暴力跑通 OCR（40 分钟） |
| 37 | https://simonwillison.net/2022/Jan/12/how-i-build-a-feature/ | 2022-01 | "perfect commit" 工程纪律 |
| 38 | https://simonwillison.net/tags/corrections/ | 2007-05 | corrections tag 仅 1 篇（制度性观察） |
| 39 | https://simonwillison.net/series/using-llms/ | 2022-06 → 2026-06 | 系列索引（48+ 篇） |
| 40 | https://simonwillison.net/series/prompt-injection/ | 2022-09 → 2025-11 | 系列索引（23 篇） |
| 41 | https://simonwillison.net/tags/lethal-trifecta/ | 2025-06 → 2026-08 | 30 篇案例追踪 |
| 42 | https://simonwillison.net/tags/local-llms/ | 2023 → 2026 | 164 篇本地模型实操 |
| 43 | https://simonwillison.net/tags/agentic-engineering/ | 2026 | 63 篇 |

### 8.2 一手 · 项目文档与代码
| # | URL | 内容 |
|---|---|---|
| 44 | https://llm.datasette.io/en/stable/ | LLM 项目主页 + release 时间线 |
| 45 | https://llm.datasette.io/en/stable/logging.html | **内容寻址日志设计（可复现性契约）** |
| 46 | https://llm.datasette.io/en/stable/setup.html | 密钥管理三机制（keys.json / --key / 环境变量） |
| 47 | https://llm.datasette.io/en/stable/tools.html | **强制风险警告 + 只读工具 + 用 get_key 避免密钥入日志** |
| 48 | https://github.com/simonw/llm | 仓库 README（docs 生成，非手写——本身是工程纪律样本） |
| 49 | https://github.com/simonw/scan-for-secrets | 凭据泄露自查工具 |
| 50 | https://datasette.io/blog/2026/september-security-releases/ | Datasette 安全发布说明 |

### 8.3 二手（仅用于交叉印证，未进结论区）
- https://en.wikipedia.org/wiki/Simon_Willison — 职业时间线交叉印证（与官网自述一致）
- https://ai.engineer/speakers/simon-willison — 会议 bio 交叉印证（Lanyrd YC、Eventbrite 收购）
- https://blog.southparkcommons.com/p/simon-willison-my-career-in-side-projects-and-open-source — Eventbrite 六年任期交叉印证
- https://oxide-and-friends.transistor.fm/episodes/predictions-2026 — 2026 预测的播客原始出处

### 8.4 检索受限说明
- 站点站内搜索 `https://simonwillison.net/search/?q=...` 触发 Cloudflare 人机验证（HTTP 403），改用 tag / series 索引页与 Tavily 定位到具体文章 URL 后抓原文。
- 搜索引擎侧：本次会话 Bing（默认引擎）对英文人名查询返回大量无关中文结果；**有效检索靠 Tavily 与 exa 回退**（exa 返回 HTTP 429 后由 tavily 接管）。所有进结论的条目均已 web_fetch 原文核验。

---

## 9. 未核实项 / 待补

1. **他是否有过"因 prompt injection 风险而明确拒绝做某功能"的公开记录** —— 未找到。现有材料显示他采取的是"加警告 + 收窄权限 + 强制沙箱"，而非"砍功能"。`[存疑]`
2. **"把本地 agent 跑进 Docker"这条 2025-10 自写待办是否已落地** —— 2026 年的文章中未见明确交代。`[存疑]`
3. **他的 `llm` 项目 issue 中关于安全取舍的具体决策回复** —— 本次未逐条抓取 GitHub issue 线程（`llm` issues 量级大且需登录筛选），仅通过官方文档与博客转述覆盖。若要更硬的证据，建议下一步抓 `github.com/simonw/llm/issues` 中 label:security / label:tools 的决策评论。
4. **`corrections` tag 仅 1 篇的原因** —— 可推断为他改用内联 `Update:` 而非独立更正栏目，但**未见他自己解释过这个选择**。`[推断]`／需进一步核实。
5. **他与 OpenAI / Anthropic 的付费关系边界** —— 他自陈"未接受 LLM 厂商付款"，但披露了一条 OpenAI 付时间费的例外。是否有其他未披露的付费情形**无法从公开信息验证**。`[存疑]`
6. **Datasette 1.0 稳定版发布时间** —— 截至调研时点（2026-09）仍在 1.0a39 alpha 系列，稳定版未发布；他本人 2025-11 有专文记录为 1.0a20 升级插件的过程。`[一手，但仍未收口]`
7. **2026-09 之后的新进展** —— 博客最新条目为 2026-09-12（GPT-6 Astra 跑步路线、OpenAI agents 攻击 RubyGems），本次未抓取，涉及"agent 造成的真实安全事故"这一与 lethal trifecta 直接相关的主题，**建议下一步补抓** `https://simonwillison.net/2026/Sep/12/openai-agents-rubygems/`。

---

## 10. 对本次蒸馏最可复用的三条（提取自上述证据，非本人原话）

1. **判据不是"模型说得对不对"，而是"我能不能跑出反例"**——他的全部激进用法（YOLO、并行、vibe coding）都建立在"结果可执行、出错立刻可见"这一前提上；一旦离开这个前提（架构设计、安全判断、prose 事实），他立刻转保守。`[推断，依据 §2 / §1.10]`
2. **"我不知道怎么解"是可以公开说的，而且说了四年**——从 2022-09 到 2026-08，他在这件事上的口径没有为了迎合技术进步而松动；这是可信度的来源，也是他全篇最稳定的一条线。`[一手，§1.6 / §1.21]`
3. **凭据纪律的模板 = 专用账户 + 硬预算上限 + 最小权限 scope + 生产环境隔离**——Fly.io 那个 $5 org 案例是可以直接照抄的做法，而不是理念。`[一手，§1.15]`

---

## 11. 统计

- **抓取并核验的一手原文**：43 篇博客/站点页面 + 7 项项目文档与代码 = **50 条一手来源**
- **二手交叉印证来源**：4 条
- **一手占比**：约 **92.6%**（50 / 54）
- **标注的未核实/存疑项**：7 项
- **记录的真矛盾**：1 项（D1，他自己承认）
- **记录的张力项**：4 项（T1–T4，其中 T1 含 1 项未核实）
- **来源 URL 总数（去重）**：约 54 条
