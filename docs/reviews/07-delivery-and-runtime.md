# 07 · 交付与运行 —— PrivHub 代码评审（角度：怎么上线、怎么回滚、出事怎么看见）

> 评审人：萧潇｜角度：**交付与运行**（delivery-and-runtime）
> 日期：2026-09-18｜源码基线：`privhub/package.json` = **3.1.0**｜运行环境实测：Windows + **Node v24.21.0**
> 纪律：全程只读；**未修改 `privhub/` 与 `deploy/` 下任何文件**；**未启动 3180/3181**；只跑了只读脚本与 `tests/integrity.mjs`（它只读源码 + 比对，不起服务）。
> 排除项：交底 §7 已修项（S1/S2/S3/U8①）不重报；`docs/PrivHub-改进建议.md` 的 O1~O4 只在**有新证据推翻或加深**时才写，其余标注"已闭环，不重报"。
>
> **只读自证**：`git status --short` 无任何 `M` 记录（只有 `.assistant/`、`docs/experts/`、`docs/reviews/`、`privhub/tests/.testroot-sibling/`、`scripts/privhub-diagnose-0xc0000142.ps1` 五个未跟踪项）；`deploy/` 下今天**零文件改动**。
> `privhub/tests/.testroot/`、`.audittest/` 内有今日 20:31–20:35 的写入，**非本次评审所为**（我全程未起隔离实例、未跑 `--spawn`），疑似同工作区并行的其它评审者或测试留痕，特此说明。

---

## 1. 一句话结论

**这套系统"上线"这件事本身没有护栏：同步脚本只写不存、只前不退（`build-deploy.ps1` 无任何备份/回滚），而 3181 生产包作为唯一产物既不在 git 里、也没有版本号（部署包 `package.json` 还是 `0.2.0`），所以"现在生产上跑的到底是哪一版、出事怎么退回去"目前**无人能回答**；同时 3181 那一版**实际缺了开发版才有的静态资源会话鉴权**——漂移已经真实造成了一次安全能力回退，而这不是"落后"，是"倒退"。**

---

## 2. 我实际看过的证据

### 2.1 启动链路
| 文件 | 行号 | 看了什么 |
|---|---|---|
| `privhub/start.bat` | 9–26 | `cd /d "%~dp0"`、`set PRIVHUB_ROOT=%~dp0`、`set PRIVHUB_PORT=3180`、`node --import tsx/esm src/main.ts --port %PRIVHUB_PORT%`、末尾 `echo Service stopped, exit code %errorlevel%` + `pause`。**无 node 存在性检查、无端口占用预检、无失败指引** |
| `privhub/src/main.ts` | 53 | `const rootDir = process.env.PRIVHUB_ROOT?.trim() \|\| process.cwd()` |
| `privhub/src/main.ts` | 105–132 | `installFileLogger()`：按天写 `data/logs/privhub-YYYY-MM-DD.log`，劫持 `console.log/info/warn/error`，保留 14 天，**全程 try/catch 失败即静默退化** |
| `privhub/src/main.ts` | 136 | 日志装在**任何可能失败的初始化之前**（好设计） |
| `privhub/src/main.ts` | 144–148 | 先挂 webServer（此时**还没 listen**） |
| `privhub/src/main.ts` | 152–173 | L2 十个 Service → L1 六枢纽逐个 `await mount()`，**任一步抛错 = 直接跳出 main，HTTP 从未监听** |
| `privhub/src/main.ts` | 176–183 | `discoverL3()` 发现的插件**逐个 try/catch 挂载**，单个失败只 `console.error` 后继续 |
| `privhub/src/main.ts` | 188–197 | `await ctx.privhub.ready` → 注入 `setSessionValidator` → `await ctx.webServer.listen(port)` |
| `privhub/src/main.ts` | 212–215 | `main().catch` → `console.error('PrivHub 启动失败:', e)` + `process.exit(1)` |
| `privhub/src/web-server.ts` | 279–309 | `listen()`：`createServer` → `once('error', err)` 让端口占用等错误 **reject 到 main**；listen 回调里打端口横幅 |
| `privhub/src/web-server.ts` | 284–303 | **请求分发整体包在一个 try/catch 里** |
| `privhub/src/web-server.ts` | **300–302** | `} catch (e) { try { res.writeHead(500); res.end('internal server error') } catch {} }` —— **捕获到的 `e` 从未被使用，不写日志、不落盘、不回请求头，客户端只拿到 5 个英文单词** |
| `privhub/plugins/privhub-core/src/index.ts` | 130–147 | `readBody(req, max)` 有 16MB 上限（S1 已修，不重报） |
| `privhub/plugins/privhub-core/src/index.ts` | 314 | `route(path, handler, label)` —— **只有精确路由表，没有中间件/请求 ID/访问日志** |
| `privhub/plugins/privhub-core/src/index.ts` | 918–935 | O2 健康检查 `/privhub/api/health` **已实现**（`{ok, service, version, uptimeSeconds}`，免登录，不回路径与账号数） |
| `privhub/plugins/privhub-core/src/index.ts` | 76–77 | `/** 项目根：由启动脚本注入 PRIVHUB_ROOT；缺省回退 cwd */` |
| `privhub/plugins/privhub-core/src/index.ts` | 353–398 | `ensureDirs()` / `loadUsers()`：首次建 `data/`、写 `admin`+`user1` 默认账号；账号库损坏时**显著抛错**而非降级（D5 已修，不重报） |
| `privhub/plugins/privhub-svc-storage/src/index.ts` | 83–119 | `ensureKey()`：单飞 Promise + `flag:'wx'` 独占创建，**修复了"全新部署并发写密钥导致偶发启动失败"**（这一条已闭环，见 §3） |
| `privhub/plugins/privhub-svc-storage/src/index.ts` | 133–134 | 密钥长度异常时的报错文案自带修复提示（好） |
| `privhub/plugins/privhub-svc-storage/src/index.ts` | **401–402** | `void svc.ensureKey().catch((e) => ctx.logger.error('[storage] 密钥初始化失败: ' + e.message))` —— **只记一行日志，服务照常启动** |
| 全仓（`privhub/`） | — | grep `uncaughtException` / `unhandledRejection`：**0 命中**（§2.4 的关键前提） |

