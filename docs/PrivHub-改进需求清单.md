# PrivHub 改进需求清单

> 用途：**转交开发执行的改进任务清单**。每条含现状/来源、改动方案、验收标准，开发按条目独立完成并勾选。
> 基线：本文档基于 2026-09-06 代码核对（V3 现状快照，见《PrivHub-架构与功能说明.md》）。
> 状态基线：《PrivHub-插件实现规则.md》为"当前状态"说明文档（已实现的现状）；本文档只列**未落地的改进事项**。
> 优先级：P0 = 立即（文档误导需先清）· P1 = 近期 · P2 = 排期。
> 分工：🟢 前端为主 · 🟠 后端为主 · 🟡 前后端协作。
> 完成标记：开发完成后将「状态」改为 ✅ 并在「完成记录」注明日期与 commit。

---

## 一、文档与代码一致性（P0 · 先做）

### D1 重写《PrivHub-插件实现规则.md》现状表
- **状态**：⬜
- **优先级**：P0 · 🟢
- **现状/来源**：该文档第 0/3/4 节大量插件现状仍标 🟡 待迁 / ⬜ 纯新增（B6/B7/B8/B9/B10/B11/B12、C14/C15/C17、ACL、审计面板、收藏/最近/设置、水印、智能体等），实际已全部落地于新插件（explorer-v3/agent/rag 等，全仓 45 个插件目录）。
- **改动方案**：
  1. 以 `privhub/plugins/` 实际目录为准，重写第 0 节"已验证的实现现状"表；
  2. 第 3/4 节各插件"现状"列改为 ✅（已实现），仅保留真正未做项（如多人协同、防病毒、引用图、检索引擎替换）标 ⬜；
  3. 同步 7 个 slot 挂载点描述（实际已扩展 trash-view/search-view/fav-view/settings/acl/audit/tags/template/kg/wiki/rag-view/md-editor/office-editor 等；rag-admin-view 已于 M2.5 随视图合并下线）。
- **验收标准**：文档无一处与 `plugins/` 目录现状冲突；待办项仅剩需求文件中明确列为"不做/后话"的条目。
- **完成记录**：

### D2 重新盘点功能完成度
- **状态**：⬜
- **优先级**：P0 · 🟢
- **现状/来源**：《功能完成度盘点-2026-08-30.md》停留在 08-30，C22 智能体、RAG、Office 编辑、txt 内嵌编辑、V3 布局等均已交付未入盘点；P2-4/P2-5 中长按菜单/复制副本已部分落地。
- **改动方案**：
  1. 生成《docs/v2/功能完成度盘点-2026-09-06.md》（历史归档不覆盖旧文件，新版本归档在 v2/）；
  2. 按《PrivHub-需求文件.md》四档逐项核对 ✅/🟠/🟡；
  3. 第二/三梯队新增项（RAG 全链路、Agent API、Office 编辑、邀请/版本/发布/批注/看板等）补入盘点。
- **验收标准**：新盘点与《PrivHub-需求文件.md》迭代记录逐条对应，无遗漏。
- **完成记录**：

### D3 同步《PrivHub-插件实现规则.md》前端通信总线契约
- **状态**：⬜
- **优先级**：P1 · 🟢
- **现状/来源**：该文档"前端通信总线"章节约定仅 `api/AUTH/logout`；实际 `window.PrivHub`（index.html#L688）已扩展 `THEME/nav/bus/barItems/badges/toast/fileIcon/previewImageUrl/openBarItem`。
- **改动方案**：更新文档契约表，列出全部桥接 API + 用途 + 示例调用。
- **验收标准**：文档桥接 API 清单与 `window.PrivHub = {...}` 赋值逐项一致。
- **完成记录**：

### D4 清理过时文件
- **状态**：⬜
- **优先级**：P2 · 🟢
- **现状/来源**：`privhub/frontend/legacy-单页.html`（已无引用）、`privhub/plugins/_retired-v2/`（已退役不参与装配，已确认可删）、`privhub/privhub-app/`（已弃用空目录）。
- **改动方案**：先 `git rm` 移入历史归档目录（建议 `_archive/` 而非直接删除，保留退路）；确认 `main.ts` / web-server 无引用后归档。
- **验收标准**：`rg` 全仓无 `legacy-单页|privhub-app|_retired-v2` 引用；启动无报错。
- **完成记录**：

---

## 二、前端改进（骨架与插件 client）

### F1 骨架视图分发声明式化（openBarItem）
- **状态**：⬜
- **优先级**：P1 · 🟢
- **现状/来源**：index.html#L705-717 `openBarItem` 用 `if/else` 链枚举 trash/search/favorites/admin/settings/acl/audit/tags/template/kg/wiki/rag 等视图名；新增一个功能面板视图必须改骨架。
- **改动方案**：`barItems` 的 `view` 字段直接作为 `nav.activeView`；骨架只做通用逻辑——`nav.activeView === v ? 回 'files' : nav.setActiveView(v)`。删去硬编码分支。
- **验收标准**：新增任意 `barItems.view` 无需改骨架代码即可打开对应视图；现有 12+ 视图入口回归通过。
- **完成记录**：

### F2 slot 渲染链声明式化
- **状态**：⬜
- **优先级**：P1 · 🟢
- **现状/来源**：index.html#L878-893 对每个功能面板视图写一条 `<component v-else-if>`（trash-view/search-view/fav-view/settings/acl/audit/tags/template/kg/wiki/rag-view/admin；rag-admin-view 已随 M2.5 视图合并下线）。
- **改动方案**：维护视图名→slot 名映射 `VIEW_SLOT = { trash:'trash-view', search:'search-view', favorites:'fav-view', settings:'settings', acl:'acl', audit:'audit', tags:'tags', template:'template', kg:'kg', wiki:'wiki', rag:'rag-view', admin:'admin' }`，模板改为动态渲染 `<component v-for="c in slotComps[VIEW_SLOT[nav.activeView]]">`；files 视图单独处理（tree/panel/tabs 组合）。
- **验收标准**：所有现有视图行为不变；新增视图只需加一条映射，不改模板。
- **完成记录**：

### F3 骨架 nav 职责拆分
- **状态**：⬜
- **优先级**：P2 · 🟢
- **现状/来源**：index.html#L394-647 `nav` 状态机约 250 行，同时承担文件导航 + 回收站 + 搜索 + 收藏 + 项目管理 + 管理员操作（newProject/doLogout 等）。
- **改动方案**：`nav` 收敛为导航核心（project/path/entries/activeView/sidebarWidth/输入模态）；回收站/搜索/收藏/管理状态与动作迁移到对应插件自有 store（参照 explorer-v3 的 `store` 模式）；保持 `window.PrivHub.nav` 公开 API 兼容（旧字段做 getter 代理或迁移期双写）。
- **验收标准**：骨架导航不再含具体业务方法；插件视图功能回归通过。
- **完成记录**：

### F4 explorer-v3 client 按模块拆分
- **状态**：⬜
- **优先级**：P2 · 🟢
- **现状/来源**：`privhub/plugins/privhub-files-explorer-v3/client/index.js` 1710 行单文件，树缓存/标签栏/内容渲染/详情面板/⋯菜单/移动选择器/行内重命名/lightbox 混杂。
- **改动方案**：拆分为多文件（建议 `client/` 下 tree.js / tabs.js / content.js / detail.js / contextmenu.js / move.js / util.js），保留 `manifest.json` entry 指向 `index.js` 聚合导出。
- **验收标准**：拆分后功能零回归（文件树/标签/编辑/预览/菜单/移动/重命名全通过）。
- **完成记录**：

### F5 键盘快捷键（P2-5 遗留）
- **状态**：⬜
- **优先级**：P1 · 🟢
- **现状/来源**：需求盘点 P2-5；现仅 txt/md 内嵌编辑实现 Ctrl+S，骨架无快捷键体系。
- **改动方案**：骨架级快捷键注册表 `nav.registerHotkey(combo, fn, scope)`（scope 限定编辑态/列表态）；实现 F2 重命名 / Delete 删除 / Ctrl+A 全选 / F5 刷新 / Enter 打开 / Backspace 返回上级 / Ctrl+F 搜索 / Ctrl+C·X·V 复制剪切粘贴；注册于 explorer-v3，编辑态自动让位。
- **验收标准**：列表态快捷键全部生效；编辑输入框内快捷键不冲突；卸载插件后快捷键清理。
- **完成记录**：

### F6 列表虚拟滚动（O4 遗留）
- **状态**：⬜
- **优先级**：P2 · 🟢
- **现状/来源**：盘点 O4——千级目录全量渲染 DOM。
- **改动方案**：先造千级目录实测基线（帧率/DOM 数）；若卡顿，explorer-v3 列表引入简单窗口化（可视区 ± 缓冲行渲染，行高固定估算）；树无需虚拟化（懒加载已有）。
- **验收标准**：3000 文件目录滚动流畅（>50fps），滚动条长度/位置正确。
- **完成记录**：

### F7 前端事件总线治理
- **状态**：⬜
- **优先级**：P1 · 🟡
- **现状/来源**：index.html#L376-389 `bus` 无声明/无审计；后端 svc-events 有 `declareEmit/declareListen`；且前端 `entry:open` 与后端 `file:opened` 命名并存（见 A1）。
- **改动方案**：前端 `bus` 加轻量 `declareEvent(name)` 注册表（emit 未声明告警、listen 未声明告警、无监听方 emit 提示）；事件名与后端契约表（A1 统一后）对齐。
- **验收标准**：所有 emit/listen 均在注册表中声明；`console` 无"未声明事件"告警。
- **完成记录**：

### F8 主题变量收敛
- **状态**：⬜
- **优先级**：P2 · 🟢
- **现状/来源**：explorer-v3 等在 client 内 `createElement('style')` 注入 CSS 并硬编码 `rgba(90,130,200,.15)` 等颜色（explorer-v3/client/index.js 样式注入段），未走骨架 CSS 变量，暗色主题观感不一致。
- **改动方案**：骨架补充公共语义变量（--accent-soft/--hover/--selected 等，明暗两套）；插件样式全部改引用变量；`rg` 全仓检查 `rgba(90,130,200` 残留清零。
- **验收标准**：明/暗主题下各插件选中/悬浮/高亮观感一致；无硬编码色值残留。
- **完成记录**：

---

## 三、后端改进（插件与服务层）

### B1 大插件按模块拆分
- **状态**：⬜
- **优先级**：P2 · 🟠
- **现状/来源**：行数统计——`privhub-files-agent/src/index.ts` 1254 行、`privhub-svc-rag` 3 文件 1911 行、`privhub-files-explorer-v3/client/index.js` 1710 行。
- **改动方案**：agent 已有 m2.ts 拆分先例，按 m2.ts 模式拆 rag（如 corpus.ts / discover.ts / search.ts / ask.ts / quota.ts）；explorer-v3 见 F4。
- **验收标准**：拆分后各文件 <800 行；回归测试全绿（agent 47/47 + m2 23/23、rag 全套）。
- **完成记录**：

### B2 插件装配去双源维护
- **状态**：⬜
- **优先级**：P1 · 🟠
- **现状/来源**：main.ts#L46-51 `CORE_PLUGINS` 手动清单 + L3 自动发现并存；svc-rag 不在清单被当 L3 自动装配（命名 svc- 前缀但装配层级错位）。
- **改动方案**：为 L1/L2 插件目录加统一层标记（建议 package.json 加 `"privhub": { "layer": "L1"|"L2" }`，或目录级 `layer.txt`）；main.ts 按层扫描自动装配（L1 手动顺序保证 → L2 → L3），删除 CORE_PLUGINS 常量。
- **验收标准**：新增/移除任意 L1/L2/L3 插件零改 main.ts；启动顺序日志清晰；svc-rag 按 L2 装配。
- **完成记录**：

### B3 web-server 路由与中间件扩展
- **状态**：⬜
- **优先级**：P2 · 🟠
- **现状/来源**：web-server.ts#L66-72 仅 `kind:'exact'`；body 解析/限流/统一错误响应各插件手写。
- **改动方案**：扩展 `kind:'prefix'/'param'` 路由 + 中间件链（authGuard / errorHandler / bodySizeLimit），`svc.route` 支持挂中间件；各插件逐步迁移复用。
- **验收标准**：新增路由可用参数化路径；错误响应格式统一；旧路由回归通过。
- **完成记录**：

### B4 cordis.patch.yml 清理
- **状态**：⬜
- **优先级**：P2 · 🟠
- **现状/来源**：盘点 O1——27 个插件仍带 `cordis.patch.yml`，但 main.ts 已改纯代码装配（09-05 装配改造），不再参与装配。
- **改动方案**：统一删除；或在文档注明"历史遗留，不参与装配"并加 `.gitignore` 忽略。推荐直接删除（git 历史可恢复）。
- **验收标准**：启动日志无 patch.yml 相关警告；`rg "patch.yml"` 全仓仅剩文档说明。
- **完成记录**：

### B5 回收站同名冲突提供覆盖选项
- **状态**：⬜
- **优先级**：P2 · 🟡
- **现状/来源**：盘点 O3——trash restore 同名直接 400，无覆盖/合并。
- **改动方案**：trash-restore 支持 `force: true`（覆盖）与 `rename: true`（自动改名恢复 `xxx (恢复)`）；前端冲突时给「覆盖/跳过/改名恢复」三选一。
- **验收标准**：三种冲突处理均可完成恢复；审计记录动作区分。
- **完成记录**：

