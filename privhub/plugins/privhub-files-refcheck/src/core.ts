/**
 * privhub-files-refcheck · core —— 附件引用扫描（纯逻辑，不碰 HTTP / 不写任何数据）
 *
 * 【这个插件要解决什么】生产环境文件一多，就会出现两类「看不见的问题」：
 *   ① 孤儿附件：文件躺在磁盘上，**没有任何东西引用它**（旧版本残留、传错目录、
 *      改名后遗留……），占着空间却永远没人打开；
 *   ② 断链引用：文档/任务卡里写着一个引用，**目标已经不存在**（被删/被改名/
 *      手写路径写错），点过去是空的。
 * 本版**只报告、只导出清单，绝不删除、绝不改动任何文件**（删除永远另走人工确认）。
 *
 * 【什么算「引用」】PrivHub 里没有独立的「附件」实体，引用只有三种来源：
 *   · Markdown 双链 `[[文件名]]` / `[[文件名|别名]]` —— 与 图谱(privhub-files-kg)
 *     同一套语法；但图谱会**丢弃**解析不到的目标，本模块刻意**保留**它们，
 *     这样才能报出断链（这是本插件与图谱最关键的一处分歧，勿"优化"成丢弃）。
 *   · Markdown 链接 `[文字](目标)` / 图片 `![alt](目标)` —— 只认项目内相对路径，
 *     带 `scheme:`（http:/mailto:/data:/C: 等）一律视为外链，不参与统计。
 *   · 任务卡的 `relatedFiles[{project,path}]` —— 全仓唯一的**结构化**跨文件引用，
 *     由调用方（index.ts）汇总后以 `boardRefs` 传入，因此它能跨项目。
 *
 * 【为什么走「一次性递归遍历 + 内存索引」】引用是**全局**关系：要判断一个文件
 * 有没有被引用，必须先把项目里所有文件与所有引用都收齐。所以本模块不做增量，
 * 每次扫描重建两张内存索引（path 集合、basename 映射），O(文件数 + 引用数)。
 * 代价用四道闸门兜住：并发上限、单文件解析上限、文件总数上限、结果条数上限；
 * 任一道触发都会在回执的 `truncated` 上明说，**不静默**（沿用 W-C 的截断口径）。
 *
 * 【权限】本模块不认识用户，只接受一个 `canView(relPath)` 回调：
 *   · 不可见的文件既**不进候选**（不会作为孤儿被报出来）；
 *   · 也不作为断链的**目标**（避免"文档里写了个路径 → 被报断链 → 名字泄露"），
 *     这类命中计入 `suppressed`，只回数量、不回名字。
 *
 * @module privhub-files-refcheck/src/core
 */

import { basename, dirname, extname } from 'node:path'
import { readdir, stat } from 'node:fs/promises'
import { fmtSize } from '../../privhub-core/src/index'
import { MARKDOWN_EXTS } from '../../privhub-core/src/file-exts'

/** 规模闸门。口径同 W-C：只保护「别炸/别卡」，被丢掉的会在 truncated 上明说。 */
export const LIMITS = {
  /** 目录递归深度上限 */
  maxDepth: 24,
  /** 单项目文件条目上限（超过即截断） */
  maxFiles: 200000,
  /** 单个 md 文件解析上限；超过只看不解析（计入 skippedLarge） */
  maxParseBytes: 1024 * 1024,
  /** 读文件并发（口径同图谱 IO_CONCURRENCY=8） */
  ioConcurrency: 8,
  /** 返回的孤儿上限 */
  maxOrphans: 5000,
  /** 返回的断链上限 */
  maxDangling: 5000,
  /** 扫描结果缓存 TTL */
  cacheTtlMs: 5 * 60 * 1000,
  /** 缓存条目上限（键 = 项目+用户+范围） */
  maxCacheEntries: 32,
} as const

/** 被引用文件的路径形态（一律正斜杠、项目内相对路径、不含前导斜杠）。 */
export type RelPath = string

export interface FileEnt { path: RelPath; name: string; ext: string; size: number; mtime: number }

export interface Orphan {
  project: string
  path: RelPath
  name: string
  ext: string
  /** 明文体积（密文文件已扣掉 PHENC1 头，口径同 listFiles） */
  size: number
  sizeText: string
  /** ISO 时间戳 */
  mtime: string
}

export type RefKind = 'wiki' | 'md' | 'task'

export interface Dangling {
  project: string
  /** 来源：文档相对路径，或「任务卡「标题」」这样的可读来源 */
  source: string
  /** 原文写下的目标（未经解析，原样回显，方便用户去改） */
  target: string
  /** 行号（任务卡类引用固定 0） */
  line: number
  kind: RefKind
}

