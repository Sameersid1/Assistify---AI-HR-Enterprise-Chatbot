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
import { connectDb, disconnectDb } from '../config/db';
import { CompanyModel } from '../modules/companies/company.model';
import { UserModel } from '../modules/users/user.model';
import { hashPassword } from '../modules/auth/auth.password';

const DEMO_PASSWORD = 'Password123!';

async function seed(): Promise<void> {
  await connectDb();

  // Idempotent: wipe the demo data so re-running is safe.
  await Promise.all([UserModel.deleteMany({}), CompanyModel.deleteMany({})]);
  // eslint-disable-next-line no-console
  console.log('🧹 Cleared users + companies');

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

  await UserModel.create({
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

  await UserModel.create({
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

  // eslint-disable-next-line no-console
  console.log('\n✅ Seed complete. Demo logins (password for all):', DEMO_PASSWORD);
  // eslint-disable-next-line no-console
  console.table([
    { tenant: 'Nexora (demo)', role: 'hr', email: 'hr@nexora.com' },
    { tenant: 'Nexora (demo)', role: 'employee', email: 'employee@nexora.com' },
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
