/* nginx 直读链路（读写分离的核心）—— 行为级断言。
 *
 * 为什么必须有这一套：`runtime/mime-map.json` → nginx `types{}` 这条链路上，
 * 任何一环出问题都**不会**在直连开发模式里暴露 —— Node 自己给 Content-Type，
 * 一切正常。只有经过 nginx 的 X-Accel-Redirect 直读分支才会露馅：
 *   · nginx 自带 mime.types 里没有 `md` → 所有 Markdown 直读变成
 *     application/octet-stream，浏览器不预览、直接下载。
 * 这个缺陷真实发生过，而当时全量回归是绿的。
 *
 * 本套件因此不测「源码里有没有某张表」，而是真的拉起一个 nginx，
 * 走一遍 `X-Accel-Redirect → internal location → sendfile` 的完整路径，
 * 断言客户端拿到的字节、Content-Type、Range 与安全头。
 *
 * 环境约束（都是踩过的坑）：
 *   · 端口用 3899/3898，**绝不碰 3180/3181**（生产数据）与 3080（Harness 自身）。
 *   · 工作目录必须在仓库内 —— nginx 读不了 %TEMP%。
 *   · 启动前先确认端口空闲，否则旧进程占着端口会让新实例静默失败。
 *   · 未安装 nginx 时整套件 skip（不算失败），保证纯源码环境也能跑全量。
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import http from 'node:http'
import net from 'node:net'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')                 // privhub/
const WORK = join(ROOT, '_test_ngx_direct')   // 工作目录必须在仓库内
const NGINX_DIR = join(ROOT, 'runtime', 'nginx')
const NGINX_EXE = join(NGINX_DIR, 'nginx.exe')
const MIME_MAP = join(ROOT, 'runtime', 'mime-map.json')
const GENERATED_CONF = join(ROOT, 'config', 'nginx.conf')
const PORT = 3899
const UPSTREAM_PORT = 3898

const results = []
function ok(cond, title, extra = '') {
  results.push({ pass: !!cond, title })
  console.log((cond ? '  ✅ ' : '  ❌ ') + title + (extra ? '  [' + extra + ']' : ''))
}

function portFree(port) {
  return new Promise((done) => {
    const s = net.createServer()
    s.once('error', () => done(false))
    s.once('listening', () => s.close(() => done(true)))
    s.listen(port, '127.0.0.1')
  })
}

function get(path, headers = {}) {
  return new Promise((done) => {
    const q = http.request({ host: '127.0.0.1', port: PORT, path, method: 'GET', headers }, (res) => {
      const chunks = []
      res.on('data', (d) => chunks.push(d))
      res.on('end', () => {
        const buf = Buffer.concat(chunks)
        done({ status: res.statusCode, headers: res.headers, buffer: buf })
      })
    })
    q.on('error', (e) => done({ status: 0, headers: {}, buffer: Buffer.alloc(0), err: e.message }))
    q.end()
  })
}

/* ── 样本文件 ── */
const MD_BODY = Buffer.from('# 直读验证\n\n' + 'A'.repeat(4096) + '\n', 'utf8')
const BIN_BODY = Buffer.alloc(8192)
for (let i = 0; i < BIN_BODY.length; i++) BIN_BODY[i] = i & 0xff

/**
 * 极小的「Node 上游」替身：只做真实 `auth.ts` 里那件事 ——
 * 校验通过后回 204 + `X-Accel-Redirect: /__internal/.pool/<id><ext>`。
 *
 * 为什么不直接起真 Node：真实例要初始化数据目录、占更多端口，而本套件要验证的
 * 是 **nginx 侧**的行为（types{}、internal、Range、安全头）。上游只要正确回那个
 * 204 就够了。真实全链路（Node 真发 X-Accel-Redirect）由 production-smoke 覆盖。
 */
function startUpstream() {
  return new Promise((done) => {
    const known = { aaaa1111: '.md', bbbb2222: '.bin' }
    const srv = http.createServer((req, res) => {
      const fid = String(req.headers['x-fid'] || '')
      const ext = known[fid]
      if (!ext) { res.writeHead(404); res.end('not found'); return }
      res.writeHead(204, {
        'x-accel-redirect': '/__internal/.pool/' + fid + ext,
        'cache-control': 'no-store',
      })
      res.end()
    })
    srv.listen(UPSTREAM_PORT, '127.0.0.1', () => done(srv))
  })
}

