/**
 * roles.mjs — 三层角色（system_admin / admin / user）隔离回归
 *
 * ## 为什么需要这一套
 * 角色是**唯一的安全边界**：写错一处，管理员就能看到系统设置、普通用户能改用户表。
 * 而这类错误不会让界面报错，只会「多出一个不该有的入口/接口」。
 *
 * 本套件对**纯函数**（svc-cap 的 levelFor / visibleFor）与**源码接线**做断言：
 *   · 权限分级是否按 minRole 真的生效；
 *   · 各插件是否还在写死 `role === 'admin'`（那会让管理员=系统管理员）；
 *   · 用户管理接口是否保留了「不能自我降权 / 不能删掉最后一个系统管理员」的防呆。
 *
 *   node tests/roles.mjs
 *
 * @module tests/roles
 */

let pass = 0, fail = 0
const failures = []
const ok = (cond, msg) => {
  if (cond) pass++
  else { fail++; failures.push(msg) }
  console.log((cond ? '  ✅ ' : '  ❌ ') + msg)
}

const { readFileSync } = await import('node:fs')
const { fileURLToPath } = await import('node:url')
const { dirname, join } = await import('node:path')
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/* svc-cap/core.ts 是纯 TS 但含类型注解，Node 的 strip-only 不能直接跑它；
 * 这里用 tsx 的注册钩子（测试脚本由 node tests/roles.mjs 启动，与其它套件同一口径）。 */
const CORE = await import(new URL('../plugins/privhub-svc-cap/src/core.ts', import.meta.url).href)
const { FEATURES, FEATURE_BY_ID, levelFor, visibleFor, defaultTable } = CORE

/* ══════════ 1. 角色类型与工具（core 源码契约） ══════════ */
console.log('\n── 角色类型 ──')
{
  /* core 里的判定工具是**纯函数**，但 core/index.ts 含 Service 类（参数属性语法），
   * strip-only 跑不了。这里改用源码断言 + 本地等价实现验证语义，
   * 真正的运行时行为由 HTTP 套件（security / cap / admin-console）覆盖。 */
  const coreSrc = readFileSync(join(ROOT, 'plugins', 'privhub-core', 'src', 'index.ts'), 'utf8')
  ok(/export const ROLE_RANK[^=]*=\s*\{[^}]*user:\s*0[^}]*admin:\s*1[^}]*system_admin:\s*2/.test(coreSrc),
    'ROLE_RANK 定义 user=0 < admin=1 < system_admin=2（统一强弱次序）')
  ok(/export function isRole/.test(coreSrc), 'core 导出 isRole')
  ok(/export function roleAtLeast/.test(coreSrc), 'core 导出 roleAtLeast')
  ok(/export function isManagerRole/.test(coreSrc), 'core 导出 isManagerRole')
  ok(/export const ROLE_LABEL[^=]*=\s*\{[\s\S]{0,160}system_admin:\s*'系统管理员'[\s\S]{0,120}admin:\s*'管理员'[\s\S]{0,80}user:\s*'用户'/.test(coreSrc),
    '三个角色中文名：系统管理员 / 管理员 / 用户')
  ok(/export type Role = 'system_admin' \| 'admin' \| 'user'/.test(coreSrc), 'Role 类型是三层')

  /* 语义等价实现：与 core 里那段逻辑同构，用来把「强弱次序」钉死 */
  const RANK = { user: 0, admin: 1, system_admin: 2 }
  const atLeast = (a, b) => (RANK[a] ?? -1) >= RANK[b]
  ok(atLeast('system_admin', 'admin') && atLeast('admin', 'user'), 'system_admin ≥ admin ≥ user')
  ok(!atLeast('admin', 'system_admin'), 'admin 不满足 system_admin')
  ok(!atLeast('user', 'admin'), 'user 不满足 admin')
  ok(!atLeast('root', 'user'), '未知角色不满足任何要求（最小权限）')
}

/* ══════════ 2. 每个功能都声明了 minRole ══════════ */
console.log('\n── 功能清单的角色归属 ──')
{
  const noRole = FEATURES.filter((f) => f.minRole !== undefined && !['user', 'admin', 'system_admin'].includes(f.minRole))
  ok(noRole.length === 0, `minRole 取值合法（非法 ${noRole.length} 个）`)

  /* 主人明确点名：系统本体归系统管理员，管理员碰不到 */
  const SYS_ONLY = ['admin.settings', 'admin.update', 'admin.storage', 'admin.audit',
    'admin.webhook', 'admin.rag', 'admin.agent.keys', 'admin.agent.trash', 'admin.office.ai']
  for (const id of SYS_ONLY) {
    const spec = FEATURE_BY_ID.get(id)
    ok(!!spec && spec.minRole === 'system_admin', `${id} 需要系统管理员（系统本体，管理员无权）`)
  }
  /* 主人点名：数据文件 + 用户权限归管理员 */
  const ADMIN_OK = ['admin.users', 'admin.project.create', 'admin.project.delete',
    'admin.invite', 'admin.acl', 'admin.template', 'admin.trash.clean', 'admin.console']
  for (const id of ADMIN_OK) {
    const spec = FEATURE_BY_ID.get(id)
    ok(!!spec && spec.minRole === 'admin', `${id} 管理员就够（业务与用户）`)
  }
}

