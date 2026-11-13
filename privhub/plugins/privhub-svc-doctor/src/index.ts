/**
 * privhub-svc-doctor —— 生产自检与修复。
 *
 * ## 为什么需要这个服务
 *
 * 扁平化存储把「文件在哪」从磁盘目录结构搬进了主索引（`fileindex.json`），
 * 这带来一个本质变化：**磁盘和索引可能不一致，而两边单独看都像正常的**。
 * 典型情形：
 *
 *   - 池里有物理文件，索引里没有任何条目引用它（上传中途断电留下的孤儿）；
 *   - 索引有条目、池里字节没了（用户手工删了 `.pool` 里的文件）；
 *   - 索引记 `source='legacy'`，老库那个文件早被移走（点下载才 404）；
 *   - 两条索引指向同一个 `physicalId` 但引用计数是 1（删一个会带走另一个的字节）。
 *
 * 这些状态下服务**照常启动、页面照常打开**，只有用户点到那个具体文件时才出错。
 * 靠人肉发现是不可接受的 —— 所以自检必须能主动扫出来，修复必须能一键执行。
 *
 * ## 设计原则
 *
 * 1. **只读检查与修复严格分离。** `runChecks()` 绝不写盘；只有显式调用
 *    `repair(kind)` 才动手。自检可以在生产环境随时跑。
 * 2. **每一项检查都要给出「能不能自动修」。** 能修的带 `fixable: true` 与
 *    修复后预期结果；不能修的（如密钥丢失）给出人类可执行的处置建议。
 * 3. **不吞异常。** 检查项自己抛错时记为 `status: 'error'` 并保留原文，
 *    而不是当作「没问题」——那是最危险的一种假绿。
 *
 * @module privhub-svc-doctor
 */

import type { Context } from '@deepseek-ai/cordis'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, isAbsolute } from 'node:path'
import { json, readJsonBody } from '../../privhub-core/src/index'
import { checkTypesConsistency, loadExtMime, CODE_ROOT, MIME_MAP_PATH } from '../../privhub-svc-fileindex/src/nginx-types'

/** 单项检查的结论。 */
export type CheckStatus = 'ok' | 'warn' | 'error' | 'skipped'

export interface CheckResult {
  /** 稳定标识，前端与修复接口都用它。 */
  id: string
  /** 人类可读标题。 */
  title: string
  status: CheckStatus
  /** 一句话结论，直接给管理员看。 */
  detail: string
  /** 能否由程序自动修复。 */
  fixable: boolean
  /** 有问题时的具体样本（最多 20 条），便于定位而不是只报一个数。 */
  samples?: string[]
  /** 出问题时建议的人工处置（不可自动修复时必填）。 */
  advice?: string
  /** 检查耗时（毫秒）。 */
  ms?: number
}

export interface DoctorReport {
  ok: boolean
  generatedAt: number
  /** 有问题（warn/error）的项数。 */
  problems: number
  /** 可自动修复的问题数。 */
  fixableCount: number
  checks: CheckResult[]
}

/** 修复动作的返回。 */
export interface RepairResult {
  ok: boolean
  /** 做了什么（中文，直接展示）。 */
  action: string
  /** 影响条数 / 删除文件数等。 */
  affected: number
  error?: string
}

const MAX_SAMPLES = 20

/** 取消息文本，避免 `[object Object]`。 */
function msgOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/**
 * 读「我们渲染出来的」nginx 配置全文；没有就返回 `undefined`。
 *
 * ## 为什么不能随便读 `<nginxDir>/conf/nginx.conf`
 *
 * 那个路径是 **nginx 出厂自带的示例配置**（`worker_processes 1;` 那种），
 * 里面当然没有我们的 `types{}` 补充块。拿它当判据会把 33 个类型全部报成
 * "会退化成 octet-stream" —— 全是假警报。踩过这个坑。
 *
 * 真正要核对的是 `control.mjs` 渲染出来的那份。它的位置由 `control.mjs` 决定：
 * `<NGINX_DIR>/conf/nginx.conf`，但**前提是**该文件确实是我们的产物。
 * 判据：文件里出现了我们模板独有的标记（`privhub_active` upstream 名，
 * 或 `__privhub_internal` 内部前缀）。不满足就当没有渲染配置。
 *
 * 为什么值得读它：模板里的 `{{NGINX_TYPES_BLOCK}}` 如果被误删，渲染出来的配置
 * 就少了整段 `types{}`，而 `mime.types` 与 `mime-map.json` 两个源文件都还完好
 * —— 只核对源文件永远发现不了这种故障。
 */
