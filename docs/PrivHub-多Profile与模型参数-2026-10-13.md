# PrivHub 多 Profile 模型配置 + 生成参数（Q1 §1.2 / Q2）——2026-10-13

> 承接改进方案 `docs/PrivHub-改进方案-AI-图谱-查重-2026-10-11.md` 的 §1.2 与 §1.10 的 Q1 / Q2。
> 决策（已拍板）：**Q1 = 全局多套**（管理员统一配置，不做 per-user）；**Q2 = 参数全做出来，
> 管理员全开、普通用户单点开关默认关**（沿用全局规则「功能要全 → 管理员全开放 → 用户开关」）。

---

## 1. 解决什么

**Q1 §1.2**：模型配置此前是**全局单份**（`data/model.json` = 一个 llm + 一个 embedding）。
换一台模型服务就得把原配置整个改掉，回不去。本批把落盘形状升级为

```
{ profiles: [{ id, name, llm, embedding, params }], activeId, maxRetries }
```

多套并存、下拉切换、设「当前生效」、删除。**旧文件无需手工迁移**（见 §3）。

**Q2**：此前请求体只发 `{ model, messages, stream }`，temperature / max_tokens / top_p
一律不可配。本批把参数**一个不少地做出来**，落进 profile 默认值，并允许每次问答再覆盖一份。

---

## 2. 服务层（`privhub-svc-model`）

| 能力 | 说明 |
|---|---|
| `ModelConfig` | `{ profiles, activeId, maxRetries }`；`params` 挂在每个 profile 上 |
| `getConfig()` | 返回**当前 profile 摊平视图**（`llm` / `embedding` / `params` / `maxRetries`）+ `profiles` + `activeId`；无有效当前项回 `null`（= 未配置）。**老调用方读 `cfg.llm` 照旧可用** |
| `saveConfig(input)` | 兼容两种形状：`{profiles,…}` 整表替换；扁平 `{llm,embedding,maxRetries}` 写进当前 profile |
| `upsertProfile` / `removeProfile` / `setActive` | UI 的增删改切；新建第一套自动设为当前 |
| `listProfiles()` / `activeProfileId()` | 界面读取 |

**参数（Q2）**

- 类型 `ModelParams`：`temperature` / `topP` / `maxTokens` / `presencePenalty` /
  `frequencyPenalty` / `seed`。
- `sanitizeParams()`：**越界夹到界限**（而不是报错）——「温度填了 3」不该让整个问答失败。
  范围：temperature 0–2、top_p 0–1、max_tokens 1–200000、penalty ±2、seed 0–2^31-1；
  非数字/空值/未知键丢弃，token/seed 取整。
- 生效参数 = `profile.params ↑ 本次调用 opts.params`（后者已由调用方按开关裁过）；
  映射进上游请求体时才改名（`topP→top_p`、`maxTokens→max_tokens`…），未设的字段**不发送**。

**红线保持**：不内置厂商 SDK、无云端回退、`apiKey` 走 storage 加密、不进日志/审计。
`ModelError` 及既有脱敏/形状兜底逻辑（§1.5）原样保留。

---

## 3. 旧结构兼容（关键：不做破坏性迁移）

`normalizeConfig(raw)` 在**读侧**完成兼容，不写盘、幂等：

- 顶层出现 `profiles[]` → 按新形状读，`activeId` 悬空时回落第一个；
- 顶层是 `llm`/`embedding`（旧形状）→ 当**单 profile** 读入，`id` 固定 `default`、名「默认」；
- 什么都没 → 空表（未配置）。

因此**旧 `model.json` 直接可用**，第一次保存才落新形状。既有测试与老前端 POST 扁平结构
那条路都因此保持可用（见 §6 的 `json-corruption` / `rag-resilience` 断言未改）。

---

## 4. HTTP 面（`privhub-svc-rag`，admin 门槛 = `admin.rag`）

| 路由 | 方法 | 说明 |
|---|---|---|
| `/privhub/api/model/config` | GET | 回 `{ configured, activeId, maxRetries, config(摊平), profiles[], corrupt }`（apiKey 打码） |
| `/privhub/api/model/config` | POST | **兼容入口**：扁平（旧）或 `{profiles,…}`（新）都可 |
| `/privhub/api/model/profile` | POST | 新增/更新一套 `{ id?, name, llm, embedding, params?, activate? }` |
| `/privhub/api/model/profile/delete` | POST | 删除一套 `{ id }` |
| `/privhub/api/model/activate` | POST | 切换当前 `{ id }` |

**问答参数入口**：`POST /privhub/api/rag/ask` 的 body 新增可选 `params`。
是否采纳由功能开关 `ai.params`（`ctx.cap.can(u,'ai.params','write')`）决定：
**管理员恒可；普通用户默认不可**。无权时**静默忽略**（不报错），避免旧前端多带一个字段就整个问答失败。

---

## 5. 前端（`privhub-svc-rag/client/index.js`）

- **模型接入页**：顶部新增配置条（下拉选「正在编辑」的 profile + 名称 + 保存这套 /
  设为当前生效 / 新建一套 / 删除 + 全局重试数），端点表单下新增「生成参数」三格。
- **切 tab 不丢未保存改动**：`loadModel()` 优先保留正在编辑的 profile，其次当前生效项。
- **问答面板**：当 `window.PrivHub.capCan('ai.params','write')` 为真时，显示「生成参数」区
  （temperature / top_p / max_tokens，留空用管理员默认值），随问答请求一起发送。

> 「纯界面视觉」未在真实浏览器逐项点过（见 §7）。

---

## 6. 测试

- **新 HTTP 回归** `tests/model-profiles.mjs`（16 例）：鉴权（401/403）、profiles 列表与
  activeId、新建（第一套自动当前）、不抢当前、切换、参数夹界限（temperature 9→2、top_p 2→1）、
  非法 baseURL 400、**旧扁平结构兼容**、删除、删不存在 400、密文落盘、收尾清理。
  已注册进 `tests/run-all.mjs`（`buildCap()` 之后、`buildWebhook()` 之前）。
- **`tests/model-parsing.mjs` §8（+17 例）**：进程内真 svc-model + 假上游，
  `sanitizeParams` 纯函数、`normalizeConfig` 旧结构迁移与悬空 activeId 回落、
  多 profile 增删改切、**参数真的进上游请求体**（抓包）、profile 默认参数自动带上、
  本次覆盖优先、未配置参数时不发字段。
- **`tests/cap.mjs`**：功能 id 断言列表加入 `ai.params`（新增一项，未改既有断言语义）。
- 回归合计：**HTTP 248 / 静态 1255 = 1503**（较上批 HTTP +16、静态 +17）。

**未改动既有断言**。既有 `json-corruption`（校验扁平结构 POST / 读回 `config.llm`）、
`rag-resilience`（mock 配置 + 向量化/流式）均原样通过 —— 这正是 §3 兼容路径的意义。

---

## 7. 诚实说明 / 已知边界

- **Q1 选择「全局多套」**（管理员配置），不是 nowen 的「每用户自配」。若日后要 per-user，
  数据模型与权限都要另起一层，本批不涉及。
- **纯界面验证留待浏览器**：下拉切 profile → 表单随之变化、参数区随开关显隐等**视觉**效果，
  本批只做了服务端行为 + 静态契约 + 前端代码接线 + 模板可编译，未在真实浏览器逐项点过。
- **`params` 的权限只有一份**（`ai.params`），不区分「能改哪些参数」——够用即止。
- **历史沉淀**：`clampRetries` 沿用旧口径（`Number(v)||2`，即显式传 0 会落成 2），本批未改，
  以免动到既有行为。

**未提交**（本地改动，未同步部署包、未升版本号）。