### 2.2 部署包与开发源码
| 证据 | 内容 |
|---|---|
| `scripts/build-deploy.ps1` | 41–42 源/目标默认值；**51–52** `$syncDirs = @('src','plugins','frontend')`、`$syncFiles = @('package.json','start.bat')`；57–72 数据保护（探测 `data/secret.key`、`-IncludeData` 需手输 `YES`）；75–89 `robocopy /MIR` 单向镜像；98–109 数据用 `/E`（不删目标侧）；111–136 包内自检（插件数、有无 svc-rag、有无健康端点）；**全脚本无 backup / rollback / archive / 版本号参数**（grep `bak\|backup\|rollback\|archive` 仅命中注释） |
| `privhub/tests/integrity.mjs` | 33 `DEPLOY = ../deploy/privhub-deploy`；46–114 O1 一致性闸门（50 行起：非发布模式只报告、`--release` 才判红；77–86 关键文件逐字节比对 8 个文件；110–113 校验部署包 `secret.key` 完好） |
| **实测** `node tests/integrity.mjs`（默认） | `交付完整性：50 通过 / 0 失败`，附提示"部署包落后 4 个文件" |
| **实测** `node tests/integrity.mjs --release` | **`49 通过 / 2 失败`，exit code 1**：<br>❌ 插件数一致（开发 **50** / 部署 **48**）<br>❌ 关键源码逐字节一致，**落后 4 个：`src/main.ts`、`src/web-server.ts`、`frontend/index.html`、`plugins/privhub-core/src/index.ts`** |
| 自写只读探针（已删） | 逐文件比对结果：`main.ts` dev 9987B/09-11 11:13 vs dep 9530B/09-10 18:08；`web-server.ts` 13852B vs 10471B；`index.html` 67694B vs 58182B；`core/index.ts` 42647B vs 29129B。**另 4 个关键文件（svc-audit / svc-storage / files-publish / admin-acl）逐字节 SAME** |
| 同上 | 仅开发有、部署无的插件：**`privhub-admin-console`、`privhub-shell-agent-console`**（无"仅部署有"的插件） |
| 同上 | 部署包 `package.json` **version = `0.2.0`**；开发 `package.json` = `3.1.0` |
| `privhub/package.json` | 11–27 依赖含 `better-sqlite3 ^13.0.3`、`sqlite-vec ^0.1.9` |
| 同上 | 部署包 `node_modules/`：**`better-sqlite3` 缺失、`sqlite-vec` 缺失**（开发侧两者均存在，含 `better-sqlite3/prebuilds/win32-x64.node`） |
| `privhub/plugins/privhub-svc-rag/src/vec.ts` | 12、14 **顶层** `import Database from 'better-sqlite3'` / `import { load } from 'sqlite-vec'` |
| `privhub/plugins/privhub-svc-rag/src/index.ts` | 29 `import { VectorStore, docKeyOf } from './vec'`（静态导入，无懒加载兜底） |
| `privhub/src/main.ts` | 67–81 L3 发现：`await import(...)` 失败 → 只 `console.error('[assembly] 插件加载失败: ...')`，**该插件整体不装配** |
| `cd`/`git` 实测 | `git ls-files deploy` → **空**（`deploy/` 未被 git 跟踪）；`.gitignore` 第 2–7 行 `node_modules/ data/ data-files/ … *.log`；`git ls-files` 确认 `privhub/src/main.ts`、`privhub/tests/integrity.mjs`、`scripts/build-deploy.ps1` **均已被跟踪** |
| `deploy/` 实测 | `privhub-deploy/` 含 `data/`（`secret.key` 32B，mtime 2026-08-30）、`data-files/`、`node_modules/`、`privhub-app/`、`scripts/`，**无 `tests/`、无 `docs/`**；另有 `deploy.7z`（15.3MB）、`privhub-prod-20260911.zip`（123.8MB）、`privhub-prod/`（含自己的 `data/`、`data-files/`） |

### 2.3 可观测性
| 证据 | 内容 |
|---|---|
| 实测读 `privhub/tests/.testroot/data/logs/privhub-2026-09-17.log` | 35 行，**每行 `[ISO时间] [级别]`**；含启动横幅、L3 发现、1 条告警 —— **O3 的文件日志确实在跑** |
| `privhub/server-dev.log` / `.err.log` | 33 行 / 2 行；`.err.log` 只有一条 `DEP0147` 弃用警告（`fs.rmdir`） |
| `privhub/tests/integrity.mjs` | 118–134 起为 D10 加密覆盖率静态检查（说明有磁盘落盘校验的传统） |
| 全仓 | 无指标（metrics）端点、无追踪（trace）、无访问日志、无请求 ID |

### 2.4 崩溃可见性
| 证据 | 内容 |
|---|---|
| `privhub/plugins/privhub-svc-rag/src/index.ts` | **1090–1094** `let queue = Promise.resolve()` … `const enqueue = (fn) => { queue = queue.then(fn, fn) }` —— **`queue.then(fn, fn)` 的结果没有人 catch** |
| 同上 | 1102–1116 三条 `file:changed` / `file:saved` 订阅全部走 `enqueue(...)`；1128 `setTimeout(() => { void rebuild(ctx).catch(() => {}) }, 8000)` |
| 全仓（`privhub/`） | `unhandledRejection` 处理器 **0 命中** |
| `privhub/plugins/privhub-svc-storage/src/index.ts` | 401–402 与 `svc-rag` 1082 都是 `void X().catch(...)`（**写法正确**，反证 1093 是漏写而非风格） |
| `privhub/plugins/privhub-git-backup/src/index.ts` | 37–57 `git()` 用 `execFile('git', ...)`、`probeGit()` 显式探测；166–185 git 缺失时**显著告警并停用定时器**（D11 已修，好设计） |
| `scripts/privhub-diagnose-0xc0000142.ps1` | 头注释 1–14 行 + 95 行：**"A2 shows many git.exe launches -> PrivHub git-backup probes every 60s"** —— 本机曾出现 `0xc0000142`（应用初始化失败），作者已把"每 60s 派生 git 进程"列为**首要嫌疑**并写了诊断脚本 |

### 2.5 回滚与备份
| 证据 | 内容 |
|---|---|
| `privhub/plugins/privhub-git-backup/src/index.ts` | 1–15 头注释：镜像 `data/git-backup/mirror/`，60s 增量 + `git commit`；9–11 三个端点 `commit` / `history` / `restore` |
| 同上 | **93–99** `SYSTEM_BACKUP_FILES` 15 个系统 JSON；**91** 注释"secret.key 单独排除（密钥不应进备份仓库，应离线另行保管）"；135 "不复刻删除" |
| 同上 | **241–271** `restore`：`commit` 格式白名单校验（S10）、`canAccess` + `ctx.acl.can('edit', ...)` 双重裁决、`git checkout <commit> -- <rel>` → `copyFile` 覆盖原文件 |
| 同上 | `data/` 实测：`git-backup/` 与 `rag-corpus/` 两个子目录**都不在** `SYSTEM_BACKUP_FILES` 里 |
| `privhub/data/rag-corpus/` | 存在 `manifest.json` + 27 个 `*.jsonl` 语料（测试根实测） |
| `privhub/plugins/privhub-svc-rag/src/vec.ts` | 41–46 `new Database(file)` + `journal_mode = WAL`（WAL 会额外生成 `-wal`/`-shm` 旁文件） |
| `privhub/plugins/privhub-git-backup/src/index.ts` | 102–137 `syncMirror()` **每 60s 全量递归遍历 `data-files/`**（`walkFiles` + 逐文件 `stat`） |
| `privhub/data/` 实测清单 | 仍在盘上的事故遗留：`audit.jsonl.bak-huge-446mb.damaged-20260905-060718`（**446,893,830 B**）、`audit.jsonl.bak-corrupt.damaged-…`（9.96MB）、`audit.jsonl.damaged-…`（7.54MB）、`recent.json.bak-损坏`；**读头部确认均以 `PHAUD1` 开头 = 仍是密文**（无明文泄露） |

