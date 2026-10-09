/**
 * D4：系统 JSON 数据文件的统一读取入口 —— 「损坏不得静默当成空数据」。
 *
 * 背景（本仓修过同类事故）：十来个插件各自把落盘 JSON 读进内存，写法都是
 *
 *   if (!existsSync(FILE)) return {}
 *   try { return JSON.parse(await storage.readText(FILE)) } catch { return {} }
 *
 * 这行 `catch { return {} }` 有两个连在一起的坏结果：
 *   ① **看不见**：文件损坏（或解密失败、被截断）时，界面显示「空列表」，
 *      用户以为数据本来就没有 —— 于是不会有人去修；
 *   ② **被覆盖**：多数调用点是「读 → 改 → 写」。读到空的 `{}`，
 *      紧接着一次 `save()` 就把那份**可能还能人工恢复**的原文永久盖掉。
 *      （`data/agent-keys.json`、`data/invites.json` 这类凭据文件尤其致命：
 *       一次「新建」就把已有凭据全部清空。）
 *
 * 本模块把「文件不存在」与「文件坏了」分开：
 *   · 不存在 → 返回 fallback（这是合法的「还没有数据」）；
 *   · 空文件 → 返回 fallback（历史实现会写空串表示空数据，保持兼容）；
 *   · 读/解密失败、不是合法 JSON、顶层为 null → **逐字节隔离一份存证，然后抛错**。
 *
 * 抛错而不是返回 fallback，是因为调用方随后那一笔写入才是真正的破坏点：
 * 让本次操作**中止**，坏文件保持原样，交由人来判断是修复还是丢弃。
 * 这与本仓既有的决定一致（见 `privhub-core` 的 `loadUsers`：账号库损坏必须显著失败，
 * 而不是降级为空 —— 降级为空会「所有人都登不上且看不出原因」，继续写入还会覆盖可恢复的数据）。
 *
 * 抛出的错误是 {@link UserVisibleError}：`src/web-server.ts` 的兜底 catch 认得这个标记，
 * 会把中文原因原样回给客户端（HTTP 500 + `{ok:false,error}` 信封），
 * 而不是只回一句 `internal server error`。其余异常仍不泄露细节。
 *
 * 隔离文件命名 `<原名>.corrupt-<内容哈希8位>.bak`：**按内容命名**，所以
 * 同一份损坏内容只会隔离一次（重复读、多处读、重启后再读都指向同一份），
 * 不会每次报错都堆一个新文件。隔离与原文**都在原地不动**，清理由运维决定。
 *
 * @module privhub-core/json-store
 */

import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { basename } from 'node:path'

/** 消息可安全展示给用户的错误（兜底 catch 据此决定是否回显 message）。 */
export class UserVisibleError extends Error {
  readonly userVisible = true
  constructor(message: string) {
    super(message)
    this.name = 'UserVisibleError'
  }
}

/** 数据文件损坏：已隔离存证，本次操作中止（绝不以空数据继续）。 */
export class CorruptDataError extends UserVisibleError {
  constructor(readonly file: string, readonly quarantine: string | null, reason: string) {
    super(
      `系统数据文件已损坏，为避免覆盖已中止本次操作：${basename(file)}（${reason}）。`
      + (quarantine ? `原内容已隔离保存为 ${basename(quarantine)}。` : '')
      + '请人工修复，或确认可丢弃后删除该文件再重试；处理前请勿让它被覆盖。',
    )
    this.name = 'CorruptDataError'
  }
}

/** 只需要 readText 即可（各插件的 `StorageLike` 形状都能直接传进来）。 */
export interface JsonReadable {
  readText(file: string): Promise<string>
}

/** 把任意 catch 到的东西取成一句可读文本（各插件写日志时也用得上）。 */
export const msgOf = (e: unknown): string => (e instanceof Error ? e.message : String(e))

/**
 * 把损坏内容逐字节另存为 `<原名>.corrupt-<哈希8>.bak`。
 * 成功返回隔离路径；无法隔离（如目录不可写）返回 null —— 此时**仍然**抛错，
 * 因为「不覆盖」比「留证据」更要紧，且原文件本就保持原样。
 *
 * 去重**只靠内容哈希 + `wx`**，不另设「同一路径只隔离一次」的内存表：
 * 那种表以路径为键，一旦同一文件先后坏成不同内容（修了一半又坏），
 * 第二次的证据会被当成重复而丢掉 —— 恰好丢掉的是最新的现场。
 * 按内容命名则天然幂等：同一份内容永远指向同一个文件，且已存在就不再写。
 */
async function quarantine(file: string, payload: Buffer): Promise<string | null> {
  const hash = createHash('sha256').update(payload).digest('hex').slice(0, 8)
  const target = `${file}.corrupt-${hash}.bak`
  try {
    if (!existsSync(target)) await writeFile(target, payload, { flag: 'wx' })
  } catch {
    // wx 竞争失败（并发隔离同一文件）时，另一侧已经写好了同名文件，直接用
    if (!existsSync(target)) return null
  }
  return target
}

