/**
 * Operator script — provision a company's first admin.
 *
 * WHY THIS EXISTS
 * There is no sign-up in Assistify (D20), and the role-creation whitelist (D22)
 * says only a super_admin may create an admin. That leaves a bootstrap problem:
 * the first privileged account in a company cannot come from the UI, because
 * using the UI requires already being logged in.
 *
 * Rather than ship a super_admin *account* — a permanent, internet-facing
 * super-user that can be phished or brute-forced — platform setup is an
 * operator task performed from a terminal by someone who already has database
 * access. Nothing extra is exposed to the internet. This is the same shape as
 * Django's createsuperuser or WordPress's install step.
 *
 * WHAT IT DOES
 * Creates one INVITED admin and prints an activation link. The admin sets their
 * own password from that link — no password is ever typed here, transmitted, or
 * stored by an operator.
 *
 * SAFETY
 * Unlike seed.ts this deletes NOTHING. It refuses to overwrite an existing
 * account and shows the target database before writing, so creating an admin in
 * the wrong place takes a deliberate "yes".
 *
 *   npm run create-admin
 *   npm run create-admin -- --company "Nexora Technologies" --name "Vikram Malhotra" --email vikram@nexora.com --yes
 */
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { env } from '../config/env';
import { connectDb, disconnectDb } from '../config/db';
import { CompanyModel } from '../modules/companies/company.model';
import { UserModel } from '../modules/users/user.model';
import { ensureBalances } from '../modules/leave/leave.service';
import { generateToken } from '../shared/tokens';

/** Invitation lifetime — matches user.service.ts so both paths behave alike. */
const INVITATION_TTL_MS = 72 * 60 * 60 * 1000;

interface Args {
  company?: string;
  newCompany?: string;
  domain?: string;
  annual?: number;
  casual?: number;
  sick?: number;
  name?: string;
  email?: string;
  yes: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { yes: false };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--yes' || flag === '-y') args.yes = true;
    else if (flag === '--company') args.company = argv[++i];
    else if (flag === '--new-company') args.newCompany = argv[++i];
    else if (flag === '--domain') args.domain = argv[++i];
    else if (flag === '--annual') args.annual = Number(argv[++i]);
    else if (flag === '--casual') args.casual = Number(argv[++i]);
    else if (flag === '--sick') args.sick = Number(argv[++i]);
    else if (flag === '--name') args.name = argv[++i];
    else if (flag === '--email') args.email = argv[++i];
  }
  return args;
}