export interface Report {
  scope: 'project' | 'all'
  projects: string[]
  scannedAt: number
  durationMs: number
  truncated: boolean
  truncatedReason: string
  totals: {
    /** 可见文件数（不含目录、不含权限过滤掉的） */
    files: number
    /** 目录数 */
    dirs: number
    /** 其中 Markdown 文档数 */
    docs: number
    /** 解出的引用条数（含解析成功的与断链的） */
    refs: number
    /** 实际读了内容的文档数 */
    parsedDocs: number
    /** 因超过 maxParseBytes 未解析的文档数 */
    skippedLarge: number
    /** 因权限不可见而被跳过的文件数 */
    hiddenFiles: number
  }
  /** 孤儿附件（未被任何引用指向的非 Markdown 文件） */
  orphans: Orphan[]
  orphanTotal: number
  orphansTruncated: boolean
  /** 断链引用 */
  dangling: Dangling[]
  danglingTotal: number
  danglingTruncated: boolean
  /** 被权限抑制、未报出的断链条数（只给数量，不给名字） */
  suppressed: number
}

/** 供 core 使用的最小依赖面（便于单测与解耦；index.ts 负责把 ctx 适配进来）。 */
export interface ScanDeps {
  project: string
  /** 项目真实根目录（调用方已过 resolveReal 校验）；null ⇒ 项目目录不存在 */
  root: string | null
  /** 文件级视图权限；无规则的项目应直接返回一个恒 true 的函数（见 index.ts） */
  canView: (relPath: RelPath) => boolean
  /** 指向本项目的看板引用（可跨项目）：source 为可读来源名，path 为项目内相对路径 */
  boardRefs: { source: string; path: string }[]
  /** 读取文本（调用方给 ctx.storage.readText） */
  readText: (absPath: string) => Promise<string>
  /** 是否密文（用于孤儿体积按明文口径展示；只为被报出的孤儿调用，不做全量） */
  isEncrypted: (absPath: string) => Promise<boolean>
  /** 绝对路径拼接 */
  join: (...parts: string[]) => string
}

/** 双链：与 privhub-files-kg 同一套语法，务必保持一致。 */
const WIKI_RE = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g
/** Markdown 链接/图片：`[x](y)` / `![x](y)`，标题可选。 */
const MDLINK_RE = /!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g
/** 外链/绝对路径：`http:` `mailto:` `data:` `C:` … 一律不算项目内引用。 */
const SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/

const MD_EXTS = new Set(MARKDOWN_EXTS.map((e) => e.toLowerCase()))

/** 行号：按前缀换行数数出来（1 起），用于把断链指回原文那一行。 */
function lineOf(text: string, index: number): number {
  let n = 1
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) n++
  return n
}

/**
 * 规范化引用目标：
 *   · 去掉 `<>` 包裹、锚点 `#…`、查询 `?…`；反斜杠转正斜杠；去前导 `./`；
 *   · 百分号解码（失败就按原文用）；
 *   · 外链/盘符路径返回 ''（由调用方跳过）。
 */
export function normTarget(raw: string): string {
  let t = String(raw ?? '').trim()
  if (t === '') return ''
  if (t.startsWith('<') && t.endsWith('>')) t = t.slice(1, -1).trim()
  if (SCHEME_RE.test(t)) return ''
  try { t = decodeURIComponent(t) } catch { /* 原样使用 */ }
  t = t.split('#')[0].split('?')[0].replace(/\\/g, '/').trim()
  while (t.startsWith('./')) t = t.slice(2)
  if (t.startsWith('/')) t = t.replace(/^\/+/, '')
  if (t === '' || t === '.' || t === '..') return ''
  return t
}

/** 从一段 Markdown 文本里抽出全部引用（不含解析）。 */
export function extractRefs(text: string): { target: string; line: number; kind: RefKind }[] {
  const out: { target: string; line: number; kind: RefKind }[] = []
  const push = (raw: string, index: number, kind: RefKind): void => {
    const t = normTarget(raw)
    // 双链的 raw 是文件名（可能含路径），规范化的规则与 md 链接相同
    if (t !== '') out.push({ target: t, line: lineOf(text, index), kind })
  }
  for (const m of text.matchAll(WIKI_RE)) push(m[1], m.index ?? 0, 'wiki')
  for (const m of text.matchAll(MDLINK_RE)) push(m[1], m.index ?? 0, 'md')
  return out
}

interface WalkOut { files: FileEnt[]; dirs: number; truncated: boolean }

