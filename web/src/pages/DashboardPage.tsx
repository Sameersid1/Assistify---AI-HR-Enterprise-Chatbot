import React, { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  CalendarPlus,
  MessageSquare,
  CalendarCheck,
  Users2,
  FileText,
  Loader2,
  ArrowRight,
  Inbox,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { useAuth } from "@/context/AuthContext"
import {
  LEAVE_TYPE_LABELS,
  type ApiUser,
  type CompanyDocument,
  type LeaveBalance,
  type LeaveRequest,
} from "@/lib/types"

/**
 * Dashboards show only what the database can answer for.
 *
 * The previous version reported an engagement score, a headcount, an audit
 * trail and a holiday calendar, none of which this system stores — they were
 * constants, identical for every tenant that ever signed in. Everything here is
 * fetched; where there is nothing to fetch, there is no tile.
 */

const STATUS_VARIANT = {
  PENDING: "pending",
  APPROVED: "active",
  REJECTED: "error",
  CANCELLED: "inactive",
} as const

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  })

/* ── shared pieces ──────────────────────────────────────────────────────── */

const PageHeading: React.FC<{ subtitle: string }> = ({ subtitle }) => {
  const { user } = useAuth()
  const firstName = user?.name?.split(" ")[0] ?? ""
  return (
    <div className="border-b border-zinc-200/90 dark:border-zinc-800/90 pb-4">
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
        {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
      </h1>
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
        {user?.company} · {subtitle}
      </p>
    </div>
  )
}

const Stat: React.FC<{ label: string; value: React.ReactNode; hint?: string }> = ({
  label,
  value,
  hint,
}) => (
  <div className="rounded-xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-5 shadow-xs">
    <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
      {label}
    </p>
    <p className="text-3xl font-black tabular-nums text-zinc-900 dark:text-zinc-50 mt-1">
      {value}
    </p>
    {hint && <p className="text-[11px] text-zinc-400 mt-0.5">{hint}</p>}
  </div>
)

const QuickLink: React.FC<{ to: string; icon: React.ElementType; label: string }> = ({
  to,
  icon: Icon,
  label,
}) => (
  <Link
    to={to}
    className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-4 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors group"
  >
    <span className="flex items-center gap-2.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
      <Icon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
      {label}
    </span>
    <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
  </Link>
)

const Loading: React.FC = () => (
  <div className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-12 text-xs text-zinc-500">
    <Loader2 className="h-4 w-4 animate-spin" />
    <span>Loading…</span>
  </div>
)

const Empty: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
    <Inbox className="h-5 w-5 text-zinc-400" />
    <p className="text-xs text-zinc-500">{text}</p>
  </div>
)

const Panel: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  action,
  children,
}) => (
  <div className="rounded-xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-5 shadow-xs">
    <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5 mb-3">
      <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{title}</h2>
      {action}
    </div>
    {children}
  </div>
)

const RequestRow: React.FC<{ request: LeaveRequest; showWho?: boolean }> = ({
  request,
  showWho,
}) => (
  <div className="flex items-center justify-between gap-3 py-2 border-b border-zinc-100 dark:border-zinc-800/60 last:border-0">
    <div className="min-w-0">
      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
        {showWho ? request.employee?.fullName ?? "Unknown" : LEAVE_TYPE_LABELS[request.type]}
      </p>
      <p className="text-[11px] text-zinc-500">
        {formatDate(request.fromDate)}
        {request.fromDate !== request.toDate && ` → ${formatDate(request.toDate)}`} ·{" "}
        {request.days} day{request.days === 1 ? "" : "s"}
        {showWho && ` · ${LEAVE_TYPE_LABELS[request.type]}`}
      </p>
    </div>
    <Badge variant={STATUS_VARIANT[request.status]} className="text-[10px] py-0 px-2 font-mono shrink-0">
      {request.status}
    </Badge>
  </div>
)

/* ── employee ───────────────────────────────────────────────────────────── */