### 2.6 环境适配
| 证据 | 内容 |
|---|---|
| `node -v` 实测 | **v24.21.0** |
| `privhub/start.bat` 22 行 | 用 `node --import tsx/esm src/main.ts`（tsx 在运行时把 TS 编译到内存，**无产物**） |
| `privhub/src/web-server.ts` 262–267 | `If-None-Match` 协商缓存（P1 已修） |
| **实测** `node tests/run-all.mjs` 相关 | 29 行 + 32 行 + 44–48 行：回归总入口**硬编码拒绝 3180/3181**，`--spawn` 会自动建"公共/A项目/B项目"并用 **junction** 软链 `src/plugins/frontend/node_modules` |
| `privhub/tests/first-run.mjs` | 1–21 头注释记录"全新部署偶发启动失败（并发写 secret.key）"；93–186 五轮清空数据冷启动 + 密钥稳定性 + `PHENC1` 落盘校验 |
| 磁盘实测 | G 盘 Free 2278.2 GB / Used 1447.8 GB |

---

## 3. 现状判定

### ✅ 做对了的（交付与运行角度）

1. **启动日志从第一行就在落盘。** `installFileLogger` 在 `main.ts:136` —— 早于 webServer、早于 storage、早于任何可能失败的初始化；写盘失败也不阻断主流程（115、131）。这一点比很多正式项目做得好。
2. **"全新部署偶发启动失败"这条真被修掉了。** `svc-storage` 83–119 的单飞 Promise + `flag:'wx'` 独占创建，配 `tests/first-run.mjs` 五轮冷启动守着；密钥稳定性（重启不换密钥）也有独立用例。这是**交付路径上最要命的一个坑，已经填了。**
3. **失败信息是给人看的。** 密钥长度不对的报错自带"hex 64 位请先转二进制"的修复指引（`svc-storage:133-134`）；账号库损坏明确拒绝启动并保留原文件（`core:376-383`）；前端 8 秒首屏兜底 + `manifestError` + 插件加载失败清单 + 重试按钮（`frontend/index.html:776-782, 912-934, 978-984, 1065-1071`）。
4. **`api()` 做了错误归一。** 网络错误 → "网络错误：…"；非 JSON 响应 → "服务器返回异常（HTTP xxx）"；401 统一登出提示（`index.html:364-385`）。**"上传失败"这类场景用户是看得到原因的。**
5. **O1/O3/O4 的三块地基已经落地**（不重报，仅记录）：
   - O2 健康端点 ✅ `core:928`；
   - O3 文件日志 ✅ `main.ts:105-132` + 实测日志文件；
   - O4 测试与打包脚本 ✅ `privhub/tests/`（16 个脚本）+ `scripts/build-deploy.ps1`；
   - O1 的一致性闸门 ✅ `integrity.mjs:46-114`，且**已实测能准确抓出漂移**。
6. **测试绝不打生产。** `run-all.mjs:32,44-48` 硬编码端口黑名单，误指向 3180/3181 直接 `exit 2`。
7. **数据保护意识到位。** `build-deploy.ps1:61-72` 默认不碰 `data/`；`integrity.mjs:110-113` 会校验部署包 `secret.key` 仍是 32B；`git-backup` 明确把 `secret.key` 排除在备份仓库外并说明理由（91 行）。
8. **备份有"可用性自证"。** `git-backup` 166–185 + `GET /api/gitbackup/status`（205–216）：git 缺失会**显著告警并停用定时器**，而不是每 60s 静默失败 —— 避免了"以为在备份、实际没有"。
9. **文件级回滚是真的、且带权限校验。** `git-backup` 241–271 的 `restore` 走 commit 白名单 + 项目权限 + 文件 ACL 三重，`git checkout` 后按字节覆盖，**能回滚到任意历史提交的某一个文件**。
10. **生产包不携带测试与文档**（`deploy/privhub-deploy/` 无 `tests/`、无 `docs/`），暴露面控制得对。

### ❌ 做错了的

