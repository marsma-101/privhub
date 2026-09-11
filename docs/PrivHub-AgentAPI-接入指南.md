# PrivHub Agent API 接入指南（智能体接入速查）

> 适用：局域网内其他设备的 AI 智能体（Claude Code / Codex / DSH / 自定义脚本）接入 PrivHub。
> 完整设计见 `PrivHub-AgentAPI-智能体接口方案.md`；本文件是**实操速查**。
> 状态：后端已可用（M1+M2 交付）；**开发者平台界面已交付**（图标栏「🔌 智能体接入」）。
> 版本：**3.0.1**（变更记录见仓库根 `CHANGELOG.md`）

---

## 0. 两个必须知道的变化（3.0.1）

| 项 | 旧行为 | 现行为（3.0.1 起） |
|---|---|---|
| 写入落点 | `.agents/<用户>/<项目>/` 隐藏目录 | **该账号的「个人空间」`data-files/<真实姓名>/`** |
| `/schema` | 无鉴权 | **需登录会话或有效密钥**（接口清单即地址规则，不对未授权方公开） |

「个人空间」是按真实姓名创建的私有目录：仅本人可见可访问（**管理员也读不到**）、
不进查重/向量化/全文索引、系统永不自动删除。它同时就是智能体的沙箱，
好处是用户能在界面里直接查看和整理 AI 产物。

**绑定账号若未开通个人空间**，写入类操作会返回 `403 AGENT-4036`（显式失败，不会静默落到别处）。
开通方式：注册时自动创建，或由管理员改该账号的显示名为真实姓名。

---

## 1. 地址与端口

| 环境 | 地址 |
|---|---|
| 开发 | `http://127.0.0.1:3180/privhub/api/agent/v1/...` |
| 生产（宿主机） | `http://<宿主机IP>:3181/privhub/api/agent/v1/...` |
| 局域网其他设备 | `http://<宿主机IP>:3181/...`（防火墙放行端口） |

统一前缀：`/privhub/api/agent/v1/`，认证头：`X-Agent-Key: pha_xxx`（除 `/schema` 需登录态外，全部必须）。

---

## 2. 三步接入（5 分钟）

### ① 获取 Key（三选一）

方式 A：**网页界面自助**（推荐，最简单）

登录后点左侧图标栏 **🔌 智能体接入** → 「我的密钥」→ 填名称、选项目、点签发。
明文密钥只在签发瞬间显示一次，请立即复制。

> 自助密钥只能授权到**单个项目**。需要「全部可见项目」范围，请由管理员签发。

方式 B：**admin 代生成**（公司级统一管控）

```bash
# admin 登录（返回 body.token）
curl.exe -X POST http://127.0.0.1:3180/privhub/api/login \
  -H "content-type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}"

# 生成 key（body.json 内容见下；中文路径建议用 -d "@body.json" 文件方式）
curl.exe -X POST http://127.0.0.1:3180/privhub/api/agent/v1/keys \
  -H "Authorization: Bearer <token>" -H "content-type: application/json" \
  -d "@body.json"
```

body.json：
```json
{
  "name": "审批群智能体-项目A",
  "username": "user1",
  "scope": { "kind": "project", "project": "A项目" }
}
```
- `scope.kind`：`project`（单项目，推荐防数据污染）/ `directory`（项目内子目录）/ `all`（用户全部可见项目，**仅管理员可签发**）
- 响应中的 `key`（`pha_...`）**明文仅此一次返回**，请立即保存

方式 C：**用户自助（curl）**

```bash
curl.exe -X POST http://127.0.0.1:3180/privhub/api/agent/v1/my-keys \
  -H "Authorization: Bearer <用户token>" -H "content-type: application/json" \
  -d "{\"name\":\"我的助手\",\"scope\":{\"kind\":\"project\",\"project\":\"A项目\"}}"
```

### ② 验证

```bash
curl.exe http://127.0.0.1:3180/privhub/api/agent/v1/me -H "X-Agent-Key: pha_xxx"
# → {
#     "user": { "username": "zhangsan", "displayName": "张三", "role": "user" },
#     "visibleProjects": ["A项目"],        ← 只含【真正的项目】，且受 key scope 收窄
#     "sandbox": "张三",                    ← 沙箱 = 该账号的个人空间目录名；未开通为 null
#     "sandboxPath": "张三/A项目/",
#     "projectReadOnly": true
#   }
```

### ③ 让智能体发现能力

```bash
# 需登录态或带有效密钥（3.0.1 起不再匿名开放）
curl.exe http://127.0.0.1:3180/privhub/api/agent/v1/schema -H "X-Agent-Key: pha_xxx"
```
返回完整工具契约（tools 数组 + 错误码 + 边界声明）。Claude Code / DSH 等可直接把
schema 的 tools 转成 function calling 配置。

---

## 3. 常用调用

