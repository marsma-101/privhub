/**
 * 附件引用检查回归（privhub-files-refcheck）
 *
 * 验收用户拍板的那条口径：**只报告 + 导出清单，绝不删除**。
 * 所以本套件刻意断言两件事：
 *   ① 两类问题能被正确分出来（孤儿附件 / 断链引用），且**不误报**——
 *      被引用到的文件不得出现在孤儿里，外链不得被当成断链；
 *   ② **权限不可见的文件不会以任何形式泄露**：既不进孤儿，也不作为断链目标
 *      （后者是本插件最容易写错的地方：目标被 ACL 挡住时若照报断链，等于把
 *      一个无权查看的文件名念给了用户）。
 *
 * 用独立项目 `_refcheck_reg`（文件名带随机后缀），结束后删卡、删项目、清回收站、
 * 删掉本套件加的 ACL 规则（规则必须在用例内清干净，否则会污染后续套件的可见性）。
 *
 * 端口纪律：只打 3190（run-all 默认目标），由 `run-all.mjs --spawn` 拉起隔离实例。
 *
 * @module tests/refcheck
 */

import {
  createSuite, ok, eq, includes, notIncludes,
  loginOk, uploadFile, purgeTrashOfProject, GET, POST, DEL,
} from './lib.mjs'

const PROJECT = '_refcheck_reg'
const RAND = Date.now().toString(36).slice(-6)

const NOTE = 'note_' + RAND + '.md'
const PIC = 'pic_' + RAND + '.png'
const PDF = 'sub/data_' + RAND + '.pdf'
const ORPHAN = 'sub/orphan_' + RAND + '.bin'
const HIDDEN = 'sub/hidden_' + RAND + '.bin'
const TOP_ORPHAN = 'top_orphan_' + RAND + '.zip'
const LONE = 'deep/nested/lone_' + RAND + '.txt'
const ANOTHER = 'another_' + RAND + '.md'

/** note.md 的行号是断言的一部分（断链要指回原文那一行），改动正文务必同步改期望值。 */
const NOTE_TEXT = [
  '# 说明',
  '',
  '见 [[' + PIC + ']] 与 [[' + PDF + ']]，还有 [[' + HIDDEN + ']]。',
  '',
  '外部链接不算引用：[站点](https://example.com/x)。',
  '',
  '一个指向空处的引用：[[' + '不存在' + RAND + '.xyz]]。',
  '',
].join('\n')

const ANOTHER_TEXT = ['# 乙', '', '[断链](missing/file_' + RAND + '.txt)', ''].join('\n')

const GHOST_PATH = 'ghost/ghost_' + RAND + '.pdf'
const CARD_TITLE = '引用检查回归卡_' + RAND

export function build() {
  const s = createSuite('附件引用检查（refcheck）')
  let admin = ''
  let cardId = ''
  const q = (extra) => '/privhub/api/refcheck?project=' + encodeURIComponent(PROJECT) + (extra || '')

  s.test('匿名访问被拒（401）', async () => {
    const r = await GET(q())
    eq(r.status, 401, '未登录应 401，实际 ' + r.status)
  })

  s.test('登录（admin）', async () => {
    admin = await loginOk('admin', 'admin123')
  })

  s.test('清理并新建测试项目 + 目录 + 文件', async () => {
    await POST('/privhub/api/project-delete', { token: admin, body: { name: PROJECT } }).catch(() => null)
    await purgeTrashOfProject(admin, PROJECT)
    const c = await POST('/privhub/api/project-create', { token: admin, body: { name: PROJECT } })
    ok(c.json && c.json.ok, '新建项目失败：' + c.text.slice(0, 120))
    for (const [path, name] of [['', 'sub'], ['', 'deep'], ['deep', 'nested']]) {
      const d = await POST('/privhub/api/mkdir', { token: admin, body: { project: PROJECT, path, name } })
      ok(d.json && d.json.ok, '建目录失败 ' + name + '：' + d.text.slice(0, 120))
    }
    const ups = [
      ['', NOTE, NOTE_TEXT], ['', PIC, 'PNGDATA'], ['sub', 'data_' + RAND + '.pdf', 'PDFDATA'],
      ['sub', 'orphan_' + RAND + '.bin', 'O'.repeat(200)], ['sub', 'hidden_' + RAND + '.bin', 'SECRETDATA'],
      ['', TOP_ORPHAN, 'Z'.repeat(300)], ['deep/nested', 'lone_' + RAND + '.txt', 'lonely'], ['', ANOTHER, ANOTHER_TEXT],
    ]
    for (const [path, name, content] of ups) {
      const r = await uploadFile(admin, PROJECT, path, name, content)
      ok(r.json && r.json.ok, '上传失败 ' + path + '/' + name + '：' + r.text.slice(0, 120))
    }
  })

  s.test('基线扫描：扫出文件规模与引用数', async () => {
    const r = await GET(q('&refresh=1'), { token: admin })
    ok(r.json && r.json.ok, '扫描失败：' + r.text.slice(0, 160))
    const rep = r.json.report
    eq(rep.scope, 'project', '单项目扫描 scope 应为 project')
    ok(rep.totals.files >= 8, '可见文件数应 ≥ 8，实际 ' + rep.totals.files)
    eq(rep.totals.docs, 2, '文档数应为 2（两篇 .md）')
    ok(rep.totals.refs >= 5, '解出的引用数应 ≥ 5，实际 ' + rep.totals.refs)
    eq(rep.totals.skippedLarge, 0, '没有超大文档')
  })

  s.test('孤儿附件：被引用到的文件不得出现在孤儿里', async () => {
    const rep = (await GET(q(), { token: admin })).json.report
    const paths = rep.orphans.map((o) => o.path)
    // 三个真孤儿：谁也没引用它们
    includes(paths, ORPHAN, 'sub 下的孤儿应被扫出')
    includes(paths, TOP_ORPHAN, '根目录孤儿应被扫出')
    includes(paths, LONE, '深层目录的孤儿应被扫出（证明是递归扫描）')
    // 被 [[双链]] / md 链接指到的文件不算孤儿
    notIncludes(paths, PIC, '被 [[双链]] 引用的图片不算孤儿')
    notIncludes(paths, PDF, '被 [[双链]] 引用的附件不算孤儿')
    notIncludes(paths, HIDDEN, '被 [[双链]] 引用的文件不算孤儿')
  })

  s.test('孤儿列表里不出现 Markdown 文档（笔记没人链接是正常的）', async () => {
    const rep = (await GET(q(), { token: admin })).json.report
    const paths = rep.orphans.map((o) => o.path)
    notIncludes(paths, NOTE, '文档不算孤儿')
    notIncludes(paths, ANOTHER, '文档不算孤儿')
  })

  s.test('断链引用：指回原文行号，且外链不算引用', async () => {
    const rep = (await GET(q(), { token: admin })).json.report
    const wiki = rep.dangling.find((d) => d.target === '不存在' + RAND + '.xyz')
    ok(wiki, '应报出 wiki 断链')
    eq(wiki.kind, 'wiki', '类型应为 wiki')
    eq(wiki.line, 7, '应指回 note.md 第 7 行')
    eq(wiki.source, NOTE, '来源应是 note.md')
    const md = rep.dangling.find((d) => d.target === 'missing/file_' + RAND + '.txt')
    ok(md, '应报出 md 链接断链')
    eq(md.kind, 'md', '类型应为 md')
    eq(md.line, 3, '应指回 another.md 第 3 行')
    notIncludes(rep.dangling.map((d) => d.target), 'https://example.com/x', '外链不得报成断链')
  })

  s.test('断链引用：解析得到的目标不在断链里', async () => {
    const rep = (await GET(q(), { token: admin })).json.report
    notIncludes(rep.dangling.map((d) => d.target), PIC, '能解析到的引用不是断链')
    notIncludes(rep.dangling.map((d) => d.target), PDF, '能解析到的引用不是断链')
  })

  s.test('任务卡 relatedFiles：指向空处应报成 task 类断链', async () => {
    const r = await POST('/privhub/api/taskboard/cards', {
      token: admin,
      body: {
        project: PROJECT, title: CARD_TITLE,
        relatedFiles: [{ project: PROJECT, path: PIC }, { project: PROJECT, path: GHOST_PATH }],
      },
    })
    ok(r.json && r.json.ok, '建卡失败：' + r.text.slice(0, 120))
    cardId = r.json.card.id
    const rep = (await GET(q('&refresh=1'), { token: admin })).json.report
    const task = rep.dangling.find((d) => d.kind === 'task')
    ok(task, '应报出任务卡断链')
    eq(task.target, GHOST_PATH, '目标应是卡上写的那个不存在的路径')
    includes(task.source, CARD_TITLE, '来源应带上卡标题')
    // 卡上引用的真实文件不应被当成孤儿，也不应报断链
    notIncludes(rep.orphans.map((o) => o.path), PIC, '被任务卡引用的文件不算孤儿')
    notIncludes(rep.dangling.map((d) => d.target), PIC, '被任务卡引用的真实文件不是断链')
  })

  s.test('结果缓存：重复扫描命中缓存，refresh=1 强制重扫', async () => {
    // 基线就地取一次，别依赖前面用例留下的时间戳（那些用例之间夹着 refresh=1 的重扫）
    const base = (await GET(q('&refresh=1'), { token: admin })).json.report
    const again = (await GET(q(), { token: admin })).json.report
    eq(again.scannedAt, base.scannedAt, '未加 refresh 时应命中缓存（scannedAt 相同）')
    const fresh = (await GET(q('&refresh=1'), { token: admin })).json.report
    ok(fresh.scannedAt >= base.scannedAt, 'refresh=1 应重新扫描')
  })

  s.test('鉴权：缺项目名 400；非成员 403', async () => {
    const bad = await GET('/privhub/api/refcheck', { token: admin })
    eq(bad.status, 400, '缺 project 应 400，实际 ' + bad.status)
    const user1 = await loginOk('user1', 'user123')
    const r = await GET(q(), { token: user1 })
    eq(r.status, 403, '非成员应 403，实际 ' + r.status)
  })

  s.test('文件级 ACL：不可见文件不进孤儿、也不作为断链目标泄露', async () => {
    const p = await POST('/privhub/api/acl/policy', {
      token: admin,
      body: { project: PROJECT, path: 'sub', target: 'dir', role: 'admin', mode: 'deny' },
    })
    ok(p.json && p.json.ok, '加 ACL 规则失败：' + p.text.slice(0, 120))
    const rep = (await GET(q('&refresh=1'), { token: admin })).json.report
    notIncludes(rep.orphans.map((o) => o.path), ORPHAN, '被拒绝可见的文件不得进孤儿候选')
    ok(rep.totals.hiddenFiles >= 1, '应报告有文件因权限被跳过，实际 ' + rep.totals.hiddenFiles)
    // 指向 sub 的两条引用（data.pdf / hidden.bin）解析不到，但也不能报成断链（会泄露文件名）
    const targets = rep.dangling.map((d) => d.target)
    notIncludes(targets, HIDDEN, '不可见文件的引用不得报成断链')
    notIncludes(targets, PDF, '不可见文件的引用不得报成断链')
    ok(rep.suppressed >= 2, '被抑制的断链应以数量回执，实际 ' + rep.suppressed)
  })

  s.test('ACL 恢复：删掉规则后孤儿重新出现', async () => {
    const rules = (await GET('/privhub/api/acl/rules', { token: admin })).json.rules || []
    for (const r of rules.filter((x) => x.project === PROJECT)) {
      await DEL('/privhub/api/acl/rules', { token: admin, body: { id: r.id } })
    }
    const rep = (await GET(q('&refresh=1'), { token: admin })).json.report
    includes(rep.orphans.map((o) => o.path), ORPHAN, '规则删除后孤儿应重新出现')
    eq(rep.suppressed, 0, '规则删除后不应再有被抑制的断链')
  })

  s.test('导出孤儿 CSV：BOM + 表头 + 全量清单', async () => {
    const r = await GET('/privhub/api/refcheck/export?project=' + encodeURIComponent(PROJECT) + '&kind=orphans', { token: admin })
    eq(r.status, 200, '导出应 200，实际 ' + r.status)
    includes(String(r.headers['content-type'] || ''), 'text/csv', '应是 CSV')
    eq(r.text.charCodeAt(0), 0xfeff, '应带 UTF-8 BOM（Excel 打开不乱码）')
    includes(r.text, '孤儿附件', '应含孤儿表头')
    includes(r.text, ORPHAN, '应含孤儿路径')
    includes(r.text, PROJECT, '应含项目名')
  })

  s.test('导出断链 CSV：含断链明细', async () => {
    const r = await GET('/privhub/api/refcheck/export?project=' + encodeURIComponent(PROJECT) + '&kind=dangling', { token: admin })
    eq(r.status, 200, '导出应 200，实际 ' + r.status)
    includes(r.text, '断链引用', '应含断链表头')
    includes(r.text, 'missing/file_' + RAND + '.txt', '应含断链目标')
  })

  s.test('导出鉴权：匿名 401，非成员 403', async () => {
    const anon = await GET('/privhub/api/refcheck/export?project=' + encodeURIComponent(PROJECT) + '&kind=orphans')
    eq(anon.status, 401, '匿名导出应 401，实际 ' + anon.status)
    const user1 = await loginOk('user1', 'user123')
    const r = await GET('/privhub/api/refcheck/export?project=' + encodeURIComponent(PROJECT) + '&kind=orphans', { token: user1 })
    eq(r.status, 403, '非成员导出应 403，实际 ' + r.status)
  })

  s.test('全部项目模式：all=1 汇总多个项目', async () => {
    const r = await GET('/privhub/api/refcheck?all=1', { token: admin })
    ok(r.json && r.json.ok, 'all=1 扫描失败：' + r.text.slice(0, 160))
    const rep = r.json.report
    eq(rep.scope, 'all', 'scope 应为 all')
    includes(rep.projects, PROJECT, '汇总里应包含测试项目')
    const mine = rep.orphans.filter((o) => o.project === PROJECT)
    includes(mine.map((o) => o.path), ORPHAN, '汇总里的孤儿应带项目名')
  })

  s.test('清理：删卡、删项目、清回收站、删规则', async () => {
    if (cardId) await DEL('/privhub/api/taskboard/cards?project=' + encodeURIComponent(PROJECT) + '&id=' + encodeURIComponent(cardId), { token: admin }).catch(() => null)
    const rules = (await GET('/privhub/api/acl/rules', { token: admin })).json.rules || []
    for (const r of rules.filter((x) => x.project === PROJECT)) {
      await DEL('/privhub/api/acl/rules', { token: admin, body: { id: r.id } })
    }
    await POST('/privhub/api/project-delete', { token: admin, body: { name: PROJECT } }).catch(() => null)
    await purgeTrashOfProject(admin, PROJECT)
    ok(true, '已清理')
  })

  return s
}