1. **同步脚本是"只写不存、只前不退"。** `build-deploy.ps1` 用 `robocopy /MIR` **镜像**目标（82–89），会**删掉目标侧独有的文件**；全脚本没有一处备份、没有版本号、没有"上一次是什么"。而 `deploy/` 又**完全不在 git 里**（`git ls-files deploy` 为空）。**结论：这个仓库里唯一的生产产物没有任何版本历史；同步一次就没有"回去"的路。**
2. **漂移已经造成安全能力回退，不只是"落后"。** 实测：部署包 `src/web-server.ts`、`src/main.ts` **完全没有** `sessionValidator` / `authSlotDirs` / `unauthorized`（0 命中，开发侧分别有 4/2/1 处）。也就是说 **3181 正在把 `/privhub-plugins/<插件>/index.js` 无鉴权地发给任何能连到它的人** —— 开发版已经修好的"插件代码=API 全貌，未登录不得枚举"在线上是开着的。这在 O1 里没写（O1 记的是"落后 09-02 快照、没有 RAG"，那是**旧事实**），是新证据、且方向相反（不是缺新功能，是多了一个漏洞面）。
3. **部署包版本号是假的。** 部署包 `package.json` 里 `version = 0.2.0`，开发是 `3.1.0`；而 `GET /privhub/api/health` 上报的正是这个值（`core:922-935` 读 `<root>/package.json`）。**任何用健康端点做版本核对的手段，在 3181 上都会得到错答案** —— 偏偏"部署包落后"这件事最需要它。
4. **请求级错误被静默丢弃。** `web-server.ts:300-302` 是全站唯一的兜底 catch，却**既不写日志、也不用那个 `e`、也不回请求标识**。后果：任何一个插件路由抛异常，运维侧**零痕迹**（文件日志里也不会出现，因为它压根没调用 console），用户侧只有 "internal server error" 五个词。
5. **一处未捕获的 Promise 链会把整个服务杀掉，且没有凶手记录。** `svc-rag:1093` 的 `queue = queue.then(fn, fn)` 结果无人 catch；全仓**没有** `unhandledRejection` 处理器；Node v24 的默认行为是打印后 **`process.exit(1)`**。触发面是**日常操作**：任何 `file:changed` / `file:saved` 事件（上传、保存、删除、改名）进队列后，`ingestDoc`/`removeDoc`/`rebuild` 一旦异常 → 整个 PrivHub 对所有用户瞬断。同文件 1082 和 `svc-storage:402` 都正确写了 `.catch()`，说明这是**漏写**。这是本次评审**最脆的单点**：一次普通上传就能让服务自尽。
6. **密钥初始化失败不阻断启动。** `svc-storage:402` 只记一行日志就继续。结果是服务**看起来完全正常**（能登录、能开界面），但每个文件操作都会失败 —— 对用户是"系统坏了"，对运维是一行埋在日志中间的 `[storage] 密钥初始化失败`。**"能否提供服务"的判据没进启动门槛。**
7. **没有进程级看护，也没有启动前置检查。** `start.bat` 22 行裸跑 node：没检查 node 是否装了/版本是否够、没预检 3180/3181 是否被占、失败后只 `echo` 一行英文 + `pause`。端口被占用的表现是 `listen` 的 `error` 事件 reject → `main().catch` → `PrivHub 启动失败: ...` ——**技术上看得见，但用户面对的是一个黑窗口一闪的 pause 界面，没有任何"现在该怎么办"的指引**（没有指向 `data/logs/`、没有"检查端口"、没有"重试"）。
8. **备份覆盖不到"用起来贵"的那部分数据。** `git-backup` 的备份范围 = `data-files/` + 15 个系统 JSON（93–99）。**未覆盖**：`data/rag-corpus/`（语料 + `manifest.json` + `vectors.db`，WAL 模式还有 `-wal`/`-shm` 旁文件）、`data/agent-keys.json`（32KB 的智能体密钥）、`data/doc-versions/`、`data/agent-idem/`、`data/audit.jsonl`、`data/logs/`。丢 `secret.key` = 全丢（已知，且刻意排除在备份外，这是**对的**），但"密钥有、语料没了"意味着**只能重新向量化一遍**——对一个大库来说是以小时计的停机；而 `client` 的 RAG 界面不会告诉运维"你只有重灌这一条路"。
9. **60s 轮询全量递归 + 每次派生 git 进程**，在本机已经出过症状。`syncMirror()` 每 60s 走一遍 `data-files/` 全树逐文件 `stat`；每轮还可能 `git add -A` + `git commit`（`execFile` 派生进程）。`scripts/privhub-diagnose-0xc0000142.ps1:95` 自己写下了这个因果关系。当前数据量小，还撑得住；这是**容量与 Windows 进程派生**两个维度的已知脆弱点，且**没有上限保护或节流**。
10. **事故遗留物没有清理策略。** `privhub/data/` 里躺着 446MB + 9.9MB + 7.5MB 三个损坏审计文件（合计约 464MB），从 09-05 留到今天。它们确实是密文（无泄露），但**没有任何机制告诉运维"这些可以删"**，也没有保留策略；同时说明当时那起事故**没有留下可执行的复盘产出**（没有 runbook、没有"下次怎么发现"的条目）。

### ❓ 我看不出来的

1. **3181 现在到底起没起、跑得怎么样。** 纪律要求不启动服务，我没连过 3180/3181，也没看它的 `data/logs/`。
2. **部署包的 `node_modules` 是怎么来的。** 部署包有明显早于当前 `package.json` 的 `node_modules`（`@deepseek-ai` 在、`better-sqlite3`/`sqlite-vec` 不在），但 `build-deploy.ps1` 明确**不同步 `node_modules`**，只打印一句"npm install # first time only"。**没人能保证生产上装的是否是当前依赖**——这一步完全靠人。
3. **`0xc0000142` 是否现在还在复发。** 我只能看到诊断脚本和它指认的嫌疑对象，看不到实际发生频率。
4. **非程序员使用者的真实操作路径。** 有没有人真的双击 `start.bat 3181`、出错了会不会翻 `data/logs/`，我没有证据。
5. **`deploy/privhub-prod/`（另一个含 `data/` 的目录）是什么角色。** 它有独立的 `data/`、`data-files/` 和 `package.json`，与 `privhub-deploy/` 并列。是历史备份还是另一套生产？未核实。
6. **`--spawn` 在你机器上的真实红绿。** 交底 §5 标注[存疑]（沙箱禁子进程）。我这次没跑 `run-all.mjs --spawn`（它要起 3190 实例），只跑了 `integrity.mjs`。**当前完整的回归基线我不知道。**

---

## 4. 改进建议（按投入产出比排序）

### P0-1｜给同步加上"上一次"，并把生产包纳入版本管理
- **【问题】** 同步是单向镜像，产物不在 git 里，没有版本号 —— 出事无法退回，也无法知道当前是哪一版。
- **【证据】** `scripts/build-deploy.ps1:82-89`（`robocopy /MIR`，会删目标侧独有文件）；全脚本无 backup/rollback（grep 仅命中注释）；`git ls-files deploy` → 空；部署包 `package.json` version = `0.2.0` vs 开发 `3.1.0`；`privhub/tests/integrity.mjs:33`。
- **【改法】** 三件小事，都不动架构：
  1. `build-deploy.ps1` 在第一次写盘**之前**，把 `$OutDir` 的 `src/`、`plugins/`、`frontend/`、`package.json`、`start.bat` 打成一个 `deploy/_snapshots/privhub-<yyyyMMdd-HHmm>.zip`（**不含 `data/`、`data-files/`**，体积小）；
  2. 同步结束后把 `privhub/CHANGELOG.md` 的版本号写进部署包 `package.json`（用 `-Force` 覆盖 version 字段），**让 `/privhub/api/health` 上报真版本**；
  3. 同步结束时打印"回退命令"一行：`robocopy` 从哪个 snapshot 解到什么位置，并落一份 `deploy/_snapshots/LAST.txt`。
- **【验收】** 连跑两次 `build-deploy.ps1`：`deploy/_snapshots/` 出现两个 zip；`curl http://127.0.0.1:3181/privhub/api/health` 返回的 `version` 与 `privhub/package.json` 一致；按打印出的回退命令能恢复上一版（**必须真跑一遍**，不是写在文档里）。
- **【成本】** 中（改一个 ps1，约 40 行）。

### P0-2｜立刻补齐 3181 上"倒退"的那部分（对齐后才有资格谈发布）
- **【问题】** 生产包缺 `sessionValidator`/`authSlotDirs`，`/privhub-plugins/*` 无鉴权；缺 `privhub-admin-console`、`privhub-shell-agent-console`；`frontend/index.html` 与 `core` 落后一个多星期的修复。
- **【证据】** 部署包 `src/web-server.ts` 中 `sessionValidator`/`authSlotDirs`/`unauthorized` **0 命中**，开发侧 4/2/1 命中；部署 `src/main.ts` 无 `setSessionValidator`（开发 `main.ts:194`）；`node tests/integrity.mjs --release` 实测输出 `❌ 插件数一致（开发 50 / 部署 48）`、`❌ …落后 4 个：src/main.ts, src/web-server.ts, frontend/index.html, plugins/privhub-core/src/index.ts`。
- **【改法】** **先做 P0-1（拿到快照与回滚手段），再执行同步**：`powershell -ExecutionPolicy Bypass -File scripts/build-deploy.ps1`（默认模式，**不要**加 `-IncludeData`）。同步后立刻 `node tests/integrity.mjs --release` 必须 0 失败。**这一步必须由主子显式授权**（生产同步是授权动作）。
- **【验收】** `integrity.mjs --release` 全绿（0 失败）；`3181` 上未登录直接请求 `/privhub-plugins/privhub-files-explorer-v3/index.js` 返回 **401**；`/privhub-plugins/privhub-auth/index.js` 仍返回 200（登录框不能被打死）。
- **【成本】** 小（一条命令 + 一次验收），但**授权优先级最高**。

