# PrivHub 新功能批：Webhook 订阅（2026-10-12）

来源：与 `nowen-note`（弄文笔记）的源码对照中列出的 ~57 项差距里，用户点名的一句
「webhook 也非常有必要，是我生产环境需要的功能」。这是三件功能中的最后一件
（前两件：附件引用检查、任务日历，见
`docs/PrivHub-新功能批-引用检查与任务日历-2026-10-12.md`）。

用户的**选择**：**全部事件**（文件 / 任务 / 看板 / 审计）都出网，不是只发文件事件。

| 项 | 值 |
| --- | --- |
| 插件 | `privhub-webhook`（服务端 + 管理界面，新目录 = 新功能） |
| 接口破坏性 | **无**（既有路由一个未动；另增两个**新事件**，只 `emit`，不改既有行为） |
| 状态 | ✅ 本批完成（代码 + 测试 + 接线 + 面板），**未提交、未推送** |

---

## 一、订阅模型

一条订阅（`Hook`）：

| 字段 | 含义 |
| --- | --- |
| `url` | 投递地址，只接受 `http(s)://` 绝对地址（LAN 内部署，不限私网/公网），上限 2000 字符 |
| `events` | 事件白名单；**空数组 = 全部事件**（界面默认值） |
| `project` | 只投该项目的载荷；空串 = 不限项目 |
| `enabled` | 开关（关掉即停投，不删配置） |
| `secret` | HMAC-SHA256 签名密钥，**只写**（见下） |

上限 50 条订阅。

### 签名

```
x-privhub-signature: sha256=<hex(HMAC-SHA256(secret, rawBody))>
```

与 GitHub 的 `X-Hub-Signature-256` / Stripe 的 `Stripe-Signature` 同构。**对实际发出的那串字节签名**——
不是对信封对象重新 `JSON.stringify` 一次。两次序列化哪怕差一个空格，订阅方验签就会失败，而且那种失败
极难排查（「我按文档算的，就是对不上」）。因此 `buildBody()` 返回的 `body` 同时是**发出去的字节**、
**签名对象**、**日志留存对象**，三者是同一份。

本实现**不带时间戳参与签名**，也就不提供防重放窗口；订阅方按 `x-privhub-delivery`（每次投递一个 id）
自己做幂等。

### 密钥是只写的

`secret` **永不出现在任何响应里**。新建/轮换时回显一次（就是那一刻给你看），此后列表里只有
`hasSecret: true/false`。这样即使管理面板被人看到，也偷不走密钥去伪造签名。

---

## 二、「全部事件」在总线没有通配订阅时怎么落

这是本批最需要讲清楚的一处设计约束。

- `ctx.emit`（cordis）是**同步**的：监听器里若 `await`，就会把写路径（保存文件、拖拽卡片）卡在
  一次网络 I/O 上。所以监听器**先裁剪载荷、再异步入队、立即返回**。
- 单个监听器**抛错会被 try/catch 吞掉**，不冒泡进调用方 —— 一个订阅方的地址写错，绝不能让用户
  的「保存文件」失败。
- 总线**没有通配订阅**，所以「全部事件」落成对每个事件名各挂一个 `ctx.on`（`LISTEN` 常量，7 项）。
  这也意味着**事件目录与 `LISTEN` 必须同步**，改一边不改另一边会静默漏投 —— 用测试钉死（见第四节）。
- 投递走**每个订阅一条串行链**（`Map<hookId, Promise>`）：某个黑洞地址只会拖慢它自己的队列，
  不牵连别的订阅；同一订阅内部天然保持顺序。

### 积压保护

每个订阅的待投递队列有上限（50 条），超了**丢弃并计数**（`dropped`），不无界排队 —— 否则一个
长时间不可达的地址会让内存一直涨。

---

## 三、两个新事件

本插件要「全事件」，但总线当时只有 5 个事件，缺任务与看板两类。故新增：

| 事件 | 载荷 | 来源 |
| --- | --- | --- |
| `task:changed` | `{project, action, cardId?, title?, columnId?, fromColumnId?}`，`action ∈ card-create/card-update/card-move/card-delete/column-create/column-update/column-delete` | `plugins/privhub-task-board/src/index.ts` |
| `dashboard:changed` | `{project, action:'write'\|'reset', revision, sections}` | `plugins/privhub-project-dashboard/src/index.ts` |

- 契约类型加在 `plugins/privhub-core/src/events.ts`（`TaskChangedPayload` / `DashboardChangedPayload` +
  `declare module` 合并）。
- `plugins/privhub-svc-events/src/index.ts` 的注册表文档同步列全 7 个事件（含 emit/listen 两侧）。
- `card-move` 的 `fromColumnId` 只在**真的换了列**时才带（`movedFrom && movedFrom !== toColumnId`），
  免得订阅方为一次同列内的排序收到一个「假移动」。
