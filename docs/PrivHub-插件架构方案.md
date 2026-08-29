# PrivHub 插件架构方案（cordis 视角）

> 调研来源：cordis 公开资料（cordiverse/cordis 官方仓库 / cordis-primer / DeepWiki / 社区源码解析，截至 2026-08-28）。  
> 说明：项目内的 cordis 可能被动过，本文以**官方机制为准**设计架构；对应到 PrivHub 现状的 `inject:['privhub']` 写法是标准 cordis 用法，沿用。  
> 目标：在"每个功能独立成插件"（全拆分）的前提下，给出几套**后端 cordis 层**的插件搭配与挂载架构，供拍板。

---

## 0. cordis 运行规则速记（决定架构的硬约束）

1. **插件三形态**：①函数 `export function apply(ctx)`；②对象 `{ name, apply, inject, Config }`；③类 `extends Service`（`super(ctx,'key')` 把能力挂到 `ctx.key`，无需 apply）。
2. **Context 是服务容器**：所有能力以 `ctx.<key>` 暴露；`ctx.extend()` 派生子上下文（继承父服务），`ctx.isolate(name)` 隔离某服务实例，`ctx.intercept(name, config)` 为服务加拦截。
3. **inject 依赖图**：插件用 `inject:['svcA','svcB']` 声明依赖；框架按依赖图**拓扑排序**启动——依赖未就绪则该插件不启动（PENDING），依赖消失自动卸载、恢复自动重载。**加载顺序由依赖决定，不手工编排**。
4. **Service 子类 = 可注入能力单元**：有状态/生命周期的能力做成 `extends Service`，其他插件 `inject` 它即可用，换实现不影响调用方（依赖倒置）。
5. **事件解耦通信**：`ctx.on/emit/parallel/serial/bail/waterfall` 五种模式——`emit` 广播、`parallel` 并行扇出、`serial` 取首个非空、`waterfall` 中间件链可改值、`bail` 取首个非错。插件间尽量走事件而非互 inject。
6. **effect 可逆副作用（可插拔基石）**：`ctx.on/ctx.provide/ctx.effect` 注册的东西，插件卸载时**逆序自动清理**，零残留、无内存泄漏。
7. **装配机制**：`cordis.yml` / `cordis.patch.yml` 用 `insert:[{id,name}]` 声明插件；多 bundle 组合（如 `package.json` 的 `profile.bundles`），用户层 patch 最后应用可覆盖/禁用/新增；Loader 扫描模块树挂载。
8. **删除插件 = 安全卸载**：框架逆序撤销其全部 effect，其他插件不受影响——这正是"想到功能就加/删一个插件"的物理基础。

> 注意分层：cordis 只管**后端**插件生命周期与依赖；前端"挂 slot"是 PrivHub 自己的机制（shell 聚合 `client/manifest.json`），与 cordis 无关，两者经 `window.PrivHub.api()` 桥接。

---

## 1. 对《物理拆分映射表》的架构校正（必须先说）

之前映射表有 3 处写法违反 cordis 哲学，按官方机制修正：

| 原写法（反模式）                                         | 问题                       | cordis 正确做法                                                                                                                                  |
| ------------------------------------------------ | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| B13 审计"扩展 core 方法 `ctx.privhub.appendAudit=...`" | 污染基座 Service、破坏隔离、热重载会残留 | 审计做成独立 **Service 插件** `privhub-audit`：`super(ctx,'audit')` 提供 `ctx.audit.append()`，各写操作 `inject:['audit']` 或 `ctx.emit('audit/record', ...)` |
| ACL"在 `canAccess` 之上扩展"                          | 直接改基座方法同样污染              | 用 `ctx.intercept('privhub', { canAccess: ... })` 拦截权限判定，或 ACL 独立 Service `ctx.acl.can()` 包装；不在基座里改                                           |
| 功能插件之间互相 inject（如 B10 批量 inject B11 上传）          | 删任一功能插件会连锁破坏其他，违背可插拔     | 跨功能交互走**事件**或抽成**共享 Service**；功能插件只 inject 基座 Service + 发/听事件                                                                                |

> 结论：基座只保留"绝对稳定的平台能力"（`privhub` 共享服务）；可变/可加的功能一律独立插件，且**功能插件之间零直接依赖**。

---

## 2. 三套架构方案（搭配 + 挂载）

### 方案 A · 扁平独立 + 基座 Service 扇出（推荐基线）

- **搭配**：6 个枢纽各提供一个"域 Service"——`privhub`（core，平台级）、`privhubFiles`、`privhubAuth`、`privhubAdmin`、`privhubTrash`、`privhubShell`。27 个功能插件**全部扁平**挂在 `plugins/` 下，每个只 `inject` 需要的基座 Service（如 `privhubFiles`）+ 通过事件与其他功能通信。
- **挂载**：每个功能目录自带 `cordis.patch.yml`（`insert` 自己）；Loader 扫描 `plugins/*` 全部挂载。启动顺序由 `inject` 依赖图自动定（基座 Service 先 ACTIVE，功能插件后启动）。
- **通信**：跨功能全走事件（如 B11 上传完 `emit('files/uploaded', payload)`，B12 进度监听、B13 审计监听、知识库索引监听）。
- **可插拔**：⭐⭐⭐ 删任一功能插件，因仅依赖基座 + 事件，零连锁影响。