### P0-3｜把"看不见的 500"和"会杀进程的 Promise 链"堵上
- **【问题】** ① 所有路由异常被静默吞掉，运维零痕迹；② 一处未 catch 的 Promise 链会随一次普通文件操作把整个服务打挂，且没有凶手记录。
- **【证据】** ① `privhub/src/web-server.ts:300-302`（`catch (e)` 里 `e` 未被使用、无日志）；② `privhub/plugins/privhub-svc-rag/src/index.ts:1090-1094`（`queue = queue.then(fn, fn)` 结果无人 catch）+ 1102–1116 全部经 `enqueue` + 全仓 `unhandledRejection` **0 命中** + 对照 `svc-rag:1082` 与 `svc-storage:402` 都写了 `.catch()`。
- **【改法】** 两行到十行级别：
  1. `main.ts` 在 `installFileLogger` 之后加两个兜底：`process.on('unhandledRejection', (r) => console.error('[fatal] unhandledRejection:', r))` 与 `process.on('uncaughtException', (e) => console.error('[fatal] uncaughtException:', e))`；**先只记录不退出**（保持现状行为，避免掩盖问题），并把这两条写进日志标题里，运维一眼能认；
  2. `web-server.ts:300-302` 的 catch 里加日志（**必须带上请求方法 + 路径 + 错误栈**），保持给客户端的回包不变；
  3. `svc-rag:1093` 改成 `queue = queue.then(fn, fn).catch((e) => { console.error('[svc-rag] 队列任务失败:', e) })` —— 让队列自己不携带 rejection（**注意**：这只防"队列把进程带走"，任务内部失败该怎么报错是 RAG 自己的事，不在本角度）。
- **【验收】** 人为让一个路由抛错（例如临时改一个插件的 handler 抛异常并重启——**在隔离测试实例上做，不要碰生产**）：`data/logs/privhub-YYYY-MM-DD.log` 出现带路径与栈的记录，客户端仍是 500。给 `svc-rag` 队列塞一个必失败的函数：**服务不退出**，日志出现 `[svc-rag] 队列任务失败`。
- **【成本】** 小（三处、<20 行）。

