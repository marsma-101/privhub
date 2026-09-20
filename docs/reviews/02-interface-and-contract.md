# 02 · 接口与契约（连接与契约设计视角）

> 评审角度：**「块与块之间怎么连」** —— 接口契约、版本兼容、错误传播、幂等、事务边界、同步/异步、跨块失败处理。
> 编制：萧潇｜日期：2026-09-17｜源码基线 v3.1.0（`privhub/package.json:3`）
> 纪律留痕：本报告全程**只读**，未修改 `privhub/` 下任何文件，未改 `docs/` 下已有文件。唯一新建文件即本报告。
> 已跑命令：`node tests/integrity.mjs`（50 通过 / 0 失败）、`node tests/frontend-templates.mjs`（12 通过 / 0 失败）、`node tests/run-all.mjs --spawn`（全套通过，退出码 0）。

---

## 1. 一句话结论

**PrivHub 的每一个"块之间的连接点"都只靠约定，不靠声明——所以契约坏掉时不是"报错"，而是"静默少一块"；全项目只有 `X-Agent-Key` 那一条通道是真写了契约的（有错误码表、有幂等键、有请求 ID），其余 111 条路由、26 个桥键、36 个事件名、31 个插槽名，全都处于"改错了没人知道"的状态。**

具体的量：`window.PrivHub` 被 **221 处 / 40 个插件文件**读取，但它**没有版本号**（`frontend/index.html:731`），全仓 `*.d.ts` 数量为 **0**；manifest 缺 `id` 或 `slots` 时**服务端直接 `continue` 丢掉整条**（`privhub-shell/server/index.ts:55`），界面只是"少一个入口"，不报错；一个插槽名写错，骨架和插件**两边都不会响**。

---

## 2. 我实际看过的证据

### 2.1 我亲自打开并逐行核对的（【实体】）

| 文件 | 行号 | 看的是什么 |
|---|---|---|
| `privhub/src/web-server.ts` | 42-46、88、142-148、169-184、186-226、284-304 | 路由表结构、精确匹配分发、错误兜底、静态鉴权 |
| `privhub/src/main.ts` | 46-51、55-84、134-215 | 装配顺序、L3 发现、会话校验注入 |
| `privhub/frontend/index.html` | 340-459、470-519、700-899、891-944、954-962、977-1094 | `api()` 封装、`bus`、`nav` 状态、`window.PrivHub` 赋值、插件 import 装配、插槽渲染分支 |
| `privhub/plugins/privhub-core/src/index.ts` | 88-187、314-316、755-874 | `json`/`readBody`/`readBodyRaw`/`readJsonBody`、`route()`、重命名/移动/回收站 |
| `privhub/plugins/privhub-svc-events/src/index.ts` | 1-83（全文） | 事件注册表实现 |
| `privhub/plugins/privhub-shell/server/index.ts` | 1-112（全文） | manifest 扫描、字段兜底、强制门、分级返回 |
| `privhub/plugins/privhub-shell/client/index.js` | 40-130、159-167 | `barItems[].slot` 过滤、底部组、`slots` 导出 |
| `privhub/plugins/privhub-admin-acl/src/index.ts` | 1-263（全文） | 唯一"类中间件"：`svc.route` 包装 + body 重放 |
| `privhub/plugins/privhub-files/src/index.ts` | 44-119、160-249 | list/upload/delete/rename/move 的契约与错误 |
| `privhub/plugins/privhub-files-agent/src/index.ts` | 50-110 | 唯一有幂等键的通道 |
| `privhub/plugins/privhub-files-office-ui/src/index.ts` | 14-68、105-140 | `json` 副本、`.doc→.docx` 两步操作 |
| `privhub/plugins/privhub-svc-rag/src/index.ts` | 95-135 | `json`/`readBody` 副本 |
| `privhub/plugins/privhub-files-explorer-v3/client/ops.js` | 75-131、225-284 | 重命名、复制、convert-doc 的两步失败处理 |
| `privhub/plugins/privhub-files-explorer-v3/client/panel.js` | 118、138、159、222-225、290、304 | 批量移动/删除的错误吞噬 |
| `privhub/plugins/privhub-shell-favorites/src/index.ts` | 1-89（全文） | 收藏的幂等与去重 |
| `privhub/plugins/privhub-files-fulltext/src/index.ts` | 80-124 | 事件监听是否 await |
| `privhub/node_modules/@deepseek-ai/cordis/lib/index.js` | `EventsService` 段（约 5000-13500 字符区） | `emit/parallel/serial/bail` 的**错误语义** |
| `privhub/tests/integrity.mjs` 等 | 全量执行 | 静态检查覆盖面 |

### 2.2 由命令统计得出（【实证】）

