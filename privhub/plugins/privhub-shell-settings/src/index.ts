/**
 * 私域枢纽 shell 设置插件（privhub-shell-settings，F04）
 *
 * 系统设置面板（D25）：主题 / 默认视图 / 上传限制。
 * 设置存 data/settings.json（读写走 /privhub/api/settings，
 * 写操作仅管理员）。
 *
 * @module privhub-shell-settings
 */

import { join, isAbsolute } from 'node:path'
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { json, readBody, readJsonStore } from '../../privhub-core/src/index'

export const name = 'privhub-shell-settings'
export const inject = ['privhub', 'storage', 'cap']

const dataRootDir = process.env.PRIVHUB_DATA_ROOT?.trim() || process.env.PRIVHUB_ROOT?.trim() || process.cwd()

export interface Settings {
  theme: 'light' | 'dark'
  defaultView: 'grid' | 'list'
  maxUploadMB: number
  /**
   * S11：是否允许自助注册。
   * 默认 true —— 自助注册是原有能力，缺省值必须等于「原来的行为」，
   * 否则升级后功能会静默消失（a8148d8 曾把默认写成 false，导致注册被废）。
   * 需要收紧时由管理员显式置为 false 关闭，再走管理员建号/邀请码流程。
   */
  allowSelfRegister: boolean

  /* ---------- v6 存储布局（管理员可配；路径类改完需重启） ---------- */

  /**
   * 是否对**用户文件库**跳过落盘加密（加密开关）。
   *
   * **默认 false 是刻意的**：它等于「保持原有的安全模型」。若默认 true，
   * 升级后所有用户的存量新写入会突然变成明文落盘 —— 管理员的盘上加密就
   * 静默没了，这是比"慢"严重得多的问题。要关必须由管理员显式操作。
   *
   * 生效范围只到 `PRIVHUB_DATA_FILES` 之下：系统 JSON（users/sessions/ACL）
   * 与审计块（PHAUD1）**始终加密**，不受此项影响。
   *
   * **需重启生效**（svc-storage 在构造期固化）。
   */
  plainStorage: boolean
  /**
   * 实际存储地址（文件库根，真身）。空串 = 用 `PRIVHUB_DATA_FILES` / 默认值。
   * **需重启生效**（store-paths.mjs 在进程启动第一条就被求值）。
   */
  dataFilesDir: string
  /**
   * nginx 软连接 / 直读地址。空串 = 与 `dataFilesDir` 相同。
   * **需重启生效**（渲染 nginx 配置时用到）。
   */
  publicLinkDir: string
  /**
   * 临时存储文件夹（上传分片先落这里，建议独立 SSD）。空串 = 用实际存储地址。
   * **需重启生效**。
   */
  tempUploadDir: string
}

const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  defaultView: 'grid',
  /* 0 = 不限（主人方向：单个文件不设上限）。上限的唯一事实来源是这里 ——
   * privhub-core 的 uploadLimitBytes() 每次上传读取本文件，上传路由不再写死 2GB。 */
  maxUploadMB: 0,
  allowSelfRegister: true,
  /* 全部保持「原有行为」：加密照旧、地址走环境变量/默认、临时目录跟库根。 */
  plainStorage: false,
  dataFilesDir: '',
  publicLinkDir: '',
  tempUploadDir: '',
}

/**
 * D10：走 ctx.storage 读写（透明加解密 + 原子写）。
 * 此前用裸 readFile/writeFile，导致 settings.json 是明文落盘且非原子写。
 *
 * D4：损坏 → 隔离存证 + 抛错。此前降级成「默认设置」，随后一次 POST（改主题/开关）
 * 就会用默认值把文件整体覆盖 —— 用户设过的上传上限、注册开关一并消失。
 */
const SETTINGS_FILE = join(dataRootDir, 'data', 'settings.json')