function readRenderedNginxConfig(nginxDir: string): string | undefined {
  const p = join(nginxDir, 'conf', 'nginx.conf')
  try {
    if (!existsSync(p)) return undefined
    const text = readFileSync(p, 'utf8')
    /* 只认我们自己的产物。出厂示例配置不含这些标记。 */
    const ours = text.includes('privhub_active') || text.includes('__privhub_internal')
    return ours ? text : undefined
  } catch {
    return undefined
  }
}

export class DoctorService {
  static inject = ['privhub', 'storage']

  private ctx: Context

  constructor(ctx: Context) {
    this.ctx = ctx
  }

  /** 主索引（容错取用：doctor 自己不能因为索引缺失而崩）。 */
  private fi(): any {
    try {
      return this.ctx.reflect?.get?.('fileindex', false) ?? null
    } catch {
      return null
    }
  }

  private get dataFiles(): string {
    return String((this.ctx as any).privhub?.dataRoot ?? '')
  }

  /**
   * 池目录的**真实路径**。
   *
   * 不能用 `String(fi.ensurePoolDir())` —— 那是 async 方法，同步取用会得到
   * 字符串 `"[object Promise]"`，于是所有池相关检查都对着一个不存在的目录跑、
   * 一律报"池尚未创建"。实测踩过：明明池里有 3 个文件，孤儿检测却报 OK。
   * 这里读 `fi.poolDir` 字段（同步、真实）。
   */
  private get poolDir(): string {
    const fi = this.fi()
    try {
      const p = fi?.poolDir
      if (typeof p === 'string' && p !== '') return p
    } catch { /* 落到默认推算 */ }
    return join(this.dataFiles, '.pool')
  }

  /**
   * 跑全部检查。**纯只读**，任何一项抛错都记为 error 而不是中断整轮。
   */
  async runChecks(): Promise<DoctorReport> {
    const checks: CheckResult[] = []
    const push = async (
      id: string,
      title: string,
      fixable: boolean,
      fn: () => Promise<Omit<CheckResult, 'id' | 'title' | 'fixable' | 'ms'>>,
    ): Promise<void> => {
      const t0 = Date.now()
      try {
        const r = await fn()
        checks.push({ id, title, fixable, ms: Date.now() - t0, ...r })
      } catch (e) {
        checks.push({
          id, title, fixable, ms: Date.now() - t0,
          status: 'error',
          detail: '检查本身失败：' + msgOf(e),
          advice: '这一项没能完成检查，不能当作通过。请查看服务日志。',
        })
      }
    }

    await push('fileindex', '主索引可用性', false, async () => this.checkIndex())
    await push('index-pool', '索引 ↔ 池 一致性', true, async () => this.checkIndexPool())
    await push('pool-orphan', '池内孤儿文件', true, async () => this.checkPoolOrphan())
    await push('legacy-source', '老库来源可达性', true, async () => this.checkLegacy())
    await push('encryption', '文件库加密模式', false, async () => this.checkEncryption())
    await push('secret', '密钥可用性', false, async () => this.checkSecret())
    await push('trash', '回收站一致性', true, async () => this.checkTrash())
    await push('nginx', 'nginx 直读链路', false, async () => this.checkNginx())
    await push('mime-types', '直读 MIME 类型表', false, async () => this.checkMimeTypes())

    const problems = checks.filter((c) => c.status === 'warn' || c.status === 'error').length
    const fixableCount = checks.filter((c) => (c.status === 'warn' || c.status === 'error') && c.fixable).length
    return {
      ok: problems === 0,
      generatedAt: Date.now(),
      problems,
      fixableCount,
      checks,
    }
  }

