# PrivHub Agent API 方案（企业级 v3.1）

> 日期：2026-09-03 · 状态：**方案已确认（企业级 v3.1，四修订：配额 1GB / 并发排队 / 月度 key / 通道隔离）** · 取代 v2（v2 决策全部保留，本版为工程规范升级）
> 目标：为局域网智能体提供**企业级生产标准**的文件读写 API 网关，落地于 L3 插件 `privhub-files-agent`：
> 项目只读 + 用户专属空间全能力（读/写/删/改）+ 一项目一 Key + 全链路治理（认证/授权/配额/限流/审计/观测/熔断）。
> 约束：宿主机为低配 Windows 原生环境 → **零外部依赖**（不引入 Redis/Postgres/消息队列），企业级能力全部以 Node 内置实现（文件/JSONL/内存指标），强调工程严谨而非组件堆砌。
> 基础文档：`PrivHub-架构与功能说明.md` / `PrivHub-需求文件.md`（C22）
>
> ⚠️ **本文是设计期记录（2026-09-03），部分内容已被 v3.0.1 取代**，阅读时请以下列为准：
> - 写入落点：`.agents/<用户>/<项目>/` → **该账号的「个人空间」`data-files/<真实姓名>/`**
>   （个人空间 = 仅本人可见、管理员也读不到、不进查重/向量化/全文索引、永不自动删除；它同时就是沙箱）
> - `/schema`：由「无鉴权」改为**需登录会话或有效密钥**（接口清单即地址规则）
> - 新增 `GET /agent/v1/console`（网页会话通道，与 Agent 密钥通道分离）+ 开发者平台界面 `shell-agent-console`
> - 自助密钥**禁止 `all` scope**（`AGENT-4035`）；新增 `AGENT-4036`（绑定账号未开通个人空间）
> - **当前实操口径**见《PrivHub-AgentAPI-接入指南.md》；完整变更见仓库根 `CHANGELOG.md`

---

## 一、设计原则（企业级基线）

| 原则 | 落地要求 |
|---|---|
| P1 最小权限 | Key 只给「用户 + 项目/目录 scope」交集内的最小权限；读取与写入分区（项目只读 / 专属空间全能力） |
| P2 默认拒绝 | 一切未显式授权的能力默认 403；路径越界、scope 越权、未知 action 一律拒绝 |
| P3 可审计 | 每笔调用可追溯到 key/用户/时间/动作/字节/结果；审计防篡改（哈希链） |
| P4 可观测 | 调用日志（运维）与审计（合规）分离；指标端点；健康检查；异常事件可消费 |
| P5 可治理 | Key 全生命周期管理（生成/审批/挂起/恢复/轮换/吊销/过期）；配额可见可调；一键熔断 |
| P6 可靠 | 幂等写入、乐观并发（ETag）、同路径写串行化、原子落盘（tmp+rename）、版本快照 |
| P7 兼容演进 | API 版本化（/v1 稳定契约）、OpenAPI 3.1 描述、结构化错误码、Sunset 流程 |
| P8 低依赖 | 全部能力 Node 内建实现；配置驱动（插件 Config）；不引入外部存储/服务 |

---

## 二、总体架构

```
┌───────────────────────── 局域网智能体（Claude Code / Codex / DSH / 定制 Agent）─────────────────────────┐
│  REST /agent/v1/*  ·  OpenAPI 3.1  ·  MCP(SSE)  ·  X-Agent-Key  ·  X-Idempotency-Key  ·  If-Match          │
└──────────────────────────────────┬───────────────────────────────────────────────────────────────────────┘
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ privhub-files-agent（L3 插件，零外部依赖）                                                                  │
│                                                                                                          │
│  ① 网关层    认证(Key 哈希校验) · 授权(scope 矩阵) · 限流(持久化多维) · 配额 · 幂等 · 错误码 · 请求 ID      │
│  ② 能力层    list / read / write / fork / rename / delete / search(二期)                                  │
│  ③ 治理层    Key 生命周期管理 · 条件访问(IP 白名单) · 用量统计 · 熔断                                      │
│  ④ 观测层    调用日志 JSONL · 审计 JSONL(哈希链) · /healthz · /metrics(Prometheus 文本) · 事件广播          │
│  ⑤ 数据层    data/agent-keys.json(哈希) · agent-calls.jsonl · agent-audit.jsonl · agent-quota.json        │
│              agent-idem/ (幂等记录) · .agents/<user>/<project>/ (专属空间，S7 加密)                          │
└──────────────┬──────────────────────────────┬──────────────────────────────┬─────────────────────────────┘
               ▼                              ▼                              ▼
        ctx.privhub(core)              ctx.acl(S2) 文件级                 ctx.audit(S1) 既有审计
        canAccess/resolveReal/         view 裁决(项目读)                  写入动作并入既有审计面板
        listFiles/moveToTrash          + versions 快照(覆盖)
               ▼
        ctx.storage(S7) — AES-256-GCM 静态加密 · 流式写 · 原子 rename
```