- 路由：全仓（排除 `node_modules` / `_retired-v2` / `tests/.*`）`svc.route('…')` 注册 **112 条，路径去重后仍是 112 条 —— 无一条重复**。
- 事件：脚本枚举 `bus.emit/on` 与 `ctx.emit/on` 全部字面量，得到**前端 36 个事件名、后端 6 个**及其收/发两侧。
- 插槽：32 个 `client/manifest.json` 的 `slots` 并集 **31 个**；骨架模板引用的插槽名 **28 个**；32 个 `client/index.js` 的 `export default { slots }` 键 **31 个**。
- `barItems`：**20 条**，字段集只有两种（`icon,title,slot,view` 14 条 / 再加 `adminOnly` 6 条）；`slot` 取值只有 4 个（`admin-nav`×8、`panel`×7、`app-iconbar`×4、`admin-console`×1）。
- 路由注册点 `svc.route` 只出现在 `privhub-core/src/index.ts:314`，即**全部 112 条都经过同一个函数**。
- 测试执行结果见文首。

### 2.3 三路并行只读勘察（已交叉复核，其中 2 条与交底不一致，见 §3.3）

---

## 3. 现状判定

### 3.1 做对了的

1. **"一个入口注册所有路由"这件事做到了**。112 条路由全部经 `ctx.privhub.route()` → `ctx.effect(() => ctx.webServer.register(...))`（`privhub-core/src/index.ts:314-316`），**可逆注册**、卸载即摘除，路径去重后 0 冲突。这是契约可治理的前提，已经具备。
2. **`X-Agent-Key` 通道是全仓唯一的"真契约"**——错误信封统一 `{ok:false, code, error, hint, requestId}`，公开 `errorCodes` 清单 20 项，`X-Idempotency-Key` 必填、同键异体回 409、命中重放带 `replayed:true`，还有 `/agent/v1/schema` 自描述端点。**这个模式已经存在，只是没被推广到网页侧。**
3. **离线契约清单与实现一致**：32 个 manifest 声明的 31 个插槽名，与 32 个 `index.js` 实际 `export` 的 31 个键**完全对齐，零漂移**；`barItems` 也全部带 `view`（`view || slot` 双读）。说明作者在这条线上是有纪律的。
4. **删除/移动/重命名做了前置存在性校验**（`privhub-files/src/index.ts:208-213`），重复点删除**不会**产生第二条回收站记录（`privhub-core/src/index.ts:830` 锁内二次 `existsSync`）；`restoreTrash` 遇到原位置同名**拒绝恢复而不是覆盖**（`:858`）。
5. **上传是流式 + tmp + rename 原子落地**（`privhub-files/src/index.ts:117-141`），失败清理 tmp；`svc-storage` 的 `atomicWrite` 是 tmp(pid+随机) → rename 重试 5 次（`privhub-svc-storage/src/index.ts:191-210`）。单次写盘这一层是合格的。
6. **`.doc→.docx` 这个已知的两步操作，前端**确实**处理了第二步失败**（`ops.js:239` 弹"已生成 .docx，但原 .doc 删除失败"），不是完全没管。

### 3.2 做错了的

**A. `window.PrivHub`、manifest、插槽名是三份"只写在注释里"的契约。**

- `window.PrivHub` 的赋值是一行字面量对象 + 6 行追加（`index.html:731,733,735,736,737,748`）+ 9 个 `openXxx` 兜底（`:954-962`），共 **26 键**。**没有版本号、没有 `declare global`、没有 `.d.ts`**（全仓 0 个），却被 **221 处 / 40 个插件文件**读取。
- 加一个键永远不会"破"调用方；但**删一个键或改一个方法签名**，40 个插件里凡是调用它的地方会在**运行时**变成 `undefined is not a function`——而唯一的全局兜底是把错误显示成"XX 失败"（见 C 项）。
- manifest 的强制门只有一项：`if (!raw.id || !Array.isArray(raw.slots)) continue`（`privhub-shell/server/index.ts:55`）。**没有 schema 校验**（`schemastery` 在 9 个业务插件里用了，`privhub-shell` 一次都没用）。`title` 缺了显示目录名（`:65`）、`icon` 缺了显示 📦（`:66`）——**这是好的兜底**；但 `description` 无兜底可为 `undefined`（`:67`）；而 `id`/`slots` 缺了则**整条被静默丢弃**——插件前端**根本不会被 import**，用户看到的是"这个入口不存在"，没有任何一条日志或界面提示。
- 插槽名同样没有白名单。骨架渲染一个没人声明的插槽 → 静默不渲染（`slotComps.tabs` 就是活例，`index.html:1029` 渲染 `tabs`，32 个 manifest 无一声明）；插件声明一个骨架不认的插槽 → `slotComps[slot]` 照样写入（`:841`），模板不引用，**同样静默无事**。

**B. 后端事件总线没有错误通道，而且"注册表"是摆设。**