### P0-4｜让"起没起来"变成一个可判定的问题（启动自检 + 健康端点补关键位）
- **【问题】** 密钥初始化失败、`data/` 不可写、`PRIVHUB_ROOT` 没锚定 —— 这三种情况服务都会**照常启动**，用户看到"能登录但什么都干不了"或"数据不见了但系统是空的"；`start.bat` 对最常见的失败（没装 node、端口被占）不给任何处置指引。
- **【证据】** `privhub/plugins/privhub-svc-storage/src/index.ts:401-402`（密钥失败只记日志）；`privhub/src/main.ts:53` 与 `privhub/plugins/privhub-core/src/index.ts:76-77`（`PRIVHUB_ROOT` 缺省回退 `process.cwd()`，全仓 **23 个文件**依赖它，而本机 User/Machine 层**均未设置**该变量）；`privhub/start.bat:22-25`（无前置检查，失败只有一行英文 + `pause`）；`privhub/src/main.ts:188-197`（启动门槛只 `await ctx.privhub.ready`）。
- **【改法】**
  1. `main.ts` 启动时若 `PRIVHUB_ROOT` 未设置，打一条**醒目告警**（"未锚定数据根，当前使用 `<cwd>`"）；更稳的做法是直接在 `main.ts` 里把 `rootDir` 强制定为 `src/main.ts` 的相对上级，不再依赖环境变量；
  2. 把"密钥可用"并入启动门槛：在 `await ctx.privhub.ready` 前后加一次 `await ctx.storage.ensureKey()`，失败则**打印明确处置指引后退出**（"密钥不可用 → 数据无法解密 → 请检查 `data/secret.key` 是否为 32 字节"），而不是带病对外；
  3. `start.bat` 加三行前置：`where node`（缺失就打印中文提示 + 下载地址 + `pause`）、端口占用预检（`netstat -ano | findstr :%PRIVHUB_PORT%` 命中就提示"端口已被占用，可能是重复启动，请先关掉旧窗口"）、启动失败时打印 `data\logs\` 的完整路径；
  4. 健康端点从"我活着"升级为"我还能干活"：在 `core:928` 的返回里加一个 `dataWritable` 布尔（**不要**加路径、账号数、插件清单）。
- **【验收】** ① 手动把 `data/secret.key` 改成 31 字节，启动必须**明确失败**并给出中文指引，而不是进到登录界面；② 不设 `PRIVHUB_ROOT`、从任意目录启动，日志首屏出现告警；③ 3180 已被占用时再双击 `start.bat`，窗口里能看到中文提示而不是英文异常；④ `curl /privhub/api/health` 里能看到 `dataWritable`。
- **【成本】** 小到中（bat 十几行，TS 十几行）。

### P0-5｜把"恢复"补成一份能照着做的清单，并让备份自证覆盖范围
- **【问题】** 备份范围不含 RAG 语料/向量库与智能体密钥，且没有任何地方告诉运维"丢了之后怎么办、要多久"；`secret.key` 不进备份是**正确决定**，但因此缺少"离线怎么存、怎么恢复"的唯一说明；464MB 事故遗留物无人敢动。
- **【证据】** `privhub/plugins/privhub-git-backup/src/index.ts:93-99`（`SYSTEM_BACKUP_FILES` 15 项，不含 `rag-corpus`、`agent-keys.json`、`doc-versions`、`audit.jsonl`）、91（`secret.key` 刻意排除）、135（不复刻删除）；`privhub/plugins/privhub-svc-rag/src/index.ts:35-39`（`CORPUS_DIR`/`VEC_DB_FILE` 在 `data/rag-corpus/`）；`privhub/plugins/privhub-svc-rag/src/vec.ts:41-46`（WAL）；`privhub/data/` 实测三个损坏审计文件共约 464MB。
- **【改法】**
  1. 在 `git-backup` 的 `SYSTEM_BACKUP_FILES` 里**按"重生成代价"补两类**：`agent-keys.json`（丢了所有智能体要重新签发，纯手工）纳入；`rag-corpus/` 与 `vectors.db`（可重建但慢）**纳入或不纳入都行，但必须在 `/api/gitbackup/status` 的返回里显式声明"未覆盖 + 影响"**——现状是 `scope` 字段（213 行）只列了覆盖项，运维无法从接口看出**没覆盖什么**；
  2. 写一份 `docs/PrivHub-运维手册.md`（**新建**，不动已有文档），就三节：**备份什么/不备份什么**、**恢复三步**（停服 → 放回 `data/`+`data-files/`+`secret.key` → 起服校验 `/privhub/api/health`）、**密钥离线保管**；
  3. 给 464MB 遗留物一个处置结论（当次保留、下次清理），并在手册里写明"损坏审计文件命名规则 = `*.damaged-<时间戳>`，确认无用后可删"。
- **【验收】** `GET /privhub/api/gitbackup/status` 的返回里能看出"哪些没覆盖"；按手册从一份备份在**隔离实例**上完成一次完整恢复（含 `secret.key`），恢复后能登录并读到原文件。
- **【成本】** 小（文档）+ 小（改一个数组与一个返回字段）；**恢复演练**是中（要占一次人工窗口）。

---

## 5. 我建议不要做的

1. **不要上 CI/CD、Docker、K8s、Nginx 反向代理。** 这套东西的形态是"局域网内、一个文件夹搬走就能跑、双击 bat 启动"。加一层部署编排，收益是"自动"，代价是**非程序员再也看不懂怎么启动**。上面的 P0-1 用 40 行 robocopy 脚本就能拿到 80% 的收益。
2. **不要引入日志框架（pino/winston）。** `main.ts:105-132` 的 28 行已经够用，而且"劫持 console"这个做法让 43 个插件里所有裸 `console.error` **自动**进了文件 —— 换框架反而要改 43 个插件。要做的是**补上没调到 console 的地方**（P0-3 的 `web-server.ts:301`）。
3. **不要为了"可观测性"给 112 条路由加埋点或接 Prometheus。** 这个项目的运维者是一个人、一台机器。`/privhub/api/health` + 一个带时间戳的文件日志 + **请求级错误可见**，已经覆盖 95% 的排障场景。指标与追踪在这里是纯粹的负债。
4. **不要引入"启动即自动备份"或定时全量 zip。** `git-backup` 的增量镜像设计是对的；再加一路全量打包会和它抢磁盘与 IO，还会让"哪个才是可信备份"变得模糊。
5. **不要把 `secret.key` 放进 git 仓库或备份仓库。** 现在是刻意排除的（`git-backup:91`），这是**正确**的。要做的是补文档与离线存放约定（P0-5），不是改写代码。
6. **不要为"防止 `better-sqlite3` 版本不匹配"而 vendor 或手拷 `node_modules`。** 跨机器、跨 Node 版本拷原生模块是**更**不稳的做法。正确动作是让 `npm install` 成为一条有据可查的步骤（部署清单第 5 条），并在启动自检里**显式探测**它（P1-2）。
7. **不要现在去动 `git-backup` 的 60s 轮询周期调优。** 症状确实存在（`0xc0000142` 诊断脚本指认了它），但当前数据量下不是首要矛盾，而且改周期要重新权衡"备份新鲜度"。**先把这件事记下来**（它已经在诊断脚本里被指认过一次），等数据量真的上来再说 —— 但**必须给个观察点**（这属于 P1-3）。
8. **不要为了"生产包完整性"把 `tests/` 复制进部署包。** 生产包不带测试是对的（减小暴露面）。需要的是让**开发侧**能对着生产包跑校验 —— 这正是 `integrity.mjs` 在做的事，只是现在没被当成闸门用。

---

## 6. [存疑] / 未实测项

| # | 项 | 为什么没实测 |
|---|---|---|
| 1 | 3180/3181 的实际运行状态、其 `data/logs/` 内容 | 纪律明令不启动服务、不碰 `data/` |
| 2 | `node tests/run-all.mjs --spawn` 的真实红绿（3190 隔离实例） | 交底 §5 已标[存疑]（沙箱禁子进程）；本次只跑了 `integrity.mjs`（纯静态，无需服务）。**当前完整回归基线未知** |
| 3 | 3181 上 `/privhub-plugins/*` 无鉴权的**实际可利用性**（是否真有人这么访问过） | 无法连生产；结论由源码比对得出（**【实体】+【推断】**：代码里确无鉴权分支，是否已被利用无日志可查——**恰恰因为 P0-3① 的存在，即使被扫过也查不到**） |
| 4 | `deploy/privhub-deploy/node_modules` 与当前 `package.json` 的完整一致性 | 只比对了 `better-sqlite3`/`sqlite-vec`/`@deepseek-ai` 三项存在性，未逐一比对版本 |
| 5 | `0xc0000142` 当前复发频率 | 只有诊断脚本，无历史日志证据 |
| 6 | `deploy/privhub-prod/` 的角色（第二套生产？历史备份？） | 未核实，未打开其 `data/` |
| 7 | `privhub-app/`、`privhub/scripts/` 在开发与部署目录里各自的作用 | 只看到存在；未读代码确认是否已被架构淘汰 |
| 8 | WAL 模式下 `vectors.db` 的备份一致性（`-wal`/`-shm` 旁文件） | 未实测"只拷 `vectors.db` 会丢多少"；`git-backup` 现在根本不碰 `rag-corpus/`，所以此问题**当前不发作**，一旦按 P0-5 纳入就必须处理 |
| 9 | 单机 `data-files/` 规模上限：`syncMirror` 全量递归要到多少文件才明显拖慢 | 当前数据量小，未做容量实验 |

---

## 7. 我这个角度的适用边界

**这个角度能看到什么：** 从"双击 bat"到"用户能用"之间的每一步、出错时**谁**能看见、**怎么**看见；同步与回滚有没有退路；哪些点一坏就全坏；以及把这些翻译成非程序员能执行的检查清单。

**这个角度看不到什么：**

1. **看不到"功能对不对"。** 我能说 `/privhub/api/health` 存在，说不出它返回的 `version` 业务上对不对；能说 RAG 插件在缺 `better-sqlite3` 时不会装配，**说不出 RAG 的检索质量**。这些属于功能与数据角度。
2. **看不到"数据层内部的可靠性"。** 审计文件的迁移竞态（D1）、读写无锁（D6）、损坏即覆写（D4）是数据角度的事，我只从"备份覆盖到了吗、丢了要多久恢复"这一面去看。**两者会重叠，但深度完全不同。**
3. **看不到"安全边界的正确性"。** P0-2 里我说的是"生产缺了开发版的鉴权分支、且这件事没有任何机制拦下来"——**交付角度**的漂移问题。那个分支本身够不够、有没有绕过，是安全角度的事。
4. **看不到"架构会不会腐化"。** `CORE_PLUGINS` 双源维护（E1）、插槽边界这类问题，我只有在它**导致启动静默少一个插件**时才关心。
5. **判不了的最大一块：生产环境的真实状态。** 我没有 3181 的运行日志、没有它的进程状态、不知道它是不是真的有人在用。**所有关于"生产"的结论都是建立在"`deploy/privhub-deploy/` 就是 3181 跑的目录"这个假设上**——这个假设来自交底文件与 `部署说明.md`，我没有独立验证。如果实际跑的是 `deploy/privhub-prod/` 或别的目录（§6-6），P0-2 的结论**方向不变（两处都有同样的漂移风险），但具体缺什么需要重新比对**。

**要让我把话说满，需要什么：**
- 一次**授权后的**3181 健康端点查询与 `data/logs/` 抽查（不启动、只读现有文件）；
- 一次 `node tests/run-all.mjs --spawn` 的真实基线；
- 一句明确答复：`deploy/privhub-deploy/`、`deploy/privhub-prod/` 哪个是生产，以及 `node_modules` 是谁、什么时候装的。

---

## 附：故障场景表（现状 → 能否察觉 → 能否恢复 → 证据）

| # | 故障场景 | 现在会怎样 | 用户/运维能否察觉 | 能否恢复 | 证据（file:line） |
|---|---|---|---|---|---|
| 1 | **上传/保存文件触发 RAG 摄取异常** | `enqueue` 的 `queue.then(fn,fn)` 变成 rejected 且无人 catch；Node v24 打印未捕获拒绝后 **`process.exit(1)`** —— **整个服务对所有用户瞬断**，日志里只有原始异常，没有"服务因此退出"的结论行 | ⚠️ 用户：页面所有请求同时失败、`api()` 归一为"网络错误"或 401 登出（`index.html:370-378`）。运维：**只能看到原始异常，看不出它已经杀死了进程** | ✅ 重启即恢复（数据无损）。但**根因不会消失，下次上传同一文件再挂一次** | `svc-rag/src/index.ts:1090-1094`、`1102-1116`；全仓 `unhandledRejection` **0 命中**；对照 `svc-rag:1082`、`svc-storage:402` 有 `.catch()` |
| 2 | **某个插件路由抛异常（如某次格式不合规的请求）** | `web-server` 兜底 catch → 客户端 **500 "internal server error"** | ❌ 运维：**零痕迹**。（catch 里的 `e` 未被使用，也没调 console → **文件日志里也没有**）。用户：只看到 5 个英文单词，不知道是不是自己的错 | ✅ 服务不受影响，单请求失败 | `src/web-server.ts:300-302` |
| 3 | **`data/secret.key` 丢失或长度不对** | 启动时 `ensureKey()` 失败 → **只记一行日志，服务照常对外** | ⚠️ 用户：**能登录、能开界面**，但每个文件操作失败 → 报"系统坏了"。运维：需要在一堆启动日志中间找到 `[storage] 密钥初始化失败` | ⚠️ **有备份才可恢复**（密钥离线另存）；若密钥彻底丢失 → **全部数据永久无法解密**（`PHENC1`） | `svc-storage/src/index.ts:401-402`、`133-134`；`main.ts:188-197`（启动门槛不含密钥）；`部署说明.md:55` |
| 4 | **端口 3180/3181 已被占用（重复双击）** | `listen` 的 `error` 事件 reject → `main().catch` → 打印"PrivHub 启动失败: ..." → `exit 1` | ⚠️ **技术上看得见**（黑窗口里一行英文 + `pause`），但没有任何"现在该怎么办"的指引；**若旧实例还在，用户会对着旧版本以为"更新没生效"** | ✅ 关掉旧窗口或换端口 | `src/web-server.ts:305-308`；`src/main.ts:212-215`；`start.bat:22-25` |
| 5 | **没装 Node，或 Node 版本不对** | `node` 命令找不到 → cmd 报"不是内部或外部命令" → `errorlevel` + `pause` | ⚠️ 用户：看到一行**系统英文报错**，不知道该装什么 | ✅ 装 Node 即可，但**没有任何地方告诉他装哪个版本** | `start.bat:22-25`（无 `where node` 前置检查）；`package.json:14`（`better-sqlite3 ^13.0.3` 对 Node 版本有要求） |
| 6 | **生产包缺 `better-sqlite3`/`sqlite-vec`**（实测就是这状态） | `discoverL3` 在 `import()` `svc-rag` 时失败 → 只打一行 `[assembly] 插件加载失败: privhub-svc-rag` → **RAG 功能整体不装配，服务正常启动** | ⚠️ 用户：界面正常，**RAG 入口直接不存在**（不是报错，是没有）——"我这儿明明是好的"。运维：需要主动去比对启动日志里的 L3 清单行数 | ✅ `npm install` 后重启 | `deploy/privhub-deploy/node_modules/` 实测缺两者；`svc-rag/src/vec.ts:12,14`（顶层导入）；`svc-rag/src/index.ts:29`；`main.ts:67-81` |
| 7 | **`PRIVHUB_ROOT` 未锚定**（例如不经 bat、直接 `node src/main.ts`） | 数据根静默变成当前工作目录 → **新建一套空的 `data/` 和新密钥，服务照常起来** | ❌ 用户：看到的是"一个干净的新系统"，**没有任何提示**。运维：只有翻日志才发现数据根不是预期的 | ⚠️ 旧数据还在原处（只要没在原目录再启动），但**两套数据从此分叉** | `main.ts:53`；`core/src/index.ts:76-77`；全仓 **23 个文件**依赖该变量；本机 User/Machine 层均未设置（实测） |
| 8 | **`git` 未安装 / 不在 PATH** | `probeGit()` 失败 → **显著告警 + 停用 60s 定时器** | ✅ **能察觉**：控制台 + 日志有中文告警；`GET /api/gitbackup/status` 返回 `gitAvailable:false` | ⚠️ 需装 git 或改用别的备份方式；期间**没有自动备份** | `git-backup/src/index.ts:48-57`、`166-185`、`205-216` |
| 9 | **某次误操作覆盖/删掉一个文件** | `git-backup` 每 60s 镜像并 commit，**保留历史** | ✅ `GET /api/gitbackup/history` 能列出该文件的所有提交 | ✅ **能恢复**：`POST /api/gitbackup/restore {project, path, commit}` → `git checkout <commit>` → 按字节覆盖；带格式白名单 + 项目权限 + 文件 ACL 三重校验 | `git-backup/src/index.ts:9-11`、`219-238`、`241-271` |
| 10 | **误删/损坏账号、ACL、标签等系统数据** | `SYSTEM_BACKUP_FILES`（15 项）在备份范围内 | ✅ history 可查 | ✅ 可恢复（同 #9；注意 `restore` 端点是按"项目+文件路径"设计的，系统文件恢复需要人工到 `data/git-backup/mirror/_system/` 取） | `git-backup/src/index.ts:93-99`、`122-134` |
| 11 | **RAG 语料/向量库丢失或损坏** | `rag-corpus/`（`manifest.json` + 27 个 jsonl + `vectors.db`）**不在备份范围内** | ❌ 运维：`/api/gitbackup/status` 的 `scope` **只列覆盖项、不列未覆盖项** —— 看不出这里有个洞 | ⚠️ **只能重新向量化**（要模型可用 + 以小时计）；`.db` 是 WAL 模式，单独拷还有一致性风险 | `git-backup/src/index.ts:93-99`（无 `rag-corpus`）、`213`（`scope` 只列 files/system）；`svc-rag/src/index.ts:35-39`；`vec.ts:41-46` |
| 12 | **磁盘被事故文件占满** | 464MB 损坏审计文件（446MB+9.9MB+7.5MB）自 09-05 起持续占位；`main.ts` 的日志清理只管 `data/logs/` 下 14 天，**不管这些** | ❌ 没有任何机制提示；只能靠人 `ls` 发现 | ✅ 确认是密文（头 `PHAUD1`）且是损坏副本，可删；但**没有文档说"可以删"** | `privhub/data/` 实测清单；`main.ts:121-130`（仅清理 `privhub-*.log`） |
| 13 | **上线后发现新版本有问题，想退回上一版代码** | `build-deploy.ps1` 是 `robocopy /MIR` 单向镜像，**无备份、无版本号、无回退参数**；`deploy/` 不在 git 里（`git ls-files deploy` 为空） | ❌ 运维：**连"上一版是什么"都无从查证**（只能猜 `deploy.7z` / `privhub-prod-20260911.zip` 的时间） | ❌ **代码层面没有可执行的回退路径**；数据层面备份完好（#9/#10） | `scripts/build-deploy.ps1:82-89`（含无 backup/rollback）；`git ls-files deploy` 空；`deploy/` 下 `deploy.7z`(15.3MB)、`privhub-prod-20260911.zip`(123.8MB) |
| 14 | **生产上出现异常，想按版本核对"跑的是不是最新"** | `GET /privhub/api/health` 返回部署包 `package.json` 的 `version` = **`0.2.0`**（开发是 `3.1.0`） | ❌ **最需要版本号的地方给了错答案** —— 用健康端点核对版本会得出"两套完全不同的系统"这种误导性结论 | ✅ 同步后即正确 | `deploy/privhub-deploy/package.json` 实测 version=0.2.0；`privhub/package.json:3` = 3.1.0；`core/src/index.ts:922-935`（读 `<root>/package.json`） |
| 15 | **启动时某个 L1/L2 插件 `mount` 抛错** | `await mount(...)` 直接跳出 `main()` → `main().catch` → 打印"PrivHub 启动失败" → **HTTP 从未监听** | ⚠️ 用户：**浏览器完全打不开页面**（连前端 8 秒兜底都走不到，因为服务没监听）。运维：控制台 + 启动日志里能找到那行 `PrivHub 启动失败:` | ✅ 修掉该插件即可 | `main.ts:144-173`（逐个 `await`，无 try/catch）、`212-215`；对照 `176-183`（L3 有 try/catch） |
| 16 | **前端首屏加载不出来（插件 import 失败/网络中断）** | 8 秒兜底 → 显示"以下插件未能加载：…"+"常见原因：服务端刚重启、网络中断，或该插件文件缺失。可先重试，仍失败请查看服务端日志"，并给重试按钮 | ✅ **能察觉，且文案可操作** —— 这一条做得好 | ✅ 重试 / 重启服务 | `frontend/index.html:776-782`、`845`、`912-934`、`978-984`、`1065-1071` |
| 17 | **`data/` 或 `data-files/` 被误删/被同步脚本覆盖** | `build-deploy.ps1` **默认不碰**两者（探测到 `secret.key` 就报告"将保留"）；`-IncludeData` 需手输 `YES` 才覆盖 | ✅ 同步过程中有明确打印 | ✅ 从备份恢复（#9/#10；但 #11 的语料无法恢复，只能重灌） | `build-deploy.ps1:57-72`、`98-109`（数据用 `/E`，不删目标侧独有文件）；`integrity.mjs:110-113`（校验部署包密钥仍 32B） |
| 18 | **回归测试误打到生产（3180/3181）** | `run-all.mjs` 端口黑名单：直接 `console.error` 两行 + **`process.exit(2)`**，测试根本不跑 | ✅ 拒绝执行并说明原因 | —— 无需恢复 | `tests/run-all.mjs:31-32`、`41-48` |
| 19 | **`data-files/` 规模涨到很大（十万级文件）** | 每 60s `syncMirror()` 全量递归 + 逐文件 `stat`；有变更时再 `git add -A` + `commit`（派生进程）；**无上限、无节流、无跳过策略** | ❌ 没有任何耗时/量级指标；只能感觉到机器变慢 | ⚠️ 需要调参或换策略，**当前没有可调的东西** | `git-backup/src/index.ts:35`（`POLL_MS=60s`）、`102-137`、`140-156`；`scripts/privhub-diagnose-0xc0000142.ps1:95`（自陈 git.exe 每 60s 派生的因果） |
| 20 | **生产包与开发源码再次分叉** | `integrity.mjs` **能准确抓出来**（本次实测：`--release` 下 `49 通过 / 2 失败`，精确列出落后的 4 个文件与插件数差 2） | ✅ 能察觉 —— **但只有你主动去跑它才知道**；默认模式下它只是"提示"，不判失败，不会拦住任何人 | ✅ 跑一次 `build-deploy.ps1` 即可对齐 | `tests/integrity.mjs:46-114`（尤其 97-107）；实测 `node tests/integrity.mjs --release` → exit 1 |

---

### 给非程序员的"上线前必查 8 条"（P0 建议落地后的最小清单）

| # | 动作 | 怎么算通过 |
|---|---|---|
| 1 | 跑 `node tests/integrity.mjs --release` | 输出 **0 失败**（现在会红 2 条） |
| 2 | 跑 `powershell -ExecutionPolicy Bypass -File scripts/build-deploy.ps1` | 结束时有 `deploy/_snapshots/` 快照；打印的"回退命令"**你自己抄一份留着** |
| 3 | 检查目标机器的 Node | `node -v` 有输出即可（当前基线 **v24.21.0**） |
| 4 | 检查端口没被占 | 双击前先确认没有另一个 PrivHub 黑窗口开着 |
| 5 | 检查 `node_modules` | 目标目录里有 `node_modules` 且里面有 `better-sqlite3` 文件夹（**没有就 `npm install`**） |
| 6 | 起服务后看 `/privhub/api/health` | 浏览器打开 `http://127.0.0.1:3181/privhub/api/health`，能看到 JSON 且 `version` = 你这次发布的版本号 |
| 7 | 未登录访问一次插件代码 | 打开 `http://127.0.0.1:3181/privhub-plugins/privhub-files-explorer-v3/index.js`，应显示 **unauthorized** |
| 8 | 出事时看哪里 | 服务端窗口的第一行与 `data\logs\privhub-<今天>.log`；要退回上一版 → 用第 2 步抄下来的回退命令 |

> 这 8 条里，**第 2 条和第 6 条现在做不到**（没有快照、版本号是 0.2.0），第 7 条现在会**不通过**（会真的返回插件代码）。这就是 P0-1 与 P0-2 的由来。