- **既有 5 个事件一个未动**，只新增。

---

## 四、防放大与重试口径

### `file:saved` 必须裁剪（否则是放大器）

`file:saved` 的载荷里带**整篇文档正文**（`doc`，见 `privhub-core/events.ts`），一篇笔记可以几 MB。
原样转发有三个后果：接收端多半只想知道「哪个文件被保存了」，塞全文既慢又没用；一次保存就把订阅方的
磁盘/带宽吃掉；投递日志会把正文在 `data/webhook-log.json` 里留一份，正文的加密边界被打散。

所以 `file:saved` 的投递载荷只带 `docBytes` + `docPreview`（前 500 字）+ `docTruncated`。
需要全文的订阅方拿 `project` + `path` 去读文件接口 —— 那才是鉴权正确的路。

> **踩过的真 bug：`trimPayload` 必须幂等。** 它在两处被调用 —— 入队时（尽早释放正文内存）与构造正文时
> （信封大小守卫的入口）。第一版不幂等：第二次调用看不到 `doc`，却把 `docBytes` 覆写成 `0`、
> `docPreview` 覆写成空串 —— 订阅方拿到一份「字节数为 0」的假摘要。
> 修法：`if (typeof o.doc !== 'string') return data`（没有 `doc` 就原样返回），并删掉 index.ts 里
> 那份重复的裁剪函数，统一用 core 的 `trimPayload`。测试断言 `期望 4000，实际 0` 抓出来的就是这个。

### 正文上限

信封超 32 KB 时**降级为极简信封**并标 `truncated: true`（正文换成一句「载荷超过上限已省略」），
订阅方据 `x-privhub-event` 判断类型后再走接口取详情。降级后的正文同样进日志 —— 日志里记的就是
**实际发出去的那串**。

### 重试分类

一个只会 `if (!res.ok) 重试` 的实现，会在对端回 404/400（地址写错、路径变更）时把同一个**必然失败**
的请求重试满次数 —— 既救不回来，又给对端加了三倍负载。故 `classifyStatus` 分两类：

| 结果 | 处理 |
| --- | --- |
| `2xx` | 成功，收工 |
| 网络不通（`status 0`）/ `408` / `429` / `5xx` | **可重试**（通常是暂时状况） |
| 其余 `4xx` | **终态失败**（重试无意义） |

总尝试 3 次（1 首发 + 2 重试），退避 500 / 1500 ms，单次超时 8 s。重试中途若订阅被删/被禁用，
立即停手，不再往一个已经关掉的订阅上投。

---

## 五、存储

| 文件 | 读法 | 理由 |
| --- | --- | --- |
| `data/webhooks.json` | **严格读**（`readJsonStore`：损坏即隔离 + 抛错，绝不返回兜底）+ 写前 `assertStoreWritable` | 订阅配置是**不可重建**的（用户手配的地址与密钥，丢了要一条条重配） |
| `data/webhook-log.json` | **宽松读**（`readJsonStoreLenient`：损坏即隔离 + 记日志 + 返回兜底） | 投递日志是**可重建**的派生数据，不值得为它阻断启动 |

配置损坏时，`list` 路由回 `corrupt: true`，界面明说「配置文件损坏，已在 XX 隔离，请重建」，
而不是假装「你没有任何订阅」。两文件的写入串行化到同一条 `writeChain`。

日志 300 条**环形**（新的在前），订阅统计（`delivered`/`failed`/`lastAt`/`lastStatus`/`lastError`）
存在订阅对象上。**注意口径**：`stats().delivered`/`dropped` 是**本次进程启动以来**的计数，
界面文案写的是「本次启动以来成功 N 条」，不是累计 —— 累计要看每条订阅自己的 `delivered/failed`。

---

## 六、路由（全部仅管理员）