- Cordis 的 `emit` 实现是 `this.dispatch("emit", args).map(cb => cb(...args))`——**同步调用、无 try/catch、不 await 返回值**（`node_modules/@deepseek-ai/cordis/lib/index.js`，`EventsService` 段）。推论：【推断，有强证据】① 某个监听器**同步抛错**会打断它后面所有监听器，异常还会冒泡回**触发方**——而 `ctx.emit('audit:logged', rec)` 是在路由 handler 里调的（`privhub-files/src/index.ts:34`），于是**一次审计刷新出错可以让一次"删除文件"请求失败**；② 监听器返回的 Promise 被丢弃，**异步失败没有任何出口**——`privhub-files-fulltext/src/index.ts:88,101,105,109,110,114` 全是 `void search.index(...)` / `void indexFile(...)`，索引写失败**永远不响**。
- 与之对照，**前端 `bus` 反而是对的**：`emit` 逐个监听器包了 `try/catch`（`index.html:418`），一个坏监听器不影响其余。**前后端在同一个概念上采用了相反的错误语义，而这件事没有任何地方写下来。**
- `privhub-svc-events` 那张注册表（`src/index.ts:43-77`）注释自称"治理插件间的字符串事件"，但 `warnIfNoListener` **全仓零调用**，`snapshot()` **全仓零调用**，且它**不包裹** `ctx.emit/ctx.on`（`:10` 自陈）。结果：**声明是自愿的，漏声明没有惩罚**。实证缺口——`personal:renamed` 由 `privhub-auth:50` 与 `privhub-admin:19` 声明发出、被 `shell-recent:52` 与 `svc-rag:1087` 监听，**但它不在 `svc-events` 的头部契约清单里**（`:13-23` 只列了 4 个事件 + `dispose`）。
- 前端 **36 个事件名**里，**7 个发出来没人听**（`auth:logout`、`file:trash`、`file:restored`、`file:uploaded`、`md:opened`、`recent:updated`、`file:saved`——最后这个在**前端**没人听，后端同名事件有 3 个监听方，纯属巧合同名）；**2 个听了没人发**：`v3:tab-opened` 的监听方 `panel.js:353` 注释直接写"占位"，`vendor` 与 `bus.on(...)` 有 24 个事件名两端都有。**这些全部静默**。

**C. 错误从后端到用户，中间有三处固定损耗，且没有一处能追溯到具体请求。**

- **第 1 处（最狠）：全局兜底把一切塌缩成一句英文。** `web-server.ts:300-302`：任何 handler 抛错 → `res.writeHead(500); res.end('internal server error')`，**不写日志、不带请求 ID、不带原因**。异常对象 `e` 在 `catch (e)` 里被**完全丢弃**。
- **第 2 处：错误形状不统一，前端只能猜。** 同一个后端里并存至少 4 种"失败"形状：
  - `{ok:false, error:'…'}` + 恰当状态码（主流，如 `privhub-files/src/index.ts:111`）；
  - **纯文本** `res.writeHead(403); res.end('forbidden')`（`privhub-files/src/index.ts:77`、`:231`、`:234`）——**与同一个文件里 40 行之外的 JSON 风格并存**；
  - 全局 500 的 `text/plain 'internal server error'`（`web-server.ts:301`）与静态 404 的 `'not found'`（`:216,225`）；
  - `{ok:false, code:'AGENT-xxxx', …}`（`files-agent`）。
  前端 `api()` 的应对是**用 `try { return await res.json() } catch { return {ok:false, error:'服务器返回异常（HTTP '+res.status+'）'} }` 把非 JSON 响应吃掉**（`index.html:379-384`）。于是"403 无权限"和"500 崩了"在界面上是**同一句"服务器返回异常"**。
- **第 3 处：`json()` 的 7 份副本已经让错误语义分叉。** 副本分布：`privhub-core/src/index.ts:95`（带 3 个安全头）、`privhub-shell/server/index.ts:29`（**无安全头**）、`privhub-files-agent/src/index.ts:58`（带 `extra` 注入）、`privhub-svc-rag/src/index.ts:97`（带安全头）、`privhub-files-office/src/index.ts:16`、`privhub-files-office-ui/src/index.ts:19`、`privhub-files-office-ai/src/index.ts:31`（后三个**无安全头**）。`readBody()` 的 5 份副本上限各不相同（core 16MB / agent 32MB / rag 4MB / office×2 20MB），**更关键的是超限时抛的异常类型不同**：core 抛 `BodyTooLargeError`（带 `statusCode=413`，`privhub-core/src/index.ts:112-118`）→ 调用方回 **413**；agent 与 rag 抛**裸 `Error`**（无 `statusCode`，`files-agent:77`、`svc-rag:112`）→ 只能回 **400/500**。**同一句"请求体过大"，在两个插件里是不同的 HTTP 语义。**
  > 本条与账本 [E3] 指向同一处代码，但 E3 的立项理由是"代码整洁 + 改 S1 要改 5 处"，**未涉及"错误语义已经分叉"**。这是**加深**，不是重复。
