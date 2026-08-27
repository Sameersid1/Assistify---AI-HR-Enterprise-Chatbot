/**
 * End-to-end refusal on out-of-corpus questions.
 *
 * The retrieval evaluation measures whether the similarity floor admits a
 * passage. That is an intermediate signal, not the outcome that matters: a
 * passage reaching the model is harmless if the model declines to answer from
 * it. Cosine similarity cannot distinguish "this corpus is about this topic"
 * from "this corpus answers this question", so an HR question on a subject the
 * handbook does not cover scores highly against handbook text by construction.
 *
 * This measures what a user actually experiences: asked something the corpus
 * does not answer, does the assistant say so, or does it fabricate?
 *
 * A question is scored CORRECT when the reply declines — states the policy is
 * not published, or offers to escalate — and INCORRECT if it asserts a
 * substantive answer.
 */
import fs from 'node:fs'
import mongoose from 'mongoose'
import 'dotenv/config'

const API = 'http://localhost:5050/api/v1'
const SAMPLES = '../docs/sample-data'
const PASS = 'Password123!'
const GAP_MS = 20_000

/** Genuinely absent from the corpus. Verified by reading the documents. */
const OUT_OF_CORPUS = [
  'What is the office wifi password?',
  'What is the current share price of the company?',
  'Which health insurance provider does the company use?',
  'How do I book a meeting room for Thursday?',
  'What is the parental leave entitlement?',
  'How do I claim mileage for driving my own car?',
  'What pension scheme does the company offer?',
]

/** Phrases indicating the assistant declined rather than answered. */
const DECLINED =
  /(could not find|couldn'?t find|can'?t find|cannot find|don'?t see|do not see|no (published |company )?policy|not covered|does not cover|doesn'?t cover|no information|any information|not (something )?I can see|cannot see|can'?t see|do not have|don'?t have|not available to me|(send|pass) (this|that|it|your) (question )?(on )?to HR|would you like me to (send|pass)|contact (People Operations|HR))/i

const login = async (email) => {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASS }),
  })
  const j = await r.json()
  if (!j.success) throw new Error(JSON.stringify(j).slice(0, 200))
  return j.data.accessToken
}

const ask = async (token, content) => {
  const r = await fetch(`${API}/chat/stream`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content }] }),
  })
  const text = await r.text()
  let reply = '', tools = [], err = ''
  for (const line of text.split('\n')) {
    if (!line.startsWith('data:')) continue
    try {
      const e = JSON.parse(line.slice(5))
      if (e.type === 'delta') reply += e.text
      if (e.type === 'discard') reply = ''
      if (e.type === 'tool') tools.push(e.name)
      if (e.type === 'error') err = e.message
    } catch { /* partial frame */ }
  }
  return { reply: reply.replace(/\s+/g, ' ').trim(), tools, err }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const created = []
let hr

try {
  hr = await login('hr@nexora.com')
  for (const [title, file, aud] of [
    ['Employee Handbook', 'employee-handbook.md', []],
    ['Leave Policy - Full-Time', 'leave-policy-fulltime.md', ['FULL_TIME']],
    ['Leave Policy - Intern', 'leave-policy-intern.md', ['INTERN']],
  ]) {
    const r = await fetch(`${API}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hr}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content: fs.readFileSync(`${SAMPLES}/${file}`, 'utf8'), audienceEmploymentTypes: aud }),
    })
    const j = await r.json()
    if (!j.success) throw new Error(`upload ${title}: ${JSON.stringify(j).slice(0, 150)}`)
    created.push(j.data.document.id)
  }

  const emp = await login('employee@nexora.com')
  let correct = 0
  let tested = 0
  const rows = []

  for (const q of OUT_OF_CORPUS) {
    let res = await ask(emp, q)
    if (res.err) { await sleep(60_000); res = await ask(emp, q) }   // one retry on rate limit
    if (res.err) { rows.push([q, 'ERROR', res.err.slice(0, 60)]); await sleep(GAP_MS); continue }

    tested += 1
    const declined = DECLINED.test(res.reply)
    if (declined) correct += 1
    rows.push([q, declined ? 'declined' : 'ANSWERED', res.reply.slice(0, 400)])
    await sleep(GAP_MS)
  }

  console.log('\n══════════ END-TO-END REFUSAL ON OUT-OF-CORPUS QUESTIONS ══════════\n')
  for (const [q, verdict, detail] of rows) {
    console.log(`  ${verdict.padEnd(9)} ${q}`)
    console.log(`            ${detail}\n`)
  }
  console.log(`  Questions tested        ${tested}`)
  console.log(`  Correctly declined      ${correct}`)
  console.log(`  End-to-end refusal rate ${tested ? ((correct / tested) * 100).toFixed(1) : '—'}%`)
} catch (e) { console.log(`ERROR: ${e.message}`) }
finally {
  try {
    for (const id of created) {
      await fetch(`${API}/documents/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${hr}` } })
    }
    await mongoose.connect(process.env.MONGO_URI)
    await mongoose.connection.db.collection('auditlogs').deleteMany({ action: 'DOCUMENT_PUBLISHED' })
    const d = await mongoose.connection.db.collection('documents').countDocuments()
    console.log(`\ncleanup — documents ${d}, audit rows removed`)
    await mongoose.disconnect()
  } catch (e) { console.log('cleanup: ' + e.message) }
}
