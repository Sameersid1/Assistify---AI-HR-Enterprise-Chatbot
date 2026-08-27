/**
 * Experiment: concurrency safety of leave-balance reservation.
 *
 * The reservation is a single conditional update — findOneAndUpdate with an
 * $expr guard asserting that (allocated − used − pending) ≥ days. The question
 * this answers is whether N simultaneous applications against a balance that
 * can only satisfy some of them can over-allocate.
 *
 * All requests are dispatched with Promise.all so they contend inside MongoDB
 * rather than being serialised by the client. Test data is removed afterwards.
 */
import mongoose from 'mongoose'
import 'dotenv/config'

const API = 'http://localhost:5050/api/v1'
const EMAIL = 'employee@nexora.com'
const PASS = 'Password123!'
const TYPE = 'annual'

/** Requests fired at once. Deliberately more than the balance can satisfy. */
const CONCURRENT = 12
/** Working days per request. */
const DAYS_EACH = 2

let failures = 0
const check = (n, ok, d = '') => { if (!ok) failures++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? `\n        ${d}` : ''}`) }

const login = async () => {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  })
  const j = await r.json()
  if (!j.success) throw new Error(JSON.stringify(j).slice(0, 200))
  return j.data.accessToken
}

/** Non-overlapping weekday ranges — an overlap would be rejected for its own reason. */
function ranges(count, daysEach) {
  const out = []
  const d = new Date(Date.now() + 14 * 86400000)
  while (out.length < count) {
    while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1)
    const from = new Date(d)
    let added = 1
    while (added < daysEach) {
      d.setUTCDate(d.getUTCDate() + 1)
      if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) added += 1
    }
    out.push([from.toISOString().slice(0, 10), d.toISOString().slice(0, 10)])
    d.setUTCDate(d.getUTCDate() + 3)
  }
  return out
}

const token = await login()
await mongoose.connect(process.env.MONGO_URI)
const balances = mongoose.connection.db.collection('leavebalances')
const requests = mongoose.connection.db.collection('leaverequests')
const users = mongoose.connection.db.collection('users')
const me = await users.findOne({ email: EMAIL })
const year = new Date().getUTCFullYear()

try {
  // Reset to a known allocation so the arithmetic is unambiguous.
  const ALLOCATED = 10
  await balances.updateOne(
    { userId: me._id, year, type: TYPE },
    { $set: { allocated: ALLOCATED, used: 0, pending: 0 } },
    { upsert: true },
  )
  const expected = Math.floor(ALLOCATED / DAYS_EACH)

  console.log(`allocation ${ALLOCATED} days, ${CONCURRENT} simultaneous requests of ${DAYS_EACH} days each`)
  console.log(`at most ${expected} can succeed\n`)

  const results = await Promise.all(
    ranges(CONCURRENT, DAYS_EACH).map(([fromDate, toDate]) =>
      fetch(`${API}/leave/requests`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: TYPE, fromDate, toDate, reason: 'CONCURRENCY-TEST' }),
      }).then(async (r) => ({ status: r.status, body: await r.json() })),
    ),
  )

  const accepted = results.filter((r) => r.body.success)
  const rejected = results.filter((r) => !r.body.success)
  const codes = {}
  for (const r of rejected) codes[r.body.error.code] = (codes[r.body.error.code] ?? 0) + 1

  const balance = await balances.findOne({ userId: me._id, year, type: TYPE })
  const available = balance.allocated - balance.used - balance.pending

  console.log(`accepted  ${accepted.length}`)
  console.log(`rejected  ${rejected.length}  ${JSON.stringify(codes)}`)
  console.log(`final balance — allocated ${balance.allocated}, used ${balance.used}, pending ${balance.pending}, available ${available}\n`)

  check('exactly floor(allocated / days) requests succeed', accepted.length === expected,
    `expected ${expected}, got ${accepted.length}`)
  check('reserved days never exceed the allocation',
    balance.used + balance.pending <= balance.allocated,
    `used+pending = ${balance.used + balance.pending}, allocated = ${balance.allocated}`)
  check('available balance never goes negative', available >= 0, `available = ${available}`)
  check('every rejection is an insufficient-balance rejection',
    Object.keys(codes).every((c) => c === 'LEAVE_INSUFFICIENT_BALANCE'),
    JSON.stringify(codes))
  check('pending exactly accounts for the accepted requests',
    balance.pending === accepted.length * DAYS_EACH,
    `pending ${balance.pending}, expected ${accepted.length * DAYS_EACH}`)
} catch (e) { failures++; console.log(`ERROR: ${e.message}`) }
finally {
  const del = await requests.deleteMany({ reason: 'CONCURRENCY-TEST' })
  await balances.updateOne({ userId: me._id, year, type: TYPE },
    { $set: { allocated: 18, used: 0, pending: 0 } })
  console.log(`\ncleanup — ${del.deletedCount} test requests removed, balance restored`)
  await mongoose.disconnect()
  console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`)
  process.exit(failures ? 1 : 0)
}