const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function describeTarget(): string {
  const host = env.MONGO_URI.replace(/^mongodb(\+srv)?:\/\/[^@]*@/, '').split(/[/?]/)[0];
  const dbName = env.MONGO_URI.split(/[?]/)[0].split('/').pop() || '(default)';
  const isLocal = /127\.0\.0\.1|localhost/.test(env.MONGO_URI);
  return `${host}/${dbName}${isLocal ? '  (your laptop)' : '  ⚠️  REMOTE'}`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const rl = readline.createInterface({ input, output });
  const ask = async (q: string, fallback?: string): Promise<string> => {
    if (fallback) return fallback;
    return (await rl.question(q)).trim();
  };

  /* eslint-disable no-console */
  console.log('\n  Assistify — create a company admin');
  console.log(`  target: ${describeTarget()}\n`);

  await connectDb();

  // ── Company ───────────────────────────────────────────────────────────────
  const bail = async (msg: string): Promise<never> => {
    console.error(`  ${msg}`);
    await disconnectDb();
    rl.close();
    process.exit(1);
  };

  const companies = await CompanyModel.find({}).sort({ name: 1 });

  /**
   * Create a tenant. Onboarding a new customer must never require seed.ts —
   * that wipes every company. This only ever inserts.
   */
  const createCompany = async (): Promise<NonNullable<typeof company>> => {
    console.log('\n  New company');

    const cname = (await ask('    Name           : ', args.newCompany)).trim();
    if (!cname) await bail('A company name is required.');
    if (companies.some((c) => c.name.toLowerCase() === cname.toLowerCase())) {
      await bail(`"${cname}" already exists. Pick it from the list instead.`);
    }

    const domain = (await ask('    Email domain   : ', args.domain)).trim().toLowerCase();
    if (!DOMAIN_RE.test(domain)) await bail(`"${domain}" is not a valid domain (e.g. acme.com).`);

    // Each tenant sets its own allowances — this is what makes one company show
    // 18 annual days and another 24. Copied onto every user they invite.
    const days = async (label: string, fallback: number, preset?: number): Promise<number> => {
      if (preset !== undefined && Number.isFinite(preset)) return preset;
      const raw = (await ask(`    ${label} [${fallback}] : `)).trim();
      if (!raw) return fallback;
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 0 || n > 365) await bail(`"${raw}" is not a valid number of days.`);
      return n;
    };

    const annual = await days('Annual leave  ', 18, args.annual);
    const casual = await days('Casual leave  ', 8, args.casual);
    const sick = await days('Sick leave    ', 8, args.sick);

    const created = await CompanyModel.create({
      name: cname,
      domain,
      leavePolicy: { annual, casual, sick },
      status: 'ACTIVE',
    });
    console.log(`\n  ✅ Company created: ${created.name} (${annual}/${casual}/${sick} days)`);
    return created;
  };

  let company = args.company
    ? companies.find((c) => c.name.toLowerCase() === args.company!.toLowerCase())
    : undefined;

  if (!company && args.company) {
    const available = companies.length
      ? companies.map((c) => c.name).join(', ')
      : '(none yet — use --new-company to create one)';
    await bail(`No company named "${args.company}". Available: ${available}`);
  }

  if (!company && args.newCompany) {
    company = await createCompany();
  }

  if (!company) {
    if (companies.length === 0) {
      console.log('  No companies yet — creating the first one.');
      company = await createCompany();
    } else {
      console.log('  Companies:');
      companies.forEach((c, i) => console.log(`    ${i + 1}. ${c.name}`));
      const newIndex = companies.length + 1;
      console.log(`    ${newIndex}. + Create a new company`);

      const pick = Number(await ask('\n  Which one? (number) '));
      if (pick === newIndex) {
        company = await createCompany();
      } else {
        company = companies[pick - 1];
        if (!company) await bail('Not a valid choice.');
      }
    }
  }

  // ── Person ────────────────────────────────────────────────────────────────
  const fullName = await ask('  Full name: ', args.name);
  if (!fullName) {
    console.error('  A name is required.');
    await disconnectDb();
    rl.close();
    process.exit(1);
  }

  const email = (await ask('  Work email: ', args.email)).toLowerCase();
  if (!EMAIL_RE.test(email)) {
    console.error(`  "${email}" is not a valid email address.`);
    await disconnectDb();
    rl.close();
    process.exit(1);
  }

  // Email is globally unique (D25) — an address may belong to only one account.
  const clash = await UserModel.findOne({ email });
  if (clash) {
    console.error(`\n  ${email} already exists (role: ${clash.role}, status: ${clash.status}).`);
    console.error('  Nothing was changed. Use a different address, or deactivate that account first.');
    await disconnectDb();
    rl.close();
    process.exit(1);
  }

  // ── Confirm ───────────────────────────────────────────────────────────────
  console.log('\n  About to create:');
  console.log(`    ${fullName} <${email}>`);
  console.log(`    role    : admin`);
  console.log(`    company : ${company.name}`);
  console.log(`    database: ${describeTarget()}`);

  if (!args.yes) {
    const ok = (await rl.question('\n  Create this admin? (yes/no) ')).trim().toLowerCase();
    if (ok !== 'yes' && ok !== 'y') {
      console.log('  Cancelled. Nothing was written.');
      await disconnectDb();
      rl.close();
      return;
    }
  }

  // ── Create ────────────────────────────────────────────────────────────────
  // Same shape as inviteUser(): INVITED, no password, hashed single-use token.
  // invitedBy stays null on purpose — no user invited them, an operator did.
  const token = generateToken(INVITATION_TTL_MS);

  const user = await UserModel.create({
    companyId: company._id,
    email,
    fullName,
    role: 'admin',
    status: 'INVITED',
    department: 'Administration',
    designation: 'Administrator',
    passwordHash: null,
    invitationTokenHash: token.hash,
    invitationExpiresAt: token.expiresAt,
    invitedBy: null,
  });

  await ensureBalances(company._id, user._id);

  const activationUrl = `${env.CLIENT_URL}/activate?token=${token.raw}`;

  console.log('\n  ✅ Admin created.\n');
  console.log(`     ${fullName} <${email}> — ${company.name}`);
  console.log(`     status: INVITED (no password yet)\n`);
  console.log('     Send them this link. It expires in 72 hours:\n');
  console.log(`     ${activationUrl}\n`);
  console.log('     They set their own password from that link — you never see it.');
  console.log('     Once active they can invite HR and IT Support from the app.\n');
  /* eslint-enable no-console */

  await disconnectDb();
  rl.close();
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error('\n  Failed:', err instanceof Error ? err.message : err);
  await disconnectDb().catch(() => undefined);
  process.exit(1);
});
