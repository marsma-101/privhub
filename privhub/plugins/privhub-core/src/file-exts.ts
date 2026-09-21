/**
 * file-exts —— **全仓「扩展名」分类的唯一出处**（后端侧一处定义 + 各处显式派生）
 *
 * ## 这份文件要解决的病
 *
 * 同一个「纯文本扩展名」概念，此前全仓**至少 7 份各写各的**，而且**已经不一致了**：
 *
 * | 位置（迁前） | 用途 |
 * |---|---|
 * | `privhub-core/src/index.ts` `readFileForPreview` 里的 `textExts` | 能不能当文本**预览** |
 * | `privhub-files-fulltext/src/index.ts` `TEXT_EXTS` | 要不要进**全文索引** |
 * | `privhub-svc-rag/src/index.ts` `TEXT_EXTS` | 要不要**向量化** |
 * | `privhub-files-versions/src/index.ts` `TEXT_EXTS` | 要不要存**版本快照** |
 * | `privhub-files-agent/src/index.ts` `TEXT_EXT` | 智能体**读写**允许的文本类型 |
 * | `privhub-files-agent/src/m2.ts` `SNAPSHOT_EXTS` | 智能体覆盖前要不要**快照** |
 * | `privhub-files-explorer-v3/client/utils.js`（图片清单 / 可编辑清单） | 界面的**分类与可编辑**判断 |
 *
 * 实测出来的不一致（`docs/reviews/11-格式支持矩阵与铺满修复.md` §3.3）：
 * `.markdown` 在 fulltext / rag 有、**preview 没有**；`.toml/.htm/.java/.c/.cpp` 在 preview 有、**versions 没有**；
 * `ico` 在后端图片清单里有、**前端 `kindOf` 没有**（于是图片走了 iframe 分支，失去放大）。
 *
 * ## 这份文件的设计原则（**照抄会走偏，务必读完**）
 *
 * **那几份清单的语义并不相同，绝不能合并成一个集合让所有人共用。**
 * 「能不能预览」「要不要进索引」「要不要向量化」「要不要存快照」「智能体能不能读写」
 * 是五个不同的问题，答案本来就可以不一样。
 *
 * 所以这里做的是两件事，且只有两件：
 *   ① **一处定义**：基础集合（`TEXT_EXTS` / `IMAGE_EXTS` / `MARKDOWN_EXTS` / `OFFICE_EXTS`）只在本文件写一次；
 *   ② **显式派生**：每个用途从基础集合**明确地加/减**出自己那份（见下方「逐用途派生」），
 *      并且**写清为什么这么派**。任何一处都**不得**再出现手写的扩展名字面量数组
 *      —— 那是漂移的唯一来源（断言 `tests/file-exts.mjs` 会扫描源码，见到手写副本就变红）。
 *
 * ## 逐用途派生（这就是全部答案，改动前先读这一节）
 *
 * | 用途 | 派生式 | 为什么这么派 |
 * |---|---|---|
 * | 预览 `readFileForPreview` | `PREVIEW_TEXT_EXTS` | **最宽**：只问「是不是纯文本」，不问「能不能编辑」 |
 * | 全文索引 `files-fulltext` | `VERSION_TEXT_EXTS` | = 可编辑 + 可版本，**减去** `.env` 等配置族（见下「故意不做的」） |
 * | 版本快照 `files-versions` | `VERSION_TEXT_EXTS` | 同上：快照与全文索引要覆盖的范围本来就一致 |
 * | 智能体覆盖前快照 `files-agent/src/m2.ts` | `VERSION_TEXT_EXTS − ENV_EXTS` | 同上，另减配置族（**有意比 versions 窄**，保持迁前行为） |
 * | 向量化 `svc-rag` | `RAG_TEXT_EXTS` | = 主体文本 **减去** `.env` / `.jsonl` / `.ipynb` / `.tsv`（见下） |
 * | 智能体读写 `files-agent` | `TEXT_EXTS − SENSITIVE_EXTS` | 能力同等，**敏感文件豁免**（该清单在 `files-agent` 内） |
 * | 界面分类 `explorer-v3/client/utils.js` | `IMAGE_EXTS` / `OFFICE_EXTS` / `MARKDOWN_FAMILY` | 前端只能拿到**投影**（见下「前端怎么办」） |
 * | 界面可编辑 `explorer-v3` + `edit-md` | `EDITABLE_TEXT_EXTS` | **有意比预览窄**：编辑要过写接口，见下 |
 * | Office 读取链 `svc-office` | `OFFICE_EXTS`（**同一份**） | 服务层不再自带清单；`files-office` 的提取链同样取它 |
 * | Office 家族（界面识别） | `OFFICE_FAMILY_EXTS` | `explorer-v3` 与 `office-ui` 的**显示侧**取这一份，见下「Office 那一族的口径」 |
 *
 * ## 前端怎么办（**这一条是硬约束逼出来的，不是偷懒**）
 *
 * 后端 43 个插件走的是「相对 import `privhub-core/src/index`」这条路（本项目既有惯例），
 * 所以后端各处直接 `import { … } from '../../privhub-core/src/file-exts'` 即可。
 * **但浏览器侧做不到**：
 *   · 浏览器只能取到 `plugins/<插件>/client/` 这一层（静态服务映射是
 *     `/privhub-plugins/<插件名>/<文件>` → `plugins/<插件名>/client/<文件>`，`src/` 根本不可达）；
 *   · 且 `tests/integrity.mjs` 有一条**既有硬断言**：插件 client 模块**只许引用同目录文件**、
 *     不许引用任何相对路径（`GLOBALS` 那条「拆出来的东西都留在插件内」）。
 * ⇒ 前端**不可能** import 这份文件。于是前端的处理是：
 *   · **每侧一份单点定义**：`explorer-v3/client/utils.js`（图片/Office/Markdown/可编辑四份派生）
 *     与 `edit-md/client/index.js`（可编辑那一份，edit-md 自己的硬依赖）；
 *   · 它们与这里的**取值一致性由断言钉住**（`tests/file-exts.mjs` 逐条比对两侧取值），
 *     任何一侧漂了立刻变红 —— 这才是"防漂移"落地的形式，而不是靠人记得同步。
 *
 * ## 故意不做的（**判不了的一律保持现状，不替主子决定**）
 *
 * | 项 | 为什么不做 |
 * |---|---|
 * | `.env` 进全文索引 / 快照 / RAG | 它是配置与密钥载体。迁前 fulltext/versions **没有**它（rag 也没有），本批**保持现状**：只放进【预览】。要不要进索引属安全策略，须主子点头 |
 * | `.jsonl` / `.tsv` / `.ipynb` 进向量化 | 迁前 `svc-rag` **没有**这三个（`.ipynb` 是 JSON、`.jsonl` 是逐行 JSON、`.tsv` 是表格）。本批**保持现状**，不扩权 |
 * | `.eml` / `.avif` / `.tiff` / 音视频 | `docs/reviews/11-…md` §3.3 建议补，但 `.avif` 的浏览器支持**本轮未实测**、音视频要另开前端形态 ⇒ 本批不做，留待专项 |
 * | **无扩展名文件**默认当文本 | **明确不做**：本文件只做「按扩展名分类」，不做二进制嗅探（NUL 字节检测）。理由是**没有任何既有触点**需要它（`listFiles` / `preview` / 索引 / 快照全按扩展名走），为它单独给每次预览加一次读字节的开销不划算；且"把二进制当文本读出乱码"比"打不开"更坏。将来真要做，应在 `readFileForPreview` 里做一次嗅探并把这些名字放进 `SNIFF_AS_TEXT`（**注意：无扩展名的名字不是扩展名**，不能塞进下面任何集合） |
 * | 新增扩展名一律进 `EDITABLE_TEXT_EXTS` | 本批只补【预览】。编辑要过 `text/save` 写接口、会造出可编辑入口（交互结构归主子定），不顺手扩 |
 *
 * ## Office 那一族的口径（**第二批收敛，2026-09-21**；`.xls`/`.ppt` 到底算不算，答案在这里）
 *
 * 迁前这一族有 **4 处同族副本**（上一批扫出来、只加了注释，没合并）：
 *
 * | 位置（迁前） | 取值 | 谁在用 |
 * |---|---|---|
 * | `privhub-svc-office/src/index.ts:22` | `doc docx xlsx pptx pdf` | `/api/office/read`、`/api/ai/office/read`、`/api/office/convert-doc` |
 * | `privhub-files-office/src/index.ts:11` | `docx xls xlsx pptx` | `/api/office-preview`（**SheetJS 真能读 `.xls`**） |
 * | `privhub-files-office/src/extract.mjs:11` | 同上（同值第二份） | 上者的实现体 |
 * | `privhub-files-office-ui/client/index.js:45` | `doc docx xlsx pptx pdf` | 「编辑」浮层的入口闸 |
 * | `explorer-v3/client/panel.js:173`（迁前） | `doc docx xls xlsx ppt xlsx` | `isOfficeFile`（**多 `xls`/`ppt`**） |
 * | `explorer-v3/client/ops.js:262`（迁前） | 上者 + `pdf` | 右键「编辑」分支（**多 `xls`/`ppt`**） |
 *
 * **最终口径（本批拍的，明写在这里）**：
 *
 * | 概念 | 取值 | 含义 |
 * |---|---|---|
 * | `OFFICE_EXTS` | `doc docx xlsx pptx pdf`（**5 项，不变**） | **Office 读取链真能读出来的那一批** —— `svc-office.read()` 对每一个都有一条能出正文的实现（`office-lib.mjs`），`convert-doc` 也只认 `.doc` |
 * | `OFFICE_FAMILY_EXTS` | 上者 **∪** `xls ppt`（**7 项**） | **界面上属 Office 家族**的那一批（`.xls`/`.ppt` 也是 Office 文件，用户会这么认） |
 *
 * **`.xls` / `.ppt` 判为「不在读取链里」，理由分开写**：
 *   · `.ppt`（PowerPoint 97 二进制）—— **全仓没有任何一处能读它**：`svc-office` 的 `readPptx` 只解 OOXML zip
 *     （`office-lib.mjs:106-130`），`files-office/extract.mjs:98` 的 `extractOffice()` 对 `ppt` 直接抛
 *     「不支持的 Office 类型」。生态里也没有可用的纯 JS 渲染器（见 `docs/reviews/11-…md` §3.4）。
 *   · `.xls`（BIFF）—— 项目**确实有**一个能读它的依赖（`xlsx` / SheetJS 在 `package.json` 里，
 *     `files-office/extract.mjs:96` 用 `XLSX.read` 读 `xls`）。但它接在 **`/api/office-preview`** 那条
 *     「提取成 Markdown」的链上，**不在** `svc-office.read()` 这条「服务层结构化读取」链上；
 *     而界面打开 `.xls` 走的是**后者**。⇒ **本批不把一条能力挪到另一条链上**（那会动 Office 读取链的分支），
 *     保持「谁声明谁负责」：`files-office` 继续只为 `office-preview` 认 `xls`。
 *   · ⇒ 于是**界面侧的清单回归读取链的取值**：`xls`/`ppt` 不再冒充「点右键就能编辑」的文件。
 *     迁前用户在 `.xls`/`.ppt` 上点「✏️ 编辑」会**静默无反应**（`ops.js` 的清单放行 → `office-ui` 的
 *     `openEditor` 又把它挡回去），现在**不进那个分支**（不留悬空入口）。要恢复，得先把 `svc-office.read()`
 *     里 `.xls`/`.ppt` 的实现补上 —— 那是**功能改动**，按纪律留给专项，此处不顺手扩。
 *
 * ## 可信度标记（沿用七路评审口径）
 * 本文件所有集合取值均为**【实体】**（逐行读源码得来），集合间关系为**【实证】**
 * （由 `tests/file-exts.mjs` 断言，可复跑）；"为什么这么派"里的行为描述属**【实体】**
 * （同上，见 §派生依据的行号锚点）。
 *
 * @module privhub-core/file-exts
 */