/**
 * `config/store.json` —— **启动期**的根解析输入（见 `src/store-paths.mjs`）。
 *
 * 为什么路径类设置必须落到这里，而不是只存 `data/settings.json`：
 *   `store-paths.mjs` 在进程启动的第一行就被求值，那时 `ctx.storage` 还不存在，
 *   而 `data/settings.json` 是**加密**的（走 storage.writeText）。所以设置面板里
 *   改的库根，如果只写进 settings.json，重启时根本没人能读到它 ——
 *   界面提示「需重启生效」，重启后却毫无变化。这是最坏的一种缺陷：
 *   用户以为配好了，程序照旧用老路径。
 *
 * 因此路径类字段**双写**：settings.json 供界面回显，store.json 供启动期解析。
 * 两者不同步时以 store.json 为准（它才是真实生效的那份）。
 */
const STORE_CONFIG_FILE = join(
  (process.env.PRIVHUB_CONFIG_DIR || '').trim() || join(process.env.PRIVHUB_ROOT || process.cwd(), 'config'),
  'store.json',
)

/** 读 store.json（不存在/损坏都返回空对象 —— 写回时不能因为旧文件坏了就整个失败）。 */
function readStoreConfig(): Record<string, unknown> {
  if (!existsSync(STORE_CONFIG_FILE)) return {}
  try {
    const text = readFileSync(STORE_CONFIG_FILE, 'utf8').replace(/^\uFEFF/, '')
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    /* 启动期 store-paths 会因为这个文件坏了而**拒绝启动**并报清楚原因。
     * 这里只负责写入，不该假装能修它 —— 返回空对象会让这次写入覆盖掉坏文件，
     * 反而把「配置坏了」这个事实抹掉。所以保留原文件、只补字段不可行时直接抛。 */
    throw new Error('存储配置 ' + STORE_CONFIG_FILE + ' 已损坏，无法写入；请先修复或删除该文件')
  }
}

/**
 * 原子写 store.json（先写临时文件再 rename）。
 * 断电/崩溃时不会留下半截 JSON —— 而半截 JSON 会让下次启动直接拒绝启动。
 */
function writeStoreConfig(next: Record<string, unknown>): void {
  mkdirSync(dirname(STORE_CONFIG_FILE), { recursive: true })
  const tmp = STORE_CONFIG_FILE + '.tmp'
  writeFileSync(tmp, JSON.stringify(next, null, 2) + '\n', 'utf8')
  renameSync(tmp, STORE_CONFIG_FILE)
}

/**
 * 把设置里的路径类字段同步到 store.json。
 * 空串 = 恢复默认 → 从 store.json 里**删除该键**（而不是写空串，
 * 否则 `pick()` 会因为 `fromFile.trim()` 为空而落到默认值，行为一样但文件更脏）。
 */
function syncPathsToStoreConfig(s: Settings): void {
  const conf = readStoreConfig()
  const setOrDelete = (key: string, value: string): void => {
    const v = value.trim()
    if (v === '') delete conf[key]
    else conf[key] = v
  }
  setOrDelete('dataFiles', s.dataFilesDir)
  setOrDelete('publicLinkDir', s.publicLinkDir)
  setOrDelete('tempUploadDir', s.tempUploadDir)
  writeStoreConfig(conf)
}

async function loadSettings(storage: StorageLike): Promise<Settings> {
  const parsed = await readJsonStore<Partial<Settings>>(storage, SETTINGS_FILE, {})
  return { ...DEFAULT_SETTINGS, ...parsed }
}

async function saveSettings(storage: StorageLike, s: Settings): Promise<void> {
  await storage.writeText(SETTINGS_FILE, JSON.stringify(s, null, 2))
}

/** ctx.storage 的最小接口（避免直接依赖 svc-storage 的具体类型）。 */
interface StorageLike {
  readText: (f: string) => Promise<string>
  writeText: (f: string, d: string) => Promise<void>
}

