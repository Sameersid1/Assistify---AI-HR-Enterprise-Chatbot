import React, { useCallback, useEffect, useState } from "react"
import { Check, X, CalendarCheck, Loader2, AlertCircle, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api, ApiError } from "@/lib/api"
import { LEAVE_TYPE_LABELS, type LeaveRequest, type LeaveStatus } from "@/lib/types"

const STATUS_FILTERS: { label: string; value: LeaveStatus | "ALL" }[] = [
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "All", value: "ALL" },
]

const STATUS_VARIANT: Record<LeaveStatus, "pending" | "active" | "error" | "inactive"> = {
  PENDING: "pending",
  APPROVED: "active",
  REJECTED: "error",
  CANCELLED: "inactive",
}

/** `2026-08-12` → `12 Aug 2026`, and a single-day range shown once. */
function formatRange(from: string, to: string): string {
  const fmt = (d: string) =>
    new Date(`${d}T00:00:00.000Z`).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    })
  return from === to ? fmt(from) : `${fmt(from)} → ${fmt(to)}`
}

export const LeaveApprovalsPage: React.FC = () => {
  const [requests, setRequests] = useState<LeaveRequest[] | null>(null)
  const [filter, setFilter] = useState<LeaveStatus | "ALL">("PENDING")
  const [loadError, setLoadError] = useState<string | null>(null)
  /** Id of the request currently being decided — disables just that row's buttons. */
  const [deciding, setDeciding] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const query = filter === "ALL" ? "" : `?status=${filter}`
      const res = await api.get<{ requests: LeaveRequest[] }>(`/leave/requests${query}`)
      setRequests(res.requests)
    } catch (err) {
      setRequests([])
      setLoadError(
        err instanceof ApiError ? err.message : "Could not load the approval queue.",
      )
    }
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  const decide = async (request: LeaveRequest, approve: boolean) => {
    // A rejection has to say why — the API requires a note, and the employee
    // gets it back with the decision.
    let note: string | undefined
    if (!approve) {
      const entered = window.prompt(
        `Why are you rejecting ${request.employee?.fullName ?? "this request"}?`,
      )
      if (entered === null) return // cancelled the prompt
      if (!entered.trim()) {
        setActionError("A rejection needs a reason.")
        return
      }
      note = entered.trim()
    }

    setDeciding(request.id)
    setActionError(null)
    try {
      const path = `/leave/requests/${request.id}/${approve ? "approve" : "reject"}`
      const res = await api.post<{ request: LeaveRequest }>(path, note ? { note } : {})

      // Patch the decided row in place rather than refetching, so the list does
      // not jump under the cursor mid-review.
      setRequests((prev) =>
        prev ? prev.map((r) => (r.id === res.request.id ? res.request : r)) : prev,
      )
    } catch (err) {
      // Real cases: someone else already decided it (409), or it is your own
      // request (403). Both are worth reading rather than paraphrasing.
      setActionError(
        err instanceof ApiError ? err.message : "Could not record that decision.",
      )
    } finally {
      setDeciding(null)
    }
  }

  // A row that just moved out of the active filter is dimmed rather than
  // removed, so you can see what you did instead of it vanishing.
  const isFilteredOut = (r: LeaveRequest) => filter !== "ALL" && r.status !== filter

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Leave Approvals
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Review and take action on employee time-off requests
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === f.value
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loadError && (
        <Alert variant="destructive" className="py-2.5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{loadError}</AlertDescription>
        </Alert>
      )}
      {actionError && (
        <Alert variant="destructive" className="py-2.5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{actionError}</AlertDescription>
        </Alert>
      )}

      {requests === null ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-16 text-xs text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading requests…</span>
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-16 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Nothing to review
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {filter === "PENDING"
                ? "No leave requests are waiting on a decision."
                : `No ${filter.toLowerCase()} requests.`}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className={`rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 transition-opacity ${
                isFilteredOut(req) ? "opacity-50" : ""
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {req.employee?.fullName ?? "Unknown employee"}
                    </span>
                    {req.employee?.department && (
                      <span className="text-[11px] text-zinc-500">
                        {req.employee.department}
                      </span>
                    )}
                    <Badge
                      variant={STATUS_VARIANT[req.status]}
                      className="text-[10px] py-0 px-2 font-mono"
                    >
                      {req.status}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarCheck className="h-3.5 w-3.5 text-zinc-400" />
                      {formatRange(req.fromDate, req.toDate)}
                    </span>
                    <span className="font-mono">
                      {req.days} working day{req.days === 1 ? "" : "s"}
                    </span>
                    <span>{LEAVE_TYPE_LABELS[req.type]}</span>
                  </div>

                  <p className="text-xs text-zinc-700 dark:text-zinc-300 max-w-2xl">
                    {req.reason}
                  </p>

                  {req.decisionNote && (
                    <p className="text-[11px] text-zinc-500 italic">
                      Decision note: {req.decisionNote}
                    </p>
                  )}
                </div>

                {req.status === "PENDING" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={deciding === req.id}
                      onClick={() => void decide(req, false)}
                      className="h-8 gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      disabled={deciding === req.id}
                      onClick={() => void decide(req, true)}
                      className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    >
                      {deciding === req.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Approve
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