/* ══════════════════════════════════════════════════════════════════════════
 * 一、基础集合：**只在这里写一次**
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * 基础文本扩展名 —— 「这份字节本身是纯文本、可以按字符读」的**最宽集合**。
 *
 * 语义**只有一条**：按 UTF-8（失败回退 GBK）解码成字符串是有意义的。
 * 它**不表示**「要不要索引」「要不要向量化」「智能体能不能读写」—— 那些是各用途自己派生的子集。
 *
 * 迁前这一份的取值就是 `readFileForPreview` 里那个 `textExts`
 * （`privhub-core/src/index.ts:746`，迁前），本批**原样保留**并**追加**
 * `docs/reviews/11-格式支持矩阵与铺满修复.md` §2.3 实测出来的 A 类 11 条
 * （`.tsx .ps1 .conf .vue .go .rs .env .jsonl .tsv .markdown .ipynb`，
 *  该表的「无扩展名」按上面「故意不做的」明确不纳入）。
 */
export const TEXT_EXTS: readonly string[] = Object.freeze([
  'txt', 'md', 'markdown', 'json', 'jsonl', 'js', 'ts', 'tsx', 'html', 'htm', 'css', 'xml',
  'yaml', 'yml', 'toml', 'ini', 'conf', 'csv', 'tsv', 'log', 'sql',
  'py', 'java', 'c', 'cpp', 'go', 'rs', 'sh', 'bat', 'ps1', 'vue', 'ipynb', 'env',
])

