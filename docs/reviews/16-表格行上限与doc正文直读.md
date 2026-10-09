# 16 · 表格行上限（1000 → 10000）与 `.doc` 正文直读

> 编制：萧潇｜日期：2026-10-09｜源码基线：**v3.1.3**（版本号唯一来源 `privhub/package.json`；本批**不升版本号**，条目落 `[未发布]`）
> 上游依据：`docs/reviews/11-格式支持矩阵与铺满修复.md` §2.5 ②（`.doc` "解析失败却报成功"的来历）、`docs/reviews/13-doc假成功修复与Office族收敛.md`（`.doc` 三级链与原因码）、`docs/reviews/15-编辑预览三态.md`（版式与纪律）
> 可信度标记沿用七路评审口径：**【实测】**由命令/代码真跑得出　**【实体】**亲自读源码看到该行　**【推断】**有据未复现
> 行号约定：`privhub/` 前缀省略

---

## 0. 一句话结论

**用户报的两件事各自有一个能指名道姓的病根，都已修掉，且都是用「真实用户文件跑产品函数」取证的：**

1. **表格只显示 1000 行** —— `office-lib.mjs` 的 `MAX_ROWS = 1000`，一到 `eachRow` 回调就 `return`，**既不报错也不提示**。那张排播表**真有 3320 行**（实测）。现在上限抬到 **10000**，并且**超上限就回带真实总数**（`totalRows`/`truncatedRows`），由界面**明说**「仅显示前 N 行（本表共 M 行）」。**静默截断才是病**，上限本身不是。
2. **`.doc` 没有预览** —— `word-extractor@1.0.4`（已是最后一版）的 `writeCharacterProperties` **不校验 `sgc`**，把某些文档的**整篇正文**当成"已删除的修订内容"抹成 `\x00`，`clean()` 剥掉后 `getBody()` 只剩 `"\n\n"`。现在主路拿不到正文时，自己按 [MS-DOC] 解 **piece 表**取正文（跳过那几步"改写正文"的处理）。实测同一份真件：**改前 2 字符 → 改后 5037 字、0 个 NUL**。

- **重启之问**（用户原话「是不是你没重启后台」）**答案分两半**：**前端插件不用重启**（静态文件走 mtime 弱 ETag + `cache-control: no-cache`，刷新页面即可）；**本条 `.doc` 修复必须重启进程**（改的是服务端 `office-lib.mjs`）。**两半都做了**：dev 实例已重启（旧 PID 29504 已停，新 PID 31784，`/api/health` 200）。
- `frontend/index.html` 一字未动；不动 manifest / 插槽 / 打包链 / 别的插件；`data/`、`data-files/` 只读（只为取证解密到内存）；**未做任何 git 操作**；版本号 **3.1.3 不动**。

> ⚠ **观感一律未实测**（§5）：仓库里没有浏览器测试、前端走 CDN ⇒ 本批能证明的是**产品函数对真件的行为 + 真模板渲染出的文本**，**不能**说"打开文件看着对"。「那句提示在界面上长什么样、会不会挤」这一层本批**判不了**。

---

## 1. 动机

用户原话（2026-10-09）：

> 「第一个问题，表格只能显示1000行，更多的没有显示。这个得解决。第二，。doc文件没有预览。这两个是最近的需要解决的问题，其他的显示问题都可以往后排。」

两条各自钉到一个可指名的病根上：

| 病根 | 为什么危险 |
|---|---|
| `readXlsx` 的 `MAX_ROWS = 1000`，回调里 `rowNumber > MAX_ROWS` 就 `return` | **静默**。既不改行数、也不回带"本来有多少行"，`svc-office.read()` 照样回 `ok:true` ⇒ 界面把"前 1000 行"当成**整张表**渲染。半张表比没有表更容易被当成全部内容 —— 这跟 `11`/`13` 批修掉的"兜底句冒充正文"是同一个病：**失败/截断不许装作正常** |
| `.doc` 主路 `getBody()` 空，而后面两级（Python 只能不可用、第三级文案已删）都拿不到正文 | 结果是 `ok:false` + 一句"本机没有真正的 Python"。**诊断本身没错**，但它把用户指向了错的方向（该换的不是环境，是**解析方式**）—— 正文其实**好好地躺在 piece 表里** |

