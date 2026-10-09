/**
 * 模型回包解析与错误文案回归（svc-model）
 *
 * 为什么单独有这个文件：`/api/rag/ask` 的 catch 把 `ModelError.message` **原样**回给
 * 前端 toast，也就是说这段文案就是用户看到的一切。迁前的实现对上游回包的要求过严 ——
 * 只认 `choices[0].message.content`，抽不到就 `'chat 响应异常：' + JSON.stringify(body)`
 * 把整段 JSON dump 给用户。后果有两类，都很实际：
 *   ① 换一个兼容网关（给 `choices[0].text` / `output_text` / Gemini 形状）→ 问答整个不可用，
 *      而 PrivHub 这边其实什么都没做错；
 *   ② 上游零个字都不给（或只给推理内容）→ 用户看到一屏 JSON 或一个空气泡，无从下手。
 *
 * 断言原则：**指向行为，不指向实现** —— 断言「能抽出正文」「报错里有人话且不泄密钥」，
 * 不断言行号或函数内部结构。
 *
 * 自给自足：进程内挂真实 svc-model + 本机假上游，**不连真实模型、不碰 data/**。
 * 目录用 `data/model.json`，根目录由 `PRIVHUB_ROOT` 指向测试临时目录。
 *
 *   node --import tsx/esm tests/model-parsing.mjs
 *
 * @module tests/model-parsing
 */

import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { Context, Service } from '@deepseek-ai/cordis'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const TESTROOT = join(HERE, '.testroot-model')
const PORT = Number(process.env.PRIVHUB_MODELTEST_PORT || 3197)

let pass = 0
let fail = 0
const failures = []
function ok(cond, msg) {
  if (cond) { pass++ } else { fail++; failures.push(msg) }
  console.log((cond ? '  ✅ ' : '  ❌ ') + msg)
}

/* ================= 一、纯函数（不碰网络） ================= */

// 必须先设定根目录再 import —— svc-model 在模块加载时就把 CONFIG_FILE 定死了
rmSync(TESTROOT, { recursive: true, force: true })
mkdirSync(join(TESTROOT, 'data'), { recursive: true })
process.env.PRIVHUB_ROOT = TESTROOT

const mod = await import('../plugins/privhub-svc-model/src/index.ts')
const { sanitizeError, extractChatText, describeShape, upstreamMessage, endpointLabel, ModelService } = mod

console.log('\n── 1. 密钥脱敏（这段文字会直接出现在界面上）──')
const sk = sanitizeError('{"error":{"message":"invalid api key: sk-abcd1234efgh5678"}}')
ok(sk.includes('sk-abcd***'), '`sk-…` 打码（保留前 4 位便于对账，其余抹掉）')
ok(!/sk-abcd1234efgh5678/.test(sk), '完整密钥不再出现在文案里')
ok(!sanitizeError('Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig').includes('eyJhbGciOiJIUzI1NiJ9'),
  '`Bearer …` 打码')
ok(!sanitizeError('api_key=abcdefgh12345678').includes('abcdefgh12345678'), '`api_key=` 打码')
ok(sanitizeError('x'.repeat(500)).length <= 300, '超长原文被截断到 300 字以内')

console.log('\n── 2. 正文抽取：一套代码吃多种 OpenAI 兼容形状 ──')
const cases = [
  ['标准 choices[0].message.content', { choices: [{ message: { content: '标准正文' } }] }, '标准正文'],
  ['legacy completions choices[0].text', { choices: [{ text: '旧形状正文' }] }, '旧形状正文'],
  ['Responses 风格 output_text', { output_text: '新形状正文' }, '新形状正文'],
  ['output.text', { output: { text: '包在 output 里' } }, '包在 output 里'],
  ['顶层 response', { response: '顶层 response' }, '顶层 response'],
  ['Gemini 兼容层 parts[]', { candidates: [{ content: { parts: [{ text: '甲' }, { text: '乙' }] } }] }, '甲乙'],
  ['分段数组 content', { choices: [{ message: { content: [{ text: '分' }, { text: '段' }] } }] }, '分段'],
  ['content 是数字（脏数据）', { choices: [{ message: { content: 42 } }] }, ''],
]
for (const [name, body, want] of cases) {
  ok(extractChatText(body).text === want, `${name} → 抽出「${want || '（空，交给报错分支）'}」`)
}
ok(extractChatText({ choices: [{ message: { content: '', reasoning_content: '让我想想…' } }] }).reasoning === '让我想想…',
  '推理内容被单独取出（不当正文用，但要能被区分出来）')