| 目的 | Method & Path | Body / 参数 |
|---|---|---|
| 列目录（沙箱） | GET `/list?path=` | 省略 project 或 `project=@me` |
| 列目录（项目，只读） | GET `/list?project=A项目&path=` | — |
| 读文件 | GET `/read?project=&path=&encoding=text|base64&maxBytes=` | 响应带 `etag`（并发写用） |
| **写文件（沙箱）** | POST `/write` | `{ path, content, encoding?, dryRun? }` + 头 `X-Idempotency-Key` |
| 复制项目文件到沙箱 | POST `/fork` | `{ project, path, toSubdir? }` + 幂等键 |
| 重命名 | POST `/rename` | `{ path, newName }` |
| 删除（进回收站） | POST `/delete` | `{ path }` |
| 版本历史 / 恢复 | GET `/versions?path=` / POST `/versions/restore` | `{ path, at }` |
| Key 管理（admin） | GET/POST `/keys`、POST `/keys/{revoke,suspend,resume,rotate}` | `{ id }` |
| 我的 Key（登录态） | GET/POST/DELETE `/my-keys` | — |
| 平台数据（登录态） | GET `/console` | 沙箱信息 + 我的密钥（admin 另得全部密钥） |
| 沙箱回收站（admin） | GET `/trash`、POST `/trash/{restore,purge}` | `{ id }` |

**写操作必须带** `X-Idempotency-Key`（8~128 字符）——重试携带相同键可防重复写入；响应可能带 `X-Queue-Position`（排队中）、`X-RateLimit-*`（限流）、`X-Key-Expires`（到期预警）。

---

## 4. 权限边界（智能体必须知道）

1. **项目 = 只读**：`project` 参数只能用于 list/read/fork；write/rename/delete 的目标永远落在**沙箱**
   （即绑定账号的个人空间 `data-files/<真实姓名>/`，省略 project 或写 `@me` 即沙箱），写项目一律 `403 AGENT-4032`。
2. **每请求三重校验**（全在服务端，不依赖任何前端隐藏）：
   ① 密钥自身 scope → ② 绑定账号权限 `canAccess` → ③ 文件级 ACL。
   猜到项目名也没用，服务端逐次裁决。
3. **单项目 Key 只看得见授权项目**：scope=project 的 key 读其它项目 403；`/me` 与 `/projects`
   只返回 scope 内的项目名，且**不包含任何个人空间目录名**。
4. **个人空间对智能体的边界**：绑定账号可读写自己的沙箱；**其他账号（含管理员）一律 403**。
5. **敏感文件豁免**：`.key/.pem/.env` 等扩展名禁止经 API 读写。
6. **月度密钥纪律**：key 每月末自动过期；到期前 7 天所有响应带 `X-Key-Expires` 头——看到该头请提醒人工续期
   （admin POST `/keys/rotate`，或界面「轮换」按钮），新旧 key 平滑并存至旧 key 到期。
7. 全量动作入审计（user=`ai:<label>`），可在审计面板追踪。

### 错误码补充（3.0.1）

| 码 | 含义 | 处理 |
|---|---|---|
| `AGENT-4036` | 沙箱不可用（绑定账号未开通个人空间） | 请管理员为该账号设置真实姓名 |
| `AGENT-4035` | 自助密钥不支持 `all` scope | 改用单项目 scope，或请管理员签发 |

---

## 5. 智能体侧配置模板

### Claude Code（示例）

```json
{
  "permissions": {
    "allow": [
      {"name": "custom_tool", "tool": "privhub_read", "args": {"baseUrl": "http://10.0.0.5:3181"}},
      {"name": "custom_tool", "tool": "privhub_write", "args": {"baseUrl": "http://10.0.0.5:3181"}}
    ]
  },
  "env": { "PRIVHUB_AGENT_KEY": "pha_xxx" }
}
```
工具描述直接取自 `/schema` 的 tools 数组。

### 通用脚本模板（Node）

```js
const BASE = 'http://10.0.0.5:3181/privhub/api/agent/v1'
const KEY = process.env.PRIVHUB_AGENT_KEY
const headers = { 'X-Agent-Key': KEY, 'content-type': 'application/json' }

// 写文件到沙箱（= 绑定账号的个人空间；幂等键保证重试安全）
await fetch(`${BASE}/write`, {
  method: 'POST', headers,
  body: JSON.stringify({ path: '周报-W36.md', content: '# 周报\n...' }),
  headers: { ...headers, 'X-Idempotency-Key': crypto.randomUUID() },
})
```

---

## 6. 常用管理要点

- **吊销**：POST `/keys/revoke`（body `{id}`，立即失效不可恢复）；用户自助走 DELETE `/my-keys`
- **一键续期**：POST `/keys/rotate`（body `{id}`）签发同配置新 key（新周期），旧 key 保留至自然到期（平滑迁移）
- **排查**：401 + `AGENT-4011/4012/4013` = 过期/吊销/挂起；403 + `AGENT-4031/4032/4036` = 越权/项目只读/沙箱未开通；
  429 + `AGENT-4291/4293/4294` = 限流/队列满/排队超时（带同幂等键重试）
- **前端界面**：已交付「🔌 智能体接入」开发者平台（我的密钥 / 接口文档 / 管理员全部密钥），
  日常管理不再需要 curl

---

## 7. 安全模型一句话

> 智能体**只能**经 `/privhub/api/agent/v1/*` 携带密钥读取**授权范围内**的信息。
> 它无法用网页地址读取页面或越权访问其他项目——插件前端代码需登录会话才能加载
> （3.0.1 起），接口清单也需授权，所有数据请求在服务端逐次校验密钥范围、账号权限与文件级 ACL。