- **后果实证**：`privhub-files/src/index.ts:54` 把**任何**内部异常（ENOENT/EACCES/…)包成 `json(res, 400, {ok:false, error: e.message})`——**HTTP 400 却是系统级错误**，且把原生 `e.message`（常含**绝对路径**，如 `ENOENT: ... open 'G:\...\data-files\<项目>\<文件>'`）直接交给浏览器。全仓这类"直接把 `e.message` 回给前端"的写法命中 **45 处**。
- **前端侧的损耗同样是固定的**：`catch { toast('复制失败') }`（`ops.js:130`）、`catch { toast('移动「X」失败') }`（`panel.js:225`）、`catch { /* 单条失败继续 */ }`（`panel.js:290,304`）——**连服务端返回的 `r.error` 都没读**。批量移动的循环里，失败条目的**唯一记录就是一句 toast**，`okCount` 之外没有任何"哪些失败了"的清单。
- **一个具体的"静默假成功"**：`/privhub/api/list` 失败时返回**同形状的 200**？不——它返回 `json(res, 400, {ok:false,…})`，而骨架的目录树分支写的是 `if (r.ok) { … r.entries.filter(...) }`（`index.html:517-518`），**失败时既不展开也不提示**；`openDir` 分支写的却是 `nav.entries = r.ok ? r.entries : []` **然后** `if (!r.ok && r.error) toast(...)`（`:489-491`）。**同一份响应、同一个前端文件，两个调用点采用了两种契约假设**，一个弹错一个静默。

**D. 网页侧写操作没有幂等约定，且一个临时文件名会互相覆盖。**

判定口径：**同一个写请求连打两次，会发生什么？**

| 操作 | 路由 | 连打两次的结果 | 判定 |
|---|---|---|---|
| 上传 | `privhub-files/src/index.ts:102-146` | **静默覆盖**同名文件（`rename` 覆盖），不报错、不产生副本、不提示 | **不合格**（不是幂等，是"每次都有副作用且副作用不可见"） |
| 重命名 | `:178-194` | 第一次成功，第二次 400「重命名失败」 | 幂等但**报错误**（重试会被当成故障） |
| 移动 | `:197-222` | 第二次 400「源不存在」 | 同上 |
| 删除 | `:164-175` | 第二次 400「删除失败」（**未产生第二条记录**） | 同上 |
| 收藏 | `shell-favorites/src/index.ts:82-83` | 第二次 200 `{ok:true, already:true}` | **合格**（全项目唯一显式幂等） |
| Agent 写入 | `files-agent` + `m2.ts:108` | 同键重放 200 + `replayed:true`；同键异体 409 | **合格** |

- 全部网页侧写路由**没有幂等键**（全局唯一的 `X-Idempotency-Key` 在 `files-agent`）。而 `index.html:364-385` 的 `api()` **没有超时、没有重试**——所以"用户手抖点两次"和"网络断了用户重试"这两种最普通的场景，目前是**未定义行为**。
- **并发同名上传会写坏**：`privhub-files/src/index.ts:118` `const tmp = target + '.part'` ——**临时文件名是确定的**，两个并发的同名上传共用同一个 `.part`，第一个 rename 走之后第二个 rename 报 ENOENT。对照：Agent 路径已经修过这个问题，用的是 `'.part-' + Date.now()`（`privhub-files-agent:686`）。**同一类缺陷，一条通道修了，另一条没修。**

**E. `admin-acl` 是全仓唯一"类中间件"，但它的守卫范围是手写清单，且它自己承认有漏网。**

- 它包装 `svc.route`（`privhub-admin-acl/src/index.ts:183-200`），因此**只覆盖它之后注册的路由**；而覆盖面靠一张手写的 `GUARD_PATHS`（`:57-119`，47 条）。`:96` 注释自陈"comments 写类经 id 定位（**本轮暂不纳入，记录后续治理**）"。
- 更实际的问题在请求体：`fromBody` 分支先 `await readBody(req)` 把 body **读完**，再用 `new PassThrough()` 把 `raw` 重放给原 handler（`:144-165`），并**手工伪造 `url`/`method`/`headers`** 三个属性。这是一个**没有契约的隐式约定**：任何新路由只要碰 `req` 的第四个属性（比如 `req.socket`、`req.complete`），在这条路径下就会与直接调用**行为不一致**，而且失败方式是难查的。属【推断】，未实测。

### 3.3 与交底 §2.2 / 题面不一致的两处（**我实测推翻**）