---

## 三、密钥治理（Key Management）

### 3.1 数据结构（data/agent-keys.json，S7 加密存储，**只存哈希**）

```jsonc
{
  "version": 2,
  "keys": [{
    "id": "k_<16hex>",                      // 稳定 ID（吊销/轮换/报告用）
    "name": "审批群智能体-项目A",             // 用途声明（≤64 字）
    "type": "user",                          // user | admin（admin=代生成托管，权限仍以绑定用户为准）
    "username": "zhangsan",                  // 绑定用户（权限判定基准）
    "scope": { "kind": "project",            // project | directory | all
               "project": "A项目",
               "path": "" },                 // kind=directory 时限定项目内目录
    "status": "active",                      // active | suspended | revoked | expired
    "expiresAt": 0,                          // 自然月周期：创建时置「当月最后一天 23:59:59.999（本地时区）」
    "ipWhitelist": ["192.168.1.0/24"],       // 条件访问：空=不限；IPv4 CIDR（Node 内建实现）
    "keyHash": "sha256:<64hex>",             // 仅哈希，明文永不落盘
    "rateLimit": null,                       // 覆盖全局限流（可选）
    "createdBy": "admin",                    // 创建人（admin 代生成）/ 自助=username
    "approvedBy": null,                      // 审批人（审批流开启时）
    "at": 1725300000000, "lastUsedAt": 0, "usageCount": 0
  }]
}
```

- **哈希存储**：`keyHash = sha256(key)`。Key 为 128-bit CSPRNG 随机值，sha256 无盐足够（无查表攻击面）；比对用恒定时间。
- **前缀与显示**：`pha_<32hex>`；列表/日志仅 mask（`pha_3f2a…`）；明文仅在创建响应中返回一次（HTTP 200 + 一次性明文，此后任何接口不可复得）。
- **状态机**：

```
created ──▶ active ──▶ suspended ──▶ active (resume)
   │          │           │
   │          ├──▶ expired（expiresAt 到点自动判定，惰性生效）
   │          └──▶ revoked（吊销，立即失效，不可恢复）
   └──（审批流开启时）pending ──▶ active / rejected
```

- 吊销后同 ID 不可重建（防旧凭据复活）；轮换 = 发新 key + 旧 key 进入宽限期（grace 默认 24h，参数化）后自动 revoked。

### 3.2 生命周期操作（管理端点，adminOnly + 用户自助子集）

| 操作 | 端点 | 说明 |
|---|---|---|
| 创建 | POST `/keys` | admin：选用户 + name + scope + 有效期 + IP 白名单（可选） |
| 自助创建 | POST `/my-keys` | 登录态用户：绑定自己，scope 限于自己可见项目；「all」需二次确认 |
| 列表 | GET `/keys` `/my-keys` | mask / 状态 / 用量 / 到期日；支持按状态过滤 |
| 挂起/恢复 | POST `/keys/{id}/suspend\|resume` | 可疑活动一键熔断，可恢复（无数据损失） |
| 轮换 | POST `/keys/{id}/rotate` | 换发新 key，旧 key 宽限期后吊销；**生产强制轮换纪律** |
| 吊销 | DELETE `/keys/{id}` | 立即失效，不可恢复；审计记录 |
| 用量 | GET `/keys/usage?from=&to=` | 按 key/用户/项目聚合：调用次数、读写字节、错误数；CSV 导出 |
| 审批（可选） | POST `/keys/{id}/approve\|reject` | 配置 `approvalRequired: true` 时启用（企业审批流） |

### 3.3 条件访问（可选增强）

- **IP 白名单**：key 级 `ipWhitelist`（IPv4 CIDR），命中才放行；全局默认网段可配置。
- **时间窗**（二期可选）：只允许工作时间调用（config 可配）。
- 命中失败计入调用日志 + 审计（安全事件）。

