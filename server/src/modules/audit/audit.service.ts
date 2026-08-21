import { AuditLogModel } from './audit.model';
import { UserModel } from '../users/user.model';
import { scoped } from '../../shared/tenantQuery';
import type { AuthContext } from '../../shared/types';

export type AuditAction =
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED'
  | 'USER_INVITED'
  | 'USER_DEACTIVATED'
  | 'USER_REACTIVATED'
  | 'DOCUMENT_PUBLISHED'
  | 'DOCUMENT_DELETED'
  | 'QUESTION_ANSWERED';

export interface PublicAuditLog {
  id: string;
  action: string;
  actorName: string;
  actorRole: string;
  targetName: string | null;
  summary: string;
  createdAt: string;
}

/**
 * Record one decision.
 *
 * ⚠️ NEVER THROWS. A failed audit write must not roll back the action it was
 * describing — refusing someone's leave and then erroring because the log was
 * unavailable would be worse than the missing row. The failure is logged to the
 * server console so it is visible, and the caller continues.
 *
 * This is a real trade-off and worth being able to defend: it chooses
 * availability over completeness. A system where the audit trail is a legal
 * record rather than an operational convenience would make the opposite choice
 * and fail the action instead.
 */
export async function record(
  auth: AuthContext,
  action: AuditAction,
  summary: string,
  target?: { id?: unknown; name?: string | null },
): Promise<void> {
  try {
    // The actor's name is copied in, so the entry still reads correctly after a
    // rename or deactivation.
    const actor = await UserModel.findById(auth.userId).select('fullName role');

    await AuditLogModel.create({
      companyId: auth.companyId,
      actorId: auth.userId,
      actorName: actor?.fullName ?? 'Unknown',
      actorRole: actor?.role ?? auth.role,
      action,
      targetId: target?.id ?? null,
      targetName: target?.name ?? null,
      summary,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      `📋 Audit write failed for ${action}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/** One tenant's trail, newest first. Admins only — gated on the route. */
export async function listAuditLogs(
  auth: AuthContext,
  limit = 100,
): Promise<PublicAuditLog[]> {
  const rows = await AuditLogModel.find(scoped(auth))
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 200));

  return rows.map((r) => ({
    id: r._id.toString(),
    action: r.action,
    actorName: r.actorName,
    actorRole: r.actorRole,
    targetName: r.targetName ?? null,
    summary: r.summary,
    createdAt: r.createdAt.toISOString(),
  }));
}
