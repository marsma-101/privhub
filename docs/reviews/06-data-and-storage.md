# 06 · 数据与存储角度评审

> 评审人：萧潇（数据与存储角度）
> 日期：2026-09-18
> 源码基线：v3.1.0
> 纪律声明：**未修改 `privhub/` 下任何源码，未改 `docs/` 下任何已有文件**，本文件是本次唯一新增。
> 运行过的命令仅两条：`node tests/integrity.mjs`（静态检查，50 通过 / 0 失败）与针对 **:3190 隔离测试实例**的 HTTP 只读/临时写入探测（见 §6 说明）。

---

## 1. 一句话结论

**这个项目的"文件"和"关于文件的知识"是两套各写各的东西，中间没有任何校核**——
文件本体在 `data-files/`，而"它叫什么、在哪、内容是什么"同时散落在 `data/*.json`、内存全文索引、明文向量库三处，全部以 `项目::路径` 为键。

于是出现三条同源的病：

- **路径一改，知识就指向虚处**（重命名目录、删除目录、恢复目录后，索引要么清不掉、要么建不起来）；
- **路径一出生就是隐形**（文件名以 `.` 开头时上传返回成功，但列表里永远看不到它——**文件建得成、看不见、也删不掉**）；
- **同名一传，旧内容就没了**（覆盖走 `rename` 直落，没有备份、没有版本快照、没有确认）。

再加两个会让人误判系统能力/可靠性的：

- **RAG 的"检索/问答"入口目前必然报错**（源码级时序错误），所以"向量数据库"这条链路实际是"只进不出"——语料一直在进，检索从来没成功过；
- **同一个用户文件最多有三条互不认识的写路径**（网页编辑器 / 智能体沙箱 / Office 插件 / git 回滚），其中五条**没有任何冲突检测**，是"静默覆盖别人刚存的内容"的温床。

**一句话给非程序员**：文件是安全的（加密、原子写、密钥生成都有讲究）；**不安全的是"关于文件的记忆"**——它散在三处、各记各的，谁都没负责在文件动过之后去核对一遍。

---

## 2. 我实际看过的证据

### 2.1 逐行读过的源码

| 文件 | 行段 | 看的是什么 |
|---|---|---|
| `privhub/plugins/privhub-core/src/index.ts` | 300-429 | `withFileLock` 实现、`loadUsers/saveUsers`、`atomicWrite`、会话 |
| 同上 | 430-549 | 个人空间登记、`retiredDirs`、`checkNameAvailable`、`changeDisplayName` 回滚顺序 |
| 同上 | 595-692 | `allProjects` / `visibleProjects` / `indexableProjects` / `canAccess` / `resolveInProject` / `resolveReal` |
| 同上 | 694-911 | `listFiles`、`readFileForPreview`、`createProject`、`moveProjectToTrash`、`createFolder`、`renameEntry`、`isValidName`、回收站四条路径 |
| 同上 | 915-959 | 挂载、会话定时清理、`ready` 串行初始化 |
| `privhub/plugins/privhub-svc-storage/src/index.ts` | 全 403 行 | 密钥单飞/`flag:'wx'`、`encryptBuffer/decryptBuffer`、`writeBuffer` 原子写、`createWriteStream`、`auditScan`、`migrateTree` |
| `privhub/plugins/privhub-files/src/index.ts` | 全 249 行 | `list` / `preview` / `preview-raw` / `upload` / `mkdir` / `delete` / `rename` / `move` / `download` |
| `privhub/plugins/privhub-files-fulltext/src/index.ts` | 全 141 行 | 索引全量重建、`file:changed` 增量分支、个人空间闸门 |
| `privhub/plugins/privhub-svc-search/src/index.ts` | 全 251 行 | 内存索引结构、`index` / `remove`、BM25、`searchFulltext` 的 visible 过滤 |
| `privhub/plugins/privhub-trash/src/index.ts` | 全 131 行 | 列表/恢复/彻底删除/清理四条路由 + 30 天定时 |
| `privhub/plugins/privhub-svc-meta/src/index.ts` | 全 229 行 | `meta.json` 标签、`templates.json` |
| `privhub/plugins/privhub-git-backup/src/index.ts` | 全 272 行 | 镜像同步、系统文件备份清单、`git` 探测、历史/回滚 |
| `privhub/plugins/privhub-files-versions/src/index.ts` | 全 117 行 | `versions.json` 快照/恢复/20 版上限 |
| `privhub/plugins/privhub-files-edit-md/src/index.ts` | 55-178 | `snapshot()`、`baseMtime` 冲突检测、`file:saved` 广播、文本保存 |
| `privhub/plugins/privhub-files-comments/src/index.ts` | 1-70 | `comments.json` 明文→改走 storage、以 `project\|path` 为键 |
| `privhub/plugins/privhub-files-tags/src/index.ts` | 全 90 行 | 标签路由、`meta:changed` |
| `privhub/plugins/privhub-shell-settings/src/index.ts` | 15-84 | `settings.json` 结构、`{...DEFAULT, ...parsed}` 合并 |
| `privhub/plugins/privhub-files-agent/src/index.ts` | 845-924 | **第二个** `versions.json` 写入者及其锁范围 |
| `privhub/plugins/privhub-admin/src/index.ts` | 30-99 | `project-create` / `project-delete`（**不发文件事件**） |
| `privhub/plugins/privhub-svc-rag/src/index.ts` | 160-171、386-465 | `chunkText`/`docKeyOf`、`removeDoc`、`removeProjectDocs`、`rebuild` gone 分支 |
| 同上 | 770-783、1080-1128 | 向量化 `allIds` 跳过、事件订阅、rebuild 触发点 |
| 同上 | 835-904、1300-1342 | `ragSearch`（**`manifest` 时序**）、`/rag/search`、`/rag/ask` |
| `privhub/plugins/privhub-svc-rag/src/vec.ts` | 全 136 行 | `docKeyOf`、`migrateIdFormat`、`rag_vec` 表、`search` 的前缀过滤 |
| `privhub/plugins/privhub-files-explorer-v3/client/ops.js` | 305-351 | 新建文件夹/新建页面走的上传接口 |
| `privhub/plugins/privhub-files-upload/client/index.js` | 全 177 行 | 上传控制器：确认文案与覆盖语义 |

### 2.2 亲自跑过的命令

| 命令 | 结果 |
|---|---|
| `node tests/integrity.mjs`（在 `privhub/`） | **50 通过 / 0 失败**；附加提示"部署包落后 4 个文件" |
| 针对 `http://127.0.0.1:3190` 的 HTTP 探测（该实例在评审开始时已在运行，是隔离测试实例） | 见 §3 标注【实证】的条目 |

> **本次实测的边界**：`tests/run-all.mjs --spawn` 需要自己拉起实例，我**没有**跑（避免创建进程/文件）；:3190 实例在我做第二轮探测时**自行退出了**，因此 `[I]`/`[J]` 两组实测**未完成**，已归入 §6。

### 2.3 两份并行只读勘察（各自独立，关键结论我已回读复核）

评审允许最多 3 个只读 subagent，我用了 2 个，都是只读 grep/read、未写任何文件：

| # | 勘察范围 | 我采纳前**自己回读复核**过的关键点 |
|---|---|---|
| 1 | 全仓持久化落盘点清单（47 处 / 23 插件 + `privhub/src/main.ts`）、`data/` 文件名穷尽、多写者、schema 版本与迁移 | `svc-audit/src/index.ts` 的单飞迁移（`:168-176`）与 `atomicReplace`（`:140-150`）、`files-agent/src/m2.ts:300-339`（`VERSIONS_FILE` 常量、键格式、`PathLocks`） |
| 2 | `privhub-svc-rag` 的语料范围 / rebuild 时机 / 向量-语料一致性 / 删除路径 / 未完成项 / 重入 | `svc-rag/src/index.ts:160-171`（chunkId 构成）、`:770-783`（`allIds` 跳过）、`:835-904` 与 `:1300-1342`（`manifest` 时序与两个 catch）、`vec.ts:78`（表无内容哈希） |