/** 图片扩展名 —— 后端 `preview-raw` 的 mime 表、界面 `kindOf` 的『图片』分支共用同一份取值。 */
export const IMAGE_EXTS: readonly string[] = Object.freeze([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico',
])

/** Markdown 家族 —— 渲染器与分块策略按这个家族分流（`svc-rag` 的 `chunkText` 依赖它）。 */
export const MARKDOWN_EXTS: readonly string[] = Object.freeze(['md', 'markdown'])

/**
 * Office（含 PDF）—— **Office 读取链真能读出来的那一批**（5 项）。
 *
 * 语义**只有一条**：`privhub-svc-office` 的 `read()` 对每一个都有一条能出正文的实现
 * （`office-lib.mjs`：`doc`→word-extractor/Python 兜底、`docx`→mammoth、`xlsx`→exceljs、
 * `pptx`→jszip 解 slide XML、`pdf`→pdf-parse）。
 *
 * 消费方（迁前各写各的 4 处，本批全部改成读这一份）：
 *   · `privhub-svc-office/src/index.ts` —— 服务层判定 + `/api/office/read`；
 *   · `privhub-files-office/src/index.ts` 与 `src/extract.mjs` —— 提取链的入口闸与实现体；
 *   · `privhub-files-office-ui/client/index.js` —— 「编辑」浮层的入口闸（前端侧取 `EXT.OFFICE_EXTS` 投影）。
 *
 * ⚠ 只说「能读」**不说**「用户觉得它是 Office」：后者见 `OFFICE_FAMILY_EXTS`。
 * ⚠ `.xls` / `.ppt` **不在**这里 —— 理由（分开写、各有证据）见文件头「Office 那一族的口径」。
 */