/* ══════════ 3. 分级判定（这是整套东西的核心） ══════════ */
console.log('\n── levelFor：按角色分级 ──')
{
  const table = defaultTable()
  const su = { username: 'su', role: 'system_admin' }
  const ad = { username: 'ad', role: 'admin' }
  const us = { username: 'us', role: 'user' }

  /* ① 未登录 */
  ok(levelFor(null, 'admin.users', table) === 'none', '未登录 → 任何功能都 none')
  ok(levelFor(undefined, 'admin.users', table) === 'none', 'actor 为 undefined 同样 none')

  /* ② 未登记功能 */
  ok(levelFor(su, 'nope.not.registered', table) === 'none', '未登记功能对系统管理员也是 none（默认关闭）')

  /* ③ 系统管理员：全部功能 write */
  const suLevels = FEATURES.map((f) => levelFor(su, f.id, table))
  ok(suLevels.every((l) => l === 'write'), '系统管理员对全部已登记功能都是 write')

  /* ④ 管理员：系统本体 none，业务 write */
  ok(levelFor(ad, 'admin.settings', table) === 'none', '管理员拿不到「系统设置」（系统本体）')
  ok(levelFor(ad, 'admin.update', table) === 'none', '管理员拿不到「系统更新」')
  ok(levelFor(ad, 'admin.storage', table) === 'none', '管理员拿不到「存储维护」')
  ok(levelFor(ad, 'admin.audit', table) === 'none', '管理员拿不到「审计日志」')
  ok(levelFor(ad, 'admin.agent.keys', table) === 'none', '管理员拿不到「智能体密钥」')
  ok(levelFor(ad, 'admin.users', table) === 'write', '管理员能管用户')
  ok(levelFor(ad, 'admin.project.create', table) === 'write', '管理员能建项目')
  ok(levelFor(ad, 'admin.acl', table) === 'write', '管理员能管文件权限规则')
  ok(levelFor(ad, 'admin.template', table) === 'write', '管理员能管模板')
  ok(levelFor(ad, 'task.write', table) === 'write', '管理员能用协作功能')

  /* ⑤ 普通用户：受开关表管辖 */
  ok(levelFor(us, 'task.write', table) === table['task.write'], '普通用户按开关表取值（task.write）')
  ok(levelFor(us, 'admin.users', table) === 'none', '普通用户拿不到用户管理')
  ok(levelFor(us, 'admin.settings', table) === 'none', '普通用户拿不到系统设置')

  /* ⑥ 非法角色 = 最小权限 */
  ok(levelFor({ username: 'x', role: 'root' }, 'task.write', table) === 'none', '未知角色一律 none（不猜）')
  ok(levelFor({ username: 'x', role: '' }, 'task.write', table) === 'none', '空角色一律 none')

  /* ⑦ minRole 是「管理层内部的天花板」，不是对普通用户的墙：
   *    管理员把某项对普通用户开成 read/write，普通用户就该能用（既有 cap 契约）。 */
  const opened = { ...table, 'admin.audit': 'read', 'admin.webhook': 'read' }
  ok(levelFor(us, 'admin.audit', opened) === 'read', '普通用户对 admin.audit=read 生效（minRole 不挡普通用户）')
  ok(levelFor(us, 'admin.webhook', opened) === 'read', '普通用户对 admin.webhook=read 生效')
  ok(levelFor(ad, 'admin.settings', opened) === 'none', '管理员仍因 minRole 拿不到系统设置（表改不动角色闸）')
  ok(levelFor(ad, 'admin.settings', { ...table, 'admin.settings': 'write' }) === 'none',
    '即便表里给 admin.settings 写了 write，管理员依旧 none（角色闸优先于表）')
  ok(levelFor(su, 'admin.settings', table) === 'write', '系统管理员则恒有系统设置')

  /* ⑧ 非人类身份（管家车道伪账号）按普通用户档走开关表 —— 改坏过，钉死它 */
  const butler = { username: '__butler__', role: 'agent' }
  ok(levelFor(butler, 'agent.butler', table) === table['agent.butler'],
    '管家伪身份（role=agent）按开关表取值，不被判 none（否则整条车道 403）')
  ok(levelFor(butler, 'agent.butler.files', table) !== 'none', '管家内容整理默认可用')
  ok(levelFor({ username: 'x', role: 'root' }, 'task.write', table) === 'none',
    '真正的未知角色（root）仍是 none（只有登记过的非人类身份放行）')
}