### 3.4 密钥周期策略（自然月强制轮换）

| 项 | 规则 |
|---|---|
| 有效期 | key 自创建时刻至**当月自然月末 23:59:59.999（本地时区）**；无「永久」选项（企业强制轮换纪律） |
| 到期前预警 | 剩余 <7 天起，**所有响应附加 `X-Key-Expires: <ISO8601>` 头**；/me 与 /schema 附到期日字段——智能体接入方可提前换 key |
| 到期处理 | 到期即失效（AGENT-4011）；**不设宽限**（月度周期短，强制纪律）+ 文档/接入 skill 明示 |
| 续期 | 控制台/自助「一键续期」= 签发同用户同 scope 的新 key（新周期，**明文仅一次**）；旧 key 不自动吊销——允许新旧并跑至旧 key 到期自然消除（平滑迁移，无断点） |
| 轮换审计 | 签发/续期/吊销均入审计 + 调用日志 `keyGeneration` 事件 |
| 强制保障 | 状态机内不再存在「永久」分支；config `forceExpiryDays` 移除，改为 `keyCycle: 'monthly'`（预留 `quarterly` 扩展） |

---

## 四、授权模型（scope 矩阵）

### 4.1 权限判定链（每请求，逐层校验，全过才放行）

```
① Key 有效（哈希比对、状态 active、未过期、过期惰性刷新）
② 条件访问（IP 白名单）
③ 绑定用户存在且未禁用
④ Scope 校验：目标路径 ∈ key.scope（project / directory / all ∩ 用户可见项目）
⑤ 项目读：svc.canAccess(绑定用户, project) + ctx.acl.can(view) + resolveReal
   专属空间：分区目录为 resolveReal base（.agents/<user>/<scope 对应目录>/）
⑥ 动作权限：读操作 vs 写操作分区（见矩阵）
⑦ 配额与限流
⑧ 幂等（写类）与并发控制
```

### 4.2 动作 × 位置矩阵

| 动作 | 项目（可见 scope 内） | 专属空间 `.agents/<u>/<p>/` |
|---|---|---|
| list / read | ✅ 只读（ACL view） | ✅ |
| write（新建/覆盖） | ❌ **403「项目只读」** | ✅ upsert + 版本快照 |
| fork（复制到专属空间） | ✅ 源只读 | ✅ 目标（分区内） |
| rename / delete | ❌ 403 | ✅（delete 进回收站，见 §7.4） |
| search（二期） | ✅ scope 限定 | ✅ |

> 硬隔离在网关层实现（动作分发前按目标位置判定），不依赖智能体自律；schema 与文档同时明示。

### 4.3 敏感文件豁免（默认）

- 扩展名黑名单（可配置）**禁止经 API 读/写**：`.key .pem .p12 .pfx .crt .env .git-credentials .htpasswd`——命中 403（code AGENT-4033）。
- 专属空间写同样执行（防止智能体间接搬运敏感物）。

---

## 五、API 规范（企业级契约）

### 5.1 版本与发现

- 前缀 `/privhub/api/agent/v1/`（稳定契约）；破坏性变更一律进 v2，v1 走 Sunset（响应 `Sunset` + `Deprecation` 头）。
- 发现端点（无鉴权，仅暴露元数据，不泄露业务信息）：
  - `GET /schema` —— OpenAPI 3.1 风格能力描述（动态生成，含全部端点参数/错误码/示例）
  - `GET /openapi.json` —— 标准 OpenAPI 文档（可直接导入 Postman/Apidog/生成 SDK）
  - `GET /healthz` —— 进程 + 存储就绪（`{ ok, storage:'rw', ts, version }`）
  - `GET /metrics` —— Prometheus 文本格式（仅内网/白名单可访问）

### 5.2 端点总表