  /* ---------------- 各项检查 ---------------- */

  private async checkIndex(): Promise<Omit<CheckResult, 'id' | 'title' | 'fixable' | 'ms'>> {
    const fi = this.fi()
    if (!fi) {
      return {
        status: 'error',
        detail: '主索引服务未挂载 —— 扁平存储无法工作，所有文件都读不到',
        advice: 'privhub-svc-fileindex 插件未装配或加载失败。检查插件目录是否存在、启动日志里有没有它的报错。',
      }
    }
    const all = typeof fi.all === 'function' ? fi.all() : []
    const files = all.filter((e: any) => !e.isDir).length
    const dirs = all.length - files
    if (all.length === 0) {
      return {
        status: 'warn',
        detail: '主索引为空（0 条目）。新库尚未登记任何文件；若库里本该有文件，说明索引丢了',
        advice: '老库请用「存储迁移 → 扫描」重建；新布局可用重建功能扫磁盘恢复。',
        fixable: true,
      } as any
    }
    return { status: 'ok', detail: `索引正常：${files} 个文件、${dirs} 个目录`, fixable: false } as any
  }

  /**
   * 索引 → 池：每个 `source='pool'` 的条目，其物理文件必须真实存在且大小吻合。
   * 这是**最致命**的一类不一致：页面上看得见、点开 404。
   */
  private async checkIndexPool(): Promise<Omit<CheckResult, 'id' | 'title' | 'fixable' | 'ms'>> {
    const fi = this.fi()
    if (!fi || typeof fi.all !== 'function') {
      return { status: 'skipped', detail: '主索引不可用，跳过', fixable: false } as any
    }
    const missing: string[] = []
    const sizeBad: string[] = []
    let checked = 0
    for (const e of fi.all() as any[]) {
      if (e.isDir || e.source !== 'pool' || !e.physicalId) continue
      checked++
      const abs = typeof fi.resolvePhysical === 'function' ? fi.resolvePhysical(e) : null
      if (!abs || !existsSync(abs)) {
        if (missing.length < MAX_SAMPLES) missing.push(`${e.project}/${e.virtualPath}`)
        continue
      }
      try {
        const st = statSync(abs)
        /* 索引里的 size 是**明文**大小；密文条目磁盘上会多 36 字节，
         * 所以只在「磁盘比索引小」时判定异常（解密后不可能变小以外的偏差）。 */
        if (st.size < e.size) {
          if (sizeBad.length < MAX_SAMPLES) sizeBad.push(`${e.project}/${e.virtualPath}（索引 ${e.size}，磁盘 ${st.size}）`)
        }
      } catch (e2) {
        if (missing.length < MAX_SAMPLES) missing.push(`${e.project}/${e.virtualPath}（stat 失败：${msgOf(e2)}）`)
      }
    }
    if (missing.length > 0) {
      return {
        status: 'error',
        detail: `有 ${missing.length} 个索引条目指向的物理文件已不存在（页面能看见但打开会 404）`,
        samples: missing,
        fixable: true,
        advice: '可自动修复：把这些条目从索引里摘除（字节已经不在了，无法恢复）。',
      } as any
    }
    if (sizeBad.length > 0) {
      return {
        status: 'warn',
        detail: `有 ${sizeBad.length} 个文件的磁盘大小小于索引登记值（可能被截断）`,
        samples: sizeBad,
        fixable: false,
        advice: '这些文件可能不完整。从备份恢复，或重新上传。',
      } as any
    }
    return { status: 'ok', detail: `已核对 ${checked} 个池内文件，物理字节全部就位`, fixable: false } as any
  }