ok(extractChatText(null).text === '' && extractChatText('不是对象').text === '',
  '非对象响应体不抛异常，回空串（抛异常会把解析失败伪装成致命错误）')

console.log('\n── 3. 报错文案：有人话、可定位、不 dump JSON ──')
const shape = describeShape({ foo: 1, bar: { baz: 'x' }, list: [1, 2] })
ok(shape.includes('foo') && shape.includes('bar{baz}') && shape.includes('list[2]'),
  `形状摘要把容器与长度写清楚（实测「${shape}」）`)
ok(describeShape(null) === '空响应体', '空响应体有专门说法')
const reason = upstreamMessage({ error: { message: 'model `qwen3` not found' } })
ok(reason === 'model `qwen3` not found', '优先取上游给出的结构化原因（这比「响应异常」有用得多）')
ok(upstreamMessage(null, 'Internal Server Error') === 'Internal Server Error',
  '拿不到结构化原因时回退原文（已脱敏、已截断）')

/* ================= 二、端到端：进程内真 svc-model + 本机假上游 ================= */

/**
 * 假上游：`mode` 决定下一个回包长什么样。
 * 刻意把「各家兼容网关的真实差异」做成可切换的档位，而不是只喂标准形状 —— 只喂标准
 * 形状的测试对上面那批 bug 是瞎的（改前改后都绿）。
 */
let mode = 'std'
const requested = []
const upstream = createServer((req, res) => {
  let raw = ''
  req.on('data', (c) => { raw += c })
  req.on('end', () => {
    requested.push({ url: req.url, auth: req.headers.authorization, body: raw })
    const json = (status, obj) => {
      res.writeHead(status, { 'content-type': 'application/json' })
      res.end(JSON.stringify(obj))
    }
    if (mode === 'err400') return json(400, { error: { message: 'model `no-such` not found, key sk-live-abcdefghij' } })
    if (mode === 'err429') return json(429, { error: { message: 'rate limit exceeded' } })
    if (mode === 'err500') return json(500, { error: { message: 'upstream boom' } })
    if (mode === 'legacy') return json(200, { choices: [{ text: '旧形状正文' }] })
    if (mode === 'responses') return json(200, { output_text: '新形状正文' })
    if (mode === 'gemini') return json(200, { candidates: [{ content: { parts: [{ text: '甲' }, { text: '乙' }] } }] })
    if (mode === 'reasoningOnly') return json(200, { choices: [{ message: { content: '', reasoning_content: '嗯…' } }] })
    if (mode === 'garbage') return json(200, { foo: 1, bar: { baz: 'x' } })
    if (mode === 'std') return json(200, { choices: [{ message: { content: '标准正文' } }] })
    // 流式档位
    const sse = (frames) => {
      res.writeHead(200, { 'content-type': 'text/event-stream' })
      res.end(frames.map((f) => 'data: ' + f + '\n\n').join(''))
    }
    if (mode === 'streamStd') {
      return sse([
        JSON.stringify({ choices: [{ delta: { content: '你' } }] }),
        JSON.stringify({ choices: [{ delta: { content: '好' } }] }),
        '[DONE]',
      ])
    }
    if (mode === 'streamDeltaText') {
      return sse([JSON.stringify({ choices: [{ delta: { text: '流式text' } }] }), '[DONE]'])
    }
    if (mode === 'streamReasoningOnly') {
      return sse([
        JSON.stringify({ choices: [{ delta: { reasoning_content: '想' } }] }),
        JSON.stringify({ choices: [{ delta: { reasoning_content: '想' } }] }),
        '[DONE]',
      ])
    }
    if (mode === 'streamNoTrailingNewline') {
      // 末帧没有收尾换行：不 flush 缓冲区就会静默丢掉最后一次增量
      res.writeHead(200, { 'content-type': 'text/event-stream' })
      return res.end('data: ' + JSON.stringify({ choices: [{ delta: { content: '尾帧' } }] }) + '\n\ndata: [DONE]')
    }
    if (mode === 'streamEmpty') {
      res.writeHead(200, { 'content-type': 'text/event-stream' })
      return res.end('data: [DONE]\n\n')
    }
    json(200, { choices: [{ message: { content: '默认' } }] })
  })
})
await new Promise((r) => upstream.listen(PORT, '127.0.0.1', r))

