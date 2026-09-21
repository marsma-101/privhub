# 13 · `.doc`「解析失败却报成功」修复 + Office 扩展名族收敛

> 编制：萧潇｜日期：2026-09-21｜源码基线：v3.1.1（版本号唯一来源 `privhub/package.json`，本批**未新开版本号**，条目追加在 3.1.1 段内）
> 上游依据：`docs/reviews/11-格式支持矩阵与铺满修复.md`（真文件实测，`.doc` 与 4 处副本都是它查出来的）、`docs/reviews/12-扩展名白名单收敛与补齐.md`（「一处定义 + 各处显式派生」范式）
> 可信度标记沿用七路评审口径：**【实体】**亲自打开文件看到该行　**【实证】**由命令/数据得出　**【推断】**有据未复现
> 行号约定：`privhub/` 前缀省略

---

## 0. 一句话结论

**两件都办在同一个地方：Office 处理链。**
① `.doc` 那条「三级兜底」的**第三级原本是一句话**（`[无法提取 DOC 文本]（…）`），于是"解析不出来"被包装成 `ok:true` + 正文，**界面照实显示那句话**——现在三级失败**如实报 `ok:false` 并给出可区分的原因**，界面显示原因原文；
② Office 扩展名族那 4 处副本**收敛到 `file-exts.ts` 一处定义**，并顺手把前后端那处不一致（前端多 `xls`/`ppt`）**摆平**：`.xls`/`.ppt` 归入「**Office 家族但不在读取链**」，界面清单回归读取链取值。
`frontend/index.html` 一字未动；`viewers.js` 契约形状一字未动；无 `git` 操作；版本号仍 3.1.1。

---

## 1. 第一件：`.doc`「解析失败却报成功」

### 1.1 病根（**改前**，带行号，全部亲自读过）

| # | 位置（迁前） | 原文/行为 | 后果 |
|---|---|---|---|
| ① | `plugins/privhub-svc-office/src/office-lib.mjs:31-66` | `readDoc` 三级链：`word-extractor` → Python `scripts/doc2md.py` → **兜底文案**；第三级 `return { text: '[无法提取 DOC 文本]（请用 Word/WPS 打开后另存为 docx 再上传）' }` | **"解析失败"被伪装成"有正文"** |
| ② | `plugins/privhub-svc-office/src/index.ts:74`（迁前） | `if (kind === 'doc') return { ok: true, kind, content: await lib.readDoc(buf) }` —— 不看 `readDoc` 内部成败 | `ok:true` |
| ③ | `plugins/privhub-files-office-ui/src/index.ts:85` | `json(res, r.ok ? 200 : 400, r)` | **HTTP 200 + ok:true** |
| ④ | `plugins/privhub-files-explorer-v3/client/content.js:36-38`（迁前） | `if (r.ok) store.content = { …, office: { kind, markdown: officeToMd(r.kind, r.content) } }` | 界面把那段话当正文渲染 |
| ⑤ | `plugins/privhub-svc-office/src/office-lib.mjs:47-56`（迁前） | Python 兜底 `execFileAsync('python', …)`，**本机那对命令是 Microsoft Store 占位别名** | 第三级在本机**永远不会工作**（【实证】`python -c pass` 一次 8s 未回、退出码 9009；`where` 显示真实路径在 `…\WindowsApps\`） |

⇒ 那 41 个测试 `.doc`（RTF 伪装 / 空 OLE2）全部落到"报成功"，用户看到的是一行提示句。

### 1.2 改法（后端）

| 文件 | 行区间（改后） | 改了什么 |
|---|---|---|
| `plugins/privhub-svc-office/src/office-lib.mjs` | **新增 27-56**（整段口径说明）；**新增 58-148**（`probePython` / `docConverterStatus` / 预热）；**改写 154-219**（`readDoc`） | `readDoc` **只回两种形状**：`{ text }` 或 `{ ok:false, reason, detail }`；**第三级文案删除** |
| `plugins/privhub-svc-office/src/index.ts` | **新增 19-64**（共享集合导入 + `OfficeReadFailure` / `OfficeReadReason` / `capabilityError`）；**改写 99-101**（`kindOf`）；**改写 106-149**（`read`） | `.doc` 的失败 ⇒ `ok:false` + `reason` + 中文 `error`；其余 kind 的 `ok` 语义同步收紧（拿不到正文不许说成功） |

**原因码（稳定标识，文案可改、语义不改）**

| reason | 含义 | 本机能否触发 |
|---|---|---|
| `unsupported-type` | 扩展名不在读取链里（`.xls`/`.ppt`/别的） | ✅ 实测 |
| `read-failed` | 路径无效 / 读不出字节 / >32MB | ✅ 实测 |
| `capability-missing` | **这台机器**缺转换能力（Python 兜底不可用），而主解析器又不认这个文件的容器 | ✅ 实测（假 `.doc` 全是它） |
| `capability-broken` | 探测到 Python 存在但跑不起来 | ❌ 本机触发不到（[未实测]） |
| `parse-failed` | **这个文件**解析不了（异常/坏内容） | ✅ 实测（坏的 docx） |
| `empty-content` | 解析通了但确实没正文 | ❌ 本机触发不到（需要"能解析的空 .doc"） |

### 1.3 为什么"先探测再调用"（这一条是实测逼出来的）

迁前的 Python 兜底是"跑一下试试"。本机实测：`python -c pass` **8 秒未回**、`python3` 同样
⇒ 若沿用旧写法，**只是读一个假 `.doc` 就要等十几秒**。
新的 `probePython()` 三步（顺序有意义）：

1. `where python` / `where python3` 解析**真实路径**（实测 **54ms**；解析不到即命令不存在）；
2. 路径落在 `…\WindowsApps\` ⇒ **判为 Microsoft Store 占位别名，直接不可用，不执行**（不是"跑一下看"）；
3. 只有真存在、且不是占位别名的候选才跑 `python -c pass` 确认（退出码 0 且 stdout/stderr 都空）。

结论**缓存到进程结束**，并在模块加载时**预热**（fire-and-forget）⇒ 实测 `docConverterStatus()` 总耗时 **98ms**（原 16s+）。

### 1.4 `.doc` 现在的行为（**真实 JSON / 真实文案**）

**接口**（隔离实例 3198，真上传真请求；样本是自造的假 `.doc`，**没有**碰 `data-files/` 里那 42 个真件）：

```
[实测] /office/read OD假样本-rtf伪装.doc  → HTTP 400
{"ok":false,"kind":"doc","reason":"capability-missing",
 "error":"无法提取这份 .doc 的正文：本机没有真正的 Python（只有应用商店的占位程序）。请用 Word/WPS 打开后另存为 docx 再上传"}
```

（四条假样本 —— RTF 伪装 / 空 OLE2 / 纯文本伪装 / HTML 伪装 —— 返回**同一个形状**，`reason` 都是 `capability-missing`。）

**回归（真 Office 文件没被误伤，同一次运行）**：

```
[实测] /office/read OD真样本.docx → HTTP 200 {"ok":true,"kind":"docx"}  正文="OD 真样本 docx 正文"
[实测] /office/read OD真样本.xlsx → HTTP 200 {"ok":true,"kind":"xlsx"}  正文="sheets:[{name:'表1',rows:[['名称','数量'],['苹果',3]]}]"
[实测] /office/read OD真样本.pdf  → HTTP 200 {"ok":true,"kind":"pdf"}   正文=20213 字（pdf-parse 自带测试件）
```

**界面显示什么**（`content.js` 真身进 vm，喂上面那个回包）：内容区进**错误态**、显示的就是后端 `error` 那一句原文
（模板是既有的 `panel.js:761` `<div v-else-if="content.state === 'error'" class="v3-loading">{{ content.error }}</div>`，**一行字、不弹窗、不加控件、不改布局**），
并且 `content.office` **不存在**（正文位是空的），`content.officeReason = 'capability-missing'`（供排查）。

---

## 2. 第二件：Office 扩展名族收敛

### 2.1 4 处副本（改前，逐处**实体**核对）

| # | 位置（迁前） | 取值 | 谁在用 |
|---|---|---|---|
| 1 | `plugins/privhub-svc-office/src/index.ts:22` | `doc docx xlsx pptx pdf` | `/api/office/read`、`/api/ai/office/read`、`/api/office/convert-doc` |
| 2 | `plugins/privhub-files-office/src/index.ts:11` | `docx xls xlsx pptx` | `/api/office-preview` 的入口闸 |
| 3 | `plugins/privhub-files-office/src/extract.mjs:11` | 同上（同值**第二份**） | 上者的实现体 |
| 4 | `plugins/privhub-files-office-ui/client/index.js:45` | `doc docx xlsx pptx pdf` | 「编辑」浮层的入口闸 |
| 附 | `explorer-v3/client/panel.js:173`、`ops.js:262`（迁前） | `… xls … ppt …` | `isOfficeFile` / 右键「编辑」（**多 `xls`/`ppt`**） |

### 2.2 最终口径：**`xls`/`ppt` 算「Office 家族」，不算「读取链」**

| 概念 | 取值 | 语义 |
|---|---|---|
| `OFFICE_EXTS` | `doc docx xlsx pptx pdf`（**5 项，取值未变**） | **读取链真能读出正文**的那一批（`office-lib.mjs` 对每一项都有实现） |
| `OFFICE_FAMILY_EXTS` | 上者 ∪ `xls ppt`（**7 项**） | **界面上属 Office 家族**的那一批（用户会这么认），本批**没有 UI 消费方直接取它**——它是口径落点 |
| `OFFICE_EXTRACT_ONLY_EXTS` | `xls` | `files-office` 的**提取链**（`/api/office-preview` → Markdown）比读取链多认的那一项（SheetJS 真能读，`extract.mjs:96`） |

**为什么这么分**（两个问题本来就不是一个问题，合成一个就是迁前不一致的根因）：

- **`.ppt`（PowerPoint 97）**：**全仓没有任何一处能读它** —— `svc-office` 的 `readPptx` 只解 OOXML zip（`office-lib.mjs:106-130`），`extract.mjs:98` 对 `ppt` 直接抛「不支持的 Office 类型」。生态里也没有可用的纯 JS 渲染器（`docs/reviews/11-…md` §3.4）。
- **`.xls`（BIFF）**：项目**确实有**能读它的依赖（`xlsx`/SheetJS 在 `package.json` 里，`extract.mjs:96` 用 `XLSX.read` 读 `xls`）。但它接在 `/api/office-preview` 那条链上，**不在** `svc-office.read()` 那条链上；而界面打开 `.xls` 走的是**后者**。⇒ **本批不把一条能力挪到另一条链上**（那会动 Office 读取链的分支，风险与目标不成比例），按「谁声明谁负责」：`files-office` 继续只为 `office-preview` 认 `xls`。

**顺带摆平的那处不一致**：界面清单**回归读取链取值**，`xls`/`ppt` 不再出现在 `EXT.OFFICE_EXTS` / 浮层入口闸里。
迁前用户在 `.xls`/`.ppt` 上点「✏️ 编辑」是**静默无反应**（`ops.js` 放行 → `office-ui` 又挡回去），现在不进那个分支（不留悬空入口）。

> ⚠ **这是一个可感知的行为变化**，如实记：`.xls`/`.ppt` 现在点右键「✏️ 编辑」**完全没反应**（之前"看起来有反应但什么也没发生"）。要恢复成"能编辑"，得先把 `svc-office.read()` 里 `.xls`/`.ppt` 的实现补上——那是**功能改动**，按纪律留给专项。

### 2.3 收敛后的样子

| 文件 | 行区间（改后） | 改了什么 |
|---|---|---|
| `plugins/privhub-core/src/file-exts.ts` | **新增 84-95**（文件头「Office 那一族的口径」表）；**新增 320-329**（`OFFICE_FAMILY_EXTS` / `OFFICE_EXTRACT_ONLY_EXTS`）；**新增 372-386**（三个判定入口）；`:158` 与 `:47` 的两张派生表各加一行 | **一处定义** |
| `plugins/privhub-svc-office/src/index.ts` | `:19-22`（导入） | 手写清单 → `officeKindOf`（**删掉**数组，不是留着不用） |
| `plugins/privhub-files-office/src/index.ts` | `:5-17` | 手写清单 → `EXTRACT_EXTS = union(OFFICE_EXTS, OFFICE_EXTRACT_ONLY_EXTS)` |
| `plugins/privhub-files-office/src/extract.mjs` | `:1-16` | **删掉** `export const OFFICE_EXTS`（该文件不再认清单，只按扩展名分发） |
| `plugins/privhub-files-office-ui/client/index.js` | `:13-35`（注释+常量，常量在 `:35`）、`:67` | **有意保留为该插件自己的单点定义**（浏览器取不到 `core/src/`，且 `integrity.mjs:379-389` 要求 client 只引用同目录文件），取值与共享处**逐项同值**由断言钉住 |
| `plugins/privhub-files-explorer-v3/client/utils.js` | `:31-43`（注释 + `:39` 常量 + `:41` 派生） | 前端唯一出处，注释写清「不含 `xls`/`ppt` 及为什么」 |
| `plugins/privhub-files-explorer-v3/client/panel.js`、`ops.js` | `:174-182`、`:263-269`（注释） | 注释与口径对齐（代码本批未动，上一批已改派生） |
| `plugins/privhub-files-explorer-v3/client/content.js` | `:35-53` | Office 分支：`ok`/`error` 两态 + `officeReason`（`:49`/`:52`） |
| `plugins/privhub-core/src/file-exts.ts` | 同上一行表 | 新增 `isOfficeReadExt`(`:372`) / `isOfficeFamilyExt`(`:376`) / `officeKindOf`(`:384`) |

**没动的**：`frontend/index.html`（一字未动）、`plugins/*/manifest.json`、插槽、打包链、`viewers.js`、`src/main.ts`、`src/web-server.ts`、`data/`、`data-files/`。

---

## 3. 新增/改写的断言 + **两条阴性对照的真实输出**

### 3.1 新增静态套件 `privhub/tests/office-doc.mjs`（**79 条**，六组）

| 组 | 做法 | 为什么这样才"会红" |
|---|---|---|
| ① Office 口径 | 逐条验集合取值与关系（家族 ⊇ 读取链、**差集恰好 `xls,ppt`**）、三个判定入口对大小写/前导点/相近名字的行为 | 谁把 `xls`/`ppt` 塞进读取链、或改成别的家族范围，当场红 |
| ② `readDoc` 三态 | 四条**自造**假 `.doc` 直调真身；断言「没有 `text` + 有 `reason` + 不含兜底句」；另钉两条源码形状：代码里**不再有**那句兜底文案、**不允许** `return { text:'…无法提取…' }` 这种形状 | 兜底文案贴回代码、或换一种方式"把提示句当正文"，当场红 |
| ③ `read()` 契约 | 用 `Object.create(OfficeService.prototype)` 造**未注册实例**驱动**真身** `read()`（`Service` 构造函数要真 ctx，但 `read()` 只用两个注入点）；验 `unsupported-type`/`read-failed`/`parse-failed` **三者可区分** | `ok` 语义被改回去、或原因码被糊成一句话，当场红 |
| ④ 端到端 | 隔离实例 **3198**、真上传真接口：4 条假 `.doc` ⇒ HTTP 400/`ok:false`/有 `reason`；真 `docx`/`xlsx`/`pdf` ⇒ HTTP 200/`ok:true`/正文 | **回归保护**：改坏正常路径也会红 |
| ⑤ 前端 | `content.js` **真身进 vm**（桩只替 `deps.js`/`utils.js`/`store.js` 三个同目录 import）：喂 `ok:false` 回包 ⇒ 错误态 + 后端原因原文 + 无 `office` 正文 + 无兜底句；并**如实记录**「若后端又回 `ok:true`+兜底句，界面会照单显示」（前端分辨不了，防线只在后端） | 前端若把错误态当成功渲染，当场红 |
| ⑥ 收敛 | 3 处副本**真删**（按去注释后的代码判，认 `const`/`export const`/`new Set(` 三种写法）+ 两份前端单点定义**逐项同值** + **逃逸扫描**（全仓 `src/`、`plugins/`、`frontend/` 里备案外的"声明式 Office 数组" ⇒ 红，自带阳性/阴性对照） | 谁再抄一份清单，当场红 |

### 3.2 `privhub/tests/file-exts.mjs` ④ 组同步更新（**69 条**，原 59）

- **备案表由 8 处减到 5 处**：Office 族从 4 处收到 1 处（`svc-office` / `files-office` 的 `.ts` 与 `.mjs` 三行删除；`office-ui` 那一份**有意保留**为插件自己的单点定义，理由写进备案表注释）。
- 新增「**Office 族：迁前 4 处副本收敛后的样子**」一组：3 处副本必须真删（按去注释后的代码判）。
- 新增 4 条消费方派生断言（`svc-office` 引用共享集合与 `officeKindOf`、`files-office` 引用 `OFFICE_EXTRACT_ONLY_EXTS` 与 `union(`）。
- **扫描器本身修了一处误报**：它原来会**把注释里引用的清单也算成"又抄了一份"**（本批给 `file-exts.ts` / `extract.mjs` 写口径说明时当场被它抓到两处假阳性）。现在先 `stripComments` 再扫，并补了两条对照：
  - **阴性对照（注释）**：`/* 迁前它是 export const OFFICE_EXTS = ['docx','xls','xlsx','pptx'] */` ⇒ **0 命中**；
  - **阳性对照（代码）**：`const A = ['docx','xls','xlsx','pptx']` ⇒ **1 命中**（证明"注释不算"没有变成"什么都不算"）。

### 3.3 阴性对照 NC1：把"解析失败报成功"改回去 ⇒ **断言变红**

改坏方式：在 `readDoc` 的失败分支插一行 `return { text: '[无法提取 DOC 文本]（请用 Word/WPS 打开后另存为 docx 再上传）' }`（即**迁前行为**）。
命令：`cd privhub && node --import tsx/esm tests/office-doc.mjs`
原始输出：`docs/reviews/evidence-2026-09-17/_negative-control-doc-NC1.txt`

```
  ❌ `office-lib.mjs` 的**代码里**不再出现「无法提取 DOC 文本」这句兜底文案（注释里讲来历不算；贴回代码必红）
  ❌ 失败分支**不允许**返回「只有 text、且 text 是兜底提示句」这种形状（＝"解析失败却报成功"的病根）
  ❌ 假 .doc「OD假样本-rtf伪装.doc」… ⇒ **没有正文、回带原因、且不含兜底文案**（实测 reason=undefined）
  ❌ 假 .doc「OD假样本-空OLE2.doc」… ⇒（同上）
  ❌ 假 .doc「OD假样本-纯文本.doc」… ⇒（同上）
  ❌ 假 .doc「OD假样本-html伪装.doc」… ⇒（同上）
  ❌ 四条假样本的原因码一致且不是 `empty`（实测 undefined）
  ❌ 本机没有可用转换能力时，假 .doc 的原因落在 `capability-*`
     [实测] read(OD假样本-rtf伪装.doc) = {"ok":true,"kind":"doc","error":"…"}
  ❌ `read('OD假样本-rtf伪装.doc')` ⇒ ok:false + kind:'doc' + reason + 中文 error（**不再**是 ok:true + 兜底文案）
     [实测] /office/read OD假样本-rtf伪装.doc → HTTP 200 {"ok":true,"kind":"doc"} error=""…
  ❌ `OD假样本-rtf伪装.doc` ⇒ HTTP 400 + ok:false + reason（**迁前这里回的是 HTTP 200 + ok:true + 一句兜底文案**）
  …（空 OLE2 / 纯文本 / HTML 同形，各 2 条）
     [实测] /office/read OD真样本.docx → HTTP 200 {"ok":true,"kind":"docx"} 正文="OD 真样本 docx 正文"
  ✅ `OD真样本.docx` 仍能读出正文（HTTP 200 + ok:true + kind:docx + 正文）—— 本批没有误伤正常路径
  …（xlsx / pdf 同）
  .doc 如实报错 + Office 族收敛断言：59 通过 / 20 失败