/** 取程序生成的 types 块；没有生成物就先跑一次真实渲染（生产同一条路径）。 */
function typesBlockFromGeneratedConfig() {
  if (!existsSync(GENERATED_CONF)) {
    spawnSync(process.execPath, [join(ROOT, 'runtime', 'control.mjs'), 'render-config'], {
      cwd: ROOT, encoding: 'utf8', timeout: 120000,
    })
  }
  if (!existsSync(GENERATED_CONF)) return null
  const text = readFileSync(GENERATED_CONF, 'utf8')
  /* 生成的块形如：
   *     types {
   *         text/markdown    md markdown;
   *     }
   * 用「行首缩进 + types {」定位，避免匹配到 nginx 自带的 `types{}`。 */
  const m = /( *)types \{[\s\S]*?\n\1\}/.exec(text)
  return m ? m[0] : null
}

if (!existsSync(NGINX_EXE)) {
  console.log('  ⏭ 未安装 nginx（' + NGINX_EXE + '），跳过直读链路验证')
  process.exit(0)
}
if (!existsSync(MIME_MAP)) {
  console.log('  ❌ 缺少 MIME 映射表：' + MIME_MAP)
  process.exit(1)
}
if (!(await portFree(PORT)) || !(await portFree(UPSTREAM_PORT))) {
  console.log('  ❌ 端口 ' + PORT + '/' + UPSTREAM_PORT + ' 被占用（先清理再跑，避免测到旧实例）')
  process.exit(1)
}

/* ── 隔离工作目录 ── */
rmSync(WORK, { recursive: true, force: true })
for (const d of ['conf', 'logs', 'temp', 'files/.pool']) mkdirSync(join(WORK, d), { recursive: true })
writeFileSync(join(WORK, 'files/.pool', 'aaaa1111.md'), MD_BODY)
writeFileSync(join(WORK, 'files/.pool', 'bbbb2222.bin'), BIN_BODY)

const typesBlock = typesBlockFromGeneratedConfig()
if (!typesBlock) {
  console.log('  ❌ 生成的 nginx.conf 里找不到 types 块 —— MIME 生成器没生效')
  process.exit(1)
}

const p = (s) => join(WORK, s).replace(/\\/g, '/')
const ngxPath = (s) => join(NGINX_DIR, s).replace(/\\/g, '/')

const conf = `
worker_processes 1;
pid "${p('logs/nginx.pid')}";
error_log "${p('logs/error.log')}" warn;

events { worker_connections 128; }

http {
    include "${ngxPath('conf/mime.types')}";
    default_type application/octet-stream;
    access_log "${p('logs/access.log')}";

${typesBlock}

    client_body_temp_path "${p('temp/cb')}";
    proxy_temp_path "${p('temp/px')}";
    fastcgi_temp_path "${p('temp/fc')}";
    uwsgi_temp_path "${p('temp/uw')}";
    scgi_temp_path "${p('temp/sc')}";

    server {
        listen 127.0.0.1:${PORT};
        server_name _;

        location ~ ^/f/(?<fid>[A-Za-z0-9_-]+)(\\.[^/]*)?$ {
            proxy_pass http://127.0.0.1:${UPSTREAM_PORT};
            proxy_set_header X-Fid $fid;
            proxy_http_version 1.1;
            proxy_set_header Range $http_range;
            proxy_set_header If-Range $http_if_range;
            proxy_buffering off;
        }

        location /__internal/ {
            internal;
            alias "${p('files')}/";
            add_header Cache-Control "no-store" always;
            add_header X-Content-Type-Options "nosniff" always;
            add_header Referrer-Policy "no-referrer" always;
        }
    }
}
`
writeFileSync(join(WORK, 'conf', 'nginx.conf'), conf, 'utf8')