> 凡我**没有**亲自回读的细节，在正文里都标了来源或归入 §6 未核实，不当作我的【实体】结论。

---

## 3. 现状判定

### 3.1 做对了的

| # | 结论 | 证据 |
|---|---|---|
| 1 | **单次写盘是真原子**：临时名带 `pid + 随机 4 字节`，写完 `rename`，失败重试 5 次并清理临时文件。老账 `D7`（固定 `.tmp`）**已修** | `privhub-svc-storage/src/index.ts:194-209` |
| 2 | **密钥生成有跨进程互斥**：单飞 Promise + `flag:'wx'` + 长度校验与退避重试，注释里明确记录了"全新部署偶发启动失败"这个坑 | `privhub-svc-storage/src/index.ts:99-136` |
| 3 | **加解密是流式的**，大文件不整读进内存；空文件也自洽（20B 头 + 16B tag = 36B），列表页把密文体积减 36 还原明文体积 | `:217-264`；`privhub-core/src/index.ts:705-707` |
| 4 | **回收站的核心写路径有锁了**：`moveToTrash`/`restoreTrash`/`purgeTrash`/`purgeExpiredTrash` 四条把"读列表→改→写回"整段包进 `withFileLock`，且注释写明"实体移动与记录写入必须同锁内完成" | `privhub-core/src/index.ts:828-845, 850-867, 872-885, 890-909`；`withFileLock` 本体 `:340-351`（同 key 串行、错误不传染、队尾自清理） |
| 5 | **`users.json` 损坏不再静默降级**：解析失败直接抛错、保留原文件、错误信息里带路径与处置建议。老账 `D5` **已修** | `privhub-core/src/index.ts:370-383` |
| 6 | **会话表有周期清理**：30 分钟扫一次过期条目并落盘。老账 `D8` 的"只增不减"**已修**（`me()` 里那条 fire-and-forget 续期落盘仍在，`:653-656`，属残留噪声而非缺陷） | `:939-948` |
| 7 | **弃用 API 已换掉**：彻底删除与自动清理都改成了 `rm(recursive)`。老账 `D14` **已修** | `:880, 900` |
| 8 | **审计块损坏现在是"可见的"**：`auditScan` 返回 `badBlocks` / `trailingBytes`，注释直说"2026-09-05 事故期间损坏是不可见的"。这是从事故里学到的东西 | `privhub-svc-storage/src/index.ts:299-358` |
| 9 | **备份范围已扩到系统数据**：16 个 `data/*.json` 进镜像，并显式排除 `secret.key`；git 缺失时**关闭定时器 + 显著告警**，还开了状态接口。老账 `D11` 的三条主要问题**已修** | `privhub-git-backup/src/index.ts:88-99, 166-186, 204-216` |
| 10 | **`edit-md` 的保存路径是数据安全的正面样板**：写前先 `snapshot()` 存档、用 `baseMtime` 做冲突检测返回 409、写完广播 `file:saved` 让索引跟上 | `privhub-files-edit-md/src/index.ts:127-141` |
| 11 | **向量库不再泄露明文路径**：`chunk_id` 改为 `sha256(docId).slice(0,32)`，注释说明真实 docId 只留在加密的 manifest 与 jsonl 里。老账 `D9` 的"索引含明文文件路径"**已修**（明文 SQLite 本身仍在，属已报项） | `privhub-svc-rag/src/vec.ts:16-27`；`src/index.ts:169-170` |
| 12 | **路径越界防护是双层的**：先做字符串前缀校验，再做 `realpath` 二次校验（含 junction/symlink），列表还跳过符号链接条目 | `privhub-core/src/index.ts:663-692, 699-701` |
| 13 | **个人空间（沙箱）的隔离纪律在数据层是认真的**：不进 `allProjects`、不进索引、不进语料，改名时旧目录名"退休"且不可复用，连管理员都读不到 | `:436-455, 491-496, 630-640`；`privhub-files-fulltext/src/index.ts:51, 87`；`privhub-svc-rag/src/index.ts:1101, 1114` |

### 3.2 做错了的

> 按"与功能/交互的关联度"排序；`(后话)` = 按既定优先级属后话（安全 S / 纯数据可靠性 D）。

| # | 结论 | 证据 | 可信度 |
|---|---|---|---|
| **1** | **文件名以 `.` 开头时，上传成功但文件永久不可见**——服务端 `isValidName` 不拦点开头，上传返回 `{"ok":true,"size":24}`，而 `listFiles` 把点开头条目全部丢掉。这个文件既列不出、也删不掉、也重命名不了，但它确实占着磁盘<br>**这是老账 `D` 系列没有的；顾问报告只把它当"前端建文件夹手滑"的界面问题，实际后端上传口同样放行，面更大** | `privhub-files/src/index.ts:112`（只校验 `isValidName`）→ `privhub-core/src/index.ts:802-806`（不拦 `.`）→ `:701`（`e.name.startsWith('.')` 丢弃）。**实测【实证】**：临时项目内上传 `.YINCANG.txt`、`.zh-normal.txt`，两次都返回 `ok:true`，列表始终只有 `ZHENGCHANG.txt` | 【实证】 |
| **2** | **RAG 的"检索/问答"当前必然报错，是入口级死链**：`ragSearch` 在 :851/:853 使用了 `manifest`，但 `const manifest` 声明在 :888（同函数体、执行在后）→ TDZ `ReferenceError`。`/api/rag/search` 落到 :1320 的 catch 返回 500，`/api/rag/ask` 落到 :1339 返回 400<br>结果是"语料一直在进、检索从来没成过"：摄取链路完整可用，向量化要管理员手点，**检索这条出口是断的**。而右侧详情面板那颗"向量数据库"按钮还挂着"开发中"角标（属交底 §6 第 6 条的不动产，不是缺陷）——两者叠起来，没人会发现后端其实是坏的 | `privhub-svc-rag/src/index.ts:851, 853` vs `:888`；catch `:1316-1322, 1335-1341` | 【实体】源码级（:3190 实例在我探测前已退出，**未跑活体验证**） |
| **3** | **索引与文件实体"脱钩"，存在"搜得到、打不开"的路径**<br>(a) `search.remove(id)` 只删**精确那一个** docId，不做前缀删除；而 `file:changed` 在删除/重命名**目录**时只带目录路径 → 目录下所有子文件在索引里留成孤儿，`searchFulltext` 返回结果时**不校验文件是否还在**<br>(b) fulltext 的 `rebuild()` **只有加没有减**，整项目删除后 BM25 索引里那条会一直留着<br>(c) 回收站恢复只广播 `rec.relPath`（对根目录文件而言等于文件名本身），既没删掉旧条目、也没能按真实文件路径重建 → **恢复后索引停留在删前的内容** | (a) `privhub-svc-search/src/index.ts:154-166`（`remove` 按精确 id）、`:205-225`（返回前无存在性校验）；`privhub-files/src/index.ts:174`（删目录只带目录路径）<br>(b) `privhub-files-fulltext/src/index.ts:77-80`（无 gone 分支）<br>(c) `privhub-trash/src/index.ts:85`（`changed(project, relPath, 'restored')`）+ `privhub-files-fulltext/src/index.ts:101`（`indexFile` 拿到目录路径 → `:55` 因 `isDirectory` 直接 return） | 【实体】 |
| **4** | **同名上传静默覆盖，且没有任何可回退的痕迹**：上传走 `rename(tmp, target)` 直落，`mtime` 变了但**没有备份、没有版本快照**。前端确认框只写"同名文件将被覆盖"，不算风险提示。同一路径下的版本历史（`versions.json`）是空的，用户想找回上一版**无路可走**——这条路径**没有复用** `edit-md` 已经做好的 `snapshot()` | `privhub-files/src/index.ts:141`（`rename(tmp, target)`）；`privhub-files-upload/client/index.js:56, 71`（确认文案）；`privhub-files-versions/src/index.ts:72-92`（只有手动/被调用才建快照，上传不调）。**实测【实证】**：先传 `AAAA-original...`（26B），再传同名 `AAAA-REPLACED...`（26B），内容被替换，`/api/versions` 返回 `{"ok":true,"versions":[]}` | 【实证】 |
| **5** | **"删项目 / 恢复项目"这条路径同时缺锁、缺事件、缺崩溃安全**（三个缺口叠在一处）<br>(a) `moveProjectToTrash` 是**全仓唯一没进 `withFileLock` 的回收站写路径**，与有锁的四条互相覆盖<br>(b) `project-delete` 路由**完全不发 `file:changed`** → 项目消失后全文索引与 RAG 语料都还留着<br>(c) 顺序是"先 rename 进 `.trash`、后写 `trash.json`"：**中间崩了就没有恢复记录**，整个项目目录变成 `.trash/id_项目名` 下的孤儿——界面看不见、清不掉、又占着全部磁盘<br>(d) 项目恢复同样只带 `relPath=''`，fulltext 与 RAG 的监听器都会因路径为空而直接 return，恢复后**不会重新入索引** | (a) `privhub-core/src/index.ts:764-781`（无锁）对比 `:828`（有锁）<br>(b) `privhub-admin/src/index.ts:41-50`（`ok` 后只 `audit`，无 emit）<br>(c) `privhub-core/src/index.ts:773`（先 `rename`）→ `:779`（后 `saveTrash`）<br>(d) `privhub-trash/src/index.ts:85`；`privhub-files-fulltext/src/index.ts:92`（`!payload.path` 即 return）；`privhub-svc-rag/src/index.ts:1099`（同） | 【实体】 |
| 6 | **`withFileLock` 只覆盖了回收站一个文件，其余"读→改→写"仍无保护**（约 20 余处落盘点）。已修的一半是老账 `D6`，但**没修的另一半更具体**：`versions.json` 有**三个写入者**，且其中两处的键与网页端**完全同构、命名空间直接重合**——`files-agent` 在 `scope.kind==='all'` 时键就是 `<个人空间名>\|path`（`index.ts:607-610` 的 `scopeRelOf` 返回 `''`），与网页 `/api/versions/snapshot` 的键（`versions:65`）一模一样；而 `files-agent` 的锁是**按路径的进程内锁**（`m2.ts:333-339` 的 `PathLocks`，key 形如 `沙箱\|scope\|path`），**锁不住整文件**。于是 `files-versions` 一次"读全量→改一条→写全量"就能把 agent 并发写的版本整段抹掉。另外三方各自裁剪 20 版上限（`versions:33`、`m2.ts:39`、`index.ts:911`），**谁后写谁定最终条数** | `withFileLock` 全仓仅 4 处调用（`privhub-core/src/index.ts:828, 850, 872, 890`，grep 确认）；三写者：`privhub-files-versions/src/index.ts:44`、`privhub-files-agent/src/m2.ts:327`、`privhub-files-agent/src/index.ts:914`；锁 key `m2.ts:321` + `index.ts:890` | 【实体】 |
| 6b | **真正的高风险同盘点多写者在 `data-files/` 里，不在 `data/`**（新发现）：同一个文件会被多条**各自为政**的写路径同时改，而它们的并发协议互不认识——`edit-md` 用 `baseMtime`、`files-agent` 用 `ETag/If-Match`、`office2` 用自己的内存编辑锁，而 `svc-office.write`、`dataview`、`mdpage`、`versions:restore`、`git-backup:restore` **完全没有冲突检测**。<br>具体重叠：① 个人空间任意文件 = `edit-md` ↔ `files-agent`（沙箱写）↔ `svc-office`；② 任意 `.docx` = `svc-office`（经 `office-ui`/`office-ai`）↔ `files-office2`（`/office2/save` docx 分支）；③ 任意被 git 跟踪的文件 = `git-backup:266` 的 `fs.copyFile` 直覆盖 ↔ 上述任一正常写路径（**它绕过 `ctx.storage`，既无原子写也无加解密**）| `privhub-files-edit-md/src/index.ts:136, 168, 216`；`privhub-files-agent/src/index.ts:688, 761, 906`；`privhub-svc-office/src/index.ts:100`；`privhub-files-office2/src/index.ts:172`；`privhub-git-backup/src/index.ts:266`；冲突检测位置 `edit-md:127-133`、`files-agent:666-671`、`office2:146-149` | 【实体】 |
| 7 | **索引里"没有减号"的地方不止一处**：`files-fulltext` 的增量只在**收到事件**时才减；而 `files-versions` 的恢复写（`:109`）与 `edit-md` 之外的写入路径**不发任何事件**，这些写入对索引完全不可见 | `privhub-files-versions/src/index.ts:109`（`storage.writeText` 后无 emit）；对照 `privhub-files-edit-md/src/index.ts:138-139`（正确样板） | 【实体】 |
| 8 | **`git-backup` 回滚不是原子写**：`copyFile(restored, target)` 直接覆盖目标文件，中途中断会留下**半截文件**（没有 `tmp + rename`，也没有回滚前快照）。另外它只做 `acl` 的 `edit` 裁决，**不做归属检查**——一个文件若被上一位用户删掉并重新上传，回滚的是当前持有者的路径 | `privhub-git-backup/src/index.ts:262-266`（`checkout` + `copyFile`）、`:255-256`（只 ACL） | 【实体】 |
| 9 | **备份仍有三处盲区**（老账 `D11` 修了大部分，这三处是新看的）：`secret.key` 被刻意排除但没有任何"请异地存一份"的机制或提示（丢了 = `data-files` 全灭）；`sessions.json`、`audit.jsonl`、`rag-corpus/`（含明文 `vectors.db`）都不在 16 个文件清单里；`syncMirror` 明确不复刻删除——这条**是有意设计且注释写清了理由**（历史版本由 git 承担），我不把它算缺陷，但结果是"源已删的文件会永远留在镜像里"（老账实测 296 vs 185） | `:91`（排除密钥）、`:94-99`（清单）、`:135`（不复刻删除的显式说明） | 【实体】 |
| 10 | **向量与语料"只删语料不删向量"的两个缺口**（老账只报了"向量库明文"）：`rebuild` 的 gone 分支与 `curate` 的 exclude/expire/merge 同步都**不碰向量表**，孤儿向量永久堆积、白占 `topK×6` 的召回名额；且清理处有 `if (vecStore)` 懒加载前置，**本进程没打开过向量库时磁盘上的旧向量不会被清**。另：chunkId 是"摘要 + 位置编号"，向量表里**没有内容哈希**，而 `runVectorize` 按 `allIds` 跳过已存在 id → 块数不变的文档**改完永不重嵌**，检索会拿旧语义去命中新文本 | `privhub-svc-rag/src/index.ts:455-461`（gone 不清向量，对照 `:401` 是清的）、`:677-687`（curate 不清）、`:778-779`（按 id 跳过）、`:195, 202`（位置编号）；`privhub-svc-rag/src/vec.ts:78`（表只有 id + embedding） | 【实体】（第二条由并行勘察给出，我回读了 `:778-779` 与 `vec.ts:78` 确认） |
| 11 | **schema 版本字段"只写不读"，而且真正有迁移动作的只有 3 处**（老账没报过）。① 4 个辅助 JSON **写了** `version` 但读侧一个都不校验，等于装饰：`agent-keys.json`（写 `:161`、读 `:153-159` 只取 `parsed.keys`）、`agent-quota.json`（写 `m2.ts:248`、读 `m2.ts:185-193` 只取 `raw.users`）、`agent-ratelimit.json`（写 `m2.ts:357`、读 `m2.ts:375-382`）、`rag-corpus/manifest.json`（写 `svc-rag:266`、读 `:258-263` 只取 `raw.docs`）。② 真正带"闸门 + 迁移动作"的只有三处：**审计明文 JSONL → 加密块**（`svc-audit`，`doMigrate` + 拒迁保护，**是全仓写得最好的一处迁移**）、**向量库 `idFormat`**（`vec.ts:53-63`，格式不符就建新表）、**密文魔数识别**（`svc-storage:151-160`）。③ 其余 15 个主/辅数据文件**既无版本字段也无格式分支**：`trash / meta / versions / favorites / recent / comments / publish / invites / model / office-api / rag-curation / rag-vectorize / doc-versions/index / rag-corpus/*.jsonl / agent-idem/*.json` | `privhub-core/src/index.ts:388-397`（`retiredDirs` "旧文件没有→视为空"）、`:414-416`（`loadSessions` 兼容纯字符串旧格式）、`:807`（`loadTrash` 直接 `JSON.parse` 后断言成 `TrashRecord[]`，**无任何字段校验**）；对照样板 `privhub-svc-audit/src/index.ts:179-199` | 【实体】 |
| 12 | **`settings.json` 的"读旧文件"是静默腐坏源**：`{...DEFAULT_SETTINGS, ...parsed}` 会把文件里的任何字段无条件盖到默认值上，**新代码新增的默认值会被老文件里的旧值锁死**。源码注释自己记了一次事故：`allowSelfRegister` 默认值一改成 `false`，"注册被废" | `privhub-shell-settings/src/index.ts:25-32（注释）、:50-51（合并）` | 【实体】 |
| 13 | `(后话)` **回收站列表把个人空间的条目暴露给管理员**：记录里带 `project`（= 个人空间目录名）与 `relPath`，响应不按 `canAccess` 过滤。与 `trash-purge`/`trash-restore` 已经做了 `canAccess + acl` 双检形成不对称 | `privhub-trash/src/index.ts:54-63`（列表）vs `:78-81, 102-104`（恢复/彻底删除的校验） | 【实体】 |
| 14 | `(后话)` **RAG 的向量前缀过滤已经失效**：`chunk_id` 换成 sha256 摘要后，`projectPrefix` 前缀匹配永远不成立。目前**没有调用点传入该参数**（`search(...)` 只用了一个实参），所以是"死功能"而非"当前故障"——但一旦有人想按项目收窄向量召回，会得到**静默空结果** | `privhub-svc-rag/src/vec.ts:117-125`（`startsWith(projectPrefix)`）、`:25-27`（id 已是摘要）；调用点 `src/index.ts:860`（只传 2 个实参） | 【实体】 |
| 15 | `(后话)` **数据目录只做了"一半可配"**：`users.json` 可通过 `config.usersFile` 改路径，但 `sessions.json`、`trash.json` 是**硬编码**在 `data/` 下的（`core:307-308`），`data-files` 也只认 `config.dataRoot` 而其它插件各自用 `process.env.PRIVHUB_ROOT` 或 `process.cwd()` 拼路径。**后果**：测试/多实例隔离靠的是环境变量或各自的工作目录，一半走配置一半走环境，容易出现"以为隔离了、其实写进了同一份数据"。仓库里同时存在 `privhub/data`、`privhub/tests/.testroot/data`、`privhub/tests/.audittest/data`、`deploy/*/data` 四组数据目录，正是这种拼接方式的产物 | `privhub-core/src/index.ts:304-309`（只有 `usersFile` 可配）；对照 `privhub-svc-storage/src/index.ts:61`、`svc-meta/src/index.ts:50`、`files-versions/src/index.ts:31` 都在各自解析 `PRIVHUB_ROOT` | 【实体】 |

