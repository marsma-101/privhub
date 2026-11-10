# 私域枢纽 PrivHub

> **作者声明**：本程序作者非程序员出身，所有代码均由 AI 生成，拉取使用请务必先进行安全审查与完善后再用于生产环境！

---

> ## 🚧 当前状态（2026-11-10）
>
> **`3.4.1` 是当前发布版本**（3.4.0 蓝绿热更新 + 3.4.1 上传链路修复），主线是**蓝绿热更新与自动更新**：自带官方 nginx、双槽切换、
> 旧页面版本门、发布包构建与自动更新器。单进程 `start.bat` 与蓝绿 `start-runtime.bat`
> 两种部署并存；蓝绿模式详见 [`privhub/runtime/README.md`](privhub/runtime/README.md)。
> **V4**（并入引擎 / 宿主机智能体系统，让主线从「只能看」变「能干活」）**仍推迟**。

#### 介绍
私域枢纽 PrivHub —— 局域网文件枢纽中心：基于纯 Cordis 底座 + 自研插件架构的文件管理系统。开箱即用、数据加密落盘、可私有化部署。

**当前版本 3.4.1** —— 版本变更逐条记录在 [`CHANGELOG.md`](CHANGELOG.md)；
「现在到哪了 / 接下来做什么」见 [`docs/PrivHub-开发状态与路线图.md`](docs/PrivHub-开发状态与路线图.md)。
**V3 / V4 版本划分与联动规划**（V3 = 文档中枢稳定版、V4 = V3 + 引擎挂载层，含回移机制）见
[`docs/PrivHub-V3稳定版与V4引擎版-规划-2026-10-15.md`](docs/PrivHub-V3稳定版与V4引擎版-规划-2026-10-15.md)（**方案待拍板**）。

#### 软件架构
- **纯 Cordis 底座**：核心框架仅依赖 `@deepseek-ai/cordis` + `schemastery` + `tsx`，无重型 Web 框架，整个目录搬走即可运行。
- **三层插件架构**（当前 **64 个插件目录**；另有 `_retired-v2/` 归档目录，以 `_` 前缀排除、不参与装配）：
  - L1 六枢纽：core / auth / files / trash / admin / shell
  - L2 能力 Service（14 个）：storage / events / audit / acl / watermark / search / meta / collab / lock / office / model / **links** / **dup** / **cap**
  - L3 功能插件：`CORE_PLUGINS` 清单外自动发现装配（装卸 = 增删 `plugins/` 目录，无需改代码）
  - 统计口径：55 个含 `src/index.ts`（其中 **40 个真正注册路由**）、40 个含前端、9 个无服务端装配（8 纯前端 + `shell` 服务端在 `server/index.ts`）
- **自研 webServer**（node:http）：exact 路由 + 静态前端 + `/privhub-plugins/<名>/<文件>` 插件资源映射。当前注册 **165 条后端路由**（统计口径：`.route('<路径>'` 调用数，注释中提及的 `svc.route()` 不计入），其中 **163 条分布于 40 个插件**，另 2 条运行时路由（`reload` / `activate`）在 `src/main.ts`。
- **蓝绿热更新（v3.4.0）**：`privhub/runtime/` 是**不随 release 更新的稳定层** —— 常驻控制层 + 官方 nginx + 双槽（127.0.0.1:3301/3302）。更新顺序为「新槽待命预热 → 冻结旧槽 → 排空在途写 → 重读共享状态 → 激活 → 切 nginx → 停旧槽」，失败自动解冻回滚；旧页面由版本 Cookie + 409 门拦住并弹「立即刷新」。数据根独立为 `PRIVHUB_DATA_ROOT`（蓝绿默认 `<privhub>/store/`）。
- **宿主机智能体管家**（①地基）：给"装在宿主机上的 AI 软件"一把**专用钥匙**（`type=butler`，仅本机回环、可随时吊销、按 `ai:<名>` 记审计），据此后端提供 `butler/status` 与 `butler/key` 两条只管家的路由；`privhub/mcp/` 下附**零依赖 MCP 转接器**（`privhub-mcp.mjs`）与一步接入脚本（`butler-setup.mjs`）。设计见 [`docs/PrivHub-宿主机智能体管家-MCP-方案-2026-10-13.md`](docs/PrivHub-宿主机智能体管家-MCP-方案-2026-10-13.md)。
- **前端**：Vue 单页骨架（`frontend/index.html` 单文件，无打包）+ manifest/slot 加载器，纯前端插件即建即用。骨架通过 `window.PrivHub`（骨架 26 个键 + 插件运行时追加）与插件通信。
- **管理控制台**（v3.1.0）：进入管理相关视图渲染统一外壳（顶部栏 + 左侧管理导航 + 内容区），管理路由走 `#/admin/...` hash（刷新保持位置），侧栏按管理员职责分四组；既有 `openAdmin` / `openAcl` / `openAudit` / `openSettings` / `openTags` / `openTemplate` 入口全部保留。实现见 `privhub/plugins/privhub-admin-console/client/`。