/**
 * 递归收集文件条目。
 *
 * 【为什么只对根做一次 resolveReal、子目录不再逐个校验】
 * 根已由调用方经 `resolveReal` 核对过（项目真实路径）。往下走时**不跟随符号链接**
 * （Windows junction 的 `isSymbolicLink()` 为 true，与 core.listFiles 同一口径），
 * 因此不可能靠 junction 逃出数据根 —— 每层再 realpath 一遍只是重复同一条保证，
 * 却要为每个目录付一次系统调用。跳过的点开头条目与 core.listFiles 一致。
 */
async function walk(deps: ScanDeps): Promise<WalkOut> {
  const files: FileEnt[] = []
  let dirs = 0
  let truncated = false
  if (deps.root === null) return { files, dirs, truncated }

  const stack: { abs: string; rel: string; depth: number }[] = [{ abs: deps.root, rel: '', depth: 0 }]
  while (stack.length > 0) {
    const cur = stack.pop() as { abs: string; rel: string; depth: number }
    if (cur.depth > LIMITS.maxDepth) { truncated = true; continue }
    const entries = await readdir(cur.abs, { withFileTypes: true }).catch(() => [])
    for (const e of entries) {
      if (e.name.startsWith('.')) continue
      const rel = cur.rel === '' ? e.name : cur.rel + '/' + e.name
      if (e.isDirectory()) {
        if (e.isSymbolicLink()) continue
        dirs++
        stack.push({ abs: deps.join(cur.abs, e.name), rel, depth: cur.depth + 1 })
      } else {
        if (e.isSymbolicLink()) continue
        if (files.length >= LIMITS.maxFiles) { truncated = true; break }
        const abs = deps.join(cur.abs, e.name)
        const s = await stat(abs).catch(() => null)
        if (!s || !s.isFile()) continue
        files.push({
          path: rel,
          name: e.name,
          ext: extname(e.name).slice(1).toLowerCase(),
          size: s.size,
          mtime: s.mtimeMs,
        })
      }
    }
    if (files.length >= LIMITS.maxFiles) { truncated = true; break }
  }
  return { files, dirs, truncated }
}

/** 有上限的并发 map：「工位拉取」式，慢条目不拖住整批（口径同图谱 mapLimit）。 */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length)
  let next = 0
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const i = next++
      if (i >= items.length) return
      out[i] = await fn(items[i])
    }
  })
  await Promise.all(workers)
  return out
}

/**
 * 扫一个项目，产出报告。
 * 纯函数式：不写盘、不审计、不缓存（这三件事都在 index.ts）。
 */