### 3.3 我看不出来的

| # | 看不出来的事 | 为什么判不了 |
|---|---|---|
| 1 | 索引脱节的**实际发生量**：`data/` 里现在到底有多少孤儿索引条目 / 孤儿向量 | 需要连上真实实例调 `/api/fulltext/search` 的 `stats()` 并跟磁盘对账；我只有读取权限，:3190 实例又在我探测中途退出 |
| 2 | `rebuild()` 启动全量扫描**实际会扫多少文件、要多久** | 未统计 `data-files/` 真实规模（交底 §6 要求示例数据保持原样，我没有去点文件名计数）；且 RAG 的 rebuild 是"未变文件也要全量读一遍算 hash"，耗时取决于文件总量 |
| 3 | 部署包 `deploy/privhub-deploy/` 与本报告的结论是否一致 | 交底 §5 已声明它落后于源码（少 2 个插件、关键源码有差异）；我按纪律没有同步、也没有对部署包做静态对照 |
| 4 | `RAG 检索必然报错` 这一条能否被活体验证 | 属源码级确定结论（引用先于声明），但没跑活体；**给出一个 30 秒定案法**：登录后请求 `GET /privhub/api/rag/search?q=test`，若返回体里出现 `Cannot access 'manifest' before initialization` 即坐实 |
| 5 | 同一数据目录是否真的会被**多进程**同时打开 | 代码里有"多实例共享数据目录时 rename 偶发竞争"的历史注释、密钥也做了跨进程 `wx` 互斥，说明作者担心过；但当前部署形态是单进程，我无法确认是否真有多实例场景 |
| 6 | 各 JSON 文件的**当前体积**与增长趋势 | 未读取 `data/` 下实际文件大小（只读也不该动真实数据）；老账 D2/D8 有过实测数字，但那是上一基线 |

---

## 4. 改进建议

排序依据：**先功能与交互，后安全与纯可靠性**。`P0` 共 5 条，符合上限。

### P0-1 · 让"以 `.` 开头的名字"在创建口就被拦住（治"文件建得成、看不见"）

- **【问题】** 上传/新建文件夹允许点开头的名字，落盘后用任何界面手段都看不见、删不掉、改不了名。用户感知是"上传成功了，然后文件被吞了"。
- **【证据】** `privhub-files/src/index.ts:112`（上传只校验 `isValidName`）、`:157`（mkdir 同）；`privhub-core/src/index.ts:802-806`（`isValidName` 不拦 `.`）、`:701`（`listFiles` 丢弃点开头）。**实测**：上传 `.YINCANG.txt` → `{"ok":true,"size":24}`，`/api/list` 只有 `ZHENGCHANG.txt`。
- **【改法】** 三选一，我建议**第 1 条**（改动最小、立刻可逆）：
  1. **创建口显式拒绝**：在 `isValidName` 里加 `!name.startsWith('.')`，并在前端提示"文件名不能以 . 开头"。这一条同时修好了上传与新建文件夹两个入口。
  2. **放行但可见**：`listFiles` 只拦符号链接、保留点开头条目，前端给"隐藏项"小标记。语义更正确，但会牵动索引、搜索、回收站一串下游（顾问报告已评估过成本）。
  3. 折中：**创建口拒绝 + 存量可见**（对已经在盘上的点开头文件，让列表能看见以便清理）。
  无论选哪条，都要**同时**处理已存在的点开头文件（给一个"显示隐藏项"的入口或一次性清理清单）。
- **【验收】** 上传/新建 `.x` 返回 400 并带明确文案；对存量点开头文件，存在可见路径能重命名或删除。
- **【成本】小**（第 1 条约 3 行 + 前端文案）；**选第 2 条则为中偏大**。

### P0-2 · 修掉 RAG `ragSearch` 的 `manifest` 时序错误

