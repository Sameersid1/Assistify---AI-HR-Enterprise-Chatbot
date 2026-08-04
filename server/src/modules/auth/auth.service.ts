import type { Types } from 'mongoose';
import { UserModel } from '../users/user.model';
import { toPublicUser, type PublicUser } from '../users/user.service';
import { hashPassword, verifyPassword } from './auth.password';
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from './auth.jwt';
import { hashRawToken } from '../../shared/tokens';
import {
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from '../../shared/errors';
import type { LoginInput, ActivateInput } from './auth.schema';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Log a user in.
 * Security: one generic "invalid credentials" error for both wrong email and
 * wrong password — distinguishing them is a user-enumeration oracle
 * (AUTH-AND-ONBOARDING-FLOW.md, Flow 1).
 */
export async function login(
  input: LoginInput,
): Promise<{ user: PublicUser; tokens: AuthTokens }> {
  const email = input.email.toLowerCase().trim();
  const user = await UserModel.findOne({ email });

  const genericInvalid = new UnauthorizedError(
    'Invalid credentials',
    'AUTH_INVALID_CREDENTIALS',
  );

  if (!user || !user.passwordHash) throw genericInvalid;

  const ok = await verifyPassword(user.passwordHash, input.password);
  if (!ok) throw genericInvalid;

  // Password is correct — now the status message can be specific.
  if (user.status === 'INVITED') {
    throw new ForbiddenError(
      "Your account isn't activated yet — check your invitation link",
      'AUTH_NOT_ACTIVATED',
    );
  }
  if (user.status === 'DEACTIVATED') {
    throw new ForbiddenError('Account deactivated. Contact HR.', 'AUTH_DEACTIVATED');
  }

  const tokens = await issueTokens(user._id, user.companyId, user.role);
  return { user: toPublicUser(user), tokens };
}

/** Issue an access + refresh pair and persist the refresh-token hash. */
export async function issueTokens(
  userId: Types.ObjectId,
  companyId: Types.ObjectId,
  role: string,
): Promise<AuthTokens> {
  const accessToken = signAccessToken({
    userId: userId.toString(),
    companyId: companyId.toString(),
    role: role as never,
  });
  const refreshToken = signRefreshToken({ userId: userId.toString() });

  await UserModel.updateOne(
    { _id: userId },
    { $push: { refreshTokenHashes: hashToken(refreshToken) } },
  );

  return { accessToken, refreshToken };
}

/**
 * GET /auth/invitation/:token — validate before showing the activation form.
 * Returns just enough to prefill the form; never the token itself.
 */
export async function validateInvitation(
  rawToken: string,
): Promise<{ email: string; fullName: string; role: string }> {
  const user = await UserModel.findOne({ invitationTokenHash: hashRawToken(rawToken) });
  if (
    !user ||
    user.status !== 'INVITED' ||
    !user.invitationExpiresAt ||
    user.invitationExpiresAt.getTime() < Date.now()
  ) {
    throw new ValidationError('Invalid or expired invitation', 'INVITATION_INVALID');
  }
  return { email: user.email, fullName: user.fullName, role: user.role };
}

/**
 * POST /auth/activate — token + password → ACTIVE + auto-login.
 * The invitation token is single-use: it is burned on activation.
 */
export async function activate(
  input: ActivateInput,
): Promise<{ user: PublicUser; tokens: AuthTokens }> {
  const user = await UserModel.findOne({
    invitationTokenHash: hashRawToken(input.token),
  });
  if (!user) {
    throw new ValidationError('Invalid or already-used activation link', 'INVITATION_INVALID');
  }
  if (!user.invitationExpiresAt || user.invitationExpiresAt.getTime() < Date.now()) {
    throw new ValidationError('Activation link expired — ask HR to resend', 'INVITATION_EXPIRED');
  }
  if (user.status !== 'INVITED') {
    throw new ConflictError('Account already activated', 'ALREADY_ACTIVE');
  }

  user.passwordHash = await hashPassword(input.password);
  user.status = 'ACTIVE';
  user.invitationTokenHash = null; // burn it — single use
  user.invitationExpiresAt = null;
  user.activatedAt = new Date();
  await user.save();

  const tokens = await issueTokens(user._id, user.companyId, user.role);
  return { user: toPublicUser(user), tokens };
}

/**
 * POST /auth/refresh — rotate the refresh token.
 * Reuse detection: a valid-but-unrecognised refresh token means it leaked, so we
 * invalidate the whole family (M1 guide §Phase-1).
 */
export async function refresh(refreshToken: string): Promise<AuthTokens> {
  let payload: { userId: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token', 'TOKEN_INVALID');
  }

  const user = await UserModel.findById(payload.userId);
  if (!user || user.status !== 'ACTIVE') throw new UnauthorizedError();

  const incomingHash = hashToken(refreshToken);
  if (!user.refreshTokenHashes.includes(incomingHash)) {
    // Valid signature but not an active token → reuse/leak. Kill every session.
    user.refreshTokenHashes = [];
    await user.save();
    throw new UnauthorizedError('Refresh token reuse detected', 'TOKEN_REUSE');
  }

  // Rotate: drop the used token, mint a new pair.
  user.refreshTokenHashes = user.refreshTokenHashes.filter((h) => h !== incomingHash);
  const newRefresh = signRefreshToken({ userId: user._id.toString() });
  user.refreshTokenHashes.push(hashToken(newRefresh));
  await user.save();

  const accessToken = signAccessToken({
    userId: user._id.toString(),
    companyId: user.companyId.toString(),
    role: user.role as never,
  });
  return { accessToken, refreshToken: newRefresh };
}

/** POST /auth/logout — invalidate just this refresh token. */
export async function logout(userId: Types.ObjectId, refreshToken?: string): Promise<void> {
  if (!refreshToken) return;
  await UserModel.updateOne(
    { _id: userId },
    { $pull: { refreshTokenHashes: hashToken(refreshToken) } },
  );
}

/** GET /auth/me */
export async function getMe(userId: Types.ObjectId): Promise<PublicUser> {
  const user = await UserModel.findById(userId);
  if (!user) throw new UnauthorizedError();
  return toPublicUser(user);
}
