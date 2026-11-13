/**
 * 直读侧 MIME 配置的生成与自检。
 *
 * ## 问题
 *
 * 直读分支（`X-Accel-Redirect`）的 `Content-Type` **完全由 nginx 决定**：
 * 它按 accel URI 的扩展名查 `types{}`，上游 Node 给的 `Content-Type` 被忽略。
 * 而 `types{}` 如果靠人手维护，就必然与 Node 那份 MIME 表漂移 —— 实测已经漂了：
 * nginx 自带 `mime.types` 里**没有 `md`**，于是所有 Markdown 经直读都拿到
 * `application/octet-stream`，浏览器不内联预览、直接下载。而 Markdown 恰恰是
 * 本系统最主要的文件类型。
 *
 * 这类缺陷最阴的地方是**只在直读分支出现**：`PRIVHUB_BEHIND_NGINX=0` 的直连
 * 开发模式下 Node 自己发头，一切正常。"本地跑得好好的"完全说明不了生产没事。
 *
 * ## 解法
 *
 * MIME 表只写一次，落在 `runtime/mime-map.json`，两个消费方共用：
 *
 *   - Node 降级分支：`mime.ts` 读它
 *   - nginx 直读分支：`runtime/control.mjs` 渲染 `types{}` 时读它
 *
 * 选 JSON 而不是 TS 常量，是因为 `control.mjs` 是**纯 Node**（不带 tsx），
 * 读不了 TS。两边读同一份数据，"直读与降级给同一个 MIME"由构造保证。
 *
 * @module privhub-svc-fileindex/nginx-types
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { IMAGE_EXTS, MARKDOWN_EXTS, MEDIA_EXTS } from '../../privhub-core/src/file-exts'

/**
 * `runtime/` 目录的绝对路径，**由本模块自身位置推出**。
 *
 * 不能用 `PRIVHUB_ROOT`：那是**数据/运行根**，可以被 `--spawn` 的测试根、
 * 蓝绿槽位目录、`PRIVHUB_ROOT` 环境变量改到别处，而 `runtime/` 是**代码**，
 * 永远跟着这份源码走。踩过：测试根下没有 `runtime/mime-map.json`，
 * 于是 `loadExtMime` 抛错、整个 MIME 判定失败。
 *
 * 本文件在 `<code>/plugins/privhub-svc-fileindex/src/`，故上溯三级。
 */
const HERE = dirname(fileURLToPath(import.meta.url))
const RUNTIME_DIR = join(HERE, '..', '..', '..', 'runtime')

/** 代码根（`plugins/`、`frontend/`、`runtime/` 的父目录），由本模块位置推出。 */
export const CODE_ROOT = join(HERE, '..', '..', '..')

/** `runtime/mime-map.json` 的绝对路径。 */
export const MIME_MAP_PATH = join(RUNTIME_DIR, 'mime-map.json')

interface MimeMapFile {
  exts: Record<string, string>
}

let cached: Record<string, string> | null = null

/**
 * 读 MIME 表（带缓存）。
 *
 * 找不到文件时**抛错而不是返回空表** —— 空表会让所有类型退化成
 * `application/octet-stream`，且静默无声；那种"看起来能跑"的降级正是要避免的。
 */
export function loadExtMime(): Record<string, string> {
  if (cached) return cached
  if (!existsSync(MIME_MAP_PATH)) {
    throw new Error('缺少 MIME 映射表：' + MIME_MAP_PATH
      + '（读路径的 MIME 依赖它；缺失会导致所有文件退化成 application/octet-stream）')
  }
  const raw = JSON.parse(readFileSync(MIME_MAP_PATH, 'utf8')) as MimeMapFile
  const exts = raw?.exts
  if (!exts || typeof exts !== 'object' || Object.keys(exts).length === 0) {
    throw new Error('MIME 映射表为空或格式错误：' + MIME_MAP_PATH)
  }
  cached = exts
  return cached
}

/** 仅供测试重置缓存。 */
export function resetMimeCache(): void {
  cached = null
}

/**
 * 读 nginx 的 `conf/mime.types`，返回它已声明的扩展名集合。
 *
 * 读不到就返回空集 —— 此时生成的补充块会包含全部项。这是**安全**的退化方向：
 * 多声明一个已存在的扩展名最多打一条 duplicate 警告，而少声明一个会让该类型
 * 退化成 octet-stream（用户可见的功能缺陷）。
 */
