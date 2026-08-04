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

export interface InvitationInfo {
  email: string
  fullName: string
  role: UserRole
}

/** The success/error envelope every endpoint uses. */
export type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } }
