# 设计与实施 — 私域枢纽（PrivHub）

用途：统一的设计蓝图与实施基准。涵盖架构、插件契约、后端接口、目录结构、施工步骤与验收标准。
配套：需求记录.md（功能基线）、插件工程规范.md（治理规则）、项目进度.md（状态追踪）。

## 一、设计总览

### 1.1 背景

当前系统存在四个核心问题：

- 前端非插件化：全部 UI 浓缩在 frontend/index.html 一个 50KB 单文件中，无法拆装；
- 前后端物理分离：同一功能的前端在 frontend/，后端在 plugins/，协作成本高；
- 承载方式脆弱：通过替换底座 dist 目录运行，不被底座原生识别；
- 布局过时：当前是"单层项目树+文件面板"，目标为"顶栏项目横排 → 点击进入项目工作区"的两层结构。

### 1.2 架构图

```text
DSH 底座（cordis + webServer）
│
├── privhub-shell          ← 页面骨架插件（顶栏横排项目 + 工作区 slot 容器）
│     ├── client/          （布局骨架，各 slot 占位）
│     └── server/          （项目列表/创建 API + manifest 聚合接口）
│
├── privhub-auth           ← 认证插件（登录/注册/会话）
├── privhub-admin          ← 权限管理插件（用户/角色/项目权限）
├── privhub-files          ← 文件管理插件（目录树、文件面板、预览条）
├── privhub-trash          ← 回收站插件（列表/恢复/彻底删除）
│
└── privhub-core           ← 共享服务（纯后端，持久化 + 权限判定）
```

关键设计决策：

- 每个业务插件自带 client/ + server/，前后端一体。
- 登录认证（auth）与权限管理（admin）拆为两个独立插件。
- 骨架 privhub-shell 提供 7 个 slot，各插件按 slot 挂载 UI 组件。

## 二、插件契约规范（统一规则）

### 2.1 目录结构

```text
plugins/privhub-<域>/
├── package.json          # cordis 插件声明（新增 client 入口字段）
├── cordis.patch.yml      # DSH 装配配置
├── server/
│   └── index.ts          # 后端路由注册（已完成）
└── client/
    ├── manifest.json     # { id, title, slot, entry }
    └── index.js          # 导出 { slot, component }（重构目标）
```

### 2.2 Slot 挂载点

| Slot | 位置 | 承载插件 |
| --- | --- | --- |
| auth | 全屏（未登录） | privhub-auth |
| project-tabs | 顶栏左侧 | 项目横排标签 + ➕（仅 admin） |
| user-area | 顶栏右侧 | 当前用户 / 主题 / 退出（admin 入口） |
| app-iconbar | 工作区左侧窄条 | 功能图标（文件/搜索/回收站/设置） |
| tree | 工作区左侧面板 | 目录树 |
| panel | 工作区中间 | 文件面板 |
| preview | 工作区右侧可伸缩条 | 预览条 |

### 2.3 前端加载机制

- 沿用全局 Vue（vue.global.prod.js）+ 浏览器原生 import() 动态加载。
- 每个插件 client/index.js 为独立 ESM，导出 { slot, component }。
- 骨架启动时调用 privhub-shell 服务端的 manifest 聚合接口，按 slot 逐一加载。
- 可插拔：任一插件 manifest 缺失，对应 slot 不渲染，其余功能不受影响。

## 三、后端接口与目录结构（实施现状）

### 3.1 接口明细（22 个，全部完成）