/* 真 svc-model：配置指向假上游，maxRetries=0 免得 429/500 档位等重试 */
writeFileSync(join(TESTROOT, 'data', 'model.json'), JSON.stringify({
  llm: { baseURL: `http://127.0.0.1:${PORT}`, model: 'test-model', timeoutMs: 5000 },
  embedding: { baseURL: `http://127.0.0.1:${PORT}`, model: 'test-embed', timeoutMs: 5000 },
  maxRetries: 0,
}))
/* svc-model 现在 inject ['storage']（`loadConfig` 经 `ctx.storage` 读 `data/model.json`）。
 * 本套件只需要「注入能被满足」，故给一个最小的 storage：真读文件即可，
 * 但不改变「挂的是生产本体、走的是生产装配声明（inject）」。 */
class StubStorage extends Service {
  constructor(c) { super(c, 'storage') }
  readText(f) { return Promise.resolve(readFileSync(f, 'utf8')) }
  writeText(f, d) { writeFileSync(f, d, 'utf8'); return Promise.resolve() }
}
const ctx = new Context()
new StubStorage(ctx)
await ctx.plugin({ name: mod.name, inject: mod.inject, apply: mod.apply })
const svc = ctx.model
ok(svc instanceof ModelService, '进程内挂载出真实的 ModelService（用的就是生产代码本体）')
await svc.loadConfig({ storage: { readText: async (f) => readFileSync(f, 'utf8') } })
ok(svc.getConfig()?.llm?.model === 'test-model', '配置装载成功（假上游地址已生效）')

/** 跑一次 chat，回 { text } 或 { err: { code, message } } */
async function ask(stream = false) {
  try {
    return { text: await svc.chat({}, [{ role: 'user', content: '你好' }], stream ? { stream: true } : {}) }
  } catch (e) {
    return { err: { code: e.code, message: e.message } }
  }
}

console.log('\n── 4. 端到端：能抽出正文就对，抽不出要给人话 ──')
for (const [m, want] of [['std', '标准正文'], ['legacy', '旧形状正文'], ['responses', '新形状正文'], ['gemini', '甲乙']]) {
  mode = m
  const r = await ask()
  ok(r.text === want, `上游给「${m}」形状 → 问答可用（实测「${r.text ?? JSON.stringify(r.err)}」）`)
}

mode = 'reasoningOnly'
const rOnly = await ask()
ok(!!rOnly.err, '上游只给推理内容 → **报错**，不是把思考过程当答案')
ok(/推理|思考/.test(rOnly.err?.message ?? ''), `报错说清了这是推理模型的问题（实测「${rOnly.err?.message}」）`)
ok(!/"content"/.test(rOnly.err?.message ?? ''), '报错里不含裸 JSON dump')

mode = 'garbage'
const rGarbage = await ask()
ok(!!rGarbage.err && /响应形状/.test(rGarbage.err.message),
  `非 chat/completions 形状 → 报错带上形状摘要便于定位（实测「${rGarbage.err?.message}」）`)
ok(!/\{.*"foo".*\}/.test(rGarbage.err?.message ?? ''), '不把整个响应体 dump 出去')

console.log('\n── 5. 上游非 2xx：分类正确 + 原因可读 + 不泄密钥 ──')
mode = 'err400'
const r400 = await ask()
ok(r400.err?.code === 'MODEL_BAD_RESPONSE', 'HTTP 400 → MODEL_BAD_RESPONSE')
ok(/no-such/.test(r400.err?.message ?? ''), `把上游原因原文带出来（实测「${r400.err?.message}」）`)
ok(!/sk-live-abcdefghij/.test(r400.err?.message ?? ''), '上游回显的密钥被打码（否则等于把密钥显示在界面上）')
mode = 'err429'
const r429 = await ask()
ok(r429.err?.code === 'MODEL_RATE_LIMIT', 'HTTP 429 → 独立的 MODEL_RATE_LIMIT（与「格式不对」分开，处置不同）')
ok(/限流/.test(r429.err?.message ?? ''), '限流文案给出可执行的下一步（稍后重试 / 降并发）')
mode = 'err500'
const r500 = await ask()
ok(!!r500.err && /boom/.test(r500.err.message), 'HTTP 500 → 带上游原因，便于区分是网关挂了还是配置错')
ok(requested.filter((x) => x.url === '/v1/chat/completions').length > 0,
  `（自证）假上游确实被请求到了 ${requested.length} 次 —— 否则上面全是假绿`)