`MAX_ROWS` 这条的取证落点：`data-files/A项目/_内联_mtfgnv1r/2026年9月28日-9月30日排播表.xlsx` 的「排播」表 **3320 行 / 18 列**（`ws.rowCount` 实测；同文件另三张表 492 / 12 / 87 行）。

`.doc` 这条的取证落点：`data-files/AI小说研究/参考文/2.男频小说投稿信誉网站.doc`（Word 97 二进制，59904 字节，`nFib=193`、`fComplex` 置位）。三段实测：

1. piece 表解出的正文 **5041 字完全正确**（首句为文档标题行）；
2. 同一段经 `writeCharacterProperties` 之后变成 **5041 个 `\x00`**；
3. `clean()` 剥掉控制符 ⇒ 只剩 `"\n\n"` ⇒ `getBody()` 空 ⇒ **界面无预览**。

---

## 2. 改法

| # | 现状（改前） | 改法 | 口径 / 落点 |
|---|---|---|---|
| **A** | `const MAX_ROWS = 1000` / `MAX_COLS = 60`（读**和**写共用） | `MAX_ROWS = 10000` / `MAX_COLS = 60` | `office-lib.mjs:42-43`。抬到实测数据（3320）的 **3 倍余量**；**为什么不是无上限**：xlsx 走 markdown 表格渲染（无分页、无虚拟滚动），一万行 × 60 列已是这套渲染的实际上限；要更大得先有分页/网格渲染器（写进常量上方注释，`office-lib.mjs:29-41`） |
| **B** | `readXlsx` 超上限直接 `return`，**回包形状里没有"实际多少行"** | 回调签名改用 `(row, rowNumber)`，超限时置 `truncatedRows = true` 再 `return`；每张表回带 `totalRows`（`ws.rowCount`）、`totalCols`（`ws.columnCount`）、`truncatedRows`、`truncatedCols: totalCols > MAX_COLS` | `office-lib.mjs:405-432`（`totalRows`/`totalCols` 在 `:413-414`，截断标记在 `:417`，回包在 `:432`）。**判断与数据都在后端做**：前端只把数字说成话 |
| **C** | `XlsxSheetData` 只有 `{ name, rows }` | 加 `totalRows` / `totalCols` / `truncatedRows` / `truncatedCols` 四个字段，都带注释 | `plugins/privhub-svc-office/src/index.ts:81-93`。`read()` 对 xlsx 是**透传**（`:147`），故无需改路由层 |
| **D** | 界面不知道被截断 | `officeToMd` 的 xlsx 分支加一句说明：`*（仅显示前 N 行（本表共 M 行））*`（列同理，多个说明用「；」连） | `plugins/privhub-files-explorer-v3/client/content.js:287-290`。**没被截断时不加**（否则每张表底下都挂一句噪音）—— 断言按这条正反两面各钉一条 |
| **E** | `readDoc` 三级链：① word-extractor → ② Python → ③ 兜底文案（`13` 批已删③） | 插一级 **①b piece 表直读**：主路拿不到正文时，自己解 FIB + Clx 的 piece 表取正文 | `office-lib.mjs:310-321`（调用点）；实现 `readDocPieceText` `:276-287` / `parseWordPieceText` `:222-270` |
| **F** | 新一级若静默失败，会掩盖"为什么还是读不出" | 失败原因并入 `detail`：`'；piece 表直读：' + (pieceError || '没有取到正文')` | `office-lib.mjs:381`。**原因码语义一个没改**（②③ 组那批断言因此全绿），只在 `detail` 尾部补一句来历 |
| **G** | —— | `parseWordPieceText` **导出为纯函数**（两个 Buffer 进、字符串出，不碰文件系统/环境） | 纯函数才能被合成样本直接断言（⑦ 组，8 条）；`readOleStream` 负责把 `word-extractor` 的 Readable 收集成 Buffer（`:198-205`） |

