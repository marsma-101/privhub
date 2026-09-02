# PrivHub — 项目架构与功能说明（V3 开发基础）

> 版本：V2 现状快照（2026-08-30）· **本文档为 V3 开发的基础文档**（docs/ 根目录，持续维护）
> 代码位置：`privhub/`（纯 Cordis 插件架构，零 DSH 依赖）· 测试：`tests/_archive/project-tests/`
> 开发环境 3180 · 生产环境 3181（`deploy/privhub-deploy/` 独立部署包）
> 历史文档归档：`docs/v2/`（V2 时代全部方案/计划/报告）· `docs/v1/`（最早归档）

---

## 一、项目定位

**私域枢纽（PrivHub）** — 公司内部文件管理系统：局域网内所有终端通过浏览器访问宿主机共享文件夹，实现文件浏览、上传、下载、管理与知识库能力。

- **底座**：`@deepseek-ai/cordis`（4.0.1）+ 自研 webServer，完全独立于 DSH，`node --import tsx/esm src/main.ts --port N` 启动
- **形态**：插件化分层架构（L1 六枢纽 → L2 能力 Service → L3 功能插件），前端 Vue3 全局构建（无打包），插件 client 经 manifest 动态挂载
- **宿主机**：Windows 低配原生环境

## 二、总体架构

### 2.1 分层与插件全景（33 个插件目录）

```
┌─────────────────────────────────────────────────────────────┐
│  L3 功能插件（F 系列，前端+后端可选）                          │
│  admin(用户管理) admin-acl(细粒度ACL) admin-audit-panel(审计UI) │
│  auth auth-watermark(水印)                                    │
│  files(核心文件API) files-edit-md(MD编辑) files-explorer(树+面板)│
│  files-export files-fulltext(全文) files-kg(图谱) files-preview │
│  files-search files-tags files-template files-upload(上传)     │
│  files-upload-queue files-wiki(知识库)                        │
│  shell(骨架) shell-favorites shell-recent shell-settings       │
│  shell-tabs(标签页) trash trash-ui                            │
├─────────────────────────────────────────────────────────────┤
│  L2 能力 Service（S 系列，挂载于 L1/L3 之前）                   │
│  svc-storage(S7 加密存储) svc-audit(S1 审计) svc-acl(S2 ACL)   │
│  svc-watermark(S3) svc-search(S4 搜索) svc-meta(S5 元数据)     │
│  svc-collab(S6 协同骨架)                                      │
├─────────────────────────────────────────────────────────────┤
│  L1 六枢纽 + 底座                                              │
│  core(用户/会话/文件核心) auth files trash admin shell          │
│  webServer（自研 HTTP + 静态资源 + 插件 manifest）              │
└─────────────────────────────────────────────────────────────┘
```

**挂载顺序（main.ts）**：webServer → L2（S7 storage 最先，其余依赖它）→ core → adminAcl（ACL 守卫包装 svc.route，必须在路由注册前）→ auth/files/trash/admin/shell → L3 功能插件 → listen

### 2.2 前端骨架（frontend/index.html，单文件 + Vue3 全局）

| 机制 | 说明 |
|---|---|
| `window.PrivHub` 桥 | api / AUTH / nav（导航状态机）/ bus（事件总线）/ barItems / badges / toast |
| slot 挂载 | 插件 client 导出 slots，骨架按 slot 渲染（auth/tree/panel/tabs/各视图/弹窗） |
| `nav.activeView` | **单一视图状态源**（⑤ 视图化，llm_wiki 范式）：files/trash/search/favorites/8 个功能面板 |
| 项目上下文 | 选项目后搜索/收藏/回收站均限定当前项目（服务端 visibleProjects 白名单兜底） |
| 持久化 | localStorage（token/主题/侧栏宽/抽屉宽）、sessionStorage（标签，按用户名分 key） |

### 2.3 数据与安全

- **S7 静态加密**：所有落盘数据 AES-256-GCM（文件头 `PHENC1` + iv + tag；审计块 `PHAUD1`），密钥 `data/secret.key`（32B）或环境变量 `PRIVHUB_SECRET`，宿主机无法直接读取明文
- **权限三层**：角色（admin/user）→ 项目范围（visibleProjects 白名单）→ 文件级 ACL（svc-acl 规则，view/upload/download/edit/delete）
- **全链路校验**：每个文件接口先 `canAccess` 再干活；ACL 守卫包装 `svc.route`（F14）
- **审计闭环**：写操作全部入审计（F13）→ 可视化面板（F15）+ CSV 导出，60 天保留

## 三、功能全景

### 3.1 文件管理（核心）
| 功能 | 说明 |
|---|---|
| 目录树 + 文件面板 | 可拖拽调宽/双击折叠；网格/列表视图；排序 |
| 上传/下载 | 拖拽 + 整文件夹递归；批量下载/移动/删除；进度队列 + 失败重试 |
| 文件预览 | 图片/文本/PDF（右侧栏） |
| 回收站 | 30 天保留 + 恢复/彻底删除/清空 + 项目上下文过滤 |
| 收藏/最近打开 | 按项目过滤 + 权限校验（越权 403） |
| 多标签页 | 上限 10，刷新恢复，**按用户名隔离**（防跨用户串项目） |
| 状态栏 | 「共 N 项 · 已选 M 项 · 合计大小」 |

