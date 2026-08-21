import type { Types } from 'mongoose';
import { LeaveBalanceModel, LeaveRequestModel, LEAVE_TYPES, type LeaveType } from './leave.model';
import { CompanyModel } from '../companies/company.model';
import { UserModel } from '../users/user.model';
import * as auditService from '../audit/audit.service';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../shared/errors';
import { scoped } from '../../shared/tenantQuery';
import { countWorkingDays, startOfTodayUtc, toUtcDate } from '../../shared/workdays';
import type { AuthContext } from '../../shared/types';
import type { ApplyLeaveInput, ListLeaveQuery } from './leave.schema';

export interface PublicLeaveBalance {
  type: LeaveType;
  year: number;
  allocated: number;
  used: number;
  pending: number;
  available: number;
}

export interface PublicLeaveRequest {
  id: string;
  type: LeaveType;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: string;
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string;
  /** Present only on the HR queue, where the request belongs to someone else. */
  employee?: { id: string; fullName: string; email: string; department: string | null };
}

const asDateString = (d: Date): string => d.toISOString().slice(0, 10);

/** The applicant's name, copied into the audit entry so it survives a rename. */
async function nameOf(userId: unknown): Promise<string | null> {
  const u = await UserModel.findById(userId).select('fullName');
  return u?.fullName ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPublicBalance(balance: any): PublicLeaveBalance {
  return {
    type: balance.type,
    year: balance.year,
    allocated: balance.allocated,
    used: balance.used,
    pending: balance.pending,
    available: balance.allocated - balance.used - balance.pending,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPublicRequest(request: any): PublicLeaveRequest {
  const employee = request.userId && typeof request.userId === 'object' && request.userId.fullName
    ? {
        id: request.userId._id.toString(),
        fullName: request.userId.fullName,
        email: request.userId.email,
        department: request.userId.department ?? null,
      }
    : undefined;

  return {
    id: request._id.toString(),
    type: request.type,
    fromDate: asDateString(request.fromDate),
    toDate: asDateString(request.toDate),
    days: request.days,
    reason: request.reason,
    status: request.status,
    decisionNote: request.decisionNote ?? null,
    decidedAt: request.decidedAt ? request.decidedAt.toISOString() : null,
    createdAt: request.createdAt.toISOString(),
    ...(employee ? { employee } : {}),
  };
}

/**
 * Provision this year's balance rows from the company's leave policy.
 *
 * Idempotent, and `$setOnInsert` on `allocated` is deliberate: if HR raises the
 * annual allowance in September, nobody's already-consumed days are rewritten —
 * the new figure applies from the next provisioning year.
 *
 * Called at invitation time (so a new hire has balances before they log in) and
 * lazily on read/apply, because users seeded before this module existed have none.
 */
export interface Entitlement {
  annual: number;
  casual: number;
  sick: number;
}

/**
 * What one engagement type is entitled to at this company.
 *
 * The single place that answers "how many days does this person get". Both the
 * balance allocator below and the assistant's policy tool go through it, which
 * is what stops the two disagreeing — an intern being allocated six days while
 * being told they have eighteen is a contradiction the person sees, and it is
 * exactly what happened before this existed.
 */
export function entitlementFor(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  company: any,
  employmentType: string | null | undefined,
): Entitlement {
  const base = company.leavePolicy;
  const override = employmentType
    ? company.leavePolicyByEmploymentType?.[employmentType]
    : undefined;

  // An override may set only some types; each falls back independently.
  return {
    annual: override?.annual ?? base.annual,
    casual: override?.casual ?? base.casual,
    sick: override?.sick ?? base.sick,
  };
}

export async function ensureBalances(
  companyId: Types.ObjectId,
  userId: Types.ObjectId,
  year: number = new Date().getUTCFullYear(),
): Promise<void> {
  const [company, user] = await Promise.all([
    CompanyModel.findById(companyId).select('leavePolicy leavePolicyByEmploymentType'),
    UserModel.findById(userId).select('employmentType'),
  ]);
  if (!company) throw new NotFoundError('Company not found');

  const entitlement = entitlementFor(company, user?.employmentType);

  await LeaveBalanceModel.bulkWrite(
    LEAVE_TYPES.map((type) => ({
      updateOne: {
        filter: { companyId, userId, year, type },
        // $setOnInsert, so an existing balance is never rewritten. Someone's
        // allocation is a record of what they were granted for that year, not a
        // live view of current policy — changing policy in March must not
        // silently remove days a person has already booked against.
        update: { $setOnInsert: { allocated: entitlement[type], used: 0, pending: 0 } },
        upsert: true,
      },
    })),
  );
}

/** GET /leave/my-balance — reads the token, takes no parameter (team guide §3, rule 3). */
export async function getMyBalances(auth: AuthContext): Promise<PublicLeaveBalance[]> {
  const year = new Date().getUTCFullYear();
  await ensureBalances(auth.companyId, auth.userId, year);

  const balances = await LeaveBalanceModel.find(scoped(auth, { userId: auth.userId, year }));
  // Return in policy order (annual, casual, sick) rather than insertion order.
  return LEAVE_TYPES.map((type) => balances.find((b) => b.type === type))
    .filter((b): b is NonNullable<typeof b> => Boolean(b))
    .map(toPublicBalance);
}

/**
 * POST /leave/requests — apply.
 *
 * Order matters: everything cheap and certain is rejected before we touch a
 * balance, so a failed application never leaves days reserved.
 */
export async function applyForLeave(
  auth: AuthContext,
  input: ApplyLeaveInput,
): Promise<{ request: PublicLeaveRequest; balance: PublicLeaveBalance }> {
  const from = toUtcDate(input.fromDate);
  const to = toUtcDate(input.toDate);

  if (to < from) {
    throw new ValidationError('toDate cannot be before fromDate', 'LEAVE_INVALID_RANGE');
  }
  if (from < startOfTodayUtc()) {
    throw new ValidationError('Leave cannot start in the past', 'LEAVE_PAST_DATE');
  }
  if (from.getUTCFullYear() !== to.getUTCFullYear()) {
    throw new ValidationError(
      'A request cannot span two calendar years — split it',
      'LEAVE_CROSS_YEAR',
    );
  }

  const days = countWorkingDays(from, to);
  if (days === 0) {
    throw new ValidationError(
      'That range contains no working days',
      'LEAVE_NO_WORKING_DAYS',
    );
  }

  // An employee cannot be on leave twice at once. CANCELLED/REJECTED ranges are
  // free to reuse, so only live requests block.
  const clash = await LeaveRequestModel.findOne(
    scoped(auth, {
      userId: auth.userId,
      status: { $in: ['PENDING', 'APPROVED'] },
      fromDate: { $lte: to },
      toDate: { $gte: from },
    }),
  );
  if (clash) {
    throw new ConflictError(
      `Overlaps an existing ${clash.status.toLowerCase()} request (${asDateString(clash.fromDate)} → ${asDateString(clash.toDate)})`,
      'LEAVE_OVERLAP',
    );
  }

  const year = from.getUTCFullYear();
  await ensureBalances(auth.companyId, auth.userId, year);

  // Reserve atomically. The $expr guard means two requests racing for the last
  // 2 days cannot both succeed — the second matches no document.
  const balance = await LeaveBalanceModel.findOneAndUpdate(
    {
      companyId: auth.companyId,
      userId: auth.userId,
      year,
      type: input.type,
      $expr: {
        $gte: [{ $subtract: [{ $subtract: ['$allocated', '$used'] }, '$pending'] }, days],
      },
    },
    { $inc: { pending: days } },
    { new: true },
  );

  if (!balance) {
    const current = await LeaveBalanceModel.findOne({
      companyId: auth.companyId,
      userId: auth.userId,
      year,
      type: input.type,
    });
    const available = current ? current.allocated - current.used - current.pending : 0;
    throw new ConflictError(
      `You have ${available} ${input.type} day(s) available but requested ${days}`,
      'LEAVE_INSUFFICIENT_BALANCE',
    );
  }

  try {
    const request = await LeaveRequestModel.create({
      companyId: auth.companyId,
      userId: auth.userId,
      type: input.type,
      fromDate: from,
      toDate: to,
      days,
      reason: input.reason,
      status: 'PENDING',
    });
    return { request: toPublicRequest(request), balance: toPublicBalance(balance) };
  } catch (err) {
    // Never strand a reservation behind a failed insert.
    await LeaveBalanceModel.updateOne({ _id: balance._id }, { $inc: { pending: -days } });
    throw err;
  }
}

/** GET /leave/my-requests */
export async function listMyRequests(
  auth: AuthContext,
  query: ListLeaveQuery,
): Promise<PublicLeaveRequest[]> {
  const filter: Record<string, unknown> = { userId: auth.userId };
  if (query.status) filter.status = query.status;
  if (query.type) filter.type = query.type;

  const requests = await LeaveRequestModel.find(scoped(auth, filter)).sort({ fromDate: -1 });
  return requests.map(toPublicRequest);
}

/** GET /leave/requests — the HR queue, tenant-wide. */
export async function listCompanyRequests(
  auth: AuthContext,
  query: ListLeaveQuery,
): Promise<PublicLeaveRequest[]> {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.type) filter.type = query.type;

  const requests = await LeaveRequestModel.find(scoped(auth, filter))
    .populate('userId', 'fullName email department')
    .sort({ status: 1, fromDate: -1 });
  return requests.map(toPublicRequest);
}

/**
 * Load a request for a decision, enforcing tenancy, the state machine, and the
 * rule that nobody decides their own leave — HR included.
 */
async function loadPendingForDecision(auth: AuthContext, requestId: Types.ObjectId) {
  const request = await LeaveRequestModel.findOne(scoped(auth, { _id: requestId }));
  if (!request) throw new NotFoundError('Leave request not found');

  if (request.userId.equals(auth.userId)) {
    throw new ForbiddenError(
      'You cannot decide your own leave request',
      'LEAVE_SELF_DECISION',
    );
  }
  if (request.status !== 'PENDING') {
    throw new ConflictError(
      `Request is already ${request.status.toLowerCase()}`,
      'LEAVE_NOT_PENDING',
    );
  }
  return request;
}

/** POST /leave/requests/:id/approve — reserved days become used days. */
export async function approveLeave(
  auth: AuthContext,
  requestId: Types.ObjectId,
  note?: string,
): Promise<PublicLeaveRequest> {
  const request = await loadPendingForDecision(auth, requestId);

  await LeaveBalanceModel.updateOne(
    {
      companyId: request.companyId,
      userId: request.userId,
      year: request.fromDate.getUTCFullYear(),
      type: request.type,
    },
    { $inc: { pending: -request.days, used: request.days } },
  );

  request.status = 'APPROVED';
  request.decidedBy = auth.userId;
  request.decidedAt = new Date();
  request.decisionNote = note ?? null;
  await request.save();

  await auditService.record(
    auth,
    'LEAVE_APPROVED',
    `Approved ${request.days} day(s) ${request.type} leave, ${asDateString(request.fromDate)} to ${asDateString(request.toDate)}`,
    { id: request.userId, name: await nameOf(request.userId) },
  );

  return toPublicRequest(request);
}

/** POST /leave/requests/:id/reject — the reservation goes back to the employee. */
export async function rejectLeave(
  auth: AuthContext,
  requestId: Types.ObjectId,
  note: string,
): Promise<PublicLeaveRequest> {
  const request = await loadPendingForDecision(auth, requestId);

  await releaseReservation(request);

  request.status = 'REJECTED';
  request.decidedBy = auth.userId;
  request.decidedAt = new Date();
  request.decisionNote = note;
  await request.save();

  await auditService.record(
    auth,
    'LEAVE_REJECTED',
    `Rejected ${request.days} day(s) ${request.type} leave, ${asDateString(request.fromDate)} to ${asDateString(request.toDate)} — "${note}"`,
    { id: request.userId, name: await nameOf(request.userId) },
  );

  return toPublicRequest(request);
}

/**
 * POST /leave/requests/:id/cancel — withdrawal by the applicant.
 * Ownership, not role: HR cancelling someone else's request would be a decision,
 * and decisions are approve/reject.
 */
export async function cancelLeave(
  auth: AuthContext,
  requestId: Types.ObjectId,
): Promise<PublicLeaveRequest> {
  const request = await LeaveRequestModel.findOne(scoped(auth, { _id: requestId }));
  if (!request) throw new NotFoundError('Leave request not found');

  if (!request.userId.equals(auth.userId)) {
    throw new ForbiddenError('You can only cancel your own leave request', 'LEAVE_NOT_OWNER');
  }
  if (request.status !== 'PENDING') {
    throw new ConflictError(
      `Request is already ${request.status.toLowerCase()}`,
      'LEAVE_NOT_PENDING',
    );
  }

  await releaseReservation(request);

  request.status = 'CANCELLED';
  request.decidedAt = new Date();
  await request.save();

  return toPublicRequest(request);
}

/** Give reserved days back. Clamped so a balance can never go negative. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function releaseReservation(request: any): Promise<void> {
  await LeaveBalanceModel.updateOne(
    {
      companyId: request.companyId,
      userId: request.userId,
      year: request.fromDate.getUTCFullYear(),
      type: request.type,
      pending: { $gte: request.days },
    },
    { $inc: { pending: -request.days } },
  );
}