1. **插入槽统计**：交底称"含 `barItems` 的 manifest"未给数；题面隐含"8 条 `slot='admin-nav'`"。实测 **`barItems` 出现在 15 个 manifest 里、共 20 条**，其中 `slot='admin-nav'` **8 条**（题面的 8 与 12 都成立，15 这个数题面没给）。
2. **`shell-agent-console` 不构成"跨插件 DOM 查询"**：题面把它与 `files-office2`/`files-edit-md`/`files-comments` 并列为"依赖 explorer-v3 的类名"，实测它在 `client/index.js:174,175,293` **只是在自己模板里用了 `class="v3-loading"` 这个名字**，**没有任何 `querySelector`**。它受影响的机制是"样式借用"，改类名只会掉样式，不会掉功能。**跨插件 `querySelector` 的实际是 3 个插件**：`files-comments/client/index.js:112`、`files-edit-md/client/index.js:220,237,270`（含一处 Vue `teleport` 选择器 `:428`）、`files-office2/client/index.js:41,50,51`（另有一处 CSS `:has()` 选择器 `:20-21`）。

### 3.4 我看不出来的

- **`Vue teleport to=".v3-content"` 在目标不存在时的确切行为**（`files-edit-md/client/index.js:428`）。Vue 3 文档语义是"不渲染 + 警告"，但我**没有跑起这个界面**，无法确认它是 console 警告还是渲染异常。→ 标 [存疑]。
- **`admin-acl` 的 body 重放路径下是否真的所有 handler 都能正常工作**（只读了代码，没有构造请求实测）。
- **四份事件/插槽的"实际使用频率"**：7 个孤儿事件里，哪些是"退役残留"、哪些是"给未来插件预留的扩展点"，从代码里判不出来，需要作者回答。
- **`_retired-v2` 之外，还有没有第 5 个跨插件耦合**（我只搜了 `document.querySelector/getElementById/getElementsBy` 与 v3 类名；用 `$refs` 或自建 `window` 全局变量互相访问的没查）。

---

## 4. 改进建议（按投入产出比排序，P0 ≤ 5）

### P0-1 · 给 `window.PrivHub` 与 manifest 加"可执行契约"（**最要紧的一条**）

- **【问题】** 26 个桥键被 221 处引用却无版本、无类型声明；manifest 缺 `id`/`slots` 时整条静默丢弃，缺 `description` 得 `undefined`；插槽名无白名单。**改错了不会报错，只会"少一块"。**
- **【证据】** `frontend/index.html:731,733-737,748,954-962`（26 键）；`plugins/privhub-shell/server/index.ts:55`（`continue` 丢整条）、`:63-71`（字段兜底表）；`privhub-shell/src` 未 import `schemastery`；全仓 `.d.ts` = 0；`index.html:841`（插槽名来者不拒）。
- **【改法】（三步，每步都可独立交付）**
  1. **加一个版本位与自检**：`window.PrivHub.__version = 'privhub/1'`，并在骨架启动时打印/暴露 `Object.keys(window.PrivHub)` 的排序快照。**目的不是强制，而是"能对账"。**
  2. **写一份 `frontend/privhub-bridge.d.ts`**（纯声明，不进构建链——**不违反约束 2**），把 26 个键的类型写死。AI 改骨架时 IDE/类型检查能立刻看到"这个键有 40 个消费者"。
  3. **manifest 用一个 `SLOT_WHITELIST` 常量 + 一条校验**：服务端扫描时，把"缺 id/slots"从 `continue` 改为**收集并回报**（返回体加 `rejected: [{dir, reason}]`），骨架把 `rejected` 显示成界面顶部一条提示。**这一改动把"静默丢弃"变成"看得见的丢弃"**，成本极小、收益最大。
- **【验收】** 人为删掉某个 manifest 的 `"slots"` 字段 → 界面明确显示"插件 X 的 manifest 不合法（缺 slots），已跳过"，且服务端日志有一行；`grep -c "window.PrivHub\." privhub/plugins | sort` 能作为"改桥时的消费者清单"。
- **【成本】小**（1 个新文件 + 服务端约 10 行 + 骨架约 10 行）。
- **【与约束冲突】** 无。不引入打包、不改交互布局、不碰插件目录归属。

### P0-2 · 给后端事件总线补上"错误通道"与"对齐声明"

- **【问题】** Cordis `emit` 无 try/catch、不 await → 一个监听器同步抛错会**打断后续监听器并冒泡回触发方**；异步监听器的失败（全文索引、RAG、图谱）**没有任何出口**。注册表 `warnIfNoListener`/`snapshot` 零调用，`personal:renamed` 漏登记。前端 7 个孤儿事件全部静默。
- **【证据】** `node_modules/@deepseek-ai/cordis/lib/index.js`（`EventsService.emit`：`.map(cb => cb(...args))`）；`privhub-files-fulltext/src/index.ts:88,101,105,109,110,114`（`void …` 丢弃 Promise）；`privhub-svc-events/src/index.ts:10,50,58,66,74`（不改 emit、`warnIfNoListener` 无调用）；`privhub-files/src/index.ts:34`（在路由 handler 里 `ctx.emit`）；`frontend/index.html:417-419`（前端 bus 有 try/catch，**与后端相反**）。
- **【改法】**
  1. 在 `svc-events` 里加一个**薄包装** `ctx.eventBus.safeEmit(ctx, name, payload)`：内部 `for (const cb of listeners) try { await cb(...) } catch (e) { logger.error('[events]', name, e) }`（或直接用 Cordis 现成的 `parallel()`——它用 `Promise.allSettled` 并把错误聚合成 `AggregateError`）。**先把 `audit:logged` 换成它**，因为这条事件在每个写路由的收尾处，出错会连累业务。
  2. 把 `declareEmit/declareListen` 的**漏声明变成启动期警告**：`apply` 结束后比对"实际出现的字符串"与"已登记集合"，差异打 `logger.warn`。**不需要改任何调用方。**
  3. 把前端 7 个孤儿事件与后端 `personal:renamed` 补进契约清单——**或者删掉**。二选一，**不要留着**。
