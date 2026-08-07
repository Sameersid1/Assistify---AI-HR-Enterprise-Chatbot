import React, { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { motion } from "framer-motion"
import {
  CalendarDays,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  FileText,
  UploadCloud,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  Info,
  ChevronLeft,
  X,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

interface LeaveQuota {
  type: string
  available: number
  total: number
  color: string
}

const QUOTAS: Record<string, LeaveQuota> = {
  "Casual Leave": { type: "Casual Leave", available: 8, total: 12, color: "text-indigo-600" },
  "Sick Leave": { type: "Sick Leave", available: 5, total: 8, color: "text-amber-500" },
  "Earned Leave": { type: "Earned Leave", available: 14, total: 18, color: "text-emerald-500" },
  "Comp-Off": { type: "Comp-Off", available: 2, total: 2, color: "text-sky-500" },
}

export const ApplyLeavePage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [leaveType, setLeaveType] = useState<string>("Casual Leave")
  const [startDate, setStartDate] = useState("2026-08-14")
  const [endDate, setEndDate] = useState("2026-08-15")
  const [isHalfDay, setIsHalfDay] = useState(false)
  const [halfDaySlot, setHalfDaySlot] = useState<"first" | "second">("first")
  const [reason, setReason] = useState("")
  const [standinColleague, setStandinColleague] = useState("Aditi Sharma (Product Design)")
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)
  const [isAiDrafting, setIsAiDrafting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Calculate working days between dates
  const calculateDays = () => {
    if (isHalfDay) return 0.5
    try {
      const s = new Date(startDate)
      const e = new Date(endDate)
      const diffTime = e.getTime() - s.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      return diffDays > 0 ? diffDays : 1
    } catch {
      return 1
    }
  }

  const requestedDays = calculateDays()
  const currentQuota = QUOTAS[leaveType] || QUOTAS["Casual Leave"]
  const balanceAfter = Math.max(0, currentQuota.available - requestedDays)

  // AI Prompt reason auto-draft helper
  const handleAiDraft = () => {
    setIsAiDrafting(true)
    setTimeout(() => {
      if (leaveType === "Casual Leave") {
        setReason(
          "Requesting time off to attend a scheduled family event and personal commitments. Work handovers have been synchronized with the team."
        )
      } else if (leaveType === "Sick Leave") {
        setReason(
          "Unwell with seasonal fever and advised medical rest by the physician. I will be reachable on email for critical escalations."
        )
      } else {
        setReason(
          "Planned annual leave for personal travels. All ongoing sprint deliverables are completed or delegated to Aditi Sharma."
        )
      }
      setIsAiDrafting(false)
    }, 600)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      setSubmitted(true)
    }, 1000)
  }

  return (
    <div className="space-y-6 font-sans w-full">
      {/* Back breadcrumb & Page Header */}
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
            Submit leave requests with real-time balance calculations & automatic approval routing
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="active" className="text-xs py-1 px-3 font-semibold font-mono">
            Policy Year 2026-27
          </Badge>
        </div>
      </div>

      {/* Top Quota Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Object.values(QUOTAS).map((q) => {
          const isSelected = leaveType === q.type
          return (
            <button
              key={q.type}
              type="button"
              onClick={() => setLeaveType(q.type)}
              className={`p-4 rounded-xl border text-left transition-all ${
                isSelected
                  ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-600/20 shadow-xs"
                  : "border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {q.type}
                </span>
                {isSelected && (
                  <Badge variant="default" className="text-[10px] py-0 px-1.5 bg-indigo-600 text-white font-mono">
                    Selected
                  </Badge>
                )}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tabular-nums">
                  {q.available}
                </span>
                <span className="text-xs text-zinc-400 font-medium">
                  of {q.total} remaining
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Main Two Column Form & Breakdown */}
      {submitted ? (
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
              Leave Request Submitted!
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              Your request for <strong>{requestedDays} {requestedDays === 1 ? "day" : "days"} ({leaveType})</strong> has been routed to <strong>Priya Sharma (HRBP)</strong> and your reporting manager.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4 text-xs space-y-2.5 text-left">
            <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
              <span>Request ID:</span>
              <strong className="font-mono text-zinc-900 dark:text-zinc-100">#LR-2026-992</strong>
            </div>
            <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
              <span>Duration:</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">{startDate} to {endDate} ({requestedDays}d)</span>
            </div>
            <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
              <span>Updated Balance:</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{balanceAfter} of {currentQuota.total} days</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSubmitted(false)
                setReason("")
              }}
              className="text-xs h-9"
            >
              Apply Another Leave
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
          {/* Left Column: Form Details (8/12) */}
          <div className="lg:col-span-8 space-y-5 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-6 shadow-xs">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              Request Details
            </h2>

            {/* Leave Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Leave Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2.5 px-3 text-xs text-zinc-900 dark:text-zinc-100 font-medium"
              >
                <option value="Casual Leave">Casual Leave (8 days available)</option>
                <option value="Sick Leave">Sick Leave (5 days available)</option>
                <option value="Earned Leave">Earned Leave (14 days available)</option>
                <option value="Comp-Off">Comp-Off (2 days available)</option>
              </select>
            </div>

            {/* Date Range Selection */}
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
                  onChange={(e) => setStartDate(e.target.value)}
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
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Half-Day Option Toggle */}
            <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 p-3.5 flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isHalfDay}
                  onChange={(e) => setIsHalfDay(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <div className="text-xs">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">Half-Day Leave</span>
                  <p className="text-[11px] text-zinc-500">Apply for 0.5 days only</p>
                </div>
              </label>

              {isHalfDay && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHalfDaySlot("first")}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                      halfDaySlot === "first" ? "bg-indigo-600 text-white" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    First Half (Morning)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHalfDaySlot("second")}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                      halfDaySlot === "second" ? "bg-indigo-600 text-white" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    Second Half (Afternoon)
                  </button>
                </div>
              )}
            </div>

            {/* Stand-in Colleague Delegation */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-zinc-400" />
                Handover / Stand-in Colleague
              </label>
              <select
                value={standinColleague}
                onChange={(e) => setStandinColleague(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2.5 px-3 text-xs text-zinc-900 dark:text-zinc-100 font-medium"
              >
                <option value="Aditi Sharma (Product Design)">Aditi Sharma (Product Design)</option>
                <option value="Rohan Patel (Engineering)">Rohan Patel (Engineering)</option>
                <option value="Sneha Reddy (UX Research)">Sneha Reddy (UX Research)</option>
                <option value="Kavita Krishnan (Backend Platform)">Kavita Krishnan (Backend Platform)</option>
              </select>
            </div>

            {/* Reason & AI Draft Helper */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Reason for Time Off <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAiDraft}
                  disabled={isAiDrafting}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>{isAiDrafting ? "Drafting..." : "Auto-draft with AI"}</span>
                </button>
              </div>
              <Textarea
                required
                rows={3}
                placeholder="Provide a brief context for HR and reporting manager..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Supporting Document / Medical Cert Dropzone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-zinc-400" />
                Supporting Document (Optional)
              </label>
              {uploadedFile ? (
                <div className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-3 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">{uploadedFile}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadedFile(null)}
                    className="text-zinc-400 hover:text-rose-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 p-4 text-center cursor-pointer hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50 transition-colors">
                  <UploadCloud className="h-6 w-6 text-zinc-400 mb-1" />
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Click to upload medical certificate or ticket
                  </span>
                  <span className="text-[10px] text-zinc-400">PDF, PNG, JPG up to 5MB</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadedFile(e.target.files[0].name)
                      }
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Right Column: Live Breakdown & Balance Impact (4/12) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Impact Card */}
            <div className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Request Summary
                </h3>
                <Badge variant="active" className="text-[10px] py-0 px-2 font-mono">
                  Live Preview
                </Badge>
              </div>

              {/* Total Calculation */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                  <span className="text-zinc-500">Requested Category:</span>
                  <strong className="text-zinc-900 dark:text-zinc-100">{leaveType}</strong>
                </div>

                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                  <span className="text-zinc-500">Total Duration:</span>
                  <strong className="font-mono text-zinc-900 dark:text-zinc-100">
                    {requestedDays} {requestedDays === 1 ? "day" : "days"}
                  </strong>
                </div>

                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                  <span className="text-zinc-500">Current Balance:</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300 font-semibold">
                    {currentQuota.available} days
                  </span>
                </div>

                <div className="flex justify-between py-1.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-lg px-2.5">
                  <span className="font-bold text-indigo-900 dark:text-indigo-200">Balance After Approval:</span>
                  <span className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400">
                    {balanceAfter} days
                  </span>
                </div>
              </div>

              {/* Approval Route */}
              <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 p-3 text-xs space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Approval Route
                </span>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    Priya Sharma (HRBP)
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Auto-synced with calendar and team Slack channel upon approval.
                </p>
              </div>

              {/* Policy Check */}
              <div className="flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>Complies with company 3-day notice policy</span>
              </div>

              {/* Submit CTA */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs gap-2"
              >
                {isSubmitting ? (
                  <span>Dispatching Request...</span>
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
