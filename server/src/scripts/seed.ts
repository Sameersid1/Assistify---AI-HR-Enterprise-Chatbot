/**
 * Seed script — demo-ready from day one (M1 guide §Phase-1).
 *
 * Nexora Technologies is the tenant we demo on Aug 16 — HR + employee, ACTIVE,
 * known passwords. Vertex Solutions is the SECOND tenant: nobody demos it, it
 * exists so tenant isolation is testable. A single-tenant database cannot prove
 * that `scoped()` works; with two, a leak shows up as a failing assertion.
 * Give it a different leave policy so cross-tenant reads are obvious on sight.
 *
 * Run:  npm run seed
 */
import { env } from '../config/env';
import { connectDb, disconnectDb } from '../config/db';
import { CompanyModel } from '../modules/companies/company.model';
import { UserModel } from '../modules/users/user.model';
import { LeaveBalanceModel, LeaveRequestModel } from '../modules/leave/leave.model';
import { ensureBalances } from '../modules/leave/leave.service';
import { hashPassword } from '../modules/auth/auth.password';
import { countWorkingDays } from '../shared/workdays';

const DEMO_PASSWORD = 'Password123!';

const DAY_MS = 24 * 60 * 60 * 1000;

/** A UTC-midnight date `offset` days from today — keeps seeded leave relative to the demo date. */
function dayOffset(offset: number): Date {
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(today + offset * DAY_MS);
}

/**
 * Refuse to wipe a database that is not on this machine.
 *
 * This script starts with deleteMany({}) on users, companies and leave. That is
 * exactly what you want locally and a disaster against Atlas: the usual way to
 * lose production data is to point MONGO_URI at the cloud to seed it once, and
 * then forget to change it back.
 *
 * Deliberately seeding a remote database is still possible, but it now has to be
 * a decision rather than an accident:
 *
 *   SEED_ALLOW_REMOTE=yes npm run seed        (bash)
 *   $env:SEED_ALLOW_REMOTE="yes"; npm run seed  (PowerShell)
 */
function assertSafeTarget(): void {
  const uri = env.MONGO_URI;
  const isLocal = /(?:127\.0\.0\.1|localhost|\[::1\]|host\.docker\.internal)/.test(uri);
  if (isLocal || process.env.SEED_ALLOW_REMOTE === 'yes') return;

  const host = uri.replace(/^mongodb(\+srv)?:\/\/[^@]*@/, '').split(/[/?]/)[0];
  /* eslint-disable no-console */
  console.error('\n⛔  Refusing to seed a remote database.\n');
  console.error(`    Target : ${host}`);
  console.error('    This script DELETES every user, company and leave record');
  console.error('    before recreating the demo data.\n');
  console.error('    If your laptop should be using its own database, check');
  console.error('    MONGO_URI in server/.env — it should point at 127.0.0.1.\n');
  console.error('    If you really do mean to reset the remote database:');
  console.error('      PowerShell : $env:SEED_ALLOW_REMOTE="yes"; npm run seed');
  console.error('      bash       : SEED_ALLOW_REMOTE=yes npm run seed\n');
  /* eslint-enable no-console */
  process.exit(1);
}