### 3.2 知识库主线
| 功能 | 说明 |
|---|---|
| MD 在线编辑（F16） | frontmatter + 双链 + 版本历史（20 版）+ 冲突检测 |
| 全文搜索（F17） | BM25 + CJK bigram，snippet 高亮，**项目内检索** |
| 知识图谱（F18） | 双链+标签关联图，社区发现，点击节点定位文件 |
| 标签（F19）/ 模板（F20） | 打标筛选；会议记录/需求等模板 + 管理 |
| 导出（F21） | MD → HTML/PDF/Word |
| 知识库视图（F22） | README.md 渲染为 Wiki 页，双链可点击定位 |

### 3.3 管理能力
| 功能 | 说明 |
|---|---|
| 用户管理 | 增删改查/角色/项目权限/重置密码 |
| 细粒度 ACL | 文件/目录级规则（继承/覆盖），管理 UI |
| 审计面板 | 时间/操作/用户/项目四维筛选 + 实时刷新 + CSV |
| 系统设置 | 主题（浅/深）/默认视图/上传限制 |
| 数字水印 | 预览叠加用户名+时间，防截屏外泄 |

### 3.4 交互体验（V2 新增/重构）
| 项 | 说明 |
|---|---|
| 功能面板视图化 | 8 个功能面板 = main 全宽视图（llm_wiki 范式），单一 activeView，天然互斥无残留 |
| 项目选择栏 | 未选项目时左侧栏显示项目列表（选中后变目录树），主区保持干净 |
| 项目上下文贯穿 | 搜索/收藏/回收站限定当前项目；未选项目空态引导，杜绝跨项目混淆 |
| 顶栏项目下拉 | 项目多时不溢出；图标栏 toggle 开合 + 高亮跟随 |
| 原生对话框清零 | alert → toast；prompt → 骨架级内联输入模态 |

## 四、安全修复记录（近期重点）

| 漏洞 | 修复 |
|---|---|
| 回收站 restore/purge 越权（P1-1） | 条目归属校验（deletedBy）+ 项目权限 canAccess + ACL edit 裁决 |
| 收藏/最近跨项目展示 | GET 按 visibleProjects 过滤；POST canAccess 校验（403） |
| 标签跨用户串项目 | sessionStorage 按用户名分 key + 恢复时可见过滤 + 点击前置校验 |
| 搜索全局越权感 | API 始终带 project 参数；未选项目不做全局查询 |

## 五、文档索引

### docs/ 根（V3 开发基础，持续维护）
| 文档 | 内容 |
|---|---|
| `PrivHub-架构与功能说明.md`（本文） | 项目定位 / 分层架构 / 插件全景 / 功能全景 / 安全修复记录 |
| `PrivHub-需求文件.md` | 功能基线（四档：🟢🟠🟡⚪） |
| `PrivHub-插件架构（Cordis 原理重搭）.md` | 架构设计、F/S 编号、挂载规则 |
| `PrivHub-插件实现规则.md` | 插件工程规范 |

### docs/v2/（V2 历史归档）
| 文档 | 内容 |
|---|---|
| `生产计划表-阶段三-批次②.md` | F13–F22 + S6 里程碑（10 步全部 ✅） |
| `PrivHub-物理拆分映射表.md` | 物理目录 ↔ 逻辑功能映射 |
| `设计与实施 — 私域枢纽（PrivHub）.md` | 总体设计与实施 |
| `功能完成度盘点-2026-08-30.md` | 需求基线完成度对照 + 待办优先级 |
| `交互改进-项目选择与文件视图三栏化.md` / `项目上下文贯穿方案.md` | 交互改造方案（已实施） |
| `侧边栏优化方案-llm-wiki参考.md` / `侧边栏显示隐藏互斥逻辑.md` / `视觉升级计划-参照llm-wiki.md` | 布局/视觉方案（视觉升级待实施） |
| `生产审查报告-2026-08-28.md` | 审查修复记录 |
| `PrivHub-插件架构方案.md` 等 | 早期方案与学习笔记 |

## 六、验证与部署

```bash
# 开发
cd privhub
$env:PRIVHUB_ROOT='F:\program\dsh-SQL\privhub\'
node --import tsx/esm src/main.ts --port 3180

# 测试（全部在 tests/_archive/project-tests/）
node smoke-batch1.mjs        # 核心冒烟 30 项
node privhub-closedloop-test.mjs  # 闭环 34/34
node run-all.mjs             # 全量回归 26 套

# 部署包（独立运行）
deploy/privhub-deploy/  # robocopy 同步 privhub/{src,plugins,frontend}
node --import tsx/esm src/main.ts --port 3181
```

## 七、待办方向（V3 开发候选）

> V3 开发以此文档为基线：新增功能遵循插件架构（L2 Service / L3 插件 + manifest slot），改动遵循「插件内完成、事件总线解耦、服务端权限兜底」规则。

| 优先级 | 事项 |
|---|---|
| 1 | 视觉升级（参照 llm_wiki 配色/布局，方案已出：`docs/v2/视觉升级计划-参照llm-wiki.md`） |
| 2 | 键盘快捷键（P2-5） |
| 3 | 文件视图三栏化（中详情 + 右权限面板，方案已出：`docs/v2/交互改进-项目选择与文件视图三栏化.md`） |
| 4 | 长按菜单扩展 + copy API（P2-4） |
| 5 | 向量数据库/本地库（按项目隔离，项目上下文机制已就绪） |
