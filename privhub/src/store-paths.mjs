/**
 * PrivHub 存储根解析 —— 三类根的唯一事实来源（GitHub issue #2 / REQ-1、REQ-3）
 *
 * 背景：过去「文件库在哪」只能靠手改 `src/main.ts` 的一行硬编码维持，升级/换
 * release 时会被覆盖，表现为「新端口启动后看不到老库」。这里把三类根拆开，
 * 统一按「环境变量 > 配置文件 > 默认」解析，且配置文件默认位于代码树之外
 * （蓝绿布局为 `<home>/config/store.json`，`git pull` / `build-release` 不会碰）。
 *
 * 三类根（互不强制耦合）：
 *   代码根   PRIVHUB_ROOT        插件 / 前端所在，随 release 变
 *   系统数据根 PRIVHUB_DATA_ROOT  其下 `data/` 存 users/sessions/audit/trash/secret.key
 *   文件库根 PRIVHUB_DATA_FILES  项目与个人空间（顶层文件夹 = 项目）
 *
 * 为什么本文件是 .mjs：`src/main.ts`（tsx）与 `scripts/verify-store.mjs`（纯 Node）
 * 都要用同一套解析规则。规则若写两份，迟早会在「体检说没问题、启动却用错根」上分叉。
 *
 * 模块被 import 时会把解析结果回写到 process.env —— 大量插件在模块加载期直接读
 * `process.env.PRIVHUB_DATA_ROOT`。因此 **main.ts 必须把本模块放在所有插件 import 之前**。
 */

import { existsSync, readFileSync, statSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'

/**
 * @typedef {Object} StorePaths
 * @property {string} codeRoot        代码根
 * @property {string} configDir       配置目录（代码树之外）
 * @property {string} configFile      存储配置文件路径
 * @property {boolean} configLoaded   是否实际读到了配置文件
 * @property {Record<string, unknown>} fileConfig 配置文件内容
 * @property {string} dataRoot        系统数据根（其下 data/ 为系统数据）
 * @property {string} dataFiles       文件库根
 * @property {boolean} dataFilesExplicit 文件库根是否由 env / 配置文件显式指定
 * @property {string} secretKey       密钥文件默认路径
 * @property {boolean} strict         严格模式：库为空/不可见时拒绝启动
 */

const env = (name) => (process.env[name] || '').trim()

const codeRoot = resolve(env('PRIVHUB_ROOT') || process.cwd())
const configDir = resolve(env('PRIVHUB_CONFIG_DIR') || join(codeRoot, 'config'))
const configFile = resolve(env('PRIVHUB_STORE_CONFIG') || join(configDir, 'store.json'))

/** 相对路径按「配置文件所在目录」解析；绝对路径原样使用。 */
function resolveValue(value) {
  return isAbsolute(value) ? resolve(value) : resolve(configDir, value)
}

let fileConfig = {}
let configLoaded = false
if (existsSync(configFile)) {
  try {
    // Windows 编辑器（记事本 / PowerShell 5.1）常把 UTF-8 写成带 BOM；BOM 不是坏配置。
    const text = readFileSync(configFile, 'utf8').replace(/^\uFEFF/, '')
    const parsed = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('顶层必须是 JSON 对象')
    }
    fileConfig = parsed
    configLoaded = true
  } catch (e) {
    // 配置坏了绝不能静默回落默认值：那会把服务指到一个空库，看起来「文件全没了」。
    throw new Error(
      '存储配置解析失败：' + configFile + ' —— ' + (e instanceof Error ? e.message : String(e)) + '。\n'
      + '为避免用错库根，拒绝启动。请修复该文件，或删除它改用环境变量。',
    )
  }
}

/**
 * 优先级：env > 配置文件 > 默认值。
 * @param {string} envName
 * @param {string} key
 * @param {string} fallback
 */