export async function scanProject(deps: ScanDeps): Promise<Report> {
  const started = Date.now()
  const { files, dirs, truncated: walkTrunc } = await walk(deps)
  const truncatedReason: string[] = []
  if (walkTrunc) truncatedReason.push('文件条目或目录深度超过上限，部分文件未纳入扫描')

  const pathSet = new Set<RelPath>()
  const dirSet = new Set<RelPath>()
  const byName = new Map<string, RelPath[]>()
  const cand: FileEnt[] = []
  const hiddenNames = new Set<string>()
  const hiddenPaths: RelPath[] = []
  let docs = 0

  for (const f of files) {
    if (!deps.canView(f.path)) {
      hiddenNames.add(f.name)
      hiddenPaths.push(f.path)
      continue
    }
    pathSet.add(f.path)
    const arr = byName.get(f.name)
    if (arr) arr.push(f.path)
    else byName.set(f.name, [f.path])
    if (MD_EXTS.has(f.ext)) docs++
    else cand.push(f)
  }
  // 目录也参与「引用是否解析得到」的判定（文档里链接一个文件夹是合法的）
  for (const f of files) {
    const d = dirname(f.path)
    let cur = ''
    for (const seg of d.split('/')) {
      if (seg === '' || seg === '.') continue
      cur = cur === '' ? seg : cur + '/' + seg
      dirSet.add(cur)
    }
  }

  /** 把一条引用解析成实际存在的路径；解析不到返回 null。 */
  const resolve = (sourceRel: string, target: string): RelPath | null => {
    const dir = dirname(sourceRel)
    const relFromDir = dir === '' || dir === '.' ? target : dir + '/' + target
    if (pathSet.has(relFromDir) || dirSet.has(relFromDir)) return relFromDir
    if (pathSet.has(target) || dirSet.has(target)) return target
    // 同名单文件回退（[[双链]] 的本来语义；也覆盖「文件被移动过」的常见情形）。
    // 命中多个时取第一个：宁漏报断链，不误报 —— 误报会让用户去"修"一个其实存在的文件。
    const hits = byName.get(basename(target))
    if (hits && hits.length > 0) return hits[0]
    return null
  }

  /** 该目标是否可能指向一个「本用户看不见的文件」（用于抑制断链，避免泄露名字）。 */
  const maybeHidden = (target: string): boolean => {
    if (hiddenNames.has(basename(target))) return true
    for (const hp of hiddenPaths) {
      if (hp === target || hp.startsWith(target + '/')) return true
    }
    return false
  }

  // 只解析可见文档（不可见的文档不入内存，避免内容泄露）
  const docEnts = files.filter((f) => MD_EXTS.has(f.ext) && pathSet.has(f.path))
  let parsedDocs = 0
  let skippedLarge = 0
  let refsCount = 0
  const referenced = new Set<RelPath>()
  const dangling: Dangling[] = []
  let suppressed = 0
  let danglingTrunc = false

  const perDoc = await mapLimit(docEnts, LIMITS.ioConcurrency, async (doc) => {
    if (doc.size > LIMITS.maxParseBytes) return { doc, text: '' as string, skipped: true }
    const abs = deps.join(deps.root as string, ...doc.path.split('/'))
    const text = await deps.readText(abs).catch(() => '')
    return { doc, text, skipped: false }
  })

  for (const r of perDoc) {
    if (r.skipped || r.text === '') { if (r.skipped) skippedLarge++; else parsedDocs++; continue }
    parsedDocs++
    for (const ref of extractRefs(r.text)) {
      refsCount++
      const hit = resolve(r.doc.path, ref.target)
      if (hit !== null) { referenced.add(hit); continue }
      if (maybeHidden(ref.target)) { suppressed++; continue }
      if (dangling.length >= LIMITS.maxDangling) { danglingTrunc = true; continue }
      dangling.push({ project: deps.project, source: r.doc.path, target: ref.target, line: ref.line, kind: ref.kind })
    }
  }

  /* 看板引用：命中即算「被引用」，落空则是一条断链（任务卡指向了不存在的文件）。 */
  for (const b of deps.boardRefs) {
    refsCount++
    const t = normTarget(b.path)
    if (t === '') continue
    if (pathSet.has(t) || dirSet.has(t)) { referenced.add(t); continue }
    if (maybeHidden(t)) { suppressed++; continue }
    if (dangling.length >= LIMITS.maxDangling) { danglingTrunc = true; continue }
    dangling.push({ project: deps.project, source: b.source, target: t, line: 0, kind: 'task' })
  }

  /* 孤儿：可见的非 Markdown 文件里，没有任何引用指向它。
   * 为什么默认排除 Markdown：一篇没人链接的笔记是**正常**的（它是入口，不是附件），
   * 把它报成孤儿只会淹没真正的孤儿附件（scope=all 时由调用方放开）。 */
  const orphanEnts = cand.filter((f) => !referenced.has(f.path))
  const orphansTrunc = orphanEnts.length > LIMITS.maxOrphans
  const picked = orphanEnts.slice(0, LIMITS.maxOrphans)
  const orphans: Orphan[] = await mapLimit(picked, LIMITS.ioConcurrency, async (f) => {
    const abs = deps.join(deps.root as string, ...f.path.split('/'))
    let size = f.size
    if (await deps.isEncrypted(abs).catch(() => false)) size = Math.max(0, size - 36)
    return {
      project: deps.project,
      path: f.path,
      name: f.name,
      ext: f.ext,
      size,
      sizeText: fmtSize(size),
      mtime: new Date(f.mtime).toISOString(),
    }
  })
  // 按体积降序：生产环境里「先看占地方最大的」才是可操作的顺序
  orphans.sort((a, b) => b.size - a.size || a.path.localeCompare(b.path))

  if (orphansTrunc) truncatedReason.push('孤儿数量超过上限，清单已截断（请用 CSV 导出查看或按目录分批扫描）')
  if (danglingTrunc) truncatedReason.push('断链条数超过上限，清单已截断')

  return {
    scope: 'project',
    projects: [deps.project],
    scannedAt: Date.now(),
    durationMs: Date.now() - started,
    truncated: truncatedReason.length > 0,
    truncatedReason: truncatedReason.join('；'),
    totals: {
      files: pathSet.size,
      dirs: dirSet.size,
      docs,
      refs: refsCount,
      parsedDocs,
      skippedLarge,
      hiddenFiles: hiddenPaths.length,
    },
    orphans,
    orphanTotal: orphanEnts.length,
    orphansTruncated: orphansTrunc,
    dangling,
    danglingTotal: dangling.length + suppressed,
    danglingTruncated: danglingTrunc,
    suppressed,
  }
}