const base = ['-p', WORK.replace(/\\/g, '/') + '/', '-c', 'conf/nginx.conf']
const t = spawnSync(NGINX_EXE, [...base, '-t'], { encoding: 'utf8' })
if (t.status !== 0) {
  console.log('  ❌ nginx 配置自测失败:\n' + (t.stdout || '') + (t.stderr || ''))
  rmSync(WORK, { recursive: true, force: true })
  process.exit(1)
}

const upstream = await startUpstream()
spawn(NGINX_EXE, base, { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 1500))

try {
  /* ① internal 生效：外部直连内部落盘前缀必须 404。 */
  ok((await get('/__internal/.pool/aaaa1111.md')).status === 404,
    '外部直连内部落盘前缀返回 404（internal 生效）')

  /* ② 直读：字节与磁盘一致。这是"读写分离"的底线 —— nginx 发的是原文。 */
  const md = await get('/f/aaaa1111.md')
  ok(md.status === 200, '/f/<id>.md 直读成功', 'HTTP ' + md.status)
  ok(md.buffer.equals(MD_BODY), '直读字节与磁盘原文完全一致', md.buffer.length + '/' + MD_BODY.length)

  /* ③ MIME：本套件的核心。Markdown 必须内联预览而不是弹下载。 */
  const mdCt = String(md.headers['content-type'] || '')
  ok(mdCt.startsWith('text/markdown'),
    'Markdown 直读的 Content-Type 是 text/markdown（不弹下载）', mdCt)

  /* ④ 安全头：直读路径绕过了 Node，安全头只能由 nginx 的 internal location 给。 */
  ok(String(md.headers['x-content-type-options'] || '') === 'nosniff',
    '直读带 nosniff 安全头', String(md.headers['x-content-type-options']))
  ok(String(md.headers['referrer-policy'] || '') === 'no-referrer',
    '直读带 referrer-policy 安全头', String(md.headers['referrer-policy']))

  /* ⑤ 断点续传：用户明确要求"下载可以慢，但必须能续传"。 */
  ok(String(md.headers['accept-ranges'] || '') === 'bytes',
    '直读声明 accept-ranges: bytes', String(md.headers['accept-ranges']))
  const rg = await get('/f/aaaa1111.md', { Range: 'bytes=100-199' })
  ok(rg.status === 206, 'Range 返回 206', 'HTTP ' + rg.status)
  ok(rg.buffer.length === 100, 'Range 返回 100 字节', String(rg.buffer.length))
  ok(rg.buffer.equals(MD_BODY.subarray(100, 200)), 'Range 内容与原文对应区间一致')
  ok(String(rg.headers['content-range'] || '') === 'bytes 100-199/' + MD_BODY.length,
    'Content-Range 正确', String(rg.headers['content-range']))

  /* ⑥ 不认识的扩展名不许瞎猜：必须 octet-stream，字节仍完整。 */
  const bin = await get('/f/bbbb2222.bin')
  ok(bin.status === 200 && bin.buffer.equals(BIN_BODY), '未知扩展名字节仍完整')
  ok(String(bin.headers['content-type'] || '').startsWith('application/octet-stream'),
    '未知扩展名给 octet-stream', String(bin.headers['content-type']))

  /* ⑦ 不存在的 id 必须 404，不能漏成空响应。 */
  ok((await get('/f/deadbeef.md')).status === 404, '不存在的 id 返回 404')

  /* ⑧ nginx 自己没报错（配置写错时往往只在 error_log 里留一行）。 */
  const errLog = existsSync(join(WORK, 'logs', 'error.log'))
    ? readFileSync(join(WORK, 'logs', 'error.log'), 'utf8') : ''
  const bad = errLog.split('\n').filter((l) => /\[emerg\]|\[alert\]/.test(l))
  ok(bad.length === 0, 'nginx 错误日志里没有 emerg/alert', bad.slice(0, 2).join(' | ') || '干净')
} finally {
  spawnSync(NGINX_EXE, [...base, '-s', 'stop'], { encoding: 'utf8' })
  upstream.close()
}

const fail = results.filter((r) => !r.pass).length
console.log('\n  nginx 直读链路：' + (results.length - fail) + ' 通过 / ' + fail + ' 失败')
rmSync(WORK, { recursive: true, force: true })
process.exit(fail === 0 ? 0 : 1)
