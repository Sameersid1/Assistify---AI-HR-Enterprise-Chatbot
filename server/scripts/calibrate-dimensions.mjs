/**
 * Does embedding dimensionality change how cleanly on-topic separates from
 * off-topic?
 *
 * The system truncates Matryoshka embeddings to 256 dimensions. Truncation is
 * a deliberate storage/compute trade, but it necessarily discards signal, and
 * the retrieval evaluation showed on-topic and off-topic score populations
 * overlapping near the threshold. This measures the separation directly at
 * several dimensionalities so the choice is made on evidence rather than on the
 * assumption that 256 is adequate.
 *
 * Reports, per dimensionality: the worst on-topic score, the best off-topic
 * score, and the gap between them. A positive gap means some single threshold
 * separates the two populations perfectly on this question set.
 */
import fs from 'node:fs'
import 'dotenv/config'

const KEY = process.env.GEMINI_API_KEY
const MODEL = 'gemini-embedding-2'
const DIMS = [256, 512, 768, 1536]
const SAMPLES = '../docs/sample-data'

const ON_TOPIC = [
  'How do I report a lost ID card?',
  'Is the first replacement ID card free?',
  'How does the referral programme work?',
  'When is a referral bonus paid?',
  'Can I refer a family member?',
  'How long do I have to submit an expense claim?',
  'Is a card statement acceptable as a receipt?',
  'How do I request new software?',
  'Would IT support ever ask me for my password?',
  'How many days a week am I expected in the office?',
  'Who do I contact about a problem with my manager?',
  'How do I change my bank details?',
  'How many annual leave days do full-time staff get?',
  'Do weekends count against my leave balance?',
  'How much notice should I give before annual leave?',
  'Can I carry unused annual leave into next year?',
  'When do I need a medical certificate for sick leave?',
  'What happens if a public holiday falls during my leave?',
  'Can I cancel leave after it has been approved?',
  'Who decides whether my leave request is approved?',
]

/**
 * Genuinely absent from the corpus. "Payroll direct deposit" was in the earlier
 * set and is NOT listed here: the handbook does cover changing bank details, so
 * retrieving for it was correct and the original label was wrong.
 */
const OFF_TOPIC = [
  'What is the office wifi password?',
  'What is the current share price of the company?',
  'Which health insurance provider does the company use?',
  'How do I book a meeting room for Thursday?',
  'What is the parental leave entitlement?',
  'How do I claim mileage for driving my own car?',
  'What pension scheme does the company offer?',
]

const embed = async (text, dims, taskType) => {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${MODEL}`,
      content: { parts: [{ text }] },
      outputDimensionality: dims,
      taskType,
    }),
  })
  const j = await r.json()
  if (j.error) throw new Error(j.error.message.slice(0, 120))
  return j.embedding.values
}

const cos = (a, b) => {
  let d = 0, x = 0, y = 0
  for (let i = 0; i < a.length; i += 1) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i] }
  return d / (Math.sqrt(x) * Math.sqrt(y))
}

/* Chunk the corpus exactly as the service does. */
const TARGET = 1200, OVERLAP = 200
function chunkText(text) {
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  const chunks = []
  let cur = ''
  for (const p of paras) {
    if (cur && cur.length + p.length + 2 > TARGET) { chunks.push(cur); cur = cur.slice(-OVERLAP) + '\n\n' + p }
    else cur = cur ? `${cur}\n\n${p}` : p
  }
  if (cur.trim()) chunks.push(cur)
  return chunks.flatMap((c) => c.length <= TARGET * 2 ? [c] : (c.match(new RegExp(`[\\s\\S]{1,${TARGET}}`, 'g')) ?? [c]))
}

// A full-time employee's visible corpus: handbook + full-time policy.
const corpus = [
  ...chunkText(fs.readFileSync(`${SAMPLES}/employee-handbook.md`, 'utf8')),
  ...chunkText(fs.readFileSync(`${SAMPLES}/leave-policy-fulltime.md`, 'utf8')),
]

console.log(`corpus ${corpus.length} passages | on-topic ${ON_TOPIC.length} | off-topic ${OFF_TOPIC.length}\n`)
console.log('  dims   worst on-topic   best off-topic   gap      separable?')
console.log('  ----   -------------   --------------   ------   ----------')

const results = []
for (const dims of DIMS) {
  const docVecs = []
  for (const c of corpus) docVecs.push(await embed(c, dims, 'RETRIEVAL_DOCUMENT'))

  const best = async (q, task = 'RETRIEVAL_QUERY') => {
    const qv = await embed(q, dims, task)
    return Math.max(...docVecs.map((d) => cos(qv, d)))
  }

  const on = []
  for (const q of ON_TOPIC) on.push(await best(q))
  const off = []
  for (const q of OFF_TOPIC) off.push(await best(q))

  const worstOn = Math.min(...on)
  const bestOff = Math.max(...off)
  const gap = worstOn - bestOff
  results.push({ dims, worstOn, bestOff, gap, on, off })

  console.log(`  ${String(dims).padStart(4)}   ${worstOn.toFixed(3).padStart(13)}   ${bestOff.toFixed(3).padStart(14)}   ${gap >= 0 ? '+' : ''}${gap.toFixed(3).padStart(5)}   ${gap > 0 ? 'YES' : 'no — populations overlap'}`)
}

const winner = results.reduce((a, b) => (b.gap > a.gap ? b : a))
console.log(`\nwidest separation at ${winner.dims} dimensions (gap ${winner.gap >= 0 ? '+' : ''}${winner.gap.toFixed(3)})`)

if (winner.gap > 0) {
  const mid = (winner.worstOn + winner.bestOff) / 2
  console.log(`a floor of ${mid.toFixed(2)} would classify all ${ON_TOPIC.length + OFF_TOPIC.length} questions correctly at ${winner.dims} dimensions`)
} else {
  console.log('no dimensionality tested separates the two populations with a single threshold')
}
