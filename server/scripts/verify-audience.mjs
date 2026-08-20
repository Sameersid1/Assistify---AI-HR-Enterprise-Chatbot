/**
 * Verifies that policy documents reach only the people they apply to.
 *
 * Runs against a THROWAWAY database (…_audiencetest), created and dropped by
 * this script. It never opens the application database.
 *
 * A real database rather than a stub on purpose: the whole mechanism is one
 * Mongo query, and the parts that can be wrong — whether `$size: 0` matches an
 * empty array, whether matching a scalar against an array field does what you
 * expect — are Mongo's semantics, not ours. Reimplementing them in a fake would
 * be testing the fake.
 */
import mongoose from 'mongoose'

const BASE = process.env.MONGO_URI || 'mongodb://localhost:27017/assistify'
const TEST_URI = BASE.replace(/\/([^/?]+)(\?|$)/, '/$1_audiencetest$2')

process.env.MONGO_URI = TEST_URI
process.env.JWT_ACCESS_SECRET ||= 'x'.repeat(32)
process.env.JWT_REFRESH_SECRET ||= 'y'.repeat(32)

const { DocumentChunkModel } = await import('../src/modules/documents/document.model.ts')
const { UserModel } = await import('../src/modules/users/user.model.ts')
const { audienceFilter } = await import('../src/modules/documents/document.service.ts')
const { scoped } = await import('../src/shared/tenantQuery.ts')

let failures = 0
const check = (name, actual, expected) => {
  const a = JSON.stringify(actual), e = JSON.stringify(expected)
  const ok = a === e
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
  if (!ok) console.log(`      expected ${e}\n      actual   ${a}`)
}

await mongoose.connect(TEST_URI)
if (!mongoose.connection.name.endsWith('_audiencetest')) {
  console.error(`REFUSING TO RUN against "${mongoose.connection.name}"`)
  process.exit(1)
}
await mongoose.connection.dropDatabase()

const companyId = new mongoose.Types.ObjectId()
const otherCompanyId = new mongoose.Types.ObjectId()

// One document per audience, one chunk each, labelled so the assertion reads.
const docs = [
  ['handbook-everyone', []],
  ['leave-fulltime', ['FULL_TIME']],
  ['leave-intern', ['INTERN']],
  ['perks-fulltime-and-contract', ['FULL_TIME', 'CONTRACT']],
]
await DocumentChunkModel.insertMany(
  docs.map(([text, audienceEmploymentTypes]) => ({
    companyId,
    documentId: new mongoose.Types.ObjectId(),
    chunkIndex: 0,
    text,
    embedding: [0.1, 0.2],
    audienceEmploymentTypes,
  })),
)
// A different tenant's intern document, to prove audience never widens tenancy.
await DocumentChunkModel.create({
  companyId: otherCompanyId,
  documentId: new mongoose.Types.ObjectId(),
  chunkIndex: 0,
  text: 'OTHER-TENANT-SECRET',
  embedding: [0.1, 0.2],
  audienceEmploymentTypes: [],
})

const makeUser = async (employmentType) =>
  UserModel.create({
    companyId,
    email: `${String(employmentType).toLowerCase()}@test.local`,
    fullName: `${employmentType} person`,
    role: 'employee',
    status: 'ACTIVE',
    employmentType,
    passwordHash: 'x',
  })

const visibleTo = async (user) => {
  const auth = { userId: user._id, companyId, role: 'employee' }
  const rows = await DocumentChunkModel.find(scoped(auth, await audienceFilter(auth)))
  return rows.map((r) => r.text).sort()
}

const intern = await makeUser('INTERN')
const fullTime = await makeUser('FULL_TIME')
const contract = await makeUser('CONTRACT')
const partTime = await makeUser('PART_TIME')

check('intern sees company-wide + intern only', await visibleTo(intern),
  ['handbook-everyone', 'leave-intern'])

check('full-time sees company-wide + both full-time docs', await visibleTo(fullTime),
  ['handbook-everyone', 'leave-fulltime', 'perks-fulltime-and-contract'])

check('contract sees company-wide + the shared perks doc', await visibleTo(contract),
  ['handbook-everyone', 'perks-fulltime-and-contract'])

check('part-time sees only company-wide', await visibleTo(partTime),
  ['handbook-everyone'])

// A user whose employmentType was never set must not silently see everything.
const legacy = await UserModel.create({
  companyId, email: 'legacy@test.local', fullName: 'Legacy', role: 'employee',
  status: 'ACTIVE', passwordHash: 'x',
})
check('user with no employmentType falls back to FULL_TIME, not to everything',
  await visibleTo(legacy),
  ['handbook-everyone', 'leave-fulltime', 'perks-fulltime-and-contract'])

// The headline property: audience narrows, it can never widen tenancy.
const all = await visibleTo(fullTime)
check('another tenant is never reachable', all.includes('OTHER-TENANT-SECRET'), false)

// And the filter must be a QUERY filter — excluded rows must never be loaded,
// or they would consume a top-k slot before ranking ever ran.
const internAuth = { userId: intern._id, companyId, role: 'employee' }
const loaded = await DocumentChunkModel.countDocuments(
  scoped(internAuth, await audienceFilter(internAuth)),
)
check('excluded passages are never loaded (2 of 4, filtered in the query)', loaded, 2)

await mongoose.connection.dropDatabase()
await mongoose.disconnect()

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)