### 2.1 为什么自己再解一遍 piece 表（而不等上游修）

`word-extractor@1.0.4` 是**已发布的最后一版**（无升级可修）。它的 `writeCharacterProperties` 里只判 `sprm & 0x1f === 0` 就把该段文字当成 `sprmCFRMarkDel`（**没有校验 `sgc`** —— 真正的 `sprmCFRMarkDel` 是 `sgc=frcChp`），于是某些文档的整篇正文被误判成"删除"。

本批**只取 piece 表**，不跑任何"按修订/域标记改写正文"的步骤。容器读取仍交给上游（`ole-compound-doc.js` / `buffer-reader.js`）—— **容器读取与 piece 表解析这两件事上游都是对的**，被跳过的只有那几步"改写正文"。

**代价（明说，不藏）**：被标记为"删除"的修订文字**会显示出来**。预览场景下这比"整篇什么都没有"好，但它**不是"接受修订后的定稿"**——要定稿请在 Word/WPS 里另存为 docx 后上传。这段原话写进了 `office-lib.mjs:188-192`，不是本报告才补的注解。

另：**本函数只在主路（①）拿不到正文时才被调用** ⇒ 对能正常读的 `.doc` 一个字节都不影响；对非 OLE2 的假 `.doc`（RTF/纯文本/空容器）也**照样失败并继续往下走**，原因码不变（② 组"You能读的四个 kind 语义一致"因此不受影响，实测假样本仍在 0–4 ms 内以原 `capability-missing` 失败，**没有**因为新增 OLE 尝试而卡住）。

---

## 3. 断言与阴性对照

### 3.1 断言账目：`tests/office-doc.mjs` **79 → 94（+15 条，全在本批新增的 ⑦⑧ 两组）**

> 本批**没有改写、也没有删除**任何既有断言（15 条全部是新增）。⑦ 组头 8 条 + ⑧ 组头 7 条 = 15。

| 组 | 条数 | 断言名（逐条） |
|---|---|---|
| **⑦ `.doc` 正文直读**（合成 FIB + table → `parseWordPieceText`） | 8 | 导出存在（**纯函数**：两个 Buffer 进、字符串出）／单段 UTF-16LE 取回原文（实测 `"合成样本\n第一段\n"`）／多段按 **CP 顺序**拼接（文件里 BBB 在前、AAA 在后 ⇒ 仍得 `"AAABBB"`）／压缩段按 1 字节/字符解码并走 CP1252 补表（字节 `a,0x92,b` ⇒ `"a'b"`）／Clx 前面的 **Prc 被跳过**、仍找得到 Pcdt（实测 `"XYZ"`）／正文按 FIB 的 `ccpText` 截断（piece 有 6 字、`ccpText=3` ⇒ `"abc"`）／magic 不对 / table 流不够长 / `ccpText=0` / 非 Buffer ⇒ **一律回空串**（不抛错）／（自证）同一函数确有产出 ⇒ 上一条是真判据而非假绿 |
| **⑧ xlsx 行/列上限**（`readXlsx` + 前端 `officeToMd`） | 7 | 从源码读到两个上限常量（**读不到必红，不静默跳过**）／`MAX_ROWS` 已抬离迁前的 1000（实测 10000）／小表原样回（实测 `{"rows":5,"totalRows":5,"truncatedRows":false}`）／10005 行 ⇒ 保留 10000 行**并回带** `totalRows`/`truncatedRows`（实测 `{"rows":10000,"totalRows":10005,"truncatedRows":true}`）／超宽同理（63 列 ⇒ 每行留 60 个，回带 `totalCols=63`）／**被截断时附一句明说**（实测末两行 `*（仅显示前 1 行（本表共 3320 行））* |`）／**没被截断时不加**这句 |

两组的分工与限度（**写进测试文件头 `tests/office-doc.mjs:43-45`，不是本报告才补的**）：