- **【问题】** 检索与问答两个入口必然抛错，向量数据库对用户是"只进不出"。
- **【证据】** `privhub-svc-rag/src/index.ts:851, 853` 使用 `manifest`，声明在 `:888`；错误落点 `:1320-1322`（search → 500）与 `:1339-1341`（ask → 400）。
- **【改法】** 把 `const manifest = await loadManifest(ctx)`（`:888`）**上移到 `:850` 之前**，与它同时使用的 `keyToDocId` / `scopeDocs` 放在一起。注意 `:888` 处的注释"权限：ACL view 裁决"要一并挪，因为它服务的其实是 `:890-898` 的循环。
- **【验收】** 打一次 `GET /privhub/api/rag/search?q=<已知语料词>` 返回 200 且 `hits` 非空；`POST /api/rag/ask` 返回 200。顺带在回归里补一条"检索接口不返回 500"的用例——**目前这套回归完全没有覆盖检索出口**。
- **【成本】小**（挪 1 行 + 删 1 行）。

### P0-3 · 给索引加上"实体校验"，并把目录级变更广播成前缀事件

- **【问题】** 索引条目可以在文件已经不存在时继续被搜出来（"搜得到、打不开"）；目录重命名/删除/恢复后索引不跟随。
- **【证据】** `privhub-svc-search/src/index.ts:154-166`（`remove` 只删精确 id）、`:205-225`（返回前不校验存在性）；`privhub-files-fulltext/src/index.ts:77-80`（rebuild 只有加没有减）、`:55`（目录直接 return）；`privhub-files/src/index.ts:174`（删目录只带目录路径）。
- **【改法】** 分三步，**第一步就能止血**：
  1. **返回前过滤**：`searchFulltext` 出结果时逐个 `resolveReal + existsSync`，不存在就**顺手 `remove` 掉**（自愈式清理）。这一步单独就能消灭"搜得到打不开"。
  2. **支持前缀删除**：`SearchService.remove` 增加"删 docId 本身 + 所有 `docId + '/'` 前缀的条目"（照 `rag` 的 `removeDoc` 用 `LIKE` 的思路）；删除/重命名目录时按前缀清。
  3. **给 rebuild 补 gone 分支**：照 `rag` 的 `rebuild`（`privhub-svc-rag/src/index.ts:455-461`）给 fulltext 加"扫完把不在 seen 里的条目删掉"。
- **【验收】** 建目录 → 放文件 → 搜到；改名目录 → 旧路径搜不到、新路径搜得到；删目录 → 搜不到；把文件从盘上手工删掉（模拟外部改动）→ 下次搜索不再返回它。
- **【成本】中**（第 1 步小，2+3 步中）。

### P0-4 · 同名覆盖必须留退路（复用已有的快照能力）

- **【问题】** 上传同名文件直接换内容，没有备份也没有版本记录，用户无从回退。
- **【证据】** `privhub-files/src/index.ts:141`；前端确认文案 `privhub-files-upload/client/index.js:56, 71`；`edit-md` 已有正确样板 `privhub-files-edit-md/src/index.ts:135`（写前 `snapshot()`）；**实测**覆盖后 `/api/versions` 为空。
- **【改法】** 在 `privhub-files` 上传路径里，`rename(tmp, target)` **之前**判断 `existsSync(target)`：若存在，先取一份快照（复用 `files-versions` 的能力或 `edit-md` 的 `snapshot` 思路都行，二选一即可，不必新造），再落新文件。前端确认框同步改成**可复述风险**的文案（例如"将覆盖原文件，旧内容会存入版本历史"）。
  顺带修掉同一处的**临时名隐患**：`const tmp = target + '.part'`（`:118`）是固定名，两个并发上传同一文件名会共用它——`svc-storage` 已经用"pid + 随机后缀"解决了同类问题（`:196`），这里照抄即可。**另有一个真实危险**：若目录里本来存在一个名为 `x.part` 的文件，上传 `x` 时会把那个真实文件当临时文件覆盖掉。
- **【验收】** 覆盖前 `versions` 有 1 条、覆盖后能看到并恢复旧内容；`.part` 临时名带随机后缀；并发上传同名文件两次全部成功、无残留。
- **【成本】小到中**。

### P0-5 · 把"删项目 / 恢复项目"这条路径补齐：加锁、发事件、调顺序

- **【问题】** 删项目是全仓唯一无锁的回收站写路径、不发任何文件事件、且崩溃时会产生不可恢复的孤儿目录。
- **【证据】** `privhub-core/src/index.ts:764-781`（无锁；`:773` 先 rename、`:779` 后 saveTrash）；`privhub-admin/src/index.ts:47-49`（不发 emit）；`privhub-trash/src/index.ts:85` + 两个监听器的空路径 return（`privhub-files-fulltext/src/index.ts:92`、`privhub-svc-rag/src/index.ts:1099`）。
- **【改法】**
  1. `moveProjectToTrash` 整段包进 `this.withFileLock(this.trashFile, ...)`，与另四条对齐；
  2. `project-delete` 成功后广播 `file:changed`，action 用能表达"整个项目"的语义（例如 `project-deleted` / `project-restored`），让两个监听器**显式**处理"整项目"分支（而不是靠 `path` 为空被静默过滤）；
  3. 顺序改成**先写入记录、再 rename 实体**——或者 rename 之后立刻用一个可重放的日志兜底。更省事的做法：`loadTrash` 时把 `.trash/` 下**没有对应记录的孤儿目录**识别出来并在界面上提示（既修新问题也能救存量）；
  4. 恢复路径同理：广播时带上 `rec.name` 拼出的真实路径，让索引能重新收录。
- **【验收】** 并发删项目 + 删文件 20 次，记录数与 `.trash/` 实体数一致、无孤儿；删项目后索引里不再返回该项目内容；恢复后能重新搜到；模拟"rename 后、save 前"中断，重启后界面能看到孤儿并允许清理。
- **【成本】中**。

### P1（紧接着做，按投入产出排序）

