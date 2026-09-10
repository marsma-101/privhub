# PrivHub 改进建议

> 用途：**转交开发（人或 AI 代理）执行的改进任务清单**。每条含证据、影响、改法、验收，可独立取用、独立完成。
> 本文档**取代**《PrivHub-改进需求清单.md》——旧文件已归档至 `docs/v2/PrivHub-改进需求清单（已归档）.md`（新旧编号对照见第 10 节）。
>
> **⚡ 执行状态（2026-09-11）**：已按本文档完成修复并验收，详见 **《PrivHub-验收报告-2026-09-11.md》**。
> 全部 P0（6/6）与高价值 P1（19 项）已完成；产出生产包 `deploy/privhub-prod/`（含 zip）；
> 回归测试 84 项全部通过（`node tests/run-all.mjs --spawn`）。
> 本文件保留为**问题清单与依据**，各条目的执行结果以验收报告为准。
> 审计基线：**2026-09-11**，源码逐文件核对 + 三路独立只读审计（安全面 / 数据面 / 前端面）。
> **阅读约定**：每条结论都标注 `文件:行号`，可直接打开核对。文中区分三种可信度——
> **【实体】** 已读源码确认　**【实证】** 由磁盘数据只读解析得出　**【推断】** 有证据支撑但未复现。

---

## 0. 怎么用这份文件

### 优先级定义

| 级别 | 含义 | 处理时机 |
|---|---|---|
| **P0** | 已造成或必然造成**数据丢失 / 服务不可用 / 账号被接管 / 线上跑错代码** | 立即，优先于所有新功能 |
| **P1** | 安全承诺不达标、可靠性缺陷、明显性能损耗 | 近期，下一批次 |
| **P2** | 影响可维护性与体验，不修不会出事 | 排期 |

### 编号体系（本次重置）

| 前缀 | 领域 | 前缀 | 领域 |
|---|---|---|---|
| `S` | 安全 | `O` | 运维与部署 |
| `D` | 数据可靠性 | `E` | 工程质量 |
| `P` | 性能 | `U` | 使用体验 |
|    |     | `F` | 功能缺口 |

编号与优先级解耦：优先级变化只改标签，不改编号，便于跨版本引用。

### 任务字段

`状态` · `优先级` · `证据`（文件:行号 + 关键代码）· `问题` · `影响`（用户视角）· `改法` · `验收`

---

## 1. 一页摘要

### 必做（P0，6 项）

| # | 任务 | 编号 | 一句话风险 |
|---|---|---|---|
| 1 | 审计文件迁移竞态 | [D1](#d1) | **446MB 损坏事故的根因，至今未修**，会再次发生 |
| 2 | `/pub` 发布页 XSS 链 | [S2](#s2) | 任意访客可**接管管理员账号**（已有完整可利用链路） |
| 3 | 全文搜索 snippet XSS | [S3](#s3) | 任意用户上传含脚本的文件 → **任何人搜索即执行** |
| 4 | 请求体大小上限 | [S1](#s1) | 单个请求即可**打爆进程内存**，服务不可用 |
| 5 | 部署包同步 | [O1](#o1) | 3181 生产环境**跑的是 09-02 的旧代码**，没有 RAG |
| 6 | 测试脚本恢复 | [O4](#o4) | 上面 5 项改完**没有任何手段验证**，改动本身就是新风险 |

### 建议紧接着做（P1，节选）

`D2` 审计保留策略失效 · `D4` 损坏即覆写 · `D5` users 损坏锁死 · `D6` 读写无锁丢数据 · `D8` 向量库明文 · `D9` 明文 JSON · `S4` 语料 type XSS · `S5` 静态路径前缀 · `S6` office-ai 越权 · `S9` 回收站彻底删除漏校验 · `S10` 备份回滚漏 ACL · `P1` 静态资源无缓存 · `O1` 部署包

---

## 2. 安全（S）

### S1
- **名称**：请求体读取无大小上限
- **状态**：⬜
- **优先级**：**P0** · 🟠 后端
- **证据**【实体】：`privhub/plugins/privhub-core/src/index.ts:98-105`
  ```ts
  export function readBody(req: IncomingMessage): Promise<string> {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))   // ← 无限累积
    req.on('end', () => ok(Buffer.concat(chunks).toString('utf8')))
  }
  ```
  全仓 **60 处** `await readBody(...)` 调用，分布在 **23 个插件**（files-agent 12、svc-rag 5、admin 5 最多）。
  对照组：同文件 `readBodyRaw()`（:108-124）**有** `max` 上限并超限 `req.destroy()`——写法是现成的。
- **问题**：JSON 请求体没有任何大小限制。
- **影响**：局域网内任何能访问端口的人（**含未登录者**，登录接口本身就要解析 body）发一个几 GB 请求体，即可让 Node 进程内存耗尽崩溃。低配 Windows 宿主机尤其脆弱。
- **改法**：给 `readBody` 加第二参数 `max = 1024 * 1024`，累积超限即 `reject` + `req.destroy()`（照抄 `readBodyRaw`）；调用处捕获并返回 **413**；确需大 body 的接口（`text/save` 长文档、`rag/ingest`）显式传更大上限。
- **验收**：`curl -X POST --data-binary @2GB文件 /privhub/api/login` 返回 413 且内存不飙升；正常登录/保存文档不受影响。

### S2
- **名称**：`/pub` 免登录发布页构成账号接管链路
- **状态**：⬜
- **优先级**：**P0** · 🟠 后端 + 🟢 前端
- **证据**【实体】：
  - 发布门槛极低：`privhub-files-publish/src/index.ts:78-79` —— 只需项目读权限 + 扩展名是 `.html`；
  - 原样返回用户 HTML 且**不设任何 CSP**：`privhub-files-publish/src/index.ts:122-126`
    ```ts
    const html = await ctx.storage.readText(target).catch(() => '')
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8',
                         'x-content-type-options': 'nosniff', 'content-length': body.length, ... })
    ```
  - 路由命中直接执行 handler，**静态服务的 CSP 不覆盖它**：`privhub/src/web-server.ts:128-134`（静态 CSP 在 `:115`）；
  - 会话 token 存同源 localStorage：`privhub/frontend/index.html:323` `token: localStorage.getItem('privhub_token') || ''`；
  - 上传不校验扩展名，只校验文件名：`privhub-files/src/index.ts:112` `if (!svc.isValidName(name))`。
- **问题**：把用户上传的 HTML 以**同源** `text/html` 返回给免登录访问者，且无 CSP、无 `sandbox`。
- **影响**：一条完整链路——注册账号（[S11](#s11) 注册开放）→ 上传含脚本的 `.html` → 发布得到免登录链接 → 发给管理员（或任何人）打开 → 脚本读取同源 `localStorage.privhub_token` 外带 → **账号被接管**（管理员则全库沦陷）。
  注意：作者在别处**是有防护意识的**——`preview-raw` 有 MIME 白名单 + `nosniff`（`privhub-files/src/index.ts:84-99`），SVG 还额外挂 `default-src 'none'; sandbox`。`/pub` 绕过了这套。
- **改法**：给 `/pub` 响应加 `content-security-policy: default-src 'none'; sandbox`（与 SVG 同款），或改 `content-disposition: attachment`。
  **需产品确认**：若"发布 HTML"的本意就是允许页面带脚本（如发布仪表盘），则正确做法是换独立源或用 `sandbox` iframe 承载，而不是简单补 CSP 把功能打断——但**无论如何不该以同源身份执行**。
- **验收**：`curl -I http://127.0.0.1:3180/pub?code=xxx` 含 CSP 头；发布页内 `<script>` 无法读取 `localStorage`。

### S3
- **名称**：全文搜索 snippet 高亮未转义（存储型 XSS）
- **状态**：⬜
- **优先级**：**P0** · 🟢 前端
- **证据**【实体】：`privhub-files-search/client/index.js:14-21` 三条返回路径全部裸返回原文：
  ```js
  if (!terms) return snippet                              // :17
  if (i < 0) return snippet                               // :19
  return snippet.slice(0,i) + '<mark ...>' + snippet.slice(i, i+terms.length) + '</mark>' + ...  // :20
  ```
  渲染点：`:122` `<div ... v-html="hl(h.snippet, q)"></div>`。
  snippet 来源是**原始文件文本**：`privhub-svc-search/src/index.ts:241`（`makeSnippet` 全程无转义）；`privhub-files-fulltext/src/index.ts:47-55` 直接把项目内文本文件原文喂进索引，启动时全量重建（:118）。
- **问题**：搜索结果片段未做 HTML 转义就交给 `v-html`。
- **影响**：任意用户上传/编辑一个含 `<img src=x onerror=...>` 的 `.md`/`.txt`，**任何人（含管理员）全文搜索命中该关键词即执行脚本**。不需要 RAG 参与，是最普通的一条路径。
- **改法**：`hl()` 先 `esc(snippet)` 再插入 `<mark>`（1 行改动）；或在服务端 `makeSnippet` 出口统一转义。
- **验收**：上传含 `<img src=x onerror=alert(1)>` 的 txt，搜索命中时弹出的是**文本**而非执行。

### S4
- **名称**：RAG 语料 `type` 取自文件 frontmatter，未转义渲染（存储型 XSS）
- **状态**：⬜
- **优先级**：P1 · 🟠 后端 + 🟢 前端
- **证据**【实体】：
  - 取值无白名单：`privhub-svc-rag/src/index.ts:136` `meta[kv[1].toLowerCase()] = kv[2].trim()`；
  - 成为语料类型：`:279` `const type = ext === 'md' || ext === 'markdown' ? 'markdown' : (meta.type || 'text')`；
  - 进入统计键：`:1075` `byType[d.type] = (byType[d.type] ?? 0) + 1`；
  - 渲染不转义：`privhub-svc-rag/client/index.js:48` `const badge = (text, color) => \`<span ...>${text}</span>\``；`:754` `<span v-for="(n,t) in status?.corpus?.byType" v-html="badge(t + ' ×' + n, ...)">`。
- **问题**：非 `.md` 文本文件（TEXT_EXTS 含 txt/json/csv，`:44`）的 frontmatter `type` 值可任意，直接进 HTML。
- **影响**：上传 `.txt` 写入 `---\ntype: <img src=x onerror=...>\n---`（且不含 `rag:false`）即入语料；**管理员**打开「语料治理」页签时触发。
- **改法**：服务端把 `type` 归一化到白名单（如 `[a-z0-9_-]{1,16}`）；同时让 `badge()` 转义 `text`。
- **验收**：构造恶意 `type` 的文件，语料页签显示为纯文本。

### S5
- **名称**：静态文件服务路径校验缺少分隔符
- **状态**：⬜
- **优先级**：P1 · 🟠 后端
- **证据**【实体】：`privhub/src/web-server.ts:84` 与 `:92`
  ```ts
  if (target.startsWith(this.config.pluginsDir) && existsSync(target))   // :84
  if (target.startsWith(this.config.frontendDir) && existsSync(target))  // :92
  ```
  正确写法在同仓可见：`privhub-core/src/index.ts:308` 用的是 `target.startsWith(base + sep)`。
- **问题**：前缀判断未拼路径分隔符。
- **影响**：**当前不确定可实际利用**——`new URL()` 会归一化 URL 中的 `..`，`%2e%2e` 也不会被解码成 `..`，走通兄弟目录并不容易（已逐字推演，未实测）。但这是**确定的写法错误**，一旦以后在 `frontend/` 同级建了任何同前缀目录（`frontend-old/`、`plugins-backup/`），就变成真实的越权读取（可读到 `data/` 下密钥与数据）。
- **改法**：两处改成 `config.frontendDir + sep`（`import { sep } from 'node:path'`）；顺带拒绝含 `\0` 的路径。
- **验收**：新增单测——构造同级 `frontendX/secret.txt`，请求必须 404；正常资源不受影响。
- **风险**：低（两行，且是收紧）。

### S6
- **名称**：Office AI 接口用硬编码 `role:'admin'` 构造用户，ACL 失效
- **状态**：⬜
- **优先级**：P1 · 🟠 后端
- **证据**【实体】：`privhub-files-office-ai/src/index.ts:100` 与 `:117`
  ```ts
  const u = { username: 'ai:' + label, role: 'admin', projects: [] as string[] }
  if (!svc.canAccess(u, project)) return json(res, 403, ...)
  ```
  而 `canAccess` 对 admin 的定义是 `privhub-core/src/index.ts:280`：`if (user.role === 'admin') return this.isValidProjectName(project)`。
- **问题**：该判断退化成"项目名是否合法"的**语法检查**，等于是放行一切。
- **影响**：持有 Office API Key 的外部 AI 可读写**任意项目**，且**完全绕过文件级 ACL**（该路由也未登记 `GUARD_PATHS`）。
- **改法**：给 Key 绑定显式项目白名单（`aiKeys` 记录里加 `projects[]`），构造用户时用真实角色 + 白名单；并把 `/api/ai/office/*` 登记进 ACL 守卫。
- **验收**：用只授权 A项目的 Key 访问 B项目返回 403；对设了 deny 规则的文件写入同样 403。

### S7
- **名称**：邀请码 / 发布码使用非密码学随机源
- **状态**：⬜
- **优先级**：P1 · 🟠 后端
- **证据**【实体】：
  - `privhub-files-publish/src/index.ts:43-48`：`s += chars[Math.floor(Math.random() * chars.length)]`；
  - `privhub-files-invite/src/index.ts:44-49`：同样写法。
  两处均为 8 位 × 31 字符集 ≈ **39.6 bit**，且 `Math.random()` 不是 CSPRNG。
  对照：`privhub-auth/src/index.ts:48` 的会话 token 用的是 `randomBytes(24)`（正确）；`files-agent` 的密钥同理。**两类不能混为一谈——只有 publish/invite 这两处有问题。**
- **问题**：安全令牌用了非密码学随机。
- **影响**：邀请码/发布链接可能被预测或爆破；发布链接命中即等于拿到该文件的免登录读取权。
- **改法**：改用 `randomBytes`（`node:crypto`），建议同时把长度提到 12 位以上。
- **验收**：生成逻辑不含 `Math.random`；`grep -rn "Math.random" privhub/plugins` 仅剩非安全用途。

### S8
- **名称**：`/api/invite/info` 无鉴权且回显项目名
- **状态**：⬜
- **优先级**：P1 · 🟠 后端
- **证据**【实体】：`privhub-files-invite/src/index.ts:113-121`（免登录可访问，回显项目名），无速率限制。
  同仓已有现成的限流器未复用：`privhub-files-agent/src/m2.ts` 的 `RateLimiter`。
- **问题**：免认证的枚举 oracle。
- **影响**：可批量试邀请码，命中即知道对应项目名，为后续爆破/S7 的弱随机提供反馈信号。
- **改法**：加限流（复用 `m2.ts` 的 `RateLimiter`）；`info` 不回显项目名，或改为必须登录。
- **验收**：短时间大量探测返回 429；未持码时无法得知项目名。

### S9
- **名称**：`trash-purge` 漏掉项目权限与 ACL 校验
- **状态**：⬜
- **优先级**：P1 · 🟠 后端
- **证据**【实体】：同插件内两条路由防护不一致——
  - `trash-restore`（`privhub-trash/src/index.ts:76-81`）三者齐全：归属校验 + `canAccess` + ACL：
    ```ts
    if (u.role !== 'admin' && rec.deletedBy !== u.username) return 403
    if (!svc.canAccess(u, rec.project)) return 403
    const aclD = ctx.acl.can(u, 'edit', rec.project, rec.relPath ?? '')
    ```
  - `trash-purge`（`:96-99`）**只有**归属校验，随后直接 `svc.purgeTrash(id)`。
- **问题**：彻底删除没有项目权限与 ACL 裁决。
- **影响**：用户被移出某项目后，仍可凭旧记录**永久物理删除**该项目回收站中的文件——这是不可逆的。
- **改法**：`trash-purge` 补上 `canAccess` + `ctx.acl.can(u, 'delete', ...)`（与 restore 对称）。
- **验收**：被移除项目权限的用户对旧条目执行 purge 返回 403。

### S10
- **名称**：Git 备份回滚覆盖文件不查 ACL；commit 参数未校验
- **状态**：⬜
- **优先级**：P1 · 🟠 后端
- **证据**【实体】：`privhub-git-backup/src/index.ts`
  ```ts
  const commit = String(body.commit ?? '')          // :177 未做任何格式校验
  if (!svc.canAccess(u, project)) return 403        // :178 仅项目级
  await git(REPO, ['checkout', commit, '--', rel])  // :184 commit 位于 -- 之前
  await copyFile(restored, target)                  // :188 直接覆盖目标文件，无 ACL
  ```
- **问题**：（a）回滚 = 覆盖写文件，却没有文件级 ACL 裁决（`rename`/`doc` 等路径都有）；（b）`commit` 未校验就放进 git 参数位。
- **影响**：（a）受 ACL `deny` 保护的文件可被备份回滚绕过覆盖；（b）`commit` 以 `--` 开头时会被 git 当选项解析——**不是 shell 注入**（用的是 `execFile`，无 shell），实际危害有限，但属确定性缺陷，应一并收口。
- **改法**：回滚前加 `ctx.acl.can(u, 'edit', project, path)` 裁决；`commit` 用 `/^[0-9a-f]{7,40}$/` 校验后再用。
- **验收**：对 ACL deny 的文件回滚返回 403；`commit: "--help"` 返回 400。

### S11
- **名称**：注册接口完全开放
- **状态**：⬜
- **优先级**：P1 · 🟠 后端
- **证据**【实体】：`privhub-auth/src/index.ts:57-71`，无邀请码、无审批、无开关；成功即 `role:'user'`、`projects: ['公共']`（:67）。项目里**已有** `privhub-files-invite` 邀请码机制（5 条路由），但未约束注册入口。
- **问题**：任何能连上端口的人都能自助建号并立刻获得「公共」项目读写权。
- **影响**：局域网内等于文件系统公共区对全公司开放；也是 [S2](#s2) 攻击链的第一环。
- **改法**：`settings.json` 增 `allowSelfRegister`（默认建议 `false`）；关闭时注册返回 403，改走邀请码或管理员建号。
- **验收**：关闭后 `POST /api/register` 返回 403；邀请码加入流程仍正常。

### S12
- **名称**：6 个插件自写 JSON 响应函数，绕过统一安全响应头
- **状态**：⬜
- **优先级**：P2 · 🟠 后端
- **证据**【实体】：`privhub-core/src/index.ts:85-96` 的共享 `json()` 会附加 A13 安全头（`nosniff` / `DENY` / `no-referrer`）。但另有 **7 份副本**：`privhub-files-agent`、`privhub-files-office:16`、`privhub-files-office-ai`、`privhub-files-office-ui`、`privhub-svc-rag`、`privhub-shell`。其中 `files-office/src/index.ts:16-20` 只写了 `content-type` 与 `content-length`。`readBody` 同样有 **5 份**副本。
- **问题**：同一工具复制多份，副本已与安全基线不一致。
- **影响**：这些接口缺防护头；更实际的是——**修 [S1](#s1) 时要改 5 个地方，漏一个就留个口子**。
- **改法**：删除副本，统一 `import { json, readBody } from '../../privhub-core/src/index'`（25 个插件已是这么做的）。
- **验收**：`grep -rn "function json(" privhub/plugins` 仅剩 core 一处。

### S13
- **名称**：登录限流仅内存态，重启清零
- **状态**：⬜
- **优先级**：P2 · 🟠 后端
- **证据**【实体】：`privhub-auth/src/index.ts:36-46` 限流键为 `username + '|' + ip`，计数存 `svc.loginFails`（`privhub-core/src/index.ts:176` 内存 Map）。限流逻辑本身正确（5 次锁 60 秒），但不落盘。
- **问题**：失败计数随进程消失。
- **影响**：配合 [S1](#s1)（可触发崩溃重启）或正常运维重启即可清零；锁定 60 秒也偏短；换 IP 可绕过。
- **改法**：封禁状态落盘；延长锁定时长并引入递增退避。
- **验收**：重启后仍在封禁期的 IP 立即登录返回 429。

### S14
- **名称**：CSP 同时放行 `unsafe-inline` 与 `unsafe-eval`
- **状态**：⬜
- **优先级**：P1 · 🟢 前端
- **证据**【实体】：`privhub/src/web-server.ts:115` `script-src 'unsafe-inline' 'unsafe-eval' 'self'`。
- **问题**：`unsafe-inline` 使得 [S2](#s2)/[S3](#s3) 的注入可用最简单的 `<img onerror=...>` 直接执行；`unsafe-eval` 还允许 `eval` / `new Function`。
- **影响**：CSP 在当前配置下几乎不提供 XSS 防护。
- **改法**（**两条要分开处理，不要一起做**）：
  1. `unsafe-inline` **可先行去掉**——把骨架内联 `<script>`（`index.html:316`）外移为独立 `.js` 文件，静态 JS 不受 `script-src` 约束；
  2. `unsafe-eval` **必须单独立项**——全仓 **29 个文件、41 处**字符串 `template:` 依赖 Vue 运行时模板编译，`vue.global.prod.js` 是含编译器的完整构建；贸然移除会导致所有插件 client 白屏，需先把这 41 处迁移到预编译。
- **验收**：（第一步）去掉 `unsafe-inline` 后功能无回归，注入验证不再执行；（第二步）另行排期。

### S15
- **名称**：office2 同源 iframe 无 `sandbox`，内置预览器无净化
- **状态**：⬜
- **优先级**：P1 · 🟢 前端
- **证据**【实体】：`privhub-files-office2/client/index.js:52-54`
  ```js
  frame = document.createElement('iframe')      // :52 无 sandbox 属性
  frame.src = this.frameUrl(payload)            // :54 同源（/privhub-plugins/.../view.html）
  ```
  该 iframe 以同源身份运行并读取主文档 localStorage：`client/view.js:9` `const token = localStorage.getItem('privhub_token')`。
  内置 `client/vendor/docx-preview.js` 中 DOMPurify / sanitize 命中 **0 处**，`innerHTML` **3 处**。
- **问题**：用同源 iframe 渲染用户上传的 docx，且无沙箱。
- **影响**：若 docx-preview 可被恶意 docx 构造出脚本执行，后果与 [S2](#s2) 同级（可读 token）。
  **【不确定】** docx-preview 能否被恶意 docx 触发脚本，本次**未验证**——但"iframe 缺 sandbox"是确定的代码事实，加固成本很低，建议不待验证直接加。
- **改法**：加 `sandbox`（需去掉 `allow-same-origin`，token 改由 `postMessage` 传入）。
- **验收**：iframe 内无法直接访问 `localStorage`；Office 预览功能正常。

### S16
- **名称**：`/api/shell/manifest` 无鉴权
- **状态**：⬜
- **优先级**：P2 · 🟠 后端
- **证据**【实体】：`privhub-shell/server/index.ts:80` 未调用 `requireUser`，返回全部插件清单（id/title/icon/description/slots/barItems）。
- **问题**：未登录即可枚举系统装了哪些插件。
- **影响**：泄露功能面与版本信息（为针对性攻击提供便利）。低危但无成本修复。
- **改法**：加 `requireUser`（骨架登录后才会拉取，不影响登录页）。
- **验收**：未带 token 返回 401。

> **已检查、未发现问题**（这部分同样是审计结论，请勿重复排查）：
> token 生成 `randomBytes(24)`=192bit、Bearer 严格匹配、过期即删、滑动续期正确、注销服务端删除，**无会话固定问题**；密码 `scrypt` + 16 字节盐 + `timingSafeEqual`，**无缺陷**；`resolveInProject` 与 `isValidName` 字符串层完备，`resolveReal` 的 realpath + 父目录回退设计正确，**绝大多数插件已正确使用**；`files-agent`（18 路由）是**全仓防护最严**的模块——密钥 sha256 哈希、128bit、IP CIDR 白名单、三维限流、配额幂等，项目目录严格只读且**显式裁决 ACL**（`agent:309`），写入限在 `.agents/<user>/` 专属空间；上传侧流式加密 + 超限 `destroy` + `.part` 清理，且**无自动解压**逻辑；`preview-raw` MIME 白名单 + `nosniff` + SVG `sandbox`；静态资源 `..` 无法逃逸（逐字推演未实测）；审计接口三条路由**均有 adminOnly**；admin 域 6 路由逐条有管理员判定。

---

## 3. 数据可靠性（D）

### D1
- **名称**：审计文件格式迁移存在并发竞态（446MB 事故根因，未修）
- **状态**：⬜
- **优先级**：**P0** · 🟠 后端
- **证据**【实体】：`privhub-svc-audit/src/index.ts:82-99`
  ```ts
  private async ensureBlockFormat(): Promise<void> {
    if (this.blockReady) return                                  // :83 检查
    ...
    if (bytesRead === 8 && head.toString('utf8') === 'PHAUD1\0\0') { this.blockReady = true; return }
    } finally { await fh.close() }                               // :91 await 点
    const raw = await readFile(this.file, 'utf8')                // :93 以 utf8 读【二进制密文】
    const lines = raw.split('\n').filter(l => l.trim() !== '')
    const blocks = await Promise.all(lines.map(l => this.ctx.storage.auditEncryptBlock(l)))
    await writeFile(this.file, Buffer.concat(blocks))            // :96 覆写
    this.blockReady = true                                       // :98 置位
  ```
- **问题**【推断，有强证据】：`blockReady` 在 :83 检查、:98 才置位，中间全是 `await`。请求 A 与 B 同时首写 → A 完成重写（文件已是密文）→ B 的 `readFile` 才执行 → **B 以 UTF-8 读密文**（非法字节膨胀为 U+FFFD）→ 按 `\n` 切分 → 每段再加密一遍 → 覆写。
- **磁盘实证**【实证】：`data/audit.jsonl.bak-huge-446mb.damaged-20260905-060718`（426MB）含 **874,799 个合法 PHAUD1 块**；抽样 878 块中 **877 块「GCM 解密成功但明文不是 JSON」**（明文本身即乱码——正是二进制被当文本再加密的特征）。体积算式吻合：密文中约 875K 个 `0x0A` 字节 → 875K 块 × 每块 36B 头尾 + UTF-8 膨胀 ≈ 426MB。
  另一份 `audit.jsonl.damaged-*`（7.19MB）表现为 **1961 块后断裂 + 6.5MB 尾部残留**，是 `:165` 全量重写写到一半中断的典型签名。
- **影响**：审计文件会被**全量损坏**并指数膨胀。这不是理论问题——**2026-09-05 已经真实发生过一次**，产出了 442.9MB 损坏备份，且当前 `audit.jsonl` 已恢复正常（343KB）说明有人手工处理过，但**代码未修**，随时会复发。审计是等保/追责的唯一依据，全损等于失去追溯能力。
- **改法**：
  1. 用单一 in-flight Promise 串行化该迁移（`if (this.migrating) return this.migrating`），**不要用布尔标志**；
  2. 首字节改用**字节比较** magic，不要 `toString('utf8')` 比对二进制；
  3. 迁移写回走 `tmp + rename` 原子写，并**先留一份 `.bak`**；
  4. 参考 `svc-storage` 的正确写法（`privhub-svc-storage/src/index.ts:150-156`）。
- **验收**：写并发测试——20 个请求同时首次写入，结束后文件块数 == 20、全部可解密为合法 JSON。

### D2
- **名称**：审计保留策略与条目上限实际不生效
- **状态**：⬜
- **优先级**：P1 · 🟠 后端
- **证据**【实体】：`privhub-svc-audit/src/index.ts:113`
  ```ts
  // 低频清理：每 200 条触发一次过期清理，避免每次写入都重读文件
  if (Math.floor(Date.now() / 1000) % 200 === 0) await this.prune()
  ```
  注释说"每 200 条"，实现是"**当墙钟秒数恰为 200 的整数倍那一秒**"——即每 200 秒中只有 1 秒会触发，命中率 0.5%。
  另 `:78` `this.maxEntries = 200_000`；`:158` `if (all.length === 0) return`。
- **问题**：清理几乎不触发；且损坏文件解密得 0 条时直接返回，**永不修复**。
- **影响**【实证】：事故文件 **874,799 块 ≫ maxEntries 200,000**，直接证明上限从未生效。审计文件会无界增长（这正是 446MB 的另一半原因），最终撑爆磁盘。
- **改法**：改为**按写入计数**（如每 200 次 `log()` 触发）或进程级 `setInterval` 双触发；`prune()` 按 `maxEntries` 真正截断；损坏文件要能被识别并隔离。
- **验收**：连续写入 1000 条后条目数不超过上限；`grep prune` 无墙钟取模。

### D3
- **名称**：审计文件全量重写未用原子写
- **状态**：⬜
- **优先级**：P1 · 🟠 后端
- **证据**【实体】：`:96` 与 `:165` 均为 `await writeFile(this.file, Buffer.concat(blocks))`，无 `tmp + rename`。
  对照 `svc-storage` 是有原子写的（`privhub-svc-storage/src/index.ts:150-156`）。
- **影响**【实证】：`audit.jsonl.damaged-*` 的"1961 块后断裂 + 6.5MB 尾部残留"就是写中断的签名——**这份损坏已经真实存在于磁盘上**。
- **改法**：复用 `svc-storage` 的原子写。
- **验收**：写入过程中 kill 进程，文件要么是旧版本、要么是新版本，不出现半截。

### D4
- **名称**：JSON 读取失败静默降级为空，随后一次写入即永久覆写
- **状态**：⬜
- **优先级**：P1 · 🟠 后端
- **证据**【实体】：`privhub-core/src/index.ts:451-457`
  ```ts
  try { return JSON.parse(raw) as TrashRecord[] } catch { return [] }   // :454 读失败 → 空
  ...
  async saveTrash(list) { await this.atomicWrite(this.trashFile, JSON.stringify(list, null, 2)) }  // :457 整表覆盖
  ```
  同形态散落多处：`svc-meta:110-113`（`catch { this.data = {} }`）、`files-comments:43`、`files-invite:38`、`files-publish:37`、`files-versions:40`、`shell-recent:40`、`shell-favorites:40`、`svc-rag:250,257`、`files-agent:156`。
- **问题**：读到损坏内容 → 当成"空数据" → 下一次写操作把空数据写回去。
- **影响**：一次磁盘故障或半截写（见 [D3](#d3)）就会把**剩余可恢复的数据彻底抹掉**。回收站、标签、版本、收藏、批注都在此列。这是"损坏 → 覆写"的二次伤害，比损坏本身更致命。
- **改法**：读取失败时进入**只读保护**，把损坏文件改名为 `xxx.corrupt-<时间戳>` 隔离，**禁止在"读失败"状态下写入**；同时提示管理员。
- **验收**：人为写坏 `trash.json`，服务应告警并拒绝写入，原文件被改名保留。

### D5
- **名称**：`users.json` 损坏即管理员集体锁死
- **状态**：⬜
- **优先级**：P1 · 🟠 后端
- **证据**【实体】：`privhub-core/src/index.ts:224-226`
  ```ts
  const raw = await this.ctx.storage.readText(this.usersFile)
  const parsed = JSON.parse(raw) as { users: UserRecord[] }   // :225 无 try/catch
  this.users = new Map()
  ```
  初始化失败仅打日志：`apply` 的 `.catch(e => ctx.logger?.warn(...))`（:545）。
- **问题**：与 [D4](#d4) 相反——这里不降级，而是**直接抛出**，且错误只进日志。
- **影响**：`users.json` 一旦损坏，`users` 保持为空 → **所有人都登不上，包括管理员**，只能手工修文件。且提示只在控制台。
- **改法**：解析失败时保留上次成功的内存实例，或提供显式的"重建管理员"流程；错误要显著提示而非一行 warn。
- **验收**：写坏 `users.json` 后启动，有人工可执行的恢复路径，而非无声锁死。

### D6
- **名称**：读-改-写无锁，并发操作互相覆盖
- **状态**：⬜
- **优先级**：P1 · 🟠 后端
- **证据**【实体】：
  ```ts
  async moveToTrash(...) {                                  // privhub-core/src/index.ts:461
    const list = await this.loadTrash()                     // :472 读全量
    list.push({ ... })                                      // :473 改
    await this.saveTrash(list)                              // :477 写全量
  }
  ```
  全仓**无任何互斥/串行化原语**（grep 无 mutex/lock/queue；唯一的 `lock` 是 office2 的编辑锁，属业务锁）。
  同类跨插件写：`files-versions/src/index.ts:84-90`、`files-edit-md/src/index.ts:80-89`；
  且 `data/versions.json` 有**两个写入者**——`files-versions/src/index.ts:32` 与 `files-agent/src/m2.ts:303`。
  落盘点共 **39 处**，分布 21 个插件；回收站内部还有 `restoreTrash`(:482) / `purgeTrash`(:502) / `purgeExpiredTrash`(:517) 及每 6 小时定时清理，**五条路径改同一个文件**。
- **问题**：单次写盘是原子的（`svc-storage` 走 tmp+rename），但"读→改→写"**序列**不是。
- **影响**：A、B 同时删文件 → A 读到 `[x]`、B 也读到 `[x]` → A 存 `[x,a]`、B 存 `[x,b]`。文件 `a` 的实体已 rename 进 `.trash/`，**但记录没了 → 界面上彻底消失，既恢复不了也清理不掉，永久占磁盘**。定时清理同理，会顺手抹掉期间新产生的记录。局域网多人场景下必然发生。
- **改法**：
  1. 在 `privhub-core` 加按文件路径串行化的写队列（`withFileLock(key, fn)`，把 `fn` 接到该 key 的 promise 链尾）；**整段 `load→改→save` 包进去，不要只锁 save**；
  2. 提供统一的 `svc.updateJson(file, mutate)` 辅助，21 个插件逐步迁移；迁移完成前至少先锁**回收站、users、acl**（丢数据后果最重）三处。
- **验收**：并发测试——对同一项目并发 20 次删除不同文件，断言记录数 == 20 且 `.trash/` 无孤儿文件。

### D7
- **名称**：原子写的临时文件名固定，并发写同一目标互相冲突
- **状态**：⬜
- **优先级**：P1 · 🟠 后端
- **证据**【实体】：`privhub-svc-storage/src/index.ts:153-155`
  ```ts
  const tmp = file + '.tmp'
  await writeFile(tmp, out)
  await rename(tmp, file)
  ```
  旁证：`privhub-shell-recent/src/index.ts:80-85` 的注释自认"多实例共享数据目录时 rename 偶发竞争"并加了重试——说明这个竞争**已经被观察到过**。
- **问题**：两个并发写同一文件会共用同一个 `.tmp`。
- **影响**：内容错乱或 `rename` 失败；[D6](#d6) 的丢更新部分也由此加剧。
- **改法**：临时名加 `pid + 随机后缀`（`file + '.' + process.pid + '.' + randomBytes(4).toString('hex') + '.tmp'`）；启动时清扫陈旧 `.tmp`。
- **验收**：并发写测无失败；无 `.tmp` 残留。

### D8
- **名称**：会话表只增不减，过期不清理
- **状态**：⬜
- **优先级**：P1 · 🟠 后端
- **证据**【实体】：`privhub-core/src/index.ts:290-298` —— 仅当**同一 token 再次被使用**时才删除过期条目，无周期性清理。
  另 `:295-298` 滑动续期里 `void this.saveSessions()` 是 fire-and-forget，每次请求都可能触发**全表落盘**。
- **影响**【实证】：解密 `sessions.json` 得到 **3121 条会话，其中 2902 条已过期（93%）**，而真实用户只有 2 个（admin/user1）。文件已 365KB，且每次续期全量重写——既是磁盘浪费，也是 [D6](#d6) 写竞争的放大器。
- **改法**：启动 + 定时清理过期会话；保存时按 TTL 过滤；续期只标脏，由定时器统一落盘。
- **验收**：重启后过期会话清零；`sessions.json` 体积随实际登录数增长。

### D9
- **名称**：RAG 向量库为明文 SQLite，且索引含明文文件路径
- **状态**：⬜
- **优先级**：P1 · 🟠 后端
- **证据**【实体】：`privhub-svc-rag/src/vec.ts:26` `this.db.pragma('journal_mode = WAL')`；`:43` `CREATE VIRTUAL TABLE ... vec0(chunk_id TEXT PRIMARY KEY, ...)`；`:16` 注释确认 `docId = project::path`（即 `chunk_id` 含项目与文件路径）。
- **影响**【实证】：`data/rag-corpus/vectors.db`（1.98MB）与 `-shm` / `-wal`（3.96MB）文件头均为 `SQLite format 3`，**无 PHENC1**。宿主机可直接读出全部文件路径索引（`WAL` 里还有近期明文片段）。与"所有数据加密"的承诺不符，且路径本身即敏感信息。
  好消息：`data-files/` 用户文件是**全加密**的（534 个文件全部 PHENC1，零明文）。
- **改法**：向量库加密落盘（或至少用哈希替代 `chunk_id` 中的明文路径）。
- **验收**：`vectors.db*` 无法直接读出文件路径。

### D10
- **名称**：4 类系统数据为明文落盘
- **状态**：⬜
- **优先级**：P1 · 🟠 后端
- **证据**【实体】：`settings.json:43`、`files-comments:47`、`files-invite:42`、`files-publish:41` 四处均直接 `await writeFile(file, JSON.stringify(x, null, 2), 'utf8')`，**绕过 `ctx.storage`**（因此既无加密也无原子写）。
  【实证】磁盘核对：20 个 JSON 中 16 个为 `PHENC1`，这 4 个为明文。
- **影响**：宿主机或拿到备份的人可直接读到**文档批注内容**、**内网发布链接**（含免登录凭据）、**邀请码**、系统设置。后三者是**凭证类**数据，明文等于把钥匙摆在桌上。
- **改法**：改走 `ctx.storage.readText/writeText`（其余 16 个已如此）。`svc-storage` 对明文有自动识别，**不需要写迁移脚本**，下次写入即自动变密文。
- **验收**：触发一次写入后 4 个文件首字节为 `PHENC1`；功能无回归。

### D11
- **名称**：备份覆盖不全、只增不删、依赖外部 git
- **状态**：⬜
- **优先级**：P1 · 🟠 后端
- **证据**【实体】：`privhub-git-backup/src/index.ts`
  ```ts
  const DATA_FILES = join(rootDir, 'data-files')   // :32 只备份用户文件
  const REPO = join(rootDir, 'data', 'git-backup')
  async function git(cwd, args) { const r = await execFileP('git', args, ...) }  // :38 无 try/catch
  ```
  `syncMirror`（:80-89）只有 `copyFile`，**无删除分支**；仓库只 `git commit`，**无 `gc` / `prune`**。
- **影响**：
  - **备份盲区**：`data/` 下的账号（`users.json`）、ACL、标签、版本、审计**全无备份**；误删账号/权限只能重建；
  - **密钥单点**：`data/secret.key` 无第二份，丢失 = **data-files 全部永久无法解密**；
  - **镜像只增**：【实证】mirror 296 个文件 vs 源 185 个 → **111 个源已删的陈旧文件**；
  - **git 对象膨胀**【实证】：`.git/objects/pack` 下 **0 个 pack、1013 个松散对象**，仓库 33.4MB，只增不减；
  - **静默失效**：本机 `Get-Command git` 无结果（常见安装路径也没有），而定时器每 60s 跑一次失败只 `logger.error`。【不确定】服务器进程启动时 PATH 是否含 git ——`data/git-backup/.git` 有 1013 个对象说明**此前环境有 git 可用**，本次只读审计无法确认运行时环境。
- **改法**：
  1. 备份范围扩到 `data/` 下非密钥数据文件；密钥单独提示（首次生成后要求复制到异地）；
  2. `syncMirror` 增加"源已删 → 删镜像副本"分支；
  3. 按提交数/体积阈值触发 `git gc --auto`；
  4. 启动探测 git 可用性，缺失则**显著告警并关闭定时器**（而非每 60s 静默失败）；或改为不依赖 git 的纯文件快照方案（更契合低配环境）。
- **验收**：备份仓库含账号与权限文件；卸载 git 后启动有明确告警；mirror 文件数与源一致。

### D12
- **名称**：RAG 语料"删除"只清零不删文件
- **状态**：⬜
- **优先级**：P2 · 🟠 后端
- **证据**【实体】：`privhub-svc-rag/src/index.ts:376,408` 两处 `if (existsSync(f)) await ctx.storage.writeText(f, '').catch(() => {})`。
- **影响**【实证】：`rag-corpus/` 252 个 jsonl 中 **73 个恰好 36 字节**（= 20B 头 + 0B 正文 + 16B tag 的空加密文件）。目录只增不减。
- **改法**：改为 `unlink`，或定期清扫 36 字节空块。
- **验收**：剔除语料后对应文件消失而非变空文件。

### D13
- **名称**：明文→密文批量迁移是死代码
- **状态**：⬜
- **优先级**：P2 · 🟠 后端
- **证据**【实体】：`privhub-svc-storage/src/index.ts:280,285` 的 `migrateTree` / `migrateTreeExclude` 定义后**全仓无调用点**；文档引用的 `scripts/encrypt-migrate.mjs` **不存在**（`privhub/scripts/` 仅剩 `doc2md.py`）。
- **影响**：旧明文文件只能靠"被再次写入"顺带加密——**长期不写的文件将永远保持明文**。对已有部署意味着"以为已经全加密，实际没有"。
- **改法**：补回迁移脚本，或做成启动时一次性迁移任务（带进度与失败清单）。
- **验收**：跑一次迁移后，`data-files/` 与 `data/` 无明文残留。

### D14
- **名称**：使用已弃用 API `fs.rmdir(recursive)`
- **状态**：⬜
- **优先级**：P1 · 🟠 后端
- **证据**【实体】：`privhub-core/src/index.ts:509` 与 `:526`
  ```ts
  if (s.isDirectory()) await rmdir(src, { recursive: true })
  ```
  日志佐证：`privhub/server-dev.err.log` 中唯一内容就是 `DEP0147: fs.rmdir(path, {recursive:true}) will be removed. Use fs.rm(path, {recursive:true}) instead`。
- **影响**：升级 Node 后"彻底删除"与"30 天自动清理"会抛异常 → 回收站清不掉，[D6](#d6) 的孤儿文件越积越多。当前功能正常，属定时炸弹。
- **改法**：两处改 `rm`（`import { rm } from 'node:fs/promises'`）。
- **验收**：启动后无 DEP0147；彻底删除/清空回收站正常。

### D15
- **名称**：442.9MB 损坏备份无保留策略
- **状态**：⬜
- **优先级**：P2 · 🟠 后端
- **证据**【实证】磁盘实测：
  `audit.jsonl.bak-huge-446mb.damaged-*`（426.19MB）+ `audit.jsonl.bak-corrupt.damaged-*`（9.5MB）+ `audit.jsonl.damaged-*`（7.19MB）+ `recent.json.bak-损坏`。
  命名带中文"损坏"、无时间戳，与代码生成的 `abs + '.bak-' + Date.now()` 模式（`files-agent/src/index.ts:586,656`）不符，**应为人工隔离**。
- **影响**：白占 442.9MB 磁盘；低配宿主机上不可忽视。
- **改法**：确认 [D1](#d1) 修复且无需取证后删除，或压缩归档到数据目录之外。
- **验收**：`data/` 体积回落，且确认无功能依赖这些文件。

> **已检查、未发现问题**：
> `data-files/` 用户文件**全部加密**（534 个文件全 PHENC1，零明文）；`svc-storage.writeBuffer` 的 tmp+rename 原子性设计正确（缺陷仅在临时名，见 [D7](#d7)）；`data/doc-versions/` 索引 287 条 == 磁盘 287 个快照，**0 孤儿 0 悬空，每文件 20 版上限生效**；`data/export-tmp/` **0 残留**（`files-export` 在 `finally` 中 unlink）；`data/agent-idem/` TTL 清理已挂定时器（`m2.ts:363`）；`data-files/` 下 `.bak-`/`.part-` 临时文件 **0 残留**；`rag-corpus/*.jsonl` 与 `git-backup/mirror` 均为 PHENC1（正常）。

---

## 4. 性能（P）

### P1
- **名称**：静态资源每次冷加载全量重传约 2.4MB，且禁用缓存
- **状态**：⬜
- **优先级**：P1 · 🟠 后端 + 🟢 前端
- **证据**【实体】：`privhub/src/web-server.ts:109` 对所有静态文件统一 `'cache-control': 'no-cache'`。
  【实证】体积：`frontend/` 下 js+css **2,045 KB** + 32 个插件 client **356 KB** + `index.html` **53 KB** ≈ **2.4 MB**。
  明细：`xlsx.full.min.js` 923KB、`mammoth.browser.min.js` 628KB、`easymde.min.js` 319KB、`vue.global.prod.js` 163KB。
- **问题**：`no-cache` 是为开发期改代码即时生效，代价是每次打开页面重下全部依赖。
- **影响**：局域网首次打开慢；低配宿主机上多人同时登录时 CPU 与带宽被重复传输占满。
- **改法**：区分开发/生产——生产对 `/vue.global.prod.js`、`/vendor/*`、`/privhub-plugins/*/index.js` 返回 `Cache-Control: public, max-age=31536000, immutable` 并配 `ETag`；用启动时注入版本号或文件 mtime 做指纹破缓存。
- **验收**：二次打开 vendor 命中缓存；改插件代码重启后浏览器能拿到新代码。

### P2
- **名称**：1.55MB 从未被引用的死资源
- **状态**：⬜
- **优先级**：P2 · 🟢 前端
- **证据**【实体】：全仓检索（排除 node_modules / _retired-v2）命中 **0 处**：
  - `privhub/frontend/vendor/xlsx.full.min.js`（923 KB）
  - `privhub/frontend/vendor/mammoth.browser.min.js`（628 KB）
  对照：`easymde.min.js` 被 `index.html:11` 引用，`vue.global.prod.js` 被 `index.html:10` 引用。
- **问题**：重构前遗留（xlsx/docx 解析已改由服务端 `svc-office` 承担）。
- **影响**：白占仓库与部署包体积，也让 [P1](#p1) 的缓存策略更难判断。
- **改法**：确认无引用后删除（与 [E4](#e4) 同批）。
- **验收**：删除后全功能回归通过；`frontend/` 从 2.1MB 降到约 0.5MB。

### P3
- **名称**：EasyMDE 首屏同步加载，仅 Markdown 编辑器需要
- **状态**：⬜
- **优先级**：P2 · 🟢 前端
- **证据**【实体】：`privhub/frontend/index.html:9,11` 在 `<head>` 同步引入 `easymde.min.css`（13KB）+ `easymde.min.js`（319KB）；实际使用点仅 `privhub-files-edit-md/client/index.js:165` `new EasyMDE({...})`。
- **影响**：登录页、文件浏览页都白加载 332KB。
- **改法**：改为按需——打开编辑器时动态插入 `<script>`/`<link>` 并 await 完成。
- **验收**：登录页网络面板无 easymde；打开 .md 时正常加载。

### P4
- **名称**：目录列表为每个文件额外做一次加密探测
- **状态**：⬜
- **优先级**：P2 · 🟠 后端
- **证据**【实体】：`privhub-core/src/index.ts:342-352`
  ```ts
  const stats = await Promise.all(ents.map(async (e) => {
    ...
    if (!s.isDirectory() && await this.ctx.storage.isEncrypted(full)) size = Math.max(0, size - 36)   // :349
  ```
  同文件 `:336` 注释自述目标是"并行 stat（Promise.all，千级目录不串行卡顿）"。
- **问题**：为显示明文体积，每个文件额外 open/read 一次文件头。
- **影响**：千级目录 I/O 次数翻倍，低配宿主机列表加载变慢——与注释承诺的优化目标相抵。
- **改法**：列表不显示精确大小（显示 `—` 或粗值），精确体积留到右侧详情面板（单文件时才探测）；或按 mtime 缓存探测结果。
- **验收**：2000 文件目录列表耗时明显下降；详情面板体积仍正确。

### P5
- **名称**：office2 自带 10.7MB 前端依赖
- **状态**：⬜
- **优先级**：P2 · 🟢 前端
- **证据**【实体】：`privhub/plugins/privhub-files-office2/client/vendor/`：`univer.bundle.js` **10.5MB**、`univer.css` 80KB、`jszip.js` 95KB、`docx-preview.js` 74KB，合计 **10.7MB**；由 `client/view.html:68-70` 引入。
- **影响**：比其余前端依赖总和还大 4 倍。当前已是 iframe 内按需加载，属可接受；但部署包体积与首次打开该页的等待受影响。
- **改法**：评估能否把 `univer.bundle.js` 裁剪到仅保留 docx/xlsx 必需部分。
- **验收**：不打开 Office 预览时该文件不被请求（现状应已满足，需确认）。

---

## 5. 运维与部署（O）

### O1
- **名称**：生产部署包落后于开发源码
- **状态**：⬜
- **优先级**：**P0** · 🟠 后端
- **证据**【实证】`deploy/privhub-deploy/` 与 `privhub/` 对比：

  | 项 | 开发 `privhub/` | 生产 `deploy/privhub-deploy/` |
  |---|---|---|
  | 插件目录数 | 48 | **45** |
  | `svc-rag`（AI 工具总台） | ✅ | ❌ **完全没有** |
  | `src/main.ts` | 09-05 18:23 | 09-02 07:17 |
  | `src/web-server.ts` | 09-06 00:17 | 09-02 08:05 |
  | `frontend/index.html` | 09-06 09:13 | 09-04 00:01 |
  | `explorer-v3/client/index.js` | 09-06 09:31 | 09-05 18:39 |

- **问题**：3181 端口对外服务的生产环境跑的是 09-02~09-05 的旧快照。
- **影响**：**线上没有 RAG，也缺最近一批修复（含安全修复）**。用户在 3181 看到的功能与开发环境不一致，会反复出现"我这儿明明是好的"。本文档所有安全修复在线上均未生效。
- **改法**：把 `privhub/` 的 `src/`、`plugins/`、`frontend/` 同步到 `deploy/privhub-deploy/`；同步后启动 3181 核对 L3 发现列表应与开发环境一致；随后固化成脚本（[O4](#o4)）。
- **验收**：`deploy/privhub-deploy/plugins/` 目录数 48；3181 启动日志出现 `[assembly] 发现 L3 插件: privhub-svc-rag`。
- **⚠️ 注意**：**保留 `deploy/privhub-deploy/data/` 与 `data/secret.key` 不要覆盖**，否则现有数据无法解密。

### O2
- **名称**：无健康检查端点
- **状态**：⬜
- **优先级**：P2 · 🟠 后端
- **证据**【实体】：108 条路由中无健康检查类端点（grep 无 `/healthz`、`/ping`、`/version`）。
- **影响**：宿主机重启后服务没起来，用户只看到"打不开"，无法快速区分"服务挂了""端口被占""网络不通"；以后想加看护脚本也无从判断。
- **改法**：加免登录 `GET /privhub/api/health`，返回 `{ ok, version, uptime, plugins }`（**不要**泄露路径、账号数）。
- **验收**：`curl http://127.0.0.1:3180/privhub/api/health` 返回 200；服务停止时连接失败。

### O3
- **名称**：日志只有 console，无文件、无分级
- **状态**：⬜
- **优先级**：P2 · 🟠 后端
- **证据**【实体】：`privhub/src/main.ts:75-80` 等均为 `console.log/warn/error`；现有 `server-dev.log` / `.err.log` 是外部重定向产物，非程序自身写入。
- **影响**：出问题只能靠控制台窗口（关掉即消失），无法回溯"昨天下午谁的操作导致报错"。
- **改法**：加极简日志器，按天写 `data/logs/privhub-YYYY-MM-DD.log`，保留 N 天，错误堆栈完整。（业务审计已有 `audit.jsonl`，这里补的是**系统错误**。）
- **验收**：产生一次错误后对应日志文件有带时间戳的记录。

### O4
- **名称**：测试脚本与打包脚本在本工作区缺失
- **状态**：⬜
- **优先级**：**P0**（作为其他改动的前置）· 🟠 后端
- **证据**【实证】：以下文件**均不存在**——
  `tests/_archive/project-tests/smoke-batch1.mjs`（核心冒烟）、`privhub-closedloop-test.mjs`（闭环 34/34）、`run-all.mjs`（全量回归 26 套）、`verify-package.mjs`（部署包自检）、`check-storage-enc.mjs`（加密链路）、`scripts/build-deploy.ps1`（打包）。现存脚本仅 `privhub/scripts/doc2md.py`。
- **问题**：**没有任何回归手段**。
- **影响**：本文档 P0/P1 改动全都涉及核心链路（请求体、审计写入、删除、加密、静态服务），改完无法验证有没有改坏别的功能——**每一步改动都变成赌博**。这是所有其他工作的前置条件。
- **改法**：
  1. 先从其他副本/归档恢复原有测试资产（`.gitignore` 含 `tests/`，说明它们可能存在于别处）；
  2. 恢复不了就写最小集：**登录 → 上传 → 预览 → 下载 → 重命名 → 删除 → 回收站恢复 → ACL 拒绝 → 审计有记录 → 加密落盘校验**，约 10 个用例覆盖主干；
  3. 打包脚本要一条命令重建 `deploy/privhub-deploy/`，并默认**跳过 `data/` 与 `data-files/`**（防误删生产数据）。
- **验收**：`node run-all.mjs` 全绿；打包脚本跑完部署包可直接启动。

> **已检查、未发现问题**：`.gitignore` 配置正确完整（`deploy/`、`deploy.zip`、`references/`、`tests/`、`/0`、`*.bak*`、`**/sessions.json` 等均已排除）。

---

## 6. 工程质量（E）

### E1
- **名称**：插件装配双源维护
- **状态**：⬜
- **优先级**：P1 · 🟠 后端
- **证据**【实体】：`privhub/src/main.ts:46-51` 的 `CORE_PLUGINS` 硬编码 17 项，与 L3 自动发现（:55-84）并存；`svc-rag` 名字带 `svc-` 前缀但不在清单，实际按 L3 装配。全仓 `package.json` 中 `"layer"` 标记数 **0**。
- **影响**：新增/删除 L1、L2 插件必须改 `main.ts`，L3 又不需要——两套规则；漏改时插件不加载，且启动日志只表现为"少一行发现记录"，**不报错**。
- **改法**：插件 `package.json` 加 `"privhub": { "layer": "L1"|"L2"|"L3" }`；`main.ts` 按层扫描装配，L1 保持手动顺序（有依赖关系），删除 `CORE_PLUGINS`。
- **验收**：新增 L2 插件只建目录即可被装配；启动日志按层打印清单。

### E2
- **名称**：大文件拆分
- **状态**：⬜
- **优先级**：P2 · 🟠 后端 + 🟢 前端
- **证据**【实证】2026-09-11 实测整文件行数：
  `privhub-files-explorer-v3/client/index.js` **1649 行**、
  `privhub-svc-rag/src/index.ts` **1286 行**（+ `vec.ts` 85）、
  `privhub-svc-rag/client/index.js` **1025 行**、
  `privhub-files-agent/src/index.ts` **999 行**（`m2.ts` 383 行已是拆分先例）。
  三者（explorer-v3 client + svc-rag client + index.html）合计 3629 行 = 前端总量 8172 行的 **44%**。
- **影响**：改一处要通读全文；**AI 代理改这类文件时更容易误伤无关代码**（本项目历史上已有 6 个插件被批量改坏的事故）。
- **改法**：按 `m2.ts` 模式拆——explorer-v3 拆 `tree.js`/`tabs.js`/`content.js`/`detail.js`/`menu.js`；svc-rag 拆 `corpus.ts`/`search.ts`/`ask.ts`/`vector.ts`（client 已有 `RagCorpusPanel`/`RagKeysPanel`/`RagDupPanel` 三组件雏形可续切）。
- **验收**：各文件 < 800 行；功能零回归。

### E3
- **名称**：重复的工具函数（详见 [S12](#s12)）
- **状态**：⬜ · **优先级**：P2 · 🟠 后端
- **证据**【实体】：`json()` **7 份**、`readBody()` **5 份**；已有 25 个插件正确从 core 引入。
- **影响**：副本已与安全基线不一致；修 [S1](#s1) 时要改 5 处。
- **改法**：删除副本，统一引入。
- **验收**：`grep -rn "function json(" privhub/plugins` 只剩 core 一处。

### E4
- **名称**：5 份同构 Markdown 渲染器（约 350 行重复）
- **状态**：⬜ · **优先级**：P2 · 🟢 前端
- **证据**【实体】：客户端 3 份 `privhub-files-edit-md/client/index.js:21-91`、`privhub-files-explorer-v3/client/index.js:283-333`、`privhub-files-wiki/client/index.js:17-81`；服务端 2 份 `privhub-files-export/src/index.ts:41-`、`privhub-files-mdpage/src/index.ts:19-`。五份 `esc()` 逐份手抄，`files-wiki` 注释自陈"与 F16 同语义，**解耦复制**"。
- **影响**：**转义策略会在副本间分叉**——本次 [S3](#s3) 正是这类复制导致转义缺失的实例。
- **改法**：抽共享渲染模块；客户端经 `/privhub-plugins/` 静态路径复用，服务端直接 import。
- **验收**：唯一实现；三处客户端渲染行为一致。

### E5
- **名称**：清理历史遗留文件
- **状态**：⬜ · **优先级**：P2 · 🟢 前端
- **证据**【实体】：三项均仍存在——`privhub/frontend/legacy-单页.html`（51.9KB，无引用）、`privhub/plugins/_retired-v2/`（`files-explorer`/`files-preview`/`shell-tabs`）、`privhub/privhub-app/`（空目录）；另有 **27 个** `cordis.patch.yml`（纯代码装配后不参与运行）。
- **影响**：干扰判断——本次审计时"哪些资源在用"就多花了功夫（[P2](#p2) 的两个死文件正是这么找出来的）。
- **改法**：移入 `_archive/` 归档而非直接删除；`cordis.patch.yml` 可直接删或加 `.gitignore`。
- **验收**：全仓检索无代码引用；启动无告警。
- **注意**：本机 `git` 不在 PATH，涉及 `git rm` 的步骤需在有 git 的环境执行。

### E6
- **名称**：webServer 仅支持精确匹配路由
- **状态**：⬜ · **优先级**：P2 · 🟠 后端
- **证据**【实体】：`privhub/src/web-server.ts:66-72` 仅实现 `kind: 'exact'`。
- **影响**：参数化路径写不了，各插件只能手写 `new URL(req.url)` 解析查询串；请求体解析、鉴权、错误响应各写各的（见 [S12](#s12)）。
- **改法**：扩展 `kind: 'prefix'|'param'` + 中间件链（`authGuard` / `bodyLimit`（配合 [S1](#s1)）/ `errorHandler`）。
- **验收**：至少一个插件改用参数化路由与中间件，行为不变。

### E7
- **名称**：前端样式经 `createElement('style')` 注入且不随卸载移除
- **状态**：⬜ · **优先级**：P2 · 🟢 前端
- **证据**【实体】：5 处共注入 88 行 CSS——`privhub-files-comments/client/index.js:15`（7 行）、`privhub-files-explorer-v3/client/index.js:45`（68 行）与 `:1395`、`privhub-files-office2/client/index.js:18`（6 行）、`privhub-svc-rag/client/index.js:17`（7 行），均为 `document.head.appendChild(styleEl)` 无移除逻辑。
- **改法**：收敛到骨架 CSS 变量/公共类（同时解掉 [U4](#u4) 的硬编码色值）。
- **验收**：无运行时 `<style>` 注入；明暗主题一致。

### E8
- **名称**：骨架仍渲染已退役的 `tabs` slot
- **状态**：⬜ · **优先级**：P2 · 🟢 前端
- **证据**【实体】：`privhub/frontend/index.html:876` `<component v-for="c in slotComps.tabs" ...>`；全仓 `client/manifest.json` 中含 `"tabs"` 的文件 **0 个**。
- **改法**：删除该行。
- **验收**：功能无变化。

---

## 7. 使用体验（U）

### U1
- **名称**：键盘快捷键体系
- **状态**：⬜ · **优先级**：P1 · 🟢 前端
- **证据**【实体】：全仓无 `registerHotkey`；仅 txt/md 内嵌编辑有 Ctrl+S。
- **改法**：骨架级快捷键注册表（带 scope，编辑态自动让位）；实现 F2 重命名 / Delete 删除 / Ctrl+A 全选 / F5 刷新 / Enter 打开 / Backspace 返回上级 / Ctrl+F 搜索。
- **验收**：列表态生效；输入框内不冲突；插件卸载后清理。

### U2
- **名称**：视图分发与 slot 渲染声明式化
- **状态**：⬜ · **优先级**：P1 · 🟢 前端
- **证据**【实体】：`frontend/index.html` —— `openBarItem` 的 if/else 枚举链（:705-717，13 个视图名硬编码）；功能面板 12 条 `<component v-else-if>`（:878-892）。
- **改法**：`barItems[].view` 直接作为 `nav.activeView`，骨架只保留 toggle 逻辑（`setActiveView` 已内置该语义，#L428）；模板改为 `VIEW_SLOT` 映射 + `v-for` 动态渲染。
- **验收**：新增 `barItems.view` 无需改骨架；13 个现有视图入口回归通过。

### U3
- **名称**：前端事件总线治理与事件命名统一
- **状态**：⬜ · **优先级**：P1 · 🟡 跨端
- **证据**【实体】：前端 `entry:open` **8 处**、后端 `file:opened` **4 处**，两套命名并存；前端 `bus`（`index.html:376`）无声明与审计（后端 `svc-events` 已有 `declareEmit/declareListen`）。
- **改法**：统一走 `file:opened`；前端 `bus` 加 `declareEvent` 注册表，未声明即告警。
- **验收**：全仓 `entry:open` 清零；console 无"未声明事件"告警。

### U4
- **名称**：主题样式变量收敛
- **状态**：⬜ · **优先级**：P2 · 🟢 前端
- **证据**【实体】：插件 client 中硬编码 `rgba(90,130,200` 残留 **13 处**（如 `explorer-v3/client/index.js:101` 附近）。
- **改法**：骨架补齐语义变量（`--accent-soft`/`--hover`/`--selected`，明暗两套），插件改用变量。（与 [E7](#e7) 同批处理。）
- **验收**：暗色主题下观感一致；硬编码色值清零。

### U5
- **名称**：列表虚拟滚动
- **状态**：⬜ · **优先级**：P2 · 🟢 前端
- **证据**【实体】：explorer-v3 client 无窗口化实现（grep `virtual|windowSize` 0 命中），千级目录全量渲染 DOM。
- **改法**：先实测千级目录基线，确有卡顿再引入窗口化。
- **验收**：3000 文件目录滚动流畅。

### U6
- **名称**：标签页上限行为定义
- **状态**：⬜ · **优先级**：P2 · 🟢 前端
- **证据**【实体】：`privhub-files-explorer-v3/client/index.js:197` —— 软上限 30，超出时 `store.tabs.splice(0, store.tabs.length - 30)` **静默淘汰最早的标签**，无提示。
- **改法**：给出上限提示，或改为溢出横向滚动不淘汰；同步《需求文件》A3 描述与实际一致。
- **验收**：打开第 31 个标签有明确反馈。

### U7
- **名称**：回收站同名冲突处理
- **状态**：⬜ · **优先级**：P2 · 🟡 跨端
- **证据**【实体】：`privhub-core/src/index.ts:490` `if (existsSync(dest)) return false`（同名直接失败）；`privhub-trash/src/index.ts` 无 `force`/改名分支。
- **改法**：支持 `force`（覆盖）与 `rename`（自动改名 `xxx（恢复）`）；前端冲突时给「覆盖/跳过/改名恢复」三选一。
- **验收**：三种处理均可完成恢复；审计动作可区分。

### U8
- **名称**：前端交互细节修复（4 项）
- **状态**：⬜ · **优先级**：P2 · 🟢 前端
- **证据**【实体】：
  1. `privhub-files-upload-queue/client/index.js:29-33` —— "重试失败项"不是重试：只重开文件选择器并把**全部条目**置为 `uploading`（`bus.emit('upload:request')` + `map(x => ({...x, status:'uploading'}))`），无成功/失败回填；用户取消后条目**永久停在 ⏳**。另 `:46` 的 `setTimeout(..., 30_000)` 未在 `beforeUnmount` 清理。
  2. `privhub-shell-favorites/client/index.js:14` 与 `:62` —— 同一 `fav:add` 事件被模块级与组件级**两处监听**，收藏一次触发两次 POST（服务端有去重 `shell-favorites/src/index.ts:83`，故只浪费请求）。
  3. `privhub-files-dataview/client/ph-table.js:12,14`、`privhub-files-upload/client/index.js:111-113`、`privhub-files-office2/client/view.js:26-34` —— 绕过 `window.PrivHub.api()` 直接 fetch + 手工读 token，丢失统一的 401 自动登出，token 过期只显示"❌ 加载失败"无重新登录引导。
  4. `privhub-files-explorer-v3/client/index.js:1502` —— 裸调用 `api()` 不 await/void/catch，标签移除失败无任何反馈。
  5. `privhub-trash-ui/client/index.js:7,15` —— 写入的 `window.PrivHub.trashBadge` 是**只写不读的死全局**，注释与实现不符（真正生效的是 `badges.trash`，`client:33`）。
- **改法**：逐条按上述修正（重试保留失败 File 引用；二留一；改用 `api()`；补 await/catch；删除死全局）。
- **验收**：取消上传后条目不停留 ⏳；收藏只发一次请求；token 过期统一提示重新登录。

### U9
- **名称**：视觉层改进（苹果风格 / 窄版收起）
- **状态**：⬜ · **优先级**：P2 · 🟢 前端
- **说明**：仅视觉层——毛玻璃（`backdrop-blur`）、圆角、柔和配色；窄屏（<640px）收敛文字为图标 + hover 气泡。
- **约束**：**功能入口必须保持在左侧图标栏，不改交互布局**（用户既定要求）。
- **验收**：入口位置不变；明/暗主题正常；窄版无文字溢出。

---

## 8. 功能缺口（F）

### F1
- **名称**：ACL 规则自锁防护
- **状态**：⬜ · **优先级**：P2 · 🟠 后端
- **证据**【实体】：`privhub-admin-acl` 与 `privhub-svc-acl` 中检索"自锁"**0 命中**，无管理员保护校验。
- **改法**：禁止通过 ACL 界面移除 admin 对 `admin/acl/audit` 的 view 权限；前端加警示；启动时检测危险规则并告警。
- **验收**：无法把自己锁在管理界面之外。

### F2
- **名称**：ACL 守卫覆盖自查
- **状态**：⬜ · **优先级**：P2 · 🟠 后端
- **证据**【实体】：白名单 `GUARD_PATHS` 显式登记 **37 条**（`privhub-admin-acl/src/index.ts:57-118`），而全仓 **108 条**注册。守卫通过包装 `svc.route` 让之后注册的路由都**经过**守卫函数，但**是否实际裁决取决于是否登记在白名单**——未登记即透传。
  已知遗漏：`comments/reply`、`comments/status`（`admin-acl:97,117` 未登记）、`publish` 只登记了 POST（`files-comments:117,136`）；`ai/office/*`（见 [S6](#s6)）。
- **改法**：守卫层提供 `routesWithNoAcl()` 调试接口列出未裁决路径；配套测试断言"新增文件类路由必须登记或显式豁免"。
- **验收**：`routesWithNoAcl()` 返回空或仅剩显式豁免清单。

### F3
- **名称**：API 契约文档
- **状态**：⬜ · **优先级**：P1 · 🟢 前端
- **证据**【实证】：108 条路由无集中清单（现有 `docs/PrivHub-AgentAPI-*.md` 只覆盖智能体接口）。
- **改法**：生成《docs/PrivHub-API-接口清单.md》：方法 / 路径 / 鉴权要求 / 是否入 ACL 裁决 / 审计动作；可由脚本从各插件 `svc.route` 调用处扫描生成初稿。
- **验收**：文档覆盖全部路由，可增量维护。

### F4
- **名称**：明确未做的功能（非缺陷）
- **状态**：⬜ · **优先级**：P2 · 视需求

  | 项 | 现状 | 说明 |
  |---|---|---|
  | 多人实时协同编辑 | `svc-collab` 仅骨架（会话/补丁上限），无 CRDT/OT、无协同光标 | 需评估低配 Windows 风险后再立项 |
  | 病毒扫描 | 无 | 可选插件，调用 ClamAV 外部进程；失败不影响主流程 |
  | 外部检索引擎 | 现为自研 BM25+bigram + sqlite-vec 向量检索 | 语料规模大到出现性能问题再换 Meilisearch/FTS5 |
  | 反向链接面板 | 双链关系已由 `files-kg` 图谱呈现 | 独立的"反向链接"侧栏面板未做 |
  | RAG 摄取队列持久化 | 纯内存队列（`svc-rag/src/index.ts:1030-1053`），进程重启丢事件 | 【不确定】是否有周期性全量 rebuild 补偿——未在定时器中发现 |

---

## 9. 审计方法与局限

**方法**：源码逐文件核对（48 插件 / 108 路由 / 955 行骨架）+ 三路独立只读审计（安全面、数据面、前端面）+ 磁盘数据只读解析取证。所有行号均已回读验证。

**局限（请在据此决策前知悉）**：

1. **本次为纯静态审计，未启动服务、未发送任何请求**——所有"可利用性"判断均为代码推演，未做实际渗透验证。
2. **依赖库 CVE 未评估**：`xlsx@0.18.5`（SheetJS 社区版，已弃用的 npm 分发）、`pdf-parse`、`mammoth`、`jszip` 版本均未与漏洞库比对，需联网执行 `npm audit` 单独查一次。
3. **[D1](#d1) 的 446MB 根因是"有强证据的推断"**，不是现场复现——证据是 877/878 个块"解密成功但非 JSON"这一特征，与"二进制被当文本再加密"完全吻合，且体积算式对得上。
4. **[S5](#s5) 静态路径前缀**：已逐字推演 `..` 与 `%2e%2e` 均难以逃逸，**未实测**；定为"写法缺陷"而非"当前可利用漏洞"。
5. **[S15](#s15) docx-preview 可被恶意 docx 触发脚本**：**未验证**，仅确认无净化器 + iframe 无 sandbox。
6. **git 是否在服务器进程 PATH 中**：本机 shell 无 git，但 `data/git-backup/.git` 有 1013 个对象说明此前可用；只读审计无法确认运行时环境。
7. **`data/` 下 442.9MB 损坏备份**的存在已确认为人工隔离（命名与代码模式不符），未清理。

---

## 10. 与旧《改进需求清单》的对照

> 旧文件 24 项内有价值的条目**全部保留**，重新归类编号；已完成的如实标注。

| 旧编号 | 旧名称 | 现在的位置 | 状态 |
|---|---|---|---|
| D1 | 重写《插件实现规则》现状表 | — | ✅ 2026-09-11 完成 |
| D3 | 同步前端通信总线契约 | — | ✅ 2026-09-11 完成 |
| D2 | 重新盘点功能完成度 | 未纳入（属文档整理，非代码改进） | 建议单独做，产物 `docs/v2/功能完成度盘点-2026-09-11.md` |
| D4 | 清理过时文件 | **[E5](#e5)** | 保留 |
| F1 / F2 | 视图分发 / slot 渲染声明式化 | **[U2](#u2)**（合并） | 保留 |
| F3 | 骨架 nav 职责拆分 | 归入 [E2](#e2) 派生收益 | — |
| F4 | explorer-v3 client 拆分 | **[E2](#e2)** | 行数更新为 1649 |
| F5 | 键盘快捷键 | **[U1](#u1)** | 保留 |
| F6 | 列表虚拟滚动 | **[U5](#u5)** | 保留 |
| F7 | 前端事件总线治理 | **[U3](#u3)**（并入命名统一） | 保留 |
| F8 | 主题变量收敛 | **[U4](#u4)** | 残留 13 处已复核 |
| B1 | 大插件拆分 | **[E2](#e2)** | 行数全部更新 |
| B2 | 装配去双源 | **[E1](#e1)** | 保留 |
| B3 | 路由与中间件扩展 | **[E6](#e6)** | 保留 |
| B4 | patch.yml 清理 | **[E5](#e5)**（合并） | 仍 27 个 |
| B5 | 回收站同名冲突 | **[U7](#u7)** | 保留 |
| B6 | ACL 自锁防护 | **[F1](#f1)** | 保留 |
| A1 | 事件命名统一 | **[U3](#u3)** | `entry:open` 仍 8 处 |
| A2 | API 契约文档 | **[F3](#f3)** | 保留 |
| A3 | ACL 守卫覆盖自查 | **[F2](#f2)** | 白名单 37 条已复核 |
| A4 | 标签页上限确认 | **[U6](#u6)** | 已查清：软上限 30 且静默淘汰 |
| N1 / N2 | 苹果风格 / 窄版收起 | **[U9](#u9)**（合并） | 保留 |
| E1 | 部署包落后 | **[O1](#o1)** | 升为 P0 |
| E2 | 测试/打包脚本缺失 | **[O4](#o4)** | 升为 P0（前置） |
| E3 | 部分数据未加密 | **[D10](#d10)** | 已细化为 4 处具体行号 |

**本次新增**（旧清单没有的）：[D1](#d1) 审计竞态根因 · [D2](#d2) 保留策略失效 · [D3](#d3) 审计非原子写 · [D4](#d4) 损坏即覆写 · [D5](#d5) users 锁死 · [D7](#d7) 临时名冲突 · [D8](#d8) 会话泄漏 · [D9](#d9) 向量库明文 · [D11](#d11) 备份盲区 · [D12](#d12)~[D15](#d15) · [P2](#p2)~[P5](#p5) · [O2](#o2)/[O3](#o3) · [E3](#e3)/[E4](#e4)/[E7](#e7)/[E8](#e8) · [S1](#s1)~[S16](#s16) · [F4](#f4) 末行。

---

## 11. 已完成记录

| 日期 | 内容 |
|---|---|
| 2026-09-11 | **文档与代码一致性同步**（对应旧清单 D1、D3）：重写《PrivHub-插件实现规则.md》（48 插件全量清单 + 25 个 slot + 28 键总线契约）；《PrivHub-架构与功能说明.md》插件数 45→48、补路由面（108 条 / 31 插件）、slot/视图计数、纠正加密描述；README 依赖 3→15、补 Node 版本与现状提示；新建本《改进建议》取代旧《改进需求清单》。 |

---

版本：2026-09-11 · 基于 `privhub/` 源码逐文件核对 + 三路独立只读审计生成（48 插件 / 108 路由 / 955 行骨架）