- 把 `MAX_ROWS` 改回 1000 ⇒ ⑧ 组变红（⑦ 组不受影响：它测的是纯函数，不是上限）；
- **删掉 `readDoc` 的 ①b ⇒ ⑦ 组仍绿**（纯函数还在、也还正确）—— 真件成败**只有端到端那条线抓得住**，见 §3.2 NC-B 与 §5。

### 3.2 两条阴性对照（**真实输出**，原始文件在 `docs/reviews/evidence-2026-10-09/`）

每一条都是**改真文件 → 跑 → 记录红的是哪几条 → 逐份还原**。

| # | 变异（改哪一行） | 命令 | 结果 |
|---|---|---|---|
| **NC-A** | `office-lib.mjs:42` `const MAX_ROWS = 10000` → `1000`（**只抬这里**，其余一字不动） | `node --import tsx/esm tests/office-doc.mjs` | **93 通过 / 1 失败**（退出码 1）。变红的**恰好一条**：`❌ MAX_ROWS 已抬离迁前的 1000（实测 1000）—— 用户实测的那张排播表有 3320 行`。⑦ 组与 ⑧ 组其余各条**全绿** —— 它们按运行期读到的常量驱动，所以"上限变了"这条事实只能由「实测值 vs 迁前 1000」这一条抓住（这正是它存在的理由）。原始输出 `_negative-control-A-MAX_ROWS-1000.txt` |
| **NC-B** | `office-lib.mjs:317` `const text = (await readDocPieceText(buf)).trim()` → `const text = ''`（**只停 ①b**） | 对**真实用户文件**直调产品函数 `readDoc` | 那份真件立刻**回到改前症状**：主路仍 `"\n\n"`（2 字符），`readDoc` 只能如实回 `ok=false reason=empty`（旧行为；至少不是假装成功）。xlsx 侧同一次运行不受影响（`rows=3320 totalRows=3320 truncatedRows=false`）。原始输出 `_negative-control-B-doc-stage-off.txt` |

> **两条 NC 的边界如实说明**：NC-B 里 ⑦ 组**仍绿** —— 停用的是 `readDoc` 里的调用，纯函数还在。所以"①b 是不是真的在起作用"这件事，**套件证明不了，端到端证明得了**（上表第二列）。这是 §5 第 1 条。

**另有一条更早的观察（非单变量，仅供参考）**：本批**在实现之前、测试已写好的状态下**跑过一次套件 = **81 通过 / 6 失败**。它的条数与收工不同（94），原因是 ⑦ 组的断言**包在 `if (typeof lib.parseWordPieceText === 'function')` 里** —— 导出还不存在时，那一大块断言**短路跳过**，只有"导出存在"那条变红（这是刻意的：缺导出只该失败一条，不该让整个文件崩掉）。**单变量证据以上表两条 NC 为准，那 81/6 只当背景。**

### 3.3 复现方式（一条命令一份证据）

```bash
cd privhub
node --import tsx/esm tests/office-doc.mjs          # 94 / 0（绿）
node tests/run-all.mjs --spawn                      # 全量门禁（隔离实例，3190）
```

端到端真件取证用的是一段**只读**脚本（解密到内存、不写任何文件）：把 `office-lib.mjs` 经 `pathToFileURL` 导入、用 `data/secret.key` 解出真件字节，再直调 `readDoc` / `readXlsx` 打印结果。原始输出见 `docs/reviews/evidence-2026-10-09/_after-real-files.txt`。

---

## 4. 回归对照

命令：`cd privhub && node tests/run-all.mjs --spawn`（隔离实例端口 **3190**）

