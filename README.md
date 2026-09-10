# 私域枢纽 PrivHub

> **作者声明**：本程序作者非程序员出身，所有代码均由 AI 生成，拉取使用请务必先进行安全审查与完善后再用于生产环境！

#### 介绍
私域枢纽 PrivHub —— 局域网文件枢纽中心：基于纯 Cordis 底座 + 自研插件架构的文件管理系统。开箱即用、数据加密落盘、可私有化部署。

#### 软件架构
- **纯 Cordis 底座**：核心框架仅依赖 `@deepseek-ai/cordis` + `schemastery` + `tsx`，无重型 Web 框架，整个目录搬走即可运行。
- **三层插件架构**（当前 **48 个插件目录** = 43 含服务端 + 5 纯前端）：
  - L1 六枢纽：core / auth / files / trash / admin / shell
  - L2 能力 Service（10 个）：storage / events / audit / acl / watermark / search / meta / collab / office / model
  - L3 功能插件（32 个）：`CORE_PLUGINS` 清单外自动发现装配（装卸 = 增删 `plugins/` 目录，无需改代码）
- **自研 webServer**（node:http）：exact 路由 + 静态前端 + `/privhub-plugins/<名>/<文件>` 插件资源映射。当前注册 **108 条后端路由**，分布于 31 个插件。
- **前端**：Vue 单页骨架（`frontend/index.html` 单文件，无打包）+ manifest/slot 加载器，纯前端插件即建即用。骨架通过 `window.PrivHub`（28 个键）与插件通信。

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

1. 环境要求：Node.js 20+（实测 v24.21.0），无需其它运行时。
2. 安装依赖：`npm install`（还原 cordis / schemastery / tsx / better-sqlite3 / office 文档库等）。
3. 启动开发环境：双击 `start.bat`，访问 http://127.0.0.1:3180
4. 生产环境：`start.bat 3181`，访问 http://127.0.0.1:3181

#### 使用说明

1. 首次启动自动生成默认账号：`admin` / `admin123`（登录后请立即修改密码）；另有示例普通账号 `user1` / `user123`。
2. 文件与系统数据以 AES-256-GCM 加密落盘（文件头 `PHENC1`）；密钥 `data/secret.key` 必须随数据一起备份，丢失密钥 = 数据无法恢复。
   ⚠️ 例外：`settings.json`、`comments.json`、`publish.json`、`invites.json` 目前为**明文存储**（详见架构说明 2.4 节）。
3. 完整部署、迁移与插件开发说明见 [`privhub/部署说明.md`](privhub/部署说明.md)（该文档尚未随本次核对同步）。

#### 现状提示（2026-09-11 复核）

- `privhub/` 为开发主目录（48 个插件）；`deploy/privhub-deploy/` 为独立生产部署包，**当前落后于开发源码**（45 个插件、无 `svc-rag`、快照停在 09-02～09-05），上线前需重新同步。
- 旧文档引用的 `tests/_archive/project-tests/` 回归脚本与 `scripts/build-deploy.ps1` 在本工作区**不存在**。
- 改进事项清单（**42 项**，含 6 项 P0 必做）见 [`docs/PrivHub-改进建议.md`](docs/PrivHub-改进建议.md)；上一版清单已归档至 `docs/v2/`。

#### 参与贡献

1.  Fork 本仓库
2.  新建 Feat_xxx 分支
3.  提交代码
4.  新建 Pull Request


#### 特技

1.  使用 Readme\_XXX.md 来支持不同的语言，例如 Readme\_en.md, Readme\_zh.md
2.  Gitee 官方博客 [blog.gitee.com](https://blog.gitee.com)
3.  你可以 [https://gitee.com/explore](https://gitee.com/explore) 这个地址来了解 Gitee 上的优秀开源项目
4.  [GVP](https://gitee.com/gvp) 全称是 Gitee 最有价值开源项目，是综合评定出的优秀开源项目
5.  Gitee 官方提供的使用手册 [https://gitee.com/help](https://gitee.com/help)
6.  Gitee 封面人物是一档用来展示 Gitee 会员风采的栏目 [https://gitee.com/gitee-stars/](https://gitee.com/gitee-stars/)