export function apply(ctx: Context): void {
  const svc = ctx.privhub

  /* 读设置（登录即可读） / 写设置（仅管理员），同一路径按 method 区分 */
  svc.route('/privhub/api/settings', async (req, res) => {
    const u = svc.requireUser(req, res)
    if (!u) return
    if (req.method === 'GET') {
      json(res, 200, { ok: true, settings: await loadSettings(ctx.storage), restartRequired: [] })
      return
    }
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    if (!ctx.cap.can(u, 'admin.settings', 'write')) return json(res, 403, { ok: false, error: '仅管理员可修改设置' })
    let body: any
    try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { ok: false, error: 'invalid json' }) }
    /* D6：设置是「读全量 → 合并 → 写全量」。不串行的话，两个管理员（或同一人两个标签页）
     * 同时改不同项时，后写的会把先写的整项改回旧值 —— 典型表现是「我开的开关自己关了」。 */
    /* 本次改动里「需要重启才生效」的项。路径类与加密开关都在进程启动期固化
     * （store-paths.mjs 是 main.ts 的第一个 import；svc-storage 在构造期定 enabled），
     * 所以必须**如实告诉管理员**，不能让人以为保存完就已经生效。 */
    const restartItems: string[] = []
    const next = await svc.withFileLock(SETTINGS_FILE, async () => {
      const cur = await loadSettings(ctx.storage)
      const merged: Settings = { ...cur }
      if (body.theme === 'light' || body.theme === 'dark') merged.theme = body.theme
      if (body.defaultView === 'grid' || body.defaultView === 'list') merged.defaultView = body.defaultView
      if (typeof body.maxUploadMB === 'number' && body.maxUploadMB >= 0 && body.maxUploadMB <= 8192) merged.maxUploadMB = Math.floor(body.maxUploadMB)
      if (typeof body.allowSelfRegister === 'boolean') merged.allowSelfRegister = body.allowSelfRegister

      /* 加密开关：改了就必须标记重启。0 与 1 之间切换影响所有后续写入的落盘格式。 */
      if (typeof body.plainStorage === 'boolean' && body.plainStorage !== merged.plainStorage) {
        merged.plainStorage = body.plainStorage
        restartItems.push('plainStorage')
      }

      /* 路径类三项：非空时必须是绝对路径且不含 NUL；空串 = 用默认值（允许）。
       * 为什么校验绝对路径：相对路径会按服务进程的 cwd 解析，而 cwd 取决于
       * 启动方式（start.bat / 蓝绿槽 / 手工 node），结果不可预期 ——
       * 那种「配了但指到别处」比拒绝保存更难排查。 */
      const checkPath = (name: 'dataFilesDir' | 'publicLinkDir' | 'tempUploadDir'): void => {
        const raw = body[name]
        if (typeof raw !== 'string') return
        const v = raw.trim()
        if (v === '') {                      // 空串 = 恢复默认，允许
          if (merged[name] !== '') { merged[name] = ''; restartItems.push(name) }
          return
        }
        if (v.includes('\u0000')) throw new Error(name + ' 含非法字符（NUL）')
        if (!isAbsolute(v)) throw new Error(name + ' 必须是绝对路径（例如 D:\\privhub\\data-files），收到：' + v)
        if (v.length > 260) throw new Error(name + ' 过长（超过 260 字符）')
        if (merged[name] !== v) { merged[name] = v; restartItems.push(name) }
      }
      try {
        checkPath('dataFilesDir')
        checkPath('publicLinkDir')
        checkPath('tempUploadDir')
      } catch (e) {
        throw e // 让外层统一转 400
      }

      await saveSettings(ctx.storage, merged)
      /* 路径类字段必须同时落到 store.json —— 那才是启动期真正被读的那份。
       * 放在 saveSettings 之后：settings.json 是界面回显，store.json 是生效值，
       * 顺序反了会出现「生效了但界面没记住」。 */
      if (restartItems.some((k) => k === 'dataFilesDir' || k === 'publicLinkDir' || k === 'tempUploadDir')) {
        syncPathsToStoreConfig(merged)
      }
      return merged
    }).catch((e: unknown) => {
      /* 路径校验失败：给出可执行的提示，而不是笼统的 500。 */
      const msg = e instanceof Error ? e.message : String(e)
      if (/必须是绝对路径|含非法字符|过长|已损坏/.test(msg)) return msg
      throw e
    })
    if (typeof next === 'string') return json(res, 400, { ok: false, error: next })
    json(res, 200, { ok: true, settings: next, restartRequired: restartItems })
  }, 'settings')
}