| 套件 | 收工断言数 | 本批是否碰过该套件覆盖的代码 |
|---|---|---|
| HTTP 七套汇总（first-screen / smoke / security / hardening / personal-space / personal-rename / agent-sandbox） | 120 | 否 |
| frontend-templates | 26 | 否 |
| admin-console | 76 | 否 |
| personal-ui | 362 | 否 |
| audit-reliability | 16 | 否 |
| integrity | 60 | 否 |
| first-run | 3 | 否 |
| rag-resilience | 66 | 否 |
| model-parse（模型回包解析） | 48 | 否 |
| data-migrate（系统数据迁移） | 40 | 否 |
| JSON 损坏防护 | 79 | 否 |
| 并发丢更新（读-改-写） | 25 | 否 |
| preview-limits | 61 | 否（csv/tsv 的 1000 行闸**未动**，见 §5 第 5 条） |
| file-exts | 69 | 否 |
| **office-doc** | **94** | **是**（⑦⑧ 两组新增，+15） |
| **合计** | **1145** | — |

- **退出码**：**0**（15 套，**1145** 条断言，`grep -c '❌'` = **0**）。
- **唯一增量是 `office-doc` 的 +15**：⑦⑧ 两组共 15 条全部是新增；`office-doc.mjs` 的基线 **79** 取自 `docs/reviews/15-编辑预览三态.md` 的实测表（79 + 15 = 94，与本次实测一致）。
- ⚠ **本批没有为其余 14 套单独拍"改前基线快照"**（那种快照在 `15` 批之后、本批之前还有别的批次落地，数字早已不是 813 那个量级），因此**不声称**"与改前逐条同名"。可声称的是：本批**只改了 4 个文件**，其中只有 `tests/office-doc.mjs` 是测试文件；其余 14 套所覆盖的代码路径**本批一行未碰**，且在最终落盘状态下**逐套全绿、零 `❌`**。
- **与本批无关但如实记录**：本次门禁输出里出现的一条既有 stderr（`DELETE /privhub/api/publish` 相关的 `storage.writeText is not a function`）与 `15` 批记录的那条**同源**，**不是本批引入**，方向不变：留给出活的人判断。

---

## 5. 未实测 / 判不了的（如实列）

1. **"①b 在起作用"这件事，套件证明不了**：⑦ 组测的是 `parseWordPieceText` 纯函数；把 `readDoc` 里的调用停掉，⑦ 组**仍绿**（NC-B 实测）。真件成败只有端到端那条线抓得住 —— 故 **NC-B 与 `_after-real-files.txt` 是本批 `.doc` 修复的主证据**，套件是副证据。**要补一条"套件内也能抓 ①b"的断言需要 fixture 真 OLE2 文件**（体积/许可证都要拍板），本批**未擅自补**。
2. **只有一份真 `.doc` 被验过**：全仓 `data-files/` 只找到这一份真 Word 二进制（另一份 `.doc` 是 RTF 伪装，走假样本路径）。所以"piece 表直读对**所有** .doc 都成立"这层**没验**；能说的是"对这份 59904 字节、`nFib=193`、`fComplex` 置位的 Word 97 文件成立"。**用户若还有别的旧 `.doc`，值得再各开一次。**
3. **被标记"删除"的修订文字会显示出来**（§2.1 的代价）：真实效果（显示的到底是正文还是修订稿）**本批没有第二份带修订的 .doc 来对照**，**未实测**。
4. **观感一律未实测**：那句「仅显示前 N 行（本表共 M 行）」在界面上**长什么样**（斜体？会不会被表格挤？3320 行的表渲染出来卡不卡）**一条都没看过**。仓库里没有浏览器测试、前端走 CDN ⇒ 只能说"真模板渲染出的**文本**里有这句"。**3320 行 markdown 表格的实际渲染性能未实测**（上限抬到 10000 会不会在长表上明显变慢，**判不了**）。
5. **前端 csv/tsv 的 1000 行闸未动（已知限度，如实报）**：`plugins/privhub-files-explorer-v3/client/content.js` 里 csv/tsv 另有一个 `MAX_TABLE_ROWS = 1000`，**它的行为是"超了就退回纯文本"而不是截断**，且 `tests/preview-limits.mjs` ⑧ 组**已把这条行为钉成断言**。改它就要动既有断言（**本批无此授权**）⇒ **本次只修了 xlsx 那条链**。用户若在 csv 上也看到 1000 行痕迹，那是另一个开关，需要另开一批、并连带改那条既有断言。
6. **10000 行是有理由的上限，不是终点**：要再高必须先有分页/网格渲染器。这条写进了代码注释而非留在这里 —— 避免下一个读代码的人以为"数字可以随手抬"。
7. **本次 dev 实例重启的影响范围**：重启的是 dev 实例（3180，PID 29504 → 31784）。**生产实例（start.bat 3181）本批未重启**，故生产上这条 `.doc` 修复**尚未生效**（`【推断】`：生产启动方式与 dev 不同，需部署脚本；本批未碰 `deploy/`、未跑 `build-deploy.ps1`）。
8. **"前端不用重启"这半句是源码事实 + 盘上文件为准，未带会话经 HTTP 复取整个下发文件**：静态插件文件**要活会话**（无 cookie 直接 `GET /privhub-plugins/…/content.js` 实测 **401 unauthorized**，这是既有约定，`CLAUDE.md` 有记），本批**没有**去拿会话 cookie 把整份下发内容拉下来逐字比对。可声称的是：① 盘上 `content.js` 已含该改动（`grep -c '仅显示前'` = **2**，mtime = 本批编辑时间）；② 静态下发走 **mtime 弱 ETag + `cache-control: no-cache`**（`src/web-server.ts:240-257`，`【实体】`）⇒ 浏览器**刷新即取新**。**"刷新后浏览器里确实是新版"这一层未实测**（没有浏览器）。