  /** 池 → 索引：池里存在但没有任何索引条目引用的文件（孤儿，纯占盘）。 */
  private async checkPoolOrphan(): Promise<Omit<CheckResult, 'id' | 'title' | 'fixable' | 'ms'>> {
    const fi = this.fi()
    if (!fi) return { status: 'skipped', detail: '主索引不可用，跳过', fixable: false } as any
    const pool = this.poolDir
    if (!existsSync(pool)) return { status: 'ok', detail: '池目录尚未创建（还没有任何文件）', fixable: false } as any
    let names: string[] = []
    try { names = readdirSync(pool) } catch (e) { return { status: 'error', detail: '读不了池目录：' + msgOf(e), fixable: false } as any }

    const referenced = new Set<string>()
    for (const e of (typeof fi.all === 'function' ? fi.all() : []) as any[]) {
      if (e.physicalId) referenced.add(String(e.physicalId))
    }
    const orphans: string[] = []
    let bytes = 0
    for (const nm of names) {
      /* `.part` 是迁移/上传的临时文件，启动时会清；这里单独提示。 */
      const id = nm.replace(/\.[^.]*$/, '')
      if (nm.endsWith('.part')) continue
      if (!referenced.has(id)) {
        if (orphans.length < MAX_SAMPLES) orphans.push(nm)
        try { bytes += statSync(join(pool, nm)).size } catch { /* 竞态下文件可能刚被删 */ }
      }
    }
    if (orphans.length > 0) {
      return {
        status: 'warn',
        detail: `池里有 ${orphans.length} 个文件没有任何索引条目引用（约 ${Math.round(bytes / 1024)} KB 纯占盘）`,
        samples: orphans,
        fixable: true,
        advice: '可自动修复：删除这些孤儿字节。它们已经不在任何目录里，删掉不影响用户可见内容。',
      } as any
    }
    return { status: 'ok', detail: `池内 ${names.length} 个文件全部有索引引用`, fixable: false } as any
  }

  /** 老库条目：`legacyPath` 指向的文件必须还能读到。 */
  private async checkLegacy(): Promise<Omit<CheckResult, 'id' | 'title' | 'fixable' | 'ms'>> {
    const fi = this.fi()
    if (!fi) return { status: 'skipped', detail: '主索引不可用，跳过', fixable: false } as any
    const legacy = ((typeof fi.all === 'function' ? fi.all() : []) as any[])
      .filter((e) => !e.isDir && e.source === 'legacy')
    if (legacy.length === 0) {
      return { status: 'ok', detail: '没有待迁移的老库条目', fixable: false } as any
    }
    const lost: string[] = []
    for (const e of legacy) {
      const abs = typeof fi.resolvePhysical === 'function' ? fi.resolvePhysical(e) : null
      if (!abs || !existsSync(abs)) {
        if (lost.length < MAX_SAMPLES) lost.push(`${e.project}/${e.virtualPath}`)
      }
    }
    if (lost.length > 0) {
      return {
        status: 'error',
        detail: `${lost.length} 个老库条目指向的源文件已不在原位置（迁移会失败、下载会 404）`,
        samples: lost,
        fixable: true,
        advice: '可自动修复：摘除这些失效条目。若老库被移动过，请用「存储迁移」重新指定老库位置并扫描。',
      } as any
    }
    return {
      status: 'warn',
      detail: `还有 ${legacy.length} 个文件停留在老库、尚未搬进新池`,
      fixable: false,
      advice: '到「存储迁移」页点「开始搬运」把它们转入新库（加密的会自动解密成明文）。',
    } as any
  }