#### 核心概念：项目 / 个人空间 / 智能体沙箱

| 概念 | 位置 | 可见性 | 智能体权限 |
|---|---|---|---|
| **项目** | `data-files/<项目名>/` | 按账号授权（管理员可见全部项目） | **只读** |
| **个人空间** | `data-files/<真实姓名>/` | **仅本人**（管理员亦不可见，只有审计记录） | 读写（即智能体沙箱） |

- 个人空间在**注册时按真实姓名自动创建**，姓名全局唯一（冲突时用「姓名-部门」）；
  改名时文件夹同步改名，**旧名永久保留（退休）且不可再被注册**。
- 个人空间**不进查重 / 向量化 / 全文索引**，**系统永不自动删除**。
- 智能体的写入一律落到绑定的个人空间；写项目返回 `403 AGENT-4032`。
- 智能体接入界面（图标栏 **🔌 智能体接入**）用于签发/吊销 API 密钥，
  与网页登录**完全分离**：人用会话，智能体用 `X-Agent-Key`。
- **接入上手**：外部集成方（拿到 `pha_` 密钥的 AI / 自动化程序）请看
  [`docs/PrivHub-AgentAPI-接入指南.md`](docs/PrivHub-AgentAPI-接入指南.md)——
  一句话版：请求头带 `X-Agent-Key: pha_xxx`，端点前缀 `/privhub/api/agent/v1/`，
  自检用 `GET /privhub/api/agent/v1/me`。

> 完整的架构、插件全景、功能状态与安全模型见 [`docs/PrivHub-架构与功能说明.md`](docs/PrivHub-架构与功能说明.md)。

#### 依赖说明
`npm install` 会还原 **15 个运行时依赖**。除底座三件套外，主要为文档与检索能力引入：

| 类别 | 依赖 |
|---|---|
| 底座 | `@deepseek-ai/cordis`、`@deepseek-ai/schemastery`、`tsx` |
| Office / 文档 | `docx`、`exceljs`、`xlsx`、`pptxgenjs`、`mammoth`、`word-extractor`、`pdf-lib`、`pdf-parse`、`pdfkit`、`jszip` |
| 检索 / 存储 | `better-sqlite3`（原生模块）、`sqlite-vec`（向量检索） |

> 注意：`better-sqlite3` 为原生编译模块，需与 Node 版本匹配。本机实测运行环境为 **Node v24.21.0**。

#### 安装教程

1. 环境要求：Node.js 20+（实测 v24.21.0）；蓝绿模式另外需要 Windows + 官方 nginx（脚本自动下载）。
2. 安装依赖：在 `privhub/` 下执行 `npm install`（还原 cordis / schemastery / tsx / better-sqlite3 / office 文档库等）。
3. **单进程（开发 / 小规模）**：双击 `start.bat` → http://127.0.0.1:3180；生产用 `start.bat 3181`。
4. **蓝绿热更新（推荐生产）**：在 `privhub/` 下执行
   ```bat
   powershell -ExecutionPolicy Bypass -File scripts\fetch-nginx.ps1   REM 一次性，下载并校验官方 nginx
   node scripts\build-release.mjs                                     REM 构建 releases\<version>\
   start-runtime.bat                                                  REM 或 node runtime\control.mjs serve
   ```
   对外入口是 nginx（默认 3181），槽只在 `127.0.0.1:3301/3302`；更新用
   `node runtime\update.mjs apply`（或 `daemon` 自动检查），回滚用 `node runtime\control.mjs rollback`。

