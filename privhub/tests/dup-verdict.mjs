/**
 * W-D 查重回归（2026-10-11）：§3.2-A2「同名同大小 ≠ 重复」、§3.2-A3「近似/版本族进查重页」、
 * §3.5「上限与总量如实回带」、§3.6「无权删除的文件提前标出」。
 *
 * 为什么必须单独有一套：改造前的查重只用「文件名 + 字节大小」当判据，两份同名同大小
 * 但内容完全不同的文件被摆成一对"重复"，用户照着删就删错了 —— 这是**删数据的错**，
 * 不能靠肉眼验。这里造三组文件（内容一致 / 同名同大小但内容不同 / 近似），
 * 断言接口给出的 verdict 分类正确、只读文件被标 canDelete=false、近似族带相似度。
 *
 * 端口纪律：只打 3190（run-all 默认目标），由 `run-all.mjs --spawn` 拉起隔离实例。
 *
 * @module tests/dup-verdict
 */

import { createSuite, ok, eq, loginOk, uploadFile, safeDelete, GET, POST, DEL } from './lib.mjs'

const PROJECT = process.env.PRIVHUB_TEST_PROJECT || '公共'
const PFX = '_wd_dup_'
const RAND = Date.now().toString(36).slice(-6)

/* ① 内容一致（应判 same）：同名同大小、正文一字不差 */
const S_DIR = PFX + 's_' + RAND
const S_NAME = 'same_' + RAND + '.txt'
const S_A = S_DIR + '/a/' + S_NAME
const S_B = S_DIR + '/b/' + S_NAME
const S_TEXT = '内容一致的样本 ' + RAND + '\n第二行也完全相同。\n'

/* ② 同名同大小但内容不同（应判 differ）：字节数刻意同为 8 */
const D_DIR = PFX + 'd_' + RAND
const D_NAME = 'ver_' + RAND + '.txt'
const D_A = D_DIR + '/a/' + D_NAME
const D_B = D_DIR + '/b/' + D_NAME
const D_TEXT_A = 'AAAAAAA\n'
const D_TEXT_B = 'BBBBBBB\n'

/* ③ 近似（应进 nearGroups）：40 行共享正文 + 各一行不同 ⇒ dupHash 不同但 MinHash 高度一致 */
const N_A = PFX + 'near_a_' + RAND + '.md'
const N_B = PFX + 'near_b_' + RAND + '.md'
const SHARED = Array.from({ length: 40 }, (_, i) => `第 ${i} 行：查重页近似族测试的共享正文 ${RAND}，包含足够多字符以便 MinHash 产生稳定指纹。`).join('\n')

/* ④ §3.6：给 S_B 打 read 档（放行 view、拒绝 delete）→ 它应仍在结果里但 canDelete=false */
const READ_TARGET = S_B

async function waitFor(fn, timeoutMs = 10000, stepMs = 400) {
  const deadline = Date.now() + timeoutMs
  let last = false
  while (Date.now() < deadline) {
    last = await fn()
    if (last) return true
    await new Promise((r) => setTimeout(r, stepMs))
  }
  return last
}

async function mkdirp(token, rel) {
  const parts = rel.split('/')
  let cur = ''
  for (const p of parts) {
    await POST('/privhub/api/mkdir', { token, body: { project: PROJECT, path: cur, name: p } })
    cur = cur ? cur + '/' + p : p
  }
}

async function dup(token) {
  const r = await GET('/privhub/api/rag/dup?' + new URLSearchParams({ project: PROJECT }), { token })
  ok(r.json && r.json.ok, '查重接口失败：' + r.text.slice(0, 160))
  return r.json
}

