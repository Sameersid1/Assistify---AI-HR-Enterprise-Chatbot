/**
 * Verifies the provider layer against fabricated wire traffic.
 *
 * The Groq adapter's hard part is reassembly: arguments arrive as partial JSON
 * split across frames and keyed by index, and there is no way to eyeball that.
 * These feed it the shapes the real API produces and check what comes out.
 */
process.env.GROQ_API_KEY ||= 'test-key'
process.env.GEMINI_API_KEY ||= 'test-key'
process.env.MONGO_URI ||= 'mongodb://localhost:27017/test'
process.env.JWT_ACCESS_SECRET ||= 'x'.repeat(32)
process.env.JWT_REFRESH_SECRET ||= 'y'.repeat(32)

const { groqProvider } = await import('../src/modules/chat/llm.groq.ts')

let failures = 0
const check = (name, actual, expected) => {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  const ok = a === e
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
  if (!ok) console.log(`      expected ${e}\n      actual   ${a}`)
}

/** Turn frames into the ReadableStream shape fetch would hand back. */
function sseResponse(frames, { status = 200 } = {}) {
  const body = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder()
      // Deliberately split mid-frame to prove buffering across reads works.
      const whole = frames.map((f) => `data: ${JSON.stringify(f)}\n\n`).join('') + 'data: [DONE]\n\n'
      for (let i = 0; i < whole.length; i += 7) {
        controller.enqueue(enc.encode(whole.slice(i, i + 7)))
      }
      controller.close()
    },
  })
  return new Response(body, { status, headers: { 'Content-Type': 'text/event-stream' } })
}

const delta = (d) => ({ choices: [{ delta: d }] })

async function collect(frames, opts) {
  globalThis.fetch = async () => sseResponse(frames, opts)
  const out = []
  for await (const chunk of groqProvider.stream({ system: 's', messages: [], tools: [] })) {
    out.push(chunk)
  }
  return out
}

/* 1 — plain text streams through in order, split across reads. */
{
  const out = await collect([
    delta({ content: 'You have ' }),
    delta({ content: '3 casual ' }),
    delta({ content: 'days left.' }),
  ])
  check('text deltas arrive in order', out.map((c) => c.text).join(''), 'You have 3 casual days left.')
}

/* 2 — one tool call whose arguments are split across five frames. */
{
  const out = await collect([
    delta({ tool_calls: [{ index: 0, id: 'call_a', function: { name: 'list_my_leave_requests' } }] }),
    delta({ tool_calls: [{ index: 0, function: { arguments: '{"sta' } }] }),
    delta({ tool_calls: [{ index: 0, function: { arguments: 'tus":"PEN' } }] }),
    delta({ tool_calls: [{ index: 0, function: { arguments: 'DING"' } }] }),
    delta({ tool_calls: [{ index: 0, function: { arguments: '}' } }] }),
  ])
  const calls = out.flatMap((c) => c.toolCalls ?? [])
  check('fragmented arguments reassemble', calls, [
    { id: 'call_a', name: 'list_my_leave_requests', args: { status: 'PENDING' } },
  ])
}

/* 3 — two parallel calls interleaved, kept apart by index. */
{
  const out = await collect([
    delta({ tool_calls: [{ index: 0, id: 'c0', function: { name: 'get_my_leave_balance' } }] }),
    delta({ tool_calls: [{ index: 1, id: 'c1', function: { name: 'list_my_leave_requests' } }] }),
    delta({ tool_calls: [{ index: 1, function: { arguments: '{"type":' } }] }),
    delta({ tool_calls: [{ index: 0, function: { arguments: '{}' } }] }),
    delta({ tool_calls: [{ index: 1, function: { arguments: '"sick"}' } }] }),
  ])
  check('interleaved parallel calls stay separate', out.flatMap((c) => c.toolCalls ?? []), [
    { id: 'c0', name: 'get_my_leave_balance', args: {} },
    { id: 'c1', name: 'list_my_leave_requests', args: { type: 'sick' } },
  ])
}

/* 4 — a no-argument tool sends no arguments at all. */
{
  const out = await collect([
    delta({ tool_calls: [{ index: 0, id: 'c', function: { name: 'get_my_leave_balance' } }] }),
  ])
  check('no-argument tool yields empty args', out.flatMap((c) => c.toolCalls ?? []), [
    { id: 'c', name: 'get_my_leave_balance', args: {} },
  ])
}

/* 5 — malformed argument JSON must not kill the message. The tool's own Zod
       schema is what should reject it, with a message the model can act on. */
{
  const out = await collect([
    delta({ tool_calls: [{ index: 0, id: 'c', function: { name: 'apply_for_leave', arguments: '{"broken' } }] }),
  ])
  check('malformed arguments degrade to empty', out.flatMap((c) => c.toolCalls ?? []), [
    { id: 'c', name: 'apply_for_leave', args: {} },
  ])
}