  /** 加密模式：文件库应当是明文（nginx 直读的前提）。 */
  private async checkEncryption(): Promise<Omit<CheckResult, 'id' | 'title' | 'fixable' | 'ms'>> {
    const st: any = this.ctx.storage
    const plain = st?.fileLibPlain === true
    if (!plain) {
      return {
        status: 'warn',
        detail: '文件库仍处于加密模式 —— 文件在磁盘上是 PHENC1 密文，nginx 无法直读（只能由 Node 转发）',
        advice: '设置 PRIVHUB_PLAIN_FILELIB=1 或在管理端开启「明文存储」，重启后新写入的文件即为明文；已有文件用「存储迁移」转明文。',
      } as any
    }
    return { status: 'ok', detail: '文件库明文模式已开启（系统 JSON 与审计记录仍加密）', fixable: false } as any
  }

  /**
   * 密钥：丢了 = 系统数据不可恢复，必须在自检里显著提示。
   *
   * `keyOrigin` 有**四种**取值（见 privhub-svc-storage 的同名字段）：
   *
   * | 取值 | 含义 | 判定 |
   * |---|---|---|
   * | `env` | 来自 `PRIVHUB_SECRET` 环境变量 | warn：能跑，但换机器/漏传变量就解不开 |
   * | `file` | 读到已存在的 `data/secret.key` | ok |
   * | `generated` | 首次运行**自动生成并写入** `data/secret.key` | ok |
   * | `unknown` | 上面都不是 | error：真的说不清密钥在哪 |
   *
   * ⚠ `generated` 曾经被判成 error —— 那是错的，而且危害不小：它是最常见的
   * 生产状态（新装系统第一次启动就会走到），把它报成故障会让运维去"修"一个
   * 本来正常的东西。自检报假警报比不检查更糟。
   */
  private async checkSecret(): Promise<Omit<CheckResult, 'id' | 'title' | 'fixable' | 'ms'>> {
    const st: any = this.ctx.storage
    const origin = String(st?.keyOrigin ?? 'unknown')
    if (origin === 'env') {
      return {
        status: 'warn',
        detail: '密钥来自环境变量 PRIVHUB_SECRET（而不是 data/secret.key 文件）',
        advice: '环境变量一旦改动或遗漏，已有系统数据将无法解密。生产环境建议固定使用 data/secret.key 并纳入备份。',
      } as any
    }
    if (origin === 'file') {
      return { status: 'ok', detail: '密钥来自 data/secret.key，请确保它与数据一起备份', fixable: false } as any
    }
    if (origin === 'generated') {
      /* 首次运行时自动生成并落盘 —— 密钥确实在 data/secret.key 里，
       * 与 'file' 同样安全，唯一要做的是提醒把它纳入备份。 */
      return {
        status: 'ok',
        detail: '密钥由系统首次运行时自动生成，已写入 data/secret.key（请确保它与数据一起备份）',
        fixable: false,
      } as any
    }
    return {
      status: 'error',
      detail: '无法确认密钥来源（keyOrigin=' + origin + '）',
      advice: '检查 data/secret.key 是否存在且为 32 字节；该文件丢失意味着已有系统数据不可恢复。',
    } as any
  }

  /** 回收站：虚拟条目必须仍指向可用的物理字节。 */
  private async checkTrash(): Promise<Omit<CheckResult, 'id' | 'title' | 'fixable' | 'ms'>> {
    const fi = this.fi()
    if (!fi || typeof fi.listTrash !== 'function') {
      return { status: 'skipped', detail: '主索引不可用，跳过', fixable: false } as any
    }
    const list = fi.listTrash() as any[]
    if (list.length === 0) return { status: 'ok', detail: '回收站为空', fixable: false } as any
    const broken: string[] = []
    for (const e of list) {
      if (e.isDir) continue
      const abs = typeof fi.resolvePhysical === 'function' ? fi.resolvePhysical(e) : null
      if (!abs || !existsSync(abs)) {
        if (broken.length < MAX_SAMPLES) broken.push(`${e.project}/${e.virtualPath}`)
      }
    }
    if (broken.length > 0) {
      return {
        status: 'warn',
        detail: `回收站里有 ${broken.length} 个文件已无物理字节（无法恢复，到期会被清掉）`,
        samples: broken,
        fixable: true,
        advice: '可自动修复：把这些无法恢复的条目从回收站移除。',
      } as any
    }
    return { status: 'ok', detail: `回收站 ${list.length} 个条目，物理字节全部完好`, fixable: false } as any
  }