export function build() {
  const s = createSuite('查重判定（verdict / canDelete / 近似族）')
  let token = ''

  s.test('准备：上传三组样本', async () => {
    token = await loginOk('admin', 'admin123')
    await mkdirp(token, S_DIR + '/a')
    await mkdirp(token, S_DIR + '/b')
    await mkdirp(token, D_DIR + '/a')
    await mkdirp(token, D_DIR + '/b')
    for (const [sub, name, body] of [
      [S_DIR + '/a', S_NAME, S_TEXT], [S_DIR + '/b', S_NAME, S_TEXT],
      [D_DIR + '/a', D_NAME, D_TEXT_A], [D_DIR + '/b', D_NAME, D_TEXT_B],
      ['', N_A, '# 甲\n' + SHARED + '\n差异行：甲\n'], ['', N_B, '# 乙\n' + SHARED + '\n差异行：乙\n'],
    ]) {
      const r = await uploadFile(token, PROJECT, sub, name, body)
      ok(r.json && r.json.ok, `上传 ${sub}/${name} 失败：` + r.text.slice(0, 160))
    }
  })

  s.test('§3.2-A2：同名同大小但内容不同 → verdict=differ，不得混进"确认重复"', async () => {
    const res = await dup(token)
    const g = (res.fileGroups || []).find((x) => (x.files || []).some((f) => f.path === D_A))
    ok(!!g, '同名同大小的一组应被列出（列了才能解释为什么不是重复）')
    ok(g.files.some((f) => f.path === D_B), '同组应同时含 D_A 与 D_B')
    eq(g.verdict, 'differ', '内容已证明不同 ⇒ verdict 必须是 differ（旧实现会直接当成重复）')
    ok(g.files.every((f) => f.sameAs === null), 'differ 组内没有任何一份能说"与谁内容相同"（sameAs 全为 null）')
  })

  s.test('§3.2-A2：内容一致 → verdict=same，且每份带可比的指纹与同内容兄弟', async () => {
    const res = await dup(token)
    const g = (res.fileGroups || []).find((x) => (x.files || []).some((f) => f.path === S_A))
    ok(!!g, '内容一致的一组应被列出')
    eq(g.verdict, 'same', '内容一字不差 ⇒ verdict=same')
    const a = g.files.find((f) => f.path === S_A)
    const b = g.files.find((f) => f.path === S_B)
    ok(!!a.fingerprint && a.fingerprint === b.fingerprint, '两份内容一致 ⇒ 指纹相同且非空')
    eq(a.sameAs, S_B, 'sameAs 指向同内容的那一份')
    eq(b.sameAs, S_A, 'sameAs 双向成立')
  })

  s.test('§3.2-A3：近似文档进 nearGroups，带相似度与说明；不与已列文件重复', async () => {
    const got = await waitFor(async () => {
      const res = await dup(token)
      return (res.nearGroups || []).some((g) => (g.docs || []).some((d) => d.path === N_A) && (g.docs || []).some((d) => d.path === N_B))
    })
    ok(got, '高度相似（40 行共享 + 1 行不同）的两篇应出现在 nearGroups 里（等 10s 仍未摄取到则视为失败）')
    const res = await dup(token)
    ok(Array.isArray(res.nearGroups) && typeof res.nearGroupsTotal === 'number', '接口回带 nearGroups 与 nearGroupsTotal')
    ok(res.nearGroupsTotal >= res.nearGroups.length, 'nearGroupsTotal 不得小于实回组数（截断要能算出来）')
    ok(res.caps && res.caps.nearGroups > 0, '接口回带上限值（§3.5，界面据此说明"只显示了前 N 组"）')
    const g = res.nearGroups.find((x) => (x.docs || []).some((d) => d.path === N_A))
    ok(g && typeof g.score === 'number' && g.score > 0 && g.score <= 1, `近似组带 0~1 的相似度（实测 ${g && g.score}）`)
    ok(typeof g.reason === 'string' && g.reason.length > 0, '近似组带中文说明（界面直接展示）')
    // 已在前两层列过的文件不应重复出现在近似族里
    const exactPaths = new Set([
      ...(res.fileGroups || []).filter((x) => x.verdict === 'same').flatMap((x) => (x.files || []).map((f) => f.path)),
      ...(res.contentGroups || []).flatMap((x) => (x.files || []).map((f) => f.path)),
    ])
    ok((g.docs || []).every((d) => !exactPaths.has(d.path)), '近似族里不再重复列出已判定为精确重复的文件')
  })

  s.test('§3.6：只读（无删除权限）的文件被标 canDelete=false，且仍在结果里可见', async () => {
    const r = await POST('/privhub/api/acl/policy', { token, body: { project: PROJECT, path: READ_TARGET, target: 'file', role: '', mode: 'read' } })
    ok(r.json && r.json.ok, '设置 read 档失败：' + r.text.slice(0, 160))
    const res = await dup(token)
    const all = [
      ...(res.fileGroups || []).flatMap((g) => g.files || []),
      ...(res.contentGroups || []).flatMap((g) => g.files || []),
      ...(res.nearGroups || []).flatMap((g) => g.docs || []),
    ]
    const sb = all.find((f) => f.path === READ_TARGET)
    ok(!!sb, '被打 read 档的文件仍应可见（view 放行 ⇒ 不该消失）')
    eq(sb.canDelete, false, '无权删除 ⇒ canDelete=false（界面据此事先置灰并说明，而不是点了才被拒）')
    const sa = all.find((f) => f.path === S_A)
    ok(sa && sa.canDelete === true, '未被限制的对照文件 canDelete=true（证明不是"整片置灰"）')
  })

  s.test('清理：撤规则、删样本与目录', async () => {
    // 先撤规则：read 档拒 delete，不撤则 S_B 的父目录删不掉
    const rules = await GET('/privhub/api/acl/rules', { token })
    for (const rule of (rules.json && rules.json.rules) || []) {
      if (rule.project === PROJECT && rule.path === READ_TARGET) {
        await DEL('/privhub/api/acl/rules', { token, body: { id: rule.id } })
      }
    }
    for (const p of [S_A, S_B, D_A, D_B, N_A, N_B,
      S_DIR + '/a', S_DIR + '/b', S_DIR, D_DIR + '/a', D_DIR + '/b', D_DIR]) {
      await safeDelete(token, PROJECT, p)
    }
  })

  return s
}

export default build
