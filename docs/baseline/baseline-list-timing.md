# 基线 · `/privhub/api/list` 目录列表耗时（1000 / 5000 个文件）

> 采集时间：2026-11-12T16:3x (+08:00)
> 脚本：`docs/baseline/list-timing.mjs`（放在 baseline/ 下，**未污染 `privhub/tests/`**）
> 原始样本：`docs/baseline/list-timing-samples.json`（150 条/档，逐次 ms 全在）
> 日志：`docs/baseline/_timing.log`

---

## 0. 结论先行

| 目录规模 | entries | **P50** | **P95** | min | max | mean |
|---|---:|---:|---:|---:|---:|---:|
| 1,000 文件 | 1000 | **54.67 ms** | **70.99 ms** | 44.90 | 89.63 | 56.78 |
| 5,000 文件 | 5000 | **287.30 ms** | **337.38 ms** | 245.24 | 386.81 | 291.92 |

**关键判读：**

1. **耗时与文件数近似线性，几乎没有固定开销。**
   边际成本 = (287.30 − 54.67) / (5000 − 1000) = **0.0582 ms/文件**（约 **17 个文件/ms**）。
   线性拟合截距 ≈ **−3.5 ms**（≈0），即固定成本可忽略，**全部成本都在"每文件一次 stat + 一次密文头读取"上**。
2. **5000 文件时 P50 已到 287 ms**，而 `listFiles` 只是**单层目录列举**（不分页、不递归）。
   一个项目做不到 5000 个文件就超过 300 ms，这正是「服务端主索引 + 扁平存储」要解决的问题。
3. **P95/P50 之比**在 1.17～1.29 之间，抖动不大；max 也只有 P50 的 1.3～1.6 倍。
   说明这不是 GC 尖刺主导，而是稳定的逐文件 I/O 成本。

---

## 1. 测量方法（可复现）

### 1.1 被测端点与代码路径

```
GET /privhub/api/list?project=公共&path=_timing_1000
  → plugins/privhub-files/src/index.ts:274  svc.route('/privhub/api/list', ...)
  → svc.listFiles(project, subPath)          plugins/privhub-core/src/index.ts:1075
```

`listFiles` 的真实实现（`core/src/index.ts:1075-1104`）：

```js
const ents = await readdir(dir, { withFileTypes: true })
const stats = await Promise.all(ents.map(async (e) => {
  if (e.name.startsWith('.') || e.isSymbolicLink()) return null
  const full = join(dir, e.name)
  const s = await stat(full)                        // ← 每文件一次 stat
  let size = s.isDirectory() ? 0 : s.size
  if (!s.isDirectory() && await this.ctx.storage.isEncrypted(full))   // ← 每文件一次 8 字节读
    size = Math.max(0, size - 36)
  return { name: e.name, isDir: s.isDirectory(), size, mtime: s.mtime.toISOString() }
}))
return out.sort(...localeCompare...)
```

**每个条目要付 2 次 I/O**：`stat()` + `isEncrypted()` 的 open/read/close。
这正是线性成本的来源，也是主索引方案最直接的收益点（索引读取不需要碰磁盘文件头）。

### 1.2 测试环境

- 隔离实例：`docs/baseline/.timingroot`（脚本自建、跑完自删，**已确认清理干净**）
- 端口：**3201**（避开 3190 的 run-all 与 3180/3181 的生产）
- 隔离方式：junction 链入 `privhub/src`、`plugins`、`frontend`、`node_modules`
  —— 与 `tests/run-all.mjs --spawn` 完全同一套做法。
- 登录：`admin` / `admin123`（`core/src/index.ts:744` 种下的默认账号）
- 客户端与服务器**同机回环**，测的是服务端处理时间 + 本机 HTTP 往返，无网络干扰。

### 1.3 文件形状（为什么这样造）

真实库里的用户文件 **99.88% 是 PHENC1 密文**（见 `baseline-scan.md`）。
所以样本文件不是空文件，而是**与真实密文同形状的 36 字节文件**：

```
[8B magic "PHENC1\0\x01"] + [12B IV] + [16B GCM tag] = 36 字节
```

理由：`listFiles` 的 `isEncrypted()` 会读前 8 字节做比对，
**若用空文件或不带 PHENC1 头的文件，走的是"明文"分支，I/O 形态与真实库不符**。
用同形状样本，测出来的才是改造后要对比的那个数。

> 局限（如实标注）：正文是 36 字节而非真实平均 34 KB。
> 但 `listFiles` **不读正文**，只读头 8 字节 + `stat` 取 size，
> 所以正文大小对本次测量无影响。真正受影响的是后续若有「读全文」的路径，本基线不覆盖。

### 1.4 采样方案

