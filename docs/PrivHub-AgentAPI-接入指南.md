# PrivHub Agent API 接入指南（智能体接入速查）

> 适用：局域网内其他设备的 AI 智能体（Claude Code / Codex / DSH / 自定义脚本）接入 PrivHub。
> 完整设计见 `PrivHub-AgentAPI-智能体接口方案.md`；本文件是**实操速查**。
> 状态：后端已可用（M1+M2 交付）；前端「AI 接入」界面随 RAG 界面一期（M2 里程碑）交付。

---

## 1. 地址与端口

| 环境 | 地址 |
|---|---|
| 开发 | `http://127.0.0.1:3180/privhub/api/agent/v1/...` |
| 生产（宿主机） | `http://<宿主机IP>:3181/privhub/api/agent/v1/...` |
| 局域网其他设备 | `http://<宿主机IP>:3181/...`（防火墙放行端口） |

统一前缀：`/privhub/api/agent/v1/`，认证头：`X-Agent-Key: pha_xxx`（除 schema 外全部必须）。

---

## 2. 三步接入（5 分钟）

### ① 获取 Key（二选一）

方式 A：**admin 代生成**（推荐，公司级统一管控）

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
- `scope.kind`：`project`（单项目，推荐防数据污染）/ `directory`（项目内子目录）/ `all`（用户全部可见项目，需谨慎）
- 响应中的 `key`（`pha_...`）**明文仅此一次返回**，请立即保存

方式 B：**用户自助**（登录态，绑定自己）
```bash
curl.exe -X POST http://127.0.0.1:3180/privhub/api/agent/v1/my-keys \
  -H "Authorization: Bearer <用户token>" -H "content-type: application/json" \
  -d "{\"name\":\"我的助手\",\"scope\":{\"kind\":\"project\",\"project\":\"A项目\"}}"
```

### ② 验证

```bash
curl.exe http://127.0.0.1:3180/privhub/api/agent/v1/me -H "X-Agent-Key: pha_xxx"
# → { user: {...}, visibleProjects: [...], personalSpace: ".agents/user1/A项目/" }
```

### ③ 让智能体发现能力

```bash
curl.exe http://127.0.0.1:3180/privhub/api/agent/v1/schema
```
无鉴权、返回完整工具契约（tools 数组 + 错误码 + 边界声明）。Claude Code / DSH 等可直接把 schema 的 tools 转成 function calling 配置。

---

## 3. 常用调用

| 目的 | Method & Path | Body / 参数 |
|---|---|---|
| 列目录（专属空间） | GET `/list?path=` | — |
| 列目录（项目，只读） | GET `/list?project=A项目&path=` | — |
| 读文件 | GET `/read?project=&path=&encoding=text|base64&maxBytes=` | 响应带 `etag`（并发写用） |
| **写文件（专属空间）** | POST `/write` | `{ path, content, encoding?, dryRun? }` + 头 `X-Idempotency-Key` |
| 复制项目文件到专属空间 | POST `/fork` | `{ project, path, toSubdir? }` + 幂等键 |
| 重命名 | POST `/rename` | `{ path, newName }` |
| 删除（进回收站） | POST `/delete` | `{ path }` |
| 版本历史 / 恢复 | GET `/versions?path=` / POST `/versions/restore` | `{ path, at }` |
| Key 管理（admin） | GET/POST `/keys`、POST `/keys/{revoke,suspend,resume,rotate}` | `{ id }` |
| 我的 Key（登录态） | GET/POST/DELETE `/my-keys` | — |
| 专属空间回收站（admin） | GET `/trash`、POST `/trash/{restore,purge}` | `{ id }` |
| 模型状态（admin） | GET `/model/status` | — |

**写操作必须带** `X-Idempotency-Key`（8~128 字符）——重试携带相同键可防重复写入；响应可能带 `X-Queue-Position`（排队中）、`X-RateLimit-*`（限流）、`X-Key-Expires`（到期预警）。

---

## 4. 权限边界（智能体必须知道）

1. **项目 = 只读**：`project` 参数只能用于 list/read/fork；write/rename/delete 的目标永远落在**专属空间**（`.agents/<用户>/<项目>/`，省略 project 即专属空间），写项目一律 403。
2. **单项目 Key 只看得见授权项目**：scope=project 的 key 读其它项目 403。
3. **敏感文件豁免**：`.key/.pem/.env` 等扩展名禁止经 API 读写。
4. **月度密钥纪律**：key 每月末自动过期；到期前 7 天所有响应带 `X-Key-Expires` 头——看到该头请提醒人工续期（admin POST `/keys/rotate` 或界面一键续期），新旧 key 平滑并存至旧 key 到期。
5. 全量动作入审计（user=`ai:<label>`），可在审计面板追踪。

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

// 写文件到专属空间（幂等键保证重试安全）
await fetch(`${BASE}/write`, {
  method: 'POST', headers,
  body: JSON.stringify({ path: '周报-W36.md', content: '# 周报\n...' }),
  headers: { ...headers, 'X-Idempotency-Key': crypto.randomUUID() },
})
```

---

## 6. 常用管理要点

- **吊销**：DELETE 语义 = POST `/keys/revoke`（body `{id}`，立即失效不可恢复）
- **一键续期**：POST `/keys/rotate`（body `{id}`）签发同配置新 key（新周期），旧 key 保留至自然到期（平滑迁移）
- **排查**：401 + `AGENT-4011/4012/4013` = 过期/吊销/挂起；403 + `AGENT-4031/4032` = 越权/项目只读；429 + `AGENT-4291/4293/4294` = 限流/队列满/排队超时（带同幂等键重试）
- **前端界面**：M2（RAG 界面一期）交付「AI 接入」区块（生成/续期/吊销/用量/专属回收站），之后不再需要 curl 管理 key