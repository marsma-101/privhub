# PrivHub 蓝绿运行时（runtime/）

本目录是**稳定层**：它不随业务 release 更新。升级业务代码时，本目录里的
`control.mjs`、`update.mjs`、`nginx.conf.template` 始终是同一份 —— 这是「切换失败还能
回滚」的前提，也是「更新程序自己不会在更新中途被换掉」的前提。

```
privhub/
├── runtime/                 ← 稳定层（入库，永不随 release 更新）
│   ├── control.mjs            常驻控制层：槽进程 / nginx / 切换 / 回滚 / 版本广播
│   ├── update.mjs             更新器：拉取 / 校验 / 放置 release / 触发切换
│   ├── nginx.conf.template    nginx 配置模板（控制层每次切换时渲染）
│   └── nginx/                 nginx 官方二进制（不入库；scripts/fetch-nginx.ps1 安装）
├── releases/<version>/      ← 业务 release（每个版本一个完整自包含目录）
│   ├── src/ plugins/ frontend/ ...    代码
│   └── node_modules/                   依赖（每个 release 自带）
├── config/                  ← 不入库
│   ├── runtime.json           端口 / 超时
│   ├── active.json            当前活跃版本（控制层原子写入）
│   ├── store.json             可选：存储根配置（dataRoot / dataFiles / secretKey / strict）
│   ├── control.token          控制接口令牌（首次自动生成，0600）
│   ├── update.json            更新器配置（可选）
│   ├── update-state.json      更新进度/最近检查结果（更新器写，管理界面读）
│   └── nginx.conf             控制层生成，不要手改
├── store/                   ← 共享数据根（data/ + data-files/ 都在这里）
├── logs/                    ← 不入库
└── tmp/nginx/               ← nginx 临时目录
```

`store/` 是**两个槽的唯一共享状态**。任何「进程内缓存」在切换时都必须能从
`store/` 重新读出来；否则两个槽会各持一份互不相同的状态。

## 数据根（重要）

| 变量 | 含义 | 默认 |
|---|---|---|
| `PRIVHUB_ROOT` | 该槽的**代码**根（release 目录） | 进程 cwd |
| `PRIVHUB_DATA_ROOT` | 共享**系统数据**根（`data/`：users/sessions/audit/trash/密钥） | 等于 `PRIVHUB_ROOT` |
| `PRIVHUB_DATA_FILES` | **文件库**根（项目 / 个人空间） | `<数据根>/data-files` |
| `PRIVHUB_SECRET_KEY_FILE` | 密钥文件位置 | `<数据根>/data/secret.key` |
| `PRIVHUB_STORE_STRICT` | `1` = 启动自检不通过就退出 | 关 |
| `PRIVHUB_HOST` | 槽监听地址（放在 nginx 后面时用 `127.0.0.1`） | 所有网卡 |

三根可以分别放在不同磁盘。优先级统一为：**环境变量 > `<home>/config/store.json` > 默认值**。
`store.json` 在 release 之外，更新/回滚不会覆盖：

```json
{ "dataRoot": "D:/privhub-data", "dataFiles": "E:/公司文件库", "secretKey": "D:/privhub-data/data/secret.key", "strict": true }
```

显式配置的 `dataFiles` 必须已存在，否则拒绝启动（`PRIVHUB_DATA_FILES_MISSING`）；
全新空库首次初始化才用 `PRIVHUB_ALLOW_INIT_DATA_FILES=1` 放行。

控制层启动槽时显式设置这些变量（未显式配置 `dataFiles` 时不传，以免被当成「显式根」），
并设置 `PRIVHUB_CONTROL_TOKEN`、`PRIVHUB_SLOT`、`PRIVHUB_STANDBY`。**不要**用 `start.bat`
直连模式跑蓝绿：直连模式只有一个进程，没有放空口、没有版本门、没有回滚。

旧布局兼容：若 `privhub/data/` 或 `privhub/data-files/` 已存在，而 `<home>/store/` 不存在，
控制层把 `<home>` 本身当作数据根（`detectStoreDir()`），因此从旧的单进程
部署迁移到蓝绿**不需要搬数据**。注意它只在**发现**上述目录时才这样推断；三者都不存在时
按首次运行创建 `<home>/store/` 并打印告警。第一次切换后建议把 `data/`、`data-files/` 移进
`store/` 并删掉旧目录，避免误以为是两个数据根。

