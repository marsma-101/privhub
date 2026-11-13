# 基线 · 测试与类型检查（改动前实测）

> 采集时间：2026-11-12T16:0x～16:4x (+08:00)
> 命令：`npm run typecheck` 与 `node tests/run-all.mjs --spawn`（均在 `privhub/` 下执行）
> 原始日志：`docs/baseline/_typecheck.log`、`docs/baseline/_run-all.log`
> 全程只在 3190 起的隔离实例上跑，**未触碰 3180/3181**。

---

## 一、`npm run typecheck`（`tsc --noEmit`）

**退出码：1（失败）** — 14 条 error，分布在 7 个文件。

```
$ npm run typecheck
> privhub@3.5.0 typecheck
> tsc --noEmit
exit=1
```

| 文件 | 条数 | 代表错误码 |
|---|---:|---|
| `plugins/privhub-svc-model/src/index.ts` | 7 | TS2739 × 7（缺 `llm`/`embedding`） |
| `plugins/privhub-files-refcheck/src/index.ts` | 2 | TS2739 × 2（`User` 缺 `password`/`displayName`） |
| `plugins/privhub-files-lock/src/index.ts` | 1 | TS2739（缺 `password`/`displayName`/`projects`） |
| `plugins/privhub-files/src/index.ts` | 1 | TS2741（`{username}` 缺 `role`） |
| `plugins/privhub-task-board/src/index.ts` | 1 | TS2769（事件名不在 `keyof Events`） |
| `plugins/privhub-webhook/src/index.ts` | 1 | TS2345（`Promise<void|DeliveryRecord>` vs `Promise<void>`） |
| `plugins/privhub-files-office2/src/index.ts` | 1 | **TS2307 `Cannot find module 'html-to-docx'`** |

**分类判定：全部 14 条均为「既有失败」，与 `privhub-1` 本次改造无关。**

依据：
- 依赖**确已装齐**（`node_modules` 203 个顶层包，`tsc`/`tsx`/`better-sqlite3` 均就位，`tsc --version` = 7.0.2），
  所以**不是「依赖未就绪」**。
- 13 条是**类型声明与实现不同步**（旧 `UserRecord`/`ModelConfig` 形状 vs 新调用点），
  属长期存在的类型债；它们不影响运行时（项目无构建步骤，`tsx` 直接跑，类型不参与执行）。
- 唯一依赖类的那条 `html-to-docx`（见下）是**根 `package.json` 未声明该依赖**导致的，
  修它需要改 `package.json`，**本次严禁**，故如实记录为既有缺陷。

> ✅ 结论：**改造前的 typecheck 基线就是 `14 errors / exit 1`**。
> 改造后对比时应以此为参照，只有**条数变多或出现新文件**才算回归。

### 1.1 关于 `html-to-docx`（lead 已确认的既有基线缺陷）

- 报错：`plugins/privhub-files-office2/src/index.ts(23,24): error TS2307: Cannot find module 'html-to-docx'`
- 根因：该依赖写在 `plugins/privhub-files-office2/package.json` 里，
  而根 `privhub/package.json` 未包含它，仓库也不是 npm workspace ⇒ **根安装永远装不到它**。
- 运行时表现（实测，见 `_run-all.log` L14）：
  ```
  [server:err] [assembly] 插件加载失败: privhub-files-office2 → Cannot find package 'html-to-docx'
  ```
  **其余 35 个内建插件正常加载**。
- 处置：**记为既有基线缺陷，与本次改造无关。未做任何修复，未改任何 package.json。**

## 二、`node tests/run-all.mjs --spawn` 全量回归

**服务端**：`[run-all] 启动隔离测试实例：root=...\privhub\tests\.testroot port=3190`，就绪正常。
**进程退出码**：`1`（因下列 5 条断言失败）。

### 2.1 汇总统计（逐套件）