ok(requested.every((x) => x.url !== '/v1/models'), '只有 chat 打过上游（本套件不测探活，别把它的请求算进来）')

console.log('\n── 5b. 连不上：必须说清连的是哪个地址 ──')
/* 裸的 `fetch failed` 对配置者毫无信息量：不知道是地址写错、服务没启、还是端口不通。
 * 这里把模型指向一个必然没人监听的端口，断言报错里带上地址。 */
await svc.loadConfig({ storage: { readText: async () => JSON.stringify({
  llm: { baseURL: 'http://127.0.0.1:9', model: 'dead', timeoutMs: 2000 },
  embedding: { baseURL: `http://127.0.0.1:${PORT}`, model: 'test-embed', timeoutMs: 5000 },
  maxRetries: 0,
}) } })
const rDead = await ask()
ok(rDead.err?.code === 'MODEL_UNREACHABLE', '连不上 → MODEL_UNREACHABLE（与「端点答了但格式不对」分开）')
ok(/127\.0\.0\.1:9/.test(rDead.err?.message ?? ''),
  `报错里带上了失败的端点地址（实测「${rDead.err?.message}」）`)
ok(/服务已启动|地址与端口/.test(rDead.err?.message ?? ''), '并给出可执行的下一步，而不是把网络栈错误原样抛给用户')
ok(!/\/\/[^/@]*@/.test(endpointLabel('http://user:secret@h:1/')), '端点地址里的 userinfo（可能含凭据）被剥掉')
/* 还原成可用配置，后面的流式档位照旧 */
await svc.loadConfig({ storage: { readText: async () => JSON.stringify({
  llm: { baseURL: `http://127.0.0.1:${PORT}`, model: 'test-model', timeoutMs: 5000 },
  embedding: { baseURL: `http://127.0.0.1:${PORT}`, model: 'test-embed', timeoutMs: 5000 },
  maxRetries: 0,
}) } })

console.log('\n── 6. 流式：空回答不许静默返回空串 ──')
mode = 'streamStd'
ok((await ask(true)).text === '你好', '标准 SSE 逐帧拼接正确')
mode = 'streamDeltaText'
ok((await ask(true)).text === '流式text', '`delta.text` 形状也能收（有的网关不叫 content）')
mode = 'streamNoTrailingNewline'
ok((await ask(true)).text === '尾帧', '末帧没有收尾换行也不丢（迁前会静默丢弃最后一个增量）')
mode = 'streamReasoningOnly'
const rStreamReason = await ask(true)
ok(!!rStreamReason.err && /推理|思考/.test(rStreamReason.err.message),
  '流式只吐思考内容 → 报错（迁前会返回空字符串，界面上是一个没有任何解释的空气泡）')
mode = 'streamEmpty'
const rStreamEmpty = await ask(true)
ok(!!rStreamEmpty.err, '流式一帧正文都没有 → 报错，而不是回空串')

/* 断言流式确实以 stream:true 发出（否则「流式测试」可能只是在测非流式） */
const streamed = requested.filter((x) => x.url === '/v1/chat/completions' && /"stream":true/.test(x.body))
ok(streamed.length >= 4, `（自证）确实以 stream:true 发过请求（实测 ${streamed.length} 次）`)

/* ================= 收尾 ================= */

upstream.close()
try { await ctx.stop?.() } catch { /* 忽略 */ }
rmSync(TESTROOT, { recursive: true, force: true })

console.log(`\n${'='.repeat(56)}`)
console.log(`  模型回包解析回归：${pass} 通过 / ${fail} 失败`)
for (const f of failures) console.log('   ❌ ' + f)
console.log('='.repeat(56))
process.exit(fail === 0 ? 0 : 1)
