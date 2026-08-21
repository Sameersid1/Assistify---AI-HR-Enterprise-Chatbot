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
  /** Decides leave entitlement and which policy documents apply. */
  employmentType?: EmploymentType
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
  /** Shown on Settings, and it decides which policies the assistant reads. */
  employmentType?: EmploymentType
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
    employmentType: api.employmentType,
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

/* ── Leave ──────────────────────────────────────────────────────────────── */

/** The three types the company policy defines (server: leave.model.ts). */
export const LEAVE_TYPES = ['annual', 'casual', 'sick'] as const
export type LeaveType = (typeof LEAVE_TYPES)[number]

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  annual: 'Annual Leave',
  casual: 'Casual Leave',
  sick: 'Sick Leave',
}

export interface LeaveBalance {
  type: LeaveType
  year: number
  allocated: number
  used: number
  /** Days reserved by requests still awaiting a decision. */
  pending: number
  /** allocated − used − pending. What you can actually still book. */
  available: number
}

export interface LeaveRequest {
  id: string
  type: LeaveType
  /** `YYYY-MM-DD`. A calendar date, not an instant. */
  fromDate: string
  toDate: string
  /** Working days, computed server-side — never sent by the client. */
  days: number
  reason: string
  status: LeaveStatus
  decisionNote: string | null
  decidedAt: string | null
  createdAt: string
  /** Present only on the HR queue, where the request belongs to someone else. */
  employee?: { id: string; fullName: string; email: string; department: string | null }
}

/** POST /leave/requests — `days` is deliberately absent; the server computes it. */
export interface ApplyLeaveRequest {
  type: LeaveType
  fromDate: string
  toDate: string
  reason: string
}

export interface ApplyLeaveResponse {
  request: LeaveRequest
  /** The balance after the days were reserved, so the UI need not refetch. */
  balance: LeaveBalance
}

/* ── Policy documents ───────────────────────────────────────────────────── */

/** The engagement types a document's audience can be limited to. */
export const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'] as const
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number]

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERN: 'Intern',
}

export interface CompanyDocument {
  id: string
  title: string
  /** How many passages it was split into for retrieval. */
  chunkCount: number
  createdAt: string
  /**
   * Who the document applies to. EMPTY MEANS EVERYONE — the assistant reads a
   * document only when this is empty or contains the reader's own type.
   */
  audienceEmploymentTypes: EmploymentType[]
}

export interface DocumentSearchHit {
  documentTitle: string
  chunkIndex: number
  text: string
  /** Cosine similarity, 0–1. Anything below the server's floor is not returned. */
  similarity: number
}

/* ── Assistant ──────────────────────────────────────────────────────────── */

/** One turn of the transcript. The server is stateless — send the whole thing. */
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  messages: ChatMessage[]
}

export interface ChatResponse {
  reply: string
  /** Tools the assistant actually called, so the UI can show where facts came from. */
  toolsUsed: string[]
}

/** The success/error envelope every endpoint uses. */
export type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } }

/* ── Questions for HR ────────────────────────────────────────────────────── */

export interface CompanyQuestion {
  id: string
  question: string
  /** Why the assistant could not answer, so HR closes the gap. */
  assistantNote: string | null
  status: 'OPEN' | 'ANSWERED'
  answer: string | null
  answeredAt: string | null
  createdAt: string
  /** Present only on the approver queue, where the question is someone else's. */
  askedBy?: { id: string; fullName: string; email: string; department: string | null }
  answeredBy?: { fullName: string } | null
}

/* ── Audit trail ─────────────────────────────────────────────────────────── */

export interface AuditLogEntry {
  id: string
  action: string
  /** Name as it was when the action happened — not joined live. */
  actorName: string
  actorRole: string
  targetName: string | null
  summary: string
  createdAt: string
}
