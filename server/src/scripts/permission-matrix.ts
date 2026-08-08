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
import { LeaveBalanceModel, LeaveRequestModel, LEAVE_TYPES } from '../modules/leave/leave.model';
import { env } from '../config/env';

const BASE = `http://localhost:${env.PORT}/api/v1`;
const PASSWORD = 'Password123!';
/** Unique per run so the invite check is a real create, never a 409 replay. */
const PROBE_EMAIL = `probe.${Date.now()}@nexora.com`;
const PROBE_WORK_EMAIL = `probe.work.${Date.now()}@nexora.com`;
const PROBE_PERSONAL_EMAIL = `probe.personal.${Date.now()}@gmail.com`;
const PROBE_HR_EMAIL = `probe.hr.${Date.now()}@nexora.com`;

/** Leave requests this run created — deleted again in cleanup so reruns are idempotent. */
const createdRequestIds: string[] = [];

const DAY_MS = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD`, `offset` days from today. Ranges are 5 days wide so they always
 *  contain working days regardless of which weekday the matrix is run on. */
function day(offset: number): string {
  return new Date(Date.now() + offset * DAY_MS).toISOString().slice(0, 10);
}

function nextWeekendDay(weekday: 6 | 0): string {
  const d = new Date(Date.now() + 7 * DAY_MS);
  while (d.getUTCDay() !== weekday) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
const nextSaturday = (): string => nextWeekendDay(6);
const nextSunday = (): string => {
  const sat = new Date(`${nextSaturday()}T00:00:00.000Z`);
  return new Date(sat.getTime() + DAY_MS).toISOString().slice(0, 10);
};

/**
 * Recompute used/pending for the given users from the leave requests that still
 * exist. Cheaper and more honest than trying to reverse each mutation the matrix
 * made: the balance is a projection of the request log, so rebuild it from there.
 */
async function rebuildBalances(userIds: string[]): Promise<void> {
  const year = new Date().getUTCFullYear();
  for (const userId of userIds) {
    const requests = await LeaveRequestModel.find({ userId });
    for (const type of LEAVE_TYPES) {
      const forType = requests.filter(
        (r) => r.type === type && r.fromDate.getUTCFullYear() === year,
      );
      const used = forType.filter((r) => r.status === 'APPROVED').reduce((n, r) => n + r.days, 0);
      const pending = forType.filter((r) => r.status === 'PENDING').reduce((n, r) => n + r.days, 0);
      await LeaveBalanceModel.updateOne({ userId, year, type }, { $set: { used, pending } });
    }
  }
}

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

  // ── 6. Leave ───────────────────────────────────────────────────────────────
  // The leave module is where role, ownership and tenancy all apply at once:
  // HR may approve, but not their own; an employee owns their request, but may
  // not see anyone else's; and neither tenant's queue may contain the other's.
  section('6. Leave (apply → approve state machine)');

  const nexoraAdmin = await login('admin@nexora.com');
  const nexoraIt = await login('it@nexora.com');
  const vertexEmp = await login('employee@vertex.io');

  const annualOf = (res: Res): any =>
    (res.body?.data?.balances ?? []).find((b: any) => b.type === 'annual');

  const empBalanceBefore = await call('GET', '/leave/my-balance', { token: nexoraEmp.token });
  const empAnnualBefore = annualOf(empBalanceBefore);
  check(
    'employee balance reflects Nexora policy (18 annual) and available = allocated − used − pending',
    empAnnualBefore?.allocated === 18 &&
      empAnnualBefore.available === empAnnualBefore.allocated - empAnnualBefore.used - empAnnualBefore.pending,
    `got ${JSON.stringify(empAnnualBefore)}`,
  );

  const vertexBalance = annualOf(await call('GET', '/leave/my-balance', { token: vertexEmp.token }));
  check(
    'Vertex employee gets Vertex\'s policy (24 annual), not Nexora\'s',
    vertexBalance?.allocated === 24,
    `got ${JSON.stringify(vertexBalance)}`,
  );

  // Apply — days are computed server-side, and the balance is reserved immediately.
  const applied = await call('POST', '/leave/requests', {
    token: nexoraEmp.token,
    body: { type: 'annual', fromDate: day(30), toDate: day(34), reason: 'Matrix probe leave' },
  });
  check(
    'employee CAN apply → 201 PENDING, working days counted server-side',
    applied.status === 201 &&
      applied.body?.data?.request?.status === 'PENDING' &&
      applied.body.data.request.days >= 3,
    `got ${applied.status} / ${JSON.stringify(applied.body?.error ?? applied.body?.data?.request)}`,
  );
  const requestId: string = applied.body?.data?.request?.id;
  const requestDays: number = applied.body?.data?.request?.days ?? 0;
  if (requestId) createdRequestIds.push(requestId);

  check(
    'applying reserves the days as pending, not used',
    applied.body?.data?.balance?.pending === empAnnualBefore.pending + requestDays &&
      applied.body.data.balance.used === empAnnualBefore.used,
    `pending ${empAnnualBefore?.pending} → ${applied.body?.data?.balance?.pending}, used ${applied.body?.data?.balance?.used}`,
  );

  expectStatus(
    'overlapping dates → 409 LEAVE_OVERLAP',
    await call('POST', '/leave/requests', {
      token: nexoraEmp.token,
      body: { type: 'casual', fromDate: day(31), toDate: day(33), reason: 'Clash' },
    }),
    409,
    'LEAVE_OVERLAP',
  );
  expectStatus(
    'more days than the balance allows → 409 LEAVE_INSUFFICIENT_BALANCE',
    await call('POST', '/leave/requests', {
      token: nexoraEmp.token,
      body: { type: 'annual', fromDate: day(60), toDate: day(120), reason: 'Too long' },
    }),
    409,
    'LEAVE_INSUFFICIENT_BALANCE',
  );
  expectStatus(
    'leave starting in the past → 400 LEAVE_PAST_DATE',
    await call('POST', '/leave/requests', {
      token: nexoraEmp.token,
      body: { type: 'sick', fromDate: day(-5), toDate: day(-2), reason: 'Backdated' },
    }),
    400,
    'LEAVE_PAST_DATE',
  );
  expectStatus(
    'a weekend-only range → 400 LEAVE_NO_WORKING_DAYS',
    await call('POST', '/leave/requests', {
      token: nexoraEmp.token,
      body: { type: 'casual', fromDate: nextSaturday(), toDate: nextSunday(), reason: 'Weekend' },
    }),
    400,
    'LEAVE_NO_WORKING_DAYS',
  );
  // A client that claims its 5-day holiday costs 0 days must not be believed:
  // `days` is stripped by the schema and recomputed from the dates.
  const spoofed = await call('POST', '/leave/requests', {
    token: nexoraEmp.token,
    body: {
      type: 'sick',
      fromDate: day(70),
      toDate: day(74),
      reason: 'Matrix probe (spoofed day count)',
      days: 0,
    },
  });
  if (spoofed.body?.data?.request?.id) createdRequestIds.push(spoofed.body.data.request.id);
  check(
    'a client-supplied day count is ignored — the server counts the dates',
    spoofed.status === 201 && spoofed.body?.data?.request?.days >= 3,
    `got ${spoofed.status} / days=${spoofed.body?.data?.request?.days}`,
  );

  // Role gates — §5 says IT must never see leave data at all.
  expectStatus(
    'employee cannot read the approval queue → 403',
    await call('GET', '/leave/requests', { token: nexoraEmp.token }),
    403,
  );
  expectStatus(
    'it_support cannot read the approval queue → 403',
    await call('GET', '/leave/requests', { token: nexoraIt.token }),
    403,
  );
  expectStatus(
    'it_support cannot approve leave → 403',
    await call('POST', `/leave/requests/${requestId}/approve`, { token: nexoraIt.token, body: {} }),
    403,
  );

  // Tenancy — the queue and every decision route must be tenant-pure.
  const hrQueue = await call('GET', '/leave/requests', { token: nexoraHr.token });
  const queueEmails: string[] = (hrQueue.body?.data?.requests ?? []).map(
    (r: any) => r.employee?.email ?? '',
  );
  check(
    'Nexora HR queue contains zero Vertex requests',
    queueEmails.length > 0 && queueEmails.every((e) => e.endsWith('@nexora.com')),
    `saw ${JSON.stringify(queueEmails)}`,
  );
  expectStatus(
    'Vertex HR cannot approve a Nexora request → 404 (existence not acknowledged)',
    await call('POST', `/leave/requests/${requestId}/approve`, { token: vertexHr.token, body: {} }),
    404,
  );
  expectStatus(
    'Vertex HR cannot reject a Nexora request → 404',
    await call('POST', `/leave/requests/${requestId}/reject`, {
      token: vertexHr.token,
      body: { note: 'no' },
    }),
    404,
  );
  expectStatus(
    'a malformed request id → 404, never a 500 CastError',
    await call('POST', '/leave/requests/not-an-object-id/approve', {
      token: nexoraHr.token,
      body: {},
    }),
    404,
  );

  // Ownership — HR approves other people's leave, never their own.
  const hrApplied = await call('POST', '/leave/requests', {
    token: nexoraHr.token,
    body: { type: 'sick', fromDate: day(40), toDate: day(44), reason: 'Matrix probe (HR)' },
  });
  const hrRequestId: string = hrApplied.body?.data?.request?.id;
  if (hrRequestId) createdRequestIds.push(hrRequestId);
  expectStatus(
    'HR cannot approve their OWN leave → 403 LEAVE_SELF_DECISION',
    await call('POST', `/leave/requests/${hrRequestId}/approve`, { token: nexoraHr.token, body: {} }),
    403,
    'LEAVE_SELF_DECISION',
  );
  check(
    'admin CAN approve HR\'s leave → 200 APPROVED',
    (await call('POST', `/leave/requests/${hrRequestId}/approve`, { token: nexoraAdmin.token, body: {} }))
      .body?.data?.request?.status === 'APPROVED',
    'admin approval did not land',
  );
  expectStatus(
    'an employee cannot cancel someone else\'s request → 403 LEAVE_NOT_OWNER',
    await call('POST', `/leave/requests/${requestId}/cancel`, { token: nexoraHr.token }),
    403,
    'LEAVE_NOT_OWNER',
  );

  // The state machine itself.
  const approved = await call('POST', `/leave/requests/${requestId}/approve`, {
    token: nexoraHr.token,
    body: { note: 'Approved by the matrix' },
  });
  check(
    'HR CAN approve an employee request → 200 APPROVED',
    approved.status === 200 && approved.body?.data?.request?.status === 'APPROVED',
    `got ${approved.status} / ${JSON.stringify(approved.body?.error ?? approved.body?.data?.request?.status)}`,
  );
  const empAnnualAfter = annualOf(await call('GET', '/leave/my-balance', { token: nexoraEmp.token }));
  check(
    'approval moves the reservation from pending to used (available unchanged)',
    empAnnualAfter?.used === empAnnualBefore.used + requestDays &&
      empAnnualAfter.pending === empAnnualBefore.pending &&
      empAnnualAfter.available === empAnnualBefore.available - requestDays,
    `before ${JSON.stringify(empAnnualBefore)} after ${JSON.stringify(empAnnualAfter)}`,
  );
  expectStatus(
    'approving twice → 409 LEAVE_NOT_PENDING (terminal states are terminal)',
    await call('POST', `/leave/requests/${requestId}/approve`, { token: nexoraHr.token, body: {} }),
    409,
    'LEAVE_NOT_PENDING',
  );
  expectStatus(
    'rejecting an already-approved request → 409 LEAVE_NOT_PENDING',
    await call('POST', `/leave/requests/${requestId}/reject`, {
      token: nexoraHr.token,
      body: { note: 'too late' },
    }),
    409,
    'LEAVE_NOT_PENDING',
  );
  expectStatus(
    'a rejection must carry a reason → 400',
    await call('POST', `/leave/requests/${requestId}/reject`, { token: nexoraHr.token, body: {} }),
    400,
  );

  // Cancelling releases the reservation — the balance must come all the way back.
  const toCancel = await call('POST', '/leave/requests', {
    token: nexoraEmp.token,
    body: { type: 'sick', fromDate: day(50), toDate: day(54), reason: 'Matrix probe (cancel)' },
  });
  const cancelId: string = toCancel.body?.data?.request?.id;
  if (cancelId) createdRequestIds.push(cancelId);
  const sickBefore = toCancel.body?.data?.balance;
  const cancelled = await call('POST', `/leave/requests/${cancelId}/cancel`, { token: nexoraEmp.token });
  const sickAfter = (
    await call('GET', '/leave/my-balance', { token: nexoraEmp.token })
  ).body?.data?.balances?.find((b: any) => b.type === 'sick');
  check(
    'the owner CAN cancel a pending request, and the reserved days come back',
    cancelled.body?.data?.request?.status === 'CANCELLED' &&
      sickAfter?.pending === sickBefore.pending - toCancel.body.data.request.days,
    `status ${cancelled.body?.data?.request?.status}, pending ${sickBefore?.pending} → ${sickAfter?.pending}`,
  );
  expectStatus(
    'cancelling twice → 409 LEAVE_NOT_PENDING',
    await call('POST', `/leave/requests/${cancelId}/cancel`, { token: nexoraEmp.token }),
    409,
    'LEAVE_NOT_PENDING',
  );

  // ── 7. Invitation delivery + resend escalation ────────────────────────────
  section('7. Invitation delivery');

  const withPersonal = await call('POST', '/users/invite', {
    token: nexoraHr.token,
    body: {
      email: PROBE_WORK_EMAIL,
      personalEmail: PROBE_PERSONAL_EMAIL,
      fullName: 'Probe Personal',
      role: 'employee',
    },
  });
  check(
    'the invitation is emailed to the PERSONAL address, not the work one',
    withPersonal.body?.data?.invitationSentTo === PROBE_PERSONAL_EMAIL,
    `sent to ${withPersonal.body?.data?.invitationSentTo}`,
  );
  check(
    'the work email stays the login identity',
    withPersonal.body?.data?.user?.email === PROBE_WORK_EMAIL,
    `identity is ${withPersonal.body?.data?.user?.email}`,
  );

  const rawToken = new URL(withPersonal.body?.data?.activationUrl ?? 'http://x/').searchParams.get(
    'token',
  );
  const invitationInfo = await call('GET', `/auth/invitation/${rawToken}`);
  check(
    'the activation page can read company name and destination inbox',
    invitationInfo.body?.data?.companyName === 'Nexora Technologies' &&
      invitationInfo.body.data.invitationSentTo === PROBE_PERSONAL_EMAIL,
    `got ${JSON.stringify(invitationInfo.body?.data)}`,
  );

  /**
   * The escalation this closes: admin invites an HR who has not activated, HR
   * calls resend on them, and the response hands HR a live activation link for
   * an account outranking their own. D22 has to gate resend, not just invite.
   */
  const pendingHr = await call('POST', '/users/invite', {
    token: nexoraAdmin.token,
    body: { email: PROBE_HR_EMAIL, fullName: 'Probe Pending HR', role: 'hr' },
  });
  check(
    'admin CAN invite an hr (whitelist allows it)',
    pendingHr.status === 201,
    `got ${pendingHr.status} / ${JSON.stringify(pendingHr.body?.error)}`,
  );
  expectStatus(
    'HR cannot resend an invitation to a pending HR → 403 (no escalation via resend)',
    await call('POST', `/users/${pendingHr.body?.data?.user?.id}/resend-invitation`, {
      token: nexoraHr.token,
    }),
    403,
    'ROLE_NOT_ALLOWED',
  );
  expectStatus(
    'a malformed user id on resend → 404, never a 500 CastError',
    await call('POST', '/users/not-an-object-id/resend-invitation', { token: nexoraHr.token }),
    404,
  );

  // ── cleanup ────────────────────────────────────────────────────────────────
  // Delete this run's leave requests, then rebuild the affected balances from
  // the requests that remain. Without this, every run would permanently consume
  // days from the seeded users and the matrix would eventually fail on itself.
  await connectDb();
  await UserModel.deleteMany({
    email: { $in: [PROBE_EMAIL, PROBE_WORK_EMAIL, PROBE_HR_EMAIL] },
  });
  await LeaveRequestModel.deleteMany({ _id: { $in: createdRequestIds } });
  await rebuildBalances([nexoraEmp.userId, nexoraHr.userId]);
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