/* ══════════ 4. visibleFor：界面入口可见性 ══════════ */
console.log('\n── visibleFor：入口可见性 ──')
{
  const table = defaultTable()
  const su = { username: 'su', role: 'system_admin' }
  const ad = { username: 'ad', role: 'admin' }
  const us = { username: 'us', role: 'user' }
  ok(visibleFor(su, 'admin.settings', table) === true, '系统管理员看得见系统设置')
  ok(visibleFor(ad, 'admin.settings', table) === false, '管理员看不见系统设置')
  ok(visibleFor(ad, 'admin.users', table) === true, '管理员看得见用户管理')
  ok(visibleFor(us, 'admin.users', table) === false, '普通用户看不见用户管理')
  ok(visibleFor(null, 'nav.search', table) === false, '未登录看不见搜索入口')
}

/* ══════════ 5. 源码接线：不许再写死 role === 'admin' ══════════ */
console.log('\n── 源码接线（防回退） ──')
{
  const { readdirSync, statSync } = await import('node:fs')
  const files = []
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.') || e.name.startsWith('_retired')) continue
      const p = join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (/\.(ts|js)$/.test(e.name)) files.push(p)
    }
  }
  walk(join(ROOT, 'plugins'))

  /* 服务端（src）不得再用 `role === 'admin'` 判权限 —— 那会把管理员当最高角色。
   * 允许的例外：明确要「正好是管理员」的语义极少，这里一律要求改用分级判定。 */
  const offenders = []
  for (const f of files) {
    if (!f.includes('src')) continue
    if (f.endsWith(join('privhub-svc-cap', 'core.ts'))) continue   // 分级定义本身
    const s = readFileSync(f, 'utf8')
    /* 去掉注释再判（注释里提到历史写法是正常的） */
    const code = s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    if (/role\s*[!=]==\s*'admin'/.test(code)) offenders.push(f.replace(ROOT + '\\', '').replace(ROOT + '/', ''))
  }
  ok(offenders.length === 0,
    `服务端不再写死 role === 'admin'（越界 ${offenders.length} 处${offenders.length ? '：' + offenders.slice(0, 5).join(', ') : ''}）`)

  /* 管理控制台与骨架必须用统一的三层工具 */
  const skel = readFileSync(join(ROOT, 'frontend', 'index.html'), 'utf8')
  ok(/PrivHub\.isManager\s*=/.test(skel), '骨架暴露 isManager（管理层判定单点）')
  ok(/PrivHub\.isSystemAdmin\s*=/.test(skel), '骨架暴露 isSystemAdmin（系统管理员判定单点）')
  ok(/PrivHub\.roleLabel\s*=/.test(skel), '骨架暴露 roleLabel（角色中文名单点）')
  ok(/ROLE_RANK/.test(skel), '骨架里角色强弱来自 ROLE_RANK（不是散落的字符串比较）')

  const adminSrc = readFileSync(join(ROOT, 'plugins', 'privhub-admin', 'src', 'index.ts'), 'utf8')
  ok(/isRole\(body\.role\)/.test(adminSrc), '用户管理接受三种角色（isRole 校验）')
  ok(/system_admin/.test(adminSrc), '用户管理认得 system_admin')
  ok(/不能修改自己的角色/.test(adminSrc), '防呆：不能修改自己的角色（否则立刻失去管理入口）')
  ok(/至少要保留一位系统管理员/.test(adminSrc), '防呆：不能降级最后一位系统管理员')
  ok(/只有系统管理员可以设置或修改/.test(adminSrc), '防呆：只有系统管理员能分配 system_admin（杜绝自我提权）')
}

/* ══════════ 6. 迁移：老库不会把系统锁死 ══════════ */
console.log('\n── 老数据迁移 ──')
{
  const coreSrc = readFileSync(join(ROOT, 'plugins', 'privhub-core', 'src', 'index.ts'), 'utf8')
  ok(/三层角色迁移/.test(coreSrc), 'core 有一次性角色迁移逻辑')
  ok(/const hasSys = .*some\(\(u\) => u\.role === 'system_admin'\)/.test(coreSrc),
    '迁移条件：库里没有任何 system_admin 才提升')
  ok(/if \(!hasSys\)/.test(coreSrc), '提升动作包在 !hasSys 分支里（已存在系统管理员则完全不动）')
  ok(/幂等|下次启动会再迁一次/.test(coreSrc), '迁移是幂等的（重启不会反复提权）')
  ok(/role: 'system_admin'/.test(coreSrc), '新库初始账号直接是 system_admin')

  /* 主人口径（2026-11-15）：**admin 默认就是系统管理员**。
   * 所以迁移必须优先认用户名 admin，而不是「碰巧排在最前的那个 admin」。 */
  ok(/users\.get\('admin'\)/.test(coreSrc), '迁移优先提升用户名为 admin 的账号（admin 默认即系统管理员）')
  ok(/find\(\(u\) => \(u\.role as string\) === 'admin'\)/.test(coreSrc),
    '没有 admin 账号时退而提升最早的管理员（保证系统始终有人管得住）')
  ok(/admin 默认即系统管理员/.test(coreSrc), '迁移日志写明该口径（便于运维核对）')
}