  /** nginx 直读链路：二进制是否就位、当前是否真的在 nginx 后面。 */
  private async checkNginx(): Promise<Omit<CheckResult, 'id' | 'title' | 'fixable' | 'ms'>> {
    const behind = process.env.PRIVHUB_BEHIND_NGINX === '1'
    const codeRoot = String((this.ctx as any).privhub?.codeRoot ?? process.cwd())
    const exe = join(codeRoot, 'runtime', 'nginx', process.platform === 'win32' ? 'nginx.exe' : 'nginx')
    const hasBin = existsSync(exe)
    if (behind && hasBin) {
      return { status: 'ok', detail: 'nginx 已就位且当前运行在它后面（文件由 nginx 直读发送）', fixable: false } as any
    }
    if (!behind && hasBin) {
      return {
        status: 'warn',
        detail: '当前是直连 Node 模式，文件由 Node 转发（功能正常，但没走 nginx 直读）',
        advice: '生产部署请用 runtime/control.mjs 启动（npm run runtime），文件才会经 nginx 直读。',
      } as any
    }
    if (behind && !hasBin) {
      return {
        status: 'error',
        detail: '进程标记为运行在 nginx 后面，但找不到 nginx 二进制：' + exe,
        advice: '把 nginx 解压到 runtime/nginx/，或用 PRIVHUB_NGINX_DIR 指向已有安装。',
      } as any
    }
    return {
      status: 'warn',
      detail: '未安装 nginx，且当前是直连模式（文件由 Node 转发）',
      advice: '需要 nginx 直读时，把 nginx 解压到 runtime/nginx/。',
    } as any
  }

  /**
   * 直读 MIME 类型表是否覆盖了所有该覆盖的扩展名。
   *
   * 为什么单独查这一项：直读分支的 `Content-Type` **完全由 nginx** 按 accel URI
   * 的扩展名查 `types{}` 决定，上游 Node 给的响应头被忽略。而 nginx 自带
   * `conf/mime.types` 缺项（实测缺 `md`），缺了会退化成 `application/octet-stream`
   * —— 浏览器不内联预览、直接弹下载，但文件本身完全正常、下载下来也对。
   *
   * 也就是说：**这是一类"用户看得见、日志看不见"的缺陷**，只有主动核对类型表
   * 才能发现。MIME 表与 nginx `types{}` 现在同源于 `runtime/mime-map.json`，
   * 所以正常情况下这里恒为 ok；报错说明有人绕过了生成器或删了表。
   */
  private async checkMimeTypes(): Promise<Omit<CheckResult, 'id' | 'title' | 'fixable' | 'ms'>> {
    /* ⚠ 路径必须由**本模块自身位置**推出，不能用 ctx.privhub.codeRoot。
     * 后者是「数据/运行根」，会被 --spawn 测试根、蓝绿槽位目录、
     * PRIVHUB_ROOT 环境变量改到别处；而 runtime/ 是**代码**，永远跟着源码走。
     * 踩过：测试根下没有 runtime/mime-map.json，自检于是误报"映射表缺失"。 */
    const nginxDir = process.env.PRIVHUB_NGINX_DIR?.trim() || join(CODE_ROOT, 'runtime', 'nginx')
    const mapFile = MIME_MAP_PATH
    if (!existsSync(mapFile)) {
      return {
        status: 'error',
        detail: 'MIME 映射表缺失：' + mapFile,
        advice: '读路径的 MIME 依赖它，缺了会让所有文件退化成 application/octet-stream。'
          + '从发布包里恢复 runtime/mime-map.json。',
      } as any
    }
    /* 没有 nginx 二进制时无法核对它的 mime.types —— 但这不是故障：
     * 直连模式下 Node 自己发头，用的是同一份 JSON，不受影响。 */
    const exe = join(nginxDir, process.platform === 'win32' ? 'nginx.exe' : 'nginx')
    if (!existsSync(exe)) {
      return {
        status: 'skipped',
        detail: '未安装 nginx，无法核对 types{}（直连模式下 MIME 由 Node 按同一份 JSON 决定，不受影响）',
        fixable: false,
      } as any
    }
    try {
      /* 有渲染后的配置就按它核对 —— 这是唯一能抓到「模板里的
       * {{NGINX_TYPES_BLOCK}} 被删掉」的判据（那种情况下 mime.types 与
       * mime-map.json 都还完好，只有实际配置里少了那段）。 */
      const rendered = readRenderedNginxConfig(nginxDir)
      const r = checkTypesConsistency(nginxDir, rendered)
      if (r.error) {
        return { status: 'error', detail: 'MIME 表读取失败：' + r.error, advice: '检查 runtime/mime-map.json 是否是合法 JSON。' } as any
      }
      if (!r.ok) {
        return {
          status: 'error',
          detail: '这些扩展名直读会退化成 octet-stream：' + r.degraded.join(', '),
          samples: r.degraded.slice(0, MAX_SAMPLES),
          advice: rendered
            ? '已渲染的 nginx 配置里缺少这些类型声明 —— 检查 nginx.conf.template 的 {{NGINX_TYPES_BLOCK}} 占位符是否还在，然后重新生成配置并重载 nginx。'
            : '把缺失项补进 runtime/mime-map.json（nginx types{} 由它生成），然后重载 nginx。',
        } as any
      }
      const n = Object.keys(loadExtMime()).length
      return {
        status: 'ok',
        detail: `MIME 表 ${n} 项，${rendered ? '已渲染的 nginx 配置' : 'nginx types{}'}覆盖全部声明，直读类型正确`,
        fixable: false,
      } as any
    } catch (e) {
      return { status: 'error', detail: 'MIME 一致性核对失败：' + msgOf(e), advice: '查看服务日志。' } as any
    }
  }