| Method | Path | 鉴权 | 说明 |
|---|---|---|---|
| GET | `/schema` `/openapi.json` | 无 | 能力自描述 / OpenAPI 3.1 |
| GET | `/healthz` `/metrics` | 无（metrics 可限 IP） | 健康 / 指标 |
| GET | `/me` | Key | 绑定用户、可见项目、专属空间路径 |
| GET | `/projects` | Key | 可见项目列表 |
| GET | `/list` | Key | 目录列表（cursor 分页） |
| GET | `/read` | Key | 文本/二进制读（ETag） |
| POST | `/write` | Key | 专属空间写（幂等 + If-Match + 版本快照） |
| POST | `/fork` | Key | 项目文件 → 专属空间（流式，≤200MB） |
| POST | `/rename` | Key | 专属空间重命名 |
| POST | `/delete` | Key | 专属空间删除 → 回收站 |
| GET | `/search` | Key | 二期（svc-search 复用 + scope 限定） |
| GET/POST/DELETE | `/keys` | admin 登录态 | 密钥治理（§3.2） |
| POST | `/keys/{id}/suspend\|resume\|rotate` | admin | 状态机操作 |
| GET/POST/DELETE | `/my-keys` | 登录态 | 用户自助 |
| GET | `/keys/usage` | admin | 用量报告 + CSV |

### 5.3 结构化错误码（LLM 可直接消费）

| HTTP | Code | 含义 | Hint（随响应返回） |
|---|---|---|---|
| 400 | AGENT-4001 | 参数缺失/非法 | 指明字段 |
| 401 | AGENT-4010 | 无效/缺失 Key | 检查 X-Agent-Key |
| 401 | AGENT-4011 | Key 已过期 | 续期或重建 |
| 401 | AGENT-4012 | Key 已吊销 | 联系管理员 |
| 401 | AGENT-4013 | Key 已挂起 | 联系管理员（自动挂起原因附 detail） |
| 401 | AGENT-4014 | IP 不在白名单 | 检查来源 IP |
| 403 | AGENT-4031 | 超出 Key scope | 目标不在授权范围 |
| 403 | AGENT-4032 | 项目只读 | 写入仅限专属空间 |
| 403 | AGENT-4033 | 敏感文件豁免 | 调整目标名称/位置 |
| 403 | AGENT-4034 | 绑定用户无项目权限 | 联系管理员开通 |
| 404 | AGENT-4041 | 文件/目录不存在 | — |
| 409 | AGENT-4091 | 并发版本冲突 | 重新 read 取新 ETag |
| 409 | AGENT-4092 | 幂等键已用于不同请求体 | 更换 Idempotency-Key |
| 413 | AGENT-4131 | 超出大小上限 | 附限额值 |
| 429 | AGENT-4291 | 限流触发 | 附 Retry-After（秒） |
| 429 | AGENT-4292 | 配额超限 | 附配额/用量 |
| 429 | AGENT-4293 | 写队列已满 | 附队列上限与当前队位，稍后重试 |
| 429 | AGENT-4294 | 排队超时 | 附等待秒数，可安全重试（幂等前置防重复写） |
| 500 | AGENT-5001 | 内部错误 | 附 requestId（查调用日志） |
| 503 | AGENT-5031 | 存储不可写 | 维护中 |

响应统一 envelope：`{ ok, code, error, hint, requestId, ...data }`；`X-Request-Id` 响应头贯穿调用日志与审计。

### 5.4 分页 / 读取 / 写入契约

- **分页**：`GET /list?cursor=&limit=`（limit 默认 200，max 500；`nextCursor` 为空=末页；cursor 为 base64 的 `dir|offset`，防偏移猜测）。
- **读取**：`GET /read`：
  - `encoding=text`：智能编码检测（UTF-8→GBK 回退）；`maxBytes`（默认 1MB，上限 4MB），超限截断 + `truncated:true`；响应带 `ETag: sha256(前 64KB+size)`。
  - `encoding=base64`：二进制 ≤20MB。
  - 可选 `range`（二期）：字节区间流式读。
- **写入**：`POST /write`：
  - 请求头 `X-Idempotency-Key`（写类必填）：同一 key + 同一请求体哈希 → 返回首次结果（记录存 `data/agent-idem/`，TTL 24h，防智能体重试重复写）。
  - 请求头 `If-Match: <etag>`（可选）：命中才写，否则 409 AGENT-4091（乐观并发，防覆盖他人的并发编辑）。
  - 写入流程：幂等检查 → 版本快照（覆盖前，滚动保留 20 版，复用 versions 数据格式）→ 临时文件流式加密 → fsync → rename 原子替换 → 索引/元数据更新 → 审计。
  - `dryRun: true`（可选）：返回将执行的写结果（路径/目标存在性/大小/配额水位）但不落盘——智能体决策前预览。

---

## 六、配额与限流（持久化、多维）

### 6.1 限流（每维度独立桶，滑动窗口）