### B6 ACL 空 role 自锁防护
- **状态**：⬜
- **优先级**：P2 · 🟠
- **现状/来源**：盘点 O2——admin-acl 规则可设空 role 自锁管理 UI。
- **改动方案**：后端校验禁止删除/修改 admin 对管理路由（admin/acl/audit）的 view 权限；前端规则编辑加警示文案。
- **验收标准**：无法通过 ACL 界面移除自身管理权限；已有危险规则启动时告警。
- **完成记录**：

---

## 四、逻辑架构与契约（跨端）

### A1 前端/后端事件命名统一
- **状态**：⬜
- **优先级**：P1 · 🟡
- **现状/来源**：代码核对——前端 `entry:open`（explorer-v3 openEntry，index.html#L540）与后端 `file:opened` 两套命名语义重叠。
- **改动方案**：统一事件表（建议全走 `file:opened`）；explorer-v3 改发 `file:opened`，edit-md/office/水印等监听对齐；同步 svc-events 注册表。
- **验收标准**：全仓 `rg "entry:open"` 清零；事件表单一；相关测试更新后全绿。
- **完成记录**：

### A2 API 契约文档化
- **状态**：⬜
- **优先级**：P1 · 🟢
- **现状/来源**：后端路由 40+（files 8 + agent 12 + rag 10 + office 等），无集中清单。
- **改动方案**：生成《docs/PrivHub-API-接口清单.md》：方法/路径/权限（adminOnly?）/审计标记/ACL 裁决动作/示例；可由脚本从各插件 `svc.route` 调用处扫描生成初稿。
- **验收标准**：文档覆盖全部 route；新增路由时清单可增量更新。
- **完成记录**：

### A3 ACL 守卫路由覆盖自查
- **状态**：⬜
- **优先级**：P2 · 🟠
- **现状/来源**：admin-acl 已覆盖 31 路由，但新插件（agent/comments/office2/publish 等）路由是否全部入守卫需定期核查。
- **改动方案**：守卫层提供 `routesWithNoAcl()` 调试接口（返回已注册但未被守卫包装的 route 路径）；配套测试断言"新增路由必须被守卫覆盖或显式豁免"。
- **验收标准**：`routesWithNoAcl()` 返回空（或显式豁免清单）；测试套件含该断言。
- **完成记录**：

### A4 多标签页上限确认
- **状态**：⬜
- **优先级**：P2 · 🟢
- **现状/来源**：需求文件 A3 ✅ 注明"文件级标签栏，除非关闭否则常驻"；但旧文档/盘点仍写"上限 10"，与 V3 常驻语义冲突。
- **改动方案**：与产品确认是否保留上限（建议：保留软上限 + 溢出滚动）；同步《PrivHub-需求文件.md》A3 行描述。
- **验收标准**：需求文件与实现一致；超限行为有明确定义（禁止打开/提示关闭/自动滚动）。
- **完成记录**：

---

## 五、功能补强（用户偏好，未落地）

### N1 苹果风格视觉统一（仅视觉层）
- **状态**：⬜
- **优先级**：P2 · 🟢
- **现状/来源**：用户偏好苹果风格观感（毛玻璃效果、圆角、配色等视觉层）；**功能按钮位置在左侧图标栏为既定要求，本项不改动交互布局**。
- **改动方案**：仅视觉层调整——图标栏/顶栏/按钮/面板采用毛玻璃（backdrop-blur）、圆角、柔和配色；不动功能入口位置与交互逻辑。
- **验收标准**：功能入口仍在左侧图标栏；视觉观感符合苹果风格；明/暗主题下均正常。
- **完成记录**：

### N2 窄版文字收起 + hover 气泡
- **状态**：⬜
- **优先级**：P2 · 🟢
- **现状/来源**：用户偏好——"窄版不显示文字介绍，宽版只显示名称，详细说明做成鼠标悬停的气泡弹框"。仅文本展示方式调整，不影响功能按钮位置。
- **改动方案**：按宽度断点（如 <640px）收敛常显文字为图标；详情一律 title/hover 气泡；涉及顶栏按钮/图标栏/工具栏。
- **验收标准**：窄版无文字溢出；hover 气泡内容完整。
- **完成记录**：

---

## 附：优先级汇总

| 优先级 | 条目 | 建议顺序 |
|---|---|---|
| P0 | D1、D2 | 先行（清文档误导） |
| P1 | D3、F1、F2、F5、F7、B2、A1、A2 | 第二批 |
| P2 | D4、F3、F4、F6、F8、B1、B3、B4、B5、B6、A3、A4、N1、N2 | 排期 |

版本：2026-09-06 · 生成自《PrivHub-架构与功能说明.md》代码核对（24 项，D1-D4/F1-F8/B1-B6/A1-A4/N1-N2）
