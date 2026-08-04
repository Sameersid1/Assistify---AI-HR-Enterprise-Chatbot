/**
 * Seed script — demo-ready from day one (M1 guide §Phase-1).
 *
 * For the Aug 16 demo we seed ONE company (Nexora Technologies) with an HR user
 * and one employee, both ACTIVE with known passwords. The second tenant (Vertex,
 * 24 leaves) and the full 10-user set come later when multi-tenancy is in scope.
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

  // eslint-disable-next-line no-console
  console.log('\n✅ Seed complete. Demo logins (password for all):', DEMO_PASSWORD);
  // eslint-disable-next-line no-console
  console.table([
    { role: 'hr', email: 'hr@nexora.com' },
    { role: 'employee', email: 'employee@nexora.com' },
  ]);

  await disconnectDb();
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', err);
  process.exit(1);
});
