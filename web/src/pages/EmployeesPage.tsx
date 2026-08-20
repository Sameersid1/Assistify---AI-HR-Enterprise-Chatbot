import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Search, Users2, Loader2, AlertCircle, Inbox, Mail, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InviteEmployeeModal } from "@/components/modals/InviteEmployeeModal"
import { useAuth } from "@/context/AuthContext"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api, ApiError } from "@/lib/api"
import { EMPLOYMENT_TYPE_LABELS, type ApiUser, type EmploymentType, type UserRole, type UserStatus } from "@/lib/types"

const ROLE_LABELS: Record<UserRole, string> = {
  employee: "Employee",
  hr: "HR",
  it_support: "IT Support",
  admin: "Admin",
  super_admin: "Admin",
}

const STATUS_VARIANT: Record<UserStatus, "active" | "pending" | "inactive"> = {
  ACTIVE: "active",
  INVITED: "pending",
  DEACTIVATED: "inactive",
}

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")

export const EmployeesPage: React.FC = () => {
  const { user } = useAuth()
  const [people, setPeople] = useState<ApiUser[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [isInviting, setIsInviting] = useState(false)

  /**
   * Only HR. Not a UI preference — the server's role-creation whitelist reads
   * `hr: ['employee']`, and an admin inviting an employee is refused with
   * ROLE_NOT_ALLOWED. Showing the button to anyone else offers an action that
   * cannot succeed.
   */
  const canInvite = user?.role === "hr"

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ users: ApiUser[] }>("/users")
      setPeople(res.users)
    } catch (err) {
      setPeople([])
      setError(err instanceof ApiError ? err.message : "Could not load the directory.")
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Filtered in the browser: the endpoint returns one tenant's people, which is
  // a list a person could scroll. Server-side search earns its place when it
  // stops being one.
  const filtered = useMemo(() => {
    if (!people) return null
    const q = query.trim().toLowerCase()
    if (!q) return people
    return people.filter((p) =>
      [p.fullName, p.email, p.department, p.designation]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q)),
    )
  }, [people, query])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Employee Directory
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {people === null
              ? "Loading…"
              : `${people.length} ${people.length === 1 ? "person" : "people"} in your organisation`}
          </p>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email or department"
              className="h-9 pl-9 text-xs"
            />
          </div>

          {canInvite && (
            <Button
              size="sm"
              onClick={() => setIsInviting(true)}
              className="h-9 shrink-0 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Invite Employee
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="py-2.5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {filtered === null ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-16 text-xs text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading directory…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-16 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
            {query ? <Search className="h-5 w-5" /> : <Inbox className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {query ? "No one matches that" : "Nobody here yet"}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {query
                ? "Try a different name, email or department."
                : canInvite
                  ? "Invite someone to get started."
                  : "People appear here once they have been invited."}
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          {filtered.map((person, i) => (
            <div
              key={person.id}
              className={`flex flex-wrap items-center justify-between gap-4 p-4 ${
                i > 0 ? "border-t border-zinc-100 dark:border-zinc-800" : ""
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                  {initials(person.fullName)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {person.fullName}
                  </p>
                  <p className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 truncate">
                    <Mail className="h-3 w-3" />
                    {person.email}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                {person.designation && <span>{person.designation}</span>}
                {person.employmentType && person.employmentType !== 'FULL_TIME' && (
                  <Badge
                    variant="outline"
                    className="text-[10px] py-0 px-1.5 border-indigo-300 text-indigo-700 dark:border-indigo-800 dark:text-indigo-300"
                  >
                    {EMPLOYMENT_TYPE_LABELS[person.employmentType as EmploymentType]}
                  </Badge>
                )}
                {person.department && (
                  <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5">
                    {person.department}
                  </span>
                )}
                <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                  {ROLE_LABELS[person.role]}
                </Badge>
                <Badge
                  variant={STATUS_VARIANT[person.status]}
                  className="text-[10px] py-0 px-1.5 font-mono"
                >
                  {person.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      <InviteEmployeeModal
        isOpen={isInviting}
        onClose={() => setIsInviting(false)}
        onInvited={() => void load()}
      />

      {people !== null && people.length > 0 && (
        <p className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <Users2 className="h-3.5 w-3.5" />
          INVITED means the person has not yet activated their account.
        </p>
      )}
    </div>
  )
}
