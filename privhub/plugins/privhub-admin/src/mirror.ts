/**
 * 库内目录镜像（visible mirror）—— 让文件在盘上按**原名原目录**可见。
 *
 * ## 为什么需要它（2026-11-17 主人实测反馈）
 *
 * 「你移动过来的文件为什么把文件名都给我改了？弄得我都找不到目标文件了」
 *
 * 扁平池（v6 架构）为了安全与改名无关性，把字节平铺成 `.pool/<内部ID>.<ext>`，
 * 原名只存在数据库里。这个设计在**程序内部**是对的（路径穿越面收窄、改名不换链接），
 * 但对**人**不友好：管理员打开盘符只看到一堆 `0183c7e2….md`，根本认不出是什么。
 *
 * 本模块补一层**只读的可见镜像**：
 *
 *   <卷根>/.pool/0183c7e2….md        ← 权威字节（索引指向它，程序读写这里）
 *   <卷根>/文件库/项目名/子目录/报告.md  ← 硬链接（同盘不占额外空间，人可直接打开）
 *
 * ## 三条硬约束（改之前先读）
 *
 * 1. **快照是"链接"，不是"副本"。** 用硬链接（同卷）或软链接（跨卷回退），
 *    绝不复制字节 —— 否则同一份文件在盘上占两份空间，且两边会不同步。
 * 2. **镜像只读。** 程序永远只认 `.pool` 里的字节 + 索引；镜像只是给人看的。
 *    因此镜像可以随时删掉重建（`rebuild` 就是"清空重建"）。
 * 3. **失败不阻断搬迁。** 建链接失败（权限/跨盘/文件被占用）只记 warn，
 *    搬迁本身照常成功 —— 镜像属于"更好用"，不是"必须成立"。
 *
 * @module privhub-admin/mirror
 */

import { join, dirname, basename } from 'node:path'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { link, unlink, symlink } from 'node:fs/promises'

const msgOf = (e: unknown): string => (e instanceof Error ? e.message : String(e))

/** 镜像根目录名（在卷根下，与 `.pool` 并列，以 `.` 开头标明非用户数据）。 */
export const MIRROR_DIRNAME = '.library-view'

/** 一条需要建立镜像的文件。 */
export interface MirrorItem {
  /** 项目名（顶层目录） */
  project: string
  /** 项目内的相对路径（含文件名，正斜杠） */
  virtualPath: string
  /** 权威字节的绝对路径（.pool 里的那个） */
  physicalPath: string
}

export interface MirrorResult {
  linked: number
  skipped: number
  failed: Array<{ path: string; error: string }>
}

/**
 * 把一条索引条目在镜像区建成「原名可见」的链接。
 *
 * 策略：先试硬链接（同卷，零额外空间、不随源删除而消失的风险最低），
 * 失败则退软链接（跨卷可用，但源被删会断）。都失败就记 failed。
 *
 * @param mirrorRoot 镜像根（`<卷根>/.library-view`）
 */
export async function linkIntoMirror(mirrorRoot: string, item: MirrorItem): Promise<{ ok: boolean; error?: string }> {
  if (!existsSync(item.physicalPath)) return { ok: false, error: '源字节不存在' }
  /* 目标路径做最小净化：去掉路径分隔符以外的危险片段。
   * 注意这里**不是**安全边界（物理层仍是 .pool + ID），只是别让镜像名里
   * 出现 `..` 之类把文件写到镜像根外面去。 */
  const safeParts = String(item.virtualPath)
    .split('/')
    .filter((s) => s !== '' && s !== '.' && s !== '..')
    .map((s) => basename(s))
  const safeProject = basename(String(item.project || 'unknown'))
  if (safeParts.length === 0) return { ok: false, error: '虚拟路径为空' }

  const dest = join(mirrorRoot, safeProject, ...safeParts)
  try {
    mkdirSync(dirname(dest), { recursive: true })
    /* 已存在则先删（重建/改名都要覆盖）——rmSync unlink 语义，不跟随链接本体。 */
    if (existsSync(dest)) { try { rmSync(dest, { force: true }) } catch { /* 忽略 */ } }
    try {
      await link(item.physicalPath, dest)
    } catch {
      /* 跨卷 / 不支持硬链接 → 软链接回退。软链接在 Windows 上可能需要权限，
       * 所以失败了就直接报错，由调用方记 warn。 */
      try { await symlink(item.physicalPath, dest) } catch (e2) {
        return { ok: false, error: '链接失败：' + msgOf(e2) }
      }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: msgOf(e) }
  }
}

/** 清空并重建镜像区（`rebuild` 用；调用方随后逐条 linkIntoMirror）。 */
export async function resetMirror(mirrorRoot: string): Promise<void> {
  try {
    if (existsSync(mirrorRoot)) rmSync(mirrorRoot, { recursive: true, force: true })
  } catch (e) {
    console.warn('[mirror] 清理旧镜像失败（继续重建）：' + msgOf(e))
  }
  try { mkdirSync(mirrorRoot, { recursive: true }) } catch (e) {
    console.warn('[mirror] 创建镜像根失败：' + msgOf(e))
  }
}

/** 删掉镜像里某个已不存在的条目（改名/删除后清理；失败静默）。 */
export async function unlinkFromMirror(mirrorRoot: string, project: string, virtualPath: string): Promise<void> {
  const safeParts = String(virtualPath).split('/').filter((s) => s && s !== '.' && s !== '..').map((s) => basename(s))
  const safeProject = basename(String(project || 'unknown'))
  if (safeParts.length === 0) return
  const dest = join(mirrorRoot, safeProject, ...safeParts)
  try { await unlink(dest) } catch { /* 不在就不在 */ }
}