### 首次启动自动沿用旧布局（REQ-6）

上面那段「不需要搬数据」在实际使用里还差一步：三根和端口仍要手工抄进 `store.json`，
抄错就等于新装一套空 store。现在首次以蓝绿 `serve` 时会自动做这件事：

| 条件 | 行为 |
|---|---|
| 已有 `config/store.json` | **不改动**（尊重人的决定） |
| 设了 `PRIVHUB_DATA_ROOT` / `PRIVHUB_DATA_FILES` / `PRIVHUB_STORE_DIR` | **不改动** |
| 已有 `<home>/store/` | **不改动**（已是蓝绿标准布局） |
| 有 `<home>/data/` 与 `<home>/data-files/` | 写 `{dataRoot:<home>, dataFiles:<home>/data-files}`，日志逐行说明 |
| 只有 `<home>/data/`、没有 `data-files/` | **不猜库根**，只提示去写 `store.json`（库可能在别的盘） |
| 什么都没有 | 按首次安装处理，创建 `<home>/store/` 并告警 |

先看「会沿用成什么」而不落盘：

```bat
node runtime\control.mjs adopt-legacy --dry-run
node runtime\control.mjs adopt-legacy            REM 真写入
```

对外端口也可一并沿用：设 `PRIVHUB_LEGACY_PORT=3180`，控制层会在没有 `runtime.json`
也没设 `PRIVHUB_PUBLIC_PORT` 时采纳它。

只读体检（不写盘、不建目录、不生成密钥）：

```bat
node scripts\verify-store.mjs          REM 在 <home>/ 或 release 目录下均可
node scripts\verify-store.mjs --json
```

## 启动

```bat
REM 1) 安装 nginx（只有一次；校验官方 SHA256）
powershell -ExecutionPolicy Bypass -File scripts\fetch-nginx.ps1

REM 2) 构建第一个 release（默认从当前源码构建到 releases\<version>）
node scripts\build-release.mjs

REM 3) 启动控制层（前台）
node runtime\control.mjs serve
```

对外入口是 `http://<本机IP>:3181`（nginx），槽只在 `127.0.0.1:3301/3302` 上监听。
`start-runtime.bat` 是同样的启动命令的便捷封装。

> **本地联调/隔离环境**：用 `PRIVHUB_PUBLIC_PORT` / `PRIVHUB_CONTROL_PORT` 覆盖对外与控制端口，
> 在 `config/runtime.json` 的 `slots` 里改槽端口（例如 3481 / 3480 / 3482 / 3483），
> 用 `PRIVHUB_STORE_DIR` 指向临时数据根——这样不会碰到 3181 上的真实数据。

常用命令：

```bat
node runtime\control.mjs status                  REM 当前版本/槽/端口/nginx 状态
node runtime\control.mjs switch --release <dir>  REM 切到指定 release 目录
node runtime\control.mjs switch --version 3.4.0  REM 切到 releases\ 下按版本号匹配的 release
node runtime\control.mjs rollback                REM 切回 active.json 记录的上一版本
node runtime\control.mjs render-config           REM 只生成 nginx.conf（不重载）
node runtime\control.mjs stop                    REM 停槽 + 停 nginx + 停控制层
```

控制接口只监听回环并强制 `x-privhub-control-token`（令牌在 `config/control.token`）。
唯一对 LAN 暴露的是 `/privhub/_version` 与 `/privhub/_version/stream`（由 nginx 反代），
它们只返回版本号、切换时间，不含路径等内部信息。

## 一次切换发生了什么