鉴权串联：`requireUser(401) → role!=='admin'(403)`，顺序 **method → auth → authz → work**。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/privhub/api/webhook/list` | 订阅列表（剥 secret）+ 运行计数 |
| GET | `/privhub/api/webhook/events` | 可订阅事件目录 + 每事件近期投递数 + `ping`/`limits` |
| POST | `/privhub/api/webhook/save` | 新建/保存；新建时**回显一次**生成的密钥 |
| POST | `/privhub/api/webhook/delete` | 删除订阅 |
| POST | `/privhub/api/webhook/toggle` | 启停 |
| GET | `/privhub/api/webhook/deliveries` | 投递日志（可按订阅过滤） |
| POST | `/privhub/api/webhook/replay` | 人工重放某条记录（同事件、新投递 id、带 `replayOf`） |
| POST | `/privhub/api/webhook/test` | 发一次测试投递（只发给被点的那个订阅，事件名 `ping`） |

界面：`client/`（`admin-webhook` 槽），管理控制台路由 `ops/webhook`（`admin-console/client/routes.js`）。
面板为左订阅列表 / 右表单 / 下投递日志表，含「重放」「发测试」「只看这条订阅的日志」。
**接线不需要动骨架 `frontend/index.html`** —— admin 面板走 `admin-console` 的 `slotComps` 分发，
`index.html:951` 的 `this.slotComps[slot] || (this.slotComps[slot] = [])` 会为新槽自建数组
（与任务日历那种主视图不同，后者必须动骨架三处）。

---

## 七、回归

`node tests/run-all.mjs --spawn`（隔离实例 3190）：

```
HTTP 套件    214 通过 / 0 失败   （含本批新增：webhook 23）
静态与冷启动 1226 通过 / 0 失败
合计         1440 通过 / 0 失败   退出码 0
```

对照上一批（引用检查 + 任务日历）的 191 / 1217 = 1408，本批 **+32**
（HTTP +23 webhook，静态 +9 integrity）。

- `tests/webhook.mjs`（23 条）：自带本地 sink（`127.0.0.1:0`），校验**对收到的那串原始字节**验签、
  事件过滤、项目过滤、禁用/删除后不再投递、5xx 恰好重试 3 次、连不上 `httpStatus:null`、404 一次即终态、
  重放、密钥只回显一次且列表不含密钥、`file:saved` 不放大、`task:changed` 有序、权限 401/403。
- `tests/integrity.mjs` +9：manifest 槽/视图/`adminOnly`、routes 引用、`src/index.ts` 存在，
  以及**反漂移三连** —— 事件目录 ⊇ 全仓所有 `ctx.emit('x'` 的事件名（7）、目录里没有幽灵事件、
  每个目录名都出现在 `LISTEN` 块内。
- `tests/run-all.mjs`：登记 `webhook` 套件（**须最后跑**，它的清理保证不留任何订阅）。

---

## 八、改动落点

产品代码：

- `plugins/privhub-webhook/src/core.ts`（新，纯逻辑）、`src/index.ts`（新，服务端）、
  `client/index.js`（新）、`client/manifest.json`（新）、`package.json`（新）。
- `plugins/privhub-core/src/events.ts`（+`TaskChangedPayload` / `DashboardChangedPayload`）。
- `plugins/privhub-task-board/src/index.ts`（+`task:changed` 的 7 处 emit）。
- `plugins/privhub-project-dashboard/src/index.ts`（+`dashboard:changed` 的 2 处 emit）。
- `plugins/privhub-svc-events/src/index.ts`（注册表文档同步至 7 事件）。
- `plugins/privhub-admin-console/client/routes.js`（+`ops/webhook` 路由）。

测试：

- `tests/webhook.mjs`（新）、`tests/integrity.mjs`（+9）、`tests/run-all.mjs`（登记）。

---

## 九、诚实备注

- **既有测试断言只改了一条**：`tests/admin-console.mjs` 的管理路由条数 `13 → 14`。该断言是
  **精确花名册**（本批新增一条 console 路由，就必须 +1），已在原处加 3 行注释说明它为何要随新路由增长。
  这是本批**唯一**一处改动既有断言的落点，**已如实登记，请知悉**。
- **没有在浏览器里目视验证这个面板的实际观感。** 已验证的是：L3 发现到本插件、带会话 cookie 的
  `/privhub/api/shell/manifest` 确实返回它、`/privhub-plugins/privhub-webhook/index.js` 带 cookie 返回 200、
  8 条路由在开发实例（3180）上功能正常、`frontend-templates.mjs` 用真 Vue 3.5 编译 **66 个模板**
  零错误零警告且插值变量全部有定义（含本批新增面板）。观感（配色、间距、窄屏换行）仍需用户自己看一眼。
- **回归总数口径**：`214 / 1226 = 1440`。其中静态 1226 由 18 行套件输出相加得到
  （26+76+373+16+82+3+92+64+40+79+25+61+87+34+94+53+21，另含一个自带子进程的 25）。
  上一次汇总脚本的正则漏配了含 `/`、`+`、`.doc` 的行，故本批改按**逐行枚举**重算，不引用旧脚本的合计。
- **密钥长度**：自定义密钥最短 8 字符（留空则由系统生成 48 位十六进制）。这是**刻意宽松**的下限
  —— 生产方的接收端往往用自己的约定，硬性要求长密钥反而挡住集成；密钥质量由用户与接收端负责。
- 本批**未提交、未推送**（等用户授权）。