```

**这正是迁前那个 bug 原样回放**：`/office/read` 回 **HTTP 200 + ok:true**，而正文位是那句提示句。
同时真 `docx/xlsx/pdf` 三条**保持绿** ⇒ 说明变红的就是"报假成功"这一处行为，不是环境、也不是探针。

### 3.4 阴性对照 NC2：塞一份手写 Office 副本 ⇒ **防漂移断言变红**

改坏方式：在 `plugins/privhub-files-office/src/index.ts` 里加一行 `const OFFICE_EXTS_OLD = ['doc','docx','xlsx','pptx','pdf']`。
命令与原始输出：`-NC2-office.txt`（`node --import tsx/esm tests/office-doc.mjs`）、`-NC2-fileexts.txt`（`node --import tsx/esm tests/file-exts.mjs`）

```
# office-doc.mjs（⑥ 组）
     [越界] plugins/privhub-files-office/src/index.ts:OFFICE_EXTS_OLD
  ❌ 备案外没有第 4 处 Office 手写清单（越界 1 处；备案的只有 3 处：core 一处定义 + 两份前端单点定义）
  .doc 如实报错 + Office 族收敛断言：77 通过 / 1 失败        （exit=1）

# file-exts.mjs（④ 组，上一批那道"手写副本 ⇒ 变红"的闸）
     [实测] 扫描 116 个源码文件；有备案的出处命中 5/5
     [越界] plugins/privhub-files-office/src/index.ts:20 → doc,docx,xlsx,pptx,pdf
  ❌ 全仓源码里没有备案外的手写扩展名字面量数组（越界 1 处）
  扩展名收敛与补齐断言：68 通过 / 1 失败                     （exit=1）