#### 使用说明

1. 首次启动自动生成默认账号：`admin` / `admin123`（登录后请立即在「⚙ 设置 → 登录密码」中修改）；另有示例普通账号 `user1` / `user123`。
2. 文件与系统数据以 AES-256-GCM 加密落盘（文件头 `PHENC1`）；密钥在单进程模式为 `privhub/data/secret.key`，
   蓝绿模式为 `<privhub>/store/data/secret.key`（或由 `PRIVHUB_SECRET` 提供）。**必须随数据一起备份，丢失密钥 = 数据无法恢复。**
   ⚠️ 例外：`comments.json`、`invites.json` 目前仍可能为**明文存储**（以启动日志列出的「明文落盘」清单为准；管理员可执行
   `POST /privhub/api/storage/migrate` 迁移）。
3. 完整部署、迁移与插件开发说明见 [`privhub/部署说明.md`](privhub/部署说明.md)（2026-11-10 已随 v3.4.0 现状同步）。

#### 现状提示（2026-11-10 复核）

- `privhub/` 为开发主目录（**64 个插件目录 / 55 个含后端 / 165 条后端路由**，2026-11-10 实测复核）；`deploy/` 下的历史部署包**落后于开发源码**，上线前必须重新构建。
  **同步生产必须经显式授权**；单进程包用 `scripts/build-deploy.ps1`，蓝绿 release 用 `privhub/scripts/build-release.mjs`，
  构建后用 `node tests/integrity.mjs --release` 做发布闸门校验。
- 回归测试：`cd privhub && node tests/run-all.mjs --spawn`（隔离实例，端口 3190，**不会触碰真实数据**）。
  v3.4.0 收口时点 **2098 项断言全部通过 / 0 失败**（含 89 项蓝绿运行时静态契约；逐批数字见 CHANGELOG）。
- 打包脚本 `privhub/scripts/build-release.mjs`（蓝绿 release，自包含 node_modules）与 `scripts/build-deploy.ps1`（单进程部署包）均可用。
- 改进事项：2026-09-11 的 42 项账本（6 项 P0 **已全部完成**并验收）保留在 [`docs/PrivHub-改进建议.md`](docs/PrivHub-改进建议.md) 作为历史依据；**当前未解决问题与后续开发方向以 [`docs/PrivHub-待改进清单-2026-09-21.md`](docs/PrivHub-待改进清单-2026-09-21.md) 为准**。
- 最近两轮只读评审：七角度交叉评审（[00-总览](docs/reviews/00-总览-七角度交叉结论.md)，2026-09-17）与黑盒交互测试（[`PrivHub-交互测试报告-2026-09-18.md`](docs/PrivHub-交互测试报告-2026-09-18.md)）。
- `data-files/.agents/` 存有早期测试残留（`user1/A项目/模板/` 三层空目录）。沙箱改用个人空间后已不再被使用，按「测试/示例数据保持原样」原则保留。

#### 参与贡献

1.  Fork 本仓库
2.  新建 Feat_xxx 分支
3.  提交代码
4.  新建 Pull Request


#### 特技

1.  使用 Readme\_XXX.md 来支持不同的语言，例如 Readme\_en.md, Readme\_zh.md
2.  主仓库已迁移至 GitHub：[https://github.com/marsma-101/privhub](https://github.com/marsma-101/privhub)（Gitee 暂停更新）
3.  GitHub 官方文档 [docs.github.com](https://docs.github.com)
4.  在 [https://github.com/explore](https://github.com/explore) 发现优秀开源项目
5.  按主题浏览仓库 [GitHub Topics](https://github.com/topics)
6.  GitHub Stars 展示优秀开发者 [https://github.com/stars](https://github.com/stars)