| 序 | 问题 | 证据 | 改法 | 验收 | 成本 |
|---|---|---|---|---|---|
| P1-1 | `versions.json` 三写入者无共享锁，`files-agent` 的锁 key 锁不住整个文件 | `privhub-files-versions/src/index.ts:32`；`privhub-files-agent/src/index.ts:861, 880, 914`、`:890`（锁 key）；`m2.ts:303` | 把 `versions.json` 的读写统一收到一个 helper，内部用 `svc.withFileLock(VERSIONS_FILE, ...)`；`files-versions` 与 `files-agent` 都改走它 | 并发跑"agent 写版本"与"网页建快照"各 20 次，两边记录都不丢 | 中 |
| P1-2 | 给主数据文件加版本字段 + 一个统一迁移入口 | 15 个主/辅文件既无版本字段也无格式分支（§3.2 #11）；`privhub-core/src/index.ts:388-397, 414-416, 807` | 每个 JSON 顶层加 `schemaVersion`；`loadXxx` 里按版本走 `migrate(v1→v2)`；**读旧格式的分支要留测试**。**直接抄现成的两处**：`svc-audit/src/index.ts:168-199`（单飞 + 魔数判定 + **不合规就拒绝迁移并抛错**，这是全仓最稳的一处）与 `vec.ts:53-63`（格式不符就换新表）。另外：4 个已经有 `version` 的文件（`agent-keys`/`agent-quota`/`agent-ratelimit`/`rag manifest`）要**把读侧校验补上**，否则那个字段只是装饰 | 构造 v1 格式文件，启动后自动升到 v2 且数据无损；把版本号改大时明确报错而不是静默当空；4 个"有 version"的文件版本不符时能被发现 | 中 |
| P1-3 | `settings.json` 合并方式会锁死新默认值 | `privhub-shell-settings/src/index.ts:50-51` | 改成**白名单合并**：只接受已知键且类型正确；未知键丢弃并记一条日志（而不是无脑 spread） | 老文件里塞一个非法 `allowSelfRegister`，启动后按新默认值生效且有日志 | 小 |
| P1-4 | fulltext 的"减"依赖事件，而 `files-versions` 恢复不发事件 | `privhub-files-versions/src/index.ts:109` 对照 `edit-md/src/index.ts:138-139` | 在 `versions-restore` 写完后补 `file:changed`（action `saved`）；顺便排查还有哪些写盘路径没广播（`grep writeText/writeBuffer` 逐个对） | 用版本回滚一次，全文搜索立刻搜到回滚后的内容 | 小 |
| P1-5 | 目录级索引维护 | `privhub-files/src/index.ts:174`（删除目录）；`privhub-files-fulltext/src/index.ts:55` | 见 P0-3 第 2 步；RAG 侧同理（`privhub-svc-rag/src/index.ts:343` 目录从不登记） | 删一个装 10 个文件的目录，索引条目减 10 | 中 |
| P1-6 | `git-backup` 回滚非原子、缺归属校验 | `privhub-git-backup/src/index.ts:262-266`、`:255-256` | 回滚改走 `ctx.storage.writeBuffer(tmp+rename)`；补 `resolveReal` 归属校验（照 `files/src/index.ts:233`） | 回滚过程中 kill 进程，文件要么旧要么新，不半截 | 小到中 |
| P1-7 | `rebuild` 的 gone 分支与 `curate` 不清向量 → 孤儿向量 | `privhub-svc-rag/src/index.ts:455-461`、`:677-687`、`:401/423` 的 `if (vecStore)` 前置 | gone 分支补 `vecStore.removeDoc(id)`；`vecStore` 改为"需要清就惰性打开"；再给一个"孤儿向量清扫"管理动作 | 删文件后 rebuild，`rag_vec` 里该文档的块数归零 | 小 |
| P1-8 | 向量只按 id 跳过，改内容不重嵌 | `privhub-svc-rag/src/index.ts:778-779`；`vec.ts:78` | 向量表加一列 `content_hash`（或把 hash 编进 chunk_id）；`runVectorize` 按 id + hash 判断是否重灌 | 改一段文字再点向量化，只重灌变化的块，检索命中新语义 | 中 |
| P1-9 | `(后话)` 回收站列表对管理员暴露个人空间条目 | `privhub-trash/src/index.ts:54-63` | 列表按 `canAccess` 过滤（与同文件 `:78`/`:102` 的恢复、彻底删除保持一致） | 管理员看不到他人个人空间条目，仍能看到自己的 | 小 |
| P1-10 | `(后话)` 向量前缀过滤已失效 | `privhub-svc-rag/src/vec.ts:117-125`；调用点 `src/index.ts:860` | 二选一：删掉这个参数（现在是死代码），或改成"先在 manifest 里按 project 算出目标 docKey 集合，再在结果里筛" | 若保留，按项目筛后结果非空且只含该项目 | 小 |
| P1-11 | **同一个用户文件有多条互不认识的写路径**（§3.2 #6b）：`office2`、`dataview`、`mdpage`、`versions:restore`、`git-backup:restore` 五处**完全没有冲突检测**，直接覆盖别人的写入 | `privhub-svc-office/src/index.ts:100`；`files-office2/src/index.ts:172`；`files-dataview/src/index.ts:70`；`files-mdpage/src/index.ts:105`；`files-versions/src/index.ts:109`；`git-backup/src/index.ts:266` | **不必一次做全**：先统一"写前检查 + 写前快照"两件事——把 `edit-md` 的 `baseMtime` 检测（`edit-md:127-133`）抽成一个 core 级 helper，六条写路径都调它；`git-backup:restore` 尤其要先补（它连原子写都没有）。冲突时返回 409 由前端确认，与 `edit-md` 现有行为一致 | 两个浏览器会话同时改同一个 `.docx`：后手拿到 409 而不是静默覆盖；回滚 git 版本时不会覆盖别人刚存的内容 | 中 |

> **老账复核：这几条已经修好了，请更新账本，不要再当未修项投入。**
> - `D1`（审计格式迁移并发竞态）**已修**：`ensureBlockFormat` 现在是单飞 Promise（`svc-audit/src/index.ts:168-176`，比对原先的 `blockReady` 布尔标志），迁移写回走 `atomicReplace`（`:140-150, 198`），替换前留 `.bak`（`:143`）。
> - `D3`（审计全量重写非原子）**已修**：同一处 `atomicReplace`（`:334` 也走它）。
> - `D7`（原子写临时名固定）**已修**：`svc-storage/src/index.ts:196`。
> - `D5`（users 损坏锁死）**已修**：`core:370-383`。
> - `D8`（会话只增不减）**已修**：`core:939-948`。
> - `D14`（`fs.rmdir(recursive)`）**已修**：`core:880, 900`。
> - `D11`（备份覆盖不全 / 静默失效）**大部分已修**：`git-backup:88-99, 166-186, 204-216`。
> - `D6`（读改写无锁）**只修了一半**：`withFileLock` 现在存在且只用在回收站 4 条路径（`core:340-351, 828-909`），其余落盘点仍未纳入——见 §3.2 #6 / #6b。
>
> **仍未修的（只需知道，本轮不展开）**：`D4`（读失败静默降级为空 → 下一次写入覆写）——`core:811-817`、`svc-meta:110-113`、`files-versions:40`、`comments:46` 等处的 `catch { 空 }` 都还在；`D12`（语料删除只清零不删文件）——`svc-rag:398, 422, 459` 三处仍是 `writeText(f, '')`；`D13`（`migrateTree` 死代码）——`svc-storage:368-394` 定义后全仓无调用点。
> `D2`（审计保留策略不生效）与 `D10`（4 类明文 JSON）我这次没有复核到写盘细节，**不下结论**。

---

## 5. 我建议不要做的

| # | 看着像问题、我建议不动 | 理由 |
|---|---|---|
| 1 | **换成 PostgreSQL / MySQL** | 真实数据量是"几十上百个小 JSON + 一个 2MB 向量库"，是这个量级下 JSON + 文件系统反而更简单、更易备份、"整目录搬走即可运行"。换关系库会引入连接管理、运行时依赖、迁移负担，收益在当前规模下为零。**这条路等"语料/并发真的撑不住"再说，触发条件写清楚就行（比如：单文件 JSON 超过 10MB，或并发写冲突在生产真的出现）** |
| 2 | **给 `data/*.json` 上一套 ORM / 通用 DAO 层** | 现在的问题不是"没有抽象"，是"少数几条关键路径没加锁、没校验"。为一个 20 余处的落盘点引入框架，是把简单问题复杂化。**按 P0-5 和 P1-1 那样按文件加锁，成本更低、可回滚** |
| 3 | **换检索引擎（Meilisearch / SQLite FTS5）** | 与顾问 `Shape Up` 报告已结论一致（触发条件未到）。当前索引的毛病是**语义错**（清不干净、不校验实体），不是**性能差**——换引擎不解决"删了还搜得到"，反而会把同样的 bug 带到新引擎上 |
| 4 | **给向量库上加密（本轮不做）** | 这与老账 `D9` 有张力，我说清我的判断：`D9` 的核心泄露（明文文件路径）已通过 sha256 摘要修掉，剩下的是"明文 SQLite + 向量本身"，而向量不可逆、要交给 `better-sqlite3` 直接打开。整库加密会牺牲可用性与崩溃恢复（WAL + 加密是难点）。**按既定优先级这属后话，而且收益低于把"检索入口修通"**（P0-2）。真要收紧，优先做"宿主机文件权限 + 备份不含 `vectors.db`"这类周边 |
| 5 | **给 `.trash` 里的条目保留完整原路径** | 现在 `id_name` 的扁平命名简单、回收站恢复靠记录里的 `relPath` 就行。改成保留目录结构会让 `.trash` 出现同名目录层级、增加清空逻辑的复杂度，收益不明确 |
| 6 | **给每一次上传都建版本快照（不区分是否覆盖）** | 只有**覆盖**才有丢失风险；新建时建快照是纯浪费（每次上传都要把刚写的文件再读出来存一份）。P0-4 只针对 `existsSync(target)` 为真的分支就够 |
| 7 | **让 RAG 自动触发向量化** | 向量化要调外部模型、按 `32 条/批`（`privhub-svc-rag/src/index.ts:786-789`），自动触发会把"模型不可达"这类外部故障变成后台噪声。**保持手动 + 状态可见**更稳；先把 P0-2 修通再看 |

