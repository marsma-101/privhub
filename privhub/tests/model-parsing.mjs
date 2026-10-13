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
    /* 探活/模型清单：自检打的这条。回三个名字，供「模型名下拉候选」断言（§1.3）。 */
    if (/\/v1\/models$/.test(req.url ?? '')) {
      return json(200, { data: [{ id: 'test-model' }, { id: 'test-embed' }, { id: 'qwen3:8b' }] })
    }
    /* 向量接口与 chat 分开：深度自检（§1.4）打的是这条。
     * 回 8 维（而不是标准 768/1024）是为了让「维数是不是真读来的」一眼可断言。 */
    if (/\/v1\/embeddings$/.test(req.url ?? '')) {
      if (mode === 'embGarbage') return json(200, { choices: [{ message: { content: '这不是向量' } }] })
      return json(200, { data: [{ embedding: new Array(8).fill(0.25) }] })
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

/* 地址里夹带凭据的第二处：**查询串**（Gemini 一类网关把 api_key 放 query）。
 * W-B/§1.5 补：报错文案里必须看不见密钥，但要看得见主机端口 —— 否则报错失去定位价值。 */
const labQuery = endpointLabel('http://h:1/v1?api_key=' + 'sk-' + 'leakme1234567890')
ok(!labQuery.includes('leakme1234567890'), '端点地址查询串里的凭据不进报错（整段 query 抹掉）')
ok(labQuery.includes('h:1'), '但主机端口仍要看得见（报错要能定位到地址）')
/* 端到端复核：把「死端点 + query 里带 key」真的配上去、真的问一次。
 * 这条在改前必红 —— 那时 `where` 原样带着 query 进 MODEL_UNREACHABLE 文案。 */
await svc.loadConfig({ storage: { readText: async () => JSON.stringify({
  llm: { baseURL: 'http://127.0.0.1:9/v1?api_key=' + 'sk-' + 'leakme1234567890', model: 'dead', timeoutMs: 2000 },
  embedding: { baseURL: `http://127.0.0.1:${PORT}`, model: 'test-embed', timeoutMs: 5000 },
  maxRetries: 0,
}) } })
const rDeadKey = await ask()
ok(!/leakme1234567890/.test(rDeadKey.err?.message ?? ''), '（端到端）连不上时密钥不从报错文案漏出')
ok(/127\.0\.0\.1:9/.test(rDeadKey.err?.message ?? ''), '（端到端）仍带主机端口，便于定位')
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

console.log('\n── 7. 深度自检：embedding 回维数与耗时（W-B/§1.4）──')
/* 浅自检（默认）只探活。这条路径被首页工作台轮询，若默认就打向量接口，
 * 每次轮询都会花一次真实调用与额度 —— 所以「浅不打向量」本身就是要守住的行为。 */
const embCalls = () => requested.filter((x) => x.url === '/v1/embeddings').length
const before = embCalls()
const shallow = await svc.check(ctx, true)
ok(shallow.embedding?.status === 'ok', `浅自检 embedding 应为 ok（实测 ${shallow.embedding?.status}）`)
/* §1.3：自检顺手把 {base}/v1/models 读到的名字带回来 —— 界面就是靠这份清单做「模型名」下拉候选 */
ok(Array.isArray(shallow.llm?.models) && shallow.llm.models.includes('qwen3:8b'),
  `自检回带模型名清单（界面下拉候选的来源，实测 ${JSON.stringify(shallow.llm?.models)}）`)
ok(shallow.embedding?.dims === undefined, '浅自检**不打**向量接口、不回维数（首页轮询不烧调用）')
ok(embCalls() === before, '（自证）浅自检确实一次向量接口都没打')

const deep = await svc.check(ctx, true, true)
ok(deep.embedding?.status === 'ok', `深度自检 embedding 应为 ok（实测 ${deep.embedding?.status}）`)
ok(deep.embedding?.dims === 8, `深度自检回真实维数（上游给 8 维，实测 ${deep.embedding?.dims}）`)
ok(typeof deep.embedding?.latencyMs === 'number' && deep.embedding.latencyMs >= 0,
  `并回耗时（实测 ${deep.embedding?.latencyMs}ms）`)
ok(embCalls() > before, '（自证）深度自检确实打了向量接口 —— 否则上面两条是假绿')

/* 端点通、但该模型不是向量模型：必须与「连不上」分开报（处置方式完全不同） */
mode = 'embGarbage'
const badEmb = await svc.check(ctx, true, true)
ok(badEmb.embedding?.status === 'embed-error', `向量调用失败 → embed-error（实测 ${badEmb.embedding?.status}）`)
ok(/向量|embeddings|形状/.test(badEmb.embedding?.error ?? ''), '错误文案说清是「向量这条路」不通，而不是一句含混的失败')
ok(badEmb.llm?.status === 'ok', '此时 LLM 那条仍是 ok（两条通道各自独立判定）')
mode = 'std'

/* mock 端点也要能给出维数：没有真实模型的用户靠它走通全流程 */
await svc.loadConfig({ storage: { readText: async () => JSON.stringify({
  llm: { baseURL: 'mock', model: 'mock', timeoutMs: 5000 },
  embedding: { baseURL: 'mock', model: 'mock', timeoutMs: 5000 },
  maxRetries: 0,
}) } })
const mockDeep = await svc.check(ctx, true, true)
ok(mockDeep.embedding?.status === 'ok' && mockDeep.embedding?.dims > 0,
  `mock 端点深检也回维数（实测 ${mockDeep.embedding?.dims} 维）—— 没真模型也能验证全流程`)

/* ================= 八、多 Profile（Q1 §1.2）与生成参数（Q2） ================= */

console.log('\n── 8. 多 Profile 与生成参数 ──')

/* 参数清洗是纯函数：越界夹界限、空值/未知键丢弃 */
const sp = mod.sanitizeParams({ temperature: 5, topP: 0.3, maxTokens: 10.7, bogus: 1, seed: '' })
ok(sp.temperature === 2, '温度越界夹到上限 2（而不是报错让整个问答失败）')
ok(sp.topP === 0.3, 'top_p 合法值原样保留')
ok(sp.maxTokens === 11, 'max_tokens 取整')
ok(sp.bogus === undefined && sp.seed === undefined, '未知键与空值被丢弃')

/* 旧扁平结构被当单 profile 迁移（旧文件无需手工转换即可用） */
const norm = mod.normalizeConfig({ llm: { baseURL: 'http://x', model: 'm' }, embedding: { baseURL: 'http://y', model: 'e' }, maxRetries: 1 })
ok(norm.profiles.length === 1 && norm.activeId === 'default', '旧 {llm,embedding} 结构迁成单 profile（id=default）')
ok(norm.profiles[0]?.llm?.model === 'm' && norm.profiles[0]?.embedding?.model === 'e', '迁移后两端点内容都不丢')
ok(mod.normalizeConfig({ profiles: [{ id: 'a', name: 'A' }], activeId: 'zzz' }).activeId === 'a',
  'activeId 指向不存在的 profile 时回落第一个（不留悬空 activeId）')

/* 真 svc-model：多 profile 增删改切 + 参数确实进上游请求体（用假上游抓包，不看实现） */
await svc.loadConfig({ storage: { readText: async () => 'null' } })   // 合法的「未配置」态
const fp = {
  llm: { baseURL: `http://127.0.0.1:${PORT}`, model: 'test-model', timeoutMs: 5000 },
  embedding: { baseURL: `http://127.0.0.1:${PORT}`, model: 'test-embed', timeoutMs: 5000 },
}
const up1 = await svc.upsertProfile(ctx, { name: '甲', llm: fp.llm, embedding: fp.embedding, params: { temperature: 0.25 }, activate: true })
ok(up1.created === true && up1.activeId === up1.profiles[0].id, '新建第一套自动设为当前')
const up2 = await svc.upsertProfile(ctx, { name: '乙', llm: { ...fp.llm, model: 'test-model-2' }, embedding: fp.embedding })
ok(up2.profiles.length === 2 && up2.activeId === up2.profiles[0].id, '新建第二套不抢当前（未传 activate）')
ok(svc.getConfig()?.llm?.model === 'test-model', '摊平视图 getConfig().llm = 当前生效那套')
await svc.setActive(ctx, up2.profiles[1].id)
ok(svc.getConfig()?.llm?.model === 'test-model-2', '切换后摊平视图随之变')

mode = 'std'
requested.length = 0
await svc.chat({}, [{ role: 'user', content: '你好' }], { params: { temperature: 0.4, maxTokens: 128, topP: 0.8 } })
const sentBody = JSON.parse(requested[requested.length - 1].body)
ok(sentBody.temperature === 0.4 && sentBody.max_tokens === 128 && sentBody.top_p === 0.8,
  '参数被映射进上游请求体（temperature / max_tokens / top_p）')
ok(sentBody.model === 'test-model-2', '用的是当前生效 profile 的模型名')

/* profile 默认参数自动带上，且本次覆盖优先 */
await svc.setActive(ctx, up1.profiles[0].id)   // 甲：params.temperature=0.25
requested.length = 0
await svc.chat({}, [{ role: 'user', content: '带默认参' }])
ok(JSON.parse(requested[requested.length - 1].body).temperature === 0.25, 'profile 默认参数自动带上（无需每轮传）')
requested.length = 0
await svc.chat({}, [{ role: 'user', content: '覆盖' }], { params: { temperature: 1.5 } })
ok(JSON.parse(requested[requested.length - 1].body).temperature === 1.5, '本次覆盖优先于 profile 默认')

/* 删除当前那套 → activeId 顺位 */
const del = await svc.removeProfile(ctx, svc.activeProfileId())
ok(del.profiles.length === 1 && del.activeId === del.profiles[0].id, '删除当前 profile 后 activeId 顺位到剩下那套')

/* 未配置参数时不发任何参数字段（用上游默认） */
requested.length = 0
await svc.chat({}, [{ role: 'user', content: '无参' }])
const noParamBody = JSON.parse(requested[requested.length - 1].body)
ok(noParamBody.temperature === undefined && noParamBody.max_tokens === undefined, '未配置参数时不发送任何参数字段')

/* ================= 收尾 ================= */

upstream.close()
try { await ctx.stop?.() } catch { /* 忽略 */ }
rmSync(TESTROOT, { recursive: true, force: true })

console.log(`\n${'='.repeat(56)}`)
console.log(`  模型回包解析回归：${pass} 通过 / ${fail} 失败`)
for (const f of failures) console.log('   ❌ ' + f)
console.log('='.repeat(56))
process.exit(fail === 0 ? 0 : 1)