export const OFFICE_EXTS: readonly string[] = Object.freeze(['doc', 'docx', 'xlsx', 'pptx', 'pdf'])

/* ══════════════════════════════════════════════════════════════════════════
 * 二、派生的**减项**：每组都要写清"减掉谁、为什么"
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * 界面**允许内嵌编辑**的文本扩展名（`explorer-v3/client/utils.js` 与 `edit-md/client/index.js` 的同一份取值）。
 *
 * **有意比 `TEXT_EXTS` 窄**，且**本批一字未扩**：
 *   · 去掉 `html` / `htm` —— 预览出的是源码而非渲染结果，给编辑入口会误导（既有选择，保留）；
 *   · 去掉本批新补的预览类（`tsx/ps1/conf/vue/go/rs/env/jsonl/tsv/ipynb`）——
 *     本批只补【预览】，不新增编辑入口（交互结构归主子定）；
 *   · **保留 `md`** —— `edit-md` 的 `openEditor()` 第一句就是这道闸，界面上多处 `entry:open`
 *     不带 `md` 的额外放行条件 ⇒ 拿掉会让「右键 .md 选编辑」点了没反应；`.markdown` **不在**里面，
 *     与迁前一致（`.markdown` 走文本渲染，不是 md 专用编辑链）。
 */
export const EDITABLE_TEXT_EXTS: readonly string[] = Object.freeze([
  'md', 'txt', 'json', 'csv', 'log', 'yaml', 'yml', 'ini', 'py', 'sh', 'bat', 'sql', 'xml', 'js', 'ts', 'css',
])