---

## 6. `[存疑]` / 未实测项

| # | 项 | 状态 |
|---|---|---|
| 1 | **`[I]` 组实测：改名后再编辑的文件，从回收站恢复后索引是否陈旧** | **未完成**。:3190 实例在我进入第二轮探测前退出（`ECONNREFUSED`）。**源码级证据充分**（`privhub-trash/src/index.ts:85` 只带 `rec.relPath`；`privhub-files-fulltext/src/index.ts:101` 拿到目录路径 → `:55` 因 `isDirectory` 直接 return，因此**从回收站恢复的文件不会被重新索引**），但"索引内容陈旧"这一具体表现**未跑活体**。 |
| 2 | **`[J]` 组实测：点开头文件夹内的文件能否被搜到** | **未完成**（同因）。**源码级确定**：`files/src/index.ts:157` 允许建 `.dir`，`fulltext` 的 `indexTree`（`:69`）与 `indexFile`（`:52-53`）会在上层 `resolveReal` 时就通过（不拦点开头），所以**点开头目录里的文件仍会被索引、能搜到，但列表里看不到**——与 §3.2 #1 同源。未跑活体。 |
| 3 | RAG 检索 TDZ 报错的**活体**表现 | 源码级【实体】，**未跑活体**。定案法见 §3.3 #4。 |
| 4 | 索引孤儿 / 向量孤儿的**现存数量** | 未核实（需连真实实例对账）。 |
| 5 | 各 `data/*.json` 的**当前体积**与真实文件总数 | 未核实（未读取真实数据目录内容）。 |
| 6 | 是否真的存在**多进程**共用一个数据目录 | 未核实。若存在，`withFileLock` 是**进程内**的（`privhub-core/src/index.ts:338` 是内存 Map），跨进程完全不生效，P0-5 与 P1-1 的锁都要升级为文件锁（`flag:'wx'` 那种）。**这是我最想要一个明确答复的前置条件。** |
| 7 | 部署包与源码的差异是否影响本报告结论 | 未核实（按纪律未同步）。 |
| 8 | `node tests/run-all.mjs --spawn` 的完整基线 | 未跑（需拉起实例）。**只跑了** `node tests/integrity.mjs`（50/0）。 |

### 关于我在隔离实例上的操作（主动交代）

为取得"同名覆盖无备份"与"点开头文件不可见"两条实证，我在 **:3190 隔离测试实例**上做了以下操作，**未触碰 `data-files/` 与 `data/` 下的真实数据**：

1. 用 `admin/admin123` 登录；
2. 新建临时项目 `ZZ审查临时2761`（通过 `POST /privhub/api/project-create`）；
3. 在其中上传 `ZHENGCHANG.txt`、`jiansuo-test.txt`（被改名、被删除、被恢复过一次）、`.YINCANG.txt`、`.zh-normal.txt`；
4. 所有操作均走 HTTP 接口，未直接读写任何目录。

**这与交底 §6 第 7 条"测试/示例数据保持原样"的张力**：该约束针对的是仓库里既有的示例数据，而 :3190 是每次 `--spawn` 重建的隔离实例，我的操作落在它自己的临时数据目录里、**没有修改仓库中任何文件**。**折中做法**：临时项目名带 `ZZ审查临时` 前缀便于识别，且我**没有删除**它——请主家在自己方便时清理；若实例每次重建，则无需处理。

---

## 7. 我这个角度的适用边界

**看得到、也敢下判断的**：

- 落盘格式、加密与否、原子与否、加了什么锁（读源码即得）；
- 谁写谁读同一个文件（grep 落盘调用点 + 追调用链）；
- 索引/向量的键结构与"什么时候减"，以及它与磁盘状态的**语义**是否对得上；
- 备份范围与回滚能力（清单是硬编码的，读一眼就知道覆盖了谁）。

**看不到的**：

- **真实数据规模与增长曲线**——所以"这个 JSON 会不会撑爆"我只能说"没有上限保护"，说不出"还有多久"；
- **并发是不是真会发生**（局域网 2 个用户 vs 20 个用户，结论完全不同）；我按"多人必然发生"写建议，若实际是单人用，P0-5 与 P1-1 可以降级；
- **性能**——我没做任何压测，本报告不含性能结论（`P` 系列由别的角度覆盖）；
- **崩溃恢复的真实表现**——所有"中间崩了会怎样"都是源码推理（【实体】读出的顺序）+ 老账里的历史实证，我没做 kill 进程实验；
- **前端交互与视觉**——按纪律我只看后端与数据契约，`explorer-v3/detail.js` 那批硬编码按钮按交底 §6 第 6 条**不当缺陷提**。

**要我判得更准，需要主家给三样东西**：

1. **一句话确认部署形态**：单进程还是可能多进程共用一个数据目录（决定锁要不要升级为文件锁）；
2. **真实数据的两个数**：`data-files/` 文件总数、`data/*.json` 里最大的那个多大（决定要不要给 JSON 上加界与分片）；
3. **一个可跑的隔离实例**（或允许我跑 `--spawn`）：用来把 §6 的 `[I]`/`[J]` 两组和 RAG 检索入口补成【实证】——**目前 P0-2 与 P0-3 都只到源码级**。

---

## 附：数据实体 → 存放位置 → 格式 → 是否加密 → 有无版本字段 → 谁写谁读

> 加密口径：**是** = 经 `ctx.storage`（AES-256-GCM，`PHENC1` 头，tmp+rename 原子写）；**否** = 直接 `fs.writeFile` 或第三方库直开。
> "版本字段"指文件自身带 `schemaVersion` 之类字段（**不是**版本历史功能）。