/**
 * 合并多份单项目报告。体量类字段相加，清单拼接后再各自截断。
 * `scope` 由调用方给出（**不能**照报告的份数推断）：单项目扫描也是走这条合并，
 * 但它的 scope 必须是 'project'，否则界面上的范围标签会谎报成「全部项目」。
 */
export function mergeReports(reports: Report[], scope: 'project' | 'all'): Report {
  if (reports.length === 0) {
    return {
      scope, projects: [], scannedAt: Date.now(), durationMs: 0,
      truncated: false, truncatedReason: '',
      totals: { files: 0, dirs: 0, docs: 0, refs: 0, parsedDocs: 0, skippedLarge: 0, hiddenFiles: 0 },
      orphans: [], orphanTotal: 0, orphansTruncated: false,
      dangling: [], danglingTotal: 0, danglingTruncated: false, suppressed: 0,
    }
  }
  if (reports.length === 1) return { ...reports[0], scope }
  const sum = (pick: (r: Report) => number): number => reports.reduce((n, r) => n + pick(r), 0)
  const allOrphans = reports.flatMap((r) => r.orphans).sort((a, b) => b.size - a.size || a.path.localeCompare(b.path))
  const allDangling = reports.flatMap((r) => r.dangling)
  const orphanTotal = sum((r) => r.orphanTotal)
  const danglingTotal = sum((r) => r.danglingTotal)
  const orphansTruncated = allOrphans.length > LIMITS.maxOrphans || reports.some((r) => r.orphansTruncated)
  const danglingTruncated = allDangling.length > LIMITS.maxDangling || reports.some((r) => r.danglingTruncated)
  const reasons = reports.map((r) => r.truncatedReason).filter((x) => x !== '')
  return {
    scope: 'all',
    projects: reports.map((r) => r.projects[0]),
    scannedAt: Date.now(),
    durationMs: sum((r) => r.durationMs),
    truncated: orphansTruncated || danglingTruncated || reasons.length > 0,
    truncatedReason: reasons.join('；'),
    totals: {
      files: sum((r) => r.totals.files),
      dirs: sum((r) => r.totals.dirs),
      docs: sum((r) => r.totals.docs),
      refs: sum((r) => r.totals.refs),
      parsedDocs: sum((r) => r.totals.parsedDocs),
      skippedLarge: sum((r) => r.totals.skippedLarge),
      hiddenFiles: sum((r) => r.totals.hiddenFiles),
    },
    orphans: allOrphans.slice(0, LIMITS.maxOrphans),
    orphanTotal,
    orphansTruncated,
    dangling: allDangling.slice(0, LIMITS.maxDangling),
    danglingTotal,
    danglingTruncated,
    suppressed: sum((r) => r.suppressed),
  }
}

/** CSV 单元格转义（口径同审计导出 / S1 exportCsv）。 */
function esc(v: string | number): string {
  return '"' + String(v).replace(/"/g, '""') + '"'
}

/** 导出清单 CSV（带 BOM，Excel 直接打开不乱码）。kind=all 时两块用空行分隔。 */
export function reportToCsv(report: Report, kind: 'orphans' | 'dangling' | 'all'): string {
  const blocks: string[] = []
  if (kind === 'orphans' || kind === 'all') {
    const head = ['项目', '路径', '文件名', '扩展名', '体积', '字节', '修改时间'].map(esc).join(',')
    const rows = report.orphans.map((o) => [o.project, o.path, o.name, o.ext, o.sizeText, o.size, o.mtime].map(esc).join(','))
    blocks.push(['# 孤儿附件（未被任何引用指向的文件）', head, ...rows].join('\n'))
  }
  if (kind === 'dangling' || kind === 'all') {
    const head = ['项目', '来源', '引用目标', '行号', '类型'].map(esc).join(',')
    const rows = report.dangling.map((d) => [d.project, d.source, d.target, d.line, d.kind === 'wiki' ? '双链' : d.kind === 'md' ? 'Markdown 链接' : '任务卡'].map(esc).join(','))
    blocks.push(['# 断链引用（引用的目标不存在）', head, ...rows].join('\n'))
  }
  const meta = ['# 扫描时间', new Date(report.scannedAt).toISOString(), '# 范围', report.scope, '# 项目数', report.projects.length].map(esc).join(',')
  return String.fromCharCode(0xfeff) + meta + '\n' + blocks.join('\n\n')
}