| # | 套件 | 通过 | 失败 | 小计 |
|---:|---|---:|---:|---:|
| 1 | HTTP 套件批次（首屏/冒烟/安全/加固/个人空间/看板/…/管家，24 个 suite） | 347 | 0 | 347 |
| 2 | 前端模板回归（frontend-templates） | 31 | 0 | 31 |
| 3 | 管理控制台回归（admin-console） | 76 | 0 | 76 |
| 4 | 个人空间界面回归（personal-ui） | 373 | 0 | 373 |
| 5 | 审计可靠性（audit-reliability） | 16 | 0 | 16 |
| 6 | **交付完整性（integrity）** | **238** | **1** | 239 |
| 7 | 首次部署回归（first-run） | 4 | 0 | 4 |
| 8 | 存储根配置 / 密钥安全（store-config） | 41 | 0 | 41 |
| 9 | A 批修复断言（rag-resilience） | 101 | 0 | 101 |
| 10 | 模型回包解析（model-parsing） | 81 | 0 | 81 |
| 11 | 系统数据迁移（storage-migration） | 42 | 0 | 42 |
| 12 | **JSON 损坏防护（json-corruption）** | **77** | **2** | 79 |
| 13 | **并发写串行化（write-serialization）** | **24** | **1** | 25 |
| 14 | 预览体积上限（preview-limits） | 60 | 0 | 60 |
| 15 | 扩展名收敛与补齐（file-exts） | 87 | 0 | 87 |
| 16 | 音视频预览 / Range（media-preview） | 34 | 0 | 34 |
| 17 | .doc 报错 + Office 族收敛（office-doc） | 94 | 0 | 94 |
| 18 | 知识图谱布局（kg-layout） | 53 | 0 | 53 |
| 19 | 左栏两级导航（iconbar） | 45 | 0 | 45 |
| 20 | 标题碰撞（title-collision） | 21 | 0 | 21 |
| 21 | MCP 协议（mcp-protocol） | 7 | 0 | 7 |
| 22 | 思维导图（mindmap） | 233 | 0 | 233 |
| 23 | **运行时契约（runtime-contract）** | **169** | **1** | 170 |
| 24 | HTTP 更新源（update-source） | 25 | 0 | 25 |
| **合计** | **24 个汇总块** | **2279** | **5** | **2284** |

> 另有 2 个脚本自带汇总行（`link-parsing：通过 77 / 失败 0`、`dup-upload：通过 40 / 失败 0`），
> 它们的「✅」行已包含在 `link-parsing.mjs` / `dup-upload.mjs` 自身输出里，
> 未重复计入上表的 24 个汇总块。**合计口径：2279 通过 / 5 失败 / 共 2284 条断言。**

### 2.2 五条失败的逐条定性

| # | 断言原文 | 出处 | 定性 | 理由 |
|---:|---|---|---|---|
| 1 | `部署包目录不存在：G:\program\dsh-SQL\privhub-1\deploy\privhub-deploy` | integrity.mjs L50 | **既有失败（环境）** | `deploy/` 被 `.gitignore` 忽略（构建产物），本检出从未跑过 `scripts/build-deploy.ps1`。改造前就必然红。 |
| 2 | `启动期没有任何插件加载失败（实测 stderr 含失败）` | json-corruption.mjs L1909 | **既有失败** | 哨兵捕获到的 stderr 就是 `html-to-docx` 那一条（见 §1.1）。 |
| 3 | `重启后同样没有任何插件加载失败（stderr 哨兵覆盖两次启动）` | json-corruption.mjs L1959 | **既有失败** | 同上，同一个根因。 |
| 4 | `服务端 stderr 无插件加载失败` | write-serialization.mjs L2002 | **既有失败** | 同上，同一个根因。 |
| 5 | **`存在 update.json 时控制层随启动拉起更新守护`** | runtime-contract.mjs L97–98 | **既有失败（已知基线噪声）** | 见下 §2.3，**CRLF 与正则不匹配**，非功能缺陷。 |