- **【验收】** 人为让 `admin-audit` 的监听器 `throw` → 删除文件接口仍返回 200，日志有一行 `[events] audit:logged`；启动日志打印"未声明事件：无"或列出清单。
- **【成本】小-中**（1 个包装函数 + 1 段启动自检；不改 112 条路由）。
- **【与约束冲突】** 无。

### P0-3 · 统一错误信封，并把"塌缩点"补上可追溯信息

- **【问题】** 全局兜底 `end('internal server error')` **丢弃异常、无日志、无请求 ID**；同一后端并存 JSON/纯文本/Agent 三种错误形状；`json()` 7 份副本已让"请求体过大"在不同插件落 400 或 413；`privhub-files/src/index.ts` 同一个文件里同时有 JSON 403 与纯文本 403/404。
- **【证据】** `web-server.ts:297-302`、`:216,225`；`privhub-files/src/index.ts:77` vs `:111` vs `:231,234`；`json()` 7 处见 §3.2C；`readBody()` 5 处上限 4/16/20/32MB 且 core 带 `statusCode=413`、agent/rag 不带（`privhub-core/src/index.ts:112-118` vs `privhub-files-agent/src/index.ts:77`、`privhub-svc-rag/src/index.ts:112`）；`index.html:379-384`（把非 JSON 吃掉）。
- **【改法】**
  1. **`web-server.ts` 的兜底 catch 加两行**：生成 `x-request-id` 头 + 写一行 `console.error`（`installFileLogger` 已把 console 落盘，`main.ts:105-132`），响应体裁用**现有 envelope** `{"ok":false,"error":"服务器内部错误","requestId":"..."}`。**这一处改动让所有 112 条路由的黑洞变成可查。**
  2. **纯文本错误就地改 JSON**：`privhub-files/src/index.ts:77,231,234`、`web-server.ts:216,225`。静态资源的 404 可保留纯文本（非 API）。
  3. **`json()`/`readBody()` 副本统一**（与账本 E3 同目标，但**验收要加一句**："超限一律 413"——这是 E3 没写的语义部分）。顺手把 agent/rag 的裸 `Error` 改成 `BodyTooLargeError`。
  4. **`privhub-files/src/index.ts:54` 的 `catch → 400 + e.message` 改为 `500 + 泛化文案`**，原始 `e.message` 只进日志。**这一条同时是安全项**（绝对路径外泄）。
- **【验收】** `curl` 打一个会抛 internal 的请求 → 返回 JSON 且含 `requestId`，日志能按该 ID 找到堆栈；`grep -rn "end('forbidden')\|end('not found')" privhub/plugins/privhub-files` 只剩静态资源那两处。
- **【成本】小**（后端 6-8 处小改）。
- **【与约束冲突】** 无。**注意**：`error` 文案是中文，前端各处 `r.error || 'XX失败'` 直接展示，改文案是用户可见变更，需同步 CHANGELOG（约束 8）。

### P0-4 · 网页侧写操作补上幂等约定（先修最贵的一个）

- **【问题】** 全 112 条路由只有 `files-agent` 有幂等键；网页侧"上传"重发**静默覆盖**，"重命名/移动/删除"重发**报错**（把重试当故障）；且 **`.part` 临时文件名固定**，并发同名上传会互相覆盖。
- **【证据】** `privhub-files/src/index.ts:118`（`const tmp = target + '.part'`）对照 `privhub-files-agent/src/index.ts:686`（`'.part-' + Date.now()`，已修）；`:178-194`、`:197-222`、`:164-175` 的返回值；`shell-favorites/src/index.ts:82-83`（唯一显式幂等的正面样例）；`index.html:364-385`（`api()` 无超时无重试）。
- **【改法】** 按"贵 → 便宜"三步：
  1. **`.part` 加唯一后缀**（照抄 agent 的写法，一行）。这是**并发数据错乱**的根，最便宜也最要紧。
  2. **上传前明确"同名怎么办"**：当前是静默覆盖。至少返回 `{ok:true, overwritten:true}`，前端给一次可撤销提示。**不要引入幂等键**——加个 `overwritten` 字段就够。
  3. **重命名/移动/删除的第二遍**：把"源不存在/目标已存在/已删除"归到**既有的成功语义**（返回 `{ok:true, noop:true}`），而不是 400。**判定口径**：连打十次，结果与打一次一致、界面不报错。→ **这是幂等的标准做法（状态机守卫：重复请求落在同一状态上直接返回成功）**，改动只在 `privhub-core/src/index.ts:792-800` 与其调用方。
