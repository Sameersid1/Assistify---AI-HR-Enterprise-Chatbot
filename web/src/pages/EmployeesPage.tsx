import React, { useEffect, useMemo, useState } from "react"
import { Search, Users2, Loader2, AlertCircle, Inbox, Mail } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api, ApiError } from "@/lib/api"
import type { ApiUser, UserRole, UserStatus } from "@/lib/types"

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
  const [people, setPeople] = useState<ApiUser[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  useEffect(() => {
    let cancelled = false
    api
      .get<{ users: ApiUser[] }>("/users")
      .then((res) => {
        if (!cancelled) setPeople(res.users)
      })
      .catch((err) => {
        if (!cancelled) {
          setPeople([])
          setError(err instanceof ApiError ? err.message : "Could not load the directory.")
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

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

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email or department"
            className="h-9 pl-9 text-xs"
          />
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

      {people !== null && people.length > 0 && (
        <p className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <Users2 className="h-3.5 w-3.5" />
          INVITED means the person has not yet activated their account.
        </p>
      )}
    </div>
  )
}
