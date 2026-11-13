# 基线 · 环境（阶段 0-A，改动前实测）

> 采集时间：2026-11-12T15:48～16:40 (+08:00)
> 采集方式：全部为只读命令，未修改 `privhub/` 下任何源码/配置/测试，未执行任何 git 操作。
> 运行时上下文：当前工作目录 `G:\program\dsh-SQL\privhub-1`，Shell = Windows PowerShell 5.1 / cmd。

---

## 1. 运行时与工具链

| 项 | 实测值 | 来源命令 |
|---|---|---|
| Node | **v22.23.4** | `node -v` |
| Node 路径 | `C:\Users\Administrator\AppData\Roaming\CherryStudio\Toolchain\mise\installs\node\22.23.4\node.exe` | `(Get-Command node).Source` |
| npm | **10.9.9** | `npm -v` |
| npm 默认 registry | `https://registry.npmjs.org` | `npm config get registry` |
| 本仓库版本 | `privhub@3.5.0`（`privhub/package.json`） | — |
| typescript | **7.0.2**（`node_modules/typescript`） | 读 package.json |
| tsc 可执行 | `node_modules/.bin/tsc.cmd --version` → `Version 7.0.2` | — |
| tsx | **4.23.12**（`node_modules/tsx`） | 读 package.json |
| `privhub/node_modules` 顶层目录数 | **203**（不含 `.bin`） | `Get-ChildItem -Directory` |
| better-sqlite3 | 已装，走 `prebuilds/win32-x64.node`（`--ignore-scripts` 安装） | 存在性检查 |
| `node_modules/@deepseek-ai` | 存在（cordis 4.0.1 / schemastery 3.18.1） | — |

> 注：`npm config get registry` 仍是官方源。本次依赖安装由 lead 用
> `npm install --registry=https://registry.npmmirror.com --ignore-scripts` 完成，
> 未写入 `.npmrc`，故后续 `npm i` 仍会走官方源。这是**基线事实**，不是问题。

## 2. 主机

| 项 | 实测值 |
|---|---|
| OS | Microsoft Windows 11 专业版，10.0.26200 |
| CPU | 12th Gen Intel Core i5-12490F，6 核 / 12 逻辑处理器 |
| 内存 | 31.8 GB |
| G 盘可用 | **1,185,745,911,808 字节 ≈ 1104.5 GiB** |
| G 盘已用 | 2,815,023,460,352 字节 ≈ 2621.5 GiB |

## 3. 存储根解析结果（`privhub/src/store-paths.mjs`）

在 `privhub/` 下执行
`node -e "import('./src/store-paths.mjs').then(m=>console.log(JSON.stringify(m.storePaths,null,2)))"`
的**真实输出**：

```json
{
  "codeRoot": "G:\\program\\dsh-SQL\\privhub-1\\privhub",
  "configDir": "G:\\program\\dsh-SQL\\privhub-1\\privhub\\config",
  "configFile": "G:\\program\\dsh-SQL\\privhub-1\\privhub\\config\\store.json",
  "configLoaded": false,
  "fileConfig": {},
  "dataRoot": "G:\\program\\dsh-SQL\\privhub-1\\privhub",
  "dataFiles": "G:\\program\\dsh-SQL\\privhub-1\\privhub\\data-files",
  "dataFilesExplicit": false,
  "secretKey": "G:\\program\\dsh-SQL\\privhub-1\\privhub\\data\\secret.key",
  "strict": false
}
```

`describeStorePaths()` 原样输出：

```
[store] 代码根   : G:\program\dsh-SQL\privhub-1\privhub
[store] 系统数据 : G:\program\dsh-SQL\privhub-1\privhub\data（其下 secret.key / users / audit）
[store] 文件库   : G:\program\dsh-SQL\privhub-1\privhub\data-files（默认）
[store] 配置文件 : G:\program\dsh-SQL\privhub-1\privhub\config\store.json（不存在，使用环境变量/默认值）
[store] 严格模式 : 关（仅告警）
```

### 关键发现（对改造有影响，必须记录）

1. **本仓库（`privhub-1`）是一个没有数据的干净检出。**
   `privhub-1\privhub\data-files` 与 `privhub-1\privhub\data` **都不存在**；
   `privhub-1\privhub\config\store.json` **也不存在**。
   所以「当前库」在 `privhub-1` 里是**空**的，全部数据基线只能取自别处（见下条）。

2. **真实数据在另一份检出：`G:\program\dsh-SQL\privhub`**（注意没有 `-1`）。
   该目录下有 `data/`（2310 个文件 / 525.9 MiB）、`data-files/`（800 个文件 / 26.0 MiB）、
   `releases/`、`logs/`。**3180 端口当前跑的就是它**（PID 31364，
   `node --import tsx/esm src/main.ts --port 3180`）。
   它的 `config/store.json` 同样不存在，即走默认 `<codeRoot>/data-files`。

3. 因此 `baseline-scan.md` 里「当前库」的统计对象是 **`G:\program\dsh-SQL\privhub\data-files`**，
   已逐项标注来源，避免与 `privhub-1` 的空库混淆。读取全程只读，**未向 3180 发过任何请求**。

4. 环境里没有设置任何 `PRIVHUB_*` 环境变量（`cmd /c "set PRIVHUB"` → 「环境变量 PRIVHUB 未定义」），
   所以上面那次解析结果就是「零配置默认值」，是改造前后可对比的干净基线。

## 4. 端口占用（采集时快照）

| 端口 | 监听地址 | PID | 归属 |
|---|---|---|---|
| 3180 | `::`（全部） | 31364 | **生产/开发主数据，本次全程未触碰** |
| 3582 | 127.0.0.1 | 28372 | 另一次 `privhub-final-test` 检出实例（非本任务创建） |
| 3190 / 3191 / 3192 / 3193 / 3195 / 3196 / 3198 / 3199 / 3201 | — | — | 采集结束后**全部已释放**，无残留监听 |

> 本次只用过：3190（`run-all.mjs --spawn`）与 3201（`list-timing.mjs` 自带隔离实例）。
> 两个端口采集完成后均已释放。

## 5. 已知的环境层坑（供后续复现者）

- `Get-ChildItem env:` 会抛 `An item with the same key has already been added`
  （`NO_PROXY` 与 `no_proxy` 同名不同大小写），改用 `[System.Environment]::GetEnvironmentVariables()`。
- 本机 Node 带 `EnvHttpProxyAgent`（127.0.0.1:31181），每条命令都会往 stderr 打
  `[UNDICI-EHPA] Warning: EnvHttpProxyAgent is experimental`。**这是噪声，不是失败**，
  用 `2>&1 | Tee-Object` 抓日志时会混进正文，判读时需过滤。
- PowerShell 5.1 下 `cmd /c "..."` 里带 `$(...)` 会被 PowerShell 先解析，需转义或用单引号。
