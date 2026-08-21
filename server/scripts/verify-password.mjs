/** Password change + reset, end to end. Restores the original password. */
import mongoose from 'mongoose'
import 'dotenv/config'

const API = 'http://localhost:5050/api/v1'
const EMAIL = 'employee@nexora.com'
const ORIGINAL = 'Password123!'
const TEMP = 'Changed456!'
let failures = 0
const check = (n, ok, d = '') => { if (!ok) failures++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? `\n        ${d}` : ''}`) }

const post = async (p, body, token) => {
  const r = await fetch(`${API}${p}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
  return { status: r.status, json: await r.json() }
}
const login = async (email, password) => post('/auth/login', { email, password })

try {
  /* 1 — change password while signed in. */
  const start = await login(EMAIL, ORIGINAL)
  check('sign in with the original password', start.json.success === true)
  const token = start.json.data.accessToken

  const wrong = await post('/auth/change-password', { currentPassword: 'NotMyPassword1', newPassword: TEMP }, token)
  check('wrong current password is refused', wrong.json.success === false && wrong.json.error.code === 'PASSWORD_INCORRECT',
    JSON.stringify(wrong.json).slice(0, 120))

  const same = await post('/auth/change-password', { currentPassword: ORIGINAL, newPassword: ORIGINAL }, token)
  check('reusing the same password is refused', same.json.success === false && same.json.error.code === 'PASSWORD_UNCHANGED',
    JSON.stringify(same.json).slice(0, 120))

  const weak = await post('/auth/change-password', { currentPassword: ORIGINAL, newPassword: 'short' }, token)
  check('a weak password is refused', weak.json.success === false, JSON.stringify(weak.json).slice(0, 120))

  const changed = await post('/auth/change-password', { currentPassword: ORIGINAL, newPassword: TEMP }, token)
  check('password changes', changed.json.success === true, JSON.stringify(changed.json).slice(0, 120))

  check('old password no longer works', (await login(EMAIL, ORIGINAL)).json.success === false)
  check('new password works', (await login(EMAIL, TEMP)).json.success === true)

  /* 2 — forgot password never reveals whether an account exists. */
  const known = await post('/auth/forgot-password', { email: EMAIL })
  const unknown = await post('/auth/forgot-password', { email: 'nobody.at.all@nexora.com' })
  check('forgot-password answers identically for known and unknown addresses',
    known.status === unknown.status && JSON.stringify(known.json) === JSON.stringify(unknown.json),
    `known=${known.status} unknown=${unknown.status}`)

  /* 3 — the emailed token resets the password. Read the hash straight from the
         database and reverse it the way the server would, so no inbox is needed. */
  await mongoose.connect(process.env.MONGO_URI)
  const users = mongoose.connection.db.collection('users')
  const row = await users.findOne({ email: EMAIL })
  check('a reset token was stored', !!row.resetTokenHash && !!row.resetExpiresAt)

  // The raw token is not recoverable from its hash, so mint a known one the
  // same way the server does and write its hash in place.
  const crypto = await import('node:crypto')
  const raw = crypto.randomBytes(32).toString('hex')
  await users.updateOne({ email: EMAIL }, {
    $set: { resetTokenHash: crypto.createHash('sha256').update(raw).digest('hex'), resetExpiresAt: new Date(Date.now() + 3600_000) },
  })

  const bad = await post('/auth/reset-password', { token: 'not-a-real-token', password: ORIGINAL })
  check('an invalid reset token is refused', bad.json.success === false && bad.json.error.code === 'RESET_INVALID')

  const reset = await post('/auth/reset-password', { token: raw, password: ORIGINAL })
  check('reset sets the new password', reset.json.success === true, JSON.stringify(reset.json).slice(0, 120))

  // Checked BEFORE signing in again — a fresh login issues a new refresh token,
  // which would mask whether the reset actually cleared the old ones.
  const straightAfter = await users.findOne({ email: EMAIL })
  check('reset clears every existing session', (straightAfter.refreshTokenHashes ?? []).length === 0,
    )

  check('original password works again', (await login(EMAIL, ORIGINAL)).json.success === true)

  const reuse = await post('/auth/reset-password', { token: raw, password: TEMP })
  check('the reset token is single-use', reuse.json.success === false, JSON.stringify(reuse.json).slice(0, 120))

  await mongoose.disconnect()
} catch (e) { failures++; console.log(`ERROR: ${e.message}`) }
finally {
  // Whatever happened, put the password back.
  try {
    if (!mongoose.connection.readyState) await mongoose.connect(process.env.MONGO_URI)
    const argon2 = (await import('argon2')).default
    await mongoose.connection.db.collection('users').updateOne(
      { email: EMAIL },
      { $set: { passwordHash: await argon2.hash(ORIGINAL, { type: argon2.argon2id }) }, $unset: { resetTokenHash: '', resetExpiresAt: '' } },
    )
    console.log('\ncleanup — original password restored')
    await mongoose.disconnect()
  } catch (e) { console.log('cleanup: ' + e.message) }
  console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`)
  process.exit(failures ? 1 : 0)
}