const EmployeeDashboardView: React.FC = () => {
  const [balances, setBalances] = useState<LeaveBalance[] | null>(null)
  const [requests, setRequests] = useState<LeaveRequest[] | null>(null)

  useEffect(() => {
    void api
      .get<{ balances: LeaveBalance[] }>("/leave/my-balance")
      .then((r) => setBalances(r.balances))
      .catch(() => setBalances([]))
    void api
      .get<{ requests: LeaveRequest[] }>("/leave/my-requests")
      .then((r) => setRequests(r.requests))
      .catch(() => setRequests([]))
  }, [])

  return (
    <div className="space-y-6">
      <PageHeading subtitle="Employee Self-Service" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {balances === null
          ? [0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-5 h-[104px] animate-pulse"
              />
            ))
          : balances.map((b) => (
              <Stat
                key={b.type}
                label={LEAVE_TYPE_LABELS[b.type]}
                value={b.available}
                hint={
                  b.pending > 0
                    ? `${b.allocated} allocated · ${b.pending} awaiting approval`
                    : `${b.allocated} allocated · ${b.used} used`
                }
              />
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Panel
            title="Your leave requests"
            action={
              <Link
                to="/app/apply-leave"
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Apply for leave
              </Link>
            }
          >
            {requests === null ? (
              <Loading />
            ) : requests.length === 0 ? (
              <Empty text="You haven't applied for any leave yet." />
            ) : (
              requests.slice(0, 6).map((r) => <RequestRow key={r.id} request={r} />)
            )}
          </Panel>
        </div>

        <div className="space-y-3">
          <QuickLink to="/app/apply-leave" icon={CalendarPlus} label="Apply for Leave" />
          <QuickLink to="/app/chat" icon={MessageSquare} label="Ask the Assistant" />
          <QuickLink to="/app/documents" icon={FileText} label="Company Policies" />
        </div>
      </div>
    </div>
  )
}

/* ── HR ─────────────────────────────────────────────────────────────────── */

const HRWorkQueueDashboardView: React.FC = () => {
  const [pending, setPending] = useState<LeaveRequest[] | null>(null)
  const [people, setPeople] = useState<ApiUser[] | null>(null)
  const [documents, setDocuments] = useState<CompanyDocument[] | null>(null)

  useEffect(() => {
    void api
      .get<{ requests: LeaveRequest[] }>("/leave/requests?status=PENDING")
      .then((r) => setPending(r.requests))
      .catch(() => setPending([]))
    void api
      .get<{ users: ApiUser[] }>("/users")
      .then((r) => setPeople(r.users))
      .catch(() => setPeople([]))
    void api
      .get<{ documents: CompanyDocument[] }>("/documents")
      .then((r) => setDocuments(r.documents))
      .catch(() => setDocuments([]))
  }, [])

  const notActivated = people?.filter((p) => p.status === "INVITED").length ?? 0

  return (
    <div className="space-y-6">
      <PageHeading subtitle="People Operations" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Stat
          label="Awaiting your decision"
          value={pending === null ? "—" : pending.length}
          hint="Leave requests still pending"
        />
        <Stat
          label="People"
          value={people === null ? "—" : people.length}
          hint={notActivated > 0 ? `${notActivated} not yet activated` : "All accounts activated"}
        />
        <Stat
          label="Policy documents"
          value={documents === null ? "—" : documents.length}
          hint="Indexed for the assistant"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Panel
            title="Pending approvals"
            action={
              <Link
                to="/app/leave-approvals"
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Review all
              </Link>
            }
          >
            {pending === null ? (
              <Loading />
            ) : pending.length === 0 ? (
              <Empty text="Nothing is waiting on a decision." />
            ) : (
              pending.slice(0, 6).map((r) => <RequestRow key={r.id} request={r} showWho />)
            )}
          </Panel>
        </div>

        <div className="space-y-3">
          <QuickLink to="/app/leave-approvals" icon={CalendarCheck} label="Leave Approvals" />
          <QuickLink to="/app/employees" icon={Users2} label="Employee Directory" />
          <QuickLink to="/app/chat" icon={MessageSquare} label="Ask the Assistant" />
        </div>
      </div>
    </div>
  )
}

/* ── admin ──────────────────────────────────────────────────────────────── */

const AdminDashboardView: React.FC = () => {
  const [people, setPeople] = useState<ApiUser[] | null>(null)
  const [documents, setDocuments] = useState<CompanyDocument[] | null>(null)

  useEffect(() => {
    void api
      .get<{ users: ApiUser[] }>("/users")
      .then((r) => setPeople(r.users))
      .catch(() => setPeople([]))
    void api
      .get<{ documents: CompanyDocument[] }>("/documents")
      .then((r) => setDocuments(r.documents))
      .catch(() => setDocuments([]))
  }, [])

  // Counted from the accounts actually returned, so the split always sums to
  // the total shown beside it.
  const byRole = (people ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.role] = (acc[p.role] ?? 0) + 1
    return acc
  }, {})
  const pendingInvites = people?.filter((p) => p.status === "INVITED") ?? []

  const ROLE_ORDER = [
    { key: "employee", label: "Employee", colour: "bg-indigo-600" },
    { key: "hr", label: "HR", colour: "bg-amber-500" },
    { key: "it_support", label: "IT Support", colour: "bg-sky-500" },
    { key: "admin", label: "Admin", colour: "bg-zinc-800 dark:bg-zinc-300" },
    { key: "super_admin", label: "Super Admin", colour: "bg-rose-500" },
  ].filter((r) => (byRole[r.key] ?? 0) > 0)

  const total = people?.length ?? 0

  return (
    <div className="space-y-6">
      <PageHeading subtitle="Administration" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Stat label="Accounts" value={people === null ? "—" : total} />
        <Stat
          label="Awaiting activation"
          value={people === null ? "—" : pendingInvites.length}
          hint="Invited but not yet signed in"
        />
        <Stat
          label="Policy documents"
          value={documents === null ? "—" : documents.length}
          hint="Indexed for the assistant"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title="Accounts by role">
          {people === null ? (
            <Loading />
          ) : total === 0 ? (
            <Empty text="No accounts yet." />
          ) : (
            <div className="space-y-3">
              <div className="h-3.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex">
                {ROLE_ORDER.map((r) => (
                  <div
                    key={r.key}
                    style={{ width: `${((byRole[r.key] ?? 0) / total) * 100}%` }}
                    className={`${r.colour} h-full`}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                {ROLE_ORDER.map((r) => (
                  <div key={r.key} className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-xs ${r.colour}`} />
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {r.label}: <strong>{byRole[r.key]}</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>

        <Panel
          title="Awaiting activation"
          action={
            <Link
              to="/app/users"
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Manage users
            </Link>
          }
        >
          {people === null ? (
            <Loading />
          ) : pendingInvites.length === 0 ? (
            <Empty text="Everyone invited has activated their account." />
          ) : (
            pendingInvites.slice(0, 6).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 py-2 border-b border-zinc-100 dark:border-zinc-800/60 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {p.fullName}
                  </p>
                  <p className="text-[11px] text-zinc-500 truncate">{p.email}</p>
                </div>
                <Badge variant="pending" className="text-[10px] py-0 px-2 font-mono shrink-0">
                  INVITED
                </Badge>
              </div>
            ))
          )}
        </Panel>
      </div>
    </div>
  )
}

/* ── router ─────────────────────────────────────────────────────────────── */

export const DashboardPage: React.FC = () => {
  const { user } = useAuth()

  switch (user?.role) {
    case "hr":
      return <HRWorkQueueDashboardView />
    case "admin":
    case "super_admin":
      return <AdminDashboardView />
    default:
      // Employees and IT support both get the self-service view: it shows the
      // caller's own leave, which every role has.
      return <EmployeeDashboardView />
  }
}
