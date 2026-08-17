/**
 * Types mirroring the backend API contract (server/src/shared/apiResponse.ts).
 * Keep this file in sync with the server — it is the seam between the two apps.
 */

export type UserRole = 'employee' | 'hr' | 'it_support' | 'admin' | 'super_admin'
export type UserStatus = 'INVITED' | 'ACTIVE' | 'DEACTIVATED'

/** Exactly what the API returns for a user (server: toPublicUser). */
export interface ApiUser {
  id: string
  email: string
  fullName: string
  role: UserRole
  status: UserStatus
  companyId?: string
  companyName?: string
  department?: string
  designation?: string
  employeeId?: string
}

/** Shape the UI components consume. Normalised from ApiUser at the boundary. */
export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  company: string
  status?: UserStatus
  department?: string
  designation?: string
  employeeId?: string
  avatarUrl?: string
}

export function toUser(api: ApiUser): User {
  return {
    id: api.id,
    name: api.fullName,
    email: api.email,
    role: api.role,
    company: api.companyName ?? 'Your Company',
    status: api.status,
    department: api.department,
    designation: api.designation,
    employeeId: api.employeeId,
  }
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginResponse extends AuthTokens {
  user: ApiUser
}

export interface MeResponse {
  user: ApiUser
}

/** GET /auth/invitation/:token — what the activation page renders before signup. */
export interface InvitationInfo {
  /** Work email. This is the login identity and cannot be edited. */
  email: string
  fullName: string
  role: UserRole
  companyName: string
  /** The inbox the link was delivered to — personal address when one was given. */
  invitationSentTo: string
}

/** POST /auth/activate — activation logs you straight in. */
export interface ActivateResponse extends AuthTokens {
  user: ApiUser
}

/** POST /users/invite — body. companyId is never sent; the server reads the JWT. */
export interface InviteRequest {
  email: string
  personalEmail?: string
  fullName: string
  role: UserRole
  department?: string
  designation?: string
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN'
  dateOfJoining?: string
}

export interface InviteResponse {
  user: ApiUser
  /** Raw link, returned once. Shown as "copy link" so HR has a fallback. */
  activationUrl: string
  invitationSentTo: string
  /** False when the mail server rejected it — the link above still works. */
  emailSent: boolean
  /** Dev only: Ethereal sandbox URL where the sent email can be read. */
  emailPreviewUrl?: string
  /** Present only when emailSent is false — why the mail transport refused. */
  emailError?: string
}

/** The success/error envelope every endpoint uses. */
export type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } }
