# PrivHub 双链 ID 化（改名不断链）——2026-10-13

> 来源：改进方案 §2.6（Q4）。对应任务 #14。
> 验收（方案原文）：**「把被引用的文件重命名，图谱边与反链不断。」**

---

## 1. 解决什么

改造前 `[[名字]]` 是**按文件名**在项目里找的。于是把被引用的文件改个名，
引用它的那篇文档并不知道 —— 结果就是：

- 图谱里那条 `link` 边**断了**（目标路径变了，旧名字再也匹配不上）；
- 反链消失（入链为空）；
- 知识库 / Markdown 预览里点那个双链**点不动**（同目录找不到同名文件）。

同一段 `[[…]]` 语法此前还在 **5 个文件里各写一份正则**（kg / refcheck / export / edit-md / wiki），
任何一处漂移都会造成「图谱里有这条边、引用检查里却报断链」这种自相矛盾。

本批把这两件事一起解决：给文件一个**稳定 ID**，并让全仓**只有一份**双链语法定义。

---

## 2. 做法（一句话 + 三条取舍）

```
[[旧名]] ──(登记表：名→ID)──▶ id Lx7f ──▶ 当前路径 docs/概要.md
```

新增 L2 服务 `privhub-svc-links`（`ctx.links`），在侧车登记表 `data/links.json` 里记
「文件 → 稳定 ID」，并**把退役过的文件名留作别名**。文件改名时 ID 不动、路径更新、
旧名进别名表 —— 于是 `[[旧名]]` 照样解析到它。

**取舍（都是刻意的，改之前先读代码里的注释）：**

1. **不改写用户文档。** 另一条路是"改名时把别处正文里的 `[[旧名]]` 改成新名"，
   那要逐字改用户正文：不可逆、会触发版本历史 / 编辑锁 / 协同会话，还可能改错
   （同名不同目录）。本仓选**侧车登记表**，用户文档一个字节都不动。
2. **对前端不可见。** 界面照旧只认 `[[名]]`；ID 只活在服务端。没有前端契约变化，
   老客户端不感知、老数据不用迁移。`[[id:xxx]]` 是**可选**写法，服务端认、界面不生成。
3. **登记表是派生数据。** 丢了能重建（名→路径可从磁盘重扫），所以：读取用严格读取
   （D4：损坏 → 隔离存证 + 拒写，绝不覆盖），但**绝不因为登记表出问题而挡住任何文件操作**；
   条目有上限（20000）、按最久未触碰淘汰。

---

## 3. 解析顺序（这是"不断链"的全部机制）

`resolveTarget(project, target, { live, sourcePath })` 依次：

1. **`id:` 写法** → 直接取 ID 对应路径（带 `live` 时校验其存在）。
2. **目标本身是现存路径**（带目录的写法常命中这里）→ 直接返回；不带扩展名时补 `.md` 再试。
3. **按文件名**：登记表现名 ∪ 活文件现名（登记表在前 ⇒ 解析结果长期稳定）。
   同名多命中时**优先与引用方同目录**（替换了改造前不稳定的"取第一个"）。
4. **退役名（别名）**：这就是改名之后 `[[旧名]]` 仍然命中的那条路。

**三条与既有行为的兼容约定**（刻意不新增语义，避免凭空造出原本不存在的图边）：

- 目标按**完整文件名**匹配（含扩展名）—— 与改造前一致，**不新增"去扩展名也算命中"**；
- **现名优先于别名**：别名被后来的新文件"重新占用"时，新文件胜出；
- `#块锚点` 在解析目标时剥掉（refcheck 早就这么做了，kg 此前没有 —— 现在两边一致）。

`live` 是调用方（图构建 / 扫描）本次枚举出的**活文件索引**，整张图建一次再复用；
它保证"还没被登记的老文件"照样能被现名解析到（否则升级后图谱会突然少一批边）。

---

## 4. 唯一权威定义（正则收敛）

| 位置 | 角色 |
|---|---|
| `plugins/privhub-svc-links/src/linkparse.ts` | **权威定义**：`WIKI_LINK_RE` + `parseWikiLinks` / `normalizeLinkTarget` / `wikiLinkTargets` |
| `privhub-files-kg` / `-refcheck` / `-export`（服务端三处） | 改为 `import`，不再自带正则 |
| `privhub-files-edit-md` / `-wiki`（浏览器端两处） | 浏览器直接加载，**不能** import 服务端 `.ts`，各自保留一份**一字不差**的字面量 |

`tests/integrity.mjs` 新增契约（`── Q4 双链 ID 化契约 ──`）：

- 全仓**只有这 3 个文件**声明 `\[\[` 正则（任何新写的第二份都会让该断言失败）；
- 三处字面量与权威定义**一字不差**（`CANON` 逐字节比对）；
- 服务端三处都确实 `from '.../privhub-svc-links/src/linkparse'`；
- `main.ts` 的 `CORE_PLUGINS` 登记并挂载 `svc-links`；
- 引用 `ctx.links` 的插件都在 `inject` 里声明了 `'links'`（先剥注释，避免"提供方被自己误判"）。

---

## 5. HTTP 面