function pick(envName, key, fallback) {
  const fromEnv = env(envName)
  if (fromEnv) return resolveValue(fromEnv)
  const fromFile = fileConfig[key]
  if (typeof fromFile === 'string' && fromFile.trim()) return resolveValue(fromFile.trim())
  return fallback
}

const dataRoot = pick('PRIVHUB_DATA_ROOT', 'dataRoot', codeRoot)
const dataFilesExplicit = Boolean(
  env('PRIVHUB_DATA_FILES')
  || (typeof fileConfig.dataFiles === 'string' && fileConfig.dataFiles.trim()),
)
const dataFiles = pick('PRIVHUB_DATA_FILES', 'dataFiles', join(dataRoot, 'data-files'))
const secretKey = pick('PRIVHUB_SECRET_KEY_FILE', 'secretKey', join(dataRoot, 'data', 'secret.key'))
const strictFlag = env('PRIVHUB_STORE_STRICT').toLowerCase()
const strict = strictFlag === '1' || strictFlag === 'true' || strictFlag === 'yes' || fileConfig.strict === true

/**
 * 显式配置的库根必须存在且是目录 —— 这是「新端口看不到老库」的正面拦截点。
 * 以前路径写错只会得到一个空列表；现在启动即失败，并把「是不是少写了一层」直接点出来。
 * 确需首次初始化一个空目录时设置 PRIVHUB_ALLOW_INIT_DATA_FILES=1。
 */
if (dataFilesExplicit) {
  const stat = existsSync(dataFiles) ? statSync(dataFiles) : null
  const allowInit = ['1', 'true', 'yes'].includes(env('PRIVHUB_ALLOW_INIT_DATA_FILES').toLowerCase())
  if (!stat) {
    if (!allowInit) {
      const parentStyle = existsSync(join(dataFiles, 'data-files'))
        ? '\n提示：你配置的像是父目录，真正的库在其下 data-files/，请把配置改为 ' + join(dataFiles, 'data-files')
        : ''
      throw new Error(
        '已显式配置文件库根，但该目录不存在：' + dataFiles + '\n'
        + '拒绝启动 —— 若带着空库根启动，用户会看到一个「项目全没了」的假象。'
        + parentStyle + '\n'
        + '请检查 PRIVHUB_DATA_FILES / config/store.json 的 dataFiles；'
        + '确实要初始化一个新库时设置 PRIVHUB_ALLOW_INIT_DATA_FILES=1。',
      )
    }
  } else if (!stat.isDirectory()) {
    throw new Error('文件库根不是目录：' + dataFiles + '（请修正 PRIVHUB_DATA_FILES / config/store.json）')
  }
}

/* 让所有「模块加载期直接读 env」的插件得到同一答案。 */
process.env.PRIVHUB_ROOT = codeRoot
process.env.PRIVHUB_CONFIG_DIR = configDir
process.env.PRIVHUB_STORE_CONFIG = configFile
process.env.PRIVHUB_DATA_ROOT = dataRoot
process.env.PRIVHUB_DATA_FILES = dataFiles
process.env.PRIVHUB_SECRET_KEY_FILE = secretKey

/** @type {StorePaths} */
export const storePaths = {
  codeRoot,
  configDir,
  configFile,
  configLoaded,
  fileConfig,
  dataRoot,
  dataFiles,
  dataFilesExplicit,
  secretKey,
  strict,
}

/** 一行式启动日志，把三个根和配置来源一次说清（排查时不用再猜）。 */
export function describeStorePaths() {
  const lines = [
    '[store] 代码根   : ' + codeRoot,
    '[store] 系统数据 : ' + join(dataRoot, 'data') + '（其下 secret.key / users / audit）',
    '[store] 文件库   : ' + dataFiles + (dataFilesExplicit ? '（显式配置）' : '（默认）'),
    '[store] 配置文件 : ' + configFile + (configLoaded ? '' : '（不存在，使用环境变量/默认值）'),
    '[store] 严格模式 : ' + (strict ? '开（库不可见/为空将拒绝启动）' : '关（仅告警）'),
  ]
  return lines.join('\n')
}