/**
 * 配置族（**有意排除在索引 / 快照 / 向量化之外**）—— 它是环境与密钥的载体，不是知识内容。
 *
 * 用途：`VERSION_TEXT_EXTS`（索引与快照）与 `m2.SNAPSHOT_EXTS`（智能体覆盖前快照）都要减掉它；
 * `PREVIEW_TEXT_EXTS` **不减**（用户自己点开看自己上传的配置文件，是合理的预览需求）。
 */
export const ENV_EXTS: readonly string[] = Object.freeze(['env'])

/**
 * 大数据/表格/笔记本类 —— **有意排除在向量化之外**。
 *
 * 为什么排除（迁前 `svc-rag` 的清单里就没有它们，本批保持现状）：
 *   · `jsonl` / `tsv` —— 逐行记录与表格，切块后语义稀碎，问答召回质量反而下降；
 *   · `ipynb` —— 是 JSON 结构体，正文散在 `cells[].source` 里，直接按文本切块会把元数据一起向量化。
 * ⇒ 这三类要不要进 RAG 属**产品判断**，本批**不替主子决定**（见文件头「故意不做的」）。
 */
export const RAG_EXCLUDED_EXTS: readonly string[] = Object.freeze(['jsonl', 'tsv', 'ipynb'])

/**
 * 本批**只为「预览」新增**的扩展名（矩阵里"纯文本却打不开"的那批）。
 *
 * 单独列成一份常量，是为了让断言能**直接对着"本批该补的清单"考**：
 * `tests/preview-limits.mjs` 从这个常量生成探针，逐个验「现在真能打开」。
 * 它必须满足：**每一个都同时在 `TEXT_EXTS` 里**（否则就是"补了却没生效"）。
 */
export const PREVIEW_ONLY_TEXT_EXTS: readonly string[] = Object.freeze([
  'tsx', 'ps1', 'conf', 'vue', 'go', 'rs', 'env', 'jsonl', 'tsv', 'markdown', 'ipynb',
])

/** 用户手工维护的敏感文件后缀（**带点**，`files-agent` 既有清单；本文件只用它做减法）。 */
export const SENSITIVE_EXTS: readonly string[] = Object.freeze([
  '.key', '.pem', '.p12', '.pfx', '.crt', '.env', '.git-credentials', '.htpasswd',
])

/* ══════════════════════════════════════════════════════════════════════════
 * 三、集合工具（纯函数，不碰文件系统）
 * ══════════════════════════════════════════════════════════════════════════ */

/** 归一化扩展名：去前导点、转小写。`'.MD'` / `'md'` / `'md'` 都得到 `'md'`。 */
export function normExt(ext: string): string {
  return String(ext ?? '').trim().replace(/^\.+/, '').toLowerCase()
}

/** 从 `name` 取归一化扩展名；**无扩展名返回空串**（空串不属于任何集合 ⇒ 一律不被当成文本）。 */
export function extOfName(name: string): string {
  const s = String(name ?? '')
  const i = s.lastIndexOf('.')
  // 前导点是隐藏文件（`.env` 这种 `.` 开头的名字里，最后一个点可能就在首位）
  if (i <= 0 || i === s.length - 1) return ''
  return normExt(s.slice(i + 1))
}

/** 差集（保序，去重），并断言"减掉的东西确实在里面"——**减错名字会当场抛**而不是静默少一项。 */
export function minus(source: readonly string[], remove: readonly string[]): string[] {
  const drop = new Set(remove.map(normExt))
  for (const r of drop) {
    if (r !== '' && !source.map(normExt).includes(r)) {
      // 这不是"少一项"，而是**写成另一个名字了**（漂移的典型症状），必须炸出来
      throw new Error(`file-exts: 要从 ${source.length} 项里减掉 '${r}'，但源集合里没有它`)
    }
  }
  const seen = new Set<string>()
  const out: string[] = []
  for (const s of source) {
    const n = normExt(s)
    if (drop.has(n) || seen.has(n)) continue
    seen.add(n)
    out.push(n)
  }
  return out
}

/** 并集（保序，去重）。 */
export function union(...lists: ReadonlyArray<readonly string[]>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const list of lists) {
    for (const s of list) {
      const n = normExt(s)
      if (n === '' || seen.has(n)) continue
      seen.add(n)
      out.push(n)
    }
  }
  return out
}