| 项 | 值 |
|---|---|
| 预热（丢弃） | 每个档位 10 次 |
| 每轮采样 | 50 次 |
| 轮数 | 3 轮（共 **150 次/档**） |
| 计时点 | `process.hrtime.bigint()` 包住整次 HTTP 请求（发出→响应体读完） |
| 并发 | **串行，单请求**（刻意不并发：基线要比的是「一次列表多久」，并发会引入排队混淆） |
| 校验 | 每次响应都断言 `json.ok === true`，且首次探测确认 `entries.length === 目标值` |

---

## 2. 原始数据

### 2.1 1,000 文件（entries=1000）

| 轮次 | n | P50 | P95 | min | max | mean |
|---|---:|---:|---:|---:|---:|---:|
| 第 1 轮 | 50 | 56.45 | 70.21 | 44.90 | 89.63 | 57.49 |
| 第 2 轮 | 50 | 55.02 | 75.74 | 47.88 | 81.80 | 57.41 |
| 第 3 轮 | 50 | 52.49 | 69.80 | 45.19 | 75.54 | 55.45 |
| **合计** | **150** | **54.67** | **70.99** | **44.90** | **89.63** | **56.78** |

### 2.2 5,000 文件（entries=5000）

| 轮次 | n | P50 | P95 | min | max | mean |
|---|---:|---:|---:|---:|---:|---:|
| 第 1 轮 | 50 | 287.30 | 335.72 | 245.24 | 375.11 | 288.99 |
| 第 2 轮 | 50 | 285.98 | 328.45 | 261.31 | 347.06 | 291.90 |
| 第 3 轮 | 50 | 290.01 | 361.94 | 249.07 | 386.81 | 294.86 |
| **合计** | **150** | **287.30** | **337.38** | **245.24** | **386.81** | **291.92** |

> 三轮之间 P50 差异 ≤ 4 ms（1000 档）/ ≤ 4 ms（5000 档），
> 说明**测量本身是稳定的**，不是一次性偶然结果。
> 逐次样本（150×2 条毫秒值）在 `list-timing-samples.json` 的
> `results["1000"].allSamples` / `results["5000"].allSamples` 里，可自行复算。

---

## 3. 派生指标

| 指标 | 1,000 | 5,000 |
|---|---:|---:|
| 吞吐（files / ms，按 P50） | 18.29 | 17.40 |
| 每文件成本（ms，按 P50） | 0.0547 | 0.0575 |
| P95 / P50 | 1.30 | 1.17 |
| max / P50 | 1.64 | 1.35 |

**线性拟合**（两点式）：`t(n) ≈ 0.0582·n − 3.5`（ms）

- 若线性外推到 20,000 文件：**≈ 1160 ms**（1.16 s）。
- 若线性外推到 100,000 文件：**≈ 5820 ms**（5.8 s）。
  ⇒ 千级还行、万级到达「用户能感知的卡」、十万级不可接受。
  **这正是本次改造的量化动机，建议作为方案验收的对照阈值。**

---

## 4. 局限与未覆盖项（如实声明）

1. **只测单层目录列举**，未测递归/子目录树遍历。若改造后要「一次列出整棵项目树」，本基线不够用。
2. **未测并发**。多用户同时列目录时的排队与 CPU 争用不在本基线内。
3. **未测冷缓存**（首次访问 vs 第 N 次）。本脚本每档先预热 10 次，测的是**已预热**状态；
   改造后若引入索引缓存，应另设一个「首次填充」基线。
4. **未测 `/api/search`、`/api/tree` 等其它读路径**，仅覆盖 `list`。
5. **样本文件正文 36 字节**（见 §1.3），不含大文件对目录列举的干扰（实测 list 不读正文，影响应为 0）。
6. 本机是 i5-12490F + 31.8 GB + G 盘（机械或 SSD 未单独确认）。
   **绝对值和别的机器不可直接比较，只适合同机改造前后对比。**

---

## 5. 复现命令

```powershell
cd G:\program\dsh-SQL\privhub-1\privhub
node ../docs/baseline/list-timing.mjs 2>&1 | Tee-Object ..\docs\baseline\_timing.log
# 预期 stdout 摘要：
#   [timing] 1000 files (entries=1000) → p50≈55ms p95≈71ms
#   [timing] 5000 files (entries=5000) → p50≈287ms p95≈337ms
# 明细写入 docs/baseline/list-timing-samples.json
```

脚本行为保证：
- 只写 `docs/baseline/` 下两个文件（`.timingroot/` 与 `list-timing-samples.json`）；
- 跑完 `rmSync(ROOT)` 删除自己的隔离根（**已实测清理干净**）；
- 端口固定 3201，不碰 3180/3181/3190。