```
控制层                                   旧槽（服务中）              新槽（待命）
  │  1. ensureSlot(standby=true)  ─────────────────────────────────→ 启动 + 健康检查
  │     新槽不跑任何后台写任务（standby=1）
  │  1b. store-check(新槽)          ─────────────────────────────────→ 三根 + 抽样解密
  │      不通过 → 取消切换（旧槽继续服务，PRIVHUB_STORE_CHECK_FAILED）
  │  2. freeze(旧槽)               ──→ 停止接受/处理写，返回 drained
  │  3. 等待旧槽在途写请求排空
  │  4. reload(新槽)              ─────────────────────────────────→ 从 store/ 重读
  │      users/sessions/ACL/cap/meta/templates/links/dup/model
  │  5. activate(新槽)            ─────────────────────────────────→ 解除 standby，
  │      启动被延后的后台任务（回收站清理 / RAG 重建 / git 备份…）
  │  6. 原子写 active.json
  │  7. 渲染 nginx.conf → nginx -t → reload（切 upstream 到新槽端口）
  │  8. SSE 广播新版本（浏览器弹「请刷新」）
  │  9. 停旧槽（优雅 shutdown，超时 SIGTERM → taskkill）
```

**为什么先预热再冻结**：冷启动实测 12–100 s（`discoverL3()` 的串行 ESM/tsx 导入占大头）。
先让新槽在待命态把插件全部挂完，冻结窗口只剩「健康检查 + 排空 + 状态重读 + 激活」，
用户感知到的写不可用时间从「分钟级」降到「秒级」。

**为什么待命槽不能跑后台任务**：预热时旧槽还在写共享数据。回收站清理、RAG 重建、
git 备份、文件 Agent 的配额/限速落盘如果同时跑，两个进程会并发写同一批 JSON，
轻则覆盖，重则损坏。待命槽的所有周期任务都由 `ctx.privhub.onActivate()` 延后；
L2 服务（挂载早于 core）用 `runtime:activated` 事件解除待命。

**为什么激活前要 reload 内存态**：新槽启动时读到的 users/sessions/ACL 是「预热那一刻」的
快照；旧槽之后可能又改了它们。冻结旧槽后、激活新槽前从盘上重读，保证接管时看到的是
最终状态。该接口只在 standby 槽开放（`PRIVHUB_NOT_STANDBY`），防止误刷正在服务的进程。

**状态重读范围**：users、sessions、ACL、功能开关、元数据、模板、链接索引、查重索引、
模型配置。覆盖不到的进程内缓存必须保证「只读派生」或「带失效机制」，新增 L2/L3 服务
若有可写内存态，需要实现 `reload()` 并加进 `src/main.ts` 的重读清单。

## 能力协商与第一次升级

release 在自己 `package.json` 里声明：

```json
"privhub": { "runtimeCapabilities": ["freeze", "reload-state", "standby", "activate", "session-check", "store-check"] }
```

- 新 release 具备 `standby/reload-state/activate` → 走上面的「先预热」路径；
- 声明 `store-check` 的 release，切换前会先做存储自检；旧 release 没有该能力 → 跳过自检并告警
  （建议先升级到带自检的版本再切库根）；
- 旧 release（蓝绿架构之前）没有该字段 → 控制层回落到「先冻结、再启动新槽」，
  启动慢但不会并发写；
- 旧 release 的健康接口里没有 `capabilities: ["freeze", …]` → 控制层跳过冻结并打警告
  （它根本没有冻结端点）；首次迁移期间会短暂有双写风险，务必在低峰执行。
- 新 release 声称支持 standby 但健康接口回 `standby !== true` → 控制层拒绝预热并停掉
  该进程（`PRIVHUB_NO_STANDBY`），不会让一个「没延后后台任务」的进程接管。

## 前端版本门

1. nginx 在 `/index.html` 响应上原子写 `privhub_client_version=<该 HTML 所属版本>`
   （`Set-Cookie` 与 HTML 同一次响应，避免「旧 HTML + 新 Cookie」竞态）。
2. `frontend/index.html` 启动时先 `GET /privhub/_version`，比较 Cookie 版本与当前版本；
   不一致立即弹阻断层。
3. `EventSource('/privhub/_version/stream')` 订阅切换事件；切换完成即弹层，不等用户自己
   发现「操作失败」。
4. nginx 对「携带旧版本 Cookie 的非 GET/HEAD 请求」直接
   `409 {"code":"PRIVHUB_CLIENT_STALE"}`，前端 `api()` 也本地拒绝写请求（登录/注册/Agent
   豁免，避免旧页面无法重新登录的死锁）。上传/下载等原生 `fetch` 路径由全局 409 探测兜底。