| 路由 | 门槛 | 说明 |
|---|---|---|
| `GET /privhub/api/kg/resolve?project=&target=` | 登录 + 项目可访问 | 把登记表的解析结果交给界面（认老名字、认 `id:` 写法） |

- 目标对该用户**不可见**时回 `{ ok:true, path:null }` —— **不是 403**。
  403 等于承认"这个名字指向一个你看不见的文件"，那是一次信息泄露；回 `null` 与"没解析到"不可区分。
- 该路由**不在** `privhub-admin-acl` 的 `GUARD_PATHS` 表里（与 `/kg`、`/kg/backlinks` 同口径 ——
  目标路径要先解析出来才知道，表驱动守卫无从下手），改为 **handler 内逐条判 ACL**。
- 只回路径、**不读正文**。

界面侧只接了一处用户可见能力：知识库视图与 Markdown 预览里点双链，**同目录找不到时**
问 `/kg/resolve`，解到别的目录就跳过去定位；仍解不到才报"未找到"。

反链摘要（`/api/kg/backlinks`）现在按「**现名 + 退役别名**」匹配引用方正文，
所以改名之后摘要不会退化成空串。

---

## 6. 变更清单（file:line）

**新增**

- `privhub/plugins/privhub-svc-links/src/linkparse.ts`（新，权威定义）
- `privhub/plugins/privhub-svc-links/src/core.ts`（新，纯逻辑：登记表形状 / 选优 / 别名 / 活索引）
- `privhub/plugins/privhub-svc-links/src/index.ts`（新，`LinkService extends Service`，键 `links`）
- `privhub/tests/link-parsing.mjs`（新，进程内 77 断言的解析 + 登记表回归）
- `privhub/tests/link-id.mjs`（新，HTTP 端到端 13 断言，含验收条）

**改动**

- `privhub/src/main.ts:41,53,213` — import / `CORE_PLUGINS` 登记 / `await mount(svcLinks, { file: '' })`
- `privhub/plugins/privhub-files-kg/src/index.ts:36-37,40,126,229-236,364,369,372,387-389,416,509-525`
  — import 权威定义 + `inject` 加 `'links'` + `resolveLinks` 改用登记表 + 反链摘要按多名字匹配 + 新增 `/kg/resolve`
- `privhub/plugins/privhub-files-refcheck/src/core.ts:43,153,197,329` — import 权威定义 + `resolveAlias` 兜底
- `privhub/plugins/privhub-files-refcheck/src/index.ts:29,126,136` — `inject` 加 `'links'` + `await ctx.links.ready` + 传 `resolveAlias`
- `privhub/plugins/privhub-files-export/src/index.ts:25,53` — 改用 `WIKI_LINK_RE`
- `privhub/plugins/privhub-files-edit-md/client/index.js:85-94,777` — 正则改权威字面量（别名从整个匹配里切）+ 点击回退问 `/kg/resolve`
- `privhub/plugins/privhub-files-wiki/client/index.js:25-27,168-181` — 同上
- `privhub/tests/run-all.mjs` — 注册两个新套件（HTTP `buildLinkId()` + 静态 `link-parsing.mjs` 走 tsx）
- `privhub/tests/integrity.mjs`（末尾新增「Q4 双链 ID 化契约」段，6 条断言；未改任何既有断言）

---

## 7. 诚实边界（没做 / 已知限制）

- **不做"去扩展名"匹配**：`[[方案]]` 不会命中 `方案.md`。这是**刻意保持**与改造前一致，
  新增它属于另一件事（会凭空造出原本不存在的图边），方案 §2.6 也把它列为可后置项。
- **块锚点只做剥离**：`[[a.md#块]]` 解析到 `a.md`，但**不定位到那个块**（跨文档跳转锚点未做）。
- **同名多命中只按"同目录优先"**：没有为每一对 (来源, 名字) 记住"上次解析到谁"，
  那会随引用数线性膨胀；同目录优先是无状态、确定性的规则。
- **登记表有界**：上限 20000 条，按最久未触碰淘汰（淘汰只让老文件下次再登记一遍）。
  惰性补登记每轮上限 400，积压不影响正确性（解析同时参考活文件列表）。
- **界面点击只接在 edit-md / wiki 两处**：其它渲染位置的 `[[…]]` 仍是纯文本或原行为。
- **`id:` 写法无界面入口**：服务端认、界面不生成（避免给用户暴露一整套 ID 概念）。
- **验收只看服务端契约**：`/kg/resolve` 的落点、边与反链的解析结果都有断言；
  界面里"点一下真的跳过去了"没有浏览器自动化，只断言了它调用的接口契约。
- 本批**没在真实数据上跑过**：全部验证在隔离实例（3190）+ 临时测试项目上完成。

---

## 8. 回归

- 新增 `tests/link-parsing.mjs`（进程内，77 通过）与 `tests/link-id.mjs`（HTTP，13 通过）。
- `tests/integrity.mjs` 新增 6 条契约断言（总计 101 通过）。
- 全套 `node tests/run-all.mjs --spawn`：**HTTP 261 / 0，静态 1339 / 0**，全绿（隔离实例 3190）。
