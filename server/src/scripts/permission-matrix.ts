/**
 * Permission matrix — the Phase-1 exit gate (M1 guide §Phase-1 step 12).
 *
 * Drives the RUNNING API over HTTP, exactly as the frontend will. It asserts in
 * BOTH directions: that permitted calls succeed AND that forbidden ones are
 * refused with the right status and machine code. A test suite that only checks
 * the happy path cannot detect a tenancy leak.
 *
 * Requires: server running (`npm run dev`) and `npm run seed` already applied,
 * because the isolation checks need the second tenant (Vertex).
 *
 * Run:  npm run test:permissions
 */
import { connectDb, disconnectDb } from '../config/db';
import { UserModel } from '../modules/users/user.model';
import { env } from '../config/env';

const BASE = `http://localhost:${env.PORT}/api/v1`;
const PASSWORD = 'Password123!';
/** Unique per run so the invite check is a real create, never a 409 replay. */
const PROBE_EMAIL = `probe.${Date.now()}@nexora.com`;

interface Res {
  status: number;
  body: any;
}

async function call(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown } = {},
): Promise<Res> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function login(email: string): Promise<{ token: string; userId: string }> {
  const res = await call('POST', '/auth/login', { body: { email, password: PASSWORD } });
  if (res.status !== 200) {
    throw new Error(`Setup failed: could not log in as ${email} (${res.status}). Run \`npm run seed\`.`);
  }
  return { token: res.body.data.accessToken, userId: res.body.data.user.id };
}

// ── assertions ───────────────────────────────────────────────────────────────
let passed = 0;
const failures: string[] = [];

function check(label: string, ok: boolean, detail: string): void {
  if (ok) {
    passed++;
    // eslint-disable-next-line no-console
    console.log(`  ✅ ${label}`);
  } else {
    failures.push(`${label} — ${detail}`);
    // eslint-disable-next-line no-console
    console.log(`  ❌ ${label}\n       ${detail}`);
  }
}

/** Asserts an HTTP status and, when given, the stable machine error code. */
function expectStatus(label: string, res: Res, status: number, code?: string): void {
  const gotCode = res.body?.error?.code;
  const ok = res.status === status && (code === undefined || gotCode === code);
  check(
    label,
    ok,
    `expected ${status}${code ? ` / ${code}` : ''}, got ${res.status}${gotCode ? ` / ${gotCode}` : ''}`,
  );
}

function section(title: string): void {
  // eslint-disable-next-line no-console
  console.log(`\n${title}`);
}