5. 用户点「立即刷新」→ 重新取 HTML（新 Cookie）→ 正常使用。

直连模式（`npm run dev` / `start.bat`）没有控制层，`/privhub/_version` 由 Node 自己回
`managed:false`；前端不启用版本门，行为与以前一致。

## 更新器（update.mjs）

`runtime/update.mjs` 是骨架但可实际使用的更新流程：

```bat
node runtime\update.mjs check                 REM 只检查有没有新版本
node runtime\update.mjs apply                 REM 检查 + 放置 release + 切换
node runtime\update.mjs rollback              REM 回滚到上一版本（独立进程，不会被停掉的槽带走）
node runtime\update.mjs daemon                REM 每 N 分钟自动 check/apply（常驻，SIGINT/SIGTERM 退出）
node runtime\update.mjs prune                 REM 手动清理旧 release（保护当前/上一版本）
```

控制层启动时若发现 `config/update.json`（且 `enabled !== false`），会自动拉起
`update.mjs daemon`；停机时先停守护再停槽，避免更新器在停机过程中发起切换。也可手动运行。

配置 `config/update.json`：

```json
{
  "source": "http",
  "manifestUrl": "https://example.com/privhub/latest.json",
  "autoApply": false,
  "intervalMinutes": 360,
  "requireNewer": true,
  "keepReleases": 3
}
```

- `source`：`http` | `dir` | `git`。**纯使用版用 `http`**（机器上不需要 git、不需要源码）；
- `autoApply`：`false` 时守护只检查并写 `update-state.json`，由管理员在界面上点「立即更新」
  （企业内网推荐的默认姿势）；`true` 则发现新版本直接切换；
- `requireNewer`：默认只接受严格更高的版本；`keepReleases`：保留最近几个 release，
  当前版本与上一版本永不删除（回滚要用）。**文件必须是严格 JSON，不能写 `//` 注释。**

HTTP 清单（`latest.json`）格式，`build-release.mjs --package` 会自动生成：

```json
{
  "version": "3.6.0",
  "url": "privhub-3.6.0.zip",
  "sha256": "…",
  "size": 12345678,
  "notes": "本次更新内容…",
  "publishedAt": "2026-11-11T00:00:00.000Z"
}
```

- `url` 可以是相对地址，按清单地址解析（同在 GitHub Release / 静态目录即可）；
- 也接受 `{ "releases": [ … ] }` 或 `{ "latest": { … } }` 形式，取其中版本最高的一条；
- 清单**必须带 sha256**，下载后逐字节校验；确实没有时需显式 `"allowUnverified": true`。

或本地/共享目录（管理员把新 release 目录放到网络盘）：

```json
{ "source": "dir", "path": "\\\\nas\\privhub\\releases", "intervalMinutes": 60 }
```

更新器规则：

- 只用 Node 内置模块；不 import release 里的任何东西；
- 版本从 `package.json` 读；`requireNewer` 时只接受**严格更高**的版本；
- http 源：读清单 → 比版本 → 下载整包（边下边算 sha256）→ 比对清单 → 解包 → 识别应用根；
  解包用系统自带 `tar.exe`（Windows 10 1803+ / POSIX tar），不引第三方依赖；
- 暂存到 `<home>/tmp/update/<version>-<pid>`，校验 `src/main.ts`、`frontend/index.html`、
  `node_modules/tsx`，再原子改名进 `releases/<version>`；
- 切换只调用控制层 `/control/switch`，由控制层做预热/冻结/回滚；更新器从不直接停进程；
- 同一时间只允许一个更新（`tmp/update.lock`），失败自动清理暂存目录，活跃版本不变；
- 切换成功后才清理旧 release，只保留 `keepReleases`（默认 3）个，并**永不删除**
  `active.json` 里的当前版本与上一版本，保证 `rollback` 始终有目标；
- `dir` 源会复制整个 release 目录（含 node_modules）；`git`/`http` 源没有自带模块时，
  从当前活跃 release 复制 `node_modules`。**若 `package.json` 依赖或 `package-lock.json`
  有变化，更新器会拒绝自动切换（`PRIVHUB_DEPS_CHANGED`）** —— 发布端改用
  `build-release.mjs --package --with-modules` 打带依赖的整包即可。

