import React, { useEffect, useMemo, useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Calendar,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api, ApiError } from "@/lib/api"
import {
  LEAVE_TYPES,
  LEAVE_TYPE_LABELS,
  type ApplyLeaveRequest,
  type ApplyLeaveResponse,
  type LeaveBalance,
  type LeaveType,
} from "@/lib/types"

/** `YYYY-MM-DD` for a date input, in UTC to match how the server reads them. */
const isoDate = (d: Date) => d.toISOString().slice(0, 10)

/**
 * Working days in an inclusive range, mirroring the server's countWorkingDays.
 *
 * This is a *preview only*. The figure that counts is the one the server
 * returns, because it is what gets deducted — the client never sends `days`.
 * Duplicated rather than fetched so the summary updates as you pick dates.
 */
function countWorkingDays(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00.000Z`)
  const end = new Date(`${to}T00:00:00.000Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0

  let days = 0
  for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
    const weekday = new Date(t).getUTCDay()
    if (weekday !== 0 && weekday !== 6) days += 1
  }
  return days
}

export const ApplyLeavePage: React.FC = () => {
  const navigate = useNavigate()

  const [balances, setBalances] = useState<LeaveBalance[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [leaveType, setLeaveType] = useState<LeaveType>("casual")
  const [startDate, setStartDate] = useState(isoDate(new Date()))
  const [endDate, setEndDate] = useState(isoDate(new Date()))
  const [reason, setReason] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<ApplyLeaveResponse | null>(null)

  // Real balances, so the numbers on screen are the ones that will be deducted.
  useEffect(() => {
    let cancelled = false
    api
      .get<{ balances: LeaveBalance[] }>("/leave/my-balance")
      .then((res) => {
        if (!cancelled) setBalances(res.balances)
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(
            err instanceof ApiError ? err.message : "Could not load your leave balance.",
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selected = balances?.find((b) => b.type === leaveType)
  const requestedDays = useMemo(
    () => countWorkingDays(startDate, endDate),
    [startDate, endDate],
  )
  const balanceAfter = selected ? selected.available - requestedDays : null

  // Caught before the request so the obvious mistakes get an instant answer;
  // the server re-checks all of it and owns the real decision.
  const tooFewDays = requestedDays === 0
  const notEnoughLeft = balanceAfter !== null && balanceAfter < 0
  const canSubmit =
    !isSubmitting && !tooFewDays && !notEnoughLeft && reason.trim().length >= 3

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const res = await api.post<ApplyLeaveResponse>("/leave/requests", {
        type: leaveType,
        fromDate: startDate,
        toDate: endDate,
        reason: reason.trim(),
      } satisfies ApplyLeaveRequest)

      setResult(res)
      // The response carries the updated balance, so patch it in rather than
      // refetching — the numbers behind the form stay correct for a second apply.
      setBalances((prev) =>
        prev ? prev.map((b) => (b.type === res.balance.type ? res.balance : b)) : prev,
      )
    } catch (err) {
      // The API's codes are more specific than any message we could invent —
      // an overlap and an empty balance need different corrections.
      setSubmitError(
        err instanceof ApiError
          ? err.message
          : "Could not submit your request. Please try again.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const applyAnother = () => {
    setResult(null)
    setReason("")
    setSubmitError(null)
  }

  return (
    <div className="space-y-6 font-sans w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/90 dark:border-zinc-800/90 pb-4">
        <div>
          <Link
            to="/app"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 mb-1"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Apply for Time Off
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Weekends don&apos;t count against your balance — only working days do
          </p>
        </div>
        {balances && (
          <Badge variant="active" className="text-xs py-1 px-3 font-semibold font-mono">
            Policy Year {balances[0]?.year ?? new Date().getUTCFullYear()}
          </Badge>
        )}
      </div>

      {loadError && (
        <Alert variant="destructive" className="py-2.5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{loadError}</AlertDescription>
        </Alert>
      )}

      {/* Balance strip — doubles as the type selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {balances
          ? balances.map((b) => {
              const isSelected = leaveType === b.type
              return (
                <button
                  key={b.type}
                  type="button"
                  onClick={() => setLeaveType(b.type)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-600/20 shadow-xs"
                      : "border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      {LEAVE_TYPE_LABELS[b.type]}
                    </span>
                    {isSelected && (
                      <Badge
                        variant="default"
                        className="text-[10px] py-0 px-1.5 bg-indigo-600 text-white font-mono"
                      >
                        Selected
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tabular-nums">
                      {b.available}
                    </span>
                    <span className="text-xs text-zinc-400 font-medium">
                      of {b.allocated} remaining
                    </span>
                  </div>
                  {b.pending > 0 && (
                    <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                      {b.pending} day{b.pending === 1 ? "" : "s"} awaiting approval
                    </p>
                  )}
                </button>
              )
            })
          : LEAVE_TYPES.map((t) => (
              <div
                key={t}
                className="p-4 rounded-xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 animate-pulse"
              >
                <div className="h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="mt-3 h-7 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            ))}
      </div>

      {result ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-8 text-center space-y-6 max-w-xl mx-auto shadow-xl"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 shadow-xs">
            <CheckCircle2 className="h-9 w-9" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50">
              Leave Request Submitted
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              Your request for{" "}
              <strong>
                {result.request.days} working day{result.request.days === 1 ? "" : "s"} of{" "}
                {LEAVE_TYPE_LABELS[result.request.type]}
              </strong>{" "}
              is now awaiting HR approval.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4 text-xs space-y-2.5 text-left">
            <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
              <span>Dates:</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {result.request.fromDate} → {result.request.toDate}
              </span>
            </div>
            <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
              <span>Status:</span>
              <Badge variant="pending" className="text-[10px] py-0 px-2 font-mono">
                {result.request.status}
              </Badge>
            </div>
            <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
              <span>Remaining after this:</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {result.balance.available} of {result.balance.allocated} days
              </span>
            </div>
          </div>

          <p className="text-[11px] text-zinc-400">
            These days are reserved now, so they cannot be booked twice — they are
            only deducted for good once HR approves.
          </p>

          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" onClick={applyAnother} className="text-xs h-9">
              Apply for More Leave
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/app")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-9 px-5"
            >
              Back to Dashboard
            </Button>
          </div>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Details */}
          <div className="lg:col-span-8 space-y-5 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-6 shadow-xs">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              Request Details
            </h2>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Leave Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2.5 px-3 text-xs text-zinc-900 dark:text-zinc-100 font-medium"
              >
                {LEAVE_TYPES.map((t) => {
                  const b = balances?.find((x) => x.type === t)
                  return (
                    <option key={t} value={t}>
                      {LEAVE_TYPE_LABELS[t]}
                      {b ? ` (${b.available} available)` : ""}
                    </option>
                  )
                })}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                  Start Date <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  required
                  value={startDate}
                  min={isoDate(new Date())}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    // Keep the range coherent — the server rejects a backwards one.
                    if (e.target.value > endDate) setEndDate(e.target.value)
                  }}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                  End Date <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  required
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Reason <span className="text-rose-500">*</span>
              </label>
              <Textarea
                required
                rows={3}
                minLength={3}
                maxLength={500}
                placeholder="A short note for whoever approves this…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="text-xs"
              />
              <p className="text-[10px] text-zinc-400">{reason.trim().length}/500</p>
            </div>
          </div>

          {/* Summary */}
          <div className="lg:col-span-4 space-y-5">
            <div className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Request Summary
                </h3>
                <Badge variant="active" className="text-[10px] py-0 px-2 font-mono">
                  Live
                </Badge>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                  <span className="text-zinc-500">Type:</span>
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    {LEAVE_TYPE_LABELS[leaveType]}
                  </strong>
                </div>

                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                  <span className="text-zinc-500">Working days:</span>
                  <strong className="font-mono text-zinc-900 dark:text-zinc-100">
                    {requestedDays}
                  </strong>
                </div>

                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                  <span className="text-zinc-500">Available now:</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300 font-semibold">
                    {selected ? `${selected.available} days` : "—"}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-lg px-2.5">
                  <span className="font-bold text-indigo-900 dark:text-indigo-200">
                    Left after this:
                  </span>
                  <span
                    className={`font-mono font-extrabold ${
                      notEnoughLeft
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-indigo-600 dark:text-indigo-400"
                    }`}
                  >
                    {balanceAfter === null ? "—" : `${balanceAfter} days`}
                  </span>
                </div>
              </div>

              {tooFewDays && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  That range has no working days in it — weekends don&apos;t count.
                </p>
              )}
              {notEnoughLeft && selected && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400">
                  You only have {selected.available} day
                  {selected.available === 1 ? "" : "s"} of{" "}
                  {LEAVE_TYPE_LABELS[leaveType].toLowerCase()} left.
                </p>
              )}

              {submitError && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-[11px]">{submitError}</AlertDescription>
                </Alert>
              )}

              <div className="flex items-start gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>
                  Submitting reserves these days immediately, so the same balance
                  cannot be booked twice.
                </span>
              </div>

              <Button
                type="submit"
                disabled={!canSubmit}
                className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-xs gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Submitting…</span>
                  </>
                ) : (
                  <>
                    <span>Submit Leave Request</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