| 维度 | 默认 | 说明 |
|---|---|---|
| Key | 读 600/min | 读限流；**写类不限流，由 §6.3 并发排队闸门约束**（可 key 级覆盖 rateLimit） |
| 用户（该用户全部 key 合计） | 读 1200/min | 防多 key 并发绕过（读） |
| IP | 3000/min | 防单机打爆（读） |

- 实现：内存滑动窗口计数 + **周期落盘**（`data/agent-quota.json`，每 60s 或 200 次变更 flush；重启恢复窗口，不清零——企业级不因重启丢限流状态）。持久化粒度：活跃桶快照（LRU 上限 5000 桶）。
- 标准响应头：`X-RateLimit-Limit / Remaining / Reset`；429 响应附 `Retry-After`（秒，进程内最小剩余）。

### 6.2 配额（专属空间存量为王）

| 配额项 | 默认 | 说明 |
|---|---|---|
| 专属空间存量 | **1GB/用户**（可配） | 写入前预检，超限 429 AGENT-4292 + 报告当前用量 |
| 单文件大小 | text 4MB · 二进制 200MB | 413 AGENT-4131 |
| 日写次数 | **不限额** | 由并发排队（§6.3）+ 配额存量 + 审计共同约束，防滥用靠异常检测而非次数上限 |

- 用量统计口径 = 明文实际字节（S7 解密后），与 UI 展示一致。
- 增删改都实时回写配额账本（agent-quota.json），管理员页可见水位条。

### 6.3 写并发排队（请求排队机制，类网关 accept-queue）

日写不限额，但**写类请求并发受闸门控制**：超过并发上限的写请求进入有界 FIFO 队列等待执行（读类不限并发，仍走 §6.1 限流）。

| 参数 | 默认 | 说明 |
|---|---|---|
| 写并发上限 | **8**（可配） | 同时执行的写类请求（write/fork/rename/delete）数 |
| 队列容量 | **100**（可配） | 超并发即入队；**队列满 → 429 AGENT-4293「队列已满，请稍后重试」**（不无限堆积，防打爆内存） |
| 排队超时 | **30s**（可配） | 在队超过超时 → 429 AGENT-4294「排队超时」（附当前队位，智能体可重试） |
| 队内幂等 | — | **幂等前置**：入队前先查 X-Idempotency-Key 记录表，命中重复请求直接返回首次结果，**不占队位**（重试几乎零成本） |

- **调度**：FIFO + 队内优先级（可选二期：同 key 写同路径保持原序，不同路径可并发执行——per-path 锁已在 §七保证同路径不交错）。
- **透明性响应头**（排队期间附加）：
  - `X-Queue-Position: n`（队位）
  - `X-Queue-Wait-Ms: 1234`（预计等待毫秒，按前序请求平均耗时估）
  - `X-Queue-Limit: 100`
- **语义**：排队 ≠ 拒绝——写请求保证「要么成功、要么明确失败（429/超时）」，绝不静默丢弃；`dryRun` 不占队列。
- **一致性**：队列状态存内存（单实例）；优雅关闭时拒绝新入队并等待在队请求完成（≤超时）后 flush 退出。

---

## 七、可靠性设计

| 机制 | 实现 |
|---|---|
| 原子写 | tmp 文件 + fsync + rename（沿用 upload 通道，扩展 fsync） |
| 幂等写 | X-Idempotency-Key（写类必填）+ 24h 记录表（TTL 清理） |
| 乐观并发 | read 给 ETag；write 可选 If-Match；冲突 409 + 指引重新拉取 |
| 同路径串行 | 进程内 per-path 互斥（Map<path, Promise chain>），同一目标写入排队，防交错 |
| 版本快照 | 覆盖前快照（复用 privhub-files-versions 存储格式，滚动 20 版，删除时一并清理）——替代 v2 的 .bak 5 份 |
| fork 大文件 | ≤200MB 流式复制（源只读、目标分区），失败不留半截（tmp+rename） |
| 回收站 | 专属空间 delete 复用 .trash：TrashRecord.project='.agents/<user>'；恢复/彻底删除走管理控制台（admin）或收件箱（二期用户自助） |
| 断点续传 | 二期（range + If-Range） |
| 优雅关闭 | SIGTERM：停止接受新请求 → flush 限流/配额账本 → 关闭监听（对齐 main.ts shutdown） |

---

## 八、可观测性（运维与合规分离）