| 接口 | 用途 | 权限 |
| --- | --- | --- |
| POST /api/login | 登录（scrypt + 防爆破） | 公开 |
| POST /api/register | 注册（默认普通用户，仅"公共"项目） | 公开 |
| GET /api/me | 当前用户 + 可见项目 | 登录 |
| GET /api/projects | 项目列表（按权限过滤） | 登录 |
| GET /api/list | 列目录（project + path） | 登录 + 项目权限 |
| GET /api/preview | 预览元信息（文本/图片/PDF） | 登录 + 项目权限 |
| GET /api/preview-raw | 原始字节流（img/iframe 直载） | 登录 + 项目权限 |
| POST /api/project-create | 新建项目 | 管理员 |
| POST /api/project-delete | 删除项目（软删除进回收站） | 管理员 |
| POST /api/mkdir | 新建文件夹（支持子路径） | 登录 + 项目权限 |
| POST /api/delete | 软删除（移入回收站） | 登录 + 项目权限 |
| POST /api/upload | 上传（raw body，≤2GB，同名覆盖） | 登录 + 项目权限 |
| POST /api/rename | 重命名 | 登录 + 项目权限 |
| GET /api/trash-list | 回收站列表（普通用户仅自己的） | 登录 |
| POST /api/trash-restore | 恢复 | 登录 |
| POST /api/trash-purge | 彻底删除 | 登录 |
| POST /api/trash-clean | 清空 30 天前条目 | 管理员 |
| GET /api/admin/users | 用户列表 + 全部项目 | 管理员 |
| POST /api/admin/user-update | 改角色/项目权限/显示名 | 管理员 |
| POST /api/admin/user-delete | 删除用户（保护主管理员） | 管理员 |
| POST /api/admin/user-reset-password | 重置密码（强制会话失效） | 管理员 |
| POST /api/logout | 退出登录 | 登录 |

### 3.2 实际目录结构

```text
privhub/
├── engine/                  # 底座源码（复制 DSH）
├── privhub-app/             # 应用本体
│   ├── plugins/             # 5 个后端插件（core, auth, admin, files, trash）
│   ├── frontend/            # 旧单页前端（重构期间保留作回退）
│   └── data/                # users.json / sessions.json / trash.json
├── data-files/              # 文件存储根（项目文件夹：A项目/ B项目/ 公共/）
├── home/profiles/privhub/   # 独立 DSH_HOME
├── start.bat                # 启动脚本（在 engine/ 内执行）
└── 部署说明.md
```

### 3.3 当前实施状态（关键）

- ✅ 后端：5 个 cordis 插件拆分完成，22 个接口全部稳定，35/35 回归通过。
- ✅ 旧前端（frontend/index.html）：功能完整（登录、文件操作、回收站、用户管理），但布局为旧四区，不是目标两层布局。
- 🔄 正在执行：前端插件化重构，目标是将旧单页拆解到各插件 client/ 中，实现新两层布局。

## 四、施工步骤与验收标准

### 4.1 施工步骤（一次性全拆，每步可验证）

| 步骤 | 内容 | 产出 |
| --- | --- | --- |
| 1 | 契约定稿 | slot/manifest/client 机制固化 |
| 2 | 实现 privhub-shell 骨架 | 顶栏 + 工作区布局 + manifest 聚合接口 |
| 3 | 迁移 privhub-auth client | 登录/注册挂 auth slot |
| 4 | 迁移 privhub-admin client | 用户管理/项目管理挂顶栏入口 |
| 5 | 迁移 privhub-files client | 树/面板/预览挂工作区 |
| 6 | 迁移 privhub-trash client | 回收站挂工作区图标栏 |
| 7 | 删除旧 frontend/index.html | 回归 5 套 smoke 脚本 + 新用例 |

旧单页在步骤 7 前始终保留，作为回退基线。

### 4.2 验收标准

- □ 未登录 → auth slot 渲染登录/注册，登录后进入骨架。
- □ 顶栏：admin 横排全部项目 + ➕ hover 气泡可建项目；普通用户仅见授权项目，无 ➕。
- □ 点击项目进入工作区：图标栏 / 树 / 文件面板 / 预览条均正常渲染。
- □ 任一插件 manifest 移除 → 对应 slot 不渲染，其余功能不受影响。
- □ 现有 5 套 smoke 脚本全部通过。
- □ 开发 3180 / 生产 3181 两环境行为一致。