## 管理界面：一键检查 / 更新 / 回滚

「管理控制台 → 系统运维 → 系统更新」页（插件 `privhub-update`）把上面的能力搬进浏览器：

- 显示当前版本、更新源、守护状态、最近一次检查结果与更新说明；
- 「检查更新」= `update.mjs check`（只读清单）；
- 「立即更新到 x.y.z」= 后台 `update.mjs apply`，页面轮询进度（下载 % / 解包 / 切换）；
- 「回滚到上一版」= 后台 `update.mjs rollback`（控制层立即返回，页面轮询进度）；
  不能由槽内同步调用：回滚会停掉当前槽，请求会把自己算作在途写而永远排不空；
- 更新源可在页面上直接改（保存后守护按新配置重启，不需要重启服务）。

该插件只是**代理**：它通过 `PRIVHUB_CONTROL_TOKEN` 调本机控制层，更新逻辑全部在稳定层。
所以业务 release 被整体替换时，更新能力不受影响。

## 纯使用版（分发给不写代码的人）

```bat
REM 1) 构建一个 release（产物自带 node_modules）
node scripts\build-release.mjs

REM 2) 打成使用版 zip（runtime + releases + 启动器 + 使用说明）
node scripts\build-standalone.mjs --manifest-url https://example.com/privhub/latest.json

REM 可选：把 Node 一起打进去，使用方机器无需预装
node scripts\build-standalone.mjs --with-node
```

产物在 `dist/privhub-<version>-standalone.zip`，解压后双击 `start-runtime.bat` 即可。
使用方式：

1. 管理员在开发机发布新版本：
   `node scripts\build-release.mjs --package --public-base https://example.com/privhub/`
   得到 `dist/privhub-<ver>.zip` + `dist/latest.json`，把两个文件一起上传到 Web 目录；
2. 使用版的守护按 `intervalMinutes` 检查清单，发现新版本在界面上提示；
3. 管理员点「立即更新」→ 下载 → 校验 → 待命槽预热 → 切换 → 页面提示刷新（旧版本继续服务）；
4. 出问题在同一页面点「回滚到上一版」。

`--public-base` 用来生成清单里的绝对 URL；如果清单与压缩包放在同一目录，留空即可（相对 URL）。
使用版打包时若不传 `--manifest-url`，首次登录后在「系统更新」页填一次并保存即可。

> 签名/校验骨架：当前以「控制层只接受本机 + 令牌」和「release 自校验」为主。若要跨不可信
> 网络分发，建议在 `update.json` 增加 `publicKey` + release manifest 的 Ed25519 签名，
> 由更新器在解包前验证。该字段已预留，但未启用前不要从不可信源更新。

## Windows 注意事项

- nginx 的 `pid`、日志、临时目录必须放在**普通磁盘路径**；某些沙箱/临时目录（如
  `C:\Users\...\jobs\...`）nginx 无法写，表现为启动即退出。
- 控制层用 `/runtime/shutdown` 做优雅停止；Windows 上 `child.kill('SIGTERM')` 是硬终止，
  不能靠它排空写入。任务管理器强杀后若端口仍被占用，用
  `taskkill /PID <pid> /T /F`，再 `node runtime\control.mjs status` 复核。
- 用 **Node 同一大版本**构建/运行所有 release：`better-sqlite3`/`sqlite-vec` 是原生模块，
  换 Node 大版本必须每个 release 重新 `npm ci`。

## 故障与回滚

- 切换在写 `active.json` 之前失败：解冻旧槽、恢复旧 nginx 配置、停掉新槽，旧版本继续服务。
- 切换在 nginx 重载后失败：控制层自动尝试回滚到上一版本；仍失败时 `active.json` 保留
  最后一次成功状态，用 `node runtime\control.mjs rollback` 人工恢复。
- 新槽启动崩溃：日志在 `logs/slot-<id>.log`，控制层错误信息会附日志尾部。
- `PRIVHUB_SLOT_STUCK`：进程无法结束，先人工终止再重试；不要直接删 `active.json`。