async function seed(): Promise<void> {
  assertSafeTarget();
  await connectDb();

  // Idempotent: wipe the demo data so re-running is safe.
  await Promise.all([
    UserModel.deleteMany({}),
    CompanyModel.deleteMany({}),
    LeaveBalanceModel.deleteMany({}),
    LeaveRequestModel.deleteMany({}),
  ]);
  // eslint-disable-next-line no-console
  console.log('🧹 Cleared users + companies + leave');

  const nexora = await CompanyModel.create({
    name: 'Nexora Technologies',
    domain: 'nexora.com',
    leavePolicy: { annual: 18, casual: 8, sick: 8 },
    status: 'ACTIVE',
  });
  // eslint-disable-next-line no-console
  console.log(`🏢 Company: ${nexora.name}`);

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const hr = await UserModel.create({
    companyId: nexora._id,
    email: 'hr@nexora.com',
    fullName: 'Priya Sharma',
    role: 'hr',
    status: 'ACTIVE',
    employeeId: 'NEX-HR-001',
    department: 'Human Resources',
    designation: 'HR Manager',
    dateOfJoining: new Date('2023-01-10'),
    passwordHash,
    activatedAt: new Date('2023-01-10'),
  });

  const employee = await UserModel.create({
    companyId: nexora._id,
    email: 'employee@nexora.com',
    fullName: 'Arjun Mehta',
    role: 'employee',
    status: 'ACTIVE',
    employeeId: 'NEX-EMP-014',
    department: 'Engineering',
    designation: 'Software Engineer',
    dateOfJoining: new Date('2024-06-03'),
    reportingManagerId: hr._id,
    passwordHash,
    activatedAt: new Date('2024-06-03'),
  });

  // Admin and IT Support exist so all four role dashboards are reachable in
  // development. Neither appears in the Aug 16 demo script, but without them
  // those two views cannot be logged into and therefore cannot be built.
  await UserModel.create({
    companyId: nexora._id,
    email: 'admin@nexora.com',
    fullName: 'Vikram Malhotra',
    role: 'admin',
    status: 'ACTIVE',
    employeeId: 'NEX-ADM-001',
    department: 'Administration',
    designation: 'System Administrator',
    dateOfJoining: new Date('2022-11-01'),
    passwordHash,
    activatedAt: new Date('2022-11-01'),
  });

  await UserModel.create({
    companyId: nexora._id,
    email: 'it@nexora.com',
    fullName: 'Rohan Patel',
    role: 'it_support',
    status: 'ACTIVE',
    employeeId: 'NEX-IT-007',
    department: 'IT Operations',
    designation: 'IT Support Engineer',
    dateOfJoining: new Date('2023-08-21'),
    reportingManagerId: hr._id,
    passwordHash,
    activatedAt: new Date('2023-08-21'),
  });

  // ── Tenant 2 — Vertex Solutions ────────────────────────────────────────────
  // Not for the demo. Its only job is to be a neighbour Nexora must never see.
  const vertex = await CompanyModel.create({
    name: 'Vertex Solutions',
    domain: 'vertex.io',
    leavePolicy: { annual: 24, casual: 6, sick: 10 },
    status: 'ACTIVE',
  });
  // eslint-disable-next-line no-console
  console.log(`🏢 Company: ${vertex.name}`);

  const vertexHr = await UserModel.create({
    companyId: vertex._id,
    email: 'hr@vertex.io',
    fullName: 'Neha Kulkarni',
    role: 'hr',
    status: 'ACTIVE',
    employeeId: 'VTX-HR-001',
    department: 'People Operations',
    designation: 'HR Lead',
    dateOfJoining: new Date('2022-09-19'),
    passwordHash,
    activatedAt: new Date('2022-09-19'),
  });

  const vertexEmployee = await UserModel.create({
    companyId: vertex._id,
    email: 'employee@vertex.io',
    fullName: 'Rohan Iyer',
    role: 'employee',
    status: 'ACTIVE',
    employeeId: 'VTX-EMP-007',
    department: 'Design',
    designation: 'Product Designer',
    dateOfJoining: new Date('2024-02-12'),
    reportingManagerId: vertexHr._id,
    passwordHash,
    activatedAt: new Date('2024-02-12'),
  });

  // ── Leave balances ─────────────────────────────────────────────────────────
  // Every seeded user gets this year's allowance copied from their company's
  // policy — which is where Nexora's 18 and Vertex's 24 become visible.
  const year = new Date().getUTCFullYear();
  const allUsers = await UserModel.find({}).select('_id companyId');
  for (const user of allUsers) {
    await ensureBalances(user.companyId, user._id, year);
  }
  // eslint-disable-next-line no-console
  console.log(`🌴 Leave balances provisioned for ${allUsers.length} users (${year})`);

  // ── A little leave history ────────────────────────────────────────────────
  // The HR queue must not be empty on demo day, and a balance of "18 of 18
  // remaining" shows nothing. Both ranges span five calendar days so they always
  // contain at least three working days, whatever weekday the seed is run on.
  const takenFrom = dayOffset(-21);
  const takenTo = dayOffset(-17);
  const takenDays = countWorkingDays(takenFrom, takenTo);

  await LeaveRequestModel.create({
    companyId: nexora._id,
    userId: employee._id,
    type: 'annual',
    fromDate: takenFrom,
    toDate: takenTo,
    days: takenDays,
    reason: 'Family wedding',
    status: 'APPROVED',
    decidedBy: hr._id,
    decidedAt: dayOffset(-24),
    decisionNote: 'Approved — enjoy!',
  });
  await LeaveBalanceModel.updateOne(
    { companyId: nexora._id, userId: employee._id, year, type: 'annual' },
    { $inc: { used: takenDays } },
  );

  const pendingFrom = dayOffset(7);
  const pendingTo = dayOffset(11);
  const pendingDays = countWorkingDays(pendingFrom, pendingTo);

  await LeaveRequestModel.create({
    companyId: nexora._id,
    userId: employee._id,
    type: 'casual',
    fromDate: pendingFrom,
    toDate: pendingTo,
    days: pendingDays,
    reason: 'Moving apartments',
    status: 'PENDING',
  });
  await LeaveBalanceModel.updateOne(
    { companyId: nexora._id, userId: employee._id, year, type: 'casual' },
    { $inc: { pending: pendingDays } },
  );

  // Vertex gets its own pending request, so "HR sees only their own tenant's
  // queue" is a claim the permission matrix can actually falsify.
  const vertexFrom = dayOffset(14);
  const vertexTo = dayOffset(18);
  const vertexDays = countWorkingDays(vertexFrom, vertexTo);

  await LeaveRequestModel.create({
    companyId: vertex._id,
    userId: vertexEmployee._id,
    type: 'annual',
    fromDate: vertexFrom,
    toDate: vertexTo,
    days: vertexDays,
    reason: 'Design conference',
    status: 'PENDING',
  });
  await LeaveBalanceModel.updateOne(
    { companyId: vertex._id, userId: vertexEmployee._id, year, type: 'annual' },
    { $inc: { pending: vertexDays } },
  );

  // eslint-disable-next-line no-console
  console.log(
    `📋 Leave: Arjun has ${takenDays} annual used + ${pendingDays} casual pending; Vertex has 1 pending`,
  );

  // eslint-disable-next-line no-console
  console.log('\n✅ Seed complete. Demo logins (password for all):', DEMO_PASSWORD);
  // eslint-disable-next-line no-console
  console.table([
    { tenant: 'Nexora (demo)', role: 'hr', email: 'hr@nexora.com' },
    { tenant: 'Nexora (demo)', role: 'employee', email: 'employee@nexora.com' },
    { tenant: 'Nexora (dev only)', role: 'admin', email: 'admin@nexora.com' },
    { tenant: 'Nexora (dev only)', role: 'it_support', email: 'it@nexora.com' },
    { tenant: 'Vertex (isolation only)', role: 'hr', email: 'hr@vertex.io' },
    { tenant: 'Vertex (isolation only)', role: 'employee', email: 'employee@vertex.io' },
  ]);

  await disconnectDb();
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', err);
  process.exit(1);
});