### 8.1 调用日志（运维）— data/agent-calls.jsonl（保留 60 天，可配，轮转 4 卷）

```jsonc
{ "ts": 1725300000000, "requestId": "ag_<hex>", "keyId": "k_…", "user": "zhangsan",
  "action": "write", "path": ".agents/zhangsan/A项目/x.md", "status": 200, "code": null,
  "ms": 42, "bytes": 1536, "ip": "192.168.1.10", "src": "cli-v3.2" }
```

### 8.2 审计日志（合规）— data/agent-audit.jsonl（保留 180 天，可配；**哈希链防篡改**）

- 每条 `{ ts, prevHash, requestId, keyId, username, action, path, paramDigest, result }`，`hash = sha256(本条 JSON)`；追加写，周期性校验链完整性（启动自检 + 每日自检事件）。
- 与既有 `ctx.audit`（S1）双写：S1 审计面板（user=`ai:<label>`）保持可见；本文条链为 Agent API 专属合规账本。

### 8.3 指标（Prometheus 文本格式，/metrics）

```
agent_requests_total{action,status,scope}
agent_request_duration_sum{action} / _count       # 平均延迟可算
agent_write_bytes_total{keyid? 降基=user}
agent_quota_usage_bytes{user}
agent_keys_active / agent_keys_revoked_total
agent_ids_total{reason}                            # 冲突/幂等命中/限流计数
```

### 8.4 事件与告警（轻量，可被前端面板消费）

- `ctx.emit('agent:suspicious', rec)`：连续 5 次 401、单 key 突发 >5× 均值、写覆盖率突增、**通道违规**（§11 非浏览器 UA 使用网页会话、浏览器 UA 调 Agent 端点）→ 触发**自动挂起**（suspended，管理员查证后 resume）；事件进既有事件总线（audit:logged 同款机制）。

---

## 九、管理控制台（前端 client 插件）

| 区块 | 能力 |
|---|---|
| 密钥管理（admin） | 创建（用户/name/scope/有效期/IP 白名单）、状态机操作（挂起/恢复/轮换/吊销）、**一键续期（月度新 key）**、mask 列表、到期预警（<7 天高亮） |
| 我的密钥（用户自助） | 自助申请（scope 限自己可见项目，all 需二次确认）、查看 mask/用量、自助吊销 |
| 用量仪表盘（admin） | TOP key 调用量、错误率、配额水位（专属空间存量）、写队列水位（并发/队位/超时命中）、近 24h 趋势图 |
| 专属空间回收站（admin） | 按用户名过滤：删除记录 + 恢复 + 彻底删除（全部审计） |
| 调用日志查询（admin） | 按 key/用户/动作/状态/时间窗筛选，导出 CSV |
| 异常事件（admin） | 自动挂起列表 + 原因 + 恢复操作 |
| 活跃会话与通道（admin） | 当前登录会话列表（用户/IP/UA/登录时间）+ 通道违规事件清单（§11）+ 会话停用操作 |

---

## 十、智能体接入（企业交付物）

1. **正规创建路径（强制）**：智能体**无法自助取得 key**——key 只能由登录态用户（自助）或 admin（代生成）经控制台签发，智能体无登录态、无自举通道（control-plane 与 data-plane 分离）。首次接入必须由人工授予，杜绝智能体自我授权。
2. **首次接入 Skill（交付物）**：`docs/PrivHub-AgentAPI-接入指南.md` 内嵌「接入 Skill」节（frontmatter + 步骤化指令，供 LLM 智能体直接加载）：
   - ① 要求人工在控制台创建 key（指明路径/表单项）→ ② 以环境变量/配置注入 key（不落仓库、不进日志）→ ③ 调 `/me` 验证身份与专属空间 → ④ 读取 `/schema` 学习边界 → ⑤ **月度周期纪律**：到期前 7 天 `X-Key-Expires` 头触发续期流程（人工一键续期，新 key 立即替换）→ ⑥ 违规红线重申（项目只读/敏感文件豁免/仅走 Agent 通道）。
   - Skill 声明式段落可被 Claude Code / Codex 等直接引用；首次接入必须完成步骤 ③④ 后才可作业。