```

**还原**：两次阴性对照改动的**产品代码文件**都已整份还原，与 `docs/reviews/_sha-before-doc.txt` 逐行核对
（`Compare-Object` 输出为空，13 个文件哈希全一致，其中 `office-lib.mjs` = `E959AD17…`、
`files-office/src/index.ts` = `EB22D656…`）。
说明一条：该哈希文件是**阴性对照跑完后**重拍的一份「收工快照」（写成 `_sha-before-doc` 沿用上一批的命名习惯），
因此它**就是收工状态的权威哈希**（`tests/office-doc.mjs` 的那次变化发生在第一版快照之后——快照时 79 条断言里还没有
"不允许 `return { text:'…无法提取…' }`"这一条，补上之后哈希变为 `0B964A75…`，这是**预期内的新改动**）。

---

## 4. 两道闸门比对（**失败清单逐条同名**）

| 项 | 基线 `docs/reviews/_baseline-doc.txt` | 收工 `docs/reviews/_after-doc.txt` |
|---|---|---|
| 命令 | `cd privhub; node tests/run-all.mjs --spawn *> ..\docs\reviews\_baseline-doc.txt` | 同一条命令、同一种写法（用 `*>` 避免 PowerShell 把 stderr 算成 `NativeCommandError`） |
| 进程退出码 | **0** | **0** |
| 失败清单（全文件搜 `❌`） | **空（0 条）** | **空（0 条）** |
| 套件断言（按行序） | 86 / 12 / 76 / 279 / 16 / 50 / 3 / 27 / 42 / 59 | 86 / 12 / 76 / 279 / 16 / 50 / 3 / 27 / 42 / **69** / **79** |
| 静态与冷启动段逐套合计 | **563 通过 / 0 失败**（十套） | **632 通过 / 0 失败**（**十一套**，+69＝`file-exts` 59→69、`office-doc` 新增 79） |

> 口径说明：上表**不含** HTTP 七个套件那行汇总 `结果：86 通过 / 0 失败 / 共 86`（它是那七个套件的合计，加进来会重复计数）。
> 两栏的逐套数字与文件都在 `docs/reviews/_baseline-doc.txt` 与 `_after-doc.txt` 里，可直接回读核对。
| 与上一批证据的一致性 | 基线十套数字与 `docs/reviews/evidence-2026-09-17/_after-exts.txt` **逐行相同**（起手核对过） | —— |

**数字变化的全部来源**：`file-exts` 59 → **69**（+10＝Office 族那组 + 两条扫描器对照 + 4 条派生消费方断言）、
新增 `office-doc` **79**。**新增第三行之前的十套里没有一条既有断言被删改**（`personal-ui` 仍是 279、`preview-limits` 仍是 42）。
> 上一批的口径是「十套」，本批起是**十一套**（新增 `office-doc.mjs`，排在最后一行）。

复现方式：

```powershell
cd G:\program\dsh-SQL\privhub
node tests/run-all.mjs --spawn *> ..\docs\reviews\_after-doc.txt       # 闸门
node --import tsx/esm tests/office-doc.mjs                             # 本批新增套件（自带隔离实例 3198）
node --import tsx/esm tests/file-exts.mjs                              # 上一批套件（本批改了备案表与扫描器）
```

---

## 5. 我判不了 / 没实测的（本批最要紧的免责项）

| # | 项 | 为什么 |
|---|---|---|
| 1 | **真 `.doc` 到底能不能出正文：仍是【推断】，本批未实测** | 真实 `data-files/` 里那 42 个 `.doc` **全是密文**（PHENC1），其中 1 个是**真的业务文档**——**不许解密**（本批没碰）；本批也没有 Word / LibreOffice / 任何 `.doc` 生成器来造一个**真** OLE2 Word 二进制样本（【实证】`node_modules` 里没有任何 `.doc` 夹具，`word-extractor` 包里只有 `lib/`，本机无 LibreOffice）。所以这条**只有代码路径证据**（`office-lib.mjs` 第一级 `word-extractor.extract`）。**要实测只有一条路**：主子给一份可公开的真 `.doc`（或允许在隔离环境解密那 1 个真件） |
| 2 | **界面观感（错误提示在真机上的样子）** | 仓库里**没有任何浏览器测试**（`run-all` 是 HTTP 套件 + 在 Node 里 import 前端模块/编译模板）。本批复用既有 `.v3-loading` 那一行显示 `content.error`，**推断**与既有错误提示观感一致；但**没在浏览器里看过**，特别没看过长 `error` 文案在窄面板里的折行 |
| 3 | **`empty-content` / `capability-broken` / `python-failed` 三个原因码本机触发不到** | 分别需要「能解析但没有正文的 `.doc`」与「装了真 Python 的机器」。本批只在断言里钉住**取值集合与可区分性**，这三个码**没有端到端跑过** |
| 4 | **在有真 Python 的机器上，Python 兜底是否真能救回 RTF 伪装件** | 依赖 `scripts/doc2md.py` 的实现质量，本机跑不了 ⇒ 未验。本批只保证"能力不在时如实说能力不在" |
| 5 | **`.xls` 走 `/api/office-preview` 提取链的既有行为是否受影响** | 本批只改了入口闸的**来源**（手写 → 派生），取值对 `xls` **同值**（`EXTRACT_EXTS` 含它）。但本批**没有**对 `/api/office-preview` 造样本实测（它不在本批目标里）；端到端只验了 `/office/read` 对 `.xls` 回 `unsupported-type` |
| 6 | **`.doc` 上「✏️ 编辑」的观感变化** | 现在 `.doc` 点「✏️ 编辑」仍走 `convert-doc`（把文字重建为 `.docx`）。**迁前**它对假 `.doc` 能"成功"——因为读出来的是那句兜底文案、非空，于是生成一个内容为那句提示的 `.docx`（**这是同一个 bug 的第二个出口**）；**现在**它会回 `400 .doc 中未提取到文字内容`（因为 `office.read` 先失败了）。这一变化**是修 bug 的必然结果**，但"用户在界面上看到什么"我没实测（`ops.js` 会 `toast(r.error)`） |

---

## 6. 交付清单（改了哪些文件与行区间）

| 文件 | 行区间 | 改了什么 |
|---|---|---|
| `plugins/privhub-core/src/file-exts.ts` | 文件头 **+44-47、84-95**；**307-328**（家族/提取链派生）；**370-386**（判定入口） | Office 一处定义 + 家族口径 |
| `plugins/privhub-svc-office/src/office-lib.mjs` | **27-56**（口径说明）、**60-146**（`probePython` 在 121 / `docConverterStatus` 在 136 / 预热在 146）、**154-232**（`readDoc`） | 三态返回，删掉兜底文案 |
| `plugins/privhub-svc-office/src/index.ts` | **19-64**、**98-101**、**103-140** | `ok:false` + `reason`；用共享集合 |
| `plugins/privhub-files-office/src/index.ts` | **5-17** | 派生 `EXTRACT_EXTS` |
| `plugins/privhub-files-office/src/extract.mjs` | **1-16**、`:97` | 删掉副本清单 |
| `plugins/privhub-files-office-ui/client/index.js` | **13-35**、`:67` | 单点定义（注释写清为什么） |
| `plugins/privhub-files-explorer-v3/client/content.js` | **35-53** | Office 两态 + `officeReason` |
| `plugins/privhub-files-explorer-v3/client/utils.js` | **31-40** | 注释与口径对齐（代码未动） |
| `plugins/privhub-files-explorer-v3/client/panel.js` / `ops.js` | `:173-181` / `:262-269` | 注释与口径对齐（代码未动） |
| `tests/office-doc.mjs` | **全新文件**（79 条，约 590 行） | 本批的核心断言 |
| `tests/file-exts.mjs` | 备案表 **266-305**；④ 组 **307-330**（`stripComments`）、**352-370**（对照）、**391-412**（Office 族收敛） | 备案表 8→5 + 注释误报修正 |
| `tests/run-all.mjs` | `:98`、`:110-118` | 挂上新套件 + `needsTsx` 放行 |
| `CHANGELOG.md` | 3.1.1 段内**追加**一节 | 本轮条目（不新开版本号） |
| `docs/reviews/13-doc假成功修复与Office族收敛.md` | 本文件 | 报告 |
| 证据（新增） | `docs/reviews/_baseline-doc.txt`、`_after-doc.txt`、`_sha-before-doc.txt`、`evidence-2026-09-17/_negative-control-doc-NC1.txt`、`-NC2-office.txt`、`-NC2-fileexts.txt` | 两闸门 + 阴性对照原始输出 |

**未做**：没有 `git commit` / `git push` / `git stash`（另有一路在办 git 的事，本批**没碰**）；未用 workflow / ralph；未启动子智能体；
`package.json` 仍是 **3.1.1**；未解密任何真实数据；`data/`、`data-files/` 只读（隔离实例的临时数据跑完自清）。