### 方案 B · 枢纽 Group 隔离

- **搭配**：用 `cordis-plugin-group`（`group:true` + `isolate`）。每枢纽是一个 group 上下文，`isolate` 出该域 Service 的独立实例；枢纽下功能插件挂在 group 的 **child context** 上。
- **挂载**：枢纽目录 `patch.yml` 声明 group（含 `isolate: privhubFiles:true`），其下功能插件由 group 以 `ctx.plugin()` 挂入 child context。
- **通信**：同枢纽内走共享 child context 服务；跨枢纽仍走事件/基座。
- **可插拔**：⭐⭐⭐ 且**按枢纽生命周期隔离**——reload 某枢纽不影响其他；但 group/isolate 机制官方标注 API unstable，复杂度高。
- **代价**：group 概念较新（官方称 unstable），调试与装配心智负担大。

### 方案 C · 能力 Service + 薄功能插件

- **搭配**：把"会被多个功能复用"的能力抽成 **Service 插件**（不只是基座）：`privhub-audit`（审计）、`privhub-acl`（权限）、`privhub-search`（检索索引，承接 B8/C15/检索引擎）、`privhub-meta`（标签/元数据，承接标签/引用图）、`privhub-realtime`（协同 CRDT）。其余功能点做成**消费这些 Service 的薄插件**。
- **挂载**：Service 插件先挂（被 `inject`），薄功能插件后挂并 `inject` 对应 Service；顺序由依赖图自动定。
- **通信**：功能插件 `inject` 能力 Service + 发领域事件；避免重复实现索引/审计/权限。
- **可插拔**：⭐⭐⭐ 且**避免重复建设**——搜索索引、审计只实现一次，被多插件复用。

---

## 3. 方案对比

| 维度          | A 扁平+基座扇出    | B 枢纽 Group                | C 能力Service+薄插件 |
| ----------- | ------------ | ------------------------- | --------------- |
| 可插拔度        | 高            | 高（多一层隔离）                  | 高               |
| 耦合度         | 低（仅依赖基座+事件）  | 低（组内共享、跨组事件）              | 低（依赖能力 Service） |
| 实现复杂度       | 低            | 高（group/isolate unstable） | 中（需先识别能力边界）     |
| 重复建设        | 中（检索/审计可能重复） | 中                         | 低（能力复用）         |
| 热重载影响面      | 单插件          | 单枢纽                       | 单插件/单能力         |
| 贴合"加功能即加插件" | ⭐⭐⭐          | ⭐⭐⭐                       | ⭐⭐⭐             |
| 推荐度         | ★★★          | ★                         | ★★              |



---

## 4. 推荐：A + C 组合

- **基座**：保留 6 枢纽的域 Service（方案 A 的扇出结构），作为平台稳定层。
- **能力 Service 化**：对"多插件复用"的能力采用方案 C——审计、ACL、检索索引、标签元数据、协同各自独立 Service 插件。
- **功能插件扁平**：27 个功能点扁平挂在 `plugins/`，只 `inject` 基座/能力 Service + 发/听事件（方案 A）。
- **不采用 B**：group/isolate 官方 unstable，且全拆分已通过"扁平+事件"达到隔离目标，不必引入额外复杂度。
- **统一挂载规则**：每个插件目录 = `cordis.patch.yml`(insert 自身) + `package.json` + `src/index.ts`(若需后端，`inject` 基座/能力 Service) + `client/`(前端 slot 挂载)。删目录=卸载，零改骨架。

---

## 5. 挂载示例（对接现有写法）

`privhub-files-search/cordis.patch.yml`：

```yaml
insert:
  - id: privhub-files-search
    name: './privhub-files-search'   # 或包名
```

`privhub-files-search/src/index.ts`（消费基座 + 能力 Service，发事件）：

```ts
import { type Context } from 'cordis'
export const inject = ['privhub', 'privhubSearch']   // 依赖基座 + 检索能力 Service
export function apply(ctx: Context) {
  const svc = ctx.privhub                           // 基座：listFiles 等
  const search = ctx.privhubSearch                 // 能力 Service：索引查询
  svc.route('/privhub/api/search', async (req, res) => {
    const r = await search.byName(ctx.query.q)
    ctx.emit('files/searched', { q: ctx.query.q, by: ctx.user })  // 审计等监听
    return json(res, 200, r)
  }, 'files-search')
}
```

> 前端挂载不变（项目层）：`client/manifest.json` 声明 `slots`/`barItems`，shell 聚合按 slot 渲染。

---

## 6. 下一步

确定采用哪套（或 A+C 组合）后，我把《物理拆分映射表》按选定架构重写——把"后端来源/依赖 core"列升级为"提供/消费 Service + 事件契约"列，作为拆分实施的硬规范。