3. **OpenAPI 3.1**：`/openapi.json`（导入 Postman/Apidog/任意 SDK 生成器）。
4. **LLM 工具模板**：`/schema` 直接产出 OpenAI function calling / Anthropic tool JSON；接入文档含完整示例（Python requests / Node fetch / curl）。
5. **MCP 端点**（一期即含）：`GET /agent/mcp`（SSE + JSON-RPC 2.0，tools 映射同一能力层）——Claude Desktop / Cursor 原生接入，**满足 C22「MCP」立项原文**。
6. **边界声明**：schema + 文档明示「项目只读、写入限专属空间、敏感文件豁免、仅 Agent 通道」，服务端 403 兜底。
7. **人工复核路径**：生成物落在 `.agents/<user>/<project>/`，二期「AI 收件箱」支持用户查看/归档/恢复自己的回收站；一期 admin 控制台全覆盖。

---

## 十一、安全加固汇总

| 域 | 项 |
|---|---|
| 传输 | 内网 http；**生产建议前置反代终止 TLS**（Nginx/Caddy，配置样例进部署文档）；二期可内置 https（自研 webServer 加 https.createServer） |
| 凭据 | Key 哈希存储；明文一次性；mask 展示；恒定时间比对 |
| 授权 | scope 矩阵（§4.2）+ 敏感文件豁免（§4.3）+ 逐请求五重校验 |
| 滥用 | 多维限流（§6.1）、自动挂起（§8.4）、一键熔断（suspend）、配额硬顶 |
| 数据 | S7 加密落盘（沿用）、路径穿越/符号链接防护（resolveReal）、写原子性 |
| 合规 | 审计哈希链（§8.2）、调用日志保留策略、CSV 导出 |
| 边界 | 不提供项目写/删/改（403 硬隔离）；删除走回收站；幂等+并发防重放/防覆盖 |
| 通道 | **网页通道与 Agent 通道硬隔离**（§11.1）：智能体只能走 X-Agent-Key 通道，禁止借网页会话操作服务端文件 |

### 11.1 通道隔离（防智能体借网页通道操作文件）

风险：具备浏览器能力的 AI Agent（computer-use / browser 类）若获得用户登录会话（token/Cookie），可经普通网页 API（/privhub/api/upload、delete 等）读写服务端文件，绕过 Agent API 的全部治理。隔离策略（默认开启，config `channelIsolation: true`）：