| 数据实体 | 存放位置 | 格式 | 加密 | 版本字段 | 谁写 | 谁读 |
|---|---|---|---|---|---|---|
| 项目文件 / 个人空间文件 | `data-files/<项目或姓名>/**` | 任意二进制（密文） | **是** | — | `privhub-files`（upload/rename/move/delete 经 storage）、`files-edit-md`（doc/text save）、`files-office*`、`files-agent`（仅沙箱）、`svc-rag`（语料为空写时是空写） | `privhub-core.listFiles` / `readFileForPreview`、`files`（download/preview-raw）、`svc-search`、`files-fulltext`、`svc-rag`、`git-backup`、`files-export` |
| 回收站实体 | `data-files/.trash/<id>_<name>` | 原字节（密文） | **是** | — | `privhub-core` 四条路径（rename 进/出） | `privhub-core`（restore/purge/expired）、`trash`（列表） |
| **回收站记录** | `data/trash.json` | JSON 数组 `TrashRecord[]` | 是 | **无** | `privhub-core`：`moveToTrash`、`restoreTrash`、`purgeTrash`、`purgeExpiredTrash`（**有锁**）+ **`moveProjectToTrash`（无锁）** | `core`、`trash`、`admin-acl`、`files-agent` |
| **账号库** | `data/users.json`（可配 `usersFile`） | `{ users: UserRecord[], retiredPersonalDirs: {} }` | 是 | **无**（`retiredPersonalDirs` 靠"没有就当空"兼容） | `privhub-core.saveUsers`（仅此处） | `core`（`loadUsers` 损坏即抛）、`auth`、`admin`、各插件经 `canAccess` |
| 会话表 | `data/sessions.json` | `{ token: { username, expiresAt } }` | 是 | **无**（兼容"纯字符串"旧格式） | `privhub-core.saveSessions`（登录、`me()` 续期、30 分钟清理） | `core.me` |
| 标签 / 模板 | `data/meta.json`、`data/templates.json` | `{项目:{路径:{tags:[]}}}`、`DocTemplate[]` | 是 | **无** | `svc-meta`（`setTags` / 模板 CRUD） | `svc-meta`、`files-tags`、`files-kg` |
| 批注评论 | `data/comments.json` | `{ "project\|path": Comment[] }` | 是（老账 `D10` 已修） | **无** | `files-comments`（读改写无锁） | `files-comments` |
| 发布链接 | `data/publish.json` | 待核（老账 `D10` 指为明文，现已改走 storage） | 是（同上） | **无** | `files-publish` | `files-publish`、`/pub` 页面 |
| 邀请码 | `data/invites.json` | 同上 | 是（同上） | **无** | `files-invite` | `files-invite`、注册流程 |
| 系统设置 | `data/settings.json` | `Settings`（theme/defaultView/maxUploadMB/allowSelfRegister） | 是（`D10` 已修） | **无** | `shell-settings`（`{...默认, ...文件}` 合并） | `shell-settings` |
| 版本历史（网页侧） | `data/versions.json` | `{ "project\|path": Version[] }`，每路径上限 20 | 是 | **无** | **`files-versions`（无锁）** + **`files-agent/index.ts:914`（锁的 key 只管自己的路径）** | `files-versions`、`files-agent` |
| 版本快照（Markdown 侧） | `data/doc-versions/*.md` + 索引文件 | 每版本一个密文快照 | 是 | **无** | `files-edit-md.snapshot`（**写前存档，正面样板**） | `files-edit-md` |
| 收藏 / 最近 | `data/favorites.json`、`data/recent.json` | JSON | 是 | **无** | `shell-favorites`、`shell-recent`（有 rename 重试注释） | 各自前端 |
| 权限规则 | `data/acl.json` | JSON | 是 | **无** | `svc-acl`、`admin-acl` | `svc-acl`（`can`）、`trash`/`git-backup` 等做二次裁决 |
| **审计日志** | `data/audit.jsonl` | `PHAUD1` 加密块追加 | 是（**块级**，非整文件） | 块内有 magic+版本字节 | `svc-audit`（`appendFile` 追加、`prune` 全量重写） | `svc-audit`、`admin-audit` |
| 用户模型配置 | `data/model.json` | JSON | 是 | 待核 | `svc-model` | `svc-model` |
| **RAG 语料** | `data/rag-corpus/<sha16>.jsonl` | 每行一个 chunk（密文） | 是 | **无** | `svc-rag`（`ingestDoc` / `removeDoc` 写空 / `rebuild`） | `svc-rag`（`chunksOfDoc`） |
| **RAG 清单** | `data/rag-corpus/manifest.json` | `{ version: 1, docs: { docId: {...} } }` | 是 | **有**（`version:1`） | `svc-rag`（读改写**无锁**） | `svc-rag`（检索反查、状态页） |
| **RAG 向量库** | `data/rag-corpus/vectors.db`（+ `-wal`/`-shm`） | SQLite `vec0(chunk_id, embedding)` + `rag_meta` | **否（明文）** | **有**（`rag_meta.idFormat='hashed-v1'`，**全仓唯一的真迁移代码**） | `svc-rag`（`upsert` / `removeDoc` / `rebuildTable`） | `svc-rag`（`search` / `allIds` / `count`） |
| RAG 策展 / 向量化状态 | `data/rag-curation.json`、`data/rag-vectorize.json` | JSON | 是 | 待核 | `svc-rag` | `svc-rag`、状态页 |
| Office / AI 密钥配置 | `data/office-api.json` | JSON | 是 | **无** | `files-office-ai`（`KEYS_FILE`，`:29, 87`） | `files-office-ai`、`svc-office` |
| Agent 密钥 / 配额 / 限流 / 幂等 | `data/agent-keys.json`、`data/agent-quota.json`、`data/agent-ratelimit.json`、`data/agent-idem/<sha256>.json` | JSON | 是 | **有**：`agent-keys` `{version:2}`（`:161`）、`agent-quota` `{version:1}`（`m2.ts:248`）、`agent-ratelimit` `{version:1}`（`m2.ts:357`）；**但读侧全都不校验版本，属装饰字段** | `files-agent`（`index.ts:161`、`m2.ts:249, 327, 357`） | `files-agent` |
| Markdown 版本快照（另一套） | `data/doc-versions/<hash8>_<at>.md` + `data/doc-versions/index.json` | 每版本一个密文快照 + 索引 | 是 | **无** | `files-edit-md`（`snapshot`，**写前存档，正面样板**；超 20 版删最旧） | `files-edit-md` |
| 全文索引（**不落盘**） | 内存 | `docs` / `postings` 两张表（CJK bigram + BM25） | — | — | `svc-search`（`index` / `remove`） | `files-fulltext`、`svc-rag`（BM25 通道） |
| 导出临时区 | `data/export-tmp/export-*.html` | HTML | **否（明文，且非原子）** | — | `files-export`（`finally` 中 unlink） | 下载请求 |
| Git 备份 | `data/git-backup/{README.txt, mirror/**, _system/**, .git/**}` | 密文字节副本 + git 对象 | 镜像内容本身仍是密文；**但 `README.txt` 是明文 `fs.writeFile`** | — | `git-backup`（60 秒轮询 `syncMirror` + `git commit`；`:117, 131` 是 `fs.copyFile`） | `git-backup`（history / restore） |
| 运行日志 | `data/logs/privhub-YYYY-MM-DD.log` | 文本 | **否（明文 `appendFileSync`）** | — | `privhub/src/main.ts:105-132`（**唯一一处不在 `plugins/` 下的落盘点**） | 运维 |
| 审计备份 | `data/audit.jsonl.bak` | 密文块整文件副本 | 是（块级） | — | `svc-audit:143` | 人工恢复用 |
| 密钥 | `data/secret.key` | 32 字节随机 | 不适用（本身是密钥；`fs.writeFile` + `flag:'wx'`） | — | `svc-storage.ensureKey`（单飞 + 跨进程互斥） | 全部加解密路径 |
| 系统实时状态 | **不落盘**（内存） | 全文索引、`fileLocks`、`sessions`、collab、events、watermark、kg 图谱 | — | — | 各 Service | 重启即**全量重建**（`≤5s` 目标） |

### 表里最要紧的四格

1. **`data/trash.json` 有 4 条带锁 + 1 条不带锁的写入者** —— 项目删除那条（`moveProjectToTrash`）不在锁里。
2. **`data/versions.json` 有 3 个写入者，其中 agent 的键与网页端完全同构** —— 而 agent 的锁是按路径的，锁不住整文件，跨插件丢版本是现实风险。
3. **真正的高风险并发不在 `data/`，在 `data-files/` 里** —— 同一个文件最多能被 3 条互不认识的写路径同时改（`edit-md` / 沙箱 agent / `svc-office` / `office2` / `git-backup` 覆盖），而只有前两条有冲突检测。
4. **全文索引完全不落盘** —— 这是"索引与实体脱钩"能被**每次重启自动治愈一半**的原因，也是"重启前搜得到、重启后搜不到"这类前后矛盾现象的来源。**它是特性（简单、无迁移成本），但它把"索引正确性"完全押在了"事件一条都不能漏"上——而事件确实在漏。**