/* 6 — a rate limit is reported as retryable, so failover can act on it. */
{
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: { message: 'Rate limit reached' } }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  try {
    for await (const _ of groqProvider.stream({ system: 's', messages: [], tools: [] })) { /* drain */ }
    check('429 throws', 'no throw', 'throw')
  } catch (err) {
    check('429 is retryable', { retryable: err.retryable, status: err.status, msg: err.message },
      { retryable: true, status: 429, msg: 'Rate limit reached' })
  }
}

/* 7 — a bad request is NOT retryable: every provider rejects it identically,
       so failing over would only spend a round trip to reach the same error. */
{
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: { message: 'invalid tool schema' } }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  try {
    for await (const _ of groqProvider.stream({ system: 's', messages: [], tools: [] })) { /* drain */ }
    check('400 throws', 'no throw', 'throw')
  } catch (err) {
    check('400 is not retryable', err.retryable, false)
  }
}


/* ── failover ─────────────────────────────────────────────────────────── */

const { streamWithFallback, LlmError } = await import('../src/modules/chat/llm.ts')

/** A stub provider that yields the given chunks, or throws partway through. */
const stub = (name, { chunks = [], throwAfter = null, error = null } = {}) => ({
  name,
  isConfigured: () => true,
  async *stream() {
    for (let i = 0; i < chunks.length; i += 1) {
      if (throwAfter !== null && i === throwAfter) throw error
      yield chunks[i]
    }
    if (throwAfter === 0 || (throwAfter !== null && throwAfter >= chunks.length)) throw error
    if (error && throwAfter === null) throw error
  },
})

const drain = async (providers) => {
  const out = []
  for await (const c of streamWithFallback({ system: 's', messages: [], tools: [] }, providers)) {
    out.push(c)
  }
  return out
}

/* 8 — a rate-limited primary hands over to the secondary. */
{
  const primary = stub('groq', { error: new LlmError('groq', 429, true, 'rate limited') })
  const secondary = stub('gemini', { chunks: [{ text: 'Answer from the fallback.' }] })
  const out = await drain([primary, secondary])
  check('429 on primary falls over to secondary',
    { text: out.map((c) => c.text).join(''), provider: out[0]?.provider },
    { text: 'Answer from the fallback.', provider: 'gemini' })
}

/* 9 — the safety rule: once text has reached the browser, a later failure must
       NOT restart on another provider and splice two answers together. */
{
  const primary = stub('groq', {
    chunks: [{ text: 'You have 3 ' }, { text: 'days' }],
    throwAfter: 1,
    error: new LlmError('groq', 500, true, 'died mid-answer'),
  })
  const secondary = stub('gemini', { chunks: [{ text: 'COMPLETELY DIFFERENT ANSWER' }] })
  let text = ''
  let threw = null
  try {
    for await (const c of streamWithFallback({ system: 's', messages: [], tools: [] }, [primary, secondary])) {
      text += c.text ?? ''
    }
  } catch (err) { threw = err.message }
  check('no failover once text is on screen', { text, threw },
    { text: 'You have 3 ', threw: 'died mid-answer' })
}

/* 10 — a non-retryable error stops immediately; the secondary is never asked. */
{
  let secondaryCalled = false
  const primary = stub('groq', { error: new LlmError('groq', 400, false, 'bad request') })
  const secondary = {
    name: 'gemini',
    isConfigured: () => true,
    async *stream() { secondaryCalled = true; yield { text: 'should not happen' } },
  }
  let threw = null
  try { await drain([primary, secondary]) } catch (err) { threw = err.message }
  check('400 does not trigger failover', { threw, secondaryCalled },
    { threw: 'bad request', secondaryCalled: false })
}

/* 11 — an unconfigured provider is skipped, not tried and failed. */
{
  const unconfigured = { name: 'groq', isConfigured: () => false, async *stream() { throw new Error('must not run') } }
  const configured = stub('gemini', { chunks: [{ text: 'ok' }] })
  const out = await drain([unconfigured, configured])
  check('unconfigured provider is skipped', out[0]?.provider, 'gemini')
}

/* 12 — every provider exhausted surfaces the last error, not a silent empty reply. */
{
  const a = stub('groq', { error: new LlmError('groq', 429, true, 'groq exhausted') })
  const b = stub('gemini', { error: new LlmError('gemini', 429, true, 'gemini exhausted') })
  let threw = null
  try { await drain([a, b]) } catch (err) { threw = err.message }
  check('all providers exhausted reports the last error', threw, 'gemini exhausted')
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)