| 通道 | 凭据 | UA 约束 | 违规处置 |
|---|---|---|---|
| Agent API（/agent/v1/*） | 仅 `X-Agent-Key` | **拒绝浏览器 UA**（含 headless 标记） | 401/403 + 安全事件 |
| 网页 API（/privhub/api/*） | session token（现有） | **仅接受浏览器 UA**；非浏览器 UA（curl/python-requests/agent SDK）使用 session token = 通道违规 | **事件 + 该会话自动停用** + 审计「channel violation」；管理员控制台可见并恢复 |
| 管理端点（keys/my-keys） | 登录态 | 浏览器 UA 优先；管理操作记录 UA 与来源 IP | 非浏览器 UA 调管理端点 → 事件 + 会话停用（防智能体自助签发 key） |

- 判定依据：`User-Agent` 头 + 会话创建/最后使用 UA 绑定比对（会话记录同时存储创建 UA，不一致即可疑）。
- **不阻断正常运维**：管理员可用浏览器管理；自动化运维走 Agent API（key 通道）。
- 豁免名单（config `uaAllowlist`，默认空）：公司自有运维脚本可登记 UA 使用网页通道（如备份脚本），登记即审计留痕。

---

## 十二、配置（插件 Config，schemastery，可部署期调）

```ts
{
  enabled: true,
  keysFile: '',                       // data/agent-keys.json
  approvalRequired: false,            // 审批流开关
  keyCycle: 'monthly',                // 密钥周期：自然月强制轮换（预留 quarterly）
  globalIpWhitelist: [],              // 默认 CIDR（空=不限）
  rate: { read: 600, write: 60 },     // per-key 每分钟（读限流；写由并发闸门约束）
  quota: { personalMb: 1024 },        // 专属空间存量 1GB/用户；日写不限额
  concurrency: { write: 8, queue: 100, waitMs: 30000 },   // §6.3 写并发排队
  channelIsolation: true,             // §11.1 网页/Agent 通道隔离
  uaAllowlist: [],                    // 豁免 UA（公司运维脚本登记）
  size: { textKb: 4096, binaryMb: 200, forkMb: 200 },
  retention: { callsDays: 60, auditDays: 180 },
  sensitiveExts: ['.key','.pem','.p12','.pfx','.crt','.env', ...],
  mcp: { enabled: true },
}
```

---

## 十三、部署与交付

| 项 | 说明 |
|---|---|
| 目录 | `privhub/plugins/privhub-files-agent/`（L3 自动发现，无需改 main.ts） |
| office-ai | 同 v2 决策：统一 X-Agent-Key 体系（旧 key 作废）、修复 admin 硬编码、项目只读 + 专属空间写；office 端点并入错误码/envelope 规范 |
| 部署包 | `scripts/build-deploy.ps1` robocopy 同步 plugins/ 自动携带；新增 `data/agent-*.json*` 由 S7 加密落地 |
| 迁移 | 旧 office-api.json 不自动迁移（安全默认），导出废弃 key 清单供重建；删除操作前确认 |
| 测试 | 企业级测试矩阵（§十四） |
| 文档 | 接入指南（OpenAPI + LLM 模板 + MCP + curl）、管理运维手册（配置/保留/迁移/故障排查） |

---

## 十四、实施里程碑

| 里程碑 | 内容 | 验收 |
|---|---|---|
| **M1 网关核心** ✅ | 插件骨架 + Key 校验（哈希/状态/过期/IP）+ **自然月周期** + scope 矩阵 + 专属空间读写改删 + 回收站 + 错误码/envelope + 请求 ID | **2026-09-05 交付**：`tests/_archive/project-tests/check-agent-api.mjs` 47/47 全绿（权限隔离/分区/回收站/状态机/月度周期/审计） |
| **M2 可靠与治理** ✅ | 幂等键 + ETag/If-Match + per-path 锁 + **写并发排队（§6.3）** + 配额账本（1GB）+ 持久化限流 + 版本快照（对接 versions 格式） | **2026-09-05 交付**：`check-agent-api-m2.mjs` 23/23 全绿（重放幂等/冲突 409/旧 ETag 409/10 并发排队/配额增减恢复/快照入库+恢复/601 并发限流）；新增 `/agent/v1/versions` + `/agent/v1/versions/restore`（专属空间版本闭环） |
| **M3 观测与控制台** | 调用日志/审计哈希链/指标/健康检查 + 管理控制台（密钥+仪表盘+回收站+日志查询）+ 异常自动挂起 + **通道隔离与会话管控（§11.1）** | 审计链自检通过；指标可被采集；控制台全流程可操作；通道违规事件闭环 |
| **M4 接入与二期** | OpenAPI 导出 + MCP(SSE) + **接入指南（含首次接入 Skill）+ 运维手册** + office-ai 统一改造 + `/search` + dryRun/range | Claude Desktop/Cursor 经 MCP 实操；LLM 工具模板实测；Skill 流程可执行 |
| 二期 | AI 收件箱（用户自助视图/归档/回收站）、内置 HTTPS、断点续传、审批流启用 | — |

> 里程碑可独立交付/回退；M1–M3 为生产可用底线，M4 交付接入体验。

---

## 十五、风险与权衡（低配宿主机现实约束）

| 风险 | 说明与措施 |
|---|---|
| 零外部依赖的限流持久化 | 日志式 JSONL 账本 + 周期 flush；崩溃最多丢 <60s 窗口计数（可接受，文档明示） |
| 内存指标 | 桶 LRU 上限 5000；进程内聚合不落盘，重启即失（指标属观测非合规，可接受） |
| 审计哈希链 vs 保留期 | 保留期内不截断中间块（链完整性优先）；期满整卷归档导出后删除 |
| versions 快照格式对齐 | 实现前核对 privhub-files-versions 数据格式；不一致则先落 .bak（v2 保底）再审慎对齐 |
| 单实例写锁 | 仅进程内 per-path 锁（低配单实例足够）；并发排队闸门为单实例内存队列——多实例部署不在本期范围（架构文档明示） |
| 写队列内存 | 有界队列（容量 100）+ 超时 30s；队列满即 429 不堆积；优雅关闭时等待在队请求完成 |
| 通道隔离误伤 | UA 判定有误报可能（企业代理改写 UA）→ 误伤会话可经控制台恢复 + `uaAllowlist` 豁免登记；事件全量留痕可查 |
| TLS | 内网默认 http + 部署文档强制反代 TLS 样例；二期内置 |
| 智能体失控 | 配额硬顶 + 自动挂起 + 一键熔断三保险；写操作全部 idempotent + 可回滚（快照/回收站） |

---