/**
 * 读取系统 JSON 数据文件。
 *
 * 损坏（读不出 / 解不开 / 不是合法 JSON / 顶层为 null）时：**隔离存证，然后抛错**
 * —— 绝不返回 fallback，因为调用方随后那一笔写入正是破坏点。
 *
 * 只用于「丢了就找不回来」的数据（凭据、批注、收藏、版本历史、回收站、邀请码……）。
 * 派生且可重建的数据（如 RAG 语料清单）用 {@link readJsonStoreLenient}。
 *
 * @param storage 具备 `readText` 的存储（通常是 `ctx.storage`）
 * @param file    绝对路径
 * @param fallback 文件不存在（或为空）时的返回值
 */
export async function readJsonStore<T>(
  storage: JsonReadable,
  file: string,
  fallback: T,
  /** 可选的形状校验：返回 false 视同损坏（一样隔离 + 抛错）。 */
  check?: (value: unknown) => boolean,
): Promise<T> {
  return loadStore(storage, file, fallback, true, check) as Promise<T>
}

/**
 * 宽容版：损坏时同样**隔离存证 + 写日志**，但返回 fallback 而不是抛错。
 *
 * 只给「**派生数据**」用 —— 丢了能从源头重建，因此不值得为它中断整个功能：
 * 典型是 RAG 语料清单 `manifest.json`（真身是盘上的语料文件，重建一次即可）。
 * 判断标准只有一条：**这份数据丢掉之后还能不能重建**。不能重建就别用这个函数。
 */
export async function readJsonStoreLenient<T>(storage: JsonReadable, file: string, fallback: T): Promise<T> {
  return loadStore(storage, file, fallback, false) as Promise<T>
}

/**
 * 「内存里缓存了一份、以后才写回」的服务用这个。
 *
 * 一次性读写的调用点（读 → 改 → 写都在同一个请求里）不需要它：严格读取一抛错，
 * 那次写入根本到不了。但像 `acl` / `meta` / `model` 这样「启动时读进内存、
 * 之后按需写回」的服务，读失败会被构造函数的 `catch` 吞掉，内存里留下一份空数据，
 * 之后任何一次写回都会把损坏但可能可恢复的文件盖掉。这类服务在写回前调用本函数。
 */
export function assertStoreWritable(healthy: boolean, file: string): void {
  if (healthy) return
  throw new UserVisibleError(
    `${basename(file)} 此前被检测为损坏（已隔离存证）。为避免把可能还能恢复的内容覆盖掉，`
    + '本次写入已拒绝。请人工修复，或确认可丢弃后删除该文件，再重启服务。',
  )
}

async function loadStore<T>(
  storage: JsonReadable, file: string, fallback: T, strict: boolean,
  check?: (value: unknown) => boolean,
): Promise<T> {
  /** 损坏时的统一出口：隔离 + 记日志 + （按模式）抛错或退回 fallback。 */
  const corrupt = async (payload: Buffer, reason: string): Promise<T> => {
    const q = await quarantine(file, payload)
    console.error(`[json-store] 数据文件损坏：${file}（${reason}${q ? '，已隔离 ' + q : ''}）`)
    if (strict) throw new CorruptDataError(file, q, reason)
    return fallback
  }

  if (!existsSync(file)) return fallback

  let text: string
  try {
    text = await storage.readText(file)
  } catch (e) {
    // 文件在 existsSync 之后消失：仍按「没有数据」处理
    if ((e as { code?: string }).code === 'ENOENT') return fallback
    // 读不出来（I/O 错误、或密文解不开）——此时拿不到可读文本，隔离磁盘上的原始字节
    const raw = await readFile(file).catch(() => null)
    const reason = '读取或解密失败：' + msgOf(e)
    if (raw === null) {
      console.error(`[json-store] 数据文件无法读取：${file}（${reason}，且无法隔离）`)
      if (strict) throw new CorruptDataError(file, null, reason)
      return fallback
    }
    return corrupt(raw, reason)
  }

  if (text.trim() === '') return fallback

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (e) {
    return corrupt(Buffer.from(text, 'utf8'), 'JSON 解析失败：' + msgOf(e))
  }
  /* 形状裁决：给了 check 就由它全权判断（含 `null` —— 例如 model.json 里
   * 「尚未配置」的合法状态就是文件内容为 null）；没给 check 时，顶层 null 一律视为损坏，
   * 因为本模块服务的都是对象/数组形状的存储。 */
  if (check) {
    if (!check(parsed)) return corrupt(Buffer.from(text, 'utf8'), '内容形状与预期不符')
  } else if (parsed === null) {
    return corrupt(Buffer.from(text, 'utf8'), '顶层内容为 null（不是有效的存储结构）')
  }

  return parsed as T
}
