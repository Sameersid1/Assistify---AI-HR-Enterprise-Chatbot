/**
 * Experiment: end-to-end latency of the four representative operations.
 *
 * Measured from the client, so each figure includes network, framework,
 * validation, database and — where applicable — model time. Reported as median
 * alongside mean: a single slow cold start skews a mean of twenty far more than
 * it should, and the median is the honest summary of what a user experiences.
 *
 * Assistant samples are paced to respect the application's own per-user request
 * limit, which is itself part of the system under test.
 */
import mongoose from 'mongoose'
import 'dotenv/config'

const API = 'http://localhost:5050/api/v1'
const EMAIL = 'employee@nexora.com'
const PASS = 'Password123!'

const N_CHEAP = 20   // login, leave application — no model involved
const N_MODEL = 10   // assistant — bounded by the per-user request limit

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const ms = () => Number(process.hrtime.bigint() / 1_000_000n)

function stats(samples) {
  const s = [...samples].sort((a, b) => a - b)
  const mean = s.reduce((a, b) => a + b, 0) / s.length
  const median = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2
  return { n: s.length, mean: Math.round(mean), median: Math.round(median), min: s[0], max: s[s.length - 1] }
}

const row = (label, st) =>
  console.log(`  ${label.padEnd(38)} n=${String(st.n).padStart(2)}  mean ${String(st.mean).padStart(5)}  median ${String(st.median).padStart(5)}  range ${st.min}–${st.max}`)

const login = async () => {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  })
  const j = await r.json()
  if (!j.success) throw new Error(JSON.stringify(j).slice(0, 150))
  return j.data.accessToken
}

const askStreamed = async (token, content) => {
  const t0 = ms()
  const r = await fetch(`${API}/chat/stream`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content }] }),
  })
  const text = await r.text()
  const elapsed = ms() - t0
  const tools = [...text.matchAll(/"type":"tool","name":"([a-z_]+)"/g)].map((m) => m[1])
  const errored = /"type":"error"/.test(text)
  return { elapsed, tools, errored }
}

function weekdays(count) {
  const out = []
  const d = new Date(Date.now() + 40 * 86400000)
  while (out.length < count) {
    while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1)
    out.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 3)
  }
  return out
}

await mongoose.connect(process.env.MONGO_URI)
const users = mongoose.connection.db.collection('users')
const balances = mongoose.connection.db.collection('leavebalances')
const requests = mongoose.connection.db.collection('leaverequests')
const me = await users.findOne({ email: EMAIL })
const year = new Date().getUTCFullYear()

try {
  /* 1 — authentication */
  const loginSamples = []
  for (let i = 0; i < N_CHEAP; i += 1) {
    const t0 = ms()
    await login()
    loginSamples.push(ms() - t0)
  }
  const token = await login()

  /* 2 — leave application (validation, overlap check, atomic reservation, write) */
  await balances.updateOne(
    { userId: me._id, year, type: 'annual' },
    { $set: { allocated: 200, used: 0, pending: 0 } }, { upsert: true },
  )
  const applySamples = []
  for (const day of weekdays(N_CHEAP)) {
    const t0 = ms()
    const r = await fetch(`${API}/leave/requests`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'annual', fromDate: day, toDate: day, reason: 'LATENCY-TEST' }),
    })
    const elapsed = ms() - t0
    if ((await r.json()).success) applySamples.push(elapsed)
  }

  /* 3 — assistant, no tool call */
  const noTool = []
  for (let i = 0; i < N_MODEL; i += 1) {
    const res = await askStreamed(token, 'Hello, who are you and what can you help me with?')
    if (!res.errored && res.tools.length === 0) noTool.push(res.elapsed)
    await sleep(16_000)
  }

  /* 4 — assistant, one tool call */
  const withTool = []
  for (let i = 0; i < N_MODEL; i += 1) {
    const res = await askStreamed(token, 'How many casual leave days do I have left?')
    if (!res.errored && res.tools.length > 0) withTool.push(res.elapsed)
    await sleep(16_000)
  }

  console.log('\n══════════ LATENCY ══════════\n')
  row('Authentication (login)', stats(loginSamples))
  row('Leave application', stats(applySamples))
  if (noTool.length) row('Assistant — no tool call', stats(noTool))
  if (withTool.length) row('Assistant — one tool call', stats(withTool))
  console.log('\n  Assistant figures include model time and are dominated by it.')
  console.log('  A tool-calling answer costs two model round trips plus a database query.')
} catch (e) { console.log(`ERROR: ${e.message}`) }
finally {
  const del = await requests.deleteMany({ reason: 'LATENCY-TEST' })
  await balances.updateOne({ userId: me._id, year, type: 'annual' },
    { $set: { allocated: 18, used: 0, pending: 0 } })
  console.log(`\ncleanup — ${del.deletedCount} test requests removed, balance restored`)
  await mongoose.disconnect()
}