async function run(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`Permission matrix → ${BASE}\n`);

  const nexoraHr = await login('hr@nexora.com');
  const nexoraEmp = await login('employee@nexora.com');
  const vertexHr = await login('hr@vertex.io');

  // Vertex's own id, discovered through Vertex's token — the target Nexora must
  // never be able to touch.
  const vertexList = await call('GET', '/users', { token: vertexHr.token });
  const vertexEmployeeId: string | undefined = vertexList.body?.data?.users?.[0]?.id;
  if (!vertexEmployeeId) throw new Error('Setup failed: Vertex has no employee. Run `npm run seed`.');

  // ── 1. Authentication ──────────────────────────────────────────────────────
  section('1. Authentication');
  const me = await call('GET', '/auth/me', { token: nexoraHr.token });
  check(
    'valid token → /auth/me returns the caller',
    me.status === 200 && me.body?.data?.user?.email === 'hr@nexora.com',
    `got ${me.status} / ${me.body?.data?.user?.email}`,
  );
  expectStatus('no token → 401', await call('GET', '/auth/me'), 401);
  expectStatus(
    'garbage token → 401 TOKEN_INVALID',
    await call('GET', '/auth/me', { token: 'not.a.jwt' }),
    401,
    'TOKEN_INVALID',
  );
  expectStatus(
    'wrong password → 401',
    await call('POST', '/auth/login', { body: { email: 'hr@nexora.com', password: 'WrongPassword1!' } }),
    401,
  );
  expectStatus(
    'unknown email → 401 (no user enumeration)',
    await call('POST', '/auth/login', { body: { email: 'nobody@nexora.com', password: PASSWORD } }),
    401,
  );

  // ── 2. Tenant isolation ────────────────────────────────────────────────────
  // The core of Phase 1. Nexora and Vertex must be invisible to each other even
  // though both callers are legitimately authenticated.
  section('2. Tenant isolation (Nexora ↔ Vertex)');
  const nexoraList = await call('GET', '/users', { token: nexoraHr.token });
  const nexoraEmails: string[] = (nexoraList.body?.data?.users ?? []).map((u: any) => u.email);
  check(
    'Nexora HR list contains zero Vertex users',
    nexoraEmails.length > 0 && nexoraEmails.every((e) => e.endsWith('@nexora.com')),
    `saw ${JSON.stringify(nexoraEmails)}`,
  );
  const vertexEmails: string[] = (vertexList.body?.data?.users ?? []).map((u: any) => u.email);
  check(
    'Vertex HR list contains zero Nexora users',
    vertexEmails.length > 0 && vertexEmails.every((e) => e.endsWith('@vertex.io')),
    `saw ${JSON.stringify(vertexEmails)}`,
  );

  // Cross-tenant writes by explicit id. 404 (not 403) is correct: a foreign id
  // must not even be acknowledged as existing.
  expectStatus(
    'Nexora HR cannot deactivate a Vertex user → 404',
    await call('POST', `/users/${vertexEmployeeId}/deactivate`, { token: nexoraHr.token }),
    404,
  );
  expectStatus(
    'Nexora HR cannot reactivate a Vertex user → 404',
    await call('POST', `/users/${vertexEmployeeId}/reactivate`, { token: nexoraHr.token }),
    404,
  );
  expectStatus(
    'Nexora HR cannot resend an invitation to a Vertex user → 404',
    await call('POST', `/users/${vertexEmployeeId}/resend-invitation`, { token: nexoraHr.token }),
    404,
  );

  // ── 3. Role gates ──────────────────────────────────────────────────────────
  section('3. Role gates');
  expectStatus(
    'employee cannot list users → 403',
    await call('GET', '/users', { token: nexoraEmp.token }),
    403,
  );
  expectStatus(
    'employee cannot invite → 403',
    await call('POST', '/users/invite', {
      token: nexoraEmp.token,
      body: { email: 'x@nexora.com', fullName: 'X', role: 'employee' },
    }),
    403,
  );

  // ── 4. Role-creation whitelist (D22) ───────────────────────────────────────
  section('4. Role-creation whitelist (D22)');
  // Two layers may refuse, and either is a pass — what matters is that the user
  // is not created. `super_admin` is absent from the invite enum entirely, so
  // Zod rejects it at 400 before the whitelist is ever consulted; the rest reach
  // the service and come back 403 ROLE_NOT_ALLOWED.
  for (const role of ['hr', 'admin', 'super_admin', 'it_support']) {
    const res = await call('POST', '/users/invite', {
      token: nexoraHr.token,
      body: { email: `probe.${role}@nexora.com`, fullName: 'Probe', role },
    });
    const refusedBySchema = res.status === 400 && res.body?.error?.code === 'VALIDATION_ERROR';
    const refusedByWhitelist = res.status === 403 && res.body?.error?.code === 'ROLE_NOT_ALLOWED';
    check(
      `HR cannot invite role "${role}" (${refusedBySchema ? 'schema' : 'whitelist'})`,
      refusedBySchema || refusedByWhitelist,
      `expected 400/VALIDATION_ERROR or 403/ROLE_NOT_ALLOWED, got ${res.status} / ${res.body?.error?.code}`,
    );
  }
  const invite = await call('POST', '/users/invite', {
    token: nexoraHr.token,
    body: { email: PROBE_EMAIL, fullName: 'Probe Employee', role: 'employee' },
  });
  check(
    'HR CAN invite role "employee" → 201 with activation link',
    invite.status === 201 && typeof invite.body?.data?.activationUrl === 'string',
    `got ${invite.status} / ${JSON.stringify(invite.body?.error ?? invite.body?.data?.activationUrl)}`,
  );
  check(
    'invited user inherits the inviter\'s companyId, not one from the body',
    invite.body?.data?.user?.companyId === me.body?.data?.user?.companyId,
    `invited into ${invite.body?.data?.user?.companyId}, inviter is in ${me.body?.data?.user?.companyId}`,
  );

  // ── 5. Ownership checks beyond role ────────────────────────────────────────
  section('5. Ownership (role alone is not enough)');
  expectStatus(
    'HR cannot deactivate their own account → 403 SELF_DEACTIVATE',
    await call('POST', `/users/${nexoraHr.userId}/deactivate`, { token: nexoraHr.token }),
    403,
    'SELF_DEACTIVATE',
  );

  // ── cleanup ────────────────────────────────────────────────────────────────
  await connectDb();
  await UserModel.deleteOne({ email: PROBE_EMAIL });
  await disconnectDb();

  // eslint-disable-next-line no-console
  console.log(`\n${failures.length ? '❌' : '✅'} ${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    // eslint-disable-next-line no-console
    console.log(failures.map((f) => `   • ${f}`).join('\n'));
    process.exit(1);
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('\nPermission matrix aborted:', err instanceof Error ? err.message : err);
  process.exit(1);
});