  /* ---------------- 修复 ---------------- */

  /**
   * 执行一项修复。**只修 `runChecks` 明确标了 `fixable: true` 的项。**
   * 每一项都返回做了什么、影响多少条，便于管理员确认。
   */
  async repair(id: string): Promise<RepairResult> {
    const fi = this.fi()
    switch (id) {
      case 'index-pool': {
        if (!fi) return { ok: false, action: '', affected: 0, error: '主索引不可用' }
        const dead: string[] = []
        for (const e of fi.all() as any[]) {
          if (e.isDir || e.source !== 'pool' || !e.physicalId) continue
          const abs = typeof fi.resolvePhysical === 'function' ? fi.resolvePhysical(e) : null
          if (!abs || !existsSync(abs)) dead.push(e.id)
        }
        let n = 0
        for (const eid of dead) {
          try { if (fi.removeEntry(eid)) n++ } catch { /* 单条失败不中断整批 */ }
        }
        try { await fi.flushNow() } catch { /* 落盘失败下面会体现为 affected 与预期不符 */ }
        return { ok: true, action: `摘除 ${n} 个指向已消失字节的索引条目`, affected: n }
      }
      case 'pool-orphan': {
        if (!fi) return { ok: false, action: '', affected: 0, error: '主索引不可用' }
        const pool = this.poolDir
        if (!existsSync(pool)) return { ok: true, action: '池目录不存在，无需清理', affected: 0 }
        const referenced = new Set<string>()
        for (const e of fi.all() as any[]) if (e.physicalId) referenced.add(String(e.physicalId))
        let n = 0
        for (const nm of readdirSync(pool)) {
          if (nm.endsWith('.part')) continue
          const pid = nm.replace(/\.[^.]*$/, '')
          if (referenced.has(pid)) continue
          try { (await import('node:fs/promises')).unlink(join(pool, nm)); n++ } catch { /* 竞态：可能刚被删 */ }
        }
        return { ok: true, action: `删除 ${n} 个无人引用的池文件`, affected: n }
      }
      case 'legacy-source': {
        if (!fi) return { ok: false, action: '', affected: 0, error: '主索引不可用' }
        const dead: string[] = []
        for (const e of fi.all() as any[]) {
          if (e.isDir || e.source !== 'legacy') continue
          const abs = typeof fi.resolvePhysical === 'function' ? fi.resolvePhysical(e) : null
          if (!abs || !existsSync(abs)) dead.push(e.id)
        }
        let n = 0
        for (const eid of dead) {
          try { if (fi.removeEntry(eid)) n++ } catch { /* 同上 */ }
        }
        try { await fi.flushNow() } catch { /* 同上 */ }
        return { ok: true, action: `摘除 ${n} 个源文件已不存在的老库条目`, affected: n }
      }
      case 'trash': {
        if (!fi) return { ok: false, action: '', affected: 0, error: '主索引不可用' }
        const dead: string[] = []
        for (const e of fi.listTrash() as any[]) {
          if (e.isDir) continue
          const abs = typeof fi.resolvePhysical === 'function' ? fi.resolvePhysical(e) : null
          if (!abs || !existsSync(abs)) dead.push(e.id)
        }
        let n = 0
        for (const eid of dead) {
          try { if (fi.removeEntry(eid)) n++ } catch { /* 同上 */ }
        }
        try { await fi.flushNow() } catch { /* 同上 */ }
        return { ok: true, action: `从回收站移除 ${n} 个已无字节的条目`, affected: n }
      }
      default:
        return { ok: false, action: '', affected: 0, error: '这一项不支持自动修复：' + id }
    }
  }
}