- **【验收】** 并发两个同名上传 → 两份内容都正确、无 ENOENT；对同一文件连点两次"删除" → 第二次不弹错误 toast；重命名脚本连跑两次 → 第二次不报"重命名失败"。
- **【成本】小**（3 处，合计约 20 行）。
- **【与约束冲突】** 无。

### P0-5 · 把"跨插件连接"从隐性改成显性，并让它在坏掉时出声（**部分与账本重叠，此处只报增量**）

- **【问题】** 3 个插件在别人的 DOM 里 `querySelector` explorer-v3 的类名（另有 CSS `:has()`、Vue `teleport`、借用类名共 6 类机制），**全部带守卫、全部静默降级**；且这条依赖在 `package.json`、`manifest.json`、`src/index.ts` 里**一处都没声明**。
  > **重叠声明**：账本 [U3]（事件命名统一）、[U2]（slot 渲染声明式化）、五份顾问方案（Shape Up C5「必须先去 explorer-v3 耦合，否则三个插件静默失效」）**已覆盖"要解耦"这个结论**，我**不重复**。下面的增量是：**依赖没有声明载体、且"静默"是设计使然而非疏漏。**
- **【证据】** `files-comments/client/index.js:112`；`files-edit-md/client/index.js:220,237,270,428`；`files-office2/client/index.js:41,50,51,20-21`；`shell-agent-console/client/index.js:174,175,293`（**仅借用类名，非跨插件查询——修正交底/题面**）；依赖声明缺口：4 个插件的 `package.json` 只有 `@deepseek-ai/cordis`/`schemastery`，`manifest.json` 无 `requires`/`depends`（全仓 grep 仅命中 `svc-collab` 的业务 `peers`）。
- **【改法】** 不要求重构（那与约束 5 的完整解法重复，且工作量大）。只做两件小事：
  1. **在 manifest 里加一个可选字段 `provides: { dom: ['.v3-content', …] }` / `requires: { dom: [...] }`**，服务端聚合时做**一次匹配检查**：`requires` 里出现但无人 `provides` → 启动日志 WARN + 界面提示。**这让"静默失效"变成"启动时就知道"。** 属新增可选字段，老 manifest 不写＝不检查，**向后兼容**。
  2. 或者更省：**在 `explorer-v3/client/styles.js` 顶部加一段注释化的"对外类名清单"**，并在 `tests/` 里加一条断言"这些类名仍存在"。→ **本项目已有 `integrity.mjs` 这个现成的静态检查位，加一条最省。**
- **【验收】** 人为把 `.v3-md` 改名 → 测试失败（而不是界面静默失灵）。
- **【成本】小**（方案 2 约 10 行；方案 1 约 40 行）。
- **【与约束冲突】** 无；方案 1 若做成"强制"，会与约束 3（插件自包含）的松散风格冲突，故**只做警告不做拦截**。

> **P0 之外的补充（不列条，按需取用）**
> - `.doc→.docx` 的两步操作**已处理第二步失败**（`ops.js:239`），但 `:254` 仍无条件弹「✅ 原 .doc 已删除」——**成功提示与警告并存，自相矛盾**。改法：把 `:254` 的文案改成按 `dl.ok` 分支。**成本：极小。**
> - `admin-acl` 的守卫清单 `GUARD_PATHS`（`admin-acl:57-119`）与 112 条路由之间没有对账机制，**漏一条就漏一条**（`:96` 自陈已漏 comments 写类）。改法：`apply()` 末尾比对"实际注册的路径"与 `GUARD_PATHS`，未覆盖的**打印清单**（不拦截，只暴露）。**成本：小。**

---

## 5. 我建议不要做的

