/**
 * Experiment: retrieval quality over the sample corpus.
 *
 * Twenty questions whose answers are known to be present, each labelled with
 * the document that contains the answer, plus five whose answers are not in the
 * corpus at all. Reports recall@4, mean reciprocal rank, and the rejection rate
 * on out-of-corpus questions — the last being the similarity floor doing its job.
 *
 * Retrieval is deterministic given a fixed corpus, so unlike generation these
 * figures are reproducible. Uploads and their chunks are removed afterwards.
 */
import fs from 'node:fs'
import mongoose from 'mongoose'
import 'dotenv/config'

const API = 'http://localhost:5050/api/v1'
const SAMPLES = '../docs/sample-data'
const PASS = 'Password123!'
const TOP_K = 4

const HANDBOOK = 'Employee Handbook'
const FULLTIME = 'Leave Policy - Full-Time'

/** [question, document expected to contain the answer] */
const IN_CORPUS = [
  ['How do I report a lost ID card?', HANDBOOK],
  ['Is the first replacement ID card free?', HANDBOOK],
  ['How does the referral programme work?', HANDBOOK],
  ['When is a referral bonus paid?', HANDBOOK],
  ['Can I refer a family member?', HANDBOOK],
  ['How long do I have to submit an expense claim?', HANDBOOK],
  ['Is a card statement acceptable as a receipt?', HANDBOOK],
  ['How do I request new software?', HANDBOOK],
  ['Would IT support ever ask me for my password?', HANDBOOK],
  ['How many days a week am I expected in the office?', HANDBOOK],
  ['Who do I contact about a problem with my manager?', HANDBOOK],
  ['How do I change my bank details?', HANDBOOK],
  ['How many annual leave days do full-time staff get?', FULLTIME],
  ['Do weekends count against my leave balance?', FULLTIME],
  ['How much notice should I give before annual leave?', FULLTIME],
  ['Can I carry unused annual leave into next year?', FULLTIME],
  ['When do I need a medical certificate for sick leave?', FULLTIME],
  ['What happens if a public holiday falls during my leave?', FULLTIME],
  ['Can I cancel leave after it has been approved?', FULLTIME],
  ['Who decides whether my leave request is approved?', FULLTIME],
]

const OUT_OF_CORPUS = [
  'What is the office wifi password?',
  'How do I reset my payroll direct deposit?',
  'What is the current share price of the company?',
  'Which health insurance provider does the company use?',
  'How do I book a meeting room for Thursday?',
]

const login = async (email) => {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASS }),
  })
  const j = await r.json()
  if (!j.success) throw new Error(JSON.stringify(j).slice(0, 200))
  return j.data.accessToken
}

const search = async (token, q) => {
  const r = await fetch(`${API}/documents/search?q=${encodeURIComponent(q)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const j = await r.json()
  if (!j.success) throw new Error(JSON.stringify(j).slice(0, 200))
  return j.data.results
}

const created = []
let hr

try {
  hr = await login('hr@nexora.com')

  for (const [title, file, audience] of [
    [HANDBOOK, 'employee-handbook.md', []],
    [FULLTIME, 'leave-policy-fulltime.md', ['FULL_TIME']],
    ['Leave Policy - Intern', 'leave-policy-intern.md', ['INTERN']],
  ]) {
    const r = await fetch(`${API}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hr}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title, content: fs.readFileSync(`${SAMPLES}/${file}`, 'utf8'),
        audienceEmploymentTypes: audience,
      }),
    })
    const j = await r.json()
    if (!j.success) throw new Error(`upload ${title}: ${JSON.stringify(j).slice(0, 200)}`)
    created.push(j.data.document.id)
  }
  console.log(`corpus: ${created.length} documents indexed\n`)

  // Queried as a full-time employee, so the intern policy is correctly out of
  // scope and cannot inflate the numbers.
  const emp = await login('employee@nexora.com')

  let hits = 0
  let reciprocalSum = 0
  const misses = []

  for (const [q, expected] of IN_CORPUS) {
    const results = await search(emp, q)
    const rank = results.findIndex((r) => r.documentTitle === expected) + 1
    if (rank > 0 && rank <= TOP_K) {
      hits += 1
      reciprocalSum += 1 / rank
    } else {
      misses.push([q, expected, results[0]?.documentTitle ?? '(nothing returned)'])
    }
  }

  let rejected = 0
  const admitted = []
  for (const q of OUT_OF_CORPUS) {
    const results = await search(emp, q)
    if (results.length === 0) rejected += 1
    else admitted.push([q, results[0].documentTitle, results[0].similarity.toFixed(3)])
  }

  const pct = (a, b) => `${((a / b) * 100).toFixed(1)}%`

  console.log('══════════ RETRIEVAL QUALITY ══════════\n')
  console.log(`  Questions with the answer in the corpus   ${IN_CORPUS.length}`)
  console.log(`  Recall@${TOP_K}                                  ${pct(hits, IN_CORPUS.length)} (${hits}/${IN_CORPUS.length})`)
  console.log(`  Mean reciprocal rank                      ${(reciprocalSum / IN_CORPUS.length).toFixed(3)}`)
  console.log(`  Out-of-corpus questions                   ${OUT_OF_CORPUS.length}`)
  console.log(`  Rejected by the similarity floor          ${pct(rejected, OUT_OF_CORPUS.length)} (${rejected}/${OUT_OF_CORPUS.length})`)

  if (misses.length) {
    console.log('\n  Missed:')
    for (const [q, exp, got] of misses) console.log(`    "${q}"\n      expected ${exp}, top hit ${got}`)
  }
  if (admitted.length) {
    console.log('\n  Out-of-corpus questions that still returned a passage:')
    for (const [q, doc, sim] of admitted) console.log(`    "${q}" → ${doc} @ ${sim}`)
  }
} catch (e) { console.log(`ERROR: ${e.message}`) }
finally {
  try {
    for (const id of created) {
      await fetch(`${API}/documents/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${hr}` } })
    }
    await mongoose.connect(process.env.MONGO_URI)
    const d = await mongoose.connection.db.collection('documents').countDocuments()
    const c = await mongoose.connection.db.collection('documentchunks').countDocuments()
    console.log(`\ncleanup — documents ${d}, chunks ${c}`)
    await mongoose.disconnect()
  } catch (e) { console.log('cleanup: ' + e.message) }
}