/* ══════════════════════════════════════════════════════════════════════════
 * 四、逐用途派生（**每个用途只读自己那一条**，不要跨用途借用）
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * 【预览】能不能当文本预览 —— 最宽的一份。
 *
 * 派生式：`TEXT_EXTS ∪ EDITABLE_TEXT_EXTS`（可编辑的一律可预览，并集保证"不会出现
 * 『能编辑却打不开』"这种自相矛盾的状态）。
 *
 * 消费方：`privhub-core/src/index.ts` 的 `readFileForPreview`。
 */
export const PREVIEW_TEXT_EXTS: readonly string[] = Object.freeze(union(TEXT_EXTS, EDITABLE_TEXT_EXTS))

/**
 * 【索引 / 版本快照】要不要进全文索引、要不要存版本快照。
 *
 * 派生式：`(TEXT_EXTS ∪ EDITABLE_TEXT_EXTS) − ENV_EXTS`
 *   —— 与预览同宽，**只减配置族**（密钥不该进索引与快照）。
 *
 * 消费方：`privhub-files-fulltext/src/index.ts`（全文索引）、
 *        `privhub-files-versions/src/index.ts`（版本快照）、
 *        `privhub-files-agent/src/m2.ts`（智能体覆盖前快照，**再减一次 ENV_EXTS**，见该文件）。
 */
export const VERSION_TEXT_EXTS: readonly string[] = Object.freeze(minus(PREVIEW_TEXT_EXTS, ENV_EXTS))

/**
 * 【向量化】要不要进 RAG。
 *
 * 派生式：`PREVIEW_TEXT_EXTS − (ENV_EXTS ∪ RAG_EXCLUDED_EXTS)`
 *   —— 比索引再窄一档（等价于 `VERSION_TEXT_EXTS − RAG_EXCLUDED_EXTS`），
 *      理由见 `RAG_EXCLUDED_EXTS` 的注释（**本批保持迁前范围**）。
 *
 * 消费方：`privhub-svc-rag/src/index.ts`。
 */
export const RAG_TEXT_EXTS: readonly string[] = Object.freeze(
  minus(PREVIEW_TEXT_EXTS, union(ENV_EXTS, RAG_EXCLUDED_EXTS)),
)

/**
 * 【Office 家族（界面识别）】= `OFFICE_EXTS ∪ {xls, ppt}`（7 项）。
 *
 * 语义：**用户会不会把它当 Office 文件**。与「读取链能不能读它」（`OFFICE_EXTS`）是**两个问题**，
 * 合成一个集合就是迁前 4 处副本互不一致的根因（前端两份多 `xls`/`ppt`、后端 `svc-office` 少它们）。
 *
 * 消费方：**本批没有 UI 消费方直接取它** —— `explorer-v3` 的 `kindOf`（`utils.js:92`）与
 * `ops.js:266` 的「✏️ 编辑」分支都只认 `OFFICE_EXTS`（理由：那条链点下去要真能读，
 * 见文件头「Office 那一族的口径」）。它是**口径的落点**：将来给 `.xls`/`.ppt` 单独做
 * 「只读提取预览」入口时从这里取，不要再手写一串；留着它也让断言能把
 * 「家族 ⊇ 读取链、差集恰好是 xls/ppt」这条关系说清楚。
 */
export const OFFICE_FAMILY_EXTS: readonly string[] = Object.freeze(union(OFFICE_EXTS, ['xls', 'ppt']))

/**
 * `files-office` 的**提取链**（`/api/office-preview`，产出 Markdown）比读取链多认的那一项：`xls`。
 *
 * 依据【实体】：`files-office/src/extract.mjs:96` 用 SheetJS 读 `xls`（`xlsx` 依赖在 `package.json` 里）。
 * **`.ppt` 不在里面** —— 全仓没有任何一处能读它（`extract.mjs:98` 对 `ppt` 直接抛错）。
 * ⚠ 它表示的仍是「提取链会读」，**不是**「读取链会读」；两者是两条不同的链，见文件头。
 */
export const OFFICE_EXTRACT_ONLY_EXTS: readonly string[] = Object.freeze(['xls'])

/** `SENSITIVE_EXTS` 去掉前导点后的纯扩展名形式（供"按扩展名做减法"使用）。 */
export const SENSITIVE_EXTS_BARE: readonly string[] = Object.freeze(
  SENSITIVE_EXTS.map(normExt).filter((s) => s !== ''),
)