---

## 6. 纪律留痕

- 改动落在 **4 个文件**：`plugins/privhub-svc-office/src/office-lib.mjs`（A/B/E/F/G）、`plugins/privhub-svc-office/src/index.ts`（C）、`plugins/privhub-files-explorer-v3/client/content.js`（D）、`tests/office-doc.mjs`（⑦⑧，**纯新增**）。外加本报告与 `CHANGELOG.md`。
- `frontend/index.html` **一字未动**；不动 manifest / 插槽 / 打包链；不动别的插件的任何文件。
- `privhub/data/`、`privhub/data-files/` **只读**（只在内存里解密，未写、未改、未重命名、未删除）；全量门禁跑的是 `.testroot` 隔离实例（3190），**没碰 3180/3181**。
- **未做 `git add` / `git commit` / `git push` / `git stash` / `git worktree`**；未用 workflow / ralph；未启动子智能体。
- **版本号不动**（3.1.3）：本批是缺陷修复，`CHANGELOG.md` 只加 `[未发布]` 段，未动 `package.json`。
- 阴性对照两条**逐份还原**（NC-A 还原后套件回到 94/0；NC-B 还原后真件回到 5037 字），源码里**零残留**（`grep -c 'NC-B 阴性对照' office-lib.mjs` = 0，`MAX_ROWS = 10000` 实测）。
- **用户数据不入库**：本批的端到端原始输出含用户 `.doc` 正文与表头片段，写进 `docs/reviews/evidence-2026-10-09/` 时**已隐去内容类片段、只留长度/行数/计数**（原始未隐去输出留在会话临时目录，不随仓库分发）。同一条纪律适用于本报告正文。

### 6.1 与用户描述对照

| 用户原话 | 实测 | 处理 |
|---|---|---|
| 「表格只能显示1000行，更多的没有显示」 | **对**：那张排播表 3320 行，旧上限 1000 且静默 | 上限 1000 → 10000 + 回带真实总数 + 界面明说（A–D） |
| 「.doc文件没有预览」 | **对**：真件主路 `getBody()` = `"\n\n"`（2 字符），piece 表里正文 5041 字完好 | 新增 ①b piece 表直读（E–G），实测 5037 字、0 NUL |
| 「是不是你没重启后台导致插件没有更新」 | **一半对**：前端不用重启；**这条后端修复必须重启** | **两半都做**：静态链路核实（mtime ETag + no-cache）+ dev 实例已重启（PID 31784） |
| 「其他的显示问题都可以往后排」 | 已按此粒度：本批**只**动这两条，未顺手改 csv/tsv 的 1000 行闸（§5 第 5 条），也未动观感类问题 | — |