export function readNginxMimeTypes(nginxDir: string): Set<string> {
  const out = new Set<string>()
  const p = join(nginxDir, 'conf', 'mime.types')
  if (!existsSync(p)) return out
  let text = ''
  try { text = readFileSync(p, 'utf8') } catch { return out }
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    /* mime.types 的格式：`type/subtype    ext1 ext2 ...;`，跳过注释与块结构行。 */
    if (line === '' || line.startsWith('#') || line === 'types {' || line === '}') continue
    const semi = line.lastIndexOf(';')
    if (semi < 0) continue
    const body = line.slice(0, semi)
    const sp = body.search(/\s/)
    if (sp < 0) continue
    for (const ext of body.slice(sp + 1).trim().split(/\s+/)) {
      if (ext !== '') out.add(ext.toLowerCase())
    }
  }
  return out
}

/**
 * 生成 nginx `types{}` 补充块（**只含 mime.types 里没有的扩展名**）。
 *
 * @returns 可直接嵌进 `http{}` 的配置片段；无需补充时返回空串
 */
export function renderNginxTypesBlock(nginxDir: string): string {
  const extMime = loadExtMime()
  const have = readNginxMimeTypes(nginxDir)
  /* 同一个 MIME 可能对应多个扩展名，合并成一行（nginx 语法就是 `type a b c;`）。 */
  const byMime = new Map<string, string[]>()
  for (const [ext, mime] of Object.entries(extMime)) {
    if (have.has(ext)) continue
    /* nginx 的 types 里不能带 charset 参数，去掉。 */
    const bare = mime.split(';')[0].trim()
    const arr = byMime.get(bare)
    if (arr) arr.push(ext)
    else byMime.set(bare, [ext])
  }
  if (byMime.size === 0) return ''
  const lines: string[] = []
  lines.push('    # 由 runtime/mime-map.json 生成，**不要手改本块**。')
  lines.push('    # 只补 nginx 自带 mime.types 里没有的扩展名（重复声明会打 duplicate 警告）。')
  lines.push('    # 缺项会让直读退化成 application/octet-stream —— 浏览器于是不内联显示、直接下载。')
  lines.push('    types {')
  for (const [mime, exts] of [...byMime.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push('        ' + mime + '    ' + exts.join(' ') + ';')
  }
  lines.push('    }')
  return lines.join('\n')
}

/**
 * 直读**必须**能正确识别的类型。缺任何一项都是用户立刻能感觉到的缺陷：
 * Markdown 不预览而是弹下载、图片不显示、视频不播。
 *
 * ## 为什么需要它
 *
 * 只核对「`mime-map.json` 的键都被覆盖」有一个盲区：补充块由同一份 JSON 生成，
 * 若有人把 `md` 从 JSON 里删了，两边一起少、集合仍然"一致"，检查会报绿。
 * 所以必须另外声明一组不许消失的类型。
 *
 * ## 为什么是派生式而不是手写字面量
 *
 * 全仓有反漂移扫描（`tests/file-exts.mjs` ④）：凡「≥4 个字面量且 ≥70% 像扩展名」
 * 的数组只允许出现在 5 个备案出处。手写新清单会让那条断言变红 —— 而且红得对，
 * 手写副本正是漂移的来源。所以从 `file-exts.ts` 的既有集合派生，改集合时自动跟随。
 *
 * 只取**直读真正会用到**的族：图片、音视频、PDF、Markdown。
 * 不取全部 `PREVIEW_TEXT_EXTS` —— `.tsx .yaml .jsonl` 那些走 `/api/preview`
 * 的 JSON 正文，不经直读，把它们要求进来会报一堆假故障（踩过）。
 */
export const MUST_HAVE_EXTS: readonly string[] = Object.freeze([
  ...IMAGE_EXTS, ...MEDIA_EXTS, 'pdf', ...MARKDOWN_EXTS,
])

/**
 * 一致性自检：`mime-map.json` 里声明的每个扩展名，nginx 实际是否真的认识。
 *
 * ## 判据为什么是「表里的键」而不是「所有扩展名」
 *
 * 不是所有扩展名都该进 mime-map.json。文本类（`.tsx .yaml .jsonl .py …`）走的是
 * `/api/preview` 的 **JSON 正文**，根本不经过直读分支，nginx 认不认识它们无关紧要。
 * 把它们要求进表里是**错的**，会把一堆正常状态报成故障。
 *
 * 真正会坏的是另一种：**表里声明了某类型该给 `text/markdown`，但 nginx 实际
 * 不认识这个扩展名**，于是发出去的是 `application/octet-stream`。表里的声明成了
 * 空话，用户看到"Markdown 不预览、直接下载"。这才是要抓的。
 *
 * ## 为什么不能只看 mime.types + 表
 *
 * 补充块是从同一份 JSON 生成的，所以「mime.types ∪ 表里的键」恒等于覆盖集合，
 * 那种判据恒真。要检出真实故障，必须核对**渲染进配置的那段文本** ——
 * 因为模板里的 `{{NGINX_TYPES_BLOCK}}` 被误删、或 `control.mjs` 没替换成功，
 * 都会让补充块消失，而 mime.types 与 JSON 都还好好躺着。
 *
 * @param nginxDir nginx 安装目录
 * @param renderedConfig 可选的「已渲染的 nginx 配置全文」。传了就按它核对；
 *   不传则退回按「mime.types ∪ 生成块」核对（能抓表被改坏，抓不到模板被改坏）。
 */
export function checkTypesConsistency(nginxDir: string, renderedConfig?: string): {
  ok: boolean
  /** 表里声明了、但 nginx 不认识（会退化成 octet-stream）的扩展名。 */
  degraded: string[]
  /** 表里缺文件时非空。 */
  error?: string
} {
  let extMime: Record<string, string>
  try {
    extMime = loadExtMime()
  } catch (e) {
    return { ok: false, degraded: [], error: e instanceof Error ? e.message : String(e) }
  }

  /* 情况一：有渲染后的配置 → 直接看它里面到底声明了哪些扩展名。
   * 这是唯一能抓到「模板被改坏」的判据。 */
  if (renderedConfig && renderedConfig.trim() !== '') {
    const declared = parseTypesFromConfig(renderedConfig)
    const degraded = Object.keys(extMime).filter((e) => !declared.has(e))
    return { ok: degraded.length === 0, degraded }
  }

  /* 情况二：没有渲染配置 → 按「mime.types ∪ 生成块」核对。
   *
   * ⚠ 这条分支**抓不到**「mime-map.json 里的项被删掉」：补充块由同一份 JSON
   * 生成，删了项两边一起少，集合仍一致。所以这里另外要求一组**必须存在**的
   * 类型（`MUST_HAVE_EXTS`）—— 它们缺失是用户立刻能感觉到的功能缺陷。 */
  const covered = readNginxMimeTypes(nginxDir)
  for (const ext of Object.keys(extMime)) covered.add(ext)
  const degraded = [
    ...Object.keys(extMime).filter((e) => !covered.has(e)),
    ...MUST_HAVE_EXTS.filter((e) => !covered.has(e)),
  ]
  return { ok: degraded.length === 0, degraded: [...new Set(degraded)] }
}

/**
 * 从一份已渲染的 nginx 配置里，解析出所有 `types{}` 块声明的扩展名。
 *
 * 只看 `types { ... }` 内部，忽略其它位置的文本 —— 否则 `default_type`、
 * 注释里出现的扩展名会造成误判。
 */
export function parseTypesFromConfig(configText: string): Set<string> {
  const out = new Set<string>()
  /* 逐行扫描：进 types{ 置位，遇到 } 复位。nginx 配置的 types 块不会嵌套。 */
  let inTypes = false
  for (const raw of configText.split('\n')) {
    const line = raw.trim()
    if (line === '' || line.startsWith('#')) continue
    if (!inTypes) {
      if (/^types\s*\{$/.test(line)) inTypes = true
      continue
    }
    if (line === '}') { inTypes = false; continue }
    const semi = line.lastIndexOf(';')
    if (semi < 0) continue
    const body = line.slice(0, semi)
    const sp = body.search(/\s/)
    if (sp < 0) continue
    for (const ext of body.slice(sp + 1).trim().split(/\s+/)) {
      if (ext !== '') out.add(ext.toLowerCase())
    }
  }
  return out
}
