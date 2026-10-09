/**
 * PrivHub 事件契约 —— 全项目自定义事件的【单一来源】。
 *
 * 背景（为什么需要这个文件）：
 *   cordis 的事件总线是强类型的——`ctx.emit<K extends keyof Events>(name: K, ...)`，
 *   只有登记进 cordis `Events` 接口的事件名才允许 emit / on。本项目的 5 个自定义
 *   事件此前【从未登记】，于是类型检查一打开就是一片 `'"x" is not assignable to
 *   keyof Events'`。更根本的问题不是报错，而是：发事件方与听事件方【各写各的载荷形状】
 *   （例如 `file:saved` 的监听方手写 `{ project?: string; path?: string; doc?: string }`），
 *   没有任何地方能强制两边一致——这正是多轮评审指出的「契约各写各的、连错了不吭声」。
 *
 * 本文件通过 TypeScript 模块增强把 5 个事件登记进 cordis `Events`，并把载荷类型
 * 作为具名接口导出。此后：
 *   - emit 的实参、on 的回调形参，双方都按这里的唯一类型校验；
 *   - 改名/改形状只需改这一处，编译器会在所有调用点报出漂移。
 *
 * 与 `privhub-svc-events` 的关系：那是运行期的「声明登记簿」（declareEmit/declareListen，
 * 用于生成事件总表与自检）；本文件是编译期的类型契约。二者描述同一组事件，互为镜像。
 *
 * 注意：这里【不含】`'dispose'`。cordis 并不派发名为 `dispose` 的事件；卸载清理的
 * 正确写法是 `ctx.effect(() => 清理函数)`。此前全项目 5 处 `ctx.on('dispose', ...)`
 * 是历史误用（清理永远不会执行），已随本批一并改正。
 *
 * @module privhub-core/events
 */

/* 载荷类型取自各自权威定义，不复制字段——避免"再抄一份"的老毛病。
 * type-only 导入：编译期存在、运行期被擦除，不引入运行时依赖或环。 */
import type { AuditEntry } from '../../privhub-svc-audit/src/index'

/** 文件发生变化（增删改移）时广播。action 为 upload/delete/rename/mkdir/restore/saved/created 等。 */
export interface FileChangedPayload {
  project: string
  path: string
  action: string
  /** 重命名/移动后的新路径（仅 action 为 rename/move 类时给出）。 */
  newPath?: string
}

/** 文本类文件保存成功（供全文索引 / RAG 语料增量更新）。doc 为落盘后的文本内容。 */
export interface FileSavedPayload {
  project: string
  path: string
  doc: string
}

/** 文件/目录标签变更（供知识图谱等失效重算）。 */
export interface MetaChangedPayload {
  project: string
  path: string
  tags: string[]
}

/** 用户改名：个人空间目录随名迁移（退休旧名），监听方据此同步引用。 */
export interface PersonalRenamedPayload {
  username: string
  oldName: string
  newName: string
}

declare module '@deepseek-ai/cordis' {
  interface Events {
    /** 审计条目落盘后广播（S1 闭环：内存环形缓冲等实时消费方）。 */
    'audit:logged': (entry: AuditEntry) => void
    /** 文件发生变化。 */
    'file:changed': (payload: FileChangedPayload) => void
    /** 文本文件保存成功。 */
    'file:saved': (payload: FileSavedPayload) => void
    /** 标签变更。 */
    'meta:changed': (payload: MetaChangedPayload) => void
    /** 用户改名。 */
    'personal:renamed': (payload: PersonalRenamedPayload) => void
  }
}
