/** Audit trail + rate limiting. Cleans up after itself. */
import mongoose from 'mongoose'
import 'dotenv/config'

const API = 'http://localhost:5050/api/v1'
const PASS = 'Password123!'
let failures = 0
const check = (n, ok, d = '') => { if (!ok) failures++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? `\n        ${d}` : ''}`) }

const login = async (e) => {
  const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e, password: PASS }) })
  const j = await r.json(); if (!j.success) throw new Error(`login ${e}: ${JSON.stringify(j).slice(0,150)}`); return j.data.accessToken
}
const get = async (t, p) => (await (await fetch(`${API}${p}`, { headers: { Authorization: `Bearer ${t}` } })).json())

let createdLeaveId = null
try {
  const emp = await login('employee@nexora.com')
  const hr = await login('hr@nexora.com')
  const admin = await login('admin@nexora.com')

  /* 1 — an approval writes an audit entry. */
  const before = (await get(admin, '/audit')).data.logs.length

  // Employee applies, HR approves.
  // Walk forward to a weekday — the server refuses a range with no working days.
  const d = new Date(Date.now() + 30 * 86400000)
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1)
  const future = d.toISOString().slice(0, 10)
  const ap = await fetch(`${API}/leave/requests`, {
    method: 'POST', headers: { Authorization: `Bearer ${emp}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'sick', fromDate: future, toDate: future, reason: 'Audit trail verification' }),
  })
  const apj = await ap.json()
  if (!apj.success) throw new Error('apply failed: ' + JSON.stringify(apj).slice(0, 200))
  createdLeaveId = apj.data.request.id

  const dec = await fetch(`${API}/leave/requests/${createdLeaveId}/approve`, {
    method: 'POST', headers: { Authorization: `Bearer ${hr}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ note: 'ok' }),
  })
  const decj = await dec.json()
  if (!decj.success) throw new Error('approve failed: ' + JSON.stringify(decj).slice(0, 200))

  const after = (await get(admin, '/audit')).data.logs
  const entry = after[0]
  check('approving leave writes an audit entry', after.length === before + 1 && entry.action === 'LEAVE_APPROVED',
    entry ? `${entry.action} — ${entry.summary}` : 'no entry')
  check('entry names the actor and the target', entry?.actorName === 'Priya Sharma' && entry?.targetName === 'Arjun Mehta',
    `actor=${entry?.actorName} target=${entry?.targetName}`)

  /* 2 — HR cannot read the audit trail (they appear in it). */
  const hrTry = await get(hr, '/audit')
  check('HR cannot read the audit trail', hrTry.success === false, JSON.stringify(hrTry).slice(0, 120))

  const empTry = await get(emp, '/audit')
  check('employee cannot read the audit trail', empTry.success === false, JSON.stringify(empTry).slice(0, 120))

  /* 3 — rate limiting bites on the chat endpoint. */
  let limited = 0, ok = 0
  for (let i = 0; i < 24; i += 1) {
    const r = await fetch(`${API}/chat/stream`, {
      method: 'POST', headers: { Authorization: `Bearer ${emp}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
    })
    if (r.status === 429) limited += 1; else ok += 1
    if (limited > 0) break   // stop as soon as it engages; no need to burn quota
  }
  check('chat endpoint rate-limits a flood', limited > 0, `allowed ${ok} then returned 429`)

  /* 4 — the limiter counts per user, not per IP. */
  const other = await login('it@nexora.com')
  const r2 = await fetch(`${API}/chat/stream`, {
    method: 'POST', headers: { Authorization: `Bearer ${other}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
  })
  check('a different user is not blocked by the first one', r2.status !== 429, `status ${r2.status}`)
} catch (e) { failures++; console.log(`ERROR: ${e.message}`) }
finally {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    const a = await mongoose.connection.db.collection('auditlogs').deleteMany({})
    const l = await mongoose.connection.db.collection('leaverequests').deleteMany({ reason: 'Audit trail verification' })
    // Return the sick day that was consumed by the approval.
    await mongoose.connection.db.collection('leavebalances').updateMany({ type: 'sick' }, { $set: { used: 0, pending: 0 } })
    console.log(`\ncleanup — ${a.deletedCount} audit rows, ${l.deletedCount} leave requests, balances reset`)
    await mongoose.disconnect()
  } catch (e) { console.log('cleanup: ' + e.message) }
  console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`)
  process.exit(failures ? 1 : 0)
}
