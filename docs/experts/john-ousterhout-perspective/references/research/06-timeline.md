# John Ousterhout（约翰·奥斯特豪特）完整生平时间线与近 12 个月动态

> **调研截止日期**：2026-09-17（北京时间，由本机 `Get-Date` 取得：`2026-09-17 13:54:30 +08:00`）
>
> **调研对象**：John Kenneth Ousterhout，斯坦福大学计算机科学系荣休教授，Tcl/Tk 创造者，Raft 共识算法共同作者，log-structured file system（LFS）共同作者，《A Philosophy of Software Design》作者。
>
> **信源分级**：
> - **[一手]** 本人主页 / 本人论文 / 本人课程页 / 机构官方档案 / 官方新闻稿
> - **[二手]** 权威百科全书、权威媒体、学术机构公告、正式播客页
> - **[推断]** 由多条证据推导，无单一定论
>
> **信源黑名单**：本文件未使用知乎、微信公众号、百度百科/百度知道。调研过程中搜索引擎多次返回上述站点结果，已全部剔除。
>
> **调研工具说明**：`web_search`（bing，中文市场）对英文学术人名返回大量噪声，本次调研主要依赖 `advanced_search`（keenable / tavily 引擎）+ `web_fetch` 直接抓取原始页面。Wikipedia 与 DBLP 在本环境被网络策略拦截（域名解析到非公网 IP / Anubis 反爬），相关引用均改由 Wikipedia 镜像站与原始页面替代，已在表内注明。

---

## 一、完整时间线

| 年份 | 事件 | 来源 | 可信度 |
|---|---|---|---|
| 1954-10-15 | 出生。出生地报道为 **Solano County, California, U.S.** | [Wikipedia 镜像 everything.explained.today](https://everything.explained.today/John_Ousterhout/) [二手] | 高（出生日期多源一致；出生地见下方「矛盾点」） |
| 1954 | 另有来源仅记载出生年 1954，未给月日 | [softpanorama.org](https://softpanorama.org/People/Ousterhout/index.shtml) [二手] | 中 |
| 1975 | 获 Yale University **物理学** B.S.（学士） | [本人主页 Biography](https://web.stanford.edu/~ouster/cgi-bin/home.php) [一手]；[Stanford Profiles](https://profiles.stanford.edu/john-ousterhout) [一手]；[ETHW](https://ethw.org/John_K._Ousterhout) [二手] | 高（三源一致） |
| 1975–1980 | 在 Carnegie Mellon University 攻读，参与 **Cm\* 项目**（首个大规模 NUMA 多处理器，50 个 LSI-11 经 Kmap 互连）；先做 Kmap 硬件设计，后转软件并领导 **Medusa** 操作系统项目 | [本人 Projects 页](https://web.stanford.edu/~ouster/cgi-bin/projects.php) [一手] | 高 |
| 1976–1979 | 获 National Science Foundation Graduate Fellowship | [本人主页 Awards](https://web.stanford.edu/~ouster/cgi-bin/home.php) [一手] | 高 |
| 1977 | 论文 "Kmap Microprograms"（Cm\* Review / CMU 技术报告） | [本人 Publications 页](https://web.stanford.edu/~ouster/cgi-bin/publications.php) [一手] | 高 |
| 1978 | 论文 "Multi-microprocessors: An Overview and Working Example"（*Proceedings of the IEEE*）；及 Cm\* Kmap 微程序手册与调试器手册 | 同上 [一手] | 高 |
| 1980-04 | 获 Carnegie Mellon University **计算机科学博士**。博士论文 *Partitioning and Cooperation in a Distributed Multiprocessor Operating System: Medusa*（亦为技术报告 CMU-CS-80-112） | [本人 Publications 页](https://web.stanford.edu/~ouster/cgi-bin/publications.php) [一手]；[Stanford Profiles](https://profiles.stanford.edu/john-ousterhout) [一手] | 高 |
| 1980（约） | **博士导师：Nico Habermann**（CMU 计算机科学系官方「Doctoral Degrees Conferred」1980-1981 学年记录，论文题目与 Ousterhout 论文一致） | [CMU CSD Doctoral Degrees Conferred](https://csd.cmu.edu/academics/doctoral/degrees-conferred?page=12) [一手·机构档案] | 高 |
| 1980-02 | 论文 "Medusa: An Experiment in Distributed Operating System Structure"（*CACM*）发表 | [本人 Publications 页](https://web.stanford.edu/~ouster/cgi-bin/publications.php) [一手] | 高 |
| 1980–1994 | 任 **UC Berkeley** 电子工程与计算机科学系（EECS）教授（ETHW 当年记载为 Associate Professor） | [本人主页 Biography](https://web.stanford.edu/~ouster/cgi-bin/home.php) [一手]；[ETHW](https://ethw.org/John_K._Ousterhout) [二手] | 高 |
| 1980–1986 | **VLSI 设计工具项目**：先做布局编辑器 Caesar，随即以 **Magic** 取代 Caesar（增量设计规则检查、corner stitching 层次化数据结构），另有开关级时序分析器 **Crystal**；以 Berkeley VLSI Tools Distributions 形式免费发布（早期开源软件发布之一） | [本人 Projects 页](https://web.stanford.edu/~ouster/cgi-bin/projects.php) [一手] | 高 |
| 1981 | 专著 *Medusa: A Distributed Operating System*（UMI Research Press，139 页）出版 | [本人 Publications 页](https://web.stanford.edu/~ouster/cgi-bin/publications.php) [一手] | 高 |
| 1982-10 | 论文 "Scheduling Techniques for Concurrent Systems"：首次提出 **coscheduling**（今称 gang scheduling）。此文后于 2020 年获 IEEE TCDP High Impact Paper Award | 同上 [一手]；[本人主页 Awards](https://web.stanford.edu/~ouster/cgi-bin/home.php) [一手] | 高 |
| 1983-03 | 论文 "Crystal: A Timing Analyzer for nMOS VLSI Circuits" | [本人 Publications 页](https://web.stanford.edu/~ouster/cgi-bin/publications.php) [一手] | 高 |
| 1984-01 | 论文 "Corner Stitching: A Data Structuring Technique for VLSI Layout Tools"（*IEEE TCAD*） | 同上 [一手] | 高 |
| 1984–1989 | National Science Foundation Presidential Young Investigator | [本人主页 Awards](https://web.stanford.edu/~ouster/cgi-bin/home.php) [一手] | 高 |
| 1984–1994 | **Sprite 网络操作系统**项目（Unix 类网络 OS，追求 single system image；支持无盘工作站、大客户端文件缓存与一致性保证、透明进程迁移；配套并行 make —— **pmake**，为后来 ElectricAccelerator 的灵感来源）。约 100 名师生日常使用逾五年 | [本人 Projects 页](https://web.stanford.edu/~ouster/cgi-bin/projects.php) [一手] | 高 |
| 1985 | 获 UC Berkeley **Distinguished Teaching Award** | [本人主页 Awards](https://web.stanford.edu/~ouster/cgi-bin/home.php) [一手] | 高 |
| 1985-12 | 论文 "A Trace-Driven Analysis of the UNIX 4.2 BSD File System"（SOSP '85） | [本人 Publications 页](https://web.stanford.edu/~ouster/cgi-bin/publications.php) [一手] | 高 |
| 1987 | 获 ACM **Grace Murray Hopper Award**（表彰其在 VLSI CAD 系统方面的工作） | [本人主页 Awards](https://web.stanford.edu/~ouster/cgi-bin/home.php) [一手]；[Wikipedia 镜像](https://everything.explained.today/John_Ousterhout/) [二手] | 高 |
| 1987 秋 | 在 DEC Western Research Laboratory 学术休假期间，产生 **embeddable command language（可嵌入命令语言）** 的构想——Tcl 的思想起点 | [本人 Tcl 历史页](https://web.stanford.edu/~ouster/cgi-bin/tclHistory.php) [一手] | 高 |
| 1988 初 | 自休假返回后**开始实现 Tcl**；1988 年春首次在一个图形文本编辑器中使用 Tcl 的第一个版本 | 同上 [一手] | 高 |
| 1988 | 发表 "The Sprite Network Operating System"（*IEEE Computer*）；"Caching in the Sprite Network File System"（*TOCS*） | [本人 Publications 页](https://web.stanford.edu/~ouster/cgi-bin/publications.php) [一手] | 高 |
| 1988 末 | **开始开发 Tk**（作为 Tcl 扩展的 GUI 组件集）；因是业余项目，约两年后才足够可用 | [本人 Tcl 历史页](https://web.stanford.edu/~ouster/cgi-bin/tclHistory.php) [一手] | 高 |
| 1988–1994 | **Log-Structured File System（LFS）**项目（Mendel Rosenblum 做出首个实现；Ken Shirriff 在 Sawmill 中加入 RAID 支持；John Hartman 以 Zebra 扩展到集群文件系统） | [本人 Projects 页](https://web.stanford.edu/~ouster/cgi-bin/projects.php) [一手] | 高 |
| 1988–2000 | **Tcl/Tk** 项目期（本人标注为「1988–2000, U.C. Berkeley, Sun, Scriptics」） | 同上 [一手] | 高 |
| 1989 | 向少量早期采用者免费散出 Tcl 副本；同期论文 "Beating the I/O Bottleneck: A Case for Log-Structured File Systems"（*OSR*） | [本人 Tcl 历史页](https://web.stanford.edu/~ouster/cgi-bin/tclHistory.php) [一手]；[Publications](https://web.stanford.edu/~ouster/cgi-bin/publications.php) [一手] | 高 |
| 1990-01 | 在 USENIX 会议发表 "Tcl: An Embeddable Command Language"，听众数百人，引发索取副本热潮；随后将 Tcl 源码放到 Berkeley FTP 公开 | [本人 Tcl 历史页](https://web.stanford.edu/~ouster/cgi-bin/tclHistory.php) [一手] | 高 |
| 1990 夏 | 论文 "Why Aren't Operating Systems Getting Faster as Fast as Hardware?"（USENIX Summer）；"The LFS Storage Manager"；"Disk Scheduling Revisited" | [本人 Publications 页](https://web.stanford.edu/~ouster/cgi-bin/publications.php) [一手] | 高 |
| 1990 末 | Tk 的基本功能可用 | [本人 Tcl 历史页](https://web.stanford.edu/~ouster/cgi-bin/tclHistory.php) [一手] | 高 |
| 1991-01 | 在 USENIX 与 X Conference 发表 Tk 论文 "An X11 Toolkit Based on the Tcl Language"；数周内发布 Tk 首次互联网版本 | 同上 [一手] | 高 |
| 1991-10 | 论文 "Measurements of a Distributed File System"（SOSP '91）。1993-01 因数据问题向 *SIGOPS OSR* 致读者信更正 | [本人 Publications 页](https://web.stanford.edu/~ouster/cgi-bin/publications.php) [一手] | 高 |
| 1992-02 | **LFS 论文正式发表**："The Design and Implementation of a Log-Structured File System"（*TOCS* 10(1): 26–52，与 Mendel Rosenblum）。2014 年 IEEE Reynold B. Johnson 奖即表彰此项工作 | 同上 [一手]；[ETHW](https://ethw.org/John_K._Ousterhout) [二手] | 高 |
| 1992 夏 | Tk 加入多行 text widget 与 canvas widget，Tk 使用量急剧上升 | [本人 Tcl 历史页](https://web.stanford.edu/~ouster/cgi-bin/tclHistory.php) [一手] | 高 |
| 1993 夏 | Larry Rowe 在 Berkeley 组织**第一届 Tcl Workshop**（约 60 人），此后成年度活动 | 同上 [一手] | 高 |
| 1994-05 | **加入 Sun Microsystems Laboratories** 任 Distinguished Engineer，组建 Tcl 开发团队（Eric Schmidt 时任 Sun CTO、Bert Sutherland 时任 Sun Labs 主任出面招募）；Sun 承诺核心 Tcl/Tk 库继续以源码形式免费分发 | [本人 Tcl 历史页](https://web.stanford.edu/~ouster/cgi-bin/tclHistory.php) [一手] | 高 |
| 1994-09-23 | **"The Tcl War" 爆发**：Richard Stallman 在 Usenet 发出 "Why you should not use Tcl"，引发大规模论战（见「争议时间点」） | [HN 帖（含原帖全文）](https://news.ycombinator.com/item?id=22343420) [二手]；[The Tcl War 存档](https://vanderburg.org/old_pages/Tcl/war/0018.html) [一手·邮件列表存档] | 高 |
| 1994 | 获选 **ACM Fellow**（表彰其对 VLSI CAD 的贡献） | [本人主页 Awards](https://web.stanford.edu/~ouster/cgi-bin/home.php) [一手]；[Research.com](https://research.com/u/john-ousterhout) [二手] | 高 |
| 1994 | 专著 *Tcl and the Tk Toolkit*（Addison-Wesley，460 页）出版 | [本人 Publications 页](https://web.stanford.edu/~ouster/cgi-bin/publications.php) [一手] | 高 |
| 1995 | 论文 "The Zebra Striped Network File System"（*TOCS* 13(3)）；USENIX 接手 Tcl Workshop，后发展为数百人的正式 Tcl 会议 | 同上 [一手]；[Tcl 历史页](https://web.stanford.edu/~ouster/cgi-bin/tclHistory.php) [一手] | 高 |
| 1996-06 | 特邀演讲 **"Why Threads Are A Bad Idea (for most purposes)"**（USENIX 1996 Technical Conference；本人 misc 页标注演讲日期为 1996-01-25） | [本人 Publications 页](https://web.stanford.edu/~ouster/cgi-bin/publications.php) [一手]；[本人 misc 页](https://web.stanford.edu/~ouster/cgi-bin/misc.php) [一手] | 高 |
| 1994–1998 | 任 Sun Microsystems Laboratories Distinguished Engineer | [本人主页 Biography](https://web.stanford.edu/~ouster/cgi-bin/home.php) [一手] | 高 |
| 1997 | 获 **ACM Software System Award**（表彰 Tcl） | [本人主页 Awards](https://web.stanford.edu/~ouster/cgi-bin/home.php) [一手]；[ACM 奖页（被 Cloudflare 拦截，未取回正文）](https://awards.acm.org/award_winners/ousterhout_1957745) [二手] | 高 |
| 1997 末 | 决定把 Tcl 从 Sun 分拆出来做创业公司 | [本人 Tcl 历史页](https://web.stanford.edu/~ouster/cgi-bin/tclHistory.php) [一手] | 高 |
| 1998-01 | **创立 Scriptics Corporation**（与 Sarah Daniels 共同创立，Sarah Daniels 任市场与销售 VP；本人任 CEO）；一个月内约半数 Sun Tcl 团队成员加入，开始开发 TclPro | 同上 [一手]；[Wikipedia 镜像](https://everything.explained.today/John_Ousterhout/) [二手] | 高 |
| 1998-03 | 论文 **"Scripting: Higher-Level Programming for the 21st Century"**（*IEEE Computer* 31(3): 23–30）发表，引发「Ousterhout's dichotomy」之争（见「争议时间点」） | [本人 Publications 页](https://web.stanford.edu/~ouster/cgi-bin/publications.php) [一手] | 高 |
| 1998 春 | Tcl 获两项大奖：**ACM Software System Award** 与 **USENIX Software Tools User Group (STUG) Award** | [本人 Tcl 历史页](https://web.stanford.edu/~ouster/cgi-bin/tclHistory.php) [一手] | 高 |
| 1998-06 | 论文 "The Safe-Tcl Security Model"（USENIX ATC '98） | [本人 Publications 页](https://web.stanford.edu/~ouster/cgi-bin/publications.php) [一手] | 高 |
| 1998-09 | Scriptics 首个产品 **TclPro 1.0** 发布 | [本人 Tcl 历史页](https://web.stanford.edu/~ouster/cgi-bin/tclHistory.php) [一手] | 高 |
| 1999-04 | Scriptics 首个重大开源版本 **Tcl/Tk 8.1** 发布（加入 Unicode、线程安全、Henry Spencer 新正则包） | 同上 [一手] | 高 |
| 1999 | 发表 "Free Software Needs Profit"（*CACM*）、"Extensibility in Tcl"（*Dr. Dobb's*）、"The State of Tcl"、"Integration Platforms" 等；公司决定第二阶段产品为基于 XML 的 B2B 服务器 | [本人 Publications 页](https://web.stanford.edu/~ouster/cgi-bin/publications.php) [一手]；[Tcl 历史页](https://web.stanford.edu/~ouster/cgi-bin/tclHistory.php) [一手] | 高 |
| 2000-05-22 | **公司更名为 Ajuba Solutions, Inc.**（新闻稿），业务重心由 Tcl 转向 XML/B2B 集成服务器；Tcl 社区反应负面 | [softpanorama.org（引用 Scriptics 2000-05-22 新闻稿）](https://softpanorama.org/People/Ousterhout/index.shtml) [二手] | 中（二手转述新闻稿） |
| 2000-07 至 2000-10 | 预判 Interwoven 不会继续支持开源 Tcl，主动将核心开发「所有权」从单一公司转移给社区；**Tcl Core Team** 成立并确立运作规程 | [本人 Tcl 历史页](https://web.stanford.edu/~ouster/cgi-bin/tclHistory.php) [一手] | 高 |
| 2000-10-20 | **Interwoven 宣布收购 Ajuba Solutions**（约 3,100 万美元 Interwoven 普通股与期权；同期还收购 Metacode Technologies）。新闻稿明确 **Ajuba 产品线将被终止**，Interwoven 只要 XML 技术与工程团队，对 Tcl 无兴趣 | [Interwoven 2000-10-20 新闻稿全文（softpanorama 转载）](https://softpanorama.org/People/Ousterhout/index.shtml) [一手·原始新闻稿] | 高 |
| 2000 | 本人 CEO 任期至 2000 年为止；**自 2000 年起不再在 Tcl 开发中担任活跃角色** | [本人主页 Biography](https://web.stanford.edu/~ouster/cgi-bin/home.php) [一手]；[Tcl 历史页](https://web.stanford.edu/~ouster/cgi-bin/tclHistory.php) [一手] | 高 |
| 2001 | **当选美国国家工程院（NAE）院士**。入选理由：improving our ability to program computers by raising the level of abstraction（通过提高抽象层次来改善人们编写计算机程序的能力） | [本人主页 Awards](https://web.stanford.edu/~ouster/cgi-bin/home.php) [一手]；[Wikipedia 镜像](https://everything.explained.today/John_Ousterhout/) [二手] | 高 |
| 2002（一说 2002-04） | **创立 Electric Cloud, Inc.** 并任 CEO（与 John Graham-Cumming 等）；softpanorama 记为「2002 年 4 月」 | [本人主页 Biography](https://web.stanford.edu/~ouster/cgi-bin/home.php) [一手]；[softpanorama.org](https://softpanorama.org/People/Ousterhout/index.shtml) [二手] | 高（年份）；月份仅二手 |
| 2002–2005 | 领导开发 **ElectricAccelerator**：基于内核级文件系统驱动记录文件访问，为 `make` 构建构造精确依赖图，单次构建可安全并行用数十台机器，加速 10–20 倍 | [本人 Projects 页](https://web.stanford.edu/~ouster/cgi-bin/projects.php) [一手] | 高 |
| 2005–2007 | 领导开发 **ElectricCommander**：管理夜间构建、自动化测试等开发流程的 Web 平台 | 同上 [一手] | 高 |
| 2006–2011 | 作为 Electric Cloud 发明人获 8 项美国专利（US 7,086,063 / 7,168,064 / 7,395,529 / 7,536,976 / 7,676,788 / 7,725,524 / 7,886,265 / 8,042,089），均与分布式构建、流程自动化相关 | [Stanford Profiles Patents](https://profiles.stanford.edu/john-ousterhout) [一手] | 高 |
| 2008 | **返回学术界**，加入斯坦福大学计算机科学系 | [本人主页 Biography](https://web.stanford.edu/~ouster/cgi-bin/home.php) [一手] | 高 |
| 2008–2011 | **Fiz 项目**：面向高交互 Web 应用的组件框架（隐藏安全、Ajax 等复杂度）；产出 Wad 2010、Wad 2011 两篇论文与 2009 年技术报告 | [本人 Projects 页](https://web.stanford.edu/~ouster/cgi-bin/projects.php) [一手] | 高 |
| 2009-12 | 论文 "The Case for RAMClouds: Scalable High-Performance Storage Entirely in DRAM"（*SIGOPS OSR*）—— **RAMCloud 项目**正式对外 | [本人 Publications 页](https://web.stanford.edu/~ouster/cgi-bin/publications.php) [一手] | 高 |
| 2009–2017 | **RAMCloud 项目**：所有数据常驻 DRAM 的大规模数据中心存储系统。80 节点开发集群（QDR InfiniBand）上，读取任意 100 字节对象 < 5 μs，持久写约 13.5 μs；目标千节点级、PB 级容量 | [本人 Projects 页](https://web.stanford.edu/~ouster/cgi-bin/projects.php) [一手] | 高 |
| 2011-07 | 论文 "The Case for RAMCloud"（*CACM* 54(7)）；"Is Scale Your Enemy, Or Is Scale Your Friend?"（技术展望） | [本人 Publications 页](https://web.stanford.edu/~ouster/cgi-bin/publications.php) [一手] | 高 |
| 2011-05 | 论文 "It's Time for Low Latency"（HotOS XIII） | 同上 [一手] | 高 |
| 2011-10 | 论文 "Fast Crash Recovery in RAMCloud"（SOSP '11） | 同上 [一手] | 高 |
| 2012–2014 | **Raft 项目**。因认为 Paxos「极难理解」，设计以**可理解性为首要目标**的新共识算法 Raft | [本人 Projects 页](https://web.stanford.edu/~ouster/cgi-bin/projects.php) [一手] | 高 |
| 2013-05 | 论文 "Toward Common Patterns for Distributed, Concurrent, Fault-Tolerant Code"（HotOS XIV） | [本人 Publications 页](https://web.stanford.edu/~ouster/cgi-bin/publications.php) [一手] | 高 |
| 2013-06 | 论文 "Copysets: Reducing the Frequency of Data Loss in Cloud Storage"（USENIX ATC '13） | 同上 [一手] | 高 |
| 2014-01 | RAMCloud **version 1.0** 正式打标（达到可支撑真实应用的成熟度） | [本人 Projects 页](https://web.stanford.edu/~ouster/cgi-bin/projects.php) [一手] | 高 |
| 2014-02 | 论文 "Log-Structured Memory for DRAM-based Storage"（FAST '14） | [本人 Publications 页](https://www.usenix.org/conference/fast14/technical-sessions/presentation/rumble) [一手] | 高 |
| 2014-06 | **Raft 论文发表**："In Search of an Understandable Consensus Algorithm"（USENIX ATC '14, pp. 305–319，与 Diego Ongaro）；含扩展版与 Diego Ongaro 博士论文 | [本人 Publications 页](https://web.stanford.edu/~ouster/cgi-bin/publications.php) [一手] | 高 |
| 2014 | 获 **IEEE Reynold B. Johnson Information Storage Systems Award**（与 Mendel Rosenblum 共同，表彰 LFS） | [本人主页 Awards](https://web.stanford.edu/~ouster/cgi-bin/home.php) [一手]；[ETHW](https://ethw.org/John_K._Ousterhout) [二手] | 高 |
| 2015-01（Winter 2015 学期） | **首次开出 CS 190: Software Design Studio**（斯坦福）。课程动机写明：其他课教写「正确、高效」的代码，这门课教写「**漂亮**」的代码；核心命题是「问题分解」，并明确这是一场**实验**——「能否把软件设计这门手艺教出来？」 | [CS 190 Spring 2015 课程信息页](https://web.stanford.edu/~ouster/cgi-bin/cs190-spring15/info.php) [一手] | 高 |
| 2015-06 | 论文 "Experience with Rules-Based Programming for Distributed, Concurrent, Fault-Tolerant Code"（USENIX ATC '15）；**RAMCloud 系统总论文** "The RAMCloud Storage System"（*TOCS* 33(3)，2015-08） | [本人 Publications 页](https://web.stanford.edu/~ouster/cgi-bin/publications.php) [一手] | 高 |
| 2015-10 | 论文 "Implementing Linearizability at Large Scale and Low Latency"（SOSP '15）；"The Volatile Future of Storage"（*IEEE Spectrum*，2015-11） | 同上 [一手] | 高 |
| 2016-2023 | **Granular Computing 项目**（「让数据中心高效执行海量微小任务」，任务时长从数毫秒到数微秒）。子项目：Arachne 核感知线程管理、Homa 传输协议、高性能通知、NanoLog 纳秒级日志 | [本人 Projects 页](https://web.stanford.edu/~ouster/cgi-bin/projects.php) [一手] | 高 |
| 2016-08-29 | 在 UIUC（CS @ ILLINOIS Distinguished Lecture Series）演讲 **"Designing for Understandability: The Raft Consensus Algorithm"**；当时头衔为 **VMware Founders Professor of Computer Science** | [UIUC Siebel School 新闻](https://siebelschool.illinois.edu/news/distinguished-lecture-series-dr-john-ousterhout) [一手·机构公告] | 高 |
| 2016-06 | 论文 "SLIK: Scalable Low-Latency Indexes for a Key-Value Store"（USENIX ATC '16） | [本人 Publications 页](https://web.stanford.edu/~ouster/cgi-bin/publications.php) [一手] | 高 |
| 2017 前后 | RAMCloud 项目收尾（标注期 2009–2017），研究方向转向以 RAMCloud 作为 granular computing 的驱动应用 | [本人 Projects 页](https://web.stanford.edu/~ouster/cgi-bin/projects.php) [一手] | 高 |
| 2018-04 | **《A Philosophy of Software Design》第一版出版**（Yaknyam Press，178 页）。内容主要来自 CS 190 的教学 | [本人 Publications 页](https://web.stanford.edu/~ouster/cgi-bin/publications.php) [一手] | 高 |
| 2018-06 | 论文 "NanoLog: A Nanosecond Scale Logging System"（USENIX ATC '18） | 同上 [一手] | 高 |
| 2018-07 | 论文 **"Always Measure One Level Deeper"**（*CACM* 61(7): 74–83） | 同上 [一手] | 高 |
| 2018-08 | 论文 "Homa: A Receiver-Driven Low-Latency Transport Protocol Using Network Priorities"（ACM SIGCOMM 2018） | 同上 [一手] | 高 |
| 2018-10 | 论文 "Arachne: Core-Aware Thread Management"（OSDI '18） | 同上 [一手] | 高 |
| 2019-02 | 论文 "Exploiting Commutativity For Practical Fast Replication"（NSDI '19） | 同上 [一手] | 高 |
| 2020 | 获 **IEEE Technical Committee on Distributed Processing Outstanding Technical Contribution Award**，以及同委员会的 **High Impact Paper Award**（表彰 1982 年 coscheduling 论文） | [本人主页 Awards](https://web.stanford.edu/~ouster/cgi-bin/home.php) [一手] | 高 |
| 2021-04 | 论文 "MilliSort and MilliQuery"、"EPaxos Revisited"（均为 NSDI '21） | [本人 Publications 页](https://web.stanford.edu/~ouster/cgi-bin/publications.php) [一手] | 高 |
| 2021-07 | **《A Philosophy of Software Design》第二版发布**。相对第一版的重要变化：新增 "Decide What Matters" 一章；重写并扩充第 6 章 "General-Purpose Modules are Deeper"；在部分章节加入与 Robert Martin《Clean Code》设计哲学的比较（方法长度、注释作用等分歧） | [本人 Software Design Book 页](https://web.stanford.edu/~ouster/cgi-bin/aposd.php) [一手] | 高 |
| 2021-07 | 论文 "A Linux Kernel Implementation of the Homa Transport Protocol"（USENIX ATC '21, pp. 773–787）。**这是目前可查到的、他作为作者的最后一批正式会议论文之一** | [本人 Publications 页](https://web.stanford.edu/~ouster/cgi-bin/publications.php) [一手] | 高 |
| 2021-10 | 《A Philosophy of Software Design》**德文版** *Prinzipien des Softwaredesigns* 由 O'Reilly 出版 | [本人 Software Design Book 页](https://web.stanford.edu/~ouster/cgi-bin/aposd.php) [一手] | 高 |
| 2022-09-19 | 播客 Maintainable EP-131 **"John Ousterhout - It's Not You, It's the Codebase"**（49:22） | [Maintainable 官方页](https://maintainable.fm/episodes/john-ousterhout-its-not-you-its-the-codebase) [一手·播客官方] | 高 |
| 2022-09-23 | 被宣布为 **Netdev 0x16 keynote speaker**（会议 2022-10-24 至 10-28，里斯本）；当时头衔 **Bosack Lerner Professor of Computer Science** | [Netdev 0x16 公告](https://netdevconf.org/0x16/news/we-are-pleased-to-anounce-our-netdev-0x16-keynote-speaker-john-ousterhout.html) [一手·会议官方] | 高 |
| 2022-07/08 | 播客 **SE Radio 520: John Ousterhout on A Philosophy of Software Design** | [se-radio.net](https://se-radio.net/2022/07/episode-520-john-ousterhout-on-a-philosophy-of-software-design/) [一手·播客官方] | 高 |
| 2022-10 | 发表 **"Homa Note (October 2022)"**：指多篇新传输协议论文「存在严重缺陷、结论存疑」，因学界缺乏对已发表工作提出质疑的机制，遂将批评写入 Homa Wiki 的 "Related Work" 章节 | [本人主页](https://web.stanford.edu/~ouster/cgi-bin/home.php) [一手] | 高 |
| 2022-10 | arXiv 预印本 **"It's Time to Replace TCP in the Datacenter"**（arXiv:2210.00714） | [本人 Publications 页](https://web.stanford.edu/~ouster/cgi-bin/publications.php) [一手] | 高 |
| 2023-02-08 | 接受 PLDB 专访 **"A brief interview with Tcl creator John Ousterhout"**。要点：Tcl 两大独特性是**可嵌入性**与「一切皆字符串」哲学（后者带来性能代价与奇特语法）；回应「若留在 Tcl 团队」——认为差别不大，Tcl 在他交棒时已相当成熟；透露 1994 年 **Jim Clark 与 Marc Andreessen 曾邀他作为创始人加入 Netscape，他最终拒绝**，称这是职业生涯最大的「what if」；并评论新语言多来自系统建造者而非 PL 研究者 | [PLDB 访谈原文](https://pldb.io/blog/JohnOusterhout.html) [一手·访谈实录] | 高 |
| 2023 | 获 **Stanford Tau Beta Pi Teaching Honor Roll** | [本人主页 Awards](https://web.stanford.edu/~ouster/cgi-bin/home.php) [一手] | 高 |
| 2024-01（Winter 2024） | 讲授 **CS 190 (Software Design Studio)** —— 目前可查的**最后一次 CS 190** | [本人主页 Teaching Schedule](https://web.stanford.edu/~ouster/cgi-bin/home.php) [一手] | 高 |
| 2024-04（Spring 2024） | 讲授 **CS 111 (Operating Systems Principles)** —— 目前可查的**最后一次授课** | 同上 [一手] | 高 |
| 2024-11 | 《A Philosophy of Software Design》**中文版**由人民邮电出版社出版（京东有售） | [本人 Software Design Book 页](https://web.stanford.edu/~ouster/cgi-bin/aposd.php) [一手] | 高 |
| 2024（年内，具体日期未核实） | 正式**退休**（自述 "I have retired"）。从证据链看：最后一次授课为 2024 年春季学期，2025 年起主页写上「我已退休，不再常规授课」「不再招收新研究生」「研究组已收尾」。**确切退休生效日期未公开** | [本人主页](https://web.stanford.edu/~ouster/cgi-bin/home.php) [一手]；[本人 Projects 页](https://web.stanford.edu/~ouster/cgi-bin/projects.php) [一手] | 高（已退休）；**中（具体生效日期：年份待核）** |
| 2025-02-26 | 本人 Software Design Book 页最近一次更新（加入中文版条目等） | [本人 Software Design Book 页](https://web.stanford.edu/~ouster/cgi-bin/aposd.php) [一手] | 高 |
| 2025-04-09 | 做客 **The Pragmatic Engineer** 播客（1h21m）**"The Philosophy of Software Design"**：核心论点是 **AI 编码工具令软件设计变得更重要，而非更不重要**；称 AI 编码工具是「tactical tornadoes」（战术龙卷风）——写得快、修得快，同时制造新问题与技术债。录制时他**正在为 Linux 内核贡献代码以实现 Homa 传输协议** | [The Pragmatic Engineer 官方节目页（含完整摘要与时间戳）](https://newsletter.pragmaticengineer.com/p/the-philosophy-of-software-design) [一手·播客官方] | 高 |
| 2025-07-09 | 本人 Projects 页最近一次更新 | [本人 Projects 页](https://web.stanford.edu/~ouster/cgi-bin/projects.php) [一手] | 高 |
| 2025-10-08 | 在 UC Santa Cruz 作 CSE Colloquium 演讲 **"Can Great Programmers Be Taught?"**（11:00–12:15）；简介称其为 **Bosack Lerner Professor of Computer Science, Emeritus** | [UCSC Events（页面被 Cloudflare 拦截，标题与摘要由搜索索引取得）](https://events.ucsc.edu/event/cse-colloquium-can-great-programmers-be-taught) [二手] | 中（日期与标题来自搜索索引，未取回正文） |
| 2025-11-13 | 美国乌克兰商会（USUBC）发布活动预告，宣传其在 American University Kyiv (AUK) 的演讲 | [USUBC 活动页](https://usubc.org/event/auk-talks-can-great-programmers-be-taught) [二手] | 中 |
| 2025-12-03 | AUK（American University Kyiv）发布 AUK Talks 报道：**"Can Great Programmers Be Taught?"**。内容要点：强调 **general-purpose 优于 special-purpose**（「尽量避免specialization」）；**tactical vs strategic programming** 两种心态；指出硅谷初创公司重速度轻设计（引 Facebook 早期 "move fast and break things" 后改为 "move fast with solid infrastructure"），而 Google、VMware 因强设计文化吸引顶尖工程师；强调「**代码必须能跑，但能跑的代码还不够**」。演讲视频见 YouTube（本环境无法访问 YouTube 域名，未核验视频内容） | [AUK 官方报道](https://auk.edu.ua/en/auk-talks-can-great-programmers-be-taught-with-the-esteemed-john-ousterhout-professor-of-computer-science-at-stanford-university/) [一手·主办方报道] | 高 |
| 2026-01-21 | 本人主页最近一次更新（写明已退休、CS 190 大概率不再开设） | [本人主页](https://web.stanford.edu/~ouster/cgi-bin/home.php) [一手] | 高 |
| 2026-03-05 | 本人 Directions 页最近一次更新（办公室仍为 Gates 448） | [本人 Directions 页](https://web.stanford.edu/~ouster/cgi-bin/directions.php) [一手] | 高 |
| 2026-04-06 | 为 **UC Berkeley CS 61B（Spring 2026）第 29 讲**授课/客座，讲义文件名 `cs61b-sp26-lec29.pdf`，标题页署名 "Software Design, John Ousterhout, Stanford University, April 6, 2026"（PDF 未取回正文，据搜索索引） | [CS 61B Spring 2026 讲义 PDF](https://sp26.datastructur.es/assets/lectures/cs61b-sp26-lec29.pdf) [一手·课程讲义（索引信息）] | 中（存在该讲义；授课形式未核实） |
| 2026-06-29 至 07-02 | 在旧金山 Moscone West 举行的 **AI Engineer World's Fair 2026** 演讲。有现场图注直接记为「Stanford University professor John Ousterhout speaks at the AI Engineer World's Fair in San Francisco」（2026-07-02） | [Snappr 新闻图注](https://snappr.com/news/discover/79e702e6-5073-4ed4-9026-8c5ee01a2fc0) [二手]；[AI Engineer WF 2026 讲者页（仅页头，正文未渲染）](https://aie-wf.sentry.dev/speakers/spk_john_ousterhout) [一手·会议官方] | 中（出席与演讲已多源印证；**具体讲题未核实**） |
| 2026-09-17 | **本次调研截止日**。此时他身份为斯坦福荣休教授，已不再常规授课、不再招新研究生、研究组已收尾；仍在做公开演讲与写作；其 Homa 协议工作由他人（如 Missing Link Electronics 在 SDC 2023/2024/2026 持续演讲）与开源社区延续 | 综合上文各条 | — |

---

## 二、思想转折点：从「系统性能研究者」到「软件设计教育者」

### 2.1 转折的起点：2015 年 CS 190

这不是一次渐进的漂移，而是一次**有明确自述的主动转向**。2015 年 1 月首次开出 CS 190 时，本人在课程信息页写下了转向的完整理由 **[一手]**：

> "Other CS classes teach you how to write correct code and how to write efficient code. This class will teach you how to write *beautiful* code: code that is clean, simple, and obvious, so it is easy to understand, maintain, and extend."

课程页列出的**两条动机**，正是他个人研究趣味迁移的证词 **[一手]**：

1. 最好的程序员在代码质量与产出速度上是平均程序员的 **10–100 倍**，但「我们几乎没教学生成为精英程序员所需的技能」；
2. 「整个计算机科学中最重要的思想是 **problem decomposition**（问题分解）……遗憾的是，我们没有任何一门课教学生如何分解问题。」

同一页面他明说这是**实验**：*"CS 190 is an experiment to see if it is possible to teach the art of software design."*

### 2.2 时间与因果

| 阶段 | 时间 | 内容 |
|---|---|---|
| 系统性能研究者 | 1980–2008 | VLSI CAD（Magic/Crystal）→ Sprite OS → LFS → Tcl/Tk → Scriptics/Ajuba → Electric Cloud → RAMCloud。**约 28 年全部围绕「构建系统」** |
| 转折酝酿 | 2008–2014 | 回到斯坦福后先继续系统研究（Fiz、RAMCloud、Raft）。转折的直接契机是**教学中发现的问题**：他观察到「精英程序员与普通程序员的差距来自设计能力，而这能力没人教」 **[一手]** |
| 公开转型 | 2015-01 | CS 190 首开。此后 CS 190 与 CS 111/CS 140 交替开课，教学重心确立 **[一手]** |
| 理论化成型 | 2018-04 | 《A Philosophy of Software Design》第一版。**这是他把 CS 190 课堂讲义整理为公共理论的标志性时点**。有书评明确指出该书「总结了他在斯坦福 CS190 的教学」 **[二手]** |
| 理论修订 | 2021-07 | 第二版。新增 "Decide What Matters"、扩充「通用模块更深」一章、加入与《Clean Code》的对比 |
| 并行而非替换 | 2015–2021 | **重要澄清**：转向教育并**未**让他放弃系统研究。CS 190 首开的同一年他仍在发 SOSP 论文；直到 2021 年仍在发 USENIX ATC 论文与 Homa。2022 年还发表了对 Homa 竞争论文的公开批评 |

### 2.3 他哪一年开始公开讲复杂度理论

- **2015 年（CS 190 首开）** —— 最早的公开教学材料落点。可查证的最早公开讲义是 [CS 190 Spring 2015 的 "Managing Complexity" 讲座笔记](https://web.stanford.edu/~ouster/cgi-bin/cs190-spring15/lecture.php?topic=complexity) 与 ["Introduction" 讲座笔记](https://web.stanford.edu/~ouster/cgi-bin/cs190-spring15/lecture.php?topic=intro)，开篇即写 "Fundamental Philosophy: Programs evolve continuously..." **[一手]**
- **2018 年（第一版出版）** —— 才进入大众视野、成为广泛引用的「复杂度理论」。此前主要在斯坦福课堂内传播。

> **[推断]** 因此「开始公开讲」有两个层次：**课堂层面是 2015 年，公众层面是 2018 年**。

### 2.4 转向的表达方式也变了

值得注意的是他表达方式的迁移：早年论文标题是 *"Why Aren't Operating Systems Getting Faster as Fast as Hardware?"*（1990）、*"Always Measure One Level Deeper"*（2018）——**用测量数据说话**。转向教育后，他的候选格言页 [Favorite Sayings](https://web.stanford.edu/~ouster/cgi-bin/sayings.php) **[一手]** 里出现了大量非技术命题，例如：

- "The greatest performance improvement of all is when a system goes from not-working to working"（最重要的性能改进是系统从跑不起来到跑起来）
- "Use your intuition to ask questions, not to answer them"（用直觉提问，而不是用直觉作答）
- "The three most powerful words for building credibility are 'I don't know'"（建立可信度最有力量的三个字是「我不知道」）
- "If you don't know what the problem was, you haven't fixed it"
- "Coherent systems are inherently unstable"

这些格言的落点全部指向**判断力与心智模型**，而非系统实现——是「教育者身份」而非「系统研究者身份」的产物。

---

## 三、最近 12–24 个月动态（2024-09 至 2026-09）

### 3.1 最重要的一项：已退休

**他在 2024 年内退休**。本人主页现在明写 **[一手]**：

> "I have retired, so I am no longer teaching on a regular basis. In particular, **CS 190 is unlikely to be offered again**."

Projects 页同时写明：*"I have retired so I am no longer taking on new research students and I have wound down my research group."* **[一手]**

**证据链（用于确认退休时点）**：

| 证据 | 时间 | 来源 |
|---|---|---|
| 最后一次 CS 190 | Winter 2024 | [本人主页](https://web.stanford.edu/~ouster/cgi-bin/home.php) [一手] |
| 最后一次 CS 111 | Spring 2024 | 同上 [一手] |
| 斯坦福官方档案标注 Emeritus | 截至 2026-09 | [Stanford Profiles](https://profiles.stanford.edu/john-ousterhout) [一手] |
| 主页出现「已退休」表述 | 2026-01-21（该页更新日） | [本人主页](https://web.stanford.edu/~ouster/cgi-bin/home.php) [一手] |

> **[存疑]** 退休的**确切生效日期未公开**。他 2026–27 学年在斯坦福官方课程表里仍挂着 CS 199/CS 191/CS 499 等**独立研究类**课程（[Stanford Profiles](https://profiles.stanford.edu/john-ousterhout) [一手]），这类课程通常是挂名而非实际授课，不构成「仍在教学」的反证。

### 3.2 近 12 个月（2025-09 至 2026-09）行动清单

| 时间 | 动态 | 类别 | 来源 |
|---|---|---|---|
| 2025-10-08 | UCSC CSE Colloquium 演讲 **"Can Great Programmers Be Taught?"** | 公开演讲 | [UCSC](https://events.ucsc.edu/event/cse-colloquium-can-great-programmers-be-taught) [二手] |
| 2025-12-03（报道日） | **AUK Talks "Can Great Programmers Be Taught?"**（American University Kyiv），有视频。内容为 APOSD 原则的应用版：通用优于专用、tactical vs strategic、硅谷设计文化 | 公开演讲 | [AUK 官方报道](https://auk.edu.ua/en/auk-talks-can-great-programmers-be-taught-with-the-esteemed-john-ousterhout-professor-of-computer-science-at-stanford-university/) [一手] |
| 2026-04-06 | 在 UC Berkeley **CS 61B Spring 2026** 讲 "Software Design" | 客座授课 | [CS 61B 讲义](https://sp26.datastructur.es/assets/lectures/cs61b-sp26-lec29.pdf) [一手·索引] |
| 2026-06-29 至 07-02 | **AI Engineer World's Fair 2026**（旧金山 Moscone West）演讲 | 公开演讲 | [AI Engineer WF](https://aie-wf.sentry.dev/speakers/spk_john_ousterhout) [一手]；[Snappr 图注](https://snappr.com/news/discover/79e702e6-5073-4ed4-9026-8c5ee01a2fc0) [二手] |
| 2024-11 | 《A Philosophy of Software Design》**中文版**（人民邮电出版社）出版 | 著作 | [本人 Software Design Book 页](https://web.stanford.edu/~ouster/cgi-bin/aposd.php) [一手] |

### 3.3 近 24 个月内的关键论述（2024-09 起）

| 时间 | 动态 | 来源 |
|---|---|---|
| **2025-04-09** | **The Pragmatic Engineer 播客（1h21m）**。这是近两年他最重要的一次长篇公开论述，核心是 **AI 与软件设计**：AI 工具令设计**更重要**而非更不重要；AI 编码工具是「tactical tornadoes」；TDD 会妨碍好的软件设计；反对《Clean Code》式的极端短方法；支持写注释；并提出「design it twice」原则。录制时他**正在向 Linux 内核提交 Homa 实现代码** | [The Pragmatic Engineer 官方页](https://newsletter.pragmaticengineer.com/p/the-philosophy-of-software-design) [一手] |

> **对「他有没有关于 AI 辅助编程的新论文」的回答**：**没有**。截至 2026-09-17，检索不到他在 2022 年之后发表的新学术论文。他以作者身份的最后一批正式发表是 2021 年（USENIX ATC '21 的 Homa Linux 内核实现等），另有 2022-10 的 arXiv 预印本 "It's Time to Replace TCP in the Datacenter"（arXiv:2210.00714）。**他对 AI 的观点只以播客、演讲、访谈形式发表，未形成论文。** **[一手，基于本人 Publications 页与项目页]**

### 3.4 技术工作的延续（非他本人在做，但与其相关）

- Missing Link Electronics 在 **SDC 2023 / 2024 / 2026** 持续演讲 "Real-Time Networking with Stanford's HOMA Protocol"（SDC 2026 于 2026-09-02 前后举行） **[二手]** — [MLE 公告](https://missinglinkelectronics.com/company/news/mle-presents-real-time-networking-with-stanfords-homa-protocol-at-storage-developers-conference-2026)
- Homa Wiki 仍在维护 **[一手]** — [Homa Wiki](https://homa-transport.atlassian.net/wiki/spaces/HOMA)
- 2025-12 一篇数据网络拥塞控制综述（*Frontiers of Computer Science*）仍将 Homa 作为重点引用 **[二手]**

---

## 四、个人细节（可公开的）

| 项目 | 内容 | 来源 | 可信度 |
|---|---|---|---|
| 全名 | John Kenneth Ousterhout | [Wikipedia 镜像](https://everything.explained.today/John_Ousterhout/) [二手] | 高 |
| 姓氏读音 | **/ˈoʊstərhaʊt/**，即 "OH-stir-howt"，源自荷兰语原名 Oosterhout | [Wikipedia 镜像](https://everything.explained.today/John_Ousterhout/) [二手]；[softpanorama.org](https://softpanorama.org/People/Ousterhout/index.shtml) [二手] | 高（两源一致） |
| 办公室 | **Gates 448**（斯坦福 Gates 计算机科学大楼四层），会面需预约 | [本人 Directions 页](https://web.stanford.edu/~ouster/cgi-bin/directions.php) [一手] | 高 |
| 邮箱 | `ouster@cs.stanford.edu`（主页以「在地址后加 .edu」形式防爬） | [本人主页](https://web.stanford.edu/~ouster/cgi-bin/home.php) [一手] | 高 |
| 个人网站 | `https://web.stanford.edu/~ouster/`（页面式，非博客；含 Projects / Publications / Software Design Book / FAQ / Students / Favorite Sayings / Directions / Odds & Ends 八个板块） | 本人网站 [一手] | 高 |
| **无独立博客** | 他没有博客。观点输出渠道是：个人网站上的静态文档、播客、演讲、Twitter/X | [推断，基于本人网站结构] | 中 |
| 学术社交 | X/Twitter: **@JohnOusterhout**（简介自述 "Stanford CS prof., author of 'A Philosophy of Software Design', co-inventor of Raft consensus algorithm and log-structured file system"） | [X 账号](https://x.com/JohnOusterhout) [一手·本人账号简介] | 高 |
| **无 GitHub 个人主页** | `github.com/johnousterhout` 存在 `aposd-vs-clean-code` 仓库，但个人主页 `github.com/johnousterhout` 无法访问（抓取失败）。他的代码主要在 `PlatformLab` 组织下（HomaModule、Arachne、NanoLog） | [GitHub](https://github.com/johnousterhout/aposd-vs-clean-code) [一手]；[本人 Projects 页](https://web.stanford.edu/~ouster/cgi-bin/projects.php) [一手] | 中 |
| **RSI（重复性劳损）问题** | 他在 Odds & Ends 页主动公开「关于我的 RSI 问题以及我如何应对」的笔记，URL 为 `wrist.php`。**具体内容未取回**（未抓取该页） | [本人 misc 页](https://web.stanford.edu/~ouster/cgi-bin/misc.php) [一手·链接存在] | 高（存在）；内容未核实 |
| 业余爱好（吉他？） | **未能核实。** 本次调研在公开信源中**未找到任何关于他弹吉他或音乐爱好的可靠记载**。任务描述中的「吉他？」暂无信源支持 | — | **未核实** |
| 家庭 | **除下文一条外，未核实。** 其 Odds & Ends 与个人页面均无家庭信息 | — | **未核实** |
| 可能的亲属（UC San Diego 助理教授 Amy Ousterhout） | UC San Diego 计算机科学与工程系助理教授 **Amy Ousterhout**，研究方向为操作系统与网络（Shenango、Caladan、调度策略、零拷贝序列化）。**二人姓氏罕见、领域高度重合，但本次调研未找到任何信源明示或暗示其亲属关系** | [UCSD Profiles](https://profiles.ucsd.edu/amy.ousterhout) [一手]；[个人站](https://amyousterhout.com) [一手] | **未核实（不得据此断言）** |
| 性格特质（可用于身份卡） | 1) 公开主张「**建立可信度最有力量的三个字是『我不知道』**」，反对领导者假装什么都懂；2) 公开承认 Tcl 设计失误（「一切皆字符串」带来性能代价）、承认 Sun 转投 Java 是合理选择、承认错过 Netscape 是最大「what if」；3) 在 Tcl 历史页自嘲式承认自己的「Ouster-votes」（会上举手表决数票）「准确性常被讨论，有人暗示我的点票不够客观」；4) 直言不讳——2022 年主动公开批评多篇已发表的传输协议论文「存在严重缺陷」 | [Favorite Sayings](https://web.stanford.edu/~ouster/cgi-bin/sayings.php) [一手]；[Tcl 历史页](https://web.stanford.edu/~ouster/cgi-bin/tclHistory.php) [一手]；[PLDB 访谈](https://pldb.io/blog/JohnOusterhout.html) [一手]；[本人主页](https://web.stanford.edu/~ouster/cgi-bin/home.php) [一手] | 高 |
| 教学风格 | CS 190 限选 20 人，理由是他要**亲自读完全部学生代码**；课堂以英语写作课模式运作（写→反馈→重写）；他本人在 Pragmatic Engineer 播客中确认「每一行学生代码我都亲自审」。学生项目之一是实现 Raft 共识协议 | [CS 190 课程信息页](https://web.stanford.edu/~ouster/cgi-bin/cs190-spring15/info.php) [一手]；[Pragmatic Engineer](https://newsletter.pragmaticengineer.com/p/the-philosophy-of-software-design) [一手] | 高 |
| 公开的非技术写作 | 曾撰写 *"Survivor Budgeting"*（关于加州州议会财政规划的非常规提案）、*"How to make decisions"*（他推崇的共识式决策法）、*"Startup company culture"*（为 Electric Cloud 写的文化文档）、*"Fortnight milestones"*（项目管理法）、*"Page limits"*（主张取消会议论文 camera-ready 版页数限制） | [本人 misc 页](https://web.stanford.edu/~ouster/cgi-bin/misc.php) [一手] | 高 |

---

## 五、争议时间点

### 5.1 1994：The Tcl War（Tcl vs Scheme 之争）

| 要素 | 内容 |
|---|---|
| 时间 | **1994-09-23**（Stallman 原帖时间戳：Fri, 23 Sep 94 19:14:52 -0400） |
| 触发 | Richard Stallman（GNU Project）在 Usenet 发表 **"Why you should not use Tcl"** |
| 性质 | 一场横跨 comp.lang.tcl / comp.lang.functional / comp.lang.scheme 等新闻组的大规模公开论战，被后世称为 **"The Great TCL War" / "The Infamous TCL War"** |
| Ousterhout 的卷入方式 | **他是被批评的一方。** softpanorama 的评价是：Stallman 的帖子「清楚显示这位自由软件领袖不理解 programming in the large 与 programming in the small 的区别」[二手] |
| 上下文 | 争论发生在 Stallman 发帖前数月，Ousterhout 已于 1994-05 加入 Sun，并计划把 Tcl 推向「互联网通用脚本语言」。当时社区还担心 Tcl 会变成专有语言 |
| 后续 | Sun 履约保持核心 Tcl/Tk 源码免费分发；担忧逐渐转为对新功能的欢迎（本人自述 [一手]） |
| 来源 | [HN 帖（含原帖全文）](https://news.ycombinator.com/item?id=22343420) [二手]；[The Tcl War 邮件存档](https://vanderburg.org/old_pages/Tcl/war/0018.html) [一手·存档]；[本人 Tcl 历史页](https://web.stanford.edu/~ouster/cgi-bin/tclHistory.php) [一手] |

### 5.2 1998："Scripting: Higher-Level Programming" 与 Ousterhout's Dichotomy 之争

| 要素 | 内容 |
|---|---|
| 时间 | 论文发表于 **1998-03**（*IEEE Computer* 31(3): 23–30）；论战紧随其后 |
| 核心命题 | **Ousterhout's dichotomy**：高级语言倾向于分成两类——**system programming languages**（强类型、可构建任意复杂数据结构、编译执行，如 C、Modula-2）与 **scripting languages / glue languages**（弱类型或无类型、几乎不提供复杂数据结构、解释执行，如 Tcl、Perl、Unix shell）。他认为二者用途不同、不可互相替代 |
| 批评的核心 | 论战方（comp.lang.functional 等）的核心不满是：**该论文完全没有提及 Scheme、ML、Haskell 等高级语言**，即他把「语言」二分为「系统语言 vs 脚本语言」的框架，忽略了「既能做系统编程、又能做脚本、且有强类型与优雅语义」的第三类语言 |
| 代表性批评原文 | *"In particular, I was baffled that there was no mention whatsoever of advanced languages such as Scheme, ML, and Haskell–"* —— 见 [comp.lang.functional 讨论串存档](https://groups.google.com/g/comp.lang.functional/c/xLNt2BU34SA)（Google Groups 域名被本环境拦截，另见 [Perl-Users-Digest 存档](https://diswww.mit.edu/pergamon.mit.edu/perl/6593)）；另一版本标题直接写作 **"Ousterhout and Tcl lost the plot with latest paper"** |
| 他本人的回应 | 在个人网站提供 [论文补充数据页](https://web.stanford.edu/~ouster/cgi-bin/misc.php)（"Additional data for the paper 'Scripting: Higher Level Programming for the 21st Century'"），以数据回应 |
| 后续影响 | **25 年后仍在被讨论。** 2025 年 Hacker News 上 "Writing that changed how I think about programming languages" 一帖仍把他这篇论文列为影响写作之一 [二手]；该论文亦催生了独立的 Wikipedia 条目 [Ousterhout's dichotomy](https://en.wikipedia.org/wiki/Ousterhout%27s_dichotomy)（本环境 Wikipedia 域名被拦截） |

### 5.3 《Clean Code》之争中被引用的时间点

这是**最近十年他受关注度最高的一次论战**，且与其他争议不同——这次他是主动发起并全程参与的一方。

| 时间 | 节点 | 来源 |
|---|---|---|
| 2018-04 | APOSD 第一版出版，但**第一版未点名《Clean Code》** | [本人 Software Design Book 页](https://web.stanford.edu/~ouster/cgi-bin/aposd.php) [一手] |
| **2021-07** | **APOSD 第二版出版，在部分章节新增与 Robert Martin《Clean Code》的设计哲学对比**。本人明说「我们在若干议题上存在重大分歧，例如**方法长度**与**注释的作用**」 | 同上 [一手] |
| 2021 前后 | 开设 GitHub 仓库 **`johnousterhout/aposd-vs-clean-code`**，收录他与 Robert Martin 的**直接对话记录**（标题即 "A discussion between myself and Robert Martin"） | [GitHub 仓库](https://github.com/johnousterhout/aposd-vs-clean-code) [一手] |
| 后续 | 二人又录制了视频对话（HN 收录标题："John Ousterhout and Robert Martin Follow-Up to APOSD vs. Clean Code"、"John Ousterhout and Uncle Bob discuss John's disagreements with Clean Code"） | [HN 收录列表](https://news.ycombinator.com/from?site=maintainable.fm) [二手] |
| **2025-04-09** | 在 Pragmatic Engineer 播客中系统重申分歧：反对《Clean Code》式的极端短方法（认为过度分解会增加接口复杂度、降低可理解性）；批评 TDD 妨碍设计；支持写注释（反对「尽量少写注释」） | [Pragmatic Engineer](https://newsletter.pragmaticengineer.com/p/the-philosophy-of-software-design) [一手] |
| 2026 | 该讨论仍在社区持续发酵，衍生大量第三方对比文章（如 dev.to "Clean Architecture Revisited"、2026-07 的 "APoSD and Clean Code from a Ruby point of view" 等） | [二手] |

### 5.4 其他争议作风

| 时间 | 事件 |
|---|---|
| 2022-10 | **主动公开批评同行论文。** 发表 "Homa Note"：指多篇新传输协议论文「大多数存在严重缺陷，使其结论存疑」，因学界缺乏对已发表工作提出质疑的机制，遂将批评写入 Homa Wiki。另有一份专门针对 Aeolus 论文的批评（[Aeolus critique](https://homa-transport.atlassian.net/l/cp/8e9rrQh0)），称该文对 Homa 的担忧「出于误解」，其提出的改进「很可能破坏 Homa 的性能」。**这是一种不常见的、具对抗性的学术行为** — [一手] |
| 1994-2000 | **「Ouster-votes」争议。** 在 Tcl 会议上以举手表决来定新功能优先级，票数由他目测估算（「十、二十、三十……我看大约 35 只手」）。他本人记载：「有人暗示我的点票不够完全客观……」 — [本人 Tcl 历史页](https://web.stanford.edu/~ouster/cgi-bin/tclHistory.php) [一手] |
| 1993-01 | 因 1991 年 "Measurements of a Distributed File System" 论文数据问题，与 John Hartman 联名向 *ACM SIGOPS Operating Systems Review* 致读者信更正（Vol. 27, No. 1, pp. 7–10） — [本人 Publications 页](https://web.stanford.edu/~ouster/cgi-bin/publications.php) [一手] |

---

## 六、年份与事实矛盾点（**未调和，原样保留**）

> 按任务要求，以下冲突一律保留，不做「取中间值」或「选一个」的调和处理。

### 矛盾 1：Scriptics 创立年份 —— 1997 vs 1998

| 说法 | 来源 |
|---|---|
| **1998 年 1 月创立** | [本人主页 Biography](https://web.stanford.edu/~ouster/cgi-bin/home.php)：「In 1998 I founded Scriptics Corporation」[一手]；[本人 Tcl 历史页](https://web.stanford.edu/~ouster/cgi-bin/tclHistory.php)：「**In late 1997 I decided**... **In January 1998 I founded Scriptics**」[一手]；[Wikipedia 镜像](https://everything.explained.today/John_Ousterhout/)：「co-founded Scriptics... in January 1998」[二手]；[softpanorama.org](https://softpanorama.org/People/Ousterhout/index.shtml) [二手] |
| 任务提示的「1997」 | 任务描述中写作「Scriptics 创始人/CEO（1997-2000?）」 |

**裁决倾向（但保留冲突）**：本人两处独立自述均为 **1998 年 1 月创立**，「1997 年末」是**决定**分拆的时间点而非创立时间。任务提示中的 1997 可能是把「决定」与「创立」混同。**[一手证据占优，但两说并存]**

### 矛盾 2：Sun Microsystems Laboratories 任职结束年份 —— 1997 vs 1998

| 说法 | 来源 |
|---|---|
| **1994–1998** | [本人主页 Biography](https://web.stanford.edu/~ouster/cgi-bin/home.php)：「From 1994–1998 I was a Distinguished Engineer at Sun Microsystems Laboratories」[一手]；[softpanorama.org](https://softpanorama.org/People/Ousterhout/index.shtml) [二手] |
| 任务提示的「1994-1997?」 | 任务描述中写作「Sun Microsystems Laboratories（1994-1997?）」 |

**说明**：本人自述为 1994–1998，但 Tcl 历史页又说他「1997 年末决定分拆」——若 1997 年末已决定离开，则 Sun 的**实际**任期与**名义**任期可能有重叠。**保留冲突。**

### 矛盾 3：Ajuba/Interwoven 收购时间 —— 2000 年 10 月 vs 2001 年 11 月

| 说法 | 来源 |
|---|---|
| **2000 年 10 月**（Interwoven 新闻稿日期 2000-10-20） | [本人 Tcl 历史页](https://web.stanford.edu/~ouster/cgi-bin/tclHistory.php)：「Interwoven acquired the Ajuba Solutions in **October of 2000**」[一手]；[Wikipedia 镜像](https://everything.explained.today/John_Ousterhout/)：「purchased by Interwoven in October 2000」[二手]；[Interwoven 2000-10-20 新闻稿全文](https://softpanorama.org/People/Ousterhout/index.shtml) [一手·原始新闻稿] |
| **2001 年 11 月** | [softpanorama.org](https://softpanorama.org/People/Ousterhout/index.shtml) 正文写：「it was acquired by Interwoven in **Nov. 2001**」——**但同一页紧接引用的新闻稿明确是 2000-10-20** |

**说明**：此冲突存在于**同一页面内部**，且该页引用的原始新闻稿（2000-10-20）与本人的自述一致。**softpanorama 的 2001-11 应为笔误，但按要求原样保留冲突记录。** 新闻稿另注明交易「预计在 Interwoven 2000 财年第四季度完成」——若实际交割延后，也可能产生两个不同「收购时间」。**[推断]**

### 矛盾 4：出生地 —— Solano County, California vs New York City

| 说法 | 来源 | 评估 |
|---|---|---|
| **Solano County, California, U.S.** | [Wikipedia 镜像 everything.explained.today](https://everything.explained.today/John_Ousterhout/) [二手]；[HandWiki](https://handwiki.org/wiki/Biography:John_Ousterhout) [二手]；[staroceans.org](http://staroceans.org/wiki/A/John_Ousterhout) [二手]；[ipfs.basearchive.ai](https://ipfs.basearchive.ai/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/wiki/John_Ousterhout.html) [二手] | **多源一致，可信度高** |
| **New York City, New York, United States** | [llmpedia.net](https://llmpedia.net/gpt-5-mini/John_Ousterhout.html) [二手] | **孤立单源，且该站为 LLM 生成内容站，可信度低** |

**说明**：两说并存，**不做调和**。倾向 Solano County（4 个独立镜像源一致 vs 1 个 AI 生成站），但保留冲突。

### 矛盾 5：斯坦福教席头衔 —— 至少四种说法

| 头衔 | 时间 | 来源 |
|---|---|---|
| **VMware Founders Professor of Computer Science** | 2016-08 | [UIUC 公告](https://siebelschool.illinois.edu/news/distinguished-lecture-series-dr-john-ousterhout) [一手] |
| **Bosack Lerner Professor of Computer Science** | 2022-09 | [Netdev 0x16](https://netdevconf.org/0x16/news/we-are-pleased-to-anounce-our-netdev-0x16-keynote-speaker-john-ousterhout.html) [一手]；[ICDCS 2021](https://icdcs2021.us/keynotes.html) [一手] |
| **Bosack Lerner Professor of Computer Science, Emeritus** | 2025-10 / 2026 | [UCSC](https://events.ucsc.edu/event/cse-colloquium-can-great-programmers-be-taught) [二手]；[AI Engineer WF 2026](https://aie-wf.sentry.dev/speakers/spk_john_ousterhout) [一手] |
| **Leonard Bosack and Sandy K. Lerner Professor of Engineering and Professor of Computer Science, Emeritus** | 截至 2026-09 | [Stanford Profiles](https://profiles.stanford.edu/john-ousterhout) [一手·官方] |
| **Fortunato E. Bernini Family University Fellow in Undergraduate Education and Professor of Computer Science** | 2026-03 | [grokipedia 引用](https://grokipedia.com/page/John_Ousterhout) [二手]（该站为 AI 生成，可信度低） |

**说明**：这些不必然互斥——教席（chaired professorship）可随时间变更，且「University Fellow in Undergraduate Education」是另一类荣誉头衔，可并存。但**「Bosack Lerner」与「VMware Founders」是否为同一教席的先后命名、抑或两笔不同捐赠**，本次调研**未能核实**。**不加调和。**

### 矛盾 6：CS 340 —— 任务所称的「课程：CS 190、CS 340（起止年份）」

| 核查结果 | 依据 |
|---|---|
| **在斯坦福找不到由 Ousterhout 开设的 CS 340。** 本次调研检索到的 CS 340 全部属于**其他院校**：St. Lawrence University（CS-340 Software Engineering，Kevin Angstadt）、York College of Pennsylvania（CS 340）、University of Puget Sound（CSci 340 Software Engineering）等 | 多源检索 [二手] |
| 斯坦福方面他实际开设的课程序列：**CS 142**（Web Applications，2015 Winter）、**CS 140**（Operating Systems，2016–2020）、**CS 190**（Software Design Studio，2015–2024）、**CS 111**（Operating Systems Principles，2021–2024） | [本人主页 Teaching Schedule](https://web.stanford.edu/~ouster/cgi-bin/home.php) [一手] |

**结论**：**「CS 340」疑为任务描述中的误记，或与其他机构的课程编号混淆。** 无法核实 Ousterhout 与斯坦福 CS 340 的关联。**[未核实 / 存疑]**

### 矛盾 7：返回斯坦福的年份 —— 2008（已核实，与任务提示一致）

| 说法 | 来源 |
|---|---|
| **2008 年返回学术界，加入斯坦福 CS 系** | [本人主页 Biography](https://web.stanford.edu/~ouster/cgi-bin/home.php)：「In 2008 I returned to academia in the Computer Science Department at Stanford」[一手] |
| **（对比）在 Electric Cloud 至 2007** | 本人主页：「I was at Electric Cloud until 2007」[一手] |

**说明**：任务提示「返回斯坦福（2008? 请核实）」→ **核实通过，2008 年。** 但注意：softpanorama 未给出离开 Electric Cloud 的年份，而本人在主页只写「until 2007」；**2007→2008 之间是否有空档期，未核实。** 另注：他的公司主页链接仍指向 `electric-cloud.com`，Electric Cloud 后更名为 CloudBees 相关业务，此处不加展开。

### 矛盾 8：学士学位领域 —— 物理学（已核实，注意易错点）

他本科是 **Yale 物理学 B.S.（1975）**，不是计算机。**这是他反复自述的背景**（[一手]，多源一致）。他的博士才是计算机科学（CMU，1980）。他本人在 APOSD 相关文字中提过「作为物理学本科生，我曾着迷于世界可被少数几条定律捕捉的想法」（见 [De Gruyter 收录的 APOSD 序章 "Why I Wrote This Book"](https://doi.org/10.1515/9780691230542-002) [二手]）——这解释了他后来「追求简洁设计」的思想底色。

### 矛盾 9：退休具体日期 —— 未核实

见 §3.1 的 [存疑] 标注。**所有人都在说「他已退休」，但没有人给出日期。**

---

## 七、交付自评

| 项目 | 情况 |
|---|---|
| 时间线条数 | **约 90 条**（含 1954 年出生至 2026-09-17 调研截止日的逐年/逐事件记录） |
| 一手信源占比 | 约 **65%**（本人主页、本人论文页、本人课程页、本人访谈、本人会议官方公告、机构官方新闻稿） |
| 二手信源占比 | 约 **35%**（Wikipedia 镜像、权威媒体、学术机构公告、播客官方页、搜索结果索引） |
| 最近 12 个月最重要动态 | **①2024 年内已退休**（主页明载「I have retired」「CS 190 is unlikely to be offered again」）；**②2025-04-09 Pragmatic Engineer 播客**系统阐述「AI 时代的软件设计更重要」；**③2025-12-03 AUK Talks** 与 **2026-04-06 Berkeley CS 61B 客座**、**2026-06/07 AI Engineer World's Fair 演讲** 表明退休后仍在全球公开输出 |
| 主要年份矛盾点 | ① Scriptics 创立 1997 vs 1998；② Sun Labs 任期止于 1997 vs 1998；③ Ajuba 被收购 2000-10 vs 2001-11；④ 出生地 Solano County vs New York City；⑤ 斯坦福教席头衔四说并存；⑥ **CS 340 与 Ousterhout 无可核实关联**；⑦ 退休具体日期未公开 |
| 未能核实的项 | 业余爱好（**未找到任何吉他/音乐爱好的信源**）、家庭情况、退休确切日期、2026 AI Engineer WF 具体讲题、CS 340 关联、RSI 问题笔记正文 |
| 未使用的信源 | 知乎、微信公众号、百度百科/百度知道（黑名单），以及 grokipedia / llmpedia（AI 生成内容站，仅在标注冲突时作为「存疑一方」引用，不作为事实依据） |

---

## 附录 A：关于「业余爱好（吉他？）」的核查记录

任务提示中的「业余爱好（吉他？）」**未能获得任何信源支持**。以下为实际执行的检索记录，供复核：

| 检索式 | 引擎 | 结果 |
|---|---|---|
| `John Ousterhout guitar hobby personal interests Stanford professor` | keenable | 返回的全是无关页面（本人主页、Stanford Profiles、grokipedia 等），**无任何音乐/吉他相关内容** |
| `John Ousterhout electric guitar jazz musician hobby "Ousterhout"` | keenable | 同上，**零命中** |
| `"Ousterhout" guitar music hobby pianist "John Ousterhout" personal` | keenable | 唯一含 "guitar" 的命中是一条无关 HN 帖（"Ask HN: What Are You Learning?" 中有人自学吉他），**与 Ousterhout 无关** |

**同时核查过但未发现业余爱好信息的原始页面**（均为本人一手页面）：

- [本人主页](https://web.stanford.edu/~ouster/cgi-bin/home.php) — 只有 Biography / Research Interests / Teaching / Awards，无个人生活内容
- [本人 Odds & Ends 页](https://web.stanford.edu/~ouster/cgi-bin/misc.php) — 该页是「个人侧」内容最集中的页面，收录了 RSI 问题笔记、Survivor Budgeting、决策方法等**私人性质的写作**，但**无任何业余爱好条目**
- [本人 Favorite Sayings 页](https://web.stanford.edu/~ouster/cgi-bin/sayings.php) — 通篇为技术与人生格言，提及的唯一「个人化」例子是他做 Web 开发时如何归纳出类设计，非爱好
- [本人 FAQ 页](https://web.stanford.edu/~ouster/cgi-bin/faq.php) — 仅三条问答（研究生申请、CS 142 先修、是否做专家证人）
- [本人 Directions 页](https://web.stanford.edu/~ouster/cgi-bin/directions.php) — 仅办公室与停车信息

> **结论**：截至调研截止日 2026-09-17，公开信源中**不存在** John Ousterhout 弹吉他或从事音乐活动的记载。**若身份卡需要「鲜活细节」，建议改用以下已核实且有信源支撑的素材**（见 §4）：
> - 他公开主张「建立可信度最有力量的三个字是『我不知道』」
> - 他公开记录自己的 **RSI（重复性劳损）问题**及应对方式（[Odds & Ends 的 `wrist.php`](https://web.stanford.edu/~ouster/cgi-bin/misc.php)，正文未取回）
> - 他公开自嘲过自己的「Ouster-votes」点票「不够客观」
> - 他 2022 年主动公开批评多篇同行已发表的传输协议论文「存在严重缺陷」
> - 他 1994 年拒绝了 Jim Clark 与 Marc Andreessen 邀其作为创始人加入 Netscape 的机会，自称是职业生涯最大的「what if」
> - 他办公室里仍挂着 Gates 448 这个地址，2026-03-05 还更新过 Directions 页
> - CS 190 限选 20 人，理由是**他要亲自读完每一行学生代码**

---

## 附录 B：调研过程中被本环境网络策略拦截的信源（供复核参考）

| 域名 | 拦截形式 | 替代方案 |
|---|---|---|
| `en.wikipedia.org` / `simple.wikipedia.org` | 解析到非公网 IP | 改用 [everything.explained.today 镜像](https://everything.explained.today/John_Ousterhout/)（明确声明 "It uses material from the Wikipedia article"）、[HandWiki](https://handwiki.org/wiki/Biography:John_Ousterhout)、[staroceans.org](http://staroceans.org/wiki/A/John_Ousterhout) 等多镜像交叉 |
| `dblp.org` | Anubis 反爬验证页 | 改用本人 Publications 页（**反而更权威**） |
| `www.youtube.com` / `group.google.com` / `getpodcast.com` | 解析到非公网 IP | 改用播客官方文字页（The Pragmatic Engineer Substack、Maintainable 官方站） |
| `awards.acm.org` | Cloudflare 403 | 改用本人主页 Awards 段 + Research.com |
| `id.loc.gov` | Cloudflare 403 | 改用本人 Publications 页确认博士论文信息 |
| `events.ucsc.edu` | Cloudflare 403 | 标题与日期由搜索索引取得，已标注可信度为「中」 |
| `swap.stanford.edu`（Wayback 类） | 403 | 未能取回历史快照，故退休日期只能给证据链而非精确日期 |
| `www.cs.stanford.edu` | Akamai 403 | 改用 [profiles.stanford.edu](https://profiles.stanford.edu/john-ousterhout)（官方档案，含 Emeritus 标注） |
| `amyousterhout.com` | 抓取失败 | 改用 [UCSD Profiles](https://profiles.ucsd.edu/amy.ousterhout)（仅用于说明亲属关系未核实） |

> **备注**：`web_search`（默认 bing 引擎，zh-CN 市场）对本主题几乎不可用——搜 "John Ousterhout" 会返回百度百科的英文单词 "john" 词条、知乎的英文人名音译讨论、CSDN 的密码破解工具教程等。本次调研的实际有效检索均由 `advanced_search`（keenable / tavily）完成，`bing` 引擎被自动降级。**这本身是一个值得记录的工具环境事实。**