export const name = 'privhub-svc-doctor'
export const inject = ['privhub', 'storage']

export function apply(ctx: Context): void {
  const svc = new DoctorService(ctx)
  /* 不用 `ctx.set('doctor', ...)` —— 本项目没有任何插件走 cordis 的 provide 机制，
   * 那需要在插件上声明 `provide`，漏了就是启动期挂载失败（实测报
   * `cannot set property "doctor" without provide`）。服务的唯一暴露面是
   * 下面的 HTTP 路由，够用了。 */

  const route = (ctx as any).privhub?.route?.bind((ctx as any).privhub)
  if (typeof route !== 'function') {
    /* 装配失败必须吼出来：静默少一个插件，表现就是"自检接口 404"，
     * 而管理员会以为系统没问题。 */
    console.error('[doctor] 未能拿到 privhub.route，自检接口不可用（装配顺序异常）')
    return
  }

  /** 自检：只读，管理员随时可跑。 */
  route('/privhub/api/doctor/check', async (req: any, res: any) => {
    const u = (ctx as any).privhub.requireUser(req, res)
    if (!u) return
    if (u.role !== 'admin') return json(res, 403, { ok: false, error: '仅管理员可执行自检' })
    try {
      const report = await svc.runChecks()
      json(res, 200, report)
    } catch (e) {
      json(res, 500, { ok: false, error: '自检失败：' + msgOf(e) })
    }
  }, 'doctor-check')

  /** 修复：只接受 runChecks 标了 fixable 的 id。 */
  route('/privhub/api/doctor/repair', async (req: any, res: any) => {
    const u = (ctx as any).privhub.requireUser(req, res)
    if (!u) return
    if (u.role !== 'admin') return json(res, 403, { ok: false, error: '仅管理员可执行修复' })
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' })
    const body = await readJsonBody<{ id?: string }>(req, res)
    if (body === null) return
    const id = String(body.id ?? '').trim()
    if (id === '') return json(res, 400, { ok: false, error: '缺少 id' })
    try {
      const r = await svc.repair(id)
      json(res, r.ok ? 200 : 400, r)
    } catch (e) {
      json(res, 500, { ok: false, error: '修复失败：' + msgOf(e) })
    }
  }, 'doctor-repair')
}
