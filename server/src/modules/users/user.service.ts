import { UserModel } from './user.model';
import { CompanyModel } from '../companies/company.model';
import { ensureBalances } from '../leave/leave.service';
import { generateToken, INVITATION_TTL_MS } from '../../shared/tokens';
import { env } from '../../config/env';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors';
import type { AuthContext, Role } from '../../shared/types';
import type { InviteInput } from './user.schema';

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  companyId: string;
  employeeId?: string | null;
  department?: string | null;
  designation?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toPublicUser(user: any): PublicUser {
  return {
    id: user._id.toString(),
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    companyId: user.companyId.toString(),
    employeeId: user.employeeId ?? null,
    department: user.department ?? null,
    designation: user.designation ?? null,
  };
}

/**
 * Role-creation whitelist (D22). A WHITELIST, not a rank comparison.
 * Enforced in the service layer, never only in the UI.
 *   super_admin → admin        admin → hr, it_support
 *   hr → employee              it_support, employee → nobody
 * Note: HR deliberately cannot create HR — contains privilege escalation.
 */
const ROLE_CREATE_WHITELIST: Record<Role, Role[]> = {
  super_admin: ['admin'],
  admin: ['hr', 'it_support'],
  hr: ['employee'],
  it_support: [],
  employee: [],
};

export interface InviteResult {
  user: PublicUser;
  /** Raw activation token — shown once in the HR UI ("Copy link"). Never stored raw. */
  activationUrl: string;
}

export async function inviteUser(
  auth: AuthContext,
  input: InviteInput,
): Promise<InviteResult> {
  const allowed = ROLE_CREATE_WHITELIST[auth.role] ?? [];
  if (!allowed.includes(input.role)) {
    throw new ForbiddenError(
      `Your role (${auth.role}) cannot create a user with role "${input.role}"`,
      'ROLE_NOT_ALLOWED',
    );
  }

  const email = input.email.toLowerCase().trim();
  const existing = await UserModel.findOne({ email });
  if (existing) {
    throw new ConflictError('A user with this email already exists', 'EMAIL_TAKEN');
  }

  const token = generateToken(INVITATION_TTL_MS);

  const user = await UserModel.create({
    // ⚠️ companyId comes from the inviter's JWT — NEVER from the request body.
    companyId: auth.companyId,
    email,
    fullName: input.fullName,
    role: input.role,
    status: 'INVITED',
    employeeId: input.employeeId,
    department: input.department,
    designation: input.designation,
    dateOfJoining: input.dateOfJoining ? new Date(input.dateOfJoining) : undefined,
    reportingManagerId: input.reportingManagerId ?? null,
    passwordHash: null,
    invitationTokenHash: token.hash,
    invitationExpiresAt: token.expiresAt,
    invitedBy: auth.userId,
  });

  // Copy the company's leave policy onto the new hire now, so their balance
  // exists the moment they activate rather than being created on first read.
  await ensureBalances(auth.companyId, user._id);

  return {
    user: toPublicUser(user),
    activationUrl: `${env.CLIENT_URL}/activate?token=${token.raw}`,
  };
}

/** Regenerate the invitation token for a still-INVITED user. */
export async function resendInvitation(
  auth: AuthContext,
  targetId: string,
): Promise<InviteResult> {
  const user = await UserModel.findOne({ _id: targetId, companyId: auth.companyId });
  if (!user) throw new NotFoundError('User not found');
  if (user.status !== 'INVITED') {
    throw new ConflictError('User is already active or deactivated', 'NOT_INVITED');
  }

  const token = generateToken(INVITATION_TTL_MS);
  user.invitationTokenHash = token.hash;
  user.invitationExpiresAt = token.expiresAt;
  await user.save();

  return {
    user: toPublicUser(user),
    activationUrl: `${env.CLIENT_URL}/activate?token=${token.raw}`,
  };
}

/** Deactivate (never delete). Kills all sessions by clearing refresh hashes. */
export async function deactivateUser(
  auth: AuthContext,
  targetId: string,
): Promise<PublicUser> {
  if (auth.userId.equals(targetId)) {
    throw new ForbiddenError('You cannot deactivate your own account', 'SELF_DEACTIVATE');
  }
  const user = await UserModel.findOne({ _id: targetId, companyId: auth.companyId });
  if (!user) throw new NotFoundError('User not found');

  user.status = 'DEACTIVATED';
  user.refreshTokenHashes = [];
  await user.save();
  return toPublicUser(user);
}

export async function reactivateUser(
  auth: AuthContext,
  targetId: string,
): Promise<PublicUser> {
  const user = await UserModel.findOne({ _id: targetId, companyId: auth.companyId });
  if (!user) throw new NotFoundError('User not found');
  if (!user.passwordHash) {
    throw new ConflictError('User never activated — resend the invitation instead', 'NEVER_ACTIVATED');
  }

  user.status = 'ACTIVE';
  await user.save();
  return toPublicUser(user);
}

/** Tenant-scoped, role-aware user list. */
export async function listUsers(auth: AuthContext): Promise<PublicUser[]> {
  const filter: Record<string, unknown> = { companyId: auth.companyId };
  // HR manages employees; admin/super_admin see everyone in the company.
  if (auth.role === 'hr') filter.role = 'employee';

  const users = await UserModel.find(filter).sort({ createdAt: -1 });
  return users.map(toPublicUser);
}