> 表中 2/3/4 三条**全部是同一个根因**（`html-to-docx` 缺失）。
> 也就是说：**5 条失败里 4 条是"既有缺陷"，1 条是"测试自身的换行符陷阱"**，
> **没有任何一条指向本次改造要动的代码路径**。

### 2.3 「update.json 守护」这条基线噪声的根因（已实测证明）

断言（`tests/runtime-contract.mjs:97-98`）：

```js
ok(/function startUpdater\(/.test(control) && /await startControlServer\(\)\n  startUpdater\(\)/s.test(control),
  '存在 update.json 时控制层随启动拉起更新守护')
```

而 `runtime/control.mjs:1752-1753` 的真实内容是：

```js
  await startControlServer()
  startUpdater()
```

**功能是对的，正则里写的是 `\n`，文件用的是 CRLF（`\r\n`），所以匹配不上。**
实测证明（Node 直接读文件跑两个正则）：

```
CRLF present: true
regex match /...\n  startUpdater\(\)/      : false   ← 现有断言
regex match /...\r?\n  startUpdater\(\)/   : true    ← 改成 \r?\n 即通过
```

文件行尾实测：`CRLF=1920, bare_LF=0`（纯 CRLF，无混排）。

> ✅ **结论：这是 Windows 检出 + 纯 CRLF 造成的既有断言缺陷，不是功能回归。**
> **本次不改测试、不改源码**，仅如实标注为「基线噪声」。
> 改造后对比时，这条应**视为恒失败项排除**。

### 2.4 其它注意事项（非失败，但会影响复现判读）

1. **`[server:err] [storage] 已初始化新密钥`** —— 每条隔离实例首启都会打印，正常。
2. **`[server:err] [store-check] 警告：库根内未抽样到密文文件`** —— 测试根是新造的，正常。
3. **`[server:err] [shell] barItems 冲突：view "admin" 由 privhub-admin 与 privhub-admin-console 同时声明`**
   —— 既有告警，`admin-console` 覆盖 `admin`，属已知设计（不是失败）。
4. **`[webServer] 路由处理异常 POST /privhub/api/project-delete: EPERM rename ...`**
   —— link-id 套件收尾删测试项目时 Windows 偶发 EPERM（句柄未释放）。
   **该套件断言全绿**（347/0），仅 stderr 噪声；改造后若做扁平存储，这类 rename 事件会更频繁，值得留意。
5. **`[UNDICI-EHPA] Warning: EnvHttpProxyAgent is experimental`** —— 环境代理噪声，每条 Node 进程都有。
6. `preview-limits.mjs` 有一条 **`[跳过] 未找到 ≥1 MB 的真实 .md 样本书`**（不计入通过数），
   因为 `privhub-1` 下没有真实库；改造后若把库挂到 `privhub-1`，这条会从「跳过」变成「实测」。

### 2.5 复现命令

```powershell
cd G:\program\dsh-SQL\privhub-1\privhub
node tests/run-all.mjs --spawn *>&1 | Tee-Object docs\baseline\_run-all.log
echo "exit=$LASTEXITCODE"
```

## 三、给改造后的对比口径（重要）

| 指标 | 改动前基线 | 改造后判「回归」的条件 |
|---|---|---|
| `npm run typecheck` | **14 errors / exit 1** | 条数 > 14 或出现上表 7 文件之外的新文件 |
| `run-all.mjs --spawn` 断言总数 | **2284**（2279 通过 / 5 失败） | 总数下降（说明有断言被删/被跳过） |
| 已知失败项 | **5 条**（4 条同源于 `html-to-docx`，1 条 CRLF 断言缺陷） | 出现第 6 条，或前述 5 条**之外的**新失败 |
| 进程退出码 | **1** | 若改造后仍为 1 且失败集一致 ⇒ 无回归；**不能要求它变 0** |