1. **不要为了"统一契约"引入 OpenAPI/Swagger 或代码生成。** 112 条路由、单机局域网、无打包链——**加一套工具链的维护成本远高于收益**，且直接违反约束 2（无打包链是特性）。**该做的是"给已有约定加对账"，不是"换一套规范"。**
2. **不要给 112 条网页侧路由都加 `X-Idempotency-Key`。** 那是把 Agent 通道（高频、机器重试、无人看界面）的方案照搬到手点场景。网页侧真正需要的是**"重发不报错"**（P0-4 第 3 步）与**"同名上传可见"**，成本差一个数量级。
3. **不要为了消除 `json()`/`readBody()` 副本，去改那 7+5 个插件的全部调用点。** 账本 E3 已立项，且 `files-office-ui/src/index.ts:29-33` 的注释写明了当初内联的原因（"规避 tsx CJS 混编无法解析 core 相对导入"）——**如果这个约束今天仍成立，强行统一会改坏 3 个 Office 插件**。建议：**只统一"超限一律 413"这一条语义**，副本本身留给 E3。
4. **不要把 `barItems[].slot` 改名。** 它与顶层 `slots` 是两个不同概念（前者是"图标进哪个桶"，后者是"渲染到哪"），改名会连带 `shell/client/index.js:75-83`、`admin-console/routes.js:45-48`、8 个 `admin-nav` 声明。**成本中、收益低。** 该做的是**在 manifest 注释里写清两者区别**（一行注释）。
5. **不要为"7 个孤儿事件"逐个找用途。** 若作者不能立刻说出它的消费者，那就删；**保留一个说不清用途的事件，等于保留一处未来的误判。**
6. **不要去修 `privhub/tests/.testroot/`、`.audittest/` 里的插件副本。** 它们是测试夹具（约束 7：测试数据保持原样）。**但要知道**：`discoverL3` 扫的是 `PRIVHUB_ROOT/plugins`（`main.ts:53-65`），**若把 `PRIVHUB_ROOT` 指到测试根，会载入重名插件 → 同路径重复注册，后者覆盖前者**（`web-server.ts:144` 的 `Map.set`）。→ 这是【推断】，**属于"别踩的坑"，不是"要改的代码"**。同类的坑还有：`register()` 返回的 disposer 是 **按 path 删除**（`web-server.ts:145`），重复注册时卸载一个会把另一个也摘掉。

---

## 6. [存疑] / 未实测项

| # | 未实测的事 | 为什么判不了 |
|---|---|---|
| 1 | Vue `teleport to=".v3-content"`（`files-edit-md/client/index.js:428`）在目标缺失时的确切行为 | 需跑起界面看 console；未跑 |
| 2 | `admin-acl` 的 body 重放（`PassThrough` + 伪 `url/method/headers`，`:159-165`）是否对所有 handler 等价 | 需构造真实请求对比；未跑 |
| 3 | Cordis `emit` 中"同步抛错打断后续监听器" | **读了实现源码**（`.map(cb => cb(...args))` 无 try/catch），但**没有构造一个会抛错的监听器实测**。→【推断，有强证据】 |
| 4 | 112 条路由的分布计数 | 我脚本数到 **112 条去重后仍 112**；一路勘察员数到 113 条（含按循环注册的 4 条）。差异**未定位**，我采用自己复核过的口径。→ 标 [存疑] |
| 5 | 前端"7 个孤儿事件"里哪些是预留扩展点 | 需要作者回答，代码里判不出 |
| 6 | `data-files/` 里 `barItems` 之外的 manifest 老版本兼容性 | 只有当前一份基线，无法验证"老插件在新骨架上"的历史 |
| 7 | 部署包 `deploy/privhub-deploy/` 的契约是否与开发源码一致 | 交底 §5 已明说"落后于开发源码"；**同步生产须显式授权**，未做 |

---

## 7. 我这个角度的适用边界

**这个角度看不到什么：**

- **看不到"用户是否真的遇到"**。我只能说"契约坏掉时是静默的"，**说不出"现在已经有几处在静默失效"**——那需要跑界面、看 console、或加埋点。这是本报告最大的局限，也是五份顾问方案共同承认的同一个盲区。
- **看不到"业务上该不该这么连"**。比如 `.doc→.docx` 由**客户端**负责删除原文件（`office-ui/src/index.ts:107-108` 的注释是有意为之），从契约角度这是"跨块事务没有归属"，但从产品角度它可能是为了让权限/审计/回收语义一致。**这个取舍我不判，留给主子。**
- **看不到性能面**。事件总线同步 emit 是否造成阻塞、`PassThrough` 重放是否多一次内存拷贝——属性能角度。
- **看不到安全面**。`e.message` 外泄绝对路径我提了，但只作为"错误契约"的一个表现；完整的越权/注入面归安全角度。

**要判得准，我还需要：**

1. **一次真实的界面操作录像（5 分钟）**，特别是**故意让一个契约坏掉**（例如临时在本地把一个 `slots` 名改错、或让一个 handler 抛错）后的界面表现——这能直接验证我"静默"的判断，也能一次性回答 §6 的 #1、#2。
2. **作者对 7 个孤儿事件 + `personal:renamed` 漏登记的意图说明**（是残留还是预留）。
3. **一个能跑 `--spawn` 的环境的完整基线**（我这次跑通了，退出码 0，但这只能证明"测试没覆盖契约断裂"，不能证明"契约没断"）。

> **一句话留给主子**：这套东西的"连接"不脆——**112 条路由零冲突、31 个插槽名零漂移**，作者是有纪律的。脆的是**没有一处会告诉它"你连错了"**。P0-1 到 P0-3 三件事加起来大约 **80 行改动、零新依赖、零构建步骤**，就能把"静默少一块"变成"启动时就知道少了哪一块"。**这三件都不在既定优先级要往后放的 S/D 类里，属功能与工程质量。**