/* ══════════ 7. 其余管理员由系统管理员在管理界面设置 ══════════ */
console.log('\n── 谁来分配角色 ──')
{
  const adminSrc = readFileSync(join(ROOT, 'plugins', 'privhub-admin', 'src', 'index.ts'), 'utf8')
  const adminUi = readFileSync(join(ROOT, 'plugins', 'privhub-admin', 'client', 'index.js'), 'utf8')

  /* 服务端：分配 system_admin 只有系统管理员能做；admin/user 互转管理员即可 */
  ok(/只有系统管理员可以设置或修改/.test(adminSrc), '服务端：分配「系统管理员」仅系统管理员可做')
  ok(/actorIsSystem/.test(adminSrc) && /targetIsSystem/.test(adminSrc),
    '服务端同时校验「操作者够不够格」与「目标是不是系统管理员」')

  /* 界面：三种角色都可选，但 system_admin 选项只对系统管理员渲染 */
  ok(/<option value="user">/.test(adminUi), '界面提供「用户」选项')
  ok(/<option value="admin">/.test(adminUi), '界面提供「管理员」选项（系统管理员据此设置其他管理员）')
  ok(/v-if="canAssignSystem"[^>]*value="system_admin"/.test(adminUi),
    '界面「系统管理员」选项只对系统管理员渲染（不给越权入口）')
  ok(/canAssignSystem\(\)\s*\{[\s\S]{0,160}isSystemAdmin/.test(adminUi),
    'canAssignSystem 走 PrivHub.isSystemAdmin（单点判定）')
  ok(/只能动文件/.test(adminUi) && /管数据文件与用户权限/.test(adminUi) && /账号与系统本体/.test(adminUi),
    '三个选项各自写清了职责（避免管理员误以为自己和系统管理员同级）')
}

/* ══════════ 8. 环境事实由系统自动产出（主人 2026-11-16 原则） ══════════ */
console.log('\n── 环境事实：系统自报家底 ──')
{
  /* 原则：凡「环境事实」（有哪些存储卷/在哪/多大/在线否）必须由系统自动探测并展示，
   * 不能靠人工挂载或临时写死一条配置让界面看起来有数据。
   * 库根就是最典型的一条：它是系统从 env / store.json / 默认值解析出来的。 */
  const volSrc = readFileSync(join(ROOT, 'plugins', 'privhub-svc-volumes', 'src', 'index.ts'), 'utf8')
  ok(/ensureSystemVolume/.test(volSrc), '存储卷：启动时自动登记「库根卷」（不靠人工挂载）')
  ok(/SYSTEM_VOLUME_ID/.test(volSrc), '库根卷有稳定 id（重启幂等，不会重复添加）')
  ok(/ensureSystemVolume\(\)[\s\S]{0,200}repairDefaultVolume/.test(volSrc),
    '装载后还会自动修正「默认写入卷指向不存在的卷」')
  ok(/系统库根不可卸载/.test(volSrc), '库根卷不可卸载（那是本实例的数据所在地）')
  ok(/isSystemVolume/.test(volSrc), '有明确的「是否系统卷」判定（选卷/卸载都据此分流）')
  ok(/userVolumes\.length === 0/.test(volSrc),
    '只有系统卷时仍走「落库根」的老路径（补登记不改变既有写入行为）')

  const panelSrc = readFileSync(join(ROOT, 'plugins', 'privhub-admin-console', 'client', 'storage-panel.js'), 'utf8')
  ok(/v\.isSystemRoot/.test(panelSrc), '界面把系统卷标出来（主库（系统自动识别））')
  ok(/不可卸载/.test(panelSrc), '界面不给系统卷卸载按钮')
  ok(!/默认库根[\s\S]{0,300}def\.files/.test(panelSrc),
    '界面不再重复展示库根的容量/文件数（它已在卷列表里，避免两处各说一遍）')
}

console.log('\n========================================================')
console.log(`  三层角色回归：${pass} 通过 / ${fail} 失败`)
if (fail) { console.log('  失败项：'); for (const f of failures) console.log('    - ' + f) }
console.log('========================================================')
process.exit(fail ? 1 : 0)