/* ══════════════════════════════════════════════════════════════════════════
 * 四点五、仅供 `privhub-files-agent/src/m2.ts` 用的那一份（**语义独立，故单列**）
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * 智能体**覆盖写之前要不要做版本快照**（不做快照的走 `.bak-` 备份，这是既有的分级策略）。
 *
 * 派生式：**直接取 `EDITABLE_TEXT_EXTS`**（16 项，含 `md`）——理由：
 *   迁前那份 17 项手写清单里，只有 `html` 不在 `EDITABLE_TEXT_EXTS` 里；
 *   而智能体写的是**沙箱内的文件**，`html` 走 `.bak-` 备份而不是版本快照是既有行为，
 *   本批**保持原样不扩权**。⇒ 于是"这一份"就等于可编辑集，不再单独维护。
 * ⚠ 这份**不影响** `html`/`toml`/`java`/`c`/`cpp`/`htm` 的文本处理：它们在 `files-agent` 的
 * `TEXT_EXT` 里照旧算文本，只是覆盖时不走"版本快照"而走"`.bak-` 备份"。
 */
export const AGENT_SNAPSHOT_EXTS: readonly string[] = EDITABLE_TEXT_EXTS

/* ══════════════════════════════════════════════════════════════════════════
 * 五、判定入口（各处**统一走这里**，不要再自己写 `includes`）
 * ══════════════════════════════════════════════════════════════════════════ */

/** 是不是可预览的纯文本（无扩展名 / 不在集合里 ⇒ false）。 */
export function isPreviewTextExt(ext: string): boolean {
  return PREVIEW_TEXT_EXTS.includes(normExt(ext))
}

/** 是不是图片（前后端同一份取值 ⇒ `.ico` 不再出现"后端认图片、前端走 iframe"的分裂）。 */
export function isImageExt(ext: string): boolean {
  return IMAGE_EXTS.includes(normExt(ext))
}

/** 是不是 Markdown 家族。 */
export function isMarkdownExt(ext: string): boolean {
  return MARKDOWN_EXTS.includes(normExt(ext))
}

/** 是不是 **Office 读取链**认得的类型（`OFFICE_EXTS`，含 `pdf`）；`.xls`/`.ppt` ⇒ false。 */
export function isOfficeReadExt(ext: string): boolean {
  return OFFICE_EXTS.includes(normExt(ext))
}

/** 是不是 **Office 家族**（含 `.xls`/`.ppt`，界面识别用）；判定口径见 `OFFICE_FAMILY_EXTS`。 */
export function isOfficeFamilyExt(ext: string): boolean {
  return OFFICE_FAMILY_EXTS.includes(normExt(ext))
}

/** Office 读取链的 kind（`OFFICE_EXTS` 的成员，含 `pdf`）；不在其中 ⇒ `'unknown'`。
 *  ⚠ 与 `kindOfExt` 分工不同：`kindOfExt` 判的是「预览形态」（text/image/pdf/unknown），
 *  这个是「Office 读取链认不认」，`svc-office.read()` 用它。 */
export function officeKindOf(ext: string): string {
  const e = normExt(ext)
  return (OFFICE_EXTS as readonly string[]).includes(e) ? e : 'unknown'
}

/**
 * 统一分类 —— **语义与 `readFileForPreview` 返回的 `type` 一致**。
 *
 * 返回：`'text'` | `'image'` | `'pdf'` | `'unknown'`。
 * ⚠ 这里**没有** `'too-large'`：那是「体积」问题，不是「类型」问题，
 * 由 `readFileForPreview` 在读之前判（判定顺序有意义，见该函数注释）。
 *
 * ⚠ 也**没有**「无扩展名兜底成 text」：无扩展名 = `''` ⇒ 落到 `'unknown'`，
 * 与「明确不做二进制嗅探」这条决定一致（见文件头）。
 */
export function kindOfExt(ext: string): 'text' | 'image' | 'pdf' | 'unknown' {
  const e = normExt(ext)
  if (isImageExt(e)) return 'image'
  if (e === 'pdf') return 'pdf'
  if (isPreviewTextExt(e)) return 'text'
  return 'unknown'
}
