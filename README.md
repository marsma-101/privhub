# 私域枢纽 PrivHub

#### 介绍
私域枢纽 PrivHub —— 局域网文件枢纽中心：基于纯 Cordis 底座 + 自研插件架构的文件管理系统。开箱即用、数据加密落盘、可私有化部署。

#### 软件架构
- **纯 Cordis 底座**：仅依赖 `@deepseek-ai/cordis`（约 240KB）+ `schemastery` + `tsx`，无重型框架，整个目录搬走即可运行。
- **三层插件架构**：
  - L1 六枢纽：core / auth / files / trash / admin / shell（manifest 聚合）
  - L2 能力 Service：storage / audit / acl / watermark / search / meta / collab / office
  - L3 功能插件：自动发现装配（装卸 = 增删 `plugins/` 目录，无需改代码）
- **自研 webServer**（node:http）：exact 路由 + 静态前端 + `/privhub-plugins/<名>/<文件>` 插件资源映射。
- **前端**：Vue 单页骨架 + manifest/slot 加载器，纯前端插件即建即用。

#### 安装教程

1. 环境要求：Node.js 18+，无需其它运行时。
2. 安装依赖：`npm install`（还原 cordis / schemastery / tsx 等运行时包）。
3. 启动开发环境：双击 `start.bat`，访问 http://127.0.0.1:3180
4. 生产环境：`start.bat 3181`，访问 http://127.0.0.1:3181

#### 使用说明

1. 首次启动自动生成默认账号：`admin` / `admin123`（登录后请立即修改密码）。
2. 所有数据（用户文件 + 系统数据 + 审计）以 AES-256-GCM 加密落盘；密钥 `data/secret.key` 必须随数据一起备份，丢失密钥 = 数据无法恢复。
3. 完整部署、迁移与插件开发说明见 [`privhub/部署说明.md`](privhub/部署说明.md)。

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
